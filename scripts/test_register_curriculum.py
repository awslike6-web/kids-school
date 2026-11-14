"""교재·사료 마스터 DB 등록기 회귀 시험. 실제 register_curriculum.py를 부르고 노션 통신(call)만 가짜로 바꾼다.

실행: python -X utf8 -m unittest scripts/test_register_curriculum.py (공부방 루트에서, 노션 미접속)
"""
from __future__ import annotations

import copy
import json
import re
import sys
import unittest
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent
KIDS = SCRIPTS.parent
sys.path.insert(0, str(SCRIPTS))
import register_curriculum as rc  # noqa: E402
import register_voca as rv  # noqa: E402
from test_register_voca import FakeNotion  # noqa: E402  가짜 노션 통신 공용

UNIT = "3-1. 시험용 소단원"
SEED = {"subject": "사회", "grade": "5-2", "unit": UNIT,
        "items": [{"title": "[독립운동] 3·1 운동", "zone": "역사사료",
                   "question": "3·1 운동에 대한 설명으로 알맞은 것은?",
                   "choices": ["보기 가", "보기 나", "보기 다", "보기 라"], "answer": 2,
                   "explanation": "해설", "usage": "교과서 OO쪽", "media_url": ""},
                  {"title": "[전쟁과 생활] 피란 지도", "zone": "지도탐방",
                   "question": "피란 지도에서 알 수 있는 것은?",
                   "choices": ["가", "나", "다", "라"], "answer": 4,
                   "media_url": "https://example.com/map.jpg"}]}


def schema_from_doc() -> dict:
    """docs/notion_schemas_school.md CURRICULUM_DB 표 → 가짜 스키마 (선택지 포함)"""
    text = (KIDS / "docs/notion_schemas_school.md").read_text(encoding="utf-8")
    sec = text[text.index("### 🏛️ [교재·사료 마스터 DB] CURRICULUM_DB"):]
    sec = sec[:sec.index("\n### ", 5)]
    schema = {}
    for name, kind, opts in re.findall(r"^\| \*\*(.+?)\*\* \| `(\w+)`(?: \((.*?)\))? \|", sec, re.M):
        options = [{"name": o.strip()} for o in opts.split(",")] if opts else []
        schema[name] = {"type": kind, kind: {"options": options}}
    return schema


def page(pid, title, **over):
    """노션 응답 형식의 CURRICULUM 행 (SEED와 같은 값이 기본)"""
    item = next(i for i in SEED["items"] if i["title"] == title)
    props = {k: copy.deepcopy(v) for k, v in rc.desired_props(SEED, item).items()}
    for name, prop in props.items():
        if "rich_text" in prop:
            props[name] = {"rich_text": [{"plain_text": rv.value_of(prop)}]}
    props["제목"] = {"title": [{"plain_text": title}]}
    props.update(over)
    return {"id": pid, "properties": props}


class Patched:
    """rv.call(통신)과 time.sleep을 가짜로 바꾼다. register_curriculum은 rv.call을 부르므로 한 곳만 바꾸면 된다."""

    def __init__(self, rows, schema=None):
        self.fake = FakeNotion(rows, schema or schema_from_doc())

    def __enter__(self):
        self.old = (rv.call, rc.time.sleep)
        rv.call, rc.time.sleep = self.fake, (lambda s: None)
        return self.fake

    def __exit__(self, *exc):
        rv.call, rc.time.sleep = self.old


class SyncTest(unittest.TestCase):
    def run_sync(self, rows, **kw):
        with Patched(rows) as fake:
            stat = rc.sync_curriculum(copy.deepcopy(SEED), **kw)
        return stat, fake

    def test_preview_never_writes(self):
        stat, fake = self.run_sync([page("p1", SEED["items"][0]["title"], 해설={"rich_text": [{"plain_text": "다름"}]})])
        self.assertEqual((stat["new"], stat["changed"]), (1, 1))
        self.assertEqual(fake.writes(), [])

    def test_query_filter_uses_full_key(self):
        _, fake = self.run_sync([])
        method, path, body = fake.calls[0]
        self.assertEqual(path, f"/v1/databases/{rc.CURRICULUM_DB_ID}/query")
        flt = body["filter"]["and"]
        self.assertEqual([f["property"] for f in flt], ["과목", "학년", "단원"])
        self.assertEqual(flt[2]["rich_text"]["equals"], UNIT)

    def test_apply_creates_only_new_rows_with_screen_format(self):
        stat, fake = self.run_sync([page("p1", SEED["items"][0]["title"], 해설={"rich_text": [{"plain_text": "노션에서 고침"}]})],
                                   apply=True)
        writes = fake.writes()
        self.assertEqual(len(writes), 1)
        method, path, body = writes[0]
        self.assertEqual((method, path), ("POST", "/v1/pages"))
        self.assertEqual(body["parent"]["database_id"], rc.CURRICULUM_DB_ID)
        p = body["properties"]
        self.assertEqual(p["제목"]["title"][0]["text"]["content"], "[전쟁과 생활] 피란 지도")
        # 화면(fetchCurriculumFromNotion)은 보기를 줄바꿈으로 나누고 정답을 1부터 센다
        self.assertEqual(rv.value_of(p["보기 1~4"]).split("\n"), ["가", "나", "다", "라"])
        self.assertEqual(p["정답"]["number"], 4)
        self.assertEqual(p["과목"]["select"]["name"], "사회")
        self.assertEqual(p["학년"]["select"]["name"], "5-2")
        self.assertEqual(p["미디어 URL"]["url"], "https://example.com/map.jpg")
        self.assertEqual((stat["created"], stat["changed"], stat["updated"]), (1, 1, 0))

    def test_update_patches_only_changed_fields(self):
        rows = [page("p1", SEED["items"][0]["title"], 정답={"number": 3}), page("p2", SEED["items"][1]["title"])]
        stat, fake = self.run_sync(rows, update=True)
        writes = fake.writes()
        self.assertEqual(len(writes), 1)
        method, path, body = writes[0]
        self.assertEqual((method, path, list(body["properties"])), ("PATCH", "/v1/pages/p1", ["정답"]))
        self.assertEqual((stat["same"], stat["updated"]), (1, 1))

    def test_blank_media_url_clears_and_missing_key_keeps(self):
        # 자료 ""(공란) ↔ 노션 사진 있음 → 바뀔 칸. 자료에 media_url이 없으면 노션 사진을 건드리지 않는다.
        rows = [page("p1", SEED["items"][0]["title"], **{"미디어 URL": {"url": "https://x/old.jpg"}}),
                page("p2", SEED["items"][1]["title"])]
        stat, fake = self.run_sync(rows, update=True)
        self.assertEqual(fake.writes()[0][2]["properties"], {"미디어 URL": {"url": None}})
        item = {k: v for k, v in SEED["items"][0].items() if k != "media_url"}
        self.assertNotIn("미디어 URL", rc.desired_props(SEED, item))

    def test_notion_only_and_duplicate_rows_reported_not_touched(self):
        t0, t1 = SEED["items"][0]["title"], SEED["items"][1]["title"]
        rows = [page("p1", t0), page("p1b", t0), page("p2", t1),
                {"id": "p3", "properties": {"제목": {"title": [{"plain_text": "옛 문항"}]}}}]
        stat, fake = self.run_sync(rows, update=True)
        self.assertEqual((stat["dup"], stat["notion_only"]), (1, 1))
        self.assertEqual(fake.writes(), [])


class ValidateTest(unittest.TestCase):
    def bad(self, **item_over):
        return {**SEED, "items": [{**SEED["items"][0], **item_over}]}

    def test_bad_seeds(self):
        cases = [{**SEED, "unit": ""},
                 {**SEED, "items": [SEED["items"][0], SEED["items"][0]]},
                 self.bad(zone=""),
                 self.bad(answer=None),                       # 문제 칸 일부만
                 self.bad(answer=0),                          # 1부터 센다
                 self.bad(answer=5),
                 self.bad(answer=True),
                 self.bad(choices=["하나"]),
                 self.bad(choices=["가", "나", "다", "라", "마"]),
                 self.bad(choices=["가", "나\n다", "라", "마"]),  # 화면이 줄바꿈으로 보기를 나눔
                 self.bad(choices=["가", "가", "다", "라"])]
        for seed in cases:
            with self.assertRaises(ValueError, msg=str(seed)[:120]):
                rc.validate_seed(seed)

    def test_item_without_quiz_is_allowed(self):
        seed = {**SEED, "items": [{"title": "[유물] 사진만", "zone": "역사사료", "usage": "설명만"}]}
        rc.validate_seed(seed)
        self.assertNotIn("퀴즈 질문", rc.desired_props(seed, seed["items"][0]))

    def test_schema_missing_field_stops(self):
        schema = schema_from_doc()
        del schema["해설"]
        with Patched([], schema):
            with self.assertRaises(ValueError):
                rc.check_schema(SEED)

    def test_schema_new_option_and_off_screen_zone_warn(self):
        with Patched([]):
            self.assertEqual(rc.check_schema(SEED), [])
            grade = rc.check_schema({**SEED, "grade": "6-2"})
            zone = rc.check_schema({**SEED, "items": [{**SEED["items"][0], "zone": "문화재도감"}]})
        self.assertEqual(len(grade), 1)
        self.assertIn("6-2", grade[0])
        self.assertEqual(len(zone), 1)  # 문화재도감은 선택지엔 있지만 사회방 화면이 안 읽음
        self.assertIn("화면", zone[0])

    def test_screen_row_limit_warns(self):
        rows = [{"id": f"r{i}", "properties": {}} for i in range(99)]
        with Patched(rows):
            self.assertEqual(rc.check_screen_limit(SEED, {"역사사료": 1}), [])
            warned = rc.check_screen_limit(SEED, {"역사사료": 2})
        self.assertEqual(len(warned), 1)
        self.assertIn("역사사료", warned[0])
        with Patched(rows):
            self.assertEqual(rc.check_screen_limit({**SEED, "subject": "과학"}, {"실험실": 50}), [])

    def test_option_number_in_explanation_warns(self):
        def seed_with(text, key="explanation"):
            return {**SEED, "items": [{**SEED["items"][0], key: text}]}
        for bad in ("1번은 안창호가 세운 단체예요.", "정답은 ③이에요.", "보기 2와 비교해 보세요."):
            warned = rc.option_number_warnings(seed_with(bad))
            self.assertEqual(len(warned), 1, bad)
            self.assertIn("해설", warned[0])
        self.assertIn("핵심 쓰임새/설명", rc.option_number_warnings(seed_with("4번 보기", "usage"))[0])
        # 쓰임새의 동그라미 숫자는 그림 위치·교과서 문제 번호라 경고하지 않는다
        self.assertEqual(rc.option_number_warnings(seed_with("구리판 ① ➔ ② 차례로 변색", "usage")), [])
        for ok in ("1919년 3월 1일에 시작됐어요.", "6·25 전쟁", "10번째 사건", "3·1 운동", "1번째 국회"):
            self.assertEqual(rc.option_number_warnings(seed_with(ok)), [], ok)
        # 저장소의 실제 자료에는 보기 번호 표현이 없어야 한다
        for f in sorted((SCRIPTS / "data" / "curriculum").glob("*.json")):
            self.assertEqual(rc.option_number_warnings(json.loads(f.read_text(encoding="utf-8"))), [], f.name)


class SeedFilesTest(unittest.TestCase):
    """저장소의 실제 자료 JSON이 형식과 CURRICULUM_DB 칸·선택지(스키마 도감 기준)에 맞는지"""

    def test_all_seed_files(self):
        files = sorted((SCRIPTS / "data" / "curriculum").glob("*.json"))
        for f in files:
            seed = json.loads(f.read_text(encoding="utf-8"))
            rc.validate_seed(seed)
            with Patched([]):
                self.assertEqual(rc.check_schema(seed), [], f.name)


if __name__ == "__main__":
    unittest.main()
