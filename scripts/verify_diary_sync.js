// ========================================================
// ✅ 일기장 노션 동기화 회귀 시험 (kids/core/daily-diary.js)
// - 실행:      node scripts/verify_diary_sync.js
// - 실제 노션:  node scripts/verify_diary_sync.js --live   (조회만, 쓰기 없음)
// - 다른 버전:  node scripts/verify_diary_sync.js --file <daily-diary.js 경로>
// 지키는 것: 특별한 날·작품이 일기장에 들어오지 않고, 예전 코드가 이미 캐시한 특별한 날도
// 동기화 한 번에 지워지며, 지우면 안 되는 항목(미업로드·방금 저장·부모 모드 대리 작성·다른 아이)은 남는다.
// DOM 없음, 노션 쓰기 없음. 실패하면 종료 코드 1.
// ========================================================
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const args = process.argv.slice(2);
const LIVE = args.includes('--live');
const fileArgIdx = args.indexOf('--file');
const DIARY_JS = path.resolve(fileArgIdx >= 0 ? args[fileArgIdx + 1] : path.join(__dirname, '../kids/core/daily-diary.js'));
const PROXY = 'https://minmin-notion.awslike6.workers.dev';
const DIARY_DB = '3dfa27115b688010a85be385f91d64ee';

const results = [];
const check = (name, cond, extra) => results.push({ name, ok: !!cond, extra: extra === undefined ? '' : JSON.stringify(extra) });

// ── 노션 페이지 픽스처 (실제 DB 모양 그대로) ──
const rt = s => ({ rich_text: [{ type: 'text', text: { content: s }, plain_text: s }] });
function page(id, sid, gubun, hero, date, body) {
  return { id, properties: {
    '식별ID': { title: [{ type: 'text', text: { content: sid }, plain_text: sid }] },
    '구분': { select: { name: gubun } },
    '주인공': { select: { name: hero } },
    '날짜': { date: { start: date } },
    '작가의 한마디/일기본문': rt(body),
  } };
}
const P = {
  minseo1: page('11111111-0000-4000-8000-000000000001', '민서_2026-10-18 (오후 06:12)', '마음일기', '민서', '2026-10-18', '[날씨/감정: ☀️ 맑음 [🎈 신나요]]\n오늘은 대구에 갔다'),
  minseo2: page('11111111-0000-4000-8000-000000000002', '민서_2026-10-02 (오후 07:30)', '마음일기', '민서', '2026-10-02', '[날씨/감정: ☁️ 흐림]\n오늘은 도청에 갔다'),
  minseoPaper: page('11111111-0000-4000-8000-000000000003', '민서_2026-09-28 (종이일기)', '종이일기', '민서', '2026-09-28', '이모랑 그림을 그렸다'),
  parentMode: page('11111111-0000-4000-8000-000000000004', '부모관리자_2026-10-24 (민서 마음일기)', '마음일기', '부모관리자', '2026-10-24', '[날씨/감정: ☀️ 맑음]\n[부모관리자 검수] 대신 쓴 일기'),
  minsu1: page('22222222-0000-4000-8000-000000000001', '민수_2026-10-20 (보건 수업)', '일기', '민수', '2026-10-20', '[오늘의 기분: 😎 꿀잼·대만족]\n보건 수업을 들었다'),
  dad1: page('33333333-0000-4000-8000-000000000001', '아빠_2026-10-02 (오후 06:20)', '일기', '부모관리자', '2026-10-02', '[오늘의 기분: ☕ 평온·차분]\n아빠 일기'),
  specialA: page('44444444-0000-4000-8000-000000000001', '[특별한 날] 민서_2026-10-22 (진로체험 반려동물 훈련사)', '특별한 날', '민서', '2026-10-22', '진로주간을 맞아 1-2학년 친구들이 반려동물 훈련사 선생님과 함께했어요'),
  specialB: page('44444444-0000-4000-8000-000000000002', 'evt_minseo_birthday_20260915', '특별한 날', '민서', '2026-09-15', '민서의 8번째 생일을 축하하며 온 가족이 모였어요'),
  specialShared: page('44444444-0000-4000-8000-000000000003', 'evt_baseball_droneshow_20260912', '특별한 날', '공동', '2026-09-12', '온 가족이 함께 야구 드론쇼를 보았어요'),
  art: page('55555555-0000-4000-8000-000000000001', 'art_minseo_20261010_가을나무', '작품', '민서', '2026-10-10', '가을 나무 그림'),
};
const FIXTURE = Object.values(P);
const SPECIAL_IDS = [P.specialA.id, P.specialB.id, P.specialShared.id];

// ── 예전 코드(0c322aa 이전)가 캐시에 남긴 모양: category 없음, id는 노션 UUID ──
const minAgo = m => new Date(Date.now() - m * 60000).toISOString();
function oldCacheEntry(p, childName) {
  const date = p.properties['날짜'].date.start;
  return { id: p.id, notionPageId: p.id, childName, isParentEntry: false, date, timeStr: '기록', weather: '☀️ 맑음', moods: [],
    content: p.properties['작가의 한마디/일기본문'].rich_text[0].plain_text, createdAt: date, isNotionSynced: true };
}
function contaminatedCache() {
  return [
    ...[P.minseo1, P.minseo2, P.minseoPaper, P.specialA, P.specialB, P.specialShared].map(p => oldCacheEntry(p, '민서')),
    { id: 'local_unsynced', childName: '민서', date: '2026-10-25', content: '아직 노션에 안 올라간 일기', createdAt: minAgo(120) },
    { id: 'local_just_saved', notionPageId: '99999999-0000-4000-8000-000000000001', isNotionSynced: true, childName: '민서', date: '2026-10-25', content: '방금 저장', createdAt: minAgo(2) },
    { id: 'local_gone', notionPageId: '99999999-0000-4000-8000-000000000002', isNotionSynced: true, childName: '민서', date: '2026-10-01', content: '노션에서 지운 일기', createdAt: minAgo(60 * 24 * 20) },
    { id: 'local_parent_mode', notionPageId: P.parentMode.id, isNotionSynced: true, childName: '민서', date: '2026-10-24', content: '[부모관리자 검수] 대신 쓴 일기', createdAt: minAgo(60 * 24) },
    { id: 'minsu_synced', notionPageId: '99999999-0000-4000-8000-000000000003', isNotionSynced: true, childName: '민수', date: '2026-10-19', accomplish: '민수 일기', createdAt: minAgo(60 * 24 * 5) },
  ];
}

// ── 조회 조건을 그대로 적용하는 노션 fetch 스텁 (쓰기는 기록만 하고 막음) ──
const sel = (p, k) => p.properties[k]?.select?.name;
function makeFetch(pages, opts, log) {
  return async (url, init = {}) => {
    const method = (init.method || 'GET').toUpperCase();
    if (!String(url).includes('/query')) { log.writes.push(`${method} ${url}`); return { ok: false, status: 403, json: async () => ({}), text: async () => '' }; }
    const body = JSON.parse(init.body || '{}');
    log.queries.push({ url: String(url), body });
    const isNewDb = String(url).includes(DIARY_DB);
    if (opts.failNewDb && isNewDb) return { ok: false, status: 500, json: async () => ({}) };
    const [catOr, heroOr] = (body.filter?.and || []).map(c => c.or || []);
    const res = isNewDb ? pages.filter(p => catOr.some(c => sel(p, c.property) === c.select.equals) && heroOr.some(c => sel(p, c.property) === c.select.equals)) : [];
    return { ok: true, status: 200, json: async () => ({ results: res, has_more: !!opts.hasMore }) };
  };
}

function loadDiary(store, fetchImpl) {
  const el = () => new Proxy({}, { get: (t, k) => (k === 'style' ? {} : undefined) });
  const ctx = {
    console: { log() {}, warn() {}, error() {}, info() {} },
    localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
    location: { search: '' },
    document: { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, createElement: el, body: el(), readyState: 'complete' },
    setTimeout() {}, clearTimeout() {}, setInterval() {}, fetch: fetchImpl, URLSearchParams,
    Date, JSON, Math, Array, String, Object, Promise, Number, Set, Map, Intl, navigator: { userAgent: '' },
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(DIARY_JS, 'utf8'), ctx, { filename: DIARY_JS });
  return ctx;
}

async function runSync(pages, opts, childName = '민서', cache = contaminatedCache()) {
  const store = { mimi_daily_diaries: JSON.stringify(cache) };
  const log = { writes: [], queries: [] };
  const ctx = loadDiary(store, makeFetch(pages, opts, log));
  await ctx.syncDiariesFromNotion(childName);
  const after = JSON.parse(store.mimi_daily_diaries || '[]');
  const has = id => after.some(x => x.id === id || x.notionPageId === id);
  return { ctx, store, log, after, has, specialLeft: after.filter(x => SPECIAL_IDS.includes(x.notionPageId || x.id)).length };
}

async function main() {
  console.log(`대상: ${path.relative(process.cwd(), DIARY_JS)}`);

  // 1) 파서 게이트: 비일기 페이지는 일기 객체가 되지 않는다
  {
    const ctx = loadDiary({}, async () => ({ ok: false }));
    check('파서: [특별한 날] 제목 페이지 → null', ctx.parseNotionDiaryPage(P.specialA, '민서') === null);
    check('파서: evt_ 특별한 날 페이지 → null', ctx.parseNotionDiaryPage(P.specialB, '민서') === null);
    check('파서: 작품 페이지 → null', ctx.parseNotionDiaryPage(P.art, '민서') === null);
    check('파서: 아빠 일기는 민서 일기장에서 → null', ctx.parseNotionDiaryPage(P.dad1, '민서') === null);
    const pm = ctx.parseNotionDiaryPage(P.parentMode, '민서');
    check('파서: 부모 모드 대리 작성 → 민서 일기', pm && pm.childName === '민서', pm && pm.childName);
  }

  // 2) 조회 계약: 구분·주인공 조건
  {
    const r = await runSync(FIXTURE, {}, '민서');
    const body = r.log.queries.find(q => q.url.includes(DIARY_DB))?.body;
    const cats = (body?.filter?.and?.[0]?.or || []).map(c => c.select.equals);
    const heroes = (body?.filter?.and?.[1]?.or || []).map(c => c.select.equals);
    check('조회: 구분은 마음일기·일기·종이일기만', JSON.stringify([...cats].sort()) === JSON.stringify(['마음일기', '일기', '종이일기'].sort()), cats);
    check('조회: 아이 일기장 주인공 = 아이 + 부모관리자 (공동 제외)', heroes.includes('민서') && heroes.includes('부모관리자') && !heroes.includes('공동'), heroes);
    const rp = await runSync(FIXTURE, {}, '아빠');
    const pHeroes = (rp.log.queries.find(q => q.url.includes(DIARY_DB))?.body?.filter?.and?.[1]?.or || []).map(c => c.select.equals);
    check('조회: 부모 일기장 주인공 = 부모관리자·공동 (없는 선택지 아빠 금지)', !pHeroes.includes('아빠') && pHeroes.includes('부모관리자'), pHeroes);
  }

  // 3) 예전 코드가 오염시킨 캐시 + 정상 동기화 → 정리
  {
    const r = await runSync(FIXTURE, {});
    check('정상 동기화: 캐시에 남은 특별한 날 전부 제거', r.specialLeft === 0, r.specialLeft);
    check('정상 동기화: 노션에서 지운 일기 제거', !r.has('99999999-0000-4000-8000-000000000002'));
    check('정상 동기화: 실제 민서 일기 3건 유지', [P.minseo1, P.minseo2, P.minseoPaper].every(p => r.has(p.id)));
    check('정상 동기화: 미업로드 로컬 일기 유지', r.has('local_unsynced'));
    check('정상 동기화: 방금(10분 이내) 저장한 일기 유지', r.has('99999999-0000-4000-8000-000000000001'));
    check('정상 동기화: 부모 모드 대리 작성 일기 유지', r.has(P.parentMode.id));
    check('정상 동기화: 다른 아이(민수) 항목은 건드리지 않음', r.has('99999999-0000-4000-8000-000000000003'));
    check('정상 동기화: 작품은 캐시에 없음', !r.has(P.art.id));
    check('정상 동기화: 노션 쓰기 0건', r.log.writes.length === 0, r.log.writes);
    let html = '';
    try { html = r.ctx.renderDiaryHistoryList('민서', false); } catch (e) { html = 'ERROR ' + e.message; }
    check('화면: 지난 일기 목록에 특별한 날 내용 없음', !/진로주간|생일을 축하|드론쇼/.test(html) && /대구에 갔다/.test(html), html.slice(0, 80));
  }

  // 4) 정리하면 안 되는 결과: 다음 페이지 남음 / 신규 DB 실패 후 레거시 폴백
  {
    const r = await runSync(FIXTURE, { hasMore: true });
    check('has_more 결과: 정리하지 않음(지운 일기·미업로드 그대로)', r.has('99999999-0000-4000-8000-000000000002') && r.has('local_unsynced'));
    const f = await runSync(FIXTURE, { failNewDb: true });
    check('레거시 폴백: 정리하지 않음', f.has('99999999-0000-4000-8000-000000000002') && f.has('99999999-0000-4000-8000-000000000001'));
  }

  // 5) (선택) 실제 노션 데이터로 같은 정리 확인 — 조회만
  if (LIVE) {
    const pages = [];
    let cursor;
    do {
      const resp = await fetch(`${PROXY}/v1/databases/${DIARY_DB}/query`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' }, body: JSON.stringify(cursor ? { page_size: 100, start_cursor: cursor } : { page_size: 100 }) });
      const data = await resp.json();
      pages.push(...(data.results || []));
      cursor = data.has_more ? data.next_cursor : null;
    } while (cursor);
    const liveSpecial = pages.filter(p => sel(p, '구분') === '특별한 날' && ['민서', '공동'].includes(sel(p, '주인공')));
    const liveDiaries = pages.filter(p => ['마음일기', '일기', '종이일기'].includes(sel(p, '구분')) && sel(p, '주인공') === '민서');
    const cache = [...liveDiaries, ...liveSpecial].map(p => oldCacheEntry(p, '민서'));
    const r = await runSync(pages, {}, '민서', cache);
    const liveSpecialLeft = r.after.filter(x => liveSpecial.some(p => p.id === (x.notionPageId || x.id))).length;
    check(`실제 노션: 캐시의 특별한 날 ${liveSpecial.length}건 → 0건`, liveSpecialLeft === 0, liveSpecialLeft);
    check(`실제 노션: 민서 일기 ${liveDiaries.length}건 유지`, liveDiaries.every(p => r.has(p.id)));
    check('실제 노션: 노션 쓰기 0건', r.log.writes.length === 0, r.log.writes);
  }

  const pass = results.filter(r => r.ok).length;
  console.log(results.map(r => `${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.ok ? '' : '  ' + r.extra}`).join('\n'));
  console.log(`\n${pass === results.length ? 'PASS' : 'FAIL'}: ${pass}/${results.length}`);
  if (pass !== results.length) process.exitCode = 1;
}

main().catch(e => { console.error('FAIL  시험 실행 오류:', e); process.exitCode = 1; });
