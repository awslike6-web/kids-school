// 초등 2학년 2학기 '5. 표와 그래프' 탐험관 1~7관 및 마운트 (TableGraphLabs, docs/math_2-2_graph_spec.md)
(function (global) {
  'use strict';

  var KEY = 'graph2';
  var CORE = global.TableGraphCore;
  var DRAW = global.TableGraphDraw;

  function sayFor(ctx) {
    return function (t) {
      if (ctx && typeof ctx.say === 'function') {
        var clean = CORE.speakText(t);
        if (clean) ctx.say(clean);
      }
    };
  }

  function makeTracker(kind) {
    if (global.MathDrill && typeof global.MathDrill.track === 'function') {
      return global.MathDrill.track(KEY, kind);
    }
    return { wrong: function () {}, done: function () {} };
  }

  function topicOf(data) {
    return (data && data.topic) || { word: '종류', unit: '명' };
  }

  function buildTable(data, opt) {
    var o = opt || {};
    var topic = topicOf(data);
    var unit = topic.unit || '명';
    return DRAW.table({
      head: topic.word,
      rowHead: unit === '개' ? '개수(개)' : '학생 수(명)',
      kinds: data.kinds,
      values: data.values,
      total: data.total,
      blank: o.blank !== undefined ? o.blank : null,
      noTotal: Boolean(o.noTotal)
    });
  }

  function buildGraph(p, opt) {
    var o = opt || {};
    var data = o.data || p.data;
    var topic = topicOf(data);
    var unit = topic.unit || '명';
    return DRAW.graph({
      orient: o.orient || p.orient || 'v',
      kinds: data.kinds,
      values: o.values || data.values,
      rows: o.rows !== undefined ? o.rows : p.rows,
      mark: o.mark || p.mark || '○',
      axisLabel: '(' + unit + ')',
      kindHead: topic.word,
      editable: o.editable || null
    });
  }

  function surveyCards(p) {
    var out = [], i, item, k;
    for (i = 0; i < p.survey.length; i += 1) {
      item = p.survey[i];
      k = p.data.kinds[item.kind] || {};
      out.push({ name: item.name, emoji: k.emoji || '', label: k.label || '' });
    }
    return DRAW.cards(out, { cols: 3 });
  }

  function findKindIndex(kinds, label) {
    for (var i = 0; i < kinds.length; i += 1) {
      if (kinds[i] && kinds[i].label === label) return i;
    }
    return 0;
  }

  function extremeVal(values, wantMax) {
    var v = values[0], i;
    for (i = 1; i < values.length; i += 1) {
      if (wantMax ? (values[i] > v) : (values[i] < v)) v = values[i];
    }
    return v;
  }

  var LADDER1 = {
    title: '🪜 같은 것끼리 세기',
    body: '하나씩 손가락으로 짚으며 세면 빠뜨리지 않아요.',
    question: {
      question: '🍎🍌🍎🍎🍌 사과는 몇 개?',
      choices: ['3개', '2개', '5개'],
      answer: 0,
      explain: '사과만 하나씩 세어 보면 모두 3개예요.'
    }
  };

  var LADDER3 = {
    title: '🪜 ○ 하나는 한 명',
    body: '그래프의 ○ 하나는 한 명이에요. ○ 수를 세면 돼요.',
    question: {
      question: '○가 4개 있으면 몇 명?',
      choices: ['4명', '5명', '1명'],
      answer: 0,
      explain: '동그라미 하나가 한 명이니까 4개면 4명이에요.'
    }
  };

  var LADDER4 = {
    title: '🪜 아래부터 차곡차곡',
    body: '그래프는 아래 칸부터 빈칸 없이 하나씩 그려요.',
    question: {
      question: '○를 처음 그리는 칸은?',
      choices: ['맨 아래 칸', '맨 위 칸', '가운데 칸'],
      answer: 0,
      explain: '세로 그래프는 맨 아래 칸부터 위로 하나씩 그려요.'
    }
  };

  function explainOf(p) {
    var label, topic, maxV, minV;
    if (p.kind === 'count-kind') {
      label = p.data.kinds[p.target].label;
      return label + CORE.josa(label, '은/는') + ' 모두 ' + p.answerText + '예요.';
    }
    if (p.kind === 'table-total') {
      return '표의 수를 모두 더하면 합계는 ' + p.answerText + '이에요.';
    }
    if (p.kind === 'table-blank') {
      return '합계 ' + p.data.total + '명에서 나머지를 빼면 ' + p.answerText + '이에요.';
    }
    if (p.kind === 'survey-count') {
      label = p.data.kinds[p.target].label;
      return label + CORE.josa(label, '을/를') + ' 고른 친구는 ' + p.answerText + '이에요.';
    }
    if (p.kind === 'survey-who') {
      label = p.data.kinds[p.target].label;
      return p.answerText + CORE.josa(p.answerText, '이/가') + ' ' + label + CORE.josa(label, '을/를') + ' 골랐어요.';
    }
    if (p.kind === 'survey-most') {
      return p.answerText + CORE.josa(p.answerText, '을/를') + ' 고른 친구가 가장 많아요.';
    }
    if (p.kind === 'graph-count') {
      label = p.data.kinds[p.target].label;
      return label + ' 기둥의 표시를 세면 ' + p.answerText + '이에요.';
    }
    if (p.kind === 'graph-most') {
      return p.answerText + CORE.josa(p.answerText, '이/가') + ' 가장 ' + (p.most ? '많아요.' : '적어요.');
    }
    if (p.kind === 'graph-diff') {
      return p.data.values[p.a] + '명에서 ' + p.data.values[p.b] + '명을 빼면 ' + p.answerText + ' 더 많아요.';
    }
    if (p.kind === 'draw-col') {
      label = p.data.kinds[p.col].label;
      return label + ' 칸에 표시를 ' + p.data.values[p.col] + '개 그려 완성했어요.';
    }
    if (p.kind === 'graph-rows') {
      maxV = extremeVal(p.data.values, true);
      return '가장 큰 수가 ' + maxV + '이라서 세로 칸이 ' + p.answerText + ' 필요해요.';
    }
    if (p.kind === 'more-than') {
      topic = topicOf(p.data);
      return p.base + '명보다 많은 ' + topic.word + CORE.josa(topic.word, '은/는') + ' 모두 ' + p.answerText + '예요.';
    }
    if (p.kind === 'which-easy') {
      if (p.tool === 'survey') return '조사한 자료를 보면 누가 무엇을 골랐는지 알 수 있어요.';
      if (p.tool === 'table') return '표를 보면 합계가 바로 나와서 모두 몇 명인지 알기 쉬워요.';
      return '그래프는 높이로 바로 보여서 가장 많은 것을 알기 쉬워요.';
    }
    if (p.kind === 'most-least-diff') {
      maxV = extremeVal(p.data.values, true);
      minV = extremeVal(p.data.values, false);
      return '가장 많은 ' + maxV + '명에서 가장 적은 ' + minV + '명을 빼면 ' + p.answerText + '이에요.';
    }
    return p.answerText + '이에요.';
  }

  // 공용 3지선다 묻기 (CORE.hintFor 연동, 질문·힌트 자동 읽기)
  function askWrap(box, ctx, p, extra, counter, next, opt) {
    var cfg = opt || {};
    var rawWrongs = cfg.rawWrongs || CORE.wrongChoices(p);
    var wrongs = [];
    var hints = {};
    var i, key;
    for (i = 0; i < rawWrongs.length; i += 1) {
      key = rawWrongs[i].mistake + ':' + i;
      wrongs.push({ token: rawWrongs[i].text, mistake: key });
      hints[key] = CORE.hintFor(p, rawWrongs[i].mistake, rawWrongs[i].text);
    }
    var o = {
      question: cfg.question !== undefined ? cfg.question : p.question,
      answer: cfg.answer !== undefined ? cfg.answer : p.answerText,
      wrongs: cfg.wrongs || wrongs,
      hints: cfg.hints || hints,
      hint: cfg.hint || '표와 그래프를 다시 살펴봐요.',
      explain: cfg.explain !== undefined ? cfg.explain : explainOf(p),
      prefix: KEY,
      kind: cfg.kind || p.kind,
      extra: cfg.extra !== undefined ? cfg.extra : extra,
      counter: counter,
      ladder: cfg.ladder || null,
      ladderLabel: '🪜 2-1 계단 다시 보기',
      say: sayFor(ctx),
      sayHint: true,
      column: cfg.column !== false,
      onSolved: cfg.onSolved || next
    };
    if (cfg.speak !== undefined) o.speak = cfg.speak;
    else if (p.speak !== undefined) o.speak = p.speak;
    if (cfg.order) o.order = cfg.order;
    box.appendChild(global.MathDrill.ask(ctx.ui, o));
  }

  // 4관 ①② 그래프 그리기(누르기) 문제
  function renderDrawCol(box, ctx, p, extra, counter, next) {
    var ui = ctx.ui;
    var say = sayFor(ctx);
    var tracker = makeTracker('draw-col');
    var solved = false;
    var targetVal = p.data.values[p.col];
    var initVals = p.data.values.slice();
    initVals[p.col] = 0;

    var tbl = buildTable(p.data);
    var hintEl = ui.el('div', 'mx-hint');
    hintEl.hidden = true;

    var g = buildGraph(p, {
      values: initVals,
      editable: {
        col: p.col,
        onChange: function () {
          if (!solved) ui.hint(hintEl, '');
        },
        onHint: function (reason) {
          if (solved) return;
          if (reason === 'gap') {
            var msg = p.orient === 'h'
              ? '왼쪽부터 빈칸 없이 그려요'
              : '아래부터 빈칸 없이 그려요';
            ui.hint(hintEl, '💡 ' + msg);
            say(msg);
          }
        }
      }
    });

    var qEl = ui.el('p', 'mx-question', p.question);
    var btns = ui.el('div', 'tg-btns');
    var btnDone = ui.button('✔ 다 됐어요', 'mx-btn primary', function () {
      if (solved) return;
      var now = g.get()[p.col];
      if (now === targetVal) {
        solved = true;
        g.lock(true);
        btnDone.disabled = true;
        ctx.praise();
        ui.hint(hintEl, '✨ ' + explainOf(p));
        tracker.done();
        if (extra && counter && typeof counter.add === 'function') counter.add();
        next();
      } else {
        ctx.encourage();
        tracker.wrong(now);
        var fb = CORE.drawFeedback(now, targetVal);
        ui.hint(hintEl, '💡 ' + fb.text);
        say(fb.text);
        if (global.MathLadder && typeof global.MathLadder.attach === 'function') {
          global.MathLadder.attach(box, LADDER4, ui, { label: '🪜 2-1 계단 다시 보기', say: say });
        }
      }
    });
    btns.appendChild(btnDone);

    box.appendChild(tbl);
    box.appendChild(g.el);
    box.appendChild(qEl);
    box.appendChild(btns);
    box.appendChild(hintEl);
    say(p.speak || p.question);
  }

  // 1~5관 공통 틀
  function makeLab(num, spec) {
    return {
      title: spec.title,
      icon: spec.icon,
      sub: spec.sub,
      render: function (container, ctx) {
        var ui = ctx.ui;
        var card = ui.card(spec.title);
        card.appendChild(ui.guide(spec.guide));
        card.appendChild(global.MathDrill.algo(ui, spec.algo));
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
            if (p && p.fact) box.appendChild(ui.el('div', 'tg-fact', p.fact));
            spec.renderProblem(box, p, next, extra, counter, ctx);
          }
        });
      }
    };
  }

  // 1관: 세어서 표로
  var lab1 = makeLab(1, {
    title: '1관 세어서 표로',
    icon: '📋',
    sub: '세기·표·합계',
    guide: '그림을 세어 보고 표에서 합계와 빈칸의 수를 알아봐요.',
    algo: ['같은 것끼리 하나씩 짚으며 세어요', '표의 수를 모두 더하면 합계가 돼요'],
    whyTitle: '왜 표로 정리할까요?',
    whyBody: '그림이 섞여 있으면 세기 어려워요. 표에 종류별로 수를 적으면 모두 몇 개인지 한눈에 알 수 있어요.',
    renderProblem: function (box, p, next, extra, counter, ctx) {
      if (p.kind === 'count-kind') {
        box.appendChild(DRAW.cards(p.cards, { cols: 4 }));
        askWrap(box, ctx, p, extra, counter, next, { ladder: LADDER1 });
        return;
      }
      if (p.kind === 'table-total') {
        box.appendChild(buildTable(p.data, { blank: 'total' }));
        askWrap(box, ctx, p, extra, counter, next, { ladder: LADDER1 });
        return;
      }
      box.appendChild(buildTable(p.data, { blank: p.blank }));
      askWrap(box, ctx, p, extra, counter, next, { ladder: LADDER1 });
    }
  });

  // 2관: 조사한 자료
  var lab2 = makeLab(2, {
    title: '2관 조사한 자료',
    icon: '🔍',
    sub: '누가 골랐나',
    guide: '친구들이 무엇을 골랐는지 조사한 카드를 보고 답을 찾아요.',
    algo: ['이름과 그림을 함께 보며 누가 골랐는지 찾아요', '같은 그림을 고른 친구 수를 차근차근 세어요'],
    whyTitle: '조사한 자료는 무엇이 좋을까요?',
    whyBody: '조사한 자료에는 친구 이름과 고른 것이 함께 있어요. 그래서 누가 무엇을 골랐는지 바로 알 수 있어요.',
    renderProblem: function (box, p, next, extra, counter, ctx) {
      box.appendChild(surveyCards(p));
      askWrap(box, ctx, p, extra, counter, next);
    }
  });

  // 3관: 그래프 읽기
  var lab3 = makeLab(3, {
    title: '3관 그래프 읽기',
    icon: '📊',
    sub: '그래프 읽기',
    guide: '그래프의 표시를 세어 보고 가장 많은 것과 차이를 알아봐요.',
    algo: ['표시 하나는 학생 한 명을 나타내요', '기둥의 높이나 길이를 견주어 많고 적음을 알아요'],
    whyTitle: '동그라미 하나는 한 명',
    whyBody: '그래프의 동그라미 하나는 한 명이에요. 기둥에 그려진 표시 수를 세면 몇 명인지 바로 알 수 있어요.',
    renderProblem: function (box, p, next, extra, counter, ctx) {
      var g = buildGraph(p);
      var hlCols = [];
      if (p.kind === 'graph-count') hlCols = [p.target];
      else if (p.kind === 'graph-diff') hlCols = [p.a, p.b];
      else hlCols = [findKindIndex(p.data.kinds, p.answerText)];

      box.appendChild(g.el);
      askWrap(box, ctx, p, extra, counter, next, {
        ladder: LADDER3,
        onSolved: function () {
          g.highlight(hlCols);
          next();
        }
      });
    }
  });

  // 4관: 그래프 그리기
  var lab4 = makeLab(4, {
    title: '4관 그래프 그리기',
    icon: '✏️',
    sub: '그래프 완성',
    guide: '표를 보고 빈 기둥에 표시를 그려 그래프를 완성해요.',
    algo: ['표에서 수를 보고 아래부터 빈칸 없이 하나씩 그려요', '가장 큰 수만큼 칸이 있어야 모두 그릴 수 있어요'],
    whyTitle: '왜 아래부터 빈칸 없이 그릴까요?',
    whyBody: '아래부터 빈칸 없이 한 칸에 하나씩 그려야 기둥의 높이만 보고도 어느 쪽이 많은지 바로 알 수 있어요.',
    renderProblem: function (box, p, next, extra, counter, ctx) {
      if (p.kind === 'draw-col') {
        renderDrawCol(box, ctx, p, extra, counter, next);
        return;
      }
      box.appendChild(buildTable(p.data));
      askWrap(box, ctx, p, extra, counter, next, { ladder: LADDER4 });
    }
  });

  // 5관: 표와 그래프 알기
  var lab5 = makeLab(5, {
    title: '5관 표와 그래프 알기',
    icon: '💡',
    sub: '내용·알기 쉬운 것',
    guide: '그래프에서 여러 내용을 알아내고, 자료와 표와 그래프의 좋은 점을 견주어요.',
    algo: ['기준보다 많은 것을 찾을 때 같은 수는 빼요', '조사한 자료는 누가, 표는 합계, 그래프는 많고 적음을 한눈에 알아요'],
    whyTitle: '자료·표·그래프는 언제 쓸까요?',
    whyBody: '조사한 자료는 누가 무엇을 골랐는지, 표는 합계가 얼마인지, 그래프는 많고 적음을 한눈에 알기 쉬워요.',
    renderProblem: function (box, p, next, extra, counter, ctx) {
      if (p.kind === 'which-easy') {
        askWrap(box, ctx, p, extra, counter, next, {
          order: ['조사한 자료', '표', '그래프']
        });
        return;
      }
      box.appendChild(buildGraph(p).el);
      askWrap(box, ctx, p, extra, counter, next);
    }
  });

  // 6관: 🗳️ 우리 반 투표 (자유 관)
  var lab6 = {
    title: '6관 🗳️ 우리 반 투표',
    icon: '🗳️',
    sub: '투표 그래프',
    render: function (container, ctx) {
      var ui = ctx.ui;
      var say = sayFor(ctx);
      var counter = (global.MathDrill && typeof global.MathDrill.counter === 'function')
        ? global.MathDrill.counter(KEY, { perReward: 6 })
        : { add: function () {}, view: function () { return ui.el('span', 'mx-drill-count', ''); } };

      var card = ui.card('6관 🗳️ 우리 반 투표');
      card.appendChild(ui.guide('친구들의 투표 카드를 보고 그래프에 하나씩 그려 가장 많이 뽑힌 것을 찾아요!'));
      card.appendChild(global.MathDrill.algo(ui, ['먼저 그래프에 그릴 표시를 골라요', '투표 카드를 보고 같은 종류 버튼을 눌러 그려요']));
      card.appendChild(global.MathDrill.why(ui, '투표 그래프로 알기', '투표를 하나씩 그래프로 그리면 다 끝나자마자 가장 높이 쌓인 기둥을 한눈에 찾을 수 있어요.'));
      var area = ui.el('div', 'tw-area');
      card.appendChild(area);
      container.appendChild(card);

      var doneRounds = 0;
      var hasNext = typeof ctx.hasNext === 'function' && ctx.hasNext() && typeof ctx.goNext === 'function';

      var stampsEl = ui.el('div', 'tg-stamps');
      var stageEl = ui.el('div', '');
      var counterWrap = ui.el('div', '');
      var nextWrap = ui.el('div', 'mx-btn-row');
      nextWrap.hidden = true;

      if (hasNext) {
        nextWrap.appendChild(ui.button('다음 관 ▶', 'mx-btn primary', function () {
          ctx.goNext();
        }));
      }

      function renderStamps(count) {
        stampsEl.replaceChildren();
        var total = count > 3 ? count : 3;
        for (var i = 0; i < total; i += 1) {
          var on = i < count;
          stampsEl.appendChild(ui.el('span', on ? 'tg-stamp is-on' : 'tg-stamp', on ? '🗳️' : ''));
        }
      }

      function startVote() {
        stageEl.replaceChildren();
        var vote = CORE.makeVote(Math.random);
        var phase = 'mark';
        var cardIdx = 0;
        var graph = null;

        var markPrompt = ui.el('p', 'mx-question', '그래프에 그릴 표시를 골라요');
        var marksRow = ui.el('div', 'tg-marks');
        var graphSlot = ui.el('div', '');
        var voteCard = ui.el('div', 'tg-vote-card');
        voteCard.hidden = true;
        var kindBtns = ui.el('div', 'tg-kind-btns');
        kindBtns.hidden = true;
        var hintEl = ui.el('div', 'mx-hint');
        hintEl.hidden = true;
        var askSlot = ui.el('div', '');
        var newVoteWrap = ui.el('div', 'tg-btns');
        newVoteWrap.hidden = true;

        function showCard() {
          var cur = vote.votes[cardIdx];
          var k = vote.kinds[cur.kind];
          voteCard.replaceChildren();
          voteCard.appendChild(ui.el('span', 'tg-vote-name', cur.name + ':'));
          voteCard.appendChild(ui.el('span', 'tg-vote-emoji', k.emoji));
          voteCard.appendChild(ui.el('span', 'tg-vote-label', k.label));
          say(vote.speakCards[cardIdx]);
        }

        function startAsk() {
          phase = 'ask';
          voteCard.hidden = true;
          kindBtns.hidden = true;
          ui.hint(hintEl, '');

          var ansLabel = vote.kinds[vote.answer].label;
          var wrongs = [];
          for (var wi = 0; wi < vote.kinds.length && wrongs.length < 2; wi += 1) {
            if (wi !== vote.answer) {
              wrongs.push({ token: vote.kinds[wi].label, mistake: 'most-least-swap' });
            }
          }

          askSlot.appendChild(global.MathDrill.ask(ui, {
            question: '가장 많이 뽑힌 것은?',
            speak: '가장 많이 뽑힌 것은?',
            answer: ansLabel,
            wrongs: wrongs,
            hints: CORE.HINTS,
            hint: '가장 높이 쌓인 기둥을 봐요.',
            explain: ansLabel + CORE.josa(ansLabel, '이/가') + ' 가장 많이 뽑혔어요.',
            prefix: KEY,
            kind: 'vote',
            extra: false,
            say: say,
            sayHint: true,
            column: true,
            onSolved: function () {
              phase = 'done';
              if (graph) graph.highlight([vote.answer]);
              doneRounds += 1;
              renderStamps(doneRounds);
              counter.add();
              counterWrap.replaceChildren(counter.view());
              if (doneRounds >= 3) {
                var doneNow = typeof ctx.isDone === 'function' ? ctx.isDone() : false;
                if (!doneNow && typeof ctx.complete === 'function') ctx.complete();
                if (hasNext) nextWrap.hidden = false;
              }
              newVoteWrap.hidden = false;
            }
          }));
        }

        function pickMark(mark) {
          if (phase !== 'mark') return;
          phase = 'vote';
          markPrompt.hidden = true;
          marksRow.hidden = true;

          var zeros = [];
          for (var z = 0; z < vote.kinds.length; z += 1) zeros.push(0);
          var unit = (vote.topic && vote.topic.unit) || '명';
          graph = DRAW.graph({
            orient: 'v',
            kinds: vote.kinds,
            values: zeros,
            rows: 6,
            mark: mark,
            axisLabel: '(' + unit + ')',
            kindHead: vote.topic ? vote.topic.word : ''
          });
          graphSlot.appendChild(graph.el);

          for (var ki = 0; ki < vote.kinds.length; ki += 1) {
            (function (idx) {
              var k = vote.kinds[idx];
              var btn = ui.el('button', 'mx-btn');
              btn.type = 'button';
              btn.appendChild(ui.el('span', 'tg-kind-btn-emoji', k.emoji));
              btn.appendChild(ui.el('span', 'tg-kind-btn-label', k.label));
              btn.addEventListener('click', function () {
                if (phase !== 'vote' || cardIdx >= vote.votes.length) return;
                var fb = CORE.voteFeedback(vote.votes[cardIdx].kind, idx, vote.kinds);
                if (fb.ok) {
                  graph.add(idx);
                  ui.hint(hintEl, '');
                  cardIdx += 1;
                  if (cardIdx < vote.votes.length) showCard();
                  else startAsk();
                } else {
                  ui.hint(hintEl, '💡 ' + fb.text);
                  say(fb.text);
                }
              });
              kindBtns.appendChild(btn);
            })(ki);
          }

          voteCard.hidden = false;
          kindBtns.hidden = false;
          showCard();
        }

        var markList = ['○', '×', '/'];
        for (var mi = 0; mi < markList.length; mi += 1) {
          (function (m) {
            marksRow.appendChild(ui.button(m, 'mx-btn', function () { pickMark(m); }));
          })(markList[mi]);
        }

        newVoteWrap.appendChild(ui.button('🔁 새 투표', 'mx-btn primary', function () {
          startVote();
        }));

        stageEl.appendChild(markPrompt);
        stageEl.appendChild(marksRow);
        stageEl.appendChild(graphSlot);
        stageEl.appendChild(voteCard);
        stageEl.appendChild(kindBtns);
        stageEl.appendChild(hintEl);
        stageEl.appendChild(askSlot);
        stageEl.appendChild(newVoteWrap);
        say('그래프에 그릴 표시를 골라요');
      }

      area.appendChild(stampsEl);
      area.appendChild(stageEl);
      area.appendChild(counterWrap);
      area.appendChild(nextWrap);

      renderStamps(0);
      counterWrap.replaceChildren(counter.view());
      startVote();
    }
  };

  // 7관: 🎯 표 빙고
  var lab7 = {
    title: '7관 🎯 표 빙고',
    icon: '🎯',
    sub: '9칸 빙고',
    render: function (container, ctx) {
      var ui = ctx.ui;
      var card = ui.card('7관 🎯 표 빙고');
      card.appendChild(ui.guide('표를 보고 답을 판에 놓은 뒤, 들리는 문제의 답을 터뜨려요!'));
      var area = ui.el('div', 'tw-area');
      var tableSlot = ui.el('div', 'tg-bingo-table');
      var bingoSlot = ui.el('div', '');
      area.appendChild(tableSlot);
      area.appendChild(bingoSlot);
      card.appendChild(area);
      container.appendChild(card);

      var bingoCtx = {
        ui: ctx.ui,
        say: sayFor(ctx),
        praise: ctx.praise,
        encourage: ctx.encourage,
        complete: ctx.complete,
        isDone: ctx.isDone,
        hasNext: ctx.hasNext,
        goNext: ctx.goNext
      };

      global.MathBingo.render(bingoSlot, bingoCtx, {
        title: '🎯 표 빙고',
        prefix: KEY,
        counterKey: KEY + '-bingo',
        perReward: 6,
        makeBingo: function () {
          var b = CORE.makeBingo(Math.random);
          tableSlot.replaceChildren(DRAW.table({
            head: b.data.topic.word,
            rowHead: '학생 수(명)',
            kinds: b.data.kinds,
            values: b.data.values,
            noTotal: true
          }));
          return b.problems;
        },
        labels: {
          place: '답을 골라 내 판에 놓아요',
          pickFirst: '먼저 아래 카드를 골라요'
        }
      });
    }
  };

  function mount() {
    global.MathExplorer.mount({
      key: KEY,
      rememberTab: true,
      wishBox: true,
      labs: [lab1, lab2, lab3, lab4, lab5, lab6, lab7],
      quiz: global.MathExplorerQuiz.create({
        grade: '2-2',
        unit: '5. 표와 그래프',
        title: '퀴즈 배틀',
        intro: '퀴즈 배틀이에요. 천천히 들어 보고 골라 볼까요?',
        sayQuestion: true,
        speakText: CORE.speakText
      })
    });
  }

  global.TableGraphLabs = { mount: mount };

  if (global.document && global.document.readyState === 'loading') {
    global.document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})(typeof window !== 'undefined' ? window : globalThis);
