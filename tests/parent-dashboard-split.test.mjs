// 부모 대시보드 분리 규칙: 머리 주석·줄 상한·HTML 로드·공개 API·이벤트·부분 로드 안전성.
// 2026-11-14: 얼린 원본(tests/fixtures/parent-dashboard-split)과의 원문·실행 결과 대조, 전역 함수 개수 고정은
// 정상 수정마다 깨져 뺐다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { root, read, lineCount, assertLoadsInOrder, assertInlineHandlersDeclared, inlineHandlersDeclaredIn,
  assertPublicApi } from './split-rules.mjs';

const names = ['parent_dashboard.js', 'parent_dashboard_render.js'];
const files = names.map(name => `kids/js/${name}`);
const sources = files.map(read);
const htmlPath = 'parent_dashboard.html';
const html = read(htmlPath);
// 다른 화면·HTML이 부르는 공개 함수(추가는 자유, 이름 변경·삭제만 실패)
const PUBLIC_API = ['localDateStr', 'calcStreak', 'consumeWishTicket', 'switchView',
  'loadDashboardData', 'renderScreenTimeWidget', 'renderHaruParentCoaching', 'renderSafetyAlertWidget'];

test('두 파일은 지정 머리 주석을 가지며 각각 600줄 이하이다', () => {
  sources.forEach((source, index) => {
    assert.ok(lineCount(source) <= 600, `${files[index]}: 600줄 초과`);
    const firstNewline = source.indexOf('\n');
    assert.ok(firstNewline >= 0);
    const header = source.slice(0, firstNewline).replace(/\r$/, '');
    assert.ok(header.startsWith(`// kids/js/${names[index]} - parent_dashboard.js 분리 ${index + 1}/2: `));
    assert.ok(header.endsWith(' (순서대로 로드)'));
  });
});

test('HTML은 두 태그를 상대 경로·같은 버전·지정 순서로 연달아 한 번씩 싣는다', () => {
  assertLoadsInOrder(html, 'script', files, '부모 대시보드');
  for (const file of files) assert.ok(fs.existsSync(path.join(root, file)));
});

test('HTML on* 속성이 부르는 함수가 모두 선언되어 있음', () => {
  assertInlineHandlersDeclared(htmlPath);
});

test('운영 소스에 이전 버전의 대시보드 스크립트 참조가 남지 않는다', () => {
  const walk = dir => fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(entry => {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(file);
    return /\.(?:html|js|mjs|cjs)$/.test(entry.name) ? [file] : [];
  });
  const rootFiles = fs.readdirSync(root).filter(file => /\.(?:html|js|mjs|cjs)$/.test(file));
  for (const file of [...rootFiles, ...walk('kids'), ...walk('scripts')]) {
    assert.doesNotMatch(read(file), /parent_dashboard[^\s"'<>]*\?v=20261025-1\b/, file);
  }
});

function sandbox(configured) {
  const events = [];
  const unexpected = name => () => { throw new Error(`로드 중 예상하지 않은 접근: ${name}`); };
  const register = target => (type, callback) => {
    assert.equal(typeof callback, 'function');
    events.push({ target, type });
  };
  const context = {
    localStorage: { getItem: unexpected('getItem'), setItem: unexpected('setItem') },
    fetch: unexpected('fetch'),
    setTimeout: unexpected('setTimeout'),
    Chart: unexpected('Chart'),
    addEventListener: register('window'),
    document: {
      addEventListener: register('document'),
      getElementById: unexpected('getElementById'),
      querySelectorAll: unexpected('querySelectorAll'),
      createElement: unexpected('createElement')
    }
  };
  // 클래식 스크립트의 window와 전역 객체는 같은 객체다. 콜백은 기록만 한다.
  context.window = context;
  if (configured) context.APP_CONFIG = {
    WORKER_PROXY_URL: 'https://example.invalid',
    INVENTORY_DB_ID: 'inventory', STUDY_LOG_DB_ID: 'study',
    VOCA_DB_ID: 'voca', DIARY_DB_ID: 'diary'
  };
  vm.createContext(context);
  return { context, events };
}

for (const configured of [false, true]) {
  const mode = configured ? 'APP_CONFIG 있음' : 'APP_CONFIG 없음';
  test(`${mode}: 전체 로드 후 공개 함수·HTML 호출 함수·이벤트 등록이 갖춰진다`, () => {
    const split = sandbox(configured);
    sources.forEach((source, index) => vm.runInContext(source, split.context, { filename: files[index] }));
    assertPublicApi(split.context, PUBLIC_API, mode);
    const missing = inlineHandlersDeclaredIn(html, sources).filter(name => typeof split.context[name] !== 'function');
    assert.deepEqual(missing, [], 'HTML이 부르는데 로드 뒤 없는 전역 함수');
    assert.deepEqual(split.events, [
      { target: 'window', type: 'DOMContentLoaded' },
      { target: 'document', type: 'visibilitychange' },
      { target: 'window', type: 'focus' }
    ]);
    // 설정이 없을 때도 상수 블록이 예외 없이 읽힌다.
    assert.doesNotThrow(() => vm.runInContext('JSON.stringify({PROXY_URL, INVENTORY_DB_ID, SUBJECTS_MINSU, SUBJECTS_MINSEO})', split.context));
  });

  test(`${mode}: 첫 파일만 로드해도 뒤 파일 호출 없이 실행된다`, () => {
    const sb = sandbox(configured);
    assert.doesNotThrow(() => vm.runInContext(sources[0], sb.context, { filename: files[0] }));
    assert.deepEqual(sb.events, []);
    for (const name of ['localDateStr', 'calcStreak']) assert.equal(typeof sb.context[name], 'function');
    for (const name of ['loadDashboardData', 'renderScreenTimeWidget', 'renderHaruParentCoaching', 'renderSafetyAlertWidget']) {
      assert.equal(typeof sb.context[name], 'undefined', `뒤 파일 함수 조기 노출: ${name}`);
    }
  });
}
