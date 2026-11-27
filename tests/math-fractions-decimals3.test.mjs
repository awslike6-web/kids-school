// 3-1 분수와 소수 첫걸음 탐험관 시험 (2026-11-28 옛 화면을 공용 탐험관 틀로 옮김, docs/refactor_batches.md 묶음 F):
// 소수·분수 글자(0.1 단위 정수, 부동소수 없음), 분수 이름, 미션·막대 문제 생성, 화면 파일 규칙, 노션 퀴즈 자료.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { read, lineCount, assetTags, assertLoadsInOrder, assertRelativeAssets, assertNoInlineStyleOrScript } from './split-rules.mjs';

const JS = 'kids/subjects/math/js/';
const PAGE = 'kids/subjects/math/fractions_decimals.html';

function load(files) {
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  for (const f of files) vm.runInContext(read(f), sandbox, { filename: f });
  return sandbox.window;
}

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

const W = load([JS + 'math_explorer-shell.js', JS + 'fractions_decimals-core.js']);
const C = W.FracDec3Core;
const M = W.MathExplorer;
const plain = (x) => JSON.parse(JSON.stringify(x));

test('소수·분수 글자: 0.1 단위 정수로 만든다 (1은 1.0이 아니라 1)', () => {
  assert.equal(C.decimalText(1), '0.1');
  assert.equal(C.decimalText(7), '0.7');
  assert.equal(C.decimalText(10), '1');
  assert.equal(C.decimalText(14), '1.4');
  assert.equal(C.decimalText(20), '2');
  assert.equal(C.tenthsToken(7), '7/10');
  assert.equal(C.tenthsToken(10), '10/10');
  assert.equal(C.tenthsToken(14), '1과 4/10');
  assert.equal(C.tenthsToken(20), '20/10');
  assert.equal(C.barChoice(12), '1.2 (1과 2/10)');
  assert.throws(() => C.tenthsToken(0));
  // 세로 분수 표기 계약: 틀의 fracParts가 대분수로 읽는다
  assert.deepEqual(plain(M.fracParts(C.tenthsToken(14))), [{ type: 'frac', w: '1', j: '과', n: '4', d: '10' }]);
});

test('분수 이름: 대분수·단위분수·진분수·가분수', () => {
  assert.equal(C.fractionType(1, 1, 4), 'mixed');
  assert.equal(C.fractionType(0, 1, 4), 'unit');
  assert.equal(C.fractionType(0, 3, 4), 'proper');
  assert.equal(C.fractionType(0, 4, 4), 'improper');
  assert.equal(C.fractionType(0, 7, 3), 'improper');
});

test('1관 미션: 분모는 등분 버튼 중 하나, 0 < 분자 < 분모, 직전과 다름', () => {
  const rng = seeded(1);
  let prev = null;
  for (let i = 0; i < 300; i++) {
    const t = C.pizzaTarget(rng, prev);
    assert.ok(C.DENOMS.includes(t.d));
    assert.ok(t.n >= 1 && t.n < t.d);
    if (prev) assert.ok(!(prev.n === t.n && prev.d === t.d));
    prev = t;
  }
});

test('2관 문제: 정답이 실제 분수 종류와 맞고, 단위분수 고르기는 분자 1이 하나뿐', () => {
  const rng = seeded(2);
  const NAME = { proper: '진분수', improper: '가분수', mixed: '대분수' };
  for (const kind of C.TYPE_KINDS) {
    for (let i = 0; i < 200; i++) {
      const q = C.typeQuestion(kind, rng);
      assert.equal(q.choices.length, 3);
      assert.equal(new Set(q.choices).size, 3, `${kind}: 보기 중복 ${q.choices}`);
      const parts = M.fracParts(q.token).filter((p) => p.type === 'frac');
      assert.equal(parts.length, 1, `${kind}: 분수 글자 ${q.token}`);
      if (kind === 'unit-pick') {
        const units = q.choices.filter((c) => c.startsWith('1/'));
        assert.equal(units.length, 1);
        assert.equal(q.choices[q.answer], units[0]);
      } else {
        const p = parts[0];
        const type = C.fractionType(Number(p.w || 0), Number(p.n), Number(p.d));
        assert.equal(q.choices[q.answer], NAME[kind]);
        assert.equal(type, kind, `${q.token}`);
        if (p.w) assert.equal(M.josaFrac(p.w, 'gwa').slice(p.w.length), p.j, `${q.token}: 과/와`);
      }
    }
  }
  const r = seeded(3);
  let prevKind = null;
  for (let i = 0; i < 100; i++) {
    const q = C.randomTypeQuestion(r, prevKind);
    assert.notEqual(q.kind, prevKind);
    prevKind = q.kind;
  }
});

test('3관 미션: 0.1~1.9, 1은 내지 않고 직전과 다름', () => {
  const rng = seeded(4);
  let prev = null;
  for (let i = 0; i < 300; i++) {
    const t = C.decimalTarget(rng, prev);
    assert.ok(t >= 1 && t <= 19 && t !== 10, String(t));
    assert.notEqual(t, prev);
    prev = t;
  }
});

test('4관 막대: 수직선 0~2 안, 보기 3개 중복 없음, 시작이 0이 아니면 끝 눈금 오답을 넣는다', () => {
  const rng = seeded(5);
  let sawEndTrap = false;
  for (let i = 0; i < 500; i++) {
    const b = C.makeBar(rng);
    assert.ok(C.BAR_STARTS.includes(b.start));
    assert.ok(b.len >= 2 && b.len <= 12);
    assert.ok(b.end <= 20, '수직선 밖');
    assert.equal(b.choices.length, 3);
    assert.equal(new Set(b.choices).size, 3, b.choices.join(' | '));
    assert.equal(b.choices[b.answer], C.barChoice(b.len));
    if (b.start > 0) {
      assert.ok(b.choices.includes(C.barChoice(b.end)), `끝 눈금 오답 ${b.start}+${b.len}`);
      sawEndTrap = true;
    }
  }
  assert.ok(sawEndTrap);
});

test('화면 파일: 요정 엔진 → 공용 틀 → 단원 파일 순서, 상대 경로, 인라인 없음, 600줄 이하, 대문 카드 두 곳', () => {
  const html = read(PAGE);
  const js = ['math_explorer-shell', 'math_squishy', 'math_explorer-quiz', 'fractions_decimals-core', 'fractions_decimals-labs'];
  assertLoadsInOrder(html, 'script', js.map((j) => `./js/${j}.js`), 'fractions_decimals');
  const engine = assetTags(html, 'script').find((t) => t.url === '../../core/fairy-engine.js');
  assert.ok(engine && engine.start < html.indexOf('./js/math_explorer-shell.js'), '요정 엔진이 먼저');
  assertLoadsInOrder(html, 'style', ['../../css/math_explorer.css', '../../css/math_fractions_decimals.css'], 'fractions_decimals');
  assertRelativeAssets(PAGE, 'script', assetTags(html, 'script').map((t) => t.src));
  assertRelativeAssets(PAGE, 'style', assetTags(html, 'style').filter((t) => !/^https?:/.test(t.src)).map((t) => t.src));
  assertNoInlineStyleOrScript(html, 'fractions_decimals');
  assert.doesNotMatch(html, /\son[a-z]+\s*=/i, 'on* 속성 없음');
  for (const id of ['mxTabs', 'mxContainer', 'mxDoneCount', 'mxTotal', 'mxProgressFill', 'mxCompleteModal', 'mxCompleteReward', 'mxCompleteClose', 'mxGoQuiz']) {
    assert.ok(html.includes(`id="${id}"`), `#${id}`);
  }
  assert.match(html, /<span id="mxTotal">4<\/span>/, '관 수 표시');
  for (const f of [...js.slice(3).map((j) => `${JS}${j}.js`), 'kids/css/math_fractions_decimals.css', PAGE]) {
    assert.ok(lineCount(read(f)) <= 600, `${f}: ${lineCount(read(f))}줄`);
  }
  const lobby = read('kids/subjects/math/math.html');
  assert.equal(lobby.split('href="fractions_decimals.html"').length - 1, 2, '수학 대문 학년별·영역별 두 곳');
});

test('관 파일: 세로 분수 옵션·관 4개·퀴즈 학년 단원, 글자 분수·innerHTML·기계음 없음', () => {
  const src = read(`${JS}fractions_decimals-labs.js`);
  assert.match(src, /key: 'fracdec3'/);
  assert.match(src, /fractions: true/);
  assert.match(src, /labs: \[lab1, lab2, lab3, lab4\]/);
  assert.ok(src.includes("grade: '3-1'") && src.includes("unit: '6. 분수와 소수'"));
  assert.doesNotMatch(src, /\d분의 \d|\+ *'분의 '/, '글자 분수');
  assert.doesNotMatch(src, /innerHTML/);
  assert.doesNotMatch(src, /speechSynthesis/);
  assert.doesNotMatch(src, /toISOString/);
});

test('퀴즈 자료: 12제·3지선다·화면과 같은 단원 원문·분수 표기 계약·보기 번호 표현 없음', () => {
  const d = JSON.parse(read('scripts/data/curriculum/math_3-1_6.json'));
  assert.equal(d.subject, '수학');
  assert.equal(d.grade, '3-1');
  assert.equal(d.unit, '6. 분수와 소수');
  assert.equal(d.items.length, 12);
  const answers = new Set();
  d.items.forEach((it, i) => {
    assert.equal(it.title.slice(0, 3), `Q${String(i + 1).padStart(2, '0')}`);
    assert.equal(it.zone, '탐구퀴즈');
    assert.equal(it.choices.length, 3);
    assert.equal(new Set(it.choices).size, 3, `${it.title}: 보기 중복`);
    assert.ok([1, 2, 3].includes(it.answer), it.title);
    answers.add(it.answer);
    const all = [it.question, ...it.choices, it.explanation].join(' ');
    assert.doesNotMatch(all, /\d분의 \d/, `${it.title}: 글자 분수`);
    assert.doesNotMatch(it.explanation, /\d번은|보기 \d|[①②③④]/, `${it.title}: 보기 번호 표현`);
    assert.match(it.usage, /^3-1 6단원 · /);
    assert.ok(!all.includes('\n'), `${it.title}: 줄바꿈`);
  });
  assert.equal(answers.size, 3, '정답 번호가 한쪽에 몰리지 않음');
});
