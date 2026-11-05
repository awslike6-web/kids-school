// 용어사전 분리: 고정 원본·HTML 배선·부분 실행·전역 API를 검사한다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { replaceOnce, version as rewardVersion } from './reward-grant-approved-edits.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const files = ['kids/common_space/voca_common.js', 'kids/common_space/voca_modal.js'];
const fixture = read('tests/fixtures/voca-common-split/voca_common.js');
const sources = files.map(read);
const html = read('kids/common_space/voca.html');
const version = '?v=20261101-voca-split';
const header = '// kids/common_space/voca_modal.js - voca_common.js 분리 2/2: 단어 모달·TTS·음성 입력·요정 코코 (voca_common.js 다음에 로드)';
const normalize = text => text.replace(/\r\n/g, '\n').replace(/[\t ]+$/gm, '').replace(/\n+$/, '');
const tags = ['voca_common', 'voca_modal'].map(name => `<script src="./${name}.js${version}"></script>`);
const events = [
    { target: 'window', type: 'load', callback: '' },
    { target: 'window', type: 'beforeunload', callback: '' }
];

test('지정 459줄 경계·머리 주석·고정 원본을 그대로 보존한다', () => {
    const newline = sources[1].indexOf('\n');
    assert.ok(newline >= 0);
    assert.equal(sources[1].slice(0, newline).replace(/\r$/, ''), header);
    const tail = sources[1].slice(newline + 1);
    const lines = fixture.match(/[^\n]*\n|[^\n]+$/g);
    assert.equal(lines.length, 906);
    assert.equal(sources[0], lines.slice(0, 459).join(''));
    assert.equal(tail, lines.slice(459).join(''));
    assert.equal(normalize(sources[0] + tail), normalize(fixture));
    assert.equal(sources[0] + tail, fixture, '줄바꿈·공백까지 원문 보존');
    assert.equal(lines[458].trim(), '');
    assert.equal(lines[459].trim(), 'let currentActiveWord = null;');
});

for (const file of files) {
    test(`${file}: 실존·600줄 이하·독립 구문 분석`, () => {
        assert.ok(fs.existsSync(path.join(root, file)));
        assert.ok(read(file).split(/\r?\n/).length <= 600);
        assert.doesNotThrow(() => new vm.Script(read(file), { filename: file }));
    });
}

test('HTML은 상대 경로·같은 버전·클래식 스크립트로 한 번씩 연속 로드한다', () => {
    const matches = [...html.matchAll(/<script\b[^>]*\bsrc=["'][^"']*voca_(?:common|modal)\.js[^"']*["'][^>]*>\s*<\/script>/g)];
    assert.deepEqual(matches.map(match => match[0]), tags);
    const between = html.slice(matches[0].index + matches[0][0].length, matches[1].index);
    assert.match(between, /^[\t ]*<!-- 📚 이 방 고유의 사전 기능만 전담 -->\r?\n$/);
    for (const file of files) assert.ok(fs.existsSync(path.join(root, file)));
    assert.doesNotMatch(html, /voca_(?:common|modal)\.js\?v=20260916_1400/);
});

test('HTML의 두 스크립트 배선 이외 원문은 승인 전과 같다', () => {
    const newline = html.includes('\r\n') ? '\r\n' : '\n';
    // 승인된 helper 버전만 되돌린 뒤 기존 고정 해시로 나머지 모든 바이트를 검사한다.
    const restored = replaceOnce(html, 'notion-helper.js?v=' + rewardVersion,
        'notion-helper.js?v=20260916_1400').replace(newline + tags[1], '')
        .replace(tags[0], '<script src="./voca_common.js?v=20260916_1400"></script>');
    // 분리 직전 HTML의 줄바꿈을 LF로 정규화한 UTF-8 해시. 시험 중 git이나 네트워크는 사용하지 않는다.
    assert.equal(createHash('sha256').update(restored.replace(/\r\n/g, '\n')).digest('hex'),
        '66f861fa85eb6f1bd538292f5c23d471fd3242298d7547471eb88a8af91bbf9b');
});

test('다른 운영 소스에 옛 버전·누락된 버전의 용어사전 JS 참조가 없다', () => {
    const walk = dir => fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(entry => {
        const file = path.join(dir, entry.name);
        return entry.isDirectory() ? walk(file) : /\.(?:html|js|mjs|cjs|css)$/.test(entry.name) ? [file] : [];
    });
    const rootFiles = fs.readdirSync(root).filter(file => /\.(?:html|js|mjs|cjs|css)$/.test(file));
    // system_map_generated.js는 조감도용 파일 이름 목록일 뿐 스크립트 참조가 아니다.
    for (const file of [...rootFiles, ...walk('kids'), ...walk('scripts')].filter(name => !name.endsWith('system_map_generated.js'))) {
        for (const match of read(file).matchAll(/voca_(?:common|modal)\.js([^"'<>\s]*)["']/g)) {
            assert.equal(match[1], version, `${file}: 옛 버전 또는 버전 누락`);
        }
    }
});

function sandbox(prefilled = false) {
    const registered = [], timers = [];
    const unexpected = name => () => { throw new Error(`로드 중 예상하지 않은 접근: ${name}`); };
    const context = {
        document: new Proxy({}, { get: (_, key) => { throw new Error(`로드 중 DOM 접근: ${String(key)}`); } }),
        localStorage: { getItem: unexpected('getItem'), setItem: unexpected('setItem') },
        fetch: unexpected('fetch'), XMLHttpRequest: unexpected('XMLHttpRequest'),
        addEventListener: (type, callback) => {
            assert.equal(typeof callback, 'function');
            registered.push({ target: 'window', type, callback: callback.name });
        },
        setTimeout: (callback, delay) => {
            assert.equal(typeof callback, 'function');
            timers.push({ callback: callback.name, delay });
            return timers.length;
        }
    };
    if (prefilled) Object.assign(context, {
        PROXY_URL: 'https://example.invalid', currentProfile: 'daughter',
        currentUserName: '민서', currentTheme: '슬라임'
    });
    context.window = context;
    const initialNames = new Set(Object.keys(context));
    vm.createContext(context);
    return { context, initialNames, registered, timers };
}

function snapshot(sb, complete) {
    const names = Object.keys(sb.context).filter(name => !sb.initialNames.has(name)).sort();
    return {
        names, functions: names.filter(name => typeof sb.context[name] === 'function'),
        events: sb.registered, timers: sb.timers,
        // 최상위 const/let은 window 속성이 아니므로 같은 전역 컨텍스트에서 읽는다.
        state: vm.runInContext(`JSON.stringify({WORKER_PROXY_URL,currentUser,currentUserName,
            currentTheme,currentSubject,allDictionaryWords,selectedStudents,selectedSubjects,
            selectedGrades,selectedUnit,MODAL_CHAT_HISTORY,isFairyVoiceOn,viewedWordsCount,wordStartTime
            ${complete ? ',currentActiveWord' : ''}})`, sb.context)
    };
}

for (const prefilled of [false, true]) {
    const mode = prefilled ? '민서·기존 전역 설정' : '민수·기본값';
    test(`${mode}: 첫 파일만 실행해도 뒤 파일 접근·DOM·네트워크 호출이 없다`, () => {
        const sb = sandbox(prefilled);
        assert.doesNotThrow(() => vm.runInContext(sources[0], sb.context, { filename: files[0] }));
        const result = snapshot(sb, false);
        assert.equal(result.functions.length, 17);
        assert.deepEqual(result.events, events);
        assert.deepEqual(result.timers, []);
        const state = JSON.parse(result.state);
        assert.equal(state.currentUser, prefilled ? 'daughter' : 'son');
        assert.equal(state.currentUserName, prefilled ? '민서' : '민수');
        assert.equal(state.currentTheme, prefilled ? '슬라임' : '마인크래프트');
        assert.equal(state.WORKER_PROXY_URL, prefilled ? 'https://example.invalid' : 'https://minmin-notion.awslike6.workers.dev');
        assert.equal(state.currentSubject, '용어사전');
        for (const name of ['openModal', 'closeModal', 'syncVoiceToggleBtnUi', 'askCocoFairy']) {
            assert.equal(typeof sb.context[name], 'undefined', `뒤 파일 함수 조기 노출: ${name}`);
        }
        assert.equal(vm.runInContext('typeof currentActiveWord', sb.context), 'undefined');
        assert.equal(sb.context.manualSyncVocaData, vm.runInContext('manualSyncVocaData', sb.context));
    });

    test(`${mode}: 순차 실행의 전역 함수·초기 상태·이벤트·타이머가 원본과 같다`, () => {
        const original = sandbox(prefilled), split = sandbox(prefilled);
        vm.runInContext(fixture, original.context, { filename: '원본 fixture' });
        sources.forEach((source, index) => vm.runInContext(source, split.context, { filename: files[index] }));
        const result = snapshot(split, true);
        assert.deepEqual(result, snapshot(original, true));
        assert.equal(result.functions.length, 27);
        assert.deepEqual(result.events, events);
        assert.deepEqual(result.timers, [{ callback: '', delay: 500 }]);
        assert.equal(JSON.parse(result.state).currentActiveWord, null);
    });
}
