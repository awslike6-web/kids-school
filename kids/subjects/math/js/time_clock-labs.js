// 초등 2학년 2학기 '4. 시각과 시간' 탐험관 1~7관 및 마운트 (TimeClockLabs, docs/math_2-2_time_spec.md)
(function (global) {
  'use strict';

  var KEY = 'time2';
  var CORE = global.TimeClockCore;
  var DRAW = global.ClockDraw;

  function stripEmoji(text) {
    return String(text === undefined || text === null ? '' : text)
      .replace(/[\uD83C-\uD83E][\uDC00-\uDFFF]\uFE0F?|[☀-➿]\uFE0F?/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function sayFor(ctx) {
    return function (t) {
      if (ctx && typeof ctx.say === 'function') {
        var clean = stripEmoji(t);
        if (clean) ctx.say(clean);
      }
    };
  }

  function toTokens(list) {
    var out = [], i;
    for (i = 0; i < list.length; i += 1) {
      out.push({ token: list[i].text, mistake: list[i].mistake });
    }
    return out;
  }

  function makeTracker(kind) {
    if (global.MathDrill && typeof global.MathDrill.track === 'function') {
      return global.MathDrill.track(KEY, kind);
    }
    return { wrong: function () {}, done: function () {} };
  }

  var HINTS = {
    'number-as-minute': '긴바늘 숫자에 5를 곱해 분을 읽어요',
    'next-number': '긴바늘이 가리키는 숫자를 다시 봐요',
    'hand-swap': '짧은바늘이 시, 긴바늘이 분이에요',
    'count-back': '작은 눈금을 앞으로 세어 봐요',
    'minus-one': '1주일은 하루가 아니라 7일이에요',
    'ten-year': '1년은 10개월이 아니라 12개월이에요',
    'day-confuse': '하루는 24시간, 1년은 12개월이에요',
    'month-mix': '주먹 손등으로 세어 봐요',
    'before-as-minute': '정각까지 남은 분을 세어 봐요',
    'off-five': '5분씩 다시 세어 봐요',
    'before-hour': '몇 분 전은 한 시간 앞이에요',
    'before-ignore': '전은 뒤로 돌린 시각이에요',
    'hundred-hour': '1시간은 100분이 아니라 60분이에요',
    'hour-as-one': '1시간은 60분으로 바꾸어 더해요',
    'hundred-split': '60분이 1시간이에요, 60씩 나눠요',
    'digit-split': '60분을 빼면 남은 분이 보여요',
    'ten-off': '10분씩 다시 세어 봐요',
    'hours-only': '시와 분을 함께 살펴봐요',
    'ampm-swap': '낮 12시 전은 오전, 뒤는 오후예요',
    'wrong-scene': '그 일을 하는 때를 떠올려 봐요',
    'ten-day': '1일은 10시간이 아니라 24시간이에요',
    'day-as-one': '1일은 24시간으로 바꾸어 더해요',
    'pm-raw': '낮 12시를 지날 때 이어서 세어요',
    'off-one': '1칸씩 다시 세어 봐요',
    'ten-week': '1주일은 10일이 아니라 7일이에요',
    'school-week': '토요일과 일요일도 함께 7일이에요',
    'plus-one': '1주일은 다음 날이 아니라 7일 뒤예요',
    'off-min': '눈금을 다시 천천히 세어 봐요'
  };

  var LADDER1 = {
    title: '🪜 몇 시 30분',
    body: '긴바늘이 6을 가리키면 30분이에요. 짧은바늘은 두 숫자 사이에 있어요.',
    question: {
      question: '짧은바늘이 4와 5 사이, 긴바늘이 6이면?',
      choices: ['4시 30분', '5시 30분', '4시 6분'],
      answer: 0,
      explain: '짧은바늘이 4를 지나고 긴바늘이 6이면 4시 30분이에요.'
    }
  };

  var LADDER2 = {
    title: '🪜 긴바늘 한 바퀴',
    body: '긴바늘이 한 바퀴 돌면 60분, 짧은바늘은 숫자 한 칸을 가요.',
    question: {
      question: '긴바늘이 숫자 한 칸 가면 몇 분?',
      choices: ['5분', '1분', '10분'],
      answer: 0,
      explain: '긴바늘이 숫자 한 칸을 가면 5분이에요.'
    }
  };

  function explainOf(p) {
    if (p.kind === 'min-of-number') {
      return '긴바늘 숫자 ' + p.n + '에 5를 곱하면 ' + p.answerText + '이에요.';
    }
    if (p.kind === 'read5') {
      return '짧은바늘은 ' + p.h + ', 긴바늘은 ' + (p.m / 5) + '이라서 ' + p.answerText + '이에요.';
    }
    if (p.kind === 'set5') {
      return '긴바늘을 숫자 ' + (p.m / 5) + '에 맞춰 ' + p.answerText + '을 만들었어요.';
    }
    if (p.kind === 'read1') {
      return '5분씩 세고 작은 눈금을 더 세면 ' + p.answerText + '이에요.';
    }
    if (p.kind === 'set1') {
      return '긴바늘을 ' + p.m + '분 눈금에 맞춰 ' + p.answerText + '을 만들었어요.';
    }
    if (p.kind === 'before') {
      if (p.dir === 'to') {
        var nh = p.h === 12 ? 1 : p.h + 1;
        return nh + '시까지 ' + (60 - p.m) + '분 남아서 ' + p.answerText + '이에요.';
      }
      return p.h + '시에서 ' + p.m + '분 뒤로 돌리면 ' + p.answerText + '이에요.';
    }
    if (p.kind === 'h-to-min') {
      return '1시간은 60분이에요. ' + (p.h * 60) + '분과 ' + p.m + '분을 더하면 ' + p.answerText + '이에요.';
    }
    if (p.kind === 'min-to-h') {
      return '60분이 1시간이에요. ' + p.min + '분은 ' + p.answerText + '이에요.';
    }
    if (p.kind === 'elapsed') {
      return CORE.fmtTime(p.sh, p.sm) + '부터 ' + CORE.fmtTime(p.eh, p.em) + '까지 ' + p.answerText + ' 걸렸어요.';
    }
    if (p.kind === 'am-pm') {
      return p.scene.name + ' 시각은 ' + p.answerText + '가 알맞아요.';
    }
    if (p.kind === 'day-hours') {
      return p.d === 2
        ? '1일이 24시간이니까 2일은 48시간이에요.'
        : '24시간에 ' + p.hr + '시간을 더하면 ' + p.answerText + '이에요.';
    }
    if (p.kind === 'day-elapsed') {
      return '낮 12시까지 ' + (12 - p.start) + '시간, 뒤로 ' + (p.end - 12) + '시간이라 모두 ' + p.answerText + '이에요.';
    }
    if (p.kind === 'week-days') {
      return '1주일은 7일이에요. ' + p.n + '주일은 ' + p.answerText + '이에요.';
    }
    if (p.kind === 'cal-week') {
      return p.dir === 'before'
        ? '달력에서 바로 위 칸이 7일 전이라 ' + p.answerText + '이에요.'
        : '달력에서 바로 아래 칸이 7일 뒤라 ' + p.answerText + '이에요.';
    }
    if (p.kind === 'month-days') {
      return p.month === 0
        ? '1년은 1월부터 12월까지 모두 12개월이에요.'
        : p.month + '월은 ' + p.answerText + '까지 있어요.';
    }
    return p.answerText + '이에요.';
  }

  // 공용 3지선다 묻기 (질문·오답 힌트 자동 읽기, 이모지 제거 경유)
  function askWrap(box, ctx, p, extra, counter, next, opt) {
    var cfg = opt || {};
    var o = {
      question: cfg.question !== undefined ? cfg.question : p.question,
      answer: cfg.answer !== undefined ? cfg.answer : p.answerText,
      wrongs: cfg.wrongs || toTokens(CORE.wrongChoices(p)),
      hints: HINTS,
      hint: cfg.hint || '시계와 단위를 다시 살펴봐요.',
      explain: cfg.explain !== undefined ? cfg.explain : explainOf(p),
      prefix: KEY,
      kind: cfg.kind || p.kind,
      extra: cfg.extra !== undefined ? cfg.extra : extra,
      counter: counter,
      ladder: cfg.ladder || null,
      ladderLabel: '🪜 1-2 계단 다시 보기',
      say: sayFor(ctx),
      sayHint: true,
      column: cfg.column !== false,
      onSolved: cfg.onSolved || next
    };
    if (cfg.speak !== undefined) o.speak = cfg.speak;
    else if (p.speak !== undefined) o.speak = p.speak;
    if (cfg.order) o.order = cfg.order;
    box.appendChild(global.MathDrill.ask(ctx.ui, o));
  }

  // 1관③(set5)·2관②(set1) 끌기 시계 맞추기 공통
  function renderClockSet(box, ctx, p, extra, counter, next, opts) {
    var ui = ctx.ui;
    var say = sayFor(ctx);
    var tracker = makeTracker(p.kind);
    var solved = false;
    var curM = 0;

    function handleChange(pos) {
      curM = pos.m;
    }

    var clk = DRAW.clock({
      h: p.h,
      m: 0,
      step: opts.step,
      draggable: true,
      onChange: handleChange
    });

    var qEl = ui.el('p', 'mx-question', p.question);
    var btns = ui.el('div', 'tc-btns');
    var hintEl = ui.el('div', 'mx-hint');
    hintEl.hidden = true;
    var ctrlBtns = [];

    if (opts.fineButtons) {
      var btnMinus = ui.button('◀ 1분', 'mx-btn', function () {
        if (solved) return;
        var nm = (clk.get().m - 1 + 60) % 60;
        clk.set(p.h, nm);
        handleChange({ h: p.h, m: nm });
      });
      var btnPlus = ui.button('1분 ▶', 'mx-btn', function () {
        if (solved) return;
        var nm = (clk.get().m + 1) % 60;
        clk.set(p.h, nm);
        handleChange({ h: p.h, m: nm });
      });
      btns.appendChild(btnMinus);
      btns.appendChild(btnPlus);
      ctrlBtns.push(btnMinus, btnPlus);
    }

    var btnDone = ui.button('✔ 다 됐어요', 'mx-btn primary', function () {
      if (solved) return;
      var nowM = clk.get().m;
      if (nowM === p.m) {
        solved = true;
        clk.lock(true);
        for (var i = 0; i < ctrlBtns.length; i += 1) ctrlBtns[i].disabled = true;
        ctx.praise();
        ui.hint(hintEl, '✨ ' + explainOf(p));
        tracker.done();
        if (extra && counter && typeof counter.add === 'function') counter.add();
        next();
      } else {
        ctx.encourage();
        tracker.wrong(nowM);
        var msg = opts.onWrong(nowM);
        ui.hint(hintEl, '💡 ' + msg);
        say(msg);
      }
    });
    btns.appendChild(btnDone);
    ctrlBtns.push(btnDone);

    box.appendChild(qEl);
    box.appendChild(clk.el);
    box.appendChild(btns);
    box.appendChild(hintEl);
    say(p.speak || p.question);
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
            if (p && p.fact) box.appendChild(ui.el('div', 'tc-fact', p.fact));
            spec.renderProblem(box, p, next, extra, counter, ctx);
          }
        });
      }
    };
  }

  // 1관: 몇 시 몇 분 (5분)
  var lab1 = makeLab(1, {
    title: '1관 몇 시 몇 분 (5분)',
    icon: '🕒',
    sub: '5분 단위',
    guide: '긴바늘이 가리키는 숫자를 보고 5분씩 세어 시각을 읽고 맞춰요.',
    algo: ['짧은바늘이 시, 긴바늘이 분을 가리켜요', '긴바늘 숫자에 5를 곱해 분을 읽어요'],
    whyTitle: '왜 5분씩 셀까요?',
    whyBody: '시계 숫자 한 칸 사이에는 작은 눈금이 5개 있어요. 그래서 긴바늘이 숫자 한 칸을 갈 때마다 5분씩 늘어나요.',
    renderProblem: function (box, p, next, extra, counter, ctx) {
      if (p.kind === 'min-of-number') {
        box.appendChild(DRAW.clock({ h: 12, m: p.n * 5, hideHour: true }).el);
        askWrap(box, ctx, p, extra, counter, next, {
          hint: '긴바늘 숫자에 5를 곱해 분을 읽어요.',
          ladder: LADDER1
        });
        return;
      }
      if (p.kind === 'read5') {
        box.appendChild(DRAW.clock({ h: p.h, m: p.m }).el);
        askWrap(box, ctx, p, extra, counter, next, {
          hint: '짧은바늘이 시, 긴바늘이 분이에요.',
          ladder: LADDER1
        });
        return;
      }
      renderClockSet(box, ctx, p, extra, counter, next, {
        step: 5,
        fineButtons: false,
        onWrong: function () {
          var targetNum = p.m / 5;
          return '긴바늘이 ' + targetNum + CORE.josaNum(targetNum, '을') + ' 가리켜야 해요';
        }
      });
    }
  });

  // 2관: 몇 시 몇 분 (1분)
  var lab2 = makeLab(2, {
    title: '2관 몇 시 몇 분 (1분)',
    icon: '🕰️',
    sub: '1분·몇 분 전',
    guide: '작은 눈금을 1분씩 세어 시각을 읽고, 몇 분 전도 알아봐요.',
    algo: ['5분씩 센 뒤 작은 눈금을 1분씩 더 세어요', '정각까지 남은 분을 세면 몇 분 전이에요'],
    whyTitle: '1분과 몇 분 전',
    whyBody: '작은 눈금 한 칸은 1분이에요. 정각에 가까우면 다음 정각까지 남은 분을 세어 몇 분 전으로 말할 수 있어요.',
    renderProblem: function (box, p, next, extra, counter, ctx) {
      if (p.kind === 'read1') {
        box.appendChild(DRAW.clock({ h: p.h, m: p.m }).el);
        askWrap(box, ctx, p, extra, counter, next, {
          hint: '5분 눈금에서 작은 눈금을 앞으로 세어요.',
          ladder: LADDER2
        });
        return;
      }
      if (p.kind === 'set1') {
        renderClockSet(box, ctx, p, extra, counter, next, {
          step: 1,
          fineButtons: true,
          onWrong: function (nowM) {
            return CORE.setFeedback(nowM, p.m).text;
          }
        });
        return;
      }
      var clockOpts = p.dir === 'to' ? { h: p.h, m: p.m } : { h: p.h, m: 0 };
      box.appendChild(DRAW.clock(clockOpts).el);
      askWrap(box, ctx, p, extra, counter, next, {
        hint: '정각에서 몇 분 앞인지 시계를 보며 세어 봐요.',
        ladder: LADDER2
      });
    }
  });

  // 3관: 1시간은 60분
  var lab3 = makeLab(3, {
    title: '3관 1시간은 60분',
    icon: '⏳',
    sub: '시간·분·걸린 시간',
    guide: '1시간이 60분인 것을 이용해 시간과 분을 바꾸고 걸린 시간을 구해요.',
    algo: ['1시간은 60분으로 바꾸어 계산해요', '시간 띠에서 10분 칸을 세어 걸린 시간을 구해요'],
    whyTitle: '1시간은 왜 60분일까요?',
    whyBody: '긴바늘이 시계를 한 바퀴 돌면 작은 눈금 60칸을 지나요. 그때 짧은바늘이 한 칸 움직여 1시간이 돼요.',
    renderProblem: function (box, p, next, extra, counter, ctx) {
      if (p.kind === 'elapsed') {
        box.appendChild(DRAW.timeBar({
          start: p.sh * 60 + p.sm,
          end: p.eh * 60 + p.em
        }).el);
        askWrap(box, ctx, p, extra, counter, next, {
          hint: '시간 띠에서 색칠된 10분 칸을 세어 봐요.'
        });
        return;
      }
      askWrap(box, ctx, p, extra, counter, next, {
        hint: '1시간은 60분이라는 것을 떠올려 봐요.'
      });
    }
  });

  // 4관: 하루의 시간
  var lab4 = makeLab(4, {
    title: '4관 하루의 시간',
    icon: '🌞',
    sub: '오전·오후·24시간',
    guide: '하루는 24시간이에요. 오전과 오후로 나누어 시각과 시간을 알아봐요.',
    algo: ['밤 12시부터 낮 12시는 오전, 그 뒤는 오후예요', '1일은 24시간으로 바꾸어 계산해요'],
    whyTitle: '하루와 오전·오후',
    whyBody: '하루 동안 시계 짧은바늘은 두 바퀴를 돌아요. 첫 바퀴 12시간은 오전, 둘째 바퀴 12시간은 오후여서 하루는 24시간이에요.',
    renderProblem: function (box, p, next, extra, counter, ctx) {
      if (p.kind === 'day-elapsed') {
        box.appendChild(DRAW.dayBar({ start: p.start, end: p.end }).el);
        askWrap(box, ctx, p, extra, counter, next, {
          hint: '하루 띠에서 색칠된 칸이 몇 칸인지 세어 봐요.'
        });
        return;
      }
      askWrap(box, ctx, p, extra, counter, next, {
        hint: p.kind === 'am-pm'
          ? '낮 12시 전은 오전, 뒤는 오후예요.'
          : '1일은 24시간이에요.'
      });
    }
  });

  // 5관: 달력
  var lab5 = makeLab(5, {
    title: '5관 달력',
    icon: '📅',
    sub: '1주일·달력·날수',
    guide: '1주일은 7일이에요. 달력을 보고 날짜와 달마다 날수를 알아봐요.',
    algo: ['1주일은 7일이라 달력에서 바로 아래 칸이에요', '1년은 12개월이고 달마다 날수가 달라요'],
    whyTitle: '달마다 날수 기억하기',
    whyBody: '주먹 쥔 손등: 튀어나온 곳은 31일, 들어간 곳은 30일(2월은 28일)이에요.',
    renderProblem: function (box, p, next, extra, counter, ctx) {
      if (p.kind === 'cal-week') {
        box.appendChild(DRAW.calendar({
          firstDay: p.firstDay,
          days: p.days,
          mark: [p.date]
        }).el);
        askWrap(box, ctx, p, extra, counter, next, {
          hint: p.dir === 'before'
            ? '달력에서 바로 위 칸을 봐요.'
            : '달력에서 바로 아래 칸을 봐요.'
        });
        return;
      }
      if (p.kind === 'month-days') {
        askWrap(box, ctx, p, extra, counter, next, {
          hint: p.month === 0
            ? '1월부터 12월까지 세어 봐요.'
            : '주먹 손등으로 세어 봐요.'
        });
        return;
      }
      askWrap(box, ctx, p, extra, counter, next, {
        hint: '1주일은 7일이에요.'
      });
    }
  });

  // 6관: ⏰ 약속 시계 (자유 관)
  var lab6 = {
    title: '6관 ⏰ 약속 시계',
    icon: '⏰',
    sub: '약속 맞추기',
    render: function (container, ctx) {
      var ui = ctx.ui;
      var say = sayFor(ctx);
      var counter = (global.MathDrill && typeof global.MathDrill.counter === 'function')
        ? global.MathDrill.counter(KEY, { perReward: 6 })
        : { add: function () {}, view: function () { return ui.el('span', 'mx-drill-count', ''); } };

      var card = ui.card('6관 ⏰ 약속 시계');
      card.appendChild(ui.guide('동물 친구와의 약속 시각에 맞게 긴바늘을 돌려 맞춰 주세요!'));
      card.appendChild(global.MathDrill.algo(ui, ['긴바늘을 끌어 약속한 분에 맞춰요', '1분 버튼으로 조금씩 움직인 뒤 확인해요']));
      card.appendChild(global.MathDrill.why(ui, '약속 시각 맞추기', '짧은바늘은 약속한 시에 맞춰져 있어요. 긴바늘을 5분씩 크게 돌리고 1분씩 세어 맞추면 쉬워요.'));
      var area = ui.el('div', 'tw-area');
      card.appendChild(area);
      container.appendChild(card);

      var served = 0;
      var prom = null;
      var locked = false;
      var tracker = makeTracker('promise');
      var hasNext = typeof ctx.hasNext === 'function' && ctx.hasNext() && typeof ctx.goNext === 'function';

      var stampsEl = ui.el('div', 'tc-stamps');
      var friendEl = ui.el('div', 'tc-friend');
      var friendEmoji = ui.el('span', 'tc-friend-emoji', '');
      var friendName = ui.el('span', 'tc-friend-name', '');
      friendEl.appendChild(friendEmoji);
      friendEl.appendChild(friendName);

      var orderEl = ui.el('div', 'mx-expr', '');
      var clk = DRAW.clock({ h: 12, m: 0, step: 1, draggable: true });
      var btns = ui.el('div', 'tc-btns');
      var hintEl = ui.el('div', 'mx-hint');
      hintEl.hidden = true;
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
          stampsEl.appendChild(ui.el('span', on ? 'tc-stamp is-on' : 'tc-stamp', on ? '🕐' : ''));
        }
      }

      var btnMinus = ui.button('◀ 1분', 'mx-btn', function () {
        if (locked || !prom) return;
        clk.set(prom.h, (clk.get().m - 1 + 60) % 60);
      });
      var btnPlus = ui.button('1분 ▶', 'mx-btn', function () {
        if (locked || !prom) return;
        clk.set(prom.h, (clk.get().m + 1) % 60);
      });
      var btnCheck = ui.button('✔ 다 됐어요', 'mx-btn primary', function () {
        if (locked || !prom) return;
        var nowM = clk.get().m;
        var fb = CORE.setFeedback(nowM, prom.m);
        if (fb.ok) {
          locked = true;
          clk.lock(true);
          btnMinus.disabled = true;
          btnPlus.disabled = true;
          btnCheck.disabled = true;
          ctx.praise();
          ui.hint(hintEl, '✨ ' + fb.text);
          say(fb.text);
          tracker.done();
          served += 1;
          renderStamps(served);
          counter.add();
          counterWrap.replaceChildren(counter.view());
          if (served >= 3) {
            var doneNow = typeof ctx.isDone === 'function' ? ctx.isDone() : false;
            if (!doneNow && typeof ctx.complete === 'function') ctx.complete();
            if (hasNext) nextWrap.hidden = false;
          }
          setTimeout(function () {
            if (!area.isConnected) return;
            nextPromise();
          }, 1000);
        } else {
          ctx.encourage();
          tracker.wrong(nowM);
          ui.hint(hintEl, '💡 ' + fb.text);
          say(fb.text);
        }
      });

      btns.appendChild(btnMinus);
      btns.appendChild(btnPlus);
      btns.appendChild(btnCheck);

      area.appendChild(stampsEl);
      area.appendChild(friendEl);
      area.appendChild(orderEl);
      area.appendChild(clk.el);
      area.appendChild(btns);
      area.appendChild(hintEl);
      area.appendChild(counterWrap);
      area.appendChild(nextWrap);

      function nextPromise() {
        prom = CORE.makePromise(Math.random);
        locked = false;
        tracker = makeTracker('promise');
        clk.set(prom.h, 0);
        clk.lock(false);
        btnMinus.disabled = false;
        btnPlus.disabled = false;
        btnCheck.disabled = false;
        friendEmoji.textContent = prom.emoji;
        friendName.textContent = prom.name;
        orderEl.textContent = prom.text;
        ui.hint(hintEl, '');
        say(prom.speak);
      }

      renderStamps(0);
      nextPromise();
    }
  };

  // 7관: 🎯 시각 빙고
  var lab7 = {
    title: '7관 🎯 시각 빙고',
    icon: '🎯',
    sub: '9칸 빙고',
    render: function (container, ctx) {
      var ui = ctx.ui;
      var card = ui.card('7관 🎯 시각 빙고');
      card.appendChild(ui.guide('시각과 시간을 판에 놓고, 들리는 문제의 답을 터뜨려요!'));
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
        title: '🎯 시각 빙고',
        makeBingo: function () { return CORE.makeBingo(Math.random); },
        prefix: KEY,
        counterKey: KEY,
        perReward: 6,
        labels: {
          place: '시각과 시간을 골라 내 판에 놓아요',
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
        unit: '4. 시각과 시간',
        title: '퀴즈 배틀',
        intro: '퀴즈 배틀이에요. 천천히 들어 보고 골라 볼까요?',
        sayQuestion: true
      })
    });
  }

  global.TimeClockLabs = { mount: mount };

  if (global.document && global.document.readyState === 'loading') {
    global.document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})(typeof window !== 'undefined' ? window : globalThis);
