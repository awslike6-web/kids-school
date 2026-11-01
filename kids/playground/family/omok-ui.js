// 가족 오목 화면. 한 기기 저장과 가족 방의 확정 스냅샷 경로를 구분합니다.
(() => {
  const E = window.OmokEngine, F = window.FamilyPlayers, KEY = 'familyOmokGame';
  const MODES = { helper: '도우미', tactic: '전술', classic: '클래식' };
  const $ = id => document.getElementById(id);
  let state = null, saved = null, setup = null, selected = null, muted = false, booted = false;
  let room = null, roomUI = null, roomSnapshot = null, roomLocked = false, roomInvalid = false;
  let effectGeneration = 0, roomSize = 13;

  function validSnapshot(s) {
    try {
      if (!window.FamilyRoomUI.validRoom(s, 'omok') || s.room.maxSeats !== 2) return false;
      if (s.room.phase === 'lobby') return s.state === null;
      const v = s.state;
      // 다시 하기는 흑백을 바꾸므로 판의 사람 순서가 자리 순서와 다를 수 있습니다.
      return v?.gameType === 'omok' && E.isValidSaved(v) && v.players.length === s.seats.length &&
        v.players.every(p => window.FamilyRoomUI.usableAvatar(p.avatar) && s.seats.some(seat => seat.id === p.id));
    } catch { return false; }
  }

  function inputFor(s, locked) {
    return !!s && !locked && s.room.phase === 'playing' && window.FamilyRoom.permissionsFor(s).turn && !s.state.result;
  }
  function effectsFor(previous, current, initial = false) {
    const rights = window.FamilyRoom.permissionsFor(current), v = current.state;
    const changed = !initial && !!previous && current.room.rev > previous.room.rev &&
      JSON.stringify(previous.state) !== JSON.stringify(v);
    const before = window.FamilyRoom.permissionsFor(previous).turn;
    const begun = changed && !v.result && (v.lastAction === null || v.lastAction.type === 'REMATCH');
    // 내 기기에 두 자리가 있으면 매 수마다 말하지 않습니다. 무르기를 누른 기기에도 다시 말하지 않습니다.
    const turn = changed && !v.result && rights.turn && v.lastAction?.type === 'PLACE' && !before;
    return { begun: begun && rights.turn, turn, end: changed && !!v.result,
      focus: !initial && rights.turn && !v.result && (!before || changed),
      host: rights.host, seated: rights.seated };
  }
  const myTurn = () => !room || window.FamilyRoom.permissionsFor(roomSnapshot).turn;
  const canInput = () => !!state && !roomInvalid && (room ? inputFor(roomSnapshot, roomLocked) : !state.result);
  const ownsPlayer = id => !room || roomSnapshot.seats.some(seat => seat.id === id && seat.owner === roomSnapshot.you);
  function submit(next) { if (!roomLocked && !roomInvalid) room.submit(next); }

  function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  }

  function button(text, action, className) {
    const node = element('button', text, className);
    node.type = 'button'; node.addEventListener('click', action);
    return node;
  }

  function setView(id) {
    ['setupView', 'resumeView', 'gameView', 'roomView'].forEach(view => { if ($(view)) $(view).hidden = view !== id; });
    // 여러 기기 실패 안내가 한 기기 판 위에 남지 않게 합니다.
    if (!room && id === 'gameView' && $('roomStatus')) $('roomStatus').hidden = true;
  }

  function stopAudio() { if (typeof window.stopFairyTTS === 'function') window.stopFairyTTS(); }

  function say(text, after) {
    if (muted || typeof window.speakFairyTTS !== 'function') { if (after) after(); return; }
    let done = false;
    const finish = () => { if (!done) { done = true; if (after) after(); } };
    try { Promise.resolve(window.speakFairyTTS(text, finish, { skipPreset: true })).catch(finish); }
    catch (e) { finish(); }
  }

  function removeSaved() {
    try { localStorage.removeItem(KEY); } catch (e) { /* 저장이 막혀도 판은 계속됩니다. */ }
  }

  function persist() {
    if (room) return;
    try {
      if (state.result) localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, JSON.stringify(state));
      $('saveStatus').textContent = '';
    } catch (e) {
      $('saveStatus').textContent = '이 기기에 저장하지 못했어요. 창을 닫으면 이어서 할 수 없어요.';
    }
  }

  function readSaved() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const value = JSON.parse(raw);
      if (!E.isValidSaved(value) || value.result) { removeSaved(); return null; }
      return value;
    } catch (e) { removeSaved(); return null; }
  }

  function selectCell(x, y) {
    if (!canInput() || E.boardOf(state)[y][x]) return;
    if (selected?.x === x && selected?.y === y) { commitPlace(); return; }
    selected = { x, y }; renderBoard(); renderSelection();
    // 다시 그린 뒤에도 두 번째 터치와 키보드 입력이 같은 교차점으로 갑니다.
    $('board').children[y * state.publicBoard.size + x].focus({ preventScroll: true });
  }

  function renderSelection() {
    $('confirmPlace').disabled = !selected || !canInput();
    $('selectionText').textContent = state.result ? '함께 한 판을 마쳤어요.' : !myTurn() ? '기다리는 동안 판을 살펴봐요.' : selected ?
      `가로 ${selected.x + 1} 세로 ${selected.y + 1}, 한 번 더 누르거나 「여기에 두기」를 눌러요.` : '빈 칸을 골라 주세요.';
  }

  function renderBoard() {
    const board = E.boardOf(state), size = board.length, player = state.players[state.turnPlayer];
    const help = myTurn() ? E.hints(state, player.assist) : {}, key = (x, y) => `${x},${y}`;
    const win = new Set((help.win || []).map(([x, y]) => key(x, y)));
    const block = new Set((help.block || []).map(([x, y]) => key(x, y)));
    const line = new Set((state.result?.line || []).map(([x, y]) => key(x, y)));
    const last = state.publicBoard.moves.at(-1), host = $('board');
    host.replaceChildren(); host.style.setProperty('--size', size);
    host.setAttribute('aria-label', `${size}줄 오목판`);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const stone = board[y][x], preview = !stone && selected?.x === x && selected?.y === y;
      const cell = button('', () => selectCell(x, y), 'intersection');
      if (x === 0) cell.classList.add('edge-left');
      if (x === size - 1) cell.classList.add('edge-right');
      if (y === 0) cell.classList.add('edge-top');
      if (y === size - 1) cell.classList.add('edge-bottom');
      if (last?.x === x && last?.y === y) cell.classList.add('last-move');
      if (line.has(key(x, y))) cell.classList.add('winning');
      cell.setAttribute('aria-label', `가로 ${x + 1} 세로 ${y + 1}, ${stone ? stone === 'black' ? '흑돌' : '백돌' : '빈 칸'}${preview ? ', 미리보기' : ''}`);
      cell.setAttribute('aria-pressed', String(preview));
      cell.disabled = !!stone || !canInput();
      if (stone || preview) cell.append(element('span', undefined, `stone ${stone || player.stone}${preview ? ' preview' : ''}`));
      else if (win.has(key(x, y)) || block.has(key(x, y))) {
        const hint = element('span', undefined, `hint${win.has(key(x, y)) ? ' win' : ''}`);
        hint.setAttribute('aria-hidden', 'true'); cell.append(hint);
        cell.setAttribute('aria-label', `${cell.getAttribute('aria-label')}, ${win.has(key(x, y)) ? '두면 이겨요' : '여기를 막아요'}`);
      }
      host.append(cell);
    }
    $('helpText').textContent = state.result || !myTurn() ? '' : help.win?.length ? '초록 표시: 여기에 두면 이겨요!' :
      help.block?.length ? '점선 표시: 여기를 막아요!' : player.assist === 'classic' ? '' : '다섯 개를 잇는 길을 찾아요.';
  }

  function canUndo(p) {
    return !state.result && state.lastAction?.type === 'PLACE' && state.publicBoard.moves.at(-1)?.by === p.id &&
      !!state.publicBoard.undoLeft[p.id] && ownsPlayer(p.id) && !(room && (roomLocked || roomInvalid));
  }

  function renderPlayers() {
    $('playersStatus').replaceChildren();
    state.players.forEach((p, i) => {
      const card = element('div', undefined, `player-status${state.turnPlayer === i && !state.result ? ' current' : ''}`);
      card.append(element('strong', `${p.stone === 'black' ? '⚫' : '⚪'} ${p.name}`));
      const undoButton = button(`무르기 ${state.publicBoard.undoLeft[p.id]}회`, () => {
        // 버튼의 주인과 마지막 착수자가 일치할 때만 엔진에 요청합니다.
        if (!canUndo(p)) return;
        const next = E.undo(state);
        if (next === state) return;
        if (room) { submit(next); return; }
        state = next; selected = null; persist(); renderGame(); $('turnBanner').focus();
      });
      undoButton.setAttribute('aria-label', `${p.name} 무르기 ${state.publicBoard.undoLeft[p.id]}회 남음`);
      undoButton.disabled = !canUndo(p);
      card.append(undoButton); $('playersStatus').append(card);
    });
  }

  function renderGame() {
    setView('gameView');
    const player = state.players[state.turnPlayer], stone = player.stone === 'black' ? '⚫' : '⚪';
    // 승부가 나면 차례·무르기·두기 칸을 숨겨 결과가 판 바로 아래에 보이게 한다.
    ['turnHeading', 'assistLabel', 'playersStatus', 'helpText', 'selectionText', 'confirmPlace'].forEach(id => { $(id).hidden = !!state.result; });
    $('turnBanner').textContent = state.result ? '' : myTurn() ? `${stone} ${player.name} 차례!` : `${stone} ${player.name} 차례예요. 기다려요`;
    $('assistLabel').textContent = state.result ? '' : myTurn() ? `${MODES[player.assist]} · ${state.publicBoard.size}줄` : `${state.publicBoard.size}줄`;
    if (!state.result) F.playerAvatar($('turnAvatar'), player, state.players);
    renderBoard(); renderPlayers(); renderSelection();
    $('endView').hidden = !state.result;
    if (state.result) {
      $('endTitle').textContent = state.result.type === 'win' ?
        `🏆 ${state.players.find(p => p.id === state.result.winner).name}, 이겼어요!` : '🤝 무승부예요!';
      $('winners').replaceChildren();
      const people = state.result.type === 'win' ? state.players.filter(p => p.id === state.result.winner) : state.players;
      people.forEach(p => {
        const avatar = element('span'); F.playerAvatar(avatar, p, state.players); $('winners').append(avatar);
      });
    }
  }

  // 판을 다시 그려도 사용자가 고르던 교차점의 포커스를 빼앗지 않습니다.
  function redraw() {
    const index = [...$('board').children].indexOf(document.activeElement);
    renderGame();
    if (index >= 0) $('board').children[index]?.focus({ preventScroll: true });
  }

  function announceStart() {
    say(`${state.players[0].name} 흑돌로 먼저 두어요!`);
  }

  function celebrate({ speak = true, reward = true } = {}) {
    stopAudio();
    const finished = JSON.stringify(state), token = effectGeneration;
    const give = () => {
      if (reward && !muted && JSON.stringify(state) === finished && token === effectGeneration &&
          typeof window.fairyReward === 'function') window.fairyReward();
    };
    if (!speak) { give(); return; }
    say(state.result.type === 'win' ? `${state.players.find(p => p.id === state.result.winner).name}, 이겼어요!` : '무승부예요! 함께 잘 두었어요!', give);
  }

  function commitPlace() {
    if (!selected || !canInput()) return;
    const next = E.place(state, selected.x, selected.y);
    if (next === state) return;
    if (room) { submit(next); return; }
    state = next; selected = null; persist(); renderGame();
    if (!state.result) { $('turnBanner').focus(); return; }
    $('endTitle').focus(); celebrate();
  }

  function applySnapshot(s, previous, meta) {
    if (!validSnapshot(s)) { roomUI.invalid(); return; }
    try {
      const fx = effectsFor(previous, s, meta.initial);
      // 미리보기는 이 기기에만 있습니다. 접속 알림처럼 판이 그대로면 지우지 않습니다.
      if (JSON.stringify(s.state) !== JSON.stringify(state) || !inputFor(s, false)) selected = null;
      roomSnapshot = s; state = s.state; roomLocked = false;
      redraw();
      $('playAgain').disabled = !fx.seated;
      $('backToSetup').textContent = fx.host ? '대기실로' : '방 나가기';
      if (fx.end) {
        if (fx.seated) $('endTitle').focus();
        // 승부 음성은 방장 기기만, 보상 소리는 자리가 있는 기기만 냅니다.
        celebrate({ speak: fx.host, reward: fx.seated });
        return;
      }
      if (fx.focus) $('turnBanner').focus();
      if (fx.begun) { stopAudio(); announceStart(); }
      else if (fx.turn) { stopAudio(); say(`${state.players[state.turnPlayer].name} 차례예요!`); }
    } catch { roomInvalid = true; roomUI.invalid(); }
  }

  function showSaved() {
    setView(saved ? 'resumeView' : 'setupView');
    if (saved) $('resumeSummary').textContent = `${saved.players.map(p => p.name).join(' · ')} · ${saved.publicBoard.size}줄 · ${saved.publicBoard.moves.length}수`;
  }

  function sizePicker() {
    const label = element('label', '판 크기', 'count-label'), select = element('select');
    select.setAttribute('aria-label', '판 크기');
    E.SIZES.forEach(size => { const option = element('option', `${size}줄`); option.value = String(size); select.append(option); });
    select.value = String(roomSize);
    select.addEventListener('change', () => { roomSize = Number(select.value); });
    label.append(select);
    return label;
  }

  function boot() {
    if (booted) return;
    booted = true;
    setup = F.createSetup({ host: $('playerSetup'), count: 2, min: 2, max: 2, modes: MODES });
    saved = readSaved();
    if (saved) showSaved();
    $('startGame').addEventListener('click', () => {
      $('setupError').textContent = '';
      try { state = E.createGame(setup.getPlayers(), Number($('boardSize').value)); }
      catch (e) { $('setupError').textContent = e.message; return; }
      selected = null; saved = null; stopAudio(); persist(); renderGame(); $('turnBanner').focus(); announceStart();
    });
    $('confirmPlace').addEventListener('click', commitPlace);
    $('newGame').addEventListener('click', () => { removeSaved(); saved = null; setView('setupView'); });
    $('resumeGame').addEventListener('click', () => {
      state = saved; saved = null; selected = null; renderGame(); $('turnBanner').focus();
    });
    $('playAgain').addEventListener('click', () => {
      if (room) {
        if (state?.result && !roomLocked && window.FamilyRoom.permissionsFor(roomSnapshot).seated) submit(E.rematch(state));
        return;
      }
      stopAudio(); state = E.rematch(state); selected = null; persist(); renderGame(); $('turnBanner').focus(); announceStart();
    });
    $('backToSetup').addEventListener('click', () => {
      if (room) { roomUI.back(); return; }
      stopAudio(); state = null; selected = null; setView('setupView'); setup.render();
    });
    $('soundToggle').addEventListener('click', () => {
      muted = !muted; $('soundToggle').setAttribute('aria-pressed', String(muted));
      $('soundToggle').textContent = muted ? '🔇 안내 음성' : '🔊 안내 음성';
      if (muted) stopAudio();
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden) stopAudio(); });
    window.addEventListener('pagehide', () => { effectGeneration++; stopAudio(); });
    if (window.FamilyRoomUI) {
      roomUI = window.FamilyRoomUI.mount({ gameType: 'omok', maxSeats: 2, title: '가족 오목', modes: MODES,
        createGame: seats => E.createGame(seats, roomSize), hostOptions: sizePicker, validate: validSnapshot,
        onRoom: value => {
          room = value; roomSnapshot = null; roomInvalid = false; roomLocked = !!value;
          selected = null; effectGeneration++; stopAudio();
        }, onView: setView, onGame: applySnapshot,
        onLobby: () => { selected = null; effectGeneration++; stopAudio(); state = null; roomSnapshot = null; },
        onLock: locked => {
          roomLocked = locked;
          if (room && !roomInvalid && state && roomSnapshot) {
            try {
              redraw();
              $('playAgain').disabled = locked || !window.FamilyRoom.permissionsFor(roomSnapshot).seated;
            } catch { roomInvalid = true; roomUI.invalid(); }
          }
        },
        onLocal: value => {
          selected = null; effectGeneration++; stopAudio(); state = value;
          $('backToSetup').textContent = '처음으로'; $('playAgain').disabled = false;
          if (value) { persist(); renderGame(); }
          else { saved = readSaved(); showSaved(); }
        } });
      roomUI.boot();
    }
  }

  window.OmokUI = Object.freeze({ boot, validSnapshot, inputFor, effectsFor });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
