// 5-2 수학 6단원 평균과 가능성: 자료·회전판·모의 실험 순수 모듈 (AverageCore, DOM 없음 · 시험 대상)
(function (global) {
  'use strict';

  function randInt(min, max, rng) {
    var rand = typeof rng === 'function' ? rng : Math.random;
    return min + Math.floor(rand() * (max - min + 1));
  }

  function sum(list) {
    return list.reduce(function (a, b) { return a + b; }, 0);
  }

  // 평균이 자연수일 때만 숫자, 아니면 null (5학년 2학기 평균은 자연수로 나누어떨어지는 자료만 쓴다)
  function mean(list) {
    if (!list.length) return null;
    var s = sum(list);
    return s % list.length === 0 ? s / list.length : null;
  }

  // 1관 고르게 하기 자료: count개, 1~maxV, 평균은 자연수, 모두 같은 값은 아님, 평균과 같은 값이 없도록 애쓴다
  function makeLevelData(count, maxV, rng) {
    var n = count || 4;
    var top = maxV || 8;
    for (var t = 0; t < 200; t += 1) {
      var list = [];
      for (var i = 0; i < n; i += 1) list.push(randInt(1, top, rng));
      var m = mean(list);
      if (m === null || m < 2) continue;
      if (Math.max.apply(null, list) - Math.min.apply(null, list) < 3) continue;
      if (t < 150 && list.indexOf(m) >= 0) continue;
      return list;
    }
    return [6, 1, 4, 5];
  }

  // 큰 칸에서 작은 칸으로 하나 옮기기. 옮길 수 없으면 null
  function move(list, from, to) {
    if (from === to || list[from] <= 0) return null;
    var out = list.slice();
    out[from] -= 1;
    out[to] += 1;
    return out;
  }

  function isLevel(list) {
    return list.every(function (v) { return v === list[0]; });
  }

  // 빠진 값: 목표 평균 × 자료 수 − 나머지 합
  function missingValue(known, avg, count) {
    return avg * count - sum(known);
  }

  // 회전판: 칸 비율(합 1). 색 이름은 화면 클래스와 짝.
  var SPINNERS = {
    ga: { name: '가', parts: [{ color: 'red', share: 1 / 2 }, { color: 'blue', share: 1 / 4 }, { color: 'yellow', share: 1 / 4 }] },
    na: { name: '나', parts: [{ color: 'red', share: 1 / 4 }, { color: 'blue', share: 1 / 2 }, { color: 'yellow', share: 1 / 4 }] },
    da: { name: '다', parts: [{ color: 'red', share: 1 / 4 }, { color: 'blue', share: 1 / 4 }, { color: 'yellow', share: 1 / 2 }] }
  };

  var COLOR_NAMES = { red: '빨강', blue: '파랑', yellow: '노랑' };

  // 모의 실험: 기대 횟수에서 크게 벗어나지 않게 만든다(층화). 아이가 오해하지 않도록,
  // 가장 넓은 칸이 언제나 가장 많이 나오고 나머지 둘은 기대값 ± jitter 안에 있다.
  function simulate(spinner, times, rng) {
    var n = times || 50;
    var parts = spinner.parts;
    var jitter = Math.max(1, Math.round(n * 0.06));
    for (var t = 0; t < 100; t += 1) {
      var counts = parts.map(function (p) { return Math.round(p.share * n) + randInt(-jitter, jitter, rng); });
      var diff = n - sum(counts);
      counts[counts.length - 1] += diff;
      if (counts.some(function (c) { return c < 0; })) continue;
      var bigIdx = 0;
      parts.forEach(function (p, i) { if (p.share > parts[bigIdx].share) bigIdx = i; });
      var ok = counts.every(function (c, i) { return i === bigIdx || c < counts[bigIdx]; });
      var close = counts.every(function (c, i) { return Math.abs(c - parts[i].share * n) <= jitter + 1; });
      if (ok && close) {
        var out = {};
        parts.forEach(function (p, i) { out[p.color] = counts[i]; });
        return out;
      }
    }
    var fallback = {};
    parts.forEach(function (p) { fallback[p.color] = Math.round(p.share * n); });
    return fallback;
  }

  // 결과 순서대로 하나씩 보여 줄 때 쓰는 줄 (막대가 자라는 연출용)
  function sequenceOf(counts, rng) {
    var seq = [];
    Object.keys(counts).forEach(function (c) {
      for (var i = 0; i < counts[c]; i += 1) seq.push(c);
    });
    for (var j = seq.length - 1; j > 0; j -= 1) {
      var k = randInt(0, j, rng);
      var tmp = seq[j];
      seq[j] = seq[k];
      seq[k] = tmp;
    }
    return seq;
  }

  // 4관 상황 카드: level 0 불가능하다 · 1 ~아닐 것 같다 · 2 반반이다 · 3 ~일 것 같다 · 4 확실하다
  var LEVEL_WORDS = ['불가능하다', '~아닐 것 같다', '반반이다', '~일 것 같다', '확실하다'];

  var SITUATIONS = [
    { text: '주사위를 한 번 굴리면 눈의 수가 7이 나올 거예요.', level: 0, why: '주사위 눈은 1부터 6까지만 있어요.' },
    { text: '동전을 한 번 던지면 숫자 면이 나올 거예요.', level: 2, why: '동전은 그림 면과 숫자 면 두 가지뿐이에요.' },
    { text: '1부터 10까지 수 카드 중 한 장을 뽑으면 10 이하의 수가 나올 거예요.', level: 4, why: '카드가 모두 10 이하예요.' },
    { text: '빨간 구슬 9개, 파란 구슬 1개가 든 주머니에서 꺼낸 구슬은 빨간색일 거예요.', level: 3, why: '빨간 구슬이 훨씬 많아요. 그래도 파란 구슬이 나올 수는 있어요.' },
    { text: '빨간 구슬 1개, 파란 구슬 9개가 든 주머니에서 꺼낸 구슬은 빨간색일 거예요.', level: 1, why: '빨간 구슬은 1개뿐이에요. 나올 수는 있지만 드물어요.' },
    { text: '1월 다음에는 2월이 올 거예요.', level: 4, why: '달력은 언제나 1월 다음이 2월이에요.' },
    { text: '절반은 빨강, 절반은 파랑인 회전판을 돌리면 빨강에 멈출 거예요.', level: 2, why: '빨강과 파랑이 똑같이 넓어요.' },
    { text: '흰 바둑돌만 들어 있는 통에서 꺼낸 바둑돌은 검은색일 거예요.', level: 0, why: '통 안에 검은 돌이 하나도 없어요.' }
  ];

  // 5관 주사위 조건 카드: 가능성(6분의 몇)으로 순서를 정한다
  var DICE_CARDS = [
    { text: '7 초과', sixths: 0 },
    { text: '2 미만', sixths: 1 },
    { text: '2의 배수', sixths: 3 },
    { text: '2 이상', sixths: 5 },
    { text: '1 이상 6 이하', sixths: 6 }
  ];

  // 0, 1/2, 1 중 하나로 나타낼 수 있는 가능성 → 글자 ('0', '1/2', '1'), 아니면 null
  function numberWord(sixths) {
    if (sixths === 0) return '0';
    if (sixths === 3) return '1/2';
    if (sixths === 6) return '1';
    return null;
  }

  global.AverageCore = {
    randInt: randInt,
    sum: sum,
    mean: mean,
    makeLevelData: makeLevelData,
    move: move,
    isLevel: isLevel,
    missingValue: missingValue,
    SPINNERS: SPINNERS,
    COLOR_NAMES: COLOR_NAMES,
    simulate: simulate,
    sequenceOf: sequenceOf,
    LEVEL_WORDS: LEVEL_WORDS,
    SITUATIONS: SITUATIONS,
    DICE_CARDS: DICE_CARDS,
    numberWord: numberWord
  };
})(typeof window !== 'undefined' ? window : globalThis);
