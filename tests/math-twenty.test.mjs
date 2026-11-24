// 🔍 수 스무고개(NumberTwenty) 시험: 칩 고르기(후보를 나누는 질문만·최대 개수)·맞히기 보기 (docs/math_2-1_ladder_spec.md §3-3-3)
// 화면 흐름(묻기·답 읽기·후보 막대·맞히기·한 판 더)은 쓰기 차단 서버 자동 조작으로 확인한다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { read } from './split-rules.mjs';

const JS = 'kids/subjects/math/js/';
const sandbox = { window: {} };
vm.createContext(sandbox);
for (const f of ['number_three-core.js', 'number_three-twenty.js']) vm.runInContext(read(JS + f), sandbox, { filename: f });
const T = sandbox.window.ThreeDigitCore;
const N = sandbox.window.NumberTwenty;
const plain = (x) => JSON.parse(JSON.stringify(x));

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

test('묶음 다섯 가지', () => {
  assert.deepEqual(plain(N.CATEGORIES.map((c) => c.id)), ['size', 'h', 't', 'o', 'even']);
});

test('칩 고르기: 후보를 둘로 나누는 질문만, 최대 개수, 묶음 접두 맞음', () => {
  const all = T.candidates([]);
  for (const cat of N.CATEGORIES) {
    const chips = plain(N.pickChips(all, cat.id, 4));
    assert.ok(chips.length >= 1 && chips.length <= 4, `${cat.id}: ${chips.length}`);
    for (const id of chips) {
      assert.ok(id.startsWith(cat.prefix) || (cat.cmp && id.startsWith(cat.cmp)), id);
      const yes = all.filter((n) => T.chipAnswer(n, id)).length;
      assert.ok(yes > 0 && yes < all.length, `${id}는 후보를 나눔`);
    }
  }
  // 백의 자리가 3으로 정해지면 백의 자리 칩은 더 나눌 게 없다
  const h3 = T.candidates([{ id: 'h:3', answer: true }]);
  assert.deepEqual(plain(N.pickChips(h3, 'h', 4)), []);
  assert.ok(N.pickChips(h3, 't', 4).length > 0);
});

test('자리 숫자: 남은 숫자가 많으면 크기 질문(절반부터), 3개 이하로 줄면 그 숫자 묻기', () => {
  const all = T.candidates([]);
  const t0 = plain(N.pickChips(all, 't', 4));
  assert.ok(t0.every((id) => id.startsWith('tg:')), `처음 십의 자리: ${t0}`);
  assert.ok(t0.includes('tg:4'), '0~9를 반으로 나누는 5보다 큰지(4보다 커요?)가 먼저');
  assert.deepEqual([...t0].sort((a, b) => Number(a.slice(3)) - Number(b.slice(3))), t0, '숫자 작은 순으로 보임');
  assert.ok(plain(N.pickChips(all, 'o', 4)).every((id) => id.startsWith('og:')));
  // 십의 자리가 6보다 크다(7·8·9) → 숫자 묻기
  const t789 = T.candidates([{ id: 'tg:6', answer: true }]);
  assert.deepEqual(plain(N.pickChips(t789, 't', 4)), ['t:7', 't:8', 't:9']);
  // 십의 자리가 4보다 크고 7보다 크지 않다(5·6·7) → 숫자 묻기
  const t567 = T.candidates([{ id: 'tg:4', answer: true }, { id: 'tg:7', answer: false }]);
  assert.deepEqual(plain(N.pickChips(t567, 't', 4)), ['t:5', 't:6', 't:7']);
  assert.deepEqual(plain(N.digitsLeft(t567, 't')), [5, 6, 7], '화면에 「십의 자리는 5 · 6 · 7 중 하나」');
  assert.deepEqual(plain(N.digitsLeft(all, 'h')), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.deepEqual(plain(N.digitsLeft(all, 'size')), []);
});

test('첫 칩만 눌러도 스무 번 안에 하나로 좁혀진다 (크기 → 십 → 일 차례)', () => {
  for (let s = 1; s <= 200; s++) {
    const secret = T.makeSecret(seeded(s));
    const asked = [];
    let cands = T.candidates(asked);
    let k = 0;
    for (const cat of ['size', 'size', 'size', 'size', 't', 't', 't', 't', 'o', 'o', 'o', 'o', 'h', 'h', 'h', 'h', 'size', 'size', 'size', 'size']) {
      if (cands.length <= 1) break;
      const chips = plain(N.pickChips(cands, cat, 4));
      if (!chips.length) continue;
      const id = chips[0];
      asked.push({ id, answer: T.chipAnswer(secret, id) });
      cands = T.candidates(asked);
      k += 1;
    }
    assert.ok(cands.includes(secret));
    assert.ok(cands.length <= 9, `비밀 ${secret}: 질문 ${k}번 뒤 ${cands.length}개`);
  }
});

test('맞히기 보기: 3개 이하면 후보 전부, 아니면 정답 포함 3개, 오름차순', () => {
  assert.deepEqual(plain(N.guessOptions([352, 354], 352, seeded(1))), [352, 354]);
  for (let s = 1; s <= 50; s++) {
    const cands = [301, 305, 322, 352, 388, 390];
    const opts = plain(N.guessOptions(cands, 352, seeded(s)));
    assert.equal(opts.length, 3);
    assert.ok(opts.includes(352));
    assert.deepEqual([...opts].sort((a, b) => a - b), opts);
    assert.equal(new Set(opts).size, 3);
    assert.ok(opts.every((n) => cands.includes(n)));
  }
});

test('파일 규칙: innerHTML 없음, 인라인 style은 막대 폭만, 600줄 이하, 학습일지 연결', () => {
  const src = read(JS + 'number_three-twenty.js');
  assert.doesNotMatch(src, /innerHTML/);
  const sets = [...src.matchAll(/\.style\.([a-zA-Z]+)\s*=/g)].map((m) => m[1]);
  assert.ok(sets.every((p) => p === 'width'), `인라인 style: ${sets}`);
  assert.ok(src.split('\n').length <= 600);
  assert.match(src, /MathDrill\.track\(\s*'num3'\s*,\s*'twenty'\s*\)/);
});
