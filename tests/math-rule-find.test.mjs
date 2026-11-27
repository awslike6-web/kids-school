// 2-2 규칙 찾기 탐험관 시험 (docs/math_2-2_rule_spec.md): 계산 부품 RuleFindCore, 그림 부품 실림, 화면 파일, 퀴즈 자료
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
const W = load([`${JS}rule_find-core.js`, `${JS}rule_find-draw.js`]);
const C = W.RuleFindCore;

function seeded(seed) {
  let s = seed >>> 0 || 1;
  return () => { s = (s * 1103515245 + 12345) >>> 0; return s / 4294967296; };
}

const KINDS = [...new Set(Object.values(C.LAB_KINDS).flat())];
const EMOJI = /[\uD83C-\uD83E][\uDC00-\uDFFF]|[☀-➿⬀-⯿]|️/;
const SIGNS = /[□★→↓↘↙]/;
const ARROWS = [...C.ARROWS];
const numOf = (t) => { const r = /^(\d+)(개씩|개|씩 커져요|일)?$/.exec(String(t)); return r ? { n: Number(r[1]), u: r[2] || '' } : null; };
const consecutive = (a) => a.every((x, i) => i === 0 || x === a[i - 1] + 1);
const setOf = (emoji) => [...C.ITEM_SETS].find((s) => s.items.some((it) => it.emoji === emoji));
const shapeOf = (emoji) => {
  for (const sh of ['circle', 'square']) for (const [col, e] of Object.entries(C.SHAPES[sh])) if (e === emoji) return { sh, col };
  return null;
};

test('표기: josa·josaNum·speakText·자료 표', () => {
  for (const [w, p, j] of [['사과', '은/는', '는'], ['귤', '은/는', '은'], ['곰', '과/와', '과'], ['토끼', '과/와', '와']]) assert.equal(C.josa(w, p), j, `${w} ${p}`);
  for (const [n, j] of [[7, '과'], [3, '과'], [2, '와'], [10, '과'], [4, '와'], [1, '과'], [6, '과'], [8, '과'], [5, '와'], [9, '와'], [12, '와'], [36, '과']]) {
    assert.equal(C.josaNum(n, '과/와'), j, `josaNum ${n}`);
  }
  assert.equal(C.speakText('□ 칸에 알맞은 수는?'), '빈칸에 알맞은 수는?');
  assert.equal(C.speakText('★ 칸에 알맞은 수는?'), '별 칸에 알맞은 수는?');
  assert.equal(C.speakText('↘ 방향으로 칠했어요'), '오른쪽 아래 방향으로 칠했어요');
  assert.equal(C.speakText('↙ 방향'), '왼쪽 아래 방향');
  assert.equal(C.speakText('3 × 6과 곱한 값'), '3 곱하기 6과 곱한 값');
  assert.equal(C.speakText('⬆️ ➡️ 🍎 다음'), '다음');
  assert.equal(ARROWS.length, 4);
  assert.deepEqual([...C.TILES], ['🟥', '🟨', '🟦', '🟩', '🟪']);
  assert.deepEqual([...C.UNITS], ['ABB', 'AAB', 'ABC', 'AABB', 'ABCC']);
  for (const s of C.ITEM_SETS) {
    assert.equal(s.items.length, 5);
    assert.equal(new Set(s.items.map((x) => x.emoji)).size, 5);
  }
  for (const st of C.STACKS) {
    for (let n = 1; n <= 5; n += 1) {
      const h = [...st.shape(n)];
      assert.equal(h.reduce((a, b) => a + b, 0), st.a + (n - 1) * st.d, `${st.id} ${n}`);
    }
  }
  assert.deepEqual([...C.STACKS].map((s) => s.id), ['line1', 'ell', 'twin', 'tower3']);
  for (const k of Object.keys(C.HINTS)) assert.ok(C.HINTS[k].length <= 20, `힌트 길이 ${k}`);
});

test('문제 seed 300개: 질문 25자·읽는 글·보기 2개(정답·서로와 다름·수 범위)·힌트', () => {
  for (let seed = 1; seed <= 300; seed += 1) {
    const rng = seeded(seed);
    for (const kind of KINDS) {
      const p = C.makeProblem(kind, rng);
      const tag = `${kind} seed ${seed}: ${p.question}`;
      assert.equal(p.kind, kind);
      assert.ok(p.question.length <= 25, `질문 길이 ${tag}`);
      assert.doesNotMatch(p.question.replace(/★/g, ''), EMOJI, `질문 이모지 ${tag}`);
      assert.doesNotMatch(p.speak, EMOJI, `읽는 글 이모지 ${tag}`);
      assert.doesNotMatch(p.speak, SIGNS, `읽는 글 기호 ${tag} → ${p.speak}`);
      assert.equal(p.speak, C.speakText(p.fact ? `${p.fact}. ${p.question}` : p.question));
      assert.equal(typeof p.fact, 'string');
      const w = [...C.wrongChoices(p)];
      assert.equal(w.length, 2, `오답 2개 ${tag}`);
      const texts = [p.answerText, ...w.map((x) => x.text)];
      assert.equal(new Set(texts).size, 3, `보기 겹침 ${tag} ${texts}`);
      const a = numOf(p.answerText);
      for (const x of w) {
        assert.ok(C.HINTS[x.mistake], `mistake ${tag} ${x.mistake}`);
        assert.equal(C.hintFor(p, x.mistake), C.HINTS[x.mistake]);
        if (a && kind !== 'add-dir') {
          const b = numOf(x.text);
          assert.ok(b && b.u === a.u, `같은 단위 ${tag} ${x.text}`);
          assert.ok(b.n >= (kind === 'add-blank' ? 0 : 1), `수 범위 ${tag} ${x.text}`);
          if (kind === 'cal-week') assert.ok(b.n >= 1 && b.n <= 31, `날짜 ${tag} ${x.text}`);
        }
      }
    }
  }
});

test('종류별 제약: 무늬·쌓기·덧셈표·곱셈표·달력·자리', () => {
  const units = new Set(); const dirs = new Set(); const fams = new Set();
  for (let seed = 1; seed <= 300; seed += 1) {
    const rng = seeded(seed);
    for (const kind of KINDS) {
      const p = C.makeProblem(kind, rng);
      const tag = `${kind} seed ${seed}`;
      const w = [...C.wrongChoices(p)];
      if (kind === 'pattern-next') {
        const L = p.unit.length; const seq = [...p.seq];
        units.add(p.unit);
        assert.ok(seq.length >= Math.max(8, 2 * L) && seq.length <= 9, `칸 수 ${tag} ${seq.length}`);
        seq.forEach((x, i) => { if (i >= L) assert.equal(x, seq[i - L], `되풀이 ${tag}`); });
        const letters = [...new Set(p.unit)];
        const emojis = letters.map((ch) => seq[p.unit.indexOf(ch)]);
        assert.equal(new Set(emojis).size, letters.length, `글자마다 다른 이모지 ${tag}`);
        assert.equal(p.answerText, seq[seq.length - L], `다음 칸 ${tag}`);
        const set = setOf(seq[0]);
        assert.ok(seq.every((x) => setOf(x) === set), `한 묶음 ${tag}`);
        for (const x of w) assert.equal(setOf(x.text), set, `보기도 같은 묶음 ${tag}`);
      }
      if (kind === 'pattern-turn') {
        const seq = [...p.seq];
        assert.equal(seq.length, 8);
        seq.forEach((x, i) => { if (i) assert.equal(ARROWS.indexOf(x), (ARROWS.indexOf(seq[i - 1]) + 1) % 4, `시계 방향 ${tag}`); });
        assert.equal(ARROWS.indexOf(p.answerText), (ARROWS.indexOf(seq[7]) + 1) % 4);
        assert.ok(w.every((x) => ARROWS.includes(x.text)));
      }
      if (kind === 'pattern-two') {
        const seq = [...p.seq];
        assert.equal(seq.length, 9);
        assert.ok(p.blank >= 6 && p.blank <= 8, `blank ${tag}`);
        const info = seq.map(shapeOf);
        info.forEach((x, k) => {
          assert.equal(x.sh, info[k % 2].sh, `모양 마디 2 ${tag}`);
          assert.equal(x.col, info[k % 3].col, `색 마디 3 ${tag}`);
        });
        assert.notEqual(info[0].sh, info[1].sh);
        assert.equal(new Set(info.slice(0, 3).map((x) => x.col)).size, 3);
        assert.equal(p.answerText, seq[p.blank]);
        const ans = shapeOf(p.answerText);
        for (const x of w) {
          const s = shapeOf(x.text);
          if (x.mistake === 'color-wrong') assert.ok(s.sh === ans.sh && s.col !== ans.col && info.slice(0, 3).some((i) => i.col === s.col), `색만 틀림 ${tag}`);
          if (x.mistake === 'shape-wrong') assert.ok(s.sh !== ans.sh && s.col === ans.col, `모양만 틀림 ${tag}`);
        }
      }
      if (kind.startsWith('stack-')) {
        fams.add(p.family);
        const shapes = [...p.shapes].map((s) => [...s]);
        assert.equal(shapes.length, kind === 'stack-fifth' ? 4 : 3, `모양 수 ${tag}`);
        shapes.forEach((h, i) => assert.equal(h.reduce((x, y) => x + y, 0), p.a + i * p.d, `개수 ${tag}`));
        assert.ok(shapes[shapes.length - 1].length <= 3 || p.family === 'line1' || p.family === 'ell');
        const cols = shapes.reduce((x, s) => x + s.length, 0);
        assert.ok(cols <= 12, `기둥 합 ${tag}`);
        const want = kind === 'stack-step' ? `${p.d}개씩` : kind === 'stack-next' ? `${p.a + 3 * p.d}개` : `${p.a + 4 * p.d}개`;
        assert.equal(p.answerText, want, tag);
      }
      if (kind.startsWith('add-')) {
        const rows = [...p.rows]; const cols = [...p.cols];
        assert.ok(rows.length === 4 && consecutive(rows) && rows[0] >= 0 && rows[0] <= 5, `rows ${tag}`);
        assert.ok(cols.length === 4 && consecutive(cols) && cols[0] >= 0 && cols[0] <= 5, `cols ${tag}`);
        const v = (r, c) => rows[r] + cols[c];
        if (kind === 'add-blank') assert.equal(p.answerText, String(v(p.star[0], p.star[1])));
        if (kind === 'add-dir') {
          dirs.add(p.dir);
          const m = [...p.marks].map((x) => [...x]);
          const step = { '→': [0, 1], '↓': [1, 0], '↘': [1, 1], '↙': [1, -1] }[p.dir];
          assert.equal(m.length, 3);
          m.forEach(([r, c], i) => {
            assert.ok(r >= 0 && r <= 3 && c >= 0 && c <= 3, `표 안 ${tag}`);
            if (i) assert.deepEqual([r - m[i - 1][0], c - m[i - 1][1]], step, `방향 ${tag}`);
          });
          const d = v(m[1][0], m[1][1]) - v(m[0][0], m[0][1]);
          assert.equal(p.answerText, d === 0 ? '모두 같아요' : `${d}씩 커져요`, tag);
          assert.equal(p.fact, `${p.dir} 방향으로 칠했어요`);
          assert.equal(p.question, '칠한 수는 어떻게 바뀌어요?');
          assert.deepEqual([...texts(p, w)].sort(), ['1씩 커져요', '2씩 커져요', '모두 같아요'].sort());
        }
        if (kind === 'add-diag') {
          assert.deepEqual([...p.blank], [3, 3]);
          assert.equal(p.answerText, String(v(3, 3)));
          assert.equal(Number(p.answerText), v(2, 2) + 2);
        }
      }
      if (kind.startsWith('mul-')) {
        const rows = [...p.rows]; const cols = [...p.cols];
        assert.ok(consecutive(rows) && rows[0] >= 2 && rows[3] <= 9, `rows ${tag}`);
        assert.ok(consecutive(cols) && cols[0] >= 1 && cols[3] <= 9, `cols ${tag}`);
        if (kind === 'mul-step') assert.equal(p.answerText, `${rows[p.row]}씩 커져요`);
        if (kind === 'mul-blank') assert.equal(p.answerText, String(rows[p.star[0]] * cols[p.star[1]]));
        if (kind === 'mul-swap') {
          assert.deepEqual(rows, cols);
          assert.ok(p.a !== p.b && rows.includes(p.a) && rows.includes(p.b), `a·b ${tag}`);
          assert.equal(p.answerText, `${p.b} × ${p.a}`);
          assert.equal(p.question, `${p.a} × ${p.b}${C.josaNum(p.b, '과/와')} 곱한 값이 같은 것은?`);
          for (const x of w) assert.notEqual(evalExpr(x.text), p.a * p.b, `오답 값이 같으면 안 됨 ${tag} ${x.text}`);
        }
      }
      if (kind === 'cal-dir') {
        const m = [...p.marks];
        assert.equal(p.days, 30);
        assert.ok(m.every((d) => d >= 1 && d <= 30), `날짜 ${tag}`);
        if (p.dir === '→') {
          assert.deepEqual(m, [m[0], m[0] + 1, m[0] + 2]);
          assert.ok((p.firstDay + m[0] - 1) % 7 <= 4, `같은 주 ${tag}`);
          assert.equal(p.answerText, '1씩 커져요');
        } else {
          assert.equal(p.dir, '↓');
          assert.deepEqual(m, [m[0], m[0] + 7, m[0] + 14]);
          assert.equal(p.answerText, '7씩 커져요');
        }
      }
      if (kind === 'cal-week') {
        assert.equal(p.days, 31);
        assert.ok(p.first >= 1 && p.first <= 7 && (p.nth === 3 || p.nth === 4));
        assert.equal((p.firstDay + p.first - 1) % 7, p.weekday, `요일 맞음 ${tag}`);
        const date = p.first + 7 * (p.nth - 1);
        assert.equal(p.answerText, `${date}일`);
        assert.ok(date <= 31);
      }
      if (kind === 'seat-blank') {
        assert.ok(p.rowNames.length >= 3 && p.rowNames.length <= 4 && p.perRow >= 5 && p.perRow <= 6);
        assert.ok(p.blank.r >= 1 && p.blank.r < p.rowNames.length && p.blank.c >= 0 && p.blank.c < p.perRow, `blank ${tag}`);
        assert.equal(p.answerText, String(p.blank.r * p.perRow + p.blank.c + 1));
        assert.equal(p.fact, `오른쪽으로 1씩, 아래로 ${p.perRow}씩 커져요`);
      }
    }
  }
  assert.equal(units.size, 5, '마디 꼴 다섯 가지 모두 나옴');
  assert.equal(dirs.size, 4, '덧셈표 방향 네 가지 모두 나옴');
  assert.equal(fams.size, 4, '쌓기 모양 네 가지 모두 나옴');
});

function texts(p, w) { return [p.answerText, ...w.map((x) => x.text)]; }
function evalExpr(t) {
  const m = /^(\d+) ([×+]) (\d+)$/.exec(t);
  if (!m) return NaN;
  return m[2] === '×' ? Number(m[1]) * Number(m[3]) : Number(m[1]) + Number(m[3]);
}

test('한 판·퍼즐·빙고', () => {
  for (let seed = 1; seed <= 200; seed += 1) {
    const rng = seeded(seed);
    for (const lab of [1, 2, 3, 4, 5]) {
      const round = [...C.makeRound(lab, rng)];
      assert.deepEqual(round.map((p) => p.kind), [...C.LAB_KINDS[lab]]);
      if (lab === 2) assert.equal(new Set(round.map((p) => p.family)).size, 1, '2관 한 판은 같은 모양 규칙');
    }
    const pz = C.makePuzzle(rng);
    const tag = `퍼즐 seed ${seed}`;
    assert.equal(pz.rows, 4); assert.equal(pz.cols, 5);
    const cells = [...pz.cells];
    assert.equal(cells.length, 20);
    const at = (r, c) => cells[r * 5 + c];
    const unitLen = new Set(cells.slice(0, 5)).size;
    assert.ok(unitLen === 2 || unitLen === 3, `마디 ${tag}`);
    for (let r = 0; r < 4; r += 1) {
      for (let c = 0; c < 5; c += 1) {
        if (r) {
          if (pz.mode === 'col') assert.equal(at(r, c), at(r - 1, c), `줄마다 같음 ${tag}`);
          else if (c < 4) assert.equal(at(r, c), at(r - 1, c + 1), `오른쪽 위와 같음 ${tag}`);
        }
        if (c >= unitLen) assert.equal(at(r, c), at(r, c - unitLen), `가로 되풀이 ${tag}`);
      }
    }
    const bl = [...pz.blanks];
    assert.equal(bl.length, 3);
    const rc = bl.map((i) => [Math.floor(i / 5), i % 5]);
    assert.equal(new Set(rc.map((x) => x[0])).size, 3, `다른 줄 ${tag}`);
    assert.equal(new Set(rc.map((x) => x[1])).size, 3, `다른 세로줄 ${tag}`);
    assert.equal(new Set(rc.map((x) => x[0] - x[1])).size, 3, `같은 ↘ 대각선 없음 ${tag}`);
    assert.equal(new Set(rc.map((x) => x[0] + x[1])).size, 3, `같은 ↙ 대각선 없음 ${tag}`);
    for (const [r, c] of rc) {
      assert.ok(r >= 1, `둘째 줄부터 ${tag}`);
      const look = pz.mode === 'col' ? [r - 1, c] : [r - 1, c + 1];
      assert.ok(look[1] <= 4, `diag면 c ≤ 3 ${tag}`);
      assert.ok(!bl.includes(look[0] * 5 + look[1]), `힌트 칸은 빈칸 아님 ${tag}`);
      assert.equal(at(...look), at(r, c), `힌트 칸이 답 ${tag}`);
    }
    const pal = [...pz.palette];
    assert.equal(pal.length, 3); assert.equal(new Set(pal).size, 3);
    assert.ok(pal.every((t) => C.TILES.includes(t)));
    for (const i of bl) {
      assert.ok(pal.includes(cells[i]), `답이 팔레트에 ${tag}`);
      assert.equal(C.puzzleCheck(pz, i, cells[i]), true);
      assert.equal(C.puzzleCheck(pz, i, pal.find((t) => t !== cells[i])), false);
    }
    assert.equal(C.puzzleHint(pz), pz.mode === 'col' ? '바로 위 칸을 봐요' : '오른쪽 위 칸을 봐요');

    const probs = [...C.makeBingo(rng)];
    assert.equal(probs.length, 9);
    assert.equal(new Set(probs.map((p) => p.answerText)).size, 9, `빙고 답 다름 ${probs.map((p) => p.answerText)}`);
    for (const p of probs) {
      assert.ok(p.call.length <= 25, `빙고 call ${p.call}`);
      assert.match(p.answerText, /^\d+$/);
      assert.doesNotMatch(p.speak, EMOJI);
      assert.equal(p.speak, C.speakText(p.call));
      const ns = (p.call.match(/\d+/g) || []).map(Number);
      const ans = Number(p.answerText);
      assert.ok(ans >= 1 && ans <= 81, `빙고 답 범위 ${p.call}`);
      if (p.kind === 'seq-up' || p.kind === 'seq-down') {
        const d = ns[1] - ns[0];
        assert.ok(Math.abs(d) >= 2 && Math.abs(d) <= 5 && ns.every((x, i) => !i || x - ns[i - 1] === d), p.call);
        assert.equal(ans, ns[3] + d, p.call);
      } else if (p.kind === 'cal-below') {
        assert.ok(ns[0] >= 1 && ns[0] <= 23);
        assert.equal(ans, ns[0] + 7);
      } else {
        assert.equal(p.kind, 'mul-next');
        const [k, x, y, z] = ns;
        assert.ok(x % k === 0 && y - x === k && z - y === k && z / k >= 4 && z / k <= 8, p.call);
        assert.equal(ans, z + k);
      }
    }
  }
});

test('화면 파일: 실림 순서·상대 경로·인라인 없음·줄 수·대문 카드·퀴즈 2-2', () => {
  const file = 'kids/subjects/math/rule_find.html';
  const html = read(file);
  const js = ['math_explorer-shell', 'math_squishy', 'math_explorer-quiz', 'math_explorer-ladder', 'math_bingo', 'time_clock-draw', 'rule_find-core', 'rule_find-draw', 'rule_find-labs'];
  assertLoadsInOrder(html, 'script', js.map((j) => `./js/${j}.js`), 'rule_find');
  assertLoadsInOrder(html, 'style', ['../../css/math_explorer.css', '../../css/math_time_clock.css', '../../css/math_rule_find.css'], 'rule_find');
  assertRelativeAssets(file, 'script', assetTags(html, 'script').map((t) => t.src));
  assertRelativeAssets(file, 'style', assetTags(html, 'style').filter((t) => !/^https?:/.test(t.src)).map((t) => t.src));
  assertNoInlineStyleOrScript(html, 'rule_find');
  assert.match(html, /<body class="[^"]*\bmx-theme-rule2\b[^"]*\bmx-grade2\b/);
  assert.match(html, /href="clock_rules\.html"/, '아래 계단 칩');
  assert.match(html, /href="gugudan\.html"/, '곱셈구구 칩');
  assert.equal(read('kids/subjects/math/math.html').split('href="rule_find.html"').length - 1, 2, '수학 대문 두 곳에 카드');
  for (const f of [`${JS}rule_find-core.js`, `${JS}rule_find-draw.js`, `${JS}rule_find-labs.js`, 'kids/css/math_rule_find.css', file]) {
    assert.ok(lineCount(f) < 800, `${f} 800줄 미만`);
  }
  const labs = read(`${JS}rule_find-labs.js`);
  assert.match(labs, /grade:\s*'2-2'/);
  assert.match(labs, /unit:\s*'6\. 규칙 찾기'/);
  assert.match(labs, /sayQuestion:\s*true/);
  assert.match(labs, /rememberTab:\s*true/);
  assert.doesNotMatch(labs, /speechSynthesis/);
  for (const f of [`${JS}rule_find-draw.js`, `${JS}rule_find-labs.js`]) assert.doesNotMatch(read(f), /#[0-9a-fA-F]{3,6}\b|rgba?\(/, `${f} 인라인 색 없음`);
});

test('2-2 규칙 찾기 퀴즈 자료 12제: 3지선다·단원 원문·보기 번호 표현 없음·정답 번호 고르게', () => {
  const data = JSON.parse(read('scripts/data/curriculum/math_2-2_6.json'));
  assert.equal(data.subject, '수학');
  assert.equal(data.grade, '2-2');
  assert.equal(data.unit, '6. 규칙 찾기');
  assert.equal(data.items.length, 12);
  const counts = { 1: 0, 2: 0, 3: 0 };
  for (const it of data.items) {
    assert.equal(it.zone, '탐구퀴즈');
    assert.equal(it.choices.length, 3, it.title);
    assert.equal(new Set(it.choices).size, 3, it.title);
    counts[it.answer] += 1;
    assert.doesNotMatch(it.explanation, /\d번/, `${it.title} 숫자+번`);
    assert.ok(it.question.length <= 45, `${it.title} 질문 길이`);
    assert.doesNotMatch(JSON.stringify(it), EMOJI, `${it.title} 이모지`);
    assert.doesNotMatch(JSON.stringify(it), /민수|민서/);
  }
  assert.deepEqual(counts, { 1: 4, 2: 4, 3: 4 });
});
