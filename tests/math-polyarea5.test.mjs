import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { read } from './split-rules.mjs';

// 5-1 다각형의 둘레와 넓이 순수 계산 부품 (docs/math_5-1_polyarea_spec.md §3-1·§4-1·§5·§6·§8)
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
const W = load(['kids/subjects/math/js/mixed_calc-core.js', 'kids/subjects/math/js/polygon_area-core.js']);
const M = W.MixCalcCore;
const C = W.PolyAreaCore;

const ALL_KINDS = ['peri-regular', 'peri-rect', 'peri-para', 'peri-para-h', 'area-count', 'area-rect', 'area-square', 'unit-m', 'unit-convert', 'unit-cm-m', 'para', 'tri', 'tri-out', 'rhombus', 'trapezoid'];
const TWO_STEP = ['para', 'tri', 'tri-out', 'rhombus', 'trapezoid'];
const UNIT = ['unit-m', 'unit-convert', 'unit-cm-m'];
const SMALL_POOL = { 'area-square': 7, 'unit-convert': 8 };
// 관 핵심 실수 (명세 §4-1 표의 ①). 3관 바꾸기 둘은 해시로 고르므로 없음.
const CORE = {
  'peri-regular': 'n-miss', 'peri-rect': 'half', 'peri-para-h': 'height', 'area-count': 'perimeter', 'area-rect': 'perimeter',
  'area-square': 'perimeter', 'unit-m': 'perimeter', para: 'slant', tri: 'half-miss', 'tri-out': 'half-miss', rhombus: 'half-miss', trapezoid: 'half-miss'
};
const num = (s) => Number(String(s).match(/[\d.]+/)[0]);
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const near = (x, y) => Math.abs(x - y) < 1e-9;
const shoelace = (pts) => pts.reduce((s, p, i) => { const q = pts[(i + 1) % pts.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0);
const exact = (tokens) => { const v = M.evalExact(tokens); return v && v.n / v.d; };

function problems(kind, n, seed) {
  const rng = seeded(seed);
  const out = [];
  for (let i = 0; i < n; i++) out.push(C.makeProblem(kind, rng));
  return out;
}

test('계약 예시: 공식·글자·단위', () => {
  const tx = (s) => M.text(M.parse(s));
  assert.equal(M.evalWith(M.parse('(8 + 5) × 2'), 'rule'), 26);
  assert.equal(M.evalWith(M.parse('8 × 5 ÷ 2'), 'rule'), 20);
  assert.equal(M.evalWith(M.parse('(4 + 10) × 5 ÷ 2'), 'rule'), 35);
  assert.equal(M.evalWith(M.parse('6 × 8 ÷ 2'), 'rule'), 24);
  assert.equal(tx('(4 + 10) × 5 ÷ 2'), '(4 + 10) × 5 ÷ 2');
  assert.ok(!near(exact(M.parse('5 × 5 ÷ 2')), 12) && near(exact(M.parse('5 × 5 ÷ 2')), 12.5), '홀수 ÷ 2는 분수 값');
  for (const kind of ALL_KINDS) {
    const p = C.makeProblem(kind, seeded(1));
    assert.equal(p.kind, kind);
    assert.ok(/^\d+ (cm|cm²|m²)$/.test(p.answerText), kind + ' answerText ' + p.answerText);
    assert.equal(p.answerText, p.value + ' ' + p.unit);
    assert.equal(p.twoStep, TWO_STEP.includes(kind), kind + ' twoStep');
    assert.ok(Array.isArray(p.cardLines) && p.cardLines.length >= 1, kind + ' 공식 카드');
    assert.ok(p.ask && /몇 (cm|cm²|m²)인가요\?$/.test(p.ask), kind + ' 묻는 말 ' + p.ask);
    if (/^(area|para|tri|rhombus|trapezoid|unit-m|unit-cm)/.test(kind)) assert.ok(p.ask.includes('넓이'), kind);
    if (/^peri/.test(kind)) assert.ok(p.ask.includes('둘레') && p.unit === 'cm', kind);
  }
  assert.ok(C.makeProblem('tri', seeded(2)).cardLines.some((l) => l.includes('밑변과 직각')), '삼각형 높이 말');
  assert.ok(C.makeProblem('trapezoid', seeded(2)).cardLines.some((l) => l.includes('윗변과 아랫변 사이')), '사다리꼴 높이 말');
  assert.ok(!C.makeProblem('rhombus', seeded(2)).cardLines.some((l) => l.includes('높이')), '마름모는 높이 줄 없음');
});

test('식 = 값, 범위, 풀 크기', () => {
  for (const kind of ALL_KINDS) {
    const pool = C.poolOf(kind);
    const need = SMALL_POOL[kind] || 30;
    assert.ok(pool.length >= need, kind + ' 풀 ' + pool.length);
    const keys = new Set();
    for (const p of problems(kind, 300, 7)) {
      keys.add(p.key);
      assert.equal(M.evalWith(p.formula.tokens, 'rule'), p.value, kind + ' 식 값 ' + p.formula.text);
      assert.equal(p.formula.text, M.text(p.formula.tokens));
      assert.ok(Number.isInteger(p.value) && p.value > 0);
      if (!UNIT.includes(kind)) {
        assert.ok(p.value <= 200, kind + ' 정답 ≤ 200 ' + p.formula.text);
        const sol = M.solve(p.formula.tokens);
        assert.ok(sol.marks.every((m) => m.value > 0 && m.value <= 200), kind + ' 중간값 ' + p.formula.text);
      }
    }
    assert.ok(keys.size >= Math.min(need, 25), kind + ' 300개 중 서로 다른 문제 ' + keys.size);
  }
});

test('그림 정합: 실제 비율(scale) — 시계 방향·상자·꼬리표 길이·높이·넓이·둘레', () => {
  for (const kind of ALL_KINDS) {
    for (const p of problems(kind, 300, 11)) {
      const f = plain(p.fig);
      const tag = kind + ' ' + p.formula.text;
      assert.ok(Array.isArray(f.points) && f.points.length >= 3, tag);
      assert.ok(shoelace(f.points) > 0, tag + ' 화면 시계 방향');
      assert.ok(Array.isArray(f.labels), tag);
      if (!f.scale) {
        assert.ok(['peri-regular', 'peri-para', ...UNIT].includes(kind), tag + ' 약도는 정해진 종류만');
        if (kind === 'peri-regular') assert.equal(f.points.length, p.formula.tokens[2], tag + ' 꼭짓점 수 = 변의 수');
        assert.ok(f.labels.length >= 1, tag + ' 약도 꼬리표');
        continue;
      }
      assert.ok(f.w <= 14 && f.h <= 8, tag + ' 상자 ' + f.w + '×' + f.h);
      for (const q of f.points) assert.ok(q[0] >= 0 && q[0] <= f.w && q[1] >= 0 && q[1] <= f.h, tag + ' 꼭짓점 상자 안');
      for (const l of f.labels) assert.ok(near(dist(l.a, l.b), num(l.text)), tag + ' 꼬리표 ' + l.text + ' ≠ ' + dist(l.a, l.b));
      if (f.diagonals) for (const d of f.diagonals) assert.ok(near(dist(d.a, d.b), num(d.text)), tag + ' 대각선 ' + d.text);
      if (p.measure === 'area' && kind !== 'area-count') assert.ok(near(shoelace(f.points) / 2, p.value), tag + ' 신발끈 넓이 ' + shoelace(f.points) / 2);
      if (kind === 'area-count') assert.ok(f.cells && f.labels.length === 0 && near(shoelace(f.points) / 2, p.value), tag);
      if (p.measure === 'perimeter') {
        const per = f.points.reduce((s, q, i) => s + dist(q, f.points[(i + 1) % f.points.length]), 0);
        assert.ok(near(per, p.value), tag + ' 둘레 ' + per);
      }
      const h = f.height;
      if (['para', 'tri', 'tri-out', 'trapezoid', 'peri-para-h'].includes(kind)) {
        assert.ok(h, tag + ' 높이');
        assert.ok(near(h.top[0], h.foot[0]) && near(h.foot[1], f.h), tag + ' 높이는 밑변(아래 가로)과 직각');
        assert.ok(near(Math.abs(h.foot[1] - h.top[1]), num(h.text)), tag + ' 높이 길이');
        const base = f.points.filter((q) => near(q[1], f.h)).map((q) => q[0]);
        const inside = h.foot[0] > Math.min(...base) && h.foot[0] < Math.max(...base);
        if (kind === 'tri-out') assert.ok(!inside && h.ext && near(h.ext.to[0], h.foot[0]), tag + ' 바깥 높이 + 연장선');
        else assert.ok(inside && !h.ext, tag + ' 높이 발이 밑변 안쪽');
        // 높이 점선이 도형 실선 변 위에 겹치지 않음
        for (let i = 0; i < f.points.length; i++) {
          const a = f.points[i], b = f.points[(i + 1) % f.points.length];
          const onEdge = near(a[0], b[0]) && near(a[0], h.top[0]);
          assert.ok(!onEdge, tag + ' 높이가 실선 변과 겹침');
        }
      } else if (kind !== 'peri-para') {
        assert.ok(!h, tag + ' 높이 없음');
      }
      if (kind === 'peri-para') assert.ok(!h, tag + ' 1관 평행사변형은 높이 없음');
    }
  }
});

function checkWrongs(w, p, step, tag) {
  assert.equal(w.length, 2, tag);
  const answerToken = step === 'f' ? p.formula.text : p.answerText;
  const toks = [answerToken, ...w.map((x) => x.token)];
  assert.equal(new Set(toks).size, 3, tag + ' 글자 겹침 ' + toks.join(' / '));
  for (const x of w) {
    assert.ok(typeof x.mistake === 'string' && x.mistake, tag);
    assert.ok(C.hintFor(p, x.mistake), tag + ' 힌트 없음 ' + x.mistake);
    if (step === 'f') {
      assert.ok(Array.isArray(x.value), tag);
      assert.equal(x.token, M.text(x.value), tag);
      if (x.mistake !== 'fix') assert.ok(!near(exact(x.value), p.value), tag + ' 오답 식 값 = 정답 ' + x.token);
    } else {
      assert.ok(Number.isInteger(x.value) && x.value > 0, tag + ' 양의 정수 ' + x.value);
      assert.equal(x.token, x.value + ' ' + p.unit, tag);
    }
  }
  if (step !== 'f') assert.equal(new Set([p.value, ...w.map((x) => x.value)]).size, 3, tag + ' 값 겹침');
}

test('오답 보기: 개수·겹침·값·힌트·보정 ≤ 10%·핵심 실수 ≥ 70%·크기 위치 ≤ 75%', () => {
  for (const kind of ALL_KINDS) {
    const steps = TWO_STEP.includes(kind) ? ['f', 'v', 'final'] : ['final'];
    for (const step of steps) {
      let fix = 0, core = 0, n = 0;
      const pos = [0, 0, 0];
      for (const p of problems(kind, 300, 31)) {
        const w = plain(C.wrongChoices(p, step));
        const tag = kind + ' ' + step + ' ' + p.formula.text;
        checkWrongs(w, p, step, tag);
        n++;
        if (w.some((x) => x.mistake === 'fix')) fix++;
        if (w.some((x) => x.mistake === CORE[kind])) core++;
        if (step !== 'f') pos[[p.value, ...w.map((x) => x.value)].filter((v) => v < p.value).length]++;
      }
      assert.ok(fix / n <= 0.1, kind + ' ' + step + ' 보정 보기 ' + fix + '/' + n);
      if ((step === 'f' || (step === 'final' && !TWO_STEP.includes(kind))) && CORE[kind]) assert.ok(core / n >= 0.7, kind + ' ' + step + ' 핵심 실수 ' + core + '/' + n);
      if (step !== 'f') assert.ok(Math.max(...pos) / n <= 0.75, kind + ' ' + step + ' 크기 위치 ' + pos.join('/'));
    }
  }
});

test('한 판·섞기: 개수, 중복, 6관 ③ 둘 다, 한 종류 ≤ 2, 차례', () => {
  const rng = seeded(5);
  assert.deepEqual(plain(C.LAB_KINDS[4]), ['para', 'para', 'para']);
  const third = new Set();
  for (let t = 0; t < 300; t++) {
    for (let lab = 1; lab <= 6; lab++) {
      const round = C.makeRound(lab, rng);
      assert.equal(round.length, 3);
      assert.equal(new Set(round.map((p) => p.key)).size, 3, '한 판 중복');
      round.forEach((p, i) => {
        const want = C.LAB_KINDS[lab][i];
        if (want === 'quad') assert.ok(['rhombus', 'trapezoid'].includes(p.kind));
        else assert.equal(p.kind, want);
      });
      if (lab === 6) third.add(round[2].kind);
    }
    const mixed = C.makeMixedRound(rng, 10);
    assert.equal(mixed.length, 10);
    assert.equal(new Set(mixed.map((p) => p.key)).size, 10);
    const count = {};
    for (const p of mixed) {
      count[p.kind] = (count[p.kind] || 0) + 1;
      assert.ok(C.MIXED_KINDS.includes(p.kind));
    }
    assert.ok(Object.values(count).every((c) => c <= 2));
    const idx = plain(mixed.map((p) => C.KIND_ORDER[p.kind]));
    assert.deepEqual(idx, [...idx].sort((x, y) => x - y));
  }
  assert.deepEqual([...third].sort(), ['rhombus', 'trapezoid'], '6관 ③ 마름모·사다리꼴 둘 다');
  assert.throws(() => C.makeRound(9, rng));
});

test('화면: 상대 경로·실림 순서·800줄 미만·대문 카드 두 곳', () => {
  const html = read('kids/subjects/math/polygon_area.html');
  assert.ok(!/(src|href)="\//.test(html), '루트 절대 경로');
  const names = ['math_explorer-ladder.js', 'mixed_calc-core.js', 'polygon_area-core.js', 'polygon_area-draw.js', 'polygon_area-labs.js'];
  const at = names.map((n) => html.indexOf('./js/' + n));
  assert.ok(at.every((i) => i > 0), '스크립트 빠짐');
  assert.deepEqual(at, [...at].sort((x, y) => x - y), '실림 순서');
  assert.ok(html.includes('math_polyarea.css') && html.includes('mx-theme-polyarea'));
  for (const f of ['polygon_area-core.js', 'polygon_area-draw.js', 'polygon_area-labs.js']) {
    const n = read('kids/subjects/math/js/' + f).split('\n').length;
    assert.ok(n < 800, f + ' ' + n + '줄');
  }
  const gate = read('kids/subjects/math/math.html');
  assert.equal(gate.split('href="polygon_area.html"').length - 1, 2, '대문 카드 두 곳');
});

test('퀴즈 자료 5-1 둘레와 넓이: 12제, 보기 3개, 단위 위첨자, 해설에 보기 번호 없음, 정답 검산', () => {
  const d = JSON.parse(read('scripts/data/curriculum/math_5-1_6.json'));
  assert.equal(d.grade, '5-1');
  assert.equal(d.unit, '6. 다각형의 둘레와 넓이');
  assert.equal(d.items.length, 12);
  for (const it of d.items) {
    assert.equal(it.choices.length, 3, it.title);
    assert.equal(new Set(it.choices).size, 3, it.title);
    assert.ok(it.answer >= 1 && it.answer <= 3, it.title);
    assert.ok(!/\d번/.test(it.explanation), it.title + ' 보기 번호');
    assert.ok(!/(cm|m)2/.test(it.question + it.choices.join() + it.explanation), it.title + ' 위첨자 ²');
    // 해설의 첫 식 「… = 식 = 값」을 계산해 정답 보기와 대조
    const m = it.explanation.match(/= ([\d\s+×÷()]+?) = (\d+) (cm²|cm)/);
    if (m) {
      assert.equal(M.evalWith(M.parse(m[1].trim()), 'rule'), Number(m[2]), it.title + ' 식 계산');
      assert.equal(it.choices[it.answer - 1], m[2] + ' ' + m[3], it.title + ' 정답 보기');
    }
  }
  const counts = [0, 0, 0];
  for (const it of d.items) counts[it.answer - 1]++;
  assert.ok(Math.max(...counts) <= 6, '정답 자리 치우침 ' + counts.join('/'));
});
