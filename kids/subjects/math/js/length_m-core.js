// 초등 2학년 2학기 '3. 길이 재기' 순수 계산 (LengthMCore, docs/math_2-2_length_spec.md)
(function (global) {
  'use strict';

  var MIN = 1;
  var MAX = 999;
  var MAX_TRIES = 200;
  var NUM_WORDS = { '2': '두', '3': '세', '4': '네', '5': '다섯' };

  var LAB_KINDS = {
    1: ['ten-sticks', 'm-is-cm', 'm-n'],
    2: ['tape-cm', 'tape-mcm', 'tape-zero'],
    3: ['cm-to-m', 'm-to-cm', 'compare'],
    4: ['add', 'sub', 'word'],
    5: ['unit-pick', 'body-ruler', 'closest']
  };
  var BINGO_KINDS = ['m-n', 'cm-to-m', 'm-to-cm', 'add', 'sub'];

  var UNIT_ITEMS = [
    {
      name: '연필',
      q: '연필의 길이로 알맞은 것은?',
      answer: '15cm',
      answerValue: 15,
      wrongs: [
        { text: '15m', value: 1500, mistake: 'unit-swap' },
        { text: '1m 50cm', value: 150, mistake: 'scale-off' }
      ]
    },
    {
      name: '숟가락',
      q: '숟가락의 길이로 알맞은 것은?',
      answer: '20cm',
      answerValue: 20,
      wrongs: [
        { text: '20m', value: 2000, mistake: 'unit-swap' },
        { text: '2m', value: 200, mistake: 'scale-off' }
      ]
    },
    {
      name: '지우개',
      q: '지우개의 길이로 알맞은 것은?',
      answer: '5cm',
      answerValue: 5,
      wrongs: [
        { text: '5m', value: 500, mistake: 'unit-swap' },
        { text: '50cm', value: 50, mistake: 'scale-off' }
      ]
    },
    {
      name: '우산',
      q: '우산의 길이로 알맞은 것은?',
      answer: '80cm',
      answerValue: 80,
      wrongs: [
        { text: '80m', value: 8000, mistake: 'unit-swap' },
        { text: '8cm', value: 8, mistake: 'scale-off' }
      ]
    },
    {
      name: '실내화',
      q: '실내화의 길이로 알맞은 것은?',
      answer: '20cm',
      answerValue: 20,
      wrongs: [
        { text: '20m', value: 2000, mistake: 'unit-swap' },
        { text: '2cm', value: 2, mistake: 'scale-off' }
      ]
    },
    {
      name: '교실 문',
      q: '교실 문의 높이로 알맞은 것은?',
      answer: '2m',
      answerValue: 200,
      wrongs: [
        { text: '2cm', value: 2, mistake: 'unit-swap' },
        { text: '20cm', value: 20, mistake: 'scale-off' }
      ]
    },
    {
      name: '침대',
      q: '침대의 긴 쪽 길이로 알맞은 것은?',
      answer: '2m',
      answerValue: 200,
      wrongs: [
        { text: '2cm', value: 2, mistake: 'unit-swap' },
        { text: '20m', value: 2000, mistake: 'scale-off' }
      ]
    },
    {
      name: '줄넘기 줄',
      q: '줄넘기 줄의 길이로 알맞은 것은?',
      answer: '2m',
      answerValue: 200,
      wrongs: [
        { text: '2cm', value: 2, mistake: 'unit-swap' },
        { text: '20cm', value: 20, mistake: 'scale-off' }
      ]
    },
    {
      name: '칠판',
      q: '칠판 긴 쪽의 길이로 알맞은 것은?',
      answer: '4m',
      answerValue: 400,
      wrongs: [
        { text: '4cm', value: 4, mistake: 'unit-swap' },
        { text: '40cm', value: 40, mistake: 'scale-off' }
      ]
    },
    {
      name: '교실',
      q: '교실 긴 쪽의 길이로 알맞은 것은?',
      answer: '8m',
      answerValue: 800,
      wrongs: [
        { text: '8cm', value: 8, mistake: 'unit-swap' },
        { text: '80cm', value: 80, mistake: 'scale-off' }
      ]
    }
  ];

  function randInt(lo, hi, rng) {
    var r = typeof rng === 'function' ? rng() : Math.random();
    var idx = Math.floor(r * (hi - lo + 1));
    if (idx < 0) idx = 0;
    if (idx > hi - lo) idx = hi - lo;
    return lo + idx;
  }

  function pickWithRetry(tryFn, fallback) {
    for (var i = 0; i < MAX_TRIES; i++) {
      var res = tryFn();
      if (res !== null) return res;
    }
    return fallback;
  }

  function split(cm) {
    var v = Math.floor(cm);
    return { m: Math.floor(v / 100), cm: v % 100 };
  }

  function toCm(m, c) {
    return (m | 0) * 100 + (c | 0);
  }

  function fmt(cm) {
    var s = split(cm);
    if (s.m === 0) return s.cm + 'cm';
    if (s.cm === 0) return s.m + 'm';
    return s.m + 'm ' + s.cm + 'cm';
  }

  function sayLen(cm) {
    var s = split(cm);
    if (s.m === 0) return s.cm + '센티미터';
    if (s.cm === 0) return s.m + '미터';
    return s.m + '미터 ' + s.cm + '센티미터';
  }

  function fmtSplitWrong(cm) {
    var v = Math.floor(cm);
    return Math.floor(v / 10) + 'm ' + (v % 10) + 'cm';
  }

  function speakText(text) {
    if (text == null) return '';
    var s = String(text);
    if (s.indexOf('○') !== -1) return s;
    s = s.replace(/(\d+)m\s+(\d+)cm/g, '$1미터 $2센티미터');
    s = s.replace(/(\d+)m/g, '$1미터');
    s = s.replace(/(\d+)cm/g, '$1센티미터');
    s = s.replace(/\bcm\b/g, '센티미터').replace(/\bm\b/g, '미터');
    s = s.replace(/ \+ /g, ' 더하기 ').replace(/ [−-] /g, ' 빼기 ');
    s = s.replace(/([2-5])번/g, function (_, d) { return NUM_WORDS[d] + ' 번'; });
    s = s.replace(/(?:🐰|🐻|🦊|⭐)\s*/g, '');
    return s;
  }

  function maxForLen(len) {
    var m = (Math.floor(len / 100) + 1) * 100;
    return m < 200 ? 200 : m;
  }

  function randDir(rng) {
    return randInt(0, 1, rng) === 0 ? 1 : -1;
  }

  function pickAddPair(rng) {
    var am = randInt(1, 8, rng);
    var bm = randInt(1, 9 - am, rng);
    var ac = randInt(1, 98, rng);
    var bc = randInt(1, 99 - ac, rng);
    return { a: toCm(am, ac), b: toCm(bm, bc) };
  }

  function pickSubPair(rng) {
    var am = randInt(2, 9, rng);
    var bm = randInt(1, am - 1, rng);
    var ac = randInt(2, 99, rng);
    var bc = randInt(1, ac - 1, rng);
    return { a: toCm(am, ac), b: toCm(bm, bc) };
  }

  function makeProblem(kind, rng) {
    var q, f, n, len, m, t, o, pair, op, story, ans, type, mVal, cmVal, mLeft, a, b, aText, bText, item;
    if (kind === 'ten-sticks') {
      q = '10cm가 10개면 몇 cm?';
      return {
        kind: kind, start: randInt(6, 8, rng),
        question: q, fact: '', speak: speakText(q),
        answerText: '100cm', answerValue: 100
      };
    }
    if (kind === 'm-is-cm') {
      q = '1m는 몇 cm예요?';
      return {
        kind: kind,
        question: q, fact: '', speak: speakText(q),
        answerText: '100cm', answerValue: 100
      };
    }
    if (kind === 'm-n') {
      n = randInt(2, 9, rng);
      q = n + 'm는 몇 cm예요?';
      return {
        kind: kind, n: n, _dir: randDir(rng),
        question: q, fact: '', speak: speakText(q),
        answerText: (n * 100) + 'cm', answerValue: n * 100
      };
    }
    if (kind === 'tape-cm') {
      t = randInt(0, 9, rng);
      o = randInt(1, 9, rng);
      len = 100 + t * 10 + o;
      q = '물건의 길이는 몇 cm예요?';
      return {
        kind: kind, len: len, max: maxForLen(len), _dir: randDir(rng),
        question: q, fact: '', speak: speakText(q),
        answerText: len + 'cm', answerValue: len
      };
    }
    if (kind === 'tape-mcm') {
      m = randInt(1, 2, rng);
      t = randInt(1, 9, rng);
      o = randInt(1, 9, rng);
      len = toCm(m, t * 10 + o);
      q = '물건의 길이는 몇 m 몇 cm예요?';
      return {
        kind: kind, len: len, max: maxForLen(len), _dir: randDir(rng),
        question: q, fact: '', speak: speakText(q),
        answerText: fmt(len), answerValue: len
      };
    }
    if (kind === 'tape-zero') {
      m = randInt(1, 2, rng);
      o = randInt(1, 9, rng);
      len = toCm(m, o);
      q = '물건의 길이는 몇 m 몇 cm예요?';
      return {
        kind: kind, len: len, max: maxForLen(len),
        question: q, fact: '', speak: speakText(q),
        answerText: fmt(len), answerValue: len
      };
    }
    if (kind === 'cm-to-m') {
      m = randInt(1, 2, rng);
      t = randInt(1, 9, rng);
      o = pickWithRetry(function () {
        var c = randInt(1, 9, rng);
        return c !== t ? c : null;
      }, t === 1 ? 2 : 1);
      len = toCm(m, t * 10 + o);
      q = len + 'cm는 몇 m 몇 cm?';
      return {
        kind: kind, len: len,
        question: q, fact: '', speak: speakText(q),
        answerText: fmt(len), answerValue: len
      };
    }
    if (kind === 'm-to-cm') {
      m = randInt(1, 9, rng);
      if (randInt(0, 1, rng) === 0) {
        o = randInt(1, 9, rng);
        len = toCm(m, o);
      } else {
        t = randInt(1, 9, rng);
        o = pickWithRetry(function () {
          var c = randInt(1, 9, rng);
          return c !== t ? c : null;
        }, t === 1 ? 2 : 1);
        len = toCm(m, t * 10 + o);
      }
      q = fmt(len) + '는 몇 cm?';
      return {
        kind: kind, len: len,
        question: q, fact: '', speak: speakText(q),
        answerText: len + 'cm', answerValue: len
      };
    }
    if (kind === 'compare') {
      type = ['trap', 'cm-longer', 'equal'][randInt(0, 2, rng)];
      if (type === 'trap') {
        mVal = toCm(randInt(2, 9, rng), randInt(1, 9, rng));
        cmVal = randInt(101, mVal - 1, rng);
      } else if (type === 'cm-longer') {
        mVal = toCm(randInt(1, 8, rng), randInt(70, 99, rng));
        cmVal = mVal + randInt(1, 30, rng);
      } else {
        mVal = toCm(randInt(1, 9, rng), randInt(1, 99, rng));
        cmVal = mVal;
      }
      mLeft = randInt(0, 1, rng) === 0;
      a = mLeft ? mVal : cmVal;
      b = mLeft ? cmVal : mVal;
      aText = mLeft ? fmt(mVal) : (cmVal + 'cm');
      bText = mLeft ? (cmVal + 'cm') : fmt(mVal);
      ans = a > b ? '>' : (a < b ? '<' : '=');
      q = aText + ' ○ ' + bText + ' 알맞은 것은?';
      return {
        kind: kind, a: a, b: b, aText: aText, bText: bText, type: type,
        question: q, fact: '',
        speak: sayLen(a) + '와 ' + sayLen(b) + ', 어느 쪽이 길까요?',
        answerText: ans, answerValue: null
      };
    }
    if (kind === 'add') {
      pair = pickAddPair(rng);
      ans = pair.a + pair.b;
      q = fmt(pair.a) + ' + ' + fmt(pair.b) + ' = ?';
      return {
        kind: kind, a: pair.a, b: pair.b, _mDir: randDir(rng), _cmDir: randDir(rng),
        question: q, fact: '',
        speak: sayLen(pair.a) + ' 더하기 ' + sayLen(pair.b) + '는 얼마예요?',
        answerText: fmt(ans), answerValue: ans
      };
    }
    if (kind === 'sub') {
      pair = pickSubPair(rng);
      ans = pair.a - pair.b;
      q = fmt(pair.a) + ' − ' + fmt(pair.b) + ' = ?';
      return {
        kind: kind, a: pair.a, b: pair.b, _mDir: randDir(rng), _cmDir: randDir(rng),
        question: q, fact: '',
        speak: sayLen(pair.a) + ' 빼기 ' + sayLen(pair.b) + '는 얼마예요?',
        answerText: fmt(ans), answerValue: ans
      };
    }
    if (kind === 'word') {
      op = randInt(0, 1, rng) === 0 ? '+' : '-';
      if (op === '+') {
        pair = pickAddPair(rng);
        ans = pair.a + pair.b;
        story = randInt(0, 1, rng) === 0
          ? ('리본 ' + fmt(pair.a) + '에 ' + fmt(pair.b) + '를 이어요')
          : ('빨간 끈 ' + fmt(pair.a) + '와 파란 끈 ' + fmt(pair.b) + '를 이어 붙여요');
        q = '모두 몇 m 몇 cm예요?';
      } else {
        pair = pickSubPair(rng);
        ans = pair.a - pair.b;
        if (randInt(0, 1, rng) === 0) {
          story = '끈 ' + fmt(pair.a) + '에서 ' + fmt(pair.b) + '를 잘라요';
          q = '남은 끈은 몇 m 몇 cm?';
        } else {
          story = '리본 ' + fmt(pair.a) + ' 중에서 ' + fmt(pair.b) + '를 썼어요';
          q = '남은 리본은 몇 m 몇 cm?';
        }
      }
      return {
        kind: kind, a: pair.a, b: pair.b, op: op, story: story,
        _mDir: randDir(rng), _cmDir: randDir(rng),
        question: q, fact: story,
        speak: speakText(story) + ' ' + speakText(q),
        answerText: fmt(ans), answerValue: ans
      };
    }
    if (kind === 'unit-pick') {
      item = UNIT_ITEMS[randInt(0, UNIT_ITEMS.length - 1, rng)];
      return {
        kind: kind, item: item,
        question: item.q, fact: '', speak: speakText(item.q),
        answerText: item.answer, answerValue: item.answerValue
      };
    }
    if (kind === 'body-ruler') {
      n = randInt(2, 5, rng);
      f = '양팔을 벌린 길이는 약 1m예요';
      q = '양팔로 ' + n + '번 잰 길이는?';
      return {
        kind: kind, n: n, _dir: randDir(rng),
        question: q, fact: f,
        speak: speakText(f) + '. ' + speakText(q),
        answerText: '약 ' + n + 'm', answerValue: n * 100
      };
    }
    if (kind === 'closest') {
      var picked = pickWithRetry(function () {
        var r = randInt(12, 28, rng) * 10;
        var d1 = randInt(1, 2, rng) * 10;
        var s1 = randDir(rng);
        var g1 = r + s1 * d1;
        if (g1 < 120 || g1 > 280) g1 = r - s1 * d1;
        var g2 = randInt(12, 28, rng) * 10;
        var g3 = randInt(12, 28, rng) * 10;
        var d2 = Math.abs(g2 - r);
        var d3 = Math.abs(g3 - r);
        if (d2 < d1 + 20 || d3 < d1 + 20 || d2 === d3) return null;
        return { real: r, lens: [g1, g2, g3] };
      }, { real: 200, lens: [190, 230, 150] });
      var lens = picked.lens.slice();
      for (var si = lens.length - 1; si > 0; si--) {
        var sj = randInt(0, si, rng);
        var tmp = lens[si]; lens[si] = lens[sj]; lens[sj] = tmp;
      }
      var bases = [
        { who: 'rabbit', name: '토끼', emoji: '🐰' },
        { who: 'bear', name: '곰', emoji: '🐻' },
        { who: 'fox', name: '여우', emoji: '🦊' }
      ];
      var guesses = [], winIdx = 0, bestDiff = Infinity, gi;
      for (gi = 0; gi < bases.length; gi++) {
        var df = Math.abs(lens[gi] - picked.real);
        if (df < bestDiff) { bestDiff = df; winIdx = gi; }
        guesses.push({ who: bases[gi].who, name: bases[gi].name, emoji: bases[gi].emoji, len: lens[gi] });
      }
      f = '실제 길이는 ' + fmt(picked.real) + '예요';
      q = '누가 더 가깝게 어림했나요?';
      return {
        kind: kind, real: picked.real, guesses: guesses,
        question: q, fact: f,
        speak: speakText(f) + ' ' + speakText(q),
        answerText: guesses[winIdx].emoji + ' ' + guesses[winIdx].name,
        answerValue: null
      };
    }
    return makeProblem('m-n', rng);
  }

  function pushChoice(list, p, value, text, mistake) {
    if (list.length >= 2 || text === p.answerText) return;
    if (typeof value === 'number' && p.answerValue !== null && value === p.answerValue) return;
    if (typeof value === 'number' && mistake !== 'split-wrong' && p.kind !== 'unit-pick') {
      if (value < MIN || value > MAX) return;
    }
    for (var i = 0; i < list.length; i++) {
      if (list[i].text === text) return;
      if (typeof value === 'number' && list[i].value === value) return;
    }
    list.push({ value: value, text: text, mistake: mistake });
  }

  function fillFallbackChoices(list, p) {
    if (typeof p.answerValue !== 'number' || p.kind === 'unit-pick') return;
    var cmOnly = /^\d+cm$/.test(p.answerText);
    var deltas = [10, -10, 1, -1, 2, -2];
    for (var i = 0; i < deltas.length && list.length < 2; i++) {
      var v = p.answerValue + deltas[i];
      var m = Math.abs(deltas[i]) === 10 ? 'off-by-ten' : 'off-by-one';
      pushChoice(list, p, v, cmOnly ? (v + 'cm') : fmt(v), m);
    }
  }

  function wrongChoices(p) {
    var list = [], s, d, n2, m2, c2, v1, v2, i;
    if (p.kind === 'ten-sticks') {
      pushChoice(list, p, 10, '10cm', 'count-only');
      pushChoice(list, p, 90, '90cm', 'count-off');
    } else if (p.kind === 'm-is-cm') {
      pushChoice(list, p, 10, '10cm', 'zero-drop');
      pushChoice(list, p, 1, '1cm', 'unit-ignore');
    } else if (p.kind === 'm-n') {
      pushChoice(list, p, p.n * 10, (p.n * 10) + 'cm', 'zero-drop');
      d = p._dir || 1;
      n2 = p.n === 2 ? 3 : (p.n === 9 ? 8 : p.n + d);
      pushChoice(list, p, n2 * 100, (n2 * 100) + 'cm', 'count-off');
    } else if (p.kind === 'tape-cm') {
      d = (p._dir || 1) * 10;
      pushChoice(list, p, p.len + d, (p.len + d) + 'cm', 'tick-off');
      pushChoice(list, p, p.len - 100, (p.len - 100) + 'cm', 'm-ignore');
    } else if (p.kind === 'tape-mcm') {
      v1 = toCm(Math.floor(p.len / 10), p.len % 10);
      pushChoice(list, p, v1, fmtSplitWrong(p.len), 'split-wrong');
      d = (p._dir || 1) * 10;
      pushChoice(list, p, p.len + d, fmt(p.len + d), 'tick-off');
    } else if (p.kind === 'tape-zero') {
      s = split(p.len);
      v1 = toCm(s.m, s.cm * 10);
      pushChoice(list, p, v1, s.m + 'm ' + s.cm + '0cm', 'zero-shift');
      v2 = s.m * 10 + s.cm;
      pushChoice(list, p, v2, s.m + '' + s.cm + 'cm', 'm-as-ten');
    } else if (p.kind === 'cm-to-m') {
      s = split(p.len);
      v1 = toCm(Math.floor(p.len / 10), p.len % 10);
      pushChoice(list, p, v1, fmtSplitWrong(p.len), 'split-wrong');
      v2 = toCm(s.m, (s.cm % 10) * 10 + Math.floor(s.cm / 10));
      pushChoice(list, p, v2, fmt(v2), 'swap-digits');
    } else if (p.kind === 'm-to-cm') {
      s = split(p.len);
      if (s.cm < 10) {
        v1 = toCm(s.m, s.cm * 10);
        pushChoice(list, p, v1, s.m + '' + s.cm + '0cm', 'zero-shift');
        v2 = s.m * 10 + s.cm;
        pushChoice(list, p, v2, s.m + '' + s.cm + 'cm', 'zero-drop');
      } else {
        v1 = toCm(s.m, (s.cm % 10) * 10 + Math.floor(s.cm / 10));
        pushChoice(list, p, v1, v1 + 'cm', 'swap-digits');
        pushChoice(list, p, s.cm, s.cm + 'cm', 'm-ignore');
      }
    } else if (p.kind === 'compare') {
      if (p.type === 'equal') {
        pushChoice(list, p, null, '>', 'not-equal');
        pushChoice(list, p, null, '<', 'not-equal');
      } else {
        var opp = p.answerText === '>' ? '<' : '>';
        pushChoice(list, p, null, opp, p.type === 'trap' ? 'compare-digits' : 'reverse');
        pushChoice(list, p, null, '=', 'equal');
      }
    } else if (p.kind === 'add' || p.kind === 'sub' || p.kind === 'word') {
      s = split(p.answerValue);
      v1 = toCm(split(p.a).m, s.cm);
      pushChoice(list, p, v1, fmt(v1), 'forget-m');
      m2 = s.m === 1 ? 2 : (s.m === 9 ? 8 : s.m + (p._mDir || 1));
      c2 = s.cm >= 90 ? s.cm - 10 : (s.cm < 10 ? s.cm + 10 : s.cm + (p._cmDir || 1) * 10);
      v2 = toCm(m2, c2);
      pushChoice(list, p, v2, fmt(v2), 'm-slip');
    } else if (p.kind === 'unit-pick') {
      for (i = 0; i < p.item.wrongs.length; i++) {
        pushChoice(list, p, p.item.wrongs[i].value, p.item.wrongs[i].text, p.item.wrongs[i].mistake);
      }
    } else if (p.kind === 'body-ruler') {
      pushChoice(list, p, p.n * 10, '약 ' + (p.n * 10) + 'cm', 'unit-swap');
      n2 = p.n + (p._dir || 1);
      if (n2 < 1) n2 = 2;
      if (n2 > 9) n2 = 8;
      pushChoice(list, p, n2 * 100, '약 ' + n2 + 'm', 'count-off');
    } else if (p.kind === 'closest') {
      for (i = 0; i < p.guesses.length; i++) {
        pushChoice(list, p, null, p.guesses[i].emoji + ' ' + p.guesses[i].name, 'far-guess');
      }
    }
    fillFallbackChoices(list, p);
    return list;
  }

  function problemKey(p) {
    if (p.kind === 'compare') return p.kind + ':' + p.a + ':' + p.b + ':' + p.aText;
    if (p.kind === 'add' || p.kind === 'sub') return p.kind + ':' + p.a + ':' + p.b;
    if (p.kind === 'word') return p.kind + ':' + p.op + ':' + p.a + ':' + p.b;
    if (p.kind === 'closest') return p.kind + ':' + p.real;
    if (p.kind === 'unit-pick') return p.kind + ':' + p.item.name;
    if (p.n !== undefined) return p.kind + ':' + p.n;
    if (p.len !== undefined) return p.kind + ':' + p.len;
    if (p.start !== undefined) return p.kind + ':' + p.start;
    return p.kind + ':' + p.answerText;
  }

  function makeRound(lab, rng) {
    var kinds = LAB_KINDS[lab] || LAB_KINDS[1], used = {}, out = [], i, p;
    for (i = 0; i < kinds.length; i++) {
      p = pickWithRetry(function () {
        var cand = makeProblem(kinds[i], rng);
        return used[problemKey(cand)] ? null : cand;
      }, makeProblem(kinds[i], rng));
      used[problemKey(p)] = true;
      out.push(p);
    }
    return out;
  }

  function bingoCallText(p) {
    if (p.kind === 'm-n') return p.n + 'm는 몇 cm?';
    if (p.kind === 'cm-to-m') return p.len + 'cm는 몇 m 몇 cm?';
    if (p.kind === 'm-to-cm') return fmt(p.len) + '는 몇 cm?';
    if (p.kind === 'add') return fmt(p.a) + ' + ' + fmt(p.b);
    return fmt(p.a) + ' − ' + fmt(p.b);
  }

  function makeBingo(rng) {
    var usedText = {}, usedVal = {}, out = [], i, p, m, c;
    for (i = 0; i < 9; i++) {
      p = pickWithRetry(function () {
        var k = BINGO_KINDS[randInt(0, BINGO_KINDS.length - 1, rng)];
        var cand = makeProblem(k, rng);
        if (cand.answerText.length > 7) return null;
        if (usedText[cand.answerText] || usedVal[cand.answerValue]) return null;
        return cand;
      }, null);
      if (p === null) {
        for (m = 1; m <= 9 && p === null; m++) {
          for (c = 1; c <= 98 && p === null; c++) {
            var v = toCm(m, c);
            var txt = v + 'cm';
            if (!usedText[txt] && !usedVal[v]) {
              p = {
                kind: 'm-to-cm', len: v,
                question: fmt(v) + '는 몇 cm?', fact: '',
                speak: speakText(fmt(v) + '는 몇 cm?'),
                answerText: txt, answerValue: v
              };
            }
          }
        }
      }
      usedText[p.answerText] = true;
      usedVal[p.answerValue] = true;
      p.call = bingoCallText(p);
      p.speak = speakText(p.kind === 'add' || p.kind === 'sub' ? p.call + '는 얼마예요?' : p.call);
      out.push(p);
    }
    return out;
  }

  function makeRibbon(rng) {
    var target = pickWithRetry(function () {
      var t = randInt(3, 39, rng) * 10;
      var m = Math.floor(t / 100);
      var tens = Math.floor((t % 100) / 10);
      return m + tens <= 8 ? t : null;
    }, 140);
    var text = '리본 ' + fmt(target) + ' 주세요';
    return { target: target, text: text, speak: speakText(text) };
  }

  function ribbonPress(cur, btn) {
    var delta = btn === 'm' ? 100 : (btn === 't' ? 10 : 0);
    var next = cur + delta;
    return next > 400 ? cur : next;
  }

  function ribbonFeedback(cur, target) {
    var diff = cur - target;
    var text = diff === 0
      ? '딱 맞아요!'
      : (diff > 0 ? '주문보다 ' + fmt(diff) + ' 길어요' : '주문보다 ' + fmt(-diff) + ' 짧아요');
    return { ok: diff === 0, diff: diff, text: text, speak: speakText(text) };
  }

  global.LengthMCore = {
    MIN: MIN,
    MAX: MAX,
    randInt: randInt,
    split: split,
    toCm: toCm,
    fmt: fmt,
    sayLen: sayLen,
    speakText: speakText,
    fmtSplitWrong: fmtSplitWrong,
    UNIT_ITEMS: UNIT_ITEMS,
    LAB_KINDS: LAB_KINDS,
    BINGO_KINDS: BINGO_KINDS,
    makeProblem: makeProblem,
    wrongChoices: wrongChoices,
    makeRound: makeRound,
    makeBingo: makeBingo,
    makeRibbon: makeRibbon,
    ribbonPress: ribbonPress,
    ribbonFeedback: ribbonFeedback
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = global.LengthMCore;
})(typeof window !== 'undefined' ? window : globalThis);
