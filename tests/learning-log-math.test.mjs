// 문항기록(LearningLog) 4차 연결 시험 — CPA 덧셈·뺄셈, 시계와 규칙, 100까지의 수, 입체도형
// 실제 화면 JS 및 number100.html 인라인 스크립트를 VM 샌드박스에서 실행한다 (노션 미접속).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { fakeLearningLog, plainLog, makeSeedRng } from './quiz-test-fakes.mjs';

const read = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

function makeNode(tag = 'div', id = '') {
  const listeners = {};
  const classes = new Set();
  const attrs = {};
  const node = {
    tagName: tag.toUpperCase(),
    id,
    type: '',
    value: '',
    textContent: '',
    innerHTML: '',
    hidden: false,
    disabled: false,
    style: {},
    dataset: {},
    children: [],
    className: '',
    classList: {
      add: (...cs) => cs.forEach(c => classes.add(c)),
      remove: (...cs) => cs.forEach(c => classes.delete(c)),
      toggle: (c, f) => { const on = f === undefined ? !classes.has(c) : Boolean(f); if (on) classes.add(c); else classes.delete(c); },
      contains: (c) => classes.has(c),
    },
    setAttribute(k, v) { attrs[k] = String(v); },
    getAttribute(k) { return Object.hasOwn(attrs, k) ? attrs[k] : null; },
    append(...items) { items.forEach(i => this.children.push(i)); },
    appendChild(child) { this.children.push(child); return child; },
    replaceChildren(...items) { this.children = [...items]; },
    addEventListener(type, fn) { (listeners[type] ||= []).push(fn); },
    click() {
      if (this.disabled) return;
      if (typeof this.onclick === 'function') this.onclick({ target: this });
      (listeners.click || []).forEach(fn => fn({ target: this }));
    },
    trigger(type) {
      const h = this['on' + type];
      if (typeof h === 'function') h({ target: this });
      (listeners[type] || []).forEach(fn => fn({ target: this }));
    },
    querySelector: () => makeNode('b'),
    querySelectorAll: () => [],
    getContext: () => ({ clearRect() {}, save() {}, translate() {}, rotate() {}, fillRect() {}, restore() {} }),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }),
    setPointerCapture() {},
  };
  return node;
}

function makeRngQueue(values = [], seed = 42) {
  const queue = [...values];
  const fallback = makeSeedRng(seed);
  const rng = () => (queue.length ? queue.shift() : fallback());
  rng.set = (...vals) => { queue.length = 0; queue.push(...vals); };
  return rng;
}

function createDom(initialIds = []) {
  const byId = new Map();
  const ensure = (id, tag = 'div') => {
    if (!byId.has(id)) byId.set(id, makeNode(tag, id));
    return byId.get(id);
  };
  initialIds.forEach(id => ensure(id));
  const docEvents = {};
  const document = {
    readyState: 'complete',
    body: makeNode('body'),
    head: makeNode('head'),
    getElementById: (id) => ensure(id),
    createElement: (tag) => makeNode(tag),
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener(type, fn) { (docEvents[type] ||= []).push(fn); },
    _fire(type) { (docEvents[type] || []).forEach(fn => fn()); },
  };
  return { byId, ensure, document };
}

function makeBaseSandbox({ rng = makeRngQueue([]), withLearningLog = true, extra = {} } = {}) {
  const { byId, ensure, document } = createDom();
  const sb = {
    console: { log() {}, info() {}, warn() {}, error() {} },
    Math: Object.assign(Object.create(Math), { random: rng }),
    Date, JSON, Number, String, Array, Set, Map, Object, Boolean, parseInt, isNaN,
    setTimeout: (fn) => { if (typeof fn === 'function') fn(); return 0; },
    clearTimeout() {},
    requestAnimationFrame() {},
    matchMedia: () => ({ matches: true }),
    localStorage: { getItem: () => 'daughter', setItem() {}, removeItem() {} },
    document,
    location: { href: '' },
    innerWidth: 400, innerHeight: 700,
    Audio: class { play() { return Promise.resolve(); } pause() {} },
    MathQuizEngine: { shuffleArray: (arr) => [...arr] },
    speakFairyTTS() {}, stopFairyTTS() {}, fairySpeak() {},
    fairyPraise() {}, fairyEncourage() {}, fairyReward() {},
    grantRewardAndShowUI() {}, initFairyAudio() {}, updateTtsToggleUi() {}, initFairyChat() {},
    LearningLog: withLearningLog ? fakeLearningLog() : undefined,
    ...extra,
  };
  sb.window = sb; sb.globalThis = sb;
  vm.createContext(sb);
  return { sb, byId, ensure, document };
}

// ============================================================
// 1. CPA 덧셈·뺄셈 (arithmetic_cpa.js)
// ============================================================
function loadCpa({ subtract = false, rng, withLearningLog = true } = {}) {
  const ctx = makeBaseSandbox({ rng, withLearningLog });
  vm.runInContext(read('kids/subjects/math/js/arithmetic_cpa.js'), ctx.sb, { filename: 'arithmetic_cpa.js' });
  ctx.sb.ArithmeticCPA.initPage(subtract);
  return ctx;
}

function parseCpaExpected(questionText) {
  let m = questionText.match(/^(\d+)\s*\+\s*□\s*=\s*10$/);
  if (m) return 10 - Number(m[1]);
  m = questionText.match(/^(\d+)\s*\+\s*(\d+)\s*=\s*□$/);
  if (m) return Number(m[1]) + Number(m[2]);
  m = questionText.match(/^(\d+)\s*−\s*(\d+)\s*=\s*□$/);
  if (m) return Number(m[1]) - Number(m[2]);
  throw new Error('CPA 문제 해석 실패: ' + questionText);
}

test('CPA 덧셈: make10·add-1x1·add-1x1-carry 키와 틀림→맞힘·바로 맞힘·넘기기·제외 활동', () => {
  // random(2,9)는 8가지(2..9), random(1,9)는 9가지(1..9)
  const rng = makeRngQueue([0.0, 0.0], 11); // Q0 (type 0, make10): a=2, b=1 → 2 + □ = 10
  const { sb, ensure } = loadCpa({ subtract: false, rng });
  const choices = () => ensure('quiz-choices').children;
  const pickWrong = () => {
    const ans = String(parseCpaExpected(ensure('quiz-question').textContent));
    const btn = choices().find(b => b.textContent !== ans);
    btn.click();
    return btn.textContent;
  };
  const pickRight = () => {
    const ans = String(parseCpaExpected(ensure('quiz-question').textContent));
    choices().find(b => b.textContent === ans).click();
  };

  // Q0: g:cpa-make10 틀림 → 맞힘
  const w0 = pickWrong();
  pickRight();
  // Q1: g:cpa-add-1x1 (합 < 10) 바로 맞힘: a=2(0.0), b=3(0.25) → 2 + 3 = 5
  rng.set(0.0, 0.25);
  ensure('quiz-next').click();
  assert.equal(ensure('quiz-question').textContent, '2 + 3 = □');
  pickRight();
  // Q2: g:cpa-make10 틀린 뒤 넘기기 → 틀린 채 끝남 1건
  rng.set(0.0, 0.0);
  ensure('quiz-next').click();
  const w2 = pickWrong();
  // Q3: g:cpa-add-1x1-carry (합 >= 10) 바로 맞힘: a=6(0.55), b=5(0.5) → 6 + 5 = 11
  rng.set(0.55, 0.5);
  ensure('quiz-next').click();
  assert.equal(ensure('quiz-question').textContent, '6 + 5 = □');
  pickRight();
  // Q4: 안 건드리고 넘기기 → 0건
  ensure('quiz-next').click();
  ensure('quiz-next').click();

  // 제외 활동(10의 짝꿍·짝꿍 풍선) 클릭해도 기록 0건 추가
  ensure('ten-options').children[0].click();
  ensure('partner-choices').children[0].click();

  assert.deepEqual(plainLog(sb.LearningLog), [
    { subject: '수학', key: 'g:cpa-make10', firstTry: false, hinted: false, picks: [w0] },
    { subject: '수학', key: 'g:cpa-add-1x1', firstTry: true, hinted: false, picks: [] },
    { subject: '수학', key: 'g:cpa-make10', firstTry: false, hinted: false, picks: [w2] },
    { subject: '수학', key: 'g:cpa-add-1x1-carry', firstTry: true, hinted: false, picks: [] },
  ]);
});

test('CPA 뺄셈: sub-10·sub-teen-borrow 및 b=1(받아내림 없음 → sub-teen)', () => {
  const rng = makeRngQueue([0.0, 0.25], 22); // Q0 (type 0, sub-10): b=3 → 10 − 3 = □
  const { sb, ensure } = loadCpa({ subtract: true, rng });
  const choices = () => ensure('quiz-choices').children;
  const pickRight = () => {
    const ans = String(parseCpaExpected(ensure('quiz-question').textContent));
    choices().find(b => b.textContent === ans).click();
  };
  const pickWrong = () => {
    const ans = String(parseCpaExpected(ensure('quiz-question').textContent));
    const btn = choices().find(b => b.textContent !== ans);
    btn.click();
    return btn.textContent;
  };

  // Q0: g:cpa-sub-10 바로 맞힘
  assert.equal(ensure('quiz-question').textContent, '10 − 3 = □');
  pickRight();
  // Q1: b=1 → 11 − 1 = □ (받아내림 없음 → g:cpa-sub-teen)
  rng.set(0.0, 0.0, 0.0);
  ensure('quiz-next').click();
  assert.equal(ensure('quiz-question').textContent, '11 − 1 = □');
  const w1 = pickWrong();
  pickRight();
  // Q2: 안 건드리고 넘기기
  ensure('quiz-next').click();
  // Q3: b=7, start=12 → 12 − 7 = □ (2 < 7 받아내림 → g:cpa-sub-teen-borrow)
  rng.set(0.0, 0.7, 0.2);
  ensure('quiz-next').click();
  assert.equal(ensure('quiz-question').textContent, '12 − 7 = □');
  pickRight();

  assert.deepEqual(plainLog(sb.LearningLog), [
    { subject: '수학', key: 'g:cpa-sub-10', firstTry: true, hinted: false, picks: [] },
    { subject: '수학', key: 'g:cpa-sub-teen', firstTry: false, hinted: false, picks: [w1] },
    { subject: '수학', key: 'g:cpa-sub-teen-borrow', firstTry: true, hinted: false, picks: [] },
  ]);
});

// ============================================================
// 2. 시계와 규칙 (clock_rules_logic.js)
// ============================================================
function loadClockRules({ rng, withLearningLog = true } = {}) {
  const ctx = makeBaseSandbox({ rng, withLearningLog });
  ctx.ensure('number-step', 'select').value = '2';
  ctx.ensure('bead-layout', 'select').value = 'train';
  vm.runInContext(read('kids/subjects/math/js/clock_rules_logic.js'), ctx.sb, { filename: 'clock_rules_logic.js' });
  return ctx;
}

test('시계와 규칙 — 시계 읽기: g:clock-<시>-<00|30>, 자동 hour-zone은 힌트 아님, 넘기기·탐색 복귀', () => {
  const rng = makeRngQueue([], 33);
  const { sb, ensure } = loadClockRules({ rng });

  // Q1: 0*30 → 12시 정각 (g:clock-12-00), 오답('12시 30분') → hour-zone 열려도 hinted: false → 정답('12시 정각')
  rng.set(0.01 / 24);
  ensure('clock-quiz').click();
  const c1 = ensure('clock-choices').children;
  c1.find(b => b.textContent === '12시 30분').click();
  assert.equal(ensure('hour-zone').hidden, false);
  c1.find(b => b.textContent === '12시 정각').click();

  // Q2: 9*30=270 → 4시 30분 (g:clock-4-30) → 바로 맞힘
  rng.set(9.1 / 24);
  ensure('clock-quiz').click();
  ensure('clock-choices').children.find(b => b.textContent === '4시 30분').click();

  // Q3: 4*30=120 → 2시 정각 (g:clock-2-00) → 틀린 뒤 새 문제로 넘기기 → 틀린 채 끝남 1건
  rng.set(4.1 / 24);
  ensure('clock-quiz').click();
  ensure('clock-choices').children.find(b => b.textContent === '3시 정각').click();

  // Q4: 15*30=450 → 7시 30분 (g:clock-7-30) → 안 건드리고 탐색 모드로 나감 → 0건
  rng.set(15.1 / 24);
  ensure('clock-quiz').click();
  ensure('clock-explore').click();

  // Q5: 12시 정각 → 틀린 뒤 탐색 모드로 나감 → 틀린 채 끝남 1건
  rng.set(0.01 / 24);
  ensure('clock-quiz').click();
  ensure('clock-choices').children.find(b => b.textContent === '1시 정각').click();
  ensure('clock-explore').click();

  assert.deepEqual(plainLog(sb.LearningLog), [
    { subject: '수학', key: 'g:clock-12-00', firstTry: false, hinted: false, picks: ['12시 30분'] },
    { subject: '수학', key: 'g:clock-4-30', firstTry: true, hinted: false, picks: [] },
    { subject: '수학', key: 'g:clock-2-00', firstTry: false, hinted: false, picks: ['3시 정각'] },
    { subject: '수학', key: 'g:clock-12-00', firstTry: false, hinted: false, picks: ['1시 정각'] },
  ]);
});

test('시계와 규칙 — 반복 무늬(ab·abc·abb)·뛰어 세기(2·5·10)·제외 활동(구슬 팔찌)', () => {
  // patternRound는 매번 Math.random을 3회 소비 (palette, size, Math.random()<.5 && size===3)
  const rng = makeRngQueue([0.0, 0.0, 0.9], 44); // 초기: fruit, size=2 → ab ([🍓,🍌], correct=🍌)
  const { sb, ensure } = loadClockRules({ rng });

  // 반복 무늬 1 (ab): 오답('⭐') → 정답('🍌')
  ensure('pattern-choices').children.find(b => b.textContent === '⭐').click();
  ensure('pattern-choices').children.find(b => b.textContent === '🍌').click();
  // 반복 무늬 2 (abc): palette=0, size=3(0.6), r=0.7(>=0.5 → abc), correct=🍇
  rng.set(0.0, 0.6, 0.7);
  ensure('pattern-next').click();
  ensure('pattern-choices').children.find(b => b.textContent === '🍇').click();
  // 반복 무늬 3 (abb): palette=0, size=3(0.6), r=0.1(<0.5 → abb), correct=🍌
  rng.set(0.0, 0.6, 0.1);
  ensure('pattern-next').click();
  ensure('pattern-choices').children.find(b => b.textContent === '🍌').click();
  // 반복 무늬 4 (ab): 틀린 뒤 넘기기
  rng.set(0.0, 0.0, 0.9);
  ensure('pattern-next').click();
  ensure('pattern-choices').children.find(b => b.textContent === '🍓').click();
  ensure('pattern-next').click();

  // 뛰어 세기 step=2 (초기 로드, 정답 10): 오답('9') → 정답('10')
  const grid = () => ensure('number-grid').children;
  grid()[8].click(); // n=9
  grid()[9].click(); // n=10

  // 뛰어 세기 step=5 (정답 25): 바로 맞힘
  ensure('number-step').value = '5';
  ensure('number-step').trigger('change');
  grid()[24].click(); // n=25

  // 뛰어 세기 step=10 (정답 50): 틀린 뒤 step 변경(넘기기) → 틀린 채 끝남 1건
  ensure('number-step').value = '10';
  ensure('number-step').trigger('change');
  grid()[39].click(); // n=40 (오답)
  ensure('number-step').value = '2';
  ensure('number-step').trigger('change');

  // 제외 활동: 구슬 팔찌 만들기·분석은 기록 0건 추가
  ensure('bead-palette').children[0].click();
  ensure('bead-palette').children[1].click();
  ensure('bead-analyze').click();

  assert.deepEqual(plainLog(sb.LearningLog), [
    { subject: '수학', key: 'g:pattern-ab', firstTry: false, hinted: false, picks: ['⭐'] },
    { subject: '수학', key: 'g:pattern-abc', firstTry: true, hinted: false, picks: [] },
    { subject: '수학', key: 'g:pattern-abb', firstTry: true, hinted: false, picks: [] },
    { subject: '수학', key: 'g:pattern-ab', firstTry: false, hinted: false, picks: ['🍓'] },
    { subject: '수학', key: 'g:skipcount-2', firstTry: false, hinted: false, picks: ['9'] },
    { subject: '수학', key: 'g:skipcount-5', firstTry: true, hinted: false, picks: [] },
    { subject: '수학', key: 'g:skipcount-10', firstTry: false, hinted: false, picks: ['40'] },
  ]);
});

// ============================================================
// 3. 100까지의 수 (number100.html)
// ============================================================
function extractInlineScript(html) {
  const matches = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.ok(matches.length >= 1, '인라인 스크립트가 있어야 함');
  return matches.at(-1)[1];
}

function extractButtonOnclick(html, id) {
  const re = new RegExp(`<button[^>]*id="${id}"[^>]*onclick="([^"]+)"`);
  const m = html.match(re);
  assert.ok(m, `HTML에서 #${id}의 onclick 속성을 찾지 못함`);
  return m[1];
}

function loadNumber100({ rng, withLearningLog = true } = {}) {
  const html = read('kids/subjects/math/number100.html');
  const script = extractInlineScript(html);
  const tensOnclick = extractButtonOnclick(html, 'tens-step-btn');
  const onesOnclick = extractButtonOnclick(html, 'ones-step-btn');
  const ctx = makeBaseSandbox({ rng, withLearningLog });
  vm.runInContext(script, ctx.sb, { filename: 'number100.html' });
  ctx.document._fire('DOMContentLoaded');
  const clickTensBtn = () => vm.runInContext(tensOnclick, ctx.sb);
  const clickOnesBtn = () => vm.runInContext(onesOnclick, ctx.sb);
  return { ...ctx, clickTensBtn, clickOnesBtn };
}

test('100까지의 수: diff-tens·same-tens·equal, HTML onclick 힌트 vs 오답 자동 단계 구분, 넘기기·제외 활동', () => {
  // nextCompareQ: cur = Math.floor(r * 90) + 10
  // Q1(초기 DOMContentLoaded): 45(35/90), 52(42/90) → diff-tens (<)
  // Q2: 42(32/90), 48(38/90) → same-tens (<)
  // Q3: 63(53/90), 63(53/90) → equal (=)
  // Q4: 35(25/90), 39(29/90) → same-tens (<) — 오답 뒤 ② 버튼 직접 클릭 (A안: hinted true)
  // Q5: 71(61/90), 23(13/90) → diff-tens (>) — 틀린 뒤 넘기기
  // Q6: 82(72/90), 14(4/90)  → diff-tens (>) — 힌트만 보고 안 풀고 넘기기 (0건)
  // Q7: 15(5/90), 25(15/90)  → diff-tens (<) — 안 건드리고 넘기기 (0건)
  const r = (n) => (n - 10 + 0.01) / 90;
  // startMemoryGame의 sort()가 Math.random을 소비하므로 memory 이후에 nextCompareQ가 돈다!
  // 따라서 DOMContentLoaded 후 명시적 nextCompareQ() 호출부터 정확한 난수 제어:
  let mode = 'init';
  const qSeq = [r(45), r(52), r(42), r(48), r(63), r(63), r(35), r(39), r(71), r(23), r(82), r(14), r(15), r(25)];
  let qi = 0;
  const rng = () => (mode === 'init' ? 0.5 : (qi < qSeq.length ? qSeq[qi++] : 0.5));

  const { sb, clickTensBtn, clickOnesBtn } = loadNumber100({ rng });
  mode = 'quiz';

  // Q1 (45 vs 52, diff-tens): 오답('>') → 자동 showCompareStep(1) → hinted: false → 정답('<') + 중복 클릭 무시
  sb.nextCompareQ();
  sb.chooseCompare('>');
  sb.chooseCompare('<');
  sb.chooseCompare('<'); // 중복 클릭은 무시되어 1건만 유지

  // Q2 (42 vs 48, same-tens): HTML의 #tens-step-btn onclick 직접 실행 → hinted: true → 바로 맞힘('<')
  sb.nextCompareQ();
  clickTensBtn();
  sb.chooseCompare('<');

  // Q3 (63 vs 63, equal): 바로 맞힘('=')
  sb.nextCompareQ();
  sb.chooseCompare('=');

  // Q4 (35 vs 39, same-tens): 오답('=') → 자동 ① 열림(hinted false) → 아이가 ② 버튼 직접 클릭(A안: hinted true) → 정답('<')
  sb.nextCompareQ();
  sb.chooseCompare('=');
  clickOnesBtn();
  sb.chooseCompare('<');

  // Q5 (71 vs 23, diff-tens): 틀린 뒤 넘기기 → 틀린 채 끝남 1건
  sb.nextCompareQ();
  sb.chooseCompare('<');
  sb.nextCompareQ();

  // Q6 (82 vs 14): 힌트만 누르고 답 없이 넘기기 → 0건
  clickTensBtn();
  sb.nextCompareQ();

  // Q7 (15 vs 25): 안 건드리고 넘기기 → 0건
  sb.nextCompareQ();

  // 제외 활동(묶음·기억 카드·사탕 바구니)은 기록 0건 추가
  sb.addBundle(1);
  sb.startMemoryGame();
  sb.resetPairs();

  assert.deepEqual(plainLog(sb.LearningLog), [
    { subject: '수학', key: 'g:n100-compare-diff-tens', firstTry: false, hinted: false, picks: ['>'] },
    { subject: '수학', key: 'g:n100-compare-same-tens', firstTry: true, hinted: true, picks: [] },
    { subject: '수학', key: 'g:n100-compare-equal', firstTry: true, hinted: false, picks: [] },
    { subject: '수학', key: 'g:n100-compare-same-tens', firstTry: false, hinted: true, picks: ['='] },
    { subject: '수학', key: 'g:n100-compare-diff-tens', firstTry: false, hinted: false, picks: ['<'] },
  ]);
});

test('100까지의 수: 맞힌 뒤 부등호를 다시 눌러도 보상은 한 번, 정답 안내도 그대로 (다음 문제에서는 다시 풀림)', () => {
  const r = (n) => (n - 10 + 0.01) / 90;
  let mode = 'init';
  const qSeq = [r(45), r(52), r(30), r(70)];
  let qi = 0;
  const rng = () => (mode === 'init' ? 0.5 : (qi < qSeq.length ? qSeq[qi++] : 0.5));
  const { sb, byId } = loadNumber100({ rng });
  mode = 'quiz';
  let grants = 0;
  sb.grantRewardAndShowUI = () => { grants++; };

  sb.nextCompareQ(); // 45 vs 52
  sb.chooseCompare('<');
  const solvedHtml = byId.get('compare-feedback').innerHTML;
  assert.match(solvedHtml, /정답/);
  sb.chooseCompare('<'); // 같은 정답 다시
  sb.chooseCompare('>'); // 맞힌 뒤 오답 기호
  assert.equal(grants, 1, '맞힌 뒤 다시 눌러도 보상은 한 번');
  assert.equal(byId.get('compare-feedback').innerHTML, solvedHtml, '맞힌 뒤 오답 안내로 덮어쓰지 않음');
  assert.equal(byId.get('compare-sign').textContent, '<', '맞힌 부등호가 그대로');

  sb.nextCompareQ(); // 30 vs 70 — 새 문제는 다시 풀 수 있다
  sb.chooseCompare('<');
  assert.equal(grants, 2);
  assert.deepEqual(plainLog(sb.LearningLog).map(e => [e.key, e.firstTry]), [
    ['g:n100-compare-diff-tens', true], ['g:n100-compare-diff-tens', true],
  ]);
});

// ============================================================
// 4. 입체도형 (shapes_logic.js)
// ============================================================
function loadShapes({ withLearningLog = true } = {}) {
  const ctx = makeBaseSandbox({
    withLearningLog,
    extra: { render3D() {}, drawSlideScene() {}, previewStack() {} },
  });
  vm.runInContext(read('kids/subjects/math/js/shapes_logic.js'), ctx.sb, { filename: 'shapes_logic.js' });
  ctx.document._fire('DOMContentLoaded');
  return ctx;
}

test('입체도형 — 생활 물건 모양 퀴즈: s:shape-quiz:<번호>, 넘기기, 11번째(두 바퀴째 첫 문제) 기록', () => {
  const { sb } = loadShapes();
  // 0번 주사위(상자 모양): 틀림 → 맞힘
  sb.checkShapeAns('둥근기둥 모양', '상자 모양');
  sb.checkShapeAns('상자 모양', '상자 모양');
  // 1번 음료수 캔(둥근기둥 모양): 바로 맞힘
  sb.nextShapeQuiz();
  sb.checkShapeAns('둥근기둥 모양', '둥근기둥 모양');
  // 2번 농구공(공 모양): 틀린 뒤 넘기기 → 틀린 채 끝남 1건
  sb.nextShapeQuiz();
  sb.checkShapeAns('상자 모양', '공 모양');
  // 3..9번: 안 건드리고 쭉 넘겨서 11번째(sqIdx=10, 두 바퀴째 0번)로 이동
  for (let i = 0; i < 8; i++) sb.nextShapeQuiz();
  // 두 바퀴째 0번 주사위: 바로 맞힘 → 새 session이라 정상 기록돼야 함
  sb.checkShapeAns('상자 모양', '상자 모양');

  assert.deepEqual(plainLog(sb.LearningLog), [
    { subject: '수학', key: 's:shape-quiz:0', firstTry: false, hinted: false, picks: ['둥근기둥 모양'] },
    { subject: '수학', key: 's:shape-quiz:1', firstTry: true, hinted: false, picks: [] },
    { subject: '수학', key: 's:shape-quiz:2', firstTry: false, hinted: false, picks: ['상자 모양'] },
    { subject: '수학', key: 's:shape-quiz:0', firstTry: true, hinted: false, picks: [] },
  ]);
});

test('입체도형 — 모양 조립 공방: s:shape-ws-<테마>:<단계>, 한글 오답, 테마 전환 skip, 재조립 새 회차', () => {
  const { sb } = loadShapes();
  // robot 0단계(box): 오답('cylinder' → '둥근기둥 모양') → 정답('box')
  sb.chooseWorkshopPart('cylinder');
  sb.chooseWorkshopPart('box');
  // robot 1단계(cylinder): 바로 맞힘
  sb.chooseWorkshopPart('cylinder');
  // robot 2단계(sphere): 바로 맞힘 → 완공
  sb.chooseWorkshopPart('sphere');
  // 다시 조립하기 → 새 회차라 robot 0단계가 다시 기록돼야 함
  sb.resetWorkshopCurrent();
  sb.chooseWorkshopPart('box');
  // robot 1단계 틀린 뒤 테마 전환(car) → robot:1 틀린 채 끝남 1건
  sb.chooseWorkshopPart('sphere');
  sb.selectWorkshopTheme('car');
  // car 0단계(box): 바로 맞힘
  sb.chooseWorkshopPart('box');

  assert.deepEqual(plainLog(sb.LearningLog), [
    { subject: '수학', key: 's:shape-ws-robot:0', firstTry: false, hinted: false, picks: ['둥근기둥 모양'] },
    { subject: '수학', key: 's:shape-ws-robot:1', firstTry: true, hinted: false, picks: [] },
    { subject: '수학', key: 's:shape-ws-robot:2', firstTry: true, hinted: false, picks: [] },
    { subject: '수학', key: 's:shape-ws-robot:0', firstTry: true, hinted: false, picks: [] },
    { subject: '수학', key: 's:shape-ws-robot:1', firstTry: false, hinted: false, picks: ['공 모양'] },
    { subject: '수학', key: 's:shape-ws-car:0', firstTry: true, hinted: false, picks: [] },
  ]);
});

// ============================================================
// 5. 공통 안전성: LearningLog 부재 및 지연 로드 방어
// ============================================================
test('LearningLog가 없어도 4개 화면 함수가 예외 없이 동작한다', () => {
  const cpa = loadCpa({ subtract: false, rng: makeRngQueue([0.0, 0.0], 55), withLearningLog: false });
  cpa.ensure('quiz-choices').children[0].click();
  cpa.ensure('quiz-next').click();

  const clk = loadClockRules({ rng: makeRngQueue([0.0], 66), withLearningLog: false });
  clk.ensure('clock-quiz').click();
  clk.ensure('clock-choices').children[0].click();
  clk.ensure('clock-explore').click();
  clk.ensure('pattern-choices').children[0].click();
  clk.ensure('pattern-next').click();
  clk.ensure('number-grid').children[0].click();

  const n100 = loadNumber100({ rng: makeRngQueue([0.2, 0.6], 77), withLearningLog: false });
  n100.clickTensBtn();
  n100.sb.chooseCompare('>');
  n100.sb.chooseCompare('<');
  n100.sb.nextCompareQ();

  const shp = loadShapes({ withLearningLog: false });
  shp.sb.checkShapeAns('공 모양', '상자 모양');
  shp.sb.checkShapeAns('상자 모양', '상자 모양');
  shp.sb.nextShapeQuiz();
  shp.sb.chooseWorkshopPart('cylinder');
  shp.sb.chooseWorkshopPart('box');
  shp.sb.selectWorkshopTheme('car');
});

test('LearningLog 지연 로드: 초기 렌더 뒤 첫 상호작용 전 로드되면 정상 기록, 오답 중 뒤늦게 로드되면 4개 화면 모두 거짓 첫 시도 성공 차단', () => {
  // 1) 초기 렌더 시점에 LearningLog 없음 → 첫 클릭 전에 붙음 → 첫 문제 정상 기록
  const cpa1 = loadCpa({ subtract: false, rng: makeRngQueue([0.0, 0.0], 88), withLearningLog: false });
  cpa1.sb.LearningLog = fakeLearningLog();
  const ans1 = String(parseCpaExpected(cpa1.ensure('quiz-question').textContent));
  cpa1.ensure('quiz-choices').children.find(b => b.textContent === ans1).click();
  assert.deepEqual(plainLog(cpa1.sb.LearningLog), [
    { subject: '수학', key: 'g:cpa-make10', firstTry: true, hinted: false, picks: [] },
  ]);

  // 2) CPA: 오답 중 미로드 → 정답 전 로드 → 해당 문항 건너뛰기, 다음 문제 정상 기록
  const cpa2 = loadCpa({ subtract: false, rng: makeRngQueue([0.0, 0.0], 89), withLearningLog: false });
  const cpaAns0 = String(parseCpaExpected(cpa2.ensure('quiz-question').textContent));
  cpa2.ensure('quiz-choices').children.find(b => b.textContent !== cpaAns0).click();
  cpa2.sb.LearningLog = fakeLearningLog();
  cpa2.ensure('quiz-choices').children.find(b => b.textContent === cpaAns0).click();
  assert.deepEqual(plainLog(cpa2.sb.LearningLog), []);
  cpa2.ensure('quiz-next').click();
  const cpaAns1 = String(parseCpaExpected(cpa2.ensure('quiz-question').textContent));
  cpa2.ensure('quiz-choices').children.find(b => b.textContent === cpaAns1).click();
  assert.equal(plainLog(cpa2.sb.LearningLog).length, 1);

  // 3) 시계와 규칙: 시계 퀴즈 오답 중 미로드 → 정답 전 로드 → 건너뛰기, 다음 문제 정상 기록
  const clkRng = makeRngQueue([], 90);
  const clk = loadClockRules({ rng: clkRng, withLearningLog: false });
  clkRng.set(0.01 / 24);
  clk.ensure('clock-quiz').click();
  clk.ensure('clock-choices').children.find(b => b.textContent === '12시 30분').click();
  clk.sb.LearningLog = fakeLearningLog();
  clk.ensure('clock-choices').children.find(b => b.textContent === '12시 정각').click();
  assert.deepEqual(plainLog(clk.sb.LearningLog), []);
  clkRng.set(9.1 / 24);
  clk.ensure('clock-quiz').click();
  clk.ensure('clock-choices').children.find(b => b.textContent === '4시 30분').click();
  assert.deepEqual(plainLog(clk.sb.LearningLog).map(x => [x.key, x.firstTry]), [['g:clock-4-30', true]]);

  // 4) 100까지의 수: 오답 중 미로드 → 정답 전 로드 → 건너뛰기, 다음 문제 정상 기록
  const r = (n) => (n - 10 + 0.01) / 90;
  const n100Rng = makeRngQueue([], 99);
  const n100 = loadNumber100({ rng: n100Rng, withLearningLog: false });
  n100Rng.set(r(55), r(55));
  n100.sb.nextCompareQ();
  n100.sb.chooseCompare('<');
  n100.sb.LearningLog = fakeLearningLog();
  n100.sb.chooseCompare('=');
  assert.deepEqual(plainLog(n100.sb.LearningLog), []);
  n100Rng.set(r(55), r(55));
  n100.sb.nextCompareQ();
  n100.sb.chooseCompare('=');
  assert.deepEqual(plainLog(n100.sb.LearningLog), [
    { subject: '수학', key: 'g:n100-compare-equal', firstTry: true, hinted: false, picks: [] },
  ]);

  // 5) 입체도형(모양 퀴즈 + 조립 공방): 오답 중 미로드 → 정답 전 로드 → 각 현재 문항 건너뛰기, 다음 문항·단계 정상 기록
  const shp = loadShapes({ withLearningLog: false });
  shp.sb.checkShapeAns('공 모양', '상자 모양');
  shp.sb.chooseWorkshopPart('sphere');
  shp.sb.LearningLog = fakeLearningLog();
  shp.sb.checkShapeAns('상자 모양', '상자 모양');
  shp.sb.chooseWorkshopPart('box');
  assert.deepEqual(plainLog(shp.sb.LearningLog), []);
  shp.sb.nextShapeQuiz();
  shp.sb.checkShapeAns('둥근기둥 모양', '둥근기둥 모양');
  shp.sb.chooseWorkshopPart('cylinder'); // robot 1단계
  assert.deepEqual(plainLog(shp.sb.LearningLog).map(x => [x.key, x.firstTry]), [
    ['s:shape-quiz:1', true],
    ['s:shape-ws-robot:1', true],
  ]);
});

test('실제 LearningLog.keyFor가 4차 문항키 10종을 모두 null 없이 정규 키로 만든다', () => {
  const sb = {
    console: { log() {}, warn() {}, error() {} },
    localStorage: { getItem: () => null, setItem() {} },
    document: { readyState: 'loading' },
    addEventListener() {},
  };
  sb.window = sb; sb.globalThis = sb;
  vm.createContext(sb);
  vm.runInContext(read('kids/core/learning-log.js'), sb, { filename: 'learning-log.js' });
  const { keyFor } = sb.LearningLog;

  const cases = [
    [['g', 'cpa-make10'], 'g:cpa-make10'],
    [['g', 'cpa-add-1x1'], 'g:cpa-add-1x1'],
    [['g', 'cpa-add-1x1-carry'], 'g:cpa-add-1x1-carry'],
    [['g', 'cpa-sub-10'], 'g:cpa-sub-10'],
    [['g', 'cpa-sub-teen'], 'g:cpa-sub-teen'],
    [['g', 'cpa-sub-teen-borrow'], 'g:cpa-sub-teen-borrow'],
    [['g', 'clock-12-00'], 'g:clock-12-00'],
    [['g', 'clock-4-30'], 'g:clock-4-30'],
    [['g', 'pattern-ab'], 'g:pattern-ab'],
    [['g', 'pattern-abc'], 'g:pattern-abc'],
    [['g', 'pattern-abb'], 'g:pattern-abb'],
    [['g', 'skipcount-2'], 'g:skipcount-2'],
    [['g', 'skipcount-5'], 'g:skipcount-5'],
    [['g', 'skipcount-10'], 'g:skipcount-10'],
    [['g', 'n100-compare-diff-tens'], 'g:n100-compare-diff-tens'],
    [['g', 'n100-compare-same-tens'], 'g:n100-compare-same-tens'],
    [['g', 'n100-compare-equal'], 'g:n100-compare-equal'],
    [['s', 'shape-quiz', 0], 's:shape-quiz:0'],
    [['s', 'shape-quiz', 9], 's:shape-quiz:9'],
    [['s', 'shape-ws-robot', 0], 's:shape-ws-robot:0'],
    [['s', 'shape-ws-car', 1], 's:shape-ws-car:1'],
    [['s', 'shape-ws-castle', 2], 's:shape-ws-castle:2'],
  ];
  for (const [args, expected] of cases) {
    assert.equal(keyFor(...args), expected);
  }
});
