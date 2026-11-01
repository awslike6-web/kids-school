import test from 'node:test';
import assert from 'node:assert/strict';
import { browser, snapshot, players, CLIENT, OTHER, plain, read } from './family-browser.mjs';
const room = options => snapshot({ gameType: 'omok', maxSeats: 2, ...options });
function game({ mine = true, host = true, spectator = false, value, recovered = false, size = 9 } = {}) {
  const storage = recovered ? { familyRoomSession: JSON.stringify({ code: '4821', gameType: 'omok', clientId: CLIENT }) } : {};
  const b = browser({ game: 'omok', search: recovered ? '' : '?room=4821', storage }); b.boot();
  if (!recovered) b.find('코드 넣기').click();
  const E = b.context.OmokEngine, state = value || E.createGame(players(), size);
  const seats = players().map((p, i) => ({ ...p, owner: spectator ? OTHER : (i === 0) === mine ? CLIENT : OTHER }));
  const s = room({ phase: 'playing', state, seats, hostId: host ? CLIENT : OTHER });
  const ws = b.connect(s); return { ...b, ws, E, s };
}
const emit = (b, value, rev = b.s.room.rev + 1) => {
  b.s = { ...b.s, room: { ...b.s.room, rev }, state: value }; b.ws.message(b.s);
};
const cell = (b, x, y) => b.$('board').children[y * b.s.state.publicBoard.size + x];
// 흑이 (0~4, 0)을 이어 이기는 판. 백은 (0~3, 1)에 둡니다.
function winning(E, state = E.createGame(players(), 9)) {
  for (let x = 0; x < 4; x++) state = E.place(E.place(state, x, 0), x, 1);
  return E.place(state, 4, 0);
}

test('응답 전 판·로컬 저장을 바꾸지 않고 착수를 한 번만 전송한다', () => {
  const b = game(); cell(b, 2, 2).click();
  assert.equal(b.ws.actions().length, 0);
  assert.equal(b.$('confirmPlace').disabled, false);
  b.$('confirmPlace').click(); b.$('confirmPlace').fire('click');
  assert.equal(b.ws.actions().length, 1); assert.equal(b.ws.actions()[0].type, 'act');
  assert.equal(b.s.state.publicBoard.moves.length, 0); assert.equal(b.store.has('familyOmokGame'), false);
  emit(b, b.ws.actions()[0].state);
  assert.match(cell(b, 2, 2).children[0].className, /stone black/);
  assert.equal(b.$('confirmPlace').disabled, true);
});

test('남의 차례는 판을 잠그고 도움 표시를 보이지 않는다', () => {
  const b = game({ mine: false }); let state = b.s.state;
  for (let x = 0; x < 4; x++) { state = b.E.place(state, x, 0); if (x < 3) state = b.E.place(state, x, 1); }
  // 민서(흑)에게 이기는 자리가 있어도 민수 기기에는 민서의 차례 도움이 보이지 않습니다.
  state = b.E.place(state, 3, 1); emit(b, state);
  assert.equal(b.$('turnBanner').textContent, '⚫ 민서 차례예요. 기다려요');
  assert.equal(b.$('helpText').textContent, ''); assert.equal(b.$('assistLabel').textContent, '9줄');
  assert.equal(b.$('board').querySelectorAll('.hint').length, 0);
  assert.ok(b.$('board').children.every(n => n.disabled));
  cell(b, 8, 8).fire('click'); b.$('confirmPlace').fire('click'); assert.equal(b.ws.actions().length, 0);
});

test('내 차례의 도움 표시는 내 기기에 보인다', () => {
  const b = game(); let state = b.s.state;
  for (let x = 0; x < 4; x++) state = b.E.place(b.E.place(state, x, 0), x, 1);
  emit(b, state);
  assert.equal(b.$('helpText').textContent, '초록 표시: 여기에 두면 이겨요!');
  assert.ok(b.$('board').querySelectorAll('.hint').length > 0);
});

test('무르기는 마지막 착수자의 기기에서만 켜지고 응답으로 그린다', () => {
  for (const mine of [true, false]) {
    const b = game({ mine }); emit(b, b.E.place(b.s.state, 3, 3));
    const undo = b.$('playersStatus').children[0].querySelector('button');
    assert.equal(undo.disabled, !mine);
    undo.fire('click');
    if (!mine) { assert.equal(b.ws.actions().length, 0); continue; }
    assert.equal(b.ws.actions()[0].state.lastAction.type, 'UNDO');
    assert.equal(b.s.state.publicBoard.moves.length, 1);
    emit(b, b.ws.actions()[0].state); assert.equal(b.$('turnBanner').textContent, '⚫ 민서 차례!');
    assert.equal(b.speech.length, 0);
  }
});

test('미리보기는 보내지 않고, 판이 그대로인 접속 알림에는 남고 판이 바뀌면 지운다', () => {
  const b = game(); cell(b, 4, 4).click();
  const s = plain(b.s); s.members[1].online = false; b.ws.message(s);
  assert.equal(cell(b, 4, 4).getAttribute('aria-pressed'), 'true');
  assert.equal(b.ws.actions().length, 0);
  emit(b, b.E.place(b.s.state, 0, 0));
  assert.equal(b.$('board').querySelectorAll('.preview').length, 0);
});

test('접속 알림으로 다시 그려도 고르던 교차점의 포커스를 지킨다', () => {
  const b = game(); cell(b, 4, 4).click(); const before = cell(b, 4, 4).focusCount || 0;
  assert.ok(before >= 1);
  b.ws.message(plain(b.s));
  assert.equal(b.context.document.activeElement, cell(b, 4, 4));
});

test('다시 하기는 흑백을 바꾸어도 자리 주인으로 차례를 판단한다', () => {
  const b = game(), ended = winning(b.E); emit(b, ended, 9);
  assert.equal(b.$('endView').hidden, false); assert.equal(b.$('roomActions').hidden, true);
  assert.equal(b.$('backToSetup').textContent, '대기실로');
  b.$('playAgain').click();
  const sent = b.ws.actions().at(-1); assert.equal(sent.type, 'act'); assert.equal(sent.baseRev, 9);
  assert.equal(sent.state.lastAction.type, 'REMATCH'); assert.equal(sent.state.publicBoard.size, 9);
  emit(b, sent.state);
  assert.equal(b.$('roomStatus').hidden, true);
  // 민수(p2, 다른 기기)가 이제 흑입니다.
  assert.equal(b.$('turnBanner').textContent, '⚫ 민수 차례예요. 기다려요');
  assert.ok(b.$('board').children.every(n => n.disabled));
  const c = game({ mine: false }), over = winning(c.E); emit(c, over); c.speech.length = 0;
  emit(c, c.E.rematch(over));
  assert.deepEqual(c.speech.map(s => s.text), ['민수 흑돌로 먼저 두어요!']);
  assert.equal(c.$('board').children.some(n => !n.disabled), true);
  const d = game({ spectator: true }); emit(d, winning(d.E)); assert.equal(d.$('playAgain').disabled, true);
  d.$('playAgain').fire('click'); assert.equal(d.ws.actions().length, 0);
});

test('차례 안내는 차례가 된 기기만 한 번, 입장·같은 판 재수신은 조용하다', () => {
  const b = game(), c = game({ mine: false });
  assert.equal(b.speech.length, 0); assert.equal(c.speech.length, 0);
  const placed = b.E.place(b.s.state, 1, 1);
  emit(b, placed); emit(c, placed);
  assert.equal(b.speech.length, 0); assert.deepEqual(c.speech.map(s => s.text), ['민수 차례예요!']);
  c.ws.message(c.s); assert.equal(c.speech.length, 1);
  const e = game({ recovered: true, value: placed, mine: false }); assert.equal(e.speech.length, 0);
  assert.equal(e.$('turnBanner').focusCount || 0, 0);
});

test('승부 음성은 방장만, 보상은 자리가 있는 기기만 한 번 낸다', () => {
  for (const config of [{ mine: true, host: true }, { mine: true, host: false }, { host: true, spectator: true }]) {
    const b = game(config), ended = winning(b.E); emit(b, ended);
    assert.deepEqual(b.speech.map(s => s.text), config.host ? ['민서, 이겼어요!'] : ['reward']);
    const speech = b.speech[0]; speech.after?.(); speech.after?.(); b.ws.message(b.s);
    assert.equal(b.speech.filter(s => s.text === 'reward').length, config.spectator ? 0 : 1);
  }
  const c = game({ value: winning(game().E), recovered: true }); assert.equal(c.speech.length, 0);
  assert.equal(c.$('endView').hidden, false);
});

test('이어받은 끝난 판을 떠나면 늦은 보상을 내지 않는다', () => {
  const b = game(), ended = winning(b.E); emit(b, ended); const after = b.speech[0].after;
  b.ws.message(room({ rev: 20 })); after();
  assert.equal(b.speech.filter(s => s.text === 'reward').length, 0);
  assert.equal(b.$('roomView').hidden, false);
});

test('방장만 판 크기를 고르고 고른 크기로 시작한다', () => {
  const b = browser({ game: 'omok', search: '?room=4821' }); b.boot(); b.find('코드 넣기').click();
  const ws = b.connect(room({ seats: players().map((p, i) => ({ ...p, owner: i ? OTHER : CLIENT })) }));
  const picker = b.$('roomView').querySelector('.count-label').querySelector('select');
  assert.deepEqual(picker.children.map(n => n.value), ['9', '13', '15']); assert.equal(picker.value, '13');
  picker.value = '15'; picker.fire('change'); b.find('게임 시작').click();
  const start = ws.actions().find(a => a.type === 'start');
  assert.equal(start.state.publicBoard.size, 15); assert.equal(start.state.players[0].stone, 'black');
  const c = browser({ game: 'omok', search: '?room=4821' }); c.boot(); c.find('코드 넣기').click();
  c.connect(room({ hostId: OTHER, seats: players().map((p, i) => ({ ...p, owner: i ? CLIENT : OTHER })) }));
  assert.equal(c.$('roomView').querySelector('.count-label').hidden, true);
});

test('자리가 다 찬 오목 방에 들어온 세 번째 기기는 구경으로 남는다', () => {
  const b = browser({ game: 'omok', search: '?room=4821' }); b.boot(); b.find('코드 넣기').click();
  const ws = b.connect(room({ seats: players().map(p => ({ ...p, owner: OTHER })), hostId: OTHER }));
  assert.equal(ws.actions().length, 0);
  assert.equal(b.find('+ 이 기기에서 한 명 더').disabled, true);
});

test('다른 게임의 코드는 자리·세션을 남기지 않고 코드 입력으로 돌아간다', () => {
  const b = browser({ game: 'omok', search: '?room=4821' }); b.boot(); b.find('코드 넣기').click();
  const ws = b.sockets[0]; ws.open(); ws.message(snapshot({ seats: [] }));
  assert.deepEqual(ws.actions().map(a => a.type), ['leave']);
  assert.equal(b.store.has('familyRoomSession'), false);
  assert.match(b.$('roomView').textContent, /다른 게임의 방 코드/);
  assert.ok(b.find('방 만들기'));
});

test('만료와 30초 단절은 오목 판을 한 기기로 넘기고 흑백·수순을 유지한다', () => {
  for (const expired of [true, false]) {
    const b = game(); emit(b, b.E.place(b.s.state, 2, 2)); b.ws.end(expired ? 4404 : 1006);
    if (!expired) b.tick(30000);
    b.find('이 기기 하나로 이어서 하기').click();
    assert.equal(b.$('gameView').hidden, false); assert.equal(b.store.has('familyRoomSession'), false);
    assert.deepEqual(JSON.parse(b.store.get('familyOmokGame')), plain(b.s.state));
    const count = b.sockets.length; b.tick(60000); assert.equal(b.sockets.length, count);
    cell(b, 5, 5).click(); b.$('confirmPlace').click();
    assert.equal(JSON.parse(b.store.get('familyOmokGame')).publicBoard.moves.length, 2);
  }
});

test('수순·게임 종류·자리 ID가 맞지 않는 판은 입력을 잠그고 새로고침을 안내한다', () => {
  for (const mutate of [s => { s.state.v = 9; }, s => { s.state.gameType = 'yacht'; }, s => { s.room.gameType = 'yacht'; },
    s => { s.room.maxSeats = 5; }, s => { s.state.players = null; }, s => { s.state.players[0].id = 'wrong'; },
    s => { s.state.turnPlayer = 1; }, s => { s.state.publicBoard.moves = [{ x: 99, y: 0, by: 'p1' }]; },
    s => { s.state.players[0].avatar.value = null; }]) {
    const b = game(), invalid = plain(b.s); mutate(invalid); b.ws.message(invalid);
    assert.match(b.$('roomStatus').textContent, /새로고침해 주세요/);
    cell(b, 1, 1).fire('click'); b.$('confirmPlace').fire('click');
    assert.equal(b.ws.actions().length, 0); assert.equal(b.find('이 기기 하나로 이어서 하기'), undefined);
  }
});

test('대기실로·비방장 방 나가기·빈 자리 대신 하기', () => {
  const b = game(); b.find('대기실로', b.$('roomActions')).click(); assert.equal(b.ws.actions()[0].type, 'lobby');
  b.ws.message(room({ rev: 1 })); assert.equal(b.$('roomView').hidden, false); assert.equal(b.$('roomActions').hidden, true);
  const c = game({ host: false }); c.find('방 나가기', c.$('roomActions')).click();
  assert.equal(c.ws.actions()[0].type, 'leave'); assert.equal(c.$('setupView').hidden, false);
  const d = game({ host: false }), vacant = plain(d.s); vacant.seats[1].owner = null; d.ws.message(vacant);
  d.find('내가 대신 하기', d.$('roomStatus')).click();
  assert.deepEqual(d.ws.actions()[0], { type: 'claim', seatId: 'p2' });
});

for (const [name, key, make] of [['yacht', 'familyYachtGame', b => b.context.YachtEngine.createGame(players())],
  ['omok', 'familyOmokGame', b => b.context.OmokEngine.createGame(players(), 9)]])
  test(`${name}: 놀던 게임이 있어도 저장을 지우지 않고 여러 기기로 갈 수 있다`, () => {
    const source = browser({ game: name }), saved = JSON.stringify(make(source));
    const b = browser({ game: name, storage: { [key]: saved } }); b.boot();
    assert.equal(b.$('resumeView').hidden, false);
    b.$('resumeMultipleDevices').click();
    assert.equal(b.$('roomView').hidden, false); assert.ok(b.find('방 만들기'));
    assert.equal(b.store.get(key), saved);
    b.find('이 기기 하나로').click();
    assert.equal(b.$('resumeView').hidden, false); assert.equal(b.store.get(key), saved);
    assert.equal(b.requests.length, 0); assert.equal(b.sockets.length, 0);
  });

test('한 기기 완주·다시 하기·저장은 방 통신 없이 유지한다', () => {
  const b = browser({ game: 'omok' }); b.boot(); b.$('boardSize').value = '9'; b.$('startGame').click();
  assert.equal(b.speech[0].text, '민서 흑돌로 먼저 두어요!');
  const at = (x, y) => b.$('board').children[y * 9 + x];
  for (const [x, y] of [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [2, 1], [3, 0], [3, 1], [4, 0]]) { at(x, y).click(); at(x, y).click(); }
  assert.equal(b.$('endView').hidden, false); assert.equal(b.store.has('familyOmokGame'), false);
  assert.equal(b.speech.at(-1).text, '민서, 이겼어요!'); b.speech.at(-1).after();
  assert.equal(b.speech.at(-1).text, 'reward');
  b.$('playAgain').click(); assert.equal(JSON.parse(b.store.get('familyOmokGame')).lastAction.type, 'REMATCH');
  assert.equal(b.requests.length, 0); assert.equal(b.sockets.length, 0); assert.equal(b.store.has('familyRoomSession'), false);
});

test('순수 효과 판단은 상태 없는 rev 증가·초기 복구를 효과로 세지 않는다', () => {
  const b = game({ mine: false }), policy = b.context.OmokUI;
  const next = { ...b.s, room: { ...b.s.room, rev: 2 }, state: b.E.place(b.s.state, 0, 0) };
  assert.equal(policy.effectsFor(b.s, next).turn, true);
  assert.equal(policy.effectsFor(b.s, next, true).turn, false);
  assert.equal(policy.effectsFor(next, { ...next, room: { ...next.room, rev: 3 } }).turn, false);
  assert.equal(policy.inputFor(next, true), false); assert.equal(policy.inputFor(next, false), true);
});

test('파일 한도·이름 삽입 방식·기존 설정 요소와 상대 로드를 유지한다', () => {
  for (const [file, limit] of [['omok-ui.js', 600], ['omok.html', 150], ['family-room-ui.js', 400]]) {
    const source = read(file); assert.ok(source.trimEnd().split('\n').length <= limit, file);
    assert.doesNotMatch(source, /innerHTML/);
  }
  const html = read('omok.html');
  for (const id of ['setupTitle', 'playerSetup', 'boardSize', 'setupError', 'startGame'])
    assert.ok(html.indexOf(`id="${id}"`) < html.indexOf('id="resumeView"'));
  assert.ok(html.indexOf('src="family-room.js"') < html.indexOf('src="family-room-ui.js"'));
  assert.ok(html.indexOf('src="family-room-ui.js"') < html.indexOf('src="omok-ui.js"'));
});
