// 초등 3학년 평면도형 탐험관: 1~3관 + 노션 퀴즈 배틀 (2026-11-28 옛 화면을 공용 틀로 옮김, 리팩토링 묶음 F4)
// 관마다 미션 3개를 맞히면 관 완료(ctx.complete). 그 뒤에도 미션은 계속 나온다.
(function (global) {
  'use strict';

  var CORE = global.PlanarCore;
  var MISSIONS = 3;
  var CELL = 30;

  function josa(word, type) {
    return global.MathExplorer && global.MathExplorer.josa ? global.MathExplorer.josa(word, type) : String(word);
  }

  // 미션 진행 줄: 맞힐 때마다 hit(), MISSIONS번째에 관 완료
  function missionTracker(ui, ctx, card) {
    var count = 0;
    var line = ui.el('p', 'ps-mission-count', '');
    function paint() {
      line.textContent = ctx.isDone()
        ? '✅ 이 관을 마쳤어요! 더 해 봐도 좋아요.'
        : '미션 ' + Math.min(count, MISSIONS) + ' / ' + MISSIONS;
    }
    paint();
    card.appendChild(line);
    return {
      hit: function () {
        count += 1;
        if (count >= MISSIONS && !ctx.isDone()) {
          ctx.complete();
          card.appendChild(ui.doneBadge('관 완료! 보석을 받았어요.'));
        }
        paint();
      }
    };
  }

  function buttonRow(ui, items, onPick) {
    var row = ui.el('div', 'ps-btn-row');
    var buttons = items.map(function (it) {
      var b = ui.button(it.text, 'mx-btn ps-pick', function () { onPick(it.value); });
      b.dataset.value = String(it.value);
      row.appendChild(b);
      return b;
    });
    return {
      el: row,
      active: function (value) {
        buttons.forEach(function (b) { b.classList.toggle('active', b.dataset.value === String(value)); });
      }
    };
  }

  function dot(ui, svg, x, y, cls) {
    svg.appendChild(ui.svg('circle', { cx: x, cy: y, r: 7, class: 'ps-dot ' + (cls || '') }));
  }

  // 화살촉(끝없이 늘어남 표시): dir 1 오른쪽, -1 왼쪽
  function arrow(ui, svg, x, y, dir) {
    var p = [[x, y], [x - 14 * dir, y - 9], [x - 14 * dir, y + 9]].map(function (q) { return q.join(','); }).join(' ');
    svg.appendChild(ui.svg('polygon', { points: p, class: 'ps-arrow' }));
  }

  // ── 1관: 선분·반직선·직선 ──
  var LX = 90;
  var RX = 250;
  var LY = 40;

  function drawLine(ui, svg, kind, L, R) {
    svg.replaceChildren();
    var x1 = kind === 'ray-left' || kind === 'line' ? 22 : LX;
    var x2 = kind === 'ray-right' || kind === 'line' ? 318 : RX;
    svg.appendChild(ui.svg('line', { x1: x1, y1: LY, x2: x2, y2: LY, class: 'ps-stroke' }));
    if (kind === 'ray-right' || kind === 'line') arrow(ui, svg, 330, LY, 1);
    if (kind === 'ray-left' || kind === 'line') arrow(ui, svg, 10, LY, -1);
    dot(ui, svg, LX, LY, kind === 'ray-right' ? 'start' : '');
    dot(ui, svg, RX, LY, kind === 'ray-left' ? 'start' : '');
    ui.text(svg, LX, 74, '점 ' + L, kind === 'ray-right' ? 'ps-label start' : 'ps-label');
    ui.text(svg, RX, 74, '점 ' + R, kind === 'ray-left' ? 'ps-label start' : 'ps-label');
  }

  var LINE_INFO = {
    segment: { title: '선분 ㄱㄴ (선분 ㄴㄱ)', body: '두 점을 곧게 이은 선이에요. 양쪽 끝이 있어서 길이를 잴 수 있어요.' },
    'ray-right': { title: '반직선 ㄱㄴ', body: '점 ㄱ에서 시작해 점 ㄴ 쪽으로 끝없이 늘인 곧은 선이에요. 시작점을 먼저 읽어요.' },
    'ray-left': { title: '반직선 ㄴㄱ', body: '점 ㄴ에서 시작해 점 ㄱ 쪽으로 끝없이 늘인 곧은 선이에요. 반직선 ㄱㄴ과 시작점과 방향이 달라요.' },
    line: { title: '직선 ㄱㄴ (직선 ㄴㄱ)', body: '선분을 양쪽으로 끝없이 늘인 곧은 선이에요. 끝이 없어서 길이를 잴 수 없어요.' }
  };

  var LINE_HINTS = {
    segment: '양쪽 끝이 점에서 멈췄는지 살펴봐요.',
    'ray-right': '빨간 점이 시작점이에요. 반직선은 시작점을 먼저 읽어요.',
    'ray-left': '빨간 점이 시작점이에요. 반직선은 시작점을 먼저 읽어요.',
    line: '양쪽 끝이 모두 끝없이 늘어나는지 살펴봐요.'
  };

  var lab1 = {
    title: '1관 선의 3총사',
    icon: '📏',
    sub: '선분·반직선·직선',
    render: function (container, ctx) {
      var ui = ctx.ui;
      var card = ui.card('1관 📏 선분·반직선·직선');
      card.appendChild(ui.guide('버튼을 눌러 선이 어디까지 뻗는지 살펴봐요.'));
      var kinds = buttonRow(ui, [
        { text: '선분 ㄱㄴ', value: 'segment' },
        { text: '반직선 ㄱㄴ', value: 'ray-right' },
        { text: '반직선 ㄴㄱ', value: 'ray-left' },
        { text: '직선 ㄱㄴ', value: 'line' }
      ], function (k) { show(k, true); });
      card.appendChild(kinds.el);
      var demo = ui.board('0 0 340 90', 'ps-line-board');
      card.appendChild(demo.wrap);
      var info = ui.el('div', 'ps-info');
      card.appendChild(info);

      function show(k, speak) {
        kinds.active(k);
        drawLine(ui, demo.svg, k, 'ㄱ', 'ㄴ');
        var it = LINE_INFO[k];
        info.replaceChildren(ui.el('p', 'ps-info-title', it.title), ui.el('p', 'ps-info-body', it.body));
        if (speak) ctx.say(it.title.replace(/ \(.*\)$/, '') + '. ' + it.body);
      }
      show('segment', false);

      var area = ui.el('div', 'ps-area');
      card.appendChild(area);
      var tracker = missionTracker(ui, ctx, card);
      container.appendChild(card);

      var prevKind = null;
      function ask() {
        var p = CORE.makeLine(Math.random, prevKind);
        prevKind = p.kind;
        area.replaceChildren();
        area.appendChild(ui.el('p', 'ps-mission-text', '🎯 미션: 이 선의 이름은?'));
        var b = ui.board('0 0 340 90', 'ps-line-board');
        drawLine(ui, b.svg, p.kind, p.left, p.right);
        area.appendChild(b.wrap);
        area.appendChild(ui.choiceQuestion({
          question: '',
          choices: p.choices,
          answer: p.answerIndex,
          hint: LINE_HINTS[p.kind],
          explain: josa(p.choices[0], 'ieyo') + '.',
          onSolved: function () {
            tracker.hit();
            area.appendChild(ui.button('다음 문제 ▶', 'mx-btn primary ps-next', ask));
          }
        }));
      }
      ask();
    }
  };

  // ── 2관: 각과 직각 ──
  function drawAngle(ui, svg, deg, names, showMark) {
    svg.replaceChildren();
    var vx = deg > 90 ? 165 : 75;
    var vy = 150;
    var len = 125;
    var rad = deg * Math.PI / 180;
    var ex = vx + len * Math.cos(rad);
    var ey = vy - len * Math.sin(rad);
    var hx = vx + len;
    svg.appendChild(ui.svg('line', { x1: vx, y1: vy, x2: ex.toFixed(1), y2: ey.toFixed(1), class: 'ps-stroke' }));
    svg.appendChild(ui.svg('line', { x1: vx, y1: vy, x2: hx, y2: vy, class: 'ps-stroke' }));
    if (showMark) {
      svg.appendChild(ui.svg('path', { d: 'M ' + (vx + 18) + ' ' + vy + ' L ' + (vx + 18) + ' ' + (vy - 18) + ' L ' + vx + ' ' + (vy - 18), class: 'ps-mark' }));
    }
    dot(ui, svg, vx, vy, 'start');
    dot(ui, svg, ex, ey, '');
    dot(ui, svg, hx, vy, '');
    ui.text(svg, ex + (deg > 90 ? -16 : 16), ey - 4, names[0], 'ps-label');
    ui.text(svg, vx - 6, vy + 20, names[1], 'ps-label start');
    ui.text(svg, hx + 4, vy + 20, names[2], 'ps-label');
  }

  var lab2 = {
    title: '2관 각과 직각',
    icon: '📐',
    sub: '꼭짓점·변·직각',
    render: function (container, ctx) {
      var ui = ctx.ui;
      var card = ui.card('2관 📐 각과 직각');
      card.appendChild(ui.concept('각과 직각', '한 점에서 그은 두 반직선으로 이루어진 도형을 각이라고 해요. 그 점이 꼭짓점, 두 반직선이 변이에요. 종이를 반듯하게 두 번 접었을 때 생기는 각이 직각이고, 직각은 ㄴ 모양 표시를 해요.'));
      var sample = ui.board('0 0 320 180', 'ps-angle-board');
      drawAngle(ui, sample.svg, 90, ['ㄱ', 'ㄴ', 'ㄷ'], true);
      card.appendChild(sample.wrap);
      card.appendChild(ui.el('p', 'ps-info-body center', '직각 ㄱㄴㄷ · 꼭짓점: 점 ㄴ · 변: 변 ㄴㄱ, 변 ㄴㄷ'));
      var area = ui.el('div', 'ps-area');
      card.appendChild(area);
      var tracker = missionTracker(ui, ctx, card);
      container.appendChild(card);

      var prevKind = null;
      function ask() {
        var p = CORE.makeAngle(Math.random, prevKind);
        prevKind = p.kind;
        area.replaceChildren();
        var b = ui.board('0 0 320 180', 'ps-angle-board');
        drawAngle(ui, b.svg, p.deg, p.names, false);
        area.appendChild(b.wrap);
        var right = p.kind === 'right';
        area.appendChild(ui.choiceQuestion({
          question: right ? '🎯 ' + josa(p.angleName, 'eun') + ' 직각과 비교하면?' : '🎯 ' + p.angleName + '의 꼭짓점은?',
          choices: p.choices,
          answer: p.answerIndex,
          fixed: p.fixed,
          hint: right ? '삼각자의 직각(ㄴ 모양)을 꼭짓점에 대어 본다고 생각해 봐요.' : '각의 이름은 가운데 글자가 꼭짓점이에요.',
          explain: right
            ? (p.deg === 90 ? '두 변이 ㄴ 모양으로 반듯하게 만나서 직각이에요.' : '두 변이 벌어진 정도가 직각' + (p.deg < 90 ? '보다 좁아요.' : '보다 넓어요.'))
            : p.angleName + '에서 가운데 글자 ' + josa(p.names[1], 'i') + ' 꼭짓점이에요.',
          onSolved: function () {
            if (right && p.deg === 90) drawAngle(ui, b.svg, p.deg, p.names, true);
            tracker.hit();
            area.appendChild(ui.button('다음 문제 ▶', 'mx-btn primary ps-next', ask));
          }
        }));
      }
      ask();
    }
  };

  // ── 3관: 직각삼각형·직사각형·정사각형 ──
  var SHAPE_INFO = [
    { kind: 'rt_tri', icon: '📐', name: '직각삼각형', tag: '직각이 1개인 삼각형', body: '한 각이 직각인 삼각형이에요. 나머지 두 각은 직각보다 작아요.' },
    { kind: 'rect', icon: '🚪', name: '직사각형', tag: '네 각이 모두 직각', body: '네 각이 모두 직각인 사각형이에요. 마주 보는 두 변의 길이가 같아요.' },
    { kind: 'square', icon: '🔲', name: '정사각형', tag: '네 각 직각 + 네 변 같음', body: '네 각이 모두 직각이고 네 변의 길이가 모두 같은 사각형이에요. 정사각형은 직사각형이라고 할 수 있어요.' }
  ];

  var SHAPE_HINTS = {
    rt_tri: '변이 몇 개인지 먼저 세어 봐요.',
    rect: '네 각이 직각이에요. 가로와 세로 칸 수를 세어 비교해 봐요.',
    square: '네 각이 직각이에요. 가로와 세로 칸 수를 세어 비교해 봐요.'
  };

  function cornerMark(ui, svg, x, y, dx, dy) {
    var m = 12;
    svg.appendChild(ui.svg('path', { d: 'M ' + (x + dx * m) + ' ' + y + ' L ' + (x + dx * m) + ' ' + (y + dy * m) + ' L ' + x + ' ' + (y + dy * m), class: 'ps-mark' }));
  }

  function drawShape(ui, svg, p, marks) {
    svg.replaceChildren();
    var n = 8;
    var o = 10;
    for (var i = 0; i <= n; i += 1) {
      svg.appendChild(ui.svg('line', { x1: o + i * CELL, y1: o, x2: o + i * CELL, y2: o + n * CELL, class: 'ps-grid' }));
      svg.appendChild(ui.svg('line', { x1: o, y1: o + i * CELL, x2: o + n * CELL, y2: o + i * CELL, class: 'ps-grid' }));
    }
    var ox = o + CELL;
    var oy = o + CELL;
    function px(q) { return (ox + q[0] * CELL) + ',' + (oy + q[1] * CELL); }
    var pts = p.kind === 'rt_tri'
      ? CORE.triPoints(p.w, p.h, p.corner)
      : [[0, 0], [p.w, 0], [p.w, p.h], [0, p.h]];
    svg.appendChild(ui.svg('polygon', { points: pts.map(px).join(' '), class: 'ps-shape ' + p.kind }));
    if (!marks) return;
    var corners = p.kind === 'rt_tri' ? [pts[0]] : pts;
    corners.forEach(function (c) {
      var dx = c[0] === 0 ? 1 : -1;
      var dy = c[1] === 0 ? 1 : -1;
      cornerMark(ui, svg, ox + c[0] * CELL, oy + c[1] * CELL, dx, dy);
    });
  }

  var lab3 = {
    title: '3관 도형 3총사',
    icon: '🔺',
    sub: '직각삼각형·직사각형·정사각형',
    render: function (container, ctx) {
      var ui = ctx.ui;
      var card = ui.card('3관 🔺 직각삼각형·직사각형·정사각형');
      card.appendChild(ui.guide('카드를 눌러 직각과 변의 비밀을 들어 봐요.'));
      var grid = ui.el('div', 'ps-card-grid');
      var info = ui.el('div', 'ps-info');
      var cards = SHAPE_INFO.map(function (s) {
        var b = ui.el('button', 'ps-shape-card ' + s.kind);
        b.type = 'button';
        b.appendChild(ui.el('span', 'ps-shape-icon', s.icon));
        b.appendChild(ui.el('span', 'ps-shape-name', s.name));
        b.appendChild(ui.el('span', 'ps-shape-tag', s.tag));
        b.addEventListener('click', function () {
          cards.forEach(function (c) { c.classList.toggle('active', c === b); });
          info.replaceChildren(ui.el('p', 'ps-info-title', s.icon + ' ' + s.name), ui.el('p', 'ps-info-body', s.body));
          ctx.say(s.name + '. ' + s.body);
        });
        grid.appendChild(b);
        return b;
      });
      card.appendChild(grid);
      card.appendChild(info);
      var area = ui.el('div', 'ps-area');
      card.appendChild(area);
      var tracker = missionTracker(ui, ctx, card);
      container.appendChild(card);

      var prevKind = null;
      function ask() {
        var p = CORE.makeShape(Math.random, prevKind);
        prevKind = p.kind;
        area.replaceChildren();
        area.appendChild(ui.el('p', 'ps-mission-text', '🎯 미션: 모눈 위 도형의 이름은?'));
        var b = ui.board('0 0 260 260', 'ps-grid-board');
        drawShape(ui, b.svg, p, false);
        area.appendChild(b.wrap);
        var explain = p.kind === 'rt_tri'
          ? '변이 3개이고 직각이 1개라서 직각삼각형이에요.'
          : (p.kind === 'square'
            ? '네 각이 직각이고 네 변이 모두 ' + p.w + '칸으로 같아서 정사각형이에요.'
            : '네 각이 직각이고 가로 ' + p.w + '칸, 세로 ' + p.h + '칸으로 길이가 달라서 직사각형이에요.');
        area.appendChild(ui.choiceQuestion({
          question: '',
          choices: p.choices,
          answer: p.answerIndex,
          fixed: true,
          hint: SHAPE_HINTS[p.kind],
          explain: explain,
          onSolved: function () {
            drawShape(ui, b.svg, p, true);
            tracker.hit();
            area.appendChild(ui.button('다음 문제 ▶', 'mx-btn primary ps-next', ask));
          }
        }));
      }
      ask();
    }
  };

  function mount() {
    global.MathExplorer.mount({
      key: 'planar3',
      rememberTab: true,
      labs: [lab1, lab2, lab3],
      quiz: global.MathExplorerQuiz.create({
        grade: '3-1',
        unit: '2. 평면도형',
        title: '퀴즈 배틀',
        intro: '퀴즈 배틀이에요. 천천히 읽고 골라 볼까요?'
      })
    });
  }

  global.PlanarLabs = { mount: mount };

  if (global.document && global.document.readyState === 'loading') {
    global.document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})(typeof window !== 'undefined' ? window : globalThis);
