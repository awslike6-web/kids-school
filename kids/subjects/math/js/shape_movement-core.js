// 초등 4학년 1학기 평면도형의 이동 탐험관 순수 계산 모듈 (MoveCore)
// 도형은 모눈 칸 좌표 꼭짓점 목록. 대칭이 없는 F 모양이라 뒤집기·돌리기 8가지 결과가 모두 다르다.
(function (global) {
  'use strict';

  // F 모양 (가로 3칸, 세로 4칸). y는 아래로 커진다.
  var SHAPE = [[0, 0], [3, 0], [3, 1], [1, 1], [1, 2], [2, 2], [2, 3], [1, 3], [1, 4], [0, 4]];

  // 움직임 이름(화면 글자)
  var OPS = {
    flipLR: '오른쪽으로 뒤집기',
    flipRL: '왼쪽으로 뒤집기',
    flipTB: '위쪽으로 뒤집기',
    flipBT: '아래쪽으로 뒤집기',
    cw90: '시계 방향으로 90°만큼 돌리기',
    cw180: '시계 방향으로 180°만큼 돌리기',
    cw270: '시계 방향으로 270°만큼 돌리기',
    ccw90: '시계 반대 방향으로 90°만큼 돌리기',
    ccw180: '시계 반대 방향으로 180°만큼 돌리기',
    cw360: '시계 방향으로 360°만큼 돌리기'
  };

  function rand(rng) {
    return typeof rng === 'function' ? rng : Math.random;
  }

  function randInt(lo, hi, rng) {
    return lo + Math.floor(rand(rng)() * (hi - lo + 1));
  }

  function pick(list, rng) {
    return list[Math.floor(rand(rng)() * list.length)];
  }

  function bounds(pts) {
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    pts.forEach(function (p) {
      if (p[0] < minX) minX = p[0];
      if (p[1] < minY) minY = p[1];
      if (p[0] > maxX) maxX = p[0];
      if (p[1] > maxY) maxY = p[1];
    });
    return { minX: minX, minY: minY, w: maxX - minX, h: maxY - minY };
  }

  // 왼쪽 위를 (0,0)으로 맞춤
  function normalize(pts) {
    var b = bounds(pts);
    return pts.map(function (p) { return [p[0] - b.minX + 0, p[1] - b.minY + 0]; });
  }

  // 한 번 움직이기 (제자리에서 모양만 바꾸고 왼쪽 위로 맞춤)
  function apply(pts, op) {
    var out;
    if (op === 'flipLR' || op === 'flipRL') out = pts.map(function (p) { return [-p[0], p[1]]; });
    else if (op === 'flipTB' || op === 'flipBT') out = pts.map(function (p) { return [p[0], -p[1]]; });
    else if (op === 'cw90' || op === 'ccw270') out = pts.map(function (p) { return [-p[1], p[0]]; });
    else if (op === 'cw180' || op === 'ccw180') out = pts.map(function (p) { return [-p[0], -p[1]]; });
    else if (op === 'cw270' || op === 'ccw90') out = pts.map(function (p) { return [p[1], -p[0]]; });
    else if (op === 'cw360' || op === 'id') out = pts.map(function (p) { return [p[0], p[1]]; });
    else throw new Error('모르는 움직임: ' + op);
    return normalize(out);
  }

  // 모양 비교용 열쇠: 꼭짓점 집합(시작점·순서와 무관)
  function key(pts) {
    return normalize(pts).map(function (p) { return p[0] + ',' + p[1]; }).sort().join(' ');
  }

  function same(a, b) {
    return key(a) === key(b);
  }

  // 1관 밀기 미션: 지금 위치 pos {x,y}에서 한 방향으로 n칸(1~4). 판 cols×rows 안에 도형이 남게.
  function makeSlide(rng, pos, cols, rows, shapeW, shapeH) {
    var dirs = [];
    var maxX = cols - shapeW;
    var maxY = rows - shapeH;
    if (pos.x < maxX) dirs.push({ dir: 'right', room: maxX - pos.x });
    if (pos.x > 0) dirs.push({ dir: 'left', room: pos.x });
    if (pos.y < maxY) dirs.push({ dir: 'down', room: maxY - pos.y });
    if (pos.y > 0) dirs.push({ dir: 'up', room: pos.y });
    var d = pick(dirs, rng);
    var n = randInt(1, Math.min(4, d.room), rng);
    var tx = pos.x + (d.dir === 'right' ? n : d.dir === 'left' ? -n : 0);
    var ty = pos.y + (d.dir === 'down' ? n : d.dir === 'up' ? -n : 0);
    return { dir: d.dir, n: n, target: { x: tx, y: ty } };
  }

  var DIR_NAMES = { right: '오른쪽', left: '왼쪽', up: '위쪽', down: '아래쪽' };

  // 2관 뒤집기 문제: 처음 → 나중을 보고 움직임 고르기. 정답은 뒤집기, 오답에 같은 결과가 나오는 움직임은 넣지 않는다.
  function makeFlipQuiz(rng) {
    var lr = pick(['flipLR', 'flipRL'], rng);
    var tb = pick(['flipTB', 'flipBT'], rng);
    var answerOp = rand(rng)() < 0.5 ? lr : tb;
    var ops = [answerOp, answerOp === lr ? tb : lr, 'cw180'];
    return quiz(ops, answerOp);
  }

  // 3관 돌리기 문제: 정답은 돌리기. 시계 방향 270° = 시계 반대 방향 90°라서 둘 중 하나만 보기에 둔다.
  function makeTurnQuiz(rng) {
    var quarterBack = pick(['ccw90', 'cw270'], rng);
    var ops = ['cw90', 'cw180', quarterBack];
    var answerOp = pick(ops, rng);
    return quiz(ops, answerOp);
  }

  function quiz(ops, answerOp) {
    var after = apply(SHAPE, answerOp);
    var keys = ops.map(function (op) { return key(apply(SHAPE, op)); });
    return {
      answerOp: answerOp,
      ops: ops,
      before: SHAPE,
      after: after,
      choices: ops.map(function (op) { return OPS[op]; }),
      answerIndex: ops.indexOf(answerOp),
      distinct: keys.filter(function (k, i) { return keys.indexOf(k) === i; }).length === ops.length
    };
  }

  // 4관 무늬 미션: 3×3 타일의 돌린 횟수(0~3, 한 번에 시계 방향 90°) 목표. 규칙 무늬, 직전 규칙과 다름.
  var PATTERN_RULES = {
    checker: function (r, c) { return (r + c) % 2; },
    columns: function (r, c) { return c % 4; },
    rows: function (r) { return (r * 2) % 4; },
    pinwheel: function (r, c) { return (r * 3 + c) % 4; },
    diagonal: function (r, c) { return (r + c) % 4; }
  };

  function makePattern(rng, prevRule) {
    var names = Object.keys(PATTERN_RULES);
    var rule;
    var guard = 0;
    do {
      rule = pick(names, rng);
      guard += 1;
    } while (rule === prevRule && guard < 20);
    var turns = [];
    for (var r = 0; r < 3; r += 1) for (var c = 0; c < 3; c += 1) turns.push(PATTERN_RULES[rule](r, c));
    return { rule: rule, turns: turns };
  }

  global.MoveCore = {
    SHAPE: SHAPE,
    OPS: OPS,
    DIR_NAMES: DIR_NAMES,
    PATTERN_RULES: PATTERN_RULES,
    bounds: bounds,
    normalize: normalize,
    apply: apply,
    key: key,
    same: same,
    makeSlide: makeSlide,
    makeFlipQuiz: makeFlipQuiz,
    makeTurnQuiz: makeTurnQuiz,
    makePattern: makePattern
  };
})(typeof window !== 'undefined' ? window : globalThis);
