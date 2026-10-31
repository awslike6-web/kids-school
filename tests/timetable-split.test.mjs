// 시간표 분리: 고정 원본·참조·전역 API·상태·이벤트·타이머·부분 로드를 검사한다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const names = ['timetable_controller.js', 'timetable_grid.js', 'timetable_notices.js'];
const files = names.map(name => `kids/js/${name}`);
const fixturePath = 'tests/fixtures/timetable-split/timetable_controller.js';
const fixture = read(fixturePath);
const sources = files.map(read);
const version = '?v=20261031-timetable-split';
// 수학 분리 시험과 동일: 줄바꿈·줄 끝 공백·마지막 개행만 정규화한다.
const normalize = text => text.replace(/\r\n/g, '\n').replace(/[\t ]+$/gm, '').replace(/\n+$/, '');

test('세 파일은 지정 머리 주석을 가지며 각각 600줄 이하이고 원문 바이트를 보존한다', () => {
  const bodies = sources.map((source, index) => {
    assert.ok(fs.existsSync(path.join(root, files[index])));
    assert.ok(source.split(/\r?\n/).length <= 600, `${files[index]}: 600줄 초과`);
    const firstNewline = source.indexOf('\n');
    assert.ok(firstNewline >= 0);
    const header = source.slice(0, firstNewline).replace(/\r$/, '');
    assert.ok(header.startsWith(`// kids/js/${names[index]} - timetable_controller.js 분리 ${index + 1}/3: `));
    assert.ok(header.endsWith(' (순서대로 로드)'));
    return source.slice(firstNewline + 1);
  });
  assert.equal(normalize(bodies.join('')), normalize(fixture));
  const bytes = files.map(file => {
    const buffer = fs.readFileSync(path.join(root, file));
    return buffer.subarray(buffer.indexOf(10) + 1);
  });
  assert.deepEqual(Buffer.concat(bytes), fs.readFileSync(path.join(root, fixturePath)));
});

test('HTML은 선행 코어 뒤에 세 클래식 태그를 같은 버전·지정 순서로 한 번씩 싣는다', () => {
  const html = read('timetable.html');
  const expected = names.map(name => `<script src="kids/js/${name}${version}"></script>`);
  const loaded = [...html.matchAll(/<script\b[^>]*\bsrc=["'][^"']*timetable_(?:controller|grid|notices)\.js[^"']*["'][^>]*>\s*<\/script>/g)]
    .map(match => match[0]);
  assert.deepEqual(loaded, expected);
  const allTags = [
    '<script src="kids/config.js"></script>',
    '<script src="kids/core/notion-timetable.js"></script>',
    ...expected
  ];
  const start = html.indexOf(allTags[0]);
  const end = html.indexOf(expected[2]) + expected[2].length;
  assert.ok(start >= 0);
  assert.equal(html.slice(start, end).replace(/>\s+</g, '><'), allTags.join(''));
});

test('운영 소스의 시간표 스크립트 참조는 지정 버전이며 옛 무버전 참조가 없다', () => {
  const walk = dir => fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(entry => {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(file);
    return /\.(?:html|js|mjs|cjs)$/.test(entry.name) ? [file] : [];
  });
  const rootFiles = fs.readdirSync(root).filter(file => /\.(?:html|js|mjs|cjs)$/.test(file));
  const refs = [];
  for (const file of [...rootFiles, ...walk('kids'), ...walk('scripts')]) {
    for (const match of read(file).matchAll(/["']((?:\.\/|\.\.\/)*kids\/js\/timetable_(?:controller|grid|notices)\.js[^"']*)["']/g)) {
      assert.ok(match[1].endsWith(version), `${file}: ${match[1]}`);
      refs.push({ file, src: match[1] });
    }
  }
  assert.deepEqual(refs, files.map(file => ({ file: 'timetable.html', src: `${file}${version}` })));
});

function sandbox(configured) {
  const events = [], timers = [], accesses = [];
  const elements = { clockTime: { textContent: '' }, clockDate: { textContent: '' } };
  const unexpected = name => () => { throw new Error(`로드 중 예상하지 않은 접근: ${name}`); };
  const register = target => (type, callback) => {
    assert.equal(typeof callback, 'function');
    events.push({ target, type, callback: callback.toString() });
  };
  // 원본과 분리본의 시계 표시를 같은 시각으로 비교한다.
  class FixedDate extends Date {
    constructor(...args) { super(...(args.length ? args : ['2026-10-31T03:00:00Z'])); }
    static now() { return new Date('2026-10-31T03:00:00Z').getTime(); }
  }
  const context = {
    Date: FixedDate,
    localStorage: { getItem: unexpected('getItem'), setItem: unexpected('setItem') },
    fetch: unexpected('fetch'),
    setTimeout: unexpected('setTimeout'),
    clearTimeout: unexpected('clearTimeout'),
    setInterval(callback, delay) {
      assert.equal(typeof callback, 'function');
      timers.push({ name: callback.name, delay, callback: callback.toString() });
      return timers.length;
    },
    addEventListener: register('window'),
    document: {
      addEventListener: register('document'),
      getElementById(id) {
        accesses.push(id);
        assert.ok(Object.hasOwn(elements, id), `예상하지 않은 DOM: ${id}`);
        return elements[id];
      },
      querySelector: unexpected('querySelector'),
      querySelectorAll: unexpected('querySelectorAll'),
      createElement: unexpected('createElement')
    }
  };
  // 콜백은 기록만 하며 실제 타이머·이벤트·네트워크는 실행하지 않는다.
  context.window = context;
  if (configured) context.APP_CONFIG = {
    CHILDREN: { first: { name: '민수' }, second: { name: '민서' } }
  };
  vm.createContext(context);
  return { context, events, timers, accesses, elements, initialNames: new Set(Object.keys(context)) };
}

function snapshot({ context, events, timers, accesses, elements, initialNames }, count = 3) {
  const added = Object.keys(context).filter(name => !initialNames.has(name)).sort();
  const mobileState = count >= 2 ? ', MOBILE_PAIR_INDICES, MOBILE_PAIR_KEYS' : '';
  return {
    functions: added.filter(name => typeof context[name] === 'function'),
    windowNames: added,
    events, timers, accesses, elements,
    // 최상위 const/let은 window 속성이 아니므로 컨텍스트 안에서 따로 읽는다.
    state: vm.runInContext(`JSON.stringify({KOREAN_DAYS, KOREAN_DAYS_SHORT, WEEKDAYS,
      DAY_CSS_CLASS, DEFAULT_PERIODS, ALL_SPECIAL_PERIODS, SUBJECT_COLORS, DEFAULT_BASE_TIMETABLE,
      allTimetableRows, staticTimetableRows, overlayTimetableRows, activeChildFilter, viewerContext
      ${mobileState}})`, context)
  };
}

for (const configured of [false, true]) {
  const mode = configured ? 'APP_CONFIG 있음' : 'APP_CONFIG 없음';
  test(`${mode}: 전체 로드 후 전역 함수·상태·시계·이벤트·타이머가 원본과 같다`, () => {
    const original = sandbox(configured);
    const split = sandbox(configured);
    vm.runInContext(fixture, original.context, { filename: '원본 fixture' });
    sources.forEach((source, index) => vm.runInContext(source, split.context, { filename: files[index] }));
    const result = snapshot(split);
    assert.deepEqual(result, snapshot(original));
    assert.equal(result.functions.length, 49);
    assert.deepEqual(result.events.map(({ target, type }) => ({ target, type })), [
      { target: 'window', type: 'DOMContentLoaded' }
    ]);
    assert.deepEqual(result.timers.map(({ name, delay }) => ({ name, delay })), [
      { name: 'updateClock', delay: 1000 }
    ]);
    assert.deepEqual(result.accesses, ['clockTime', 'clockDate']);
    assert.ok(result.elements.clockTime.textContent);
    assert.ok(result.elements.clockDate.textContent);
    for (const name of ['updateClock', 'buildGridMap', 'renderWeeklyGrid', 'scrollToDayPair',
      'openOverlayItemModal', 'closeOverlayModal', 'openNoticeGuideModal', 'toggleOverlayItemComplete',
      'renderNotices', 'renderAll', 'setChildFilter', 'toggleLessonTooltip', 'toggleNoticeTooltip', 'loadTimetableData']) {
      assert.ok(result.functions.includes(name), `공개 함수 누락: ${name}`);
    }
  });

  for (const count of [1, 2]) {
    test(`${mode}: 앞 ${count}개 파일만 로드해도 뒤 파일 호출·부수 효과가 없다`, () => {
      const sb = sandbox(configured);
      sources.slice(0, count).forEach((source, index) => {
        assert.doesNotThrow(() => vm.runInContext(source, sb.context, { filename: files[index] }));
      });
      const result = snapshot(sb, count);
      assert.deepEqual(result.events, []);
      assert.deepEqual(result.timers, []);
      assert.deepEqual(result.accesses, []);
      assert.equal(result.functions.length, count === 1 ? 25 : 35);
      const laterNames = ['renderAll', 'renderNotices', 'loadTimetableData', 'setChildFilter',
        'toggleLessonTooltip', 'toggleNoticeTooltip'];
      if (count === 1) laterNames.push('renderWeeklyGrid', 'scrollToDayPair', 'openOverlayItemModal');
      for (const name of laterNames) {
        assert.equal(typeof sb.context[name], 'undefined', `뒤 파일 함수 조기 노출: ${name}`);
      }
    });
  }
}
