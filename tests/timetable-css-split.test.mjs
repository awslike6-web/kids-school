// 시간표 CSS 분리: 고정 원본과 로드 순서·파일 경계를 검사한다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const htmlPath = 'timetable.html';
const html = read(htmlPath);
const version = '?v=20261031-timetable-css-split';
const parts = ['timetable.css', 'timetable-overlay.css'];

// 수학 분리 시험과 동일: 줄바꿈 형식·줄 끝 공백·마지막 개행만 맞춘다.
const normalize = text => text.replace(/\r\n/g, '\n').replace(/[\t ]+$/gm, '').replace(/\n+$/, '');
const lineCount = text => text.split(/\r?\n/).length;
const attribute = (tag, name) => tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, 'i'))?.[2];
const links = [...html.matchAll(/<link\b[^>]*>/gi)].map(match => ({
    tag: match[0],
    href: attribute(match[0], 'href') ?? '',
    index: match.index
}));
const timetableLinks = links.filter(link => /(?:^|\/)timetable(?:-[^/?#]+)?\.css(?:[?#]|$)/i.test(link.href));
const assetPath = href => path.resolve(root, path.dirname(htmlPath), href.split('?')[0]);

function payload(source, name) {
    if (name === 'timetable.css') return source;
    const newline = source.indexOf('\n');
    assert.ok(newline >= 0, `${name}: 머리 주석 다음 개행 없음`);
    assert.equal(source.slice(0, newline).replace(/\r$/, ''),
        "/* kids/css/timetable-overlay.css - timetable.css 분리 2/2: 이벤트 오버레이·모달·툴팁·모바일 (timetable.css 다음에 로드) */",
        `${name}: 머리 주석 형식 불일치`);
    return source.slice(newline + 1);
}

test('시간표 CSS: 상대 경로 링크 2개의 파일명·로드 순서·버전·실존', () => {
    assert.deepEqual(timetableLinks.map(link => link.href), parts.map(name => `kids/css/${name}${version}`));
    for (const link of timetableLinks) {
        assert.equal(attribute(link.tag, 'rel'), 'stylesheet');
        assert.equal(path.dirname(assetPath(link.href)), path.join(root, 'kids', 'css'));
        assert.ok(fs.existsSync(assetPath(link.href)), `파일 없음: ${link.href}`);
    }
});

test('시간표 CSS: Google Fonts 다음의 기존 head 위치에 연속으로 로드', () => {
    assert.equal(timetableLinks.length, 2);
    const first = timetableLinks[0];
    const last = timetableLinks.at(-1);
    const start = first.index;
    const end = last.index + last.tag.length;
    assert.ok(start > html.indexOf('<head>'));
    assert.ok(end < html.indexOf('</head>'));
    const block = html.slice(start, end);
    assert.equal(block.replace(/<link\b[^>]*>/gi, '').trim(), '', '분리 링크 사이에 다른 마크업이 있음');
    assert.match(block, /^[^\r\n]+\r?\n[\t ]*<link\b[^\r\n]+>$/, '두 링크는 바로 다음 줄에 있어야 함');
    const previous = links[links.indexOf(first) - 1];
    assert.equal(previous.href, "https://fonts.googleapis.com/css2?family=Nanum+Gothic:wght@400;700&family=Jua&family=Gaegu:wght@400;700&display=swap");
    assert.equal(html.slice(previous.index + previous.tag.length, start).trim(), '');
    assert.equal(html.slice(end, html.indexOf('</head>')).trim(), '');
});

test('시간표 CSS: 새 파일 머리 주석만 뺀 문서 순서 재결합이 고정 fixture와 일치', () => {
    assert.equal(timetableLinks.length, 2);
    const joined = timetableLinks.map((link, index) =>
        payload(fs.readFileSync(assetPath(link.href), 'utf8'), parts[index])).join('');
    assert.equal(normalize(joined), normalize(read('tests/fixtures/timetable-css-split/timetable.css')));
});

for (const name of parts) {
    test(`시간표 CSS ${name}: 600줄 이하 및 독립 블록 경계`, () => {
        const source = read(`kids/css/${name}`);
        assert.ok(lineCount(source) <= 600, `${name}: 600줄 초과`);
        const css = payload(source, name).replace(/\/\*[\s\S]*?\*\//g, '');
        assert.equal((css.match(/\{/g) ?? []).length, (css.match(/\}/g) ?? []).length,
            `${name}: 여는 중괄호와 닫는 중괄호 수 불일치`);
        let depth = 0;
        for (const brace of css.match(/[{}]/g) ?? []) {
            depth += brace === '{' ? 1 : -1;
            assert.ok(depth >= 0, `${name}: 앞 파일의 블록을 이어 닫음`);
        }
        assert.equal(depth, 0, `${name}: 닫히지 않은 블록`);
        assert.doesNotMatch(css, /@import\b/i, `${name}: 직렬 @import 금지`);
    });
}

test('시간표 CSS: 기존 파일 이름 유지 및 버전 없는 링크 제거', () => {
    assert.ok(fs.existsSync(path.join(root, 'kids/css/timetable.css')));
    assert.ok(links.every(link => !/(?:^|\/)timetable\.css(?:#.*)?$/i.test(link.href)));
});
