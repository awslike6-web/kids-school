// 2-2 표와 그래프 탐험관 시험 (docs/math_2-2_graph_spec.md): 계산 부품 TableGraphCore, 그림 부품 순수 함수, 화면 파일, 퀴즈 자료
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
const W = load([`${JS}table_graph-core.js`, `${JS}table_graph-draw.js`]);
const C = W.TableGraphCore;
const D = W.TableGraphDraw;

function seeded(seed) {
  let s = seed >>> 0 || 1;
  return () => { s = (s * 1103515245 + 12345) >>> 0; return s / 4294967296; };
}

const KINDS = [...new Set(Object.values(C.LAB_KINDS).flat())];
const EMOJI = /[\uD83C-\uD83E][\uDC00-\uDFFF]|[☀-➿⬀-⯿]|️/;
const MARKS = /[□○×/:]/;
const TOOLS = ['조사한 자료', '표', '그래프'];
const numOf = (t) => { const r = /^(\d+)(명|개|가지|칸)$/.exec(String(t)); return r ? { n: Number(r[1]), u: r[2] } : null; };
const sum = (a) => a.reduce((x, y) => x + y, 0);
const maxOf = (a) => Math.max(...a);
const minOf = (a) => Math.min(...a);
const uniq = (a, v) => a.filter((x) => x === v).length === 1;
const labelsOf = (d) => [...d.kinds].map((k) => k.label);

test('표기: josa·markWord·speakText·주제 표·그림 부품 순수 함수', () => {
  for (const [w, p, j] of [['사과', '은/는', '는'], ['귤', '은/는', '은'], ['곰', '을/를', '을'], ['여우', '을/를', '를'], ['바나나', '과/와', '와'], ['귤', '과/와', '과'], ['딸기', '이/가', '가']]) {
    assert.equal(C.josa(w, p), j, `${w} ${p}`);
  }
  assert.equal(C.markWord('○'), '동그라미');
  assert.equal(C.speakText('🍓 딸기 칸에 ○를 그려요'), '딸기 칸에 동그라미를 그려요');
  assert.equal(C.speakText('□에 알맞은 수는?'), '빈칸에 알맞은 수는?');
  assert.doesNotMatch(C.speakText('☀️ 여름과 ⛄ 겨울'), EMOJI);
  const ids = [...C.TOPICS].map((t) => t.id);
  for (const id of ['fruit', 'animal', 'color', 'sport', 'snack', 'season', 'basket']) assert.ok(ids.includes(id), id);
  const allLabels = [];
  for (const t of C.TOPICS) {
    assert.ok(/[가-힣]$/.test(t.word) && (t.word.charCodeAt(t.word.length - 1) - 0xac00) % 28 !== 0, `${t.id} word 받침`);
    for (const k of t.kinds) {
      assert.ok(k.label.length >= 1 && k.label.length <= 3, `${t.id} ${k.label}`);
      if (t.id !== 'basket') allLabels.push(k.label);
    }
    if (t.id !== 'season') assert.equal(t.kinds.length, 5, `${t.id} 5가지`);
  }
  assert.ok(!allLabels.includes('배'), '배 같은 소리 이름 없음');
  assert.ok(!C.FRIENDS.includes('민수') && !C.FRIENDS.includes('민서'), '아이 이름 금지');
  assert.equal(new Set(C.FRIENDS).size, C.FRIENDS.length);
  assert.deepEqual({ ...D.cellFor('v', 2, 0, 6) }, { x: 2, y: 5 });
  assert.deepEqual({ ...D.cellFor('v', 0, 5, 6) }, { x: 0, y: 0 });
  assert.deepEqual({ ...D.cellFor('h', 1, 3, 6) }, { x: 3, y: 1 });
  assert.deepEqual({ ...D.cellFor('h', 0, 0, 5) }, { x: 0, y: 0 });
  assert.equal(D.tapResult(3, 3), 'add');
  assert.equal(D.tapResult(3, 2), 'erase');
  assert.equal(D.tapResult(3, 5), 'gap');
  assert.equal(D.tapResult(3, 0), 'gap');
  assert.equal(D.tapResult(0, 0), 'add');
  assert.deepEqual({ ...C.drawFeedback(2, 4) }, { ok: false, diff: 2, text: '○ 2개 더 그려요' });
  assert.equal(C.drawFeedback(5, 4).text, '○ 1개 지워요');
  assert.equal(C.drawFeedback(3, 3).ok, true);
});

test('문제 seed 300개: 질문 25자·읽는 글·보기 2개(정답·서로와 다름·1 이상·같은 단위)·힌트', () => {
  for (let seed = 1; seed <= 300; seed += 1) {
    const rng = seeded(seed);
    for (const kind of KINDS) {
      const p = C.makeProblem(kind, rng);
      const tag = `${kind} seed ${seed}: ${p.question}`;
      assert.equal(p.kind, kind);
      assert.ok(p.question.length <= 25, `질문 길이 ${tag}`);
      assert.doesNotMatch(p.question, EMOJI, `질문 이모지 ${tag}`);
      assert.doesNotMatch(p.speak, EMOJI, `읽는 글 이모지 ${tag}`);
      assert.doesNotMatch(p.speak, MARKS, `읽는 글 기호 ${tag} → ${p.speak}`);
      assert.equal(p.speak, C.speakText(p.fact ? `${p.fact} ${p.question}` : p.question));
      if (kind === 'draw-col') continue;
      const w = [...C.wrongChoices(p)];
      assert.equal(w.length, 2, `오답 2개 ${tag}`);
      const texts = [p.answerText, ...w.map((x) => x.text)];
      assert.equal(new Set(texts).size, 3, `보기 겹침 ${tag} ${texts}`);
      const a = numOf(p.answerText);
      for (const x of w) {
        assert.ok(x.mistake, `mistake ${tag}`);
        const h = C.hintFor(p, x.mistake, x.text);
        assert.ok(h && h.length <= 24, `힌트 ${tag} ${x.mistake} ${h}`);
        if (a) {
          const b = numOf(x.text);
          assert.ok(b && b.u === a.u && b.n >= 1, `수 보기 ${tag} ${x.text}`);
        }
      }
      if (a) assert.ok(a.n >= 1, `정답 1 이상 ${tag}`);
      if (kind === 'which-easy') assert.deepEqual([...texts].sort(), [...TOOLS].sort());
    }
  }
});

test('종류별 제약: 자료 범위·하나뿐·조사 자료·그래프 칸·기준 값', () => {
  let midDiff = 0; let midBlank = 0; let hSeen = 0; let vSeen = 0;
  for (let seed = 1; seed <= 300; seed += 1) {
    const rng = seeded(seed);
    for (const kind of KINDS) {
      const p = C.makeProblem(kind, rng);
      const tag = `${kind} seed ${seed}`;
      const d = p.data;
      if (d) {
        const v = [...d.values];
        assert.equal(sum(v), d.total, `합계 ${tag}`);
        assert.ok(d.total <= 20, `합계 20 이하 ${tag}`);
        assert.ok(v.every((x) => x >= 1 && x <= 6), `값 1~6 ${tag} ${v}`);
        assert.ok(v.length === 3 || v.length === 4, `종류 3~4 ${tag}`);
      }
      if (p.rows !== undefined) {
        assert.ok(p.rows === 5 || p.rows === 6, `rows ${tag}`);
        assert.ok(p.rows >= maxOf([...d.values]), `rows ≥ 가장 큰 값 ${tag}`);
        assert.ok(['○', '×', '/'].includes(p.mark), `mark ${tag}`);
        if (p.orient === 'h') hSeen += 1; else if (p.orient === 'v') vSeen += 1;
      }
      const v = d ? [...d.values] : [];
      const names = d ? labelsOf(d) : [];
      if (kind === 'count-kind') {
        const cards = [...p.cards];
        assert.ok(cards.length >= 8 && cards.length <= 10, `카드 수 ${tag}`);
        const label = typeof p.target === 'number' ? p.data.kinds[p.target].label : p.target;
        const n = cards.filter((c) => c.label === label).length;
        assert.equal(`${n}개`, p.answerText, `카드 개수 ${tag}`);
        assert.ok(n >= 1 && n <= 5);
      }
      if (kind === 'table-blank') {
        assert.equal(p.answerText, `${v[p.blank]}명`);
        const others = sum(v) - v[p.blank];
        const w = [...C.wrongChoices(p)].map((x) => numOf(x.text).n);
        if (w.some((x) => x < v[p.blank])) midBlank += 1;
        assert.ok(others >= 1);
      }
      if (kind.startsWith('survey-')) {
        const s = [...p.survey];
        assert.ok(s.length >= 7 && s.length <= 9, `조사 자료 수 ${tag}`);
        assert.equal(new Set(s.map((x) => x.name)).size, s.length, `이름 겹침 ${tag}`);
        assert.ok(s.every((x) => C.FRIENDS.includes(x.name)));
        const counts = {};
        for (const x of s) counts[x.kind] = (counts[x.kind] || 0) + 1;
        const cv = Object.values(counts);
        assert.equal(cv.length, 3, `조사 종류 3가지 ${tag}`);
        if (kind === 'survey-who') {
          assert.equal(cv.filter((x) => x === 1).length, 1, `딱 한 명인 종류 하나 ${tag}`);
          const who = s.filter((x) => counts[x.kind] === 1);
          assert.equal(p.answerText, who[0].name);
          for (const w of C.wrongChoices(p)) assert.ok(s.some((x) => x.name === w.text && counts[x.kind] > 1), `오답 이름 ${tag}`);
        }
        if (kind === 'survey-most') {
          assert.ok(uniq(cv, maxOf(cv)) && uniq(cv, minOf(cv)), `가장 많은·적은 하나뿐 ${tag}`);
        }
      }
      if (kind === 'graph-count') {
        const n = numOf(p.answerText).n;
        if (n === p.rows) assert.ok(![...C.wrongChoices(p)].some((x) => x.mistake === 'next-cell'), `칸 넘는 next-cell ${tag}`);
      }
      if (kind === 'graph-most' || kind === 'most-least-diff') {
        assert.ok(uniq(v, maxOf(v)) && uniq(v, minOf(v)), `가장 많은·적은 하나뿐 ${tag} ${v}`);
      }
      if (kind === 'graph-most') {
        const want = p.most ? names[v.indexOf(maxOf(v))] : names[v.indexOf(minOf(v))];
        assert.equal(p.answerText, want, tag);
        for (const w of C.wrongChoices(p)) assert.ok(names.includes(w.text));
      }
      if (kind === 'graph-diff') {
        assert.ok(v[p.a] > v[p.b], `A > B ${tag}`);
        assert.equal(p.answerText, `${v[p.a] - v[p.b]}명`);
        if ([...C.wrongChoices(p)].some((x) => numOf(x.text).n < v[p.a] - v[p.b])) midDiff += 1;
      }
      if (kind === 'draw-col') {
        assert.equal(p.mark, '○');
        assert.ok(v[p.col] >= 1 && v[p.col] <= 5, `목표 1~5 ${tag}`);
        assert.equal(p.answerText, `${v[p.col]}개`);
      }
      if (kind === 'graph-rows') assert.equal(p.answerText, `${maxOf(v)}칸`);
      if (kind === 'more-than') {
        assert.ok(p.base < maxOf(v) && v.includes(p.base), `기준 ${tag}`);
        assert.equal(p.answerText, `${v.filter((x) => x > p.base).length}가지`);
      }
      if (kind === 'most-least-diff') assert.equal(p.answerText, `${maxOf(v) - minOf(v)}명`);
    }
  }
  assert.ok(midDiff > 30, `차 문제 정답이 늘 가장 작은 보기는 아님 (${midDiff})`);
  assert.ok(midBlank > 30, `빈칸 문제 정답이 늘 가장 작은 보기는 아님 (${midBlank})`);
  assert.ok(hSeen > 100 && vSeen > 100, '세로·가로 그래프 둘 다');
});

test('한 판·투표·빙고', () => {
  for (let seed = 1; seed <= 200; seed += 1) {
    const rng = seeded(seed);
    for (const lab of [1, 2, 3, 4, 5]) {
      const round = [...C.makeRound(lab, rng)];
      assert.deepEqual(round.map((p) => p.kind), [...C.LAB_KINDS[lab]]);
      if (lab === 4) assert.deepEqual([round[0].orient, round[1].orient], ['v', 'h'], '4관 세로·가로');
    }
    const vote = C.makeVote(rng);
    const votes = [...vote.votes];
    assert.ok(votes.length >= 6 && votes.length <= 8, `투표 수 seed ${seed}`);
    assert.ok(vote.kinds.length >= 3 && vote.kinds.length <= 4);
    assert.equal(new Set(votes.map((x) => x.name)).size, votes.length, '투표 이름 겹침');
    const cnt = vote.kinds.map((_, i) => votes.filter((x) => x.kind === i).length);
    assert.ok(cnt.every((x) => x <= 5), `한 종류 5표 이하 ${cnt}`);
    assert.ok(uniq(cnt, maxOf(cnt)), `가장 많은 것 하나뿐 ${cnt}`);
    assert.equal(vote.answer, cnt.indexOf(maxOf(cnt)));
    votes.forEach((x, i) => {
      assert.doesNotMatch(vote.speakCards[i], EMOJI);
      assert.doesNotMatch(vote.speakCards[i], /:/);
      assert.ok(vote.speakCards[i].startsWith(x.name));
    });
    const fb = C.voteFeedback(0, 1, vote.kinds);
    assert.equal(fb.ok, false);
    assert.equal(fb.text, `${vote.kinds[0].label} 칸에 그려요`);
    assert.equal(C.voteFeedback(2, 2, vote.kinds).ok, true);

    const b = C.makeBingo(rng);
    const v = [...b.data.values];
    assert.equal(v.length, 5);
    assert.equal(new Set(v).size, 5, '빙고 값 모두 다름');
    assert.ok(v.every((x) => x >= 1 && x <= 9) && sum(v) <= 30, `빙고 표 ${v}`);
    const probs = [...b.problems];
    assert.equal(probs.length, 9);
    assert.equal(new Set(probs.map((p) => p.answerText)).size, 9, `빙고 답 다름 ${probs.map((p) => p.answerText)}`);
    assert.equal(probs.filter((p) => p.kind === 'bingo-count').length, 5);
    assert.equal(probs.filter((p) => p.kind === 'bingo-total').length, 1);
    for (const p of probs) {
      assert.ok(p.call.length <= 25, `빙고 call ${p.call}`);
      assert.doesNotMatch(p.speak, EMOJI);
      assert.ok(numOf(p.answerText)?.u === '명', p.answerText);
    }
    assert.ok(probs.some((p) => p.kind === 'bingo-total' && p.answerText === `${sum(v)}명`));
  }
});

test('화면 파일: 실림 순서·상대 경로·인라인 없음·줄 수·대문 카드·퀴즈 2-2', () => {
  const file = 'kids/subjects/math/table_graph.html';
  const html = read(file);
  const js = ['math_explorer-shell', 'math_squishy', 'math_explorer-quiz', 'math_explorer-ladder', 'math_bingo', 'table_graph-core', 'table_graph-draw', 'table_graph-labs'];
  assertLoadsInOrder(html, 'script', js.map((j) => `./js/${j}.js`), 'table_graph');
  assertLoadsInOrder(html, 'style', ['../../css/math_explorer.css', '../../css/math_table_graph.css'], 'table_graph');
  assertRelativeAssets(file, 'script', assetTags(html, 'script').map((t) => t.src));
  assertRelativeAssets(file, 'style', assetTags(html, 'style').filter((t) => !/^https?:/.test(t.src)).map((t) => t.src));
  assertNoInlineStyleOrScript(html, 'table_graph');
  assert.match(html, /<body class="[^"]*\bmx-theme-graph2\b[^"]*\bmx-grade2\b/);
  assert.match(html, /href="bar_line\.html"/, '위 계단 칩');
  assert.equal(read('kids/subjects/math/math.html').split('href="table_graph.html"').length - 1, 2, '수학 대문 두 곳에 카드');
  for (const f of [`${JS}table_graph-core.js`, `${JS}table_graph-draw.js`, `${JS}table_graph-labs.js`, 'kids/css/math_table_graph.css', file]) {
    assert.ok(lineCount(f) < 800, `${f} 800줄 미만`);
  }
  const labs = read(`${JS}table_graph-labs.js`);
  assert.match(labs, /grade:\s*'2-2'/);
  assert.match(labs, /unit:\s*'5\. 표와 그래프'/);
  assert.match(labs, /sayQuestion:\s*true/);
  assert.match(labs, /rememberTab:\s*true/);
  assert.doesNotMatch(labs, /speechSynthesis/);
});

test('2-2 퀴즈 자료 12제: 3지선다·단원 원문·보기 번호 표현 없음·정답 번호 고르게', () => {
  const data = JSON.parse(read('scripts/data/curriculum/math_2-2_5.json'));
  assert.equal(data.subject, '수학');
  assert.equal(data.grade, '2-2');
  assert.equal(data.unit, '5. 표와 그래프');
  assert.equal(data.items.length, 12);
  const counts = { 1: 0, 2: 0, 3: 0 };
  for (const it of data.items) {
    assert.equal(it.zone, '탐구퀴즈');
    assert.equal(it.choices.length, 3, it.title);
    assert.equal(new Set(it.choices).size, 3, it.title);
    counts[it.answer] += 1;
    assert.doesNotMatch(it.explanation, /\d번/, `${it.title} 숫자+번`);
    assert.ok(it.question.length <= 45, `${it.title} 질문 길이`);
    assert.doesNotMatch(JSON.stringify(it), /민수|민서/);
  }
  assert.deepEqual(counts, { 1: 4, 2: 4, 3: 4 });
});
