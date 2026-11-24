import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { read } from './split-rules.mjs';

// 5-1 약분과 통분·분모가 다른 분수의 덧셈과 뺄셈 순수 계산 부품 (docs/math_5-1_fraction_spec.md §6·§8)
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
  'kids/subjects/math/js/fraction_add-core.js',
  'kids/subjects/math/js/fraction_reduce-core.js',
  'kids/subjects/math/js/fraction_unlike-core.js'
]);
const F = W.FractionCore;
const R = W.FracReduceCore;
const U = W.FracUnlikeCore;
const fr = (w, n, d) => ({ w, n, d });
const val = (f) => (f.w * f.d + f.n) / f.d;
const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const lcm = (a, b) => (a / gcd(a, b)) * b;
const simplest = (f) => f.n === 0 || (gcd(f.n, f.d) === 1 && f.n < f.d);
const onlySmallPrimes = (x) => { for (const p of [2, 3, 5, 7]) while (x % p === 0) x /= p; return x === 1; };
const SYMS = ['>', '<', '='];

test('기본 계산: gcd·lcm·isSimplest·simplify·reduceBy', () => {
  assert.equal(R.gcd(12, 18), 6);
  assert.equal(R.lcm(6, 8), 24);
  assert.equal(R.isSimplest(fr(0, 7, 9)), true);
  assert.equal(R.isSimplest(fr(0, 6, 9)), false);
  assert.equal(R.isSimplest(fr(0, 5, 3)), false);
  assert.deepEqual(plain(R.simplify(fr(0, 12, 18))), fr(0, 2, 3));
  assert.deepEqual(plain(R.simplify(fr(0, 9, 6))), fr(1, 1, 2));
  assert.deepEqual(plain(R.simplify(fr(0, 6, 3))), fr(2, 0, 1));
  assert.deepEqual(plain(R.simplify(fr(1, 6, 4))), fr(2, 1, 2));
  assert.deepEqual(plain(R.reduceBy(fr(0, 12, 18), 2)), fr(0, 6, 9));
  assert.throws(() => R.reduceBy(fr(0, 9, 12), 2));
});

test('divideSteps: 2·3·5·7로 작은 수부터, 끝까지 못 줄이면 throw', () => {
  assert.deepEqual(plain(R.divideSteps(fr(0, 12, 18))), [{ k: 2, f: fr(0, 6, 9) }, { k: 3, f: fr(0, 2, 3) }]);
  assert.deepEqual(plain(R.divideSteps(fr(0, 7, 9))), []);
  assert.throws(() => R.divideSteps(fr(0, 11, 22)));
});

test('통분: 큰 분모의 배수 세기 = 최소공배수, 칩 배열, 문제 순서 유지', () => {
  assert.deepEqual(plain(R.commonDenominator(6, 8)), { d: 24, chips: [8, 16, 24] });
  assert.deepEqual(plain(R.commonDenominator(2, 8)), { d: 8, chips: [8] });
  assert.deepEqual(plain(R.commonDenominator(3, 4)), { d: 12, chips: [4, 8, 12] });
  assert.deepEqual(plain(R.toCommon(fr(0, 5, 6), fr(0, 3, 8))), { a: fr(0, 20, 24), b: fr(0, 9, 24), d: 24 });
  assert.equal(R.compare(fr(0, 2, 3), fr(0, 2, 5)), '>');
  assert.equal(R.compare(fr(0, 3, 8), fr(0, 2, 3)), '<');
  assert.equal(R.compare(fr(0, 2, 3), fr(0, 8, 12)), '=');
});

test('toDecimal: 분모 10 먼저, 100, 첫째 자리 0, 대분수, 안 되면 throw', () => {
  const t = (f) => R.toDecimal(f).text;
  assert.equal(t(fr(0, 2, 5)), '0.4');
  assert.equal(R.toDecimal(fr(0, 2, 5)).k, 2);
  assert.equal(t(fr(0, 3, 4)), '0.75');
  assert.equal(t(fr(0, 1, 25)), '0.04');
  assert.equal(R.toDecimal(fr(0, 1, 25)).places, 2);
  assert.equal(t(fr(1, 2, 5)), '1.4');
  assert.equal(t(fr(0, 3, 20)), '0.15');
  assert.throws(() => R.toDecimal(fr(0, 1, 3)));
});

function checkWrongs(M, p, label) {
  const ws = M.wrongChoices(p);
  assert.equal(ws.length, 2, label + ' 오답 2개');
  const toks = ws.map((w) => w.token);
  assert.ok(!toks.includes(p.answerText), label + ' 정답과 겹침 ' + toks + ' / ' + p.answerText);
  assert.notEqual(toks[0], toks[1], label + ' 오답끼리 겹침');
  for (const w of ws) {
    assert.ok(typeof w.mistake === 'string' && w.mistake, label + ' mistake 없음');
    if (w.value && typeof w.value === 'object' && 'd' in w.value) {
      assert.ok(w.value.d >= 1 && val(w.value) > 0, label + ' 오답 값 ' + JSON.stringify(w.value));
    }
  }
  return ws;
}

test('FracReduceCore 종류별 300개: 범위 안, 정답 글자, 오답 규칙', () => {
  const rng = seeded(51);
  const kinds = R.KIND_ORDER;
  assert.ok(kinds.includes('simplest-choose'));
  for (const kind of kinds) {
    for (let i = 0; i < 300; i++) {
      const p = R.makeProblem(kind, rng);
      const L = kind + ' ' + JSON.stringify(p);
      assert.equal(p.kind, kind);
      assert.equal(typeof p.answerText, 'string', L);
      if (kind === 'equiv-split') {
        assert.ok(p.a.d * p.k <= 24 && p.k >= 2 && p.k <= 4, L);
        assert.deepEqual(plain(p.answer), fr(0, p.a.n * p.k, p.a.d * p.k), L);
      } else if (kind === 'equiv-up') {
        assert.ok(p.target % p.a.d === 0 && p.target <= 24 && p.target > p.a.d, L);
        assert.equal(val(p.answer), val(p.a), L);
        assert.equal(p.answer.d, p.target, L);
      } else if (kind === 'reduce-by-2' || kind === 'reduce-by-3') {
        const k = kind === 'reduce-by-2' ? 2 : 3;
        assert.equal(p.k, k, L);
        assert.ok(p.a.n % k === 0 && p.a.d % k === 0 && p.a.d <= 24 && p.a.n < p.a.d, L);
        assert.ok(onlySmallPrimes(p.a.n) && onlySmallPrimes(p.a.d), L);
      } else if (kind === 'reduce-which') {
        const k = Number(p.answerText);
        assert.ok(p.a.n % k === 0 && p.a.d % k === 0, L);
        for (const w of checkWrongs(R, p, L)) {
          const x = Number(w.token);
          assert.ok(!(p.a.n % x === 0 && p.a.d % x === 0), L + ' 오답이 공약수');
        }
      } else if (kind.startsWith('simplest-') && kind !== 'simplest-pick') {
        assert.ok(p.a.d <= 24 && onlySmallPrimes(p.a.n) && onlySmallPrimes(p.a.d), L);
        if (kind === 'simplest-1') assert.equal(p.steps.length, 1, L);
        if (kind === 'simplest-2') assert.ok(p.steps.length >= 2, L);
        if (kind === 'simplest-choose') assert.ok(p.steps.length >= 1, L);
        assert.ok(simplest(p.answer) && val(p.answer) === val(p.a), L);
      } else if (kind === 'simplest-pick') {
        assert.ok(simplest(p.answer), L);
        for (const w of checkWrongs(R, p, L)) assert.ok(!simplest(w.value), L + ' 오답이 기약');
      } else if (kind.startsWith('common-')) {
        assert.ok(simplest(p.a) && simplest(p.b) && p.a.d !== p.b.d, L);
        assert.equal(p.d, lcm(p.a.d, p.b.d), L);
        assert.ok(p.d <= 24, L);
        const big = Math.max(p.a.d, p.b.d), small = Math.min(p.a.d, p.b.d);
        if (kind === 'common-multiple') assert.equal(big % small, 0, L);
        if (kind === 'common-coprime') assert.equal(gcd(big, small), 1, L);
        if (kind === 'common-lcm') assert.ok(big % small !== 0 && gcd(big, small) > 1 && p.d < big * small, L);
        assert.equal(p.answerText, `${p.answer.a.n}/${p.d}, ${p.answer.b.n}/${p.d}`, L);
      } else if (kind.startsWith('compare-') && kind !== 'compare-decimal') {
        assert.ok(lcm(p.a.d, p.b.d) <= 24 && p.a.d !== p.b.d, L);
        if (kind === 'compare-same-num') assert.equal(p.a.n, p.b.n, L);
        assert.equal(p.answer, R.compare(p.a, p.b), L);
      } else if (kind.startsWith('to-decimal-')) {
        assert.ok(simplest(p.a), L);
        assert.ok(!/0$/.test(p.answerText) && /^\d+\.\d+$/.test(p.answerText), L);
        if (kind === 'to-decimal-10') assert.ok([2, 5].includes(p.a.d), L);
        if (kind === 'to-decimal-100') assert.ok([4, 20, 25, 50].includes(p.a.d) && p.a.w === 0, L);
      } else if (kind === 'compare-decimal') {
        assert.ok([2, 4, 5].includes(p.a.d), L);
        const dv = Number(p.dec);
        const want = dv > val(p.a) ? '>' : dv < val(p.a) ? '<' : '=';
        assert.equal(p.answer, want, L);
      }
      if (kind.startsWith('compare-')) {
        const ws = checkWrongs(R, p, L);
        assert.deepEqual([p.answerText, ...ws.map((w) => w.token)].sort(), [...SYMS].sort(), L);
      } else if (kind !== 'simplest-1' && kind !== 'simplest-2') {
        checkWrongs(R, p, L);
      }
    }
  }
});

test('FracUnlikeCore 계산 예시와 throw', () => {
  const t = (x) => F.token(x.answer);
  assert.equal(t(U.addUnlike(fr(0, 1, 2), fr(0, 1, 3))), '5/6');
  const r = U.addUnlike(fr(0, 1, 6), fr(0, 1, 3));
  assert.equal(t(r), '1/2');
  assert.equal(F.token(r.raw), '3/6');
  assert.equal(t(U.addUnlike(fr(0, 5, 6), fr(0, 3, 4))), '1과 7/12');
  const s = U.subUnlike(fr(3, 1, 4), fr(1, 2, 3));
  assert.equal(t(s), '1과 7/12');
  assert.deepEqual(plain(s.split), fr(2, 15, 12));
  assert.equal(U.needsBorrow(fr(3, 1, 4), fr(1, 2, 3)), true);
  assert.equal(U.needsCarry(fr(0, 5, 6), fr(0, 3, 4)), true);
  assert.throws(() => U.subUnlike(fr(0, 1, 3), fr(0, 1, 2)));
});

test('FracUnlikeCore 종류별 300개: 입력 기약·분모 다름·공통분모 ≤ 24·약분 여부·답 기약', () => {
  const rng = seeded(52);
  for (const kind of U.KIND_ORDER) {
    for (let i = 0; i < 300; i++) {
      const p = U.makeProblem(kind, rng);
      const L = kind + ' ' + JSON.stringify(p);
      assert.ok(simplest(fr(0, p.a.n, p.a.d)) && simplest(fr(0, p.b.n, p.b.d)) && p.a.n >= 1 && p.b.n >= 1, L);
      assert.ok(p.a.d !== p.b.d && p.a.d <= 12 && p.b.d <= 12 && lcm(p.a.d, p.b.d) <= 24, L);
      const exact = p.op === '+' ? val(p.a) + val(p.b) : val(p.a) - val(p.b);
      assert.ok(Math.abs(val(p.answer) - exact) < 1e-9, L);
      assert.ok(simplest(fr(0, p.answer.n, p.answer.d)) && p.answer.n >= 1, L + ' 답 기약·분수 부분 있음');
      assert.equal(p.answerText, F.token(p.answer), L);
      const reducible = gcd(p.raw.n, p.raw.d) > 1;
      assert.equal(reducible, kind.endsWith('-reduce'), L + ' 약분 여부');
      if (kind.startsWith('add-proper') || kind.startsWith('sub-proper')) assert.ok(p.a.w === 0 && p.b.w === 0 && exact < 1, L);
      if (kind.startsWith('add-over')) assert.ok(exact > 1 && exact < 2, L);
      if (kind.startsWith('mixed-')) assert.ok(p.a.w >= 1 && p.b.w >= 1 && p.answer.w >= 1, L);
      if (kind === 'mixed-add') assert.equal(U.needsCarry(p.a, p.b), false, L);
      if (kind === 'mixed-add-carry') assert.equal(U.needsCarry(p.a, p.b), true, L);
      if (kind === 'mixed-sub' || kind === 'mixed-sub-reduce') assert.equal(U.needsBorrow(p.a, p.b), false, L);
      if (kind === 'mixed-sub-borrow') {
        assert.equal(U.needsBorrow(p.a, p.b), true, L);
        assert.ok(p.a.w - p.b.w >= 2 && p.split, L);
      }
      const ws = checkWrongs(U, p, L);
      if (kind.endsWith('-reduce')) assert.ok(ws.some((w) => w.mistake === 'not-reduced'), L + ' 약분 안 한 답 보기');
      if (kind === 'mixed-sub-borrow') assert.ok(ws.some((w) => w.mistake === 'borrow-kept'), L);
    }
  }
});

function roundKey(p) {
  const f = (x) => (x ? `${x.w}/${x.n}/${x.d}` : '-');
  const pair = [f(p.a), f(p.b)];
  if (p.op !== '-') pair.sort();
  return `${p.kind}|${pair.join('|')}|${p.k || ''}|${p.target || ''}|${p.dec || ''}|${p.answerText}`;
}

test('makeRound·makeMixedRound: 순서·중복 없음·한 종류 ≤ 3·쉬운 것 먼저·7관 섞기 제외', () => {
  for (const [M, name] of [[R, 'reduce'], [U, 'unlike']]) {
    const rng = seeded(name === 'reduce' ? 7 : 8);
    for (let lab = 1; lab <= 6; lab++) {
      for (let t = 0; t < 50; t++) {
        const round = M.makeRound(lab, rng);
        assert.deepEqual(plain(round.map((p) => p.kind)), plain(M.LAB_KINDS[lab]), name + lab);
      }
    }
    for (let t = 0; t < 300; t++) {
      const round = M.makeMixedRound(rng, 10);
      assert.equal(round.length, 10);
      const keys = round.map(roundKey);
      assert.equal(new Set(keys).size, 10, name + ' 섞기 중복 ' + keys);
      const cnt = {};
      for (const p of round) cnt[p.kind] = (cnt[p.kind] || 0) + 1;
      assert.ok(Object.values(cnt).every((c) => c <= 3), name + ' 한 종류 3번 넘음');
      const idx = plain(round.map((p) => M.KIND_ORDER.indexOf(p.kind)));
      assert.deepEqual(idx, [...idx].sort((x, y) => x - y), name + ' 정렬');
      assert.ok(round.every((p) => M.MIXED_KINDS.includes(p.kind)), name);
      if (name === 'reduce') assert.ok(!round.some((p) => ['equiv-split', 'simplest-1', 'simplest-2'].includes(p.kind)));
    }
  }
  const rng = seeded(9);
  let eq = 0;
  for (let t = 0; t < 2000; t++) if (R.makeProblem('compare-unlike', rng).answer === '=') eq++;
  assert.ok(eq > 100 && eq < 700, '크기 같은 쌍 비율 ' + eq);
});

test('두 화면: 상대 경로·실림 순서·800줄 미만·대문 카드 두 곳', async () => {
  const fs = await import('node:fs');
  const order = {
    'kids/subjects/math/fraction_reduce.html': ['math_explorer-ladder.js', 'fraction_add-core.js', 'fraction_reduce-core.js', 'fraction5-draw.js', 'fraction_reduce-labs.js'],
    'kids/subjects/math/fraction_unlike.html': ['math_explorer-ladder.js', 'fraction_add-core.js', 'fraction_reduce-core.js', 'fraction_unlike-core.js', 'fraction5-draw.js', 'fraction_unlike-labs.js']
  };
  for (const [page, names] of Object.entries(order)) {
    const html = read(page);
    assert.ok(!/(src|href)="\//.test(html), page + ' 루트 절대 경로');
    const at = names.map((n) => html.indexOf('./js/' + n));
    assert.ok(at.every((i) => i > 0), page + ' 스크립트 빠짐');
    assert.deepEqual(at, [...at].sort((x, y) => x - y), page + ' 실림 순서');
    assert.ok(html.includes('math_fraction5.css'), page);
  }
  for (const f of ['fraction_reduce-core.js', 'fraction_unlike-core.js', 'fraction5-draw.js', 'fraction_reduce-labs.js', 'fraction_unlike-labs.js']) {
    const n = read('kids/subjects/math/js/' + f).split('\n').length;
    assert.ok(n < 800, f + ' ' + n + '줄');
  }
  const gate = read('kids/subjects/math/math.html');
  for (const p of ['fraction_reduce.html', 'fraction_unlike.html']) {
    assert.equal(gate.split('href="' + p + '"').length - 1, 2, p + ' 대문 카드 두 곳(학년별·영역별)');
  }
  assert.ok(fs.existsSync('scripts/data/curriculum/math_5-1_4.json') && fs.existsSync('scripts/data/curriculum/math_5-1_5.json'));
});

test('MathDrill.ask onWrong 갈고리: 고른 글자와 오답 정보(mistake)를 넘긴다, 없으면 그대로', () => {
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(read('kids/subjects/math/js/math_explorer-ladder.js'), sandbox);
  const D = sandbox.window.MathDrill;
  let captured = null;
  const ui = { choiceQuestion: (o) => { captured = o; return {}; } };
  const seen = [];
  D.ask(ui, {
    question: 'q', answer: '1/2', wrongs: [{ token: '3/6', mistake: 'not-reduced' }, { token: '2/5', mistake: 'add-across' }],
    prefix: 'frac5u', kind: 'add-proper-reduce', onWrong: (text, w) => seen.push([text, w && w.mistake])
  });
  captured.onWrong('3/6');
  captured.onWrong('2/5');
  assert.deepEqual(seen, [['3/6', 'not-reduced'], ['2/5', 'add-across']]);
  D.ask(ui, { question: 'q', answer: '1/2', wrongs: [{ token: '3/6', mistake: 'x' }], prefix: 'p', kind: 'k' });
  assert.doesNotThrow(() => captured.onWrong('3/6'));
});

test('퀴즈 자료 5-1: 12제씩, 보기 3개, 정답 번호 범위, 글자 분수만, 해설에 보기 번호·금지 풀이 없음', () => {
  for (const f of ['math_5-1_4.json', 'math_5-1_5.json']) {
    const d = JSON.parse(read('scripts/data/curriculum/' + f));
    assert.equal(d.grade, '5-1');
    assert.equal(d.items.length, 12, f);
    for (const it of d.items) {
      assert.equal(it.choices.length, 3, it.title);
      assert.ok(it.answer >= 1 && it.answer <= 3, it.title);
      const all = it.question + it.choices.join() + it.explanation;
      assert.ok(!/\d+분의 \d+/.test(all), it.title + ' 글자 분수');
      assert.ok(!/\d번/.test(it.explanation), it.title + ' 보기 번호');
      assert.ok(!/가분수로 바꿔|분모끼리 곱|÷/.test(it.explanation), it.title + ' 금지 풀이');
    }
  }
});
