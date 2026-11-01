// 50까지 수 분리: 고정 원본·HTML 로드 계약·부분 실행·전역 API를 검사한다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const htmlPath = 'kids/subjects/math/number50.html';
const html = read(htmlPath);
const version = '?v=20261101-number50-split';
const normalize = text => text.replace(/\r\n/g, '\n').replace(/[\t ]+$/gm, '').replace(/\n+$/, '');
const groups = [
    {
        dir: 'kids/js', ext: 'js', cut: 424,
        header: '// kids/js/math_number50_stages.js - math_number50.js 분리 2/2: STAGE 3·4·나가기·초기화 (math_number50.js 다음에 로드)'
    },
    {
        dir: 'kids/css', ext: 'css', cut: 524,
        header: '/* kids/css/math_number50_stages.css - math_number50.css 분리 2/2: STAGE 2·3·4·애니메이션 (math_number50.css 다음에 로드) */'
    }
].map(group => ({
    ...group,
    files: [`${group.dir}/math_number50.${group.ext}`, `${group.dir}/math_number50_stages.${group.ext}`],
    fixture: read(`tests/fixtures/number50-split/math_number50.${group.ext}`)
}));
const withoutHeader = (source, header) => {
    const newline = source.indexOf('\n');
    assert.ok(newline >= 0, '머리 주석 다음 개행 없음');
    assert.equal(source.slice(0, newline).replace(/\r$/, ''), header);
    return source.slice(newline + 1);
};

for (const group of groups) {
    test(`${group.ext}: 지정 경계·머리 주석과 고정 fixture 원문 보존`, () => {
        const sources = group.files.map(read);
        const tail = withoutHeader(sources[1], group.header);
        const fixtureLines = group.fixture.match(/[^\n]*\n|[^\n]+$/g);
        assert.equal(sources[0], fixtureLines.slice(0, group.cut).join(''));
        assert.equal(tail, fixtureLines.slice(group.cut).join(''));
        assert.equal(normalize(sources[0] + tail), normalize(group.fixture));
        assert.equal(sources[0] + tail, group.fixture, '줄바꿈·공백까지 원본 보존');
    });
    for (const file of group.files) {
        test(`${file}: 실존 및 600줄 이하`, () => {
            assert.ok(fs.existsSync(path.join(root, file)));
            assert.ok(read(file).split(/\r?\n/).length <= 600, '600줄 초과');
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
    test(`${group.ext}: HTML의 상대 경로·동일 버전·연속 로드·중복 없음`, () => {
        const tags = [...html.matchAll(group.ext === 'css'
            ? /<link\b[^>]*\bhref=["'][^"']*math_number50[^"']*["'][^>]*>/g
            : /<script\b[^>]*\bsrc=["'][^"']*math_number50[^"']*["'][^>]*>\s*<\/script>/g)]
            .map(match => ({ tag: match[0], index: match.index }));
        const expected = group.files.map(file => {
            const href = `../../${file.slice('kids/'.length)}${version}`;
            assert.ok(fs.existsSync(path.resolve(root, path.dirname(htmlPath), href.split('?')[0])));
            return group.ext === 'css'
                ? `<link rel="stylesheet" href="${href}">`
                : `<script src="${href}"></script>`;
        });
        assert.deepEqual(tags.map(item => item.tag), expected);
        const block = html.slice(tags[0].index, tags[1].index + tags[1].tag.length);
        assert.match(block, /^[^\r\n]+\r?\n[\t ]*<[^\r\n]+>$/);
        assert.equal(block.replace(/>\s+</g, '><'), expected.join(''));
        if (group.ext === 'css') {
            assert.ok(tags[0].index > html.indexOf('<head>'));
            assert.equal(html.slice(tags[1].index + tags[1].tag.length, html.indexOf('</head>')).trim(), '');
        } else {
            assert.ok(tags[0].index > html.indexOf('<script src="../../core/fairy-chatbot.js"></script>'));
            assert.equal(html.slice(tags[1].index + tags[1].tag.length, html.indexOf('</body>')).trim(),
                '<script>window.currentSubject = "수학";</script>');
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
    for (const file of [...rootFiles, ...walk('kids'), ...walk('scripts')]) {
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
    const initialNames = new Set(Object.keys(context));
    vm.createContext(context);
    return { context, initialNames, events, effects, frames, canvas };
}

function snapshot(sb, complete) {
    const names = Object.keys(sb.context).filter(name => !sb.initialNames.has(name)).sort();
    return {
        functions: names.filter(name => typeof sb.context[name] === 'function'),
        names, events: sb.events, effects: sb.effects, frames: sb.frames,
        canvas: { width: sb.canvas.width, height: sb.canvas.height },
        // const/let은 window 속성이 아니므로 같은 전역 컨텍스트에서 별도 확인한다.
        state: vm.runInContext(`JSON.stringify({currentSubject, wrongNotes, roomStartTime,
            stars, confettiParticles, stage1Cubes, stage1Target, stage1Mode, quizTargetMissing,
            sinoDigit, sinoTens, nativeTens, nativeDigit, currentProblem, explainStep
            ${complete ? ', currentMatchItems, matchLines, activeDrag, currentTrainData, compQuizType, compNum1, compNum2, compStreak, isExiting' : ''}})`, sb.context)
    };
}

for (const [prefilled, webkit] of [[false, false], [true, true]]) {
    const mode = prefilled ? '기존 상태·webkitAudioContext' : '빈 상태·AudioContext';
    test(`${mode}: 첫 JS만 실행해도 뒤 파일 호출 없이 초기화한다`, () => {
        const sb = sandbox(prefilled, webkit);
        assert.doesNotThrow(() => vm.runInContext(read(groups[0].files[0]), sb.context));
        const result = snapshot(sb, false);
        assert.equal(result.functions.length, 28);
        assert.deepEqual(result.events, [{ target: 'window', type: 'resize', callback: 'resizeConfetti' }]);
        assert.deepEqual(result.effects, ['AudioContext', 'getElementById:confetti-canvas',
            'getContext:2d', ['clearRect', 0, 0, 800, 600]]);
        assert.deepEqual(result.frames, ['updateConfetti']);
        assert.deepEqual(result.canvas, { width: 800, height: 600 });
        for (const name of ['resizeMatchCanvas', 'drawMatchCanvas', 'generateNewRandomMatching', 'exitRoom']) {
            assert.equal(typeof sb.context[name], 'undefined', `뒤 파일 함수 조기 노출: ${name}`);
        }
    });

    test(`${mode}: 순차 로드의 전역 함수·상태·이벤트가 원본과 같다`, () => {
        const original = sandbox(prefilled, webkit), split = sandbox(prefilled, webkit);
        vm.runInContext(groups[0].fixture, original.context, { filename: '원본 fixture' });
        for (const file of groups[0].files) vm.runInContext(read(file), split.context, { filename: file });
        const result = snapshot(split, true);
        assert.deepEqual(result, snapshot(original, true));
        assert.equal(result.functions.length, 44);
        assert.deepEqual(result.events, [
            { target: 'window', type: 'resize', callback: 'resizeConfetti' },
            { target: 'window', type: 'resize', callback: '' },
            { target: 'window', type: 'pagehide', callback: '' },
            { target: 'document', type: 'DOMContentLoaded', callback: '' }
        ]);
    });
}
