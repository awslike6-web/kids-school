// 3-1 평면도형 탐험관 시험 (2026-11-28 옛 화면을 공용 탐험관 틀로 옮김, docs/refactor_batches.md 묶음 F4):
// 선 이름·각·모눈 도형 문제 생성, 화면 파일 규칙, 노션 퀴즈 자료.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { read, lineCount, assetTags, assertLoadsInOrder, assertRelativeAssets, assertNoInlineStyleOrScript } from './split-rules.mjs';

const JS = 'kids/subjects/math/js/';
const PAGE = 'kids/subjects/math/planar_shapes.html';

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

const C = load([JS + 'planar_shapes-core.js']).PlanarCore;

test('1관 선 이름: 반직선은 시작점을 먼저, 선분·직선은 순서만 바꾼 이름을 오답에 넣지 않음', () => {
  const rng = seeded(1);
  let prev = null;
  const seen = new Set();
  for (let i = 0; i < 400; i++) {
    const p = C.makeLine(rng, prev);
    assert.notEqual(p.kind, prev);
    prev = p.kind;
    seen.add(p.kind);
    assert.notEqual(p.left, p.right);
    assert.equal(p.choices.length, 3);
    assert.equal(new Set(p.choices).size, 3);
    const ans = p.choices[p.answerIndex];
    if (p.kind === 'ray-right') assert.equal(ans, `반직선 ${p.left}${p.right}`);
    if (p.kind === 'ray-left') assert.equal(ans, `반직선 ${p.right}${p.left}`);
    if (p.kind === 'segment' || p.kind === 'line') {
      const word = p.kind === 'segment' ? '선분' : '직선';
      assert.ok(ans === `${word} ${p.left}${p.right}` || ans === `${word} ${p.right}${p.left}`);
      const others = p.choices.filter((c) => c !== ans);
      assert.ok(others.every((c) => !c.startsWith(word)), `${word} 다른 순서가 오답에 있음: ${p.choices}`);
    }
  }
  assert.equal(seen.size, 4);
});

test('2관 각: 직각 비교 정답이 각도와 맞고, 꼭짓점은 가운데 글자', () => {
  const rng = seeded(2);
  let prev = null;
  for (let i = 0; i < 400; i++) {
    const p = C.makeAngle(rng, prev);
    if (prev === 'vertex') assert.notEqual(p.kind, 'vertex', '꼭짓점 문제 연속 없음');
    prev = p.kind;
    assert.equal(p.names.length, 3);
    assert.equal(new Set(p.names).size, 3);
    assert.equal(p.angleName, `각 ${p.names.join('')}`);
    if (p.kind === 'right') {
      const want = p.deg === 90 ? '직각이에요' : p.deg < 90 ? '직각보다 작아요' : '직각보다 커요';
      assert.equal(p.choices[p.answerIndex], want);
      assert.equal(p.fixed, true);
    } else {
      assert.equal(p.choices[p.answerIndex], `점 ${p.names[1]}`);
    }
  }
});

test('3관 모눈 도형: 정사각형은 가로=세로, 직사각형은 다름, 직각삼각형 꼭짓점의 첫째가 직각', () => {
  const rng = seeded(3);
  let prev = null;
  for (let i = 0; i < 400; i++) {
    const p = C.makeShape(rng, prev);
    assert.notEqual(p.kind, prev);
    prev = p.kind;
    assert.ok(p.w >= 2 && p.w <= 6 && p.h >= 2 && p.h <= 6);
    assert.equal(p.choices[p.answerIndex], C.SHAPE_NAMES[C.SHAPE_KINDS.indexOf(p.kind)]);
    if (p.kind === 'square') assert.equal(p.w, p.h);
    if (p.kind === 'rect') assert.notEqual(p.w, p.h);
    if (p.kind === 'rt_tri') {
      const [v, a, b] = C.triPoints(p.w, p.h, p.corner);
      const dot = (a[0] - v[0]) * (b[0] - v[0]) + (a[1] - v[1]) * (b[1] - v[1]);
      assert.ok(dot === 0, '첫째 꼭짓점에서 두 변이 수직'); // -0도 0으로 본다
    }
  }
});

test('화면 파일: 요정 엔진 → 공용 틀 → 단원 파일 순서, 상대 경로, 인라인 없음, 600줄 이하, 대문 카드 두 곳', () => {
  const html = read(PAGE);
  const js = ['math_explorer-shell', 'math_squishy', 'math_explorer-quiz', 'planar_shapes-core', 'planar_shapes-labs'];
  assertLoadsInOrder(html, 'script', js.map((j) => `./js/${j}.js`), 'planar_shapes');
  const engine = assetTags(html, 'script').find((t) => t.url === '../../core/fairy-engine.js');
  assert.ok(engine && engine.start < html.indexOf('./js/math_explorer-shell.js'), '요정 엔진이 먼저');
  assertLoadsInOrder(html, 'style', ['../../css/math_explorer.css', '../../css/math_planar_shapes.css'], 'planar_shapes');
  assertRelativeAssets(PAGE, 'script', assetTags(html, 'script').map((t) => t.src));
  assertRelativeAssets(PAGE, 'style', assetTags(html, 'style').filter((t) => !/^https?:/.test(t.src)).map((t) => t.src));
  assertNoInlineStyleOrScript(html, 'planar_shapes');
  assert.doesNotMatch(html, /\son[a-z]+\s*=/i, 'on* 속성 없음');
  for (const id of ['mxTabs', 'mxContainer', 'mxDoneCount', 'mxTotal', 'mxProgressFill', 'mxCompleteModal', 'mxCompleteReward', 'mxCompleteClose', 'mxGoQuiz']) {
    assert.ok(html.includes(`id="${id}"`), `#${id}`);
  }
  assert.match(html, /<span id="mxTotal">3<\/span>/, '관 수 표시');
  for (const f of [...js.slice(3).map((j) => `${JS}${j}.js`), 'kids/css/math_planar_shapes.css', PAGE]) {
    assert.ok(lineCount(read(f)) <= 600, `${f}: ${lineCount(read(f))}줄`);
  }
  const lobby = read('kids/subjects/math/math.html');
  assert.equal(lobby.split('href="planar_shapes.html"').length - 1, 2, '수학 대문 학년별·영역별 두 곳');
});

test('관 파일: 관 3개·퀴즈 학년 단원, innerHTML·기계음·UTC 날짜 없음', () => {
  const src = read(`${JS}planar_shapes-labs.js`);
  assert.match(src, /key: 'planar3'/);
  assert.match(src, /labs: \[lab1, lab2, lab3\]/);
  assert.ok(src.includes("grade: '3-1'") && src.includes("unit: '2. 평면도형'"));
  assert.doesNotMatch(src, /innerHTML/);
  assert.doesNotMatch(src, /speechSynthesis/);
  assert.doesNotMatch(src, /toISOString/);
});

test('퀴즈 자료: 12제·3지선다·화면과 같은 단원 원문·보기 번호 표현 없음', () => {
  const d = JSON.parse(read('scripts/data/curriculum/math_3-1_2.json'));
  assert.equal(d.subject, '수학');
  assert.equal(d.grade, '3-1');
  assert.equal(d.unit, '2. 평면도형');
  assert.equal(d.items.length, 12);
  const answers = new Set();
  d.items.forEach((it, i) => {
    assert.equal(it.title.slice(0, 3), `Q${String(i + 1).padStart(2, '0')}`);
    assert.equal(it.zone, '탐구퀴즈');
    assert.equal(it.choices.length, 3);
    assert.equal(new Set(it.choices).size, 3, `${it.title}: 보기 중복`);
    assert.ok([1, 2, 3].includes(it.answer), it.title);
    answers.add(it.answer);
    assert.doesNotMatch(it.explanation, /\d번|보기 \d|[①②③④]/, `${it.title}: 보기 번호 표현`);
    assert.match(it.usage, /^3-1 2단원 · /);
  });
  assert.equal(answers.size, 3, '정답 번호가 한쪽에 몰리지 않음');
});
