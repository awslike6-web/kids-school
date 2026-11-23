// 초등 4학년 2학기 소수의 덧셈과 뺄셈 순수 계산 모듈
(function (global) {
  'use strict';

  var DC = global.DecimalCore;
  var POW10 = [1, 10, 100, 1000, 10000, 100000, 1000000];
  var SINO_DIGITS = ['영', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
  var SINO_UNITS = ['천', '백', '십', ''];
  var MAX_TRIES = 200;

  var LAB_KINDS = {
    1: ['read-2', 'read-2-zero', 'read-2'],
    2: ['locate-3', 'digit-value', 'digit-value'],
    3: ['compare-longer-smaller', 'compare-longer-smaller', 'compare-longer-larger'],
    4: ['shift-up', 'shift-down-2', 'shift-chain'],
    5: ['add-1-nocarry', 'add-1-carry', 'sub-1-borrow'],
    6: ['add-mixed-places', 'sub-mixed-places', 'whole-minus-decimal']
  };

  var KIND_ORDER = (function () {
    var out = [], seen = {}, lab, arr, i, k;
    for (lab = 1; lab <= 6; lab++) {
      arr = LAB_KINDS[lab];
      for (i = 0; i < arr.length; i++) {
        k = arr[i];
        if (!seen[k]) { seen[k] = true; out.push(k); }
      }
    }
    return out;
  })();

  // 양 끝 포함 정수 난수
  function randInt(lo, hi, rng) {
    return Math.floor(rng() * (hi - lo + 1)) + lo;
  }

  // 두 소수의 소수점 아래 자리 수를 큰 쪽에 맞춤
  function align(a, b) {
    var P = Math.max(a.places, b.places);
    var padA = P - a.places;
    var padB = P - b.places;
    return {
      a: DC.dec(a.int * POW10[padA], P),
      b: DC.dec(b.int * POW10[padB], P),
      places: P,
      padA: padA,
      padB: padB
    };
  }

  // 자리 맞춤 덧셈(끝자리 0 유지)
  function add(a, b) {
    var al = align(a, b);
    return DC.dec(al.a.int + al.b.int, al.places);
  }

  // 자리 맞춤 뺄셈(음수면 예외)
  function sub(a, b) {
    var al = align(a, b);
    var diff = al.a.int - al.b.int;
    if (diff < 0) throw new Error('negative decimal result');
    return DC.dec(diff, al.places);
  }

  // 0~9999 한자어 정수 읽기
  function readIntSino(n) {
    var s, out = '', i, d, unit;
    if (n === 0) return '영';
    s = String(n);
    while (s.length < 4) s = '0' + s;
    for (i = 0; i < 4; i++) {
      d = s.charCodeAt(i) - 48;
      if (d === 0) continue;
      unit = SINO_UNITS[i];
      out += (d === 1 && unit !== '' ? '' : SINO_DIGITS[d]) + unit;
    }
    return out;
  }

  // formatRaw 글자 기준 소수 읽기
  function readAloud(d) {
    var parts = DC.formatRaw(d).split('.');
    var head = readIntSino(parseInt(parts[0], 10));
    var tail = '', i;
    if (parts.length < 2 || parts[1].length === 0) return head;
    for (i = 0; i < parts[1].length; i++) tail += SINO_DIGITS[parts[1].charCodeAt(i) - 48];
    return head + ' 점 ' + tail;
  }

  // 특정 자리(0=일의 자리, 1~3=소수 첫째~셋째) 숫자의 값
  function digitValue(d, place) {
    var digit;
    if (place === 0) {
      digit = Math.floor(d.int / POW10[d.places]) % 10;
      return DC.dec(digit, 0);
    }
    if (place > d.places) return DC.dec(0, place);
    digit = Math.floor(d.int / POW10[d.places - place]) % 10;
    return DC.dec(digit, place);
  }

  // d * 10^k 계산 후 끝자리 0 제거
  function shift(d, k) {
    var newPlaces = d.places - k;
    var v = d.int;
    if (newPlaces < 0) { v = v * POW10[-newPlaces]; newPlaces = 0; }
    while (newPlaces > 0 && v % 10 === 0) { v = v / 10; newPlaces--; }
    return DC.dec(v, newPlaces);
  }

  // 끝자리 0이 없는 양수인지 확인
  function isCleanPositive(d) {
    return d.int > 0 && DC.format(d) === DC.formatRaw(d);
  }

  // 서로 다른 숫자 4개(w, x, y, z) 뽑기 시도
  function tryDigitValue(rng) {
    var w = randInt(1, 9, rng), x = randInt(1, 9, rng), y = randInt(1, 9, rng), z = randInt(1, 9, rng);
    var a, place;
    if (w === x || w === y || w === z || x === y || x === z || y === z) return null;
    a = DC.dec(w * 1000 + x * 100 + y * 10 + z, 3);
    place = randInt(1, 3, rng);
    return { kind: 'digit-value', op: null, a: a, b: null, place: place, answer: digitValue(a, place) };
  }

  // 자릿수 다른 두 소수 비교 문제 생성
  function tryCompare(kind, rng) {
    var longerIsLarger = (kind === 'compare-longer-larger');
    var w = randInt(0, 3, rng), d1 = randInt(1, 9, rng), d2 = randInt(1, 9, rng), d3 = randInt(1, 9, rng);
    var shortDec, longDec, a, b;
    if (d1 === d2) return null;
    if (longerIsLarger ? (d2 <= d1) : (d2 >= d1)) return null;
    shortDec = DC.dec(w * 10 + d1, 1);
    longDec = DC.dec(w * 100 + d2 * 10 + d3, 2);
    if (rng() < 0.5) { a = shortDec; b = longDec; } else { a = longDec; b = shortDec; }
    return { kind: kind, op: 'compare', a: a, b: b, answer: DC.compare(a, b) > 0 ? '>' : '<' };
  }

  // 지정 자리 수의 양의 소수(끝자리 0 제외, 자연수 0~9) 생성
  function randomDec(places, rng) {
    var w = randInt(0, 9, rng);
    var frac = 0, i;
    if (places === 0) return DC.dec(randInt(1, 9, rng), 0);
    for (i = 0; i < places - 1; i++) frac = frac * 10 + randInt(0, 9, rng);
    frac = frac * 10 + randInt(1, 9, rng);
    return DC.dec(w * POW10[places] + frac, places);
  }

  // 덧셈·뺄셈 문제 시도
  function tryArith(kind, rng) {
    var a, b, ans, op = '+', d1, d2;
    if (kind === 'add-1-nocarry') {
      d1 = randInt(1, 9, rng); d2 = randInt(1, 9, rng);
      if (d1 + d2 >= 10) return null;
      a = DC.dec(randInt(0, 9, rng) * 10 + d1, 1);
      b = DC.dec(randInt(0, 9, rng) * 10 + d2, 1);
      ans = add(a, b);
    } else if (kind === 'add-1-carry') {
      d1 = randInt(1, 9, rng); d2 = randInt(1, 9, rng);
      if (d1 + d2 <= 10) return null;
      a = DC.dec(randInt(0, 9, rng) * 10 + d1, 1);
      b = DC.dec(randInt(0, 9, rng) * 10 + d2, 1);
      ans = add(a, b);
    } else if (kind === 'sub-1-borrow') {
      op = '-';
      d1 = randInt(1, 9, rng); d2 = randInt(1, 9, rng);
      if (d1 >= d2) return null;
      a = DC.dec(randInt(1, 9, rng) * 10 + d1, 1);
      b = DC.dec(randInt(0, 9, rng) * 10 + d2, 1);
      if (DC.compare(a, b) <= 0) return null;
      ans = sub(a, b);
    } else if (kind === 'add-mixed-places') {
      a = DC.dec(randInt(0, 9, rng) * 10 + randInt(1, 9, rng), 1);
      b = DC.dec(randInt(0, 9, rng) * 100 + randInt(0, 9, rng) * 10 + randInt(1, 9, rng), 2);
      if (rng() < 0.5) { ans = a; a = b; b = ans; }
      ans = add(a, b);
    } else if (kind === 'sub-mixed-places') {
      op = '-';
      a = DC.dec(randInt(0, 9, rng) * 10 + randInt(1, 9, rng), 1);
      b = DC.dec(randInt(0, 9, rng) * 100 + randInt(0, 9, rng) * 10 + randInt(1, 9, rng), 2);
      if (DC.compare(a, b) <= 0) return null;
      ans = sub(a, b);
    } else if (kind === 'whole-minus-decimal') {
      op = '-';
      a = DC.dec(randInt(1, 9, rng), 0);
      b = DC.dec(randInt(0, 9, rng) * 100 + randInt(0, 9, rng) * 10 + randInt(1, 9, rng), 2);
      if (DC.compare(b, a) >= 0) return null;
      ans = sub(a, b);
    } else {
      return null;
    }
    if (!isCleanPositive(ans)) return null;
    return { kind: kind, op: op, a: a, b: b, answer: ans };
  }

  // 조건 실패 시 반환할 고정 예시
  function fallbackProblem(kind) {
    var a, b;
    if (kind === 'digit-value') {
      a = DC.dec(2345, 3);
      return { kind: kind, op: null, a: a, b: null, place: 2, answer: digitValue(a, 2) };
    }
    if (kind === 'compare-longer-smaller') {
      return { kind: kind, op: 'compare', a: DC.dec(15, 1), b: DC.dec(124, 2), answer: '>' };
    }
    if (kind === 'compare-longer-larger') {
      return { kind: kind, op: 'compare', a: DC.dec(12, 1), b: DC.dec(145, 2), answer: '<' };
    }
    if (kind === 'add-1-nocarry') {
      a = DC.dec(12, 1); b = DC.dec(23, 1);
      return { kind: kind, op: '+', a: a, b: b, answer: add(a, b) };
    }
    if (kind === 'add-1-carry') {
      a = DC.dec(16, 1); b = DC.dec(28, 1);
      return { kind: kind, op: '+', a: a, b: b, answer: add(a, b) };
    }
    if (kind === 'sub-1-borrow') {
      a = DC.dec(23, 1); b = DC.dec(17, 1);
      return { kind: kind, op: '-', a: a, b: b, answer: sub(a, b) };
    }
    if (kind === 'add-mixed-places') {
      a = DC.dec(15, 1); b = DC.dec(34, 2);
      return { kind: kind, op: '+', a: a, b: b, answer: add(a, b) };
    }
    if (kind === 'sub-mixed-places') {
      a = DC.dec(15, 1); b = DC.dec(34, 2);
      return { kind: kind, op: '-', a: a, b: b, answer: sub(a, b) };
    }
    a = DC.dec(2, 0); b = DC.dec(35, 2);
    return { kind: 'whole-minus-decimal', op: '-', a: a, b: b, answer: sub(a, b) };
  }

  // 유형별 문제 1개 생성
  function makeProblem(kind, rng) {
    var i, res, a;
    if (kind === 'read-2') {
      a = DC.dec(randInt(1, 9, rng) * 10 + randInt(1, 9, rng), 2);
      return { kind: kind, op: null, a: a, b: null, answer: readAloud(a) };
    }
    if (kind === 'read-2-zero') {
      a = DC.dec(randInt(1, 9, rng), 2);
      return { kind: kind, op: null, a: a, b: null, answer: readAloud(a) };
    }
    if (kind === 'locate-3') {
      a = DC.dec(randInt(1, 9, rng) * 100 + randInt(1, 9, rng) * 10 + randInt(1, 9, rng), 3);
      return { kind: kind, op: null, a: a, b: null, answer: a };
    }
    if (kind === 'shift-up') {
      a = randomDec(randInt(1, 3, rng), rng);
      return { kind: kind, op: 'shift', a: a, b: null, k: 1, answer: shift(a, 1) };
    }
    if (kind === 'shift-down-2') {
      a = randomDec(randInt(0, 1, rng), rng);
      return { kind: kind, op: 'shift', a: a, b: null, k: -2, answer: shift(a, -2) };
    }
    if (kind === 'shift-chain') {
      a = DC.dec(randInt(1, 9, rng), 0);
      return { kind: kind, op: 'shift', a: a, b: null, k: -1, answer: [a, shift(a, -1), shift(a, -2), shift(a, -3)] };
    }
    for (i = 0; i < MAX_TRIES; i++) {
      if (kind === 'digit-value') res = tryDigitValue(rng);
      else if (kind === 'compare-longer-smaller' || kind === 'compare-longer-larger') res = tryCompare(kind, rng);
      else res = tryArith(kind, rng);
      if (res) return res;
    }
    return fallbackProblem(kind);
  }

  // 소수 오답 1개 추가(중복·정답·0 이하 배제)
  function pushDecChoice(list, seen, ansText, val, mistake) {
    var text;
    if (!val || val.int <= 0) return;
    // 끝자리 0이 붙는 오답(4.12 + 8.8 오른쪽 맞춤 → 5.00)은 보기에 "5"로 보여 헷갈리므로 버린다
    if (DC.formatRaw(val) !== DC.format(val)) return;
    text = DC.format(val);
    if (text === ansText || seen[text]) return;
    seen[text] = true;
    list.push({ value: val, text: text, mistake: mistake });
  }

  // 문자열 오답 1개 추가
  function pushStrChoice(list, seen, ansText, text, mistake) {
    if (text === ansText || seen[text]) return;
    seen[text] = true;
    list.push({ value: text, text: text, mistake: mistake });
  }

  // 부족한 오답을 정답 마지막 자리 +-1, +-2 ... 순으로 채움
  function fillOffByOne(list, seen, ans) {
    var step = 1, sign, candInt, cand;
    var ansText = DC.format(ans);
    while (list.length < 2 && step <= 200) {
      for (sign = 1; sign >= -1 && list.length < 2; sign -= 2) {
        candInt = ans.int + sign * step;
        if (candInt > 0 && (ans.places === 0 || candInt % 10 !== 0)) {
          cand = DC.dec(candInt, ans.places);
          pushDecChoice(list, seen, ansText, cand, 'off-by-one');
        }
      }
      step++;
    }
  }

  // 문제 유형별 오답 보기 2개 생성
  function wrongChoices(problem) {
    var kind = problem.kind, a = problem.a, b = problem.b, ans = problem.answer;
    var list = [], seen = {}, ansText, otherSign, wSum, dSum, wDiff, dDiff, diff1;
    if (kind === 'shift-chain') return [];
    if (kind === 'read-2') {
      ansText = ans;
      pushStrChoice(list, seen, ansText, '영 점 ' + readIntSino(a.int % 100), 'read-as-whole');
      pushStrChoice(list, seen, ansText, readIntSino(a.int % 100), 'drop-point');
      return list;
    }
    if (kind === 'read-2-zero') {
      ansText = ans;
      pushStrChoice(list, seen, ansText, '영 점 ' + readIntSino(a.int), 'drop-zero');
      pushStrChoice(list, seen, ansText, readIntSino(a.int), 'drop-point');
      return list;
    }
    if (kind === 'compare-longer-smaller' || kind === 'compare-longer-larger') {
      ansText = ans;
      otherSign = ans === '>' ? '<' : '>';
      // 두 자리 쪽이 작은 문제에서 반대 기호는 "자리 수가 많으면 크다" 오개념, 큰 문제에서는 "자리 수가 적으면 크다"
      pushStrChoice(list, seen, ansText, otherSign, kind === 'compare-longer-smaller' ? 'longer-is-larger' : 'shorter-is-larger');
      pushStrChoice(list, seen, ansText, '=', 'equal');
      return list;
    }
    ansText = DC.format(ans);
    if (kind === 'locate-3' || kind === 'digit-value') {
      pushDecChoice(list, seen, ansText, shift(ans, 1), 'place-up');
      pushDecChoice(list, seen, ansText, shift(ans, -1), 'place-down');
    } else if (kind === 'shift-up' || kind === 'shift-down-2') {
      pushDecChoice(list, seen, ansText, shift(a, -problem.k), 'wrong-direction');
      pushDecChoice(list, seen, ansText, shift(a, problem.k === 1 ? 2 : -1), 'off-by-one');
    } else if (kind === 'add-1-carry') {
      wSum = Math.floor(a.int / 10) + Math.floor(b.int / 10);
      dSum = (a.int % 10) + (b.int % 10);
      pushDecChoice(list, seen, ansText, DC.dec(wSum * 100 + dSum, 2), 'carry-as-place');
    } else if (kind === 'sub-1-borrow') {
      wDiff = Math.abs(Math.floor(a.int / 10) - Math.floor(b.int / 10));
      dDiff = Math.abs((a.int % 10) - (b.int % 10));
      pushDecChoice(list, seen, ansText, DC.dec(wDiff * 10 + dDiff, 1), 'reverse-subtract');
    } else if (kind === 'add-mixed-places') {
      pushDecChoice(list, seen, ansText, DC.dec(a.int + b.int, Math.max(a.places, b.places)), 'right-align');
    } else if (kind === 'sub-mixed-places') {
      diff1 = a.int - Math.floor(b.int / 10);
      pushDecChoice(list, seen, ansText, DC.dec(diff1 * 10 + (b.int % 10), 2), 'no-pad');
    } else if (kind === 'whole-minus-decimal') {
      pushDecChoice(list, seen, ansText, add(a, b), 'ignore-point-add');
      if (b.int - a.int > 0) pushDecChoice(list, seen, ansText, DC.dec(b.int - a.int, 2), 'ignore-point');
    }
    if (list.length < 2) fillOffByOne(list, seen, ans);
    return list.slice(0, 2);
  }

  // 문제 중복 판별 키
  function problemKey(p) {
    return [
      p.kind,
      p.a ? p.a.int + ':' + p.a.places : '',
      p.b ? p.b.int + ':' + p.b.places : '',
      p.place !== undefined ? p.place : '',
      p.k !== undefined ? p.k : ''
    ].join('|');
  }

  // 관별 3문제 라운드 생성(중복 없음)
  function makeRound(lab, rng) {
    var kinds = LAB_KINDS[lab];
    var out = [], seen = {}, i, t, p, key;
    if (!kinds) throw new Error('unknown lab: ' + lab);
    for (i = 0; i < kinds.length; i++) {
      p = null;
      for (t = 0; t < MAX_TRIES; t++) {
        p = makeProblem(kinds[i], rng);
        key = problemKey(p);
        if (!seen[key]) { seen[key] = true; break; }
      }
      out.push(p);
    }
    return out;
  }

  // 혼합 라운드 생성(shift-chain 제외, 종류별 최대 3회, KIND_ORDER 정렬)
  function makeMixedRound(rng, n) {
    var count = (n === undefined || n === null) ? 10 : n;
    var pool = [], counts = {}, out = [], seen = {}, i, t, kind, p, key;
    for (i = 0; i < KIND_ORDER.length; i++) {
      if (KIND_ORDER[i] !== 'shift-chain') pool.push(KIND_ORDER[i]);
    }
    while (out.length < count) {
      p = null;
      for (t = 0; t < MAX_TRIES; t++) {
        kind = pool[randInt(0, pool.length - 1, rng)];
        if ((counts[kind] || 0) >= 3) continue;
        p = makeProblem(kind, rng);
        key = problemKey(p);
        if (!seen[key]) { seen[key] = true; counts[kind] = (counts[kind] || 0) + 1; break; }
        p = null;
      }
      if (!p) break;
      out.push(p);
    }
    out.sort(function (x, y) { return KIND_ORDER.indexOf(x.kind) - KIND_ORDER.indexOf(y.kind); });
    return out;
  }

  global.DecimalAddCore = {
    LAB_KINDS: LAB_KINDS,
    KIND_ORDER: KIND_ORDER,
    randInt: randInt,
    align: align,
    add: add,
    sub: sub,
    readAloud: readAloud,
    digitValue: digitValue,
    shift: shift,
    makeProblem: makeProblem,
    wrongChoices: wrongChoices,
    makeRound: makeRound,
    makeMixedRound: makeMixedRound
  };
})(typeof window !== 'undefined' ? window : globalThis);
