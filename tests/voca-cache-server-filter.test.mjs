import test from 'node:test';
import assert from 'node:assert/strict';
import { loadBrowserScripts } from './browser-sandbox.mjs';

// 2026-11-06 버그: 사회·과학 용어방이 서버 필터(과목+영역)로 받은 일부 결과를
// 아이 전체 VOCA 당일 캐시에 저장해서, 같은 날 영어방이 영어 단어 0개를 보았다.
function memoryStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); },
    key: (i) => [...m.keys()][i] ?? null,
    get length() { return m.size; },
    _map: m,
  };
}

const page = (subject, zone, word) => ({
  id: `p-${word}`,
  created_time: '2026-11-06T00:00:00.000Z',
  properties: {
    단어: { type: 'title', title: [{ plain_text: word }] },
    과목: { type: 'multi_select', multi_select: [{ name: subject }] },
    "영역 분류": { type: "select", select: { name: zone } },
    학생: { type: 'multi_select', multi_select: [{ name: '민수' }] },
    학년: { type: 'multi_select', multi_select: [{ name: '5-2' }] },
    단원: { type: 'rich_text', rich_text: [{ plain_text: '1단원' }] },
  },
});

function setup() {
  const storage = memoryStorage();
  const all = [page('사회', '용어방', '유교'), page('영어', '단어장', 'curly')];
  const fetch = async (url, options = {}) => {
    const body = options.body ? JSON.parse(options.body) : {};
    const serverFiltered = JSON.stringify(body.filter || {}).includes('사회');
    const results = serverFiltered ? all.filter(p => p.properties.과목.multi_select[0].name === '사회') : all;
    return { ok: true, status: 200, json: async () => ({ results, has_more: false }) };
  };
  const { sandbox } = loadBrowserScripts(['kids/core/notion-voca.js'], { storage, fetch });
  const cacheKeys = () => [...storage._map.keys()].filter(k => k.includes('_VOCA_CACHE_'));
  return { sandbox, cacheKeys };
}

test('서버 필터로 받은 사회 용어는 아이 전체 VOCA 캐시에 저장하지 않는다', async () => {
  const { sandbox, cacheKeys } = setup();
  const society = await sandbox.fetchVocaFromNotion({ subject: '사회', areaZone: '용어방', useServerFilter: true, filterByStudent: true, studentName: '민수' });
  assert.equal(society.length, 1);
  assert.deepEqual(cacheKeys(), []);
  const english = await sandbox.fetchVocaFromNotion({ subject: '영어', filterByStudent: true, studentName: '민수' });
  assert.equal(english.length, 1, '사회방을 먼저 열어도 영어 단어가 보여야 한다');
});

test('필터 없이 받은 전체 결과는 예전처럼 당일 캐시에 저장한다', async () => {
  const { sandbox, cacheKeys } = setup();
  await sandbox.fetchVocaFromNotion({ subject: '영어', filterByStudent: true, studentName: '민수' });
  assert.equal(cacheKeys().length, 1);
});
