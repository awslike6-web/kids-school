// 용어사전 분리 규칙: 머리 주석·줄 상한·구문 분석·HTML 로드·부분 실행·HTML 호출 함수·이벤트·타이머.
// 2026-11-14: 얼린 원본(tests/fixtures/voca-common-split)과의 459줄 경계 원문 대조, 분리 직전 HTML 해시,
// 실행 결과 대조, 전역 함수 개수·정확한 ?v= 값 고정은 정상 수정마다 깨져 뺐다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { root, read, lineCount, assertLoadsInOrder, assertInlineHandlersDeclared, inlineHandlersDeclaredIn } from './split-rules.mjs';

const files = ['kids/common_space/voca_common.js', 'kids/common_space/voca_modal.js'];
const sources = files.map(read);
const htmlPath = 'kids/common_space/voca.html';
const html = read(htmlPath);
const header = '// kids/common_space/voca_modal.js - voca_common.js 분리 2/2: 단어 모달·TTS·음성 입력·요정 코코 (voca_common.js 다음에 로드)';
const events = [
    { target: 'window', type: 'load', callback: '' },
    { target: 'window', type: 'beforeunload', callback: '' }
];

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

test('HTML은 상대 경로·같은 버전·클래식 스크립트로 지정 순서 로드한다', () => {
    // 두 태그 사이에는 안내 주석 한 줄이 있어 연속 검사 대신 순서·버전·1회만 본다.
    const urls = ['./voca_common.js', './voca_modal.js'];
    for (const url of urls) assertLoadsInOrder(html, 'script', [url], '용어사전');
    const [common, modal] = urls.map(url => html.indexOf(`src="${url}?`));
    assert.ok(common >= 0 && modal > common, 'voca_common.js 다음에 voca_modal.js');
    const versions = urls.map(url => html.match(new RegExp(`src="${url.replace('.', '\\.')}\\?v=([^"]+)"`))[1]);
    assert.equal(versions[0], versions[1], '두 태그 버전이 서로 다름');
    for (const file of files) assert.ok(fs.existsSync(path.join(root, file)));
});

test('HTML on* 속성이 부르는 함수가 모두 선언되어 있음', () => {
    assertInlineHandlersDeclared(htmlPath);
});

test('다른 운영 소스에 버전 없는 용어사전 JS 참조가 없다', () => {
    const walk = dir => fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(entry => {
        const file = path.join(dir, entry.name);
        return entry.isDirectory() ? walk(file) : /\.(?:html|js|mjs|cjs|css)$/.test(entry.name) ? [file] : [];
    });
    const rootFiles = fs.readdirSync(root).filter(file => /\.(?:html|js|mjs|cjs|css)$/.test(file));
    // system_map_generated.js는 조감도용 파일 이름 목록일 뿐 스크립트 참조가 아니다.
    for (const file of [...rootFiles, ...walk('kids'), ...walk('scripts')].filter(name => !name.endsWith('system_map_generated.js'))) {
        for (const match of read(file).matchAll(/voca_(?:common|modal)\.js([^"'<>\s]*)["']/g)) {
            assert.match(match[1], /^\?v=[^&]+$/, `${file}: 버전 누락`);
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
    vm.createContext(context);
    return { context, registered, timers };
}

const readState = (sb, extra = '') => JSON.parse(vm.runInContext(`JSON.stringify({WORKER_PROXY_URL,currentUser,
    currentUserName,currentTheme,currentSubject${extra}})`, sb.context));

for (const prefilled of [false, true]) {
    const mode = prefilled ? '민서·기존 전역 설정' : '민수·기본값';
    test(`${mode}: 첫 파일만 실행해도 뒤 파일 접근·DOM·네트워크 호출이 없다`, () => {
        const sb = sandbox(prefilled);
        assert.doesNotThrow(() => vm.runInContext(sources[0], sb.context, { filename: files[0] }));
        assert.deepEqual(sb.registered, events);
        assert.deepEqual(sb.timers, []);
        const state = readState(sb);
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

    test(`${mode}: 순차 실행 뒤 HTML 호출 함수·이벤트·타이머·초기 상태가 갖춰진다`, () => {
        const split = sandbox(prefilled);
        sources.forEach((source, index) => vm.runInContext(source, split.context, { filename: files[index] }));
        for (const name of ['openModal', 'closeModal', 'syncVoiceToggleBtnUi', 'askCocoFairy', 'manualSyncVocaData']) {
            assert.equal(typeof split.context[name], 'function', `공개 함수 누락: ${name}`);
        }
        const missing = inlineHandlersDeclaredIn(html, sources).filter(name => typeof split.context[name] !== 'function');
        assert.deepEqual(missing, [], 'HTML이 부르는데 로드 뒤 없는 전역 함수');
        assert.deepEqual(split.registered, events);
        assert.deepEqual(split.timers, [{ callback: '', delay: 500 }]);
        assert.equal(readState(split, ',currentActiveWord').currentActiveWord, null);
    });
}
