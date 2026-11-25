/* 다각형의 둘레와 넓이 (5-1 6단원) — 도형 SVG 그리기·칸 세기·식 줄 (DOM 보기 전용) */
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

  global.PolyAreaDraw = { figure: figure, countCells: countCells, workLine: workLine };
})(typeof window !== 'undefined' ? window : globalThis);
