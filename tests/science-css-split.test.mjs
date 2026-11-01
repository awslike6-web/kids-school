// 과학방 CSS 분리: 원본 바이트·최상위 경계·HTML 로드 계약을 검사한다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readBytes = file => fs.readFileSync(path.join(root, file));
const read = file => readBytes(file).toString('utf8');
const files = ['kids/css/science.css', 'kids/css/science-units.css'];
const fixtureDir = 'tests/fixtures/science-css-split';
const fixture = read(`${fixtureDir}/science.css`);
const htmlPath = 'kids/subjects/science/science.html';
const html = read(htmlPath);
const originalHtml = read(`${fixtureDir}/science.html`);
const version = '?v=20261101-science-css-split';
const header = '/* kids/css/science-units.css - science.css 분리 2/2: 지문 요약·사진 뷰어·반응형·안전 게이트·단원 탭·실험실 칩 (science.css 다음에 로드) */';
const normalize = text => text.replace(/\r\n/g, '\n').replace(/[\t ]+$/gm, '').replace(/\n+$/, '');
const physicalLines = text => (text.match(/[^\n]*\n|[^\n]+$/g) ?? []).length;

test('400줄 경계·지정 머리 주석·원본 바이트와 마지막 개행 없음 보존', () => {
    const first = readBytes(files[0]);
    const second = readBytes(files[1]);
    const newline = second.indexOf(10);
    assert.ok(newline >= 0, '머리 주석 다음 개행 없음');
    assert.equal(second.subarray(0, newline).toString('utf8').replace(/\r$/, ''), header);
    const tail = second.subarray(newline + 1);
    const fixtureLines = fixture.match(/[^\n]*\n|[^\n]+$/g);
    assert.equal(fixtureLines.length, 800, '마지막 개행 없는 800줄 원본');
    assert.equal(first.toString('utf8'), fixtureLines.slice(0, 400).join(''));
    assert.equal(tail.toString('utf8'), fixtureLines.slice(400).join(''));
    assert.equal(normalize(first.toString('utf8') + tail), normalize(fixture));
    assert.deepEqual(Buffer.concat([first, tail]), readBytes(`${fixtureDir}/science.css`));
    assert.equal(second.at(-1), 125, '마지막 닫는 괄호 뒤 개행을 추가하지 않음');
    assert.equal(physicalLines(first.toString('utf8')), 400);
    assert.equal(physicalLines(second.toString('utf8')), 401);
});

for (const [index, file] of files.entries()) {
    test(`${file}: 실존·600줄 이하·독립 CSS 블록·@import 없음`, () => {
        assert.ok(fs.existsSync(path.join(root, file)));
        const source = read(file);
        assert.ok(source.split(/\r?\n/).length <= 600, '600줄 초과');
        const css = source.replace(/\/\*[\s\S]*?\*\//g, '');
        const opens = (css.match(/\{/g) ?? []).length;
        const closes = (css.match(/\}/g) ?? []).length;
        assert.equal(opens, closes);
        assert.equal(opens, index === 0 ? 61 : 50);
        let depth = 0;
        for (const brace of css.match(/[{}]/g) ?? []) {
            depth += brace === '{' ? 1 : -1;
            assert.ok(depth >= 0, '다른 파일의 블록을 이어 닫음');
        }
        assert.equal(depth, 0, '닫히지 않은 블록');
        assert.doesNotMatch(css, /@import\b/i);
    });
}

const expectedTags = files.map(file =>
    `<link rel="stylesheet" href="../../${file.slice('kids/'.length)}${version}">`);
const oldTag = '<link rel="stylesheet" href="../../css/science.css">';

test('HTML 상대 경로 실존·동일 버전·지정 순서로 연속 1회 로드', () => {
    const tags = [...html.matchAll(/<link\b[^>]*\bhref=["'][^"']*science(?:-units)?\.css[^"']*["'][^>]*>/g)];
    assert.deepEqual(tags.map(match => match[0]), expectedTags);
    const block = html.slice(tags[0].index, tags[1].index + tags[1][0].length);
    assert.match(block, /^[^\r\n]+\r?\n<[^\r\n]+>$/);
    assert.equal(block.replace(/>\s+</g, '><'), expectedTags.join(''));
    assert.ok(tags[0].index > html.indexOf('<head>'));
    assert.equal(html.slice(tags[1].index + tags[1][0].length, html.indexOf('</head>')).trim(), '');
    for (const file of files) {
        const href = `../../${file.slice('kids/'.length)}`;
        assert.ok(fs.existsSync(path.resolve(root, path.dirname(htmlPath), href)));
    }
});

test('두 CSS 링크 외 HTML은 고정 fixture와 바이트까지 같다', () => {
    assert.equal(originalHtml.split(oldTag).length, 2, '원본 링크는 1개');
    const newline = originalHtml.includes('\r\n') ? '\r\n' : '\n';
    const expectedHtml = originalHtml.replace(oldTag, expectedTags.join(newline));
    assert.deepEqual(readBytes(htmlPath), Buffer.from(expectedHtml));
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
        for (const match of source.matchAll(/science(?:-units)?\.css\?[^"'<>\s]+/g)) {
            refs.push([file.replace(/\\/g, '/'), match[0]]);
        }
    }
    assert.deepEqual(refs, [
        [htmlPath, `science.css${version}`],
        [htmlPath, `science-units.css${version}`]
    ]);
});
