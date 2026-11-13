import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// 사회방 단원 칩 바(society_unit_bar.js + 공통 unit_chip_bar.js)와 동화 서가 단원 연결의 계약.
const plain = (v) => JSON.parse(JSON.stringify(v));
const U1 = '1. 옛사람들의 삶과 문화';
const U21 = '2-1. 유교 문화의 영향으로 달라진 조선 사회';
const U22 = '2-2. 새로운 사회를 향한 조선 후기 사람들의 노력';
const U31 = '3-1. 식민 통치와 저항으로 달라진 사회와 생활 모습';
const U32 = '3-2. 8·15 광복과 6·25 전쟁으로 달라진 사회와 생활 모습';

const VOCA = [
  { grades: ['5-2'], level: U1, word: '주먹도끼' },
  { grades: ['5-2'], level: U21, word: '유교' },
  { grades: ['5-1'], level: '3-1. 법의 역할과 인권', word: '헌법' },
];
const CURR = {
  history: [{ grades: ['5-2'], level: U1, title: '빗살무늬 토기' }],
  map: [{ grades: ['5-2'], level: U1, title: '벽란도' }],
  chart: [{ grades: ['5-2'], level: U22, title: '상평통보' }, { grades: ['5-1'], level: '3-1. 법의 역할과 인권', title: '법' }],
};

function normalizeSocietyGrade(g) {
  const s = String(g || '').trim();
  if (s === '5-1' || s === '5학년 1학기') return '5-1 (5학년 1학기)';
  if (s === '5-2' || s === '5학년 2학기') return '5-2 (5학년 2학기)';
  return s;
}

function makeElement(attrs = {}) {
  return {
    innerHTML: '', textContent: attrs.text || '', href: attrs.href || '', dataset: { ...(attrs.dataset || {}) },
    classList: { _s: new Set(), toggle(c, on) { on ? this._s.add(c) : this._s.delete(c); }, contains(c) { return this._s.has(c); } },
    closest() { return attrs.card || null; },
  };
}

async function load({ saved } = {}) {
  const store = { currentUser: 'son' };
  if (saved) store.society_unit_pick_son = JSON.stringify(saved);
  const cards = {};
  const badges = {};
  for (const s of ['storybook', 'voca', 'history', 'map', 'chart']) {
    cards[s] = makeElement();
    badges[s] = makeElement({ card: cards[s] });
  }
  const els = {
    societyUnitBar: makeElement(),
    ladderStorybookDesc: makeElement({ dataset: { defaultText: '기본 설명' } }),
    ladderQuestLink: makeElement({ href: '' }),
    ladderQuestDesc: makeElement(),
    societyGoalText: makeElement({ text: '기본 목표' }),
  };
  const calls = [];
  const sandbox = {
    console: { log() {}, warn() {}, error: console.error },
    localStorage: { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); } },
    document: {
      getElementById: (id) => els[id] || null,
      querySelector: (sel) => { const m = /data-count-for="(\w+)"/.exec(sel); return m ? badges[m[1]] : null; },
    },
    normalizeSocietyGrade,
    fetchVocaFromNotion: async () => VOCA,
    fetchCurriculumFromNotion: async (type) => CURR[type] || [],
    getCurriculumRecords: () => [],
    selectSocietyGradeUnit: (g, u) => calls.push(['gradeUnit', g, u]),
    selectDynamicGrade: (g) => calls.push(['grade', g]),
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  for (const file of ['kids/core/unit_chip_bar.js', 'kids/js/society_storybook.js', 'kids/js/society_unit_bar.js']) {
    vm.runInContext(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), sandbox, { filename: file });
  }
  await sandbox.SocietyUnitBar.init();
  return { bar: sandbox.SocietyUnitBar, sb: sandbox.SocietyStorybook, els, cards, badges, calls, store };
}

test('학기 칩은 네 가지 자료(용어·사료·지도·차트)를 합쳐 정규화한 학기로 만든다', async () => {
  const t = await load();
  assert.deepEqual(plain(t.bar._state().grades), ['5-1 (5학년 1학기)', '5-2 (5학년 2학기)']);
  assert.match(t.els.societyUnitBar.innerHTML, />5-2</); // 표시는 짧게
});

test('단원을 고르면 사다리 카드에 그 단원 자료 수를 보여 주고, 자료가 없는 카드는 흐리게 한다', async () => {
  const t = await load({ saved: { grade: '5-2 (5학년 2학기)', unit: U1 } });
  assert.equal(t.badges.voca.textContent, '용어 1개');
  assert.equal(t.badges.history.textContent, '사료 1개');
  assert.equal(t.badges.chart.textContent, '이 단원 자료 준비 중');
  assert.equal(t.cards.chart.classList.contains('is-empty'), true);
  assert.equal(t.cards.voca.classList.contains('is-empty'), false);
  assert.equal(t.badges.storybook.textContent, '동화 3권');
  assert.equal(t.els.societyGoalText.textContent, `📌 [5-2] ${U1}`);
});

test('5분 퀘스트 카드는 고른 단원 원문을 실어 루트 quest_runner.html로 간다', async () => {
  const t = await load({ saved: { grade: '5-2 (5학년 2학기)', unit: U21 } });
  assert.equal(t.els.ladderQuestLink.href, `../../../quest_runner.html?subject=society&user=minsu&unit=${encodeURIComponent(U21)}`);
  t.bar.selectGrade(-1);
  assert.equal(t.els.ladderQuestLink.href, '../../../quest_runner.html?subject=society&user=minsu');
  assert.equal(t.els.societyGoalText.textContent, '기본 목표');
});

test('활동을 열면 고른 단원으로 바로 시작하고, 단원 자료가 없으면 학기만 넘긴다', async () => {
  const t = await load({ saved: { grade: '5-2 (5학년 2학기)', unit: U1 } });
  assert.equal(t.bar.applyToMission(VOCA), true);
  assert.equal(t.bar.applyToMission(CURR.chart), true);
  assert.deepEqual(plain(t.calls), [['gradeUnit', '5-2 (5학년 2학기)', U1], ['grade', '5-2 (5학년 2학기)']]);
});

test('동화 서가의 units 키는 노션 단원 원문과 같고, 단원을 고르면 그 단원 동화만 걸러 보여 준다', async () => {
  const t = await load();
  const known = new Set(['2-1. 우리나라의 기후', U1, U21, U22, U31, U32]);
  for (const book of t.sb.getList()) {
    assert.ok(Array.isArray(book.units) && book.units.length > 0, `${book.id} units 없음`);
    book.units.forEach(u => assert.ok(known.has(u), `${book.id} 모르는 단원 ${u}`));
  }
  const box = makeElement();
  t.sb.render(box, { pick: { grade: '5-2 (5학년 2학기)', unit: U21 } });
  assert.match(box.innerHTML, /조선을 지킨 용기의 불꽃/);
  assert.match(box.innerHTML, /유교 사회 시간 여행/);
  assert.doesNotMatch(box.innerHTML, /고려와 바다 너머/);
  assert.match(box.innerHTML, /전체 서가 보기/);
  const box31 = makeElement();
  t.sb.render(box31, { pick: { grade: '5-2 (5학년 2학기)', unit: U31 } });
  assert.match(box31.innerHTML, /꺾이지 않는 겨레의 불꽃/);
  assert.doesNotMatch(box31.innerHTML, /전차가 멈춘 날에서 6월의 편지까지/);
  const all = makeElement();
  t.sb.render(all);
  assert.match(all.innerHTML, /고려와 바다 너머/);
  assert.doesNotMatch(all.innerHTML, /전체 서가 보기/);
});
