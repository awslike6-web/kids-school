// 2-2 길이 재기(m·cm) 탐험관 시험 (docs/math_2-2_length_spec.md): 계산 부품 LengthMCore, 그림 부품 zoomRange, 화면 파일, 퀴즈 자료
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { read, lineCount, assetTags, assertLoadsInOrder, assertRelativeAssets, assertNoInlineStyleOrScript } from './split-rules.mjs';

const JS = 'kids/subjects/math/js/';

function load(files) {
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  for (const f of files) vm.runInContext(read(f), sandbox, { filename: f });
  return sandbox.window;
}
const W = load([`${JS}length_m-core.js`, `${JS}length_m-draw.js`]);
const C = W.LengthMCore;
const D = W.LengthDraw;

function seeded(seed) {
  let s = seed >>> 0 || 1;
  return () => { s = (s * 1103515245 + 12345) >>> 0; return s / 4294967296; };
}

// 화면 글 → cm 값 (「1m 25cm」·「약 3m」·「45cm」). 길이 꼴이 아니면 null
function parseLen(text) {
  const t = String(text).replace(/^약 /, '');
  let m = /^(\d+)m (\d+)cm$/.exec(t);
  if (m) return Number(m[1]) * 100 + Number(m[2]);
  m = /^(\d+)m$/.exec(t);
  if (m) return Number(m[1]) * 100;
  m = /^(\d+)cm$/.exec(t);
  if (m) return Number(m[1]);
  return null;
}
const isLenText = (t) => parseLen(t) !== null;
const KINDS = Object.values(C.LAB_KINDS).flat();
const NO_VALUE = new Set(['compare', 'closest']);

test('표기와 소리: fmt·sayLen·speakText·fmtSplitWrong', () => {
  assert.equal(C.fmt(45), '45cm');
  assert.equal(C.fmt(200), '2m');
  assert.equal(C.fmt(207), '2m 7cm');
  assert.equal(C.fmt(999), '9m 99cm');
  assert.equal(C.sayLen(45), '45센티미터');
  assert.equal(C.sayLen(200), '2미터');
  assert.equal(C.sayLen(207), '2미터 7센티미터');
  assert.equal(C.speakText('1m 20cm + 2m 35cm'), '1미터 20센티미터 더하기 2미터 35센티미터');
  assert.equal(C.speakText('3m 75cm − 1m 40cm'), '3미터 75센티미터 빼기 1미터 40센티미터');
  assert.equal(C.speakText('물건의 길이는 몇 m 몇 cm예요?'), '물건의 길이는 몇 미터 몇 센티미터예요?');
  assert.equal(C.speakText('양팔로 3번 잰 길이는?'), '양팔로 세 번 잰 길이는?');
  assert.equal(C.speakText('약 3m'), '약 3미터');
  assert.equal(C.speakText('🐰 토끼'), '토끼');
  assert.equal(C.fmtSplitWrong(137), '13m 7cm');
  assert.deepEqual({ ...C.split(207) }, { m: 2, cm: 7 });
  assert.equal(C.toCm(2, 7), 207);
  for (let n = 1; n <= 999; n += 1) {
    assert.equal(parseLen(C.fmt(n)), n, `fmt(${n}) 되읽기`);
    assert.doesNotMatch(C.fmt(n), /(^| )0(m|cm)/, `fmt(${n})에 0 단위 없음`);
  }
});

test('문제 seed 300개: 질문 25자·보기 2개(정답·서로와 글자도 값도 다름)·범위 1~999', () => {
  for (let seed = 1; seed <= 300; seed += 1) {
    for (const kind of KINDS) {
      const rng = seeded(seed * 31 + kind.length);
      const p = C.makeProblem(kind, rng);
      const tag = `${kind} seed ${seed}`;
      assert.equal(p.kind, kind, tag);
      assert.ok(p.question.length <= 25, `${tag} 질문 ${p.question.length}자: ${p.question}`);
      assert.equal(typeof p.speak, 'string', `${tag} speak`);
      assert.doesNotMatch(p.speak, /\d(m|cm)\b|○| \+ | − /, `${tag} 읽는 글에 기호·단위 글자: ${p.speak}`);
      assert.equal(typeof p.fact, 'string', `${tag} fact`);
      if (!NO_VALUE.has(kind)) {
        assert.ok(Number.isInteger(p.answerValue) && p.answerValue >= 1 && p.answerValue <= 999, `${tag} 정답 값 ${p.answerValue}`);
        if (kind !== 'unit-pick') assert.equal(parseLen(p.answerText), p.answerValue, `${tag} 정답 글·값 일치 ${p.answerText}`);
      }
      const w = C.wrongChoices(p);
      assert.equal(w.length, 2, `${tag} 오답 2개`);
      const texts = [p.answerText, w[0].text, w[1].text];
      assert.equal(new Set(texts).size, 3, `${tag} 글자 겹침 ${texts}`);
      if (!NO_VALUE.has(kind)) {
        const vals = [p.answerValue, parseLen(w[0].text) ?? w[0].value, parseLen(w[1].text) ?? w[1].value];
        assert.equal(new Set(vals).size, 3, `${tag} 값 겹침 ${texts}`);
      }
      for (const c of w) {
        assert.ok(typeof c.mistake === 'string' && c.mistake, `${tag} mistake`);
        assert.doesNotMatch(c.text, /(^| )0(m|cm)/, `${tag} 0 단위 ${c.text}`);
        if (c.mistake === 'split-wrong' || kind === 'unit-pick' || NO_VALUE.has(kind)) continue;
        const v = parseLen(c.text);
        assert.ok(v !== null && v >= 1 && v <= 999, `${tag} 오답 범위 ${c.text}`);
      }
    }
  }
});

test('종류별 제약: 줄자·바꾸기·합과 차·비교·어림', () => {
  const seen = { trap: 0, 'cm-longer': 0, equal: 0 };
  for (let seed = 1; seed <= 300; seed += 1) {
    const rng = seeded(seed);
    const mk = (k) => C.makeProblem(k, rng);
    let p = mk('tape-cm');
    assert.ok(p.len >= 101 && p.len <= 199 && p.len % 10 !== 0, `tape-cm ${p.len}`);
    assert.ok([200, 300].includes(p.max) && p.max > p.len);
    p = mk('tape-mcm');
    assert.ok(p.len >= 111 && p.len <= 299 && p.len % 10 !== 0 && p.len % 100 >= 11, `tape-mcm ${p.len}`);
    p = mk('tape-zero');
    assert.ok((p.len >= 101 && p.len <= 109) || (p.len >= 201 && p.len <= 209), `tape-zero ${p.len}`);
    p = mk('cm-to-m');
    assert.ok(p.len >= 111 && p.len <= 299 && p.len % 10 !== 0 && p.len % 100 >= 11, `cm-to-m ${p.len}`);
    assert.notEqual(Math.floor(p.len / 10) % 10, p.len % 10, `cm-to-m 십≠일 ${p.len}`);
    for (const k of ['add', 'sub', 'word']) {
      p = mk(k);
      const a = C.split(p.a), b = C.split(p.b);
      assert.ok(a.m >= 1 && a.cm >= 1 && b.m >= 1 && b.cm >= 1, `${k} 두 길이 m·cm ≥ 1`);
      const op = k === 'word' ? p.op : (k === 'add' ? '+' : '-');
      if (op === '+') {
        assert.ok(a.cm + b.cm <= 99 && a.m + b.m <= 9, `${k} 받아올림 없음`);
        assert.equal(p.answerValue, p.a + p.b);
      } else {
        assert.ok(a.m > b.m && a.cm > b.cm, `${k} 받아내림 없음`);
        assert.equal(p.answerValue, p.a - p.b);
      }
      // 정답과 m만 같은 보기와 cm만 같은 보기가 함께 나오지 않음 (많이 나온 숫자로 찍기 금지)
      const ans = C.split(p.answerValue);
      const ws = C.wrongChoices(p).map((c) => C.split(parseLen(c.text)));
      const sameM = ws.filter((x) => x.m === ans.m && x.cm !== ans.cm).length;
      const sameCm = ws.filter((x) => x.cm === ans.cm && x.m !== ans.m).length;
      assert.ok(!(sameM && sameCm), `${k} 찍기 틈 ${C.fmt(p.answerValue)}`);
      if (k === 'word') assert.ok(p.fact && p.story, 'word 이야기');
    }
    p = mk('compare');
    seen[p.type] += 1;
    const big = Math.max(p.a, p.b), small = Math.min(p.a, p.b);
    if (p.type === 'equal') assert.equal(p.a, p.b);
    else assert.notEqual(p.a, p.b);
    if (p.type === 'cm-longer') assert.ok(big - small <= 30, 'cm 쪽이 긺: 차이 30 이하');
    assert.equal(p.answerText, p.a > p.b ? '>' : p.a < p.b ? '<' : '=');
    assert.deepEqual(new Set([p.aText, p.bText].map(parseLen)), new Set([p.a, p.b]));
    p = mk('closest');
    assert.ok(p.real % 10 === 0 && p.real >= 120 && p.real <= 280, `closest 실제 ${p.real}`);
    const diffs = p.guesses.map((g) => Math.abs(g.len - p.real));
    for (const g of p.guesses) assert.ok(g.len % 10 === 0 && g.len >= 120 && g.len <= 280);
    const sorted = [...diffs].sort((x, y) => x - y);
    assert.equal(new Set(diffs).size, 3, 'closest 차이 서로 다름');
    assert.ok(sorted[0] >= 10 && sorted[0] <= 20 && sorted[1] >= sorted[0] + 20, `closest 차이 ${diffs}`);
    const best = p.guesses[diffs.indexOf(sorted[0])];
    assert.equal(p.answerText, `${best.emoji} ${best.name}`);
    p = mk('body-ruler');
    assert.ok(p.n >= 2 && p.n <= 5 && p.answerText === `약 ${p.n}m`);
  }
  for (const [k, v] of Object.entries(seen)) assert.ok(v > 50, `compare ${k} ${v}번`);
  for (const it of C.UNIT_ITEMS) assert.ok(it.q.length <= 25, `물건 질문 ${it.q}`);
});

test('한 판·빙고·리본', () => {
  for (let seed = 1; seed <= 200; seed += 1) {
    const rng = seeded(seed);
    for (const lab of [1, 2, 3, 4, 5]) {
      const r = C.makeRound(lab, rng);
      assert.deepEqual(r.map((p) => p.kind), C.LAB_KINDS[lab]);
    }
    const bingo = C.makeBingo(rng);
    assert.equal(bingo.length, 9);
    assert.equal(new Set(bingo.map((p) => p.answerText)).size, 9, '빙고 답 글자 다름');
    assert.equal(new Set(bingo.map((p) => p.answerValue)).size, 9, '빙고 답 값 다름');
    for (const p of bingo) {
      assert.ok(C.BINGO_KINDS.includes(p.kind));
      assert.ok(p.answerText.length <= 7, `빙고 답 ${p.answerText}`);
      assert.ok(p.call && p.speak, '빙고 call·speak');
      assert.doesNotMatch(p.speak, /\d(m|cm)\b| \+ | − /, `빙고 읽는 글 ${p.speak}`);
    }
    const rb = C.makeRibbon(rng);
    assert.ok(rb.target % 10 === 0 && rb.target >= 30 && rb.target <= 390);
    assert.ok(Math.floor(rb.target / 100) + Math.floor(rb.target / 10) % 10 <= 8, `리본 누름 ${rb.target}`);
    assert.equal(rb.text, `리본 ${C.fmt(rb.target)} 주세요`);
  }
  assert.equal(C.ribbonPress(140, 'm'), 240);
  assert.equal(C.ribbonPress(140, 't'), 150);
  assert.equal(C.ribbonPress(350, 'm'), 350, '400 넘으면 그대로');
  assert.equal(C.ribbonPress(400, 't'), 400);
  assert.equal(C.ribbonFeedback(140, 140).ok, true);
  assert.equal(C.ribbonFeedback(160, 140).text, '주문보다 20cm 길어요');
  assert.equal(C.ribbonFeedback(30, 140).text, '주문보다 1m 10cm 짧아요');
});

test('그림 부품: zoomRange는 0~max 안 30cm', () => {
  const cases = [[5, 200, 0, 30], [137, 200, 120, 150], [199, 200, 170, 200], [205, 300, 190, 220], [299, 300, 270, 300]];
  for (const [len, max, from, to] of cases) assert.deepEqual({ ...D.zoomRange(len, max) }, { from, to }, `${len}/${max}`);
  for (let len = 1; len < 300; len += 1) {
    const max = len < 200 ? 200 : 300;
    const z = D.zoomRange(len, max);
    assert.ok(z.from >= 0 && z.to <= max && z.to - z.from === 30 && len >= z.from && len <= z.to, `${len}`);
  }
});

test('화면 파일: 실림 순서·상대 경로·인라인 없음·줄 수·대문 카드·퀴즈 2-2', () => {
  const file = 'kids/subjects/math/length_m.html';
  const html = read(file);
  const js = ['math_explorer-shell', 'math_squishy', 'math_explorer-quiz', 'math_explorer-ladder', 'math_bingo', 'length_m-core', 'length_m-draw', 'length_m-labs'];
  assertLoadsInOrder(html, 'script', js.map((j) => `./js/${j}.js`), 'length_m');
  assertLoadsInOrder(html, 'style', ['../../css/math_explorer.css', '../../css/math_length_m.css'], 'length_m');
  assertRelativeAssets(file, 'script', assetTags(html, 'script').map((t) => t.src));
  assertRelativeAssets(file, 'style', assetTags(html, 'style').filter((t) => !/^https?:/.test(t.src)).map((t) => t.src));
  assertNoInlineStyleOrScript(html, 'length_m');
  assert.match(html, /<body class="[^"]*\bmx-theme-lenm\b[^"]*\bmx-grade2\b/);
  assert.match(html, /href="length_time\.html"/, '위 계단 칩');
  assert.equal(read('kids/subjects/math/math.html').split('href="length_m.html"').length - 1, 2, '수학 대문 두 곳에 카드');
  for (const f of [`${JS}length_m-core.js`, `${JS}length_m-draw.js`, `${JS}length_m-labs.js`, 'kids/css/math_length_m.css', file]) {
    assert.ok(lineCount(f) < 800, `${f} 800줄 미만`);
  }
  const labs = read(`${JS}length_m-labs.js`);
  assert.match(labs, /grade:\s*'2-2'/);
  assert.match(labs, /unit:\s*'3\. 길이 재기'/);
  assert.match(labs, /sayQuestion:\s*true/);
  assert.match(labs, /speakText:\s*CORE\.speakText/, '퀴즈 배틀 질문도 m·cm를 미터·센티미터로 읽음');
  assert.match(labs, /rememberTab:\s*true/);
  assert.doesNotMatch(labs, /speechSynthesis/);
});

test('2-2 퀴즈 자료 12제: 3지선다·단원 원문·정답 검산·길이 범위·보기 번호 표현 없음', () => {
  const data = JSON.parse(read('scripts/data/curriculum/math_2-2_3.json'));
  assert.equal(data.subject, '수학');
  assert.equal(data.grade, '2-2');
  assert.equal(data.unit, '3. 길이 재기');
  assert.equal(data.items.length, 12);
  const counts = { 1: 0, 2: 0, 3: 0 };
  for (const it of data.items) {
    assert.equal(it.zone, '탐구퀴즈');
    assert.equal(it.choices.length, 3, it.title);
    assert.equal(new Set(it.choices).size, 3, it.title);
    counts[it.answer] += 1;
    assert.doesNotMatch(it.explanation, /[1-3]번(은|보기)|[1-3]번이 (정답|답)/, `${it.title} 보기 번호`);
    assert.ok(it.question.length <= 40, `${it.title} 질문 길이`);
    assert.doesNotMatch(C.speakText(it.question), /\d(m|cm)\b| − |\bc?m\b/, `${it.title} 읽는 글`);
    const vals = it.choices.map(parseLen).filter((v) => v !== null);
    if (vals.length === 3) assert.equal(new Set(vals).size, 3, `${it.title} 같은 값 다른 표기`);
  }
  assert.deepEqual(counts, { 1: 4, 2: 4, 3: 4 });
});
