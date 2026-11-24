// 초등 2학년 1학기 '세 자리 수' 순수 계산 모듈
(function (global) {
  'use strict';

  var KO_DIGITS = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
  var NO_BATCHIM = { 2: true, 4: true, 5: true, 9: true };
  var LAB_KINDS = {
    1: ['ten-tens', 'ninety-nine-plus-one', 'hundred-is-tens'],
    2: ['hundreds', 'hundreds', 'hundreds'],
    3: ['listen-build', 'listen-write', 'see-read'],
    4: ['place-h', 'place-t', 'place-o'],
    5: ['jump-100', 'jump-10-or-1', 'compare']
  };
  var KIND_ORDER = [
    'ten-tens', 'ninety-nine-plus-one', 'hundred-is-tens', 'hundreds', 'listen-build', 'listen-write',
    'see-read', 'place-h', 'place-t', 'place-o', 'jump-100', 'jump-10-or-1', 'compare'
  ];
  var MIXED_KINDS = [
    'hundreds', 'listen-write', 'see-read', 'place-h', 'place-t', 'place-o', 'jump-100', 'jump-10-or-1', 'compare'
  ];
  var BINGO_KINDS = ['hundreds', 'place-h', 'place-t', 'place-o', 'jump-100', 'jump-10-or-1'];
  var MAX_TRIES = 200;
  var fallbackSeed = 123456789;

  // 난수 생성기 미전달 시 사용하는 정수 기반 보조 난수
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

  // 정수의 백·십·일 자리 숫자 분리
  function digits(n) {
    var h = (n - (n % 100)) / 100;
    var rem = n % 100;
    var t = (rem - (rem % 10)) / 10;
    var o = rem % 10;
    return { h: h, t: t, o: o };
  }

  // 자리('h'|'t'|'o')에 해당하는 자릿값 계산
  function placeValue(n, place) {
    var d = digits(n);
    if (place === 'h') return d.h * 100;
    if (place === 't') return d.t * 10;
    return d.o;
  }

  // 1~1000 한자어 읽기
  function readKo(n) {
    if (n === 1000) return '천';
    var d = digits(n);
    var out = '';
    if (d.h > 0) out += (d.h === 1 ? '' : KO_DIGITS[d.h]) + '백';
    if (d.t > 0) out += (d.t === 1 ? '' : KO_DIGITS[d.t]) + '십';
    if (d.o > 0) out += KO_DIGITS[d.o];
    return out;
  }

  // 흔한 읽기 오개념 생성 (해당 없으면 null)
  function readKoWrong(n, mistake) {
    var d = digits(n);
    if (mistake === 'read-one-prefix') {
      if (d.h !== 1 && d.t !== 1) return null;
      return (d.h > 0 ? KO_DIGITS[d.h] + '백' : '') + (d.t > 0 ? KO_DIGITS[d.t] + '십' : '') +
        (d.o > 0 ? KO_DIGITS[d.o] : '');
    }
    if (mistake === 'read-zero') {
      if (d.h === 0 || (d.t !== 0 && d.o !== 0)) return null;
      return (d.h === 1 ? '' : KO_DIGITS[d.h]) + '백' +
        (d.t === 0 ? '영' : (d.t === 1 ? '' : KO_DIGITS[d.t]) + '십') + (d.o === 0 ? '영' : KO_DIGITS[d.o]);
    }
    if (mistake === 'read-as-tens') {
      if (d.h === 0 || (d.t === 0 && d.o === 0) || (d.t !== 0 && d.o !== 0)) return null;
      return readKo(d.h * 10 + (d.t === 0 ? d.o : d.t));
    }
    return null;
  }

  // 조건 함수로 최대 200회 뽑고 실패 시 고정 예시 반환
  function pickWithRetry(tryFn, fallback) {
    for (var i = 0; i < MAX_TRIES; i++) {
      var res = tryFn();
      if (res !== null) return res;
    }
    return fallback;
  }

  // 서로 다른 세 자리(0 제외) 수 생성
  function pickDistinctDigitsNoZero(rng) {
    return pickWithRetry(function () {
      var h = randInt(1, 9, rng);
      var t = randInt(1, 9, rng);
      var o = randInt(1, 9, rng);
      if (h !== t && t !== o && h !== o) return h * 100 + t * 10 + o;
      return null;
    }, 352);
  }

  // 문제 유형별 생성
  function makeProblem(kind, rng) {
    var h, t, o, n, place, d, step, start, cross, a, b, da, db, ans;
    if (kind === 'ten-tens') return { kind: kind, start: 7, answer: 100, answerText: '100' };
    if (kind === 'ninety-nine-plus-one') return { kind: kind, n: 99, answer: 100, answerText: '100' };
    if (kind === 'hundred-is-tens') return { kind: kind, answer: 10, answerText: '10개' };
    if (kind === 'hundreds') {
      h = randInt(2, 5, rng);
      n = h * 100;
      return { kind: kind, h: h, n: n, answer: n, answerText: String(n), reading: readKo(n) };
    }
    if (kind === 'listen-build') {
      n = randInt(1, 4, rng) * 100 + randInt(1, 4, rng) * 10 + randInt(1, 4, rng);
      return { kind: kind, n: n, answer: n, answerText: String(n), reading: readKo(n) };
    }
    if (kind === 'listen-write') {
      n = randInt(1, 9, rng) * 100 + randInt(1, 9, rng);
      return { kind: kind, n: n, answer: n, answerText: String(n), reading: readKo(n) };
    }
    if (kind === 'see-read') {
      if (randInt(0, 1, rng) === 0) {
        n = randInt(1, 9, rng) * 100 + randInt(1, 9, rng) * 10;
      } else {
        n = pickWithRetry(function () {
          var hh = randInt(1, 9, rng), tt = randInt(0, 9, rng), oo = randInt(0, 9, rng);
          return (hh === 1 || tt === 1) ? hh * 100 + tt * 10 + oo : null;
        }, 213);
      }
      ans = readKo(n);
      return { kind: kind, n: n, answer: ans, answerText: ans };
    }
    if (kind === 'place-h' || kind === 'place-t' || kind === 'place-o') {
      place = kind.slice(6);
      n = pickDistinctDigitsNoZero(rng);
      d = digits(n);
      ans = placeValue(n, place);
      return { kind: kind, n: n, place: place, digit: d[place], answer: ans, answerText: String(ans) };
    }
    if (kind === 'jump-100') {
      start = randInt(100, 899, rng);
      ans = start + 100;
      return { kind: kind, start: start, step: 100, answer: ans, answerText: String(ans) };
    }
    if (kind === 'jump-10-or-1') {
      step = randInt(0, 1, rng) === 0 ? 10 : 1;
      cross = randInt(0, 1, rng) === 0;
      start = pickWithRetry(function () {
        var s;
        if (step === 10) {
          s = cross ? randInt(1, 8, rng) * 100 + 90 + randInt(0, 9, rng)
            : randInt(1, 9, rng) * 100 + randInt(0, 8, rng) * 10 + randInt(0, 9, rng);
        } else {
          s = cross ? randInt(1, 9, rng) * 100 + randInt(0, 9, rng) * 10 + 9
            : randInt(1, 9, rng) * 100 + randInt(0, 9, rng) * 10 + randInt(0, 8, rng);
        }
        return s + step <= 999 ? s : null;
      }, step === 10 ? 190 : 299);
      ans = start + step;
      return { kind: kind, start: start, step: step, answer: ans, answerText: String(ans) };
    }
    if (kind === 'compare') {
      var sameH = randInt(0, 1, rng) === 0;
      var onesTrap = sameH && randInt(0, 1, rng) === 0;
      var pair = pickWithRetry(function () {
        var x = randInt(100, 999, rng);
        var dx = digits(x);
        var y = sameH ? dx.h * 100 + randInt(0, 9, rng) * 10 + randInt(0, 9, rng) : randInt(100, 999, rng);
        if (x === y) return null;
        var dy = digits(y);
        if (onesTrap && !((x < y && dx.o > dy.o) || (x > y && dx.o < dy.o))) return null;
        return { a: x, b: y };
      }, onesTrap ? { a: 238, b: 252 } : (sameH ? { a: 342, b: 375 } : { a: 298, b: 302 }));
      a = pair.a;
      b = pair.b;
      ans = a > b ? '>' : '<';
      return { kind: kind, a: a, b: b, answer: ans, answerText: ans };
    }
    return makeProblem('hundreds', rng);
  }

  // 보기 배열에 중복·정답과 겹치지 않게 추가
  function pushChoice(list, answerText, value, text, mistake) {
    if (list.length >= 2 || text === answerText) return;
    for (var i = 0; i < list.length; i++) {
      if (list[i].text === text) return;
    }
    list.push({ value: value, text: text, mistake: mistake });
  }

  // 숫자 보기가 2개 미만일 때 off-by-one 보정
  function fillNumericChoices(list, answer, answerText) {
    var deltas = [1, -1, 2, -2, 3, -3, 10, -10];
    for (var i = 0; i < deltas.length && list.length < 2; i++) {
      var v = answer + deltas[i];
      if (v >= 1) pushChoice(list, answerText, v, String(v), 'off-by-one');
    }
  }

  // 문제 유형별 오답 2개 생성
  function wrongChoices(p) {
    var list = [], d, txt, val, i, deltas, cand, da, db, opp, trap;
    if (p.kind === 'ten-tens') {
      pushChoice(list, p.answerText, 1000, '1000', 'place-shift');
      pushChoice(list, p.answerText, 10, '10', 'place-ignore');
    } else if (p.kind === 'ninety-nine-plus-one') {
      pushChoice(list, p.answerText, 910, '910', 'write-each-place');
      pushChoice(list, p.answerText, 1000, '1000', 'place-shift');
    } else if (p.kind === 'hundred-is-tens') {
      pushChoice(list, p.answerText, 100, '100개', 'place-shift');
      pushChoice(list, p.answerText, 1, '1개', 'place-ignore');
    } else if (p.kind === 'hundreds') {
      pushChoice(list, p.answerText, p.h * 10, String(p.h * 10), 'place-shift');
      pushChoice(list, p.answerText, p.h * 1000, String(p.h * 1000), 'place-shift');
    } else if (p.kind === 'listen-build') {
      d = digits(p.n);
      txt = String(d.h * 100) + String(d.t * 10) + String(d.o);
      pushChoice(list, p.answerText, Number(txt), txt, 'write-each-place');
      val = d.h * 100 + d.o * 10 + d.t;
      if (val !== p.answer) pushChoice(list, p.answerText, val, String(val), 'swap-digits');
      fillNumericChoices(list, p.answer, p.answerText);
    } else if (p.kind === 'listen-write') {
      d = digits(p.n);
      txt = String(d.h * 100) + String(d.o);
      pushChoice(list, p.answerText, Number(txt), txt, 'write-each-place');
      val = d.h * 10 + d.o;
      pushChoice(list, p.answerText, val, String(val), 'write-drop-zero');
    } else if (p.kind === 'see-read') {
      var mistakes = ['read-one-prefix', 'read-zero', 'read-as-tens'];
      for (i = 0; i < mistakes.length; i++) {
        txt = readKoWrong(p.n, mistakes[i]);
        if (txt) pushChoice(list, p.answerText, txt, txt, mistakes[i]);
      }
      deltas = [1, -1, 2, -2, 10, -10];
      for (i = 0; i < deltas.length && list.length < 2; i++) {
        cand = p.n + deltas[i];
        if (cand >= 1 && cand <= 1000) {
          txt = readKo(cand);
          pushChoice(list, p.answerText, txt, txt, 'off-by-one');
        }
      }
    } else if (p.kind === 'place-h' || p.kind === 'place-t' || p.kind === 'place-o') {
      if (p.place === 'o') {
        // 일의 자리는 숫자 그대로가 곧 정답이라 "자릿값 무시" 오답이 없다 → 십·백 자리 값으로 높여 읽은 실수 두 개
        pushChoice(list, p.answerText, p.digit * 10, String(p.digit * 10), 'place-shift');
        pushChoice(list, p.answerText, p.digit * 100, String(p.digit * 100), 'place-shift');
      } else {
        pushChoice(list, p.answerText, p.digit, String(p.digit), 'place-ignore');
        val = p.place === 't' ? p.digit * 100 : p.digit * 10;
        pushChoice(list, p.answerText, val, String(val), 'place-shift');
      }
    } else if (p.kind === 'jump-100') {
      pushChoice(list, p.answerText, p.start + 10, String(p.start + 10), 'wrong-step');
      if (p.start - 100 >= 100) {
        pushChoice(list, p.answerText, p.start - 100, String(p.start - 100), 'wrong-direction');
      } else {
        pushChoice(list, p.answerText, p.start + 1, String(p.start + 1), 'wrong-step');
      }
    } else if (p.kind === 'jump-10-or-1') {
      d = digits(p.start);
      var isBoundary = (p.step === 10 && d.t === 9) || (p.step === 1 && d.o === 9);
      var otherStep = p.step === 10 ? 1 : 10;
      if (isBoundary) {
        txt = p.step === 10 ? String(d.h) + '10' + String(d.o) : String(d.h) + String(d.t) + '10';
        pushChoice(list, p.answerText, Number(txt), txt, 'jump-boundary');
        pushChoice(list, p.answerText, p.start + otherStep, String(p.start + otherStep), 'wrong-step');
      } else {
        pushChoice(list, p.answerText, p.start + otherStep, String(p.start + otherStep), 'wrong-step');
        fillNumericChoices(list, p.answer, p.answerText);
      }
    } else if (p.kind === 'compare') {
      da = digits(p.a);
      db = digits(p.b);
      opp = p.answer === '>' ? '<' : '>';
      trap = (p.a > p.b && da.o < db.o) || (p.a < p.b && da.o > db.o);
      pushChoice(list, p.answerText, opp, opp, trap ? 'compare-ones-first' : 'reverse');
      pushChoice(list, p.answerText, '=', '=', 'equal');
    }
    if (typeof p.answer === 'number') fillNumericChoices(list, p.answer, p.answerText);
    return list;
  }

  // 둘째 단계 "어떻게 읽어요?"용 틀린 읽기 2개 생성
  function wrongReadings(n) {
    var ans = readKo(n), list = [], mistakes = ['read-one-prefix', 'read-zero', 'read-as-tens'], i, txt, d;
    function add(t, m) {
      if (!t || t === ans || list.length >= 2) return;
      for (var k = 0; k < list.length; k++) {
        if (list[k].text === t) return;
      }
      list.push({ text: t, mistake: m });
    }
    // 몇백(300)은 "삼백영영" 같은 읽기를 아이가 하지 않는다 → 숫자 단계 오답(30·3000)과 같은 자리 실수 "삼십·삼천"
    if (n % 100 === 0 && n >= 100 && n <= 900) {
      d = digits(n);
      add((d.h === 1 ? '' : KO_DIGITS[d.h]) + '십', 'place-shift');
      add((d.h === 1 ? '' : KO_DIGITS[d.h]) + '천', 'place-shift');
      return list;
    }
    for (i = 0; i < mistakes.length; i++) add(readKoWrong(n, mistakes[i]), mistakes[i]);
    if (list.length < 2) {
      d = digits(n);
      if (d.h > 0) {
        txt = (d.h === 1 ? '' : KO_DIGITS[d.h]) + '십' + (d.t > 0 ? KO_DIGITS[d.t] : '') +
          (d.o > 0 ? KO_DIGITS[d.o] : '');
        add(txt, 'read-as-tens-like');
      }
    }
    if (list.length < 2) {
      d = digits(n);
      txt = (d.h > 0 ? KO_DIGITS[d.h] + '백' : '') + (d.t > 0 ? KO_DIGITS[d.t] + '십' : '') +
        (d.o > 0 ? KO_DIGITS[d.o] : '');
      add(txt, 'read-one-prefix');
    }
    var deltas = [1, -1, 2, -2];
    for (i = 0; i < deltas.length && list.length < 2; i++) {
      if (n + deltas[i] >= 1 && n + deltas[i] <= 1000) add(readKo(n + deltas[i]), 'off-by-one');
    }
    return list;
  }

  // 라운드 내 중복 판별용 핵심 키
  function problemKey(p) {
    if (p.kind === 'compare') return p.kind + ':' + p.a + ':' + p.b;
    if (p.kind === 'jump-100' || p.kind === 'jump-10-or-1') return p.kind + ':' + p.start + ':' + p.step;
    if (p.n !== undefined) return p.kind + ':' + p.n;
    return p.kind + ':' + p.answerText;
  }

  // 중복 없는 단일 문제 뽑기
  function pickUniqueProblem(kind, rng, usedKeys) {
    var p = pickWithRetry(function () {
      var cand = makeProblem(kind, rng);
      return usedKeys[problemKey(cand)] ? null : cand;
    }, null);
    if (p !== null) return p;
    if (kind === 'hundreds') {
      for (var h = 2; h <= 5; h++) {
        var hp = { kind: kind, h: h, n: h * 100, answer: h * 100, answerText: String(h * 100), reading: readKo(h * 100) };
        if (!usedKeys[problemKey(hp)]) return hp;
      }
    }
    return makeProblem(kind, rng);
  }

  // 관(1~5)별 3문제 라운드 생성
  function makeRound(lab, rng) {
    var kinds = LAB_KINDS[lab] || LAB_KINDS[1], used = {}, out = [], i, p;
    for (i = 0; i < kinds.length; i++) {
      p = pickUniqueProblem(kinds[i], rng, used);
      used[problemKey(p)] = true;
      out.push(p);
    }
    return out;
  }

  // 혼합 n문제 라운드 생성 (같은 종류 최대 2개, KIND_ORDER 정렬)
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
    out.sort(function (a, b) {
      return KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind);
    });
    return out;
  }

  // 빙고 콜 문구 생성
  function bingoCallText(p) {
    if (p.kind === 'hundreds') return '100이 ' + p.h + '개인 수';
    if (p.kind === 'place-h' || p.kind === 'place-t' || p.kind === 'place-o') {
      return p.n + '에서 ' + p.digit + (NO_BATCHIM[p.digit] ? '가' : '이') + ' 나타내는 수';
    }
    return p.start + '보다 ' + p.step + ' 큰 수';
  }

  // 9칸 빙고 문제 생성 (answerText 모두 상이)
  function makeBingo(rng) {
    var usedAns = {}, out = [], i, p;
    for (i = 0; i < 9; i++) {
      p = pickWithRetry(function () {
        var k = BINGO_KINDS[randInt(0, BINGO_KINDS.length - 1, rng)];
        var cand = makeProblem(k, rng);
        return usedAns[cand.answerText] ? null : cand;
      }, null);
      if (p === null) {
        p = pickWithRetry(function () {
          var cand = makeProblem('jump-100', rng);
          return usedAns[cand.answerText] ? null : cand;
        }, makeProblem('jump-100', rng));
      }
      usedAns[p.answerText] = true;
      p.call = bingoCallText(p);
      out.push(p);
    }
    return out;
  }

  // 스무고개 비밀 수
  function makeSecret(rng) {
    return randInt(100, 999, rng);
  }

  // 스무고개 질문 칩 ID 목록
  function chipList() {
    var list = [], i;
    for (i = 200; i <= 900; i += 100) list.push('gt:' + i);
    for (i = 1; i <= 9; i++) list.push('h:' + i);
    for (i = 0; i <= 9; i++) list.push('t:' + i);
    for (i = 0; i <= 9; i++) list.push('o:' + i);
    list.push('even');
    return list;
  }

  // 스무고개 칩 화면 문구
  function chipText(id) {
    var val = Number(id.slice(id.indexOf(':') + 1));
    var copula = NO_BATCHIM[val] ? '예요?' : '이에요?';
    if (id === 'even') return '짝수예요?';
    if (id.indexOf('gt:') === 0) return val + '보다 커요?';
    if (id.indexOf('h:') === 0) return '백의 자리가 ' + val + copula;
    if (id.indexOf('t:') === 0) return '십의 자리가 ' + val + copula;
    return '일의 자리가 ' + val + copula;
  }

  // 스무고개 칩 질문에 대한 참/거짓 판정
  function chipAnswer(n, id) {
    if (id === 'even') return n % 2 === 0;
    var val = Number(id.slice(id.indexOf(':') + 1));
    if (id.indexOf('gt:') === 0) return n > val;
    var d = digits(n);
    if (id.indexOf('h:') === 0) return d.h === val;
    if (id.indexOf('t:') === 0) return d.t === val;
    return d.o === val;
  }

  // 지금까지의 질문/답변과 일치하는 100~999 후보 오름차순 반환
  function candidates(asked) {
    var out = [], n, i, ok;
    for (n = 100; n <= 999; n++) {
      ok = true;
      for (i = 0; i < asked.length; i++) {
        if (chipAnswer(n, asked[i].id) !== asked[i].answer) {
          ok = false;
          break;
        }
      }
      if (ok) out.push(n);
    }
    return out;
  }

  global.ThreeDigitCore = {
    LAB_KINDS: LAB_KINDS,
    KIND_ORDER: KIND_ORDER,
    MIXED_KINDS: MIXED_KINDS,
    BINGO_KINDS: BINGO_KINDS,
    randInt: randInt,
    digits: digits,
    placeValue: placeValue,
    readKo: readKo,
    readKoWrong: readKoWrong,
    makeProblem: makeProblem,
    wrongChoices: wrongChoices,
    wrongReadings: wrongReadings,
    makeRound: makeRound,
    makeMixedRound: makeMixedRound,
    makeBingo: makeBingo,
    makeSecret: makeSecret,
    chipList: chipList,
    chipText: chipText,
    chipAnswer: chipAnswer,
    candidates: candidates
  };
})(typeof window !== 'undefined' ? window : globalThis);
