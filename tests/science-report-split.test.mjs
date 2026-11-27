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
