import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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
  assert.deepEqual(JSON.parse(JSON.stringify(sandbox.wrongNotes)), [{ word: '물의 증발 실험', wrongInput: `선택 ${wrongBtn.choiceIndex + 1}` }]);
  assert.equal(container.children[0].innerHTML, htmlBeforeRetry); // 재시도 시 순서 유지

  await sandbox.ScienceLab.verifyChoice(correctBtn.choiceIndex, item.correctIdx);
  assert.equal(sounds[1], 'correct');
  assert.deepEqual(rewards, [2]);
});
