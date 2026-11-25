// 초등 5-1 수학 1단원 자연수의 혼합 계산 탐험관 (1~7관 + 퀴즈 배틀 마운트)
(function (global) {
  'use strict';

  var MINUS = '−';
  var RULES = ['( ) 안을 먼저', '× ÷를 앞에서부터', '+ −를 앞에서부터'];
  var CIRCLED = ['①', '②', '③', '④', '⑤'];

  var HINTS = {
    'order-left': '+ −보다 × ÷를 먼저 해요. ( )가 있으면 그 안이 가장 먼저예요.',
    'paren-ignored': '( ) 안을 가장 먼저 계산해요.',
    'order-right': '× ÷끼리, + −끼리는 앞에서부터 계산해요.',
    'calc-slip': '순서는 맞아요. 그 부분을 다시 계산해 봐요.',
    'op-slip': '기호를 다시 봐요. ×는 곱하기, ÷는 나누기예요.',
    'paren-missing': '먼저 해야 할 계산을 괄호로 묶어요.',
    'paren-wrong': '어떤 계산을 먼저 하는지 문장을 다시 읽어 봐요.',
    'op-swap-as': '남은 것을 구하면 빼기, 모두 구하면 더하기예요.',
    'op-swap-md': '똑같이 나누면 나눗셈, 몇 묶음이면 곱셈이에요.',
    'num-swap': '어느 수가 몇 개씩인지 다시 읽어 봐요.',
    'fix': '식 사다리를 다시 보며 한 줄씩 계산해 봐요.'
  };

  var LADDER1 = {
    title: '🪜 앞에서부터·괄호 먼저',
    body: '덧셈과 뺄셈이 섞인 식은 앞에서부터 차례로 계산해요. 10 − 4 + 2는 앞에서부터 계산하면 8이에요. 괄호가 있는 10 − (4 + 2)는 괄호 안을 먼저 계산해 4가 돼요.',
    question: {
      question: '10 − (4 + 2)에서 가장 먼저 계산할 부분은?',
      choices: ['4 + 2', '10 − 4', '10 + 2'],
      answer: 0,
      explain: '( ) 안을 가장 먼저 계산하므로 4 + 2 = 6부터 해요.'
    }
  };

  var LADDER3 = {
    title: '🪜 + −보다 × ÷ 먼저',
    body: '덧셈·뺄셈과 곱셈·나눗셈이 섞여 있으면 + −보다 × ÷를 먼저 계산해요. 2 + 3 × 4는 3 × 4 = 12를 먼저 계산하고 2 + 12 = 14가 돼요.',
    question: {
      question: '2 + 3 × 4의 값은?',
      choices: ['14', '20', '9'],
      answer: 0,
      explain: '+ −보다 × ÷를 먼저 하므로 3 × 4 = 12, 2 + 12 = 14예요.'
    }
  };

  var LADDER6 = {
    title: '🪜 괄호가 필요할 때',
    body: '문장에서 덧셈이나 뺄셈을 곱셈·나눗셈보다 먼저 해야 하면, 그 부분을 ( )로 묶어 줘요. 그래야 괄호 안을 가장 먼저 계산해요.',
    question: {
      question: '사탕 10개 중 4개를 먹고 남은 것을 2명이 똑같이 나누는 식은?',
      choices: ['(10 − 4) ÷ 2', '10 − 4 ÷ 2', '10 − (4 ÷ 2)'],
      answer: 0,
      explain: '남은 사탕(10 − 4)을 먼저 구해야 하므로 괄호로 묶어요.'
    }
  };

  function C() { return global.MixCalcCore; }

  function isOp(t) { return t === '+' || t === MINUS || t === '×' || t === '÷'; }

  function clearEl(node) { while (node && node.firstChild) node.removeChild(node.firstChild); }

  function josaNum(n, type) {
    return global.MathExplorer && global.MathExplorer.josa ? global.MathExplorer.josa(String(n), type) : String(n);
  }

  function reducedMotion() {
    return Boolean(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  // 지금 문제에 쓰이는 계산 순서 줄에 mc5-rule-on 표시
  function highlightRules(algoEl, tokens) {
    if (!algoEl) return;
    var rows = algoEl.children;
    var hasParen = false, hasMD = false, hasAS = false, i, t;
    if (tokens) {
      for (i = 0; i < tokens.length; i += 1) {
        t = tokens[i];
        if (t === '(' || t === ')') hasParen = true;
        else if (t === '×' || t === '÷') hasMD = true;
        else if (t === '+' || t === MINUS) hasAS = true;
      }
    }
    if (rows[0]) rows[0].classList.toggle('mc5-rule-on', hasParen);
    if (rows[1]) rows[1].classList.toggle('mc5-rule-on', hasMD);
    if (rows[2]) rows[2].classList.toggle('mc5-rule-on', hasAS);
  }

  // 식 사다리: 줄마다 토큰 span, 밑줄(mc5-mark), 첫 줄 연산 기호 위 순서 번호(mc5-num)
  function stepLadder(ui, firstTokens, opCount) {
    var wrap = ui.el('div', 'mc5-ladder');
    wrap.style.minHeight = ((opCount + 1) * 2.6) + 'rem';
    var lines = [];

    function makeLine(tokens) {
      var str = C().text(tokens);
      var lineEl = ui.el('div', str.length > 16 ? 'mc5-line mc5-line-sm' : 'mc5-line');
      var spans = [], i, tok, sp;
      for (i = 0; i < tokens.length; i += 1) {
        tok = tokens[i];
        if (i > 0 && tokens[i - 1] !== '(' && tok !== ')') lineEl.appendChild(document.createTextNode(' '));
        sp = ui.el('span', isOp(tok) ? 'mc5-tok mc5-op' : 'mc5-tok', String(tok));
        lineEl.appendChild(sp);
        spans.push(sp);
      }
      return { el: lineEl, spans: spans };
    }

    var first = makeLine(firstTokens);
    wrap.appendChild(first.el);
    lines.push(first);

    // 관 탭을 바꾸면 사다리가 문서에서 빠진다: 그 뒤 타이머는 아무것도 하지 않는다
    function gone() { return !document.body.contains(wrap); }

    function addLine(tokens, mark, done) {
      var prev = lines[lines.length - 1], i;
      if (mark && prev) {
        for (i = mark.from; i <= mark.to; i += 1) {
          if (prev.spans[i]) prev.spans[i].classList.add('mc5-mark');
        }
      }
      var finished = false;
      function commit() {
        if (finished) return;
        finished = true;
        if (gone()) return; // 관을 바꿔 사다리가 화면에서 빠졌으면 다음 단계로 넘기지 않음
        var nextLine = makeLine(tokens);
        wrap.appendChild(nextLine.el);
        lines.push(nextLine);
        if (typeof done === 'function') done();
      }
      var delay = reducedMotion() ? 0 : 300;
      if (delay === 0) { commit(); return; }
      global.setTimeout(commit, delay);
    }

    function numberOps(order, done) {
      var idx = 0, timer = null, finished = false;
      var stepMs = reducedMotion() ? 0 : 300;

      function putNum(k) {
        var sp = first.spans[order[k]];
        if (!sp || sp.querySelector('.mc5-num')) return;
        sp.appendChild(ui.el('sup', 'mc5-num', CIRCLED[k] || String(k + 1)));
      }

      function finishAll() {
        if (finished) return;
        finished = true;
        if (timer) global.clearTimeout(timer);
        wrap.removeEventListener('click', finishAll);
        for (var k = idx; k < order.length; k += 1) putNum(k);
        if (typeof done === 'function') done();
      }

      if (!order || !order.length) { finishAll(); return; }
      if (stepMs === 0) { finishAll(); return; }
      wrap.addEventListener('click', finishAll);

      function tick() {
        if (finished) return;
        if (gone()) { finished = true; wrap.removeEventListener('click', finishAll); return; }
        if (idx >= order.length) { finishAll(); return; }
        putNum(idx);
        idx += 1;
        timer = global.setTimeout(tick, stepMs);
      }
      tick();
    }

    return { el: wrap, addLine: addLine, numberOps: numberOps };
  }

  function mapWrongs(raw) {
    var out = [], i;
    for (i = 0; i < raw.length; i += 1) out.push({ token: raw[i].token, mistake: raw[i].mistake });
    return out;
  }

  function stepExplain(p, s) {
    var line = p.solution.lines[s], mark = p.solution.marks[s];
    var sub = C().text(line.slice(mark.from, mark.to + 1));
    if (s === p.steps.length - 1) return sub + ' = ' + josaNum(p.answer, 'ieyo') + '.';
    return sub + ' = ' + mark.value + ' → ' + p.steps[s].answerText;
  }

  function askWrap(ui, box, p, extra, counter, ladder, onSolved, opt) {
    var hasStep = typeof opt.step === 'number';
    var wrongsRaw = hasStep ? C().wrongChoices(p, opt.step) : C().wrongChoices(p);
    var ansText = hasStep ? p.steps[opt.step].answerText : p.answerText;
    var kindKey = hasStep ? p.kind + '-s' + (opt.step + 1) : p.kind;
    box.appendChild(global.MathDrill.ask(ui, {
      question: opt.question,
      answer: ansText,
      wrongs: mapWrongs(wrongsRaw),
      hints: HINTS,
      hint: HINTS.fix,
      explain: opt.explain,
      prefix: 'mix5',
      kind: kindKey,
      extra: extra,
      counter: counter,
      ladder: ladder || null,
      ladderLabel: ladder ? '🪜 계단 다시 보기' : undefined,
      column: true,
      onSolved: onSolved
    }));
  }

  // 1~5관 공통: 식 사다리 + 단계별 고르기 + 순서 번호
  function renderLadderProblem(ladderCard) {
    return function (ui, box, p, next, extra, counter, algoEl) {
      highlightRules(algoEl, p.tokens);
      var sol = p.solution;
      var ladder = stepLadder(ui, p.tokens, sol.marks.length);
      box.appendChild(ladder.el);
      var stepArea = ui.el('div', 'mc5-step-area');
      box.appendChild(stepArea);

      function askStep(s) {
        clearEl(stepArea);
        var isLast = s === p.steps.length - 1;
        askWrap(ui, stepArea, p, extra, isLast ? counter : null, ladderCard || null, function () {
          ladder.addLine(sol.lines[s + 1], sol.marks[s], function () {
            if (!isLast) askStep(s + 1);
            else ladder.numberOps(sol.order, next);
          });
        }, {
          step: s,
          question: isLast ? '답은?' : '다음 줄은?',
          explain: stepExplain(p, s)
        });
      }
      askStep(0);
    };
  }

  // 6관: 문장 카드 + 식 고르기 1번 → 정답 뒤 식 사다리 자동 계산 + 순서 번호
  function renderStoryProblem(ui, box, p, next, extra, counter, algoEl) {
    highlightRules(algoEl, null);
    var storyBox = ui.el('div', 'mc5-story');
    storyBox.appendChild(ui.el('p', 'mc5-story-text', p.story));
    storyBox.appendChild(ui.el('p', 'mc5-story-ask', p.ask));
    box.appendChild(storyBox);

    askWrap(ui, box, p, extra, counter, LADDER6, function () {
      highlightRules(algoEl, p.tokens);
      var sol = C().solve(p.tokens);
      var ladder = stepLadder(ui, p.tokens, sol.marks.length);
      box.appendChild(ladder.el);
      var s = 0;
      function playLine() {
        if (s >= sol.marks.length) { ladder.numberOps(sol.order, next); return; }
        var cur = s;
        s += 1;
        ladder.addLine(sol.lines[cur + 1], sol.marks[cur], playLine);
      }
      playLine();
    }, {
      question: '하나의 식으로 바르게 나타낸 것은?',
      explain: p.answerText + ' = ' + p.value
    });
  }

  // 7관: 식 한 줄 + 답 수 고르기 → 정답 뒤 식 한 줄에 순서 번호만
  function renderMixedProblem(ui, box, p, next, extra, counter, algoEl) {
    highlightRules(algoEl, p.tokens);
    var exprEl = global.MathDrill.expr(ui, p.text);
    box.appendChild(exprEl);

    askWrap(ui, box, p, extra, counter, null, function () {
      var oneLine = stepLadder(ui, p.tokens, 0);
      if (exprEl.parentNode === box) box.replaceChild(oneLine.el, exprEl);
      else box.insertBefore(oneLine.el, box.firstChild);
      oneLine.numberOps(p.solution.order, next);
    }, {
      question: '답은?',
      explain: p.text + ' = ' + p.answerText
    });
  }

  function buildLab(spec) {
    return {
      title: spec.title,
      icon: spec.icon,
      sub: spec.sub,
      render: function (container, ctx) {
        var ui = ctx.ui;
        var card = ui.card(spec.title);
        card.appendChild(ui.guide(spec.guide));
        var algoEl = global.MathDrill.algo(ui, RULES);
        card.appendChild(algoEl);
        card.appendChild(global.MathDrill.why(ui, spec.whyTitle, spec.whyBody));
        var area = ui.el('div', 'mc5-area');
        card.appendChild(area);
        container.appendChild(card);
        global.MathDrill.rounds(area, ctx, {
          counterKey: 'mixcalc',
          makeRound: spec.makeRound,
          renderProblem: function (box, p, next, extra, counter) {
            spec.renderProblem(ui, box, p, next, extra, counter, algoEl);
          }
        });
      }
    };
  }

  var lab1 = buildLab({
    title: '1관 + −',
    icon: '➕',
    sub: '앞에서부터·괄호',
    guide: '덧셈과 뺄셈이 섞인 식을 한 줄씩 계산해 보아요. 괄호가 있으면 괄호 안이 먼저예요.',
    whyTitle: '왜 앞에서부터 계산할까?',
    whyBody: '10 − 4 + 2는 10에서 4를 빼고 2를 더한 8이에요. 뒤부터 계산하면 10 − 6 = 4가 되어 다른 값이 나와요. 괄호가 있을 때만 괄호 안을 먼저 해요.',
    makeRound: function () { return C().makeRound(1, Math.random); },
    renderProblem: renderLadderProblem(LADDER1)
  });

  var lab2 = buildLab({
    title: '2관 × ÷',
    icon: '✖️',
    sub: '앞에서부터·괄호',
    guide: '곱셈과 나눗셈이 섞인 식도 앞에서부터 차례로, 괄호가 있으면 괄호 안을 먼저 계산해요.',
    whyTitle: '왜 × ÷도 앞에서부터 계산할까?',
    whyBody: '48 ÷ 6 × 2는 앞에서부터 하면 8 × 2 = 16이지만, 뒤부터 하면 48 ÷ 12 = 4가 돼요. 그래서 × ÷끼리는 앞에서부터 계산하기로 약속했어요.',
    makeRound: function () { return C().makeRound(2, Math.random); },
    renderProblem: renderLadderProblem(null)
  });

  var lab3 = buildLab({
    title: '3관 + − ×',
    icon: '🔢',
    sub: '+ −보다 × 먼저',
    guide: '덧셈·뺄셈과 곱셈이 섞인 식은 + −보다 ×를 먼저, 괄호가 있으면 괄호 안을 먼저 계산해요.',
    whyTitle: '왜 + −보다 ×를 먼저 할까?',
    whyBody: '사탕 12개에 4개씩 3봉지를 더하면 12 + 4 × 3이에요. 4개씩 3봉지(12개)를 먼저 구해야 전체 개수가 맞아요.',
    makeRound: function () { return C().makeRound(3, Math.random); },
    renderProblem: renderLadderProblem(LADDER3)
  });

  var lab4 = buildLab({
    title: '4관 + − ÷',
    icon: '➗',
    sub: '+ −보다 ÷ 먼저',
    guide: '덧셈·뺄셈과 나눗셈이 섞인 식은 + −보다 ÷를 먼저, 괄호가 있으면 괄호 안을 먼저 계산해요.',
    whyTitle: '왜 + −보다 ÷를 먼저 할까?',
    whyBody: '30 − 12 ÷ 4는 12개를 4묶음으로 나눈 3을 30에서 빼는 식이에요. 나눗셈 묶음을 먼저 계산해야 뜻이 맞아요.',
    makeRound: function () { return C().makeRound(4, Math.random); },
    renderProblem: renderLadderProblem(null)
  });

  var lab5 = buildLab({
    title: '5관 모두 섞인 식',
    icon: '🧩',
    sub: '괄호 → × ÷ → + −',
    guide: '사칙연산이 모두 섞인 식도 규칙은 하나! ( ) 안 → × ÷ 앞에서부터 → + − 앞에서부터예요.',
    whyTitle: '연산이 많아도 헷갈리지 않는 법',
    whyBody: '식을 한 번에 보지 말고, ( ) 안이 있는지 → × ÷ 중 맨 앞이 어디인지 → + − 중 맨 앞이 어디인지 차례로 찾으면 돼요.',
    makeRound: function () { return C().makeRound(5, Math.random); },
    renderProblem: renderLadderProblem(null)
  });

  var lab6 = buildLab({
    title: '6관 하나의 식으로',
    icon: '📝',
    sub: '문장을 식으로',
    guide: '문장을 천천히 읽고 알맞은 하나의 식을 골라 보아요. 먼저 계산할 + −는 괄호로 묶어요.',
    whyTitle: '언제 괄호를 쓸까?',
    whyBody: '+ −보다 × ÷를 먼저 계산하기 때문에, 덧셈이나 뺄셈을 먼저 해야 하는 상황에서는 반드시 ( )로 묶어 줘야 해요.',
    makeRound: function () { return C().makeRound(6, Math.random); },
    renderProblem: renderStoryProblem
  });

  var lab7 = buildLab({
    title: '7관 ⚡ 섞어 풀기',
    icon: '⚡',
    sub: '섞어 풀기 10문제',
    guide: '여러 가지 혼합 계산 10문제를 머릿속으로 순서를 떠올리며 풀어 보아요.',
    whyTitle: '사다리 없이도 풀 수 있어요',
    whyBody: '먼저 계산할 부분을 눈으로 찾아 값을 기억해 두고, 남은 식을 이어서 계산해 보세요. 맞히면 계산 순서 번호를 확인할 수 있어요.',
    makeRound: function () { return C().makeMixedRound(Math.random, 10); },
    renderProblem: renderMixedProblem
  });

  var labs = [lab1, lab2, lab3, lab4, lab5, lab6, lab7];

  function mount() {
    if (!global.MathExplorer || typeof global.MathExplorer.mount !== 'function') return null;
    return global.MathExplorer.mount({
      key: 'mixcalc',
      labs: labs,
      quiz: global.MathExplorerQuiz.create({
        grade: '5-1',
        unit: '1. 자연수의 혼합 계산',
        title: '혼합 계산 퀴즈 배틀',
        intro: '혼합 계산 퀴즈 배틀이에요. 계산 순서를 떠올리며 골라 볼까요?'
      })
    });
  }

  global.MixCalcLabs = { labs: labs, mount: mount };
})(typeof window !== 'undefined' ? window : globalThis);
