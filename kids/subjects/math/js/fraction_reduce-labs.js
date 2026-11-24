// 초등 5-1 수학 4단원 약분과 통분 탐험관 (1~7관 + 퀴즈 배틀 마운트)
(function (global) {
  'use strict';

  var Draw = global.Frac5Draw;
  var FRC = global.FracReduceCore;
  var FC = global.FractionCore;

  function J(t, type) {
    return global.MathExplorer && global.MathExplorer.josaFrac ? global.MathExplorer.josaFrac(t, type) : String(t);
  }

  function josaNum(n, type) {
    return global.MathExplorer && global.MathExplorer.josa ? global.MathExplorer.josa(String(n), type) : String(n);
  }

  function ira(word) {
    return global.MathExplorer && global.MathExplorer.hasBatchim && global.MathExplorer.hasBatchim(String(word))
      ? '이라서' : '라서';
  }

  var BASE_HINTS = {
    'add-same': '같은 수를 곱해야 크기가 같아요. 막대를 쪼개 봐요.',
    'add-diff': '분모에 곱한 수를 분자에도 똑같이 곱해요.',
    'denom-only': '분모에 곱한 수를 분자에도 곱해요.',
    'subtract': '약분은 빼기가 아니라 같은 수로 나누기예요.',
    'num-only': '분자와 분모를 둘 다 나눠요.',
    'den-only': '분자와 분모를 둘 다 나눠요.',
    'not-common': '둘 다 나누어떨어지는 수를 찾아요.',
    'half-reduced': '한 번 더 나눌 수 있어요. 아래 나누기 버튼으로 끝까지 나눠 봐요.',
    'small-num': '분자가 작아도 같은 수로 나누어떨어지면 기약분수가 아니에요.',
    'denom-swap': '분모에 곱한 수를 분자에도 곱해요.',
    'denom-sum': '공통분모는 두 분모의 배수예요.',
    'bigger-denom': '통분해서 분자를 비교해 봐요. 분모가 크면 조각이 더 작아요.',
    'num-only-compare': '분모가 다르면 먼저 통분해요.',
    'equal-wrong': '통분한 두 분자가 달라요. 어느 쪽이 큰지 봐요.',
    'concat': '분모가 10이나 100이 되게 바꾼 뒤 분자를 소수로 읽어요.',
    'drop-zero': '분모가 100이면 소수 두 자리예요. 소수 첫째 자리에 0을 써요.',
    'shift-place': '분모가 100인 진분수는 1보다 작아요. 소수점 자리를 다시 봐요.',
    'nudge': '막대를 다시 보며 차근차근 세어 봐요.'
  };

  var LADDER2 = {
    title: '🪜 공약수',
    body: '두 수를 둘 다 나누어떨어지게 하는 수를 공약수라고 해요. 12와 18은 둘 다 2, 3, 6으로 나누어떨어져요.',
    question: {
      question: '12와 18을 둘 다 나누어떨어지게 하는 수는?',
      choices: ['6', '4', '5'],
      answer: 0,
      explain: '12 ÷ 6 = 2, 18 ÷ 6 = 3으로 둘 다 나누어떨어져요.'
    }
  };

  var LADDER4 = {
    title: '🪜 배수',
    body: '어떤 수에 1, 2, 3…을 곱한 수를 배수라고 해요. 4의 배수는 4, 8, 12, 16…이에요.',
    question: {
      question: '4의 배수인 것은?',
      choices: ['12', '10', '14'],
      answer: 0,
      explain: '4 × 3 = 12이므로 12는 4의 배수예요.'
    }
  };

  function copyHints(extra) {
    var out = {};
    var k;
    for (k in BASE_HINTS) {
      if (Object.prototype.hasOwnProperty.call(BASE_HINTS, k)) out[k] = BASE_HINTS[k];
    }
    if (extra) {
      for (k in extra) {
        if (Object.prototype.hasOwnProperty.call(extra, k)) out[k] = extra[k];
      }
    }
    return out;
  }

  function hintsForProblem(p) {
    if (p.kind === 'equiv-up') {
      var mult = p.target / p.a.d;
      return copyHints({
        'add-diff': '분모에 ' + josaNum(mult, 'eul') + ' 곱했으니 분자에도 ' + josaNum(mult, 'eul') + ' 곱해요.'
      });
    }
    if (p.kind === 'compare-same-num' || p.kind === 'compare-unlike') {
      if (p.answer === '=') {
        return copyHints({ 'equal-wrong': '통분하면 두 분수가 똑같아요.' });
      }
      return BASE_HINTS;
    }
    if (p.kind === 'compare-decimal') {
      return copyHints({
        'bigger-denom': '분수를 소수로 바꿔서 비교해요.',
        'num-only-compare': '분수를 소수로 바꿔서 비교해요.',
        'equal-wrong': p.answer === '='
          ? '분수를 소수로 바꾸면 두 수가 똑같아요.'
          : '분수를 소수로 바꿔서 어느 쪽이 큰지 봐요.'
      });
    }
    return BASE_HINTS;
  }

  // 덜 약분한 답(half-reduced)을 고르면 문제 상자 안에 나누기 디딤돌 줄을 한 번만 펼친다
  function makeStepstoneHandler(ui) {
    return function (text, wrongInfo, qBox) {
      if (!wrongInfo || wrongInfo.mistake !== 'half-reduced' || !wrongInfo.value) return;
      if (qBox.querySelector('.f5-stepstone')) return;
      var stepWrap = ui.el('div', 'f5-stepstone');
      var title = ui.el('p', 'f5-stepstone-title');
      ui.fill(title, '🪜 ' + J(FC.token(wrongInfo.value), 'eul') + ' 더 나눠 볼까요?');
      stepWrap.appendChild(title);
      stepWrap.appendChild(Draw.divideRow(wrongInfo.value, null, null, { fill: ui.fill }));
      qBox.appendChild(stepWrap);
    };
  }

  function askWrap(ui, box, p, extra, counter, ladder, onSolved, opt) {
    var askOpt = {
      question: opt.question,
      answer: opt.answer !== undefined ? opt.answer : p.answerText,
      wrongs: opt.wrongs || FRC.wrongChoices(p),
      hints: opt.hints || hintsForProblem(p),
      hint: opt.hint || '막대를 다시 보며 차근차근 생각해 봐요.',
      explain: opt.explain,
      prefix: 'frac5r',
      kind: p.kind,
      extra: extra,
      counter: counter,
      ladder: ladder || null,
      ladderLabel: ladder ? '🪜 약수와 배수 계단 보기' : undefined,
      order: opt.order,
      column: Boolean(opt.column),
      onWrong: opt.stepstone ? makeStepstoneHandler(ui) : undefined,
      onSolved: onSolved
    };
    box.appendChild(global.MathDrill.ask(ui, askOpt));
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
          counterKey: 'fracred',
          makeRound: spec.makeRound,
          renderProblem: function (box, p, next, extra, counter) {
            spec.renderProblem(ui, box, p, next, extra, counter);
          }
        });
      }
    };
  }

  // 1관: 크기가 같은 분수
  var lab1 = buildLab({
    title: '1관 크기가 같은 분수',
    icon: '🧩',
    sub: '같은 수 곱하기',
    guide: '막대를 똑같이 쪼개며 크기가 같은 분수를 찾아 보아요.',
    steps: ['분모에 곱한 수를 찾아요', '분자에도 같은 수를 곱해요'],
    whyTitle: '왜 크기가 같을까?',
    whyBody: '막대의 칠한 길이는 그대로인데 칸만 똑같이 쪼개면 분모와 분자가 같은 배로 늘어나요.',
    makeRound: function () { return FRC.makeRound(1, Math.random); },
    renderProblem: function (ui, box, p, next, extra, counter) {
      var aTok = FC.token(p.a);
      if (p.kind === 'equiv-split') {
        box.appendChild(global.MathDrill.expr(ui, aTok));
        var b = Draw.splitBar(p.a.d, p.a.n, 'blue');
        box.appendChild(b.el);
        var row = ui.el('div', 'f5-action-row');
        var ks = [2, 3, 4];
        var i;
        for (i = 0; i < ks.length; i += 1) {
          (function (k) {
            var btn = ui.button('칸을 ' + k + '조각씩', k === p.k ? 'mx-btn primary f5-action-btn' : 'mx-btn f5-action-btn', function () {
              if (btn.disabled) return;
              btn.disabled = true;
              b.resplit(k, function () {
                askWrap(ui, box, p, extra, counter, null, next, {
                  question: '칠한 부분을 분수로 나타내면?',
                  explain: J(aTok, 'eul') + ' ' + k + '조각씩 쪼개면 ' + J(p.answerText, 'ieyo') + '.'
                });
              });
            });
            btn.disabled = (k !== p.k);
            row.appendChild(btn);
          })(ks[i]);
        }
        box.appendChild(row);
        return;
      }
      var mult = p.target / p.a.d;
      box.appendChild(global.MathDrill.expr(ui, aTok + '  →  분모 ' + p.target));
      askWrap(ui, box, p, extra, counter, null, next, {
        question: J(aTok, 'gwa') + ' 크기가 같은 분수 중 분모가 ' + p.target + '인 것은?',
        explain: '분모와 분자에 ' + josaNum(mult, 'eul') + ' 곱하면 ' + J(p.answerText, 'ieyo') + '.'
      });
    }
  });

  // 2관: 약분하기
  var lab2 = buildLab({
    title: '2관 약분하기',
    icon: '✂️',
    sub: '공약수로 나누기',
    guide: '분자와 분모를 같은 수로 나누어 약분해 보아요.',
    steps: ['분자와 분모의 공약수를 찾아요', '분자와 분모를 같은 수로 나눠요'],
    whyTitle: '약분은 왜 할까?',
    whyBody: '칸을 같은 수로 합쳐도 칠한 길이는 그대로예요. 수가 작아져서 보기 쉬워져요.',
    makeRound: function () { return FRC.makeRound(2, Math.random); },
    renderProblem: function (ui, box, p, next, extra, counter) {
      var aTok = FC.token(p.a);
      if (p.kind === 'reduce-which') {
        box.appendChild(global.MathDrill.expr(ui, aTok));
        askWrap(ui, box, p, extra, counter, LADDER2, next, {
          question: J(aTok, 'eul') + ' 약분할 수 있는 수는?',
          explain: josaNum(p.a.n, 'gwa') + ' ' + p.a.d + ' 모두 ' + josaNum(p.answer, 'ro') + ' 나누어떨어져요.'
        });
        return;
      }
      box.appendChild(global.MathDrill.expr(ui, aTok + '  (÷' + p.k + ')'));
      var b = Draw.splitBar(p.a.d, p.a.n, 'blue');
      box.appendChild(b.el);
      askWrap(ui, box, p, extra, counter, LADDER2, function () {
        b.merge(p.k, next);
      }, {
        question: J(aTok, 'eul') + ' ' + josaNum(p.k, 'ro') + ' 약분하면?',
        explain: '분자와 분모를 ' + josaNum(p.k, 'ro') + ' 나누면 ' + J(p.answerText, 'ieyo') + '.'
      });
    }
  });

  // 3관: 기약분수
  var lab3 = buildLab({
    title: '3관 기약분수',
    icon: '💎',
    sub: '끝까지 나누기',
    guide: '더 나눌 수 없을 때까지 같은 수로 나눠 기약분수를 만들어요.',
    steps: ['2, 3, 5, 7 중 둘 다 나눠지는 수를 골라요', '더 나눌 수 없을 때까지 계속 나눠요', '더 못 나누면 기약분수 완성!'],
    whyTitle: '기약분수란?',
    whyBody: '분자와 분모의 공약수가 1뿐인 분수가 기약분수예요. 최대공약수로 한 번에 나누면 바로 끝나요.',
    makeRound: function () { return FRC.makeRound(3, Math.random); },
    renderProblem: function (ui, box, p, next, extra, counter) {
      if (p.kind === 'simplest-1' || p.kind === 'simplest-2') {
        var aTok = FC.token(p.a);
        var qEl = ui.el('p', 'mx-question');
        ui.fill(qEl, J(aTok, 'eul') + ' 기약분수로 만들어 봐요.');
        box.appendChild(qEl);
        var b = Draw.splitBar(p.a.d, p.a.n, 'blue');
        box.appendChild(b.el);
        box.appendChild(Draw.divideRow(p.a, function (cur, k) {
          b.merge(k);
        }, function () {
          if (extra && counter) counter.add();
          next();
        }, { fill: ui.fill }));
        return;
      }
      askWrap(ui, box, p, extra, counter, null, next, {
        question: '기약분수인 것은?',
        stepstone: true,
        explain: J(p.answerText, 'eun') + ' 1 말고는 더 나눌 수 있는 공약수가 없어서 기약분수예요.'
      });
    }
  });

  // 4관: 통분하기
  var lab4 = buildLab({
    title: '4관 통분하기',
    icon: '🤝',
    sub: '공통분모 찾기',
    guide: '큰 분모의 배수에서 공통분모를 찾고 두 분수를 통분해요.',
    steps: ['큰 분모의 배수를 차례로 세어요', '작은 분모로도 나누어떨어지는 첫 수가 공통분모예요', '분모에 곱한 수를 분자에도 곱해요'],
    whyTitle: '왜 통분할까?',
    whyBody: '분모가 다르면 조각 크기가 달라요. 공통분모로 맞추면 두 분수를 같은 크기의 조각으로 볼 수 있어요.',
    makeRound: function () { return FRC.makeRound(4, Math.random); },
    renderProblem: function (ui, box, p, next, extra, counter) {
      var aTok = FC.token(p.a);
      var bTok = FC.token(p.b);
      box.appendChild(global.MathDrill.expr(ui, aTok + '  ,  ' + bTok));
      var pb = Draw.pairBars(p.a, p.b);
      box.appendChild(pb.el);
      box.appendChild(Draw.multipleChips(p.a.d, p.b.d, function (commonD) {
        pb.resplitTo(commonD, function () {
          askWrap(ui, box, p, extra, counter, LADDER4, next, {
            question: '통분한 두 분수는?',
            column: true,
            explain: '공통분모 ' + josaNum(p.d, 'ro') + ' 통분하면 ' + FC.token(p.answer.a) + ', ' + J(FC.token(p.answer.b), 'ieyo') + '.'
          });
        });
      }, { fill: ui.fill }));
    }
  });

  // 5관: 분수의 크기 비교
  var lab5 = buildLab({
    title: '5관 분수의 크기 비교',
    icon: '⚖️',
    sub: '통분해서 비교',
    guide: '두 분수를 통분한 뒤 분자를 비교해 알맞은 기호를 골라요.',
    steps: ['두 분수를 통분해요', '분모가 같아지면 분자를 비교해요', '알맞은 기호를 골라요'],
    whyTitle: '통분해서 비교하기',
    whyBody: '분모가 같아지면 조각 크기가 같아요. 그래서 분자가 큰 분수가 더 커요.',
    makeRound: function () { return FRC.makeRound(5, Math.random); },
    renderProblem: function (ui, box, p, next, extra, counter) {
      var aTok = FC.token(p.a);
      var bTok = FC.token(p.b);
      box.appendChild(global.MathDrill.expr(ui, aTok + '  ○  ' + bTok));
      var pb = Draw.pairBars(p.a, p.b);
      box.appendChild(pb.el);
      var btn = ui.button('통분하기', 'mx-btn primary f5-action-btn', function () {
        if (btn.disabled) return;
        btn.disabled = true;
        pb.resplitTo(p.common.d, function () {
          var line = ui.el('p', 'f5-note');
          ui.fill(line, '통분하면  ' + FC.token(p.common.a) + '  ○  ' + FC.token(p.common.b));
          box.appendChild(line);
          var exp = p.answer === '='
            ? '통분하면 둘 다 ' + J(FC.token(p.common.a), 'ro') + ' 똑같아요.'
            : '통분하면 ' + FC.token(p.common.a) + ' ' + p.answer + ' ' + J(FC.token(p.common.b), 'ieyo') + '.';
          askWrap(ui, box, p, extra, counter, null, next, {
            question: aTok + ' ○ ' + bTok + ' 알맞은 기호는?',
            order: ['>', '<', '='],
            explain: exp
          });
        });
      });
      box.appendChild(btn);
    }
  });

  // 6관: 분수와 소수
  var lab6 = buildLab({
    title: '6관 분수와 소수',
    icon: '📏',
    sub: '분모를 10·100으로',
    guide: '분모를 10이나 100으로 만들어 소수로 나타내 보아요.',
    steps: ['분모가 10이나 100이 되게 곱해요', '10이면 소수 한 자리, 100이면 소수 두 자리로 써요'],
    whyTitle: '분수를 소수로 바꾸기',
    whyBody: '분모가 10이면 소수 한 자리, 분모가 100이면 소수 두 자리로 바로 나타낼 수 있어요.',
    makeRound: function () { return FRC.makeRound(6, Math.random); },
    renderProblem: function (ui, box, p, next, extra, counter) {
      var aTok = FC.token(p.a);
      if (p.kind === 'compare-decimal') {
        box.appendChild(global.MathDrill.expr(ui, p.dec + '  ○  ' + aTok));
        box.appendChild(Draw.decimalStrip(p.a, function (info) {
          var exp = p.answer === '='
            ? J(aTok, 'eun') + ' ' + info.text + ira(info.text) + ' 두 수가 같아요.'
            : J(aTok, 'eun') + ' ' + info.text + ira(info.text) + ' ' + p.dec + ' ' + p.answer + ' ' + J(aTok, 'ieyo') + '.';
          askWrap(ui, box, p, extra, counter, null, next, {
            question: p.dec + ' ○ ' + aTok + ' 알맞은 기호는?',
            order: ['>', '<', '='],
            explain: exp
          });
        }, { fill: ui.fill }));
        return;
      }
      box.appendChild(global.MathDrill.expr(ui, aTok));
      box.appendChild(Draw.decimalStrip(p.a, function () {
        askWrap(ui, box, p, extra, counter, null, next, {
          question: J(aTok, 'eul') + ' 소수로 나타내면?',
          explain: aTok + ' = ' + FC.token(p.dec.scaled) + ' = ' + josaNum(p.answerText, 'ieyo') + '.'
        });
      }, { fill: ui.fill, stopAtScaled: true }));
    }
  });

  // 7관: ⚡ 연습 마당 (그림·조작 없이 10문제 섞어 풀기)
  function renderMixedProblem(ui, box, p, next, extra, counter) {
    var k = p.kind;
    var aTok = p.a ? FC.token(p.a) : '';
    var bTok = p.b ? FC.token(p.b) : '';

    if (k === 'equiv-up') {
      var mult = p.target / p.a.d;
      box.appendChild(global.MathDrill.expr(ui, aTok + '  →  분모 ' + p.target));
      askWrap(ui, box, p, extra, counter, null, next, {
        question: J(aTok, 'gwa') + ' 크기가 같은 분수 중 분모가 ' + p.target + '인 것은?',
        explain: '분모와 분자에 ' + josaNum(mult, 'eul') + ' 곱하면 ' + J(p.answerText, 'ieyo') + '.'
      });
    } else if (k === 'reduce-by-2' || k === 'reduce-by-3') {
      box.appendChild(global.MathDrill.expr(ui, aTok + '  (÷' + p.k + ')'));
      askWrap(ui, box, p, extra, counter, null, next, {
        question: J(aTok, 'eul') + ' ' + josaNum(p.k, 'ro') + ' 약분하면?',
        explain: '분자와 분모를 ' + josaNum(p.k, 'ro') + ' 나누면 ' + J(p.answerText, 'ieyo') + '.'
      });
    } else if (k === 'reduce-which') {
      box.appendChild(global.MathDrill.expr(ui, aTok));
      askWrap(ui, box, p, extra, counter, null, next, {
        question: J(aTok, 'eul') + ' 약분할 수 있는 수는?',
        explain: josaNum(p.a.n, 'gwa') + ' ' + p.a.d + ' 모두 ' + josaNum(p.answer, 'ro') + ' 나누어떨어져요.'
      });
    } else if (k === 'simplest-choose') {
      box.appendChild(global.MathDrill.expr(ui, aTok));
      askWrap(ui, box, p, extra, counter, null, next, {
        question: J(aTok, 'eul') + ' 기약분수로 나타내면?',
        stepstone: true,
        explain: J(aTok, 'eul') + ' 더 나눌 수 없을 때까지 약분하면 ' + J(p.answerText, 'ieyo') + '.'
      });
    } else if (k === 'simplest-pick') {
      askWrap(ui, box, p, extra, counter, null, next, {
        question: '기약분수인 것은?',
        stepstone: true,
        explain: J(p.answerText, 'eun') + ' 1 말고는 더 나눌 수 있는 공약수가 없어요.'
      });
    } else if (k === 'common-multiple' || k === 'common-coprime' || k === 'common-lcm') {
      box.appendChild(global.MathDrill.expr(ui, aTok + '  ,  ' + bTok));
      askWrap(ui, box, p, extra, counter, null, next, {
        question: aTok + ', ' + J(bTok, 'eul') + ' 통분하면?',
        column: true,
        explain: '공통분모 ' + josaNum(p.d, 'ro') + ' 통분하면 ' + FC.token(p.answer.a) + ', ' + J(FC.token(p.answer.b), 'ieyo') + '.'
      });
    } else if (k === 'compare-same-num' || k === 'compare-unlike') {
      box.appendChild(global.MathDrill.expr(ui, aTok + '  ○  ' + bTok));
      var expCmp = p.answer === '='
        ? '통분하면 둘 다 ' + J(FC.token(p.common.a), 'ro') + ' 똑같아요.'
        : '통분하면 ' + FC.token(p.common.a) + ' ' + p.answer + ' ' + J(FC.token(p.common.b), 'ieyo') + '.';
      askWrap(ui, box, p, extra, counter, null, next, {
        question: aTok + ' ○ ' + bTok + ' 알맞은 기호는?',
        order: ['>', '<', '='],
        explain: expCmp
      });
    } else if (k === 'to-decimal-10' || k === 'to-decimal-100') {
      box.appendChild(global.MathDrill.expr(ui, aTok));
      askWrap(ui, box, p, extra, counter, null, next, {
        question: J(aTok, 'eul') + ' 소수로 나타내면?',
        explain: aTok + ' = ' + FC.token(p.dec.scaled) + ' = ' + josaNum(p.answerText, 'ieyo') + '.'
      });
    } else if (k === 'compare-decimal') {
      var decInfo = FRC.toDecimal(p.a);
      box.appendChild(global.MathDrill.expr(ui, p.dec + '  ○  ' + aTok));
      var expDec = p.answer === '='
        ? J(aTok, 'eun') + ' ' + decInfo.text + ira(decInfo.text) + ' 두 수가 같아요.'
        : J(aTok, 'eun') + ' ' + decInfo.text + ira(decInfo.text) + ' ' + p.dec + ' ' + p.answer + ' ' + J(aTok, 'ieyo') + '.';
      askWrap(ui, box, p, extra, counter, null, next, {
        question: p.dec + ' ○ ' + aTok + ' 알맞은 기호는?',
        order: ['>', '<', '='],
        explain: expDec
      });
    }
  }

  var lab7 = buildLab({
    title: '7관 ⚡ 연습 마당',
    icon: '⚡',
    sub: '섞어 풀기 10문제',
    guide: '10문제를 막대를 떠올리며 차근차근 풀어 보아요.',
    steps: ['문제를 끝까지 읽어요', '약분·통분·소수 방법을 떠올려요', '알맞은 답을 골라요'],
    whyTitle: '많이 풀수록 쉬워져요',
    whyBody: '같은 방법을 여러 번 쓰면 손에 익어요. 틀려도 괜찮아요, 다시 고르면 돼요.',
    makeRound: function () { return FRC.makeMixedRound(Math.random, 10); },
    renderProblem: renderMixedProblem
  });

  function mount() {
    global.MathExplorer.mount({
      key: 'fracred',
      fractions: true,
      labs: [lab1, lab2, lab3, lab4, lab5, lab6, lab7],
      quiz: global.MathExplorerQuiz.create({
        grade: '5-1',
        unit: '4. 약분과 통분',
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
