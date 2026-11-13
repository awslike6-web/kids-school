// 세로셈 분리 규칙: 머리 주석·줄 상한·구문 분석·HTML 로드·보상 오디오 호출·부분 실행·공개 API.
// 2026-11-14: 얼린 원본(tests/fixtures/vertical-math-split)과의 434줄 경계 바이트 대조, 분리 직전 HTML 해시,
// 실행 결과 대조, 전역 함수 개수·정확한 ?v= 값 고정은 정상 수정마다 깨져 뺐다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { root, read, lineCount, assertLoadsInOrder, assertInlineHandlersDeclared, inlineHandlersDeclaredIn } from './split-rules.mjs';

const files = ['kids/js/vertical_math_logic.js', 'kids/js/vertical_math_grid.js'];
const sources = files.map(read);
const htmlPath = 'kids/subjects/math/vertical_math.html';
const html = read(htmlPath);
const header = '// kids/js/vertical_math_grid.js - vertical_math_logic.js 분리 2/2: 나눗셈 시뮬레이터·격자 그리기·채점·결과·인쇄 (vertical_math_logic.js 다음에 로드)';
const events = [{ target: 'document', type: 'DOMContentLoaded', callback: '' }];
// 공개 함수(추가는 자유, 이름 변경·삭제만 실패). 앞 둘은 첫 파일, 뒤 둘은 둘째 파일에 있어야 한다.
const globalFunctions = ['generateQuestions', 'getMemoCanvasPoint', 'initMemoPad',
    'isVerticalMathInProgress', 'resizeMemoCanvas', 'setFocus'];
const windowFunctions = ['clearMemoPad', 'closeDifficultyModal', 'exitRoom', 'goSetup',
    'pressBackspace', 'pressClear', 'pressNum', 'showDifficultyModal', 'showScreen',
    'startGame', 'switchMemoMode', 'toggleCalcMemoModal', 'toggleNumpadCollapse'];
const gridFunctions = ['nextQuestion', 'renderDynamicGrid', 'showResult', 'simulateDivision'];
const gridWindowFunctions = ['printWorksheet', 'submitAnswer'];

test('둘째 파일은 지정 머리 주석으로 시작한다', () => {
    const newline = sources[1].indexOf('\n');
    assert.ok(newline >= 0);
    assert.equal(sources[1].slice(0, newline).replace(/\r$/, ''), header);
});

for (const file of files) {
    test(`${file}: 실존·600줄 이하·독립 구문 분석`, () => {
        assert.ok(fs.existsSync(path.join(root, file)));
        assert.ok(lineCount(read(file)) <= 600);
        assert.doesNotThrow(() => new vm.Script(read(file), { filename: file }));
    });
}

test('HTML은 상대 경로·같은 버전·클래식 스크립트로 한 번씩 연속 로드한다', () => {
    assertLoadsInOrder(html, 'script', files.map(file => `../../${file.slice('kids/'.length)}`), '세로셈');
    assert.doesNotMatch(html, /vertical_math_(?:logic|grid)\.js["']/);
});

test('HTML on* 속성이 부르는 함수가 모두 선언되어 있음', () => {
    assertInlineHandlersDeclared(htmlPath);
});

test('다른 운영 소스에 버전 없는 세로셈 JS 참조가 없고 버전은 서로 같다', () => {
    const walk = dir => fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(entry => {
        const file = path.join(dir, entry.name);
        return entry.isDirectory() ? walk(file) : /\.(?:html|js|mjs|cjs|css)$/.test(entry.name) ? [file] : [];
    });
    const rootFiles = fs.readdirSync(root).filter(file => /\.(?:html|js|mjs|cjs|css)$/.test(file));
    const versions = new Set();
    // system_map_generated.js는 조감도용 파일 이름 목록일 뿐 스크립트 참조가 아니다.
    for (const file of [...rootFiles, ...walk('kids'), ...walk('scripts')].filter(name => !name.endsWith('system_map_generated.js'))) {
        for (const match of read(file).matchAll(/vertical_math_(?:logic|grid)\.js([^"'<>\s]*)["']/g)) {
            assert.match(match[1], /^\?v=[^&]+$/, `${file}: 버전 누락`);
            versions.add(match[1]);
        }
    }
    assert.equal(versions.size, 1, `세로셈 JS 버전이 서로 다름: ${[...versions].join(', ')}`);
});

test('채점·완주 보상 오디오 호출은 둘째 파일에 각 1회씩 있다', () => {
    for (const name of ['fairyPraise', 'fairyEncourage', 'fairyReward']) {
        const count = text => [...text.matchAll(new RegExp(`\\b${name}\\s*\\(`, 'g'))].length;
        assert.equal(count(sources[0]), 0, `${name}: 첫 파일 호출 없음`);
        assert.equal(count(sources[1]), 1, `${name}: 둘째 파일 1회`);
    }
});

function sandbox(prefilled = false) {
    const registered = [], timers = [], reads = [];
    const wrongNotes = prefilled ? [{ text: '12 + 3', userAns: '14', answer: '15' }] : [];
    const unexpected = name => () => { throw new Error(`로드 중 예상하지 않은 접근: ${name}`); };
    const register = target => (type, callback) => {
        assert.equal(typeof callback, 'function');
        registered.push({ target, type, callback: callback.name });
    };
    const timer = kind => (callback, delay) => {
        assert.equal(typeof callback, 'function');
        timers.push({ kind, callback: callback.name, delay });
        return timers.length;
    };
    const context = {
        Date: class extends Date { constructor(...args) { super(...(args.length ? args : [1793491200000])); } },
        document: new Proxy({ addEventListener: register('document') }, {
            get(target, key) {
                if (Object.hasOwn(target, key)) return target[key];
                throw new Error(`로드 중 DOM 접근: ${String(key)}`);
            }
        }),
        localStorage: {
            getItem: key => {
                reads.push(key);
                if (key === 'currentUser') return prefilled ? 'daughter' : null;
                if (key === `minmin_math_wrong_${prefilled ? 'daughter' : 'son'}`) {
                    return prefilled ? JSON.stringify(wrongNotes) : null;
                }
                return unexpected(`getItem(${key})`)();
            },
            setItem: unexpected('setItem'), removeItem: unexpected('removeItem')
        },
        fetch: unexpected('fetch'), XMLHttpRequest: unexpected('XMLHttpRequest'),
        WebSocket: unexpected('WebSocket'), navigator: { sendBeacon: unexpected('sendBeacon') },
        addEventListener: register('window'),
        setTimeout: timer('timeout'), setInterval: timer('interval'),
        requestAnimationFrame: unexpected('requestAnimationFrame')
    };
    context.window = context;
    vm.createContext(context);
    return { context, registered, timers, reads, wrongNotes };
}

// 최상위 function 선언과 window.이름 할당을 모두 보도록 컨텍스트 안에서 typeof로 확인한다.
const definedIn = (sb, names) => JSON.parse(vm.runInContext(
    `JSON.stringify(${JSON.stringify(names)}.filter(name => eval('typeof ' + name) === 'function'))`, sb.context));

for (const prefilled of [false, true]) {
    const mode = prefilled ? '민서·기존 오답' : '민수·기본값';
    test(`${mode}: 첫 파일만 실행해도 뒤 파일·DOM·네트워크 접근이 없다`, () => {
        const sb = sandbox(prefilled);
        assert.doesNotThrow(() => vm.runInContext(sources[0], sb.context, { filename: files[0] }));
        const firstFile = [...globalFunctions, ...windowFunctions];
        assert.deepEqual(definedIn(sb, firstFile), firstFile, '첫 파일 공개 함수 누락');
        for (const name of windowFunctions) assert.equal(typeof sb.context[name], 'function', `window.${name} 누락`);
        assert.deepEqual(sb.registered, events);
        assert.deepEqual(sb.timers, []);
        assert.deepEqual(sb.reads, ['currentUser', `minmin_math_wrong_${prefilled ? 'daughter' : 'son'}`]);
        const state = JSON.parse(vm.runInContext('JSON.stringify({currentProfile, currentSubject, wrongNotes})', sb.context));
        assert.equal(state.currentProfile, prefilled ? 'daughter' : 'son');
        assert.equal(state.currentSubject, '수학');
        assert.deepEqual(state.wrongNotes, sb.wrongNotes);
        for (const name of [...gridFunctions, ...gridWindowFunctions]) {
            assert.equal(typeof sb.context[name], 'undefined', `뒤 파일 함수 조기 노출: ${name}`);
        }
    });

    test(`${mode}: 순차 실행 뒤 공개 함수·HTML 호출 함수·이벤트·타이머가 갖춰진다`, () => {
        const split = sandbox(prefilled);
        sources.forEach((source, index) => vm.runInContext(source, split.context, { filename: files[index] }));
        const all = [...globalFunctions, ...windowFunctions, ...gridFunctions, ...gridWindowFunctions];
        assert.deepEqual(definedIn(split, all), all, '공개 함수 누락');
        for (const name of [...windowFunctions, ...gridWindowFunctions]) {
            assert.equal(typeof split.context[name], 'function', `window.${name} 누락`);
        }
        const missing = inlineHandlersDeclaredIn(html, sources).filter(name => typeof split.context[name] !== 'function');
        assert.deepEqual(missing, [], 'HTML이 부르는데 로드 뒤 없는 전역 함수');
        assert.deepEqual(split.registered, events);
        assert.deepEqual(split.timers, []);
    });
}
