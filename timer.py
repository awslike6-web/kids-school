#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🧚 코코 요정 스크린타임 타이머
- 로컬 1초 카운트다운 + 1분마다 Notion 양방향 동기화(깎임 역저장 / 보상 흡수)
- 30/15/5/1분 단계별 알림 + 0분 잠금 화면
- MacroDroid용 /check_time 조회 API (초소형 HTTP)
"""

from __future__ import annotations

import argparse
import json
import os
import socket
import subprocess
import sys
import threading
import time
import tkinter as tk
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from tkinter import font as tkfont
from typing import Any, Dict, Optional, Set
from urllib.parse import parse_qs, unquote, urlparse

try:
    import requests
except ImportError:
    print("❌ 'requests' 패키지가 필요합니다.  pip install requests")
    sys.exit(1)

try:
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:
    pass

# ── 설정 ────────────────────────────────────────────────────────────────────
PROXY_URL = os.getenv("NOTION_PROXY_URL", "https://minmin-notion.awslike6.workers.dev")
INVENTORY_DB_ID = os.getenv(
    "NOTION_INVENTORY_DB_ID", "374a27115b688042bb61e6a102242e12"
)
NOTION_API_KEY = os.getenv("NOTION_API_KEY", "")
TIME_PROPERTY = os.getenv("NOTION_TIME_PROPERTY", "유튜브/게임 시간(분)")
TIME_PROPERTY_FALLBACKS = [
    TIME_PROPERTY,
    "유튜브/게임 시간(분)",
    "게임 시간(분)",
    "유튜브 시간(분)",
]
CHILDREN = ("민수", "민서")
NOTION_POLL_SEC = 60
TICK_SEC = 1
NOTION_MINUTE_EPS = 0.05
TIMER_API_HOST = os.getenv("TIMER_API_HOST", "0.0.0.0")
TIMER_API_PORT = int(os.getenv("TIMER_API_PORT", "5001"))
ALERT_THRESHOLDS_MIN = (30, 15, 5, 1)
TOAST_DURATION_MS = 9000

ALERT_MESSAGES: Dict[int, str] = {
    30: "코코 요정: {name}야, 유튜브 에너지가 30분 남았어!\n오늘도 즐겁게, 적당히 쉬어 가면서 놀자! ✨",
    15: "코코 요정: {name}야, 유튜브 에너지가 15분 남았어!\n게임 중이라면 이번 판이 막판이야! 🎮",
    5: "코코 요정: {name}야, 에너지가 5분만 남았어!\n지금 하던 걸 마무리할 시간이야! 🌟",
    1: "코코 요정: {name}야, 1분 후에 에너지가 방전돼!\n마지막 한 번만 더! ⏰",
}

LOCK_MESSAGE = (
    "코코 요정: 에너지가 다 고갈됐어!\n"
    "공부방·보카방에서 에너지를 다시 충전해 줘! 🧚‍♂️"
)


# ── Notion ────────────────────────────────────────────────────────────────────
def _notion_headers() -> Dict[str, str]:
    headers = {
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
    }
    if NOTION_API_KEY:
        headers["Authorization"] = f"Bearer {NOTION_API_KEY}"
    return headers


def _query_inventory(child_name: str) -> dict:
    payload = {"filter": {"property": "이름", "title": {"equals": child_name}}}
    if NOTION_API_KEY:
        url = f"https://api.notion.com/v1/databases/{INVENTORY_DB_ID}/query"
    else:
        url = f"{PROXY_URL}/v1/databases/{INVENTORY_DB_ID}/query"

    response = requests.post(url, headers=_notion_headers(), json=payload, timeout=20)
    response.raise_for_status()
    return response.json()


def _find_time_property(properties: dict) -> tuple[Optional[str], Optional[float]]:
    for key in TIME_PROPERTY_FALLBACKS:
        prop = properties.get(key)
        if not prop:
            continue
        if prop.get("type") == "number" and prop.get("number") is not None:
            return key, float(prop["number"])
        if "number" in prop and prop["number"] is not None:
            return key, float(prop["number"])
    return None, None


def _extract_minutes(properties: dict) -> Optional[float]:
    _, minutes = _find_time_property(properties)
    if minutes is None:
        return None
    return max(0.0, minutes)


def fetch_inventory_record(child_name: str) -> Optional[dict]:
    """Notion 인벤토리 1행 조회 — page_id, 분, 속성명 포함."""
    try:
        data = _query_inventory(child_name)
        results = data.get("results") or []
        if not results:
            print(f"[Notion] '{child_name}' 인벤토리 행을 찾지 못했습니다.")
            return None

        page = results[0]
        props = page.get("properties") or {}
        prop_name, minutes = _find_time_property(props)
        if prop_name is None or minutes is None:
            print(
                f"[Notion] '{child_name}' — 시간 속성을 찾지 못했습니다. "
                f"DB에 '{TIME_PROPERTY}' 컬럼이 있는지 확인하세요."
            )
            return None

        return {
            "page_id": page.get("id"),
            "minutes": max(0.0, minutes),
            "property_name": prop_name,
        }
    except requests.RequestException as exc:
        print(f"[Notion] '{child_name}' 조회 실패: {exc}")
        return None


def update_remaining_minutes(page_id: str, property_name: str, minutes: float) -> bool:
    """로컬 카운트다운 잔여 시간(분)을 Notion DB에 역반영."""
    if not page_id or not property_name:
        return False

    safe_minutes = round(max(0.0, minutes), 2)
    payload = {"properties": {property_name: {"number": safe_minutes}}}

    if NOTION_API_KEY:
        url = f"https://api.notion.com/v1/pages/{page_id}"
    else:
        url = f"{PROXY_URL}/v1/pages/{page_id}"

    try:
        response = requests.patch(
            url, headers=_notion_headers(), json=payload, timeout=20
        )
        response.raise_for_status()
        print(f"[Notion Write] page={page_id[:8]}… {property_name}={safe_minutes}분")
        return True
    except requests.RequestException as exc:
        print(f"[Notion Write] '{property_name}' 업데이트 실패: {exc}")
        return False


def fetch_remaining_minutes(child_name: str) -> Optional[float]:
    """Notion 인벤토리에서 잔여 유튜브/게임 시간(분) 조회."""
    record = fetch_inventory_record(child_name)
    if not record:
        return None
    return record["minutes"]


def fetch_all_children_minutes() -> Dict[str, Optional[float]]:
    return {name: fetch_remaining_minutes(name) for name in CHILDREN}


def get_local_ip() -> str:
    """현재 PC LAN 내부 IP (MacroDroid·가족 기기 접속용)."""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
            sock.connect(("8.8.8.8", 80))
            return sock.getsockname()[0]
    except OSError:
        pass
    try:
        for info in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
            ip = info[4][0]
            if not ip.startswith("127."):
                return ip
    except OSError:
        pass
    return "127.0.0.1"


# ── MacroDroid 조회 API ───────────────────────────────────────────────────────
class TimerCheckApiHandler(BaseHTTPRequestHandler):
    """GET /check_time?child=민수 — 실시간 잔여 시간(분) JSON/텍스트 응답."""

    timer_instance: Optional["CocoScreenTimer"] = None

    def log_message(self, fmt: str, *args) -> None:
        print(f"[API] {self.address_string()} — {fmt % args}")

    def _send_json(self, status: int, payload: dict) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def _send_text(self, status: int, text: str) -> None:
        body = text.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path not in ("/check_time", "/"):
            self._send_json(404, {"ok": False, "error": "not found"})
            return

        timer = self.timer_instance
        if timer is None:
            self._send_json(503, {"ok": False, "error": "timer not ready"})
            return

        query = parse_qs(parsed.query, keep_blank_values=True)
        child = unquote((query.get("child") or [""])[0]).strip()
        fmt = (query.get("format") or [""])[0].strip().lower()
        accept = self.headers.get("Accept", "")
        want_text = fmt == "text" or (
            fmt != "json" and "application/json" not in accept and "text/plain" in accept
        )

        if parsed.path == "/" and not child:
            self._send_json(
                200,
                {
                    "ok": True,
                    "service": "coco-timer",
                    "endpoints": {
                        "check_time": "/check_time?child=민수",
                        "check_time_text": "/check_time?child=민수&format=text",
                    },
                    "children": list(CHILDREN),
                },
            )
            return

        if child:
            payload = timer.build_check_time_payload(child)
            if want_text:
                if payload.get("ok"):
                    self._send_text(200, f"{payload['minutes']:.2f}")
                else:
                    self._send_text(400, payload.get("error", "error"))
                return
            status = 200 if payload.get("ok") else 400
            self._send_json(status, payload)
            return

        all_payload = timer.build_all_check_time_payload()
        if want_text:
            lines = [
                f"{name}:{data['minutes']:.2f}"
                for name, data in all_payload["children"].items()
            ]
            self._send_text(200, "\n".join(lines))
            return
        self._send_json(200, all_payload)


def start_check_time_api(
    timer: "CocoScreenTimer", host: str, port: int
) -> ThreadingHTTPServer:
    TimerCheckApiHandler.timer_instance = timer
    server = ThreadingHTTPServer((host, port), TimerCheckApiHandler)
    server.daemon_threads = True
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server


# ── 브라우저 종료 뼈대 ───────────────────────────────────────────────────────
def close_browsers() -> None:
    """
    브라우저 프로세스 종료 뼈대.
    실제 배포 전 부모님과 종료 대상·화이트리스트를 꼭 확인하세요.
    """
    if sys.platform != "win32":
        print("[close_browsers] Windows 전용 뼈대입니다. OS별 종료 로직을 추가하세요.")
        return

    browser_names = ["chrome.exe", "msedge.exe", "firefox.exe", "opera.exe", "brave.exe"]
    creationflags = getattr(subprocess, "CREATE_NO_WINDOW", 0)

    for exe in browser_names:
        try:
            result = subprocess.run(
                ["taskkill", "/IM", exe, "/F"],
                capture_output=True,
                text=True,
                check=False,
                creationflags=creationflags,
            )
            if result.returncode == 0:
                print(f"[close_browsers] {exe} 종료 완료")
        except OSError as exc:
            print(f"[close_browsers] {exe} 종료 시도 실패: {exc}")


# ── UI ────────────────────────────────────────────────────────────────────────
class ToastNotification(tk.Toplevel):
    """화면 오른쪽 아래 코코 요정 예보 알림."""

    def __init__(self, master: tk.Misc, title: str, message: str, accent: str = "#ab47bc"):
        super().__init__(master)
        self.overrideredirect(True)
        self.attributes("-topmost", True)
        try:
            self.attributes("-alpha", 0.96)
        except tk.TclError:
            pass

        self.configure(bg="#1a1225", highlightthickness=2, highlightbackground=accent)

        wrap = tk.Frame(self, bg="#1a1225", padx=18, pady=14)
        wrap.pack(fill="both", expand=True)

        title_font = tkfont.Font(family="Malgun Gothic", size=11, weight="bold")
        body_font = tkfont.Font(family="Malgun Gothic", size=10)

        tk.Label(
            wrap,
            text=f"🧚 {title}",
            fg="#ffd54f",
            bg="#1a1225",
            font=title_font,
            anchor="w",
            justify="left",
        ).pack(fill="x")

        tk.Label(
            wrap,
            text=message,
            fg="#f3e5f5",
            bg="#1a1225",
            font=body_font,
            anchor="w",
            justify="left",
            wraplength=320,
        ).pack(fill="x", pady=(8, 0))

        self.update_idletasks()
        self._place_bottom_right()
        self.after(TOAST_DURATION_MS, self._fade_out)

    def _place_bottom_right(self) -> None:
        self.update_idletasks()
        sw = self.winfo_screenwidth()
        sh = self.winfo_screenheight()
        w = self.winfo_width()
        h = self.winfo_height()
        x = sw - w - 24
        y = sh - h - 56
        self.geometry(f"+{x}+{y}")

    def _fade_out(self) -> None:
        try:
            self.destroy()
        except tk.TclError:
            pass


class LockOverlay(tk.Toplevel):
    """시간 0분 — 전체 화면 반투명 잠금."""

    def __init__(self, master: tk.Misc, child_name: str, on_close_browsers):
        super().__init__(master)
        self.on_close_browsers = on_close_browsers
        self.attributes("-topmost", True)
        self.overrideredirect(True)
        try:
            self.attributes("-alpha", 0.88)
        except tk.TclError:
            pass

        sw = self.winfo_screenwidth()
        sh = self.winfo_screenheight()
        self.geometry(f"{sw}x{sh}+0+0")
        self.configure(bg="#120818")

        center = tk.Frame(self, bg="#120818")
        center.place(relx=0.5, rely=0.5, anchor="center")

        title_font = tkfont.Font(family="Malgun Gothic", size=22, weight="bold")
        body_font = tkfont.Font(family="Malgun Gothic", size=15)

        tk.Label(center, text="🧚‍♂️ 코코 요정 타임 가드", fg="#ce93d8", bg="#120818", font=title_font).pack(
            pady=(0, 16)
        )
        tk.Label(
            center,
            text=LOCK_MESSAGE,
            fg="#ffffff",
            bg="#120818",
            font=body_font,
            justify="center",
        ).pack(pady=(0, 10))
        tk.Label(
            center,
            text=f"({child_name}의 유튜브/게임 에너지 방전)",
            fg="#b39ddb",
            bg="#120818",
            font=tkfont.Font(family="Malgun Gothic", size=11),
        ).pack(pady=(0, 24))

        tk.Button(
            center,
            text="에너지 충전하러 공부방 가기 ✨",
            font=tkfont.Font(family="Malgun Gothic", size=12, weight="bold"),
            bg="#ab47bc",
            fg="white",
            activebackground="#8e24aa",
            activeforeground="white",
            relief="flat",
            padx=18,
            pady=10,
            command=self._on_acknowledge,
        ).pack()

        self.bind("<Escape>", lambda _e: self._on_acknowledge())

    def _on_acknowledge(self) -> None:
        self.on_close_browsers()
        try:
            self.destroy()
        except tk.TclError:
            pass


class CocoScreenTimer:
    """Notion 동기화 + 로컬 카운트다운 + 단계별 알림."""

    ACCENT_BY_THRESHOLD = {30: "#42a5f5", 15: "#ab47bc", 5: "#ffb74d", 1: "#ef5350"}

    def __init__(self, active_child: str, api_port: int = TIMER_API_PORT, api_host: str = TIMER_API_HOST):
        if active_child not in CHILDREN:
            raise ValueError(f"active_child는 {CHILDREN} 중 하나여야 합니다.")

        self.active_child = active_child
        self.api_port = api_port
        self.api_host = api_host
        self.remaining_seconds = 0
        self.alerted: Set[int] = set()
        self.locked = False
        self.lock_window: Optional[LockOverlay] = None
        self._poll_thread_stop = threading.Event()
        self._last_notion_snapshot: Dict[str, Optional[float]] = {}
        self._last_notion_minutes: Optional[float] = None
        self._inventory_page_id: Optional[str] = None
        self._time_property_name: Optional[str] = None
        self._api_server: Optional[ThreadingHTTPServer] = None
        self._state_lock = threading.Lock()

        self.root = tk.Tk()
        self.root.withdraw()
        self.root.title("Coco Screen Timer")

        # 디버그용 미니 상태창 (숨기려면 withdraw 유지)
        self.status_var = tk.StringVar(value="초기화 중...")
        status = tk.Toplevel(self.root)
        status.title("코코 타이머 (부모용)")
        status.geometry("320x80+20+20")
        status.attributes("-topmost", False)
        tk.Label(
            status,
            textvariable=self.status_var,
            font=tkfont.Font(family="Malgun Gothic", size=10),
            justify="left",
            wraplength=300,
        ).pack(padx=12, pady=12, fill="both", expand=True)
        self.status_window = status

    def _speak(self, text: str) -> None:
        """Windows SAPI TTS (선택). 실패해도 무시."""
        if sys.platform != "win32":
            return
        try:
            ps = (
                "Add-Type -AssemblyName System.Speech; "
                f"$s = New-Object System.Speech.Synthesis.SpeechSynthesizer; "
                f"$s.Speak('{text.replace(chr(39), '')}')"
            )
            subprocess.Popen(
                ["powershell", "-NoProfile", "-Command", ps],
                creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
            )
        except OSError:
            pass

    def _check_time_payload_unlocked(self, child_name: str) -> Dict[str, Any]:
        """락 보유 상태에서 호출 — MacroDroid /check_time 응답 본문."""
        if child_name not in CHILDREN:
            return {
                "ok": False,
                "error": f"child는 {list(CHILDREN)} 중 하나여야 합니다.",
            }

        if child_name == self.active_child:
            seconds = max(0, self.remaining_seconds)
            minutes = round(seconds / 60.0, 2)
            return {
                "ok": True,
                "child": child_name,
                "minutes": minutes,
                "seconds": seconds,
                "locked": self.locked or seconds <= 0,
                "source": "live",
                "active_pc_child": self.active_child,
            }

        notion_minutes = self._last_notion_snapshot.get(child_name)
        if notion_minutes is None:
            return {
                "ok": False,
                "child": child_name,
                "error": "아직 Notion 스냅샷이 없습니다. 1분 후 다시 시도하세요.",
            }

        minutes = round(max(0.0, notion_minutes), 2)
        return {
            "ok": True,
            "child": child_name,
            "minutes": minutes,
            "seconds": int(minutes * 60),
            "locked": minutes <= 0,
            "source": "notion_snapshot",
            "active_pc_child": self.active_child,
        }

    def build_check_time_payload(self, child_name: str) -> Dict[str, Any]:
        with self._state_lock:
            return self._check_time_payload_unlocked(child_name)

    def build_all_check_time_payload(self) -> Dict[str, Any]:
        with self._state_lock:
            return {
                "ok": True,
                "active_pc_child": self.active_child,
                "children": {
                    name: self._check_time_payload_unlocked(name) for name in CHILDREN
                },
            }

    def _update_status(self, extra: str = "") -> None:
        mins, secs = divmod(max(0, self.remaining_seconds), 60)
        others = " | ".join(
            f"{n}:{(m if m is not None else '?')}분"
            for n, m in self._last_notion_snapshot.items()
        )
        self.status_var.set(
            f"[{self.active_child}] 잔여 {mins:02d}:{secs:02d}\n"
            f"Notion: {others}\n{extra}"
        )

    def _apply_recharged_minutes(self, minutes: float) -> None:
        """공부방 보상 등으로 Notion 시간이 늘었을 때 로컬 타이머에 흡수."""
        with self._state_lock:
            prev_bucket = self.remaining_seconds // 60
            self.remaining_seconds = max(0, int(round(minutes * 60)))
            new_bucket = self.remaining_seconds // 60
        if new_bucket > (max(ALERT_THRESHOLDS_MIN) if ALERT_THRESHOLDS_MIN else 0):
            self.alerted.clear()
            self.locked = False
            if self.lock_window:
                try:
                    self.lock_window.destroy()
                except tk.TclError:
                    pass
                self.lock_window = None
        elif new_bucket > prev_bucket:
            self.alerted = {t for t in self.alerted if t <= new_bucket}

    def _sync_from_notion(self) -> None:
        """
        1분마다 Notion 조회 + 양방향 동기화.
        - Notion == 직전 Notion: 로컬 카운트다운을 Notion에 역저장
        - Notion >  직전 Notion: 보상 충전 → 로컬 타이머에 흡수
        - Notion <  직전 Notion: 부모 수동 차감 → Notion 값 따름
        """
        snapshot = fetch_all_children_minutes()
        with self._state_lock:
            self._last_notion_snapshot = snapshot

        record = fetch_inventory_record(self.active_child)
        if not record:
            return

        notion_minutes = record["minutes"]
        self._inventory_page_id = record["page_id"]
        self._time_property_name = record["property_name"]
        with self._state_lock:
            local_minutes = self.remaining_seconds / 60.0

        if self._last_notion_minutes is None:
            self._apply_recharged_minutes(notion_minutes)
            self._last_notion_minutes = notion_minutes
            print(
                f"[Sync] {self.active_child} 초기화 ← {notion_minutes:.2f}분 "
                f"({time.strftime('%H:%M:%S')})"
            )
        elif notion_minutes > self._last_notion_minutes + NOTION_MINUTE_EPS:
            prev_notion = self._last_notion_minutes
            self._apply_recharged_minutes(notion_minutes)
            self._last_notion_minutes = notion_minutes
            print(
                f"[Sync] {self.active_child} 보상 충전 흡수 ← {notion_minutes:.2f}분 "
                f"(+{notion_minutes - prev_notion:.2f}) "
                f"({time.strftime('%H:%M:%S')})"
            )
        elif abs(notion_minutes - self._last_notion_minutes) <= NOTION_MINUTE_EPS:
            write_minutes = round(max(0.0, local_minutes), 2)
            if update_remaining_minutes(
                self._inventory_page_id,
                self._time_property_name,
                write_minutes,
            ):
                self._last_notion_minutes = write_minutes
                print(
                    f"[Sync] {self.active_child} → Notion {write_minutes:.2f}분 "
                    f"(로컬 카운트다운 반영, {time.strftime('%H:%M:%S')})"
                )
        else:
            self._apply_recharged_minutes(notion_minutes)
            self._last_notion_minutes = notion_minutes
            print(
                f"[Sync] {self.active_child} Notion 수동 변경 반영 ← {notion_minutes:.2f}분 "
                f"({time.strftime('%H:%M:%S')})"
            )

        print(
            f"[Notion snapshot] {json.dumps(self._last_notion_snapshot, ensure_ascii=False)}"
        )

    def _notion_poll_loop(self) -> None:
        while not self._poll_thread_stop.is_set():
            self.root.after(0, self._sync_from_notion)
            self.root.after(0, self._update_status, "Notion 동기화 완료")
            if self._poll_thread_stop.wait(NOTION_POLL_SEC):
                break

    def _show_toast(self, threshold_min: int) -> None:
        message = ALERT_MESSAGES[threshold_min].format(name=self.active_child)
        title = f"에너지 {threshold_min}분 남음!"
        accent = self.ACCENT_BY_THRESHOLD.get(threshold_min, "#ab47bc")
        ToastNotification(self.root, title, message, accent=accent)
        self._speak(message.replace("\n", " "))

    def _check_alerts(self) -> None:
        if self.locked or self.remaining_seconds <= 0:
            return
        mins_left = self.remaining_seconds // 60
        for threshold in ALERT_THRESHOLDS_MIN:
            if mins_left == threshold and threshold not in self.alerted:
                self.alerted.add(threshold)
                self._show_toast(threshold)

    def _trigger_lock(self) -> None:
        with self._state_lock:
            if self.locked:
                return
            self.locked = True
            self.remaining_seconds = 0
        print(f"[Lock] {self.active_child} — 에너지 방전")

        if self._inventory_page_id and self._time_property_name:
            if update_remaining_minutes(
                self._inventory_page_id, self._time_property_name, 0.0
            ):
                self._last_notion_minutes = 0.0

        def _close_browsers_wrapper():
            close_browsers()

        self.lock_window = LockOverlay(self.root, self.active_child, _close_browsers_wrapper)
        self._speak(LOCK_MESSAGE.replace("\n", " "))

    def _tick(self) -> None:
        with self._state_lock:
            if self.remaining_seconds > 0:
                self.remaining_seconds -= 1
                has_time = True
                is_locked = self.locked
            else:
                has_time = False
                is_locked = self.locked

        if has_time:
            self._check_alerts()
            self._update_status()
        elif not is_locked:
            self._trigger_lock()

        if not self._poll_thread_stop.is_set():
            self.root.after(TICK_SEC * 1000, self._tick)

    def run(self) -> None:
        print(f"🧚 코코 타이머 시작 — 활성 아이: {self.active_child}")
        print(f"   DB: {INVENTORY_DB_ID}")
        print(f"   시간 속성: {TIME_PROPERTY}")
        print(f"   Notion 경로: {'Direct API' if NOTION_API_KEY else PROXY_URL}")

        if self.api_port > 0:
            try:
                self._api_server = start_check_time_api(
                    self, self.api_host, self.api_port
                )
                lan_ip = get_local_ip()
                print()
                print("   📡 MacroDroid 조회 API (같은 Wi-Fi)")
                print(
                    f"      http://{lan_ip}:{self.api_port}/check_time?child={self.active_child}"
                )
                print(
                    f"      텍스트만: http://{lan_ip}:{self.api_port}/check_time?child=민수&format=text"
                )
                print()
            except OSError as exc:
                print(f"   ⚠️  API 서버 기동 실패: {exc}")

        self._sync_from_notion()
        self._update_status("시작")

        poll_thread = threading.Thread(target=self._notion_poll_loop, daemon=True)
        poll_thread.start()

        self.root.after(TICK_SEC * 1000, self._tick)

        try:
            self.root.mainloop()
        finally:
            self._poll_thread_stop.set()
            if self._api_server:
                self._api_server.shutdown()


def resolve_active_child(cli_child: Optional[str]) -> str:
    if cli_child:
        return cli_child
    env_child = os.getenv("ACTIVE_CHILD", "").strip()
    if env_child in CHILDREN:
        return env_child
    # Windows 로그인 이름 힌트 (선택)
    username = os.getenv("USERNAME", "").lower()
    if "minseo" in username or "민서" in username:
        return "민서"
    if "minsu" in username or "민수" in username:
        return "민수"
    return "민수"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="🧚 코코 요정 Notion 스크린타임 타이머")
    parser.add_argument(
        "--child",
        choices=CHILDREN,
        help="이 PC에서 감시할 아이 (민수 / 민서). 미지정 시 ACTIVE_CHILD 환경변수 사용",
    )
    parser.add_argument(
        "--list-notion",
        action="store_true",
        help="민수·민서 Notion 잔여 시간만 조회하고 종료",
    )
    parser.add_argument(
        "--api-port",
        type=int,
        default=TIMER_API_PORT,
        help=f"MacroDroid 조회 API 포트 (기본 {TIMER_API_PORT}, print_server 5000과 분리)",
    )
    parser.add_argument(
        "--no-api",
        action="store_true",
        help="조회 API 서버를 띄우지 않음",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    if args.list_notion:
        data = fetch_all_children_minutes()
        for name, minutes in data.items():
            label = f"{minutes:.1f}분" if minutes is not None else "조회 실패"
            print(f"  {name}: {label}")
        return

    active = resolve_active_child(args.child)
    api_port = 0 if args.no_api else args.api_port
    app = CocoScreenTimer(active, api_port=api_port)
    app.run()


if __name__ == "__main__":
    main()
