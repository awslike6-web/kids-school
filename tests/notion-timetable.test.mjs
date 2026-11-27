// 시간표 모듈(kids/core/notion-timetable.js) 실제 동작 — 가짜 fetch로 (2026-11-27 리팩토링 묶음 D, 카본 검토 반영)
// ① 여러 쪽 조회: 쪽마다 정렬(sorts)을 보내고 행을 다 모은다 ② 알림 행 본문은 notion-api-client.js의 본문 읽기로 채운다
// ③ api-client가 없어도 조회한 행은 그대로 돌려준다 ④ 공개 이름만 전역에 나오고 상수는 숨는다 ⑤ notion-helper 감싸개가 모듈을 기다려 위임한다
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const plain = v => JSON.parse(JSON.stringify(v)); // vm 영역의 값을 이쪽 값으로
const read = rel => fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const PUBLIC = ['parseTimetablePeriodSlot', 'inferPeriodNumFromDate', 'parseTimetablePage', 'fetchTimetableFromNotion',
    'fetchDualTimetableFromNotion', 'updateTimetableItemComplete', 'loadTimetableFromCache', 'saveTimetableToCache', 'clearTimetableCache'];

const page = (id, props) => ({ id, created_time: '2026-11-01T00:00:00.000Z', properties: props });
const lesson = id => page(id, { '교시': { select: { name: '2교시' } }, '수업': { title: [{ plain_text: '국어' }] }, '요일': { select: { name: '월' } } });
const notice = id => page(id, { '제목': { title: [{ plain_text: '학예회 안내' }] }, '메모': { rich_text: [] } });

function sandbox({ withApiClient = true } = {}) {
    const calls = [];
    const store = new Map();
    const ctx = {
        APP_CONFIG: { WORKER_PROXY_URL: 'https://proxy.test' }, console: { log() {}, warn() {}, error() {} },
        localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) },
        URLSearchParams,
        fetch: async (url, opts = {}) => {
            calls.push({ url: String(url), method: opts.method || 'GET', body: opts.body ? JSON.parse(opts.body) : null });
            if (String(url).includes('/query')) {
                const second = calls.filter(c => c.url.includes('/query')).length === 2;
                return { ok: true, json: async () => (second
                    ? { results: [notice('n1')], has_more: false, next_cursor: null }
                    : { results: [lesson('l1')], has_more: true, next_cursor: 'c2' }) };
            }
            if (String(url).includes('/blocks/n1/children')) {
                return { ok: true, json: async () => ({ results: [{ type: 'paragraph', paragraph: { rich_text: [{ plain_text: '강당 10시' }] } }], has_more: false }) };
            }
            return { ok: true, json: async () => ({ results: [], has_more: false }) };
        }
    };
    ctx.window = ctx;
    vm.createContext(ctx);
    if (withApiClient) vm.runInContext(read('kids/core/notion-api-client.js'), ctx);
    vm.runInContext(read('kids/core/notion-timetable.js'), ctx);
    return { ctx, calls };
}

test('① 여러 쪽 조회는 쪽마다 정렬을 보내고 ② 알림 행 본문을 api-client 본문 읽기로 채운다', async () => {
    const { ctx, calls } = sandbox();
    const rows = await ctx.fetchTimetableFromNotion({ dbId: 'db1' });
    const queries = calls.filter(c => c.url.includes('/v1/databases/db1/query'));
    assert.equal(queries.length, 2);
    for (const q of queries) assert.deepEqual(q.body.sorts, [{ timestamp: 'created_time', direction: 'ascending' }]);
    assert.equal(queries[1].body.start_cursor, 'c2');
    assert.deepEqual(plain(rows.map(r => r.id)), ['l1', 'n1']);
    assert.equal(rows.find(r => r.id === 'n1').pageContent, '강당 10시');
    assert.equal(rows.find(r => r.id === 'l1').periodNum, 2);
    assert.ok(!calls.some(c => c.url.includes('/blocks/l1')), '교시 있는 행은 본문을 읽지 않음');
});

test('③ notion-api-client.js가 없어도 조회한 행은 그대로 (본문 보강만 건너뜀)', async () => {
    const { ctx } = sandbox({ withApiClient: false });
    const rows = await ctx.fetchTimetableFromNotion({ dbId: 'db1' });
    assert.deepEqual(plain(rows.map(r => r.id)), ['l1', 'n1']);
    assert.equal(rows.find(r => r.id === 'n1').pageContent, '');
});

test('④ 공개 이름 9개만 전역·이름표에 나오고 상수·보조 함수는 숨는다', () => {
    const { ctx } = sandbox();
    for (const n of PUBLIC) {
        assert.equal(typeof ctx[n], 'function', n);
        assert.equal(ctx.NotionTimetable[n], ctx[n], n);
    }
    for (const hidden of ['PROXY_URL', 'TIMETABLE_DB_ID', 'TIMETABLE_CACHE_KEY', 'TIMETABLE_STABLE_SORTS', 'isTimetableNoticeCandidate', 'enrichTimetableRowsWithPageContent']) {
        assert.ok(!(hidden in ctx), `${hidden}가 전역에 새어 나옴`);
    }
    assert.ok(!('fetchTimetableFromNotion' in ctx.NotionApiClient), 'api-client에 시간표 사본이 다시 생김');
});

test('⑤ notion-helper 감싸개는 시간표 모듈이 실릴 때까지 기다렸다 위임한다', async () => {
    const helper = read('kids/core/notion-helper.js').replace(/\r\n/g, '\n'); // 줄바꿈 차이 무시
    const pick = head => {
        const at = helper.indexOf(head);
        return helper.slice(at, helper.indexOf('\n}\n', at) + 3);
    };
    const ctx = { console, setInterval, clearInterval, Date };
    ctx.window = ctx;
    vm.createContext(ctx);
    vm.runInContext(pick('function _waitForModule(') + pick('async function fetchDualTimetableFromNotion('), ctx);
    const early = ctx.fetchDualTimetableFromNotion(); // 아직 모듈 없음 → 기다림
    setTimeout(() => { ctx.NotionTimetable = { fetchDualTimetableFromNotion: async () => ({ allRows: ['ok'] }) }; }, 60);
    assert.deepEqual(plain(await early), { allRows: ['ok'] });
    assert.match(helper, /'notion-api-client\.js\?v=[0-9a-f]{8}',[^\n]*\n\s*'notion-timetable\.js\?v=[0-9a-f]{8}'/, '자동 로더에서 api-client 바로 뒤에 시간표 모듈');
});

test('timetable.html은 notion-api-client.js를 notion-timetable.js보다 먼저 싣는다', () => {
    const html = read('timetable.html');
    const api = html.indexOf('kids/core/notion-api-client.js'), tt = html.indexOf('kids/core/notion-timetable.js');
    assert.ok(api >= 0 && tt > api);
});
