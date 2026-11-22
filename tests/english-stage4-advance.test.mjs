import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// 영어방 4단계(문장 조각 맞추기)의 「다음 문제 풀기」가 실제로 다음 문장으로 넘어가는지 본다.
// english_common.js의 문제 번호는 최상위 let이라 window에 붙지 않는다.
// english_voca.js가 window.activeQuizIdx로 번호를 올리므로 두 파일이 같은 값을 보도록 이어져 있어야 한다.
// (2026-11-16 제보: 5-2 L10 「I love my friends!」를 맞혀도 같은 문제만 반복)
const SENTENCES = [
  { word: 'I love my friends!', meaning: '저는 친구들이 정말 좋아요.', wordType: '문장', grades: ['5-2'], level: 'L10' },
  { word: 'I get up at 6.', meaning: '저는 6시에 일어나요.', wordType: '문장', grades: ['5-2'], level: 'L10' },
  { word: 'I go to bed at 9.', meaning: '저는 9시에 자요.', wordType: '문장', grades: ['5-2'], level: 'L10' },
];

function load() {
  const elements = {};
  const el = (id) => (elements[id] ||= { id, innerHTML: '', style: {}, classList: { add() {}, remove() {} } });
  const store = { currentUser: 'son', currentUserName: '민수' };
  const sandbox = {
    console: { log() {}, info() {}, warn() {}, error: console.error },
    setTimeout, clearTimeout, Date, Math, JSON,
    localStorage: {
      getItem: (k) => store[k] ?? null,
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; },
    },
    document: { getElementById: el, body: {} },
    speakEnglish() {},
    getQuizFlowMode: () => 'review',
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  for (const file of ['kids/js/english_voca.js', 'kids/js/english_common.js']) {
    vm.runInContext(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), sandbox, { filename: file });
  }
  const run = (code) => vm.runInContext(code, sandbox);
  return { sandbox, run, body: el('overlayInnerBody') };
}

function startStage4(ctx) {
  ctx.run('currentMissionType = "stage4"; englishVocaOrderType = "sequence";');
  ctx.sandbox.__records = SENTENCES;
  ctx.run('startMissionWithFilteredData(__records, document.getElementById("overlayInnerBody"));');
}

const shownMeaning = (ctx) => ctx.run('activeSectionData[activeQuizIdx] && activeSectionData[activeQuizIdx].meaning');

test('4단계 성공 카드의 「다음 문제 풀기」는 다음 문장으로 넘어간다', () => {
  const ctx = load();
  startStage4(ctx);
  assert.match(ctx.body.innerHTML, /영어 문장 1 \/ 3/);
  assert.equal(shownMeaning(ctx), SENTENCES[0].meaning);

  ctx.sandbox.EnglishVoca.proceedToNextSentenceQuiz();
  assert.equal(ctx.run('activeQuizIdx'), 1);
  assert.match(ctx.body.innerHTML, /영어 문장 2 \/ 3/);
  assert.match(ctx.body.innerHTML, /저는 6시에 일어나요/);

  ctx.sandbox.EnglishVoca.proceedToNextSentenceQuiz();
  ctx.sandbox.EnglishVoca.proceedToNextSentenceQuiz();
  assert.match(ctx.body.innerHTML, /모든 문제를 완료했습니다/);
});

test('window 경로와 영어방 문제 번호·문제 묶음은 같은 값을 가리킨다', () => {
  const ctx = load();
  startStage4(ctx);
  assert.equal(ctx.sandbox.activeSectionData.length, 3);
  ctx.sandbox.activeQuizIdx = 2;
  assert.equal(ctx.run('activeQuizIdx'), 2);
  ctx.run('activeQuizIdx = 0;');
  assert.equal(ctx.sandbox.activeQuizIdx, 0);
});

test('정답 뒤 넘김 화면에는 방금 푼 낱말을 넘긴다 (번호는 이미 다음 문항)', async () => {
  const ctx = load();
  const seen = [];
  ctx.sandbox.triggerQuizAdvance = (opts) => seen.push({ word: opts.word, idx: ctx.sandbox.activeQuizIdx });
  startStage4(ctx);
  await ctx.run('advanceEnglishQuizAfterCorrect(0)');
  assert.deepEqual(seen, [{ word: SENTENCES[0].word, idx: 1 }]);
});

test('3단계 「다른 방식으로 다시하기」는 첫 문제부터 다시 시작한다', () => {
  const ctx = load();
  ctx.run('currentMissionType = "stage3"; activeSectionData = __words; activeQuizIdx = 3;'.replace('__words', JSON.stringify(SENTENCES)));
  ctx.sandbox.EnglishVoca.selectStage3Mode('copy');
  assert.equal(ctx.run('activeQuizIdx'), 0);
});

test('4단계 문장방: 속도 조절 블록은 상단에 오고 문제 바로 다음에 보기(단어 조각)가 이어진다', () => {
  const ctx = load();
  ctx.sandbox.getEnglishSpeechRateChipsHtml = () => '<div class="speech-rate-control-box">속도조절</div>';
  startStage4(ctx);
  const html = ctx.body.innerHTML;
  const rateIdx = html.indexOf('speech-rate-control-box');
  const questionIdx = html.indexOf(SENTENCES[0].meaning);
  const choicesIdx = html.indexOf('sent-word-blanks');
  assert.ok(rateIdx > -1 && questionIdx > -1 && choicesIdx > -1);
  assert.ok(rateIdx < questionIdx, '속도 조절 블록이 문제보다 상단에 있어야 한다');
  assert.ok(questionIdx < choicesIdx, '문제 다음에 보기(단어 조각)가 나와야 한다');
  assert.ok(
    !html.slice(questionIdx, choicesIdx).includes('speech-rate-control-box'),
    '문제와 보기 사이에 속도 조절 블록이 끼지 않아야 한다'
  );
});

test('한글 발음 사전: 5-2 8~11단원 전체 어휘·문장 토큰이 영문 그대로 남지 않고 한글 발음으로 변환된다', () => {
  const elements = {};
  const el = (id) => (elements[id] ||= { id, innerHTML: '', style: {}, classList: { add() {}, remove() {} } });
  const sandbox = {
    console: { log() {}, info() {}, warn() {}, error: console.error },
    localStorage: { getItem: () => null, setItem() {} },
    document: { getElementById: el, querySelectorAll: () => [], body: {} },
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(readFileSync(new URL('../kids/js/english_phonics.js', import.meta.url), 'utf8'), sandbox, { filename: 'kids/js/english_phonics.js' });

  for (const unitFile of ['english_5-2_L8.json', 'english_5-2_L9.json', 'english_5-2_L10.json', 'english_5-2_L11.json']) {
    const seed = JSON.parse(readFileSync(new URL(`../scripts/data/voca/${unitFile}`, import.meta.url), 'utf8'));
    for (const item of seed.voca) {
      for (const tok of item.word.trim().split(/\s+/)) {
        const kor = sandbox.getPhonicsKorean(tok);
        assert.ok(!/[a-zA-Z]/.test(kor), `${unitFile} [${item.word}]의 '${tok}'가 영문 그대로('${kor}') 남았습니다`);
      }
    }
  }
  assert.equal(sandbox.getPhonicsKorean('Thanks'), '땡스');
  assert.equal(sandbox.getPhonicsKorean('restaurant?'), '레스토랑?');
  assert.equal(sandbox.getPhonicsKorean('problem.'), '프라블럼.');
});
