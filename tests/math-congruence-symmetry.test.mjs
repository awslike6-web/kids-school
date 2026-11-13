// 5-2 수학 3단원 합동과 대칭: 도형 계산(geo)·노션 퀴즈 변환(quiz)·화면 파일 실림 순서를 검사한다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(
  fs.readFileSync(path.join(root, 'kids/subjects/math/js/congruence_symmetry-geo.js'), 'utf8'),
  sandbox
);
const G = sandbox.window.CongruenceGeo;

const plain = (x) => JSON.parse(JSON.stringify(x));

function orient(a, b, c) {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}

function onSegment(a, b, c) {
  return (
    orient(a, b, c) === 0 &&
    c[0] >= Math.min(a[0], b[0]) &&
    c[0] <= Math.max(a[0], b[0]) &&
    c[1] >= Math.min(a[1], b[1]) &&
    c[1] <= Math.max(a[1], b[1])
  );
}

function segmentsIntersect(p1, p2, p3, p4) {
  const o1 = orient(p1, p2, p3);
  const o2 = orient(p1, p2, p4);
  const o3 = orient(p3, p4, p1);
  const o4 = orient(p3, p4, p2);
  if ((o1 > 0 && o2 < 0 || o1 < 0 && o2 > 0) && (o3 > 0 && o4 < 0 || o3 < 0 && o4 > 0)) {
    return true;
  }
  return onSegment(p1, p2, p3) || onSegment(p1, p2, p4) || onSegment(p3, p4, p1) || onSegment(p3, p4, p2);
}

function isSimplePolygon(poly) {
  const n = poly.length;
  for (let i = 0; i < n; i++) {
    const a1 = poly[i];
    const a2 = poly[(i + 1) % n];
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      const b1 = poly[j];
      const b2 = poly[(j + 1) % n];
      if (segmentsIntersect(a1, a2, b1, b2)) return false;
    }
  }
  return true;
}

test('SHAPES coordinates are integers in 0..8 and simple polygons', () => {
  for (const [id, item] of Object.entries(G.SHAPES)) {
    assert.ok(item.name && typeof item.name === 'string', `${id} has name`);
    assert.ok(item.poly.length >= 3, `${id} has >= 3 vertices`);
    for (const [x, y] of item.poly) {
      assert.ok(Number.isInteger(x) && x >= 0 && x <= 8, `${id} x in 0..8: ${x}`);
      assert.ok(Number.isInteger(y) && y >= 0 && y <= 8, `${id} y in 0..8: ${y}`);
    }
    assert.equal(isSimplePolygon(plain(item.poly)), true, `${id} is simple`);
  }
});

test('SHAPES symmetry classification matches names', () => {
  const expected = {
    rightTriangle: { axes: 0, point: false },
    rightTrapezoid: { axes: 0, point: false },
    lHexagon: { axes: 0, point: false },
    smallL: { axes: 0, point: false },
    scaleneQuad: { axes: 0, point: false },
    isoscelesTriangle: { axes: 1, point: false },
    kite: { axes: 1, point: false },
    arrow: { axes: 1, point: false },
    parallelogram: { axes: 0, point: true },
    sHexagon: { axes: 0, point: true },
    rectangle: { axes: 2, point: true },
    square: { axes: 4, point: true },
    rhombus: { axes: 2, point: true },
    wideHexagon: { axes: 2, point: true }
  };

  for (const [id, exp] of Object.entries(expected)) {
    const poly = G.SHAPES[id].poly;
    assert.equal(G.symmetryAxes(poly).length, exp.axes, `${id} symmetryAxes count`);
    assert.equal(G.isPointSymmetric(poly), exp.point, `${id} isPointSymmetric`);
  }
});

test('findCongruence finds all 8 rot/flip combinations and valid vertex map', () => {
  const base = G.SHAPES.rightTriangle.poly;
  for (const flip of [false, true]) {
    for (let rot = 0; rot < 4; rot++) {
      const transformed = G.transform(base, rot, flip);
      const shifted = transformed.map(([x, y]) => [x + 2, y + 3]);
      const res = plain(G.findCongruence(base, shifted));
      assert.ok(res !== null, `rot=${rot}, flip=${flip} should be congruent`);
      assert.equal(G.isCongruent(base, shifted), true);

      const actual = plain(G.transform(base, res.rot, res.flip));
      const normShifted = plain(G.normalize(shifted));
      assert.equal(res.map.length, base.length);
      assert.equal(new Set(res.map).size, base.length);
      for (let i = 0; i < base.length; i++) {
        assert.deepStrictEqual(actual[i], normShifted[res.map[i]]);
      }
    }
  }
});

test('scaled shape is not congruent', () => {
  const base = G.SHAPES.rightTriangle.poly;
  const scaled = base.map(([x, y]) => [x * 2, y * 2]);
  assert.equal(G.isCongruent(base, scaled), false);
  assert.equal(G.findCongruence(base, scaled), null);
});

test('reflectPoint works for vertical, horizontal, and diagonal axes without rounding', () => {
  assert.deepStrictEqual(plain(G.reflectPoint([1, 2], { a: [4, 0], b: [4, 8] })), [7, 2]);
  assert.deepStrictEqual(plain(G.reflectPoint([3, 1], { a: [0, 4], b: [8, 4] })), [3, 7]);
  assert.deepStrictEqual(plain(G.reflectPoint([1, 4], { a: [0, 0], b: [8, 8] })), [4, 1]);
  assert.deepStrictEqual(plain(G.reflectPoint([1, 2], { a: [0, 8], b: [8, 0] })), [6, 7]);
  assert.deepStrictEqual(plain(G.reflectPoint([1, 2], { a: [2.5, 0], b: [2.5, 8] })), [4, 2]);
  assert.deepStrictEqual(plain(G.reflectPoint([1, 2], { a: [2.25, 0], b: [2.25, 8] })), [3.5, 2]);
});

test('rotatePoint and rotateHalf work for 90, 180, 270 degrees CW in y-down', () => {
  const c = [4, 4];
  const p = [6, 3];
  assert.deepStrictEqual(plain(G.rotatePoint(p, c, 90)), [5, 6]);
  assert.deepStrictEqual(plain(G.rotatePoint(p, c, 180)), [2, 5]);
  assert.deepStrictEqual(plain(G.rotatePoint(p, c, 270)), [3, 2]);
  assert.deepStrictEqual(plain(G.rotateHalf(p, c)), [2, 5]);
});

test('angleAt computes interior angles accurately including concave polygons', () => {
  const rect = G.SHAPES.rectangle.poly;
  for (let i = 0; i < rect.length; i++) {
    assert.equal(G.angleAt(rect, i), 90);
  }

  const tri = G.SHAPES.rightTriangle.poly;
  const triAngles = tri.map((_, i) => G.angleAt(tri, i));
  assert.ok(triAngles.includes(90));
  const triSum = triAngles.reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(triSum - 180) <= 0.3, `triangle sum ${triSum}`);

  const lHex = G.SHAPES.lHexagon.poly;
  const lAngles = lHex.map((_, i) => G.angleAt(lHex, i));
  assert.ok(lAngles.includes(270));
  assert.equal(lAngles.reduce((a, b) => a + b, 0), 720);

  for (const [id, item] of Object.entries(G.SHAPES)) {
    const n = item.poly.length;
    const sum = item.poly.reduce((acc, _, i) => acc + G.angleAt(item.poly, i), 0);
    assert.ok(Math.abs(sum - (n - 2) * 180) <= 0.5, `${id} angle sum ${sum}`);
  }
});

test('makeLinePuzzle produces valid symmetric simple puzzles for seeds 1..300', () => {
  for (const orientation of ['v', 'h']) {
    for (let seed = 1; seed <= 300; seed++) {
      const p1 = plain(G.makeLinePuzzle(G.makeRng(seed), orientation));
      const p2 = plain(G.makeLinePuzzle(G.makeRng(seed), orientation));
      assert.deepStrictEqual(p1, p2);

      assert.equal(p1.answer.length, p1.given.length - 2);
      assert.equal(p1.full.length, p1.given.length + p1.answer.length);

      for (const [x, y] of p1.full) {
        assert.ok(Number.isInteger(x) && x >= 0 && x <= 8);
        assert.ok(Number.isInteger(y) && y >= 0 && y <= 8);
      }

      const reflected = p1.full.map((pt) => plain(G.reflectPoint(pt, p1.axis)));
      assert.equal(G.samePointSet(p1.full, reflected), true);
      assert.equal(isSimplePolygon(p1.full), true, `${orientation} seed ${seed} self-intersects`);
    }
  }
});

test('makePointPuzzle produces valid point-symmetric simple puzzles for seeds 1..300', () => {
  for (let seed = 1; seed <= 300; seed++) {
    const p1 = plain(G.makePointPuzzle(G.makeRng(seed)));
    const p2 = plain(G.makePointPuzzle(G.makeRng(seed)));
    assert.deepStrictEqual(p1, p2);
    assert.deepStrictEqual(p1.center, [4, 4]);

    assert.equal(p1.answer.length, p1.given.length);
    assert.equal(p1.full.length, p1.given.length * 2);

    for (const [x, y] of p1.full) {
      assert.ok(Number.isInteger(x) && x >= 0 && x <= 8);
      assert.ok(Number.isInteger(y) && y >= 0 && y <= 8);
    }

    const rotated = p1.full.map((pt) => plain(G.rotateHalf(pt, [4, 4])));
    assert.equal(G.samePointSet(p1.full, rotated), true);
    assert.equal(G.isPointSymmetric(p1.full), true);
    assert.equal(isSimplePolygon(p1.full), true, `point seed ${seed} self-intersects`);
  }
});

// ── 노션 퀴즈 변환 (quiz.js) ──
const quizBox = { window: {} };
vm.createContext(quizBox);
vm.runInContext(fs.readFileSync(path.join(root, 'kids/subjects/math/js/congruence_symmetry-quiz.js'), 'utf8'), quizBox);
const Q = quizBox.window.CSQuiz;

const rt = (s) => ({ type: 'rich_text', rich_text: [{ plain_text: s }] });
const page = (title, q, choices, answer, explain) => ({
  properties: {
    '제목': { type: 'title', title: [{ plain_text: title }] },
    '퀴즈 질문': rt(q),
    '보기 1~4': rt(choices),
    '정답': { type: 'number', number: answer },
    '해설': rt(explain)
  }
});

test('buildQuizFromPages keeps valid rows sorted by title and drops broken ones', () => {
  const list = plain(Q.buildQuizFromPages([
    page('Q02 대칭축', '질문2', '가\n나\n다', 3, '해설2'),
    page('Q01 합동', '질문1', ' 하나 \n\n둘 ', 1, '해설1'),
    page('Q03 정답 범위 밖', '질문3', '가\n나', 3, ''),
    page('Q04 보기 하나', '질문4', '가', 1, ''),
    page('Q05 질문 없음', '', '가\n나', 1, ''),
    { properties: null }
  ]));
  assert.deepEqual(list, [
    { id: '', title: 'Q01 합동', q: '질문1', choices: ['하나', '둘'], answerIndex: 0, explain: '해설1' },
    { id: '', title: 'Q02 대칭축', q: '질문2', choices: ['가', '나', '다'], answerIndex: 2, explain: '해설2' }
  ]);
  assert.deepEqual(plain(Q.buildQuizFromPages(undefined)), []);
  assert.equal(Q.UNIT, '3. 합동과 대칭');
});

test('page loads every congruence_symmetry script with relative paths in dependency order', () => {
  const html = fs.readFileSync(path.join(root, 'kids/subjects/math/congruence_symmetry.html'), 'utf8');
  const order = ['geo', 'views', 'fold', 'grid', 'quiz', 'main'].map((n) => html.indexOf(`./js/congruence_symmetry-${n}.js`));
  order.forEach((pos) => assert.ok(pos > 0, 'script tag present'));
  for (let i = 1; i < order.length; i++) assert.ok(order[i] > order[i - 1], 'scripts in order');
  assert.ok(html.indexOf('../../core/fairy-engine.js') < order[0], 'fairy engine before page scripts');
  assert.ok(!/(src|href)="\//.test(html), 'no absolute paths');
  for (const n of ['geo', 'views', 'fold', 'grid', 'quiz', 'main']) {
    const lines = fs.readFileSync(path.join(root, `kids/subjects/math/js/congruence_symmetry-${n}.js`), 'utf8').split('\n').length;
    assert.ok(lines < 800, `${n}.js under 800 lines (${lines})`);
  }
});
