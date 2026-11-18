// 🧩 가족 출제 퀴즈 저장소 — 전역 window.FamilyQuiz (명세: docs/family_quiz_spec.md, 목록: kids/core/CORE_CATALOG.md)
// 노션 「가족 출제 DB」 읽기·쓰기, 행 ↔ 문제 변환, 입력 검사, 「새 문제」 계산, 로비 카드, 우체통 알림 묶음.
// 판정은 열 값(상태·버전·푼버전)으로만 한다. 아이가 쓴 글은 파싱하지 않고, 화면에는 textContent로만 넣는다.
(function () {
  'use strict';
  if (window.FamilyQuiz) return;

  const LIMITS = Object.freeze({ question: 80, choice: 20, hint: 60, longQuestion: 40 });
  const REPORT_REASONS = Object.freeze(['답이 이상해요', '무슨 말인지 모르겠어요', '글자가 틀렸어요']);
  const RESULTS = Object.freeze(['한번에', '두번째에', '도움받음']);
  const MAIL_GAP_MS = 30 * 60 * 1000;
  const MAX_ROUND = 3;
  const CHILD = Object.freeze({
    minsu: Object.freeze({ key: 'minsu', name: '민수' }),
    minseo: Object.freeze({ key: 'minseo', name: '민서' })
  });

  // 이 파일(kids/core/) 기준으로 화면 주소를 만든다(상대 경로 규칙).
  const script = document.currentScript;
  const BASE = new URL('../../', (script && script.src) || location.href).href;
  const pageURL = user => new URL('kids/common_space/family_quiz.html?user=' + encodeURIComponent(user), BASE).href;

  const cfg = () => window.APP_CONFIG || {};
  const dbId = () => cfg().FAMILY_QUIZ_DB_ID || '';
  const proxy = () => String(cfg().WORKER_PROXY_URL || '').replace(/\/+$/, '');

  // 로컬(KST 기기) 날짜 YYYY-MM-DD. toISOString 금지(헌법 §8-5).
  function localDate(date = new Date()) {
    const pad = n => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  const countChars = text => Array.from(String(text == null ? '' : text)).length;
  const clean = text => String(text == null ? '' : text).replace(/\s+/g, ' ').trim();

  // ---------- 행 ↔ 문제 ----------
  const plain = prop => {
    if (!prop) return '';
    const list = prop.title || prop.rich_text || [];
    return list.map(t => t.plain_text != null ? t.plain_text : (t.text && t.text.content) || '').join('');
  };
  const selectName = prop => (prop && prop.select && prop.select.name) || '';
  const num = prop => (prop && typeof prop.number === 'number' ? prop.number : null);

  function fromPage(page) {
    const p = (page && page.properties) || {};
    return {
      id: page && page.id,
      question: plain(p['문제']),
      answer: plain(p['정답']),
      wrongs: [plain(p['오답1']), plain(p['오답2']), plain(p['오답3'])],
      hint: plain(p['힌트']),
      author: selectName(p['출제자']),
      solver: selectName(p['푸는사람']),
      status: selectName(p['상태']),
      version: num(p['버전']) || 1,
      editedOn: (p['고친날'] && p['고친날'].date && p['고친날'].date.start) || '',
      solvedVersion: num(p['푼버전']),
      result: selectName(p['결과']),
      report: selectName(p['신고'])
    };
  }

  const text = value => ({ rich_text: value ? [{ text: { content: String(value) } }] : [] });
  const sel = value => ({ select: value ? { name: value } : null });

  // 출제·고치기에서 쓰는 글 칸 (문제·정답·오답·힌트)
  function contentProperties(draft) {
    const d = normalizeDraft(draft);
    return {
      '문제': { title: [{ text: { content: d.question } }] },
      '정답': text(d.answer),
      '오답1': text(d.wrongs[0]),
      '오답2': text(d.wrongs[1]),
      '오답3': text(d.wrongs[2]),
      '힌트': text(d.hint)
    };
  }

  function createProperties(draft, authorName, solverName, today) {
    return Object.assign(contentProperties(draft), {
      '출제자': sel(authorName),
      '푸는사람': sel(solverName),
      '상태': sel('공개'),
      '버전': { number: 1 },
      '고친날': { date: { start: today || localDate() } }
    });
  }

  // 고치기: 버전 +1, 그 버전의 풀이 기록·신고는 비운다(다시 「새 문제」가 된다).
  function reviseProperties(quiz, draft, today) {
    return Object.assign(contentProperties(draft), {
      '상태': sel('공개'),
      '버전': { number: (Number(quiz && quiz.version) || 1) + 1 },
      '고친날': { date: { start: today || localDate() } },
      '푼버전': { number: null },
      '결과': sel(''),
      '신고': sel('')
    });
  }

  function resultProperties(quiz, result, report) {
    const props = {
      '푼버전': { number: Number(quiz && quiz.version) || 1 },
      '결과': sel(RESULTS.includes(result) ? result : '도움받음')
    };
    if (REPORT_REASONS.includes(report)) props['신고'] = sel(report);
    return props;
  }

  // ---------- 입력 검사 ----------
  function normalizeDraft(draft) {
    const d = draft || {};
    const wrongs = Array.isArray(d.wrongs) ? d.wrongs : [];
    return {
      question: clean(d.question),
      answer: clean(d.answer),
      wrongs: [0, 1, 2].map(i => clean(wrongs[i])),
      hint: clean(d.hint)
    };
  }

  // errors가 있으면 출시를 막고, warnings는 보여 주기만 한다.
  function validate(draft) {
    const d = normalizeDraft(draft);
    const errors = [];
    const warnings = [];
    const need = (field, value, label, max) => {
      if (!value) errors.push({ field, message: `${label}을(를) 써 주세요` });
      else if (countChars(value) > max) errors.push({ field, message: `${label}은(는) ${max}자까지 쓸 수 있어요` });
    };
    need('question', d.question, '문제', LIMITS.question);
    need('answer', d.answer, '정답', LIMITS.choice);
    d.wrongs.forEach((w, i) => need(`wrong${i + 1}`, w, `오답 ${i + 1}`, LIMITS.choice));
    if (countChars(d.hint) > LIMITS.hint) errors.push({ field: 'hint', message: `힌트는 ${LIMITS.hint}자까지 쓸 수 있어요` });

    const seen = new Map();
    [d.answer, ...d.wrongs].forEach((value, i) => {
      if (!value) return;
      const key = value.toLowerCase();
      const field = i === 0 ? 'answer' : `wrong${i}`;
      if (seen.has(key)) {
        const first = seen.get(key);
        errors.push({ field, message: first === 'answer' ? '정답과 같은 오답이 있어요' : '같은 보기가 두 번 있어요' });
      } else {
        seen.set(key, field);
      }
    });
    if (countChars(d.question) > LIMITS.longQuestion) warnings.push({ field: 'question', message: '민서가 읽기엔 조금 길어요' });
    return { ok: errors.length === 0, errors, warnings, draft: d };
  }

  // ---------- 「새 문제」 ----------
  const isNew = q => !!q && q.status === '공개' && (q.solvedVersion == null || q.solvedVersion < (q.version || 1));

  function pickNew(list, solverName, max = MAX_ROUND) {
    return (list || [])
      .filter(q => isNew(q) && (!solverName || q.solver === solverName))
      .sort((a, b) => String(a.editedOn).localeCompare(String(b.editedOn)))
      .slice(0, max);
  }

  const choicesOf = q => [q.answer, ...(q.wrongs || [])];

  // ---------- 노션 ----------
  async function call(path, method, body) {
    if (!dbId() || !proxy()) throw new Error('family-quiz: 설정 없음');
    const res = await window.fetch(proxy() + path, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    });
    if (!res.ok) throw new Error('family-quiz: 노션 ' + res.status);
    return res.json();
  }

  async function query(filter) {
    const out = [];
    let cursor;
    for (let guard = 0; guard < 10; guard++) {
      const body = { filter, sorts: [{ property: '고친날', direction: 'descending' }], page_size: 100 };
      if (cursor) body.start_cursor = cursor;
      const data = await call(`/v1/databases/${dbId()}/query?force=true`, 'POST', body);
      (data.results || []).forEach(page => out.push(fromPage(page)));
      if (!data.has_more || !data.next_cursor) break;
      cursor = data.next_cursor;
    }
    return out;
  }

  const isOpen = { property: '상태', select: { equals: '공개' } };
  const listForSolver = solverName => query({ and: [isOpen, { property: '푸는사람', select: { equals: solverName } }] });
  const listByAuthor = authorName => query({ and: [isOpen, { property: '출제자', select: { equals: authorName } }] });

  async function create(draft, authorName, solverName) {
    const check = validate(draft);
    if (!check.ok) throw new Error('family-quiz: 입력 오류');
    const page = await call('/v1/pages', 'POST', {
      parent: { database_id: dbId() },
      properties: createProperties(check.draft, authorName, solverName)
    });
    return fromPage(page);
  }

  async function revise(quiz, draft) {
    const check = validate(draft);
    if (!check.ok) throw new Error('family-quiz: 입력 오류');
    return fromPage(await call(`/v1/pages/${quiz.id}`, 'PATCH', { properties: reviseProperties(quiz, check.draft) }));
  }

  const hide = quiz => call(`/v1/pages/${quiz.id}`, 'PATCH', { properties: { '상태': sel('숨김') } });

  async function recordResult(quiz, result, report) {
    const body = { properties: resultProperties(quiz, result, report) };
    try {
      return await call(`/v1/pages/${quiz.id}`, 'PATCH', body);
    } catch (first) {
      return call(`/v1/pages/${quiz.id}`, 'PATCH', body); // 한 번만 다시 시도. 그래도 실패면 다음에 다시 새 문제로 나온다.
    }
  }

  // ---------- 우체통 알림 (30분에 한 번) ----------
  const store = {
    get(key) { try { return window.localStorage.getItem(key); } catch (e) { return null; } },
    set(key, value) { try { window.localStorage.setItem(key, value); } catch (e) { /* 저장 못 해도 계속 */ } }
  };

  // 이 기기가 from 아이로 우체통에 등록돼 있을 때만 보낸다. 실패해도 조용히 false.
  async function notify(fromKey, toKey, message, nowMs = Date.now()) {
    const mail = window.FamilyMail;
    if (!mail || typeof mail.getDevice !== 'function' || typeof mail.send !== 'function') return false;
    const device = mail.getDevice();
    if (!device || device.member !== fromKey) return false;
    const stampKey = 'familyQuizMailAt_' + fromKey;
    const last = Number(store.get(stampKey)) || 0;
    if (nowMs - last < MAIL_GAP_MS) return false;
    try {
      const clientId = typeof mail.newClientId === 'function' ? mail.newClientId() : undefined;
      await mail.send({ to: toKey, text: message, clientId });
      store.set(stampKey, String(nowMs));
      return true;
    } catch (e) {
      return false;
    }
  }

  // ---------- 쓰다 만 문제 ----------
  const DRAFT_KEY = 'familyQuizDraft_minsu';
  const draft = {
    load() { try { return JSON.parse(store.get(DRAFT_KEY) || 'null'); } catch (e) { return null; } },
    save(value) { store.set(DRAFT_KEY, JSON.stringify(value || {})); },
    clear() { try { window.localStorage.removeItem(DRAFT_KEY); } catch (e) { /* 무시 */ } }
  };

  // ---------- 로비 카드 ----------
  function node(tag, className, textValue) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (textValue != null) el.textContent = textValue;
    return el;
  }

  // 민서: 새 문제가 있을 때만 카드를 보인다. 민수: 버튼은 늘 보이고 신고가 있으면 🚩 배지.
  // 로비 그리기를 막지 않는다. 실패하면 민서 카드는 숨긴 채로, 민수 버튼은 배지 없이 둔다.
  async function mountLobbyCard(el, childKey) {
    if (!el) return null;
    const child = CHILD[childKey];
    if (!child) return null;
    if (childKey === 'minsu') {
      el.replaceChildren();
      const button = node('a', 'family-quiz-lobby family-quiz-lobby--author');
      button.href = pageURL('minsu');
      button.append(node('span', 'family-quiz-lobby__icon', '🧩'), node('span', 'family-quiz-lobby__text', '동생 문제 만들기'));
      el.appendChild(button);
      el.hidden = false;
      try {
        const reported = (await listByAuthor(child.name)).filter(q => q.report).length;
        if (reported > 0) button.appendChild(node('span', 'family-quiz-lobby__badge', `🚩 ${reported}`));
        return reported;
      } catch (e) {
        return null;
      }
    }
    try {
      const fresh = pickNew(await listForSolver(child.name), child.name, 99).length;
      if (!fresh) { el.hidden = true; return 0; }
      el.replaceChildren();
      const card = node('a', 'family-quiz-lobby family-quiz-lobby--solver');
      card.href = pageURL('minseo');
      card.append(node('span', 'family-quiz-lobby__icon', '🎁'), node('span', 'family-quiz-lobby__text', `오빠가 낸 문제 ${fresh}개!`));
      el.appendChild(card);
      el.hidden = false;
      return fresh;
    } catch (e) {
      el.hidden = true;
      return null;
    }
  }

  window.FamilyQuiz = Object.freeze({
    LIMITS, REPORT_REASONS, RESULTS, MAX_ROUND, CHILD,
    localDate, countChars, fromPage, validate, normalizeDraft,
    createProperties, reviseProperties, resultProperties,
    isNew, pickNew, choicesOf,
    listForSolver, listByAuthor, create, revise, hide, recordResult,
    notify, draft, mountLobbyCard, pageURL
  });
})();
