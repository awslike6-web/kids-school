// 하루방 CSS 분리 규칙: 로드 순서·위치·머리 주석·파일 경계·줄 상한.
// 2026-11-14: 얼린 원본(tests/fixtures/haru-css-split)과의 재결합 원문 대조는 정상 수정마다 깨져 뺐다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { root, read, lineCount, assertLoadsInOrder } from './split-rules.mjs';

const htmlPath = 'kids/subjects/haru/haru.html';
const html = read(htmlPath);
const parts = [
    ['haru-base.css', '변수·공통·습관·감상실'],
    ['haru-special-days.css', '특별한 날 추억 게시판'],
    ['haru-checkin.css', '30초 체크인·사진 팝업'],
    ['haru-safety.css', '119 안전 수호대·닥터 코코'],
    ['haru-timeline-clock.css', '타임머신 헤더·시계판·필터'],
    ['haru-timeline-list.css', '타임라인 목록·스티커·모달·반응형']
];

const attribute = (tag, name) => tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, 'i'))?.[2];
const links = [...html.matchAll(/<link\b[^>]*>/gi)].map(match => ({
    tag: match[0],
    href: attribute(match[0], 'href') ?? '',
    index: match.index
}));
const haruLinks = links.filter(link => /(?:^|\/)haru-[^/?#]+\.css(?:[?#]|$)/i.test(link.href));
const assetPath = href => path.resolve(root, path.dirname(htmlPath), href.split('?')[0]);

function payload(source, name, description, index) {
    const newline = source.indexOf('\n');
    assert.ok(newline >= 0, `${name}: 머리 주석 다음 개행 없음`);
    const header = source.slice(0, newline).replace(/\r$/, '');
    assert.equal(header,
        `/* kids/css/${name} - haru.css 분리 ${index + 1}/6: ${description} (haru.html에서 순서대로 로드) */`,
        `${name}: 머리 주석 형식·순서 불일치`);
    return source.slice(newline + 1);
}

test('하루 CSS: 상대 경로 링크 6개의 파일명·로드 순서·버전·실존', () => {
    assert.deepEqual(haruLinks.map(link => link.href.split('?')[0]), parts.map(([name]) => `../../css/${name}`));
    assertLoadsInOrder(html, 'style', parts.map(([name]) => `../../css/${name}`), '하루 CSS');
    for (const link of haruLinks) {
        assert.equal(attribute(link.tag, 'rel'), 'stylesheet');
        assert.equal(path.dirname(assetPath(link.href)), path.join(root, 'kids', 'css'));
        assert.ok(fs.existsSync(assetPath(link.href)), `파일 없음: ${link.href}`);
    }
});

test('하루 CSS: 기존 head 위치에 연속으로 로드', () => {
    assert.equal(haruLinks.length, 6);
    const first = haruLinks[0];
    const last = haruLinks.at(-1);
    const start = first.index;
    const end = last.index + last.tag.length;
    assert.ok(start > html.indexOf('<head>'));
    assert.ok(end < html.indexOf('</head>'));
    const block = html.slice(start, end);
    assert.equal(block.replace(/<link\b[^>]*>/gi, '').trim(), '', '분리 링크 사이에 다른 마크업이 있음');
    const previous = links[links.indexOf(first) - 1];
    assert.ok(previous.href.startsWith('https://fonts.googleapis.com/'));
    assert.equal(html.slice(previous.index + previous.tag.length, start).trim(), '');
    assert.equal(html.slice(end, html.indexOf('</head>')).trim(), '');
});

for (const [index, [name, description]] of parts.entries()) {
    test(`하루 CSS ${name}: 600줄 이하·800줄 미만 및 독립 블록 경계`, () => {
        const source = read(`kids/css/${name}`);
        assert.ok(lineCount(source) < 800, `${name}: 800줄 이상`);
        assert.ok(lineCount(source) <= 600, `${name}: 600줄 초과`);
        const css = payload(source, name, description, index).replace(/\/\*[\s\S]*?\*\//g, '');
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

test('하루 CSS: 기존 단일 파일과 HTML 참조 제거', () => {
    assert.doesNotMatch(html, /\bharu\.css\b/i);
    assert.equal(fs.existsSync(path.join(root, 'kids/css/haru.css')), false);
});
