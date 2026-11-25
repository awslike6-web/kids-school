import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { read } from './split-rules.mjs';

// 4-2 삼각형·사각형·다각형 순수 계산 부품 (docs/math_4-2_shapes_spec.md §3-1·§4-1·§5·§6·§8)
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
const CORE_FILES = ['kids/subjects/math/js/mixed_calc-core.js', 'kids/subjects/math/js/tri_quad-geo.js', 'kids/subjects/math/js/tri_quad-core.js'];
const W = load(CORE_FILES);
const T = W.TriQuadCore;

const KINDS = ['iso-side', 'iso-base', 'iso-apex', 'angle-class', 'two-criteria', 'perp-side', 'par-pairs', 'par-dist', 'quad-name', 'para-angle', 'para-side', 'rhom-angle', 'rhom-side', 'quad-rel', 'poly-name', 'diag-one', 'diag-count'];
const TRI = ['iso-side', 'iso-base', 'iso-apex', 'angle-class', 'two-criteria'];
const SHAPE_ONLY = ['perp-side', 'par-pairs', 'quad-name', 'quad-rel', 'poly-name', 'diag-one', 'diag-count', 'par-dist'];
// 관 핵심 실수(명세 §4-1 ①) — 값 보기 종류·단계별
const CORE = {
  'iso-side': ['one-same', 'iso-two'], 'iso-base#0': ['same-apex'], 'iso-base#1': ['half-miss'], 'iso-apex': ['one-base'],
  'angle-class#0': ['one-angle'], 'two-criteria#0': ['one-base'], 'para-angle': ['same', 'neighbor'], 'rhom-angle': ['same', 'neighbor'],
  'para-side': ['half'], 'rhom-side': ['side-two'], 'par-dist': ['slant'], 'diag-one': ['with-neighbors'], 'diag-count': ['double']
};
const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const len = (v) => Math.hypot(v[0], v[1]);
const dist = (a, b) => len(sub(a, b));
const shoelace = (pts) => pts.reduce((s, p, i) => { const q = pts[(i + 1) % pts.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0);
function angleAt(pts, i) {
  const n = pts.length, P = pts[i], u = sub(pts[(i - 1 + n) % n], P), v = sub(pts[(i + 1) % n], P);
  return (Math.acos(Math.max(-1, Math.min(1, (u[0] * v[0] + u[1] * v[1]) / (len(u) * len(v))))) * 180) / Math.PI;
}
const edge = (pts, i) => sub(pts[(i + 1) % pts.length], pts[i]);
const isParallel = (a, b) => Math.abs(a[0] * b[1] - a[1] * b[0]) / (len(a) * len(b)) < Math.sin((0.5 * Math.PI) / 180);
const num = (s) => Number(String(s).match(/-?\d+(\.\d+)?/)[0]);
const triName = (maxA) => (maxA < 89.5 ? '예각삼각형' : maxA < 90.5 ? '직각삼각형' : '둔각삼각형');
function parallelPairs(pts) {
  let c = 0;
  for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) if (isParallel(edge(pts, i), edge(pts, j))) c++;
  return c;
}
function edgeIndexByName(f, name) {
  const [a, b] = name.replace('변 ', '').split('');
  const ia = f.vertexNames.indexOf(a), ib = f.vertexNames.indexOf(b), n = f.points.length;
  if ((ia + 1) % n === ib) return ia;
  if ((ib + 1) % n === ia) return ib;
  return -1;
}
function quadType(f) {
  const rights = (f.angles || []).filter((a) => a.right).length;
  if (rights === 4) return (f.ticks || []).length === 4 ? '정사각형' : '직사각형';
  if ((f.ticks || []).length === 4) return '마름모';
  if ((f.parallels || []).length === 2) return '평행사변형';
  if ((f.parallels || []).length === 1) return '사다리꼴';
  return '사다리꼴이 아닌 사각형';
}
function problems(kind, n, seed, opt) {
  const rng = seeded(seed);
  return Array.from({ length: n }, () => plain(T.makeProblem(kind, rng, opt || {})));
}

test('그림 정합: 시계 방향·볼록·상자·각·평행·직각·같은 길이·길이 비율', () => {
  for (const kind of KINDS) {
    for (const opt of [{}, { mixed: true }]) {
      if (opt.mixed && !T.MIXED_KINDS.includes(kind)) continue;
      for (const p of problems(kind, 300, 3, opt)) {
        const f = p.fig, tag = kind + (opt.mixed ? '(7관) ' : ' ') + p.key;
        assert.ok(f.w <= 12 + 1e-9 && f.h <= 8 + 1e-9, tag + ' 상자 ' + f.w + '×' + f.h);
        const pts = f.points || [];
        for (const q of pts) assert.ok(q[0] >= -1e-9 && q[0] <= f.w + 1e-9 && q[1] >= -1e-9 && q[1] <= f.h + 1e-9, tag + ' 상자 안');
        if (pts.length) {
          assert.ok(shoelace(pts) > 0, tag + ' 화면 시계 방향');
          pts.forEach((_, i) => { const a = angleAt(pts, i); assert.ok(a > 0 && a < 170 + 1e-6, tag + ' 볼록 ' + a); });
          if (TRI.includes(kind)) pts.forEach((_, i) => assert.ok(angleAt(pts, i) >= 30 - 0.5, tag + ' 삼각형 각 ≥ 30°'));
        }
        for (const a of f.angles || []) {
          const real = angleAt(pts, a.at);
          if (a.right) assert.ok(near(real, 90, 0.5), tag + ' 직각 표시는 실제 90° ' + real);
          if (/°$/.test(a.text || '')) assert.ok(near(real, num(a.text), 0.5), tag + ' 적힌 각 ' + a.text + ' ≠ ' + real.toFixed(2));
          if (a.text === '?') assert.ok(!a.right, tag + ' ? 각에 처음부터 직각 표시');
        }
        for (const [i, j] of f.parallels || []) assert.ok(isParallel(edge(pts, i), edge(pts, j)), tag + ' 평행 표시');
        if ((f.ticks || []).length >= 2) {
          const ls = f.ticks.map((i) => len(edge(pts, i)));
          assert.ok(Math.max(...ls) / Math.min(...ls) < 1.01, tag + ' 같은 길이 빗금 ' + ls.map((x) => x.toFixed(2)));
        }
        const lab = (f.labels || []).filter((l) => /cm/.test(l.text));
        if (lab.length >= 2) {
          const r = lab.map((l) => dist(l.a, l.b) / num(l.text));
          assert.ok(Math.max(...r) / Math.min(...r) < 1.02, tag + ' 길이 비율 ' + lab.map((l) => l.text));
        }
        for (const s of f.segments || []) if (s.kind === 'seg' && s.text) assert.ok(near(dist(s.a, s.b), num(s.text), 1e-3), tag + ' 선분 길이 ' + s.text);
        for (const st of p.steps) if (st.reveal && st.reveal.angle !== undefined) {
          assert.ok(near(angleAt(pts, st.reveal.angle), num(st.reveal.text), 0.5), tag + ' 드러날 각');
          assert.equal(Boolean(st.reveal.right), near(num(st.reveal.text), 90), tag + ' 90°면 직각 표시');
        }
      }
    }
  }
});

test('정답을 따로 계산해 대조', () => {
  for (const kind of KINDS) {
    for (const p of problems(kind, 300, 5)) {
      const f = p.fig, pts = f.points, last = p.steps[p.steps.length - 1], tag = kind + ' ' + p.key;
      if (TRI.includes(kind)) {
        const angs = pts.map((_, i) => angleAt(pts, i));
        if (kind === 'angle-class' || kind === 'two-criteria') {
          const nm = triName(Math.max(...angs));
          assert.ok(last.answerText.endsWith(nm), tag + ' 이름 ' + last.answerText + ' / ' + nm);
          if (kind === 'two-criteria') assert.ok(last.answerText.startsWith('이등변삼각형이면서 '), tag);
        }
        if (kind === 'angle-class') {
          const given = f.angles.filter((a) => /°$/.test(a.text)).map((a) => num(a.text));
          assert.equal(given.length, 2, tag);
          assert.equal(p.steps[0].value, 180 - given[0] - given[1], tag + ' 나머지 각');
        }
        if (kind === 'iso-base') {
          const x = num(f.angles.find((a) => /°$/.test(a.text)).text);
          assert.equal(p.steps[0].value, 180 - x); assert.equal(p.steps[1].value, (180 - x) / 2);
          assert.notEqual(x, 60); assert.notEqual(x, 90);
        }
        if (kind === 'iso-apex') { const y = num(f.angles.find((a) => /°$/.test(a.text)).text); assert.equal(last.value, 180 - 2 * y); assert.notEqual(y, 60); }
      }
      if (kind === 'par-pairs') assert.equal(last.value, parallelPairs(pts), tag + ' 평행 쌍');
      if (kind === 'perp-side') {
        const ref = edgeIndexByName(f, p.steps[0].ask.match(/변 \S\S/)[0]);
        const ans = edgeIndexByName(f, last.answerText);
        assert.ok(ref >= 0 && ans >= 0, tag + ' 변 이름');
        const perp = pts.map((_, i) => i).filter((i) => { const a = edge(pts, ref), b = edge(pts, i); return Math.abs(a[0] * b[0] + a[1] * b[1]) < 1e-9; });
        assert.deepEqual(perp, [ans], tag + ' 수직인 변이 하나뿐이고 정답');
      }
      if (kind === 'par-dist') {
        const segs = f.segments.filter((s) => s.kind === 'seg');
        const lines = f.segments.filter((s) => s.kind === 'line');
        assert.equal(lines.length, 2, tag);
        const d = Math.abs(lines[0].a[1] - lines[1].a[1]);
        assert.equal(last.value, d, tag + ' 거리 = 평행선 간격');
        assert.equal(segs.filter((s) => s.right).length, 1, tag + ' 수직 선분 하나');
      }
      if (kind === 'quad-name') assert.equal(last.answerText, quadType(f), tag);
      if (kind === 'quad-rel') {
        const ty = quadType(f), fam = plain(T.FAMILY[ty]);
        assert.ok(['직사각형', '마름모', '평행사변형'].includes(ty), tag + ' 그림 ' + ty);
        assert.ok(fam.includes(last.answerText) && last.answerText !== ty, tag + ' 부를 수 있는 다른 이름');
      }
      if (kind === 'poly-name') {
        const reg = (f.ticks || []).length === pts.length;
        const want = (reg ? '정' : '') + ({ 5: '오', 6: '육', 7: '칠', 8: '팔', 9: '구' })[pts.length] + '각형';
        assert.equal(last.answerText, want, tag);
        if (reg) { const a0 = angleAt(pts, 0); pts.forEach((_, i) => assert.ok(near(angleAt(pts, i), a0, 0.5), tag + ' 정다각형 각')); }
      }
      if (kind === 'diag-one') { assert.equal(last.value, pts.length - 3, tag); assert.equal(last.reveal.diagonals.length, pts.length - 3); }
      if (kind === 'diag-count') { assert.equal(last.value, (pts.length * (pts.length - 3)) / 2, tag); assert.equal(last.reveal.diagonals.length, last.value); assert.ok(pts.length >= 4 && pts.length <= 6); }
      if (kind === 'para-side' || (kind === 'rhom-side' && (f.labels || []).length)) {
        const ls = f.labels.map((l) => num(l.text));
        assert.equal(last.value, kind === 'para-side' ? (ls[0] + ls[1]) * 2 : ls[0] * 4, tag + ' 둘레');
      }
    }
  }
});

test('오답: 개수·겹침·범위·힌트·이름은 늘 틀림·보정 ≤ 10%·핵심 실수 ≥ 70%·크기 위치 ≤ 75%', () => {
  for (const kind of KINDS) {
    const ps = problems(kind, 300, 9);
    const nSteps = ps[0].steps.length;
    for (let s = 0; s < nSteps; s++) {
      let fix = 0, core = 0; const pos = [0, 0, 0];
      const coreSet = CORE[kind + '#' + s] || (s === nSteps - 1 ? CORE[kind] : null);
      for (const p of ps) {
        const st = p.steps[s], w = plain(T.wrongChoices(p, s)), tag = kind + '#' + s + ' ' + p.key;
        assert.equal(w.length, 2, tag);
        const toks = [st.answerText, ...w.map((x) => x.token)];
        assert.equal(new Set(toks).size, 3, tag + ' 겹침 ' + toks);
        for (const x of w) {
          assert.ok(T.hintFor(p, x.mistake), tag + ' 힌트');
          if (x.mistake === 'fix') fix++;
          if (st.choiceKind === 'value') {
            const v = num(x.token);
            if (/°$/.test(x.token)) assert.ok(v >= 1 && v <= 179, tag + ' 각도 범위 ' + x.token);
            else if (/쌍$/.test(x.token)) assert.ok(v >= 0 && v <= 3, tag);
            else assert.ok(v >= 1, tag + ' 양수 ' + x.token);
            assert.equal(x.token.replace(/-?\d+/, ''), st.answerText.replace(/-?\d+/, ''), tag + ' 단위 같음');
          }
        }
        if (st.choiceKind === 'name') {
          if (kind === 'quad-rel') { const fam = plain(T.FAMILY[quadType(p.fig)]); for (const x of w) assert.ok(!fam.includes(x.token), tag + ' 부를 수 있는 이름이 오답 ' + x.token); }
          if (kind === 'quad-name') for (const x of w) assert.notEqual(x.token, quadType(p.fig));
          if (kind === 'poly-name') for (const x of w) assert.ok(!st.answerText.endsWith(x.token) && x.token !== st.answerText.replace(/^정/, ''), tag + ' 포함 이름 오답 ' + x.token);
          if (kind === 'angle-class' || kind === 'two-criteria') for (const x of w) assert.ok(!x.token.endsWith(st.answerText.replace('이등변삼각형이면서 ', '')), tag);
        }
        if (coreSet && w.some((x) => coreSet.includes(x.mistake))) core++;
        if (st.choiceKind === 'value') pos[[st.value, ...w.map((x) => num(x.token))].filter((v) => v < st.value).length]++;
      }
      assert.ok(fix / ps.length <= 0.1, kind + '#' + s + ' 보정 ' + fix);
      if (coreSet) assert.ok(core / ps.length >= 0.7, kind + '#' + s + ' 핵심 실수 ' + core + '/' + ps.length);
      if (ps[0].steps[s].choiceKind === 'value' && kind !== 'par-pairs') assert.ok(Math.max(...pos) / ps.length <= 0.75, kind + '#' + s + ' 크기 위치 ' + pos);
    }
  }
});

test('풀 크기·한 판·섞기', () => {
  for (const kind of KINDS) {
    const need = SHAPE_ONLY.includes(kind) ? 10 : 20;
    assert.ok(T.poolOf(kind).length >= need, kind + ' 풀 ' + T.poolOf(kind).length);
  }
  const rng = seeded(7);
  const third = new Set();
  for (let t = 0; t < 300; t++) {
    for (let lab = 1; lab <= 6; lab++) {
      const r = plain(T.makeRound(lab, rng));
      assert.deepEqual(r.map((p) => p.kind), plain(T.LAB_KINDS[lab]));
      assert.equal(new Set(r.map((p) => p.key)).size, 3);
      if (lab === 6) assert.notEqual(r[1].fig.points.length, r[2].fig.points.length, '6관 ②③ 같은 n');
    }
    const m = plain(T.makeMixedRound(rng, 10));
    assert.equal(m.length, 10);
    assert.equal(new Set(m.map((p) => p.key)).size, 10);
    const byKind = {}, byUnit = {};
    for (const p of m) {
      byKind[p.kind] = (byKind[p.kind] || 0) + 1; byUnit[p.unit] = (byUnit[p.unit] || 0) + 1;
      assert.ok(T.MIXED_KINDS.includes(p.kind)); assert.equal(p.steps.length, 1, '7관 한 번 고르기');
      if (p.kind === 'angle-class') assert.ok(!p.fig.angles.some((a) => a.text === '?'), '7관 세 각 다 적음');
    }
    assert.ok(Object.values(byKind).every((c) => c <= 2));
    for (const u of ['2', '4', '6']) assert.ok((byUnit[u] || 0) >= 2, '단원 ' + u);
    const idx = plain(m.map((p) => T.KIND_ORDER[p.kind]));
    assert.deepEqual(idx, [...idx].sort((a, b) => a - b));
  }
  assert.throws(() => T.makeRound(9, rng));
});

test('퀴즈 자료 4-2 세 단원: 4제씩, Q01~Q12 단원 차례, 보기 3개, 해설에 보기 번호 없음', () => {
  const files = [['2', '2. 삼각형', 1], ['4', '4. 사각형', 5], ['6', '6. 다각형', 9]];
  const counts = [0, 0, 0];
  for (const [no, unit, first] of files) {
    const d = JSON.parse(read('scripts/data/curriculum/math_4-2_' + no + '.json'));
    assert.equal(d.grade, '4-2'); assert.equal(d.unit, unit); assert.equal(d.items.length, 4);
    d.items.forEach((it, i) => {
      assert.ok(it.title.startsWith('Q' + String(first + i).padStart(2, '0') + ' '), it.title);
      assert.equal(it.choices.length, 3); assert.equal(new Set(it.choices).size, 3);
      assert.ok(it.answer >= 1 && it.answer <= 3); counts[it.answer - 1]++;
      assert.ok(!/\d번/.test(it.explanation), it.title);
    });
  }
  assert.ok(Math.max(...counts) <= 6, '정답 자리 ' + counts);
});

test('화면: 상대 경로·실림 순서·800줄 미만·대문 카드 두 곳·그림 CSS', () => {
  const html = read('kids/subjects/math/tri_quad.html');
  assert.ok(!/(src|href)="\//.test(html), '루트 절대 경로');
  const names = ['math_explorer-quiz.js', 'math_explorer-ladder.js', 'mixed_calc-core.js', 'polygon_area-draw.js', 'tri_quad-geo.js', 'tri_quad-core.js', 'tri_quad-labs.js'];
  const at = names.map((n) => html.indexOf('./js/' + n));
  assert.ok(at.every((i) => i > 0), '스크립트 빠짐 ' + at);
  assert.deepEqual(at, [...at].sort((x, y) => x - y), '실림 순서');
  assert.ok(html.includes('math_polyarea.css') && html.includes('math_triquad.css') && html.includes('mx-theme-triquad'));
  for (const f of ['tri_quad-geo.js', 'tri_quad-core.js', 'tri_quad-labs.js', 'polygon_area-draw.js']) {
    const n = read('kids/subjects/math/js/' + f).split('\n').length;
    assert.ok(n < 800, f + ' ' + n + '줄');
  }
  const gate = read('kids/subjects/math/math.html');
  assert.equal(gate.split('href="tri_quad.html"').length - 1, 2, '대문 카드 두 곳');
  const labs = read('kids/subjects/math/js/tri_quad-labs.js');
  assert.ok(labs.includes("'2. 삼각형'") && labs.includes("'4. 사각형'") && labs.includes("'6. 다각형'"), '퀴즈 세 단원');
});
