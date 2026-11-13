// 교재 이미지 체인저 분리 규칙: 상대 경로·줄 상한·인라인 금지·로드 순서·HTML 호출 함수·core 단독 실행.
// 2026-11-14: 얼린 원본(tests/fixtures/admin-image-changer-split)과의 원문·마크업·실행 결과 대조는 정상 수정마다 깨져 뺐다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { root, read, lineCount, assetTags, assertLoadsInOrder, assertRelativeAssets, assertNoInlineStyleOrScript,
    assertInlineHandlersDeclared, inlineHandlerNames, resolveFrom } from './split-rules.mjs';

const htmlPath = 'admin-image-changer.html';
const html = read(htmlPath);
const cssUrl = 'kids/css/admin_image_changer.css';
const scriptUrls = ['core', 'main'].map(part => `kids/js/admin_image_changer-${part}.js`);
const cssPath = path.join(root, resolveFrom(htmlPath, cssUrl));
const jsPaths = scriptUrls.map(url => path.join(root, resolveFrom(htmlPath, url)));
const jsSources = jsPaths.map(file => fs.readFileSync(file, 'utf8'));
const normalize = text => text.replace(/\r\n/g, '\n').replace(/[\t ]+$/gm, '').replace(/\n+$/, '');

test('이미지 체인저: 상대 경로 실존·HTML·CSS·JS 600줄 이하·config → core → main 순서', () => {
    for (const url of [cssUrl, ...scriptUrls]) assert.match(url, /^kids\//);
    assertRelativeAssets(htmlPath, 'style', [cssUrl]);
    assertRelativeAssets(htmlPath, 'script', scriptUrls);
    for (const file of [path.join(root, htmlPath), cssPath, ...jsPaths]) {
        assert.ok(lineCount(fs.readFileSync(file, 'utf8')) <= 600, `600줄 초과: ${file}`);
    }
    assertLoadsInOrder(html, 'style', [cssUrl]);
    assertLoadsInOrder(html, 'script', scriptUrls);
    assert.deepEqual(assetTags(html, 'script').map(tag => tag.url), ['kids/config.js', ...scriptUrls]);
});

test('이미지 체인저: 인라인 style·script가 남지 않음', () => {
    assertNoInlineStyleOrScript(html);
});

test('이미지 체인저: HTML on* 속성이 부르는 함수가 모두 선언되어 있음', () => {
    assertInlineHandlersDeclared(htmlPath);
});

// 등록은 기록만 하며, 초기화 전 DOM·저장소·통신·타이머 접근은 즉시 실패시킨다.
function createSandbox(config) {
    const events = [];
    const blocked = name => new Proxy({}, {
        get(target, key) { throw new Error(`초기화 전 접근: ${name}.${String(key)}`); }
    });
    const sandbox = {
        window: new Proxy({
            addEventListener(type, callback, options) {
                assert.equal(typeof callback, 'function');
                events.push({ target: 'window', type, callback, options });
            }
        }, {
            get(target, key) {
                if (key in target) return target[key];
                throw new Error(`초기화 전 접근: window.${String(key)}`);
            }
        }),
        document: blocked('document'),
        localStorage: blocked('localStorage'),
        fetch() { throw new Error('초기화 전 통신'); },
        setTimeout() { throw new Error('초기화 전 타이머'); }
    };
    if (config !== undefined) sandbox.APP_CONFIG = config;
    const initialKeys = new Set(Object.keys(sandbox));
    vm.createContext(sandbox);
    return {
        sandbox,
        events: () => events.map(event => ({
            target: event.target, type: event.type, options: event.options,
            callback: normalize(event.callback.toString())
        })),
        functions: () => Object.keys(sandbox)
            .filter(key => !initialKeys.has(key) && typeof sandbox[key] === 'function').sort()
    };
}

const configurations = [
    ['설정 없음', undefined],
    ['빈 설정', {}],
    ['설정 있음', {
        WORKER_PROXY_URL: 'https://mock.invalid',
        CURRICULUM_DB_ID: 'test-curriculum',
        VOCA_DB_ID: 'test-voca'
    }]
];

for (const [label, config] of configurations) {
    test(`이미지 체인저: ${label} core 단독 실행·main 뒤 이벤트 불변·HTML 호출 함수 실존`, () => {
        const split = createSandbox(config);
        vm.runInContext(jsSources[0], split.sandbox, { filename: jsPaths[0] });
        const coreEvents = split.events();
        assert.deepEqual(coreEvents.map(event => [event.target, event.type, event.options]), [
            ['window', 'DOMContentLoaded', undefined],
            ['window', 'dragover', false],
            ['window', 'drop', false]
        ]);
        assert.equal(typeof split.sandbox.toggleDrawer, 'undefined', 'core에 main 함수가 섞임');
        vm.runInContext(jsSources[1], split.sandbox, { filename: jsPaths[1] });
        assert.deepEqual(split.events(), coreEvents, 'main이 이벤트 등록을 변경함');
        const missing = inlineHandlerNames(html).filter(name => typeof split.sandbox[name] !== 'function');
        assert.deepEqual(missing, [], 'HTML이 부르는데 core+main 로드 뒤 없는 전역 함수');
    });
}
