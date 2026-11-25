/* 4-2 삼각형·사각형·다각형 — 문제 표·문제 만들기·오답·한 판 (순수 계산, DOM 없음). 좌표·원료는 tri_quad-geo.js */
(function (global) {
  'use strict';
  var M = global.MixCalcCore;
  var G = global.TriQuadGeo, VNAMES = G.VNAMES, randInt = G.randInt, round3 = G.round3, rad = G.rad, cross2 = G.cross2, ensureCW = G.ensureCW, rotCW = G.rotCW, fitBox = G.fitBox, shiftRotate = G.shiftRotate, makeFig = G.makeFig, triByAngles = G.triByAngles, triBySides = G.triBySides, triClassOf = G.triClassOf, triMistakeOf = G.triMistakeOf, quadMistakeOf = G.quadMistakeOf, edgeName = G.edgeName, angleName = G.angleName, POOLS = G.POOLS, BUILDERS = G.BUILDERS, poolOf = G.poolOf, polyPts = G.polyPts, paraPts = G.paraPts, diagList = G.diagList;

  var LAB_KINDS = {
    1: ['iso-side', 'iso-base', 'iso-apex'],
    2: ['angle-class', 'angle-class', 'two-criteria'],
    3: ['perp-side', 'par-pairs', 'par-dist'],
    4: ['quad-name', 'para-angle', 'para-side'],
    5: ['rhom-angle', 'rhom-side', 'quad-rel'],
    6: ['poly-name', 'diag-one', 'diag-count']
  };

  var MIXED_KINDS = [
    'iso-side', 'iso-apex', 'angle-class',
    'par-pairs', 'par-dist', 'quad-name', 'para-angle', 'para-side', 'rhom-angle', 'quad-rel',
    'poly-name', 'diag-count'
  ];

  var KIND_ORDER = {
    'iso-side': 0, 'iso-base': 1, 'iso-apex': 2, 'angle-class': 3, 'two-criteria': 4,
    'perp-side': 5, 'par-pairs': 6, 'par-dist': 7, 'quad-name': 8, 'para-angle': 9,
    'para-side': 10, 'rhom-angle': 11, 'rhom-side': 12, 'quad-rel': 13,
    'poly-name': 14, 'diag-one': 15, 'diag-count': 16
  };

  var UNIT_MAP = {
    'iso-side': '2', 'iso-base': '2', 'iso-apex': '2', 'angle-class': '2', 'two-criteria': '2',
    'perp-side': '4', 'par-pairs': '4', 'par-dist': '4', 'quad-name': '4', 'para-angle': '4',
    'para-side': '4', 'rhom-angle': '4', 'rhom-side': '4', 'quad-rel': '4',
    'poly-name': '6', 'diag-one': '6', 'diag-count': '6'
  };

  var FAMILY = {
    '사다리꼴': ['사다리꼴'],
    '평행사변형': ['평행사변형', '사다리꼴'],
    '마름모': ['마름모', '평행사변형', '사다리꼴'],
    '직사각형': ['직사각형', '평행사변형', '사다리꼴'],
    '정사각형': ['정사각형', '마름모', '직사각형', '평행사변형', '사다리꼴'],
    '사다리꼴이 아닌 사각형': ['사다리꼴이 아닌 사각형']
  };

  var QUAD_ALL = ['사다리꼴', '평행사변형', '마름모', '직사각형', '정사각형'];
  var POLY_NAMES = { 5: '오각형', 6: '육각형', 7: '칠각형', 8: '팔각형', 9: '구각형' };

  var CARDS = {
    1: [
      '이등변삼각형: 두 변의 길이가 같은 삼각형',
      '정삼각형: 세 변의 길이가 같은 삼각형 (세 각이 모두 60°)',
      '이등변삼각형을 반으로 접으면 두 밑각도 겹쳐 크기가 같아요.'
    ],
    2: [
      '예각삼각형: 세 각이 모두 예각 / 직각삼각형: 한 각이 직각 / 둔각삼각형: 한 각이 둔각',
      '삼각형 세 각의 합은 180° → 나머지 각 = 180° − 두 각'
    ],
    3: [
      '수직: 두 직선이 만나 직각을 이룸 / 평행: 만나지 않는 두 직선',
      '평행선 사이의 거리: 평행선 사이에 그은 수직인 선분의 길이'
    ],
    4: [
      '사다리꼴: 평행한 변이 한 쌍이라도 있는 사각형',
      '평행사변형: 마주 보는 두 쌍의 변이 서로 평행한 사각형',
      '평행사변형은 마주 보는 변·각이 같고, 이웃한 두 각의 합이 180°예요.'
    ],
    5: [
      '마름모: 네 변의 길이가 모두 같은 사각형',
      '마름모도 평행사변형이라 이웃한 두 각의 합이 180°',
      '사다리꼴 ⊃ 평행사변형 ⊃ 마름모·직사각형 ⊃ 정사각형'
    ],
    6: [
      '정다각형: 변의 길이와 각의 크기가 모두 같은 다각형',
      '대각선: 서로 이웃하지 않는 두 꼭짓점을 이은 선분',
      '한 꼭짓점에서 그을 수 있는 대각선 수 = (꼭짓점 수 − 3)개'
    ]
  };

  var HINTS = {
    'one-same': '이등변삼각형은 같은 길이의 변이 2개예요.',
    'all-same': '세 변이 모두 같은 건 정삼각형이에요.',
    'iso-two': '정삼각형은 세 변이 모두 같아요.',
    'wrong-pair': '어느 두 변이 같은지 빗금을 봐요.',
    'same-apex': '꼭지각이 아니라 두 밑각을 구해요.',
    'half-miss': '두 밑각이 나눠 가지니 ÷ 2를 해요.',
    'from-90': '삼각형 세 각의 합은 180°예요. 아는 각을 모두 빼요.',
    'sum': '삼각형 세 각의 합은 180°예요. 아는 각을 모두 빼요.',
    'one-angle': '삼각형 세 각의 합은 180°예요. 아는 각을 모두 빼요.',
    'one-base': '삼각형 세 각의 합은 180°예요. 아는 각을 모두 빼요.',
    'two-bases': '180°에서 두 밑각을 빼요.',
    'same-base': '꼭지각을 구해요.',
    'parallel': '평행한 변은 만나지 않아요. 수직은 직각으로 만나요.',
    'slant': '기울어진 선분은 거리가 아니에요. 수직인 선분의 길이가 거리예요.',
    'not-between': '두 평행선을 모두 잇는 선분이어야 해요.',
    'count-sides': '모눈을 따라 같은 방향인 변끼리 짝지어 봐요.',
    'same': '이웃한 두 각을 더하면 180°예요.',
    'neighbor': '마주 보는 두 각은 크기가 같아요.',
    'half': '둘레는 네 변을 모두 더해요.',
    'four': '두 변의 길이가 달라요.',
    'area': '곱하면 넓이예요.',
    'side-two': '네 변의 길이가 모두 같아요.',
    'n-miss': '네 변의 길이가 모두 같아요.',
    'n-off': '변의 수를 다시 세어 봐요.',
    'regular': '변의 길이와 각의 크기가 모두 같아야 정다각형이에요.',
    'with-neighbors': '자기 자신과 이웃한 두 꼭짓점에는 대각선을 못 그어요.',
    'n-minus-2': '자기 자신과 이웃한 두 꼭짓점에는 대각선을 못 그어요.',
    'double': '한 대각선을 두 꼭짓점에서 두 번 셌어요. ÷ 2를 해요.',
    'one-vertex': '모든 꼭짓점에서 그어 봐요.',
    'calc-slip': '다시 계산해 봐요.',
    'name-acute': '예각삼각형은 세 각이 모두 예각이에요. 가장 큰 각을 봐요.',
    'name-right': '직각삼각형은 한 각이 직각이에요. 가장 큰 각을 봐요.',
    'name-obtuse': '둔각삼각형은 한 각이 둔각이에요. 가장 큰 각을 봐요.',
    'name-trap': '사다리꼴은 평행한 변이 한 쌍이라도 있는 사각형이에요.',
    'name-para': '평행사변형은 마주 보는 두 쌍의 변이 서로 평행한 사각형이에요.',
    'name-rhom': '마름모는 네 변의 길이가 모두 같은 사각형이에요.',
    'name-rect': '직사각형은 네 각이 모두 직각인 사각형이에요.',
    'name-square': '정사각형은 네 변이 모두 같고 네 각이 모두 직각인 사각형이에요.',
    'name-nontrap': '평행한 변이 있는지 평행 표시를 확인해 봐요.',
    'fix': '그림과 뜻 카드를 다시 봐요.'
  };

  function hintFor(p, mistake) {
    return HINTS[mistake] || HINTS.fix;
  }

  // --- 문제 생성 ---
  function buildProblem(kind, item, opt) {
    var mixed = !!(opt && opt.mixed);
    var unit = UNIT_MAP[kind];
    var key = kind + '|' + item.k;
    var fig, steps = [], cards, box, vnames, i, angs, lbls;

    if (kind === 'iso-side') {
      cards = CARDS[1];
      box = triBySides(item.a, item.a, item.b, item.rot);
      if (item.mode === 'perim') {
        fig = makeFig({ w: box.w, h: box.h, points: box.pts, ticks: [0, 1],
          labels: [{ a: 0, b: 1, text: item.a + ' cm' }, { a: 2, b: 0, text: item.b + ' cm' }] });
        steps.push({ ask: '이 이등변삼각형의 둘레는 몇 cm인가요?', value: 2 * item.a + item.b,
          answerText: (2 * item.a + item.b) + ' cm', choiceKind: 'value', reveal: null });
      } else if (item.mode === 'rem') {
        var P = 2 * item.a + item.b;
        fig = makeFig({ w: box.w, h: box.h, points: box.pts, ticks: [0, 1],
          labels: [{ a: 0, b: 1, text: item.a + ' cm' }, { a: 2, b: 0, text: '?' }] });
        steps.push({ ask: '둘레가 ' + P + ' cm인 이등변삼각형에서 나머지 한 변은 몇 cm인가요?',
          value: item.b, answerText: item.b + ' cm', choiceKind: 'value', reveal: null });
      } else if (item.mode === 'eqp') {
        fig = makeFig({ w: box.w, h: box.h, points: box.pts, ticks: [0, 1, 2],
          labels: [{ a: 2, b: 0, text: item.a + ' cm' }] });
        steps.push({ ask: '이 정삼각형의 둘레는 몇 cm인가요?', value: 3 * item.a,
          answerText: (3 * item.a) + ' cm', choiceKind: 'value', reveal: null });
      } else {
        fig = makeFig({ w: box.w, h: box.h, points: box.pts, ticks: [0, 1, 2] });
        steps.push({ ask: '둘레가 ' + (3 * item.a) + ' cm인 정삼각형의 한 변은 몇 cm인가요?',
          value: item.a, answerText: item.a + ' cm', choiceKind: 'value', reveal: null });
      }
    } else if (kind === 'iso-base') {
      cards = CARDS[1];
      var baseA = (180 - item.x) / 2;
      box = triByAngles(baseA, baseA, item.rot);
      fig = makeFig({ w: box.w, h: box.h, points: box.pts, ticks: [0, 1], angles: [
        { at: 1, text: item.x + '°', right: false, mark: 1 },
        { at: 0, text: '?', right: false, mark: 2 },
        { at: 2, text: '', right: false, mark: 2 }
      ] });
      steps.push({ ask: '두 밑각의 크기의 합은 몇 도인가요?', value: 180 - item.x,
        answerText: (180 - item.x) + '°', choiceKind: 'value', reveal: null });
      steps.push({ ask: '한 밑각은 몇 도인가요?', value: baseA,
        answerText: baseA + '°', choiceKind: 'value', reveal: { angle: 0, text: baseA + '°', right: false } });
    } else if (kind === 'iso-apex') {
      cards = CARDS[1];
      var apex = 180 - 2 * item.y;
      box = triByAngles(item.y, item.y, item.rot);
      fig = makeFig({ w: box.w, h: box.h, points: box.pts, ticks: [0, 1], angles: [
        { at: 0, text: item.y + '°', right: false, mark: 2 },
        { at: 2, text: '', right: false, mark: 2 },
        { at: 1, text: '?', right: false, mark: 1 }
      ] });
      steps.push({ ask: '꼭지각은 몇 도인가요?', value: apex,
        answerText: apex + '°', choiceKind: 'value', reveal: null });
    } else if (kind === 'angle-class') {
      cards = CARDS[2];
      box = triByAngles(item.angs[0], item.angs[2], item.rot);
      angs = [];
      for (i = 0; i < 3; i++) {
        var av = item.angs[i];
        if (!mixed && i === item.qIdx) {
          angs.push({ at: i, text: '?', right: false, mark: 1 });
        } else {
          angs.push({ at: i, text: av + '°', right: av === 90, mark: 1 });
        }
      }
      fig = makeFig({ w: box.w, h: box.h, points: box.pts, angles: angs });
      var qVal = item.angs[item.qIdx];
      if (!mixed) {
        steps.push({ ask: '나머지 한 각은 몇 도인가요?', value: qVal, answerText: qVal + '°',
          choiceKind: 'value', reveal: { angle: item.qIdx, text: qVal + '°', right: qVal === 90 } });
      }
      steps.push({ ask: '어떤 삼각형인가요?', value: null, answerText: item.cls,
        choiceKind: 'name', reveal: null });
    } else if (kind === 'two-criteria') {
      cards = CARDS[2];
      var ap = 180 - 2 * item.y, cls2 = triClassOf(item.y, item.y, ap);
      box = triByAngles(item.y, item.y, item.rot);
      fig = makeFig({ w: box.w, h: box.h, points: box.pts, ticks: [0, 1], angles: [
        { at: 0, text: item.y + '°', right: false, mark: 2 },
        { at: 2, text: '', right: false, mark: 2 },
        { at: 1, text: '?', right: false, mark: 1 }
      ] });
      steps.push({ ask: '꼭지각은 몇 도인가요?', value: ap, answerText: ap + '°',
        choiceKind: 'value', reveal: { angle: 1, text: ap + '°', right: ap === 90 } });
      steps.push({ ask: '어떤 삼각형인가요?', value: null, answerText: '이등변삼각형이면서 ' + cls2,
        choiceKind: 'name', reveal: null });
    } else if (kind === 'perp-side') {
      cards = CARDS[3];
      var b0 = item.b, t0 = item.t, h0 = item.h;
      var raw = [[0, h0], [0, 0], [t0, 0], [b0, h0]];
      if (item.fx) for (i = 0; i < 4; i++) raw[i] = [b0 - raw[i][0], raw[i][1]];
      if (item.fy) for (i = 0; i < 4; i++) raw[i] = [raw[i][0], h0 - raw[i][1]];
      raw = ensureCW(raw);
      box = fitBox(shiftRotate(raw, item.vrot), 12, 8, true);
      vnames = VNAMES.slice(0, 4);
      // 변의 수직/평행 관계: 길이가 t0인 변(top)과 b0인 변(bottom)이 평행, 수직인 변은 x차=0 또는 y차=0
      var horiz = [], vert = [], slantIdx = -1;
      for (i = 0; i < 4; i++) {
        var p1 = box.pts[i], p2 = box.pts[(i + 1) % 4];
        if (p1[1] === p2[1]) horiz.push(i);
        else if (p1[0] === p2[0]) vert.push(i);
        else slantIdx = i;
      }
      var baseIdx = horiz[item.wb], oppIdx = horiz[1 - item.wb], perpIdx = vert[0];
      fig = makeFig({ scale: true, grid: true, w: box.w, h: box.h, points: box.pts, vertexNames: vnames });
      fig._meta = { baseName: edgeName(vnames, baseIdx, 4), oppName: edgeName(vnames, oppIdx, 4), slantName: edgeName(vnames, slantIdx, 4) };
      steps.push({ ask: edgeName(vnames, baseIdx, 4) + '에 수직인 변은 어느 것인가요?',
        value: null, answerText: edgeName(vnames, perpIdx, 4), choiceKind: 'name', reveal: null });
    } else if (kind === 'par-pairs') {
      cards = CARDS[3];
      var shapes = [
        { pts: [[0, 4], [1, 0], [5, 0], [7, 4]], pairs: 1 },
        { pts: [[0, 4], [2, 0], [7, 0], [5, 4]], pairs: 2 },
        { pts: [[0, 4], [0, 0], [6, 0], [6, 4]], pairs: 2 },
        { pts: [[0, 2], [2, 0], [5, 0], [7, 2], [5, 4], [2, 4]], pairs: 3 },
        { pts: [[0, 4], [1, 0], [5, 1], [6, 3]], pairs: 0 },
        { pts: [[0, 4], [0, 1], [3, 0], [6, 1], [6, 4]], pairs: 1 }
      ];
      var sh = shapes[item.kind], sp = sh.pts.slice();
      if (item.v) {
        var sc = item.kind === 3 ? 1 : 1;
        for (i = 0; i < sp.length; i++) sp[i] = [sp[i][0] + (item.kind < 3 ? i % 2 * 0 : 0), sp[i][1] + (item.kind === 3 ? 0 : 1)];
      }
      if (item.fx) for (i = 0; i < sp.length; i++) sp[i] = [-sp[i][0], sp[i][1]];
      box = fitBox(ensureCW(sp), 12, 8, true);
      fig = makeFig({ scale: true, grid: true, w: box.w, h: box.h, points: box.pts });
      fig._nSides = sp.length;
      steps.push({ ask: '평행한 변은 모두 몇 쌍인가요?', value: sh.pairs, answerText: sh.pairs + '쌍', choiceKind: 'value', reveal: null });
    } else if (kind === 'par-dist') {
      cards = CARDS[3];
      var d = item.d, yT = 1, yB = 1 + d, curX = 1.2, segs = [];
      segs.push({ a: [0, yT], b: [12, yT], text: '', kind: 'line', right: false });
      segs.push({ a: [0, yB], b: [12, yB], text: '', kind: 'line', right: false });
      // 꼬리표가 겹치지 않게: 짧은 선분과 수직 선분은 붙이지 않고(기울어진 선분을 사이에), 두 기울어진 선분 꼴은 수직 선분을 끝에
      var types = item.c2 ? (item.ord % 2 ? ['c1', 'c2', 'v'] : ['c2', 'c1', 'v']) : (item.ord % 2 ? ['v', 'c1', 'e'] : ['e', 'c1', 'v']);
      for (i = 0; i < 3; i++) {
        var tp = types[i];
        if (tp === 'v') {
          segs.push({ a: [round3(curX), yB], b: [round3(curX), yT], text: d + ' cm', kind: 'seg', right: true });
          curX += 2.2;
        } else if (tp === 'c1' || tp === 'c2') {
          var cc = tp === 'c1' ? item.c1 : item.c2;
          var dx = Math.sqrt(cc * cc - d * d);
          segs.push({ a: [round3(curX), yB], b: [round3(curX + dx), yT], text: cc + ' cm', kind: 'seg', right: false });
          curX += dx + 1.2;
        } else {
          segs.push({ a: [round3(curX), yB], b: [round3(curX), yB - item.e], text: item.e + ' cm', kind: 'seg', right: false });
          curX += 2.2;
        }
      }
      fig = makeFig({ w: Math.min(12, Math.max(8, round3(curX))), h: d + 2, points: [], segments: segs, vertexNames: [] });
      steps.push({ ask: '평행선 사이의 거리는 몇 cm인가요?', value: d, answerText: d + ' cm', choiceKind: 'value', reveal: null });
    } else if (kind === 'quad-name') {
      cards = CARDS[4];
      var qpts, qpar = [];
      if (item.name === '사다리꼴') {
        qpts = [[0, 4], [1.5 + item.v * 0.3, 0], [5.5, 0], [8, 4]];
        qpar = [[1, 3]];
      } else if (item.name === '평행사변형') {
        qpts = [[0, 4], [1.6 + item.v * 0.2, 0], [8.6 + item.v * 0.2, 0], [7, 4]];
        qpar = [[0, 2], [1, 3]];
      } else {
        qpts = [[0, 4], [1.2, 0], [5.5 + item.v * 0.3, 0.9], [7.5, 3.3]];
      }
      box = fitBox(rotCW(ensureCW(qpts), item.v), 12, 8, false);
      fig = makeFig({ w: box.w, h: box.h, points: box.pts, parallels: qpar });
      steps.push({ ask: '이 사각형의 이름으로 알맞은 것은 어느 것인가요?', value: null, answerText: item.name, choiceKind: 'name', reveal: null });
    } else if (kind === 'para-angle' || kind === 'rhom-angle') {
      var isRhom = (kind === 'rhom-angle');
      cards = CARDS[isRhom ? 5 : 4];
      box = paraPts(item.x, isRhom ? 5 : 7, 5, item.rot);
      vnames = VNAMES.slice(0, 4);
      var qIdx2 = item.adj ? 1 : 2;
      var ansA = item.adj ? (180 - item.x) : item.x;
      fig = makeFig({ w: box.w, h: box.h, points: box.pts, vertexNames: vnames,
        parallels: isRhom ? [] : [[0, 2], [1, 3]], ticks: isRhom ? [0, 1, 2, 3] : [],
        angles: [{ at: 0, text: item.x + '°', right: false, mark: 1 }, { at: qIdx2, text: '?', right: false, mark: 2 }] });
      steps.push({ ask: '각 ' + angleName(vnames, qIdx2, 4) + '은 몇 도인가요?', value: ansA,
        answerText: ansA + '°', choiceKind: 'value', reveal: null });
    } else if (kind === 'para-side') {
      cards = CARDS[4];
      box = paraPts(65, item.a, item.b, item.v);
      fig = makeFig({ w: box.w, h: box.h, points: box.pts, parallels: [[0, 2], [1, 3]],
        labels: [{ a: 0, b: 1, text: item.b + ' cm' }, { a: 1, b: 2, text: item.a + ' cm' }] });
      steps.push({ ask: '이 평행사변형의 둘레는 몇 cm인가요?', value: 2 * (item.a + item.b),
        answerText: (2 * (item.a + item.b)) + ' cm', choiceKind: 'value', reveal: null });
    } else if (kind === 'rhom-side') {
      cards = CARDS[5];
      var sname = item.sq ? '정사각형' : '마름모';
      box = paraPts(item.sq ? 90 : 65, item.a, item.a, 0);
      angs = item.sq ? [0, 1, 2, 3].map(function (idx) { return { at: idx, text: '', right: true, mark: 1 }; }) : [];
      lbls = item.askSide ? [] : [{ a: 0, b: 1, text: item.a + ' cm' }];
      fig = makeFig({ w: box.w, h: box.h, points: box.pts, ticks: [0, 1, 2, 3], angles: angs, labels: lbls });
      if (item.askSide) {
        steps.push({ ask: '둘레가 ' + (4 * item.a) + ' cm인 ' + sname + '의 한 변은 몇 cm인가요?',
          value: item.a, answerText: item.a + ' cm', choiceKind: 'value', reveal: null });
      } else {
        steps.push({ ask: '이 ' + sname + '의 둘레는 몇 cm인가요?',
          value: 4 * item.a, answerText: (4 * item.a) + ' cm', choiceKind: 'value', reveal: null });
      }
    } else if (kind === 'quad-rel') {
      cards = CARDS[5];
      var rAng = [], rTick = [], rPar = [];
      if (item.name === '직사각형') {
        box = paraPts(90, 8, 5, item.v % 2);
        rAng = [0, 1, 2, 3].map(function (idx) { return { at: idx, text: '', right: true, mark: 1 }; });
      } else if (item.name === '마름모') {
        box = paraPts(65, 5, 5, item.v);
        rTick = [0, 1, 2, 3];
      } else {
        box = paraPts(65, 8, 5, item.v);
        rPar = [[0, 2], [1, 3]];
      }
      fig = makeFig({ w: box.w, h: box.h, points: box.pts, angles: rAng, ticks: rTick, parallels: rPar });
      var fam = FAMILY[item.name], cands = [];
      for (i = 0; i < fam.length; i++) if (fam[i] !== item.name) cands.push(fam[i]);
      var ansQ = cands[M.mixHash(key) % cands.length];
      steps.push({ ask: '이 사각형을 부를 수 있는 이름은 어느 것인가요?', value: null, answerText: ansQ, choiceKind: 'name', reveal: null });
    } else if (kind === 'poly-name') {
      cards = CARDS[6];
      box = polyPts(item.n, item.reg, item.rot, item.n + item.rot * 3);
      var pTicks = [], pAngs = [];
      if (item.reg) {
        for (i = 0; i < item.n; i++) { pTicks.push(i); pAngs.push({ at: i, text: '', right: false, mark: 1 }); }
      }
      fig = makeFig({ w: box.w, h: box.h, points: box.pts, ticks: pTicks, angles: pAngs });
      steps.push({ ask: '이 도형의 이름은 무엇인가요?', value: null,
        answerText: (item.reg ? '정' : '') + POLY_NAMES[item.n], choiceKind: 'name', reveal: null });
    } else if (kind === 'diag-one') {
      cards = CARDS[6];
      box = polyPts(item.n, item.reg, item.rot, item.n * 2 + item.rot);
      fig = makeFig({ w: box.w, h: box.h, points: box.pts, vertexNames: VNAMES.slice(0, item.n), angles: [{ at: 0, text: '', right: false, mark: 2 }] });
      steps.push({ ask: '꼭짓점 ㄱ에서 그을 수 있는 대각선은 몇 개인가요?', value: item.n - 3,
        answerText: (item.n - 3) + '개', choiceKind: 'value', reveal: { diagonals: diagList(box.pts, true) } });
    } else if (kind === 'diag-count') {
      cards = CARDS[6];
      box = polyPts(item.n, item.reg, item.rot, item.n * 3 + item.rot);
      fig = makeFig({ w: box.w, h: box.h, points: box.pts });
      var dc = item.n * (item.n - 3) / 2;
      steps.push({ ask: '대각선은 모두 몇 개인가요?', value: dc,
        answerText: dc + '개', choiceKind: 'value', reveal: { diagonals: diagList(box.pts, false) } });
    }

    var p = { kind: kind, unit: unit, fig: fig, steps: steps, cardLines: cards, key: key };
    p._item = item;
    return p;
  }

  function makeProblem(kind, rng, opt) {
    var pool = poolOf(kind);
    if (!pool.length) throw new Error('Unknown kind: ' + kind);
    return buildProblem(kind, pool[randInt(0, pool.length - 1, rng)], opt);
  }

  // --- 오답 생성 ---
  function fmtVal(val, suffix) {
    return val + suffix;
  }

  function valueCands(p, stepIndex) {
    var k = p.kind, it = p._item, c = [], h = M.mixHash(p.key + '|' + stepIndex);
    if (k === 'iso-side') {
      if (it.mode === 'perim') {
        c.push({ v: it.a + it.b, m: 'one-same' }, { v: it.a * 3, m: 'all-same' }, { v: it.a + it.b * 2, m: 'wrong-pair' });
      } else if (it.mode === 'rem') {
        var P = 2 * it.a + it.b;
        c.push({ v: P - it.a, m: 'one-same' });
        if ((P - it.a) % 2 === 0) c.push({ v: (P - it.a) / 2, m: 'wrong-pair' });
        c.push({ v: it.b + 2, m: 'calc-slip' }, { v: it.b - 2, m: 'calc-slip' });
      } else if (it.mode === 'eqp') {
        c.push({ v: it.a * 2, m: 'iso-two' }, { v: it.a * 4, m: 'n-plus' }, { v: it.a * 3 + 2, m: 'calc-slip' }, { v: it.a * 3 - 2, m: 'calc-slip' });
      } else {
        var P3 = it.a * 3;
        if (P3 % 2 === 0) c.push({ v: P3 / 2, m: 'iso-two' });
        c.push({ v: it.a + 2, m: 'calc-slip' }, { v: it.a - 2, m: 'calc-slip' }, { v: Math.floor(P3 / 4), m: 'n-plus' });
      }
    } else if (k === 'iso-base') {
      if (stepIndex === 0) {
        c.push({ v: it.x, m: 'same-apex' });
        if (90 - it.x > 0) c.push({ v: 90 - it.x, m: 'from-90' });
        c.push({ v: 180 - it.x + 10, m: 'calc-slip' }, { v: 180 - it.x - 10, m: 'calc-slip' });
      } else {
        var hb = (180 - it.x) / 2;
        c.push({ v: 180 - it.x, m: 'half-miss' }, { v: hb + 10, m: 'calc-slip' }, { v: hb - 10, m: 'calc-slip' }, { v: it.x, m: 'same-apex' });
      }
    } else if (k === 'iso-apex' || (k === 'two-criteria' && stepIndex === 0)) {
      var ap = 180 - 2 * it.y;
      c.push({ v: 180 - it.y, m: 'one-base' }, { v: 2 * it.y, m: 'two-bases' }, { v: it.y, m: 'same-base' }, { v: ap + 10, m: 'calc-slip' }, { v: ap - 10, m: 'calc-slip' });
    } else if (k === 'angle-class' && stepIndex === 0) {
      var rem = [];
      for (var i = 0; i < 3; i++) if (i !== it.qIdx) rem.push(it.angs[i]);
      var first = 180 - rem[h % 2];
      c.push({ v: first, m: 'one-angle' }, { v: rem[0] + rem[1], m: 'sum' }, { v: it.angs[it.qIdx] + 10, m: 'calc-slip' }, { v: it.angs[it.qIdx] - 10, m: 'calc-slip' });
    } else if (k === 'par-pairs') {
      var ans = p.steps[0].value, target = Math.floor(p.fig._nSides / 2);
      var allP = [0, 1, 2, 3].filter(function (v) { return v !== ans; });
      allP.sort(function (a, b) { return Math.abs(a - target) - Math.abs(b - target); });
      for (var j = 0; j < allP.length; j++) c.push({ v: allP[j], m: 'count-sides' });
    } else if (k === 'par-dist') {
      c.push({ v: it.c1, m: 'slant' });
      if (it.c2) c.push({ v: it.c2, m: 'slant' });
      if (it.e) c.push({ v: it.e, m: 'not-between' });
      c.push({ v: it.d + 2, m: 'calc-slip' }, { v: it.d - 2, m: 'calc-slip' });
    } else if (k === 'para-angle' || k === 'rhom-angle') {
      var av2 = p.steps[0].value;
      if (it.adj) {
        c.push({ v: it.x, m: 'same' }, { v: Math.abs(90 - it.x), m: 'from-90' }, { v: av2 + 10, m: 'calc-slip' }, { v: av2 - 10, m: 'calc-slip' });
      } else {
        c.push({ v: 180 - it.x, m: 'neighbor' }, { v: av2 + 10, m: 'calc-slip' }, { v: av2 - 10, m: 'calc-slip' }, { v: Math.abs(90 - it.x), m: 'from-90' });
      }
    } else if (k === 'para-side') {
      var per = 2 * (it.a + it.b);
      c.push({ v: it.a + it.b, m: 'half' }, { v: it.a * 4, m: 'four' });
      if (it.a * it.b !== per) c.push({ v: it.a * it.b, m: 'area' });
      c.push({ v: per + 2, m: 'calc-slip' }, { v: per - 2, m: 'calc-slip' });
    } else if (k === 'rhom-side') {
      if (it.askSide) {
        var P4 = 4 * it.a;
        c.push({ v: P4 / 2, m: 'side-two' }, { v: P4 - 4, m: 'n-miss' }, { v: it.a + 2, m: 'calc-slip' }, { v: it.a - 2, m: 'calc-slip' });
      } else {
        c.push({ v: it.a * 2, m: 'side-two' }, { v: it.a * 3, m: 'n-miss' }, { v: it.a * 4 + 2, m: 'calc-slip' }, { v: it.a * 4 - 2, m: 'calc-slip' });
      }
    } else if (k === 'diag-one') {
      c.push({ v: it.n - 1, m: 'with-neighbors' }, { v: it.n - 2, m: 'n-minus-2' }, { v: it.n - 4, m: 'calc-slip' });
    } else if (k === 'diag-count') {
      var dc = it.n * (it.n - 3) / 2;
      c.push({ v: it.n * (it.n - 3), m: 'double' }, { v: it.n - 3, m: 'one-vertex' }, { v: dc + 1, m: 'calc-slip' }, { v: dc - 1, m: 'calc-slip' });
    }
    return c;
  }

  function nameWrongs(p, stepIndex) {
    var k = p.kind, it = p._item, ans = p.steps[stepIndex].answerText, out = [], i;
    if (k === 'angle-class' || k === 'two-criteria') {
      var base = ['예각삼각형', '직각삼각형', '둔각삼각형'];
      var prefix = (k === 'two-criteria') ? '이등변삼각형이면서 ' : '';
      for (i = 0; i < base.length; i++) {
        var nm = prefix + base[i];
        if (nm !== ans) out.push({ token: nm, mistake: triMistakeOf(base[i]) });
      }
    } else if (k === 'perp-side') {
      out.push({ token: p.fig._meta.oppName, mistake: 'parallel' });
      out.push({ token: p.fig._meta.slantName, mistake: 'slant' });
    } else if (k === 'quad-name') {
      var qMap = {
        '사다리꼴': ['평행사변형', '마름모'],
        '평행사변형': ['직사각형', '마름모'],
        '사다리꼴이 아닌 사각형': ['사다리꼴', '평행사변형']
      };
      var wq = qMap[ans];
      out.push({ token: wq[0], mistake: quadMistakeOf(wq[0]) }, { token: wq[1], mistake: quadMistakeOf(wq[1]) });
    } else if (k === 'quad-rel') {
      var fam = FAMILY[it.name], non = [];
      for (i = 0; i < QUAD_ALL.length; i++) {
        if (fam.indexOf(QUAD_ALL[i]) < 0) non.push(QUAD_ALL[i]);
      }
      var h = M.mixHash(p.key);
      var a = non[h % non.length], b = non[(h + 1) % non.length];
      out.push({ token: a, mistake: quadMistakeOf(a) }, { token: b, mistake: quadMistakeOf(b) });
    } else if (k === 'poly-name') {
      var n = it.n;
      if (!it.reg) {
        var altN = n === 9 ? 8 : (n === 5 ? 6 : (M.mixHash(p.key) % 2 ? n + 1 : n - 1));
        out.push({ token: POLY_NAMES[altN], mistake: 'n-off' }, { token: '정' + POLY_NAMES[n], mistake: 'regular' });
      } else {
        out.push({ token: '정' + POLY_NAMES[n - 1], mistake: 'n-off' }, { token: '정' + POLY_NAMES[n + 1], mistake: 'n-off' });
      }
    }
    return out.slice(0, 2);
  }

  function wrongChoices(p, stepIndex) {
    var st = p.steps[stepIndex];
    if (st.choiceKind === 'name') return nameWrongs(p, stepIndex);
    var suffix = st.answerText.replace(String(st.value), '');
    var isAng = (suffix === '°'), minV = (p.kind === 'par-pairs') ? 0 : 1, maxV = isAng ? 179 : 999;
    var cands = valueCands(p, stepIndex), h = M.mixHash(p.key + '|' + stepIndex);
    var out = [], used = {};
    used[st.answerText] = true;

    function valid(v) {
      if (typeof v !== 'number' || Math.floor(v) !== v || v < minV || v > maxV) return false;
      return !used[fmtVal(v, suffix)];
    }

    if (cands.length && valid(cands[0].v)) {
      var tk0 = fmtVal(cands[0].v, suffix);
      used[tk0] = true;
      out.push({ token: tk0, mistake: cands[0].m });
    }
    var rem = cands.slice(1), ordered = [], i;
    if (rem.length) {
      var off = h % rem.length;
      for (i = 0; i < rem.length; i++) ordered.push(rem[(off + i) % rem.length]);
    }
    var wantLarger = (h % 2 === 0);
    if (out.length === 1) {
      for (i = 0; i < ordered.length && out.length < 2; i++) {
        if (valid(ordered[i].v) && (wantLarger ? ordered[i].v > st.value : ordered[i].v < st.value)) {
          var t1 = fmtVal(ordered[i].v, suffix);
          used[t1] = true;
          out.push({ token: t1, mistake: ordered[i].m });
        }
      }
    }
    for (i = 0; i < ordered.length && out.length < 2; i++) {
      if (valid(ordered[i].v)) {
        var t2 = fmtVal(ordered[i].v, suffix);
        used[t2] = true;
        out.push({ token: t2, mistake: ordered[i].m });
      }
    }
    var deltas = isAng ? [20, -20, 15, -15, 5, -5] : [3, 4, -3, 1, -1, 5];
    for (i = 0; i < deltas.length && out.length < 2; i++) {
      var fv = st.value + deltas[i];
      if (valid(fv)) {
        var t3 = fmtVal(fv, suffix);
        used[t3] = true;
        out.push({ token: t3, mistake: 'fix' });
      }
    }
    return out;
  }

  // --- 라운드 생성 ---
  function makeRound(lab, rng) {
    var kinds = LAB_KINDS[lab];
    if (!kinds) throw new Error('Unknown lab: ' + lab);
    var out = [], used = {}, i, p, tries;
    for (i = 0; i < kinds.length; i++) {
      for (tries = 0; tries < 50; tries++) {
        p = makeProblem(kinds[i], rng, null);
        if (used[p.key]) continue;
        if (lab === 6 && i === 2 && out[1] && p._item.n === out[1]._item.n) continue;
        used[p.key] = true;
        out.push(p);
        break;
      }
    }
    return out;
  }

  function makeMixedRound(rng, n) {
    var total = n || 10, out = [], used = {}, kCount = {}, uCount = { '2': 0, '4': 0, '6': 0 };
    var byUnit = { '2': [], '4': [], '6': [] }, i, k, p, tries;
    for (i = 0; i < MIXED_KINDS.length; i++) {
      k = MIXED_KINDS[i];
      byUnit[UNIT_MAP[k]].push(k);
    }
    var units = ['2', '4', '6'];
    for (i = 0; i < units.length; i++) {
      var u = units[i], ks = byUnit[u];
      while (uCount[u] < 2 && out.length < total) {
        k = ks[randInt(0, ks.length - 1, rng)];
        if ((kCount[k] || 0) >= 2) continue;
        p = makeProblem(k, rng, { mixed: true });
        if (used[p.key]) continue;
        used[p.key] = true;
        kCount[k] = (kCount[k] || 0) + 1;
        uCount[u]++;
        out.push(p);
      }
    }
    tries = 0;
    while (out.length < total && tries++ < 200) {
      k = MIXED_KINDS[randInt(0, MIXED_KINDS.length - 1, rng)];
      if ((kCount[k] || 0) >= 2) continue;
      p = makeProblem(k, rng, { mixed: true });
      if (used[p.key]) continue;
      used[p.key] = true;
      kCount[k] = (kCount[k] || 0) + 1;
      out.push(p);
    }
    out.sort(function (a, b) { return KIND_ORDER[a.kind] - KIND_ORDER[b.kind]; });
    return out;
  }

  global.TriQuadCore = {
    LAB_KINDS: LAB_KINDS,
    MIXED_KINDS: MIXED_KINDS,
    KIND_ORDER: KIND_ORDER,
    FAMILY: FAMILY,
    HINTS: HINTS,
    hintFor: hintFor,
    makeProblem: makeProblem,
    wrongChoices: wrongChoices,
    makeRound: makeRound,
    makeMixedRound: makeMixedRound,
    poolOf: poolOf
  };
})(typeof window !== 'undefined' ? window : globalThis);
