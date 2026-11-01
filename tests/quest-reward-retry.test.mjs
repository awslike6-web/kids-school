// 운영 노션 접속 없이 보상 실패·복구·학생 분리·동시 실행 계약을 검증한다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../kids/core/notion-reward.js', import.meta.url), 'utf8');
const fixture = fs.readFileSync(new URL('./fixtures/notion-reward-split/notion-reward.js', import.meta.url), 'utf8');
const QUEUE = 'MINMIN_REWARD_QUEUE_V1';
const clone = value => JSON.parse(JSON.stringify(value));
const initialProps = () => Object.fromEntries(Object.entries({
  '다이아몬드 개수': 20, '슬라임 파츠 개수': 10, '소원권 개수': 1,
  '영어 경험치': 18, '영어 레벨': 1, '오늘 획득_영어': 0,
  '국어 경험치': 0, '국어 레벨': 1, '오늘 획득_국어': 0
}).map(([key, number]) => [key, { number }]));

function storage() {
  const values = new Map(), writes = [];
  return {
    values, writes,
    getItem: key => values.get(key) ?? null,
    setItem(key, value) { values.set(key, String(value)); writes.push(key); }
  };
}

function server() {
  const pages = Object.fromEntries(['민수', '민서'].map(name => [name, { id: name, properties: initialProps() }]));
  const api = { pages, requests: [], queryFailure: null, patchFailure: null, empty: false, malformed: false };
  api.fetch = async (url, options) => {
    assert.match(url, /^https:\/\/notion\.invalid\//);
    const body = JSON.parse(options.body);
    api.requests.push({ url, method: options.method, body });
    if (api.delay) await api.delay(options.method);
    const failure = options.method === 'PATCH' ? api.patchFailure : api.queryFailure;
    if (failure === 'network') throw new TypeError('모의 네트워크 실패');
    if (failure === 'http') return { ok: false, status: 503, text: async () => '모의 실패' };
    if (options.method === 'POST') {
      assert.ok(url.endsWith('/query?force=true'));
      const name = body.filter.title.equals;
      if (api.malformed) return { ok: true, json: async () => { throw new SyntaxError('잘못된 JSON'); } };
      const data = { results: api.empty ? [] : [clone(pages[name])] };
      return { ok: true, json: async () => data };
    }
    assert.equal(options.method, 'PATCH');
    const name = decodeURIComponent(url.split('/').at(-1));
    Object.assign(pages[name].properties, clone(body.properties));
    return { ok: true };
  };
  api.patches = () => api.requests.filter(request => request.method === 'PATCH');
  return api;
}

function sandbox({ api = server(), store = storage(), locks, old = false, boost } = {}) {
  const events = new Map(), earned = [], synced = [], flow = [], alerts = [], timers = [];
  let day = '2026. 11. 1.', sequence = 0;
  for (const [key, value] of Object.entries({ currentUser: 'son', currentUserName: '민수', currentTheme: '마인크래프트' })) {
    if (store.getItem(key) === null) store.setItem(key, value);
  }
  class TestDate extends Date {
    toLocaleDateString() { return day; }
  }
  const context = {
    Date: TestDate, URL, localStorage: store, fetch: api.fetch,
    APP_CONFIG: { WORKER_PROXY_URL: 'https://notion.invalid', INVENTORY_DB_ID: 'inventory' },
    console: { log() {}, warn() {}, error() {} }, currentSubject: '영어',
    navigator: locks ? { locks } : {}, crypto: { randomUUID: () => `reward-${++sequence}` },
    addEventListener(type, fn) { events.set(type, fn); },
    document: { scripts: [], getElementById: () => null },
    ScreenTimeTracker: {
      syncFromInventoryProps(props, name) { synced.push(name); },
      recordDailyRewardEarned(amount, name) { earned.push({ amount, name }); }
    },
    syncQuizFlowFromCloud(props) { flow.push(clone(props)); },
    alert: message => alerts.push(message), setTimeout: fn => timers.push(fn)
  };
  if (boost) context.TimetableBoost = { getSubjectBoostInfo: boost };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(old ? fixture.split('window.__sttSession = null;')[0] : source, context);
  return {
    context, store, api, earned, synced, flow, alerts, timers,
    grant: (...args) => context.grantRewardAndShowUI(...args),
    flush: () => events.get('load')(),
    queue: () => JSON.parse(store.getItem(QUEUE) || '{}'),
    nextDay() { day = '2026. 11. 2.'; },
    today: () => day
  };
}

function entry(id, extra = {}) {
  return { id, childName: '민수', currentTheme: '마인크래프트', subject: '영어',
    earned: 3, customExpType: null, createdAt: Number(id) || 1, ...extra };
}
function seed(sb, entries) { sb.store.setItem(QUEUE, JSON.stringify(Object.fromEntries(entries.map(item => [item.id, item])))); }
function rewardState(sb) {
  return [...sb.store.values].filter(([key]) => /^(last_play_date_|MINMIN_CUMULATIVE_WEALTH_|MINMIN_INVENTORY_CACHE_)/.test(key));
}

for (const [stage, failure] of [['query', 'network'], ['query', 'http'], ['patch', 'network'], ['patch', 'http']]) {
  test(`${stage} ${failure} 실패는 한 건 보존하고 다음 성공 호출에서 각각 한 번 지급한다`, async () => {
    const sb = sandbox();
    sb.api[`${stage}Failure`] = failure;
    assert.equal(await sb.grant(3, true, 'voca'), false);
    const queued = Object.values(sb.queue());
    assert.equal(queued.length, 1);
    assert.deepEqual(queued[0], { ...entry('reward-1'), createdAt: queued[0].createdAt, customExpType: 'voca' });
    assert.equal(typeof queued[0].createdAt, 'number');
    assert.deepEqual(rewardState(sb), []);
    assert.deepEqual(sb.earned, []);
    sb.api[`${stage}Failure`] = null;
    assert.equal(await sb.grant(3, true), true);
    assert.deepEqual(sb.queue(), {});
    assert.equal(sb.api.pages['민수'].properties['다이아몬드 개수'].number, 26);
    assert.equal(sb.api.pages['민수'].properties['영어 경험치'].number, 24);
    assert.equal(sb.api.pages['민수'].properties['용어 경험치_영어'].number, 3);
    assert.equal(sb.api.pages['민수'].properties['오늘 획득_영어'].number, 6);
    assert.deepEqual(sb.earned, [{ amount: 3, name: '민수' }, { amount: 3, name: '민수' }]);
    assert.equal(sb.store.writes.filter(key => key.startsWith('last_play_date_')).length, 2);
    assert.equal(sb.store.getItem('MINMIN_CUMULATIVE_WEALTH_민수'), '29');
    assert.equal(JSON.parse(sb.store.getItem('MINMIN_INVENTORY_CACHE_민수')).diamond, 26);
  });
}

test('load 복구는 PATCH 실패분의 로컬 누적을 한 번만 반영한다', async () => {
  const sb = sandbox();
  sb.api.patchFailure = 'http';
  await sb.grant(3, true);
  assert.deepEqual(rewardState(sb), []);
  sb.api.patchFailure = null;
  await sb.flush();
  await sb.flush();
  assert.deepEqual(sb.queue(), {});
  assert.equal(sb.api.patches().length, 2); // 실패 한 번 + 성공 한 번
  assert.deepEqual(sb.earned, [{ amount: 3, name: '민수' }]);
  assert.equal(sb.store.getItem('MINMIN_CUMULATIVE_WEALTH_민수'), '26');
});

for (const mode of ['아빠', '엄마', '어른', '상한', '빈 인벤토리', '과목 없음', 'JSON 오류']) {
  test(`${mode}은 새 대기열 항목을 만들지 않는다`, async () => {
    const sb = sandbox();
    const admin = ['아빠', '엄마', '어른'].includes(mode);
    if (admin) sb.store.setItem('currentUserName', mode);
    if (mode === '상한') {
      sb.store.setItem('last_play_date_민수_영어', sb.today());
      sb.api.pages['민수'].properties['오늘 획득_영어'].number = 100;
    }
    if (mode === '빈 인벤토리') sb.api.empty = true;
    if (mode === '과목 없음') { delete sb.context.currentSubject; sb.api.queryFailure = 'network'; }
    if (mode === 'JSON 오류') sb.api.malformed = true;
    assert.equal(await sb.grant(3, true), admin);
    assert.deepEqual(sb.queue(), {});
    assert.equal(sb.api.patches().length, 0);
    assert.deepEqual(sb.earned, []);
    if (admin) {
      seed(sb, [entry('1')]);
      await sb.flush();
      assert.equal(Object.keys(sb.queue()).length, 1);
      assert.equal(sb.api.requests.length, 0);
    }
  });
}

test('민서 로그인에서도 민수 항목의 학생·테마·과목을 쓰고 민서 설정은 보존한다', async () => {
  const sb = sandbox();
  sb.api.pages['민수'].properties['학습설정'] = [{ plain_text: '{"영어":"auto"}' }];
  seed(sb, [entry('1', { customExpType: 'voca' })]);
  sb.store.setItem('currentUser', 'daughter');
  sb.store.setItem('currentUserName', '민서');
  sb.store.setItem('currentTheme', '슬라임');
  sb.context.currentSubject = '국어';
  await sb.flush();
  assert.deepEqual(sb.queue(), {});
  const patch = sb.api.patches()[0];
  assert.ok(patch.url.endsWith('/민수'));
  assert.equal(patch.body.properties['다이아몬드 개수'].number, 23);
  assert.equal(patch.body.properties['영어 경험치'].number, 21);
  assert.equal(patch.body.properties['용어 경험치_영어'].number, 3);
  assert.equal(sb.api.pages['민서'].properties['슬라임 파츠 개수'].number, 10);
  assert.equal(sb.store.getItem('currentUserName'), '민서');
  assert.equal(sb.store.getItem('MINMIN_INVENTORY_CACHE_민서'), null);
  assert.deepEqual(sb.flow, []);
  assert.deepEqual(sb.earned, [{ amount: 3, name: '민수' }]);
});

test('Web Locks가 없어도 같은 flush Promise를 재사용하며 FIFO 최대 10건만 비운다', async () => {
  const sb = sandbox();
  seed(sb, Array.from({ length: 12 }, (_, index) => entry(String(12 - index))));
  const first = sb.flush();
  assert.equal(first, sb.flush());
  await first;
  assert.deepEqual(Object.keys(sb.queue()), ['11', '12']);
  assert.equal(sb.api.patches().length, 10);
  assert.equal(sb.api.pages['민수'].properties['다이아몬드 개수'].number, 50);
  await sb.flush();
  assert.deepEqual(sb.queue(), {});
  assert.equal(sb.api.patches().length, 12);
});

test('flush 중 실패해도 항목을 복제하지 않고 다음 호출까지 보존한다', async () => {
  const sb = sandbox();
  seed(sb, [entry('1'), entry('2')]);
  sb.api.patchFailure = 'network';
  await sb.flush();
  assert.deepEqual(Object.keys(sb.queue()), ['1', '2']);
  assert.deepEqual(sb.earned, []);
  sb.api.patchFailure = null;
  await sb.flush();
  assert.deepEqual(sb.queue(), {});
  assert.equal(sb.earned.length, 2);
});

test('상한 0개는 남겨 다음 날 지급하고 부분 지급은 삭제한다', async () => {
  const sb = sandbox();
  seed(sb, [entry('1')]);
  sb.store.setItem('last_play_date_민수_영어', sb.today());
  sb.api.pages['민수'].properties['오늘 획득_영어'].number = 100;
  await sb.flush();
  assert.equal(Object.keys(sb.queue()).length, 1);
  assert.equal(sb.api.patches().length, 0);
  sb.nextDay();
  await sb.flush();
  assert.deepEqual(sb.queue(), {});
  assert.equal(sb.api.patches()[0].body.properties['오늘 획득_영어'].number, 3);
  seed(sb, [entry('2')]);
  sb.api.pages['민수'].properties['오늘 획득_영어'].number = 99;
  await sb.flush();
  assert.deepEqual(sb.queue(), {});
  const patch = sb.api.patches().at(-1).body.properties;
  assert.equal(patch['오늘 획득_영어'].number, 100);
  assert.equal(patch['영어 경험치'].number, 24); // 부분 통화 지급에도 원래 EXP 계산 유지
  assert.deepEqual(sb.earned.map(item => item.amount), [3, 1]);
});

test('지급 시점 부스트·소원권 경계를 적용하고 silent에서는 오버레이도 열지 않는다', async () => {
  const seen = [];
  const sb = sandbox({ boost: (subject, name) => { seen.push([subject, name]); return { limit: 150, expMultiplier: 1.2 }; } });
  seed(sb, [entry('1', { earned: 5, createdAt: 1 })]);
  sb.store.setItem('last_play_date_민수_영어', sb.today());
  sb.store.setItem('MINMIN_CUMULATIVE_WEALTH_민수', '148');
  sb.api.pages['민수'].properties['오늘 획득_영어'].number = 149;
  await sb.flush();
  const patch = sb.api.patches()[0].body.properties;
  assert.equal(patch['오늘 획득_영어'].number, 150);
  assert.equal(patch['영어 경험치'].number, 24);
  assert.equal(patch['소원권 개수'].number, 1);
  seed(sb, [entry('2')]);
  sb.nextDay();
  await sb.flush();
  assert.equal(sb.api.patches().at(-1).body.properties['소원권 개수'].number, 2);
  assert.equal(sb.store.getItem('MINMIN_CUMULATIVE_WEALTH_민수'), '152');
  assert.deepEqual(seen, [['영어', '민수'], ['영어', '민수']]);
  assert.deepEqual(sb.alerts, []);
  assert.deepEqual(sb.timers, []);
});

test('Web Locks를 공유하는 두 탭은 같은 항목을 한 번만 지급한다', async () => {
  let chain = Promise.resolve();
  const names = [];
  const locks = { request(name, fn) { names.push(name); const task = chain.then(fn); chain = task.catch(() => {}); return task; } };
  const api = server(), store = storage();
  const one = sandbox({ api, store, locks }), two = sandbox({ api, store, locks });
  seed(one, [entry('1')]);
  await Promise.all([one.flush(), two.flush()]);
  assert.equal(api.patches().length, 1);
  assert.deepEqual(one.queue(), {});
  assert.deepEqual(names, ['minmin-reward-queue', 'minmin-reward-queue']);
  assert.equal(one.earned.length + two.earned.length, 1);
});

test('조회 대기 중 로그인·테마·과목이 바뀌어도 최초 호출 맥락을 보존한다', async () => {
  const sb = sandbox();
  let release, entered;
  const ready = new Promise(resolve => { entered = resolve; });
  sb.api.delay = () => new Promise(resolve => { release = resolve; entered(); });
  sb.api.queryFailure = 'network';
  const pending = sb.grant(3, true, 'voca');
  await ready;
  sb.store.setItem('currentUser', 'daughter');
  sb.store.setItem('currentTheme', '슬라임');
  sb.context.currentSubject = '국어';
  release();
  assert.equal(await pending, false);
  assert.deepEqual(Object.values(sb.queue())[0], {
    ...entry('reward-1', { customExpType: 'voca' }), createdAt: Object.values(sb.queue())[0].createdAt
  });
});

test('PATCH 성공 뒤 화면 오류도 지급 성공을 반환하고 재등록하지 않는다', async () => {
  const sb = sandbox();
  sb.context.alert = () => { throw Error('모의 화면 오류'); };
  assert.equal(await sb.grant(3, false), true);
  assert.deepEqual(sb.queue(), {});
  assert.equal(sb.api.patches().length, 1);
  assert.deepEqual(sb.earned, [{ amount: 3, name: '민수' }]);
});

test('PATCH 뒤 로컬 저장·스크린타임 오류는 재지급으로 이어지지 않는다', async () => {
  const sb = sandbox();
  seed(sb, [entry('1')]);
  const save = sb.store.setItem.bind(sb.store);
  sb.store.setItem = (key, value) => { if (key.startsWith('last_play_date_')) throw Error('모의 저장 실패'); save(key, value); };
  sb.context.ScreenTimeTracker.recordDailyRewardEarned = () => { throw Error('모의 기록 실패'); };
  await sb.flush();
  await sb.flush();
  assert.deepEqual(sb.queue(), {});
  assert.equal(sb.api.patches().length, 1);
});

test('일반 성공 경로의 노션 본문·로컬 값·모달 문구는 기존 계산과 같다', async () => {
  const before = sandbox({ old: true }), after = sandbox();
  // 원본 조회는 캐시 우회 쿼리가 없으므로 같은 가짜 서버에 그 차이만 연결한다.
  before.context.fetch = (url, options) => before.api.fetch(options.method === 'POST' ? url + '?force=true' : url, options);
  for (const sb of [before, after]) {
    sb.store.setItem('MINMIN_CUMULATIVE_WEALTH_민수', '148');
    assert.equal(await sb.grant(3, false, 'voca'), true);
  }
  assert.deepEqual(after.api.patches(), before.api.patches());
  assert.deepEqual(rewardState(after).map(([key, value]) => [key, key.includes('CACHE') ? { ...JSON.parse(value), updatedAt: 0 } : value]),
    rewardState(before).map(([key, value]) => [key, key.includes('CACHE') ? { ...JSON.parse(value), updatedAt: 0 } : value]));
  assert.deepEqual(after.earned, before.earned);
  assert.deepEqual(after.alerts, before.alerts);
  assert.equal(after.timers.length, before.timers.length);
});
