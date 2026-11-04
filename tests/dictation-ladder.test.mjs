// 받아쓰기 3단계 사다리: 단계 건너뛰기, 대기열, 함정, 채점, 숙련도 저장 계약
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function memoryStorage() {
  const data = new Map();
  return {
    getItem: k => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: k => data.delete(k),
    clear: () => data.clear()
  };
}

globalThis.localStorage = memoryStorage();
require(join(ROOT, 'kids/subjects/quest/quest-mastery.js'));
const L = require(join(ROOT, 'kids/js/dictation_ladder.js'));

const CHILD = '민서';
const zero = () => ({ c: 0, s: '', r: '' });
const fixedRng = () => 0.3;

beforeEach(() => globalThis.localStorage.clear());

test('한 어절은 블록을, 함정 없는 한 글자는 자석까지 건너뛴다', () => {
  assert.deepEqual(L.eligibleRounds('꽃이 좋아요.'), [1, 2, 3]);
  assert.deepEqual(L.eligibleRounds('학교'), [2, 3]);
  assert.deepEqual(L.eligibleRounds('눈'), [3]);
  assert.deepEqual(L.eligibleRounds('닭'), [2, 3], '겹받침 한 글자는 함정 글자로 자석 단계가 성립한다');
});

test('다음 단계는 통과한 단계 뒤의 풀 수 있는 단계이고, 끝나면 null이다', () => {
  assert.equal(L.nextRoundFor('학교', 0), 2);
  assert.equal(L.nextRoundFor('학교', 2), 3);
  assert.equal(L.nextRoundFor('학교', 3), null);
  assert.equal(L.nextRoundFor('눈', 1), 3);
});

test('회차 단계는 안 끝난 문장의 가장 낮은 단계이고 그 단계 문장만 대기열에 넣는다', () => {
  const items = [
    { id: 'a', word: '꽃이 좋아요.' },
    { id: 'b', word: '학교' },
    { id: 'c', word: '눈' }
  ];
  const states = { a: { c: 0 }, b: { c: 0 }, c: { c: 0 } };
  const stateOf = id => states[id];
  assert.equal(L.currentRound(items, stateOf), 1);
  assert.deepEqual(L.queueFor(items, 1, stateOf).map(i => i.id), ['a']);

  states.a.c = 1;
  assert.equal(L.currentRound(items, stateOf), 2);
  assert.deepEqual(L.queueFor(items, 2, stateOf).map(i => i.id), ['a', 'b']);

  states.a.c = 3; states.b.c = 3; states.c.c = 3;
  assert.equal(L.currentRound(items, stateOf), null);
  assert.deepEqual(L.progressOf(items, stateOf), { total: 3, done: 3, complete: true, started: true });
});

test('이어 하기: 일부만 통과한 단계는 남은 문장만 다시 낸다', () => {
  const items = [{ id: 'a', word: '꽃이 좋아요.' }, { id: 'b', word: '거울을 닦습니다.' }];
  const states = { a: { c: 1 }, b: { c: 0 } };
  assert.deepEqual(L.queueFor(items, L.currentRound(items, id => states[id]), id => states[id]).map(i => i.id), ['b']);
});

test('틀린 횟수에 따라 힌트를 먼저 주고 쉬운 방식으로 내려 준다', () => {
  assert.equal(L.shouldShowHint(1), false);
  assert.equal(L.shouldShowHint(2), true);
  assert.equal(L.inputModeFor(3, 2, '꽃이 좋아요.'), 'writing');
  assert.equal(L.inputModeFor(3, 3, '꽃이 좋아요.'), 'letters');
  assert.equal(L.inputModeFor(2, 3, '꽃이 좋아요.'), 'blocks');
  assert.equal(L.inputModeFor(2, 3, '학교'), 'letters', '한 어절은 더 내려갈 곳이 없다');
  assert.equal(L.inputModeFor(3, 5, '눈'), 'writing');
  assert.equal(L.inputModeFor(1, 5, '꽃이 좋아요.'), 'blocks');
});

test('함정은 겹받침 어절을 먼저 고르고 문장 부호를 유지한다', () => {
  const trap = L.pickTrap('거울을 열심히 닦습니다.');
  assert.ok(trap, '함정이 있어야 한다');
  assert.notEqual(trap.wrongToken, trap.token);
  assert.equal(L.pickTrap('넘어지지 않게 집중해서').clean, '않게');
  assert.equal(L.pickTrap('넘어지지 않게 집중해서').wrongToken, '안게');
  assert.equal(L.pickTrap('꽃이 좋아요.').wrongToken.endsWith('.') || L.pickTrap('꽃이 좋아요.').clean === '꽃이', true);
  assert.equal(L.pickTrap('학교'), null);
});

test('블록은 정답 어절 전부와 함정 하나로 만들고 정답 순서로 시작하지 않는다', () => {
  const chips = L.buildBlocks('넘어지지 않게 집중해서', fixedRng);
  assert.deepEqual(chips.filter(c => !c.trap).map(c => c.text).sort(), ['넘어지지', '않게', '집중해서'].sort());
  assert.deepEqual(chips.filter(c => c.trap).map(c => c.text), ['안게']);
  assert.notEqual(chips.filter(c => !c.trap).map(c => c.text).join(' '), '넘어지지 않게 집중해서');
  assert.equal(new Set(chips.map(c => c.id)).size, chips.length, 'id는 겹치지 않는다');
});

test('자석은 문장의 모든 글자와 없던 함정 글자를 최대 2개 담는다', () => {
  const sentence = '넘어지지 않게 집중해서';
  const chips = L.buildLetters(sentence, fixedRng);
  assert.deepEqual(chips.filter(c => !c.trap).map(c => c.text).sort(), Array.from(sentence.replace(/ /g, '')).sort());
  const traps = chips.filter(c => c.trap).map(c => c.text);
  assert.ok(traps.length >= 1 && traps.length <= 2);
  traps.forEach(ch => assert.ok(!sentence.includes(ch), `${ch}는 문장에 없어야 한다`));
  assert.deepEqual(L.buildLetters('학교', fixedRng).filter(c => c.trap), []);
});

test('채점은 문장 부호·띄어쓰기·글자를 구별하고, 마침표도 정답 조건이다', () => {
  assert.deepEqual(L.judge('사랑해요.', '사랑해요.'), { ok: true, kind: null });
  assert.deepEqual(L.judge('사랑해요.', '  사랑해요.  '), { ok: true, kind: null });
  assert.deepEqual(L.judge('사랑해요.', '사랑해요'), { ok: false, kind: 'punct' });
  assert.deepEqual(L.judge('꽃이 좋아요.', '꽃이좋아요.'), { ok: false, kind: 'space' });
  assert.deepEqual(L.judge('꽃이 좋아요.', '꼿이 좋아요.'), { ok: false, kind: 'letters' });
  assert.deepEqual(L.judge('학교', '학교'.normalize('NFD')), { ok: true, kind: null }, '자모가 분리된 입력도 같은 글자로 본다');
});

test('틀린 어절만 표시한다', () => {
  assert.deepEqual(L.diffTokens('꽃이 좋아요.', '꼿이 좋아요.'), [
    { text: '꽃이', wrong: true },
    { text: '좋아요.', wrong: false }
  ]);
});

test('통과하면 단계 번호와 날짜를 남기고 첫 통과일은 유지한다', () => {
  assert.deepEqual(L.passRound(zero(), 1, '2026-11-04'), { c: 1, s: '2026-11-04', r: '2026-11-04' });
  assert.deepEqual(L.passRound({ c: 1, s: '2026-11-04', r: '2026-11-04' }, 2, '2026-11-05'), { c: 2, s: '2026-11-04', r: '2026-11-05' });
  assert.equal(L.passRound({ c: 3, s: 'a', r: 'b' }, 2, 'c').c, 3, '낮은 단계를 다시 풀어도 내려가지 않는다');
});

test('노션 전송은 바뀐 문장의 숙련도만 보내고 달성 칸은 건드리지 않는다', async () => {
  L.markPassed(CHILD, 'page-1', 1, '2026-11-04');
  const calls = [];
  const result = await L.pushDirty(CHILD, async (id, text, achieved) => {
    calls.push([id, text, achieved]);
    return true;
  });
  assert.deepEqual(calls, [['page-1', '1|2026-11-04|2026-11-04', null]]);
  assert.deepEqual(result, { sent: 1, failed: 0 });

  const again = await L.pushDirty(CHILD, async () => { throw new Error('다시 보내면 안 된다'); });
  assert.deepEqual(again, { sent: 0, failed: 0 });
});

test('전송 실패는 표시를 남겨 다음에 다시 보낸다', async () => {
  L.markPassed(CHILD, 'page-1', 2, '2026-11-04');
  assert.deepEqual(await L.pushDirty(CHILD, async () => false), { sent: 0, failed: 1 });
  assert.deepEqual(await L.pushDirty(CHILD, async () => { throw new Error('네트워크'); }), { sent: 0, failed: 1 });
  assert.deepEqual(await L.pushDirty(CHILD, async () => true), { sent: 1, failed: 0 });
});

test('노션 값 병합: 다른 기기 진도는 받고, 아직 안 보낸 로컬 진도는 지킨다', () => {
  L.mergeFromRecords(CHILD, [{ id: 'a', mastery: '2|2026-11-01|2026-11-02' }], true);
  assert.equal(L.getState(CHILD, 'a').c, 2);

  L.markPassed(CHILD, 'a', 3, '2026-11-04');
  L.mergeFromRecords(CHILD, [{ id: 'a', mastery: '2|2026-11-01|2026-11-02' }], true);
  assert.equal(L.getState(CHILD, 'a').c, 3, '미전송 진도가 지워지면 안 된다');

  L.mergeFromRecords(CHILD, [{ id: 'b', mastery: '1|x|y' }], false);
  L.markPassed(CHILD, 'b', 2, '2026-11-04');
  L.mergeFromRecords(CHILD, [{ id: 'b', mastery: '1|x|y' }], false);
  assert.equal(L.getState(CHILD, 'b').c, 2, '오래된 캐시 값이 로컬을 덮으면 안 된다');
});

test('학생별 저장소가 분리된다', () => {
  L.markPassed('민서', 'a', 1, '2026-11-04');
  assert.equal(L.getState('민수', 'a').c, 0);
});

test('국어방이 사다리 의존 스크립트를 화면 모듈보다 먼저 불러온다', () => {
  const html = readFileSync(join(ROOT, 'kids/subjects/korean/korean.html'), 'utf8');
  const order = ['quest/quest-mastery.js', 'js/dictation_ladder.js', 'js/korean_dictation.js', 'js/korean_common.js']
    .map(name => html.indexOf(name));
  order.forEach(i => assert.ok(i > 0));
  assert.deepEqual(order, [...order].sort((a, b) => a - b));
});

test('받아쓰기 화면이 보상 오디오를 채점 코드에서 직접 부른다', () => {
  const src = readFileSync(join(ROOT, 'kids/js/korean_dictation.js'), 'utf8');
  assert.match(src, /window\.fairyPraise\(\)/);
  assert.match(src, /window\.fairyEncourage\(\)/);
  assert.doesNotMatch(src, /speechSynthesis/);
});
