/**
 * 🛤️ today-path.js — 공부방 루틴 라인 「오늘의 길」 편성·완료 장부 (docs/today_path_spec.md)
 * - 순수 편성 plan(): 오늘 배운 것 / 내일 맛보기 / 다시 보기 / 돌림 칸 네 정거장 (DOM·네트워크 없음)
 * - 학습일지 행 → 최근 7일 방문·문항기록 정리 historyFromPages() (순수)
 * - 완료 장부 markDone()·doneState(), 노선 고정 loadRoute()·saveRoute() (기기 localStorage만, 노션 쓰기 없음)
 * 과목은 아래 SUBJECTS 맵과 정확히 같은 글자만 받는다(GEMINI §8-5, includes·정규식 금지).
 * 로비 카드 그리기와 입력 모으기는 kids/js/lobby_today_path.js.
 */
(function (root) {
  'use strict';

  const SUBJECTS = { korean: '국어', math: '수학', english: '영어', society: '사회', science: '과학', haru: '하루' };
  const KO_TO_KEY = Object.fromEntries(Object.entries(SUBJECTS).map(([key, ko]) => [ko, key]));
  const VOCA_SUBJECTS = ['korean', 'english', 'society', 'science']; // 3·3·3 레슨이 되는 교과
  const DAY_NAMES = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
  const KINDS = ['lesson', 'quiz', 'story', 'reading', 'visit']; // visit = 4번 체류 30초 (4번 판정에만, spec §15-1)
  const STUDY_KINDS = ['lesson', 'quiz', 'story', 'reading'];
  const DWELL_SECONDS = 30;
  const PARENTS = ['아빠', '엄마', '어른'];
  const ROUTE_PREFIX = 'MINMIN_TODAY_PATH_V1_';
  const DONE_PREFIX = 'MINMIN_TODAY_PATH_DONE_V1_';
  const DAY_MS = 86400000;
  const KST_MS = 9 * 3600000;
  // quest-mastery.js와 같은 숙련도 규칙 (시험이 실제 모듈과 대조: tests/today-path.test.mjs)
  const SILVER = 6, GOLD = 9, RUSTY_DAYS = 2;

  // ---------- 과목·날짜 ----------
  /** 과목 키 또는 맵의 한글과 정확히 같을 때만 키를 돌려준다. */
  function subjectKey(value) {
    if (typeof value !== 'string') return null;
    if (Object.prototype.hasOwnProperty.call(SUBJECTS, value)) return value;
    return Object.prototype.hasOwnProperty.call(KO_TO_KEY, value) ? KO_TO_KEY[value] : null;
  }
  const pad2 = n => String(n).padStart(2, '0');
  function kstDate(now) {
    const d = new Date(Number(now) + KST_MS);
    return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
  }
  function kstWeekday(now) { return new Date(Number(now) + KST_MS).getUTCDay(); }
  function dayIndex(now) { return Math.floor((Number(now) + KST_MS) / DAY_MS); }
  function shiftDate(dateStr, days) {
    const d = new Date(Date.parse(`${dateStr}T00:00:00Z`) + days * DAY_MS);
    return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
  }
  /** 오늘 시간표 요일(주말이면 금요일)과 다음 등교일 요일 (KST) */
  function schoolDays(now) {
    const wd = kstWeekday(now);
    const weekend = wd === 0 || wd === 6;
    return {
      todayName: weekend ? '금요일' : DAY_NAMES[wd],
      nextName: wd >= 1 && wd <= 4 ? DAY_NAMES[wd + 1] : '월요일',
      weekend
    };
  }

  // ---------- 숙련도 (quest-mastery.js parseMastery·isRusty·isLv3Eligible·remoteStateOf와 같은 규칙) ----------
  function parseMastery(text) {
    const parts = String(text || '').split('|');
    const c = parseInt(parts[0], 10);
    return { c: isNaN(c) ? 0 : Math.max(0, Math.min(GOLD, c)), s: (parts[1] || '').trim(), r: (parts[2] || '').trim() };
  }
  function daysBetween(from, to) {
    if (!from) return Infinity;
    const a = Date.parse(`${from}T00:00:00Z`), b = Date.parse(`${to}T00:00:00Z`);
    if (isNaN(a) || isNaN(b)) return Infinity;
    return Math.round((b - a) / DAY_MS);
  }
  function isRusty(st, today) { return st.c >= GOLD && daysBetween(st.r, today) >= RUSTY_DAYS; }
  function isLv3Eligible(st, today) { return st.c >= SILVER && st.c < GOLD && (st.s || '') < today; }
  function masteryOf(record) {
    const st = parseMastery(record && record.mastery);
    if (record && record.isAchieved && st.c < GOLD) st.c = GOLD;
    return st;
  }

  // ---------- 순위 ----------
  function unique(list) { return [...new Set(list)]; }
  function rotate(list, idx) {
    const n = list.length;
    if (!n) return [];
    const k = ((idx % n) + n) % n;
    return list.slice(k).concat(list.slice(0, k));
  }
  /** 최근 7일 방문 일수 적은 순 → 마지막 방문이 오래된 순 → 주어진 기준 순서 (spec §3-2) */
  function rank(keys, history) {
    const visits = history && history.visits ? history.visits : null;
    const score = key => {
      const days = visits && Array.isArray(visits[key]) ? visits[key] : [];
      return { n: days.length, last: days.length ? days[days.length - 1] : '' };
    };
    return keys.map((key, i) => ({ key, i, ...score(key) }))
      .sort((a, b) => (a.n - b.n) || (a.last < b.last ? -1 : a.last > b.last ? 1 : 0) || (a.i - b.i))
      .map(x => x.key);
  }

  // ---------- 어휘 캐시 ----------
  const normId = id => String(id || '').replace(/-/g, '').toLowerCase();
  const firstUnit = stage => String(stage ?? '').split('|').map(s => s.trim()).filter(Boolean)[0] || '';
  function isChildRecord(record, childName) {
    if (!record || !record.word || !record.meaning || !(record.id || record.pageId)) return false;
    const target = Array.isArray(record.target) ? record.target : [];
    return !target.length || target.includes(childName) || target.includes('공통');
  }
  function recordSubject(record, allowed) {
    const subjects = Array.isArray(record.subject) ? record.subject : [];
    for (const name of subjects) {
      const key = subjectKey(name);
      if (key && allowed.includes(key)) return key;
    }
    return null;
  }
  /** (과목, 단원 토막)별 항목 수 — 러너는 3개 미만 단원을 정적 문제로 바꾸므로 3개 이상만 데려간다 */
  function unitCounter(records, allowed) {
    const counts = new Map();
    for (const record of records) {
      const key = recordSubject(record, allowed);
      if (!key) continue;
      const units = unique(String(record.stage ?? '').split('|').map(s => s.trim()).filter(Boolean));
      for (const unit of units) counts.set(`${key}::${unit}`, (counts.get(`${key}::${unit}`) || 0) + 1);
    }
    return (key, unit) => counts.get(`${key}::${unit}`) || 0;
  }

  // ---------- 학습일지 행 → 기록 (spec §4-2, study_usage_report §2-0과 같은 행 나누기) ----------
  const plain = prop => (prop && Array.isArray(prop.title) ? prop.title : prop && Array.isArray(prop.rich_text) ? prop.rich_text : [])
    .map(t => (t && (t.plain_text ?? t.text?.content)) || '').join('');
  function historyFromPages(pages, today, decode) {
    const from = shiftDate(today, -7), to = shiftDate(today, -1);
    const visits = {}, logs = [];
    for (const page of pages || []) {
      const p = (page && page.properties) || {};
      const start = p['입장'] && p['입장'].date && p['입장'].date.start;
      const ms = Date.parse(start || '');
      if (isNaN(ms)) continue;
      const date = kstDate(ms);
      if (date < from || date > to) continue;
      if (p['학생'] && p['학생'].select && p['학생'].select.name === '부모관리자') continue;
      const id = plain(p['ID']);
      const subjectText = plain(p['과목']);
      if (id.startsWith('학습활동_') || plain(p['활동측정'])) {
        const key = subjectKey(subjectText);
        if (key) visits[key] = unique([...(visits[key] || []), date]).sort();
        continue;
      }
      const text = plain(p['문항기록']);
      if (!text || typeof decode !== 'function') continue;
      const decoded = decode(text);
      if (decoded && decoded.i && typeof decoded.i === 'object') logs.push({ date, subject: subjectText, items: decoded.i });
    }
    return { visits, logs };
  }

  // ---------- 링크 ----------
  function link(path, params) {
    const query = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''));
    return `${path}${path.includes('?') ? '&' : '?'}${query}`;
  }
  function lessonLink(ctx, subject, n, unit, focus) {
    if (subject === 'math' || !VOCA_SUBJECTS.includes(subject)) {
      return subject === 'math' ? link('quest_runner.html', { subject, user: ctx.childKey, tp: n }) : roomLink(ctx, subject, n);
    }
    return link('quest_runner.html', { subject, user: ctx.childKey, unit, lesson: ctx.isMinseo ? 'bite' : '', focus, tp: n });
  }
  function roomLink(ctx, subject, n) {
    const path = ctx.rooms && ctx.rooms[subject];
    return path ? link(path, { user: ctx.childKey, tp: n }) : '';
  }

  // ---------- 3번 다시 보기 (spec §3-4) ----------
  function pickReview(ctx, history, voca, s1, ranked) {
    const allowedVoca = VOCA_SUBJECTS.filter(k => ctx.eligible.includes(k));
    const records = (voca || []).filter(r => isChildRecord(r, ctx.child));
    const countOf = unitCounter(records, allowedVoca);
    // 민수 3단계 레슨은 항목 4개 이하면 기존 5문제 판으로 바뀌어 focus가 안 먹는다 (quest-lesson.js, spec §15-4)
    const minUnit = ctx.isMinseo ? 3 : 5;
    // ① 최근 오답 (v:·c:만)
    if (history && Array.isArray(history.logs) && history.logs.length) {
      const byId = new Map(records.map(r => [normId(r.id || r.pageId), r]));
      const byDate = new Map();
      for (const log of history.logs) {
        for (const [key, value] of Object.entries(log.items || {})) {
          if (!Array.isArray(value) || !(Number(value[1]) >= 1)) continue;
          let cand = null;
          if (key.startsWith('v:')) {
            const record = byId.get(key.slice(2));
            const subject = record && recordSubject(record, allowedVoca);
            const unit = record && firstUnit(record.stage);
            if (subject && unit && countOf(subject, unit) >= minUnit) cand = { key, kind: 'v', subject, unit, word: String(record.word) };
          } else if (key.startsWith('c:') && subjectKey(log.subject) === 'society' && ctx.eligible.includes('society')) {
            cand = { key, kind: 'c', subject: 'society' };
          }
          if (!cand) continue;
          // 같은 날 여러 일지 행(예 '영어'·'영어(L9)')에 같은 문항이 있으면 하나로 합친다
          if (!byDate.has(log.date)) byDate.set(log.date, new Map());
          const day = byDate.get(log.date);
          const prev = day.get(key);
          if (prev) { prev.wrong += Number(value[1]) || 0; prev.tries += Number(value[0]) || 0; continue; }
          cand.wrong = Number(value[1]) || 0;
          cand.tries = Number(value[0]) || 0;
          day.set(key, cand);
        }
      }
      const date = [...byDate.keys()].sort().pop();
      if (date) {
        const cands = [...byDate.get(date).values()].sort((a, b) => (b.wrong - a.wrong) || (b.tries - a.tries) || (a.key < b.key ? -1 : 1));
        const top = cands[0];
        const when = date === shiftDate(ctx.today, -1) ? '어제' : '최근';
        // 같은 과목·같은 단원만 (다른 단원 낱말은 그 레슨에 안 나온다)
        const same = cands.filter(c => c.subject === top.subject && c.kind === top.kind && c.unit === top.unit).slice(0, 3);
        if (top.kind === 'v') {
          const focus = same.map(c => c.key.slice(2)).join('|');
          return { subject: top.subject, source: 'wrong', href: lessonLink(ctx, top.subject, 3, top.unit, focus),
            detail: `${when} 헷갈린 낱말: ${same.map(c => c.word).join(' · ')}`, keys: same.map(c => c.key) };
        }
        return { subject: 'society', source: 'wrong', href: roomLink(ctx, 'society', 3),
          detail: `${when} 헷갈린 자료 ${same.length}개`, keys: same.map(c => c.key) };
      }
    }
    // ② 녹슨 왕관·은메달 (민수만 — 한입 레슨은 왕관을 내지 않음)
    if (!ctx.isMinseo) {
      const groups = new Map();
      for (const record of records) {
        const subject = recordSubject(record, allowedVoca);
        const unit = firstUnit(record.stage);
        if (!subject || !unit || countOf(subject, unit) < 3) continue;
        const st = masteryOf(record);
        const rusty = isRusty(st, ctx.today), silver = !rusty && isLv3Eligible(st, ctx.today);
        if (!rusty && !silver) continue;
        const id = `${subject}::${unit}`;
        const g = groups.get(id) || { subject, unit, id, rusty: 0, silver: 0 };
        if (rusty) g.rusty++; else g.silver++;
        groups.set(id, g);
      }
      const best = [...groups.values()].sort((a, b) => (b.rusty + b.silver - a.rusty - a.silver) || (b.rusty - a.rusty) || (a.id < b.id ? -1 : 1))[0];
      if (best) {
        const parts = [];
        if (best.rusty) parts.push(`녹슨 왕관 ${best.rusty}개 닦기`);
        if (best.silver) parts.push(best.rusty ? `은메달 ${best.silver}개` : `은메달 ${best.silver}개 금메달 도전`);
        return { subject: best.subject, source: 'mastery', href: lessonLink(ctx, best.subject, 3, best.unit), detail: parts.join(' · ') };
      }
    }
    // ③ 최근 단원 가벼운 복습 (단원은 러너가 부모 진도 설정으로)
    const visits = (history && history.visits) || {};
    const lastVisit = k => { const d = visits[k] || []; return d.length ? d[d.length - 1] : ''; };
    // 마지막 방문이 늦은 순, 같은 날이면 순위(ranked) 순서
    const recent = ranked.filter(k => allowedVoca.includes(k) && lastVisit(k))
      .sort((a, b) => (lastVisit(a) < lastVisit(b) ? 1 : lastVisit(a) > lastVisit(b) ? -1 : 0))[0];
    const subject = recent || (allowedVoca.includes(s1) ? s1 : ranked.find(k => allowedVoca.includes(k)));
    if (subject) return { subject, source: 'recent', href: lessonLink(ctx, subject, 3), detail: '지난 단원 한 번 더' };
    return { subject: s1, source: 'fallback', href: lessonLink(ctx, s1, 3), detail: '한 번 더 해 볼까요?' };
  }

  // ---------- 편성 (spec §3) ----------
  function plan(input) {
    const now = Number(input.now);
    const today = kstDate(now);
    const idx = dayIndex(now);
    const days = schoolDays(now);
    const history = input.history || null;
    const eligible = unique((input.eligible || []).map(subjectKey).filter(Boolean));
    const ctx = {
      child: input.child, childKey: input.childKey, isMinseo: input.childKey === 'minseo',
      today, eligible, rooms: input.rooms || {}
    };
    const rotated = rotate(eligible, idx);
    const subjects = rotated.filter(k => k !== 'haru'); // 교과 후보 (1·2번)
    const fromTimetable = names => unique((Array.isArray(names) ? names : []).map(subjectKey).filter(k => k && subjects.includes(k)));
    const vacation = input.vacation === true; // 방학 모드: 시간표를 보지 않고 순위로 (spec §15-3)
    const timetable = vacation ? {} : (input.timetable || {});
    let T = fromTimetable(timetable[days.todayName]);
    const M = fromTimetable(timetable[days.nextName]);
    if (!T.length) {
      const first = vacation ? rank(subjects, history)[0]
        : rank(subjects.filter(k => VOCA_SUBJECTS.includes(k)), history)[0] || rank(subjects, history)[0];
      if (first) T = [first];
    }
    const rankedT = rank(T, history), rankedM = rank(M, history);
    let s1 = null, s2 = null;
    for (const a of rankedT) {
      const b = rankedM.find(x => x !== a);
      if (b) { s1 = a; s2 = b; break; }
    }
    if (!s1) s1 = rankedT[0] || null;
    const tasteNew = !s2;
    if (!s2) s2 = rank(subjects.filter(k => k !== s1), history)[0] || null;
    const s4 = rank(rotated.filter(k => k !== s1 && k !== s2), history)[0] || null;
    const review = pickReview(ctx, history, input.voca, s1, rank(subjects, history));
    const visits = (history && history.visits) || {};
    const stops = [
      { n: 1, kind: 'today', subject: s1, title: vacation ? '방학 공부' : (days.weekend ? '이번 주 배운 것' : '오늘 배운 것'),
        detail: s1 === 'math' ? '5분 퀘스트' : (ctx.isMinseo ? '한입 레슨 3문제' : '5분 레슨'), href: s1 ? lessonLink(ctx, s1, 1) : '' },
      { n: 2, kind: 'tomorrow', subject: s2, title: vacation ? '맛보기' : '내일 맛보기',
        detail: tasteNew ? '골고루 한 과목 맛보기' : '동화·낱말 미리 보기', href: s2 ? roomLink(ctx, s2, 2) : '' },
      { n: 3, kind: 'review', subject: review.subject, title: '다시 보기', detail: review.detail, href: review.href,
        source: review.source, ...(review.keys ? { keys: review.keys } : {}) },
      { n: 4, kind: 'rotate', subject: s4, title: '돌림 칸',
        detail: s4 === 'haru' ? '30초 하루 체크인' : ((visits[s4] || []).length ? '가볍게 한 바퀴' : '오랜만에 들러 볼까요?'),
        href: s4 ? roomLink(ctx, s4, 4) : '' }
    ];
    const route = { v: 1, date: today, child: input.child, provisional: history === null, vacation, stops };
    // 어휘 캐시가 아직 없어(매일 첫 진입) 어제 v: 오답을 못 읽었으면, 3번만 나중에 한 번 다시 고를 재료를 남긴다
    // (민수는 녹슨 왕관·은메달도 캐시가 있어야 보이므로 오답이 없어도 남긴다)
    if (!(input.voca || []).length && history && review.source !== 'wrong' && (hasVocaWrong(history) || !ctx.isMinseo)) {
      route.reviewPending = { visits: history.visits || {}, logs: compactLogs(history.logs) };
    }
    return route;
  }

  function hasVocaWrong(history) {
    return (history.logs || []).some(log => Object.entries(log.items || {}).some(([key, v]) => key.startsWith('v:') && Array.isArray(v) && Number(v[1]) >= 1));
  }
  function compactLogs(logs) {
    return (logs || []).map(log => ({
      date: log.date, subject: log.subject,
      items: Object.fromEntries(Object.entries(log.items || {}).filter(([key, v]) => /^[vc]:/.test(key) && Array.isArray(v) && Number(v[1]) >= 1)
        .map(([key, v]) => [key, [Number(v[0]) || 0, Number(v[1]) || 0]]))
    })).filter(log => Object.keys(log.items).length);
  }
  /**
   * 3번만 다시 고르기 (1·2·4번은 그대로). 어휘 캐시가 채워진 뒤 한 번, 3번을 아직 안 했을 때만 부른다.
   * @returns 새 노선 또는 null(다시 고를 것 없음)
   */
  function refreshReview(route, input) {
    if (!route || !route.reviewPending || !(input.voca || []).length) return null;
    const eligible = unique((input.eligible || []).map(subjectKey).filter(Boolean));
    const ctx = { child: route.child, childKey: input.childKey, isMinseo: input.childKey === 'minseo', today: route.date, eligible, rooms: input.rooms || {} };
    const history = { visits: route.reviewPending.visits || {}, logs: route.reviewPending.logs || [] };
    const s1 = route.stops[0].subject;
    const review = pickReview(ctx, history, input.voca, s1, rank(eligible.filter(k => k !== 'haru'), history));
    const stops = route.stops.slice();
    stops[2] = { n: 3, kind: 'review', subject: review.subject, title: '다시 보기', detail: review.detail, href: review.href,
      source: review.source, ...(review.keys ? { keys: review.keys } : {}) };
    const next = { ...route, stops };
    delete next.reviewPending;
    return next;
  }

  // ---------- 저장 ----------
  function safeGet(storage, key) { try { return storage.getItem(key); } catch (e) { return null; } }
  function safeSet(storage, key, value) { try { storage.setItem(key, value); return true; } catch (e) { return false; } }
  function loadRoute(storage, childName, today) {
    try {
      const route = JSON.parse(safeGet(storage, ROUTE_PREFIX + childName) || 'null');
      return route && route.v === 1 && route.date === today && Array.isArray(route.stops) && route.stops.length === 4 ? route : null;
    } catch (e) { return null; }
  }
  function saveRoute(storage, childName, route) { return safeSet(storage, ROUTE_PREFIX + childName, JSON.stringify(route)); }
  function readLedger(storage, childName, today) {
    try {
      const data = JSON.parse(safeGet(storage, DONE_PREFIX + childName) || 'null');
      if (data && data.date === today && data.s && typeof data.s === 'object' && Array.isArray(data.tp)) return data;
    } catch (e) {}
    return { date: today, s: {}, tp: [] };
  }
  function isParentSession(storage) { return PARENTS.includes(safeGet(storage, 'currentUserName')); }
  function childNameOf(child, storage) {
    if (child === '민수' || child === 'minsu' || child === 'son') return '민수';
    if (child === '민서' || child === 'minseo' || child === 'daughter') return '민서';
    if (child) return null;
    const name = safeGet(storage, 'currentUserName');
    if (name === '민수' || name === '민서') return name;
    const kid = safeGet(storage, 'currentChild') || safeGet(storage, 'currentUser');
    if (!kid) return null; // 프로필이 하나도 없으면 끝 (빈 값으로 다시 부르면 끝없이 돈다)
    return childNameOf(kid, storage);
  }
  function tpOf(search) {
    try {
      const n = Number(new URLSearchParams(search || '').get('tp'));
      return Number.isInteger(n) && n >= 1 && n <= 4 ? n : null;
    } catch (e) { return null; }
  }
  /**
   * 완료 신호 기록. 부모 시뮬레이터면 child를 넘겨도 기록하지 않는다.
   * URL에 tp=1~4가 있으면 그 정거장에만(tp), 없으면 과목에만(s) 귀속 — spec §5-1.
   */
  function markDone(opts = {}, env = {}) {
    const storage = env.storage || root.localStorage;
    if (!storage || isParentSession(storage)) return false;
    const name = childNameOf(opts.child, storage);
    const key = subjectKey(opts.subject);
    if (!name || !key || !KINDS.includes(opts.kind)) return false;
    const today = kstDate(env.now ?? Date.now());
    const ledger = readLedger(storage, name, today);
    const tp = tpOf(env.search ?? (root.location && root.location.search));
    if (tp) {
      if (!ledger.tp.includes(tp)) ledger.tp.push(tp);
    } else {
      const kinds = Array.isArray(ledger.s[key]) ? ledger.s[key] : [];
      if (!kinds.includes(opts.kind)) ledger.s[key] = kinds.concat(opts.kind);
    }
    return safeSet(storage, DONE_PREFIX + name, JSON.stringify(ledger));
  }
  /** 정거장별 완료 [bool ×4] (순수) */
  function doneState(route, ledger, haruDone) {
    const s = (ledger && ledger.s) || {}, tp = (ledger && ledger.tp) || [];
    const has = (subject, kinds) => Array.isArray(s[subject]) && s[subject].some(k => !kinds || kinds.includes(k));
    return ((route && route.stops) || []).map(stop => {
      if (tp.includes(stop.n)) return true;
      if (!stop.subject) return false;
      if (stop.n === 1) return has(stop.subject, ['lesson']);
      if (stop.n === 2) return has(stop.subject, STUDY_KINDS);
      if (stop.n === 4) return (stop.subject === 'haru' && !!haruDone) || has(stop.subject);
      return false;
    });
  }
  /** 조회 실패로 만든 노선을 그날 한 번만, 아무것도 안 했을 때만 다시 편성 (spec §6-1) */
  function shouldReplan(route, done) {
    return !!(route && route.provisional && !route.retried && !(done || []).some(Boolean));
  }
  /** 방학 모드가 노선과 다르면 다시 편성 (1차 노선의 vacation 없음 = 꺼짐) */
  function vacationChanged(route, vacation) {
    return !!route && Boolean(route.vacation) !== Boolean(vacation);
  }
  /** 정거장 번호로 쌓인 완료(tp)만 지운다 — 방학 모드로 정거장이 바뀌면 옛 번호가 새 정거장을 켜지 않게 */
  function clearStopMarks(storage, childName, today) {
    const ledger = readLedger(storage, childName, today);
    if (!ledger.tp.length) return false;
    ledger.tp = [];
    return safeSet(storage, DONE_PREFIX + childName, JSON.stringify(ledger));
  }
  const keyOfChild = name => (name === '민서' ? 'minseo' : 'minsu');
  function haruDoneOn(storage, childName, today) {
    return safeGet(storage, `haru_checkin_done_${today}_${keyOfChild(childName)}`) === 'true';
  }

  // ---------- 4번 체류 (spec §15-1) ----------
  /**
   * 지금 화면이 4번 체류를 셀 화면이면 { name, subject, today }, 아니면 null (순수: 저장소·URL·화면 과목을 받음)
   * - tp=1~3 화면은 세지 않는다(그 정거장의 시간이 4번으로 새지 않게)
   * - tp=4면 노선의 4번 과목, 아니면 화면 과목이 4번 과목과 같을 때
   */
  function dwellTarget(storage, search, pageSubject, now) {
    if (!storage || isParentSession(storage)) return null;
    const tp = tpOf(search);
    if (tp && tp !== 4) return null;
    const name = childNameOf(undefined, storage);
    if (!name) return null;
    const today = kstDate(now);
    const route = loadRoute(storage, name, today);
    const stop = route && route.stops[3];
    if (!stop || !stop.subject) return null;
    if (doneState(route, readLedger(storage, name, today), haruDoneOn(storage, name, today))[3]) return null;
    if (tp !== 4 && subjectKey(pageSubject) !== stop.subject) return null;
    return { name, subject: stop.subject, today };
  }
  /** 1초 더하기. 쌓인 초는 장부 dwell에 두어 같은 과목의 다른 화면으로 옮겨도 이어진다. 30초면 visit 기록 */
  function dwellStep(storage, target, env = {}) {
    const ledger = readLedger(storage, target.name, target.today);
    const dwell = ledger.dwell && typeof ledger.dwell === 'object' ? ledger.dwell : {};
    const secs = (Number(dwell[target.subject]) || 0) + 1;
    ledger.dwell = { ...dwell, [target.subject]: secs };
    safeSet(storage, DONE_PREFIX + target.name, JSON.stringify(ledger));
    if (secs < DWELL_SECONDS) return false;
    return markDone({ child: target.name, subject: target.subject, kind: 'visit' }, { storage, now: env.now, search: env.search });
  }
  /** 화면이 보이고 최근 IDLE_MS(측정기와 같은 90초) 안에 실제 입력이 있을 때만 1초씩 (입력 전엔 안 쌓임) */
  function startDwellWatch(win) {
    if (!win || !win.document || typeof win.setInterval !== 'function' || win.__todayPathDwell) return;
    win.__todayPathDwell = true;
    let lastInput = -Infinity;
    const onInput = event => { if (event.isTrusted === true) lastInput = Date.now(); };
    // 측정기와 같은 입력 종류, 화면을 떠나면 임대 끝 (study-activity.js와 같은 규칙)
    for (const type of ['pointerdown', 'keydown', 'touchstart', 'wheel']) win.document.addEventListener(type, onInput, { capture: true, passive: true });
    win.document.addEventListener('visibilitychange', () => { if (win.document.visibilityState !== 'visible') lastInput = -Infinity; });
    win.setInterval(() => {
      const idle = (win.StudyActivity && win.StudyActivity.IDLE_MS) || 90000;
      if (win.document.visibilityState !== 'visible' || Date.now() - lastInput > idle) return;
      let pageSubject = win.currentSubject;
      if (!subjectKey(pageSubject)) {
        try { pageSubject = win.StudyActivity && win.StudyActivity.pageContext ? (win.StudyActivity.pageContext(win) || {}).subject : null; } catch (e) { pageSubject = null; }
      }
      const search = win.location && win.location.search;
      const now = Date.now(); // 대상 판정과 기록에 같은 시각 (자정 경계)
      const target = dwellTarget(win.localStorage, search, pageSubject, now);
      if (target) dwellStep(win.localStorage, target, { search, now });
    }, 1000);
  }

  const api = {
    SUBJECTS, VOCA_SUBJECTS, ROUTE_PREFIX, DONE_PREFIX,
    subjectKey, kstDate, kstWeekday, dayIndex, shiftDate, schoolDays,
    parseMastery, isRusty, isLv3Eligible, masteryOf, rank, rotate,
    historyFromPages, pickReview, plan, refreshReview,
    loadRoute, saveRoute, readLedger, markDone, doneState, shouldReplan, isParentSession, childNameOf,
    vacationChanged, clearStopMarks, haruDoneOn, dwellTarget, dwellStep, startDwellWatch, DWELL_SECONDS
  };
  root.TodayPath = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else if (root.document) startDwellWatch(root);
})(typeof window !== 'undefined' ? window : globalThis);
