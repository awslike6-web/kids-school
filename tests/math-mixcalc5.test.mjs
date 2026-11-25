import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { read } from './split-rules.mjs';

// 5-1 자연수의 혼합 계산 순수 계산 부품 (docs/math_5-1_mixcalc_spec.md §4-1·§5·§6·§8)
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
const W = load(['kids/subjects/math/js/mixed_calc-core.js']);
const M = W.MixCalcCore;
const MINUS = '−';
const OPS = ['+', MINUS, '×', '÷'];
const STEP_KINDS = ['as', 'as-paren', 'md', 'md-paren', 'asm', 'asm-3', 'asm-paren', 'asd', 'asd-3', 'asd-paren', 'all', 'all-paren'];
const STORY_KINDS = ['story', 'story-paren'];
const isOp = (t) => OPS.includes(t);
const opsOf = (tokens) => tokens.filter(isOp);
// 관 핵심 순서 실수 (명세 §4-1)
const coreMistake = (kind) => (/paren/.test(kind) ? 'paren-ignored' : /^(as|md)$/.test(kind) ? 'order-right' : /^(asm|asd)/.test(kind) ? 'order-left' : null);
const P = (text) => plain(M.parse(text));

test('계약 예시: solve·text·evalWith', () => {
  const s1 = M.solve(P('12 + 4 × 3'));
  assert.equal(s1.value, 24);
  assert.deepEqual(plain(s1.lines).map((l) => M.text(l)), ['12 + 4 × 3', '12 + 12', '24']);
  assert.deepEqual(plain(s1.order), [3, 1]);
  assert.equal(M.solve(P('35 − 12 + 8')).value, 31);
  const s3 = M.solve(P('35 − (12 + 8)'));
  assert.equal(s3.value, 15);
  assert.deepEqual(plain(s3.marks[0]), { from: 2, to: 6, value: 20 }, '괄호를 지우는 계산은 괄호 포함');
  assert.equal(M.solve(P('48 ÷ 6 × 2')).value, 16);
  assert.equal(M.solve(P('36 ÷ (2 × 3)')).value, 6);
  const s6 = M.solve(P('20 − 3 × 4 + 5'));
  assert.equal(s6.value, 13);
  assert.deepEqual(plain(s6.order).map((i) => P('20 − 3 × 4 + 5')[i]), ['×', MINUS, '+']);
  assert.equal(M.solve(P('24 ÷ (2 + 4) × 3')).value, 12);
  assert.equal(M.text(P('35 − (12 + 8)')), '35 − (12 + 8)');
  assert.equal(M.evalWith(P('12 + 4 × 3'), 'left'), 48);
  assert.equal(M.evalWith(P('35 − 12 + 8'), 'right'), 15);
  assert.equal(M.evalWith(P('35 − (12 + 8)'), 'noparen'), 31);
  assert.equal(M.evalWith(P('12 + 4 × 3'), 'rule'), 24);
  assert.equal(M.evalWith(P('7 ÷ 2 + 1'), 'rule'), null, '나누어떨어지지 않으면 null');
  assert.deepEqual(plain(M.stripParens(P('35 − (12 + 8)'))), plain(P('35 − 12 + 8')));
  assert.deepEqual(plain(M.evalExact(P('13 + 7 ÷ 4'))), { n: 59, d: 4 });
});

function checkSolution(p, ctx) {
  const s = p.solution;
  assert.equal(s.lines.length, opsOf(p.tokens).length + 1, ctx + ' 줄 수');
  for (let i = 0; i < s.marks.length; i++) {
    const { from, to, value } = s.marks[i];
    const line = plain(s.lines[i]);
    const replaced = [...line.slice(0, from), value, ...line.slice(to + 1)];
    assert.deepEqual(replaced, plain(s.lines[i + 1]), ctx + ' marks 정합 ' + i);
  }
  const first = plain(s.lines[0]);
  assert.ok(plain(s.order).every((i) => isOp(first[i])), ctx + ' order는 첫 줄 연산 위치');
  assert.equal(new Set(plain(s.order)).size, opsOf(first).length, ctx + ' order 전부');
  // 바른 풀이의 모든 단계가 수 규칙 안 (§5)
  for (let i = 0; i < s.marks.length; i++) {
    const v = s.marks[i].value;
    assert.ok(Number.isInteger(v) && v >= 1 && v <= 99, ctx + ' 중간값 범위 ' + v);
  }
  assert.equal(s.value, p.answer, ctx);
  assert.ok(!/-/.test(p.text), ctx + ' ASCII 빼기');
}

function checkWrongs(w, answerText, ctx) {
  assert.equal(w.length, 2, ctx + ' 오답 2개');
  const toks = new Set([answerText]);
  for (const x of w) {
    assert.ok(!toks.has(x.token), ctx + ' 겹침 ' + x.token);
    toks.add(x.token);
    assert.ok(typeof x.mistake === 'string' && x.mistake, ctx + ' mistake');
    assert.ok(!/-/.test(x.token), ctx + ' ASCII 빼기');
  }
}

test('단계 종류: seed 300개·풀 40개 이상·범위·순서가 뜻을 가짐·단계 오답', () => {
  const rng = seeded(11);
  for (const kind of STEP_KINDS) {
    const seen = new Set();
    let core = 0, coreTotal = 0, fix = 0, total = 0, majority = 0, stepCount = 0;
    const pos = [0, 0, 0];
    for (let i = 0; i < 300; i++) {
      const p = M.makeProblem(kind, rng);
      const ctx = kind + ' ' + p.text;
      seen.add(p.text);
      assert.equal(p.kind, kind);
      checkSolution(p, ctx);
      const n = opsOf(p.tokens).length;
      assert.ok(n === (/-3$|^all/.test(kind) ? 3 : 2) || (kind === 'asm-paren' || kind === 'asd-paren'), ctx + ' 연산 수');
      const ops = opsOf(p.tokens);
      if (kind.startsWith('all')) assert.ok(ops.includes('×') && ops.includes('÷'), ctx + ' × ÷ 둘 다');
      if (/paren/.test(kind)) {
        assert.ok(p.tokens.includes('('), ctx + ' 괄호');
        assert.notEqual(M.evalWith(p.tokens, 'noparen'), p.answer, ctx + ' 괄호가 뜻을 가짐');
      } else if (/^(asm|asd)/.test(kind)) {
        assert.ok(!['×', '÷'].includes(p.tokens[1]), ctx + ' × ÷가 맨 앞 아님');
        assert.notEqual(M.evalWith(p.tokens, 'left'), p.answer, ctx);
      } else if (kind === 'as' || kind === 'md') {
        assert.ok(p.tokens[1] === (kind === 'as' ? MINUS : '÷'), ctx + ' a − b ± c / a ÷ b ×÷ c');
      }
      assert.equal(p.steps.length, n, ctx);
      for (let s = 0; s < n; s++) {
        const st = p.steps[s];
        const w = M.wrongChoices(p, s);
        checkWrongs(w, st.answerText, ctx + ' s' + s);
        total += 2;
        fix += w.filter((x) => x.mistake === 'fix').length;
        if (s < n - 1) {
          stepCount++;
          for (const x of w) {
            assert.ok(Array.isArray(x.value), ctx + ' 식 줄 보기');
            assert.equal(M.text(x.value), x.token);
            const fin = M.evalWith(x.value, 'rule');
            assert.notEqual(fin, p.answer, ctx + ' 오답 줄 최종값 = 정답 ' + x.token);
          }
          const cm = coreMistake(kind);
          if (cm && s === 0) { coreTotal++; if (w.some((x) => x.mistake === cm)) core++; }
          // 바른 위치를 줄인 꼴: 정답 줄과 길이·앞뒤가 같은 보기 수
          const ans = plain(st.answer);
          const sameShape = w.filter((x) => x.value.length === ans.length && M.text(x.value).split(' ').filter((t, j) => t !== M.text(ans).split(' ')[j]).length === 1).length;
          if (sameShape === 1) majority++;
        } else {
          assert.equal(typeof st.answer, 'number', ctx + ' 마지막 단계는 수');
          const all = [st.answer, ...w.map((x) => x.value)];
          pos[all.filter((v) => v < all[0]).length]++;
        }
      }
    }
    assert.ok(seen.size >= 40, kind + ' 서로 다른 문제 ' + seen.size);
    assert.ok(fix / total <= 0.1, kind + ' 보정 보기 ' + fix + '/' + total);
    if (coreTotal) assert.ok(core / coreTotal >= 0.7, kind + ' 핵심 순서 실수 출현 ' + core + '/' + coreTotal);
    if (stepCount) assert.ok(majority / stepCount <= 0.6, kind + ' 바른 꼴 2:1 비율 ' + majority + '/' + stepCount);
    assert.ok(Math.max(...pos) / 300 <= 0.75, kind + ' 마지막 단계 크기 위치 ' + pos.join('/'));
  }
});

test('7관 최종 답 보기: 겹침·꼴·크기 위치 ≤ 75%·중간값 ≤ 50(all-paren)', () => {
  const rng = seeded(21);
  const pos = {};
  for (let t = 0; t < 200; t++) {
    const round = M.makeMixedRound(rng, 10);
    for (const p of round) {
      const w = M.wrongChoices(p);
      checkWrongs(w, p.answerText, '7관 ' + p.text);
      for (const x of w) assert.equal(typeof x.value, 'number');
      if (p.kind === 'all-paren') assert.ok(p.solution.marks.slice(0, -1).every((m) => m.value <= 50), '7관 all-paren 중간값 ≤ 50 ' + p.text);
      const all = [p.answer, ...w.map((x) => x.value)];
      (pos[p.kind] = pos[p.kind] || [0, 0, 0])[all.filter((v) => v < all[0]).length]++;
    }
  }
  for (const [k, c] of Object.entries(pos)) {
    const n = c[0] + c[1] + c[2];
    assert.ok(Math.max(...c) / n <= 0.75, k + ' 7관 크기 위치 ' + c.join('/'));
  }
});

test('6관 문장: 틀 전수·수 일치·괄호 필요·오답 값 다름·괄호 개수', () => {
  const byKind = { story: 0, 'story-paren': 0 };
  for (const s of M.STORIES) byKind[s.kind]++;
  assert.ok(byKind.story >= 6 && byKind['story-paren'] >= 6, '틀 개수 ' + JSON.stringify(byKind));
  for (let ti = 0; ti < M.STORIES.length; ti++) {
    const tpl = M.STORIES[ti];
    const rng = seeded(100 + ti);
    for (let i = 0; i < 60; i++) {
      const o = tpl.make(rng);
      const ctx = tpl.kind + ' 틀' + ti + ' ' + o.story;
      assert.ok(o.story.length <= 70, ctx + ' 문장 길이');
      assert.ok(typeof o.ask === 'string' && /\?$/.test(o.ask), ctx + ' 묻는 말');
      const nums = o.tokens.filter((t) => typeof t === 'number');
      for (const n of nums) assert.ok(o.story.includes(String(n)), ctx + ' 문장 속 수 ' + n);
      const val = M.evalExact(o.tokens);
      assert.ok(val && val.d === 1 && val.n >= 1, ctx + ' 정답 값 자연수');
      if (tpl.kind === 'story-paren') {
        const np = M.evalExact(M.stripParens(o.tokens));
        assert.ok(!np || np.n * val.d !== val.n * np.d, ctx + ' 괄호가 꼭 필요');
      }
      assert.equal(o.wrongs.length, 2, ctx);
      const texts = new Set([M.text(o.tokens)]);
      let sameParen = 0;
      for (const w of o.wrongs) {
        const t = M.text(w.tokens);
        assert.ok(!texts.has(t), ctx + ' 오답 식 겹침');
        texts.add(t);
        const v = M.evalExact(w.tokens);
        assert.ok(!v || v.n * val.d !== val.n * v.d, ctx + ' 오답 식 값 = 정답 ' + t);
        assert.ok(['paren-missing', 'paren-wrong', 'op-swap-as', 'op-swap-md', 'num-swap'].includes(w.mistake), ctx + ' mistake');
        if (w.tokens.filter((x) => x === '(').length === o.tokens.filter((x) => x === '(').length) sameParen++;
      }
      if (tpl.kind === 'story-paren') assert.ok(sameParen >= 1, ctx + ' 괄호 개수 같은 오답');
    }
  }
  const rng = seeded(7);
  for (const kind of STORY_KINDS) {
    const seen = new Set();
    for (let i = 0; i < 300; i++) {
      const p = M.makeProblem(kind, rng);
      seen.add(p.story);
      assert.equal(p.answerText, M.text(p.tokens));
      assert.ok(p.ask, kind + ' 문제 객체에 묻는 말');
      checkWrongs(M.wrongChoices(p), p.answerText, kind + ' ' + p.story);
    }
    assert.ok(seen.size >= 40, kind + ' 서로 다른 문제 ' + seen.size);
  }
});

test('한 판·섞기: 개수, 중복, 한 종류 ≤ 3, 차례', () => {
  const rng = seeded(5);
  assert.deepEqual(plain(M.LAB_KINDS[1]), ['as', 'as', 'as-paren']);
  assert.deepEqual(plain(M.LAB_KINDS[5]), ['all', 'all', 'all-paren']);
  assert.deepEqual(plain(M.LAB_KINDS[6]), ['story', 'story', 'story-paren']);
  for (let t = 0; t < 300; t++) {
    for (let lab = 1; lab <= 6; lab++) {
      const round = M.makeRound(lab, rng);
      assert.deepEqual(plain(round.map((p) => p.kind)), plain(M.LAB_KINDS[lab]));
      assert.equal(new Set(round.map((p) => p.kind + '|' + (p.text || p.story))).size, 3);
    }
    const mixed = M.makeMixedRound(rng, 10);
    assert.equal(mixed.length, 10);
    assert.equal(new Set(mixed.map((p) => p.kind + '|' + p.text)).size, 10);
    const count = {};
    for (const p of mixed) {
      count[p.kind] = (count[p.kind] || 0) + 1;
      assert.ok(M.MIXED_KINDS.includes(p.kind));
    }
    assert.ok(Object.values(count).every((c) => c <= 3));
    const idx = plain(mixed.map((p) => M.KIND_ORDER[p.kind]));
    assert.deepEqual(idx, [...idx].sort((x, y) => x - y));
  }
  assert.throws(() => M.makeRound(9, rng));
});

test('화면: 상대 경로·실림 순서·800줄 미만·대문 카드 두 곳', () => {
  const html = read('kids/subjects/math/mixed_calc.html');
  assert.ok(!/(src|href)="\//.test(html), '루트 절대 경로');
  const names = ['math_explorer-ladder.js', 'mixed_calc-core.js', 'mixed_calc-labs.js'];
  const at = names.map((n) => html.indexOf('./js/' + n));
  assert.ok(at.every((i) => i > 0), '스크립트 빠짐');
  assert.deepEqual(at, [...at].sort((x, y) => x - y), '실림 순서');
  assert.ok(html.includes('math_mixcalc.css') && html.includes('mx-theme-mixcalc'));
  for (const f of ['mixed_calc-core.js', 'mixed_calc-labs.js']) {
    const n = read('kids/subjects/math/js/' + f).split('\n').length;
    assert.ok(n < 800, f + ' ' + n + '줄');
  }
  const gate = read('kids/subjects/math/math.html');
  assert.equal(gate.split('href="mixed_calc.html"').length - 1, 2, '대문 카드 두 곳');
});

test('퀴즈 자료 5-1 혼합 계산: 12제, 보기 3개, U+2212만, 해설에 보기 번호 없음, 식 정답 검산', () => {
  const d = JSON.parse(read('scripts/data/curriculum/math_5-1_1.json'));
  assert.equal(d.grade, '5-1');
  assert.equal(d.unit, '1. 자연수의 혼합 계산');
  assert.equal(d.items.length, 12);
  for (const it of d.items) {
    assert.equal(it.choices.length, 3, it.title);
    assert.equal(new Set(it.choices).size, 3, it.title);
    assert.ok(it.answer >= 1 && it.answer <= 3, it.title);
    assert.ok(!/\d번/.test(it.explanation), it.title + ' 보기 번호');
    assert.ok(!/\d\s*-\s*\d/.test(it.question + it.choices.join() + it.explanation), it.title + ' ASCII 빼기');
    const m = it.question.match(/^([\d\s+×÷()−]+)(?:은|는) 얼마/);
    if (m) assert.equal(it.choices[it.answer - 1], String(M.solve(P(m[1].trim())).value), it.title);
  }
});
