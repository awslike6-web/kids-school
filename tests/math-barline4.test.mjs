import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { read } from './split-rules.mjs';

// 4학년 막대그래프·꺾은선그래프 순수 계산 부품 (docs/math_4_graph_spec.md §4-1·§5·§6·§8)
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
const W = load(['kids/subjects/math/js/mixed_calc-core.js', 'kids/subjects/math/js/bar_line-core.js']);
const B = W.BarLineCore;

const KINDS = ['bar-scale', 'bar-read-scale', 'bar-read', 'bar-most', 'bar-diff', 'bar-times', 'bar-cells', 'bar-missing', 'line-scale', 'line-read', 'line-change', 'line-most', 'line-mid', 'wave-read', 'wave-change'];
const READ = ['bar-read', 'line-read', 'wave-read'];
// 관 핵심 실수(명세 §4-1 ①) — 종류#단계
const CORE = {
  'bar-scale#0': 'label-value', 'line-scale#0': 'label-value', 'bar-read-scale#0': 'label-value', 'bar-read-scale#1': 'cells-only',
  'bar-read#0': 'cells-only', 'line-read#0': 'cells-only', 'bar-most#0': 'opposite', 'bar-diff#0': 'bigger-only',
  'line-change#0': 'cells-diff', 'wave-change#0': 'cells-diff', 'bar-times#0': 'diff', 'bar-cells#0': 'value-as-cells',
  'bar-missing#0': 'forget-one', 'line-most#0': 'highest', 'wave-read#0': 'from-zero'
};
const num = (s) => Number(String(s).match(/-?\d+(\.\d+)?/)[0]);
const unitOf = (s) => String(s).replace(/-?\d+(\.\d+)?/, '');
function problems(kind, n, seed, opt) {
  const rng = seeded(seed);
  return Array.from({ length: n }, () => plain(B.makeProblem(kind, rng, opt || {})));
}
function targetIndex(p, st) {
  const c = p.chart;
  const names = c.cats.map((n, i) => ({ n, i })).filter((x) => st.ask.includes(x.n));
  names.sort((a, b) => b.n.length - a.n.length);
  return names.length ? names[0].i : -1;
}

test('그래프 자료: 값은 눈금 배수·축 안·하한, 숨긴 항목, scale·labelEvery 범위, 학년', () => {
  for (const kind of KINDS) {
    for (const opt of [{}, { mixed: true }]) {
      if (opt.mixed && !B.MIXED_KINDS.includes(kind)) continue;
      for (const p of problems(kind, 300, 3, opt)) {
        const c = p.chart, tag = kind + ' ' + p.key;
        assert.equal(p.grade, kind.startsWith('bar') ? '4-1' : '4-2', tag);
        assert.ok([2, 5, 10].includes(c.scale), tag + ' scale ' + c.scale);
        assert.ok([2, 5].includes(c.labelEvery), tag + ' labelEvery');
        assert.ok(c.cells >= 6 && c.cells <= 10, tag + ' cells ' + c.cells);
        assert.equal(c.cats.length, c.values.length, tag);
        if (c.type === 'bar') assert.ok(c.values.length >= 4 && c.values.length <= 6, tag);
        else assert.ok(c.values.length >= 5 && c.values.length <= 7, tag);
        for (const v of c.values) {
          assert.ok(Number.isInteger((v - c.base) / c.scale), tag + ' 눈금 배수 ' + v);
          assert.ok(v > c.base && v <= c.base + c.scale * c.cells, tag + ' 축 안 ' + v);
          assert.ok(v <= 200, tag);
        }
        if (c.base > 0) { assert.ok(c.base >= 20 && c.base % (c.scale * c.labelEvery) === 0, tag + ' base'); assert.equal(c.type, 'line'); }
        if (kind.startsWith('wave')) assert.ok(c.base > 0, tag);
        else assert.equal(c.base, 0, tag);
        if (kind === 'bar-cells' || kind === 'bar-missing') assert.equal(c.hidden.length, 1, tag + ' 숨긴 항목 하나');
        else assert.equal(c.hidden.length, 0, tag);
        if (kind === 'bar-cells') { assert.ok(Array.isArray(p.table) && p.table.length === c.cats.length && c.cats.length <= 5, tag); }
        else assert.equal(p.table, null, tag + ' 표는 bar-cells만');
        if (kind === 'bar-missing') { assert.equal(p.total, c.values.reduce((a, b) => a + b, 0), tag); assert.ok(c.cats.length <= 5 && p.total <= 200); }
        for (const st of p.steps) assert.ok(typeof st.ask === 'string' && st.answerText, tag);
      }
    }
  }
});

test('정답을 따로 계산해 대조', () => {
  for (const kind of KINDS) {
    for (const p of problems(kind, 300, 5)) {
      const c = p.chart, v = c.values, last = p.steps[p.steps.length - 1], tag = kind + ' ' + p.key;
      const first = c.scale * c.labelEvery;
      if (/scale/.test(kind)) assert.equal(p.steps[0].value, c.scale, tag + ' 눈금 한 칸');
      assert.ok(first > 0);
      if (READ.includes(kind) || kind === 'bar-read-scale') {
        const i = targetIndex(p, last);
        assert.ok(i >= 0, tag + ' 묻는 항목');
        assert.equal(last.value, v[i], tag + ' 읽은 값');
        assert.notEqual(((v[i] - c.base) / c.scale) % c.labelEvery, 0, tag + ' 숫자 적힌 눈금선 피함');
      }
      if (kind === 'bar-read' && p.steps.length === 1) assert.ok(['v', 'h'].includes(c.orient));
      if (kind === 'bar-most') {
        const most = /많은/.test(last.ask), want = most ? Math.max(...v) : Math.min(...v);
        assert.equal(v.filter((x) => x === want).length, 1, tag + ' 하나뿐');
        assert.equal(last.answerText, c.cats[v.indexOf(want)], tag);
      }
      if (kind === 'bar-diff' || kind === 'line-change' || kind === 'wave-change') assert.ok(last.value >= 1, tag);
      if (kind === 'bar-times') assert.ok(Number.isInteger(last.value) && last.value >= 2 && last.value <= 5 && /배$/.test(last.answerText), tag);
      if (kind === 'bar-cells') { const i = c.hidden[0]; assert.equal(last.value, v[i] / c.scale, tag); assert.ok(/칸$/.test(last.answerText)); assert.equal(p.table[i][1], v[i]); }
      if (kind === 'bar-missing') assert.equal(last.value, v[c.hidden[0]], tag);
      if (kind === 'line-most') {
        const d = v.slice(1).map((x, i) => x - v[i]), ab = d.map(Math.abs), mx = Math.max(...ab), at = ab.indexOf(mx);
        assert.equal(ab.filter((x) => x === mx).length, 1, tag + ' 가장 가파른 구간 하나');
        assert.ok(mx - Math.max(...ab.filter((_, i) => i !== at)) >= c.scale, tag + ' 둘째보다 한 칸 이상');
        assert.ok(new RegExp('^' + c.cats[at] + '[와과] ' + c.cats[at + 1] + ' 사이$').test(last.answerText), tag + ' ' + last.answerText);
        assert.ok(d[at] > 0 ? /늘어난/.test(last.ask) : /줄어든/.test(last.ask), tag + ' 방향');
      }
      if (kind === 'line-mid') {
        const i = last.reveal.mid[0];
        assert.equal(last.value, (v[i] + v[i + 1]) / 2, tag);
        assert.ok(Math.abs(v[i + 1] - v[i]) / c.scale >= 4 && (Math.abs(v[i + 1] - v[i]) / c.scale) % 2 === 0, tag + ' 4칸 이상 짝수 칸');
      }
      if (kind === 'wave-read') assert.ok(last.value > c.base, tag);
      for (let s = 1; s < v.length; s++) if (c.type === 'line') assert.notEqual(v[s], v[s - 1], tag + ' 이웃 점 값 다름');
    }
  }
});

test('오답(단계마다): 2개·겹침·1 이상·단위 같음·힌트·이름 오답 틀림·보정 ≤ 10%·핵심 실수 ≥ 70%·크기 자리 ≤ 75%', () => {
  for (const kind of KINDS) {
    const ps = problems(kind, 300, 9);
    for (let s = 0; s < ps[0].steps.length; s++) {
      let fix = 0, core = 0; const pos = [0, 0, 0];
      for (const p of ps) {
        const st = p.steps[s], w = plain(B.wrongChoices(p, s)), tag = kind + '#' + s + ' ' + p.key;
        assert.equal(w.length, 2, tag);
        assert.equal(new Set([st.answerText, ...w.map((x) => x.token)]).size, 3, tag + ' 겹침 ' + [st.answerText, ...w.map((x) => x.token)]);
        for (const x of w) {
          assert.ok(B.hintFor(p, x.mistake), tag);
          if (x.mistake === 'fix') fix++;
          if (st.choiceKind === 'value') {
            assert.ok(num(x.token) >= 1 && Number.isInteger(num(x.token)), tag + ' 1 이상 정수 ' + x.token);
            assert.equal(unitOf(x.token), unitOf(st.answerText), tag + ' 단위 ' + x.token);
          } else if (kind === 'bar-most') {
            const vi = p.chart.values[p.chart.cats.indexOf(x.token)];
            assert.ok(vi !== undefined && x.token !== st.answerText, tag + ' 이름 오답');
          } else if (kind === 'line-most') {
            assert.ok(/ 사이$/.test(x.token), tag);
          }
        }
        if (w.some((x) => x.mistake === CORE[kind + '#' + s])) core++;
        if (st.choiceKind === 'value') pos[[st.value, ...w.map((x) => num(x.token))].filter((x) => x < st.value).length]++;
      }
      assert.ok(fix / ps.length <= 0.1, kind + '#' + s + ' 보정 ' + fix);
      if (CORE[kind + '#' + s]) assert.ok(core / ps.length >= 0.7, kind + '#' + s + ' 핵심 실수 ' + core);
      if (ps[0].steps[s].choiceKind === 'value') assert.ok(Math.max(...pos) / ps.length <= 0.75, kind + '#' + s + ' 크기 자리 ' + pos);
    }
  }
});

test('풀 크기·한 판·섞기', () => {
  for (const kind of KINDS) assert.ok(B.poolOf(kind).length >= 30, kind + ' 풀 ' + B.poolOf(kind).length);
  assert.ok(B.TOPICS.bar.length >= 8 && B.TOPICS.line.length >= 6, '주제 틀 수');
  const rng = seeded(7);
  for (let t = 0; t < 300; t++) {
    for (let lab = 1; lab <= 6; lab++) {
      const r = plain(B.makeRound(lab, rng));
      assert.deepEqual(r.map((p) => p.kind), plain(B.LAB_KINDS[lab]));
      assert.equal(new Set(r.map((p) => p.key)).size, 3);
      if (lab === 1) assert.equal(r[2].chart.orient, 'h', '1관 ③ 가로 막대');
    }
    const m = plain(B.makeMixedRound(rng, 10));
    assert.equal(m.length, 10);
    assert.equal(new Set(m.map((p) => p.key)).size, 10);
    const byKind = {};
    let bars = 0, lines = 0;
    for (const p of m) {
      byKind[p.kind] = (byKind[p.kind] || 0) + 1;
      assert.ok(B.MIXED_KINDS.includes(p.kind)); assert.equal(p.steps.length, 1);
      if (p.kind.startsWith('bar')) bars++; else lines++;
    }
    assert.ok(Object.values(byKind).every((x) => x <= 2));
    assert.ok(bars >= 4 && lines >= 4, '막대·꺾은선 4개 이상씩');
    const idx = plain(m.map((p) => B.KIND_ORDER[p.kind]));
    assert.deepEqual(idx, [...idx].sort((a, b) => a - b));
  }
  assert.throws(() => B.makeRound(9, rng));
});

test('퀴즈 자료 4-1 막대그래프·4-2 꺾은선그래프: 6제씩, Q01~Q12, 보기 3개, 해설에 보기 번호 없음', () => {
  const files = [['math_4-1_5.json', '4-1', '5. 막대그래프', 1], ['math_4-2_5.json', '4-2', '5. 꺾은선그래프', 7]];
  const counts = [0, 0, 0];
  for (const [f, grade, unit, first] of files) {
    const d = JSON.parse(read('scripts/data/curriculum/' + f));
    assert.equal(d.grade, grade); assert.equal(d.unit, unit); assert.equal(d.items.length, 6);
    d.items.forEach((it, i) => {
      assert.ok(it.title.startsWith('Q' + String(first + i).padStart(2, '0') + ' '), it.title);
      assert.equal(it.choices.length, 3); assert.equal(new Set(it.choices).size, 3);
      assert.ok(it.answer >= 1 && it.answer <= 3); counts[it.answer - 1]++;
      assert.ok(!/\d번/.test(it.explanation), it.title);
    });
  }
  assert.ok(Math.max(...counts) <= 6, '정답 자리 ' + counts);
});

test('화면: 상대 경로·실림 순서·800줄 미만·대문 카드 두 곳·두 학년 퀴즈', () => {
  const html = read('kids/subjects/math/bar_line.html');
  assert.ok(!/(src|href)="\//.test(html), '루트 절대 경로');
  const names = ['math_explorer-quiz.js', 'math_explorer-ladder.js', 'mixed_calc-core.js', 'bar_line-core.js', 'bar_line-draw.js', 'bar_line-labs.js'];
  const at = names.map((n) => html.indexOf('./js/' + n));
  assert.ok(at.every((i) => i > 0), '스크립트 빠짐 ' + at);
  assert.deepEqual(at, [...at].sort((x, y) => x - y), '실림 순서');
  assert.ok(html.includes('math_barline.css') && html.includes('mx-theme-barline'));
  for (const f of ['bar_line-core.js', 'bar_line-draw.js', 'bar_line-labs.js']) {
    const n = read('kids/subjects/math/js/' + f).split('\n').length;
    assert.ok(n < 800, f + ' ' + n + '줄');
  }
  const gate = read('kids/subjects/math/math.html');
  assert.equal(gate.split('href="bar_line.html"').length - 1, 2, '대문 카드 두 곳');
  const labs = read('kids/subjects/math/js/bar_line-labs.js');
  assert.ok(/grade: '4-1', unit: '5\. 막대그래프'/.test(labs) && /grade: '4-2', unit: '5\. 꺾은선그래프'/.test(labs), '퀴즈 두 학년');
});
