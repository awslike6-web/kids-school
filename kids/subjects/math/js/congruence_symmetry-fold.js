// 5-2 수학 3단원 합동과 대칭: 도형을 움직여 보는 관 (CSFold) — 3관 선대칭 접기, 5관 점대칭 돌리기
// 접기·돌리기 판정은 CongruenceGeo(ctx.geo), 그리기 도우미는 ctx.ui(main)만 쓴다.
(function (global) {
  'use strict';

  function now() {
    return typeof performance !== 'undefined' ? performance.now() : Date.now();
  }

  // t: 0→1 동안 step(t)을 부르고, 끝나면 done()
  function animate(ms, step, done) {
    var start = now();
    function frame(ts) {
      var t = Math.min(1, ((ts || now()) - start) / ms);
      step(t);
      if (t < 1) requestAnimationFrame(frame);
      else done();
    }
    requestAnimationFrame(frame);
  }

  // 접어 볼 후보 선. 직사각형처럼 정사각형이 아닌 사각형은 대각선도 후보에 넣는다
  // ("대각선으로 접어도 겹칠까?"는 흔한 오개념이라 직접 접어 보게 한다. symmetryAxes에는 없으므로 오답).
  function foldCandidates(geo, poly) {
    var cands = geo.candidateAxes(poly);
    var hasDiag = cands.some(function (a) { return a.kind === 'd1'; });
    if (poly.length === 4 && !hasDiag) {
      cands.push({ kind: 'd1', a: poly[0], b: poly[2] });
      cands.push({ kind: 'd2', a: poly[1], b: poly[3] });
    }
    return cands;
  }

  function button(el, text, cls, onClick) {
    var b = el('button', cls, text);
    b.type = 'button';
    b.addEventListener('click', onClick);
    return b;
  }

  // ───────────────────────── 3관 선대칭 접기 ─────────────────────────
  function renderTab3(container, ctx) {
    var geo = ctx.geo;
    var ui = ctx.ui;
    var el = ui.el;
    container.replaceChildren();
    container.appendChild(ui.concept('선대칭도형과 대칭축',
      '한 직선을 따라 접었을 때 완전히 겹치는 도형을 선대칭도형이라고 합니다. 이때 그 직선을 대칭축이라고 합니다.'));
    ctx.say('점선을 눌러 도형을 접어 보고, 완전히 겹치는 대칭축을 찾아볼까요?');

    // 교과서 순서: 대칭축 2개 → 1개 → 4개(가장 많음) → 0개
    var items = [geo.SHAPES.rectangle, geo.SHAPES.isoscelesTriangle, geo.SHAPES.square, geo.SHAPES.parallelogram];

    var card = el('div', 'cs-card');
    var guide = el('div', 'cs-guide');
    var boardBox = el('div');
    var btnRow = el('div', 'cs-btn-row');
    var hintEl = el('div', 'cs-hint');
    hintEl.hidden = true;
    [guide, boardBox, btnRow, hintEl].forEach(function (n) { card.appendChild(n); });
    container.appendChild(card);

    var idx = 0;
    var found = [];
    var tried = [];
    var glowKind = null; // 오답 뒤 반짝여 줄 아직 못 찾은 대칭축
    var busy = false;
    var itemDone = false;
    var done = false;

    function load(i) {
      idx = i;
      found = [];
      tried = [];
      glowKind = null;
      busy = false;
      itemDone = false;
      ui.hint(hintEl, '');
      draw();
    }

    function fold(axis, svg, poly, syms) {
      if (busy || itemDone) return;
      busy = true;
      ui.hint(hintEl, '');
      var target = poly.map(function (p) { return geo.reflectPoint(p, axis); });
      var ghost = ctx.svg('polygon', { points: ui.pts(poly), class: 'cs-ghost' });
      svg.appendChild(ghost);
      // 접기: 각 꼭짓점이 대칭축 건너편 같은 거리로 옮겨 간다
      animate(700, function (t) {
        ghost.setAttribute('points', ui.pts(poly.map(function (p, k) {
          return [p[0] + (target[k][0] - p[0]) * t, p[1] + (target[k][1] - p[1]) * t];
        })));
      }, function () {
        var ok = syms.some(function (s) { return s.kind === axis.kind; });
        if (ok) {
          busy = false;
          found.push(axis.kind);
          glowKind = null;
          if (found.length === syms.length) itemDone = true;
          ctx.praise();
          ui.hint(hintEl, '딱 겹쳐요! 이 선이 대칭축이에요.');
          draw();
          return;
        }
        // 에러리스: 어긋난 모습을 보여 준 뒤, 아직 못 찾은 대칭축(없으면 '대칭축이 없어요' 버튼)을 반짝인다
        tried.push(axis.kind);
        var left = syms.filter(function (s) { return found.indexOf(s.kind) < 0; });
        glowKind = left.length ? left[0].kind : null;
        ctx.encourage();
        var msg = left.length
          ? '접으면 어긋나요. 이 선은 대칭축이 아니에요. 반짝이는 선으로 접어 볼까요?'
          : "접으면 어긋나요. 이 선은 대칭축이 아니에요. 어느 선으로도 겹치지 않으면 '대칭축이 없어요'를 눌러요.";
        ui.hint(hintEl, msg);
        ctx.say(msg);
        setTimeout(function () {
          busy = false;
          if (svg.isConnected) draw();
        }, 1300);
      });
    }

    function draw() {
      var item = items[idx];
      var poly = item.poly;
      var syms = geo.symmetryAxes(poly);
      guide.textContent = syms.length
        ? (idx + 1) + '/4 · ' + item.name + ' · 대칭축 ' + syms.length + '개 중 ' + found.length + '개 찾음'
        : (idx + 1) + "/4 · " + item.name + " · 접어도 겹치지 않으면 '대칭축이 없어요'를 눌러요";

      var bd = ui.board();
      var svg = bd.svg;
      ui.grid(svg);
      svg.appendChild(ctx.svg('polygon', { points: ui.pts(poly), class: 'cs-shape' }));
      foldCandidates(geo, poly).forEach(function (axis) {
        var isFound = found.indexOf(axis.kind) >= 0;
        var isTried = tried.indexOf(axis.kind) >= 0;
        svg.appendChild(ctx.svg('line', {
          x1: axis.a[0], y1: axis.a[1], x2: axis.b[0], y2: axis.b[1],
          class: isFound ? 'cs-axis-ok' : (isTried ? 'cs-axis-cand is-off' : (axis.kind === glowKind ? 'cs-axis-cand cs-axis-hint' : 'cs-axis-cand'))
        }));
        if (!isFound && !isTried && !itemDone) {
          var hit = ctx.svg('line', { x1: axis.a[0], y1: axis.a[1], x2: axis.b[0], y2: axis.b[1], class: 'cs-hit' });
          hit.addEventListener('click', function () { fold(axis, svg, poly, syms); });
          svg.appendChild(hit);
        }
      });
      boardBox.replaceChildren(bd.wrap);

      btnRow.replaceChildren();
      if (!syms.length && !itemDone) {
        btnRow.appendChild(button(el, '대칭축이 없어요', 'cs-btn primary' + (tried.length ? ' cs-choice-glow' : ''), function () {
          if (busy) return;
          itemDone = true;
          ctx.praise();
          var msg = '맞아요! ' + item.name + '은 어느 선으로 접어도 겹치지 않아서 대칭축이 없어요.';
          ui.hint(hintEl, msg);
          ctx.say(msg);
          draw();
        }));
      }
      if (!itemDone) return;
      if (idx < items.length - 1) {
        btnRow.appendChild(button(el, '다음 도형 ▶', 'cs-btn primary', function () { load(idx + 1); }));
        return;
      }
      btnRow.appendChild(el('span', 'cs-done', '🎉 3관 완료! 대칭축이 가장 많은 도형은 정사각형(4개)이었어요'));
      if (!done) {
        done = true;
        ctx.complete();
      }
    }

    load(0);
  }

  // ───────────────────────── 5관 점대칭 돌리기 ─────────────────────────
  function renderTab5(container, ctx) {
    var geo = ctx.geo;
    var ui = ctx.ui;
    var el = ui.el;
    container.replaceChildren();
    container.appendChild(ui.concept('점대칭도형과 대칭의 중심',
      '한 도형을 어떤 점을 중심으로 180° 돌렸을 때 처음 도형과 완전히 겹치면 이 도형을 점대칭도형이라고 합니다. 이때 그 점을 대칭의 중심이라고 합니다.'));
    ctx.say('도형을 돌려 보면서 180° 돌렸을 때 완전히 겹치는지 살펴볼까요?');

    var items = [
      geo.SHAPES.parallelogram,
      geo.SHAPES.isoscelesTriangle,
      geo.SHAPES.square,
      geo.SHAPES.sHexagon,
      geo.SHAPES.rightTrapezoid
    ];
    var stage = el('div');
    container.appendChild(stage);
    var idx = 0;
    var done = false;

    function renderItem() {
      var item = items[idx];
      var poly = item.poly;
      var center = geo.bboxCenter(poly);
      var isSym = geo.isPointSymmetric(poly);
      var quarter = geo.samePointSet(poly, poly.map(function (p) { return geo.rotatePoint(p, center, 90); }));

      var card = el('div', 'cs-card');
      card.appendChild(el('div', 'cs-step', '도형 ' + (idx + 1) + ' / ' + items.length + ' · ' + item.name));
      var guide = el('div', 'cs-guide', '돌리기 버튼을 눌러 보고, 점대칭도형인지 골라 보세요.');
      var hintEl = el('div', 'cs-hint');
      hintEl.hidden = true;
      var bd = ui.board();
      ui.grid(bd.svg);
      bd.svg.appendChild(ctx.svg('polygon', { points: ui.pts(poly), class: 'cs-shape' }));
      var ghost = ctx.svg('polygon', { points: ui.pts(poly), class: 'cs-ghost' });
      bd.svg.appendChild(ghost);
      bd.svg.appendChild(ctx.svg('circle', { cx: center[0], cy: center[1], r: 0.17, class: 'cs-center' }));

      var rotRow = el('div', 'cs-btn-row');
      var question = el('div', 'cs-title cs-question', '이 도형은 점대칭도형일까요?');
      var choiceRow = el('div', 'cs-choice-row');
      var nextRow = el('div', 'cs-btn-row');
      [guide, bd.wrap, rotRow, question, choiceRow, hintEl, nextRow].forEach(function (n) { card.appendChild(n); });
      stage.replaceChildren(card);

      var busy = false;
      var solved = false;
      var btn180 = null;

      function rotate(deg) {
        if (busy) return;
        busy = true;
        if (btn180) btn180.classList.remove('cs-choice-glow');
        animate(800, function (t) {
          var eased = 1 - Math.pow(1 - t, 3);
          ghost.setAttribute('transform', 'rotate(' + (deg * eased) + ' ' + center[0] + ' ' + center[1] + ')');
        }, function () {
          busy = false;
          var turned = poly.map(function (p) { return geo.rotatePoint(p, center, deg); });
          guide.textContent = geo.samePointSet(poly, turned)
            ? deg + '° 돌렸더니 처음 도형과 딱 겹쳐요!'
            : deg + '° 돌렸더니 처음 도형과 어긋나요.';
        });
      }

      [90, 180, 270].forEach(function (deg) {
        var b = button(el, '↻ ' + deg + '°', 'cs-btn', function () { rotate(deg); });
        if (deg === 180) btn180 = b;
        rotRow.appendChild(b);
      });

      var yesBtn = button(el, '네, 점대칭도형이에요', 'cs-btn primary', function () { answer(true); });
      var noBtn = button(el, '아니에요', 'cs-btn', function () { answer(false); });

      function answer(pickYes) {
        if (busy || solved) return;
        if (pickYes !== isSym) {
          // 에러리스: 180° 버튼과 맞는 답 버튼을 함께 반짝인다
          ctx.encourage();
          ui.hint(hintEl, isSym
            ? '180° 돌리기를 눌러 보세요. 처음 도형과 딱 겹치면 점대칭도형이에요.'
            : '180° 돌리기를 눌러 보세요. 처음 도형과 어긋나면 점대칭도형이 아니에요.');
          if (btn180) btn180.classList.add('cs-choice-glow');
          (isSym ? yesBtn : noBtn).classList.add('cs-choice-glow');
          return;
        }
        yesBtn.classList.remove('cs-choice-glow');
        noBtn.classList.remove('cs-choice-glow');
        solved = true;
        ctx.praise();
        var msg = isSym ? '맞아요! 180° 돌리면 완전히 겹치니까 점대칭도형이에요.' : '맞아요! 180° 돌리면 겹치지 않으니까 점대칭도형이 아니에요.';
        if (quarter) msg += ' ' + item.name + '은 90°만 돌려도 겹쳐요!';
        ui.hint(hintEl, msg);
        ctx.say(msg);
        if (idx < items.length - 1) {
          nextRow.appendChild(button(el, '다음 도형 ▶', 'cs-btn primary', function () {
            idx += 1;
            renderItem();
          }));
          return;
        }
        nextRow.appendChild(el('span', 'cs-done', '🎉 5관 완료! 점대칭도형을 모두 가려냈어요'));
        if (!done) {
          done = true;
          ctx.complete();
        }
      }

      choiceRow.appendChild(yesBtn);
      choiceRow.appendChild(noBtn);
    }

    renderItem();
  }

  global.CSFold = {
    tab3: { title: '3관 선대칭 접기', icon: '🦋', sub: '대칭축', render: renderTab3 },
    tab5: { title: '5관 점대칭 돌리기', icon: '🌀', sub: '대칭의 중심', render: renderTab5 }
  };
})(typeof window !== 'undefined' ? window : globalThis);
