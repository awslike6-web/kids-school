(function (global) {
  'use strict';

  var MINUS = '−';
  var LAB_KINDS = {
    1: ['as', 'as', 'as-paren'],
    2: ['md', 'md', 'md-paren'],
    3: ['asm', 'asm-3', 'asm-paren'],
    4: ['asd', 'asd-3', 'asd-paren'],
    5: ['all', 'all', 'all-paren'],
    6: ['story', 'story', 'story-paren']
  };
  var MIXED_KINDS = ['as', 'as-paren', 'md', 'md-paren', 'asm', 'asm-paren', 'asd', 'asd-paren', 'all-paren'];
  var KIND_ORDER = {
    'as': 0, 'as-paren': 1, 'md': 2, 'md-paren': 3,
    'asm': 4, 'asm-3': 5, 'asm-paren': 6,
    'asd': 7, 'asd-3': 8, 'asd-paren': 9,
    'all': 10, 'all-paren': 11, 'story': 12, 'story-paren': 13
  };

  function randInt(lo, hi, rng) { return Math.floor(rng() * (hi - lo + 1)) + lo; }
  function isOp(t) { return t === '+' || t === MINUS || t === '×' || t === '÷'; }
  function isMulDiv(t) { return t === '×' || t === '÷'; }
  function isAddSub(t) { return t === '+' || t === MINUS; }

  // 식 토큰을 교과서 빈칸 규칙대로 문자열로 변환
  function text(tokens) {
    var out = '';
    for (var i = 0; i < tokens.length; i++) {
      if (i > 0 && tokens[i - 1] !== '(' && tokens[i] !== ')') out += ' ';
      out += String(tokens[i]);
    }
    return out;
  }

  // 시험용 문자열 파서(U+2212 빼기만 허용)
  function parse(str) {
    var out = [], i = 0, n = str.length;
    while (i < n) {
      var ch = str.charAt(i);
      if (ch === ' ' || ch === '\t' || ch === '\n') { i++; continue; }
      if (ch >= '0' && ch <= '9') {
        var num = 0;
        while (i < n && str.charAt(i) >= '0' && str.charAt(i) <= '9') {
          num = num * 10 + (str.charCodeAt(i) - 48);
          i++;
        }
        out.push(num);
      } else if (isOp(ch) || ch === '(' || ch === ')') {
        out.push(ch);
        i++;
      } else {
        throw new Error('Invalid token: ' + ch);
      }
    }
    return out;
  }

  function stripParens(tokens) {
    var out = [];
    for (var i = 0; i < tokens.length; i++) if (tokens[i] !== '(' && tokens[i] !== ')') out.push(tokens[i]);
    return out;
  }

  // 가장 안쪽 괄호 범위 [lo, hi] 찾기
  function innerSpan(tokens) {
    var lo = 0, hi = tokens.length - 1;
    for (var i = 0; i < tokens.length; i++) {
      if (tokens[i] === '(') lo = i + 1;
      else if (tokens[i] === ')') { hi = i - 1; break; }
    }
    return [lo, hi];
  }

  function nextIndex(tokens) {
    var sp = innerSpan(tokens), lo = sp[0], hi = sp[1], i;
    for (i = lo; i <= hi; i++) if (isMulDiv(tokens[i])) return i;
    for (i = lo; i <= hi; i++) if (isAddSub(tokens[i])) return i;
    return -1;
  }

  function nextIndexRight(tokens) {
    var sp = innerSpan(tokens), lo = sp[0], hi = sp[1], i;
    for (i = hi; i >= lo; i--) if (isMulDiv(tokens[i])) return i;
    for (i = hi; i >= lo; i--) if (isAddSub(tokens[i])) return i;
    return -1;
  }

  function calcOp(a, op, b) {
    if (op === '+') return a + b;
    if (op === MINUS) return a - b;
    if (op === '×') return a * b;
    if (op === '÷') return b === 0 ? NaN : a / b;
    return NaN;
  }

  // idx 위치 연산을 수행하고 괄호 정리 후 새 토큰과 범위 반환
  function step(tokens, idx) {
    var val = calcOp(tokens[idx - 1], tokens[idx], tokens[idx + 1]);
    var from = idx - 1, to = idx + 1;
    if (from > 0 && to < tokens.length - 1 && tokens[from - 1] === '(' && tokens[to + 1] === ')') {
      from--;
      to++;
    }
    var next = tokens.slice(0, from).concat([val], tokens.slice(to + 1));
    return { tokens: next, from: from, to: to, value: val };
  }

  function solve(tokens) {
    var cur = tokens.slice(), orig = [], lines = [cur.slice()], marks = [], order = [];
    for (var i = 0; i < cur.length; i++) orig.push(i);
    while (cur.length > 1) {
      var idx = nextIndex(cur);
      if (idx < 0) break;
      order.push(orig[idx]);
      var s = step(cur, idx);
      cur = s.tokens;
      orig = orig.slice(0, s.from).concat([-1], orig.slice(s.to + 1));
      lines.push(cur.slice());
      marks.push({ from: s.from, to: s.to, value: s.value });
    }
    return { lines: lines, marks: marks, order: order, value: cur[0] };
  }

  function validInt(v) { return typeof v === 'number' && isFinite(v) && Math.floor(v) === v && v >= 0; }

  function evalWith(tokens, mode) {
    var cur = (mode === 'left' || mode === 'noparen') ? stripParens(tokens) : tokens.slice();
    while (cur.length > 1) {
      var idx = -1;
      if (mode === 'left') {
        for (var i = 0; i < cur.length; i++) if (isOp(cur[i])) { idx = i; break; }
      } else if (mode === 'right') {
        idx = nextIndexRight(cur);
      } else {
        idx = nextIndex(cur);
      }
      if (idx < 1 || idx >= cur.length - 1) return null;
      var s = step(cur, idx);
      if (!validInt(s.value)) return null;
      cur = s.tokens;
    }
    return cur.length === 1 && validInt(cur[0]) ? cur[0] : null;
  }

  function gcd(a, b) {
    a = Math.abs(a); b = Math.abs(b);
    while (b !== 0) { var t = a % b; a = b; b = t; }
    return a || 1;
  }

  function rat(n, d) {
    if (d === 0) return null;
    if (d < 0) { n = -n; d = -d; }
    var g = gcd(n, d);
    return { n: n / g, d: d / g };
  }

  function evalExact(tokens) {
    var cur = [], i;
    for (i = 0; i < tokens.length; i++) cur.push(typeof tokens[i] === 'number' ? { n: tokens[i], d: 1 } : tokens[i]);
    while (cur.length > 1) {
      var idx = nextIndex(cur);
      if (idx < 1 || idx >= cur.length - 1) return null;
      var a = cur[idx - 1], op = cur[idx], b = cur[idx + 1], r = null;
      if (op === '+') r = rat(a.n * b.d + b.n * a.d, a.d * b.d);
      else if (op === MINUS) r = rat(a.n * b.d - b.n * a.d, a.d * b.d);
      else if (op === '×') r = rat(a.n * b.n, a.d * b.d);
      else if (op === '÷') r = b.n === 0 ? null : rat(a.n * b.d, a.d * b.n);
      if (!r) return null;
      var from = idx - 1, to = idx + 1;
      if (from > 0 && to < cur.length - 1 && cur[from - 1] === '(' && cur[to + 1] === ')') { from--; to++; }
      cur = cur.slice(0, from).concat([r], cur.slice(to + 1));
    }
    return cur.length === 1 ? cur[0] : null;
  }

  function eqExact(a, b) { return !!a && !!b && a.n === b.n && a.d === b.d; }

  function mixHash(str) {
    var h = 7;
    for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 1000003;
    return h;
  }

  // §5 수 규칙 검사: 바른 풀이의 모든 단계가 범위 안에 드는지 확인
  function isValidStepOp(a, op, b, v) {
    if (!validInt(v) || v < 1 || v > 99) return false;
    if (op === '+' || op === MINUS) return a >= 1 && a <= 99 && b >= 1 && b <= 99;
    if (op === '×') {
      if (a >= 2 && a <= 9 && b >= 2 && b <= 9) return true;
      if (a >= 10 && a <= 90 && a % 10 === 0 && b >= 2 && b <= 9 && v <= 90) return true;
      if (b >= 10 && b <= 90 && b % 10 === 0 && a >= 2 && a <= 9 && v <= 90) return true;
      return false;
    }
    if (op === '÷') return b >= 2 && b <= 9 && v >= 2 && v <= 9 && a === b * v && a <= 81;
    return false;
  }

  function isValidSolution(sol) {
    if (!sol || sol.marks.length === 0 || !validInt(sol.value) || sol.value < 1 || sol.value > 99) return false;
    for (var i = 0; i < sol.marks.length; i++) {
      var line = sol.lines[i], idx = nextIndex(line);
      if (idx < 1) return false;
      if (!isValidStepOp(line[idx - 1], line[idx], line[idx + 1], sol.marks[i].value)) return false;
    }
    return true;
  }

  function buildProblemObj(kind, tokens) {
    var sol = solve(tokens);
    if (!isValidSolution(sol)) return null;
    var steps = [], maxMid = 0;
    for (var i = 0; i < sol.marks.length; i++) {
      var isLast = i === sol.marks.length - 1;
      var ans = isLast ? sol.value : sol.lines[i + 1];
      steps.push({ answer: ans, answerText: isLast ? String(ans) : text(ans) });
      if (!isLast && sol.marks[i].value > maxMid) maxMid = sol.marks[i].value;
    }
    return {
      kind: kind, tokens: tokens, text: text(tokens), solution: sol,
      steps: steps, answer: sol.value, answerText: String(sol.value), maxMid: maxMid
    };
  }

  // 내부 결정적 난수 생성기(풀 생성용)
  function makeSeededRng(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s * 1664525 + 1013904223) % 4294967296;
      return s / 4294967296;
    };
  }

  // 종류별 토큰 생성기
  function genTokens(kind, rng) {
    var a, b, c, d, q, q1, q2, op1, op2;
    if (kind === 'as') {
      op1 = rng() < 0.5 ? '+' : MINUS;
      a = randInt(20, 90, rng); b = randInt(5, a - 5, rng); c = randInt(3, 35, rng);
      return [a, MINUS, b, op1, c];
    }
    if (kind === 'as-paren') {
      op1 = rng() < 0.5 ? '+' : MINUS;
      a = randInt(25, 95, rng); b = randInt(10, 45, rng); c = randInt(3, 25, rng);
      return [a, MINUS, '(', b, op1, c, ')'];
    }
    if (kind === 'md') {
      if (rng() < 0.5) {
        b = randInt(2, 9, rng); q = randInt(2, 9, rng); c = randInt(2, 9, rng);
        return [b * q, '÷', b, '×', c];
      }
      var pairs = [[2,2],[2,3],[2,4],[3,2],[3,3],[4,2]];
      var pr = pairs[randInt(0, pairs.length - 1, rng)];
      q2 = pr[0]; c = pr[1]; q1 = q2 * c; b = randInt(2, 9, rng);
      return [b * q1, '÷', b, '÷', c];
    }
    if (kind === 'md-paren') {
      var mp = [[2,2],[2,3],[2,4],[3,2],[3,3],[4,2]];
      var m = mp[randInt(0, mp.length - 1, rng)];
      q = randInt(2, 9, rng);
      return [q * m[0] * m[1], '÷', '(', m[0], '×', m[1], ')'];
    }
    if (kind === 'asm') {
      op1 = rng() < 0.5 ? '+' : MINUS;
      b = randInt(2, 9, rng); c = randInt(2, 9, rng); a = randInt(10, 90, rng);
      return [a, op1, b, '×', c];
    }
    if (kind === 'asm-3') {
      op1 = rng() < 0.5 ? '+' : MINUS; op2 = rng() < 0.5 ? '+' : MINUS;
      a = randInt(12, 70, rng); b = randInt(2, 9, rng); c = randInt(2, 9, rng); d = randInt(3, 25, rng);
      return rng() < 0.6 ? [a, op1, b, '×', c, op2, d] : [a, op1, d, op2, b, '×', c];
    }
    if (kind === 'asm-paren') {
      op1 = rng() < 0.5 ? '+' : MINUS;
      var t = randInt(0, 2, rng);
      if (t === 0) {
        var s1 = randInt(3, 9, rng); a = randInt(1, s1 - 1, rng); b = s1 - a;
        if (op1 === MINUS) { a = randInt(s1 + 2, 20, rng); b = a - s1; }
        c = randInt(2, 9, rng);
        return rng() < 0.5 ? ['(', a, op1, b, ')', '×', c] : [c, '×', '(', a, op1, b, ')'];
      }
      var s2 = randInt(3, 9, rng); a = randInt(1, s2 - 1, rng); b = s2 - a;
      if (op1 === MINUS) { a = randInt(s2 + 2, 18, rng); b = a - s2; }
      c = randInt(2, 9, rng); d = randInt(15, 95, rng);
      return [d, rng() < 0.5 ? MINUS : '+', '(', a, op1, b, ')', '×', c];
    }
    if (kind === 'asd') {
      op1 = rng() < 0.5 ? '+' : MINUS;
      c = randInt(2, 9, rng); q = randInt(2, 9, rng); a = randInt(12, 85, rng);
      return [a, op1, c * q, '÷', c];
    }
    if (kind === 'asd-3') {
      op1 = rng() < 0.5 ? '+' : MINUS; op2 = rng() < 0.5 ? '+' : MINUS;
      c = randInt(2, 9, rng); q = randInt(2, 9, rng); a = randInt(12, 70, rng); d = randInt(3, 25, rng);
      return rng() < 0.6 ? [a, op1, c * q, '÷', c, op2, d] : [a, op1, d, op2, c * q, '÷', c];
    }
    if (kind === 'asd-paren') {
      op1 = rng() < 0.5 ? '+' : MINUS;
      c = randInt(2, 9, rng); q = randInt(2, 9, rng);
      var tot = c * q;
      // 괄호 안 둘째 수 b도 c로 나누어떨어지게(괄호를 무시한 실수 보기 b ÷ c를 만들 수 있게)
      if (op1 === '+') { b = c * randInt(1, q - 1, rng); a = tot - b; }
      else { b = c * randInt(1, Math.max(1, Math.floor(30 / c)), rng); a = tot + b; }
      if (rng() < 0.5) return ['(', a, op1, b, ')', '÷', c];
      d = randInt(15, 90, rng);
      return [d, rng() < 0.5 ? MINUS : '+', '(', a, op1, b, ')', '÷', c];
    }
    if (kind === 'all') {
      op1 = rng() < 0.5 ? '+' : MINUS;
      c = randInt(2, 9, rng); q = randInt(2, 9, rng); d = randInt(2, 9, rng); a = randInt(10, 75, rng);
      return rng() < 0.5 ? [a, op1, c * q, '÷', c, '×', d] : [c * q, '÷', c, '×', d, op1, a];
    }
    if (kind === 'all-paren') {
      op1 = rng() < 0.5 ? '+' : MINUS;
      var sum = randInt(3, 9, rng); q = randInt(2, 9, rng); d = randInt(2, 9, rng);
      var lead = sum * q, okA = [], t2;
      // 앞 꼴(lead ÷ (a ± b) × d)은 괄호를 무시한 실수 lead ÷ a도 나누어떨어지는 a만(핵심 실수 보기를 만들 수 있게)
      for (t2 = 2; t2 <= sum + 12; t2++) if (lead % t2 === 0 && (op1 === '+' ? t2 < sum : t2 > sum)) okA.push(t2);
      if (okA.length && rng() < 0.6) { a = okA[randInt(0, okA.length - 1, rng)]; b = op1 === '+' ? sum - a : a - sum; return [lead, '÷', '(', a, op1, b, ')', '×', d]; }
      if (op1 === '+') { a = randInt(1, sum - 1, rng); b = sum - a; }
      else { b = randInt(2, 12, rng); a = sum + b; }
      return ['(', a, op1, b, ')', '×', d, '÷', randInt(2, 9, rng)];
    }
    return null;
  }

  function checkKindConstraint(kind, p) {
    var tok = p.tokens, ans = p.answer;
    if (kind === 'as-paren' || kind === 'md-paren' || kind === 'asm-paren' || kind === 'asd-paren' || kind === 'all-paren') if (evalWith(tok, 'noparen') === ans) return false;
    if (kind === 'asm' || kind === 'asm-3' || kind === 'asd' || kind === 'asd-3') if (evalWith(tok, 'left') === ans) return false;
    return true;
  }

  // 6관 문장제 틀 (story 6틀, story-paren 6틀)
  function sameFrac(x, y) { return !!(x && y && x.n * y.d === y.n * x.d); }

  // 6관 문장 틀: make(rng) → [문장, 묻는 말, 정답 식, 오답 식1, 실수1, 오답 식2, 실수2]
  function S(kind, make) {
    return { kind: kind, make: function (rng) {
      // 오답 식 값이 정답 값과 같아지는 수 조합(2장씩 2묶음 → 2 × 2 = 2 + 2)은 버리고 다시 뽑는다
      var r, t, v, w1, w2;
      for (t = 0; t < 50; t++) {
        r = make(rng); v = evalExact(r[2]); w1 = evalExact(r[3]); w2 = evalExact(r[5]);
        if (!sameFrac(v, w1) && !sameFrac(v, w2)) break;
      }
      return { story: r[0], ask: r[1], tokens: r[2], wrongs: [{ tokens: r[3], mistake: r[4] }, { tokens: r[5], mistake: r[6] }] };
    } };
  }
  var M_ = MINUS;
  var STORIES = [
    S('story', function (rng) { var a = randInt(20, 60, rng), b = randInt(4, 15, rng), c = randInt(3, 18, rng);
      return ['사탕 ' + a + '개 중 ' + b + '개를 먹고 ' + c + '개를 더 샀어요.', '지금 사탕은 몇 개인가요?',
        [a, M_, b, '+', c], [a, M_, b, M_, c], 'op-swap-as', [a, M_, '(', b, '+', c, ')'], 'paren-wrong']; }),
    S('story', function (rng) { var b = randInt(2, 8, rng), q = randInt(3, 9, rng), a = b * q, c = randInt(2, 9, rng);
      return ['연필 ' + a + '자루를 ' + b + '명에게 똑같이 나누고, 한 명에게 ' + c + '자루씩 더 줬어요.', '한 명이 가진 연필은 몇 자루인가요?',
        [a, '÷', b, '+', c], [a, '÷', b, M_, c], 'op-swap-as', [a, '×', b, '+', c], 'op-swap-md']; }),
    S('story', function (rng) { var a = randInt(3, 9, rng), b = randInt(2, 9, rng), c = randInt(2, a * b - 2, rng);
      return ['빵이 ' + a + '개씩 든 상자 ' + b + '개에서 ' + c + '개를 먹었어요.', '남은 빵은 몇 개인가요?',
        [a, '×', b, M_, c], [a, '×', b, '+', c], 'op-swap-as', [a, '×', '(', b, M_, c, ')'], 'paren-wrong']; }),
    S('story', function (rng) { var b = randInt(2, 8, rng), c = randInt(2, 7, rng), a = randInt(b * c + 5, 85, rng);
      return ['구슬 ' + a + '개에서 ' + b + '개씩 ' + c + '번 꺼냈어요.', '남은 구슬은 몇 개인가요?',
        [a, M_, b, '×', c], ['(', a, M_, b, ')', '×', c], 'paren-wrong', [a, '+', b, '×', c], 'op-swap-as']; }),
    S('story', function (rng) { var a = randInt(5, 35, rng), b = randInt(2, 9, rng), c = randInt(2, 9, rng);
      return ['색종이 ' + a + '장이 있는데 ' + b + '장씩 ' + c + '묶음을 더 모았어요.', '색종이는 모두 몇 장인가요?',
        [a, '+', b, '×', c], ['(', a, '+', b, ')', '×', c], 'paren-wrong', [a, '+', b, '+', c], 'op-swap-md']; }),
    S('story', function (rng) { var b = randInt(2, 8, rng), q = randInt(4, 9, rng), a = b * q, c = randInt(1, q - 1, rng);
      return ['카드 ' + a + '장을 ' + b + '명이 똑같이 나눈 뒤, 한 사람이 ' + c + '장씩 썼어요.', '한 사람에게 남은 카드는 몇 장인가요?',
        [a, '÷', b, M_, c], [a, '÷', b, '+', c], 'op-swap-as', [a, '÷', '(', b, M_, c, ')'], 'paren-wrong']; }),
    S('story-paren', function (rng) { var c = randInt(2, 8, rng), q = randInt(2, 9, rng), b = randInt(3, 20, rng), a = c * q + b;
      return ['사탕 ' + a + '개 중 ' + b + '개를 먹고, 남은 것을 ' + c + '명이 똑같이 나눴어요.', '한 명이 받은 사탕은 몇 개인가요?',
        ['(', a, M_, b, ')', '÷', c], [a, M_, b, '÷', c], 'paren-missing', ['(', a, '+', b, ')', '÷', c], 'op-swap-as']; }),
    S('story-paren', function (rng) { var sum = randInt(4, 9, rng), a = randInt(2, sum - 2, rng), b = sum - a, c = randInt(2, 9, rng);
      return ['남학생 ' + a + '명과 여학생 ' + b + '명에게 공책을 ' + c + '권씩 주었어요.', '준 공책은 모두 몇 권인가요?',
        ['(', a, '+', b, ')', '×', c], [a, '+', b, '×', c], 'paren-missing', ['(', a, M_, b, ')', '×', c], 'op-swap-as']; }),
    S('story-paren', function (rng) { var b = randInt(10, 30, rng), c = randInt(10, 30, rng), a = randInt(b + c + 5, 95, rng);
      return ['줄넘기를 ' + a + '번 하기로 했는데 아침에 ' + b + '번, 점심에 ' + c + '번 했어요.', '더 해야 하는 횟수는 몇 번인가요?',
        [a, M_, '(', b, '+', c, ')'], [a, M_, b, '+', c], 'paren-missing', [a, M_, '(', b, M_, c, ')'], 'op-swap-as']; }),
    S('story-paren', function (rng) { var sum = randInt(4, 9, rng), b = randInt(2, sum - 2, rng), c = sum - b, q = randInt(2, 9, rng), a = sum * q;
      return ['귤 ' + a + '개를 큰 상자 ' + b + '개와 작은 상자 ' + c + '개에 똑같이 나눠 담았어요.', '한 상자에 담은 귤은 몇 개인가요?',
        [a, '÷', '(', b, '+', c, ')'], [a, '÷', b, '+', c], 'paren-missing', [a, '÷', '(', b, M_, c, ')'], 'op-swap-as']; }),
    S('story-paren', function (rng) { var c = randInt(2, 8, rng), q = randInt(2, 9, rng), b = randInt(4, 18, rng), a = c * q + b;
      return ['스티커 ' + a + '장 중 ' + b + '장을 쓰고, 나머지를 ' + c + '일 동안 똑같이 나눠 써요.', '하루에 쓰는 스티커는 몇 장인가요?',
        ['(', a, M_, b, ')', '÷', c], [a, M_, b, '÷', c], 'paren-missing', [a, M_, '(', b, '÷', c, ')'], 'paren-wrong']; }),
    S('story-paren', function (rng) { var sum = randInt(4, 9, rng), a = randInt(2, sum - 2, rng), b = sum - a, c = randInt(2, 9, rng);
      return ['한 상자에 빨간 공 ' + a + '개와 파란 공 ' + b + '개를 넣어 ' + c + '상자를 만들었어요.', '공은 모두 몇 개인가요?',
        ['(', a, '+', b, ')', '×', c], [a, '+', b, '×', c], 'paren-missing', [a, '+', '(', b, '×', c, ')'], 'paren-wrong']; })
  ];

  function countParens(tokens) {
    var c = 0;
    for (var i = 0; i < tokens.length; i++) if (tokens[i] === '(' || tokens[i] === ')') c++;
    return c;
  }

  function makeStoryItem(tpl, rng) {
    for (var t = 0; t < 40; t++) {
      var raw = tpl.make(rng);
      var sol = solve(raw.tokens);
      if (!isValidSolution(sol)) continue;
      var ex = evalExact(raw.tokens);
      if (!ex || raw.wrongs.length < 2) continue;
      var w0 = evalExact(raw.wrongs[0].tokens), w1 = evalExact(raw.wrongs[1].tokens);
      if (!w0 || !w1 || eqExact(w0, ex) || eqExact(w1, ex) || eqExact(w0, w1)) continue;
      if (tpl.kind === 'story-paren') {
        var pc = countParens(raw.tokens);
        if (countParens(raw.wrongs[0].tokens) !== pc && countParens(raw.wrongs[1].tokens) !== pc) continue;
      }
      var txt = text(raw.tokens);
      return {
        kind: tpl.kind, story: raw.story, ask: raw.ask, tokens: raw.tokens, text: txt,
        answerText: txt, value: sol.value, solution: sol, wrongs: raw.wrongs
      };
    }
    return null;
  }

  var _pools = {};

  function getPool(kind) {
    if (_pools[kind]) return _pools[kind];
    var pool = [], seen = {}, rng = makeSeededRng(10007 + (KIND_ORDER[kind] || 0) * 997);
    if (kind === 'story' || kind === 'story-paren') {
      var tpls = [];
      for (var i = 0; i < STORIES.length; i++) if (STORIES[i].kind === kind) tpls.push(STORIES[i]);
      for (var k = 0; k < 2500 && pool.length < 60; k++) {
        var item = makeStoryItem(tpls[k % tpls.length], rng);
        if (item && !seen[item.text]) { seen[item.text] = true; pool.push(item); }
      }
      _pools[kind] = pool;
      return pool;
    }
    // md-paren은 48개 전체 조합이 가능하도록 충분히 시도
    var target = (kind === 'all-paren') ? 80 : 60;
    for (var tries = 0; tries < 5000 && pool.length < target; tries++) {
      var tok = genTokens(kind, rng);
      if (!tok) continue;
      var p = buildProblemObj(kind, tok);
      if (!p || !checkKindConstraint(kind, p) || seen[p.text]) continue;
      if (kind === 'all-paren' && pool.length < 50 && p.maxMid > 50) continue;
      seen[p.text] = true;
      pool.push(p);
    }
    _pools[kind] = pool;
    return pool;
  }

  function makeProblem(kind, rng) {
    rng = rng || Math.random;
    var pool = getPool(kind);
    return pool[randInt(0, pool.length - 1, rng)];
  }

  // 마지막 단계(수 고르기) 오답 생성
  function lastStepWrongs(line, ans, h) {
    var idx = nextIndex(line), a = line[idx - 1], op = line[idx], b = line[idx + 1];
    var slips = [], opSlips = [];
    if (op === '+' || op === MINUS) {
      slips = [ans + 1, ans - 1, ans + 10, ans - 10, ans + 2, ans - 2];
      opSlips = [op === '+' ? a - b : a + b];
    } else if (op === '×') {
      slips = [ans + b, ans - b, ans + a, ans - a, ans + 1, ans - 1];
      opSlips = [a + b];
    } else if (op === '÷') {
      slips = [ans + 1, ans - 1, ans + 2, ans - 2, ans + 3, ans - 3];
      opSlips = [a - b, a * b <= 99 ? a * b : ans + 4];
    }
    var wantBig = (h % 2 === 0), cands = [];
    function pushCand(v, m) {
      if (!validInt(v) || v < 1 || v === ans) return;
      for (var i = 0; i < cands.length; i++) if (cands[i].value === v) return;
      cands.push({ value: v, token: String(v), mistake: m });
    }
    // 크기 위치 돌리기: 해시 짝수면 큰 값 우선, 홀수면 작은 값 우선
    var pass, i;
    for (pass = 0; pass < 2; pass++) {
      var pickBig = pass === 0 ? wantBig : !wantBig;
      for (i = 0; i < slips.length; i++) if ((pickBig && slips[i] > ans) || (!pickBig && slips[i] < ans)) pushCand(slips[i], 'calc-slip');
      for (i = 0; i < opSlips.length; i++) if ((pickBig && opSlips[i] > ans) || (!pickBig && opSlips[i] < ans)) pushCand(opSlips[i], 'op-slip');
    }
    for (i = 1; cands.length < 2; i++) pushCand(ans + i, 'calc-slip');
    return cands.slice(0, 2);
  }

  function stepWithVal(tokens, idx, val) {
    var from = idx - 1, to = idx + 1;
    if (from > 0 && to < tokens.length - 1 && tokens[from - 1] === '(' && tokens[to + 1] === ')') { from--; to++; }
    return tokens.slice(0, from).concat([val], tokens.slice(to + 1));
  }

  function makeStepCand(line, kind, mName, finalAns, correctText) {
    var res = null, idx, s, v, op, a, b;
    if (mName === 'paren-ignored') {
      if (line.indexOf('(') < 0) return null;
      s = stripParens(line); idx = nextIndex(s);
      if (idx < 1) return null;
      res = step(s, idx);
    } else if (mName === 'order-left') {
      s = stripParens(line);
      if (s.length <= 3) return null;
      idx = -1;
      for (var i = 0; i < s.length; i++) if (isOp(s[i])) { idx = i; break; }
      if (idx < 1) return null;
      res = step(s, idx);
    } else if (mName === 'order-right') {
      idx = nextIndexRight(line);
      if (idx < 1 || idx === nextIndex(line)) return null;
      res = step(line, idx);
    } else if (mName === 'order-low-right') {
      s = stripParens(line);
      idx = -1;
      for (var j = s.length - 1; j >= 0; j--) if (isAddSub(s[j])) { idx = j; break; }
      if (idx < 1) return null;
      res = step(s, idx);
    } else if (mName === 'calc-slip') {
      idx = nextIndex(line); a = line[idx - 1]; op = line[idx]; b = line[idx + 1];
      v = calcOp(a, op, b);
      var dv = (op === '×') ? b : 1;
      var nv = (v - dv >= 1) ? v - dv : v + dv;
      res = { tokens: stepWithVal(line, idx, nv), value: nv };
    } else if (mName === 'op-slip') {
      idx = nextIndex(line); a = line[idx - 1]; op = line[idx]; b = line[idx + 1];
      nv = op === '+' ? a - b : (op === MINUS ? a + b : (op === '×' ? a + b : a - b));
      res = { tokens: stepWithVal(line, idx, nv), value: nv };
    } else if (mName === 'slip-wrong-place') {
      var base = makeStepCand(line, kind, 'order-left', finalAns, correctText) ||
                 makeStepCand(line, kind, 'order-right', finalAns, correctText) ||
                 makeStepCand(line, kind, 'paren-ignored', finalAns, correctText);
      if (!base) return null;
      var bTok = base.value.slice();
      for (var k = 0; k < bTok.length; k++) {
        if (typeof bTok[k] === 'number' && bTok[k] !== line[k]) {
          bTok[k] = bTok[k] > 1 ? bTok[k] - 1 : bTok[k] + 1;
          break;
        }
      }
      var bt = text(bTok);
      if (bt === correctText || evalWith(bTok, 'rule') === finalAns) return null;
      return { value: bTok, token: bt, mistake: base.mistake };
    }
    if (!res || !validInt(res.value) || res.value < 1) return null;
    var tokStr = text(res.tokens);
    if (tokStr === correctText) return null;
    if (evalWith(res.tokens, 'rule') === finalAns) return null;
    return { value: res.tokens, token: tokStr, mistake: mName === 'order-low-right' ? 'order-left' : mName };
  }

  function coreOrderMistake(kind, h) {
    if (kind.indexOf('-paren') >= 0) return 'paren-ignored';
    if (kind === 'as' || kind === 'md') return 'order-right';
    if (kind === 'all') return (h % 2 === 0) ? 'order-left' : 'order-right';
    return 'order-left';
  }

  function wrongChoices(p, stepIndex) {
    // 6관: 문장제 식 고르기
    if (typeof stepIndex !== 'number' && (p.kind === 'story' || p.kind === 'story-paren')) {
      var sw = [];
      for (var i = 0; i < 2; i++) {
        sw.push({ value: p.wrongs[i].tokens, token: text(p.wrongs[i].tokens), mistake: p.wrongs[i].mistake });
      }
      return sw;
    }
    var h = mixHash(p.text + '|' + (typeof stepIndex === 'number' ? stepIndex : 'final'));
    // 7관: 최종 답 수 고르기
    if (typeof stepIndex !== 'number') {
      var ans = p.answer, core = coreOrderMistake(p.kind, h), out = [], used = {};
      used[ans] = true;
      var modes = [
        core === 'paren-ignored' ? ['noparen', 'paren-ignored'] : (core === 'order-right' ? ['right', 'order-right'] : ['left', 'order-left']),
        ['left', 'order-left'], ['right', 'order-right'], ['noparen', 'paren-ignored']
      ];
      for (var m = 0; m < modes.length && out.length < 2; m++) {
        var val = evalWith(p.tokens, modes[m][0]);
        if (val !== null && val >= 1 && !used[val]) {
          used[val] = true;
          out.push({ value: val, token: String(val), mistake: modes[m][1] });
        }
      }
      var wantBig = (h % 2 === 0), diffs = wantBig ? [1, 2, 10, -1, -2, -10] : [-1, -2, -10, 1, 2, 10];
      for (var d = 0; d < diffs.length && out.length < 2; d++) {
        var dv = ans + diffs[d];
        if (dv >= 1 && !used[dv]) { used[dv] = true; out.push({ value: dv, token: String(dv), mistake: 'calc-slip' }); }
      }
      for (var f = 1; out.length < 2; f++) {
        if (!used[ans + f]) { used[ans + f] = true; out.push({ value: ans + f, token: String(ans + f), mistake: 'calc-slip' }); }
      }
      return out;
    }
    // 1~5관 단계 고르기
    var line = p.solution.lines[stepIndex];
    if (stepIndex === p.steps.length - 1) return lastStepWrongs(line, p.answer, h);
    var coreM = coreOrderMistake(p.kind, h), pat = h % 3, orderList;
    if (pat === 0) orderList = [coreM, 'calc-slip', 'op-slip', 'order-left', 'order-right', 'order-low-right', 'slip-wrong-place'];
    else if (pat === 1) orderList = [coreM, coreM === 'order-left' ? 'order-right' : 'order-left', 'order-low-right', 'paren-ignored', 'slip-wrong-place', 'calc-slip', 'op-slip'];
    else orderList = [coreM, 'slip-wrong-place', 'calc-slip', 'order-left', 'order-right', 'op-slip'];
    // 맨 앞 + −를 먼저 해도 값이 같은 식(29 + 12 + 6 × 3)은 × ÷ 바로 앞 + −를 먼저 묶는 실수가 핵심 실수 자리를 잇는다
    if (coreM === 'order-left') orderList.splice(1, 0, 'order-low-right');
    var res = [], seenTok = {};
    seenTok[p.steps[stepIndex].answerText] = true;
    for (var c = 0; c < orderList.length && res.length < 2; c++) {
      var cand = makeStepCand(line, p.kind, orderList[c], p.answer, p.steps[stepIndex].answerText);
      if (cand && !seenTok[cand.token]) { seenTok[cand.token] = true; res.push(cand); }
    }
    // 안전장치: 2개 미만이면 숫자 미세 변형으로 채움
    var idx0 = nextIndex(line), v0 = calcOp(line[idx0 - 1], line[idx0], line[idx0 + 1]);
    for (var s = 1; res.length < 2; s++) {
      var sv = v0 + s, st = stepWithVal(line, idx0, sv), ss = text(st);
      if (!seenTok[ss] && evalWith(st, 'rule') !== p.answer) {
        seenTok[ss] = true;
        res.push({ value: st, token: ss, mistake: 'fix' });
      }
    }
    return res;
  }

  function makeRound(lab, rng) {
    rng = rng || Math.random;
    var kinds = LAB_KINDS[lab];
    if (!kinds) throw new Error('Unknown lab: ' + lab);
    var round = [], seen = {};
    for (var i = 0; i < kinds.length; i++) {
      var picked = null;
      for (var t = 0; t < 200; t++) {
        var p = makeProblem(kinds[i], rng), key = p.kind + '|' + p.text;
        if (!seen[key]) { seen[key] = true; picked = p; break; }
      }
      if (!picked) picked = makeProblem(kinds[i], rng);
      round.push(picked);
    }
    return round;
  }

  function makeMixedRound(rng, n) {
    rng = rng || Math.random;
    if (n === undefined) n = 10;
    var round = [], seen = {}, counts = {}, tries = 0;
    while (round.length < n && tries < 2000) {
      tries++;
      var kind = MIXED_KINDS[randInt(0, MIXED_KINDS.length - 1, rng)];
      if ((counts[kind] || 0) >= 3) continue;
      var p = makeProblem(kind, rng);
      if (kind === 'all-paren' && p.maxMid > 50) continue;
      var key = p.kind + '|' + p.text;
      if (seen[key]) continue;
      seen[key] = true;
      counts[kind] = (counts[kind] || 0) + 1;
      round.push(p);
    }
    round.sort(function (a, b) { return (KIND_ORDER[a.kind] || 0) - (KIND_ORDER[b.kind] || 0); });
    return round;
  }

  global.MixCalcCore = {
    LAB_KINDS: LAB_KINDS, MIXED_KINDS: MIXED_KINDS, KIND_ORDER: KIND_ORDER, STORIES: STORIES,
    text: text, parse: parse, nextIndex: nextIndex, step: step, stripParens: stripParens,
    solve: solve, evalWith: evalWith, evalExact: evalExact, mixHash: mixHash,
    makeProblem: makeProblem, wrongChoices: wrongChoices, makeRound: makeRound, makeMixedRound: makeMixedRound
  };
})(typeof window !== 'undefined' ? window : globalThis);
