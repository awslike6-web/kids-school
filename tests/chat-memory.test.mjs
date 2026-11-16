import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// AI 대화 기억 보관소 저장(kids/core/chat-memory.js)의 계약:
// 아이가 한 마디라도 했을 때만 1줄, 같은 대화는 한 번, 부모 로그인은 건너뜀, 요약은 Worker 경로, 실패 시 아이가 한 말로 대신.
const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');

function load({ userName = '민수', summaryText = '요약: 시간 표현을 물어봄', summaryFails = false, pageOk = true } = {}) {
  const calls = [];
  const listeners = {};
  const store = { currentUserName: userName, currentUser: userName === '민서' ? 'daughter' : 'son' };
  const sandbox = {
    console: { log() {}, info() {}, warn() {}, error: console.error },
    setTimeout, clearTimeout, JSON, Math, Date,
    localStorage: { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); } },
    addEventListener: (type, fn) => { listeners[type] = fn; },
    currentSubject: '영어',
    PROXY_URL: 'https://worker.test',
    NOTION_CHAT_MEMORY_DB_ID: 'db_chat',
    fetchWithGeminiRetry: async (url, options) => {
      calls.push({ kind: 'summary', url, body: JSON.parse(options.body) });
      if (summaryFails) throw new Error('down');
      return { text: summaryText };
    },
    fetch: async (url, options) => {
      calls.push({ kind: 'page', url, body: JSON.parse(options.body), keepalive: options.keepalive });
      return { ok: pageOk, status: pageOk ? 200 : 500 };
    },
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(read('kids/core/chat-memory.js'), sandbox, { filename: 'chat-memory.js' });
  return { w: sandbox, calls, listeners, pages: () => calls.filter(c => c.kind === 'page') };
}

const CONV = [
  { role: 'assistant', content: 'Hello! Did you like the story? [SUCCESS]' },
  { role: 'user', content: '찰리는 몇 시에 자? 영어로 어떻게 말해?' },
  { role: 'assistant', content: 'You can say "What time do you go to bed?"' },
];
const PASSAGE = { unit: '10단원', title: 'An Early Bird and a Night Owl (10단원)' };

test('6단계 토론: 요약 1줄과 대화 전문을 노션 대화 기억 DB에 남긴다', async () => {
  const { w, calls, pages } = load();
  assert.equal(await w.saveChatMemoryFromConversation({ roomType: '공부방', messages: CONV, passage: PASSAGE }), true);
  const summary = calls.find(c => c.kind === 'summary');
  assert.match(summary.url, /^https:\/\/worker\.test\/v1\/chat\/completions\?type=ai$/);
  assert.match(summary.body.messages[1].content, /민수: 찰리는 몇 시에 자\?/);
  const [page] = pages();
  assert.equal(page.url, 'https://worker.test/v1/pages');
  assert.equal(page.body.parent.database_id, 'db_chat');
  const p = page.body.properties;
  assert.equal(p['아이 이름'].select.name, '민수');
  assert.equal(p['소속 방'].select.name, '공부방');
  assert.equal(p['과목'].multi_select[0].name, '영어');
  assert.equal(p['단원'].rich_text[0].text.content, '10단원 · An Early Bird and a Night Owl (10단원)');
  assert.equal(p['대화 요약'].rich_text[0].text.content, '요약: 시간 표현을 물어봄');
  assert.equal(p['장기 기억'].checkbox, false);
  assert.match(p['세션 ID'].title[0].text.content, /^sess_\d+_/);
  const lines = page.body.children.slice(1).map(b => b.paragraph.rich_text[0].text.content);
  assert.deepEqual(lines, ['코코: Hello! Did you like the story?', '민수: 찰리는 몇 시에 자? 영어로 어떻게 말해?', '코코: You can say "What time do you go to bed?"']);
});

test('아이가 말하지 않은 대화·같은 대화 두 번·부모 로그인은 남기지 않는다', async () => {
  const a = load();
  assert.equal(await a.w.saveChatMemoryFromConversation({ messages: [{ role: 'assistant', content: 'Hi' }] }), false);
  await a.w.saveChatMemoryFromConversation({ messages: CONV, passage: null });
  await a.w.saveChatMemoryFromConversation({ messages: CONV, passage: null });
  assert.equal(a.pages().length, 1);
  const parent = load({ userName: '아빠' });
  assert.equal(await parent.w.saveChatMemoryFromConversation({ messages: CONV }), true);
  assert.equal(parent.calls.length, 0);
});

test('요약이 실패하면 아이가 한 말로 대신 저장하고, 노션 저장이 실패하면 다시 시도할 수 있다', async () => {
  const { w, pages } = load({ summaryFails: true });
  await w.saveChatMemoryFromConversation({ messages: CONV, passage: null });
  assert.equal(pages()[0].body.properties['대화 요약'].rich_text[0].text.content, '민수가 한 말: 찰리는 몇 시에 자? 영어로 어떻게 말해?');
  const failing = load({ pageOk: false });
  assert.equal(await failing.w.saveChatMemoryFromConversation({ messages: CONV, passage: null }), false);
  assert.equal(await failing.w.saveChatMemoryFromConversation({ messages: CONV, passage: null }), false);
  assert.equal(failing.pages().length, 2);
});

test('코코 요정 대화창: 닫을 때 남기고, 이어서 말하면 새 기록이 된다. 세부 방 이름은 단원 칸으로', async () => {
  const { w, pages } = load();
  w.currentSubject = undefined;
  w.currentFairySubject = 'MATH';
  w.initChatMemorySession('세로셈방');
  w.trackChatMemoryUserMessage('받아올림이 뭐야?');
  w.trackChatMemoryAssistantMessage('윗자리로 1을 올려 주는 거야!');
  assert.equal(await w.finalizeChatMemorySession(), true);
  assert.equal(await w.finalizeChatMemorySession(), false); // 새 세션에는 아직 말이 없다
  w.trackChatMemoryUserMessage('꼭 기억해줘! 나 내일 시험이야');
  await w.finalizeChatMemorySession();
  const [first, second] = pages().map(p => p.body.properties);
  assert.equal(first['소속 방'].select.name, '공부방');
  assert.equal(first['단원'].rich_text[0].text.content, '세로셈방');
  assert.equal(first['과목'].multi_select[0].name, '수학');
  assert.equal(second['장기 기억'].checkbox, true);
  assert.notEqual(first['세션 ID'].title[0].text.content, second['세션 ID'].title[0].text.content);
});

test('창을 닫지 않고 페이지를 떠나면 요약 없이 keepalive로 남기고, 이미 남긴 대화는 건너뛴다', async () => {
  const { w, calls, listeners, pages } = load();
  const history = CONV.slice();
  w.registerChatMemorySource('english-stage6', () => ({ roomType: '공부방', subject: '영어', messages: history, passage: PASSAGE }));
  w.initChatMemorySession('공부방');
  w.trackChatMemoryUserMessage('고마워 코코');
  listeners.pagehide();
  await new Promise(r => setTimeout(r, 0));
  assert.equal(calls.filter(c => c.kind === 'summary').length, 0);
  assert.equal(pages().length, 2);
  assert.ok(pages().every(p => p.keepalive === true));
  listeners.pagehide();
  await new Promise(r => setTimeout(r, 0));
  assert.equal(pages().length, 2);
});

test('모든 대화 화면은 chat-memory.js를 싣는 notion-helper.js를 함께 싣는다', () => {
  assert.match(read('kids/core/notion-helper.js'), /'chat-memory\.js\?v=/);
  assert.match(read('kids/core/fairy-chatbot.js'), /finalizeChatMemorySession/);
  assert.match(read('kids/js/english_chat.js'), /registerChatMemorySource\('english-stage6'/);
  assert.match(read('kids/js/korean_sentence.js'), /registerChatMemorySource\('korean-sentence'/);
  assert.match(read('kids/common_space/voca_modal.js'), /saveChatMemoryFromConversation\(\{ roomType: '용어방'/);
});
