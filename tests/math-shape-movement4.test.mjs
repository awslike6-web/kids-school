// 4-1 평면도형의 이동 탐험관 시험 (2026-11-28 옛 화면을 공용 탐험관 틀로 옮김, docs/refactor_batches.md 묶음 F5):
// 뒤집기·돌리기 계산(같은 결과·다른 결과), 밀기·처음→나중·무늬 문제 생성, 화면 파일 규칙, 노션 퀴즈 자료.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { read, lineCount, assetTags, assertLoadsInOrder, assertRelativeAssets, assertNoInlineStyleOrScript } from './split-rules.mjs';

const JS = 'kids/subjects/math/js/';
const PAGE = 'kids/subjects/math/shape_movement.html';

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

const C = load([JS + 'shape_movement-core.js']).MoveCore;
const S = C.SHAPE;
const A = (pts, ...ops) => ops.reduce((p, op) => C.apply(p, op), pts);

test('F 모양은 대칭이 없어 뒤집기·돌리기 8가지 결과가 모두 다르다', () => {
  const images = [
    A(S, 'id'), A(S, 'cw90'), A(S, 'cw180'), A(S, 'cw270'),
    A(S, 'flipLR'), A(S, 'flipLR', 'cw90'), A(S, 'flipLR', 'cw180'), A(S, 'flipLR', 'cw270')
  ];
  assert.equal(new Set(images.map(C.key)).size, 8);
});

test('같은 결과: 오른쪽=왼쪽 뒤집기, 위쪽=아래쪽 뒤집기, 시계 270°=반대 90°, 두 번 뒤집기·360°=처음, 180°=좌우+위아래', () => {
  assert.ok(C.same(A(S, 'flipLR'), A(S, 'flipRL')));
  assert.ok(C.same(A(S, 'flipTB'), A(S, 'flipBT')));
  assert.ok(C.same(A(S, 'cw270'), A(S, 'ccw90')));
  assert.ok(C.same(A(S, 'ccw180'), A(S, 'cw180')));
  assert.ok(C.same(A(S, 'flipLR', 'flipLR'), S));
  assert.ok(C.same(A(S, 'cw360'), S));
  assert.ok(C.same(A(S, 'cw90', 'cw90', 'cw90', 'cw90'), S));
  assert.ok(C.same(A(S, 'cw90', 'cw90'), A(S, 'cw180')));
  assert.ok(C.same(A(S, 'flipLR', 'flipTB'), A(S, 'cw180')));
  assert.ok(!C.same(A(S, 'flipLR'), A(S, 'flipTB')));
  assert.throws(() => C.apply(S, 'spin'));
});

test('시계 방향 90°: 화면(아래로 커지는 y)에서 위쪽 끝이 오른쪽으로 간다', () => {
  // F의 위쪽 가로 막대(가로 3칸)는 돌린 뒤 오른쪽 세로 막대(세로 3칸)가 된다
  const r = A(S, 'cw90');
  const b = C.bounds(r);
  assert.equal(b.w, 4);
  assert.equal(b.h, 3);
  const k = C.key(r);
  assert.ok(k.includes(`${b.w},0`) && k.includes(`${b.w},3`), '오른쪽 끝 세로 변이 0~3');
});

test('1관 밀기 미션: 판 안에 남고, 방향·칸 수와 목표 위치가 맞다', () => {
  const rng = seeded(1);
  const b = C.bounds(S);
  let pos = { x: 1, y: 1 };
  for (let i = 0; i < 400; i++) {
    const m = C.makeSlide(rng, pos, 10, 7, b.w, b.h);
    assert.ok(m.n >= 1 && m.n <= 4);
    const dx = m.target.x - pos.x;
    const dy = m.target.y - pos.y;
    const want = { right: [m.n, 0], left: [-m.n, 0], down: [0, m.n], up: [0, -m.n] }[m.dir];
    assert.deepEqual([dx, dy], want);
    assert.ok(m.target.x >= 0 && m.target.x <= 10 - b.w && m.target.y >= 0 && m.target.y <= 7 - b.h);
    pos = m.target;
  }
});

test('2·3관 처음→나중: 정답 움직임의 결과가 나중 모양이고, 보기 셋의 결과가 모두 다르다', () => {
  const rng = seeded(2);
  for (const make of [C.makeFlipQuiz, C.makeTurnQuiz]) {
    const seen = new Set();
    for (let i = 0; i < 300; i++) {
      const q = make(rng);
      seen.add(q.answerOp);
      assert.ok(C.same(q.after, A(S, q.answerOp)));
      assert.equal(q.choices[q.answerIndex], C.OPS[q.answerOp]);
      assert.equal(q.distinct, true, `같은 결과 보기: ${q.ops}`);
      assert.equal(new Set(q.choices).size, 3);
      assert.ok(!(q.ops.includes('cw270') && q.ops.includes('ccw90')));
    }
    assert.ok(seen.size >= 3);
  }
  for (let i = 0; i < 100; i++) assert.match(C.makeFlipQuiz(rng).answerOp, /^flip/);
});

test('4관 무늬 규칙: 규칙마다 3×3 무늬가 모두 다르다 (같은 무늬 연속 방지)', () => {
  const names = Object.keys(C.PATTERN_RULES);
  const grids = names.map((n) => [0, 1, 2].map((r) => [0, 1, 2].map((c) => C.PATTERN_RULES[n](r, c)).join('')).join('/'));
  assert.equal(new Set(grids).size, names.length, grids.join(' · '));
});

test('4관 무늬: 3×3 돌린 횟수 0~3, 직전 규칙과 다르고, 처음(모두 0)과 같지 않음', () => {
  const rng = seeded(3);
  let prev = null;
  for (let i = 0; i < 200; i++) {
    const p = C.makePattern(rng, prev);
    assert.notEqual(p.rule, prev);
    prev = p.rule;
    assert.equal(p.turns.length, 9);
    assert.ok(p.turns.every((t) => Number.isInteger(t) && t >= 0 && t <= 3));
    assert.ok(p.turns.some((t) => t !== 0));
  }
});

test('화면 파일: 요정 엔진 → 공용 틀 → 단원 파일 순서, 상대 경로, 인라인 없음, 600줄 이하, 대문 카드 두 곳', () => {
  const html = read(PAGE);
  const js = ['math_explorer-shell', 'math_squishy', 'math_explorer-quiz', 'shape_movement-core', 'shape_movement-labs'];
  assertLoadsInOrder(html, 'script', js.map((j) => `./js/${j}.js`), 'shape_movement');
  const engine = assetTags(html, 'script').find((t) => t.url === '../../core/fairy-engine.js');
  assert.ok(engine && engine.start < html.indexOf('./js/math_explorer-shell.js'), '요정 엔진이 먼저');
  assertLoadsInOrder(html, 'style', ['../../css/math_explorer.css', '../../css/math_shape_movement.css'], 'shape_movement');
  assertRelativeAssets(PAGE, 'script', assetTags(html, 'script').map((t) => t.src));
  assertRelativeAssets(PAGE, 'style', assetTags(html, 'style').filter((t) => !/^https?:/.test(t.src)).map((t) => t.src));
  assertNoInlineStyleOrScript(html, 'shape_movement');
  assert.doesNotMatch(html, /\son[a-z]+\s*=/i, 'on* 속성 없음');
  for (const id of ['mxTabs', 'mxContainer', 'mxDoneCount', 'mxTotal', 'mxProgressFill', 'mxCompleteModal', 'mxCompleteReward', 'mxCompleteClose', 'mxGoQuiz']) {
    assert.ok(html.includes(`id="${id}"`), `#${id}`);
  }
  assert.match(html, /<span id="mxTotal">4<\/span>/, '관 수 표시');
  for (const f of [...js.slice(3).map((j) => `${JS}${j}.js`), 'kids/css/math_shape_movement.css', PAGE]) {
    assert.ok(lineCount(read(f)) <= 600, `${f}: ${lineCount(read(f))}줄`);
  }
  const lobby = read('kids/subjects/math/math.html');
  assert.equal(lobby.split('href="shape_movement.html"').length - 1, 2, '수학 대문 학년별·영역별 두 곳');
});

test('관 파일: 관 4개·퀴즈 학년 단원, innerHTML·기계음·UTC 날짜 없음', () => {
  const src = read(`${JS}shape_movement-labs.js`);
  assert.match(src, /key: 'move4'/);
  assert.match(src, /labs: \[lab1, lab2, lab3, lab4\]/);
  assert.ok(src.includes("grade: '4-1'") && src.includes("unit: '4. 평면도형의 이동'"));
  assert.doesNotMatch(src, /innerHTML/);
  assert.doesNotMatch(src, /speechSynthesis/);
  assert.doesNotMatch(src, /toISOString/);
});

test('퀴즈 자료: 12제·3지선다·화면과 같은 단원 원문·보기 번호 표현 없음', () => {
  const d = JSON.parse(read('scripts/data/curriculum/math_4-1_4.json'));
  assert.equal(d.subject, '수학');
  assert.equal(d.grade, '4-1');
  assert.equal(d.unit, '4. 평면도형의 이동');
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
    assert.match(it.usage, /^4-1 4단원 · /);
  });
  assert.equal(answers.size, 3, '정답 번호가 한쪽에 몰리지 않음');
});
