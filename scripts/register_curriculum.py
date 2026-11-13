#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
교재·사료 마스터 DB(CURRICULUM_DB) 문항 등록기 (scripts/register_curriculum.py)

자료 JSON 1개(scripts/data/curriculum/{과목영문}_{학년}_{단원키}.json)를 노션 CURRICULUM_DB에 맞춘다.
사회 사료·지도·도표 문제, 과학 실험·관찰 자료를 단원마다 일회성 스크립트로 넣던 방식을 대신한다
(관제탑 GEMINI.md §9-5, 옛 스크립트는 관제탑 scripts/archive/2026-11/).

- 같은 행: 과목·학년·단원이 같고 제목이 같은 행.
- 기본은 미리보기. --apply는 없는 행만 새로 만든다. 기존 행은 바뀔 칸만 보여 주고 고치지 않는다
  (부모가 폰 노션에서 고친 글자나 퀵체인지로 바꾼 사진을 옛 자료로 덮지 않기 위해, 관제탑 GEMINI.md §7-4).
- --update는 기존 행의 바뀐 칸도 자료대로 덮어쓴다 (--apply 포함).
- 자료에 적은 칸만 쓴다. media_url을 아예 적지 않으면 노션 사진 칸은 건드리지 않고,
  ""로 적으면 공란으로 맞춘다 (사진이 없으면 공란, GEMINI.md §5-1).
- 노션에 없는 칸 이름은 멈추고, 선택지에 없는 값(과목·학년·구역)은 미리 경고한다.
- 사회는 화면이 읽는 구역(역사사료·지도탐방·자료분석)이 아니면 경고하고,
  구역별 행이 100개를 넘으면 경고한다 (사회방 fetchCurriculumFromNotion이 100행까지만 읽음).
- 노션에만 있고 자료에 없는 행은 알려 주기만 하고 지우지 않는다.

자료 형식:
  {"_설명": "...", "subject": "사회", "grade": "5-2", "unit": "3-1. {소단원 원문}",
   "items": [{"title": "[독립운동] 3·1 운동", "zone": "역사사료",
              "question": "...", "choices": ["...", "...", "...", "..."], "answer": 2,
              "explanation": "...", "usage": "교과서 OO쪽 · 한 줄 설명",
              "media_url": "", "interactive_url": "..."}]}
  title·zone은 필수. question·choices·answer는 셋 다 쓰거나 셋 다 비운다
  (choices 2~4개, 줄바꿈 금지, answer는 1부터 센 번호). 나머지 칸은 적은 것만 쓴다.

사용 예:
  python -X utf8 scripts/register_curriculum.py --file scripts/data/curriculum/society_5-2_3-1.json            # 미리보기
  python -X utf8 scripts/register_curriculum.py --file scripts/data/curriculum/society_5-2_3-1.json --apply    # 새 행만
  python -X utf8 scripts/register_curriculum.py --file scripts/data/curriculum/society_5-2_3-1.json --update   # 기존 행도 덮어씀

노션 통신 함수(call·query_all·rich·plain_title)와 칸 비교(value_of·short)는 register_voca.py에서 불러 쓴다.
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import register_voca as rv  # noqa: E402  노션 통신·칸 비교 공용 함수

CURRICULUM_DB_ID = "3e8a27115b68806d94bfc81e9b3435fa"
OPTION_PROPS = ("과목", "학년", "구역")
# 과목방 화면이 실제로 읽는 구역. 여기에 없는 구역으로 넣으면 화면에 안 나온다.
SCREEN_ZONES = {"사회": ("역사사료", "지도탐방", "자료분석")}
# 사회방 fetchCurriculumFromNotion은 구역별 page_size 100 한 번만 읽는다 (다음 쪽 안 읽음).
SCREEN_ROW_LIMIT = {"사회": 100}

QUIZ_KEYS = ("question", "choices", "answer")


# ── 자료 검사 ───────────────────────────
def validate_seed(seed: dict) -> None:
    for key in ("subject", "grade", "unit", "items"):
        if not seed.get(key):
            raise ValueError(f"자료에 '{key}'가 없습니다")
    seen = set()
    for i, item in enumerate(seed["items"], 1):
        title = (item.get("title") or "").strip()
        if not title or not (item.get("zone") or "").strip():
            raise ValueError(f"{i}번째 문항에 title·zone이 없습니다: {item}")
        if title in seen:
            raise ValueError(f"자료 안에 같은 제목이 두 번 있습니다: {title}")
        seen.add(title)
        has = [k for k in QUIZ_KEYS if item.get(k) not in (None, "", [])]
        if not has:
            continue
        if len(has) != len(QUIZ_KEYS):
            raise ValueError(f"[{title}] question·choices·answer는 셋 다 쓰거나 셋 다 비웁니다 (지금: {', '.join(has)})")
        choices = item["choices"]
        if not isinstance(choices, list) or not 2 <= len(choices) <= 4:
            raise ValueError(f"[{title}] choices는 2~4개 배열이어야 합니다")
        for c in choices:
            if not isinstance(c, str) or not c.strip() or "\n" in c:
                raise ValueError(f"[{title}] 보기는 빈칸·줄바꿈 없는 글자여야 합니다 (화면이 줄바꿈으로 보기를 나눔): {c!r}")
        if len({c.strip() for c in choices}) != len(choices):
            raise ValueError(f"[{title}] 같은 보기가 두 번 있습니다")
        answer = item["answer"]
        if isinstance(answer, bool) or not isinstance(answer, int) or not 1 <= answer <= len(choices):
            raise ValueError(f"[{title}] answer는 1~{len(choices)} 사이 번호여야 합니다 (1부터 셈): {answer!r}")


# ── 자료 → 노션 칸 ───────────────────────────
def url_prop(value: str) -> dict:
    return {"url": (value or "").strip() or None}


def desired_props(seed: dict, item: dict) -> dict:
    """한 문항의 노션 칸 (제목 제외). 자료에 적은 선택 칸만 넣는다."""
    props = {
        "과목": {"select": {"name": seed["subject"]}},
        "학년": {"select": {"name": seed["grade"]}},
        "단원": rv.rich(seed["unit"]),
        "구역": {"select": {"name": item["zone"].strip()}},
    }
    if item.get("question"):
        props["퀴즈 질문"] = rv.rich(item["question"].strip())
        props["보기 1~4"] = rv.rich("\n".join(c.strip() for c in item["choices"]))
        props["정답"] = {"number": item["answer"]}
    if "explanation" in item:
        props["해설"] = rv.rich(item["explanation"])
    if "usage" in item:
        props["핵심 쓰임새/설명"] = rv.rich(item["usage"])
    if "media_url" in item:
        props["미디어 URL"] = url_prop(item["media_url"])
    if "interactive_url" in item:
        props["인터랙티브 URL"] = url_prop(item["interactive_url"])
    return props


def value_of(prop: dict):
    """노션 칸 하나를 비교용 값으로. url·number는 여기서, 나머지는 register_voca.value_of."""
    if "url" in prop:
        return prop["url"] or ""
    if "number" in prop:
        return prop["number"]
    return rv.value_of(prop)


def diff_props(page: dict, props: dict) -> list[tuple[str, object, object]]:
    """기존 행과 자료가 다른 칸: [(칸, 노션 값, 자료 값)]"""
    now = page.get("properties", {})
    return [(name, value_of(now.get(name, {})), value_of(want))
            for name, want in props.items() if value_of(now.get(name, {})) != value_of(want)]


def check_schema(seed: dict) -> list[str]:
    """노션 DB 칸·선택지를 읽어 자료와 대 본다. 없는 칸이면 ValueError, 새 선택지·화면 밖 구역은 경고 목록으로."""
    schema = rv.call(f"/v1/databases/{CURRICULUM_DB_ID}", method="GET").get("properties", {})
    used: dict[str, set] = {}
    for item in seed["items"]:
        props = desired_props(seed, item)
        missing = [name for name in props if name not in schema]
        if missing:
            raise ValueError(f"CURRICULUM_DB에 없는 칸: {', '.join(missing)} (docs/notion_schemas_school.md 확인)")
        for name in OPTION_PROPS:
            v = value_of(props[name])
            if v:
                used.setdefault(name, set()).add(v)
    warnings = []
    for name, values in used.items():
        kind = schema[name].get("type")
        options = {o["name"] for o in schema[name].get(kind, {}).get("options", [])}
        for v in sorted(values - options):
            warnings.append(f"'{name}' 선택지에 없는 값 '{v}' — 쓰면 노션이 새 선택지를 만듭니다")
    screen = SCREEN_ZONES.get(seed["subject"])
    if screen:
        for z in sorted(used.get("구역", set()) - set(screen)):
            warnings.append(f"구역 '{z}'는 {seed['subject']}방 화면이 읽지 않습니다 (읽는 구역: {', '.join(screen)})")
    return warnings


def check_screen_limit(seed: dict, new_by_zone: dict[str, int]) -> list[str]:
    """화면이 한 번에 읽는 행 수를 넘는지. 지금 행 수 + 이번에 새로 생길 행 수로 센다."""
    limit = SCREEN_ROW_LIMIT.get(seed["subject"])
    if not limit:
        return []
    warnings = []
    for zone in sorted({i["zone"].strip() for i in seed["items"]}):
        rows = rv.query_all(CURRICULUM_DB_ID, {"and": [
            {"property": "과목", "select": {"equals": seed["subject"]}},
            {"property": "구역", "select": {"equals": zone}},
        ]})
        total = len(rows) + new_by_zone.get(zone, 0)
        if total > limit:
            warnings.append(f"{seed['subject']} '{zone}' 행이 {total}개가 됩니다 — 화면은 {limit}행까지만 읽어 "
                            f"일부가 안 보입니다 (kids/js/society_common.js fetchCurriculumFromNotion 여러 쪽 읽기 필요)")
    return warnings


# ── 노션 맞추기 ───────────────────────────
def sync_curriculum(seed: dict, apply: bool = False, update: bool = False) -> dict:
    """자료를 CURRICULUM_DB에 맞춘다 → 건수 요약. apply=새 행 만들기, update=기존 행 덮어쓰기(apply 포함)."""
    validate_seed(seed)
    apply = apply or update
    existing = rv.query_all(CURRICULUM_DB_ID, {"and": [
        {"property": "과목", "select": {"equals": seed["subject"]}},
        {"property": "학년", "select": {"equals": seed["grade"]}},
        {"property": "단원", "rich_text": {"equals": seed["unit"]}},
    ]})
    by_title: dict[str, list[dict]] = {}
    for page in existing:
        by_title.setdefault(rv.plain_title(page, "제목").strip(), []).append(page)
    stat = {"new": 0, "created": 0, "same": 0, "changed": 0, "updated": 0, "dup": 0, "notion_only": 0,
            "new_by_zone": {}}
    for item in seed["items"]:
        title = item["title"].strip()
        props = desired_props(seed, item)
        pages = by_title.get(title, [])
        if len(pages) > 1:
            stat["dup"] += 1
            print(f"   ⚠️ 중복 행 {len(pages)}개 [{title}] — 첫 행만 봅니다. 노션에서 하나만 남기세요")
        if not pages:
            stat["new"] += 1
            zone = item["zone"].strip()
            stat["new_by_zone"][zone] = stat["new_by_zone"].get(zone, 0) + 1
            pic = " 📷" if (item.get("media_url") or "").strip() else ""
            print(f"   ✨ 신규 [{title}] {zone}{pic}")
            if apply:
                rv.call("/v1/pages", {"parent": {"database_id": CURRICULUM_DB_ID},
                                      "properties": {"제목": {"title": [{"text": {"content": title}}]}, **props}})
                stat["created"] += 1
                time.sleep(0.35)  # 노션 초당 3회 제한
            continue
        diffs = diff_props(pages[0], props)
        if not diffs:
            stat["same"] += 1
            continue
        stat["changed"] += 1
        print(f"   ✏️ 바뀔 칸 [{title}] " + " / ".join(f"{n}: '{rv.short(a)}' → '{rv.short(b)}'" for n, a, b in diffs))
        if update:
            rv.call(f"/v1/pages/{pages[0]['id']}", {"properties": {n: props[n] for n, _, _ in diffs}}, method="PATCH")
            stat["updated"] += 1
            time.sleep(0.35)
    seed_titles = {i["title"].strip() for i in seed["items"]}
    for title in sorted(set(by_title) - seed_titles):
        stat["notion_only"] += 1
        print(f"   ℹ️ 노션에만 있음 [{title}] (지우지 않습니다)")
    return stat


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description="교재·사료 마스터 DB(CURRICULUM_DB) 문항 등록 (자료 JSON → 노션)")
    ap.add_argument("--file", "-f", required=True, help="자료 JSON (scripts/data/curriculum/*.json)")
    ap.add_argument("--apply", action="store_true", help="없는 행을 새로 만든다 (기존 행은 그대로)")
    ap.add_argument("--update", action="store_true", help="기존 행의 바뀐 칸도 자료대로 덮어쓴다 (--apply 포함)")
    args = ap.parse_args()
    try:
        seed = json.loads(Path(args.file).read_text(encoding="utf-8"))
        validate_seed(seed)
        mode = "새 행 만들기 + 기존 행 덮어쓰기" if args.update else "새 행만 만들기" if args.apply else "미리보기 — 쓰려면 --apply"
        zones = {}
        for i in seed["items"]:
            zones[i["zone"].strip()] = zones.get(i["zone"].strip(), 0) + 1
        pics = sum(1 for i in seed["items"] if (i.get("media_url") or "").strip())
        print(f"🏛️ {seed['subject']} {seed['grade']} {seed['unit']} 문항 {len(seed['items'])}개 "
              f"({' · '.join(f'{z} {n}' for z, n in zones.items())}, 사진 {pics}) · {mode}")
        for w in check_schema(seed):
            print(f"   ⚠️ {w}")
        s = sync_curriculum(seed, apply=args.apply, update=args.update)
        for w in check_screen_limit(seed, {} if s["created"] else s["new_by_zone"]):
            print(f"   ⚠️ {w}")
    except (OSError, ValueError, RuntimeError) as e:
        print(f"❌ {e}", file=sys.stderr)
        return 1
    print(f"\n결과: 신규 {s['new']}(만듦 {s['created']}) · 그대로 {s['same']} · 바뀔 칸 있음 {s['changed']}(고침 {s['updated']})"
          f" · 중복 {s['dup']} · 노션에만 있음 {s['notion_only']}")
    if s["changed"] and not args.update:
        print("   바뀔 칸은 노션에서 고친 내용일 수 있어 그대로 두었습니다. 자료대로 덮으려면 --update.")
    if s["created"] or s["updated"]:
        print("   화면 반영: 노션 Worker가 같은 조회를 5분간 캐시합니다. 바로 안 보이면 5분 뒤나 "
              "설정 → 노션 동기화(캐시 초기화) 후 확인하세요.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
