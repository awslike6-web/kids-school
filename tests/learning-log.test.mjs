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

test('15. keyFor: page_id는 하이픈 뺀 소문자 32자리, 그 밖의 ID는 안전한 글자만, 문항 번호는 ":"로 잇고 형식 밖은 null', () => {
  const { LearningLog: L } = setup();
  assert.equal(L.keyFor('c', '3F2A2711-5B68-8115-9A24-C330B4BF008D'), 'c:3f2a27115b6881159a24c330b4bf008d');
  assert.equal(L.keyFor('r', '3f2a27115b6881159a24c330b4bf008d', 2), 'r:3f2a27115b6881159a24c330b4bf008d:2');
  assert.equal(L.keyFor('r', 'mini u2/1', 0), 'r:mini_u2_1:0');
  assert.equal(L.keyFor('r', 'center_38', '1'), 'r:center_38:1');
  assert.equal(L.keyFor('C', 'x'), null);
  assert.equal(L.keyFor('cc', 'x'), null);
  assert.equal(L.keyFor('r', ''), null);
  assert.equal(L.keyFor('r', null), null);
  assert.equal(L.keyFor('r', 'a'.repeat(70)), null);
});

test('16. currentChild: 아이 이름·currentUser로 판정하고 부모 시뮬레이터·알 수 없음은 null', () => {
  const cases = [
    [{ currentUserName: '민서' }, '민서'], [{ currentUserName: '민수' }, '민수'],
    [{ currentUserName: '아빠', currentUser: 'son' }, null], [{ currentUser: 'daughter' }, '민서'],
    [{ currentUser: 'son' }, '민수'], [{}, null],
  ];
  for (const [values, expected] of cases) {
    const { LearningLog, storage } = setup();
    storage.removeItem('currentUserName');
    for (const [k, v] of Object.entries(values)) storage.setItem(k, v);
    assert.equal(LearningLog.currentChild(), expected, JSON.stringify(values));
  }
});

test('17. question 도우미: 틀림·힌트·고른 오답을 모아 done() 한 번만 기록, 바로 맞히면 첫 시도', () => {
  const { LearningLog, storage } = setup();
  storage.setItem('currentUserName', '민서');
  const q1 = LearningLog.question({ subject: '국어', key: 'r:p1:0' });
  q1.wrong('나'); q1.hint(); q1.wrong('');
  assert.equal(q1.done(), true);
  assert.equal(q1.done(), false, '두 번 불러도 한 번만');
  const q2 = LearningLog.question({ subject: '국어', key: 'r:p1:1' });
  q2.done();
  const queue = JSON.parse(storage.getItem(QUEUE_KEY));
  const entry = Object.values(queue)[0];
  assert.equal(entry.child, '민서');
  sameJson(entry.pending, { 'r:p1:0': [1, 1, 1, ['나']], 'r:p1:1': [1, 0, 0, []] });
  assert.equal(LearningLog.question({ subject: '국어', key: null }).done(), false, '키가 없으면 기록하지 않음');
});

test('18. 행 만들기 응답에 page id가 없으면 PATCH하지 않고 실패로 남긴다 (대기열 보존)', async () => {
  const storage = createStorage();
  const calls = [];
  const mockFetch = async (url, options = {}) => {
    const method = (options.method || 'GET').toUpperCase();
    calls.push(`${method} ${url.replace(/^https?:\/\/[^/]+/, '').split('?')[0]}`);
    if (method === 'GET' && url.includes('/v1/databases/')) return { ok: true, status: 200, json: async () => ({ properties: { '문항기록': {} } }) };
    if (url.includes('/query')) return { ok: true, status: 200, json: async () => ({ results: [] }) };
    if (method === 'POST' && url.includes('/v1/pages')) return { ok: true, status: 200, json: async () => ({ blocked: true }) }; // id 없음
    return { ok: true, status: 200, json: async () => ({}) };
  };
  const { sandbox } = loadBrowserScripts(['kids/core/study-log-store.js', 'kids/core/learning-log.js'], { fetch: mockFetch, storage });
  const L = sandbox.LearningLog;
  L.attempt({ child: '민수', subject: '영어', key: 'v:q1', firstTry: true, hinted: false, picks: [] });
  const result = await L.flush();
  assert.equal(result.failed, 1);
  assert.equal(calls.filter((c) => c.startsWith('PATCH')).length, 0, 'id 없는 페이지에 PATCH하지 않는다');
  assert.equal(L.pending().items, 1, '대기열 보존');
});

test('19. itemTracker: 같은 목록·번호면 같은 도우미(끝나도 다시 기록 안 함), 새 목록이면 새로, page_id 없으면 null, key 우선', () => {
  const { LearningLog: L, storage } = setup();
  storage.setItem('currentUserName', '민수');
  const list = [{ pageId: 'aaaa' }, { word: '로컬' }];
  const t1 = L.itemTracker({ prefix: 'v', subject: '영어', list, idx: 0 });
  assert.equal(L.itemTracker({ prefix: 'v', subject: '영어', list, idx: 0 }), t1);
  t1.wrong('x'); t1.done();
  assert.equal(L.itemTracker({ prefix: 'v', subject: '영어', list, idx: 0 }).done(), false, '정답 처리가 두 번 불려도 한 번만');
  assert.equal(L.itemTracker({ prefix: 'v', subject: '영어', list, idx: 1 }), null);
  const fresh = L.itemTracker({ prefix: 'v', subject: '영어', list: [{ pageId: 'aaaa' }], idx: 0 });
  assert.notEqual(fresh, t1, '새 미션(새 목록)은 새 도우미');
  fresh.done();
  const g = L.itemTracker({ subject: '수학', list: [{}], idx: 0, key: 'g:vm-add-2x1-carry' });
  g.wrong('12'); assert.equal(g.skip(), true, '틀린 뒤 건너뛰기 = 기록');
  const q = L.itemTracker({ subject: '수학', list: [{}], idx: 0, key: 'g:gugu-7x8' });
  assert.equal(q.skip(), false, '답 없이 건너뛰기 = 기록 없음');
  const entry = Object.values(JSON.parse(storage.getItem(QUEUE_KEY))).find((e) => e.subject === '영어');
  sameJson(entry.pending, { 'v:aaaa': [2, 1, 0, ['x']] });
  const math = Object.values(JSON.parse(storage.getItem(QUEUE_KEY))).find((e) => e.subject === '수학');
  sameJson(math.pending, { 'g:vm-add-2x1-carry': [1, 1, 0, ['12']] });
});

test('20. itemTracker session·itemSkip: 같은 배열이라도 회차가 다르면 새로, 공용 건너뛰기는 열린 도우미만 skip, 범위 밖은 null', () => {
  const { LearningLog: L, storage } = setup();
  storage.setItem('currentUserName', '민서');
  const list = [{ pageId: 'bbbb' }];
  const s1 = {}, s2 = {};
  const a = L.itemTracker({ prefix: 'c', subject: '과학', list, idx: 0, session: s1 });
  a.wrong('x');
  assert.equal(L.itemSkip(s1, 0), true, '틀린 뒤 공용 건너뛰기 = 기록');
  assert.equal(L.itemSkip(s1, 3), false, '열린 도우미 없으면 아무것도 안 함');
  const b = L.itemTracker({ prefix: 'c', subject: '과학', list, idx: 0, session: s2 });
  assert.notEqual(b, a);
  b.done();
  assert.equal(L.itemTracker({ prefix: 'c', subject: '과학', list, idx: 5 }), null, '범위 밖 번호');
  a.wrong('늦게 온 호출'); // 끝난 도우미에 늦게 온 호출은 무시
  const entry = Object.values(JSON.parse(storage.getItem(QUEUE_KEY)))[0];
  sameJson(entry.pending, { 'c:bbbb': [2, 1, 0, ['x']] });
});

test('21. itemTracker: pageId가 없으면 노션 page_id 모양의 id를 쓰고, 로컬 id(voca_1)는 기록하지 않는다', () => {
  const { LearningLog: L } = setup();
  const list = [{ id: '37ca2711-5b68-8098-ab72-cde5a75c7575' }, { id: 'voca_1' }];
  assert.ok(L.itemTracker({ prefix: 'v', subject: '영어', list, idx: 0 }));
  assert.equal(L.itemTracker({ prefix: 'v', subject: '영어', list, idx: 1 }), null);
});
