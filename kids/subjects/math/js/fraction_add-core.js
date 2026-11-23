// 초등 4학년 2학기 분모가 같은 분수의 덧셈과 뺄셈 순수 계산 모듈
(function (global) {
  'use strict';

  var LAB_KINDS = {
    1: ['unit-count', 'unit-count', 'unit-count'],
    2: ['add-proper', 'add-proper', 'sub-proper'],
    3: ['sum-one', 'sum-over', 'sum-over'],
    4: ['mixed-add-proper', 'mixed-add', 'mixed-add-carry'],
    5: ['one-minus', 'whole-minus', 'whole-minus'],
    6: ['mixed-sub', 'mixed-sub-borrow', 'whole-minus-mixed']
  };

  var KIND_ORDER = (function () {
    var seen = {}, order = [], lab, list, i, k;
    for (lab = 1; lab <= 6; lab++) {
      list = LAB_KINDS[lab];
      for (i = 0; i < list.length; i++) {
        k = list[i];
        if (!seen[k]) { seen[k] = true; order.push(k); }
      }
    }
    return order;
  })();

  var KIND_INDEX = (function () {
    var map = {}, i;
    for (i = 0; i < KIND_ORDER.length; i++) map[KIND_ORDER[i]] = i;
    return map;
  })();

  function randInt(lo, hi, rng) {
    return Math.floor(rng() * (hi - lo + 1)) + lo;
  }

  function frac(w, n, d) {
    return { w: w, n: n, d: d };
  }

  function toImproper(f) {
    return { w: 0, n: f.w * f.d + f.n, d: f.d };
  }

  function toMixed(f) {
    var total = f.w * f.d + f.n;
    return { w: Math.floor(total / f.d), n: total % f.d, d: f.d };
  }

  function equals(a, b) {
    var ma = toMixed(a), mb = toMixed(b);
    return ma.w === mb.w && ma.n === mb.n && ma.d === mb.d;
  }

  function add(a, b) {
    if (a.d !== b.d) throw new Error('분모가 다릅니다');
    return toMixed({ w: 0, n: (a.w * a.d + a.n) + (b.w * b.d + b.n), d: a.d });
  }

  function sub(a, b) {
    if (a.d !== b.d) throw new Error('분모가 다릅니다');
    var diff = (a.w * a.d + a.n) - (b.w * b.d + b.n);
    if (diff <= 0) throw new Error('뺄셈 결과는 0보다 커야 합니다');
    return toMixed({ w: 0, n: diff, d: a.d });
  }

  function needsCarry(a, b) {
    return a.n + b.n >= a.d;
  }

  function needsBorrow(a, b) {
    return a.n < b.n;
  }

  function split(f) {
    if (f.w < 1) throw new Error('자연수 부분이 1 이상이어야 합니다');
    return { w: f.w - 1, n: f.n + f.d, d: f.d };
  }

  function label(f) {
    if (f.w === 0 && f.n === 0) throw new Error('0은 읽을 수 없습니다');
    if (f.w > 0 && f.n === 0) return String(f.w);
    if (f.w === 0) return f.d + '분의 ' + f.n;
    var last = f.w % 10;
    var josa = (last === 2 || last === 4 || last === 5 || last === 9) ? '와' : '과';
    return f.w + josa + ' ' + f.d + '분의 ' + f.n;
  }

  var FALLBACKS = {
    'unit-count': { op: null, a: frac(0, 3, 5), b: null },
    'add-proper': { op: '+', a: frac(0, 1, 5), b: frac(0, 2, 5) },
    'sub-proper': { op: '-', a: frac(0, 4, 5), b: frac(0, 1, 5) },
    'sum-one': { op: '+', a: frac(0, 1, 4), b: frac(0, 3, 4) },
    'sum-over': { op: '+', a: frac(0, 3, 5), b: frac(0, 4, 5) },
    'mixed-add-proper': { op: '+', a: frac(1, 1, 5), b: frac(0, 2, 5) },
    'mixed-add': { op: '+', a: frac(1, 1, 5), b: frac(2, 2, 5) },
    'mixed-add-carry': { op: '+', a: frac(1, 3, 5), b: frac(2, 4, 5) },
    'one-minus': { op: '-', a: frac(1, 0, 5), b: frac(0, 2, 5) },
    'whole-minus': { op: '-', a: frac(3, 0, 5), b: frac(0, 2, 5) },
    'mixed-sub': { op: '-', a: frac(3, 4, 5), b: frac(1, 2, 5) },
    'mixed-sub-borrow': { op: '-', a: frac(3, 1, 5), b: frac(1, 4, 5) },
    'whole-minus-mixed': { op: '-', a: frac(4, 0, 4), b: frac(1, 1, 4) }
  };

  function buildAnswer(op, a, b) {
    if (op === null) return toMixed(a);
    return op === '+' ? add(a, b) : sub(a, b);
  }

  function trySample(kind, rng) {
    var d = randInt(3, 10, rng), aw, an, bw, bn;
    if (kind === 'unit-count') {
      return { op: null, a: frac(0, randInt(2, d - 1, rng), d), b: null };
    }
    if (kind === 'add-proper') {
      an = randInt(1, d - 1, rng); bn = randInt(1, d - 1, rng);
      if (an + bn < d) return { op: '+', a: frac(0, an, d), b: frac(0, bn, d) };
      return null;
    }
    if (kind === 'sub-proper') {
      an = randInt(2, d - 1, rng); bn = randInt(1, d - 1, rng);
      if (an > bn) return { op: '-', a: frac(0, an, d), b: frac(0, bn, d) };
      return null;
    }
    if (kind === 'sum-one') {
      an = randInt(1, d - 1, rng);
      return { op: '+', a: frac(0, an, d), b: frac(0, d - an, d) };
    }
    if (kind === 'sum-over') {
      an = randInt(1, d - 1, rng); bn = randInt(1, d - 1, rng);
      if (an + bn > d && an + bn < 2 * d) return { op: '+', a: frac(0, an, d), b: frac(0, bn, d) };
      return null;
    }
    if (kind === 'mixed-add-proper') {
      aw = randInt(1, 4, rng); an = randInt(1, d - 1, rng); bn = randInt(1, d - 1, rng);
      if (an + bn < d) return { op: '+', a: frac(aw, an, d), b: frac(0, bn, d) };
      return null;
    }
    if (kind === 'mixed-add') {
      aw = randInt(1, 4, rng); bw = randInt(1, 4, rng);
      an = randInt(1, d - 1, rng); bn = randInt(1, d - 1, rng);
      if (an + bn < d) return { op: '+', a: frac(aw, an, d), b: frac(bw, bn, d) };
      return null;
    }
    if (kind === 'mixed-add-carry') {
      aw = randInt(1, 4, rng); bw = randInt(1, 4, rng);
      an = randInt(1, d - 1, rng); bn = randInt(1, d - 1, rng);
      if (an + bn > d) return { op: '+', a: frac(aw, an, d), b: frac(bw, bn, d) };
      return null;
    }
    if (kind === 'one-minus') {
      return { op: '-', a: frac(1, 0, d), b: frac(0, randInt(1, d - 1, rng), d) };
    }
    if (kind === 'whole-minus') {
      return { op: '-', a: frac(randInt(2, 5, rng), 0, d), b: frac(0, randInt(1, d - 1, rng), d) };
    }
    if (kind === 'mixed-sub') {
      aw = randInt(2, 5, rng); bw = randInt(1, 4, rng);
      an = randInt(2, d - 1, rng); bn = randInt(1, d - 1, rng);
      if (aw > bw && an > bn) return { op: '-', a: frac(aw, an, d), b: frac(bw, bn, d) };
      return null;
    }
    if (kind === 'mixed-sub-borrow') {
      aw = randInt(3, 5, rng); bw = randInt(1, 3, rng);
      an = randInt(1, d - 2, rng); bn = randInt(2, d - 1, rng);
      if (aw - 1 > bw && an < bn) return { op: '-', a: frac(aw, an, d), b: frac(bw, bn, d) };
      return null;
    }
    if (kind === 'whole-minus-mixed') {
      aw = randInt(3, 5, rng); bw = randInt(1, 3, rng); bn = randInt(1, d - 1, rng);
      if (bw <= aw - 2) return { op: '-', a: frac(aw, 0, d), b: frac(bw, bn, d) };
      return null;
    }
    return null;
  }

  function makeProblem(kind, rng) {
    if (!FALLBACKS[kind]) throw new Error('알 수 없는 문제 종류: ' + kind);
    var t, picked = null;
    for (t = 0; t < 200; t++) {
      picked = trySample(kind, rng);
      if (picked) break;
    }
    if (!picked) {
      var fb = FALLBACKS[kind];
      picked = { op: fb.op, a: frac(fb.a.w, fb.a.n, fb.a.d), b: fb.b ? frac(fb.b.w, fb.b.n, fb.b.d) : null };
    }
    return { kind: kind, op: picked.op, a: picked.a, b: picked.b, answer: buildAnswer(picked.op, picked.a, picked.b) };
  }

  function wrongChoices(problem) {
    var kind = problem.kind, a = problem.a, b = problem.b, ans = problem.answer;
    var d = a.d, ansText = label(ans), out = [], used = {}, cands = [], i;

    function pushCand(v, mistake) {
      cands.push({ value: v, mistake: mistake });
    }

    function tryAdd(v, mistake) {
      if (out.length >= 2 || !v || v.w < 0 || v.n < 0 || v.d < 1) return;
      if (v.w * v.d + v.n <= 0) return;
      var t = label(v);
      if (t === ansText || used[t]) return;
      used[t] = true;
      out.push({ value: v, text: t, mistake: mistake });
    }

    if (kind === 'unit-count') {
      pushCand(frac(0, a.n + 1, d), 'off-by-one');
      pushCand(frac(0, a.n - 1, d), 'off-by-one');
    } else if (kind === 'add-proper' || kind === 'sum-one' || kind === 'sum-over') {
      pushCand(frac(0, a.n + b.n, a.d + b.d), 'add-denominators');
      if (kind !== 'add-proper') pushCand(frac(0, a.n + b.n, d), 'keep-improper');
    } else if (kind === 'sub-proper') {
      if (a.n + b.n < d) pushCand(frac(0, a.n + b.n, d), 'add-instead');
    } else if (kind === 'mixed-add-proper' || kind === 'mixed-add') {
      pushCand(frac(a.w + b.w, a.n + b.n, a.d + b.d), 'add-denominators');
    } else if (kind === 'mixed-add-carry') {
      pushCand(frac(a.w + b.w, a.n + b.n, d), 'no-carry-normalize');
      pushCand(frac(a.w + b.w, a.n + b.n, a.d + b.d), 'add-denominators');
    } else if (kind === 'one-minus' || kind === 'whole-minus') {
      pushCand(frac(a.w - 1, b.n, d), 'whole-only');
      pushCand(frac(a.w, d - b.n, d), 'no-whole-decrement');
    } else if (kind === 'mixed-sub-borrow') {
      pushCand(frac(a.w - b.w, b.n - a.n, d), 'reverse-subtract');
      pushCand(frac(a.w - 1 - b.w, a.n + 10 - b.n, d), 'borrow-ten');
    } else if (kind === 'whole-minus-mixed') {
      pushCand(frac(a.w - b.w, d - b.n, d), 'no-whole-decrement');
      pushCand(frac(a.w - b.w, b.n, d), 'whole-only');
    }

    for (i = 0; i < cands.length && out.length < 2; i++) {
      tryAdd(cands[i].value, cands[i].mistake);
    }

    var delta, up, dn;
    for (delta = 1; out.length < 2 && delta < ans.d; delta++) {
      up = ans.n + delta;
      if (up >= 1 && up < ans.d) tryAdd(frac(ans.w, up, ans.d), 'off-by-one');
      dn = ans.n - delta;
      if (dn >= 1 && dn < ans.d) tryAdd(frac(ans.w, dn, ans.d), 'off-by-one');
    }
    // 분모가 작아 분자만으로 못 채우면 자연수 부분을 ±1 (예: 답 3분의 1 → 1과 3분의 1)
    if (out.length < 2) tryAdd(frac(ans.w + 1, ans.n, ans.d), 'off-by-one');
    if (out.length < 2 && ans.w >= 1) tryAdd(frac(ans.w - 1, ans.n, ans.d), 'off-by-one');
    return out;
  }

  function problemKey(p) {
    var bStr = p.b ? (p.b.w + '/' + p.b.n + '/' + p.b.d) : 'null';
    return p.kind + '|' + p.a.w + '/' + p.a.n + '/' + p.a.d + '|' + bStr;
  }

  function makeUniqueProblem(kind, rng, seen) {
    var t, p = null, key;
    for (t = 0; t < 200; t++) {
      p = makeProblem(kind, rng);
      key = problemKey(p);
      if (!seen[key]) { seen[key] = true; return p; }
    }
    return p;
  }

  function makeRound(lab, rng) {
    var kinds = LAB_KINDS[lab];
    if (!kinds) throw new Error('알 수 없는 관 번호: ' + lab);
    var round = [], seen = {}, i;
    for (i = 0; i < kinds.length; i++) {
      round.push(makeUniqueProblem(kinds[i], rng, seen));
    }
    return round;
  }

  function makeMixedRound(rng, n) {
    var count = (n === undefined || n === null) ? 10 : n;
    var round = [], seen = {}, kindCount = {}, avail, i, k, t, idx;
    for (i = 0; i < count; i++) {
      avail = [];
      for (t = 0; t < KIND_ORDER.length; t++) {
        k = KIND_ORDER[t];
        if ((kindCount[k] || 0) < 3) avail.push(k);
      }
      if (avail.length === 0) avail = KIND_ORDER;
      idx = randInt(0, avail.length - 1, rng);
      k = avail[idx];
      kindCount[k] = (kindCount[k] || 0) + 1;
      round.push(makeUniqueProblem(k, rng, seen));
    }
    round.sort(function (x, y) { return KIND_INDEX[x.kind] - KIND_INDEX[y.kind]; });
    return round;
  }

  global.FractionCore = {
    LAB_KINDS: LAB_KINDS,
    KIND_ORDER: KIND_ORDER,
    randInt: randInt,
    toImproper: toImproper,
    toMixed: toMixed,
    equals: equals,
    add: add,
    sub: sub,
    needsCarry: needsCarry,
    needsBorrow: needsBorrow,
    split: split,
    label: label,
    makeProblem: makeProblem,
    wrongChoices: wrongChoices,
    makeRound: makeRound,
    makeMixedRound: makeMixedRound
  };
})(typeof window !== 'undefined' ? window : globalThis);
