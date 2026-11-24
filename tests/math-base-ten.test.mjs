// 수 모형(BaseTenDraw) 시험: 모형 버튼 판단·목표 도달·묶을 자리 (docs/math_2-1_ladder_spec.md §3-2)
// 그림·묶기/풀기 장면·버튼 잠금은 쓰기 차단 서버에서 자동 조작으로 확인한다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { read } from './split-rules.mjs';

const FILE = 'kids/subjects/math/js/base_ten-draw.js';
const plain = (x) => JSON.parse(JSON.stringify(x));
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(read(FILE), sandbox, { filename: FILE });
const B = sandbox.window.BaseTenDraw;

test('모형 버튼 판단: 놓기·다 놓음·0인 자리', () => {
  const target = { h: 3, t: 0, o: 2 };
  assert.equal(B.planPress({ h: 0, t: 0, o: 0 }, 'h', target).action, 'add');
  const full = plain(B.planPress({ h: 3, t: 0, o: 0 }, 'h', target));
  assert.equal(full.action, 'blocked-full');
  assert.match(full.hint, /백 모형/);
  const zero = plain(B.planPress({ h: 0, t: 0, o: 0 }, 't', target));
  assert.equal(zero.action, 'blocked-zero');
  assert.match(zero.hint, /십의 자리는 0/);
  assert.equal(B.planPress({ h: 0, t: 0, o: 2 }, 'o', target).action, 'blocked-full');
  assert.match(B.planPress({ h: 0, t: 0, o: 2 }, 'o', target).hint, /일 모형/);
  assert.match(B.planPress({ h: 0, t: 0, o: 0 }, 'h', { h: 0, t: 1, o: 1 }).hint, /백의 자리는 0/);
});

test('목표 도달', () => {
  assert.equal(B.isReached({ h: 3, t: 5, o: 2 }, { h: 3, t: 5, o: 2 }), true);
  assert.equal(B.isReached({ h: 3, t: 5, o: 1 }, { h: 3, t: 5, o: 2 }), false);
});

test('묶을 자리: 일 10개 이상 먼저, 그다음 십 10개 이상', () => {
  assert.equal(B.carryPlan({ h: 0, t: 9, o: 10 }), 'ones');
  assert.equal(B.carryPlan({ h: 0, t: 10, o: 0 }), 'tens');
  assert.equal(B.carryPlan({ h: 0, t: 10, o: 12 }), 'ones');
  assert.equal(B.carryPlan({ h: 2, t: 9, o: 9 }), null);
});

test('파일 규칙: innerHTML 없음, 인라인 style은 transform만, 600줄 이하', () => {
  const src = read(FILE);
  assert.doesNotMatch(src, /innerHTML/);
  const styleSets = [...src.matchAll(/\.style\.([a-zA-Z]+)\s*=/g)].map((m) => m[1]);
  assert.ok(styleSets.every((p) => p === 'transform'), `인라인 style: ${styleSets}`);
  assert.doesNotMatch(src, /setAttribute\(\s*['"]style/);
  assert.ok(src.split('\n').length <= 600);
});
