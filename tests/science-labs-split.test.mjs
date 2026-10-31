// 과학 실험실 분리: 원문·마크업·로드 순서와 승인된 초기 DOM 접근을 보존한다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const version = '?v=20261031-science-split';
const pages = [
    ['science_season_airmass_lab', ['switchMode', 'selectAirmass', 'setSeason', 'highlightMatrix', 'nextQuiz', 'closeRewardModal']],
    ['science_cloud_lab', ['setSmokeMode', 'pressPump', 'openCap', 'startSqueeze', 'endSqueeze', 'showZoom', 'resetExperiment', 'clearBlank', 'selectAnswer', 'closeZoom']],
    ['science_wind_lab', ['switchLabMode', 'toggleLamp', 'resetHeat', 'setWindTime', 'clearBlank', 'selectAnswer']]
];

// 수학 선행 시험과 같은 정규화이며 파일을 옮길 때는 원문을 그대로 보존한다.
const normalize = text => text.replace(/\r\n/g, '\n').replace(/[\t ]+$/gm, '').replace(/\n+$/, '');
const lineCount = text => text.split(/\r?\n/).length;
const deny = label => new Proxy({}, {
    get(target, key) { throw new Error(`허용하지 않은 ${label} 읽기: ${String(key)}`); },
    set(target, key) { throw new Error(`허용하지 않은 ${label} 쓰기: ${String(key)}`); }
});

for (const [name, globalFunctions] of pages) {
    const htmlPath = `kids/subjects/science/${name}.html`;
    const html = read(htmlPath);
    const fixture = JSON.parse(read(`tests/fixtures/science-labs-split/${name}.json`));
    const cssHref = `../../css/${name}.css${version}`;
    const scriptSrc = `./js/${name}.js${version}`;
    const cssTag = `<link rel="stylesheet" href="${cssHref}">`;
    const scriptTag = `<script src="${scriptSrc}"></script>`;
    const resolveAsset = url => path.resolve(root, path.dirname(htmlPath), url.split('?')[0]);
    const cssPath = resolveAsset(cssHref);
    const jsPath = resolveAsset(scriptSrc);

    test(`${name}: 상대 경로 실존 및 HTML·CSS·JS 모두 600줄 이하`, () => {
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
        const markup = html.replace(cssTag, '__SCIENCE_SPLIT_STYLE__')
            .replace(scriptTag, '__SCIENCE_SPLIT_SCRIPT__');
        assert.equal(normalize(markup), normalize(fixture.markup));
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
