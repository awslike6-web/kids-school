#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🧚 코코 요정 스크린타임 타이머
- Notion 인벤토리 DB에서 유튜브/게임 잔여 시간(분)을 1분마다 동기화
- 로컬 1초 카운트다운 + 30/15/5/1분 단계별 알림
- 0분 도달 시 잠금 화면 + 브라우저 종료 뼈대
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import threading
import time
import tkinter as tk
from tkinter import font as tkfont
from typing import Dict, Optional, Set

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


def _extract_minutes(properties: dict) -> Optional[float]:
    for key in TIME_PROPERTY_FALLBACKS:
        prop = properties.get(key)
        if not prop:
            continue
        if prop.get("type") == "number" and prop.get("number") is not None:
            return float(prop["number"])
        if "number" in prop and prop["number"] is not None:
            return float(prop["number"])
    return None


def fetch_remaining_minutes(child_name: str) -> Optional[float]:
    """Notion 인벤토리에서 잔여 유튜브/게임 시간(분) 조회."""
    try:
        data = _query_inventory(child_name)
        results = data.get("results") or []
        if not results:
            print(f"[Notion] '{child_name}' 인벤토리 행을 찾지 못했습니다.")
            return None
        props = results[0].get("properties") or {}
        minutes = _extract_minutes(props)
        if minutes is None:
            print(
                f"[Notion] '{child_name}' — 시간 속성을 찾지 못했습니다. "
                f"DB에 '{TIME_PROPERTY}' 컬럼이 있는지 확인하세요."
            )
            return None
        return max(0.0, minutes)
    except requests.RequestException as exc:
        print(f"[Notion] '{child_name}' 조회 실패: {exc}")
        return None


def fetch_all_children_minutes() -> Dict[str, Optional[float]]:
    return {name: fetch_remaining_minutes(name) for name in CHILDREN}


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

    def __init__(self, active_child: str):
        if active_child not in CHILDREN:
            raise ValueError(f"active_child는 {CHILDREN} 중 하나여야 합니다.")

        self.active_child = active_child
        self.remaining_seconds = 0
        self.alerted: Set[int] = set()
        self.locked = False
        self.lock_window: Optional[LockOverlay] = None
        self._poll_thread_stop = threading.Event()
        self._last_notion_snapshot: Dict[str, Optional[float]] = {}

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

    def _sync_from_notion(self) -> None:
        all_data = fetch_all_children_minutes()
        self._last_notion_snapshot = all_data
        minutes = all_data.get(self.active_child)
        if minutes is not None:
            prev_bucket = self.remaining_seconds // 60
            self.remaining_seconds = int(round(minutes * 60))
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
            print(
                f"[Sync] {self.active_child} ← {minutes:.1f}분 "
                f"({time.strftime('%H:%M:%S')})"
            )

        print(f"[Notion snapshot] {json.dumps(all_data, ensure_ascii=False)}")

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
        if self.locked:
            return
        self.locked = True
        self.remaining_seconds = 0
        print(f"[Lock] {self.active_child} — 에너지 방전")

        def _close_browsers_wrapper():
            close_browsers()

        self.lock_window = LockOverlay(self.root, self.active_child, _close_browsers_wrapper)
        self._speak(LOCK_MESSAGE.replace("\n", " "))

    def _tick(self) -> None:
        if self.remaining_seconds > 0:
            self.remaining_seconds -= 1
            self._check_alerts()
            self._update_status()
        elif not self.locked:
            self._trigger_lock()

        if not self._poll_thread_stop.is_set():
            self.root.after(TICK_SEC * 1000, self._tick)

    def run(self) -> None:
        print(f"🧚 코코 타이머 시작 — 활성 아이: {self.active_child}")
        print(f"   DB: {INVENTORY_DB_ID}")
        print(f"   시간 속성: {TIME_PROPERTY}")
        print(f"   Notion 경로: {'Direct API' if NOTION_API_KEY else PROXY_URL}")

        self._sync_from_notion()
        self._update_status("시작")

        poll_thread = threading.Thread(target=self._notion_poll_loop, daemon=True)
        poll_thread.start()

        self.root.after(TICK_SEC * 1000, self._tick)

        try:
            self.root.mainloop()
        finally:
            self._poll_thread_stop.set()


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
    app = CocoScreenTimer(active)
    app.run()


if __name__ == "__main__":
    main()
