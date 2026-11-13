// 과학 실험실 분리 규칙: 상대 경로·줄 상한·인라인 금지·로드·HTML 호출 함수 선언·승인된 초기 DOM 접근.
// 2026-11-14: 얼린 원본(tests/fixtures/science-labs-split)과의 원문·마크업 통째 대조는 정상 수정마다 깨져 뺐다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { root, read, lineCount, assertLoadsInOrder, assertRelativeAssets, assertNoInlineStyleOrScript,
    assertInlineHandlersDeclared, resolveFrom } from './split-rules.mjs';

const pages = [
    ['science_season_airmass_lab', ['switchMode', 'selectAirmass', 'setSeason', 'highlightMatrix', 'nextQuiz', 'closeRewardModal']],
    ['science_cloud_lab', ['setSmokeMode', 'pressPump', 'openCap', 'startSqueeze', 'endSqueeze', 'showZoom', 'resetExperiment', 'clearBlank', 'selectAnswer', 'closeZoom']],
    ['science_wind_lab', ['switchLabMode', 'toggleLamp', 'resetHeat', 'setWindTime', 'clearBlank', 'selectAnswer']]
];

const deny = label => new Proxy({}, {
    get(target, key) { throw new Error(`허용하지 않은 ${label} 읽기: ${String(key)}`); },
    set(target, key) { throw new Error(`허용하지 않은 ${label} 쓰기: ${String(key)}`); }
});

for (const [name, globalFunctions] of pages) {
    const htmlPath = `kids/subjects/science/${name}.html`;
    const html = read(htmlPath);
    const cssUrl = `../../css/${name}.css`;
    const scriptUrl = `./js/${name}.js`;
    const cssPath = path.join(root, resolveFrom(htmlPath, cssUrl));
    const jsPath = path.join(root, resolveFrom(htmlPath, scriptUrl));

    test(`${name}: 상대 경로 실존·HTML·CSS·JS 모두 600줄 이하·버전 있는 태그 로드`, () => {
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

    test(`${name}: 다른 스크립트 없이 승인된 초기 접근·이벤트·전역 함수 보존`, () => {
        const isCloud = name === 'science_cloud_lab';
        const isSeason = name === 'science_season_airmass_lab';
        for (const savedGems of [null, '17']) {
            const storageReads = [];
            const domReads = [];
            const gemWrites = [];
            const canvasReads = [];
            const events = [];
            const gem = new Proxy({}, {
                get(target, key) { throw new Error(`허용하지 않은 gemCount 읽기: ${String(key)}`); },
                set(target, key, value) {
                    assert.equal(key, 'textContent');
                    gemWrites.push(value);
                    return true;
                }
            });
            const context = deny('캔버스 컨텍스트');
            const canvas = new Proxy({}, {
                get(target, key) {
                    assert.equal(key, 'getContext');
                    return type => {
                        assert.equal(type, '2d');
                        canvasReads.push(type);
                        return context;
                    };
                },
                set(target, key) { throw new Error(`허용하지 않은 canvas 쓰기: ${String(key)}`); }
            });
            const documentMock = {
                getElementById(id) {
                    assert.ok(id === 'gemCount' || (isCloud && id === 'cloudCanvas'), `허용하지 않은 DOM 조회: ${id}`);
                    domReads.push(id);
                    return id === 'gemCount' ? gem : canvas;
                }
            };
            if (isSeason) {
                documentMock.addEventListener = (type, callback) => {
                    assert.equal(type, 'DOMContentLoaded');
                    assert.equal(typeof callback, 'function');
                    events.push(callback);
                };
            }
            const storageMock = {
                getItem(key) {
                    assert.equal(key, 'min_science_gems');
                    storageReads.push(key);
                    return savedGems;
                }
            };
            const restrict = (target, label) => new Proxy(target, {
                get(object, key) {
                    if (Object.hasOwn(object, key)) return object[key];
                    throw new Error(`허용하지 않은 ${label} 읽기: ${String(key)}`);
                },
                set(object, key) { throw new Error(`허용하지 않은 ${label} 쓰기: ${String(key)}`); }
            });
            const sandbox = {
                window: deny('window'),
                document: restrict(documentMock, 'document'),
                localStorage: restrict(storageMock, 'localStorage')
            };
            vm.createContext(sandbox);
            vm.runInContext(fs.readFileSync(jsPath, 'utf8'), sandbox, { filename: jsPath, timeout: 1000 });
            assert.deepEqual(storageReads, ['min_science_gems']);
            assert.deepEqual(domReads, isCloud ? ['gemCount', 'cloudCanvas'] : ['gemCount']);
            assert.deepEqual(gemWrites, [savedGems === null ? 0 : 17]);
            assert.deepEqual(canvasReads, isCloud ? ['2d'] : []);
            assert.equal(events.length, isSeason ? 1 : 0);
            for (const fn of globalFunctions) assert.equal(typeof sandbox[fn], 'function', `전역 함수 누락: ${fn}`);
        }
    });
}
