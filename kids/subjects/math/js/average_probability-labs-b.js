// 5-2 수학 6단원 평균과 가능성: 4~6관 + 탐험관 띄우기 (AverageLabsB)
// 4관 가능성을 말로 140~141쪽 · 5관 가능성을 수로·비교 142~145쪽 · 6관 실험으로 판단 146~147쪽 · 퀴즈 배틀(노션)
(function (global) {
  'use strict';

  var A = global.AverageCore;
  var COLOR_CLASS = { red: 'ap-red', blue: 'ap-blue', yellow: 'ap-yellow' };

  // 회전판: 12시부터 시계 방향으로 칸을 그린다
  function drawSpinner(svg, ui, parts, cx, cy, r) {
    var start = -Math.PI / 2;
    parts.forEach(function (p) {
      var cls = 'ap-wedge ' + COLOR_CLASS[p.color];
      if (p.share >= 0.999) {
        svg.appendChild(ui.svg('circle', { cx: cx, cy: cy, r: r, class: cls }));
        return;
      }
      if (p.share <= 0) return;
      var end = start + p.share * Math.PI * 2;
      var x1 = cx + r * Math.cos(start);
      var y1 = cy + r * Math.sin(start);
      var x2 = cx + r * Math.cos(end);
      var y2 = cy + r * Math.sin(end);
      var large = p.share > 0.5 ? 1 : 0;
      svg.appendChild(ui.svg('path', { d: 'M' + cx + ' ' + cy + ' L' + x1.toFixed(2) + ' ' + y1.toFixed(2) + ' A' + r + ' ' + r + ' 0 ' + large + ' 1 ' + x2.toFixed(2) + ' ' + y2.toFixed(2) + ' Z', class: cls }));
      start = end;
    });
    svg.appendChild(ui.svg('circle', { cx: cx, cy: cy, r: r, class: 'ap-spinner-rim' }));
    svg.appendChild(ui.svg('circle', { cx: cx, cy: cy, r: 4, class: 'ap-spinner-pin' }));
  }

  function verticalHalf(svg, ui, x, y, cls) {
    ui.text(svg, x, y - 9, '1', cls);
    svg.appendChild(ui.svg('line', { x1: x - 6, y1: y, x2: x + 6, y2: y, class: 'ap-frac-bar' }));
    ui.text(svg, x, y + 10, '2', cls);
  }

  // ── 4관: 상황을 보고 가능성을 말로 ──
  var tab4 = {
    title: '4관 가능성 말로',
    icon: '💬',
    sub: '불가능~확실',
    render: function (container, ctx) {
      var ui = ctx.ui;
      var el = ui.el;
      container.appendChild(ui.concept('💬 가능성을 말로 나타내기', '가능성은 어떠한 상황에서 특정한 일이 일어나리라 기대할 수 있는 정도예요. 불가능하다, ~아닐 것 같다, 반반이다, ~일 것 같다, 확실하다로 나타낼 수 있어요.'));
      var card = ui.card('가능성 말 고르기');
      container.appendChild(card);
      var scale = el('div', 'ap-scale');
      A.LEVEL_WORDS.forEach(function (w, i) {
        scale.appendChild(el('span', 'ap-scale-step ap-scale-' + i, w));
      });
      card.appendChild(scale);
      var list = ui.shuffle(A.SITUATIONS).slice(0, 6);
      var idx = 0;
      var stage = el('div');
      card.appendChild(stage);

      function run() {
        stage.replaceChildren();
        var item = list[idx];
        stage.appendChild(el('span', 'mx-step-label', '상황 ' + (idx + 1) + ' / ' + list.length));
        stage.appendChild(el('div', 'ap-situation', item.text));
        ctx.say(item.text);
        stage.appendChild(ui.choiceQuestion({
          question: '일이 일어날 가능성을 어떻게 말할 수 있을까요?',
          choices: A.LEVEL_WORDS,
          answer: item.level,
          fixed: true,
          hint: item.why + ' 위 화살표에서 알맞은 자리를 찾아봐요.',
          explain: item.why + ' 그래서 \'' + A.LEVEL_WORDS[item.level] + '\'예요.',
          onSolved: function () {
            var row = el('div', 'mx-btn-row');
            if (idx + 1 < list.length) {
              row.appendChild(ui.button('다음 상황 ▶', 'mx-btn primary', function () {
                idx += 1;
                run();
              }));
            } else {
              ctx.complete();
              stage.appendChild(ui.doneBadge());
            }
            stage.appendChild(row);
          }
        }));
      }

      run();
      ctx.say('4관이에요. 일이 일어날 가능성을 말로 나타내 볼까요?');
    }
  };

  // ── 5관: 0·2분의 1·1 수직선 → 주사위 카드 순서 ──
  var NL = { x0: 40, x1: 400, y: 70 };

  function drawNumberLine(svg, ui, marks) {
    svg.replaceChildren();
    var w = NL.x1 - NL.x0;
    svg.appendChild(ui.svg('rect', { x: NL.x0, y: NL.y - 8, width: w / 2, height: 16, class: 'ap-zone-low' }));
    svg.appendChild(ui.svg('rect', { x: NL.x0 + w / 2, y: NL.y - 8, width: w / 2, height: 16, class: 'ap-zone-high' }));
    svg.appendChild(ui.svg('line', { x1: NL.x0, y1: NL.y, x2: NL.x1, y2: NL.y, class: 'ap-nl' }));
    [0, 0.5, 1].forEach(function (t) {
      var x = NL.x0 + t * w;
      svg.appendChild(ui.svg('line', { x1: x, y1: NL.y - 12, x2: x, y2: NL.y + 12, class: 'ap-nl-tick' }));
    });
    ui.text(svg, NL.x0, NL.y + 26, '0', 'mx-label');
    verticalHalf(svg, ui, NL.x0 + w / 2, NL.y + 34, 'mx-label mx-label-sm');
    ui.text(svg, NL.x1, NL.y + 26, '1', 'mx-label');
    ui.text(svg, NL.x0, NL.y - 24, '불가능하다', 'mx-label mx-label-sm');
    ui.text(svg, NL.x0 + w / 4, NL.y - 24, '~아닐 것 같다', 'mx-label mx-label-sm mx-label-purple');
    ui.text(svg, NL.x0 + w / 2, NL.y - 24, '반반이다', 'mx-label mx-label-sm');
    ui.text(svg, NL.x0 + (3 * w) / 4, NL.y - 24, '~일 것 같다', 'mx-label mx-label-sm mx-label-purple');
    ui.text(svg, NL.x1, NL.y - 24, '확실하다', 'mx-label mx-label-sm');
    (marks || []).forEach(function (m) {
      var x = NL.x0 + m.t * w;
      svg.appendChild(ui.svg('circle', { cx: x, cy: NL.y, r: 9, class: 'ap-nl-mark' }));
      ui.text(svg, x, NL.y + 56, m.label, 'mx-label mx-label-sm mx-label-orange');
    });
  }

  var HALF_WORD = '2분의 1';
  var SPIN_CASES = [
    { label: '가', parts: [{ color: 'blue', share: 1 }], t: 0, word: '0', why: '회전판에 빨강이 없어요. 빨강에 멈추는 것은 불가능해요.' },
    { label: '나', parts: [{ color: 'red', share: 0.5 }, { color: 'blue', share: 0.5 }], t: 0.5, word: HALF_WORD, why: '빨강과 파랑이 반씩이에요. 반반이에요.' },
    { label: '다', parts: [{ color: 'red', share: 1 }], t: 1, word: '1', why: '회전판이 모두 빨강이에요. 빨강에 멈추는 것은 확실해요.' }
  ];

  function spinnerPart(box, ctx, go) {
    var ui = ctx.ui;
    var el = ui.el;
    box.appendChild(ui.guide('회전판을 돌릴 때 빨강에 멈출 가능성을 수로 나타내 봐요. 불가능하다는 0, 반반이다는 2분의 1, 확실하다는 1이에요.'));
    var spins = ui.board('0 0 420 130', 'mx-board-wide');
    SPIN_CASES.forEach(function (c, i) {
      drawSpinner(spins.svg, ui, c.parts, 70 + i * 140, 58, 46);
      ui.text(spins.svg, 70 + i * 140, 120, '회전판 ' + c.label, 'mx-label mx-label-sm');
    });
    box.appendChild(spins.wrap);
    var nl = ui.board('0 0 440 140', 'mx-board-wide');
    box.appendChild(nl.wrap);
    var marks = [];
    drawNumberLine(nl.svg, ui, marks);
    var steps = SPIN_CASES.map(function (c) {
      return function (s, next) {
        s.appendChild(ui.choiceQuestion({
          question: '회전판 ' + c.label + '에서 빨강에 멈출 가능성을 수로 나타내면?',
          choices: ['0', HALF_WORD, '1'],
          answer: ['0', HALF_WORD, '1'].indexOf(c.word),
          fixed: true,
          hint: c.why,
          explain: '회전판 ' + c.label + ' → ' + c.word,
          onSolved: function () {
            marks.push({ t: c.t, label: c.label });
            drawNumberLine(nl.svg, ui, marks);
            next();
          }
        }));
      };
    });
    steps.push(function (s, next) {
      s.appendChild(ui.choiceQuestion({
        question: '빨강이 4칸 중 3칸인 회전판이라면, 빨강에 멈출 가능성은 수직선의 어디쯤일까요?',
        choices: ['2분의 1과 1 사이', '0과 2분의 1 사이', '꼭 1'],
        answer: 0,
        fixed: true,
        hint: '반보다 넓지만 전부는 아니에요. \'~일 것 같다\'가 있는 곳을 보세요.',
        explain: '가능성은 0, 2분의 1, 1 말고도 그 사이 어디든 될 수 있어요. 4칸 중 3칸이면 \'~일 것 같다\' 쪽이에요.',
        onSolved: next
      }));
    });
    ui.sequence(box, steps, go);
  }

  function dicePart(box, ctx, go) {
    var ui = ctx.ui;
    var el = ui.el;
    box.appendChild(ui.guide('주사위를 한 번 굴릴 때, 카드의 일이 일어날 가능성이 낮은 것부터 차례로 눌러요. 1부터 6까지 중에서 몇 개가 맞는지 세어 보면 쉬워요.'));
    var order = A.DICE_CARDS.slice().sort(function (a, b) { return a.sixths - b.sixths; });
    var placed = el('div', 'ap-order-track');
    box.appendChild(el('div', 'ap-order-head', '낮음 ⟶ 높음'));
    box.appendChild(placed);
    var pool = el('div', 'mx-btn-row');
    box.appendChild(pool);
    var hintEl = el('div', 'mx-hint');
    hintEl.hidden = true;
    box.appendChild(hintEl);
    var step = 0;
    var btns = {};
    ui.shuffle(A.DICE_CARDS).forEach(function (c) {
      var b = ui.button('🎲 ' + c.text, 'mx-btn ap-card', function () {
        if (b.disabled) return;
        if (c.text === order[step].text) {
          b.disabled = true;
          b.classList.remove('mx-glow');
          b.hidden = true;
          ctx.praise();
          ui.hint(hintEl, '');
          var chip = el('div', 'ap-order-chip', c.text + ' · 6개 중 ' + c.sixths + '개');
          placed.appendChild(chip);
          step += 1;
          if (step === order.length) go();
          return;
        }
        ctx.encourage();
        var cnt = order[step];
        ui.hint(hintEl, '💡 남은 카드 중 1~6에서 맞는 수가 가장 적은 카드를 찾아요. 반짝이는 카드는 6개 중 ' + cnt.sixths + '개예요.');
        Object.keys(btns).forEach(function (k) { btns[k].classList.remove('mx-glow'); });
        btns[cnt.text].classList.add('mx-glow');
      });
      btns[c.text] = b;
      pool.appendChild(b);
    });
  }

  var tab5 = {
    title: '5관 가능성 수로',
    icon: '🎯',
    sub: '0 · 2분의 1 · 1',
    render: function (container, ctx) {
      var ui = ctx.ui;
      container.appendChild(ui.concept('🎯 가능성을 수로, 그리고 비교하기', '일이 일어날 가능성을 0부터 1까지의 수로 나타내면 불가능하다는 0, 반반이다는 2분의 1, 확실하다는 1이에요. 가능성은 그 사이의 값일 수도 있어요.'));
      var card1 = ui.card('회전판 가능성 수직선');
      container.appendChild(card1);
      var card2 = ui.card('주사위 카드 줄 세우기');
      card2.hidden = true;
      container.appendChild(card2);
      spinnerPart(card1, ctx, function () {
        card2.hidden = false;
        dicePart(card2, ctx, function () {
          ctx.complete();
          card2.appendChild(ui.doneBadge());
        });
      });
      ctx.say('5관이에요. 가능성을 수로 나타내 볼까요?');
    }
  };

  // ── 6관: 모의 실험 결과로 회전판 짐작 ──
  var SPIN_KEYS = ['ga', 'na', 'da'];

  function experimentRound(stage, ctx, key, done) {
    var ui = ctx.ui;
    var el = ui.el;
    var spinner = A.SPINNERS[key];
    var times = 50;
    stage.appendChild(ui.guide('친구가 가, 나, 다 중 한 회전판을 몰래 골랐어요. 돌린 결과를 보고 어느 회전판인지 짐작해 봐요.'));
    var spins = ui.board('0 0 420 130', 'mx-board-wide');
    SPIN_KEYS.forEach(function (k, i) {
      drawSpinner(spins.svg, ui, A.SPINNERS[k].parts, 70 + i * 140, 58, 46);
      ui.text(spins.svg, 70 + i * 140, 120, '회전판 ' + A.SPINNERS[k].name, 'mx-label mx-label-sm');
    });
    stage.appendChild(spins.wrap);
    var chart = ui.board('0 0 420 190', 'mx-board-wide');
    stage.appendChild(chart.wrap);
    var row = el('div', 'mx-btn-row');
    stage.appendChild(row);
    stage.appendChild(el('p', 'mx-note', '※ 화면 속 모의 실험이에요. 진짜로 돌리면 결과가 조금씩 달라요.'));
    var after = el('div');
    stage.appendChild(after);
    var counts = { red: 0, blue: 0, yellow: 0 };
    var asked = false;

    function drawChart(n) {
      var s = chart.svg;
      s.replaceChildren();
      var colors = ['red', 'blue', 'yellow'];
      var maxC = Math.max(1, counts.red, counts.blue, counts.yellow);
      colors.forEach(function (c, i) {
        var h = (counts[c] / Math.max(maxC, n / 2)) * 130;
        var x = 60 + i * 120;
        s.appendChild(ui.svg('rect', { x: x, y: 160 - h, width: 70, height: h, rx: 6, class: 'ap-wedge ' + COLOR_CLASS[c] }));
        ui.text(s, x + 35, 150 - h, counts[c] + '번', 'mx-label mx-label-sm');
        ui.text(s, x + 35, 176, A.COLOR_NAMES[c], 'mx-label mx-label-sm');
      });
    }

    function runSpins(n) {
      var result = A.simulate(spinner, n);
      var seq = A.sequenceOf(result);
      counts = { red: 0, blue: 0, yellow: 0 };
      var i = 0;
      var per = Math.max(1, Math.ceil(seq.length / 25));
      spinBtn.disabled = true;
      var timer = setInterval(function () {
        for (var k = 0; k < per && i < seq.length; k += 1) {
          counts[seq[i]] += 1;
          i += 1;
        }
        drawChart(n);
        if (i >= seq.length) {
          clearInterval(timer);
          spinBtn.disabled = false;
          if (!asked) ask();
        }
      }, 60);
    }

    var spinBtn = ui.button('🎡 50번 돌리기', 'mx-btn primary', function () {
      runSpins(times);
      if (times === 50) {
        times = 100;
        spinBtn.textContent = '🎡 100번 돌려 보기';
      }
    });
    row.appendChild(spinBtn);

    function ask() {
      asked = true;
      var big = spinner.parts.filter(function (p) { return p.share === 0.5; })[0].color;
      after.appendChild(ui.choiceQuestion({
        question: '어느 회전판을 돌렸을까요?',
        choices: SPIN_KEYS.map(function (k) { return '회전판 ' + A.SPINNERS[k].name; }),
        answer: SPIN_KEYS.indexOf(key),
        fixed: true,
        hint: '가장 많이 나온 색을 보세요. 그 색이 가장 넓은(절반인) 회전판을 찾아요.',
        explain: A.COLOR_NAMES[big] + '이 가장 많이 나왔어요. ' + A.COLOR_NAMES[big] + '이 절반인 회전판 ' + spinner.name + '일 가능성이 높아요.',
        onSolved: done
      }));
    }

    drawChart(50);
  }

  var tab6 = {
    title: '6관 실험 판단',
    icon: '🎡',
    sub: '결과로 짐작',
    render: function (container, ctx) {
      var ui = ctx.ui;
      container.appendChild(ui.concept('🎡 실험 결과로 판단하기', '회전판을 여러 번 돌리면 넓은 칸의 색이 더 자주 나와요. 결과를 보고 어떤 회전판인지 짐작할 수 있어요. 많이 돌릴수록 칸의 넓이와 결과가 더 비슷해져요.'));
      var card = ui.card('어느 회전판일까?');
      container.appendChild(card);
      var keys = ui.shuffle(SPIN_KEYS).slice(0, 2);
      var r = 0;
      var stage = ui.el('div');
      card.appendChild(stage);
      function run() {
        stage.replaceChildren();
        stage.appendChild(ui.el('span', 'mx-step-label', '실험 ' + (r + 1) + ' / ' + keys.length));
        experimentRound(stage, ctx, keys[r], function () {
          var row = ui.el('div', 'mx-btn-row');
          if (r + 1 < keys.length) {
            row.appendChild(ui.button('다음 실험 ▶', 'mx-btn primary', function () {
              r += 1;
              run();
            }));
          } else {
            ctx.complete();
            stage.appendChild(ui.doneBadge());
          }
          stage.appendChild(row);
        });
      }
      run();
      ctx.say('6관이에요. 회전판을 돌린 결과를 보고 어느 회전판인지 맞혀 볼까요?');
    }
  };

  function start() {
    var L = global.AverageLabsA;
    if (!global.MathExplorer || !L) return;
    global.MathExplorer.mount({
      key: 'average',
      labs: [L.tab1, L.tab2, L.tab3, tab4, tab5, tab6],
      quiz: global.MathExplorerQuiz ? global.MathExplorerQuiz.create({
        grade: '5-2',
        unit: '6. 평균과 가능성',
        title: '🏆 평균과 가능성 퀴즈 배틀',
        intro: '평균과 가능성 퀴즈 배틀이에요. 천천히 읽고 골라 볼까요?'
      }) : null
    });
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
  }

  global.AverageLabsB = { tab4: tab4, tab5: tab5, tab6: tab6, drawSpinner: drawSpinner };
})(typeof window !== 'undefined' ? window : globalThis);
