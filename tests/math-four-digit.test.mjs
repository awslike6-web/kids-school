// 2-2 네 자리 수 탐험관 시험 (docs/math_2-2_four_digit_spec.md): 계산 부품 FourDigitCore, 천 모형(BaseTenDraw), 화면 파일, 퀴즈 자료
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { read, lineCount, assetTags, assertLoadsInOrder, assertRelativeAssets, assertNoInlineStyleOrScript } from './split-rules.mjs';

const JS = 'kids/subjects/math/js/';
const plain = (x) => JSON.parse(JSON.stringify(x));

function load(files) {
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  for (const f of files) vm.runInContext(read(f), sandbox, { filename: f });
  return sandbox.window;
}
const C = load([`${JS}number_four-core.js`]).FourDigitCore;

function seeded(seed) {
  let s = seed >>> 0 || 1;
  return () => { s = (s * 1103515245 + 12345) >>> 0; return s / 4294967296; };
}

test('읽기: 1은 앞에 붙이지 않고 0인 자리는 읽지 않는다', () => {
  const cases = { 1000: '천', 1110: '천백십', 2105: '이천백오', 3045: '삼천사십오', 7200: '칠천이백', 9999: '구천구백구십구', 1001: '천일', 5008: '오천팔', 6010: '육천십', 2301: '이천삼백일' };
  for (const [n, ko] of Object.entries(cases)) assert.equal(C.readKo(Number(n)), ko, n);
  assert.equal(C.readKoWrong(1110, 'read-one-prefix'), '일천일백일십');
  assert.equal(C.readKoWrong(3045, 'read-zero'), '삼천영사십오');
  assert.equal(C.readKoWrong(3045, 'read-shift-zero'), '삼천사백오');
  assert.equal(C.readKoWrong(3045, 'read-skip-place'), '삼백사십오');
  assert.equal(C.readKoWrong(2301, 'read-drop-ones-one'), '이천삼백');
  assert.equal(C.shiftZero(3045), 3405);
  assert.equal(C.shiftZero(1105), 1150);
  assert.equal(C.shiftZero(5376), null);
  assert.deepEqual(plain(C.digits(5376)), { th: 5, h: 3, t: 7, o: 6 });
  assert.equal(C.placeValue(5376, 'h'), 300);
  assert.deepEqual(plain(C.expandTerms(3507)), [3000, 500, 7]);
});

test('문제 seed 300개: 범위·제약·오답 2개(정답·서로와 다름, 1만 이상은 자리마다 따로 쓴 글자만)', () => {
  for (let seed = 1; seed <= 300; seed += 1) {
    const rng = seeded(seed);
    for (const kind of C.KIND_ORDER) {
      const p = C.makeProblem(kind, rng);
      assert.equal(p.kind, kind);
      const w = C.wrongChoices(p);
      assert.equal(w.length, 2, `${kind} ${JSON.stringify(p)}: 오답 2개`);
      assert.notEqual(w[0].text, w[1].text, `${kind}: 오답끼리 같음`);
      for (const x of w) {
        assert.notEqual(x.text, p.answerText, `${kind}: 오답이 정답과 같음`);
        assert.ok(x.mistake, `${kind}: 오개념 이름`);
        if (typeof x.value === 'number' && x.value >= 10000) assert.equal(x.mistake, 'write-each-place', `${kind}: 1만 이상 ${x.value}`);
      }
      if (typeof p.answer === 'number' && p.answer >= 100) assert.ok(p.answer >= 1000 && p.answer <= 9999 || kind === 'place-mid', `${kind}: 정답 ${p.answer}`);
      if (kind === 'listen-build') {
        const d = C.digits(p.n);
        assert.ok(d.th >= 1 && d.th <= 3 && d.h <= 3 && d.t <= 3 && d.o <= 3, `listen-build ${p.n}`);
        assert.ok(d.th + d.h + d.t + d.o <= 8, `listen-build 누르는 횟수 ${p.n}`);
        assert.ok([d.h, d.t, d.o].filter((v) => v === 0).length <= 1);
      }
      if (kind === 'listen-write') {
        const d = C.digits(p.n);
        assert.ok((d.h === 0 || d.t === 0) && d.o !== 0, `listen-write ${p.n}`);
      }
      if (kind === 'see-read') {
        const d = C.digits(p.n);
        assert.ok(d.th === 1 || d.h === 1 || d.t === 1 || d.h === 0 || d.t === 0, `see-read ${p.n}`);
        assert.equal(p.answerText, C.readKo(p.n));
      }
      if (kind === 'place-th' || kind === 'place-mid') {
        const s = String(p.n);
        assert.equal(new Set(s).size, 4, `${kind}: 서로 다른 숫자 ${p.n}`);
        assert.ok(!s.includes('0'));
      }
      if (kind === 'expand') {
        const d = C.digits(p.n);
        assert.equal([d.h, d.t, d.o].filter((v) => v === 0).length, 1, `expand ${p.n}`);
        assert.equal(p.terms.reduce((a, b) => a + b, 0), p.n);
      }
      if (kind === 'jump-1000' || kind === 'jump-small') {
        assert.equal(p.answer, p.start + p.step);
        assert.ok(p.start >= 1000 && p.answer <= 9999, `${kind} ${p.start}+${p.step}`);
      }
      if (kind === 'compare') {
        assert.notEqual(p.a, p.b);
        assert.ok(p.a >= 1000 && p.a <= 9999 && p.b >= 1000 && p.b <= 9999);
        assert.equal(p.answerText, p.a > p.b ? '>' : '<');
      }
      if (kind === 'thousands') assert.ok(p.th >= 2 && p.th <= 9);
    }
  }
});

test('보기에 네 자리 수 오답이 있다 (자릿수만 보고 찍지 않게): 몇천·듣고 쓰기·천의 자리', () => {
  for (let seed = 1; seed <= 200; seed += 1) {
    const rng = seeded(seed);
    for (const kind of ['thousands', 'listen-write', 'place-th']) {
      const p = C.makeProblem(kind, rng);
      const four = C.wrongChoices(p).filter((x) => typeof x.value === 'number' && x.value >= 1000 && x.value <= 9999);
      assert.ok(four.length >= 1, `${kind} ${p.n}`);
    }
  }
  // 경계 뛰어 세기는 받아올림을 잊은 수를 오답으로
  const rng = seeded(7);
  let seen = 0;
  for (let i = 0; i < 200; i += 1) {
    const p = C.makeProblem('jump-small', rng);
    if (!p.cross) continue;
    seen += 1;
    assert.ok(C.wrongChoices(p).some((x) => x.mistake === 'jump-boundary' && x.value === p.answer - p.step * 10));
  }
  assert.ok(seen > 50, '경계 문제가 절반쯤');
});

test('한 판·섞어 풀기·빙고·스무고개', () => {
  for (let seed = 1; seed <= 100; seed += 1) {
    const rng = seeded(seed);
    for (let lab = 1; lab <= 5; lab += 1) {
      const r = C.makeRound(lab, rng);
      assert.deepEqual(r.map((p) => p.kind), C.LAB_KINDS[lab]);
    }
    const mixed = C.makeMixedRound(rng, 6);
    assert.equal(mixed.length, 6);
    const b = C.makeBingo(rng);
    assert.equal(b.length, 9);
    assert.equal(new Set(b.map((p) => p.answerText)).size, 9, '빙고 답 9개가 서로 다름');
    for (const p of b) {
      assert.ok(C.BINGO_KINDS.includes(p.kind));
      assert.ok(p.call && p.call.length <= 30, p.call);
      assert.doesNotMatch(p.call, /undefined|NaN/);
    }
  }
  assert.equal(C.bingoCallText({ kind: 'expand', terms: [3000, 500, 7] }), '3000과 500과 7을 더한 수');
  assert.equal(C.bingoCallText({ kind: 'expand', terms: [4000, 20, 9] }), '4000과 20과 9를 더한 수');
  assert.equal(C.bingoCallText({ kind: 'place-th', n: 2531, digit: 2 }), '2531에서 2가 나타내는 수');
  assert.equal(C.candidates([]).length, 9000);
  assert.equal(C.chipText('thg:4'), '천의 자리가 4보다 커요?');
  assert.equal(C.chipText('h:5'), '백의 자리가 5예요?');
  assert.equal(C.chipText('th:3'), '천의 자리가 3이에요?');
  assert.equal(C.chipAnswer(3456, 'thg:2'), true);
  assert.equal(C.chipAnswer(3456, 'th:3'), true);
  assert.equal(C.chipAnswer(3456, 'tg:5'), false);
  const asked = [{ id: 'gt:5000', answer: true }, { id: 'thg:7', answer: false }, { id: 'h:0', answer: true }];
  assert.ok(C.candidates(asked).every((n) => n > 5000 && n < 8000 && Math.floor(n / 100) % 10 === 0));
  for (const id of C.chipList()) assert.doesNotMatch(C.chipText(id), /undefined|NaN/, id);
});

test('천 모형: 천 없이 만든 판은 그대로, 천이 있으면 맨 위 줄, 백 10개 → 천 1개', () => {
  const B = load([`${JS}base_ten-draw.js`]).BaseTenDraw;
  assert.equal(B.carryPlan({ th: 0, h: 10, t: 0, o: 0 }), 'hundreds');
  assert.equal(B.carryPlan({ h: 9, t: 10, o: 0 }), 'tens');
  assert.equal(B.isReached({ th: 1, h: 0, t: 0, o: 0 }, { th: 1, h: 0, t: 0, o: 0 }), true);
  assert.equal(B.isReached({ th: 0, h: 10, t: 0, o: 0 }, { th: 1, h: 0, t: 0, o: 0 }), false);
  assert.match(B.planPress({ th: 2 }, 'th', { th: 2 }).hint, /천 모형은 다 놓았어요/);
  // 아주 작은 가짜 문서로 판 모양을 본다
  const make = () => {
    const el = (tag) => ({ tag, className: '', textContent: '', children: [], classList: { add() {}, remove() {} },
      appendChild(c) { this.children.push(c); return c; }, replaceChildren() { this.children = []; } });
    return { createElement: el, head: { appendChild() {} }, getElementById: () => null };
  };
  const w = load([`${JS}base_ten-draw.js`]);
  w.document = make();
  const sandbox = { window: w, document: w.document };
  vm.createContext(sandbox);
  vm.runInContext(read(`${JS}base_ten-draw.js`), sandbox);
  const BT = sandbox.window.BaseTenDraw;
  const three = BT.model({ h: 3, t: 5, o: 2 });
  assert.deepEqual(three.el.children.map((c) => c.className), ['bt-row-h', 'bt-row-to'], '2-1 판은 두 줄 그대로');
  assert.deepEqual(Object.keys(plain(three.get())).sort(), ['h', 'o', 't'], '천 없는 판의 get에는 th가 없다');
  const four = BT.model({ th: 2, h: 3, t: 0, o: 1 });
  assert.deepEqual(four.el.children.map((c) => c.className), ['bt-row-th', 'bt-row-h', 'bt-row-to']);
  assert.equal(four.el.children[0].children.length, 2);
  assert.equal(four.el.children[0].children[0].className, 'bt-thousand');
  assert.deepEqual(plain(four.get()), { h: 3, t: 0, o: 1, th: 2 });
  four.set({ th: 4, h: 0, t: 0, o: 0 });
  assert.equal(four.el.children[0].children.length, 4);
  const pic = BT.picture(5376);
  assert.equal(pic.children[0].className, 'bt-row-th');
  assert.equal(pic.children[0].children.length, 5);
  assert.equal(BT.picture(352).children.length, 2, '세 자리 그림은 두 줄');
});

test('화면 파일: 실림 순서·상대 경로·인라인 없음·600줄 이하·대문 카드 두 곳·민서 맞춤·퀴즈 2-2', () => {
  const file = 'kids/subjects/math/number_four.html';
  const html = read(file);
  const js = ['math_explorer-shell', 'math_squishy', 'math_explorer-quiz', 'math_explorer-ladder', 'base_ten-draw', 'math_bingo', 'number_four-core', 'number_three-twenty', 'number_four-labs'];
  assertLoadsInOrder(html, 'script', js.map((j) => `./js/${j}.js`), 'number_four');
  assertLoadsInOrder(html, 'style', ['../../css/math_explorer.css', '../../css/math_number_four.css'], 'number_four');
  assertRelativeAssets(file, 'script', assetTags(html, 'script').map((t) => t.src));
  assertRelativeAssets(file, 'style', assetTags(html, 'style').filter((t) => !/^https?:/.test(t.src)).map((t) => t.src));
  assertNoInlineStyleOrScript(html, 'number_four');
  assert.match(html, /<body class="[^"]*\bmx-grade2\b/);
  assert.match(html, /href="number_three\.html"/, '아래 계단 칩');
  assert.match(read('kids/subjects/math/number_three.html'), /href="number_four\.html"/, '세 자리 수 화면에서 올라오는 칩');
  for (const f of [`${JS}number_four-core.js`, `${JS}number_four-labs.js`, `${JS}base_ten-draw.js`, 'kids/css/math_number_four.css', file]) {
    assert.ok(lineCount(read(f)) <= 600, `${f}: ${lineCount(read(f))}줄`);
  }
  assert.equal(read('kids/subjects/math/math.html').split('href="number_four.html"').length - 1, 2, '수학 대문 두 곳에 카드');
  const src = read(`${JS}number_four-labs.js`);
  for (const re of [/var KEY = 'num4'/, /rememberTab: true/, /wishBox: true/, /nextButton: true/, /perReward: 6/, /sayHint: true/, /MathBingo\.render/, /NumberTwenty\.makeLab/, /total: 9000/, /grade: '2-2'/, /unit: '1\. 네 자리 수'/, /sayQuestion: true/]) {
    assert.match(src, re);
  }
  assert.doesNotMatch(src, /innerHTML/);
  const readAsks = [...src.matchAll(/question: '이 수를 어떻게 읽어요\?'[^}]*?speak: ([^,}]+)/g)].map((m) => m[1].trim());
  assert.ok(readAsks.length >= 2, '수 읽기 문제 두 곳');
  for (const s of readAsks) assert.equal(s, "'이 수를 어떻게 읽어요?'", `speak: ${s}`);
  // 오개념마다 힌트 글이 있다
  const core = read(`${JS}number_four-core.js`);
  const mistakes = new Set([...core.matchAll(/'([a-z]+(?:-[a-z]+)+)'\);?\s*$/gm)].map((m) => m[1]));
  for (const m of [...core.matchAll(/(?:pushChoice\([^;]*?|add\([^;]*?)'([a-z]+(?:-[a-z0-9]+)+)'\)/g)].map((x) => x[1])) mistakes.add(m);
  for (const m of mistakes) {
    if (C.KIND_ORDER.includes(m)) continue;
    assert.ok(src.includes(`'${m}':`), `힌트 없음: ${m}`);
  }
});

// 퀴즈 자료 12제: 정답을 다시 계산해 맞춰 보고, 수 범위(1만 이상 없음)·읽기 규칙을 본다
const QUIZ_ANSWERS = [100 * 10, 999 + 1, 1000 * 7, 3045, 1110, 2638, 700, 5000 + 300 + 9, 4500 + 1000, 6950 + 100, Math.max(4990, 4899, 5012), 3 * 1000 + 4 * 100 + 6];
test('2-2 퀴즈 자료 12제: 3지선다·단원 원문·정답 검산·1만 이상 없음·보기 번호 표현 없음', () => {
  const d = JSON.parse(read('scripts/data/curriculum/math_2-2_1.json'));
  assert.equal(d.subject, '수학');
  assert.equal(d.grade, '2-2');
  assert.equal(d.unit, '1. 네 자리 수');
  assert.equal(d.items.length, 12);
  const answers = {};
  d.items.forEach((it, i) => {
    assert.equal(it.title.slice(0, 3), `Q${String(i + 1).padStart(2, '0')}`);
    assert.equal(it.zone, '탐구퀴즈');
    assert.equal(it.choices.length, 3);
    assert.equal(new Set(it.choices).size, 3, `${it.title}: 보기 중복`);
    answers[it.answer] = (answers[it.answer] || 0) + 1;
    assert.doesNotMatch(it.explanation, /\d번은|보기 \d|[①②③④]/, `${it.title}: 보기 번호 표현`);
    assert.match(it.usage, /^2-2 1단원 · /);
    const nums = [it.question, ...it.choices].join(' ').match(/\d+/g).map(Number);
    assert.ok(nums.every((n) => n < 10000), `${it.title}: 1만 이상`);
    assert.equal(Number(it.choices[it.answer - 1].match(/\d+/)[0]), QUIZ_ANSWERS[i], it.title);
  });
  assert.deepEqual(answers, { 1: 4, 2: 4, 3: 4 }, '정답 자리 고르게');
  assert.equal(C.readKo(3045), '삼천사십오');
  assert.equal(C.readKo(1110), '천백십');
});
