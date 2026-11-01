// 가족 방 통신. DOM·게임 규칙 없이 확정 스냅샷만 전달합니다.
(() => {
  const SERVER = 'https://family-room.awslike6.workers.dev';
  const UUID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
  const BACKOFF = [1000, 2000, 4000, 8000, 15000];
  let memoryId;
  const codeValid = code => typeof code === 'string' && /^[1-9]\d{3}$/.test(code);
  const read = key => { try { return localStorage.getItem(key); } catch { return null; } };
  const write = (key, value) => { try {
    if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value);
  } catch { /* 저장이 막혀도 현재 페이지에서는 계속합니다. */ } };
  function getClientId() {
    if (memoryId) return memoryId;
    const stored = read('familyRoomClientId');
    let sessionId;
    try { sessionId = JSON.parse(read('familyRoomSession'))?.clientId; } catch { /* 잘못된 세션은 무시합니다. */ }
    memoryId = UUID.test(stored || '') ? stored.toLowerCase() : UUID.test(sessionId || '') ?
      sessionId.toLowerCase() : crypto.randomUUID().toLowerCase();
    write('familyRoomClientId', memoryId);
    return memoryId;
  }
  function readSession(gameType) {
    try {
      const s = JSON.parse(read('familyRoomSession'));
      return s && s.gameType === gameType && codeValid(s.code) && UUID.test(s.clientId) ? s : null;
    } catch { return null; }
  }
  function serverURL(location = window.location) {
    const url = new URL(SERVER);
    if (['localhost', '127.0.0.1'].includes(location?.hostname)) {
      try {
        const override = new URL(new URLSearchParams(location.search).get('roomServer'));
        if (['http:', 'https:'].includes(override.protocol) && !override.username && !override.password)
          return override.origin;
      } catch { /* 기본 서버 주소를 유지합니다. */ }
    }
    return url.origin;
  }
  const ownSeats = s => s.seats.filter(seat => seat.owner === s.you);
  function permissionsFor(s) {
    if (!s) return { host: false, seated: false, turn: false };
    const id = s.state?.players?.[s.state.turnPlayer]?.id;
    return { host: s.room.hostId === s.you, seated: ownSeats(s).length > 0,
      turn: s.room.phase === 'playing' && s.seats.some(p => p.id === id && p.owner === s.you) };
  }
  function canClaim(s, id) {
    const seat = s?.seats.find(p => p.id === id);
    return !!seat && seat.owner !== s.you && (permissionsFor(s).host || !seat.owner || seat.origin === s.you ||
      !s.members.some(m => m.id === seat.owner && m.online));
  }
  const seatDrafts = seats => seats.map(({ name, avatar, assist }) => ({ name, avatar, assist }));
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  function acknowledged(pending, s) {
    if (!pending) return false;
    if (pending.rejected || s.room.rev > pending.rev) return true;
    if (pending.type === 'claim') return s.seats.some(p => p.id === pending.seatId && p.owner === s.you);
    return pending.type === 'seats' && same(seatDrafts(ownSeats(s)), pending.seats);
  }
  function create({ gameType, maxSeats = 5, onSnapshot = () => {}, onStatus = () => {}, onRejected = () => {} }) {
    const client = getClientId(), server = serverURL();
    let socket = null, snapshot = null, code = '', state = 'stopped', reason = '', pending = null;
    let retry = null, deadline = null, heartbeat = null, pongTimer = null, offlineTimer = null;
    let attempt = 0, stopped = true, recovering = false, hadSnapshot = false, offlineSince = null, generation = 0;
    let fetchController = null;
    const getStatus = () => ({ state, reason, locked: state !== 'connected' || !!pending, offlineSince });
    const emit = () => onStatus(getStatus());
    function clearTimers() {
      [retry, deadline, heartbeat, pongTimer, offlineTimer].forEach(clearTimeout);
      retry = deadline = heartbeat = pongTimer = offlineTimer = null;
    }
    function stop(why = 'exit', forget = false) {
      stopped = true; generation++; clearTimers(); fetchController?.abort(); fetchController = null;
      const previous = socket; socket = null; pending = null;
      if (previous) previous.close();
      state = 'stopped'; reason = why;
      if (forget) write('familyRoomSession', null);
      emit();
    }
    function disconnect() {
      generation++; clearTimeout(deadline); clearTimeout(heartbeat); clearTimeout(pongTimer);
      deadline = heartbeat = pongTimer = null;
      const previous = socket; socket = null; pending = null;
      if (previous) previous.close();
    }
    function schedule() {
      if (stopped || retry !== null) return;
      state = 'reconnecting'; reason = '';
      if (offlineSince === null) {
        offlineSince = Date.now();
        offlineTimer = setTimeout(() => { offlineTimer = null; emit(); }, 30000);
      }
      emit();
      retry = setTimeout(() => { retry = null; connect(); }, BACKOFF[Math.min(attempt++, 4)]);
    }
    function failed() {
      if (stopped) return;
      disconnect();
      if (!hadSnapshot && !recovering) { stop('unavailable', true); return; }
      schedule();
    }
    function ping(ws, token) {
      heartbeat = setTimeout(() => {
        if (stopped || socket !== ws || generation !== token) return;
        try { ws.send('ping'); } catch { failed(); return; }
        pongTimer = setTimeout(failed, 5000);
        ping(ws, token);
      }, 25000);
    }
    function connect() {
      if (stopped) return;
      disconnect(); const token = generation;
      state = hadSnapshot || recovering ? 'reconnecting' : 'connecting'; reason = ''; emit();
      let ws;
      try { ws = new WebSocket(`${server.replace(/^http/, 'ws')}/rooms/${code}/ws?client=${client}`); }
      catch { failed(); return; }
      socket = ws; let first = true;
      const current = () => !stopped && socket === ws && generation === token;
      // open 뒤뿐 아니라 업그레이드가 멈춘 경우에도 첫 판 시한이 적용됩니다.
      deadline = setTimeout(() => { if (current()) failed(); }, 5000);
      ws.onopen = () => { if (current()) ping(ws, token); };
      ws.onmessage = event => {
        if (!current()) return;
        if (event.data === 'pong') { clearTimeout(pongTimer); pongTimer = null; return; }
        let message;
        try { message = JSON.parse(event.data); } catch { stop('invalid'); return; }
        if (!message || typeof message !== 'object' || Array.isArray(message)) { stop('invalid'); return; }
        if (message.type === 'rejected') {
          if (pending) pending.rejected = true;
          onRejected(message.reason); return;
        }
        if (message.type !== 'snapshot' || !message.room || !Array.isArray(message.seats) ||
            !Array.isArray(message.members) || message.you !== client || message.room.code !== code ||
            !Number.isSafeInteger(message.room.rev) || message.room.rev < 0) { stop('invalid'); return; }
        if (snapshot && message.room.rev < snapshot.room.rev) return;
        const previous = snapshot;
        const initial = first; first = false;
        snapshot = message; hadSnapshot = true; state = 'connected'; reason = ''; attempt = 0;
        offlineSince = null; clearTimeout(offlineTimer); offlineTimer = null;
        if (initial || acknowledged(pending, message)) { pending = null; clearTimeout(deadline); deadline = null; }
        write('familyRoomSession', JSON.stringify({ code, gameType, clientId: client }));
        onSnapshot(message, previous, { initial });
        if (current()) emit();
      };
      ws.onerror = () => { if (current()) failed(); };
      ws.onclose = event => {
        if (!current()) return;
        const terminal = { 4400: 'invalid', 4403: 'forbidden', 4404: 'missing', 4409: 'replaced' }[event.code];
        if (terminal) stop(terminal, ['forbidden', 'missing'].includes(terminal));
        else failed();
      };
    }
    function join(value, options = {}) {
      if (!codeValid(value)) return false;
      stop('switch'); snapshot = null; hadSnapshot = false; attempt = 0; offlineSince = null;
      code = value; stopped = false; recovering = !!options.recovering;
      if (recovering) { offlineSince = Date.now(); offlineTimer = setTimeout(emit, 30000); }
      connect(); return true;
    }
    async function createRoom() {
      stop('switch'); stopped = false; state = 'connecting'; reason = ''; emit();
      const token = generation, controller = new AbortController(); fetchController = controller;
      deadline = setTimeout(() => controller.abort(), 5000);
      try {
        const response = await fetch(`${server}/rooms`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gameType, maxSeats, client }), signal: controller.signal });
        if (!response.ok) throw Error('방 생성 실패');
        const result = await response.json();
        if (token !== generation || stopped) return false;
        if (!codeValid(result.code)) throw Error('방 코드 오류');
        clearTimeout(deadline); deadline = null; fetchController = null;
        return join(result.code);
      } catch {
        if (token === generation && !stopped) stop('unavailable', true);
        return false;
      }
    }
    function send(type, data = {}) {
      if (getStatus().locked || !socket || socket.readyState !== 1) return false;
      const message = { type, ...data };
      if (type === 'act' || type === 'start') message.baseRev = snapshot.room.rev;
      pending = { ...message, rev: snapshot.room.rev };
      try { socket.send(JSON.stringify(message)); } catch { failed(); return false; }
      deadline = setTimeout(failed, 5000); emit(); return true;
    }
    function leave() {
      const ws = socket;
      if (ws?.readyState === 1) { try { ws.send(JSON.stringify({ type: 'leave' })); } catch { /* 닫기 계속 */ } }
      // leave는 수신자에게 snapshot 없이 1000으로 닫힙니다. 재접속은 먼저 중단합니다.
      stopped = true; generation++; clearTimers(); socket = null; pending = null;
      write('familyRoomSession', null); state = 'stopped'; reason = 'left'; emit();
      if (ws) setTimeout(() => ws.close(), 5000);
    }
    return Object.freeze({ createRoom, join, stop, leave, getStatus, getSnapshot: () => snapshot,
      reconnect: () => {
        if (stopped || state === 'connecting') return;
        // 화면 복귀마다 끊으면 입력이 잠깁니다. 멀쩡해 보이는 연결은 심박으로만 확인합니다.
        if (state === 'connected' && socket?.readyState === 1) {
          if (pongTimer) return;
          try { socket.send('ping'); } catch { failed(); return; }
          pongTimer = setTimeout(failed, 5000); return;
        }
        clearTimeout(retry); retry = null; connect();
      },
      setSeats: seats => send('seats', { seats: seatDrafts(seats) }), start: value => send('start', { state: value }),
      submit: value => send('act', { state: value }), claim: seatId => send('claim', { seatId }),
      kick: id => send('kick', { client: id }), lobby: () => send('lobby') });
  }
  window.FamilyRoom = Object.freeze({ create, getClientId, readSession, serverURL, codeValid, ownSeats,
    permissionsFor, canClaim, seatDrafts, acknowledged, clearSession: () => write('familyRoomSession', null) });
})();
