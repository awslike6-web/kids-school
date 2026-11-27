// 초등 3학년 길이와 시간 탐험관: 1~4관 + 노션 퀴즈 배틀 (2026-11-28 옛 화면을 공용 틀로 옮김, 리팩토링 묶음 F7)
// 관마다 미션 3개를 맞히면 관 완료(ctx.complete). 그 뒤에도 미션은 계속 나온다.
(function (global) {
  'use strict';

  var CORE = global.LenTimeCore;
  var MISSIONS = 3;

  // 미션 진행 줄: 맞힐 때마다 hit(), MISSIONS번째에 관 완료
  function missionTracker(ui, ctx, card) {
    var count = 0;
    var line = ui.el('p', 'lt-mission-count', '');
    function paint() {
      line.textContent = ctx.isDone()
        ? '✅ 이 관을 마쳤어요! 더 해 봐도 좋아요.'
        : '미션 ' + Math.min(count, MISSIONS) + ' / ' + MISSIONS;
    }
    paint();
    card.appendChild(line);
    return {
      hit: function () {
        count += 1;
        if (count >= MISSIONS && !ctx.isDone()) {
          ctx.complete();
          card.appendChild(ui.doneBadge('관 완료! 보석을 받았어요.'));
        }
        paint();
      }
    };
  }

  // ── 자 그림: fromMm~toMm 구간을 1mm당 unit 만큼 ──
  function drawRuler(ui, svg, fromMm, toMm, unit, bar) {
    var X0 = 14;
    var x = function (mm) { return X0 + (mm - fromMm) * unit; };
    var big = unit >= 12;
    var top = 56;
    svg.appendChild(ui.svg('rect', { x: X0 - 8, y: top, width: (toMm - fromMm) * unit + 16, height: big ? 52 : 46, rx: 6, class: 'lt-ruler' }));
    for (var mm = fromMm; mm <= toMm; mm += 1) {
      var len = mm % 10 === 0 ? 20 : mm % 5 === 0 ? 13 : 8;
      svg.appendChild(ui.svg('line', { x1: x(mm), y1: top, x2: x(mm), y2: top + len, class: mm % 10 === 0 ? 'lt-tick lt-tick-cm' : 'lt-tick' }));
      if (mm % 10 === 0) ui.text(svg, x(mm), top + 33, String(mm / 10), big ? 'lt-cm-label lt-cm-big' : 'lt-cm-label');
    }
    if (bar) {
      var s = Math.max(bar.start, fromMm - 1);
      var e = Math.min(bar.end, toMm + 1);
      svg.appendChild(ui.svg('rect', { x: x(s), y: 16, width: Math.max(0, (e - s) * unit), height: 26, rx: bar.start < fromMm || bar.end > toMm ? 0 : 5, class: 'lt-bar' }));
      [bar.start, bar.end].forEach(function (v) {
        if (v < fromMm || v > toMm) return;
        svg.appendChild(ui.svg('line', { x1: x(v), y1: 12, x2: x(v), y2: top, class: 'lt-edge' }));
      });
    }
  }

  function rulerBoard(ui, fromMm, toMm, unit, bar, cls) {
    var w = (toMm - fromMm) * unit + 28;
    var b = ui.board('0 0 ' + w + ' ' + (unit >= 12 ? 114 : 108), cls);
    drawRuler(ui, b.svg, fromMm, toMm, unit, bar);
    return b;
  }

  // ── 1관: 자로 재기 (1mm) ──
  var lab1 = {
    title: '1관 자로 재기',
    icon: '📏',
    sub: '1cm = 10mm',
    render: function (container, ctx) {
      var ui = ctx.ui;
      var card = ui.card('1관 📏 1mm까지 자로 재기');
      card.appendChild(ui.concept('1mm', '자에서 1cm를 작은 눈금 10칸으로 똑같이 나눈 한 칸의 길이가 1mm예요. 1cm는 10mm예요. 길이를 잴 때는 막대의 한쪽 끝을 눈금 0에 맞추고, 0이 아닌 곳에 맞췄다면 시작 눈금부터 몇 칸인지 세어요.'));
      var area = ui.el('div', 'lt-area');
      card.appendChild(area);
      var tracker = missionTracker(ui, ctx, card);
      container.appendChild(card);

      var prev = null;
      function ask() {
        var q = CORE.makeMeasure(Math.random, prev);
        prev = q.len;
        area.replaceChildren();
        area.appendChild(ui.el('p', 'lt-mission-text', '🎯 미션: 빨간 막대의 길이는 몇 cm 몇 mm일까요?'));
        area.appendChild(rulerBoard(ui, 0, 60, 5, q, 'lt-ruler-board').wrap);
        var zoom = ui.el('div', 'lt-zoom');
        area.appendChild(ui.button('🔍 막대 끝 크게 보기', 'mx-btn lt-zoom-btn', function () {
          zoom.replaceChildren();
          var ends = q.start > 0 ? [['시작 부분', q.start], ['끝 부분', q.end]] : [['끝 부분', q.end]];
          ends.forEach(function (it) {
            var box = ui.el('div', 'lt-zoom-box');
            box.appendChild(ui.el('p', 'lt-zoom-label', it[0]));
            var from = Math.max(0, Math.min(60 - 12, it[1] - 6));
            box.appendChild(rulerBoard(ui, from, from + 12, 18, q, 'lt-zoom-board').wrap);
            zoom.appendChild(box);
          });
        }));
        area.appendChild(zoom);
        var c = Math.floor(q.len / 10);
        var r = q.len % 10;
        var how = q.start > 0
          ? '막대는 ' + CORE.fmtMm(q.start) + ' 눈금에서 ' + CORE.fmtMm(q.end) + ' 눈금까지예요. '
          : '0에서 시작하니 끝 눈금을 그대로 읽어요. ';
        area.appendChild(ui.choiceQuestion({
          question: '',
          choices: q.choices,
          answer: q.answer,
          hint: function (i) {
            if (i === q.endIndex) return '막대가 0이 아닌 곳에서 시작해요. 끝 눈금만 읽지 말고 시작 눈금부터 몇 칸인지 세어 봐요.';
            return '큰 눈금 한 칸은 1cm, 작은 눈금 한 칸은 1mm예요. 🔍 크게 보기로 다시 세어 봐요.';
          },
          explain: how + '1cm가 ' + c + '개, 1mm가 ' + r + '개라서 ' + CORE.fmtMm(q.len) + '예요. ' + q.len + 'mm와 같아요.',
          onSolved: function () {
            tracker.hit();
            area.appendChild(ui.button('다음 문제 ▶', 'mx-btn primary lt-next', ask));
          }
        }));
      }
      ask();
    }
  };

  // ── 2관: 단위 바꾸기 (mm·cm, m·km) ──
  var lab2 = {
    title: '2관 단위 바꾸기',
    icon: '🔁',
    sub: 'mm·cm·m·km',
    render: function (container, ctx) {
      var ui = ctx.ui;
      var card = ui.card('2관 🔁 길이 단위 바꾸기');
      card.appendChild(ui.concept('1km', '1000m를 1km라고 해요. 1km 200m는 1200m와 같아요. 작은 단위로는 1cm가 10mm예요. 바꿀 때는 큰 단위를 먼저 작은 단위로 바꾸고, 남은 수를 자리에 맞춰 더해요.'));
      var table = ui.el('div', 'lt-unit-table');
      [['1cm', '10mm'], ['1m', '100cm'], ['1km', '1000m']].forEach(function (p) {
        var cell = ui.el('div', 'lt-unit-cell');
        cell.appendChild(ui.el('span', 'lt-unit-big', p[0]));
        cell.appendChild(ui.el('span', 'lt-unit-eq', '='));
        cell.appendChild(ui.el('span', 'lt-unit-small', p[1]));
        table.appendChild(cell);
      });
      card.appendChild(table);
      var area = ui.el('div', 'lt-area');
      card.appendChild(area);
      var tracker = missionTracker(ui, ctx, card);
      container.appendChild(card);

      var prevType = null;
      var first = true;
      function ask() {
        var q = CORE.makeConvert(Math.random, prevType);
        prevType = q.type;
        area.replaceChildren();
        area.appendChild(ui.choiceQuestion({
          question: q.question,
          speak: q.speak,
          sayQuestion: !first,
          choices: q.choices,
          answer: q.answer,
          hint: q.hint,
          explain: q.explain,
          onSolved: function () {
            tracker.hit();
            area.appendChild(ui.button('다음 문제 ▶', 'mx-btn primary lt-next', ask));
          }
        }));
        first = false;
      }
      ask();
    }
  };

  // ── 3관: 1초 감각 (보지 않고 멈추기) ──
  function clockText(ms) {
    var t = Math.floor(ms / 100);
    return Math.floor(t / 10) + '.' + (t % 10) + '초';
  }

  var lab3 = {
    title: '3관 1초 감각',
    icon: '⏱️',
    sub: '보지 않고 멈추기',
    render: function (container, ctx) {
      var ui = ctx.ui;
      var card = ui.card('3관 ⏱️ 1초 감각 챌린지');
      card.appendChild(ui.concept('1초', '초바늘이 작은 눈금 한 칸을 가는 동안이 1초예요. 초바늘이 한 바퀴 도는 60초가 1분이에요. 「하나, 둘, 셋」을 천천히 세면 한 번에 1초쯤이에요.'));
      var mission = ui.el('p', 'lt-mission-text', '');
      card.appendChild(mission);
      var face = ui.el('div', 'lt-watch', '⏱️ 준비');
      card.appendChild(face);
      var peekLabel = ui.el('label', 'lt-peek');
      var peek = ui.el('input');
      peek.type = 'checkbox';
      peekLabel.appendChild(peek);
      peekLabel.appendChild(ui.el('span', '', ' 👀 연습: 초시계 보면서 하기'));
      card.appendChild(peekLabel);
      var row = ui.el('div', 'lt-btn-row');
      var hint = ui.el('div', 'mx-hint');
      hint.hidden = true;
      card.appendChild(row);
      card.appendChild(hint);
      var tracker = missionTracker(ui, ctx, card);
      container.appendChild(card);

      var m = null;
      var startAt = 0;
      var timer = null;
      var running = false;

      function stopTicker() {
        if (timer) global.clearInterval(timer);
        timer = null;
      }
      function tick() {
        if (!face.isConnected) {
          stopTicker();
          return;
        }
        face.textContent = '⏱️ ' + clockText(Date.now() - startAt);
      }
      var goBtn = ui.button('▶ 시작', 'mx-btn primary lt-go', function () {
        if (!running) {
          running = true;
          startAt = Date.now();
          goBtn.textContent = '■ 멈춤';
          ui.hint(hint, '');
          face.classList.add('is-running');
          if (peek.checked) {
            tick();
            timer = global.setInterval(tick, 100);
          } else {
            face.textContent = '⏳ 마음속으로 세는 중…';
          }
          return;
        }
        var ms = Date.now() - startAt;
        running = false;
        stopTicker();
        face.classList.remove('is-running');
        goBtn.textContent = '▶ 다시 시작';
        var j = CORE.judgeSense(m.target, ms);
        face.textContent = '⏱️ ' + j.shown;
        if (j.ok && !peek.checked) {
          ctx.praise();
          ui.hint(hint, '✨ ' + j.shown + '에 멈췄어요! 목표 ' + m.target + '초와 ' + j.diffText + '밖에 차이 나지 않아요.');
          tracker.hit();
          hint.appendChild(ui.button('다음 미션 ▶', 'mx-btn primary lt-next', next));
        } else if (j.ok) {
          ui.hint(hint, '👍 보면서 맞혔어요. 이제 「보면서 하기」를 끄고 마음속으로 세어 봐요.');
        } else {
          ctx.encourage();
          ui.hint(hint, '💡 ' + j.shown + '에 멈췄어요. 목표보다 ' + j.diffText + ' ' + (j.early ? '빨랐어요. 조금 더 천천히 세어 봐요.' : '늦었어요. 조금 더 빨리 세어 봐요.'));
        }
      });
      row.appendChild(goBtn);

      function setMission() {
        mission.textContent = '🎯 미션: 시작을 누르고 마음속으로 세다가 ' + m.target + '초가 되면 멈춰요 (1초 차이까지 성공)';
      }
      function next() {
        m = CORE.makeSense(Math.random, m ? m.target : null);
        stopTicker();
        running = false;
        goBtn.textContent = '▶ 시작';
        face.textContent = '⏱️ 준비';
        ui.hint(hint, '');
        setMission();
        ctx.say(m.target + '초에 맞춰 멈춰 봐요');
      }
      m = CORE.makeSense(Math.random, null);
      setMission();
    }
  };

  // ── 4관: 시간의 덧셈과 뺄셈 ──
  var lab4 = {
    title: '4관 시간 계산',
    icon: '🕰️',
    sub: '1분 = 60초',
    render: function (container, ctx) {
      var ui = ctx.ui;
      var card = ui.card('4관 🕰️ 분과 초 계산하기');
      card.appendChild(ui.concept('시간의 덧셈과 뺄셈', '1분은 60초예요. 시간을 더하고 뺄 때는 초는 초끼리, 분은 분끼리 계산해요. 초끼리 더해 60초가 넘으면 60초를 1분으로 받아올리고, 초끼리 뺄 수 없으면 1분을 60초로 받아내려요.'));
      var area = ui.el('div', 'lt-area');
      card.appendChild(area);
      var tracker = missionTracker(ui, ctx, card);
      container.appendChild(card);

      var prevType = null;
      var first = true;
      function ask() {
        var q = CORE.makeTime(Math.random, prevType);
        prevType = q.type;
        area.replaceChildren();
        area.appendChild(ui.choiceQuestion({
          question: q.question,
          speak: q.question.replace(' − ', ' 빼기 ').replace(' + ', ' 더하기 '),
          sayQuestion: !first,
          choices: q.choices,
          answer: q.answer,
          hint: q.hint,
          explain: q.explain,
          onSolved: function () {
            tracker.hit();
            area.appendChild(ui.button('다음 문제 ▶', 'mx-btn primary lt-next', ask));
          }
        }));
        first = false;
      }
      ask();
    }
  };

  function mount() {
    global.MathExplorer.mount({
      key: 'lentime3',
      rememberTab: true,
      labs: [lab1, lab2, lab3, lab4],
      quiz: global.MathExplorerQuiz.create({
        grade: '3-1',
        unit: '5. 길이와 시간',
        title: '퀴즈 배틀',
        intro: '퀴즈 배틀이에요. 천천히 읽고 골라 볼까요?'
      })
    });
  }

  global.LenTimeLabs = { mount: mount };

  if (global.document && global.document.readyState === 'loading') {
    global.document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})(typeof window !== 'undefined' ? window : globalThis);
