// 분리 파일 규칙 검사 공용 도우미 (시험 파일이 아님).
// 2026-11-14 정리: 예전 분리 시험은 tests/fixtures의 얼린 원본과 원문·마크업·실행 결과를 통째로 대조해
// 정상 수정마다 fixture를 같이 고쳐야 했다. 지금은 원본 없이 지킬 규칙만 본다.
//  - 태그: 같은 묶음은 지정 순서로 한 번씩, 사이에 다른 것 없이 연속, 같은 ?v= 값(값 자체는 자유)
//  - HTML on* 속성이 부르는 함수가 그 화면이 싣는 스크립트(또는 core.js가 싣는 kids/core)에 선언되어 있음
//  - 공개 전역 API: 기존 목록이 남아 있음(추가는 자유, 이름 변경·삭제만 실패)
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const read = file => fs.readFileSync(path.join(root, file), 'utf8');
export const lineCount = text => text.split(/\r?\n/).length;

const TAG_PATTERNS = {
    script: /<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>\s*<\/script>/gi,
    style: /<link\b[^>]*\brel\s*=\s*["']stylesheet["'][^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>/gi
};

// HTML 안의 외부 script/stylesheet 태그 목록: 주소, 물음표 앞 경로, 버전, 위치
export function assetTags(html, kind) {
    return [...html.matchAll(TAG_PATTERNS[kind])].map(match => {
        const [url, query = ''] = match[1].split('?');
        const version = new URLSearchParams(query).get('v');
        return { tag: match[0], src: match[1], url, version, start: match.index, end: match.index + match[0].length };
    });
}

// urls(물음표 앞 경로)를 지정 순서로 한 번씩, 연속으로, 같은 비어 있지 않은 ?v=로 싣는지 확인한다.
export function assertLoadsInOrder(html, kind, urls, label = '') {
    const tags = assetTags(html, kind);
    const picked = urls.map(url => {
        const found = tags.filter(tag => tag.url === url);
        assert.equal(found.length, 1, `${label} ${url}: 한 번만 실어야 함(${found.length}번)`);
        return found[0];
    });
    for (let i = 1; i < picked.length; i++) {
        assert.ok(picked[i].start > picked[i - 1].start, `${label} 로드 순서: ${urls[i - 1]} → ${urls[i]}`);
        assert.equal(html.slice(picked[i - 1].end, picked[i].start).trim(), '', `${label} ${urls[i - 1]}와 ${urls[i]} 사이가 연속이 아님`);
    }
    const versions = new Set(picked.map(tag => tag.version));
    assert.equal(versions.size, 1, `${label} 묶음 버전이 서로 다름: ${[...versions].join(', ')}`);
    assert.ok(picked[0].version, `${label} ?v= 캐시 버전 없음`);
    return picked;
}

// 화면 HTML 기준 상대 주소를 저장소 경로로 바꾼다(물음표 뒤 제외).
export const resolveFrom = (htmlPath, url) => path.relative(root, path.resolve(root, path.dirname(htmlPath), url.split('?')[0])).replace(/\\/g, '/');

export function assertRelativeAssets(htmlPath, kind, urls) {
    for (const url of urls) {
        assert.doesNotMatch(url, /^(?:\/|https?:)/, `${htmlPath}: 상대 경로가 아님 ${url}`);
        assert.ok(fs.existsSync(path.join(root, resolveFrom(htmlPath, url))), `${htmlPath}: 파일 없음 ${url}`);
    }
}

export function assertNoInlineStyleOrScript(html, label = '') {
    assert.equal([...html.matchAll(/<style\b[^>]*>[\s\S]*?<\/style>/gi)].length, 0, `${label} 인라인 style이 남음`);
    for (const tag of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
        assert.match(tag[1], /\bsrc\s*=/i, `${label} 인라인 script가 남음`);
        assert.equal(tag[2].trim(), '', `${label} 외부 script 태그 안에 코드가 남음`);
    }
}

const KEYWORDS = new Set(['if', 'for', 'while', 'switch', 'return', 'typeof', 'function', 'new', 'await', 'void', 'catch']);
// on*="..." 속성에서 직접 부르는 전역 함수 이름(문장 첫머리 호출, window.이름( 포함)
export function inlineHandlerNames(html) {
    const names = new Set();
    for (const match of html.matchAll(/\son[a-z]+\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)) {
        for (let statement of (match[1] ?? match[2]).split(/;|&&|\|\|/)) {
            statement = statement.trim().replace(/^(?:return|await)\s+/, '');
            const call = statement.match(/^(?:window\.)?([A-Za-z_$][\w$]*)\s*\(/);
            if (call && !KEYWORDS.has(call[1])) names.add(call[1]);
        }
    }
    return [...names].sort();
}

const declares = (source, name) => new RegExp(
    `function\\s*\\*?\\s*${name}\\s*\\(|(?:window|globalThis|self)\\.${name}\\s*=|(?:const|let|var)\\s+${name}\\s*=|^\\s*${name}\\s*=`, 'm'
).test(source);

// HTML이 부르는 함수 중 sources(분리 파일 원문들)에 선언된 것. 실행 후 전역 함수로 실존하는지 볼 때 쓴다.
export const inlineHandlersDeclaredIn = (html, sources) =>
    inlineHandlerNames(html).filter(name => sources.some(source => declares(source, name)));

// HTML이 부르는 함수가 화면이 싣는 로컬 스크립트, 또는 core.js가 동적으로 싣는 kids/core 파일에 선언되어 있는지 본다.
export function assertInlineHandlersDeclared(htmlPath) {
    const html = read(htmlPath);
    const local = assetTags(html, 'script').filter(tag => !/^(?:https?:)?\/\//.test(tag.url))
        .map(tag => resolveFrom(htmlPath, tag.url));
    const coreFiles = fs.readdirSync(path.join(root, 'kids/core')).filter(name => name.endsWith('.js')).map(name => `kids/core/${name}`);
    const inline = [...html.matchAll(/<script\b(?![^>]*\bsrc\s*=)[^>]*>([\s\S]*?)<\/script>/gi)].map(match => match[1]);
    const sources = [...new Set([...local, ...coreFiles])].map(file => read(file)).concat(inline);
    const names = inlineHandlerNames(html);
    const missing = names.filter(name => !sources.some(source => declares(source, name)));
    assert.deepEqual(missing, [], `${htmlPath}: on* 속성이 부르는데 선언이 없는 함수`);
    return names;
}

// 공개 전역 API가 남아 있는지 본다(추가 허용). 목록은 2026-11-14 당시 전역 함수 이름이다.
export function assertPublicApi(context, names, label = '') {
    const missing = names.filter(name => typeof context[name] !== 'function');
    assert.deepEqual(missing, [], `${label} 사라진 공개 전역 함수`);
}
