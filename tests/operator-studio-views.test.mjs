// 연산 스튜디오 화면 조립 시험: 네 연산의 모든 탭을 끝까지 눌러 보고 만들어진 HTML을 검사한다.
// 브라우저가 아니므로 글자·구조·단계 변화만 본다. 레이아웃은 쓰기 차단 서버에서 눈으로 확인한다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const jsDir = path.join(root, 'kids/subjects/math/js');
const FILES = ['plans', 'core', 'blocks', 'numberline', 'main'].map(part => `math_operator_studio-${part}.js`);

function createStudio() {
    const elements = {};
    const spoken = [];
    const makeTab = tab => {
        const attrs = { onclick: `switchViewTab('${tab}', this)` };
        return {
            style: {},
            textContent: '',
            classList: { add() {}, remove() {}, toggle() {} },
            getAttribute: key => attrs[key] ?? null
        };
    };
    const viewTabs = ['blocks', 'vertical', 'numberline', 'area'].map(makeTab);
    const element = id => (elements[id] ??= { id, value: '', textContent: '', innerHTML: '', setAttribute() {} });
    const sandbox = {
        window: {},
        localStorage: { getItem: () => null },
        document: {
            addEventListener() {},
            getElementById: element,
            querySelector: selector => (selector === '.preset-row' ? element('presetRow') : null),
            querySelectorAll: selector => (selector === '.view-tab-btn' ? viewTabs : [])
        },
        alert() {},
        speakFairyTTS: text => spoken.push(text)
    };
    vm.createContext(sandbox);
    for (const file of FILES) {
        vm.runInContext(fs.readFileSync(path.join(jsDir, file), 'utf8'), sandbox, { filename: file });
    }
    const run = code => vm.runInContext(code, sandbox);
    return {
        spoken,
        viewTabs,
        run,
        html: () => element('studioViewport').innerHTML,
        fairy: () => element('fairySpeechText').textContent,
        start(op, tab, a, b) {
            run(`currentOp = '${op}'; currentViewTab = '${tab}'; hasUserStarted = true;`);
            element('numA').value = a;
            element('numB').value = b;
            run('startStudioCalculation(true)');
        }
    };
}

const CASES = {
    div: [[74, 6], [56, 8], [125, 5], [408, 4], [7, 2], [3, 5], [999, 99], [999, 1]],
    mul: [[23, 4], [124, 3], [34, 12], [78, 25], [204, 3], [34, 10], [20, 30], [999, 99], [1, 1]],
    add: [[32, 25], [48, 37], [85, 47], [389, 425], [99, 1], [999, 999], [1, 1]],
    sub: [[57, 23], [82, 35], [100, 35], [142, 68], [504, 168], [5, 5], [100, 99], [999, 1]]
};

// 다음 버튼이 꺼질 때까지 눌러 단계별 HTML을 모은다
function walk(studio, changeFn) {
    const pages = [studio.html()];
    for (let guard = 0; guard < 60; guard++) {
        const next = studio.html().match(new RegExp(`onclick="${changeFn}\\(1\\)"[^>]*>`));
        if (!next || next[0].includes('disabled')) return pages;
        studio.run(`${changeFn}(1)`);
        pages.push(studio.html());
    }
    throw new Error('다음 버튼이 끝나지 않음');
}

const CLEAN = /undefined|NaN|\bnull\b|\[object|판를|판는|판로|판가|블록로/;
const blockArea = html => html.slice(html.indexOf('block-display-area'));

for (const [op, cases] of Object.entries(CASES)) {
    test(`${op}: 모든 탭·단계에 잘못된 글자가 없고 음성이 나온다`, () => {
        const studio = createStudio();
        const tabs = op === 'add' || op === 'sub' ? ['blocks', 'vertical', 'numberline'] : ['blocks', 'vertical', 'numberline', 'area'];
        const steppers = { blocks: 'changeBlockStep', vertical: 'changeTutorStep', numberline: 'changeNumberLineStep' };
        for (const [a, b] of cases) {
            for (const tab of tabs) {
                studio.start(op, tab, a, b);
                const pages = steppers[tab] ? walk(studio, steppers[tab]) : [studio.html()];
                pages.forEach((page, i) => {
                    assert.ok(!CLEAN.test(page), `${op} ${a},${b} ${tab} ${i + 1}쪽: ${page.match(CLEAN)?.[0]}`);
                });
                assert.ok(studio.fairy().length > 0, `${op} ${a},${b} ${tab} 해설 비어 있음`);
                assert.ok(!CLEAN.test(studio.fairy()), `${op} ${a},${b} ${tab} 해설: ${studio.fairy()}`);
            }
        }
        assert.ok(studio.spoken.every(text => typeof text === 'string' && text.length > 0), '빈 음성 호출');
    });

    test(`${op}: 수직선은 실제 축이 있고 점프마다 호가 하나씩 늘어난다`, () => {
        const studio = createStudio();
        for (const [a, b] of cases) {
            studio.start(op, 'numberline', a, b);
            const pages = walk(studio, 'changeNumberLineStep');
            pages.forEach((page, i) => {
                assert.ok(page.includes('nl-axis-line'), `${op} ${a},${b} 축 없음`);
                assert.ok(page.includes('nl-tick'), `${op} ${a},${b} 눈금 없음`);
                assert.equal((page.match(/class="nl-jump-arc/g) || []).length, i, `${op} ${a},${b} ${i}번째 호`);
            });
            assert.ok(pages.at(-1).includes('nl-tick--current'), `${op} ${a},${b} 현재 위치 표시`);
        }
    });
}

for (const op of ['add', 'sub', 'mul']) {
    test(`${op}: 블록 그림이 단계마다 실제로 바뀐다`, () => {
        const studio = createStudio();
        for (const [a, b] of CASES[op]) {
            studio.start(op, 'blocks', a, b);
            const areas = walk(studio, 'changeBlockStep').map(blockArea);
            assert.ok(areas.length >= 2, `${op} ${a},${b} 단계 수`);
            assert.equal(new Set(areas).size, areas.length, `${op} ${a},${b} 같은 그림이 반복됨`);
        }
    });
}

test('덧셈·뺄셈·곱셈 블록과 수직선 문구의 숫자 뒤 조사가 맞다', () => {
    const studio = createStudio();
    const steppers = { blocks: 'changeBlockStep', numberline: 'changeNumberLineStep' };
    for (const op of ['add', 'sub', 'mul']) {
        for (const [a, b] of CASES[op]) {
            for (const [tab, stepper] of Object.entries(steppers)) {
                studio.start(op, tab, a, b);
                const texts = [...walk(studio, stepper), studio.fairy()];
                for (const text of texts) {
                    const plain = text.replace(/<[^>]+>/g, '');
                    for (const match of plain.matchAll(/(\d+)(을|를|은|는|이에요|예요|과|와)(?=[\s!.,?])/g)) {
                        const noBatchim = [2, 4, 5, 9].includes(Number(match[1]) % 10);
                        const wrong = noBatchim ? ['을', '은', '이에요', '과'].includes(match[2]) : ['를', '는', '예요', '와'].includes(match[2]);
                        assert.ok(!wrong, `${op} ${a},${b} ${tab}: ${match[0]}`);
                    }
                }
            }
        }
    }
});

test('블록 묶음 값: 어느 단계에서나 전체 값이 보존된다 (전 범위)', () => {
    const sandbox = { window: {} };
    vm.createContext(sandbox);
    for (const file of FILES.slice(0, 1)) vm.runInContext(fs.readFileSync(path.join(jsDir, file), 'utf8'), sandbox);
    sandbox.localStorage = { getItem: () => null };
    sandbox.document = { addEventListener() {}, getElementById() { return {}; } };
    vm.runInContext(fs.readFileSync(path.join(jsDir, FILES[1]), 'utf8'), sandbox);
    vm.runInContext(fs.readFileSync(path.join(jsDir, FILES[2]), 'utf8'), sandbox);
    const blocks = sandbox.window.OperatorStudioBlocks;
    const total = (step, roles) => step.groups
        .filter(group => roles.includes(group.role))
        .reduce((sum, group) => sum + blocks.countsValue(group.counts), 0);

    for (let a = 1; a <= 999; a++) {
        for (let b = 1; b <= 999; b++) {
            for (const step of blocks.buildAdditionBlockSteps(a, b)) {
                assert.equal(total(step, ['a', 'b', 'sum']), a + b, `${a}+${b} ${step.title}`);
                for (const group of step.groups) {
                    assert.ok(group.counts.o <= 19 && group.counts.t <= 19 && group.counts.h <= 19, `${a}+${b} 그릴 블록 수`);
                }
            }
            if (a >= b) {
                const steps = blocks.buildSubtractionBlockSteps(a, b);
                for (const step of steps) {
                    assert.equal(total(step, ['left', 'removed']), a, `${a}-${b} ${step.title}`);
                    for (const group of step.groups) {
                        for (const place of ['h', 't', 'o']) assert.ok(group.counts[place] >= 0, `${a}-${b} 음수 블록`);
                    }
                }
                assert.equal(total(steps.at(-1), ['left']), a - b, `${a}-${b} 남은 수`);
                assert.equal(total(steps.at(-1), ['removed']), b, `${a}-${b} 덜어낸 수`);
            }
        }
    }
    for (let a = 1; a <= 999; a++) {
        for (let b = 1; b <= 99; b++) {
            const steps = blocks.buildMultiplicationBlockSteps(a, b);
            assert.equal(total(steps.at(-1), ['total']), a * b, `${a}×${b} 최종 곱`);
            steps.filter(step => step.groups.some(group => group.role === 'total')).forEach(step => {
                assert.equal(total(step, ['total']), a * b, `${a}×${b} ${step.title}`);
            });
        }
    }
});

test('수직선 모델: 네 연산의 출발·도착·눈금 순서가 전 범위에서 맞다', () => {
    const sandbox = { window: {}, localStorage: { getItem: () => null }, document: { addEventListener() {}, getElementById() { return {}; } } };
    vm.createContext(sandbox);
    for (const file of FILES.slice(0, 4)) vm.runInContext(fs.readFileSync(path.join(jsDir, file), 'utf8'), sandbox);
    const { buildOpNumberLineModel: build } = sandbox.window.OperatorStudioLines;
    const check = (label, model, end) => {
        assert.equal(model.endVal, end, label);
        assert.ok(model.jumps.length <= 12, `${label} 점프 상한`);
        const positions = model.ticks.map(tick => tick.pos);
        assert.equal(positions[0], 0, `${label} 왼쪽 끝`);
        assert.equal(positions.at(-1), 100, `${label} 오른쪽 끝`);
        positions.slice(1).forEach((pos, i) => assert.ok(pos > positions[i], `${label} 눈금 순서`));
        for (const jump of model.jumps) {
            assert.ok(Number.isFinite(jump.fromPos) && Number.isFinite(jump.toPos), `${label} 위치`);
        }
        if (model.jumps.length > 0 && !model.compressed) {
            assert.equal(model.jumps[0].from, model.startVal, `${label} 출발`);
            assert.equal(model.jumps.at(-1).to, end, `${label} 도착`);
        }
    };
    for (let a = 1; a <= 999; a += 2) {
        for (let b = 1; b <= 999; b += 2) {
            check(`${a}+${b}`, build('add', a, b), a + b);
            if (a >= b) check(`${a}-${b}`, build('sub', a, b), a - b);
            else assert.equal(build('sub', a, b).blocked, true);
        }
    }
    for (let a = 1; a <= 999; a++) {
        for (let b = 1; b <= 99; b++) {
            const model = build('mul', a, b);
            check(`${a}×${b}`, model, a * b);
            assert.equal(model.compressed, b > 12, `${a}×${b} 줄임`);
            if (model.compressed) assert.equal(model.gap.skipped, b - model.jumps.length, `${a}×${b} 건너뛴 횟수`);
        }
    }
});

test('뺄셈 앞 수가 작으면 어느 탭이든 안내만 보인다', () => {
    const studio = createStudio();
    for (const tab of ['blocks', 'vertical', 'numberline']) {
        studio.start('sub', tab, 20, 50);
        const page = studio.html();
        assert.ok(page.includes('subtraction-guide'), `${tab} 안내 없음`);
        for (const stale of ['도착한 수', 'nl-axis-line', 'division-table', 'block-display-area']) {
            assert.ok(!page.includes(stale), `${tab}에 ${stale}가 남음`);
        }
    }
});

test('나눗셈 수직선 화면이 다음 점프 버튼과 몫·나머지를 유지한다', () => {
    const studio = createStudio();
    studio.start('div', 'numberline', 74, 6);
    const pages = walk(studio, 'changeNumberLineStep');
    assert.equal(pages.length, 13, '74 ÷ 6은 12번 점프');
    assert.ok(pages[0].includes('다음 점프'));
    assert.ok(pages[0].includes('6씩 뒤로 뛰기 (0 / 12번)'));
    assert.ok(pages[12].includes('74 - (6 × 12)'));
    assert.ok(studio.fairy().includes('전체 몫은 12, 나머지는 2예요'));
});
