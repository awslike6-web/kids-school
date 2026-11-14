// 5-2 수학 4단원 소수의 곱셈: 계산·문제 만들기 순수 모듈 (DecimalCore, DOM 없음 · 시험 대상)
// 소수는 부동소수 대신 { int: 정수, places: 소수점 아래 자리 수 } 로 다룬다. 2.4 = { int: 24, places: 1 }
(function (global) {
  'use strict';

  function dec(int, places) {
    return { int: int, places: places || 0 };
  }

  // '2.4' → { int: 24, places: 1 }, '8' → { int: 8, places: 0 }
  function parse(str) {
    var s = String(str).trim();
    var dot = s.indexOf('.');
    if (dot < 0) return dec(parseInt(s, 10), 0);
    var digits = s.slice(0, dot) + s.slice(dot + 1);
    return dec(parseInt(digits, 10), s.length - dot - 1);
  }

  // 소수점 아래 자리를 그대로 둔 표기 (3.60처럼 끝자리 0 유지)
  function formatRaw(d) {
    var neg = d.int < 0;
    var digits = String(Math.abs(d.int));
    if (d.places <= 0) return (neg ? '-' : '') + digits;
    while (digits.length <= d.places) digits = '0' + digits;
    var cut = digits.length - d.places;
    return (neg ? '-' : '') + digits.slice(0, cut) + '.' + digits.slice(cut);
  }

  // 끝자리 0을 지운 표기 (3.60 → 3.6, 2.00 → 2)
  function format(d) {
    var s = formatRaw(d);
    if (s.indexOf('.') < 0) return s;
    s = s.replace(/0+$/, '');
    return s.charAt(s.length - 1) === '.' ? s.slice(0, -1) : s;
  }

  function mul(a, b) {
    return dec(a.int * b.int, a.places + b.places);
  }

  // 자리 수가 다른 두 소수의 크기 비교 (-1, 0, 1)
  function compare(a, b) {
    var p = Math.max(a.places, b.places);
    var x = a.int * Math.pow(10, p - a.places);
    var y = b.int * Math.pow(10, p - b.places);
    return x < y ? -1 : x > y ? 1 : 0;
  }

  // 소수점 찍기 판에 쓰는 숫자 칸. 자연수 곱의 숫자가 모자라면 앞에 0을 채운다.
  // 0.04×0.7: 자연수 곱 28, 자리 3 → digits '0028', padded 2, slot 1 (0.028)
  function pointSlots(product) {
    var raw = String(Math.abs(product.int));
    var digits = raw;
    while (digits.length <= product.places) digits = '0' + digits;
    return {
      digits: digits,
      padded: digits.length - raw.length,
      slot: digits.length - product.places,
      trailingZeros: (formatRaw(product).match(/0+$/) || [''])[0].length * (product.places > 0 ? 1 : 0)
    };
  }

  function randInt(min, max, rng) {
    var rand = typeof rng === 'function' ? rng : Math.random;
    return min + Math.floor(rand() * (max - min + 1));
  }

  function pick(list, rng) {
    return list[randInt(0, list.length - 1, rng)];
  }

  // 1관: (자연수)×(1보다 작은 소수). 곱이 자연수가 되는 조합(5×0.4=2)은 뺀다.
  function makeLab1(rng) {
    for (var t = 0; t < 50; t += 1) {
      var n = randInt(2, 9, rng);
      var d = randInt(1, 9, rng);
      if ((n * d) % 10 !== 0) return { a: dec(n, 0), b: dec(d, 1) };
    }
    return { a: dec(6, 0), b: dec(7, 1) };
  }

  // 2관: (자연수)×(1보다 큰 소수) 2~9 × 1.1~2.9, 곱의 끝자리가 0이 아니게
  function makeLab2(rng) {
    for (var t = 0; t < 50; t += 1) {
      var n = randInt(2, 9, rng);
      var w = randInt(1, 2, rng);
      var f = randInt(1, 9, rng);
      var b = dec(w * 10 + f, 1);
      if ((n * b.int) % 10 !== 0) return { a: dec(n, 0), b: b };
    }
    return { a: dec(5, 0), b: dec(17, 1) };
  }

  // 3관: (1보다 작은 소수)×(1보다 작은 소수) 0.2~0.9 끼리, 끝자리 0 없이
  function makeLab3(rng) {
    for (var t = 0; t < 50; t += 1) {
      var x = randInt(2, 9, rng);
      var y = randInt(2, 9, rng);
      if ((x * y) % 10 !== 0) return { a: dec(x, 1), b: dec(y, 1) };
    }
    return { a: dec(7, 1), b: dec(8, 1) };
  }

  // 4관: (1보다 큰 소수)×(1보다 큰 소수) 1.1~2.9 × 1.1~1.9 (넓이 4조각이 모두 보이게 소수 부분 0 아님)
  function makeLab4(rng) {
    var a = dec(randInt(1, 2, rng) * 10 + randInt(1, 9, rng), 1);
    var b = dec(10 + randInt(1, 9, rng), 1);
    return { a: a, b: b };
  }

  // 넓이 4조각: 2.4×1.5 → [2×1, 0.4×1, 2×0.5, 0.4×0.5]
  function areaParts(a, b) {
    var aw = Math.floor(a.int / 10);
    var af = a.int % 10;
    var bw = Math.floor(b.int / 10);
    var bf = b.int % 10;
    return [
      { w: dec(aw, 0), h: dec(bw, 0), area: dec(aw * bw, 0) },
      { w: dec(af, 1), h: dec(bw, 0), area: dec(af * bw, 1) },
      { w: dec(aw, 0), h: dec(bf, 1), area: dec(aw * bf, 1) },
      { w: dec(af, 1), h: dec(bf, 1), area: dec(af * bf, 2) }
    ];
  }

  // 6관 소수점 찍기 훈련: 종류를 고르게 섞고, 끝자리 0·앞자리 0 채우기 문제를 한 판에 한 번씩 넣는다.
  var DRILL_KINDS = ['nat-dec', 'dec-nat', 'dec1-dec1', 'dec2-nat', 'dec1-dec2', 'trailing-zero', 'leading-zero'];

  function makeDrill(kind, rng) {
    for (var t = 0; t < 80; t += 1) {
      var p = null;
      if (kind === 'nat-dec') p = { a: dec(randInt(3, 25, rng), 0), b: dec(randInt(11, 39, rng), 1) };
      else if (kind === 'dec-nat') p = { a: dec(randInt(11, 59, rng), 1), b: dec(randInt(2, 9, rng), 0) };
      else if (kind === 'dec1-dec1') p = { a: dec(randInt(11, 49, rng), 1), b: dec(randInt(11, 29, rng), 1) };
      else if (kind === 'dec2-nat') p = { a: dec(randInt(101, 499, rng), 2), b: dec(randInt(2, 9, rng), 0) };
      else if (kind === 'dec1-dec2') p = { a: dec(randInt(2, 9, rng), 1), b: dec(randInt(11, 59, rng), 2) };
      else if (kind === 'trailing-zero') {
        var pair = pick([[25, 14], [15, 12], [35, 12], [45, 16], [12, 15], [24, 15], [16, 25], [32, 15]], rng);
        return { a: dec(pair[0], 1), b: dec(pair[1], 1), kind: kind };
      } else if (kind === 'leading-zero') {
        var lz = pick([[4, 2, 7, 1], [3, 2, 2, 1], [2, 2, 4, 1], [6, 1, 1, 2], [9, 2, 3, 1], [12, 2, 3, 1], [8, 2, 1, 1]], rng);
        return { a: dec(lz[0], lz[1]), b: dec(lz[2], lz[3]), kind: kind };
      }
      if (!p) break;
      var prod = mul(p.a, p.b);
      if (prod.int % 10 !== 0 && p.a.int % 10 !== 0 && p.b.int % 10 !== 0) {
        p.kind = kind;
        return p;
      }
    }
    return { a: dec(27, 1), b: dec(12, 1), kind: 'dec1-dec1' };
  }

  // 한 판 문제 목록 (기본 5문제: 일반 3 + 끝자리 0 1 + 앞자리 0 1, 순서 섞음)
  function makeDrillSet(count, rng) {
    var n = count || 5;
    var plain = ['nat-dec', 'dec-nat', 'dec1-dec1', 'dec2-nat', 'dec1-dec2'];
    var kinds = ['trailing-zero', 'leading-zero'];
    var pool = plain.slice();
    while (kinds.length < n) {
      if (!pool.length) pool = plain.slice();
      kinds.push(pool.splice(randInt(0, pool.length - 1, rng), 1)[0]);
    }
    var set = kinds.slice(0, n).map(function (k) { return makeDrill(k, rng); });
    for (var i = set.length - 1; i > 0; i -= 1) {
      var j = randInt(0, i, rng);
      var tmp = set[i];
      set[i] = set[j];
      set[j] = tmp;
    }
    return set;
  }

  // 3지선다 보기: 정답과 소수점 위치만 다른 두 값 (×10, ÷10). 모두 다른 글자가 되게 한다.
  function pointChoices(product) {
    var right = format(product);
    var up = format(dec(product.int, Math.max(product.places - 1, 0)));
    var down = format(dec(product.int, product.places + 1));
    var list = [right, up === right ? format(dec(product.int * 10, product.places)) : up, down];
    return { choices: list, answer: 0 };
  }

  global.DecimalCore = {
    dec: dec,
    parse: parse,
    format: format,
    formatRaw: formatRaw,
    mul: mul,
    compare: compare,
    pointSlots: pointSlots,
    areaParts: areaParts,
    pointChoices: pointChoices,
    makeLab1: makeLab1,
    makeLab2: makeLab2,
    makeLab3: makeLab3,
    makeLab4: makeLab4,
    makeDrill: makeDrill,
    makeDrillSet: makeDrillSet,
    DRILL_KINDS: DRILL_KINDS,
    randInt: randInt
  };
})(typeof window !== 'undefined' ? window : globalThis);
