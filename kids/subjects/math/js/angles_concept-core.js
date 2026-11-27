// 초등 4학년 1학기 각도 탐험관 순수 계산 모듈 (AngleCore)
// 각은 수학 좌표 기준(0°=오른쪽, 시계 반대 방향으로 커짐). SVG에 그릴 때만 y를 뒤집는다.
(function (global) {
  'use strict';

  var KIND_NAMES = { acute: '예각', right: '직각', obtuse: '둔각' };
  var KINDS = ['acute', 'right', 'obtuse'];

  function rand(rng) {
    return typeof rng === 'function' ? rng : Math.random;
  }

  function randInt(lo, hi, rng) {
    return lo + Math.floor(rand(rng)() * (hi - lo + 1));
  }

  function pick(list, rng) {
    return list[Math.floor(rand(rng)() * list.length)];
  }

  function shuffle(list, rng) {
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i -= 1) {
      var j = Math.floor(rand(rng)() * (i + 1));
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  function rad(deg) {
    return deg * Math.PI / 180;
  }

  function round2(v) {
    return Math.round(v * 100) / 100;
  }

  // SVG 점 (y는 아래로 커짐)
  function polar(cx, cy, r, deg) {
    return [round2(cx + r * Math.cos(rad(deg))), round2(cy - r * Math.sin(rad(deg)))];
  }

  // 부채꼴: from°에서 to°까지 시계 반대 방향(SVG sweep 0)
  function wedgePath(cx, cy, r, from, to) {
    var a = polar(cx, cy, r, from);
    var b = polar(cx, cy, r, to);
    var large = to - from > 180 ? 1 : 0;
    return 'M ' + cx + ' ' + cy + ' L ' + a[0] + ' ' + a[1] + ' A ' + r + ' ' + r + ' 0 ' + large + ' 0 ' + b[0] + ' ' + b[1] + ' Z';
  }

  // 각의 종류 (0°·180°·그 밖은 null)
  function kind(deg) {
    if (deg > 0 && deg < 90) return 'acute';
    if (deg === 90) return 'right';
    if (deg > 90 && deg < 180) return 'obtuse';
    return null;
  }

  // 정답 근처 오답 두 개 (lo~hi 안, 서로 다르게)
  function nearMisses(answer, rng, lo, hi) {
    var pool = [answer - 20, answer - 10, answer + 10, answer + 20].filter(function (v) {
      return v >= lo && v <= hi;
    });
    return shuffle(pool, rng).slice(0, 2);
  }

  // 1관 각도기 읽기: 10° 단위 20°~160°(90° 제외, 너무 좁은 각은 변이 눈금을 가림). 밑금 쪽(side)에 따라 읽을 눈금이 다르다.
  // 오답: 반대쪽 눈금으로 읽은 값(180-각), 한 칸 잘못 센 값(±10).
  function makeRead(rng, prevDeg) {
    var deg;
    var guard = 0;
    do {
      deg = randInt(2, 16, rng) * 10;
      guard += 1;
    } while ((deg === 90 || deg === prevDeg) && guard < 50);
    var side = rand(rng)() < 0.5 ? 'right' : 'left';
    var off = pick([deg - 10, deg + 10].filter(function (v) { return v >= 10 && v <= 170; }), rng);
    return {
      deg: deg,
      side: side,
      // 밑금 위 변과 다른 변의 방향(수학 각)
      baseAngle: side === 'right' ? 0 : 180,
      rayAngle: side === 'right' ? deg : 180 - deg,
      choices: [deg + '°', (180 - deg) + '°', off + '°'],
      answer: 0,
      wrongScale: 1
    };
  }

  // 2관 각 만들기 목표: 종류를 번갈아(직전과 다른 종류), 5° 단위
  function makeBuild(rng, prevKind) {
    var k;
    var guard = 0;
    do {
      k = rand(rng)() < 0.2 ? 'right' : pick(['acute', 'obtuse'], rng);
      guard += 1;
    } while (k === prevKind && guard < 50);
    var target = k === 'right' ? 90 : k === 'acute' ? randInt(4, 16, rng) * 5 : randInt(20, 34, rng) * 5;
    return { target: target, kind: k };
  }

  // 각도 맞추기 판정 문장 재료: 지금 각과 목표의 차이
  function compareText(now, target) {
    if (now === target) return 'same';
    return now < target ? 'less' : 'more';
  }

  // 삼각형 꼭짓점 (수학 좌표): 밑변 (0,0)-(1,0), A=왼쪽 아래 각, B=오른쪽 아래 각
  function triPoints(A, B) {
    var C = 180 - A - B;
    var L = Math.sin(rad(B)) / Math.sin(rad(C));
    return [[0, 0], [1, 0], [L * Math.cos(rad(A)), L * Math.sin(rad(A))]];
  }

  // 사각형 꼭짓점 (수학 좌표, 시계 반대 방향): P0 왼쪽 아래, P1 오른쪽 아래, P2 오른쪽 위, P3 왼쪽 위
  // angles = [P0, P1, P2, P3의 각], 밑변 1, 오른쪽 변 s. 나머지 두 변 길이를 풀어 닫는다. 실패하면 null.
  function quadPoints(angles, s) {
    var A = angles[0];
    var B = angles[1];
    var C = angles[2];
    var h1 = 180 - B;
    var h2 = 360 - B - C;
    var h3 = 180 + A;
    var p2 = [1 + s * Math.cos(rad(h1)), s * Math.sin(rad(h1))];
    // p2 + t·e(h2) + u·e(h3) = 0
    var ax = Math.cos(rad(h2));
    var ay = Math.sin(rad(h2));
    var bx = Math.cos(rad(h3));
    var by = Math.sin(rad(h3));
    var det = ax * by - ay * bx;
    if (Math.abs(det) < 1e-9) return null;
    var t = (-p2[0] * by + p2[1] * bx) / det;
    var u = (-ax * p2[1] + ay * p2[0]) / det;
    if (!(t > 0.5 && u > 0.5)) return null;
    var p3 = [p2[0] + t * ax, p2[1] + t * ay];
    return [[0, 0], [1, 0], p2, p3];
  }

  // 꼭짓점 i의 안쪽 각 방향: 다음 꼭짓점 쪽에서 시작해 시계 반대 방향으로 각만큼 (시계 반대 방향 다각형)
  function cornerStart(pts, i) {
    var v = pts[i];
    var n = pts[(i + 1) % pts.length];
    var d = Math.atan2(n[1] - v[1], n[0] - v[0]) * 180 / Math.PI;
    return (d + 360) % 360;
  }

  // 실제 꼭짓점 좌표로 잰 안쪽 각
  function measure(pts, i) {
    var v = pts[i];
    var p = pts[(i + pts.length - 1) % pts.length];
    var n = pts[(i + 1) % pts.length];
    var a1 = Math.atan2(n[1] - v[1], n[0] - v[0]);
    var a2 = Math.atan2(p[1] - v[1], p[0] - v[0]);
    var d = (a2 - a1) * 180 / Math.PI;
    return ((d % 360) + 360) % 360;
  }

  // 수학 좌표 점들을 SVG 상자(w×h, 여백 pad)에 맞춤: y 뒤집기, 가운데 정렬
  function fit(pts, w, h, pad) {
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    pts.forEach(function (p) {
      minX = Math.min(minX, p[0]);
      maxX = Math.max(maxX, p[0]);
      minY = Math.min(minY, p[1]);
      maxY = Math.max(maxY, p[1]);
    });
    var k = Math.min((w - 2 * pad) / (maxX - minX), (h - 2 * pad) / (maxY - minY));
    var ox = (w - (maxX - minX) * k) / 2;
    var oy = (h - (maxY - minY) * k) / 2;
    return pts.map(function (p) {
      return [round2(ox + (p[0] - minX) * k), round2(h - oy - (p[1] - minY) * k)];
    });
  }

  // 3관 삼각형 문제: 10° 단위, 가장 작은 각 30° 이상(너무 가늘면 각 표시가 겹침). 가려진 각 하나(직전과 다른 자리).
  function makeTriangle(rng, prevHidden) {
    var A, B, C;
    do {
      A = randInt(3, 10, rng) * 10;
      B = randInt(3, 8, rng) * 10;
      C = 180 - A - B;
    } while (C < 30);
    var angles = [A, B, C];
    var hidden;
    var guard = 0;
    do {
      hidden = randInt(0, 2, rng);
      guard += 1;
    } while (hidden === prevHidden && guard < 20);
    return polyQuestion(angles, hidden, 180, triPoints(A, B), rng);
  }

  // 4관 사각형 문제: 5° 단위 각 60°~130°, 합 360°. 그릴 수 있는 모양이 나올 때까지 다시 뽑는다.
  function makeQuad(rng, prevHidden) {
    var angles, pts;
    var guard = 0;
    do {
      angles = [randInt(12, 26, rng) * 5, randInt(12, 26, rng) * 5, randInt(12, 26, rng) * 5];
      angles.push(360 - angles[0] - angles[1] - angles[2]);
      pts = angles[3] >= 60 && angles[3] <= 130 ? quadPoints(angles, 0.6 + rand(rng)() * 0.4) : null;
      guard += 1;
    } while (!pts && guard < 500);
    if (!pts) {
      angles = [90, 90, 90, 90];
      pts = [[0, 0], [1, 0], [1, 0.7], [0, 0.7]];
    }
    var hidden;
    var g2 = 0;
    do {
      hidden = randInt(0, 3, rng);
      g2 += 1;
    } while (hidden === prevHidden && g2 < 20);
    return polyQuestion(angles, hidden, 360, pts, rng);
  }

  function polyQuestion(angles, hidden, total, pts, rng) {
    var answer = angles[hidden];
    var shown = angles.filter(function (a, i) { return i !== hidden; });
    var misses = nearMisses(answer, rng, 10, 170);
    return {
      angles: angles,
      hidden: hidden,
      total: total,
      pts: pts,
      shown: shown,
      answerValue: answer,
      choices: [answer + '°'].concat(misses.map(function (v) { return v + '°'; })),
      answer: 0,
      formula: total + '° − ' + shown.map(function (a) { return a + '°'; }).join(' − ') + ' = ' + answer + '°'
    };
  }

  global.AngleCore = {
    KIND_NAMES: KIND_NAMES,
    KINDS: KINDS,
    polar: polar,
    wedgePath: wedgePath,
    kind: kind,
    nearMisses: nearMisses,
    makeRead: makeRead,
    makeBuild: makeBuild,
    compareText: compareText,
    triPoints: triPoints,
    quadPoints: quadPoints,
    cornerStart: cornerStart,
    measure: measure,
    fit: fit,
    makeTriangle: makeTriangle,
    makeQuad: makeQuad
  };
})(typeof window !== 'undefined' ? window : globalThis);
