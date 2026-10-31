// 로비 분리: 승인한 5줄 변경·로드 계약·원본과의 상태/DOM/비동기 동작 일치를 검사한다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const names = ['lobby_config.js', 'lobby_subject_hud.js', 'lobby_controller.js'];
const files = names.map(name => `kids/js/${name}`);
const sources = files.map(read);
const fixture = read('tests/fixtures/lobby-split/lobby_controller.js');
const version = '?v=20261031-lobby-split';
// 수학 페이지 분리 시험과 동일하며 코드 내부 공백·들여쓰기는 보존한다.
const normalize = text => text.replace(/\r\n/g, '\n').replace(/[\t ]+$/gm, '').replace(/\n+$/, '');
const originalLines = normalize(fixture).split('\n');
const originalRange = (first, last) => originalLines.slice(first - 1, last).join('\n') + '\n';
const approved = new Map([
  [367, ['    const uKey = userKey || activeUserKey;', '    const uKey = userKey || ctx.getActiveUserKey();']],
  [383, ['    const uKey = userKey || activeUserKey;', '    const uKey = userKey || ctx.getActiveUserKey();']],
  [577, ['    const uKey = userKey || activeUserKey;', '    const uKey = userKey || ctx.getActiveUserKey();']],
  [918, ['      minsuTitleLevel.textContent = isAdminSession', '      minsuTitleLevel.textContent = ctx.getIsAdminSession()']],
  [928, ['    if (isAdminSession) {', '    if (ctx.getIsAdminSession()) {']]
]);
const prefix = `(function () {
'use strict';

function create(ctx) {
  const { getRealChildName, getTodayKstString, runtimeDailyEarned } = ctx;

`;
const suffix = `  return {
    getSubjectBoost,
    getSubjectCapState,
    renderSubjectCapStates,
    findRecommendedSubject,
    updateGuardianHud,
    fetchInventoryForUser
  };
}

window.LobbySubjectHud = { create };
})();
`;
const bridge = `  const {
    getSubjectBoost, getSubjectCapState, renderSubjectCapStates,
    findRecommendedSubject, updateGuardianHud, fetchInventoryForUser
  } = window.LobbySubjectHud.create({
    getActiveUserKey: () => activeUserKey,
    getIsAdminSession: () => isAdminSession,
    runtimeDailyEarned,
    getRealChildName,
    getTodayKstString
  });

`;

test('세 JS는 600줄 이하이고 설정·잔여 컨트롤러·연결 코드가 승인 원문과 같다', () => {
  assert.equal(originalLines.length, 1102);
  for (const source of sources) assert.ok(source.split(/\r?\n/).length <= 600);
  assert.equal(normalize(sources[0]), normalize(originalRange(1, 106)));
  assert.equal(normalize(sources[2]), normalize(originalRange(107, 139) + bridge
    + originalRange(140, 331) + originalRange(597, 845) + originalRange(1022, 1102)));
  // 코어 로더를 기존 위치에 남겨 마음일기·음성 시험의 계약도 보존한다.
  assert.ok(sources[2].includes(originalRange(111, 127).trimEnd().replace(/\n/g,
    sources[2].includes('\r\n') ? '\r\n' : '\n')));
});

test('과목·HUD 본문은 지정한 다섯 줄만 바뀌고 나머지 원문·껍데기가 같다', () => {
  for (const [line, [before]] of approved) assert.equal(originalLines[line - 1], before);
  const movedRange = (first, last) => originalLines.slice(first - 1, last)
    .map((line, offset) => approved.get(first + offset)?.[1] ?? line).join('\n') + '\n';
  assert.equal(normalize(sources[1]), normalize(prefix + movedRange(332, 596)
    + movedRange(846, 1021) + suffix));
  const unchanged = [362, 946, 1009];
  for (const line of unchanged) assert.ok(normalize(sources[1]).includes(originalLines[line - 1]));
});

test('로비는 세 클래식 스크립트를 상대 경로·같은 버전·지정 순서로 한 번씩 싣는다', () => {
  const html = read('lobby.html');
  const tags = names.map(name => `<script src="./kids/js/${name}${version}"></script>`);
  const loaded = [...html.matchAll(/<script\b[^>]*\bsrc=["'][^"']*lobby_(?:config|subject_hud|controller)\.js[^"']*["'][^>]*>\s*<\/script>/g)]
    .map(match => match[0]);
  assert.deepEqual(loaded, tags);
  const first = html.indexOf(tags[0]);
  const last = html.indexOf(tags[2]) + tags[2].length;
  assert.equal(html.slice(first, last).replace(/>\s+</g, '><'), tags.join(''));
  assert.ok(html.indexOf('./kids/core/study-log-store.js') < first);
  assert.ok(html.indexOf('./kids/core/quick-uploader.js') > last);
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
  const store = new Map(Object.entries({ currentUserName: admin || (user === 'minseo' ? '민서' : '민수'), ...stored }));
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

// 비공개 함수 관찰은 VM 문자열에만 삽입한다. 디스크 fixture·운영 코드에는 넣지 않는다.
function load(split, options, probe = true) {
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
  if (split) sources.forEach((source, index) => vm.runInContext(index === 2 ? instrument(source) : source,
    sb.context, { filename: files[index] }));
  else vm.runInContext(instrument(fixture), sb.context, { filename: '원본 fixture' });
  return sb;
}

function snapshot(sb, split) {
  const added = Object.keys(sb.context).filter(name => !sb.initialNames.has(name)).sort();
  if (split) {
    assert.ok(added.includes('LobbySubjectHud'));
    assert.deepEqual(Object.keys(sb.context.LobbySubjectHud), ['create']);
    assert.equal(typeof sb.context.LobbySubjectHud.create, 'function');
  } else assert.ok(!added.includes('LobbySubjectHud'));
  const kept = added.filter(name => name !== 'LobbySubjectHud');
  return {
    names: kept.map(name => [name, typeof sb.context[name]]),
    constants: vm.runInContext('JSON.stringify({MINSU_AVATAR_SRC,SUBJECT_META,PLAYGROUND_ITEMS,USER_CONFIGS})', sb.context),
    events: sb.events.map(({ target, type }) => ({ target, type })),
    storage: [...sb.store].sort(), href: sb.context.location.href,
    dom: [...sb.elements].map(([id, el]) => [id, el.className, el.textContent, el.innerHTML, el.src, el.href, { ...el.style }]),
    trace: sb.trace
  };
}

function pair(options, probe = true) {
  return [load(false, options, probe), load(true, options, probe)];
}
function same(both) { assert.deepEqual(snapshot(both[1], true), snapshot(both[0], false)); }
function valueBoth(both, action, expected) {
  for (const sb of both) assert.deepEqual(plain(action(sb)), expected);
  same(both);
}
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
  assert.deepEqual(Object.keys(sb.context).filter(name => !sb.initialNames.has(name)).sort(), ['LobbySubjectHud', 'USER_CONFIGS']);
});

for (const options of [
  { user: 'minsu' }, { user: 'minseo' },
  { user: 'minsu', admin: '아빠' }, { user: 'minseo', admin: '엄마' },
  { user: 'minseo', configured: false, loader: false },
  { user: 'minsu', missing: ['minsuTitleLevel', 'minseo-card-math', 'minsu-orb-korean'] }
]) {
  test(`${JSON.stringify(options)}: 초기 전역·설정·DOM·저장소·이벤트·코어 로드가 원본과 같다`, () => {
    const both = pair(options, false);
    same(both);
    assert.deepEqual(both[1].events.map(({ target, type }) => [target, type]), [['document', 'click'], ['document', 'keydown']]);
    assert.equal(both[1].context.__activeLobbyUser, options.user);
    assert.equal(both[1].requests.length, options.admin ? 0 : 1);
    assert.equal(typeof both[1].context.create, 'undefined');
    assert.equal(typeof both[1].context.getSubjectCapState, 'undefined');
  });
}

for (const user of ['minsu', 'minseo']) {
  test(`${user}: 일반/복습 한도 경계·override·하루 체크인과 렌더 결과가 원본과 같다`, () => {
    const both = pair({ user });
    const child = user === 'minseo' ? '민서' : '민수';
    for (const [limit, cases] of [[100, [[0, 'available'], [69, 'available'], [70, 'critical'], [99, 'critical'], [100, 'completed']]],
      [150, [[104, 'available'], [105, 'critical'], [149, 'critical'], [150, 'completed']]]]) {
      for (const sb of both) sb.boosts.set(`${child}:수학`, { type: limit === 150 ? 'review' : 'normal', limit });
      for (const [count, expected] of cases) {
        for (const sb of both) {
          sb.store.set(`last_play_date_${child}_수학`, '2026-10-31');
          sb.store.set(`today_earned_${child}_수학`, String(count));
          sb.context.__lobbyProbe.renderSubjectCapStates();
        }
        valueBoth(both, sb => sb.context.__lobbyProbe.getSubjectCapState('math'), expected);
      }
    }
    for (const state of ['available', 'critical', 'completed', 'invalid', '']) {
      for (const sb of both) sb.context.setSubjectCapOverride(user, 'math', state);
      valueBoth(both, sb => sb.context.__lobbyProbe.getSubjectCapState('math'),
        ['available', 'critical', 'completed'].includes(state) ? state : 'completed');
    }
    for (const sb of both) sb.store.set(`haru_checkin_done_2026-10-31_${user}`, 'true');
    valueBoth(both, sb => sb.context.__lobbyProbe.getSubjectCapState('haru'), 'completed');
    for (const sb of both) {
      sb.store.set(`last_play_date_${child}_수학`, '2026-10-30');
      sb.context.__lobbyProbe.renderSubjectCapStates();
    }
    valueBoth(both, sb => sb.context.__lobbyProbe.getSubjectCapState('math'), 'available');
    for (const sb of both) sb.store.set(`last_play_date_${child}_수학`, new sb.context.Date().toLocaleDateString());
    valueBoth(both, sb => sb.context.__lobbyProbe.getSubjectCapState('math'), 'completed');
  });

  test(`${user}: 복습 우선·미완료 우선·모두 완료 추천과 모달 이동이 원본과 같다`, () => {
    const both = pair({ user });
    const child = user === 'minseo' ? '민서' : '민수';
    for (const sb of both) sb.boosts.set(`${child}:영어`, { type: 'review', limit: 150 });
    valueBoth(both, sb => sb.context.__lobbyProbe.findRecommendedSubject('korean'), 'english');
    for (const sb of both) {
      sb.context.setSubjectCapOverride(user, 'english', 'completed');
      sb.context.openDailyCapModal('korean');
    }
    valueBoth(both, sb => sb.context.__lobbyProbe.findRecommendedSubject('korean'), 'math');
    for (const sb of both) {
      assert.equal(sb.elements.get('capModalRecRoomName').textContent, '➔ 🧮 수학 방');
      sb.context.handleCapModalGoRecommended();
      assert.equal(sb.context.location.href, `kids/subjects/math/math.html?user=${user}`);
      for (const subject of ['math', 'korean', 'english', 'society', 'science', 'haru']) sb.context.setSubjectCapOverride(user, subject, 'completed');
      sb.context.openDailyCapModal('korean');
      sb.context.handleCapModalReviewAnyway();
      assert.equal(sb.context.location.href, `kids/subjects/korean/korean.html?user=${user}`);
    }
    valueBoth(both, sb => sb.context.__lobbyProbe.findRecommendedSubject('korean'), 'math');
  });
}

test('학생 전환 뒤 기본 학생·렌더·추천과 이름/날짜 헬퍼가 최신 값을 읽는다', () => {
  const both = pair({ user: 'minsu' });
  for (const sb of both) {
    sb.context.setSubjectCapOverride('minsu', 'math', 'completed');
    sb.context.setSubjectCapOverride('minseo', 'math', 'critical');
    sb.boosts.set('민수:사회', { type: 'review', limit: 150 });
    sb.boosts.set('민서:영어', { type: 'review', limit: 150 });
  }
  for (const [user, cap, recommendation] of [['minsu', 'completed', 'society'], ['minseo', 'critical', 'english'], ['minsu', 'completed', 'society']]) {
    for (const sb of both) {
      sb.context.switchLobbyUser(user);
      sb.context.__lobbyProbe.renderSubjectCapStates();
    }
    valueBoth(both, sb => [sb.context.__activeLobbyUser, sb.context.__lobbyProbe.getSubjectCapState('math'),
      sb.context.__lobbyProbe.findRecommendedSubject('korean')], [user, cap, recommendation]);
  }
  for (const sb of both) sb.context.APP_CONFIG.CHILDREN.first.name = '이름 변경';
  valueBoth(both, sb => [sb.context.__lobbyProbe.getRealChildName('minsu'), sb.context.__lobbyProbe.getTodayKstString()], ['이름 변경', '2026-10-31']);
});

test('관리자 전환 시 요청 생략과 비동기 HUD의 관리자 판정은 호출 당시 값을 읽는다', async () => {
  const both = pair({ user: 'minsu' });
  for (const sb of both) {
    sb.store.set('currentUserName', '아빠');
    sb.context.switchLobbyUser('minseo');
    assert.equal(sb.requests.length, 1);
    sb.requests[0].reply(inventory({ level: 8 }));
  }
  await drain();
  for (const sb of both) {
    assert.equal(sb.elements.get('minsuTitleLevel').textContent, '관리자 시뮬레이터 [LVL-8]');
    sb.store.set('currentUserName', '민수');
    sb.context.switchLobbyUser('minsu');
    assert.equal(sb.requests.length, 2);
    sb.requests[1].reply(inventory({ level: 9 }));
  }
  await drain();
  for (const sb of both) assert.equal(sb.elements.get('minsuTitleLevel').textContent, '차원 사령관 [LVL-9]');
  same(both);
});

test('캐시·클라우드 하위 객체 교체 뒤 획득량·날짜·최댓값이 최신 공유 객체를 따른다', async () => {
  const both = pair({ user: 'minsu', stored: {
    MINMIN_INVENTORY_CACHE_민수: JSON.stringify({ dailyEarned: { math: 80 }, diamond: 1, level: 2 }),
    last_play_date_민수_수학: '2026-10-31', today_earned_민수_수학: '90'
  } });
  valueBoth(both, sb => sb.context.__lobbyProbe.getSubjectCapState('math'), 'critical');
  for (const sb of both) sb.requests[0].reply(inventory({ earned: { 수학: 100 } }));
  await drain();
  valueBoth(both, sb => sb.context.__lobbyProbe.getSubjectCapState('math'), 'completed');
  for (const sb of both) {
    sb.context.__lobbyProbe.fetchInventoryForUser('minsu', '민수');
    sb.requests[1].reply(inventory({ earned: { 수학: 200 }, date: '2026-10-30' }));
  }
  await drain();
  valueBoth(both, sb => sb.context.__lobbyProbe.getSubjectCapState('math'), 'critical');
  for (const sb of both) {
    const cache = JSON.parse(sb.store.get('MINMIN_INVENTORY_CACHE_민수'));
    assert.deepEqual(cache.dailyEarned, {});
    sb.store.set('today_earned_민수_수학', '0');
    sb.context.__lobbyProbe.fetchInventoryForUser('minsu', '민수');
    sb.requests[2].reply(inventory({ earned: { 수학: 70 }, date: '' }));
  }
  await drain();
  valueBoth(both, sb => sb.context.__lobbyProbe.getSubjectCapState('math'), 'critical');
});

test('학생 전환 뒤 역순 인벤토리 응답도 원본과 같은 DOM·학생별 획득량을 남긴다', async () => {
  const both = pair({ user: 'minsu' });
  for (const sb of both) {
    sb.context.switchLobbyUser('minseo');
    sb.requests[1].reply(inventory({ earned: { 수학: 70 } }));
  }
  await drain();
  valueBoth(both, sb => sb.context.__lobbyProbe.getSubjectCapState('math'), 'critical');
  for (const sb of both) sb.requests[0].reply(inventory({ earned: { 수학: 100 } }));
  await drain();
  valueBoth(both, sb => [sb.context.__lobbyProbe.getSubjectCapState('math'),
    sb.context.__lobbyProbe.getSubjectCapState('math', 'minsu')], ['critical', 'completed']);
});

test('캐시 파싱 실패·요청 실패·빈 응답은 원본과 같은 경고와 결과를 남긴다', async () => {
  const both = pair({ stored: { MINMIN_INVENTORY_CACHE_민수: '{broken' } });
  for (const sb of both) sb.requests[0].fail('offline');
  await drain();
  for (const sb of both) {
    sb.context.__lobbyProbe.fetchInventoryForUser('minsu', '민수');
    sb.requests[1].reply({ results: [] });
  }
  await drain();
  same(both);
});

test('코어 콜백·일지 동기화·HUD·예약 일기·클릭/키보드·놀이터 동작이 원본과 같다', async () => {
  const both = pair({ user: 'minseo' });
  for (const sb of both) {
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
  }
  await drain();
  same(both);
  for (const sb of both) {
    assert.equal(sb.elements.get('minseoGuardianText').textContent, '8분 획득');
    assert.equal(sb.elements.get('minsuGuardianText').textContent, 'GUARDIAN: +51m');
    assert.ok(sb.trace.some(entry => entry[0] === 'guardian.logs'));
  }
});
