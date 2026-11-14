// 5-2 수학 4단원 소수의 곱셈: 1~3관 (DecimalLabsA)
// 1관 (자연수)×(1보다 작은 소수) 90~91쪽 · 2관 (자연수)×(1보다 큰 소수) 92~93쪽 · 3관 (소수)×(소수) 모눈 94~95쪽
// 싣는 순서: math_explorer-shell → decimal_multiplication-core → labs-a → labs-b(탐험관 띄우기)
// 객관식 보기는 공용 틀 ui.choiceQuestion이 window.QuizChoices.arrange로 섞고 원래 번호로 채점한다.
(function (global) {
  'use strict';

  var C = global.DecimalCore;
  var BAR_X = 24;
  var BAR_W = 392;

  function f(d) {
    return C.format(d);
  }

  // 막대 모델: 위는 실제 양(kg·L), 아래는 몇 배. 0.1배씩·1배씩 칠해서 곱하는 수만큼 만든다.
  // opts: { maxUnits, a(자연수), b(소수 한 자리), unit, thing }
  function drawBar(svg, ui, opts, tenths) {
    svg.replaceChildren();
    var unitW = BAR_W / opts.maxUnits;
    var tickW = unitW / 10;
    var n = opts.a.int;
    svg.appendChild(ui.svg('rect', { x: BAR_X, y: 44, width: BAR_W, height: 34, rx: 6, class: 'dm-bar-bg' }));
    if (tenths > 0) {
      svg.appendChild(ui.svg('rect', { x: BAR_X, y: 44, width: Math.min(tenths, opts.maxUnits * 10) * tickW, height: 34, rx: 6, class: 'dm-bar-fill' }));
    }
    for (var i = 0; i <= opts.maxUnits * 10; i += 1) {
      var x = BAR_X + i * tickW;
      var whole = i % 10 === 0;
      svg.appendChild(ui.svg('line', { x1: x, y1: whole ? 38 : 44, x2: x, y2: whole ? 84 : 78, class: whole ? 'dm-tick-main' : 'dm-tick' }));
      if (whole) {
        var k = i / 10;
        ui.text(svg, x, 24, String(n * k) + opts.unit, 'mx-label mx-label-sm mx-label-accent');
        ui.text(svg, x, 100, k + '배', 'mx-label mx-label-sm');
      }
    }
    if (opts.maxUnits === 1) {
      for (var j = 1; j < 10; j += 1) ui.text(svg, BAR_X + j * tickW, 100, '0.' + j, 'mx-label mx-label-sm');
    }
    if (tenths > 0) {
      var endX = BAR_X + Math.min(tenths, opts.maxUnits * 10) * tickW;
      svg.appendChild(ui.svg('line', { x1: endX, y1: 30, x2: endX, y2: 116, class: 'dm-marker' }));
      ui.text(svg, endX, 126, f(C.dec(tenths, 1)) + '배', 'mx-label mx-label-orange');
    }
  }

  // 1·2관 공통 한 문제: 막대 칠하기 → 크기 비교 → 자연수 곱셈의 10분의 1배 → 답
  function barProblem(box, ctx, opts, onDone) {
    var ui = ctx.ui;
    var el = ui.el;
    var a = opts.a;
    var b = opts.b;
    var prod = C.mul(a, b);
    var natural = a.int * b.int;
    var target = b.int;
    var tenths = 0;

    box.appendChild(ui.guide(opts.story + ' ' + ui.josa(a.int + ' × ' + f(b), 'eul') + ' 막대로 알아봐요.'));
    box.appendChild(el('p', 'mx-question', '아래 막대에 ' + f(b) + '배만큼 칠해 보세요.'));
    var board = ui.board('0 0 440 140', 'mx-board-wide');
    box.appendChild(board.wrap);
    var row = el('div', 'mx-btn-row');
    var hintEl = el('div', 'mx-hint');
    hintEl.hidden = true;
    var resetBtn = ui.button('↺ 처음부터', 'mx-btn', function () {
      tenths = 0;
      resetBtn.classList.remove('mx-glow');
      ui.hint(hintEl, '');
      update();
    });
    if (opts.maxUnits > 1) row.appendChild(ui.button('➕ 1배', 'mx-btn primary', function () { add(10); }));
    row.appendChild(ui.button('➕ 0.1배', 'mx-btn primary', function () { add(1); }));
    row.appendChild(resetBtn);
    box.appendChild(row);
    box.appendChild(hintEl);
    var after = el('div');
    box.appendChild(after);
    var finished = false;

    function update() {
      drawBar(board.svg, ui, opts, tenths);
    }

    function add(step) {
      if (finished) return;
      tenths += step;
      if (tenths > target) {
        ctx.encourage();
        ui.hint(hintEl, '💡 ' + f(b) + '배보다 많이 칠했어요. ↺ 처음부터 눌러 다시 칠해 볼까요?');
        resetBtn.classList.add('mx-glow');
      } else if (tenths === target) {
        finished = true;
        ctx.praise();
        ui.hint(hintEl, '');
        reveal();
      }
      update();
    }

    function reveal() {
      var oneTenth = C.dec(a.int, 1);
      after.appendChild(el('p', 'mx-note', '0.1배 한 칸은 ' + a.int + ' ÷ 10 = ' + ui.josa(f(oneTenth) + opts.unit, 'ieyo') + '. 칠한 곳은 ' + ui.josa(f(prod) + opts.unit, 'ieyo') + '.'));
      ui.sequence(after, [
        function (s, next) {
          var bigger = C.compare(b, C.dec(1, 0)) > 0;
          s.appendChild(ui.choiceQuestion({
            question: a.int + ' × ' + f(b) + '의 답은 ' + a.int + '보다 클까요, 작을까요?',
            choices: [a.int + '보다 작아요', a.int + '보다 커요', ui.josa(String(a.int), 'gwa') + ' 같아요'],
            answer: bigger ? 1 : 0,
            hint: bigger ? '1배보다 더 많이 칠했어요. 칠한 곳이 ' + a.int + opts.unit + ' 눈금을 넘었나요?' : '1보다 작은 수를 곱하면 1배 눈금까지 가지 못해요.',
            explain: bigger ? '1보다 큰 소수를 곱하면 원래 수보다 커져요.' : '1보다 작은 소수를 곱하면 원래 수보다 작아져요.',
            onSolved: next
          }));
        },
        function (s, next) {
          s.appendChild(el('span', 'mx-step-label', '자연수의 곱셈으로 계산하기'));
          var line = el('div', 'mx-formula');
          line.appendChild(el('span', 'mx-chip', a.int + ' × ' + b.int + ' = ' + natural));
          s.appendChild(line);
          s.appendChild(ui.choiceQuestion({
            question: ui.josa(a.int + ' × ' + f(b), 'eun') + ' ' + natural + '의 몇 배일까요?',
            choices: ['10분의 1배', '10배', '100분의 1배'],
            answer: 0,
            hint: ui.josa(f(b), 'eun') + ' ' + b.int + '의 10분의 1이에요. 곱도 똑같이 작아져요.',
            explain: ui.josa(f(b), 'eun') + ' ' + b.int + '의 10분의 1배이니까, 곱도 ' + natural + '의 10분의 1배예요.',
            onSolved: next
          }));
        },
        function (s, next) {
          var pc = C.pointChoices(prod);
          s.appendChild(ui.choiceQuestion({
            question: a.int + ' × ' + f(b) + ' = ?',
            choices: pc.choices,
            answer: pc.answer,
            hint: natural + '의 10분의 1배는 소수점이 왼쪽으로 한 칸 옮겨 가요.',
            explain: a.int + ' × ' + f(b) + ' = ' + f(prod) + ' (' + opts.thing + ' ' + f(prod) + opts.unit + ')',
            onSolved: next
          }));
        }
      ], onDone);
    }

    update();
  }

  // 같은 관에서 문제 두 개: 교과서 문제 → 새 문제. 둘 다 풀면 관 완료.
  function twoProblems(container, ctx, first, makeNext, opts) {
    var ui = ctx.ui;
    var card = ui.card(opts.title);
    container.appendChild(card);
    var problems = [first, makeNext()];
    var idx = 0;
    var stage = ui.el('div');
    card.appendChild(stage);

    function run() {
      stage.replaceChildren();
      stage.appendChild(ui.el('span', 'mx-step-label', '문제 ' + (idx + 1) + ' / ' + problems.length));
      opts.solve(stage, problems[idx], function () {
        var row = ui.el('div', 'mx-btn-row');
        if (idx + 1 < problems.length) {
          row.appendChild(ui.button('다음 문제 ▶', 'mx-btn primary', function () {
            idx += 1;
            run();
          }));
        } else {
          ctx.complete();
          stage.appendChild(ui.doneBadge());
          row.appendChild(ui.button('🎲 새 문제 더 풀기', 'mx-btn', function () {
            problems.push(makeNext());
            idx += 1;
            run();
          }));
        }
        stage.appendChild(row);
      });
    }
    run();
  }

  var tab1 = {
    title: '1관 1보다 작은 소수',
    icon: '🌾',
    sub: '자연수 × 0.□',
    render: function (container, ctx) {
      var ui = ctx.ui;
      container.appendChild(ui.concept('🌾 (자연수) × (1보다 작은 소수)', '8 × 0.4는 8의 0.4배예요. 8을 10칸으로 나눈 것 중 4칸만큼이니까 3.2예요. 8 × 4 = 32를 먼저 계산하고 10분의 1배를 해도 돼요. 1보다 작은 수를 곱하면 원래 수보다 작아져요.'));
      twoProblems(container, ctx, { a: C.dec(8, 0), b: C.dec(4, 1) }, function () { return C.makeLab1(); }, {
        title: '잡곡 자루 막대 칠하기',
        solve: function (stage, p, done) {
          barProblem(stage, ctx, { maxUnits: 1, a: p.a, b: p.b, unit: ' kg', thing: '잡곡', story: '잡곡 ' + p.a.int + ' kg의 ' + f(p.b) + '배만큼 담으려고 해요.' }, done);
        }
      });
      ctx.say('1관이에요. 자연수에 1보다 작은 소수를 곱해 볼까요?');
    }
  };

  var tab2 = {
    title: '2관 1보다 큰 소수',
    icon: '🧴',
    sub: '자연수 × □.□',
    render: function (container, ctx) {
      var ui = ctx.ui;
      container.appendChild(ui.concept('🧴 (자연수) × (1보다 큰 소수)', '7 × 2.4는 7을 2번 하고, 7의 0.4배를 더 한 만큼이에요. 7 × 24 = 168을 먼저 계산하고 10분의 1배를 하면 16.8이에요. 1보다 큰 수를 곱하면 원래 수보다 커져요.'));
      twoProblems(container, ctx, { a: C.dec(7, 0), b: C.dec(24, 1) }, function () { return C.makeLab2(); }, {
        title: '세제 통 막대 칠하기',
        solve: function (stage, p, done) {
          barProblem(stage, ctx, { maxUnits: 3, a: p.a, b: p.b, unit: ' L', thing: '세제', story: '세제 ' + p.a.int + ' L의 ' + f(p.b) + '배 용량 통이 있어요.' }, done);
        }
      });
      ctx.say('2관이에요. 자연수에 1보다 큰 소수를 곱해 볼까요?');
    }
  };

  // 3관: 1 m × 1 m 모눈(100칸)에서 가로·세로 눈금 버튼으로 직사각형을 칠한다.
  var CELL = 28;
  var GRID_X = 26;
  var GRID_Y = 14;

  function drawGrid(svg, ui, w, h) {
    svg.replaceChildren();
    svg.appendChild(ui.svg('rect', { x: GRID_X, y: GRID_Y, width: CELL * 10, height: CELL * 10, class: 'dm-grid-bg' }));
    if (w > 0 && h > 0) {
      svg.appendChild(ui.svg('rect', { x: GRID_X, y: GRID_Y, width: CELL * w, height: CELL * h, class: 'dm-grid-fill' }));
    }
    for (var i = 0; i <= 10; i += 1) {
      var cls = i === 0 || i === 10 ? 'dm-grid-edge' : 'dm-grid-line';
      svg.appendChild(ui.svg('line', { x1: GRID_X + i * CELL, y1: GRID_Y, x2: GRID_X + i * CELL, y2: GRID_Y + CELL * 10, class: cls }));
      svg.appendChild(ui.svg('line', { x1: GRID_X, y1: GRID_Y + i * CELL, x2: GRID_X + CELL * 10, y2: GRID_Y + i * CELL, class: cls }));
    }
    ui.text(svg, GRID_X + CELL * 5, GRID_Y + CELL * 10 + 14, '가로 1 m', 'mx-label mx-label-sm');
    ui.text(svg, 10, GRID_Y + CELL * 5, '세로 1 m', 'mx-label mx-label-sm').setAttribute('transform', 'rotate(-90 10 ' + (GRID_Y + CELL * 5) + ')');
    if (w > 0 && h > 0) ui.text(svg, GRID_X + (CELL * w) / 2, GRID_Y + (CELL * h) / 2, (w * h) + '칸', 'mx-label mx-label-lg mx-label-accent');
  }

  function gridProblem(stage, ctx, p, done) {
    var ui = ctx.ui;
    var el = ui.el;
    var tw = p.a.int;
    var th = p.b.int;
    var w = 0;
    var h = 0;
    var prod = C.mul(p.a, p.b);
    stage.appendChild(ui.guide('큰 정사각형은 가로 1 m, 세로 1 m예요. 작은 한 칸은 0.01 m²예요.'));
    stage.appendChild(el('p', 'mx-question', '가로 ' + f(p.a) + ' m, 세로 ' + f(p.b) + ' m인 직사각형을 칠해 보세요.'));
    var board = ui.board('0 0 320 316');
    stage.appendChild(board.wrap);

    function buttonRow(label, onPick) {
      var wrap = el('div', 'dm-pick-wrap');
      wrap.appendChild(el('span', 'dm-pick-label', label));
      var row = el('div', 'dm-pick-row');
      var btns = [];
      for (var k = 1; k <= 9; k += 1) {
        (function (v) {
          var b = ui.button('0.' + v, 'mx-btn dm-pick', function () {
            btns.forEach(function (x) { x.classList.remove('selected'); });
            b.classList.add('selected');
            onPick(v);
          });
          btns.push(b);
          row.appendChild(b);
        })(k);
      }
      wrap.appendChild(row);
      stage.appendChild(wrap);
      return btns;
    }

    var hintEl = el('div', 'mx-hint');
    hintEl.hidden = true;
    var after = el('div');
    var finished = false;

    function check() {
      drawGrid(board.svg, ui, w, h);
      if (finished || !w || !h) return;
      if (w === tw && h === th) {
        finished = true;
        ctx.praise();
        ui.hint(hintEl, '');
        steps();
        return;
      }
      var wrongW = w !== tw;
      ctx.encourage();
      ui.hint(hintEl, '💡 ' + (wrongW ? '가로를 다시 볼까요? ' + f(p.a) + ' m는 ' + tw + '칸이에요.' : '세로를 다시 볼까요? ' + f(p.b) + ' m는 ' + th + '칸이에요.'));
    }

    buttonRow('가로', function (v) { w = v; check(); });
    buttonRow('세로', function (v) { h = v; check(); });
    stage.appendChild(hintEl);
    stage.appendChild(after);

    function steps() {
      var cells = tw * th;
      ui.sequence(after, [
        function (s, next) {
          s.appendChild(ui.choiceQuestion({
            question: '색칠한 칸은 모두 몇 칸일까요?',
            choices: [String(cells), String(tw + th), String(cells * 10)],
            answer: 0,
            hint: '가로 ' + tw + '칸씩 ' + th + '줄이에요. ' + tw + ' × ' + th + '를 해 봐요.',
            explain: tw + ' × ' + th + ' = ' + cells + '칸이에요.',
            onSolved: next
          }));
        },
        function (s, next) {
          var pc = C.pointChoices(prod);
          s.appendChild(ui.choiceQuestion({
            question: '한 칸이 0.01 m²이니까, 색칠한 넓이 ' + ui.josa(f(p.a) + ' × ' + f(p.b), 'eun') + '?',
            choices: pc.choices.map(function (c) { return c + ' m²'; }),
            answer: pc.answer,
            hint: '0.01이 ' + cells + '개예요. 자연수 ' + cells + '의 100분의 1배예요.',
            explain: f(p.a) + ' × ' + f(p.b) + ' = ' + f(prod) + ' (소수 한 자리 × 소수 한 자리 → 소수 두 자리)',
            onSolved: next
          }));
        }
      ], done);
    }

    drawGrid(board.svg, ui, 0, 0);
  }

  var tab3 = {
    title: '3관 모눈 넓이',
    icon: '🖼️',
    sub: '0.□ × 0.□',
    render: function (container, ctx) {
      var ui = ctx.ui;
      container.appendChild(ui.concept('🖼️ (1보다 작은 소수) × (1보다 작은 소수)', '가로 0.8 m, 세로 0.6 m인 액자의 넓이는 0.8 × 0.6이에요. 1 m × 1 m 모눈에서 0.01 m² 칸이 48개이니까 0.48 m²예요. 8 × 6 = 48을 먼저 계산하고 100분의 1배를 해도 돼요.'));
      twoProblems(container, ctx, { a: C.dec(8, 1), b: C.dec(6, 1) }, function () { return C.makeLab3(); }, {
        title: '액자 넓이 모눈 칠하기',
        solve: function (stage, p, done) { gridProblem(stage, ctx, p, done); }
      });
      ctx.say('3관이에요. 모눈종이에 칠해서 소수끼리 곱해 볼까요?');
    }
  };

  global.DecimalLabsA = { tab1: tab1, tab2: tab2, tab3: tab3, twoProblems: twoProblems };
})(typeof window !== 'undefined' ? window : globalThis);
