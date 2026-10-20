#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
민서(초1) 국어 단원 묶음 노션 등록기 (scripts/register_minseo_korean.py)

시드 JSON(scripts/data/minseo_korean_*.json) 1개로 아래 두 곳을 한 번에 맞춘다.
  1) VOCA_DB    : 5분방용 정제 어휘 (과목=국어만, 받아쓰기 태그 없음 → 받아쓰기 훈련소와 분리)
                  상세설명 예문의 [활용형] 표시가 5분방 Lv.2 빈칸 정답이 된다 ("연필심이 [닳았다].")
  2) LIBRARY_DB : 국어방 '민서 미니 독해' 지문 + 3단계 문제(step 1·2·3) JSON
                  출처구분/원작 출처 속성으로 저작권 확인 대상 지문을 표시한다 (없으면 속성을 만든다)

- 같은 학생·단원·단어(VOCA) / 같은 도서 키(LIBRARY)가 있으면 새로 만들지 않고 내용만 갱신한다.
  VOCA의 숙련도·달성은 건드리지 않는다.
- 기본은 미리보기(dry-run). 실제 쓰기는 --apply.

사용 예:
  python -X utf8 scripts/register_minseo_korean.py --file scripts/data/minseo_korean_1-2_u2.json
  python -X utf8 scripts/register_minseo_korean.py --file scripts/data/minseo_korean_1-2_u2.json --apply
"""
from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

PROXY_URL = "https://minmin-notion.awslike6.workers.dev"
VOCA_DB_ID = "375a27115b688038b686d3994ee12919"
LIBRARY_DB_ID = "37ca27115b688023a7d2cc5b3ff51fee"
MINI_TRACK = "🌱 민서 미니 독해"  # korean_mini_reading.js가 이 트랙만 읽는다
HEADERS = {
    "Content-Type": "application/json",
    # 노션 Worker는 User-Agent가 없으면 403
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) minmin-register/1.0",
}
# 저작권 표시 속성 (판매 등 외부 공개 전에 '교과서 원문/재구성'만 골라 바꾸거나 지울 수 있게)
LIBRARY_EXTRA_PROPS = {
    "출처구분": {"select": {"options": [
        {"name": "자체 창작", "color": "green"},
        {"name": "교과서 재구성", "color": "yellow"},
        {"name": "교과서 원문", "color": "red"},
    ]}},
    "원작 출처": {"rich_text": {}},
}


def call(path: str, payload: dict | None = None, method: str = "POST") -> dict:
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    req = urllib.request.Request(f"{PROXY_URL}{path}", data=data, headers=HEADERS, method=method)
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=20) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", errors="replace")[:300]
            if e.code in (429, 500, 502, 503) and attempt < 2:
                time.sleep(1.5 * (attempt + 1))
                continue
            raise RuntimeError(f"{method} {path} → HTTP {e.code}: {body}") from None
    raise RuntimeError(f"{method} {path} 재시도 초과")


def query_all(db_id: str, flt: dict) -> list[dict]:
    """Worker는 같은 본문의 query를 5분간 엣지 캐시한다. 방금 만든 행을 놓치지 않도록 page_size를 매번 달리해 캐시를 비켜 간다."""
    results, cursor = [], None
    while True:
        body = {"filter": flt, "page_size": 100 - int(time.time()) % 40}
        if cursor:
            body["start_cursor"] = cursor
        data = call(f"/v1/databases/{db_id}/query", body)
        results += data.get("results", [])
        if not data.get("has_more"):
            return results
        cursor = data.get("next_cursor")


def rich(text: str) -> dict:
    text = text or ""
    return {"rich_text": [{"text": {"content": text[i:i + 1900]}} for i in range(0, len(text), 1900)]}


def plain_title(page: dict, prop: str) -> str:
    return "".join(t.get("plain_text", "") for t in page["properties"].get(prop, {}).get("title", []))


def ensure_library_props(apply: bool) -> None:
    db = call(f"/v1/databases/{LIBRARY_DB_ID}", method="GET")
    missing = {k: v for k, v in LIBRARY_EXTRA_PROPS.items() if k not in db.get("properties", {})}
    if not missing:
        print("✅ LIBRARY_DB 저작권 표시 속성(출처구분·원작 출처) 이미 있음")
        return
    print(f"🆕 LIBRARY_DB 속성 추가: {', '.join(missing)}")
    if apply:
        call(f"/v1/databases/{LIBRARY_DB_ID}", {"properties": missing}, method="PATCH")


def upsert_voca(seed: dict, apply: bool) -> tuple[int, int]:
    student, grade, unit = seed["student"], seed["grade"], seed["unit"]
    existing = query_all(VOCA_DB_ID, {"and": [
        {"property": "학생", "multi_select": {"contains": student}},
        {"property": "단원", "rich_text": {"equals": unit}},
    ]})
    by_word = {plain_title(p, "단어").strip(): p["id"] for p in existing}
    created = updated = 0
    for v in seed["voca"]:
        word = v["word"].strip()
        if v.get("detail") and "[" not in v["detail"]:
            print(f"   ⚠️ '{word}' 예문에 [활용형] 표시가 없어 5분방 예문 빈칸이 나오지 않습니다: {v['detail']}")
        props = {
            "뜻풀이": rich(v["meaning"]),
            "상세설명": rich(v.get("detail", "")),
            "단원": rich(unit),
            "과목": {"multi_select": [{"name": "국어"}]},
            "학년": {"multi_select": [{"name": grade}]},
            "학생": {"multi_select": [{"name": student}]},
            "어휘유형": {"select": {"name": v.get("type", "단어")}},
        }
        page_id = by_word.get(word)
        print(f"   {'♻️ 갱신' if page_id else '✨ 신규'} [{word}] {v['meaning']} / 예문: {v.get('detail', '')}")
        if not apply:
            continue
        if page_id:
            call(f"/v1/pages/{page_id}", {"properties": props}, method="PATCH")
            updated += 1
        else:
            props["단어"] = {"title": [{"text": {"content": word}}]}
            call("/v1/pages", {"parent": {"database_id": VOCA_DB_ID}, "properties": props})
            created += 1
        time.sleep(0.35)  # 노션 초당 3회 제한
    return created, updated


def upsert_passages(seed: dict, apply: bool) -> tuple[int, int]:
    created = updated = 0
    for p in seed.get("passages", []):
        steps = [q.get("step") for q in p["questions"]]
        if steps != [1, 2, 3]:
            raise ValueError(f"[{p['title']}] 문제는 step 1·2·3 순서로 3개여야 합니다 (현재 {steps})")
        for q in p["questions"]:
            if q["answer"] not in q["options"]:
                raise ValueError(f"[{p['title']}] 정답이 보기에 없습니다: {q['answer']}")
        props = {
            "책 제목": {"title": [{"text": {"content": p["title"]}}]},
            "과목": {"select": {"name": "국어"}},
            "트랙": {"select": {"name": MINI_TRACK}},
            "회차/단원": rich(seed["unit"]),
            "순번": {"number": int(p["order"])},
            "학년": {"multi_select": [{"name": seed["grade"]}]},
            "학생": {"multi_select": [{"name": seed["student"]}]},
            "도서 키(ID)": rich(p["book_id"]),
            "추천 여부": {"checkbox": False},
            "난이도": {"select": {"name": "1단계"}},
            "지문구성내용": rich(p.get("summary", "")),
            "지문전문": rich(p["full_text"]),
            "문제데이터": rich(json.dumps(p["questions"], ensure_ascii=False)),
            "출처구분": {"select": {"name": p.get("source_type", "자체 창작")}},
            "원작 출처": rich(p.get("source_note", "")),
        }
        found = query_all(LIBRARY_DB_ID, {"property": "도서 키(ID)", "rich_text": {"equals": p["book_id"]}})
        print(f"   {'♻️ 갱신' if found else '✨ 신규'} 📖 {p['title']} ({p['book_id']}, {p.get('source_type', '자체 창작')})")
        if not apply:
            continue
        if found:
            call(f"/v1/pages/{found[0]['id']}", {"properties": props}, method="PATCH")
            updated += 1
        else:
            call("/v1/pages", {"parent": {"database_id": LIBRARY_DB_ID}, "properties": props})
            created += 1
        time.sleep(0.35)
    return created, updated


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description="민서 국어 단원 묶음(VOCA 정제 어휘 + 미니 독해 지문) 노션 등록")
    ap.add_argument("--file", "-f", required=True, help="시드 JSON 경로 (scripts/data/minseo_korean_*.json)")
    ap.add_argument("--apply", action="store_true", help="실제로 노션에 쓴다 (없으면 미리보기)")
    args = ap.parse_args()

    seed = json.loads(Path(args.file).read_text(encoding="utf-8"))
    mode = "실제 등록" if args.apply else "미리보기(dry-run) — 쓰려면 --apply"
    print(f"📚 {seed['student']} {seed['grade']} {seed['unit']} · {mode}")

    print("\n[1] LIBRARY_DB 저작권 표시 속성")
    ensure_library_props(args.apply)
    print(f"\n[2] VOCA_DB 정제 어휘 {len(seed['voca'])}개")
    vc, vu = upsert_voca(seed, args.apply)
    print(f"\n[3] LIBRARY_DB 미니 독해 지문 {len(seed.get('passages', []))}편")
    pc, pu = upsert_passages(seed, args.apply)

    if args.apply:
        print(f"\n🎉 완료: VOCA 신규 {vc}·갱신 {vu} / 지문 신규 {pc}·갱신 {pu}")
        print("   화면 반영: 공부방 VOCA·독해 캐시는 하루 단위라, 설정 → 노션 동기화(캐시 초기화) 후 확인하세요.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
