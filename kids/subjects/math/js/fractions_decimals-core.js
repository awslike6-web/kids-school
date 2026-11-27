// 초등 3학년 분수와 소수 첫걸음 탐험관 순수 계산 모듈 (FracDec3Core)
// 소수는 0.1 단위 정수(tenths)로만 다룬다 → 부동소수 오차 없음. 화면 글자는 세로 분수 표기 계약("3/4", "1과 4/10").
(function (global) {
  'use strict';

  var DENOMS = [2, 3, 4, 6, 8];
  var TYPE_NAMES = ['진분수', '가분수', '대분수'];
  var TYPE_KINDS = ['proper', 'improper', 'mixed', 'unit-pick'];
  var BAR_STARTS = [0, 0, 0, 2, 4];

  function rand(rng) {
    return typeof rng === 'function' ? rng : Math.random;
  }

  function randInt(lo, hi, rng) {
    return lo + Math.floor(rand(rng)() * (hi - lo + 1));
  }

  function pick(list, rng) {
    return list[Math.floor(rand(rng)() * list.length)];
  }

  // 자연수 끝 숫자에 맞는 과/와 (2·4·5·9는 '와')
  function gwa(w) {
    var last = w % 10;
    return (last === 2 || last === 4 || last === 5 || last === 9) ? '와' : '과';
  }

  // 0.1 단위 정수 → 소수 글자: 7 → '0.7', 14 → '1.4', 10 → '1', 20 → '2'
  function decimalText(tenths) {
    var t = Math.round(tenths);
    if (t < 0) throw new Error('0보다 작은 소수는 쓰지 않습니다');
    var w = Math.floor(t / 10);
    var r = t % 10;
    return r === 0 ? String(w) : w + '.' + r;
  }

  // 0.1 단위 정수 → 분수 글자: 7 → '7/10', 10 → '10/10', 14 → '1과 4/10', 20 → '20/10'
  function tenthsToken(tenths) {
    var t = Math.round(tenths);
    if (t <= 0) throw new Error('0은 분수로 쓰지 않습니다');
    var w = Math.floor(t / 10);
    var r = t % 10;
    if (w === 0 || r === 0) return t + '/10';
    return w + gwa(w) + ' ' + r + '/10';
  }

  // 막대 보기 글자: '0.7 (7/10)', '1.4 (1과 4/10)'
  function barChoice(tenths) {
    return decimalText(tenths) + ' (' + tenthsToken(tenths) + ')';
  }

  // 분수 종류: 대분수(w>0) · 단위분수(분자 1) · 진분수(분자<분모) · 가분수(분자≥분모)
  function fractionType(w, n, d) {
    if (!(d > 0) || n < 0 || w < 0) throw new Error('분수가 아닙니다');
    if (w > 0) return 'mixed';
    if (n === 1) return 'unit';
    return n < d ? 'proper' : 'improper';
  }

  // 1관 미션: 피자를 n/d만큼 칠하기 (분모는 등분 버튼 중 하나, 0 < n < d, 직전 미션과 다름)
  function pizzaTarget(rng, prev) {
    var t;
    var guard = 0;
    do {
      var d = pick(DENOMS, rng);
      t = { n: randInt(1, d - 1, rng), d: d };
      guard += 1;
    } while (prev && prev.n === t.n && prev.d === t.d && guard < 20);
    return t;
  }

  // 2관 미션: 분수 이름 맞히기
  //  proper/improper/mixed → { kind, token, question, choices: TYPE_NAMES, answer }
  //  unit-pick → "다음 중 단위분수는?" 보기 3개(분자 1 하나 + 분자 2 이상 둘)
  function typeQuestion(kind, rng) {
    var d = randInt(3, 9, rng);
    var token;
    if (kind === 'proper') {
      token = randInt(2, d - 1, rng) + '/' + d;
      return { kind: kind, token: token, choices: TYPE_NAMES.slice(), answer: 0 };
    }
    if (kind === 'improper') {
      token = randInt(d, d * 2, rng) + '/' + d;
      return { kind: kind, token: token, choices: TYPE_NAMES.slice(), answer: 1 };
    }
    if (kind === 'mixed') {
      var w = randInt(1, 3, rng);
      token = w + gwa(w) + ' ' + randInt(1, d - 1, rng) + '/' + d;
      return { kind: kind, token: token, choices: TYPE_NAMES.slice(), answer: 2 };
    }
    if (kind === 'unit-pick') {
      var a = randInt(2, d - 1, rng);
      var b = randInt(d, d + 3, rng);
      return { kind: kind, token: '1/' + d, choices: ['1/' + d, a + '/' + d, b + '/' + d], answer: 0 };
    }
    throw new Error('모르는 종류: ' + kind);
  }

  function randomTypeQuestion(rng, prevKind) {
    var kind;
    var guard = 0;
    do {
      kind = pick(TYPE_KINDS, rng);
      guard += 1;
    } while (kind === prevKind && guard < 20);
    return typeQuestion(kind, rng);
  }

  // 3관 미션: 수직선에 0.x만큼 칠하기 (0.1~1.9, 1은 빼고, 직전과 다름)
  function decimalTarget(rng, prev) {
    var t;
    var guard = 0;
    do {
      t = randInt(1, 19, rng);
      guard += 1;
    } while ((t === 10 || t === prev) && guard < 50);
    if (t === 10) t = prev === 7 ? 3 : 7;
    return t;
  }

  // 오답 소수 2개: 시작 눈금이 0이 아니면 "끝 눈금을 그대로 읽는" 실수를 먼저 넣고, 나머지는 ±1·±2칸
  function wrongTenths(start, len, rng) {
    var out = [];
    var end = start + len;
    if (start > 0 && end !== len && end <= 20) out.push(end);
    var near = [len - 1, len + 1, len - 2, len + 2].filter(function (v) {
      return v >= 1 && v <= 20 && v !== len && out.indexOf(v) < 0;
    });
    var shuffled = near.slice();
    for (var i = shuffled.length - 1; i > 0; i -= 1) {
      var j = Math.floor(rand(rng)() * (i + 1));
      var tmp = shuffled[i];
      shuffled[i] = shuffled[j];
      shuffled[j] = tmp;
    }
    while (out.length < 2 && shuffled.length) out.push(shuffled.shift());
    return out;
  }

  // 4관 문제: 수직선 위 막대 길이 (시작 0·0.2·0.4, 길이 0.2~1.2)
  function makeBar(rng) {
    var start = pick(BAR_STARTS, rng);
    var len = randInt(2, 12, rng);
    var wrongs = wrongTenths(start, len, rng);
    return {
      start: start,
      len: len,
      end: start + len,
      answerText: barChoice(len),
      choices: [barChoice(len)].concat(wrongs.map(barChoice)),
      answer: 0
    };
  }

  global.FracDec3Core = {
    DENOMS: DENOMS,
    TYPE_NAMES: TYPE_NAMES,
    TYPE_KINDS: TYPE_KINDS,
    BAR_STARTS: BAR_STARTS,
    decimalText: decimalText,
    tenthsToken: tenthsToken,
    barChoice: barChoice,
    fractionType: fractionType,
    pizzaTarget: pizzaTarget,
    typeQuestion: typeQuestion,
    randomTypeQuestion: randomTypeQuestion,
    decimalTarget: decimalTarget,
    wrongTenths: wrongTenths,
    makeBar: makeBar
  };
})(typeof window !== 'undefined' ? window : globalThis);
