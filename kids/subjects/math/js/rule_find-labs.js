// 초등 2학년 2학기 '6. 규칙 찾기' 탐험관 1~7관 및 마운트 (RuleFindLabs, docs/math_2-2_rule_spec.md)
(function (global) {
  'use strict';

  var KEY = 'rule2';
  var CORE = global.RuleFindCore;
  var DRAW = global.RuleDraw;
  var CAL = global.ClockDraw;

  function sayFor(ctx) {
    return function (t) {
      if (ctx && typeof ctx.say === 'function') {
        var clean = CORE.speakText(t);
        if (clean) ctx.say(clean);
      }
    };
  }

  function makeTracker(kind) {
    if (global.MathDrill && typeof global.MathDrill.track === 'function') {
      return global.MathDrill.track(KEY, kind);
    }
    return { wrong: function () {}, done: function () {} };
  }

  var LADDER1 = {
    title: '🪜 되풀이되는 마디',
    body: '똑같이 되풀이되는 부분을 찾으면 다음을 알 수 있어요.',
    question: {
      question: '사과, 바나나, 사과, 바나나, 사과 다음은?',
      choices: ['바나나', '사과', '포도'],
      answer: 0,
      explain: '사과와 바나나가 번갈아 나오니 다음은 바나나예요.'
    }
  };

  var LADDER2 = {
    title: '🪜 하나씩 더',
    body: '앞 모양보다 몇 개 많은지 세어 봐요.',
    question: {
      question: '1개, 2개, 3개 다음은?',
      choices: ['4개', '3개', '5개'],
      answer: 0,
      explain: '1개씩 늘어나니까 3개 다음은 4개예요.'
    }
  };

  var LADDER3 = {
    title: '🪜 덧셈표 읽기',
    body: '가로줄 수와 세로줄 수를 더한 값을 써요.',
    question: {
      question: '가로줄이 3, 세로줄이 4면?',
      choices: ['7', '12', '34'],
      answer: 0,
      explain: '3과 4를 더하면 7이에요.'
    }
  };

  function explainOf(p) {
    var r, c, ans, lastVal, dan, seatNum;
    if (p.kind === 'pattern-next') {
      return '되풀이되는 마디를 따라가면 다음 무늬를 알 수 있어요.';
    }
    if (p.kind === 'pattern-turn') {
      return '화살표가 시계 방향으로 한 칸씩 돌아가요.';
    }
    if (p.kind === 'pattern-two') {
      return '모양과 색깔 규칙을 따로 찾으면 빈칸을 알 수 있어요.';
    }
    if (p.kind === 'stack-step') {
      return '앞 모양보다 ' + p.d + '개씩 늘어나요.';
    }
    if (p.kind === 'stack-next') {
      return '셋째보다 ' + p.d + '개 더 늘어 ' + p.answerText + '예요.';
    }
    if (p.kind === 'stack-fifth') {
      return '넷째보다 ' + p.d + '개 더 늘어 ' + p.answerText + '예요.';
    }
    if (p.kind === 'add-blank') {
      r = p.rows[p.star[0]];
      c = p.cols[p.star[1]];
      ans = r + c;
      return r + CORE.josaNum(r, '과/와') + ' ' + c + CORE.josaNum(c, '을/를') + ' 더하면 ' + ans + CORE.josaNum(ans, '이에요/예요') + '.';
    }
    if (p.kind === 'add-dir') {
      if (p.dir === '↙') return '왼쪽 아래로 가면 수가 모두 같아요.';
      if (p.dir === '↘') return '오른쪽 아래로 가면 수가 2씩 커져요.';
      if (p.dir === '→') return '오른쪽으로 가면 수가 1씩 커져요.';
      return '아래로 가면 수가 1씩 커져요.';
    }
    if (p.kind === 'add-diag') {
      lastVal = p.rows[2] + p.cols[2];
      ans = p.rows[3] + p.cols[3];
      return '오른쪽 아래로 2씩 커져 ' + lastVal + ' 다음은 ' + ans + CORE.josaNum(ans, '이에요/예요') + '.';
    }
    if (p.kind === 'mul-step') {
      dan = p.rows[p.row];
      return dan + '단 가로줄은 오른쪽으로 ' + dan + '씩 커져요.';
    }
    if (p.kind === 'mul-blank') {
      r = p.rows[p.star[0]];
      c = p.cols[p.star[1]];
      ans = r * c;
      return r + CORE.josaNum(r, '과/와') + ' ' + c + CORE.josaNum(c, '을/를') + ' 곱하면 ' + ans + CORE.josaNum(ans, '이에요/예요') + '.';
    }
    if (p.kind === 'mul-swap') {
      return '두 수의 자리를 바꾸어 곱해도 곱한 값은 같아요.';
    }
    if (p.kind === 'cal-dir') {
      return p.dir === '→'
        ? '달력에서 오른쪽으로 가면 1씩 커져요.'
        : '달력에서 아래로 가면 7씩 커져요.';
    }
    if (p.kind === 'cal-week') {
      return '일주일씩 7을 더해 가면 ' + p.answerText + '이에요.';
    }
    if (p.kind === 'seat-blank') {
      seatNum = parseInt(p.answerText, 10);
      return '오른쪽 1씩, 아래 ' + p.perRow + '씩 커져 ' + seatNum + CORE.josaNum(seatNum, '이에요/예요') + '.';
    }
    return '규칙을 잘 찾았어요.';
  }

  function mulSwapMarks(p) {
    var ra = p.rows.indexOf(p.a);
    var cb = p.cols.indexOf(p.b);
    var rb = p.rows.indexOf(p.b);
    var ca = p.cols.indexOf(p.a);
    var out = [];
    if (ra >= 0 && cb >= 0) out.push([ra, cb]);
    if (rb >= 0 && ca >= 0) out.push([rb, ca]);
    return out;
  }

  function drawFor(p) {
    var marks, c, blankCoord;
    if (p.kind === 'pattern-next' || p.kind === 'pattern-turn') {
      return DRAW.row(p.seq.concat(['']), { blank: p.seq.length });
    }
    if (p.kind === 'pattern-two') {
      return DRAW.row(p.seq, { blank: p.blank });
    }
    if (p.kind === 'stack-step') {
      return DRAW.stackSeries(p.shapes);
    }
    if (p.kind === 'stack-next' || p.kind === 'stack-fifth') {
      return DRAW.stackSeries(p.shapes, { last: '?' });
    }
    if (p.kind === 'add-blank') {
      return DRAW.numTable({ op: '+', rows: p.rows, cols: p.cols, star: p.star });
    }
    if (p.kind === 'add-dir') {
      return DRAW.numTable({ op: '+', rows: p.rows, cols: p.cols, marks: p.marks, arrow: p.dir });
    }
    if (p.kind === 'add-diag') {
      return DRAW.numTable({ op: '+', rows: p.rows, cols: p.cols, marks: p.marks, blanks: [p.blank], arrow: '↘' });
    }
    if (p.kind === 'mul-step') {
      marks = [];
      for (c = 0; c < p.cols.length; c += 1) marks.push([p.row, c]);
      return DRAW.numTable({ op: '×', rows: p.rows, cols: p.cols, marks: marks });
    }
    if (p.kind === 'mul-blank') {
      return DRAW.numTable({ op: '×', rows: p.rows, cols: p.cols, star: p.star });
    }
    if (p.kind === 'mul-swap') {
      return DRAW.numTable({ op: '×', rows: p.rows, cols: p.cols });
    }
    if (p.kind === 'cal-dir') {
      return CAL.calendar({ firstDay: p.firstDay, days: p.days || 30, mark: p.marks }).el;
    }
    if (p.kind === 'cal-week') {
      return CAL.calendar({ firstDay: p.firstDay, days: p.days || 31, mark: [p.first] }).el;
    }
    if (p.kind === 'seat-blank') {
      blankCoord = Array.isArray(p.blank)
        ? p.blank
        : (p.blank && typeof p.blank === 'object' ? [p.blank.r, p.blank.c] : p.blank);
      return DRAW.seats({ rowNames: p.rowNames, perRow: p.perRow, blank: blankCoord });
    }
    return null;
  }

  // 공용 3지선다 묻기 (CORE.hintFor 연동, 질문·힌트 자동 읽기)
  function askWrap(box, ctx, p, extra, counter, next, opt) {
    var cfg = opt || {};
    var rawWrongs = cfg.rawWrongs || CORE.wrongChoices(p);
    var wrongs = [];
    var hints = {};
    var i, key;
    for (i = 0; i < rawWrongs.length; i += 1) {
      key = rawWrongs[i].mistake + ':' + i;
      wrongs.push({ token: rawWrongs[i].text, mistake: key });
      hints[key] = CORE.hintFor(p, rawWrongs[i].mistake);
    }
    var o = {
      question: cfg.question !== undefined ? cfg.question : p.question,
      answer: cfg.answer !== undefined ? cfg.answer : p.answerText,
      wrongs: cfg.wrongs || wrongs,
      hints: cfg.hints || hints,
      hint: cfg.hint || '규칙을 다시 살펴봐요.',
      explain: cfg.explain !== undefined ? cfg.explain : explainOf(p),
      prefix: KEY,
      kind: cfg.kind || p.kind,
      extra: cfg.extra !== undefined ? cfg.extra : extra,
      counter: counter,
      ladder: cfg.ladder || null,
      ladderLabel: '🪜 1학년 계단 다시 보기',
      say: sayFor(ctx),
      sayHint: true,
      column: cfg.column !== false,
      onSolved: cfg.onSolved || next
    };
    if (cfg.speak !== undefined) o.speak = cfg.speak;
    else if (p.speak !== undefined) o.speak = p.speak;
    if (cfg.order) o.order = cfg.order;
    var node = global.MathDrill.ask(ctx.ui, o);
    if (cfg.picChoices) {
      var row = node.querySelector('.mx-choice-row');
      if (row) row.classList.add('rf-pic-choices');
    }
    box.appendChild(node);
    return node;
  }

  // 1~5관 공통 틀
  function makeLab(num, spec) {
    return {
      title: spec.title,
      icon: spec.icon,
      sub: spec.sub,
      render: function (container, ctx) {
        var ui = ctx.ui;
        var card = ui.card(spec.title);
        card.appendChild(ui.guide(spec.guide));
        card.appendChild(global.MathDrill.algo(ui, spec.algo));
        card.appendChild(global.MathDrill.why(ui, spec.whyTitle, spec.whyBody));
        var area = ui.el('div', 'tw-area');
        card.appendChild(area);
        container.appendChild(card);
        global.MathDrill.rounds(area, ctx, {
          counterKey: KEY,
          perReward: 6,
          nextButton: true,
          makeRound: function () { return CORE.makeRound(num, Math.random); },
          renderProblem: function (box, p, next, extra, counter) {
            if (p && p.fact) box.appendChild(ui.el('div', 'rf-fact', p.fact));
            spec.renderProblem(box, p, next, extra, counter, ctx);
          }
        });
      }
    };
  }

  // 1관: 무늬 규칙
  var lab1 = makeLab(1, {
    title: '1관 무늬 규칙',
    icon: '🎨',
    sub: '무늬·돌기·두 규칙',
    guide: '무늬에서 되풀이되는 마디와 도는 규칙을 찾아 다음을 알아봐요.',
    algo: ['똑같이 되풀이되는 마디를 먼저 찾아요', '모양과 색깔이 다르면 따로 규칙을 봐요'],
    whyTitle: '왜 마디를 찾을까요?',
    whyBody: '되풀이되는 마디를 찾으면 다음을 알 수 있어요.',
    renderProblem: function (box, p, next, extra, counter, ctx) {
      var pic = drawFor(p);
      if (pic) box.appendChild(pic);
      askWrap(box, ctx, p, extra, counter, next, {
        column: false,
        picChoices: true,
        ladder: LADDER1
      });
    }
  });

  // 2관: 쌓은 모양
  var lab2 = makeLab(2, {
    title: '2관 쌓은 모양',
    icon: '🧱',
    sub: '몇 개씩 늘어나요',
    guide: '쌓기나무가 앞 모양보다 몇 개씩 늘어나는지 찾아봐요.',
    algo: ['앞 모양의 쌓기나무 수를 먼저 세어요', '몇 개씩 늘어나는지 더해 다음 모양을 찾아요'],
    whyTitle: '왜 앞 모양과 견줄까요?',
    whyBody: '앞 모양보다 몇 개 많은지 보면 다음 모양을 알 수 있어요.',
    renderProblem: function (box, p, next, extra, counter, ctx) {
      var pic = drawFor(p);
      if (pic) box.appendChild(pic);
      askWrap(box, ctx, p, extra, counter, next, { ladder: LADDER2 });
    }
  });

  // 3관: 덧셈표
  var lab3 = makeLab(3, {
    title: '3관 덧셈표',
    icon: '➕',
    sub: '덧셈표 규칙',
    guide: '덧셈표에서 오른쪽·아래·오른쪽 아래로 가는 규칙을 찾아봐요.',
    algo: ['가로줄 수와 세로줄 수를 더해 빈칸을 찾아요', '오른쪽·아래는 1씩, 오른쪽 아래는 2씩 커져요'],
    whyTitle: '덧셈표에는 어떤 규칙이 있을까요?',
    whyBody: '오른쪽·아래로 1씩, 오른쪽 아래로 2씩 커져요.',
    renderProblem: function (box, p, next, extra, counter, ctx) {
      var pic = drawFor(p);
      if (pic) box.appendChild(pic);
      askWrap(box, ctx, p, extra, counter, next, { ladder: LADDER3 });
    }
  });

  // 4관: 곱셈표
  var lab4 = makeLab(4, {
    title: '4관 곱셈표',
    icon: '✖️',
    sub: '곱셈표 규칙',
    guide: '곱셈표에서 가로줄의 규칙과 두 수를 바꾸어 곱한 값을 알아봐요.',
    algo: ['가로줄은 그 단의 수만큼 커져요', '두 수의 자리를 바꾸어 곱해도 값이 같아요'],
    whyTitle: '곱셈표에는 어떤 규칙이 있을까요?',
    whyBody: '가로줄은 그 단만큼 커지고 두 수를 바꿔 곱해도 같아요.',
    renderProblem: function (box, p, next, extra, counter, ctx) {
      if (p.kind === 'mul-swap') {
        var slot = ctx.ui.el('div', '');
        slot.appendChild(drawFor(p));
        box.appendChild(slot);
        askWrap(box, ctx, p, extra, counter, next, {
          onSolved: function () {
            slot.replaceChildren(DRAW.numTable({
              op: '×',
              rows: p.rows,
              cols: p.cols,
              marks: mulSwapMarks(p)
            }));
            next();
          }
        });
        return;
      }
      var pic = drawFor(p);
      if (pic) box.appendChild(pic);
      askWrap(box, ctx, p, extra, counter, next);
    }
  });

  // 5관: 생활 속 규칙
  var lab5 = makeLab(5, {
    title: '5관 생활 속 규칙',
    icon: '📅',
    sub: '달력·자리 번호',
    guide: '달력과 자리 번호 표에서 수가 커지는 규칙을 찾아봐요.',
    algo: ['달력은 오른쪽 1씩, 아래 7씩 커져요', '자리 번호는 오른쪽 1씩, 아래로 한 줄만큼 커져요'],
    whyTitle: '생활 속 표의 규칙',
    whyBody: '달력은 오른쪽 1씩·아래 7씩, 자리는 아래로 한 줄만큼 커져요.',
    renderProblem: function (box, p, next, extra, counter, ctx) {
      var pic = drawFor(p);
      if (pic) box.appendChild(pic);
      askWrap(box, ctx, p, extra, counter, next);
    }
  });

  // 6관: 🧩 무늬 타일 퍼즐 (자유 관)
  var lab6 = {
    title: '6관 🧩 무늬 타일 퍼즐',
    icon: '🧩',
    sub: '무늬 퍼즐',
    render: function (container, ctx) {
      var ui = ctx.ui;
      var say = sayFor(ctx);
      var counter = (global.MathDrill && typeof global.MathDrill.counter === 'function')
        ? global.MathDrill.counter(KEY, { perReward: 6 })
        : { add: function () {}, view: function () { return ui.el('span', 'mx-drill-count', ''); } };

      var card = ui.card('6관 🧩 무늬 타일 퍼즐');
      card.appendChild(ui.guide('규칙을 찾아 빈칸에 알맞은 타일을 채워요!'));
      card.appendChild(global.MathDrill.algo(ui, ['위 칸이나 오른쪽 위 칸을 보고 규칙을 찾아요', '빈칸을 누른 뒤 알맞은 타일을 골라 채워요']));
      card.appendChild(global.MathDrill.why(ui, '무늬 타일 퍼즐 규칙', '타일이 아래로 같거나 한 칸씩 밀리는 규칙을 찾으면 빈칸을 바로 채울 수 있어요.'));
      var area = ui.el('div', 'tw-area');
      card.appendChild(area);
      container.appendChild(card);

      var doneRounds = 0;
      var hasNext = typeof ctx.hasNext === 'function' && ctx.hasNext() && typeof ctx.goNext === 'function';

      var stampsEl = ui.el('div', 'rf-stamps');
      var stageEl = ui.el('div', '');
      var counterWrap = ui.el('div', '');
      var nextWrap = ui.el('div', 'mx-btn-row');
      nextWrap.hidden = true;

      if (hasNext) {
        nextWrap.appendChild(ui.button('다음 관 ▶', 'mx-btn primary', function () {
          ctx.goNext();
        }));
      }

      function renderStamps(count) {
        stampsEl.replaceChildren();
        var total = count > 3 ? count : 3;
        for (var i = 0; i < total; i += 1) {
          var on = i < count;
          stampsEl.appendChild(ui.el('span', on ? 'rf-stamp is-on' : 'rf-stamp', on ? '🧩' : ''));
        }
      }

      function startPuzzle() {
        stageEl.replaceChildren();
        var pz = CORE.makePuzzle(Math.random);
        var tracker = makeTracker('puzzle');
        var left = pz.blanks.length;
        var solved = false;
        var board = null;

        var promptEl = ui.el('p', 'mx-question', '빈칸을 누르고 알맞은 타일을 골라요');
        var hintEl = ui.el('div', 'mx-hint');
        hintEl.hidden = true;
        var newWrap = ui.el('div', 'rf-btns');
        newWrap.hidden = true;

        board = DRAW.tileBoard({
          rows: pz.rows,
          cols: pz.cols,
          cells: pz.cells,
          blanks: pz.blanks,
          palette: pz.palette,
          onPick: function (i, tile) {
            if (solved) return;
            if (CORE.puzzleCheck(pz, i, tile)) {
              if (!board.fill(i)) return;
              left -= 1;
              if (left > 0) {
                ui.hint(hintEl, '');
                say('맞아요');
                return;
              }
              solved = true;
              board.lock();
              ctx.praise();
              ui.hint(hintEl, '✨ 무늬 타일 퍼즐을 완성했어요!');
              tracker.done();
              doneRounds += 1;
              renderStamps(doneRounds);
              counter.add();
              counterWrap.replaceChildren(counter.view());
              if (doneRounds >= 3) {
                var doneNow = typeof ctx.isDone === 'function' ? ctx.isDone() : false;
                if (!doneNow && typeof ctx.complete === 'function') ctx.complete();
                if (hasNext) nextWrap.hidden = false;
              }
              newWrap.hidden = false;
              return;
            }
            tracker.wrong(tile);
            var msg = CORE.puzzleHint(pz);
            ui.hint(hintEl, '💡 ' + msg);
            say(msg);
          }
        });

        newWrap.appendChild(ui.button('🔁 새 퍼즐', 'mx-btn primary', function () {
          startPuzzle();
        }));

        stageEl.appendChild(promptEl);
        stageEl.appendChild(board.el);
        stageEl.appendChild(hintEl);
        stageEl.appendChild(newWrap);
        say('빈칸을 누르고 알맞은 타일을 골라요');
      }

      area.appendChild(stampsEl);
      area.appendChild(stageEl);
      area.appendChild(counterWrap);
      area.appendChild(nextWrap);

      renderStamps(0);
      counterWrap.replaceChildren(counter.view());
      startPuzzle();
    }
  };

  // 7관: 🎯 규칙 빙고
  var lab7 = {
    title: '7관 🎯 규칙 빙고',
    icon: '🎯',
    sub: '9칸 빙고',
    render: function (container, ctx) {
      var ui = ctx.ui;
      var card = ui.card('7관 🎯 규칙 빙고');
      card.appendChild(ui.guide('답을 판에 놓은 뒤, 들리는 규칙 문제의 답을 터뜨려요!'));
      var area = ui.el('div', 'tw-area');
      card.appendChild(area);
      container.appendChild(card);

      var bingoCtx = {
        ui: ctx.ui,
        say: sayFor(ctx),
        praise: ctx.praise,
        encourage: ctx.encourage,
        complete: ctx.complete,
        isDone: ctx.isDone,
        hasNext: ctx.hasNext,
        goNext: ctx.goNext
      };

      global.MathBingo.render(area, bingoCtx, {
        title: '🎯 규칙 빙고',
        prefix: KEY,
        counterKey: KEY + '-bingo',
        perReward: 6,
        makeBingo: function () {
          return CORE.makeBingo(Math.random);
        },
        labels: {
          place: '답을 골라 내 판에 놓아요',
          pickFirst: '먼저 아래 카드를 골라요'
        }
      });
    }
  };

  function mount() {
    global.MathExplorer.mount({
      key: KEY,
      rememberTab: true,
      wishBox: true,
      labs: [lab1, lab2, lab3, lab4, lab5, lab6, lab7],
      quiz: global.MathExplorerQuiz.create({
        grade: '2-2',
        unit: '6. 규칙 찾기',
        title: '퀴즈 배틀',
        intro: '퀴즈 배틀이에요. 천천히 들어 보고 골라 볼까요?',
        sayQuestion: true,
        speakText: CORE.speakText
      })
    });
  }

  global.RuleFindLabs = { mount: mount };

  if (global.document && global.document.readyState === 'loading') {
    global.document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})(typeof window !== 'undefined' ? window : globalThis);
