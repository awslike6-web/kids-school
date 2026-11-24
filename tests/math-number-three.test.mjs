import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { read } from './split-rules.mjs';

function load(files) {
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  for (const f of files) vm.runInContext(read(f), sandbox, { filename: f });
  return sandbox.window;
}

function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const plain = (x) => JSON.parse(JSON.stringify(x));
const T = load(['kids/subjects/math/js/number_three-core.js']).ThreeDigitCore;

test('randInt: 양 끝 포함 정수 및 단일 값 경계', () => {
  const rng = seeded(1);
  const seen = new Set();
  for (let i = 0; i < 200; i++) {
    const v = T.randInt(3, 7, rng);
    assert.ok(Number.isInteger(v) && v >= 3 && v <= 7);
    seen.add(v);
  }
  assert.deepEqual([...seen].sort((a, b) => a - b), [3, 4, 5, 6, 7]);
  assert.equal(T.randInt(5, 5, rng), 5);
});

test('readKo: 1~1000 한자어 읽기 계약 예시', () => {
  const cases = [
    [352, '삼백오십이'], [305, '삼백오'], [410, '사백십'], [110, '백십'],
    [111, '백십일'], [100, '백'], [213, '이백십삼'], [52, '오십이'],
    [7, '칠'], [10, '십'], [1000, '천'],
  ];
  for (const [n, expected] of cases) assert.equal(T.readKo(n), expected);
});

test('readKoWrong: 오독 유형별 결과 및 해당 없으면 null', () => {
  assert.equal(T.readKoWrong(110, 'read-one-prefix'), '일백일십');
  assert.equal(T.readKoWrong(213, 'read-one-prefix'), '이백일십삼');
  assert.equal(T.readKoWrong(305, 'read-one-prefix'), null);
  assert.equal(T.readKoWrong(305, 'read-zero'), '삼백영오');
  assert.equal(T.readKoWrong(410, 'read-zero'), '사백십영');
  assert.equal(T.readKoWrong(352, 'read-zero'), null);
  assert.equal(T.readKoWrong(305, 'read-as-tens'), '삼십오');
  assert.equal(T.readKoWrong(410, 'read-as-tens'), '사십일');
  assert.equal(T.readKoWrong(352, 'read-as-tens'), null);
});

test('digits와 placeValue: 자릿수 분해와 자릿값', () => {
  assert.deepEqual(plain(T.digits(352)), { h: 3, t: 5, o: 2 });
  assert.deepEqual(plain(T.digits(305)), { h: 3, t: 0, o: 5 });
  assert.equal(T.placeValue(352, 'h'), 300);
  assert.equal(T.placeValue(352, 't'), 50);
  assert.equal(T.placeValue(352, 'o'), 2);
  assert.equal(T.placeValue(305, 't'), 0);
});

test('상수 목록: LAB_KINDS, KIND_ORDER, MIXED_KINDS, BINGO_KINDS', () => {
  assert.deepEqual(plain(T.LAB_KINDS), {
    1: ['ten-tens', 'ninety-nine-plus-one', 'hundred-is-tens'],
    2: ['hundreds', 'hundreds', 'hundreds'],
    3: ['listen-build', 'listen-write', 'see-read'],
    4: ['place-h', 'place-t', 'place-o'],
    5: ['jump-100', 'jump-10-or-1', 'compare'],
  });
  assert.deepEqual(plain(T.KIND_ORDER), [
    'ten-tens', 'ninety-nine-plus-one', 'hundred-is-tens', 'hundreds',
    'listen-build', 'listen-write', 'see-read', 'place-h', 'place-t', 'place-o',
    'jump-100', 'jump-10-or-1', 'compare',
  ]);
  assert.deepEqual(plain(T.MIXED_KINDS), [
    'hundreds', 'listen-write', 'see-read', 'place-h', 'place-t', 'place-o',
    'jump-100', 'jump-10-or-1', 'compare',
  ]);
  assert.deepEqual(plain(T.BINGO_KINDS), [
    'hundreds', 'place-h', 'place-t', 'place-o', 'jump-100', 'jump-10-or-1',
  ]);
});

test('makeProblem: 전 kind 300시드 계약 조건 검사', () => {
  for (const kind of T.KIND_ORDER) {
    let seenAltA = 0;
    let seenAltB = 0;
    for (let s = 1; s <= 300; s++) {
      const p = T.makeProblem(kind, seeded(s));
      assert.equal(p.kind, kind);
      assert.equal(typeof p.answerText, 'string');
      if (kind === 'ten-tens') {
        assert.deepEqual([p.start, p.answer, p.answerText], [7, 100, '100']);
      } else if (kind === 'ninety-nine-plus-one') {
        assert.deepEqual([p.n, p.answer, p.answerText], [99, 100, '100']);
      } else if (kind === 'hundred-is-tens') {
        assert.deepEqual([p.answer, p.answerText], [10, '10개']);
      } else if (kind === 'hundreds') {
        assert.ok(Number.isInteger(p.h) && p.h >= 2 && p.h <= 5);
        assert.equal(p.n, p.h * 100);
        assert.equal(p.answer, p.n);
        assert.equal(p.answerText, String(p.n));
        assert.equal(p.reading, T.readKo(p.n));
      } else if (kind === 'listen-build') {
        const d = T.digits(p.n);
        assert.ok(d.h >= 1 && d.h <= 4 && d.t >= 1 && d.t <= 4 && d.o >= 1 && d.o <= 4);
        assert.equal(p.answer, p.n);
        assert.equal(p.answerText, String(p.n));
        assert.equal(p.reading, T.readKo(p.n));
      } else if (kind === 'listen-write') {
        const d = T.digits(p.n);
        assert.ok(d.h >= 1 && d.h <= 9 && d.t === 0 && d.o >= 1 && d.o <= 9);
        assert.equal(p.answer, p.n);
        assert.equal(p.answerText, String(p.n));
        assert.equal(p.reading, T.readKo(p.n));
      } else if (kind === 'see-read') {
        const d = T.digits(p.n);
        assert.ok(p.n >= 100 && p.n <= 999);
        const typeA = d.o === 0 && d.t >= 1;
        const typeB = d.h === 1 || d.t === 1;
        assert.ok(typeA || typeB);
        if (typeA) seenAltA++;
        if (typeB) seenAltB++;
        assert.equal(p.answer, T.readKo(p.n));
        assert.equal(p.answerText, p.answer);
      } else if (kind.startsWith('place-')) {
        const d = T.digits(p.n);
        const place = kind.slice(6);
        assert.ok(p.n >= 100 && p.n <= 999 && d.h > 0 && d.t > 0 && d.o > 0);
        assert.ok(d.h !== d.t && d.t !== d.o && d.h !== d.o);
        assert.equal(p.place, place);
        assert.equal(p.digit, d[place]);
        assert.equal(p.answer, T.placeValue(p.n, place));
        assert.equal(p.answerText, String(p.answer));
      } else if (kind === 'jump-100') {
        assert.ok(Number.isInteger(p.start) && p.start >= 100 && p.start <= 899);
        assert.equal(p.step, 100);
        assert.equal(p.answer, p.start + 100);
        assert.equal(p.answerText, String(p.answer));
      } else if (kind === 'jump-10-or-1') {
        const d = T.digits(p.start);
        assert.ok(p.step === 10 || p.step === 1);
        assert.ok(p.start >= 100 && p.answer === p.start + p.step && p.answer <= 999);
        assert.equal(p.answerText, String(p.answer));
        if ((p.step === 10 && d.t === 9) || (p.step === 1 && d.o === 9)) seenAltA++;
        else seenAltB++;
      } else if (kind === 'compare') {
        assert.ok(p.a >= 100 && p.a <= 999 && p.b >= 100 && p.b <= 999 && p.a !== p.b);
        assert.equal(p.answer, p.a > p.b ? '>' : '<');
        assert.equal(p.answerText, p.answer);
        if (T.digits(p.a).h === T.digits(p.b).h) seenAltA++;
      }
    }
    if (kind === 'see-read' || kind === 'jump-10-or-1') assert.ok(seenAltA > 0 && seenAltB > 0);
    if (kind === 'compare') assert.ok(seenAltA > 0);
  }
});

test('makeProblem: 극단 rng에서도 무한 루프 없이 유효 문제 반환', () => {
  for (const rng of [() => 0, () => 0.999999]) {
    for (const kind of T.KIND_ORDER) {
      const p = T.makeProblem(kind, rng);
      assert.equal(p.kind, kind);
      assert.ok(typeof p.answerText === 'string' && p.answerText.length > 0);
    }
  }
});

test('wrongChoices: 전 kind 300시드 오답 보기 규칙 및 중복 금지', () => {
  for (const kind of T.KIND_ORDER) {
    for (let s = 1; s <= 300; s++) {
      const p = T.makeProblem(kind, seeded(s));
      const w = T.wrongChoices(p);
      assert.equal(w.length, 2);
      assert.notEqual(w[0].text, w[1].text);
      assert.notEqual(w[0].text, p.answerText);
      assert.notEqual(w[1].text, p.answerText);
      for (const c of w) {
        assert.equal(typeof c.text, 'string');
        assert.equal(typeof c.mistake, 'string');
        if (typeof c.value === 'number') assert.ok(c.value >= 1);
      }
      const texts = w.map((c) => c.text);
      const mistakes = w.map((c) => c.mistake);
      if (kind === 'ten-tens') assert.deepEqual([...texts].sort(), ['10', '1000']);
      else if (kind === 'ninety-nine-plus-one') assert.deepEqual([...texts].sort(), ['1000', '910']);
      else if (kind === 'hundred-is-tens') assert.deepEqual([...texts].sort(), ['100개', '1개']);
      else if (kind === 'hundreds') {
        assert.ok(texts.includes(String(p.h * 10)) && texts.includes(String(p.h * 1000)));
      } else if (kind === 'listen-build') {
        const d = T.digits(p.n);
        assert.ok(texts.includes(`${d.h * 100}${d.t * 10}${d.o}`));
      } else if (kind === 'listen-write') {
        const d = T.digits(p.n);
        assert.ok(texts.includes(`${d.h * 100}${d.o}`) && texts.includes(String(d.h * 10 + d.o)));
      } else if (kind === 'place-o') {
        // 일의 자리: 숫자 그대로가 정답이므로 오답은 십·백 자리 값 (Claude 보정, 계약 빈틈)
        assert.deepEqual([...texts].sort(), [String(p.digit * 10), String(p.digit * 100)].sort());
      } else if (kind.startsWith('place-')) {
        assert.ok(texts.includes(String(p.digit)) && mistakes.includes('place-ignore'));
      } else if (kind === 'jump-100') {
        assert.ok(texts.includes(String(p.start + 10)));
        if (p.start >= 200) assert.ok(texts.includes(String(p.start - 100)));
      } else if (kind === 'jump-10-or-1') {
        const d = T.digits(p.start);
        const cross = (p.step === 10 && d.t === 9) || (p.step === 1 && d.o === 9);
        if (cross) {
          assert.ok(mistakes.includes('jump-boundary'));
          assert.ok(texts.includes(p.step === 10 ? `${d.h}10${d.o}` : `${d.h}${d.t}10`));
        } else {
          assert.ok(mistakes.includes('wrong-step'));
        }
      } else if (kind === 'compare') {
        const opp = p.answer === '>' ? '<' : '>';
        assert.ok(texts.includes(opp) && texts.includes('='));
        const da = T.digits(p.a).o;
        const db = T.digits(p.b).o;
        if ((p.a > p.b && da < db) || (p.a < p.b && da > db)) {
          assert.ok(mistakes.includes('compare-ones-first'));
        }
      }
    }
  }
});

test('wrongReadings: 틀린 읽기 2개 생성 및 정답·상호 중복 금지', () => {
  for (const n of [100, 110, 111, 213, 300, 305, 352, 410, 999]) {
    const r = T.wrongReadings(n);
    assert.equal(r.length, 2);
    assert.notEqual(r[0].text, r[1].text);
    assert.notEqual(r[0].text, T.readKo(n));
    assert.notEqual(r[1].text, T.readKo(n));
    for (const item of r) {
      assert.ok(typeof item.text === 'string' && item.text.length > 0);
      assert.equal(typeof item.mistake, 'string');
    }
  }
  assert.ok(T.wrongReadings(300).some((x) => x.text === '삼십'));
});

test('makeRound: 1~5관 3문제 순서와 판 내 중복 없음', () => {
  const key = (p) => `${p.kind}:${p.n ?? p.start ?? `${p.a}-${p.b}`}`;
  for (let lab = 1; lab <= 5; lab++) {
    for (let s = 1; s <= 30; s++) {
      const round = T.makeRound(lab, seeded(s));
      assert.deepEqual(plain(round.map((p) => p.kind)), plain(T.LAB_KINDS[lab]));
      assert.equal(new Set(round.map(key)).size, 3);
    }
  }
});

test('makeMixedRound: 개수, 종류 2회 제한, KIND_ORDER 정렬, 중복 금지', () => {
  const order = new Map(T.KIND_ORDER.map((k, i) => [k, i]));
  const key = (p) => `${p.kind}:${p.n ?? p.start ?? `${p.a}-${p.b}`}`;
  for (let s = 1; s <= 50; s++) {
    const round = T.makeMixedRound(seeded(s));
    assert.equal(round.length, 6);
    assert.equal(new Set(round.map(key)).size, 6);
    const counts = new Map();
    for (let i = 0; i < round.length; i++) {
      const k = round[i].kind;
      assert.ok(T.MIXED_KINDS.includes(k));
      counts.set(k, (counts.get(k) || 0) + 1);
      assert.ok(counts.get(k) <= 2);
      if (i > 0) assert.ok(order.get(round[i - 1].kind) <= order.get(k));
    }
  }
  assert.equal(T.makeMixedRound(seeded(1), 4).length, 4);
});

test('makeBingo: 9칸 정답 중복 없음 및 bingoCall 문구', () => {
  for (let s = 1; s <= 40; s++) {
    const board = T.makeBingo(seeded(s));
    assert.equal(board.length, 9);
    assert.equal(new Set(board.map((p) => p.answerText)).size, 9);
    for (const p of board) {
      assert.ok(T.BINGO_KINDS.includes(p.kind));
      assert.ok(typeof p.call === 'string' && p.call.length > 0);
    }
  }
});

test('스무고개: makeSecret, chipList, chipText, chipAnswer, candidates', () => {
  for (let s = 1; s <= 100; s++) {
    const sec = T.makeSecret(seeded(s));
    assert.ok(Number.isInteger(sec) && sec >= 100 && sec <= 999);
  }
  const chips = T.chipList();
  assert.equal(chips.length, 38 + 8 + 9 + 9, '정확한 숫자 38개 + 자리 숫자 크기 26개');
  assert.equal(T.chipText('tg:5'), '십의 자리가 5보다 커요?');
  assert.equal(T.chipText('og:4'), '일의 자리가 4보다 커요?');
  assert.equal(T.chipText('hg:6'), '백의 자리가 6보다 커요?');
  assert.equal(T.chipAnswer(352, 'tg:4'), true);
  assert.equal(T.chipAnswer(352, 'tg:5'), false);
  assert.equal(T.chipAnswer(352, 'og:1'), true);
  assert.equal(T.chipAnswer(352, 'hg:3'), false);
  assert.equal(T.chipText('gt:300'), '300보다 커요?');
  assert.equal(T.chipText('h:3'), '백의 자리가 3이에요?');
  assert.equal(T.chipText('t:5'), '십의 자리가 5예요?');
  assert.equal(T.chipText('o:0'), '일의 자리가 0이에요?');
  assert.equal(T.chipText('even'), '짝수예요?');
  assert.equal(T.chipAnswer(352, 'gt:300'), true);
  assert.equal(T.chipAnswer(352, 'gt:400'), false);
  assert.equal(T.chipAnswer(352, 'h:3'), true);
  assert.equal(T.chipAnswer(352, 't:5'), true);
  assert.equal(T.chipAnswer(352, 'o:2'), true);
  assert.equal(T.chipAnswer(352, 'even'), true);
  assert.equal(T.chipAnswer(351, 'even'), false);
  const all = T.candidates([]);
  assert.equal(all.length, 900);
  assert.equal(all[0], 100);
  assert.equal(all[899], 999);
  assert.deepEqual(
    plain(T.candidates([{ id: 'h:3', answer: true }, { id: 't:5', answer: true }, { id: 'o:2', answer: true }])),
    [352],
  );
});

test('몇백 읽기 오답은 아이가 실제로 하는 자리 실수(삼십·삼천)이고 "영"을 붙인 읽기는 없다', () => {
  for (const n of [100, 200, 300, 500, 900]) {
    const texts = T.wrongReadings(n).map((w) => w.text);
    assert.equal(texts.length, 2);
    assert.ok(texts.every((t) => !t.includes('영')), `${n}: ${texts}`);
  }
  assert.deepEqual(plain(T.wrongReadings(300).map((w) => w.text)), ['삼십', '삼천']);
});
