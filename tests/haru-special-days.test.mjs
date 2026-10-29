// ========================================================
// ✅ 하루방 특별한 날 원천·아이별 거르기 시험 (node --test)
// - 하루방은 kids/data/special-days-data.js 하나만 원천으로 읽는다 (갤러리 특별한 날 탭과 같은 목록).
//   예전에는 haru_data.js에 따로 목록이 있어 두 목록이 갈라졌다(2026-10-29).
// - 지금 아이의 행사 + 공동·공통·아빠·엄마 행사만 보이고, 예전 localStorage 이야기·제목 수정은 그대로 산다.
// ========================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { loadBrowserScripts } from './browser-sandbox.mjs';

const read = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const SCRIPTS = [
  'kids/data/special-days-data.js',
  'kids/subjects/haru/data/haru_data.js',
  'kids/subjects/haru/js/haru-special-days.js',
];
const SHARED = ['공동', '공통', '아빠', '엄마'];
// 실제 데이터에 아직 없는 작성자(민수 개인·아빠) 행사는 시험 안에서만 덧붙인다
const EXTRA_EVENTS = [
  { id: 'evt_minsu_test_only_20261030', author: '민수', title: '민수 시험 행사', date: '2026-10-30', desc: '' },
  { id: 'evt_together_dad_test_20261029', author: '아빠', title: '아빠 시험 행사', date: '2026-10-29', desc: '' },
];

function openHaru(child, saved = {}) {
  const store = { ...saved };
  const storage = {
    getItem: (k) => store[k] ?? null,
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
  };
  const { sandbox } = loadBrowserScripts(SCRIPTS, { storage });
  sandbox.currentChild = child;
  vm.runInContext(`DEFAULT_SPECIAL_DAYS_DATA.push(...${JSON.stringify(EXTRA_EVENTS)})`, sandbox);
  const master = vm.runInContext('DEFAULT_SPECIAL_DAYS_DATA', sandbox);
  const stories = JSON.parse(JSON.stringify(sandbox.getSpecialStories()));
  return { master: JSON.parse(JSON.stringify(master)), stories, store };
}

test('하루방은 special-days-data.js를 상대 경로로 먼저 싣고 haru_data.js에는 행사 목록이 없다', () => {
  const html = read('kids/subjects/haru/haru.html');
  const dataAt = html.search(/<script src="\.\.\/\.\.\/data\/special-days-data\.js\?v=[^"]+"><\/script>/);
  const engineAt = html.indexOf('js/haru-special-days.js');
  assert.ok(dataAt > 0, 'haru.html이 ../../data/special-days-data.js?v=...를 싣지 않습니다');
  assert.ok(dataAt < engineAt, 'special-days-data.js는 haru-special-days.js보다 먼저 실려야 합니다');

  const { sandbox } = loadBrowserScripts(['kids/subjects/haru/data/haru_data.js']);
  const specialDays = vm.runInContext('window.HARU_DATA.specialDays', sandbox);
  assert.ok(specialDays.title, 'specialDays.title은 유지합니다');
  assert.equal(specialDays.defaultEvents, undefined, 'haru_data.js에 defaultEvents가 다시 생겼습니다');
  assert.doesNotMatch(read('kids/subjects/haru/js/haru-special-days.js'), /defaultEvents/);
});

test('민서 방: 민서 행사 + 공동·부모 행사만, 민수 개인 행사와 예시 3건은 없다', () => {
  const { master, stories } = openHaru('minseo');
  const expected = master.filter(e => e.author === '민서' || SHARED.includes(e.author)).map(e => e.id).sort();
  assert.deepEqual(stories.map(s => s.id).sort(), expected);
  assert.ok(stories.every(s => s.author !== '민수'), '민서 방에 민수 개인 행사가 보입니다');
  for (const id of ['evt_minseo_pet_trainer_20261022', 'evt_school_flea_market_20261021', 'evt_family_20261018_opening', 'evt_together_dad_test_20261029']) {
    assert.ok(stories.some(s => s.id === id), `${id}가 민서 방에 없습니다`);
  }
  for (const id of ['evt_children', 'evt_picnic', 'evt_christmas']) {
    assert.ok(!stories.some(s => s.id === id), `예시 ${id}가 다시 보입니다`);
  }
  const dates = stories.map(s => s.date);
  assert.deepEqual(dates, [...dates].sort().reverse(), '최근 행사가 위에 오지 않습니다');
});

test('민수 방: 민수 행사 + 공동·부모 행사만, 민서 개인 행사는 없다', () => {
  const { stories } = openHaru('minsu');
  assert.ok(stories.some(s => s.id === 'evt_minsu_test_only_20261030'));
  assert.ok(stories.some(s => s.id === 'evt_family_20261018_opening'), '공동 행사가 민수 방에 없습니다');
  assert.ok(stories.some(s => s.id === 'evt_together_dad_test_20261029'), '아빠 행사가 민수 방에 없습니다');
  assert.ok(stories.every(s => s.author !== '민서'), '민수 방에 민서 개인 행사가 보입니다');
});

test('예전 localStorage 이야기·제목 수정·갤러리 메타는 그대로 살고 예시 3건은 사라진다', () => {
  const saved = {
    haru_special_stories_minseo: JSON.stringify([
      { id: 'evt_custom_1730000000000', title: '✨ 민서가 쓴 이야기', date: '2026-10-01', desc: '직접 썼어요' },
      { id: 'evt_minseo_peanut_20260910', title: '땅콩 캤어요', _userEditedTitle: true },
      { id: 'evt_children', title: '🎈 놀이동산과 선물 가득 어린이날' },
    ]),
    SPECIAL_DAYS_CUSTOM_META: JSON.stringify({ evt_minseo_horse_20260922: { desc: '갤러리에서 고친 설명' } }),
  };
  const { stories } = openHaru('minseo', saved);
  assert.equal(stories[0].id, 'evt_custom_1730000000000', '아이가 쓴 이야기가 맨 위에 없습니다');
  assert.equal(stories.find(s => s.id === 'evt_minseo_peanut_20260910').title, '땅콩 캤어요');
  assert.equal(stories.find(s => s.id === 'evt_minseo_horse_20260922').desc, '갤러리에서 고친 설명');
  assert.ok(!stories.some(s => s.id === 'evt_children'));
});
