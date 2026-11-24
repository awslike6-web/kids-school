// 1학년 덧셈·뺄셈 개념 화면 🎯 10 빙고 문제 만들기(ArithmeticBingo.makeBingo) 계약 시험 — docs/math_1_bridge_spec.md §4-1
// 계약서만 보고 초안과 따로 쓴 시험이다. 노션 미접속.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { read } from './split-rules.mjs';

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

const JS = 'kids/subjects/math/js/';
const sandbox = { window: {}, document: undefined };
vm.createContext(sandbox);
vm.runInContext(read(JS + 'arithmetic_bingo.js'), sandbox, { filename: 'arithmetic_bingo.js' });
const B = sandbox.window.ArithmeticBingo;

test('덧셈 10 빙고: seed 300개 — 9문제·답 서로 다름·10 만들기 4~5개·받아올림 덧셈', () => {
  for (let s = 1; s <= 300; s++) {
    const b = B.makeBingo('add', seeded(s));
    assert.equal(b.length, 9);
    assert.equal(new Set(b.map((p) => p.answerText)).size, 9);
    const make10 = b.filter((p) => p.kind === 'make10');
    assert.ok(make10.length === 4 || make10.length === 5, `make10 ${make10.length}`);
    for (const p of b) {
      assert.equal(p.op, 'add');
      if (p.kind === 'make10') {
        assert.ok(p.a >= 1 && p.a <= 9);
        assert.equal(p.answerText, String(10 - p.a));
        assert.equal(p.call, `${p.a} + □ = 10`);
        assert.equal(p.speak, `${p.a} 더하기 몇은 10?`);
      } else {
        assert.equal(p.kind, 'add-cross');
        assert.ok(p.a >= 2 && p.a <= 9 && p.b >= 2 && p.b <= 9 && p.a + p.b >= 11, `${p.a}+${p.b}`);
        assert.equal(p.answerText, String(p.a + p.b));
        assert.equal(p.call, `${p.a} + ${p.b}`);
        assert.equal(p.speak, `${p.a} 더하기 ${p.b}`);
      }
    }
  }
});

test('뺄셈 10 빙고: seed 300개 — 답 1~9 한 번씩·10에서 빼기 4~5개·답 1은 10 − 9·받아내림', () => {
  for (let s = 1; s <= 300; s++) {
    const b = B.makeBingo('sub', seeded(s));
    assert.equal(b.length, 9);
    assert.deepEqual([...b].map((p) => Number(p.answerText)).sort((x, y) => x - y), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const sub10 = b.filter((p) => p.kind === 'sub10');
    assert.ok(sub10.length === 4 || sub10.length === 5, `sub10 ${sub10.length}`);
    const one = b.find((p) => p.answerText === '1');
    assert.equal(one.kind, 'sub10');
    assert.equal(one.a, 10);
    assert.equal(one.b, 9);
    for (const p of b) {
      assert.equal(p.op, 'sub');
      assert.ok(p.call.includes('−') && !p.call.includes('-'), `빼기 기호 U+2212: ${p.call}`);
      if (p.kind === 'sub10') {
        assert.equal(p.a, 10);
        assert.equal(p.answerText, String(10 - p.b));
        assert.equal(p.call, `10 − ${p.b}`);
        assert.equal(p.speak, `10 빼기 ${p.b}`);
      } else {
        assert.equal(p.kind, 'sub-teen');
        assert.ok(p.a >= 11 && p.a <= 18 && p.b >= 2 && p.b <= 9 && p.b > p.a - 10, `${p.a}−${p.b}`);
        assert.equal(p.answerText, String(p.a - p.b));
        assert.equal(p.speak, `${p.a} 빼기 ${p.b}`);
      }
    }
  }
});

test('화면 파일 규칙: innerHTML·인라인 style 없음, 300줄 이내, 공용 빙고·연산별 키', () => {
  const src = read(JS + 'arithmetic_bingo.js');
  assert.doesNotMatch(src, /innerHTML/);
  assert.doesNotMatch(src, /\.style\.[a-zA-Z]+\s*=/);
  assert.ok(src.split('\n').length <= 300);
  assert.match(src, /MathBingo\.render\(/);
  assert.match(src, /'cpa-bingo-'\s*\+\s*(op|mode)/);
  assert.match(src, /math_cpa-bingo-/);
});

test('덧셈·뺄셈 화면: 10 빙고 탭과 공용 부품 싣는 순서, 공용 CSS가 페이지 CSS보다 먼저', () => {
  for (const page of ['addition_concept.html', 'subtraction_concept.html']) {
    const html = read('kids/subjects/math/' + page);
    assert.match(html, /data-panel="panel-bingo"/);
    assert.match(html, /<section id="panel-bingo"/);
    const order = ['math_explorer-shell.js', 'math_squishy.js', 'math_explorer-ladder.js', 'math_bingo.js', 'arithmetic_bingo.js', 'arithmetic_cpa.js', 'arithmetic_lessons.js'];
    const pos = order.map((f) => html.indexOf('js/' + f));
    assert.ok(pos.every((p) => p > 0), `${page} 실림: ${pos}`);
    assert.deepEqual([...pos].sort((a, b) => a - b), pos, `${page} 순서`);
    const css = html.indexOf('math_explorer.css');
    assert.ok(css > 0 && css < html.indexOf('arithmetic_cpa.css') && css < html.indexOf('math_factors.css'), `${page} 공용 CSS 먼저`);
    assert.match(html, /<body[^>]*class="[^"]*mx-grade1/);
  }
});
