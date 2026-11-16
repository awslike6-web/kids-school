import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// 국어 용어방 단원 목차 · 정밀 독해 · AI 지문 토론방이 같이 쓰는 「묶음 목록」의 계약 (2026-11-16)
// - 용어방: 「단원」 ' | ' 결합 행은 회차마다 들어가고 결합 버튼이 생기지 않는다. 교과/센터 → 학기로 묶는다.
// - 독해·토론: 트랙 → 학기 묶음, 센터는 순번이 곧 회차 번호, 민서는 5학년 지문을 미리보기로 모은다.
// - 토론방은 정밀 독해와 같은 노션 지문을 읽는다(옛 로컬 파일을 먼저 보여 주지 않는다).

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const plain = (v) => JSON.parse(JSON.stringify(v));

function load(files, extra = {}) {
  const sandbox = {
    console: { log() {}, info() {}, warn() {}, error: console.error },
    setTimeout, clearTimeout,
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    sessionStorage: { getItem: () => null, setItem() {} },
    addEventListener() {},
    ...extra,
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  for (const f of files) vm.runInContext(read(f), sandbox, { filename: f });
  return sandbox;
}

const VOCA = [
  { id: 'a', level: '[센터 5-1] 06번 - 프랑스의 황제, 나폴레옹 1', grades: ['5-1'], grade: '5-1' },
  { id: 'b', level: '[센터 5-1] 19번 - 다른 나라에 물건을 팔아요', grades: ['5-1'], grade: '5-1' },
  { id: 'c', level: '[센터 5-1] 06번 - 프랑스의 황제, 나폴레옹 1 | [센터 5-1] 19번 - 다른 나라에 물건을 팔아요', grades: ['5-1'], grade: '5-1' },
  { id: 'd', level: '[센터 5-1] 12번 - 왜 서로 다른 일을 할까? | [센터 5-2] 14번 - 하늘을 나는 열기구', grades: ['5-1', '5-2'], grade: '5-1' },
  { id: 'e', level: '[센터 5-1] 12번 - 왜 서로 다른 일을 할까?', grades: ['5-1'], grade: '5-1' },
  { id: 'f', level: '[센터 5-2] 14번 - 하늘을 나는 열기구', grades: ['5-2'], grade: '5-2' },
  { id: 'g', level: '4. 의견을 조정해요', grades: ['5-2'], grade: '5-2' },
  { id: 'h', level: '독서 단원. 여러 가지 형태의 책을 읽어요', grades: ['5-2'], grade: '5-2' },
  { id: 'i', level: '0. 중학 생존 지시어', grades: ['5-2'], grade: '5-2' },
  { id: 'j', level: '매체 단원. 판단하며 이용해요', grades: ['5-2'], grade: '5-2' },
];

function vocaGroups(order = new Map()) {
  const sb = load(['kids/subjects/quest/quest-mastery.js', 'kids/js/korean_voca.js']);
  return { sb, groups: sb.KoreanVoca.buildUnitGroups(VOCA, { textbookOrder: order }) };
}

test('용어방: 결합 단원은 나눠서 회차마다 세고, 결합 문자열 버튼은 없다', () => {
  const { groups } = vocaGroups();
  const keys = groups.flatMap(g => g.children.flatMap(c => c.items.map(i => i.id)));
  assert.ok(keys.every(k => !k.includes(' | ')), '결합 문자열이 단원으로 남으면 안 된다');
  const center51 = groups[1].children.find(c => c.id.endsWith('5-1')).items;
  assert.deepEqual(plain(center51.map(i => [i.title, i.meta])), [
    ['06번 - 프랑스의 황제, 나폴레옹 1', '2개'],
    ['12번 - 왜 서로 다른 일을 할까?', '2개'],
    ['19번 - 다른 나라에 물건을 팔아요', '2개'],
  ]);
});

test('용어방: 1·2학기에 걸친 낱말이 있어도 5-1 회차는 5-1 묶음에만 있다', () => {
  const { groups } = vocaGroups();
  const center = groups[1];
  assert.deepEqual(plain(center.children.map(c => c.title)), ['5-2 센터 회차', '5-1 센터 회차']);
  const center52 = center.children[0].items.map(i => i.id);
  assert.deepEqual(plain(center52), ['[센터 5-2] 14번 - 하늘을 나는 열기구']);
});

test('용어방: 교과 단원은 독해 DB 순번 순서, 독해 지문이 없는 단원은 앞에 글자순', () => {
  const order = new Map([['독서 단원. 여러 가지 형태의 책을 읽어요', 101], ['매체 단원. 판단하며 이용해요', 141], ['4. 의견을 조정해요', 151]]);
  const { groups } = vocaGroups(order);
  assert.equal(groups[0].title, '교과 단원');
  assert.deepEqual(plain(groups[0].children[0].items.map(i => i.id)), [
    '0. 중학 생존 지시어', '독서 단원. 여러 가지 형태의 책을 읽어요', '매체 단원. 판단하며 이용해요', '4. 의견을 조정해요',
  ]);
  assert.equal(groups[0].children[0].open, true, '최신 학기 교과 단원은 펼친 채로 시작');
});

test('용어방: 퀴즈 거르기는 결합 행도 각 회차에 포함한다', () => {
  const { sb } = vocaGroups();
  const unit = '[센터 5-1] 19번 - 다른 나라에 물건을 팔아요';
  assert.deepEqual(VOCA.filter(r => sb.KoreanVoca.recordHasUnit(r, unit)).map(r => r.id), ['b', 'c']);
});

const PASSAGES = [
  { id: 'c14', title: '하늘을 나는 열기구', track: '🏥 센터 독해', unit: '2학기 14번', order: 14, grade: '5-2', student: ['민수'], questions: [{}, {}] },
  { id: 'c05', title: '자기만 알던 거인', track: '🏥 센터 독해', unit: '1학기 5번', order: 5, grade: '5-1', student: ['민수'], questions: [] },
  { id: 't1', title: '달라져 온 책', track: '🏫 교과서 독해', unit: '독서 단원. 여러 가지 형태의 책을 읽어요', order: 101, grade: '5-2', student: ['민수'], questions: [] },
  { id: 'm1', title: '물건은 제자리에', track: '🌱 민서 미니 독해', unit: '2단원', order: 21, grade: '1-2', student: ['민서'], questions: [] },
  { id: 'e6', title: 'Exciting Summer Plans (6단원)', track: '🏫 교과서 독해', unit: '6단원', order: 2, grade: '5-1', student: ['민수'], questions: [] },
];

function readingEngine() {
  return load(['kids/core/grouped_list.js', 'kids/core/reading_engine.js']).ReadingEngine;
}

test('독해·토론: 트랙(교과서 → 센터) → 학기(최신 먼저), 센터 줄 번호는 순번', () => {
  const groups = readingEngine().buildPassageGroups(PASSAGES.filter(p => !p.id.startsWith('e')), { student: '민수' });
  // 민수에게 민서 미니 독해는 자기 지문이 아니라 맨 아래 접힌 묶음으로 간다
  assert.deepEqual(plain(groups.map(g => g.title)), ['🏫 교과서 독해', '🏥 센터 독해', '다른 학년 지문']);
  const center = groups.find(g => g.title === '🏥 센터 독해');
  assert.deepEqual(plain(center.children.map(c => [c.title, c.open])), [['5-2', true], ['5-1', false]]);
  assert.deepEqual(plain(center.children[0].items[0]), { id: 'c14', num: '14번', section: '', title: '하늘을 나는 열기구', meta: '2문항', summary: '' });
  const textbook = groups.find(g => g.title === '🏫 교과서 독해');
  assert.equal(textbook.children[0].items[0].section, '독서 단원. 여러 가지 형태의 책을 읽어요');
});

test('독해·토론: 민서는 자기 지문을 위에, 5학년 지문은 접힌 미리보기로', () => {
  const groups = readingEngine().buildPassageGroups(PASSAGES.filter(p => !p.id.startsWith('e')), { student: '민서' });
  assert.equal(groups[0].title, '🌱 민서 미니 독해');
  const preview = groups[groups.length - 1];
  assert.equal(preview.title, '5학년 미리보기');
  assert.equal(preview.open, false);
  assert.equal(preview.children.flatMap(c => c.children.flatMap(s => s.items)).length, 3);
});

test('독해·토론: 영어 로비에서 고른 단원은 맨 위에 펼치고, 없으면 준비 중 안내', () => {
  const engine = readingEngine();
  const hit = engine.buildPassageGroups(PASSAGES, { student: '민수', highlight: { grade: '5-1', unit: '6단원' } });
  assert.equal(hit[0].id, 'picked');
  assert.deepEqual(plain(hit[0].items.map(i => i.id)), ['e6']);
  const miss = engine.buildPassageGroups(PASSAGES, { student: '민수', highlight: { grade: '5-2', unit: '9단원' } });
  assert.equal(miss[0].items.length, 0);
  assert.match(miss[0].note, /준비 중/);
  assert.ok(miss.length > 1, '안내 아래에 다른 지문 묶음은 그대로 남는다');
});

test('묶음 목록: 글자를 이스케이프하고, 마지막으로 고른 줄이 있는 묶음을 펼친다', () => {
  const sb = load(['kids/core/grouped_list.js']);
  const { html, items } = sb.GroupedList.buildHtml([
    { id: 'a', title: '<b>교과</b>', open: false, items: [{ id: 'x1', title: '"따옴표" & <꺾쇠>' }] },
    { id: 'b', title: '센터', open: false, items: [{ id: 'x2', title: '둘' }] },
  ], { lastItemId: 'x2', expandable: true });
  assert.equal(items.length, 2);
  assert.doesNotMatch(html, /<b>교과<\/b>/);
  assert.match(html, /&quot;따옴표&quot; &amp; &lt;꺾쇠&gt;/);
  assert.match(html, /data-gl-group="b" open/);
  assert.doesNotMatch(html, /data-gl-group="a" open/);
});

test('토론방은 정밀 독해와 같은 노션 지문을 읽는다 (옛 추천 10건·로컬 파일 우선 경로 제거)', () => {
  const korean = read('kids/js/korean_common.js') + read('kids/js/korean_sentence.js');
  assert.doesNotMatch(korean, /fetchLibraryBooksFromNotion\(|resolveReadingPassageList\(/);
  assert.match(read('kids/js/korean_sentence.js'), /loadPassages\('국어'\)/);
  const english = read('kids/js/english_common.js');
  assert.doesNotMatch(english, /ENGLISH_READING_DATABASE/);
  assert.match(read('kids/js/english_chat.js'), /loadPassages\('영어'\)/);
  assert.doesNotMatch(read('kids/data/english-reading-data.js'), /The Lion and the Mouse/);
});
