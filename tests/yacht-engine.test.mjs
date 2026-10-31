import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';

const root = new URL('../', import.meta.url);
const source = readFileSync(new URL('kids/playground/family/yacht-engine.js', root), 'utf8');
const forbidden = () => { throw Error('엔진에서 화면·저장소·네트워크를 사용했어요.'); };
const context = { crypto: webcrypto, fetch: forbidden };
Object.defineProperties(context, { document: { get: forbidden }, localStorage: { get: forbidden } });
context.window = context;
vm.runInNewContext(source, context, { filename: 'yacht-engine.js' });
const E = context.YachtEngine;
const plain = value => JSON.parse(JSON.stringify(value));
const people = count => Array.from({ length: count }, (_, i) => ({ id: `p${i + 1}`, name: ['민서', '민수', '아빠', '엄마', '이모'][i],
  avatar: { type: 'emoji', value: ['🐰', '🐻', '🦊', '🐯', '🐸'][i] }, assist: ['helper', 'tactic', 'classic', 'classic', 'classic'][i] }));
const game = (count = 2) => E.createGame(people(count), () => 0);
function rolled(dice, state = game()) {
  let index = 0;
  return E.roll(state, () => (dice[index++] - 1 + .5) / 6);
}
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}

test('브라우저 IIFE는 DOM·저장소 없이 로드되고 YachtEngine 하나만 공개한다', () => {
  assert.deepEqual(Object.keys(context).sort(), ['YachtEngine', 'crypto', 'fetch', 'window']);
  assert.equal(E.CATEGORIES.length, 12);
  assert.equal(new Set(E.CATEGORIES.map(c => c.id)).size, 12);
  assert.ok(E.CATEGORIES.every(c => c.name && c.description));
});

test('§7-1 상단 6칸은 해당 눈만 합산한다', () => {
  E.CATEGORIES.slice(0, 6).forEach((c, i) => {
    const face = i + 1, other = face === 6 ? 1 : 6;
    assert.equal(E.scoreFor([face, face, other, other, other], c.id), face * 2, c.id);
    assert.equal(E.scoreFor(Array(5).fill(other), c.id), 0, c.id);
    assert.equal(E.scoreFor(Array(5).fill(face), c.id), face * 5, c.id);
  });
});

const examples = [
  ['choice', [1, 2, 3, 4, 5], 15], ['choice', [6, 6, 6, 6, 6], 30],
  ['fourKind', [2, 2, 2, 2, 6], 14], ['fourKind', [2, 2, 2, 3, 3], 0],
  ['fourKind', [5, 5, 5, 5, 5], 25],
  ['fullHouse', [2, 2, 3, 3, 3], 13], ['fullHouse', [6, 6, 6, 6, 6], 30],
  ['fullHouse', [1, 1, 1, 1, 2], 0], ['fullHouse', [1, 2, 2, 3, 3], 0],
  ['smallStraight', [1, 2, 3, 4, 6], 15], ['smallStraight', [2, 3, 4, 5, 5], 15],
  ['smallStraight', [3, 3, 4, 5, 6], 15], ['smallStraight', [1, 2, 3, 5, 6], 0],
  ['smallStraight', [2, 2, 3, 4, 4], 0],
  ['largeStraight', [2, 3, 4, 5, 6], 30], ['largeStraight', [5, 3, 1, 4, 2], 30],
  ['largeStraight', [1, 2, 3, 4, 4], 0], ['largeStraight', [1, 2, 3, 4, 6], 0],
  ['yacht', [4, 4, 4, 4, 4], 50], ['yacht', [4, 4, 4, 4, 3], 0]
];
test('§7-1 하단 6칸의 성립·불성립과 다섯 눈 같은 풀하우스', () => {
  examples.forEach(([id, dice, expected]) => assert.equal(E.scoreFor(dice, id), expected, `${id}: ${dice}`));
  const options = E.scoreOptions([1, 2, 3, 4, 5]);
  assert.equal(options.choice, 15); assert.equal(options.smallStraight, 15); assert.equal(options.largeStraight, 30);
  assert.equal(options.yacht, 0); assert.equal(Object.keys(options).length, 12);
});

test('§7-2 상단 62/63 보너스와 하단 합계', () => {
  const below = { ones: 2, twos: 4, threes: 9, fours: 12, fives: 5, sixes: 30, choice: 20, yacht: 50 };
  assert.deepEqual(plain(E.totals(below)), { upper: 62, bonus: 0, lower: 70, total: 132 });
  assert.deepEqual(plain(E.totals({ ...below, ones: 3 })), { upper: 63, bonus: 35, lower: 70, total: 168 });
  assert.deepEqual(plain(E.totals(game().publicBoard.scores.p1)), { upper: 0, bonus: 0, lower: 0, total: 0 });
});

test('§7-3 첫 굴림 전 고정 불가·3회 제한·고정 주사위 보존', () => {
  const initial = game(); assert.equal(E.toggleKeep(initial, 0), initial);
  let s = rolled([1, 2, 3, 4, 5], initial);
  s = E.toggleKeep(s, 1); s = E.toggleKeep(s, 4);
  let calls = 0;
  s = E.roll(s, () => { calls++; return .99; });
  assert.equal(calls, 3); assert.deepEqual(plain(s.publicBoard.dice), [6, 2, 6, 6, 5]);
  s = E.roll(s, () => 0); assert.equal(s.publicBoard.rollCount, 3);
  assert.equal(E.roll(s, forbidden), s);
  for (const index of [-1, 5, 1.5, '0', NaN]) assert.equal(E.toggleKeep(s, index), s);
  s = E.toggleKeep(s, 1); assert.equal(s.publicBoard.kept[1], false);
});

test('§7-3 전부 고정하면 난수를 소비하지 않는다', () => {
  let s = rolled([1, 2, 3, 4, 5]);
  for (let i = 0; i < 5; i++) s = E.toggleKeep(s, i);
  const next = E.roll(s, forbidden);
  assert.equal(next.publicBoard.rollCount, 2);
  assert.deepEqual(plain(next.publicBoard.dice), [1, 2, 3, 4, 5]);
});

test('§7-4 빈 칸만 기록·굴리기 전 불가·0점 허용·사람과 라운드 전환', () => {
  const initial = game(); assert.equal(E.choose(initial, 'ones'), initial);
  let s = rolled([6, 6, 6, 6, 6]);
  assert.equal(E.choose(s, 'missing'), s);
  s = E.choose(s, 'ones');
  assert.equal(s.publicBoard.scores.p1.ones, 0); assert.equal(s.turnPlayer, 1); assert.equal(s.round, 1);
  assert.equal(s.publicBoard.rollCount, 0); assert.deepEqual(plain(s.publicBoard.kept), Array(5).fill(false));
  s = E.choose(rolled([1, 1, 1, 1, 1], s), 'ones');
  assert.equal(s.turnPlayer, 0); assert.equal(s.round, 2);
  s = rolled([2, 2, 2, 2, 2], s);
  assert.equal(E.choose(s, 'ones'), s);
});

test('§7-5 유효 행동은 원본 불변·버전 +1, 무효 행동은 같은 상태', () => {
  const initial = freeze(game()), before = JSON.stringify(initial);
  let s = E.roll(initial, () => .5); assert.equal(s.stateVersion, 1);
  assert.equal(JSON.stringify(initial), before); assert.equal(initial.lastAction, null);
  const snapshot = JSON.stringify(s); freeze(s);
  const kept = E.toggleKeep(s, 0); assert.equal(kept.stateVersion, 2); assert.equal(JSON.stringify(s), snapshot);
  freeze(kept);
  const chosen = E.choose(kept, 'choice'); assert.equal(chosen.stateVersion, 3);
  assert.equal(kept.publicBoard.scores.p1.choice, null); assert.equal(chosen.publicBoard.scores.p1.choice, 20);
  assert.deepEqual(plain(chosen.lastAction), { type: 'CHOOSE', by: 'p1', category: 'choice' });
  assert.equal(E.choose(chosen, 'choice'), chosen); assert.equal(chosen.stateVersion, 3);
  assert.notEqual(chosen.publicBoard.scores, kept.publicBoard.scores);
});

test('§7-6 1·1·3등 공동 순위, 동일 점수의 참가자 순서 유지', () => {
  const s = game(3); s.publicBoard.scores.p1.choice = 30; s.publicBoard.scores.p2.yacht = 50;
  s.publicBoard.scores.p1.fourKind = 20; s.publicBoard.scores.p3.choice = 10;
  const rows = E.ranking(freeze(s));
  assert.deepEqual(plain(rows.map(r => [r.player.id, r.rank, r.total])), [['p1', 1, 50], ['p2', 1, 50], ['p3', 3, 10]]);
});

test('§7-7 helper는 모든 빈 칸, tactic은 상위 2칸, classic은 빈 결과', () => {
  let s = rolled([6, 6, 6, 6, 6]);
  const helper = E.hints(s, 'helper'); assert.equal(Object.keys(helper.previews).length, 12);
  assert.equal(helper.previews.ones, 0); assert.equal(helper.previews.yacht, 50);
  assert.deepEqual(plain(helper.recommendations), []);
  assert.deepEqual(plain(E.hints(s, 'tactic').recommendations), ['yacht', 'fullHouse']);
  assert.deepEqual(plain(E.hints(s, 'classic')), {});
  s.publicBoard.scores.p1.yacht = 0;
  assert.deepEqual(plain(E.hints(s, 'tactic').recommendations), ['fullHouse', 'fourKind']);
  assert.ok(!Object.hasOwn(E.hints(s, 'helper').previews, 'yacht'));
  assert.deepEqual(plain(E.hints(game(), 'helper')), {});
});

test('§7-7 0점 동점도 아래쪽 칸 우선, 빈 칸 1개일 때 1개만 추천', () => {
  const s = rolled([1, 1, 2, 2, 6]);
  E.CATEGORIES.forEach(c => { s.publicBoard.scores.p1[c.id] = 0; });
  s.publicBoard.scores.p1.yacht = null; s.publicBoard.scores.p1.largeStraight = null;
  assert.deepEqual(plain(E.hints(s, 'tactic').recommendations), ['yacht', 'largeStraight']);
  s.publicBoard.scores.p1.yacht = 0;
  assert.deepEqual(plain(E.hints(s, 'tactic').recommendations), ['largeStraight']);
});

test('§7-8 고정 rng로 2인 24차례 완주·12라운드 종료·종료 후 변경 불가', () => {
  let s = game();
  for (let round = 0; round < 12; round++) {
    for (let player = 0; player < 2; player++) {
      assert.equal(s.round, round + 1); assert.equal(s.turnPlayer, player); assert.equal(E.isOver(s), false);
      const previous = s;
      s = E.choose(E.roll(freeze(s), () => 0), E.CATEGORIES[round].id);
      assert.equal(s.stateVersion, previous.stateVersion + 2);
    }
  }
  assert.equal(E.isOver(s), true); assert.equal(s.round, 12); assert.equal(s.stateVersion, 48);
  assert.deepEqual(plain(E.ranking(s).map(r => [r.rank, r.total])), [[1, 70], [1, 70]]);
  assert.equal(E.roll(s, forbidden), s); assert.equal(E.toggleKeep(s, 1), s); assert.equal(E.choose(s, 'yacht'), s);
  assert.deepEqual(plain(E.hints(s, 'helper')), {});
});

test('2~5명·이름·도움 단계·말·중복 ID 입력 검증과 참가자 원본 분리', () => {
  for (const count of [0, 1, 6]) assert.throws(() => E.createGame(people(count)));
  for (const count of [2, 3, 4, 5]) assert.equal(game(count).players.length, count);
  for (const name of ['', '         ', '123456789']) {
    const p = people(2); p[0].name = name; assert.throws(() => E.createGame(p));
  }
  const unicode = people(2); unicode[0].name = '😀'.repeat(8); assert.doesNotThrow(() => E.createGame(unicode));
  for (const change of [p => { p[0].assist = 'other'; }, p => { p[0].id = p[1].id; },
    p => { p[0].avatar = p[1].avatar; }, p => { p[0].avatar = null; }]) {
    const p = people(2); change(p); assert.throws(() => E.createGame(p));
  }
  const p = people(2), s = E.createGame(p); p[0].avatar.value = '🐸'; p[0].name = '수정';
  assert.equal(s.players[0].name, '민서'); assert.equal(s.players[0].avatar.value, '🐰');
});

test('갤러리 말의 작품+캐릭터 키 중복, 위험 주소와 구형 main 호환', () => {
  const p = people(2), avatar = { type: 'gallery', value: {
    artId: 'art_1', charKey: 'main', name: '그림 친구', spriteUrl: 'https://raw.githubusercontent.com/a/b/main/a.png' } };
  p[0].avatar = avatar; p[1].avatar = plain(avatar); assert.throws(() => E.createGame(p));
  p[1].avatar.value.charKey = 'second'; assert.doesNotThrow(() => E.createGame(p));
  p[1].avatar.value.charKey = 'main'; p[1].avatar.value.artId = 'art_2'; assert.doesNotThrow(() => E.createGame(p));
  for (const src of ['javascript:alert(1)', '//evil.test/a.png', 'http://evil.test/a.png', 'bad\\path', '#x']) {
    p[0].avatar.value.spriteUrl = src; assert.throws(() => E.createGame(p));
  }
});

test('잘못된 주사위·칸·난수 거부, 기본 crypto 난수 경로', () => {
  for (const dice of [[], Array(5), [1, 2, 3, 4], [0, 2, 3, 4, 5], [1, 2, 3, 4, 7], [1, 2, 3, 4, 1.1]])
    assert.throws(() => E.scoreFor(dice, 'ones'));
  assert.throws(() => E.scoreFor([1, 2, 3, 4, 5], 'unknown'));
  for (const n of [-.1, 1, NaN, Infinity, '0']) assert.throws(() => E.roll(game(), () => n));
  const dice = E.roll(game()).publicBoard.dice;
  assert.equal(dice.length, 5); assert.ok(dice.every(n => n >= 1 && n <= 6));
});

test('화면 리소스·상대 경로·로드 순서·줄 수·CSP 없음 계약', () => {
  const base = new URL('kids/playground/family/', root), html = readFileSync(new URL('yacht.html', base), 'utf8');
  const scripts = [...html.matchAll(/<script\s+src="([^"]+)"/g)].map(m => m[1]);
  assert.deepEqual(scripts, ['../../core/fairy-config.js', '../../core/fairy-tts.js',
    '../../core/fairy-settings-catalog.js', '../../core/fairy-engine.js', '../../data/gallery-data.js',
    '../../subjects/quest/monster_roster.js', 'yacht-engine.js', 'yacht-ui.js']);
  for (const m of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    assert.ok(!/^(?:\/|[a-z]+:)/i.test(m[1]), m[1]); assert.ok(existsSync(new URL(m[1], base)), m[1]);
  }
  assert.ok(!/Content-Security-Policy/i.test(html));
  for (const [file, limit] of [['yacht-engine.js', 300], ['yacht-ui.js', 600], ['yacht.html', 150], ['yacht.css', 500]]) {
    assert.ok(readFileSync(new URL(file, base), 'utf8').trimEnd().split('\n').length <= limit, file);
  }
});
