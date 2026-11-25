// 4-1 곱셈과 나눗셈 순수 계산 부품 MulDivCore (docs/math_4-1_muldiv_spec.md §4-1·§5·§6, DOM 없음)
(function (global) {
  'use strict';

  var LAB_KINDS = {
    1: ['mul-tens-helped', 'mul-tens', 'mul-tens-zero'],
    2: ['mul-2d-easy', 'mul-2d', 'mul-2d'],
    3: ['div-tens', 'div-tens', 'div-tens-rem'],
    4: ['div-2by2', 'div-2by2-rem', 'div-2by2-rem'],
    5: ['div-3by2-one', 'div-3by2-one-rem', 'div-check'],
    6: ['div-3by2-two', 'div-3by2-two-rem', 'div-3by2-two-rem']
  };

  var MIXED_KINDS = ['mul-tens', 'mul-tens-zero', 'div-tens', 'div-tens-rem', 'div-2by2', 'div-2by2-rem',
    'div-3by2-one', 'div-3by2-one-rem', 'div-check'];

  // 섞기 라운드 정렬용 순서 맵
  var KIND_ORDER = {};
  var ki;
  for (ki = 0; ki < MIXED_KINDS.length; ki += 1) KIND_ORDER[MIXED_KINDS[ki]] = ki;

  var POOLS = {};

  function randInt(lo, hi, rng) {
    return Math.floor(rng() * (hi - lo + 1)) + lo;
  }

  // 기본 연산 함수
  function mulTens(a, t) {
    var base = a * (t / 10);
    return { base: base, answer: base * 10 };
  }

  function mul2(a, b) {
    var d1 = b % 10;
    var d2 = Math.floor(b / 10);
    var ones = a * d1;
    var tens = a * d2 * 10;
    return { ones: ones, tens: tens, answer: ones + tens };
  }

  function divide(a, b) {
    return { q: Math.floor(a / b), r: a % b };
  }

  function divTens(a, b) {
    var a2 = a / 10;
    var b2 = b / 10;
    var q = Math.floor(a2 / b2);
    var r2 = a2 % b2;
    return { a2: a2, b2: b2, q: q, r2: r2, r: r2 * 10 };
  }

  function longDivide(a, b) {
    var s = String(a);
    var len = s.length;
    var idx = 0;
    var take = 0;
    var steps = [];

    // 첫 단계: 맨 앞부터 b 이상이 될 때까지 자리를 모음
    while (idx < len) {
      take = take * 10 + Number(s.charAt(idx));
      idx += 1;
      if (take >= b) break;
    }

    while (true) {
      var stepQ = Math.floor(take / b);
      var prod = stepQ * b;
      var remain = take - prod;
      var next = null;
      if (idx < len) {
        next = remain * 10 + Number(s.charAt(idx));
        idx += 1;
      }
      steps.push({ q: stepQ, take: take, product: prod, remain: remain, next: next });
      if (next === null) break;
      take = next;
    }

    return { q: Math.floor(a / b), r: a % b, steps: steps };
  }

  // 값과 글자 변환
  function token(v) {
    if (typeof v === 'number') return String(v);
    if (v && v.check) return v.b + '×' + v.x + (v.sign === '-' ? '-' : '+') + v.y;
    if (v && typeof v.q === 'number') return v.r === 0 ? String(v.q) : v.q + '…' + v.r;
    return '';
  }

  function label(v) {
    if (typeof v === 'number') return String(v);
    if (v && v.check) return v.b + ' × ' + v.x + (v.sign === '-' ? ' − ' : ' + ') + v.y;
    if (v && typeof v.q === 'number') return v.r === 0 ? '몫 ' + v.q : '몫 ' + v.q + ', 나머지 ' + v.r;
    return '';
  }

  function checkText(a, b, q, r) {
    if (r > 0) return b + ' × ' + q + ' + ' + r + ' = ' + a;
    return b + ' × ' + q + ' = ' + a;
  }

  // 받아올림/받아내림 실수 모형
  function hasMulCarry(a, d) {
    var carry = 0;
    var n = a;
    while (n >= 10) {
      var prod = (n % 10) * d + carry;
      if (prod >= 10) return true;
      carry = Math.floor(prod / 10);
      n = Math.floor(n / 10);
    }
    return false;
  }

  function carryLostMul(a, d) {
    var s = String(a);
    var out = '';
    var i;
    for (i = 0; i < s.length; i += 1) {
      var prod = Number(s.charAt(i)) * d;
      if (i === 0) {
        out += String(prod);
      } else {
        out += String(prod % 10);
      }
    }
    return Number(out);
  }

  function addCarryLost(x, y) {
    var tx = x;
    var ty = y;
    var place = 1;
    var res = 0;
    if (tx === 0 && ty === 0) return 0;
    while (tx > 0 || ty > 0) {
      var sumDigit = ((tx % 10) + (ty % 10)) % 10;
      res += sumDigit * place;
      place *= 10;
      tx = Math.floor(tx / 10);
      ty = Math.floor(ty / 10);
    }
    return res;
  }

  function subBorrowLost(x, y) {
    var tx = x;
    var ty = y;
    var place = 1;
    var res = 0;
    var borrowed = false;
    while (tx > 0 || ty > 0) {
      var dx = tx % 10;
      var dy = ty % 10;
      if (dx < dy) {
        res += (dx + 10 - dy) * place;
        borrowed = true;
      } else {
        res += (dx - dy) * place;
      }
      place *= 10;
      tx = Math.floor(tx / 10);
      ty = Math.floor(ty / 10);
    }
    return borrowed ? res : null;
  }

  function subReverse(x, y) {
    var tx = x;
    var ty = y;
    var place = 1;
    var res = 0;
    while (tx > 0 || ty > 0) {
      var dx = tx % 10;
      var dy = ty % 10;
      res += Math.abs(dx - dy) * place;
      place *= 10;
      tx = Math.floor(tx / 10);
      ty = Math.floor(ty / 10);
    }
    return res === (x - y) ? null : res;
  }

  // 문제 풀 생성
  function buildMulTensPool(kind) {
    var list = [];
    var a, b, d, res;
    for (a = 112; a <= 499; a += 1) {
      if (a % 10 === 0) continue;
      for (b = 20; b <= 50; b += 10) {
        d = b / 10;
        if (!hasMulCarry(a, d)) continue;
        res = mulTens(a, b);
        list.push({ kind: kind, a: a, b: b, base: res.base, answer: res.answer, answerText: token(res.answer) });
      }
    }
    return list;
  }

  function buildMulTensZeroPool() {
    var list = [];
    var a, b, res;
    for (a = 110; a <= 490; a += 10) {
      if ((a / 10) % 10 === 0) continue;
      for (b = 20; b <= 50; b += 10) {
        res = mulTens(a, b);
        if (res.answer % 1000 !== 0) continue;
        list.push({
          kind: 'mul-tens-zero',
          a: a,
          b: b,
          base: res.base,
          answer: res.answer,
          answerText: token(res.answer)
        });
      }
    }
    return list;
  }

  function makeMul2Problem(kind, a, b, res) {
    return {
      kind: kind,
      a: a,
      b: b,
      answer: res.answer,
      answerText: token(res.answer),
      parts: {
        ones: { answer: res.ones, answerText: token(res.ones) },
        tens: { answer: res.tens, answerText: token(res.tens) },
        sum: { answer: res.answer, answerText: token(res.answer) }
      }
    };
  }

  function buildMul2EasyPool() {
    var list = [];
    var bs = [22, 23, 32, 33];
    var a, bi, b, res;
    for (a = 112; a <= 399; a += 1) {
      for (bi = 0; bi < bs.length; bi += 1) {
        b = bs[bi];
        if (!hasMulCarry(a, b % 10)) continue;
        res = mul2(a, b);
        list.push(makeMul2Problem('mul-2d-easy', a, b, res));
      }
    }
    return list;
  }

  function buildMul2Pool() {
    var list = [];
    var a, b, d1, d2, res;
    for (a = 112; a <= 499; a += 1) {
      for (b = 22; b <= 59; b += 1) {
        d1 = b % 10;
        d2 = Math.floor(b / 10);
        if (d1 < 2 || d2 < 2) continue;
        if (!hasMulCarry(a, d1) || !hasMulCarry(a, d2)) continue;
        res = mul2(a, b);
        if (res.ones > 9999 || res.tens > 99999 || res.answer > 99999) continue;
        list.push(makeMul2Problem('mul-2d', a, b, res));
      }
    }
    return list;
  }

  function buildDivTensPool(withRem) {
    var list = [], kind = withRem ? 'div-tens-rem' : 'div-tens';
    var b, q, r, a, res, ans;
    for (b = withRem ? 30 : 20; b <= 90; b += 10) {
      for (q = 2; q <= 9; q += 1) {
        for (r = withRem ? 10 : 0; r <= (withRem ? b - 10 : 0); r += 10) {
          a = b * q + r;
          if (a < 100 || a > 990) continue;
          res = divTens(a, b);
          ans = { q: res.q, r: res.r };
          list.push({ kind: kind, a: a, b: b, q: res.q, r: res.r, a2: res.a2, b2: res.b2, r2: res.r2, answer: ans, answerText: token(ans) });
        }
      }
    }
    return list;
  }

  function buildDiv2by2Pool(withRem) {
    var list = [], kind = withRem ? 'div-2by2-rem' : 'div-2by2';
    var b, q, r, a, ans;
    for (b = 11; b <= 49; b += 1) {
      if (b % 10 === 0) continue;
      for (q = 2; q <= 8; q += 1) {
        for (r = withRem ? 1 : 0; r <= (withRem ? b - 1 : 0); r += 1) {
          a = b * q + r;
          if (a < 10 || a > 99) continue;
          ans = { q: q, r: r };
          list.push({ kind: kind, a: a, b: b, q: q, r: r, answer: ans, answerText: token(ans) });
        }
      }
    }
    return list;
  }

  function buildDiv3by2OnePool(withRem) {
    var list = [];
    var kind = withRem ? 'div-3by2-one-rem' : 'div-3by2-one';
    var b, q, r, rMax, a, ld, ans;
    for (b = 12; b <= 49; b += 1) {
      if (b % 10 === 0) continue;
      for (q = 3; q <= 9; q += 1) {
        rMax = withRem ? b - 1 : 0;
        for (r = (withRem ? 1 : 0); r <= rMax; r += 1) {
          a = b * q + r;
          if (a < 100 || a > 489 || Math.floor(a / 10) >= b) continue;
          ld = longDivide(a, b);
          ans = { q: ld.q, r: ld.r };
          list.push({ kind: kind, a: a, b: b, q: ld.q, r: ld.r, steps: ld.steps, answer: ans, answerText: token(ans) });
        }
      }
    }
    return list;
  }

  function buildDivCheckPool() {
    var basePool = getPool('div-3by2-one-rem');
    var list = [];
    var i, p, ans;
    for (i = 0; i < basePool.length; i += 1) {
      p = basePool[i];
      if (p.q === p.r) continue;
      ans = { check: true, b: p.b, x: p.q, y: p.r, sign: '+' };
      list.push({ kind: 'div-check', a: p.a, b: p.b, q: p.q, r: p.r, answer: ans, answerText: token(ans) });
    }
    return list;
  }

  function buildDiv3by2TwoPool(withRem) {
    var list = [];
    var kind = withRem ? 'div-3by2-two-rem' : 'div-3by2-two';
    var b, q, r, rMax, a, ld, ans, parts;
    for (b = 12; b <= 39; b += 1) {
      if (b % 10 === 0) continue;
      for (q = 11; q <= 39; q += 1) {
        if (q % 10 === 0) continue;
        rMax = withRem ? b - 1 : 0;
        for (r = (withRem ? 1 : 0); r <= rMax; r += 1) {
          a = b * q + r;
          if (a < 100 || a > 999 || Math.floor(a / 10) < b) continue;
          ld = longDivide(a, b);
          ans = { q: ld.q, r: ld.r };
          parts = {
            q1: { answer: ld.steps[0].q, answerText: token(ld.steps[0].q) },
            q2: { answer: ld.steps[1].q, answerText: token(ld.steps[1].q) }
          };
          if (withRem) {
            parts.rem = { answer: ld.r, answerText: token(ld.r) };
          }
          list.push({
            kind: kind,
            a: a,
            b: b,
            q: ld.q,
            r: ld.r,
            steps: ld.steps,
            parts: parts,
            answer: ans,
            answerText: token(ans)
          });
        }
      }
    }
    return list;
  }

  var POOL_BUILDERS = {
    'mul-tens': function () { return buildMulTensPool('mul-tens'); },
    'mul-tens-helped': function () { return buildMulTensPool('mul-tens-helped'); },
    'mul-tens-zero': buildMulTensZeroPool,
    'mul-2d-easy': buildMul2EasyPool,
    'mul-2d': buildMul2Pool,
    'div-tens': function () { return buildDivTensPool(false); },
    'div-tens-rem': function () { return buildDivTensPool(true); },
    'div-2by2': function () { return buildDiv2by2Pool(false); },
    'div-2by2-rem': function () { return buildDiv2by2Pool(true); },
    'div-3by2-one': function () { return buildDiv3by2OnePool(false); },
    'div-3by2-one-rem': function () { return buildDiv3by2OnePool(true); },
    'div-check': buildDivCheckPool,
    'div-3by2-two': function () { return buildDiv3by2TwoPool(false); },
    'div-3by2-two-rem': function () { return buildDiv3by2TwoPool(true); }
  };

  function getPool(kind) {
    if (!POOL_BUILDERS[kind]) throw new Error('알 수 없는 문제 종류: ' + kind);
    if (!POOLS[kind]) POOLS[kind] = POOL_BUILDERS[kind]();
    return POOLS[kind];
  }

  function makeProblem(kind, rng) {
    var pool = getPool(kind);
    return pool[randInt(0, pool.length - 1, rng)];
  }

  // 오답 후보 생성
  function buildWrongCandidates(p, slot, ans) {
    var k = p.kind;
    var a = p.a;
    var b = p.b;
    var cands = [];
    var d, d1, d2, ones, tens, subErr, revErr, step1, q1, q2;

    if (k === 'mul-tens' || k === 'mul-tens-helped' || k === 'mul-tens-zero') {
      d = b / 10;
      cands.push({ value: ans / 10, mistake: 'zero-lost' });
      cands.push({ value: carryLostMul(a, d) * 10, mistake: 'carry-lost' });
      cands.push({ value: a * (d + 1) * 10, mistake: 'next-times' });
      cands.push({ value: a * (d - 1) * 10, mistake: 'next-times' });
      cands.push({ value: ans * 10, mistake: 'zero-extra' });
      return cands;
    }

    if (slot === 'ones') {
      d1 = b % 10;
      d2 = Math.floor(b / 10);
      cands.push({ value: carryLostMul(a, d1), mistake: 'carry-lost' });
      cands.push({ value: a * d2, mistake: 'other-digit' });
      cands.push({ value: a * (d1 + 1), mistake: 'next-times' });
      cands.push({ value: a * (d1 - 1), mistake: 'next-times' });
      return cands;
    }

    if (slot === 'tens') {
      d1 = b % 10;
      d2 = Math.floor(b / 10);
      cands.push({ value: a * d2, mistake: 'shift-lost' });
      cands.push({ value: a * d1 * 10, mistake: 'other-digit' });
      cands.push({ value: a * (d2 + 1) * 10, mistake: 'next-times' });
      cands.push({ value: a * (d2 - 1) * 10, mistake: 'next-times' });
      return cands;
    }

    if (slot === 'sum') {
      ones = p.parts.ones.answer;
      tens = p.parts.tens.answer;
      cands.push({ value: addCarryLost(ones, tens), mistake: 'add-carry-lost' });
      cands.push({ value: ones + Math.floor(tens / 10), mistake: 'shift-lost-sum' });
      cands.push({ value: ans + 100, mistake: 'place-slip' });
      cands.push({ value: ans - 100, mistake: 'place-slip' });
      return cands;
    }

    if (k === 'div-tens' || k === 'div-2by2' || k === 'div-3by2-one') {
      if (k === 'div-tens') {
        cands.push({ value: { q: p.q * 10, r: 0 }, mistake: 'quot-zero' });
      }
      cands.push({ value: { q: p.q - 1, r: 0 }, mistake: 'digit-low' });
      cands.push({ value: { q: p.q - 2, r: 0 }, mistake: 'digit-low' });
      cands.push({ value: { q: p.q + 1, r: 0 }, mistake: 'digit-high' });
      cands.push({ value: { q: p.q + 2, r: 0 }, mistake: 'digit-high' });
      return cands;
    }

    if (k === 'div-tens-rem' || k === 'div-2by2-rem' || k === 'div-3by2-one-rem') {
      if (k === 'div-tens-rem') {
        cands.push({ value: { q: p.q, r: p.r2 }, mistake: 'rem-no-zero' });
      }
      cands.push({ value: { q: p.q - 1, r: p.r + b }, mistake: 'rem-too-big' });
      cands.push({ value: { q: p.q - 2, r: p.r + 2 * b }, mistake: 'rem-too-big' });
      cands.push({ value: { q: p.q + 1, r: p.r }, mistake: 'over' });
      cands.push({ value: { q: p.q + 2, r: p.r }, mistake: 'over' });
      subErr = subBorrowLost(a, b * p.q);
      if (subErr !== null) {
        cands.push({ value: { q: p.q, r: subErr }, mistake: 'sub-wrong' });
      }
      return cands;
    }

    if (slot === 'q1') {
      q1 = ans;
      cands.push({ value: 0, mistake: 'q-first-digit' });
      cands.push({ value: q1 + 1, mistake: 'digit-high' });
      cands.push({ value: q1 + 2, mistake: 'digit-high' });
      if (q1 >= 2) {
        cands.push({ value: q1 - 1, mistake: 'digit-low' });
      }
      if (q1 >= 3) {
        cands.push({ value: q1 - 2, mistake: 'digit-low' });
      }
      return cands;
    }

    if (slot === 'q2') {
      q2 = ans;
      if (q2 - 1 >= 1) {
        cands.push({ value: q2 - 1, mistake: 'digit-low' });
      }
      if (q2 + 1 <= 9) {
        cands.push({ value: q2 + 1, mistake: 'digit-high' });
      }
      if (q2 - 2 >= 1) {
        cands.push({ value: q2 - 2, mistake: 'digit-low' });
      }
      if (q2 + 2 <= 9) {
        cands.push({ value: q2 + 2, mistake: 'digit-high' });
      }
      return cands;
    }

    if (slot === 'rem') {
      step1 = p.steps[1];
      subErr = subBorrowLost(step1.take, step1.product);
      if (subErr !== null) {
        cands.push({ value: subErr, mistake: 'sub-wrong' });
      }
      revErr = subReverse(step1.take, step1.product);
      if (revErr !== null) {
        cands.push({ value: revErr, mistake: 'sub-reverse' });
      }
      cands.push({ value: p.r + b, mistake: 'rem-too-big' });
      // 정답보다 작은 오답도 있어야 크기 위치가 고르게 섞인다 (빼기 실수: 십의 자리를 하나 더 뺌)
      if (p.r >= 10) cands.push({ value: p.r - 10, mistake: 'sub-wrong' });
      return cands;
    }

    if (k === 'div-check') {
      cands.push({ value: { check: true, b: b, x: p.q, y: p.r, sign: '-' }, mistake: 'check-minus' });
      cands.push({ value: { check: true, b: b, x: p.r, y: p.q, sign: '+' }, mistake: 'check-swap' });
      return cands;
    }

    return cands;
  }

  function isValidChoice(val, ans, slot, seen) {
    if (val === null || val === undefined) return false;
    if (typeof val === 'number') {
      if (slot === 'q1' || slot === 'rem') {
        if (val < 0) return false;
      } else if (val <= 0) {
        return false;
      }
    } else if (val.check) {
      if (val.x < 0 || val.y < 0) return false;
    } else if (typeof val.q === 'number') {
      if (val.q <= 0 || val.r < 0) return false;
      if (ans && typeof ans.q === 'number') {
        if (ans.r > 0 && val.r < 1) return false;
        if (ans.r === 0 && val.r !== 0) return false;
      }
    } else {
      return false;
    }
    var tok = token(val);
    return !seen[tok];
  }

  // 보정 보기: 수는 ±10 다음 ±1…, 나눗셈은 같은 나머지로 몫 ±3…, 검산식은 곱하는 수 +1…
  function pushFixChoices(out, ans, slot, seen) {
    var offs = [], k, cand, tok;
    if (typeof ans === 'number') offs.push(10, -10);
    for (k = typeof ans === 'number' ? 1 : 3; k <= 30; k += 1) offs.push(k, -k);
    if (typeof ans !== 'number') offs.push(1, -1, 2, -2);
    for (k = 0; k < offs.length && out.length < 2; k += 1) {
      if (typeof ans === 'number') cand = ans + offs[k];
      else if (ans.check) cand = { check: true, b: ans.b, x: ans.x + Math.abs(offs[k]), y: ans.y, sign: '+' };
      else cand = { q: ans.q + offs[k], r: ans.r };
      if (!isValidChoice(cand, ans, slot, seen)) continue;
      tok = token(cand);
      seen[tok] = true;
      out.push({ value: cand, token: tok, mistake: 'fix' });
    }
  }

  // 문제 수로 정하는 고정 차례값 (같은 문제면 늘 같은 보기)
  function mixHash(str) {
    var h = 7, i;
    for (i = 0; i < str.length; i += 1) h = (h * 31 + str.charCodeAt(i)) % 1000003;
    return h;
  }

  // 보기 크기 견주기용 수 (나눗셈은 몫 다음 나머지, 검산식은 식의 값)
  function sizeOf(v) {
    if (typeof v === 'number') return v;
    if (v.check) return v.b * v.x + (v.sign === '-' ? -v.y : v.y);
    return v.q * 1000 + v.r;
  }

  function wrongChoices(p, slot) {
    var ans = slot ? p.parts[slot].answer : p.answer;
    var seen = {};
    seen[token(ans)] = true;

    var cands = buildWrongCandidates(p, slot, ans);
    var out = [];
    var firstIdx = -1;
    var i, c, tok;

    // 첫 후보(①)는 쓸 수 있으면 늘 사용
    for (i = 0; i < cands.length; i += 1) {
      c = cands[i];
      if (isValidChoice(c.value, ans, slot, seen)) {
        tok = token(c.value);
        seen[tok] = true;
        out.push({ value: c.value, token: tok, mistake: c.mistake });
        firstIdx = i;
        break;
      }
    }

    // 둘째 후보: 정답이 늘 같은 크기 위치에 오지 않게, 문제 수로 정한 쪽(정답보다 큰 값/작은 값)을 먼저 찾는다
    if (out.length < 2 && firstIdx >= 0) {
      var rest = cands.slice(firstIdx + 1);
      var h = mixHash(p.a + '|' + p.b);
      var wantBigger = h % 2 === 0;
      var pass, start = rest.length ? h % rest.length : 0;
      for (pass = 0; pass < 2 && out.length < 2; pass += 1) {
        for (i = 0; i < rest.length; i += 1) {
          c = rest[(start + i) % rest.length];
          if (pass === 0 && (sizeOf(c.value) > sizeOf(ans)) !== wantBigger) continue;
          if (isValidChoice(c.value, ans, slot, seen)) {
            tok = token(c.value);
            seen[tok] = true;
            out.push({ value: c.value, token: tok, mistake: c.mistake });
            break;
          }
        }
      }
    }

    if (out.length < 2) pushFixChoices(out, ans, slot, seen);

    return out;
  }

  // 라운드 뽑기
  function problemKey(p) {
    return p.kind + '|' + p.a + '|' + p.b;
  }

  function pickUnique(kind, usedKeys, rng) {
    var p = makeProblem(kind, rng);
    var tries = 0;
    while (usedKeys[problemKey(p)] && tries < 200) {
      p = makeProblem(kind, rng);
      tries += 1;
    }
    usedKeys[problemKey(p)] = true;
    return p;
  }

  function makeRound(lab, rng) {
    var kinds = LAB_KINDS[lab];
    if (!kinds) throw new Error('알 수 없는 관 번호: ' + lab);
    var usedKeys = {};
    var round = [];
    var i;
    for (i = 0; i < kinds.length; i += 1) round.push(pickUnique(kinds[i], usedKeys, rng));
    return round;
  }

  function makeMixedRound(rng, n) {
    var count = (n === undefined || n === null) ? 10 : n;
    var usedKeys = {};
    var kindCounts = {};
    var round = [];
    var i, kind, tries, p;

    for (i = 0; i < count; i += 1) {
      tries = 0;
      kind = MIXED_KINDS[randInt(0, MIXED_KINDS.length - 1, rng)];
      while ((kindCounts[kind] || 0) >= 3 && tries < 200) {
        kind = MIXED_KINDS[randInt(0, MIXED_KINDS.length - 1, rng)];
        tries += 1;
      }
      kindCounts[kind] = (kindCounts[kind] || 0) + 1;
      p = pickUnique(kind, usedKeys, rng);
      round.push(p);
    }

    round.sort(function (x, y) { return KIND_ORDER[x.kind] - KIND_ORDER[y.kind]; });
    return round;
  }

  global.MulDivCore = {
    LAB_KINDS: LAB_KINDS, MIXED_KINDS: MIXED_KINDS, KIND_ORDER: KIND_ORDER,
    mulTens: mulTens, mul2: mul2, divide: divide, divTens: divTens, longDivide: longDivide,
    token: token, label: label, checkText: checkText,
    makeProblem: makeProblem, wrongChoices: wrongChoices, makeRound: makeRound, makeMixedRound: makeMixedRound,
    carryLostMul: carryLostMul, subBorrowLost: subBorrowLost, subReverse: subReverse
  };
})(typeof window !== 'undefined' ? window : globalThis);
