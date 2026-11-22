// 문항기록(LearningLog) 화면 연결 시험 — 객관식 화면 시험(quiz-choices.test.mjs)에서 옮긴 것과 새 경우
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { makeSeedRng, makeFakeElement, makeMiniEl, fakeLearningLog, plainLog } from './quiz-test-fakes.mjs';

test('B2-2 korean_mini_reading.js: 틀린 뒤 이야기 다시 보기를 다녀와 맞혀도 문항기록은 「첫 시도 아님」으로 이어진다', async () => {
  const passage = { id: 'mini-peek', unit: '1단원', title: '다시 보기', summary: '', fullText: '한 줄.',
    questions: [{ step: 1, question: '고르세요.', options: ['가', '나'], answer: '가', explanation: '가예요.' }] };
  let optNodes = [], clickHandlers = {};
  const container = {
    _html: '',
    get innerHTML() { return this._html; },
    set innerHTML(val) {
      this._html = val; optNodes = []; clickHandlers = {};
      const reOpt = /<button[^>]*class="mr-opt"[^>]*data-i="(\d+)"[^>]*>/g;
      let m;
      while ((m = reOpt.exec(val)) !== null) optNodes.push(makeMiniEl('button', { 'data-i': m[1] }));
      for (const id of ['mrGo', 'mrReread', 'mrBackQ', 'mrNext']) if (val.includes(`id="${id}"`)) clickHandlers[`#${id}`] = makeMiniEl('button');
    },
    querySelector: (sel) => (sel === '#mrFigure' || sel === '.mr-figure' ? null : clickHandlers[sel] || makeMiniEl('div')),
    querySelectorAll: (sel) => (sel === '.mr-opt' ? optNodes : sel === '.mr-card' ? [makeMiniEl('button', { 'data-id': passage.id })] : []),
  };
  const sandbox = {
    console, Math: Object.assign(Object.create(Math), { random: makeSeedRng(7) }), TextEncoder,
    document: { readyState: 'complete', head: makeFakeElement('head'), body: makeFakeElement('body'), createElement: (t) => makeMiniEl(t),
      getElementById: () => null, querySelectorAll: () => [], addEventListener() {}, removeEventListener() {} },
    localStorage: { getItem: () => null, setItem() {} }, MutationObserver: class { observe() {} },
    Audio: class { play() { return Promise.reject(new Error('no mp3')); } },
    speakFairyTTS: (t, cb) => { if (cb) cb(); }, stopFairyTTS() {}, fairyPraise() {}, fairyEncourage() {}, triggerAwardDispense() {},
    fetchReadingPassagesFromNotion: async () => [passage], wrongNotes: [], LearningLog: fakeLearningLog(),
  };
  sandbox.window = sandbox; sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(readFileSync(new URL('../kids/core/quiz-flow-controller.js', import.meta.url), 'utf8'), sandbox);
  vm.runInContext(readFileSync(new URL('../kids/js/korean_mini_reading.js', import.meta.url), 'utf8'), sandbox);
  await sandbox.KoreanMiniReading.renderLobby(container);
  sandbox.KoreanMiniReading.start('mini-peek');
  clickHandlers['#mrGo'].onclick();
  await new Promise(r => setTimeout(r, 30));
  optNodes.find(n => n.getAttribute('data-i') === '1').onclick(); // 틀림 「나」
  clickHandlers['#mrReread'].onclick();
  clickHandlers['#mrBackQ'].onclick(); // 같은 문항을 다시 그림
  optNodes.find(n => n.getAttribute('data-i') === '0').onclick(); // 맞힘
  assert.deepEqual(plainLog(sandbox.LearningLog), [{ subject: '국어', key: 'r:mini-peek:0', firstTry: false, hinted: false, picks: ['나'] }]);
});

const read = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
function quizSandbox(extra = {}) {
  const sandbox = {
    console, Math: Object.assign(Object.create(Math), { random: makeSeedRng(9) }), parseInt, isNaN,
    setTimeout: (fn) => fn(),
    document: { readyState: 'complete', head: makeFakeElement('head'), body: makeFakeElement('body'),
      createElement: (t) => makeMiniEl(t), getElementById: () => null, querySelectorAll: () => [], addEventListener() {} },
    localStorage: { getItem: () => null, setItem() {} }, MutationObserver: class { observe() {} },
    alert() {}, speakFairyTTS() {}, playSoundEffect() {}, wrongNotes: [], LearningLog: fakeLearningLog(), ...extra,
  };
  sandbox.window = sandbox; sandbox.globalThis = sandbox; sandbox.addEventListener = () => {};
  vm.createContext(sandbox);
  return sandbox;
}

test('과학 실험: 틀린 뒤 「건너뛰기」는 틀린 채 끝남으로 기록, 답하지 않고 건너뛰면 기록 없음', async () => {
  const sb = quizSandbox({ rewardQuizCorrect: async () => {}, skipToNextScienceQuiz() {} });
  vm.runInContext(read('kids/js/science_lab.js'), sb);
  const items = [{ title: 'A', choices: ['맞음', '틀림'], correctIdx: 0, pageId: 'lab-a' },
    { title: 'B', choices: ['맞음', '틀림'], correctIdx: 0, pageId: 'lab-b' }];
  sb.activeSectionData = items; sb.activeQuizIdx = 0;
  await sb.ScienceLab.verifyChoice(1, 0);  // A 틀림
  sb.ScienceLab.noteSkip();                // A 건너뛰기
  sb.activeQuizIdx = 1;
  sb.ScienceLab.noteSkip();                // B는 답하지 않고 건너뛰기
  assert.deepEqual(plainLog(sb.LearningLog), [{ subject: '과학', key: 'c:lab-a', firstTry: false, hinted: false, picks: ['틀림'] }]);
});

test('사회 자료분석: 같은 문항이라도 새로 시작한 미션(새 문항 목록)에서는 새로 센다', async () => {
  const modals = { chartSuccessModal: makeFakeElement('div') };
  const sb = quizSandbox({ rewardQuizCorrect: async () => {}, promptQuizRetryOrSkip() {} });
  sb.document.getElementById = (id) => modals[id] || null;
  vm.runInContext(read('kids/js/society_chart.js'), sb);
  const item = () => ({ title: '사료', choices: ['맞음', '틀림'], correctIdx: 0, pageId: 'chart-a' });
  sb.activeSectionData = [item()]; sb.activeQuizIdx = 0;
  await sb.SocietyChart.verifyChoice(1, 0);
  await sb.SocietyChart.verifyChoice(0, 0);
  sb.activeSectionData = [item()]; sb.activeQuizIdx = 0; // 미션을 다시 시작
  await sb.SocietyChart.verifyChoice(0, 0);
  assert.deepEqual(plainLog(sb.LearningLog).map(r => [r.key, r.firstTry]), [['c:chart-a', false], ['c:chart-a', true]]);
});

test('정밀 독해: 단서 글이 없는 문항은 틀려도 힌트로 세지 않는다', async () => {
  const byId = {};
  const sb = quizSandbox({ triggerAwardDispense() {} });
  sb.document.getElementById = (id) => byId[id] || null;
  vm.runInContext(read('kids/core/quiz-flow-controller.js'), sb);
  vm.runInContext(read('kids/core/reading_engine.js'), sb);
  const passage = { id: 'no-clue', title: '단서 없음', track: '🏥 센터 독해', grade: '5-2', unit: '1단원', fullText: '한 줄.',
    questions: [{ question: '고르세요.', choices: ['가', '나', '다', '라'], answer: '가' }] };
  sb.fetchReadingPassagesFromNotion = async () => [passage];
  const container = makeMiniEl('div');
  await sb.ReadingEngine.renderLobby(container, { subject: '국어', grade: '5-2' });
  sb.ReadingEngine.startMission('no-clue');
  sb.ReadingEngine.startQuestions();
  for (let i = 0; i < 4; i++) byId[`choiceBtn_${i}`] = makeMiniEl('button');
  sb.ReadingEngine.chooseAnswer(2);
  sb.ReadingEngine.chooseAnswer(0);
  assert.deepEqual(plainLog(sb.LearningLog), [{ subject: '국어', key: 'r:no-clue:0', firstTry: false, hinted: false, picks: ['다'] }]);
});
