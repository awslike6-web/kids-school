// 4-1 큰 수 탐험관 시험 (2026-11-28 옛 화면을 공용 탐험관 틀로 옮김, docs/refactor_batches.md 묶음 F2):
// 쉼표·한글 단위 읽기, 자릿값 표, 뛰어 세기(받아올림 없음), 크기 비교, 화면 파일 규칙, 노션 퀴즈 자료.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { read, lineCount, assetTags, assertLoadsInOrder, assertRelativeAssets, assertNoInlineStyleOrScript } from './split-rules.mjs';

const JS = 'kids/subjects/math/js/';
const PAGE = 'kids/subjects/math/big_numbers.html';

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

const C = load([JS + 'big_numbers-core.js']).BigNumCore;
const digitAt = (n, exp) => Math.floor(n / 10 ** exp) % 10;

test('쉼표와 한글 단위 읽기 (교과서 표기: 5억 4000만)', () => {
  assert.equal(C.comma(0), '0');
  assert.equal(C.comma(999), '999');
  assert.equal(C.comma(34000), '34,000');
  assert.equal(C.comma(1000000000000000), '1,000,000,000,000,000');
  assert.equal(C.korean(85000), '8만 5000');
  assert.equal(C.korean(540000000), '5억 4000만');
  assert.equal(C.korean(2300000000000), '2조 3000억');
  assert.equal(C.korean(2503000000), '25억 300만');
  assert.equal(C.korean(100000000), '1억');
  assert.equal(C.korean(7), '7');
  assert.throws(() => C.korean(10 ** 16));
});

test('자릿값: 16자리 표, 자리 이름, 1관 미션', () => {
  assert.equal(C.PLACES.length, 16);
  C.PLACES.forEach((p, i) => assert.equal(p.exp, 15 - i));
  assert.equal(C.placeIndex('man'), 11);
  assert.deepEqual([...C.digitRow(11)].slice(10), ['', '1', '0', '0', '0', '0']);
  assert.equal(C.placeName(7), '천만의 자리');
  assert.equal(C.placeName(8), '억의 자리');
  assert.equal(C.placeName(12), '조의 자리');
  assert.equal(C.placeName(0), '일의 자리');
  const rng = seeded(1);
  let prev = null;
  for (let i = 0; i < 200; i++) {
    const t = C.placeTarget(rng, prev);
    assert.ok(t >= 0 && t <= 14);
    assert.notEqual(t, prev);
    prev = t;
  }
});

test('뛰어 세기: 그 자리 숫자만 1씩 커지고(받아올림 없음), 보기 3개 중복 없음', () => {
  const rng = seeded(2);
  for (const step of C.STEPS) {
    const exp = Math.round(Math.log10(step));
    for (let i = 0; i < 200; i++) {
      const p = C.makeSkip(rng, step);
      assert.equal(p.values.length, 5);
      for (let k = 1; k < 5; k++) {
        assert.equal(p.values[k] - p.values[k - 1], step);
        assert.equal(digitAt(p.values[k], exp), digitAt(p.values[k - 1], exp) + 1, '받아올림 없음');
        assert.equal(digitAt(p.values[k], exp + 1), digitAt(p.values[0], exp + 1), '윗자리 그대로');
      }
      assert.ok(p.blank >= 1 && p.blank <= 4);
      assert.equal(p.choices[p.answerIndex], C.comma(p.values[p.blank]));
      assert.equal(new Set(p.choices).size, 3, p.choices.join(' | '));
      assert.equal(p.place, C.PLACE_OF_STEP[step]);
    }
  }
});

test('크기 비교: 기호가 맞고, 자릿수 다름/같음 종류가 지켜지며, 다른 자리 이름이 맞다', () => {
  const rng = seeded(3);
  for (const kind of ['digits', 'top']) {
    for (let i = 0; i < 300; i++) {
      const p = C.makeCompare(rng, kind);
      const sign = p.a > p.b ? '>' : p.a < p.b ? '<' : '=';
      assert.equal(p.sign, sign);
      assert.equal(p.choices[p.answerIndex], sign);
      assert.notEqual(p.a, p.b);
      assert.ok(p.a < 10 ** 16 && p.b < 10 ** 16);
      if (kind === 'digits') {
        assert.notEqual(p.digitsA, p.digitsB);
      } else {
        assert.equal(p.digitsA, p.digitsB);
        const top = p.digitsA - 1;
        assert.equal(digitAt(p.a, top), digitAt(p.b, top), '가장 높은 자리 같음');
        assert.notEqual(digitAt(p.a, top - 1), digitAt(p.b, top - 1), '그다음 자리 다름');
        assert.equal(p.diffPlace, C.placeName(top - 1));
      }
      C.korean(p.a);
      C.korean(p.b);
    }
  }
});

test('화면 파일: 요정 엔진 → 공용 틀 → 단원 파일 순서, 상대 경로, 인라인 없음, 600줄 이하, 대문 카드 두 곳', () => {
  const html = read(PAGE);
  const js = ['math_explorer-shell', 'math_squishy', 'math_explorer-quiz', 'big_numbers-core', 'big_numbers-labs'];
  assertLoadsInOrder(html, 'script', js.map((j) => `./js/${j}.js`), 'big_numbers');
  const engine = assetTags(html, 'script').find((t) => t.url === '../../core/fairy-engine.js');
  assert.ok(engine && engine.start < html.indexOf('./js/math_explorer-shell.js'), '요정 엔진이 먼저');
  assertLoadsInOrder(html, 'style', ['../../css/math_explorer.css', '../../css/math_big_numbers.css'], 'big_numbers');
  assertRelativeAssets(PAGE, 'script', assetTags(html, 'script').map((t) => t.src));
  assertRelativeAssets(PAGE, 'style', assetTags(html, 'style').filter((t) => !/^https?:/.test(t.src)).map((t) => t.src));
  assertNoInlineStyleOrScript(html, 'big_numbers');
  assert.doesNotMatch(html, /\son[a-z]+\s*=/i, 'on* 속성 없음');
  for (const id of ['mxTabs', 'mxContainer', 'mxDoneCount', 'mxTotal', 'mxProgressFill', 'mxCompleteModal', 'mxCompleteReward', 'mxCompleteClose', 'mxGoQuiz']) {
    assert.ok(html.includes(`id="${id}"`), `#${id}`);
  }
  assert.match(html, /<span id="mxTotal">3<\/span>/, '관 수 표시');
  for (const f of [...js.slice(3).map((j) => `${JS}${j}.js`), 'kids/css/math_big_numbers.css', PAGE]) {
    assert.ok(lineCount(read(f)) <= 600, `${f}: ${lineCount(read(f))}줄`);
  }
  const lobby = read('kids/subjects/math/math.html');
  assert.equal(lobby.split('href="big_numbers.html"').length - 1, 2, '수학 대문 학년별·영역별 두 곳');
});

test('관 파일: 관 3개·퀴즈 학년 단원, innerHTML·기계음·UTC 날짜 없음', () => {
  const src = read(`${JS}big_numbers-labs.js`);
  assert.match(src, /key: 'bignum4'/);
  assert.match(src, /labs: \[lab1, lab2, lab3\]/);
  assert.ok(src.includes("grade: '4-1'") && src.includes("unit: '1. 큰 수'"));
  assert.doesNotMatch(src, /innerHTML/);
  assert.doesNotMatch(src, /speechSynthesis/);
  assert.doesNotMatch(src, /toISOString|toLocaleString/);
});

test('퀴즈 자료: 12제·3지선다·화면과 같은 단원 원문·보기 번호 표현 없음', () => {
  const d = JSON.parse(read('scripts/data/curriculum/math_4-1_1.json'));
  assert.equal(d.subject, '수학');
  assert.equal(d.grade, '4-1');
  assert.equal(d.unit, '1. 큰 수');
  assert.equal(d.items.length, 12);
  const answers = new Set();
  d.items.forEach((it, i) => {
    assert.equal(it.title.slice(0, 3), `Q${String(i + 1).padStart(2, '0')}`);
    assert.equal(it.zone, '탐구퀴즈');
    assert.equal(it.choices.length, 3);
    assert.equal(new Set(it.choices).size, 3, `${it.title}: 보기 중복`);
    assert.ok([1, 2, 3].includes(it.answer), it.title);
    answers.add(it.answer);
    assert.doesNotMatch(it.explanation, /\d번은|보기 \d|[①②③④]/, `${it.title}: 보기 번호 표현`);
    assert.match(it.usage, /^4-1 1단원 · /);
    assert.ok(![it.question, ...it.choices, it.explanation].join(' ').includes('\n'), `${it.title}: 줄바꿈`);
  });
  assert.equal(answers.size, 3, '정답 번호가 한쪽에 몰리지 않음');
});
