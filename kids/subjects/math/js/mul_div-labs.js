// 초등 4-1 수학 3단원 곱셈과 나눗셈 탐험관 (1~7관 + 퀴즈 배틀 마운트)
(function (global) {
  'use strict';

  function C() {
    return global.MulDivCore;
  }

  function D() {
    return global.MulDivDraw;
  }

  function josaNum(n, type) {
    return global.MathExplorer && global.MathExplorer.josa
      ? global.MathExplorer.josa(String(n), type)
      : String(n);
  }

  // 명세 §4-1 오개념별 힌트 글
  var BASE_HINTS = {
    'zero-lost': '40은 4 × 10이에요. 뗀 0을 붙여요.',
    'zero-extra': '뗀 0은 하나예요.',
    'carry-lost': '올림수를 더해요.',
    'next-times': '몇 번 곱하는지 다시 봐요(구구단 한 단 옆이에요).',
    'other-digit': '일의 자리 곱은 일의 자리 숫자를 곱해요(둘째 줄은 십의 자리).',
    'shift-lost': '24의 2는 20이에요. 325 × 20이라 0 자리를 비우고 한 칸 왼쪽부터예요.',
    'shift-lost-sum': '둘째 줄은 한 칸 왼쪽이에요. 같은 자리끼리 더해요.',
    'add-carry-lost': '같은 자리끼리 더하고 10이 넘으면 올려요.',
    'place-slip': '자리를 맞춰 다시 더해 봐요.',
    'quot-zero': '0을 같이 지웠으니 몫에는 0을 붙이지 않아요.',
    'rem-no-zero': '0을 지우고 나눴으니 나머지에는 0을 다시 붙여요.',
    'digit-low': '곱셈 줄을 봐요. 한 번 더 들어가요(나머지는 나누는 수보다 작아야 해요).',
    'rem-too-big': '곱셈 줄을 봐요. 한 번 더 들어가요(나머지는 나누는 수보다 작아야 해요).',
    'digit-high': '곱셈 줄을 봐요. 그 곱은 나누는 수보다 커요.',
    'over': '곱셈 줄을 봐요. 그 곱은 나누는 수보다 커요.',
    'q-first-digit': '7에는 23이 들어가지 않으니 앞 두 자리 75부터 봐요.',
    'sub-wrong': '빼기를 다시 해 봐요. 모자라면 윗자리에서 받아내려요.',
    'sub-reverse': '위의 수에서 아래 수를 빼요. 모자라면 받아내려요.',
    'check-minus': '나머지는 더해요.',
    'check-swap': '곱하는 건 몫이에요.',
    'fix': '판을 다시 보며 차근차근 계산해 봐요.'
  };

  // 🪜 계단 카드 (2관·3관·5관)
  var LADDER2 = {
    title: '🪜 한 칸 왼쪽',
    body: '24의 2는 20이라서 325 × 2가 아니라 325 × 20 = 6500이에요. 그래서 둘째 줄은 한 칸 왼쪽부터 써요.',
    question: {
      question: '325 × 24에서 둘째 줄(325 × 20)은 얼마인가요?',
      choices: ['6500', '650', '65'],
      answer: 0,
      explain: '24의 2는 20이므로 325 × 20 = 6500이에요.'
    }
  };

  var LADDER3 = {
    title: '🪜 나머지',
    body: '25 ÷ 6은 6 × 4 = 24까지 들어가고 1이 남아요. 25 ÷ 6 = 4 … 1로 써요. 나머지는 나누는 수보다 작아야 해요(나머지가 6 이상이면 한 번 더 나눌 수 있어요).',
    question: {
      question: '25 ÷ 6의 몫과 나머지는?',
      choices: ['몫 4, 나머지 1', '몫 3, 나머지 7', '몫 4, 나머지 2'],
      answer: 0,
      explain: '6 × 4 = 24이고 25 − 24 = 1이라서 몫 4, 나머지 1이에요.'
    }
  };

  var LADDER5 = {
    title: '🪜 검산',
    body: '나눗셈이 맞는지 확인하는 식은 "나누는 수 × 몫 + 나머지 = 나누어지는 수"예요. 25 ÷ 6 = 4 … 1이면 6 × 4 + 1 = 25로 확인해요.',
    question: {
      question: '25 ÷ 6 = 4 … 1이 맞는지 확인하는 식은?',
      choices: ['6 × 4 + 1 = 25', '6 × 4 − 1 = 25', '6 × 1 + 4 = 25'],
      answer: 0,
      explain: '나누는 수 6에 몫 4를 곱하고 나머지 1을 더하면 25가 돼요.'
    }
  };

  function mapWrongs(raw) {
    var out = [];
    var i;
    for (i = 0; i < raw.length; i += 1) {
      out.push({
        token: C().label(raw[i].value),
        mistake: raw[i].mistake
      });
    }
    return out;
  }

  function askWrap(ui, box, p, extra, counter, ladder, onSolved, opt) {
    var slot = opt.slot || null;
    var ansVal = slot ? p.parts[slot].answer : p.answer;
    var askOpt = {
      question: opt.question,
      answer: opt.answer !== undefined ? opt.answer : C().label(ansVal),
      wrongs: opt.wrongs || mapWrongs(C().wrongChoices(p, slot)),
      hints: opt.hints || BASE_HINTS,
      hint: opt.hint || BASE_HINTS.fix,
      explain: opt.explain,
      prefix: 'md4',
      kind: slot ? p.kind + '-' + slot : p.kind,
      extra: extra,
      counter: counter,
      ladder: ladder || null,
      ladderLabel: ladder ? '🪜 계단 다시 보기' : undefined,
      column: Boolean(opt.column),
      onSolved: onSolved
    };
    box.appendChild(global.MathDrill.ask(ui, askOpt));
  }

  function divExplain(p) {
    if (p.r === 0) {
      return p.b + ' × ' + p.q + ' = ' + p.a + '이므로 몫 ' + josaNum(p.q, 'ieyo') + '.';
    }
    return p.b + ' × ' + p.q + ' = ' + (p.b * p.q) + '이고, ' + p.a + ' − ' + (p.b * p.q) + ' = ' + josaNum(p.r, 'ieyo') + '.';
  }

  function divTensExplain(p) {
    if (p.r === 0) {
      return p.a2 + ' ÷ ' + p.b2 + ' = ' + p.q + '이므로 몫 ' + josaNum(p.q, 'ieyo') + '.';
    }
    return p.a2 + ' ÷ ' + p.b2 + ' = ' + p.q + ' … ' + p.r2 + '이고, 나머지에 0을 붙여 ' + josaNum(p.r, 'ieyo') + '.';
  }

  function mulTensExplain(p) {
    return p.a + ' × ' + (p.b / 10) + ' = ' + p.base + '에 0을 하나 붙이면 ' + josaNum(p.answer, 'ieyo') + '.';
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
        var area = ui.el('div', 'md4-area');
        card.appendChild(area);
        container.appendChild(card);
        global.MathDrill.rounds(area, ctx, {
          counterKey: 'muldiv',
          makeRound: spec.makeRound,
          renderProblem: function (box, p, next, extra, counter) {
            spec.renderProblem(ui, box, p, next, extra, counter);
          }
        });
      }
    };
  }

  // 1관: × 몇십
  var lab1 = buildLab({
    title: '1관 × 몇십',
    icon: '✖️',
    sub: '0 떼고 곱해 붙이기',
    guide: '곱하는 수의 끝 0을 떼고 곱한 뒤, 뗀 0을 하나 붙여 보아요.',
    steps: ['곱하는 수의 끝 0을 떼고 곱해요', '뗀 0을 하나 붙여요'],
    whyTitle: '왜 끝 0을 떼고 곱할까?',
    whyBody: '40은 4 × 10이에요. 먼저 4를 곱한 뒤 10배를 하면 끝에 0이 하나 붙어요. 곱해지는 수의 0은 떼지 않아요.',
    makeRound: function () { return C().makeRound(1, Math.random); },
    renderProblem: function (ui, box, p, next, extra, counter) {
      var d = p.b / 10;
      box.appendChild(global.MathDrill.expr(ui, p.a + ' × ' + p.b));
      if (p.kind === 'mul-tens-helped') {
        box.appendChild(D().helpLine(ui, p.a + ' × ' + d + ' = ' + p.base));
      }
      askWrap(ui, box, p, extra, counter, null, function () {
        if (p.kind !== 'mul-tens-helped') {
          box.appendChild(D().helpLine(ui, p.a + ' × ' + d + ' = ' + p.base + '  →  ' + p.answer));
        }
        next();
      }, {
        question: p.a + ' × ' + p.b + ' = ?',
        explain: mulTensExplain(p)
      });
    }
  });

  // 2관: × 두 자리 수 (세로셈 3단계)
  var lab2 = buildLab({
    title: '2관 × 두 자리 수',
    icon: '🧮',
    sub: '세로셈',
    guide: '일의 자리 곱, 십의 자리 곱을 차례로 구하고 두 줄을 더해 보아요.',
    steps: ['일의 자리를 곱해요', '십의 자리를 곱해요(한 칸 왼쪽)', '두 줄을 더해요'],
    whyTitle: '왜 둘째 줄은 한 칸 왼쪽일까?',
    whyBody: '325 × 24는 325 × 4와 325 × 20을 더한 값이에요. 20을 곱하면 일의 자리가 0이라 한 칸 왼쪽부터 써요.',
    makeRound: function () { return C().makeRound(2, Math.random); },
    renderProblem: function (ui, box, p, next, extra, counter) {
      var d1 = p.b % 10;
      var d2 = Math.floor(p.b / 10);
      box.appendChild(global.MathDrill.expr(ui, p.a + ' × ' + p.b));
      var board = D().mulBoard(ui, p.a, p.b);
      box.appendChild(board.el);
      var stepArea = ui.el('div', 'md4-step-area');
      box.appendChild(stepArea);

      function askSum() {
        while (stepArea.firstChild) stepArea.removeChild(stepArea.firstChild);
        board.focus('sum');
        askWrap(ui, stepArea, p, extra, counter, LADDER2, function () {
          board.focus(null);
          board.fill('sum', next);
        }, {
          slot: 'sum',
          question: '③ 두 줄 더하기: ' + p.parts.ones.answer + ' + ' + p.parts.tens.answer + ' = ?',
          explain: p.parts.ones.answer + ' + ' + p.parts.tens.answer + ' = ' + josaNum(p.parts.sum.answer, 'ieyo') + '.'
        });
      }

      function askTens() {
        while (stepArea.firstChild) stepArea.removeChild(stepArea.firstChild);
        board.focus('tens');
        askWrap(ui, stepArea, p, extra, null, LADDER2, function () {
          board.fill('tens', askSum);
        }, {
          slot: 'tens',
          question: '② 십의 자리 곱: ' + p.a + ' × ' + (d2 * 10) + ' = ?',
          explain: p.a + ' × ' + (d2 * 10) + ' = ' + josaNum(p.parts.tens.answer, 'ieyo') + '.'
        });
      }

      board.focus('ones');
      askWrap(ui, stepArea, p, extra, null, LADDER2, function () {
        board.fill('ones', askTens);
      }, {
        slot: 'ones',
        question: '① 일의 자리 곱: ' + p.a + ' × ' + d1 + ' = ?',
        explain: p.a + ' × ' + d1 + ' = ' + josaNum(p.parts.ones.answer, 'ieyo') + '.'
      });
    }
  });

  // 3관: ÷ 몇십
  var lab3 = buildLab({
    title: '3관 ÷ 몇십',
    icon: '✂️',
    sub: '0 같이 지우기',
    guide: '끝 0을 같이 하나 지우고 몫을 구해요. 나머지에는 지운 0을 다시 붙여요.',
    steps: ['끝 0을 같이 하나 지워요', '몫을 구해요', '나머지에는 0을 다시 붙여요'],
    whyTitle: '왜 나머지에는 0을 다시 붙일까?',
    whyBody: '250 ÷ 60은 10씩 25묶음을 6묶음씩 나누는 것과 같아요. 남는 1묶음은 10이므로 나머지는 10이에요.',
    makeRound: function () { return C().makeRound(3, Math.random); },
    renderProblem: function (ui, box, p, next, extra, counter) {
      box.appendChild(global.MathDrill.expr(ui, p.a + ' ÷ ' + p.b));
      var zc = D().zeroCancel(ui, p.a, p.b);
      box.appendChild(zc.el);
      askWrap(ui, box, p, extra, counter, LADDER3, function () {
        if (p.r > 0) zc.giveZeroBack(p.r2, p.r);
        next();
      }, {
        question: p.a + ' ÷ ' + p.b + ' = ?',
        column: true,
        explain: divTensExplain(p)
      });
    }
  });

  // 4관: ÷ 두 자리 수
  var lab4 = buildLab({
    title: '4관 ÷ 두 자리 수',
    icon: '🪜',
    sub: '곱셈 줄로 몫 찾기',
    guide: '나누는 수의 곱셈 줄을 보고 넘지 않는 가장 큰 곱을 찾아 보아요.',
    steps: ['나누는 수의 곱셈 줄을 봐요', '넘지 않는 가장 큰 곱을 찾아요', '빼서 나머지를 구해요'],
    whyTitle: '어림해서 짐작해도 될까?',
    whyBody: '나누는 수를 가까운 몇십으로 어림해 몫을 짐작할 수도 있어요. 곱셈 줄을 보면 넘지 않는 가장 큰 곱을 바로 찾을 수 있어요.',
    makeRound: function () { return C().makeRound(4, Math.random); },
    renderProblem: function (ui, box, p, next, extra, counter) {
      box.appendChild(global.MathDrill.expr(ui, p.a + ' ÷ ' + p.b));
      box.appendChild(D().timesLadder(ui, p.b));
      askWrap(ui, box, p, extra, counter, null, function () {
        box.appendChild(D().checkLine(ui, p.a, p.b, p.q, p.r, next));
      }, {
        question: p.a + ' ÷ ' + p.b + ' = ?',
        column: true,
        explain: divExplain(p)
      });
    }
  });

  // 5관: 몫이 한 자리 (세 자리 ÷ 두 자리, 검산)
  var lab5 = buildLab({
    title: '5관 몫이 한 자리',
    icon: '🔍',
    sub: '세 자리 ÷ 두 자리·검산',
    guide: '세 자리 수를 두 자리 수로 나누고, 검산식으로 맞는지 확인해요.',
    steps: ['나누는 수의 곱셈 줄을 봐요', '넘지 않는 가장 큰 곱을 찾아요', '빼서 나머지를 구해요'],
    whyTitle: '검산은 왜 할까?',
    whyBody: '나누는 수 × 몫 + 나머지가 나누어지는 수와 같으면 나눗셈을 바르게 계산했다는 뜻이에요.',
    makeRound: function () { return C().makeRound(5, Math.random); },
    renderProblem: function (ui, box, p, next, extra, counter) {
      if (p.kind === 'div-check') {
        var stmt = p.a + ' ÷ ' + p.b + ' = ' + p.q + ' … ' + p.r;
        box.appendChild(global.MathDrill.expr(ui, stmt));
        askWrap(ui, box, p, extra, counter, LADDER5, function () {
          box.appendChild(D().checkLine(ui, p.a, p.b, p.q, p.r, next));
        }, {
          question: p.a + ' ÷ ' + p.b + ' = ' + p.q + ' … ' + josaNum(p.r, 'i') + ' 맞는지 확인하는 식은?',
          column: true,
          explain: C().checkText(p.a, p.b, p.q, p.r) + '로 확인해요.'
        });
        return;
      }
      box.appendChild(global.MathDrill.expr(ui, p.a + ' ÷ ' + p.b));
      box.appendChild(D().timesLadder(ui, p.b));
      askWrap(ui, box, p, extra, counter, LADDER5, function () {
        box.appendChild(D().checkLine(ui, p.a, p.b, p.q, p.r, next));
      }, {
        question: p.a + ' ÷ ' + p.b + ' = ?',
        column: true,
        explain: divExplain(p)
      });
    }
  });

  // 6관: 몫이 두 자리 (나눗셈 세로셈)
  var lab6 = buildLab({
    title: '6관 몫이 두 자리',
    icon: '📐',
    sub: '나눗셈 세로셈',
    guide: '앞 두 자리부터 나누고, 빼서 다음 자리를 내려쓴 뒤 또 나눠 보아요.',
    steps: ['앞 두 자리부터 나눠요', '빼고 다음 자리를 내려써요', '또 나눠요'],
    whyTitle: '왜 앞 두 자리부터 나눌까?',
    whyBody: '백의 자리 한 자리에는 두 자리 수가 들어가지 않아요. 그래서 십의 자리까지 앞 두 자리를 먼저 나눠요.',
    makeRound: function () { return C().makeRound(6, Math.random); },
    renderProblem: function (ui, box, p, next, extra, counter) {
      var s0 = p.steps[0];
      var s1 = p.steps[1];
      var hasRem = p.r > 0;
      box.appendChild(global.MathDrill.expr(ui, p.a + ' ÷ ' + p.b));
      var board = D().divBoard(ui, p.a, p.b, p.steps);
      box.appendChild(board.el);
      box.appendChild(D().timesLadder(ui, p.b));
      var stepArea = ui.el('div', 'md4-step-area');
      box.appendChild(stepArea);

      function askRem() {
        while (stepArea.firstChild) stepArea.removeChild(stepArea.firstChild);
        board.focus('rem');
        askWrap(ui, stepArea, p, extra, counter, null, function () {
          board.focus(null);
          board.fillRemain(1);
          box.appendChild(D().checkLine(ui, p.a, p.b, p.q, p.r, next));
        }, {
          slot: 'rem',
          question: '③ 나머지: ' + s1.take + ' − ' + s1.product + ' = ?',
          explain: s1.take + ' − ' + s1.product + ' = ' + josaNum(p.r, 'ieyo') + '.'
        });
      }

      function askQ2() {
        while (stepArea.firstChild) stepArea.removeChild(stepArea.firstChild);
        board.focus('q1');
        askWrap(ui, stepArea, p, extra, hasRem ? null : counter, null, function () {
          board.fillQuotient(1);
          board.fillProduct(1);
          if (hasRem) {
            askRem();
          } else {
            board.focus(null);
            board.fillRemain(1);
            box.appendChild(D().checkLine(ui, p.a, p.b, p.q, p.r, next));
          }
        }, {
          slot: 'q2',
          question: '② 몫의 일의 자리: ' + s1.take + ' ÷ ' + p.b + '의 몫은?',
          explain: p.b + ' × ' + s1.q + ' = ' + s1.product + '이므로 일의 자리 몫은 ' + josaNum(s1.q, 'ieyo') + '.'
        });
      }

      board.focus('q0');
      askWrap(ui, stepArea, p, extra, null, null, function () {
        board.fillQuotient(0);
        board.fillProduct(0);
        board.fillRemain(0);
        askQ2();
      }, {
        slot: 'q1',
        question: '① 몫의 십의 자리: ' + s0.take + ' ÷ ' + p.b + '의 몫은?',
        explain: p.b + ' × ' + s0.q + ' = ' + s0.product + '이므로 십의 자리 몫은 ' + josaNum(s0.q, 'ieyo') + '.'
      });
    }
  });

  // 7관: ⚡ 연습 마당 (섞어 풀기 10문제, 판·도움 줄·0 지우기 줄 없음, div-2by2*/div-3by2-one*는 곱셈 줄 표시)
  function renderMixedProblem(ui, box, p, next, extra, counter) {
    var k = p.kind;
    if (k === 'mul-tens' || k === 'mul-tens-zero') {
      box.appendChild(global.MathDrill.expr(ui, p.a + ' × ' + p.b));
      askWrap(ui, box, p, extra, counter, null, next, {
        question: p.a + ' × ' + p.b + ' = ?',
        explain: mulTensExplain(p)
      });
      return;
    }

    if (k === 'div-tens' || k === 'div-tens-rem') {
      box.appendChild(global.MathDrill.expr(ui, p.a + ' ÷ ' + p.b));
      askWrap(ui, box, p, extra, counter, null, next, {
        question: p.a + ' ÷ ' + p.b + ' = ?',
        column: true,
        explain: divTensExplain(p)
      });
      return;
    }

    if (k === 'div-check') {
      box.appendChild(global.MathDrill.expr(ui, p.a + ' ÷ ' + p.b + ' = ' + p.q + ' … ' + p.r));
      askWrap(ui, box, p, extra, counter, null, next, {
        question: p.a + ' ÷ ' + p.b + ' = ' + p.q + ' … ' + josaNum(p.r, 'i') + ' 맞는지 확인하는 식은?',
        column: true,
        explain: C().checkText(p.a, p.b, p.q, p.r) + '로 확인해요.'
      });
      return;
    }

    // div-2by2, div-2by2-rem, div-3by2-one, div-3by2-one-rem
    box.appendChild(global.MathDrill.expr(ui, p.a + ' ÷ ' + p.b));
    box.appendChild(D().timesLadder(ui, p.b));
    askWrap(ui, box, p, extra, counter, null, next, {
      question: p.a + ' ÷ ' + p.b + ' = ?',
      column: true,
      explain: divExplain(p)
    });
  }

  var lab7 = buildLab({
    title: '7관 ⚡ 연습 마당',
    icon: '⚡',
    sub: '섞어 풀기 10문제',
    guide: '곱셈과 나눗셈 10문제를 차근차근 풀어 보아요.',
    steps: ['문제를 끝까지 읽어요', '곱셈·나눗셈·검산 방법을 떠올려요', '알맞은 답을 골라요'],
    whyTitle: '많이 풀수록 쉬워져요',
    whyBody: '같은 방법을 여러 번 쓰면 손에 익어요. 틀려도 괜찮아요, 힌트를 보고 다시 고르면 돼요.',
    makeRound: function () { return C().makeMixedRound(Math.random, 10); },
    renderProblem: renderMixedProblem
  });

  var labs = [lab1, lab2, lab3, lab4, lab5, lab6, lab7];

  function mount() {
    if (!global.MathExplorer || typeof global.MathExplorer.mount !== 'function') return null;
    return global.MathExplorer.mount({
      key: 'muldiv',
      labs: labs,
      quiz: global.MathExplorerQuiz.create({
        grade: '4-1',
        unit: '3. 곱셈과 나눗셈',
        title: '곱셈과 나눗셈 퀴즈 배틀',
        intro: '곱셈과 나눗셈 퀴즈 배틀이에요. 천천히 읽고 골라 볼까요?'
      })
    });
  }

  global.MulDivLabs = {
    labs: labs,
    mount: mount
  };

  if (global.document) {
    if (global.document.readyState === 'loading') {
      global.document.addEventListener('DOMContentLoaded', mount);
    } else {
      mount();
    }
  }
})(typeof window !== 'undefined' ? window : globalThis);
