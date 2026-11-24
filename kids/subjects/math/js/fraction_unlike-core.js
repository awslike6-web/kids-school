// 초등 5학년 1학기 분모가 다른 분수의 덧셈과 뺄셈 순수 계산 모듈
(function (global) {
  'use strict';

  var LAB_KINDS = {
    1: ['add-proper', 'add-proper', 'add-proper-reduce'],
    2: ['add-over', 'add-over', 'add-over-reduce'],
    3: ['mixed-add', 'mixed-add', 'mixed-add-carry'],
    4: ['sub-proper', 'sub-proper', 'sub-proper-reduce'],
    5: ['mixed-sub', 'mixed-sub', 'mixed-sub-reduce'],
    6: ['mixed-sub-borrow', 'mixed-sub-borrow', 'mixed-sub-borrow']
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

  var MIXED_KINDS = KIND_ORDER.slice();

  var KIND_INDEX = (function () {
    var map = {}, i;
    for (i = 0; i < KIND_ORDER.length; i++) map[KIND_ORDER[i]] = i;
    return map;
  })();

  function frac(w, n, d) {
    return { w: w, n: n, d: d };
  }

  function needsCarry(a, b) {
    var c = global.FracReduceCore.toCommon(a, b);
    return c.a.n + c.b.n >= c.d;
  }

  function needsBorrow(a, b) {
    var c = global.FracReduceCore.toCommon(a, b);
    return c.a.n < c.b.n;
  }

  function addUnlike(a, b) {
    var reduce = global.FracReduceCore;
    var common = reduce.toCommon(a, b);
    var d = common.d;
    var sumN = common.a.n + common.b.n;
    var carry = Math.floor(sumN / d);
    var raw = frac(common.a.w + common.b.w + carry, sumN % d, d);
    var answer = reduce.simplify(raw);
    return {
      common: common,
      raw: raw,
      split: null,
      answer: answer
    };
  }

  function subUnlike(a, b) {
    var reduce = global.FracReduceCore;
    var common = reduce.toCommon(a, b);
    var d = common.d;
    var totalA = common.a.w * d + common.a.n;
    var totalB = common.b.w * d + common.b.n;
    if (totalA - totalB <= 0) {
      throw new Error('뺄셈 결과는 0보다 커야 합니다');
    }
    var borrow = common.a.n < common.b.n;
    var split = borrow ? frac(common.a.w - 1, common.a.n + d, d) : null;
    var raw = borrow
      ? frac(common.a.w - 1 - common.b.w, common.a.n + d - common.b.n, d)
      : frac(common.a.w - common.b.w, common.a.n - common.b.n, d);
    var answer = reduce.simplify(raw);
    return {
      common: common,
      raw: raw,
      split: split,
      answer: answer
    };
  }

  var baseFracPairs = null;
  var poolCache = {};

  function getBaseFracPairs() {
    if (baseFracPairs) return baseFracPairs;
    var reduce = global.FracReduceCore;
    var simples = [], d, n, i, j, f1, f2, commonD;
    for (d = 2; d <= 12; d++) {
      for (n = 1; n < d; n++) {
        if (reduce.gcd(n, d) === 1) {
          simples.push(frac(0, n, d));
        }
      }
    }
    baseFracPairs = [];
    for (i = 0; i < simples.length; i++) {
      f1 = simples[i];
      for (j = 0; j < simples.length; j++) {
        f2 = simples[j];
        if (f1.d === f2.d) continue;
        commonD = reduce.lcm(f1.d, f2.d);
        if (commonD <= 24) {
          baseFracPairs.push({ a: f1, b: f2, d: commonD });
        }
      }
    }
    return baseFracPairs;
  }

  function buildProblem(kind, a, b) {
    var op = kind.indexOf('sub') !== -1 ? '-' : '+';
    var res = op === '+' ? addUnlike(a, b) : subUnlike(a, b);
    return {
      kind: kind,
      op: op,
      a: frac(a.w, a.n, a.d),
      b: frac(b.w, b.n, b.d),
      common: res.common,
      raw: res.raw,
      split: res.split,
      answer: res.answer,
      answerText: global.FractionCore.token(res.answer)
    };
  }

  function buildPool(kind) {
    var reduce = global.FracReduceCore;
    var pairs = getBaseFracPairs();
    var pool = [], i, p, a, b, res, aw, bw;

    if (kind === 'add-proper' || kind === 'add-proper-reduce' ||
        kind === 'add-over' || kind === 'add-over-reduce') {
      for (i = 0; i < pairs.length; i++) {
        p = pairs[i];
        res = addUnlike(p.a, p.b);
        if (kind === 'add-proper' || kind === 'add-proper-reduce') {
          if (res.raw.w !== 0 || res.raw.n <= 0) continue;
        } else {
          if (res.raw.w !== 1 || res.raw.n <= 0) continue;
        }
        var wantReduceAdd = (kind === 'add-proper-reduce' || kind === 'add-over-reduce');
        if (wantReduceAdd === !reduce.isSimplest(res.raw)) {
          pool.push({ a: p.a, b: p.b });
        }
      }
    } else if (kind === 'mixed-add' || kind === 'mixed-add-carry') {
      for (i = 0; i < pairs.length; i++) {
        p = pairs[i];
        res = addUnlike(p.a, p.b);
        if (kind === 'mixed-add') {
          if (res.raw.w !== 0 || !reduce.isSimplest(res.raw)) continue;
        } else {
          if (res.raw.w < 1 || res.raw.n < 1 || !reduce.isSimplest(res.raw)) continue;
        }
        for (aw = 1; aw <= 4; aw++) {
          for (bw = 1; bw <= 4; bw++) {
            pool.push({ a: frac(aw, p.a.n, p.a.d), b: frac(bw, p.b.n, p.b.d) });
          }
        }
      }
    } else if (kind === 'sub-proper' || kind === 'sub-proper-reduce') {
      for (i = 0; i < pairs.length; i++) {
        p = pairs[i];
        a = p.a; b = p.b;
        if (a.n * b.d <= b.n * a.d) continue;
        res = subUnlike(a, b);
        var wantReduceSub = (kind === 'sub-proper-reduce');
        if (wantReduceSub === !reduce.isSimplest(res.raw)) {
          pool.push({ a: a, b: b });
        }
      }
    } else if (kind === 'mixed-sub' || kind === 'mixed-sub-reduce') {
      for (i = 0; i < pairs.length; i++) {
        p = pairs[i];
        a = p.a; b = p.b;
        if (a.n * b.d <= b.n * a.d) continue;
        res = subUnlike(a, b);
        if (res.raw.n < 1) continue;
        var wantReduceMixedSub = (kind === 'mixed-sub-reduce');
        if (wantReduceMixedSub !== !reduce.isSimplest(res.raw)) continue;
        for (aw = 2; aw <= 5; aw++) {
          for (bw = 1; bw < aw; bw++) {
            pool.push({ a: frac(aw, a.n, a.d), b: frac(bw, b.n, b.d) });
          }
        }
      }
    } else if (kind === 'mixed-sub-borrow') {
      for (i = 0; i < pairs.length; i++) {
        p = pairs[i];
        a = p.a; b = p.b;
        if (a.n * b.d >= b.n * a.d) continue;
        res = subUnlike(frac(2, a.n, a.d), frac(1, b.n, b.d));
        if (res.raw.n < 1 || !reduce.isSimplest(res.raw)) continue;
        for (aw = 3; aw <= 5; aw++) {
          for (bw = 1; bw <= aw - 2; bw++) {
            pool.push({ a: frac(aw, a.n, a.d), b: frac(bw, b.n, b.d) });
          }
        }
      }
    } else {
      throw new Error('알 수 없는 문제 종류: ' + kind);
    }

    if (pool.length === 0) {
      throw new Error('문제 후보 풀이 비었습니다: ' + kind);
    }
    return pool;
  }

  function getPool(kind) {
    if (!KIND_INDEX.hasOwnProperty(kind)) {
      throw new Error('알 수 없는 문제 종류: ' + kind);
    }
    if (!poolCache[kind]) {
      poolCache[kind] = buildPool(kind);
    }
    return poolCache[kind];
  }

  function makeProblem(kind, rng) {
    var pool = getPool(kind);
    var idx = global.FractionCore.randInt(0, pool.length - 1, rng);
    var picked = pool[idx];
    return buildProblem(kind, picked.a, picked.b);
  }

  function wrongChoices(p) {
    var fc = global.FractionCore;
    var reduce = global.FracReduceCore;
    var kind = p.kind, a = p.a, b = p.b, ans = p.answer;
    var d = p.common.d;
    var ansText = p.answerText;
    var out = [], used = {}, cands = [], i;

    function pushCand(v, mistake) {
      if (v) cands.push({ value: v, mistake: mistake });
    }

    function tryAdd(v, mistake) {
      if (out.length >= 2 || !v || v.w < 0 || v.n < 0 || v.d < 1) return;
      if (v.w * v.d + v.n <= 0) return;
      var t = fc.token(v);
      if (t === ansText || used[t]) return;
      used[t] = true;
      out.push({ value: v, token: t, mistake: mistake });
    }

    function addAcrossCand() {
      if (p.op === '+') {
        var sumN = a.n + b.n, sumD = a.d + b.d;
        if (sumN < sumD) return frac(a.w + b.w, sumN, sumD);
        return null;
      }
      var diffN = a.n - b.n, diffD = a.d - b.d;
      if (diffN > 0 && diffD > 0 && diffN < diffD && a.w >= b.w) {
        return frac(a.w - b.w, diffN, diffD);
      }
      return null;
    }

    function numUnscaledCand() {
      if (p.op === '+') {
        return reduce.simplify(fc.toMixed(frac(a.w + b.w, a.n + b.n, d)));
      }
      var diff = (a.w * d + a.n) - (b.w * d + b.n);
      if (diff > 0) {
        return reduce.simplify(fc.toMixed(frac(0, diff, d)));
      }
      return null;
    }

    if (kind === 'add-proper' || kind === 'add-proper-reduce' ||
        kind === 'add-over' || kind === 'add-over-reduce') {
      if (kind === 'add-proper-reduce' || kind === 'add-over-reduce') {
        pushCand(frac(p.raw.w, p.raw.n, p.raw.d), 'not-reduced');
      }
      pushCand(addAcrossCand(), 'add-across');
      pushCand(numUnscaledCand(), 'num-unscaled');
      if (kind === 'add-over' || kind === 'add-over-reduce') {
        pushCand(frac(0, p.raw.w * p.raw.d + p.raw.n, p.raw.d), 'keep-improper');
      }
    } else if (kind === 'mixed-add') {
      pushCand(addAcrossCand(), 'add-across');
      pushCand(numUnscaledCand(), 'num-unscaled');
    } else if (kind === 'mixed-add-carry') {
      pushCand(frac(a.w + b.w, p.common.a.n + p.common.b.n - d, d), 'carry-lost');
      pushCand(addAcrossCand(), 'add-across');
    } else if (kind === 'sub-proper' || kind === 'sub-proper-reduce' ||
               kind === 'mixed-sub' || kind === 'mixed-sub-reduce') {
      if (kind === 'sub-proper-reduce' || kind === 'mixed-sub-reduce') {
        pushCand(frac(p.raw.w, p.raw.n, p.raw.d), 'not-reduced');
      }
      pushCand(numUnscaledCand(), 'num-unscaled');
      pushCand(addAcrossCand(), 'add-across');
    } else if (kind === 'mixed-sub-borrow') {
      pushCand(frac(ans.w + 1, ans.n, ans.d), 'borrow-kept');
      pushCand(frac(a.w - b.w, p.common.b.n - p.common.a.n, d), 'reverse-sub');
      var tenNum = (p.common.a.n + 10) - p.common.b.n;
      if (tenNum > 0 && tenNum < d) {
        pushCand(frac(a.w - 1 - b.w, tenNum, d), 'borrow-ten');
      }
    }

    for (i = 0; i < cands.length && out.length < 2; i++) {
      tryAdd(cands[i].value, cands[i].mistake);
    }

    var delta, up, dn;
    for (delta = 1; out.length < 2 && delta < ans.d; delta++) {
      up = ans.n + delta;
      if (up >= 1 && up < ans.d) tryAdd(frac(ans.w, up, ans.d), 'nudge');
      dn = ans.n - delta;
      if (dn >= 1 && dn < ans.d) tryAdd(frac(ans.w, dn, ans.d), 'nudge');
    }
    if (out.length < 2) tryAdd(frac(ans.w + 1, ans.n, ans.d), 'nudge');
    if (out.length < 2 && ans.w >= 1) tryAdd(frac(ans.w - 1, ans.n, ans.d), 'nudge');
    if (out.length < 2) tryAdd(frac(ans.w, 1, ans.d + 1), 'nudge');
    if (out.length < 2) tryAdd(frac(ans.w, 2, ans.d + 1), 'nudge');
    return out;
  }

  function fracStr(f) {
    return f.w + '/' + f.n + '/' + f.d;
  }

  function problemKey(kind, op, a, b) {
    var sa = fracStr(a), sb = fracStr(b);
    if (op === '+' && sa > sb) {
      return kind + '|' + sb + '|' + sa;
    }
    return kind + '|' + sa + '|' + sb;
  }

  function makeUniqueProblem(kind, rng, seen) {
    var pool = getPool(kind);
    var op = kind.indexOf('sub') !== -1 ? '-' : '+';
    var idx = global.FractionCore.randInt(0, pool.length - 1, rng);
    var picked = pool[idx];
    var key = problemKey(kind, op, picked.a, picked.b);
    if (!seen[key]) {
      seen[key] = true;
      return buildProblem(kind, picked.a, picked.b);
    }
    var unseen = [], i, item, k;
    for (i = 0; i < pool.length; i++) {
      item = pool[i];
      k = problemKey(kind, op, item.a, item.b);
      if (!seen[k]) unseen.push(item);
    }
    if (unseen.length > 0) {
      picked = unseen[global.FractionCore.randInt(0, unseen.length - 1, rng)];
      seen[problemKey(kind, op, picked.a, picked.b)] = true;
    }
    return buildProblem(kind, picked.a, picked.b);
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
      for (t = 0; t < MIXED_KINDS.length; t++) {
        k = MIXED_KINDS[t];
        if ((kindCount[k] || 0) < 3) avail.push(k);
      }
      if (avail.length === 0) avail = MIXED_KINDS;
      idx = global.FractionCore.randInt(0, avail.length - 1, rng);
      k = avail[idx];
      kindCount[k] = (kindCount[k] || 0) + 1;
      round.push(makeUniqueProblem(k, rng, seen));
    }
    round.sort(function (x, y) { return KIND_INDEX[x.kind] - KIND_INDEX[y.kind]; });
    return round;
  }

  global.FracUnlikeCore = {
    LAB_KINDS: LAB_KINDS,
    KIND_ORDER: KIND_ORDER,
    MIXED_KINDS: MIXED_KINDS,
    addUnlike: addUnlike,
    subUnlike: subUnlike,
    needsCarry: needsCarry,
    needsBorrow: needsBorrow,
    makeProblem: makeProblem,
    wrongChoices: wrongChoices,
    makeRound: makeRound,
    makeMixedRound: makeMixedRound
  };
})(typeof window !== 'undefined' ? window : globalThis);
