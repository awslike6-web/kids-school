import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';

const root = new URL('../', import.meta.url), base = new URL('kids/playground/family/', root);
const read = name => readFileSync(new URL(name, base), 'utf8');
const forbidden = () => { throw Error('순수 엔진에서 DOM·저장소·통신 사용'); };
const context = { fetch: forbidden };
Object.defineProperties(context, { document: { get: forbidden }, localStorage: { get: forbidden } });
context.window = context;
vm.runInNewContext(read('omok-engine.js'), context);
const E = context.OmokEngine, plain = v => JSON.parse(JSON.stringify(v));
const people = () => [
  { id: 'p1', name: '민서', avatar: { type: 'emoji', value: '🐰' }, assist: 'helper' },
  { id: 'p2', name: '민수', avatar: { type: 'emoji', value: '🐻' }, assist: 'tactic' }
];
const game = size => E.createGame(people(), size);
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
function play(black, white, size = 13) {
  let s = game(size);
  for (let i = 0; i < black.length; i++) {
    s = E.place(s, ...black[i]);
    if (i < white.length) s = E.place(s, ...white[i]);
  }
  return s;
}
const spare = [[8, 0], [8, 2], [8, 4], [8, 6]];

test('엔진 단일 전역·API·9/13/15줄·초기 상태', () => {
  assert.deepEqual(Object.keys(context).sort(), ['OmokEngine', 'fetch', 'window']);
  assert.deepEqual(plain(E.SIZES), [9, 13, 15]);
  for (const n of E.SIZES) {
    const s = game(n);
    assert.equal(E.boardOf(s).length, n); assert.ok(E.boardOf(s).every(row => row.length === n && row.every(v => v === null)));
    assert.equal(s.players[0].stone, 'black'); assert.equal(s.players[1].stone, 'white');
    assert.equal(s.lastAction, null); assert.equal(s.result, null); assert.equal(s.stateVersion, 0);
    assert.equal(E.isValidSaved(s), true);
  }
  assert.equal(game().publicBoard.size, 13);
});

for (const [name, points] of [
  ['가로 가장자리', [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]]],
  ['세로 가장자리', [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]]],
  ['오른쪽 아래 대각선', [[0, 0], [1, 1], [2, 2], [3, 3], [4, 4]]],
  ['오른쪽 위 대각선', [[0, 8], [1, 7], [2, 6], [3, 5], [4, 4]]]
]) test(`${name} 다섯 돌 승리와 line`, () => {
  const s = play(points, spare, 9);
  assert.deepEqual(plain(s.result), { type: 'win', winner: 'p1', line: points });
  assert.equal(E.isValidSaved(s), true);
  assert.equal(E.place(s, 7, 7), s); assert.equal(E.undo(s), s);
  assert.deepEqual(plain(E.hints(s, 'helper')), {});
});

test('넷은 승리 아님·빈틈을 메워 여섯 이상 연결하면 승리', () => {
  let s = play([[0, 0], [1, 0], [2, 0], [4, 0], [5, 0]], [...spare, [7, 8]]);
  assert.equal(s.result, null);
  s = E.place(s, 3, 0);
  assert.equal(s.result.line.length, 6);
  assert.deepEqual(plain(s.result.line), Array.from({ length: 6 }, (_, x) => [x, 0]));
  assert.equal(E.isValidSaved(s), true);
});

test('백돌도 승리하고 흑백 차례·불변성·버전·무효 행동을 보존한다', () => {
  const input = people(), s = freeze(E.createGame(input)), before = JSON.stringify(s);
  input[0].avatar.value = '🐸';
  const next = E.place(s, 6, 6);
  assert.equal(JSON.stringify(s), before); assert.equal(next.stateVersion, 1); assert.equal(next.turnPlayer, 1);
  assert.equal(E.boardOf(next)[6][6], 'black'); assert.equal(next.players[0].avatar.value, '🐰');
  for (const xy of [[6, 6], [-1, 0], [13, 0], [0, 13], [0.5, 1], ['0', 0], [NaN, 0]])
    assert.equal(E.place(next, ...xy), next);
  const w = play([[8, 0], [8, 2], [8, 4], [8, 6], [6, 8]], [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]]);
  assert.equal(w.result.winner, 'p2'); assert.equal(E.isValidSaved(w), true);
});

test('무르기는 직전 착수만·사람마다 2회·차례 복원·연속으로 상대 돌을 지우지 않는다', () => {
  let s = game(); assert.equal(E.undo(s), s);
  for (let i = 0; i < 2; i++) {
    const placed = freeze(E.place(s, i, 0)), old = JSON.stringify(placed);
    s = E.undo(placed);
    assert.equal(JSON.stringify(placed), old); assert.equal(s.stateVersion, placed.stateVersion + 1);
    assert.equal(s.turnPlayer, 0); assert.equal(s.publicBoard.moves.length, 0);
    assert.equal(s.publicBoard.undoLeft.p1, 1 - i); assert.equal(E.isValidSaved(s), true);
    assert.equal(E.undo(s), s);
  }
  s = E.place(s, 0, 0); assert.equal(E.undo(s), s);
  s = E.place(s, 1, 0);
  const before = s;
  s = E.undo(freeze(s)); assert.equal(s.lastAction.by, 'p2'); assert.equal(s.turnPlayer, 1);
  assert.equal(s.publicBoard.moves.length, 1); assert.equal(s.publicBoard.moves[0].by, 'p1');
  assert.equal(s.publicBoard.undoLeft.p2, 1); assert.equal(E.undo(s), s);
  assert.equal(before.publicBoard.moves.length, 2); assert.equal(E.isValidSaved(s), true);
  s = E.undo(E.place(s, 2, 0)); assert.equal(s.publicBoard.undoLeft.p2, 0);
  s = E.place(s, 3, 0); assert.equal(E.undo(s), s);
});

test('helper 승리·방어, tactic 방어만, classic은 빈 결과·상태 불변', () => {
  const s = freeze(play([[0, 0], [1, 0], [2, 0], [3, 0]], [[0, 2], [1, 2], [2, 2], [3, 2]]));
  const before = JSON.stringify(s);
  assert.deepEqual(plain(E.hints(s, 'helper')), { win: [[4, 0]], block: [[4, 2]] });
  assert.deepEqual(plain(E.hints(s, 'tactic')), { block: [[4, 2]] });
  assert.deepEqual(plain(E.hints(s, 'classic')), {}); assert.deepEqual(plain(E.hints(s, 'bad')), {});
  assert.equal(JSON.stringify(s), before);
});

test('9줄 판의 실제 81착수 무승부·최종 수 전에는 승부 없음', () => {
  const black = [], white = [];
  for (let y = 0; y < 9; y++) for (let x = 0; x < 9; x++) ((x + 2 * y) % 4 < 2 ? black : white).push([x, y]);
  let s = game(9);
  for (let i = 0; i < 81; i++) {
    assert.equal(s.result, null);
    s = E.place(s, ...(i % 2 ? white : black).shift());
  }
  assert.deepEqual(plain(s.result), { type: 'draw' }); assert.equal(E.isValidSaved(s), true);
});

test('다시 하기는 같은 사람·판 크기, 흑백 교대·횟수 초기화·버전 증가', () => {
  const s = freeze(E.undo(E.place(game(15), 2, 2))), next = E.rematch(s);
  assert.equal(next.players[0].id, 'p2'); assert.equal(next.players[0].stone, 'black');
  assert.equal(next.players[1].id, 'p1'); assert.equal(next.players[1].stone, 'white');
  assert.equal(next.publicBoard.size, 15); assert.equal(next.publicBoard.moves.length, 0);
  assert.deepEqual(plain(next.publicBoard.undoLeft), { p2: 2, p1: 2 });
  assert.equal(next.stateVersion, s.stateVersion + 1); assert.equal(E.isValidSaved(next), true);
  assert.equal(E.isValidSaved(E.place(next, 1, 1)), true);
});

test('이어하기는 겹친 수·순서·조작된 결과·크기·버전·무르기·마지막 행동을 거부', () => {
  const s = play([[0, 0], [1, 0]], [[0, 1], [1, 1]]);
  assert.equal(E.isValidSaved(JSON.parse(JSON.stringify(s))), true);
  for (const mutate of [
    v => { v.publicBoard.moves[1].x = 0; v.publicBoard.moves[1].y = 0; },
    v => { v.publicBoard.moves[0].by = 'p2'; }, v => { v.turnPlayer = 1; },
    v => { v.publicBoard.size = 12; }, v => { v.stateVersion = -1; },
    v => { v.stateVersion = 0; }, v => { v.publicBoard.undoLeft.p1 = 3; },
    v => { v.publicBoard.undoLeft.p2 = 1.5; }, v => { v.lastAction.x = 8; },
    v => { v.result = { type: 'draw' }; }, v => { v.players[0].stone = 'white'; },
    v => { v.lastAction = null; }, v => { v.v = 2; }, v => { v.gameType = 'yacht'; }
  ]) { const bad = plain(s); mutate(bad); assert.equal(E.isValidSaved(bad), false); }
  const won = play([[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]], spare);
  const badLine = plain(won); badLine.result.line.pop(); assert.equal(E.isValidSaved(badLine), false);
  const beyond = plain(won); beyond.publicBoard.moves.push({ x: 7, y: 7, by: 'p2' }); assert.equal(E.isValidSaved(beyond), false);
  for (const bad of [null, {}, [], 'text']) assert.equal(E.isValidSaved(bad), false);
});

test('입력은 정확히 2명·고유 ID/말·이름 1~8자·도움·유효 주소만 허용한다', () => {
  for (const n of [0, 1, 3]) assert.throws(() => E.createGame(Array(n).fill(people()[0])));
  for (const size of [0, 10, '13', null]) assert.throws(() => E.createGame(people(), size));
  for (const change of [p => { p[0].name = ''; }, p => { p[0].name = '123456789'; },
    p => { p[0].id = p[1].id; }, p => { p[0].avatar = p[1].avatar; }, p => { p[0].assist = 'bad'; }]) {
    const p = people(); change(p); assert.throws(() => E.createGame(p));
  }
  const p = people(); p[0].name = '😀'.repeat(8); assert.doesNotThrow(() => E.createGame(p));
  p[0].avatar = { type: 'gallery', value: { artId: 'art', charKey: 'main', name: '친구', spriteUrl: 'https://example.test/a.png' } };
  assert.doesNotThrow(() => E.createGame(p));
  for (const url of ['javascript:x', '//evil/a', 'http://evil/a', '#x', 'a\\b']) {
    p[0].avatar.value.spriteUrl = url; assert.throws(() => E.createGame(p));
  }
});

test('화면 리소스·공통 CSS·로드 순서·파일 상한·로비와 대문 진입', () => {
  const html = read('omok.html'), scripts = [...html.matchAll(/<script\s+src="([^"]+)"/g)].map(m => m[1]);
  assert.deepEqual(scripts, ['../../core/fairy-config.js', '../../core/fairy-tts.js', '../../core/fairy-settings-catalog.js',
    '../../core/fairy-engine.js', '../../data/gallery-data.js', '../../subjects/quest/monster_roster.js',
    'family-players.js', 'family-sound.js', 'omok-engine.js', 'family-room.js', 'family-room-ui.js', 'omok-ui.js']);
  for (const [, target] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    assert.doesNotMatch(target, /^(?:\/|[a-z]+:)/i); assert.ok(existsSync(new URL(target, base)), target);
  }
  assert.match(html, /href="yacht.css"/); assert.doesNotMatch(html, /Content-Security-Policy/);
  for (const [file, max] of [['omok-engine.js', 300], ['omok-ui.js', 600], ['omok.html', 150], ['omok.css', 400], ['family-players.js', 300]])
    assert.ok(read(file).trimEnd().split('\n').length <= max, file);
  const config = readFileSync(new URL('kids/js/lobby_config.js', root), 'utf8');
  assert.equal(config.split("href: 'kids/playground/family/omok.html'").length, 3);
  assert.match(readFileSync(new URL('kids/playground/index.html', root), 'utf8'), /href="family\/omok.html" class="pg-card"/);
});

test('결정적 혼합 착수·무르기·다시 하기 후 매번 JSON 왕복 검증을 통과한다', () => {
  let seed = 20261101;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  for (const size of E.SIZES) {
    let s = game(size);
    for (let i = 0; i < 160; i++) {
      if (s.result || random() < .03) s = E.rematch(s);
      else if (random() < .2) s = E.undo(s);
      else {
        const board = E.boardOf(s), empty = [];
        for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!board[y][x]) empty.push([x, y]);
        s = E.place(s, ...empty[Math.floor(random() * empty.length)]);
      }
      assert.equal(E.isValidSaved(plain(s)), true, '판 크기 '+size+', 단계 '+i);
    }
  }
});
