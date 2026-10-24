#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
1~100 순우리말(고유어) 수 읽기 고음질 음성(mp3) 생성기
(kids-school-main/scripts/build_math_numbers_audio.py)

초등학교 1학년 2학기 1단원 100까지의 수 교과서 규격에 맞추어
1~100까지의 고유어(하나, 둘, 셋, ..., 예순, 예순하나, ..., 온)
Edge-TTS(ko-KR-SunHiNeural) mp3를 kids/assets/audio/math_numbers/num_{n}.mp3 로 생성한다.
"""
from __future__ import annotations

import asyncio
import os
import sys
from pathlib import Path

VOICE = "ko-KR-SunHiNeural"
RATE = "+0%"  # 맑고 또박또박한 낭독 속도
OUT_DIR = Path(__file__).resolve().parent.parent / "kids" / "assets" / "audio" / "math_numbers"

KOREAN_TENS = {
    1: '열',
    2: '스물',
    3: '서른',
    4: '마흔',
    5: '쉰',
    6: '예순',
    7: '일흔',
    8: '여든',
    9: '아흔',
}
KOREAN_ONES = {
    1: '하나',
    2: '둘',
    3: '셋',
    4: '넷',
    5: '다섯',
    6: '여섯',
    7: '일곱',
    8: '여덟',
    9: '아홉',
}


def get_pure_korean(n: int) -> str:
    if n == 100:
        return '온'
    tens = n // 10
    ones = n % 10
    if tens == 0:
        return KOREAN_ONES[ones]
    if ones == 0:
        return KOREAN_TENS[tens]
    return f"{KOREAN_TENS[tens]}{KOREAN_ONES[ones]}"


async def synthesize_one(sem: asyncio.Semaphore, n: int, word: str, path: Path):
    import edge_tts

    if path.exists() and path.stat().st_size > 1000:
        return n, word, False

    async with sem:
        proxy = os.environ.get("HTTPS_PROXY") or None
        communicate = edge_tts.Communicate(word, VOICE, rate=RATE, proxy=proxy)
        await communicate.save(str(path))
        return n, word, True


async def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    sem = asyncio.Semaphore(5)

    tasks = []
    for n in range(1, 101):
        word = get_pure_korean(n)
        file_path = OUT_DIR / f"num_{n}.mp3"
        tasks.append(synthesize_one(sem, n, word, file_path))

    results = await asyncio.gather(*tasks)
    created = [r for r in results if r[2]]
    print(f"🎉 총 100개 숫자 중 {len(created)}개 신규 mp3 생성 완료! (저장 위치: {OUT_DIR})")


if __name__ == "__main__":
    asyncio.run(main())
