// 5-2 수학 5단원 직육면체와 정육면체: 입체 그리기 + 1~4관 (CuboidLabsA)
// 1관 직육면체·정육면체 바구니 110~111·114~115쪽 · 2관 면·모서리·꼭짓점 세기 110~111쪽 · 3관 평행·수직 112~113쪽 · 4관 겨냥도 116~117쪽
// 싣는 순서: math_explorer-shell → cuboid_cube-geo → labs-a → net(5·6관, 탐험관 띄우기)
(function (global) {
  'use strict';

  var G = global.CuboidGeo;
  var STD_YAW = -30;
  var STD_PITCH = 22;

  function poly(points, idx) {
    return idx.map(function (i) { return points[i][0].toFixed(1) + ',' + points[i][1].toFixed(1); }).join(' ');
  }

  // 입체를 SVG에 그린다. opts: { yaw, pitch, scale, ox, oy, faceClass(fi, visible), labels, edgeClass(e),
  //   onFace(fi), onEdge(e), onVertex(vi), vertexClass(vi, visible), showHiddenFaces }
  function drawSolid(svg, ui, solid, opts) {
    var o = opts || {};
    var v = G.view(solid, o.yaw === undefined ? STD_YAW : o.yaw, o.pitch === undefined ? STD_PITCH : o.pitch, o.scale || 40, o.ox || 150, o.oy || 110);
    var order = solid.faces.map(function (f, i) { return i; });
    // 안 보이는 면 → 보이는 면 순서로 (보이는 면이 위에 그려지게)
    order.sort(function (a, b) { return (v.faceVisible[a] ? 1 : 0) - (v.faceVisible[b] ? 1 : 0); });
    order.forEach(function (fi) {
      var visible = v.faceVisible[fi];
      var cls = typeof o.faceClass === 'function' ? o.faceClass(fi, visible) : (visible ? 'cc-face' : '');
      if (!cls) return;
      var p = ui.svg('polygon', { points: poly(v.points, solid.faces[fi].v), class: cls });
      if (typeof o.onFace === 'function' && visible) {
        p.addEventListener('click', function () { o.onFace(fi); });
        p.classList.add('cc-tap');
      }
      svg.appendChild(p);
    });
    v.edges.forEach(function (e) {
      var a = v.points[e.a];
      var b = v.points[e.b];
      var extra = typeof o.edgeClass === 'function' ? o.edgeClass(e) : '';
      svg.appendChild(ui.svg('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], class: (e.visible ? 'cc-edge' : 'cc-edge-hidden') + (extra ? ' ' + extra : '') }));
      if (typeof o.onEdge === 'function') {
        var hit = ui.svg('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], class: 'cc-hit-edge' });
        hit.addEventListener('click', function () { o.onEdge(e); });
        svg.appendChild(hit);
      }
    });
    if (typeof o.onVertex === 'function' || typeof o.vertexClass === 'function') {
      v.points.forEach(function (pt, vi) {
        var vis = v.vertexVisible[vi];
        var cls = typeof o.vertexClass === 'function' ? o.vertexClass(vi, vis) : 'cc-vertex';
        var c = ui.svg('circle', { cx: pt[0], cy: pt[1], r: 6, class: cls + (vis ? '' : ' cc-vertex-hidden') });
        svg.appendChild(c);
        if (typeof o.onVertex === 'function') {
          var hitV = ui.svg('circle', { cx: pt[0], cy: pt[1], r: 15, class: 'cc-hit-vertex' });
          hitV.addEventListener('click', function () { o.onVertex(vi); });
          svg.appendChild(hitV);
        }
      });
    }
    if (o.labels) {
      var c0 = [0, 0];
      v.points.forEach(function (pt) { c0[0] += pt[0]; c0[1] += pt[1]; });
      c0 = [c0[0] / v.points.length, c0[1] / v.points.length];
      v.points.forEach(function (pt, vi) {
        var dx = pt[0] - c0[0];
        var dy = pt[1] - c0[1];
        var len = Math.hypot(dx, dy) || 1;
        ui.text(svg, pt[0] + (dx / len) * 15, pt[1] + (dy / len) * 15, o.labels[vi], 'mx-label cc-vlabel' + (v.vertexVisible[vi] ? '' : ' cc-vlabel-hidden'));
      });
    }
    return v;
  }

  function cylinderThumb(svg, ui) {
    svg.appendChild(ui.svg('path', { d: 'M110 60 L110 150 A40 14 0 0 0 190 150 L190 60', class: 'cc-face-side' }));
    svg.appendChild(ui.svg('ellipse', { cx: 150, cy: 60, rx: 40, ry: 14, class: 'cc-face cc-face-top' }));
    svg.appendChild(ui.svg('path', { d: 'M110 150 A40 14 0 0 1 190 150', class: 'cc-edge-hidden' }));
  }

  // ── 1관 바구니 분류 ──
  var SHAPES = [
    { name: '납작한 상자', kind: 'cuboid', make: function () { return G.cuboid(3.4, 1.3, 2); } },
    { name: '키 큰 상자', kind: 'cuboid', make: function () { return G.cuboid(1.8, 3, 1.4); } },
    { name: '택배 상자', kind: 'cuboid', make: function () { return G.cuboid(3, 2, 2); } },
    { name: '주사위 모양', kind: 'cube', make: function () { return G.cuboid(2.2, 2.2, 2.2); } },
    { name: '큐브 모양', kind: 'cube', make: function () { return G.cuboid(2.6, 2.6, 2.6); }, yaw: -40 },
    { name: '삼각기둥', kind: 'none', make: function () { return G.triangularPrism(2.8, 2.2, 2.2); } },
    { name: '사각뿔', kind: 'none', make: function () { return G.squarePyramid(2.6, 2.6); } },
    { name: '둥근기둥', kind: 'none', cylinder: true }
  ];

  var KIND_HINT = {
    cuboid: '면이 모두 직사각형이지만, 정사각형이 아닌 면도 있어요. 바깥 직육면체 바구니가 맞아요.',
    cube: '면 6개가 모두 똑같은 정사각형이에요.',
    none: '면이 모두 직사각형인가요? 세모 면이나 둥근 면이 있는지 살펴봐요.'
  };

  function thumb(ui, shape, size) {
    var b = ui.board('0 0 300 210', size === 'mini' ? 'cc-thumb' : 'cc-thumb-big');
    if (shape.cylinder) cylinderThumb(b.svg, ui);
    else drawSolid(b.svg, ui, shape.make(), { yaw: shape.yaw, scale: 34, ox: 150, oy: 105 });
    return b.wrap;
  }

  var tab1 = {
    title: '1관 바구니 분류',
    icon: '🧺',
    sub: '직육면체·정육면체',
    render: function (container, ctx) {
      var ui = ctx.ui;
      var el = ui.el;
      container.appendChild(ui.concept('🧺 직육면체와 정육면체', '직사각형 6개로 둘러싸인 도형을 직육면체라고 해요. 정사각형 6개로 둘러싸인 도형은 정육면체예요. 정사각형도 직사각형이니까, 정육면체는 직육면체라고 할 수 있어요.'));
      var card = ui.card('우체국 상자 바구니에 담기');
      container.appendChild(card);
      card.appendChild(ui.guide('큰 바구니는 직육면체, 그 안의 작은 바구니는 정육면체예요. 둘 다 아니면 옆 바구니에 담아요.'));
      var venn = el('div', 'cc-venn');
      var outer = el('div', 'cc-basket cc-basket-outer');
      outer.appendChild(el('div', 'cc-basket-title', '📦 직육면체 바구니'));
      var outerItems = el('div', 'cc-basket-items');
      outer.appendChild(outerItems);
      var inner = el('div', 'cc-basket cc-basket-inner');
      inner.appendChild(el('div', 'cc-basket-title', '🎲 정육면체 바구니'));
      var innerItems = el('div', 'cc-basket-items');
      inner.appendChild(innerItems);
      outer.appendChild(inner);
      var side = el('div', 'cc-basket cc-basket-side');
      side.appendChild(el('div', 'cc-basket-title', '🙅 둘 다 아니에요'));
      var sideItems = el('div', 'cc-basket-items');
      side.appendChild(sideItems);
      venn.appendChild(outer);
      venn.appendChild(side);
      var stage = el('div', 'cc-sort-stage');
      card.appendChild(stage);
      card.appendChild(venn);
      var after = el('div');
      card.appendChild(after);
      var list = ui.shuffle(SHAPES);
      var idx = 0;
      var zones = { cuboid: outerItems, cube: innerItems, none: sideItems };

      function place(shape) {
        var chip = el('div', 'cc-chip');
        chip.appendChild(thumb(ui, shape, 'mini'));
        chip.appendChild(el('span', 'cc-chip-name', shape.name));
        zones[shape.kind].appendChild(chip);
      }

      function next() {
        stage.replaceChildren();
        if (idx >= list.length) {
          stage.hidden = true;
          finish();
          return;
        }
        var shape = list[idx];
        stage.appendChild(el('p', 'mx-question', (idx + 1) + ' / ' + list.length + ' · ' + ui.josa(shape.name, 'eun') + ' 어느 바구니에 담을까요?'));
        stage.appendChild(thumb(ui, shape, 'big'));
        var row = el('div', 'mx-btn-row cc-zone-row');
        var hintEl = el('div', 'mx-hint');
        hintEl.hidden = true;
        var answerBtn = null;
        [['cuboid', '📦 직육면체 바구니'], ['cube', '🎲 정육면체 바구니'], ['none', '🙅 둘 다 아니에요']].forEach(function (z) {
          var b = ui.button(z[1], 'mx-btn', function () {
            if (b.disabled) return;
            if (z[0] === shape.kind) {
              ctx.praise();
              place(shape);
              idx += 1;
              next();
              return;
            }
            if (shape.kind === 'cube' && z[0] === 'cuboid') {
              // 맞는 생각: 정육면체도 직육면체다. 더 알맞은 안쪽 바구니로 옮겨 준다.
              ctx.praise();
              ui.hint(hintEl, '👍 맞아요, 정육면체도 직육면체예요! 그런데 정사각형 6개라서 안쪽 정육면체 바구니에 쏙 들어가요.');
              b.disabled = true;
              Array.prototype.forEach.call(row.children, function (x) { x.disabled = true; });
              place(shape);
              idx += 1;
              setTimeout(next, 1800);
              return;
            }
            b.disabled = true;
            b.classList.add('is-off');
            ctx.encourage();
            ui.hint(hintEl, '💡 ' + KIND_HINT[shape.kind]);
            if (answerBtn) answerBtn.classList.add('mx-glow');
          });
          if (z[0] === shape.kind) answerBtn = b;
          row.appendChild(b);
        });
        stage.appendChild(row);
        stage.appendChild(hintEl);
      }

      function finish() {
        ui.sequence(after, [
          function (s, go) {
            s.appendChild(ui.choiceQuestion({
              question: '정육면체는 직육면체라고 할 수 있을까요?',
              choices: ['네, 정사각형도 직사각형이니까요', '아니요, 모양이 달라서 안 돼요'],
              answer: 0,
              hint: '정육면체 바구니가 어디에 들어 있는지 보세요. 직육면체 바구니 안에 있어요.',
              explain: '정육면체는 직육면체예요. 직육면체 중에서 면이 모두 정사각형인 것이 정육면체예요.',
              onSolved: go
            }));
          },
          function (s, go) {
            s.appendChild(ui.choiceQuestion({
              question: '그러면 직육면체는 모두 정육면체일까요?',
              choices: ['아니요, 정사각형이 아닌 면이 있을 수 있어요', '네, 언제나 정육면체예요'],
              answer: 0,
              hint: '납작한 상자를 떠올려 봐요. 면이 모두 정사각형이었나요?',
              explain: '직육면체 바구니에는 정육면체가 아닌 상자도 들어 있어요.',
              onSolved: go
            }));
          }
        ], function () {
          ctx.complete();
          after.appendChild(ui.doneBadge());
        });
      }

      next();
      ctx.say('1관이에요. 상자들을 알맞은 바구니에 담아 볼까요?');
    }
  };

  // ── 2관 면·모서리·꼭짓점 세기 ──
  var COUNT_MODES = [
    { id: 'face', label: '면', total: 6, desc: '선분으로 둘러싸인 부분' },
    { id: 'edge', label: '모서리', total: 12, desc: '면과 면이 만나는 선분' },
    { id: 'vertex', label: '꼭짓점', total: 8, desc: '모서리와 모서리가 만나는 점' }
  ];

  var tab2 = {
    title: '2관 세어 보기',
    icon: '🔢',
    sub: '면·모서리·꼭짓점',
    render: function (container, ctx) {
      var ui = ctx.ui;
      var el = ui.el;
      container.appendChild(ui.concept('🔢 면, 모서리, 꼭짓점', '직육면체에서 선분으로 둘러싸인 부분을 면, 면과 면이 만나는 선분을 모서리, 모서리와 모서리가 만나는 점을 꼭짓점이라고 해요. 상자를 돌려 가며 하나씩 눌러 세어 봐요.'));
      var card = ui.card('상자 돌려 가며 세기');
      container.appendChild(card);
      var solid = G.cuboid(3, 2, 2);
      var yaw = STD_YAW;
      var pitch = STD_PITCH;
      var mode = 0;
      var found = { face: {}, edge: {}, vertex: {} };
      var finished = {};
      var modeRow = el('div', 'mx-btn-row');
      var modeBtns = COUNT_MODES.map(function (m, i) {
        var b = ui.button(m.label + ' 세기', 'mx-btn', function () {
          mode = i;
          draw();
        });
        modeRow.appendChild(b);
        return b;
      });
      card.appendChild(modeRow);
      var status = el('p', 'mx-question');
      card.appendChild(status);
      var board = ui.board('0 0 300 230');
      card.appendChild(board.wrap);
      var rot = el('div', 'mx-btn-row cc-rotate-row');
      rot.appendChild(ui.button('⟲ 왼쪽으로 돌리기', 'mx-btn', function () { yaw -= 90; draw(); }));
      rot.appendChild(ui.button('⟳ 오른쪽으로 돌리기', 'mx-btn', function () { yaw += 90; draw(); }));
      rot.appendChild(ui.button('↕ 위·아래 뒤집어 보기', 'mx-btn', function () { pitch = -pitch; draw(); }));
      card.appendChild(rot);
      var note = el('p', 'mx-note');
      card.appendChild(note);
      var after = el('div');
      card.appendChild(after);

      function count(id) {
        return Object.keys(found[id]).length;
      }

      function tap(id, key) {
        var m = COUNT_MODES[mode];
        if (m.id !== id || found[id][key] || finished[id]) return;
        found[id][key] = count(id) + 1;
        if (count(id) === m.total) {
          finished[id] = true;
          ctx.praise();
          ctx.say(ui.josa(m.label, 'eun') + ' 모두 ' + m.total + '개예요!');
          checkAll();
        }
        draw();
      }

      function draw() {
        var m = COUNT_MODES[mode];
        modeBtns.forEach(function (b, i) {
          b.classList.toggle('selected', i === mode);
          b.textContent = COUNT_MODES[i].label + ' 세기' + (finished[COUNT_MODES[i].id] ? ' ✅' : '');
        });
        status.textContent = ui.josa(m.label, 'eul') + ' 하나씩 눌러요 (' + m.desc + ') · 찾은 ' + m.label + ' ' + count(m.id) + '개' + (finished[m.id] ? ' — 모두 ' + m.total + '개!' : '');
        note.textContent = m.id === 'face' ? '안 보이는 면은 상자를 돌리거나 뒤집어서 찾아요.' : '점선은 안 보이는 쪽에 있는 ' + ui.josa(m.label, 'ieyo') + '. 점선도 눌러서 세요.';
        board.svg.replaceChildren();
        var faceNo = {};
        drawSolid(board.svg, ui, solid, {
          yaw: yaw,
          pitch: pitch,
          scale: 44,
          ox: 150,
          oy: 112,
          faceClass: function (fi, visible) {
            if (!visible) return '';
            return found.face[solid.faces[fi].id] ? 'cc-face cc-face-found' : 'cc-face';
          },
          onFace: m.id === 'face' ? function (fi) { tap('face', solid.faces[fi].id); } : null,
          edgeClass: function (e) { return found.edge[e.a + '-' + e.b] ? 'cc-edge-found' : ''; },
          onEdge: m.id === 'edge' ? function (e) { tap('edge', e.a + '-' + e.b); } : null,
          vertexClass: function (vi) { return found.vertex[vi] ? 'cc-vertex cc-vertex-found' : 'cc-vertex'; },
          onVertex: m.id === 'vertex' ? function (vi) { tap('vertex', String(vi)); } : null
        });
        Object.keys(found.face).forEach(function (id) { faceNo[id] = found.face[id]; });
        var v = G.view(solid, yaw, pitch, 44, 150, 112);
        solid.faces.forEach(function (f, fi) {
          if (!v.faceVisible[fi] || !faceNo[f.id]) return;
          var cx = 0;
          var cy = 0;
          f.v.forEach(function (vi) { cx += v.points[vi][0]; cy += v.points[vi][1]; });
          ui.text(board.svg, cx / 4, cy / 4, String(faceNo[f.id]), 'mx-label mx-label-lg mx-label-accent');
        });
      }

      function checkAll() {
        if (!COUNT_MODES.every(function (m) { return finished[m.id]; })) return;
        var table = el('div', 'mx-formula');
        table.appendChild(el('span', 'mx-chip', '면 6개'));
        table.appendChild(el('span', 'mx-chip orange', '모서리 12개'));
        table.appendChild(el('span', 'mx-chip purple', '꼭짓점 8개'));
        after.appendChild(table);
        after.appendChild(el('p', 'mx-note', '정육면체도 면 6개, 모서리 12개, 꼭짓점 8개로 똑같아요.'));
        ctx.complete();
        after.appendChild(ui.doneBadge());
      }

      draw();
      ctx.say('2관이에요. 상자를 돌려 가며 면, 모서리, 꼭짓점을 세어 볼까요?');
    }
  };

  // ── 3관 평행한 면과 수직인 면 ──
  var tab3 = {
    title: '3관 평행·수직',
    icon: '📐',
    sub: '밑면·옆면',
    render: function (container, ctx) {
      var ui = ctx.ui;
      var el = ui.el;
      container.appendChild(ui.concept('📐 평행한 면, 밑면, 옆면', '계속 늘여도 만나지 않는 두 면은 서로 평행해요. 이 두 면을 밑면이라고 해요. 직육면체에는 평행한 면이 3쌍 있고, 어느 쌍이든 밑면이 될 수 있어요. 밑면과 수직인 면은 옆면이고, 한 밑면에 대한 옆면은 4개예요.'));
      var card = ui.card('면을 골라 짝 찾기');
      container.appendChild(card);
      card.appendChild(ui.guide('면을 하나 고르면 평행한 면(초록)과 수직인 면(주황)이 보여요. 평행한 면 3쌍을 모두 찾아봐요.'));
      var solid = G.cuboid(3, 2, 2);
      var board = ui.board('0 0 300 230');
      card.appendChild(board.wrap);
      var pairStatus = el('p', 'mx-question');
      card.appendChild(pairStatus);
      var row = el('div', 'mx-btn-row cc-face-row');
      card.appendChild(row);
      var info = el('p', 'mx-note');
      card.appendChild(info);
      var after = el('div');
      card.appendChild(after);
      var chosen = null;
      var pairs = {};
      var started = false;
      var PAIR_KEY = { top: '위·아래', bottom: '위·아래', front: '앞·뒤', back: '앞·뒤', left: '왼쪽·오른쪽', right: '왼쪽·오른쪽' };

      function draw() {
        board.svg.replaceChildren();
        var par = chosen ? G.parallelFace(chosen) : null;
        var perp = chosen ? G.perpendicularFaces(chosen) : [];
        drawSolid(board.svg, ui, solid, {
          scale: 44,
          ox: 150,
          oy: 112,
          labels: G.LABELS,
          faceClass: function (fi, visible) {
            var id = solid.faces[fi].id;
            if (id === chosen) return 'cc-face-chosen';
            if (id === par) return 'cc-face-parallel';
            if (perp.indexOf(id) >= 0) return visible ? 'cc-face-perp' : '';
            return visible ? 'cc-face cc-face-soft' : '';
          }
        });
        var n = Object.keys(pairs).length;
        pairStatus.textContent = '찾은 평행한 면: ' + n + ' / 3쌍' + (n ? ' (' + Object.keys(pairs).join(', ') + ')' : '');
        if (chosen) {
          info.textContent = ui.josa('면 ' + G.FACE_NAMES[chosen], 'gwa') + ' 평행한 면: 면 ' + G.FACE_NAMES[par] + ' · 수직인 면: ' + perp.length + '개';
        }
      }

      G.FACES.forEach(function (f) {
        row.appendChild(ui.button('면 ' + G.FACE_NAMES[f.id] + ' (' + f.place + ')', 'mx-btn cc-face-btn', function () {
          chosen = f.id;
          ctx.say(ui.josa('면 ' + G.FACE_NAMES[f.id], 'eul') + ' 골랐어요. 초록 면이 평행한 면이에요.');
          pairs[PAIR_KEY[f.id]] = true;
          draw();
          if (Object.keys(pairs).length === 3 && !started) {
            started = true;
            ctx.praise();
            quiz();
          }
        }));
      });

      function quiz() {
        ui.sequence(after, [
          function (s, go) {
            s.appendChild(ui.choiceQuestion({
              question: '면 ㄴㅂㅅㄷ과 평행한 면은 어느 것일까요?',
              choices: ['면 ㄱㅁㅇㄹ', '면 ㄱㄴㄷㄹ', '면 ㄷㅅㅇㄹ'],
              answer: 0,
              hint: '면 ㄴㅂㅅㄷ은 앞쪽 면이에요. 계속 늘여도 만나지 않는 뒤쪽 면을 찾아요.',
              explain: '앞면 ㄴㅂㅅㄷ과 뒷면 ㄱㅁㅇㄹ은 서로 평행해요.',
              onSolved: go
            }));
          },
          function (s, go) {
            s.appendChild(ui.choiceQuestion({
              question: '면 ㄱㄴㄷㄹ을 밑면으로 하면, 옆면은 몇 개일까요?',
              choices: ['4개', '2개', '5개'],
              answer: 0,
              hint: '윗면을 고르면 주황색으로 보이는 수직인 면을 세어 봐요.',
              explain: '한 밑면에 수직인 옆면은 4개예요.',
              onSolved: go
            }));
          },
          function (s, go) {
            s.appendChild(ui.choiceQuestion({
              question: '직육면체에서 밑면이 될 수 있는 면은?',
              choices: ['평행한 면 3쌍 모두', '위와 아래 면만', '가장 넓은 면만'],
              answer: 0,
              hint: '앞·뒤 면을 골랐을 때도 서로 평행했어요. 평행한 두 면은 모두 밑면이 될 수 있어요.',
              explain: '평행한 면 3쌍은 각각 밑면이 될 수 있어요. 밑면이 꼭 아래에 있어야 하는 것은 아니에요.',
              onSolved: go
            }));
          }
        ], function () {
          ctx.complete();
          after.appendChild(ui.doneBadge());
        });
      }

      draw();
      ctx.say('3관이에요. 면을 골라 평행한 면과 수직인 면을 찾아볼까요?');
    }
  };


  // ── 4관 겨냥도: 보이는 모서리는 실선, 보이지 않는 모서리는 점선 ──
  var tab4 = {
    title: '4관 겨냥도',
    icon: '✏️',
    sub: '실선·점선',
    render: function (container, ctx) {
      var ui = ctx.ui;
      var el = ui.el;
      container.appendChild(ui.concept('✏️ 직육면체의 겨냥도', '직육면체 모양을 잘 알 수 있도록 나타낸 그림을 겨냥도라고 해요. 겨냥도에서 보이는 모서리는 실선으로, 보이지 않는 모서리는 점선으로 그려요.'));
      var card = ui.card('겨냥도 살펴보기');
      container.appendChild(card);
      var solid = G.cuboid(3, 2, 2);
      var board = ui.board('0 0 300 230');
      card.appendChild(board.wrap);
      drawSolid(board.svg, ui, solid, { scale: 44, ox: 150, oy: 112, faceClass: function () { return ''; }, vertexClass: function () { return 'cc-vertex'; } });
      var steps = el('div');
      card.appendChild(steps);
      var fixCard = ui.card('잘못 그린 겨냥도 고치기');
      fixCard.hidden = true;
      container.appendChild(fixCard);

      ui.sequence(steps, [
        function (s, go) {
          s.appendChild(ui.choiceQuestion({
            question: '이 겨냥도에서 보이는 면은 몇 개일까요?',
            choices: ['3개', '4개', '6개'],
            answer: 0,
            hint: '실선으로만 둘러싸인 면을 세어 봐요. 앞, 위, 옆이 보여요.',
            explain: '이 그림에서는 면 3개가 보이고, 나머지 3개는 뒤쪽에 숨어 있어요.',
            onSolved: go
          }));
        },
        function (s, go) {
          s.appendChild(ui.choiceQuestion({
            question: '이 겨냥도에서 보이지 않는 모서리는 몇 개일까요?',
            choices: ['3개', '9개', '12개'],
            answer: 0,
            hint: '점선으로 그린 모서리를 세어 봐요.',
            explain: '점선 3개가 보이지 않는 모서리예요. 실선 9개와 합하면 모서리는 모두 12개예요.',
            onSolved: go
          }));
        },
        function (s, go) {
          s.appendChild(ui.choiceQuestion({
            question: '이 겨냥도에서 보이지 않는 꼭짓점은 몇 개일까요?',
            choices: ['1개', '2개', '0개'],
            answer: 0,
            hint: '점선 3개가 모두 만나는 점을 찾아봐요.',
            explain: '점선 3개가 만나는 꼭짓점 1개가 보이지 않아요.',
            onSolved: go
          }));
        }
      ], function () {
        fixCard.hidden = false;
        fixRounds();
      });

      // 한 모서리만 잘못 그린 겨냥도 두 개: 숨은 모서리를 실선으로, 보이는 모서리를 점선으로
      function fixRounds() {
        var v = G.view(solid, STD_YAW, STD_PITCH, 44, 150, 112);
        var hiddenEdge = v.edges.filter(function (e) { return !e.visible; })[1];
        var visibleEdge = v.edges.filter(function (e) { return e.visible; })[4];
        var rounds = [
          { edge: hiddenEdge, cls: 'cc-force-solid', q: '보이지 않는데 실선으로 그린 모서리를 찾아 눌러요.', hint: '실선 3개가 한 점에서 만나는 곳 말고, 뒤쪽 안으로 들어간 선을 살펴봐요.' },
          { edge: visibleEdge, cls: 'cc-force-dashed', q: '보이는데 점선으로 그린 모서리를 찾아 눌러요.', hint: '바깥 테두리에 있는 모서리는 모두 보여요. 점선이 이상한 곳을 찾아봐요.' }
        ];
        var r = 0;
        var body = el('div');
        fixCard.appendChild(body);

        function draw(round, fixed) {
          body.replaceChildren();
          body.appendChild(el('p', 'mx-question', (r + 1) + ' / 2 · ' + round.q));
          var b = ui.board('0 0 300 230');
          body.appendChild(b.wrap);
          var hintEl = el('div', 'mx-hint');
          hintEl.hidden = true;
          var key = round.edge.a + '-' + round.edge.b;
          var glow = false;
          function paint() {
            b.svg.replaceChildren();
            drawSolid(b.svg, ui, solid, {
              scale: 44,
              ox: 150,
              oy: 112,
              faceClass: function () { return ''; },
              edgeClass: function (e) {
                if (e.a + '-' + e.b !== key || fixed) return '';
                return round.cls + (glow ? ' cc-edge-glow' : '');
              },
              onEdge: fixed ? null : function (e) {
                if (e.a + '-' + e.b === key) {
                  fixed = true;
                  ctx.praise();
                  ui.hint(hintEl, '✨ 고쳤어요! ' + (round.cls === 'cc-force-solid' ? '보이지 않는 모서리는 점선이에요.' : '보이는 모서리는 실선이에요.'));
                  paint();
                  next();
                  return;
                }
                glow = true;
                ctx.encourage();
                ui.hint(hintEl, '💡 ' + round.hint + ' 반짝이는 모서리예요.');
                paint();
              }
            });
          }
          paint();
          body.appendChild(hintEl);
        }

        function next() {
          var row = el('div', 'mx-btn-row');
          if (r + 1 < rounds.length) {
            row.appendChild(ui.button('다음 겨냥도 ▶', 'mx-btn primary', function () {
              r += 1;
              draw(rounds[r], false);
            }));
          } else {
            ctx.complete();
            body.appendChild(ui.doneBadge());
          }
          body.appendChild(row);
        }

        draw(rounds[0], false);
      }
      ctx.say('4관이에요. 겨냥도에서 실선과 점선을 살펴볼까요?');
    }
  };

  global.CuboidLabsA = { tab1: tab1, tab2: tab2, tab3: tab3, tab4: tab4, drawSolid: drawSolid, STD_YAW: STD_YAW, STD_PITCH: STD_PITCH };
})(typeof window !== 'undefined' ? window : globalThis);
