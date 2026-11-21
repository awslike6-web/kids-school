import test from 'node:test';
import assert from 'node:assert/strict';
import { loadBrowserScripts } from './browser-sandbox.mjs';

const QUEUE_KEY = 'MINMIN_LEARNING_LOG_V1';
// 샌드박스(vm) 객체는 원형이 달라 엄격 비교가 실패하므로 JSON 왕복 뒤 비교한다 (다른 시험과 같은 방식)
const plain = value => JSON.parse(JSON.stringify(value));
const sameJson = (actual, expected, message) => assert.deepEqual(plain(actual), plain(expected), message);

function createStorage() {
  const map = new Map();
  return {
    getItem(k) { return map.has(k) ? map.get(k) : null; },
    setItem(k, v) { map.set(k, String(v)); },
    removeItem(k) { map.delete(k); },
  };
}

function findProp(obj, target) {
  if (!obj || typeof obj !== 'object') return undefined;
  if (Object.hasOwn(obj, target)) return obj[target];
  for (const v of Object.values(obj)) {
    const found = findProp(v, target);
    if (found !== undefined) return found;
  }
  return undefined;
}

function setup({
  userName = '민수',
  hasColumn = true,
  initialPage = { id: 'page_1', properties: { '문항기록': { rich_text: [] } } },
  onPatch,
} = {}) {
  const storage = createStorage();
  let page = initialPage ? structuredClone(initialPage) : null;

  const mockFetch = async (url, options = {}) => {
    const method = (options.method || 'GET').toUpperCase();
    const rawBody = options.body;
    const body = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;

    if (method === 'GET' && url.includes('/v1/databases/')) {
      const properties = hasColumn
        ? { '문항기록': { type: 'rich_text' } }
        : { '이름': { type: 'title' } };
      return { ok: true, status: 200, json: async () => ({ properties }) };
    }
    if (method === 'POST' && url.includes('/query')) {
      return { ok: true, status: 200, json: async () => ({ results: page ? [page] : [] }) };
    }
    if (method === 'POST' && url.includes('/v1/pages')) {
      page = { id: 'new_page', properties: { '문항기록': { rich_text: [] } } };
      return { ok: true, status: 200, json: async () => page };
    }
    if (method === 'GET' && url.includes('/v1/pages/')) {
      return { ok: true, status: 200, json: async () => page };
    }
    if (method === 'PATCH' && url.includes('/v1/pages/')) {
      if (onPatch) {
        const res = await onPatch(body, page);
        if (res) {
          if (res.ok && body?.properties?.['문항기록']) {
            page.properties['문항기록'] = body.properties['문항기록'];
          }
          return res;
        }
      }
      if (body?.properties?.['문항기록']) {
        page.properties['문항기록'] = body.properties['문항기록'];
      }
      return { ok: true, status: 200, json: async () => page };
    }
    return { ok: false, status: 404, json: async () => ({}) };
  };

  const { sandbox, calls } = loadBrowserScripts(
    ['kids/core/study-log-store.js', 'kids/core/learning-log.js'],
    { userName, fetch: mockFetch, storage },
  );

  return {
    LearningLog: sandbox.LearningLog,
    StudyLogStore: sandbox.StudyLogStore,
    calls,
    storage,
    getPage: () => page,
  };
}

function readPageLog(LearningLog, page) {
  const rt = page?.properties?.['문항기록']?.rich_text || [];
  return LearningLog.decode(rt.map((t) => t.plain_text ?? t.text?.content ?? '').join(''));
}

test('1. merge 합산: 시도·틀림·힌트 더하기, 최근오답 3개 유지·20자 자르기·| 치환', () => {
  const { LearningLog } = setup();
  const stored = { v: 1, i: { 'v:apple': [2, 1, 1, 'old1|old2'] }, b: ['b0'] };
  const delta = { 'v:apple': [3, 2, 1, ['a|b', 'c', '1234567890123456789012345']] };
  const merged = LearningLog.merge(stored, delta, 'b1');

  sameJson(merged.i['v:apple'], [5, 3, 2, 'a/b|c|12345678901234567890']);
});

test('2. merge 같은 배치 두 번 → 한 번만, b는 최근 10개 유지, 입력 객체를 바꾸지 않음', () => {
  const { LearningLog } = setup();
  const stored = {
    v: 1,
    i: { 'v:k1': [1, 0, 0, ''] },
    b: ['b0', 'b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'b8', 'b9'],
  };
  const delta = { 'v:k1': [2, 1, 0, ['err']] };
  const storedSnap = structuredClone(stored);
  const deltaSnap = structuredClone(delta);

  const once = LearningLog.merge(stored, delta, 'b10');
  const twice = LearningLog.merge(once, delta, 'b10');

  sameJson(stored, storedSnap);
  sameJson(delta, deltaSnap);
  assert.equal(twice.i['v:k1'][0], 3);
  assert.equal(twice.b.length, 10);
  sameJson(twice.b, ['b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'b8', 'b9', 'b10']);
});

test('3. merge 300개 상한: 300개 찬 상태에서 새 문항은 안 들어가고 기존 문항 누적은 됨', () => {
  const { LearningLog } = setup();
  const items = {};
  for (let k = 0; k < 300; k += 1) {
    items[`v:k${k}`] = [1, 0, 0, ''];
  }
  const stored = { v: 1, i: items, b: [] };
  const merged = LearningLog.merge(
    stored,
    { 'v:k0': [2, 1, 0, []], 'v:new': [1, 0, 0, []] },
    'b1',
  );

  assert.equal(Object.keys(merged.i).length, 300);
  assert.equal('v:new' in merged.i, false);
  assert.equal(merged.i['v:k0'][0], 3);
  assert.equal(merged.i['v:k0'][1], 1);
});

test('4. encode/decode 왕복: 긴 데이터(조각 2개 이상), 이모지 경계 포함 코드 포인트 ≤ 1900', () => {
  const { LearningLog } = setup();
  const items = {};
  for (let k = 0; k < 140; k += 1) {
    items[`v:item_${String(k).padStart(3, '0')}`] = [k + 1, 1, 0, '🍎'.repeat(8)];
  }
  const obj = { v: 1, i: items, b: ['b1', 'b2'] };
  const chunks = LearningLog.encode(obj);

  assert.ok(chunks.length >= 2);
  for (const chunk of chunks) {
    assert.ok(Array.from(chunk.text.content).length <= 1900);
    assert.ok(chunk.text.content.length <= 1900, '노션 한도는 UTF-16 단위: 조각 길이 1,900 이하');
  }
  const decoded = LearningLog.decode(chunks.map((c) => c.text.content).join(''));
  sameJson(decoded, obj);
  // 이모지만 가득한 경우(코드 포인트로 세면 UTF-16 한도를 넘는 경우)도 조각마다 1,900 이하, 왕복 동일
  const emoji = { v: 1, i: { 'v:e': [1, 1, 0, '🍎'.repeat(3000)] }, b: [] };
  const emojiChunks = LearningLog.encode(emoji);
  assert.ok(emojiChunks.every((c) => c.text.content.length <= 1900 && !/[\uD800-\uDBFF]$/.test(c.text.content)));
  sameJson(LearningLog.decode(emojiChunks.map((c) => c.text.content).join('')), emoji);
});

test('5. decode: 빈 문자열 → 빈 v1, 깨진 JSON → null, v:2 → null', () => {
  const { LearningLog } = setup();
  sameJson(LearningLog.decode(''), { v: 1, i: {}, b: [] });
  assert.equal(LearningLog.decode('{깨짐'), null);
  assert.equal(LearningLog.decode('{"v":2,"i":{}}'), null);
});

test('6. attempt: 잘못된 키·관리자·모르는 이름·빈 과목 → false, 정상 → true, 중복 키 및 first 시각', () => {
  const { LearningLog, storage } = setup();
  assert.equal(LearningLog.attempt({ child: '민수', subject: '단어', key: 'xyz', firstTry: true }), false);
  assert.equal(LearningLog.attempt({ child: '민수', subject: '단어', key: `v:${'a'.repeat(70)}`, firstTry: true }), false);
  assert.equal(LearningLog.attempt({ child: '민수', subject: '단어', key: 'v:가 나', firstTry: true }), false);
  assert.equal(LearningLog.attempt({ child: '부모관리자', subject: '단어', key: 'v:ok', firstTry: true }), false);
  assert.equal(LearningLog.attempt({ child: '모르는아이', subject: '단어', key: 'v:ok', firstTry: true }), false);
  assert.equal(LearningLog.attempt({ child: '민수', subject: '', key: 'v:ok', firstTry: true }), false);

  assert.equal(LearningLog.attempt({ child: '민수', subject: '단어', key: 'v:apple', firstTry: true, hinted: false, picks: [] }), true);
  assert.equal(LearningLog.attempt({ child: '민수', subject: '단어', key: 'v:apple', firstTry: false, hinted: true, picks: ['오답'] }), true);
  assert.equal(LearningLog.pending().items, 1);

  const saved = JSON.parse(storage.getItem(QUEUE_KEY));
  const first = findProp(saved, 'first');
  assert.ok(first !== undefined && first !== null && first !== '');
});

test('7. flush 칸 없음: 문항기록 컬럼 없으면 POST/PATCH 0건, 대기열 유지', async () => {
  const { LearningLog, calls } = setup({ hasColumn: false });
  LearningLog.attempt({ child: '민수', subject: '단어', key: 'v:apple', firstTry: true, hinted: false, picks: [] });

  await LearningLog.flush();

  const writes = calls.filter((c) => c.method === 'PATCH' || (c.method === 'POST' && c.url.includes('/v1/pages')));
  assert.equal(writes.length, 0);
  assert.equal(LearningLog.pending().items, 1);
});

test('8. flush 칸 있음·행 있음: PATCH 1건, body.properties 키 정확히 문항기록, 시도 수 맞음, 대기열 비움', async () => {
  const { LearningLog, calls, getPage } = setup({ hasColumn: true });
  LearningLog.attempt({ child: '민수', subject: '단어', key: 'v:apple', firstTry: true, hinted: false, picks: [] });
  LearningLog.attempt({ child: '민수', subject: '단어', key: 'v:apple', firstTry: false, hinted: true, picks: ['pear'] });

  await LearningLog.flush();

  const patches = calls.filter((c) => c.method === 'PATCH');
  assert.equal(patches.length, 1);
  sameJson(Object.keys(patches[0].body.properties), ['문항기록']);
  const storedLog = readPageLog(LearningLog, getPage());
  assert.equal(storedLog.i['v:apple'][0], 2);
  assert.equal(LearningLog.pending().items, 0);
});

test('9. flush 행 없음: POST /v1/pages로 일지 행 생성(입장 = 첫 시도 시각) 후 PATCH', async () => {
  const { LearningLog, calls } = setup({ hasColumn: true, initialPage: null });
  LearningLog.attempt({ child: '민서', subject: '수학', key: 'm:add1', firstTry: true, hinted: false, picks: [] });

  await LearningLog.flush();

  const creates = calls.filter((c) => c.method === 'POST' && c.url.includes('/v1/pages'));
  const patches = calls.filter((c) => c.method === 'PATCH');
  assert.equal(creates.length, 1);
  assert.ok('입장' in creates[0].body.properties);
  assert.equal(patches.length, 1);
  assert.equal(LearningLog.pending().items, 0);
});

test('10. 실패 후 재전송 중복 없음: 첫 PATCH 500 → 대기열 유지 → 두 번째 flush 같은 배치 ID로 성공, 시도 1회만', async () => {
  let attemptCount = 0;
  const { LearningLog, calls, getPage } = setup({
    onPatch: () => {
      attemptCount += 1;
      if (attemptCount === 1) return { ok: false, status: 500, json: async () => ({}) };
      return null;
    },
  });
  LearningLog.attempt({ child: '민수', subject: '단어', key: 'v:apple', firstTry: true, hinted: false, picks: [] });

  await LearningLog.flush();
  assert.equal(LearningLog.pending().items, 1);

  await LearningLog.flush();
  assert.equal(LearningLog.pending().items, 0);

  const patches = calls.filter((c) => c.method === 'PATCH');
  assert.equal(patches.length, 2);
  const firstBatch = LearningLog.decode(patches[0].body.properties['문항기록'].rich_text.map((t) => t.text.content).join('')).b;
  const secondBatch = LearningLog.decode(patches[1].body.properties['문항기록'].rich_text.map((t) => t.text.content).join('')).b;
  sameJson(firstBatch, secondBatch);
  assert.equal(readPageLog(LearningLog, getPage()).i['v:apple'][0], 1);
});

test('11. 보내는 중 attempt: PATCH 응답 늦추는 동안 attempt 한 번 더 → 성공 뒤 pending().items === 1', async () => {
  let resolvePatch;
  const { LearningLog } = setup({
    onPatch: () => new Promise((resolve) => { resolvePatch = resolve; }),
  });
  LearningLog.attempt({ child: '민수', subject: '단어', key: 'v:q1', firstTry: true, hinted: false, picks: [] });

  const flushing = LearningLog.flush();
  await new Promise((r) => setTimeout(r, 10));
  LearningLog.attempt({ child: '민수', subject: '단어', key: 'v:q2', firstTry: true, hinted: false, picks: [] });

  resolvePatch({ ok: true, status: 200, json: async () => ({}) });
  await flushing;

  assert.equal(LearningLog.pending().items, 1);
});

test('12. decode null 행: page 문항기록이 깨진 JSON → PATCH 0건, 대기열 유지', async () => {
  const { LearningLog, calls } = setup({
    initialPage: { id: 'page_1', properties: { '문항기록': { rich_text: [{ plain_text: '{깨짐' }] } } },
  });
  LearningLog.attempt({ child: '민수', subject: '단어', key: 'v:apple', firstTry: true, hinted: false, picks: [] });

  await LearningLog.flush();

  assert.equal(calls.filter((c) => c.method === 'PATCH').length, 0);
  assert.equal(LearningLog.pending().items, 1);
});

test('13. 5번 연속 실패하면 그 열람에서 더 보내지 않음(6번째 flush에서 PATCH 호출 수 그대로)', async () => {
  const { LearningLog, calls } = setup({
    onPatch: () => ({ ok: false, status: 500, json: async () => ({}) }),
  });
  LearningLog.attempt({ child: '민수', subject: '단어', key: 'v:apple', firstTry: true, hinted: false, picks: [] });

  for (let n = 0; n < 5; n += 1) {
    await LearningLog.flush();
  }
  const patchCountAfter5 = calls.filter((c) => c.method === 'PATCH').length;
  assert.equal(patchCountAfter5, 5);

  await LearningLog.flush();
  assert.equal(calls.filter((c) => c.method === 'PATCH').length, patchCountAfter5);
});

test('14. 보내는 중에 다시 flush()를 부르면 지금 회차 뒤 한 번 더 돌아 그사이 시도도 보낸다', async () => {
  let resolvePatch, patches = 0;
  const { LearningLog, getPage } = setup({
    onPatch: () => (++patches === 1 ? new Promise((resolve) => { resolvePatch = resolve; }) : undefined),
  });
  LearningLog.attempt({ child: '민수', subject: '영어', key: 'v:q1', firstTry: true, hinted: false, picks: [] });
  const first = LearningLog.flush();
  await new Promise((r) => setTimeout(r, 10));
  LearningLog.attempt({ child: '민수', subject: '영어', key: 'v:q2', firstTry: false, hinted: false, picks: ['x'] });
  const second = LearningLog.flush(); // 레슨 끝처럼 보내는 중에 다시 부름
  resolvePatch({ ok: true, status: 200, json: async () => ({}) });
  await first; await second;
  assert.equal(LearningLog.pending().items, 0, '그사이 들어온 시도도 보냈다');
  assert.equal(patches, 2);
  const saved = readPageLog(LearningLog, getPage());
  sameJson(Object.keys(saved.i).sort(), ['v:q1', 'v:q2']);
});
