// 초등 4학년 1학기 큰 수 탐험관 순수 계산 모듈 (BigNumCore)
// 1조 대 수까지 다루므로 Number 안전 범위(2^53) 안. 쉼표·한글 단위 읽기는 직접 만든다(toLocaleString은 환경마다 다름).
(function (global) {
  'use strict';

  // 16자리 자릿값(천조 → 일). desc는 사실과 맞는 비유만 둔다(2026-11-28 옮기며 틀린 비유 정리).
  var PLACES = [
    { key: 'chunjo', name: '천조', exp: 15, sub: '100조가 10개 모인 수', desc: '0이 15개! 상상하기도 어려운 큰 수예요.' },
    { key: 'baekjo', name: '백조', exp: 14, sub: '10조가 10개 모인 수', desc: '0이 14개예요. 1조가 100개 모인 수예요.' },
    { key: 'sipjo', name: '십조', exp: 13, sub: '1조가 10개 모인 수', desc: '0이 13개예요. 1억이 10만 개 모인 수예요.' },
    { key: 'jo', name: '1조', exp: 12, sub: '1000억이 10개 모인 수', desc: '우리은하의 별(약 1000억~4000억 개)보다도 많아요.' },
    { key: 'chuneok', name: '천억', exp: 11, sub: '100억이 10개 모인 수', desc: '우리은하의 별 수(약 1000억~4000억 개)와 비슷한 크기예요.' },
    { key: 'baekeok', name: '백억', exp: 10, sub: '10억이 10개 모인 수', desc: '지구에 사는 모든 사람(약 80억 명)보다 많아요.' },
    { key: 'sipeok', name: '십억', exp: 9, sub: '1억이 10개 모인 수', desc: '0이 9개예요. 1만이 10만 개 모인 수예요.' },
    { key: 'eok', name: '1억', exp: 8, sub: '1000만이 10개 모인 수', desc: '우리나라 사람 수(약 5천만 명)의 두 배쯤이에요.' },
    { key: 'chunman', name: '천만', exp: 7, sub: '100만이 10개 모인 수', desc: '서울에 사는 사람 수(약 1000만 명)쯤이에요.' },
    { key: 'baekman', name: '백만', exp: 6, sub: '10만이 10개 모인 수', desc: '큰 도시 하나에 사는 사람 수쯤이에요.' },
    { key: 'sipman', name: '십만', exp: 5, sub: '1만이 10개 모인 수', desc: '작은 시나 군 하나에 사는 사람 수쯤이에요.' },
    { key: 'man', name: '1만', exp: 4, sub: '1000이 10개 모인 수', desc: '실내 체육관을 가득 채운 관중 수쯤이에요.' },
    { key: 'chun', name: '천', exp: 3, sub: '100이 10개 모인 수', desc: '큰 초등학교의 전체 학생 수쯤이에요.' },
    { key: 'baek', name: '백', exp: 2, sub: '10이 10개 모인 수', desc: '시험 100점 만점의 100이에요.' },
    { key: 'sip', name: '십', exp: 1, sub: '1이 10개 모인 수', desc: '양손 손가락 수예요.' },
    { key: 'il', name: '일', exp: 0, sub: '가장 작은 낱개 1', desc: '사과 한 개예요.' }
  ];
  var GROUP_NAMES = ['조', '억', '만', '일'];
  var STEPS = [1000, 10000, 1000000, 100000000];
  var PLACE_OF_STEP = { 1000: '천의 자리', 10000: '만의 자리', 1000000: '백만의 자리', 100000000: '억의 자리' };

  function rand(rng) {
    return typeof rng === 'function' ? rng : Math.random;
  }

  function randInt(lo, hi, rng) {
    return lo + Math.floor(rand(rng)() * (hi - lo + 1));
  }

  function pick(list, rng) {
    return list[Math.floor(rand(rng)() * list.length)];
  }

  function pow10(e) {
    var n = 1;
    for (var i = 0; i < e; i += 1) n *= 10;
    return n;
  }

  // 34000 → '34,000'
  function comma(n) {
    var s = String(Math.round(n));
    var out = '';
    while (s.length > 3) {
      out = ',' + s.slice(-3) + out;
      s = s.slice(0, -3);
    }
    return s + out;
  }

  // 교과서 읽기 표기: 540000000 → '5억 4000만', 2300000000000 → '2조 3000억', 85000 → '8만 5000', 0 → '0'
  function korean(n) {
    var v = Math.round(n);
    if (v === 0) return '0';
    var units = ['', '만', '억', '조'];
    var parts = [];
    for (var i = 0; v > 0 && i < units.length; i += 1) {
      var g = v % 10000;
      if (g > 0) parts.unshift(g + units[i]);
      v = Math.floor(v / 10000);
    }
    if (v > 0) throw new Error('조보다 큰 단위는 다루지 않습니다');
    return parts.join(' ');
  }

  function placeIndex(key) {
    for (var i = 0; i < PLACES.length; i += 1) if (PLACES[i].key === key) return i;
    return -1;
  }

  // 지수 → 자리 이름: 7 → '천만의 자리', 8 → '억의 자리', 0 → '일의 자리'
  function placeName(exp) {
    for (var i = 0; i < PLACES.length; i += 1) {
      if (PLACES[i].exp === exp) return PLACES[i].name.replace(/^1/, '') + '의 자리';
    }
    throw new Error('없는 자리: ' + exp);
  }

  // 자릿값 표 한 줄: 고른 자리에 1, 그 뒤는 0, 앞은 빈칸('')
  function digitRow(index) {
    var row = [];
    for (var i = 0; i < PLACES.length; i += 1) row.push(i < index ? '' : (i === index ? '1' : '0'));
    return row;
  }

  // 1관 미션: 찾을 자리(일은 빼고, 직전과 다름)
  function placeTarget(rng, prev) {
    var i;
    var guard = 0;
    do {
      i = randInt(0, PLACES.length - 2, rng);
      guard += 1;
    } while (i === prev && guard < 20);
    return i;
  }

  // 2관 문제: 뛰어 세기 5칸 중 한 칸이 빈칸. 받아올림 없이 그 자리 숫자만 1씩 커지게 시작 수를 고른다.
  function makeSkip(rng, step) {
    var s = step || pick(STEPS, rng);
    var start;
    if (s === 1000) start = randInt(1, 9, rng) * 10000 + randInt(0, 5, rng) * 1000 + randInt(0, 9, rng) * 100;
    else if (s === 10000) start = randInt(1, 9, rng) * 100000 + randInt(0, 5, rng) * 10000 + randInt(0, 9, rng) * 1000;
    else if (s === 1000000) start = randInt(1, 9, rng) * 10000000 + randInt(0, 5, rng) * 1000000 + randInt(0, 9, rng) * 100000;
    else start = randInt(1, 9, rng) * 1000000000 + randInt(0, 5, rng) * 100000000 + randInt(0, 9, rng) * 10000000;
    var values = [];
    for (var i = 0; i < 5; i += 1) values.push(start + s * i);
    var blank = randInt(1, 4, rng);
    var answer = values[blank];
    var before = values[blank - 1];
    var wrongs = [before + s * 10, before + s / 10];
    return {
      step: s,
      place: PLACE_OF_STEP[s],
      start: start,
      values: values,
      blank: blank,
      answer: answer,
      choices: [comma(answer)].concat(wrongs.map(comma)),
      answerIndex: 0
    };
  }

  // 3관 문제: 두 수 크기 비교. kind 'digits'(자릿수가 다름) | 'top'(자릿수 같고 높은 자리부터)
  function makeCompare(rng, kind) {
    var k = kind || pick(['digits', 'top', 'top'], rng);
    var a, b, len;
    if (k === 'digits') {
      len = randInt(5, 11, rng);
      a = randInt(pow10(len - 1), pow10(len) - 1, rng);
      b = randInt(pow10(len), pow10(len + 1) - 1, rng);
      a = Math.floor(a / pow10(len - 3)) * pow10(len - 3); // 앞 세 자리만 남겨 읽기 쉽게
      b = Math.floor(b / pow10(len - 2)) * pow10(len - 2);
    } else {
      len = randInt(6, 13, rng);
      var head = randInt(1, 9, rng) * pow10(len - 1);
      var d1 = randInt(0, 9, rng);
      var d2;
      do { d2 = randInt(0, 9, rng); } while (d2 === d1);
      a = head + d1 * pow10(len - 2) + randInt(0, 9, rng) * pow10(len - 3);
      b = head + d2 * pow10(len - 2) + randInt(0, 9, rng) * pow10(len - 3);
    }
    var diffExp = k === 'top' ? len - 2 : null;
    if (rand(rng)() < 0.5) { var t = a; a = b; b = t; }
    var sign = a > b ? '>' : (a < b ? '<' : '=');
    return {
      kind: k,
      a: a,
      b: b,
      sign: sign,
      digitsA: String(a).length,
      digitsB: String(b).length,
      diffPlace: diffExp === null ? '' : placeName(diffExp),
      choices: ['>', '<', '='],
      answerIndex: sign === '>' ? 0 : (sign === '<' ? 1 : 2)
    };
  }

  global.BigNumCore = {
    PLACES: PLACES,
    GROUP_NAMES: GROUP_NAMES,
    STEPS: STEPS,
    PLACE_OF_STEP: PLACE_OF_STEP,
    pow10: pow10,
    comma: comma,
    korean: korean,
    placeIndex: placeIndex,
    placeName: placeName,
    digitRow: digitRow,
    placeTarget: placeTarget,
    makeSkip: makeSkip,
    makeCompare: makeCompare
  };
})(typeof window !== 'undefined' ? window : globalThis);
