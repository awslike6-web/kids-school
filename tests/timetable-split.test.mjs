// 시간표 분리 규칙: 머리 주석·줄 상한·HTML 로드 순서·참조 버전·공개 API·시계·이벤트·타이머·부분 로드.
// 2026-11-14: 얼린 원본(tests/fixtures/timetable-split)과의 원문 바이트·실행 결과 대조, 전역 함수 개수 고정,
// 정확한 ?v= 값 고정은 정상 수정마다 깨져 뺐다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { root, read, lineCount, assetTags, assertLoadsInOrder, assertInlineHandlersDeclared,
  inlineHandlersDeclaredIn, assertPublicApi } from './split-rules.mjs';

const names = ['timetable_controller.js', 'timetable_grid.js', 'timetable_notices.js'];
const files = names.map(name => `kids/js/${name}`);
const sources = files.map(read);
const htmlPath = 'timetable.html';
const html = read(htmlPath);
// 화면·HTML이 부르는 공개 함수(추가는 자유, 이름 변경·삭제만 실패)
const PUBLIC_API = ['updateClock', 'buildGridMap', 'renderWeeklyGrid', 'scrollToDayPair',
  'openOverlayItemModal', 'closeOverlayModal', 'openNoticeGuideModal', 'toggleOverlayItemComplete',
  'renderNotices', 'renderAll', 'setChildFilter', 'toggleLessonTooltip', 'toggleNoticeTooltip', 'loadTimetableData'];

test('세 파일은 지정 머리 주석을 가지며 각각 600줄 이하이다', () => {
  sources.forEach((source, index) => {
    assert.ok(fs.existsSync(path.join(root, files[index])));
    assert.ok(lineCount(source) <= 600, `${files[index]}: 600줄 초과`);
    const firstNewline = source.indexOf('\n');
    assert.ok(firstNewline >= 0);
    const header = source.slice(0, firstNewline).replace(/\r$/, '');
    assert.ok(header.startsWith(`// kids/js/${names[index]} - timetable_controller.js 분리 ${index + 1}/3: `));
    assert.ok(header.endsWith(' (순서대로 로드)'));
  });
});

test('HTML은 config → notion-timetable 코어 뒤에 세 클래식 태그를 같은 버전·지정 순서로 한 번씩 싣는다', () => {
  assertLoadsInOrder(html, 'script', files, '시간표');
  const urls = assetTags(html, 'script').map(tag => tag.url);
  const at = url => urls.indexOf(url);
  assert.ok(at('kids/config.js') >= 0 && at('kids/core/notion-timetable.js') > at('kids/config.js'));
  assert.ok(at(files[0]) > at('kids/core/notion-timetable.js'), '선행 코어보다 먼저 실림');
});

test('HTML on* 속성이 부르는 함수가 모두 선언되어 있음', () => {
  assertInlineHandlersDeclared(htmlPath);
});

test('운영 소스의 시간표 스크립트 참조는 timetable.html의 버전 있는 태그뿐이다', () => {
  const walk = dir => fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(entry => {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(file);
    return /\.(?:html|js|mjs|cjs)$/.test(entry.name) ? [file] : [];
  });
  const rootFiles = fs.readdirSync(root).filter(file => /\.(?:html|js|mjs|cjs)$/.test(file));
  const refs = [];
  for (const file of [...rootFiles, ...walk('kids'), ...walk('scripts')]) {
    for (const match of read(file).matchAll(/["']((?:\.\/|\.\.\/)*kids\/js\/timetable_(?:controller|grid|notices)\.js[^"']*)["']/g)) {
      assert.match(match[1], /\?v=[^&]+/, `${file}: 버전 없는 참조 ${match[1]}`);
      refs.push({ file, src: match[1].split('?')[0] });
    }
  }
  assert.deepEqual(refs, files.map(file => ({ file: 'timetable.html', src: file })));
});

function sandbox(configured) {
  const events = [], timers = [], accesses = [];
  const elements = { clockTime: { textContent: '' }, clockDate: { textContent: '' } };
  const unexpected = name => () => { throw new Error(`로드 중 예상하지 않은 접근: ${name}`); };
  const register = target => (type, callback) => {
    assert.equal(typeof callback, 'function');
    events.push({ target, type });
  };
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
      timers.push({ name: callback.name, delay });
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
  return { context, events, timers, accesses, elements };
}

for (const configured of [false, true]) {
  const mode = configured ? 'APP_CONFIG 있음' : 'APP_CONFIG 없음';
  test(`${mode}: 전체 로드 후 공개 함수·시계·이벤트·타이머가 갖춰진다`, () => {
    const split = sandbox(configured);
    sources.forEach((source, index) => vm.runInContext(source, split.context, { filename: files[index] }));
    assertPublicApi(split.context, PUBLIC_API, mode);
    const missing = inlineHandlersDeclaredIn(html, sources).filter(name => typeof split.context[name] !== 'function');
    assert.deepEqual(missing, [], 'HTML이 부르는데 로드 뒤 없는 전역 함수');
    assert.deepEqual(split.events, [{ target: 'window', type: 'DOMContentLoaded' }]);
    assert.deepEqual(split.timers, [{ name: 'updateClock', delay: 1000 }]);
    assert.deepEqual(split.accesses, ['clockTime', 'clockDate']);
    assert.ok(split.elements.clockTime.textContent);
    assert.ok(split.elements.clockDate.textContent);
  });

  for (const count of [1, 2]) {
    test(`${mode}: 앞 ${count}개 파일만 로드해도 뒤 파일 호출·부수 효과가 없다`, () => {
      const sb = sandbox(configured);
      sources.slice(0, count).forEach((source, index) => {
        assert.doesNotThrow(() => vm.runInContext(source, sb.context, { filename: files[index] }));
      });
      assert.deepEqual(sb.events, []);
      assert.deepEqual(sb.timers, []);
      assert.deepEqual(sb.accesses, []);
      const laterNames = ['renderAll', 'renderNotices', 'loadTimetableData', 'setChildFilter',
        'toggleLessonTooltip', 'toggleNoticeTooltip'];
      if (count === 1) laterNames.push('renderWeeklyGrid', 'scrollToDayPair', 'openOverlayItemModal');
      for (const name of laterNames) {
        assert.equal(typeof sb.context[name], 'undefined', `뒤 파일 함수 조기 노출: ${name}`);
      }
    });
  }
}
