// 2-1 세 자리 수·덧셈과 뺄셈 탐험관 화면 파일 시험 (docs/math_2-1_ladder_spec.md):
// 실림 순서·상대 경로·인라인 없음·파일 길이·대문 카드, 민서 맞춤(자동 읽기·수 읽기 문제는 수를 소리 내지 않음·지난번 관 기억·다음 관·6문제 보상)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { read, lineCount, assetTags, assertLoadsInOrder, assertRelativeAssets, assertNoInlineStyleOrScript } from './split-rules.mjs';

const JS = 'kids/subjects/math/js/';
const COMMON = ['math_explorer-shell', 'math_squishy', 'math_explorer-quiz', 'math_explorer-ladder'];
const PAGES = [
  { page: 'number_three', css: 'math_number_three', key: 'num3', unit: '1. 세 자리 수', js: [...COMMON, 'base_ten-draw', 'math_bingo', 'number_three-core', 'number_three-twenty', 'number_three-labs'] },
  { page: 'add_sub_two', css: 'math_add_sub_two', key: 'add2', unit: '3. 덧셈과 뺄셈', js: [...COMMON, 'base_ten-draw', 'math_column-draw', 'math_bingo', 'add_sub_two-core', 'add_sub_two-labs'] }
];

test('2-1 화면: 공용 틀 → 부품 → 단원 파일 순서, 상대 경로, 인라인 없음, 600줄 이하, 대문 카드 두 곳', () => {
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
    assert.match(html, /<body class="[^"]*\bmx-grade2\b/, '2학년 큰 글자 표시');
    for (const id of ['mxTabs', 'mxContainer', 'mxDoneCount', 'mxTotal', 'mxProgressFill', 'mxCompleteModal', 'mxCompleteReward', 'mxCompleteClose', 'mxGoQuiz']) {
      assert.ok(html.includes(`id="${id}"`), `${u.page}: #${id}`);
    }
    assert.doesNotMatch(html, /💎/, '민서 화면 고정 글자에 보석 표시 없음');
    for (const f of [...u.js.map((j) => `${JS}${j}.js`), `kids/css/${u.css}.css`]) {
      assert.ok(lineCount(read(f)) <= 600, `${f}: ${lineCount(read(f))}줄`);
    }
    const lobby = read('kids/subjects/math/math.html');
    assert.equal(lobby.split(`href="${u.page}.html"`).length - 1, 2, `수학 대문 두 곳에 ${u.page} 카드`);
  }
});

test('2-1 화면: 민서 맞춤 — 지난번 관 기억, 다음 관, 6문제 보상, 자동 읽기·힌트 읽기, 빙고, 퀴즈 학년·단원', () => {
  for (const u of PAGES) {
    const src = read(`${JS}${u.page}-labs.js`);
    assert.ok(new RegExp(`key: '${u.key}'`).test(src) || (new RegExp(`var KEY = '${u.key}'`).test(src) && /key: KEY/.test(src)), '탐험관 key');
    assert.match(src, /rememberTab: true/);
    assert.match(src, /wishBox: true/);
    assert.match(src, /nextButton: true/);
    assert.match(src, /perReward: 6/);
    assert.match(src, /say: ctx\.say/);
    assert.match(src, /sayHint: true/);
    assert.match(src, /MathBingo\.render/);
    assert.ok(src.includes("grade: '2-1'") && (src.includes(`unit: '${u.unit}'`) || (src.includes(`UNIT = '${u.unit}'`) && /unit: UNIT/.test(src))), '퀴즈 학년·단원');
    assert.doesNotMatch(src, /innerHTML/);
  }
  // 수를 읽는 법을 묻는 문제는 질문 음성(speak)에 수를 넣지 않는다
  const num3 = read(`${JS}number_three-labs.js`);
  const readAsks = [...num3.matchAll(/question: '이 수를 어떻게 읽어요\?'[^}]*?speak: ([^,}]+)/g)].map((m) => m[1].trim());
  assert.ok(readAsks.length >= 2, '수 읽기 문제 두 곳');
  for (const s of readAsks) assert.equal(s, "'이 수를 어떻게 읽어요?'", `speak: ${s}`);
});

// 퀴즈 자료 24제: 정답을 식으로 다시 계산해 맞춰 보고, 범위(수 100~999·합 ≤ 99·받아올림/받아내림 한 번·차의 십의 자리 ≥ 1)를 본다
const ones = (n) => n % 10;
const carries = (a, b) => (ones(a) + ones(b) >= 10 ? 1 : 0) + (Math.floor(a / 10) % 10 + Math.floor(b / 10) % 10 + (ones(a) + ones(b) >= 10 ? 1 : 0) >= 10 ? 1 : 0);
const borrows = (a, b) => (ones(a) < ones(b) ? 1 : 0);
// 단원 1: 정답 수(Q08은 자릿값 80)
const NUM3_ANSWERS = [99 + 1, 10 * 10, 100 * 6, 305, 112, 427, 503, 80, 690 + 10, 450 + 100, Math.max(418, 481, 399), 346];
// 단원 3: [식 단계들] — 덧셈은 ['+', a, b], 뺄셈은 ['-', a, b]; 앞 단계 결과가 다음 a
const ADD2_STEPS = [
  [['+', 38, 5]], [['+', 27, 16]], [['+', 46, 18]], [['-', 52, 7]], [['-', 40, 6]], [['-', 63, 28]], [['-', 72, 35]],
  [['-', 45, 9], ['+', null, 12]], [['-', 53, 17]], [['-', 23, 8]], [['-', 61, 25]], [['+', 17, 25], ['+', null, 30]]
];

test('2-1 퀴즈 자료 24제: 12제·3지선다·단원 원문·정답 검산·범위·보기 번호 표현 없음', () => {
  for (const u of PAGES) {
    const file = u.page === 'number_three' ? 'math_2-1_1' : 'math_2-1_3';
    const d = JSON.parse(read(`scripts/data/curriculum/${file}.json`));
    assert.equal(d.subject, '수학');
    assert.equal(d.grade, '2-1');
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
      assert.doesNotMatch(it.explanation, /\d번은|보기 \d|[①②③④]/, `${it.title}: 보기 번호 표현`);
      assert.match(it.usage, new RegExp(`^2-1 ${u.page === 'number_three' ? 1 : 3}단원 · `));
      const nums = [it.question, ...it.choices].join(' ').match(/\d+/g).map(Number);
      assert.ok(nums.every((n) => n <= 1000), `${it.title}: 1000을 넘는 수`);
      const picked = Number(it.choices[it.answer - 1].match(/\d+/)[0]);
      if (u.page === 'number_three') {
        assert.equal(picked, NUM3_ANSWERS[i], it.title);
        if (i !== 7) assert.ok(picked >= 100 && picked <= 999, `${it.title}: 정답 100~999`);
      } else {
        let acc = null;
        let regroup = 0;
        for (const [op, a0, b] of ADD2_STEPS[i]) {
          const a = a0 === null ? acc : a0;
          if (op === '+') { regroup += carries(a, b); acc = a + b; assert.ok(acc <= 99, `${it.title}: 합 ≤ 99`); }
          else { regroup += borrows(a, b); acc = a - b; assert.ok(acc >= 1, `${it.title}: 차 ≥ 1`); if (b >= 10) assert.ok(acc >= 10, `${it.title}: 차의 십의 자리 ≥ 1`); }
        }
        assert.ok(regroup <= 1, `${it.title}: 받아올림·받아내림 한 번까지`);
        if (i === 8) assert.equal(it.choices[it.answer - 1], '53 − 17 = 36', it.title);
        else assert.equal(picked, acc, it.title);
      }
    });
    assert.equal(answers.size, 3, '정답 번호가 한쪽에 몰리지 않음');
  }
  for (const page of ['number_three', 'add_sub_two']) assert.match(read(`${JS}${page}-labs.js`), /sayQuestion: true/, '퀴즈 질문 자동 읽기');
});
