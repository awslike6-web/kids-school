// 과학방 CSS 분리 규칙: 머리 주석·줄 상한·독립 블록·HTML 로드 계약·옛 참조 없음.
// 2026-11-14: 얼린 원본(tests/fixtures/science-css-split)과의 원문·HTML 바이트 대조, 블록 개수 고정은
// 정상 수정마다 깨져 뺐다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { root, read, lineCount, assertLoadsInOrder, assertRelativeAssets } from './split-rules.mjs';

const files = ['kids/css/science.css', 'kids/css/science-units.css'];
const htmlPath = 'kids/subjects/science/science.html';
const html = read(htmlPath);
const header = '/* kids/css/science-units.css - science.css 분리 2/2: 지문 요약·사진 뷰어·반응형·안전 게이트·단원 탭·실험실 칩 (science.css 다음에 로드) */';
const hrefs = files.map(file => `../../${file.slice('kids/'.length)}`);

test('science-units.css는 지정 머리 주석으로 시작한다', () => {
    const second = read(files[1]);
    const newline = second.indexOf('\n');
    assert.ok(newline >= 0, '머리 주석 다음 개행 없음');
    assert.equal(second.slice(0, newline).replace(/\r$/, ''), header);
});

for (const file of files) {
    test(`${file}: 실존·600줄 이하·독립 CSS 블록·@import 없음`, () => {
        assert.ok(fs.existsSync(path.join(root, file)));
        const source = read(file);
        assert.ok(lineCount(source) <= 600, '600줄 초과');
        const css = source.replace(/\/\*[\s\S]*?\*\//g, '');
        assert.equal((css.match(/\{/g) ?? []).length, (css.match(/\}/g) ?? []).length);
        let depth = 0;
        for (const brace of css.match(/[{}]/g) ?? []) {
            depth += brace === '{' ? 1 : -1;
            assert.ok(depth >= 0, '다른 파일의 블록을 이어 닫음');
        }
        assert.equal(depth, 0, '닫히지 않은 블록');
        assert.doesNotMatch(css, /@import\b/i);
    });
}

test('HTML 상대 경로 실존·같은 버전·지정 순서로 head 안에서 연속 1회 로드', () => {
    assertRelativeAssets(htmlPath, 'style', hrefs);
    const [first, second] = assertLoadsInOrder(html, 'style', hrefs, '과학방 CSS');
    assert.ok(first.start > html.indexOf('<head>'));
    assert.ok(second.end < html.indexOf('</head>'));
});

test('운영 소스의 과학방 CSS 로드는 이 HTML의 버전 있는 링크 2개뿐이다', () => {
    const sourceFile = name => /\.(?:html|js|mjs|cjs|css)$/.test(name);
    const walk = dir => fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(entry => {
        const file = path.join(dir, entry.name);
        return entry.isDirectory() ? walk(file) : sourceFile(entry.name) ? [file] : [];
    });
    const rootFiles = fs.readdirSync(root).filter(name =>
        sourceFile(name) && fs.statSync(path.join(root, name)).isFile());
    const refs = [];
    for (const file of [...rootFiles, ...walk('kids'), ...walk('scripts')]) {
        const source = read(file).replace(/\/\*[\s\S]*?\*\//g, '');
        assert.doesNotMatch(source, /science(?:-units)?\.css(?:#[^"'<>\s]*)?["']/,
            `${file}: 버전 없는 옛 참조`);
        for (const match of source.matchAll(/(science(?:-units)?\.css)\?[^"'<>\s]+/g)) {
            refs.push([file.replace(/\\/g, '/'), match[1]]);
        }
    }
    assert.deepEqual(refs, [[htmlPath, 'science.css'], [htmlPath, 'science-units.css']]);
});
