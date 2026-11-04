import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../kids/core/gemini-chat.js', import.meta.url), 'utf8');

function load({ responses = [], storage = {} } = {}) {
  const calls = [], spoken = [];
  const context = {
    console, JSON, Promise, String, Array, Object, Error,
    setTimeout: fn => { fn(); return 0; },
    localStorage: { getItem: key => storage[key] ?? null },
    document: { getElementById: () => null },
    speakFairyTTS: text => spoken.push(text),
    fetch: async (url, init) => {
      calls.push({ url, init });
      const item = responses[Math.min(calls.length - 1, responses.length - 1)];
      if (item instanceof Error) throw item;
      return { ok: item.status < 400, status: item.status, json: async () => item.body };
    }
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(source, context);
  return { w: context, calls, spoken };
}
const chat = text => ({ status: 200, body: { choices: [{ message: { content: text } }] } });
const busy = { status: 503, body: { error: { status: 'UNAVAILABLE', message: '붐빔' } } };

test('키를 받거나 Google을 직접 부르는 코드가 없다', () => {
  assert.doesNotMatch(source, /api\/gemini-key|generativelanguage|callDirectGoogleGemini|\/v1\/databases/);
});

test('두 응답 형식에서 글을 꺼낸다', async () => {
  const a = await load({ responses: [chat(' 안녕 ')] }).w.fetchWithGeminiRetry('/x');
  assert.equal(a.text, '안녕');
  const parts = { status: 200, body: { candidates: [{ content: { parts: [{ text: '생각', thought: true }, { text: '답' }] } }] } };
  assert.equal((await load({ responses: [parts] }).w.fetchWithGeminiRetry('/x')).text, '답');
});

test('붐비면 다시 시도하고 안내를 한 번만 말한다', async () => {
  const b = load({ responses: [busy, busy, chat('됐어')] });
  const result = await b.w.fetchWithGeminiRetry('/x', {}, { maxRetries: 3, baseDelayMs: 0, ui: { appendFairyMessage: true } });
  assert.equal(result.text, '됐어');
  assert.equal(b.calls.length, 3);
  assert.equal(b.spoken.length, 1);
});

test('재시도할 수 없는 오류는 한 번에 실패하고, 횟수를 넘으면 실패한다', async () => {
  const bad = load({ responses: [{ status: 400, body: { error: { message: '위치' } } }] });
  await assert.rejects(bad.w.fetchWithGeminiRetry('/x', {}, { maxRetries: 3, baseDelayMs: 0 }), /위치/);
  assert.equal(bad.calls.length, 1);
  const net = load({ responses: [new Error('끊김')] });
  await assert.rejects(net.w.fetchWithGeminiRetry('/x', {}, { maxRetries: 2, baseDelayMs: 0 }), /끊김/);
  assert.equal(net.calls.length, 2);
});

test('아이별 안내문을 만들고 지문 토론에는 원문과 보상 규칙이 들어간다', () => {
  const { w } = load({ storage: { currentUserName: '민서' } });
  assert.match(w.buildFullAISystemPrompt('로비'), /언니/);
  const passage = { title: '김치', fullText: '김치는 전통 음식이다' };
  const korean = w.buildDiscussionAISystemPrompt('국어', passage);
  assert.match(korean, /\[SUCCESS\]/);
  assert.match(korean, /김치는 전통 음식이다/);
  assert.match(w.buildDiscussionAISystemPrompt('영어', passage), /English mentor/);
});

test('어른 프로필은 부모로 보고 아이 이름은 프로필에서 고른다', () => {
  const { w } = load({ storage: { currentUserName: '아빠', currentUser: 'daughter' } });
  assert.equal(w.isParentProfile(), true);
  assert.equal(w.getActiveChildName(), '민서');
});

test('마지막 사용자 말만 되돌린다', () => {
  const { w } = load();
  const history = [{ role: 'model' }, { role: 'user' }];
  w.popLastPendingUserTurn(history);
  assert.equal(history.length, 1);
  w.popLastPendingUserTurn(history);
  assert.equal(history.length, 1);
});
