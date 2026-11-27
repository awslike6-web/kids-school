// 과학 탐구 보고서 분리 계약 (2026-11-28 리팩토링 묶음 D3)
// science_report.js(보고서 그리기) + science_report_quiz.js(실전 퀴즈), 진행 상태는 ScienceReport._state 한 객체
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = rel => fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const DOC = 'kids/js/science_report.js', QUIZ = 'kids/js/science_report_quiz.js';
const NAMESPACE = ['open', 'openUnit2', 'openUnit3', 'openUnit4', 'openUnit5', 'renderUI', 'renderDoc', 'renderQuiz',
    'selectBlankWord', 'selectBlankWordByIdx', 'clearBlankSlot', 'resetBlankAnswers', 'checkBlankAnswer', 'submitChoiceQuiz',
    'pickOrderStep', 'removeOrderStep', 'resetOrderSteps', 'checkOrderQuiz', 'passOrderQuiz', 'setStarRating', 'fillAllStars',
    'triggerFeedbackNext', 'finishAllQuiz'];
const GLOBALS = ['openScienceReport', 'openScienceReport2', 'openScienceReport3', 'openScienceReport4', 'openScienceReport5',
    'renderLabReportUI', 'renderLabReportDoc', 'renderLabReportQuiz', 'selectBlankWord', 'resetBlankAnswers', 'checkBlankAnswer',
    'submitChoiceQuiz', 'passOrderQuiz', 'finishAllReportQuiz'];

function load(files) {
    const ctx = { console };
    ctx.window = ctx;
    vm.createContext(ctx);
    for (const f of files) vm.runInContext(read(f), ctx, { filename: f });
    return ctx;
}

test('science.html은 보고서 파일 바로 다음에 퀴즈 파일을 싣는다', () => {
    const html = read('kids/subjects/science/science.html');
    const srcs = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi)].map(m => m[1].split('?')[0].split('/').pop());
    const at = srcs.indexOf('science_report.js');
    assert.ok(at >= 0);
    assert.equal(srcs[at + 1], 'science_report_quiz.js');
});

test('두 파일을 실으면 예전 이름표 23개와 전역 14개가 그대로 있다', () => {
    const ctx = load([DOC, QUIZ]);
    for (const n of NAMESPACE) assert.equal(typeof ctx.ScienceReport[n], 'function', `ScienceReport.${n}`);
    for (const n of GLOBALS) assert.equal(typeof ctx[n], 'function', n);
    assert.equal(ctx.ScienceReport.renderQuiz, ctx.renderLabReportQuiz);
});

test('진행 상태는 한 객체: 보고서 쪽에서 바꾼 단원 번호를 퀴즈 쪽이 같이 본다', () => {
    const ctx = load([DOC, QUIZ]);
    const S = ctx.ScienceReport._state;
    assert.equal(S.currentReportUnitId, 1);
    S.currentReportUnitId = 3;
    assert.equal(ctx.ScienceReport._state.currentReportUnitId, 3);
    for (const k of ['currentReportTab', 'currentReportQuizIdx', 'userBlankAnswers', 'userOrderPicks', 'reportQuizSession']) assert.ok(k in S, k);
});

test('퀴즈 파일을 먼저 실으면 무엇이 빠졌는지 알려 준다', () => {
    assert.throws(() => load([QUIZ]), /science_report\.js를 science_report_quiz\.js보다 먼저/);
});

test('상태 변수는 공유 객체로만 쓴다 (두 파일에 let 사본이 다시 생기지 않음)', () => {
    for (const f of [DOC, QUIZ]) {
        const src = read(f);
        for (const n of ['currentReportTab', 'currentReportQuizIdx', 'currentReportUnitId', 'userBlankAnswers', 'userOrderPicks', 'reportQuizSession']) {
            assert.doesNotMatch(src, new RegExp(`(?:let|var|const)\\s+${n}\\b`), `${f}에 ${n} 사본`);
        }
    }
});

test('채점 소리: 정답 fairyPraise, 오답 fairyEncourage, 완주 fairyReward를 채점 코드에서 직접 부른다 (헌법 §6)', () => {
    const calls = [];
    const el = () => ({ innerHTML: '', style: {}, classList: { add() {}, remove() {} } });
    const ctx = {
        console,
        document: { getElementById: () => el(), querySelector: () => null, querySelectorAll: () => [] },
        fairyPraise: () => calls.push('praise'),
        fairyEncourage: () => calls.push('encourage'),
        fairyReward: () => calls.push('reward'),
        SCIENCE_LAB_REPORT_DATA: { quizItems: [
            { type: 'choice', choices: ['혼합물', '순물질'], answer: 0, explanation: '' },
            { type: 'blank', blanks: [{ id: 'b1', target: '가', answer: '증발' }], explanation: '' },
            { type: 'order', steps: [{ id: 1, text: '하나' }, { id: 2, text: '둘' }], explanation: '' }
        ] }
    };
    ctx.window = ctx;
    vm.createContext(ctx);
    vm.runInContext(read(DOC), ctx);
    vm.runInContext(read(QUIZ), ctx);
    const R = ctx.ScienceReport;
    R.submitChoiceQuiz(0, 1);
    R.submitChoiceQuiz(0, 0);
    assert.deepEqual(calls.splice(0), ['encourage', 'praise']);
    R.checkBlankAnswer(1); // 빈칸 비어 있음 → 오답
    R.selectBlankWord('증발');
    R.checkBlankAnswer(1);
    assert.deepEqual(calls.splice(0), ['encourage', 'praise']);
    R._state.userOrderPicks = [{ id: 2 }, { id: 1 }];
    R.checkOrderQuiz(2);
    R._state.userOrderPicks = [{ id: 1 }, { id: 2 }];
    R.checkOrderQuiz(2);
    assert.deepEqual(calls.splice(0), ['encourage', 'praise']);
    R.finishAllQuiz();
    assert.deepEqual(calls, ['reward']);
});

test('요정 엔진이 없는 곳에서도 채점은 조용히 된다', () => {
    const ctx = { console, document: { getElementById: () => ({ innerHTML: '' }) },
        SCIENCE_LAB_REPORT_DATA: { quizItems: [{ type: 'choice', choices: ['가', '나'], answer: 0, explanation: '' }] } };
    ctx.window = ctx;
    vm.createContext(ctx);
    vm.runInContext(read(DOC), ctx);
    vm.runInContext(read(QUIZ), ctx);
    assert.doesNotThrow(() => ctx.ScienceReport.submitChoiceQuiz(0, 0));
});
