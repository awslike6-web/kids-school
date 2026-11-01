import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const enginePath = new URL('kids/playground/family/yut-engine.js', root);
const source = readFileSync(enginePath, 'utf8');
const forbidden = () => { throw new Error('순수 엔진에서 DOM·저장소·통신에 접근했습니다.'); };
const context = { fetch: forbidden };
Object.defineProperties(context, {
  document: { get: forbidden },
  localStorage: { get: forbidden },
  sessionStorage: { get: forbidden }
});
context.window = context;
vm.runInNewContext(source, context, { filename: 'yut-engine.js' });

const E = context.YutEngine;
const plain = v => JSON.parse(JSON.stringify(v));
function freeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

const samplePlayers = (count = 2) => [
  { id: 'p1', name: '민서', avatar: { type: 'emoji', value: '🐰' }, assist: 'helper' },
  { id: 'p2', name: '민수', avatar: { type: 'emoji', value: '🐻' }, assist: 'tactic' },
  { id: 'p3', name: '아빠', avatar: { type: 'emoji', value: '🦊' }, assist: 'classic' },
  { id: 'p4', name: '엄마', avatar: { type: 'gallery', value: { artId: 'a1', charKey: 'main' } }, assist: 'classic' }
].slice(0, count);

const game = (count = 2, pieceCount = 4) => E.createGame(samplePlayers(count), pieceCount);

test('단일 전역 YutEngine(Object.freeze)·상수·300줄 이하 계약', () => {
  assert.deepEqual(Object.keys(context).sort(), ['YutEngine', 'fetch', 'window']);
  assert.equal(Object.isFrozen(E), true);
  assert.equal(Object.isFrozen(E.THROWS), true);
  assert.equal(Object.isFrozen(E.STEPS), true);
  assert.deepEqual(plain(E.THROWS), ['backdo', 'do', 'gae', 'geol', 'yut', 'mo']);
  assert.deepEqual(plain(E.STEPS), { backdo: -1, do: 1, gae: 2, geol: 3, yut: 4, mo: 5 });
  assert.equal(E.WAITING, -1);
  assert.equal(E.DONE, 30);
  const lineCount = source.trimEnd().split('\n').length;
  assert.ok(lineCount <= 300, `yut-engine.js 줄 수 초과: ${lineCount}`);
});

test('createGame 참가자·말 개수 검증과 초기 상태·깊은 복사', () => {
  for (const n of [0, 1, 5]) assert.throws(() => E.createGame(Array(n).fill(samplePlayers(1)[0])));
  assert.throws(() => E.createGame('invalid'));
  for (const pc of [0, 1, 5, 2.5, '4', null]) assert.throws(() => E.createGame(samplePlayers(2), pc));

  const valid = samplePlayers(3);
  valid[0].name = '  민서  ';
  valid[0].extraField = 'ignored';
  const s = E.createGame(valid, 3);
  assert.equal(s.v, 1);
  assert.equal(s.gameType, 'yut');
  assert.equal(s.stateVersion, 0);
  assert.equal(s.turnPlayer, 0);
  assert.equal(s.result, null);
  assert.equal(s.lastAction, null);
  assert.equal(s.players[0].name, '민서');
  assert.equal(Object.hasOwn(s.players[0], 'extraField'), false);
  assert.deepEqual(Object.keys(s.players[0]).sort(), ['assist', 'avatar', 'id', 'name']);
  assert.equal(s.publicBoard.pieceCount, 3);
  assert.equal(s.publicBoard.phase, 'throw');
  assert.deepEqual(plain(s.publicBoard.pending), []);
  assert.deepEqual(plain(s.publicBoard.log), []);
  assert.deepEqual(
    plain(s.publicBoard.pieces.map(p => [p.id, p.owner, p.pos, p.trail])),
    [
      ['p1-0', 'p1', -1, []], ['p1-1', 'p1', -1, []], ['p1-2', 'p1', -1, []],
      ['p2-0', 'p2', -1, []], ['p2-1', 'p2', -1, []], ['p2-2', 'p2', -1, []],
      ['p3-0', 'p3', -1, []], ['p3-1', 'p3', -1, []], ['p3-2', 'p3', -1, []]
    ]
  );

  // 원본 참가자 변형이 상태에 영향을 주지 않아야 함
  valid[0].avatar.value = '🐸';
  assert.equal(s.players[0].avatar.value, '🐰');

  // 유니코드 8자 허용, 9자 거부
  const uni = samplePlayers(2);
  uni[0].name = '😀'.repeat(8);
  assert.doesNotThrow(() => E.createGame(uni));
  uni[0].name = '😀'.repeat(9);
  assert.throws(() => E.createGame(uni));

  for (const mutate of [
    p => { p[0].id = ''; },
    p => { p[0].id = 'bad id!'; },
    p => { p[0].id = 'a'.repeat(33); },
    p => { p[1].id = p[0].id; },
    p => { p[0].name = '   '; },
    p => { p[0].avatar = null; },
    p => { p[0].avatar = ['🐰']; },
    p => { p[0].avatar = '🐰'; },
    p => { p[1].avatar = plain(p[0].avatar); },
    p => { p[0].assist = 'expert'; }
  ]) {
    const p = samplePlayers(2);
    mutate(p);
    assert.throws(() => E.createGame(p));
  }
});

test('routeOf 바깥길·지름길 A/B·방(23)·참먹이(20)·범위 밖 처리', () => {
  assert.deepEqual(plain(E.routeOf(-1, 1)), [1]);
  assert.deepEqual(plain(E.routeOf(-1, 5)), [1, 2, 3, 4, 5]);
  assert.deepEqual(plain(E.routeOf(3, 3)), [4, 5, 6]);
  assert.deepEqual(plain(E.routeOf(8, 4)), [9, 10, 11, 12]);
  assert.deepEqual(plain(E.routeOf(5, 3)), [21, 22, 23]);
  assert.deepEqual(plain(E.routeOf(5, 5)), [21, 22, 23, 24, 25]);
  assert.deepEqual(plain(E.routeOf(21, 5)), [22, 23, 24, 25, 15]);
  assert.deepEqual(plain(E.routeOf(22, 3)), [23, 24, 25]);
  assert.deepEqual(plain(E.routeOf(24, 4)), [25, 15, 16, 17]);
  assert.deepEqual(plain(E.routeOf(25, 2)), [15, 16]);
  assert.deepEqual(plain(E.routeOf(10, 3)), [26, 27, 23]);
  assert.deepEqual(plain(E.routeOf(10, 5)), [26, 27, 23, 28, 29]);
  assert.deepEqual(plain(E.routeOf(26, 5)), [27, 23, 28, 29, 20]);
  assert.deepEqual(plain(E.routeOf(27, 4)), [23, 28, 29, 20]);
  assert.deepEqual(plain(E.routeOf(27, 5)), [23, 28, 29, 20, 30]);
  assert.deepEqual(plain(E.routeOf(23, 3)), [28, 29, 20]);
  assert.deepEqual(plain(E.routeOf(23, 4)), [28, 29, 20, 30]);
  assert.deepEqual(plain(E.routeOf(28, 2)), [29, 20]);
  assert.deepEqual(plain(E.routeOf(29, 1)), [20]);
  assert.deepEqual(plain(E.routeOf(29, 3)), [20, 30]);
  assert.deepEqual(plain(E.routeOf(15, 5)), [16, 17, 18, 19, 20]);
  assert.deepEqual(plain(E.routeOf(19, 1)), [20]);
  assert.deepEqual(plain(E.routeOf(19, 2)), [20, 30]);
  assert.deepEqual(plain(E.routeOf(19, 5)), [20, 30]);
  assert.deepEqual(plain(E.routeOf(20, 1)), [30]);
  assert.deepEqual(plain(E.routeOf(20, 5)), [30]);

  for (const [from, steps] of [
    [-2, 1], [0, 1], [30, 1], [31, 1], [1.5, 2], ['5', 2], [null, 2],
    [1, 0], [1, -1], [1, 6], [1, 2.5], [1, '2'], [1, NaN]
  ]) {
    assert.deepEqual(plain(E.routeOf(from, steps)), []);
  }
});

test('rollSticks 16가지 가락 조합과 정확히 4회 rng 호출', () => {
  for (let mask = 0; mask < 16; mask++) {
    const bits = [0, 1, 2, 3].map(i => Boolean((mask >> i) & 1));
    let calls = 0;
    const out = E.rollSticks(() => (bits[calls++] ? 0.1 : 0.9));
    assert.equal(calls, 4);
    assert.deepEqual(plain(out.sticks), bits);
    const flat = bits.filter(Boolean).length;
    const expected = flat === 0 ? 'mo' : flat === 1 ? (bits[0] ? 'backdo' : 'do')
      : flat === 2 ? 'gae' : flat === 3 ? 'geol' : 'yut';
    assert.equal(out.result, expected);
  }
  const def = E.rollSticks();
  assert.equal(def.sticks.length, 4);
  assert.ok(E.THROWS.includes(def.result));
});

test('빽도와 trail: 전진 기록·되돌아오기·빈 trail에서 1→20 참먹이 직행 및 19 후퇴', () => {
  // 명세 §4-3 예시: 대기 말이 개로 2 → trail=[1], 빽도로 1(trail=[]), 또 빽도로 20(trail=[])
  let s = game(2, 2);
  s = E.applyThrow(s, 'gae');
  s = E.applyMove(s, 'p1-0', 0);
  assert.deepEqual(plain(s.publicBoard.pieces[0]), { id: 'p1-0', owner: 'p1', pos: 2, trail: [1] });
  assert.equal(s.turnPlayer, 1);

  // p2는 겹치지 않는 칸(3→4→6)으로 이동하며 턴을 넘김
  s = E.applyMove(E.applyThrow(s, 'geol'), 'p2-0', 0);

  // p1 첫 빽도: 2 → 1, trail=[]
  s = E.applyThrow(s, 'backdo');
  assert.equal(s.publicBoard.phase, 'move');
  s = E.applyMove(s, 'p1-0', 0);
  assert.deepEqual(plain(s.publicBoard.pieces[0]), { id: 'p1-0', owner: 'p1', pos: 1, trail: [] });

  s = E.applyMove(E.applyThrow(s, 'do'), 'p2-0', 0);

  // p1 두 번째 빽도: 1 → 20 (참먹이), trail=[]
  s = E.applyMove(E.applyThrow(s, 'backdo'), 'p1-0', 0);
  assert.deepEqual(plain(s.publicBoard.pieces[0]), { id: 'p1-0', owner: 'p1', pos: 20, trail: [] });

  s = E.applyMove(E.applyThrow(s, 'gae'), 'p2-0', 0);

  // 분기 1: 20에서 전진(도)하면 바로 30 완주
  const finished = E.applyMove(E.applyThrow(s, 'do'), 'p1-0', 0);
  assert.deepEqual(plain(finished.publicBoard.pieces[0]), { id: 'p1-0', owner: 'p1', pos: 30, trail: [] });

  // 분기 2: 20에서 또 빽도면 19, trail=[]
  const backTo19 = E.applyMove(E.applyThrow(s, 'backdo'), 'p1-0', 0);
  assert.deepEqual(plain(backTo19.publicBoard.pieces[0]), { id: 'p1-0', owner: 'p1', pos: 19, trail: [] });
});

test('지름길 B 방(23) 진입 후 빽도(23→27) 및 방 통과 후 빽도(24→23) 뒤 출발 경로(28·29)', () => {
  let s = game(2, 2);
  // p1-0: 윷(4)+윷(4)+개(2) → 4 → 8 → 10
  s = E.applyThrow(E.applyThrow(E.applyThrow(s, 'yut'), 'yut'), 'gae');
  // 같은 결과(yut)가 pending에 둘 있을 때 legalMoves는 throwIndex별로 따로 항목 생성
  const dupMoves = E.legalMoves(s);
  assert.deepEqual(plain(dupMoves.map(m => [m.throwIndex, m.result, m.to])), [[0, 'yut', 4], [1, 'yut', 4], [2, 'gae', 2]]);
  s = E.applyMove(s, 'p1-0', 0); // 4
  s = E.applyMove(s, 'p1-0', 0); // 8
  s = E.applyMove(s, 'p1-0', 0); // 10
  assert.equal(s.publicBoard.pieces[0].pos, 10);

  // p2-0: 모(5)+개(2) → 5 → 22
  s = E.applyThrow(E.applyThrow(s, 'mo'), 'gae');
  s = E.applyMove(s, 'p2-0', 0); // 5
  s = E.applyMove(s, 'p2-0', 0); // 22

  // p1-0: 10에서 걸(3)로 방(23) 도착
  s = E.applyMove(E.applyThrow(s, 'geol'), 'p1-0', 0);
  assert.equal(s.publicBoard.pieces[0].pos, 23);
  assert.deepEqual(plain(s.publicBoard.pieces[0].trail.slice(-3)), [10, 26, 27]);

  // p2-0: 22에서 개(2)로 방(23)을 지나 24 도착(23의 p1-0은 지나가므로 잡히지 않음)
  s = E.applyMove(E.applyThrow(s, 'gae'), 'p2-0', 0);
  assert.equal(s.publicBoard.pieces[0].pos, 23);
  assert.equal(s.publicBoard.pieces[2].pos, 24);

  // p1-0: 23에서 빽도하면 지름길 B의 27로 되돌아감
  s = E.applyMove(E.applyThrow(s, 'backdo'), 'p1-0', 0);
  assert.equal(s.publicBoard.pieces[0].pos, 27);

  // p2-0: 24에서 빽도하면 23에 서고, p1-0이 27→23으로 다시 들어오며 p2-0을 잡음
  s = E.applyMove(E.applyThrow(s, 'backdo'), 'p2-0', 0);
  assert.equal(s.publicBoard.pieces[2].pos, 23);
  s = E.applyMove(E.applyThrow(s, 'do'), 'p1-0', 0);
  assert.equal(s.publicBoard.phase, 'throw');
  assert.equal(s.turnPlayer, 0);
  assert.equal(s.publicBoard.pieces[2].pos, -1);
  // 방(23)에 선 p1-0이 개(2)로 전진하면 28 → 29로 이동
  s = E.applyMove(E.applyThrow(s, 'gae'), 'p1-0', 0);
  assert.equal(s.publicBoard.pieces[0].pos, 29);
});

test('지름길 진입 뒤 빽도로 모서리 복귀 및 바깥길 통과 뒤 빽도로 모서리 착지 시 지름길 전환', () => {
  let s = game(2, 2);
  // p1: 모(5) + 걸(3) → p1-0이 5에 선 뒤 23으로 이동
  s = E.applyThrow(s, 'mo');
  assert.equal(s.publicBoard.phase, 'throw');
  s = E.applyThrow(s, 'geol');
  assert.equal(s.publicBoard.phase, 'move');
  // 뒤쪽 결과(geol) 먼저 쓸 수도 있고 앞쪽(mo) 먼저 쓸 수도 있음: mo(0) 먼저 사용
  s = E.applyMove(s, 'p1-0', 0);
  assert.deepEqual(plain(s.publicBoard.pieces[0]), { id: 'p1-0', owner: 'p1', pos: 5, trail: [1, 2, 3, 4] });
  s = E.applyMove(s, 'p1-0', 0);
  assert.deepEqual(plain(s.publicBoard.pieces[0]), { id: 'p1-0', owner: 'p1', pos: 23, trail: [1, 2, 3, 4, 5, 21, 22] });

  // p2는 윷(4) + 개(2)로 4 → 6(바깥길로 5 통과)
  s = E.applyThrow(E.applyThrow(s, 'yut'), 'gae');
  s = E.applyMove(s, 'p2-0', 0);
  s = E.applyMove(s, 'p2-0', 0);
  assert.deepEqual(plain(s.publicBoard.pieces[2]), { id: 'p2-0', owner: 'p2', pos: 6, trail: [1, 2, 3, 4, 5] });

  // p1이 23에서 빽도하면 22로 되돌아감
  s = E.applyMove(E.applyThrow(s, 'backdo'), 'p1-0', 0);
  assert.deepEqual(plain(s.publicBoard.pieces[0]), { id: 'p1-0', owner: 'p1', pos: 22, trail: [1, 2, 3, 4, 5, 21] });

  // p2가 6에서 빽도하면 5에 서고, 이어서 다음 턴에 전진하면 지름길 A(21...)로 감
  s = E.applyMove(E.applyThrow(s, 'backdo'), 'p2-0', 0);
  assert.deepEqual(plain(s.publicBoard.pieces[2]), { id: 'p2-0', owner: 'p2', pos: 5, trail: [1, 2, 3, 4] });
  s = E.applyMove(E.applyThrow(s, 'do'), 'p1-0', 0); // p1: 22 → 23
  s = E.applyMove(E.applyThrow(s, 'gae'), 'p2-0', 0); // p2: 5 → 22
  assert.equal(s.publicBoard.pieces[2].pos, 22);
});

test('업기와 합류: 대기 말 개별 지정, 판 위 묶음 이동, 합류 시 움직인 말의 trail로 통일', () => {
  // 명세 §4-3 예시: 바깥길로 15에 있던 말에 25에서 온 말이 업히면 다음 빽도에서 둘 다 25로 간다
  let s = game(2, 3);
  // p1-1(두 번째 대기 말 직접 지정!)을 바깥길 4 → 9 → 14 → 15로 이동
  s = E.applyThrow(E.applyThrow(E.applyThrow(E.applyThrow(s, 'yut'), 'mo'), 'mo'), 'do');
  // legalMoves의 대기 말 대표는 p1-0 하나만 노출
  const waitMoves = E.legalMoves(s).filter(m => m.from === -1 && m.throwIndex === 0);
  assert.equal(waitMoves.length, 1);
  assert.deepEqual(plain(waitMoves[0].pieceIds), ['p1-0']);
  // 그러나 applyMove에서 p1-1을 지정하면 p1-1 하나만 나간다
  s = E.applyMove(s, 'p1-1', 0); // 4
  assert.equal(s.publicBoard.pieces[0].pos, -1);
  assert.equal(s.publicBoard.pieces[1].pos, 4);
  s = E.applyMove(s, 'p1-1', 0); // 9
  s = E.applyMove(s, 'p1-1', 0); // 14
  s = E.applyMove(s, 'p1-1', 0); // 15 (바깥길: trail 끝은 14)
  assert.equal(s.publicBoard.pieces[1].pos, 15);
  assert.equal(s.publicBoard.pieces[1].trail.at(-1), 14);

  // p2 턴 소비
  s = E.applyMove(E.applyThrow(s, 'do'), 'p2-0', 0);

  // p1-0을 모(5) → 모(25) → 도(15)로 이동해 p1-1에 합류
  s = E.applyThrow(E.applyThrow(E.applyThrow(s, 'mo'), 'mo'), 'do');
  s = E.applyMove(s, 'p1-0', 0); // 5
  s = E.applyMove(s, 'p1-0', 0); // 25
  const joinCandidate = E.legalMoves(s).find(m => m.from === 25);
  assert.deepEqual(plain(joinCandidate.joins), ['p1-1']);
  s = E.applyMove(s, 'p1-0', 0); // 15 합류 (추가 던지기 없음 → p2 차례)
  assert.equal(s.turnPlayer, 1);
  assert.equal(s.publicBoard.phase, 'throw');
  // 두 말 모두 trail 끝이 25로 통일되어야 함
  assert.equal(s.publicBoard.pieces[0].trail.at(-1), 25);
  assert.deepEqual(plain(s.publicBoard.pieces[0].trail), plain(s.publicBoard.pieces[1].trail));

  // p2 턴 소비 후 p1이 p1-1을 지정해 빽도하면 p1-0과 p1-1 둘 다 25로 이동
  s = E.applyMove(E.applyThrow(s, 'do'), 'p2-0', 0);
  s = E.applyThrow(s, 'backdo');
  const groupMoves = E.legalMoves(s).filter(m => m.from === 15);
  assert.equal(groupMoves.length, 1);
  assert.deepEqual(plain(groupMoves[0].pieceIds), ['p1-0', 'p1-1']);
  s = E.applyMove(s, 'p1-1', 0);
  assert.equal(s.publicBoard.pieces[0].pos, 25);
  assert.equal(s.publicBoard.pieces[1].pos, 25);
  assert.deepEqual(plain(s.lastAction.pieceIds), ['p1-0', 'p1-1']);
  assert.equal(s.publicBoard.log.at(-1).pieceId, 'p1-1');
});

test('잡기와 추가 던지기: 남은 pending 보존·묶음 통째로 잡기·빽도로 잡기·지나가는 말 무영향', () => {
  let s = game(2, 2);
  // p1-0을 2에 배치
  s = E.applyMove(E.applyThrow(s, 'gae'), 'p1-0', 0);
  // p2-0, p2-1 두 말을 모두 1에 업어 둠
  s = E.applyThrow(E.applyThrow(s, 'yut'), 'do');
  s = E.applyMove(s, 'p2-0', 1); // do 먼저 사용해 p2-0 → 1
  // 남은 yut으로는 p2-1 → 4로 보냄
  s = E.applyMove(s, 'p2-1', 0); // p2-1 → 4

  // p1이 ['yut', 'backdo']를 던짐 → 먼저 backdo(index 1)로 2→1 내려앉아 p2-0을 잡음!
  s = E.applyThrow(E.applyThrow(s, 'yut'), 'backdo');
  const backCapture = E.legalMoves(s).find(m => m.result === 'backdo');
  assert.deepEqual(plain(backCapture.captures), ['p2-0']);
  s = E.applyMove(s, 'p1-0', 1);
  assert.equal(s.turnPlayer, 0);
  assert.equal(s.publicBoard.phase, 'throw'); // 잡았으므로 즉시 던지기 단계
  assert.deepEqual(plain(s.publicBoard.pending), ['yut']); // 남은 yut 보존
  assert.deepEqual(plain(s.lastAction.captured), ['p2-0']);
  assert.deepEqual(plain(s.publicBoard.pieces[2]), { id: 'p2-0', owner: 'p2', pos: -1, trail: [] });

  // 추가 던지기에서 개(2)가 나오면 pending=['yut', 'gae']가 되고,
  // 1에서 yut(4칸)으로 5로 가면 4에 있는 p2-1을 지나치지만 잡지 않는다!
  s = E.applyThrow(s, 'gae');
  assert.equal(s.publicBoard.phase, 'move');
  assert.deepEqual(plain(s.publicBoard.pending), ['yut', 'gae']);
  s = E.applyMove(s, 'p1-0', 0); // 1 → 5 (4 통과)
  assert.equal(s.publicBoard.pieces[3].pos, 4); // 지나간 p2-1은 그대로
  assert.equal(s.publicBoard.phase, 'move');
  assert.deepEqual(plain(s.publicBoard.pending), ['gae']);
  s = E.applyMove(s, 'p1-0', 0); // 5 → 22, p2 차례

  // p2가 윷(4)+도(1)로 대기 중인 p2-0도 4에 합류시켜 [p2-0, p2-1] 묶음을 만든 뒤 도는 5로 이동
  s = E.applyThrow(E.applyThrow(s, 'yut'), 'do');
  s = E.applyMove(s, 'p2-0', 0); // p2-0 → 4 (p2-1과 합류)
  s = E.applyMove(s, 'p2-0', 0); // 묶음 전체가 4 → 5로 이동
  assert.equal(s.publicBoard.pieces[2].pos, 5);
  assert.equal(s.publicBoard.pieces[3].pos, 5);

  // p1이 모(5)+도(1)를 던진 뒤 모(5)로 대기 말 p1-1을 5에 보내 업힌 [p2-0, p2-1] 두 말을 한 번에 모두 잡는다
  s = E.applyMove(E.applyThrow(E.applyThrow(s, 'mo'), 'do'), 'p1-1', 0);
  assert.deepEqual(plain(s.lastAction.captured), ['p2-0', 'p2-1']);
  assert.deepEqual(plain(s.publicBoard.pending), ['do']); // 남은 do 보존 채로 즉시 추가 던지기 단계
  assert.equal(s.publicBoard.pieces[2].pos, -1);
  assert.equal(s.publicBoard.pieces[3].pos, -1);
  assert.deepEqual(plain(s.publicBoard.pieces[2].trail), []);
  assert.deepEqual(plain(s.publicBoard.pieces[3].trail), []);
  assert.equal(s.turnPlayer, 0);
  assert.equal(s.publicBoard.phase, 'throw');
});

test('빽도 버리기: 판 위 말 없을 때 단독 빽도·완주 후 남은 빽도 폐기 vs [yut, backdo] 보존', () => {
  // 1) 시작하자마자 빽도면 버리고 다음 사람으로
  let s = game(3, 2);
  s = E.applyThrow(s, 'backdo');
  assert.equal(s.turnPlayer, 1);
  assert.equal(s.publicBoard.phase, 'throw');
  assert.deepEqual(plain(s.publicBoard.pending), []);
  assert.deepEqual(plain(s.lastAction), { type: 'THROW', by: 'p1', result: 'backdo' });

  // 2) p2가 ['yut', 'backdo']를 던지면 판 위 말이 없어도 버리지 않음
  s = E.applyThrow(E.applyThrow(s, 'yut'), 'backdo');
  assert.equal(s.turnPlayer, 1);
  assert.equal(s.publicBoard.phase, 'move');
  assert.deepEqual(plain(s.publicBoard.pending), ['yut', 'backdo']);
  s = E.applyMove(s, 'p2-0', 0); // 대기 말 → 4
  assert.equal(s.turnPlayer, 1);
  assert.equal(s.publicBoard.phase, 'move');
  s = E.applyMove(s, 'p2-0', 0); // 4 → 3 (남은 backdo 사용)
  assert.equal(s.turnPlayer, 2); // 3인 순환: p3 차례

  // 3) p3가 말 하나만 20에 두고 나머지는 대기(-1)일 때 ['yut', 'backdo']에서 yut으로 20→30 완주하면
  // 판 위에 말이 없어지고 backdo만 남으므로 자동 폐기 후 p1(0)에게 차례가 넘어감
  s = E.applyMove(E.applyThrow(s, 'do'), 'p3-0', 0); // p3-0: 1
  s = E.applyThrow(s, 'backdo'); // p1: 판 위 말 없으므로 즉시 p2로 넘어감
  assert.equal(s.turnPlayer, 1);
  s = E.applyMove(E.applyThrow(s, 'do'), 'p2-0', 0); // p2: 3 → 4
  s = E.applyMove(E.applyThrow(s, 'backdo'), 'p3-0', 0); // p3-0: 1 → 20 (참먹이!)
  s = E.applyThrow(s, 'backdo'); // p1 → p2
  s = E.applyMove(E.applyThrow(s, 'do'), 'p2-0', 0); // p2: 4 → 5

  // 이제 p3 차례: p3-0은 20, p3-1은 -1
  s = E.applyThrow(E.applyThrow(s, 'yut'), 'backdo');
  s = E.applyMove(s, 'p3-0', 0); // yut으로 p3-0 완주(30), 남은 건 p3-1(-1)과 ['backdo']
  assert.equal(s.publicBoard.pieces.find(p => p.id === 'p3-0').pos, 30);
  assert.deepEqual(plain(s.publicBoard.pending), []);
  assert.equal(s.publicBoard.phase, 'throw');
  assert.equal(s.turnPlayer, 0);
});

test('승리 즉시 종료·무효 행동 원본 반환·불변성·3인 rematch 순서 회전', () => {
  let s = game(3, 2);
  // 승부 전 rematch는 원본 그대로 반환
  assert.equal(E.rematch(s), s);

  // p1-0은 1→20→30 경로, p1-1은 4→9→10→29→30 경로로 모두 완주
  s = E.applyThrow(E.applyThrow(s, 'yut'), 'do');
  s = E.applyMove(s, 'p1-0', 1); // p1-0 → 1
  s = E.applyMove(s, 'p1-1', 0); // p1-1 → 4
  s = E.applyThrow(s, 'backdo'); // p2 스킵
  s = E.applyThrow(s, 'backdo'); // p3 스킵
  s = E.applyMove(E.applyThrow(s, 'backdo'), 'p1-0', 0); // p1-0: 1 → 20
  s = E.applyThrow(s, 'backdo'); // p2 스킵
  s = E.applyThrow(s, 'backdo'); // p3 스킵
  // p1: 모(5)+도(1) → p1-0 완주(do), p1-1: 4→9(mo)
  s = E.applyThrow(E.applyThrow(s, 'mo'), 'do');
  const winCheckMoves = E.legalMoves(s).filter(m => m.to === 30);
  assert.ok(winCheckMoves.every(m => m.captures.length === 0 && m.joins.length === 0));
  s = E.applyMove(s, 'p1-0', 1); // p1-0 → 30
  s = E.applyMove(s, 'p1-1', 0); // p1-1: 4 → 9
  s = E.applyThrow(s, 'backdo');
  s = E.applyThrow(s, 'backdo');
  // p1-1: 9 → 10(do)
  s = E.applyMove(E.applyThrow(s, 'do'), 'p1-1', 0);
  s = E.applyThrow(s, 'backdo');
  s = E.applyThrow(s, 'backdo');
  // p1-1: 10에서 모(5) + 모(5) + 개(2)를 던져 첫 모(10→29), 개(29→30)로 승리! (남은 모 1개는 자동 초기화되어야 함)
  s = E.applyThrow(E.applyThrow(E.applyThrow(s, 'mo'), 'mo'), 'gae');
  s = E.applyMove(s, 'p1-1', 0); // 10 → 29
  const frozenBeforeWin = freeze(plain(s));
  const snapshot = JSON.stringify(frozenBeforeWin);
  s = E.applyMove(frozenBeforeWin, 'p1-1', 1); // gae로 29 → 30 완주! (mo 하나 남아 있었음)
  assert.equal(JSON.stringify(frozenBeforeWin), snapshot);
  assert.deepEqual(plain(s.result), { type: 'win', winner: 'p1' });
  assert.equal(s.publicBoard.phase, 'over');
  assert.deepEqual(plain(s.publicBoard.pending), []);
  assert.equal(s.turnPlayer, 0);
  assert.equal(E.isValidSaved(plain(s)), true);

  // 승리 후 던지기·이동은 모두 무효(같은 참조 반환), legalMoves는 []
  assert.equal(E.applyThrow(s, 'do'), s);
  assert.equal(E.applyMove(s, 'p1-0', 0), s);
  assert.deepEqual(plain(E.legalMoves(s)), []);

  // rematch: 첫 사람(p1)을 맨 뒤로 보낸 [p2, p3, p1] 순서, 말 개수 2 유지, 버전 +1
  const next = E.rematch(freeze(s));
  assert.deepEqual(plain(next.players.map(p => p.id)), ['p2', 'p3', 'p1']);
  assert.equal(next.publicBoard.pieceCount, 2);
  assert.deepEqual(plain(next.publicBoard.pieces.map(p => p.id)), ['p2-0', 'p2-1', 'p3-0', 'p3-1', 'p1-0', 'p1-1']);
  assert.equal(next.turnPlayer, 0);
  assert.equal(next.result, null);
  assert.equal(next.publicBoard.phase, 'throw');
  assert.equal(next.stateVersion, s.stateVersion + 1);
  assert.deepEqual(plain(next.lastAction), { type: 'REMATCH' });
  assert.equal(E.isValidSaved(plain(next)), true);
});

test('무효 행동은 언제나 원본 참조를 그대로 돌려준다', () => {
  const s0 = freeze(game(2, 2));
  assert.equal(E.applyThrow(s0, 'invalid'), s0);
  assert.equal(E.applyThrow(s0, null), s0);
  assert.equal(E.applyMove(s0, 'p1-0', 0), s0);
  assert.deepEqual(plain(E.legalMoves(s0)), []);

  const sMove = freeze(E.applyThrow(s0, 'do'));
  assert.equal(E.applyThrow(sMove, 'do'), sMove);
  for (const [pid, idx] of [
    ['p2-0', 0], ['missing', 0], [null, 0], ['p1-0', -1], ['p1-0', 1], ['p1-0', 0.5], ['p1-0', '0']
  ]) {
    assert.equal(E.applyMove(sMove, pid, idx), sMove);
  }

  // 판 위에 말 하나 있고 대기 말 하나 있을 때 대기 말에 backdo 사용은 무효
  let sBack = E.applyMove(sMove, 'p1-0', 0); // p1-0 → 1
  sBack = E.applyMove(E.applyThrow(sBack, 'do'), 'p2-0', 0);
  sBack = freeze(E.applyThrow(sBack, 'backdo'));
  assert.equal(E.applyMove(sBack, 'p1-1', 0), sBack); // p1-1은 대기(-1)이므로 무효
});

test('isValidSaved 정상 통과와 말·trail·pending·phase·차례·승패·로그·버전 조작 거부', () => {
  const initial = game(2, 3);
  assert.equal(E.isValidSaved(plain(initial)), true);

  let s = E.applyThrow(initial, 'yut');
  s = E.applyThrow(s, 'gae');
  s = E.applyMove(s, 'p1-0', 0); // p1-0 → 4, pending=['gae'], phase='move'
  assert.equal(E.isValidSaved(plain(s)), true);

  for (const tamper of [
    v => { v.v = 2; },
    v => { v.gameType = 'omok'; },
    v => { v.stateVersion = -1; },
    v => { v.stateVersion = 1.5; },
    v => { v.stateVersion = 2; }, // log 길이는 3이므로 거부
    v => { v.turnPlayer = 1; },
    v => { v.result = { type: 'win', winner: 'p1' }; },
    v => { v.publicBoard.phase = 'throw'; },
    v => { v.publicBoard.pending = ['do']; },
    v => { v.publicBoard.pending = []; },
    v => { v.publicBoard.pieces[0].pos = 5; },
    v => { v.publicBoard.pieces[0].trail = [1, 2]; },
    v => { v.publicBoard.pieces[1].pos = 1; },
    v => { v.publicBoard.log[0].by = 'p2'; },
    v => { v.publicBoard.log[2].throwIndex = 5; },
    v => { v.publicBoard.log.push({ type: 'MOVE', by: 'p1', pieceId: 'p1-1', throwIndex: 5 }); },
    v => { v.lastAction = null; },
    v => { v.lastAction.to = 5; },
    v => { v.players[0].name = '  민서  '; },
    v => { v.extra = true; }
  ]) {
    const bad = plain(s);
    tamper(bad);
    assert.equal(E.isValidSaved(bad), false);
  }

  // 빈 log일 때 stateVersion과 lastAction 계약 검사
  const badZero = plain(initial);
  badZero.stateVersion = 1;
  assert.equal(E.isValidSaved(badZero), false);

  const rematchedLike = plain(initial);
  rematchedLike.lastAction = { type: 'REMATCH' };
  rematchedLike.stateVersion = 0;
  assert.equal(E.isValidSaved(rematchedLike), false);
  rematchedLike.stateVersion = 1;
  assert.equal(E.isValidSaved(rematchedLike), true);

  for (const nonObj of [null, undefined, [], 'yut', 42, false]) {
    assert.equal(E.isValidSaved(nonObj), false);
  }
});

test('결정적 난수로 2~4인 여러 판이 끝까지 완주되고 매 단계 불변성·isValidSaved를 통과한다', () => {
  let seed = 20261102;
  const rng = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  for (const [playerCount, pieceCount] of [[2, 2], [3, 3], [4, 4]]) {
    let s = game(playerCount, pieceCount);
    for (let round = 0; round < 2; round++) {
      let steps = 0;
      while (!s.result) {
        steps++;
        assert.ok(steps < 5000, '게임이 정상 종료되지 않았습니다.');
        freeze(s);
        if (s.publicBoard.phase === 'throw') {
          const { result } = E.rollSticks(rng);
          const next = E.applyThrow(s, result);
          assert.notEqual(next, s);
          s = next;
        } else {
          const moves = E.legalMoves(s);
          assert.ok(moves.length > 0, 'move 단계에는 합법 이동이 최소 1개 있어야 합니다.');
          const choice = moves[Math.floor(rng() * moves.length)];
          const pieceId = choice.pieceIds[Math.floor(rng() * choice.pieceIds.length)];
          const next = E.applyMove(s, pieceId, choice.throwIndex);
          assert.notEqual(next, s);
          s = next;
        }
        assert.equal(E.isValidSaved(plain(s)), true);
      }
      assert.equal(s.publicBoard.phase, 'over');
      assert.equal(s.publicBoard.pending.length, 0);
      const winnerPieces = s.publicBoard.pieces.filter(p => p.owner === s.result.winner);
      assert.equal(winnerPieces.length, pieceCount);
      assert.ok(winnerPieces.every(p => p.pos === E.DONE && p.trail.length === 0));

      if (round === 0) {
        s = E.rematch(s);
        assert.equal(E.isValidSaved(plain(s)), true);
      }
    }
  }
});
