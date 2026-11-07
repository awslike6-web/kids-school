"""과목 공용 VOCA_DB 등록기 회귀 시험. 실제 register_voca.py를 부르고 노션 통신(call)만 가짜로 바꾼다.

실행: python -X utf8 -m unittest scripts/test_register_voca.py (공부방 루트에서, 노션 미접속)
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
import register_voca as rv  # noqa: E402

SEED = {"subject": "영어", "grade": "5-2", "student": "민수", "unit": "L11", "test_scope": True,
        "voca": [{"word": "bank", "meaning": "은행", "detail": "돈을 맡기는 곳", "pos": "명사", "type": "단어"},
                 {"word": "Go straight.", "meaning": "곧장 가세요.", "type": "문장"}]}


def page(pid, word, **over):
    """노션 응답 형식의 VOCA 행 (SEED와 같은 값이 기본)"""
    item = next(v for v in SEED["voca"] if v["word"] == word)
    props = {k: copy.deepcopy(v) for k, v in rv.desired_props(SEED, item).items()}
    for name in ("뜻풀이", "상세설명", "품사", "단원"):
        if name in props:
            props[name] = {"rich_text": [{"plain_text": rv.value_of(props[name])}]}
    props["단어"] = {"title": [{"plain_text": word}]}
    props["숙련도"] = {"rich_text": [{"plain_text": "6|2026-10-15|2026-10-15"}]}
    props["달성"] = {"checkbox": True}
    for name, value in over.items():
        props[name] = value
    return {"id": pid, "properties": props}


def schema_from_doc() -> dict:
    """docs/notion_schemas_school.md VOCA_DB 표 → 가짜 스키마 (선택지 포함)"""
    text = (KIDS / "docs/notion_schemas_school.md").read_text(encoding="utf-8")
    sec = text[text.index("375a27115b688038b686d3994ee12919"):]
    sec = sec[:sec.index("\n### ")]
    schema = {}
    for name, kind, opts in re.findall(r"^\| \*\*(.+?)\*\* \| `(\w+)`(?: \((.*?)\))? \|", sec, re.M):
        options = [{"name": o.strip()} for o in opts.split(",")] if opts else []
        schema[name] = {"type": kind, kind: {"options": options}}
    return schema


class FakeNotion:
    def __init__(self, rows, schema=None):
        self.rows, self.schema, self.calls = rows, schema or schema_from_doc(), []

    def __call__(self, path, payload=None, method="POST"):
        self.calls.append((method, path, copy.deepcopy(payload)))
        if method == "GET":
            return {"properties": self.schema}
        if path.endswith("/query"):
            return {"results": self.rows, "has_more": False}
        return {"id": "new-id"}

    def writes(self):
        return [c for c in self.calls if c[0] == "PATCH" or (c[0] == "POST" and c[1] == "/v1/pages")]


class SyncTest(unittest.TestCase):
    def run_sync(self, rows, **kw):
        fake = FakeNotion(rows)
        old_call, old_sleep = rv.call, rv.time.sleep
        rv.call, rv.time.sleep = fake, (lambda s: None)
        try:
            stat = rv.sync_voca(copy.deepcopy(SEED), **kw)
        finally:
            rv.call, rv.time.sleep = old_call, old_sleep
        return stat, fake

    def test_preview_never_writes(self):
        stat, fake = self.run_sync([page("p1", "bank", 뜻풀이={"rich_text": [{"plain_text": "은행(고침)"}]})])
        self.assertEqual((stat["new"], stat["changed"]), (1, 1))
        self.assertEqual(fake.writes(), [])

    def test_query_filter_uses_full_key(self):
        _, fake = self.run_sync([])
        flt = fake.calls[0][2]["filter"]["and"]
        self.assertEqual([f["property"] for f in flt], ["과목", "학년", "학생", "단원"])
        self.assertEqual(flt[3]["rich_text"]["equals"], "L11")

    def test_apply_creates_only_new_rows(self):
        stat, fake = self.run_sync([page("p1", "bank", 뜻풀이={"rich_text": [{"plain_text": "은행(노션에서 고침)"}]})],
                                   apply=True)
        writes = fake.writes()
        self.assertEqual(len(writes), 1)
        method, path, body = writes[0]
        self.assertEqual((method, path), ("POST", "/v1/pages"))
        self.assertEqual(body["properties"]["단어"]["title"][0]["text"]["content"], "Go straight.")
        self.assertTrue(body["properties"]["시험범위"]["checkbox"])
        self.assertEqual((stat["created"], stat["changed"], stat["updated"]), (1, 1, 0))

    def test_update_patches_only_changed_fields(self):
        rows = [page("p1", "bank", 뜻풀이={"rich_text": [{"plain_text": "옛 뜻"}]}), page("p2", "Go straight.")]
        stat, fake = self.run_sync(rows, update=True)
        writes = fake.writes()
        self.assertEqual(len(writes), 1)
        method, path, body = writes[0]
        self.assertEqual((method, path, list(body["properties"])), ("PATCH", "/v1/pages/p1", ["뜻풀이"]))
        self.assertEqual((stat["same"], stat["updated"]), (1, 1))

    def test_progress_fields_never_written(self):
        _, fake = self.run_sync([page("p1", "bank", 상세설명={"rich_text": [{"plain_text": "다름"}]})], update=True)
        for _, _, body in fake.writes():
            self.assertFalse(set(body["properties"]) & set(rv.NEVER_WRITE))

    def test_notion_only_and_duplicate_rows_reported_not_touched(self):
        rows = [page("p1", "bank"), page("p1b", "bank"), page("p2", "Go straight."),
                {"id": "p3", "properties": {"단어": {"title": [{"plain_text": "library"}]}}}]
        stat, fake = self.run_sync(rows, update=True)
        self.assertEqual((stat["dup"], stat["notion_only"]), (1, 1))
        self.assertEqual(fake.writes(), [])


class ValidateTest(unittest.TestCase):
    def test_bad_seeds(self):
        for bad in ({**SEED, "unit": ""},
                    {**SEED, "voca": [{"word": "bank"}]},
                    {**SEED, "voca": [SEED["voca"][0], SEED["voca"][0]]}):
            with self.assertRaises(ValueError):
                rv.validate_seed(bad)

    def test_schema_missing_field_stops(self):
        schema = schema_from_doc()
        del schema["품사"]
        old = rv.call
        rv.call = FakeNotion([], schema)
        try:
            with self.assertRaises(ValueError):
                rv.check_schema(SEED)
        finally:
            rv.call = old

    def test_schema_new_option_warns(self):
        old = rv.call
        rv.call = FakeNotion([])
        try:
            self.assertEqual(rv.check_schema(SEED), [])
            warnings = rv.check_schema({**SEED, "grade": "7-1"})
        finally:
            rv.call = old
        self.assertEqual(len(warnings), 1)
        self.assertIn("7-1", warnings[0])


class SeedFilesTest(unittest.TestCase):
    """저장소의 실제 자료 JSON이 형식과 VOCA_DB 칸·선택지(스키마 도감 기준)에 맞는지"""

    def test_all_seed_files(self):
        files = sorted((SCRIPTS / "data" / "voca").glob("*.json"))
        self.assertTrue(files)
        old = rv.call
        rv.call = FakeNotion([])
        try:
            for f in files:
                seed = json.loads(f.read_text(encoding="utf-8"))
                rv.validate_seed(seed)
                self.assertEqual(rv.check_schema(seed), [], f.name)
        finally:
            rv.call = old

    def test_english_l11_counts(self):
        seed = json.loads((SCRIPTS / "data/voca/english_5-2_L11.json").read_text(encoding="utf-8"))
        kinds = [v["type"] for v in seed["voca"]]
        self.assertEqual((kinds.count("단어"), kinds.count("숙어"), kinds.count("문장")), (24, 9, 14))


if __name__ == "__main__":
    unittest.main()
