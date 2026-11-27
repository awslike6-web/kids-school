// ========================================================
// 🧩 5분 퀘스트 문제 만들기 (quest-questions.js)
// - 역할: 단원 항목 하나로 문제 객체를 만든다 — 보기 고르기(choice_audio), 빈칸 채우기(fill_blank),
//         조각 조립(scramble), 짝 맞추기(match_3x3). 한글 받침·모음 분석으로 받아쓰기 철자 오답 보기를 만든다.
// - 2026-11-28 리팩토링 묶음 D2: quest-mastery.js(792줄)의 「문제 생성」·「한글 받침·모음 분석」 구역을 그대로 옮겼다.
//   숙련도 계산·1판 배치·노션 동기화는 quest-mastery.js(window.QuestMastery)가 이 파일을 받아 쓴다.
// - 싣는 순서: quest-questions.js → quest-mastery.js. DOM 조작 없음, 바깥 전역에 기대지 않음.
// ========================================================
(function (root) {
  'use strict';

  const HINT_POLICY = { 1: 'always', 2: 'on_error', 3: 'minimal' };
  const EN_STOPWORDS = ['a', 'an', 'the', 'is', 'are', 'in', 'on', 'at', 'to', 'of', 'this', 'that', 'there', 'what', 'where', 'my', 'it'];

  function isSentenceLike(item) { return item.kind !== 'word'; }

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

  // 연음(소리 나는 대로 쓰기): 받침 종성 → [남는 받침, 다음 'ㅇ' 자리로 넘어가는 초성] (많아요→마나요, 없어요→업써요)
  // ㅎ 받침 소리 나는 대로 쓰기: ㄱ·ㄷ·ㅈ 앞 거센소리(옳다→올타, 않고→안코), ㅀ+ㄴ → ㄹㄹ(뚫는다→뚤른다)
  const H_REST = { 6: 4, 15: 8, 27: 0 };
  const ASPIRATE = { 0: 15, 3: 16, 12: 14 };
  const LIAISON = { 1: [0, 0], 2: [0, 1], 3: [1, 10], 4: [0, 2], 5: [4, 12], 6: [0, 2], 7: [0, 3], 8: [0, 5], 9: [8, 0], 10: [8, 6], 11: [8, 7], 12: [8, 10], 13: [8, 16], 14: [8, 17], 15: [0, 5], 16: [0, 6], 17: [0, 7], 18: [17, 10], 19: [0, 9], 20: [0, 10], 22: [0, 12], 23: [0, 14], 24: [0, 15], 25: [0, 16], 26: [0, 17], 27: [0, 11] };

  // 받아쓰기 철자 오답: 겹받침을 홑받침으로(닭→달·닥), 소리 나는 대로 쓰기(볶아요→보까요), 소리가 같은 받침·모음 바꾸기(옷→옫, 개→게)
  function misspellingsOf(token) {
    const primary = [], secondary = [];
    const syl = syllablesOf(token);
    syl.forEach((x, idx) => {
      if (x.cho === undefined) return;
      const make = (jung, jong) => syl.map((y, k) => (k === idx ? composeSyllable(y, jung, jong) : y.ch)).join('');
      if (DOUBLE_JONG[x.jong]) DOUBLE_JONG[x.jong].forEach(j => primary.push(make(x.jung, j)));
      const next = syl[idx + 1];
      if (LIAISON[x.jong] && next && next.cho === 11) {
        const [rest, cho] = LIAISON[x.jong];
        secondary.push(syl.map((y, k) => (k === idx ? composeSyllable(y, y.jung, rest) : k === idx + 1 ? composeSyllable({ cho }, y.jung, y.jong) : y.ch)).join(''));
      }
      const hCho = next && H_REST[x.jong] !== undefined ? (ASPIRATE[next.cho] ?? (x.jong === 15 && next.cho === 2 ? 5 : undefined)) : undefined;
      if (hCho !== undefined) {
        secondary.push(syl.map((y, k) => (k === idx ? composeSyllable(y, y.jung, H_REST[x.jong]) : k === idx + 1 ? composeSyllable({ cho: hCho }, y.jung, y.jong) : y.ch)).join(''));
      }
      if (!DOUBLE_JONG[x.jong] && x.jong) (SOUND_ALIKE_JONG[x.jong] || []).forEach(j => secondary.push(make(x.jung, j)));
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

  // 상세설명 예문의 [어절]이 표제어의 활용형(첫 글자가 같음)이면 그 어절 (닳다 ↔ "연필심이 [닳았다].")
  function usageInDetail(item) {
    const m = String(item.detail || '').match(/\[([^\]]+)\]/);
    const token = m ? m[1].trim() : '';
    return token && !/\s/.test(token) && token[0] === String(item.word || '')[0] ? token : '';
  }
  // 화면 힌트용: 빈칸 지정 [ ] 표시만 걷어낸 상세설명
  function plainDetail(item) {
    return String(item.detail || '').replace(/[\[\]]/g, '');
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
    // ①-3 한글 낱말 + 상세설명 예문 속 [활용형] ("연필심이 [닳았다].") → 그 어절 빈칸 3지선다
    //      보기는 철자 오답 우선, 모자라면 같은 단원 낱말(철자 낱말↔뜻 낱말 같은 갈래 먼저)로 채운다
    const usage = lang !== 'en' && item.kind === 'word' ? usageInDetail(item) : '';
    if (usage) {
      const distractors = misspellingsOf(usage).slice(0, 2);
      const words = all.filter(o => o.kind === 'word');
      const isSpelling = o => misspellingsOf(o.word).length > 0;
      pickDistractors(item, words.filter(o => isSpelling(o) === distractors.length > 0), 'word', 2, rng)
        .concat(pickDistractors(item, words, 'word', 2, rng))
        .forEach(w => { if (distractors.length < 2 && w !== usage && !distractors.includes(w)) distractors.push(w); });
      if (distractors.length === 2) {
        const display = item.detail.replace(`[${usage}]`, '[ _ ]').replace(/\[(?! _ \])([^\]]*)\]/g, '$1');
        return { mode: 'choice', display, fromDetail: true, ...makeChoice(usage, distractors, rng) };
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
      hint: plainDetail(item) || item.meaning,
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
    // 상세설명 예문 빈칸은 예문이 곧 정답이라, 힌트는 기본 낱말 모양(닳다 → 닳았다)으로 바꾼다 (같으면 뜻풀이)
    if (q.fill && q.fill.fromDetail) q.hint = q.fill.options[q.fill.answer] === item.word ? item.meaning : `기본 낱말 '${item.word}'의 받침을 떠올려 봐요`;
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

  const api = {
    HINT_POLICY, EN_STOPWORDS, isSentenceLike,
    shuffle, chunkSentence, buildScramble,
    koreanTier, misspellingsOf, pickBlankToken, usageInDetail, buildFillBlank,
    buildQuestion, buildMatch
  };
  root.QuestQuestions = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
