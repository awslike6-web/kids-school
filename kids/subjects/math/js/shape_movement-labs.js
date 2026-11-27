// 초등 4학년 평면도형의 이동 탐험관: 1~4관 + 노션 퀴즈 배틀 (2026-11-28 옛 화면을 공용 틀로 옮김, 리팩토링 묶음 F5)
// 관마다 미션 3개를 맞히면 관 완료(ctx.complete). 그 뒤에도 미션은 계속 나온다.
(function (global) {
  'use strict';

  var CORE = global.MoveCore;
  var MISSIONS = 3;
  var CELL = 26;

  // 미션 진행 줄: 맞힐 때마다 hit(), MISSIONS번째에 관 완료
  function missionTracker(ui, ctx, card) {
    var count = 0;
    var line = ui.el('p', 'sm-mission-count', '');
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

  // 모눈 그림판: cols×rows 칸
  function gridBoard(ui, cols, rows, cls) {
    var b = ui.board('0 0 ' + (cols * CELL + 4) + ' ' + (rows * CELL + 4), cls);
    function grid() {
      b.svg.replaceChildren();
      for (var i = 0; i <= cols; i += 1) b.svg.appendChild(ui.svg('line', { x1: 2 + i * CELL, y1: 2, x2: 2 + i * CELL, y2: 2 + rows * CELL, class: 'sm-grid' }));
      for (var j = 0; j <= rows; j += 1) b.svg.appendChild(ui.svg('line', { x1: 2, y1: 2 + j * CELL, x2: 2 + cols * CELL, y2: 2 + j * CELL, class: 'sm-grid' }));
    }
    function shape(pts, ox, oy, cls2) {
      var s = pts.map(function (p) { return (2 + (ox + p[0]) * CELL) + ',' + (2 + (oy + p[1]) * CELL); }).join(' ');
      b.svg.appendChild(ui.svg('polygon', { points: s, class: 'sm-shape ' + (cls2 || '') }));
    }
    return { wrap: b.wrap, svg: b.svg, grid: grid, shape: shape };
  }

  // 모양을 판 가운데에
  function drawCentered(board, pts, cols, rows, cls) {
    var bb = CORE.bounds(pts);
    board.grid();
    board.shape(pts, Math.floor((cols - bb.w) / 2), Math.floor((rows - bb.h) / 2), cls);
  }

  // ── 1관: 밀기 ──
  var lab1 = {
    title: '1관 밀기',
    icon: '✋',
    sub: '위치만 바뀌어요',
    render: function (container, ctx) {
      var ui = ctx.ui;
      var COLS = 10;
      var ROWS = 7;
      var bb = CORE.bounds(CORE.SHAPE);
      var card = ui.card('1관 ✋ 도형 밀기');
      card.appendChild(ui.concept('밀기', '도형을 어느 방향으로 밀어도 모양과 크기는 그대로예요. 도형이 놓인 위치만 바뀌어요.'));
      var mission = ui.el('p', 'sm-mission-text', '');
      card.appendChild(mission);
      var board = gridBoard(ui, COLS, ROWS, 'sm-slide-board');
      card.appendChild(board.wrap);
      var pad = ui.el('div', 'sm-pad');
      var hint = ui.el('div', 'mx-hint');
      hint.hidden = true;
      var pos = { x: 1, y: 1 };
      var start = { x: 1, y: 1 };
      var m = null;
      var solved = false;

      function move(dx, dy) {
        if (solved) return;
        var nx = pos.x + dx;
        var ny = pos.y + dy;
        if (nx < 0 || ny < 0 || nx > COLS - bb.w || ny > ROWS - bb.h) {
          ui.hint(hint, '💡 더 밀면 판 밖으로 나가요.');
          return;
        }
        pos = { x: nx, y: ny };
        paint();
        check();
      }

      [['⬆️ 위', 0, -1], ['⬅️ 왼쪽', -1, 0], ['➡️ 오른쪽', 1, 0], ['⬇️ 아래', 0, 1]].forEach(function (b) {
        pad.appendChild(ui.button(b[0], 'mx-btn sm-arrow', function () { move(b[1], b[2]); }));
      });
      pad.appendChild(ui.button('↩️ 다시', 'mx-btn sm-arrow', function () {
        if (solved) return;
        pos = { x: start.x, y: start.y };
        ui.hint(hint, '');
        paint();
      }));
      card.appendChild(pad);
      card.appendChild(hint);
      var tracker = missionTracker(ui, ctx, card);
      container.appendChild(card);

      function paint() {
        board.grid();
        board.shape(CORE.SHAPE, start.x, start.y, 'ghost');
        board.shape(CORE.SHAPE, pos.x, pos.y, '');
      }

      function check() {
        if (pos.x === m.target.x && pos.y === m.target.y) {
          solved = true;
          ctx.praise();
          ui.hint(hint, '✨ 딱 맞아요! ' + CORE.DIR_NAMES[m.dir] + '으로 ' + m.n + '칸 밀었어요. 모양과 크기는 그대로예요.');
          tracker.hit();
          hint.appendChild(ui.button('다음 미션 ▶', 'mx-btn primary sm-next', next));
        } else {
          ui.hint(hint, '');
        }
      }

      function next() {
        start = { x: pos.x, y: pos.y };
        m = CORE.makeSlide(Math.random, start, COLS, ROWS, bb.w, bb.h);
        solved = false;
        mission.textContent = '🎯 미션: 도형을 ' + CORE.DIR_NAMES[m.dir] + '으로 ' + m.n + '칸 밀어 봐요';
        ui.hint(hint, '');
        paint();
        ctx.say(mission.textContent.replace('🎯 미션: ', ''));
      }
      m = CORE.makeSlide(Math.random, start, COLS, ROWS, bb.w, bb.h);
      mission.textContent = '🎯 미션: 도형을 ' + CORE.DIR_NAMES[m.dir] + '으로 ' + m.n + '칸 밀어 봐요';
      paint();
    }
  };

  // ── 2·3관 공용: 둘러보기 판 + 처음 → 나중 문제 ──
  function makeTransformLab(spec) {
    return {
      title: spec.title,
      icon: spec.icon,
      sub: spec.sub,
      render: function (container, ctx) {
        var ui = ctx.ui;
        var card = ui.card(spec.cardTitle);
        card.appendChild(ui.concept(spec.conceptTitle, spec.conceptBody));
        var cur = CORE.SHAPE;
        var turn = 0;
        var play = gridBoard(ui, 6, 6, 'sm-play-board');
        drawCentered(play, cur, 6, 6, '');
        card.appendChild(play.wrap);
        var note = ui.el('p', 'sm-note', spec.startNote);
        var row = ui.el('div', 'sm-btn-row');
        spec.buttons.forEach(function (b) {
          row.appendChild(ui.button(b.text, 'mx-btn', function () {
            cur = CORE.apply(cur, b.op);
            turn = (turn + (b.turn || 0) + 360) % 360;
            drawCentered(play, cur, 6, 6, '');
            note.textContent = b.note + (spec.showTurn ? ' (처음에서 시계 방향으로 ' + turn + '°)' : '');
            ctx.say(b.note);
          }));
        });
        row.appendChild(ui.button('↩️ 처음 모양', 'mx-btn', function () {
          cur = CORE.SHAPE;
          turn = 0;
          drawCentered(play, cur, 6, 6, '');
          note.textContent = spec.startNote;
        }));
        card.appendChild(row);
        card.appendChild(note);

        var area = ui.el('div', 'sm-area');
        card.appendChild(area);
        var tracker = missionTracker(ui, ctx, card);
        container.appendChild(card);

        var prevOp = null;
        function ask() {
          var q;
          var guard = 0;
          do {
            q = spec.make(Math.random);
            guard += 1;
          } while (q.answerOp === prevOp && guard < 20);
          prevOp = q.answerOp;
          area.replaceChildren();
          area.appendChild(ui.el('p', 'sm-mission-text', '🎯 미션: 처음 도형을 어떻게 움직였을까요?'));
          var pair = ui.el('div', 'sm-pair');
          [['처음', q.before], ['나중', q.after]].forEach(function (it) {
            var box = ui.el('div', 'sm-pair-box');
            box.appendChild(ui.el('p', 'sm-pair-label', it[0]));
            var b = gridBoard(ui, 6, 6, 'sm-small-board');
            drawCentered(b, it[1], 6, 6, it[0] === '나중' ? 'after' : '');
            box.appendChild(b.wrap);
            pair.appendChild(box);
          });
          area.appendChild(pair);
          area.appendChild(ui.choiceQuestion({
            question: '',
            choices: q.choices,
            answer: q.answerIndex,
            column: true,
            hint: spec.hint,
            explain: '처음 도형을 ' + q.choices[q.answerIndex].replace(/뒤집기$/, '뒤집으면').replace(/돌리기$/, '돌리면') + ' 나중 도형이 돼요.',
            onSolved: function () {
              tracker.hit();
              area.appendChild(ui.button('다음 문제 ▶', 'mx-btn primary sm-next', ask));
            }
          }));
        }
        ask();
      }
    };
  }

  var lab2 = makeTransformLab({
    title: '2관 뒤집기',
    icon: '🪞',
    sub: '좌우·위아래',
    cardTitle: '2관 🪞 도형 뒤집기',
    conceptTitle: '뒤집기',
    conceptBody: '도형을 오른쪽이나 왼쪽으로 뒤집으면 왼쪽과 오른쪽이 서로 바뀌어요. 위쪽이나 아래쪽으로 뒤집으면 위쪽과 아래쪽이 서로 바뀌어요. 같은 방향으로 두 번 뒤집으면 처음 모양이 돼요.',
    startNote: '버튼을 눌러 도형을 뒤집어 봐요.',
    buttons: [
      { text: '➡️ 오른쪽으로', op: 'flipLR', note: '왼쪽과 오른쪽이 바뀌었어요.' },
      { text: '⬅️ 왼쪽으로', op: 'flipRL', note: '왼쪽과 오른쪽이 바뀌었어요.' },
      { text: '⬆️ 위쪽으로', op: 'flipTB', note: '위쪽과 아래쪽이 바뀌었어요.' },
      { text: '⬇️ 아래쪽으로', op: 'flipBT', note: '위쪽과 아래쪽이 바뀌었어요.' }
    ],
    make: function (rng) { return CORE.makeFlipQuiz(rng); },
    hint: '처음과 나중을 보고 왼쪽·오른쪽이 바뀌었는지, 위·아래가 바뀌었는지 살펴봐요.'
  });

  var lab3 = makeTransformLab({
    title: '3관 돌리기',
    icon: '🔄',
    sub: '90°·180°·270°',
    cardTitle: '3관 🔄 도형 돌리기',
    conceptTitle: '돌리기',
    conceptBody: '시계 방향으로 90°만큼 돌리면 위쪽이 오른쪽으로 가요. 180°만큼 돌리면 위쪽은 아래쪽으로, 왼쪽은 오른쪽으로 가요. 시계 방향으로 270°만큼 돌린 모양은 시계 반대 방향으로 90°만큼 돌린 모양과 같고, 360°만큼 돌리면 처음 모양이 돼요.',
    startNote: '버튼을 눌러 도형을 돌려 봐요.',
    showTurn: true,
    buttons: [
      { text: '↻ 시계 방향 90°', op: 'cw90', turn: 90, note: '시계 방향으로 90°만큼 돌렸어요.' },
      { text: '↺ 시계 반대 방향 90°', op: 'ccw90', turn: -90, note: '시계 반대 방향으로 90°만큼 돌렸어요.' }
    ],
    make: function (rng) { return CORE.makeTurnQuiz(rng); },
    hint: '도형의 위쪽 부분이 어디로 갔는지 따라가 봐요.'
  });

  // ── 4관: 무늬 꾸미기 ──
  function tileSvg(ui, turns, cls) {
    var s = ui.svg('svg', { viewBox: '0 0 50 50', class: 'sm-tile-svg ' + (cls || '') });
    var g = ui.svg('g', { transform: 'rotate(' + (turns * 90) + ' 25 25)' });
    g.appendChild(ui.svg('polygon', { points: '5,5 45,5 5,45', class: 'sm-tile-tri' }));
    g.appendChild(ui.svg('circle', { cx: 15, cy: 15, r: 4, class: 'sm-tile-dot' }));
    s.appendChild(g);
    return s;
  }

  var lab4 = {
    title: '4관 무늬 꾸미기',
    icon: '🎨',
    sub: '돌려서 무늬 만들기',
    render: function (container, ctx) {
      var ui = ctx.ui;
      var card = ui.card('4관 🎨 무늬 꾸미기');
      card.appendChild(ui.guide('타일을 누를 때마다 시계 방향으로 90°만큼 돌아가요. 왼쪽 보기 무늬와 똑같이 만들어 봐요.'));
      var area = ui.el('div', 'sm-area');
      card.appendChild(area);
      var tracker = missionTracker(ui, ctx, card);
      container.appendChild(card);

      var prevRule = null;
      function ask() {
        var p = CORE.makePattern(Math.random, prevRule);
        prevRule = p.rule;
        var turns = [0, 0, 0, 0, 0, 0, 0, 0, 0];
        var solved = false;
        area.replaceChildren();
        var wrap = ui.el('div', 'sm-pattern-pair');
        var goal = ui.el('div', 'sm-pattern goal');
        p.turns.forEach(function (t) {
          var cell = ui.el('div', 'sm-tile goal');
          cell.appendChild(tileSvg(ui, t, ''));
          goal.appendChild(cell);
        });
        var mine = ui.el('div', 'sm-pattern');
        var hint = ui.el('div', 'mx-hint');
        hint.hidden = true;
        var buttons = turns.map(function (t, i) {
          var b = ui.el('button', 'sm-tile');
          b.type = 'button';
          b.appendChild(tileSvg(ui, 0, ''));
          b.addEventListener('click', function () {
            if (solved) return;
            turns[i] = (turns[i] + 1) % 4;
            b.replaceChildren(tileSvg(ui, turns[i], ''));
            b.classList.toggle('ok', turns[i] === p.turns[i]);
            if (turns.every(function (v, k) { return v === p.turns[k]; })) {
              solved = true;
              ctx.praise();
              ui.hint(hint, '✨ 무늬 완성! 같은 타일을 돌려서 규칙 있는 무늬를 만들었어요.');
              tracker.hit();
              hint.appendChild(ui.button('다음 무늬 ▶', 'mx-btn primary sm-next', ask));
            }
          });
          mine.appendChild(b);
          return b;
        });
        buttons.forEach(function (b, i) { b.classList.toggle('ok', p.turns[i] === 0); });
        var g1 = ui.el('div', 'sm-pattern-col');
        g1.appendChild(ui.el('p', 'sm-pair-label', '보기 무늬'));
        g1.appendChild(goal);
        var g2 = ui.el('div', 'sm-pattern-col');
        g2.appendChild(ui.el('p', 'sm-pair-label', '내 무늬'));
        g2.appendChild(mine);
        wrap.appendChild(g1);
        wrap.appendChild(g2);
        area.appendChild(wrap);
        area.appendChild(hint);
      }
      ask();
    }
  };

  function mount() {
    global.MathExplorer.mount({
      key: 'move4',
      rememberTab: true,
      labs: [lab1, lab2, lab3, lab4],
      quiz: global.MathExplorerQuiz.create({
        grade: '4-1',
        unit: '4. 평면도형의 이동',
        title: '퀴즈 배틀',
        intro: '퀴즈 배틀이에요. 천천히 읽고 골라 볼까요?'
      })
    });
  }

  global.MoveLabs = { mount: mount };

  if (global.document && global.document.readyState === 'loading') {
    global.document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})(typeof window !== 'undefined' ? window : globalThis);
