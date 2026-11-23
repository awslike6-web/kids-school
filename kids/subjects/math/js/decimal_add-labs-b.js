// 초등 4학년 소수의 덧셈과 뺄셈 탐험관(4~7관) 및 전체 조립
(function (global) {
  'use strict';
  // 숫자·소수 글자 뒤 조사(받침에 맞춤): J('8.3', 'eun') → '8.3은'
  function J(t, type) { return global.MathExplorer && global.MathExplorer.josa ? global.MathExplorer.josa(String(t), type) : String(t); }
  var Core = global.DecimalCore, AddCore = global.DecimalAddCore, Draw = global.DecAddDraw;
  var Drill = global.MathDrill, Explorer = global.MathExplorer;

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
  var LADDER_5 = {
    title: '🪜 0.1이 10개면 1',
    body: '0.1을 10개 모으면 1이 돼요. 0.1이 14개면 1.4예요.',
    question: {
      question: '0.1이 12개면?',
      choices: ['1.2', '0.12', '12'],
      answer: 0,
      explain: '0.1이 10개면 1, 2개가 더 있으니 1.2예요.'
    }
  };
  var PLACE_NAMES = ['', '첫째', '둘째', '셋째'];

  function fmt(d) { return Core.format(d); }
  function josa(s, kind) { return Explorer.josa(s, kind); }
  function makeWrongs(p) {
    return AddCore.wrongChoices(p).map(function (w) { return { token: w.text, mistake: w.mistake }; });
  }
  function extend(base, extra) {
    var out = {}, k;
    for (k in base) { if (Object.prototype.hasOwnProperty.call(base, k)) out[k] = base[k]; }
    for (k in extra) { if (Object.prototype.hasOwnProperty.call(extra, k)) out[k] = extra[k]; }
    return out;
  }
  function shuffle(arr) {
    var copy = arr.slice(), i, j, tmp;
    for (i = copy.length - 1; i > 0; i -= 1) {
      j = Math.floor(Math.random() * (i + 1));
      tmp = copy[i]; copy[i] = copy[j]; copy[j] = tmp;
    }
    return copy;
  }
  function padStr(s, len, right) {
    var res = s;
    while (res.length < len) res = right ? (res + '\u00a0') : ('\u00a0' + res);
    return res;
  }
  function makeLab(cfg) {
    return {
      title: cfg.title,
      icon: cfg.icon,
      sub: cfg.sub,
      render: function (container, ctx) {
        var ui = ctx.ui, card = ui.card(cfg.title), area = ui.el('div', 'da-area');
        card.appendChild(ui.guide(cfg.guide));
        card.appendChild(Drill.algo(ui, cfg.algo));
        card.appendChild(Drill.why(ui, cfg.whyTitle, cfg.whyBody));
        card.appendChild(area);
        if (cfg.footer) cfg.footer(card, ui);
        container.appendChild(card);
        Drill.rounds(area, ctx, { counterKey: 'decadd', makeRound: cfg.makeRound, renderProblem: cfg.renderProblem });
      }
    };
  }
  function appendAsk(box, ui, p, cfg, extra, counter, next) {
    box.appendChild(Drill.ask(ui, {
      question: cfg.question,
      answer: cfg.answer,
      wrongs: makeWrongs(p),
      hints: cfg.hints || HINTS,
      hint: cfg.hint || '자리를 다시 확인해 봐요.',
      explain: cfg.explain,
      prefix: 'dec4',
      kind: p.kind,
      extra: extra,
      counter: counter,
      ladder: cfg.ladder || null,
      order: cfg.order,
      onSolved: next
    }));
  }

  // 4관: 10배와 1/10 (소수점 옮기기)
  var SHIFT_HINTS = extend(HINTS, { 'off-by-one': '한 칸씩 몇 번 옮기는지 다시 세어 봐요.' });
  var lab4 = makeLab({
    title: '4관 10배와 1/10',
    icon: '↔️',
    sub: '소수점 옮기기',
    guide: '10배 하면 오른쪽으로, 1/10 하면 왼쪽으로 소수점을 옮겨요.',
    algo: ['10배는 소수점을 오른쪽으로 한 칸', '1/10은 왼쪽으로 한 칸', '100배·1/100은 두 칸'],
    whyTitle: '왜 소수점이 움직일까?',
    whyBody: '숫자는 그대로이고 자리만 바뀌어요. 10배 하면 모든 숫자가 한 자리씩 올라가요.',
    makeRound: function () { return AddCore.makeRound(4, Math.random); },
    renderProblem: function (box, p, next, extra, counter) {
      var ui = box._ui || null;
      // box에 _ui가 없을 수 있으므로 Drill.rounds가 넘긴 ctx.ui 대신 box 생성자 대신 전역 MathExplorer가 아니라
      // renderProblem 인자에는 ui가 없으므로, 아래 makeLab 대신 관별 render를 쓰거나 클로저로 ui를 받는다.
      void ui; void p; void next; void extra; void counter;
    }
  });
  // 클로저로 ctx.ui를 넘기도록 makeLab 수정
  makeLab = function (cfg) {
    return {
      title: cfg.title,
      icon: cfg.icon,
      sub: cfg.sub,
      render: function (container, ctx) {
        var ui = ctx.ui, card = ui.card(cfg.title), area = ui.el('div', 'da-area');
        card.appendChild(ui.guide(cfg.guide));
        card.appendChild(Drill.algo(ui, cfg.algo));
        card.appendChild(Drill.why(ui, cfg.whyTitle, cfg.whyBody));
        card.appendChild(area);
        if (cfg.footer) cfg.footer(card, ui);
        container.appendChild(card);
        Drill.rounds(area, ctx, {
          counterKey: 'decadd',
          makeRound: cfg.makeRound,
          renderProblem: function (box, p, next, extra, counter) {
            cfg.renderProblem(ui, box, p, next, extra, counter);
          }
        });
      }
    };
  };

  function renderShiftChain(ui, box, p, next, extra, counter) {
    var track = Drill.track('dec4', 'shift-chain'), row = ui.el('div', 'mx-btn-row');
    var chain = ui.el('div', 'da-chain'), hintEl = ui.el('div', ''), step = 0;
    box.appendChild(ui.guide('큰 수부터 차례로 눌러요'));
    box.appendChild(row);
    box.appendChild(chain);
    box.appendChild(hintEl);
    shuffle(p.answer).forEach(function (item) {
      var txt = fmt(item), btn = ui.button(txt, 'mx-btn', function () {
        if (txt === fmt(p.answer[step])) {
          btn.disabled = true;
          chain.appendChild(ui.el('span', 'mx-chip green', txt));
          step += 1;
          if (step === p.answer.length) {
            track.done();
            if (extra && counter) counter.add();
            next();
          }
        } else {
          track.wrong(txt);
          ui.hint(hintEl, '1의 1/10은 0.1, 0.1의 1/10은 0.01이에요. 큰 수부터 눌러요.');
        }
      });
      row.appendChild(btn);
    });
  }

  lab4 = makeLab({
    title: '4관 10배와 1/10',
    icon: '↔️',
    sub: '소수점 옮기기',
    guide: '10배 하면 오른쪽으로, 1/10 하면 왼쪽으로 소수점을 옮겨요.',
    algo: ['10배는 소수점을 오른쪽으로 한 칸', '1/10은 왼쪽으로 한 칸', '100배·1/100은 두 칸'],
    whyTitle: '왜 소수점이 움직일까?',
    whyBody: '숫자는 그대로이고 자리만 바뀌어요. 10배 하면 모든 숫자가 한 자리씩 올라가요.',
    makeRound: function () { return AddCore.makeRound(4, Math.random); },
    renderProblem: function (ui, box, p, next, extra, counter) {
      if (p.kind === 'shift-chain') { renderShiftChain(ui, box, p, next, extra, counter); return; }
      var aTxt = fmt(p.a), isUp = p.kind === 'shift-up', tag = isUp ? '의 10배' : '의 1/100';
      box.appendChild(Drill.expr(ui, aTxt + tag + ' = ?'));
      box.appendChild(Draw.pointMover(ui, p.a, isUp ? 1 : -2, function () {
        appendAsk(box, ui, p, {
          question: aTxt + tag + (isUp ? '는?' : '은?'),
          answer: fmt(p.answer),
          hints: SHIFT_HINTS,
          hint: isUp ? '소수점을 오른쪽으로 한 칸 옮겨요.' : '소수점을 왼쪽으로 두 칸 옮겨요.',
          explain: aTxt + tag + (isUp ? '는 ' : '은 ') + J(fmt(p.answer), 'ieyo') + '.'
        }, extra, counter, next);
      }));
    }
  });

  // 5관: 소수 한 자리 더하기·빼기
  var lab5 = makeLab({
    title: '5관 소수 한 자리 더하기·빼기',
    icon: '➕',
    sub: '0.1이 몇 개',
    guide: '소수점을 맞춰 쓰고 오른쪽 자리부터 더하거나 빼요.',
    algo: ['소수점을 맞춰 써요', '오른쪽 자리부터 계산해요', '소수점을 그대로 내려 찍어요'],
    whyTitle: '0.1이 몇 개?',
    whyBody: '0.6은 0.1이 6개, 0.8은 0.1이 8개예요. 더하면 0.1이 14개라서 1.4예요.',
    makeRound: function () { return AddCore.makeRound(5, Math.random); },
    renderProblem: function (ui, box, p, next, extra, counter) {
      var aTxt = fmt(p.a), bTxt = fmt(p.b), exprStr = aTxt + ' ' + p.op + ' ' + bTxt + ' = ?';
      box.appendChild(Drill.expr(ui, exprStr));
      box.appendChild(ui.guide(J(aTxt, 'eun') + ' 0.1이 ' + p.a.int + '개, ' + J(bTxt, 'eun') + ' 0.1이 ' + p.b.int + '개예요.'));
      box.appendChild(Draw.column(ui, {
        a: p.a,
        b: p.b,
        op: p.op,
        onDone: function () {
          appendAsk(box, ui, p, {
            question: exprStr,
            answer: fmt(p.answer),
            hint: '소수점을 맞춰 오른쪽 자리부터 계산해요.',
            explain: aTxt + ' ' + p.op + ' ' + bTxt + ' = ' + J(fmt(p.answer), 'ieyo') + '.',
            ladder: LADDER_5
          }, extra, counter, next);
        }
      }));
    }
  });

  // 6관: 자리 맞춰 세로셈
  function formatMiniPair(a, b, op, mode) {
    var aStr = fmt(a), bStr = fmt(b), aParts, bParts, maxFrac, aFrac, bFrac, width;
    if (mode === 'dot') {
      aParts = aStr.split('.'); bParts = bStr.split('.');
      aFrac = aParts[1] ? aParts[1].length : 0; bFrac = bParts[1] ? bParts[1].length : 0;
      maxFrac = Math.max(aFrac, bFrac);
      if (maxFrac > 0) {
        aStr = aStr + (aStr.indexOf('.') < 0 ? padStr('', maxFrac + 1, true) : padStr('', maxFrac - aFrac, true));
        bStr = bStr + (bStr.indexOf('.') < 0 ? padStr('', maxFrac + 1, true) : padStr('', maxFrac - bFrac, true));
      }
      width = Math.max(aStr.length, bStr.length);
      return ['\u00a0\u00a0' + padStr(aStr, width, false), op + '\u00a0' + padStr(bStr, width, false)];
    }
    width = Math.max(aStr.length, bStr.length);
    if (mode === 'right') {
      return ['\u00a0\u00a0' + padStr(aStr, width, false), op + '\u00a0' + padStr(bStr, width, false)];
    }
    // 'left': 소수점 맞춤 그림에서 아래 수만 한 칸 왼쪽으로 민 그림(왼쪽 끝 맞춤이 소수점 맞춤과 같아지는 경우를 피함)
    var dot = formatMiniPair(a, b, op, 'dot');
    return ['\u00a0' + dot[0], dot[1] + '\u00a0'];
  }
  function makeMiniCol(ui, label, a, b, op, mode) {
    var col = ui.el('div', 'da-mini-col'), lines = formatMiniPair(a, b, op, mode);
    col.appendChild(ui.el('div', 'da-mini-lbl', label));
    col.appendChild(ui.el('div', 'da-mini-row', lines[0]));
    col.appendChild(ui.el('div', 'da-mini-row', lines[1]));
    col.appendChild(ui.el('div', 'da-mini-bar'));
    return col;
  }

  var lab6 = makeLab({
    title: '6관 자리 맞춰 세로셈',
    icon: '🧱',
    sub: '소수점끼리 맞추기',
    guide: '소수점끼리 세로로 맞추고 빈자리에 0을 채워 계산해요.',
    algo: ['소수점끼리 세로로 맞춰요', '빈자리에 0을 채워요', '오른쪽 자리부터 계산해요'],
    whyTitle: '왜 소수점끼리?',
    whyBody: '같은 자리끼리 더하고 빼야 해요. 소수점을 맞추면 같은 자리가 세로로 줄을 서요.',
    makeRound: function () { return AddCore.makeRound(6, Math.random); },
    footer: function (card, ui) {
      card.appendChild(ui.concept('끝자리 0은 지워요', '계산한 답의 소수점 아래 끝자리가 0이면 지워요. 1.60은 1.6, 2.50은 2.5예요.'));
    },
    renderProblem: function (ui, box, p, next, extra, counter) {
      var aTxt = fmt(p.a), bTxt = fmt(p.b), exprStr = aTxt + ' ' + p.op + ' ' + bTxt + ' = ?';
      var modes = shuffle(['dot', 'right', 'left']), labels = ['가', '나', '다'];
      var previewRow = ui.el('div', 'mx-btn-row'), stepBox = ui.el('div', 'da-step');
      box.appendChild(Drill.expr(ui, exprStr));
      modes.forEach(function (m, idx) { previewRow.appendChild(makeMiniCol(ui, labels[idx], p.a, p.b, p.op, m)); });
      stepBox.appendChild(previewRow);
      box.appendChild(stepBox);
      stepBox.appendChild(ui.choiceQuestion({
        question: '바르게 줄 세운 세로셈은?',
        choices: labels,
        fixed: true,
        answer: modes.indexOf('dot'),
        hint: function (i) {
          return modes[i] === 'right'
            ? '오른쪽 끝을 맞추면 0.1 자리와 0.01 자리가 섞여요.'
            : '소수점 위치가 서로 달라요. 소수점끼리 세로로 맞춰요.';
        },
        explain: '소수점끼리 세로로 맞춰야 같은 자리끼리 계산할 수 있어요.',
        onSolved: function () {
          stepBox.appendChild(Draw.column(ui, {
            a: p.a,
            b: p.b,
            op: p.op,
            onDone: function () {
              appendAsk(box, ui, p, {
                question: exprStr,
                answer: fmt(p.answer),
                hint: '빈자리에 0을 채우고 소수점끼리 맞춰 계산해요.',
                explain: aTxt + ' ' + p.op + ' ' + bTxt + ' = ' + J(fmt(p.answer), 'ieyo') + '.'
              }, extra, counter, next);
            }
          }));
        }
      }));
    }
  });

  // 7관: 연습 마당 (섞어 풀기 10문제)
  function buildMixedConfig(ui, box, p) {
    var aTxt = fmt(p.a), bTxt = p.b ? fmt(p.b) : '';
    if (p.kind === 'read-2' || p.kind === 'read-2-zero') {
      return {
        question: josa(aTxt, 'eul') + ' 바르게 읽은 것은?',
        answer: p.answer,
        hint: '소수점 아래 숫자는 하나씩 읽어요.',
        explain: josa(aTxt, 'eun') + ' "' + p.answer + '"이라고 읽어요.'
      };
    }
    if (p.kind === 'locate-3') {
      var x = AddCore.digitValue(p.a, 1).int, y = AddCore.digitValue(p.a, 2).int, z = AddCore.digitValue(p.a, 3).int;
      var ansTxt = fmt(p.answer || p.a);
      return {
        question: '0.1이 ' + x + '개, 0.01이 ' + y + '개, 0.001이 ' + z + '개인 수는?',
        answer: ansTxt,
        hint: '0.1, 0.01, 0.001 자리를 차례로 써 봐요.',
        explain: '0.1이 ' + x + '개, 0.01이 ' + y + '개, 0.001이 ' + z + '개면 ' + J(ansTxt, 'ieyo') + '.'
      };
    }
    if (p.kind === 'digit-value') {
      var valTxt = fmt(p.answer);
      return {
        question: aTxt + '에서 소수 ' + PLACE_NAMES[p.place] + ' 자리 숫자가 나타내는 수는?',
        answer: valTxt,
        hint: '소수점 아래 몇 번째 자리인지 세어 봐요.',
        explain: aTxt + '에서 소수 ' + PLACE_NAMES[p.place] + ' 자리 숫자는 ' + josa(valTxt, 'eul') + ' 나타내요.'
      };
    }
    if (p.kind === 'compare-longer-smaller' || p.kind === 'compare-longer-larger') {
      return {
        question: aTxt + ' ○ ' + bTxt + '에 알맞은 것은?',
        answer: p.answer,
        order: ['>', '<', '='],
        hint: '끝에 0을 붙여 자리를 맞춘 뒤 높은 자리부터 비교해요.',
        explain: aTxt + ' ' + p.answer + ' ' + J(bTxt, 'ieyo') + '.'
      };
    }
    if (p.kind === 'shift-up' || p.kind === 'shift-down-2') {
      var isUp = p.kind === 'shift-up', tag = isUp ? '의 10배' : '의 1/100';
      box.appendChild(Drill.expr(ui, aTxt + tag + ' = ?'));
      return {
        question: aTxt + tag + (isUp ? '는?' : '은?'),
        answer: fmt(p.answer),
        hints: SHIFT_HINTS,
        hint: isUp ? '소수점을 오른쪽으로 한 칸 옮겨요.' : '소수점을 왼쪽으로 두 칸 옮겨요.',
        explain: aTxt + tag + (isUp ? '는 ' : '은 ') + J(fmt(p.answer), 'ieyo') + '.'
      };
    }
    var exprStr = aTxt + ' ' + p.op + ' ' + bTxt + ' = ?';
    box.appendChild(Drill.expr(ui, exprStr));
    return {
      question: exprStr,
      answer: fmt(p.answer),
      hint: '소수점을 맞춰 오른쪽 자리부터 계산해요.',
      explain: aTxt + ' ' + p.op + ' ' + bTxt + ' = ' + J(fmt(p.answer), 'ieyo') + '.'
    };
  }

  var lab7 = makeLab({
    title: '7관 ⚡ 연습 마당',
    icon: '⚡',
    sub: '섞어 풀기 10문제',
    guide: '지금까지 배운 내용을 섞어서 10문제 풀어 봐요.',
    algo: ['식을 읽어요', '자리를 떠올려요', '답을 골라요'],
    whyTitle: '많이 풀수록 쉬워져요',
    whyBody: '같은 방법을 여러 번 쓰면 손에 익어요. 틀려도 괜찮아요, 다시 고르면 돼요.',
    makeRound: function () { return AddCore.makeMixedRound(Math.random, 10); },
    renderProblem: function (ui, box, p, next, extra, counter) {
      appendAsk(box, ui, p, buildMixedConfig(ui, box, p), extra, counter, next);
    }
  });

  // 전체 조립
  function mountAll() {
    Explorer.mount({
      key: 'decadd',
      fractions: true,
      labs: (global.DecAddLabs || []).concat([lab4, lab5, lab6, lab7]),
      quiz: global.MathExplorerQuiz.create({
        grade: '4-2',
        unit: '3. 소수의 덧셈과 뺄셈',
        title: '퀴즈 배틀',
        intro: '퀴즈 배틀이에요. 천천히 읽고 골라 볼까요?'
      })
    });
  }
  if (global.document && global.document.readyState === 'loading') {
    global.document.addEventListener('DOMContentLoaded', mountAll);
  } else {
    mountAll();
  }
})(typeof window !== 'undefined' ? window : globalThis);
