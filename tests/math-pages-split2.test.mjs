// 수학 대문·각도 페이지 분리 규칙: 상대 경로·줄 상한·인라인 금지·로드·HTML 호출 함수 선언·즉시 실행 동작.
// 2026-11-14: 얼린 원본(tests/fixtures/math-split)과의 원문·마크업 통째 대조는 대문 카드 추가 같은 정상 수정마다 깨져 뺐다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { root, read, lineCount, assertLoadsInOrder, assertRelativeAssets, assertNoInlineStyleOrScript,
    assertInlineHandlersDeclared, resolveFrom } from './split-rules.mjs';

const pages = [
    ['math', 'math_lobby.css', 'math_lobby.js'],
    ['angles_concept', 'math_angles_concept.css', 'angles_concept.js']
];

for (const [name, cssName, jsName] of pages) {
    const htmlPath = `kids/subjects/math/${name}.html`;
    const html = read(htmlPath);
    const cssUrl = `../../css/${cssName}`;
    const scriptUrl = `./js/${jsName}`;
    const cssPath = path.join(root, resolveFrom(htmlPath, cssUrl));
    const jsPath = path.join(root, resolveFrom(htmlPath, scriptUrl));

    test(`${name}: 상대 경로 파일 실존·HTML·CSS·JS 모두 600줄 이하·버전 있는 태그 로드`, () => {
        assertRelativeAssets(htmlPath, 'style', [cssUrl]);
        assertRelativeAssets(htmlPath, 'script', [scriptUrl]);
        for (const file of [path.join(root, htmlPath), cssPath, jsPath]) {
            assert.ok(lineCount(fs.readFileSync(file, 'utf8')) <= 600, `600줄 초과: ${file}`);
        }
        assertLoadsInOrder(html, 'style', [cssUrl], name);
        assertLoadsInOrder(html, 'script', [scriptUrl], name);
    });

    test(`${name}: 인라인 style·script가 남지 않음`, () => {
        assertNoInlineStyleOrScript(html, name);
    });

    test(`${name}: HTML on* 속성이 부르는 함수가 모두 선언되어 있음`, () => {
        assertInlineHandlersDeclared(htmlPath);
    });

    test(`${name}: 다른 스크립트 없이 로드 및 기존 이벤트 등록 보존`, () => {
        const events = [];
        const buttonAccesses = [];
        const buttonEvents = [];
        const documentMock = {
            addEventListener(type, callback) {
                assert.equal(type, 'DOMContentLoaded');
                assert.equal(typeof callback, 'function');
                events.push(callback);
            }
        };

        // 대문은 원래 위치에서 이미 존재하는 버튼의 클릭 리스너를 즉시 등록한다.
        // 승인된 이 조회만 허용하고 그 밖의 초기 DOM 접근은 계속 거부한다.
        if (name === 'math') {
            documentMock.getElementById = id => {
                assert.equal(id, 'goLobbyBtn');
                buttonAccesses.push(id);
                return new Proxy({
                    addEventListener(type, callback) {
                        assert.equal(type, 'click');
                        assert.equal(typeof callback, 'function');
                        buttonEvents.push(callback);
                    }
                }, {
                    get(target, key) {
                        if (Object.hasOwn(target, key)) return target[key];
                        throw new Error(`허용하지 않은 버튼 접근: ${String(key)}`);
                    }
                });
            };
        }

        const sandbox = {
            window: {},
            document: new Proxy(documentMock, {
                get(target, key) {
                    if (Object.hasOwn(target, key)) return target[key];
                    throw new Error(`초기화 전 DOM 접근: ${String(key)}`);
                }
            })
        };
        vm.createContext(sandbox);
        vm.runInContext(fs.readFileSync(jsPath, 'utf8'), sandbox, { filename: jsPath });
        assert.equal(sandbox.window.currentSubject, '수학');
        assert.equal(events.length, 1, '초기화 이벤트는 한 번만 등록해야 함');
        assert.deepEqual(buttonAccesses, name === 'math' ? ['goLobbyBtn'] : []);
        assert.equal(buttonEvents.length, name === 'math' ? 1 : 0);
    });
}
