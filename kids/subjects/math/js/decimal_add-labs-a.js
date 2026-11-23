// 4-2 소수의 덧셈과 뺄셈 탐험관 1~3관(모눈·자릿값·크기 비교). 그리기 도우미는 decimal_add-draw.js
(function (global) {
  'use strict';
  // 숫자·소수 글자 뒤 조사(받침에 맞춤): J('8.3', 'eun') → '8.3은'
  function J(t, type) { return global.MathExplorer && global.MathExplorer.josa ? global.MathExplorer.josa(String(t), type) : String(t); }

  var HINTS = {
    'read-as-whole': '소수점 아래 숫자는 하나씩 읽어요. 0.37은 영 점 삼칠이에요.',
    'drop-point': '소수점도 "점"이라고 읽어요.',
    'drop-zero': '가운데 0도 빼먹지 말고 "영"이라고 읽어요.',
    'place-up': '한 자리 높여 버렸어요. 어느 자리인지 다시 봐요.',
    'place-down': '한 자리 낮춰 버렸어요. 어느 자리인지 다시 봐요.',
    'longer-is-larger': '자리 수가 많다고 큰 게 아니에요. 끝에 0을 붙여 자리를 맞춰 봐요.',
    'shorter-is-larger': '끝에 0을 붙여 자리를 맞춘 뒤 높은 자리부터 비교해요.',
    'equal': '0을 붙여 맞춰 보면 두 수가 달라요.',
    'wrong-direction': '10배는 소수점이 오른쪽으로, 1/10은 왼쪽으로 옮겨요.',
    'off-by-one': '마지막 자리를 다시 계산해 봐요.',
    'carry-as-place': '0.1이 10개면 1이에요. 받아올림을 해요.',
    'reverse-subtract': '위 수에서 아래 수를 빼요. 모자라면 앞자리에서 빌려 와요.',
    'right-align': '소수점끼리 맞춰서 세로로 써요.',
    'no-pad': '빈자리에 0을 채우고 빼요.',
    'ignore-point-add': '빼기예요. 2는 2.00으로 써요.',
    'ignore-point': '2는 2.00으로 써서 소수점을 맞춰요.',
    'swap-digits': '0.1 자리와 0.01 자리 숫자를 다시 봐요.'
  };

  var LADDER_1 = {
    title: '🪜 0.1은 1/10',
    body: '1을 똑같이 10칸으로 나눈 것 중 1칸이 0.1이에요. 0.1이 10개면 1이에요.',
    question: {
      question: '1을 10칸으로 나눈 것 중 3칸은?',
      choices: ['0.3', '3', '0.03'],
      answer: 0,
      explain: '10칸 중 3칸은 0.3이에요.'
    }
  };

  // 그리기 도우미는 decimal_add-draw.js (먼저 실림)
  var DRAW = global.DecAddDraw;
  var grid = DRAW.grid, gridStepper = DRAW.gridStepper, strip = DRAW.strip, numberLine = DRAW.numberLine;
  var makeEl = DRAW.makeEl, toWrongs = DRAW.toWrongs;
  function josa(text, kind) { return global.MathExplorer.josa(text, kind); }

  // 1관: 0.01 모눈
  var lab1 = {
    title: '1관 0.01 모눈',
    icon: '🟦',
    sub: '소수 두 자리',
    render: function (container, ctx) {
      var ui = ctx.ui;
      var card = ui.card('1관 0.01 모눈');
      card.appendChild(ui.guide('버튼으로 모눈을 칠해 봐요. 한 줄은 0.1, 한 칸은 0.01이에요.'));
      card.appendChild(global.MathDrill.algo(ui, [
        '한 줄은 0.1, 한 칸은 0.01',
        '줄 수와 칸 수를 세요',
        '소수점 아래 숫자는 하나씩 읽어요'
      ]));
      card.appendChild(global.MathDrill.why(
        ui,
        '0.01은 얼마?',
        '1을 100칸으로 나눈 것 중 1칸이 0.01이에요. 0.37은 0.1이 3개, 0.01이 7개예요.'
      ));
      var area = ui.el('div', 'da-area');
      card.appendChild(area);
      container.appendChild(card);

      global.MathDrill.rounds(area, ctx, {
        counterKey: 'decadd',
        makeRound: function () {
          var list = global.DecimalAddCore.makeRound(1, Math.random);
          if (list.length >= 3) { list[2]._askWrite = true; }
          return list;
        },
        renderProblem: function (box, p, next, extra, counter) {
          var dc = global.DecimalCore;
          var dac = global.DecimalAddCore;
          var aStr = dc.format(p.a);
          if (p._askWrite) {
            box.appendChild(grid(p.a.int).el);
            var x = Math.floor(p.a.int / 10) % 10;
            var y = p.a.int % 10;
            var secondWrong = x === y
              ? { token: dc.format(dac.shift(p.a, -1)), mistake: 'place-down' }
              : { token: dc.format(dc.dec(y * 10 + x, 2)), mistake: 'swap-digits' };
            box.appendChild(global.MathDrill.ask(ui, {
              question: '칠한 부분을 소수로 나타내면?',
              answer: aStr,
              wrongs: [
                { token: dc.format(dac.shift(p.a, 1)), mistake: 'place-up' },
                secondWrong
              ],
              hints: HINTS,
              hint: '0.1이 몇 줄, 0.01이 몇 칸인지 세어 봐요.',
              explain: '0.1이 ' + x + '줄, 0.01이 ' + y + '칸이므로 ' + J(aStr, 'ieyo') + '.',
              prefix: 'dec4',
              kind: p.kind,
              extra: extra,
              counter: counter,
              ladder: LADDER_1,
              onSolved: next
            }));
            return;
          }

          box.appendChild(ui.guide(aStr + '만큼 칠해요'));
          var g = grid(0);
          box.appendChild(g.el);
          var countLine = ui.el('p', 'mx-guide', '0.1이 0개, 0.01이 0개');
          box.appendChild(countLine);
          var askHost = ui.el('div', 'da-ask-host');
          var stepper = gridStepper({
            grid: g,
            to: p.a.int,
            onStep: function (n) {
              countLine.textContent = '0.1이 ' + Math.floor(n / 10) + '개, 0.01이 ' + (n % 10) + '개';
            },
            onDone: function () {
              askHost.appendChild(global.MathDrill.ask(ui, {
                question: josa(aStr, 'eul') + ' 바르게 읽은 것은?',
                answer: p.answer,
                wrongs: toWrongs(dac.wrongChoices(p)),
                hints: HINTS,
                hint: '소수점 아래 숫자는 하나씩 읽어요.',
                explain: J(aStr, 'eun') + ' ' + p.answer + (global.MathExplorer.hasBatchim(p.answer) ? '이라고' : '라고') + ' 읽어요.',
                prefix: 'dec4',
                kind: p.kind,
                extra: extra,
                counter: counter,
                ladder: LADDER_1,
                onSolved: next
              }));
            }
          });
          box.appendChild(stepper);
          box.appendChild(askHost);
        }
      });
    }
  };

  // 2관: 0.001과 자릿값
  var lab2 = {
    title: '2관 0.001과 자릿값',
    icon: '🔍',
    sub: '소수 세 자리',
    render: function (container, ctx) {
      var ui = ctx.ui;
      var card = ui.card('2관 0.001과 자릿값');
      card.appendChild(ui.guide('수직선에서 소수를 찾고 각 자리 숫자의 값을 알아봐요.'));
      card.appendChild(global.MathDrill.algo(ui, [
        '어느 사이에 있는지 찾아요',
        '한 칸씩 더 자세히 봐요',
        '자리마다 숫자가 나타내는 값을 봐요'
      ]));
      card.appendChild(global.MathDrill.why(
        ui,
        '0.001은 얼마?',
        '0.01을 다시 10칸으로 나눈 것 중 1칸이 0.001이에요.'
      ));
      var area = ui.el('div', 'da-area');
      card.appendChild(area);
      container.appendChild(card);

      global.MathDrill.rounds(area, ctx, {
        counterKey: 'decadd',
        makeRound: function () { return global.DecimalAddCore.makeRound(2, Math.random); },
        renderProblem: function (box, p, next, extra, counter) {
          var dc = global.DecimalCore;
          var dac = global.DecimalAddCore;
          if (p.kind === 'locate-3') {
            var aStr = dc.format(p.a);
            var askHost = ui.el('div', 'da-ask-host');
            box.appendChild(numberLine(ui, p.a, function () {
              askHost.appendChild(global.MathDrill.ask(ui, {
                question: '수직선에서 찾은 수는?',
                answer: aStr,
                wrongs: toWrongs(dac.wrongChoices(p)),
                hints: HINTS,
                hint: '0.1, 0.01, 0.001 자리를 차례로 봐요.',
                explain: '수직선에서 찾은 수는 ' + J(aStr, 'ieyo') + '.',
                prefix: 'dec4',
                kind: p.kind,
                extra: extra,
                counter: counter,
                ladder: null,
                onSolved: next
              }));
            }));
            box.appendChild(askHost);
            return;
          }

          var st = strip(p.a);
          st.highlight(p.place);
          box.appendChild(st.el);
          var dv = dac.digitValue(p.a, p.place);
          var digitStr = String(dv.int);
          var ansStr = dc.format(p.answer);
          box.appendChild(global.MathDrill.ask(ui, {
            question: '색칠한 숫자 ' + josa(digitStr, 'eun') + ' 얼마를 나타낼까요?',
            answer: ansStr,
            wrongs: toWrongs(dac.wrongChoices(p)),
            hints: HINTS,
            hint: '소수점 아래 몇째 자리인지 세어 봐요.',
            explain: '그 자리의 숫자 ' + J(digitStr, 'eun') + ' ' + J(ansStr, 'eul') + ' 나타내요.',
            prefix: 'dec4',
            kind: p.kind,
            extra: extra,
            counter: counter,
            ladder: null,
            onSolved: next
          }));
        }
      });
    }
  };

  // 3관: 크기 비교
  var lab3 = {
    title: '3관 크기 비교',
    icon: '⚖️',
    sub: '0을 붙여 맞추기',
    render: function (container, ctx) {
      var ui = ctx.ui;
      var card = ui.card('3관 크기 비교');
      card.appendChild(ui.guide('끝에 0을 붙여 자리를 맞춘 뒤 두 소수의 크기를 비교해요.'));
      card.appendChild(global.MathDrill.algo(ui, [
        '끝에 0을 붙여 자리 수를 맞춰요',
        '높은 자리부터 비교해요',
        '큰 쪽으로 입이 벌어져요'
      ]));
      card.appendChild(global.MathDrill.why(
        ui,
        '0을 붙여도 될까?',
        '0.7과 0.70은 같은 수예요. 끝에 0을 붙여도 크기는 그대로예요.'
      ));
      var area = ui.el('div', 'da-area');
      card.appendChild(area);
      container.appendChild(card);

      function fracCells(d) {
        if (d.places === 0) { return 0; }
        if (d.places === 1) { return (d.int % 10) * 10; }
        return d.int % 100;
      }

      global.MathDrill.rounds(area, ctx, {
        counterKey: 'decadd',
        makeRound: function () { return global.DecimalAddCore.makeRound(3, Math.random); },
        renderProblem: function (box, p, next, extra, counter) {
          var dc = global.DecimalCore;
          var dac = global.DecimalAddCore;
          var aStr = dc.format(p.a);
          var bStr = dc.format(p.b);
          var al = dac.align(p.a, p.b);

          var board = ui.el('div', 'da-cmp-board');
          var rowA = ui.el('div', 'da-cmp-row');
          var numA = ui.el('span', 'da-num', aStr);
          rowA.appendChild(numA);
          rowA.appendChild(grid(fracCells(p.a), true).el);

          var rowB = ui.el('div', 'da-cmp-row');
          var numB = ui.el('span', 'da-num', bStr);
          rowB.appendChild(numB);
          rowB.appendChild(grid(fracCells(p.b), true).el);

          board.appendChild(rowA);
          board.appendChild(rowB);
          box.appendChild(board);

          var askHost = ui.el('div', 'da-ask-host');
          var padBtn = ui.button('끝에 0 붙이기', 'mx-btn primary', function () {
            if (al.padA > 0) { numA.textContent = dc.formatRaw(al.a); }
            if (al.padB > 0) { numB.textContent = dc.formatRaw(al.b); }
            padBtn.disabled = true;
            askHost.appendChild(global.MathDrill.ask(ui, {
              question: aStr + ' ○ ' + bStr + '에 알맞은 것은?',
              answer: p.answer,
              order: ['>', '<', '='],
              wrongs: toWrongs(dac.wrongChoices(p)),
              hints: HINTS,
              hint: '0을 붙여 자리를 맞춘 뒤 높은 자리부터 비교해요.',
              explain: J(dc.formatRaw(al.a), 'gwa') + ' ' + J(dc.formatRaw(al.b), 'eul') + ' 비교하면 ' + aStr + ' ' + p.answer + ' ' + J(bStr, 'ieyo') + '.',
              prefix: 'dec4',
              kind: p.kind,
              extra: extra,
              counter: counter,
              ladder: null,
              onSolved: next
            }));
          });
          box.appendChild(padBtn);
          box.appendChild(askHost);
        }
      });
    }
  };

  global.DecAddLabs = [lab1, lab2, lab3];
})(typeof window !== 'undefined' ? window : globalThis);
