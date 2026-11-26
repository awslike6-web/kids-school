// 초등 2학년 2학기 '3. 길이 재기' 탐험관 1~7관 및 마운트 (LengthMLabs, docs/math_2-2_length_spec.md)
(function (global) {
  'use strict';

  var KEY = 'lenm';
  var CORE = global.LengthMCore;
  var DRAW = global.LengthDraw;

  function J(text, type) {
    var me = global.MathExplorer;
    return me && me.josa ? me.josa(String(text), type) : String(text);
  }

  function toTokens(list) {
    var out = [], i;
    for (i = 0; i < list.length; i += 1) out.push({ token: list[i].text, mistake: list[i].mistake });
    return out;
  }

  function sayFor(ctx) {
    return function (t) {
      if (ctx && typeof ctx.say === 'function') {
        ctx.say(CORE.speakText(String(t)));
      }
    };
  }

  var HINTS = {
    'count-only': '10cm 막대가 10개 모였어요',
    'count-off': '몇 개인지 다시 세어 봐요',
    'zero-drop': '1m는 100cm예요, 0을 챙겨요',
    'unit-ignore': 'm를 cm로 바꾸어 봐요',
    'tick-off': '10cm 눈금을 다시 읽어 봐요',
    'm-ignore': '100cm인 m 부분을 챙겨요',
    'split-wrong': '100cm가 1m예요, 백의 자리를 봐요',
    'zero-shift': '한 자리 cm는 10이 아니라 1이에요',
    'm-as-ten': '1m는 10cm가 아니라 100cm예요',
    'swap-digits': '십의 자리와 일의 자리를 봐요',
    'compare-digits': 'cm로 바꾼 뒤 크기를 비교해요',
    'reverse': '어느 쪽이 더 긴지 다시 봐요',
    'equal': '두 길이가 같지 않아요',
    'not-equal': 'cm로 바꾸면 두 길이가 같아요',
    'forget-m': 'm도 함께 계산해야 해요',
    'm-slip': 'm는 m끼리, cm는 cm끼리 계산해요',
    'unit-swap': 'cm와 m 단위를 다시 봐요',
    'scale-off': '실제 물건 크기를 떠올려 봐요',
    'far-guess': '⭐ 깃발에 가장 가까운 동물을 찾아요',
    'off-by-one': '1cm씩 다시 세어 봐요',
    'off-by-ten': '10cm씩 다시 세어 봐요'
  };

  var LADDER1 = {
    title: '🪜 1cm',
    body: '1cm가 5번이면 5cm예요.',
    question: {
      question: '1cm가 7번이면 몇 cm?',
      choices: ['7cm', '70cm', '1cm'],
      answer: 0,
      explain: '1cm가 7번 모이면 7cm예요.'
    }
  };

  var LADDER2 = {
    title: '🪜 자로 재기',
    body: '물건 한쪽 끝을 0에 맞추고, 다른 끝의 눈금을 읽어요.',
    question: {
      question: '0에서 시작해 8에서 끝나면 몇 cm?',
      choices: ['8cm', '80cm', '9cm'],
      answer: 0,
      explain: '0에서 시작했으니 끝 눈금 그대로 8cm예요.'
    }
  };

  var CMP_MAP = { '>': '> 왼쪽이 길어요', '<': '< 오른쪽이 길어요', '=': '= 같아요' };
  var CMP_ORDER = [CMP_MAP['>'], CMP_MAP['<'], CMP_MAP['=']];
  var CLOSEST_ORDER = ['🐰 토끼', '🐻 곰', '🦊 여우'];

  function explainOf(p) {
    if (p.kind === 'ten-sticks') return '10cm가 10개면 100cm예요. 100cm는 1m와 같아요.';
    if (p.kind === 'm-is-cm') return '1m는 100cm예요.';
    if (p.kind === 'm-n') return '1m가 100cm니까 ' + p.n + 'm는 ' + p.answerText + '예요.';
    if (p.kind === 'tape-cm') return '100 눈금에서 ' + (p.len - 100) + 'cm 더 갔으니 ' + p.answerText + '예요.';
    if (p.kind === 'tape-mcm' || p.kind === 'tape-zero' || p.kind === 'cm-to-m') {
      return '100cm가 1m예요. 그래서 ' + p.len + 'cm는 ' + p.answerText + '예요.';
    }
    if (p.kind === 'm-to-cm') return '1m가 100cm예요. 그래서 ' + CORE.fmt(p.len) + '는 ' + p.answerText + '예요.';
    if (p.kind === 'compare') {
      if (p.a === p.b) return p.aText + '와 ' + p.bText + '는 모두 ' + p.a + 'cm로 같아요.';
      if (p.a > p.b) return p.aText + '는 ' + p.a + 'cm라서 ' + p.bText + '보다 길어요.';
      return p.bText + '는 ' + p.b + 'cm라서 ' + p.aText + '보다 길어요.';
    }
    if (p.kind === 'add') return 'm는 m끼리, cm는 cm끼리 더하면 ' + p.answerText + '예요.';
    if (p.kind === 'sub') return 'm는 m끼리, cm는 cm끼리 빼면 ' + p.answerText + '예요.';
    if (p.kind === 'word') {
      return p.op === '+'
        ? 'm는 m끼리, cm는 cm끼리 더하면 ' + p.answerText + '예요.'
        : 'm는 m끼리, cm는 cm끼리 빼면 ' + p.answerText + '예요.';
    }
    if (p.kind === 'unit-pick') return p.item.name + '의 길이는 ' + p.answerText + '가 알맞아요.';
    if (p.kind === 'body-ruler') return '약 1m가 ' + p.n + '번이면 ' + p.answerText + '예요.';
    if (p.kind === 'closest') {
      var i, g;
      for (i = 0; i < p.guesses.length; i += 1) {
        g = p.guesses[i];
        if (g.emoji + ' ' + g.name === p.answerText) {
          return J(g.name, 'eun') + ' 실제 길이와 ' + Math.abs(g.len - p.real) + 'cm 차이로 가장 가까워요.';
        }
      }
    }
    return p.answerText + '예요.';
  }

  // 공용 3지선다 묻기 (질문·오답 힌트 자동 읽기, speakText 경유)
  function askWrap(box, ctx, p, extra, counter, next, opt) {
    var o = {
      question: opt.question !== undefined ? opt.question : p.question,
      answer: opt.answer !== undefined ? opt.answer : p.answerText,
      wrongs: opt.wrongs || toTokens(CORE.wrongChoices(p)),
      hints: HINTS,
      hint: opt.hint || '길이와 단위를 다시 살펴봐요.',
      explain: opt.explain !== undefined ? opt.explain : explainOf(p),
      prefix: KEY,
      kind: opt.kind || p.kind,
      extra: opt.extra !== undefined ? opt.extra : extra,
      counter: counter,
      ladder: opt.ladder || null,
      ladderLabel: '🪜 2-1 계단 다시 보기',
      say: sayFor(ctx),
      sayHint: true,
      column: opt.column !== false,
      onSolved: opt.onSolved || next
    };
    if (opt.speak !== undefined) o.speak = opt.speak;
    else if (p.speak !== undefined) o.speak = p.speak;
    if (opt.order) o.order = opt.order;
    box.appendChild(global.MathDrill.ask(ctx.ui, o));
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
            if (p && p.fact) box.appendChild(ui.el('div', 'ln-fact', p.fact));
            spec.renderProblem(box, p, next, extra, counter, ctx);
          }
        });
      }
    };
  }

  // 1관: 1m는 몇 cm?
  var lab1 = makeLab(1, {
    title: '1관 1m는 몇 cm?',
    icon: '📏',
    sub: '100cm = 1m',
    guide: '10cm 막대를 모아 1m가 몇 cm인지 알아봐요.',
    algo: ['10cm 막대 10개는 100cm예요', '100cm는 1m와 같아요'],
    whyTitle: '1m는 얼마만큼일까요?',
    whyBody: '10cm 막대를 10개 이으면 100cm가 돼요. 100cm를 1m라고 써요.',
    renderProblem: function (box, p, next, extra, counter, ctx) {
      var ui = ctx.ui;
      if (p.kind === 'ten-sticks') {
        box.appendChild(ui.guide('막대를 더 놓아 10개를 만들어요'));
        var btnRow = ui.el('div', 'mx-btn-row');
        var st = DRAW.sticks(p.start, {
          onMerged: function () {
            if (btnRow.parentNode === box) box.removeChild(btnRow);
            askWrap(box, ctx, p, extra, counter, next, {
              hint: '10cm 막대 10개가 1m가 되었어요.',
              ladder: LADDER1
            });
          }
        });
        var addBtn = ui.button('＋ 10cm', 'mx-btn primary', function () {
          if (st.busy()) return;
          st.add();
        });
        btnRow.appendChild(addBtn);
        box.appendChild(st.el);
        box.appendChild(btnRow);
        return;
      }
      askWrap(box, ctx, p, extra, counter, next, {
        hint: '1m는 100cm예요.',
        ladder: LADDER1
      });
    }
  });

  // 2관: 줄자로 재기
  var lab2 = makeLab(2, {
    title: '2관 줄자로 재기',
    icon: '📐',
    sub: '눈금 읽기',
    guide: '전체 줄자와 돋보기 눈금을 보고 길이를 읽어요.',
    algo: ['100cm가 넘으면 1m로 읽어요', '돋보기에서 1cm 눈금을 세어요'],
    whyTitle: '줄자 읽는 법',
    whyBody: '100cm는 1m예요. 100보다 큰 길이는 몇 m 몇 cm로 읽을 수 있어요.',
    renderProblem: function (box, p, next, extra, counter, ctx) {
      box.appendChild(DRAW.tape({ len: p.len, max: p.max }).el);
      askWrap(box, ctx, p, extra, counter, next, {
        hint: '돋보기의 10cm 눈금과 ▼ 끝을 봐요.',
        ladder: LADDER2
      });
    }
  });

  // 3관: m와 cm 바꾸기
  var lab3 = makeLab(3, {
    title: '3관 m와 cm 바꾸기',
    icon: '🔁',
    sub: '바꾸기·비교',
    guide: '몇 cm와 몇 m 몇 cm를 서로 바꾸고 길이를 비교해요.',
    algo: ['100cm는 1m로 바꿔요', '단위를 같게 만든 뒤 비교해요'],
    whyTitle: '단위 바꾸기와 비교',
    whyBody: '2m 5cm는 205cm예요. 모두 cm로 바꾸어 보면 어느 쪽이 긴지 쉬워요.',
    renderProblem: function (box, p, next, extra, counter, ctx) {
      if (p.kind === 'compare') {
        var raw = CORE.wrongChoices(p), wrongs = [], i;
        for (i = 0; i < raw.length; i += 1) {
          wrongs.push({ token: CMP_MAP[raw[i].text] || raw[i].text, mistake: raw[i].mistake });
        }
        askWrap(box, ctx, p, extra, counter, next, {
          question: p.question,
          speak: p.speak,
          answer: CMP_MAP[p.answerText],
          wrongs: wrongs,
          order: CMP_ORDER,
          column: true,
          hint: '둘 다 cm로 바꾸어 비교해 봐요.'
        });
        return;
      }
      askWrap(box, ctx, p, extra, counter, next, {
        hint: '100cm가 1m라는 걸 떠올려 봐요.'
      });
    }
  });

  // 4관 길이 표: 연산 기호 칸 + m 칸 + cm 칸 (머리줄 + a + b + 답 빈칸)
  function lengthTable(ui, a, b, op) {
    var sa = CORE.split(a);
    var sb = CORE.split(b);
    var sign = op === '-' ? '−' : '+';
    var table = ui.el('div', 'ln-table');

    function addRow(cls, opText, mText, cmText, blank) {
      var row = ui.el('div', cls ? 'ln-table-row ' + cls : 'ln-table-row');
      var cellCls = blank ? 'ln-table-cell is-blank' : 'ln-table-cell';
      row.appendChild(ui.el('span', 'ln-table-op', opText));
      row.appendChild(ui.el('span', cellCls, mText));
      row.appendChild(ui.el('span', cellCls, cmText));
      table.appendChild(row);
    }

    addRow('', '', 'm', 'cm', false);
    addRow('', '', sa.m + 'm', sa.cm + 'cm', false);
    addRow('', sign, sb.m + 'm', sb.cm + 'cm', false);
    addRow('is-ans', '', '?', '?', true);
    return table;
  }

  // 4관: 길이의 합과 차
  var lab4 = makeLab(4, {
    title: '4관 길이의 합과 차',
    icon: '➕',
    sub: '합과 차',
    guide: 'm는 m끼리, cm는 cm끼리 더하고 빼 봐요.',
    algo: ['m는 m끼리 계산해요', 'cm는 cm끼리 계산해요'],
    whyTitle: '길이의 합과 차',
    whyBody: '같은 단위끼리 모아서 계산해요. m는 m끼리, cm는 cm끼리 따로 계산하면 돼요.',
    renderProblem: function (box, p, next, extra, counter, ctx) {
      var op = p.kind === 'sub' ? '-' : (p.kind === 'word' ? p.op : '+');
      box.appendChild(lengthTable(ctx.ui, p.a, p.b, op));
      askWrap(box, ctx, p, extra, counter, next, {
        hint: 'm는 m끼리, cm는 cm끼리 계산해요.'
      });
    }
  });

  // 5관: 길이 어림하기
  var lab5 = makeLab(5, {
    title: '5관 길이 어림하기',
    icon: '🙆',
    sub: '단위·어림',
    guide: '알맞은 단위를 고르고, 몸이나 눈짐작으로 길이를 어림해요.',
    algo: ['양팔을 벌린 길이는 약 1m예요', '실제 길이에 가장 가까운 어림을 찾아요'],
    whyTitle: '길이 어림하기',
    whyBody: '양팔을 벌린 길이가 약 1m인 것을 알면 물건 길이를 쉽게 어림할 수 있어요.',
    renderProblem: function (box, p, next, extra, counter, ctx) {
      var ui = ctx.ui, i;
      if (p.kind === 'unit-pick') {
        askWrap(box, ctx, p, extra, counter, next, {
          hint: '물건이 1m보다 짧은지 긴지 떠올려 봐요.'
        });
        return;
      }
      if (p.kind === 'body-ruler') {
        var arms = ui.el('div', 'ln-arms');
        for (i = 0; i < p.n; i += 1) arms.appendChild(ui.el('span', '', '🙆'));
        box.appendChild(arms);
        askWrap(box, ctx, p, extra, counter, next, {
          hint: '양팔 한 번이 약 1m예요.'
        });
        return;
      }
      var pins = [{ len: p.real, label: '⭐' }];
      var legend = ui.el('div', 'ln-pin-legend');
      for (i = 0; i < p.guesses.length; i += 1) {
        pins.push({ len: p.guesses[i].len, label: p.guesses[i].emoji });
        legend.appendChild(ui.el('div', '', p.guesses[i].emoji + ' 약 ' + CORE.fmt(p.guesses[i].len)));
      }
      box.appendChild(DRAW.tape({ zoom: false, max: 300, pins: pins }).el);
      box.appendChild(legend);
      askWrap(box, ctx, p, extra, counter, next, {
        order: CLOSEST_ORDER,
        column: true,
        hint: '⭐ 깃발과 가장 가까운 깃발을 찾아 봐요.'
      });
    }
  });

  // 6관: 🎀 리본 가게 (자유 관)
  var lab6 = {
    title: '6관 🎀 리본 가게',
    icon: '🎀',
    sub: '길이 만들기',
    render: function (container, ctx) {
      var ui = ctx.ui;
      var say = sayFor(ctx);
      var counter = (global.MathDrill && typeof global.MathDrill.counter === 'function')
        ? global.MathDrill.counter(KEY, { perReward: 6 })
        : { add: function () {}, view: function () { return ui.el('span', 'mx-drill-count', ''); } };

      function makeTracker() {
        if (global.MathDrill && typeof global.MathDrill.track === 'function') {
          return global.MathDrill.track(KEY, 'ribbon');
        }
        return { wrong: function () {}, done: function () {} };
      }

      var card = ui.card('6관 🎀 리본 가게');
      card.appendChild(ui.guide('손님이 주문한 길이만큼 리본을 늘려서 잘라 주세요!'));
      card.appendChild(global.MathDrill.algo(ui, ['1m와 10cm 버튼으로 길이를 맞춰요', '길이가 맞으면 자르기 버튼을 눌러요']));
      card.appendChild(global.MathDrill.why(ui, '리본 길이 만들기', '1m는 100cm예요. 1m 40cm는 1m를 1번, 10cm를 4번 누르면 돼요.'));
      var area = ui.el('div', 'tw-area');
      card.appendChild(area);
      container.appendChild(card);

      var served = 0;
      var rb = null;
      var stack = [];
      var locked = false;
      var tracker = makeTracker();
      var hasNext = typeof ctx.hasNext === 'function' && ctx.hasNext() && typeof ctx.goNext === 'function';

      var countEl = ui.el('div', 'mx-quiz-counter', '🎀 만든 리본 0개');
      var orderEl = ui.el('div', 'mx-expr', '');
      var rib = DRAW.ribbon({ max: 400 });
      var btns = ui.el('div', 'ln-ribbon-btns');
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

      function updateUndo() {
        btnUndo.disabled = locked || stack.length === 0;
      }

      function press(code) {
        if (locked || !rb) return;
        var cur = rib.get();
        var nxt = CORE.ribbonPress(cur, code);
        if (nxt === cur) return;
        stack.push(cur);
        rib.set(nxt);
        updateUndo();
      }

      var btnM = ui.button('＋ 1m', 'mx-btn', function () { press('m'); });
      var btnT = ui.button('＋ 10cm', 'mx-btn', function () { press('t'); });
      var btnUndo = ui.button('↩ 한 번 되돌리기', 'mx-btn', function () {
        if (locked || stack.length === 0) return;
        rib.set(stack.pop());
        updateUndo();
      });
      var btnCut = ui.button('✂️ 자르기', 'mx-btn primary', function () {
        if (locked || !rb) return;
        var fb = CORE.ribbonFeedback(rib.get(), rb.target);
        if (fb.ok) {
          locked = true;
          btnM.disabled = true;
          btnT.disabled = true;
          btnCut.disabled = true;
          updateUndo();
          ctx.praise();
          ui.hint(hintEl, '✨ ' + fb.text);
          say(fb.speak);
          tracker.done();
          served += 1;
          countEl.textContent = '🎀 만든 리본 ' + served + '개';
          counter.add();
          counterWrap.replaceChildren(counter.view());
          if (served >= 3) {
            var doneNow = typeof ctx.isDone === 'function' ? ctx.isDone() : false;
            if (!doneNow && typeof ctx.complete === 'function') ctx.complete();
            if (hasNext) nextWrap.hidden = false;
          }
          setTimeout(function () {
            if (!area.isConnected) return;
            nextCustomer();
          }, 1000);
        } else {
          ctx.encourage();
          tracker.wrong(rib.get());
          ui.hint(hintEl, '💡 ' + fb.text);
          say(fb.speak);
        }
      });

      btns.appendChild(btnM);
      btns.appendChild(btnT);
      btns.appendChild(btnUndo);
      btns.appendChild(btnCut);

      area.appendChild(countEl);
      area.appendChild(orderEl);
      area.appendChild(rib.el);
      area.appendChild(btns);
      area.appendChild(hintEl);
      area.appendChild(counterWrap);
      area.appendChild(nextWrap);

      function nextCustomer() {
        rb = CORE.makeRibbon(Math.random);
        stack = [];
        locked = false;
        tracker = makeTracker();
        rib.set(0);
        btnM.disabled = false;
        btnT.disabled = false;
        btnCut.disabled = false;
        updateUndo();
        orderEl.textContent = rb.text;
        ui.hint(hintEl, '');
        say(rb.speak);
      }

      nextCustomer();
    }
  };

  // 7관: 🎯 길이 빙고
  var lab7 = {
    title: '7관 🎯 길이 빙고',
    icon: '🎯',
    sub: '9칸 빙고',
    render: function (container, ctx) {
      var ui = ctx.ui;
      var card = ui.card('7관 🎯 길이 빙고');
      card.appendChild(ui.guide('길이를 판에 놓고, 들리는 문제의 답을 터뜨려요!'));
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
        title: '🎯 길이 빙고',
        makeBingo: function () { return CORE.makeBingo(Math.random); },
        prefix: KEY,
        counterKey: KEY,
        perReward: 6,
        labels: {
          place: '길이를 골라 내 판에 놓아요',
          pickFirst: '먼저 아래 길이를 골라요'
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
        unit: '3. 길이 재기',
        title: '퀴즈 배틀',
        intro: '퀴즈 배틀이에요. 천천히 들어 보고 골라 볼까요?',
        sayQuestion: true,
        speakText: CORE.speakText
      })
    });
  }

  global.LengthMLabs = { mount: mount };

  if (global.document && global.document.readyState === 'loading') {
    global.document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})(typeof window !== 'undefined' ? window : globalThis);
