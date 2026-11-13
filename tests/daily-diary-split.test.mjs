// 마음일기 분리 규칙: 머리 주석·줄 상한·로더 배열·세 진입 화면 로드·공개 API·부분 로드 안전성.
// 2026-11-14: 얼린 원본(tests/fixtures/daily-diary-split)과의 원문·실행 결과 대조, 분리 전 HTML 줄 수 고정,
// 태그 한 줄 서식 고정은 정상 수정마다 깨져 뺐다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { root, read, lineCount, assertLoadsInOrder, assertPublicApi } from './split-rules.mjs';

const names = ['base', 'forms', 'sync', 'submit'].map(part => `daily-diary-${part}.js`);
const files = names.map(name => `kids/core/${name}`);
const sources = files.map(read);
// 화면·다른 코어가 window로 부르는 공개 함수(2026-11-14 기준, 추가는 자유)
const PUBLIC_API = ['closeDailyDiaryModal', 'deleteDiaryEntry', 'fetchNotionDiaries', 'getOrCreateAiDailyLog',
  'getStoredDiaries', 'getTodayDiaryCount', 'insertQuickTag', 'openDailyDiaryModal', 'selectChoiceCard',
  'startDiaryVoiceInput', 'submitMinseoDiary', 'submitMinsuDiary', 'submitParentDiary', 'switchDiaryTab',
  'syncDiariesFromNotion', 'toggleBalloonTag', 'updateLobbyDiaryButton'];

test('네 파일은 지정 머리 주석을 가지며 각각 600줄 이하이고 옛 단일 파일은 없다', () => {
  sources.forEach((source, index) => {
    assert.ok(lineCount(source) <= 600, `${files[index]}: 600줄 초과`);
    const firstNewline = source.indexOf('\n');
    assert.ok(firstNewline >= 0);
    const header = source.slice(0, firstNewline).replace(/\r$/, '');
    assert.ok(header.startsWith(`// kids/core/${names[index]} - daily-diary.js 분리 ${index + 1}/4: `));
    assert.ok(header.endsWith(' (순서대로 로드)'));
  });
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
  ['kids/subjects/haru/haru.html', '../../core/'],
  ['kids/subjects/korean/korean.html', '../../core/'],
  ['parent_diary.html', './kids/core/']
];
for (const [file, base] of pages) {
  test(`${file}: 네 태그를 상대 경로·같은 버전·지정 순서로 연달아 한 번씩 싣고 800줄 미만이다`, () => {
    const html = read(file);
    assertLoadsInOrder(html, 'script', names.map(name => base + name), file);
    for (const name of names) {
      assert.ok(fs.existsSync(path.resolve(root, path.dirname(file), base + name)));
    }
    assert.ok(lineCount(html) < 800, `${file}: 800줄 이상`);
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

test('전체 로드 후 공개 함수가 window와 전역에 같은 함수로 묶인다', () => {
  const split = sandbox();
  sources.forEach((source, index) => vm.runInContext(source, split, { filename: files[index] }));
  assertPublicApi(split.window, PUBLIC_API, 'window');
  for (const name of Object.keys(split.window).filter(key => typeof split.window[key] === 'function')) {
    assert.equal(split.window[name], split[name], `window.${name}와 전역 ${name}이 다름`);
  }
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
