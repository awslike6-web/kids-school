// 수학 대문·각도 페이지 분리: 원문·마크업·로드 순서와 즉시 실행 동작을 보존한다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const version = '?v=20261031-math-split2';
const pages = [
    ['math', 'math_lobby.css', 'math_lobby.js'],
    ['angles_concept', 'math_angles_concept.css', 'angles_concept.js']
];

// 1차 시험과 같이 줄바꿈 형식·줄 끝 공백·마지막 개행만 비교 시 맞춘다.
const normalize = text => text.replace(/\r\n/g, '\n').replace(/[\t ]+$/gm, '').replace(/\n+$/, '');
const lineCount = text => text.split(/\r?\n/).length;

for (const [name, cssName, jsName] of pages) {
    const htmlPath = `kids/subjects/math/${name}.html`;
    const html = read(htmlPath);
    const fixture = JSON.parse(read(`tests/fixtures/math-split/${name}.json`));
    const cssHref = `../../css/${cssName}${version}`;
    const scriptSrc = `./js/${jsName}${version}`;
    const cssTag = `<link rel="stylesheet" href="${cssHref}">`;
    const scriptTag = `<script src="${scriptSrc}"></script>`;
    const resolveAsset = url => path.resolve(root, path.dirname(htmlPath), url.split('?')[0]);
    const cssPath = resolveAsset(cssHref);
    const jsPath = resolveAsset(scriptSrc);

    test(`${name}: 상대 경로 파일 실존 및 HTML·CSS·JS 모두 600줄 이하`, () => {
        for (const file of [path.join(root, htmlPath), cssPath, jsPath]) {
            assert.ok(fs.existsSync(file), `파일 없음: ${file}`);
            assert.ok(lineCount(fs.readFileSync(file, 'utf8')) <= 600, `600줄 초과: ${file}`);
        }
        assert.ok(html.includes(cssTag), 'CSS 경로·버전 불일치');
        assert.ok(html.includes(scriptTag), 'JS 경로·속성·버전 불일치');
    });

    test(`${name}: 인라인 style·script가 남지 않음`, () => {
        assert.equal([...html.matchAll(/<style\b[^>]*>[\s\S]*?<\/style>/gi)].length, 0);
        for (const tag of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
            assert.match(tag[1], /\bsrc\s*=/i, '인라인 script가 남음');
            assert.equal(tag[2].trim(), '', '외부 script 태그 안에 코드가 남음');
        }
    });

    test(`${name}: 분리 CSS·JS 원문이 고정 fixture와 일치`, () => {
        assert.equal(fixture.source, `main:${htmlPath}`);
        assert.equal(fixture.styles.length, 1);
        assert.equal(fixture.scripts.length, 1);
        assert.equal(normalize(fs.readFileSync(cssPath, 'utf8')), normalize(fixture.styles[0]));
        assert.equal(normalize(fs.readFileSync(jsPath, 'utf8')), normalize(fixture.scripts[0]));
    });

    test(`${name}: 원래 위치·DOM·기존 외부 script 순서 보존`, () => {
        const markup = html.replace(cssTag, '__MATH_SPLIT_STYLE__')
            .replace(scriptTag, '__MATH_SPLIT_SCRIPT__');
        assert.equal(normalize(markup), normalize(fixture.markup));
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
