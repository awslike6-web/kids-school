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
