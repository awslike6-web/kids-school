// 수학 페이지 분리: 고정 main 원본과 비교하여 코드·마크업·실행 순서를 보존한다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const version = '?v=20261031-split';
const pages = [
    ['fractions_multiplication', 'math_fractions_multiplication.css', true],
    ['fractions_training', 'math_fractions_training.css', true],
    ['math_operator_studio', 'math_operator_studio.css', true],
    ['ranges_estimation', 'math_ranges_estimation.css', true],
    ['length_time', 'math_length_time.css', false]
];

// 줄바꿈 형식·줄 끝 공백·마지막 개행만 비교 시 맞춘다. 코드 내부 공백은 보존한다.
const normalize = text => text.replace(/\r\n/g, '\n').replace(/[\t ]+$/gm, '').replace(/\n+$/, '');
const lineCount = text => text.split(/\r?\n/).length;

for (const [name, cssName, split] of pages) {
    const htmlPath = `kids/subjects/math/${name}.html`;
    const html = read(htmlPath);
    const fixture = JSON.parse(read(`tests/fixtures/math-split/${name}.json`));
    const jsNames = split ? [`${name}-core.js`, `${name}-main.js`] : [`${name}.js`];
    const cssHref = `../../css/${cssName}${version}`;
    const scriptSrcs = jsNames.map(file => `./js/${file}${version}`);
    const cssTag = `<link rel="stylesheet" href="${cssHref}">`;
    const scriptTags = scriptSrcs.map(src => `<script src="${src}"></script>`);
    const newline = html.includes('\r\n') ? '\r\n' : '\n';
    const resolveAsset = url => path.resolve(root, path.dirname(htmlPath), url.split('?')[0]);
    const cssPath = resolveAsset(cssHref);
    const jsPaths = scriptSrcs.map(resolveAsset);

    test(`${name}: 상대 경로 파일 실존 및 HTML·CSS·JS 800줄 미만`, () => {
        for (const file of [path.join(root, htmlPath), cssPath, ...jsPaths]) {
            assert.ok(fs.existsSync(file), `파일 없음: ${file}`);
            assert.ok(lineCount(fs.readFileSync(file, 'utf8')) < 800, `800줄 이상: ${file}`);
        }
        for (const file of jsPaths) {
            assert.ok(lineCount(fs.readFileSync(file, 'utf8')) <= 600, `JS 600줄 초과: ${file}`);
        }
        assert.ok(html.includes(cssTag), 'CSS 경로·버전 불일치');
        for (const tag of scriptTags) assert.ok(html.includes(tag), 'JS 경로·속성·버전 불일치');
    });

    test(`${name}: 인라인 style·script가 남지 않음`, () => {
        assert.equal([...html.matchAll(/<style\b[^>]*>[\s\S]*?<\/style>/gi)].length, 0);
        for (const tag of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
            assert.match(tag[1], /\bsrc\s*=/i, '인라인 script가 남음');
            assert.equal(tag[2].trim(), '', '외부 script 태그 안에 코드가 남음');
        }
    });

    test(`${name}: 분리 원문을 로드 순서대로 연결하면 고정 fixture와 일치`, () => {
        assert.equal(fixture.source, `main:${htmlPath}`);
        assert.equal(fixture.styles.length, 1);
        assert.equal(fixture.scripts.length, 1);
        assert.equal(normalize(fs.readFileSync(cssPath, 'utf8')), normalize(fixture.styles[0]));
        const joined = jsPaths.map(file => fs.readFileSync(file, 'utf8')).join('');
        assert.equal(normalize(joined), normalize(fixture.scripts[0]));
    });

    test(`${name}: 원래 위치·DOM·기존 외부 script 순서 보존`, () => {
        const markup = html.replace(cssTag, '__MATH_SPLIT_STYLE__')
            .replace(scriptTags.join(newline), '__MATH_SPLIT_SCRIPT__');
        assert.equal(normalize(markup), normalize(fixture.markup));
    });

    test(`${name}: 뒤 파일 없이 core 실행 가능 및 이벤트 전 DOM 접근 없음`, () => {
        const events = [];
        const register = (type, callback) => {
            assert.equal(type, 'DOMContentLoaded');
            assert.equal(typeof callback, 'function');
            events.push(callback);
        };
        const sandbox = {
            window: { AudioContext: class {}, webkitAudioContext: class {}, addEventListener: register },
            localStorage: { getItem: () => null },
            document: new Proxy({ addEventListener: register }, {
                get(target, key) {
                    if (key in target) return target[key];
                    throw new Error(`초기화 전 DOM 접근: ${String(key)}`);
                }
            })
        };
        vm.createContext(sandbox);
        for (const [index, file] of jsPaths.entries()) {
            vm.runInContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: file });
            if (split && index === 0) assert.equal(events.length, 0, 'core가 먼저 초기화를 등록함');
        }
        assert.equal(events.length, 1, '초기화 이벤트는 한 번만 등록해야 함');
    });
}
