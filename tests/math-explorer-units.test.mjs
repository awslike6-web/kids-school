// 5-2 수학 4·5·6단원 탐험관과 공용 틀(MathExplorer) 시험: 조사·노션 퀴즈 변환, 소수 계산(부동소수 없음),
// 입체·전개도 계산(정육면체 전개도 11종), 평균·모의 실험, 퀴즈 자료 JSON, 화면 파일 실림 순서.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { root, read, lineCount, assetTags, assertLoadsInOrder, assertRelativeAssets, assertNoInlineStyleOrScript } from './split-rules.mjs';

const plain = (x) => JSON.parse(JSON.stringify(x));

function load(files) {
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  for (const f of files) vm.runInContext(read(f), sandbox, { filename: f });
  return sandbox.window;
}

// 시험용 결정적 난수 (mulberry32)
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

const JS = 'kids/subjects/math/js/';
const W = load([JS + 'math_explorer-shell.js', JS + 'math_explorer-quiz.js', JS + 'decimal_multiplication-core.js', JS + 'cuboid_cube-geo.js', JS + 'average_probability-core.js']);
const M = W.MathExplorer;
const Q = W.MathExplorerQuiz;
const D = W.DecimalCore;
const G = W.CuboidGeo;
const A = W.AverageCore;

test('공용 틀: 숫자·단위·자음 뒤 조사를 받침에 맞게 붙인다', () => {
  assert.equal(M.josa('8', 'eul'), '8을');
  assert.equal(M.josa('0.4', 'eul'), '0.4를');
  assert.equal(M.josa('0.7', 'eun'), '0.7은');
  assert.equal(M.josa('9', 'gwa'), '9와');
  assert.equal(M.josa('7', 'gwa'), '7과');
  assert.equal(M.josa('3.2 kg', 'ieyo'), '3.2 kg이에요');
  assert.equal(M.josa('16.8 L', 'ieyo'), '16.8 L예요');
  assert.equal(M.josa('4장', 'ieyo'), '4장이에요');
  assert.equal(M.josa('모서리', 'eun'), '모서리는');
  assert.equal(M.josa('면 ㄴㅂㅅㄷ', 'gwa'), '면 ㄴㅂㅅㄷ과');
  assert.equal(M.josa('3.6', 'ro'), '3.6으로');
  assert.equal(M.josa('2.1', 'ro'), '2.1로');
  assert.equal(M.josa('4', 'ro'), '4로');
});

test('공용 틀: 로컬 날짜 키는 YYYY-MM-DD (UTC 변환 없음)', () => {
  assert.equal(M.localDateKey(new Date(2026, 0, 5, 23, 59)), '2026-01-05');
  assert.equal(M.localDateKey(new Date(2026, 10, 14, 0, 1)), '2026-11-14');
});

test('공용 퀴즈: 노션 페이지 → 문항 (보기 줄 배열·정답 범위·제목 순) / 단원 원문 equals 필터', () => {
  const rt = (t) => ({ type: 'rich_text', rich_text: [{ plain_text: t }] });
  const page = (title, q, choices, ans, ex) => ({
    id: '',
    properties: { 제목: { type: 'title', title: [{ plain_text: title }] }, '퀴즈 질문': rt(q), '보기 1~4': rt(choices), 정답: { number: ans }, 해설: rt(ex) }
  });
  const list = plain(Q.buildQuizFromPages([
    page('Q02 둘', '질문2', '가\n나\n다', 3, '해설2'),
    page('Q01 하나', '질문1', ' 하나 \n\n둘 ', 1, '해설1'),
    page('Q03 범위 밖', '질문3', '가\n나', 3, ''),
    page('Q04 보기 하나', '질문4', '가', 1, ''),
    { properties: null }
  ]));
  assert.deepEqual(list, [
    { id: '', title: 'Q01 하나', q: '질문1', choices: ['하나', '둘'], answerIndex: 0, explain: '해설1' },
    { id: '', title: 'Q02 둘', q: '질문2', choices: ['가', '나', '다'], answerIndex: 2, explain: '해설2' }
  ]);
  const body = plain(Q.buildQueryBody('5-2', '4. 소수의 곱셈'));
  assert.deepEqual(body.filter.and[2], { property: '단원', rich_text: { equals: '4. 소수의 곱셈' } });
  assert.deepEqual(body.filter.and[3], { property: '구역', select: { equals: '탐구퀴즈' } });
});

test('소수 계산: 정수 표현으로 곱하고 끝자리 0·앞자리 0을 규칙대로 표기한다', () => {
  assert.deepEqual(plain(D.parse('2.4')), { int: 24, places: 1 });
  assert.deepEqual(plain(D.parse('8')), { int: 8, places: 0 });
  assert.equal(D.format(D.mul(D.parse('8'), D.parse('0.4'))), '3.2');
  assert.equal(D.format(D.mul(D.parse('7'), D.parse('2.4'))), '16.8');
  assert.equal(D.format(D.mul(D.parse('0.8'), D.parse('0.6'))), '0.48');
  assert.equal(D.formatRaw(D.mul(D.parse('2.4'), D.parse('1.5'))), '3.60');
  assert.equal(D.format(D.mul(D.parse('2.4'), D.parse('1.5'))), '3.6');
  assert.equal(D.format(D.mul(D.parse('1.6'), D.parse('2.5'))), '4');
  assert.equal(D.format(D.mul(D.parse('0.04'), D.parse('0.07'))), '0.0028');
  assert.equal(D.format(D.mul(D.parse('5.4'), D.parse('8.9'))), '48.06');
  // 0.1 + 0.2 같은 부동소수 오차가 끼어들 자리가 없다
  assert.equal(D.format(D.mul(D.parse('0.1'), D.parse('3'))), '0.3');
  assert.equal(D.compare(D.parse('0.5'), D.parse('0.50')), 0);
  assert.equal(D.compare(D.parse('1.2'), D.parse('1')), 1);
});

test('소수점 찍기 판: 모자란 자리는 앞에 0을 채우고, 소수점 칸이 맞다', () => {
  assert.deepEqual(plain(D.pointSlots(D.mul(D.parse('0.04'), D.parse('0.7')))), { digits: '0028', padded: 2, slot: 1, trailingZeros: 0 });
  assert.deepEqual(plain(D.pointSlots(D.mul(D.parse('0.5'), D.parse('0.23')))), { digits: '0115', padded: 1, slot: 1, trailingZeros: 0 });
  assert.deepEqual(plain(D.pointSlots(D.mul(D.parse('2.7'), D.parse('1.2')))), { digits: '324', padded: 0, slot: 1, trailingZeros: 0 });
  assert.deepEqual(plain(D.pointSlots(D.mul(D.parse('2.5'), D.parse('1.4')))), { digits: '350', padded: 0, slot: 1, trailingZeros: 1 });
  assert.equal(D.pointSlots(D.mul(D.parse('21'), D.parse('2.4'))).slot, 2);
});

test('소수 문제 만들기: 관별 범위·끝자리 조건과 한 판의 0 처리 문제 포함 (시드 200개)', () => {
  for (let s = 1; s <= 200; s++) {
    const rng = seeded(s);
    const p1 = D.makeLab1(rng);
    assert.ok(p1.a.places === 0 && p1.b.places === 1 && p1.b.int >= 1 && p1.b.int <= 9);
    assert.notEqual((p1.a.int * p1.b.int) % 10, 0, '1관 곱이 자연수가 되지 않음');
    const p2 = D.makeLab2(rng);
    assert.ok(p2.b.int > 10 && p2.b.int < 30);
    const p3 = D.makeLab3(rng);
    assert.ok(p3.a.int < 10 && p3.b.int < 10);
    const p4 = D.makeLab4(rng);
    const parts = D.areaParts(p4.a, p4.b);
    const sumHundredths = parts.reduce((acc, x) => acc + x.area.int * 10 ** (2 - x.area.places), 0);
    assert.equal(sumHundredths, D.mul(p4.a, p4.b).int, '넓이 4조각의 합 = 곱');
    const set = D.makeDrillSet(5, rng);
    assert.equal(set.length, 5);
    const kinds = set.map((x) => x.kind);
    assert.ok(kinds.includes('trailing-zero') && kinds.includes('leading-zero'), `0 처리 문제 포함: ${kinds}`);
    for (const x of set) {
      const prod = D.mul(x.a, x.b);
      const slots = D.pointSlots(prod);
      if (x.kind === 'trailing-zero') assert.ok(slots.trailingZeros > 0, '끝자리 0 문제');
      if (x.kind === 'leading-zero') assert.ok(slots.padded >= 2, '앞자리 0 채우기 문제');
      const pc = D.pointChoices(prod);
      assert.equal(new Set(pc.choices).size, 3, `보기 3개가 서로 다름: ${pc.choices}`);
      assert.equal(pc.choices[pc.answer], D.format(prod));
    }
  }
});

test('직육면체 그리기: 표준 겨냥도에서 보이는 면 3·숨은 모서리 3·숨은 꼭짓점 1(ㅁ)', () => {
  const v = G.view(G.cuboid(3, 2, 2), -30, 22, 44, 150, 112);
  assert.deepEqual(plain(G.FACES.filter((f, i) => v.faceVisible[i]).map((f) => f.id)), ['top', 'front', 'right']);
  assert.equal(v.edges.length, 12);
  assert.equal(v.edges.filter((e) => !e.visible).length, 3);
  assert.deepEqual(plain(G.LABELS.filter((l, i) => !v.vertexVisible[i])), ['ㅁ']);
  // 아래에서 보면 아랫면이 보인다
  const below = G.view(G.cuboid(3, 2, 2), -30, -22, 44, 150, 112);
  assert.ok(below.faceVisible[G.FACES.findIndex((f) => f.id === 'bottom')]);
});

test('직육면체 면 관계: 평행 3쌍, 한 면에 수직인 면 4개, 면 이름은 교과서 기호', () => {
  assert.equal(G.FACE_NAMES.front, 'ㄴㅂㅅㄷ');
  assert.equal(G.FACE_NAMES[G.parallelFace('front')], 'ㄱㅁㅇㄹ');
  for (const f of G.FACES) {
    assert.equal(G.parallelFace(G.parallelFace(f.id)), f.id);
    assert.equal(G.perpendicularFaces(f.id).length, 4);
    // 면 이름의 꼭짓점이 실제 그 면의 꼭짓점과 같다
    assert.deepEqual([...G.FACE_NAMES[f.id]].sort(), plain(f.v).map((i) => G.LABELS[i]).sort());
  }
});

function canon(cells) {
  const forms = [];
  let cur = cells.map((c) => [c[0], c[1]]);
  for (let r = 0; r < 4; r++) {
    cur = cur.map(([x, y]) => [-y, x]);
    for (const shape of [cur, cur.map(([x, y]) => [-x, y])]) {
      const mx = Math.min(...shape.map((c) => c[0]));
      const my = Math.min(...shape.map((c) => c[1]));
      forms.push(shape.map(([x, y]) => [x - mx, y - my]).sort((a, b) => a[0] - b[0] || a[1] - b[1]).map((c) => c.join(',')).join(';'));
    }
  }
  return forms.sort()[0];
}

test('전개도 접기: 헥소미노 35종 중 정육면체 전개도는 11종이고, 목록 11개가 그 11종과 같다', () => {
  let level = [[[0, 0]]];
  for (let k = 1; k < 6; k++) {
    const next = new Map();
    for (const p of level) {
      for (const [x, y] of p) {
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const c = [x + dx, y + dy];
          if (p.some((q) => q[0] === c[0] && q[1] === c[1])) continue;
          const np = [...p, c];
          next.set(canon(np), np);
        }
      }
    }
    level = [...next.values()];
  }
  assert.equal(level.length, 35);
  const norm = (p) => {
    const mx = Math.min(...p.map((c) => c[0]));
    const my = Math.min(...p.map((c) => c[1]));
    return p.map(([x, y]) => [x - mx, y - my]);
  };
  const valid = new Set(level.filter((p) => G.foldNet(norm(p)).isCube).map(canon));
  assert.equal(valid.size, 11);
  const listed = new Set(G.CUBE_NETS.map((n) => canon(plain(n))));
  assert.equal(listed.size, 11, '목록에 같은 모양이 두 번 없음');
  assert.deepEqual([...listed].sort(), [...valid].sort());
  for (const n of G.NOT_NETS) assert.equal(G.foldNet(plain(n)).isCube, false);
});

test('전개도 접기: 마주 보는 칸은 3쌍이고 서로 짝, 만나는 점은 서로를 가리킨다', () => {
  for (const net of G.CUBE_NETS) {
    const cells = plain(net);
    const opp = G.oppositeCells(cells);
    assert.ok(opp.every((j, i) => j >= 0 && j !== i && opp[j] === i), '마주 보는 칸 짝');
    const r = G.foldNet(cells);
    for (const [ci, c] of cells.entries()) {
      const p = [c[0], c[1]];
      for (const m of G.meetingPoints(cells, p)) {
        assert.ok(G.meetingPoints(cells, m).some((q) => q[0] === p[0] && q[1] === p[1]), '만남은 대칭');
      }
      assert.equal(r.corners[ci].length, 4);
    }
  }
  // 십자 전개도: 위 칸(0)과 아래 칸(5), 왼쪽(1)과 오른쪽 셋째(3), 가운데(2)와 맨 끝(4)
  assert.deepEqual(plain(G.oppositeCells([[1, 0], [0, 1], [1, 1], [2, 1], [3, 1], [1, 2]])), [5, 3, 4, 1, 2, 0]);
});

test('평균 자료: 평균이 자연수, 고르게 하기는 값 보존, 빠진 값 계산', () => {
  for (let s = 1; s <= 200; s++) {
    const list = A.makeLevelData(4 + (s % 2), 8, seeded(s));
    const m = A.mean(list);
    assert.ok(Number.isInteger(m) && m >= 2, `평균 자연수: ${list}`);
    assert.ok(Math.max(...list) - Math.min(...list) >= 3);
  }
  assert.equal(A.mean([6, 1, 4, 5]), 4);
  assert.equal(A.mean([1, 2]), null);
  const moved = A.move([6, 1, 4, 5], 0, 1);
  assert.deepEqual(plain(moved), [5, 2, 4, 5]);
  assert.equal(A.sum(moved), 16);
  assert.equal(A.move([0, 1], 0, 1), null);
  assert.ok(A.isLevel([4, 4, 4]));
  assert.equal(A.missingValue([12, 15, 8, 10], 11, 5), 10);
});

test('모의 실험: 횟수 합이 맞고, 절반인 색이 언제나 가장 많이 나온다 (시드 300개)', () => {
  for (const key of Object.keys(A.SPINNERS)) {
    const sp = A.SPINNERS[key];
    const big = sp.parts.find((p) => p.share === 0.5).color;
    for (let s = 1; s <= 100; s++) {
      for (const n of [50, 100]) {
        const r = A.simulate(sp, n, seeded(s * 7 + n));
        assert.equal(Object.values(r).reduce((a, b) => a + b, 0), n);
        for (const c of Object.keys(r)) if (c !== big) assert.ok(r[c] < r[big], `${key} ${n}회: ${JSON.stringify(r)}`);
      }
    }
  }
});

test('가능성 자료: 상황 단계 0~4, 주사위 카드 가능성은 실제로 센 값과 같다', () => {
  assert.equal(A.LEVEL_WORDS.length, 5);
  for (const s of A.SITUATIONS) assert.ok(Number.isInteger(s.level) && s.level >= 0 && s.level <= 4 && s.why);
  const count = { '7 초과': (n) => n > 7, '2 미만': (n) => n < 2, '2의 배수': (n) => n % 2 === 0, '2 이상': (n) => n >= 2, '1 이상 6 이하': (n) => n >= 1 && n <= 6 };
  for (const c of A.DICE_CARDS) assert.equal([1, 2, 3, 4, 5, 6].filter(count[c.text]).length, c.sixths, c.text);
  assert.equal(A.numberWord(3), '1/2');
  assert.equal(A.numberWord(2), null);
});

const UNITS = [
  { n: 4, page: 'decimal_multiplication', unit: '4. 소수의 곱셈', css: 'math_decimal_multiplication', js: ['decimal_multiplication-core', 'decimal_multiplication-labs-a', 'decimal_multiplication-labs-b'] },
  { n: 5, page: 'cuboid_cube', unit: '5. 직육면체와 정육면체', css: 'math_cuboid_cube', js: ['cuboid_cube-geo', 'cuboid_cube-labs-a', 'cuboid_cube-net'] },
  { n: 6, page: 'average_probability', unit: '6. 평균과 가능성', css: 'math_average_probability', js: ['average_probability-core', 'average_probability-labs-a', 'average_probability-labs-b'] }
];

test('퀴즈 자료 JSON: 단원당 12제, 3지선다, 정답 범위, 화면 단원 이름과 같음, 빗금 분수·보기 번호 표현 없음', () => {
  for (const u of UNITS) {
    const data = JSON.parse(read(`scripts/data/curriculum/math_5-2_${u.n}.json`));
    assert.equal(data.subject, '수학');
    assert.equal(data.grade, '5-2');
    assert.equal(data.unit, u.unit);
    assert.equal(data.items.length, 12);
    const titles = new Set();
    for (const it of data.items) {
      assert.match(it.title, /^Q\d\d /);
      titles.add(it.title.slice(0, 3));
      assert.equal(it.zone, '탐구퀴즈');
      assert.equal(it.choices.length, 3);
      assert.equal(new Set(it.choices).size, 3);
      assert.ok(Number.isInteger(it.answer) && it.answer >= 1 && it.answer <= 3);
      assert.ok(it.question && it.explanation && /^교과서 \d+~\d+쪽 · /.test(it.usage), it.title);
      assert.doesNotMatch(it.choices.join(' ') + it.explanation, /\d\/\d/, `${it.title}: 빗금 분수`);
      assert.doesNotMatch(it.explanation, /\d번은|보기 \d|[①②③④]/, `${it.title}: 보기 번호 표현`);
    }
    assert.equal(titles.size, 12);
    const labs = read(`${JS}${u.js[2]}.js`);
    assert.ok(labs.includes(`unit: '${u.unit}'`), `${u.page}: 퀴즈 탭 단원 이름이 자료와 같음`);
  }
});

test('세 화면: 공용 틀 → 단원 파일 순서, 상대 경로, 인라인 없음, 파일 600줄 이하', () => {
  for (const u of UNITS) {
    const file = `kids/subjects/math/${u.page}.html`;
    const html = read(file);
    const scripts = ['./js/math_explorer-shell.js', './js/math_explorer-quiz.js', ...u.js.map((j) => `./js/${j}.js`)];
    assertLoadsInOrder(html, 'script', scripts, u.page);
    const engine = assetTags(html, 'script').find((t) => t.url === '../../core/fairy-engine.js');
    assert.ok(engine && engine.start < html.indexOf('./js/math_explorer-shell.js'), '요정 엔진이 먼저');
    assertLoadsInOrder(html, 'style', ['../../css/math_explorer.css', `../../css/${u.css}.css`], u.page);
    assertRelativeAssets(file, 'script', assetTags(html, 'script').map((t) => t.src));
    assertRelativeAssets(file, 'style', assetTags(html, 'style').filter((t) => !/^https?:/.test(t.src)).map((t) => t.src));
    assertNoInlineStyleOrScript(html, u.page);
    for (const id of ['mxTabs', 'mxContainer', 'mxDoneCount', 'mxTotal', 'mxProgressFill', 'mxCompleteModal', 'mxCompleteReward', 'mxCompleteClose', 'mxGoQuiz']) {
      assert.ok(html.includes(`id="${id}"`), `${u.page}: #${id}`);
    }
    for (const f of [...u.js.map((j) => `${JS}${j}.js`), `kids/css/${u.css}.css`]) {
      assert.ok(lineCount(read(f)) <= 600, `${f}: ${lineCount(read(f))}줄`);
    }
    assert.ok(read('kids/subjects/math/math.html').includes(`href="${u.page}.html"`), `수학 대문에 ${u.page} 카드`);
  }
  for (const f of [`${JS}math_explorer-shell.js`, `${JS}math_explorer-quiz.js`, 'kids/css/math_explorer.css']) {
    assert.ok(lineCount(read(f)) <= 600, f);
  }
});

test('보상·음성 계약: 공용 틀만 보석을 주고, 단원 파일은 speechSynthesis·toISOString을 쓰지 않는다', () => {
  const shell = read(`${JS}math_explorer-shell.js`);
  assert.ok(shell.includes("grantRewardAndShowUI(amount, false, 'math')"));
  for (const name of ['speakFairyTTS', 'fairyPraise', 'fairyEncourage', 'fairyReward']) assert.ok(shell.includes(`'${name}'`), name);
  for (const u of UNITS) {
    for (const j of u.js) {
      const src = read(`${JS}${j}.js`);
      assert.doesNotMatch(src, /speechSynthesis|toISOString|grantRewardAndShowUI|sort\(\(\) => Math\.random/, j);
    }
  }
});
