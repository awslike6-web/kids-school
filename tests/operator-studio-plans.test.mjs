// 연산 멀티 스튜디오 사칙연산 풀이 계획 엔진 회귀 시험
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const plansCode = fs.readFileSync(path.join(root, 'kids/subjects/math/js/math_operator_studio-plans.js'), 'utf8');

const sandbox = {
  window: {},
  Math,
  String,
  Number,
  Array
};
vm.createContext(sandbox);
vm.runInContext(plansCode, sandbox);

const {
  buildAdditionPlan,
  buildSubtractionPlan,
  buildMultiplicationPlan,
  buildDivisionPlan,
  buildOpNumberLineModel
} = sandbox.window;

// --------------------------------------------------------
// ➕ 덧셈 회귀 시험
// --------------------------------------------------------
test('덧셈: 받아올림 없는 경우 (32 + 25 = 57)', () => {
  const plan = buildAdditionPlan(32, 25);
  assert.ok(plan.length >= 3);
  const lastStep = plan[plan.length - 1];
  assert.equal(lastStep.val, 57);
  assert.equal(lastStep.board.result.join(''), '57');
  assert.equal(lastStep.board.carries.filter(c => c === '1').length, 0, '올림수 없음');
});

test('덧셈: 일의 자리에서 1회 받아올림 있는 경우 (48 + 37 = 85)', () => {
  const plan = buildAdditionPlan(48, 37);
  const lastStep = plan[plan.length - 1];
  assert.equal(lastStep.val, 85);
  assert.equal(lastStep.board.result.join(''), '85');
  assert.ok(plan.some(s => s.title.includes('받아올림')), '받아올림 단계 존재');
});

test('덧셈: 연달아 받아올림 있는 경우 (389 + 425 = 814)', () => {
  const plan = buildAdditionPlan(389, 425);
  const lastStep = plan[plan.length - 1];
  assert.equal(lastStep.val, 814);
  assert.equal(lastStep.board.result.join(''), '814');
  const carrySteps = plan.filter(s => s.title.includes('받아올림'));
  assert.ok(carrySteps.length >= 2, '연속 받아올림 단계 2회 이상');
});

test('덧셈: 자릿수가 늘어나는 경우 (99 + 1 = 100, 999 + 1 = 1000)', () => {
  const plan99 = buildAdditionPlan(99, 1);
  assert.equal(plan99[plan99.length - 1].val, 100);
  assert.equal(plan99[plan99.length - 1].board.result.join(''), '100');

  const plan999 = buildAdditionPlan(999, 1);
  assert.equal(plan999[plan999.length - 1].val, 1000);
  assert.equal(plan999[plan999.length - 1].board.result.join(''), '1000');
});

test('덧셈: 1~999 범위 무작위 200쌍 검산', () => {
  for (let i = 0; i < 200; i++) {
    const a = Math.floor(Math.random() * 999) + 1;
    const b = Math.floor(Math.random() * 999) + 1;
    const plan = buildAdditionPlan(a, b);
    const lastStep = plan[plan.length - 1];
    assert.equal(lastStep.val, a + b, `${a} + ${b} 합 불일치`);
    assert.equal(Number(lastStep.board.result.join('')), a + b, `${a} + ${b} 칠판 결과 불일치`);
  }
});

// --------------------------------------------------------
// ➖ 뺄셈 회귀 시험
// --------------------------------------------------------
test('뺄셈: 받아내림 없는 경우 (57 − 23 = 34)', () => {
  const plan = buildSubtractionPlan(57, 23);
  const lastStep = plan[plan.length - 1];
  assert.equal(lastStep.val, 34);
  assert.equal(lastStep.board.result.join(''), '34');
  assert.ok(!plan.some(s => s.title.includes('받아내림')), '받아내림 없음');
});

test('뺄셈: 1회 받아내림 있는 경우 (82 − 35 = 47)', () => {
  const plan = buildSubtractionPlan(82, 35);
  const lastStep = plan[plan.length - 1];
  assert.equal(lastStep.val, 47);
  assert.equal(lastStep.board.result.join(''), '47');
  assert.ok(plan.some(s => s.title.includes('받아내림')), '받아내림 단계 존재');
});

test('뺄셈: 0이 낀 경우 (100 − 35 = 65, 504 − 168 = 336)', () => {
  const plan100 = buildSubtractionPlan(100, 35);
  const last100 = plan100[plan100.length - 1];
  assert.equal(last100.val, 65);
  assert.equal(last100.board.result.join(''), '65');
  assert.ok(plan100.some(s => s.title.includes('받아내림 준비')), '0 낀 경우 받아내림 준비 단계 존재');

  const plan504 = buildSubtractionPlan(504, 168);
  const last504 = plan504[plan504.length - 1];
  assert.equal(last504.val, 336);
  assert.equal(last504.board.result.join(''), '336');
});

test('뺄셈: 연달아 받아내림 있는 경우 (142 − 68 = 74, 912 − 458 = 454)', () => {
  const plan = buildSubtractionPlan(142, 68);
  assert.equal(plan[plan.length - 1].val, 74);
  assert.equal(plan[plan.length - 1].board.result.join(''), '74');

  const plan2 = buildSubtractionPlan(912, 458);
  assert.equal(plan2[plan2.length - 1].val, 454);
  assert.equal(plan2[plan2.length - 1].board.result.join(''), '454');
});

test('뺄셈: A < B 음수 예외 시 에러리스 안내', () => {
  const plan = buildSubtractionPlan(35, 82);
  assert.equal(plan.length, 1);
  assert.ok(plan[0].isNegative);
  assert.ok(plan[0].speech.includes('큰 수에서 작은 수를 빼요'));
});

test('뺄셈: 1~999 범위 무작위 200쌍 검산 (A >= B)', () => {
  for (let i = 0; i < 200; i++) {
    let a = Math.floor(Math.random() * 999) + 1;
    let b = Math.floor(Math.random() * 999) + 1;
    if (a < b) [a, b] = [b, a];
    const plan = buildSubtractionPlan(a, b);
    const lastStep = plan[plan.length - 1];
    assert.equal(lastStep.val, a - b, `${a} - ${b} 차 불일치`);
    assert.equal(Number(lastStep.board.result.join('')), a - b, `${a} - ${b} 칠판 결과 불일치`);
  }
});

// --------------------------------------------------------
// ✖️ 곱셈 회귀 시험
// --------------------------------------------------------
test('곱셈: 한 자리 수 곱셈 (23 × 4 = 92, 124 × 3 = 372)', () => {
  const plan23 = buildMultiplicationPlan(23, 4);
  assert.equal(plan23[plan23.length - 1].val, 92);
  assert.equal(plan23[plan23.length - 1].board.product, 92);

  const plan124 = buildMultiplicationPlan(124, 3);
  assert.equal(plan124[plan124.length - 1].val, 372);
  assert.equal(plan124[plan124.length - 1].board.product, 372);
});

test('곱셈: 두 자리 수 곱셈 (34 × 12 = 408, 78 × 25 = 1950)', () => {
  const plan34 = buildMultiplicationPlan(34, 12);
  assert.equal(plan34[plan34.length - 1].val, 408);
  assert.equal(plan34[plan34.length - 1].board.product, 408);
  assert.ok(plan34[plan34.length - 1].board.isTwoDigit);
  assert.equal(plan34[plan34.length - 1].board.rows.length, 3, '부분곱1, 부분곱2, 합계 3행');

  const plan78 = buildMultiplicationPlan(78, 25);
  assert.equal(plan78[plan78.length - 1].val, 1950);
  assert.equal(plan78[plan78.length - 1].board.product, 1950);
});

test('곱셈: 1~999 × 1~99 범위 무작위 200쌍 검산', () => {
  for (let i = 0; i < 200; i++) {
    const a = Math.floor(Math.random() * 999) + 1;
    const b = Math.floor(Math.random() * 99) + 1;
    const plan = buildMultiplicationPlan(a, b);
    const lastStep = plan[plan.length - 1];
    assert.equal(lastStep.val, a * b, `${a} × ${b} 곱 불일치`);
    assert.equal(lastStep.board.product, a * b, `${a} × ${b} 칠판 결과 불일치`);
  }
});

// --------------------------------------------------------
// ➗ 나눗셈 기존 동작 회귀 시험
// --------------------------------------------------------
test('나눗셈: 기존 74 ÷ 6 = 몫 12, 나머지 2 회귀 보존', () => {
  const plan = buildDivisionPlan(74, 6);
  const lastStep = plan[plan.length - 1];
  assert.equal(lastStep.board.quotient.join(''), '12');
  assert.equal(lastStep.val, 2);
  assert.ok(lastStep.speech.includes('몫은 12'));
});

// --------------------------------------------------------
// 📏 수직선 모델 회귀 시험
// --------------------------------------------------------
test('수직선 모델: 덧셈, 뺄셈, 곱셈, 나눗셈 생성 확인', () => {
  const nlAdd = buildOpNumberLineModel('add', 48, 37);
  assert.equal(nlAdd.endVal, 85);
  assert.equal(nlAdd.jumps.length, 2);

  const nlSub = buildOpNumberLineModel('sub', 82, 35);
  assert.equal(nlSub.endVal, 47);
  assert.equal(nlSub.jumps.length, 2);

  const nlMul = buildOpNumberLineModel('mul', 23, 4);
  assert.equal(nlMul.endVal, 92);
  assert.equal(nlMul.totalJumps, 4);

  const nlDiv = buildOpNumberLineModel('div', 74, 6);
  assert.equal(nlDiv.endVal, 2);
  assert.equal(nlDiv.totalJumps, 12);
});
