// 4-2 소수의 덧셈과 뺄셈 탐험관 그리기 도우미 (DecAddDraw): 모눈·버튼·숫자 띠·수직선·소수점 옮기기·세로셈 칸판
// decimal_add-labs-a.js(1~3관)·decimal_add-labs-b.js(4~7관)가 함께 쓴다. 계약: docs/math_4-2_ladder_spec.md §5
(function (global) {
  'use strict';
  // 숫자·소수 글자 뒤 조사(받침에 맞춤)
  function J(t, type) { return global.MathExplorer && global.MathExplorer.josa ? global.MathExplorer.josa(String(t), type) : String(t); }

  function makeEl(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) { node.className = cls; }
    if (text !== undefined && text !== null) { node.textContent = String(text); }
    return node;
  }

  function toWrongs(list) {
    return list.map(function (w) { return { token: w.text, mistake: w.mistake }; });
  }

  function josa(text, kind) {
    return global.MathExplorer.josa(text, kind);
  }

  // 10x10 모눈판 (1 = 100칸, 0.1 = 한 줄, 0.01 = 한 칸)
  function grid(n, mini) {
    var root = makeEl('div', mini ? 'da-grid da-mini' : 'da-grid');
    var cells = [];
    var cur = 0;
    for (var i = 0; i < 100; i++) {
      var cell = makeEl('div', 'da-cell');
      cells.push(cell);
      root.appendChild(cell);
    }
    function set(val) {
      var next = Math.max(0, Math.min(100, Math.round(val || 0)));
      cur = next;
      for (var k = 0; k < 100; k++) {
        cells[k].className = k < cur ? 'da-cell on' : 'da-cell';
      }
    }
    set(n);
    return { el: root, set: set, get: function () { return cur; } };
  }

  // 모눈 채우기 버튼 (+0.1 / +0.01)
  function gridStepper(o) {
    var wrap = makeEl('div', 'da-stepper');
    var row = makeEl('div', 'mx-btn-row');
    var btn10 = makeEl('button', 'mx-btn primary', '＋ 0.1 (한 줄)');
    var btn1 = makeEl('button', 'mx-btn primary', '＋ 0.01 (한 칸)');
    btn10.type = 'button';
    btn1.type = 'button';
    row.appendChild(btn10);
    row.appendChild(btn1);
    wrap.appendChild(row);

    var hintShown = false;
    var finished = false;
    var to = Math.max(0, Math.min(100, o.to));

    function sync() {
      var cur = o.grid.get();
      var rem = to - cur;
      if (rem <= 0) {
        btn10.disabled = true;
        btn1.disabled = true;
        if (!finished) {
          finished = true;
          if (o.onDone) { o.onDone(); }
        }
        return;
      }
      if (rem < 10) {
        btn10.disabled = true;
        if (!hintShown) {
          hintShown = true;
          wrap.appendChild(makeEl('div', 'mx-hint', '이제 0.01씩 칠해요'));
        }
      }
    }

    function step(delta) {
      var cur = o.grid.get();
      if (cur + delta > to) { return; }
      var next = cur + delta;
      o.grid.set(next);
      if (o.onStep) { o.onStep(next); }
      sync();
    }

    btn10.addEventListener('click', function () { step(10); });
    btn1.addEventListener('click', function () { step(1); });
    sync();
    return wrap;
  }

  // 자릿수 강조용 숫자 띠
  function strip(d) {
    var raw = global.DecimalCore.formatRaw(d);
    var root = makeEl('div', 'da-strip');
    var spans = [];
    var dotIdx = -1;
    for (var i = 0; i < raw.length; i++) {
      var ch = raw.charAt(i);
      var sp = makeEl('span', ch === '.' ? 'da-point' : 'da-digit', ch);
      if (ch === '.') { dotIdx = i; }
      spans.push(sp);
      root.appendChild(sp);
    }
    function highlight(place) {
      for (var j = 0; j < spans.length; j++) {
        if (spans[j].className !== 'da-point') { spans[j].className = 'da-digit'; }
      }
      var target = dotIdx === -1 ? raw.length - 1 - place : (place === 0 ? dotIdx - 1 : dotIdx + place);
      if (target >= 0 && target < spans.length && spans[target].className !== 'da-point') {
        spans[target].className = 'da-digit hl';
      }
    }
    return { el: root, highlight: highlight };
  }

  // 0.xyz 수직선 단계별 찾기 (학습일지 미기록)
  function numberLine(ui, a, onDone) {
    var dc = global.DecimalCore;
    var root = makeEl('div', 'da-nl');
    var aStr = dc.format(a);
    var tenthsIdx = Math.floor(a.int / 100);
    var tMod = tenthsIdx % 10;
    var tStart = tMod === 0 ? tenthsIdx : (tMod === 9 ? tenthsIdx - 2 : tenthsIdx - 1);
    var tChoices = [];
    for (var i = 0; i < 3; i++) {
      var idx = tStart + i;
      tChoices.push(dc.format(dc.dec(idx, 1)) + ' ~ ' + dc.format(dc.dec(idx + 1, 1)));
    }

    function drawLine(baseInt, places, dotOffset) {
      var line = makeEl('div', 'da-line');
      for (var k = 0; k <= 10; k++) {
        var tick = makeEl('span', 'da-tick');
        tick.style.left = (k * 10) + '%';
        if (k === 0 || k === 5 || k === 10) {
          var lbl = makeEl('span', 'da-tick-lbl', dc.format(dc.dec(baseInt + k, places)));
          tick.appendChild(lbl);
        }
        line.appendChild(tick);
      }
      if (dotOffset !== null && dotOffset !== undefined) {
        var dot = makeEl('span', 'da-dot');
        dot.style.left = (dotOffset * 10) + '%';
        line.appendChild(dot);
      }
      root.appendChild(line);
    }

    var q1 = ui.choiceQuestion({
      question: josa(aStr, 'eun') + ' 어느 사이에 있을까요?',
      choices: tChoices,
      answer: tenthsIdx - tStart,
      fixed: true,
      hint: '소수 첫째 자리 숫자를 봐요.',
      explain: J(aStr, 'eun') + ' ' + tChoices[tenthsIdx - tStart] + ' 사이에 있어요.',
      onSolved: function () {
        drawLine(tenthsIdx * 10, 2, null);
        var hundredthsIdx = Math.floor(a.int / 10);
        var hMod = hundredthsIdx % 10;
        var hStart = hMod === 0 ? hundredthsIdx : (hMod === 9 ? hundredthsIdx - 2 : hundredthsIdx - 1);
        var hChoices = [];
        for (var j = 0; j < 3; j++) {
          var hIdx = hStart + j;
          hChoices.push(dc.format(dc.dec(hIdx, 2)) + ' ~ ' + dc.format(dc.dec(hIdx + 1, 2)));
        }
        var q2 = ui.choiceQuestion({
          question: josa(aStr, 'eun') + ' 더 자세히 어느 사이에 있을까요?',
          choices: hChoices,
          answer: hundredthsIdx - hStart,
          fixed: true,
          hint: '소수 둘째 자리 숫자를 봐요.',
          explain: J(aStr, 'eun') + ' ' + hChoices[hundredthsIdx - hStart] + ' 사이에 있어요.',
          onSolved: function () {
            drawLine(hundredthsIdx * 10, 3, a.int - hundredthsIdx * 10);
            if (onDone) { onDone(); }
          }
        });
        root.appendChild(q2);
      }
    });
    root.appendChild(q1);
    return root;
  }

  // 소수점 10배 / 1/10 이동 조작기
  function pointMover(ui, a, k, onDone) {
    var dc = global.DecimalCore;
    var dac = global.DecimalAddCore;
    var root = makeEl('div', 'da-mover');
    var stripHost = makeEl('div', 'da-mover-strip');
    var btnRow = makeEl('div', 'mx-btn-row');
    var btnDown = ui.button('⬅ 1/10', 'mx-btn primary', function () { move(-1); });
    var btnUp = ui.button('10배 ➡', 'mx-btn primary', function () { move(1); });
    var hintEl = makeEl('div', 'mx-hint');
    hintEl.className = 'mx-hint da-hidden';
    btnRow.appendChild(btnDown);
    btnRow.appendChild(btnUp);
    root.appendChild(stripHost);
    root.appendChild(btnRow);
    root.appendChild(hintEl);

    var cur = a;
    var target = dac.shift(a, k);
    var dir = k >= 0 ? 1 : -1;

    function drawStrip() {
      while (stripHost.firstChild) { stripHost.removeChild(stripHost.firstChild); }
      var parsed = dc.parse(dc.format(cur));
      stripHost.appendChild(strip(parsed).el);
    }

    function move(stepDir) {
      if (stepDir !== dir) {
        hintEl.className = 'mx-hint';
        ui.hint(hintEl, '10배는 소수점이 오른쪽으로 한 칸, 1/10은 왼쪽으로 한 칸 옮겨요');
        return;
      }
      hintEl.className = 'mx-hint da-hidden';
      cur = dac.shift(cur, stepDir);
      drawStrip();
      if (dc.compare(cur, target) === 0) {
        btnDown.disabled = true;
        btnUp.disabled = true;
        if (onDone) { onDone(); }
      }
    }

    drawStrip();
    return root;
  }

  // 세로셈 단계별 칸판 (정수 자리 연산만 사용)
  // 세로셈 칸판은 공용 math_column-draw.js(ColumnDraw)로 옮김 (2026-11-24, 2학년 덧셈·뺄셈과 함께 씀)
  function column(ui, o) { return global.ColumnDraw.column(ui, o); }

  global.DecAddDraw = {
    grid: grid,
    gridStepper: gridStepper,
    strip: strip,
    numberLine: numberLine,
    pointMover: pointMover,
    column: column,
    makeEl: makeEl,
    toWrongs: toWrongs
  };
})(typeof window !== 'undefined' ? window : globalThis);
