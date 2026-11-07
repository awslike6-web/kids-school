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

function createEngineSandbox(overrides = {}, dataFile = 'kids/subjects/english/data/listen_place_5-2_L8.js') {
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

  vm.runInContext(read(dataFile), sandbox);
  vm.runInContext(read('kids/js/english_listen_place.js'), sandbox);
  vm.runInContext(read('kids/js/english_listen_place_dressup.js'), sandbox);
  vm.runInContext(read('kids/js/english_listen_place_timeline.js'), sandbox);
  vm.runInContext(read('kids/js/english_listen_place_map.js'), sandbox);

  return { sandbox, container, stageBox, trayBox, rewardCalls, initCalls, finalizeCalls, warnings };
}

test('파일 줄 수 및 금지 문자열 계약: 600줄 이하, 금지 API 없음, 상대 경로', () => {
  const files = [
    { path: 'kids/subjects/english/listen_place.html', max: 120 },
    { path: 'kids/js/english_listen_place.js', max: 600 },
    { path: 'kids/js/english_listen_place_dressup.js', max: 600 },
    { path: 'kids/js/english_listen_place_timeline.js', max: 600 },
    { path: 'kids/js/english_listen_place_map.js', max: 600 },
    { path: 'kids/subjects/english/data/listen_place_5-2_L8.js', max: 200 },
    { path: 'kids/subjects/english/data/listen_place_5-2_L10.js', max: 200 },
    { path: 'kids/subjects/english/data/listen_place_5-2_L11.js', max: 200 },
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

test('등록표에 5-2 L8과 5-2 L10이 있고 없는 grade·unit이면 장면을 불러오지 않는다', () => {
  const { sandbox } = createEngineSandbox();
  vm.runInContext(read('kids/subjects/english/data/english_unit_activities.js'), sandbox);
  const activities = sandbox.window.ENGLISH_UNIT_ACTIVITIES || [];

  const matchedL8 = activities.find(a => a.grade === '5-2' && a.unit === 'L8');
  assert.ok(matchedL8, '5-2 L8은 등록표에 있어야 합니다.');
  assert.equal(matchedL8.scene, 'data/listen_place_5-2_L8.js');

  const matchedL10 = activities.find(a => a.grade === '5-2' && a.unit === 'L10');
  assert.ok(matchedL10, '5-2 L10은 등록표에 있어야 합니다.');
  assert.equal(matchedL10.scene, 'data/listen_place_5-2_L10.js');

  const matchedL11 = activities.find(a => a.grade === '5-2' && a.unit === 'L11');
  assert.ok(matchedL11, '5-2 L11은 등록표에 있어야 합니다.');
  assert.equal(matchedL11.href, 'listen_place.html');
  assert.equal(matchedL11.scene, 'data/listen_place_5-2_L11.js');

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

test('8단원 회귀: 받침대 물건은 정답을 포함해 4개이고, 안경 문제는 모자(head)로 채워진다', () => {
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
  assert.equal(glassesTray.filter(it => it.slot === 'head').length, 3, '안경 문제 받침대는 모자(head) 3개로 채워져야 합니다.');
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

  const twoPartIdx = engine.getState().questions.findIndex(q => q.answer.length === 2 && !q.finale);
  engine.startQuestion(twoPartIdx);

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

  const firstRes = engine.attemptItemById('hair-short-curly');
  assert.equal(firstRes.correct, true);
  assert.equal(firstRes.completed, false, '두 부위 중 하나만 맞혔을 때는 완료되지 않아야 합니다.');
  assert.equal(rewardCalls.length, 0, '아직 두 부위를 다 맞히지 않았으므로 보상이 불리지 않아야 합니다.');

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

test('완주 뒤 보상 세션을 되살리지 않는다 (되살리면 페이지를 나갈 때 학습일지가 한 번 더 나감)', async () => {
  const { sandbox } = createEngineSandbox({
    fetchVocaFromNotion: async () => [
      { id: '3e4a2711-5b68-81fe-bfd0-ed97bdf1015c', word: "She's wearing a black skirt.", meaning: '검정 치마' },
      { id: '3e4a2711-5b68-81af-8696-d27e8acb7ba9', word: "He's wearing a red cap.", meaning: '빨간 모자' },
      { id: '3d8a2711-5b68-81a9-aed9-f716ecd0a5ad', word: 'She has long straight hair and blue eyes.', meaning: '긴 생머리와 파란 눈' }
    ],
    initQuizRewardSession: () => { sandbox.window.__quizRewardSession = { isLogged: false, correctCount: 0 }; },
    finalizeQuizRewardSession: async () => { sandbox.window.__quizRewardSession = null; }
  });
  const engine = sandbox.window.EnglishListenPlace;
  await engine.init({ containerId: 'listenPlaceApp' });
  engine.startSession();
  const questions = engine.getState().questions;
  for (let i = 0; i < questions.length; i++) {
    engine.startQuestion(i);
    const q = engine.getState().currentQuestion;
    if (q.finale) engine.attemptFinaleByAnswer(true);
    else q.answer.forEach(id => engine.attemptItemById(id));
  }
  await new Promise(r => setImmediate(r));
  assert.equal(sandbox.window.__quizRewardSession, null);
});

test('영어방이 받아 둔 아이별 어휘 캐시를 쓴다 (filterByStudent: true)', async () => {
  const seen = [];
  const { sandbox } = createEngineSandbox({ fetchVocaFromNotion: async (opts) => { seen.push(opts); return []; } });
  await sandbox.window.EnglishListenPlace.init({ containerId: 'listenPlaceApp' });
  assert.equal(seen.length, 1);
  assert.equal(seen[0].subject, '영어');
  assert.equal(seen[0].filterByStudent, true);
});

test('10단원(L10) 데이터 계약: 일반 문제 answer가 모두 items에 있고 문제마다 활동 1 + 시각 1이다', () => {
  const { sandbox } = createEngineSandbox({}, 'kids/subjects/english/data/listen_place_5-2_L10.js');
  const sceneData = sandbox.window.LISTEN_PLACE_SCENE;
  assert.equal(sceneData.scene, 'timeline');
  assert.equal(sceneData.grade, '5-2');
  assert.equal(sceneData.unit, 'L10');

  const itemMap = new Map(sceneData.items.map(it => [it.id, it]));
  const nightItem = itemMap.get('time-night');
  assert.ok(nightItem, 'time-night 아이템이 있어야 합니다.');
  assert.equal(nightItem.minutes, undefined, '밤 카드는 minutes가 없어야 합니다.');

  const regularQs = sceneData.questions.filter(q => !q.finale);
  assert.equal(regularQs.length, 6, '10단원 일반 문제는 6개여야 합니다.');

  for (const q of regularQs) {
    assert.equal(q.answer.length, 2, '각 일반 문제는 answer가 2개여야 합니다.');
    const resolved = q.answer.map(id => itemMap.get(id));
    assert.ok(resolved.every(Boolean), `answer ${q.answer.join(',')}가 모두 items에 있어야 합니다.`);
    assert.equal(resolved.filter(it => it.slot === 'activity').length, 1, '활동(activity) 1개가 있어야 합니다.');
    assert.equal(resolved.filter(it => it.slot === 'time').length, 1, '시각(time) 1개가 있어야 합니다.');
  }
});

test('10단원(L10) 받침대 및 판정: 정답 2 + 오답 2(활동 1·시각 1), 시각 카드 하나만 맞히면 미완료이고 둘 다 맞혀야 완료된다', async () => {
  const { sandbox, rewardCalls } = createEngineSandbox({
    fetchVocaFromNotion: async () => [
      { id: '3fea2711-5b68-81d4-b31b-d872af641716', word: 'I get up at 6.', meaning: '나는 6시에 일어나요.' },
      { id: '3fea2711-5b68-81a3-aeea-f5c66d1da3fc', word: 'I eat breakfast at 7.', meaning: '저는 7시에 아침을 먹어요.' },
      { id: '3fea2711-5b68-8184-af1d-cd7afa3b9bdd', word: 'I exercise at 7:50.', meaning: '저는 7시 50분에 운동합니다.' },
      { id: '40ca2711-5b68-8186-8c8d-df76ecc9cf44', word: 'early bird', meaning: '일찍 일어나는 사람' }
    ]
  }, 'kids/subjects/english/data/listen_place_5-2_L10.js');

  const engine = sandbox.window.EnglishListenPlace;
  const items = sandbox.window.LISTEN_PLACE_SCENE.items;

  await engine.init({ containerId: 'listenPlaceApp' });
  engine.startSession();

  const q = engine.getState().currentQuestion;
  const tray = engine._pickTrayItems(items, q.answer);
  assert.equal(tray.length, 4, '받침대 카드는 4장이어야 합니다.');

  const correctCards = tray.filter(it => q.answer.includes(it.id));
  const distractorCards = tray.filter(it => !q.answer.includes(it.id));
  assert.equal(correctCards.length, 2, '정답 카드가 2장이어야 합니다.');
  assert.equal(distractorCards.length, 2, '오답 카드가 2장이어야 합니다.');
  assert.equal(distractorCards.filter(it => it.slot === 'activity').length, 1, '오답 중 활동(activity) 카드가 1장이어야 합니다.');
  assert.equal(distractorCards.filter(it => it.slot === 'time').length, 1, '오답 중 시각(time) 카드가 1장이어야 합니다.');

  const timeAnsId = q.answer.find(id => id.startsWith('time-'));
  const actAnsId = q.answer.find(id => id.startsWith('act-'));

  // 시각 카드 하나만 맞혔을 때 미완료
  const resTimeOnly = engine.attemptItemById(timeAnsId);
  assert.equal(resTimeOnly.correct, true);
  assert.equal(resTimeOnly.completed, false, '시각 카드 하나만 맞히면 완료가 아니어야 합니다.');
  assert.equal(rewardCalls.length, 0);

  // 활동 카드까지 둘 다 맞혔을 때 완료
  const resBoth = engine.attemptItemById(actAnsId);
  assert.equal(resBoth.correct, true);
  assert.equal(resBoth.completed, true, '활동과 시각 둘 다 맞혀야 완료되어야 합니다.');
  assert.equal(rewardCalls.length, 1);
});

test('10단원(L10) 마지막 판 후보: early면 정답 후보만 6시 일어나기, night면 정답 후보만 밤 늦게까지 활동한다', async () => {
  const { sandbox } = createEngineSandbox({}, 'kids/subjects/english/data/listen_place_5-2_L10.js');
  const engine = sandbox.window.EnglishListenPlace;
  const items = sandbox.window.LISTEN_PLACE_SCENE.items;

  // 1) early bird 후보 검증
  const earlyCands = engine._buildFinaleCandidates(items, { finale: true, finaleKind: 'early' });
  assert.equal(earlyCands.length, 3);
  const earlyAnswers = earlyCands.filter(c => c.isAnswer);
  const earlyDistractors = earlyCands.filter(c => !c.isAnswer);
  assert.equal(earlyAnswers.length, 1);
  assert.equal(earlyDistractors.length, 2);
  assert.equal(earlyAnswers[0].getUpMinutes, 360, 'early 정답 후보는 6시(360분) 기상이어야 합니다.');
  assert.ok(earlyAnswers[0].schedule.some(s => s.activityId === 'act-get-up' && s.minutes === 360));
  for (const d of earlyDistractors) {
    assert.notEqual(d.getUpMinutes, 360, 'early 오답 후보는 6시 기상이 아니어야 합니다.');
    assert.ok(!d.schedule.some(s => s.activityId === 'act-get-up' && s.minutes === 360));
  }

  // 2) night owl 후보 검증
  const nightCands = engine._buildFinaleCandidates(items, { finale: true, finaleKind: 'night' });
  assert.equal(nightCands.length, 3);
  const nightAnswers = nightCands.filter(c => c.isAnswer);
  const nightDistractors = nightCands.filter(c => !c.isAnswer);
  assert.equal(nightAnswers.length, 1);
  assert.equal(nightDistractors.length, 2);
  assert.equal(nightAnswers[0].lateNightActivity, true, 'night 정답 후보는 밤 늦게까지 활동해야 합니다.');
  assert.ok(nightAnswers[0].schedule.some(s => s.minutes === null || s.minutes > 540));
  for (const d of nightDistractors) {
    assert.equal(d.lateNightActivity, false, 'night 오답 후보는 밤 늦게까지 활동하지 않아야 합니다.');
    assert.ok(!d.schedule.some(s => s.minutes === null || s.minutes > 540));
  }
});

const L11_MOCK_VOCA = [
  { id: '411a2711-5b68-815b-8d68-eff417bbe33e', word: 'Where is the library?', meaning: '도서관은 어디에 있나요?' },
  { id: '411a2711-5b68-8193-84ed-cc6b8a50cbe1', word: 'Where is the restaurant?', meaning: '식당은 어디에 있나요?' },
  { id: '411a2711-5b68-81a0-9c5c-d2b5222e558f', word: 'Where is the bank?', meaning: '은행은 어디에 있나요?' },
  { id: '411a2711-5b68-81f4-ac58-c232c502fc7c', word: 'Where is the hospital?', meaning: '병원은 어디에 있나요?' },
  { id: '411a2711-5b68-81ef-8bb9-e68b4a44983a', word: 'Where is the flower shop?', meaning: '꽃집은 어디에 있나요?' },
  { id: '411a2711-5b68-8174-872c-d9b89639b38d', word: 'Go straight two blocks and turn left.', meaning: '두 블록 직진해서 왼쪽으로 도세요.' },
  { id: '411a2711-5b68-8150-8796-e7d41af7d022', word: 'Go straight one block and turn right.', meaning: '한 블록 직진해서 오른쪽으로 도세요.' },
  { id: '411a2711-5b68-8158-b527-f2a773d7e008', word: 'Go straight and turn right at the big tree.', meaning: '직진해서 큰 나무에서 오른쪽으로 도세요.' },
  { id: '411a2711-5b68-8176-a8ab-cc6403486c43', word: "It's on your left.", meaning: '당신의 왼쪽에 있어요.' },
  { id: '411a2711-5b68-81fe-84ac-e6979bc045d4', word: "It's on your right.", meaning: '당신의 오른쪽에 있어요.' }
];

test('11단원(L11) 데이터 계약: 일반 문제 answer가 모두 items에 있고 문제마다 장소 1 + 위치 1이며 장소 카드에는 글자가 없다', () => {
  const { sandbox } = createEngineSandbox({}, 'kids/subjects/english/data/listen_place_5-2_L11.js');
  const sceneData = sandbox.window.LISTEN_PLACE_SCENE;
  assert.equal(sceneData.scene, 'map');
  assert.equal(sceneData.grade, '5-2');
  assert.equal(sceneData.unit, 'L11');
  assert.equal(sceneData.trayGuide, '아래 그림을 누르거나 지도 위 자리로 끌어다 놓으세요');

  const itemMap = new Map(sceneData.items.map(it => [it.id, it]));
  assert.ok(Array.isArray(sceneData.spots) && sceneData.spots.length >= 6 && sceneData.spots.length <= 8);
  for (const sp of sceneData.spots) {
    assert.ok(Array.isArray(sceneData.routes[sp.id]) && sceneData.routes[sp.id].length >= 2, `${sp.id} 경로 좌표가 있어야 합니다.`);
  }

  const regularQs = sceneData.questions.filter(q => !q.finale);
  assert.equal(regularQs.length, 5, '11단원 일반 문제는 5개여야 합니다.');

  for (const q of regularQs) {
    assert.ok(Array.isArray(q.pageIds) && q.pageIds.length >= 2, 'pageIds 배열이 있어야 합니다.');
    assert.equal(q.answer.length, 2, '각 일반 문제는 answer가 2개여야 합니다.');
    const resolved = q.answer.map(id => itemMap.get(id));
    assert.ok(resolved.every(Boolean), `answer ${q.answer.join(',')}가 모두 items에 있어야 합니다.`);
    assert.equal(resolved.filter(it => it.slot === 'place').length, 1, '장소(place) 1개가 있어야 합니다.');
    assert.equal(resolved.filter(it => it.slot === 'spot').length, 1, '위치(spot) 1개가 있어야 합니다.');
  }

  const mapScene = sandbox.window._PENDING_SCENES?.map || null;
  for (const it of sceneData.items.filter(i => i.slot === 'place')) {
    if (mapScene && typeof mapScene.renderItem === 'function') {
      const card = mapScene.renderItem(it);
      assert.equal(card._labelEl.textContent, '', '정답 전 장소 카드 라벨은 비어 있어야 합니다.');
      assert.doesNotMatch(card.children[0].innerHTML, /<text/i, `${it.id} 장소 그림 썸네일에 글자가 없어야 합니다.`);
    }
  }
});

test('11단원(L11) pageIds 이어 붙이기: 여러 행의 문장·뜻을 순서대로 합치고 하나라도 없으면 건너뛴다', async () => {
  const partialVoca = L11_MOCK_VOCA.filter(r => r.id !== '411a2711-5b68-81ef-8bb9-e68b4a44983a');
  const { sandbox, warnings } = createEngineSandbox({
    fetchVocaFromNotion: async () => partialVoca
  }, 'kids/subjects/english/data/listen_place_5-2_L11.js');

  const engine = sandbox.window.EnglishListenPlace;
  await engine.init({ containerId: 'listenPlaceApp' });
  const state = engine.getState();

  assert.equal(state.questions.length, 5, '빠진 flower shop 1문제를 건너뛰고 일반 4 + 피날레 1 = 5문제가 되어야 합니다.');
  assert.ok(warnings.some(w => w[1] === '411a2711-5b68-81ef-8bb9-e68b4a44983a'), '빠진 pageId로 경고를 남겨야 합니다.');
  const libQ = state.questions.find(q => !q.finale && q.answer.includes('place-library'));
  assert.equal(libQ.text, "Where is the library? Go straight and turn right at the big tree. It's on your left.");
  assert.equal(libQ.meaning, '도서관은 어디에 있나요? 직진해서 큰 나무에서 오른쪽으로 도세요. 당신의 왼쪽에 있어요.');
});

test('11단원(L11) 받침대: 정답 2 + 오답 2(장소 1·위치 1)이고 위치 오답은 좌우 바뀐 자리(confusable)가 먼저 나온다', () => {
  const { sandbox } = createEngineSandbox({}, 'kids/subjects/english/data/listen_place_5-2_L11.js');
  const engine = sandbox.window.EnglishListenPlace;
  const sceneData = sandbox.window.LISTEN_PLACE_SCENE;
  const items = sceneData.items;
  const itemMap = new Map(items.map(it => [it.id, it]));

  for (const q of sceneData.questions.filter(q => !q.finale)) {
    const ansSpotId = q.answer.find(id => id.startsWith('spot-'));
    const ansSpot = itemMap.get(ansSpotId);
    for (let trial = 0; trial < 25; trial++) {
      const tray = engine._pickTrayItems(items, q.answer);
      assert.equal(tray.length, 4, '받침대는 4장이어야 합니다.');
      const correctCards = tray.filter(it => q.answer.includes(it.id));
      const distractors = tray.filter(it => !q.answer.includes(it.id));
      assert.equal(correctCards.length, 2, '정답 2장이어야 합니다.');
      assert.equal(distractors.length, 2, '오답 2장이어야 합니다.');
      assert.equal(distractors.filter(it => it.slot === 'place').length, 1, '장소 오답 1장이어야 합니다.');
      const spotDistractors = distractors.filter(it => it.slot === 'spot');
      assert.equal(spotDistractors.length, 1, '위치 오답 1장이어야 합니다.');
      assert.ok(
        ansSpot.confusable.includes(spotDistractors[0].id),
        `${ansSpotId}의 위치 오답(${spotDistractors[0].id})은 confusable(${ansSpot.confusable.join(',')})에서 먼저 뽑혀야 합니다.`
      );
    }
  }
});

test('11단원(L11) 완료 및 경로 화살표: 하나만 맞히면 미완료·화살표 없음, 둘 다 맞혀야 완료되고 경로 화살표가 그려진다', async () => {
  const { sandbox, stageBox, rewardCalls } = createEngineSandbox({
    fetchVocaFromNotion: async () => L11_MOCK_VOCA
  }, 'kids/subjects/english/data/listen_place_5-2_L11.js');

  const engine = sandbox.window.EnglishListenPlace;
  await engine.init({ containerId: 'listenPlaceApp' });
  engine.startSession();

  const q = engine.getState().currentQuestion;
  const placeAnsId = q.answer.find(id => id.startsWith('place-'));
  const spotAnsId = q.answer.find(id => id.startsWith('spot-'));
  const stageWrapper = stageBox.children[stageBox.children.length - 1];

  assert.equal(stageWrapper._routeLayer.innerHTML, '', '초기 상태에서 경로 화살표는 없어야 합니다.');

  const resPlaceOnly = engine.attemptItemById(placeAnsId);
  assert.equal(resPlaceOnly.correct, true);
  assert.equal(resPlaceOnly.completed, false, '장소 하나만 맞히면 완료가 아니어야 합니다.');
  assert.equal(rewardCalls.length, 0);
  assert.equal(stageWrapper._routeLayer.innerHTML, '', '하나만 맞혔을 때는 경로 화살표가 그려지지 않아야 합니다.');

  const resBoth = engine.attemptItemById(spotAnsId);
  assert.equal(resBoth.correct, true);
  assert.equal(resBoth.completed, true, '장소와 위치를 둘 다 맞혀야 완료되어야 합니다.');
  assert.equal(rewardCalls.length, 1);
  assert.match(stageWrapper._routeLayer.innerHTML, /map-route-arrow/, '둘 다 맞힌 뒤 출발점→정답 자리 경로 화살표가 그려져야 합니다.');
});

test('11단원(L11) 마지막 판 후보: 정답 지도 1장만 데이터의 정답 경로와 같고 오답 2장은 좌우 반전·한 블록 더 간 경로다', () => {
  const { sandbox } = createEngineSandbox({}, 'kids/subjects/english/data/listen_place_5-2_L11.js');
  const engine = sandbox.window.EnglishListenPlace;
  const sceneData = sandbox.window.LISTEN_PLACE_SCENE;
  const finaleQ = sceneData.questions.find(q => q.finale);
  const expectedAnswerRoute = sceneData.routes[finaleQ.answerRoute];

  const cands = engine._buildFinaleCandidates(sceneData.items, finaleQ);
  assert.equal(cands.length, 3, '후보 지도는 3장이어야 합니다.');

  const answers = cands.filter(c => c.isAnswer);
  const distractors = cands.filter(c => !c.isAnswer);
  assert.equal(answers.length, 1, '정답 지도는 1장이어야 합니다.');
  assert.equal(distractors.length, 2, '오답 지도는 2장이어야 합니다.');

  assert.deepEqual(answers[0].route, expectedAnswerRoute, '정답 지도는 데이터의 정답 경로와 같아야 합니다.');
  for (const d of distractors) {
    assert.notDeepEqual(d.route, expectedAnswerRoute, '오답 지도는 데이터의 정답 경로와 달라야 합니다.');
  }
  const kinds = Array.from(distractors, d => d.kind).sort();
  assert.deepEqual(kinds, ['extra-block', 'wrong-turn'], '오답 2장은 좌우 바뀐 경로와 한 블록 더 간 경로여야 합니다.');
});

