// 가짜 노션과 독립 저장소만 사용하는 보상 시험 환경.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read = file => fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const shared = read('kids/core/reward-grant.js');
const sources = { reward: read('kids/core/notion-reward.js'), logger: read('kids/core/notion-study-logger.js') };
const oldLogger = read('tests/fixtures/reward-grant-shared/notion-study-logger.js');
const fixture = fs.readFileSync(new URL('./fixtures/notion-reward-split/notion-reward.js', import.meta.url), 'utf8');
const QUEUE = 'MINMIN_REWARD_QUEUE_V1';
const clone = value => JSON.parse(JSON.stringify(value));
const initialProps = () => Object.fromEntries(Object.entries({
  '다이아몬드 개수': 20, '슬라임 파츠 개수': 10, '소원권 개수': 1,
  '영어 경험치': 18, '영어 레벨': 1, '오늘 획득_영어': 0,
  '국어 경험치': 0, '국어 레벨': 1, '오늘 획득_국어': 0
}).map(([key, number]) => [key, { number }]));

export function storage() {
  const values = new Map(), writes = [];
  return {
    values, writes,
    getItem: key => values.get(key) ?? null,
    setItem(key, value) { values.set(key, String(value)); writes.push(key); }
  };
}

export function server() {
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

export function sandbox({ api = server(), store = storage(), locks, old = false, boost, route = 'reward', preload = true, setup } = {}) {
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
  if (setup) setup(context);
  vm.createContext(context);
  if (!old && preload) vm.runInContext(shared, context);
  vm.runInContext(old ? (route === 'logger' ? oldLogger : fixture.split('window.__sttSession = null;')[0]) : sources[route], context);
  return {
    context, store, api, earned, synced, flow, alerts, timers,
    loadShared() { vm.runInContext(shared, context); },
    grant: (...args) => context.grantRewardAndShowUI(...args),
    flush: () => events.get('load')(),
    queue: () => JSON.parse(store.getItem(QUEUE) || '{}'),
    nextDay() { day = '2026. 11. 2.'; },
    today: () => day
  };
}

export function entry(id, extra = {}) {
  return { id, childName: '민수', currentTheme: '마인크래프트', subject: '영어',
    earned: 3, customExpType: null, createdAt: Number(id) || 1, ...extra };
}
export function seed(sb, entries) { sb.store.setItem(QUEUE, JSON.stringify(Object.fromEntries(entries.map(item => [item.id, item])))); }
export function rewardState(sb) {
  return [...sb.store.values].filter(([key]) => /^(last_play_date_|MINMIN_CUMULATIVE_WEALTH_|MINMIN_INVENTORY_CACHE_)/.test(key));
}

