#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
영어 「클래스카드 연습」 카드 등록기 (scripts/register_classcard.py)

자료 JSON 1개(scripts/data/classcard/english_{학년}_{단원}.json)를 노션 「클래스카드 DB」에 맞춘다.
단원마다 스크립트·JS 파일을 새로 만들지 않고 이 도구 + 자료 JSON으로 등록한다 (관제탑 GEMINI.md §9-5).
명세: docs/english_spec.md §2-3, 노션 칸: docs/notion_schemas_school.md 「클래스카드 DB」.

- 같은 행: 학년·단원·카드번호가 같은 행. 카드번호는 별표·문항기록 키(s:cc-<학년>-<단원>:<번호>)라 한 번 정하면 바꾸지 않는다.
- 기본은 미리보기. --apply는 없는 행만 새로 만든다. 기존 행은 바뀔 칸만 보여 주고 고치지 않는다
  (부모가 폰 노션에서 고친 글자를 옛 자료로 덮지 않기 위해, 관제탑 GEMINI.md §7-4).
- --update는 기존 행의 바뀐 칸도 자료대로 덮어쓴다 (--apply 포함). 단 「사용」은 덮지 않는다.
- 「사용」(연습에 나오는지)은 행을 처음 만들 때만 자료 값(use, 없으면 자료 맨 위 use, 그것도 없으면 켬)으로 쓴다.
  그 뒤에는 부모가 폰 노션에서 켜고 끈 값을 존중한다. 도구로 바꾸려면 --set-use on|off --cards 35-44 (적은 카드만).
- 노션에만 있고 자료에 없는 행은 알려 주기만 하고 지우지 않는다.

자료 형식:
  {"_설명": "...", "grade": "5-2", "unit": "L11", "student": "민수" 또는 ["민수", "공통"], "use": true,
   "cards": [{"no": 1, "section": 1, "en": "bank", "ko": "은행"},
             {"no": 31, "section": 3, "en": "Where is the~?", "say": "Where is the?", "ko": "[장소]은 어디에 있어요?"},
             {"no": 35, "section": 4, "order": 35, "en": "...", "ko": "...", "use": false}]}
  no·section·en·ko는 필수. order(순번)를 비우면 카드번호. say(읽기)는 화면 글자와 읽을 글자가 다를 때만
  ({2}·/·~ 같은 클래스카드 표기가 있으면 꼭 적는다).

사용 예:
  python -X utf8 scripts/register_classcard.py --file scripts/data/classcard/english_5-2_L11.json            # 미리보기
  python -X utf8 scripts/register_classcard.py --file scripts/data/classcard/english_5-2_L11.json --apply    # 새 행만
  python -X utf8 scripts/register_classcard.py --file scripts/data/classcard/english_5-2_L11.json --update   # 기존 행도 덮어씀
  python -X utf8 scripts/register_classcard.py --file scripts/data/classcard/english_5-2_L11.json --set-use on --cards 35-44
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import register_voca as rv  # noqa: E402  노션 통신(call·rich·value_of)은 VOCA 등록기 것을 같이 쓴다

CLASSCARD_DB_ID = "426a27115b6880c38712d98cf367adb4"  # kids/config.js APP_CONFIG.CLASSCARD_DB_ID와 같은 값
TITLE = "영어"
USE = "사용"
PROP_TYPES = {
    "영어": "title", "뜻": "rich_text", "읽기": "rich_text", "학년": "select", "단원": "select",
    "학생": "multi_select", "구간": "number", "순번": "number", "카드번호": "number", "사용": "checkbox",
}
STUDENTS = ("민수", "민서", "공통")
SYMBOLS = "{}~/"  # 화면 표기만 있고 읽으면 안 되는 클래스카드 기호 → 읽기(say) 칸 필요


# ── 자료 검사 ───────────────────────────
def students_of(seed: dict) -> list[str]:
    s = seed["student"]
    return [s] if isinstance(s, str) else list(s)


def _positive_int(value) -> bool:
    return isinstance(value, int) and not isinstance(value, bool) and value > 0


def validate_seed(seed: dict) -> None:
    for key in ("grade", "unit", "student", "cards"):
        if not seed.get(key):
            raise ValueError(f"자료에 '{key}'가 없습니다")
    for key in ("grade", "unit"):
        if not isinstance(seed[key], str) or not seed[key].strip():
            raise ValueError(f"자료의 '{key}'는 비어 있지 않은 문자열이어야 합니다")
    raw_student = seed["student"]
    if not isinstance(raw_student, (str, list)):
        raise ValueError("자료의 'student'는 문자열 또는 문자열 목록이어야 합니다")
    students = [raw_student] if isinstance(raw_student, str) else raw_student
    if any(not isinstance(s, str) or s not in STUDENTS for s in students):
        raise ValueError(f"자료의 'student'는 {', '.join(STUDENTS)} 중 하나여야 합니다: {raw_student}")
    if len(set(students)) != len(students):
        raise ValueError(f"자료의 'student'에 중복이 있습니다: {raw_student}")
    if "use" in seed and not isinstance(seed["use"], bool):
        raise ValueError("자료의 'use'는 true/false(bool)여야 합니다")
    seen: set[int] = set()
    for i, c in enumerate(seed["cards"], 1):
        if not _positive_int(c.get("no")) or not _positive_int(c.get("section")):
            raise ValueError(f"{i}번째 카드의 no·section은 1 이상의 정수여야 합니다: {c}")
        if "order" in c and not _positive_int(c["order"]):
            raise ValueError(f"카드 {c['no']}의 order는 1 이상의 정수여야 합니다")
        if "use" in c and not isinstance(c["use"], bool):
            raise ValueError(f"카드 {c['no']}의 'use'는 true/false(bool)여야 합니다")
        if not (c.get("en") or "").strip() or not (c.get("ko") or "").strip():
            raise ValueError(f"카드 {c['no']}에 en·ko가 없습니다")
        if c["no"] in seen:
            raise ValueError(f"자료 안에 같은 카드번호가 두 번 있습니다: {c['no']}")
        seen.add(c["no"])
        say = (c.get("say") or "").strip()
        if any(ch in say for ch in SYMBOLS):
            raise ValueError(f"카드 {c['no']}의 읽기(say)에 기호({SYMBOLS})를 넣을 수 없습니다: {say}")
        if any(ch in c["en"] for ch in SYMBOLS) and not say:
            raise ValueError(f"카드 {c['no']} '{c['en']}'에는 기호 없는 읽을 글자(say)가 필요합니다")


def parse_cards(text: str) -> set[int]:
    """'35-44' · '1,3,5' · '35-37,40' → 카드번호 집합"""
    out: set[int] = set()
    for part in (p.strip() for p in str(text).split(",")):
        if not part:
            continue
        if not re.fullmatch(r"\d+(-\d+)?", part):
            raise ValueError(f"카드번호 형식이 이상합니다: {part}")
        a, _, b = part.partition("-")
        lo, hi = int(a), int(b or a)
        if lo < 1 or hi < lo:
            raise ValueError(f"카드번호 범위가 이상합니다: {part}")
        out.update(range(lo, hi + 1))
    if not out:
        raise ValueError("--cards에 카드번호가 없습니다")
    return out


# ── 자료 → 노션 칸 ───────────────────────────
def desired_props(seed: dict, card: dict) -> dict:
    """한 카드의 노션 칸 (영어 제목·사용 제외 — 사용은 처음 만들 때만 쓴다)."""
    return {
        "뜻": rv.rich(card["ko"].strip()),
        "읽기": rv.rich((card.get("say") or "").strip()),
        "학년": {"select": {"name": seed["grade"]}},
        "단원": {"select": {"name": seed["unit"]}},
        "학생": {"multi_select": [{"name": s} for s in students_of(seed)]},
        "구간": {"number": card["section"]},
        "순번": {"number": card.get("order", card["no"])},
        "카드번호": {"number": card["no"]},
    }


def initial_use(seed: dict, card: dict) -> bool:
    return bool(card.get("use", seed.get("use", True)))


def value_of(prop: dict):
    if "number" in prop:
        return prop["number"]
    return rv.value_of(prop)


def number_of(page: dict, name: str):
    return page.get("properties", {}).get(name, {}).get("number")


def check_schema() -> None:
    schema = rv.call(f"/v1/databases/{CLASSCARD_DB_ID}", method="GET").get("properties", {})
    missing = [n for n in PROP_TYPES if n not in schema]
    if missing:
        raise ValueError(f"클래스카드 DB에 없는 칸: {', '.join(missing)} (docs/notion_schemas_school.md 확인)")
    wrong = [f"{n}={schema[n].get('type')} ({t}여야 함)"
             for n, t in PROP_TYPES.items() if schema[n].get("type") != t]
    if wrong:
        raise ValueError(f"클래스카드 DB 칸 타입이 다릅니다: {', '.join(wrong)}")


def existing_rows(seed: dict) -> list[dict]:
    path = f"/v1/databases/{CLASSCARD_DB_ID}/query?force=true"
    body: dict = {
        "filter": {"and": [
            {"property": "학년", "select": {"equals": seed["grade"]}},
            {"property": "단원", "select": {"equals": seed["unit"]}},
        ]},
        "page_size": 100,
        "sorts": [{"timestamp": "created_time", "direction": "ascending"}],
    }
    rows: list[dict] = []
    try:
        while True:
            res = rv.call(path, body)
            rows.extend(res.get("results", []))
            if not res.get("has_more") or not res.get("next_cursor"):
                break
            body["start_cursor"] = res["next_cursor"]
        return rows
    except RuntimeError as e:
        # 아직 없는 선택지(새 학년·단원)로 거르면 노션이 400을 낸다. 선택지가 없으면 그 행도 없다
        msg = str(e)
        if "HTTP 400" in msg and "not found for property" in msg:
            return []
        raise


def sync_cards(seed: dict, apply: bool = False, update: bool = False,
               set_use: bool | None = None, cards: set[int] | None = None) -> dict:
    """자료를 클래스카드 DB에 맞춘다 → 건수 요약."""
    validate_seed(seed)
    apply = apply or update
    by_no: dict[int | None, list[dict]] = {}
    for page in existing_rows(seed):
        by_no.setdefault(number_of(page, "카드번호"), []).append(page)
    stat = {"new": 0, "created": 0, "same": 0, "changed": 0, "updated": 0, "dup": 0,
            "notion_only": 0, "use_set": 0, "no_number": 0}
    if None in by_no:
        stat["no_number"] = len(by_no[None])
        print(f"   ⚠️ 카드번호가 빈 노션 행 {stat['no_number']}개 — 연습에서 빠집니다. 노션에서 번호를 넣으세요")

    if set_use is not None:
        want = {"checkbox": bool(set_use)}
        for no in sorted(cards or set()):
            pages = by_no.get(no, [])
            if not pages:
                print(f"   ⚠️ 카드 {no}: 노션에 없습니다 (먼저 --apply)")
                continue
            for page in pages:
                if value_of(page["properties"].get(USE, {})) == set_use:
                    continue
                rv.call(f"/v1/pages/{page['id']}", {"properties": {USE: want}}, method="PATCH")
                stat["use_set"] += 1
                time.sleep(0.35)
        return stat

    for card in sorted(seed["cards"], key=lambda c: c["no"]):
        no, en = card["no"], card["en"].strip()
        props = desired_props(seed, card)
        title = {"title": [{"text": {"content": en}}]}
        pages = by_no.get(no, [])
        if len(pages) > 1:
            stat["dup"] += 1
            print(f"   ⚠️ 중복 행 {len(pages)}개 [카드 {no}] — 첫 행만 봅니다. 노션에서 하나만 남기세요")
        if not pages:
            stat["new"] += 1
            use = initial_use(seed, card)
            print(f"   ✨ 신규 [카드 {no}] {section_label(card)} {en} = {rv.short(card['ko'])}{'' if use else ' (사용 끔)'}")
            if apply:
                rv.call("/v1/pages", {"parent": {"database_id": CLASSCARD_DB_ID},
                                      "properties": {TITLE: title, **props, USE: {"checkbox": use}}})
                stat["created"] += 1
                time.sleep(0.35)  # 노션 초당 3회 제한
            continue
        page = pages[0]
        now = page.get("properties", {})
        want = {TITLE: title, **props}
        diffs = [(n, value_of(now.get(n, {})), value_of(w)) for n, w in want.items() if value_of(now.get(n, {})) != value_of(w)]
        if not diffs:
            stat["same"] += 1
            continue
        stat["changed"] += 1
        print(f"   ✏️ 바뀔 칸 [카드 {no}] " + " / ".join(f"{n}: '{rv.short(a)}' → '{rv.short(b)}'" for n, a, b in diffs))
        if update:
            rv.call(f"/v1/pages/{page['id']}", {"properties": {n: want[n] for n, _, _ in diffs}}, method="PATCH")
            stat["updated"] += 1
            time.sleep(0.35)
    seed_nos = {c["no"] for c in seed["cards"]}
    for no in sorted(n for n in by_no if n not in seed_nos and n is not None):
        stat["notion_only"] += 1
        print(f"   ℹ️ 노션에만 있음 [카드 {no}] (지우지 않습니다)")
    return stat


def section_label(card: dict) -> str:
    return f"{card['section']}구간"


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description="영어 클래스카드 카드 등록 (자료 JSON → 노션 클래스카드 DB)")
    ap.add_argument("--file", "-f", required=True, help="자료 JSON (scripts/data/classcard/*.json)")
    ap.add_argument("--apply", action="store_true", help="없는 행을 새로 만든다 (기존 행은 그대로)")
    ap.add_argument("--update", action="store_true", help="기존 행의 바뀐 칸도 자료대로 덮어쓴다 (사용 칸 제외, --apply 포함)")
    ap.add_argument("--set-use", choices=("on", "off"), help="--cards에 적은 카드의 「사용」만 켜거나 끈다")
    ap.add_argument("--cards", help="--set-use 대상 카드번호 (예: 35-44 또는 1,3,5)")
    args = ap.parse_args()
    try:
        if bool(args.set_use) != bool(args.cards):
            raise ValueError("--set-use와 --cards는 함께 씁니다")
        if args.set_use and (args.apply or args.update):
            raise ValueError("--set-use는 --apply/--update와 따로 실행하세요")
        seed = json.loads(Path(args.file).read_text(encoding="utf-8"))
        validate_seed(seed)
        if args.set_use:
            mode = f"사용 {'켜기' if args.set_use == 'on' else '끄기'} ({args.cards})"
        else:
            mode = "새 행 만들기 + 기존 행 덮어쓰기" if args.update else "새 행만 만들기" if args.apply else "미리보기 — 쓰려면 --apply"
        print(f"🃏 클래스카드 {seed['grade']} {seed['unit']} ({', '.join(students_of(seed))}) 카드 {len(seed['cards'])}장 · {mode}")
        check_schema()
        s = sync_cards(seed, apply=args.apply, update=args.update,
                       set_use=None if not args.set_use else args.set_use == "on",
                       cards=parse_cards(args.cards) if args.cards else None)
    except (OSError, ValueError, RuntimeError) as e:
        print(f"❌ {e}", file=sys.stderr)
        return 1
    if args.set_use:
        print(f"\n결과: 사용 칸 바꿈 {s['use_set']}장")
        return 0
    print(f"\n결과: 신규 {s['new']}(만듦 {s['created']}) · 그대로 {s['same']} · 바뀔 칸 있음 {s['changed']}(고침 {s['updated']})"
          f" · 중복 {s['dup']} · 노션에만 있음 {s['notion_only']} · 카드번호 빈 행 {s['no_number']}")
    if s["changed"] and not args.update:
        print("   바뀔 칸은 노션에서 고친 내용일 수 있어 그대로 두었습니다. 자료대로 덮으려면 --update.")
    if s["created"] or s["updated"]:
        print("   화면 반영: 연습 화면은 열 때마다 노션을 새로 읽습니다(통신이 안 되면 기기에 기억한 마지막 묶음).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
