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

const W = load(['kids/subjects/math/js/decimal_multiplication-core.js', 'kids/subjects/math/js/decimal_add-core.js']);
const D = W.DecimalAddCore;
const DC = W.DecimalCore;

const digits = (n, len) => String(n).padStart(len, '0').split('').map(Number);
const intPart = (d) => Math.floor(d.int / 10 ** d.places);
const decDigit = (d, p) => (p <= d.places ? Math.floor(d.int / 10 ** (d.places - p)) % 10 : 0);
const probKey = (p) => JSON.stringify([p.kind, p.a, p.b, p.place ?? null, p.k ?? null]);

test('randInt는 양 끝을 포함해 정수 난수를 만든다', () => {
  const rng = seeded(1);
  const seen = new Set();
  for (let i = 0; i < 200; i++) {
    const v = D.randInt(3, 7, rng);
    assert.ok(Number.isInteger(v) && v >= 3 && v <= 7);
    seen.add(v);
  }
  assert.equal(seen.size, 5);
  assert.equal(D.randInt(4, 4, rng), 4);
});

test('add와 sub는 큰 자리 수에 맞춰 계산하고 끝자리 0을 유지한다', () => {
  assert.deepEqual(plain(D.add(DC.dec(25, 2), DC.dec(35, 2))), { int: 60, places: 2 });
  assert.deepEqual(plain(D.add(DC.dec(15, 1), DC.dec(34, 2))), { int: 184, places: 2 });
  assert.deepEqual(plain(D.add(DC.dec(2, 0), DC.dec(35, 2))), { int: 235, places: 2 });
  assert.deepEqual(plain(D.sub(DC.dec(23, 1), DC.dec(17, 1))), { int: 6, places: 1 });
  assert.deepEqual(plain(D.sub(DC.dec(2, 0), DC.dec(35, 2))), { int: 165, places: 2 });
  assert.deepEqual(plain(D.sub(DC.dec(15, 1), DC.dec(150, 2))), { int: 0, places: 2 });
  assert.throws(() => D.sub(DC.dec(1, 1), DC.dec(2, 1)));
});

test('align은 두 소수의 자리 수와 채운 자리 수를 돌려준다', () => {
  assert.deepEqual(plain(D.align(DC.dec(2, 0), DC.dec(35, 2))), {
    a: { int: 200, places: 2 },
    b: { int: 35, places: 2 },
    places: 2,
    padA: 2,
    padB: 0,
  });
  assert.deepEqual(plain(D.align(DC.dec(125, 2), DC.dec(4, 1))), {
    a: { int: 125, places: 2 },
    b: { int: 40, places: 2 },
    places: 2,
    padA: 0,
    padB: 1,
  });
});

test('readAloud는 formatRaw 기준으로 소수를 읽는다', () => {
  assert.equal(D.readAloud(DC.dec(37, 2)), '영 점 삼칠');
  assert.equal(D.readAloud(DC.dec(105, 2)), '일 점 영오');
  assert.equal(D.readAloud(DC.dec(1234, 2)), '십이 점 삼사');
  assert.equal(D.readAloud(DC.dec(245, 3)), '영 점 이사오');
  assert.equal(D.readAloud(DC.dec(70, 2)), '영 점 칠영');
  assert.equal(D.readAloud(DC.dec(3, 0)), '삼');
  assert.equal(D.readAloud(DC.dec(0, 0)), '영');
  assert.equal(D.readAloud(DC.dec(10, 0)), '십');
  assert.equal(D.readAloud(DC.dec(20, 0)), '이십');
  assert.equal(D.readAloud(DC.dec(105, 0)), '백오');
  assert.equal(D.readAloud(DC.dec(9999, 0)), '구천구백구십구');
});

test('digitValue는 각 자리 숫자의 값을 소수로 돌려준다', () => {
  const n = DC.dec(2345, 3);
  assert.deepEqual(plain(D.digitValue(n, 0)), { int: 2, places: 0 });
  assert.deepEqual(plain(D.digitValue(n, 1)), { int: 3, places: 1 });
  assert.deepEqual(plain(D.digitValue(n, 2)), { int: 4, places: 2 });
  assert.deepEqual(plain(D.digitValue(n, 3)), { int: 5, places: 3 });
  assert.deepEqual(plain(D.digitValue(DC.dec(23, 1), 3)), { int: 0, places: 3 });
});

test('shift는 10의 거듭제곱 배와 끝자리 0 정리를 처리한다', () => {
  assert.deepEqual(plain(D.shift(DC.dec(3, 1), 1)), { int: 3, places: 0 });
  assert.deepEqual(plain(D.shift(DC.dec(3, 0), -1)), { int: 3, places: 1 });
  assert.deepEqual(plain(D.shift(DC.dec(25, 2), 1)), { int: 25, places: 1 });
  assert.deepEqual(plain(D.shift(DC.dec(4, 0), -2)), { int: 4, places: 2 });
  assert.deepEqual(plain(D.shift(DC.dec(12, 1), 2)), { int: 120, places: 0 });
});

test('LAB_KINDS와 KIND_ORDER가 계약과 일치한다', () => {
  assert.deepEqual(plain(D.LAB_KINDS), {
    1: ['read-2', 'read-2-zero', 'read-2'],
    2: ['locate-3', 'digit-value', 'digit-value'],
    3: ['compare-longer-smaller', 'compare-longer-smaller', 'compare-longer-larger'],
    4: ['shift-up', 'shift-down-2', 'shift-chain'],
    5: ['add-1-nocarry', 'add-1-carry', 'sub-1-borrow'],
    6: ['add-mixed-places', 'sub-mixed-places', 'whole-minus-decimal'],
  });
  const expectedOrder = [];
  for (let lab = 1; lab <= 6; lab++) {
    for (const k of D.LAB_KINDS[lab]) if (!expectedOrder.includes(k)) expectedOrder.push(k);
  }
  assert.deepEqual(plain(D.KIND_ORDER), expectedOrder);
});

function checkProblem(kind, p) {
  assert.equal(p.kind, kind);
  assert.ok(intPart(p.a) >= 0 && intPart(p.a) <= 9);
  if (p.b) assert.ok(intPart(p.b) >= 0 && intPart(p.b) <= 9);

  if (kind === 'read-2') {
    assert.equal(p.op, null);
    assert.equal(p.b, null);
    assert.equal(p.a.places, 2);
    assert.ok(decDigit(p.a, 1) >= 1 && decDigit(p.a, 2) >= 1 && intPart(p.a) === 0);
    assert.equal(p.answer, D.readAloud(p.a));
  } else if (kind === 'read-2-zero') {
    assert.equal(p.op, null);
    assert.equal(p.b, null);
    assert.equal(p.a.places, 2);
    assert.ok(p.a.int >= 1 && p.a.int <= 9);
    assert.equal(p.answer, D.readAloud(p.a));
  } else if (kind === 'locate-3') {
    assert.equal(p.op, null);
    assert.equal(p.b, null);
    assert.equal(p.a.places, 3);
    assert.ok(intPart(p.a) === 0 && digits(p.a.int, 3).every((d) => d >= 1));
    assert.deepEqual(plain(p.answer), plain(p.a));
  } else if (kind === 'digit-value') {
    assert.equal(p.op, null);
    assert.equal(p.b, null);
    assert.equal(p.a.places, 3);
    const ds = digits(p.a.int, 4);
    assert.ok(ds.every((d) => d >= 1) && new Set(ds).size === 4);
    assert.ok([1, 2, 3].includes(p.place));
    assert.deepEqual(plain(p.answer), plain(D.digitValue(p.a, p.place)));
  } else if (kind === 'compare-longer-smaller' || kind === 'compare-longer-larger') {
    assert.equal(p.op, 'compare');
    const [one, two] = p.a.places === 1 ? [p.a, p.b] : [p.b, p.a];
    assert.equal(one.places, 1);
    assert.equal(two.places, 2);
    assert.ok(decDigit(two, 2) >= 1);
    assert.equal(intPart(one), intPart(two));
    assert.ok(intPart(one) >= 0 && intPart(one) <= 3);
    assert.notEqual(decDigit(one, 1), decDigit(two, 1));
    assert.equal(DC.compare(two, one), kind === 'compare-longer-smaller' ? -1 : 1);
    assert.equal(p.answer, DC.compare(p.a, p.b) > 0 ? '>' : '<');
  } else if (kind === 'shift-up') {
    assert.equal(p.op, 'shift');
    assert.equal(p.b, null);
    assert.equal(p.k, 1);
    assert.ok(p.a.places >= 1 && p.a.places <= 3 && p.a.int > 0);
    assert.deepEqual(plain(p.answer), plain(D.shift(p.a, 1)));
  } else if (kind === 'shift-down-2') {
    assert.equal(p.op, 'shift');
    assert.equal(p.b, null);
    assert.equal(p.k, -2);
    assert.ok(p.a.places >= 0 && p.a.places <= 1 && p.a.int > 0);
    assert.deepEqual(plain(p.answer), plain(D.shift(p.a, -2)));
  } else if (kind === 'shift-chain') {
    assert.equal(p.op, 'shift');
    assert.equal(p.b, null);
    assert.ok(p.a.places === 0 && p.a.int >= 1 && p.a.int <= 9);
    assert.deepEqual(plain(p.answer), plain([p.a, D.shift(p.a, -1), D.shift(p.a, -2), D.shift(p.a, -3)]));
  } else {
    assert.ok(p.op === '+' || p.op === '-');
    const expected = p.op === '+' ? D.add(p.a, p.b) : D.sub(p.a, p.b);
    assert.deepEqual(plain(p.answer), plain(expected));
    assert.ok(DC.compare(p.answer, DC.dec(0, 0)) > 0);
    assert.equal(DC.format(p.answer), DC.formatRaw(p.answer));
    if (kind === 'add-1-nocarry') {
      assert.ok(p.a.places === 1 && p.b.places === 1);
      assert.ok(decDigit(p.a, 1) >= 1 && decDigit(p.b, 1) >= 1 && decDigit(p.a, 1) + decDigit(p.b, 1) < 10);
    } else if (kind === 'add-1-carry') {
      assert.ok(p.a.places === 1 && p.b.places === 1);
      assert.ok(decDigit(p.a, 1) >= 1 && decDigit(p.b, 1) >= 1 && decDigit(p.a, 1) + decDigit(p.b, 1) > 10);
    } else if (kind === 'sub-1-borrow') {
      assert.ok(p.a.places === 1 && p.b.places === 1 && intPart(p.a) >= 1);
      assert.ok(decDigit(p.a, 1) >= 1 && decDigit(p.b, 1) >= 1 && decDigit(p.a, 1) < decDigit(p.b, 1));
    } else if (kind === 'add-mixed-places') {
      const [one, two] = p.a.places === 1 ? [p.a, p.b] : [p.b, p.a];
      assert.ok(one.places === 1 && two.places === 2 && decDigit(one, 1) >= 1 && decDigit(two, 2) >= 1);
    } else if (kind === 'sub-mixed-places') {
      assert.ok(p.a.places === 1 && p.b.places === 2 && decDigit(p.a, 1) >= 1 && decDigit(p.b, 2) >= 1);
    } else if (kind === 'whole-minus-decimal') {
      assert.ok(p.a.places === 0 && p.a.int >= 1 && p.b.places === 2 && decDigit(p.b, 2) >= 1);
    }
  }
}

function checkWrongChoices(p) {
  const choices = D.wrongChoices(p);
  if (p.kind === 'shift-chain') {
    assert.deepEqual(plain(choices), []);
    return;
  }
  assert.equal(choices.length, 2);
  const ansText = p.kind.startsWith('read-') || p.op === 'compare' ? p.answer : DC.format(p.answer);
  assert.notEqual(choices[0].text, choices[1].text);
  for (const c of choices) {
    assert.ok(typeof c.mistake === 'string' && c.mistake.length > 0);
    assert.notEqual(c.text, ansText);
    if (p.kind.startsWith('read-') || p.op === 'compare') {
      assert.equal(c.value, c.text);
    } else {
      assert.ok(DC.compare(c.value, DC.dec(0, 0)) > 0);
      assert.equal(c.text, DC.format(c.value));
    }
  }
}

test('모든 kind를 seed 300개로 생성하고 조건과 오답 보기를 검사한다', () => {
  for (const kind of D.KIND_ORDER) {
    for (let s = 1; s <= 300; s++) {
      const p = D.makeProblem(kind, seeded(s));
      checkProblem(kind, p);
      checkWrongChoices(p);
    }
  }
});

test('wrongChoices는 계약에 적힌 오답 예시를 만든다', () => {
  const byMistake = (p) => Object.fromEntries(D.wrongChoices(p).map((c) => [c.mistake, c.text]));
  assert.deepEqual(byMistake({ kind: 'read-2', op: null, a: DC.dec(37, 2), b: null, answer: '영 점 삼칠' }), {
    'read-as-whole': '영 점 삼십칠',
    'drop-point': '삼십칠',
  });
  assert.deepEqual(byMistake({ kind: 'read-2-zero', op: null, a: DC.dec(5, 2), b: null, answer: '영 점 영오' }), {
    'drop-zero': '영 점 오',
    'drop-point': '오',
  });
  assert.equal(
    byMistake({ kind: 'add-1-carry', op: '+', a: DC.dec(6, 1), b: DC.dec(8, 1), answer: DC.dec(14, 1) })['carry-as-place'],
    '0.14',
  );
  assert.equal(
    byMistake({ kind: 'sub-1-borrow', op: '-', a: DC.dec(23, 1), b: DC.dec(17, 1), answer: DC.dec(6, 1) })['reverse-subtract'],
    '1.4',
  );
  assert.equal(
    byMistake({ kind: 'add-mixed-places', op: '+', a: DC.dec(15, 1), b: DC.dec(34, 2), answer: DC.dec(184, 2) })['right-align'],
    '0.49',
  );
  assert.equal(
    byMistake({ kind: 'sub-mixed-places', op: '-', a: DC.dec(15, 1), b: DC.dec(34, 2), answer: DC.dec(116, 2) })['no-pad'],
    '1.24',
  );
  assert.deepEqual(
    byMistake({ kind: 'whole-minus-decimal', op: '-', a: DC.dec(2, 0), b: DC.dec(35, 2), answer: DC.dec(165, 2) }),
    { 'ignore-point-add': '2.35', 'ignore-point': '0.33' },
  );
});

test('makeRound는 관별 순서대로 중복 없는 3문제를 만든다', () => {
  for (let lab = 1; lab <= 6; lab++) {
    for (let s = 1; s <= 20; s++) {
      const round = D.makeRound(lab, seeded(s));
      assert.deepEqual(plain(round.map((p) => p.kind)), plain(D.LAB_KINDS[lab]));
      assert.equal(new Set(round.map(probKey)).size, 3);
    }
  }
});

test('makeMixedRound는 shift-chain 없이 정렬되고 중복 없이 낸다', () => {
  for (let s = 1; s <= 20; s++) {
    const round = D.makeMixedRound(seeded(s));
    assert.equal(round.length, 10);
    assert.equal(new Set(round.map(probKey)).size, 10);
    const counts = {};
    let prevIdx = -1;
    for (const p of round) {
      assert.notEqual(p.kind, 'shift-chain');
      counts[p.kind] = (counts[p.kind] || 0) + 1;
      assert.ok(counts[p.kind] <= 3);
      const idx = D.KIND_ORDER.indexOf(p.kind);
      assert.ok(idx >= prevIdx);
      prevIdx = idx;
    }
  }
  assert.equal(D.makeMixedRound(seeded(99), 6).length, 6);
});

test('오답 보기에는 끝자리 0이 붙은 소수가 없고, 비교 오개념 이름은 문제 종류에 맞는다', () => {
  for (const kind of D.KIND_ORDER) {
    for (let s = 1; s <= 300; s++) {
      const p = D.makeProblem(kind, seeded(s));
      for (const c of D.wrongChoices(p)) {
        if (c.value && typeof c.value === 'object') assert.equal(DC.formatRaw(c.value), DC.format(c.value));
        if (kind === 'compare-longer-smaller') assert.notEqual(c.mistake, 'shorter-is-larger');
        if (kind === 'compare-longer-larger') assert.notEqual(c.mistake, 'longer-is-larger');
      }
    }
  }
  const w = D.wrongChoices({ kind: 'add-mixed-places', op: '+', a: DC.dec(412, 2), b: DC.dec(88, 1), answer: DC.dec(1292, 2) });
  assert.equal(w.length, 2);
  assert.ok(w.every((c) => c.text !== '5'));
});
