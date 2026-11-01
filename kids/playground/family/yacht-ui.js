// 가족 야추 화면. 한 기기 저장과 가족 방의 확정 스냅샷 경로를 구분합니다.
(() => {
  const E = window.YachtEngine, KEY = 'familyYachtGame';
  const MODES = { helper: '도우미', tactic: '전술', classic: '클래식' };
  const PIPS = [[4], [0, 8], [0, 4, 8], [0, 2, 6, 8], [0, 2, 4, 6, 8], [0, 2, 3, 5, 6, 8]];
  const $ = id => document.getElementById(id);
  let state = null, saved = null, setup = null, muted = false, busy = false, pending = null;
  let animationTimer = null, activeView = 'setupView';
  let room = null, roomUI = null, roomSnapshot = null, roomLocked = false, roomInvalid = false;
  let effectGeneration = 0;

  function validSnapshot(s) {
    try {
      if (!window.FamilyRoomUI.validRoom(s, 'yacht')) return false;
      if (s.room.phase === 'lobby') return s.state === null;
      const v = s.state, b = v?.publicBoard;
      if (v?.v !== 1 || v.gameType !== 'yacht' || !Array.isArray(v.players) ||
          v.players.length !== s.seats.length || !Number.isInteger(v.turnPlayer) ||
          v.turnPlayer < 0 || v.turnPlayer >= v.players.length || !Number.isSafeInteger(v.stateVersion) ||
          v.stateVersion < 0 || !Number.isInteger(v.round) || v.round < 1 || v.round > 12 ||
          !b || !Array.isArray(b.kept) || b.kept.length !== 5 || b.kept.some(k => typeof k !== 'boolean') ||
          !Number.isInteger(b.rollCount) || b.rollCount < 0 || b.rollCount > 3 ||
          !b.scores || Array.isArray(b.scores) || Object.keys(b.scores).length !== v.players.length) return false;
      E.createGame(v.players); E.scoreOptions(b.dice);
      return v.players.every((p, i) => p.id === s.seats[i].id && window.FamilyRoomUI.usableAvatar(p.avatar) &&
        b.scores[p.id] && !Array.isArray(b.scores[p.id]) && Object.keys(b.scores[p.id]).length === 12 &&
        E.CATEGORIES.every(c => Object.hasOwn(b.scores[p.id], c.id) && (b.scores[p.id][c.id] === null ||
          Number.isInteger(b.scores[p.id][c.id]) && b.scores[p.id][c.id] >= 0 && b.scores[p.id][c.id] <= 50))) &&
        (v.lastAction === null || ['ROLL', 'TOGGLE_KEEP', 'CHOOSE'].includes(v.lastAction?.type) &&
          v.players.some(p => p.id === v.lastAction.by) && (v.lastAction.type !== 'CHOOSE' ||
            E.CATEGORIES.some(c => c.id === v.lastAction.category)));
    } catch { return false; }
  }

  function inputFor(s, locked, animating) {
    return !!s && !locked && !animating && s.room.phase === 'playing' &&
      window.FamilyRoom.permissionsFor(s).turn && !E.isOver(s.state);
  }
  function effectsFor(previous, current, initial = false) {
    const rights = window.FamilyRoom.permissionsFor(current), v = current.state;
    const changed = !initial && previous && current.room.rev > previous.room.rev &&
      JSON.stringify(previous.state) !== JSON.stringify(v);
    const yacht = v.lastAction?.type === 'CHOOSE' && v.lastAction.category === 'yacht' &&
      v.publicBoard.scores[v.lastAction.by]?.yacht === 50;
    const turn = changed && !E.isOver(v) && (previous.room.phase !== 'playing' ||
      v.lastAction === null || previous.state?.turnPlayer !== v.turnPlayer);
    return { roll: !!changed && v.lastAction?.type === 'ROLL', yacht,
      announce: !!turn && rights.turn, end: !!changed && E.isOver(v),
      focus: !initial && rights.turn && (!!turn || !window.FamilyRoom.permissionsFor(previous).turn),
      host: rights.host, seated: rights.seated };
  }
  const myTurn = () => !room || window.FamilyRoom.permissionsFor(roomSnapshot).turn;
  const canInput = () => !!state && !roomInvalid && (room ? inputFor(roomSnapshot, roomLocked, busy) : !busy && !E.isOver(state));
  function cancelTransient() {
    clearTimeout(animationTimer); animationTimer = null; busy = false;
    $('dice').classList.remove('rolling'); pending = null;
    if ($('zeroDialog').open) $('zeroDialog').close();
  }
  function animateRoll() {
    busy = true; renderGame(); $('dice').classList.add('rolling');
    animationTimer = setTimeout(() => {
      busy = false; animationTimer = null; $('dice').classList.remove('rolling');
      if (activeView !== 'gameView' || roomInvalid) return;
      renderGame();
      if (!canInput()) return;
      if (state.publicBoard.rollCount < 3) $('rollDice').focus();
      else $('scoreTable').querySelector('.score-choice:not(:disabled)')?.focus();
    }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 260);
  }
  function applySnapshot(s, previous, meta) {
    if (!validSnapshot(s)) { roomUI.invalid(); return; }
    try {
      cancelTransient();
      const fx = effectsFor(previous, s, meta.initial);
      roomSnapshot = s; state = s.state; roomLocked = false;
      if (E.isOver(state)) finish(fx.yacht && fx.host, { silent: !fx.end, focus: fx.end && myTurn(), reward: fx.seated });
      else {
        renderGame();
        if (fx.roll) animateRoll();
        if (fx.focus) $('turnBanner').focus();
        if (fx.announce) {
          stopAudio(); say(`${fx.yacht ? '야추! 대단해요! ' : ''}${state.players[state.turnPlayer].name} 차례예요!`);
        }
      }
      $('playAgain').disabled = roomLocked || !fx.seated;
      $('backToSetup').textContent = fx.host ? '대기실로' : '방 나가기';
    } catch { roomInvalid = true; roomUI.invalid(); }
  }
  function commit(next) {
    if (next === state) return;
    if (room) { if (!roomLocked && !roomInvalid) room.submit(next); return; }
    state = next; persist();
    const a = state.lastAction, yacht = a?.type === 'CHOOSE' && a.category === 'yacht' && state.publicBoard.scores[a.by].yacht === 50;
    if (E.isOver(state)) { finish(yacht); return; }
    if (a?.type === 'ROLL') { animateRoll(); return; }
    renderGame();
    if (!a || a.type === 'CHOOSE') {
      $('turnBanner').focus(); stopAudio();
      say(`${yacht ? '야추! 대단해요! ' : ''}${state.players[state.turnPlayer].name} 차례예요!`);
    }
  }

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

  const { playerAvatar } = window.FamilyPlayers;

  function setView(id) {
    activeView = id;
    ['setupView', 'resumeView', 'gameView', 'endView', 'roomView'].forEach(view => {
      if ($(view)) $(view).hidden = view !== id;
    });
    // 여러 기기 실패 안내가 한 기기 판 위에 남지 않게 합니다.
    if (!room && id === 'gameView' && $('roomStatus')) $('roomStatus').hidden = true;
  }

  function say(text, after) {
    if (muted || typeof window.speakFairyTTS !== 'function') { if (after) after(); return; }
    // 정해진 차례·야추 문장을 칭찬 녹음으로 바꾸지 않고 그대로 읽습니다.
    try { Promise.resolve(window.speakFairyTTS(text, after, { skipPreset: true })).catch(() => { if (after) after(); }); }
    catch (e) { if (after) after(); }
  }

  function stopAudio() { if (typeof window.stopFairyTTS === 'function') window.stopFairyTTS(); }

  function removeSaved() {
    try { localStorage.removeItem(KEY); return true; } catch (e) { return false; }
  }

  function persist() {
    if (room) return;
    try {
      if (E.isOver(state)) localStorage.removeItem(KEY);
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
      const s = JSON.parse(raw), ids = E.CATEGORIES.map(c => c.id), b = s?.publicBoard;
      if (s.v !== 1 || s.gameType !== 'yacht' || !Number.isSafeInteger(s.stateVersion) || s.stateVersion < 0 ||
          !Number.isInteger(s.round) || s.round < 1 || s.round > 12 || !b ||
          !Array.isArray(b.kept) || b.kept.length !== 5 || b.kept.some(v => typeof v !== 'boolean') ||
          !Number.isInteger(b.rollCount) || b.rollCount < 0 || b.rollCount > 3) throw Error();
      const clean = E.createGame(s.players);
      if (!Number.isInteger(s.turnPlayer) || s.turnPlayer < 0 || s.turnPlayer >= clean.players.length ||
          (!b.rollCount && (b.kept.some(Boolean) || b.dice.some(n => n !== 1)))) throw Error();
      E.scoreOptions(b.dice);
      const possible = E.CATEGORIES.map(() => new Set());
      // 6^5 검증은 저장 읽기에서 한 번만 수행합니다. 임의 점수도 이어하기에서 거릅니다.
      for (let n = 0; n < 7776; n++) {
        let value = n;
        const dice = Array.from({ length: 5 }, () => { const d = value % 6 + 1; value = Math.floor(value / 6); return d; });
        ids.forEach((id, i) => possible[i].add(E.scoreFor(dice, id)));
      }
      let filled = 0;
      clean.players.forEach((p, index) => {
        const scores = b.scores?.[p.id];
        if (!scores || Object.keys(scores).length !== 12) throw Error();
        let count = 0;
        ids.forEach((id, i) => {
          if (!Object.hasOwn(scores, id)) throw Error();
          if (scores[id] !== null) {
            if (!possible[i].has(scores[id])) throw Error();
            count++; filled++;
          }
        });
        const expected = s.round - 1 + (index < s.turnPlayer ? 1 : 0);
        if (count !== expected) throw Error();
      });
      if (E.isOver(s)) { removeSaved(); return null; }
      if (!s.lastAction) { if (s.stateVersion !== 0 || filled || b.rollCount) throw Error(); }
      else {
        const a = s.lastAction;
        if (!['ROLL', 'TOGGLE_KEEP', 'CHOOSE'].includes(a.type) || s.stateVersion === 0 ||
            !clean.players.some(p => p.id === a.by)) throw Error();
        if (a.type === 'CHOOSE') {
          const previous = clean.players[(s.turnPlayer + clean.players.length - 1) % clean.players.length];
          if (a.by !== previous.id || !ids.includes(a.category) || b.scores[a.by][a.category] === null || b.rollCount) throw Error();
        } else if (a.by !== clean.players[s.turnPlayer].id || !b.rollCount) throw Error();
      }
      if (s.stateVersion < filled * 2 + b.rollCount) throw Error();
      return { ...s, players: clean.players };
    } catch (e) { removeSaved(); return null; }
  }

  function finish(yacht = false, { silent = false, focus = true, reward: allowReward = true } = {}) {
    if (!silent) stopAudio();
    setView('endView');
    const ranking = E.ranking(state); $('winners').replaceChildren(); $('rankings').replaceChildren();
    ranking.forEach(row => {
      if (row.rank === 1) {
        const winner = element('div'), avatar = element('span'); playerAvatar(avatar, row.player, state.players);
        winner.append(avatar, element('strong', `🏆 ${row.player.name} · ${row.total}점`)); $('winners').append(winner);
      }
      const line = element('li');
      line.append(element('span', `${row.rank}등 · ${row.player.name}`), element('strong', `${row.total}점`));
      $('rankings').append(line);
    });
    if (focus) $('endTitle').focus();
    const finished = state, token = effectGeneration;
    let rewarded = false;
    const reward = () => {
      if (!rewarded && allowReward && !muted && activeView === 'endView' && JSON.stringify(state) === JSON.stringify(finished) &&
          token === effectGeneration && typeof window.fairyReward === 'function') { rewarded = true; window.fairyReward(); }
    };
    if (silent) return;
    if (yacht) say('야추! 대단해요!', reward);
    else reward();
  }

  function renderDice() {
    $('dice').replaceChildren();
    state.publicBoard.dice.forEach((value, index) => {
      const kept = state.publicBoard.kept[index];
      const die = button('', () => {
        if (!canInput()) return;
        const next = E.toggleKeep(state, index);
        if (next !== state) commit(next);
      }, 'die');
      die.disabled = !canInput() || !state.publicBoard.rollCount;
      die.setAttribute('aria-label', `${index + 1}번 주사위 ${value}${kept ? ', 고정' : ', 고정 안 됨'}`);
      die.setAttribute('aria-pressed', String(kept));
      const pips = element('span', undefined, 'pips'); pips.setAttribute('aria-hidden', 'true');
      PIPS[value - 1].forEach(position => {
        const pip = element('span', undefined, 'pip');
        pip.style.gridRow = Math.floor(position / 3) + 1; pip.style.gridColumn = position % 3 + 1;
        pips.append(pip);
      });
      die.append(pips, element('span', String(value), 'die-value'), element('span', kept ? '고정' : '', 'die-kept'));
      $('dice').append(die);
    });
  }

  function summaryRow(body, title, getText) {
    const row = element('tr', undefined, 'totals-row'), th = element('th', title); th.scope = 'row'; row.append(th);
    state.players.forEach(p => {
      const cell = element('td'); getText(cell, E.totals(state.publicBoard.scores[p.id])); row.append(cell);
    });
    body.append(row);
  }

  function renderTable(player) {
    const table = $('scoreTable');
    table.querySelectorAll('thead, tbody').forEach(node => node.remove());
    const head = element('thead'), row = element('tr'), corner = element('th', '점수 칸');
    corner.scope = 'col'; row.append(corner);
    state.players.forEach(p => {
      const th = element('th', undefined, p.id === player.id ? 'current-column' : ''); th.scope = 'col';
      const avatar = element('span'); playerAvatar(avatar, p, state.players);
      th.append(avatar, element('span', p.name, 'player-name')); row.append(th);
    });
    head.append(row); table.append(head);
    const body = element('tbody'), help = myTurn() ? E.hints(state, player.assist) : {};
    E.CATEGORIES.forEach((category, i) => {
      const tr = element('tr'), th = element('th', category.name); th.scope = 'row'; th.title = category.description; tr.append(th);
      state.players.forEach(p => {
        const score = state.publicBoard.scores[p.id][category.id], td = element('td');
        if (score !== null) td.textContent = String(score);
        else if (p.id !== player.id) td.textContent = '—';
        else {
          const preview = help.previews?.[category.id];
          const pick = button(preview === undefined ? '기록' : String(preview), () => askScore(category),
            `score-choice${preview === undefined ? '' : preview > 0 ? ' positive' : ' zero'}`);
          pick.dataset.category = category.id; pick.disabled = !canInput() || !state.publicBoard.rollCount;
          pick.setAttribute('aria-label', `${category.name}${preview === undefined ? '' : ` ${preview}점`} 기록`);
          if (help.recommendations?.includes(category.id)) pick.append(element('small', '⚡ 추천', 'recommendation'));
          td.className = 'current-column'; td.append(pick);
        }
        tr.append(td);
      });
      body.append(tr);
      if (i === 5) {
        summaryRow(body, '1~6 소계', (cell, t) => { cell.textContent = String(t.upper); });
        summaryRow(body, '보너스', (cell, t) => {
          cell.append(element('span', `+${t.bonus}`));
          if (!t.bonus) cell.append(element('small', `${63 - t.upper}점 남음`, 'bonus-note'));
        });
      }
    });
    summaryRow(body, '합계', (cell, t) => { cell.textContent = String(t.total); }); table.append(body);
  }

  function renderGame() {
    setView('gameView');
    const player = state.players[state.turnPlayer], count = state.publicBoard.rollCount;
    $('turnBanner').textContent = `🎲 ${player.name} 차례! (굴리기 ${count}/3)`;
    $('roundBanner').textContent = `${state.round} / 12 라운드 · ${MODES[player.assist]}`;
    playerAvatar($('turnAvatar'), player, state.players);
    renderDice(); renderTable(player);
    $('rollDice').disabled = busy || count >= 3;
    $('rollDice').textContent = count >= 3 ? '빈 칸에 점수를 적어요' : `🎲 ${count ? '다시 ' : ''}굴리기`;
    $('keepHint').textContent = player.assist === 'helper' ? '주사위를 눌러 고정해요' : '남길 주사위를 눌러 고정할 수 있어요';
    $('turnHelp').textContent = !count ? '먼저 주사위를 굴려 주세요.' : count >= 3 ?
      '세 번 굴렸어요. 빈 칸 하나에 점수를 적어 주세요.' : '더 굴리거나, 빈 칸 하나에 점수를 적어 주세요.';
    if (room) {
      $('rollDice').disabled = !canInput() || count >= 3;
      if (!myTurn()) {
        $('turnBanner').textContent = `${player.name} 차례예요. 기다려요`;
        $('roundBanner').textContent = `${state.round} / 12 라운드`;
        $('keepHint').textContent = ''; $('turnHelp').textContent = `${player.name} 차례예요. 기다려요`;
      }
    }
  }

  function askScore(category) {
    if (!canInput() || !state.publicBoard.rollCount || pending) return;
    const score = E.scoreFor(state.publicBoard.dice, category.id);
    if (score === 0) {
      pending = { category: category.id, version: state.stateVersion, rev: roomSnapshot?.room.rev };
      $('zeroCategory').textContent = `${category.name} 칸에 0점을 적어요. 다른 빈 칸도 살펴볼 수 있어요.`;
      $('zeroDialog').showModal(); $('cancelZero').focus();
    } else commitScore(category.id);
  }

  function commitScore(category) {
    if (!canInput()) return;
    commit(E.choose(state, category));
  }

  function start(players) {
    let next;
    try { next = E.createGame(players); }
    catch (e) { $('setupError').textContent = e.message; return; }
    saved = null; busy = false; pending = null; stopAudio(); commit(next);
  }

  function boot() {
    setup = window.FamilyPlayers.createSetup({ host: $('playerSetup'), count: 2, min: 2, max: 5, modes: MODES }); saved = readSaved();
    if (saved) {
      setView('resumeView');
      $('resumeSummary').textContent = `${saved.players.map(p => p.name).join(' · ')} · ${saved.round}라운드`;
    }
    $('playerCount').addEventListener('change', () => setup.setCount(Number($('playerCount').value)));
    $('startGame').addEventListener('click', () => { $('setupError').textContent = ''; start(setup.getPlayers()); });
    $('newGame').addEventListener('click', () => { removeSaved(); saved = null; setView('setupView'); });
    $('resumeGame').addEventListener('click', () => {
      state = saved; saved = null; renderGame(); $('turnBanner').focus(); say(`${state.players[state.turnPlayer].name} 차례예요!`);
    });
    $('rollDice').addEventListener('click', () => {
      if (canInput()) commit(E.roll(state));
    });
    $('zeroDialog').addEventListener('close', () => { pending = null; });
    $('cancelZero').addEventListener('click', () => { pending = null; $('zeroDialog').close(); });
    $('confirmZero').addEventListener('click', () => {
      const choice = pending; pending = null; $('zeroDialog').close();
      if (choice && choice.version === state.stateVersion && (!room || choice.rev === roomSnapshot?.room.rev)) commitScore(choice.category);
    });
    $('playAgain').addEventListener('click', () => {
      if (room && (roomLocked || roomInvalid || !window.FamilyRoom.permissionsFor(roomSnapshot).seated)) return;
      start(state.players);
    });
    $('backToSetup').addEventListener('click', () => {
      if (room) { roomUI.back(); return; }
      stopAudio(); state = null; setView('setupView'); setup.render();
    });
    $('soundToggle').addEventListener('click', () => {
      muted = !muted; $('soundToggle').setAttribute('aria-pressed', String(muted));
      $('soundToggle').textContent = muted ? '🔇 안내 음성' : '🔊 안내 음성';
      if (muted) stopAudio();
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden) stopAudio(); });
    window.addEventListener('pagehide', () => { cancelTransient(); effectGeneration++; stopAudio(); });
    window.addEventListener('pageshow', () => {
      if (state && !room && activeView === 'gameView') { busy = false; renderGame(); }
    });
    if (window.FamilyRoomUI) {
      roomUI = window.FamilyRoomUI.mount({ gameType: 'yacht', maxSeats: 5, title: '가족 야추', modes: MODES,
        createGame: E.createGame, validate: validSnapshot,
        onRoom: value => {
          room = value; roomSnapshot = null; roomInvalid = false; roomLocked = !!value;
          cancelTransient(); effectGeneration++; stopAudio();
        }, onView: setView, onGame: applySnapshot,
        onLobby: () => { cancelTransient(); effectGeneration++; stopAudio(); state = null; roomSnapshot = null; },
        onLock: locked => {
          roomLocked = locked;
          if (locked) cancelTransient();
          if (room && !roomInvalid && state && roomSnapshot) {
            try {
              if (activeView === 'gameView') renderGame();
              $('playAgain').disabled = locked || !window.FamilyRoom.permissionsFor(roomSnapshot).seated;
            } catch { roomInvalid = true; roomUI.invalid(); }
          }
        },
        onLocal: value => {
          cancelTransient(); effectGeneration++; stopAudio(); state = value;
          $('backToSetup').textContent = '처음으로'; $('playAgain').disabled = false;
          if (value) { persist(); if (E.isOver(value)) finish(false, { silent: true }); else renderGame(); }
          else {
            saved = readSaved(); setView(saved ? 'resumeView' : 'setupView');
            if (saved) $('resumeSummary').textContent = `${saved.players.map(p => p.name).join(' · ')} · ${saved.round}라운드`;
          }
        } });
      roomUI.boot();
    }
  }

  window.YachtUI = Object.freeze({ boot, validSnapshot, inputFor, effectsFor });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
