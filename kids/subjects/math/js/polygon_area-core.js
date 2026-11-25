/* 다각형의 둘레와 넓이 (5-1 6단원) — 순수 계산 모듈 (DOM 없음) */
(function (global) {
  'use strict';

  var M = global.MixCalcCore;

  var LAB_KINDS = {
    1: ['peri-regular', 'peri-rect', 'peri-para'],
    2: ['area-count', 'area-rect', 'area-square'],
    3: ['unit-m', 'unit-convert', 'unit-cm-m'],
    4: ['para', 'para', 'para'],
    5: ['tri', 'tri', 'tri-out'],
    6: ['rhombus', 'trapezoid', 'quad']
  };

  var MIXED_KINDS = [
    'peri-regular', 'peri-rect', 'peri-para-h',
    'area-rect', 'area-square', 'unit-m',
    'para', 'tri', 'tri-out', 'rhombus', 'trapezoid'
  ];

  var KIND_ORDER = {};
  ['peri-regular', 'peri-rect', 'peri-para', 'peri-para-h', 'area-count', 'area-rect', 'area-square',
    'unit-m', 'unit-convert', 'unit-cm-m', 'para', 'tri', 'tri-out', 'rhombus', 'trapezoid'
  ].forEach(function (k, i) { KIND_ORDER[k] = i; });

  var REG_NAMES = {
    3: '정삼각형', 4: '정사각형', 5: '정오각형',
    6: '정육각형', 7: '정칠각형', 8: '정팔각형'
  };

  // 기울어진 변에 정수가 되는 피타고라스 세 수: [가로 차, 세로 차, 빗변]
  var TRIPLES = [[3, 4, 5], [4, 3, 5], [6, 8, 10], [8, 6, 10]];

  var HEIGHT_LINE = '높이: 밑변과 직각으로 만나는 선의 길이';
  var TRAP_HEIGHT_LINE = '높이: 윗변과 아랫변 사이를 직각으로 잇는 선의 길이';

  var HINTS = {
    'n-miss': '변의 수를 다시 세어 봐요.',
    'n-plus': '변의 수를 다시 세어 봐요.',
    'add': '넓이는 곱해서 구해요.',
    'half': '둘레는 한 바퀴예요. 두 변을 더한 것을 2번 해요.',
    'four': '가로와 세로는 2개씩 있어요. × 2예요.',
    'area': '곱하면 넓이예요. 둘레는 변의 길이를 모두 더해요.',
    'paren': '먼저 더해야 하니 ( )로 묶어요.',
    'side-two': '마름모는 길이가 같은 변이 4개예요.',
    'height': '점선은 높이예요. 둘레는 도형의 변을 따라 재요.',
    'perimeter': '넓이는 칸 수예요. 둘레를 구한 것 같아요.',
    'row-slip': '몇 줄인지 다시 세어 봐요.',
    'double': '한 변의 길이 × 한 변의 길이예요.',
    'side-only': '1 m²는 100 cm × 100 cm예요.',
    'n-zero': '1 m² = 10000 cm², 0이 4개예요.',
    'zero-extra': '1 m² = 10000 cm², 0이 4개예요.',
    'no-convert': 'cm를 m로 바꾼 뒤 곱해요.',
    'half-convert': '100 cm = 1 m예요. 가로도 세로도 m로 바꿔요.',
    'slant': '기울어진 변은 높이가 아니에요. 밑변과 직각인 점선이 높이예요.',
    'slant-full': '기울어진 변은 높이가 아니에요. 밑변과 직각인 점선이 높이예요.',
    'extra-half': '평행사변형의 넓이는 ÷ 2를 하지 않아요.',
    'half-miss': '{도형}의 넓이는 ÷ 2를 해요.',
    'diag-add': '두 대각선을 곱한 뒤 ÷ 2를 해요.',
    'times-two': '× 2가 아니라 ÷ 2예요.',
    'wrong-pair': '평행한 두 변(윗변과 아랫변)을 더해요.',
    'mult-sides': '윗변과 아랫변은 곱하지 않고 더해요.',
    'calc-slip': '식은 맞아요. ( ) 먼저, × ÷는 앞에서부터 다시 계산해 봐요.',
    'fix': '공식 카드를 다시 보며 식을 세워 봐요.'
  };

  function hintFor(p, mistake) {
    if (mistake === 'add' && p && p.measure === 'perimeter') {
      return '한 변의 길이에 변의 수를 곱해요.';
    }
    var msg = HINTS[mistake] || HINTS.fix;
    if (p && p.shape) msg = msg.replace('{도형}', p.shape);
    return msg;
  }

  function randInt(lo, hi, rng) {
    return Math.floor(rng() * (hi - lo + 1)) + lo;
  }

  function round2(x) { return Math.round(x * 100) / 100; }

  function findTriple(dx, dy) {
    for (var i = 0; i < TRIPLES.length; i++) {
      if (TRIPLES[i][0] === dx && TRIPLES[i][1] === dy) return TRIPLES[i][2];
    }
    return 0;
  }

  function makeFig(opts) {
    return {
      scale: opts.scale,
      w: opts.w,
      h: opts.h,
      grid: opts.grid,
      points: opts.points,
      labels: opts.labels || [],
      height: opts.height || null,
      diagonals: opts.diagonals || null,
      ticks: opts.ticks || null,
      cells: !!opts.cells
    };
  }

  function rectFig(w, h, scale, grid, labels, ticks, cells) {
    var pts = [[0, h], [0, 0], [w, 0], [w, h]];
    return makeFig({
      scale: scale, w: w, h: h, grid: grid,
      points: pts, labels: labels, ticks: ticks, cells: cells
    });
  }

  function regPolygonFig(n) {
    var pts = [], r = 4, i, ang, minX = 99, minY = 99, maxX = -99, maxY = -99;
    for (i = 0; i < n; i++) {
      ang = -Math.PI / 2 + (n % 2 === 0 ? Math.PI / n : 0) + (2 * Math.PI * i) / n; // 짝수 변은 윗변이 평평하게(정사각형이 마름모로 보이지 않게)
      var x = r * Math.cos(ang), y = r * Math.sin(ang);
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      pts.push([x, y]);
    }
    for (i = 0; i < n; i++) {
      pts[i][0] = round2(pts[i][0] - minX);
      pts[i][1] = round2(pts[i][1] - minY);
      if (pts[i][0] > maxX) maxX = pts[i][0];
      if (pts[i][1] > maxY) maxY = pts[i][1];
    }
    var ticks = [];
    for (i = 0; i < n; i++) ticks.push(i);
    return { pts: pts, w: maxX, h: maxY, ticks: ticks };
  }

  // --- 종류별 원료 풀 생성 ---
  var POOLS = {};

  function buildPool(kind) {
    var list = [], a, b, d, h, s, n, i, dir, t;
    if (kind === 'peri-regular') {
      for (n = 3; n <= 8; n++) {
        for (s = 2; s <= 12; s++) list.push({ n: n, s: s });
      }
    } else if (kind === 'peri-rect' || kind === 'area-rect') {
      for (a = 3; a <= 14; a++) {
        for (b = 2; b <= 8; b++) {
          if (a !== b) list.push({ a: a, b: b });
        }
      }
    } else if (kind === 'peri-para' || kind === 'peri-para-h' || kind === 'para') {
      for (i = 0; i < TRIPLES.length; i++) {
        t = TRIPLES[i]; d = t[0]; h = t[1]; s = t[2];
        for (b = d + 1; b <= 11; b++) {
          if (b + d <= 14 && h <= 8 && b * h <= 200) {
            list.push({ type: 'para', b: b, d: d, h: h, s: s, dir: 0 });
            list.push({ type: 'para', b: b, d: d, h: h, s: s, dir: 1 });
          }
        }
      }
      if (kind === 'peri-para') {
        for (s = 2; s <= 12; s++) list.push({ type: 'rhombus', s: s });
      }
    } else if (kind === 'area-count') {
      for (a = 3; a <= 8; a++) {
        for (b = 2; b <= 6; b++) list.push({ a: a, b: b });
      }
    } else if (kind === 'area-square') {
      for (s = 2; s <= 8; s++) list.push({ s: s });
    } else if (kind === 'unit-m') {
      for (a = 2; a <= 9; a++) {
        for (b = 2; b <= 9; b++) {
          if (a !== b) list.push({ a: a, b: b });
        }
      }
    } else if (kind === 'unit-convert') {
      for (n = 2; n <= 9; n++) list.push({ n: n });
    } else if (kind === 'unit-cm-m') {
      for (a = 100; a <= 900; a += 100) {
        for (b = 100; b <= 900; b += 100) {
          if (a !== b) list.push({ a: a, b: b });
        }
      }
    } else if (kind === 'tri') {
      for (i = 0; i < TRIPLES.length; i++) {
        t = TRIPLES[i]; d = t[0]; h = t[1]; s = t[2];
        for (b = d + 1; b <= 14; b++) {
          if ((b * h) % 2 === 0 && b * h <= 200) {
            list.push({ b: b, d: d, h: h, s: s, side: 'left' });
            list.push({ b: b, d: b - d, h: h, s: s, side: 'right' });
          }
        }
      }
    } else if (kind === 'tri-out') {
      for (i = 0; i < TRIPLES.length; i++) {
        t = TRIPLES[i]; d = t[0]; h = t[1]; s = t[2];
        for (b = 2; b <= 11; b++) {
          if (b + d <= 14 && h <= 8 && (b * h) % 2 === 0 && b * h <= 200) {
            list.push({ b: b, e: d, h: h, s: s, dir: 0 });
            list.push({ b: b, e: d, h: h, s: s, dir: 1 });
          }
        }
      }
    } else if (kind === 'rhombus') {
      for (a = 3; a <= 14; a++) {
        for (b = 2; b <= 8; b++) {
          if (a !== b && (a * b) % 2 === 0 && a * b <= 200) list.push({ p: a, q: b });
        }
      }
    } else if (kind === 'trapezoid') {
      for (b = 4; b <= 14; b++) {
        for (a = 2; a <= b - 2; a++) {
          for (h = 2; h <= 8; h++) {
            if (((a + b) * h) % 2 === 0 && (a + b) * h <= 200) {
              for (d = 1; d + a <= b - 1; d++) {
                s = findTriple(d, h);
                list.push({ a: a, b: b, h: h, d: d, s: s });
              }
            }
          }
        }
      }
    }
    return list;
  }

  function poolOf(kind) {
    if (!POOLS[kind]) POOLS[kind] = buildPool(kind);
    return POOLS[kind];
  }

  function rawKey(kind, r) {
    if (kind === 'peri-regular') return r.n + ',' + r.s;
    if (kind === 'peri-rect' || kind === 'area-count' || kind === 'area-rect' || kind === 'unit-m' || kind === 'unit-cm-m') {
      return r.a + ',' + r.b;
    }
    if (kind === 'area-square') return String(r.s);
    if (kind === 'unit-convert') return String(r.n);
    if (kind === 'peri-para' || kind === 'peri-para-h' || kind === 'para') {
      if (r.type === 'rhombus') return 'r,' + r.s;
      return r.b + ',' + r.d + ',' + r.h + ',' + r.dir;
    }
    if (kind === 'tri') return r.b + ',' + r.d + ',' + r.h + ',' + r.side;
    if (kind === 'tri-out') return r.b + ',' + r.e + ',' + r.h + ',' + r.dir;
    if (kind === 'rhombus') return r.p + ',' + r.q;
    if (kind === 'trapezoid') return r.a + ',' + r.b + ',' + r.h + ',' + r.d;
    return '';
  }

  function paraGeom(r, withHeight) {
    var b = r.b, d = r.d, h = r.h, s = r.s, w = b + d, pts, labels, ht = null;
    if (r.dir === 0) {
      pts = [[0, h], [d, 0], [w, 0], [b, h]];
      labels = [{ a: [b, h], b: [0, h], text: b + ' cm' }, { a: [0, h], b: [d, 0], text: s + ' cm' }];
      if (withHeight) ht = { top: [d, 0], foot: [d, h], text: h + ' cm', ext: null };
    } else {
      pts = [[d, h], [0, 0], [b, 0], [w, h]];
      labels = [{ a: [w, h], b: [d, h], text: b + ' cm' }, { a: [d, h], b: [0, 0], text: s + ' cm' }];
      if (withHeight) ht = { top: [b, 0], foot: [b, h], text: h + ' cm', ext: null };
    }
    return makeFig({ scale: true, w: w, h: h, grid: true, points: pts, labels: labels, height: ht });
  }

  function buildProblem(kind, r) {
    var shape, measure, unit, ask, fig, tokens, cardLines, twoStep = false, meta = r;

    if (kind === 'peri-regular') {
      var rg = regPolygonFig(r.n);
      shape = REG_NAMES[r.n]; measure = 'perimeter'; unit = 'cm';
      ask = '둘레는 몇 cm인가요?';
      fig = makeFig({
        scale: false, w: rg.w, h: rg.h, grid: false, points: rg.pts,
        labels: [{ a: rg.pts[0], b: rg.pts[1], text: r.s + ' cm' }], ticks: rg.ticks
      });
      tokens = [r.s, '×', r.n];
      cardLines = ['정다각형의 둘레 = 한 변의 길이 × 변의 수'];
    } else if (kind === 'peri-rect') {
      shape = '직사각형'; measure = 'perimeter'; unit = 'cm';
      ask = '둘레는 몇 cm인가요?';
      fig = rectFig(r.a, r.b, true, true, [
        { a: [0, 0], b: [r.a, 0], text: r.a + ' cm' },
        { a: [r.a, 0], b: [r.a, r.b], text: r.b + ' cm' }
      ]);
      tokens = ['(', r.a, '+', r.b, ')', '×', 2];
      cardLines = ['직사각형의 둘레 = (가로 + 세로) × 2'];
    } else if (kind === 'peri-para' || kind === 'peri-para-h') {
      measure = 'perimeter'; unit = 'cm'; ask = '둘레는 몇 cm인가요?';
      if (r.type === 'rhombus') {
        shape = '마름모';
        var rPts = [[0, 4.8], [3.6, 0], [9.6, 0], [6, 4.8]];
        fig = makeFig({
          scale: false, w: 9.6, h: 4.8, grid: false, points: rPts,
          labels: [{ a: rPts[1], b: rPts[2], text: r.s + ' cm' }], ticks: [0, 1, 2, 3]
        });
        tokens = [r.s, '×', 4];
        cardLines = ['마름모의 둘레 = 한 변의 길이 × 4'];
      } else {
        shape = '평행사변형';
        fig = paraGeom(r, kind === 'peri-para-h');
        tokens = ['(', r.b, '+', r.s, ')', '×', 2];
        cardLines = ['평행사변형의 둘레 = (한 변의 길이 + 다른 한 변의 길이) × 2'];
      }
    } else if (kind === 'area-count') {
      shape = '직사각형'; measure = 'area'; unit = 'cm²';
      ask = '넓이는 몇 cm²인가요?';
      fig = rectFig(r.a, r.b, true, true, [], null, true);
      tokens = [r.a, '×', r.b];
      cardLines = ['직사각형의 넓이 = 가로 × 세로'];
    } else if (kind === 'area-rect') {
      shape = '직사각형'; measure = 'area'; unit = 'cm²';
      ask = '넓이는 몇 cm²인가요?';
      fig = rectFig(r.a, r.b, true, true, [
        { a: [0, 0], b: [r.a, 0], text: r.a + ' cm' },
        { a: [r.a, 0], b: [r.a, r.b], text: r.b + ' cm' }
      ]);
      tokens = [r.a, '×', r.b];
      cardLines = ['직사각형의 넓이 = 가로 × 세로'];
    } else if (kind === 'area-square') {
      shape = '정사각형'; measure = 'area'; unit = 'cm²';
      ask = '넓이는 몇 cm²인가요?';
      fig = rectFig(r.s, r.s, true, true, [{ a: [0, 0], b: [r.s, 0], text: r.s + ' cm' }], [0, 1, 2, 3]);
      tokens = [r.s, '×', r.s];
      cardLines = ['정사각형의 넓이 = 한 변의 길이 × 한 변의 길이'];
    } else if (kind === 'unit-m') {
      shape = '직사각형'; measure = 'area'; unit = 'm²';
      ask = '넓이는 몇 m²인가요?';
      fig = rectFig(6, 4, false, false, [
        { a: [0, 0], b: [6, 0], text: r.a + ' m' },
        { a: [6, 0], b: [6, 4], text: r.b + ' m' }
      ]);
      tokens = [r.a, '×', r.b];
      cardLines = ['직사각형의 넓이 = 가로 × 세로'];
    } else if (kind === 'unit-convert') {
      shape = '정사각형'; measure = 'convert'; unit = 'cm²';
      ask = r.n + ' m²는 몇 cm²인가요?';
      fig = rectFig(4, 4, false, false, [
        { a: [0, 0], b: [4, 0], text: '100 cm' },
        { a: [4, 0], b: [4, 4], text: '100 cm' }
      ], [0, 1, 2, 3]);
      tokens = [r.n, '×', 10000];
      cardLines = ['1 m² = 10000 cm²'];
    } else if (kind === 'unit-cm-m') {
      shape = '직사각형'; measure = 'area'; unit = 'm²';
      ask = '넓이는 몇 m²인가요?';
      fig = rectFig(6, 4, false, false, [
        { a: [0, 0], b: [6, 0], text: r.a + ' cm' },
        { a: [6, 0], b: [6, 4], text: r.b + ' cm' }
      ]);
      tokens = ['(', r.a, '÷', 100, ')', '×', '(', r.b, '÷', 100, ')'];
      cardLines = ['직사각형의 넓이 = 가로 × 세로'];
    } else if (kind === 'para') {
      shape = '평행사변형'; measure = 'area'; unit = 'cm²'; twoStep = true;
      ask = '넓이는 몇 cm²인가요?';
      fig = paraGeom(r, true);
      tokens = [r.b, '×', r.h];
      cardLines = ['평행사변형의 넓이 = 밑변 × 높이', HEIGHT_LINE];
    } else if (kind === 'tri') {
      shape = '삼각형'; measure = 'area'; unit = 'cm²'; twoStep = true;
      ask = '넓이는 몇 cm²인가요?';
      var tPts = [[0, r.h], [r.d, 0], [r.b, r.h]];
      var slLabel = r.side === 'left'
        ? { a: [0, r.h], b: [r.d, 0], text: r.s + ' cm' }
        : { a: [r.d, 0], b: [r.b, r.h], text: r.s + ' cm' };
      fig = makeFig({
        scale: true, w: r.b, h: r.h, grid: true, points: tPts,
        labels: [{ a: [r.b, r.h], b: [0, r.h], text: r.b + ' cm' }, slLabel],
        height: { top: [r.d, 0], foot: [r.d, r.h], text: r.h + ' cm', ext: null }
      });
      tokens = [r.b, '×', r.h, '÷', 2];
      cardLines = ['삼각형의 넓이 = 밑변 × 높이 ÷ 2', HEIGHT_LINE];
    } else if (kind === 'tri-out') {
      shape = '삼각형'; measure = 'area'; unit = 'cm²'; twoStep = true;
      ask = '넓이는 몇 cm²인가요?';
      var tw = r.b + r.e, oPts, oLabels, oHt;
      if (r.dir === 0) {
        oPts = [[0, r.h], [tw, 0], [r.b, r.h]];
        oLabels = [{ a: [r.b, r.h], b: [0, r.h], text: r.b + ' cm' }, { a: [tw, 0], b: [r.b, r.h], text: r.s + ' cm' }];
        oHt = { top: [tw, 0], foot: [tw, r.h], text: r.h + ' cm', ext: { from: [r.b, r.h], to: [tw, r.h] } };
      } else {
        oPts = [[r.e, r.h], [0, 0], [tw, r.h]];
        oLabels = [{ a: [tw, r.h], b: [r.e, r.h], text: r.b + ' cm' }, { a: [r.e, r.h], b: [0, 0], text: r.s + ' cm' }];
        oHt = { top: [0, 0], foot: [0, r.h], text: r.h + ' cm', ext: { from: [r.e, r.h], to: [0, r.h] } };
      }
      fig = makeFig({ scale: true, w: tw, h: r.h, grid: true, points: oPts, labels: oLabels, height: oHt });
      tokens = [r.b, '×', r.h, '÷', 2];
      cardLines = ['삼각형의 넓이 = 밑변 × 높이 ÷ 2', HEIGHT_LINE];
    } else if (kind === 'rhombus') {
      shape = '마름모'; measure = 'area'; unit = 'cm²'; twoStep = true;
      ask = '넓이는 몇 cm²인가요?';
      var p2 = r.p / 2, q2 = r.q / 2;
      fig = makeFig({
        scale: true, w: r.p, h: r.q, grid: true,
        points: [[p2, 0], [r.p, q2], [p2, r.q], [0, q2]],
        diagonals: [
          { a: [0, q2], b: [r.p, q2], text: r.p + ' cm' },
          { a: [p2, 0], b: [p2, r.q], text: r.q + ' cm' }
        ]
      });
      tokens = [r.p, '×', r.q, '÷', 2];
      cardLines = ['마름모의 넓이 = 한 대각선 × 다른 대각선 ÷ 2'];
    } else if (kind === 'trapezoid') {
      shape = '사다리꼴'; measure = 'area'; unit = 'cm²'; twoStep = true;
      ask = '넓이는 몇 cm²인가요?';
      var trPts = [[0, r.h], [r.d, 0], [r.d + r.a, 0], [r.b, r.h]];
      var trLabels = [
        { a: [r.d, 0], b: [r.d + r.a, 0], text: r.a + ' cm' },
        { a: [r.b, r.h], b: [0, r.h], text: r.b + ' cm' }
      ];
      if (r.s) trLabels.push({ a: [0, r.h], b: [r.d, 0], text: r.s + ' cm' });
      fig = makeFig({
        scale: true, w: r.b, h: r.h, grid: true, points: trPts, labels: trLabels,
        height: { top: [r.d, 0], foot: [r.d, r.h], text: r.h + ' cm', ext: null }
      });
      tokens = ['(', r.a, '+', r.b, ')', '×', r.h, '÷', 2];
      cardLines = ['사다리꼴의 넓이 = (윗변 + 아랫변) × 높이 ÷ 2', TRAP_HEIGHT_LINE];
    }

    var value = M.evalWith(tokens, 'rule');
    return {
      kind: kind, shape: shape, measure: measure, unit: unit, ask: ask,
      fig: fig, formula: { tokens: tokens, text: M.text(tokens) },
      value: value, answerText: value + ' ' + unit,
      twoStep: twoStep, cardLines: cardLines,
      key: kind + '|' + rawKey(kind, r), _raw: meta
    };
  }

  function makeProblem(kind, rng) {
    var pool = poolOf(kind);
    return buildProblem(kind, pool[randInt(0, pool.length - 1, rng)]);
  }

  // --- 오답 보기 생성 ---
  function candidatesFor(p) {
    var k = p.kind, r = p._raw, list = [];
    if (k === 'peri-regular') {
      list.push({ mistake: 'n-miss', tokens: [r.s, '×', '(', r.n, '−', 1, ')'] });
      list.push({ mistake: 'add', tokens: [r.s, '+', r.n] });
      list.push({ mistake: 'n-plus', tokens: [r.s, '×', '(', r.n, '+', 1, ')'] });
    } else if (k === 'peri-rect') {
      list.push({ mistake: 'half', tokens: [r.a, '+', r.b] });
      list.push({ mistake: 'area', tokens: [r.a, '×', r.b] });
      list.push({ mistake: 'paren', tokens: [r.a, '+', r.b, '×', 2] });
      list.push({ mistake: 'four', tokens: ['(', r.a, '+', r.b, ')', '×', 4] });
    } else if (k === 'peri-para') {
      if (r.type === 'rhombus') {
        list.push({ mistake: 'side-two', tokens: [r.s, '×', 2] });
        list.push({ mistake: 'n-miss', tokens: [r.s, '×', 3] });
        list.push({ mistake: 'add', tokens: [r.s, '+', 4] });
      } else {
        list.push({ mistake: 'half', tokens: [r.b, '+', r.s] });
        list.push({ mistake: 'area', tokens: [r.b, '×', r.s] });
        list.push({ mistake: 'paren', tokens: [r.b, '+', r.s, '×', 2] });
      }
    } else if (k === 'peri-para-h') {
      list.push({ mistake: 'height', tokens: ['(', r.b, '+', r.h, ')', '×', 2] });
      list.push({ mistake: 'half', tokens: [r.b, '+', r.s] });
      list.push({ mistake: 'paren', tokens: [r.b, '+', r.s, '×', 2] });
      list.push({ mistake: 'four', tokens: ['(', r.b, '+', r.s, ')', '×', 4] });
    } else if (k === 'area-count' || k === 'area-rect' || k === 'unit-m') {
      list.push({ mistake: 'perimeter', tokens: ['(', r.a, '+', r.b, ')', '×', 2] });
      list.push({ mistake: 'add', tokens: [r.a, '+', r.b] });
      list.push({ mistake: 'row-slip', tokens: [r.a, '×', r.b + 1] });
      list.push({ mistake: 'row-slip', tokens: [r.a, '×', r.b - 1] });
    } else if (k === 'area-square') {
      list.push({ mistake: 'perimeter', tokens: [r.s, '×', 4] });
      list.push({ mistake: 'double', tokens: [r.s, '×', 2] });
      list.push({ mistake: 'row-slip', tokens: [r.s, '×', r.s + 1] });
      list.push({ mistake: 'row-slip', tokens: [r.s, '×', r.s - 1] });
    } else if (k === 'unit-convert') {
      list.push({ mistake: 'side-only', tokens: [r.n, '×', 100] });
      list.push({ mistake: 'n-zero', tokens: [r.n, '×', 1000] });
      list.push({ mistake: 'zero-extra', tokens: [r.n, '×', 100000] });
    } else if (k === 'unit-cm-m') {
      list.push({ mistake: 'no-convert', tokens: [r.a, '×', r.b] });
      list.push({ mistake: 'half-convert', tokens: ['(', r.a, '÷', 10, ')', '×', '(', r.b, '÷', 10, ')'] });
      list.push({ mistake: 'add', tokens: [r.a, '÷', 100, '+', r.b, '÷', 100] });
      list.push({ mistake: 'perimeter', tokens: ['(', r.a, '÷', 100, '+', r.b, '÷', 100, ')', '×', 2] });
    } else if (k === 'para') {
      list.push({ mistake: 'slant', tokens: [r.b, '×', r.s] });
      list.push({ mistake: 'extra-half', tokens: [r.b, '×', r.h, '÷', 2] });
      list.push({ mistake: 'perimeter', tokens: ['(', r.b, '+', r.s, ')', '×', 2] });
    } else if (k === 'tri' || k === 'tri-out') {
      list.push({ mistake: 'half-miss', tokens: [r.b, '×', r.h] });
      list.push({ mistake: 'slant', tokens: [r.b, '×', r.s, '÷', 2] });
      list.push({ mistake: 'slant-full', tokens: [r.b, '×', r.s] });
    } else if (k === 'rhombus') {
      list.push({ mistake: 'half-miss', tokens: [r.p, '×', r.q] });
      list.push({ mistake: 'diag-add', tokens: ['(', r.p, '+', r.q, ')', '÷', 2] });
      list.push({ mistake: 'times-two', tokens: [r.p, '×', r.q, '×', 2] });
    } else if (k === 'trapezoid') {
      list.push({ mistake: 'half-miss', tokens: ['(', r.a, '+', r.b, ')', '×', r.h] });
      list.push({ mistake: 'paren', tokens: [r.a, '+', r.b, '×', r.h, '÷', 2] });
      list.push({ mistake: 'wrong-pair', tokens: ['(', r.a, '+', r.h, ')', '×', r.b, '÷', 2] });
      list.push({ mistake: 'mult-sides', tokens: [r.a, '×', r.b, '÷', 2] });
      if (r.s) list.push({ mistake: 'slant', tokens: ['(', r.a, '+', r.b, ')', '×', r.s, '÷', 2] });
    }
    return list;
  }

  function wrongFormulaChoices(p) {
    var cands = candidatesFor(p), ansEx = M.evalExact(p.formula.tokens);
    var out = [], usedTxt = {};
    usedTxt[p.formula.text] = true;

    function tryAdd(c) {
      var ex = M.evalExact(c.tokens), txt = M.text(c.tokens);
      if (!ex || !ansEx || ex.n * ansEx.d === ansEx.n * ex.d) return false;
      if (usedTxt[txt]) return false;
      usedTxt[txt] = true;
      out.push({ value: c.tokens, token: txt, mistake: c.mistake });
      return true;
    }

    if (cands.length > 0) tryAdd(cands[0]);
    var rest = cands.slice(1), h = M.mixHash(p.key + '|f'), i;
    if (rest.length > 0) {
      var start = h % rest.length;
      for (i = 0; i < rest.length && out.length < 2; i++) {
        tryAdd(rest[(start + i) % rest.length]);
      }
    }
    for (var bump = 1; out.length < 2; bump++) {
      var copy = p.formula.tokens.slice();
      for (i = 0; i < copy.length; i++) {
        if (typeof copy[i] === 'number') { copy[i] = copy[i] + bump; break; }
      }
      tryAdd({ mistake: 'fix', tokens: copy });
    }
    return out;
  }

  function pickValFrom(cands, start, ansVal, usedVal, wantLarger, strict) {
    var i, pass, idx, v;
    for (pass = 0; pass < (strict ? 1 : 2); pass++) {
      for (i = 0; i < cands.length; i++) {
        idx = (start + i) % cands.length;
        v = cands[idx].val;
        if (v === null || v <= 0 || v === ansVal || usedVal[v]) continue;
        if (pass === 0 && wantLarger !== null) {
          if (wantLarger && v <= ansVal) continue;
          if (!wantLarger && v >= ansVal) continue;
        }
        return cands[idx];
      }
    }
    return null;
  }

  function fillCalcSlip(out, usedVal, p, h) {
    var step = p.value <= 20 ? 2 : 10, mult = 1;
    while (out.length < 2) {
      var deltas = (h % 2 === 0) ? [step * mult, -step * mult] : [-step * mult, step * mult];
      for (var i = 0; i < deltas.length && out.length < 2; i++) {
        var v = p.value + deltas[i];
        if (v > 0 && v !== p.value && !usedVal[v]) {
          usedVal[v] = true;
          out.push({ value: v, token: v + ' ' + p.unit, mistake: 'calc-slip' });
        }
      }
      mult++;
    }
  }

  function wrongFinalChoices(p) {
    var cands = candidatesFor(p), h = M.mixHash(p.key + '|final');
    var evaled = [], i, out = [], usedVal = {};
    usedVal[p.value] = true;
    for (i = 0; i < cands.length; i++) {
      evaled.push({ mistake: cands[i].mistake, val: M.evalWith(cands[i].tokens, 'rule') });
    }
    var bothHash = (p.kind === 'unit-convert' || p.kind === 'unit-cm-m');
    if (!bothHash && evaled.length > 0) {
      var v0 = evaled[0].val;
      if (v0 !== null && v0 > 0 && v0 !== p.value) {
        usedVal[v0] = true;
        out.push({ value: v0, token: v0 + ' ' + p.unit, mistake: evaled[0].mistake });
      }
    }
    var rest = bothHash ? evaled : evaled.slice(1);
    var wantLarger = (h % 2 === 0);
    var slipStep = p.value <= 20 ? 2 : 10;
    var slips = [{ mistake: 'calc-slip', val: p.value + slipStep }, { mistake: 'calc-slip', val: p.value - slipStep }];
    while (out.length < 2 && rest.length > 0) {
      var side = out.length === 1 ? wantLarger : null, pick = null;
      // 크기 위치: 바라는 쪽 공식 실수가 없으면 그쪽 계산 실수를 먼저
      if (side !== null) pick = pickValFrom(rest, h % rest.length, p.value, usedVal, side, true) || pickValFrom(slips, side ? 0 : 1, p.value, usedVal, side, true);
      if (!pick) pick = pickValFrom(rest, h % rest.length, p.value, usedVal, side);
      if (!pick) break;
      usedVal[pick.val] = true;
      out.push({ value: pick.val, token: pick.val + ' ' + p.unit, mistake: pick.mistake });
    }
    if (out.length < 2) fillCalcSlip(out, usedVal, p, h);
    return out;
  }

  function rowSlipVal(tokens, delta) {
    var copy = tokens.slice(), i, mulIdx = -1;
    for (i = 0; i < copy.length; i++) {
      if (copy[i] === '×' && i + 1 < copy.length && typeof copy[i + 1] === 'number') mulIdx = i + 1;
    }
    if (mulIdx >= 0) {
      copy[mulIdx] = copy[mulIdx] + delta;
      return M.evalWith(copy, 'rule');
    }
    return null;
  }

  function wrongSecondChoices(p) {
    var tokens = p.formula.tokens, h = M.mixHash(p.key + '|v');
    var out = [], usedVal = {}, i;
    usedVal[p.value] = true;

    function addChoice(val, mistake) {
      if (val === null || val <= 0 || val === p.value || usedVal[val]) return false;
      usedVal[val] = true;
      out.push({ value: val, token: val + ' ' + p.unit, mistake: mistake });
      return true;
    }

    if (tokens.indexOf('÷') >= 0) {
      addChoice(p.value * 2, 'half-miss');
    } else if (tokens.indexOf('(') >= 0) {
      addChoice(M.evalWith(tokens, 'noparen'), 'paren');
    } else {
      var d0 = (h % 2 === 0) ? 1 : -1;
      if (!addChoice(rowSlipVal(tokens, d0), 'row-slip')) addChoice(rowSlipVal(tokens, -d0), 'row-slip');
    }

    var step = p.value <= 20 ? 2 : 10;
    var pool2 = [
      { mistake: 'row-slip', val: rowSlipVal(tokens, 1) },
      { mistake: 'row-slip', val: rowSlipVal(tokens, -1) },
      { mistake: 'calc-slip', val: p.value + step },
      { mistake: 'calc-slip', val: p.value - step }
    ];
    var wantLarger = (h % 2 === 0);
    if (out.length < 2) {
      var pick = pickValFrom(pool2, h % pool2.length, p.value, usedVal, wantLarger);
      if (pick) addChoice(pick.val, pick.mistake);
    }
    if (out.length < 2) fillCalcSlip(out, usedVal, p, h);
    return out;
  }

  function wrongChoices(p, step) {
    if (step === 'f') return wrongFormulaChoices(p);
    if (step === 'v') return wrongSecondChoices(p);
    return wrongFinalChoices(p);
  }

  // --- 한 판 / 섞어 풀기 ---
  function pickUnused(kind, rng, usedKeys) {
    var pool = poolOf(kind), n = pool.length, start = randInt(0, n - 1, rng);
    for (var i = 0; i < n; i++) {
      var r = pool[(start + i) % n];
      var key = kind + '|' + rawKey(kind, r);
      if (!usedKeys[key]) {
        usedKeys[key] = true;
        return buildProblem(kind, r);
      }
    }
    return buildProblem(kind, pool[start]);
  }

  function makeRound(lab, rng) {
    var kinds = LAB_KINDS[lab];
    if (!kinds) throw new Error('Unknown lab: ' + lab);
    var out = [], usedKeys = {};
    for (var i = 0; i < kinds.length; i++) {
      var k = kinds[i];
      if (k === 'quad') k = rng() < 0.5 ? 'rhombus' : 'trapezoid';
      out.push(pickUnused(k, rng, usedKeys));
    }
    return out;
  }

  function makeMixedRound(rng, n) {
    var total = n || 10, out = [], counts = {}, usedKeys = {}, i;
    for (i = 0; i < total; i++) {
      var avail = [];
      for (var j = 0; j < MIXED_KINDS.length; j++) {
        var k = MIXED_KINDS[j];
        if ((counts[k] || 0) < 2) avail.push(k);
      }
      var chosen = avail[randInt(0, avail.length - 1, rng)];
      counts[chosen] = (counts[chosen] || 0) + 1;
      out.push(pickUnused(chosen, rng, usedKeys));
    }
    out.sort(function (a, b) {
      return KIND_ORDER[a.kind] - KIND_ORDER[b.kind];
    });
    return out;
  }

  global.PolyAreaCore = {
    LAB_KINDS: LAB_KINDS,
    MIXED_KINDS: MIXED_KINDS,
    KIND_ORDER: KIND_ORDER,
    HINTS: HINTS,
    hintFor: hintFor,
    makeProblem: makeProblem,
    wrongChoices: wrongChoices,
    makeRound: makeRound,
    makeMixedRound: makeMixedRound,
    poolOf: poolOf
  };
})(typeof window !== 'undefined' ? window : globalThis);
