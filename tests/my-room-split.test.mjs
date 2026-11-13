// 마이룸 분리 규칙: 상대 경로·줄 상한·인라인 금지·로드 순서·HTML 호출 함수·core 단독 실행·초기화 1회.
// 2026-11-14: 얼린 원본(tests/fixtures/my-room-split)과의 원문·마크업·실행 결과 대조는 정상 수정마다 깨져 뺐다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { root, read, lineCount, assetTags, assertLoadsInOrder, assertRelativeAssets, assertNoInlineStyleOrScript,
    assertInlineHandlersDeclared, inlineHandlerNames, resolveFrom } from './split-rules.mjs';

const htmlPath = 'kids/common_space/my-room.html';
const html = read(htmlPath);
const cssUrl = './my-room.css';
const scriptUrls = ['core', 'main'].map(part => `./my-room-${part}.js`);
const cssPath = path.join(root, resolveFrom(htmlPath, cssUrl));
const jsPaths = scriptUrls.map(url => path.join(root, resolveFrom(htmlPath, url)));
const jsSources = jsPaths.map(file => fs.readFileSync(file, 'utf8'));

test('마이룸: 상대 경로 파일 실존·HTML·CSS·JS 600줄 이하·config → core → main 순서', () => {
    for (const url of [cssUrl, ...scriptUrls]) assert.match(url, /^\.\//);
    assertRelativeAssets(htmlPath, 'style', [cssUrl]);
    assertRelativeAssets(htmlPath, 'script', scriptUrls);
    for (const file of [path.join(root, htmlPath), cssPath, ...jsPaths]) {
        assert.ok(lineCount(fs.readFileSync(file, 'utf8')) <= 600, `600줄 초과: ${file}`);
    }
    assertLoadsInOrder(html, 'style', [cssUrl]);
    assertLoadsInOrder(html, 'script', scriptUrls);
    assert.deepEqual(assetTags(html, 'script').map(tag => tag.url), ['../config.js', ...scriptUrls]);
});

test('마이룸: 인라인 style·script가 남지 않음', () => {
    assertNoInlineStyleOrScript(html);
});

test('마이룸: HTML on* 속성이 부르는 함수가 모두 선언되어 있음', () => {
    assertInlineHandlersDeclared(htmlPath);
});

// 이벤트는 등록만 기록하고, 초기화 전 DOM·통신·저장 접근은 실패시킨다.
function createSandbox(profile) {
    const events = [];
    const reads = [];
    const register = (type, callback) => {
        assert.equal(type, 'DOMContentLoaded');
        assert.equal(typeof callback, 'function');
        events.push({ type, callback });
    };
    const blocked = name => new Proxy({}, {
        get(target, key) {
            throw new Error(`초기화 전 접근: ${name}.${String(key)}`);
        }
    });
    const sandbox = {
        window: new Proxy({ addEventListener: register }, {
            get(target, key) {
                if (key in target) return target[key];
                throw new Error(`초기화 전 접근: window.${String(key)}`);
            }
        }),
        document: blocked('document'),
        localStorage: {
            getItem(key) {
                reads.push(key);
                assert.equal(key, 'currentUser');
                return profile;
            },
            setItem() { throw new Error('초기화 전 저장'); },
            removeItem() { throw new Error('초기화 전 삭제'); }
        },
        fetch() { throw new Error('초기화 전 통신'); }
    };
    vm.createContext(sandbox);
    return { sandbox, events, reads };
}

for (const profile of [null, 'son', 'daughter']) {
    test(`마이룸: ${profile ?? '저장값 없음'} core 단독 실행·초기화 1회·HTML 호출 함수 실존`, () => {
        const split = createSandbox(profile);
        vm.runInContext(jsSources[0], split.sandbox, { filename: jsPaths[0] });
        assert.equal(split.events.length, 0, 'core가 먼저 초기화를 등록함');
        assert.deepEqual(split.reads, ['currentUser']);
        vm.runInContext(jsSources[1], split.sandbox, { filename: jsPaths[1] });
        assert.deepEqual(split.reads, ['currentUser'], 'main 로드 중 추가 저장소 읽기');
        assert.equal(split.events.length, 1, '초기화 이벤트는 한 번만 등록해야 함');
        const missing = inlineHandlerNames(html).filter(name => typeof split.sandbox[name] !== 'function');
        assert.deepEqual(missing, [], 'HTML이 부르는데 core+main 로드 뒤 없는 전역 함수');
    });
}
