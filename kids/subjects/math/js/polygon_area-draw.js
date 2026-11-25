/* 다각형의 둘레와 넓이 (5-1 6단원)·삼각형·사각형·다각형 (4-2) — 도형 SVG 그리기·칸 세기·식 줄 (DOM 보기 전용) */
(function (global) {
  'use strict';

  var SVG_NS = 'http://www.w3.org/2000/svg';

  function round3(v) { return Math.round(v * 1000) / 1000; }

  function reducedMotion() {
    return Boolean(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function svgEl(tag, attrs, text) {
    var node = document.createElementNS(SVG_NS, tag);
    if (attrs) {
      var keys = Object.keys(attrs), i, k, v;
      for (i = 0; i < keys.length; i += 1) {
        k = keys[i]; v = attrs[k];
        if (v !== null && v !== undefined && v !== '') node.setAttribute(k, String(v));
      }
    }
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function layoutOf(fig) {
    var w = fig.w || 0, h = fig.h || 0;
    var W = Math.max(w + 5, 12), H = Math.max(h + 3, 6);
    return { W: W, H: H, ox: (W - w) / 2, oy: (H - h) / 2 };
  }

  function centroid(pts) {
    var sx = 0, sy = 0, n = pts ? pts.length : 0, i;
    for (i = 0; i < n; i += 1) { sx += pts[i][0]; sy += pts[i][1]; }
    return n ? [sx / n, sy / n] : [0, 0];
  }

  function dist2(ax, ay, bx, by) {
    var dx = ax - bx, dy = ay - by;
    return dx * dx + dy * dy;
  }

  function drawGrid(svg, fig, lay) {
    var x, y, w = fig.w, h = fig.h, ox = lay.ox, oy = lay.oy;
    for (x = 0; x <= w; x += 1) {
      svg.appendChild(svgEl('line', {
        class: 'pa-grid',
        x1: round3(ox + x), y1: round3(oy),
        x2: round3(ox + x), y2: round3(oy + h)
      }));
    }
    for (y = 0; y <= h; y += 1) {
      svg.appendChild(svgEl('line', {
        class: 'pa-grid',
        x1: round3(ox), y1: round3(oy + y),
        x2: round3(ox + w), y2: round3(oy + y)
      }));
    }
  }

  function drawPolygon(svg, pts, lay) {
    var list = [], i;
    for (i = 0; i < pts.length; i += 1) {
      list.push(round3(lay.ox + pts[i][0]) + ',' + round3(lay.oy + pts[i][1]));
    }
    svg.appendChild(svgEl('polygon', { class: 'pa-shape', points: list.join(' ') }));
  }

  function drawTicks(svg, pts, ticks, lay) {
    var n = pts.length, i, idx, p1, p2, mx, my, dx, dy, len, nx, ny;
    for (i = 0; i < ticks.length; i += 1) {
      idx = ticks[i];
      p1 = pts[idx]; p2 = pts[(idx + 1) % n];
      if (!p1 || !p2) continue;
      mx = (p1[0] + p2[0]) / 2; my = (p1[1] + p2[1]) / 2;
      dx = p2[0] - p1[0]; dy = p2[1] - p1[1];
      len = Math.sqrt(dx * dx + dy * dy) || 1;
      nx = (-dy / len) * 0.2; ny = (dx / len) * 0.2;
      svg.appendChild(svgEl('line', {
        class: 'pa-tick',
        x1: round3(lay.ox + mx - nx), y1: round3(lay.oy + my - ny),
        x2: round3(lay.ox + mx + nx), y2: round3(lay.oy + my + ny)
      }));
    }
  }

  function drawDiagonals(svg, diags, lay) {
    var i, dg, qx, qy, isHoriz;
    for (i = 0; i < diags.length; i += 1) {
      dg = diags[i];
      svg.appendChild(svgEl('line', {
        class: 'pa-diag',
        x1: round3(lay.ox + dg.a[0]), y1: round3(lay.oy + dg.a[1]),
        x2: round3(lay.ox + dg.b[0]), y2: round3(lay.oy + dg.b[1])
      }));
      // 꼬리표는 대각선 끝 바깥(가로 대각선은 오른쪽 끝 오른쪽, 세로 대각선은 아래 끝 아래) — 변·다른 대각선과 겹치지 않게
      isHoriz = Math.abs(dg.b[0] - dg.a[0]) >= Math.abs(dg.b[1] - dg.a[1]);
      qx = isHoriz ? Math.max(dg.a[0], dg.b[0]) + 0.3 : dg.a[0];
      qy = isHoriz ? dg.a[1] : Math.max(dg.a[1], dg.b[1]) + 0.65;
      svg.appendChild(svgEl('text', {
        class: 'pa-label pa-dlabel',
        x: round3(lay.ox + qx), y: round3(lay.oy + qy),
        'text-anchor': isHoriz ? 'start' : 'middle',
        'dominant-baseline': 'middle'
      }, dg.text));
    }
  }

  function drawHeight(svg, ht, c, lay) {
    var ox = lay.ox, oy = lay.oy;
    if (ht.ext) {
      svg.appendChild(svgEl('line', {
        class: 'pa-ext',
        x1: round3(ox + ht.ext.from[0]), y1: round3(oy + ht.ext.from[1]),
        x2: round3(ox + ht.ext.to[0]), y2: round3(oy + ht.ext.to[1])
      }));
    }
    svg.appendChild(svgEl('line', {
      class: 'pa-height',
      x1: round3(ox + ht.top[0]), y1: round3(oy + ht.top[1]),
      x2: round3(ox + ht.foot[0]), y2: round3(oy + ht.foot[1])
    }));
    var fx = ht.foot[0], fy = ht.foot[1];
    var sx = fx >= c[0] ? -0.4 : 0.4;
    var d = 'M ' + round3(ox + fx) + ' ' + round3(oy + fy - 0.4)
      + ' L ' + round3(ox + fx + sx) + ' ' + round3(oy + fy - 0.4)
      + ' L ' + round3(ox + fx + sx) + ' ' + round3(oy + fy);
    svg.appendChild(svgEl('path', { class: 'pa-right', d: d }));
    var hx = (ht.top[0] + fx) / 2, hy = (ht.top[1] + fy) / 2;
    // 안쪽 높이는 무게중심 쪽(빗변에 걸치지 않게), 바깥 높이(연장선)는 도형 반대쪽
    var onRight = ht.ext ? hx >= c[0] : hx < c[0];
    svg.appendChild(svgEl('text', {
      class: 'pa-label pa-hlabel',
      x: round3(ox + hx + (onRight ? 0.3 : -0.3)),
      y: round3(oy + hy),
      'text-anchor': onRight ? 'start' : 'end',
      'dominant-baseline': 'middle'
    }, ht.text));
  }

  function drawLabels(svg, labels, c, lay) {
    var i, lb, mx, my, dx, dy, len, nx, ny, c1x, c1y, c2x, c2y, lx, ly;
    for (i = 0; i < labels.length; i += 1) {
      lb = labels[i];
      mx = (lb.a[0] + lb.b[0]) / 2; my = (lb.a[1] + lb.b[1]) / 2;
      dx = lb.b[0] - lb.a[0]; dy = lb.b[1] - lb.a[1];
      len = Math.sqrt(dx * dx + dy * dy) || 1;
      // 글자 폭·높이만큼 더 띄움(세워진 변일수록 가로 폭이 선을 넘어오므로)
      var off = 0.45 + Math.abs(dy / len) * String(lb.text).length * 0.2 + Math.abs(dx / len) * 0.3;
      nx = (-dy / len) * off; ny = (dx / len) * off;
      c1x = mx + nx; c1y = my + ny;
      c2x = mx - nx; c2y = my - ny;
      if (dist2(c1x, c1y, c[0], c[1]) >= dist2(c2x, c2y, c[0], c[1])) { lx = c1x; ly = c1y; }
      else { lx = c2x; ly = c2y; }
      svg.appendChild(svgEl('text', {
        class: 'pa-label',
        x: round3(lay.ox + lx), y: round3(lay.oy + ly),
        'text-anchor': 'middle', 'dominant-baseline': 'middle'
      }, lb.text));
    }
  }

  // ── 4-2 삼각형·사각형·다각형 확장 (선택 칸: 없으면 5-1 그림과 똑같음) ──
  function unit(dx, dy) { var l = Math.sqrt(dx * dx + dy * dy) || 1; return [dx / l, dy / l]; }

  function drawVertexNames(svg, pts, names, c, lay) {
    for (var i = 0; i < pts.length && i < names.length; i += 1) {
      var u = unit(pts[i][0] - c[0], pts[i][1] - c[1]);
      svg.appendChild(svgEl('text', {
        class: 'pa-vname', x: round3(lay.ox + pts[i][0] + u[0] * 0.6), y: round3(lay.oy + pts[i][1] + u[1] * 0.6),
        'text-anchor': 'middle', 'dominant-baseline': 'middle'
      }, names[i]));
    }
  }

  // 꼭짓점 i의 안쪽 각: 이웃 두 변 방향 u·v, 글자는 이등분선 위(좁은 각일수록 멀리)
  function angleGeom(pts, i, lay) {
    var n = pts.length, P = pts[i], Q = pts[(i - 1 + n) % n], R = pts[(i + 1) % n];
    var u = unit(Q[0] - P[0], Q[1] - P[1]), v = unit(R[0] - P[0], R[1] - P[1]);
    var th = Math.acos(Math.max(-1, Math.min(1, u[0] * v[0] + u[1] * v[1])));
    var b = unit(u[0] + v[0], u[1] + v[1]);
    var rt = Math.min(2.4, Math.max(1.15, 0.62 / Math.sin(th / 2)));
    return { px: lay.ox + P[0], py: lay.oy + P[1], u: u, v: v, cross: u[0] * v[1] - u[1] * v[0], tx: lay.ox + P[0] + b[0] * rt, ty: lay.oy + P[1] + b[1] * rt };
  }

  function fillAngle(g, ag, a) {
    while (g.firstChild) g.removeChild(g.firstChild);
    var px = ag.px, py = ag.py, u = ag.u, v = ag.v, k, r;
    if (a.right) {
      g.appendChild(svgEl('path', { class: 'pa-right', d: 'M ' + round3(px + u[0] * 0.45) + ' ' + round3(py + u[1] * 0.45) +
        ' L ' + round3(px + (u[0] + v[0]) * 0.45) + ' ' + round3(py + (u[1] + v[1]) * 0.45) + ' L ' + round3(px + v[0] * 0.45) + ' ' + round3(py + v[1] * 0.45) }));
    } else {
      for (k = 0; k < (a.mark === 2 ? 2 : 1); k += 1) {
        r = 0.6 + k * 0.16;
        g.appendChild(svgEl('path', { class: 'pa-arc', d: 'M ' + round3(px + u[0] * r) + ' ' + round3(py + u[1] * r) +
          ' A ' + r + ' ' + r + ' 0 0 ' + (ag.cross > 0 ? 1 : 0) + ' ' + round3(px + v[0] * r) + ' ' + round3(py + v[1] * r) }));
      }
    }
    if (a.text) {
      g.appendChild(svgEl('text', { class: a.text === '?' ? 'pa-angle pa-angle-q' : 'pa-angle', x: round3(ag.tx), y: round3(ag.ty),
        'text-anchor': 'middle', 'dominant-baseline': 'middle' }, a.text));
    }
  }

  function drawAngles(svg, pts, angles, lay) {
    for (var i = 0; i < angles.length; i += 1) {
      var a = angles[i], g = svgEl('g', { class: 'pa-ang', 'data-at': String(a.at) });
      g._ag = angleGeom(pts, a.at, lay);
      fillAngle(g, g._ag, a);
      svg.appendChild(g);
    }
  }

  // 맞힌 뒤 '?' 자리를 값으로(90°면 직각 표시로)
  function setAngle(svg, at, text, right) {
    var g = svg && svg.querySelector('g.pa-ang[data-at="' + at + '"]');
    if (g && g._ag) fillAngle(g, g._ag, { text: text, right: Boolean(right), mark: 1 });
  }

  // 평행 표시: 두 변에 같은 방향 '>'를 쌍 번호만큼, 변의 0.35 지점(같은 길이 빗금은 가운데)
  function drawParallels(svg, pts, pairs, lay) {
    var n = pts.length;
    for (var k = 0; k < pairs.length; k += 1) {
      var e0 = pairs[k][0], d = unit(pts[(e0 + 1) % n][0] - pts[e0][0], pts[(e0 + 1) % n][1] - pts[e0][1]);
      for (var s = 0; s < 2; s += 1) {
        var e = pairs[k][s], A = pts[e], B = pts[(e + 1) % n];
        var t = (B[0] - A[0]) * d[0] + (B[1] - A[1]) * d[1] >= 0 ? 0.35 : 0.65;
        var mx = A[0] + (B[0] - A[0]) * t, my = A[1] + (B[1] - A[1]) * t, nx = -d[1], ny = d[0], j, cx, cy;
        for (j = 0; j <= k; j += 1) {
          cx = lay.ox + mx + d[0] * (j - k / 2) * 0.2; cy = lay.oy + my + d[1] * (j - k / 2) * 0.2;
          svg.appendChild(svgEl('path', { class: 'pa-par', d: 'M ' + round3(cx - d[0] * 0.14 + nx * 0.14) + ' ' + round3(cy - d[1] * 0.14 + ny * 0.14) +
            ' L ' + round3(cx + d[0] * 0.14) + ' ' + round3(cy + d[1] * 0.14) + ' L ' + round3(cx - d[0] * 0.14 - nx * 0.14) + ' ' + round3(cy - d[1] * 0.14 - ny * 0.14) }));
        }
      }
    }
  }

  // 자유 선분: kind 'line'은 끝까지 늘인 직선(평행선), 'seg'는 꼬리표와 a 끝 직각 표시(수평선 기준)
  function drawSegments(svg, segs, lay) {
    for (var i = 0; i < segs.length; i += 1) {
      var sg = segs[i], ax = lay.ox + sg.a[0], ay = lay.oy + sg.a[1], bx = lay.ox + sg.b[0], by = lay.oy + sg.b[1];
      if (sg.kind === 'line') {
        var d = unit(bx - ax, by - ay);
        svg.appendChild(svgEl('line', { class: 'pa-line', x1: round3(ax - d[0] * 40), y1: round3(ay - d[1] * 40), x2: round3(bx + d[0] * 40), y2: round3(by + d[1] * 40) }));
        continue;
      }
      svg.appendChild(svgEl('line', { class: 'pa-seg', x1: round3(ax), y1: round3(ay), x2: round3(bx), y2: round3(by) }));
      if (sg.right) {
        var w = unit(bx - ax, by - ay);
        svg.appendChild(svgEl('path', { class: 'pa-right', d: 'M ' + round3(ax + w[0] * 0.4) + ' ' + round3(ay + w[1] * 0.4) +
          ' L ' + round3(ax + w[0] * 0.4 + 0.4) + ' ' + round3(ay + w[1] * 0.4) + ' L ' + round3(ax + 0.4) + ' ' + round3(ay) }));
      }
      if (sg.text) {
        svg.appendChild(svgEl('text', { class: 'pa-label', x: round3((ax + bx) / 2 + 0.3), y: round3((ay + by) / 2),
          'text-anchor': 'start', 'dominant-baseline': 'middle' }, sg.text));
      }
    }
  }

  // 6관 정답 뒤 대각선을 차례로(합쳐 1.2초 이내, 문서에서 떨어지면 멈춤)
  function revealDiagonals(svg, fig, diags, done) {
    var lay = layoutOf(fig), i = 0, list = diags || [];
    var ms = reducedMotion() ? 0 : Math.min(200, Math.floor(1200 / Math.max(1, list.length)));
    function step() {
      if (!document.body.contains(svg)) return;
      if (i >= list.length) { if (typeof done === 'function') done(); return; }
      var dg = list[i]; i += 1;
      svg.appendChild(svgEl('line', { class: 'pa-diag', x1: round3(lay.ox + dg.a[0]), y1: round3(lay.oy + dg.a[1]), x2: round3(lay.ox + dg.b[0]), y2: round3(lay.oy + dg.b[1]) }));
      if (ms === 0) step(); else global.setTimeout(step, ms);
    }
    step();
  }

  function figure(fig) {
    var lay = layoutOf(fig);
    var svg = svgEl('svg', {
      class: 'pa-fig',
      viewBox: '0 0 ' + round3(lay.W) + ' ' + round3(lay.H),
      width: '100%',
      preserveAspectRatio: 'xMidYMid meet',
      role: 'img'
    });
    var c = centroid(fig.points);
    if (fig.grid) drawGrid(svg, fig, lay);
    if (fig.points && fig.points.length) drawPolygon(svg, fig.points, lay);
    if (fig.ticks && fig.ticks.length) drawTicks(svg, fig.points, fig.ticks, lay);
    if (fig.diagonals && fig.diagonals.length) drawDiagonals(svg, fig.diagonals, lay);
    if (fig.height) drawHeight(svg, fig.height, c, lay);
    if (fig.labels && fig.labels.length) drawLabels(svg, fig.labels, c, lay);
    if (fig.segments && fig.segments.length) drawSegments(svg, fig.segments, lay);
    if (fig.parallels && fig.parallels.length) drawParallels(svg, fig.points, fig.parallels, lay);
    if (fig.angles && fig.angles.length) drawAngles(svg, fig.points, fig.angles, lay);
    if (fig.vertexNames && fig.vertexNames.length) drawVertexNames(svg, fig.points, fig.vertexNames, c, lay);
    return svg;
  }

  function countCells(svg, fig, done) {
    if (!svg || !fig || !fig.cells) { if (typeof done === 'function') done(); return; }
    var lay = layoutOf(fig);
    var cols = Math.round(fig.w), rows = Math.round(fig.h);
    var row = 0, timer = null, finished = false;
    var stepMs = reducedMotion() || rows <= 1 ? 0 : Math.min(300, Math.floor(1200 / rows));

    function addRow(r) {
      for (var c = 0; c < cols; c += 1) {
        svg.appendChild(svgEl('text', {
          class: 'pa-cellnum',
          x: round3(lay.ox + c + 0.5),
          y: round3(lay.oy + r + 0.5),
          'text-anchor': 'middle',
          'dominant-baseline': 'middle'
        }, String(r * cols + c + 1)));
      }
    }

    function finishAll() {
      if (finished) return;
      finished = true;
      if (timer) global.clearTimeout(timer);
      svg.removeEventListener('click', finishAll);
      if (!document.body.contains(svg)) return;
      while (row < rows) { addRow(row); row += 1; }
      if (typeof done === 'function') done();
    }

    if (stepMs === 0) { finishAll(); return; }
    svg.addEventListener('click', finishAll);

    function tick() {
      if (finished) return;
      if (!document.body.contains(svg)) { finished = true; svg.removeEventListener('click', finishAll); return; }
      addRow(row);
      row += 1;
      if (row >= rows) { finishAll(); return; }
      timer = global.setTimeout(tick, stepMs);
    }
    tick();
  }

  function workLine(box) {
    var el = document.createElement('div');
    el.className = 'pa-work';
    el.textContent = '\u00a0';
    if (box) box.appendChild(el);
    return {
      el: el,
      set: function (text) { el.textContent = text ? String(text) : '\u00a0'; },
      append: function (text) {
        if (el.textContent === '\u00a0') el.textContent = String(text);
        else el.textContent += String(text);
      }
    };
  }

  global.PolyAreaDraw = { figure: figure, countCells: countCells, workLine: workLine, setAngle: setAngle, revealDiagonals: revealDiagonals };
})(typeof window !== 'undefined' ? window : globalThis);
