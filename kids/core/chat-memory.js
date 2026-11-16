// kids/core/chat-memory.js
// 🧠 AI 대화 기억 보관소 저장 (노션 NOTION_CHAT_MEMORY_DB)
// - 6단계 영어 토론·국어 지문 토론·코코 요정 대화창·용어방 대화를 창을 닫을 때 1줄로 남긴다.
// - 요약은 Worker(/v1/chat/completions?type=ai)로만 받는다. 브라우저에 키를 두지 않는다.
// - 창을 닫지 않고 페이지를 떠나면 요약 없이 대화 전문만 keepalive로 남긴다.
// - 부모(아빠·엄마·어른) 로그인은 남기지 않는다. 아이가 한 마디라도 해야 남긴다.
// - 2026-11-16 되살림 (예전 fairy-chat-memory.js는 9월부터 연결이 끊겼고 11-01 삭제). 시험: tests/chat-memory.test.mjs
(() => {
  const ROOMS = ['공부방', '로비', '용어방', '마이룸'];
  const SUBJECTS = { KOREAN: '국어', ENGLISH: '영어', MATH: '수학', SCIENCE: '과학', SOCIETY: '사회' };
  const IMPORTANT_TRIGGERS = ['꼭기억해', '기억해줘', '중요한얘기', '중요한이야기', '내비밀', '잊지마'];
  const TEXT_LIMIT = 1900;   // 노션 rich_text 한 덩어리 상한(2000) 아래
  const BODY_BLOCKS = 90;    // 페이지 본문 블록 상한(100) 아래
  const savedKeys = new Set();
  const sources = new Map();

  const proxyBase = () => (typeof PROXY_URL !== 'undefined' ? PROXY_URL
    : (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.WORKER_PROXY_URL) || 'https://minmin-notion.awslike6.workers.dev');
  const dbId = () => (typeof NOTION_CHAT_MEMORY_DB_ID !== 'undefined' ? NOTION_CHAT_MEMORY_DB_ID
    : (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.NOTION_CHAT_MEMORY_DB_ID) || '373a27115b6880ba82cdfeaa1c825547');

  function loginName() {
    try { return String(window.currentUserName || localStorage.getItem('currentUserName') || '').trim(); } catch (_) { return ''; }
  }
  function isParentLogin() { return ['아빠', '엄마', '어른', 'admin'].includes(loginName()); }
  function childName() {
    if (typeof window.getActiveChildName === 'function') return window.getActiveChildName();
    return loginName() === '민서' ? '민서' : '민수';
  }
  function newSessionId() { return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }

  // {role:'user'|'assistant'|'model'|'ai', content | parts[0].text} → [{role:'user'|'assistant', content}]
  function normalizeMessages(messages) {
    return (Array.isArray(messages) ? messages : []).map(m => ({
      role: m && m.role === 'user' ? 'user' : 'assistant',
      content: String((m && (m.content ?? m.parts?.[0]?.text)) || '').replace(/\[SUCCESS\]/g, '').trim()
    })).filter(m => m.content);
  }

  function buildTranscript(messages, name = '아이') {
    return normalizeMessages(messages).map(m => `${m.role === 'user' ? name : '코코'}: ${m.content}`).join('\n');
  }

  function isImportantText(text) {
    const s = String(text || '').replace(/\s/g, '');
    return IMPORTANT_TRIGGERS.some(t => s.includes(t));
  }

  function fallbackSummary(messages, name) {
    const said = normalizeMessages(messages).filter(m => m.role === 'user').map(m => m.content);
    return `${name}가 한 말: ${said.slice(0, 5).join(' / ')}`.slice(0, TEXT_LIMIT);
  }

  // 방 이름: 노션 「소속 방」 선택지(공부방·로비·용어방·마이룸)로 모으고, 수학 놀이방 같은 세부 이름은 단원 칸 앞에 붙인다
  function resolveContext(opts = {}) {
    const rawRoom = String(opts.roomType || '공부방');
    const room = ROOMS.includes(rawRoom) ? rawRoom : '공부방';
    let subject = opts.subject;
    if (subject === undefined) {
      subject = room === '로비' || room === '마이룸' ? ''
        : window.currentSubject || (opts.fromFairy ? SUBJECTS[window.currentFairySubject] : '') || '';
    }
    if (subject === '용어사전') subject = '';
    const passage = opts.passage === undefined ? currentDiscussionPassage() : opts.passage;
    const unitParts = [ROOMS.includes(rawRoom) ? '' : rawRoom, opts.unit || (passage ? [passage.unit, passage.title].filter(Boolean).join(' · ') : '')];
    return { room, subject: String(subject || ''), unit: unitParts.filter(Boolean).join(' · ') };
  }

  function currentDiscussionPassage() {
    const eng = window.EnglishChat && typeof window.EnglishChat.getActivePassage === 'function' ? window.EnglishChat.getActivePassage() : null;
    return eng || window.activePassage || null;
  }

  function chunks(text, size = TEXT_LIMIT) {
    const out = [];
    for (let i = 0; i < text.length; i += size) out.push(text.slice(i, i + size));
    return out;
  }

  function buildPagePayload({ sessionId, name, room, subject, unit, summary, messages, important }) {
    const properties = {
      '세션 ID': { title: [{ text: { content: sessionId || newSessionId() } }] },
      '아이 이름': { select: { name } },
      '소속 방': { select: { name: room } },
      '대화 요약': { rich_text: [{ text: { content: String(summary || '').slice(0, TEXT_LIMIT) } }] },
      '장기 기억': { checkbox: important === true }
    };
    if (subject) properties['과목'] = { multi_select: [{ name: subject }] };
    if (unit) properties['단원'] = { rich_text: [{ text: { content: unit.slice(0, TEXT_LIMIT) } }] };
    const lines = normalizeMessages(messages).flatMap(m => chunks(`${m.role === 'user' ? name : '코코'}: ${m.content}`));
    const children = [{ object: 'block', type: 'heading_3', heading_3: { rich_text: [{ text: { content: '대화 전문' } }] } }]
      .concat(lines.slice(0, BODY_BLOCKS).map(line => ({ object: 'block', type: 'paragraph', paragraph: { rich_text: [{ text: { content: line } }] } })));
    if (lines.length > BODY_BLOCKS) {
      children.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: [{ text: { content: `… 뒤 ${lines.length - BODY_BLOCKS}줄 생략` } }] } });
    }
    return { parent: { database_id: dbId() }, properties, children };
  }

  async function summarize(messages, name) {
    const fetchFn = window.fetchWithGeminiRetry;
    if (typeof fetchFn !== 'function') return fallbackSummary(messages, name);
    try {
      const { text } = await fetchFn(`${proxyBase()}/v1/chat/completions?type=ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gemini-3.8-flash',
          messages: [
            { role: 'system', content: `너는 부모에게 보여 줄 대화 기록을 정리한다. ${name}(초등학생)와 AI 요정 코코의 대화를 한국어 2~3줄로 요약하라. ${name}가 무엇을 이야기했고 무엇을 궁금해했는지, 영어로 어떻게 말하는지 물어본 표현이 있으면 「물어본 표현: 우리말 → 영어」로 함께 적어라. 요약문만 출력하라.` },
            { role: 'user', content: buildTranscript(messages, name).slice(0, 12000) }
          ]
        })
      }, { maxRetries: 2, baseDelayMs: 800 });
      return String(text || '').trim() || fallbackSummary(messages, name);
    } catch (e) {
      console.warn('[ChatMemory] 요약 실패 → 아이가 한 말로 대신 저장', e);
      return fallbackSummary(messages, name);
    }
  }

  function conversationKey(messages) { return buildTranscript(messages); }

  // 대화 1건을 노션에 남긴다 → 남겼으면(또는 이미 남겼거나 부모 로그인이라 건너뛰면) true
  async function saveChatMemoryFromConversation(opts = {}) {
    const messages = normalizeMessages(opts.messages);
    const userTurns = messages.filter(m => m.role === 'user');
    if (!userTurns.length) return false;
    const key = conversationKey(messages);
    if (savedKeys.has(key)) return true;
    if (isParentLogin()) { savedKeys.add(key); return true; }
    savedKeys.add(key);
    const name = opts.childName || childName();
    const ctx = resolveContext(opts);
    const summary = opts.unloading ? fallbackSummary(messages, name) : await summarize(messages, name);
    const payload = buildPagePayload({
      sessionId: opts.sessionId, name, room: ctx.room, subject: ctx.subject, unit: ctx.unit, summary, messages,
      important: opts.isImportant === true || userTurns.some(m => isImportantText(m.content))
    });
    try {
      const res = await fetch(`${proxyBase()}/v1/pages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: opts.unloading === true
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      console.log(`🧠 [AI 대화 기억 저장] ${name} / ${ctx.room} / ${ctx.subject || '-'} / ${userTurns.length}마디`);
      return true;
    } catch (e) {
      savedKeys.delete(key);
      console.warn('[ChatMemory] 노션 저장 실패', e);
      return false;
    }
  }

  // ── 코코 요정 대화창(fairy-chatbot.js): 열 때 init, 말할 때 track, 닫을 때 finalize ──
  function initChatMemorySession(roomType) {
    window.chatSessionState = { sessionId: newSessionId(), roomType: roomType || '공부방', messages: [], saved: false };
    return window.chatSessionState;
  }
  function track(role, text) {
    const s = window.chatSessionState;
    if (s && text) s.messages.push({ role, content: String(text) });
  }
  async function finalizeChatMemorySession(options = {}) {
    const s = options.state || window.chatSessionState;
    if (!s || !s.messages.some(m => m.role === 'user')) return false;
    const messages = s.messages.slice();
    // 같은 창에서 이어서 말하면 새 기록으로 남도록 바로 새 세션을 연다
    initChatMemorySession(s.roomType);
    return saveChatMemoryFromConversation({ ...options, messages, roomType: s.roomType, sessionId: s.sessionId, passage: null, fromFairy: true });
  }

  // ── 페이지를 떠날 때: 닫지 않은 대화를 요약 없이 남긴다 ──
  function registerChatMemorySource(name, getter) {
    if (name && typeof getter === 'function') sources.set(name, getter);
  }
  function flushOnLeave() {
    const s = window.chatSessionState;
    if (s && s.messages.some(m => m.role === 'user')) {
      saveChatMemoryFromConversation({ messages: s.messages, roomType: s.roomType, sessionId: s.sessionId, passage: null, fromFairy: true, unloading: true });
    }
    sources.forEach(getter => {
      let conv = null;
      try { conv = getter(); } catch (_) {}
      if (conv && conv.messages) saveChatMemoryFromConversation({ ...conv, unloading: true });
    });
  }
  if (typeof window.addEventListener === 'function') window.addEventListener('pagehide', flushOnLeave);

  window.ChatMemory = { normalizeMessages, buildTranscript, buildPagePayload, resolveContext, isImportantText, fallbackSummary, flushOnLeave };
  Object.assign(window, {
    saveChatMemoryFromConversation, initChatMemorySession, finalizeChatMemorySession, registerChatMemorySource,
    trackChatMemoryUserMessage: text => track('user', text),
    trackChatMemoryAssistantMessage: text => track('assistant', text)
  });
})();
