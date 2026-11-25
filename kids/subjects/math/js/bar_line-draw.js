/* 4학년 막대그래프(4-1)·꺾은선그래프(4-2) — SVG 그래프 그리기·확인 장면 (DOM 보기 전용) */
(function (global) {
  'use strict';

  var SVG_NS = 'http://www.w3.org/2000/svg';
  var CHART_W = 360;
  var PAD_L = 44, PAD_R = 12, PAD_T = 34, PAD_B = 30, WAVE_H = 26;

  function round3(v) { return Math.round(v * 1000) / 1000; }

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

  function reducedMotion() {
    return Boolean(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function inDoc(node) {
    return Boolean(node && typeof document !== 'undefined' && document.body && document.body.contains(node));
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

  function addClass(el, cls) {
    if (!el) return;
    if (el.classList) { el.classList.add(cls); return; }
    var cur = el.getAttribute('class') || '';
    if ((' ' + cur + ' ').indexOf(' ' + cls + ' ') < 0) el.setAttribute('class', cur ? cur + ' ' + cls : cls);
  }

  function isHidden(c, idx) {
    var list = c && c.hidden;
    if (!list || !list.length) return false;
    for (var i = 0; i < list.length; i += 1) { if (list[i] === idx) return true; }
    return false;
  }

  function layoutOf(c) {
    var isH = c.type === 'bar' && c.orient === 'h';
    var n = c.cats ? c.cats.length : 1;
    var H = isH ? n * 30 + 70 : 240;
    var base = c.base || 0;
    var hasWave = base > 0;
    var x0 = PAD_L, x1 = CHART_W - PAD_R, y0 = PAD_T, y1 = H - PAD_B;
    var valBaseY = hasWave && !isH ? y1 - WAVE_H : y1;
    var valBaseX = hasWave && isH ? x0 + WAVE_H : x0;
    return {
      isH: isH, n: n, W: CHART_W, H: H, base: base, hasWave: hasWave,
      x0: x0, x1: x1, y0: y0, y1: y1,
      valBaseY: valBaseY, valSpanY: valBaseY - y0,
      valBaseX: valBaseX, valSpanX: x1 - valBaseX
    };
  }

  // 값 → 좌표 단일 변환 (눈금선·막대 끝·꺾은선 점 모두 이 함수만 사용)
  function valToPos(c, lay, val) {
    var spanVal = (c.cells || 1) * (c.scale || 1);
    var t = (val - lay.base) / spanVal;
    return lay.isH ? lay.valBaseX + t * lay.valSpanX : lay.valBaseY - t * lay.valSpanY;
  }

  function catCenter(lay, idx) {
    if (lay.isH) return lay.y0 + (idx + 0.5) * ((lay.y1 - lay.y0) / lay.n);
    return lay.x0 + (idx + 0.5) * ((lay.x1 - lay.x0) / lay.n);
  }

  function barGeom(c, lay, idx) {
    var v = c.values[idx];
    if (lay.isH) {
      var slotH = (lay.y1 - lay.y0) / lay.n, bh = slotH * 0.55;
      var cy = catCenter(lay, idx), ex = valToPos(c, lay, v);
      return { x: lay.valBaseX, y: cy - bh / 2, w: Math.max(0, ex - lay.valBaseX), h: bh, tipX: ex, tipY: cy };
    }
    var slotW = (lay.x1 - lay.x0) / lay.n, bw = slotW * 0.55;
    var cx = catCenter(lay, idx), ey = valToPos(c, lay, v);
    return { x: cx - bw / 2, y: ey, w: bw, h: Math.max(0, lay.valBaseY - ey), tipX: cx, tipY: ey };
  }

  function itemTip(c, lay, idx) {
    if (c.type === 'bar') {
      var g = barGeom(c, lay, idx);
      return [g.tipX, g.tipY];
    }
    return [catCenter(lay, idx), valToPos(c, lay, c.values[idx])];
  }

  function wavePathD(x0, x1, yMid) {
    var segs = 12, step = (x1 - x0) / segs, amp = 2.5, gap = 3.5;
    function oneWave(yc) {
      var d = 'M ' + round3(x0) + ' ' + round3(yc), i, cx, ex, dy;
      for (i = 0; i < segs; i += 1) {
        cx = x0 + (i + 0.5) * step;
        ex = x0 + (i + 1) * step;
        dy = (i % 2 === 0 ? -amp : amp);
        d += ' Q ' + round3(cx) + ' ' + round3(yc + dy) + ' ' + round3(ex) + ' ' + round3(yc);
      }
      return d;
    }
    return oneWave(yMid - gap) + ' ' + oneWave(yMid + gap);
  }

  function drawHeader(svg, c, lay) {
    if (c.title) {
      svg.appendChild(svgEl('text', {
        class: 'gr-title', x: round3(lay.W / 2), y: 13,
        'text-anchor': 'middle', 'dominant-baseline': 'middle'
      }, c.title));
    }
    if (c.axisUnit) {
      svg.appendChild(svgEl('text', {
        class: 'gr-unit',
        x: lay.isH ? round3(lay.x1) : 6,
        y: lay.isH ? 25 : 18, // 세로 값 축은 맨 위 눈금 숫자(y = 34)와 겹치지 않게 위로
        'text-anchor': lay.isH ? 'end' : 'start',
        'dominant-baseline': 'middle'
      }, c.axisUnit));
    }
  }

  function drawGridAndAxis(svg, c, lay) {
    var cells = c.cells || 1, scale = c.scale || 1, every = c.labelEvery || 1, k, pos, isMajor, val;
    if (lay.isH) {
      svg.appendChild(svgEl('line', { class: 'gr-grid gr-major', x1: lay.x0, y1: lay.y0, x2: lay.x0, y2: lay.y1 }));
      for (k = 0; k <= cells; k += 1) {
        val = lay.base + k * scale;
        pos = round3(valToPos(c, lay, val));
        isMajor = k % every === 0;
        svg.appendChild(svgEl('line', {
          class: isMajor ? 'gr-grid gr-major' : 'gr-grid',
          x1: pos, y1: lay.y0, x2: pos, y2: lay.y1
        }));
        if (isMajor) {
          svg.appendChild(svgEl('text', {
            class: 'gr-num', x: pos, y: round3(lay.y1 + 14),
            'text-anchor': 'middle', 'dominant-baseline': 'middle'
          }, String(val)));
        }
      }
      return;
    }

    svg.appendChild(svgEl('line', { class: 'gr-grid gr-major', x1: lay.x0, y1: lay.y0, x2: lay.x0, y2: lay.y1 }));
    if (lay.hasWave) {
      svg.appendChild(svgEl('line', { class: 'gr-grid gr-major', x1: lay.x0, y1: lay.y1, x2: lay.x1, y2: lay.y1 }));
      svg.appendChild(svgEl('text', {
        class: 'gr-num', x: round3(lay.x0 - 6), y: round3(lay.y1),
        'text-anchor': 'end', 'dominant-baseline': 'middle'
      }, '0'));
      svg.appendChild(svgEl('path', {
        class: 'gr-wave', d: wavePathD(lay.x0 - 3, lay.x1, (lay.y1 + lay.valBaseY) / 2)
      }));
    }
    for (k = 0; k <= cells; k += 1) {
      val = lay.base + k * scale;
      pos = round3(valToPos(c, lay, val));
      isMajor = k % every === 0;
      svg.appendChild(svgEl('line', {
        class: isMajor ? 'gr-grid gr-major' : 'gr-grid',
        x1: lay.x0, y1: pos, x2: lay.x1, y2: pos
      }));
      if (isMajor) {
        svg.appendChild(svgEl('text', {
          class: 'gr-num', x: round3(lay.x0 - 6), y: pos,
          'text-anchor': 'end', 'dominant-baseline': 'middle'
        }, String(val)));
      }
    }
  }

  function drawCats(svg, c, lay) {
    var i, pos;
    for (i = 0; i < lay.n; i += 1) {
      pos = round3(catCenter(lay, i));
      if (lay.isH) {
        svg.appendChild(svgEl('text', {
          class: 'gr-cat', x: round3(lay.x0 - 6), y: pos,
          'text-anchor': 'end', 'dominant-baseline': 'middle'
        }, c.cats[i]));
      } else {
        svg.appendChild(svgEl('text', {
          class: 'gr-cat', x: pos, y: round3(lay.y1 + 15),
          'text-anchor': 'middle', 'dominant-baseline': 'middle'
        }, c.cats[i]));
      }
    }
  }

  function drawBars(svg, c, lay) {
    var i, g, qx, qy;
    for (i = 0; i < lay.n; i += 1) {
      if (isHidden(c, i)) {
        qx = lay.isH ? lay.valBaseX + 14 : catCenter(lay, i);
        qy = lay.isH ? catCenter(lay, i) : lay.valBaseY - 14;
        svg.appendChild(svgEl('text', {
          class: 'gr-q', 'data-at': String(i), x: round3(qx), y: round3(qy),
          'text-anchor': 'middle', 'dominant-baseline': 'middle'
        }, '?'));
        continue;
      }
      g = barGeom(c, lay, i);
      svg.appendChild(svgEl('rect', {
        class: 'gr-bar', 'data-at': String(i),
        x: round3(g.x), y: round3(g.y), width: round3(g.w), height: round3(g.h)
      }));
    }
  }

  function drawLine(svg, c, lay) {
    var pts = [], coords = [], i, px, py;
    for (i = 0; i < lay.n; i += 1) {
      px = round3(catCenter(lay, i));
      py = round3(valToPos(c, lay, c.values[i]));
      pts.push(px + ',' + py);
      coords.push([px, py]);
    }
    svg.appendChild(svgEl('polyline', { class: 'gr-line', points: pts.join(' ') }));
    for (i = 0; i < coords.length; i += 1) {
      svg.appendChild(svgEl('circle', {
        class: 'gr-pt', 'data-at': String(i),
        cx: coords[i][0], cy: coords[i][1], r: 4
      }));
    }
  }

  function chart(c) {
    var lay = layoutOf(c);
    var svg = svgEl('svg', {
      class: 'gr-chart',
      viewBox: '0 0 ' + lay.W + ' ' + lay.H,
      width: '100%',
      preserveAspectRatio: 'xMidYMid meet',
      role: 'img',
      'aria-label': c.title || '그래프'
    });
    drawHeader(svg, c, lay);
    drawGridAndAxis(svg, c, lay);
    drawCats(svg, c, lay);
    if (c.type === 'bar') drawBars(svg, c, lay);
    else drawLine(svg, c, lay);
    return svg;
  }

  function waitIfAttached(svg, ms, done) {
    var delay = reducedMotion() ? 0 : ms;
    if (delay <= 0) {
      if (inDoc(svg) && typeof done === 'function') done();
      return;
    }
    global.setTimeout(function () {
      if (inDoc(svg) && typeof done === 'function') done();
    }, delay);
  }

  function highlight(svg, ats, done) {
    if (!inDoc(svg)) return;
    var list = ats || [], i, nodes, j;
    for (i = 0; i < list.length; i += 1) {
      nodes = svg.querySelectorAll('[data-at="' + list[i] + '"]');
      for (j = 0; j < nodes.length; j += 1) { addClass(nodes[j], 'gr-on'); }
    }
    waitIfAttached(svg, 400, done);
  }

  function revealBar(svg, c, at, done) {
    if (!inDoc(svg)) return;
    var qNode = svg.querySelector('.gr-q[data-at="' + at + '"]');
    if (qNode && qNode.parentNode) qNode.parentNode.removeChild(qNode);
    var lay = layoutOf(c), g = barGeom(c, lay, at);
    var rect = svgEl('rect', {
      class: 'gr-bar gr-on', 'data-at': String(at),
      x: round3(g.x), y: round3(lay.isH ? g.y : lay.valBaseY),
      width: round3(lay.isH ? 0 : g.w), height: round3(lay.isH ? g.h : 0)
    });
    svg.appendChild(rect);

    function applyRatio(t) {
      if (lay.isH) {
        rect.setAttribute('width', String(round3(g.w * t)));
      } else {
        var curH = g.h * t;
        rect.setAttribute('y', String(round3(lay.valBaseY - curH)));
        rect.setAttribute('height', String(round3(curH)));
      }
    }

    if (reducedMotion()) {
      applyRatio(1);
      if (inDoc(svg) && typeof done === 'function') done();
      return;
    }

    var start = null, dur = 600;
    var raf = global.requestAnimationFrame || function (cb) { return global.setTimeout(function () { cb(Date.now()); }, 16); };
    function step(ts) {
      if (!inDoc(svg)) return;
      if (start === null) start = ts;
      var raw = Math.min(1, (ts - start) / dur);
      var eased = 1 - Math.pow(1 - raw, 3);
      applyRatio(eased);
      if (raw < 1) { raf(step); return; }
      applyRatio(1);
      if (typeof done === 'function') done();
    }
    raf(step);
  }

  function arrow(svg, c, from, to, text, done) {
    if (!inDoc(svg)) return;
    var lay = layoutOf(c);
    var p1 = itemTip(c, lay, from), p2 = itemTip(c, lay, to);
    var dx = p2[0] - p1[0], dy = p2[1] - p1[1];
    var len = Math.sqrt(dx * dx + dy * dy) || 1;
    var ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
    var trim = Math.min(4, len * 0.15);
    var sx = p1[0] + ux * trim, sy = p1[1] + uy * trim;
    var ex = p2[0] - ux * trim, ey = p2[1] - uy * trim;
    var headL = 7, headW = 4;
    var w1x = ex - ux * headL + nx * headW, w1y = ey - uy * headL + ny * headW;
    var w2x = ex - ux * headL - nx * headW, w2y = ey - uy * headL - ny * headW;
    var d = 'M ' + round3(sx) + ' ' + round3(sy) + ' L ' + round3(ex) + ' ' + round3(ey) +
      ' M ' + round3(w1x) + ' ' + round3(w1y) + ' L ' + round3(ex) + ' ' + round3(ey) +
      ' L ' + round3(w2x) + ' ' + round3(w2y);
    svg.appendChild(svgEl('path', { class: 'gr-arrow', d: d }));
    if (text) {
      var tx = clamp((p1[0] + p2[0]) / 2, lay.x0 + 24, lay.x1 - 24);
      var ty = clamp((p1[1] + p2[1]) / 2 - 10, lay.y0 + 10, lay.y1 - 8);
      svg.appendChild(svgEl('text', {
        class: 'gr-diff', x: round3(tx), y: round3(ty),
        'text-anchor': 'middle', 'dominant-baseline': 'middle'
      }, text));
    }
    waitIfAttached(svg, 600, done);
  }

  function revealMid(svg, c, i, text, done) {
    if (!inDoc(svg)) return;
    var lay = layoutOf(c);
    var p1 = itemTip(c, lay, i), p2 = itemTip(c, lay, i + 1);
    var mx = (p1[0] + p2[0]) / 2, my = (p1[1] + p2[1]) / 2;
    svg.appendChild(svgEl('circle', { class: 'gr-mid', cx: round3(mx), cy: round3(my), r: 5 }));
    if (text) {
      var tx = clamp(mx, lay.x0 + 24, lay.x1 - 24);
      var ty = clamp(my - 12, lay.y0 + 10, lay.y1 - 8);
      svg.appendChild(svgEl('text', {
        class: 'gr-diff', x: round3(tx), y: round3(ty),
        'text-anchor': 'middle', 'dominant-baseline': 'middle'
      }, text));
    }
    waitIfAttached(svg, 600, done);
  }

  global.BarLineDraw = {
    chart: chart,
    highlight: highlight,
    revealBar: revealBar,
    arrow: arrow,
    revealMid: revealMid
  };
})(typeof window !== 'undefined' ? window : globalThis);
