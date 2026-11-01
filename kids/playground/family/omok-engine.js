// 오목 규칙만 담당합니다. DOM·저장소·통신 없이 불변 상태를 반환합니다.
(() => {
  const SIZES = Object.freeze([9, 13, 15]);
  const DIRECTIONS = [[1, 0], [0, 1], [1, 1], [1, -1]];
  const EMOJI = ['🐰', '🐻', '🦊', '🐯', '🐸'];
  const inside = (n, x, y) => Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < n && y < n;

  function avatarKey(a) {
    if (a?.type === 'emoji' && EMOJI.includes(a.value)) return a.value;
    const v = a?.value;
    if (a?.type !== 'gallery' || !v || typeof v.artId !== 'string' || !v.artId.trim() ||
        typeof v.charKey !== 'string' || !/^[a-z0-9_-]{1,32}$/.test(v.charKey) ||
        typeof v.name !== 'string' || !v.name.trim() || Array.from(v.name.trim()).length > 12 ||
        typeof v.spriteUrl !== 'string' || !v.spriteUrl || /[\s\\\u0000-\u001f]/.test(v.spriteUrl)) return null;
    if (!/^https:\/\/[^/@?#]+(?:\/[^\s]*)?$/i.test(v.spriteUrl) &&
        (v.spriteUrl.startsWith('//') || v.spriteUrl.startsWith('#') || /^[^/?#]*:/.test(v.spriteUrl))) return null;
    return JSON.stringify([v.artId, v.charKey]);
  }

  function createGame(players, size = 13) {
    if (!SIZES.includes(size) || !Array.isArray(players) || players.length !== 2)
      throw Error('두 사람과 9·13·15줄 판을 골라 주세요.');
    const ids = new Set(), avatars = new Set();
    const people = players.map((p, i) => {
      const name = typeof p?.name === 'string' ? p.name.trim() : '', key = avatarKey(p?.avatar);
      if (!p || typeof p.id !== 'string' || !/^[a-zA-Z0-9_-]{1,32}$/.test(p.id) || ids.has(p.id) ||
          !name || Array.from(name).length > 8 || !key || avatars.has(key) ||
          !['helper', 'tactic', 'classic'].includes(p.assist))
        throw Error('이름은 1~8자, 말은 서로 다르게 골라 주세요.');
      ids.add(p.id); avatars.add(key);
      return { id: p.id, name, avatar: JSON.parse(JSON.stringify(p.avatar)), assist: p.assist, stone: i ? 'white' : 'black' };
    });
    return { v: 1, gameType: 'omok', stateVersion: 0, turnPlayer: 0, players: people,
      publicBoard: { size, moves: [], undoLeft: Object.fromEntries(people.map(p => [p.id, 2])) },
      result: null, lastAction: null };
  }

  function boardOf(state) {
    const board = Array.from({ length: state.publicBoard.size }, () => Array(state.publicBoard.size).fill(null));
    const stones = Object.fromEntries(state.players.map(p => [p.id, p.stone]));
    for (const m of state.publicBoard.moves) board[m.y][m.x] = stones[m.by];
    return board;
  }

  function winningLine(board, x, y, stone) {
    for (const [dx, dy] of DIRECTIONS) {
      const line = [[x, y]];
      for (const sign of [-1, 1]) {
        let nx = x + dx * sign, ny = y + dy * sign;
        while (inside(board.length, nx, ny) && board[ny][nx] === stone) {
          if (sign < 0) line.unshift([nx, ny]); else line.push([nx, ny]);
          nx += dx * sign; ny += dy * sign;
        }
      }
      if (line.length >= 5) return line;
    }
    return null;
  }

  function place(state, x, y) {
    const b = state.publicBoard;
    if (state.result || !inside(b.size, x, y)) return state;
    const board = boardOf(state);
    if (board[y][x]) return state;
    const player = state.players[state.turnPlayer], move = { x, y, by: player.id };
    board[y][x] = player.stone;
    const moves = [...b.moves, move], line = winningLine(board, x, y, player.stone);
    const result = line ? { type: 'win', winner: player.id, line } : moves.length === b.size * b.size ? { type: 'draw' } : null;
    return { ...state, stateVersion: state.stateVersion + 1, turnPlayer: 1 - state.turnPlayer,
      publicBoard: { ...b, moves }, result, lastAction: { type: 'PLACE', ...move } };
  }

  function undo(state) {
    const b = state.publicBoard, move = b.moves.at(-1);
    // 한 번 물린 뒤에는 새 착수 전까지 상대의 이전 돌을 물릴 수 없습니다.
    if (state.result || !move || state.lastAction?.type !== 'PLACE' || b.undoLeft[move.by] <= 0) return state;
    return { ...state, stateVersion: state.stateVersion + 1,
      turnPlayer: state.players.findIndex(p => p.id === move.by),
      publicBoard: { ...b, moves: b.moves.slice(0, -1), undoLeft: { ...b.undoLeft, [move.by]: b.undoLeft[move.by] - 1 } },
      lastAction: { type: 'UNDO', ...move } };
  }

  function hints(state, mode) {
    if (state.result || !['helper', 'tactic'].includes(mode)) return {};
    const board = boardOf(state), player = state.players[state.turnPlayer], other = state.players[1 - state.turnPlayer];
    const result = mode === 'helper' ? { win: [], block: [] } : { block: [] };
    for (let y = 0; y < board.length; y++) for (let x = 0; x < board.length; x++) {
      if (board[y][x]) continue;
      if (mode === 'helper') {
        board[y][x] = player.stone;
        if (winningLine(board, x, y, player.stone)) result.win.push([x, y]);
      }
      board[y][x] = other.stone;
      if (winningLine(board, x, y, other.stone)) result.block.push([x, y]);
      board[y][x] = null;
    }
    return result;
  }

  function rematch(state) {
    const next = createGame([...state.players].reverse(), state.publicBoard.size);
    return { ...next, stateVersion: state.stateVersion + 1, lastAction: { type: 'REMATCH' } };
  }

  function isValidSaved(state) {
    try {
      const b = state.publicBoard;
      if (state.v !== 1 || state.gameType !== 'omok' || !Number.isSafeInteger(state.stateVersion) || state.stateVersion < 0 ||
          !b || !Array.isArray(b.moves) || b.moves.length > b.size * b.size) return false;
      let replay = createGame(state.players, b.size);
      if (state.players.some((p, i) => p.stone !== replay.players[i].stone || p.name !== replay.players[i].name)) return false;
      if (!b.undoLeft || Object.keys(b.undoLeft).length !== 2) return false;
      const used = state.players.map(p => 2 - b.undoLeft[p.id]);
      if (used.some(n => !Number.isInteger(n) || n < 0 || n > 2)) return false;
      for (const m of b.moves) {
        if (!m || m.by !== replay.players[replay.turnPlayer].id) return false;
        const next = place(replay, m.x, m.y);
        if (next === replay) return false;
        replay = next;
      }
      const expected = replay.result, actual = state.result;
      if (state.turnPlayer !== replay.turnPlayer || (expected === null ? actual !== null :
          !actual || expected.type !== actual.type || (expected.type === 'win' &&
          (expected.winner !== actual.winner || JSON.stringify(expected.line) !== JSON.stringify(actual.line))))) return false;
      const actions = b.moves.length + 2 * used.reduce((a, n) => a + n, 0), a = state.lastAction;
      if (state.stateVersion < actions) return false;
      if (a === null) return actions === 0 && state.stateVersion === 0;
      if (!a || !['PLACE', 'UNDO', 'REMATCH'].includes(a.type)) return false;
      if (a.type === 'REMATCH') return actions === 0 && state.stateVersion > 0;
      if (a.type === 'PLACE') {
        const last = b.moves.at(-1);
        return !!last && a.by === last.by && a.x === last.x && a.y === last.y;
      }
      const actor = state.players[state.turnPlayer];
      if (state.result || a.by !== actor.id || !used[state.turnPlayer] || !inside(b.size, a.x, a.y) ||
          boardOf(replay)[a.y][a.x]) return false;
      // 물린 돌이 승리를 만들었다면 그 돌은 애초에 무를 수 없었습니다.
      return place(replay, a.x, a.y).result === null;
    } catch (e) { return false; }
  }

  window.OmokEngine = Object.freeze({ SIZES, createGame, boardOf, place, undo, hints, rematch, isValidSaved });
})();
