// 마음일기 분리: 고정 원본·전역 API·다섯 진입점·부분 로드 안전성을 검사한다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const names = ['base', 'forms', 'sync', 'submit'].map(part => `daily-diary-${part}.js`);
const files = names.map(name => `kids/core/${name}`);
const fixture = read('tests/fixtures/daily-diary-split/daily-diary.js');
const sources = files.map(read);
const version = '?v=20261031-diary-split';
// 수학 분리 시험과 동일: 줄바꿈·줄 끝 공백·마지막 개행만 정규화한다.
const normalize = text => text.replace(/\r\n/g, '\n').replace(/[\t ]+$/gm, '').replace(/\n+$/, '');
const lineCount = text => text.split(/\r?\n/).length;

test('네 파일은 지정 머리 주석을 가지며 각각 600줄 이하이고 원본을 보존한다', () => {
  const bodies = sources.map((source, index) => {
    assert.ok(lineCount(source) <= 600, `${files[index]}: 600줄 초과`);
    const firstNewline = source.indexOf('\n');
    assert.ok(firstNewline >= 0);
    const header = source.slice(0, firstNewline).replace(/\r$/, '');
    assert.ok(header.startsWith(`// kids/core/${names[index]} - daily-diary.js 분리 ${index + 1}/4: `));
    assert.ok(header.endsWith(' (순서대로 로드)'));
    return source.slice(firstNewline + 1);
  });
  assert.equal(normalize(bodies.join('')), normalize(fixture));
  assert.equal(fs.existsSync(path.join(root, 'kids/core/daily-diary.js')), false);
});

for (const [file, arrayName] of [['kids/core/core.js', 'requiredCores'], ['kids/js/lobby_controller.js', 'lobbyCores']]) {
  test(`${file}: 로더 배열은 네 파일을 순서대로 한 번씩 싣는다`, () => {
    const match = read(file).match(new RegExp(`\\b(?:const|let|var)\\s+${arrayName}\\s*=\\s*\\[([\\s\\S]*?)\\]`));
    assert.ok(match, '로더 배열 없음');
    const entries = [...match[1].matchAll(/['"]([^'"]+)['"]/g)].map(item => item[1]);
    assert.deepEqual(entries.filter(name => name.startsWith('daily-diary')), names);
    const first = entries.indexOf(names[0]);
    assert.deepEqual(entries.slice(first, first + names.length), names);
  });
}

const pages = [
  ['kids/subjects/haru/haru.html', '../../core/', 799],
  ['kids/subjects/korean/korean.html', '../../core/', 137],
  ['parent_diary.html', './kids/core/', 719]
];
for (const [file, base, originalLines] of pages) {
  test(`${file}: 네 태그는 기존 한 줄에서 공백 하나로 연결되고 경로·버전·순서가 맞는다`, () => {
    const html = read(file);
    const expectedTags = names.map(name => `<script src="${base}${name}${version}"></script>`);
    const expected = expectedTags.join(' ');
    const lines = html.split(/\r?\n/);
    assert.equal(lines.filter(line => line.trim() === expected).length, 1);
    const loaded = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]*daily-diary[^\"]*)"[^>]*><\/script>/g)].map(match => match[0]);
    assert.deepEqual(loaded, expectedTags);
    for (const name of names) {
      assert.ok(fs.existsSync(path.resolve(root, path.dirname(file), base + name)));
    }
    // 끝 개행 뒤 빈 항목은 실제 줄 수에 포함하지 않는다.
    const physicalLines = lines.length - Number(html.endsWith('\n'));
    assert.equal(physicalLines, originalLines);
  });
}

test('운영 HTML·JS에 이전 일기 파일을 읽는 문자열 참조가 남지 않는다', () => {
  const walk = dir => fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(entry => {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(file);
    return /\.(?:html|js|mjs|cjs)$/.test(entry.name) ? [file] : [];
  });
  const rootFiles = fs.readdirSync(root).filter(file => /\.(?:html|js|mjs|cjs)$/.test(file));
  for (const file of [...rootFiles, ...walk('kids'), ...walk('scripts')]) {
    assert.doesNotMatch(read(file), /(['"])[^'"\r\n]*daily-diary\.js(?:\?[^'"\r\n]*)?\1/, file);
  }
});

function sandbox() {
  const unexpected = name => () => { throw new Error(`로드 중 외부 접근: ${name}`); };
  const context = {
    window: {},
    document: new Proxy({}, { get: (_, key) => { throw new Error(`로드 중 DOM 접근: ${String(key)}`); } }),
    localStorage: { getItem: unexpected('getItem'), setItem: unexpected('setItem') },
    fetch: unexpected('fetch'), setTimeout: unexpected('setTimeout')
  };
  return vm.createContext(context);
}
const functionNames = object => Object.keys(object).filter(key => typeof object[key] === 'function').sort();

test('전체 로드 후 전역 함수와 명시적 window 바인딩이 원본과 같다', () => {
  const original = sandbox();
  const split = sandbox();
  vm.runInContext(fixture, original, { filename: '원본 fixture' });
  sources.forEach((source, index) => vm.runInContext(source, split, { filename: files[index] }));
  const exported = functionNames(split.window);
  assert.ok(exported.length >= 17);
  assert.deepEqual(exported, functionNames(original.window));
  assert.deepEqual(functionNames(split), functionNames(original));
  for (const name of exported) assert.equal(split.window[name], split[name], name);
});

for (const count of [1, 2, 3]) {
  test(`앞 ${count}개만 로드해도 뒤 파일 호출·DOM·통신 없이 실행된다`, () => {
    const context = sandbox();
    for (let index = 0; index < count; index++) {
      assert.doesNotThrow(() => vm.runInContext(sources[index], context, { filename: files[index] }));
    }
    assert.deepEqual(Object.keys(context.window), [], '마지막 파일 전에 전역 바인딩이 실행됨');
  });
}
