/**
 * 🛤️ lobby_today_path.js — 로비 「오늘의 길」 카드 (docs/today_path_spec.md §4·§7)
 * - 입력 모으기: 시간표(TimetableBoost.getSubjectsForDay), 학습일지 하루 한 번 읽기(노션 쓰기 없음), VOCA 캐시
 * - 편성은 kids/core/today-path.js(TodayPath.plan), 이 파일은 조회·그리기만
 * - 전역: LobbyTodayPath.mount(userKey) — 여러 번 불려도 된다(번호표로 늦은 결과는 버림)
 */
(function () {
  'use strict';

  const QUERY_BUDGET_MS = 6000;   // 학습일지·어휘 캐시 기다림 (spec §4-2)
  const CORE_WAIT_MS = 10000;     // notion-helper가 비동기로 싣는 코어 기다림
  const MAX_PAGES = 5;
  const EMOJI = { today: '🎒', tomorrow: '🔭', review: '🔁', rotate: '🎡' };
  const SUBJECT_EMOJI = { korean: '📖', math: '🧮', english: '🔤', society: '🏛️', science: '🧪', haru: '🌱' };
  let token = 0;
  const inflight = {};

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const config = () => (typeof APP_CONFIG !== 'undefined' ? APP_CONFIG : {});

  function childOf(userKey) {
    const isMinseo = userKey === 'minseo';
    const cfg = config();
    const name = cfg.CHILDREN ? (isMinseo ? cfg.CHILDREN.second.name : cfg.CHILDREN.first.name) : (isMinseo ? '민서' : '민수');
    return { key: isMinseo ? 'minseo' : 'minsu', name, isMinseo };
  }

  async function waitFor(check, until) {
    while (!check() && Date.now() < until) await sleep(100);
    return check();
  }

  /** 학습일지: 이 아이 · 입장 ≥ 오늘−8일 · 입장 내림차순 · 최대 5쪽. 시간 초과·실패면 null (부분 자료로 하루를 고정하지 않음) */
  async function queryStudyLog(childName, today, until) {
    const cfg = config();
    const proxy = cfg.WORKER_PROXY_URL || 'https://minmin-notion.awslike6.workers.dev';
    const db = cfg.STUDY_LOG_DB_ID || '37aa27115b688001b2ffe5e6c8f82ab2';
    const pages = [];
    let cursor;
    for (let i = 0; i < MAX_PAGES; i++) {
      const left = until - Date.now();
      if (left <= 0) return null;
      const controller = typeof AbortController === 'function' ? new AbortController() : null;
      const timer = controller ? setTimeout(() => controller.abort(), left) : null;
      try {
        const body = {
          filter: { and: [
            { property: '학생', select: { equals: childName } },
            { property: '입장', date: { on_or_after: window.TodayPath.shiftDate(today, -8) } }
          ] },
          sorts: [{ property: '입장', direction: 'descending' }],
          page_size: 100,
          ...(cursor ? { start_cursor: cursor } : {})
        };
        const res = await fetch(`${proxy}/v1/databases/${db}/query`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
          ...(controller ? { signal: controller.signal } : {})
        });
        if (!res.ok) return null;
        const data = await res.json();
        if (!data || !Array.isArray(data.results)) return null;
        pages.push(...data.results);
        if (!data.has_more || !data.next_cursor) break;
        cursor = data.next_cursor;
      } catch (e) {
        return null;
      } finally {
        if (timer) clearTimeout(timer);
      }
    }
    return pages;
  }

  function loadVoca(childName) {
    if (typeof window._loadVocaFromCache !== 'function') return [];
    const db = config().VOCA_DB_ID || '375a27115b688038b686d3994ee12919';
    const all = window._loadVocaFromCache('ALL', db);
    if (Array.isArray(all) && all.length) return all;
    const mine = window._loadVocaFromCache(childName, db);
    return Array.isArray(mine) ? mine : [];
  }

  function rooms() {
    const meta = typeof SUBJECT_META !== 'undefined' ? SUBJECT_META : {};
    return Object.fromEntries(Object.entries(meta).map(([key, m]) => [key, m.href]));
  }

  function eligibleOf(child) {
    const cfg = typeof USER_CONFIGS !== 'undefined' ? USER_CONFIGS[child.key] : null;
    return cfg && Array.isArray(cfg.subjects) ? cfg.subjects : [];
  }

  function haruDone(child, today) {
    try { return localStorage.getItem(`haru_checkin_done_${today}_${child.key}`) === 'true'; } catch (e) { return false; }
  }

  async function build(child, today, previous, now) {
    const TP = window.TodayPath;
    await waitFor(() => window.TimetableBoost && window.LearningLog && typeof window._loadVocaFromCache === 'function', Date.now() + CORE_WAIT_MS);
    const until = Date.now() + QUERY_BUDGET_MS;
    const vocaReady = Promise.race([Promise.resolve(window.__lobbyVocaPrefetch).catch(() => {}), sleep(QUERY_BUDGET_MS)]);
    const [pages] = await Promise.all([queryStudyLog(child.name, today, until), vocaReady]);
    const decode = window.LearningLog && window.LearningLog.decode;
    const history = pages ? TP.historyFromPages(pages, today, decode) : null;
    if (previous && history === null) return { ...previous, retried: true }; // 보정도 실패 → 그날은 그대로
    const days = TP.schoolDays(now); // mount 때 시각 하나로 — 조회 중 자정을 넘겨도 history 기준일과 노선 날짜가 같다
    const getDay = window.TimetableBoost && window.TimetableBoost.getSubjectsForDay;
    const timetable = getDay ? {
      [days.todayName]: getDay(child.name, days.todayName),
      [days.nextName]: getDay(child.name, days.nextName)
    } : {};
    const route = TP.plan({ child: child.name, childKey: child.key, now, timetable, eligible: eligibleOf(child), history, voca: loadVoca(child.name), rooms: rooms() });
    if (previous) route.retried = true;
    return route;
  }

  // ---------- 그리기 ----------
  function ensureStyle() {
    if (document.getElementById('today-path-style')) return;
    const style = document.createElement('style');
    style.id = 'today-path-style';
    style.textContent = `
      .tp-card{border-radius:24px;padding:14px;margin-bottom:4px}
      .tp-head{display:flex;align-items:center;gap:8px;margin-bottom:10px}
      .tp-head h2{font-size:1.1rem;font-weight:800;margin:0}
      .tp-count{margin-left:auto;font-size:.8rem;font-weight:800;padding:2px 10px;border-radius:999px}
      .tp-all{font-size:.8rem;font-weight:800}
      .tp-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
      @media (min-width:560px){.tp-grid{grid-template-columns:repeat(4,minmax(0,1fr))}}
      .tp-stop{position:relative;display:flex;flex-direction:column;gap:2px;min-height:96px;padding:10px 10px 8px;border-radius:16px;text-decoration:none;overflow:hidden;transition:transform .15s}
      .tp-stop:active{transform:scale(.97)}
      .tp-top{display:flex;align-items:center;gap:6px}
      .tp-emoji{font-size:1.35rem;line-height:1}
      .tp-title{font-size:.78rem;font-weight:800;opacity:.8}
      .tp-subj{font-size:1rem;font-weight:900}
      .tp-detail{font-size:.72rem;line-height:1.25;opacity:.85;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;word-break:keep-all}
      .tp-check{position:absolute;top:6px;right:8px;font-size:1.1rem}
      .tp-badge{position:absolute;top:0;right:0;font-size:.62rem;font-weight:900;padding:2px 8px;border-bottom-left-radius:10px}
      .tp-loading{font-size:.85rem;font-weight:700;opacity:.8;padding:6px 2px}
      .tp-minsu{background:rgba(15,23,42,.72);border:1px solid rgba(34,211,238,.35);color:#e2e8f0;box-shadow:0 0 18px rgba(34,211,238,.12)}
      .tp-minsu .tp-count{background:rgba(34,211,238,.15);color:#67e8f9}
      .tp-minsu .tp-stop{background:rgba(30,41,59,.85);border:1px solid rgba(148,163,184,.25);color:#e2e8f0}
      .tp-minsu .tp-stop.is-next{border-color:#22d3ee;box-shadow:0 0 12px rgba(34,211,238,.45)}
      .tp-minsu .tp-badge{background:#22d3ee;color:#0f172a}
      .tp-minsu .tp-stop.is-done{opacity:.6}
      .tp-minseo{background:rgba(255,255,255,.9);border:4px solid rgba(255,255,255,.95);color:#4b5563;box-shadow:0 10px 24px rgba(236,72,153,.12)}
      .tp-minseo .tp-count{background:#fce7f3;color:#db2777}
      .tp-minseo .tp-stop{background:#fdf2f8;border:2px solid #fbcfe8;color:#4b5563}
      .tp-minseo .tp-stop.is-next{border-color:#ec4899;background:#fff;box-shadow:0 6px 16px rgba(236,72,153,.25)}
      .tp-minseo .tp-badge{background:#ec4899;color:#fff}
      .tp-minseo .tp-stop.is-done{background:#f0fdf4;border-color:#bbf7d0}
    `;
    document.head.appendChild(style);
  }

  function render(container, route, child, today) {
    const TP = window.TodayPath;
    ensureStyle();
    const ledger = TP.readLedger(localStorage, child.name, today);
    const done = TP.doneState(route, ledger, haruDone(child, today));
    const count = done.filter(Boolean).length;
    const next = done.findIndex(d => !d);
    const theme = child.isMinseo ? 'tp-minseo' : 'tp-minsu';
    const stops = route.stops.map((stop, i) => {
      const subjectName = TP.SUBJECTS[stop.subject] || '';
      const cls = ['tp-stop', done[i] ? 'is-done' : '', i === next ? 'is-next' : ''].filter(Boolean).join(' ');
      const label = `${stop.n}번 ${stop.title} ${subjectName}${done[i] ? ' 완료' : ''}`;
      return `<a class="${cls}" href="${esc(stop.href || '#')}" data-stop="${stop.n}" aria-label="${esc(label)}">
          ${i === next ? '<span class="tp-badge">추천</span>' : ''}${done[i] ? '<span class="tp-check" aria-hidden="true">✅</span>' : ''}
          <span class="tp-top"><span class="tp-emoji" aria-hidden="true">${EMOJI[stop.kind] || '⭐'}</span><span class="tp-title">${esc(stop.title)}</span></span>
          <span class="tp-subj">${SUBJECT_EMOJI[stop.subject] || ''} ${esc(subjectName)}</span>
          <span class="tp-detail">${esc(stop.detail)}</span>
        </a>`;
    }).join('');
    container.innerHTML = `<section class="tp-card ${theme}" aria-label="오늘의 길" data-date="${esc(route.date)}">
        <div class="tp-head"><h2>🛤️ 오늘의 길</h2>${count === 4 ? '<span class="tp-all">🎉 오늘의 길 완주!</span>' : ''}<span class="tp-count">${count}/4</span></div>
        <div class="tp-grid">${stops}</div>
      </section>`;
    container.hidden = false;
  }

  function renderLoading(container, child) {
    ensureStyle();
    container.innerHTML = `<section class="tp-card ${child.isMinseo ? 'tp-minseo' : 'tp-minsu'}" aria-label="오늘의 길" aria-busy="true">
        <p class="tp-loading">🛤️ 오늘의 길을 준비하고 있어요…</p></section>`;
    container.hidden = false;
  }

  /** 3번만 어휘 캐시가 채워진 뒤 한 번 다시 고른다(1·2·4번 그대로, 3번을 아직 안 했을 때만) — spec §6-1 */
  function refreshReviewWhenReady(child, today, container, my) {
    const TP = window.TodayPath;
    const tryNow = () => {
      if (my !== token) return false;
      const route = TP.loadRoute(localStorage, child.name, today);
      if (!route || !route.reviewPending) return true;
      const done = TP.doneState(route, TP.readLedger(localStorage, child.name, today), haruDone(child, today));
      const voca = loadVoca(child.name);
      if (done[2] || !voca.length) return false;
      const next = TP.refreshReview(route, { childKey: child.key, eligible: eligibleOf(child), rooms: rooms(), voca });
      if (!next) return false;
      if (!TP.isParentSession(localStorage)) TP.saveRoute(localStorage, child.name, next);
      render(container, next, child, today);
      return true;
    };
    if (!tryNow()) Promise.resolve(window.__lobbyVocaPrefetch).catch(() => {}).then(tryNow);
  }

  async function mount(userKey) {
    const TP = window.TodayPath;
    const child = childOf(userKey);
    const container = document.getElementById(child.isMinseo ? 'todayPathMinseo' : 'todayPathMinsu');
    if (!TP || !container) return;
    const my = ++token;
    const now = Date.now();
    const today = TP.kstDate(now);
    const parent = TP.isParentSession(localStorage);
    let route = TP.loadRoute(localStorage, child.name, today);
    const done = route ? TP.doneState(route, TP.readLedger(localStorage, child.name, today), haruDone(child, today)) : [];
    if (route) render(container, route, child, today);
    if (route && !TP.shouldReplan(route, done)) {
      if (route.reviewPending && !parent) refreshReviewWhenReady(child, today, container, my);
      return;
    }
    if (!route) renderLoading(container, child);
    const job = inflight[child.name] || (inflight[child.name] = build(child, today, route, now).finally(() => { delete inflight[child.name]; }));
    try {
      route = await job;
    } catch (e) {
      console.warn('[오늘의 길] 편성 실패:', e);
      return;
    }
    if (my !== token || !route) return;
    if (!parent) TP.saveRoute(localStorage, child.name, route); // 부모 시뮬레이터는 아이 기기 노선을 바꾸지 않음
    render(container, route, child, today);
    if (route.reviewPending && !parent) refreshReviewWhenReady(child, today, container, my);
  }

  // 뒤로 가기로 돌아오면 완료 상태를 다시 읽고, 날짜가 바뀌었으면 새로 편성한다.
  // (처음 열릴 때의 pageshow는 무시 — 그때는 로비 컨트롤러가 mount를 부른다)
  window.addEventListener('pageshow', event => {
    if (event.persisted && window.__activeLobbyUser) mount(window.__activeLobbyUser);
  });

  window.LobbyTodayPath = { mount, queryStudyLog };
})();
