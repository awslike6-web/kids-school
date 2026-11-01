import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { browser, snapshot, CLIENT, OTHER, plain, read, turns } from './family-browser.mjs';

function connected(options = {}) {
  const b = browser(options), statuses = [], received = [], rejections = [];
  const room = b.context.FamilyRoom.create({ gameType: 'yacht', onStatus: s => statuses.push(plain(s)),
    onSnapshot: (s, p, meta) => received.push({ s, p, meta }), onRejected: r => rejections.push(r) });
  room.join('4821'); const ws = b.connect();
  return { ...b, room, ws, statuses, received, rejections };
}
test('통신 모듈 로드는 DOM·저장소를 건드리지 않고 전역 하나만 공개한다', () => {
  const c = {}; c.window = c;
  for (const key of ['document', 'localStorage']) Object.defineProperty(c, key, { get: () => { throw Error(key); } });
  vm.runInNewContext(read('family-room.js'), c);
  assert.deepEqual(Object.keys(c).sort(), ['FamilyRoom', 'window']);
});
test('첫 snapshot 전에는 open이어도 잠금·5초 첫 판 시한', () => {
  const b = browser(), statuses = [], r = b.context.FamilyRoom.create({ gameType: 'yacht', onStatus: s => statuses.push(s) });
  r.join('4821'); b.sockets[0].open(); assert.equal(r.getStatus().locked, true);
  b.tick(4999); assert.equal(r.getStatus().state, 'connecting'); b.tick(1);
  assert.equal(r.getStatus().reason, 'unavailable'); assert.equal(b.sockets.length, 1);
});
test('act·start는 최신 room.rev를 쓰고 잠금·5초 뒤 재접속하며 재전송하지 않는다', () => {
  const b = connected(); b.ws.message(snapshot({ rev: 9 }));
  assert.equal(b.room.submit({ stateVersion: 0 }), true); assert.equal(b.room.submit({}), false);
  assert.equal(b.ws.actions()[0].baseRev, 9); assert.equal(b.room.getStatus().locked, true);
  b.tick(5000); assert.equal(b.room.getStatus().state, 'reconnecting'); b.tick(1000);
  const next = b.connect(snapshot({ rev: 10 })); assert.equal(next.actions().length, 0);
  assert.equal(b.room.start({ stateVersion: 0 }), true); assert.equal(next.actions()[0].baseRev, 10);
});
test('같은 rev의 접속 알림은 act 잠금을 풀지 않고 rejected 뒤 snapshot이 푼다', () => {
  const b = connected(); b.room.submit({}); b.ws.message(snapshot());
  assert.equal(b.room.getStatus().locked, true);
  b.ws.message({ type: 'rejected', reason: '판이 바뀌었어요.' }); assert.equal(b.room.getStatus().locked, true);
  b.ws.message(snapshot()); assert.equal(b.room.getStatus().locked, false); assert.equal(b.rejections.length, 1);
  assert.equal(b.ws.actions().length, 1);
});
test('claim의 같은 rev 소유권 확정도 잠금을 푼다', () => {
  const b = connected(); b.room.claim('p2'); const s = snapshot(); s.seats[1].owner = CLIENT;
  b.ws.message(s); assert.equal(b.room.getStatus().locked, false);
  assert.equal(b.received.at(-1).s.seats[1].owner, CLIENT);
});
test('재접속 간격은 1·2·4·8·15·15초이고 snapshot 이후 초기화한다', () => {
  const b = connected(); let ws = b.ws;
  for (const delay of [1000, 2000, 4000, 8000, 15000, 15000]) {
    ws.end(); const length = b.sockets.length;
    b.tick(delay - 1); assert.equal(b.sockets.length, length); b.tick(1);
    assert.equal(b.sockets.length, length + 1); ws = b.sockets.at(-1);
  }
  ws.open(); ws.message(snapshot()); ws.end(); b.tick(1000); assert.equal(b.sockets.length, 8);
});
test('즉시 재접속으로 교체한 옛 소켓의 모든 늦은 이벤트를 무시한다', () => {
  const b = connected(), old = b.ws; old.end(1006); b.room.reconnect(); const next = b.connect();
  old.onopen({}); old.message('잘못된 JSON'); old.onerror({}); old.end(4409);
  assert.equal(b.room.getStatus().state, 'connected'); assert.equal(b.sockets.at(-1), next);
  b.tick(25000); assert.deepEqual(next.sent, ['ping']);
});
test('화면 복귀 때 멀쩡한 연결은 끊지 않고 심박으로 확인하며 응답이 없을 때만 재접속한다', () => {
  const b = connected(), count = b.sockets.length;
  b.room.reconnect(); b.room.reconnect();
  assert.deepEqual(b.ws.sent, ['ping']); assert.equal(b.sockets.length, count);
  assert.equal(b.room.getStatus().locked, false);
  b.ws.message('pong'); b.tick(5000); assert.equal(b.room.getStatus().state, 'connected');
  b.room.reconnect(); b.tick(4999); assert.equal(b.room.getStatus().state, 'connected');
  b.tick(1); assert.equal(b.room.getStatus().state, 'reconnecting');
});
for (const [code, reason] of [[4400, 'invalid'], [4403, 'forbidden'], [4404, 'missing'], [4409, 'replaced']]) {
  test(`${code} 현재 소켓은 ${reason}으로 정지하고 자동/즉시 재접속하지 않는다`, () => {
    const b = connected(); b.ws.end(code); b.room.reconnect(); b.tick(60000);
    assert.equal(b.room.getStatus().reason, reason); assert.equal(b.sockets.length, 1);
    if ([4403, 4404].includes(code)) assert.equal(b.store.has('familyRoomSession'), false);
  });
}
test('25초 ping, pong은 JSON 처리·입력 응답과 분리하고 5초 유실이면 재접속', () => {
  const b = connected(); b.tick(25000); assert.equal(b.ws.sent.at(-1), 'ping');
  b.room.submit({}); b.ws.message('pong'); assert.equal(b.room.getStatus().locked, true);
  b.ws.message(snapshot({ rev: 1 })); b.tick(25000); b.tick(4999);
  assert.equal(b.room.getStatus().state, 'connected'); b.tick(1);
  assert.equal(b.room.getStatus().state, 'reconnecting');
});
test('저장 차단 시 메모리 기기 ID로 계속하고 잘못된 세션은 무시한다', () => {
  const b = connected({ blocked: true });
  assert.equal(b.context.FamilyRoom.getClientId(), CLIENT); assert.equal(b.room.getStatus().locked, false);
  assert.equal(b.context.FamilyRoom.readSession('yacht'), null);
  const c = browser({ storage: { familyRoomSession: '{' } }); assert.equal(c.context.FamilyRoom.readSession('yacht'), null);
});
test('서버 주소 재정의는 로컬에서만, 코드 형식과 세션 gameType을 검사한다', () => {
  const b = browser({ search: '?roomServer=http://127.0.0.1:8787' });
  assert.equal(b.context.FamilyRoom.serverURL(), 'http://127.0.0.1:8787');
  const c = browser({ hostname: 'awslike6-web.github.io', search: '?roomServer=http://localhost:8787' });
  assert.equal(c.context.FamilyRoom.serverURL(), 'https://family-room.awslike6.workers.dev');
  for (const bad of ['0000', '123', '12345', '１２３４', '12x4']) assert.equal(b.context.FamilyRoom.codeValid(bad), false);
  const s = { code: '4821', gameType: 'omok', clientId: CLIENT };
  b.store.set('familyRoomSession', JSON.stringify(s)); assert.equal(b.context.FamilyRoom.readSession('yacht'), null);
});
test('방 생성 HTTP 계약·503/429/네트워크 실패는 unavailable이며 재시도하지 않는다', async () => {
  for (const status of [503, 429, 0]) {
    const b = browser({ fetch: async () => { if (!status) throw Error('오프라인'); return { ok: false, status }; } });
    const r = b.context.FamilyRoom.create({ gameType: 'yacht' }); assert.equal(await r.createRoom(), false);
    assert.equal(r.getStatus().reason, 'unavailable'); b.tick(60000); assert.equal(b.requests.length, 1);
    assert.deepEqual(JSON.parse(b.requests[0][1].body), { gameType: 'yacht', maxSeats: 5, client: CLIENT });
  }
  const b = browser({ fetch: async () => ({ ok: true, json: async () => ({ code: '4821' }) }) });
  const r = b.context.FamilyRoom.create({ gameType: 'yacht' }); await r.createRoom();
  assert.match(b.sockets[0].url, /rooms\/4821\/ws\?client=/); b.connect();
  assert.deepEqual(JSON.parse(b.store.get('familyRoomSession')), { code: '4821', gameType: 'yacht', clientId: CLIENT });
});
test('나가기의 leave는 한 번 보내고 1000 종료 뒤에도 재접속하지 않는다', () => {
  const b = connected(); b.room.leave(); assert.deepEqual(b.ws.actions(), [{ type: 'leave' }]);
  b.ws.end(1000); b.room.reconnect(); b.tick(60000);
  assert.equal(b.sockets.length, 1); assert.equal(b.store.has('familyRoomSession'), false);
});
test('권한·넘겨받기 판단은 소유권과 접속 상태를 쓰고 rev와 무관하다', () => {
  const b = browser(), R = b.context.FamilyRoom, E = b.context.YachtEngine;
  const s = snapshot({ phase: 'playing', hostId: OTHER, state: E.createGame(snapshot().seats) });
  assert.equal(R.permissionsFor(s).turn, true); assert.equal(R.canClaim(s, 'p2'), false);
  s.members[1].online = false; assert.equal(R.canClaim(s, 'p2'), true);
  s.members[1].online = true; s.room.hostId = CLIENT; assert.equal(R.canClaim(s, 'p2'), true);
  s.seats[0].owner = OTHER; assert.equal(R.permissionsFor(s).seated, false);
});
test('복구 연결은 첫 판 실패에도 재시도하고 정지 후 늦은 방 생성 응답을 버린다', async () => {
  const b = browser(), r = b.context.FamilyRoom.create({ gameType: 'yacht' });
  r.join('4821', { recovering: true }); b.tick(5000); assert.equal(r.getStatus().state, 'reconnecting');
  b.tick(1000); assert.equal(b.sockets.length, 2); r.stop();
  let resolve; const c = browser({ fetch: () => new Promise(r => { resolve = r; }) });
  const room = c.context.FamilyRoom.create({ gameType: 'yacht' }); const promise = room.createRoom(); room.stop();
  resolve({ ok: true, json: async () => ({ code: '4821' }) }); await turns(); await promise;
  assert.equal(c.sockets.length, 0);
});

test('세션의 기기 ID를 복구하고 구조가 없는 JSON도 안전하게 정지한다', () => {
  const b = browser({ storage: { familyRoomSession: JSON.stringify({ code: '4821', gameType: 'yacht', clientId: OTHER }) } });
  assert.equal(b.context.FamilyRoom.getClientId(), OTHER);
  for (const frame of ['null', '[]', '42', '"snapshot"', '{']) {
    const c = connected(); c.ws.message(frame); assert.equal(c.room.getStatus().reason, 'invalid');
  }
});
