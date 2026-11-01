import test from 'node:test';
import assert from 'node:assert/strict';
import { browser, snapshot, players, CLIENT, OTHER, plain, read } from './family-browser.mjs';
function game({ mine = true, host = true, spectator = false, value, recovered = false } = {}) {
  const storage = recovered ? { familyRoomSession: JSON.stringify({ code: '4821', gameType: 'yacht', clientId: CLIENT }) } : {};
  const b = browser({ search: recovered ? '' : '?room=4821', storage }); b.boot();
  if (!recovered) b.find('코드 넣기').click();
  const E = b.context.YachtEngine, state = value || E.createGame(players());
  const seats = players().map((p, i) => ({ ...p, owner: spectator ? OTHER : (i === 0) === mine ? CLIENT : OTHER }));
  const s = snapshot({ phase: 'playing', state, seats, hostId: host ? CLIENT : OTHER });
  const ws = b.connect(s); return { ...b, ws, E, s };
}
const emit = (b, value, rev = b.s.room.rev + 1) => {
  b.s = { ...b.s, room: { ...b.s.room, rev }, state: value }; b.ws.message(b.s);
};
const rolled = b => b.E.roll(b.s.state, () => 0);
function completed(E, yacht = false) {
  let state = E.createGame(players());
  for (let turn = 0; turn < 24; turn++) {
    const category = E.CATEGORIES[turn >> 1].id;
    state = E.choose(E.roll(state, () => yacht && turn === 23 ? .99 : 0), category);
  }
  return state;
}
test('응답 전 판·로컬 저장은 바꾸지 않고 submit을 한 번만 전송한다', () => {
  const b = game(); b.$('rollDice').click(); b.$('rollDice').click();
  assert.equal(b.ws.actions().length, 1); assert.equal(b.ws.actions()[0].type, 'act');
  assert.match(b.$('turnBanner').textContent, /0\/3/); assert.equal(b.store.has('familyYachtGame'), false);
  emit(b, b.ws.actions()[0].state); assert.match(b.$('turnBanner').textContent, /1\/3/);
});
test('남의 차례는 클릭 재검사·도움 점수/추천/개인 안내를 모두 숨긴다', () => {
  const b = game({ mine: false }); emit(b, rolled(b));
  assert.equal(b.$('rollDice').disabled, true); assert.equal(b.$('keepHint').textContent, '');
  assert.equal(b.$('turnHelp').textContent, '민서 차례예요. 기다려요'); assert.equal(b.$('roundBanner').textContent, '1 / 12 라운드');
  const choices = b.$('scoreTable').querySelectorAll('.score-choice');
  assert.ok(choices.every(n => n.disabled && n.textContent === '기록'));
  b.$('rollDice').fire('click'); choices[0].fire('click'); b.$('dice').children[0].fire('click');
  assert.equal(b.ws.actions().length, 0); assert.equal(b.$('zeroDialog').open, false);
});
test('내 자리 도움·고정과 점수 기록도 같은 commit 경로를 쓴다', () => {
  const b = game(); emit(b, rolled(b)); b.tick(260);
  assert.ok(b.$('scoreTable').querySelectorAll('.score-choice').some(n => n.textContent === '5'));
  b.$('dice').children[0].click(); assert.equal(b.ws.actions()[0].state.lastAction.type, 'TOGGLE_KEEP');
  emit(b, b.ws.actions()[0].state); b.$('scoreTable').querySelectorAll('.score-choice')[0].click();
  assert.equal(b.ws.actions()[1].state.lastAction.type, 'CHOOSE');
});
test('0점 확인창은 판 변경/소유권 변경/재접속에 닫히고 오래된 확정은 무효다', () => {
  const b = game(); emit(b, rolled(b)); b.tick(260);
  b.$('scoreTable').querySelectorAll('.score-choice').find(n => n.dataset.category === 'twos').click();
  assert.equal(b.$('zeroDialog').open, true);
  const s = plain(b.s); s.seats[0].owner = OTHER; b.ws.message(s);
  assert.equal(b.$('zeroDialog').open, false); b.$('confirmZero').fire('click'); assert.equal(b.ws.actions().length, 0);
  s.seats[0].owner = CLIENT; b.ws.message(s);
  b.$('scoreTable').querySelectorAll('.score-choice').find(n => n.dataset.category === 'twos').click(); b.ws.end();
  assert.equal(b.$('zeroDialog').open, false);
});
test('rev·게임 상태 변화로 굴림을 한 번만 재생하고 새 snapshot은 진행 중 타이머를 해제한다', () => {
  const b = game(); emit(b, rolled(b)); assert.match(b.$('dice').className, /rolling/);
  b.ws.message(b.s); assert.ok(!b.$('dice').className.includes('rolling')); assert.equal(b.$('rollDice').disabled, false);
  const next = { ...b.s, room: { ...b.s.room, rev: 2 } }; b.ws.message(next);
  assert.ok(!b.$('dice').className.includes('rolling')); b.tick(1000); assert.equal(b.$('rollDice').disabled, false);
});
test('입장·재접속의 지난 굴림은 애니메이션·음성·포커스를 내지 않는다', () => {
  const source = browser(), value = source.context.YachtEngine.roll(source.context.YachtEngine.createGame(players()), () => 0);
  const b = game({ value, recovered: true }); assert.ok(!b.$('dice').className.includes('rolling'));
  assert.equal(b.speech.length, 0); assert.equal(b.$('turnBanner').focusCount || 0, 0);
  b.ws.end(); b.tick(1000); const ws = b.connect({ ...b.s, room: { ...b.s.room, rev: 8 } });
  assert.equal(b.speech.length, 0); assert.equal(ws.actions().length, 0);
});
test('도중 야추 문장은 다음 차례 소유 기기 한 곳에서만 말한다', () => {
  for (const mine of [true, false]) {
    const b = game({ mine, host: true });
    const next = b.E.choose(b.E.roll(b.s.state, () => 0), 'yacht'); emit(b, next);
    assert.deepEqual(b.speech.map(s => s.text), mine ? [] : ['야추! 대단해요! 민수 차례예요!']);
    b.ws.message(b.s); assert.equal(b.speech.length, mine ? 0 : 1);
  }
});
test('게임 종료 야추는 방장만, 보상은 자리 기기만 한 번이며 방장은 문장 뒤 보상', () => {
  for (const config of [{ mine: true, host: true }, { mine: true, host: false }, { host: true, spectator: true }]) {
    const b = game(config), ended = completed(b.E, true); emit(b, ended);
    assert.equal(b.$('endView').hidden, false);
    assert.deepEqual(b.speech.map(s => s.text), config.host ? ['야추! 대단해요!'] : ['reward']);
    const speech = b.speech[0]; b.ws.message(b.s); speech.after?.(); speech.after?.();
    assert.equal(b.speech.filter(s => s.text === 'reward').length, config.spectator ? 0 : 1);
    b.ws.message(b.s); assert.equal(b.speech.filter(s => s.text === 'reward').length, config.spectator ? 0 : 1);
  }
});
test('끝 화면을 떠나면 늦은 보상을 내지 않고 입장한 끝난 판은 완전히 조용하다', () => {
  const b = game(), ended = completed(b.E, true); emit(b, ended); const after = b.speech[0].after;
  b.ws.message(snapshot({ rev: 2 })); after(); assert.equal(b.speech.filter(s => s.text === 'reward').length, 0);
  const c = game({ value: ended, recovered: true }); assert.equal(c.$('endView').hidden, false); assert.equal(c.speech.length, 0);
});
test('다시 하기는 현재 rev의 act, 구경은 클릭을 강제로 보내도 불가', () => {
  const b = game(); emit(b, completed(b.E), 22); b.$('playAgain').click();
  const sent = b.ws.actions().at(-1); assert.equal(sent.type, 'act'); assert.equal(sent.baseRev, 22);
  assert.equal(sent.state.stateVersion, 0); assert.equal(sent.state.lastAction, null);
  const c = game({ spectator: true }); emit(c, completed(c.E)); assert.equal(c.$('playAgain').disabled, true);
  c.$('playAgain').fire('click'); assert.equal(c.ws.actions().length, 0);
});
test('대기실로·비방장 방 나가기와 진행 중 빈 자리 claim', () => {
  const b = game(); b.find('대기실로').click(); assert.equal(b.ws.actions()[0].type, 'lobby');
  b.ws.message(snapshot({ rev: 1 })); assert.equal(b.$('roomView').hidden, false);
  const c = game({ host: false }); c.find('방 나가기').click(); assert.equal(c.ws.actions()[0].type, 'leave');
  assert.equal(c.$('setupView').hidden, false);
  const d = game({ host: false }); const vacant = plain(d.s); vacant.seats[1].owner = null; d.ws.message(vacant);
  assert.equal(d.$('roomStatus').hidden, false);
  d.find('내가 대신 하기', d.$('roomStatus')).click(); assert.equal(d.ws.actions()[0].type, 'claim');
});
test('게임 중 나가기 버튼은 다시 그려도 보이고, 방장의 넘겨받기는 접속 중인 자리에도 판 아래에 있다', () => {
  const b = game(); emit(b, rolled(b)); b.tick(260);
  assert.equal(b.$('roomView').hidden, true); assert.equal(b.$('roomActions').hidden, false);
  assert.ok(b.find('대기실로', b.$('roomActions'))); assert.ok(b.find('민수 자리 넘겨받기', b.$('roomActions')));
  assert.equal(b.$('roomStatus').hidden, true);
  const c = game({ host: false }); assert.equal(c.find('민수 자리 넘겨받기'), undefined);
  assert.ok(c.find('방 나가기', c.$('roomActions')));
});
test('자리를 대신 맡겨 둔 주인이 돌아오면 접속 중인 기기에서도 되찾을 수 있다', () => {
  const d = game({ host: false }); const taken = plain(d.s);
  taken.seats[0].owner = OTHER; taken.seats[0].origin = CLIENT; d.ws.message(taken);
  assert.equal(d.$('roomStatus').hidden, false); assert.equal(d.$('rollDice').disabled, true);
  d.find('내 자리로 돌아가기', d.$('roomStatus')).click();
  assert.deepEqual(d.ws.actions()[0], { type: 'claim', seatId: 'p1' });
});
test('서버에 닿지 못한 안내는 첫 화면에 보이고 한 기기 판을 시작하면 사라진다', async () => {
  const b = browser(); b.boot(); b.$('multipleDevices').click(); b.find('방 만들기').click();
  for (let n = 0; n < 8; n++) await Promise.resolve();
  assert.equal(b.$('setupView').hidden, false); assert.equal(b.$('roomStatus').hidden, false);
  assert.match(b.$('roomStatus').textContent, /여러 기기로 할 수 없어요/);
  b.$('startGame').click();
  assert.equal(b.$('gameView').hidden, false); assert.equal(b.$('roomStatus').hidden, true);
});
test('끝 화면에서는 판 아래 버튼을 겹쳐 보여 주지 않는다', () => {
  const b = game({ value: undefined }); emit(b, completed(b.E));
  assert.equal(b.$('endView').hidden, false); assert.equal(b.$('roomActions').hidden, true);
  assert.equal(b.$('backToSetup').textContent, '대기실로');
});
test('게임 뒤 대기실로 돌아오면 자리 카드는 기본값이 아니라 내 자리를 보여 준다', () => {
  const b = game({ host: false, mine: false });
  b.ws.message(snapshot({ rev: 1, hostId: OTHER, seats: players().map((p, i) => ({ ...p, owner: i ? CLIENT : OTHER })) }));
  assert.equal(b.$('roomActions').hidden, true);
  assert.equal(b.$('roomView').querySelector('.player-card').querySelector('input').value, '민수');
  assert.equal(b.ws.actions().length, 0);
});
test('대기실에서는 접속 중인 사람의 자리를 뺏는 버튼이 없다', () => {
  const b = browser({ search: '?room=4821' }); b.boot(); b.find('코드 넣기').click(); b.connect(snapshot());
  assert.equal(b.find('민수 내가 대신 하기'), undefined); assert.ok(b.find('내보내기'));
});
test('만료 4404와 30초 단절은 호환 판을 한 기기로 넘기고 통신을 멈춘다', () => {
  for (const expired of [true, false]) {
    const b = game(); emit(b, rolled(b)); b.tick(260); b.ws.end(expired ? 4404 : 1006);
    if (!expired) { assert.equal(b.find('이 기기 하나로 이어서 하기'), undefined); b.tick(30000); }
    b.find('이 기기 하나로 이어서 하기').click();
    assert.equal(b.$('gameView').hidden, false); assert.equal(b.store.has('familyRoomSession'), false);
    assert.deepEqual(JSON.parse(b.store.get('familyYachtGame')), plain(b.s.state));
    const count = b.sockets.length; b.tick(60000); assert.equal(b.sockets.length, count);
    b.$('rollDice').click(); assert.equal(JSON.parse(b.store.get('familyYachtGame')).publicBoard.rollCount, 2);
  }
});
test('버전·게임 종류·판 모양·ID 불일치는 흰 화면 대신 새로고침 안내와 입력 잠금', () => {
  for (const mutate of [s => { s.state.v = 9; }, s => { s.room.gameType = 'omok'; },
    s => { s.state.gameType = 'omok'; }, s => { s.state.publicBoard.dice = null; },
    s => { s.state.players = null; }, s => { s.state.turnPlayer = 10; },
    s => { s.state.publicBoard.kept = []; }, s => { s.state.publicBoard.scores = {}; },
    s => { s.state.players[0].id = 'wrong'; }, s => { s.state.players[0].avatar.value = null; }]) {
    const b = game(), invalid = plain(b.s); mutate(invalid); b.ws.message(invalid);
    assert.match(b.$('roomStatus').textContent, /새로고침해 주세요/); b.$('rollDice').fire('click');
    assert.equal(b.ws.actions().length, 0); assert.equal(b.find('이 기기 하나로 이어서 하기'), undefined);
  }
});
test('렌더 예외도 보호하고 마지막 판을 변조하면 한 기기로 넘기지 않는다', () => {
  const b = game(); b.$('dice').replaceChildren = () => { throw Error('그리기 오류'); };
  emit(b, rolled(b)); assert.match(b.$('roomStatus').textContent, /새로고침/);
  b.$('rollDice').fire('click'); assert.equal(b.ws.actions().length, 0);
  const c = game(); c.ws.end(4404);
  c.context.FamilyRoomUI = { ...c.context.FamilyRoomUI, usableAvatar: () => false };
  c.find('이 기기 하나로 이어서 하기').click(); assert.equal(c.store.has('familyYachtGame'), false);
});
test('순수 효과 판단은 상태 없는 rev 증가·같은 rev·초기 복구를 효과로 세지 않는다', () => {
  const b = game(), policy = b.context.YachtUI;
  const next = { ...b.s, room: { ...b.s.room, rev: 2 }, state: rolled(b) };
  assert.equal(policy.effectsFor(b.s, next).roll, true);
  assert.equal(policy.effectsFor(b.s, next, true).roll, false);
  assert.equal(policy.effectsFor(next, { ...next, room: { ...next.room, rev: 3 } }).roll, false);
  assert.equal(policy.inputFor(b.s, true, false), false); assert.equal(policy.inputFor(b.s, false, true), false);
});

test('한 기기 24차례 완주·0점 확인·다시 하기·기존 저장과 음성은 방 통신 없이 유지한다', () => {
  const b = browser(); b.boot(); b.$('startGame').click();
  for (let turn = 0; turn < 24; turn++) {
    b.$('rollDice').click(); b.tick(260);
    const saved = JSON.parse(b.store.get('familyYachtGame'));
    const p = saved.players[saved.turnPlayer], category = b.context.YachtEngine.CATEGORIES.find(c => saved.publicBoard.scores[p.id][c.id] === null);
    b.$('scoreTable').querySelectorAll('.score-choice').find(n => n.dataset.category === category.id).click();
    if (b.$('zeroDialog').open) b.$('confirmZero').click();
  }
  assert.equal(b.$('endView').hidden, false); assert.equal(b.store.has('familyYachtGame'), false);
  b.$('playAgain').click(); assert.equal(JSON.parse(b.store.get('familyYachtGame')).stateVersion, 0);
  assert.equal(b.requests.length, 0); assert.equal(b.sockets.length, 0); assert.equal(b.store.has('familyRoomSession'), false);
  assert.equal(b.speech[0].text, '민서 차례예요!');
});

test('한 기기 굴림 중 bfcache 복귀에도 애니메이션 잠금이 남지 않는다', () => {
  const b = browser(); b.boot(); b.$('startGame').click(); b.$('rollDice').click();
  assert.equal(b.$('rollDice').disabled, true); b.fire('pagehide'); b.fire('pageshow', { persisted: true });
  assert.equal(b.$('rollDice').disabled, false); b.$('rollDice').click();
  assert.equal(JSON.parse(b.store.get('familyYachtGame')).publicBoard.rollCount, 2);
});

test('파일 한도·이름 삽입 방식·기존 설정 요소와 상대 로드를 유지한다', () => {
  for (const [file, limit] of [['family-room.js', 300], ['family-room-ui.js', 400], ['family-room.css', 200],
    ['family-players.js', 184], ['yacht-ui.js', 600], ['yacht.html', 150]]) {
    const source = read(file); assert.ok(source.trimEnd().split('\n').length <= limit, file);
    assert.doesNotMatch(source, /innerHTML/);
  }
  const html = read('yacht.html');
  for (const id of ['setupTitle', 'playerCount', 'playerSetup', 'setupError', 'startGame'])
    assert.ok(html.indexOf(`id="${id}"`) < html.indexOf('id="resumeView"'));
  assert.ok(html.indexOf('src="family-room.js"') < html.indexOf('src="family-room-ui.js"'));
});
