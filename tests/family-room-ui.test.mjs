import test from 'node:test';
import assert from 'node:assert/strict';
import { browser, snapshot, players, CLIENT, OTHER, plain, turns } from './family-browser.mjs';
const session = JSON.stringify({ code: '4821', gameType: 'yacht', clientId: CLIENT });
function lobby(s = snapshot(), options = {}) {
  const b = browser({ search: '?room=4821', ...options }); b.boot(); b.find('코드 넣기').click();
  const ws = b.connect(s); return { ...b, ws };
}
const input = b => b.$('roomView').querySelector('input');
test('세션 없는 기본 진입은 방 통신·기기 ID 저장 없이 기존 설정을 보인다', () => {
  const b = browser(); b.boot(); assert.equal(b.requests.length, 0); assert.equal(b.sockets.length, 0);
  assert.equal(b.store.has('familyRoomClientId'), false); assert.equal(b.$('roomView').hidden, true);
  assert.equal(b.$('playerSetup').children.length, 2);
});
test('유효한 링크 코드는 로컬 이어하기보다 먼저, 잘못된 코드는 무시한다', () => {
  const source = browser(), saved = source.context.YachtEngine.createGame(players());
  for (const [search, expected] of [['?room=4821', 'roomView'], ['?room=0000', 'resumeView']]) {
    const b = browser({ search, storage: { familyYachtGame: JSON.stringify(saved) } }); b.boot();
    assert.equal(b.$(expected).hidden, false); assert.equal(b.store.has('familyYachtGame'), true);
    assert.equal(b.sockets.length, 0);
  }
});
test('같은 게임 세션은 자동 복구, 초기 자리 자동 전송 없이 탈출 가능', () => {
  const b = browser({ storage: { familyRoomSession: session } }); b.boot();
  assert.equal(b.sockets.length, 1); assert.match(b.$('roomStatus').textContent, /연결 중/);
  const ws = b.connect(snapshot({ seats: [] })); assert.equal(ws.actions().length, 0);
  const c = browser({ storage: { familyRoomSession: session } }); c.boot(); c.find('처음 화면으로').click();
  c.tick(60000); assert.equal(c.sockets.length, 1); assert.equal(c.$('setupView').hidden, false);
});
for (const code of [4403, 4404]) test(`복구 중 ${code}는 세션 제거 후 기존 이어하기로 조용히 복귀`, () => {
  const source = browser(), saved = source.context.YachtEngine.createGame(players());
  const b = browser({ storage: { familyRoomSession: session, familyYachtGame: JSON.stringify(saved) } }); b.boot();
  b.sockets[0].end(code); assert.equal(b.store.has('familyRoomSession'), false);
  assert.equal(b.$('resumeView').hidden, false); assert.equal(b.$('roomStatus').hidden, true);
});
test('새 입장은 다른 확정 자리와 다른 이름·말 하나만 자동 전송한다', () => {
  const s = snapshot({ seats: [{ ...players()[0], owner: OTHER }] }), b = lobby(s);
  assert.deepEqual(b.ws.actions()[0], { type: 'seats', seats: [{ name: '민수', avatar: { type: 'emoji', value: '🐻' }, assist: 'tactic' }] });
  b.ws.message({ ...s, room: { ...s.room, rev: 1 } }); assert.equal(b.ws.actions().length, 1);
});
test('2자리 미만이면 시작을 끄고 이유를 표시, 확정 뒤 서버 순서/ID와 baseRev로 시작', () => {
  const b = lobby(snapshot({ seats: [{ ...players()[0], owner: CLIENT }] }));
  assert.equal(b.find('게임 시작').disabled, true); assert.match(b.$('roomView').textContent, /두 자리 이상/);
  b.ws.message(snapshot({ rev: 3 })); b.find('게임 시작').click();
  const sent = b.ws.actions().at(-1); assert.equal(sent.type, 'start'); assert.equal(sent.baseRev, 3);
  assert.deepEqual(sent.state.players.map(p => p.id), ['p1', 'p2']);
});
test('이름 400ms 지연·최신 초안 하나만 보존하고 잠금 해제 뒤 전송', () => {
  const b = lobby(), field = input(b); field.focus(); field.value = '아'; field.fire('input');
  b.tick(399); assert.equal(b.ws.actions().length, 0); field.value = '아빠'; field.fire('input');
  b.tick(399); assert.equal(b.ws.actions().length, 0); b.tick(1);
  assert.equal(b.ws.actions()[0].seats[0].name, '아빠');
  field.value = '엄마'; field.fire('input'); b.tick(400);
  field.value = '이모'; field.fire('input'); b.tick(400); assert.equal(b.ws.actions().length, 1);
  const s = snapshot({ rev: 1 }); s.seats[0].name = '아빠'; b.ws.message(s);
  assert.equal(b.ws.actions().length, 2); assert.equal(b.ws.actions()[1].seats[0].name, '이모');
  assert.equal(input(b), field); assert.equal(field.value, '이모');
});
test('빠른 이름·말·도움 변경은 즉시 전송하고 거절 뒤 확정 자리로 복원', () => {
  const b = lobby(); b.find('아빠', b.$('roomView')).click();
  assert.equal(b.ws.actions()[0].seats[0].assist, 'classic');
  b.ws.message({ type: 'rejected', reason: '거절' }); b.ws.message(snapshot());
  assert.equal(input(b).value, '민서');
  const select = b.$('roomView').querySelector('select'); select.value = 'classic'; select.fire('change');
  assert.equal(b.ws.actions()[1].seats[0].assist, 'classic');
});
test('다른 기기의 자리 변경은 이름 포커스 중 재렌더하지 않고 blur 뒤 말 버튼을 갱신', () => {
  const b = lobby(), field = input(b); field.focus();
  const s = snapshot({ rev: 1 }); s.seats[1].avatar.value = '🦊'; b.ws.message(s);
  assert.equal(input(b), field);
  b.$('soundToggle').focus(); b.tick(0); assert.notEqual(input(b), field);
  const fox = b.$('roomView').querySelectorAll('button').find(n => n.getAttribute('aria-label') === '🦊 말');
  assert.equal(fox.disabled, true);
});
test('이 기기 설정 하나로 여러 자리·구경, 구경 뒤 snapshot에도 자동 착석하지 않는다', () => {
  const b = lobby(); b.find('+ 이 기기에서 한 명 더').click();
  assert.equal(b.ws.actions()[0].seats.length, 2);
  const s = snapshot({ rev: 1 }); s.seats.push({ ...b.ws.actions()[0].seats[1], id: 'p3', owner: CLIENT }); b.ws.message(s);
  assert.equal(b.$('roomView').querySelectorAll('input').length, 2);
  b.find('구경만 하기').click(); assert.deepEqual(b.ws.actions().at(-1).seats, []);
  const watched = snapshot({ rev: 2, seats: [{ ...players()[1], id: 'p1', owner: OTHER }] }); b.ws.message(watched);
  const count = b.ws.actions().length; b.ws.message(watched); assert.equal(b.ws.actions().length, count);
});
test('처음 입장에 구경을 선택해 잠금 중에도 최신 빈 초안을 보낸다', () => {
  const b = lobby(snapshot({ seats: [] })); assert.equal(b.ws.actions().length, 1);
  b.find('구경만 하기').click();
  b.ws.message(snapshot({ rev: 1, seats: [{ ...players()[0], owner: CLIENT }] }));
  assert.deepEqual(b.ws.actions().at(-1).seats, []);
});
test('방장 내보내기·대기실 claim을 전송하고 구경 링크는 코드만 공유한다', async () => {
  const s = snapshot(); s.members[1].online = false; const b = lobby(s);
  b.find('민수 내가 대신 하기').click(); assert.equal(b.ws.actions()[0].type, 'claim');
  const claimed = snapshot(); claimed.seats[1].owner = CLIENT; b.ws.message(claimed);
  b.find('내보내기').click(); assert.equal(b.ws.actions().at(-1).client, OTHER);
  b.ws.message(snapshot({ rev: 1 })); b.find('링크 보내기').click(); await turns();
  assert.match(b.context.copied, /room=4821/); assert.ok(!b.context.copied.includes('client'));
});
test('방 생성 실패는 에러 소리 없이 원래 첫 화면과 한 기기 안내를 보인다', async () => {
  const b = browser({ fetch: async () => ({ ok: false, status: 503 }) }); b.boot();
  b.$('multipleDevices').click(); b.find('방 만들기').click(); await turns();
  assert.equal(b.$('setupView').hidden, false); assert.match(b.$('roomStatus').textContent, /지금은 여러 기기로 할 수 없어요/);
  assert.equal(b.speech.length, 0);
});
test('기본 자리 순서·외부 말 점유·시작 이유 판단은 순수 함수로 검사한다', () => {
  const b = browser(), U = b.context.FamilyRoomUI;
  const first = U.initialSeat(snapshot().seats); assert.equal(first.name, '아빠'); assert.equal(first.avatar.value, '🦊');
  assert.equal(U.startReason(snapshot({ seats: [] }), false, false), '게임을 시작하려면 두 자리 이상 필요해요.');
  assert.equal(U.usableAvatar({ type: 'gallery', value: { artId: 'a', charKey: 'main', name: '말', spriteUrl: 'javascript:bad' } }), false);
  assert.equal(U.validDrafts(plain(players())), true);
});

test('같은 페이지에서 구경 후 수동 재입장해도 자동으로 앉히지 않는다', () => {
  const b = lobby(); b.find('구경만 하기').click();
  const watched = snapshot({ rev: 1, seats: [{ ...players()[1], id: 'p1', owner: OTHER }] }); b.ws.message(watched);
  b.find('방 나가기').click(); b.$('multipleDevices').click();
  const field = b.$('roomView').querySelector('input'); field.value = '4821'; field.fire('input');
  b.find('코드 넣기').click(); const ws = b.connect(watched); assert.equal(ws.actions().length, 0);
});
