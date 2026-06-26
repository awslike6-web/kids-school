#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🖨️ 가족 무선 인쇄 웹 스테이션
- 스마트폰 브라우저 → http://컴퓨터IP:5000
- JPG / PNG / PDF 업로드 → PC 기본 프린터로 즉시 인쇄
"""

from __future__ import annotations

import argparse
import os
import socket
import sys
import tempfile
import threading
import time
from datetime import datetime
from pathlib import Path
from typing import Optional, Tuple

try:
    from flask import Flask, jsonify, render_template_string, request
    from werkzeug.utils import secure_filename
except ImportError:
    print("❌ 'flask' 패키지가 필요합니다.  pip install flask")
    sys.exit(1)

PORT = 5000
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".pdf"}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB
TEMP_SUBDIR = "family_print_station"
PRINT_CLEANUP_SEC = 120

HTML_PAGE = """<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <title>가족 무선 인쇄</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100dvh;
      font-family: "Malgun Gothic", "Apple SD Gothic Neo", sans-serif;
      background: linear-gradient(160deg, #eef2ff 0%, #f8fafc 45%, #fff7ed 100%);
      color: #1e293b;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px 16px 32px;
    }
    .card {
      width: 100%;
      max-width: 420px;
      background: #ffffff;
      border-radius: 24px;
      box-shadow: 0 12px 40px rgba(15, 23, 42, 0.12);
      padding: 28px 22px 24px;
    }
    .badge {
      display: inline-block;
      font-size: 12px;
      font-weight: 700;
      color: #6366f1;
      background: #eef2ff;
      border-radius: 999px;
      padding: 6px 12px;
      margin-bottom: 12px;
    }
    h1 {
      margin: 0 0 8px;
      font-size: 1.55rem;
      line-height: 1.3;
      letter-spacing: -0.02em;
    }
    .subtitle {
      margin: 0 0 24px;
      font-size: 0.95rem;
      line-height: 1.55;
      color: #64748b;
    }
    .file-area {
      border: 2px dashed #cbd5e1;
      border-radius: 18px;
      padding: 22px 16px;
      text-align: center;
      background: #f8fafc;
      margin-bottom: 16px;
      transition: border-color 0.2s, background 0.2s;
    }
    .file-area.has-file {
      border-color: #818cf8;
      background: #eef2ff;
    }
    .file-name {
      margin-top: 10px;
      font-size: 0.9rem;
      color: #334155;
      word-break: break-all;
      min-height: 1.4em;
    }
    .btn {
      width: 100%;
      border: none;
      border-radius: 16px;
      padding: 16px 18px;
      font-size: 1.05rem;
      font-weight: 700;
      cursor: pointer;
      transition: transform 0.12s, opacity 0.12s;
      -webkit-tap-highlight-color: transparent;
    }
    .btn:active { transform: scale(0.98); }
    .btn:disabled {
      opacity: 0.45;
      cursor: not-allowed;
      transform: none;
    }
    .btn-select {
      background: #ffffff;
      color: #4338ca;
      border: 2px solid #c7d2fe;
      margin-bottom: 12px;
    }
    .btn-print {
      background: linear-gradient(135deg, #6366f1, #4f46e5);
      color: #ffffff;
      box-shadow: 0 8px 20px rgba(79, 70, 229, 0.28);
    }
    .hint {
      margin-top: 18px;
      font-size: 0.82rem;
      line-height: 1.5;
      color: #94a3b8;
      text-align: center;
    }
    .status {
      margin-top: 16px;
      padding: 14px 16px;
      border-radius: 14px;
      font-size: 0.92rem;
      line-height: 1.5;
      display: none;
    }
    .status.show { display: block; }
    .status.ok {
      background: #ecfdf5;
      color: #047857;
      border: 1px solid #a7f3d0;
    }
    .status.err {
      background: #fef2f2;
      color: #b91c1c;
      border: 1px solid #fecaca;
    }
    .status.busy {
      background: #eff6ff;
      color: #1d4ed8;
      border: 1px solid #bfdbfe;
    }
    input[type="file"] { display: none; }
  </style>
</head>
<body>
  <main class="card">
    <span class="badge">🏠 우리집 프린터</span>
    <h1>무선 인쇄 스테이션</h1>
    <p class="subtitle">사진(JPG·PNG)이나 PDF를 고른 뒤<br>인쇄하기를 눌러 주세요.</p>

    <div class="file-area" id="fileArea">
      <div>📎 파일을 선택해 주세요</div>
      <div class="file-name" id="fileName">선택된 파일 없음</div>
    </div>

    <input type="file" id="fileInput" accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf">

    <button type="button" class="btn btn-select" id="selectBtn">파일 선택</button>
    <button type="button" class="btn btn-print" id="printBtn" disabled>인쇄하기</button>

    <div class="status" id="statusBox" role="status" aria-live="polite"></div>

    <p class="hint">같은 Wi-Fi에 연결된 스마트폰·태블릿에서 사용할 수 있어요.</p>
  </main>

  <script>
    const fileInput = document.getElementById("fileInput");
    const selectBtn = document.getElementById("selectBtn");
    const printBtn = document.getElementById("printBtn");
    const fileName = document.getElementById("fileName");
    const fileArea = document.getElementById("fileArea");
    const statusBox = document.getElementById("statusBox");

    function showStatus(kind, message) {
      statusBox.className = "status show " + kind;
      statusBox.textContent = message;
    }

    selectBtn.addEventListener("click", () => fileInput.click());

    fileInput.addEventListener("change", () => {
      const file = fileInput.files[0];
      if (!file) {
        fileName.textContent = "선택된 파일 없음";
        fileArea.classList.remove("has-file");
        printBtn.disabled = true;
        return;
      }
      fileName.textContent = file.name;
      fileArea.classList.add("has-file");
      printBtn.disabled = false;
      statusBox.className = "status";
    });

    printBtn.addEventListener("click", async () => {
      const file = fileInput.files[0];
      if (!file) return;

      printBtn.disabled = true;
      selectBtn.disabled = true;
      showStatus("busy", "🖨️ 프린터로 보내는 중… 잠시만 기다려 주세요!");

      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch("/print", { method: "POST", body: formData });
        const data = await res.json();
        if (res.ok && data.ok) {
          showStatus("ok", "✅ " + (data.message || "인쇄가 시작됐어요!"));
          fileInput.value = "";
          fileName.textContent = "선택된 파일 없음";
          fileArea.classList.remove("has-file");
        } else {
          showStatus("err", "❌ " + (data.message || "인쇄에 실패했어요."));
          printBtn.disabled = true;
        }
      } catch (err) {
        showStatus("err", "❌ 서버와 연결할 수 없어요. Wi-Fi와 PC 상태를 확인해 주세요.");
        printBtn.disabled = false;
      } finally {
        selectBtn.disabled = false;
      }
    });
  </script>
</body>
</html>
"""


def get_local_ip() -> str:
    """현재 PC의 LAN 내부 IP 주소 추출."""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
            sock.connect(("8.8.8.8", 80))
            return sock.getsockname()[0]
    except OSError:
        pass

    try:
        hostname = socket.gethostname()
        for info in socket.getaddrinfo(hostname, None, socket.AF_INET):
            ip = info[4][0]
            if not ip.startswith("127."):
                return ip
    except OSError:
        pass

    return "127.0.0.1"


def get_default_printer_name() -> Optional[str]:
    if sys.platform != "win32":
        return None
    try:
        import win32print

        return win32print.GetDefaultPrinter()
    except Exception:
        return None


def _allowed_file(filename: str) -> bool:
    return Path(filename).suffix.lower() in ALLOWED_EXTENSIONS


def _schedule_cleanup(path: Path, delay_sec: int = PRINT_CLEANUP_SEC) -> None:
    def _remove() -> None:
        time.sleep(delay_sec)
        try:
            path.unlink(missing_ok=True)
        except OSError:
            pass

    threading.Thread(target=_remove, daemon=True).start()


def send_to_default_printer(file_path: Path) -> Tuple[bool, str]:
    """Windows 기본 프린터로 파일 전송."""
    if sys.platform != "win32":
        return False, "인쇄는 Windows PC에서만 지원됩니다."

    path_str = str(file_path.resolve())
    printer = get_default_printer_name() or "기본 프린터"

    try:
        os.startfile(path_str, "print")
        return True, f"'{printer}'로 인쇄를 시작했어요. 찌이익~ 🖨️"
    except OSError as first_error:
        pass

    try:
        import win32api

        win32api.ShellExecute(0, "print", path_str, None, ".", 0)
        return True, f"'{printer}'로 인쇄를 시작했어요. 찌이익~ 🖨️"
    except Exception as second_error:
        return False, f"인쇄 명령 실패: {second_error or first_error}"


def print_startup_banner(host_ip: str, port: int, temp_dir: Path) -> None:
    url = f"http://{host_ip}:{port}"
    printer = get_default_printer_name()

    print()
    print("=" * 56)
    print("  🖨️  가족 무선 인쇄 웹 스테이션")
    print("=" * 56)
    print("  가족들 스마트폰 브라우저에 아래 주소를 입력하고 접속하세요!")
    print()
    print(f"  👉  {url}")
    print()
    print("  (이 PC와 같은 Wi-Fi에 연결되어 있어야 합니다)")
    if printer:
        print(f"  기본 프린터: {printer}")
    print(f"  임시 저장 폴더: {temp_dir}")
    print("=" * 56)
    print()


def create_app(temp_dir: Path) -> Flask:
    app = Flask(__name__)
    app.config["MAX_CONTENT_LENGTH"] = MAX_FILE_SIZE

    @app.errorhandler(413)
    def too_large(_exc):
        return jsonify(ok=False, message="파일이 너무 커요. 50MB 이하만 가능합니다."), 413

    @app.get("/")
    def index():
        return render_template_string(HTML_PAGE)

    @app.post("/print")
    def print_file():
        uploaded = request.files.get("file")
        if not uploaded or not uploaded.filename:
            return jsonify(ok=False, message="파일을 선택해 주세요."), 400

        raw_name = secure_filename(uploaded.filename)
        if not raw_name or not _allowed_file(raw_name):
            return jsonify(
                ok=False,
                message="JPG, PNG, PDF 파일만 인쇄할 수 있어요.",
            ), 400

        stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        saved_name = f"{stamp}_{raw_name}"
        save_path = temp_dir / saved_name

        try:
            uploaded.save(save_path)
        except OSError as exc:
            return jsonify(ok=False, message=f"파일 저장 실패: {exc}"), 500

        ok, message = send_to_default_printer(save_path)
        if ok:
            _schedule_cleanup(save_path)
            print(f"[Print] {saved_name} → {message}")
            return jsonify(ok=True, message=message)

        try:
            save_path.unlink(missing_ok=True)
        except OSError:
            pass
        print(f"[Print] 실패 — {saved_name}: {message}")
        return jsonify(ok=False, message=message), 500

    return app


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="🖨️ 가족 무선 인쇄 웹 스테이션")
    parser.add_argument("--port", type=int, default=PORT, help=f"웹 서버 포트 (기본 {PORT})")
    parser.add_argument(
        "--host",
        default="0.0.0.0",
        help="바인딩 주소 (기본 0.0.0.0 — 같은 Wi-Fi 기기에서 접속 가능)",
    )
    return parser.parse_args()


def main() -> None:
    if sys.platform != "win32":
        print("⚠️  인쇄 기능은 Windows PC 전용입니다. 웹 UI만 테스트할 수 있습니다.")

    args = parse_args()
    temp_dir = Path(tempfile.gettempdir()) / TEMP_SUBDIR
    temp_dir.mkdir(parents=True, exist_ok=True)

    host_ip = get_local_ip()
    print_startup_banner(host_ip, args.port, temp_dir)

    app = create_app(temp_dir)
    app.run(host=args.host, port=args.port, debug=False, threaded=True)


if __name__ == "__main__":
    main()
