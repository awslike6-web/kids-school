// 부모 대시보드 분리: 고정 원본·참조·전역 API·이벤트·부분 로드 안전성을 검사한다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const names = ['parent_dashboard.js', 'parent_dashboard_render.js'];
const files = names.map(name => `kids/js/${name}`);
const fixture = read('tests/fixtures/parent-dashboard-split/parent_dashboard.js');
const sources = files.map(read);
const version = '?v=20261031-dash-split';
// 수학 분리 시험과 동일: 줄바꿈·줄 끝 공백·마지막 개행만 정규화한다.
const normalize = text => text.replace(/\r\n/g, '\n').replace(/[\t ]+$/gm, '').replace(/\n+$/, '');

test('두 파일은 지정 머리 주석을 가지며 각각 600줄 이하이고 원문을 보존한다', () => {
  const bodies = sources.map((source, index) => {
    assert.ok(source.split(/\r?\n/).length <= 600, `${files[index]}: 600줄 초과`);
    const firstNewline = source.indexOf('\n');
    assert.ok(firstNewline >= 0);
    const header = source.slice(0, firstNewline).replace(/\r$/, '');
    assert.ok(header.startsWith(`// kids/js/${names[index]} - parent_dashboard.js 분리 ${index + 1}/2: `));
    assert.ok(header.endsWith(' (순서대로 로드)'));
    return source.slice(firstNewline + 1);
  });
  assert.equal(normalize(bodies.join('')), normalize(fixture));
});

test('HTML은 두 태그를 상대 경로·같은 버전·지정 순서로 연달아 한 번씩 싣는다', () => {
  const html = read('parent_dashboard.html');
  const expected = names.map(name => `<script src="kids/js/${name}${version}"></script>`);
  const loaded = [...html.matchAll(/<script\b[^>]*\bsrc=["'][^"']*parent_dashboard[^"']*["'][^>]*>\s*<\/script>/g)]
    .map(match => match[0]);
  assert.deepEqual(loaded, expected);
  const start = html.indexOf(expected[0]);
  const end = html.indexOf(expected[1]) + expected[1].length;
  assert.equal(html.slice(start, end).replace(/>\s+</g, '><'), expected.join(''));
  for (const file of files) assert.ok(fs.existsSync(path.join(root, file)));
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
  return { context, events, initialNames: new Set(Object.keys(context)) };
}

function snapshot({ context, events, initialNames }) {
  const added = Object.keys(context).filter(name => !initialNames.has(name)).sort();
  return {
    functions: added.filter(name => typeof context[name] === 'function'),
    windowNames: added,
    events,
    // 최상위 const/let은 window 속성이 아니므로 컨텍스트 안에서 따로 읽는다.
    state: vm.runInContext(`JSON.stringify({PROXY_URL, INVENTORY_DB_ID, STUDY_LOG_DB_ID,
      VOCA_DB_ID, DIARY_DB_ID, SUBJECTS_MINSU, SUBJECTS_MINSEO, SUBJECTS_5, memoryState, radarCharts})`, context)
  };
}

for (const configured of [false, true]) {
  const mode = configured ? 'APP_CONFIG 있음' : 'APP_CONFIG 없음';
  test(`${mode}: 전체 로드 후 전역 함수·window 이름·상태·이벤트가 원본과 같다`, () => {
    const original = sandbox(configured);
    const split = sandbox(configured);
    vm.runInContext(fixture, original.context, { filename: '원본 fixture' });
    sources.forEach((source, index) => vm.runInContext(source, split.context, { filename: files[index] }));
    const result = snapshot(split);
    assert.deepEqual(result, snapshot(original));
    assert.equal(result.functions.length, 21);
    assert.deepEqual(result.events, [
      { target: 'window', type: 'DOMContentLoaded' },
      { target: 'document', type: 'visibilitychange' },
      { target: 'window', type: 'focus' }
    ]);
    for (const name of ['localDateStr', 'calcStreak', 'consumeWishTicket', 'switchView',
      'loadDashboardData', 'renderScreenTimeWidget', 'renderHaruParentCoaching', 'renderSafetyAlertWidget']) {
      assert.ok(result.functions.includes(name), `공개 함수 누락: ${name}`);
    }
  });

  test(`${mode}: 첫 파일만 로드해도 뒤 파일 호출 없이 실행된다`, () => {
    const sb = sandbox(configured);
    assert.doesNotThrow(() => vm.runInContext(sources[0], sb.context, { filename: files[0] }));
    const result = snapshot(sb);
    assert.deepEqual(result.events, []);
    assert.equal(result.functions.length, 17);
    for (const name of ['localDateStr', 'calcStreak']) assert.ok(result.functions.includes(name));
    for (const name of ['loadDashboardData', 'renderScreenTimeWidget', 'renderHaruParentCoaching', 'renderSafetyAlertWidget']) {
      assert.equal(typeof sb.context[name], 'undefined', `뒤 파일 함수 조기 노출: ${name}`);
    }
  });
}
