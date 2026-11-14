// 5-2 수학 5단원 직육면체와 정육면체: 전개도 접기 화면 + 5·6관 + 탐험관 띄우기 (CuboidNet)
// 5관 전개도 118~123쪽(정육면체 전개도 판정, 직육면체 전개도 마주 보는 면) · 6관 126~127쪽(주사위, 만나는 점)
(function (global) {
  'use strict';

  var G = global.CuboidGeo;
  var S = 64;
  var PAIR_COLORS = ['cc-pair-a', 'cc-pair-b', 'cc-pair-c'];

  // ── CSS 3D 접기: 첫 칸을 바닥에 두고 이웃 칸을 경첩(붙은 모서리)으로 90° 접는다 ──
  // faceContent(i) → 칸 안에 넣을 노드(선택). 반환: { wrap, fold(), unfold() }
  function foldView(el, cells, faceContent) {
    var info = G.foldNet(cells);
    var wrap = el('div', 'cc-fold-wrap');
    var scene = el('div', 'cc-fold-scene');
    wrap.appendChild(scene);
    var minC = Math.min.apply(null, cells.map(function (c) { return c[0]; }));
    var maxC = Math.max.apply(null, cells.map(function (c) { return c[0]; }));
    var minR = Math.min.apply(null, cells.map(function (c) { return c[1]; }));
    var maxR = Math.max.apply(null, cells.map(function (c) { return c[1]; }));
    scene.style.width = (maxC - minC + 1) * S + 'px';
    scene.style.height = (maxR - minR + 1) * S + 'px';
    // 접으면 상자가 첫 칸 자리에 생기므로, 그 칸이 판 가운데로 오게 옮길 거리
    scene.style.setProperty('--cc-dx', (((maxC - minC + 1) * S) / 2 - ((cells[0][0] - minC) * S + S / 2)) + 'px');
    scene.style.setProperty('--cc-dy', (((maxR - minR + 1) * S) / 2 - ((cells[0][1] - minR) * S + S / 2)) + 'px');
    var nodes = cells.map(function (c, i) {
      var d = el('div', 'cc-fold-face');
      d.style.width = S + 'px';
      d.style.height = S + 'px';
      if (typeof faceContent === 'function') {
        var inner = faceContent(i);
        if (inner) d.appendChild(inner);
      }
      return d;
    });
    var ROT = {
      right: { origin: 'left center', pos: [S, 0], tf: function (a) { return 'rotateY(' + (-a) + 'deg)'; } },
      left: { origin: 'right center', pos: [-S, 0], tf: function (a) { return 'rotateY(' + a + 'deg)'; } },
      down: { origin: 'center top', pos: [0, S], tf: function (a) { return 'rotateX(' + a + 'deg)'; } },
      up: { origin: 'center bottom', pos: [0, -S], tf: function (a) { return 'rotateX(' + (-a) + 'deg)'; } }
    };
    nodes.forEach(function (d, i) {
      if (i === 0) {
        d.style.left = (cells[0][0] - minC) * S + 'px';
        d.style.top = (cells[0][1] - minR) * S + 'px';
        scene.appendChild(d);
        return;
      }
      var r = ROT[info.hinge[i].dir];
      d.style.left = r.pos[0] + 'px';
      d.style.top = r.pos[1] + 'px';
      d.style.transformOrigin = r.origin;
      nodes[info.parent[i]].appendChild(d);
    });

    function setAngle(a) {
      nodes.forEach(function (d, i) {
        if (i === 0) return;
        d.style.transform = ROT[info.hinge[i].dir].tf(a);
      });
      wrap.classList.toggle('is-folded', a > 0);
    }

    setAngle(0);
    return {
      wrap: wrap,
      fold: function () { setAngle(90); },
      unfold: function () { setAngle(0); },
      isFolded: function () { return wrap.classList.contains('is-folded'); }
    };
  }

  // 평평한 전개도 SVG. opts: { cellClass(i), onCell(i), label(i), points: [[x,y,글자]] }
  function drawNet(ui, cells, opts) {
    var o = opts || {};
    var U = 40;
    var maxC = Math.max.apply(null, cells.map(function (c) { return c[0]; }));
    var maxR = Math.max.apply(null, cells.map(function (c) { return c[1]; }));
    var b = ui.board('-16 -16 ' + ((maxC + 1) * U + 32) + ' ' + ((maxR + 1) * U + 32), 'cc-net-board');
    cells.forEach(function (c, i) {
      var r = ui.svg('rect', { x: c[0] * U, y: c[1] * U, width: U, height: U, class: 'cc-net-cell ' + (typeof o.cellClass === 'function' ? o.cellClass(i) : '') });
      if (typeof o.onCell === 'function') {
        r.classList.add('cc-tap');
        r.addEventListener('click', function () { o.onCell(i); });
      }
      b.svg.appendChild(r);
      var lab = typeof o.label === 'function' ? o.label(i) : '';
      if (lab) ui.text(b.svg, c[0] * U + U / 2, c[1] * U + U / 2, lab, 'mx-label mx-label-lg');
    });
    (o.points || []).forEach(function (p) {
      b.svg.appendChild(ui.svg('circle', { cx: p[0] * U, cy: p[1] * U, r: 3.5, class: 'cc-net-point' }));
      ui.text(b.svg, p[0] * U + 9, p[1] * U - 9, p[2], 'mx-label mx-label-sm mx-label-purple');
    });
    return b.wrap;
  }

  // 접기·펼치기 버튼. 글자는 지금 접힌 상태를 보고 정한다 (다른 곳에서 접어도 맞게).
  function foldButton(ui, fv) {
    function label() {
      return fv.isFolded() ? '📄 다시 펼치기' : '📦 접어 보기';
    }
    var btn = ui.button(label(), 'mx-btn', function () {
      if (fv.isFolded()) fv.unfold();
      else fv.fold();
      btn.textContent = label();
    });
    btn.syncLabel = function () { btn.textContent = label(); };
    return btn;
  }

  // ── 5관: 정육면체 전개도 판정 4개 → 직육면체 전개도 마주 보는 면 ──
  function cuboidNetPart(container, ctx, done) {
    var ui = ctx.ui;
    var el = ui.el;
    // 가로 3 cm, 세로(높이) 4 cm, 폭 2 cm 직육면체 전개도 (단위 칸 = 1 cm)
    var W = 3;
    var H = 4;
    var D = 2;
    var faces = [
      { id: 'top', x: D, y: 0, w: W, h: D, name: '윗면' },
      { id: 'front', x: D, y: D, w: W, h: H, name: '앞면' },
      { id: 'bottom', x: D, y: D + H, w: W, h: D, name: '아랫면' },
      { id: 'back', x: D, y: D + H + D, w: W, h: H, name: '뒷면' },
      { id: 'left', x: 0, y: D, w: D, h: H, name: '왼쪽 옆면' },
      { id: 'right', x: D + W, y: D, w: D, h: H, name: '오른쪽 옆면' }
    ];
    var PAIR = { top: 0, bottom: 0, front: 1, back: 1, left: 2, right: 2 };
    var found = {};
    var U = 20;
    container.appendChild(ui.guide('가로 3 cm, 세로 4 cm, 높이 2 cm 상자의 전개도예요. 면을 누르면 접었을 때 마주 보는 면이 같은 색으로 칠해져요. 3쌍을 모두 찾아요.'));
    var b = ui.board('-30 -10 ' + ((2 * D + W) * U + 60) + ' ' + ((2 * D + 2 * H) * U + 20), 'cc-net-board');
    container.appendChild(b.wrap);
    var status = el('p', 'mx-question');
    container.appendChild(status);
    var after = el('div');
    container.appendChild(after);
    var started = false;

    function draw() {
      b.svg.replaceChildren();
      faces.forEach(function (f) {
        var pi = PAIR[f.id];
        var r = ui.svg('rect', { x: f.x * U, y: f.y * U, width: f.w * U, height: f.h * U, class: 'cc-net-cell cc-tap ' + (found[pi] ? PAIR_COLORS[pi] : '') });
        r.addEventListener('click', function () { tapFace(f); });
        b.svg.appendChild(r);
        ui.text(b.svg, (f.x + f.w / 2) * U, (f.y + f.h / 2) * U, f.name, 'mx-label mx-label-sm');
      });
      ui.text(b.svg, (D + W / 2) * U, (D + H) * U - 8, '3 cm', 'mx-label mx-label-sm mx-label-orange');
      ui.text(b.svg, (D + W) * U - 14, (D + H / 2) * U + 14, '4 cm', 'mx-label mx-label-sm mx-label-orange');
      ui.text(b.svg, (D / 2) * U, D * U - 8, '2 cm', 'mx-label mx-label-sm mx-label-orange');
      ui.text(b.svg, -16, (D + H + D / 2) * U, '?', 'mx-label mx-label-lg mx-label-purple');
      b.svg.appendChild(ui.svg('line', { x1: -6, y1: (D + H) * U, x2: -6, y2: (D + H + D) * U, class: 'cc-dim-line' }));
      status.textContent = '찾은 마주 보는 면: ' + Object.keys(found).length + ' / 3쌍';
    }

    function tapFace(f) {
      var pi = PAIR[f.id];
      if (found[pi]) return;
      found[pi] = true;
      var mate = faces.filter(function (g) { return g.id !== f.id && PAIR[g.id] === pi; })[0];
      ctx.say(f.name + '과 ' + mate.name + '은 마주 보는 면이에요.');
      draw();
      if (Object.keys(found).length === 3 && !started) {
        started = true;
        ctx.praise();
        ui.sequence(after, [
          function (s, go) {
            s.appendChild(ui.choiceQuestion({
              question: '직육면체 전개도에서 마주 보는 면끼리는 어떤 사이일까요?',
              choices: ['모양과 크기가 같아요', '크기만 달라요', '서로 수직이에요'],
              answer: 0,
              hint: '같은 색으로 칠해진 두 면을 겹쳐 본다고 생각해 봐요.',
              explain: '마주 보는 면은 서로 합동이에요. 그래서 합동인 면이 3쌍 있어요.',
              onSolved: go
            }));
          },
          function (s, go) {
            s.appendChild(ui.choiceQuestion({
              question: '전개도의 ?로 표시한 아랫면의 세로 길이는 몇 cm일까요?',
              choices: ['2 cm', '3 cm', '4 cm'],
              answer: 0,
              hint: '아랫면은 윗면과 마주 보는 합동인 면이에요. 윗면의 세로를 보세요.',
              explain: '아랫면은 윗면과 합동이라 세로가 2 cm예요.',
              onSolved: go
            }));
          }
        ], done);
      }
    }

    draw();
  }

  var tab5 = {
    title: '5관 전개도',
    icon: '🗺️',
    sub: '접으면 상자가 될까?',
    render: function (container, ctx) {
      var ui = ctx.ui;
      var el = ui.el;
      container.appendChild(ui.concept('🗺️ 전개도', '직육면체의 모서리를 잘라서 평면 위에 펼친 그림을 전개도라고 해요. 전개도를 접었을 때 면끼리 겹치거나 빈 곳이 생기면 상자가 될 수 없어요.'));
      var card = ui.card('정육면체가 될까요?');
      container.appendChild(card);
      var nets = ui.shuffle(ui.shuffle(G.CUBE_NETS).slice(0, 2).map(function (n) { return { cells: n, ok: true }; })
        .concat(ui.shuffle(G.NOT_NETS).slice(0, 2).map(function (n) { return { cells: n, ok: false }; })));
      var idx = 0;
      var stage = el('div');
      card.appendChild(stage);
      var part2 = ui.card('직육면체 전개도의 마주 보는 면');
      part2.hidden = true;
      container.appendChild(part2);

      function run() {
        stage.replaceChildren();
        var net = nets[idx];
        stage.appendChild(el('span', 'mx-step-label', '전개도 ' + (idx + 1) + ' / ' + nets.length));
        var fv = foldView(el, net.cells, null);
        stage.appendChild(fv.wrap);
        var foldRow = el('div', 'mx-btn-row');
        foldRow.hidden = true;
        foldRow.appendChild(foldButton(ui, fv));
        stage.appendChild(ui.choiceQuestion({
          question: '이 전개도를 접으면 정육면체가 될까요?',
          choices: ['정육면체가 돼요', '정육면체가 안 돼요'],
          answer: net.ok ? 0 : 1,
          fixed: true,
          hint: net.ok ? '정사각형이 한 줄에 4개 넘게 있지 않고, 접으면 6면이 하나씩 자리를 잡아요. 접어 보고 확인해요.' : '접으면 두 면이 같은 자리에서 겹치고 한쪽은 비어요. 접어 보고 확인해요.',
          explain: net.ok ? '6개의 면이 겹치지 않고 상자가 돼요.' : '면이 겹치는 곳이 생겨서 정육면체가 될 수 없어요.',
          onSolved: function () {
            foldRow.hidden = false;
            fv.fold();
            foldRow.firstChild.syncLabel();
            var row = el('div', 'mx-btn-row');
            if (idx + 1 < nets.length) {
              row.appendChild(ui.button('다음 전개도 ▶', 'mx-btn primary', function () {
                idx += 1;
                run();
              }));
            } else {
              part2.hidden = false;
              cuboidNetPart(part2, ctx, function () {
                ctx.complete();
                part2.appendChild(ui.doneBadge());
              });
            }
            stage.appendChild(row);
          }
        }));
        stage.appendChild(foldRow);
      }

      run();
      ctx.say('5관이에요. 전개도를 접으면 정육면체가 될지 생각해 볼까요?');
    }
  };

  // ── 6관: 주사위 전개도 → 만나는 점 ──
  var PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };

  function pipFace(el, n) {
    var g = el('div', 'cc-pips');
    for (var i = 0; i < 9; i += 1) g.appendChild(el('span', PIPS[n] && PIPS[n].indexOf(i) >= 0 ? 'cc-pip on' : 'cc-pip'));
    return g;
  }

  function dicePart(container, ctx, done) {
    var ui = ctx.ui;
    var el = ui.el;
    var cells = G.CUBE_NETS[ui.randInt(0, G.CUBE_NETS.length - 1)];
    var opp = G.oppositeCells(cells);
    // 서로 마주 보지 않는 세 칸에 1·2·3을 준다
    var given = {};
    var nums = ui.shuffle([1, 2, 3]);
    var used = {};
    var k = 0;
    ui.shuffle(cells.map(function (c, i) { return i; })).forEach(function (i) {
      if (k >= 3 || used[i]) return;
      given[i] = nums[k];
      used[i] = true;
      used[opp[i]] = true;
      k += 1;
    });
    var values = {};
    Object.keys(given).forEach(function (i) { values[i] = given[i]; });
    var selected = null;
    container.appendChild(ui.guide('주사위는 마주 보는 면의 눈의 수를 더하면 7이에요. 빈 면을 누르고 알맞은 눈을 골라요.'));
    var netWrap = el('div');
    container.appendChild(netWrap);
    var pickRow = el('div', 'mx-btn-row');
    container.appendChild(pickRow);
    var hintEl = el('div', 'mx-hint');
    hintEl.hidden = true;
    container.appendChild(hintEl);
    var after = el('div');
    container.appendChild(after);

    function blanks() {
      return cells.map(function (c, i) { return i; }).filter(function (i) { return values[i] === undefined; });
    }

    function draw() {
      netWrap.replaceChildren();
      netWrap.appendChild(drawNet(ui, cells, {
        cellClass: function (i) {
          if (i === selected) return 'cc-net-selected';
          if (selected !== null && i === opp[selected]) return 'cc-net-mate';
          return values[i] !== undefined ? 'cc-net-filled' : 'cc-net-blank';
        },
        label: function (i) { return values[i] !== undefined ? String(values[i]) : (i === selected ? '?' : ''); },
        onCell: function (i) {
          if (values[i] !== undefined) return;
          selected = i;
          ui.hint(hintEl, '');
          draw();
          drawPick();
        }
      }));
    }

    function drawPick() {
      pickRow.replaceChildren();
      if (selected === null) return;
      var answer = 7 - values[opp[selected]];
      ui.arrange([4, 5, 6].map(String)).forEach(function (ch) {
        var b = ui.button('눈 ' + ch.text, 'mx-btn mx-choice', function () {
          if (b.disabled) return;
          if (Number(ch.text) === answer) {
            values[selected] = answer;
            selected = null;
            ctx.praise();
            ui.hint(hintEl, '');
            pickRow.replaceChildren();
            draw();
            if (!blanks().length) finish();
            return;
          }
          b.disabled = true;
          b.classList.add('is-off');
          ctx.encourage();
          var mateN = values[opp[selected]];
          ui.hint(hintEl, '💡 노랗게 표시된 면이 마주 보는 면이에요. 그 면의 눈이 ' + mateN + '개이니까 7에서 ' + ui.josa(String(mateN), 'eul') + ' 빼 봐요.');
        });
        pickRow.appendChild(b);
      });
    }

    function finish() {
      var fv = foldView(el, cells, function (i) { return pipFace(el, values[i]); });
      after.appendChild(fv.wrap);
      var row = el('div', 'mx-btn-row');
      row.appendChild(foldButton(ui, fv));
      after.appendChild(row);
      setTimeout(function () {
        fv.fold();
        row.firstChild.syncLabel();
      }, 300);
      ctx.say('주사위 전개도를 완성했어요! 접어서 확인해 봐요.');
      done();
    }

    draw();
  }

  var POINT_NAMES = ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ'];

  function meetPart(container, ctx, done) {
    var ui = ctx.ui;
    var el = ui.el;
    var rounds = 2;
    var r = 0;
    var body = el('div');
    container.appendChild(body);

    function corners(cells) {
      var seen = {};
      var out = [];
      cells.forEach(function (c) {
        [[c[0], c[1]], [c[0] + 1, c[1]], [c[0] + 1, c[1] + 1], [c[0], c[1] + 1]].forEach(function (p) {
          var k = p.join(',');
          if (!seen[k]) {
            seen[k] = true;
            out.push(p);
          }
        });
      });
      return out;
    }

    function makeRound() {
      for (var t = 0; t < 40; t += 1) {
        var cells = G.CUBE_NETS[ui.randInt(0, G.CUBE_NETS.length - 1)];
        var pts = ui.shuffle(corners(cells));
        for (var i = 0; i < pts.length; i += 1) {
          var meet = G.meetingPoints(cells, pts[i]);
          if (!meet.length) continue;
          var meetKeys = meet.map(function (p) { return p.join(','); });
          var others = pts.filter(function (p) { return p !== pts[i] && meetKeys.indexOf(p.join(',')) < 0; });
          if (others.length < 2) continue;
          return { cells: cells, target: pts[i], answer: meet[0], wrong: ui.shuffle(others).slice(0, 2) };
        }
      }
      return null;
    }

    function run() {
      body.replaceChildren();
      var q = makeRound();
      if (!q) {
        done();
        return;
      }
      var labeled = [q.target, q.answer, q.wrong[0], q.wrong[1]];
      var names = {};
      var order = ui.shuffle([1, 2, 3]);
      names[q.target.join(',')] = POINT_NAMES[0];
      names[q.answer.join(',')] = POINT_NAMES[order[0]];
      names[q.wrong[0].join(',')] = POINT_NAMES[order[1]];
      names[q.wrong[1].join(',')] = POINT_NAMES[order[2]];
      body.appendChild(el('span', 'mx-step-label', '만나는 점 ' + (r + 1) + ' / ' + rounds));
      body.appendChild(drawNet(ui, q.cells, { points: labeled.map(function (p) { return [p[0], p[1], names[p.join(',')]]; }) }));
      var fv = foldView(el, q.cells, null);
      var foldRow = el('div', 'mx-btn-row');
      foldRow.appendChild(foldButton(ui, fv));
      body.appendChild(ui.choiceQuestion({
        question: '전개도를 접었을 때 점 ㄱ과 만나는 점은 어느 것일까요?',
        choices: ['점 ' + names[q.answer.join(',')], '점 ' + names[q.wrong[0].join(',')], '점 ' + names[q.wrong[1].join(',')]],
        answer: 0,
        hint: '점 ㄱ이 붙어 있는 두 면이 접히면 어느 모서리끼리 붙는지 생각해 봐요. 아래 접어 보기로 확인해도 좋아요.',
        explain: '접으면 점 ㄱ과 점 ' + names[q.answer.join(',')] + '이 같은 꼭짓점에서 만나요.',
        onSolved: function () {
          var row = el('div', 'mx-btn-row');
          if (r + 1 < rounds) {
            row.appendChild(ui.button('다음 전개도 ▶', 'mx-btn primary', function () {
              r += 1;
              run();
            }));
            body.appendChild(row);
          } else {
            done();
          }
        }
      }));
      body.appendChild(foldRow);
      body.appendChild(fv.wrap);
    }

    run();
  }

  var tab6 = {
    title: '6관 주사위',
    icon: '🎲',
    sub: '마주 보는 면·만나는 점',
    render: function (container, ctx) {
      var ui = ctx.ui;
      container.appendChild(ui.concept('🎲 주사위 전개도와 만나는 점', '정육면체 전개도를 접으면 마주 보는 면은 서로 닿지 않아요. 주사위는 마주 보는 면의 눈의 수를 더하면 7이에요. 접었을 때 같은 꼭짓점에 모이는 점들은 서로 만나는 점이에요.'));
      var card = ui.card('주사위 전개도 완성하기');
      container.appendChild(card);
      var card2 = ui.card('접었을 때 만나는 점');
      card2.hidden = true;
      container.appendChild(card2);
      dicePart(card, ctx, function () {
        card2.hidden = false;
        meetPart(card2, ctx, function () {
          ctx.complete();
          card2.appendChild(ui.doneBadge());
        });
      });
      ctx.say('6관이에요. 주사위 전개도를 완성해 볼까요?');
    }
  };

  function start() {
    var A = global.CuboidLabsA;
    if (!global.MathExplorer || !A) return;
    global.MathExplorer.mount({
      key: 'cuboid',
      labs: [A.tab1, A.tab2, A.tab3, A.tab4, tab5, tab6],
      quiz: global.MathExplorerQuiz ? global.MathExplorerQuiz.create({
        grade: '5-2',
        unit: '5. 직육면체와 정육면체',
        title: '🏆 직육면체와 정육면체 퀴즈 배틀',
        intro: '직육면체와 정육면체 퀴즈 배틀이에요. 천천히 읽고 골라 볼까요?'
      }) : null
    });
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
  }

  global.CuboidNet = { tab5: tab5, tab6: tab6, foldView: foldView };
})(typeof window !== 'undefined' ? window : globalThis);
