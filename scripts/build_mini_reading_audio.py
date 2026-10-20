#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
민서 미니 독해 고음질 음성(mp3) 생성기 (scripts/build_mini_reading_audio.py)

노션 LIBRARY_DB `트랙 = 🌱 민서 미니 독해` 지문을 읽어, 화면이 읽어 주는 대본마다
Edge-TTS(ko-KR-SunHiNeural) mp3를 kids/assets/audio/mini_reading/<SHA-1 앞 12자리>.mp3 로 만든다.
  - 대본: 제목 / 지문 한 줄씩 / 문제 읽기(말풍선 + 질문 + 1번, 보기.)
    → kids/js/korean_mini_reading.js 의 linesOf·questionScript와 글자 하나까지 같아야 한다.
  - 파일 이름이 대본 글자의 해시라서, 노션에서 지문을 고치면 이전 mp3는 자동으로 안 쓰이고
    (화면은 실시간 TTS로 대신 읽음) 이 스크립트를 다시 돌리면 새 문장만 만든다.

사용 예:
  python -X utf8 scripts/build_mini_reading_audio.py            # 없는 mp3만 생성
  python -X utf8 scripts/build_mini_reading_audio.py --dry-run  # 만들 목록만 보기
  python -X utf8 scripts/build_mini_reading_audio.py --prune    # 더는 안 쓰는 mp3 삭제
"""
from __future__ import annotations

import argparse
import asyncio
import hashlib
import json
import os
import re
import sys
import urllib.request
from pathlib import Path

PROXY_URL = "https://minmin-notion.awslike6.workers.dev"
LIBRARY_DB_ID = "37ca27115b688023a7d2cc5b3ff51fee"
MINI_TRACK = "🌱 민서 미니 독해"
VOICE = "ko-KR-SunHiNeural"
RATE = "-5%"  # 초1 듣기 속도 (동화책 +0%보다 살짝 천천히)
OUT_DIR = Path(__file__).resolve().parent.parent / "kids" / "assets" / "audio" / "mini_reading"
HEADERS = {"Content-Type": "application/json", "User-Agent": "Mozilla/5.0 minmin-mini-audio/1.0"}


def clip_name(text: str) -> str:
    return hashlib.sha1(text.encode("utf-8")).hexdigest()[:12] + ".mp3"


def question_script(q: dict) -> str:
    sp = q.get("speaker") or {}
    who = f"{sp.get('name') or ''}의 말. {sp['line']}. " if sp.get("line") else ""
    opts = " ".join(f"{i + 1}번, {o}." for i, o in enumerate(q["options"]))
    return f"{who}{q['question']} {opts}"


def clip_texts(passage: dict) -> list[str]:
    lines = [s.strip() for s in re.split(r"\n+", passage["fullText"]) if s.strip()]
    return [passage["title"], *lines, *(question_script(q) for q in passage["questions"])]


def plain(prop: dict) -> str:
    items = prop.get("title") or prop.get("rich_text") or []
    return "".join(t.get("plain_text", "") for t in items)


def fetch_passages() -> list[dict]:
    body = {"filter": {"property": "트랙", "select": {"equals": MINI_TRACK}}, "page_size": 100}
    req = urllib.request.Request(f"{PROXY_URL}/v1/databases/{LIBRARY_DB_ID}/query",
                                 data=json.dumps(body).encode(), headers=HEADERS, method="POST")
    with urllib.request.urlopen(req, timeout=30) as resp:
        pages = json.load(resp)["results"]
    out = []
    for pg in pages:
        p = pg["properties"]
        try:
            questions = json.loads(plain(p["문제데이터"]) or "[]")
        except json.JSONDecodeError:
            print(f"⚠️ 문제데이터 JSON 오류로 건너뜀: {plain(p['책 제목'])}")
            continue
        out.append({"title": plain(p["책 제목"]) or "제목 없음", "fullText": plain(p["지문전문"]).strip(), "questions": questions})
    return out


async def synthesize(text: str, path: Path) -> None:
    import edge_tts  # pip install edge-tts
    proxy = os.environ.get("HTTPS_PROXY") or None
    await edge_tts.Communicate(text, VOICE, rate=RATE, proxy=proxy).save(str(path))


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description="민서 미니 독해 Edge-TTS mp3 생성")
    ap.add_argument("--dry-run", action="store_true", help="만들 목록만 출력")
    ap.add_argument("--prune", action="store_true", help="지금 지문에서 안 쓰는 mp3 삭제")
    args = ap.parse_args()

    passages = fetch_passages()
    wanted: dict[str, str] = {}
    for p in passages:
        for t in clip_texts(p):
            wanted[clip_name(t)] = t
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    missing = {n: t for n, t in wanted.items() if not (OUT_DIR / n).exists()}
    print(f"📖 지문 {len(passages)}편 · 대본 {len(wanted)}개 · 새로 만들 mp3 {len(missing)}개")

    made = 0
    for name, text in missing.items():
        print(f"   🎙️ {name}  {text[:40]}")
        if args.dry_run:
            continue
        path = OUT_DIR / name
        try:
            asyncio.run(synthesize(text, path))
        except Exception as e:  # 한 문장 실패가 전체를 막지 않게
            path.unlink(missing_ok=True)
            print(f"      ❌ 실패: {e}")
            continue
        if path.stat().st_size < 1000:
            path.unlink()
            print("      ❌ 빈 파일이라 지웠습니다")
            continue
        made += 1

    if args.prune:
        stale = [f for f in OUT_DIR.glob("*.mp3") if f.name not in wanted]
        for f in stale:
            if not args.dry_run:
                f.unlink()
        print(f"🧹 안 쓰는 mp3 {len(stale)}개 {'삭제 예정' if args.dry_run else '삭제'}")

    if not args.dry_run:
        print(f"🎉 생성 {made}/{len(missing)}개 → {OUT_DIR}")
        if made < len(missing):
            return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
