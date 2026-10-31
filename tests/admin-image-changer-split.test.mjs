// 교재 이미지 체인저 분리: 고정 원문·마크업·전역 함수·이벤트를 보존한다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const htmlPath = 'admin-image-changer.html';
const html = read(htmlPath);
const fixture = JSON.parse(read('tests/fixtures/admin-image-changer-split/admin-image-changer.json'));
const version = '?v=20261031-admin-split';
const cssHref = `kids/css/admin_image_changer.css${version}`;
const scriptSrcs = ['core', 'main'].map(part => `kids/js/admin_image_changer-${part}.js${version}`);
const cssTag = `<link rel="stylesheet" href="${cssHref}">`;
const scriptTags = scriptSrcs.map(src => `<script src="${src}"></script>`);
const newline = html.includes('\r\n') ? '\r\n' : '\n';
const resolveAsset = url => path.resolve(root, path.dirname(htmlPath), url.split('?')[0]);
const cssPath = resolveAsset(cssHref);
const jsPaths = scriptSrcs.map(resolveAsset);
const jsSources = jsPaths.map(file => fs.readFileSync(file, 'utf8'));

// 앞선 수학·마이룸 분리와 같은 정규화 기준을 사용한다.
const normalize = text => text.replace(/\r\n/g, '\n').replace(/[\t ]+$/gm, '').replace(/\n+$/, '');
const lineCount = text => text.split(/\r?\n/).length;

test('이미지 체인저: 상대 경로 실존 및 HTML·CSS·JS 600줄 이하', () => {
    for (const url of [cssHref, ...scriptSrcs]) assert.match(url, /^kids\//);
    for (const file of [path.join(root, htmlPath), cssPath, ...jsPaths]) {
        assert.ok(fs.existsSync(file), `파일 없음: ${file}`);
        assert.ok(lineCount(fs.readFileSync(file, 'utf8')) <= 600, `600줄 초과: ${file}`);
    }
    assert.ok(html.includes(cssTag), 'CSS 경로·버전 불일치');
    for (const tag of scriptTags) assert.ok(html.includes(tag), 'JS 경로·속성·버전 불일치');
});

test('이미지 체인저: 인라인 style·script가 남지 않음', () => {
    assert.equal([...html.matchAll(/<style\b[^>]*>[\s\S]*?<\/style>/gi)].length, 0);
    for (const tag of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
        assert.match(tag[1], /\bsrc\s*=/i, '인라인 script가 남음');
        assert.equal(tag[2].trim(), '', '외부 script 태그 안에 코드가 남음');
    }
});

test('이미지 체인저: CSS 및 core+main 원문이 고정 fixture와 일치', () => {
    assert.equal(fixture.source, `main:${htmlPath}`);
    assert.equal(fixture.styles.length, 1);
    assert.equal(fixture.scripts.length, 1);
    assert.equal(normalize(fs.readFileSync(cssPath, 'utf8')), normalize(fixture.styles[0]));
    assert.equal(normalize(jsSources.join('')), normalize(fixture.scripts[0]));
});

test('이미지 체인저: 원래 위치·DOM·config → core → main 순서 보존', () => {
    const markup = html.replace(cssTag, '__ADMIN_IMAGE_CHANGER_SPLIT_STYLE__')
        .replace(scriptTags.join(newline), '__ADMIN_IMAGE_CHANGER_SPLIT_SCRIPT__');
    assert.equal(normalize(markup), normalize(fixture.markup));
    assert.deepEqual([...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*>/gi)].map(tag => tag[1]),
        ['kids/config.js', ...scriptSrcs]);
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
    test(`이미지 체인저: ${label} core 단독 실행 및 전역 함수·이벤트 보존`, () => {
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

        const original = createSandbox(config);
        vm.runInContext(fixture.scripts[0], original.sandbox, { filename: fixture.source });
        assert.equal(original.functions().length, 31, '원본 전역 함수 수 변경');
        assert.deepEqual(split.functions(), original.functions(), '전역 함수 이름 변경');
        assert.deepEqual(split.events(), coreEvents, 'main이 이벤트 등록을 변경함');
        assert.deepEqual(split.events(), original.events(), '이벤트 대상·순서·콜백·옵션 변경');
    });
}
