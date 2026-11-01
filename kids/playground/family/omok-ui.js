// 한 기기 가족 오목. 게임 기록은 이 기기에만 보관합니다.
(() => {
  const E = window.OmokEngine, F = window.FamilyPlayers, KEY = 'familyOmokGame';
  const MODES = { helper: '도우미', tactic: '전술', classic: '클래식' };
  const $ = id => document.getElementById(id);
  let state = null, saved = null, setup = null, selected = null, muted = false, booted = false;

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
    ['setupView', 'resumeView', 'gameView'].forEach(view => { $(view).hidden = view !== id; });
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
    if (state.result || E.boardOf(state)[y][x]) return;
    if (selected?.x === x && selected?.y === y) { commitPlace(); return; }
    selected = { x, y }; renderBoard(); renderSelection();
    // 다시 그린 뒤에도 두 번째 터치와 키보드 입력이 같은 교차점으로 갑니다.
    $('board').children[y * state.publicBoard.size + x].focus({ preventScroll: true });
  }

  function renderSelection() {
    $('confirmPlace').disabled = !selected || !!state.result;
    $('selectionText').textContent = state.result ? '함께 한 판을 마쳤어요.' : selected ?
      `가로 ${selected.x + 1} 세로 ${selected.y + 1}, 한 번 더 누르거나 「여기에 두기」를 눌러요.` : '빈 칸을 골라 주세요.';
  }

  function renderBoard() {
    const board = E.boardOf(state), size = board.length, player = state.players[state.turnPlayer];
    const help = E.hints(state, player.assist), key = (x, y) => `${x},${y}`;
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
      cell.disabled = !!stone || !!state.result;
      if (stone || preview) cell.append(element('span', undefined, `stone ${stone || player.stone}${preview ? ' preview' : ''}`));
      else if (win.has(key(x, y)) || block.has(key(x, y))) {
        const hint = element('span', undefined, `hint${win.has(key(x, y)) ? ' win' : ''}`);
        hint.setAttribute('aria-hidden', 'true'); cell.append(hint);
        cell.setAttribute('aria-label', `${cell.getAttribute('aria-label')}, ${win.has(key(x, y)) ? '두면 이겨요' : '여기를 막아요'}`);
      }
      host.append(cell);
    }
    $('helpText').textContent = state.result ? '' : help.win?.length ? '초록 표시: 여기에 두면 이겨요!' :
      help.block?.length ? '점선 표시: 여기를 막아요!' : player.assist === 'classic' ? '' : '다섯 개를 잇는 길을 찾아요.';
  }

  function renderPlayers() {
    $('playersStatus').replaceChildren();
    state.players.forEach((p, i) => {
      const card = element('div', undefined, `player-status${state.turnPlayer === i && !state.result ? ' current' : ''}`);
      card.append(element('strong', `${p.stone === 'black' ? '⚫' : '⚪'} ${p.name}`));
      const undoButton = button(`무르기 ${state.publicBoard.undoLeft[p.id]}회`, () => {
        // 버튼의 주인과 마지막 착수자가 일치할 때만 엔진에 요청합니다.
        if (state.publicBoard.moves.at(-1)?.by !== p.id) return;
        const next = E.undo(state);
        if (next !== state) { state = next; selected = null; persist(); renderGame(); $('turnBanner').focus(); }
      });
      undoButton.setAttribute('aria-label', `${p.name} 무르기 ${state.publicBoard.undoLeft[p.id]}회 남음`);
      undoButton.disabled = !!state.result || state.lastAction?.type !== 'PLACE' ||
        state.publicBoard.moves.at(-1)?.by !== p.id || !state.publicBoard.undoLeft[p.id];
      card.append(undoButton); $('playersStatus').append(card);
    });
  }

  function renderGame() {
    setView('gameView');
    const player = state.players[state.turnPlayer];
    // 승부가 나면 차례·무르기·두기 칸을 숨겨 결과가 판 바로 아래에 보이게 한다.
    ['turnHeading', 'assistLabel', 'playersStatus', 'helpText', 'selectionText', 'confirmPlace'].forEach(id => { $(id).hidden = !!state.result; });
    $('turnBanner').textContent = state.result ? '' : `${player.stone === 'black' ? '⚫' : '⚪'} ${player.name} 차례!`;
    $('assistLabel').textContent = state.result ? '' : `${MODES[player.assist]} · ${state.publicBoard.size}줄`;
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

  function announceStart() {
    say(`${state.players[0].name} 흑돌로 먼저 두어요!`);
  }

  function commitPlace() {
    if (!selected || state.result) return;
    const next = E.place(state, selected.x, selected.y);
    if (next === state) return;
    state = next; selected = null; persist(); renderGame();
    if (!state.result) { $('turnBanner').focus(); return; }
    $('endTitle').focus(); stopAudio();
    const finished = state;
    say(state.result.type === 'win' ? `${state.players.find(p => p.id === state.result.winner).name}, 이겼어요!` : '무승부예요! 함께 잘 두었어요!', () => {
      if (!muted && state === finished && typeof window.fairyReward === 'function') window.fairyReward();
    });
  }

  function boot() {
    if (booted) return;
    booted = true;
    setup = F.createSetup({ host: $('playerSetup'), count: 2, min: 2, max: 2, modes: MODES });
    saved = readSaved();
    if (saved) {
      setView('resumeView');
      $('resumeSummary').textContent = `${saved.players.map(p => p.name).join(' · ')} · ${saved.publicBoard.size}줄 · ${saved.publicBoard.moves.length}수`;
    }
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
      stopAudio(); state = E.rematch(state); selected = null; persist(); renderGame(); $('turnBanner').focus(); announceStart();
    });
    $('backToSetup').addEventListener('click', () => {
      stopAudio(); state = null; selected = null; setView('setupView'); setup.render();
    });
    $('soundToggle').addEventListener('click', () => {
      muted = !muted; $('soundToggle').setAttribute('aria-pressed', String(muted));
      $('soundToggle').textContent = muted ? '🔇 안내 음성' : '🔊 안내 음성';
      if (muted) stopAudio();
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden) stopAudio(); });
    window.addEventListener('pagehide', stopAudio);
  }

  window.OmokUI = Object.freeze({ boot });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
