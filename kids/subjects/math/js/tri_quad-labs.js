/* 초등 4-2 수학 2·4·6단원 삼각형·사각형·다각형 탐험관 (1~7관 + 퀴즈 배틀 마운트) */
(function (global) {
  'use strict';

  var LADDER1 = {
    title: '🪜 두 각이 같아요',
    body: '이등변삼각형을 반으로 접으면 같은 두 변이 겹치고 두 밑각도 겹쳐 크기가 같아요.',
    question: {
      question: '한 밑각이 50°면 다른 밑각은?',
      choices: ['50°', '80°', '130°'],
      answer: 0,
      explain: '이등변삼각형의 두 밑각은 크기가 같으므로 다른 밑각도 50°예요.'
    }
  };

  var LADDER2 = {
    title: '🪜 180°',
    body: '삼각형 세 각의 합은 180°예요. 두 각을 알면 180°에서 두 각을 빼서 나머지 각을 구할 수 있어요.',
    question: {
      question: '두 각이 60°·70°면 나머지 각은?',
      choices: ['50°', '130°', '60°'],
      answer: 0,
      explain: '180° − 60° − 70° = 50°예요.'
    }
  };

  var LADDER3 = {
    title: '🪜 평행선 사이의 거리',
    body: '두 평행선을 잇는 선분 가운데 수직인 선분의 길이가 거리예요. 기울어진 선분은 더 길고, 한 줄에만 닿는 선분은 거리가 아니에요.',
    question: {
      question: '거리는 어느 선분?',
      choices: ['수직인 선분', '기울어진 선분', '가장 긴 선분'],
      answer: 0,
      explain: '두 평행선에 수직으로 만나는 선분의 길이가 거리예요.'
    }
  };

  var LADDER4 = {
    title: '🪜 이웃한 두 각 180°',
    body: '평행사변형의 이웃한 두 각을 더하면 180°, 마주 보는 두 각은 크기가 같아요.',
    question: {
      question: '평행사변형 한 각이 70°면 이웃한 각은?',
      choices: ['110°', '70°', '290°'],
      answer: 0,
      explain: '이웃한 두 각의 합이 180°이므로 180° − 70° = 110°예요.'
    }
  };

  var LADDER5 = {
    title: '🪜 사각형 가족',
    body: '사다리꼴 ⊃ 평행사변형 ⊃ 마름모·직사각형 ⊃ 정사각형이에요. 정사각형은 마름모, 직사각형, 평행사변형, 사다리꼴이라고 모두 부를 수 있어요.',
    question: {
      question: '정사각형을 부를 수 없는 이름은?',
      choices: ['삼각형', '마름모', '직사각형'],
      answer: 0,
      explain: '정사각형은 마름모와 직사각형이지만 삼각형은 아니에요.'
    }
  };

  var LADDER6 = {
    title: '🪜 한 꼭짓점에서',
    body: '자기 자신과 이웃한 두 꼭짓점에는 대각선을 못 그어요. 그래서 한 꼭짓점에서 그을 수 있는 대각선은 (꼭짓점 수 − 3)개예요.',
    question: {
      question: '육각형 한 꼭짓점에서 대각선은?',
      choices: ['3개', '5개', '4개'],
      answer: 0,
      explain: '육각형은 꼭짓점이 6개이므로 6 − 3 = 3개예요.'
    }
  };

  function C() { return global.TriQuadCore; }
  function D() { return global.PolyAreaDraw; }

  function clearEl(node) { while (node && node.firstChild) node.removeChild(node.firstChild); }

  function reducedMotion() {
    return Boolean(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function mapWrongs(raw) {
    var out = [], i;
    for (i = 0; i < raw.length; i += 1) out.push({ token: raw[i].token, mistake: raw[i].mistake });
    return out;
  }

  function buildHints(p, raw) {
    var map = {}, i, m;
    for (i = 0; i < raw.length; i += 1) {
      m = raw[i].mistake;
      if (m && !map[m]) map[m] = C().hintFor(p, m);
    }
    return map;
  }

  function waitThenNext(node, done) {
    var delay = reducedMotion() ? 0 : 600;
    if (delay === 0) { if (document.body.contains(node)) done(); return; }
    var finished = false, armed = false, timer = null;
    function finish() {
      if (finished) return;
      finished = true;
      if (timer) global.clearTimeout(timer);
      node.removeEventListener('click', onClick);
      if (!document.body.contains(node)) return;
      done();
    }
    function onClick() { if (armed) finish(); }
    node.addEventListener('click', onClick);
    global.setTimeout(function () { armed = true; }, 0);
    timer = global.setTimeout(finish, delay);
  }

  function askWrap(ui, host, p, stepIdx, opt) {
    var st = p.steps[stepIdx];
    var wrongsRaw = C().wrongChoices(p, stepIdx);
    var kindKey = p.steps.length > 1 ? p.kind + (stepIdx === 0 ? '-a' : '-b') : p.kind;
    host.appendChild(global.MathDrill.ask(ui, {
      question: st.ask,
      answer: st.answerText,
      wrongs: mapWrongs(wrongsRaw),
      hints: buildHints(p, wrongsRaw),
      hint: C().hintFor(p, 'fix'),
      prefix: 'tq4',
      kind: kindKey,
      extra: opt.extra,
      counter: opt.counter,
      ladder: opt.ladder || null,
      ladderLabel: opt.ladder ? '🪜 계단 다시 보기' : undefined,
      column: st.choiceKind === 'name',
      onSolved: opt.onSolved
    }));
  }

  function makeRenderer(opts) {
    var ladderCard = opts.ladder || null;

    return function (ui, box, p, next, extra, counter) {
      var prob = ui.el('div', 'tq-problem');
      prob.appendChild(global.MathDrill.algo(ui, p.cardLines));

      var figWrap = ui.el('div', 'pa-figwrap');
      var svg = D().figure(p.fig);
      figWrap.appendChild(svg);
      prob.appendChild(figWrap);

      var choiceArea = ui.el('div', 'tq-choices');
      prob.appendChild(choiceArea);
      box.appendChild(prob);

      function runStep(idx) {
        if (!document.body.contains(prob)) return;
        clearEl(choiceArea);
        var st = p.steps[idx];
        var isLast = idx === p.steps.length - 1;
        askWrap(ui, choiceArea, p, idx, {
          extra: isLast ? extra : false,
          counter: isLast ? counter : null,
          ladder: idx === 0 ? ladderCard : null,
          onSolved: function () {
            var rev = st.reveal;
            function proceed() {
              if (!document.body.contains(prob)) return;
              if (!isLast) runStep(idx + 1);
              else waitThenNext(prob, next);
            }
            if (rev && typeof rev.angle === 'number') {
              D().setAngle(svg, rev.angle, rev.text, rev.right);
              proceed();
            } else if (rev && rev.diagonals) {
              D().revealDiagonals(svg, p.fig, rev.diagonals, proceed);
            } else {
              proceed();
            }
          }
        });
      }

      runStep(0);
    };
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
        if (spec.whyTitle && spec.whyBody) card.appendChild(global.MathDrill.why(ui, spec.whyTitle, spec.whyBody));
        var area = ui.el('div', '');
        card.appendChild(area);
        container.appendChild(card);
        global.MathDrill.rounds(area, ctx, {
          counterKey: 'triquad',
          makeRound: spec.makeRound,
          renderProblem: function (box, p, next, extra, counter) {
            spec.renderProblem(ui, box, p, next, extra, counter);
          }
        });
      }
    };
  }

  var lab1 = buildLab({
    title: '1관 이등변·정삼각형',
    icon: '🔺',
    sub: '같은 변·같은 각',
    guide: '같은 길이 빗금과 두 밑각의 성질을 보고 변의 길이와 각의 크기를 구해 보아요.',
    makeRound: function () { return C().makeRound(1, Math.random); },
    renderProblem: makeRenderer({ ladder: LADDER1 })
  });

  var lab2 = buildLab({
    title: '2관 예각·직각·둔각삼각형',
    icon: '📐',
    sub: '각으로 나누기',
    guide: '세 각의 합 180°로 나머지 각을 먼저 구한 뒤, 삼각형의 이름을 골라 보아요.',
    whyTitle: '왜 세 각의 합이 180°일까?',
    whyBody: '삼각형의 세 각을 잘라 한 점에 모으면 일직선(180°)이 돼요.',
    makeRound: function () { return C().makeRound(2, Math.random); },
    renderProblem: makeRenderer({ ladder: LADDER2 })
  });

  var lab3 = buildLab({
    title: '3관 수직과 평행',
    icon: '📏',
    sub: '수선·평행선·거리',
    guide: '모눈과 직각 표시를 잘 살펴보고 수직인 변, 평행한 변의 쌍, 평행선 사이의 거리를 찾아보아요.',
    makeRound: function () { return C().makeRound(3, Math.random); },
    renderProblem: makeRenderer({ ladder: LADDER3 })
  });

  var lab4 = buildLab({
    title: '4관 사다리꼴·평행사변형',
    icon: '🔷',
    sub: '평행한 변, 각',
    guide: '평행 표시를 보고 사각형의 이름을 찾고, 평행사변형의 각과 둘레를 구해 보아요.',
    makeRound: function () { return C().makeRound(4, Math.random); },
    renderProblem: makeRenderer({ ladder: LADDER4 })
  });

  var lab5 = buildLab({
    title: '5관 마름모·직사각형·정사각형',
    icon: '💠',
    sub: '성질과 관계',
    guide: '마름모·직사각형·정사각형의 변과 각의 성질, 사각형 가족 관계를 떠올리며 풀어 보아요.',
    makeRound: function () { return C().makeRound(5, Math.random); },
    renderProblem: makeRenderer({ ladder: LADDER5 })
  });

  var lab6 = buildLab({
    title: '6관 다각형·대각선',
    icon: '🔶',
    sub: '이름, 대각선',
    guide: '변의 수와 정다각형 표시를 보고 이름을 맞히고, 대각선의 개수를 구해 보아요.',
    whyTitle: '왜 ÷ 2를 할까?',
    whyBody: '한 꼭짓점에서 (꼭짓점 수 − 3)개씩 그으면 대각선 하나를 두 꼭짓점에서 두 번 세게 되니 ÷ 2를 해요.',
    makeRound: function () { return C().makeRound(6, Math.random); },
    renderProblem: makeRenderer({ ladder: LADDER6 })
  });

  var lab7 = buildLab({
    title: '7관 ⚡ 섞어 풀기',
    icon: '⚡',
    sub: '섞어 풀기 10문제',
    guide: '삼각형·사각형·다각형 10문제가 섞여 나와요. 그림의 표시와 묻는 말을 잘 보고 골라 보아요.',
    makeRound: function () { return C().makeMixedRound(Math.random, 10); },
    renderProblem: makeRenderer({})
  });

  var labs = [lab1, lab2, lab3, lab4, lab5, lab6, lab7];

  function mount() {
    if (!global.MathExplorer || typeof global.MathExplorer.mount !== 'function') return null;
    return global.MathExplorer.mount({
      key: 'triquad',
      labs: labs,
      quiz: global.MathExplorerQuiz.create({
        grade: '4-2',
        unit: ['2. 삼각형', '4. 사각형', '6. 다각형'],
        title: '삼각형·사각형·다각형 퀴즈 배틀',
        intro: '삼각형·사각형·다각형 퀴즈 배틀이에요. 변과 각의 성질을 떠올리며 골라 볼까요?'
      })
    });
  }

  global.TriQuadLabs = { labs: labs, mount: mount };
})(typeof window !== 'undefined' ? window : globalThis);
