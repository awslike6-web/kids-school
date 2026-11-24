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
const T = load(['kids/subjects/math/js/add_sub_two-core.js']).TwoDigitCore;

const EXPECTED_LAB_KINDS = {
  1: ['carry-2x1', 'carry-2x1', 'nocarry-2x1'],
  2: ['nocarry-2x2', 'carry-2x2', 'carry-2x2'],
  3: ['borrow-2x1', 'borrow-tens-x1', 'noborrow-2x1'],
  4: ['noborrow-2x2', 'borrow-2x2', 'borrow-2x2'],
  5: ['three-terms', 'relation', 'box-add'],
};

const EXPECTED_KIND_ORDER = [
  'carry-2x1', 'nocarry-2x1', 'nocarry-2x2', 'carry-2x2',
  'borrow-2x1', 'borrow-tens-x1', 'noborrow-2x1', 'noborrow-2x2',
  'borrow-2x2', 'three-terms', 'relation', 'box-add',
];

function checkProblemContract(p, kind) {
  assert.equal(p.kind, kind);
  assert.ok(Number.isInteger(p.answer) && p.answer >= 1 && p.answer <= 99, `${kind} answer=${p.answer}`);
  assert.equal(typeof p.answerText, 'string');
  if (kind !== 'relation') assert.equal(p.answerText, String(p.answer));

  switch (kind) {
    case 'carry-2x1':
      assert.equal(p.op, '+');
      assert.ok(p.a >= 11 && p.a <= 89);
      assert.ok(p.b >= 3 && p.b <= 6);
      assert.ok((p.a % 10) + p.b >= 10);
      assert.ok(p.a + p.b <= 99);
      assert.equal(p.answer, p.a + p.b);
      break;
    case 'nocarry-2x1':
      assert.equal(p.op, '+');
      assert.ok(p.a >= 10 && p.a <= 99);
      assert.ok(p.b >= 2 && p.b <= 6);
      assert.ok((p.a % 10) + p.b <= 9);
      assert.equal(p.answer, p.a + p.b);
      break;
    case 'nocarry-2x2':
      assert.equal(p.op, '+');
      assert.ok(p.a >= 10 && p.a <= 89);
      assert.ok(p.b >= 10 && p.b <= 89);
      assert.ok((p.a % 10) + (p.b % 10) <= 9);
      assert.ok(p.a + p.b <= 99);
      assert.equal(p.answer, p.a + p.b);
      break;
    case 'carry-2x2':
      assert.equal(p.op, '+');
      assert.ok(p.a >= 10 && p.a <= 89);
      assert.ok(p.b >= 10 && p.b <= 89);
      assert.ok((p.a % 10) + (p.b % 10) >= 10);
      assert.ok(p.a + p.b <= 99);
      assert.equal(p.answer, p.a + p.b);
      break;
    case 'borrow-2x1':
      assert.equal(p.op, '−');
      assert.ok(p.a >= 21 && p.a <= 99 && p.a % 10 >= 1);
      assert.ok(p.b >= 3 && p.b <= 6);
      assert.ok((p.a % 10) < p.b);
      assert.ok(p.a - p.b >= 10);
      assert.equal(p.answer, p.a - p.b);
      break;
    case 'borrow-tens-x1':
      assert.equal(p.op, '−');
      assert.ok(p.a >= 20 && p.a <= 90 && p.a % 10 === 0);
      assert.ok(p.b >= 2 && p.b <= 8);
      assert.ok(p.a - p.b >= 10);
      assert.equal(p.answer, p.a - p.b);
      break;
    case 'noborrow-2x1':
      assert.equal(p.op, '−');
      assert.ok(p.a >= 10 && p.a <= 99);
      assert.ok(p.b >= 2 && p.b <= 6);
      assert.ok((p.a % 10) >= p.b);
      assert.ok(p.a - p.b >= 10);
      assert.equal(p.answer, p.a - p.b);
      break;
    case 'noborrow-2x2':
      assert.equal(p.op, '−');
      assert.ok(p.b >= 10 && p.b <= 89 && p.a > p.b);
      assert.ok((p.a % 10) >= (p.b % 10));
      assert.ok(p.a - p.b >= 10);
      assert.equal(p.answer, p.a - p.b);
      break;
    case 'borrow-2x2':
      assert.equal(p.op, '−');
      assert.ok(p.b >= 10 && p.b <= 89 && p.a > p.b);
      assert.ok((p.a % 10) < (p.b % 10));
      assert.ok(p.a - p.b >= 10);
      assert.equal(p.answer, p.a - p.b);
      break;
    case 'three-terms': {
      const [a, b, c] = p.terms;
      assert.equal(p.ops[0], '−');
      assert.ok(p.ops[1] === '+' || p.ops[1] === '−');
      assert.ok(a >= 20 && a <= 99 && b >= 2 && b <= 30 && c >= 2 && c <= 30);
      assert.equal(p.mid, a - b);
      assert.ok(p.mid >= 1 && p.mid <= 99);
      assert.equal(p.answer, p.ops[1] === '+' ? p.mid + c : p.mid - c);
      const count = (T.needsBorrow(a, b) ? 1 : 0)
        + ((p.ops[1] === '+' ? T.needsCarry(p.mid, c) : T.needsBorrow(p.mid, c)) ? 1 : 0);
      assert.ok(count <= 1);
      const rtl = p.ops[1] === '+' ? a - (b + c) : a - (b - c);
      assert.notEqual(rtl, p.answer);
      break;
    }
    case 'relation':
      assert.ok(p.a >= 10 && p.a <= 89 && p.b >= 2 && p.b <= 9);
      assert.equal(p.sum, p.a + p.b);
      assert.ok(p.sum <= 99);
      assert.equal(p.answer, p.a);
      assert.equal(p.answerText, `${p.sum} − ${p.b} = ${p.a}`);
      break;
    case 'box-add': {
      const box = p.sum - p.a;
      assert.ok(p.a >= 10 && p.a <= 89 && p.sum <= 99);
      assert.ok(box >= 2 && box <= 30);
      assert.equal(p.answer, box);
      break;
    }
  }
}

test('덧셈·뺄셈 및 받아올림·받아내림 판별 함수', () => {
  assert.equal(T.add(27, 5), 32);
  assert.equal(T.sub(52, 27), 25);
  assert.equal(T.needsCarry(27, 5), true);
  assert.equal(T.needsCarry(24, 5), false);
  assert.equal(T.needsCarry(25, 15), true);
  assert.equal(T.needsBorrow(32, 7), true);
  assert.equal(T.needsBorrow(37, 2), false);
  assert.equal(T.needsBorrow(40, 6), true);
});

test('randInt 양 끝 포함 정수 난수 범위 검사', () => {
  assert.equal(T.randInt(5, 9, () => 0), 5);
  assert.equal(T.randInt(5, 9, () => 0.999999), 9);
  assert.equal(T.randInt(7, 7, () => 0.5), 7);
  const rng = seeded(42);
  const seen = new Set();
  for (let i = 0; i < 200; i++) {
    const v = T.randInt(3, 6, rng);
    assert.ok(Number.isInteger(v) && v >= 3 && v <= 6);
    seen.add(v);
  }
  assert.deepEqual([...seen].sort((x, y) => x - y), [3, 4, 5, 6]);
});

test('LAB_KINDS, KIND_ORDER, BINGO_KINDS 상수 구조 검사', () => {
  assert.deepEqual(plain(T.LAB_KINDS), EXPECTED_LAB_KINDS);
  assert.deepEqual(plain(T.KIND_ORDER), EXPECTED_KIND_ORDER);
  assert.equal(T.KIND_ORDER.length, 12);
  assert.deepEqual(plain(T.BINGO_KINDS), EXPECTED_KIND_ORDER.filter((k) => k !== 'relation'));
  assert.equal(T.BINGO_KINDS.length, 11);
});

test('makeProblem 모든 종류별 시드 300개 계약 조건 및 고정 예시 탈출 검사', () => {
  for (const kind of EXPECTED_KIND_ORDER) {
    for (let s = 1; s <= 300; s++) {
      checkProblemContract(T.makeProblem(kind, seeded(s)), kind);
    }
    checkProblemContract(T.makeProblem(kind, () => 0), kind);
    checkProblemContract(T.makeProblem(kind, () => 0.999999), kind);
  }
});

test('exprText, bingoCall, speakText 계약 예시 정확 일치 검사', () => {
  const pCarry = { kind: 'carry-2x1', op: '+', a: 27, b: 5, answer: 32, answerText: '32' };
  assert.equal(T.exprText(pCarry), '27 + 5');
  assert.equal(T.bingoCall(pCarry), '27 + 5');
  assert.equal(T.speakText(pCarry), '27 더하기 5');

  const pBorrow = { kind: 'borrow-2x2', op: '−', a: 52, b: 27, answer: 25, answerText: '25' };
  assert.equal(T.exprText(pBorrow), '52 − 27');
  assert.equal(T.bingoCall(pBorrow), '52 − 27');
  assert.equal(T.speakText(pBorrow), '52 빼기 27');

  const pThree = { kind: 'three-terms', ops: ['−', '+'], terms: [25, 13, 8], mid: 12, answer: 20, answerText: '20' };
  assert.equal(T.exprText(pThree), '25 − 13 + 8');
  assert.equal(T.bingoCall(pThree), '25 − 13 + 8');
  assert.equal(T.speakText(pThree), '25 빼기 13 더하기 8');

  const pRel = { kind: 'relation', a: 15, b: 8, sum: 23, answer: 15, answerText: '23 − 8 = 15' };
  assert.equal(T.exprText(pRel), '15 + 8 = 23');
  assert.equal(T.speakText(pRel), '15 더하기 8 는 23');

  const pBox = { kind: 'box-add', a: 15, sum: 23, answer: 8, answerText: '8' };
  assert.equal(T.exprText(pBox), '15 + □ = 23');
  assert.equal(T.bingoCall(pBox), '15 + □ = 23');
  assert.equal(T.speakText(pBox), '15 더하기 네모 는 23');
});

test('wrongChoices 계약 예시 및 모든 종류 오답 보기 규칙 검사', () => {
  const byMistake = (list) => Object.fromEntries(list.map((c) => [c.mistake, c]));

  const wCarry1 = byMistake(T.wrongChoices({ kind: 'carry-2x1', op: '+', a: 27, b: 5, answer: 32, answerText: '32' }));
  assert.equal(wCarry1['no-carry'].value, 22);
  assert.equal(wCarry1['write-sum'].text, '212');

  const wCarry2 = byMistake(T.wrongChoices({ kind: 'carry-2x2', op: '+', a: 38, b: 25, answer: 63, answerText: '63' }));
  assert.equal(wCarry2['no-carry'].value, 53);
  assert.equal(wCarry2['write-sum'].text, '513');

  const wTens = byMistake(T.wrongChoices({ kind: 'borrow-tens-x1', op: '−', a: 40, b: 6, answer: 34, answerText: '34' }));
  assert.equal(wTens['zero-passthrough'].value, 46);
  assert.equal(wTens['no-borrow-tens'].value, 44);

  const wRel = byMistake(T.wrongChoices({ kind: 'relation', a: 15, b: 8, sum: 23, answer: 15, answerText: '23 − 8 = 15' }));
  assert.equal(wRel['mix-terms'].text, '15 − 8 = 7');
  assert.equal(wRel['wrong-op'].text, '23 + 8 = 31');

  for (const kind of EXPECTED_KIND_ORDER) {
    for (let s = 1; s <= 300; s++) {
      const p = T.makeProblem(kind, seeded(s));
      const choices = T.wrongChoices(p);
      assert.equal(choices.length, 2);
      assert.notEqual(choices[0].text, choices[1].text);
      for (const c of choices) {
        assert.equal(typeof c.text, 'string');
        assert.equal(typeof c.mistake, 'string');
        assert.notEqual(c.text, p.answerText);
        if (kind !== 'relation') {
          assert.ok(Number.isInteger(c.value) && c.value >= 1);
          assert.equal(c.text, String(c.value));
        }
      }
    }
  }
});

test('makeRound 관별 순서와 한 판 내 중복 없음 검사', () => {
  for (let lab = 1; lab <= 5; lab++) {
    for (let s = 1; s <= 50; s++) {
      const round = T.makeRound(lab, seeded(s));
      assert.deepEqual(plain(round.map((p) => p.kind)), EXPECTED_LAB_KINDS[lab]);
      const keys = round.map((p) => `${p.kind}:${T.exprText(p)}`);
      assert.equal(new Set(keys).size, 3);
    }
  }
});

test('makeMixedRound 길이, 최대 2회 제한, KIND_ORDER 정렬, 중복 없음 검사', () => {
  for (const n of [undefined, 4, 12]) {
    for (let s = 1; s <= 40; s++) {
      const round = n === undefined ? T.makeMixedRound(seeded(s)) : T.makeMixedRound(seeded(s), n);
      const expectedLen = n === undefined ? 6 : n;
      assert.equal(round.length, expectedLen);
      const counts = new Map();
      let prevIdx = -1;
      const keys = [];
      for (const p of round) {
        const idx = EXPECTED_KIND_ORDER.indexOf(p.kind);
        assert.ok(idx >= prevIdx);
        prevIdx = idx;
        counts.set(p.kind, (counts.get(p.kind) || 0) + 1);
        assert.ok(counts.get(p.kind) <= 2);
        keys.push(`${p.kind}:${T.exprText(p)}`);
      }
      assert.equal(new Set(keys).size, expectedLen);
    }
  }
});

test('makeBingo 9문제, relation 제외, 서로 다른 answerText, call 일치 검사', () => {
  for (let s = 1; s <= 30; s++) {
    const board = T.makeBingo(seeded(s));
    assert.equal(board.length, 9);
    const answers = new Set();
    for (const p of board) {
      assert.notEqual(p.kind, 'relation');
      assert.ok(T.BINGO_KINDS.includes(p.kind));
      assert.equal(p.call, T.bingoCall(p));
      answers.add(p.answerText);
    }
    assert.equal(answers.size, 9);
  }
});

test('세 수 계산: 뺄셈이 두 번이면 둘째 수가 셋째 수보다 커서 뒤에서부터 계산하는 실수가 실제로 가능하다', () => {
  for (let s = 1; s <= 300; s++) {
    const p = T.makeProblem('three-terms', seeded(s));
    if (p.ops[1] === '−') assert.ok(p.terms[1] > p.terms[2], JSON.stringify(plain(p)));
  }
});
