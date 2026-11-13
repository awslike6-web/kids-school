// 연산 스튜디오 덧셈·뺄셈·곱셈: 입력 범위 전체에서 각 단계의 값을 독립 계산과 대조한다.
// 최종 답만 보면 "결과 칸이 끝까지 비어 있음", "받아내린 값이 틀리게 표시됨"을 놓치므로 단계·칠판까지 본다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { includePair, additionClass, subtractionClass, assertSampleCoversClasses, FULL_RANGE } from './operator-range.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root, 'kids/subjects/math/js/math_operator_studio-plans.js'), 'utf8'), sandbox);
const { buildAdditionPlan, buildSubtractionPlan, buildMultiplicationPlan } = sandbox.window.OperatorStudioPlans;

const digitAt = (n, placeFromRight) => Math.floor(n / 10 ** placeFromRight) % 10;

function assertTitlesAndText(label, plan) {
    plan.forEach((step, i) => {
        assert.ok(step.title.startsWith(`${i + 1}단계: `), `${label} 제목 번호: ${step.title}`);
        assert.ok(!/^\d+단계: \d+단계/.test(step.title), `${label} 번호 이중: ${step.title}`);
        const text = `${step.title} ${step.desc} ${step.speech}`;
        assert.ok(!/undefined|NaN|null/.test(text), `${label} 문구 오류: ${text}`);
    });
}

// 숫자 뒤 조사: 2·4·5·9로 끝나면 받침이 없다
function assertNumberJosa(label, plan) {
    for (const step of plan) {
        const plain = `${step.desc} ${step.speech}`.replace(/<[^>]+>/g, '');
        for (const match of plain.matchAll(/(\d+)(을|를|은|는|이에요|예요)(?=[\s!.,?])/g)) {
            const noBatchim = [2, 4, 5, 9].includes(Number(match[1]) % 10);
            const wrong = noBatchim ? ['을', '은', '이에요'].includes(match[2]) : ['를', '는', '예요'].includes(match[2]);
            assert.ok(!wrong, `${label} 조사 오류: ${match[0]} / ${plain}`);
        }
    }
}

test('로컬 표본은 전수와 같은 덧셈·뺄셈 구조 클래스(자릿수·올림·받아내림·결과 자릿수)를 모두 덮는다', t => {
    const add = assertSampleCoversClasses(assert, additionClass);
    const sub = assertSampleCoversClasses(assert, subtractionClass);
    t.diagnostic(`덧셈 ${add}종·뺄셈 ${sub}종, ${FULL_RANGE ? '전수 실행(KIDS_TEST_FULL=1)' : '로컬 표본 실행'}`);
});

test('덧셈 1~999 + 1~999 범위(표본·전수): 자리별 결과·올림이 계산과 일치', () => {
    for (let a = 1; a <= 999; a++) {
        for (let b = 1; b <= 999; b++) {
            if (!includePair(a, b)) continue; // 로컬 표본, KIDS_TEST_FULL=1이면 전수
            const label = `${a}+${b}`;
            const plan = buildAdditionPlan(a, b);
            const last = plan.at(-1);
            assert.equal(last.val, a + b, label);
            assert.equal(last.board.result.join(''), String(a + b), label);

            const n = last.board.colCount;
            let carry = 0;
            const carries = Array(n).fill('');
            for (let place = 0; place < n; place++) {
                const value = digitAt(a, place) + digitAt(b, place) + carry;
                carry = Math.floor(value / 10);
                if (carry > 0) carries[n - 2 - place] = '1';
            }
            assert.deepEqual([...last.board.carries], carries, `${label} 올림`);

            // 칠판의 답은 일의 자리부터 한 칸씩 채워지고 지워지지 않는다
            plan.reduce((filled, step) => {
                const now = step.board.result.filter(digit => digit !== '').length;
                assert.ok(now === filled || now === filled + 1, `${label} 결과 칸 진행`);
                return now;
            }, 0);
        }
    }
});

test('뺄셈 1~999 − 1~999 범위(표본·전수): 칸 위 값이 실제로 빼는 값이고 답이 일치', () => {
    for (let a = 1; a <= 999; a++) {
        for (let b = 1; b <= 999; b++) {
            if (!includePair(a, b)) continue; // 로컬 표본, KIDS_TEST_FULL=1이면 전수
            const label = `${a}-${b}`;
            const plan = buildSubtractionPlan(a, b);
            if (a < b) {
                assert.equal(plan.length, 1, label);
                assert.equal(plan[0].isNegative, true, label);
                continue;
            }
            const last = plan.at(-1);
            assert.equal(last.val, a - b, label);
            assert.equal(last.board.result.join(''), String(a - b), `${label} 답 표기`);

            // 독립 계산: 자리마다 실제로 빼는 값
            const n = last.board.colCount;
            const cells = String(a).split('').map(Number);
            const subtrahend = String(b).padStart(n, '0').split('').map(Number);
            const original = [...cells];
            for (let c = n - 1; c >= 0; c--) {
                if (cells[c] < subtrahend[c]) {
                    let source = c - 1;
                    while (cells[source] === 0) { cells[source] = 9; source--; }
                    cells[source] -= 1;
                    cells[c] += 10;
                }
            }
            last.board.borrows.forEach((mark, c) => {
                if (mark) assert.equal(mark.val, cells[c], `${label} ${c}칸 표시값`);
                else assert.equal(cells[c], original[c], `${label} ${c}칸은 받아내림 없음`);
            });

            for (const step of plan) {
                const match = step.desc.match(/(일|십|백)의 자리: (\d+) − (\d+) = /);
                if (!match) continue;
                const col = n - 1 - ['일', '십', '백'].indexOf(match[1]);
                assert.equal(Number(match[2]), cells[col], `${label} ${step.desc}`);
                assert.equal(Number(match[3]), subtrahend[col], `${label} ${step.desc}`);
                assert.ok(!/ 0 − 0 /.test(` ${match[2]} − ${match[3]} `) || col > 0 && cells.slice(0, col).some(v => v > 0), `${label} 맨 앞 0 − 0 단계 금지`);
            }
        }
    }
});

test('곱셈 1~999 × 1~99 전 범위: 진행 중 칠판·올림·부분곱이 계산과 일치', () => {
    for (let a = 1; a <= 999; a++) {
        for (let b = 1; b <= 99; b++) {
            const label = `${a}×${b}`;
            const plan = buildMultiplicationPlan(a, b);
            assertTitlesAndText(label, plan);
            assertNumberJosa(label, plan);
            const last = plan.at(-1);
            assert.equal(last.val, a * b, label);
            assert.equal(last.board.rows.at(-1).cells.join(''), String(a * b), `${label} 마지막 줄`);

            if (b < 10) {
                const digits = String(a).length;
                let carry = 0;
                for (let i = 0; i < digits; i++) {
                    const value = digitAt(a, i) * b + carry;
                    carry = Math.floor(value / 10);
                    // i번째 자리 단계(첫 단계는 자릿수 쓰기)에서 그 자리 숫자가 이미 칠판에 있어야 한다
                    const row = plan[i + 1].board.rows[0];
                    assert.equal(row.cells[last.board.colCount - 1 - i], String(value % 10), `${label} ${i}자리 진행 표시`);
                }
            } else {
                const [part1, part2, sum] = last.board.rows;
                assert.equal(part1.cells.join(''), String(a * (b % 10)), `${label} 부분곱1`);
                assert.equal(part2.cells.at(-1), '', `${label} 부분곱2는 일의 자리를 비움`);
                assert.equal(part2.cells.join(''), String(a * Math.floor(b / 10)), `${label} 부분곱2`);
                assert.equal(sum.cells.join(''), String(a * b), `${label} 합`);
            }
        }
    }
});

test('덧셈·뺄셈 문구: 제목 번호·undefined·숫자 조사를 일정 간격으로 전수 표본 검사', () => {
    for (let a = 1; a <= 999; a += 7) {
        for (let b = 1; b <= 999; b += 3) {
            const addPlan = buildAdditionPlan(a, b), subPlan = a >= b ? buildSubtractionPlan(a, b) : [];
            assertTitlesAndText(`${a}+${b}`, addPlan);
            assertNumberJosa(`${a}+${b}`, addPlan);
            assertTitlesAndText(`${a}-${b}`, subPlan);
            assertNumberJosa(`${a}-${b}`, subPlan);
        }
    }
});

test('고정 사례: 경계와 0이 낀 계산의 마지막 칠판', () => {
    const subResult = (a, b) => buildSubtractionPlan(a, b).at(-1).board.result.join('');
    assert.equal(subResult(5, 5), '0');
    assert.equal(subResult(555, 555), '0');
    assert.equal(subResult(100, 35), '65');
    assert.equal(subResult(100, 99), '1');
    assert.equal(subResult(504, 168), '336');
    assert.deepEqual(
        [...buildSubtractionPlan(142, 68).at(-1).board.borrows].map(mark => mark && mark.val),
        [0, 13, 12],
        '142 − 68 칸 위 값'
    );
    assert.equal(buildAdditionPlan(999, 999).at(-1).board.result.join(''), '1998');
    assert.equal(buildAdditionPlan(99, 1).at(-1).board.result.join(''), '100');

    const mulRows = (a, b) => [...buildMultiplicationPlan(a, b).at(-1).board.rows].map(row => row.cells.join(''));
    assert.deepEqual(mulRows(204, 3), ['612']);
    assert.deepEqual(mulRows(34, 10), ['0', '34', '340']);
    assert.deepEqual(mulRows(20, 30), ['0', '60', '600']);
    assert.deepEqual(mulRows(999, 99), ['8991', '8991', '98901']);
});

test('추천 문제 이름이 실제 올림 횟수와 맞다', () => {
    const coreCode = fs.readFileSync(path.join(root, 'kids/subjects/math/js/math_operator_studio-core.js'), 'utf8');
    const block = coreCode.match(/add: \[([\s\S]*?)\]/)[1];
    const presets = [...block.matchAll(/a: (\d+), b: (\d+), label: '([^']+)'/g)];
    assert.ok(presets.length >= 5, '덧셈 추천 문제를 찾지 못함');
    for (const [, aText, bText, name] of presets) {
        const [a, b] = [Number(aText), Number(bText)];
        let carry = 0;
        let count = 0;
        for (let place = 0; place < 3; place++) {
            carry = Math.floor((digitAt(a, place) + digitAt(b, place) + carry) / 10);
            count += carry;
        }
        if (name.includes('없음')) assert.equal(count, 0, name);
        if (name.includes('두 번')) assert.equal(count, 2, name);
        if (name.includes('일의 자리 올림')) assert.equal(count, 1, name);
        assert.ok(name.startsWith(`${a} + ${b}`), name);
    }
});
