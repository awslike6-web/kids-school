// tests/english-listen-place.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';

const basePath = new URL('../', import.meta.url);

function read(rel) {
  return readFileSync(new URL(rel, basePath), 'utf8');
}

function makeDomNode(tag = 'div') {
  const attrs = {};
  const classes = new Set();
  const children = [];
  const listeners = {};
  return {
    tagName: tag.toUpperCase(),
    innerHTML: '',
    textContent: '',
    style: {},
    children,
    setAttribute(k, v) { attrs[k] = String(v); },
    getAttribute(k) { return attrs[k] ?? null; },
    appendChild(child) { children.push(child); return child; },
    addEventListener(ev, fn) { (listeners[ev] = listeners[ev] || []).push(fn); },
    trigger(ev, e = {}) { (listeners[ev] || []).forEach(fn => fn(e)); },
    querySelector(sel) {
      if (sel === '.item-card-label') return this._labelEl || null;
      return makeDomNode();
    },
    querySelectorAll() { return []; },
    getBoundingClientRect() { return { left: 0, right: 200, top: 0, bottom: 300 }; },
    classList: {
      add(c) { classes.add(c); },
      remove(c) { classes.delete(c); },
      toggle(c, force) {
        if (force === undefined) {
          if (classes.has(c)) { classes.delete(c); return false; }
          classes.add(c); return true;
        }
        if (force) classes.add(c); else classes.delete(c);
        return Boolean(force);
      },
      contains(c) { return classes.has(c); }
    }
  };
}

function createEngineSandbox(overrides = {}) {
  const container = makeDomNode('main');
  container.id = 'listenPlaceApp';
  const stageBox = makeDomNode('div');
  const trayBox = makeDomNode('div');
  const finaleBox = makeDomNode('div');
  const sentEl = makeDomNode('div');
  const nextBar = makeDomNode('div');

  const elementsById = {
    listenPlaceApp: container,
    lpStageArea: stageBox,
    lpTrayArea: trayBox,
    lpFinaleStageArea: finaleBox,
    lpSentenceText: sentEl,
    lpNextBar: nextBar
  };

  container.querySelector = (sel) => {
    if (sel === '#lpStageArea') return stageBox;
    if (sel === '#lpTrayArea') return trayBox;
    if (sel === '#lpFinaleStageArea') return finaleBox;
    return makeDomNode();
  };

  const rewardCalls = [];
  const initCalls = [];
  const finalizeCalls = [];
  const warnings = [];

  const sandbox = {
    window: null,
    localStorage: {
      currentUser: 'son',
      getItem(k) { return this[k] ?? null; },
      setItem(k, v) { this[k] = String(v); }
    },
    document: {
      getElementById: (id) => elementsById[id] || makeDomNode(),
      createElement: (tag) => makeDomNode(tag),
      createElementNS: (_ns, tag) => makeDomNode(tag)
    },
    console: {
      log() {},
      warn: (msg, arg) => warnings.push([msg, arg]),
      error: console.error
    },
    setTimeout: (fn) => { fn(); return 1; },
    initQuizRewardSession: (type) => initCalls.push(type),
    rewardQuizCorrect: (idx) => rewardCalls.push(idx),
    finalizeQuizRewardSession: (opts) => finalizeCalls.push(opts),
    speakEnglish: () => {},
    fairyPraise: () => {},
    fairyEncourage: () => {},
    ...overrides
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);

  vm.runInContext(read('kids/subjects/english/data/listen_place_5-2_L8.js'), sandbox);
  vm.runInContext(read('kids/js/english_listen_place.js'), sandbox);
  vm.runInContext(read('kids/js/english_listen_place_dressup.js'), sandbox);

  return { sandbox, container, trayBox, rewardCalls, initCalls, finalizeCalls, warnings };
}

test('파일 줄 수 및 금지 문자열 계약: 600줄 이하, 금지 API 없음, 상대 경로', () => {
  const files = [
    { path: 'kids/subjects/english/listen_place.html', max: 120 },
    { path: 'kids/js/english_listen_place.js', max: 600 },
    { path: 'kids/js/english_listen_place_dressup.js', max: 600 },
    { path: 'kids/subjects/english/data/listen_place_5-2_L8.js', max: 200 },
    { path: 'kids/css/english_listen_place.css', max: 300 },
  ];

  for (const f of files) {
    assert.ok(existsSync(new URL(f.path, basePath)), `${f.path} 파일이 존재해야 합니다.`);
    const content = read(f.path);
    const lines = content.split('\n').length;
    assert.ok(lines <= f.max, `${f.path}는 최대 ${f.max}줄 이하여야 합니다. (현재 ${lines}줄)`);

    assert.doesNotMatch(content, /href=["']\/kids-school/i, `${f.path}에 루트 절대경로 금지`);
    assert.doesNotMatch(content, /src=["']\/kids-school/i, `${f.path}에 루트 절대경로 금지`);
    assert.doesNotMatch(content, /saveStudyLogDirect/, `${f.path}에 saveStudyLogDirect 금지`);
    assert.doesNotMatch(content, /speechSynthesis/, `${f.path}에 speechSynthesis 직접 호출 금지`);
    assert.doesNotMatch(content, /toISOString\(\)\.slice/, `${f.path}에 toISOString().slice 금지`);
  }
});

test('등록표에 없는 grade·unit이면 장면을 불러오지 않는다', () => {
  const { sandbox } = createEngineSandbox();
  vm.runInContext(read('kids/subjects/english/data/english_unit_activities.js'), sandbox);
  const activities = sandbox.window.ENGLISH_UNIT_ACTIVITIES || [];

  const matchedL8 = activities.find(a => a.grade === '5-2' && a.unit === 'L8');
  assert.ok(matchedL8, '5-2 L8은 등록표에 있어야 합니다.');
  const unmatched = activities.find(a => a.grade === '4-1' && a.unit === 'L1');
  assert.equal(unmatched, undefined, '등록표에 없는 단원은 매칭되지 않아야 합니다.');
});

test('캐시 모양 기록(id만 있고 pageId 없음)으로도 문제가 만들어지고 없는 page_id는 건너뛴다', async () => {
  const { sandbox, warnings } = createEngineSandbox({
    fetchVocaFromNotion: async () => [
      { id: '3e4a2711-5b68-81fe-bfd0-ed97bdf1015c', word: "She's wearing a black skirt.", meaning: '그녀는 검정 치마를 입고 있어요.' },
      { id: '3e4a2711-5b68-81af-8696-d27e8acb7ba9', word: "He's wearing a red cap.", meaning: '그는 빨간 모자를 쓰고 있어요.' },
      { id: '3e4a2711-5b68-8118-afae-dcec7fe4da54', word: "He's wearing glasses.", meaning: '그는 안경을 쓰고 있어요.' },
      { id: '3d8a2711-5b68-81a9-aed9-f716ecd0a5ad', word: 'She has long straight hair and blue eyes.', meaning: '그녀는 긴 생머리와 파란 눈을 가지고 있어요.' }
    ]
  });

  await sandbox.window.EnglishListenPlace.init({ containerId: 'listenPlaceApp' });
  const state = sandbox.window.EnglishListenPlace.getState();

  assert.equal(state.questions.length, 4, 'id만 있는 캐시 레코드로도 유효 문제 4개가 만들어져야 합니다.');
  assert.ok(warnings.some(w => String(w[0]).includes('VOCA에 없는 pageId 건너뜀')), '없는 pageId는 경고를 남기고 건너뛰어야 합니다.');
});

test('받침대 물건은 정답을 포함해 4개이고, 같은 부위가 모자라면 다른 부위(모자 등)로 채운다', () => {
  const { sandbox } = createEngineSandbox();
  const engine = sandbox.window.EnglishListenPlace;
  const items = sandbox.window.LISTEN_PLACE_SCENE.items;

  // 같은 부위에 물건이 4개 있는 경우(hair)
  const hairTray = engine._pickTrayItems(items, ['hair-long-straight']);
  assert.equal(hairTray.length, 4);
  assert.ok(hairTray.some(it => it.id === 'hair-long-straight'));
  assert.equal(hairTray.filter(it => it.slot === 'hair').length, 4, '같은 부위에 물건이 충분하면 같은 부위에서 4개를 뽑는다.');

  // 안경(glasses)처럼 같은 부위에 다른 물건이 없는 경우
  const glassesTray = engine._pickTrayItems(items, ['glasses']);
  assert.equal(glassesTray.length, 4);
  assert.ok(glassesTray.some(it => it.id === 'glasses'), '정답 안경이 포함되어야 합니다.');
  assert.equal(glassesTray.filter(it => it.slot === 'glasses').length, 1, '헷갈리는 선글라스·고글 등이 없어야 합니다.');
  assert.equal(glassesTray.filter(it => it.slot !== 'glasses').length, 3, '모자 등 다른 부위 물건 3개로 채워져야 합니다.');
});

test('정답 전 받침대 카드에 영어 글자가 없고, 맞힌 뒤에 영어 글자가 표시된다', async () => {
  const { sandbox, trayBox } = createEngineSandbox({
    fetchVocaFromNotion: async () => [
      { id: '3e4a2711-5b68-81fe-bfd0-ed97bdf1015c', word: "She's wearing a black skirt.", meaning: '검정 치마' },
      { id: '3e4a2711-5b68-81af-8696-d27e8acb7ba9', word: "He's wearing a red cap.", meaning: '빨간 모자' },
      { id: '3d8a2711-5b68-81a9-aed9-f716ecd0a5ad', word: 'She has long straight hair and blue eyes.', meaning: '긴 생머리와 파란 눈' }
    ]
  });

  const engine = sandbox.window.EnglishListenPlace;
  await engine.init({ containerId: 'listenPlaceApp' });
  engine.startSession();

  assert.equal(trayBox.children.length, 4, '받침대에 카드 4개가 렌더링되어야 합니다.');
  for (const card of trayBox.children) {
    assert.equal(card._labelEl.textContent, '', '정답 전에는 받침대 카드 라벨에 영어 글자가 없어야 합니다.');
  }

  const q = engine.getState().currentQuestion;
  const ansId = q.answer[0];
  engine.attemptItemById(ansId);

  const ansCard = trayBox.children.find(c => c.getAttribute('data-item-id') === ansId);
  assert.ok(ansCard._labelEl.textContent.length > 0, '맞힌 뒤에는 카드 라벨에 영어 글자가 표시되어야 합니다.');
});

test('실제 엔진 판정(_judge): 오답에서는 보상 함수가 불리지 않고 정답 안내 대상이 정해지며, 두 부위 문장은 두 개를 다 맞혀야 완료된다', async () => {
  const { sandbox, rewardCalls } = createEngineSandbox({
    fetchVocaFromNotion: async () => [
      { id: '3d8a2711-5b68-81bf-8fc8-d7de33acd759', word: 'He has short curly hair and green eyes.', meaning: '짧은 곱슬머리와 초록 눈' },
      { id: '3e4a2711-5b68-81fe-bfd0-ed97bdf1015c', word: "She's wearing a black skirt.", meaning: '검정 치마' },
      { id: '3d8a2711-5b68-81a9-aed9-f716ecd0a5ad', word: 'She has long straight hair and blue eyes.', meaning: '긴 생머리와 파란 눈' }
    ]
  });

  const engine = sandbox.window.EnglishListenPlace;
  await engine.init({ containerId: 'listenPlaceApp' });
  engine.startSession();

  // 두 부위 문장으로 강제 이동하여 실제 엔진 흐름 시험
  const twoPartIdx = engine.getState().questions.findIndex(q => q.answer.length === 2 && !q.finale);
  engine.startQuestion(twoPartIdx);

  // 1) 오답 시도 (순수 함수 _judge 및 실제 attemptItemById)
  const pureWrong = engine._judge(
    { answer: ['hair-short-curly', 'eyes-green'], text: 'He has short curly hair and green eyes.' },
    [],
    { id: 'cap-red', label: 'red cap' }
  );
  assert.equal(pureWrong.correct, false);
  assert.deepEqual(Array.from(pureWrong.guideTargets), ['hair-short-curly', 'eyes-green']);

  const wrongRes = engine.attemptItemById('cap-red');
  assert.equal(wrongRes.correct, false, '오답 판정이어야 합니다.');
  assert.equal(wrongRes.completed, false);
  assert.equal(rewardCalls.length, 0, '오답에서는 rewardQuizCorrect가 불리지 않아야 합니다.');
  assert.deepEqual(Array.from(wrongRes.guideTargets), ['hair-short-curly', 'eyes-green'], '오답 시 정답 안내 대상이 정해져야 합니다.');

  // 2) 두 부위 중 첫 번째 부위만 정답 시도
  const firstRes = engine.attemptItemById('hair-short-curly');
  assert.equal(firstRes.correct, true);
  assert.equal(firstRes.completed, false, '두 부위 중 하나만 맞혔을 때는 완료되지 않아야 합니다.');
  assert.equal(rewardCalls.length, 0, '아직 두 부위를 다 맞히지 않았으므로 보상이 불리지 않아야 합니다.');

  // 3) 두 번째 부위까지 정답 시도
  const secondRes = engine.attemptItemById('eyes-green');
  assert.equal(secondRes.correct, true);
  assert.equal(secondRes.completed, true, '두 부위를 다 맞혀야 완료되어야 합니다.');
  assert.equal(rewardCalls.length, 1, '완료 시 rewardQuizCorrect가 불려야 합니다.');
});

test('한 판 완주: 정답마다 rewardQuizCorrect가 서로 다른 번호로 불리고, 완주 때 finalizeQuizRewardSession이 isFullComplete: true, subject: 영어(L8)로 불린다', async () => {
  const { sandbox, initCalls, rewardCalls, finalizeCalls } = createEngineSandbox({
    fetchVocaFromNotion: async () => [
      { id: '3e4a2711-5b68-81fe-bfd0-ed97bdf1015c', word: "She's wearing a black skirt.", meaning: '검정 치마' },
      { id: '3e4a2711-5b68-81af-8696-d27e8acb7ba9', word: "He's wearing a red cap.", meaning: '빨간 모자' },
      { id: '3d8a2711-5b68-81a9-aed9-f716ecd0a5ad', word: 'She has long straight hair and blue eyes.', meaning: '긴 생머리와 파란 눈' }
    ]
  });

  const engine = sandbox.window.EnglishListenPlace;
  await engine.init({ containerId: 'listenPlaceApp' });
  engine.startSession();

  assert.deepEqual(initCalls, ['listen_place'], 'initQuizRewardSession("listen_place")가 불려야 합니다.');

  // 첫 문제에서 오답 1회 발생시킨 뒤 모든 문제 정답 진행
  engine.attemptItemById('pants-blue');

  const questions = engine.getState().questions;
  for (let i = 0; i < questions.length; i++) {
    engine.startQuestion(i);
    const q = engine.getState().currentQuestion;
    if (q.finale) {
      engine.attemptFinaleByAnswer(true);
    } else {
      for (const ansId of q.answer) {
        engine.attemptItemById(ansId);
      }
    }
  }

  assert.deepEqual(rewardCalls, [0, 1, 2], '정답마다 서로 다른 문제 번호(0, 1, 2)로 rewardQuizCorrect가 불려야 합니다.');
  assert.equal(finalizeCalls.length, 1, '완주 시 finalizeQuizRewardSession이 1회 불려야 합니다.');
  assert.equal(finalizeCalls[0].isFullComplete, true);
  assert.equal(finalizeCalls[0].subject, '영어(L8)');
  assert.equal(finalizeCalls[0].childName, '민수');
  assert.match(finalizeCalls[0].errorReport, /\(오답: blue pants\)/, '오답 기록이 문장 (오답: 물건) 형식으로 전달되어야 합니다.');
});
