// 3-1 나눗셈 탐험관 시험 (2026-11-28 옛 화면을 공용 탐험관 틀로 옮김, docs/refactor_batches.md 묶음 F3):
// 똑같이 나누기·곱셈구구 몫·나머지 문제 생성, 화면 파일 규칙, 노션 퀴즈 자료.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { read, lineCount, assetTags, assertLoadsInOrder, assertRelativeAssets, assertNoInlineStyleOrScript } from './split-rules.mjs';

const JS = 'kids/subjects/math/js/';
const PAGE = 'kids/subjects/math/division_concept.html';

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

const C = load([JS + 'division_concept-core.js']).DivConceptCore;

test('보기 3개 만들기: 정답 먼저, 중복·1 미만 빼고 모자라면 채움', () => {
  assert.deepEqual([...C.threeChoices(2, [3, 1, 2])], [2, 3, 1]);
  assert.deepEqual([...C.threeChoices(2, [2, 0, 2])], [2, 4, 5]);
});

test('1관 똑같이 나누기: 접시 수 × 몫 = 전체, 보기 3개 중복 없음, 직전과 다름', () => {
  const rng = seeded(1);
  let prev = null;
  for (let i = 0; i < 300; i++) {
    const p = C.makeShare(rng, prev);
    assert.equal(p.plates * p.q, p.total);
    assert.ok(p.plates >= 2 && p.plates <= 6 && p.q >= 2 && p.q <= 6);
    assert.equal(p.choices[p.answerIndex], String(p.q));
    assert.equal(new Set(p.choices).size, 3);
    if (prev) assert.ok(!(prev.total === p.total && prev.plates === p.plates));
    prev = p;
  }
});

test('2관 곱셈구구 몫: 단 × 몫 = 나누어지는 수, 보기 3개 중복 없음', () => {
  const rng = seeded(2);
  for (let i = 0; i < 300; i++) {
    const p = C.makeFact(rng, null);
    assert.equal(p.d * p.q, p.n);
    assert.ok(p.d >= 2 && p.d <= 9 && p.q >= 2 && p.q <= 9);
    assert.equal(p.choices[p.answerIndex], String(p.q));
    assert.equal(new Set(p.choices).size, 3);
    assert.ok(p.choices.every((c) => Number(c) >= 1));
  }
});

test('3관 나머지: 나머지 < 나누는 수, 검산식, 오답 1은 나머지 약속 위반·오답 2는 계산이 안 맞음', () => {
  const rng = seeded(3);
  let sawZero = false;
  for (let i = 0; i < 300; i++) {
    const p = C.makeRemainder(rng, null);
    assert.ok(p.r >= 0 && p.r < p.d);
    assert.equal(p.d * p.q + p.r, p.n);
    assert.equal(p.check, `(${p.d} × ${p.q}) + ${p.r} = ${p.n}`);
    assert.equal(p.choices[p.answerIndex], C.remText(p.q, p.r));
    assert.equal(new Set(p.choices).size, 3);
    const [q1, r1] = p.choices[1].match(/\d+/g).map(Number);
    assert.equal(p.d * q1 + r1, p.n, '오답 1도 계산은 맞음');
    assert.ok(r1 >= p.d, '오답 1은 나머지가 나누는 수 이상');
    const [q2, r2] = p.choices[2].match(/\d+/g).map(Number);
    assert.notEqual(p.d * q2 + r2, p.n, '오답 2는 계산이 틀림');
    if (p.r === 0) sawZero = true;
  }
  assert.ok(sawZero, '나머지 0도 나옴');
});

test('화면 파일: 요정 엔진 → 공용 틀 → 단원 파일 순서, 상대 경로, 인라인 없음, 600줄 이하, 대문 카드 두 곳', () => {
  const html = read(PAGE);
  const js = ['math_explorer-shell', 'math_squishy', 'math_explorer-quiz', 'division_concept-core', 'division_concept-labs'];
  assertLoadsInOrder(html, 'script', js.map((j) => `./js/${j}.js`), 'division_concept');
  const engine = assetTags(html, 'script').find((t) => t.url === '../../core/fairy-engine.js');
  assert.ok(engine && engine.start < html.indexOf('./js/math_explorer-shell.js'), '요정 엔진이 먼저');
  assertLoadsInOrder(html, 'style', ['../../css/math_explorer.css', '../../css/math_division_concept.css'], 'division_concept');
  assertRelativeAssets(PAGE, 'script', assetTags(html, 'script').map((t) => t.src));
  assertRelativeAssets(PAGE, 'style', assetTags(html, 'style').filter((t) => !/^https?:/.test(t.src)).map((t) => t.src));
  assertNoInlineStyleOrScript(html, 'division_concept');
  assert.doesNotMatch(html, /\son[a-z]+\s*=/i, 'on* 속성 없음');
  for (const id of ['mxTabs', 'mxContainer', 'mxDoneCount', 'mxTotal', 'mxProgressFill', 'mxCompleteModal', 'mxCompleteReward', 'mxCompleteClose', 'mxGoQuiz']) {
    assert.ok(html.includes(`id="${id}"`), `#${id}`);
  }
  assert.match(html, /<span id="mxTotal">3<\/span>/, '관 수 표시');
  for (const f of [...js.slice(3).map((j) => `${JS}${j}.js`), 'kids/css/math_division_concept.css', PAGE]) {
    assert.ok(lineCount(read(f)) <= 600, `${f}: ${lineCount(read(f))}줄`);
  }
  const lobby = read('kids/subjects/math/math.html');
  assert.equal(lobby.split('href="division_concept.html"').length - 1, 2, '수학 대문 학년별·영역별 두 곳');
});

test('관 파일: 관 3개·퀴즈 학년 단원, innerHTML·기계음·UTC 날짜 없음', () => {
  const src = read(`${JS}division_concept-labs.js`);
  assert.match(src, /key: 'divide3'/);
  assert.match(src, /labs: \[lab1, lab2, lab3\]/);
  assert.ok(src.includes("grade: '3-1'") && src.includes("unit: '3. 나눗셈'"));
  assert.doesNotMatch(src, /innerHTML/);
  assert.doesNotMatch(src, /speechSynthesis/);
  assert.doesNotMatch(src, /toISOString/);
});

test('퀴즈 자료: 12제·3지선다·화면과 같은 단원 원문·보기 번호 표현 없음', () => {
  const d = JSON.parse(read('scripts/data/curriculum/math_3-1_3.json'));
  assert.equal(d.subject, '수학');
  assert.equal(d.grade, '3-1');
  assert.equal(d.unit, '3. 나눗셈');
  assert.equal(d.items.length, 12);
  const answers = new Set();
  d.items.forEach((it, i) => {
    assert.equal(it.title.slice(0, 3), `Q${String(i + 1).padStart(2, '0')}`);
    assert.equal(it.zone, '탐구퀴즈');
    assert.equal(it.choices.length, 3);
    assert.equal(new Set(it.choices).size, 3, `${it.title}: 보기 중복`);
    assert.ok([1, 2, 3].includes(it.answer), it.title);
    answers.add(it.answer);
    assert.doesNotMatch(it.explanation, /\d번은|보기 \d|[①②③④]/, `${it.title}: 보기 번호 표현`);
    assert.match(it.usage, /^3-1 3단원 · /);
  });
  assert.equal(answers.size, 3, '정답 번호가 한쪽에 몰리지 않음');
});
