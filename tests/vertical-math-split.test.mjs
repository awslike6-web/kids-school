// 세로셈 분리: 고정 원본·HTML 배선·부분 실행·전역 API를 검사한다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const files = ['kids/js/vertical_math_logic.js', 'kids/js/vertical_math_grid.js'];
const fixture = read('tests/fixtures/vertical-math-split/vertical_math_logic.js');
const sources = files.map(read);
const html = read('kids/subjects/math/vertical_math.html');
const version = '?v=20261101-vertical-split';
const header = '// kids/js/vertical_math_grid.js - vertical_math_logic.js 분리 2/2: 나눗셈 시뮬레이터·격자 그리기·채점·결과·인쇄 (vertical_math_logic.js 다음에 로드)';
const normalize = text => text.replace(/\r\n/g, '\n').replace(/[\t ]+$/gm, '').replace(/\n+$/, '');
const tags = ['logic', 'grid'].map(name => `<script src="../../js/vertical_math_${name}.js${version}"></script>`);
const events = [{ target: 'document', type: 'DOMContentLoaded', callback: '' }];
const globalFunctions = ['generateQuestions', 'getMemoCanvasPoint', 'initMemoPad',
    'isVerticalMathInProgress', 'resizeMemoCanvas', 'setFocus'];
const windowFunctions = ['clearMemoPad', 'closeDifficultyModal', 'exitRoom', 'goSetup',
    'pressBackspace', 'pressClear', 'pressNum', 'showDifficultyModal', 'showScreen',
    'startGame', 'switchMemoMode', 'toggleCalcMemoModal', 'toggleNumpadCollapse'];
const gridFunctions = ['nextQuestion', 'renderDynamicGrid', 'showResult', 'simulateDivision'];
const gridWindowFunctions = ['printWorksheet', 'submitAnswer'];

test('지정 434줄 경계·머리 주석·마지막 개행 없는 고정 원본을 보존한다', () => {
    const newline = sources[1].indexOf('\n');
    assert.ok(newline >= 0);
    assert.equal(sources[1].slice(0, newline).replace(/\r$/, ''), header);
    const tail = sources[1].slice(newline + 1);
    const lines = fixture.match(/[^\n]*\n|[^\n]+$/g);
    assert.equal(lines.length, 879);
    assert.equal(sources[0], lines.slice(0, 434).join(''));
    assert.equal(tail, lines.slice(434).join(''));
    assert.equal(normalize(sources[0] + tail), normalize(fixture));
    assert.deepEqual(Buffer.from(sources[0] + tail), Buffer.from(fixture), '바이트까지 원문 보존');
    assert.equal(lines[432].trim(), '}');
    assert.equal(lines[433].trim(), '');
    assert.equal(lines[434].trim(), '// ➗ 나눗셈 롱 디비전(Long Division) 시뮬레이터');
    assert.equal(fixture.endsWith('\n'), false);
    assert.equal(sources[1].endsWith('\n'), false);
});

for (const file of files) {
    test(`${file}: 실존·600줄 이하·독립 구문 분석`, () => {
        assert.ok(fs.existsSync(path.join(root, file)));
        assert.ok(read(file).split(/\r?\n/).length <= 600);
        assert.doesNotThrow(() => new vm.Script(read(file), { filename: file }));
    });
}

test('HTML은 상대 경로·같은 버전·클래식 스크립트로 한 번씩 연속 로드한다', () => {
    const matches = [...html.matchAll(/<script\b[^>]*\bsrc=["'][^"']*vertical_math_(?:logic|grid)\.js[^"']*["'][^>]*>\s*<\/script>/g)];
    assert.deepEqual(matches.map(match => match[0]), tags);
    const between = html.slice(matches[0].index + matches[0][0].length, matches[1].index);
    assert.match(between, /^\r?\n$/);
    assert.doesNotMatch(html, /vertical_math_(?:logic|grid)\.js["']/);
});

test('HTML의 두 스크립트 배선 이외 원문은 승인 전과 같다', () => {
    const newline = html.includes('\r\n') ? '\r\n' : '\n';
    const restored = html.replace(newline + tags[1], '')
        .replace(tags[0], '<script src="../../js/vertical_math_logic.js"></script>');
    // 분리 직전 HTML의 줄바꿈을 LF로 정규화한 UTF-8 해시. 시험 중 git이나 네트워크는 사용하지 않는다.
    assert.equal(createHash('sha256').update(restored.replace(/\r\n/g, '\n')).digest('hex'),
        '0cccef376121b31bfc9117b8d9cea21afcb84502c5d4fb6783c821591628a117');
});

test('다른 운영 소스에 옛 버전·버전 없는 세로셈 JS 참조가 없다', () => {
    const walk = dir => fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(entry => {
        const file = path.join(dir, entry.name);
        return entry.isDirectory() ? walk(file) : /\.(?:html|js|mjs|cjs|css)$/.test(entry.name) ? [file] : [];
    });
    const rootFiles = fs.readdirSync(root).filter(file => /\.(?:html|js|mjs|cjs|css)$/.test(file));
    for (const file of [...rootFiles, ...walk('kids'), ...walk('scripts')]) {
        for (const match of read(file).matchAll(/vertical_math_(?:logic|grid)\.js([^"'<>\s]*)["']/g)) {
            assert.equal(match[1], version, `${file}: 옛 버전 또는 버전 누락`);
        }
    }
});

test('채점·완주 보상 오디오 호출은 둘째 파일에 각 1회씩 보존한다', () => {
    for (const name of ['fairyPraise', 'fairyEncourage', 'fairyReward']) {
        const count = text => [...text.matchAll(new RegExp(`\\b${name}\\s*\\(`, 'g'))].length;
        assert.equal(count(fixture), 1, `${name}: 고정 원본 호출 수`);
        assert.equal(count(sources[0]), 0, `${name}: 첫 파일 호출 없음`);
        assert.equal(count(sources[1]), count(fixture), `${name}: 호출 보존`);
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
    const initialNames = new Set(Object.keys(context));
    vm.createContext(context);
    return { context, initialNames, registered, timers, reads, wrongNotes };
}

function snapshot(sb) {
    const names = Object.keys(sb.context).filter(name => !sb.initialNames.has(name)).sort();
    return {
        names, windowFunctions: names.filter(name => typeof sb.context[name] === 'function'),
        globalFunctions: JSON.parse(vm.runInContext(`JSON.stringify(${JSON.stringify([
            ...globalFunctions, ...windowFunctions, ...gridFunctions, ...gridWindowFunctions
        ])}.filter(name => eval('typeof ' + name) === 'function').sort())`, sb.context)),
        events: sb.registered, timers: sb.timers, reads: sb.reads,
        // 최상위 const/let은 window 속성이 아니므로 같은 전역 컨텍스트에서 읽는다.
        state: vm.runInContext(`JSON.stringify({currentProfile,gameState,focusedInput,wrongNotes,
            roomStartTime,isExiting,currentSubject,memoMode,memoDrawing,memoCanvasCtx,
            isNumpadCollapsed,DIFFICULTY_LEVELS})`, sb.context)
    };
}

for (const prefilled of [false, true]) {
    const mode = prefilled ? '민서·기존 오답' : '민수·기본값';
    test(`${mode}: 첫 파일만 실행해도 뒤 파일·DOM·네트워크 접근이 없다`, () => {
        const sb = sandbox(prefilled);
        assert.doesNotThrow(() => vm.runInContext(sources[0], sb.context, { filename: files[0] }));
        const result = snapshot(sb);
        assert.deepEqual(result.globalFunctions, [...globalFunctions, ...windowFunctions].sort());
        assert.deepEqual(result.windowFunctions, result.globalFunctions);
        assert.deepEqual(result.events, events);
        assert.deepEqual(result.timers, []);
        assert.deepEqual(result.reads, ['currentUser', `minmin_math_wrong_${prefilled ? 'daughter' : 'son'}`]);
        const state = JSON.parse(result.state);
        assert.equal(state.currentProfile, prefilled ? 'daughter' : 'son');
        assert.equal(state.currentSubject, '수학');
        assert.deepEqual(state.wrongNotes, sb.wrongNotes);
        for (const name of [...gridFunctions, ...gridWindowFunctions]) {
            assert.equal(typeof sb.context[name], 'undefined', `뒤 파일 함수 조기 노출: ${name}`);
        }
    });

    test(`${mode}: 순차 실행의 전역 함수·초기 상태·이벤트·타이머가 원본과 같다`, () => {
        const original = sandbox(prefilled), split = sandbox(prefilled);
        vm.runInContext(fixture, original.context, { filename: '원본 fixture' });
        sources.forEach((source, index) => vm.runInContext(source, split.context, { filename: files[index] }));
        const result = snapshot(split);
        assert.deepEqual(result, snapshot(original));
        assert.equal(result.globalFunctions.length, 25);
        assert.deepEqual(result.windowFunctions, result.globalFunctions);
        assert.deepEqual(result.events, events);
        assert.deepEqual(result.timers, []);
    });
}
