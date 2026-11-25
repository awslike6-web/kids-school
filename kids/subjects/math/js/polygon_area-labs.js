/* 초등 5-1 수학 6단원 다각형의 둘레와 넓이 탐험관 (1~7관 + 퀴즈 배틀 마운트) */
(function (global) {
  'use strict';

  var LADDER2 = {
    title: '🪜 넓이와 둘레',
    body: '가로 3 cm, 세로 2 cm인 직사각형에서 둘레는 테두리 길이 10 cm, 넓이는 안의 칸 6개인 6 cm²예요. 넓이는 칸 수, 둘레는 테두리 길이예요.',
    question: {
      question: '넓이는?',
      choices: ['6 cm²', '10 cm²', '5 cm²'],
      answer: 0,
      explain: '넓이는 안의 칸 수이므로 3 × 2 = 6 cm²예요.'
    }
  };

  var LADDER3 = {
    title: '🪜 1 m² 안의 칸',
    body: '1 m = 100 cm이므로 1 m² 안에는 1 cm² 칸이 가로 100개 × 세로 100줄 = 10000개 들어 있어요.',
    question: {
      question: '1 m²는 몇 cm²?',
      choices: ['10000 cm²', '100 cm²', '1000 cm²'],
      answer: 0,
      explain: '100 × 100 = 10000이므로 1 m² = 10000 cm²예요.'
    }
  };

  var LADDER4 = {
    title: '🪜 높이',
    body: '기울어진 변은 높이가 아니에요. 밑변과 직각으로 만나는 점선이 높이예요.',
    question: {
      question: '높이는 어느 선?',
      choices: ['점선', '기울어진 변', '밑변'],
      answer: 0,
      explain: '밑변과 직각으로 만나는 점선이 높이예요.'
    }
  };

  var LADDER5 = {
    title: '🪜 반으로',
    body: '똑같은 삼각형 두 개를 붙이면 평행사변형이 돼요. 그래서 삼각형의 넓이는 ÷ 2를 해요.',
    question: {
      question: '넓이가 24 cm²인 평행사변형을 반으로 나눈 삼각형은?',
      choices: ['12 cm²', '24 cm²', '48 cm²'],
      answer: 0,
      explain: '24 ÷ 2 = 12이므로 삼각형의 넓이는 12 cm²예요.'
    }
  };

  function C() { return global.PolyAreaCore; }
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

  function workLead(p) {
    if (p.measure === 'perimeter') return '둘레';
    if (p.measure === 'area') return '넓이';
    var idx = p.ask.indexOf('는 몇');
    return idx > 0 ? p.ask.slice(0, idx) : p.ask;
  }

  function buildAskEl(ui, p, highlight) {
    var node = ui.el('div', 'pa-ask');
    var text = p.kind === 'area-count' ? '한 칸 = 1 cm² · ' + p.ask : p.ask;
    if (!highlight) { node.textContent = text; return node; }
    var re = /(둘레|넓이|cm²|m²|cm|m)/g, last = 0, m;
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) node.appendChild(document.createTextNode(text.slice(last, m.index)));
      node.appendChild(ui.el('b', '', m[0]));
      last = re.lastIndex;
    }
    if (last < text.length) node.appendChild(document.createTextNode(text.slice(last)));
    return node;
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

  function askWrap(ui, host, p, opt) {
    var wrongsRaw = C().wrongChoices(p, opt.step);
    host.appendChild(global.MathDrill.ask(ui, {
      question: opt.question,
      answer: opt.answer,
      wrongs: mapWrongs(wrongsRaw),
      hints: buildHints(p, wrongsRaw),
      hint: C().hintFor(p, 'fix'),
      prefix: 'area5',
      kind: opt.kind,
      extra: opt.extra,
      counter: opt.counter,
      ladder: opt.ladder || null,
      ladderLabel: opt.ladder ? '🪜 계단 다시 보기' : undefined,
      column: Boolean(opt.column),
      onSolved: opt.onSolved
    }));
  }

  function makeRenderer(opts) {
    var ladderCard = opts.ladder || null;
    var isMixed = Boolean(opts.mixed);

    return function (ui, box, p, next, extra, counter) {
      var prob = ui.el('div', 'pa-problem');
      prob.appendChild(global.MathDrill.algo(ui, p.cardLines));

      var figWrap = ui.el('div', 'pa-figwrap');
      var svg = D().figure(p.fig);
      figWrap.appendChild(svg);
      prob.appendChild(figWrap);

      prob.appendChild(buildAskEl(ui, p, isMixed));
      var work = D().workLine(prob);
      var choiceArea = ui.el('div', 'pa-choices');
      prob.appendChild(choiceArea);
      box.appendChild(prob);

      var useTwoStep = !isMixed && Boolean(p.twoStep);
      if (!useTwoStep) {
        askWrap(ui, choiceArea, p, {
          step: 'final',
          question: '',
          answer: p.answerText,
          kind: p.kind,
          extra: extra,
          counter: counter,
          ladder: ladderCard,
          column: false,
          onSolved: function () {
            var line = workLead(p) + ' = ' + p.formula.text + ' = ' + p.answerText;
            if (p.kind === 'area-count') {
              D().countCells(svg, p.fig, function () {
                if (!document.body.contains(prob)) return;
                work.set(line);
                waitThenNext(prob, next);
              });
            } else {
              work.set(line);
              waitThenNext(prob, next);
            }
          }
        });
        return;
      }

      askWrap(ui, choiceArea, p, {
        step: 'f',
        question: '식은?',
        answer: p.formula.text,
        kind: p.kind + '-f',
        extra: false,
        counter: null,
        ladder: ladderCard,
        column: true,
        onSolved: function () {
          work.set('넓이 = ' + p.formula.text);
          clearEl(choiceArea);
          askWrap(ui, choiceArea, p, {
            step: 'v',
            question: '계산하면?',
            answer: p.answerText,
            kind: p.kind + '-v',
            extra: extra,
            counter: counter,
            ladder: ladderCard,
            column: false,
            onSolved: function () {
              work.append(' = ' + p.answerText);
              waitThenNext(prob, next);
            }
          });
        }
      });
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
        if (spec.whyTitle && spec.whyBody) {
          card.appendChild(global.MathDrill.why(ui, spec.whyTitle, spec.whyBody));
        }
        var area = ui.el('div', 'pa-area');
        card.appendChild(area);
        container.appendChild(card);
        global.MathDrill.rounds(area, ctx, {
          counterKey: 'polyarea',
          makeRound: spec.makeRound,
          renderProblem: function (box, p, next, extra, counter) {
            spec.renderProblem(ui, box, p, next, extra, counter);
          }
        });
      }
    };
  }

  var lab1 = buildLab({
    title: '1관 둘레',
    icon: '📏',
    sub: '정다각형·사각형 둘레',
    guide: '도형의 테두리를 따라 한 바퀴 길이를 구해 보아요. 같은 길이 빗금과 변의 수를 잘 살펴봐요.',
    makeRound: function () { return C().makeRound(1, Math.random); },
    renderProblem: makeRenderer({})
  });

  var lab2 = buildLab({
    title: '2관 넓이 세기',
    icon: '🟩',
    sub: '1 cm², 가로 × 세로',
    guide: '1 cm² 칸이 몇 개인지 세어 보고, 가로 × 세로로 직사각형과 정사각형의 넓이를 구해 보아요.',
    makeRound: function () { return C().makeRound(2, Math.random); },
    renderProblem: makeRenderer({ ladder: LADDER2 })
  });

  var lab3 = buildLab({
    title: '3관 큰 넓이 단위',
    icon: '🏟️',
    sub: '1 m² = 10000 cm²',
    guide: 'm² 단위로 넓이를 구하고, 1 m² = 10000 cm² 관계를 이용해 단위를 바꾸어 보아요.',
    whyTitle: '더 큰 단위 1 km²는?',
    whyBody: '1 km² = 1000 m × 1000 m = 1000000 m²예요. 가로와 세로가 모두 1000배이므로 넓이는 1000000배가 돼요.',
    makeRound: function () { return C().makeRound(3, Math.random); },
    renderProblem: makeRenderer({ ladder: LADDER3 })
  });

  var lab4 = buildLab({
    title: '4관 평행사변형',
    icon: '📐',
    sub: '밑변 × 높이',
    guide: '기울어진 변이 아니라 밑변과 직각인 점선(높이)을 찾아 식을 세우고 넓이를 구해 보아요.',
    whyTitle: '왜 밑변 × 높이일까?',
    whyBody: '평행사변형 한쪽 삼각형을 잘라 반대쪽에 붙이면 가로가 밑변, 세로가 높이인 직사각형(밑변 × 높이)이 돼요.',
    makeRound: function () { return C().makeRound(4, Math.random); },
    renderProblem: makeRenderer({ ladder: LADDER4 })
  });

  var lab5 = buildLab({
    title: '5관 삼각형',
    icon: '🔺',
    sub: '밑변 × 높이 ÷ 2',
    guide: '밑변과 직각인 높이를 찾고 ÷ 2를 잊지 말고 식과 넓이를 차례로 골라 보아요.',
    makeRound: function () { return C().makeRound(5, Math.random); },
    renderProblem: makeRenderer({ ladder: LADDER5 })
  });

  var lab6 = buildLab({
    title: '6관 마름모·사다리꼴',
    icon: '💠',
    sub: '대각선 공식, (윗변 + 아랫변)',
    guide: '마름모는 두 대각선으로, 사다리꼴은 (윗변 + 아랫변)과 높이로 식을 세우고 넓이를 구해 보아요.',
    whyTitle: '왜 이렇게 구할까?',
    whyBody: '마름모는 두 대각선으로 만든 직사각형의 반이에요. 사다리꼴 두 개를 붙이면 밑변이 (윗변 + 아랫변)인 평행사변형이 되므로 ÷ 2를 해요.',
    makeRound: function () { return C().makeRound(6, Math.random); },
    renderProblem: makeRenderer({})
  });

  var lab7 = buildLab({
    title: '7관 ⚡ 섞어 풀기',
    icon: '⚡',
    sub: '섞어 풀기 10문제',
    guide: '둘레와 넓이 10문제가 섞여 나와요. 굵게 표시된 「둘레」·「넓이」와 단위를 꼭 확인하고 골라 보아요.',
    makeRound: function () { return C().makeMixedRound(Math.random, 10); },
    renderProblem: makeRenderer({ mixed: true })
  });

  var labs = [lab1, lab2, lab3, lab4, lab5, lab6, lab7];

  function mount() {
    if (!global.MathExplorer || typeof global.MathExplorer.mount !== 'function') return null;
    return global.MathExplorer.mount({
      key: 'polyarea',
      labs: labs,
      quiz: global.MathExplorerQuiz.create({
        grade: '5-1',
        unit: '6. 다각형의 둘레와 넓이',
        title: '둘레와 넓이 퀴즈 배틀',
        intro: '다각형의 둘레와 넓이 퀴즈 배틀이에요. 공식과 높이를 떠올리며 골라 볼까요?'
      })
    });
  }

  global.PolyAreaLabs = { labs: labs, mount: mount };
})(typeof window !== 'undefined' ? window : globalThis);
