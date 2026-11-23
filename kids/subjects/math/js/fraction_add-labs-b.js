// 초등 4학년 분수 덧셈·뺄셈 탐험관 4~7관 및 전체 마운트
(function (global) {
  'use strict';
  function J(t, type) { return global.MathExplorer && global.MathExplorer.josaFrac ? global.MathExplorer.josaFrac(t, type) : String(t); }

  var Draw = global.FracAddDraw;
  var FC = global.FractionCore;
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
  var LADDER_5 = {
    title: '🪜 1은 몇 분의 몇?',
    body: '1을 4조각으로 나누면 4/4예요. 분모와 분자가 같으면 1이에요.',
    question: {
      question: '1을 7조각으로 나누면 몇 분의 몇?',
      choices: ['7/7', '1/7', '7'],
      answer: 0,
      explain: '7조각이 모두 모이면 7/7 = 1이에요.'
    }
  };

  // 대분수 막대 묶음(위 통막대 + 아래 분수 막대)
  function mixedView(f, cls) {
    var wrap = global.document.createElement('div');
    wrap.className = 'fa-mixed';
    var wh = Draw.wholes(f.w);
    var br = Draw.bar(f.d, f.n, cls);
    wrap.appendChild(wh.el);
    wrap.appendChild(br.el);
    return { el: wrap, wholes: wh, bar: br };
  }

  // 문제 식 글자 만들기
  function exprText(p) {
    if (p.kind === 'unit-count') return '1/' + p.a.d + '이 ' + p.a.n + '개인 분수는?';
    return FC.token(p.a) + ' ' + p.op + ' ' + FC.token(p.b) + ' = ?';
  }

  // 정답 풀이 한 줄 만들기
  function explainText(p) {
    if (p.kind === 'unit-count') return '1/' + p.a.d + '이 ' + p.a.n + '개면 ' + J(FC.token(p.answer), 'ieyo') + '.';
    return FC.token(p.a) + ' ' + p.op + ' ' + FC.token(p.b) + ' = ' + J(FC.token(p.answer), 'ieyo') + '.';
  }

  // 통막대 뒤 조사(와/과) 얻기
  function josaFor(w) {
    var s = FC.token({ w: w, n: 1, d: 2 });
    return s.slice(String(w).length, String(w).length + 1);
  }

  // 마지막 통막대에 한 번만 누르는 쪼개기 연결
  function bindSplitTarget(target, onSplit) {
    if (!target) return;
    var done = false;
    target.className += ' fa-split-target';
    target.tabIndex = 0;
    target.setAttribute('role', 'button');
    function fire() {
      if (done) return;
      done = true;
      target.tabIndex = -1;
      onSplit();
    }
    target.addEventListener('click', fire);
    target.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fire(); }
    });
  }

  // 한 번 누르면 잠기는 단계 버튼 붙이기
  function appendStepButton(box, text, onStep) {
    var btn = global.document.createElement('button');
    btn.type = 'button';
    btn.className = 'mx-btn primary';
    btn.textContent = text;
    btn.addEventListener('click', function () {
      if (btn.disabled) return;
      btn.disabled = true;
      onStep();
    });
    box.appendChild(btn);
  }

  // 공통 3지선다 묻기
  function askFor(ui, p, extra, counter, ladder, next) {
    return global.MathDrill.ask(ui, {
      question: exprText(p),
      answer: FC.token(p.answer),
      wrongs: FC.wrongChoices(p),
      hints: HINTS,
      hint: '막대 그림을 다시 보며 차근차근 세어 봐요.',
      explain: explainText(p),
      prefix: 'frac4',
      kind: p.kind,
      extra: extra,
      counter: counter,
      ladder: ladder || null,
      onSolved: next
    });
  }

  // 4관: 대분수 더하기
  function renderLab4(ui, box, p, next, extra, counter) {
    var d = p.a.d;
    box.appendChild(Draw.expr(ui, exprText(p)));
    box.appendChild(mixedView(p.a, 'blue').el);
    box.appendChild(p.b.w > 0 ? mixedView(p.b, 'green').el : Draw.bar(p.b.d, p.b.n, 'green').el);
    var res = mixedView({ w: 0, n: 0, d: d }, 'blue');
    box.appendChild(res.el);
    appendStepButton(box, '① 자연수끼리 더하기', function () {
      res.wholes.set(p.a.w + p.b.w);
      res.bar.set(p.a.n, 'blue');
      box.appendChild(Draw.stepper({
        bar: res.bar, from: p.a.n, to: p.a.n + p.b.n, cls: 'green', label: '② 분수끼리 더하기',
        carry: { wholes: res.wholes, d: d },
        onDone: function () { box.appendChild(askFor(ui, p, extra, counter, null, next)); }
      }));
    });
  }

  // 5관: 1을 쪼개서 빼기
  function renderLab5(ui, box, p, next, extra, counter) {
    var d = p.b.d;
    box.appendChild(Draw.expr(ui, exprText(p)));
    var wh = Draw.wholes(p.a.w);
    box.appendChild(wh.el);
    var tip = ui.guide('통막대 하나를 눌러 쪼개요');
    box.appendChild(tip);
    bindSplitTarget(wh.last(), function () {
      wh.set(p.a.w - 1);
      var br = Draw.bar(d, d, 'blue');
      box.appendChild(br.el);
      ui.fill(tip, '1을 ' + d + '/' + d + '로 쪼갰어요. 빼는 만큼 지워요.');
      box.appendChild(Draw.stepper({
        bar: br, from: d, to: d - p.b.n, cls: 'blue', label: '빼는 만큼 지우기',
        onDone: function () { box.appendChild(askFor(ui, p, extra, counter, LADDER_5, next)); }
      }));
    });
  }

  // 6관: 받아내림 없는 대분수 빼기
  function renderMixedSub(ui, box, p, next, extra, counter) {
    var mv = mixedView(p.a, 'blue');
    box.appendChild(mv.el);
    box.appendChild(ui.choiceQuestion({
      question: '분수끼리 뺄 수 있나요?',
      choices: ['네, 뺄 수 있어요', '아니요, 모자라요'],
      answer: 0,
      fixed: true,
      hint: '위 분수의 분자가 더 커요.',
      onSolved: function () {
        box.appendChild(Draw.stepper({
          bar: mv.bar, from: p.a.n, to: p.a.n - p.b.n, cls: 'blue', label: '분수끼리 빼기',
          onDone: function () {
            appendStepButton(box, '자연수끼리 빼기', function () {
              mv.wholes.set(p.a.w - p.b.w);
              box.appendChild(askFor(ui, p, extra, counter, null, next));
            });
          }
        }));
      }
    }));
  }

  // 6관: 받아내림 있는 대분수 빼기
  function renderMixedSubBorrow(ui, box, p, next, extra, counter) {
    var d = p.a.d;
    var mv = mixedView(p.a, 'blue');
    box.appendChild(mv.el);
    box.appendChild(ui.choiceQuestion({
      question: '분수끼리 뺄 수 있나요?',
      choices: ['네, 뺄 수 있어요', '아니요, 모자라요'],
      answer: 1,
      fixed: true,
      hint: '위 분수의 분자가 더 작아요.',
      onSolved: function () {
        var tip = ui.guide('통막대 하나를 눌러 쪼개요');
        box.appendChild(tip);
        bindSplitTarget(mv.wholes.last(), function () {
          mv.wholes.set(p.a.w - 1);
          var fullBar = Draw.bar(d, d, 'blue');
          mv.el.insertBefore(fullBar.el, mv.bar.el);
          ui.fill(tip, '이제 ' + (p.a.w - 1) + josaFor(p.a.w - 1) + ' ' + (p.a.n + d) + '/' + d + '처럼 됐어요');
          box.appendChild(Draw.stepper({
            bar: mv.bar, from: p.a.n, to: 0, cls: 'blue', label: '원래 조각 지우기',
            onDone: function () {
              box.appendChild(Draw.stepper({
                bar: fullBar, from: d, to: d - (p.b.n - p.a.n), cls: 'blue', label: '쪼갠 조각 마저 지우기',
                onDone: function () {
                  appendStepButton(box, '자연수끼리 빼기', function () {
                    mv.wholes.set(p.a.w - 1 - p.b.w);
                    box.appendChild(askFor(ui, p, extra, counter, null, next));
                  });
                }
              }));
            }
          }));
        });
      }
    }));
  }

  // 6관: 자연수에서 대분수 빼기
  function renderWholeMinusMixed(ui, box, p, next, extra, counter) {
    var d = p.b.d;
    var wh = Draw.wholes(p.a.w);
    box.appendChild(wh.el);
    var tip = ui.guide('통막대 하나를 눌러 쪼개요');
    box.appendChild(tip);
    bindSplitTarget(wh.last(), function () {
      wh.set(p.a.w - 1);
      var br = Draw.bar(d, d, 'blue');
      box.appendChild(br.el);
      ui.fill(tip, '1을 ' + d + '/' + d + '로 쪼갰어요. 분수부터 지워요.');
      box.appendChild(Draw.stepper({
        bar: br, from: d, to: d - p.b.n, cls: 'blue', label: '분수 빼기',
        onDone: function () {
          appendStepButton(box, '자연수끼리 빼기', function () {
            wh.set(p.a.w - 1 - p.b.w);
            box.appendChild(askFor(ui, p, extra, counter, null, next));
          });
        }
      }));
    });
  }

  // 6관: 대분수 빼기 분기
  function renderLab6(ui, box, p, next, extra, counter) {
    box.appendChild(Draw.expr(ui, exprText(p)));
    if (p.kind === 'mixed-sub') renderMixedSub(ui, box, p, next, extra, counter);
    else if (p.kind === 'mixed-sub-borrow') renderMixedSubBorrow(ui, box, p, next, extra, counter);
    else renderWholeMinusMixed(ui, box, p, next, extra, counter);
  }

  // 7관: 연습 마당(조작 없이 바로 풀기)
  function renderLab7(ui, box, p, next, extra, counter) {
    box.appendChild(Draw.expr(ui, exprText(p)));
    box.appendChild(askFor(ui, p, extra, counter, null, next));
  }

  // 관 공통 틀 생성
  function makeLab(spec) {
    return {
      title: spec.title,
      icon: spec.icon,
      sub: spec.sub,
      render: function (container, ctx) {
        var ui = ctx.ui;
        var card = ui.card(spec.title);
        card.appendChild(ui.guide(spec.guide));
        card.appendChild(Draw.algo(ui, spec.algo));
        card.appendChild(Draw.why(ui, spec.whyTitle, spec.whyBody));
        var area = ui.el('div', 'fa-area');
        card.appendChild(area);
        container.appendChild(card);
        global.MathDrill.rounds(area, ctx, {
          counterKey: 'fracadd',
          makeRound: spec.makeRound,
          renderProblem: function (box, p, next, extra, counter) {
            spec.renderProblem(ui, box, p, next, extra, counter);
          }
        });
      }
    };
  }

  var lab4 = makeLab({
    title: '4관 대분수 더하기', icon: '🧱', sub: '자연수끼리·분수끼리',
    guide: '자연수부터 더하고 분수 막대를 채워 보아요.',
    algo: ['자연수끼리 더해요', '분수끼리 더해요', '분수가 1이 되거나 넘으면 1을 자연수로 옮겨요'],
    whyTitle: '왜 따로 더할까?',
    whyBody: '대분수는 자연수와 분수가 붙어 있어요. 자연수는 자연수끼리, 분수는 분수끼리 더하면 쉬워요.',
    makeRound: function () { return FC.makeRound(4, Math.random); },
    renderProblem: renderLab4
  });

  var lab5 = makeLab({
    title: '5관 1을 쪼개서 빼기', icon: '✂️', sub: '1 − 분수',
    guide: '통막대 1개를 눌러 분모만큼 쪼갠 뒤 지워 보아요.',
    algo: ['통막대 1개를 분모만큼 쪼개요', '빼는 만큼 지워요', '남은 통막대와 조각을 세요'],
    whyTitle: '왜 쪼갤까?',
    whyBody: '1에서는 조각을 바로 지울 수 없어요. 1을 4/4처럼 분모만큼 쪼개면 지울 수 있어요.',
    makeRound: function () { return FC.makeRound(5, Math.random); },
    renderProblem: renderLab5
  });

  var lab6 = makeLab({
    title: '6관 대분수 빼기', icon: '🪓', sub: '받아내림',
    guide: '분수끼리 뺄 수 있는지 보고, 모자라면 1을 쪼개 보아요.',
    algo: ['분수끼리 뺄 수 있나 봐요', '못 빼면 자연수 1을 쪼개 분수에 보태요', '자연수끼리, 분수끼리 빼요'],
    whyTitle: '빌려 오기',
    whyBody: '3과 1/5에서 3/5을 빼려면 조각이 모자라요. 자연수 1을 5/5로 쪼개면 2와 6/5가 돼요.',
    makeRound: function () { return FC.makeRound(6, Math.random); },
    renderProblem: renderLab6
  });

  var lab7 = makeLab({
    title: '7관 ⚡ 연습 마당', icon: '⚡', sub: '섞어 풀기 10문제',
    guide: '10문제를 막대를 떠올리며 차근차근 풀어 보아요.',
    algo: ['식을 읽어요', '막대를 떠올려요', '답을 골라요'],
    whyTitle: '많이 풀수록 쉬워져요',
    whyBody: '같은 방법을 여러 번 쓰면 손에 익어요. 틀려도 괜찮아요, 다시 고르면 돼요.',
    makeRound: function () { return FC.makeMixedRound(Math.random, 10); },
    renderProblem: renderLab7
  });

  // 1~7관과 퀴즈 배틀 조립
  function mount() {
    global.MathExplorer.mount({
      key: 'fracadd',
      fractions: true,
      labs: global.FracAddLabs.concat([lab4, lab5, lab6, lab7]),
      quiz: global.MathExplorerQuiz.create({
        grade: '4-2',
        unit: '1. 분수의 덧셈과 뺄셈',
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
