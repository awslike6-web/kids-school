// 50까지 수 분리 규칙: 머리 주석·줄 상한·독립 CSS 블록·HTML 로드 계약·부분 실행·이벤트·HTML 호출 함수.
// 2026-11-14: 얼린 원본(tests/fixtures/number50-split)과의 고정 경계 원문 대조·실행 결과 비교,
// 전역 함수 개수 고정은 정상 수정마다 깨져 뺐다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { root, read, lineCount, assertLoadsInOrder, assertRelativeAssets, assertInlineHandlersDeclared, inlineHandlersDeclaredIn } from './split-rules.mjs';

const htmlPath = 'kids/subjects/math/number50.html';
const html = read(htmlPath);
const groups = [
    {
        dir: 'kids/js', ext: 'js', kind: 'script',
        header: '// kids/js/math_number50_stages.js - math_number50.js 분리 2/2: STAGE 3·4·나가기·초기화 (math_number50.js 다음에 로드)'
    },
    {
        dir: 'kids/css', ext: 'css', kind: 'style',
        header: '/* kids/css/math_number50_stages.css - math_number50.css 분리 2/2: STAGE 2·3·4·애니메이션 (math_number50.css 다음에 로드) */'
    }
].map(group => ({
    ...group,
    files: [`${group.dir}/math_number50.${group.ext}`, `${group.dir}/math_number50_stages.${group.ext}`]
}));
const hrefOf = file => `../../${file.slice('kids/'.length)}`;

for (const group of groups) {
    test(`${group.ext}: 둘째 파일은 지정 머리 주석으로 시작한다`, () => {
        const source = read(group.files[1]);
        const newline = source.indexOf('\n');
        assert.ok(newline >= 0, '머리 주석 다음 개행 없음');
        assert.equal(source.slice(0, newline).replace(/\r$/, ''), group.header);
    });
    for (const file of group.files) {
        test(`${file}: 실존 및 600줄 이하`, () => {
            assert.ok(fs.existsSync(path.join(root, file)));
            assert.ok(lineCount(read(file)) <= 600, '600줄 초과');
        });
    }
}

for (const file of groups[1].files) {
    test(`${file}: 독립 CSS 블록 경계 및 @import 없음`, () => {
        const css = read(file).replace(/\/\*[\s\S]*?\*\//g, '');
        assert.equal((css.match(/\{/g) ?? []).length, (css.match(/\}/g) ?? []).length);
        let depth = 0;
        for (const brace of css.match(/[{}]/g) ?? []) {
            depth += brace === '{' ? 1 : -1;
            assert.ok(depth >= 0, '앞 파일의 블록을 이어 닫음');
        }
        assert.equal(depth, 0, '닫히지 않은 블록');
        assert.doesNotMatch(css, /@import\b/i);
    });
}

for (const group of groups) {
    test(`${group.ext}: HTML의 상대 경로·같은 버전·연속 로드·중복 없음`, () => {
        const hrefs = group.files.map(hrefOf);
        assertRelativeAssets(htmlPath, group.kind, hrefs);
        const [first, second] = assertLoadsInOrder(html, group.kind, hrefs, `number50 ${group.ext}`);
        if (group.ext === 'css') {
            assert.ok(first.start > html.indexOf('<head>'));
            assert.ok(second.end < html.indexOf('</head>'));
        } else {
            assert.ok(first.start > html.indexOf('<script src="../../core/fairy-chatbot.js"></script>'));
            assert.ok(second.end < html.indexOf('</body>'));
        }
    });
}

test('운영 소스에 버전 없는 옛 number50 자산 참조가 없다', () => {
    const walk = dir => fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(entry => {
        const file = path.join(dir, entry.name);
        if (entry.isDirectory()) return walk(file);
        return /\.(?:html|js|mjs|cjs|css)$/.test(entry.name) ? [file] : [];
    });
    const rootFiles = fs.readdirSync(root).filter(file => /\.(?:html|js|mjs|cjs|css)$/.test(file));
    // system_map_generated.js는 조감도용 파일 이름 목록일 뿐 스크립트 참조가 아니다.
    for (const file of [...rootFiles, ...walk('kids'), ...walk('scripts')].filter(name => !name.endsWith('system_map_generated.js'))) {
        assert.doesNotMatch(read(file), /math_number50(?:_stages)?\.(?:js|css)(?:#[^"'<>\s]*)?["']/,
            `${file}: 버전 없는 참조`);
    }
});

function sandbox(prefilled = false, webkit = false) {
    const events = [], effects = [], frames = [];
    const unexpected = name => () => { throw new Error(`로드 중 예상하지 않은 접근: ${name}`); };
    const canvas = {
        getContext: kind => {
            assert.equal(kind, '2d');
            effects.push('getContext:2d');
            return { clearRect: (...args) => effects.push(['clearRect', ...args]) };
        }
    };
    const register = target => (type, callback) => {
        assert.equal(typeof callback, 'function');
        events.push({ target, type, callback: callback.name });
    };
    const context = {
        innerWidth: 800, innerHeight: 600,
        document: {
            getElementById: id => {
                assert.equal(id, 'confetti-canvas');
                effects.push(`getElementById:${id}`);
                return canvas;
            },
            addEventListener: register('document'),
            querySelectorAll: unexpected('querySelectorAll'),
            createElement: unexpected('createElement')
        },
        addEventListener: register('window'),
        requestAnimationFrame: callback => frames.push(callback.name),
        setTimeout: unexpected('setTimeout'), fetch: unexpected('fetch'),
        localStorage: { getItem: unexpected('getItem'), setItem: unexpected('setItem') },
        Date: class extends Date { constructor() { super('2026-11-01T00:00:00Z'); } }
    };
    context[webkit ? 'webkitAudioContext' : 'AudioContext'] = class {
        constructor() { effects.push('AudioContext'); }
    };
    if (prefilled) {
        context.wrongNotes = [{ text: '기존 오답', wrongInput: '기존 입력' }];
        context.roomStartTime = new context.Date();
    }
    context.window = context;
    vm.createContext(context);
    return { context, events, effects, frames, canvas };
}

for (const [prefilled, webkit] of [[false, false], [true, true]]) {
    const mode = prefilled ? '기존 상태·webkitAudioContext' : '빈 상태·AudioContext';
    test(`${mode}: 첫 JS만 실행해도 뒤 파일 호출 없이 초기화한다`, () => {
        const sb = sandbox(prefilled, webkit);
        assert.doesNotThrow(() => vm.runInContext(read(groups[0].files[0]), sb.context));
        assert.deepEqual(sb.events, [{ target: 'window', type: 'resize', callback: 'resizeConfetti' }]);
        assert.deepEqual(sb.effects, ['AudioContext', 'getElementById:confetti-canvas',
            'getContext:2d', ['clearRect', 0, 0, 800, 600]]);
        assert.deepEqual(sb.frames, ['updateConfetti']);
        assert.deepEqual({ width: sb.canvas.width, height: sb.canvas.height }, { width: 800, height: 600 });
        for (const name of ['resizeMatchCanvas', 'drawMatchCanvas', 'generateNewRandomMatching', 'exitRoom']) {
            assert.equal(typeof sb.context[name], 'undefined', `뒤 파일 함수 조기 노출: ${name}`);
        }
        if (prefilled) {
            assert.equal(sb.context.wrongNotes[0].text, '기존 오답', '기존 오답 노트를 덮어씀');
        }
    });

    test(`${mode}: 순차 로드 뒤 이벤트 등록 순서와 HTML 호출 함수가 갖춰진다`, () => {
        const split = sandbox(prefilled, webkit);
        for (const file of groups[0].files) vm.runInContext(read(file), split.context, { filename: file });
        assert.deepEqual(split.events, [
            { target: 'window', type: 'resize', callback: 'resizeConfetti' },
            { target: 'window', type: 'resize', callback: '' },
            { target: 'window', type: 'pagehide', callback: '' },
            { target: 'document', type: 'DOMContentLoaded', callback: '' }
        ]);
        const missing = inlineHandlersDeclaredIn(html, groups[0].files.map(read)).filter(name => typeof split.context[name] !== 'function');
        assert.deepEqual(missing, [], 'HTML이 부르는데 두 JS 로드 뒤 없는 전역 함수');
    });
}

test('HTML on* 속성이 부르는 함수가 모두 선언되어 있음', () => {
    assertInlineHandlersDeclared(htmlPath);
});
