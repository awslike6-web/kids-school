#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
과목 공용 VOCA_DB 어휘 등록기 (scripts/register_voca.py)

자료 JSON 1개(scripts/data/voca/{과목}_{학년}_{단원}.json)를 노션 VOCA_DB에 맞춘다.
단원마다 insert_*_voca.py를 새로 만들지 않고 이 도구 + 자료 JSON으로 등록한다 (관제탑 GEMINI.md §9-5).

- 같은 행: 과목·학년·학생(첫 번째)·단원이 같고 단어가 같은 행.
- 기본은 미리보기. --apply는 없는 행만 새로 만든다. 기존 행은 바뀔 칸만 보여 주고 고치지 않는다
  (부모가 폰 노션에서 고친 글자를 옛 자료로 덮지 않기 위해, 관제탑 GEMINI.md §7-4).
- --update는 기존 행의 바뀐 칸도 자료대로 덮어쓴다 (--apply 포함).
- 숙련도·달성은 어떤 경우에도 쓰지 않는다 (5분 퀘스트 진도).
- 노션에 없는 칸 이름은 멈추고, 선택지에 없는 값(과목·학년·학생·어휘유형·영역 분류)은 미리 경고한다.
- 노션에만 있고 자료에 없는 행은 알려 주기만 하고 지우지 않는다.

자료 형식:
  {"_설명": "...", "subject": "영어", "grade": "5-2", "student": "민수" 또는 ["민수", "공통"], "unit": "L11",
   "test_scope": true,            (선택) 시험범위 칸
   "area": "용어방",               (선택) 영역 분류 기본값
   "voca": [{"word": "bank", "meaning": "은행", "detail": "...", "pos": "명사", "type": "단어", "area": "..."}]}
  word·meaning은 필수, 나머지 칸은 적은 것만 쓴다. type을 비우면 '단어'.

사용 예:
  python -X utf8 scripts/register_voca.py --file scripts/data/voca/english_5-2_L11.json            # 미리보기
  python -X utf8 scripts/register_voca.py --file scripts/data/voca/english_5-2_L11.json --apply    # 새 행만
  python -X utf8 scripts/register_voca.py --file scripts/data/voca/english_5-2_L11.json --update   # 기존 행도 덮어씀

노션 통신 함수(call·query_all·rich·plain_title)는 register_minseo_korean.py도 여기서 불러 쓴다.
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
HEADERS = {
    "Content-Type": "application/json",
    # 노션 Worker는 User-Agent가 없으면 403
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) minmin-register/1.0",
}
NEVER_WRITE = ("숙련도", "달성")  # 5분 퀘스트 진도 칸
OPTION_PROPS = ("과목", "학년", "학생", "어휘유형", "영역 분류")


# ── 노션 통신 (Worker 프록시) ───────────────────────────
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


# ── 자료 → 노션 칸 ───────────────────────────
def students_of(seed: dict) -> list[str]:
    s = seed["student"]
    return [s] if isinstance(s, str) else list(s)


def validate_seed(seed: dict) -> None:
    for key in ("subject", "grade", "student", "unit", "voca"):
        if not seed.get(key):
            raise ValueError(f"자료에 '{key}'가 없습니다")
    seen = set()
    for i, v in enumerate(seed["voca"], 1):
        word = (v.get("word") or "").strip()
        if not word or not (v.get("meaning") or "").strip():
            raise ValueError(f"{i}번째 어휘에 word·meaning이 없습니다: {v}")
        if word in seen:
            raise ValueError(f"자료 안에 같은 단어가 두 번 있습니다: {word}")
        seen.add(word)


def desired_props(seed: dict, item: dict) -> dict:
    """한 어휘의 노션 칸 (단어 제목 제외). 자료에 적은 선택 칸만 넣는다."""
    props = {
        "뜻풀이": rich(item["meaning"].strip()),
        "단원": rich(seed["unit"]),
        "과목": {"multi_select": [{"name": seed["subject"]}]},
        "학년": {"multi_select": [{"name": seed["grade"]}]},
        "학생": {"multi_select": [{"name": s} for s in students_of(seed)]},
        "어휘유형": {"select": {"name": item.get("type") or "단어"}},
    }
    if "detail" in item:
        props["상세설명"] = rich(item["detail"])
    if "pos" in item:
        props["품사"] = rich(item["pos"])
    area = item.get("area") or seed.get("area")
    if area:
        props["영역 분류"] = {"select": {"name": area}}
    if "test_scope" in seed:
        props["시험범위"] = {"checkbox": bool(seed["test_scope"])}
    return props


def value_of(prop: dict):
    """노션 칸 하나를 비교용 값으로 (요청 형식·응답 형식 모두)"""
    if "rich_text" in prop or "title" in prop:
        parts = prop.get("rich_text", prop.get("title")) or []
        return "".join(p.get("plain_text", p.get("text", {}).get("content", "")) for p in parts)
    if "select" in prop:
        return (prop["select"] or {}).get("name", "")
    if "multi_select" in prop:
        return sorted(o["name"] for o in prop["multi_select"])
    if "checkbox" in prop:
        return bool(prop["checkbox"])
    return None


def diff_props(page: dict, props: dict) -> list[tuple[str, object, object]]:
    """기존 행과 자료가 다른 칸: [(칸, 노션 값, 자료 값)]"""
    now = page.get("properties", {})
    return [(name, value_of(now.get(name, {})), value_of(want))
            for name, want in props.items() if value_of(now.get(name, {})) != value_of(want)]


def check_schema(seed: dict) -> list[str]:
    """노션 DB 칸·선택지를 읽어 자료와 대 본다. 없는 칸이면 ValueError, 새 선택지는 경고 목록으로."""
    schema = call(f"/v1/databases/{VOCA_DB_ID}", method="GET").get("properties", {})
    used: dict[str, set] = {}
    for item in seed["voca"]:
        props = desired_props(seed, item)
        missing = [name for name in props if name not in schema]
        if missing:
            raise ValueError(f"VOCA_DB에 없는 칸: {', '.join(missing)} (docs/notion_schemas_school.md 확인)")
        for name in OPTION_PROPS:
            v = value_of(props.get(name, {}))
            used.setdefault(name, set()).update(v if isinstance(v, list) else [v] if v else [])
    warnings = []
    for name, values in used.items():
        kind = schema[name].get("type")
        options = {o["name"] for o in schema[name].get(kind, {}).get("options", [])}
        for v in sorted(values - options):
            warnings.append(f"'{name}' 선택지에 없는 값 '{v}' — 쓰면 노션이 새 선택지를 만듭니다")
    return warnings


def short(v, n: int = 40) -> str:
    s = ", ".join(v) if isinstance(v, list) else str(v)
    return s if len(s) <= n else s[:n - 1] + "…"


def sync_voca(seed: dict, apply: bool = False, update: bool = False) -> dict:
    """자료를 VOCA_DB에 맞춘다 → 건수 요약. apply=새 행 만들기, update=기존 행 덮어쓰기(apply 포함)."""
    validate_seed(seed)
    apply = apply or update
    students = students_of(seed)
    existing = query_all(VOCA_DB_ID, {"and": [
        {"property": "과목", "multi_select": {"contains": seed["subject"]}},
        {"property": "학년", "multi_select": {"contains": seed["grade"]}},
        {"property": "학생", "multi_select": {"contains": students[0]}},
        {"property": "단원", "rich_text": {"equals": seed["unit"]}},
    ]})
    by_word: dict[str, list[dict]] = {}
    for page in existing:
        by_word.setdefault(plain_title(page, "단어").strip(), []).append(page)
    stat = {"new": 0, "created": 0, "same": 0, "changed": 0, "updated": 0, "dup": 0, "notion_only": 0}
    for item in seed["voca"]:
        word = item["word"].strip()
        props = desired_props(seed, item)
        assert not any(k in props for k in NEVER_WRITE)
        pages = by_word.get(word, [])
        if len(pages) > 1:
            stat["dup"] += 1
            print(f"   ⚠️ 중복 행 {len(pages)}개 [{word}] — 첫 행만 봅니다. 노션에서 하나만 남기세요")
        if not pages:
            stat["new"] += 1
            print(f"   ✨ 신규 [{word}] {short(item['meaning'])}")
            if apply:
                call("/v1/pages", {"parent": {"database_id": VOCA_DB_ID},
                                   "properties": {"단어": {"title": [{"text": {"content": word}}]}, **props}})
                stat["created"] += 1
                time.sleep(0.35)  # 노션 초당 3회 제한
            continue
        diffs = diff_props(pages[0], props)
        if not diffs:
            stat["same"] += 1
            continue
        stat["changed"] += 1
        print(f"   ✏️ 바뀔 칸 [{word}] " + " / ".join(f"{n}: '{short(a)}' → '{short(b)}'" for n, a, b in diffs))
        if update:
            call(f"/v1/pages/{pages[0]['id']}", {"properties": {n: props[n] for n, _, _ in diffs}}, method="PATCH")
            stat["updated"] += 1
            time.sleep(0.35)
    seed_words = {v["word"].strip() for v in seed["voca"]}
    for word in sorted(set(by_word) - seed_words):
        stat["notion_only"] += 1
        print(f"   ℹ️ 노션에만 있음 [{word}] (지우지 않습니다)")
    return stat


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description="과목 공용 VOCA_DB 어휘 등록 (자료 JSON → 노션)")
    ap.add_argument("--file", "-f", required=True, help="자료 JSON (scripts/data/voca/*.json)")
    ap.add_argument("--apply", action="store_true", help="없는 행을 새로 만든다 (기존 행은 그대로)")
    ap.add_argument("--update", action="store_true", help="기존 행의 바뀐 칸도 자료대로 덮어쓴다 (--apply 포함)")
    args = ap.parse_args()
    try:
        seed = json.loads(Path(args.file).read_text(encoding="utf-8"))
        validate_seed(seed)
        mode = "새 행 만들기 + 기존 행 덮어쓰기" if args.update else "새 행만 만들기" if args.apply else "미리보기 — 쓰려면 --apply"
        print(f"📚 {seed['subject']} {seed['grade']} {seed['unit']} ({', '.join(students_of(seed))}) "
              f"어휘 {len(seed['voca'])}개 · {mode}")
        for w in check_schema(seed):
            print(f"   ⚠️ {w}")
        s = sync_voca(seed, apply=args.apply, update=args.update)
    except (OSError, ValueError, RuntimeError) as e:
        print(f"❌ {e}", file=sys.stderr)
        return 1
    print(f"\n결과: 신규 {s['new']}(만듦 {s['created']}) · 그대로 {s['same']} · 바뀔 칸 있음 {s['changed']}(고침 {s['updated']})"
          f" · 중복 {s['dup']} · 노션에만 있음 {s['notion_only']}")
    if s["changed"] and not args.update:
        print("   바뀔 칸은 노션에서 고친 내용일 수 있어 그대로 두었습니다. 자료대로 덮으려면 --update.")
    if s["created"] or s["updated"]:
        print("   화면 반영: 공부방 VOCA 캐시는 하루 단위라, 설정 → 노션 동기화(캐시 초기화) 후 확인하세요.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
