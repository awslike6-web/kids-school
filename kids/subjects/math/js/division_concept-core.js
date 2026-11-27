// 초등 3학년 나눗셈 탐험관 순수 계산 모듈 (DivConceptCore)
// 1관 똑같이 나누기(등분제) · 2관 곱셈구구로 몫 찾기 · 3관 나머지가 있는 나눗셈(3-2 맛보기)
(function (global) {
  'use strict';

  function rand(rng) {
    return typeof rng === 'function' ? rng : Math.random;
  }

  function randInt(lo, hi, rng) {
    return lo + Math.floor(rand(rng)() * (hi - lo + 1));
  }

  // 정답 하나 + 오답 후보에서 정답·중복·1 미만을 빼고 앞에서 2개
  function threeChoices(answer, candidates) {
    var out = [answer];
    for (var i = 0; i < candidates.length && out.length < 3; i += 1) {
      var c = candidates[i];
      if (c >= 1 && out.indexOf(c) < 0) out.push(c);
    }
    var extra = answer + 2;
    while (out.length < 3) {
      if (out.indexOf(extra) < 0) out.push(extra);
      extra += 1;
    }
    return out;
  }

  // 1관: 쿠키 total개를 plates접시에 똑같이 (접시 2~6, 한 접시 2~6개, 직전과 다름)
  function makeShare(rng, prev) {
    var p;
    var guard = 0;
    do {
      var plates = randInt(2, 6, rng);
      var q = randInt(2, 6, rng);
      p = { total: plates * q, plates: plates, q: q };
      guard += 1;
    } while (prev && prev.total === p.total && prev.plates === p.plates && guard < 20);
    // 오답: 하나 더·하나 덜, 접시 수와 몫을 바꿔 생각한 실수
    p.choices = threeChoices(p.q, [p.q + 1, p.q - 1, p.plates]).map(String);
    p.answerIndex = 0;
    return p;
  }

  // 2관: 곱셈구구로 몫 찾기. d × □ = n → n ÷ d = □ (단 2~9, 몫 2~9)
  function makeFact(rng, prev) {
    var p;
    var guard = 0;
    do {
      var d = randInt(2, 9, rng);
      var q = randInt(2, 9, rng);
      p = { d: d, q: q, n: d * q };
      guard += 1;
    } while (prev && prev.n === p.n && prev.d === p.d && guard < 20);
    // 오답: 이웃 곱셈구구(몫 ±1), 나누는 수를 그대로 답한 실수
    p.choices = threeChoices(p.q, [p.q + 1, p.q - 1, p.d]).map(String);
    p.answerIndex = 0;
    return p;
  }

  function remText(q, r) {
    return '몫 ' + q + ', 나머지 ' + r;
  }

  // 3관: 나머지가 있는 나눗셈 (나누는 수 3~8, 몫 2~8, 나머지 0~나누는 수-1)
  // 오답: 몫을 하나 덜 세어 나머지가 나누는 수보다 커진 것(나머지 철칙 위반), 몫을 하나 더 센 것
  function makeRemainder(rng, prev) {
    var p;
    var guard = 0;
    do {
      var d = randInt(3, 8, rng);
      var q = randInt(2, 8, rng);
      var r = randInt(0, d - 1, rng);
      p = { d: d, q: q, r: r, n: d * q + r };
      guard += 1;
    } while (prev && prev.n === p.n && prev.d === p.d && guard < 20);
    var wrongs = [remText(p.q - 1, p.r + p.d), remText(p.q + 1, p.r)];
    p.choices = [remText(p.q, p.r)].concat(wrongs);
    p.answerIndex = 0;
    p.check = '(' + p.d + ' × ' + p.q + ') + ' + p.r + ' = ' + p.n;
    return p;
  }

  global.DivConceptCore = {
    threeChoices: threeChoices,
    makeShare: makeShare,
    makeFact: makeFact,
    remText: remText,
    makeRemainder: makeRemainder
  };
})(typeof window !== 'undefined' ? window : globalThis);
