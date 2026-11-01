// 가족 방 입구·대기실. 게임 규칙과 게임 상태의 그리기는 각 게임 UI에 위임합니다.
(() => {
  const R = window.FamilyRoom, F = window.FamilyPlayers;
  const names = ['민서', '민수', '아빠', '엄마', '이모'];
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  }
  function button(text, action) {
    const node = element('button', text); node.type = 'button'; node.addEventListener('click', action); return node;
  }
  function usableAvatar(a) {
    const v = a?.value;
    return a?.type === 'emoji' ? ['🐰', '🐻', '🦊', '🐯', '🐸'].includes(v) : a?.type === 'gallery' &&
      typeof v?.artId === 'string' && v.artId.trim() && v.artId.length <= 64 &&
      typeof v.charKey === 'string' && /^[a-z0-9_-]{1,32}$/.test(v.charKey) &&
      typeof v.name === 'string' && v.name.trim() && Array.from(v.name.trim()).length <= 12 && v.name.length <= 40 &&
      typeof v.spriteUrl === 'string' && v.spriteUrl.length <= 512 && !/[\s\\\u0000-\u001f]/.test(v.spriteUrl) &&
      v.spriteUrl.startsWith('https://raw.githubusercontent.com/awslike6-web/kids-archive/');
  }
  function initialSeat(seats, avatars = F.collectAvatars()) {
    const name = names.find(n => !seats.some(p => p.name === n));
    const avatar = avatars.find(a => usableAvatar(a) && !seats.some(p => F.avatarKey(p.avatar) === F.avatarKey(a)));
    return name && avatar ? { id: 'p1', name, avatar, assist: F.defaultMode(name) } : null;
  }
  function validDrafts(players) {
    return players.every(p => typeof p.name === 'string' && p.name.trim() && Array.from(p.name.trim()).length <= 8 &&
      usableAvatar(p.avatar) && ['helper', 'tactic', 'classic'].includes(p.assist));
  }
  // 게임별 판 검사 앞에 공통으로 보는 방·자리 모양입니다.
  function validRoom(s, gameType) {
    return !!s && s.room.gameType === gameType && ['lobby', 'playing'].includes(s.room.phase) &&
      Number.isInteger(s.room.maxSeats) && s.room.maxSeats >= 2 && s.room.maxSeats <= 5 &&
      Array.isArray(s.seats) && s.seats.length <= s.room.maxSeats && Array.isArray(s.members) &&
      s.members.every(m => typeof m.id === 'string' && typeof m.online === 'boolean') &&
      s.seats.every((p, i) => p.id === `p${i + 1}` && typeof p.name === 'string' &&
        p.name.trim() && Array.from(p.name).length <= 8 && window.FamilyRoomUI.usableAvatar(p.avatar) &&
        ['helper', 'tactic', 'classic'].includes(p.assist) &&
        (p.owner === null || s.members.some(m => m.id === p.owner)));
  }
  function startReason(s, queued, locked) {
    if (s.seats.length < 2) return '게임을 시작하려면 두 자리 이상 필요해요.';
    if (queued) return '자리 설정을 보내고 있어요.';
    return locked ? '연결과 자리 설정을 기다려 주세요.' : '';
  }
  function mount({ gameType, maxSeats = 5, title, modes, createGame, hostOptions, onRoom, onGame, onLobby, onLocal, onView, onLock, validate }) {
    const root = document.getElementById('roomView'), strip = document.getElementById('roomStatus');
    const actions = document.getElementById('roomActions');
    let room = null, snapshot = null, lastPlaying = null, setup = null, editor = null, seatList = null;
    let lobbyPanel = null, startButton = null, startNote = null, addButton = null, optionNode = null, drafts = null, queued = null;
    let debounce = null, refreshDeferred = false, restoreDeferred = null, acceptedOwn = null, rejected = false;
    let recovering = false, autoSeat = false, spectator = false, step = '', broken = false, creating = false;
    let message = '', currentStatus = { state: 'stopped', locked: true }, deadlineReady = true;
    const seenRooms = new Set(), spectatorRooms = new Set();
    const focusedName = () => !!editor?.contains(document.activeElement) && document.activeElement?.tagName === 'INPUT';
    function cancelEdits() {
      clearTimeout(debounce); debounce = null; queued = null; deadlineReady = true;
      refreshDeferred = false; restoreDeferred = null;
    }
    function release(reason = 'exit', forget = true) {
      cancelEdits(); const old = room; room = null; old?.stop(reason, forget);
      onRoom(null); snapshot = null; lastPlaying = null; setup = null; lobbyPanel = null; broken = false;
      strip.replaceChildren(); strip.hidden = true; root.hidden = true; recovering = false;
      actions.replaceChildren(); actions.hidden = true;
    }
    const isOnline = id => !!snapshot?.members.some(m => m.id === id && m.online);
    function claimButton(p, text) {
      return button(text, () => { if (R.canClaim(snapshot, p.id)) room.claim(p.id); });
    }
    function local() { release(); onLocal(null); }
    function continueLocal() {
      if (!lastPlaying || !validate(lastPlaying)) { invalid(); return; }
      const value = lastPlaying.state; release('local'); onLocal(value);
    }
    function invalid() {
      broken = true; cancelEdits(); room?.stop('invalid');
      onLock(true); showStatus();
    }
    function showStatus() {
      strip.replaceChildren();
      const s = currentStatus, reasons = {
        replaced: '다른 창에서 이어 하고 있어요', invalid: '새로고침해 주세요',
        forbidden: '게임이 시작됐거나 이 방에 들어갈 수 없어요', missing: '이 방을 찾지 못했어요'
      };
      const text = broken ? reasons.invalid : s.state !== 'connected' ? reasons[s.reason] || '연결 중…' : '';
      const absent = !text && snapshot?.room.phase === 'playing' && room ?
        snapshot.seats.filter(p => (p.origin === snapshot.you || !isOnline(p.owner)) && R.canClaim(snapshot, p.id)) : [];
      strip.hidden = !text && !absent.length;
      absent.forEach(p => strip.append(...p.origin === snapshot.you ?
        [element('span', `다른 기기가 ${p.name} 자리를 대신 하고 있어요`), claimButton(p, '내 자리로 돌아가기')] :
        [element('span', `${p.name} ${p.owner ? '연결 끊김' : '자리 비었어요'}`), claimButton(p, '내가 대신 하기')]));
      if (!text) return;
      strip.append(element('span', text));
      if (recovering || s.state !== 'connected') strip.append(button('처음 화면으로', local));
      if (!broken && lastPlaying && (s.reason === 'missing' ||
          s.offlineSince !== null && s.offlineSince !== undefined && Date.now() - s.offlineSince >= 30000))
        strip.append(button('이 기기 하나로 이어서 하기', continueLocal));
    }
    function entry(code = '') {
      step = 'entry'; setup = null; lobbyPanel = null; editor = null;
      root.replaceChildren(element('h2', '여러 기기로 함께 놀아요'));
      if (message) root.append(element('p', message, 'family-room-note'));
      root.append(button('방 만들기', () => begin(null)));
      const label = element('label', '방 코드'), input = element('input');
      input.inputMode = 'numeric'; input.maxLength = 4; input.pattern = '[1-9][0-9]{3}'; input.value = code;
      input.setAttribute('aria-label', '네 자리 방 코드'); input.autocomplete = 'off'; label.append(input);
      const joinButton = button('코드 넣기', () => { if (R.codeValid(input.value)) begin(input.value); });
      joinButton.disabled = !R.codeValid(input.value);
      input.addEventListener('input', () => { joinButton.disabled = !R.codeValid(input.value); });
      root.append(label, joinButton, button('이 기기 하나로', local)); onView('roomView');
    }
    function flush() {
      if (!room || !queued || !deadlineReady || broken || snapshot?.room.phase !== 'lobby' || room.getStatus().locked) return;
      const value = queued;
      if (!validDrafts(value)) { startNote.textContent = '이름은 1~8자, 말은 서로 다르게 골라 주세요.'; return; }
      queued = null;
      if (!room.setSeats(value)) queued = value;
    }
    function edited(players) {
      spectator = false; drafts = players; queued = players; restoreDeferred = null; clearTimeout(debounce);
      spectatorRooms.delete(snapshot.room.code);
      deadlineReady = !focusedName();
      if (!deadlineReady) debounce = setTimeout(() => { debounce = null; deadlineReady = true; flush(); }, 400);
      else flush();
      updateStart();
    }
    function restore(players) {
      if (focusedName()) { restoreDeferred = players; refreshDeferred = true; return; }
      drafts = players;
      if (players.length) setup.setPlayers(players.map((p, i) => ({ ...p, id: `p${i + 1}` })));
      editor.hidden = !players.length;
      restoreDeferred = null;
    }
    function refreshEditor() {
      if (!setup) return;
      if (focusedName()) { refreshDeferred = true; return; }
      if (restoreDeferred) restore(restoreDeferred);
      else setup.render();
      refreshDeferred = false;
    }
    function updateStart() {
      if (!startButton || !snapshot || !room) return;
      const host = R.permissionsFor(snapshot).host;
      startButton.hidden = !host;
      if (optionNode) optionNode.hidden = !host;
      const why = startReason(snapshot, !!queued, room.getStatus().locked);
      startButton.disabled = !!why || broken;
      startNote.textContent = host ? why : '방장이 시작하기를 기다려요.';
      addButton.disabled = broken || room.getStatus().locked || snapshot.seats.length +
        Math.max(0, (drafts?.length || 0) - R.ownSeats(snapshot).length) >= snapshot.room.maxSeats;
    }
    async function share() {
      const url = new URL(window.location.href); url.searchParams.delete('roomServer'); url.searchParams.set('room', snapshot.room.code);
      try {
        if (navigator.share) await navigator.share({ title, url: url.href });
        else { await navigator.clipboard.writeText(url.href); startNote.textContent = '방 링크를 복사했어요.'; }
      } catch { startNote.textContent = `방 코드 ${snapshot.room.code}를 알려 주세요.`; }
    }
    function buildLobby() {
      step = 'lobby'; root.replaceChildren(); lobbyPanel = element('div', undefined, 'family-room-lobby'); root.append(lobbyPanel);
      lobbyPanel.append(element('h2', `방 코드 ${snapshot.room.code}`), button('링크 보내기', share));
      seatList = element('div', undefined, 'family-room-members'); editor = element('div', undefined, 'player-setup');
      lobbyPanel.append(seatList, editor);
      setup = F.createSetup({ host: editor, count: 1, min: 1, max: snapshot.room.maxSeats, modes,
        isTaken: a => !usableAvatar(a) || snapshot.seats.some(p => p.owner !== snapshot.you && F.avatarKey(p.avatar) === F.avatarKey(a)),
        onChange: edited });
      editor.addEventListener('focusout', () => setTimeout(() => { if (refreshDeferred) refreshEditor(); }, 0));
      addButton = button('+ 이 기기에서 한 명 더', () => {
        if (addButton.disabled) return;
        const people = drafts || [], next = initialSeat([...snapshot.seats.filter(p => p.owner !== snapshot.you), ...people]);
        if (next) { next.id = `p${people.length + 1}`; setup.setPlayers([...people, next]); editor.hidden = false; edited(setup.getPlayers()); }
      });
      startNote = element('p', '', 'family-room-note');
      const watch = button('구경만 하기', () => {
        spectator = true; autoSeat = false; drafts = []; queued = []; clearTimeout(debounce); deadlineReady = true;
        spectatorRooms.add(snapshot.room.code);
        editor.hidden = true; flush(); updateStart();
      });
      startButton = button('게임 시작', () => {
        if (broken || room.getStatus().locked || startReason(snapshot, !!queued, false) || !R.permissionsFor(snapshot).host) return;
        try { room.start(createGame(snapshot.seats)); }
        catch (e) { startNote.textContent = e.message; }
      });
      // 판 크기처럼 시작할 때만 쓰는 값은 방장 기기의 게임 화면이 정합니다.
      optionNode = hostOptions ? hostOptions() : null;
      lobbyPanel.append(addButton, watch, ...(optionNode ? [optionNode] : []), startNote, startButton,
        button('방 나가기', () => { room.leave(); release(); onLocal(null); }));
    }
    function renderLobby() {
      // 게임 뒤 새로 만든 카드는 기본값이므로 서버의 내 자리로 되돌립니다.
      if (!lobbyPanel) { buildLobby(); drafts = null; acceptedOwn = null; }
      const own = R.seatDrafts(R.ownSeats(snapshot));
      if (!same(acceptedOwn, own) || rejected) {
        acceptedOwn = own;
        if (!queued) restore(own);
      }
      rejected = false;
      if (!drafts) restore(own);
      refreshEditor(); seatList.replaceChildren();
      snapshot.members.forEach(member => {
        const people = snapshot.seats.filter(p => p.owner === member.id), row = element('div', undefined, 'family-room-member');
        row.append(element('strong', `${people.map(p => p.name).join(' · ') || '구경'}${snapshot.room.hostId === member.id ? ' · 방장' : ''}`),
          element('span', member.online ? '연결됨' : '연결 끊김'));
        people.forEach(p => {
          const avatar = element('span'); F.playerAvatar(avatar, p, snapshot.seats); row.append(avatar);
          // 대기실에서는 접속 중인 사람의 자리를 뺏는 버튼을 두지 않습니다.
          if (!isOnline(p.owner) && R.canClaim(snapshot, p.id)) row.append(claimButton(p, `${p.name} 내가 대신 하기`));
        });
        if (R.permissionsFor(snapshot).host && member.id !== snapshot.you) row.append(button('내보내기', () => {
          if (R.permissionsFor(snapshot).host && snapshot.room.phase === 'lobby') room.kick(member.id);
        }));
        seatList.append(row);
      });
      updateStart(); onView('roomView');
      if (autoSeat) {
        autoSeat = false;
        if (!own.length && !spectator) {
          // 자리가 다 찬 방에는 보내지 않고 구경으로 남습니다.
          const first = snapshot.seats.length < snapshot.room.maxSeats ? initialSeat(snapshot.seats) : null;
          if (first) { setup.setPlayers([first]); editor.hidden = false; edited(setup.getPlayers()); }
        }
      }
    }
    function renderPlayingActions() {
      root.replaceChildren(); lobbyPanel = null; editor = null; setup = null; step = 'playing';
      // 끊긴 자리는 위 띠(showStatus)에, 접속 중인 자리의 방장 넘겨받기와 나가기는 판 아래에 둡니다.
      actions.replaceChildren(...snapshot.seats.filter(p => isOnline(p.owner) && p.origin !== snapshot.you && R.canClaim(snapshot, p.id))
        .map(p => claimButton(p, `${p.name} 자리 넘겨받기`)),
      button(R.permissionsFor(snapshot).host ? '대기실로' : '방 나가기', back));
      // 오목의 끝 화면은 판 안에 있습니다. 끝 화면 버튼과 겹쳐 보이지 않게 합니다.
      actions.hidden = document.getElementById('gameView').hidden || !document.getElementById('endView').hidden;
    }
    function accept(s, previous, meta) {
      if (broken) return;
      // 다른 게임의 코드를 넣으면 자리·세션을 남기지 않고 코드 입력으로 돌아갑니다.
      if (meta.initial && !previous && s.room?.gameType !== gameType) {
        room.leave(); release(); message = '다른 게임의 방 코드예요. 코드를 다시 확인해 주세요.'; entry(); return;
      }
      try {
        if (!validate(s)) { invalid(); return; }
        snapshot = s;
        if (meta.initial) {
          if (seenRooms.has(s.room.code) || spectatorRooms.has(s.room.code)) autoSeat = false;
          seenRooms.add(s.room.code);
        }
        if (s.room.phase === 'lobby') { lastPlaying = null; actions.hidden = true; onLobby(); renderLobby(); }
        else {
          cancelEdits(); lastPlaying = s; onGame(s, previous, meta); renderPlayingActions();
        }
      } catch { invalid(); }
    }
    function status(s) {
      currentStatus = s;
      if (!room) return;
      onLock(s.locked || broken);
      if (s.state === 'stopped' && !broken) {
        if (recovering && ['missing', 'forbidden'].includes(s.reason)) { release(); onLocal(null); return; }
        if (s.reason === 'unavailable') {
          release(); message = '지금은 여러 기기로 할 수 없어요. 이 기기 하나로 놀 수 있어요';
          onLocal(null); strip.hidden = false; strip.append(element('span', message)); return;
        }
        if (['missing', 'forbidden'].includes(s.reason) && !lastPlaying) {
          message = s.reason === 'missing' ? '이 방을 찾지 못했어요' : '게임이 시작됐거나 이 방에 들어갈 수 없어요';
          entry(); strip.replaceChildren(); strip.hidden = true; return;
        }
      }
      if (s.state === 'connected') { recovering = false; updateStart(); flush(); }
      showStatus();
    }
    function begin(code, recovery = false) {
      release('switch', false); message = ''; drafts = null; acceptedOwn = null; spectator = false; rejected = false;
      recovering = recovery; autoSeat = !recovery; broken = false;
      onView('roomView'); root.replaceChildren(element('p', '연결 중…'));
      room = R.create({ gameType, maxSeats, onSnapshot: accept, onStatus: status,
        onRejected: () => { rejected = true; } });
      onRoom(room);
      if (code) room.join(code, { recovering: recovery });
      else { creating = true; room.createRoom().finally(() => { creating = false; }); }
    }
    function back() {
      if (!room || room.getStatus().locked || broken) return;
      if (R.permissionsFor(snapshot).host) room.lobby();
      else { room.leave(); release(); onLocal(null); }
    }
    document.getElementById('singleDevice').addEventListener('click', local);
    const toEntry = () => { release(); message = ''; entry(); };
    document.getElementById('multipleDevices').addEventListener('click', toEntry);
    // 놀던 게임이 있어도 저장을 지우지 않고 여러 기기로 갈 수 있습니다. 「이 기기 하나로」는 이어하기로 돌아옵니다.
    document.getElementById('resumeMultipleDevices')?.addEventListener('click', toEntry);
    document.addEventListener('visibilitychange', () => { if (!document.hidden && !creating) room?.reconnect(); });
    window.addEventListener('online', () => { if (!creating) room?.reconnect(); });
    window.addEventListener('pagehide', () => { cancelEdits(); room?.stop('pagehide'); });
    window.addEventListener('pageshow', event => {
      if (event.persisted) { const session = R.readSession(gameType); if (session) begin(session.code, true); }
    });
    return Object.freeze({
      boot: () => {
        const linked = new URLSearchParams(window.location.search).get('room');
        if (R.codeValid(linked)) { message = ''; entry(linked); return true; }
        const session = R.readSession(gameType);
        if (session) { begin(session.code, true); return true; }
        return false;
      }, back, invalid, continueLocal, getRoom: () => room
    });
  }
  window.FamilyRoomUI = Object.freeze({ mount, initialSeat, usableAvatar, validDrafts, validRoom, startReason });
})();
