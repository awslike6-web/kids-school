"""화면 검증용 로컬 서버: 모든 HTML <head> 맨 앞에 '노션 쓰기 차단' 스크립트를 넣어 내보낸다.

2026-10-28 화면 검증 중 차단 스크립트를 늦게 걸어 민수 인벤토리 「학습설정」이 덮어써진 사고의 재발 방지.
페이지의 어떤 스크립트보다 먼저 fetch·XMLHttpRequest·sendBeacon을 감싸므로 화면마다 따로 걸 필요가 없다.
디스크의 파일은 바꾸지 않는다. 막힌 요청은 window.__blockedWrites에 쌓이고 콘솔에 [쓰기 차단]으로 찍힌다.

실행: python scripts/guarded_preview_server.py [포트=8767]   (kids-school-main 폴더에서)
"""
from __future__ import annotations

import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# 읽기(GET, 노션 DB 조회 POST .../query)와 음성·Gemini 호출은 통과, 노션 페이지·블록 쓰기와 업로드는 가짜 200으로 막는다
GUARD = """<script>/* guarded_preview_server: notion write block */(() => {
  const blocked = window.__blockedWrites = [];
  const isWrite = (url, method) => {
    const m = String(method || 'GET').toUpperCase();
    if (m === 'GET' || m === 'HEAD' || m === 'OPTIONS') return false;
    const u = String(url);
    if (/\\/v1\\/databases\\/[^/]+\\/query/.test(u) || /\\/api\\/tts|\\/v1\\/gemini|\\/v1\\/audio\\/speech|\\/api\\/gemini-key/.test(u)) return false;
    return /notion|\\/v1\\/|\\/api\\//.test(u);
  };
  const note = (url, method) => { blocked.push(method + ' ' + url); console.warn('[쓰기 차단]', method, url); };
  const realFetch = window.fetch.bind(window);
  window.fetch = (input, init = {}) => {
    const url = typeof input === 'string' ? input : input.url;
    const method = init.method || (typeof input === 'object' && input.method) || 'GET';
    if (isWrite(url, method)) { note(url, method); return Promise.resolve(new Response('{"object":"blocked"}', { status: 200, headers: { 'Content-Type': 'application/json' } })); }
    return realFetch(input, init);
  };
  const open = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    if (isWrite(url, method)) { note(url, method); url = 'data:application/json,{}'; method = 'GET'; }
    return open.call(this, method, url, ...rest);
  };
  if (navigator.sendBeacon) navigator.sendBeacon = (url) => { note(url, 'BEACON'); return true; };
})();</script>""".encode("utf-8")


class GuardedHandler(SimpleHTTPRequestHandler):
    def send_head(self):
        path = Path(self.translate_path(self.path))
        if path.is_dir():
            path = path / "index.html"
        if path.suffix.lower() != ".html" or not path.is_file():
            return super().send_head()
        html = path.read_bytes()
        head = html.lower().find(b"<head")
        at = html.find(b">", head) + 1 if head >= 0 else 0
        body = html[:at] + GUARD + html[at:]
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        from io import BytesIO
        return BytesIO(body)


def main() -> None:
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8767
    server = ThreadingHTTPServer(("127.0.0.1", port), partial(GuardedHandler, directory=str(ROOT)))
    print(f"노션 쓰기 차단 서버: http://127.0.0.1:{port}/ (폴더 {ROOT})")
    server.serve_forever()


if __name__ == "__main__":
    main()
