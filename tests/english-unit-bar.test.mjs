import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// 영어방 단원 칩 바(english_unit_bar.js)의 계약:
// 학기·단원은 VOCA 원문 그대로, 아이별 기억, 고른 단원으로 2~4단계 바로 시작, 특별 활동은 등록된 단원에만.
const RECORDS = [
  { grades: ['5-2'], level: 'L8', word: 'curly', wordType: '단어' },
  { grades: ['5-2'], level: 'L10', word: 'early', wordType: '단어' },
  { grades: ['5-2'], level: 'L9', word: 'sofa', wordType: '단어' },
  { grades: ['5-1'], level: 'L1', word: 'hello', wordType: '단어' },
  { grades: ['공통'], level: '기본 단원', word: 'yes', wordType: '단어' },
];

const plain = (v) => JSON.parse(JSON.stringify(v));

function load({ profile = 'son', saved, activities = [] } = {}) {
  const store = { currentUser: profile };
  if (saved) store[`english_unit_pick_${profile}`] = JSON.stringify(saved);
  const box = { innerHTML: '' };
  const calls = [];
  const sandbox = {
    console: { log() {}, warn() {}, error: console.error },
    localStorage: {
      getItem: (k) => store[k] ?? null,
      setItem: (k, v) => { store[k] = String(v); },
    },
    document: { getElementById: (id) => (id === 'englishUnitBar' ? box : null) },
    fetchVocaFromNotion: async () => RECORDS,
    selectDynamicGradeUnit: (g, u) => calls.push(['gradeUnit', g, u]),
    selectDynamicGrade: (g) => calls.push(['grade', g]),
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  for (const file of ['kids/subjects/english/data/english_unit_activities.js', 'kids/core/unit_chip_bar.js', 'kids/js/english_unit_bar.js']) {
    vm.runInContext(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), sandbox, { filename: file });
  }
  sandbox.ENGLISH_UNIT_ACTIVITIES.push(...activities);
  return { bar: sandbox.EnglishUnitBar, box, store, calls };
}

test('학기 칩은 VOCA 학년 원문으로 만들고 공통은 뺀다', async () => {
  const { bar, box } = await (async () => { const t = load(); await t.bar.init(); return t; })();
  assert.deepEqual(plain(bar._state().grades), ['5-1', '5-2']);
  assert.match(box.innerHTML, />전체</);
  assert.doesNotMatch(box.innerHTML, /공통/);
  assert.deepEqual(plain(bar.getPick()), { grade: '', unit: '' });
});

test('단원 칩은 숫자 순서로 정렬하고 L8은 8단원으로 보여 준다', async () => {
  const t = load();
  await t.bar.init();
  t.bar.selectGrade(t.bar._state().grades.indexOf('5-2'));
  assert.deepEqual(plain(t.bar._state().units), ['L8', 'L9', 'L10']);
  assert.match(t.box.innerHTML, />8단원</);
  assert.match(t.box.innerHTML, />10단원</);
});

test('고른 학기·단원은 아이별 키에 기억한다', async () => {
  const t = load({ profile: 'daughter' });
  await t.bar.init();
  t.bar.selectGrade(t.bar._state().grades.indexOf('5-2'));
  t.bar.selectUnit(t.bar._state().units.indexOf('L9'));
  assert.deepEqual(JSON.parse(t.store.english_unit_pick_daughter), { grade: '5-2', unit: 'L9' });
  assert.equal(t.store.english_unit_pick_son, undefined);
});

test('노션에서 사라진 단원을 기억하고 있으면 전체 보기로 되돌린다', async () => {
  const t = load({ saved: { grade: '5-2', unit: 'L99' } });
  await t.bar.init();
  assert.deepEqual(plain(t.bar.getPick()), { grade: '5-2', unit: '' });
});

test('단원을 골라 두면 2~4단계가 그 단원으로 바로 시작한다', async () => {
  const t = load({ saved: { grade: '5-2', unit: 'L8' } });
  await t.bar.init();
  assert.equal(t.bar.applyToMission(RECORDS), true);
  assert.deepEqual(plain(t.calls), [['gradeUnit', '5-2', 'L8']]);
});

test('그 단원에 이 단계 문제가 없으면 학기만 넘겨 단원 선택 화면을 보여 준다', async () => {
  const t = load({ saved: { grade: '5-2', unit: 'L8' } });
  await t.bar.init();
  const onlyL9 = RECORDS.filter(r => r.level === 'L9');
  assert.equal(t.bar.applyToMission(onlyL9), true);
  assert.deepEqual(plain(t.calls), [['grade', '5-2']]);
});

test('전체 보기이거나 그 학기 문제가 없으면 원래 선택 화면으로 둔다', async () => {
  const t = load();
  await t.bar.init();
  assert.equal(t.bar.applyToMission(RECORDS), false);
  const t2 = load({ saved: { grade: '5-1', unit: 'L1' } });
  await t2.bar.init();
  assert.equal(t2.bar.applyToMission(RECORDS.filter(r => r.grades[0] === '5-2')), false);
  assert.deepEqual(plain(t2.calls), []);
});

test('특별 활동 칸은 등록된 학기·단원을 골랐을 때만 보이고 단원 값을 주소에 붙인다', async () => {
  const act = { grade: '5-2', unit: 'L8', icon: '👕', title: '듣고 입혀 주기', desc: '<b>설명</b>', href: 'listen_place.html' };
  const t = load({ saved: { grade: '5-2', unit: 'L9' }, activities: [act] });
  await t.bar.init();
  assert.doesNotMatch(t.box.innerHTML, /이번 단원 특별 활동/);
  t.bar.selectUnit(t.bar._state().units.indexOf('L8'));
  assert.match(t.box.innerHTML, /이번 단원 특별 활동/);
  assert.match(t.box.innerHTML, /href="listen_place\.html\?grade=5-2&amp;unit=L8"/);
  assert.match(t.box.innerHTML, /&lt;b&gt;설명&lt;\/b&gt;/);
});
