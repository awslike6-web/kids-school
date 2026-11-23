// 4-2 분수·소수 사다리 탐험관 화면 파일 시험 (docs/math_4-2_ladder_spec.md):
// 실림 순서·상대 경로·인라인 없음·파일 길이, 세로 분수 옵션·퀴즈 단원, 화면 글자의 분수 표기 계약, 공용 더 풀기 부품.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { read, lineCount, assetTags, assertLoadsInOrder, assertRelativeAssets, assertNoInlineStyleOrScript } from './split-rules.mjs';

const JS = 'kids/subjects/math/js/';
const PAGES = [
  {
    page: 'fraction_add', css: 'math_fraction_add', key: 'fracadd', grade: '4-2', unit: '1. 분수의 덧셈과 뺄셈', total: 7,
    js: ['math_explorer-shell', 'math_explorer-quiz', 'math_explorer-ladder', 'fraction_add-core', 'fraction_add-labs-a', 'fraction_add-labs-b']
  },
  {
    page: 'decimal_add', css: 'math_decimal_add', key: 'decadd', grade: '4-2', unit: '3. 소수의 덧셈과 뺄셈', total: 7,
    js: ['math_explorer-shell', 'math_explorer-quiz', 'math_explorer-ladder', 'decimal_multiplication-core', 'decimal_add-core', 'decimal_add-draw', 'decimal_add-labs-a', 'decimal_add-labs-b']
  }
];

test('4-2 사다리 화면: 공용 틀 → 계단 부품 → 단원 파일 순서, 상대 경로, 인라인 없음, 600줄 이하, 대문 카드', () => {
  for (const u of PAGES) {
    const file = `kids/subjects/math/${u.page}.html`;
    const html = read(file);
    assertLoadsInOrder(html, 'script', u.js.map((j) => `./js/${j}.js`), u.page);
    const engine = assetTags(html, 'script').find((t) => t.url === '../../core/fairy-engine.js');
    assert.ok(engine && engine.start < html.indexOf('./js/math_explorer-shell.js'), '요정 엔진이 먼저');
    assertLoadsInOrder(html, 'style', ['../../css/math_explorer.css', `../../css/${u.css}.css`], u.page);
    assertRelativeAssets(file, 'script', assetTags(html, 'script').map((t) => t.src));
    assertRelativeAssets(file, 'style', assetTags(html, 'style').filter((t) => !/^https?:/.test(t.src)).map((t) => t.src));
    assertNoInlineStyleOrScript(html, u.page);
    for (const id of ['mxTabs', 'mxContainer', 'mxDoneCount', 'mxTotal', 'mxProgressFill', 'mxCompleteModal', 'mxCompleteReward', 'mxCompleteClose', 'mxGoQuiz']) {
      assert.ok(html.includes(`id="${id}"`), `${u.page}: #${id}`);
    }
    assert.match(html, new RegExp(`<span id="mxTotal">${u.total}</span>`), '관 수 표시');
    for (const f of [...u.js.map((j) => `${JS}${j}.js`), `kids/css/${u.css}.css`]) {
      assert.ok(lineCount(read(f)) <= 600, `${f}: ${lineCount(read(f))}줄`);
    }
    const lobby = read('kids/subjects/math/math.html');
    assert.equal(lobby.split(`href="${u.page}.html"`).length - 1, 2, `수학 대문 학년별·영역별 두 곳에 ${u.page} 카드`);
  }
});

test('4-2 사다리 화면: 세로 분수 옵션을 켜고, 퀴즈 배틀은 학년·단원 원문으로 읽는다', () => {
  for (const u of PAGES) {
    const mountFile = read(`${JS}${u.js[u.js.length - 1]}.js`);
    assert.match(mountFile, new RegExp(`key: '${u.key}'`));
    assert.match(mountFile, /fractions: true/);
    assert.ok(mountFile.includes(`grade: '${u.grade}'`) && mountFile.includes(`unit: '${u.unit}'`), '퀴즈 학년·단원');
  }
});

test('4-2 사다리 화면: 화면 글자에 "5분의 3"식 글자 분수를 만들지 않는다 (세로 분수 표기 계약)', () => {
  for (const u of PAGES) {
    for (const j of u.js.filter((x) => /labs/.test(x))) {
      const src = read(`${JS}${j}.js`);
      // 화면에 내는 글자 분수: 숫자 + '분의 ' 또는 변수 + '분의 '
      assert.doesNotMatch(src, /\d분의 \d|\+ *'분의 '/, `${j}: 글자 분수`);
      assert.doesNotMatch(src, /FractionCore\.label|FC\.label/, `${j}: 화면에 label(읽기 글자) 사용`);
      assert.doesNotMatch(src, /innerHTML/, `${j}: innerHTML`);
    }
  }
});

test('공용 틀: 분수 뒤 조사는 분자(마지막에 읽는 수)에 맞춘다', () => {
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(read(`${JS}math_explorer-shell.js`), sandbox);
  const M = sandbox.window.MathExplorer;
  assert.equal(M.josaFrac('3/5', 'eul'), '3/5을');      // 5분의 삼 → 을
  assert.equal(M.josaFrac('2/5', 'eul'), '2/5를');      // 5분의 이 → 를
  assert.equal(M.josaFrac('5/5', 'eun'), '5/5는');      // 5분의 오 → 는
  assert.equal(M.josaFrac('1과 3/6', 'ieyo'), '1과 3/6이에요');
  assert.equal(M.josaFrac('2와 4/7', 'ieyo'), '2와 4/7예요');
  assert.equal(M.josaFrac('3', 'ieyo'), '3이에요');
  assert.equal(M.josaFrac('6/10', 'i'), '6/10이');
});

test('공용 더 풀기 부품: 학습일지 키는 g:frac4-<종류>, 학습일지가 없으면 조용히 넘어간다', () => {
  const calls = [];
  const sandbox = {
    window: {
      LearningLog: {
        keyFor: (p, id) => `${p}:${id}`,
        question: (base) => { calls.push(base); return { wrong() {}, done() {} }; }
      }
    }
  };
  vm.createContext(sandbox);
  vm.runInContext(read(`${JS}math_explorer-ladder.js`), sandbox);
  const D = sandbox.window.MathDrill;
  D.track('frac4', 'mixed-sub-borrow');
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [{ subject: '수학', key: 'g:frac4-mixed-sub-borrow' }]);
  const bare = { window: {} };
  vm.createContext(bare);
  vm.runInContext(read(`${JS}math_explorer-ladder.js`), bare);
  const t = bare.window.MathDrill.track('frac4', 'unit-count');
  assert.doesNotThrow(() => { t.wrong('3/5'); t.done(); });
});

test('4-2 사다리 퀴즈 자료: 12제·3지선다·단원 원문·세로 분수 글자 표기 계약·보기 번호 표현 없음', () => {
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(read(`${JS}math_explorer-shell.js`), sandbox);
  const M = sandbox.window.MathExplorer;
  for (const u of PAGES) {
    const file = u.page === 'fraction_add' ? 'math_4-2_1' : 'math_4-2_3';
    const d = JSON.parse(read(`scripts/data/curriculum/${file}.json`));
    assert.equal(d.subject, '수학');
    assert.equal(d.grade, u.grade);
    assert.equal(d.unit, u.unit, '화면 퀴즈 탭 단원 원문과 같음');
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
      assert.doesNotMatch(all, /\d[과와]\d/, `${it.title}: 대분수 띄어쓰기`);
      assert.doesNotMatch(it.explanation, /\d번은|보기 \d|[①②③④]/, `${it.title}: 보기 번호 표현`);
      assert.match(it.usage, /^4-2 [13]단원 · /);
      // 대분수 조사: 자연수 끝 숫자 받침에 맞음 (2와·3과)
      for (const p of M.fracParts(all).filter((x) => x.type === 'frac' && x.w)) {
        assert.equal(M.josaFrac(p.w, 'gwa').slice(p.w.length), p.j, `${it.title}: ${p.w}${p.j}`);
      }
    });
    assert.equal(answers.size, 3, '정답 번호가 한쪽에 몰리지 않음');
  }
});
