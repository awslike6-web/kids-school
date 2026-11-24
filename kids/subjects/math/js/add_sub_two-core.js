// 초등 2학년 1학기 두 자리 수 덧셈·뺄셈 순수 계산 모듈
(function (global) {
  'use strict';

  var MINUS = '\u2212';
  var BOX = '\u25A1';
  var MAX_TRIES = 200;

  var LAB_KINDS = {
    1: ['carry-2x1', 'carry-2x1', 'nocarry-2x1'],
    2: ['nocarry-2x2', 'carry-2x2', 'carry-2x2'],
    3: ['borrow-2x1', 'borrow-tens-x1', 'noborrow-2x1'],
    4: ['noborrow-2x2', 'borrow-2x2', 'borrow-2x2'],
    5: ['three-terms', 'relation', 'box-add']
  };

  // 1관부터 펼쳐 중복을 뺀 12개 유형 순서
  var KIND_ORDER = (function () {
    var out = [];
    var seen = {};
    var lab, list, i, k;
    for (lab = 1; lab <= 5; lab++) {
      list = LAB_KINDS[lab];
      for (i = 0; i < list.length; i++) {
        k = list[i];
        if (!seen[k]) {
          seen[k] = true;
          out.push(k);
        }
      }
    }
    return out;
  })();

  // 빙고용 유형 (relation 제외)
  var BINGO_KINDS = (function () {
    var out = [];
    var i;
    for (i = 0; i < KIND_ORDER.length; i++) {
      if (KIND_ORDER[i] !== 'relation') out.push(KIND_ORDER[i]);
    }
    return out;
  })();

  // rng 미전달 시 사용하는 결정적 난수기 (Math.random 미사용)
  var fallbackState = 135792468;
  function fallbackRng() {
    fallbackState = (fallbackState * 1664525 + 1013904223) % 4294967296;
    return fallbackState / 4294967296;
  }

  function pickRng(rng) {
    return typeof rng === 'function' ? rng : fallbackRng;
  }

  // lo 이상 hi 이하 정수 난수
  function randInt(lo, hi, rng) {
    var r = pickRng(rng)();
    if (r < 0) r = 0;
    if (r >= 1) r = 0.999999999999;
    return lo + Math.floor(r * (hi - lo + 1));
  }

  function add(a, b) {
    return (a | 0) + (b | 0);
  }

  function sub(a, b) {
    return (a | 0) - (b | 0);
  }

  function tensOf(n) {
    return (n - (n % 10)) / 10;
  }

  function onesOf(n) {
    return n % 10;
  }

  function absInt(n) {
    return n < 0 ? -n : n;
  }

  function needsCarry(a, b) {
    return onesOf(a) + onesOf(b) >= 10;
  }

  function needsBorrow(a, b) {
    return onesOf(a) < onesOf(b);
  }

  function makeBinary(kind, op, a, b) {
    var ans = op === '+' ? add(a, b) : sub(a, b);
    return { kind: kind, op: op, a: a, b: b, answer: ans, answerText: String(ans) };
  }

  function makeThreeTermsObj(op2, a, b, c) {
    var mid = sub(a, b);
    var ans = op2 === '+' ? add(mid, c) : sub(mid, c);
    return { kind: 'three-terms', ops: [MINUS, op2], terms: [a, b, c], mid: mid, answer: ans, answerText: String(ans) };
  }

  function makeRelationObj(a, b) {
    var sum = add(a, b);
    return {
      kind: 'relation',
      a: a,
      b: b,
      sum: sum,
      answer: a,
      answerText: sum + ' ' + MINUS + ' ' + b + ' = ' + a
    };
  }

  function makeBoxAddObj(a, sum) {
    var ans = sub(sum, a);
    return { kind: 'box-add', a: a, sum: sum, answer: ans, answerText: String(ans) };
  }

  // 유형별 고정 예시 (최대 시도 초과 시 무한 루프 방지)
  function fallbackProblem(kind) {
    switch (kind) {
      case 'carry-2x1': return makeBinary(kind, '+', 27, 5);
      case 'nocarry-2x1': return makeBinary(kind, '+', 23, 4);
      case 'nocarry-2x2': return makeBinary(kind, '+', 23, 15);
      case 'carry-2x2': return makeBinary(kind, '+', 27, 15);
      case 'borrow-2x1': return makeBinary(kind, MINUS, 32, 5);
      case 'borrow-tens-x1': return makeBinary(kind, MINUS, 40, 6);
      case 'noborrow-2x1': return makeBinary(kind, MINUS, 38, 5);
      case 'noborrow-2x2': return makeBinary(kind, MINUS, 58, 23);
      case 'borrow-2x2': return makeBinary(kind, MINUS, 52, 27);
      case 'three-terms': return makeThreeTermsObj('+', 25, 13, 8);
      case 'relation': return makeRelationObj(15, 8);
      case 'box-add': return makeBoxAddObj(15, 23);
      default: return makeBinary('carry-2x1', '+', 27, 5);
    }
  }

  // 유형별 한 번 뽑기 (조건 불만족 시 null)
  function tryProblem(kind, r) {
    var a, b, c, op2, mid, ans, rtl, carryOrBorrow, sum;
    if (kind === 'carry-2x1') {
      a = randInt(11, 89, r);
      b = randInt(3, 6, r);
      return needsCarry(a, b) && a + b <= 99 ? makeBinary(kind, '+', a, b) : null;
    }
    if (kind === 'nocarry-2x1') {
      a = randInt(10, 97, r);
      b = randInt(2, 6, r);
      return !needsCarry(a, b) && a + b <= 99 ? makeBinary(kind, '+', a, b) : null;
    }
    if (kind === 'nocarry-2x2') {
      a = randInt(10, 89, r);
      b = randInt(10, 89, r);
      return !needsCarry(a, b) && a + b <= 99 ? makeBinary(kind, '+', a, b) : null;
    }
    if (kind === 'carry-2x2') {
      a = randInt(10, 89, r);
      b = randInt(10, 89, r);
      return needsCarry(a, b) && a + b <= 99 ? makeBinary(kind, '+', a, b) : null;
    }
    if (kind === 'borrow-2x1') {
      a = randInt(21, 99, r);
      b = randInt(3, 6, r);
      return onesOf(a) >= 1 && needsBorrow(a, b) && a - b >= 10 ? makeBinary(kind, MINUS, a, b) : null;
    }
    if (kind === 'borrow-tens-x1') {
      a = randInt(2, 9, r) * 10;
      b = randInt(2, 8, r);
      return a - b >= 10 ? makeBinary(kind, MINUS, a, b) : null;
    }
    if (kind === 'noborrow-2x1') {
      a = randInt(12, 99, r);
      b = randInt(2, 6, r);
      return !needsBorrow(a, b) && a - b >= 10 ? makeBinary(kind, MINUS, a, b) : null;
    }
    if (kind === 'noborrow-2x2') {
      b = randInt(10, 89, r);
      a = randInt(b + 10, 99, r);
      return a > b && !needsBorrow(a, b) && tensOf(a - b) >= 1 ? makeBinary(kind, MINUS, a, b) : null;
    }
    if (kind === 'borrow-2x2') {
      b = randInt(10, 89, r);
      a = randInt(b + 10, 99, r);
      return a > b && needsBorrow(a, b) && a - b >= 10 ? makeBinary(kind, MINUS, a, b) : null;
    }
    if (kind === 'three-terms') {
      a = randInt(20, 99, r);
      b = randInt(2, 30, r);
      c = randInt(2, 30, r);
      mid = a - b;
      if (mid < 1 || mid > 99) return null;
      op2 = randInt(0, 1, r) === 0 ? '+' : MINUS;
      ans = op2 === '+' ? mid + c : mid - c;
      if (ans < 1 || ans > 99) return null;
      carryOrBorrow = (needsBorrow(a, b) ? 1 : 0) + (op2 === '+' ? (needsCarry(mid, c) ? 1 : 0) : (needsBorrow(mid, c) ? 1 : 0));
      if (carryOrBorrow > 1) return null;
      // 뺄셈이 두 번이면 b > c여야 "뒤에서부터(b − c 먼저)" 실수가 실제로 생길 수 있다 (10 − 13은 아이가 못 함)
      if (op2 === MINUS && b <= c) return null;
      rtl = op2 === '+' ? a - (b + c) : a - (b - c);
      return rtl !== ans ? makeThreeTermsObj(op2, a, b, c) : null;
    }
    if (kind === 'relation') {
      a = randInt(10, 89, r);
      b = randInt(2, 9, r);
      return a + b <= 99 ? makeRelationObj(a, b) : null;
    }
    if (kind === 'box-add') {
      a = randInt(10, 89, r);
      c = randInt(2, 30, r);
      sum = a + c;
      return sum <= 99 ? makeBoxAddObj(a, sum) : null;
    }
    return null;
  }

  function makeProblem(kind, rng) {
    var r = pickRng(rng);
    var i, p;
    for (i = 0; i < MAX_TRIES; i++) {
      p = tryProblem(kind, r);
      if (p) return p;
    }
    return fallbackProblem(kind);
  }

  function exprText(p) {
    if (p.kind === 'three-terms') {
      return p.terms[0] + ' ' + p.ops[0] + ' ' + p.terms[1] + ' ' + p.ops[1] + ' ' + p.terms[2];
    }
    if (p.kind === 'relation') {
      return p.a + ' + ' + p.b + ' = ' + p.sum;
    }
    if (p.kind === 'box-add') {
      return p.a + ' + ' + BOX + ' = ' + p.sum;
    }
    return p.a + ' ' + p.op + ' ' + p.b;
  }

  function bingoCall(p) {
    return exprText(p);
  }

  function speakText(p) {
    var s = exprText(p);
    s = s.replace(/\+/g, ' 더하기 ');
    s = s.replace(/\u2212/g, ' 빼기 ');
    s = s.replace(/=/g, ' 는 ');
    s = s.replace(/\u25A1/g, ' 네모 ');
    return s.replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '');
  }

  // 오답 2개 생성 (중복·정답·1 미만 값 방지 및 보정)
  function wrongChoices(p) {
    var out = [];
    var used = {};
    used[p.answerText] = true;

    function pushChoice(value, text, mistake) {
      if (out.length >= 2) return;
      if (typeof value !== 'number' || value < 1) return;
      var t = text != null ? String(text) : String(value);
      if (used[t]) return;
      used[t] = true;
      out.push({ value: value, text: t, mistake: mistake });
    }

    var k = p.kind;
    var ws, rtl, altB, d, val;
    if (k === 'carry-2x1' || k === 'carry-2x2') {
      pushChoice(p.answer - 10, null, 'no-carry');
      ws = String(tensOf(p.a) + tensOf(p.b)) + String(onesOf(p.a) + onesOf(p.b));
      pushChoice(Number(ws), ws, 'write-sum');
    } else if (k === 'nocarry-2x1' || k === 'nocarry-2x2') {
      pushChoice(p.answer + 10, null, 'over-carry');
    } else if (k === 'borrow-2x1' || k === 'borrow-2x2') {
      val = absInt(tensOf(p.a) - tensOf(p.b)) * 10 + absInt(onesOf(p.a) - onesOf(p.b));
      pushChoice(val, null, 'reverse-subtract');
      pushChoice(p.answer + 10, null, 'no-borrow-tens');
    } else if (k === 'borrow-tens-x1') {
      pushChoice(tensOf(p.a) * 10 + p.b, null, 'zero-passthrough');
      pushChoice(p.answer + 10, null, 'no-borrow-tens');
    } else if (k === 'noborrow-2x1' || k === 'noborrow-2x2') {
      pushChoice(p.answer - 10, null, 'over-borrow');
    } else if (k === 'three-terms') {
      rtl = p.ops[1] === '+' ? p.terms[0] - (p.terms[1] + p.terms[2]) : p.terms[0] - (p.terms[1] - p.terms[2]);
      pushChoice(rtl, null, 'right-to-left');
    } else if (k === 'relation') {
      if (p.a > p.b) {
        pushChoice(p.a - p.b, p.a + ' ' + MINUS + ' ' + p.b + ' = ' + (p.a - p.b), 'mix-terms');
      }
      pushChoice(p.sum + p.b, p.sum + ' + ' + p.b + ' = ' + (p.sum + p.b), 'wrong-op');
      for (altB = 2; altB <= 9 && out.length < 2; altB++) {
        if (altB !== p.b && p.sum - altB >= 1) {
          pushChoice(p.sum - altB, p.sum + ' ' + MINUS + ' ' + altB + ' = ' + (p.sum - altB), 'off-by-one');
        }
      }
    } else if (k === 'box-add') {
      pushChoice(p.sum + p.a, null, 'box-add');
    }

    for (d = 1; out.length < 2; d++) {
      pushChoice(p.answer + d, null, 'off-by-one');
      if (out.length < 2) pushChoice(p.answer - d, null, 'off-by-one');
    }
    return out;
  }

  function problemKey(p) {
    return p.kind + '|' + exprText(p);
  }

  function makeUniqueProblem(kind, seenKeys, r) {
    var i, p, key;
    for (i = 0; i < MAX_TRIES; i++) {
      p = makeProblem(kind, r);
      key = problemKey(p);
      if (!seenKeys[key]) {
        seenKeys[key] = true;
        return p;
      }
    }
    p = makeProblem(kind, r);
    seenKeys[problemKey(p)] = true;
    return p;
  }

  // 관별 3문제 라운드 (중복 없음)
  function makeRound(lab, rng) {
    var r = pickRng(rng);
    var kinds = LAB_KINDS[lab] || LAB_KINDS[1];
    var out = [];
    var seen = {};
    var i;
    for (i = 0; i < kinds.length; i++) {
      out.push(makeUniqueProblem(kinds[i], seen, r));
    }
    return out;
  }

  // 전체 유형에서 n문제 혼합 라운드 (유형별 최대 2개, KIND_ORDER 정렬, 중복 없음)
  function makeMixedRound(rng, n) {
    var count = n == null ? 6 : n;
    var r = pickRng(rng);
    var counts = {};
    var chosenKinds = [];
    var i, k, pool, idx;
    for (i = 0; i < count; i++) {
      pool = [];
      for (idx = 0; idx < KIND_ORDER.length; idx++) {
        k = KIND_ORDER[idx];
        if ((counts[k] || 0) < 2) pool.push(k);
      }
      if (pool.length === 0) pool = KIND_ORDER;
      k = pool[randInt(0, pool.length - 1, r)];
      counts[k] = (counts[k] || 0) + 1;
      chosenKinds.push(k);
    }
    chosenKinds.sort(function (a, b) {
      return KIND_ORDER.indexOf(a) - KIND_ORDER.indexOf(b);
    });
    var seen = {};
    var out = [];
    for (i = 0; i < chosenKinds.length; i++) {
      out.push(makeUniqueProblem(chosenKinds[i], seen, r));
    }
    return out;
  }

  // 빙고용 9문제 (answerText 9개 모두 다름, call 포함)
  function makeBingo(rng) {
    var r = pickRng(rng);
    var out = [];
    var usedAns = {};
    var i, t, kind, p;
    for (i = 0; i < 9; i++) {
      p = null;
      for (t = 0; t < MAX_TRIES; t++) {
        kind = BINGO_KINDS[randInt(0, BINGO_KINDS.length - 1, r)];
        p = makeProblem(kind, r);
        if (!usedAns[p.answerText]) break;
        p = null;
      }
      if (!p) {
        for (t = 0; t < BINGO_KINDS.length && !p; t++) {
          var cand = makeProblem(BINGO_KINDS[t], r);
          if (!usedAns[cand.answerText]) p = cand;
        }
      }
      if (!p) p = makeProblem(BINGO_KINDS[i % BINGO_KINDS.length], r);
      usedAns[p.answerText] = true;
      p.call = bingoCall(p);
      out.push(p);
    }
    return out;
  }

  global.TwoDigitCore = {
    LAB_KINDS: LAB_KINDS,
    KIND_ORDER: KIND_ORDER,
    BINGO_KINDS: BINGO_KINDS,
    randInt: randInt,
    add: add,
    sub: sub,
    needsCarry: needsCarry,
    needsBorrow: needsBorrow,
    makeProblem: makeProblem,
    exprText: exprText,
    bingoCall: bingoCall,
    speakText: speakText,
    wrongChoices: wrongChoices,
    makeRound: makeRound,
    makeMixedRound: makeMixedRound,
    makeBingo: makeBingo
  };
})(typeof window !== 'undefined' ? window : globalThis);
