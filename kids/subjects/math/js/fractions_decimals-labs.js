// 초등 3학년 분수와 소수 첫걸음 탐험관: 1~4관 + 노션 퀴즈 배틀 (2026-11-28 옛 화면을 공용 틀로 옮김, 리팩토링 묶음 F)
// 관마다 미션 3개를 맞히면 관 완료(ctx.complete). 그 뒤에도 미션은 계속 나온다.
(function (global) {
  'use strict';

  var CORE = global.FracDec3Core;
  var MISSIONS = 3;
  var PX = 22;      // 수직선 0.1 한 칸 너비
  var LINE_X = 30;  // 수직선 0의 x
  var LINE_Y = 75;  // 수직선 y

  function J(t, type) {
    return global.MathExplorer && global.MathExplorer.josaFrac ? global.MathExplorer.josaFrac(t, type) : String(t);
  }

  // 미션 진행 줄: 맞힐 때마다 hit(), MISSIONS번째에 관 완료
  function missionTracker(ui, ctx, card) {
    var count = 0;
    var line = ui.el('p', 'fd-mission-count', '');
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

  // 버튼 묶음: items = [{ text, value }], 고르면 onPick(value). active(value)로 표시를 맞춘다.
  function buttonRow(ui, items, onPick, cls) {
    var row = ui.el('div', 'fd-btn-row' + (cls ? ' ' + cls : ''));
    var buttons = items.map(function (it) {
      var b = ui.button(it.text, 'mx-btn fd-pick', function () { onPick(it.value); });
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

  // ── 1관: 피자 분수 ──
  function drawPizza(ui, svg, n, d) {
    svg.replaceChildren();
    var cx = 130, cy = 130, r = 110;
    svg.appendChild(ui.svg('circle', { cx: cx, cy: cy, r: r + 4, class: 'fd-pizza-crust' }));
    for (var i = 0; i < d; i += 1) {
      var a1 = (i * 360 / d) * Math.PI / 180;
      var a2 = ((i + 1) * 360 / d) * Math.PI / 180;
      var x1 = cx + r * Math.sin(a1), y1 = cy - r * Math.cos(a1);
      var x2 = cx + r * Math.sin(a2), y2 = cy - r * Math.cos(a2);
      var large = (360 / d) > 180 ? 1 : 0;
      svg.appendChild(ui.svg('path', {
        d: 'M ' + cx + ' ' + cy + ' L ' + x1.toFixed(2) + ' ' + y1.toFixed(2) + ' A ' + r + ' ' + r + ' 0 ' + large + ' 1 ' + x2.toFixed(2) + ' ' + y2.toFixed(2) + ' Z',
        class: i < n ? 'fd-slice on' : 'fd-slice'
      }));
    }
    svg.appendChild(ui.svg('circle', { cx: cx, cy: cy, r: 8, class: 'fd-pizza-center' }));
  }

  var lab1 = {
    title: '1관 피자 분수',
    icon: '🍕',
    sub: '분모와 분자',
    render: function (container, ctx) {
      var ui = ctx.ui;
      var card = ui.card('1관 🍕 피자 분수');
      card.appendChild(ui.guide('몇 등분할지 고르고, 색칠할 조각 수를 바꿔 보세요.'));
      card.appendChild(ui.concept('분모와 분자', '피자를 똑같이 나눈 전체 조각 수가 분모, 그중 색칠한 조각 수가 분자예요. 4조각 중 3조각은 3/4이에요.'));
      var state = { n: 3, d: 4 };
      var target = null;
      var solved = false;
      var tracker;

      var denoms = buttonRow(ui, CORE.DENOMS.map(function (d) { return { text: d + '등분 (1/' + d + ')', value: d }; }), function (d) {
        state.d = d;
        if (state.n > d) state.n = d;
        paint(true);
      });
      card.appendChild(denoms.el);
      var board = ui.board('0 0 260 260', 'fd-pizza-board');
      card.appendChild(board.wrap);
      var steps = ui.el('div', 'fd-btn-row');
      steps.appendChild(ui.button('➖ 1조각 빼기', 'mx-btn', function () { if (state.n > 0) { state.n -= 1; paint(true); } }));
      steps.appendChild(ui.button('➕ 1조각 더하기', 'mx-btn primary', function () { if (state.n < state.d) { state.n += 1; paint(true); } }));
      card.appendChild(steps);
      var show = ui.el('p', 'fd-show');
      card.appendChild(show);
      var read = ui.el('p', 'fd-read');
      card.appendChild(read);

      var mission = ui.el('div', 'fd-mission');
      var missionText = ui.el('p', 'fd-mission-text');
      var missionHint = ui.el('div', 'mx-hint');
      missionHint.hidden = true;
      mission.appendChild(missionText);
      mission.appendChild(missionHint);
      card.appendChild(mission);
      tracker = missionTracker(ui, ctx, card);
      container.appendChild(card);

      function newMission() {
        var guard = 0;
        do {
          target = CORE.pizzaTarget(Math.random, target);
          guard += 1;
        } while (target.n === state.n && target.d === state.d && guard < 20); // 지금 피자와 같은 미션은 내지 않음
        solved = false;
        ui.fill(missionText, '🎯 미션: 피자를 ' + J(target.n + '/' + target.d, 'ro') + ' 만들어 봐요');
        ui.hint(missionHint, '');
        paint(false);
      }

      function paint(speak) {
        denoms.active(state.d);
        drawPizza(ui, board.svg, state.n, state.d);
        var tok = state.n === 0 ? '0' : state.n + '/' + state.d;
        ui.fill(show, '전체 ' + state.d + '조각 중 ' + state.n + '조각 = ' + tok);
        ui.fill(read, '분모 ' + state.d + ': 똑같이 나눈 전체 조각 수 · 분자 ' + state.n + ': 색칠한 조각 수');
        if (speak) ctx.say('전체 ' + state.d + '조각 중 ' + state.n + '조각은 ' + J(tok, 'ieyo') + '.');
        if (!target || solved) return;
        if (state.d === target.d && state.n === target.n) {
          solved = true;
          ctx.praise();
          ui.hint(missionHint, '✨ 딱 맞아요! ' + target.d + '조각 중 ' + target.n + '조각이 ' + J(target.n + '/' + target.d, 'ieyo') + '.');
          tracker.hit();
          missionHint.appendChild(ui.button('다음 미션 ▶', 'mx-btn primary fd-next', newMission));
        } else if (state.d !== target.d) {
          ui.hint(missionHint, '💡 분모가 ' + target.d + '이니 ' + target.d + '등분을 골라요.');
        } else {
          ui.hint(missionHint, '');
        }
      }

      newMission();
    }
  };

  // ── 2관: 분수의 이름 ──
  var TYPES = [
    { key: 'unit', icon: '1️⃣', name: '단위분수', tag: '분자가 1 (1/4)', title: '단위분수: 분자가 1인 분수',
      lines: ['예시: 1/2, 1/3, 1/4, 1/8', '분모가 작을수록 한 조각이 더 커요. (1/2 > 1/4)'],
      voice: '단위분수는 분자가 1인 분수예요. 분모가 작을수록 크기가 더 커요.' },
    { key: 'proper', icon: '🍎', name: '진분수', tag: '분자 < 분모 (3/4)', title: '진분수: 분자가 분모보다 작은 분수',
      lines: ['예시: 1/4, 2/5, 3/7, 5/8', '0보다 크고 1보다 작아요.'],
      voice: '진분수는 분자가 분모보다 작은 분수로, 1보다 작아요.' },
    { key: 'improper', icon: '🎩', name: '가분수', tag: '분자 ≥ 분모 (5/4)', title: '가분수: 분자가 분모와 같거나 큰 분수',
      lines: ['예시: 4/4, 5/4, 7/3, 8/5', '크기가 1과 같거나 1보다 커요.'],
      voice: '가분수는 분자가 분모와 같거나 큰 분수예요.' },
    { key: 'mixed', icon: '👑', name: '대분수', tag: '자연수 + 진분수 (1과 1/4)', title: '대분수: 자연수와 진분수로 된 분수',
      lines: ['예시: 1과 1/4 (= 5/4), 2와 1/3', '자연수 덩어리와 남은 진분수를 함께 써요.'],
      voice: '대분수는 자연수와 진분수로 이루어진 분수예요.' }
  ];

  var TYPE_HINTS = {
    proper: '분자와 분모를 비교해 봐요. 분자가 더 작으면 1보다 작아요.',
    improper: '분자가 분모와 같거나 크면 1과 같거나 1보다 커요.',
    mixed: '앞에 자연수가 붙어 있어요.',
    'unit-pick': '분자가 1인 분수를 찾아요.'
  };

  var lab2 = {
    title: '2관 분수의 이름',
    icon: '✨',
    sub: '단위·진·가·대분수',
    render: function (container, ctx) {
      var ui = ctx.ui;
      var card = ui.card('2관 ✨ 분수의 이름');
      card.appendChild(ui.guide('카드를 눌러 분수 네 가지 이름을 살펴봐요.'));
      var grid = ui.el('div', 'fd-type-grid');
      var detail = ui.el('div', 'fd-type-detail');
      var cards = TYPES.map(function (t) {
        var b = ui.el('button', 'fd-type-card');
        b.type = 'button';
        b.appendChild(ui.el('span', 'fd-type-icon', t.icon));
        b.appendChild(ui.el('span', 'fd-type-name', t.name));
        b.appendChild(ui.fill(ui.el('span', 'fd-type-tag'), t.tag));
        b.addEventListener('click', function () { show(t, true); });
        grid.appendChild(b);
        return b;
      });
      card.appendChild(grid);
      card.appendChild(detail);

      function show(t, speak) {
        cards.forEach(function (b, i) { b.classList.toggle('active', TYPES[i] === t); });
        detail.replaceChildren();
        detail.appendChild(ui.el('p', 'fd-type-title', t.icon + ' ' + t.title));
        t.lines.forEach(function (line) { detail.appendChild(ui.fill(ui.el('p', 'fd-type-line'), '• ' + line)); });
        if (speak) ctx.say(t.voice);
      }
      show(TYPES[0], false);

      var area = ui.el('div', 'fd-area');
      card.appendChild(area);
      var tracker = missionTracker(ui, ctx, card);
      container.appendChild(card);

      var prevKind = null;
      function ask() {
        var q = CORE.randomTypeQuestion(Math.random, prevKind);
        prevKind = q.kind;
        area.replaceChildren();
        var text = q.kind === 'unit-pick'
          ? '🎯 다음 중 단위분수는 어느 것일까요?'
          : '🎯 ' + J(q.token, 'eun') + ' 어떤 분수일까요?';
        area.appendChild(ui.choiceQuestion({
          question: text,
          choices: q.choices,
          answer: q.answer,
          hint: TYPE_HINTS[q.kind],
          explain: q.kind === 'unit-pick'
            ? J(q.token, 'eun') + ' 분자가 1이라서 단위분수예요.'
            : J(q.token, 'eun') + ' ' + q.choices[q.answer] + '예요.',
          onSolved: function () {
            tracker.hit();
            area.appendChild(ui.button('다음 문제 ▶', 'mx-btn primary fd-next', ask));
          }
        }));
      }
      ask();
    }
  };

  // ── 3·4관 공용: 0~2 수직선 ──
  function drawLine(ui, svg, marks) {
    svg.appendChild(ui.svg('line', { x1: LINE_X, y1: LINE_Y, x2: LINE_X + 20 * PX, y2: LINE_Y, class: 'fd-axis' }));
    for (var i = 0; i <= 20; i += 1) {
      var x = LINE_X + i * PX;
      var big = i % 10 === 0;
      svg.appendChild(ui.svg('line', { x1: x, y1: LINE_Y, x2: x, y2: LINE_Y + (big ? 22 : 12), class: big ? 'fd-tick big' : 'fd-tick' }));
      if (big) ui.text(svg, x, 108, String(i / 10), 'fd-tick-label');
      else if (marks && marks.label === i) ui.text(svg, x, 106, CORE.decimalText(i), 'fd-tick-label small');
    }
  }

  function pointer(ui, svg, tenths, cls) {
    var x = LINE_X + tenths * PX;
    svg.appendChild(ui.svg('line', { x1: x, y1: 18, x2: x, y2: LINE_Y, class: 'fd-guide ' + cls }));
    svg.appendChild(ui.svg('circle', { cx: x, cy: LINE_Y, r: 5, class: 'fd-dot ' + cls }));
  }

  var lab3 = {
    title: '3관 0.1 수직선',
    icon: '📏',
    sub: '1/10 = 0.1',
    render: function (container, ctx) {
      var ui = ctx.ui;
      var card = ui.card('3관 📏 0.1 수직선');
      card.appendChild(ui.concept('0.1', '1을 똑같이 10칸으로 나눈 한 칸은 1/10이에요. 1/10을 0.1이라 쓰고 영 점 일이라고 읽어요.'));
      var cur = 5;
      var target = null;
      var solved = false;

      var presets = buttonRow(ui, [1, 3, 5, 8, 10, 14].map(function (t) {
        return { text: t === 10 ? '1 (딱 1!)' : CORE.decimalText(t) + ' (' + CORE.tenthsToken(t) + ')', value: t };
      }), function (t) { cur = t; paint(true); });
      card.appendChild(presets.el);
      var board = ui.board('0 0 520 120', 'fd-line-board');
      card.appendChild(board.wrap);
      var steps = ui.el('div', 'fd-btn-row');
      steps.appendChild(ui.button('➖ 0.1', 'mx-btn', function () { if (cur > 1) { cur -= 1; paint(true); } }));
      steps.appendChild(ui.button('➕ 0.1', 'mx-btn primary', function () { if (cur < 20) { cur += 1; paint(true); } }));
      card.appendChild(steps);
      var show = ui.el('p', 'fd-show');
      card.appendChild(show);

      var mission = ui.el('div', 'fd-mission');
      var missionText = ui.el('p', 'fd-mission-text');
      var missionHint = ui.el('div', 'mx-hint');
      missionHint.hidden = true;
      mission.appendChild(missionText);
      mission.appendChild(missionHint);
      card.appendChild(mission);
      var tracker = missionTracker(ui, ctx, card);
      container.appendChild(card);

      function newMission() {
        var guard = 0;
        do {
          target = CORE.decimalTarget(Math.random, target);
          guard += 1;
        } while (target === cur && guard < 20); // 지금 막대와 같은 미션은 내지 않음
        solved = false;
        missionText.textContent = '🎯 미션: 막대를 ' + J(CORE.decimalText(target), 'ro') + ' 맞춰 봐요';
        ui.hint(missionHint, '');
        paint(false);
      }

      function paint(speak) {
        presets.active(cur);
        board.svg.replaceChildren();
        board.svg.appendChild(ui.svg('rect', { x: LINE_X, y: 25, width: cur * PX, height: 35, rx: 6, class: 'fd-bar' }));
        drawLine(ui, board.svg, { label: cur });
        pointer(ui, board.svg, cur, 'blue');
        var dec = CORE.decimalText(cur);
        ui.fill(show, cur + '칸 = ' + dec + ' (분수로 ' + CORE.tenthsToken(cur) + ')');
        if (speak) ctx.say(cur + '칸은 소수로 ' + dec + ', 분수로 ' + J(CORE.tenthsToken(cur), 'ieyo') + '.');
        if (!target || solved) return;
        if (cur === target) {
          solved = true;
          ctx.praise();
          ui.hint(missionHint, '✨ 맞아요! 0.1이 ' + target + '개이면 ' + J(dec, 'ieyo') + '.');
          tracker.hit();
          missionHint.appendChild(ui.button('다음 미션 ▶', 'mx-btn primary fd-next', newMission));
        }
      }

      newMission();
    }
  };

  // ── 4관: 소수 막대 재기 ──
  var lab4 = {
    title: '4관 소수 막대 재기',
    icon: '🎲',
    sub: '칸 수 세기',
    render: function (container, ctx) {
      var ui = ctx.ui;
      var card = ui.card('4관 🎲 소수 막대 재기');
      card.appendChild(ui.guide('수직선 위 막대가 몇 칸인지 세어 소수와 분수로 맞혀 보세요.'));
      var board = ui.board('0 0 520 130', 'fd-line-board');
      card.appendChild(board.wrap);
      var area = ui.el('div', 'fd-area');
      card.appendChild(area);
      var tracker = missionTracker(ui, ctx, card);
      container.appendChild(card);

      function ask() {
        var b = CORE.makeBar(Math.random);
        board.svg.replaceChildren();
        var x0 = LINE_X + b.start * PX;
        var w = b.len * PX;
        board.svg.appendChild(ui.svg('rect', { x: x0, y: 20, width: w, height: 32, rx: 6, class: 'fd-bar red' }));
        ui.text(board.svg, x0 + w / 2, 36, '?', 'fd-bar-label');
        drawLine(ui, board.svg, null);
        pointer(ui, board.svg, b.start, 'blue');
        pointer(ui, board.svg, b.end, 'red');
        area.replaceChildren();
        var from = CORE.decimalText(b.start);
        var to = CORE.decimalText(b.end);
        area.appendChild(ui.choiceQuestion({
          question: '이 막대의 길이는 얼마일까요?',
          choices: b.choices,
          answer: b.answer,
          hint: b.start > 0
            ? '막대가 0이 아닌 ' + from + '에서 시작해요. 시작부터 끝까지 작은 칸을 세어 봐요.'
            : '작은 눈금 한 칸이 0.1이에요. 칸 수를 세어 봐요.',
          explain: (b.start > 0 ? from + '부터 ' + to + '까지 ' : '0부터 ') + b.len + '칸이라서 ' + CORE.decimalText(b.len) + ', 분수로 ' + J(CORE.tenthsToken(b.len), 'ieyo') + '.',
          onSolved: function () {
            tracker.hit();
            area.appendChild(ui.button('🎲 새 막대', 'mx-btn primary fd-next', ask));
          }
        }));
      }
      ask();
    }
  };

  function mount() {
    global.MathExplorer.mount({
      key: 'fracdec3',
      fractions: true,
      rememberTab: true,
      labs: [lab1, lab2, lab3, lab4],
      quiz: global.MathExplorerQuiz.create({
        grade: '3-1',
        unit: '6. 분수와 소수',
        title: '퀴즈 배틀',
        intro: '퀴즈 배틀이에요. 천천히 읽고 골라 볼까요?'
      })
    });
  }

  global.FracDec3Labs = { mount: mount };

  if (global.document && global.document.readyState === 'loading') {
    global.document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})(typeof window !== 'undefined' ? window : globalThis);
