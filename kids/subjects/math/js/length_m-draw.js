// 초등 2-2 '3. 길이 재기' 그림 부품 (LengthDraw, docs/math_2-2_length_spec.md)
(function (global) {
  'use strict';

  var MERGE_MS = 800;

  function clamp(n, lo, hi) {
    var v = Number(n);
    if (isNaN(v)) v = lo;
    if (v < lo) return lo;
    if (v > hi) return hi;
    return v;
  }

  function fmtLen(cm) {
    var v = Math.max(0, Math.round(Number(cm) || 0));
    if (v === 0) return '0cm';
    var m = Math.floor(v / 100);
    var c = v % 100;
    if (m > 0 && c > 0) return m + 'm ' + c + 'cm';
    if (m > 0) return m + 'm';
    return c + 'cm';
  }

  function reducedMotion() {
    if (typeof global.matchMedia !== 'function') return false;
    return Boolean(global.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function makeEl(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function clearChildren(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function pctStr(val, total) {
    if (!total) return '0%';
    return (clamp(val, 0, total) / total * 100) + '%';
  }

  // 돋보기 30cm 구간 계산 (순수 함수, DOM 없음)
  function zoomRange(len, max) {
    var m = max > 0 ? max : 200;
    var from = Math.floor(len / 10) * 10 - 10;
    var to = from + 30;
    if (from < 0) {
      from = 0;
      to = Math.min(30, m);
    } else if (to > m) {
      to = m;
      from = Math.max(0, m - 30);
    }
    return { from: from, to: to };
  }

  // 1관: 10cm 막대 n개 → 10개가 되면 0.8초 merge 뒤 「1m = 100cm」 띠
  function sticks(n, opts) {
    var o = opts || {};
    var onMerged = typeof o.onMerged === 'function' ? o.onMerged : null;
    var cur = clamp(n === undefined ? 0 : Math.floor(n), 0, 10);
    var isBusy = false;
    var merged = cur >= 10;
    var mergedCalled = false;

    var box = makeEl('div', 'ln-box ln-sticks-box');
    var head = makeEl('div', 'ln-sticks-head');
    var legend = makeEl('span', 'ln-legend', '막대 1개 = 10cm');
    var sumEl = makeEl('span', 'ln-sum', merged ? '100cm = 1m' : (cur * 10) + 'cm');
    var track = makeEl('div', 'ln-sticks-track');

    head.appendChild(legend);
    head.appendChild(sumEl);
    box.appendChild(head);
    box.appendChild(track);

    function renderMerged(withPop) {
      clearChildren(track);
      track.classList.remove('is-merging');
      var bar = makeEl('div', withPop ? 'ln-merged is-pop' : 'ln-merged', '1m = 100cm');
      track.appendChild(bar);
      sumEl.textContent = '100cm = 1m';
    }

    function renderSticks() {
      clearChildren(track);
      for (var i = 0; i < cur; i += 1) {
        var cls = i === 5 ? 'ln-stick is-gap' : 'ln-stick';
        track.appendChild(makeEl('div', cls, '10'));
      }
      sumEl.textContent = (cur * 10) + 'cm';
    }

    function finishMerge(withPop) {
      merged = true;
      isBusy = false;
      renderMerged(withPop);
      if (!mergedCalled && onMerged) {
        mergedCalled = true;
        onMerged();
      }
    }

    function add() {
      if (isBusy || merged || cur >= 10) return false;
      cur += 1;
      renderSticks();
      if (cur >= 10) {
        if (reducedMotion()) {
          finishMerge(false);
        } else {
          isBusy = true;
          track.classList.add('is-merging');
          setTimeout(function () {
            finishMerge(true);
          }, MERGE_MS);
        }
      }
      return true;
    }

    function count() {
      return cur;
    }

    function busy() {
      return isBusy;
    }

    if (merged) renderMerged(false);
    else renderSticks();

    return {
      el: box,
      add: add,
      count: count,
      busy: busy
    };
  }

  // 전체 줄자 눈금(10cm 작은 눈금, 100cm 큰 눈금+숫자) 그리기
  function buildRulerTicks(track, numsEl, max) {
    for (var c = 0; c <= max; c += 10) {
      var left = pctStr(c, max);
      var isMajor = c % 100 === 0;
      var tick = makeEl('span', isMajor ? 'ln-tick ln-tick-major' : 'ln-tick ln-tick-minor');
      tick.style.left = left;
      track.appendChild(tick);
      if (isMajor) {
        var num = makeEl('span', 'ln-tick-num', String(c));
        num.style.left = left;
        numsEl.appendChild(num);
      }
    }
  }

  // 5관 ③: 전체 줄자 위 깃발 (이웃 깃발과 8% 미만이면 위아래 두 줄로 엇갈림)
  function buildPins(pins, max) {
    var layer = makeEl('div', 'ln-pins');
    var sorted = pins.slice().sort(function (a, b) {
      return (Number(a.len) || 0) - (Number(b.len) || 0);
    });
    var prevPct = -100;
    var high = false;
    for (var i = 0; i < sorted.length; i += 1) {
      var item = sorted[i] || {};
      var pct = clamp(item.len, 0, max) / max * 100;
      if (i > 0 && (pct - prevPct) < 8) high = !high;
      else high = false;
      prevPct = pct;

      var pin = makeEl('div', high ? 'ln-pin is-hi' : 'ln-pin');
      pin.style.left = pct + '%';
      pin.appendChild(makeEl('span', 'ln-pin-badge', item.label || ''));
      pin.appendChild(makeEl('span', 'ln-pin-stem'));
      layer.appendChild(pin);
    }
    return layer;
  }

  // 2관·5관: 전체 줄자 + (zoom이면) 돋보기 띠
  function tape(opts) {
    var o = opts || {};
    var max = o.max > 0 ? o.max : 200;
    var hasPins = Array.isArray(o.pins) && o.pins.length > 0;
    var showZoom = o.zoom !== false && !hasPins;
    var len = typeof o.len === 'number' ? clamp(o.len, 0, max) : 0;
    var range = showZoom ? zoomRange(len, max) : null;

    var box = makeEl('div', hasPins ? 'ln-box ln-tape-box has-pins' : 'ln-box ln-tape-box');
    var wrap = makeEl('div', 'ln-tape-wrap');
    var stage = makeEl('div', 'ln-tape-stage');

    if (hasPins) stage.appendChild(buildPins(o.pins, max));

    var track = makeEl('div', 'ln-tape-track');
    var nums = makeEl('div', 'ln-tape-nums');

    if (!hasPins && len > 0) {
      var objBar = makeEl('div', 'ln-obj-bar');
      objBar.style.width = pctStr(len, max);
      track.appendChild(objBar);
    }

    if (showZoom && range) {
      var zBox = makeEl('div', 'ln-zoom-box');
      zBox.style.left = pctStr(range.from, max);
      zBox.style.width = ((range.to - range.from) / max * 100) + '%';
      track.appendChild(zBox);
    }

    buildRulerTicks(track, nums, max);
    stage.appendChild(track);
    stage.appendChild(nums);
    wrap.appendChild(stage);
    box.appendChild(wrap);

    if (showZoom && range) {
      var span = range.to - range.from;
      var zoomEl = makeEl('div', 'ln-zoom');
      var zStage = makeEl('div', 'ln-zoom-stage');
      var zHead = makeEl('div', 'ln-zoom-head');
      var zTrack = makeEl('div', 'ln-zoom-track');
      var zNums = makeEl('div', 'ln-zoom-nums');

      zoomEl.appendChild(makeEl('span', 'ln-zoom-badge', '🔍'));

      var ptr = makeEl('span', 'ln-pointer', '▼');
      ptr.style.left = pctStr(len - range.from, span);
      zHead.appendChild(ptr);

      if (len > range.from) {
        var zBar = makeEl('div', 'ln-zoom-bar');
        zBar.style.width = pctStr(len - range.from, span);
        zTrack.appendChild(zBar);
      }

      for (var c = range.from; c <= range.to; c += 1) {
        var left = pctStr(c - range.from, span);
        var cls = 'ln-tick ln-tick-minor';
        if (c % 10 === 0) cls = 'ln-tick ln-tick-major';
        else if (c % 5 === 0) cls = 'ln-tick ln-tick-mid';
        var zTick = makeEl('span', cls);
        zTick.style.left = left;
        zTrack.appendChild(zTick);

        if (c % 10 === 0) {
          var zNum = makeEl('span', 'ln-tick-num', String(c));
          zNum.style.left = left;
          zNums.appendChild(zNum);
        }
      }

      zStage.appendChild(zHead);
      zStage.appendChild(zTrack);
      zStage.appendChild(zNums);
      zoomEl.appendChild(zStage);
      box.appendChild(zoomEl);
    }

    return { el: box };
  }

  // 6관: 리본 가게 (0~max 줄자 위 분홍 리본)
  function ribbon(opts) {
    var o = opts || {};
    var max = o.max > 0 ? o.max : 400;
    var cur = 0;

    var box = makeEl('div', 'ln-box ln-ribbon-box');
    var nowEl = makeEl('div', 'ln-ribbon-now', '지금 0cm');
    var stage = makeEl('div', 'ln-tape-stage');
    var track = makeEl('div', 'ln-tape-track ln-ribbon-track');
    var nums = makeEl('div', 'ln-tape-nums');
    var bar = makeEl('div', 'ln-ribbon');
    bar.style.width = '0%';

    track.appendChild(bar);
    buildRulerTicks(track, nums, max);
    stage.appendChild(track);
    stage.appendChild(nums);
    box.appendChild(nowEl);
    box.appendChild(stage);

    function set(cm) {
      cur = clamp(Math.round(Number(cm) || 0), 0, max);
      bar.style.width = pctStr(cur, max);
      nowEl.textContent = '지금 ' + fmtLen(cur);
    }

    function get() {
      return cur;
    }

    return {
      el: box,
      set: set,
      get: get
    };
  }

  global.LengthDraw = {
    zoomRange: zoomRange,
    sticks: sticks,
    tape: tape,
    ribbon: ribbon
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = global.LengthDraw;
})(typeof window !== 'undefined' ? window : globalThis);
