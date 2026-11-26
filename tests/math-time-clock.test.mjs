// 2-2 시각과 시간 탐험관 시험 (docs/math_2-2_time_spec.md): 계산 부품 TimeClockCore, 시계 그림 부품 순수 함수, 화면 파일, 퀴즈 자료
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
const W = load([`${JS}time_clock-core.js`, `${JS}time_clock-draw.js`]);
const C = W.TimeClockCore;
const D = W.ClockDraw;

function seeded(seed) {
  let s = seed >>> 0 || 1;
  return () => { s = (s * 1103515245 + 12345) >>> 0; return s / 4294967296; };
}

// 시각 글 → { ap, h, m } (「오전 8시 30분」·「3시 25분」·「12시」)
function parseTime(text) {
  const r = /^(?:(오전|오후) )?(\d+)시(?: (\d+)분)?$/.exec(String(text));
  return r ? { ap: r[1] || '', h: Number(r[2]), m: Number(r[3] || 0) } : null;
}
// 시간 길이 글 → 분 (「1시간 20분」·「80분」·「30시간」·「14일」·「12개월」) — 시각이 아니면
function durMin(text) {
  const t = String(text).replace(/ 전$/, '');
  let r = /^(\d+)시간(?: (\d+)분)?$/.exec(t);
  if (r) return Number(r[1]) * 60 + Number(r[2] || 0);
  r = /^(\d+)분$/.exec(t);
  if (r) return Number(r[1]);
  r = /^(\d+)일$/.exec(t);
  if (r) return Number(r[1]) * 1440;
  r = /^(\d+)개월$/.exec(t);
  if (r) return Number(r[1]) * 43200;
  return null;
}
const valueOf = (t) => {
  const p = parseTime(t);
  if (p) return `t${p.ap}${p.h}:${p.m}`;
  const d = durMin(t);
  return d === null ? `s${t}` : `d${d}${/ 전$/.test(t) ? '전' : ''}`;
};
const KINDS = Object.values(C.LAB_KINDS).flat();
const EMOJI = /[\uD83C-\uD83E][\uDC00-\uDFFF]|[☀-➿]/;

test('표기: fmtTime·fmtDur·addMinutes·josaNum·바늘 각', () => {
  assert.equal(C.fmtTime(3, 0), '3시');
  assert.equal(C.fmtTime(12, 5), '12시 5분');
  assert.equal(C.fmtDur(60), '1시간');
  assert.equal(C.fmtDur(80), '1시간 20분');
  assert.equal(C.fmtDur(40), '40분');
  assert.deepEqual({ ...C.addMinutes(1, 0, -10) }, { h: 12, m: 50 });
  assert.deepEqual({ ...C.addMinutes(12, 55, 10) }, { h: 1, m: 5 });
  for (const [n, j] of [[7, '을'], [5, '를'], [11, '을'], [12, '를'], [3, '을'], [9, '를'], [10, '을'], [1, '을']]) assert.equal(C.josaNum(n, '을'), j, `${n}${j}`);
  assert.deepEqual({ ...D.handAngles(3, 30) }, { hour: 105, minute: 180 });
  assert.deepEqual({ ...D.handAngles(12, 0) }, { hour: 0, minute: 0 });
  assert.equal(D.angleToMinute(359, 1), 0);
  assert.equal(D.angleToMinute(90, 5), 15);
  assert.equal(D.angleToMinute(180, 1), 30);
  assert.equal(D.angleToMinute(-90, 1), 45);
  for (let deg = 0; deg < 720; deg += 7) {
    const m = D.angleToMinute(deg, 5);
    assert.ok(m >= 0 && m <= 55 && m % 5 === 0, `${deg}° → ${m}`);
  }
});

test('문제 seed 300개: 질문 25자·읽는 글에 이모지 없음·보기 2개(정답·서로와 글자도 값도 다름)·범위', () => {
  for (let seed = 1; seed <= 300; seed += 1) {
    for (const kind of KINDS) {
      const rng = seeded(seed * 37 + kind.length);
      const p = C.makeProblem(kind, rng);
      const tag = `${kind} seed ${seed}`;
      assert.equal(p.kind, kind, tag);
      assert.ok(p.question.length <= 25, `${tag} 질문 ${p.question.length}자: ${p.question}`);
      assert.equal(typeof p.fact, 'string', tag);
      assert.equal(p.speak, p.fact ? `${p.fact} ${p.question}` : p.question, `${tag} speak`);
      assert.doesNotMatch(p.speak, EMOJI, `${tag} 읽는 글 이모지`);
      if (kind === 'set5' || kind === 'set1') {
        assert.ok(p.h >= 1 && p.h <= 12 && p.m >= 1 && p.m <= 59, tag);
        assert.equal(p.m % 5 === 0, kind === 'set5', `${tag} 분 ${p.m}`);
        continue;
      }
      const w = C.wrongChoices(p);
      assert.equal(w.length, 2, `${tag} 오답 2개`);
      const texts = [p.answerText, w[0].text, w[1].text];
      assert.equal(new Set(texts).size, 3, `${tag} 글자 겹침 ${texts}`);
      assert.equal(new Set(texts.map(valueOf)).size, 3, `${tag} 값 겹침 ${texts}`);
      for (const t of texts) {
        assert.doesNotMatch(t, /(^| )0(분|시간|일)|\d+시간 ([6-9]\d|\d{3,})분/, `${tag} 이상한 표기 ${t}`);
        const tm = parseTime(t);
        if (tm) assert.ok(tm.h >= 1 && tm.h <= 12 && tm.m >= 0 && tm.m <= 59, `${tag} 시각 범위 ${t}`);
      }
      for (const c of w) assert.ok(typeof c.mistake === 'string' && c.mistake, `${tag} mistake`);
    }
  }
});

test('종류별 제약: 읽기 보기 다수결·몇 분 전·걸린 시간·하루·달력', () => {
  for (let seed = 1; seed <= 300; seed += 1) {
    const rng = seeded(seed);
    const mk = (k) => C.makeProblem(k, rng);
    for (const k of ['read5', 'read1']) {
      const p = mk(k);
      if (k === 'read5') assert.ok(p.m >= 5 && p.m <= 55 && p.m % 5 === 0);
      else assert.ok(p.m >= 1 && p.m <= 54 && p.m % 5 !== 0, `read1 ${p.m}`);
      assert.equal(p.answerText, C.fmtTime(p.h, p.m));
      assert.ok(C.handsApart(p.h, p.m), `${k} 두 바늘이 겹침 ${p.answerText}`);
      // 시 숫자·분 숫자로 다수결을 내면 정답이 되면 안 됨
      const all = [p.answerText, ...C.wrongChoices(p).map((c) => c.text)].map(parseTime);
      const most = (key) => {
        const cnt = {};
        for (const x of all) cnt[x[key]] = (cnt[x[key]] || 0) + 1;
        const top = Object.entries(cnt).filter(([, v]) => v >= 2).map(([kk]) => Number(kk));
        return top.length ? top[0] : null;
      };
      const mh = most('h'), mm = most('m');
      assert.ok(!(mh === p.h && mm === p.m), `${k} 다수결 찍기 ${p.answerText}`);
    }
    let p = mk('before');
    assert.ok(['to', 'from'].includes(p.dir));
    if (p.dir === 'to') {
      assert.ok([40, 45, 50, 55].includes(p.m));
      assert.ok(C.handsApart(p.h, p.m), `before 두 바늘이 겹침 ${p.h}:${p.m}`);
      assert.equal(p.answerText, `${60 - p.m}분 전`);
    } else {
      const t = parseTime(p.answerText);
      assert.ok(t && [40, 45, 50, 55].includes(t.m), `before from ${p.answerText}`);
      assert.equal(t.h, p.h === 1 ? 12 : p.h - 1, '12 ↔ 1 순환');
    }
    p = mk('elapsed');
    const s = p.sh * 60 + p.sm, e = p.eh * 60 + p.em;
    assert.equal(e - s, p.dur);
    assert.ok(p.dur >= 20 && p.dur <= 90 && p.dur !== 60 && p.dur % 10 === 0, `elapsed ${p.dur}`);
    assert.equal(p.eh, p.sh + 1, '정각을 한 번 넘음');
    assert.ok(e <= 720, '12시 정각까지');
    p = mk('min-to-h');
    assert.ok([70, 80, 90, 110, 130, 140, 150].includes(p.min), `min-to-h ${p.min}`);
    p = mk('day-elapsed');
    assert.ok(p.start >= 8 && p.start <= 11 && p.end >= 13 && p.end <= 17, `day ${p.start}-${p.end}`);
    assert.notEqual(p.start - (p.end - 12), 6, 'pm-raw가 정답과 같아지는 쌍 없음');
    assert.equal(p.answerText, `${p.end - p.start}시간`);
    p = mk('am-pm');
    const ans = parseTime(p.answerText);
    const ws = C.wrongChoices(p).map((c) => parseTime(c.text));
    assert.ok(ans && ws.every(Boolean), 'am-pm 보기는 오전·오후 시각');
    // 셋째 보기는 반대쪽(오전·오후)·다른 시 → 오전·오후 다수결과 시 다수결이 가리키는 보기는 오답
    assert.ok(ws.every((x) => x.ap !== ans.ap), 'am-pm 오답은 모두 반대쪽');
    assert.equal(ws.filter((x) => x.h === ans.h).length, 1, 'am-pm 같은 시 오답 하나');
    p = mk('cal-week');
    const d = Number(p.answerText.replace('일', ''));
    assert.ok(d >= 1 && d <= 30 && p.days === 30 && p.firstDay >= 0 && p.firstDay <= 6);
    assert.equal(d, p.dir === 'before' ? p.date - 7 : p.date + 7);
    p = mk('month-days');
    if (p.month === 0) assert.equal(p.answerText, '12개월');
    else assert.equal(p.answerText, `${C.MONTH_DAYS[p.month - 1]}일`);
  }
  assert.deepEqual([...C.MONTH_DAYS], [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]);
});

test('한 판·빙고·약속 시계', () => {
  const seenFeb = new Set();
  for (let seed = 1; seed <= 200; seed += 1) {
    const rng = seeded(seed);
    for (const lab of [1, 2, 3, 4, 5]) assert.deepEqual([...C.makeRound(lab, rng).map((p) => p.kind)], [...C.LAB_KINDS[lab]]);
    const bingo = C.makeBingo(rng);
    assert.equal(bingo.length, 9);
    assert.equal(new Set(bingo.map((p) => p.answerText)).size, 9, '빙고 답 글자 다름');
    assert.equal(new Set(bingo.map((p) => valueOf(p.answerText))).size, 9, `빙고 답 값 다름 ${bingo.map((p) => p.answerText)}`);
    for (const p of bingo) {
      assert.ok(C.BINGO_KINDS.includes(p.kind));
      assert.ok(p.answerText.length <= 7, `빙고 답 ${p.answerText}`);
      assert.ok(p.call && p.speak, '빙고 call·speak');
      if (p.kind === 'before') assert.equal(p.dir, 'from');
    }
    const pr = C.makePromise(rng);
    assert.ok(pr.h >= 1 && pr.h <= 12 && pr.m >= 1 && pr.m <= 59);
    assert.equal(pr.text, `${pr.name}${['곰'].includes(pr.name) ? '과' : '와'} ${C.fmtTime(pr.h, pr.m)}에 만나요!`);
    assert.doesNotMatch(pr.speak, EMOJI);
    seenFeb.add(pr.m % 5 === 0);
    const mp = C.makeProblem('month-days', rng);
    seenFeb.add(`m${mp.month}`);
  }
  assert.ok(seenFeb.has(true) && seenFeb.has(false), '약속 5분·1분 둘 다');
  assert.ok(seenFeb.has('m2') && seenFeb.has('m0'), '2월·1년 문제도 나옴');
  assert.deepEqual({ ...C.setFeedback(30, 35) }, { ok: false, diff: 5, text: '5분 더 돌려요' });
  assert.equal(C.setFeedback(40, 37).text, '3분 덜 돌려요');
  assert.equal(C.setFeedback(37, 37).ok, true);
});

test('화면 파일: 실림 순서·상대 경로·인라인 없음·줄 수·대문 카드·퀴즈 2-2', () => {
  const file = 'kids/subjects/math/time_clock.html';
  const html = read(file);
  const js = ['math_explorer-shell', 'math_squishy', 'math_explorer-quiz', 'math_explorer-ladder', 'math_bingo', 'time_clock-core', 'time_clock-draw', 'time_clock-labs'];
  assertLoadsInOrder(html, 'script', js.map((j) => `./js/${j}.js`), 'time_clock');
  assertLoadsInOrder(html, 'style', ['../../css/math_explorer.css', '../../css/math_time_clock.css'], 'time_clock');
  assertRelativeAssets(file, 'script', assetTags(html, 'script').map((t) => t.src));
  assertRelativeAssets(file, 'style', assetTags(html, 'style').filter((t) => !/^https?:/.test(t.src)).map((t) => t.src));
  assertNoInlineStyleOrScript(html, 'time_clock');
  assert.match(html, /<body class="[^"]*\bmx-theme-time2\b[^"]*\bmx-grade2\b/);
  assert.match(html, /href="clock_rules\.html"/, '아래 계단 칩');
  assert.match(html, /href="length_time\.html"/, '위 계단 칩');
  assert.equal(read('kids/subjects/math/math.html').split('href="time_clock.html"').length - 1, 2, '수학 대문 두 곳에 카드');
  for (const f of [`${JS}time_clock-core.js`, `${JS}time_clock-draw.js`, `${JS}time_clock-labs.js`, 'kids/css/math_time_clock.css', file]) {
    assert.ok(lineCount(f) < 800, `${f} 800줄 미만`);
  }
  const labs = read(`${JS}time_clock-labs.js`);
  assert.match(labs, /grade:\s*'2-2'/);
  assert.match(labs, /unit:\s*'4\. 시각과 시간'/);
  assert.match(labs, /sayQuestion:\s*true/);
  assert.match(labs, /rememberTab:\s*true/);
  assert.doesNotMatch(labs, /speechSynthesis/);
});

test('2-2 퀴즈 자료 12제: 3지선다·단원 원문·같은 값 다른 표기 없음·보기 번호 표현 없음', () => {
  const data = JSON.parse(read('scripts/data/curriculum/math_2-2_4.json'));
  assert.equal(data.subject, '수학');
  assert.equal(data.grade, '2-2');
  assert.equal(data.unit, '4. 시각과 시간');
  assert.equal(data.items.length, 12);
  const counts = { 1: 0, 2: 0, 3: 0 };
  for (const it of data.items) {
    assert.equal(it.zone, '탐구퀴즈');
    assert.equal(it.choices.length, 3, it.title);
    assert.equal(new Set(it.choices).size, 3, it.title);
    assert.equal(new Set(it.choices.map(valueOf)).size, 3, `${it.title} 같은 값 다른 표기`);
    counts[it.answer] += 1;
    assert.doesNotMatch(it.explanation, /\d번/, `${it.title} 숫자+번`);
    assert.ok(it.question.length <= 40, `${it.title} 질문 길이`);
    for (const t of it.choices) {
      const tm = parseTime(t);
      if (tm) assert.ok(tm.h >= 1 && tm.h <= 12 && tm.m <= 59, `${it.title} 시각 ${t}`);
    }
  }
  assert.deepEqual(counts, { 1: 4, 2: 4, 3: 4 });
});
