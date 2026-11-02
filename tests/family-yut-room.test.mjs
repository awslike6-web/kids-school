import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { browser, snapshot, players, CLIENT, OTHER, plain, turns } from './family-browser.mjs';

const room = options => snapshot({ gameType: 'yut', maxSeats: 4, ...options });
const shapes = { backdo: [true, false, false, false], do: [false, true, false, false],
  gae: [true, true, false, false], geol: [true, true, true, false], yut: [true, true, true, true], mo: [false, false, false, false] };
const engineState = value => { const { lastSticks, ...state } = value; return state; };
const shared = state => ({ ...state, lastSticks: shapes[state.publicBoard.log.findLast(a => a.type === 'THROW')?.result] || null });
function game({ mine = true, host = true, spectator = false, value, recovered = false, storage = {} } = {}) {
  if (recovered) storage = { ...storage, familyRoomSession: JSON.stringify({ code: '4821', gameType: 'yut', clientId: CLIENT }) };
  const b = browser({ game: 'yut', search: recovered ? '' : '?room=4821', storage }); b.boot();
  if (!recovered) b.find('코드 넣기').click();
  const E = b.context.YutEngine;
  const seats = players().map((p, i) => ({ ...p, owner: spectator ? OTHER : (i === 0) === mine ? CLIENT : OTHER }));
  const s = room({ phase: 'playing', state: shared(value || E.createGame(players(), 2)), seats, hostId: host ? CLIENT : OTHER });
  const ws = b.connect(s); return { ...b, E, s, ws };
}
function emit(b, value, rev = b.s.room.rev + 1) {
  b.s = { ...b.s, room: { ...b.s.room, rev }, state: Object.hasOwn(value, 'lastSticks') ? value : shared(value) };
  b.ws.message(b.s);
}
const cell = (b, pos) => b.$('board').querySelectorAll('.yut-cell').find(n => n.dataset.pos === String(pos));
const wait = b => b.$('waitingTray').querySelector('button');
const chip = (b, index) => b.$('pendingList').children[index];
const sticks = b => b.$('sticks').children.map(n => n.className);
function roll(b, values = [0.9, 0.1, 0.9, 0.9]) {
  vm.runInContext(`{ const values = ${JSON.stringify(values)}; let i = 0; Math.random = () => values[i++]; }`, b.context);
  b.$('throwButton').click();
}
function winning(E) {
  let state = E.createGame(players(), 2);
  // 두 말을 업고 바깥길을 돌아 완주합니다. 다른 사람은 빽도로 차례를 넘깁니다.
  state = E.applyThrow(E.applyThrow(state, 'yut'), 'yut');
  state = E.applyThrow(state, 'do');
  state = E.applyMove(state, 'p1-0', 0);
  state = E.applyMove(state, 'p1-1', 0);
  state = E.applyMove(state, 'p1-0', 0);
  state = E.applyThrow(state, 'backdo');
  state = E.applyThrow(E.applyThrow(E.applyThrow(state, 'mo'), 'mo'), 'gae');
  while (!state.result) {
    const move = E.legalMoves(state)[0];
    assert.ok(move); state = E.applyMove(state, move.pieceIds[0], move.throwIndex);
  }
  return state;
}

test('던진 기기의 결과·가락을 한 번만 보내고 응답 전에는 화면·로컬 저장을 바꾸지 않는다', () => {
  const b = game(); roll(b, [0.9, 0.9, 0.1, 0.9]); b.$('throwButton').fire('click');
  assert.equal(b.ws.actions().length, 1);
  const action = b.ws.actions()[0];
  assert.equal(action.type, 'act'); assert.equal(action.baseRev, 0);
  assert.equal(action.state.lastAction.result, 'do');
  assert.deepEqual(action.state.lastSticks, [false, false, true, false]);
  assert.equal(b.E.isValidSaved(engineState(action.state)), true);
  assert.equal(b.$('throwResult').textContent, ''); assert.equal(b.$('sticks').children.length, 0);
  assert.equal(b.store.has('familyYutGame'), false);
  emit(b, action.state);
  assert.equal(b.$('throwResult').textContent, '도! 1칸');
  assert.deepEqual(sticks(b), ['stick mark', 'stick', 'stick flat', 'stick']);
});

test('방 만들기는 기존 공용 경로에 윷놀이 종류와 네 자리 한도를 전달한다', async () => {
  const b = browser({ game: 'yut', fetch: async () => ({ ok: true, json: async () => ({ code: '4821' }) }) });
  b.boot(); b.$('multipleDevices').click(); b.find('방 만들기').click(); await turns();
  const [url, options] = b.requests[0];
  assert.match(url, /\/rooms$/); assert.equal(options.method, 'POST');
  assert.deepEqual(JSON.parse(options.body), { gameType: 'yut', maxSeats: 4, client: CLIENT });
  assert.equal(b.sockets.length, 1);
});

test('상대 화면과 재접속 화면은 추첨하지 않고 확정한 가락·결과·말 위치를 그대로 그린다', () => {
  const b = game(), c = game({ mine: false });
  vm.runInContext('Math.random = () => { throw Error("재추첨 금지"); };', c.context);
  roll(b, [0.9, 0.9, 0.1, 0.9]); const thrown = b.ws.actions()[0].state;
  emit(b, thrown); emit(c, thrown);
  assert.deepEqual(sticks(b), sticks(c));
  assert.equal(b.$('throwResult').textContent, c.$('throwResult').textContent);
  wait(b).click(); b.$('confirmMove').click(); const moved = b.ws.actions().at(-1).state;
  emit(b, moved); emit(c, moved);
  assert.equal(cell(b, 1).querySelector('.token').dataset.owner, 'p1');
  assert.equal(cell(c, 1).querySelector('.token').dataset.owner, 'p1');
  assert.deepEqual(moved.lastSticks, thrown.lastSticks);
  b.ws.end(); b.tick(1000); const ws = b.sockets.at(-1); ws.open(); ws.message(b.s);
  assert.deepEqual(sticks(b), sticks(c)); assert.equal(b.speech.length, 0);
  const d = game({ value: engineState(moved), recovered: true, mine: false });
  assert.equal(d.$('throwResult').textContent, '도! 1칸'); assert.equal(d.speech.length, 0);
});

test('남의 차례·구경·전송 잠금에는 던지기·칩·말 선택을 막고 개인 도움을 숨긴다', () => {
  for (const config of [{ mine: false }, { spectator: true }]) {
    const b = game(config); emit(b, b.E.applyThrow(engineState(b.s.state), 'do'));
    assert.match(b.$('turnBanner').textContent, /차례예요. 기다려요/);
    assert.equal(b.$('helpText').textContent, ''); assert.equal(b.$('assistLabel').textContent, '말 2개');
    assert.equal(b.$('board').querySelectorAll('.can-move').length, 0);
    assert.ok(b.$('board').querySelectorAll('.yut-cell').every(n => n.disabled));
    b.$('throwButton').fire('click'); wait(b).fire('click'); chip(b, 0).fire('click');
    b.$('confirmMove').fire('click'); b.$('finishCell').fire('click');
    assert.equal(b.ws.actions().length, 0); assert.equal(b.$('confirmMove').disabled, true);
  }
  const b = game(); roll(b); assert.equal(b.$('throwButton').disabled, true);
  b.ws.end(); b.$('throwButton').fire('click'); assert.equal(b.ws.actions().length, 1);
});

test('칩·말 선택은 기기에만 남고 접속 알림은 보존하며 판 변경·소유권 변경은 지운다', () => {
  const b = game(); let state = b.E.applyThrow(b.E.applyThrow(engineState(b.s.state), 'yut'), 'do');
  emit(b, state); chip(b, 1).click(); wait(b).click();
  assert.ok(cell(b, 1).className.includes('target')); assert.equal(b.ws.actions().length, 0);
  b.ws.message(plain(b.s));
  assert.ok(cell(b, 1).className.includes('target')); assert.equal(chip(b, 1).getAttribute('aria-pressed'), 'true');
  const changedOwner = plain(b.s); changedOwner.seats[0].owner = OTHER; b.ws.message(changedOwner);
  assert.equal(cell(b, 1).className.includes('target'), false); assert.equal(b.$('confirmMove').disabled, true);
  changedOwner.seats[0].owner = CLIENT; b.ws.message(changedOwner);
  wait(b).click(); b.$('confirmMove').click(); b.$('confirmMove').fire('click');
  assert.equal(b.ws.actions().length, 1);
  state = b.ws.actions()[0].state; emit(b, state);
  assert.equal(chip(b, 0).getAttribute('aria-pressed'), 'true'); assert.equal(b.$('confirmMove').disabled, true);
});

test('거절되면 확정 전 결과를 버리고 같은 판에서 다시 던질 수 있다', () => {
  const b = game(); roll(b);
  b.ws.message({ type: 'rejected', reason: 'stale' }); b.ws.message(b.s);
  assert.equal(b.$('throwResult').textContent, ''); assert.equal(b.$('throwButton').disabled, false);
  roll(b, [0.1, 0.1, 0.9, 0.9]); assert.equal(b.ws.actions().length, 2);
  assert.equal(b.ws.actions().at(-1).state.lastAction.result, 'gae');
});

test('업기·잡기·추가 던지기·남은 칩은 엔진의 확정 상태로 동기화한다', () => {
  const b = game(); let state = engineState(b.s.state);
  state = b.E.applyMove(b.E.applyThrow(state, 'do'), 'p1-0', 0);
  state = b.E.applyThrow(b.E.applyThrow(state, 'yut'), 'do'); emit(b, state);
  const c = game({ mine: false, value: state });
  chip(c, 1).click(); wait(c).click(); c.$('confirmMove').click();
  emit(b, c.ws.actions()[0].state); emit(c, c.ws.actions()[0].state);
  assert.equal(b.$('actionMessage').textContent, '잡았어요! 한 번 더 던져요!');
  assert.equal(c.$('actionMessage').textContent, b.$('actionMessage').textContent);
  assert.equal(chip(c, 0).disabled, true); assert.equal(c.$('throwButton').disabled, false);
  assert.equal(cell(b, 1).querySelector('.token').dataset.owner, 'p2');
  roll(c); emit(c, c.ws.actions().at(-1).state);
  assert.equal(chip(c, 0).disabled, false); assert.equal(chip(c, 1).disabled, false);
});

test('승부 효과는 방장·참가자에게 한 번만, 다시 하기는 rev와 회전한 자리 주인을 따른다', () => {
  for (const config of [{ host: true }, { host: false }, { host: true, spectator: true }]) {
    const b = game(config); emit(b, winning(b.E), 20);
    assert.equal(b.$('endView').hidden, false); assert.equal(b.$('roomActions').hidden, true);
    const speech = b.speech[0];
    if (config.host) { assert.match(speech.text, /이겼어요!/); speech.after(); speech.after(); }
    else assert.equal(speech.text, 'reward');
    b.ws.message(b.s);
    assert.equal(b.speech.filter(s => s.text === 'reward').length, config.spectator ? 0 : 1);
    b.$('playAgain').fire('click');
    if (config.spectator) { assert.equal(b.ws.actions().length, 0); continue; }
    const sent = b.ws.actions()[0];
    assert.equal(sent.type, 'act'); assert.equal(sent.baseRev, 20); assert.equal(sent.state.lastSticks, null);
    assert.equal(sent.state.players[0].id, 'p2'); assert.equal(sent.state.publicBoard.pieceCount, 2);
    emit(b, sent.state); assert.match(b.$('turnBanner').textContent, /차례예요. 기다려요/);
    assert.equal(b.$('sticks').children.length, 0); assert.equal(b.$('throwResult').textContent, '');
  }
  const c = game({ value: winning(game().E), recovered: true });
  assert.equal(c.$('endView').hidden, false); assert.equal(c.speech.length, 0);
});

test('차례 음성·포커스는 내 차례가 될 때만, 재접속과 같은 판은 조용하다', () => {
  const b = game(), c = game({ mine: false });
  const next = b.E.applyThrow(engineState(b.s.state), 'backdo');
  emit(b, next); emit(c, next);
  assert.equal(b.speech.length, 0); assert.equal(c.speech.length, 1); assert.match(c.speech[0].text, /차례예요!/);
  assert.equal(b.$('turnBanner').focusCount || 0, 0); assert.ok(c.$('turnBanner').focusCount > 0);
  c.ws.message(c.s); assert.equal(c.speech.length, 1);
  const d = game({ value: next, recovered: true, mine: false });
  assert.equal(d.speech.length, 0); assert.equal(d.$('turnBanner').focusCount || 0, 0);
});

test('방장 말 개수 선택·대기실 복귀·상대 이탈·대신 하기·4409는 공용 방 흐름을 쓴다', () => {
  const b = browser({ game: 'yut', search: '?room=4821' }); b.boot(); b.find('코드 넣기').click();
  const ws = b.connect(room()); const picker = b.$('roomView').querySelector('.count-label').querySelector('select');
  assert.deepEqual(picker.children.map(n => n.value), ['2', '3', '4']); assert.equal(picker.value, '4');
  picker.value = '3'; picker.fire('change'); b.find('게임 시작').click();
  const start = ws.actions().find(a => a.type === 'start');
  assert.equal(start.state.publicBoard.pieceCount, 3); assert.equal(start.state.lastSticks, null);
  const c = game({ host: false }), absent = plain(c.s); absent.members[1].online = false;
  c.ws.message(absent); c.find('내가 대신 하기', c.$('roomStatus')).click();
  assert.deepEqual(c.ws.actions()[0], { type: 'claim', seatId: 'p2' });
  absent.seats[1].owner = CLIENT; c.s = absent; c.ws.message(absent); emit(c, c.E.applyThrow(engineState(c.s.state), 'backdo'));
  assert.equal(c.$('throwButton').disabled, false);
  const d = game(); d.find('대기실로', d.$('roomActions')).click(); assert.equal(d.ws.actions()[0].type, 'lobby');
  d.ws.message(room({ rev: 1 })); assert.equal(d.$('roomView').hidden, false);
  const e = game({ host: false }); e.find('방 나가기', e.$('roomActions')).click();
  assert.equal(e.ws.actions()[0].type, 'leave'); assert.equal(e.$('setupView').hidden, false);
  const f = game(); f.ws.end(4409); f.tick(60000);
  assert.equal(f.sockets.length, 1); assert.equal(f.$('throwButton').disabled, true);
});

test('단절·만료 때 한 기기로 넘기면 방 전용 가락 필드를 빼고 유효한 로컬 판을 저장한다', () => {
  for (const expired of [true, false]) {
    const b = game(); emit(b, b.E.applyThrow(engineState(b.s.state), 'do')); b.ws.end(expired ? 4404 : 1006);
    if (!expired) b.tick(30000);
    b.find('이 기기 하나로 이어서 하기').click();
    const saved = JSON.parse(b.store.get('familyYutGame'));
    assert.equal(b.E.isValidSaved(saved), true); assert.equal(Object.hasOwn(saved, 'lastSticks'), false);
    assert.deepEqual(saved, plain(engineState(b.s.state))); assert.equal(b.store.has('familyRoomSession'), false);
    wait(b).click(); b.$('confirmMove').click();
    assert.equal(JSON.parse(b.store.get('familyYutGame')).publicBoard.pieces[0].pos, 1);
  }
});

test('놀던 로컬 판과 방 세션은 분리하고 다른 게임 코드는 입구로 돌려보낸다', () => {
  const source = browser({ game: 'yut' }), saved = JSON.stringify(source.context.YutEngine.createGame(players()));
  const b = browser({ game: 'yut', storage: { familyYutGame: saved } }); b.boot();
  b.$('resumeMultipleDevices').click(); assert.equal(b.$('roomView').hidden, false);
  b.find('이 기기 하나로').click(); assert.equal(b.$('resumeView').hidden, false); assert.equal(b.store.get('familyYutGame'), saved);
  const c = game({ storage: { familyYutGame: saved } }); roll(c); emit(c, c.ws.actions()[0].state);
  assert.equal(c.store.get('familyYutGame'), saved);
  const d = browser({ game: 'yut', search: '?room=4821' }); d.boot(); d.find('코드 넣기').click();
  d.connect(snapshot()); assert.match(d.$('roomView').textContent, /다른 게임의 방 코드/);
  assert.equal(d.store.has('familyRoomSession'), false);
});

test('조작된 수순·말·자리·가락·버전을 거부하고 새로고침 전에는 입력하지 않는다', () => {
  for (const mutate of [s => { s.state.v = 9; }, s => { s.room.maxSeats = 5; },
    s => { s.state.players[0].id = 'wrong'; }, s => { s.state.publicBoard.pieces[0].pos = 20; },
    s => { s.state.publicBoard.pending = ['mo']; }, s => { delete s.state.lastSticks; },
    s => { s.state.lastSticks = [true, true, true, true]; }, s => { s.state.extra = 1; }]) {
    const b = game(), invalid = plain(b.s); mutate(invalid); b.ws.message(invalid);
    assert.match(b.$('roomStatus').textContent, /새로고침해 주세요/);
    b.$('throwButton').fire('click'); assert.equal(b.ws.actions().length, 0);
    assert.equal(b.find('이 기기 하나로 이어서 하기'), undefined);
  }
  const b = game(); emit(b, b.E.applyThrow(engineState(b.s.state), 'do'));
  const wrong = plain(b.s); wrong.state.lastSticks = shapes.backdo; b.ws.message(wrong);
  assert.match(b.$('roomStatus').textContent, /새로고침해 주세요/);
});

test('3·4인과 한 기기의 여러 자리도 자리 ID로 차례를 판정한다', () => {
  for (const count of [3, 4]) {
    const b = game(), people = ['🐰', '🐻', '🦊', '🐯'].slice(0, count).map((value, i) =>
      ({ id: `p${i + 1}`, name: `참가자${i + 1}`, avatar: { type: 'emoji', value }, assist: 'helper' }));
    b.s.seats = people.map(p => ({ ...p, owner: CLIENT }));
    let state = b.E.createGame(people, 3); emit(b, state);
    assert.equal(b.$('playersStatus').children.length, count); b.speech.length = 0;
    for (let i = 0; i < count; i++) {
      assert.equal(b.$('throwButton').disabled, false);
      state = b.E.applyThrow(state, 'backdo'); emit(b, state);
    }
    assert.equal(b.speech.length, 0); assert.equal(b.s.state.turnPlayer, 0);
    while (!state.result) {
      if (state.publicBoard.phase === 'throw') state = b.E.applyThrow(state, state.turnPlayer ? 'backdo' : 'do');
      else {
        const move = b.E.legalMoves(state)[0];
        assert.ok(move); state = b.E.applyMove(state, move.pieceIds[0], move.throwIndex);
      }
    }
    const seats = b.s.seats.map((p, i) => ({ ...p, owner: i === 1 ? CLIENT : OTHER }));
    const next = b.E.rematch(state), rotated = room({ phase: 'playing', state: shared(next), seats });
    assert.equal(b.context.YutUI.validSnapshot(rotated), true);
    assert.equal(next.players[0].id, people[1].id);
    assert.equal(b.context.YutUI.inputFor(rotated, false), true);
    assert.equal(b.context.YutUI.inputFor({ ...rotated, you: OTHER }, false), false);
  }
});

test('같은 판의 rev 증가·초기 복구는 효과가 없고 잠금·승부 뒤에는 입력할 수 없다', () => {
  const b = game(), policy = b.context.YutUI;
  const same = { ...b.s, room: { ...b.s.room, rev: 1 } };
  assert.equal(policy.effectsFor(b.s, same).end, false); assert.equal(policy.effectsFor(b.s, same).begun, false);
  assert.equal(policy.inputFor(b.s, true), false); assert.equal(policy.inputFor(b.s, false), true);
  const ended = { ...same, state: shared(winning(b.E)) };
  assert.equal(policy.inputFor(ended, false), false); assert.equal(policy.effectsFor(b.s, ended, true).end, false);
  emit(b, ended.state); const late = b.speech[0].after;
  b.ws.message(room({ rev: 2 })); late(); assert.equal(b.speech.some(s => s.text === 'reward'), false);
});
