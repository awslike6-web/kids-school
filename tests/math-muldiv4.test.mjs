import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { read } from './split-rules.mjs';

// 4-1 곱셈과 나눗셈 순수 계산 부품 (docs/math_4-1_muldiv_spec.md §4-1·§5·§6·§8)
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
const W = load([
  'kids/subjects/math/js/math_operator_studio-plans.js',
  'kids/subjects/math/js/mul_div-core.js'
]);
const M = W.MulDivCore;
const P = W.OperatorStudioPlans;

const MUL_KINDS = ['mul-tens-helped', 'mul-tens', 'mul-tens-zero', 'mul-2d-easy', 'mul-2d'];
const DIV_KINDS = ['div-tens', 'div-tens-rem', 'div-2by2', 'div-2by2-rem', 'div-3by2-one', 'div-3by2-one-rem',
  'div-check', 'div-3by2-two', 'div-3by2-two-rem'];
const isTens = (n) => n % 10 === 0;
const digits = (n) => String(n).split('').map(Number);
const hasCarry = (a, d) => {
  const ds = digits(a).reverse();
  let c = 0, any = false;
  for (let i = 0; i < ds.length; i++) {
    const v = ds[i] * d + c;
    if (i < ds.length - 1 && v >= 10) any = true;
    c = Math.floor(v / 10);
  }
  return any;
};
// 정답·오답 값을 크기로 견줄 수 있는 수로 (나눗셈은 몫 → 나머지 순)
const sizeOf = (v) => (typeof v === 'number' ? v : v.check ? v.b * v.x + (v.sign === '-' ? -v.y : v.y) : v.q * 1000 + v.r);

test('계약 예시: 곱셈', () => {
  assert.deepEqual(plain(M.mulTens(325, 40)), { base: 1300, answer: 13000 });
  assert.equal(M.mulTens(250, 40).answer, 10000);
  assert.deepEqual(plain(M.mul2(325, 24)), { ones: 1300, tens: 6500, answer: 7800 });
  assert.equal(M.carryLostMul(325, 4), 1280);
  assert.equal(M.token(13000), '13000');
  assert.equal(M.label(13000), '13000');
});

test('계약 예시: 나눗셈·검산', () => {
  assert.deepEqual(plain(M.divide(240, 60)), { q: 4, r: 0 });
  assert.deepEqual(plain(M.divTens(250, 60)), { a2: 25, b2: 6, q: 4, r2: 1, r: 10 });
  assert.deepEqual(plain(M.divide(85, 23)), { q: 3, r: 16 });
  const d1 = M.longDivide(185, 23);
  assert.equal(d1.q, 8); assert.equal(d1.r, 1); assert.equal(d1.steps.length, 1);
  const d2 = M.longDivide(754, 23);
  assert.equal(d2.q, 32); assert.equal(d2.r, 18);
  assert.deepEqual(plain(d2.steps), [
    { q: 3, take: 75, product: 69, remain: 6, next: 64 },
    { q: 2, take: 64, product: 46, remain: 18, next: null }
  ]);
  const d3 = M.longDivide(775, 39);
  assert.equal(d3.steps[1].take, 385);
  assert.equal(M.token({ q: 3, r: 16 }), '3…16');
  assert.equal(M.token({ q: 4, r: 0 }), '4');
  assert.equal(M.label({ q: 3, r: 16 }), '몫 3, 나머지 16');
  assert.equal(M.label({ q: 4, r: 0 }), '몫 4');
  assert.equal(M.label({ check: true, b: 23, x: 8, y: 1, sign: '+' }), '23 × 8 + 1');
  assert.equal(M.label({ check: true, b: 23, x: 8, y: 1, sign: '-' }), '23 × 8 − 1');
  assert.equal(M.checkText(85, 23, 3, 16), '23 × 3 + 16 = 85');
  assert.equal(M.checkText(92, 23, 4, 0), '23 × 4 = 92');
  assert.equal(M.subBorrowLost(85, 69), 26);
  assert.equal(M.subBorrowLost(85, 63), null);
  assert.equal(M.subReverse(64, 46), 22);
});

function checkWrongs(p, slot, ctx) {
  const ans = slot ? p.parts[slot].answer : p.answer;
  const ansText = slot ? p.parts[slot].answerText : p.answerText;
  assert.equal(ansText, M.token(ans), ctx + ' answerText');
  const w = M.wrongChoices(p, slot);
  assert.equal(w.length, 2, ctx + ' 오답 2개');
  const toks = new Set([ansText]);
  for (const x of w) {
    assert.equal(x.token, M.token(x.value), ctx + ' 오답 token');
    assert.ok(!toks.has(x.token), ctx + ' 겹침 ' + x.token);
    toks.add(x.token);
    assert.ok(typeof x.mistake === 'string' && x.mistake, ctx + ' mistake');
    const v = x.value;
    if (typeof v === 'number') {
      if (slot === 'q1' || slot === 'rem') assert.ok(v >= 0, ctx + ' 0 이상');
      else assert.ok(v >= 1, ctx + ' 1 이상 ' + v);
    } else if (!v.check) {
      assert.ok(v.q >= 1 && v.r >= 0, ctx + ' 몫·나머지 범위');
      assert.equal(v.r === 0, ans.r === 0, ctx + ' 보기 꼴 맞추기 ' + x.token);
    }
    if (x.mistake === 'rem-too-big') assert.ok((typeof v === 'number' ? v : v.r) >= p.b, ctx + ' rem-too-big 나머지 ≥ 나누는 수');
  }
  return w;
}

function poolOf(kind) {
  // 나눗셈 풀은 전수: 같은 seed로 충분히 뽑아 서로 다른 문제를 모은다
  const rng = seeded(kind.length * 31);
  const seen = new Map();
  for (let t = 0; t < 4000; t++) {
    const p = M.makeProblem(kind, rng);
    seen.set(p.a + '|' + p.b, p);
  }
  return [...seen.values()];
}

test('곱셈 종류: seed 300개 범위·오답·칸', () => {
  const rng = seeded(41);
  for (const kind of MUL_KINDS) {
    for (let i = 0; i < 300; i++) {
      const p = M.makeProblem(kind, rng);
      const ctx = kind + ' ' + p.a + '×' + p.b;
      assert.equal(p.kind, kind);
      if (kind.startsWith('mul-tens')) {
        assert.ok(isTens(p.b) && p.b >= 20 && p.b <= 50, ctx + ' 몇십 20~50');
        assert.equal(p.answer, p.a * p.b, ctx);
        assert.equal(p.base, p.a * (p.b / 10), ctx);
        if (kind === 'mul-tens-zero') {
          assert.ok(isTens(p.a) && p.a >= 110 && p.a <= 490 && Math.floor(p.a / 10) % 10 !== 0, ctx + ' a 몇십');
          assert.equal(p.answer % 1000, 0, ctx + ' 끝 0 셋');
        } else {
          assert.ok(p.a >= 112 && p.a <= 499 && !isTens(p.a), ctx + ' a 범위');
          assert.ok(hasCarry(p.a, p.b / 10), ctx + ' 받아올림');
        }
        checkWrongs(p, undefined, ctx);
      } else {
        const [b1, b0] = digits(p.b);
        assert.equal(p.answer, p.a * p.b, ctx);
        if (kind === 'mul-2d-easy') {
          assert.ok(p.a >= 112 && p.a <= 399, ctx);
          assert.ok([2, 3].includes(b1) && [2, 3].includes(b0), ctx + ' b 22~33');
          assert.ok(hasCarry(p.a, b0), ctx + ' 일의 자리 곱 받아올림');
        } else {
          assert.ok(p.a >= 112 && p.a <= 499 && p.b >= 12 && p.b <= 59 && b0 >= 2 && b1 >= 2, ctx);
          assert.ok(hasCarry(p.a, b0) && hasCarry(p.a, b1), ctx + ' 두 부분곱 받아올림');
        }
        assert.equal(p.parts.ones.answer, p.a * b0, ctx);
        assert.equal(p.parts.tens.answer, p.a * b1 * 10, ctx);
        assert.equal(p.parts.sum.answer, p.answer, ctx);
        assert.ok(p.answer < 100000, ctx + ' 5자리 이하');
        for (const s of ['ones', 'tens', 'sum']) checkWrongs(p, s, ctx + ' ' + s);
      }
    }
  }
});

test('나눗셈 종류: 후보 풀 전수 범위·오답·칸', () => {
  for (const kind of DIV_KINDS) {
    const pool = poolOf(kind);
    assert.ok(pool.length >= 5, kind + ' 풀 크기');
    for (const p of pool) {
      const ctx = kind + ' ' + p.a + '÷' + p.b;
      const { q, r } = M.divide(p.a, p.b);
      assert.equal(p.q, q, ctx); assert.equal(p.r, r, ctx);
      assert.ok(r < p.b, ctx + ' 나머지 < 나누는 수');
      const rem = kind.endsWith('-rem');
      if (kind !== 'div-check') assert.equal(r > 0, rem, ctx + ' 나머지 유무');
      if (kind.startsWith('div-tens')) {
        assert.ok(isTens(p.b) && p.a >= 100 && p.a <= 990 && isTens(p.a) && q >= 2 && q <= 9, ctx);
        assert.ok(isTens(r), ctx + ' 나머지 몇십');
        if (rem) assert.ok(p.b >= 30, ctx);
        assert.deepEqual(plain({ a2: p.a2, b2: p.b2, r2: p.r2 }), { a2: p.a / 10, b2: p.b / 10, r2: r / 10 }, ctx);
      } else if (kind.startsWith('div-2by2')) {
        assert.ok(p.b >= 11 && p.b <= 49 && !isTens(p.b) && p.a >= 10 && p.a <= 99 && q >= 2 && q <= 8, ctx);
      } else if (kind.startsWith('div-3by2-one') || kind === 'div-check') {
        assert.ok(p.b >= 12 && p.b <= 49 && !isTens(p.b) && p.a >= 100 && p.a <= 489, ctx);
        assert.ok(Math.floor(p.a / 10) < p.b && q >= 3 && q <= 9, ctx + ' 몫 한 자리');
        if (kind === 'div-check') {
          assert.ok(r >= 1 && q !== r, ctx + ' 검산 q ≠ r');
          assert.deepEqual(plain(p.answer), { check: true, b: p.b, x: q, y: r, sign: '+' }, ctx);
        }
      } else {
        assert.ok(p.b >= 12 && p.b <= 39 && !isTens(p.b) && p.a <= 999, ctx);
        assert.ok(q >= 11 && q <= 39 && q % 10 !== 0, ctx + ' 몫 두 자리, 끝자리 0 없음');
        assert.ok(Math.floor(p.a / 10) >= p.b, ctx + ' 앞 두 자리 ≥ 나누는 수');
        assert.equal(p.steps.length, 2, ctx);
        assert.equal(p.parts.q1.answer, Math.floor(q / 10), ctx);
        assert.equal(p.parts.q2.answer, q % 10, ctx);
        if (rem) assert.equal(p.parts.rem.answer, r, ctx);
        else assert.equal(p.parts.rem, undefined, ctx + ' 나누어떨어지면 rem 칸 없음');
        for (const s of Object.keys(p.parts)) checkWrongs(p, s, ctx + ' ' + s);
      }
      if (!kind.startsWith('div-3by2-two')) checkWrongs(p, undefined, ctx);
    }
  }
});

test('편향·보정 보기: 정답 크기 위치 ≤ 75%, 보정 보기 ≤ 10%', () => {
  const slotsOf = (kind) => (kind.startsWith('mul-2d') ? ['ones', 'tens', 'sum']
    : kind.startsWith('div-3by2-two') ? ['q1', 'q2', 'rem'] : [undefined]);
  const rng = seeded(77);
  for (const kind of [...MUL_KINDS, ...DIV_KINDS]) {
    for (const slot of slotsOf(kind)) {
      const pos = [0, 0, 0];
      let fix = 0, total = 0, n = 0;
      for (let i = 0; i < 400; i++) {
        const p = M.makeProblem(kind, rng);
        if (slot && !p.parts[slot]) continue;
        const ans = slot ? p.parts[slot].answer : p.answer;
        const w = M.wrongChoices(p, slot);
        const all = [ans, ...w.map((x) => x.value)].map(sizeOf);
        const rank = all.filter((v) => v < all[0]).length;
        pos[rank]++;
        n++;
        for (const x of w) { total++; if (x.mistake === 'fix') fix++; }
      }
      const ctx = kind + (slot ? ' ' + slot : '');
      if (n === 0) continue; // 나누어떨어지는 6관은 rem 칸이 없음
      if (kind !== 'div-check') {
        assert.ok(Math.max(...pos) / n <= 0.75, ctx + ' 크기 위치 편향 ' + pos.join('/'));
      }
      assert.ok(fix / total <= 0.1, ctx + ' 보정 보기 비율 ' + fix + '/' + total);
    }
  }
});

test('경계: 몫 9, q1 = 1, q2 = 9, 나누어떨어지는 6관', () => {
  const one = poolOf('div-3by2-one-rem');
  assert.ok(one.some((p) => p.q === 9), '몫 9가 풀에 있음');
  const two = [...poolOf('div-3by2-two'), ...poolOf('div-3by2-two-rem')];
  const q1one = two.find((p) => p.parts.q1.answer === 1);
  assert.ok(q1one, 'q1 = 1 문제가 있음');
  const w = M.wrongChoices(q1one, 'q1');
  assert.ok(w.some((x) => x.value === 0 && x.mistake === 'q-first-digit'), 'q1 = 1이면 0 보기(q-first-digit)');
  assert.ok(two.some((p) => p.parts.q2.answer === 9), 'q2 = 9가 풀에 있음');
  const r0 = poolOf('div-3by2-one');
  for (const p of r0) assert.ok(M.wrongChoices(p).every((x) => x.value.r === 0), '나누어떨어지면 보기 모두 몫 N');
});

test('한 판·섞기: 개수, 중복, 한 종류 ≤ 3, 섞기에 세로셈 종류 없음', () => {
  const rng = seeded(5);
  assert.deepEqual(plain(M.LAB_KINDS[1]), ['mul-tens-helped', 'mul-tens', 'mul-tens-zero']);
  assert.deepEqual(plain(M.LAB_KINDS[5]), ['div-3by2-one', 'div-3by2-one-rem', 'div-check']);
  assert.deepEqual(plain(M.LAB_KINDS[6]), ['div-3by2-two', 'div-3by2-two-rem', 'div-3by2-two-rem']);
  for (let t = 0; t < 500; t++) {
    for (let lab = 1; lab <= 6; lab++) {
      const round = M.makeRound(lab, rng);
      assert.equal(round.length, 3);
      assert.deepEqual(plain(round.map((p) => p.kind)), plain(M.LAB_KINDS[lab]));
      assert.equal(new Set(round.map((p) => p.kind + p.a + '|' + p.b)).size, 3);
    }
    const mixed = M.makeMixedRound(rng, 10);
    assert.equal(mixed.length, 10);
    assert.equal(new Set(mixed.map((p) => p.kind + p.a + '|' + p.b)).size, 10);
    const count = {};
    for (const p of mixed) {
      count[p.kind] = (count[p.kind] || 0) + 1;
      assert.ok(M.MIXED_KINDS.includes(p.kind), '섞기 종류 ' + p.kind);
      assert.ok(!/^mul-2d|^div-3by2-two|helped/.test(p.kind));
    }
    assert.ok(Object.values(count).every((c) => c <= 3));
    const idx = mixed.map((p) => M.KIND_ORDER[p.kind]);
    assert.deepEqual(plain(idx), plain(idx).sort((x, y) => x - y), '쉬운 것 먼저');
  }
  assert.throws(() => M.makeRound(9, rng));
});

test('연산 스튜디오 풀이와 값 대조 (표본 200개)', () => {
  const rng = seeded(200);
  for (let i = 0; i < 100; i++) {
    const p = M.makeProblem(i % 2 ? 'mul-2d' : 'mul-2d-easy', rng);
    const plan = P.buildMultiplicationPlan(p.a, p.b);
    const rows = plan[plan.length - 1].board.rows;
    const num = (k) => Number(rows.find((r) => r.kind === k).cells.join(''));
    assert.equal(num('part1'), p.parts.ones.answer, p.a + '×' + p.b);
    assert.equal(num('part2') * 10, p.parts.tens.answer, p.a + '×' + p.b);
    assert.equal(num('sum'), p.answer, p.a + '×' + p.b);
  }
  for (let i = 0; i < 100; i++) {
    const p = M.makeProblem(i % 2 ? 'div-3by2-two-rem' : 'div-3by2-one-rem', rng);
    const plan = P.buildDivisionPlan(p.a, p.b);
    const board = plan[plan.length - 1].board;
    assert.equal(Number(board.quotient.join('')), p.q, p.a + '÷' + p.b);
    const products = board.rows.filter((r) => r.kind === 'product').map((r) => Number(r.value));
    assert.deepEqual(products, p.steps.map((s) => s.product), p.a + '÷' + p.b);
    const rems = board.rows.filter((r) => r.kind === 'remainder');
    assert.equal(Number(rems[rems.length - 1].value), p.r, p.a + '÷' + p.b);
  }
});

test('화면: 상대 경로·실림 순서·800줄 미만·대문 카드 두 곳', () => {
  const page = 'kids/subjects/math/multiply_divide.html';
  const html = read(page);
  assert.ok(!/(src|href)="\//.test(html), '루트 절대 경로');
  const names = ['math_explorer-ladder.js', 'mul_div-core.js', 'mul_div-draw.js', 'mul_div-labs.js'];
  const at = names.map((n) => html.indexOf('./js/' + n));
  assert.ok(at.every((i) => i > 0), '스크립트 빠짐');
  assert.deepEqual(at, [...at].sort((x, y) => x - y), '실림 순서');
  assert.ok(html.includes('math_muldiv.css') && html.includes('mx-theme-muldiv'));
  for (const f of ['mul_div-core.js', 'mul_div-draw.js', 'mul_div-labs.js']) {
    const n = read('kids/subjects/math/js/' + f).split('\n').length;
    assert.ok(n < 800, f + ' ' + n + '줄');
  }
  const gate = read('kids/subjects/math/math.html');
  assert.equal(gate.split('href="multiply_divide.html"').length - 1, 2, '대문 카드 두 곳(학년별·영역별)');
});

test('퀴즈 자료 4-1: 12제, 보기 3개, 정답 번호 범위, 해설에 보기 번호·어림 고치기 풀이 없음, 정답 검산', () => {
  const d = JSON.parse(read('scripts/data/curriculum/math_4-1_3.json'));
  assert.equal(d.grade, '4-1');
  assert.equal(d.unit, '3. 곱셈과 나눗셈');
  assert.equal(d.items.length, 12);
  for (const it of d.items) {
    assert.equal(it.choices.length, 3, it.title);
    assert.equal(new Set(it.choices).size, 3, it.title);
    assert.ok(it.answer >= 1 && it.answer <= 3, it.title);
    assert.ok(!/\d번/.test(it.explanation), it.title + ' 보기 번호');
    assert.ok(!/어림/.test(it.question + it.explanation), it.title + ' 어림 풀이');
    // 식 문제는 정답을 직접 검산한다
    const ans = it.choices[it.answer - 1];
    const mul = it.question.match(/^(\d+) × (\d+)은 얼마/);
    if (mul) assert.equal(ans, String(Number(mul[1]) * Number(mul[2])), it.title);
    const div = it.question.match(/^(\d+) ÷ (\d+)(?:의 몫과 나머지는|은) 얼마/);
    if (div) assert.equal(ans, M.label(plain(M.divide(Number(div[1]), Number(div[2])))), it.title);
  }
});
