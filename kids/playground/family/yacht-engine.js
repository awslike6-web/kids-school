// 가족 야추의 규칙. 화면·저장소 없이 새 상태만 돌려줍니다.
(() => {
  const CATEGORIES = Object.freeze([
    ['ones', '에이스', '1의 합'], ['twos', '듀스', '2의 합'],
    ['threes', '트레이', '3의 합'], ['fours', '포', '4의 합'],
    ['fives', '파이브', '5의 합'], ['sixes', '식스', '6의 합'],
    ['choice', '초이스', '모든 눈의 합'], ['fourKind', '포카드', '같은 눈 4개 이상'],
    ['fullHouse', '풀하우스', '같은 눈 3개와 2개 (5개도 인정)'],
    ['smallStraight', '스몰 스트레이트', '연속 4개 · 15점'],
    ['largeStraight', '라지 스트레이트', '연속 5개 · 30점'],
    ['yacht', '야추', '같은 눈 5개 · 50점']
  ].map(([id, name, description]) => Object.freeze({ id, name, description })));
  const IDS = CATEGORIES.map(c => c.id);
  const EMOJI = ['🐰', '🐻', '🦊', '🐯', '🐸'];

  function random() {
    const n = new Uint32Array(1);
    // 2의 32승 중 6의 배수까지만 사용해 눈별 확률을 같게 합니다.
    do { crypto.getRandomValues(n); } while (n[0] >= 4294967292);
    return n[0] / 4294967292;
  }

  function avatarKey(avatar) {
    if (avatar?.type === 'emoji' && EMOJI.includes(avatar.value)) return avatar.value;
    const v = avatar?.value;
    if (avatar?.type !== 'gallery' || !v || typeof v.artId !== 'string' || !v.artId.trim() ||
        typeof v.charKey !== 'string' || !/^[a-z0-9_-]{1,32}$/.test(v.charKey) ||
        typeof v.name !== 'string' || !v.name.trim() || Array.from(v.name.trim()).length > 12 ||
        typeof v.spriteUrl !== 'string' || /[\s\\\u0000-\u001f]/.test(v.spriteUrl)) return null;
    if (!/^https:\/\/[^/@?#]+(?:\/[^\s]*)?$/i.test(v.spriteUrl) &&
        (!v.spriteUrl || v.spriteUrl.startsWith('//') || v.spriteUrl.startsWith('#') ||
         /^[^/?#]*:/.test(v.spriteUrl))) return null;
    return JSON.stringify([v.artId, v.charKey]);
  }

  function createGame(players, rng = random) {
    if (!Array.isArray(players) || players.length < 2 || players.length > 5 || typeof rng !== 'function')
      throw new Error('2~5명이 함께할 수 있어요.');
    const ids = new Set(), avatars = new Set();
    const people = players.map(p => {
      const name = typeof p?.name === 'string' ? p.name.trim() : '';
      const key = avatarKey(p?.avatar);
      if (!p || typeof p.id !== 'string' || !/^[a-zA-Z0-9_-]{1,32}$/.test(p.id) || ids.has(p.id) ||
          !name || Array.from(name).length > 8 || !key || avatars.has(key) ||
          !['helper', 'tactic', 'classic'].includes(p.assist))
        throw new Error('이름은 1~8자, 말은 서로 다르게 골라 주세요.');
      ids.add(p.id); avatars.add(key);
      return { id: p.id, name, avatar: JSON.parse(JSON.stringify(p.avatar)), assist: p.assist };
    });
    return { v: 1, gameType: 'yacht', stateVersion: 0, round: 1, turnPlayer: 0,
      players: people, publicBoard: { dice: [1, 1, 1, 1, 1], kept: Array(5).fill(false), rollCount: 0,
        scores: Object.fromEntries(people.map(p => [p.id, Object.fromEntries(IDS.map(id => [id, null]))])) },
      lastAction: null };
  }

  function validDice(dice) {
    return Array.isArray(dice) && dice.length === 5 && Array.from(dice).every(n => Number.isInteger(n) && n >= 1 && n <= 6);
  }

  function scoreFor(dice, category) {
    if (!validDice(dice) || !IDS.includes(category)) throw new Error('주사위나 점수 칸이 올바르지 않아요.');
    const counts = Array(7).fill(0);
    dice.forEach(n => counts[n]++);
    const sum = dice.reduce((a, b) => a + b, 0), index = IDS.indexOf(category);
    if (index < 6) return counts[index + 1] * (index + 1);
    if (category === 'choice') return sum;
    if (category === 'fourKind') return Math.max(...counts) >= 4 ? sum : 0;
    if (category === 'fullHouse') return counts.includes(5) || (counts.includes(3) && counts.includes(2)) ? sum : 0;
    if (category === 'yacht') return counts.includes(5) ? 50 : 0;
    let run = 0, longest = 0;
    for (let n = 1; n <= 6; n++) { run = counts[n] ? run + 1 : 0; longest = Math.max(longest, run); }
    return category === 'smallStraight' ? (longest >= 4 ? 15 : 0) : (longest >= 5 ? 30 : 0);
  }

  function scoreOptions(dice) {
    return Object.fromEntries(IDS.map(id => [id, scoreFor(dice, id)]));
  }

  function isOver(state) {
    return state.players.every(p => IDS.every(id => state.publicBoard.scores[p.id][id] !== null));
  }

  function changed(state, type, board) {
    return { ...state, stateVersion: state.stateVersion + 1, publicBoard: board,
      lastAction: { type, by: state.players[state.turnPlayer].id } };
  }

  function roll(state, rng = random) {
    const b = state.publicBoard;
    if (isOver(state) || b.rollCount >= 3) return state;
    const dice = b.dice.map((n, i) => {
      if (b.kept[i]) return n;
      const value = rng();
      if (!Number.isFinite(value) || value < 0 || value >= 1) throw new Error('난수는 0 이상 1 미만이어야 해요.');
      return Math.floor(value * 6) + 1;
    });
    return changed(state, 'ROLL', { ...b, dice, rollCount: b.rollCount + 1 });
  }

  function toggleKeep(state, index) {
    const b = state.publicBoard;
    if (isOver(state) || !b.rollCount || !Number.isInteger(index) || index < 0 || index > 4) return state;
    return changed(state, 'TOGGLE_KEEP', { ...b, kept: b.kept.map((v, i) => i === index ? !v : v) });
  }

  function choose(state, category) {
    const b = state.publicBoard, player = state.players[state.turnPlayer];
    if (isOver(state) || !b.rollCount || !IDS.includes(category) || b.scores[player.id][category] !== null) return state;
    const scores = { ...b.scores, [player.id]: { ...b.scores[player.id], [category]: scoreFor(b.dice, category) } };
    const next = changed(state, 'CHOOSE', { ...b, scores });
    next.lastAction.category = category;
    if (!isOver(next)) {
      next.turnPlayer = (state.turnPlayer + 1) % state.players.length;
      next.round = state.round + (next.turnPlayer === 0 ? 1 : 0);
      next.publicBoard = { ...next.publicBoard, dice: [1, 1, 1, 1, 1], kept: Array(5).fill(false), rollCount: 0 };
    }
    return next;
  }

  function totals(scoresOfPlayer) {
    const upper = IDS.slice(0, 6).reduce((n, id) => n + (scoresOfPlayer[id] ?? 0), 0);
    const lower = IDS.slice(6).reduce((n, id) => n + (scoresOfPlayer[id] ?? 0), 0);
    const bonus = upper >= 63 ? 35 : 0;
    return { upper, bonus, lower, total: upper + bonus + lower };
  }

  function ranking(state) {
    const rows = state.players.map(player => ({ player, ...totals(state.publicBoard.scores[player.id]) }))
      .sort((a, b) => b.total - a.total);
    let rank = 1;
    return rows.map((row, i) => {
      if (i && row.total !== rows[i - 1].total) rank = i + 1;
      return { ...row, rank };
    });
  }

  function hints(state, mode) {
    if (!state.publicBoard.rollCount || isOver(state) || !['helper', 'tactic'].includes(mode)) return {};
    const scores = state.publicBoard.scores[state.players[state.turnPlayer].id];
    const available = IDS.filter(id => scores[id] === null);
    const previews = Object.fromEntries(available.map(id => [id, scoreFor(state.publicBoard.dice, id)]));
    const recommendations = mode === 'tactic' ? [...available]
      .sort((a, b) => previews[b] - previews[a] || IDS.indexOf(b) - IDS.indexOf(a)).slice(0, 2) : [];
    return { previews, recommendations };
  }

  window.YachtEngine = Object.freeze({ CATEGORIES, createGame, roll, toggleKeep, scoreFor, scoreOptions,
    choose, totals, isOver, ranking, hints });
})();
