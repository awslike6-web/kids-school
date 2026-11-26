// 초등 2-2 '4. 시각과 시간' 그림 부품 (ClockDraw, docs/math_2-2_time_spec.md)
(function (global) {
  'use strict';

  var SVG_NS = 'http://www.w3.org/2000/svg';
  var WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

  function clamp(n, lo, hi) {
    var v = Number(n);
    if (isNaN(v)) v = lo;
    if (v < lo) return lo;
    if (v > hi) return hi;
    return v;
  }

  function normHour(h) {
    var v = Math.floor(Number(h));
    if (isNaN(v)) v = 12;
    return ((v - 1) % 12 + 12) % 12 + 1;
  }

  function normMin(m) {
    var v = Math.floor(Number(m));
    if (isNaN(v)) v = 0;
    return ((v % 60) + 60) % 60;
  }

  function makeEl(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function makeSvg(tag, attrs, text) {
    var node = document.createElementNS(SVG_NS, tag);
    if (attrs) {
      var keys = Object.keys(attrs);
      for (var i = 0; i < keys.length; i += 1) {
        node.setAttribute(keys[i], String(attrs[keys[i]]));
      }
    }
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function polar(cx, cy, r, deg) {
    var rad = (deg - 90) * Math.PI / 180;
    return {
      x: Number((cx + r * Math.cos(rad)).toFixed(2)),
      y: Number((cy + r * Math.sin(rad)).toFixed(2))
    };
  }

  function pctStr(val, total) {
    if (!total) return '0%';
    return (clamp(val, 0, total) / total * 100) + '%';
  }

  // 순수 함수: 시침·분침 각도 (12시 = 0°, 시계 방향, DOM 없음)
  function handAngles(h, m) {
    var hour = Number(h) || 0;
    var min = Number(m) || 0;
    var h12 = ((hour % 12) + 12) % 12;
    var mNorm = ((min % 60) + 60) % 60;
    return {
      hour: h12 * 30 + mNorm * 0.5,
      minute: mNorm * 6
    };
  }

  // 순수 함수: 각도 → 분 (0~59, step 단위 반올림, 60이면 0, DOM 없음)
  function angleToMinute(deg, step) {
    var s = Number(step) > 0 ? Math.floor(Number(step)) : 1;
    var d = ((Number(deg) || 0) % 360 + 360) % 360;
    var raw = Math.round((d / 6) / s) * s;
    return ((raw % 60) + 60) % 60;
  }

  function sectorPath(h) {
    var h12 = ((h % 12) + 12) % 12;
    var a1 = h12 * 30;
    var a2 = a1 + 30;
    var p1 = polar(100, 100, 86, a1);
    var p2 = polar(100, 100, 86, a2);
    return 'M 100 100 L ' + p1.x + ' ' + p1.y + ' A 86 86 0 0 1 ' + p2.x + ' ' + p2.y + ' Z';
  }

  // 시계 그림 (읽기 + 긴바늘 끌기 맞추기)
  function clock(opts) {
    var o = opts || {};
    var curH = normHour(o.h === undefined ? 12 : o.h);
    var curM = normMin(o.m === undefined ? 0 : o.m);
    var step = Number(o.step) > 0 ? Math.floor(Number(o.step)) : 1;
    var draggable = Boolean(o.draggable);
    var onChange = typeof o.onChange === 'function' ? o.onChange : null;
    var showHourHint = Boolean(o.hourHint);
    var hideHour = Boolean(o.hideHour);
    var locked = false;
    var dragging = false;
    var activePointerId = null;

    var wrap = makeEl('div', draggable ? 'tc-clock-wrap is-drag' : 'tc-clock-wrap');
    var svg = makeSvg('svg', {
      'class': 'tc-clock-svg',
      viewBox: '0 0 200 200',
      role: 'img',
      'aria-label': '시계'
    });

    svg.appendChild(makeSvg('circle', {
      'class': 'tc-face',
      cx: 100,
      cy: 100,
      r: 94
    }));

    var hintPath = null;
    if (showHourHint) {
      hintPath = makeSvg('path', {
        'class': 'tc-hour-hint',
        d: sectorPath(curH)
      });
      svg.appendChild(hintPath);
    }

    var ticks = [];
    for (var i = 0; i < 60; i += 1) {
      var isMajor = i % 5 === 0;
      var outer = polar(100, 100, 88, i * 6);
      var inner = polar(100, 100, isMajor ? 79 : 83, i * 6);
      var tick = makeSvg('line', {
        'class': isMajor ? 'tc-tick tc-tick-major' : 'tc-tick tc-tick-minor',
        x1: inner.x,
        y1: inner.y,
        x2: outer.x,
        y2: outer.y,
        'stroke-linecap': 'round'
      });
      ticks.push(tick);
      svg.appendChild(tick);
    }

    for (var n = 1; n <= 12; n += 1) {
      var pos = polar(100, 100, 65, n * 30);
      svg.appendChild(makeSvg('text', {
        'class': 'tc-num',
        x: pos.x,
        y: pos.y,
        'text-anchor': 'middle',
        'dominant-baseline': 'central'
      }, String(n)));
    }

    var hourHand = null;
    if (!hideHour) {
      hourHand = makeSvg('line', {
        'class': 'tc-hand tc-hand-hour',
        x1: 100,
        y1: 106,
        x2: 100,
        y2: 54,
        'stroke-linecap': 'round'
      });
      svg.appendChild(hourHand);
    }

    var minHand = makeSvg('g', { 'class': 'tc-hand-min' });
    minHand.appendChild(makeSvg('line', {
      'class': 'tc-hand tc-hand-min-line',
      x1: 100,
      y1: 108,
      x2: 100,
      y2: 26,
      'stroke-linecap': 'round'
    }));
    minHand.appendChild(makeSvg('circle', {
      'class': 'tc-hand-knob',
      cx: 100,
      cy: 26,
      r: draggable ? 7 : 5
    }));
    svg.appendChild(minHand);

    svg.appendChild(makeSvg('circle', { 'class': 'tc-pin', cx: 100, cy: 100, r: 6 }));
    svg.appendChild(makeSvg('circle', { 'class': 'tc-pin-dot', cx: 100, cy: 100, r: 2.5 }));
    wrap.appendChild(svg);

    var activeTick = -1;
    function render() {
      var ang = handAngles(curH, curM);
      if (hourHand) hourHand.setAttribute('transform', 'rotate(' + ang.hour + ' 100 100)');
      minHand.setAttribute('transform', 'rotate(' + ang.minute + ' 100 100)');
      if (hintPath) hintPath.setAttribute('d', sectorPath(curH));
      if (activeTick >= 0 && ticks[activeTick]) ticks[activeTick].classList.remove('is-now');
      if (ticks[curM]) ticks[curM].classList.add('is-now');
      activeTick = curM;
    }

    function clientToAngle(ev) {
      var rect = svg.getBoundingClientRect();
      var cx = rect.left + rect.width / 2;
      var cy = rect.top + rect.height / 2;
      var deg = Math.atan2(ev.clientX - cx, -(ev.clientY - cy)) * 180 / Math.PI;
      return ((deg % 360) + 360) % 360;
    }

    function applyPointer(ev) {
      if (locked) return;
      var nextM = angleToMinute(clientToAngle(ev), step);
      if (nextM === curM) return;
      curM = nextM;
      render();
      if (onChange) onChange({ h: curH, m: curM });
    }

    if (draggable) {
      svg.addEventListener('pointerdown', function (ev) {
        if (locked) return;
        dragging = true;
        activePointerId = ev.pointerId !== undefined ? ev.pointerId : null;
        if (activePointerId !== null && typeof svg.setPointerCapture === 'function') {
          try { svg.setPointerCapture(activePointerId); } catch (e) {}
        }
        if (typeof ev.preventDefault === 'function') ev.preventDefault();
        applyPointer(ev);
      });

      svg.addEventListener('pointermove', function (ev) {
        if (!dragging || locked) return;
        if (activePointerId !== null && ev.pointerId !== undefined && ev.pointerId !== activePointerId) return;
        applyPointer(ev);
      });

      function endDrag(ev) {
        if (!dragging) return;
        if (activePointerId !== null && ev.pointerId !== undefined && ev.pointerId !== activePointerId) return;
        dragging = false;
        if (activePointerId !== null && typeof svg.releasePointerCapture === 'function') {
          try { svg.releasePointerCapture(activePointerId); } catch (e) {}
        }
        activePointerId = null;
      }

      svg.addEventListener('pointerup', endDrag);
      svg.addEventListener('pointercancel', endDrag);
    }

    function set(h, m) {
      curH = normHour(h);
      curM = normMin(m);
      render();
    }

    function get() {
      return { h: curH, m: curM };
    }

    function lock(bool) {
      locked = Boolean(bool);
      if (locked) {
        dragging = false;
        activePointerId = null;
      }
      wrap.classList.toggle('is-locked', locked);
    }

    render();

    return {
      el: wrap,
      set: set,
      get: get,
      lock: lock
    };
  }

  // 3관: 시간 띠 (최대 3시간 폭, 1시간 큰 칸 + 10분 작은 칸)
  function timeBar(opts) {
    var o = opts || {};
    var s = Math.max(0, Math.floor(Number(o.start) || 0));
    var e = Math.max(s, Math.floor(Number(o.end) || 0));
    var startH = Math.floor(s / 60);
    var endH = Math.ceil(e / 60);
    if (endH <= startH) endH = startH + 1;
    if (endH - startH > 3) endH = startH + 3;

    var hours = endH - startH;
    var baseMin = startH * 60;
    var spanMin = hours * 60;
    var clippedEnd = Math.min(e, endH * 60);
    var totalCells = hours * 6;

    var box = makeEl('div', 'tc-box tc-tbar-box');
    var stage = makeEl('div', 'tc-tbar-stage');
    var nums = makeEl('div', 'tc-tbar-nums');

    for (var h = startH; h <= endH; h += 1) {
      var label = makeEl('span', 'tc-tbar-num', normHour(h) + '시');
      label.style.left = pctStr((h - startH) * 60, spanMin);
      nums.appendChild(label);
    }

    var track = makeEl('div', 'tc-tbar-track');
    var fill = makeEl('div', 'tc-bar-fill');
    fill.style.left = pctStr(s - baseMin, spanMin);
    fill.style.width = pctStr(Math.max(0, clippedEnd - s), spanMin);
    track.appendChild(fill);

    var grid = makeEl('div', 'tc-tbar-grid');
    var cellW = (100 / totalCells) + '%';
    for (var i = 0; i < totalCells; i += 1) {
      var cls = 'tc-tbar-cell';
      if (i > 0 && i % 6 === 0) cls += ' is-hour';
      var cell = makeEl('div', cls);
      cell.style.width = cellW;
      grid.appendChild(cell);
    }
    track.appendChild(grid);

    stage.appendChild(nums);
    stage.appendChild(track);
    box.appendChild(stage);
    return { el: box };
  }

  function fmtAmPmHour(hr) {
    var h = clamp(Math.round(Number(hr) || 0), 0, 24);
    if (h === 0 || h === 24) return '밤 12시';
    if (h === 12) return '낮 12시';
    if (h < 12) return '오전 ' + h + '시';
    return '오후 ' + (h - 12) + '시';
  }

  // 4관: 하루 시간 띠 (0~24시 24칸, 오전·오후 바탕 구분, 숫자 3시간마다)
  function dayBar(opts) {
    var o = opts || {};
    var s = clamp(Number(o.start) || 0, 0, 24);
    var e = clamp(Number(o.end) || 0, s, 24);

    var box = makeEl('div', 'tc-box tc-dbar-box');
    var stage = makeEl('div', 'tc-dbar-stage');

    var tags = makeEl('div', 'tc-dbar-tags');
    var noon = makeEl('span', 'tc-dbar-noon', '낮 12시');
    noon.style.left = '50%';
    tags.appendChild(noon);

    var stagger = (e - s) <= 5;
    var pair = [
      { hr: s, hi: false },
      { hr: e, hi: stagger }
    ];
    for (var t = 0; t < pair.length; t += 1) {
      var item = pair[t];
      var tCls = 'tc-dbar-tag';
      if (item.hi) tCls += ' is-hi';
      if (item.hr <= 2) tCls += ' is-left';
      else if (item.hr >= 22) tCls += ' is-right';
      var tag = makeEl('span', tCls, fmtAmPmHour(item.hr));
      tag.style.left = pctStr(item.hr, 24);
      tags.appendChild(tag);
    }

    var nums = makeEl('div', 'tc-dbar-nums');
    for (var h = 0; h <= 24; h += 3) {
      var nEl = makeEl('span', 'tc-dbar-num', String(normHour(h)));
      nEl.style.left = pctStr(h, 24);
      nums.appendChild(nEl);
    }

    var track = makeEl('div', 'tc-dbar-track');
    var cells = makeEl('div', 'tc-dbar-grid');
    var cellW = (100 / 24) + '%';
    for (var i = 0; i < 24; i += 1) {
      var cCls = i < 12 ? 'tc-dbar-cell tc-dbar-am' : 'tc-dbar-cell tc-dbar-pm';
      if (i === 12) cCls += ' is-noon';
      else if (i > 0 && i % 3 === 0) cCls += ' is-step3';
      var cell = makeEl('div', cCls);
      cell.style.width = cellW;
      cells.appendChild(cell);
    }
    track.appendChild(cells);

    var fill = makeEl('div', 'tc-bar-fill tc-dbar-fill');
    fill.style.left = pctStr(s, 24);
    fill.style.width = pctStr(e - s, 24);
    track.appendChild(fill);

    var halves = makeEl('div', 'tc-dbar-halves');
    halves.appendChild(makeEl('span', 'tc-dbar-half tc-dbar-half-am', '오전'));
    halves.appendChild(makeEl('span', 'tc-dbar-half tc-dbar-half-pm', '오후'));

    stage.appendChild(tags);
    stage.appendChild(nums);
    stage.appendChild(track);
    stage.appendChild(halves);
    box.appendChild(stage);
    return { el: box };
  }

  // 5관: 달력 (일~토 7등분, mark 날짜 동그라미)
  function calendar(opts) {
    var o = opts || {};
    var firstDay = ((Math.floor(Number(o.firstDay) || 0) % 7) + 7) % 7;
    var days = clamp(Math.floor(Number(o.days) || 30), 28, 31);
    var markMap = {};
    if (Array.isArray(o.mark)) {
      for (var k = 0; k < o.mark.length; k += 1) {
        markMap[Math.floor(Number(o.mark[k]))] = true;
      }
    }

    var box = makeEl('div', 'tc-box tc-cal-box');
    var grid = makeEl('div', 'tc-cal-grid');

    for (var w = 0; w < 7; w += 1) {
      var hCls = 'tc-cal-head';
      if (w === 0) hCls += ' is-sun';
      else if (w === 6) hCls += ' is-sat';
      grid.appendChild(makeEl('div', hCls, WEEKDAYS[w]));
    }

    for (var b = 0; b < firstDay; b += 1) {
      grid.appendChild(makeEl('div', 'tc-cal-cell is-empty'));
    }

    for (var d = 1; d <= days; d += 1) {
      var dow = (firstDay + d - 1) % 7;
      var dCls = 'tc-cal-cell';
      if (dow === 0) dCls += ' is-sun';
      else if (dow === 6) dCls += ' is-sat';
      if (markMap[d]) dCls += ' tc-cal-mark';
      var cell = makeEl('div', dCls);
      cell.appendChild(makeEl('span', 'tc-cal-day', String(d)));
      grid.appendChild(cell);
    }

    box.appendChild(grid);
    return { el: box };
  }

  global.ClockDraw = {
    handAngles: handAngles,
    angleToMinute: angleToMinute,
    clock: clock,
    timeBar: timeBar,
    dayBar: dayBar,
    calendar: calendar
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = global.ClockDraw;
})(typeof window !== 'undefined' ? window : globalThis);
