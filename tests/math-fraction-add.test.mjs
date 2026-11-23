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

const F = load(['kids/subjects/math/js/fraction_add-core.js']).FractionCore;

const sameFrac = (x, y) =>
  (x === null && y === null) || (x !== null && y !== null && x.w === y.w && x.n === y.n && x.d === y.d);
const sameProblem = (p, q) => p.kind === q.kind && sameFrac(p.a, q.a) && sameFrac(p.b, q.b);

test('toImproper, toMixed, equals: 정규화와 비약분 동치 비교', () => {
  assert.deepEqual(plain(F.toImproper({ w: 2, n: 1, d: 5 })), { w: 0, n: 11, d: 5 });
  assert.deepEqual(plain(F.toMixed({ w: 0, n: 11, d: 5 })), { w: 2, n: 1, d: 5 });
  assert.deepEqual(plain(F.toMixed({ w: 1, n: 6, d: 4 })), { w: 2, n: 2, d: 4 });
  assert.deepEqual(plain(F.toMixed({ w: 0, n: 8, d: 4 })), { w: 2, n: 0, d: 4 });

  assert.equal(F.equals({ w: 1, n: 5, d: 4 }, { w: 2, n: 1, d: 4 }), true);
  assert.equal(F.equals({ w: 0, n: 8, d: 4 }, { w: 2, n: 0, d: 4 }), true);
  assert.equal(F.equals({ w: 0, n: 6, d: 8 }, { w: 0, n: 3, d: 4 }), false);
});

test('add, sub, needsCarry, needsBorrow, split: 연산과 받아올림·받아내림·쪼개기', () => {
  assert.deepEqual(plain(F.add({ w: 0, n: 3, d: 8 }, { w: 0, n: 3, d: 8 })), { w: 0, n: 6, d: 8 });
  assert.deepEqual(plain(F.add({ w: 1, n: 3, d: 4 }, { w: 2, n: 3, d: 4 })), { w: 4, n: 2, d: 4 });
  assert.deepEqual(plain(F.sub({ w: 2, n: 1, d: 4 }, { w: 0, n: 3, d: 4 })), { w: 1, n: 2, d: 4 });

  assert.throws(() => F.add({ w: 0, n: 1, d: 3 }, { w: 0, n: 1, d: 4 }));
  assert.throws(() => F.sub({ w: 0, n: 1, d: 3 }, { w: 0, n: 1, d: 4 }));
  assert.throws(() => F.sub({ w: 1, n: 1, d: 4 }, { w: 1, n: 1, d: 4 }));
  assert.throws(() => F.sub({ w: 0, n: 1, d: 4 }, { w: 0, n: 3, d: 4 }));

  assert.equal(F.needsCarry({ w: 1, n: 2, d: 5 }, { w: 1, n: 3, d: 5 }), true);
  assert.equal(F.needsCarry({ w: 1, n: 1, d: 5 }, { w: 1, n: 3, d: 5 }), false);
  assert.equal(F.needsBorrow({ w: 2, n: 1, d: 5 }, { w: 1, n: 2, d: 5 }), true);
  assert.equal(F.needsBorrow({ w: 2, n: 2, d: 5 }, { w: 1, n: 2, d: 5 }), false);

  assert.deepEqual(plain(F.split({ w: 2, n: 1, d: 5 })), { w: 1, n: 6, d: 5 });
  assert.deepEqual(plain(F.split({ w: 1, n: 0, d: 4 })), { w: 0, n: 4, d: 4 });
  assert.throws(() => F.split({ w: 0, n: 3, d: 4 }));
});

test('label: 자연수 조사(과/와)·진분수·가분수 읽기와 0 예외', () => {
  assert.equal(F.label({ w: 1, n: 3, d: 4 }), '1과 4분의 3');
  assert.equal(F.label({ w: 3, n: 1, d: 5 }), '3과 5분의 1');
  assert.equal(F.label({ w: 2, n: 5, d: 4 }), '2와 4분의 5');
  assert.equal(F.label({ w: 10, n: 1, d: 3 }), '10과 3분의 1');
  assert.equal(F.label({ w: 6, n: 1, d: 7 }), '6과 7분의 1');
  assert.equal(F.label({ w: 4, n: 1, d: 7 }), '4와 7분의 1');
  assert.equal(F.label({ w: 9, n: 2, d: 5 }), '9와 5분의 2');
  assert.equal(F.label({ w: 2, n: 0, d: 5 }), '2');
  assert.equal(F.label({ w: 0, n: 3, d: 5 }), '5분의 3');
  assert.equal(F.label({ w: 0, n: 9, d: 5 }), '5분의 9');
  assert.throws(() => F.label({ w: 0, n: 0, d: 5 }));
});

test('LAB_KINDS, KIND_ORDER, randInt: 관 구성과 순서, 난수 범위', () => {
  assert.deepEqual(plain(F.LAB_KINDS), {
    1: ['unit-count', 'unit-count', 'unit-count'],
    2: ['add-proper', 'add-proper', 'sub-proper'],
    3: ['sum-one', 'sum-over', 'sum-over'],
    4: ['mixed-add-proper', 'mixed-add', 'mixed-add-carry'],
    5: ['one-minus', 'whole-minus', 'whole-minus'],
    6: ['mixed-sub', 'mixed-sub-borrow', 'whole-minus-mixed'],
  });
  assert.deepEqual(plain(F.KIND_ORDER), [
    'unit-count', 'add-proper', 'sub-proper', 'sum-one', 'sum-over',
    'mixed-add-proper', 'mixed-add', 'mixed-add-carry',
    'one-minus', 'whole-minus',
    'mixed-sub', 'mixed-sub-borrow', 'whole-minus-mixed',
  ]);

  const rng = seeded(42);
  const seen = new Set();
  for (let i = 0; i < 200; i++) {
    const v = F.randInt(3, 7, rng);
    assert.ok(Number.isInteger(v) && v >= 3 && v <= 7);
    seen.add(v);
  }
  assert.equal(seen.size, 5);
});

const CHECKERS = {
  'unit-count': (p, d) => {
    assert.equal(p.op, null);
    assert.equal(p.b, null);
    assert.ok(p.a.w === 0 && p.a.n >= 2 && p.a.n <= d - 1);
    assert.ok(F.equals(p.answer, p.a));
  },
  'add-proper': (p, d) => {
    assert.equal(p.op, '+');
    assert.ok(p.a.w === 0 && p.b.w === 0 && p.a.n >= 1 && p.b.n >= 1 && p.a.n + p.b.n < d);
    assert.ok(F.equals(p.answer, F.add(p.a, p.b)));
  },
  'sub-proper': (p) => {
    assert.equal(p.op, '-');
    assert.ok(p.a.w === 0 && p.b.w === 0 && p.a.n > p.b.n && p.b.n >= 1);
    assert.ok(F.equals(p.answer, F.sub(p.a, p.b)));
  },
  'sum-one': (p, d) => {
    assert.equal(p.op, '+');
    assert.ok(p.a.w === 0 && p.b.w === 0 && p.a.n >= 1 && p.b.n >= 1 && p.a.n + p.b.n === d);
    assert.deepEqual(plain(p.answer), { w: 1, n: 0, d });
  },
  'sum-over': (p, d) => {
    assert.equal(p.op, '+');
    assert.ok(p.a.w === 0 && p.b.w === 0 && p.a.n >= 1 && p.b.n >= 1);
    assert.ok(p.a.n + p.b.n > d && p.a.n + p.b.n < 2 * d);
    assert.ok(F.equals(p.answer, F.add(p.a, p.b)));
  },
  'mixed-add-proper': (p, d) => {
    assert.equal(p.op, '+');
    assert.ok(p.a.w >= 1 && p.a.w <= 4 && p.a.n >= 1 && p.a.n < d);
    assert.ok(p.b.w === 0 && p.b.n >= 1 && p.a.n + p.b.n < d);
    assert.ok(p.answer.w >= 1 && p.answer.n >= 1 && F.equals(p.answer, F.add(p.a, p.b)));
  },
  'mixed-add': (p, d) => {
    assert.equal(p.op, '+');
    assert.ok(p.a.w >= 1 && p.a.w <= 4 && p.a.n >= 1 && p.a.n < d);
    assert.ok(p.b.w >= 1 && p.b.w <= 4 && p.b.n >= 1 && p.b.n < d && p.a.n + p.b.n < d);
    assert.ok(p.answer.w >= 1 && p.answer.n >= 1 && F.equals(p.answer, F.add(p.a, p.b)));
  },
  'mixed-add-carry': (p, d) => {
    assert.equal(p.op, '+');
    assert.ok(p.a.w >= 1 && p.a.w <= 4 && p.a.n >= 1 && p.a.n < d);
    assert.ok(p.b.w >= 1 && p.b.w <= 4 && p.b.n >= 1 && p.b.n < d && p.a.n + p.b.n > d);
    assert.ok(p.answer.w >= 1 && p.answer.n >= 1 && F.equals(p.answer, F.add(p.a, p.b)));
  },
  'one-minus': (p, d) => {
    assert.equal(p.op, '-');
    assert.deepEqual(plain(p.a), { w: 1, n: 0, d });
    assert.ok(p.b.w === 0 && p.b.n >= 1 && p.b.n < d && F.equals(p.answer, F.sub(p.a, p.b)));
  },
  'whole-minus': (p, d) => {
    assert.equal(p.op, '-');
    assert.ok(p.a.w >= 2 && p.a.w <= 5 && p.a.n === 0);
    assert.ok(p.b.w === 0 && p.b.n >= 1 && p.b.n < d && F.equals(p.answer, F.sub(p.a, p.b)));
  },
  'mixed-sub': (p, d) => {
    assert.equal(p.op, '-');
    assert.ok(p.a.w <= 5 && p.a.w > p.b.w && p.b.w >= 1 && p.a.n > p.b.n && p.b.n >= 1 && p.a.n < d);
    assert.ok(p.answer.w >= 1 && p.answer.n >= 1 && F.equals(p.answer, F.sub(p.a, p.b)));
  },
  'mixed-sub-borrow': (p, d) => {
    assert.equal(p.op, '-');
    assert.ok(p.a.w >= 2 && p.a.w <= 5 && p.b.w >= 1 && p.a.w - 1 > p.b.w);
    assert.ok(p.a.n >= 1 && p.a.n < p.b.n && p.b.n < d);
    assert.ok(p.answer.w >= 1 && p.answer.n >= 1 && F.equals(p.answer, F.sub(p.a, p.b)));
  },
  'whole-minus-mixed': (p, d) => {
    assert.equal(p.op, '-');
    assert.ok(p.a.w >= 3 && p.a.w <= 5 && p.a.n === 0);
    assert.ok(p.b.w >= 1 && p.b.w <= p.a.w - 2 && p.b.n >= 1 && p.b.n < d);
    assert.ok(p.answer.w >= 1 && p.answer.n >= 1 && F.equals(p.answer, F.sub(p.a, p.b)));
  },
};

test('makeProblem: 13개 kind 각각 seed 300개로 계약 조건 검증', () => {
  for (const kind of F.KIND_ORDER) {
    for (let s = 1; s <= 300; s++) {
      const p = F.makeProblem(kind, seeded(s));
      const d = p.a.d;
      assert.equal(p.kind, kind);
      assert.ok(d >= 3 && d <= 10);
      if (p.b !== null) assert.equal(p.b.d, d);
      assert.equal(p.answer.d, d);
      assert.ok(p.answer.w >= 0 && p.answer.n >= 0 && p.answer.n < d);
      assert.ok(p.answer.w * d + p.answer.n > 0);
      CHECKERS[kind](p, d);
    }
  }
});

test('wrongChoices: 모든 kind에서 오답 보기 2개 규칙 검증', () => {
  for (const kind of F.KIND_ORDER) {
    for (let s = 1; s <= 50; s++) {
      const p = F.makeProblem(kind, seeded(s * 7));
      const ansText = F.label(p.answer);
      const choices = F.wrongChoices(p);
      assert.equal(choices.length, 2);
      for (const c of choices) {
        assert.ok(c.value.d >= 1 && c.value.w >= 0 && c.value.n >= 0);
        assert.ok(c.value.w * c.value.d + c.value.n > 0);
        assert.equal(c.text, F.label(c.value));
        assert.notEqual(c.text, ansText);
        assert.ok(typeof c.mistake === 'string' && c.mistake.length > 0);
      }
      assert.notEqual(choices[0].text, choices[1].text);
    }
  }
});

test('makeRound: 1~6관 순서와 한 판 내 중복 없음 검증', () => {
  for (let lab = 1; lab <= 6; lab++) {
    for (let s = 1; s <= 50; s++) {
      const round = F.makeRound(lab, seeded(s * 13 + lab));
      assert.deepEqual(plain(round.map((p) => p.kind)), plain(F.LAB_KINDS[lab]));
      for (let i = 0; i < round.length; i++) {
        for (let j = i + 1; j < round.length; j++) {
          assert.equal(sameProblem(round[i], round[j]), false);
        }
      }
    }
  }
});

test('makeMixedRound: 종류별 최대 3회·KIND_ORDER 정렬·중복 없음 검증', () => {
  const order = plain(F.KIND_ORDER);
  for (let s = 1; s <= 50; s++) {
    const round = F.makeMixedRound(seeded(s * 17));
    assert.equal(round.length, 10);
    const counts = {};
    for (let i = 0; i < round.length; i++) {
      const k = round[i].kind;
      assert.ok(order.includes(k));
      counts[k] = (counts[k] || 0) + 1;
      assert.ok(counts[k] <= 3);
      if (i > 0) assert.ok(order.indexOf(round[i - 1].kind) <= order.indexOf(k));
      for (let j = i + 1; j < round.length; j++) {
        assert.equal(sameProblem(round[i], round[j]), false);
      }
    }
  }
  assert.equal(F.makeMixedRound(seeded(999), 6).length, 6);
});

test('분모가 3이라 분자만 바꿔서는 오답이 모자라면 자연수 부분을 바꿔 2개를 채운다', () => {
  const p = { kind: 'sub-proper', op: '-', a: { w: 0, n: 2, d: 3 }, b: { w: 0, n: 1, d: 3 }, answer: { w: 0, n: 1, d: 3 } };
  const texts = F.wrongChoices(p).map((c) => c.text);
  assert.equal(texts.length, 2);
  assert.ok(!texts.includes('3분의 1'));
});
