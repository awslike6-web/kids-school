// 마이룸 분리: 고정 원본과 비교하여 코드·마크업·전역 함수·초기화 순서를 보존한다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const htmlPath = 'kids/common_space/my-room.html';
const html = read(htmlPath);
const fixture = JSON.parse(read('tests/fixtures/my-room-split/my-room.json'));
const version = '?v=20261031-room-split';
const cssHref = `./my-room.css${version}`;
const scriptSrcs = ['core', 'main'].map(part => `./my-room-${part}.js${version}`);
const cssTag = `<link rel="stylesheet" href="${cssHref}">`;
const scriptTags = scriptSrcs.map(src => `<script src="${src}"></script>`);
const newline = html.includes('\r\n') ? '\r\n' : '\n';
const resolveAsset = url => path.resolve(root, path.dirname(htmlPath), url.split('?')[0]);
const cssPath = resolveAsset(cssHref);
const jsPaths = scriptSrcs.map(resolveAsset);
const jsSources = jsPaths.map(file => fs.readFileSync(file, 'utf8'));

// 수학 분리 시험과 동일하게 줄바꿈 형식·줄 끝 공백·마지막 개행만 맞춘다.
const normalize = text => text.replace(/\r\n/g, '\n').replace(/[\t ]+$/gm, '').replace(/\n+$/, '');
const lineCount = text => text.split(/\r?\n/).length;

test('마이룸: 상대 경로 파일 실존 및 HTML·CSS·JS 600줄 이하', () => {
    for (const url of [cssHref, ...scriptSrcs]) assert.match(url, /^\.\//);
    for (const file of [path.join(root, htmlPath), cssPath, ...jsPaths]) {
        assert.ok(fs.existsSync(file), `파일 없음: ${file}`);
        assert.ok(lineCount(fs.readFileSync(file, 'utf8')) <= 600, `600줄 초과: ${file}`);
    }
    assert.ok(html.includes(cssTag), 'CSS 경로·버전 불일치');
    for (const tag of scriptTags) assert.ok(html.includes(tag), 'JS 경로·속성·버전 불일치');
});

test('마이룸: 인라인 style·script가 남지 않음', () => {
    assert.equal([...html.matchAll(/<style\b[^>]*>[\s\S]*?<\/style>/gi)].length, 0);
    for (const tag of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
        assert.match(tag[1], /\bsrc\s*=/i, '인라인 script가 남음');
        assert.equal(tag[2].trim(), '', '외부 script 태그 안에 코드가 남음');
    }
});

test('마이룸: CSS 및 core+main 원문이 고정 fixture와 일치', () => {
    assert.equal(fixture.source, `main:${htmlPath}`);
    assert.equal(fixture.styles.length, 1);
    assert.equal(fixture.scripts.length, 1);
    assert.equal(normalize(fs.readFileSync(cssPath, 'utf8')), normalize(fixture.styles[0]));
    assert.equal(normalize(jsSources.join('')), normalize(fixture.scripts[0]));
});

test('마이룸: 원래 위치·DOM·config → core → main 순서 보존', () => {
    const markup = html.replace(cssTag, '__MY_ROOM_SPLIT_STYLE__')
        .replace(scriptTags.join(newline), '__MY_ROOM_SPLIT_SCRIPT__');
    assert.equal(normalize(markup), normalize(fixture.markup));
    assert.deepEqual([...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*>/gi)].map(tag => tag[1]),
        ['../config.js', ...scriptSrcs]);
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
    const initialKeys = new Set(Object.keys(sandbox));
    vm.createContext(sandbox);
    return {
        sandbox, events, reads,
        functions: () => Object.keys(sandbox)
            .filter(key => !initialKeys.has(key) && typeof sandbox[key] === 'function').sort()
    };
}

for (const profile of [null, 'son', 'daughter']) {
    test(`마이룸: ${profile ?? '저장값 없음'} core 단독 실행 및 전역 함수·이벤트 보존`, () => {
        const split = createSandbox(profile);
        vm.runInContext(jsSources[0], split.sandbox, { filename: jsPaths[0] });
        assert.equal(split.events.length, 0, 'core가 먼저 초기화를 등록함');
        assert.deepEqual(split.reads, ['currentUser']);
        vm.runInContext(jsSources[1], split.sandbox, { filename: jsPaths[1] });

        const original = createSandbox(profile);
        vm.runInContext(fixture.scripts[0], original.sandbox, { filename: fixture.source });
        assert.ok(original.functions().length > 0, '원본 전역 함수가 없음');
        assert.deepEqual(split.functions(), original.functions(), '전역 함수 이름 변경');
        assert.deepEqual(split.reads, original.reads, '저장소 읽기 변경');
        assert.equal(split.events.length, 1, '초기화 이벤트는 한 번만 등록해야 함');
        assert.equal(original.events.length, 1);
        assert.equal(normalize(split.events[0].callback.toString()),
            normalize(original.events[0].callback.toString()), '초기화 콜백 변경');
    });
}
