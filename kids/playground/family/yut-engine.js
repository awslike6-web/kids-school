// 가족 윷놀이 순수 규칙 엔진. DOM·저장소·통신 없이 불변 상태를 반환합니다.
(() => {
  const THROWS = Object.freeze(['backdo', 'do', 'gae', 'geol', 'yut', 'mo']);
  const STEPS = Object.freeze({ backdo: -1, do: 1, gae: 2, geol: 3, yut: 4, mo: 5 });
  const WAITING = -1;
  const DONE = 30;
  const ASSISTS = ['helper', 'tactic', 'classic'];
  const STATE_KEYS = ['v', 'gameType', 'stateVersion', 'turnPlayer', 'players', 'publicBoard', 'result', 'lastAction'];

  const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
  const OUTER_FROM_15 = [...range(15, 20), DONE];
  const SHORTCUT_A = [21, 22, 23, 24, 25, ...OUTER_FROM_15];
  const SHORTCUT_B = [26, 27, 23, 28, 29, 20, DONE];

  const TAILS = new Map([
    [WAITING, [...range(1, 20), DONE]],
    [5, SHORTCUT_A],
    [10, SHORTCUT_B],
    [23, [28, 29, 20, DONE]],
    [21, SHORTCUT_A.slice(1)],
    [22, SHORTCUT_A.slice(2)],
    [24, SHORTCUT_A.slice(4)],
    [25, SHORTCUT_A.slice(5)],
    [26, SHORTCUT_B.slice(1)],
    [27, SHORTCUT_B.slice(2)],
    [28, [29, 20, DONE]],
    [29, [20, DONE]]
  ]);
  for (let pos = 1; pos <= 20; pos++) {
    if (!TAILS.has(pos)) TAILS.set(pos, [...range(pos + 1, 20), DONE]);
  }

  function isPlainObject(value) {
    return Boolean(value) && typeof value === 'object' && Object.prototype.toString.call(value) === '[object Object]';
  }

  function deepEqual(a, b) {
    if (a === b) return true;
    if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    if (Array.isArray(a)) return a.length === b.length && a.every((v, i) => deepEqual(v, b[i]));
    if (!isPlainObject(a) || !isPlainObject(b)) return false;
    const keysA = Object.keys(a), keysB = Object.keys(b);
    return keysA.length === keysB.length && keysA.every(k => Object.hasOwn(b, k) && deepEqual(a[k], b[k]));
  }

  function routeOf(from, steps) {
    if (!Number.isInteger(steps) || steps < 1 || steps > 5 || !Number.isInteger(from)) return [];
    const tail = TAILS.get(from);
    return tail ? tail.slice(0, steps) : [];
  }

  function rollSticks(rng = Math.random) {
    if (typeof rng !== 'function') throw new TypeError('난수 생성기는 함수여야 합니다.');
    const sticks = [rng() < 0.5, rng() < 0.5, rng() < 0.5, rng() < 0.5];
    const flat = sticks.filter(Boolean).length;
    const result = flat === 0 ? 'mo' : flat === 1 ? (sticks[0] ? 'backdo' : 'do')
      : flat === 2 ? 'gae' : flat === 3 ? 'geol' : 'yut';
    return { sticks, result };
  }

  function createGame(players, pieceCount = 4) {
    if (!Array.isArray(players) || players.length < 2 || players.length > 4 ||
        !Number.isInteger(pieceCount) || pieceCount < 2 || pieceCount > 4) {
      throw new Error('2~4명과 말 2~4개를 골라 주세요.');
    }
    const ids = new Set(), avatars = new Set();
    const people = players.map(p => {
      if (!p || typeof p !== 'object' || typeof p.id !== 'string' ||
          !/^[a-zA-Z0-9_-]{1,32}$/.test(p.id) || ids.has(p.id)) {
        throw new Error('참가자 ID가 올바르지 않거나 겹칩니다.');
      }
      const name = typeof p.name === 'string' ? p.name.trim() : '';
      const nameLen = Array.from(name).length;
      if (nameLen < 1 || nameLen > 8 || !ASSISTS.includes(p.assist) || !isPlainObject(p.avatar)) {
        throw new Error('이름(1~8자), 말 객체, 도움 단계를 확인해 주세요.');
      }
      const avatarJson = JSON.stringify(p.avatar);
      if (typeof avatarJson !== 'string' || avatars.has(avatarJson)) {
        throw new Error('참가자 말은 서로 달라야 합니다.');
      }
      const avatar = JSON.parse(avatarJson);
      if (!isPlainObject(avatar)) throw new Error('참가자 말은 객체여야 합니다.');
      ids.add(p.id);
      avatars.add(avatarJson);
      return { id: p.id, name, avatar, assist: p.assist };
    });

    const pieces = [];
    for (const person of people) {
      for (let i = 0; i < pieceCount; i++) {
        pieces.push({ id: `${person.id}-${i}`, owner: person.id, pos: WAITING, trail: [] });
      }
    }
    return {
      v: 1,
      gameType: 'yut',
      stateVersion: 0,
      turnPlayer: 0,
      players: people,
      publicBoard: { pieceCount, phase: 'throw', pending: [], log: [], pieces },
      result: null,
      lastAction: null
    };
  }

  function planStep(from, trail, throwResult) {
    if (from === DONE || !THROWS.includes(throwResult)) return null;
    if (throwResult === 'backdo') {
      if (from === WAITING) return null;
      const to = trail.length > 0 ? trail[trail.length - 1] : (from === 1 ? 20 : from - 1);
      const nextTrail = trail.length > 0 ? trail.slice(0, -1) : [];
      return { path: [to], to, nextTrail };
    }
    const path = routeOf(from, STEPS[throwResult]);
    if (!path.length) return null;
    const to = path[path.length - 1];
    if (to === DONE) return { path, to, nextTrail: [] };
    const passed = from === WAITING ? path.slice(0, -1) : [from, ...path.slice(0, -1)];
    return { path, to, nextTrail: [...trail, ...passed] };
  }

  function canUsePending(pieces, actor, pending) {
    if (!pending.length) return false;
    const active = pieces.filter(p => p.owner === actor && p.pos !== DONE);
    return active.length > 0 && (active.some(p => p.pos !== WAITING) || pending.some(r => r !== 'backdo'));
  }

  function legalMoves(state) {
    const b = state?.publicBoard;
    if (!b || state.result !== null || b.phase !== 'move') return [];
    const actor = state.players?.[state.turnPlayer]?.id;
    if (!actor) return [];
    const groups = [], seenPos = new Set();
    for (const p of b.pieces) {
      if (p.owner !== actor || p.pos === DONE || seenPos.has(p.pos)) continue;
      seenPos.add(p.pos);
      const members = p.pos === WAITING ? [p] : b.pieces.filter(q => q.owner === actor && q.pos === p.pos);
      groups.push({ from: p.pos, trail: p.trail, pieceIds: members.map(q => q.id) });
    }
    const moves = [];
    for (let throwIndex = 0; throwIndex < b.pending.length; throwIndex++) {
      const result = b.pending[throwIndex];
      for (const g of groups) {
        const step = planStep(g.from, g.trail, result);
        if (!step) continue;
        const { path, to } = step;
        const captures = to === DONE ? [] : b.pieces.filter(q => q.owner !== actor && q.pos === to).map(q => q.id);
        const joins = to === DONE ? []
          : b.pieces.filter(q => q.owner === actor && q.pos === to && !g.pieceIds.includes(q.id)).map(q => q.id);
        moves.push({ pieceIds: [...g.pieceIds], from: g.from, to, path, throwIndex, result, captures, joins });
      }
    }
    return moves;
  }

  function applyThrow(state, result) {
    const b = state?.publicBoard, actor = state?.players?.[state?.turnPlayer]?.id;
    if (!b || !actor || state.result !== null || b.phase !== 'throw' || !THROWS.includes(result)) return state;
    const nextPending = [...b.pending, result];
    const log = [...b.log, { type: 'THROW', by: actor, result }];
    const lastAction = { type: 'THROW', by: actor, result };
    const pieces = b.pieces.map(p => ({ ...p, trail: [...p.trail] }));

    if (result === 'yut' || result === 'mo') {
      return { ...state, stateVersion: state.stateVersion + 1,
        publicBoard: { ...b, phase: 'throw', pending: nextPending, log, pieces }, lastAction };
    }
    if (canUsePending(pieces, actor, nextPending)) {
      return { ...state, stateVersion: state.stateVersion + 1,
        publicBoard: { ...b, phase: 'move', pending: nextPending, log, pieces }, lastAction };
    }
    return { ...state, stateVersion: state.stateVersion + 1,
      turnPlayer: (state.turnPlayer + 1) % state.players.length,
      publicBoard: { ...b, phase: 'throw', pending: [], log, pieces }, lastAction };
  }

  function applyMove(state, pieceId, throwIndex) {
    const b = state?.publicBoard, actor = state?.players?.[state?.turnPlayer]?.id;
    if (!b || !actor || state.result !== null || b.phase !== 'move' || typeof pieceId !== 'string' ||
        !Number.isInteger(throwIndex) || throwIndex < 0 || throwIndex >= b.pending.length) return state;
    const target = b.pieces.find(p => p.id === pieceId);
    if (!target || target.owner !== actor || target.pos === DONE) return state;
    const throwResult = b.pending[throwIndex];
    const step = planStep(target.pos, target.trail, throwResult);
    if (!step) return state;

    const from = target.pos;
    const { to, nextTrail } = step;
    const moving = from === WAITING ? [target] : b.pieces.filter(p => p.owner === actor && p.pos === from);
    const pieceIds = moving.map(p => p.id), movingSet = new Set(pieceIds);
    const captured = to === DONE ? [] : b.pieces.filter(p => p.owner !== actor && p.pos === to).map(p => p.id);
    const capturedSet = new Set(captured);

    const pieces = b.pieces.map(p => {
      if (movingSet.has(p.id)) return { ...p, pos: to, trail: [...nextTrail] };
      if (capturedSet.has(p.id)) return { ...p, pos: WAITING, trail: [] };
      if (to !== DONE && p.owner === actor && p.pos === to) return { ...p, trail: [...nextTrail] };
      return { ...p, trail: [...p.trail] };
    });

    const remPending = b.pending.filter((_, i) => i !== throwIndex);
    const log = [...b.log, { type: 'MOVE', by: actor, pieceId, throwIndex }];
    const lastAction = { type: 'MOVE', by: actor, pieceIds, from, to, result: throwResult, captured };

    if (pieces.filter(p => p.owner === actor).every(p => p.pos === DONE)) {
      return { ...state, stateVersion: state.stateVersion + 1,
        publicBoard: { ...b, phase: 'over', pending: [], log, pieces },
        result: { type: 'win', winner: actor }, lastAction };
    }
    if (captured.length > 0) {
      return { ...state, stateVersion: state.stateVersion + 1,
        publicBoard: { ...b, phase: 'throw', pending: remPending, log, pieces }, lastAction };
    }
    if (canUsePending(pieces, actor, remPending)) {
      return { ...state, stateVersion: state.stateVersion + 1,
        publicBoard: { ...b, phase: 'move', pending: remPending, log, pieces }, lastAction };
    }
    return { ...state, stateVersion: state.stateVersion + 1,
      turnPlayer: (state.turnPlayer + 1) % state.players.length,
      publicBoard: { ...b, phase: 'throw', pending: [], log, pieces }, lastAction };
  }

  function rematch(state) {
    if (!state?.result || state.publicBoard?.phase !== 'over' ||
        !Array.isArray(state.players) || state.players.length < 2) return state;
    const rotated = [...state.players.slice(1), state.players[0]];
    const next = createGame(rotated, state.publicBoard.pieceCount);
    return { ...next, stateVersion: state.stateVersion + 1, lastAction: { type: 'REMATCH' } };
  }

  function isValidSaved(state) {
    try {
      if (!isPlainObject(state)) return false;
      const topKeys = Object.keys(state);
      if (topKeys.length !== STATE_KEYS.length || !STATE_KEYS.every(k => Object.hasOwn(state, k))) return false;
      const b = state.publicBoard;
      if (state.v !== 1 || state.gameType !== 'yut' || !Number.isSafeInteger(state.stateVersion) ||
          state.stateVersion < 0 || !isPlainObject(b) || !Array.isArray(b.log) ||
          state.stateVersion < b.log.length) return false;

      let replay = createGame(state.players, b.pieceCount);
      if (!deepEqual(state.players, replay.players)) return false;

      for (const act of b.log) {
        if (!isPlainObject(act) || act.by !== replay.players[replay.turnPlayer].id) return false;
        let next = replay;
        if (act.type === 'THROW') next = applyThrow(replay, act.result);
        else if (act.type === 'MOVE') next = applyMove(replay, act.pieceId, act.throwIndex);
        else return false;
        if (next === replay) return false;
        replay = next;
      }

      if (state.turnPlayer !== replay.turnPlayer || !deepEqual(state.result, replay.result) ||
          !deepEqual(b, replay.publicBoard)) return false;

      if (b.log.length === 0) {
        if (state.lastAction === null) return state.stateVersion === 0;
        if (deepEqual(state.lastAction, { type: 'REMATCH' })) return state.stateVersion >= 1;
        return false;
      }
      return deepEqual(state.lastAction, replay.lastAction);
    } catch {
      return false;
    }
  }

  window.YutEngine = Object.freeze({
    THROWS, STEPS, WAITING, DONE, routeOf, rollSticks, createGame, legalMoves, applyThrow, applyMove, rematch, isValidSaved
  });
})();
