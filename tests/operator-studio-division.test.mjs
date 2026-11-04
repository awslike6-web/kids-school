// 연산 스튜디오 나눗셈: 입력 범위(1~999 ÷ 1~99) 전체에서 풀이 단계와 수직선이 실제 계산과 맞는지 확인한다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const jsDir = path.join(root, 'kids/subjects/math/js');

function loadStudio() {
    const elements = {};
    const sandbox = {
        window: {},
        localStorage: { getItem: () => null },
        document: {
            addEventListener() {},
            getElementById: id => (elements[id] ??= { value: '', textContent: '', innerHTML: '' })
        },
        alert() {}
    };
    vm.createContext(sandbox);
    for (const file of ['plans', 'core', 'blocks', 'numberline', 'main'].map(part => `math_operator_studio-${part}.js`)) {
        vm.runInContext(fs.readFileSync(path.join(jsDir, file), 'utf8'), sandbox, { filename: file });
    }
    return {
        elements,
        planFor(a, b) {
            sandbox.__a = a;
            sandbox.__b = b;
            return vm.runInContext('buildDivisionPlan(__a, __b)', sandbox);
        },
        numberLineFor: (a, b) => {
            sandbox.__a = a;
            sandbox.__b = b;
            return vm.runInContext('window.OperatorStudioLines.buildNumberLineModel(__a, __b)', sandbox);
        },
        run: code => vm.runInContext(code, sandbox)
    };
}

const studio = loadStudio();

// 마지막 칠판을 사람이 읽는 세로셈 줄로 바꾼다 (빈 칸은 ·)
function finalBoard(a, b) {
    const plan = studio.planFor(a, b);
    const { board } = plan[plan.length - 1];
    const size = String(a).length;
    const line = row => {
        const cells = Array(size).fill('·');
        const start = row.endCol - row.value.length + 1;
        [...row.value].forEach((digit, i) => { cells[start + i] = digit; });
        return cells.join('');
    };
    return {
        steps: plan.length,
        quotient: board.quotient.map(digit => digit || '·').join(''),
        rows: board.rows.map(line)
    };
}

test('화면에서 틀렸던 입력의 마지막 칠판이 교과서 세로셈과 같다', () => {
    const expected = {
        '74/6': { steps: 7, quotient: '12', rows: ['6·', '14', '12', '·2'] },
        '56/8': { steps: 4, quotient: '·7', rows: ['56', '·0'] },
        '35/5': { steps: 4, quotient: '·7', rows: ['35', '·0'] },
        '96/12': { steps: 4, quotient: '·8', rows: ['96', '·0'] },
        '7/2': { steps: 3, quotient: '3', rows: ['6', '1'] },
        '3/5': { steps: 1, quotient: '0', rows: ['3'] },
        '125/5': { steps: 8, quotient: '·25', rows: ['10·', '·25', '·25', '··0'] },
        '408/4': { steps: 9, quotient: '102', rows: ['4··', '··8', '··8', '··0'] }
    };
    for (const [key, want] of Object.entries(expected)) {
        const [a, b] = key.split('/').map(Number);
        assert.deepEqual(JSON.parse(JSON.stringify(finalBoard(a, b))), want, key);
    }
});

test('74 ÷ 6은 몫 12, 나머지 2까지 7단계로 끝난다', () => {
    const plan = studio.planFor(74, 6);
    assert.deepEqual([...plan].map(step => step.focus), [
        'quotient', 'product', 'subtract', 'bring_down', 'quotient', 'product', 'remainder'
    ]);
});

test('1~999 ÷ 1~99 전 범위에서 모든 단계가 실제 계산과 일치한다', () => {
    for (let a = 1; a <= 999; a++) {
        const digits = [...String(a)].map(Number);
        for (let b = 1; b <= 99; b++) {
            const label = `${a}÷${b}`;
            const plan = studio.planFor(a, b);
            const last = plan[plan.length - 1];

            // 풀이를 처음부터 다시 따라가며 값을 확인한다
            let running = null;
            let col = -1;
            plan.forEach((step, i) => {
                assert.equal(step.step, i + 1, `${label} 단계 번호`);
                assert.ok(step.title.startsWith(`${i + 1}단계: `), `${label} 제목 번호`);
                for (const text of [step.title, step.desc, step.speech]) {
                    assert.ok(!/undefined|NaN/.test(text), `${label} 문구 오류: ${text}`);
                }
                for (const row of step.board.rows) {
                    assert.ok(row.endCol < digits.length, `${label} 칸 넘침`);
                    assert.ok(row.value.length <= row.endCol + 1, `${label} 왼쪽 칸 넘침`);
                }
                const top = step.board.rows[step.board.rows.length - 1];

                if (step.focus === 'look') {
                    assert.equal(i, 0, `${label} 살펴보기는 첫 단계`);
                    running = step.val;
                    col = step.board.activeDividendCols.at(-1);
                    assert.equal(running, Number(String(a).slice(0, col + 1)));
                    assert.ok(Number(String(a).slice(0, col)) < b, `${label} 앞자리에 나누는 수가 들어감`);
                } else if (step.focus === 'quotient') {
                    if (col === -1) { col = 0; running = digits[0]; }
                    assert.equal(step.val, Math.floor(running / b), `${label} 몫`);
                    assert.equal(step.board.quotient[col], String(step.val));
                } else if (step.focus === 'product') {
                    const q = Number(step.board.quotient[col]);
                    assert.equal(step.val, q * b, `${label} 곱`);
                    assert.equal(top.kind, 'product');
                    assert.equal(top.value, String(q * b));
                    assert.equal(top.endCol, col);
                } else if (step.focus === 'subtract') {
                    running -= Number(step.board.quotient[col]) * b;
                    assert.equal(step.val, running, `${label} 뺄셈`);
                    assert.ok(running < b, `${label} 뺀 값이 나누는 수보다 큼`);
                    assert.equal(top.value, String(running));
                } else if (step.focus === 'bring_down') {
                    col++;
                    running = running * 10 + digits[col];
                    assert.equal(step.val, running, `${label} 내려쓰기`);
                    assert.equal(top.value, String(running), `${label} 앞자리 0 없이 표기`);
                    assert.equal(top.broughtCol, col);
                } else {
                    assert.equal(step.focus, 'remainder', `${label} 알 수 없는 단계`);
                    assert.equal(i, plan.length - 1, `${label} 나머지는 마지막 단계`);
                    if (col === -1) { col = 0; running = digits[0]; }
                    running -= Number(step.board.quotient[col]) * b;
                    assert.equal(step.val, running, `${label} 나머지 계산`);
                }
            });

            const quotientText = last.board.quotient.join('');
            assert.equal(quotientText, String(Math.floor(a / b)), `${label} 최종 몫`);
            assert.equal(col, digits.length - 1, `${label} 마지막 자리까지 진행`);

            const finalRow = last.board.rows[last.board.rows.length - 1];
            assert.equal(finalRow.kind, 'remainder', `${label} 마지막 줄`);
            assert.equal(finalRow.value, String(a % b), `${label} 최종 나머지`);
            assert.equal(finalRow.endCol, digits.length - 1, `${label} 나머지 자리`);
            assert.ok(last.desc.includes(`몫은 ${Math.floor(a / b)}, 나머지는 ${a % b}`), `${label} 결과 문구`);
        }
    }
});

test('수직선 모델: 점프·눈금이 전 범위에서 실제 계산과 일치한다', () => {
    for (let a = 1; a <= 999; a++) {
        for (let b = 1; b <= 99; b++) {
            const label = `${a}÷${b}`;
            const model = studio.numberLineFor(a, b);
            const q = Math.floor(a / b);
            assert.equal(model.quotient, q);
            assert.equal(model.remainder, a % b);
            assert.ok(model.jumps.length <= 12, `${label} 점프 수 상한`);
            assert.equal(model.compressed, q > 12);

            for (const jump of model.jumps) {
                assert.equal(jump.from - jump.to, b, `${label} 점프 크기`);
                assert.equal(jump.to, a - jump.index * b, `${label} 점프 위치`);
                assert.ok(jump.toPos < jump.fromPos, `${label} 점프 방향`);
            }
            if (q > 0) {
                assert.equal(model.jumps[0].from, a, `${label} 출발점`);
                assert.equal(model.jumps.at(-1).to, a % b, `${label} 도착점`);
            }
            if (model.compressed) {
                assert.equal(model.gap.skipped, q - model.jumps.length, `${label} 건너뛴 횟수`);
            } else {
                assert.equal(model.jumps.length, q, `${label} 모든 점프 표시`);
                assert.equal(model.gap, null);
            }

            const positions = model.ticks.map(tick => tick.pos);
            assert.equal(positions[0], 0, `${label} 0은 왼쪽 끝`);
            assert.equal(positions.at(-1), 100, `${label} 나누어지는 수는 오른쪽 끝`);
            positions.slice(1).forEach((pos, i) => {
                assert.ok(pos > positions[i], `${label} 눈금 순서`);
            });
        }
    }
});

test('0으로 나누기 입력은 경고 후 1로 바뀌고, 범위를 벗어난 값은 입력칸까지 맞춘다', () => {
    const setup = (a, b) => {
        studio.elements.numA = { value: String(a) };
        studio.elements.numB = { value: String(b) };
        studio.elements.studioViewport = { innerHTML: '' };
        studio.elements.fairySpeechText = { textContent: '' };
    };
    studio.run('var __alerts = 0; alert = () => { __alerts++; };');

    setup(74, 0);
    studio.run('startStudioCalculation(false)');
    assert.equal(studio.run('__alerts'), 1);
    assert.equal(studio.elements.numB.value, 1);

    setup(12345, 500);
    studio.run('startStudioCalculation(false)');
    assert.equal(studio.elements.numA.value, 999);
    assert.equal(studio.elements.numB.value, 99);
    assert.equal(studio.run('__alerts'), 1);
});
