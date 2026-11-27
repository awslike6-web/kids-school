// 초등 4학년 각도 탐험관: 1~4관 + 노션 퀴즈 배틀 (2026-11-28 옛 화면을 공용 틀로 옮김, 리팩토링 묶음 F6)
// 관마다 미션 3개를 맞히면 관 완료(ctx.complete). 그 뒤에도 미션은 계속 나온다.
(function (global) {
  'use strict';

  var CORE = global.AngleCore;
  var MISSIONS = 3;

  // 미션 진행 줄: 맞힐 때마다 hit(), MISSIONS번째에 관 완료
  function missionTracker(ui, ctx, card) {
    var count = 0;
    var line = ui.el('p', 'ac-mission-count', '');
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

  // ── 각도기 그림 ──
  var PX = 180;
  var PY = 186;
  var PR = 160;

  function drawProtractor(ui, svg, base, ray) {
    svg.replaceChildren();
    var a = CORE.polar(PX, PY, PR, 0);
    var b = CORE.polar(PX, PY, PR, 180);
    svg.appendChild(ui.svg('path', { d: 'M ' + b[0] + ' ' + b[1] + ' A ' + PR + ' ' + PR + ' 0 0 1 ' + a[0] + ' ' + a[1] + ' Z', class: 'ac-prot' }));
    var d;
    for (d = 0; d <= 180; d += 5) {
      var len = d % 10 === 0 ? (d % 30 === 0 ? 16 : 11) : 6;
      var p1 = CORE.polar(PX, PY, PR, d);
      var p2 = CORE.polar(PX, PY, PR - len, d);
      svg.appendChild(ui.svg('line', { x1: p1[0], y1: p1[1], x2: p2[0], y2: p2[1], class: 'ac-tick' }));
    }
    svg.appendChild(ui.svg('path', { d: 'M ' + (PX - 26) + ' ' + PY + ' A 26 26 0 0 1 ' + (PX + 26) + ' ' + PY + ' Z', class: 'ac-prot-hole' }));
    svg.appendChild(ui.svg('line', { x1: PX - PR, y1: PY, x2: PX + PR, y2: PY, class: 'ac-baseline' }));
    if (typeof ray === 'number') {
      var lo = Math.min(base, ray);
      var hi = Math.max(base, ray);
      if (hi > lo) svg.appendChild(ui.svg('path', { d: CORE.wedgePath(PX, PY, 34, lo, hi), class: 'ac-wedge' }));
      [base, ray].forEach(function (ang) {
        var e = CORE.polar(PX, PY, PR + 14, ang);
        svg.appendChild(ui.svg('line', { x1: PX, y1: PY, x2: e[0], y2: e[1], class: 'ac-ray' }));
      });
    }
    // 눈금 숫자는 변 위에 (가려지지 않게)
    for (d = 0; d <= 180; d += 10) {
      var o = CORE.polar(PX, PY, PR - 26, d);
      var n = CORE.polar(PX, PY, PR - 47, d);
      ui.text(svg, o[0], o[1], String(180 - d), 'ac-scale-out');
      ui.text(svg, n[0], n[1], String(d), 'ac-scale-in');
    }
    svg.appendChild(ui.svg('circle', { cx: PX, cy: PY, r: 4, class: 'ac-vertex' }));
  }

  function protractorBoard(ui) {
    return ui.board('0 -8 360 206', 'ac-prot-board');
  }

  // ── 1관: 각도기로 각 읽기 ──
  var lab1 = {
    title: '1관 각도기 읽기',
    icon: '📐',
    sub: '안쪽·바깥쪽 눈금',
    render: function (container, ctx) {
      var ui = ctx.ui;
      var card = ui.card('1관 📐 각도기로 각 재기');
      card.appendChild(ui.concept('각도기 읽는 법', '각도기의 중심을 각의 꼭짓점에, 밑금을 각의 한 변에 맞춰요. 그 변이 닿은 쪽의 0°에서 시작하는 눈금을 따라가며, 다른 변이 가리키는 수를 읽어요. 밑금 오른쪽 끝의 0°는 안쪽 눈금, 왼쪽 끝의 0°는 바깥쪽 눈금이에요.'));
      var area = ui.el('div', 'ac-area');
      card.appendChild(area);
      var tracker = missionTracker(ui, ctx, card);
      container.appendChild(card);

      var prev = null;
      function ask() {
        var q = CORE.makeRead(Math.random, prev);
        prev = q.deg;
        area.replaceChildren();
        area.appendChild(ui.el('p', 'ac-mission-text', '🎯 미션: 빨간 두 변이 만든 각은 몇 도일까요?'));
        var b = protractorBoard(ui);
        drawProtractor(ui, b.svg, q.baseAngle, q.rayAngle);
        area.appendChild(b.wrap);
        var scale = q.side === 'right' ? '안쪽' : '바깥쪽';
        var end = q.side === 'right' ? '오른쪽' : '왼쪽';
        area.appendChild(ui.choiceQuestion({
          question: '',
          choices: q.choices,
          answer: q.answer,
          hint: function (i) {
            if (i === q.wrongScale) return '다른 줄 눈금을 읽었어요. 한 변이 밑금 ' + end + '에 있으니 ' + end + ' 끝 0°에서 시작하는 ' + scale + ' 눈금을 따라가요.';
            return '눈금 한 칸은 10°예요. 0°부터 차근차근 세어 봐요.';
          },
          explain: '밑금 ' + end + ' 0°에서 시작하는 ' + scale + ' 눈금으로 읽으면 ' + q.deg + '°예요. ' + CORE.KIND_NAMES[CORE.kind(q.deg)] + '이에요.',
          onSolved: function () {
            tracker.hit();
            area.appendChild(ui.button('다음 문제 ▶', 'mx-btn primary ac-next', ask));
          }
        }));
      }
      ask();
    }
  };

  // ── 2관: 각 만들기 + 예각·직각·둔각 ──
  var lab2 = {
    title: '2관 각 만들기',
    icon: '✏️',
    sub: '예각·직각·둔각',
    render: function (container, ctx) {
      var ui = ctx.ui;
      var card = ui.card('2관 ✏️ 각 만들고 이름 붙이기');
      card.appendChild(ui.concept('예각과 둔각', '각도가 0°보다 크고 직각(90°)보다 작은 각을 예각이라고 해요. 직각보다 크고 180°보다 작은 각을 둔각이라고 해요.'));
      var mission = ui.el('p', 'ac-mission-text', '');
      card.appendChild(mission);
      var b = protractorBoard(ui);
      card.appendChild(b.wrap);

      var value = 45;
      var slider = ui.el('input', 'ac-slider');
      slider.type = 'range';
      slider.min = '0';
      slider.max = '180';
      slider.step = '5';
      slider.setAttribute('aria-label', '각의 크기');
      var row = ui.el('div', 'ac-btn-row');
      var hint = ui.el('div', 'mx-hint');
      hint.hidden = true;
      var area = ui.el('div', 'ac-area');
      var m = null;
      var locked = false;

      function paint() {
        slider.value = String(value);
        drawProtractor(ui, b.svg, 0, value);
      }
      function setValue(v) {
        if (locked) return;
        value = Math.max(0, Math.min(180, v));
        ui.hint(hint, '');
        paint();
      }
      slider.addEventListener('input', function () { setValue(Number(slider.value)); });
      row.appendChild(ui.button('◀ 5° 작게', 'mx-btn', function () { setValue(value - 5); }));
      row.appendChild(ui.button('5° 크게 ▶', 'mx-btn', function () { setValue(value + 5); }));
      row.appendChild(ui.button('✅ 다 만들었어요', 'mx-btn primary', check));
      card.appendChild(slider);
      card.appendChild(row);
      card.appendChild(hint);
      card.appendChild(area);
      var tracker = missionTracker(ui, ctx, card);
      container.appendChild(card);

      function check() {
        if (locked) return;
        var c = CORE.compareText(value, m.target);
        if (c !== 'same') {
          ctx.encourage();
          ui.hint(hint, '💡 지금 각은 ' + value + '°예요. ' + m.target + '°보다 ' + (c === 'less' ? '작아요. 조금 더 벌려 봐요.' : '커요. 조금 좁혀 봐요.') + ' 안쪽 눈금을 읽어요.');
          return;
        }
        locked = true;
        ctx.praise();
        ui.hint(hint, '✨ ' + m.target + '°를 딱 맞게 만들었어요!');
        area.appendChild(ui.choiceQuestion({
          question: m.target + '°인 각은 어떤 각일까요?',
          choices: CORE.KINDS.map(function (k) { return CORE.KIND_NAMES[k]; }),
          answer: CORE.KINDS.indexOf(m.kind),
          fixed: true,
          sayQuestion: true,
          speak: m.target + '도인 각은 어떤 각일까요?',
          hint: '직각(90°)과 견주어 봐요. 직각보다 작으면 예각, 크면 둔각이에요.',
          explain: m.target + '°는 ' + (m.kind === 'right' ? '직각이에요.' : '직각보다 ' + (m.kind === 'acute' ? '작으니 예각이에요.' : '크니 둔각이에요.')),
          onSolved: function () {
            tracker.hit();
            area.appendChild(ui.button('다음 미션 ▶', 'mx-btn primary ac-next', next));
          }
        }));
      }

      function setMission() {
        mission.textContent = '🎯 미션: 빨간 변을 움직여 ' + m.target + '°인 각을 만들어 봐요';
      }
      function next() {
        var prevKind = m ? m.kind : null;
        do {
          m = CORE.makeBuild(Math.random, prevKind);
        } while (m.target === value);
        locked = false;
        area.replaceChildren();
        ui.hint(hint, '');
        setMission();
        ctx.say(m.target + '도인 각을 만들어 봐요');
      }
      m = CORE.makeBuild(Math.random, null);
      if (m.target === value) value = 0;
      setMission();
      paint();
    }
  };

  // ── 3·4관 공용: 각의 합으로 가려진 각 찾기 ──
  var BW = 300;
  var BH = 200;

  function dist(a, b) {
    return Math.sqrt((a[0] - b[0]) * (a[0] - b[0]) + (a[1] - b[1]) * (a[1] - b[1]));
  }

  function drawShape(ui, svg, q, showDiagonal) {
    svg.replaceChildren();
    var pts = CORE.fit(q.pts, BW, BH, 34);
    svg.appendChild(ui.svg('polygon', { points: pts.map(function (p) { return p.join(','); }).join(' '), class: 'ac-shape' }));
    if (showDiagonal) {
      svg.appendChild(ui.svg('line', { x1: pts[0][0], y1: pts[0][1], x2: pts[2][0], y2: pts[2][1], class: 'ac-diagonal' }));
    }
    q.angles.forEach(function (ang, i) {
      // 화면 좌표는 y가 뒤집혀 있으니 수학 좌표의 시작 방향을 그대로 쓴다
      var start = CORE.cornerStart(q.pts, i);
      var v = pts[i];
      // 부채꼴·숫자 거리는 짧은 이웃 변에 맞춰 줄인다 (숫자가 다른 꼭짓점 쪽으로 넘어가지 않게)
      var side = Math.min(dist(v, pts[(i + 1) % pts.length]), dist(v, pts[(i + pts.length - 1) % pts.length]));
      var wr = Math.min(28, side * 0.28);
      var lr = Math.min(ang < 45 ? 56 : 46, side * 0.45);
      svg.appendChild(ui.svg('path', { d: CORE.wedgePath(v[0], v[1], wr, start, start + ang), class: 'ac-corner ac-c' + i }));
      var lp = CORE.polar(v[0], v[1], lr, start + ang / 2);
      ui.text(svg, lp[0], lp[1], i === q.hidden ? '?' : ang + '°', i === q.hidden ? 'ac-label ac-label-q' : 'ac-label');
    });
  }

  // 모퉁이 모으기: 삼각형은 일직선(180°), 사각형은 한 바퀴(360°)
  function drawGather(ui, q) {
    var full = q.total === 360;
    var b = ui.board(full ? '0 0 300 170' : '0 0 300 130', 'ac-gather-board');
    var cx = 150;
    var cy = full ? 85 : 112;
    var r = full ? 72 : 92;
    if (!full) b.svg.appendChild(ui.svg('line', { x1: 20, y1: cy, x2: 280, y2: cy, class: 'ac-baseline' }));
    var from = 0;
    q.angles.forEach(function (ang, i) {
      b.svg.appendChild(ui.svg('path', { d: CORE.wedgePath(cx, cy, r, from, from + ang), class: 'ac-corner ac-c' + i + ' ac-gathered' }));
      var lp = CORE.polar(cx, cy, r * 0.64, from + ang / 2);
      ui.text(b.svg, lp[0], lp[1], i === q.hidden ? '?' : ang + '°', 'ac-label ac-label-in');
      from += ang;
    });
    b.svg.appendChild(ui.svg('circle', { cx: cx, cy: cy, r: 4, class: 'ac-vertex' }));
    return b.wrap;
  }

  function makePolyLab(spec) {
    return {
      title: spec.title,
      icon: spec.icon,
      sub: spec.sub,
      render: function (container, ctx) {
        var ui = ctx.ui;
        var card = ui.card(spec.cardTitle);
        card.appendChild(ui.concept(spec.conceptTitle, spec.conceptBody));
        var area = ui.el('div', 'ac-area');
        card.appendChild(area);
        var tracker = missionTracker(ui, ctx, card);
        container.appendChild(card);

        var prevHidden = null;
        function ask() {
          var q = spec.make(Math.random, prevHidden);
          prevHidden = q.hidden;
          var diag = false;
          area.replaceChildren();
          area.appendChild(ui.el('p', 'ac-mission-text', '🎯 미션: ?에 알맞은 각도를 찾아요'));
          var board = ui.board('0 0 ' + BW + ' ' + BH, 'ac-shape-board');
          drawShape(ui, board.svg, q, false);
          area.appendChild(board.wrap);
          var extra = ui.el('div', 'ac-extra');
          var row = ui.el('div', 'ac-btn-row');
          row.appendChild(ui.button(spec.gatherText, 'mx-btn', function () {
            extra.replaceChildren(drawGather(ui, q), ui.el('p', 'ac-note', spec.gatherNote));
            ctx.say(spec.gatherNote);
          }));
          if (spec.diagonal) {
            row.appendChild(ui.button('✏️ 대각선 긋기', 'mx-btn', function () {
              diag = !diag;
              drawShape(ui, board.svg, q, diag);
              extra.replaceChildren();
              if (diag) {
                extra.appendChild(ui.el('p', 'ac-note', '대각선 하나로 삼각형 2개가 생겨요. 180° + 180° = 360°예요.'));
                ctx.say('대각선 하나로 삼각형 두 개가 생겨요. 180도 더하기 180도는 360도예요.');
              }
            }));
          }
          area.appendChild(row);
          area.appendChild(extra);
          area.appendChild(ui.choiceQuestion({
            question: '?에 들어갈 각도는 몇 도일까요?',
            choices: q.choices,
            answer: q.answer,
            hint: spec.hint,
            explain: q.formula + '. ' + spec.sumText,
            onSolved: function () {
              tracker.hit();
              area.appendChild(ui.button('다음 문제 ▶', 'mx-btn primary ac-next', ask));
            }
          }));
        }
        ask();
      }
    };
  }

  var lab3 = makePolyLab({
    title: '3관 삼각형 세 각',
    icon: '🔺',
    sub: '합은 180°',
    cardTitle: '3관 🔺 삼각형의 세 각의 합',
    conceptTitle: '삼각형의 세 각의 합',
    conceptBody: '삼각형의 세 모퉁이를 잘라 꼭짓점이 한 점에 모이게 붙이면 일직선이 돼요. 그래서 어떤 삼각형이든 세 각의 크기의 합은 180°예요.',
    gatherText: '✂️ 세 모퉁이 모으기',
    gatherNote: '세 모퉁이를 한 점에 모으면 일직선, 180°가 돼요.',
    diagonal: false,
    make: function (rng, prev) { return CORE.makeTriangle(rng, prev); },
    hint: '세 각을 모두 더하면 180°예요. 180°에서 아는 두 각을 빼 봐요.',
    sumText: '삼각형의 세 각의 합은 180°예요.'
  });

  var lab4 = makePolyLab({
    title: '4관 사각형 네 각',
    icon: '🔷',
    sub: '합은 360°',
    cardTitle: '4관 🔷 사각형의 네 각의 합',
    conceptTitle: '사각형의 네 각의 합',
    conceptBody: '사각형의 네 모퉁이를 잘라 한 점에 모으면 빈틈없이 한 바퀴가 돼요. 대각선을 하나 그으면 삼각형 2개로 나뉘니 180° + 180°이기도 해요. 그래서 사각형의 네 각의 크기의 합은 360°예요.',
    gatherText: '✂️ 네 모퉁이 모으기',
    gatherNote: '네 모퉁이를 한 점에 모으면 한 바퀴, 360°가 돼요.',
    diagonal: true,
    make: function (rng, prev) { return CORE.makeQuad(rng, prev); },
    hint: '네 각을 모두 더하면 360°예요. 360°에서 아는 세 각을 빼 봐요.',
    sumText: '사각형의 네 각의 합은 360°예요.'
  });

  function mount() {
    global.MathExplorer.mount({
      key: 'angles4',
      rememberTab: true,
      labs: [lab1, lab2, lab3, lab4],
      quiz: global.MathExplorerQuiz.create({
        grade: '4-1',
        unit: '2. 각도',
        title: '퀴즈 배틀',
        intro: '퀴즈 배틀이에요. 천천히 읽고 골라 볼까요?'
      })
    });
  }

  global.AngleLabs = { mount: mount };

  if (global.document && global.document.readyState === 'loading') {
    global.document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})(typeof window !== 'undefined' ? window : globalThis);
