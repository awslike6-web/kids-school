// 3-1 길이와 시간 탐험관 시험 (2026-11-28 옛 화면을 공용 탐험관 틀로 옮김, docs/refactor_batches.md 묶음 F7):
// 자로 재기·단위 바꾸기·1초 감각·시간 계산 문제 생성(오답이 정답과 같은 값이 아님), 화면 파일 규칙, 노션 퀴즈 자료.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { read, lineCount, assetTags, assertLoadsInOrder, assertRelativeAssets, assertNoInlineStyleOrScript } from './split-rules.mjs';

const JS = 'kids/subjects/math/js/';
const PAGE = 'kids/subjects/math/length_time.html';

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

const C = load([JS + 'length_time-core.js']).LenTimeCore;

// 글 → 값: 「2cm 4mm」→24(mm), 「3km 70m」→3070(m), 「1분 40초」→100(초)
function mm(t) {
  const r = /^(?:(\d+)cm)? ?(?:(\d+)mm)?$/.exec(t);
  assert.ok(r && (r[1] || r[2]), `길이 글 아님: ${t}`);
  return Number(r[1] || 0) * 10 + Number(r[2] || 0);
}
function meters(t) {
  const r = /^(?:(\d+)km)? ?(?:(\d+)m)?$/.exec(t);
  assert.ok(r && (r[1] || r[2]), `km·m 글 아님: ${t}`);
  return Number(r[1] || 0) * 1000 + Number(r[2] || 0);
}
function secs(t) {
  const r = /^(?:(\d+)분)? ?(?:(\d+)초)?$/.exec(t);
  assert.ok(r && (r[1] || r[2]), `분·초 글 아님: ${t}`);
  return Number(r[1] || 0) * 60 + Number(r[2] || 0);
}

test('글 모양: mm·m·초 정수를 cm mm / km m / 분 초로', () => {
  assert.equal(C.fmtMm(24), '2cm 4mm');
  assert.equal(C.fmtMm(30), '3cm');
  assert.equal(C.fmtMm(7), '7mm');
  assert.equal(C.fmtM(2030), '2km 30m');
  assert.equal(C.fmtM(3000), '3km');
  assert.equal(C.fmtM(450), '450m');
  assert.equal(C.fmtSec(100), '1분 40초');
  assert.equal(C.fmtSec(120), '2분');
  assert.equal(C.fmtSec(45), '45초');
});

test('1관 자로 재기: 6cm 자 안, mm 자리 0 아님, 정답 = 끝 − 시작, 끝 눈금 오답은 시작이 0이 아닐 때만', () => {
  const rng = seeded(1);
  let prev = null;
  const starts = new Set();
  for (let i = 0; i < 400; i++) {
    const q = C.makeMeasure(rng, prev);
    assert.notEqual(q.len, prev);
    prev = q.len;
    starts.add(q.start);
    assert.ok(q.end <= 60 && q.len % 10 !== 0 && q.len >= 11 && q.len <= 49);
    assert.equal(q.end - q.start, q.len);
    assert.equal(mm(q.choices[q.answer]), q.len);
    const vals = q.choices.map(mm);
    assert.equal(new Set(vals).size, 3, q.choices.join());
    if (q.start > 0) assert.equal(vals[q.endIndex], q.end);
    else assert.equal(q.endIndex, -1);
  }
  assert.ok(starts.has(0) && starts.size >= 3);
});

test('2관 단위 바꾸기: 네 종류, 정답 값이 맞고 오답은 다른 값(자리 실수)', () => {
  const rng = seeded(2);
  let prev = null;
  const types = new Set();
  for (let i = 0; i < 600; i++) {
    const q = C.makeConvert(rng, prev);
    assert.notEqual(q.type, prev);
    prev = q.type;
    types.add(q.type);
    assert.equal(q.choices.length, 3);
    const nums = (q.question.match(/\d+/g) || []).map(Number);
    if (q.type === 'cm2mm') {
      const v = q.choices.map((c) => Number(c.replace('mm', '')));
      assert.equal(v[0], nums[0] * 10 + nums[1]);
      assert.equal(new Set(v).size, 3);
    } else if (q.type === 'mm2cm') {
      const v = q.choices.map(mm);
      assert.equal(v[0], nums[0]);
      assert.equal(new Set(v).size, 3, q.choices.join());
    } else if (q.type === 'km2m') {
      const v = q.choices.map((c) => Number(c.replace('m', '')));
      assert.equal(v[0], meters(q.question.replace('는 몇 m일까요?', '')));
      assert.equal(new Set(v).size, 3, q.choices.join());
    } else {
      const v = q.choices.map(meters);
      assert.equal(v[0], nums[0]);
      assert.equal(new Set(v).size, 3, q.choices.join());
    }
    assert.ok(!/\d번/.test(q.explain));
  }
  assert.equal(types.size, 4);
});

test('3관 1초 감각: 목표 5~15초, ±1초(0.1초 단위 반올림) 안이면 성공, 빠름·늦음', () => {
  const rng = seeded(3);
  let prev = null;
  for (let i = 0; i < 100; i++) {
    const m = C.makeSense(rng, prev);
    assert.notEqual(m.target, prev);
    prev = m.target;
    assert.ok(C.SENSE_TARGETS.includes(m.target));
  }
  assert.equal(C.judgeSense(10, 9000).ok, true);
  assert.equal(C.judgeSense(10, 11040).ok, true);
  assert.equal(C.judgeSense(10, 11060).ok, false);
  const j = C.judgeSense(10, 8740);
  assert.deepEqual([j.ok, j.early, j.shown, j.diffText], [false, true, '8.7초', '1.3초']);
  assert.equal(C.judgeSense(5, 6200).early, false);
});

test('4관 시간 계산: 네 종류, 정답 값이 맞고 오답은 모두 다른 값, 받아올림·받아내림이 꼭 있음', () => {
  const rng = seeded(4);
  let prev = null;
  const types = new Set();
  for (let i = 0; i < 600; i++) {
    const q = C.makeTime(rng, prev);
    assert.notEqual(q.type, prev);
    prev = q.type;
    types.add(q.type);
    let ans;
    if (q.type === 'toSec') {
      ans = secs(q.question.replace('는 모두 몇 초일까요?', ''));
      assert.equal(Number(q.choices[0].replace('초', '')), ans);
      assert.equal(new Set(q.choices.map((c) => Number(c.replace('초', '')))).size, 3);
      continue;
    }
    if (q.type === 'fromSec') {
      ans = Number(q.question.match(/^(\d+)초/)[1]);
      assert.ok(ans >= 100 && ans % 60 !== 0);
    } else {
      const [a, b] = q.question.replace('는 몇 분 몇 초일까요?', '').split(/ [+−] /).map(secs);
      if (q.type === 'add') {
        assert.ok(a % 60 + b % 60 >= 60, '받아올림');
        ans = a + b;
      } else {
        assert.ok(a % 60 < b % 60, '받아내림');
        ans = a - b;
        assert.ok(ans >= 60, '답의 분이 0이 아님');
      }
    }
    // 정답은 바른 꼴(초 < 60), 오답 값은 정답과 다름
    assert.equal(q.choices[0], C.fmtSec(ans));
    const vals = q.choices.map(secs);
    assert.equal(vals[0], ans);
    assert.ok(vals.slice(1).every((v) => v !== ans), q.choices.join());
    assert.equal(new Set(q.choices).size, 3);
    assert.ok(!/\d번/.test(q.explain));
  }
  assert.equal(types.size, 4);
});

test('화면 파일: 요정 엔진 → 공용 틀 → 단원 파일 순서, 상대 경로, 인라인 없음, 600줄 이하, 대문 카드 두 곳, 아래 계단', () => {
  const html = read(PAGE);
  const js = ['math_explorer-shell', 'math_squishy', 'math_explorer-quiz', 'length_time-core', 'length_time-labs'];
  assertLoadsInOrder(html, 'script', js.map((j) => `./js/${j}.js`), 'length_time');
  const engine = assetTags(html, 'script').find((t) => t.url === '../../core/fairy-engine.js');
  assert.ok(engine && engine.start < html.indexOf('./js/math_explorer-shell.js'), '요정 엔진이 먼저');
  assertLoadsInOrder(html, 'style', ['../../css/math_explorer.css', '../../css/math_length_time.css'], 'length_time');
  assertRelativeAssets(PAGE, 'script', assetTags(html, 'script').map((t) => t.src));
  assertRelativeAssets(PAGE, 'style', assetTags(html, 'style').filter((t) => !/^https?:/.test(t.src)).map((t) => t.src));
  assertNoInlineStyleOrScript(html, 'length_time');
  assert.doesNotMatch(html, /\son[a-z]+\s*=/i, 'on* 속성 없음');
  for (const id of ['mxTabs', 'mxContainer', 'mxDoneCount', 'mxTotal', 'mxProgressFill', 'mxCompleteModal', 'mxCompleteReward', 'mxCompleteClose', 'mxGoQuiz']) {
    assert.ok(html.includes(`id="${id}"`), `#${id}`);
  }
  assert.match(html, /<span id="mxTotal">4<\/span>/, '관 수 표시');
  assert.match(html, /href="length_m\.html"/);
  assert.match(html, /href="time_clock\.html"/);
  for (const f of [...js.slice(3).map((j) => `${JS}${j}.js`), 'kids/css/math_length_time.css', PAGE]) {
    assert.ok(lineCount(read(f)) <= 600, `${f}: ${lineCount(read(f))}줄`);
  }
  const lobby = read('kids/subjects/math/math.html');
  assert.equal(lobby.split('href="length_time.html"').length - 1, 2, '수학 대문 학년별·영역별 두 곳');
});

test('관 파일: 관 4개·퀴즈 학년 단원, innerHTML·기계음·UTC 날짜 없음, 사실과 맞지 않던 행성 축척 없음', () => {
  const src = read(`${JS}length_time-labs.js`);
  assert.match(src, /key: 'lentime3'/);
  assert.match(src, /labs: \[lab1, lab2, lab3, lab4\]/);
  assert.ok(src.includes("grade: '3-1'") && src.includes("unit: '5. 길이와 시간'"));
  assert.doesNotMatch(src, /innerHTML/);
  assert.doesNotMatch(src, /speechSynthesis/);
  assert.doesNotMatch(src, /toISOString/);
  assert.doesNotMatch(src, /행성|축척/);
});

test('퀴즈 자료: 12제·3지선다·화면과 같은 단원 원문·보기 번호 표현 없음·같은 값 보기 없음', () => {
  const d = JSON.parse(read('scripts/data/curriculum/math_3-1_5.json'));
  assert.equal(d.subject, '수학');
  assert.equal(d.grade, '3-1');
  assert.equal(d.unit, '5. 길이와 시간');
  assert.equal(d.items.length, 12);
  const answers = new Set();
  d.items.forEach((it, i) => {
    assert.equal(it.title.slice(0, 3), `Q${String(i + 1).padStart(2, '0')}`);
    assert.equal(it.zone, '탐구퀴즈');
    assert.equal(it.choices.length, 3);
    assert.equal(new Set(it.choices).size, 3, `${it.title}: 보기 중복`);
    assert.ok([1, 2, 3].includes(it.answer), it.title);
    answers.add(it.answer);
    assert.doesNotMatch(it.explanation, /\d번|보기 \d|[①②③④]/, `${it.title}: 보기 번호 표현`);
    assert.match(it.usage, /^3-1 5단원 · /);
    // 「3km 1300m」·「66분 20초」처럼 정답과 값이 같은 다른 꼴 금지
    const parse = [mm, meters, secs].find((f) => { try { it.choices.forEach(f); return true; } catch { return false; } });
    if (parse) assert.equal(new Set(it.choices.map(parse)).size, 3, `${it.title}: 같은 값 보기`);
  });
  assert.equal(answers.size, 3, '정답 번호가 한쪽에 몰리지 않음');
});
