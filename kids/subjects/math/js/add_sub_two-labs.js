// 초등 2학년 1학기 '덧셈과 뺄셈' 탐험관 1~6관 및 마운트
(function (global) {
  'use strict';

  var KEY = 'add2';
  var UNIT = '3. 덧셈과 뺄셈';
  var MINUS = '\u2212';
  var CORE = global.TwoDigitCore;
  var LADDER_LABEL = '🪜 1학년 계단 다시 보기';

  var HINTS = {
    'no-carry': '일이 10개면 십 하나로 올려요',
    'write-sum': '일의 자리에는 한 숫자만 써요',
    'over-carry': '일이 10개가 안 되면 그대로예요',
    'reverse-subtract': '위 수에서 아래 수를 빼요',
    'no-borrow-tens': '빌려 온 십 하나를 빼요',
    'zero-passthrough': '0에서는 십을 풀어 빼요',
    'over-borrow': '빌려 오지 않아도 돼요',
    'right-to-left': '앞에서부터 차례로 계산해요',
    'box-add': '□는 빼서 구해요',
    'mix-terms': '큰 수에서 빼요',
    'wrong-op': '뺄셈식으로 바꿔요',
    'off-by-one': '하나씩 다시 세어 봐요'
  };

  var LADDER1 = {
    title: '🪜 10을 만들어 더하기',
    body: '8 + 5는 8에 2를 더해 10, 남은 3을 더해 13이에요.',
    question: {
      question: '7 + 6은?',
      choices: ['13', '12', '14'],
      answer: 0,
      explain: '7에 3을 더해 10, 남은 3을 더해요.'
    }
  };

  var LADDER3 = {
    title: '🪜 10에서 빼기',
    body: '13 ' + MINUS + ' 5는 10에서 5를 빼 5, 남은 3을 더해 8이에요.',
    question: {
      question: '12 ' + MINUS + ' 4는?',
      choices: ['8', '6', '9'],
      answer: 0,
      explain: '10에서 4를 빼고 2를 더해요.'
    }
  };

  // 숫자·글자 뒤 조사 연결
  function J(text, type) {
    var me = global.MathExplorer;
    return me && me.josa ? me.josa(String(text), type) : String(text);
  }

  // 두 자리 수를 수 모형 자리값 객체로 변환
  function placeOf(n) {
    var v = n | 0;
    return { h: 0, t: (v - (v % 10)) / 10, o: v % 10 };
  }

  // Core 오답 배열을 MathDrill.ask의 token 형식으로 변환
  function toAskWrongs(list) {
    var out = [];
    var i;
    for (i = 0; i < list.length; i += 1) {
      out.push({ token: list[i].text, mistake: list[i].mistake });
    }
    return out;
  }

  // 에러리스 3지선다 공통 생성기
  function askWrap(ctx, p, extra, counter, onSolved, opt) {
    var o = opt || {};
    return global.MathDrill.ask(ctx.ui, {
      question: o.question,
      speak: o.speak,
      answer: o.answer !== undefined ? o.answer : p.answerText,
      wrongs: o.wrongs || toAskWrongs(CORE.wrongChoices(p)),
      hints: HINTS,
      hint: o.hint || '천천히 다시 생각해 볼까요?',
      explain: o.explain,
      prefix: KEY,
      kind: o.kind || p.kind,
      extra: extra,
      counter: counter,
      ladder: o.ladder || null,
      ladderLabel: LADDER_LABEL,
      column: Boolean(o.column),
      say: ctx.say,
      sayHint: true,
      onSolved: onSolved
    });
  }

  // 관 공통 틀 생성기 (1~5관)
  function buildLab(num, spec) {
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
        var area = ui.el('div', 'tw-area');
        card.appendChild(area);
        container.appendChild(card);
        global.MathDrill.rounds(area, ctx, {
          counterKey: KEY,
          perReward: 6,
          nextButton: true,
          makeRound: function () { return CORE.makeRound(num, Math.random); },
          renderProblem: function (box, p, next, extra, counter) {
            spec.renderProblem(ctx, box, p, next, extra, counter);
          }
        });
      }
    };
  }

  // 1관: 받아올림 덧셈 (두 자리 + 한 자리)
  function renderLab1(ctx, box, p, next, extra, counter) {
    var ui = ctx.ui;
    var expr = CORE.exprText(p);
    var m = global.BaseTenDraw.model(placeOf(p.a));
    box.appendChild(global.MathDrill.expr(ui, expr));
    box.appendChild(m.el);
    box.appendChild(global.BaseTenDraw.placeControls(ui, {
      model: m,
      places: ['o'],
      target: placeOf(p.answer),
      autoBundle: true,
      say: ctx.say,
      onDone: function () {
        box.appendChild(askWrap(ctx, p, extra, counter, next, {
          question: expr + ' = ?',
          speak: CORE.speakText(p),
          hint: '십 모형과 일 모형을 차례로 세어 봐요.',
          explain: expr + ' = ' + J(p.answerText, 'ieyo') + '.',
          ladder: LADDER1
        }));
      }
    }));
  }

  // 2관·4관 공용: 수 모형 그림 + 세로셈 칸판
  function renderColumnProblem(op, ctx, box, p, next, extra, counter) {
    var ui = ctx.ui;
    var expr = CORE.exprText(p);
    var t = global.MathDrill.track(KEY, p.kind);
    box.appendChild(global.MathDrill.expr(ui, expr));
    box.appendChild(global.BaseTenDraw.picture(p.a));
    box.appendChild(global.BaseTenDraw.picture(p.b));
    ctx.say(CORE.speakText(p));
    box.appendChild(global.ColumnDraw.column(ui, {
      a: p.a,
      b: p.b,
      op: op,
      big: true,
      onWrong: function (picked) { t.wrong(picked); },
      onDone: function () {
        t.done();
        if (extra && counter) counter.add();
        ctx.praise();
        box.appendChild(ui.guide(expr + ' = ' + p.answerText));
        next();
      }
    }));
  }

  // 3관: 받아내림 뺄셈 (두 자리 − 한 자리)
  function renderLab3(ctx, box, p, next, extra, counter) {
    var ui = ctx.ui;
    var expr = CORE.exprText(p);
    var m = global.BaseTenDraw.model(placeOf(p.a));
    box.appendChild(global.MathDrill.expr(ui, expr));
    box.appendChild(m.el);
    if (CORE.needsBorrow(p.a, p.b)) {
      box.appendChild(ui.guide((p.a % 10) + '개에서 ' + p.b + '개는 못 빼요'));
    }
    box.appendChild(global.BaseTenDraw.minusControls(ui, {
      model: m,
      remove: p.b,
      say: ctx.say,
      onDone: function () {
        box.appendChild(askWrap(ctx, p, extra, counter, next, {
          question: expr + ' = ?',
          speak: CORE.speakText(p),
          hint: '남은 십 모형과 일 모형을 세어 봐요.',
          explain: expr + ' = ' + J(p.answerText, 'ieyo') + '.',
          ladder: LADDER3
        }));
      }
    }));
  }

  // 5관: 세 수와 □
  function renderLab5(ctx, box, p, next, extra, counter) {
    var ui = ctx.ui;
    var expr = CORE.exprText(p);
    box.appendChild(global.MathDrill.expr(ui, expr));

    if (p.kind === 'three-terms') {
      var w1 = p.mid + 1;
      var w2 = p.mid - 1 >= 1 ? p.mid - 1 : p.mid + 2;
      var midExpr = p.terms[0] + ' ' + MINUS + ' ' + p.terms[1];
      box.appendChild(askWrap(ctx, p, false, null, function () {
        box.appendChild(askWrap(ctx, p, extra, counter, next, {
          question: expr + ' = ?',
          speak: CORE.speakText(p),
          hint: '앞에서 구한 ' + p.mid + '에 이어서 계산해요.',
          explain: expr + ' = ' + J(p.answerText, 'ieyo') + '.'
        }));
      }, {
        question: '앞의 두 수부터: ' + midExpr + ' = ?',
        speak: '앞의 두 수부터, ' + p.terms[0] + ' 빼기 ' + p.terms[1],
        answer: String(p.mid),
        wrongs: [
          { token: String(w1), mistake: 'off-by-one' },
          { token: String(w2), mistake: 'off-by-one' }
        ],
        kind: 'three-terms-mid',
        hint: '앞의 두 수부터 천천히 빼 봐요.',
        explain: midExpr + ' = ' + J(String(p.mid), 'ieyo') + '.'
      }));
      return;
    }

    if (p.kind === 'relation') {
      box.appendChild(askWrap(ctx, p, extra, counter, next, {
        question: '뺄셈식으로 바르게 나타낸 것은?',
        column: true,
        hint: '가장 큰 수 ' + p.sum + '에서 빼요.',
        explain: p.answerText + '로 나타낼 수 있어요.'
      }));
      return;
    }

    box.appendChild(ui.guide('□는 ' + p.sum + ' ' + MINUS + ' ' + p.a + '로 구해요'));
    box.appendChild(askWrap(ctx, p, extra, counter, next, {
      question: '□는 얼마일까요?',
      speak: CORE.speakText(p) + '. 네모는 얼마일까요?',
      hint: p.sum + '에서 ' + J(String(p.a), 'eul') + ' 빼서 구해요.',
      explain: p.sum + ' ' + MINUS + ' ' + p.a + ' = ' + p.answerText + '. □는 ' + J(p.answerText, 'ieyo') + '.'
    }));
  }

  var lab1 = buildLab(1, {
    title: '1관 받아올림 덧셈',
    icon: '➕',
    sub: '두 자리 + 한 자리',
    guide: '일 모형을 하나씩 더해 봐요.',
    steps: ['일 모형을 더해요', '10개가 되면 십 모형으로 묶어요'],
    whyTitle: '받아올림',
    whyBody: '일이 10개 모이면 십 하나가 돼요. 그래서 십의 자리가 1 커져요.',
    renderProblem: renderLab1
  });

  var lab2 = buildLab(2, {
    title: '2관 두 자리 + 두 자리',
    icon: '🧮',
    sub: '세로셈',
    guide: '같은 자리끼리 줄을 맞춰 더해 봐요.',
    steps: ['일끼리 먼저 더해요', '받아올림 1을 십에 더해요'],
    whyTitle: '세로셈',
    whyBody: '같은 자리끼리 줄을 맞춰 더해요.',
    renderProblem: function (ctx, box, p, next, extra, counter) {
      renderColumnProblem('+', ctx, box, p, next, extra, counter);
    }
  });

  var lab3 = buildLab(3, {
    title: '3관 받아내림 뺄셈',
    icon: '➖',
    sub: '두 자리 ' + MINUS + ' 한 자리',
    guide: '일 모형을 빼고, 모자라면 십 모형을 풀어 봐요.',
    steps: ['일 모형이 모자라면', '십 모형 하나를 풀어요'],
    whyTitle: '받아내림',
    whyBody: '십 하나를 풀면 일이 10개 생겨요. 그래서 뺄 수 있어요.',
    renderProblem: renderLab3
  });

  var lab4 = buildLab(4, {
    title: '4관 두 자리 ' + MINUS + ' 두 자리',
    icon: '🧱',
    sub: '세로셈',
    guide: '일끼리 먼저 빼고, 모자라면 십에서 빌려 와요.',
    steps: ['일끼리 먼저 빼요', '모자라면 십에서 빌려 와요'],
    whyTitle: '받아내림 표시',
    whyBody: '빌려 준 십의 자리는 하나 줄어요.',
    renderProblem: function (ctx, box, p, next, extra, counter) {
      renderColumnProblem(MINUS, ctx, box, p, next, extra, counter);
    }
  });

  var lab5 = buildLab(5, {
    title: '5관 세 수와 □',
    icon: '🧩',
    sub: '앞에서부터',
    guide: '세 수는 앞에서부터, □는 빼서 구해 봐요.',
    steps: ['앞의 두 수부터 계산해요', '□는 반대로 빼서 구해요'],
    whyTitle: '계산 순서',
    whyBody: '세 수는 앞에서부터 차례로 계산해요.',
    renderProblem: renderLab5
  });

  // 6관: 🎯 수 빙고
  var lab6 = {
    title: '6관 🎯 수 빙고',
    icon: '🎯',
    sub: '9칸 빙고',
    render: function (container, ctx) {
      var ui = ctx.ui;
      var card = ui.card('6관 🎯 수 빙고');
      card.appendChild(ui.guide('숫자를 판에 놓고, 들리는 식의 답을 터뜨려요!'));
      var area = ui.el('div', 'tw-area');
      card.appendChild(area);
      container.appendChild(card);
      global.MathBingo.render(area, ctx, {
        makeBingo: function () { return CORE.makeBingo(Math.random); },
        prefix: KEY,
        counterKey: KEY,
        perReward: 6
      });
    }
  };

  // 전체 1~6관과 퀴즈 배틀 마운트
  function mount() {
    global.MathExplorer.mount({
      key: KEY,
      rememberTab: true,
      wishBox: true,
      labs: [lab1, lab2, lab3, lab4, lab5, lab6],
      quiz: global.MathExplorerQuiz.create({
        grade: '2-1',
        unit: UNIT,
        title: '퀴즈 배틀',
        intro: '퀴즈 배틀이에요. 천천히 들어 보고 골라 볼까요?'
      })
    });
  }

  if (global.document && global.document.readyState === 'loading') {
    global.document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})(typeof window !== 'undefined' ? window : globalThis);
