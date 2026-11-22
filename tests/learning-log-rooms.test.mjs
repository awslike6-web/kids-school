// 문항기록(LearningLog) 3차 연결 시험 — 과목방 어휘 퀴즈·과학 안전수칙·탐구 보고서·수학 (docs/learning_record_spec.md §5 3차)
// 실제 화면 스크립트를 최소 샌드박스에 싣고, 가짜 LearningLog(tests/quiz-test-fakes.mjs)로 기록 호출만 본다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { fakeLearningLog, plainLog } from './quiz-test-fakes.mjs';

const read = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

function fakeEl() {
  const handlers = {};
  return {
    style: {}, value: '', innerHTML: '', textContent: '', children: [], disabled: false, hidden: false, type: '',
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    appendChild(c) { this.children.push(c); return c; },
    setAttribute() {}, getAttribute() { return null; }, focus() {}, scrollIntoView() {},
    addEventListener(type, fn) { handlers[type] = fn; }, click() { if (handlers.click) handlers.click(); },
    querySelector: () => null, querySelectorAll: () => [],
  };
}

function sandbox(files, extra = {}) {
  const prompts = [];
  const sb = {
    console: { log() {}, info() {}, warn() {}, error() {} }, setTimeout: (fn) => fn && fn(), clearTimeout() {},
    Math, JSON, Date, parseInt, isNaN, URLSearchParams,
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} }, sessionStorage: { getItem: () => null, setItem() {} },
    document: { readyState: 'complete', getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
      createElement: () => fakeEl(), addEventListener() {}, head: fakeEl(), body: fakeEl() },
    addEventListener() {}, location: { search: '', pathname: '/', href: '' }, navigator: {},
    alert() {}, speakFairyTTS() {}, playSoundEffect() {}, fairyPraise() {}, fairyEncourage() {},
    rewardQuizCorrect: async () => true, triggerQuizAdvance() {}, skipToNextQuiz() {}, skipToNextScienceQuiz() {},
    promptQuizRetryOrSkip: (opts) => prompts.push(opts), wrongNotes: [],
    LearningLog: fakeLearningLog(), ...extra,
  };
  sb.window = sb; sb.globalThis = sb;
  vm.createContext(sb);
  for (const f of files) vm.runInContext(read(f), sb, { filename: f });
  return { sb, prompts };
}

test('영어방: 틀림 → 다시 → 맞힘은 한 번, 틀린 뒤 건너뛰기는 「틀린 채 끝남」, 답 없이 건너뛰면 기록 없음', async () => {
  const { sb, prompts } = sandbox(['kids/js/english_common.js']);
  const items = [{ word: 'apple', pageId: 'p-apple' }, { word: 'bed', pageId: 'p-bed' }, { word: 'cup', pageId: 'p-cup' }];
  sb.activeSectionData = items; sb.activeQuizIdx = 0;
  sb.recordEnglishWrongAnswer(items[0], 'aple');
  sb.promptEnglishWrong(() => {});
  prompts.at(-1).onRetry();
  await sb.advanceEnglishQuizAfterCorrect(0);
  assert.equal(sb.activeQuizIdx, 1);
  sb.recordEnglishWrongAnswer(items[1], 'bad');
  sb.skipEnglishQuestion();
  sb.skipEnglishQuestion(); // cup: 답하지 않고 넘김
  assert.deepEqual(plainLog(sb.LearningLog), [
    { subject: '영어', key: 'v:p-apple', firstTry: false, hinted: false, picks: ['aple'] },
    { subject: '영어', key: 'v:p-bed', firstTry: false, hinted: false, picks: ['bad'] },
  ]);
});

test('영어방: 단계 모듈의 rewardCorrect 경로와 advance가 겹쳐도 한 번만 기록, page_id 없는 문항은 기록 없음', async () => {
  const { sb } = sandbox(['kids/js/english_common.js']);
  sb.activeSectionData = [{ word: 'sun', pageId: 'p-sun' }, { word: 'local' }]; sb.activeQuizIdx = 0;
  sb.englishItemTrack(0)?.done();
  await sb.advanceEnglishQuizAfterCorrect(0);
  await sb.advanceEnglishQuizAfterCorrect(0);
  assert.deepEqual(plainLog(sb.LearningLog).map(r => [r.key, r.firstTry]), [['v:p-sun', true]]);
});

test('국어방: 어휘 오답(promptKoreanWrong) 뒤 맞힘, 같은 문항이 목록 끝에 다시 붙어도 지금 번호에 기록 (받아쓰기 규칙)', async () => {
  const { sb, prompts } = sandbox(['kids/js/korean_common.js']);
  vm.runInContext("activeSectionData = [{ word: '닭', pageId: 'k-1' }, { word: '값', pageId: 'k-2' }]; activeQuizIdx = 0;", sb);
  sb.promptKoreanWrong({ word: '닭', wrongInput: '닥' }, () => {});
  assert.equal(prompts.length, 1);
  await sb.advanceKoreanQuizAfterCorrect(0);
  // 받아쓰기처럼 틀린 낱말이 끝에 다시 붙은 뒤, 그 자리에서 다시 틀리고 건너뜀
  vm.runInContext("activeSectionData.push(activeSectionData[0]); activeQuizIdx = 2; window.activeSectionData = activeSectionData; window.activeQuizIdx = 2;", sb);
  const list = vm.runInContext('activeSectionData', sb);
  const at = list[2] === list[0] ? 2 : -1;
  sb.koreanItemTrack(at).wrong('닥');
  sb.skipKoreanQuestion();
  assert.deepEqual(plainLog(sb.LearningLog).map(r => [r.key, r.firstTry, r.picks]), [['v:k-1', false, ['닥']], ['v:k-1', false, ['닥']]]);
});

test('사회 어휘: 틀린 뒤 건너뛰기는 「틀린 채 끝남」, 다음 문항 바로 맞힘은 첫 시도', async () => {
  const { sb, prompts } = sandbox(['kids/js/society_voca.js'], { updateVocaMasteryStatus() {} });
  sb.activeSectionData = [{ word: '조선', pageId: 's-1' }, { word: '고려', pageId: 's-2' }]; sb.activeQuizIdx = 0;
  sb.SocietyVoca.handleWrong('고구려', () => {});
  prompts.at(-1).onSkip();
  sb.activeQuizIdx = 1;
  await sb.SocietyVoca.handleCorrect();
  assert.deepEqual(plainLog(sb.LearningLog).map(r => [r.subject, r.key, r.firstTry]), [['사회', 'v:s-1', false], ['사회', 'v:s-2', true]]);
});

test('과학 어휘: 입력이 틀리면 오답, 다시 입력해 맞히면 한 번 기록', async () => {
  const input = fakeEl();
  const { sb } = sandbox(['kids/js/science_voca.js']);
  sb.document.getElementById = (id) => (id === 'scienceAnswerInput' ? input : null);
  sb.activeSectionData = [{ word: '증발', pageId: 'c-1' }]; sb.activeQuizIdx = 0;
  input.value = '응결'; await sb.verifyScienceVocaAnswer();
  input.value = '증발'; await sb.verifyScienceVocaAnswer();
  assert.deepEqual(plainLog(sb.LearningLog), [{ subject: '과학', key: 'v:c-1', firstTry: false, hinted: false, picks: ['응결'] }]);
});

test('과학 안전수칙: 노션 문항은 c:page_id, 예비 자료는 s:sci-safety:번호', () => {
  const { sb } = sandbox(['kids/js/science_safety.js']);
  sb.document.getElementById = () => fakeEl();
  sb.SCIENCE_SAFETY_LICENSE_DATA = { questions: [
    { id: 1, question: '보안경?', options: ['쓴다', '안 쓴다'], answer: 0, pageId: 'safe-page' },
    { id: 2, question: '뛰어도?', options: ['안 된다', '된다'], answer: 0 },
  ] };
  sb.ScienceSafety.submitAnswer(0, 1);
  sb.ScienceSafety.submitAnswer(0, 0);
  sb.ScienceSafety.submitAnswer(1, 0);
  assert.deepEqual(plainLog(sb.LearningLog).map(r => [r.key, r.firstTry, r.picks]), [['c:safe-page', false, ['안 쓴다']], ['s:sci-safety:2', true, []]]);
});

test('과학 탐구 보고서: 정적 자료는 s:sci-report-<단원>:<문항 번호>, 틀린 보기를 남긴다', () => {
  const { sb } = sandbox(['kids/js/science_report.js']);
  sb.document.getElementById = () => fakeEl();
  sb.SCIENCE_LAB_REPORT_DATA = { quizItems: [{ type: 'choice', choices: ['혼합물', '순물질'], answer: 0, explanation: '' }] };
  sb.ScienceReport.submitChoiceQuiz(0, 1);
  sb.ScienceReport.submitChoiceQuiz(0, 0);
  assert.deepEqual(plainLog(sb.LearningLog), [{ subject: '과학', key: 's:sci-report-1:0', firstTry: false, hinted: false, picks: ['순물질'] }]);
  // 같은 정적 자료(같은 배열)라도 퀴즈 탭을 다시 열면 새 회차 → 이번엔 바로 맞힘이 첫 시도로 남는다
  sb.ScienceReport.renderUI(fakeEl(), 'quiz', 1);
  sb.ScienceReport.submitChoiceQuiz(0, 0);
  assert.deepEqual(plainLog(sb.LearningLog).map(r => r.firstTry), [false, true]);
});

test('과학 탐구 보고서: 빈칸을 다 채우지 않은 제출은 오답으로 세지 않는다', () => {
  const { sb } = sandbox(['kids/js/science_report.js']);
  sb.document.getElementById = () => fakeEl();
  sb.SCIENCE_LAB_REPORT_DATA = { quizItems: [{ type: 'blank', blanks: [{ id: 'b1', answer: '증발', target: '물' }, { id: 'b2', answer: '응결', target: '김' }], options: ['증발', '응결'], explanation: '' }] };
  sb.ScienceReport.selectBlankWord('증발');
  sb.ScienceReport.checkBlankAnswer(0);   // b2 비어 있음 → 답 아님
  sb.ScienceReport.selectBlankWord('응결');
  sb.ScienceReport.checkBlankAnswer(0);   // 다 채워 정답
  assert.deepEqual(plainLog(sb.LearningLog).map(r => [r.key, r.firstTry]), [['s:sci-report-1:0', true]]);
});

test('세로셈 유형 키: 받아올림·받아내림·나머지 꼬리표와 자릿수', () => {
  const { sb } = sandbox(['kids/js/vertical_math_logic.js', 'kids/js/vertical_math_grid.js']);
  const k = (mode, numA, numB, rem = 0) => sb.verticalMathTypeKey(mode, { numA, numB, rem });
  assert.equal(k('add', 123, 45), 'vm-add-3x2');
  assert.equal(k('add', 95, 5), 'vm-add-2x1-carry');
  assert.equal(k('add', 91, 19), 'vm-add-2x2-carry');
  assert.equal(k('sub', 345, 123), 'vm-sub-3x3');
  assert.equal(k('sub', 302, 15), 'vm-sub-3x2-borrow');
  assert.equal(k('mul', 23, 4), 'vm-mul-2x1');
  assert.equal(k('div', 85, 4, 1), 'vm-div-2x1-rem');
  assert.equal(k('div', 84, 4, 0), 'vm-div-2x1');
  for (const key of [k('add', 999, 999), k('div', 999, 9, 8)]) assert.match('g:' + key, /^[a-z]:[^\s]{1,62}$/);
});

test('수학 탐험관 객관식 부품: 틀리면 onWrong(고른 글자), 맞히면 onSolved', () => {
  const { sb } = sandbox(['kids/subjects/math/js/math_explorer-shell.js']);
  const ui = sb.MathExplorer.makeUi(() => {}, () => {}, () => {});
  const wrongs = []; let solved = 0;
  const box = ui.choiceQuestion({ question: '대칭?', choices: ['선대칭', '점대칭'], answer: 0, fixed: true,
    onWrong: (t) => wrongs.push(t), onSolved: () => { solved++; } });
  const row = box.children.find((c) => Array.isArray(c.children) && c.children.length === 2);
  row.children[1].click();
  row.children[0].click();
  assert.deepEqual(wrongs, ['점대칭']);
  assert.equal(solved, 1);
});
