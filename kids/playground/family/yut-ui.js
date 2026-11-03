// 가족 윷놀이 화면. 규칙과 상태는 YutEngine이 전담합니다.
(() => {
  const E = window.YutEngine, F = window.FamilyPlayers, KEY = 'familyYutGame';
  const MODES = { helper: '도우미', tactic: '전술', classic: '클래식' };
  const THROW_NAMES = { backdo: '빽도', do: '도', gae: '개', geol: '걸', yut: '윷', mo: '모' };
  const THROW_STEPS = { backdo: '뒤로 1칸', do: '1칸', gae: '2칸', geol: '3칸', yut: '4칸', mo: '5칸' };
  const CELL_COORDS = {
    1: [100, 80], 2: [100, 60], 3: [100, 40], 4: [100, 20], 5: [100, 0],
    6: [80, 0], 7: [60, 0], 8: [40, 0], 9: [20, 0], 10: [0, 0],
    11: [0, 20], 12: [0, 40], 13: [0, 60], 14: [0, 80], 15: [0, 100],
    16: [20, 100], 17: [40, 100], 18: [60, 100], 19: [80, 100], 20: [100, 100],
    21: [83.3, 16.7], 22: [66.7, 33.3], 23: [50, 50], 24: [33.3, 66.7], 25: [16.7, 83.3],
    26: [16.7, 16.7], 27: [33.3, 33.3], 28: [66.7, 66.7], 29: [83.3, 83.3]
  };

  const $ = id => document.getElementById(id);
  let state = null, saved = null, setup = null, booted = false, muted = false, effectGeneration = 0;
  let selectedThrowIndex = null, selectedMove = null;
  let lastSticks = null, lastThrowResult = '', actionMessage = '', moveStatusText = '';
  let room = null, roomUI = null, roomSnapshot = null, roomLocked = false, roomInvalid = false, roomPieceCount = 4;

  // 가락 모양은 방에서만 함께 보내고, 규칙 엔진과 한 기기 저장에는 넣지 않습니다.
  function gameState(value) { const { lastSticks, ...game } = value; return game; }
  function validSnapshot(s) {
    try {
      if (!window.FamilyRoomUI.validRoom(s, 'yut') || s.room.maxSeats !== 4) return false;
      if (s.room.phase === 'lobby') return s.state === null;
      const v = gameState(s.state), sticks = s.state.lastSticks;
      if (!E.isValidSaved(v) || v.players.length !== s.seats.length || !v.players.every(p =>
        window.FamilyRoomUI.usableAvatar(p.avatar) && s.seats.some(seat => seat.id === p.id))) return false;
      const thrown = v.publicBoard.log.findLast(a => a.type === 'THROW');
      if (!thrown) return sticks === null;
      if (!Array.isArray(sticks) || sticks.length !== 4 || sticks.some(x => typeof x !== 'boolean')) return false;
      let index = 0;
      return E.rollSticks(() => sticks[index++] ? 0 : 1).result === thrown.result;
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
    return { begun: begun && rights.turn, turn: changed && !v.result && rights.turn && !before && !begun,
      end: changed && !!v.result, focus: !initial && rights.turn && !v.result && (!before || changed),
      host: rights.host, seated: rights.seated };
  }
  const myTurn = () => !room || window.FamilyRoom.permissionsFor(roomSnapshot).turn;
  const canInput = () => !!state && !roomInvalid && (room ? inputFor(roomSnapshot, roomLocked) : !state.result);
  function submit(next, sticks = roomSnapshot.state.lastSticks) {
    if (!roomLocked && !roomInvalid) room.submit({ ...next, lastSticks: next.lastAction?.type === 'REMATCH' ? null : sticks });
  }
  function resetTransient() {
    selectedThrowIndex = null; selectedMove = null; lastSticks = null;
    lastThrowResult = ''; actionMessage = ''; moveStatusText = '';
  }

  function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  }

  function button(text, action, className) {
    const node = element('button', text, className);
    node.type = 'button';
    if (action) node.addEventListener('click', action);
    return node;
  }

  function setView(id) {
    ['setupView', 'resumeView', 'gameView', 'roomView'].forEach(view => {
      const el = $(view);
      if (el) el.hidden = view !== id;
    });
    if (!room && id === 'gameView' && $('roomStatus')) $('roomStatus').hidden = true;
  }

  function stopAudio() {
    if (typeof window.stopFairyTTS === 'function') window.stopFairyTTS();
  }

  function say(text, after) {
    if (muted || typeof window.speakFairyTTS !== 'function') { if (after) after(); return; }
    let done = false;
    const finish = () => { if (!done) { done = true; if (after) after(); } };
    try { Promise.resolve(window.speakFairyTTS(text, finish, { skipPreset: true })).catch(finish); }
    catch { finish(); }
  }

  function removeSaved() {
    try { localStorage.removeItem(KEY); } catch { /* 저장 차단 대응 */ }
  }

  function persist() {
    if (room) return;
    try {
      if (state.result) localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, JSON.stringify(state));
      $('saveStatus').textContent = '';
    } catch {
      $('saveStatus').textContent = '이 기기에 저장하지 못했어요. 창을 닫으면 이어서 할 수 없어요.';
    }
  }

  function readSaved() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const val = JSON.parse(raw);
      if (!E.isValidSaved(val) || val.result) { removeSaved(); return null; }
      return val;
    } catch { removeSaved(); return null; }
  }

  function announceStart() {
    say(`${state.players[0].name}부터 던져요!`);
  }

  function celebrate({ speak = true, reward = true } = {}) {
    stopAudio();
    const winner = state.players.find(p => p.id === state.result.winner);
    const finished = JSON.stringify(state), token = effectGeneration;
    const give = () => {
      if (reward && !muted && JSON.stringify(state) === finished && token === effectGeneration &&
          typeof window.fairyReward === 'function') {
        window.fairyReward();
      }
    };
    if (speak) say(`${winner.name}, 이겼어요!`, give);
    else give();
  }

  function pickDefaultThrowIndex(s) {
    if (!s || s.publicBoard.phase !== 'move' || s.result) return null;
    const legal = E.legalMoves(s);
    const idx = s.publicBoard.pending.findIndex((_, i) => legal.some(m => m.throwIndex === i));
    return idx >= 0 ? idx : null;
  }

  function handleCellClick(pos) {
    if (!canInput() || state.publicBoard.phase !== 'move') return;

    // 1단계: 고른 말이 있고 누른 칸이 그 말의 도착 칸이면 이동 확정
    if (selectedMove && selectedMove.to === pos) {
      commitMove();
      return;
    }

    // 2단계: 고른 칩의 legalMoves 항목 중 from이 누른 칸인 것 선택
    const legal = E.legalMoves(state);
    const targetMove = legal.find(m => m.throwIndex === selectedThrowIndex && m.from === pos);
    if (targetMove) {
      selectedMove = targetMove;
      moveStatusText = '';
      renderGame();
      return;
    }

    // 3단계: 없으면 고른 것 유지하고 문구 안내
    moveStatusText = '이 말은 지금 움직일 수 없어요.';
    renderControls();
  }

  function commitMove() {
    if (!selectedMove || !canInput() || state.publicBoard.phase !== 'move') return;
    const move = selectedMove;
    const captures = move.captures || [], joins = move.joins || [], isFinish = move.to === E.DONE;
    const next = E.applyMove(state, move.pieceIds[0], move.throwIndex);
    if (next === state) return;
    if (room) { submit(next); return; }

    if (next.result) actionMessage = '';
    else if (captures.length > 0) actionMessage = '잡았어요! 한 번 더 던져요!';
    else if (joins.length > 0) actionMessage = '업었어요!';
    else if (isFinish) actionMessage = '완주했어요!';
    else actionMessage = '';

    state = next;
    selectedMove = null;
    moveStatusText = '';
    selectedThrowIndex = pickDefaultThrowIndex(state);
    persist();
    renderGame();
    if (state.result) {
      $('endTitle').focus();
      celebrate();
    } else {
      $('turnBanner').focus();
    }
  }

  function handleThrow() {
    if (!canInput() || state.publicBoard.phase !== 'throw') return;
    const roll = E.rollSticks();
    if (room) { submit(E.applyThrow(state, roll.result), roll.sticks); return; }
    lastSticks = roll.sticks;
    lastThrowResult = `${THROW_NAMES[roll.result]}! ${THROW_STEPS[roll.result]}`;

    const prevTurn = state.turnPlayer;
    const next = E.applyThrow(state, roll.result);

    if (roll.result === 'yut' || roll.result === 'mo') actionMessage = '한 번 더 던져요!';
    else if (prevTurn !== next.turnPlayer && next.publicBoard.pending.length === 0) actionMessage = '움직일 말이 없어 넘어가요.';
    else actionMessage = '';

    state = next;
    selectedMove = null;
    moveStatusText = '';
    selectedThrowIndex = pickDefaultThrowIndex(state);
    persist();
    renderGame();
    $('turnBanner').focus();
  }

  function renderBoard() {
    const boardEl = $('board'), b = state.publicBoard;
    const player = state.players[state.turnPlayer];
    const legal = !myTurn() || state.result || b.phase !== 'move' ? [] : E.legalMoves(state).filter(m => m.throwIndex === selectedThrowIndex);
    const assist = player.assist;

    // SVG 보존하며 yut-cell 갱신
    const cells = boardEl.querySelectorAll('.yut-cell');
    if (cells.length !== 29) {
      const svg = boardEl.querySelector('svg');
      boardEl.replaceChildren();
      if (svg) boardEl.append(svg);
      for (let pos = 1; pos <= 29; pos++) {
        const [x, y] = CELL_COORDS[pos];
        const cell = button('', () => handleCellClick(pos), 'yut-cell');
        cell.dataset.pos = String(pos);
        cell.style.setProperty('--x', x);
        cell.style.setProperty('--y', y);
        boardEl.append(cell);
      }
    }

    const cellNodes = boardEl.querySelectorAll('.yut-cell');
    cellNodes.forEach(cell => {
      const pos = Number(cell.dataset.pos);
      cell.className = 'yut-cell';
      cell.replaceChildren();

      const piecesHere = b.pieces.filter(p => p.pos === pos);
      let label = pos === 20 ? '20번 칸(참먹이)' : pos === 23 ? '23번 칸(방)' : `${pos}번 칸`;
      if (piecesHere.length > 0) {
        const owner = state.players.find(p => p.id === piecesHere[0].owner);
        const ownerIdx = state.players.findIndex(p => p.id === piecesHere[0].owner);
        label += `, ${owner ? owner.name : ''} 말 ${piecesHere.length}개`;
        const token = element('span', undefined, `token token-${ownerIdx}`);
        token.dataset.owner = piecesHere[0].owner;
        token.dataset.count = String(piecesHere.length);
        if (owner) F.playerAvatar(token, owner, state.players);
        if (piecesHere.length > 1) {
          token.append(element('span', String(piecesHere.length), 'token-badge'));
        }
        cell.append(token);
      } else {
        label += ', 빈 칸';
        if (pos === 20) { const tag = element('span', undefined, 'cell-tag'); tag.append(element('span', '출발·'), element('span', '도착')); cell.append(tag); }
      }

      if (myTurn() && b.phase === 'move' && !state.result) {
        if (assist === 'helper' && !selectedMove && legal.some(m => m.from === pos)) {
          cell.classList.add('can-move');
        }
        if (selectedMove && selectedMove.to === pos) {
          cell.classList.add('target');
          if (assist !== 'classic' && selectedMove.captures.length > 0) cell.classList.add('capture');
        }
      }

      cell.disabled = b.phase !== 'move' || !canInput();
      cell.setAttribute('aria-label', label);
    });

    // finishCell
    const finishBtn = $('finishCell');
    finishBtn.disabled = !(b.phase === 'move' && canInput() && selectedMove && selectedMove.to === E.DONE);
    finishBtn.classList.remove('target');
    if (myTurn() && b.phase === 'move' && !state.result && selectedMove && selectedMove.to === E.DONE) {
      finishBtn.classList.add('target');
    }

    // waitingTray
    const tray = $('waitingTray');
    tray.replaceChildren();
    const myWaiting = b.pieces.filter(p => p.owner === player.id && p.pos === E.WAITING);
    if (myWaiting.length > 0) {
      const waitBtn = button(`대기 말 ${myWaiting.length}개`, () => handleCellClick(E.WAITING), 'waiting-token');
      waitBtn.dataset.pos = '-1';
      waitBtn.disabled = b.phase !== 'move' || !canInput();
      if (myTurn() && b.phase === 'move' && !state.result && assist === 'helper' && !selectedMove && legal.some(m => m.from === E.WAITING)) {
        waitBtn.classList.add('can-move');
      }
      tray.append(waitBtn);
    }
  }

  function renderSticks() {
    const tray = $('sticks');
    tray.replaceChildren();
    if (lastSticks) {
      lastSticks.forEach((isFlat, i) => {
        const s = element('div', undefined, `stick${isFlat ? ' flat' : ''}${i === 0 ? ' mark' : ''}`);
        tray.append(s);
      });
    }
    $('throwResult').textContent = lastThrowResult;
  }

  function renderPending() {
    const list = $('pendingList');
    list.replaceChildren();
    const b = state.publicBoard, legal = E.legalMoves(state);
    b.pending.forEach((res, index) => {
      const chip = button(THROW_NAMES[res] || res, () => {
        if (!canInput() || state.publicBoard.phase !== 'move') return;
        selectedThrowIndex = index;
        selectedMove = null;
        moveStatusText = '';
        renderGame();
      }, 'throw-chip');
      chip.dataset.index = String(index);
      const isSelected = selectedThrowIndex === index;
      chip.setAttribute('aria-pressed', String(isSelected));
      const hasLegalMove = b.phase === 'move' && legal.some(m => m.throwIndex === index);
      chip.disabled = b.phase !== 'move' || !hasLegalMove || !canInput();
      list.append(chip);
    });
  }

  function renderPlayers() {
    const host = $('playersStatus');
    host.replaceChildren();
    state.players.forEach((p, i) => {
      const pPieces = state.publicBoard.pieces.filter(x => x.owner === p.id);
      const wait = pPieces.filter(x => x.pos === E.WAITING).length;
      const onBoard = pPieces.filter(x => x.pos >= 1 && x.pos <= 29).length;
      const done = pPieces.filter(x => x.pos === E.DONE).length;
      const card = element('div', undefined, `player-status${state.turnPlayer === i && !state.result ? ' current' : ''}`);
      card.append(element('strong', p.name), element('span', ` 대기 ${wait} · 판 ${onBoard} · 완주 ${done}`));
      host.append(card);
    });
  }

  function renderControls() {
    const b = state.publicBoard, player = state.players[state.turnPlayer];
    $('throwButton').disabled = b.phase !== 'throw' || !canInput();
    $('confirmMove').disabled = !selectedMove || b.phase !== 'move' || !canInput();

    let moveText = '';
    if (!myTurn()) moveText = '기다리는 동안 판을 살펴봐요.';
    else if (moveStatusText) moveText = moveStatusText;
    else if (b.phase === 'throw') moveText = '윷을 던져요!';
    else if (!selectedMove) moveText = '옮길 말을 골라요.';
    else moveText = '도착 칸을 다시 누르거나 「여기로 옮기기」를 눌러요.';
    $('moveText').textContent = moveText;

    let help = '';
    if (myTurn() && b.phase === 'move' && !state.result) {
      if (player.assist === 'helper') {
        help = selectedMove?.captures.length ? '잡을 수 있어요!' : '빛나는 말을 골라요.';
      } else if (player.assist === 'tactic') {
        help = selectedMove?.captures.length ? '잡을 수 있어요!' : '';
      }
    }
    $('helpText').textContent = help;
    $('actionMessage').textContent = actionMessage;
  }

  function renderGame() {
    setView('gameView');
    const player = state.players[state.turnPlayer];
    const isOver = !!state.result;

    ['turnHeading', 'assistLabel', 'playersStatus', 'helpText', 'moveText', 'throwButton', 'confirmMove'].forEach(id => {
      $(id).hidden = isOver;
    });

    $('turnBanner').textContent = isOver ? '' : myTurn() ? `${player.name} 차례!` : `${player.name} 차례예요. 기다려요`;
    $('assistLabel').textContent = isOver ? '' : `${myTurn() ? `${MODES[player.assist]} · ` : ''}말 ${state.publicBoard.pieceCount}개`;
    if (!isOver) F.playerAvatar($('turnAvatar'), player, state.players);

    renderBoard();
    renderSticks();
    renderPending();
    renderPlayers();
    renderControls();

    $('endView').hidden = !isOver;
    if (isOver) {
      const winner = state.players.find(p => p.id === state.result.winner);
      $('endTitle').textContent = `🏆 ${winner.name}, 이겼어요!`;
      $('winners').replaceChildren();
      const avatar = element('span');
      F.playerAvatar(avatar, winner, state.players);
      $('winners').append(avatar);
    }
  }

  function redraw() {
    const active = document.activeElement, pos = active?.dataset.pos, index = active?.dataset.index;
    renderGame();
    if (!canInput()) return;
    if (pos === '-1') $('waitingTray').querySelector('button')?.focus({ preventScroll: true });
    else if (pos) [...$('board').querySelectorAll('.yut-cell')].find(n => n.dataset.pos === pos)?.focus({ preventScroll: true });
    else if (index !== undefined) $('pendingList').children[Number(index)]?.focus({ preventScroll: true });
  }

  function applySnapshot(s, previous, meta) {
    if (!validSnapshot(s)) { roomUI.invalid(); return; }
    try {
      const fx = effectsFor(previous, s, meta.initial), next = gameState(s.state);
      const changed = JSON.stringify(next) !== JSON.stringify(state);
      if (changed) { effectGeneration++; stopAudio(); }
      if (changed || !inputFor(s, false)) {
        selectedMove = null; moveStatusText = ''; selectedThrowIndex = pickDefaultThrowIndex(next);
      }
      roomSnapshot = s; state = next; roomLocked = room.getStatus().locked;
      lastSticks = s.state.lastSticks;
      const thrown = state.publicBoard.log.findLast(a => a.type === 'THROW'), action = state.lastAction;
      lastThrowResult = thrown ? `${THROW_NAMES[thrown.result]}! ${THROW_STEPS[thrown.result]}` : '';
      actionMessage = '';
      if (!state.result && action?.type === 'THROW') {
        if (['yut', 'mo'].includes(action.result)) actionMessage = '한 번 더 던져요!';
        else if (state.players[state.turnPlayer].id !== action.by) actionMessage = '움직일 말이 없어 넘어가요.';
      } else if (!state.result && action?.type === 'MOVE') {
        actionMessage = action.captured.length ? '잡았어요! 한 번 더 던져요!' : action.to === E.DONE ? '완주했어요!' :
          state.publicBoard.pieces.filter(p => p.owner === action.by && p.pos === action.to).length > action.pieceIds.length ? '업었어요!' : '';
      }
      redraw();
      $('playAgain').disabled = roomLocked || !fx.seated;
      $('backToSetup').textContent = fx.host ? '대기실로' : '방 나가기';
      if (fx.end) {
        if (fx.seated) $('endTitle').focus();
        celebrate({ speak: fx.host, reward: fx.seated });
      } else {
        if (fx.focus) $('turnBanner').focus();
        if (fx.begun) announceStart();
        else if (fx.turn) say(`${state.players[state.turnPlayer].name} 차례예요!`);
      }
    } catch { roomInvalid = true; roomUI.invalid(); }
  }

  function showSaved() {
    setView(saved ? 'resumeView' : 'setupView');
    if (saved) $('resumeSummary').textContent = `${saved.players.map(p => p.name).join(' · ')} · 말 ${saved.publicBoard.pieceCount}개`;
  }
  function piecePicker() {
    const label = element('label', '말 개수', 'count-label'), select = element('select');
    select.setAttribute('aria-label', '말 개수');
    [2, 3, 4].forEach(count => { const option = element('option', `${count}개`); option.value = String(count); select.append(option); });
    select.value = String(roomPieceCount);
    select.addEventListener('change', () => { roomPieceCount = Number(select.value); });
    label.append(select); return label;
  }

  function boot() {
    if (booted) return;
    booted = true;

    setup = F.createSetup({ host: $('playerSetup'), count: 2, min: 2, max: 4, modes: MODES });
    $('playerCount').addEventListener('change', () => {
      setup.setCount(Number($('playerCount').value));
    });

    saved = readSaved();
    showSaved();

    $('startGame').addEventListener('click', () => {
      $('setupError').textContent = '';
      try {
        state = E.createGame(setup.getPlayers(), Number($('pieceCount').value));
      } catch (e) {
        $('setupError').textContent = e.message;
        return;
      }
      resetTransient();
      stopAudio();
      persist();
      renderGame();
      $('turnBanner').focus();
      announceStart();
    });

    $('throwButton').addEventListener('click', handleThrow);
    $('confirmMove').addEventListener('click', commitMove);
    $('finishCell').addEventListener('click', () => {
      if (selectedMove && selectedMove.to === E.DONE) commitMove();
    });

    $('newGame').addEventListener('click', () => {
      removeSaved();
      saved = null;
      setView('setupView');
    });

    $('resumeGame').addEventListener('click', () => {
      state = saved;
      saved = null;
      resetTransient();
      selectedThrowIndex = pickDefaultThrowIndex(state);
      renderGame();
      $('turnBanner').focus();
    });

    $('playAgain').addEventListener('click', () => {
      if (room) {
        if (state?.result && !roomLocked && window.FamilyRoom.permissionsFor(roomSnapshot).seated) submit(E.rematch(state));
        return;
      }
      effectGeneration++;
      stopAudio();
      state = E.rematch(state);
      resetTransient();
      persist();
      renderGame();
      $('turnBanner').focus();
      announceStart();
    });

    $('backToSetup').addEventListener('click', () => {
      if (room) { roomUI.back(); return; }
      effectGeneration++;
      stopAudio();
      state = null;
      selectedMove = null;
      selectedThrowIndex = null;
      setView('setupView');
      setup.render();
    });

    window.FamilySound.bindToggle($('soundToggle'), value => { muted = value; if (muted) stopAudio(); });

    document.addEventListener('visibilitychange', () => { if (document.hidden) { effectGeneration++; stopAudio(); } });
    window.addEventListener('pagehide', () => { effectGeneration++; stopAudio(); });
    if (window.FamilyRoomUI) {
      roomUI = window.FamilyRoomUI.mount({ gameType: 'yut', maxSeats: 4, title: '가족 윷놀이', modes: MODES,
        createGame: seats => ({ ...E.createGame(seats, roomPieceCount), lastSticks: null }),
        hostOptions: piecePicker, validate: validSnapshot,
        onRoom: value => {
          room = value; roomSnapshot = null; roomInvalid = false; roomLocked = !!value;
          resetTransient(); effectGeneration++; stopAudio();
        }, onView: setView, onGame: applySnapshot,
        onLobby: () => { resetTransient(); effectGeneration++; stopAudio(); state = null; roomSnapshot = null; },
        onLock: locked => {
          roomLocked = locked;
          if (locked) selectedMove = null;
          if (room && !roomInvalid && state && roomSnapshot) {
            try { redraw(); $('playAgain').disabled = locked || !window.FamilyRoom.permissionsFor(roomSnapshot).seated; }
            catch { roomInvalid = true; roomUI.invalid(); }
          }
        },
        onLocal: value => {
          resetTransient(); effectGeneration++; stopAudio(); state = value ? gameState(value) : null;
          $('backToSetup').textContent = '처음으로'; $('playAgain').disabled = false;
          if (value) { selectedThrowIndex = pickDefaultThrowIndex(state); persist(); renderGame(); }
          else { saved = readSaved(); showSaved(); }
        } });
      roomUI.boot();
    }
  }

  window.YutUI = Object.freeze({ boot, validSnapshot, inputFor, effectsFor });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
