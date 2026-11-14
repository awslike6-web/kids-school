import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

function makeSeedRng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// DOM·localStorage 없이 순수 QuizChoices 로드 검증
function loadQuizChoicesOnly(rng) {
  const code = readFileSync(new URL('../kids/core/quiz-flow-controller.js', import.meta.url), 'utf8');
  const sandbox = {
    console,
    Math: Object.assign(Object.create(Math), rng ? { random: rng } : {}),
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: 'kids/core/quiz-flow-controller.js' });
  return sandbox.QuizChoices;
}

function makeFakeElement(tag = 'div') {
  return {
    tagName: tag.toUpperCase(),
    className: '',
    innerHTML: '',
    style: {},
    children: [],
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    closest() { return null; },
  };
}

function extractRenderedButtons(html) {
  const buttons = [];
  const re = /<button[^>]*data-choice-index="(\d+)"[^>]*onclick="([^"]+)"[^>]*>([\s\S]*?)<\/button>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    buttons.push({
      choiceIndex: Number(m[1]),
      onclick: m[2],
      label: m[3].trim(),
    });
  }
  return buttons;
}

test('QuizChoices.arrange: 모든 보기를 정확히 한 번씩 돌려주고 원래 index를 유지한다', () => {
  const QC = loadQuizChoicesOnly();
  const input = ['고조선', '고구려', '백제', '신라'];
  const snapshot = input.slice();
  const arranged = QC.arrange(input, { rng: makeSeedRng(20261114) });

  assert.deepEqual(input, snapshot); // 원본 배열 불변
  assert.equal(arranged.length, input.length);
  const seenIndices = arranged.map(x => x.index).sort((a, b) => a - b);
  assert.deepEqual(seenIndices, [0, 1, 2, 3]);
  for (const item of arranged) {
    assert.equal(item.text, input[item.index]);
  }
});

test('QuizChoices: 고정 순서 규칙 1·2·3은 원래 순서를 그대로 유지한다', () => {
  const QC = loadQuizChoicesOnly();
  const deterministicRng = makeSeedRng(99);

  // 규칙 1: 2지선다 짝
  for (const pair of [['O', 'X'], ['o', 'x'], ['○', '×'], ['예', '아니요'], ['맞다', '틀리다']]) {
    const out = QC.arrange(pair, { rng: deterministicRng });
    assert.deepEqual(out.map(x => x.index), [0, 1], `고정 짝 실패: ${pair.join('/')}`);
  }

  // 규칙 2: 다른 보기를 가리키는 표현 및 조합형
  const rule2Cases = [
    ['갑오개혁', '을미개혁', '위 내용 모두', '정미조약'],
    ['가', '나', '위의 내용 모두', '해당 사항 없음'],
    ['선택 A', '선택 B', '선택 C', '모두 맞다'],
    ['선택 A', '선택 B', '선택 C', '모두 옳다'],
    ['선택 A', '선택 B', '선택 C', '정답 없음'],
    ['선택 A', '선택 B', '선택 C', '없다'],
    ['선택 A', '선택 B', '①과 ②', '모두'],
    ['ㄱ', 'ㄴ', 'ㄱ, ㄴ', 'ㄷ'],
    ['가', '나', '가와 나', '다'],
  ];
  for (const choices of rule2Cases) {
    const out = QC.arrange(choices, { rng: deterministicRng });
    assert.deepEqual(out.map(x => x.index), [0, 1, 2, 3], `규칙 2 실패: ${choices.join(' | ')}`);
  }

  // 규칙 3: opts.fixed === true
  const normal = ['1894년', '1905년', '1910년', '1919년'];
  const fixedOut = QC.arrange(normal, { fixed: true, rng: deterministicRng });
  assert.deepEqual(fixedOut.map(x => x.index), [0, 1, 2, 3]);

  // 오탐 방지: 문장 속 일반 '모두'/'위의'는 정상 섞기
  const sentenceWithModu = [
    '체육 시간과 군사 훈련이 모두 없어졌다.',
    '몸뻬 교복을 입고 군사 훈련을 받았다.',
    '자유로운 복장으로 수업을 들었다.',
    '지도는 땅 위의 모습을 나타낸 그림이다.',
  ];
  assert.equal(QC.isFixedOrder(sentenceWithModu), false);
  const shuffledSentence = QC.arrange(sentenceWithModu, { rng: makeSeedRng(7) });
  assert.notDeepEqual(shuffledSentence.map(x => x.index), [0, 1, 2, 3]);
});

test('QuizChoices.arrange: 시드 rng 4,000번 섞기 시 0번 보기가 각 위치에 18~32%로 고르게 분포하고 재현 가능하다', () => {
  const QC = loadQuizChoicesOnly();
  const choices = ['정답 보기', '오답 1', '오답 2', '오답 3'];
  const rng = makeSeedRng(123456);
  const posCounts = [0, 0, 0, 0];
  const N = 4000;

  for (let t = 0; t < N; t++) {
    const out = QC.arrange(choices, { rng });
    const posOfZero = out.findIndex(item => item.index === 0);
    posCounts[posOfZero]++;
  }

  for (let p = 0; p < 4; p++) {
    const ratio = posCounts[p] / N;
    assert.ok(ratio >= 0.18 && ratio <= 0.32, `위치 ${p} 비율 이탈: ${(ratio * 100).toFixed(2)}%`);
  }

  const run1 = QC.arrange(choices, { rng: makeSeedRng(777) });
  const run2 = QC.arrange(choices, { rng: makeSeedRng(777) });
  assert.deepEqual(run1, run2);
});

test('A1 society_chart.js: 섞인 순서로 버튼 번호를 표시하되 원래 data-choice-index로 채점하고 재시도 시 순서를 유지한다', async () => {
  const container = makeFakeElement('div');
  const modals = { chartSuccessModal: makeFakeElement('div') };
  const alerts = [];
  const rewards = [];
  const retries = [];

  const sandbox = {
    console,
    Math: Object.assign(Object.create(Math), { random: makeSeedRng(42) }),
    parseInt,
    document: {
      readyState: 'complete',
      head: makeFakeElement('head'),
      createElement: (tag) => makeFakeElement(tag),
      getElementById: (id) => modals[id] || null,
      body: makeFakeElement('body'),
      querySelectorAll: () => [],
      addEventListener() {},
    },
    localStorage: { getItem: () => null, setItem() {} },
    MutationObserver: class { observe() {} },
    alert: (msg) => alerts.push(msg),
    speakFairyTTS() {},
    rewardQuizCorrect: async (idx) => rewards.push(idx),
    promptQuizRetryOrSkip: (opts) => retries.push(opts),
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(readFileSync(new URL('../kids/core/quiz-flow-controller.js', import.meta.url), 'utf8'), sandbox);
  vm.runInContext(readFileSync(new URL('../kids/js/society_chart.js', import.meta.url), 'utf8'), sandbox);

  const item = {
    title: '3·1 운동 사료',
    choices: ['1919년 3월 1일', '1905년 11월', '1945년 8월 15일', '1950년 6월 25일'],
    correctIdx: 0,
    quiz: '옳은 것은?',
  };
  sandbox.activeSectionData = [item];
  sandbox.activeQuizIdx = 0;

  sandbox.SocietyChart.render(container, item, 0, 1, '');
  const htmlBeforeRetry = container.children[0].innerHTML;
  const buttons = extractRenderedButtons(htmlBeforeRetry);
  assert.equal(buttons.length, 4);
  assert.deepEqual(buttons.map(b => b.label.slice(0, 3)), ['1. ', '2. ', '3. ', '4. ']);
  assert.notDeepEqual(buttons.map(b => b.choiceIndex), [0, 1, 2, 3]);

  const wrongBtn = buttons.find(b => b.choiceIndex !== 0);
  const correctBtn = buttons.find(b => b.choiceIndex === 0);

  sandbox.SocietyChart.handleChoiceClick({ getAttribute: (k) => k === 'data-choice-index' ? String(wrongBtn.choiceIndex) : null });
  assert.equal(rewards.length, 0);
  assert.equal(retries.length, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(sandbox.wrongNotes)), [{ word: '3·1 운동 사료', wrongInput: item.choices[wrongBtn.choiceIndex] }]);
  retries[0].onRetry();
  // 재시도 후에도 DOM HTML과 버튼 순서 그대로 유지
  assert.equal(container.children[0].innerHTML, htmlBeforeRetry);

  await sandbox.SocietyChart.verifyChoice(correctBtn.choiceIndex, item.correctIdx);
  assert.deepEqual(rewards, [0]);
});

test('A2 science_lab.js: 섞인 순서로 버튼 번호를 표시하되 원래 번호로 채점·오답기록하고 재시도 시 순서를 유지한다', async () => {
  const container = makeFakeElement('div');
  const alerts = [];
  const rewards = [];
  const sounds = [];

  const sandbox = {
    console,
    Math: Object.assign(Object.create(Math), { random: makeSeedRng(101) }),
    document: {
      readyState: 'complete',
      head: makeFakeElement('head'),
      createElement: (tag) => makeFakeElement(tag),
      getElementById: () => null,
      body: makeFakeElement('body'),
      querySelectorAll: () => [],
      addEventListener() {},
    },
    localStorage: { getItem: () => null, setItem() {} },
    MutationObserver: class { observe() {} },
    alert: (msg) => alerts.push(msg),
    playSoundEffect: (name) => sounds.push(name),
    speakFairyTTS() {},
    rewardQuizCorrect: async (idx) => rewards.push(idx),
    skipToNextScienceQuiz() {},
    wrongNotes: [],
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(readFileSync(new URL('../kids/core/quiz-flow-controller.js', import.meta.url), 'utf8'), sandbox);
  vm.runInContext(readFileSync(new URL('../kids/js/science_lab.js', import.meta.url), 'utf8'), sandbox);

  const item = {
    title: '물의 증발 실험',
    choices: ['수증기로 변해 공기 중으로 날아간다', '얼음으로 변한다', '무게가 늘어난다', '색이 파랗게 변한다'],
    correctIdx: 0,
    quiz: '실험 결과로 옳은 것은?',
  };
  sandbox.activeSectionData = [{}, {}, item];
  sandbox.activeQuizIdx = 2;

  sandbox.ScienceLab.renderExperimentUI(container, item, 2, 5, '');
  const htmlBeforeRetry = container.children[0].innerHTML;
  const buttons = extractRenderedButtons(htmlBeforeRetry);
  assert.equal(buttons.length, 4);
  assert.deepEqual(buttons.map(b => b.label.slice(0, 3)), ['1. ', '2. ', '3. ', '4. ']);
  assert.notDeepEqual(buttons.map(b => b.choiceIndex), [0, 1, 2, 3]);

  const wrongBtn = buttons.find(b => b.choiceIndex !== 0);
  const correctBtn = buttons.find(b => b.choiceIndex === 0);
  assert.equal(wrongBtn.onclick, `ScienceLab.verifyChoice(${wrongBtn.choiceIndex}, 0)`);

  await sandbox.ScienceLab.verifyChoice(wrongBtn.choiceIndex, item.correctIdx);
  assert.equal(sounds[0], 'wrong');
  assert.deepEqual(JSON.parse(JSON.stringify(sandbox.wrongNotes)), [{ word: '물의 증발 실험', wrongInput: item.choices[wrongBtn.choiceIndex] }]);
  assert.equal(container.children[0].innerHTML, htmlBeforeRetry); // 재시도 시 순서 유지

  await sandbox.ScienceLab.verifyChoice(correctBtn.choiceIndex, item.correctIdx);
  assert.equal(sounds[1], 'correct');
  assert.deepEqual(rewards, [2]);
});

function makeMiniEl(tag = 'div', attrs = {}) {
  const classes = new Set();
  const attrMap = Object.assign({}, attrs);
  return {
    tagName: tag.toUpperCase(),
    attributes: attrMap,
    hidden: false,
    style: {},
    innerHTML: '',
    textContent: '',
    children: [],
    classList: {
      add: (c) => classes.add(c),
      remove: (c) => classes.delete(c),
      contains: (c) => classes.has(c),
    },
    setAttribute(k, v) { attrMap[k] = String(v); },
    getAttribute(k) { return Object.hasOwn(attrMap, k) ? attrMap[k] : null; },
    appendChild(child) { this.children.push(child); return child; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    scrollIntoView() {},
    closest() { return null; },
  };
}

test('B1 reading_engine.js: 섞인 순서로 배지 번호를 그리되 data-choice-index로 채점하고 오답노트에 보기 글자를 남긴다', async () => {
  const container = makeMiniEl('div');
  const byId = {};
  const awards = [];
  const sandbox = {
    console,
    Math: Object.assign(Object.create(Math), { random: makeSeedRng(202) }),
    setTimeout: (fn) => fn(),
    parseInt,
    isNaN,
    document: {
      readyState: 'complete',
      head: makeFakeElement('head'),
      body: makeFakeElement('body'),
      createElement: (tag) => makeMiniEl(tag),
      getElementById: (id) => byId[id] || null,
      querySelectorAll: () => [],
      addEventListener() {},
    },
    localStorage: { getItem: () => null, setItem() {} },
    MutationObserver: class { observe() {} },
    triggerAwardDispense: (n) => awards.push(n),
    speakFairyTTS() {},
    wrongNotes: [],
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.addEventListener = () => {};
  vm.createContext(sandbox);
  vm.runInContext(readFileSync(new URL('../kids/core/quiz-flow-controller.js', import.meta.url), 'utf8'), sandbox);
  vm.runInContext(readFileSync(new URL('../kids/core/reading_engine.js', import.meta.url), 'utf8'), sandbox);

  const passage = {
    id: 'p-test-1',
    title: '세종대왕과 훈민정음',
    track: '🏥 센터 독해',
    grade: '5-2',
    unit: '1단원',
    fullText: '백성을 사랑하여 훈민정음을 만드셨다.',
    questions: [{
      question: '글을 만든 목적은?',
      choices: ['백성을 널리 이롭게 하려고', '한자를 없애려고', '전쟁에 쓰려고', '세금을 늘리려고'],
      answer: '백성을 널리 이롭게 하려고',
      clue: '백성을 사랑하여',
    }],
  };
  sandbox.fetchReadingPassagesFromNotion = async () => [passage];

  await sandbox.ReadingEngine.renderLobby(container, { subject: '국어', grade: '5-2' });
  sandbox.ReadingEngine.startMission('p-test-1');
  sandbox.ReadingEngine.startQuestions();

  const buttons = extractRenderedButtons(container.innerHTML);
  assert.equal(buttons.length, 4);
  assert.notDeepEqual(buttons.map(b => b.choiceIndex), [0, 1, 2, 3]);
  buttons.forEach((b, pos) => {
    assert.match(b.label, new RegExp(`<span class="choice-num-badge">${pos + 1}</span>`));
    byId[`choiceBtn_${b.choiceIndex}`] = makeMiniEl('button');
  });

  const wrongBtn = buttons.find(b => b.choiceIndex !== 0);
  const correctBtn = buttons.find(b => b.choiceIndex === 0);
  sandbox.ReadingEngine.chooseAnswer(wrongBtn.choiceIndex);
  assert.deepEqual(JSON.parse(JSON.stringify(sandbox.wrongNotes)), []);
  assert.equal(awards.length, 0);

  sandbox.ReadingEngine.chooseAnswer(correctBtn.choiceIndex);
  assert.deepEqual(awards, [1, 3]);
});

test('B2 korean_mini_reading.js: 섞인 보기 순서와 TTS 대본(1번, …)이 같고 다시 보기를 다녀와도 순서가 유지되며 data-i로 정확히 채점한다', async () => {
  const passage = {
    id: 'mini-u2-1',
    unit: '2단원',
    title: '크레파스 정리',
    summary: '정리해요',
    fullText: '내 크레파스가 없어요.\n책상 위를 살펴보았어요.',
    questions: [{
      step: 1,
      question: '알맞은 말을 고르세요.',
      options: ['내 크레파스가 없어요!', '내 크레파스가 업어요!', '내 크레파스가 엇어요!'],
      answer: '내 크레파스가 없어요!',
      explanation: '받침 ㅄ을 써요.',
    }],
  };

  let optNodes = [];
  let explainNode = makeMiniEl('div');
  let nextNode = makeMiniEl('button');
  let clickHandlers = {};
  let spokenScripts = [];

  const container = {
    _html: '',
    get innerHTML() { return this._html; },
    set innerHTML(val) {
      this._html = val;
      optNodes = [];
      clickHandlers = {};
      explainNode = makeMiniEl('div');
      nextNode = makeMiniEl('button');
      nextNode.hidden = true;
      const reOpt = /<button[^>]*class="mr-opt"[^>]*data-i="(\d+)"[^>]*data-choice-index="(\d+)"[^>]*>([\s\S]*?)<\/button>/g;
      let m;
      while ((m = reOpt.exec(val)) !== null) {
        const node = makeMiniEl('button', { 'data-i': m[1], 'data-choice-index': m[2] });
        node.textContent = m[3].trim();
        optNodes.push(node);
      }
      for (const id of ['mrListen', 'mrStop', 'mrGo', 'mrBack', 'mrSayQ', 'mrReread', 'mrNext', 'mrBackQ', 'mrAutoBtn', 'mrMore']) {
        if (val.includes(`id="${id}"`)) {
          clickHandlers[`#${id}`] = id === 'mrNext' ? nextNode : makeMiniEl('button');
        }
      }
    },
    querySelector(sel) {
      if (sel === '#mrFigure' || sel === '.mr-figure') return null;
      if (sel === '#mrExplain') return explainNode;
      if (sel === '#mrNext') return nextNode;
      return clickHandlers[sel] || makeMiniEl('button');
    },
    querySelectorAll(sel) {
      if (sel === '.mr-opt') return optNodes;
      if (sel === '.mr-card') return [makeMiniEl('button', { 'data-id': passage.id })];
      return [];
    },
  };

  const sandbox = {
    console,
    Math: Object.assign(Object.create(Math), { random: makeSeedRng(101) }),
    TextEncoder,
    document: {
      readyState: 'complete',
      head: makeFakeElement('head'),
      body: makeFakeElement('body'),
      createElement: (tag) => makeMiniEl(tag),
      getElementById: () => null,
      querySelectorAll: () => [],
      addEventListener() {},
      removeEventListener() {},
    },
    localStorage: { getItem: (k) => k === 'mr_autoplay' ? '1' : null, setItem() {} },
    MutationObserver: class { observe() {} },
    Audio: class { play() { return Promise.reject(new Error('no mp3')); } },
    speakFairyTTS: (text, cb) => { spokenScripts.push(text); if (cb) cb(); },
    stopFairyTTS() {},
    fairyPraise() {},
    fairyEncourage() {},
    triggerAwardDispense() {},
    fetchReadingPassagesFromNotion: async () => [passage],
    wrongNotes: [],
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(readFileSync(new URL('../kids/core/quiz-flow-controller.js', import.meta.url), 'utf8'), sandbox);
  vm.runInContext(readFileSync(new URL('../kids/js/korean_mini_reading.js', import.meta.url), 'utf8'), sandbox);

  await sandbox.KoreanMiniReading.renderLobby(container);
  sandbox.KoreanMiniReading.start('mini-u2-1');
  clickHandlers['#mrGo'].onclick();

  // play()가 [말풍선+질문, "1번, 보기.", "2번, 보기.", ...] 조각으로 호출되는지 확인
  await new Promise(r => setTimeout(r, 30));
  assert.equal(optNodes.length, 3);
  assert.notDeepEqual(optNodes.map(n => Number(n.getAttribute('data-choice-index'))), [0, 1, 2]);
  const displayedTexts = optNodes.map((n, pos) => {
    assert.equal(n.textContent.startsWith(`${pos + 1}. `), true);
    return n.textContent.slice(`${pos + 1}. `.length);
  });
  const expectedClips = [
    '알맞은 말을 고르세요.',
    `1번, ${displayedTexts[0]}.`,
    `2번, ${displayedTexts[1]}.`,
    `3번, ${displayedTexts[2]}.`,
  ];
  assert.deepEqual(spokenScripts.slice(-4), expectedClips);

  // 화살표(→) 치환 규칙이 보기 조각에도 적용되는지 확인
  const arrowQ = { question: '순서는?', options: ['앞 → 뒤', '끝'] };
  assert.deepEqual(
    JSON.parse(JSON.stringify(sandbox.KoreanMiniReading.questionClips(arrowQ, ['끝', '앞 → 뒤']))),
    ['순서는?', '1번, 끝.', '2번, 앞, 그다음 뒤.']
  );

  // 이야기 다시 보기 후 돌아와도 보기 순서 유지
  const orderBeforePeek = optNodes.map(n => Number(n.getAttribute('data-i')));
  clickHandlers['#mrReread'].onclick();
  clickHandlers['#mrBackQ'].onclick();
  assert.deepEqual(optNodes.map(n => Number(n.getAttribute('data-i'))), orderBeforePeek);

  // DOM 위치가 아니라 data-i로 class(.dim / .guide / .correct) 적용
  const wrongNode = optNodes.find(n => Number(n.getAttribute('data-i')) !== 0);
  const correctNode = optNodes.find(n => Number(n.getAttribute('data-i')) === 0);
  wrongNode.onclick();
  assert.equal(wrongNode.classList.contains('dim'), true);
  assert.equal(correctNode.classList.contains('guide'), true);
  assert.deepEqual(JSON.parse(JSON.stringify(sandbox.wrongNotes)), []);

  correctNode.onclick();
  assert.equal(correctNode.classList.contains('correct'), true);
  assert.equal(nextNode.hidden, false);
});

test('B3 science_report.js: 객관식·빈칸 카드를 섞고 빈칸 채우기 중 순서 유지 및 오답노트에 보기 글자를 기록한다', () => {
  const reportContainer = makeMiniEl('div');
  const tabContent = makeMiniEl('div');
  const byId = { reportTabContent: tabContent };

  const sandbox = {
    console,
    Math: Object.assign(Object.create(Math), { random: makeSeedRng(404) }),
    document: {
      readyState: 'complete',
      head: makeFakeElement('head'),
      body: makeFakeElement('body'),
      createElement: (tag) => makeMiniEl(tag),
      getElementById: (id) => byId[id] || null,
      querySelectorAll: () => [],
      addEventListener() {},
    },
    localStorage: { getItem: () => null, setItem() {} },
    MutationObserver: class { observe() {} },
    wrongNotes: [],
    SCIENCE_LAB_REPORT_DATA: {
      title: '1단원 탐구 보고서',
      unit: '1단원',
      summaryDoc: [],
      quizItems: [
        {
          type: 'blank',
          questionText: '빈칸 문제',
          templateHtml: '{b1} / {b2}',
          blanks: [{ id: 'b1', target: '첫째', answer: '콩' }, { id: 'b2', target: '둘째', answer: '조' }],
          options: ['콩', '조', '물'],
          explanation: '크기 차이',
        },
        {
          type: 'choice',
          questionText: '어느 것이 가벼운가요?',
          choices: ['스티로폼', '철구슬', '돌맹이', '구리조각'],
          answer: 0,
          explanation: '스티로폼이 물에 뜹니다.',
        },
      ],
    },
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(readFileSync(new URL('../kids/core/quiz-flow-controller.js', import.meta.url), 'utf8'), sandbox);
  vm.runInContext(readFileSync(new URL('../kids/js/science_report.js', import.meta.url), 'utf8'), sandbox);

  // 빈칸 문제 섞기 + 카드 선택 후 순서 유지
  sandbox.ScienceReport.renderUI(reportContainer, 'quiz', 1);
  const blankBtns = extractRenderedButtons(tabContent.innerHTML);
  assert.equal(blankBtns.length, 3);
  assert.notDeepEqual(blankBtns.map(b => b.choiceIndex), [0, 1, 2]);
  const blankOrderBeforePick = blankBtns.map(b => b.choiceIndex);
  const kongIdx = blankBtns.find(b => b.choiceIndex === 0).choiceIndex;
  sandbox.ScienceReport.selectBlankWordByIdx(0, kongIdx);
  const blankOrderAfterPick = extractRenderedButtons(tabContent.innerHTML).map(b => b.choiceIndex);
  assert.deepEqual(blankOrderAfterPick, blankOrderBeforePick);

  // 객관식 섞기 + 오답노트에 보기 글자 기록 + 재시도 순서 유지
  sandbox.ScienceReport.renderQuiz(tabContent, 1);
  const choiceHtmlBefore = tabContent.innerHTML;
  const choiceBtns = extractRenderedButtons(choiceHtmlBefore);
  assert.equal(choiceBtns.length, 4);
  assert.notDeepEqual(choiceBtns.map(b => b.choiceIndex), [0, 1, 2, 3]);
  const wrongChoice = choiceBtns.find(b => b.choiceIndex !== 0);
  const rightChoice = choiceBtns.find(b => b.choiceIndex === 0);
  sandbox.ScienceReport.submitChoiceQuiz(1, wrongChoice.choiceIndex);
  assert.match(tabContent.innerHTML, /힌트를 확인해 보세요!/);
  assert.deepEqual(JSON.parse(JSON.stringify(sandbox.wrongNotes)), []);
  sandbox.ScienceReport.triggerFeedbackNext();
  assert.equal(tabContent.innerHTML, choiceHtmlBefore);

  sandbox.ScienceReport.submitChoiceQuiz(1, rightChoice.choiceIndex);
  assert.match(tabContent.innerHTML, /훌륭해요! 정답입니다!/);
});

test('B4 science_safety.js: 안전 문제를 섞어 그리고 다시 도전 시 순서 유지, 오답노트에 보기 글자를 기록한다', () => {
  const overlayBody = makeMiniEl('div');
  const sandbox = {
    console,
    Math: Object.assign(Object.create(Math), { random: makeSeedRng(505) }),
    document: {
      readyState: 'complete',
      head: makeFakeElement('head'),
      body: makeFakeElement('body'),
      createElement: (tag) => makeMiniEl(tag),
      getElementById: (id) => id === 'overlayInnerBody' ? overlayBody : null,
      querySelectorAll: () => [],
      addEventListener() {},
    },
    localStorage: { getItem: () => null, setItem() {} },
    MutationObserver: class { observe() {} },
    grantRewardGem() {},
    wrongNotes: [],
    SCIENCE_SAFETY_LICENSE_DATA: {
      title: '실험실 안전 시험',
      questions: [{
        category: '보안경',
        question: '실험 전에 꼭 써야 하는 것은?',
        options: ['보안경', '선글라스', '모자', '시계'],
        answer: 0,
        explanation: '눈을 보호해요.',
      }],
    },
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(readFileSync(new URL('../kids/core/quiz-flow-controller.js', import.meta.url), 'utf8'), sandbox);
  vm.runInContext(readFileSync(new URL('../kids/js/science_safety.js', import.meta.url), 'utf8'), sandbox);

  sandbox.ScienceSafety.renderUI(overlayBody);
  const htmlBeforeRetry = overlayBody.innerHTML;
  const btns = extractRenderedButtons(htmlBeforeRetry);
  assert.equal(btns.length, 4);
  assert.notDeepEqual(btns.map(b => b.choiceIndex), [0, 1, 2, 3]);
  btns.forEach((b, pos) => {
    assert.match(b.label, new RegExp(`>${pos + 1}\\.<`));
  });

  const wrongBtn = btns.find(b => b.choiceIndex !== 0);
  const rightBtn = btns.find(b => b.choiceIndex === 0);
  sandbox.ScienceSafety.submitAnswer(0, wrongBtn.choiceIndex);
  assert.deepEqual(JSON.parse(JSON.stringify(sandbox.wrongNotes)), []);

  // 다시 도전하기 호출 시 순서 동일
  sandbox.ScienceSafety.renderQuestion(overlayBody, 0);
  assert.equal(overlayBody.innerHTML, htmlBeforeRetry);

  sandbox.ScienceSafety.submitAnswer(0, rightBtn.choiceIndex);
  assert.match(overlayBody.innerHTML, /실험실 안전 라이선스 합격을 축하합니다/);
});

test('B5 science_season_airmass_lab.js: 보기를 섞어 data-choice-index로 채점하고 오답 시 섞인 위치의 정답 버튼과 번호를 표시한다', () => {
  const qOptions = makeMiniEl('div');
  const qFeedback = makeMiniEl('div');
  const qNum = makeMiniEl('span');
  const qText = makeMiniEl('div');
  const quizProgress = makeMiniEl('span');
  const btnNextQuiz = makeMiniEl('button');
  const gemCount = makeMiniEl('span');
  const tabs = [makeMiniEl('button'), makeMiniEl('button'), makeMiniEl('button'), makeMiniEl('button')];
  const byId = {
    qOptions, qFeedback, qNum, qText, quizProgress, btnNextQuiz, gemCount,
    modeMap: makeMiniEl('div'), modeSeason: makeMiniEl('div'), modeMatrix: makeMiniEl('div'), modeQuiz: makeMiniEl('div'),
    fairyMsg: makeMiniEl('div'),
  };
  let domReadyCb = null;

  const sandbox = {
    console,
    Math: Object.assign(Object.create(Math), { random: makeSeedRng(607) }),
    setTimeout: () => {},
    parseInt,
    document: {
      readyState: 'complete',
      head: makeFakeElement('head'),
      body: makeFakeElement('body'),
      createElement: (tag) => makeMiniEl(tag),
      getElementById: (id) => byId[id] || makeMiniEl('div'),
      querySelectorAll: (sel) => {
        if (sel === '.quiz-opt-btn') return qOptions.children;
        if (sel === '.mode-tab-btn') return tabs;
        return [];
      },
      addEventListener(type, cb) { if (type === 'DOMContentLoaded') domReadyCb = cb; },
    },
    localStorage: { getItem: () => '0', setItem() {} },
    MutationObserver: class { observe() {} },
    AudioContext: class {},
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(readFileSync(new URL('../kids/core/quiz-flow-controller.js', import.meta.url), 'utf8'), sandbox);
  vm.runInContext(readFileSync(new URL('../kids/subjects/science/js/science_season_airmass_lab.js', import.meta.url), 'utf8'), sandbox);

  assert.equal(typeof domReadyCb, 'function');
  sandbox.switchMode('quiz');

  const renderedBtns = qOptions.children;
  assert.equal(renderedBtns.length, 4);
  const origIndices = renderedBtns.map(b => Number(b.getAttribute('data-choice-index')));
  assert.notDeepEqual(origIndices, [0, 1, 2, 3]);
  renderedBtns.forEach((b, pos) => {
    assert.equal(b.innerHTML.startsWith(`${pos + 1}. `), true);
  });

  // 1번 문항 정답은 원래 0번 인덱스('기단 (공기 덩어리)')
  const expectedCorrectPos = origIndices.indexOf(0);
  assert.ok(expectedCorrectPos >= 0 && expectedCorrectPos !== 0);
  const wrongPos = origIndices.findIndex(idx => idx !== 0);
  renderedBtns[wrongPos].onclick();

  assert.equal(renderedBtns[wrongPos].classList.contains('wrong'), true);
  assert.equal(renderedBtns[expectedCorrectPos].classList.contains('correct'), true);
  assert.match(qFeedback.innerHTML, new RegExp(`정답은 <b>${expectedCorrectPos + 1}번</b>`));
  assert.equal(sandbox.wrongNotes, undefined);
});

test('B2 민서 미니 독해 MP3: 모든 지문 문항의 가능한 섞인 보기 순서마다 questionClips 조각 mp3 파일이 실제로 존재한다', () => {
  const dataDir = new URL('../scripts/data/', import.meta.url);
  const audioDir = fileURLToPath(new URL('../kids/assets/audio/mini_reading/', import.meta.url));
  const sandbox = {
    console,
    document: {
      readyState: 'complete',
      addEventListener() {},
      removeEventListener() {},
      getElementById: () => null,
    },
    localStorage: { getItem: () => null, setItem() {} },
    addEventListener() {},
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(readFileSync(new URL('../kids/js/korean_mini_reading.js', import.meta.url), 'utf8'), sandbox);

  const seedFiles = readdirSync(dataDir).filter(f => /^minseo_korean_.*\.json$/.test(f)).sort();
  assert.ok(seedFiles.length >= 3);

  const permutations = (arr) => {
    if (arr.length <= 1) return [arr];
    const out = [];
    for (let i = 0; i < arr.length; i++) {
      const rest = arr.slice(0, i).concat(arr.slice(i + 1));
      for (const p of permutations(rest)) out.push([arr[i], ...p]);
    }
    return out;
  };

  let checkedClips = 0;
  for (const file of seedFiles) {
    const raw = readFileSync(new URL(file, dataDir), 'utf8').replace(/^\uFEFF/, '');
    const seed = JSON.parse(raw);
    for (const passage of seed.passages || []) {
      for (const q of passage.questions || []) {
        for (const orderedOptions of permutations(q.options || [])) {
          const clips = sandbox.KoreanMiniReading.questionClips(q, orderedOptions);
          for (const clip of clips) {
            const hash = createHash('sha1').update(String(clip), 'utf8').digest('hex').slice(0, 12);
            const mp3Path = join(audioDir, `${hash}.mp3`);
            assert.equal(existsSync(mp3Path), true, `MP3 누락: ${hash}.mp3 (${clip})`);
            checkedClips++;
          }
        }
      }
    }
  }
  assert.ok(checkedClips > 0);
});
