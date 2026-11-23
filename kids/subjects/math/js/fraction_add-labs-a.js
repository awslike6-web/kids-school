// 초등 4학년 분수 덧셈·뺄셈 그리기 도우미(FracAddDraw)와 1~3관
(function (global) {
  'use strict';
  // 분수 뒤 조사(분자에 맞춤): J('2/5', 'eul') → '2/5를'
  function J(t, type) { return global.MathExplorer && global.MathExplorer.josaFrac ? global.MathExplorer.josaFrac(t, type) : String(t); }

  var HINTS = {
    'add-denominators': '막대 칸 수(분모)는 그대로예요. 칠한 칸(분자)만 늘어나요.',
    'keep-improper': '꽉 찬 막대 하나는 1이에요. 1을 자연수로 옮겨 써요.',
    'no-carry-normalize': '분수 부분에 꽉 찬 막대 1개가 숨어 있어요. 1을 자연수로 옮겨요.',
    'add-instead': '빼기는 칠한 칸을 지우는 거예요.',
    'whole-only': '빼는 만큼 지우고 남은 조각을 다시 세어 봐요.',
    'no-whole-decrement': '1을 쪼개 썼으니 통막대가 하나 줄었어요.',
    'borrow-ten': '1은 10조각이 아니에요. 분모만큼 쪼개요.',
    'reverse-subtract': '위 분수에서 아래 분수를 빼요. 모자라면 자연수에서 1을 빌려 와요.',
    'off-by-one': '칠한 칸을 하나씩 다시 세어 봐요.'
  };

  var LADDER1 = {
    title: '🪜 단위분수',
    body: '1을 똑같이 나눈 것 중 하나를 단위분수라고 해요. 1/4은 1을 4조각으로 나눈 것 중 1조각이에요.',
    question: {
      question: '1을 똑같이 5조각으로 나눈 것 중 1조각은?',
      choices: ['1/5', '5', '1/2'],
      answer: 0,
      explain: '1을 5조각으로 나눈 것 중 1조각은 1/5이에요.'
    }
  };

  var LADDER3 = {
    title: '🪜 가분수와 대분수',
    body: '분자가 분모와 같거나 큰 분수는 가분수예요(7/4). 자연수와 진분수로 된 분수는 대분수예요(1과 3/4). 7/4 = 1과 3/4이에요.',
    question: {
      question: '5/3을 대분수로 나타내면?',
      choices: ['1과 2/3', '2와 1/3', '1과 5/3'],
      answer: 0,
      explain: '5/3에는 3/3(=1)이 하나 있고 2/3이 남아요.'
    }
  };

  function makeEl(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) { node.className = cls; }
    if (text !== undefined && text !== null) { node.textContent = text; }
    return node;
  }

  function clearNode(node) {
    while (node.firstChild) { node.removeChild(node.firstChild); }
  }

  // 분수 막대: 칸 d개, 앞 n칸 칠함, 색 클래스 cls
  function bar(d, n, cls) {
    var wrap = makeEl('div', 'fa-bar');
    var cells = [];
    var cur = 0;
    var i;
    for (i = 0; i < d; i++) {
      var cell = makeEl('div', 'fa-cell');
      cells.push(cell);
      wrap.appendChild(cell);
    }
    function set(nextN, nextCls) {
      var target = nextN < 0 ? 0 : (nextN > d ? d : nextN);
      var k;
      if (target === 0) {
        for (k = 0; k < d; k++) { cells[k].className = 'fa-cell'; }
      } else if (target > cur) {
        for (k = cur; k < target; k++) {
          cells[k].className = 'fa-cell on' + (nextCls ? ' ' + nextCls : '');
        }
      } else if (target < cur) {
        for (k = target; k < cur; k++) { cells[k].className = 'fa-cell gone'; } // 지운 칸은 점선으로 남김
      }
      cur = target;
    }
    set(n || 0, cls);
    return {
      el: wrap,
      set: set,
      get: function () { return cur; }
    };
  }

  // 자연수 통막대 줄
  function wholes(w) {
    var wrap = makeEl('div', 'fa-wholes');
    var count = 0;
    function set(nextW) {
      var target = nextW < 0 ? 0 : nextW;
      var i;
      clearNode(wrap);
      for (i = 0; i < target; i++) { wrap.appendChild(makeEl('div', 'fa-whole', '1')); }
      count = target;
    }
    set(w || 0);
    return {
      el: wrap,
      set: set,
      get: function () { return count; },
      last: function () { return wrap.lastElementChild || null; }
    };
  }

  // 1칸씩 칠하거나 지우는 단계 버튼
  function stepper(o) {
    var wrap = makeEl('div', 'fa-stepper');
    var isAdd = o.from < o.to;
    var dir = isAdd ? 1 : -1;
    var cur = o.from;
    var done = o.from === o.to;
    var text = o.label || (isAdd ? '＋ 1칸 칠하기' : '－ 1칸 지우기');
    var btn = makeEl('button', 'mx-btn primary fa-step-btn', text);
    btn.type = 'button';
    wrap.appendChild(btn);

    function finish() {
      done = true;
      btn.disabled = true;
      wrap.appendChild(makeEl('span', 'fa-step-done', '완성!'));
      if (o.onDone) { o.onDone(); }
    }

    if (done) { finish(); }

    btn.addEventListener('click', function () {
      if (done) { return; }
      cur += dir;
      if (o.carry) {
        var nextBar = o.bar.get() + dir;
        if (nextBar >= o.carry.d) {
          o.carry.wholes.set(o.carry.wholes.get() + 1);
          o.bar.set(0, o.cls);
        } else {
          o.bar.set(nextBar, o.cls);
        }
      } else {
        o.bar.set(cur, o.cls);
      }
      if (o.onStep) { o.onStep(cur); }
      if (cur === o.to) { finish(); }
    });
    return wrap;
  }

  // 1-2-3 계산 순서 카드
  // 1-2-3 카드·왜 그럴까·식 한 줄은 공용 MathDrill에 있다 (소수 탐험관과 함께 씀)
  function algo(ui, steps) { return global.MathDrill.algo(ui, steps); }
  function why(ui, title, body) { return global.MathDrill.why(ui, title, body); }
  function expr(ui, text) { return global.MathDrill.expr(ui, text); }

  var FracAddDraw = {
    bar: bar,
    wholes: wholes,
    stepper: stepper,
    algo: algo,
    why: why,
    expr: expr
  };

  function askWrap(ui, box, p, extra, counter, ladder, onSolved, opt) {
    box.appendChild(global.MathDrill.ask(ui, {
      question: opt.question,
      answer: opt.answer,
      wrongs: opt.wrongs || global.FractionCore.wrongChoices(p),
      hints: HINTS,
      hint: opt.hint,
      explain: opt.explain,
      prefix: 'frac4',
      kind: p.kind,
      extra: extra,
      counter: counter,
      ladder: ladder || null,
      onSolved: onSolved
    }));
  }

  // 관 공통 틀 생성기
  function buildLab(num, spec) {
    return {
      title: spec.title,
      icon: spec.icon,
      sub: spec.sub,
      render: function (container, ctx) {
        var ui = ctx.ui;
        var card = ui.card(spec.title);
        var state = { index: 0 };
        card.appendChild(ui.guide(spec.guide));
        card.appendChild(algo(ui, spec.steps));
        card.appendChild(why(ui, spec.whyTitle, spec.whyBody));
        var area = ui.el('div', 'fa-area');
        card.appendChild(area);
        container.appendChild(card);
        global.MathDrill.rounds(area, ctx, {
          counterKey: 'fracadd',
          makeRound: function () {
            state.index = 0;
            return global.FractionCore.makeRound(num, Math.random);
          },
          renderProblem: function (box, p, next, extra, counter) {
            spec.renderProblem(ui, box, p, next, extra, counter, state);
            state.index += 1;
          }
        });
      }
    };
  }

  // 1관: 단위분수 세기
  var lab1 = buildLab(1, {
    title: '1관 단위분수 세기',
    icon: '🍕',
    sub: '1/5이 몇 개?',
    guide: '＋ 버튼으로 한 칸씩 칠해 봐요.',
    steps: ['＋ 버튼으로 한 칸씩 칠해요', '칠한 칸이 몇 개인지 세요', '칠한 칸 수가 분자, 막대 칸 수가 분모예요'],
    whyTitle: '단위분수',
    whyBody: '1을 똑같이 나눈 것 중 하나가 단위분수예요. 3/5은 1/5이 3개예요.',
    renderProblem: function (ui, box, p, next, extra, counter, state) {
      var FC = global.FractionCore;
      var d = p.a.d;
      var n = p.a.n;
      var tok = FC.token(p.a);
      if (state.index < 2) {
        box.appendChild(ui.guide(tok + '만큼 칠해요'));
        var b = bar(d, 0, 'blue');
        box.appendChild(b.el);
        var countEl = ui.el('p', 'fa-count');
        ui.fill(countEl, '1/' + d + '이 0개');
        box.appendChild(countEl);
        box.appendChild(stepper({
          bar: b,
          from: 0,
          to: n,
          cls: 'blue',
          onStep: function (k) { ui.fill(countEl, '1/' + d + '이 ' + k + '개'); },
          onDone: function () {
            var wrongs = FC.wrongChoices(p).map(function (w) {
              return { token: w.value.n + '개', mistake: w.mistake };
            });
            askWrap(ui, box, p, extra, counter, LADDER1, next, {
              question: J(tok, 'eun') + ' 1/' + d + '이 몇 개일까요?',
              answer: n + '개',
              wrongs: wrongs,
              hint: '칠한 칸이 몇 개인지 세어 봐요.',
              explain: J(tok, 'eun') + ' 1/' + d + '이 ' + n + '개예요.'
            });
          }
        }));
      } else {
        var readyBar = bar(d, n, 'blue');
        box.appendChild(readyBar.el);
        askWrap(ui, box, p, extra, counter, LADDER1, next, {
          question: '칠한 부분을 분수로 나타내면?',
          answer: tok,
          hint: '칠한 칸 수가 분자, 막대 칸 수가 분모예요.',
          explain: d + '칸 중 ' + n + '칸을 칠했으니 ' + J(tok, 'ieyo') + '.'
        });
      }
    }
  });

  // 2관: 진분수 더하고 빼기
  var lab2 = buildLab(2, {
    title: '2관 진분수 더하고 빼기',
    icon: '➕',
    sub: '분자끼리',
    guide: '버튼으로 칸을 칠하거나 지워서 답을 찾아요.',
    steps: ['분모는 그대로', '분자끼리 더하거나 빼요'],
    whyTitle: '분모는 왜 그대로?',
    whyBody: '막대를 몇 칸으로 나눴는지(분모)는 바뀌지 않아요. 칠한 칸(분자)만 늘거나 줄어요.',
    renderProblem: function (ui, box, p, next, extra, counter) {
      var FC = global.FractionCore;
      var aTok = FC.token(p.a);
      var bTok = FC.token(p.b);
      var ansTok = FC.token(p.answer);
      var isAdd = p.op === '+';
      var qText = aTok + (isAdd ? ' + ' : ' - ') + bTok + ' = ?';
      var b = bar(p.a.d, p.a.n, 'blue');
      box.appendChild(expr(ui, qText));
      box.appendChild(b.el);
      box.appendChild(stepper({
        bar: b,
        from: p.a.n,
        to: isAdd ? p.a.n + p.b.n : p.a.n - p.b.n,
        cls: 'green',
        onDone: function () {
          askWrap(ui, box, p, extra, counter, null, next, {
            question: qText,
            answer: ansTok,
            hint: isAdd ? '칠한 칸을 모두 세어 봐요.' : '남은 칸이 몇 개인지 세어 봐요.',
            explain: '분모는 그대로 ' + p.a.d + ', 분자는 ' + p.a.n + (isAdd ? ' + ' : ' - ') +
              p.b.n + ' = ' + p.answer.n + (global.MathExplorer.hasBatchim(String(p.answer.n)) ? '이라서 ' : '라서 ') + J(ansTok, 'ieyo') + '.'
          });
        }
      }));
    }
  });

  // 3관: 1을 넘는 합
  var lab3 = buildLab(3, {
    title: '3관 1을 넘는 합',
    icon: '🧺',
    sub: '가분수→대분수',
    guide: '막대가 꽉 차면 1이 되어 위로 올라가요.',
    steps: ['분자끼리 더해요', '막대가 꽉 차면 1로 옮겨요', '남은 조각은 분수로 써요'],
    whyTitle: '꽉 찬 막대 = 1',
    whyBody: '분모가 6이면 6/6이 꽉 찬 막대 1개예요. 9/6은 꽉 찬 막대 1개와 3/6이에요.',
    renderProblem: function (ui, box, p, next, extra, counter) {
      var FC = global.FractionCore;
      var d = p.a.d;
      var sumN = p.a.n + p.b.n;
      var aTok = FC.token(p.a);
      var bTok = FC.token(p.b);
      var impTok = sumN + '/' + d;
      var ansTok = FC.token(p.answer);
      var w = wholes(0);
      var b = bar(d, p.a.n, 'blue');
      box.appendChild(expr(ui, aTok + ' + ' + bTok + ' = ?'));
      box.appendChild(w.el);
      box.appendChild(b.el);
      box.appendChild(stepper({
        bar: b,
        from: p.a.n,
        to: sumN,
        cls: 'green',
        carry: { wholes: w, d: d },
        onDone: function () {
          var isOne = p.kind === 'sum-one';
          askWrap(ui, box, p, extra, counter, LADDER3, next, {
            question: isOne ? J(impTok, 'eul') + ' 자연수로 쓰면?' : J(impTok, 'eul') + ' 대분수로 나타내면?',
            answer: ansTok,
            hint: '꽉 찬 막대는 1이에요. 남은 칸을 분수로 써요.',
            explain: isOne
              ? J(impTok, 'eun') + ' 꽉 찬 막대 1개라서 1이에요.'
              : J(impTok, 'eun') + ' 꽉 찬 막대 1개(' + d + '/' + d + ')와 ' + J(p.answer.n + '/' + d, 'i') + ' 있어서 ' + J(ansTok, 'ieyo') + '.'
          });
        }
      }));
    }
  });

  global.FracAddDraw = FracAddDraw;
  global.FracAddLabs = [lab1, lab2, lab3];
})(typeof window !== 'undefined' ? window : globalThis);
