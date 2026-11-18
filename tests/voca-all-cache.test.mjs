// 어휘 캐시 한 벌(ALL) 공유 (2026-11-19): 로비가 전체를 한 번 미리 받고, 아이별 화면은 그 캐시를 걸러 쓴다.
// 예전엔 로비가 아이 캐시만 받아서 용어사전방(전체)이 매일 첫 방문마다 노션 23쪽을 다시 받았다(약 15초).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { read } from './split-rules.mjs';

const RECORDS = [
    { id: 'a', word: 'bank', meaning: '은행', target: ['민수'], subject: ['영어'] },
    { id: 'b', word: '받침', meaning: '글자 아래', target: ['민서'], subject: ['국어'] },
    { id: 'c', word: '공통말', meaning: '둘 다', target: ['민수', '민서'], subject: ['국어'] },
    { id: 'd', word: 'mouse', meaning: '쥐', target: [], subject: ['영어'] }
];

function load({ caches = {} } = {}) {
    const fetches = [];
    const storage = new Map();
    const win = {
        currentUserName: '민수', currentProfile: 'son',
        _loadVocaFromCache: (name) => caches[name] || null,
        _saveVocaToCache: () => {}
    };
    const ctx = {
        window: win, console, setTimeout, Promise, Map, Date, JSON,
        localStorage: { getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, String(v)), removeItem: k => storage.delete(k), key: () => null, length: 0 },
        fetch: async (url, opts) => { fetches.push(JSON.parse(opts.body)); return { ok: true, json: async () => ({ results: [], has_more: false }) }; }
    };
    win.fetch = ctx.fetch;
    vm.createContext(ctx);
    vm.runInContext(read('kids/core/notion-api-client.js'), ctx);
    return { win, fetches };
}

test('아이 캐시가 없으면 전체(ALL) 캐시를 그 아이 낱말로 걸러 쓰고 노션을 부르지 않는다', async () => {
    const { win, fetches } = load({ caches: { ALL: RECORDS } });
    const minsu = await win.fetchVocaFromNotion({ studentName: '민수' });
    assert.equal(fetches.length, 0);
    assert.equal(minsu.map(r => r.word).join(','), 'bank,공통말');
    const minseo = await win.fetchVocaFromNotion({ studentName: '민서', subject: '국어' });
    assert.equal(minseo.map(r => r.word).join(','), '받침,공통말');
});

test('학생 칸이 빈 행은 아이 목록에 넣지 않는다 (서버 학생 필터와 같게)', async () => {
    const { win } = load({ caches: { ALL: RECORDS } });
    const minsu = await win.fetchVocaFromNotion({ studentName: '민수', subject: '영어' });
    assert.equal(minsu.map(r => r.word).join(','), 'bank');
});

test('용어사전방(전체)은 ALL 캐시를 그대로, 캐시가 전혀 없으면 노션을 부른다', async () => {
    const { win, fetches } = load({ caches: { ALL: RECORDS } });
    const all = await win.fetchVocaFromNotion({ studentName: '민수', filterByStudent: false });
    assert.equal(all.length, 4);
    assert.equal(fetches.length, 0);
    const empty = load();
    await empty.win.fetchVocaFromNotion({ studentName: '민수' });
    assert.equal(empty.fetches.length, 1);
});

test('로비 미리 불러오기는 전체(ALL)를 받고 ALL 캐시가 있으면 건너뛴다', () => {
    const src = read('kids/core/notion-cache-manager.js');
    const body = src.slice(src.indexOf('async function prefetchVocaData'), src.indexOf('async function prefetchReadingData'));
    assert.match(body, /_loadVocaFromCache\('ALL', dbId\)/);
    assert.match(body, /fetchVocaFromNotion\(\{[^}]*filterByStudent: false/);
});
