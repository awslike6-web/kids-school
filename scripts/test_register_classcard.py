"""영어 클래스카드 등록기 회귀 시험. 실제 register_classcard.py를 부르고 노션 통신(call)만 가짜로 바꾼다.

실행: python -X utf8 -m unittest scripts/test_register_classcard.py (공부방 루트에서, 노션 미접속)
"""
from __future__ import annotations

import contextlib
import copy
import io
import json
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS))
import register_classcard as rc  # noqa: E402
import register_voca as rv  # noqa: E402

SEED = {"grade": "5-2", "unit": "L11", "student": "민수",
        "cards": [{"no": 1, "section": 1, "en": "bank", "ko": "은행"},
                  {"no": 31, "section": 3, "en": "Where is the~?", "say": "Where is the?", "ko": "[장소]은 어디에 있어요?"},
                  {"no": 35, "section": 4, "en": "Where is the restaurant?", "ko": "식당이 어디에 있나요?", "use": False}]}


def page(pid, no, use=True, **over):
    """노션 응답 형식의 클래스카드 행 (SEED와 같은 값이 기본)"""
    card = next(c for c in SEED["cards"] if c["no"] == no)
    props = copy.deepcopy(rc.desired_props(SEED, card))
    for name in ("뜻", "읽기"):
        props[name] = {"rich_text": [{"plain_text": rv.value_of(props[name])}] if rv.value_of(props[name]) else []}
    props[rc.TITLE] = {"title": [{"plain_text": card["en"]}]}
    props[rc.USE] = {"checkbox": use}
    props.update(over)
    return {"id": pid, "properties": props}


class FakeNotion:
    def __init__(self, rows, schema=None):
        self.rows = rows
        self.schema = schema if schema is not None else {n: {"type": t} for n, t in rc.PROP_TYPES.items()}
        self.calls = []

    def __call__(self, path, payload=None, method="POST"):
        self.calls.append((method, path, copy.deepcopy(payload)))
        if method == "GET":
            return {"properties": self.schema}
        if "/query" in path:
            return {"results": self.rows, "has_more": False}
        return {"id": "new-id"}

    def writes(self):
        return [c for c in self.calls if c[0] == "PATCH" or (c[0] == "POST" and c[1] == "/v1/pages")]


class SyncTest(unittest.TestCase):
    def run_sync(self, rows, seed=None, schema=None, **kw):
        fake = FakeNotion(rows, schema)
        old_call, old_sleep = rv.call, rc.time.sleep
        rv.call, rc.time.sleep = fake, (lambda s: None)
        try:
            if kw.pop("schema_check", False):
                rc.check_schema()
            stat = rc.sync_cards(copy.deepcopy(seed or SEED), **kw)
        finally:
            rv.call, rc.time.sleep = old_call, old_sleep
        return stat, fake

    def test_preview_writes_nothing(self):
        stat, fake = self.run_sync([])
        self.assertEqual(stat["new"], 3)
        self.assertEqual(fake.writes(), [])

    def test_query_filters_grade_and_unit(self):
        _, fake = self.run_sync([])
        q = next(c for c in fake.calls if "/query" in c[1])
        self.assertIn(rc.CLASSCARD_DB_ID, q[1])
        self.assertIn("force=true", q[1])
        self.assertEqual(q[2]["filter"]["and"], [
            {"property": "학년", "select": {"equals": "5-2"}},
            {"property": "단원", "select": {"equals": "L11"}}])
        self.assertEqual(q[2]["page_size"], 100)
        self.assertEqual(q[2]["sorts"], [{"timestamp": "created_time", "direction": "ascending"}])

    def test_query_pagination_reads_all_pages(self):
        calls = []

        def paged(path, payload=None, method="POST"):
            calls.append((method, path, copy.deepcopy(payload)))
            if "/query" in path:
                if (payload or {}).get("start_cursor") is None:
                    return {"results": [page("p1", 1)], "has_more": True, "next_cursor": "cur-2"}
                return {"results": [page("p31", 31)], "has_more": False, "next_cursor": None}
            return {"id": "x"}

        old_call, old_sleep = rv.call, rc.time.sleep
        rv.call, rc.time.sleep = paged, (lambda s: None)
        try:
            stat = rc.sync_cards(copy.deepcopy(SEED))
        finally:
            rv.call, rc.time.sleep = old_call, old_sleep
        self.assertEqual((stat["same"], stat["new"]), (2, 1))
        q_calls = [c for c in calls if "/query" in c[1]]
        self.assertEqual(len(q_calls), 2)
        self.assertNotIn("start_cursor", q_calls[0][2])
        self.assertEqual(q_calls[1][2]["start_cursor"], "cur-2")

    def test_apply_creates_with_card_number_and_initial_use(self):
        stat, fake = self.run_sync([page("p1", 1)], apply=True)
        self.assertEqual((stat["created"], stat["same"]), (2, 1))
        made = {w[2]["properties"]["카드번호"]["number"]: w[2]["properties"] for w in fake.writes()}
        self.assertEqual(set(made), {31, 35})
        self.assertEqual(made[31][rc.USE], {"checkbox": True})
        self.assertEqual(made[35][rc.USE], {"checkbox": False})  # 선생님 카드에 아직 없는 문장은 끈 채로
        self.assertEqual(made[31]["읽기"]["rich_text"][0]["text"]["content"], "Where is the?")
        self.assertEqual(made[35]["구간"], {"number": 4})
        self.assertEqual(made[35]["순번"], {"number": 35})  # order를 비우면 카드번호
        self.assertEqual(made[35][rc.TITLE]["title"][0]["text"]["content"], "Where is the restaurant?")

    def test_apply_does_not_touch_changed_rows(self):
        rows = [page("p1", 1, 뜻={"rich_text": [{"plain_text": "은행(부모 수정)"}]})]
        stat, fake = self.run_sync(rows, apply=True)
        self.assertEqual(stat["changed"], 1)
        self.assertFalse([w for w in fake.writes() if w[0] == "PATCH"])

    def test_update_overwrites_text_but_never_use(self):
        rows = [page("p1", 1, use=False, 뜻={"rich_text": [{"plain_text": "옛 뜻"}]}),
                page("p31", 31), page("p35", 35, use=True)]
        stat, fake = self.run_sync(rows, update=True)
        patches = [w for w in fake.writes() if w[0] == "PATCH"]
        self.assertEqual(stat["updated"], 1)
        self.assertEqual(patches[0][1], "/v1/pages/p1")
        self.assertEqual(set(patches[0][2]["properties"]), {"뜻"})
        for w in fake.writes():
            self.assertNotIn(rc.USE, (w[2] or {}).get("properties", {}))

    def test_set_use_only_named_cards(self):
        rows = [page("p1", 1), page("p31", 31), page("p35", 35, use=False)]
        stat, fake = self.run_sync(rows, set_use=True, cards={31, 35, 99})
        writes = fake.writes()
        self.assertEqual(stat["use_set"], 1)  # 31은 이미 켜짐, 99는 노션에 없음
        self.assertEqual(writes, [("PATCH", "/v1/pages/p35", {"properties": {rc.USE: {"checkbox": True}}})])

    def test_notion_only_rows_are_reported_not_deleted(self):
        extra = page("p9", 1, 카드번호={"number": 9})
        stat, fake = self.run_sync([page("p1", 1), page("p31", 31), page("p35", 35, use=False), extra])
        self.assertEqual(stat["notion_only"], 1)
        self.assertFalse(any(c[0] == "DELETE" for c in fake.calls))

    def test_duplicate_rows_counted(self):
        stat, _ = self.run_sync([page("p1", 1), page("p1b", 1)])
        self.assertEqual(stat["dup"], 1)

    def test_no_number_rows_counted_and_warned(self):
        blank = page("p0", 1, 카드번호={"number": None})
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            stat, _ = self.run_sync([blank, page("p1", 1)])
        self.assertEqual(stat["no_number"], 1)
        self.assertIn("카드번호가 빈 노션 행 1개", buf.getvalue())

    def test_missing_schema_column_stops(self):
        schema = {n: {"type": t} for n, t in rc.PROP_TYPES.items() if n != "카드번호"}
        with self.assertRaises(ValueError):
            self.run_sync([], schema=schema, schema_check=True)

    def test_wrong_schema_column_type_stops(self):
        schema = {n: {"type": t} for n, t in rc.PROP_TYPES.items()}
        schema["학년"] = {"type": "multi_select"}
        with self.assertRaises(ValueError) as cm:
            self.run_sync([], schema=schema, schema_check=True)
        self.assertIn("학년=multi_select", str(cm.exception))

    def test_new_option_400_means_no_rows(self):
        def boom(path, payload=None, method="POST"):
            if "/query" in path:
                raise RuntimeError("POST … → HTTP 400: Select option not found for property 학년")
            return {"id": "x"}
        old_call, old_sleep = rv.call, rc.time.sleep
        rv.call, rc.time.sleep = boom, (lambda s: None)
        try:
            stat = rc.sync_cards(copy.deepcopy(SEED))
        finally:
            rv.call, rc.time.sleep = old_call, old_sleep
        self.assertEqual(stat["new"], 3)

    def test_other_400_raises_runtime_error(self):
        def boom(path, payload=None, method="POST"):
            if "/query" in path:
                raise RuntimeError("POST … → HTTP 400: validation_error")
            return {"id": "x"}
        old_call, old_sleep = rv.call, rc.time.sleep
        rv.call, rc.time.sleep = boom, (lambda s: None)
        try:
            with self.assertRaises(RuntimeError):
                rc.sync_cards(copy.deepcopy(SEED))
        finally:
            rv.call, rv.time.sleep = old_call, old_sleep

    def test_main_rejects_set_use_with_apply(self):
        with tempfile.TemporaryDirectory() as tmp:
            seed_path = Path(tmp) / "seed.json"
            seed_path.write_text(json.dumps(SEED, ensure_ascii=False), encoding="utf-8")
            fake = FakeNotion([])
            old_call, old_sleep, old_argv = rv.call, rc.time.sleep, sys.argv
            rv.call, rc.time.sleep = fake, (lambda s: None)
            sys.argv = ["register_classcard.py", "--file", str(seed_path), "--set-use", "on", "--cards", "1", "--apply"]
            try:
                code = rc.main()
            finally:
                rv.call, rc.time.sleep, sys.argv = old_call, old_sleep, old_argv
        self.assertEqual(code, 1)
        self.assertEqual(fake.writes(), [])


class ValidateTest(unittest.TestCase):
    def bad(self, **change):
        seed = copy.deepcopy(SEED)
        seed["cards"][0].update(change)
        with self.assertRaises(ValueError):
            rc.validate_seed(seed)

    def test_rejects_bad_cards(self):
        self.bad(no=0)
        self.bad(no="1")
        self.bad(section=None)
        self.bad(ko=" ")
        self.bad(no=31)  # 카드번호 중복
        self.bad(en="go straight {2} blocks")  # 기호가 있는데 읽기 없음
        self.bad(en="a/b", say="a/b")  # 읽기에도 기호

    def test_rejects_say_with_symbols_when_en_has_none(self):
        self.bad(en="bank", say="bank/s")

    def test_rejects_bad_grade_and_unit(self):
        for field, val in [("grade", ""), ("grade", "  "), ("grade", 5), ("unit", ""), ("unit", None)]:
            seed = copy.deepcopy(SEED)
            seed[field] = val
            with self.assertRaises(ValueError):
                rc.validate_seed(seed)

    def test_validates_student(self):
        for ok in ("민수", ["민수", "민서"]):
            seed = copy.deepcopy(SEED)
            seed["student"] = ok
            rc.validate_seed(seed)
        for nope in ("아이3", ["민수", "민수"], ["민수", "없는학생"], 123):
            seed = copy.deepcopy(SEED)
            seed["student"] = nope
            with self.assertRaises(ValueError):
                rc.validate_seed(seed)

    def test_rejects_non_bool_use(self):
        for val in ("off", "false", None, 1):
            seed = copy.deepcopy(SEED)
            seed["use"] = val
            with self.assertRaises(ValueError):
                rc.validate_seed(seed)
            self.bad(use=val)

    def test_parse_cards(self):
        self.assertEqual(rc.parse_cards("35-37, 40"), {35, 36, 37, 40})
        with self.assertRaises(ValueError):
            rc.parse_cards("5-3")

    def test_parse_cards_rejects_malformed_tokens(self):
        for token in ("35-", "-3", "a", "1-2-3"):
            with self.assertRaises(ValueError):
                rc.parse_cards(token)

    def test_real_seed_file(self):
        """자료 L11: 기존 34장 번호·글자 그대로 + 4구간 새 문장 10장은 사용 끔"""
        seed = json.loads((SCRIPTS / "data/classcard/english_5-2_L11.json").read_text(encoding="utf-8"))
        rc.validate_seed(seed)
        cards = {c["no"]: c for c in seed["cards"]}
        self.assertEqual(sorted(cards), list(range(1, 45)))
        count = lambda s: sum(1 for c in cards.values() if c["section"] == s)  # noqa: E731
        self.assertEqual([count(s) for s in (1, 2, 3, 4)], [10, 10, 14, 10])
        # 선생님 카드 뜻을 고치지 않는다 (2026-11-22 사용자 지시)
        self.assertEqual(cards[18]["ko"], "성실히 살다, 갱생하다")
        self.assertEqual(cards[19]["ko"], "왼편을 향하다")
        self.assertEqual(cards[32]["say"], "go straight two blocks")
        self.assertTrue(all(rc.initial_use(seed, cards[n]) for n in range(1, 35)))
        self.assertFalse(any(rc.initial_use(seed, cards[n]) for n in range(35, 45)))
        self.assertEqual(cards[42]["en"], "Go straight two blocks and turn right.")


if __name__ == "__main__":
    unittest.main()
