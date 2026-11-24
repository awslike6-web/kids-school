// 초등 5-1 수학 5단원 분모가 다른 분수의 덧셈과 뺄셈 탐험관 (1~7관 + 퀴즈 배틀 마운트)
(function (global) {
  'use strict';

  var Draw = global.Frac5Draw;
  var FUC = global.FracUnlikeCore;
  var FRC = global.FracReduceCore;
  var FC = global.FractionCore;

  function J(t, type) {
    return global.MathExplorer && global.MathExplorer.josaFrac ? global.MathExplorer.josaFrac(t, type) : String(t);
  }

  function josaNum(n, type) {
    return global.MathExplorer && global.MathExplorer.josa ? global.MathExplorer.josa(String(n), type) : String(n);
  }

  function praise() {
    if (typeof global.fairyPraise === 'function') {
      try { global.fairyPraise(); } catch (e) {}
    }
  }

  function opSign(op) {
    return op === '+' ? '+' : '−';
  }

  function fracPart(f) {
    return { w: 0, n: f.n, d: f.d };
  }

  function exprText(a, op, b) {
    return FC.token(a) + '  ' + opSign(op) + '  ' + FC.token(b);
  }

  function questionText(p) {
    if (p.a.w > 0 || p.b.w > 0 || p.answer.w > 0) {
      return '간단히(기약분수로) 나타내면?';
    }
    return '기약분수로 나타내면?';
  }

  function explainFor(p) {
    var caTok = FC.token(p.common.a);
    var cbTok = FC.token(p.common.b);
    var rawTok = FC.token(p.raw);
    var ansTok = p.answerText;
    var sign = opSign(p.op);
    if (p.split) {
      return caTok + ' − ' + cbTok + ' = ' + FC.token(p.split) + ' − ' + cbTok + ' = ' + J(ansTok, 'ieyo') + '.';
    }
    if (rawTok !== ansTok) {
      return caTok + ' ' + sign + ' ' + cbTok + ' = ' + rawTok + ', 약분하면 ' + J(ansTok, 'ieyo') + '.';
    }
    return caTok + ' ' + sign + ' ' + cbTok + ' = ' + J(ansTok, 'ieyo') + '.';
  }

  function hintsForProblem(p) {
    var d = p.common.d;
    var g = FRC.gcd(p.raw.n, p.raw.d);
    var rawFrac = p.raw.n + '/' + p.raw.d;
    var caFrac = p.common.a.n + '/' + d;
    var cbFrac = p.common.b.n + '/' + d;
    var addAcrossMsg = p.op === '+'
      ? '분모가 다르면 조각 크기가 달라서 바로 못 더해요. 먼저 통분해요.'
      : '분모가 다르면 조각 크기가 달라서 바로 못 빼요. 먼저 통분해요.';
    var notReducedMsg = g > 1
      ? ('기약분수로 나타내야 해요. ' + J(rawFrac, 'eun') + ' ' + josaNum(g, 'ro') + ' 나눌 수 있어요.')
      : '기약분수로 나타내야 해요. 분자와 분모를 같은 수로 나눠 봐요.';
    return {
      'add-across': addAcrossMsg,
      'num-unscaled': '분모에 곱한 수를 분자에도 곱해요.',
      'not-reduced': notReducedMsg,
      'keep-improper': '꽉 찬 막대 하나는 1이에요.',
      'carry-lost': J(d + '/' + d, 'eun') + ' 1이라서 자연수가 하나 늘어요.',
      'reverse-sub': caFrac + '에서 ' + J(cbFrac, 'eun') + ' 뺄 수 없어요. 자연수에서 1을 빌려 와요.',
      'borrow-ten': '1은 ' + d + '/' + d + ', ' + d + '조각이에요.',
      'borrow-kept': '1을 쪼개 썼으니 자연수가 하나 줄어요.',
      'nudge': '통분한 식을 다시 보며 차근차근 계산해 봐요.'
    };
  }

  var LADDER1 = {
    title: '🪜 통분',
    body: '분모가 다른 두 분수의 분모를 같게 만드는 것을 통분이라고 해요. 1/2과 1/3은 공통분모 6으로 통분하면 3/6과 2/6이 돼요.',
    question: {
      question: '1/2과 1/4을 통분하면?',
      choices: ['2/4, 1/4', '1/4, 1/4', '2/4, 2/4'],
      answer: 0,
      explain: '1/2의 분모와 분자에 2를 곱하면 2/4이므로 2/4, 1/4이에요.'
    }
  };

  var LADDER6 = {
    title: '🪜 1을 쪼개서 빼기',
    body: '자연수 1은 분모와 분자가 같은 분수로 쪼갤 수 있어요. 예를 들어 1 = 4/4이므로 1 − 1/4 = 4/4 − 1/4 = 3/4이에요.',
    question: {
      question: '1 − 1/4을 계산하면?',
      choices: ['3/4', '2/4', '1/4'],
      answer: 0,
      explain: '1은 4/4이므로 4/4 − 1/4 = 3/4이에요.'
    }
  };

  // 약분 안 한 답(not-reduced)을 고르면 문제 상자 안에 나누기 디딤돌 줄을 한 번만 펼친다
  function makeStepstoneHandler(ui) {
    return function (text, wrongInfo, qBox) {
      if (!wrongInfo || wrongInfo.mistake !== 'not-reduced' || !wrongInfo.value) return;
      if (qBox.querySelector('.f5-stepstone')) return;
      var fp = fracPart(wrongInfo.value);
      var stepWrap = ui.el('div', 'f5-stepstone');
      var title = ui.el('p', 'f5-stepstone-title');
      ui.fill(title, '🪜 ' + J(FC.token(fp), 'eul') + ' 더 나눠 볼까요?');
      stepWrap.appendChild(title);
      stepWrap.appendChild(Draw.divideRow(fp, null, null, { fill: ui.fill }));
      qBox.appendChild(stepWrap);
    };
  }

  function askWrap(ui, box, p, extra, counter, ladder, ladderLabel, onSolved) {
    var askOpt = {
      question: questionText(p),
      answer: p.answerText,
      wrongs: FUC.wrongChoices(p),
      hints: hintsForProblem(p),
      hint: '통분한 식을 다시 보며 차근차근 계산해 봐요.',
      explain: explainFor(p),
      prefix: 'frac5u',
      kind: p.kind,
      extra: extra,
      counter: counter,
      ladder: ladder || null,
      ladderLabel: ladder ? ladderLabel : undefined,
      onWrong: makeStepstoneHandler(ui),
      onSolved: onSolved
    };
    box.appendChild(global.MathDrill.ask(ui, askOpt));
  }

  // 자연수 배지 + 분수 막대 쌍 구성 (자연수 없는 진분수는 pairBars만)
  function buildBarsView(ui, p) {
    var pb = Draw.pairBars(fracPart(p.a), fracPart(p.b));
    if (p.a.w === 0 && p.b.w === 0) {
      return {
        el: pb.el,
        resplitTo: pb.resplitTo,
        applyBorrow: function () {}
      };
    }
    var wrap = ui.el('div', 'f5-pair');

    var topRow = ui.el('div', 'f5-mixed-row');
    var topBadge = Draw.wholeBadge(p.a.w);
    var topStack = ui.el('div', 'f5-mixed-bars');
    topStack.appendChild(pb.top.el);
    topRow.appendChild(topBadge);
    topRow.appendChild(topStack);

    var botRow = ui.el('div', 'f5-mixed-row');
    var botBadge = Draw.wholeBadge(p.b.w);
    var botStack = ui.el('div', 'f5-mixed-bars');
    botStack.appendChild(pb.bottom.el);
    botRow.appendChild(botBadge);
    botRow.appendChild(botStack);

    wrap.appendChild(topRow);
    wrap.appendChild(botRow);

    function applyBorrow(splitFrac) {
      topBadge.textContent = '자연수 ' + splitFrac.w;
      topBadge.classList.add('is-pop');
      var fullBar = Draw.splitBar(splitFrac.d, splitFrac.d, 'blue');
      topStack.insertBefore(fullBar.el, pb.top.el);
    }

    return {
      el: wrap,
      resplitTo: pb.resplitTo,
      applyBorrow: applyBorrow
    };
  }

  // 정답 뒤 확인 장면: 합친/남은 막대(raw) + 받아올림 배지 강조 + 약분 merge 자동 재생
  function showConfirmScene(ui, box, p, next) {
    var wrap = ui.el('div', 'f5-confirm');
    var label = ui.el('p', 'f5-confirm-label');
    var carried = (p.op === '+' && p.raw.w > p.a.w + p.b.w);
    var msg;
    if (carried) {
      msg = '✨ 꽉 찬 막대 1이 자연수로 올라가요!';
    } else if (p.op === '+') {
      msg = '✨ 합친 막대를 확인해 봐요';
    } else {
      msg = '✨ 남은 막대를 확인해 봐요';
    }
    ui.fill(label, msg);
    wrap.appendChild(label);

    var resBar = Draw.splitBar(p.raw.d, p.raw.n, 'blue');
    if (p.raw.w > 0) {
      var row = ui.el('div', 'f5-mixed-row');
      var badge = Draw.wholeBadge(p.raw.w);
      if (carried) badge.classList.add('is-pop');
      var stack = ui.el('div', 'f5-mixed-bars');
      stack.appendChild(resBar.el);
      row.appendChild(badge);
      row.appendChild(stack);
      wrap.appendChild(row);
    } else {
      wrap.appendChild(resBar.el);
    }
    box.appendChild(wrap);

    var g = p.raw.d / p.answer.d;
    if (g > 1) {
      global.setTimeout(function () {
        resBar.merge(g, next);
      }, 400);
    } else {
      global.setTimeout(next, 450);
    }
  }

  // 1~6관 공통 문제 렌더러
  function renderGuidedProblem(ui, box, p, next, extra, counter, ladder, ladderLabel) {
    box.appendChild(global.MathDrill.expr(ui, exprText(p.a, p.op, p.b)));
    var bars = buildBarsView(ui, p);
    box.appendChild(bars.el);

    function openQuestion() {
      askWrap(ui, box, p, extra, counter, ladder, ladderLabel, function () {
        showConfirmScene(ui, box, p, next);
      });
    }

    var commonBtn = ui.button('통분하기', 'mx-btn primary f5-action-btn', function () {
      if (commonBtn.disabled) return;
      commonBtn.disabled = true;
      praise();
      bars.resplitTo(p.common.d, function () {
        var note = ui.el('p', 'f5-note');
        ui.fill(note, '통분하면  ' + exprText(p.common.a, p.op, p.common.b));
        box.appendChild(note);

        if (p.split) {
          var splitBtn = ui.button('1 쪼개기', 'mx-btn primary f5-action-btn', function () {
            if (splitBtn.disabled) return;
            splitBtn.disabled = true;
            praise();
            bars.applyBorrow(p.split);
            ui.fill(note, '1을 쪼개면  ' + exprText(p.split, p.op, p.common.b));
            openQuestion();
          });
          box.appendChild(splitBtn);
          return;
        }
        openQuestion();
      });
    });
    box.appendChild(commonBtn);
  }

  // 관 공통 틀 생성기
  function buildLab(spec) {
    return {
      title: spec.title,
      icon: spec.icon,
      sub: spec.sub,
      render: function (container, ctx) {
        var ui = ctx.ui;
        var card = ui.card(spec.title);
        card.appendChild(ui.guide(spec.guide));
        card.appendChild(global.MathDrill.algo(ui, spec.steps));
        card.appendChild(global.MathDrill.why(ui, spec.whyTitle, spec.whyBody));
        var area = ui.el('div', 'f5-area');
        card.appendChild(area);
        container.appendChild(card);
        global.MathDrill.rounds(area, ctx, {
          counterKey: 'fracunl',
          makeRound: spec.makeRound,
          renderProblem: function (box, p, next, extra, counter) {
            spec.renderProblem(ui, box, p, next, extra, counter);
          }
        });
      }
    };
  }

  // 1관: 진분수 더하기
  var lab1 = buildLab({
    title: '1관 진분수 더하기',
    icon: '➕',
    sub: '통분 → 분자끼리',
    guide: '분모가 다른 두 진분수를 통분해서 더해 보아요.',
    steps: ['통분해요', '분자끼리 더해요', '약분할 수 있으면 약분해요'],
    whyTitle: '왜 통분해서 더할까?',
    whyBody: '분모가 다르면 조각 크기가 달라서 바로 더할 수 없어요. 통분해서 조각 크기를 같게 만든 뒤 분자끼리 더해요.',
    makeRound: function () { return FUC.makeRound(1, Math.random); },
    renderProblem: function (ui, box, p, next, extra, counter) {
      renderGuidedProblem(ui, box, p, next, extra, counter, LADDER1, '🪜 약분과 통분 계단 보기');
    }
  });

  // 2관: 1을 넘는 합
  var lab2 = buildLab({
    title: '2관 1을 넘는 합',
    icon: '📦',
    sub: '가분수 → 대분수',
    guide: '합이 1을 넘으면 꽉 찬 막대 하나를 자연수로 옮겨 나타내요.',
    steps: ['통분해요', '분자끼리 더해요', '약분할 수 있으면 약분해요', '1이 넘으면 자연수로 옮겨요'],
    whyTitle: '1이 넘으면 왜 자연수로?',
    whyBody: '분자가 분모보다 커지면 꽉 찬 막대 하나(1)가 생겨요. 꽉 찬 막대는 자연수로 옮기고 남은 조각을 분수로 써요.',
    makeRound: function () { return FUC.makeRound(2, Math.random); },
    renderProblem: function (ui, box, p, next, extra, counter) {
      renderGuidedProblem(ui, box, p, next, extra, counter, null, null);
    }
  });

  // 3관: 대분수 더하기
  var lab3 = buildLab({
    title: '3관 대분수 더하기',
    icon: '🧱',
    sub: '자연수·분수 따로',
    guide: '자연수는 자연수끼리, 분수는 통분해서 분수끼리 더해 보아요.',
    steps: ['자연수끼리 더해요', '분수끼리 통분해서 더해요', '1이 넘으면 자연수로 옮겨요'],
    whyTitle: '자연수와 분수를 따로 더해요',
    whyBody: '자연수는 자연수끼리, 분수는 통분해서 분수끼리 더하면 계산이 간단해져요. 분수 합이 1을 넘으면 자연수에 1을 보태요.',
    makeRound: function () { return FUC.makeRound(3, Math.random); },
    renderProblem: function (ui, box, p, next, extra, counter) {
      renderGuidedProblem(ui, box, p, next, extra, counter, null, null);
    }
  });

  // 4관: 진분수 빼기
  var lab4 = buildLab({
    title: '4관 진분수 빼기',
    icon: '➖',
    sub: '통분 → 분자끼리 빼기',
    guide: '분모가 다른 두 진분수를 통분해서 빼 보아요.',
    steps: ['통분해요', '분자끼리 빼요', '약분할 수 있으면 약분해요'],
    whyTitle: '왜 통분해서 뺄까?',
    whyBody: '분모가 다르면 조각 크기가 달라서 바로 뺄 수 없어요. 통분해서 조각 크기를 같게 만든 뒤 분자끼리 빼요.',
    makeRound: function () { return FUC.makeRound(4, Math.random); },
    renderProblem: function (ui, box, p, next, extra, counter) {
      renderGuidedProblem(ui, box, p, next, extra, counter, null, null);
    }
  });

  // 5관: 대분수 빼기 (받아내림 없음)
  var lab5 = buildLab({
    title: '5관 대분수 빼기',
    icon: '✂️',
    sub: '받아내림 없음',
    guide: '자연수는 자연수끼리, 분수는 통분해서 분수끼리 빼 보아요.',
    steps: ['자연수끼리 빼요', '분수끼리 통분해서 빼요', '약분할 수 있으면 약분해요'],
    whyTitle: '자연수끼리, 분수끼리 빼요',
    whyBody: '통분한 앞 분수가 뒤 분수보다 크면 자연수는 자연수끼리, 분수는 분수끼리 바로 뺄 수 있어요.',
    makeRound: function () { return FUC.makeRound(5, Math.random); },
    renderProblem: function (ui, box, p, next, extra, counter) {
      renderGuidedProblem(ui, box, p, next, extra, counter, null, null);
    }
  });

  // 6관: 받아내림 있는 빼기
  var lab6 = buildLab({
    title: '6관 받아내림 있는 빼기',
    icon: '🪓',
    sub: '통분 뒤 1 쪼개기',
    guide: '통분한 뒤 분수끼리 못 빼면 자연수 1을 쪼개 분수에 보태요.',
    steps: ['통분해요', '분수끼리 뺄 수 있나 봐요', '못 빼면 자연수 1을 쪼개 보태요'],
    whyTitle: '왜 자연수 1을 쪼갤까?',
    whyBody: '앞 분수가 뒤 분수보다 작으면 바로 뺄 수 없어요. 자연수 1을 공통분모만큼의 조각으로 쪼개 분수에 보태면 뺄 수 있어요.',
    makeRound: function () { return FUC.makeRound(6, Math.random); },
    renderProblem: function (ui, box, p, next, extra, counter) {
      renderGuidedProblem(ui, box, p, next, extra, counter, LADDER6, '🪜 4-2 1 쪼개기 계단 보기');
    }
  });

  // 7관: ⚡ 연습 마당 (그림·조작 없이 10문제 섞어 풀기)
  var lab7 = buildLab({
    title: '7관 ⚡ 연습 마당',
    icon: '⚡',
    sub: '섞어 풀기 10문제',
    guide: '10문제를 막대를 떠올리며 차근차근 풀어 보아요.',
    steps: ['분모가 다르면 먼저 통분해요', '덧셈·뺄셈과 받아올림·받아내림을 확인해요', '약분해서 기약분수로 답을 골라요'],
    whyTitle: '많이 풀수록 쉬워져요',
    whyBody: '1~6관에서 배운 계산을 섞어 풀면 손에 익어요. 틀려도 괜찮아요, 힌트를 보고 다시 고르면 돼요.',
    makeRound: function () { return FUC.makeMixedRound(Math.random, 10); },
    renderProblem: function (ui, box, p, next, extra, counter) {
      box.appendChild(global.MathDrill.expr(ui, exprText(p.a, p.op, p.b)));
      askWrap(ui, box, p, extra, counter, null, null, next);
    }
  });

  function mount() {
    global.MathExplorer.mount({
      key: 'fracunl',
      fractions: true,
      labs: [lab1, lab2, lab3, lab4, lab5, lab6, lab7],
      quiz: global.MathExplorerQuiz.create({
        grade: '5-1',
        unit: '5. 분수의 덧셈과 뺄셈',
        title: '퀴즈 배틀',
        intro: '퀴즈 배틀이에요. 천천히 읽고 골라 볼까요?'
      })
    });
  }

  if (global.document && global.document.readyState === 'loading') {
    global.document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})(typeof window !== 'undefined' ? window : globalThis);
