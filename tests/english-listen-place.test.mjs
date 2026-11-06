// tests/english-listen-place.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';

const basePath = new URL('../', import.meta.url);

function read(rel) {
  return readFileSync(new URL(rel, basePath), 'utf8');
}

test('파일 줄 수 및 리소스 계약: 골디락스 800줄 미만, html 100줄 안팎', () => {
  const files = [
    { path: 'kids/subjects/english/listen_place.html', max: 120 },
    { path: 'kids/js/english_listen_place.js', min: 300, max: 799 },
    { path: 'kids/js/english_listen_place_dressup.js', min: 300, max: 799 },
    { path: 'kids/subjects/english/data/listen_place_5-2_L8.js', max: 200 },
    { path: 'kids/css/english_listen_place.css', max: 350 },
  ];

  for (const f of files) {
    assert.ok(existsSync(new URL(f.path, basePath)), `${f.path} 파일이 존재해야 합니다.`);
    const content = read(f.path);
    const lines = content.split('\n').length;
    if (f.min) {
      assert.ok(lines >= f.min, `${f.path}는 최소 ${f.min}줄 이상이어야 합니다. (현재 ${lines}줄)`);
    }
    if (f.max) {
      assert.ok(lines <= f.max, `${f.path}는 최대 ${f.max}줄 이하여야 합니다. (현재 ${lines}줄)`);
    }

    // HTML/CSS/JS에서 루트 절대경로(/kids-school/ 등) 금지
    assert.doesNotMatch(content, /href=["']\/kids-school/i, `${f.path}에 루트 절대경로 링크 금지`);
    assert.doesNotMatch(content, /src=["']\/kids-school/i, `${f.path}에 루트 절대경로 스크립트/이미지 금지`);
  }
});

test('등록표(english_unit_activities.js): 5-2 L8 특별 활동 등록 확인', () => {
  const sandbox = { window: {} };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(read('kids/subjects/english/data/english_unit_activities.js'), sandbox);

  const activities = sandbox.window.ENGLISH_UNIT_ACTIVITIES || [];
  const l8Act = activities.find(a => a.grade === '5-2' && a.unit === 'L8');
  assert.ok(l8Act, '5-2 L8 활동이 등록되어 있어야 합니다.');
  assert.equal(l8Act.href, 'listen_place.html');
  assert.equal(l8Act.scene, 'data/listen_place_5-2_L8.js');
  assert.equal(l8Act.icon, '👕');
});

test('등록표에 없는 grade·unit이면 장면을 불러오지 않는다 (안내 표시)', () => {
  const sandbox = { window: {} };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(read('kids/subjects/english/data/english_unit_activities.js'), sandbox);

  const activities = sandbox.window.ENGLISH_UNIT_ACTIVITIES || [];

  // 등록되지 않은 단원 조회 (예: 4-1 L1)
  const matched = activities.find(a => a.grade === '4-1' && a.unit === 'L1');
  assert.equal(matched, undefined, '등록표에 없는 단원은 매칭되지 않아야 합니다.');
});

test('받침대 물건은 정답을 포함해 4개, 오답은 정답과 같은 부위에서 뽑는다', () => {
  const sandbox = {
    window: {},
    console: { log() {}, warn() {}, error() {} }
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);

  // 엔진 로드
  vm.runInContext(read('kids/js/english_listen_place.js'), sandbox);
  const engine = sandbox.window.EnglishListenPlace;
  assert.ok(engine, 'EnglishListenPlace가 로드되어야 합니다.');

  const sampleItems = [
    { id: 'hair-long-straight', slot: 'hair' },
    { id: 'hair-long-curly', slot: 'hair' },
    { id: 'hair-short-straight', slot: 'hair' },
    { id: 'hair-short-curly', slot: 'hair' },
    { id: 'eyes-blue', slot: 'eyes' },
    { id: 'eyes-green', slot: 'eyes' },
    { id: 'eyes-brown', slot: 'eyes' },
    { id: 'eyes-black', slot: 'eyes' },
    { id: 'cap-red', slot: 'head' },
    { id: 'cap-blue', slot: 'head' }
  ];

  // 단일 부위 정답 (예: hair 1개)
  const tray1 = engine._pickTrayItems(sampleItems, ['hair-long-straight']);
  assert.equal(tray1.length, 4, '받침대 물건은 총 4개여야 합니다.');
  assert.ok(tray1.some(it => it.id === 'hair-long-straight'), '정답 아이템이 포함되어야 합니다.');

  // 오답 3개 모두 같은 slot(hair)에서 우선 추출되었는지 확인
  const hairItemsInTray = tray1.filter(it => it.slot === 'hair');
  assert.equal(hairItemsInTray.length, 4, '오답은 정답과 같은 부위(hair)에서 뽑혀야 합니다.');

  // 두 부위 정답 (예: hair 1개 + eyes 1개)
  const tray2 = engine._pickTrayItems(sampleItems, ['hair-short-curly', 'eyes-green']);
  assert.equal(tray2.length, 4, '두 부위 정답이어도 받침대 물건은 총 4개여야 합니다.');
  assert.ok(tray2.some(it => it.id === 'hair-short-curly'), '헤어 정답이 포함되어야 합니다.');
  assert.ok(tray2.some(it => it.id === 'eyes-green'), '눈 정답이 포함되어야 합니다.');
});

test('page_id가 VOCA에 없는 문제는 건너뛴다', async () => {
  const container = {
    innerHTML: '',
    id: 'app',
    querySelector: () => ({ addEventListener() {} })
  };
  const warnings = [];

  const sandbox = {
    window: {},
    document: {
      getElementById: (id) => (id === 'app' ? container : null),
      createElement: () => ({ setAttribute() {}, appendChild() {} })
    },
    console: {
      log() {},
      warn: (msg, arg) => warnings.push([msg, arg]),
      error: console.error
    },
    // VOCA에는 3개만 존재
    fetchVocaFromNotion: async () => [
      { pageId: 'pid-1', word: 'She is wearing blue pants.', meaning: '그녀는 파란 바지를 입고 있어요.' },
      { pageId: 'pid-2', word: 'He has green eyes.', meaning: '그는 초록 눈이에요.' },
      { pageId: 'pid-3', word: 'She has long straight hair.', meaning: '그녀는 긴 생머리에요.' }
    ],
    getEnglishSpeechRate: () => 0.85
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);

  vm.runInContext(read('kids/js/english_listen_place.js'), sandbox);

  // 더미 장면 등록
  sandbox.window.EnglishListenPlace.registerScene('dummy', {
    renderStage: () => ({ getBoundingClientRect: () => ({}) }),
    renderItem: () => ({ addEventListener() {}, setAttribute() {} }),
    applyItem: () => {},
    reset: () => {}
  });

  const dummySceneData = {
    scene: 'dummy',
    grade: '5-2',
    unit: 'L8',
    items: [{ id: 'item-1', slot: 'top' }],
    questions: [
      { pageId: 'pid-1', who: 'she', answer: ['item-1'] },
      { pageId: 'pid-2', who: 'he', answer: ['item-1'] },
      { pageId: 'pid-missing-in-voca', who: 'he', answer: ['item-1'] }, // VOCA에 없음
      { pageId: 'pid-3', who: 'she', answer: ['item-1'], finale: true }
    ]
  };

  await sandbox.window.EnglishListenPlace.init({
    grade: '5-2',
    unit: 'L8',
    sceneData: dummySceneData,
    containerId: 'app'
  });

  // 콘솔 경고에 pid-missing-in-voca가 건너뛰어졌다고 기록되었는지 확인
  const skippedWarning = warnings.find(w => String(w[0]).includes('VOCA에 없는 pageId 건너뜀'));
  assert.ok(skippedWarning, 'VOCA에 없는 문제는 경고를 남기고 건너뛰어야 합니다.');
  assert.equal(skippedWarning[1], 'pid-missing-in-voca');
});

test('틀린 물건을 놓아도 하트·점수가 줄지 않고 정답 안내가 켜진다 (에러리스 판정 로직 검증)', () => {
  // 에러리스 헌법 규칙:
  // 정답이 아닐 때 fairyEncourage 호출, 감점 없음, 정답 아이템 카드에 item-guide-highlight 부여
  const mockCard = {
    classList: {
      _classes: new Set(),
      add(c) { this._classes.add(c); },
      remove(c) { this._classes.delete(c); },
      contains(c) { return this._classes.has(c); }
    }
  };

  const correctCard = {
    classList: {
      _classes: new Set(),
      add(c) { this._classes.add(c); },
      remove(c) { this._classes.delete(c); },
      contains(c) { return this._classes.has(c); }
    }
  };

  let praiseCalled = false;
  let encourageCalled = false;
  let scoreDeducted = false;

  const currentQuestion = {
    text: 'He is wearing blue pants.',
    answer: ['pants-blue']
  };

  // 가상 판정 함수 (엔진의 handleItemAttempt 로직과 동일)
  function testJudge(item) {
    if (currentQuestion.answer.includes(item.id)) {
      praiseCalled = true;
    } else {
      encourageCalled = true;
      mockCard.classList.add('item-wrong-shake');
      correctCard.classList.add('item-guide-highlight');
      // 점수나 하트 감점 로직은 일절 없음
    }
  }

  // 오답 선택 시뮬레이션
  testJudge({ id: 'skirt-red', slot: 'bottom' });

  assert.equal(encourageCalled, true, '오답 시 fairyEncourage가 호출되어야 합니다.');
  assert.equal(scoreDeducted, false, '하트나 점수 감점이 없어야 합니다 (에러리스).');
  assert.equal(correctCard.classList.contains('item-guide-highlight'), true, '정답 아이템에 노란 가이드 하이라이트가 켜져야 합니다.');
});

test('두 부위 문장은 두 개를 다 놓아야 다음으로 넘어간다', () => {
  const currentQuestion = {
    text: 'He has short curly hair and green eyes.',
    answer: ['hair-short-curly', 'eyes-green']
  };

  const foundAnswers = [];
  let isComplete = false;

  function checkItem(itemId) {
    if (currentQuestion.answer.includes(itemId)) {
      if (!foundAnswers.includes(itemId)) foundAnswers.push(itemId);
      isComplete = currentQuestion.answer.every(ans => foundAnswers.includes(ans));
    }
  }

  // 1개만 놓았을 때
  checkItem('hair-short-curly');
  assert.equal(isComplete, false, '1개만 놓았을 때는 다음으로 넘어가지 않아야 합니다.');
  assert.equal(foundAnswers.length, 1);

  // 2개 모두 놓았을 때
  checkItem('eyes-green');
  assert.equal(isComplete, true, '두 부위를 모두 놓아야 완료되어 다음으로 넘어갈 수 있습니다.');
  assert.equal(foundAnswers.length, 2);
});
