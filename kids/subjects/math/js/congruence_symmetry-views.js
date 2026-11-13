// 5-2 수학 3단원 합동과 대칭: 1~2관 화면 (CSViews) — 합동 포개기, 대응점·대응변·대응각
// 기하 판정은 CongruenceGeo(ctx.geo), 그리기 도우미는 ctx.ui(main)만 쓴다.
(function (global) {
  'use strict';

  var SHAPE_LETTERS = ['가', '나', '다', '라'];

  // 꼭짓점 idx의 내각 표시 호 (dx만큼 옮겨 그림). 내각 크기(geo.angleAt)만큼 도는 쪽을 골라 꺾은선으로 그린다.
  function arcPath(geo, poly, idx, dx, r) {
    var n = poly.length;
    var prev = poly[(idx - 1 + n) % n];
    var curr = poly[idx];
    var next = poly[(idx + 1) % n];
    var t1 = Math.atan2(prev[1] - curr[1], prev[0] - curr[0]);
    var t2 = Math.atan2(next[1] - curr[1], next[0] - curr[0]);
    var alpha = geo.angleAt(poly, idx) * Math.PI / 180;
    var diff = function (a) { return Math.abs(Math.atan2(Math.sin(a), Math.cos(a))); };
    var dir = diff(t1 + alpha - t2) < diff(t1 - alpha - t2) ? 1 : -1;
    var cx = curr[0] + (dx || 0);
    var cy = curr[1];
    var out = [];
    for (var k = 0; k <= 12; k += 1) {
      var t = t1 + dir * alpha * (k / 12);
      out.push((k ? 'L ' : 'M ') + (cx + Math.cos(t) * r).toFixed(3) + ' ' + (cy + Math.sin(t) * r).toFixed(3));
    }
    return out.join(' ');
  }

  // ───────────────────────── 1관 합동 포개기 ─────────────────────────
  function renderTab1(container, ctx) {
    var geo = ctx.geo;
    var ui = ctx.ui;
    var el = ui.el;
    container.replaceChildren();
    container.appendChild(ui.concept('합동이란?', '모양과 크기가 같아서 포개었을 때 완전히 겹치는 두 도형을 서로 합동이라고 합니다.'));
    ctx.say('기준 도형과 합동인 도형을 찾아 포개어 볼까요?');

    // 기준 도형은 2배로 키워도 8칸 안에 드는 작은 비대칭 도형만 쓴다 (크기만 다른 후보용)
    var sets = [
      { base: geo.SHAPES.rightTriangle.poly, other: geo.SHAPES.rightTrapezoid.poly },
      { base: geo.SHAPES.smallL.poly, other: geo.SHAPES.scaleneQuad.poly }
    ];

    var card = el('div', 'cs-card');
    var guide = el('div', 'cs-guide');
    var pickRow = el('div', 'cs-pick-row');
    var boardBox = el('div');
    var btnRow = el('div', 'cs-btn-row');
    var hintEl = el('div', 'cs-hint');
    hintEl.hidden = true;
    [guide, pickRow, boardBox, btnRow, hintEl].forEach(function (n) { card.appendChild(n); });
    container.appendChild(card);

    var setIdx = 0;
    var cands = [];
    var sel = -1;
    var done = false;

    function buildSet(idx) {
      setIdx = idx;
      sel = -1;
      ui.hint(hintEl, '');
      var base = geo.normalize(sets[idx].base);
      var raw = [
        { poly: geo.transform(base, 1 + idx, false), congruent: true },
        { poly: geo.transform(base, 2 + idx, true), congruent: true },
        { poly: base.map(function (p) { return [p[0] * 2, p[1] * 2]; }), congruent: false, reason: 'size' },
        { poly: geo.normalize(sets[idx].other), congruent: false, reason: 'shape' }
      ];
      cands = ui.shuffle(raw, geo.makeRng(101 + idx * 37)).map(function (c) {
        // cur = 지금 판 위에 보이는 모양. 돌리기·뒤집기는 보이는 모양 기준으로 한다.
        return { poly: c.poly, cur: c.poly, congruent: c.congruent, reason: c.reason, status: 'none', fails: 0 };
      });
      draw();
    }

    function mini(poly, cls) {
      var ext = Math.max.apply(null, poly.map(function (p) { return Math.max(p[0], p[1]); }).concat([3])) + 1;
      var svg = ctx.svg('svg', { viewBox: '-0.5 -0.5 ' + ext + ' ' + ext, class: 'cs-mini' });
      svg.appendChild(ctx.svg('polygon', { points: ui.pts(poly), class: cls }));
      return svg;
    }

    // 지금 보이는 모양에서 "뒤집기 f번 → 돌리기 r번"을 누르면 맞는지
    function pressesToMatch(cand, base) {
      for (var f = 0; f < 2; f += 1) {
        for (var r = 0; r < 4; r += 1) {
          if (geo.samePointSet(geo.transform(cand.cur, r, f === 1), base)) return { flip: f === 1, rot: r };
        }
      }
      return null;
    }

    function draw() {
      var base = geo.normalize(sets[setIdx].base);
      var found = cands.filter(function (c) { return c.status === 'congruent'; }).length;
      guide.textContent = '세트 ' + (setIdx + 1) + '/2 · 기준 도형과 합동인 도형 2개를 찾아 포개어 보세요 (' + found + '/2)';

      pickRow.replaceChildren();
      var ref = el('div', 'cs-pick cs-pick-ref');
      ref.appendChild(el('span', 'cs-pick-name', '기준'));
      ref.appendChild(mini(base, 'cs-shape'));
      pickRow.appendChild(ref);
      cands.forEach(function (c, i) {
        var b = el('button', 'cs-pick' + (i === sel ? ' selected' : ''));
        b.type = 'button';
        b.appendChild(el('span', 'cs-pick-name', SHAPE_LETTERS[i]));
        b.appendChild(mini(c.poly, 'cs-shape-b'));
        if (c.status === 'congruent') b.appendChild(el('span', 'cs-tag ok', '합동'));
        if (c.status === 'not') b.appendChild(el('span', 'cs-tag', '합동 아님'));
        b.addEventListener('click', function () {
          sel = i;
          ui.hint(hintEl, '');
          draw();
        });
        pickRow.appendChild(b);
      });

      var bd = ui.board();
      ui.grid(bd.svg);
      bd.svg.appendChild(ctx.svg('polygon', { points: ui.pts(base), class: 'cs-shape' }));
      if (sel >= 0) {
        var shown = cands[sel];
        bd.svg.appendChild(ctx.svg('polygon', { points: ui.pts(shown.cur), class: shown.status === 'congruent' ? 'cs-shape-ok' : 'cs-shape-b' }));
      }
      boardBox.replaceChildren(bd.wrap);

      btnRow.replaceChildren();
      if (found === 2) {
        if (setIdx === 0) {
          btnRow.appendChild(button('다음 세트 ▶', 'cs-btn primary', function () { buildSet(1); }));
        } else {
          btnRow.appendChild(el('span', 'cs-done', '🎉 1관 완료! 합동인 도형을 모두 찾았어요'));
          if (!done) {
            done = true;
            ctx.complete();
          }
        }
        return;
      }
      if (sel < 0) {
        btnRow.appendChild(el('span', 'cs-note', '위에서 가·나·다·라 중 하나를 골라 보세요.'));
        return;
      }
      if (cands[sel].status !== 'none') {
        btnRow.appendChild(el('span', 'cs-note', '이 도형은 확인했어요. 다른 도형을 골라 보세요.'));
        return;
      }
      btnRow.appendChild(button('↻ 90° 돌리기', 'cs-btn', function () {
        cands[sel].cur = geo.transform(cands[sel].cur, 1, false);
        draw();
      }));
      btnRow.appendChild(button('↔ 뒤집기', 'cs-btn', function () {
        cands[sel].cur = geo.transform(cands[sel].cur, 0, true);
        draw();
      }));
      btnRow.appendChild(button('포개기', 'cs-btn primary', overlay));
    }

    function overlay() {
      var cand = cands[sel];
      var base = geo.normalize(sets[setIdx].base);
      if (cand.status !== 'none') return;
      if (geo.samePointSet(cand.cur, base)) {
        cand.status = 'congruent';
        ctx.praise();
        ui.hint(hintEl, '완전히 겹쳐요! 합동이에요.');
        draw();
        return;
      }
      if (cand.congruent) {
        cand.fails += 1;
        ctx.encourage();
        var msg = '모양은 같아 보여요. 돌리거나 뒤집어서 다시 포개 볼까요?';
        var need = cand.fails >= 2 ? pressesToMatch(cand, base) : null;
        if (need) {
          var parts = [];
          if (need.flip) parts.push('뒤집기 1번');
          if (need.rot) parts.push('돌리기 ' + need.rot + '번');
          if (parts.length) msg = parts.join(', ') + '을 누르고 다시 포개 보세요.';
        }
        ui.hint(hintEl, msg);
        return;
      }
      cand.status = 'not';
      var why = cand.reason === 'size'
        ? '모양은 같지만 크기가 달라서 완전히 겹치지 않아요. 합동이 아니에요.'
        : '모양이 달라서 겹치지 않아요. 합동이 아니에요.';
      ui.hint(hintEl, why);
      ctx.say(why);
      draw();
    }

    function button(text, cls, onClick) {
      var b = el('button', cls, text);
      b.type = 'button';
      b.addEventListener('click', onClick);
      return b;
    }

    buildSet(0);
  }

  // ───────────────────── 2관 대응점·대응변·대응각 ─────────────────────
  function renderTab2(container, ctx) {
    var geo = ctx.geo;
    var ui = ctx.ui;
    var el = ui.el;
    container.replaceChildren();
    container.appendChild(ui.concept('대응점·대응변·대응각',
      '서로 합동인 두 도형을 완전히 포개었을 때 겹치는 점을 대응점, 겹치는 변을 대응변, 겹치는 각을 대응각이라고 합니다.'));
    ctx.say('합동인 두 도형에서 서로 겹치는 점, 변, 각을 찾아볼까요?');

    // 비대칭 도형만 쓴다: 대칭인 도형은 대응이 둘 이상이 될 수 있다
    var rounds = [geo.SHAPES.rightTriangle.poly, geo.SHAPES.rightTrapezoid.poly, geo.SHAPES.lHexagon.poly];
    // 두 도형을 한 판에 나란히: 도형이 6칸 안에 들어가므로 6칸 모눈 두 개로 그려 휴대폰에서도 크게 보이게 한다
    var GS = 6;
    var DX = 7.5;

    var card = el('div', 'cs-card');
    var guide = el('div', 'cs-guide');
    var boardBox = el('div');
    var choiceRow = el('div', 'cs-choice-row');
    var hintEl = el('div', 'cs-hint');
    hintEl.hidden = true;
    [guide, boardBox, choiceRow, hintEl].forEach(function (n) { card.appendChild(n); });
    container.appendChild(card);

    var rIdx = 0;
    var step = 0;
    var blink = null; // {type:'pt'|'edge', idx|[u,v]}
    var d = null;
    var done = false;

    // start번 꼭짓점부터 돌며 조건에 맞는 첫 번호
    function firstIndex(n, ok, start) {
      for (var k = 0; k < n; k += 1) {
        var i = ((start || 0) + k) % n;
        if (ok(i)) return i;
      }
      return start || 0;
    }

    function setupRound(idx) {
      rIdx = idx;
      step = 0;
      blink = null;
      ui.hint(hintEl, '');
      var rng = geo.makeRng(202 + idx * 53 + Math.floor(Math.random() * 1000));
      var A = geo.normalize(rounds[idx]);
      var B = geo.transform(A, 1 + Math.floor(rng() * 3), rng() < 0.5);
      var map = geo.findCongruence(A, B).map;
      var n = A.length;
      var aLab = [];
      var bLab = new Array(n);
      for (var i = 0; i < n; i += 1) {
        aLab.push(geo.LABELS[i]);
        bLab[map[i]] = geo.LABELS[n + i];
      }
      var convex = function (i) { return geo.angleAt(A, i) < 180; };
      d = {
        A: A, B: B, map: map, aLab: aLab, bLab: bLab, rng: rng,
        opts: {}, // 단계별 보기 순서 (오답 뒤 다시 그려도 자리가 바뀌지 않게)
        pt: 1 % n,
        edge: 2 % n,
        ang: firstIndex(n, convex, 3 % n), // 초등 과정: 180°보다 작은 각만 묻는다
        side: firstIndex(n, function (i) { return Number.isInteger(geo.sideLength(A, i)); }),
        intAng: firstIndex(n, function (i) { var a = geo.angleAt(A, i); return Number.isInteger(a) && a < 180; })
      };
      draw();
    }

    function labels(svg, poly, labs, dx) {
      var c = geo.bboxCenter(poly);
      poly.forEach(function (p, i) {
        var vx = p[0] - c[0];
        var vy = p[1] - c[1];
        var len = Math.hypot(vx, vy) || 1;
        ui.label(svg, p[0] + dx + (vx / len) * 0.5, p[1] + (vy / len) * 0.5, labs[i]);
      });
    }

    function next() {
      blink = null;
      ui.hint(hintEl, '');
      if (step < 4) {
        step += 1;
        draw();
      } else if (rIdx < rounds.length - 1) {
        setupRound(rIdx + 1);
      } else {
        guide.textContent = '세 도형을 모두 마쳤어요!';
        choiceRow.replaceChildren(el('span', 'cs-done', '🎉 2관 완료! 대응점·대응변·대응각을 모두 찾았어요'));
        if (!done) {
          done = true;
          ctx.complete();
        }
      }
    }

    function wrong(text, target) {
      ctx.encourage();
      blink = target;
      ui.hint(hintEl, text);
      draw();
    }

    function edgeName(labs, u, v) {
      return '변 ' + labs[u] + labs[v];
    }

    // 교과서처럼 꼭짓점을 가운데 두고 세 글자로 부른다 (각 ㄷㄱㄴ)
    function angleName(labs, i) {
      var n = labs.length;
      return '각 ' + labs[(i - 1 + n) % n] + labs[i] + labs[(i + 1) % n];
    }

    function draw() {
      var n = d.A.length;
      var bd = ui.board('-0.9 -0.9 15.3 7.8');
      bd.wrap.classList.add('cs-board-wide');
      var svg = bd.svg;
      ui.grid(svg, { size: GS });
      ui.grid(svg, { size: GS, ox: DX });
      svg.appendChild(ctx.svg('polygon', { points: ui.pts(d.A), class: 'cs-shape' }));
      svg.appendChild(ctx.svg('polygon', { points: ui.pts(d.B, DX), class: 'cs-shape-b' }));
      labels(svg, d.A, d.aLab, 0);
      labels(svg, d.B, d.bLab, DX);
      choiceRow.replaceChildren();
      var prefix = '도형 ' + (rIdx + 1) + '/3 · ' + (step + 1) + '/5 · ';

      if (blink && blink.type === 'pt') {
        svg.appendChild(ctx.svg('circle', { cx: d.B[blink.idx][0] + DX, cy: d.B[blink.idx][1], r: 0.3, class: 'cs-point-target' }));
      }
      if (blink && blink.type === 'edge') {
        var bu = d.B[blink.idx[0]];
        var bv = d.B[blink.idx[1]];
        svg.appendChild(ctx.svg('line', { x1: bu[0] + DX, y1: bu[1], x2: bv[0] + DX, y2: bv[1], class: 'cs-edge-target' }));
      }

      if (step === 0 || step === 2) {
        var ai = step === 0 ? d.pt : d.ang;
        var target = d.map[ai];
        if (step === 0) {
          guide.textContent = prefix + '점 ' + d.aLab[ai] + '의 대응점을 오른쪽 도형에서 짚어 보세요';
          svg.appendChild(ctx.svg('circle', { cx: d.A[ai][0], cy: d.A[ai][1], r: 0.26, class: 'cs-mark' }));
        } else {
          guide.textContent = prefix + angleName(d.aLab, ai) + '의 대응각을 오른쪽 도형의 꼭짓점에서 짚어 보세요';
          svg.appendChild(ctx.svg('path', { d: arcPath(geo, d.A, ai, 0, 0.6), class: 'cs-arc' }));
        }
        d.B.forEach(function (p, i) {
          var hit = ctx.svg('circle', { cx: p[0] + DX, cy: p[1], r: 0.6, class: 'cs-hit' });
          hit.addEventListener('click', function () {
            if (i === target) {
              ctx.praise();
              next();
              return;
            }
            var from = step === 0 ? '점 ' + d.aLab[ai] : angleName(d.aLab, ai);
            var to = step === 0 ? '점 ' + d.bLab[target] : angleName(d.bLab, target);
            wrong('포개면 ' + from + '은 ' + to + '과 겹쳐요. 반짝이는 곳을 짚어 보세요.', { type: 'pt', idx: target });
          });
          svg.appendChild(hit);
        });
      } else if (step === 1) {
        var e1 = d.edge;
        var e2 = (e1 + 1) % n;
        var u = d.map[e1];
        var v = d.map[e2];
        guide.textContent = prefix + edgeName(d.aLab, e1, e2) + '의 대응변을 오른쪽 도형에서 짚어 보세요';
        svg.appendChild(ctx.svg('line', { x1: d.A[e1][0], y1: d.A[e1][1], x2: d.A[e2][0], y2: d.A[e2][1], class: 'cs-edge-mark' }));
        d.B.forEach(function (p, i) {
          var j = (i + 1) % n;
          var hit = ctx.svg('line', { x1: p[0] + DX, y1: p[1], x2: d.B[j][0] + DX, y2: d.B[j][1], class: 'cs-hit' });
          hit.addEventListener('click', function () {
            if ((i === u && j === v) || (i === v && j === u)) {
              ctx.praise();
              next();
              return;
            }
            wrong('포개면 ' + edgeName(d.aLab, e1, e2) + '은 ' + edgeName(d.bLab, u, v) + '과 겹쳐요. 반짝이는 변을 짚어 보세요.', { type: 'edge', idx: [u, v] });
          });
          svg.appendChild(hit);
        });
      } else if (step === 3) {
        var s1 = d.side;
        var s2 = (s1 + 1) % n;
        var len = geo.sideLength(d.A, s1);
        var bu2 = d.map[s1];
        var bv2 = d.map[s2];
        guide.textContent = prefix + edgeName(d.bLab, bu2, bv2) + '의 길이는 몇 cm일까요?';
        svg.appendChild(ctx.svg('line', { x1: d.A[s1][0], y1: d.A[s1][1], x2: d.A[s2][0], y2: d.A[s2][1], class: 'cs-edge-mark' }));
        ui.label(svg, (d.A[s1][0] + d.A[s2][0]) / 2, (d.A[s1][1] + d.A[s2][1]) / 2 - 0.45, len + ' cm', 'cs-label cs-label-strong');
        svg.appendChild(ctx.svg('line', { x1: d.B[bu2][0] + DX, y1: d.B[bu2][1], x2: d.B[bv2][0] + DX, y2: d.B[bv2][1], class: 'cs-edge-mark-b' }));
        ui.label(svg, (d.B[bu2][0] + d.B[bv2][0]) / 2 + DX, (d.B[bu2][1] + d.B[bv2][1]) / 2 - 0.45, '□ cm', 'cs-label cs-label-strong');
        choices(len, [1, -1, 2, -2, 3], ' cm', function (val) { return val >= 1; },
          '합동인 도형의 대응변은 길이가 같아요. ' + len + ' cm를 골라 보세요.', { type: 'edge', idx: [bu2, bv2] });
      } else {
        var ia = d.intAng;
        var deg = geo.angleAt(d.A, ia);
        var bi = d.map[ia];
        guide.textContent = prefix + angleName(d.bLab, bi) + '의 크기는 몇 도일까요?';
        svg.appendChild(ctx.svg('path', { d: arcPath(geo, d.A, ia, 0, 0.6), class: 'cs-arc' }));
        ui.label(svg, d.A[ia][0], d.A[ia][1] - 0.75, deg + '°', 'cs-label cs-label-strong');
        svg.appendChild(ctx.svg('path', { d: arcPath(geo, d.B, bi, DX, 0.6), class: 'cs-arc-b' }));
        ui.label(svg, d.B[bi][0] + DX, d.B[bi][1] - 0.75, '□°', 'cs-label cs-label-strong');
        choices(deg, [15, -15, 30, -30], '°', function (val) { return val > 0 && val < 180; },
          '합동인 도형의 대응각은 크기가 같아요. ' + deg + '°를 골라 보세요.', { type: 'pt', idx: bi });
      }
      boardBox.replaceChildren(bd.wrap);
    }

    // 3지선다: 정답과 가까운 수 2개. 오답이면 정답 보기를 반짝인다.
    function choices(answer, deltas, unit, valid, hintText, target) {
      if (!d.opts[step]) {
        var opts = [answer];
        deltas.forEach(function (dv) {
          var v = answer + dv;
          if (opts.length < 3 && valid(v) && opts.indexOf(v) < 0) opts.push(v);
        });
        d.opts[step] = ui.shuffle(opts, d.rng);
      }
      d.opts[step].forEach(function (val) {
        var b = el('button', 'cs-btn cs-num-choice' + (blink && val === answer ? ' cs-choice-glow' : ''), val + unit);
        b.type = 'button';
        b.addEventListener('click', function () {
          if (val === answer) {
            ctx.praise();
            next();
          } else {
            wrong(hintText, target);
          }
        });
        choiceRow.appendChild(b);
      });
    }

    setupRound(0);
  }

  global.CSViews = {
    tab1: { title: '1관 합동 포개기', icon: '🧩', sub: '합동', render: renderTab1 },
    tab2: { title: '2관 대응 찾기', icon: '🔗', sub: '대응점·변·각', render: renderTab2 }
  };
})(typeof window !== 'undefined' ? window : globalThis);
