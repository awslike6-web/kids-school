/**
 * 📒 [Study Log Store] 학습일지 일일 Upsert + 연속 학습 스트릭 단일 원천 (study-log-store.js)
 * - 학습일지 쓰기: `{학생}_{KST YYYY-MM-DD}_{과목}` 키로 당일 1건만 유지 (있으면 PATCH 누적, 없으면 POST)
 * - 스트릭: 노션 STUDY_LOG_DB '입장' 날짜(KST)로 계산하고, 일지 전송 성공 즉시 로컬 캐시에 오늘을 반영
 * - notion-study-logger.js(파사드 경로)와 notion-reward.js(퀘스트·용어사전 경로)가 모두 이 모듈 하나만 호출한다
 */

(function (window) {
  'use strict';

  const DAYS_KEY_PREFIX = 'MINMIN_STUDY_DAYS_V2_';
  const LEGACY_STREAK_PREFIX = 'MINMIN_STREAK_V1_'; // 가짜 기본값(4일)이 저장돼 있던 구 캐시
  const LOOKBACK_DAYS = 60;
  const MAX_QUERY_PAGES = 10;
  const ERROR_REPORT_LIMIT = 1900;
  const NO_ERRORS = '오답 없음';
  const PAGE_IDS_KEY = 'MINMIN_STUDY_LOG_PAGES_V1';
  const QUERY_RETRY_MS = 400;
  const pendingByKey = new Map();
  // Worker v4.6은 이 쿼리를 제거한 뒤 노션으로 전달하고 캐시를 우회합니다.
  const FRESH_QUERY = 'force=true';
  const freshUrl = path => `${path}?${FRESH_QUERY}`;

  // ---------- KST 날짜 (toISOString 슬라이싱 금지 계약) ----------
  const pad = n => String(n).padStart(2, '0');

  function getKstDateString(input = new Date()) {
    const d = input instanceof Date ? input : new Date(input);
    if (isNaN(d.getTime())) return '';
    const kst = new Date(d.getTime() + 9 * 3600000);
    return `${kst.getUTCFullYear()}-${pad(kst.getUTCMonth() + 1)}-${pad(kst.getUTCDate())}`;
  }

  // 'YYYY-MM-DD' 계약 포맷 날짜를 days만큼 이동
  function shiftDate(dateStr, days) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const t = new Date(Date.UTC(y, m - 1, d + days));
    return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
  }

  function normalizeChildName(child) {
    const c = String(child || '').trim().toLowerCase();
    return (c === 'minseo' || c === 'daughter' || c === '민서') ? '민서' : '민수';
  }

  function notionConfig() {
    const cfg = typeof APP_CONFIG !== 'undefined' ? APP_CONFIG : (window.APP_CONFIG || {});
    return {
      proxyUrl: (typeof PROXY_URL !== 'undefined' && PROXY_URL) || cfg.WORKER_PROXY_URL || 'https://minmin-notion.awslike6.workers.dev',
      dbId: (typeof STUDY_LOG_DB_ID !== 'undefined' && STUDY_LOG_DB_ID) || cfg.STUDY_LOG_DB_ID || '37aa27115b688001b2ffe5e6c8f82ab2'
    };
  }

  // ---------- 학습일지 Upsert ----------
  function buildLogKey(childName, subject, dateStr = getKstDateString()) {
    return `${childName}_${dateStr}_${subject}`;
  }

  const richText = prop => (prop?.rich_text || []).map(t => t.plain_text ?? t.text?.content ?? '').join('');

  function mergeErrorReports(prev, next) {
    if (!next || next === NO_ERRORS) return prev || NO_ERRORS;
    if (!prev || prev === NO_ERRORS) return next;
    // ' | '는 이 모듈이 쓰는 항목 구분자 계약이며 자연어 내용을 해석하지 않습니다.
    return prev.split(' | ').includes(next) ? prev : `${prev} | ${next}`;
  }

  function loadPageIds() {
    const date = getKstDateString();
    try {
      const data = JSON.parse(window.localStorage.getItem(PAGE_IDS_KEY) || 'null');
      if (data?.date === date && data.pages && typeof data.pages === 'object') return data;
      window.localStorage.removeItem(PAGE_IDS_KEY);
    } catch (e) {}
    return { date, pages: {} };
  }
  function rememberPage(key, id) {
    try {
      const data = loadPageIds();
      if (id) data.pages[key] = id;
      else delete data.pages[key];
      window.localStorage.setItem(PAGE_IDS_KEY, JSON.stringify(data));
    } catch (e) {} // 저장 공간 부족·사생활 모드가 쓰기 성공을 뒤집지 않게 합니다.
  }
  async function readRememberedPage(key) {
    const id = loadPageIds().pages[key];
    if (!id) return null;
    try {
      const { proxyUrl } = notionConfig();
      const res = await window.fetch(freshUrl(`${proxyUrl}/v1/pages/${id}`));
      if (res.status === 404) { rememberPage(key, null); return null; }
      if (!res.ok) return null;
      const page = await res.json();
      if (page.archived || page.in_trash) { rememberPage(key, null); return null; }
      return page;
    } catch (e) { return null; }
  }
  async function findPageByKey(key) {
    const { proxyUrl, dbId } = notionConfig();
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await window.fetch(freshUrl(`${proxyUrl}/v1/databases/${dbId}/query`), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filter: { property: 'ID', title: { equals: key } }, page_size: 1 })
        });
        if (!res.ok) throw new Error(`조회 상태 ${res.status}`);
        const data = await res.json(), page = (data.results && data.results[0]) || null;
        if (page) rememberPage(key, page.id);
        return { page, failed: false };
      } catch (e) {
        if (attempt === 0) await new Promise(resolve => setTimeout(resolve, QUERY_RETRY_MS));
      }
    }
    return { page: null, failed: true };
  }
  async function serialize(key, fn) {
    if (window.navigator?.locks?.request) return window.navigator.locks.request('minmin-study-log:' + key, fn);
    const pending = (pendingByKey.get(key) || Promise.resolve()).catch(() => {}).then(fn);
    pendingByKey.set(key, pending);
    try { return await pending; }
    finally { if (pendingByKey.get(key) === pending) pendingByKey.delete(key); }
  }

  /**
   * 당일 같은 학생·과목 학습일지를 1건으로 누적 기록한다. 실패하면 예외를 던진다.
   * @returns {Promise<{mode:'patch'|'post', pageId:string|null, key:string}>}
   */
  async function upsertStudyLog(entry) {
    const key = buildLogKey(entry.childName, entry.subject);
    return serialize(key, () => writeStudyLog(entry, key));
  }
  async function writeStudyLog(entry, key) {
    const childName = entry.childName;
    const subject = entry.subject;
    const durationMinutes = Number(entry.durationMinutes) || 0;
    const wordFairyCount = Number(entry.wordFairyCount) || 0;
    const errorReport = entry.errorReport || NO_ERRORS;
    const { proxyUrl, dbId } = notionConfig();

    let page = await readRememberedPage(key);
    if (!page) {
      const found = await findPageByKey(key); page = found.page;
      if (found.failed) console.warn('⚠️ [학습일지 Upsert] 조회 실패로 신규 생성(중복 가능)');
    }
    let res;
    let mode;
    if (page) {
      mode = 'patch';
      const p = page.properties || {};
      const merged = mergeErrorReports(richText(p['오답리포트']), errorReport);
      res = await window.fetch(`${proxyUrl}/v1/pages/${page.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          properties: {
            '소요시간': { number: (p['소요시간']?.number || 0) + durationMinutes },
            '단어요정': { number: (p['단어요정']?.number || 0) + wordFairyCount },
            '오답리포트': { rich_text: [{ text: { content: merged.slice(0, ERROR_REPORT_LIMIT) } }] },
            '퇴장': { date: { start: entry.endTime } }
          }
        }),
        keepalive: true
      });
    } else {
      mode = 'post';
      res = await window.fetch(`${proxyUrl}/v1/pages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parent: { database_id: dbId },
          properties: {
            'ID': { title: [{ text: { content: key } }] },
            '학생': { select: { name: childName } },
            '과목': { rich_text: [{ text: { content: subject } }] },
            '입장': { date: { start: entry.startTime } },
            '퇴장': { date: { start: entry.endTime } },
            '소요시간': { number: durationMinutes },
            '오답리포트': { rich_text: [{ text: { content: errorReport.slice(0, ERROR_REPORT_LIMIT) } }] },
            '단어요정': { number: wordFairyCount }
          }
        }),
        keepalive: true
      });
    }

    if (!res.ok) throw new Error(`노션 ${mode === 'patch' ? 'PATCH' : 'POST'} 통신 오류 (상태: ${res.status})`);
    if (mode === 'post') {
      try { rememberPage(key, (await res.json()).id); } catch (e) {}
    }
    console.log(mode === 'patch'
      ? `📦 [학습일지 Upsert] 당일 기록(${page.id})에 누적했습니다. (키: ${key})`
      : `🎉 [학습일지 Upsert] 오늘 첫 기록을 만들었습니다. (키: ${key})`);

    markStudiedToday(childName);
    return { mode, pageId: page ? page.id : null, key };
  }

  // ---------- 연속 학습 스트릭 ----------
  function loadDays(childName) {
    try {
      localStorage.removeItem(LEGACY_STREAK_PREFIX + childName);
      const parsed = JSON.parse(localStorage.getItem(DAYS_KEY_PREFIX + childName) || 'null');
      return Array.isArray(parsed?.days) ? parsed.days : [];
    } catch (e) {
      return [];
    }
  }

  function saveDays(childName, days) {
    const since = shiftDate(getKstDateString(), -LOOKBACK_DAYS);
    const kept = [...new Set(days)].filter(d => d >= since).sort().reverse();
    try {
      localStorage.setItem(DAYS_KEY_PREFIX + childName, JSON.stringify({ days: kept, savedAt: Date.now() }));
    } catch (e) {}
    return kept;
  }

  /** 오늘(KST)이 학습한 날임을 로컬 캐시에 즉시 반영 */
  function markStudiedToday(child) {
    const childName = normalizeChildName(child);
    saveDays(childName, [...loadDays(childName), getKstDateString()]);
    return getStreakData(childName);
  }

  /**
   * 학습한 날짜 목록으로 연속 일수를 계산한다. 오늘 아직 안 했어도 어제까지 이어졌으면 연속은 살아 있다.
   */
  function computeStreak(days, today = getKstDateString()) {
    const set = new Set(days);
    const lastDate = [...set].sort().pop() || null;
    let cursor = set.has(today) ? today : shiftDate(today, -1);
    let count = 0;
    while (set.has(cursor)) {
      count++;
      cursor = shiftDate(cursor, -1);
    }
    return { count, studiedToday: set.has(today), lastDate };
  }

  function getStreakData(child) {
    const childName = normalizeChildName(child);
    return { childName, ...computeStreak(loadDays(childName)) };
  }

  /** 노션 STUDY_LOG_DB에서 최근 학습일을 읽어 로컬 캐시를 갱신한다 (연속이 끊긴 지점까지만 페이지를 넘긴다). */
  async function refreshStreak(child) {
    const childName = normalizeChildName(child);
    const { proxyUrl, dbId } = notionConfig();
    const today = getKstDateString();
    const days = new Set(loadDays(childName));
    let cursor;

    for (let i = 0; i < MAX_QUERY_PAGES; i++) {
      const res = await window.fetch(`${proxyUrl}/v1/databases/${dbId}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          filter: { and: [
            { property: '학생', select: { equals: childName } },
            { property: '입장', date: { on_or_after: shiftDate(today, -LOOKBACK_DAYS) } }
          ] },
          sorts: [{ property: '입장', direction: 'descending' }],
          page_size: 100,
          ...(cursor ? { start_cursor: cursor } : {})
        })
      });
      if (!res.ok) throw new Error(`스트릭 조회 상태 ${res.status}`);
      const data = await res.json();
      let oldest = null;
      for (const page of data.results || []) {
        const d = getKstDateString(page.properties?.['입장']?.date?.start || page.created_time);
        if (d) {
          days.add(d);
          oldest = d;
        }
      }
      if (!data.has_more || !data.next_cursor) break;
      // 지금까지의 연속 구간 시작일보다 오래된 기록까지 읽었으면 더 넘길 필요가 없다
      const s = computeStreak([...days], today);
      const runStart = s.count > 0 ? shiftDate(today, s.studiedToday ? -(s.count - 1) : -s.count) : shiftDate(today, -1);
      if (oldest && oldest < runStart) break;
      cursor = data.next_cursor;
    }

    saveDays(childName, [...days]);
    return getStreakData(childName);
  }

  /** 로비 HUD 🔥 배지. 연속 기록이 없으면 배지를 숨긴다. */
  function renderStreakBadge(targetElementId, child, isDarkTheme = false) {
    const el = document.getElementById(targetElementId);
    if (!el) return;
    const data = getStreakData(child);
    if (data.count <= 0) {
      el.className = 'hidden';
      el.innerHTML = '';
      el.removeAttribute('title');
      return;
    }

    if (isDarkTheme) {
      el.className = 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full whitespace-nowrap bg-amber-950/80 border border-amber-400/60 shadow-[0_0_10px_rgba(245,158,11,0.35)] select-none animate-pulse';
      el.innerHTML = `
        <span class="text-xs animate-bounce" style="display:inline-block;">🔥</span>
        <span class="font-mono text-[10px] font-black text-amber-300 tracking-wide">${data.count}일 연속 탐험 중!</span>
      `;
    } else {
      el.className = 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full whitespace-nowrap bg-amber-100/90 border border-amber-300 text-amber-950 shadow-sm select-none animate-pulse';
      el.innerHTML = `
        <span class="text-xs animate-bounce" style="display:inline-block;">🔥</span>
        <span class="font-bold text-[11px] text-amber-900 tracking-tight">${data.count}일 연속 탐험 중!</span>
      `;
    }
    el.title = `최근 학습일: ${data.lastDate} (연속 ${data.count}일${data.studiedToday ? '' : ' · 오늘 탐험하면 이어져요'})`;
  }

  window.StudyLogStore = {
    getKstDateString,
    buildLogKey,
    upsertStudyLog,
    computeStreak,
    getStreakData,
    markStudiedToday,
    refreshStreak,
    renderStreakBadge
  };

  // 하위 호환: 2026-10-24 streak-manager.js가 내보내던 API 이름 유지
  window.StreakManager = {
    getStreakData,
    recordStudyActivity: markStudiedToday,
    renderLobbyStreak: renderStreakBadge,
    refreshStreak,
    getKstDateString
  };
})(typeof window !== 'undefined' ? window : this);
