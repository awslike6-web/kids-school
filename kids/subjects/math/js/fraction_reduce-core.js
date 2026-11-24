// 초등 5학년 1학기 약분과 통분 순수 계산 모듈
(function (global) {
  'use strict';

  var FC = global.FractionCore;

  var LAB_KINDS = {
    1: ['equiv-split', 'equiv-up', 'equiv-up'],
    2: ['reduce-by-2', 'reduce-by-3', 'reduce-which'],
    3: ['simplest-1', 'simplest-2', 'simplest-pick'],
    4: ['common-multiple', 'common-coprime', 'common-lcm'],
    5: ['compare-same-num', 'compare-unlike', 'compare-unlike'],
    6: ['to-decimal-10', 'to-decimal-100', 'compare-decimal']
  };

  var KIND_ORDER = (function () {
    var seen = {}, order = [], lab, list, i, k;
    for (lab = 1; lab <= 6; lab++) {
      list = LAB_KINDS[lab];
      for (i = 0; i < list.length; i++) {
        k = list[i];
        if (!seen[k]) {
          seen[k] = true;
          if (k === 'simplest-pick') order.push('simplest-choose');
          order.push(k);
        }
      }
    }
    return order;
  })();

  var MIXED_KINDS = (function () {
    var out = [], i, k;
    for (i = 0; i < KIND_ORDER.length; i++) {
      k = KIND_ORDER[i];
      if (k !== 'equiv-split' && k !== 'simplest-1' && k !== 'simplest-2') {
        out.push(k);
      }
    }
    return out;
  })();

  var KIND_INDEX = (function () {
    var map = {}, i;
    for (i = 0; i < KIND_ORDER.length; i++) map[KIND_ORDER[i]] = i;
    return map;
  })();

  function frac(w, n, d) {
    return { w: w, n: n, d: d };
  }

  function gcd(a, b) {
    var t;
    a = Math.abs(a);
    b = Math.abs(b);
    while (b !== 0) {
      t = a % b;
      a = b;
      b = t;
    }
    return a;
  }

  function lcm(a, b) {
    return (a / gcd(a, b)) * b;
  }

  function isSimplest(f) {
    if (f.n === 0) return true;
    if (f.n >= f.d) return false;
    return gcd(f.n, f.d) === 1;
  }

  function simplify(f) {
    var m = FC.toMixed(f);
    if (m.n === 0) return frac(m.w, 0, 1);
    var g = gcd(m.n, m.d);
    return frac(m.w, m.n / g, m.d / g);
  }

  function reduceBy(f, k) {
    if (k < 1 || f.n % k !== 0 || f.d % k !== 0) {
      throw new Error('분자와 분모를 모두 나눌 수 없습니다: ' + k);
    }
    return frac(f.w || 0, f.n / k, f.d / k);
  }

  function divideSteps(f) {
    var primes = [2, 3, 5, 7];
    var cur = frac(f.w || 0, f.n, f.d);
    var steps = [], i, p, found;
    while (true) {
      found = false;
      for (i = 0; i < primes.length; i++) {
        p = primes[i];
        if (cur.n % p === 0 && cur.d % p === 0) {
          cur = reduceBy(cur, p);
          steps.push({ k: p, f: cur });
          found = true;
          break;
        }
      }
      if (!found) break;
    }
    if (!isSimplest(cur)) {
      throw new Error('2, 3, 5, 7로 기약분수까지 약분할 수 없습니다');
    }
    return steps;
  }

  function scale(f, k) {
    return frac(f.w || 0, f.n * k, f.d * k);
  }

  function commonDenominator(d1, d2) {
    if (d1 === d2) return { d: d1, chips: [d1] };
    var big = d1 > d2 ? d1 : d2;
    var small = d1 > d2 ? d2 : d1;
    var chips = [], m = big;
    while (true) {
      chips.push(m);
      if (m % small === 0) return { d: m, chips: chips };
      m += big;
    }
  }

  function toCommon(a, b) {
    var cd = commonDenominator(a.d, b.d);
    return { a: scale(a, cd.d / a.d), b: scale(b, cd.d / b.d), d: cd.d };
  }

  function compare(a, b) {
    var left = (a.w * a.d + a.n) * b.d;
    var right = (b.w * b.d + b.n) * a.d;
    if (left > right) return '>';
    if (left < right) return '<';
    return '=';
  }

  function toDecimal(f) {
    var k;
    if (10 % f.d === 0) k = 10 / f.d;
    else if (100 % f.d === 0) k = 100 / f.d;
    else throw new Error('10이나 100으로 바꿀 수 없는 분모입니다: ' + f.d);

    var scaled = scale(f, k);
    var fracStr = '';
    if (scaled.d === 10) {
      fracStr = String(scaled.n);
    } else {
      fracStr = scaled.n < 10 ? ('0' + scaled.n) : String(scaled.n);
    }
    var text = scaled.w + '.' + fracStr;
    text = text.replace(/0+$/, '').replace(/\.$/, '');
    var dot = text.indexOf('.');
    var places = dot === -1 ? 0 : (text.length - dot - 1);
    return { k: k, scaled: scaled, places: places, text: text };
  }

  function hasOnly2357(num) {
    var primes = [2, 3, 5, 7], i;
    for (i = 0; i < primes.length; i++) {
      while (num % primes[i] === 0) num = num / primes[i];
    }
    return num === 1;
  }

  function pairText(a, b) {
    return FC.token(a) + ', ' + FC.token(b);
  }

  function compareDecFrac(decStr, a) {
    var hundredths = Math.round(parseFloat(decStr) * 100);
    var left = hundredths * a.d;
    var right = (a.w * a.d + a.n) * 100;
    if (left > right) return '>';
    if (left < right) return '<';
    return '=';
  }

  var POOLS = {};

  function buildPool(kind) {
    var pool = [], d, n, k, a, b, cd, tc, steps, ans, target, i, j, c, common, nonCommon, unequal, equal, stride, dec, decs;

    if (kind === 'equiv-split') {
      for (d = 2; d <= 6; d++) {
        for (n = 1; n < d; n++) {
          if (gcd(n, d) !== 1) continue;
          a = frac(0, n, d);
          for (k = 2; k <= 4; k++) {
            if (d * k <= 24) {
              ans = scale(a, k);
              pool.push({ kind: kind, a: a, k: k, answer: ans, answerText: FC.token(ans) });
            }
          }
        }
      }
    } else if (kind === 'equiv-up') {
      for (d = 2; d <= 6; d++) {
        for (n = 1; n < d; n++) {
          if (gcd(n, d) !== 1) continue;
          a = frac(0, n, d);
          for (k = 2; k <= 4; k++) {
            target = d * k;
            if (target <= 24) {
              ans = scale(a, k);
              pool.push({ kind: kind, a: a, target: target, answer: ans, answerText: FC.token(ans) });
            }
          }
        }
      }
    } else if (kind === 'reduce-by-2' || kind === 'reduce-by-3') {
      k = kind === 'reduce-by-2' ? 2 : 3;
      for (d = k * 2; d <= 24; d += k) {
        if (!hasOnly2357(d)) continue;
        for (n = k; n < d; n += k) {
          if (!hasOnly2357(n)) continue;
          a = frac(0, n, d);
          ans = reduceBy(a, k);
          pool.push({ kind: kind, a: a, k: k, answer: ans, answerText: FC.token(ans) });
        }
      }
    } else if (kind === 'reduce-which') {
      for (d = 4; d <= 24; d++) {
        for (n = 2; n < d; n++) {
          common = [];
          nonCommon = [];
          for (c = 2; c <= 9; c++) {
            if (n % c === 0 && d % c === 0) common.push(c);
            else if (n % c === 0 || d % c === 0) nonCommon.push(c);
          }
          if (common.length >= 1 && nonCommon.length >= 2) {
            a = frac(0, n, d);
            for (i = 0; i < common.length; i++) {
              pool.push({ kind: kind, a: a, answer: common[i], answerText: String(common[i]) });
            }
          }
        }
      }
    } else if (kind === 'simplest-1' || kind === 'simplest-2' || kind === 'simplest-choose') {
      for (d = 4; d <= 24; d++) {
        if (!hasOnly2357(d)) continue;
        for (n = 2; n < d; n++) {
          if (gcd(n, d) === 1 || !hasOnly2357(n)) continue;
          a = frac(0, n, d);
          steps = divideSteps(a);
          if (kind === 'simplest-1' && steps.length !== 1) continue;
          if (kind === 'simplest-2' && steps.length < 2) continue;
          ans = simplify(a);
          pool.push({ kind: kind, a: a, steps: steps, answer: ans, answerText: FC.token(ans) });
        }
      }
    } else if (kind === 'simplest-pick') {
      for (d = 4; d <= 12; d++) {
        for (n = 1; n < d; n++) {
          if (gcd(n, d) === 1) {
            ans = frac(0, n, d);
            pool.push({ kind: kind, answer: ans, answerText: FC.token(ans) });
          }
        }
      }
    } else if (kind === 'common-multiple' || kind === 'common-coprime' || kind === 'common-lcm') {
      var simpList = [];
      for (d = 2; d <= 12; d++) {
        for (n = 1; n < d; n++) {
          if (gcd(n, d) === 1) simpList.push(frac(0, n, d));
        }
      }
      for (i = 0; i < simpList.length; i++) {
        for (j = 0; j < simpList.length; j++) {
          a = simpList[i];
          b = simpList[j];
          if (a.d === b.d) continue;
          cd = commonDenominator(a.d, b.d);
          if (cd.d > 24) continue;
          var isMult = (a.d > b.d ? a.d % b.d : b.d % a.d) === 0;
          var isCop = gcd(a.d, b.d) === 1;
          if (kind === 'common-multiple' && !isMult) continue;
          if (kind === 'common-coprime' && !isCop) continue;
          if (kind === 'common-lcm' && (isMult || isCop)) continue;
          tc = toCommon(a, b);
          ans = { a: tc.a, b: tc.b };
          pool.push({
            kind: kind, a: a, b: b, d: cd.d, chips: cd.chips,
            answer: ans, answerText: pairText(ans.a, ans.b)
          });
        }
      }
    } else if (kind === 'compare-same-num') {
      for (n = 1; n <= 11; n++) {
        for (i = n + 1; i <= 12; i++) {
          if (gcd(n, i) !== 1) continue;
          for (j = n + 1; j <= 12; j++) {
            if (i === j || gcd(n, j) !== 1) continue;
            cd = commonDenominator(i, j);
            if (cd.d > 24) continue;
            a = frac(0, n, i);
            b = frac(0, n, j);
            ans = compare(a, b);
            pool.push({ kind: kind, a: a, b: b, common: toCommon(a, b), answer: ans, answerText: ans });
          }
        }
      }
    } else if (kind === 'compare-unlike') {
      var propList = [];
      unequal = [];
      equal = [];
      for (d = 2; d <= 12; d++) {
        for (n = 1; n < d; n++) if (gcd(n, d) === 1) propList.push(frac(0, n, d));
      }
      for (i = 0; i < propList.length; i++) {
        for (j = 0; j < propList.length; j++) {
          a = propList[i];
          b = propList[j];
          if (a.d === b.d) continue;
          cd = commonDenominator(a.d, b.d);
          if (cd.d > 24) continue;
          ans = compare(a, b);
          if (ans !== '=') {
            unequal.push({ kind: kind, a: a, b: b, common: toCommon(a, b), answer: ans, answerText: ans });
          }
        }
      }
      for (d = 2; d <= 12; d++) {
        for (n = 1; n < d; n++) {
          if (gcd(n, d) !== 1) continue;
          a = frac(0, n, d);
          for (k = 2; d * k <= 24; k++) {
            b = scale(a, k);
            equal.push({ kind: kind, a: a, b: b, common: toCommon(a, b), answer: '=', answerText: '=' });
            equal.push({ kind: kind, a: b, b: a, common: toCommon(b, a), answer: '=', answerText: '=' });
          }
        }
      }
      stride = Math.max(1, Math.floor(unequal.length / (equal.length * 5)));
      for (i = 0; i < unequal.length; i += stride) pool.push(unequal[i]);
      for (i = 0; i < equal.length; i++) pool.push(equal[i]);
    } else if (kind === 'to-decimal-10') {
      var ds10 = [2, 5], w;
      for (i = 0; i < ds10.length; i++) {
        d = ds10[i];
        for (n = 1; n < d; n++) {
          if (gcd(n, d) !== 1) continue;
          for (w = 0; w <= 3; w++) {
            a = frac(w, n, d);
            dec = toDecimal(a);
            pool.push({ kind: kind, a: a, dec: dec, answer: dec.text, answerText: dec.text });
          }
        }
      }
    } else if (kind === 'to-decimal-100') {
      var ds100 = [4, 20, 25, 50];
      for (i = 0; i < ds100.length; i++) {
        d = ds100[i];
        for (n = 1; n < d; n++) {
          if (gcd(n, d) !== 1) continue;
          a = frac(0, n, d);
          dec = toDecimal(a);
          if (dec.places === 2) {
            pool.push({ kind: kind, a: a, dec: dec, answer: dec.text, answerText: dec.text });
          }
        }
      }
    } else if (kind === 'compare-decimal') {
      var dsCmp = [2, 4, 5];
      decs = ['0.1', '0.2', '0.25', '0.3', '0.4', '0.5', '0.6', '0.7', '0.75', '0.8', '0.9'];
      unequal = [];
      equal = [];
      for (i = 0; i < dsCmp.length; i++) {
        d = dsCmp[i];
        for (n = 1; n < d; n++) {
          if (gcd(n, d) !== 1) continue;
          a = frac(0, n, d);
          for (j = 0; j < decs.length; j++) {
            ans = compareDecFrac(decs[j], a);
            var item = { kind: kind, a: a, dec: decs[j], decValue: parseFloat(decs[j]), answer: ans, answerText: ans };
            if (ans === '=') equal.push(item);
            else unequal.push(item);
          }
        }
      }
      stride = Math.max(1, Math.floor(unequal.length / (equal.length * 5)));
      for (i = 0; i < unequal.length; i += stride) pool.push(unequal[i]);
      for (i = 0; i < equal.length; i++) pool.push(equal[i]);
    } else {
      throw new Error('알 수 없는 문제 종류: ' + kind);
    }

    if (pool.length === 0) throw new Error('후보 풀이 비어 있습니다: ' + kind);
    return pool;
  }

  function getPool(kind) {
    if (!POOLS[kind]) POOLS[kind] = buildPool(kind);
    return POOLS[kind];
  }

  function makeProblem(kind, rng) {
    var pool = getPool(kind);
    return pool[FC.randInt(0, pool.length - 1, rng)];
  }

  function wrongChoices(p) {
    var kind = p.kind, ansText = p.answerText, out = [], used = {}, i, v, tok;

    function addChoice(val, t, mistake) {
      if (out.length >= 2 || !t || t === ansText || used[t]) return false;
      used[t] = true;
      out.push({ value: val, token: t, mistake: mistake });
      return true;
    }

    function addFrac(f, mistake) {
      if (!f || f.w < 0 || f.n < 0 || f.d < 1 || (f.w * f.d + f.n <= 0)) return false;
      return addChoice(f, FC.token(f), mistake);
    }

    if (kind === 'compare-same-num' || kind === 'compare-unlike' || kind === 'compare-decimal') {
      var ans = p.answer;
      if (ans === '=') {
        addChoice('>', '>', 'equal-wrong');
        addChoice('<', '<', 'equal-wrong');
      } else {
        var other = ans === '>' ? '<' : '>';
        var m = kind === 'compare-same-num' ? 'bigger-denom' : 'num-only-compare';
        addChoice(other, other, m);
        addChoice('=', '=', 'equal-wrong');
      }
      return out;
    }

    if (kind === 'equiv-split') {
      addFrac(frac(0, p.a.n + (p.k - 1), p.a.d + (p.k - 1)), 'add-same');
      addFrac(frac(0, p.a.n, p.a.d * p.k), 'denom-only');
    } else if (kind === 'equiv-up') {
      var addNum = p.a.n + (p.target - p.a.d);
      if (addNum < p.target) addFrac(frac(0, addNum, p.target), 'add-diff');
      addFrac(frac(0, p.a.n, p.target), 'denom-only');
    } else if (kind === 'reduce-by-2' || kind === 'reduce-by-3') {
      if (p.a.n - p.k >= 1 && p.a.d - p.k >= 1) {
        addFrac(frac(0, p.a.n - p.k, p.a.d - p.k), 'subtract');
      }
      addFrac(frac(0, p.a.n / p.k, p.a.d), 'num-only');
    } else if (kind === 'reduce-which') {
      for (i = 2; i <= 9 && out.length < 2; i++) {
        if ((p.a.n % i === 0) !== (p.a.d % i === 0)) {
          addChoice(i, String(i), 'not-common');
        }
      }
      return out;
    } else if (kind === 'simplest-1' || kind === 'simplest-2' || kind === 'simplest-choose') {
      if (p.steps.length >= 2) addFrac(p.steps[0].f, 'half-reduced');
      var sk = p.steps[0].k;
      if (p.a.n - sk >= 1 && p.a.d - sk >= 1) {
        addFrac(frac(0, p.a.n - sk, p.a.d - sk), 'subtract');
      }
    } else if (kind === 'simplest-pick') {
      var d, n;
      for (d = 4; d <= 12 && out.length < 1; d++) {
        for (n = 2; n < d && n < p.answer.n && out.length < 1; n++) {
          if (gcd(n, d) > 1) addFrac(frac(0, n, d), 'small-num');
        }
      }
      for (d = 4; d <= 12 && out.length < 2; d++) {
        for (n = 2; n < d && out.length < 2; n++) {
          if (gcd(n, d) > 1) {
            addFrac(frac(0, n, d), out.length === 0 ? 'small-num' : 'half-reduced');
          }
        }
      }
      return out;
    } else if (kind === 'common-multiple' || kind === 'common-coprime' || kind === 'common-lcm') {
      v = { a: frac(0, p.a.n, p.d), b: frac(0, p.b.n, p.d) };
      addChoice(v, pairText(v.a, v.b), 'denom-swap');
      v = { a: frac(0, p.a.n, p.a.d + p.b.d), b: frac(0, p.b.n, p.a.d + p.b.d) };
      addChoice(v, pairText(v.a, v.b), 'denom-sum');
      for (i = 1; out.length < 2; i++) {
        var na = p.answer.a.n + i;
        if (na < p.d) {
          v = { a: frac(0, na, p.d), b: p.answer.b };
          addChoice(v, pairText(v.a, v.b), 'nudge');
        }
        var nb = p.answer.b.n + i;
        if (out.length < 2 && nb < p.d) {
          v = { a: p.answer.a, b: frac(0, nb, p.d) };
          addChoice(v, pairText(v.a, v.b), 'nudge');
        }
      }
      return out;
    } else if (kind === 'to-decimal-10' || kind === 'to-decimal-100') {
      tok = p.a.w + '.' + p.a.n + '' + p.a.d;
      addChoice(tok, tok, 'concat');
      if (p.dec.scaled.d === 100) {
        if (p.dec.scaled.n < 10) {
          tok = '0.' + p.dec.scaled.n;
          addChoice(tok, tok, 'drop-zero');
        } else {
          tok = Math.floor(p.dec.scaled.n / 10) + '.' + (p.dec.scaled.n % 10);
          addChoice(tok, tok, 'shift-place');
        }
      }
      var base = Math.round(parseFloat(ansText) * (p.dec.places === 2 ? 100 : 10));
      var div = p.dec.places === 2 ? 100 : 10;
      for (i = 1; out.length < 2; i++) {
        tok = String((base + i) / div);
        addChoice(tok, tok, 'nudge');
        if (out.length < 2 && base - i > 0) {
          tok = String((base - i) / div);
          addChoice(tok, tok, 'nudge');
        }
      }
      return out;
    }

    var delta;
    for (delta = 1; out.length < 2 && delta < p.answer.d; delta++) {
      if (p.answer.n + delta < p.answer.d) addFrac(frac(p.answer.w, p.answer.n + delta, p.answer.d), 'nudge');
      if (out.length < 2 && p.answer.n - delta >= 1) addFrac(frac(p.answer.w, p.answer.n - delta, p.answer.d), 'nudge');
    }
    for (delta = 1; out.length < 2; delta++) {
      addFrac(frac(p.answer.w, p.answer.n + delta, p.answer.d + delta), 'nudge');
    }
    return out;
  }

  function problemKey(p) {
    var k = p.kind, t1, t2;
    if (k === 'common-multiple' || k === 'common-coprime' || k === 'common-lcm' ||
        k === 'compare-same-num' || k === 'compare-unlike') {
      t1 = FC.token(p.a);
      t2 = FC.token(p.b);
      return k + '|' + (t1 <= t2 ? t1 + '|' + t2 : t2 + '|' + t1);
    }
    if (k === 'compare-decimal') return k + '|' + p.dec + '|' + FC.token(p.a);
    if (k === 'equiv-up') return k + '|' + FC.token(p.a) + '|' + p.target;
    if (k === 'equiv-split') return k + '|' + FC.token(p.a) + '|' + p.k;
    if (k === 'simplest-pick') return k + '|' + p.answerText;
    return k + '|' + FC.token(p.a);
  }

  function makeUniqueProblem(kind, rng, seen) {
    var t, p = null, key;
    for (t = 0; t < 200; t++) {
      p = makeProblem(kind, rng);
      key = problemKey(p);
      if (!seen[key]) {
        seen[key] = true;
        return p;
      }
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
    var round = [], seen = {}, kindCount = {}, avail, i, t, k;
    for (i = 0; i < count; i++) {
      avail = [];
      for (t = 0; t < MIXED_KINDS.length; t++) {
        k = MIXED_KINDS[t];
        if ((kindCount[k] || 0) < 3) avail.push(k);
      }
      if (avail.length === 0) avail = MIXED_KINDS;
      k = avail[FC.randInt(0, avail.length - 1, rng)];
      kindCount[k] = (kindCount[k] || 0) + 1;
      round.push(makeUniqueProblem(k, rng, seen));
    }
    round.sort(function (x, y) { return KIND_INDEX[x.kind] - KIND_INDEX[y.kind]; });
    return round;
  }

  global.FracReduceCore = {
    LAB_KINDS: LAB_KINDS,
    KIND_ORDER: KIND_ORDER,
    MIXED_KINDS: MIXED_KINDS,
    gcd: gcd,
    lcm: lcm,
    isSimplest: isSimplest,
    simplify: simplify,
    reduceBy: reduceBy,
    divideSteps: divideSteps,
    scale: scale,
    commonDenominator: commonDenominator,
    toCommon: toCommon,
    compare: compare,
    toDecimal: toDecimal,
    makeProblem: makeProblem,
    wrongChoices: wrongChoices,
    makeRound: makeRound,
    makeMixedRound: makeMixedRound
  };
})(typeof window !== 'undefined' ? window : globalThis);
