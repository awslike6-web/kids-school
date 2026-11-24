// 초등 1학년 '100까지의 수' 순수 계산 모듈 (docs/math_1_bridge_spec.md §3-1)
(function (global) {
  'use strict';

  var SINO_DIGITS = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
  var NATIVE_TENS = ['', '열', '스물', '서른', '마흔', '쉰', '예순', '일흔', '여든', '아흔'];
  var NATIVE_ONES = ['', '하나', '둘', '셋', '넷', '다섯', '여섯', '일곱', '여덟', '아홉'];

  var LAB_KINDS = {
    1: ['tens-make', 'listen-build', 'count-picture'],
    2: ['read-sino', 'read-native', 'listen-native'],
    3: ['next-1', 'prev-1', 'between'],
    4: ['compare-diff-tens', 'compare-same-tens', 'compare-trap'],
    5: ['pair-candies', 'pair-candies-big', 'which-even']
  };
  var KIND_ORDER = [
    'tens-make', 'listen-build', 'count-picture',
    'read-sino', 'read-native', 'listen-native',
    'next-1', 'prev-1', 'between',
    'compare-diff-tens', 'compare-same-tens', 'compare-trap',
    'pair-candies', 'pair-candies-big', 'which-even'
  ];
  var BINGO_KINDS = ['call-bundle', 'call-sino', 'call-native', 'call-next'];
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

  // 두 자리 정수의 십·일 자리 숫자 분리
  function digits(n) {
    var t = (n - (n % 10)) / 10;
    var o = n % 10;
    return { t: t, o: o };
  }

  // 10~99 한자어 읽기
  function readSino(n) {
    var d = digits(n);
    var out = '';
    if (d.t > 0) out += (d.t === 1 ? '' : SINO_DIGITS[d.t]) + '십';
    if (d.o > 0) out += SINO_DIGITS[d.o];
    return out;
  }

  // 10~99 순우리말 읽기
  function readNative(n) {
    var d = digits(n);
    return NATIVE_TENS[d.t] + (d.o > 0 ? NATIVE_ONES[d.o] : '');
  }

  // 조건 함수로 최대 200회 뽑고 실패 시 고정 예시 반환
  function pickWithRetry(tryFn, fallback) {
    for (var i = 0; i < MAX_TRIES; i++) {
      var res = tryFn();
      if (res !== null) return res;
    }
    return fallback;
  }

  // 문제 유형별 생성
  function makeProblem(kind, rng) {
    var t, o, n, reading, start, cross, a, b, da, db, o1, o2, pair, ans, count, target;
    if (kind === 'tens-make') {
      t = randInt(3, 6, rng);
      n = t * 10;
      return { kind: kind, t: t, o: 0, n: n, answer: n, answerText: String(n) };
    }
    if (kind === 'listen-build') {
      t = randInt(2, 4, rng);
      o = randInt(1, 3, rng);
      n = t * 10 + o;
      return { kind: kind, t: t, o: o, n: n, reading: readSino(n), answer: n, answerText: String(n) };
    }
    if (kind === 'count-picture') {
      t = randInt(1, 9, rng);
      o = randInt(1, 9, rng);
      n = t * 10 + o;
      return { kind: kind, t: t, o: o, n: n, answer: n, answerText: String(n) };
    }
    if (kind === 'read-sino') {
      n = randInt(10, 99, rng);
      reading = readSino(n);
      return { kind: kind, n: n, answer: reading, answerText: reading };
    }
    if (kind === 'read-native') {
      n = randInt(10, 99, rng);
      reading = readNative(n);
      return { kind: kind, n: n, answer: reading, answerText: reading };
    }
    if (kind === 'listen-native') {
      n = randInt(10, 99, rng);
      return { kind: kind, n: n, reading: readNative(n), answer: n, answerText: String(n) };
    }
    if (kind === 'next-1') {
      cross = randInt(0, 1, rng) === 0;
      start = cross ? randInt(1, 8, rng) * 10 + 9 : randInt(1, 9, rng) * 10 + randInt(0, 8, rng);
      n = start + 1;
      return { kind: kind, start: start, step: 1, n: n, answer: n, answerText: String(n) };
    }
    if (kind === 'prev-1') {
      cross = randInt(0, 1, rng) === 0;
      start = cross ? randInt(2, 9, rng) * 10 : randInt(1, 9, rng) * 10 + randInt(1, 9, rng);
      n = start - 1;
      return { kind: kind, start: start, step: -1, n: n, answer: n, answerText: String(n) };
    }
    if (kind === 'between') {
      n = randInt(11, 98, rng);
      return { kind: kind, a: n - 1, b: n + 1, n: n, answer: n, answerText: String(n) };
    }
    if (kind === 'compare-diff-tens') {
      pair = pickWithRetry(function () {
        var x = randInt(10, 99, rng);
        var y = randInt(10, 99, rng);
        return digits(x).t !== digits(y).t ? { a: x, b: y } : null;
      }, { a: 52, b: 37 });
      a = pair.a;
      b = pair.b;
      ans = a > b ? '>' : '<';
      return { kind: kind, a: a, b: b, answer: ans, answerText: ans };
    }
    if (kind === 'compare-same-tens') {
      t = randInt(1, 9, rng);
      o1 = randInt(0, 9, rng);
      a = t * 10 + o1;
      if (randInt(0, 3, rng) === 0) {
        b = a;
        ans = '=';
      } else {
        o2 = pickWithRetry(function () {
          var x = randInt(0, 9, rng);
          return x !== o1 ? x : null;
        }, (o1 + 1) % 10);
        b = t * 10 + o2;
        ans = a > b ? '>' : '<';
      }
      return { kind: kind, a: a, b: b, answer: ans, answerText: ans };
    }
    if (kind === 'compare-trap') {
      pair = pickWithRetry(function () {
        var x = randInt(10, 99, rng);
        var y = randInt(10, 99, rng);
        da = digits(x);
        db = digits(y);
        if ((da.t < db.t && da.o > db.o) || (da.t > db.t && da.o < db.o)) return { a: x, b: y };
        return null;
      }, { a: 38, b: 41 });
      a = pair.a;
      b = pair.b;
      ans = a > b ? '>' : '<';
      return { kind: kind, a: a, b: b, answer: ans, answerText: ans };
    }
    if (kind === 'pair-candies' || kind === 'pair-candies-big') {
      count = kind === 'pair-candies' ? randInt(6, 12, rng) : randInt(13, 20, rng);
      ans = count % 2 === 0 ? '짝수' : '홀수';
      return { kind: kind, count: count, answer: ans, answerText: ans };
    }
    if (kind === 'which-even') {
      target = randInt(0, 1, rng) === 0 ? 'even' : 'odd';
      n = randInt(10, 99, rng);
      if ((n % 2 === 0) !== (target === 'even')) {
        n = n === 99 ? 98 : n + 1;
      }
      return { kind: kind, target: target, n: n, answer: n, answerText: String(n) };
    }
    return makeProblem('tens-make', rng);
  }

  // 보기 배열에 중복·정답과 겹치지 않게 추가
  function pushChoice(list, answerText, value, text, mistake) {
    if (list.length >= 2 || text === answerText) return;
    for (var i = 0; i < list.length; i++) {
      if (list[i].text === text) return;
    }
    list.push({ value: value, text: text, mistake: mistake });
  }

  // 1~99 범위의 숫자 오답 추가
  function pushNum(list, answerText, val, mistake) {
    if (val >= 1 && val <= 99) pushChoice(list, answerText, val, String(val), mistake);
  }

  // 두 자리 수 오답 기본 대체 규칙 (뒤집기 → ±10 → ±1)
  function fillTwoDigitWrongs(list, n, answerText) {
    var d = digits(n);
    var deltas = [10, -10, 1, -1, 2, -2];
    var i, cand;
    if (d.o !== 0 && d.o !== d.t) {
      pushNum(list, answerText, d.o * 10 + d.t, 'swap-digits');
    }
    for (i = 0; i < deltas.length && list.length < 2; i++) {
      cand = n + deltas[i];
      if (cand >= 10 && cand <= 99) {
        pushNum(list, answerText, cand, Math.abs(deltas[i]) === 10 ? 'off-by-ten' : 'off-by-one');
      }
    }
    for (i = 0; i < deltas.length && list.length < 2; i++) {
      pushNum(list, answerText, n + deltas[i], Math.abs(deltas[i]) === 10 ? 'off-by-ten' : 'off-by-one');
    }
  }

  // 문제 유형별 오답 생성
  function wrongChoices(p) {
    var list = [], d, txt, opp, mistake, i, cand, deltas, d1, d2;
    if (p.kind === 'tens-make') {
      pushNum(list, p.answerText, p.t, 'place-ignore');
      pushNum(list, p.answerText, p.n + 10 <= 99 ? p.n + 10 : p.n - 10, 'off-by-ten');
    } else if (p.kind === 'listen-build' || p.kind === 'count-picture' || p.kind === 'listen-native') {
      fillTwoDigitWrongs(list, p.n, p.answerText);
    } else if (p.kind === 'read-sino') {
      d = digits(p.n);
      if (d.o !== 0) {
        txt = SINO_DIGITS[d.t] + SINO_DIGITS[d.o];
        pushChoice(list, p.answerText, txt, txt, 'read-digits');
      } else {
        txt = readSino(p.n) + '영';
        pushChoice(list, p.answerText, txt, txt, 'read-zero');
      }
      if (d.t === 1) {
        txt = '일' + readSino(p.n);
        pushChoice(list, p.answerText, txt, txt, 'read-one-prefix');
      }
      if (d.o !== 0 && d.o !== d.t) {
        txt = readSino(d.o * 10 + d.t);
        pushChoice(list, p.answerText, txt, txt, 'swap-digits');
      }
      deltas = [10, -10, 1, -1];
      for (i = 0; i < deltas.length && list.length < 2; i++) {
        cand = p.n + deltas[i];
        if (cand >= 10 && cand <= 99) {
          txt = readSino(cand);
          pushChoice(list, p.answerText, txt, txt, Math.abs(deltas[i]) === 10 ? 'off-by-ten' : 'off-by-one');
        }
      }
    } else if (p.kind === 'read-native') {
      d = digits(p.n);
      txt = NATIVE_ONES[d.t] + (d.o > 0 ? NATIVE_ONES[d.o] : '');
      pushChoice(list, p.answerText, txt, txt, 'native-digit');
      deltas = [10, -10, 1, -1];
      for (i = 0; i < deltas.length && list.length < 2; i++) {
        cand = p.n + deltas[i];
        if (cand >= 10 && cand <= 99) {
          txt = readNative(cand);
          pushChoice(list, p.answerText, txt, txt, Math.abs(deltas[i]) === 10 ? 'native-neighbor' : 'off-by-one');
        }
      }
    } else if (p.kind === 'next-1' || p.kind === 'prev-1') {
      pushNum(list, p.answerText, p.start + p.step * 10, 'wrong-step');
      pushNum(list, p.answerText, p.start - p.step, 'wrong-direction');
      deltas = [1, -1, 2, -2];
      for (i = 0; i < deltas.length && list.length < 2; i++) {
        pushNum(list, p.answerText, p.n + deltas[i], 'off-by-one');
      }
    } else if (p.kind === 'between') {
      pushNum(list, p.answerText, p.a, 'off-by-one');
      pushNum(list, p.answerText, p.b, 'off-by-one');
    } else if (p.kind === 'compare-diff-tens' || p.kind === 'compare-same-tens' || p.kind === 'compare-trap') {
      if (p.answerText === '=') {
        pushChoice(list, p.answerText, '>', '>', 'not-equal');
        pushChoice(list, p.answerText, '<', '<', 'not-equal');
      } else {
        opp = p.answerText === '>' ? '<' : '>';
        mistake = p.kind === 'compare-trap' ? 'compare-ones-first'
          : (p.kind === 'compare-same-tens' ? 'compare-ones' : 'reverse');
        pushChoice(list, p.answerText, opp, opp, mistake);
        pushChoice(list, p.answerText, '=', '=', 'equal');
      }
    } else if (p.kind === 'pair-candies' || p.kind === 'pair-candies-big') {
      opp = p.answerText === '짝수' ? '홀수' : '짝수';
      return [{ value: opp, text: opp, mistake: 'even-odd-swap' }];
    } else if (p.kind === 'which-even') {
      d1 = p.n + 1 <= 99 ? p.n + 1 : p.n - 1;
      d2 = p.n + 11 <= 99 ? p.n + 11 : p.n - 11;
      pushNum(list, p.answerText, d1, 'last-digit');
      pushNum(list, p.answerText, d2, 'last-digit');
    }
    return list;
  }

  // 라운드 내 중복 판별용 핵심 키
  function problemKey(p) {
    if (p.a !== undefined && p.b !== undefined) return p.kind + ':' + p.a + ':' + p.b;
    if (p.start !== undefined) return p.kind + ':' + p.start + ':' + p.step;
    if (p.count !== undefined) return p.kind + ':' + p.count;
    if (p.n !== undefined) return p.kind + ':' + p.n;
    return p.kind + ':' + p.answerText;
  }

  // 관(1~5)별 3문제 라운드 생성
  function makeRound(lab, rng) {
    var kinds = LAB_KINDS[lab] || LAB_KINDS[1], used = {}, out = [], i, p;
    for (i = 0; i < kinds.length; i++) {
      p = pickWithRetry(function () {
        var cand = makeProblem(kinds[i], rng);
        return used[problemKey(cand)] ? null : cand;
      }, null);
      if (p === null) p = makeProblem(kinds[i], rng);
      used[problemKey(p)] = true;
      out.push(p);
    }
    return out;
  }

  // 묶음 문제 글: 낱개가 0이면 「10개씩 묶음 6개」만
  function bundleCall(n) {
    var d = digits(n);
    return d.o === 0 ? '10개씩 묶음 ' + d.t + '개' : '10개씩 묶음 ' + d.t + '개와 낱개 ' + d.o + '개';
  }

  // 빙고 단일 문제 생성
  function makeBingoProblem(kind, rng) {
    var n, start, call;
    if (kind === 'call-bundle') {
      n = randInt(11, 99, rng);
      call = bundleCall(n);
    } else if (kind === 'call-sino') {
      n = randInt(10, 99, rng);
      call = readSino(n);
    } else if (kind === 'call-native') {
      n = randInt(10, 99, rng);
      call = readNative(n);
    } else {
      n = randInt(11, 99, rng);
      start = n - 1;
      call = start + '보다 1 큰 수';
    }
    return { kind: kind, n: n, answer: n, answerText: String(n), call: call };
  }

  // 9칸 빙고 문제 생성 (답 서로 다름, 4종 모두 포함)
  function makeBingo(rng) {
    var kinds = BINGO_KINDS.slice(), usedAns = {}, out = [], i, j, tmp, p;
    for (i = 4; i < 9; i++) {
      kinds.push(BINGO_KINDS[randInt(0, BINGO_KINDS.length - 1, rng)]);
    }
    for (i = kinds.length - 1; i > 0; i--) {
      j = randInt(0, i, rng);
      tmp = kinds[i];
      kinds[i] = kinds[j];
      kinds[j] = tmp;
    }
    for (i = 0; i < 9; i++) {
      p = pickWithRetry(function () {
        var cand = makeBingoProblem(kinds[i], rng);
        return usedAns[cand.answerText] ? null : cand;
      }, null);
      if (p === null) {
        for (j = 11; j <= 99; j++) {
          if (!usedAns[String(j)]) {
            p = makeBingoProblem(kinds[i], rng);
            p.n = j;
            p.answer = j;
            p.answerText = String(j);
            if (kinds[i] === 'call-bundle') {
              p.call = bundleCall(j);
            } else if (kinds[i] === 'call-sino') {
              p.call = readSino(j);
            } else if (kinds[i] === 'call-native') {
              p.call = readNative(j);
            } else {
              p.call = (j - 1) + '보다 1 큰 수';
            }
            break;
          }
        }
      }
      usedAns[p.answerText] = true;
      out.push(p);
    }
    return out;
  }

  // 스무고개 비밀 수 (10~99)
  function makeSecret(rng) {
    return randInt(10, 99, rng);
  }

  // 스무고개 질문 칩 ID 목록
  function chipList() {
    var list = [], i;
    for (i = 15; i <= 85; i += 10) list.push('gt:' + i);
    for (i = 1; i <= 9; i++) list.push('t:' + i);
    for (i = 1; i <= 8; i++) list.push('tg:' + i);
    for (i = 0; i <= 9; i++) list.push('o:' + i);
    for (i = 1; i <= 8; i++) list.push('og:' + i);
    list.push('even');
    return list;
  }

  // 스무고개 칩 화면 문구 (1학년 용어: 10개씩 묶음·낱개)
  function chipText(id) {
    if (id === 'even') return '짝수예요?';
    var val = Number(id.slice(id.indexOf(':') + 1));
    if (id.indexOf('gt:') === 0) return val + '보다 커요?';
    if (id.indexOf('t:') === 0) return '10개씩 묶음이 ' + val + '개예요?';
    if (id.indexOf('tg:') === 0) return '10개씩 묶음이 ' + val + '개보다 많아요?';
    if (id.indexOf('o:') === 0) return val === 0 ? '낱개가 없어요?' : '낱개가 ' + val + '개예요?';
    return '낱개가 ' + val + '개보다 많아요?';
  }

  // 스무고개 칩 질문에 대한 참/거짓 판정
  function chipAnswer(n, id) {
    if (id === 'even') return n % 2 === 0;
    var val = Number(id.slice(id.indexOf(':') + 1));
    if (id.indexOf('gt:') === 0) return n > val;
    var d = digits(n);
    if (id.indexOf('t:') === 0) return d.t === val;
    if (id.indexOf('tg:') === 0) return d.t > val;
    if (id.indexOf('o:') === 0) return d.o === val;
    return d.o > val;
  }

  // 지금까지의 질문/답변과 일치하는 10~99 후보 오름차순 반환
  function candidates(asked) {
    var out = [], n, i, ok;
    for (n = 10; n <= 99; n++) {
      ok = true;
      for (i = 0; asked && i < asked.length; i++) {
        if (chipAnswer(n, asked[i].id) !== asked[i].answer) {
          ok = false;
          break;
        }
      }
      if (ok) out.push(n);
    }
    return out;
  }

  global.HundredCore = {
    LAB_KINDS: LAB_KINDS,
    KIND_ORDER: KIND_ORDER,
    BINGO_KINDS: BINGO_KINDS,
    randInt: randInt,
    digits: digits,
    readSino: readSino,
    readNative: readNative,
    makeProblem: makeProblem,
    wrongChoices: wrongChoices,
    makeRound: makeRound,
    makeBingo: makeBingo,
    makeSecret: makeSecret,
    chipList: chipList,
    chipText: chipText,
    chipAnswer: chipAnswer,
    candidates: candidates
  };
})(typeof window !== 'undefined' ? window : globalThis);
