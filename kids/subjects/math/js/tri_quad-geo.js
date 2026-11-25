/* 4-2 삼각형·사각형·다각형 — 그림 좌표 도우미·원료 풀 (순수 계산, DOM 없음). tri_quad-core.js가 불러 씀 */
(function (global) {
  'use strict';
  var VNAMES = ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ'];

  function randInt(lo, hi, rng) {
    return Math.floor(rng() * (hi - lo + 1)) + lo;
  }

  function round3(v) {
    return Math.round(v * 1000) / 1000;
  }

  function rad(deg) {
    return deg * Math.PI / 180;
  }

  function cross2(a, b, c) {
    return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  }

  function ensureCW(pts) {
    var area = 0, i, j;
    for (i = 0; i < pts.length; i++) {
      j = (i + 1) % pts.length;
      area += pts[i][0] * pts[j][1] - pts[j][0] * pts[i][1];
    }
    return area < 0 ? pts.slice().reverse() : pts;
  }

  function rotCW(pts, rot) {
    var r = ((rot % 4) + 4) % 4, out = [], i, x, y;
    for (i = 0; i < pts.length; i++) {
      x = pts[i][0]; y = pts[i][1];
      if (r === 1) out.push([-y, x]);
      else if (r === 2) out.push([-x, -y]);
      else if (r === 3) out.push([y, -x]);
      else out.push([x, y]);
    }
    return out;
  }

  function fitBox(pts, maxW, maxH, keepGrid) {
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity, i, p;
    for (i = 0; i < pts.length; i++) {
      p = pts[i];
      if (p[0] < minX) minX = p[0];
      if (p[1] < minY) minY = p[1];
      if (p[0] > maxX) maxX = p[0];
      if (p[1] > maxY) maxY = p[1];
    }
    var rw = maxX - minX, rh = maxY - minY;
    var s = keepGrid ? 1 : Math.min(maxW / (rw || 1), maxH / (rh || 1));
    var out = [];
    for (i = 0; i < pts.length; i++) {
      out.push([round3((pts[i][0] - minX) * s), round3((pts[i][1] - minY) * s)]);
    }
    return { pts: out, w: round3(rw * s), h: round3(rh * s) };
  }

  function shiftRotate(arr, k) {
    var n = arr.length, out = [], i;
    for (i = 0; i < n; i++) out.push(arr[(i + k) % n]);
    return out;
  }

  function makeFig(o) {
    var pts = o.points || [];
    return {
      scale: !!o.scale,
      w: o.w,
      h: o.h,
      grid: !!o.grid,
      points: pts,
      labels: (o.labels || []).map(function (l) { // 꼭짓점 번호로 적은 꼬리표는 좌표로(그림 계약)
        return { a: typeof l.a === 'number' ? pts[l.a] : l.a, b: typeof l.b === 'number' ? pts[l.b] : l.b, text: l.text };
      }),
      vertexNames: o.vertexNames || [], // 변·각·꼭짓점 이름을 묻는 문제만 이름을 단다(꼬리표와 겹침 방지)
      angles: o.angles || [],
      parallels: o.parallels || [],
      segments: o.segments || [],
      ticks: o.ticks || [],
      height: null,
      diagonals: null,
      cells: false
    };
  }

  // 삼각형 좌표: [0]=왼쪽밑, [1]=꼭지점, [2]=오른쪽밑 (화면 시계 방향)
  function triByAngles(beta, gamma, rot) {
    var alpha = 180 - beta - gamma;
    var ac = Math.sin(rad(gamma)) / Math.sin(rad(alpha));
    var cx = ac * Math.cos(rad(beta)), cy = -ac * Math.sin(rad(beta));
    return fitBox(rotCW([[0, 0], [cx, cy], [1, 0]], rot), 12, 8, false);
  }

  // 세 변 길이로 삼각형 좌표 (변0: 0->1, 변1: 1->2, 변2: 2->0)
  function triBySides(s0, s1, s2, rot) {
    var cosA = (s0 * s0 + s2 * s2 - s1 * s1) / (2 * s0 * s2);
    var sinA = Math.sqrt(Math.max(0.0001, 1 - cosA * cosA));
    var pts = [[0, 0], [s0 * cosA, -s0 * sinA], [s2, 0]];
    return fitBox(rotCW(pts, rot), 12, 8, false);
  }

  function triClassOf(a, b, c) {
    var mx = Math.max(a, b, c);
    return mx < 90 ? '예각삼각형' : (mx === 90 ? '직각삼각형' : '둔각삼각형');
  }

  function triMistakeOf(name) {
    if (name.indexOf('예각') >= 0) return 'name-acute';
    if (name.indexOf('직각') >= 0) return 'name-right';
    return 'name-obtuse';
  }

  function quadMistakeOf(name) {
    if (name === '사다리꼴') return 'name-trap';
    if (name === '평행사변형') return 'name-para';
    if (name === '마름모') return 'name-rhom';
    if (name === '직사각형') return 'name-rect';
    if (name === '정사각형') return 'name-square';
    return 'name-nontrap';
  }

  function edgeName(vnames, idx, n) {
    var a = vnames[idx], b = vnames[(idx + 1) % n];
    return '변 ' + a + b;
  }

  function angleName(vnames, idx, n) {
    return vnames[(idx + n - 1) % n] + vnames[idx] + vnames[(idx + 1) % n];
  }

  // --- 풀 생성기 ---
  var POOLS = {};
  var BUILDERS = {};

  BUILDERS['iso-side'] = function () {
    var list = [], a, b, rot, p;
    for (a = 3; a <= 12; a++) {
      for (b = 2; b <= 12; b++) {
        if (a === b || b >= 2 * a || 2 * a + b > 40) continue;
        if (b / (2 * a) < Math.sin(rad(15)) || b / (2 * a) > Math.sin(rad(60))) continue; // 세 각 모두 30° 이상
        rot = (a + b) % 4;
        list.push({ mode: 'perim', a: a, b: b, rot: rot, k: 'p-' + a + '-' + b });
        list.push({ mode: 'rem', a: a, b: b, rot: (rot + 1) % 4, k: 'r-' + a + '-' + b });
      }
    }
    for (a = 2; a <= 13; a++) {
      for (rot = 0; rot < 4; rot++) {
        p = (rot % 2 === 0) ? 'eqp' : 'eqs';
        list.push({ mode: p, a: a, b: a, rot: rot, k: p + '-' + a + '-' + rot });
      }
    }
    return list;
  };

  BUILDERS['iso-base'] = function () {
    var list = [], x, rot;
    for (x = 30; x <= 120; x += 10) {
      if (x === 60 || x === 90) continue;
      for (rot = 0; rot < 4; rot++) list.push({ x: x, rot: rot, k: x + '-' + rot });
    }
    return list;
  };

  BUILDERS['iso-apex'] = function () {
    var list = [], y, rot;
    for (y = 30; y <= 75; y += 5) {
      if (y === 60) continue;
      for (rot = 0; rot < 4; rot++) list.push({ y: y, rot: rot, k: y + '-' + rot });
    }
    return list;
  };

  BUILDERS['angle-class'] = function () {
    var list = [], a, b, c, rot = 0, qIdx, ac = [], ri = [], ob = [], i;
    for (a = 30; a <= 85; a += 5) {
      for (b = a; b <= 85; b += 5) {
        c = 180 - a - b;
        if (c < 30) continue;
        if (c < 90 && b <= c) ac.push([a, b, c]);
      }
    }
    for (a = 30; a <= 45; a += 5) {
      b = 90 - a;
      ri.push([a, b, 90, 2]);
      ri.push([a, 90, b, 2]);
    }
    for (c = 95; c <= 120; c += 5) {
      for (a = 30; a <= 180 - c - 30; a += 5) {
        b = 180 - c - a;
        if (a <= b) ob.push([a, b, c]);
      }
    }
    for (i = 0; i < 12; i++) {
      var ta = ac[(i * 7) % ac.length], tr = ri[i % ri.length], to = ob[(i * 5) % ob.length];
      qIdx = i % 3;
      list.push({ angs: ta, qIdx: qIdx, rot: (rot++) % 4, cls: '예각삼각형', k: 'a-' + ta.join('-') + '-' + qIdx });
      list.push({ angs: [tr[0], tr[1], tr[2]], qIdx: tr[3], rot: (rot++) % 4, cls: '직각삼각형', k: 'r-' + tr.join('-') + '-' + i });
      list.push({ angs: to, qIdx: (qIdx + 2) % 3, rot: (rot++) % 4, cls: '둔각삼각형', k: 'o-' + to.join('-') + '-' + qIdx });
    }
    return list;
  };

  BUILDERS['two-criteria'] = function () {
    var list = [], ys = [30, 35, 40, 45, 50, 55, 65, 70, 75], i, rot;
    for (i = 0; i < ys.length; i++) {
      for (rot = 0; rot < 3; rot++) list.push({ y: ys[i], rot: rot, k: ys[i] + '-' + rot });
    }
    return list;
  };

  BUILDERS['perp-side'] = function () {
    var list = [], b, t, h, fx, vrot, wb;
    for (b = 5; b <= 9; b += 2) {
      for (t = 2; t <= b - 2; t += 2) {
        for (h = 3; h <= 6; h += 3) {
          fx = (b + t + h) % 2;
          vrot = (b + t) % 4;
          wb = (t + h) % 2;
          list.push({ b: b, t: t, h: h, fx: fx, fy: (h === 6 ? 1 : 0), vrot: vrot, wb: wb, k: b + '-' + t + '-' + h + '-' + fx + '-' + wb });
        }
      }
    }
    return list;
  };

  BUILDERS['par-pairs'] = function () {
    var list = [], kind, v, fx;
    for (kind = 0; kind < 6; kind++) {
      for (v = 0; v < 2; v++) {
        for (fx = 0; fx < 2; fx++) list.push({ kind: kind, v: v, fx: fx, k: kind + '-' + v + '-' + fx });
      }
    }
    return list;
  };

  BUILDERS['par-dist'] = function () {
    var list = [], d, c1, c2, e, dx1, dx2;
    for (d = 3; d <= 6; d++) {
      for (c1 = d + 1; c1 <= 9; c1++) {
        dx1 = Math.sqrt(c1 * c1 - d * d);
        if (dx1 + 4.6 > 12) continue; // 짧은 선분·기울어진 선분·수직 선분 차례로 가로 12칸 안
        e = (c1 % (d - 1)) + 1;
        list.push({ d: d, c1: c1, c2: 0, e: e, ord: (d + c1) % 3, k: d + '-' + c1 + '-e' + e });
        c2 = c1 + 1;
        if (c2 <= 10) {
          dx2 = Math.sqrt(c2 * c2 - d * d);
          if (dx1 + dx2 + 3.6 <= 12) {
            list.push({ d: d, c1: c1, c2: c2, e: 0, ord: (d + c2) % 3, k: d + '-' + c1 + '-c' + c2 });
          }
        }
      }
    }
    return list;
  };

  BUILDERS['quad-name'] = function () {
    var list = [], types = ['사다리꼴', '평행사변형', '사다리꼴이 아닌 사각형'], t, i;
    for (t = 0; t < types.length; t++) {
      for (i = 0; i < 4; i++) list.push({ name: types[t], v: i, k: t + '-' + i });
    }
    return list;
  };

  BUILDERS['para-angle'] = function () {
    var list = [], x, adj, rot;
    for (x = 40; x <= 140; x += 5) {
      if (x === 90) continue;
      adj = (x % 10 === 0) ? 1 : 0;
      rot = (x / 5) % 4;
      list.push({ x: x, adj: adj, rot: rot, k: x + '-' + adj });
    }
    return list;
  };

  BUILDERS['para-side'] = function () {
    var list = [], a, b;
    for (a = 3; a <= 12; a++) {
      for (b = 2; b <= 12; b++) {
        if (a !== b && (a + b) % 3 === 0 && Math.max(a, b) <= 2.5 * Math.min(a, b)) list.push({ a: a, b: b, v: (a + b) % 2, k: a + '-' + b });
      }
    }
    return list;
  };

  BUILDERS['rhom-angle'] = function () {
    return BUILDERS['para-angle']();
  };

  BUILDERS['rhom-side'] = function () {
    var list = [], a, sq, askSide;
    for (a = 2; a <= 15; a++) {
      for (sq = 0; sq < 2; sq++) {
        askSide = (a + sq) % 2;
        list.push({ a: a, sq: sq, askSide: askSide, k: a + '-' + sq + '-' + askSide });
      }
    }
    return list;
  };

  BUILDERS['quad-rel'] = function () {
    var list = [], names = ['직사각형', '마름모', '평행사변형'], i, v;
    for (i = 0; i < names.length; i++) {
      for (v = 0; v < 4; v++) list.push({ name: names[i], v: v, k: i + '-' + v });
    }
    return list;
  };

  BUILDERS['poly-name'] = function () {
    var list = [], n, reg, rot;
    for (n = 5; n <= 9; n++) {
      for (reg = 0; reg < 2; reg++) {
        for (rot = 0; rot < 2; rot++) list.push({ n: n, reg: reg, rot: rot, k: n + '-' + reg + '-' + rot });
      }
    }
    return list;
  };

  BUILDERS['diag-one'] = function () {
    var list = [], n, reg, rot;
    for (n = 4; n <= 8; n++) {
      for (reg = 0; reg < 2; reg++) {
        for (rot = 0; rot < 2; rot++) list.push({ n: n, reg: reg, rot: rot, k: n + '-' + reg + '-' + rot });
      }
    }
    return list;
  };

  BUILDERS['diag-count'] = function () {
    var list = [], n, reg, rot;
    for (n = 4; n <= 6; n++) {
      for (reg = 0; reg < 2; reg++) {
        for (rot = 0; rot < 2; rot++) list.push({ n: n, reg: reg, rot: rot, k: n + '-' + reg + '-' + rot });
      }
    }
    return list;
  };

  function poolOf(kind) {
    if (!POOLS[kind] && BUILDERS[kind]) POOLS[kind] = BUILDERS[kind]();
    return POOLS[kind] || [];
  }

  // --- 도형 좌표 도우미 ---
  function polyPts(n, reg, rot, seed) {
    var amp = 1, pts, i, ang, r, ok, baseAng = rot * Math.PI / 7 - Math.PI / 2;
    // 보통 다각형은 반지름·각을 흔들되, 한 각이라도 165° 이상이면 흔들기를 줄여 다시(볼록·각 < 170°)
    for (var tries = 0; tries < 6; tries++, amp *= 0.6) {
      pts = [];
      for (i = 0; i < n; i++) {
        ang = baseAng + (2 * Math.PI * i) / n;
        r = reg ? 1 : (1 + amp * (0.18 * Math.sin(i * 2.1 + seed) + 0.1 * Math.cos(i * 1.3 + seed)));
        if (!reg) ang += amp * 0.12 * Math.sin(i * 1.7 + seed);
        pts.push([r * Math.cos(ang), r * Math.sin(ang)]);
      }
      ok = true;
      for (i = 0; i < n && ok; i++) if (cornerDeg(pts, i) >= 165) ok = false;
      if (reg || ok) break;
    }
    return fitBox(ensureCW(pts), 12, 8, false);
  }

  function cornerDeg(pts, i) {
    var n = pts.length, P = pts[i], Q = pts[(i - 1 + n) % n], R = pts[(i + 1) % n];
    var ux = Q[0] - P[0], uy = Q[1] - P[1], vx = R[0] - P[0], vy = R[1] - P[1];
    var c = (ux * vx + uy * vy) / (Math.sqrt(ux * ux + uy * uy) * Math.sqrt(vx * vx + vy * vy));
    return Math.acos(Math.max(-1, Math.min(1, c))) * 180 / Math.PI;
  }

  function paraPts(angDeg, aLen, bLen, rot) {
    var dx = bLen * Math.cos(rad(angDeg)), dy = -bLen * Math.sin(rad(angDeg));
    var pts = [[0, 0], [dx, dy], [dx + aLen, dy], [aLen, 0]];
    return fitBox(rotCW(pts, rot), 12, 8, false);
  }

  function diagList(pts, onlyZero) {
    var n = pts.length, out = [], i, j;
    for (i = 0; i < (onlyZero ? 1 : n); i++) {
      for (j = i + 2; j < n; j++) {
        if (i === 0 && j === n - 1) continue;
        out.push({ a: pts[i], b: pts[j] });
      }
    }
    return out;
  }

  global.TriQuadGeo = {
    VNAMES: VNAMES, randInt: randInt, round3: round3, rad: rad, cross2: cross2, ensureCW: ensureCW, rotCW: rotCW, fitBox: fitBox, shiftRotate: shiftRotate, makeFig: makeFig, triByAngles: triByAngles, triBySides: triBySides, triClassOf: triClassOf, triMistakeOf: triMistakeOf, quadMistakeOf: quadMistakeOf, edgeName: edgeName, angleName: angleName, POOLS: POOLS, BUILDERS: BUILDERS, poolOf: poolOf, polyPts: polyPts, paraPts: paraPts, diagList: diagList
  };
})(typeof window !== 'undefined' ? window : globalThis);
