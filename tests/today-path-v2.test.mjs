// 오늘의 길 2차(docs/today_path_spec.md §15): 체류·완주 보너스·방학 모드·틀린 문항 먼저·시간표 받아 오기 (노션 미접속)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { loadBrowserScripts } from './browser-sandbox.mjs';

const require = createRequire(import.meta.url);
const TP = require('../kids/core/today-path.js');
const read = file => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const plain = value => JSON.parse(JSON.stringify(value));
const drain = async () => { for (let i = 0; i < 20; i++) await new Promise(r => setTimeout(r, 0)); };

function storage(init = {}) {
  const map = new Map(Object.entries(init));
  return { getItem: k => (map.has(k) ? map.get(k) : null), setItem: (k, v) => map.set(k, String(v)), removeItem: k => map.delete(k), map };
}
const ROOMS = { korean: 'k.html', math: 'm.html', english: 'e.html', society: 's.html', science: 'sc.html', haru: 'h.html' };
const MINSU = { child: '민수', childKey: 'minsu', eligible: ['english', 'korean', 'math', 'society', 'science', 'haru'] };
const MINSEO = { child: '민서', childKey: 'minseo', eligible: ['korean', 'math', 'english', 'haru'] };
const TODAY = TP.kstDate(Date.now());
const route4 = (s4 = 'society') => ({ v: 1, date: TODAY, child: '민수', provisional: false, stops: [
  { n: 1, kind: 'today', subject: 'english' }, { n: 2, kind: 'tomorrow', subject: 'math' },
  { n: 3, kind: 'review', subject: 'english' }, { n: 4, kind: 'rotate', subject: s4 }] });
const withRoute = (route, extra = {}) => storage({ currentUserName: '민수', currentChild: 'minsu', [TP.ROUTE_PREFIX + '민수']: JSON.stringify(route), ...extra });

test('체류: 대상 화면 판정 — 4번 과목만, tp=1~3 제외, tp=4면 노선 과목, 부모·완료면 없음', () => {
  const st = withRoute(route4());
  const now = Date.now();
  assert.deepEqual(plain(TP.dwellTarget(st, '', '사회', now)), { name: '민수', subject: 'society', today: TODAY });
  assert.equal(TP.dwellTarget(st, '', '영어', now), null);           // 4번 과목 아님
  assert.equal(TP.dwellTarget(st, '?tp=3', '사회', now), null);      // 3번 화면의 시간은 4번으로 새지 않음
  assert.equal(TP.dwellTarget(st, '?tp=1', '사회', now), null);
  assert.deepEqual(plain(TP.dwellTarget(st, '?user=minsu&tp=4', null, now)), { name: '민수', subject: 'society', today: TODAY }); // 첫 화면처럼 과목을 모를 때
  assert.equal(TP.dwellTarget(withRoute(route4(), { currentUserName: '엄마' }), '', '사회', now), null);
  assert.equal(TP.dwellTarget(storage({ currentUserName: '민수' }), '', '사회', now), null); // 오늘 노선 없음
  const done = withRoute(route4(), { [TP.DONE_PREFIX + '민수']: JSON.stringify({ date: TODAY, s: { society: ['quiz'] }, tp: [] }) });
  assert.equal(TP.dwellTarget(done, '', '사회', now), null);
});

test('체류: 장부에 초가 이어 쌓이고 30초에 visit 한 번 (tp=4면 tp에)', () => {
  const st = withRoute(route4());
  const target = TP.dwellTarget(st, '', '사회', Date.now());
  for (let i = 0; i < 29; i++) assert.equal(TP.dwellStep(st, target, { search: '' }), false);
  // 다른 화면(같은 과목)으로 옮겨도 이어진다: 장부에 29초
  assert.equal(TP.readLedger(st, '민수', TODAY).dwell.society, 29);
  assert.equal(TP.dwellStep(st, target, { search: '' }), true);
  const ledger = TP.readLedger(st, '민수', TODAY);
  assert.deepEqual(plain(ledger.s), { society: ['visit'] });
  assert.deepEqual(plain(TP.doneState(route4(), ledger, false)), [false, false, false, true]);
  assert.equal(TP.dwellTarget(st, '', '사회', Date.now()), null); // 끝나면 더 안 셈
  const st4 = withRoute(route4());
  const t4 = TP.dwellTarget(st4, '?tp=4', null, Date.now());
  for (let i = 0; i < 30; i++) TP.dwellStep(st4, t4, { search: '?tp=4' });
  assert.deepEqual(plain(TP.readLedger(st4, '민수', TODAY).tp), [4]);
});

test('체류 판정 범위: visit는 4번만, 하루는 체크인 또는 하루방 체류', () => {
  const r = route4('haru');
  assert.deepEqual(plain(TP.doneState({ stops: [{ n: 1, subject: 'math' }, { n: 2, subject: 'math' }, { n: 4, subject: 'math' }] },
    { s: { math: ['visit'] }, tp: [] }, false)), [false, false, true]);
  assert.deepEqual(plain(TP.doneState(r, { s: { haru: ['visit'] }, tp: [] }, false))[3], true);
  assert.deepEqual(plain(TP.doneState(r, { s: {}, tp: [] }, true))[3], true);
  assert.deepEqual(plain(TP.doneState(r, { s: {}, tp: [] }, false))[3], false);
});

test('체류 감시: 보이고 최근 실제 입력이 있을 때만 1초 (입력 전·숨김·가짜 입력은 안 쌓임)', () => {
  const st = withRoute(route4());
  let tick = null;
  const handlers = {};
  const win = { localStorage: st, location: { search: '' }, currentSubject: '사회', StudyActivity: { IDLE_MS: 90000 },
    setInterval: fn => { tick = fn; return 1; },
    document: { visibilityState: 'visible', addEventListener: (type, fn) => { handlers[type] = fn; } } };
  TP.startDwellWatch(win);
  for (let i = 0; i < 40; i++) tick(); // 입력 전
  assert.equal(TP.readLedger(st, '민수', TODAY).dwell, undefined);
  handlers.pointerdown({ isTrusted: false }); // 스크립트가 만든 입력은 무시
  tick();
  assert.equal(TP.readLedger(st, '민수', TODAY).dwell, undefined);
  handlers.pointerdown({ isTrusted: true });
  win.document.visibilityState = 'hidden';
  for (let i = 0; i < 5; i++) tick();
  assert.equal(TP.readLedger(st, '민수', TODAY).dwell, undefined);
  win.document.visibilityState = 'visible';
  for (let i = 0; i < 30; i++) tick();
  assert.deepEqual(plain(TP.readLedger(st, '민수', TODAY).s), { society: ['visit'] });
  // 한 화면에 한 번만 시작
  let starts = 0;
  TP.startDwellWatch({ ...win, __todayPathDwell: true, setInterval: () => { starts++; } });
  assert.equal(starts, 0);
});

// ---------- 완주 보너스 ----------
function lobbySandbox(store, extra = {}) {
  const containers = { todayPathMinsu: { innerHTML: '', hidden: true }, todayPathMinseo: { innerHTML: '', hidden: true } };
  const sb = { console: { log() {}, info() {}, warn() {}, error() {} }, setTimeout, clearTimeout, Date, JSON, Math, URLSearchParams, Promise, AbortController,
    localStorage: store, addEventListener() {},
    document: { getElementById: id => containers[id] || null, head: { appendChild() {} }, createElement: () => ({}) },
    fetch: async () => ({ ok: false }), ...extra };
  sb.window = sb;
  vm.createContext(sb);
  vm.runInContext(read('kids/core/today-path.js'), sb);
  vm.runInContext(read('kids/js/lobby_today_path.js'), sb);
  return { sb, containers };
}
const allDone = { date: TODAY, s: { english: ['lesson'], math: ['story'], society: ['visit'] }, tp: [3] };

test('완주 보너스: 넷 다 하면 기존 보상 엔진으로 +3 한 번, 재화 칸·과목 명시', async () => {
  const st = withRoute(route4(), { [TP.DONE_PREFIX + '민수']: JSON.stringify(allDone) });
  const grants = [];
  const { sb, containers } = lobbySandbox(st, { __activeLobbyUser: 'minsu', MinminRewardGrant: { grant: (...args) => { grants.push(plain(args)); return Promise.resolve(true); } } });
  sb.LobbyTodayPath.mount('minsu');
  sb.LobbyTodayPath.mount('minsu'); // 로비가 부팅 때 두 번 그려도
  await drain();
  assert.equal(grants.length, 1);
  assert.deepEqual(grants[0], [3, false, null, { childName: '민수', currentTheme: '마인크래프트', subject: '영어' }]);
  assert.equal(TP.readLedger(st, '민수', TODAY).bonus, true);
  assert.match(containers.todayPathMinsu.innerHTML, /오늘의 길 완주! \+3/);
  sb.LobbyTodayPath.mount('minsu');
  await drain();
  assert.equal(grants.length, 1); // 다시 그려도 한 번
});

test('완주 보너스: 셋만 완료·부모 시뮬레이터·보상 모듈 없음이면 주지 않음, 민서는 슬라임 칸', async () => {
  const three = { date: TODAY, s: { english: ['lesson'], math: ['story'] }, tp: [3] };
  const grants = [];
  const grant = { grant: (...a) => { grants.push(plain(a)); } };
  let box = lobbySandbox(withRoute(route4(), { [TP.DONE_PREFIX + '민수']: JSON.stringify(three) }), { __activeLobbyUser: 'minsu', MinminRewardGrant: grant });
  box.sb.LobbyTodayPath.mount('minsu'); await drain();
  const parentStore = withRoute(route4(), { [TP.DONE_PREFIX + '민수']: JSON.stringify(allDone), currentUserName: '아빠' });
  box = lobbySandbox(parentStore, { __activeLobbyUser: 'minsu', MinminRewardGrant: grant });
  assert.equal(await box.sb.LobbyTodayPath.maybeGrantBonus({ name: '민수', key: 'minsu', isMinseo: false }, TODAY, route4()), false);
  assert.equal(grants.length, 0);
  // 민서
  const seoRoute = { ...route4(), child: '민서', stops: route4().stops.map(s => (s.n === 4 ? { ...s, subject: 'haru' } : s)) };
  const seo = storage({ currentUserName: '민서', currentChild: 'minseo', [TP.ROUTE_PREFIX + '민서']: JSON.stringify(seoRoute),
    [TP.DONE_PREFIX + '민서']: JSON.stringify({ date: TODAY, s: { english: ['lesson'], math: ['quiz'] }, tp: [3] }), [`haru_checkin_done_${TODAY}_minseo`]: 'true' });
  box = lobbySandbox(seo, { __activeLobbyUser: 'minseo', MinminRewardGrant: grant });
  box.sb.LobbyTodayPath.mount('minseo'); await drain();
  assert.deepEqual(grants, [[3, false, null, { childName: '민서', currentTheme: '슬라임', subject: '영어' }]]);
});

// ---------- 방학 모드 ----------
test('방학 모드: 시간표를 보지 않고 순위로, 제목, 1·2·4번 중복 없음 전수', () => {
  const tt = { '월요일': ['영어', '수학', '국어'], '화요일': ['과학'], '수요일': ['사회'], '목요일': ['과학'], '금요일': ['국어'] };
  const history = { visits: { english: ['2026-11-20'], math: ['2026-11-21'], korean: ['2026-11-22'] }, logs: [] };
  const r = TP.plan({ ...MINSU, now: Date.parse('2026-11-23T01:00:00Z'), timetable: tt, history, voca: [], rooms: ROOMS, vacation: true });
  assert.equal(r.vacation, true);
  assert.equal(r.stops[0].title, '방학 공부');
  assert.equal(r.stops[1].title, '맛보기');
  assert.ok(['society', 'science'].includes(r.stops[0].subject)); // 안 간 과목 먼저 (시간표의 영어·수학·국어가 아니라)
  for (const who of [MINSU, MINSEO]) for (let d = 0; d < 14; d++) {
    const p = TP.plan({ ...who, now: Date.parse('2026-11-23T01:00:00Z') + d * 86400000, timetable: tt, history: null, voca: [], rooms: ROOMS, vacation: true });
    const [a, b, , c] = p.stops.map(s => s.subject);
    assert.equal(new Set([a, b, c]).size, 3);
    assert.ok(a !== 'haru' && b !== 'haru');
  }
  assert.equal(TP.plan({ ...MINSU, now: Date.now(), timetable: tt, history: null, voca: [], rooms: ROOMS }).vacation, false);
});

test('방학 모드 바뀜: 1차 노선(vacation 없음)=꺼짐, 바뀌면 옛 tp만 지움', () => {
  assert.equal(TP.vacationChanged({ stops: [] }, false), false);
  assert.equal(TP.vacationChanged({ stops: [] }, true), true);
  assert.equal(TP.vacationChanged({ vacation: true }, true), false);
  assert.equal(TP.vacationChanged(null, true), false);
  const st = storage({ [TP.DONE_PREFIX + '민수']: JSON.stringify({ date: TODAY, s: { english: ['lesson'] }, tp: [1, 3], dwell: { math: 12 } }) });
  assert.equal(TP.clearStopMarks(st, '민수', TODAY), true);
  assert.deepEqual(plain(TP.readLedger(st, '민수', TODAY)), { date: TODAY, s: { english: ['lesson'] }, tp: [], dwell: { math: 12 } });
});

test('방학 모드 로비: 설정이 노선과 다르면 다시 편성(옛 tp 지움), 아이 전용 키만 읽음', async () => {
  const st = withRoute({ ...route4(), vacation: false }, {
    [TP.DONE_PREFIX + '민수']: JSON.stringify({ date: TODAY, s: {}, tp: [1] }),
    MINMIN_APP_SETTINGS_son: JSON.stringify({ vacation_mode: true }), MINMIN_APP_SETTINGS: JSON.stringify({ vacation_mode: false }) });
  const { sb } = lobbySandbox(st, { __activeLobbyUser: 'minsu', USER_CONFIGS: { minsu: { subjects: MINSU.eligible } },
    TimetableBoost: { getSubjectsForDay: () => ['영어'], STATIC_CACHE_KEY: 'X' }, LearningLog: { decode: () => null }, _loadVocaFromCache: () => [],
    fetchTimetableFromNotion: async () => [] });
  sb.LobbyTodayPath.mount('minsu');
  await new Promise(r => setTimeout(r, 300));
  const saved = TP.loadRoute(st, '민수', TODAY);
  assert.equal(saved.vacation, true);
  assert.equal(saved.stops[0].title, '방학 공부');
  assert.deepEqual(plain(TP.readLedger(st, '민수', TODAY).tp), []);
});

test('설정 저장: 기기에 학습설정 캐시가 없으면 노션 것을 먼저 읽어 바탕으로 (읽기 실패면 보내지 않음)', async () => {
  const calls = [];
  const cloud = { questSettings: { minsu: { english: 'L9' } }, piggyBank: { coins: 3 } };
  const mk = getOk => {
    const st = storage({ currentUserName: '민수', currentUser: 'son', MINMIN_INVENTORY_PAGE_ID_민수: 'page-1' });
    const sb = { console: { log() {}, info() {}, warn() {}, error() {} }, JSON, Date, URLSearchParams, Promise, setTimeout, localStorage: st,
      location: { search: '' }, document: { readyState: 'loading', addEventListener() {}, documentElement: { setAttribute() {}, classList: { add() {}, remove() {} } } },
      fetch: async (url, opts = {}) => {
        calls.push({ url, method: opts.method || 'GET', body: opts.body ? JSON.parse(opts.body) : null });
        if ((opts.method || 'GET') === 'GET') return getOk ? { ok: true, json: async () => ({ properties: { '학습설정': { rich_text: [{ plain_text: JSON.stringify(cloud) }] } } }) } : { ok: false, status: 500 };
        return { ok: true, json: async () => ({}) };
      } };
    sb.window = sb;
    vm.createContext(sb);
    vm.runInContext(read('kids/core/fairy-settings-catalog.js'), sb);
    vm.runInContext(read('kids/core/fairy-settings-engine.js'), sb);
    return { sb, st };
  };
  const { sb } = mk(true);
  sb.SettingsManager.set('vacation_mode', true);
  await drain();
  const patch = calls.find(c => c.method === 'PATCH');
  const sent = JSON.parse(patch.body.properties['학습설정'].rich_text.map(t => t.text.content).join(''));
  assert.deepEqual(plain(sent.questSettings), cloud.questSettings);
  assert.deepEqual(plain(sent.piggyBank), cloud.piggyBank);
  assert.equal(sent.appSettings.vacation_mode, true);
  calls.length = 0;
  const bad = mk(false);
  bad.sb.SettingsManager.set('vacation_mode', true);
  await drain();
  assert.equal(calls.filter(c => c.method === 'PATCH').length, 0);
  assert.equal(JSON.parse(bad.st.getItem('MINMIN_APP_SETTINGS_son')).vacation_mode, true); // 로컬엔 저장
  assert.match(read('kids/core/fairy-settings-engine.js'), /savedName === '어른'/);
});

// ---------- 틀린 문항 먼저 ----------
function lessonFixture(n = 20) {
  const { sandbox } = loadBrowserScripts(['kids/subjects/quest/quest-questions.js', 'kids/subjects/quest/quest-mastery.js', 'kids/subjects/quest/quest-lesson.js']);
  const items = Array.from({ length: n }, (_, i) => ({ id: 'item' + i, word: 'word' + i, meaning: '뜻' + i, detail: '설명' + i, kind: i % 4 === 0 ? 'sentence' : 'word' }));
  return { L: sandbox.QuestLesson, items, store: { items: {}, dirty: {}, pushedAt: {} } };
}
const lessonOpts = (f, extra = {}) => ({ child: 'minsu', items: f.items, store: f.store, subj: 'english', today: '2026-10-30', rng: () => 0.25, ...extra });

test('focus: 3단계 워밍업 앞자리·순서·중복 무시, 매칭 0이면 평소(짝 맞추기 그대로), 검증 통과', () => {
  const f = lessonFixture();
  const a = f.L.buildLesson(lessonOpts(f, { focus: ['item7', 'item3', 'item7', 'nope'] }));
  assert.deepEqual(plain(a.steps[0].questions.slice(0, 2).map(q => q.itemIds[0])), ['item7', 'item3']);
  assert.ok(!a.steps[0].questions.some(q => q.masteryType === 'match_3x3'));
  assert.equal(f.L.validateLesson(a), true);
  const none = f.L.buildLesson(lessonOpts(f, { focus: ['nope'] }));
  assert.deepEqual(plain(none), plain(f.L.buildLesson(lessonOpts(f))));
  // 녹슨 왕관 항목은 풀에 없어 focus로도 안 나옴
  f.store.items.item5 = { c: 9, s: '2026-10-01', r: '2026-10-01' };
  const rusty = f.L.buildLesson(lessonOpts(f, { focus: ['item5'] }));
  assert.notEqual(rusty.steps[0].questions[0].itemIds[0], 'item5');
});

test('focus: 한입 레슨 앞자리, 하이픈 있는 id도 같은 항목', () => {
  const f = lessonFixture(6);
  f.items[2].id = '00000000-0000-0000-0000-000000000abc';
  const b = f.L.buildLesson(lessonOpts(f, { child: 'minseo', mode: 'bite', focus: ['00000000000000000000000000000abc', 'item4'] }));
  assert.deepEqual(plain(b.steps[0].questions.slice(0, 2).map(q => q.itemIds[0])), [f.items[2].id, 'item4']);
  assert.equal(f.L.validateLesson(b), true);
});

test('focus 연결: 러너는 형식 맞는 id만 중복 없이 3개, 레슨 화면은 첫 레슨에서만', () => {
  const runner = read('kids/subjects/quest/quest-runner.js');
  assert.match(runner, /focus: \[\.\.\.new Set\(String\(urlParams\.get\('focus'\) \|\| ''\)\.split\('\|'\)\.filter\(id => \/\^\[0-9a-f\]\{32\}\$\/\.test\(id\)\)\)\]\.slice\(0, 3\)/);
  const ui = read('kids/subjects/quest/quest-lesson-ui.js');
  assert.match(ui, /child, items: unit\.items, subj, mode, focus: focusOnce\r?\n\s+\}\);\r?\n\s+focusOnce = \[\];/);
});

// ---------- 시간표 하루 한 번 ----------
test('시간표: 로비 전용 키, 오늘 받았으면 안 부름, []면 저장 안 함, 버프 배지 다시 그림', async () => {
  const st = storage();
  let fetches = 0, refreshed = 0;
  const rows = [{ child: '민서', dayOfWeek: '화요일', subject: '국어', periodNum: 2, title: 'x', memo: '긴 글' }];
  let reply = [];
  const { sb } = lobbySandbox(st, { TimetableBoost: { STATIC_CACHE_KEY: 'MINMIN_TIMETABLE_STATIC_V1' },
    fetchTimetableFromNotion: async opts => { fetches++; assert.equal(opts.dbId, '32ba27115b68828bbda201a1bdce12fc'); assert.equal(opts.fetchPageContent, false); return reply; },
    __lobbyRefreshBoosts: () => { refreshed++; } });
  assert.equal(await sb.LobbyTodayPath.refreshStaticTimetable(TODAY), false); // [] → 저장 안 함
  assert.equal(st.getItem('MINMIN_TIMETABLE_STATIC_V1'), null);
  reply = rows;
  assert.equal(await sb.LobbyTodayPath.refreshStaticTimetable(TODAY), true);
  const saved = JSON.parse(st.getItem('MINMIN_TIMETABLE_STATIC_V1'));
  assert.ok(saved.savedAt > 0);
  assert.deepEqual({ date: saved.date, rows: saved.rows }, { date: TODAY, rows: [{ child: '민서', dayOfWeek: '화요일', subject: '국어', periodNum: 2 }] });
  assert.equal(refreshed, 1);
  assert.equal(await sb.LobbyTodayPath.refreshStaticTimetable(TODAY), false);
  assert.equal(fetches, 2);
});

test('시간표 읽는 순서: 시간표 화면 캐시 → 로비 키 → 기본 시간표', () => {
  const lobbyRows = { date: TODAY, rows: [{ child: '민서', dayOfWeek: '화요일', subject: '국어', periodNum: 1 }] };
  const v11 = { staticRows: [{ child: '민서', dayOfWeek: '화요일', subject: '수학', periodNum: 1 }], overlayRows: [], allRows: [] };
  const load = init => loadBrowserScripts(['kids/core/timetable-boost.js'], { storage: storage(init) }).sandbox.TimetableBoost;
  assert.deepEqual(plain(load({ MINMIN_TIMETABLE_STATIC_V1: JSON.stringify(lobbyRows) }).getSubjectsForDay('민서', '화요일')), ['국어']);
  assert.deepEqual(plain(load({ MINMIN_TIMETABLE_STATIC_V1: JSON.stringify(lobbyRows), MINMIN_TIMETABLE_CACHE_V11: JSON.stringify(v11) }).getSubjectsForDay('민서', '화요일')), ['수학']);
  assert.deepEqual(plain(load({ MINMIN_TIMETABLE_STATIC_V1: JSON.stringify(lobbyRows) }).getSubjectsForDay('민수', '금요일')), ['국어']); // 민수 행 없음 → 기본
  assert.deepEqual(plain(load({ MINMIN_TIMETABLE_STATIC_V1: '{깨짐' }).getSubjectsForDay('민서', '금요일')), ['수학']);
});

test('싣기·크기: 새 기능 파일 600줄 미만, 설정 모달에 방학 토글, 로비 버프 다시 그리기 훅', () => {
  for (const file of ['kids/core/today-path.js', 'kids/js/lobby_today_path.js', 'kids/core/fairy-settings-engine.js', 'kids/subjects/quest/quest-lesson.js']) {
    assert.ok(read(file).split('\n').length < 600, file);
  }
  assert.ok(read('kids/js/lobby_controller.js').split('\n').length <= 600);
  assert.match(read('kids/core/fairy-settings-engine.js'), /SettingsManager\.set\('vacation_mode', this\.checked\)/);
  assert.match(read('kids/js/lobby_controller.js'), /window\.__lobbyRefreshBoosts = \(\) =>/);
});

// ---------- diff 교차 검토(네온) 반영 시험 ----------
function settingsSandbox(st, fetchImpl = async () => ({ ok: false })) {
  const sb = { console: { log() {}, info() {}, warn() {}, error() {} }, JSON, Date, URLSearchParams, Promise, setTimeout, localStorage: st,
    location: { search: '' }, document: { readyState: 'loading', addEventListener() {}, documentElement: { setAttribute() {}, classList: { add() {}, remove() {} } } },
    fetch: fetchImpl };
  sb.window = sb;
  vm.createContext(sb);
  vm.runInContext(read('kids/core/fairy-settings-catalog.js'), sb);
  vm.runInContext(read('kids/core/fairy-settings-engine.js'), sb);
  return sb;
}

test('설정: 공용 옛 키의 방학 값은 다른 아이에게 번지지 않고, 클라우드 값이 바뀌면 알림', () => {
  const st = storage({ currentUser: 'daughter', currentUserName: '민서', MINMIN_APP_SETTINGS: JSON.stringify({ vacation_mode: true, sfx_enabled: false }) });
  const SM = settingsSandbox(st).SettingsManager;
  assert.equal(SM.getAll().vacation_mode, false);   // 민서 전용 키 없음 → 옛 키의 방학 값은 무시
  assert.equal(SM.getAll().sfx_enabled, false);     // 다른 설정은 예전처럼 옛 키에서
  const changes = [];
  const orig = SM.onSettingChanged.bind(SM);
  SM.onSettingChanged = (k, v) => { changes.push([k, v]); orig(k, v); };
  SM.syncFromCloud(JSON.stringify({ appSettings: { vacation_mode: true } }));
  assert.deepEqual(changes, [['vacation_mode', true]]);
  assert.equal(JSON.parse(st.getItem('MINMIN_APP_SETTINGS_daughter')).vacation_mode, true);
});

test('설정 저장: 깨진·빈·배열 캐시면 노션을 읽고, 노션 값이 객체가 아니면 보내지 않음, 저장 순간의 아이로', async () => {
  const run = async (cacheRaw, cloudText) => {
    const calls = [];
    const st = storage({ currentUserName: '민수', currentUser: 'son', MINMIN_INVENTORY_PAGE_ID_민수: 'page-1', ...(cacheRaw === null ? {} : { MINMIN_CLOUD_SETTINGS_민수: cacheRaw }) });
    const sb = settingsSandbox(st, async (url, opts = {}) => {
      calls.push({ url, method: opts.method || 'GET', body: opts.body ? JSON.parse(opts.body) : null });
      if ((opts.method || 'GET') === 'GET') return { ok: true, json: async () => ({ properties: { '학습설정': { rich_text: [{ plain_text: cloudText }] } } }) };
      return { ok: true, json: async () => ({}) };
    });
    sb.SettingsManager.set('vacation_mode', true);
    st.setItem('currentUser', 'daughter'); // 저장 중 아이 전환 — 민수 페이지에 민수 값이 가야 함
    await drain();
    return calls;
  };
  const good = JSON.stringify({ questSettings: { minsu: { english: 'L9' } } });
  for (const bad of ['{깨짐', '{}', '[]', 'null', JSON.stringify({ updatedAt: 'x' })]) {
    const calls = await run(bad, good);
    assert.equal(calls[0].method, 'GET', bad);
    assert.match(calls[0].url, /\/v1\/pages\/page-1\?force=true$/);
    const patch = calls.find(c => c.method === 'PATCH');
    assert.match(patch.url, /\/v1\/pages\/page-1$/);
    const sent = JSON.parse(patch.body.properties['학습설정'].rich_text.map(t => t.text.content).join(''));
    assert.deepEqual(plain(sent.questSettings), { minsu: { english: 'L9' } }, bad);
    assert.equal(sent.appSettings.vacation_mode, true);
  }
  for (const cloud of ['[]', '123', '"글"']) {
    const calls = await run(null, cloud);
    assert.equal(calls.filter(c => c.method === 'PATCH').length, 0, cloud);
  }
  // 쓸 만한 캐시면 읽지 않고 바로
  const calls = await run(JSON.stringify({ questSettings: { minsu: {} } }), good);
  assert.deepEqual(calls.map(c => c.method), ['PATCH']);
});

test('체류: 판정과 기록이 같은 날짜 (자정 경계에서 장부가 섞이지 않음)', () => {
  const st = withRoute(route4());
  const target = TP.dwellTarget(st, '', '사회', Date.now());
  const ledgerKey = TP.DONE_PREFIX + '민수';
  st.setItem(ledgerKey, JSON.stringify({ date: TODAY, s: {}, tp: [], dwell: { society: 29 } }));
  TP.dwellStep(st, target, { search: '', now: Date.now() });
  const ledger = JSON.parse(st.getItem(ledgerKey));
  assert.equal(ledger.date, TODAY);
  assert.deepEqual(plain(ledger.s), { society: ['visit'] });
  assert.ok(read('kids/core/today-path.js').includes('dwellStep(win.localStorage, target, { search, now })'));
});

test('체류 감시: 화면을 떠나면 입력 임대가 끝나 돌아와도 새 터치 전엔 안 쌓임, 휠도 입력', () => {
  const st = withRoute(route4());
  let tick = null;
  const handlers = {};
  const win = { localStorage: st, location: { search: '' }, currentSubject: '사회', StudyActivity: { IDLE_MS: 90000 },
    setInterval: fn => { tick = fn; return 1; },
    document: { visibilityState: 'visible', addEventListener: (type, fn) => { handlers[type] = fn; } } };
  TP.startDwellWatch(win);
  handlers.pointerdown({ isTrusted: true });
  for (let i = 0; i < 5; i++) tick();
  win.document.visibilityState = 'hidden'; handlers.visibilitychange();
  win.document.visibilityState = 'visible';
  for (let i = 0; i < 10; i++) tick();
  assert.equal(TP.readLedger(st, '민수', TODAY).dwell.society, 5);
  handlers.wheel({ isTrusted: true });
  tick();
  assert.equal(TP.readLedger(st, '민수', TODAY).dwell.society, 6);
});

test('시간표: 시간표 화면 캐시와 로비 키 중 더 최근에 받은 것 먼저', () => {
  const lobbyNew = { date: TODAY, savedAt: 2000, rows: [{ child: '민서', dayOfWeek: '화요일', subject: '국어', periodNum: 1 }] };
  const v11Old = { cachedAt: 1000, staticRows: [{ child: '민서', dayOfWeek: '화요일', subject: '수학', periodNum: 1 }], overlayRows: [], allRows: [] };
  const load = init => loadBrowserScripts(['kids/core/timetable-boost.js'], { storage: storage(init) }).sandbox.TimetableBoost;
  assert.deepEqual(plain(load({ MINMIN_TIMETABLE_STATIC_V1: JSON.stringify(lobbyNew), MINMIN_TIMETABLE_CACHE_V11: JSON.stringify(v11Old) }).getSubjectsForDay('민서', '화요일')), ['국어']);
  assert.deepEqual(plain(load({ MINMIN_TIMETABLE_STATIC_V1: JSON.stringify({ ...lobbyNew, savedAt: 500 }), MINMIN_TIMETABLE_CACHE_V11: JSON.stringify(v11Old) }).getSubjectsForDay('민서', '화요일')), ['수학']);
});

test('완주 보너스: 기다리는 동안 노선이 바뀌면 새 노선으로 판정', async () => {
  const st = withRoute(route4(), { [TP.DONE_PREFIX + '민수']: JSON.stringify({ date: TODAY, s: { english: ['lesson'], math: ['story'], society: ['visit'] }, tp: [3] }) });
  const grants = [];
  const { sb } = lobbySandbox(st, { __activeLobbyUser: 'minsu' });
  const pending = sb.LobbyTodayPath.maybeGrantBonus({ name: '민수', key: 'minsu', isMinseo: false }, TODAY, route4());
  // 보상 모듈을 기다리는 사이 방학 노선으로 바뀜(4번 과학, 아직 안 함)
  st.setItem(TP.ROUTE_PREFIX + '민수', JSON.stringify({ ...route4('science'), vacation: true }));
  sb.MinminRewardGrant = { grant: (...a) => grants.push(a) };
  assert.equal(await pending, false);
  assert.equal(grants.length, 0);
});
