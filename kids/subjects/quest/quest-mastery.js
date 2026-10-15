// ========================================================
// 🧠 5분 퀘스트 3·3·3 마스터리 엔진 (quest-mastery.js)
// - 역할: VOCA_DB 단원 항목의 동적 스테이지 분할, 3·3·3 숙련도 계산,
//         1판(5문제) 슬롯 배치, localStorage ↔ 노션 '숙련도'/'달성' 동기화
// - DOM 조작 없음 (화면은 quest-ui-renderer.js 담당)
// - 숙련도 형식: "count|silverDate|lastReviewed" (예: "6|2026-10-15|2026-10-15")
// ========================================================
(function (root) {
  'use strict';

  const STORE_PREFIX = 'MINMIN_QUEST_MASTERY_V1_';
  const SUBJECT_KO = { english: '영어', korean: '국어', society: '사회', science: '과학' };
  // 사자성어는 4글자 낱말처럼 짝맞추기·음절 조립이 자연스러워 단어 슬롯으로 배정한다
  const SENTENCE_TYPES = ['문장', '숙어', '관용구', '속담'];
  const SILVER = 6;
  const GOLD = 9;
  const RUSTY_DAYS = 2;
  const MAX_LV3_PER_ROUND = 2;
  const MAX_PUSH_PER_ROUND = 10;
  const STALE_GUARD_MS = 10 * 60 * 1000; // Worker 엣지 캐시(5분)보다 넉넉한 최근 전송 보호 구간
  const HINT_POLICY = { 1: 'always', 2: 'on_error', 3: 'minimal' };
  const EN_STOPWORDS = ['a', 'an', 'the', 'is', 'are', 'in', 'on', 'at', 'to', 'of', 'this', 'that', 'there', 'what', 'where', 'my', 'it'];

  // ---------- 날짜 (로컬 기준, toISOString UTC 오염 방지) ----------
  function todayStr(date) {
    const d = date || new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  function daysBetween(from, to) {
    if (!from) return Infinity;
    const a = Date.parse(`${from}T00:00:00Z`);
    const b = Date.parse(`${to}T00:00:00Z`);
    if (isNaN(a) || isNaN(b)) return Infinity;
    return Math.round((b - a) / 86400000);
  }

  // ---------- 숙련도 문자열 ----------
  function parseMastery(text) {
    const parts = String(text || '').split('|');
    const c = parseInt(parts[0], 10);
    return {
      c: isNaN(c) ? 0 : Math.max(0, Math.min(GOLD, c)),
      s: (parts[1] || '').trim(),
      r: (parts[2] || '').trim()
    };
  }
  function formatMastery(st) {
    return `${st.c}|${st.s || ''}|${st.r || ''}`;
  }

  // ---------- 저장소 ----------
  function storage() {
    try { return root.localStorage || null; } catch (e) { return null; }
  }
  function loadStore(child) {
    const ls = storage();
    let data = null;
    try { data = ls ? JSON.parse(ls.getItem(STORE_PREFIX + child) || 'null') : null; } catch (e) {}
    if (!data || typeof data !== 'object') data = {};
    data.items = data.items || {};
    data.dirty = data.dirty || {};
    data.pushedAt = data.pushedAt || {};
    return data;
  }
  function saveStore(child, store) {
    const ls = storage();
    try { if (ls) ls.setItem(STORE_PREFIX + child, JSON.stringify(store)); } catch (e) {
      console.warn('[QuestMastery] 저장 실패:', e);
    }
  }
  function getState(store, id) {
    return store.items[id] || { c: 0, s: '', r: '' };
  }

  // 노션 원격값 병합: 미전송(dirty)·방금 전송한 로컬 진도는 Max-Merge로 보호, 그 외에는 원격이 기준
  // (원격이 기준이어야 다른 기기의 녹슨 왕관 강등·부모 초기화가 반영된다)
  function mergeRemote(local, remote, localDirty, recentlyPushed) {
    if (!local) return { ...remote };
    if (!localDirty && !(recentlyPushed && remote.c < local.c)) return { ...remote };
    if (localDirty === 'demote') return { ...local };
    if (remote.c > local.c) return { ...remote };
    if (remote.c < local.c) return { ...local };
    const pickMin = (x, y) => (!x ? y : (!y ? x : (x < y ? x : y)));
    const pickMax = (x, y) => (x > y ? x : y);
    return { c: local.c, s: pickMin(local.s, remote.s), r: pickMax(local.r || '', remote.r || '') };
  }
  function remoteStateOf(record) {
    const st = parseMastery(record.mastery);
    if (record.isAchieved && st.c < GOLD) st.c = GOLD; // 부모가 '달성'을 체크했거나 기존 3회 마스터 기록
    return st;
  }

  // isFresh=true: 노션에서 방금 읽은 값 → 병합. false: 당일 캐시 → 로컬에 기록이 없을 때만 씨앗으로 사용
  function syncFromRecords(child, items, isFresh) {
    const store = loadStore(child);
    items.forEach(item => {
      const remote = remoteStateOf(item);
      const has = Object.prototype.hasOwnProperty.call(store.items, item.id);
      if (isFresh) {
        const recent = Date.now() - (store.pushedAt[item.id] || 0) < STALE_GUARD_MS;
        store.items[item.id] = mergeRemote(has ? store.items[item.id] : null, remote, store.dirty[item.id], recent);
        if (store.dirty[item.id] && formatMastery(store.items[item.id]) === formatMastery(remote)) delete store.dirty[item.id];
      } else if (!has) {
        store.items[item.id] = remote;
      }
    });
    saveStore(child, store);
    return store;
  }

  // ---------- 항목 분류 & 단원 선택 ----------
  function classify(item) {
    const word = String(item.word || '');
    if (/\.\.\.|…/.test(word)) return 'pattern';
    if (SENTENCE_TYPES.includes(String(item.wordType || '').trim())) return 'sentence';
    if (!item.wordType && word.trim().split(/\s+/).length >= 3) return 'sentence';
    return 'word';
  }
  function isSentenceLike(item) { return item.kind !== 'word'; }

  // "1학년 2학기 받아쓰기 3회 10번" 같은 출처·회차 표기 (뜻풀이·힌트로 쓰면 안 되는 메타 정보)
  function isSourceTag(text) {
    const t = String(text || '').trim();
    return /^\d학년\s*\d학기/.test(t) || /^받아쓰기\s*\d+\s*회/.test(t);
  }

  function toItem(rec) {
    const rawWord = String(rec.word || '').trim();
    const rawDetail = String(rec.detailContext || '').trim();
    const subjects = Array.isArray(rec.subject) ? rec.subject : [];
    return {
      id: rec.id || rec.pageId,
      word: rawWord.replace(/[\[\]]/g, ''),
      marked: (rawWord.match(/\[([^\]]+)\]/) || [])[1] || '', // 단어 속 [어절] = 빈칸 1순위 타겟
      meaning: String(rec.meaning || '').trim(),
      detail: isSourceTag(rawDetail) ? '' : rawDetail,
      isDictation: subjects.some(sj => String(sj).includes('받아쓰기')),
      wordType: rec.wordType || rec.type || '',
      stage: String(rec.stage || ''),
      grades: Array.isArray(rec.grades) ? rec.grades : (rec.grade ? [rec.grade] : []),
      examScope: !!rec.examScope,
      mastery: rec.mastery || '',
      isAchieved: !!rec.isAchieved,
      createdTime: rec.createdTime || '',
      audioUrl: rec.audioUrl || null,
      imageUrl: rec.imageUrl || null,
      kind: classify(rec)
    };
  }

  // 단원 설정값 → 단원 이름 목록. 배열, '|' 결합 문자열(URL 전달용), 단일 문자열 모두 허용.
  // 쉼표는 실제 단원명에 들어 있으므로(예: "…황제, 나폴레옹 1") 구분자로 쓰지 않는다.
  function parseUnitList(unit) {
    const list = Array.isArray(unit) ? unit : String(unit ?? '').split('|');
    return [...new Set(list.map(u => String(u ?? '').trim()).filter(Boolean))];
  }

  function selectUnitItems(records, opts) {
    const childName = opts.childName;
    const subjKo = opts.subjectKo;
    const base = (records || []).filter(r => {
      if (!r || !r.word || !r.meaning || !(r.id || r.pageId)) return false;
      const target = Array.isArray(r.target) ? r.target : [];
      if (target.length && !target.includes(childName) && !target.includes('공통')) return false;
      const subj = Array.isArray(r.subject) ? r.subject : [];
      // 뜻풀이가 비었거나 출처 표기("1학년 2학기 받아쓰기 …")뿐인 항목만 뺀다 (정상 뜻풀이가 있는 받아쓰기는 3·3·3 출제)
      if (isSourceTag(r.meaning)) return false;
      return !subjKo || subj.includes(subjKo);
    });
    const keys = parseUnitList(opts.unit).map(u => u.toLowerCase());
    if (keys.length === 0) return [];
    // 다중 단원 묶음: 고른 단원명과 정확히 일치하는 항목만 합친다 (번호 느슨 매칭·학기 필터 없음 — 부모가 명시적으로 고른 단원)
    if (keys.length > 1) {
      const wanted = new Set(keys);
      const seenIds = new Set();
      return base.filter(r => wanted.has(String(r.stage || '').trim().toLowerCase()))
        .map(toItem).filter(it => !seenIds.has(it.id) && seenIds.add(it.id));
    }
    const key = keys[0];
    let matched = base.filter(r => String(r.stage || '').trim().toLowerCase() === key);
    if (matched.length < 3) {
      const num = (key.match(/\d+/) || [])[0];
      if (num) matched = base.filter(r => (String(r.stage || '').match(/\d+/) || [])[0] === num);
    }
    // 현재 학기 우선: '3' → "3. 온도와 열"(5-2)과 "3-1. 용해…"(5-1)가 섞이지 않도록 학년으로 거른다.
    // 학기 일치 항목이 하나도 없으면(학년 미기재 단원 등) 단원 전체를 유지한다.
    const semester = String(opts.semester || '').trim();
    if (semester) {
      const inSemester = matched.filter(r => {
        const grades = Array.isArray(r.grades) ? r.grades : (r.grade ? [r.grade] : []);
        return grades.map(g => String(g).trim()).includes(semester);
      });
      if (inSemester.length >= 3) matched = inSemester;
    }
    const seen = new Set();
    return matched.map(toItem).filter(it => !seen.has(it.id) && seen.add(it.id));
  }

  // 같은 표제어(띄어쓰기·대소문자 무시)가 여러 단원에 있으면 숙련도(count)가 높은 항목 1개만 남긴다.
  // 동률이면 시험범위 → 먼저 등록된 항목 순. 버려진 항목의 진도는 그 페이지 id에 그대로 남는다.
  function dedupeHeadwords(items, store) {
    const keyOf = it => String(it.word || '').replace(/\s+/g, '').toLowerCase();
    const best = new Map();
    sortItems(items).forEach(it => {
      const k = keyOf(it);
      const cur = best.get(k);
      if (!cur || getState(store, it.id).c > getState(store, cur.id).c) best.set(k, it);
    });
    const keep = new Set([...best.values()].map(it => it.id));
    return items.filter(it => keep.has(it.id));
  }

  // ---------- 동적 스테이지 분할 ----------
  function sortItems(items) {
    return [...items].sort((a, b) =>
      (b.examScope - a.examScope) ||
      String(a.createdTime).localeCompare(String(b.createdTime)) ||
      String(a.id).localeCompare(String(b.id)));
  }
  function chunkInto(list, n) {
    const out = Array.from({ length: n }, () => []);
    list.forEach((it, i) => out[Math.min(n - 1, Math.floor(i * n / list.length))].push(it));
    return out;
  }
  function buildStages(items) {
    const totalStages = Math.max(1, Math.round(items.length / 10));
    const sorted = sortItems(items);
    const words = chunkInto(sorted.filter(it => it.kind === 'word'), totalStages);
    const sents = chunkInto(sorted.filter(isSentenceLike), totalStages);
    return words.map((w, i) => w.concat(sents[i]));
  }

  // ---------- 레벨 판정 ----------
  function levelOf(st) {
    if (st.c >= SILVER) return 3;
    if (st.c >= 3) return 2;
    return 1;
  }
  function isPromotable(st) { return st.c < SILVER; }
  function isLv3Eligible(st, today) { return st.c >= SILVER && st.c < GOLD && (st.s || '') < today; }
  function isRusty(st, today) { return st.c >= GOLD && daysBetween(st.r, today) >= RUSTY_DAYS; }

  // ---------- 문제 생성 ----------
  function shuffle(list, rng) {
    const a = [...list];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function pickDistractors(item, all, field, count, rng) {
    const correct = item[field];
    const sameKind = all.filter(o => o.id !== item.id && o[field] && o[field] !== correct && (o.kind === 'word') === (item.kind === 'word'));
    const others = all.filter(o => o.id !== item.id && o[field] && o[field] !== correct && !sameKind.includes(o));
    const out = [];
    for (const o of shuffle(sameKind, rng).concat(shuffle(others, rng))) {
      if (out.length >= count) break;
      if (!out.includes(o[field])) out.push(o[field]);
    }
    return out;
  }
  function makeChoice(correct, distractors, rng) {
    const options = shuffle([correct, ...distractors], rng);
    return { options, answer: options.indexOf(correct) };
  }
  function isEnglishText(text) { return /^[\x00-\x7F’'…]+$/.test(String(text || '')); }
  function exampleSentence(item) {
    const m = item.detail.match(/\(예:\s*([^)]+)\)/);
    if (!m) return '';
    return m[1].split('/')[0].trim();
  }
  function maskTerm(text, term) {
    if (!text || !term) return text || '';
    return text.split(term).join('○'.repeat(Math.min(term.length, 4)));
  }
  function splitUnits(text, lang) {
    return lang === 'en' ? text.split('') : Array.from(text);
  }

  // 문장 → 최대 5조각 의미 단위 청크 (민서 초1은 maxChunks 3)
  function chunkSentence(sentence, maxChunks = 5) {
    const tokens = sentence.trim().split(/\s+/).filter(Boolean);
    if (tokens.length <= Math.min(4, maxChunks)) return tokens;
    const k = maxChunks >= 5 ? (tokens.length <= 7 ? 4 : 5) : maxChunks;
    const out = Array.from({ length: k }, () => []);
    tokens.forEach((t, i) => out[Math.floor(i * k / tokens.length)].push(t));
    return out.map(c => c.join(' '));
  }

  function buildScramble(item, lang, rng, maxChunks = 5) {
    let seq;
    let joiner = '';
    if (isSentenceLike(item) || item.word.split(/\s+/).length >= 3) {
      seq = chunkSentence(item.word, maxChunks);
      joiner = ' ';
    } else {
      seq = splitUnits(item.word, lang).filter(ch => ch !== ' ');
    }
    const blocks = shuffle(seq.map((text, i) => ({ id: `b${i}`, text })), rng);
    return { seq, blocks, joiner, template: item.word };
  }

  // ---------- 한글 받침·모음 분석 (빈칸 타겟 우선순위·받아쓰기 철자 오답 보기) ----------
  const HANGUL_BASE = 0xAC00;
  // 겹받침 종성 인덱스 → 구성 홑받침 (ㄳ ㄵ ㄶ ㄺ ㄻ ㄼ ㄽ ㄾ ㄿ ㅀ ㅄ)
  // ㄶ·ㅀ은 ㅎ만 남긴 형태(앟게)는 실제 실수가 아니라서 앞 받침(안게·알다)만 쓴다
  const DOUBLE_JONG = { 3: [1, 19], 5: [4, 22], 6: [4], 9: [8, 1], 10: [8, 16], 11: [8, 17], 12: [8, 19], 13: [8, 25], 14: [8, 26], 15: [8], 18: [17, 19] };
  const COMPLEX_JUNG = [3, 7, 9, 10, 11, 14, 15, 16, 19]; // ㅒ ㅖ ㅘ ㅙ ㅚ ㅝ ㅞ ㅟ ㅢ
  // 아이들이 실제로 헷갈리는 홑받침 짝 (앞쪽이 더 흔한 실수): ㅆ→ㅅ·ㄷ, ㅅ→ㅆ·ㄷ, ㅈ→ㅅ·ㅊ, ㄲ→ㄱ, ㅍ→ㅂ …
  const SOUND_ALIKE_JONG = { 7: [19, 20], 19: [20, 7], 20: [19, 7], 22: [19, 23], 23: [19, 22], 25: [19, 23], 27: [19], 2: [1], 24: [1], 26: [17] };
  const SOUND_ALIKE_JUNG = [[1, 5], [3, 7], [10, 11, 15]]; // ㅐ/ㅔ, ㅒ/ㅖ, ㅙ/ㅚ/ㅞ
  const KO_STOPWORDS = ['그', '이', '저', '그것', '이것', '저것', '나', '너', '우리', '꼭', '잘', '더', '또', '안', '못', '참', '아주', '매우', '정말', '너무', '다', '좀', '그리고'];

  function syllablesOf(text) {
    return Array.from(String(text)).map(ch => {
      const c = ch.charCodeAt(0) - HANGUL_BASE;
      return c >= 0 && c < 11172 ? { ch, cho: Math.floor(c / 588), jung: Math.floor((c % 588) / 28), jong: c % 28 } : { ch };
    });
  }
  const composeSyllable = (s, jung, jong) => String.fromCharCode(HANGUL_BASE + s.cho * 588 + jung * 28 + jong);

  // 1 겹받침 → 2 복합모음 → 3 받침 → 4 일반(2글자 이상) / 9 제외(받침 없는 1글자)
  function koreanTier(token) {
    const syl = syllablesOf(token).filter(x => x.cho !== undefined);
    if (syl.some(x => DOUBLE_JONG[x.jong])) return 1;
    if (syl.length < 2) return 9;
    if (syl.some(x => COMPLEX_JUNG.includes(x.jung))) return 2;
    if (syl.some(x => x.jong)) return 3;
    return 4;
  }

  // 받아쓰기 철자 오답: 겹받침을 홑받침으로(닭→달·닥), 소리가 같은 받침·모음 바꾸기(옷→옫, 개→게)
  function misspellingsOf(token) {
    const primary = [], secondary = [];
    const syl = syllablesOf(token);
    syl.forEach((x, idx) => {
      if (x.cho === undefined) return;
      const make = (jung, jong) => syl.map((y, k) => (k === idx ? composeSyllable(y, jung, jong) : y.ch)).join('');
      if (DOUBLE_JONG[x.jong]) DOUBLE_JONG[x.jong].forEach(j => primary.push(make(x.jung, j)));
      else if (x.jong) (SOUND_ALIKE_JONG[x.jong] || []).forEach(j => secondary.push(make(x.jung, j)));
      (SOUND_ALIKE_JUNG.find(g => g.includes(x.jung)) || []).filter(v => v !== x.jung).forEach(v => secondary.push(make(v, x.jong)));
    });
    return [...new Set(primary.concat(secondary))].filter(w => w !== token);
  }

  // 문장 빈칸 어절 고르기 (3단계 우선순위)
  // 1순위: 단어의 [어절] 또는 상세설명의 [어절]·'핵심: 어절' / 2순위(한글): 겹받침 → 복합모음 → 받침 어절 / 3순위: 2글자 이상 핵심 어절
  function pickBlankToken(item, lang, rng) {
    const clean = t => t.replace(/[^A-Za-z가-힣0-9']/g, '');
    const info = item.word.split(/\s+/).map((t, i) => ({ t, i, clean: clean(t) })).filter(x => x.clean);
    const detail = item.detail || '';
    const key = clean(item.marked || (detail.match(/\[([^\]]+)\]/) || detail.match(/핵심\s*[:：]\s*([^\s,/]+)/) || [])[1] || '');
    if (key) {
      const hit = info.find(x => x.clean === key) || info.find(x => x.clean.includes(key) || key.includes(x.clean));
      if (hit) return hit;
    }
    if (lang !== 'en') {
      const ranked = info.filter(x => !KO_STOPWORDS.includes(x.clean)).map(x => ({ ...x, tier: koreanTier(x.clean) })).filter(x => x.tier < 9);
      if (ranked.length) {
        const best = Math.min(...ranked.map(x => x.tier));
        const top = ranked.filter(x => x.tier === best);
        return best === 4 ? top.sort((a, b) => b.clean.length - a.clean.length)[0] : top[Math.floor(rng() * top.length)];
      }
    }
    return info.filter(x => !EN_STOPWORDS.includes(x.clean.toLowerCase())).sort((a, b) => b.clean.length - a.clean.length)[0] || null;
  }

  // 빈칸 보기 2개: 받아쓰기는 철자 오답 우선, 모자라면 다른 문장의 어절로 채운다
  function blankDistractors(item, correct, all, lang, rng) {
    // 철자 오답은 순서(겹받침 → 받침 → 모음)대로 앞의 2개를 쓴다 (보기 위치는 makeChoice가 섞음)
    const out = item.isDictation && lang !== 'en' ? misspellingsOf(correct).slice(0, 2) : [];
    const pool = all.filter(o => o.id !== item.id).flatMap(o => o.word.split(/\s+/))
      .map(t => t.replace(/[^A-Za-z가-힣0-9']/g, ''))
      .filter(t => t && t.toLowerCase() !== correct.toLowerCase() && !EN_STOPWORDS.includes(t.toLowerCase()));
    for (const t of shuffle([...new Set(pool)], rng)) {
      if (out.length >= 2) break;
      if (!out.includes(t)) out.push(t);
    }
    return out;
  }

  function buildFillBlank(item, all, lang, rng) {
    // ① 문장: 우선순위로 고른 어절 1개 빈칸 + 3지선다
    if (isSentenceLike(item)) {
      const tokens = item.word.split(/\s+/);
      const core = pickBlankToken(item, lang, rng);
      if (!core) return null;
      const distractors = blankDistractors(item, core.clean, all, lang, rng);
      if (distractors.length < 2) return null;
      const display = tokens.map((t, i) => (i === core.i ? t.replace(core.clean, '[ _ ]') : t)).join(' ');
      return { mode: 'choice', display, ...makeChoice(core.clean, distractors, rng) };
    }
    // ①-2 한글 낱말 + 상세설명 빈칸 예문("꾀 많은 ( )가 …") → 예문 빈칸 3지선다
    if (lang !== 'en' && /\(\s*\)/.test(item.detail || '')) {
      const distractors = item.isDictation
        ? blankDistractors(item, item.word, all, lang, rng)
        : pickDistractors(item, all.filter(o => o.kind === 'word'), 'word', 2, rng);
      if (distractors.length === 2) {
        return { mode: 'choice', display: item.detail.replace(/\(\s*\)/, '[ _ ]'), ...makeChoice(item.word, distractors, rng) };
      }
    }
    // ② 영단어 + 예문 변형: 예문 속 단어 빈칸 + 3지선다
    const example = lang === 'en' ? exampleSentence(item) : '';
    const re = new RegExp(`\\b${item.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (example && re.test(example) && rng() < 0.5) {
      const distractors = pickDistractors(item, all.filter(o => o.kind === 'word'), 'word', 2, rng);
      if (distractors.length === 2) {
        return { mode: 'choice', display: example.replace(re, '[ _ ]'), ...makeChoice(item.word, distractors, rng) };
      }
    }
    // ③ 철자: 첫/끝 글자를 남기고 가운데 1~2글자 비우기 + 글자 블록
    const units = splitUnits(item.word, lang);
    const inner = units.map((u, i) => i).filter(i => i > 0 && i < units.length - 1 && units[i] !== ' ');
    if (inner.length === 0) return null;
    const blankCount = inner.length >= 4 ? 2 : 1;
    const start = Math.floor(rng() * (inner.length - blankCount + 1));
    const blanks = inner.slice(start, start + blankCount).sort((a, b) => a - b);
    const seq = blanks.map(i => units[i]);
    const extraPool = lang === 'en'
      ? 'abcdefghijklmnopqrstuvwxyz'.split('')
      : all.flatMap(o => Array.from(o.word)).filter(ch => ch.trim());
    const extras = shuffle(extraPool.filter(ch => !seq.includes(ch)), rng).slice(0, 2);
    const blocks = shuffle(seq.concat(extras).map((text, i) => ({ id: `b${i}`, text })), rng);
    return { mode: 'letters', units, blanks, seq, blocks };
  }

  function buildQuestion(item, level, all, ctx, flags) {
    const rng = ctx.rng;
    const lang = ctx.lang;
    const q = {
      id: `mastery_${item.id}_${level}`,
      itemIds: [item.id],
      item,
      level,
      hintPolicy: HINT_POLICY[level],
      isRustyReview: !!flags.isRustyReview,
      noCredit: !!flags.noCredit,
      subject: ctx.subj,
      lang,
      hint: item.detail || item.meaning,
      audioText: item.word
    };
    const choiceMeaning = () => {
      const d = pickDistractors(item, all, 'meaning', 2, rng);
      return d.length === 2 ? { masteryType: 'choice_audio', ...makeChoice(item.meaning, d, rng) } : null;
    };
    const choiceTerm = () => {
      const d = pickDistractors(item, all, 'word', 2, rng);
      return d.length === 2 ? { masteryType: 'choice_audio', reverse: true, ...makeChoice(item.word, d, rng) } : null;
    };
    let body = null;
    if (level === 1) {
      body = choiceMeaning();
      if (body) { body.showText = true; body.q = `[${item.word}] 의 뜻은?`; }
    } else if (level === 2) {
      if (item.kind !== 'pattern' && rng() < 0.5) {
        const fill = buildFillBlank(item, all, lang, rng);
        if (fill) body = { masteryType: 'fill_blank', fill, q: `빈칸을 채워 보세요: ${fill.display || item.meaning}` };
      }
      if (!body) {
        if (lang === 'en' && item.kind !== 'pattern') {
          body = choiceMeaning();
          if (body) { body.audioOnly = true; body.q = '🔊 소리를 듣고 알맞은 뜻을 골라요'; }
        } else {
          body = choiceTerm();
          if (body) { body.prompt = maskTerm(item.meaning, item.word); body.q = `뜻에 알맞은 말: ${body.prompt}`; }
        }
      }
    } else {
      if (item.kind !== 'pattern') {
        body = { masteryType: 'scramble', scramble: buildScramble(item, lang, rng, ctx.maxChunks), q: `조립하기: ${item.meaning}` };
      } else {
        body = choiceTerm();
        if (body) { body.prompt = item.meaning; body.q = `뜻에 알맞은 표현: ${item.meaning}`; }
      }
    }
    if (!body) body = { masteryType: 'scramble', scramble: buildScramble(item, lang, rng, ctx.maxChunks), q: `조립하기: ${item.meaning}` };
    Object.assign(q, body);
    // 뜻 고르기 문제에서 상세설명이 없으면 힌트(=뜻풀이)가 곧 정답이 되므로 숨긴다
    if (q.masteryType === 'choice_audio' && !q.reverse && !item.detail) q.hint = '';
    return q;
  }

  function buildMatch(items, ctx) {
    const rng = ctx.rng;
    return {
      id: `mastery_match_${items.map(i => i.id).join('_')}`,
      itemIds: items.map(i => i.id),
      items,
      item: items[0],
      level: 1,
      hintPolicy: 'always',
      noCredit: false,
      isRustyReview: false,
      subject: ctx.subj,
      lang: ctx.lang,
      masteryType: 'match_3x3',
      left: shuffle(items.map(i => ({ id: i.id, text: i.word })), rng),
      right: shuffle(items.map(i => ({ id: i.id, text: i.meaning })), rng),
      q: `짝 맞추기: ${items.map(i => i.word).join(', ')}`,
      hint: items.map(i => `${i.word} = ${i.meaning}`).join(' / '),
      options: [],
      answer: -1
    };
  }

  // ---------- 1판(5문제) 슬롯 배치 ----------
  function buildRound(opts) {
    const rng = opts.rng || Math.random;
    const today = opts.today || todayStr();
    const store = opts.store || loadStore(opts.child);
    const items = opts.items;
    const ctx = { rng, subj: opts.subj, lang: opts.subj === 'english' ? 'en' : 'ko', maxChunks: opts.child === 'minseo' ? 3 : 5 };
    const st = it => getState(store, it.id);
    const stages = buildStages(items);
    let active = stages.findIndex(stage => stage.some(it => isPromotable(st(it))));
    if (active < 0) active = stages.length;
    const A = stages[active] || [];
    const used = new Set();
    const free = list => list.filter(it => !used.has(it.id));
    const byCountAsc = list => shuffle(list, rng).sort((a, b) => st(a).c - st(b).c);
    const byCountDesc = list => shuffle(list, rng).sort((a, b) => st(b).c - st(a).c);
    const take = it => { used.add(it.id); return it; };

    const promotableAll = items.filter(it => isPromotable(st(it)));
    const lv3All = items.filter(it => isLv3Eligible(st(it), today));
    const aWords = () => byCountAsc(free(A.filter(it => it.kind === 'word' && isPromotable(st(it)))));
    const aSents = () => byCountAsc(free(A.filter(it => isSentenceLike(it) && isPromotable(st(it)))));
    const reviewPick = () => {
      const pool = free(items);
      const list = (pool.length ? pool : items);
      return shuffle(list, rng).sort((a, b) => String(st(a).r).localeCompare(String(st(b).r)))[0];
    };
    // 크레딧 문제 생성: 승급 가능 → 자기 레벨, Lv.3 해금 → 3, 그 외 → Lv.2 복습(카운트 변화 없음)
    const credit = (it, flags = {}) => {
      const s = st(it);
      if (isPromotable(s)) return buildQuestion(it, levelOf(s), items, ctx, flags);
      if (isLv3Eligible(s, today)) return buildQuestion(it, 3, items, ctx, flags);
      return buildQuestion(it, 2, items, ctx, { ...flags, noCredit: true });
    };
    const fallbackSlot = () => {
      const p = byCountAsc(free(promotableAll))[0] || byCountDesc(free(lv3All))[0];
      return credit(take(p || reviewPick()));
    };

    // 녹슨 왕관은 4번 슬롯 전용으로 먼저 예약 (앞 슬롯 복습 폴백이 가져가지 않도록)
    const rusty = items.filter(it => isRusty(st(it), today))
      .sort((a, b) => String(st(a).r).localeCompare(String(st(b).r)))[0];
    if (rusty) take(rusty);

    const slots = [];
    // 1번: 현재 Stage 단어
    const w1 = aWords()[0];
    slots.push(w1 ? credit(take(w1)) : fallbackSlot());
    // 2번: 현재 Stage 단어 (Lv.1이면 3:3 짝맞추기)
    const w2 = aWords()[0];
    if (w2 && levelOf(st(w2)) === 1) {
      const partners = [];
      for (const it of aWords()) {
        if (partners.length === 2) break;
        const meanings = [w2, ...partners].map(i => i.meaning);
        const words = [w2, ...partners].map(i => i.word);
        if (it.id !== w2.id && !meanings.includes(it.meaning) && !words.includes(it.word)) partners.push(it);
      }
      if (partners.length === 2) {
        [w2, ...partners].forEach(take);
        slots.push(buildMatch([w2, ...partners], ctx));
      } else {
        slots.push(credit(take(w2)));
      }
    } else {
      slots.push(w2 ? credit(take(w2)) : fallbackSlot());
    }
    // 3번: 현재 Stage 문장/숙어 (없으면 단어)
    const s3 = aSents()[0] || aWords()[0];
    slots.push(s3 ? credit(take(s3)) : fallbackSlot());
    // 4번: 녹슨 왕관 복습석 → 이전 Stage 은메달 → 현재 Stage
    if (rusty) {
      slots.push(buildQuestion(rusty, 3, items, ctx, { isRustyReview: true }));
    } else {
      const prevSilver = shuffle(free(stages.slice(0, active).flat().filter(it => st(it).c >= SILVER && st(it).c < GOLD)), rng)
        .sort((a, b) => isLv3Eligible(st(b), today) - isLv3Eligible(st(a), today))[0];
      const cur = byCountAsc(free(A.filter(it => isPromotable(st(it)))))[0];
      const pick = prevSilver || cur;
      slots.push(pick ? credit(take(pick)) : fallbackSlot());
    }
    // 5번: 출제 가능한 가장 높은 레벨의 승급 도전
    const s5 = byCountDesc(free(lv3All))[0] || byCountDesc(free(A.filter(it => isPromotable(st(it)))))[0];
    slots.push(s5 ? credit(take(s5)) : fallbackSlot());

    // 피로도 쿼터: Lv.3 최대 2개 (녹슨 왕관·5번 우선 보존, 앞 슬롯부터 Lv.2 복습으로 하향)
    let lv3Count = slots.filter(q => q.level === 3).length;
    for (let i = 0; i < slots.length && lv3Count > MAX_LV3_PER_ROUND; i++) {
      if (slots[i].level === 3 && !slots[i].isRustyReview && i !== 4) {
        slots[i] = buildQuestion(slots[i].item, 2, items, ctx, { noCredit: true });
        lv3Count--;
      }
    }
    for (let i = slots.length - 1; i >= 0 && lv3Count > MAX_LV3_PER_ROUND; i--) {
      if (slots[i].level === 3 && !slots[i].isRustyReview) {
        slots[i] = buildQuestion(slots[i].item, 2, items, ctx, { noCredit: true });
        lv3Count--;
      }
    }

    const isTodayAllSilver = slots.every(q => q.noCredit);
    return {
      questions: slots,
      meta: { stageIndex: Math.min(active, stages.length - 1), activeStage: active, totalStages: stages.length, isTodayAllSilver }
    };
  }

  // ---------- 채점 반영 ----------
  // results: [{ id, firstTry }] (짝맞추기는 항목별 3개)
  function applyResult(child, question, results, today) {
    today = today || todayStr();
    const store = loadStore(child);
    const changed = [];
    results.forEach(({ id, firstTry }) => {
      if (question.noCredit) return;
      const before = getState(store, id);
      const s = { ...before };
      if (question.isRustyReview) {
        if (firstTry) s.r = today;
        else { s.c = SILVER - 1; s.r = today; store.dirty[id] = 'demote'; }
      } else if (firstTry) {
        if (s.c < SILVER) {
          s.c += 1;
          if (s.c === SILVER) s.s = today;
        } else if (s.c < GOLD && (s.s || '') < today) {
          s.c += 1;
        }
        s.r = today;
      }
      if (formatMastery(s) !== formatMastery(before)) {
        store.items[id] = s;
        if (store.dirty[id] !== 'demote') store.dirty[id] = true;
        changed.push({ id, before, after: s });
      }
    });
    saveStore(child, store);
    return changed;
  }

  // ---------- 노션 Push (5문제 완주 시 비동기) ----------
  async function pushChanges(child, patchFn) {
    patchFn = patchFn || root.updateVocaMasteryProgress;
    if (typeof patchFn !== 'function') return { sent: 0, failed: 0 };
    const store = loadStore(child);
    const ids = Object.keys(store.dirty).slice(0, MAX_PUSH_PER_ROUND);
    let sent = 0;
    let failed = 0;
    for (const id of ids) {
      const s = getState(store, id);
      const text = formatMastery(s);
      const achieved = s.c >= GOLD ? true : (store.dirty[id] === 'demote' ? false : null);
      const ok = await patchFn(id, text, achieved);
      const latest = loadStore(child);
      if (ok && formatMastery(getState(latest, id)) === text) {
        delete latest.dirty[id];
        latest.pushedAt[id] = Date.now();
        saveStore(child, latest);
        sent++;
      } else if (!ok) {
        failed++;
      }
    }
    return { sent, failed };
  }

  // ---------- 상단 광물 진척도 ----------
  function getProgressSummary(child, items, store) {
    store = store || loadStore(child);
    const sum = { stone: 0, copper: 0, silver: 0, diamond: 0, total: items.length };
    items.forEach(it => {
      const c = getState(store, it.id).c;
      if (c >= GOLD) sum.diamond++;
      else if (c >= SILVER) sum.silver++;
      else if (c > 0) sum.copper++;
      else sum.stone++;
    });
    return sum;
  }

  // ---------- 단원 로드 (당일 캐시 즉시 + 노션 최신 Pull 병합) ----------
  async function loadUnit(opts) {
    const child = opts.child === 'minseo' ? 'minseo' : 'minsu';
    const childName = child === 'minseo' ? '민서' : '민수';
    const subjectKo = SUBJECT_KO[opts.subj];
    const units = parseUnitList(opts.unit);
    if (!subjectKo || units.length === 0) return null;
    const multi = units.length > 1;
    const settings = typeof root.getParentQuestSettings === 'function' ? (root.getParentQuestSettings(child) || {}) : {};
    const sel = { childName, subjectKo, unit: opts.unit, semester: opts.semester || settings.semester || '' };
    const cached = typeof root.getNotionCachedVocaList === 'function' ? root.getNotionCachedVocaList(child) : [];
    let items = selectUnitItems(cached, sel);
    let fresh = null;
    if (typeof root.fetchVocaUnitFresh === 'function') {
      fresh = await root.fetchVocaUnitFresh(multi
        ? { studentName: childName, subject: subjectKo, units, timeoutMs: 3000 }
        : { studentName: childName, subject: subjectKo, unit: units[0], timeoutMs: 3000 });
      // '3' → "3-1. …"처럼 번호 느슨 매칭이 필요한 단일 단원만 과목 전체를 다시 조회 (phonics 등 정적 단원은 생략)
      if (!multi && fresh && selectUnitItems(fresh, sel).length < 3 && /\d/.test(units[0])) {
        fresh = await root.fetchVocaUnitFresh({ studentName: childName, subject: subjectKo, timeoutMs: 4000 });
      }
    }
    const freshItems = fresh ? selectUnitItems(fresh, sel) : [];
    if (freshItems.length >= 3) items = freshItems;
    if (items.length < 3) return null;
    const store = syncFromRecords(child, items, freshItems.length >= 3);
    items = dedupeHeadwords(items, store);
    if (items.length < 3) return null;
    return { child, items, units, unitKey: [...units].sort().join('+'), synced: freshItems.length >= 3 };
  }

  const api = {
    SUBJECT_KO, SILVER, GOLD,
    todayStr, daysBetween, parseMastery, formatMastery,
    loadStore, saveStore, mergeRemote, syncFromRecords,
    classify, isSourceTag, koreanTier, misspellingsOf, pickBlankToken, parseUnitList, selectUnitItems, dedupeHeadwords, buildStages, chunkSentence, buildScramble, buildFillBlank,
    levelOf, isLv3Eligible, isRusty,
    buildRound, applyResult, pushChanges, getProgressSummary, loadUnit,
    isEligibleSubject: subj => Object.prototype.hasOwnProperty.call(SUBJECT_KO, subj)
  };
  root.QuestMastery = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
