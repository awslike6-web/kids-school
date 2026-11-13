// 수학 페이지 분리 규칙: 상대 경로·줄 상한·인라인 금지·로드 순서·HTML 호출 함수 선언·core 단독 실행.
// 2026-11-14: 얼린 원본(tests/fixtures/math-split)과의 원문·마크업 통째 대조는 정상 수정마다 깨져 뺐다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { root, read, lineCount, assertLoadsInOrder, assertRelativeAssets, assertNoInlineStyleOrScript,
    assertInlineHandlersDeclared, resolveFrom } from './split-rules.mjs';

const pages = [
    ['fractions_multiplication', 'math_fractions_multiplication.css', true],
    ['fractions_training', 'math_fractions_training.css', true],
    ['math_operator_studio', 'math_operator_studio.css', ['math_operator_studio-plans.js', 'math_operator_studio-core.js', 'math_operator_studio-blocks.js', 'math_operator_studio-numberline.js', 'math_operator_studio-main.js']],
    ['ranges_estimation', 'math_ranges_estimation.css', true],
    ['length_time', 'math_length_time.css', false]
];

for (const [name, cssName, split] of pages) {
    const htmlPath = `kids/subjects/math/${name}.html`;
    const html = read(htmlPath);
    const jsNames = Array.isArray(split) ? split : (split ? [`${name}-core.js`, `${name}-main.js`] : [`${name}.js`]);
    const cssUrl = `../../css/${cssName}`;
    const scriptUrls = jsNames.map(file => `./js/${file}`);
    const cssPath = path.join(root, resolveFrom(htmlPath, cssUrl));
    const jsPaths = scriptUrls.map(url => path.join(root, resolveFrom(htmlPath, url)));

    test(`${name}: 상대 경로 파일 실존·줄 상한(HTML·CSS 800줄 미만, JS 600줄 이하)·지정 순서 로드`, () => {
        assertRelativeAssets(htmlPath, 'style', [cssUrl]);
        assertRelativeAssets(htmlPath, 'script', scriptUrls);
        for (const file of [path.join(root, htmlPath), cssPath, ...jsPaths]) {
            assert.ok(lineCount(fs.readFileSync(file, 'utf8')) < 800, `800줄 이상: ${file}`);
        }
        for (const file of jsPaths) {
            assert.ok(lineCount(fs.readFileSync(file, 'utf8')) <= 600, `JS 600줄 초과: ${file}`);
        }
        assertLoadsInOrder(html, 'style', [cssUrl], name);
        assertLoadsInOrder(html, 'script', scriptUrls, name);
    });

    test(`${name}: 인라인 style·script가 남지 않음`, () => {
        assertNoInlineStyleOrScript(html, name);
    });

    test(`${name}: HTML on* 속성이 부르는 함수가 모두 선언되어 있음`, () => {
        assertInlineHandlersDeclared(htmlPath);
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
            if (split && index < jsPaths.length - 1) assert.equal(events.length, 0, '마지막 파일 전에는 초기화를 등록하지 않음');
        }
        assert.equal(events.length, 1, '초기화 이벤트는 한 번만 등록해야 함');
    });
}
