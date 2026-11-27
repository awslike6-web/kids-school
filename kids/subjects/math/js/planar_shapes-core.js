// 초등 3학년 1학기 평면도형 탐험관 순수 계산 모듈 (PlanarCore)
// 1관 선분·반직선·직선 이름 · 2관 각과 직각 · 3관 직각삼각형·직사각형·정사각형
(function (global) {
  'use strict';

  var LETTERS = ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ'];
  var LINE_KINDS = ['segment', 'ray-right', 'ray-left', 'line'];
  var ANGLES = [30, 45, 60, 90, 90, 120, 135, 150]; // 직각이 자주 나오게 90을 두 번
  var SHAPE_NAMES = ['직각삼각형', '직사각형', '정사각형'];
  var SHAPE_KINDS = ['rt_tri', 'rect', 'square'];

  function rand(rng) {
    return typeof rng === 'function' ? rng : Math.random;
  }

  function randInt(lo, hi, rng) {
    return lo + Math.floor(rand(rng)() * (hi - lo + 1));
  }

  function pick(list, rng) {
    return list[Math.floor(rand(rng)() * list.length)];
  }

  function pickOther(list, prev, rng) {
    var v;
    var guard = 0;
    do {
      v = pick(list, rng);
      guard += 1;
    } while (v === prev && guard < 20);
    return v;
  }

  // 서로 다른 자음 n개 (순서대로 이어진 글자: ㄱㄴ, ㄷㄹㅁ …)
  function letters(n, rng) {
    var start = randInt(0, LETTERS.length - n, rng);
    return LETTERS.slice(start, start + n);
  }

  // 1관: 선 그림 → 이름. 점은 왼쪽 L·오른쪽 R.
  //  segment: 양 끝이 점 / ray-right: L에서 시작해 R 쪽으로 끝없이 / ray-left: R에서 시작해 L 쪽으로 / line: 양쪽으로 끝없이
  // 선분·직선은 두 점 순서를 바꿔 불러도 같으므로 순서만 바꾼 이름은 오답에 넣지 않는다.
  function makeLine(rng, prevKind) {
    var pair = letters(2, rng);
    if (rand(rng)() < 0.5) pair = [pair[1], pair[0]];
    var L = pair[0];
    var R = pair[1];
    var kind = pickOther(LINE_KINDS, prevKind, rng);
    var choices;
    if (kind === 'segment') choices = ['선분 ' + L + R, '반직선 ' + L + R, '직선 ' + L + R];
    else if (kind === 'ray-right') choices = ['반직선 ' + L + R, '반직선 ' + R + L, '선분 ' + L + R];
    else if (kind === 'ray-left') choices = ['반직선 ' + R + L, '반직선 ' + L + R, '직선 ' + L + R];
    else choices = ['직선 ' + L + R, '반직선 ' + L + R, '선분 ' + L + R];
    return { kind: kind, left: L, right: R, choices: choices, answerIndex: 0 };
  }

  // 2관: 각. kind 'right'(직각인지 비교) | 'vertex'(꼭짓점 찾기). 점 이름은 [한 변 끝, 꼭짓점, 다른 변 끝].
  function makeAngle(rng, prevKind) {
    var kind = pickOther(['right', 'right', 'vertex'], prevKind === 'vertex' ? 'vertex' : null, rng);
    var deg = pick(ANGLES, rng);
    var names = letters(3, rng);
    var p = { kind: kind, deg: deg, names: names, angleName: '각 ' + names.join('') };
    if (kind === 'right') {
      p.choices = ['직각이에요', '직각보다 작아요', '직각보다 커요'];
      p.answerIndex = deg === 90 ? 0 : (deg < 90 ? 1 : 2);
      p.fixed = true;
    } else {
      p.choices = ['점 ' + names[1], '점 ' + names[0], '점 ' + names[2]];
      p.answerIndex = 0;
      p.fixed = false;
    }
    return p;
  }

  // 3관: 모눈 위 도형 이름. w·h는 칸 수(2~6). 직사각형은 w≠h, 정사각형은 w=h.
  // 직각삼각형의 직각 꼭짓점 corner: 0 왼쪽 아래 · 1 오른쪽 아래 · 2 왼쪽 위 · 3 오른쪽 위
  function makeShape(rng, prevKind) {
    var kind = pickOther(SHAPE_KINDS, prevKind, rng);
    var w = randInt(2, 6, rng);
    var h;
    if (kind === 'square') h = w;
    else if (kind === 'rect') {
      do { h = randInt(2, 6, rng); } while (h === w);
    } else h = randInt(2, 6, rng);
    return {
      kind: kind,
      w: w,
      h: h,
      corner: kind === 'rt_tri' ? randInt(0, 3, rng) : null,
      rightAngles: kind === 'rt_tri' ? 1 : 4,
      choices: SHAPE_NAMES.slice(),
      answerIndex: SHAPE_KINDS.indexOf(kind),
      fixed: true
    };
  }

  // 직각삼각형 세 꼭짓점(칸 좌표, 왼쪽 위가 0,0): 직각 꼭짓점이 첫째
  function triPoints(w, h, corner) {
    var BL = [0, h], BR = [w, h], TL = [0, 0], TR = [w, 0];
    if (corner === 0) return [BL, TL, BR];
    if (corner === 1) return [BR, BL, TR];
    if (corner === 2) return [TL, BL, TR];
    return [TR, BR, TL];
  }

  global.PlanarCore = {
    LETTERS: LETTERS,
    LINE_KINDS: LINE_KINDS,
    ANGLES: ANGLES,
    SHAPE_NAMES: SHAPE_NAMES,
    SHAPE_KINDS: SHAPE_KINDS,
    letters: letters,
    makeLine: makeLine,
    makeAngle: makeAngle,
    makeShape: makeShape,
    triPoints: triPoints
  };
})(typeof window !== 'undefined' ? window : globalThis);
