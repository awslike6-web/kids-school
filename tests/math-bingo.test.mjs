// 🎯 수 빙고(MathBingo) 시험: 줄 판정·자동 놓기·판 끝 판정과 파일 규칙 (docs/math_2-1_ladder_spec.md §3-3-2)
// 화면 동작(놓기·터뜨리기·에러리스·해금)은 쓰기 차단 서버에서 자동 조작으로 확인한다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { read } from './split-rules.mjs';

const FILE = 'kids/subjects/math/js/math_bingo.js';
const plain = (x) => JSON.parse(JSON.stringify(x));
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(read(FILE), sandbox, { filename: FILE });
const B = sandbox.window.MathBingo;

function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const marks = (idx) => Array.from({ length: 9 }, (_, i) => idx.includes(i));

test('줄 8개: 가로 3·세로 3·대각 2, 각 줄 오름차순', () => {
  const lines = plain(B.LINES).map((l) => l.join(','));
  assert.equal(lines.length, 8);
  for (const l of ['0,1,2', '3,4,5', '6,7,8', '0,3,6', '1,4,7', '2,5,8', '0,4,8', '2,4,6']) assert.ok(lines.includes(l), l);
});

test('다 찬 줄 찾기', () => {
  assert.deepEqual(plain(B.completedLines(marks([]))), []);
  assert.equal(B.completedLines(marks([0, 1, 2])).length, 1);
  assert.equal(B.completedLines(marks([0, 4, 8, 2, 6])).length, 2);
  assert.equal(B.completedLines(marks([0, 1, 2, 3, 4, 5, 6, 7, 8])).length, 8);
  assert.equal(B.completedLines(marks([0, 1, 3, 4])).length, 0);
});

test('자동 놓기: 9개를 섞은 새 배열, 원본 그대로, 같은 seed면 같은 결과', () => {
  const ans = ['100', '200', '300', '40', '50', '60', '7', '8', '9'];
  const copy = ans.slice();
  const a = plain(B.autoPlace(ans, seeded(5)));
  assert.deepEqual(ans, copy, '원본 그대로');
  assert.deepEqual([...a].sort(), [...ans].sort());
  assert.deepEqual(plain(B.autoPlace(ans, seeded(5))), a);
  let moved = false;
  for (let s = 1; s <= 20 && !moved; s++) moved = plain(B.autoPlace(ans, seeded(s))).join() !== ans.join();
  assert.ok(moved, '섞임');
});

test('판 끝 판정: 3줄 이상 또는 9칸 다 참', () => {
  assert.equal(B.isRoundOver(marks([0, 1, 2, 3, 4, 5])), false, '2줄');
  assert.equal(B.isRoundOver(marks([0, 1, 2, 3, 4, 5, 6, 7, 8])), true);
  assert.equal(B.isRoundOver(marks([0, 1, 2, 3, 4, 5, 6])), true, '가로 2 + 세로·대각 = 3줄 이상');
  assert.equal(B.isRoundOver(marks([0, 4, 8, 2, 6])), false, '대각 2줄');
  assert.equal(B.isRoundOver(marks([0, 4, 8, 2, 6, 1, 7])), true, '대각 2 + 세로 1');
});

test('파일 규칙: innerHTML·인라인 style 없음, 600줄 이하, 학습일지·해금 연결', () => {
  const src = read(FILE);
  assert.doesNotMatch(src, /innerHTML/);
  assert.doesNotMatch(src, /\.style\.[a-zA-Z]+\s*=|setAttribute\(\s*['"]style/);
  assert.ok(src.split('\n').length <= 600);
  assert.match(src, /MathDrill\.track/);
  assert.match(src, /\.unlock\(/);
});
