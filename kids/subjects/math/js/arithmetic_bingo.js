// 초1 덧셈·뺄셈 「🎯 10 빙고」 화면 (docs/math_1_bridge_spec.md §4-1)
(function (global) {
  'use strict';

  var MINUS = '\u2212';
  var BOX = '\u25A1';
  var MAX_TRIES = 200;

  function noop() {}

  function pickRng(rng) {
    return typeof rng === 'function' ? rng : Math.random;
  }

  function randInt(lo, hi, rng) {
    var r = pickRng(rng)();
    if (r < 0) r = 0;
    if (r >= 1) r = 0.999999999999;
    return lo + Math.floor(r * (hi - lo + 1));
  }

  function shuffle(arr, r) {
    var out = arr.slice();
    var i, j, tmp;
    for (i = out.length - 1; i > 0; i -= 1) {
      j = randInt(0, i, r);
      tmp = out[i];
      out[i] = out[j];
      out[j] = tmp;
    }
    return out;
  }

  function make10Problem(a) {
    var ans = 10 - a;
    return {
      kind: 'make10',
      op: 'add',
      a: a,
      b: null,
      answerText: String(ans),
      call: a + ' + ' + BOX + ' = 10',
      speak: a + ' 더하기 몇은 10?'
    };
  }

  function addCrossProblem(a, b) {
    var ans = a + b;
    return {
      kind: 'add-cross',
      op: 'add',
      a: a,
      b: b,
      answerText: String(ans),
      call: a + ' + ' + b,
      speak: a + ' 더하기 ' + b
    };
  }

  function sub10Problem(b) {
    var ans = 10 - b;
    return {
      kind: 'sub10',
      op: 'sub',
      a: 10,
      b: b,
      answerText: String(ans),
      call: '10 ' + MINUS + ' ' + b,
      speak: '10 빼기 ' + b
    };
  }

  function subTeenProblem(a, b) {
    var ans = a - b;
    return {
      kind: 'sub-teen',
      op: 'sub',
      a: a,
      b: b,
      answerText: String(ans),
      call: a + ' ' + MINUS + ' ' + b,
      speak: a + ' 빼기 ' + b
    };
  }

  function isValidBingo(list, op) {
    if (!Array.isArray(list) || list.length !== 9) return false;
    var seen = {};
    var tenCount = 0;
    var i, p;
    for (i = 0; i < list.length; i += 1) {
      p = list[i];
      if (!p || !p.answerText || seen[p.answerText]) return false;
      seen[p.answerText] = true;
      if (op === 'add' && p.kind === 'make10') tenCount += 1;
      if (op === 'sub' && p.kind === 'sub10') tenCount += 1;
      if (op === 'sub' && p.answerText === '1' && p.kind !== 'sub10') return false;
    }
    return tenCount === 4 || tenCount === 5;
  }

  function tryMakeAdd(r) {
    var mCount = randInt(4, 5, r);
    var aList = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], r);
    var sums = shuffle([11, 12, 13, 14, 15, 16, 17, 18], r);
    var out = [];
    var i, sum, aMin, aMax, a;
    for (i = 0; i < mCount; i += 1) {
      out.push(make10Problem(aList[i]));
    }
    for (i = 0; i < 9 - mCount; i += 1) {
      sum = sums[i];
      aMin = Math.max(2, sum - 9);
      aMax = Math.min(9, sum - 2);
      a = randInt(aMin, aMax, r);
      out.push(addCrossProblem(a, sum - a));
    }
    return shuffle(out, r);
  }

  function tryMakeSub(r) {
    var sCount = randInt(4, 5, r);
    var rest = shuffle([2, 3, 4, 5, 6, 7, 8, 9], r);
    var out = [sub10Problem(9)];
    var i, ans, bMin, bMax, b;
    for (i = 0; i < sCount - 1; i += 1) {
      ans = rest[i];
      out.push(sub10Problem(10 - ans));
    }
    for (i = sCount - 1; i < rest.length; i += 1) {
      ans = rest[i];
      bMin = Math.max(2, 11 - ans);
      bMax = Math.min(9, 18 - ans);
      b = randInt(bMin, bMax, r);
      out.push(subTeenProblem(ans + b, b));
    }
    return shuffle(out, r);
  }

  function fallbackBoard(op) {
    if (op === 'sub') {
      return [
        sub10Problem(9),
        sub10Problem(8),
        sub10Problem(7),
        sub10Problem(6),
        subTeenProblem(11, 6),
        subTeenProblem(12, 6),
        subTeenProblem(13, 6),
        subTeenProblem(14, 6),
        subTeenProblem(15, 6)
      ];
    }
    return [
      make10Problem(9),
      make10Problem(8),
      make10Problem(7),
      make10Problem(6),
      addCrossProblem(9, 2),
      addCrossProblem(9, 3),
      addCrossProblem(9, 4),
      addCrossProblem(9, 5),
      addCrossProblem(9, 6)
    ];
  }

  // 10 만들기/빼기 9문제 빙고 생성 (answerText 중복 없음)
  function makeBingo(op, rng) {
    var mode = op === 'sub' ? 'sub' : 'add';
    var r = pickRng(rng);
    var i, board;
    for (i = 0; i < MAX_TRIES; i += 1) {
      board = mode === 'sub' ? tryMakeSub(r) : tryMakeAdd(r);
      if (isValidBingo(board, mode)) return board;
    }
    return fallbackBoard(mode);
  }

  // MathBingo.render가 쓰는 컨텍스트 (공용 MathBingo.makeCtx, 첫 판 키 math_cpa-bingo-{add|sub}_first_{아이}_{날짜})
  function makeCtx(op) {
    var mode = op === 'sub' ? 'sub' : 'add';
    return global.MathBingo.makeCtx({ keyPrefix: 'math_cpa-bingo-' + mode + '_first', expType: 'math' });
  }

  // 패널 안에 안내·버튼 소리 선택·3×3 빙고를 그린다
  function mount(panel, op) {
    if (!panel) return;
    var mode = op === 'sub' ? 'sub' : 'add';
    var ctx = makeCtx(mode);
    var ui = ctx.ui;
    panel.replaceChildren();
    panel.appendChild(ui.guide('판에 숫자를 놓고, 들리는 문제의 답을 터뜨려요!'));
    if (global.MathSquishy && typeof global.MathSquishy.chooserButton === 'function') {
      var head = ui.el('div', 'mx-bingo-head');
      head.appendChild(global.MathSquishy.chooserButton());
      panel.appendChild(head);
    }
    var area = ui.el('div', 'mx-bingo-area');
    panel.appendChild(area);
    global.MathBingo.render(area, ctx, {
      makeBingo: function () { return makeBingo(mode, Math.random); },
      prefix: 'cpa-bingo',
      counterKey: 'cpa-bingo-' + mode,
      perReward: 6,
      title: mode === 'add' ? '🎯 10 만들기 빙고' : '🎯 10에서 빼기 빙고'
    });
    if (global.MathSquishy && typeof global.MathSquishy.attach === 'function') {
      try {
        global.MathSquishy.attach();
      } catch (e) {}
    }
  }

  if (typeof document !== 'undefined' && document && typeof document.addEventListener === 'function') {
    document.addEventListener('DOMContentLoaded', function () {
      var panel = document.getElementById('panel-bingo');
      if (!panel) return;
      var op = document.body && document.body.dataset && document.body.dataset.operation === 'subtract'
        ? 'sub'
        : 'add';
      mount(panel, op);
    });
  }

  global.ArithmeticBingo = {
    makeBingo: makeBingo,
    makeCtx: makeCtx,
    mount: mount
  };
})(typeof window !== 'undefined' ? window : globalThis);
