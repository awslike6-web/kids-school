// 4-1 각도 탐험관 시험 (2026-11-28 옛 화면을 공용 탐험관 틀로 옮김, docs/refactor_batches.md 묶음 F6):
// 각도기 읽기·각 만들기·삼각형/사각형 각의 합 문제 생성, 그림 좌표가 실제 각과 맞는지, 화면 파일 규칙, 노션 퀴즈 자료.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { read, lineCount, assetTags, assertLoadsInOrder, assertRelativeAssets, assertNoInlineStyleOrScript } from './split-rules.mjs';

const JS = 'kids/subjects/math/js/';
const PAGE = 'kids/subjects/math/angles_concept.html';

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

const C = load([JS + 'angles_concept-core.js']).AngleCore;
const near = (a, b) => Math.abs(a - b) < 1e-6;

test('각의 종류: 0°<예각<90°=직각<둔각<180°, 0°·180°는 이름 없음', () => {
  assert.equal(C.kind(1), 'acute');
  assert.equal(C.kind(89), 'acute');
  assert.equal(C.kind(90), 'right');
  assert.equal(C.kind(91), 'obtuse');
  assert.equal(C.kind(179), 'obtuse');
  assert.equal(C.kind(0), null);
  assert.equal(C.kind(180), null);
});

test('1관 각도기 읽기: 10° 단위 20°~160°·90° 아님, 반대 눈금 오답(180-각)과 한 칸 오답, 변 방향이 밑금 쪽과 맞음', () => {
  const rng = seeded(1);
  let prev = null;
  const sides = new Set();
  for (let i = 0; i < 400; i++) {
    const q = C.makeRead(rng, prev);
    assert.notEqual(q.deg, prev);
    prev = q.deg;
    sides.add(q.side);
    assert.ok(q.deg % 10 === 0 && q.deg >= 20 && q.deg <= 160 && q.deg !== 90);
    assert.equal(q.choices[q.answer], `${q.deg}°`);
    assert.equal(q.choices[q.wrongScale], `${180 - q.deg}°`);
    assert.equal(new Set(q.choices).size, 3, q.choices.join());
    const off = Number(q.choices[2].replace('°', ''));
    assert.equal(Math.abs(off - q.deg), 10);
    assert.ok(off >= 10 && off <= 170);
    // 두 변 사이 각이 정답
    assert.equal(Math.abs(q.rayAngle - q.baseAngle), q.deg);
  }
  assert.deepEqual([...sides].sort(), ['left', 'right']);
});

test('2관 각 만들기: 5° 단위 목표, 종류와 맞고 직전 종류와 다름, 세 종류 모두 나옴', () => {
  const rng = seeded(2);
  let prev = null;
  const kinds = new Set();
  for (let i = 0; i < 400; i++) {
    const m = C.makeBuild(rng, prev);
    assert.notEqual(m.kind, prev);
    prev = m.kind;
    kinds.add(m.kind);
    assert.equal(m.target % 5, 0);
    assert.equal(C.kind(m.target), m.kind);
    assert.ok(m.target >= 20 && m.target <= 170);
  }
  assert.equal(kinds.size, 3);
  assert.equal(C.compareText(40, 60), 'less');
  assert.equal(C.compareText(70, 60), 'more');
  assert.equal(C.compareText(60, 60), 'same');
});

test('3관 삼각형: 세 각 합 180°·가장 작은 각 30° 이상, 그린 꼭짓점에서 잰 각이 적힌 각과 같음', () => {
  const rng = seeded(3);
  let prev = null;
  for (let i = 0; i < 400; i++) {
    const q = C.makeTriangle(rng, prev);
    assert.notEqual(q.hidden, prev);
    prev = q.hidden;
    assert.equal(q.angles.reduce((s, a) => s + a, 0), 180);
    assert.ok(q.angles.every((a) => a >= 30 && a % 10 === 0));
    q.angles.forEach((a, k) => assert.ok(near(C.measure(q.pts, k), a), `${q.angles} @${k}: ${C.measure(q.pts, k)}`));
    checkQuestion(q);
  }
});

test('4관 사각형: 네 각 합 360°·60°~130°, 그린 꼭짓점에서 잰 각이 적힌 각과 같고 볼록', () => {
  const rng = seeded(4);
  let prev = null;
  for (let i = 0; i < 400; i++) {
    const q = C.makeQuad(rng, prev);
    assert.notEqual(q.hidden, prev);
    prev = q.hidden;
    assert.equal(q.pts.length, 4);
    assert.equal(q.angles.reduce((s, a) => s + a, 0), 360);
    assert.ok(q.angles.every((a) => a >= 60 && a <= 130 && a % 5 === 0));
    q.angles.forEach((a, k) => assert.ok(near(C.measure(q.pts, k), a), `${q.angles} @${k}: ${C.measure(q.pts, k)}`));
    checkQuestion(q);
  }
});

function checkQuestion(q) {
  assert.equal(q.choices[q.answer], `${q.answerValue}°`);
  assert.equal(q.answerValue, q.angles[q.hidden]);
  assert.equal(new Set(q.choices).size, 3, q.choices.join());
  q.choices.forEach((c) => {
    const v = Number(c.replace('°', ''));
    assert.ok(v >= 10 && v <= 170 && v % 5 === 0, c);
  });
  assert.equal(q.shown.length, q.angles.length - 1);
  assert.equal(q.total - q.shown.reduce((s, a) => s + a, 0), q.answerValue, q.formula);
  assert.ok(q.formula.endsWith(`= ${q.answerValue}°`));
}

test('그림 도우미: 부채꼴은 시계 반대 방향, 큰 호 표시, 화면 맞춤은 y를 뒤집고 상자 안에', () => {
  assert.equal(JSON.stringify(C.polar(100, 100, 10, 90)), '[100,90]');
  assert.match(C.wedgePath(0, 0, 10, 0, 90), / 0 0 0 /);
  assert.match(C.wedgePath(0, 0, 10, 0, 270), / 0 1 0 /);
  const f = C.fit([[0, 0], [2, 0], [1, 1]], 300, 200, 20);
  f.forEach((p) => assert.ok(p[0] >= 20 - 1e-9 && p[0] <= 280 + 1e-9 && p[1] >= 20 - 1e-9 && p[1] <= 180 + 1e-9));
  assert.ok(f[2][1] < f[0][1], '위쪽 꼭짓점이 화면 위에');
  assert.equal(C.quadPoints([90, 90, 0, 180], 0.7), null);
});

test('화면 파일: 요정 엔진 → 공용 틀 → 단원 파일 순서, 상대 경로, 인라인 없음, 600줄 이하, 대문 카드 두 곳', () => {
  const html = read(PAGE);
  const js = ['math_explorer-shell', 'math_squishy', 'math_explorer-quiz', 'angles_concept-core', 'angles_concept-labs'];
  assertLoadsInOrder(html, 'script', js.map((j) => `./js/${j}.js`), 'angles_concept');
  const engine = assetTags(html, 'script').find((t) => t.url === '../../core/fairy-engine.js');
  assert.ok(engine && engine.start < html.indexOf('./js/math_explorer-shell.js'), '요정 엔진이 먼저');
  assertLoadsInOrder(html, 'style', ['../../css/math_explorer.css', '../../css/math_angles_concept.css'], 'angles_concept');
  assertRelativeAssets(PAGE, 'script', assetTags(html, 'script').map((t) => t.src));
  assertRelativeAssets(PAGE, 'style', assetTags(html, 'style').filter((t) => !/^https?:/.test(t.src)).map((t) => t.src));
  assertNoInlineStyleOrScript(html, 'angles_concept');
  assert.doesNotMatch(html, /\son[a-z]+\s*=/i, 'on* 속성 없음');
  for (const id of ['mxTabs', 'mxContainer', 'mxDoneCount', 'mxTotal', 'mxProgressFill', 'mxCompleteModal', 'mxCompleteReward', 'mxCompleteClose', 'mxGoQuiz']) {
    assert.ok(html.includes(`id="${id}"`), `#${id}`);
  }
  assert.match(html, /<span id="mxTotal">4<\/span>/, '관 수 표시');
  for (const f of [...js.slice(3).map((j) => `${JS}${j}.js`), 'kids/css/math_angles_concept.css', PAGE]) {
    assert.ok(lineCount(read(f)) <= 600, `${f}: ${lineCount(read(f))}줄`);
  }
  const lobby = read('kids/subjects/math/math.html');
  assert.equal(lobby.split('href="angles_concept.html"').length - 1, 2, '수학 대문 학년별·영역별 두 곳');
});

test('관 파일: 관 4개·퀴즈 학년 단원, innerHTML·기계음·UTC 날짜 없음', () => {
  const src = read(`${JS}angles_concept-labs.js`);
  assert.match(src, /key: 'angles4'/);
  assert.match(src, /labs: \[lab1, lab2, lab3, lab4\]/);
  assert.ok(src.includes("grade: '4-1'") && src.includes("unit: '2. 각도'"));
  assert.doesNotMatch(src, /innerHTML/);
  assert.doesNotMatch(src, /speechSynthesis/);
  assert.doesNotMatch(src, /toISOString/);
  assert.doesNotMatch(src, /평각/, '평각은 중학교 말이라 쓰지 않음');
});

test('퀴즈 자료: 12제·3지선다·화면과 같은 단원 원문·보기 번호 표현 없음', () => {
  const d = JSON.parse(read('scripts/data/curriculum/math_4-1_2.json'));
  assert.equal(d.subject, '수학');
  assert.equal(d.grade, '4-1');
  assert.equal(d.unit, '2. 각도');
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
    assert.doesNotMatch(`${it.question} ${it.explanation}`, /평각/);
    assert.match(it.usage, /^4-1 2단원 · /);
  });
  assert.equal(answers.size, 3, '정답 번호가 한쪽에 몰리지 않음');
});
