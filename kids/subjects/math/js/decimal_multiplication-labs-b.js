// 5-2 수학 4단원 소수의 곱셈: 4~6관 + 탐험관 띄우기 (DecimalLabsB)
// 4관 넓이 4조각 96~97쪽 · 5관 곱의 소수점 위치 98~99쪽 · 6관 소수점 찍기 훈련 100~101쪽 · 퀴즈 배틀(노션)
// 객관식 보기는 공용 틀 ui.choiceQuestion이 window.QuizChoices.arrange로 섞고 원래 번호로 채점한다.
(function (global) {
  'use strict';

  var C = global.DecimalCore;
  var UNIT_PX = 100;
  var AREA_X = 44;
  var AREA_Y = 22;
  var PART_CLASS = ['dm-part-a', 'dm-part-b', 'dm-part-c', 'dm-part-d'];

  function f(d) {
    return C.format(d);
  }

  // 4관 한 문제: 직사각형을 4조각으로 나누어 넓이 더하기 → 자연수 곱의 100분의 1배
  function areaProblem(stage, ctx, p, done) {
    var ui = ctx.ui;
    var el = ui.el;
    var parts = C.areaParts(p.a, p.b);
    var prod = C.mul(p.a, p.b);
    var wPx = (p.a.int / 10) * UNIT_PX;
    var hPx = (p.b.int / 10) * UNIT_PX;
    var aw = parts[0].w.int * UNIT_PX;
    var bh = parts[0].h.int * UNIT_PX;
    var shown = 0;
    stage.appendChild(ui.guide('가로 ' + f(p.a) + ' m, 세로 ' + f(p.b) + ' m인 커튼이에요. 자연수 부분과 소수 부분으로 나누어 넓이를 구해 봐요.'));
    var board = ui.board('0 0 ' + (AREA_X + wPx + 30) + ' ' + (AREA_Y + hPx + 34), 'mx-board-wide');
    stage.appendChild(board.wrap);
    var list = el('div', 'dm-part-list');
    stage.appendChild(list);
    var row = el('div', 'mx-btn-row');
    var nextBtn = ui.button('✂️ 다음 조각 보기', 'mx-btn primary', function () {
      shown += 1;
      draw();
      var part = parts[shown - 1];
      var line = el('div', 'dm-part-line ' + PART_CLASS[shown - 1], f(part.w) + ' × ' + f(part.h) + ' = ' + f(part.area));
      list.appendChild(line);
      ctx.say(f(part.w) + ' 곱하기 ' + ui.josa(f(part.h), 'eun') + ' ' + f(part.area));
      if (shown === parts.length) {
        nextBtn.hidden = true;
        steps();
      }
    });
    row.appendChild(nextBtn);
    stage.appendChild(row);
    var after = el('div');
    stage.appendChild(after);

    function rect(x, y, w, h, cls, label) {
      board.svg.appendChild(ui.svg('rect', { x: x, y: y, width: w, height: h, class: cls }));
      if (label) ui.text(board.svg, x + w / 2, y + h / 2, label, 'mx-label mx-label-sm');
    }

    function draw() {
      var s = board.svg;
      s.replaceChildren();
      rect(AREA_X, AREA_Y, wPx, hPx, 'dm-area-bg');
      var boxes = [
        [AREA_X, AREA_Y, aw, bh],
        [AREA_X + aw, AREA_Y, wPx - aw, bh],
        [AREA_X, AREA_Y + bh, aw, hPx - bh],
        [AREA_X + aw, AREA_Y + bh, wPx - aw, hPx - bh]
      ];
      for (var i = 0; i < shown; i += 1) {
        var bx = boxes[i];
        rect(bx[0], bx[1], bx[2], bx[3], 'dm-part ' + PART_CLASS[i], f(parts[i].area));
      }
      ui.text(s, AREA_X + aw / 2, AREA_Y - 10, String(parts[0].w.int), 'mx-label mx-label-sm');
      ui.text(s, AREA_X + aw + (wPx - aw) / 2, AREA_Y - 10, f(parts[1].w), 'mx-label mx-label-sm mx-label-orange');
      ui.text(s, AREA_X - 16, AREA_Y + bh / 2, String(parts[0].h.int), 'mx-label mx-label-sm');
      ui.text(s, AREA_X - 16, AREA_Y + bh + (hPx - bh) / 2, f(parts[2].h), 'mx-label mx-label-sm mx-label-green');
      ui.text(s, AREA_X + wPx / 2, AREA_Y + hPx + 18, '가로 ' + f(p.a) + ' m · 세로 ' + f(p.b) + ' m', 'mx-label mx-label-sm');
    }

    function steps() {
      var natA = p.a.int;
      var natB = p.b.int;
      var pc = C.pointChoices(prod);
      ui.sequence(after, [
        function (s, next) {
          s.appendChild(ui.choiceQuestion({
            question: '네 조각의 넓이를 모두 더하면 몇 m²일까요?',
            choices: pc.choices.map(function (c) { return c + ' m²'; }),
            answer: pc.answer,
            hint: ui.josa(parts.map(function (x) { return f(x.area); }).join(' + '), 'eul') + ' 차례로 더해 봐요.',
            explain: parts.map(function (x) { return f(x.area); }).join(' + ') + ' = ' + f(prod) + ' m²',
            onSolved: next
          }));
        },
        function (s, next) {
          s.appendChild(el('span', 'mx-step-label', '자연수의 곱셈으로 확인하기'));
          var line = el('div', 'mx-formula');
          line.appendChild(el('span', 'mx-chip', natA + ' × ' + natB + ' = ' + (natA * natB)));
          line.appendChild(el('span', 'mx-arrow', '→ 100분의 1배 →'));
          line.appendChild(el('span', 'mx-chip green', C.formatRaw(prod)));
          s.appendChild(line);
          var raw = C.formatRaw(prod);
          if (raw !== f(prod)) {
            s.appendChild(el('p', 'mx-note', '🧹 ' + raw + '처럼 소수 끝자리의 0은 지워서 ' + ui.josa(f(prod), 'ro') + ' 써요.'));
          } else {
            s.appendChild(el('p', 'mx-note', '소수 한 자리 × 소수 한 자리 → 곱은 소수 두 자리예요.'));
          }
          s.appendChild(ui.button('확인했어요 ✔', 'mx-btn primary', function (evt) {
            evt.currentTarget.disabled = true;
            ctx.praise();
            next();
          }));
        }
      ], done);
    }

    draw();
  }

  var tab4 = {
    title: '4관 넓이 4조각',
    icon: '🪟',
    sub: '□.□ × □.□',
    render: function (container, ctx) {
      var ui = ctx.ui;
      container.appendChild(ui.concept('🪟 (1보다 큰 소수) × (1보다 큰 소수)', '2.4 × 1.5는 직사각형을 네 조각으로 나누어 2 + 0.4 + 1 + 0.2 = 3.6처럼 구할 수 있어요. 24 × 15 = 360을 먼저 계산하고 100분의 1배를 하면 3.60인데, 끝자리 0은 지워서 3.6으로 써요.'));
      global.DecimalLabsA.twoProblems(container, ctx, { a: C.dec(24, 1), b: C.dec(15, 1) }, function () { return C.makeLab4(); }, {
        title: '커튼 넓이 조각 나누기',
        solve: function (stage, p, done) { areaProblem(stage, ctx, p, done); }
      });
      ctx.say('4관이에요. 넓이를 네 조각으로 나누어 볼까요?');
    }
  };

  // 5관: 숫자 띠 3·5·0·0 위에서 소수점이 옮겨 다닌다. pointIdx = 소수점 앞 숫자 개수
  var STRIP = '3500';

  function makeStrip(el) {
    var wrap = el('div', 'dm-strip');
    var cells = [];
    for (var i = 0; i < STRIP.length; i += 1) {
      var c = el('span', 'dm-digit', STRIP.charAt(i));
      cells.push(c);
      wrap.appendChild(c);
    }
    var dot = el('span', 'dm-dot', '●');
    wrap.appendChild(dot);
    return {
      wrap: wrap,
      set: function (pointIdx) {
        dot.style.left = 'calc(' + pointIdx + ' * var(--dm-cell) - 7px)';
        dot.hidden = pointIdx >= STRIP.length;
        cells.forEach(function (c, i) {
          // 소수점 뒤 끝자리 0은 흐리게 (값에 영향 없음)
          var after = i >= pointIdx;
          var allZeroAfter = STRIP.slice(Math.max(i, pointIdx)).replace(/0/g, '') === '';
          c.classList.toggle('dm-digit-faint', after && allZeroAfter);
        });
      }
    };
  }

  function stripValue(pointIdx) {
    return f(C.dec(parseInt(STRIP, 10), STRIP.length - pointIdx));
  }

  function shiftPart(ctx, box, opts, onAll) {
    var ui = ctx.ui;
    var el = ui.el;
    box.appendChild(el('p', 'mx-question', opts.question));
    var strip = makeStrip(el);
    box.appendChild(strip.wrap);
    strip.set(opts.start);
    var log = el('div', 'dm-shift-log');
    var row = el('div', 'mx-btn-row');
    var pressed = {};
    opts.multipliers.forEach(function (m) {
      row.appendChild(ui.button(opts.base + ' × ' + m.label, 'mx-btn', function (evt) {
        var idx = opts.start + m.shift;
        strip.set(idx);
        var dir = m.shift === 0 ? '그대로' : (m.shift > 0 ? '오른쪽으로 ' : '왼쪽으로 ') + (m.shift === 0 ? '' : Math.abs(m.shift) + '칸');
        var line = el('div', 'dm-shift-line', opts.base + ' × ' + m.label + ' = ' + stripValue(idx) + '  (소수점 ' + dir + ')');
        log.appendChild(line);
        evt.currentTarget.classList.add('selected');
        ctx.say(opts.base + ' 곱하기 ' + ui.josa(m.label, 'eun') + ' ' + stripValue(idx));
        pressed[m.label] = true;
        if (Object.keys(pressed).length === opts.multipliers.length && !opts.doneOnce) {
          opts.doneOnce = true;
          onAll();
        }
      }));
    });
    box.appendChild(row);
    box.appendChild(log);
  }

  var tab5 = {
    title: '5관 소수점 이동',
    icon: '🍬',
    sub: '× 10, × 0.1',
    render: function (container, ctx) {
      var ui = ctx.ui;
      container.appendChild(ui.concept('🍬 곱의 소수점 위치', '10, 100, 1000을 곱하면 0의 개수만큼 소수점이 오른쪽으로, 0.1, 0.01, 0.001을 곱하면 소수점 아래 자리 수만큼 왼쪽으로 옮겨 가요. 소수끼리 곱하면, 곱의 소수점 아래 자리 수는 두 수의 소수점 아래 자리 수를 더한 것과 같아요.'));
      var card = ui.card('젤리 가게 소수점 점프');
      container.appendChild(card);
      ui.sequence(card, [
        function (s, next) {
          shiftPart(ctx, s, {
            question: '① 3.5에 10, 100, 1000을 곱해 보세요. 버튼을 모두 눌러요.',
            base: '3.5',
            start: 1,
            multipliers: [{ label: '1', shift: 0 }, { label: '10', shift: 1 }, { label: '100', shift: 2 }, { label: '1000', shift: 3 }]
          }, next);
        },
        function (s, next) {
          s.appendChild(ui.choiceQuestion({
            question: '곱하는 수의 0이 하나씩 늘 때마다 소수점은 어떻게 옮겨 갈까요?',
            choices: ['오른쪽으로 한 칸씩', '왼쪽으로 한 칸씩', '옮기지 않아요'],
            answer: 0,
            hint: '3.5 → 35 → 350 → 3500. 수가 커질 때 소수점이 어느 쪽으로 갔는지 띠를 다시 봐요.',
            explain: '10배 할 때마다 소수점이 오른쪽으로 한 칸씩 옮겨 가요.',
            onSolved: next
          }));
        },
        function (s, next) {
          shiftPart(ctx, s, {
            question: '② 3500에 0.1, 0.01, 0.001을 곱해 보세요.',
            base: '3500',
            start: 4,
            multipliers: [{ label: '1', shift: 0 }, { label: '0.1', shift: -1 }, { label: '0.01', shift: -2 }, { label: '0.001', shift: -3 }]
          }, next);
        },
        function (s, next) {
          s.appendChild(ui.el('span', 'mx-step-label', '③ 4 × 7 = 28을 이용해요'));
          s.appendChild(ui.choiceQuestion({
            question: '0.4 × 0.7 = ?',
            choices: ['0.28', '2.8', '0.028'],
            answer: 0,
            hint: '0.4는 소수 한 자리, 0.7도 소수 한 자리예요. 곱은 소수 몇 자리일까요?',
            explain: '1자리 + 1자리 = 2자리라서 28 → 0.28이에요.',
            onSolved: next
          }));
        },
        function (s, next) {
          s.appendChild(ui.choiceQuestion({
            question: '0.04 × 0.07 = ?',
            choices: ['0.0028', '0.028', '0.28'],
            answer: 0,
            hint: '두 자리 + 두 자리 = 네 자리예요. 28 앞에 0을 채워서 소수 네 자리를 만들어요.',
            explain: '2자리 + 2자리 = 4자리라서 28 → 0.0028이에요.',
            onSolved: next
          }));
        },
        function (s, next) {
          s.appendChild(ui.el('span', 'mx-step-label', '④ 54 × 89 = 4806을 이용해요'));
          s.appendChild(ui.choiceQuestion({
            question: '5.4 × 8.9 = ?',
            choices: ['48.06', '480.6', '4.806'],
            answer: 0,
            hint: '5.4는 소수 한 자리, 8.9도 소수 한 자리예요. 4806의 오른쪽 끝에서 두 자리를 세어 소수점을 찍어요.',
            explain: '1자리 + 1자리 = 2자리라서 4806 → 48.06이에요.',
            onSolved: next
          }));
        }
      ], function () {
        ctx.complete();
        card.appendChild(ui.doneBadge());
      });
      ctx.say('5관이에요. 소수점이 어디로 점프하는지 볼까요?');
    }
  };

  // 6관 한 문제: 자연수처럼 곱한 값은 보여 주고, 소수점 아래 자리 수 세기 → 소수점 자리 고르기
  function placeChoices(total) {
    var list = [total, total + 1, total - 1 >= 1 ? total - 1 : total + 2];
    return list.map(String);
  }

  function drillProblem(stage, ctx, p, done) {
    var ui = ctx.ui;
    var el = ui.el;
    var prod = C.mul(p.a, p.b);
    var slots = C.pointSlots(prod);
    var total = p.a.places + p.b.places;
    stage.appendChild(el('div', 'dm-drill-head', f(p.a) + ' × ' + f(p.b)));
    var line = el('div', 'mx-formula');
    line.appendChild(el('span', 'mx-step-label', '자연수처럼 곱하면'));
    line.appendChild(el('span', 'mx-chip', p.a.int + ' × ' + p.b.int + ' = ' + Math.abs(prod.int)));
    stage.appendChild(line);
    var after = el('div');
    stage.appendChild(after);

    ui.sequence(after, [
      function (s, next) {
        s.appendChild(ui.choiceQuestion({
          question: '곱의 소수점 아래 자리 수는 몇 자리일까요?',
          choices: placeChoices(total).map(function (x) { return x + '자리'; }),
          answer: 0,
          hint: ui.josa(f(p.a), 'eun') + ' 소수 ' + p.a.places + '자리, ' + ui.josa(f(p.b), 'eun') + ' 소수 ' + p.b.places + '자리예요. 두 수를 더해 봐요.',
          explain: p.a.places + ' + ' + p.b.places + ' = ' + total + '자리예요.',
          onSolved: next
        }));
      },
      function (s, next) {
        if (slots.padded > 1) {
          s.appendChild(el('p', 'mx-note dm-pad-note', '🧩 ' + Math.abs(prod.int) + '만으로는 소수점 아래 ' + total + '자리를 채울 수 없어요. 앞에 0을 채웠어요. 맨 앞 0은 일의 자리예요.'));
        } else if (slots.padded === 1) {
          s.appendChild(el('p', 'mx-note dm-pad-note', '🧩 1보다 작은 수가 되니까 맨 앞에 일의 자리 0을 써 두었어요.'));
        }
        s.appendChild(el('p', 'mx-question', '오른쪽 끝에서 ' + total + '자리를 세어, 소수점 찍을 곳을 눌러요.'));
        var strip = el('div', 'dm-slot-strip');
        var hintEl = el('div', 'mx-hint');
        hintEl.hidden = true;
        var solved = false;
        var answerBtn = null;
        for (var i = 0; i < slots.digits.length; i += 1) {
          if (i > 0) {
            (function (pos) {
              var b = ui.button('', 'dm-slot', function () {
                if (solved || b.disabled) return;
                if (pos === slots.slot) {
                  solved = true;
                  b.classList.remove('mx-glow');
                  b.classList.add('is-correct');
                  b.textContent = '.';
                  ctx.praise();
                  ui.hint(hintEl, '');
                  next();
                  return;
                }
                b.disabled = true;
                b.classList.add('is-off');
                ctx.encourage();
                ui.hint(hintEl, '💡 맨 오른쪽 숫자부터 왼쪽으로 ' + total + '칸을 세어 봐요. 반짝이는 자리예요.');
                if (answerBtn) answerBtn.classList.add('mx-glow');
              });
              b.setAttribute('aria-label', '왼쪽에서 ' + pos + '번째 숫자 뒤');
              if (pos === slots.slot) answerBtn = b;
              strip.appendChild(b);
            })(i);
          }
          var cls = i < slots.padded ? 'dm-digit dm-digit-pad' : 'dm-digit';
          strip.appendChild(el('span', cls, slots.digits.charAt(i)));
        }
        s.appendChild(strip);
        s.appendChild(hintEl);
      },
      function (s, next) {
        var raw = C.formatRaw(prod);
        var text = f(p.a) + ' × ' + f(p.b) + ' = ' + raw;
        if (raw !== f(prod)) text += ' → 끝자리 0을 지워서 ' + f(prod);
        s.appendChild(el('div', 'mx-formula dm-result', text));
        var aBig = C.compare(p.a, C.dec(1, 0)) >= 0;
        var bBig = C.compare(p.b, C.dec(1, 0)) >= 0;
        if (aBig && bBig) {
          var ra = Math.round(p.a.int / Math.pow(10, p.a.places));
          var rb = Math.round(p.b.int / Math.pow(10, p.b.places));
          s.appendChild(el('p', 'mx-note', '🔎 어림: ' + f(p.a) + ' → 약 ' + ra + ', ' + f(p.b) + ' → 약 ' + rb + '. 곱은 약 ' + (ra * rb) + '쯤이에요. 답과 비슷하죠?'));
        } else {
          s.appendChild(el('p', 'mx-note', '🔎 1보다 작은 소수를 곱했으니 곱은 다른 수보다 작아져요.'));
        }
        ctx.say(f(p.a) + ' 곱하기 ' + ui.josa(f(p.b), 'eun') + ' ' + f(prod));
        next();
      }
    ], done);
  }

  var tab6 = {
    title: '6관 소수점 찍기',
    icon: '🎯',
    sub: '실전 5문제',
    render: function (container, ctx) {
      var ui = ctx.ui;
      container.appendChild(ui.concept('🎯 자연수처럼 곱하고 소수점 찍기', '소수의 곱셈은 먼저 자연수처럼 곱해요. 그다음 두 수의 소수점 아래 자리 수를 더한 만큼, 오른쪽 끝에서 세어 소수점을 찍어요. 숫자가 모자라면 앞에 0을 채우고, 소수 끝자리의 0은 지워요.'));
      var card = ui.card('소수점 찍기 훈련');
      container.appendChild(card);
      var set = C.makeDrillSet(5);
      var idx = 0;
      var stage = ui.el('div');
      card.appendChild(stage);

      function run() {
        stage.replaceChildren();
        stage.appendChild(ui.el('span', 'mx-step-label', '문제 ' + (idx + 1) + ' / ' + set.length));
        drillProblem(stage, ctx, set[idx], function () {
          var row = ui.el('div', 'mx-btn-row');
          if (idx + 1 < set.length) {
            row.appendChild(ui.button('다음 문제 ▶', 'mx-btn primary', function () {
              idx += 1;
              run();
            }));
          } else {
            ctx.complete();
            stage.appendChild(ui.doneBadge('5문제를 모두 풀었어요!'));
            row.appendChild(ui.button('🎲 새 문제 5개', 'mx-btn', function () {
              set = C.makeDrillSet(5);
              idx = 0;
              run();
            }));
          }
          stage.appendChild(row);
        });
      }
      run();
      ctx.say('6관이에요. 자연수처럼 곱하고 소수점을 찍어 볼까요?');
    }
  };

  function start() {
    var A = global.DecimalLabsA;
    if (!global.MathExplorer || !A) return;
    global.MathExplorer.mount({
      key: 'decimal',
      labs: [A.tab1, A.tab2, A.tab3, tab4, tab5, tab6],
      quiz: global.MathExplorerQuiz ? global.MathExplorerQuiz.create({
        grade: '5-2',
        unit: '4. 소수의 곱셈',
        title: '🏆 소수의 곱셈 퀴즈 배틀',
        intro: '소수의 곱셈 퀴즈 배틀이에요. 천천히 읽고 골라 볼까요?'
      }) : null
    });
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
  }

  global.DecimalLabsB = { tab4: tab4, tab5: tab5, tab6: tab6, placeChoices: placeChoices };
})(typeof window !== 'undefined' ? window : globalThis);
