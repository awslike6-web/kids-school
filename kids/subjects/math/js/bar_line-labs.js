/* 초등 4학년 막대그래프(4-1 5단원)·꺾은선그래프(4-2 5단원) 탐험관 (1~7관 + 퀴즈 배틀 마운트) */
(function (global) {
  'use strict';

  var LADDER1 = {
    title: '🪜 눈금 한 칸',
    body: '0과 10 사이가 5칸이면 한 칸은 10 ÷ 5 = 2예요. 숫자를 칸 수로 나누면 눈금 한 칸의 크기를 구할 수 있어요.',
    question: {
      question: '0과 20 사이가 4칸이면 한 칸은?',
      choices: ['5', '20', '4'],
      answer: 0,
      explain: '20 ÷ 4 = 5이므로 눈금 한 칸은 5예요.'
    }
  };

  var LADDER3 = {
    title: '🪜 합계에서 빼기',
    body: '빠진 값은 합계에서 나머지 값을 모두 더한 것을 빼서 구해요.',
    question: {
      question: '합계 20명, 나머지가 6명·5명·4명이면 빠진 값은?',
      choices: ['5명', '15명', '20명'],
      answer: 0,
      explain: '6 + 5 + 4 = 15명이므로 20 − 15 = 5명이에요.'
    }
  };

  var LADDER4 = {
    title: '🪜 점과 선',
    body: '꺾은선그래프는 시간에 따라 변하는 모양을 점과 선으로 나타내요. 점의 높이가 그때의 값이에요.',
    question: {
      question: '꺾은선그래프가 잘 보여 주는 것은?',
      choices: ['시간에 따른 변화', '항목별 크기만', '전체 합계'],
      answer: 0,
      explain: '꺾은선그래프는 시간에 따라 값이 어떻게 변하는지 한눈에 보여 줘요.'
    }
  };

  var LADDER5 = {
    title: '🪜 기울기',
    body: '올라간 선 중 가장 많이 기울어진 곳이 가장 많이 늘어난 때, 내려간 선 중 가장 많이 기울어진 곳이 가장 많이 줄어든 때예요.',
    question: {
      question: '가장 많이 늘어난 때는 어디?',
      choices: ['가장 가파르게 올라간 곳', '가장 높은 곳', '가장 낮은 곳'],
      answer: 0,
      explain: '점의 높이가 아니라 선이 가장 가파르게 올라간 구간이 가장 많이 늘어난 때예요.'
    }
  };

  var LADDER6 = {
    title: '🪜 물결선',
    body: '0부터 필요 없는 부분을 줄여 물결선으로 나타내요. 값을 읽을 때는 물결선 위 첫 숫자부터 세어요.',
    question: {
      question: '물결선은 무엇을 나타내나요?',
      choices: ['줄여서 나타낸 부분', '값이 0인 곳', '가장 큰 값'],
      answer: 0,
      explain: '물결선은 필요 없는 눈금 부분을 줄여서 나타낸 표시예요.'
    }
  };

  function C() { return global.BarLineCore; }
  function D() { return global.BarLineDraw; }

  function clearEl(node) { while (node && node.firstChild) node.removeChild(node.firstChild); }

  function reducedMotion() {
    return Boolean(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function unitFromAxis(axisUnit) {
    if (!axisUnit) return '';
    return String(axisUnit).replace(/[()]/g, '');
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

  function buildTable(rows) {
    var tbl = document.createElement('table');
    tbl.className = 'gr-table';
    var thead = document.createElement('thead'), tr1 = document.createElement('tr');
    var tbody = document.createElement('tbody'), tr2 = document.createElement('tr');
    for (var i = 0; i < rows.length; i += 1) {
      var th = document.createElement('th');
      th.textContent = String(rows[i][0]);
      tr1.appendChild(th);
      var td = document.createElement('td');
      td.textContent = String(rows[i][1]);
      tr2.appendChild(td);
    }
    thead.appendChild(tr1);
    tbody.appendChild(tr2);
    tbl.appendChild(thead);
    tbl.appendChild(tbody);
    return tbl;
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
      prefix: 'gr4',
      kind: kindKey,
      extra: opt.extra,
      counter: opt.counter,
      ladder: opt.ladder || null,
      ladderLabel: opt.ladder ? '🪜 계단 다시 보기' : undefined,
      column: st.choiceKind === 'name',
      onSolved: opt.onSolved
    }));
  }

  function runReveal(svg, p, rev, done) {
    if (!rev) { done(); return; }
    if (rev.highlight) { D().highlight(svg, rev.highlight, done); return; }
    if (typeof rev.bar === 'number') { D().revealBar(svg, p.chart, rev.bar, done); return; }
    if (rev.arrow) { D().arrow(svg, p.chart, rev.arrow[0], rev.arrow[1], rev.arrow[2], done); return; }
    if (rev.mid) { D().revealMid(svg, p.chart, rev.mid[0], rev.mid[1], done); return; }
    done();
  }

  function makeRenderer(opts) {
    var ladderCard = opts.ladder || null;

    return function (ui, box, p, next, extra, counter) {
      var prob = ui.el('div', 'gr-problem');
      prob.appendChild(global.MathDrill.algo(ui, p.cardLines));

      if (p.table && p.table.length) prob.appendChild(buildTable(p.table));
      if (p.total !== null && p.total !== undefined) {
        prob.appendChild(ui.el('div', 'gr-total', '합계 ' + p.total + unitFromAxis(p.chart && p.chart.axisUnit)));
      }

      var figWrap = ui.el('div', 'gr-figwrap');
      var svg = D().chart(p.chart);
      figWrap.appendChild(svg);
      prob.appendChild(figWrap);

      var choiceArea = ui.el('div', 'gr-choices');
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
            function proceed() {
              if (!document.body.contains(prob)) return;
              if (!isLast) runStep(idx + 1);
              else waitThenNext(prob, next);
            }
            runReveal(svg, p, st.reveal, proceed);
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
          counterKey: 'barline',
          makeRound: spec.makeRound,
          renderProblem: function (box, p, next, extra, counter) {
            spec.renderProblem(ui, box, p, next, extra, counter);
          }
        });
      }
    };
  }

  var lab1 = buildLab({
    title: '1관 막대그래프 읽기',
    icon: '📊',
    sub: '눈금 한 칸, 막대 값',
    guide: '눈금 한 칸의 크기를 먼저 구하고, 세로 막대와 가로 막대의 값을 읽어 보아요.',
    makeRound: function () { return C().makeRound(1, Math.random); },
    renderProblem: makeRenderer({ ladder: LADDER1 })
  });

  var lab2 = buildLab({
    title: '2관 막대그래프 비교',
    icon: '📏',
    sub: '가장 많은 것, 차이, 몇 배',
    guide: '막대 길이를 견주어 가장 많거나 적은 항목, 두 값의 차이, 몇 배인지 구해 보아요.',
    makeRound: function () { return C().makeRound(2, Math.random); },
    renderProblem: makeRenderer({})
  });

  var lab3 = buildLab({
    title: '3관 막대그래프 나타내기',
    icon: '🧱',
    sub: '표 → 막대, 빠진 자료',
    guide: '표를 보고 막대를 몇 칸으로 그릴지 구하고, 합계에서 나머지 값을 빼서 빠진 자료를 찾아보아요.',
    makeRound: function () { return C().makeRound(3, Math.random); },
    renderProblem: makeRenderer({ ladder: LADDER3 })
  });

  var lab4 = buildLab({
    title: '4관 꺾은선그래프 읽기',
    icon: '📈',
    sub: '눈금, 점의 값',
    guide: '세로 눈금 한 칸의 크기를 확인하고, 원하는 시각이나 달에 찍힌 점의 값을 읽어 보아요.',
    whyTitle: '막대그래프와 꺾은선그래프',
    whyBody: '막대그래프는 크기를 견주고, 꺾은선그래프는 시간에 따른 변화를 보여 줘요.',
    makeRound: function () { return C().makeRound(4, Math.random); },
    renderProblem: makeRenderer({ ladder: LADDER4 })
  });

  var lab5 = buildLab({
    title: '5관 꺾은선그래프 변화',
    icon: '🔍',
    sub: '변화량, 기울기, 가운데 값',
    guide: '얼마나 늘어나고 줄어들었는지, 선이 가장 가파른 때와 가운데 시각의 값을 찾아보아요.',
    whyTitle: '가운데 시각의 값 짐작하기',
    whyBody: '가운데 시각의 값은 두 점을 이은 선의 가운데쯤이에요.',
    makeRound: function () { return C().makeRound(5, Math.random); },
    renderProblem: makeRenderer({ ladder: LADDER5 })
  });

  var lab6 = buildLab({
    title: '6관 물결선',
    icon: '〰️',
    sub: '줄여서 나타낸 그래프',
    guide: '물결선 아래는 줄여서 나타낸 부분이에요. 물결선 위 첫 숫자부터 눈금을 세어 읽어 보아요.',
    makeRound: function () { return C().makeRound(6, Math.random); },
    renderProblem: makeRenderer({ ladder: LADDER6 })
  });

  var lab7 = buildLab({
    title: '7관 ⚡ 섞어 풀기',
    icon: '⚡',
    sub: '섞어 풀기 10문제',
    guide: '막대그래프와 꺾은선그래프 10문제가 섞여 나와요. 눈금과 묻는 말을 잘 보고 골라 보아요.',
    makeRound: function () { return C().makeMixedRound(Math.random, 10); },
    renderProblem: makeRenderer({})
  });

  var labs = [lab1, lab2, lab3, lab4, lab5, lab6, lab7];

  function mount() {
    if (!global.MathExplorer || typeof global.MathExplorer.mount !== 'function') return null;
    return global.MathExplorer.mount({
      key: 'barline',
      labs: labs,
      quiz: global.MathExplorerQuiz.create({
        grade: '4-1',
        unit: [{ grade: '4-1', unit: '5. 막대그래프' }, { grade: '4-2', unit: '5. 꺾은선그래프' }],
        title: '막대그래프·꺾은선그래프 퀴즈 배틀',
        intro: '막대그래프·꺾은선그래프 퀴즈 배틀이에요. 눈금 한 칸과 변화 모양을 떠올리며 골라 볼까요?'
      })
    });
  }

  global.BarLineLabs = { labs: labs, mount: mount };
})(typeof window !== 'undefined' ? window : globalThis);
