// 초등 3학년 1학기 길이와 시간 탐험관 순수 계산 모듈 (LenTimeCore)
// 길이는 mm·m 정수, 시간은 초 정수로만 계산한다(부동소수 없음).
(function (global) {
  'use strict';

  function rand(rng) {
    return typeof rng === 'function' ? rng : Math.random;
  }

  function randInt(lo, hi, rng) {
    return lo + Math.floor(rand(rng)() * (hi - lo + 1));
  }

  function pick(list, rng) {
    return list[Math.floor(rand(rng)() * list.length)];
  }

  function shuffle(list, rng) {
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i -= 1) {
      var j = Math.floor(rand(rng)() * (i + 1));
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  // 정답 + 후보에서 서로 다른 오답 두 개 (정답 먼저). 모자라면 fallback에서 채움.
  function threeChoices(answer, candidates, fallback) {
    var out = [answer];
    candidates.concat(fallback || []).forEach(function (c) {
      if (out.length < 3 && c && out.indexOf(c) === -1) out.push(c);
    });
    return out;
  }

  // 길이 글: 24 → 「2cm 4mm」, 30 → 「3cm」, 7 → 「7mm」
  function fmtMm(mm) {
    var c = Math.floor(mm / 10);
    var r = mm % 10;
    if (c === 0) return r + 'mm';
    return r === 0 ? c + 'cm' : c + 'cm ' + r + 'mm';
  }

  // 2030 → 「2km 30m」, 3000 → 「3km」, 450 → 「450m」
  function fmtM(m) {
    var k = Math.floor(m / 1000);
    var r = m % 1000;
    if (k === 0) return r + 'm';
    return r === 0 ? k + 'km' : k + 'km ' + r + 'm';
  }

  // 자리 실수 오답용: (2, 0) → 「2km」, (40, 50) → 「40km 50m」
  function kmText(k, m) {
    return m === 0 ? k + 'km' : k + 'km ' + m + 'm';
  }

  // 「1분 = 100초」 실수 오답용: (1, 30) → 「1분 30초」, (2, 0) → 「2분」
  function minSecText(mm, ss) {
    return ss === 0 ? mm + '분' : mm + '분 ' + ss + '초';
  }

  // 시간 글: 100 → 「1분 40초」, 120 → 「2분」, 45 → 「45초」
  function fmtSec(s) {
    var m = Math.floor(s / 60);
    var r = s % 60;
    if (m === 0) return r + '초';
    return r === 0 ? m + '분' : m + '분 ' + r + '초';
  }

  // 1관 자로 재기: 시작 눈금(0·1cm·1.5cm·2cm)에서 1cm 1mm~4cm 9mm 막대, 6cm 자 안. mm 자리는 0이 아님.
  // 오답: 시작이 0이 아니면 끝 눈금을 그대로 읽은 값, 1cm 차이, 1mm 차이.
  function makeMeasure(rng, prevLen) {
    var start, len;
    var guard = 0;
    do {
      start = pick([0, 0, 10, 15, 20], rng);
      len = randInt(11, 49, rng);
      guard += 1;
    } while ((len % 10 === 0 || start + len > 60 || len === prevLen) && guard < 200);
    if (len % 10 === 0 || start + len > 60) {
      start = 0;
      len = 24;
    }
    var end = start + len;
    var cands = [];
    if (start > 0) cands.push(fmtMm(end));
    cands.push(fmtMm(len + 10));
    cands.push(fmtMm(len + (rand(rng)() < 0.5 ? 1 : -1)));
    return {
      start: start,
      len: len,
      end: end,
      choices: threeChoices(fmtMm(len), cands, [fmtMm(len - 1), fmtMm(len + 2)]),
      answer: 0,
      endIndex: start > 0 ? 1 : -1
    };
  }

  var CONVERT_TYPES = ['cm2mm', 'mm2cm', 'km2m', 'm2km'];

  // 2관 단위 바꾸기: 1cm = 10mm, 1km = 1000m. 자리 실수(305mm, 230m, 20030m 등)를 오답으로.
  function makeConvert(rng, prevType) {
    var type;
    var guard = 0;
    do {
      type = pick(CONVERT_TYPES, rng);
      guard += 1;
    } while (type === prevType && guard < 50);
    var q = { type: type, answer: 0 };
    var c, r, k, m, n, ans;
    if (type === 'cm2mm') {
      c = randInt(2, 9, rng);
      r = randInt(1, 9, rng);
      ans = c * 10 + r;
      q.question = c + 'cm ' + r + 'mm는 몇 mm일까요?';
      q.speak = c + '센티미터 ' + r + '밀리미터는 몇 밀리미터일까요?';
      q.choices = threeChoices(ans + 'mm', [(c * 100 + r) + 'mm', (ans * 10) + 'mm'], [(ans + 1) + 'mm']);
      q.explain = c + 'cm는 ' + (c * 10) + 'mm예요. ' + (c * 10) + 'mm + ' + r + 'mm = ' + ans + 'mm예요.';
      q.hint = '1cm는 10mm예요. ' + c + 'cm는 몇 mm인지 먼저 바꿔 봐요.';
    } else if (type === 'mm2cm') {
      do {
        c = randInt(2, 9, rng);
        r = randInt(1, 9, rng);
      } while (c === r);
      n = c * 10 + r;
      q.question = n + 'mm는 몇 cm 몇 mm일까요?';
      q.speak = n + '밀리미터는 몇 센티미터 몇 밀리미터일까요?';
      q.choices = threeChoices(fmtMm(n), [n + 'cm', r + 'cm ' + c + 'mm'], [(c + 1) + 'cm ' + r + 'mm']);
      q.explain = n + 'mm = ' + (c * 10) + 'mm + ' + r + 'mm, ' + (c * 10) + 'mm는 ' + c + 'cm라서 ' + fmtMm(n) + '예요.';
      q.hint = '10mm가 1cm예요. ' + n + 'mm 안에 10mm가 몇 번 들어 있는지 세어 봐요.';
    } else if (type === 'km2m') {
      k = randInt(1, 9, rng);
      m = rand(rng)() < 0.5 ? randInt(1, 9, rng) * 10 : randInt(11, 99, rng) * 10;
      ans = k * 1000 + m;
      q.question = fmtM(ans) + '는 몇 m일까요?';
      q.speak = k + '킬로미터 ' + m + '미터는 몇 미터일까요?';
      q.choices = threeChoices(ans + 'm', [Number(String(k) + String(m)) + 'm', (k * 1000 + m * 10) + 'm', (k * 10000 + m) + 'm'], [(ans + 1000) + 'm']);
      q.explain = k + 'km는 ' + (k * 1000) + 'm예요. ' + (k * 1000) + 'm + ' + m + 'm = ' + ans + 'm예요.';
      q.hint = '1km는 1000m예요. ' + m + 'm가 몇 자리 수인지 보고 백·십·일의 자리에 맞춰 써 봐요.';
    } else {
      k = randInt(1, 9, rng);
      m = rand(rng)() < 0.5 ? randInt(1, 9, rng) * 10 : randInt(11, 99, rng) * 10;
      n = k * 1000 + m;
      q.question = n + 'm는 몇 km 몇 m일까요?';
      q.speak = n + '미터는 몇 킬로미터 몇 미터일까요?';
      q.choices = threeChoices(fmtM(n), [kmText(Math.floor(n / 100), n % 100), m * 10 < 1000 ? kmText(k, m * 10) : '', kmText(k * 10, m)], [kmText(k + 1, m)]);
      q.explain = n + 'm = ' + (k * 1000) + 'm + ' + m + 'm, ' + (k * 1000) + 'm는 ' + k + 'km라서 ' + fmtM(n) + '예요.';
      q.hint = '1000m가 1km예요. 천의 자리 숫자가 km가 돼요.';
    }
    return q;
  }

  // 3관 시간 감각: 목표 초와 멈춘 시간(ms) → 차이 판정 (±1초 안이면 성공)
  var SENSE_TARGETS = [5, 7, 10, 12, 15];

  function makeSense(rng, prevTarget) {
    var t;
    var guard = 0;
    do {
      t = pick(SENSE_TARGETS, rng);
      guard += 1;
    } while (t === prevTarget && guard < 50);
    return { target: t };
  }

  function judgeSense(target, ms) {
    var tenth = Math.round(ms / 100); // 0.1초 단위
    var diff = tenth - target * 10;
    return {
      shown: Math.floor(tenth / 10) + '.' + (tenth % 10) + '초',
      diffTenth: Math.abs(diff),
      diffText: Math.floor(Math.abs(diff) / 10) + '.' + (Math.abs(diff) % 10) + '초',
      early: diff < 0,
      ok: Math.abs(diff) <= 10
    };
  }

  var TIME_TYPES = ['toSec', 'fromSec', 'add', 'sub'];

  // 4관 시간 계산: 1분 = 60초. 오답은 「1분 = 100초」로 본 값, 받아올림·받아내림을 빠뜨린 값.
  function makeTime(rng, prevType) {
    var type;
    var guard = 0;
    do {
      type = pick(TIME_TYPES, rng);
      guard += 1;
    } while (type === prevType && guard < 50);
    var q = { type: type, answer: 0 };
    var a, b, as, bs, ans, mm, ss;
    if (type === 'toSec') {
      mm = randInt(1, 4, rng);
      ss = randInt(1, 11, rng) * 5;
      ans = mm * 60 + ss;
      q.question = fmtSec(ans) + '는 모두 몇 초일까요?';
      q.choices = threeChoices(ans + '초', [(mm * 100 + ss) + '초', (ans + 60) + '초'], [(ans + 10) + '초']);
      q.explain = mm + '분은 ' + (mm * 60) + '초예요. ' + (mm * 60) + '초 + ' + ss + '초 = ' + ans + '초예요.';
      q.hint = '1분은 60초예요. ' + mm + '분은 몇 초인지 먼저 구해요.';
    } else if (type === 'fromSec') {
      do {
        ans = randInt(21, 50, rng) * 5;
      } while (ans % 60 === 0);
      q.question = ans + '초는 몇 분 몇 초일까요?';
      q.choices = threeChoices(fmtSec(ans), [minSecText(Math.floor(ans / 100), ans % 100), fmtSec(ans + 60)], [fmtSec(ans - 60)]);
      q.explain = '60초가 1분이에요. ' + ans + '초 = ' + (Math.floor(ans / 60) * 60) + '초 + ' + (ans % 60) + '초라서 ' + fmtSec(ans) + '예요.';
      q.hint = '60초씩 묶어 1분으로 바꿔 봐요. 100초가 1분이 아니에요.';
    } else if (type === 'add') {
      do {
        as = randInt(2, 11, rng) * 5;
        bs = randInt(2, 11, rng) * 5;
      } while (as + bs < 65);
      a = randInt(1, 4, rng) * 60 + as;
      b = randInt(1, 3, rng) * 60 + bs;
      ans = a + b;
      var noCarry = (Math.floor(a / 60) + Math.floor(b / 60)) + '분 ' + (as + bs - 60) + '초';
      q.question = fmtSec(a) + ' + ' + fmtSec(b) + '는 몇 분 몇 초일까요?';
      q.choices = threeChoices(fmtSec(ans), [noCarry, fmtSec(ans + 60)], [fmtSec(ans - 60)]);
      q.explain = '초끼리 더하면 ' + (as + bs) + '초, 60초를 1분으로 받아올려요. 그래서 ' + fmtSec(ans) + '예요.';
      q.hint = '초끼리 더한 값이 60초가 넘으면 60초를 1분으로 받아올려요.';
    } else {
      do {
        as = randInt(1, 10, rng) * 5;
        bs = randInt(2, 11, rng) * 5;
      } while (as >= bs);
      a = randInt(5, 8, rng) * 60 + as; // 답의 분이 0이 되지 않게(「3분 − 3분 = 0분」 해설 방지)
      b = randInt(1, 3, rng) * 60 + bs;
      ans = a - b;
      var am = Math.floor(a / 60);
      var bm = Math.floor(b / 60);
      var flip = (am - bm) + '분 ' + (bs - as) + '초';
      var noBorrow = (am - bm) + '분 ' + (as + 60 - bs) + '초';
      q.question = fmtSec(a) + ' − ' + fmtSec(b) + '는 몇 분 몇 초일까요?';
      q.choices = threeChoices(fmtSec(ans), [flip, noBorrow], [fmtSec(ans + 60), ans > 60 ? fmtSec(ans - 60) : fmtSec(ans + 120)]);
      q.explain = as + '초에서 ' + bs + '초를 뺄 수 없어서 1분을 60초로 받아내려요. ' + (as + 60) + '초 − ' + bs + '초 = ' + (as + 60 - bs) + '초, ' + (am - 1) + '분 − ' + bm + '분 = ' + (am - 1 - bm) + '분이에요.';
      q.hint = '초끼리 뺄 수 없으면 1분을 60초로 받아내려요.';
    }
    return q;
  }

  global.LenTimeCore = {
    shuffle: shuffle,
    threeChoices: threeChoices,
    fmtMm: fmtMm,
    fmtM: fmtM,
    fmtSec: fmtSec,
    makeMeasure: makeMeasure,
    CONVERT_TYPES: CONVERT_TYPES,
    makeConvert: makeConvert,
    SENSE_TARGETS: SENSE_TARGETS,
    makeSense: makeSense,
    judgeSense: judgeSense,
    TIME_TYPES: TIME_TYPES,
    makeTime: makeTime
  };
})(typeof window !== 'undefined' ? window : globalThis);
