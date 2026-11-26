// 초등 2학년 2학기 '1. 네 자리 수' 순수 계산 모듈 (FourDigitCore, docs/math_2-2_four_digit_spec.md)
(function (global) {
  'use strict';

  var KO_DIGITS = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
  var NO_BATCHIM = { 2: true, 4: true, 5: true, 9: true };
  var PLACES = ['th', 'h', 't', 'o'];
  var UNIT = { th: '천', h: '백', t: '십', o: '' };
  var STEP = { th: 1000, h: 100, t: 10, o: 1 };
  var MIN = 1000;
  var MAX = 9999;
  var LAB_KINDS = {
    1: ['hundred-tens', 'nine99-plus-one', 'thousand-is-hundreds'],
    2: ['thousands', 'thousands', 'thousands'],
    3: ['listen-build', 'listen-write', 'see-read'],
    4: ['place-th', 'place-mid', 'expand'],
    5: ['jump-1000', 'jump-small', 'compare']
  };
  var KIND_ORDER = [
    'hundred-tens', 'nine99-plus-one', 'thousand-is-hundreds', 'thousands', 'listen-build', 'listen-write',
    'see-read', 'place-th', 'place-mid', 'expand', 'jump-1000', 'jump-small', 'compare'
  ];
  var MIXED_KINDS = ['thousands', 'listen-write', 'see-read', 'place-th', 'place-mid', 'expand', 'jump-1000', 'jump-small', 'compare'];
  var BINGO_KINDS = ['thousands', 'place-th', 'place-mid', 'expand', 'jump-1000', 'jump-small'];
  var MAX_TRIES = 200;
  var fallbackSeed = 987654321;

  function nextFallback() {
    fallbackSeed = (fallbackSeed * 1664525 + 1013904223) >>> 0;
    return fallbackSeed / 4294967296;
  }

  // [lo, hi] 양 끝 포함 정수 난수
  function randInt(lo, hi, rng) {
    var r = typeof rng === 'function' ? rng() : nextFallback();
    var idx = Math.floor(r * (hi - lo + 1));
    if (idx < 0) idx = 0;
    if (idx > hi - lo) idx = hi - lo;
    return lo + idx;
  }

  // 천·백·십·일 자리 숫자 분리
  function digits(n) {
    var v = Math.floor(n);
    return { th: Math.floor(v / 1000) % 10, h: Math.floor(v / 100) % 10, t: Math.floor(v / 10) % 10, o: v % 10 };
  }

  function fromDigits(d) {
    return (d.th | 0) * 1000 + (d.h | 0) * 100 + (d.t | 0) * 10 + (d.o | 0);
  }

  // 자리('th'|'h'|'t'|'o')의 자릿값
  function placeValue(n, place) {
    return digits(n)[place] * STEP[place];
  }

  function zeroCount(d, places) {
    var c = 0;
    for (var i = 0; i < places.length; i++) if (d[places[i]] === 0) c++;
    return c;
  }

  // 0을 한 자리 뒤로 밀어 쓴 수 (3045 → 3405, 5008 → 5800, 1105 → 1150). 가운데 0이 없으면 null
  function shiftZero(n) {
    var d = digits(n), keys = ['h', 't', 'o'], i, j, tmp;
    for (i = 0; i < 2; i++) {
      if (d[keys[i]] !== 0) continue;
      for (j = i + 1; j < 3; j++) {
        if (d[keys[j]] !== 0) {
          tmp = d[keys[i]]; d[keys[i]] = d[keys[j]]; d[keys[j]] = tmp;
          return fromDigits(d);
        }
      }
    }
    return null;
  }

  // 1~9999 한자어 읽기 (천·백·십 앞의 1은 읽지 않고, 0인 자리는 읽지 않는다)
  function readKo(n) {
    var d = digits(n), out = '', i, p;
    for (i = 0; i < PLACES.length; i++) {
      p = PLACES[i];
      if (d[p] === 0) continue;
      out += (p !== 'o' && d[p] === 1 ? '' : KO_DIGITS[d[p]]) + UNIT[p];
    }
    return out;
  }

  // 흔한 읽기 실수 (해당 없으면 null)
  function readKoWrong(n, mistake) {
    var d = digits(n), out = '', i, p, rest;
    if (mistake === 'read-one-prefix') {
      if (d.th !== 1 && d.h !== 1 && d.t !== 1) return null;
      for (i = 0; i < PLACES.length; i++) {
        p = PLACES[i];
        if (d[p] !== 0) out += KO_DIGITS[d[p]] + UNIT[p];
      }
      return out;
    }
    if (mistake === 'read-zero') {
      // 0인 자리가 백·십·일 중 딱 하나일 때만 「영」을 넣어 읽는 실수
      if (zeroCount(d, ['h', 't', 'o']) !== 1) return null;
      for (i = 0; i < PLACES.length; i++) {
        p = PLACES[i];
        if (d[p] === 0) out += '영';
        else out += (p !== 'o' && d[p] === 1 ? '' : KO_DIGITS[d[p]]) + UNIT[p];
      }
      return out;
    }
    if (mistake === 'read-shift-zero') {
      // 0인 자리를 한 칸 뒤로 밀어 읽는 실수 (3045 → 삼천사백오)
      rest = shiftZero(n);
      return rest === null ? null : readKo(rest);
    }
    if (mistake === 'read-drop-ones-one') {
      // 일의 자리 1까지 빼고 읽는 실수 (2301 → 이천삼백)
      return d.o === 1 ? readKo(n - 1) : null;
    }
    if (mistake === 'read-skip-place') {
      // 0인 자리를 빼고 남은 숫자를 붙여 읽는 실수 (3045 → 345 → 삼백사십오)
      if (zeroCount(d, ['h', 't', 'o']) === 0) return null;
      rest = '';
      for (i = 0; i < PLACES.length; i++) if (d[PLACES[i]] !== 0) rest += String(d[PLACES[i]]);
      return readKo(Number(rest));
    }
    return null;
  }

  function pickWithRetry(tryFn, fallback) {
    for (var i = 0; i < MAX_TRIES; i++) {
      var res = tryFn();
      if (res !== null) return res;
    }
    return fallback;
  }

  // 0 없는 서로 다른 네 숫자
  function pickDistinctNoZero(rng) {
    return pickWithRetry(function () {
      var a = randInt(1, 9, rng), b = randInt(1, 9, rng), c = randInt(1, 9, rng), e = randInt(1, 9, rng);
      if (a !== b && a !== c && a !== e && b !== c && b !== e && c !== e) return a * 1000 + b * 100 + c * 10 + e;
      return null;
    }, 5376);
  }

  // 덧셈식 「3000 + 500 + 7」의 항 (0인 자리는 빠짐)
  function expandTerms(n) {
    var d = digits(n), out = [], i, p;
    for (i = 0; i < PLACES.length; i++) {
      p = PLACES[i];
      if (d[p] !== 0) out.push(d[p] * STEP[p]);
    }
    return out;
  }

  // 문제 유형별 생성
  function makeProblem(kind, rng) {
    var n, d, place, ans, start, step, cross, a, b;
    if (kind === 'hundred-tens') return { kind: kind, start: randInt(6, 8, rng), answer: 1000, answerText: '1000' };
    if (kind === 'nine99-plus-one') {
      // 999 + 1 · 990 + 10 · 900 + 100 (모두 1000이 되는 길)
      var v = [[999, 1, 'o'], [990, 10, 't'], [900, 100, 'h']][randInt(0, 2, rng)];
      return { kind: kind, n: v[0], step: v[1], place: v[2], answer: 1000, answerText: '1000' };
    }
    if (kind === 'thousand-is-hundreds') return { kind: kind, answer: 10, answerText: '10개' };
    if (kind === 'thousands') {
      var th = randInt(2, 9, rng);
      n = th * 1000;
      return { kind: kind, th: th, n: n, answer: n, answerText: String(n), reading: readKo(n) };
    }
    if (kind === 'listen-build') {
      n = pickWithRetry(function () {
        var dd = { th: randInt(1, 3, rng), h: randInt(0, 3, rng), t: randInt(0, 3, rng), o: randInt(0, 3, rng) };
        if (zeroCount(dd, ['h', 't', 'o']) > 1) return null;
        if (dd.th + dd.h + dd.t + dd.o > 8) return null;
        return fromDigits(dd);
      }, 2312);
      return { kind: kind, n: n, answer: n, answerText: String(n), reading: readKo(n) };
    }
    if (kind === 'listen-write') {
      n = pickWithRetry(function () {
        var dd = { th: randInt(1, 9, rng), h: randInt(0, 9, rng), t: randInt(0, 9, rng), o: randInt(1, 9, rng) };
        if (dd.h !== 0 && dd.t !== 0) return null;
        return fromDigits(dd);
      }, 3045);
      return { kind: kind, n: n, answer: n, answerText: String(n), reading: readKo(n) };
    }
    if (kind === 'see-read') {
      n = pickWithRetry(function () {
        var dd = { th: randInt(1, 9, rng), h: randInt(0, 9, rng), t: randInt(0, 9, rng), o: randInt(0, 9, rng) };
        var hasOne = dd.th === 1 || dd.h === 1 || dd.t === 1;
        var midZero = dd.h === 0 || dd.t === 0;
        if (!hasOne && !midZero) return null;
        if (dd.h === 0 && dd.t === 0 && dd.o === 0) return null;
        return fromDigits(dd);
      }, 1105);
      ans = readKo(n);
      return { kind: kind, n: n, answer: ans, answerText: ans };
    }
    if (kind === 'place-th' || kind === 'place-mid') {
      place = kind === 'place-th' ? 'th' : (randInt(0, 1, rng) === 0 ? 'h' : 't');
      n = pickDistinctNoZero(rng);
      d = digits(n);
      ans = placeValue(n, place);
      return { kind: kind, n: n, place: place, digit: d[place], answer: ans, answerText: String(ans) };
    }
    if (kind === 'expand') {
      n = pickWithRetry(function () {
        var dd = { th: randInt(1, 9, rng), h: randInt(1, 9, rng), t: randInt(1, 9, rng), o: randInt(1, 9, rng) };
        dd[['h', 't', 'o'][randInt(0, 2, rng)]] = 0;
        var v = fromDigits(dd);
        return v % 1000 === 0 ? null : v;
      }, 3507);
      return { kind: kind, n: n, terms: expandTerms(n), answer: n, answerText: String(n) };
    }
    if (kind === 'jump-1000') {
      start = randInt(1000, 8999, rng);
      return { kind: kind, start: start, step: 1000, answer: start + 1000, answerText: String(start + 1000) };
    }
    if (kind === 'jump-small') {
      step = [100, 10, 1][randInt(0, 2, rng)];
      cross = randInt(0, 1, rng) === 0;
      start = pickWithRetry(function () {
        var dd = { th: randInt(1, 8, rng), h: randInt(0, 9, rng), t: randInt(0, 9, rng), o: randInt(0, 9, rng) };
        var p = step === 100 ? 'h' : (step === 10 ? 't' : 'o');
        if (cross) dd[p] = 9;
        else if (dd[p] === 9) return null;
        var s = fromDigits(dd);
        return s + step <= MAX ? s : null;
      }, step === 100 ? 2950 : (step === 10 ? 4990 : 3999));
      return { kind: kind, start: start, step: step, cross: cross, answer: start + step, answerText: String(start + step) };
    }
    if (kind === 'compare') {
      var sameTh = randInt(0, 1, rng) === 0;
      var trap = sameTh && randInt(0, 1, rng) === 0;
      if (!sameTh && randInt(0, 1, rng) === 0) {
        // 9가 많은 쪽이 커 보이는 함정: 3987 ○ 4012
        var bt = randInt(1, 8, rng);
        a = bt * 1000 + randInt(900, 999, rng);
        b = (bt + 1) * 1000 + randInt(0, 99, rng);
        if (randInt(0, 1, rng) === 0) { var sw = a; a = b; b = sw; }
        return { kind: kind, a: a, b: b, nines: true, answer: a > b ? '>' : '<', answerText: a > b ? '>' : '<' };
      }
      var pair = pickWithRetry(function () {
        var x = randInt(MIN, MAX, rng);
        var dx = digits(x);
        var y = sameTh ? dx.th * 1000 + randInt(0, 999, rng) : randInt(MIN, MAX, rng);
        if (x === y || y < MIN) return null;
        var dy = digits(y);
        if (!sameTh && dx.th === dy.th) return null;
        if (trap && !((x < y && dx.o > dy.o && dx.t >= dy.t) || (x > y && dx.o < dy.o && dx.t <= dy.t))) return null;
        return { a: x, b: y };
      }, trap ? { a: 3289, b: 3302 } : (sameTh ? { a: 4521, b: 4376 } : { a: 2980, b: 3015 }));
      a = pair.a;
      b = pair.b;
      ans = a > b ? '>' : '<';
      return { kind: kind, a: a, b: b, answer: ans, answerText: ans };
    }
    return makeProblem('thousands', rng);
  }

  function pushChoice(list, answerText, value, text, mistake) {
    if (list.length >= 2 || text === answerText) return;
    // 1만 이상은 내지 않는다. 다만 「2000312」처럼 자리마다 따로 쓴 글자(write-each-place)는 쓰기 실수 그 자체라 둔다
    if (typeof value === 'number' && (value < 1 || (value >= 10000 && mistake !== 'write-each-place'))) return;
    for (var i = 0; i < list.length; i++) if (list[i].text === text) return;
    list.push({ value: value, text: text, mistake: mistake });
  }

  function fillNumericChoices(list, answer, answerText) {
    var deltas = [1, -1, 2, -2, 10, -10, 100, -100];
    for (var i = 0; i < deltas.length && list.length < 2; i++) {
      var v = answer + deltas[i];
      pushChoice(list, answerText, v, String(v), 'off-by-one');
    }
  }

  // 문제 유형별 오답 2개 (1만 이상은 내지 않는다)
  function wrongChoices(p) {
    var list = [], d, txt, val, i, other;
    if (p.kind === 'hundred-tens') {
      pushChoice(list, p.answerText, 100, '100', 'place-ignore');
      pushChoice(list, p.answerText, 10, '10', 'count-only');
    } else if (p.kind === 'nine99-plus-one') {
      var NW = { 999: [9910, 1001], 990: [9100, 1100], 900: [9100, 910] }[p.n] || [9910, 1001];
      pushChoice(list, p.answerText, NW[0], String(NW[0]), 'write-each-place');
      pushChoice(list, p.answerText, NW[1], String(NW[1]), p.n === 900 ? 'wrong-step' : 'off-by-one');
    } else if (p.kind === 'thousand-is-hundreds') {
      pushChoice(list, p.answerText, 100, '100개', 'place-shift');
      pushChoice(list, p.answerText, 1, '1개', 'place-ignore');
    } else if (p.kind === 'thousands') {
      // 네 자리 수 오답을 하나 꼭 넣는다(자릿수만 보고 찍지 않게): 천 모형을 하나 더·덜 센 수
      pushChoice(list, p.answerText, p.th * 100, String(p.th * 100), 'place-shift');
      val = (p.th % 2 === 0 ? p.th + 1 : p.th - 1) * 1000;
      pushChoice(list, p.answerText, val, String(val), 'count-off');
    } else if (p.kind === 'listen-build' || p.kind === 'listen-write') {
      // 「이천삼백십이」를 듣고 2000을 먼저 쓰고 뒤를 붙이는 실수 (2000312, 300045)
      d = digits(p.n);
      if (p.kind === 'listen-write') {
        // 네 자리 실수(0을 밀어 씀) 하나 + 자리마다 따로 쓰기·0 빼기를 번갈아
        val = shiftZero(p.n);
        if (val !== null) pushChoice(list, p.answerText, val, String(val), 'write-shift-zero');
        if (p.n % 2 === 0) {
          txt = String(d.th * 1000) + String(p.n % 1000);
          pushChoice(list, p.answerText, Number(txt), txt, 'write-each-place');
        } else {
          txt = '';
          for (i = 0; i < PLACES.length; i++) if (d[PLACES[i]] !== 0) txt += String(d[PLACES[i]]);
          pushChoice(list, p.answerText, Number(txt), txt, 'write-drop-zero');
        }
      } else {
        txt = String(d.th * 1000) + String(p.n % 1000);
        pushChoice(list, p.answerText, Number(txt), txt, 'write-each-place');
      }
      if (p.kind === 'listen-build' && d.t !== d.o) {
        val = fromDigits({ th: d.th, h: d.h, t: d.o, o: d.t });
        pushChoice(list, p.answerText, val, String(val), 'swap-digits');
      }
      fillNumericChoices(list, p.answer, p.answerText);
    } else if (p.kind === 'see-read') {
      var mistakes = ['read-one-prefix', 'read-shift-zero', 'read-drop-ones-one', 'read-zero', 'read-skip-place'];
      for (i = 0; i < mistakes.length; i++) {
        txt = readKoWrong(p.n, mistakes[i]);
        if (txt) pushChoice(list, p.answerText, txt, txt, mistakes[i]);
      }
      var deltas = [1, -1, 10, -10, 100, -100];
      for (i = 0; i < deltas.length && list.length < 2; i++) {
        val = p.n + deltas[i];
        if (val >= MIN && val <= MAX) pushChoice(list, p.answerText, readKo(val), readKo(val), 'off-by-one');
      }
    } else if (p.kind === 'place-th' || p.kind === 'place-mid') {
      if (p.place === 'th') {
        // 천의 자리: 자리를 내린 값 + 수 전체(네 자리 오답) — 숫자 하나(5)는 너무 뻔해서 뺀다
        pushChoice(list, p.answerText, p.digit * 100, String(p.digit * 100), 'place-shift');
        pushChoice(list, p.answerText, p.n, String(p.n), 'whole-number');
      } else {
        pushChoice(list, p.answerText, p.digit, String(p.digit), 'place-ignore');
        val = p.digit * STEP[p.place] * 10;
        pushChoice(list, p.answerText, val, String(val), 'place-shift');
      }
    } else if (p.kind === 'expand') {
      d = digits(p.n);
      txt = '';
      for (i = 0; i < PLACES.length; i++) if (d[PLACES[i]] !== 0) txt += String(d[PLACES[i]]);
      pushChoice(list, p.answerText, Number(txt), txt, 'expand-drop-zero');
      // 0을 엉뚱한 자리에 넣는 실수: 0이 일의 자리가 아니면 끝에, 일의 자리면 십의 자리에
      val = d.o !== 0 ? Number(txt + '0') : Number(String(d.th) + '0' + txt.slice(1));
      pushChoice(list, p.answerText, val, String(val), 'expand-shift');
    } else if (p.kind === 'jump-1000') {
      pushChoice(list, p.answerText, p.start + 100, String(p.start + 100), 'wrong-step');
      if (p.start - 1000 >= MIN) pushChoice(list, p.answerText, p.start - 1000, String(p.start - 1000), 'wrong-direction');
      else pushChoice(list, p.answerText, p.start + 10, String(p.start + 10), 'wrong-step');
    } else if (p.kind === 'jump-small') {
      other = p.step === 1 ? 10 : (p.step === 10 ? 100 : 10);
      if (p.cross) {
        // 받아올림을 잊은 수: 2950 + 100 → 2050, 4990 + 10 → 4900, 3999 + 1 → 3990
        val = p.answer - p.step * 10;
        pushChoice(list, p.answerText, val, String(val), 'jump-boundary');
      }
      pushChoice(list, p.answerText, p.start + other, String(p.start + other), 'wrong-step');
      fillNumericChoices(list, p.answer, p.answerText);
    } else if (p.kind === 'compare') {
      var da = digits(p.a), db = digits(p.b);
      var opp = p.answer === '>' ? '<' : '>';
      var trap = p.nines || (p.a > p.b && da.o < db.o) || (p.a < p.b && da.o > db.o);
      pushChoice(list, p.answerText, opp, opp, trap ? 'compare-ones-first' : 'reverse');
      pushChoice(list, p.answerText, '=', '=', 'equal');
    }
    if (typeof p.answer === 'number') fillNumericChoices(list, p.answer, p.answerText);
    return list;
  }

  // 「이 수를 어떻게 읽어요?」 틀린 읽기 2개
  function wrongReadings(n) {
    var ans = readKo(n), list = [], i, d = digits(n);
    function add(t, m) {
      if (!t || t === ans || list.length >= 2) return;
      for (var k = 0; k < list.length; k++) if (list[k].text === t) return;
      list.push({ text: t, mistake: m });
    }
    if (n % 1000 === 0) {
      // 몇천은 자리를 내려 읽는 실수 「삼백·삼십」
      add((d.th === 1 ? '' : KO_DIGITS[d.th]) + '백', 'place-shift');
      add(readKo((d.th % 2 === 0 ? d.th + 1 : d.th - 1) * 1000), 'count-off');
      return list;
    }
    var mistakes = ['read-one-prefix', 'read-shift-zero', 'read-drop-ones-one', 'read-zero', 'read-skip-place'];
    for (i = 0; i < mistakes.length; i++) add(readKoWrong(n, mistakes[i]), mistakes[i]);
    var deltas = [1, -1, 10, -10];
    for (i = 0; i < deltas.length && list.length < 2; i++) {
      if (n + deltas[i] >= MIN && n + deltas[i] <= MAX) add(readKo(n + deltas[i]), 'off-by-one');
    }
    return list;
  }

  function problemKey(p) {
    if (p.kind === 'compare') return p.kind + ':' + p.a + ':' + p.b;
    if (p.kind === 'jump-1000' || p.kind === 'jump-small') return p.kind + ':' + p.start + ':' + p.step;
    if (p.n !== undefined) return p.kind + ':' + p.n;
    return p.kind + ':' + p.answerText;
  }

  function pickUniqueProblem(kind, rng, usedKeys) {
    var p = pickWithRetry(function () {
      var cand = makeProblem(kind, rng);
      return usedKeys[problemKey(cand)] ? null : cand;
    }, null);
    if (p !== null) return p;
    if (kind === 'thousands') {
      for (var th = 2; th <= 5; th++) {
        var tp = { kind: kind, th: th, n: th * 1000, answer: th * 1000, answerText: String(th * 1000), reading: readKo(th * 1000) };
        if (!usedKeys[problemKey(tp)]) return tp;
      }
    }
    return makeProblem(kind, rng);
  }

  // 관(1~5)별 3문제 한 판
  function makeRound(lab, rng) {
    var kinds = LAB_KINDS[lab] || LAB_KINDS[1], used = {}, out = [], i, p;
    for (i = 0; i < kinds.length; i++) {
      p = pickUniqueProblem(kinds[i], rng, used);
      used[problemKey(p)] = true;
      out.push(p);
    }
    return out;
  }

  // 섞어 n문제 (같은 종류 최대 2개, KIND_ORDER 차례)
  function makeMixedRound(rng, n) {
    var count = n == null ? 6 : n, counts = {}, used = {}, out = [], i, k, p;
    for (i = 0; i < count; i++) {
      k = pickWithRetry(function () {
        var cand = MIXED_KINDS[randInt(0, MIXED_KINDS.length - 1, rng)];
        return (counts[cand] || 0) < 2 ? cand : null;
      }, MIXED_KINDS[i % MIXED_KINDS.length]);
      counts[k] = (counts[k] || 0) + 1;
      p = pickUniqueProblem(k, rng, used);
      used[problemKey(p)] = true;
      out.push(p);
    }
    out.sort(function (x, y) { return KIND_ORDER.indexOf(x.kind) - KIND_ORDER.indexOf(y.kind); });
    return out;
  }

  // 숫자 뒤 조사: 끝소리가 받침 없는 숫자(2·4·5·9)면 앞 것, 아니면 뒤 것 (끝이 0이면 십·백·천 → 받침)
  function josaNum(v, withoutBatchim, withBatchim) {
    return v % 10 !== 0 && NO_BATCHIM[v % 10] ? withoutBatchim : withBatchim;
  }

  // 빙고 콜 문구
  function bingoCallText(p) {
    if (p.kind === 'thousands') return '1000이 ' + p.th + '개인 수';
    if (p.kind === 'place-th' || p.kind === 'place-mid') {
      return p.n + '에서 ' + p.digit + josaNum(p.digit, '가', '이') + ' 나타내는 수';
    }
    if (p.kind === 'expand') {
      var parts = [], i;
      for (i = 0; i < p.terms.length - 1; i++) parts.push(p.terms[i] + josaNum(p.terms[i], '와', '과'));
      var last = p.terms[p.terms.length - 1];
      return parts.join(' ') + ' ' + last + josaNum(last, '를', '을') + ' 더한 수';
    }
    return p.start + '보다 ' + p.step + ' 큰 수';
  }

  // 9칸 빙고 (답 9개가 서로 다름)
  function makeBingo(rng) {
    var usedAns = {}, out = [], i, p;
    for (i = 0; i < 9; i++) {
      p = pickWithRetry(function () {
        var cand = makeProblem(BINGO_KINDS[randInt(0, BINGO_KINDS.length - 1, rng)], rng);
        return usedAns[cand.answerText] ? null : cand;
      }, null);
      if (p === null) {
        p = pickWithRetry(function () {
          var cand = makeProblem('jump-1000', rng);
          return usedAns[cand.answerText] ? null : cand;
        }, makeProblem('jump-1000', rng));
      }
      usedAns[p.answerText] = true;
      p.call = bingoCallText(p);
      out.push(p);
    }
    return out;
  }

  // ---- 🔍 스무고개 ----
  function makeSecret(rng) {
    return randInt(MIN, MAX, rng);
  }

  function chipList() {
    var list = [], i;
    for (i = 2000; i <= 9000; i += 1000) list.push('gt:' + i);
    for (i = 1; i <= 9; i++) list.push('th:' + i);
    for (i = 0; i <= 9; i++) list.push('h:' + i);
    for (i = 0; i <= 9; i++) list.push('t:' + i);
    for (i = 0; i <= 9; i++) list.push('o:' + i);
    for (i = 1; i <= 8; i++) list.push('thg:' + i);
    for (i = 0; i <= 8; i++) list.push('hg:' + i);
    for (i = 0; i <= 8; i++) list.push('tg:' + i);
    for (i = 0; i <= 8; i++) list.push('og:' + i);
    list.push('even');
    return list;
  }

  var CHIP_PLACE = { th: '천', h: '백', t: '십', o: '일' };

  function chipParts(id) {
    var idx = id.indexOf(':');
    var head = id.slice(0, idx);
    var cmp = head.length > 1 && head.charAt(head.length - 1) === 'g' && head !== 'th';
    return { head: head, place: cmp ? head.slice(0, -1) : head, cmp: cmp, val: Number(id.slice(idx + 1)) };
  }

  function chipText(id) {
    if (id === 'even') return '짝수예요?';
    var c = chipParts(id);
    if (c.head === 'gt') return c.val + '보다 커요?';
    var name = CHIP_PLACE[c.place] + '의 자리가 ' + c.val;
    if (c.cmp) return name + '보다 커요?';
    return name + (NO_BATCHIM[c.val] ? '예요?' : '이에요?');
  }

  function chipAnswer(n, id) {
    if (id === 'even') return n % 2 === 0;
    var c = chipParts(id);
    if (c.head === 'gt') return n > c.val;
    var dg = digits(n)[c.place];
    return c.cmp ? dg > c.val : dg === c.val;
  }

  // 지금까지 질문·답과 맞는 1000~9999 후보 (오름차순)
  function candidates(asked) {
    var out = [], n, i, ok;
    for (n = MIN; n <= MAX; n++) {
      ok = true;
      for (i = 0; i < asked.length; i++) {
        if (chipAnswer(n, asked[i].id) !== asked[i].answer) { ok = false; break; }
      }
      if (ok) out.push(n);
    }
    return out;
  }

  global.FourDigitCore = {
    LAB_KINDS: LAB_KINDS,
    KIND_ORDER: KIND_ORDER,
    MIXED_KINDS: MIXED_KINDS,
    BINGO_KINDS: BINGO_KINDS,
    randInt: randInt,
    digits: digits,
    placeValue: placeValue,
    readKo: readKo,
    readKoWrong: readKoWrong,
    shiftZero: shiftZero,
    expandTerms: expandTerms,
    makeProblem: makeProblem,
    wrongChoices: wrongChoices,
    wrongReadings: wrongReadings,
    makeRound: makeRound,
    makeMixedRound: makeMixedRound,
    makeBingo: makeBingo,
    bingoCallText: bingoCallText,
    makeSecret: makeSecret,
    chipList: chipList,
    chipText: chipText,
    chipAnswer: chipAnswer,
    candidates: candidates
  };
})(typeof window !== 'undefined' ? window : globalThis);
