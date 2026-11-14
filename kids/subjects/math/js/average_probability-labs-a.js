// 5-2 수학 6단원 평균과 가능성: 1~3관 (AverageLabsA)
// 1관 고르게 하기 134~135쪽 · 2관 평균 구하기 136~137쪽 · 3관 평균 비교·빠진 값 138~139·148쪽
// 싣는 순서: math_explorer-shell → average_probability-core → labs-a → labs-b(탐험관 띄우기)
(function (global) {
  'use strict';

  var A = global.AverageCore;
  var NAMES = ['도윤', '서연', '하준', '지아', '민재'];
  var COL_W = 76;
  var GAP = 30;

  // ── 1관: ○를 옮겨 모두 같게 ──
  function levelProblem(stage, ctx, data, opts, done) {
    var ui = ctx.ui;
    var el = ui.el;
    var list = data.slice();
    var avg = A.mean(list);
    var maxV = Math.max.apply(null, list);
    var H = maxV * GAP + 60;
    var picked = null;
    var moves = 0;
    var solved = false;
    stage.appendChild(ui.guide(opts.story));
    stage.appendChild(el('p', 'mx-question', '많은 칸을 먼저 누르고, 적은 칸을 누르면 ○ 하나가 옮겨 가요. 모두 같게 만들어 보세요.'));
    var board = ui.board('0 0 ' + (list.length * COL_W + 20) + ' ' + H, 'mx-board-wide');
    stage.appendChild(board.wrap);
    var row = el('div', 'mx-btn-row');
    var hintEl = el('div', 'mx-hint');
    hintEl.hidden = true;
    row.appendChild(ui.button('💡 힌트', 'mx-btn', function () {
      var hi = list.indexOf(Math.max.apply(null, list));
      var lo = list.indexOf(Math.min.apply(null, list));
      ui.hint(hintEl, '💡 가장 많은 ' + NAMES[hi] + '의 ○를 가장 적은 ' + NAMES[lo] + '에게 옮겨 봐요.');
    }));
    row.appendChild(ui.button('↺ 처음부터', 'mx-btn', function () {
      if (solved) return;
      list = data.slice();
      picked = null;
      draw();
    }));
    stage.appendChild(row);
    stage.appendChild(hintEl);
    var after = el('div');
    stage.appendChild(after);

    function draw() {
      var s = board.svg;
      s.replaceChildren();
      var base = H - 30;
      list.forEach(function (v, i) {
        var x = 10 + i * COL_W;
        var hit = ui.svg('rect', { x: x + 4, y: 6, width: COL_W - 8, height: base - 2, rx: 12, class: 'ap-col' + (picked === i ? ' ap-col-picked' : '') });
        hit.addEventListener('click', function () { tapCol(i); });
        s.appendChild(hit);
        for (var k = 0; k < v; k += 1) {
          s.appendChild(ui.svg('circle', { cx: x + COL_W / 2, cy: base - 16 - k * GAP, r: 12, class: 'ap-dot' + (picked === i && k === v - 1 ? ' ap-dot-picked' : '') }));
        }
        ui.text(s, x + COL_W / 2, base + 14, NAMES[i], 'mx-label mx-label-sm');
      });
      if (solved) {
        var y = base - 16 - (avg - 1) * GAP - GAP / 2;
        s.appendChild(ui.svg('line', { x1: 6, y1: y, x2: list.length * COL_W + 14, y2: y, class: 'ap-avg-line' }));
      }
    }

    function tapCol(i) {
      if (solved) return;
      if (picked === null) {
        if (list[i] === 0) return;
        picked = i;
      } else if (picked === i) {
        picked = null;
      } else {
        var next = A.move(list, picked, i);
        if (next) {
          list = next;
          moves += 1;
        }
        picked = null;
        if (A.isLevel(list)) {
          solved = true;
          ctx.praise();
          ui.hint(hintEl, '');
          finish();
        }
      }
      draw();
    }

    function finish() {
      after.appendChild(el('p', 'mx-note', '✨ 모두 ' + avg + '개로 고르게 되었어요! (' + moves + '번 옮김)'));
      after.appendChild(ui.choiceQuestion({
        question: '고르게 한 값 ' + avg + '개를 이 자료의 무엇이라고 할까요?',
        choices: ['평균', '가장 큰 값', '합계'],
        answer: 0,
        hint: '각 자료의 값을 고르게 하여 그 자료를 대표하는 값이에요.',
        explain: '각 자료의 값을 고르게 하여 그 자료를 대표하는 값을 평균이라고 해요. 평균 ' + avg + '개는 처음 자료에 없던 값일 수도 있어요.',
        onSolved: done
      }));
    }

    draw();
  }

  function twoRuns(container, ctx, title, first, makeNext, solve) {
    var ui = ctx.ui;
    var card = ui.card(title);
    container.appendChild(card);
    var items = [first, makeNext()];
    var idx = 0;
    var stage = ui.el('div');
    card.appendChild(stage);
    function run() {
      stage.replaceChildren();
      stage.appendChild(ui.el('span', 'mx-step-label', '문제 ' + (idx + 1) + ' / ' + items.length));
      solve(stage, items[idx], function () {
        var row = ui.el('div', 'mx-btn-row');
        if (idx + 1 < items.length) {
          row.appendChild(ui.button('다음 문제 ▶', 'mx-btn primary', function () {
            idx += 1;
            run();
          }));
        } else {
          ctx.complete();
          stage.appendChild(ui.doneBadge());
          row.appendChild(ui.button('🎲 새 문제 더 풀기', 'mx-btn', function () {
            items.push(makeNext());
            idx += 1;
            run();
          }));
        }
        stage.appendChild(row);
      });
    }
    run();
  }

  var tab1 = {
    title: '1관 고르게 하기',
    icon: '♻️',
    sub: '평균의 뜻',
    render: function (container, ctx) {
      container.appendChild(ctx.ui.concept('♻️ 평균은 고르게 한 값', '각 자료의 값을 고르게 하여 그 자료를 대표하는 값을 평균이라고 해요. 많은 쪽에서 적은 쪽으로 옮겨서 모두 같아지면, 그 값이 평균이에요.'));
      twoRuns(container, ctx, '분리수거 캔 고르게 하기', [6, 1, 4, 5], function () { return A.makeLevelData(4, 8); }, function (stage, data, done) {
        levelProblem(stage, ctx, data, { story: '친구들이 모은 캔의 수예요. 한 사람당 몇 개쯤 모았다고 말하면 좋을까요?' }, done);
      });
      ctx.say('1관이에요. 동그라미를 옮겨서 모두 같게 만들어 볼까요?');
    }
  };

  // ── 2관: 종이띠 이어 붙여 등분하기 → 공식 ──
  var STRIP_COLORS = ['ap-seg-a', 'ap-seg-b', 'ap-seg-c', 'ap-seg-d', 'ap-seg-e'];

  function stripProblem(stage, ctx, p, done) {
    var ui = ctx.ui;
    var el = ui.el;
    var total = A.sum(p.values);
    var n = p.values.length;
    var avg = total / n;
    var W = 420;
    var unitPx = W / total;
    stage.appendChild(ui.guide(p.story));
    var table = el('div', 'ap-table');
    p.values.forEach(function (v, i) {
      var cell = el('div', 'ap-table-cell ' + STRIP_COLORS[i]);
      cell.appendChild(el('span', 'ap-table-name', NAMES[i]));
      cell.appendChild(el('span', 'ap-table-val', v + p.unit));
      table.appendChild(cell);
    });
    stage.appendChild(table);
    var board = ui.board('0 0 460 120', 'mx-board-wide');
    stage.appendChild(board.wrap);
    var row = el('div', 'mx-btn-row');
    stage.appendChild(row);
    var after = el('div');
    stage.appendChild(after);
    var phase = 0;

    function draw() {
      var s = board.svg;
      s.replaceChildren();
      var x = 20;
      p.values.forEach(function (v, i) {
        var w = v * unitPx;
        var y = phase === 0 ? 14 + (i % 2) * 22 : 40;
        s.appendChild(ui.svg('rect', { x: phase === 0 ? x + i * 6 : x, y: y, width: w, height: 30, rx: 4, class: 'ap-seg ' + STRIP_COLORS[i] }));
        ui.text(s, (phase === 0 ? x + i * 6 : x) + w / 2, y + 15, v + p.unit, 'mx-label mx-label-sm');
        x += w;
      });
      if (phase === 2) {
        for (var k = 1; k < n; k += 1) {
          var cx = 20 + k * (W / n);
          s.appendChild(ui.svg('line', { x1: cx, y1: 30, x2: cx, y2: 82, class: 'ap-fold-line' }));
        }
        for (var m = 0; m < n; m += 1) ui.text(s, 20 + m * (W / n) + W / (2 * n), 98, avg + p.unit, 'mx-label mx-label-accent');
      }
    }

    var joinBtn = ui.button('🧷 한 줄로 이어 붙이기', 'mx-btn primary', function () {
      phase = 1;
      joinBtn.hidden = true;
      foldBtn.hidden = false;
      ctx.say('종이띠를 한 줄로 이어 붙였어요. 모두 ' + ui.josa(total + p.unitSay, 'ieyo') + '.');
      draw();
    });
    var foldBtn = ui.button('📏 ' + n + '등분으로 접기', 'mx-btn primary', function () {
      phase = 2;
      foldBtn.hidden = true;
      ctx.praise();
      ctx.say(n + '등분으로 접었더니 한 칸이 ' + ui.josa(avg + p.unitSay, 'ieyo') + '.');
      draw();
      steps();
    });
    foldBtn.hidden = true;
    row.appendChild(joinBtn);
    row.appendChild(foldBtn);

    function steps() {
      ui.sequence(after, [
        function (s, go) {
          s.appendChild(ui.choiceQuestion({
            question: '① 자료의 값을 모두 더하면 얼마일까요?',
            choices: [String(total), String(total - p.values[n - 1]), String(n)],
            answer: 0,
            hint: ui.josa(p.values.join(' + '), 'eul') + ' 차례로 더해 봐요. 이어 붙인 종이띠 전체 길이예요.',
            explain: p.values.join(' + ') + ' = ' + total,
            onSolved: go
          }));
        },
        function (s, go) {
          s.appendChild(ui.choiceQuestion({
            question: '② 자료의 수는 몇 개일까요?',
            choices: [String(n), String(total), String(n + 1)],
            answer: 0,
            hint: '표에 있는 친구가 몇 명인지 세어 봐요.',
            explain: '자료는 ' + n + '개예요. 그래서 ' + n + '등분으로 접었어요.',
            onSolved: go
          }));
        },
        function (s, go) {
          var line = el('div', 'mx-formula');
          line.appendChild(el('span', 'mx-chip', '(평균) = (자료의 값을 모두 더한 수) ÷ (자료의 수)'));
          s.appendChild(line);
          s.appendChild(ui.choiceQuestion({
            question: '③ 평균 = ' + total + ' ÷ ' + n + ' = ?',
            choices: [String(avg), String(total - n), String(avg + 1)],
            answer: 0,
            hint: '종이띠 한 칸의 길이를 보세요.',
            explain: '평균은 ' + ui.josa(avg + p.unit, 'ieyo') + '.',
            onSolved: go
          }));
        }
      ], done);
    }

    draw();
  }

  function makeStripProblem() {
    var vals = A.makeLevelData(A.randInt(4, 5), 9);
    return { values: vals, unit: '장', unitSay: '장', story: '친구들이 만든 환경 카드 수를 종이띠로 나타냈어요.' };
  }

  var tab2 = {
    title: '2관 평균 구하기',
    icon: '📏',
    sub: '종이띠 → 공식',
    render: function (container, ctx) {
      container.appendChild(ctx.ui.concept('📏 평균 구하기', '종이띠를 한 줄로 이어 붙인 다음, 자료의 수만큼 똑같이 접으면 한 칸이 평균이에요. 식으로는 (평균) = (자료의 값을 모두 더한 수) ÷ (자료의 수)예요.'));
      twoRuns(container, ctx, '종이띠로 평균 구하기', { values: [6, 5, 2, 3], unit: '장', unitSay: '장', story: '친구들이 만든 환경 카드 수예요: 6장, 5장, 2장, 3장.' }, makeStripProblem, function (stage, p, done) {
        stripProblem(stage, ctx, p, done);
      });
      ctx.say('2관이에요. 종이띠를 이어 붙이고 접어서 평균을 구해 볼까요?');
    }
  };

  // ── 3관: 인원이 다른 모둠 비교 → 빠진 값 채우기 ──
  function comparePart(box, ctx, go) {
    var ui = ctx.ui;
    var el = ui.el;
    var a = [9, 8, 10];
    var b = [8, 7, 6, 7];
    box.appendChild(ui.guide('고리 던지기 점수예요. 가 모둠은 3명, 나 모둠은 4명이에요.'));
    var t = el('div', 'ap-groups');
    [['가 모둠', a], ['나 모둠', b]].forEach(function (g) {
      var c = el('div', 'ap-group');
      c.appendChild(el('div', 'ap-group-name', g[0] + ' (' + g[1].length + '명)'));
      c.appendChild(el('div', 'ap-group-vals', g[1].join('점, ') + '점'));
      c.appendChild(el('div', 'ap-group-sum', '합계 ' + A.sum(g[1]) + '점'));
      t.appendChild(c);
    });
    box.appendChild(t);
    ui.sequence(box, [
      function (s, next) {
        s.appendChild(ui.choiceQuestion({
          question: '합계가 더 큰 나 모둠이 더 잘했다고 할 수 있을까요?',
          choices: ['아니요, 사람 수가 달라서 평균으로 비교해요', '네, 합계가 크면 언제나 더 잘한 거예요'],
          answer: 0,
          hint: '나 모둠은 한 사람이 더 있어요. 사람 수가 다르면 합계로는 공평하게 비교할 수 없어요.',
          explain: '사람 수가 다를 때는 한 사람당 점수인 평균으로 비교해요.',
          onSolved: next
        }));
      },
      function (s, next) {
        s.appendChild(ui.choiceQuestion({
          question: '가 모둠의 평균은? (27 ÷ 3)',
          choices: ['9점', '27점', '8점'],
          answer: 0,
          hint: '합계 27점을 3명으로 똑같이 나누어요.',
          explain: '27 ÷ 3 = 9, 가 모둠의 평균은 9점이에요.',
          onSolved: next
        }));
      },
      function (s, next) {
        s.appendChild(ui.choiceQuestion({
          question: '나 모둠의 평균은? (28 ÷ 4)',
          choices: ['7점', '28점', '8점'],
          answer: 0,
          hint: '합계 28점을 4명으로 똑같이 나누어요.',
          explain: '28 ÷ 4 = 7, 나 모둠의 평균은 7점이에요.',
          onSolved: next
        }));
      },
      function (s, next) {
        s.appendChild(ui.choiceQuestion({
          question: '평균으로 보면 어느 모둠이 더 잘했나요?',
          choices: ['가 모둠', '나 모둠', '똑같아요'],
          answer: 0,
          hint: '평균 9점과 7점을 비교해 봐요.',
          explain: '평균이 9점인 가 모둠이 더 잘했다고 할 수 있어요.',
          onSolved: next
        }));
      }
    ], go);
  }

  function missingPart(box, ctx, go) {
    var ui = ctx.ui;
    var el = ui.el;
    var days = ['월', '화', '수', '목', '금'];
    var known = [12, 15, 8, null, 10];
    var target = 11;
    var knownVals = known.filter(function (v) { return v !== null; });
    var need = A.missingValue(knownVals, target, days.length);
    var guess = 5;
    var solved = false;
    var UNIT = 11;
    var H = 20 * UNIT + 50;
    box.appendChild(ui.guide('준서가 5일 동안 읽은 책 쪽수예요. 목요일 기록이 지워졌어요. 5일 평균이 ' + target + '쪽이라면 목요일에는 몇 쪽을 읽었을까요?'));
    var board = ui.board('0 0 420 ' + H, 'mx-board-wide');
    box.appendChild(board.wrap);
    var status = el('p', 'mx-question');
    box.appendChild(status);
    var row = el('div', 'mx-btn-row');
    var minus = ui.button('➖ 1쪽', 'mx-btn', function () { set(guess - 1); });
    var plus = ui.button('➕ 1쪽', 'mx-btn', function () { set(guess + 1); });
    row.appendChild(minus);
    row.appendChild(plus);
    box.appendChild(row);
    var after = el('div');
    box.appendChild(after);

    function set(v) {
      if (solved) return;
      guess = Math.max(0, Math.min(20, v));
      draw();
      if (A.sum(knownVals) + guess === target * days.length) {
        solved = true;
        ctx.praise();
        steps();
      }
    }

    function draw() {
      var s = board.svg;
      s.replaceChildren();
      var base = H - 26;
      days.forEach(function (d, i) {
        var v = known[i] === null ? guess : known[i];
        var x = 30 + i * 78;
        s.appendChild(ui.svg('rect', { x: x, y: base - v * UNIT, width: 52, height: v * UNIT, rx: 6, class: known[i] === null ? 'ap-bar ap-bar-missing' : 'ap-bar' }));
        ui.text(s, x + 26, base - v * UNIT - 10, v + '쪽', 'mx-label mx-label-sm' + (known[i] === null ? ' mx-label-orange' : ''));
        ui.text(s, x + 26, base + 14, d + '요일', 'mx-label mx-label-sm');
      });
      var y = base - target * UNIT;
      s.appendChild(ui.svg('line', { x1: 16, y1: y, x2: 412, y2: y, class: 'ap-avg-line' }));
      ui.text(s, 400, y - 10, '평균 ' + target, 'mx-label mx-label-sm mx-label-purple', 'end');
      var total = A.sum(knownVals) + guess;
      var goal = target * days.length;
      status.textContent = '평균 ' + target + '쪽이 되려면 5일 합이 ' + target + ' × 5 = ' + goal + '쪽이어야 해요. 지금 합: ' + total + '쪽' + (total === goal ? ' ✅' : total < goal ? ' (모자라요)' : ' (넘쳐요)');
    }

    function steps() {
      after.appendChild(ui.choiceQuestion({
        question: '식으로도 확인해요. ' + target * days.length + ' − (' + knownVals.join(' + ') + ') = ?',
        choices: [String(need), String(target), String(need + 5)],
        answer: 0,
        hint: '먼저 ' + knownVals.join(' + ') + ' = ' + ui.josa(String(A.sum(knownVals)), 'eul') + ' 구하고, ' + target * days.length + '에서 빼 봐요.',
        explain: '목요일에는 ' + need + '쪽을 읽었어요. (평균 × 자료의 수) − (나머지의 합)으로 구할 수 있어요.',
        onSolved: go
      }));
    }

    draw();
  }

  var tab3 = {
    title: '3관 평균 활용',
    icon: '⚖️',
    sub: '비교·빠진 값',
    render: function (container, ctx) {
      var ui = ctx.ui;
      container.appendChild(ui.concept('⚖️ 평균으로 비교하고 빠진 값 찾기', '사람 수가 다른 두 모둠은 합계 대신 평균으로 비교해요. 평균을 알면 (평균) × (자료의 수)로 전체 합을 알 수 있어서, 지워진 기록도 찾을 수 있어요.'));
      var card1 = ui.card('어느 모둠이 더 잘했을까?');
      container.appendChild(card1);
      var card2 = ui.card('지워진 기록 찾기');
      card2.hidden = true;
      container.appendChild(card2);
      comparePart(card1, ctx, function () {
        card2.hidden = false;
        missingPart(card2, ctx, function () {
          ctx.complete();
          card2.appendChild(ui.doneBadge());
        });
      });
      ctx.say('3관이에요. 평균으로 비교하고, 지워진 기록도 찾아볼까요?');
    }
  };

  global.AverageLabsA = { tab1: tab1, tab2: tab2, tab3: tab3, NAMES: NAMES };
})(typeof window !== 'undefined' ? window : globalThis);
