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

function fixture(rng, today = '2026-10-28') {
  const pages = [], clock = { now: Date.parse(`${today}T12:00:00+09:00`) };
  let failure = null, serial = 0;
  const wait = async () => { for (let n = integer(rng, 4); n > 0; n--) await Promise.resolve(); };
  const fetch = async (url, options = {}) => {
    const body = JSON.parse(options.body || '{}');
    if (url.endsWith('/query')) {
      const fail = failure; failure = null;
      // 서버가 조회를 처리한 시점의 복사본입니다. 응답 지연 동안 쓰기가 끼어들 수 있습니다.
      const key = body.filter.title.equals;
      const results = pages.filter(p => p.properties.ID.title[0].text.content === key).map(plain);
      await wait();
      if (fail === 'throw') throw new Error('모의 조회 예외');
      return { ok: !fail, status: fail ? 500 : 200, json: async () => ({ results }) };
    }
    await wait();
    if (options.method === 'PATCH') {
      const page = pages.find(p => p.id === url.substring(url.lastIndexOf('/') + 1));
      assert.ok(page, '모의 페이지가 없습니다'); Object.assign(page.properties, plain(body.properties));
      return { ok: true, status: 200, json: async () => plain(page) };
    }
    assert.equal(options.method, 'POST'); assert.ok(url.endsWith('/v1/pages'));
    const page = { id: `page_${++serial}`, properties: plain(body.properties) }; pages.push(page);
    return { ok: true, status: 200, json: async () => plain(page) };
  };
  const { sandbox, calls } = loadBrowserScripts([SOURCE], { fetch });
  // Date.now 모의만으로 new Date()는 바뀌지 않으므로 이 샌드박스에만 생성자 시계를 둡니다.
  sandbox.Date = class extends Date {
    constructor(...args) { super(...(args.length ? args : [clock.now])); }
    static now() { return clock.now; }
  };
  return { api: sandbox.StudyLogStore, sandbox, pages, clock, calls,
    failQuery: mode => { failure = mode; } };
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
  const { api, pages } = fixture(rng), base = entry(rng), reports = ['사과', '사', '오답 없음'];
  reports.push(...Array.from({ length: 1 + integer(rng, 3) }, (_, i) => `계산 실수 ${i}`));
  const expected = new Set();
  for (const errorReport of reports) {
    const value = { ...base, errorReport }; history.push(value); await api.upsertStudyLog(value);
    if (errorReport !== '오답 없음') expected.add(errorReport);
    const actual = pages[0].properties['오답리포트'].rich_text[0].text.content;
    equal('S4', actual.split(' | ').sort(), [...expected].sort(), '오답 항목 보존');
  }
}, { todo: '반례: 사과 다음 사를 보내면 사가 누락됨 · 시드 20261028 · 수정은 별도 승인' });

property('S5 동시 upsert 무작위 순서 시험: 같은 키 2~3개와 합계', async (rng, history) => {
  const { api, pages } = fixture(rng), base = entry(rng), inputs = [];
  if (rng() < 0.5) { inputs.push(base); history.push({ initial: base }); await api.upsertStudyLog(base); }
  const batch = Array.from({ length: 2 + integer(rng, 1) }, () => ({ ...entry(rng), subject: base.subject }));
  inputs.push(...batch); history.push({ concurrent: batch });
  await Promise.all(batch.map(value => api.upsertStudyLog(value))); checkSum('S5', pages, inputs);
}, { todo: '반례: 동시 신규 생성은 2건, 기존 페이지 동시 PATCH는 합계 유실 · 시드 20261028 · 수정은 별도 승인' });

property('S6 조회 실패 무작위 순서 시험: 500·예외 이후 같은 키 1건 이하', async (rng, history) => {
  const { api, pages, failQuery } = fixture(rng), value = entry(rng);
  history.push({ create: value }); await api.upsertStudyLog(value);
  const failure = choose(rng, ['500', 'throw']); failQuery(failure);
  history.push({ failure, retry: value }); await api.upsertStudyLog(value);
  equal('S6', pages.length <= 1, true, '조회 실패 뒤 중복 생성 금지');
}, { todo: '반례: 기존 페이지 조회 500·예외 뒤 같은 키 2건 생성 · 시드 20261028 · 수정은 별도 승인' });
