import test from 'node:test';
import assert from 'node:assert/strict';
import { loadBrowserScripts } from './browser-sandbox.mjs';

const SOURCE = 'kids/core/study-log-store.js', FIRST_SEED = 20261028, RUNS = 100;
const CHILD = '민수', CACHE = `MINMIN_STUDY_DAYS_V2_${CHILD}`;
function random(seed) {
  return () => {
    let n = seed += 0x6D2B79F5;
    n = Math.imul(n ^ n >>> 15, n | 1);
    n ^= n + Math.imul(n ^ n >>> 7, n | 61);
    return ((n ^ n >>> 14) >>> 0) / 4294967296;
  };
}
const integer = (rng, max) => Math.floor(rng() * (max + 1));
const choose = (rng, list) => list[integer(rng, list.length - 1)];
const plain = value => JSON.parse(JSON.stringify(value));
function shift(date, days) {
  const [y, m, d] = date.split('-').map(Number), value = new Date(Date.UTC(y, m - 1, d + days));
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}-${String(value.getUTCDate()).padStart(2, '0')}`;
}
function equal(rule, actual, expected, detail) {
  assert.deepEqual(plain(actual), plain(expected), `${rule}: ${detail}; 기대=${JSON.stringify(expected)}, 실제=${JSON.stringify(actual)}`);
}
function referenceStreak(days, today) {
  const studiedToday = days.includes(today), start = studiedToday ? 0 : 1;
  let count = 0;
  for (let offset = start; days.includes(shift(today, -offset)); offset++) count++;
  const lastDate = days.reduce((latest, date) => !latest || date > latest ? date : latest, null);
  return { count, studiedToday, lastDate };
}

const PAGE_IDS = 'MINMIN_STUDY_LOG_PAGES_V1';
function storage() {
  const rows = new Map();
  return { getItem: key => rows.get(key) ?? null, setItem: (key, value) => rows.set(key, String(value)), removeItem: key => rows.delete(key) };
}
function locks() {
  const queues = new Map();
  return { request(name, fn) {
    const next = (queues.get(name) || Promise.resolve()).catch(() => {}).then(fn);
    queues.set(name, next); return next;
  } };
}
function fixture(rng, today = '2026-10-28', { cache = false } = {}) {
  const pages = [], calls = [], warnings = [], timers = [], clock = { now: Date.parse(`${today}T12:00:00+09:00`) };
  const isolates = Array.from({ length: 2 + integer(rng, 1) }, () => new Map());
  const failures = { query: [], get: [], write: [] }; let serial = 0;
  const response = (body, status = 200) => ({ ok: status < 400, status, json: async () => plain(body) });
  const wait = async () => { for (let n = integer(rng, 4); n > 0; n--) await Promise.resolve(); };
  const fetch = async (address, options = {}) => {
    const url = new URL(address), method = options.method || 'GET', body = JSON.parse(options.body || '{}');
    const isolateIndex = integer(rng, isolates.length - 1), isolate = isolates[isolateIndex];
    const query = url.pathname.endsWith('/query'), get = method === 'GET';
    const kind = query ? 'query' : get ? 'get' : 'write';
    const call = { url: address, method, body, isolate: isolateIndex, kind }; calls.push(call);
    const failure = failures[kind].shift();
    if (failure) {
      await wait();
      if (failure === 'throw') throw new Error('모의 통신 예외');
      return response({}, Number(failure));
    }
    if (query || get) {
      const key = `${method}:${url.pathname}:${options.body || ''}`, cached = isolate.get(key);
      if (cache && url.searchParams.get('force') !== 'true' && cached?.expires > clock.now) {
        call.cache = 'HIT'; await wait(); return response(cached.body, cached.status);
      }
      call.cache = 'MISS';
      let result, status = 200;
      if (query) {
        const key = body.filter.title.equals;
        result = { results: pages.filter(p => !p.archived && !p.in_trash && p.properties.ID.title[0].text.content === key).map(plain) };
      } else {
        const page = pages.find(p => p.id === url.pathname.substring(url.pathname.lastIndexOf('/') + 1));
        result = page ? plain(page) : {}; if (!page) status = 404;
      }
      await wait();
      if (cache) isolate.set(key, { body: plain(result), status, expires: clock.now + 300000 });
      return response(result, status);
    }
    await wait(); isolate.clear();
    if (method === 'PATCH') {
      const page = pages.find(p => p.id === url.pathname.substring(url.pathname.lastIndexOf('/') + 1));
      assert.ok(page, '모의 페이지가 없습니다'); Object.assign(page.properties, plain(body.properties));
      return response(page);
    }
    assert.equal(method, 'POST'); assert.equal(url.pathname, '/v1/pages');
    const page = { id: `page_${++serial}`, properties: plain(body.properties) }; pages.push(page);
    return response(page);
  };
  function client({ store = storage(), lockManager } = {}) {
    const { sandbox } = loadBrowserScripts([SOURCE], { fetch, storage: store });
    sandbox.navigator = lockManager ? { locks: lockManager } : {};
    sandbox.console.warn = (...args) => warnings.push(args.map(String).join(' '));
    // 실제 대기는 가상 시계로 진행하고, 승인된 300~600ms 재시도 간격도 검사합니다.
    sandbox.setTimeout = (fn, ms) => { timers.push(ms); clock.now += ms; return Promise.resolve().then(fn); };
    sandbox.Date = class extends Date {
      constructor(...args) { super(...(args.length ? args : [clock.now])); }
      static now() { return clock.now; }
    };
    return { api: sandbox.StudyLogStore, sandbox, store };
  }
  const primary = client();
  return { ...primary, pages, clock, calls, warnings, timers, client, isolates,
    fail: (kind, mode, count = 1) => failures[kind].push(...Array(count).fill(mode)),
    // 다른 읽기 요청들이 각 isolate에 남긴 유효한 이전 GET 응답을 재현합니다.
    prime: page => isolates.forEach(isolate => isolate.set(`GET:/v1/pages/${page.id}:`, { body: plain(page), status: 200, expires: clock.now + 300000 })) };
}

function property(name, run, options = {}) {
  test(name, options, async t => {
    const explicit = process.env.STUDYLOG_PROP_SEED;
    const seed = explicit === undefined ? FIRST_SEED : Number(explicit);
    const runs = explicit === undefined ? Number(process.env.STUDYLOG_PROP_RUNS || RUNS) : 1;
    assert.ok(Number.isSafeInteger(seed) && seed >= 0 && seed <= 0xFFFFFFFF, '시드는 uint32 정수여야 합니다');
    assert.ok(Number.isSafeInteger(runs) && runs > 0, '횟수는 양의 정수여야 합니다');
    let firstFailure, failures = 0;
    for (let index = 0; index < runs; index++) {
      const current = (seed + index) >>> 0, rng = random(current), history = [];
      try { await run(rng, history); }
      catch (cause) {
        const error = new Error(`무작위 순서 시험 실패: 시드=${current}, 실행=${index + 1}/${runs}\n첫 실패=${cause.message}\n동작 목록(JSON)=${JSON.stringify(history)}`, { cause });
        if (!options.todo) throw error;
        firstFailure ||= error; failures++;
      }
    }
    t.diagnostic(`시작 시드=${seed}, 실행 횟수=${runs}`);
    if (firstFailure) {
      t.diagnostic(`기록된 반례 재현=${failures}/${runs}`);
      throw firstFailure;
    }
  });
}
function entry(rng, errorReport = '오답 없음') {
  return { childName: CHILD, subject: choose(rng, ['영어', '국어', '수학']),
    startTime: '2026-10-28T10:00:00+09:00', endTime: '2026-10-28T10:10:00+09:00',
    durationMinutes: integer(rng, 20), wordFairyCount: integer(rng, 9), errorReport };
}
function checkSum(rule, pages, inputs) {
  equal(rule, pages.length, 1, '같은 키의 페이지 수');
  equal(rule, pages[0].properties['소요시간'].number, inputs.reduce((s, e) => s + e.durationMinutes, 0), '소요시간 합계');
  equal(rule, pages[0].properties['단어요정'].number, inputs.reduce((s, e) => s + e.wordFairyCount, 0), '단어요정 합계');
}

property('S1 스트릭 무작위 순서 시험: 중복·월말·연말·윤년과 기준 공식', async (rng, history) => {
  const { api } = fixture(rng);
  for (const today of ['2026-10-28', '2027-01-01', '2024-03-01', '2026-11-01']) {
    const dates = Array.from({ length: 20 + integer(rng, 100) }, () => shift(today, -integer(rng, 90)));
    for (let n = 1; n <= 5; n++) dates.push(shift(today, -n));
    const yesterdayOnly = dates.filter(d => d !== today);
    for (const days of [yesterdayOnly, [...dates, today, today], []]) {
      history.push({ today, days });
      equal('S1', api.computeStreak(days, today), referenceStreak(days, today), '스트릭 공식');
    }
  }
});

property('S2 캐시 무작위 순서 시험: 당일 반복·중복 제거·60일·내림차순', async (rng, history) => {
  const start = choose(rng, ['2026-12-28', '2024-02-26', '2026-10-28']);
  const { api, sandbox, clock } = fixture(rng, start);
  const initial = Array.from({ length: 80 }, () => shift(start, -integer(rng, 90)));
  sandbox.localStorage.setItem(CACHE, JSON.stringify({ days: initial }));
  const expected = new Set(initial);
  for (let step = 0; step < 20; step++) {
    clock.now += integer(rng, 3) * 86400000;
    const today = api.getKstDateString(), since = shift(today, -60);
    expected.add(today);
    for (const date of expected) if (date < since) expected.delete(date);
    history.push({ today, mark: step });
    api.markStudiedToday(CHILD); api.markStudiedToday(CHILD);
    const days = JSON.parse(sandbox.localStorage.getItem(CACHE)).days;
    equal('S2', days, [...expected].sort().reverse(), '캐시 중복·기간·정렬');
  }
});

property('S3 순차 upsert 무작위 순서 시험: 페이지 1건과 입력 합계', async (rng, history) => {
  const { api, pages } = fixture(rng), first = entry(rng), inputs = [];
  const count = 1 + integer(rng, 5);
  for (let i = 0; i < count; i++) {
    const value = { ...entry(rng), subject: first.subject }; inputs.push(value); history.push(value);
    await api.upsertStudyLog(value); checkSum('S3', pages, inputs);
  }
});

property('S4 오답 보존 무작위 순서 시험: 부분 문자열도 독립 항목', async (rng, history) => {
  const { api, pages } = fixture(rng), base = entry(rng), reports = ['사과', '사', '사과', '사', '오답 없음'];
  reports.push(...Array.from({ length: 1 + integer(rng, 3) }, (_, i) => `계산 실수 ${i}`));
  const expected = new Set();
  for (const errorReport of reports) {
    const value = { ...base, errorReport }; history.push(value); await api.upsertStudyLog(value);
    if (errorReport !== '오답 없음') expected.add(errorReport);
    const actual = pages[0].properties['오답리포트'].rich_text[0].text.content;
    equal('S4', actual.split(' | ').sort(), [...expected].sort(), '오답 항목 보존');
  }
});

property('S5 동시 upsert 무작위 순서 시험: 한 탭 Map·한 탭 locks·공유 locks 두 탭', async (rng, history) => {
  for (const mode of [choose(rng, ['map', 'locks', 'tabs'])]) {
    const f = fixture(rng, '2026-10-28', { cache: true }), manager = mode === 'map' ? undefined : locks();
    const a = f;
    if (manager) a.sandbox.navigator = { locks: manager };
    const b = mode === 'tabs' ? f.client({ store: f.store, lockManager: manager }) : a;
    const base = entry(rng), inputs = [];
    if (rng() < 0.5) { inputs.push(base); await a.api.upsertStudyLog(base); }
    const batch = Array.from({ length: 2 + integer(rng, 2) }, () => ({ ...entry(rng), subject: base.subject }));
    inputs.push(...batch); history.push({ mode, concurrent: batch });
    await Promise.all(batch.map((value, i) => (i % 2 ? b : a).api.upsertStudyLog(value)));
    checkSum('S5', f.pages, inputs);
    // 실패한 선행 쓰기가 다음 같은 키의 작업을 막거나 성공으로 바뀌지 않습니다.
    f.fail('write', '500');
    const [failed, succeeded] = await Promise.allSettled([a.api.upsertStudyLog(base), a.api.upsertStudyLog(base)]);
    equal('S5', failed.status, 'rejected', '앞 작업의 예외 전달');
    equal('S5', succeeded.status, 'fulfilled', '뒤 작업 계속 실행');
    await a.api.flushQueue(); inputs.push(base, base); checkSum('S5', f.pages, inputs);
  }
});

property('S6 조회 실패 무작위 순서 시험: 기억 ID·1회 재시도·선택 A 기록 보존', async (rng, history) => {
  for (const mode of [choose(rng, ['500', 'throw'])]) {
    for (const scenario of ['a', 'b', 'c']) {
      const f = fixture(rng), value = entry(rng); await f.api.upsertStudyLog(value);
      if (scenario !== 'a') f.store.removeItem(PAGE_IDS);
      f.calls.length = 0; f.fail('query', mode, scenario === 'b' ? 1 : 4);
      history.push({ scenario, failure: mode, retry: value });
      if (scenario === 'c') await assert.rejects(f.api.upsertStudyLog(value));
      else await f.api.upsertStudyLog(value);
      const queries = f.calls.filter(c => c.kind === 'query').length;
      if (scenario === 'a') { equal('S6(a)', queries, 0, '기억 ID로 조회 장애 우회'); checkSum('S6(a)', f.pages, [value, value]); }
      if (scenario === 'b') { equal('S6(b)', queries, 2, '한 번 실패 후 재조회'); checkSum('S6(b)', f.pages, [value, value]); }
      if (scenario === 'c') {
        equal('S6(c)', queries, 2, '재시도까지 실패');
        equal('S6(c)', f.pages.length, 1, '조회 실패 중 신규 생성 없음');
        equal('S6(c)', Object.keys(JSON.parse(f.store.getItem('MINMIN_STUDY_LOG_QUEUE_V1'))).length, 1, '대기열 보존');
        await f.api.flushQueue(); // 남아 있는 조회 실패도 계속 보존
        await f.api.flushQueue();
        checkSum('S6(c)', f.pages, [value, value]);
      }
      if (scenario === 'b') equal('S6', f.timers.length === 1 && f.timers[0] >= 300 && f.timers[0] <= 600, true, '재시도 대기 300~600ms');
    }
  }
});

property('S5-기기 두 기기 동시 upsert 무작위 순서 시험: 알려진 한계', async (rng, history) => {
  const f = fixture(rng), a = f, b = f.client(), value = entry(rng);
  history.push({ devices: 2, concurrent: [value, value] });
  await Promise.all([a.api.upsertStudyLog(value), b.api.upsertStudyLog(value)]);
  checkSum('S5-기기', f.pages, [value, value]);
}, { todo: '두 기기 동시 저장은 노션 고유 키 제약이 없어 막지 못함(알려진 한계)' });

property('S7 캐시 무작위 순서 시험: isolate 2~3개·0~5분 순차 쓰기·최신 값 읽기', async (rng, history) => {
  const f = fixture(rng, '2026-10-28', { cache: true }), value = entry(rng), inputs = [];
  const count = 2 + integer(rng, 4);
  for (let i = 0; i < count; i++) {
    const next = { ...entry(rng), subject: value.subject }; inputs.push(next);
    f.clock.now += integer(rng, 300000); history.push({ at: f.clock.now, input: next });
    const result = await f.api.upsertStudyLog(next); checkSum('S7', f.pages, inputs);
    equal('S7', result.pageId, i === 0 ? null : f.pages[0].id, '기존 반환값 보존');
    const saved = JSON.parse(f.store.getItem(PAGE_IDS));
    equal('S7', saved.pages[result.key], f.pages[0].id, '당일 ID 기억');
    if (i === 0) f.prime(f.pages[0]);
  }
  // 저장소가 없는 다른 기기의 순차 갱신 뒤에도 이전 ID의 최신 값을 다시 읽어야 합니다.
  const other = f.client(), remote = { ...value, durationMinutes: 1, wordFairyCount: 1 };
  inputs.push(remote); await other.api.upsertStudyLog(remote);
  inputs.push(remote); await f.api.upsertStudyLog(remote); checkSum('S7', f.pages, inputs);
  for (const call of f.calls.filter(c => c.kind === 'query' || c.kind === 'get'))
    equal('S7', new URL(call.url).searchParams.get('force'), 'true', '쓰기 직전 조회·GET 캐시 우회');
});

property('S7 ID 수명주기 무작위 순서 시험: 날짜 이동·삭제·보관·GET 장애·저장 불가', async (rng, history) => {
  for (const mode of [choose(rng, ['404', 'archived', 'in_trash', '500', 'throw'])]) {
    const f = fixture(rng), value = entry(rng); await f.api.upsertStudyLog(value);
    if (mode === 'archived' || mode === 'in_trash') f.pages[0][mode] = true;
    else if (mode === '404') f.pages.length = 0;
    else f.fail('get', mode);
    history.push({ mode, retry: value }); await f.api.upsertStudyLog(value);
    const active = f.pages.filter(p => !p.archived && !p.in_trash);
    checkSum('S7', active, mode === '500' || mode === 'throw' ? [value, value] : [value]);
    f.clock.now += 86400000; await f.api.upsertStudyLog(value);
    const saved = JSON.parse(f.store.getItem(PAGE_IDS));
    equal('S7', saved.date, '2026-10-29', '날짜별 ID 교체');
    equal('S7', Object.keys(saved.pages).length, 1, '지난 날짜 ID 폐기');
  }
  const f = fixture(rng), value = entry(rng);
  f.sandbox.localStorage.setItem = () => { throw new Error('모의 저장 공간 부족'); };
  await f.api.upsertStudyLog(value); await f.api.upsertStudyLog(value);
  checkSum('S7', f.pages, [value, value]);
});
