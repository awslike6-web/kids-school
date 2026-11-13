// 로비 분리 규칙과 동작: 줄 상한·로드 계약·한도/추천/검수 만료/학생 전환/비동기 HUD를 명시 기댓값으로 검사한다.
// 2026-11-14: 얼린 원본(tests/fixtures/lobby-split)에 승인 변경을 덧입혀 원문·VM 스냅샷을 대조하던 부분은
// 정상 수정마다 원본도 고쳐야 해 뺐다. 분리본만 실행하고 이미 있던 명시 기댓값은 그대로 둔다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { root, read, lineCount, assertLoadsInOrder, assetTags } from './split-rules.mjs';

const names = ['lobby_config.js', 'lobby_subject_hud.js', 'lobby_controller.js'];
const files = names.map(name => `kids/js/${name}`);
const sources = files.map(read);

test('세 JS는 600줄 이하이고 HUD 파일은 LobbySubjectHud.create 하나만 내보낸다', () => {
  for (const [index, source] of sources.entries()) assert.ok(lineCount(source) <= 600, `${files[index]}: 600줄 초과`);
  assert.match(sources[1], /window\.LobbySubjectHud = \{ create \};/);
  assert.match(sources[2], /window\.LobbySubjectHud\.create\(/);
});

test('로비는 세 클래식 스크립트를 상대 경로·같은 버전·지정 순서로 한 번씩 싣는다', () => {
  const html = read('lobby.html');
  const urls = names.map(name => `./kids/js/${name}`);
  const [first, , last] = assertLoadsInOrder(html, 'script', urls, '로비');
  const at = url => assetTags(html, 'script').find(tag => tag.url === url)?.start ?? -1;
  assert.ok(at('./kids/core/study-log-store.js') >= 0 && at('./kids/core/study-log-store.js') < first.start);
  assert.ok(at('./kids/core/quick-uploader.js') > last.start);
  for (const file of files) assert.ok(fs.existsSync(path.join(root, file)));
});

test('운영 소스에는 옛 로비 버전 참조가 남지 않는다', () => {
  const walk = dir => fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(entry => {
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(file) : /\.(?:html|js|mjs|cjs)$/.test(file) ? [file] : [];
  });
  const top = fs.readdirSync(root).filter(file => /\.(?:html|js|mjs|cjs)$/.test(file));
  for (const file of [...top, ...walk('kids'), ...walk('scripts')]) {
    assert.doesNotMatch(read(file), /lobby_controller\.js\?v=20261028-1\b/, file);
  }
});

const plain = value => JSON.parse(JSON.stringify(value));
const drain = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
const clockNow = Date.parse('2026-10-31T03:00:00Z');

function sandbox({ user = 'minsu', admin = '', configured = true, loader = true,
  stored = {}, missing = [] } = {}) {
  const trace = [], events = [], timers = [], requests = [], coreCallbacks = [];
  const store = new Map(Object.entries({ currentUserName: admin || (user === 'minseo' ? '민서' : '민수'),
    ...(admin ? { MINMIN_ADMIN_SESSION_AT: String(clockNow - 60000) } : {}), ...stored }));
  const elements = new Map(), boosts = new Map(), omitted = new Set(missing);
  let created = 0;
  const log = (...entry) => trace.push(plain(entry));
  const register = target => (type, callback) => {
    assert.equal(typeof callback, 'function');
    events.push({ target, type, callback });
    log('event', target, type);
  };
  function element(id) {
    if (elements.has(id)) return elements.get(id);
    const values = { className: 'hidden', textContent: '', innerHTML: '', src: '', href: '' };
    const el = { id, parentElement: null };
    elements.set(id, el);
    const classes = () => new Set(values.className.split(/\s+/).filter(Boolean));
    el.classList = {
      add: (...tokens) => { const set = classes(); tokens.forEach(token => set.add(token)); values.className = [...set].join(' '); log('class.add', id, tokens); },
      remove: (...tokens) => { const set = classes(); tokens.forEach(token => set.delete(token)); values.className = [...set].join(' '); log('class.remove', id, tokens); },
      contains: token => classes().has(token),
      toggle: token => { const set = classes(); const on = !set.has(token); on ? set.add(token) : set.delete(token); values.className = [...set].join(' '); log('class.toggle', id, token); return on; }
    };
    for (const key of Object.keys(values)) Object.defineProperty(el, key, {
      enumerable: true, get: () => values[key],
      set: value => { values[key] = String(value); log('dom.set', id, key, values[key]); }
    });
    el.style = new Proxy({}, { set: (style, key, value) => { style[key] = value; log('style', id, key, value); return true; } });
    el.querySelector = selector => { log('query', id, selector); return element(`${id}/${selector}`); };
    el.querySelectorAll = selector => {
      log('queryAll', id, selector);
      assert.equal(selector, 'span');
      return Array.from({ length: 4 }, (_, i) => element(`${id}/span${i}`));
    };
    el.appendChild = child => { child.parentElement = el; log('append', id, child.id); };
    el.remove = () => log('remove', id);
    return el;
  }
  const document = {
    body: element('body'), documentElement: element('html'),
    getElementById: id => {
      log('getElementById', id);
      if (omitted.has(id)) return null;
      const el = element(id);
      el.parentElement = document.body;
      return el;
    },
    createElement: tag => { log('createElement', tag); return element(`created:${tag}:${++created}`); },
    addEventListener: register('document')
  };
  const location = { search: `?user=${user}` };
  let href = `https://school.invalid/lobby.html${location.search}`;
  Object.defineProperty(location, 'href', { enumerable: true, get: () => href,
    set: value => { href = String(value); log('navigate', href); } });
  class FixedDate extends Date {
    constructor(...args) { super(...(args.length ? args : [clockNow])); }
    static now() { return clockNow; }
    getTimezoneOffset() { return 0; }
  }
  const context = {
    Date: FixedDate, URL, URLSearchParams, document, location,
    console: Object.fromEntries(['log', 'warn', 'error'].map(type => [type, (...args) => log('console', type, args.map(String))])),
    localStorage: {
      getItem: key => { log('storage.get', key); return store.get(key) ?? null; },
      setItem: (key, value) => { store.set(key, String(value)); log('storage.set', key, String(value)); },
      removeItem: key => { store.delete(key); log('storage.remove', key); }
    },
    setTimeout: (callback, ms) => { timers.push({ callback, ms }); log('timer', ms); return timers.length; },
    addEventListener: register('window'),
    getComputedStyle: el => ({ zIndex: el.style.zIndex || 'auto' }),
    scrollTo: options => log('scroll', options),
    history: { replaceState: (state, title, url) => {
      href = url; location.search = new URL(url).search; log('history', state, title, url);
    } },
    fetch: (url, init) => {
      assert.match(url, /\/v1\/databases\/.+\/query$/);
      assert.equal(init.method, 'POST');
      const request = { url, init: plain(init) };
      requests.push(request); log('fetch', url, request.init);
      return new Promise((resolve, reject) => {
        request.reply = data => resolve({ json: async () => plain(data) });
        request.fail = message => reject(new Error(message));
      });
    },
    TimetableBoost: {
      getTimetableSubjects: child => { log('timetable', child); return { todaySubjects: ['수학', '국어'], tomorrowSubjects: ['영어'] }; },
      getSubjectBoostInfo: (subject, child) => boosts.get(`${child}:${subject}`)
    },
    ScreenTimeTracker: {
      getScreenTimeSummary: child => { log('guardian.summary', child); return plain(context.summary); },
      syncFromInventoryProps: (props, child) => log('guardian.inventory', props, child),
      syncFromStudyLogs: (pages, child) => log('guardian.logs', pages, child)
    },
    summary: { totalMinutes: 0, pendingMinutes: 0 },
    StudyLogStore: {
      renderStreakBadge: (...args) => log('streak.badge', args),
      refreshStreak: child => { log('streak.refresh', child); return Promise.resolve(); }
    },
    SettingsManager: { syncFromCloud: value => log('settings', value), openModal: () => log('settings.open') },
    syncQuizFlowFromCloud: value => log('quiz.settings', value),
    getDaughterRewardCount: props => props['하리보 개수']?.number ?? 24,
    initFairyChat: (...args) => log('fairy', args),
    prefetchVocaData: (...args) => log('prefetch.voca', args),
    prefetchReadingData: (...args) => log('prefetch.reading', args)
  };
  if (configured) context.APP_CONFIG = {
    CHILDREN: { first: { name: '민수' }, second: { name: '민서' } },
    WORKER_PROXY_URL: 'https://notion.invalid', INVENTORY_DB_ID: 'inventory', STUDY_LOG_DB_ID: 'study',
    MASTER_TOWER_URL: 'https://tower.invalid'
  };
  if (loader) context.loadCoreScripts = (base, cores, callback) => {
    log('cores', base, Array.from(cores)); coreCallbacks.push(callback);
  };
  context.window = context;
  vm.createContext(context);
  return { context, trace, events, timers, requests, coreCallbacks, store, elements, boosts,
    initialNames: new Set(Object.keys(context)) };
}

// 비공개 함수 관찰은 VM 문자열에만 삽입한다. 운영 코드에는 넣지 않는다.
function load(options, probe = true) {
  const sb = sandbox(options);
  const instrument = source => {
    if (!probe) return source;
    const marker = '  const initialUser = resolveInitialUserKey();';
    assert.equal(source.split(marker).length, 2);
    return source.replace(marker, `  globalThis.__lobbyProbe = {
    getSubjectBoost, getSubjectCapState, renderSubjectCapStates,
    findRecommendedSubject, updateGuardianHud, fetchInventoryForUser,
    getTodayKstString, getRealChildName
  };\n` + marker);
  };
  sources.forEach((source, index) => vm.runInContext(index === 2 ? instrument(source) : source,
    sb.context, { filename: files[index] }));
  return sb;
}

const added = sb => Object.keys(sb.context).filter(name => !sb.initialNames.has(name));
function value(sb, action, expected) { assert.deepEqual(plain(action(sb)), expected); }
function inventory({ earned = {}, date = '2026-10-31', level = 7 } = {}) {
  const props = {
    '다이아몬드 개수': { number: 321 }, '하리보 개수': { number: 42 },
    '통합 레벨': { formula: { number: level } }, '소원권 개수': { number: 8 },
    '학습설정': { rich_text: [] }, '현재 테마': { select: { name: '테스트 테마' } },
    '오늘 획득_마지막날짜': { rich_text: [{ plain_text: date }] }
  };
  for (const [subject, count] of Object.entries(earned)) props[`오늘 획득_${subject}`] = { number: count };
  return { results: [{ id: 'fixture-page', properties: props }] };
}

test('앞의 설정·공장 파일만 로드하면 DOM·이벤트·요청·초기화를 실행하지 않는다', () => {
  const sb = sandbox();
  sources.slice(0, 2).forEach(source => vm.runInContext(source, sb.context));
  assert.deepEqual(sb.trace, []);
  assert.deepEqual(added(sb).sort(), ['LobbySubjectHud', 'USER_CONFIGS']);
});

for (const options of [
  { user: 'minsu' }, { user: 'minseo' },
  { user: 'minsu', admin: '아빠' }, { user: 'minseo', admin: '엄마' },
  { user: 'minseo', configured: false, loader: false },
  { user: 'minsu', missing: ['minsuTitleLevel', 'minseo-card-math', 'minsu-orb-korean'] }
]) {
  test(`${JSON.stringify(options)}: 초기 이벤트·학생·요청·코어 로드와 비공개 함수 비노출`, () => {
    const sb = load(options, false);
    assert.deepEqual(sb.events.map(({ target, type }) => [target, type]), [['document', 'click'], ['document', 'keydown']]);
    assert.equal(sb.context.__activeLobbyUser, options.user);
    assert.equal(sb.requests.length, options.admin ? 0 : 1);
    assert.equal(sb.coreCallbacks.length, options.loader === false ? 0 : 1);
    assert.equal(typeof sb.context.create, 'undefined');
    assert.equal(typeof sb.context.getSubjectCapState, 'undefined');
    assert.deepEqual(Object.keys(sb.context.LobbySubjectHud), ['create']);
    const playground = JSON.parse(vm.runInContext('JSON.stringify(PLAYGROUND_ITEMS)', sb.context));
    for (const child of ['minsu', 'minseo']) assert.ok(playground[child].length > 0 && playground[child].every(item => item.href && item.title), child);
  });
}

test('부모 검수 이름이 남아도 시각 기록이 없거나 1시간이 지나면 아이 이름으로 되돌린다', () => {
  // '' = 시각 기록 없음(이 기능 전에 남은 검수 이름), 1시간 경과, 미래 시각(시계 오류), 1시간 이내
  for (const [stamp, admin] of [['', false], [String(clockNow - 3600000), false],
    [String(clockNow + 60000), false], [String(clockNow - 3599000), true]]) {
    const sb = load({ user: 'minsu', admin: '아빠', stored: { MINMIN_ADMIN_SESSION_AT: stamp } }, false);
    assert.equal(sb.store.get('currentUserName'), admin ? '아빠' : '민수', String(stamp));
    assert.equal(sb.store.has('MINMIN_ADMIN_SESSION_AT'), admin, String(stamp));
    assert.equal(sb.requests.length, admin ? 0 : 1, String(stamp));
  }
});

for (const user of ['minsu', 'minseo']) {
  test(`${user}: 일반/복습 한도 경계·override·하루 체크인 상태`, () => {
    const sb = load({ user });
    const child = user === 'minseo' ? '민서' : '민수';
    for (const [limit, cases] of [[100, [[0, 'available'], [69, 'available'], [70, 'critical'], [99, 'critical'], [100, 'completed']]],
      [150, [[104, 'available'], [105, 'critical'], [149, 'critical'], [150, 'completed']]]]) {
      sb.boosts.set(`${child}:수학`, { type: limit === 150 ? 'review' : 'normal', limit });
      for (const [count, expected] of cases) {
        sb.store.set(`last_play_date_${child}_수학`, '2026-10-31');
        sb.store.set(`today_earned_${child}_수학`, String(count));
        sb.context.__lobbyProbe.renderSubjectCapStates();
        value(sb, s => s.context.__lobbyProbe.getSubjectCapState('math'), expected);
      }
    }
    for (const state of ['available', 'critical', 'completed', 'invalid', '']) {
      sb.context.setSubjectCapOverride(user, 'math', state);
      value(sb, s => s.context.__lobbyProbe.getSubjectCapState('math'),
        ['available', 'critical', 'completed'].includes(state) ? state : 'completed');
    }
    sb.store.set(`haru_checkin_done_2026-10-31_${user}`, 'true');
    value(sb, s => s.context.__lobbyProbe.getSubjectCapState('haru'), 'completed');
    sb.store.set(`last_play_date_${child}_수학`, '2026-10-30');
    sb.context.__lobbyProbe.renderSubjectCapStates();
    value(sb, s => s.context.__lobbyProbe.getSubjectCapState('math'), 'available');
    sb.store.set(`last_play_date_${child}_수학`, new sb.context.Date().toLocaleDateString());
    value(sb, s => s.context.__lobbyProbe.getSubjectCapState('math'), 'completed');
  });

  test(`${user}: 복습 우선·미완료 우선·모두 완료 추천과 모달 이동`, () => {
    const sb = load({ user });
    const child = user === 'minseo' ? '민서' : '민수';
    sb.boosts.set(`${child}:영어`, { type: 'review', limit: 150 });
    value(sb, s => s.context.__lobbyProbe.findRecommendedSubject('korean'), 'english');
    sb.context.setSubjectCapOverride(user, 'english', 'completed');
    sb.context.openDailyCapModal('korean');
    value(sb, s => s.context.__lobbyProbe.findRecommendedSubject('korean'), 'math');
    assert.equal(sb.elements.get('capModalRecRoomName').textContent, '➔ 🧮 수학 방');
    sb.context.handleCapModalGoRecommended();
    assert.equal(sb.context.location.href, `kids/subjects/math/math.html?user=${user}`);
    for (const subject of ['math', 'korean', 'english', 'society', 'science', 'haru']) sb.context.setSubjectCapOverride(user, subject, 'completed');
    sb.context.openDailyCapModal('korean');
    sb.context.handleCapModalReviewAnyway();
    assert.equal(sb.context.location.href, `kids/subjects/korean/korean.html?user=${user}`);
    value(sb, s => s.context.__lobbyProbe.findRecommendedSubject('korean'), 'math');
  });
}

test('학생 전환 뒤 기본 학생·렌더·추천과 이름/날짜 헬퍼가 최신 값을 읽는다', () => {
  const sb = load({ user: 'minsu' });
  sb.context.setSubjectCapOverride('minsu', 'math', 'completed');
  sb.context.setSubjectCapOverride('minseo', 'math', 'critical');
  sb.boosts.set('민수:사회', { type: 'review', limit: 150 });
  sb.boosts.set('민서:영어', { type: 'review', limit: 150 });
  for (const [user, cap, recommendation] of [['minsu', 'completed', 'society'], ['minseo', 'critical', 'english'], ['minsu', 'completed', 'society']]) {
    sb.context.switchLobbyUser(user);
    sb.context.__lobbyProbe.renderSubjectCapStates();
    value(sb, s => [s.context.__activeLobbyUser, s.context.__lobbyProbe.getSubjectCapState('math'),
      s.context.__lobbyProbe.findRecommendedSubject('korean')], [user, cap, recommendation]);
  }
  sb.context.APP_CONFIG.CHILDREN.first.name = '이름 변경';
  value(sb, s => [s.context.__lobbyProbe.getRealChildName('minsu'), s.context.__lobbyProbe.getTodayKstString()], ['이름 변경', '2026-10-31']);
});

test('관리자 전환 시 요청 생략과 비동기 HUD의 관리자 판정은 호출 당시 값을 읽는다', async () => {
  const sb = load({ user: 'minsu' });
  sb.store.set('currentUserName', '아빠');
  sb.store.set('MINMIN_ADMIN_SESSION_AT', String(clockNow));
  sb.context.switchLobbyUser('minseo');
  assert.equal(sb.requests.length, 1);
  sb.requests[0].reply(inventory({ level: 8 }));
  await drain();
  assert.equal(sb.elements.get('minsuTitleLevel').textContent, '관리자 시뮬레이터 [LVL-8]');
  sb.store.set('currentUserName', '민수');
  sb.context.switchLobbyUser('minsu');
  assert.equal(sb.requests.length, 2);
  sb.requests[1].reply(inventory({ level: 9 }));
  await drain();
  assert.equal(sb.elements.get('minsuTitleLevel').textContent, '차원 사령관 [LVL-9]');
});

test('캐시·클라우드 하위 객체 교체 뒤 획득량·날짜·최댓값이 최신 공유 객체를 따른다', async () => {
  const sb = load({ user: 'minsu', stored: {
    MINMIN_INVENTORY_CACHE_민수: JSON.stringify({ dailyEarned: { math: 80 }, diamond: 1, level: 2 }),
    last_play_date_민수_수학: '2026-10-31', today_earned_민수_수학: '90'
  } });
  value(sb, s => s.context.__lobbyProbe.getSubjectCapState('math'), 'critical');
  sb.requests[0].reply(inventory({ earned: { 수학: 100 } }));
  await drain();
  value(sb, s => s.context.__lobbyProbe.getSubjectCapState('math'), 'completed');
  sb.context.__lobbyProbe.fetchInventoryForUser('minsu', '민수');
  sb.requests[1].reply(inventory({ earned: { 수학: 200 }, date: '2026-10-30' }));
  await drain();
  value(sb, s => s.context.__lobbyProbe.getSubjectCapState('math'), 'critical');
  const cache = JSON.parse(sb.store.get('MINMIN_INVENTORY_CACHE_민수'));
  assert.deepEqual(cache.dailyEarned, {});
  sb.store.set('today_earned_민수_수학', '0');
  sb.context.__lobbyProbe.fetchInventoryForUser('minsu', '민수');
  sb.requests[2].reply(inventory({ earned: { 수학: 70 }, date: '' }));
  await drain();
  value(sb, s => s.context.__lobbyProbe.getSubjectCapState('math'), 'critical');
});

test('학생 전환 뒤 역순 인벤토리 응답도 학생별 획득량을 따로 남긴다', async () => {
  const sb = load({ user: 'minsu' });
  sb.context.switchLobbyUser('minseo');
  sb.requests[1].reply(inventory({ earned: { 수학: 70 } }));
  await drain();
  value(sb, s => s.context.__lobbyProbe.getSubjectCapState('math'), 'critical');
  sb.requests[0].reply(inventory({ earned: { 수학: 100 } }));
  await drain();
  value(sb, s => [s.context.__lobbyProbe.getSubjectCapState('math'),
    s.context.__lobbyProbe.getSubjectCapState('math', 'minsu')], ['critical', 'completed']);
});

test('캐시 파싱 실패·요청 실패·빈 응답은 예외 없이 경고만 남기고 한도는 기본값이다', async () => {
  const sb = load({ stored: { MINMIN_INVENTORY_CACHE_민수: '{broken' } });
  sb.requests[0].fail('offline');
  await drain();
  sb.context.__lobbyProbe.fetchInventoryForUser('minsu', '민수');
  sb.requests[1].reply({ results: [] });
  await drain();
  const warnings = sb.trace.filter(entry => entry[0] === 'console' && entry[1] !== 'log');
  assert.ok(warnings.length >= 1, '실패 경고가 남지 않음');
  assert.ok(warnings.some(entry => entry[2].join(' ').includes('offline')), '요청 실패 사유가 경고에 없음');
  value(sb, s => s.context.__lobbyProbe.getSubjectCapState('math'), 'available');
});

test('코어 콜백·일지 동기화·HUD·예약 일기·클릭/키보드·놀이터 동작', async () => {
  const sb = load({ user: 'minseo' });
  sb.context.location.search += '&action=diary';
  sb.context.summary = { totalMinutes: 51, pendingMinutes: 8 };
  sb.coreCallbacks[0]();
  sb.requests.find(request => JSON.parse(request.init.body).page_size === 30).reply({ results: [{ id: 'study-log' }] });
  sb.events.find(event => event.type === 'click').callback({ pageX: 50, pageY: 80 });
  sb.context.openPlaygroundModal();
  assert.ok(sb.elements.get('playgroundModalList').innerHTML.includes('매직 컬러링'));
  sb.context.openDailyCapModal('math');
  sb.events.find(event => event.type === 'keydown').callback({ key: 'Escape' });
  sb.context.handleSubjectNodeClick('english');
  sb.context.handleLobbySettingsClick({ stopPropagation() {} });
  sb.timers.forEach(timer => timer.callback());
  await drain();
  assert.equal(sb.elements.get('minseoGuardianText').textContent, '8분 획득');
  assert.equal(sb.elements.get('minsuGuardianText').textContent, 'GUARDIAN: +51m');
  assert.ok(sb.trace.some(entry => entry[0] === 'guardian.logs'));
});
