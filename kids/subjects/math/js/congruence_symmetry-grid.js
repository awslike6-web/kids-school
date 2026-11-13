// 5-2 수학 3단원 합동과 대칭: 모눈에 점 찍어 완성하는 관 (CSGrid) — 4관 선대칭, 6관 점대칭, 대칭 픽토그램 공방
// 문제 생성·대응점 계산은 CongruenceGeo(ctx.geo), 그리기 도우미는 ctx.ui(main)만 쓴다.
(function (global) {
  'use strict';

  var PAINT = [
    { label: '파랑', cls: 'paint-blue' },
    { label: '초록', cls: 'paint-green' },
    { label: '주황', cls: 'paint-orange' },
    { label: '보라', cls: 'paint-purple' }
  ];
  // 점대칭 보조선에서 "같은 길이"를 보여 주는 기호 (거리가 소수인 대각선도 칸 수 대신 기호로 짝을 보여 줌)
  var PAIR_MARKS = ['●', '▲', '■', '★', '◆'];

  function button(el, text, cls, onClick) {
    var b = el('button', cls, text);
    b.type = 'button';
    b.addEventListener('click', onClick);
    return b;
  }

  // 대칭축(세로·가로)까지 칸 수
  function axisDistance(p, axis) {
    return axis.kind === 'v' ? Math.abs(p[0] - axis.a[0]) : Math.abs(p[1] - axis.a[1]);
  }

  // 대응점은 대칭축을 수직으로 건너 같은 칸 수만큼: 세로 축이면 왼쪽↔오른쪽, 가로 축이면 위↔아래
  function lineHint(src, axis, label) {
    var n = axisDistance(src, axis);
    var side;
    var other;
    if (axis.kind === 'v') {
      side = src[0] < axis.a[0] ? '왼쪽' : '오른쪽';
      other = src[0] < axis.a[0] ? '오른쪽' : '왼쪽';
    } else {
      side = src[1] < axis.a[1] ? '위쪽' : '아래쪽';
      other = src[1] < axis.a[1] ? '아래쪽' : '위쪽';
    }
    return '점 ' + label + '은 대칭축 ' + side + '으로 ' + n + '칸 떨어져 있어요. 대칭축 ' + other + '으로 똑같이 ' + n + '칸 가면 돼요.';
  }

  function pointHint(src, center, label) {
    var dx = src[0] - center[0];
    var dy = src[1] - center[1];
    var from = [];
    var to = [];
    if (dx) {
      from.push((dx > 0 ? '오른쪽으로 ' : '왼쪽으로 ') + Math.abs(dx) + '칸');
      to.push((dx > 0 ? '왼쪽으로 ' : '오른쪽으로 ') + Math.abs(dx) + '칸');
    }
    if (dy) {
      from.push((dy > 0 ? '아래로 ' : '위로 ') + Math.abs(dy) + '칸');
      to.push((dy > 0 ? '위로 ' : '아래로 ') + Math.abs(dy) + '칸');
    }
    return '점 ' + label + '은 중심 ㅇ에서 ' + from.join(', ') + ' 간 곳에 있어요. 대응점은 중심에서 반대로 ' + to.join(', ') + ' 간 곳이에요.';
  }

  // 글자를 도형 바깥쪽에 놓는다
  function labelAt(ui, svg, p, center, text, cls) {
    var vx = p[0] - center[0];
    var vy = p[1] - center[1];
    var len = Math.hypot(vx, vy) || 1;
    ui.label(svg, p[0] + (vx / len) * 0.45, p[1] + (vy / len) * 0.45, text, cls);
  }

  // given[i]의 대응점 = answer[k] 짝 목록. 선대칭은 거꾸로, 점대칭은 같은 순서.
  function pairsOf(puzzle, mode) {
    var g = puzzle.given;
    return puzzle.answer.map(function (p, k) {
      return { src: mode === 'line' ? g.length - 2 - k : k, dst: p };
    });
  }

  // 성질 보조선: 선대칭은 대칭축과 수직·거리 같음, 점대칭은 중심을 지남·거리 같음
  function drawProperty(ctx, svg, puzzle, mode) {
    var ui = ctx.ui;
    pairsOf(puzzle, mode).forEach(function (pair, k) {
      var a = puzzle.given[pair.src];
      var b = pair.dst;
      svg.appendChild(ctx.svg('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], class: 'cs-aux' }));
      if (mode === 'line') {
        var ax = puzzle.axis;
        var meet = ax.kind === 'v' ? [ax.a[0], a[1]] : [a[0], ax.a[1]];
        var s = 0.28;
        var sx = ax.kind === 'v' ? (a[0] < meet[0] ? -s : s) : s;
        var sy = ax.kind === 'v' ? s : (a[1] < meet[1] ? -s : s);
        svg.appendChild(ctx.svg('polyline', {
          points: ui.pts([[meet[0] + sx, meet[1]], [meet[0] + sx, meet[1] + sy], [meet[0], meet[1] + sy]]),
          class: 'cs-right-angle'
        }));
        var n = axisDistance(a, ax) + '칸';
        var off = ax.kind === 'v' ? [0, -0.32] : [0.4, 0];
        ui.label(svg, (a[0] + meet[0]) / 2 + off[0], (a[1] + meet[1]) / 2 + off[1], n, 'cs-label cs-label-aux');
        ui.label(svg, (b[0] + meet[0]) / 2 + off[0], (b[1] + meet[1]) / 2 + off[1], n, 'cs-label cs-label-aux');
      } else {
        var c = puzzle.center;
        var mark = PAIR_MARKS[k % PAIR_MARKS.length];
        ui.label(svg, (a[0] + c[0]) / 2, (a[1] + c[1]) / 2, mark, 'cs-label cs-label-aux');
        ui.label(svg, (b[0] + c[0]) / 2, (b[1] + c[1]) / 2, mark, 'cs-label cs-label-aux');
      }
    });
  }

  // 한 문제: given 꺾은선에 이어 answer 점을 차례로 찍는다. onSolved()는 문제를 다 풀었을 때 한 번.
  function drawPuzzle(ctx, puzzle, mode, onSolved) {
    var geo = ctx.geo;
    var ui = ctx.ui;
    var el = ui.el;
    var L = geo.LABELS;
    var given = puzzle.given;
    var answer = puzzle.answer;
    var pairs = pairsOf(puzzle, mode);
    var center = geo.bboxCenter(puzzle.full);

    var card = el('div', 'cs-card');
    var guide = el('div', 'cs-guide');
    var hintEl = el('div', 'cs-hint');
    hintEl.hidden = true;
    var bd = ui.board();
    var svg = bd.svg;
    svg.classList.add('cs-pick-board');
    [guide, bd.wrap, hintEl].forEach(function (n) { card.appendChild(n); });

    ui.grid(svg, { dots: true });
    if (mode === 'line') {
      svg.appendChild(ctx.svg('line', { x1: puzzle.axis.a[0], y1: puzzle.axis.a[1], x2: puzzle.axis.b[0], y2: puzzle.axis.b[1], class: 'cs-axis' }));
    } else {
      svg.appendChild(ctx.svg('circle', { cx: puzzle.center[0], cy: puzzle.center[1], r: 0.17, class: 'cs-center' }));
      ui.label(svg, puzzle.center[0] + 0.38, puzzle.center[1] - 0.38, 'ㅇ', 'cs-label cs-label-center');
    }
    var auxLayer = ctx.svg('g', {});
    var userLayer = ctx.svg('g', {});
    var targetLayer = ctx.svg('g', {});
    svg.appendChild(auxLayer);
    svg.appendChild(ctx.svg('polyline', { points: ui.pts(given), class: 'cs-path' }));
    given.forEach(function (p, i) {
      svg.appendChild(ctx.svg('circle', { cx: p[0], cy: p[1], r: 0.13, class: 'cs-point-given' }));
      labelAt(ui, svg, p, center, L[i]);
    });
    svg.appendChild(userLayer);
    svg.appendChild(targetLayer);

    var step = 0;
    var finished = false;

    function redraw() {
      userLayer.replaceChildren();
      var placed = answer.slice(0, step);
      var line = [given[given.length - 1]].concat(placed);
      if (finished) line.push(given[0]);
      if (line.length >= 2) userLayer.appendChild(ctx.svg('polyline', { points: ui.pts(line), class: 'cs-path-b' }));
      placed.forEach(function (p, k) {
        userLayer.appendChild(ctx.svg('circle', { cx: p[0], cy: p[1], r: 0.14, class: 'cs-point' }));
        labelAt(ui, userLayer, p, center, L[given.length + k], 'cs-label cs-label-b');
      });
      if (!finished) guide.textContent = '점 ' + L[pairs[step].src] + '의 대응점을 찍어 보세요 (' + (step + 1) + '/' + answer.length + ')';
    }

    svg.addEventListener('pointerdown', function (e) {
      if (finished) return;
      var hit = ui.gridPoint(svg, e, geo.GRID);
      if (!hit) return;
      var want = answer[step];
      if (hit[0] !== want[0] || hit[1] !== want[1]) {
        // 에러리스: 이유를 알려 주고 정답 자리를 노랗게 깜빡인다
        ctx.encourage();
        var src = given[pairs[step].src];
        ui.hint(hintEl, mode === 'line' ? lineHint(src, puzzle.axis, L[pairs[step].src]) : pointHint(src, puzzle.center, L[pairs[step].src]));
        targetLayer.replaceChildren(ctx.svg('circle', { cx: want[0], cy: want[1], r: 0.26, class: 'cs-point-target' }));
        return;
      }
      ui.hint(hintEl, '');
      targetLayer.replaceChildren();
      step += 1;
      if (step < answer.length) {
        redraw();
        return;
      }
      finished = true;
      redraw();
      drawProperty(ctx, auxLayer, puzzle, mode);
      ctx.praise();
      var msg = mode === 'line'
        ? '완성! 대응점을 이은 선분은 대칭축과 수직으로 만나요. 대칭축에서 두 대응점까지의 거리는 같아요.'
        : '완성! 대응점을 이은 선분은 대칭의 중심을 지나요. 중심에서 두 대응점까지의 거리는 같아요.';
      guide.textContent = msg;
      ctx.say(msg);
      onSolved(card);
    });

    redraw();
    return card;
  }

  // 대칭 픽토그램 공방: 한 칸을 칠하면 대칭인 칸이 함께 칠해진다 (보상 없음, 자유 활동)
  function openWorkshop(ctx, mode) {
    var ui = ctx.ui;
    var el = ui.el;
    var card = el('div', 'cs-card cs-workshop');
    card.appendChild(el('div', 'cs-title', mode === 'line' ? '🎨 선대칭 픽토그램 공방' : '🎨 점대칭 픽토그램 공방'));
    card.appendChild(el('div', 'cs-guide', mode === 'line'
      ? '한쪽만 칠하면 대칭축 반대쪽은 저절로 칠해져요. 나만의 선대칭 픽토그램을 만들어 보세요!'
      : '한 칸을 칠하면 중심 ㅇ을 지나 반대쪽 칸도 저절로 칠해져요. 나만의 점대칭 픽토그램을 만들어 보세요!'));

    var palette = el('div', 'cs-btn-row cs-palette');
    var color = PAINT[0].cls;
    var swatches = [];
    PAINT.forEach(function (p) {
      var b = button(el, p.label, 'cs-btn cs-swatch ' + p.cls, function () {
        color = p.cls;
        refresh();
      });
      b.dataset.paint = p.cls;
      swatches.push(b);
      palette.appendChild(b);
    });
    var eraser = button(el, '지우개', 'cs-btn cs-swatch', function () {
      color = null;
      refresh();
    });
    palette.appendChild(eraser);
    function refresh() {
      swatches.forEach(function (b) { b.classList.toggle('selected', b.dataset.paint === color); });
      eraser.classList.toggle('selected', color === null);
    }
    refresh();
    card.appendChild(palette);

    var bd = ui.board('-0.2 -0.2 8.4 8.4');
    var cells = [];
    for (var c = 0; c < 8; c += 1) {
      cells.push([]);
      for (var r = 0; r < 8; r += 1) {
        var rect = ctx.svg('rect', { x: c, y: r, width: 1, height: 1, class: 'cs-cell' });
        cells[c].push({ rect: rect, paint: null });
        bd.svg.appendChild(rect);
      }
    }
    function paint(cc, rr, value) {
      var cell = cells[cc][rr];
      if (cell.paint) cell.rect.classList.remove(cell.paint);
      cell.paint = value;
      if (value) cell.rect.classList.add(value);
    }
    cells.forEach(function (col, cc) {
      col.forEach(function (cell, rr) {
        // 색을 고르면 항상 칠하고, 지우기는 지우개로만 (두 번 눌러 지워지는 실수 방지)
        cell.rect.addEventListener('pointerdown', function () {
          var value = color;
          paint(cc, rr, value);
          paint(7 - cc, mode === 'line' ? rr : 7 - rr, value);
        });
      });
    });
    if (mode === 'line') bd.svg.appendChild(ctx.svg('line', { x1: 4, y1: 0, x2: 4, y2: 8, class: 'cs-axis' }));
    else bd.svg.appendChild(ctx.svg('circle', { cx: 4, cy: 4, r: 0.17, class: 'cs-center' }));
    card.appendChild(bd.wrap);

    var row = el('div', 'cs-btn-row');
    row.appendChild(button(el, '모두 지우기', 'cs-btn', function () {
      cells.forEach(function (col, cc) { col.forEach(function (cell, rr) { paint(cc, rr, null); }); });
    }));
    card.appendChild(row);
    return card;
  }

  // 4관·6관 공통 진행: 문제 3개 → 완료(보상) → 픽토그램 공방 열기
  function runPuzzleTab(container, ctx, cfg) {
    var ui = ctx.ui;
    var el = ui.el;
    container.replaceChildren();
    container.appendChild(ui.concept(cfg.title, cfg.body));
    ctx.say(cfg.intro);
    var stage = el('div');
    container.appendChild(stage);
    var idx = 0;
    var done = false;

    function show() {
      stage.replaceChildren(el('div', 'cs-step', '문제 ' + (idx + 1) + ' / ' + cfg.puzzles.length));
      var card = drawPuzzle(ctx, cfg.puzzles[idx], cfg.mode, function (solvedCard) {
        var row = el('div', 'cs-btn-row');
        if (idx < cfg.puzzles.length - 1) {
          row.appendChild(button(el, '다음 문제 ▶', 'cs-btn primary', function () {
            idx += 1;
            show();
          }));
        } else {
          row.appendChild(el('span', 'cs-done', cfg.doneText));
          if (!done) {
            done = true;
            ctx.complete();
          }
          row.appendChild(button(el, '🎨 픽토그램 공방 열기', 'cs-btn primary', function () {
            row.remove();
            var ws = openWorkshop(ctx, cfg.mode);
            container.appendChild(ws);
            ws.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }));
        }
        solvedCard.appendChild(row);
      });
      stage.appendChild(card);
    }

    show();
  }

  function seed() {
    return (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0;
  }

  var tab4 = {
    title: '4관 선대칭 완성',
    icon: '✏️',
    sub: '선대칭 그리기',
    render: function (container, ctx) {
      var rng = ctx.geo.makeRng(seed());
      runPuzzleTab(container, ctx, {
        mode: 'line',
        puzzles: [ctx.geo.makeLinePuzzle(rng, 'v'), ctx.geo.makeLinePuzzle(rng, 'h'), ctx.geo.makeLinePuzzle(rng, 'v')],
        title: '선대칭도형의 성질',
        body: '선대칭도형에서 대응변의 길이와 대응각의 크기는 각각 같습니다. 대응점을 이은 선분은 대칭축과 수직으로 만나고, 대칭축에서 두 대응점까지의 거리는 같습니다.',
        intro: '대칭축을 보고 대응점을 찍어서 선대칭도형을 완성해 볼까요?',
        doneText: '🎉 4관 완료! 선대칭도형을 3개 완성했어요'
      });
    }
  };

  var tab6 = {
    title: '6관 점대칭 완성',
    icon: '✳️',
    sub: '점대칭 그리기',
    render: function (container, ctx) {
      var rng = ctx.geo.makeRng(seed());
      runPuzzleTab(container, ctx, {
        mode: 'point',
        puzzles: [ctx.geo.makePointPuzzle(rng), ctx.geo.makePointPuzzle(rng), ctx.geo.makePointPuzzle(rng)],
        title: '점대칭도형의 성질',
        body: '점대칭도형에서 대응변의 길이와 대응각의 크기는 각각 같습니다. 대응점을 이은 선분은 대칭의 중심을 지나고, 대칭의 중심에서 두 대응점까지의 거리는 같습니다.',
        intro: '대칭의 중심 ㅇ을 보고 대응점을 찍어서 점대칭도형을 완성해 볼까요?',
        doneText: '🎉 6관 완료! 점대칭도형을 3개 완성했어요'
      });
    }
  };

  global.CSGrid = { tab4: tab4, tab6: tab6 };
})(typeof window !== 'undefined' ? window : globalThis);
