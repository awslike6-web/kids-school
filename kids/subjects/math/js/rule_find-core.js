// 초등 2학년 2학기 '6. 규칙 찾기' 순수 계산 (RuleFindCore, docs/math_2-2_rule_spec.md)
(function (global) {
  'use strict';

  var MAX_TRIES = 200;

  var ITEM_SETS = [
    {
      id: 'fruit', name: '과일',
      items: [
        { emoji: '🍎', name: '사과' }, { emoji: '🍌', name: '바나나' },
        { emoji: '🍇', name: '포도' }, { emoji: '🍓', name: '딸기' }, { emoji: '🍊', name: '귤' }
      ]
    },
    {
      id: 'animal', name: '동물',
      items: [
        { emoji: '🐶', name: '강아지' }, { emoji: '🐱', name: '고양이' },
        { emoji: '🐰', name: '토끼' }, { emoji: '🐻', name: '곰' }, { emoji: '🐼', name: '판다' }
      ]
    }
  ];

  var ARROWS = ['⬆️', '➡️', '⬇️', '⬅️'];
  var SHAPE_KEYS = ['circle', 'square'];
  var COLOR_KEYS = ['red', 'yellow', 'blue', 'green'];
  var SHAPES = {
    circle: { red: '🔴', yellow: '🟡', blue: '🔵', green: '🟢' },
    square: { red: '🟥', yellow: '🟨', blue: '🟦', green: '🟩' }
  };
  var TILES = ['🟥', '🟨', '🟦', '🟩', '🟪'];
  var UNITS = ['ABB', 'AAB', 'ABC', 'AABB', 'ABCC'];
  var DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];
  var ROW_NAMES = ['가', '나', '다', '라'];

  function repeatOne(n) {
    var out = [], i;
    for (i = 0; i < n; i++) out.push(1);
    return out;
  }

  var STACKS = [
    { id: 'line1', a: 1, d: 1, shape: function (n) { return repeatOne(n); } },
    { id: 'ell', a: 1, d: 2, shape: function (n) { return [n].concat(repeatOne(n - 1)); } },
    { id: 'twin', a: 2, d: 2, shape: function (n) { return [n, n]; } },
    { id: 'tower3', a: 3, d: 3, shape: function (n) { return [n, n, n]; } }
  ];

  var LAB_KINDS = {
    1: ['pattern-next', 'pattern-turn', 'pattern-two'],
    2: ['stack-step', 'stack-next', 'stack-fifth'],
    3: ['add-blank', 'add-dir', 'add-diag'],
    4: ['mul-step', 'mul-blank', 'mul-swap'],
    5: ['cal-dir', 'cal-week', 'seat-blank']
  };

  var HINTS = {
    'repeat-last': '되풀이되는 마디를 찾아요',
    'unit-shift': '마디를 하나씩 짚어요',
    'other-item': '마디를 하나씩 짚어요',
    'turn-back': '시계 방향으로 돌아요',
    'color-wrong': '색깔 규칙도 봐요',
    'shape-wrong': '모양 규칙도 봐요',
    'step-plus': '앞 모양보다 몇 개 많은지 봐요',
    'second-count': '앞 모양보다 몇 개 많은지 봐요',
    'same-as-last': '한 번 더 늘어나요',
    'count-slip': '다시 세어 봐요',
    'dir-mix': '칠한 칸끼리 차례대로 봐요',
    'step-one': '↘ 방향은 2씩 커져요',
    'next-dan': '칠한 수의 차이를 봐요',
    'prev-dan': '칠한 수의 차이를 봐요',
    'add-instead': '곱셈표는 곱해요',
    'next-cell': '가로줄과 세로줄을 다시 봐요',
    'swap-slip': '두 수 자리만 바꿔요',
    'count-cells': '칠한 수끼리 빼 봐요',
    'one-week-short': '1주일씩 세어 가요',
    'one-week-more': '1주일씩 세어 가요',
    'row-as-one': '아래로는 한 줄만큼 커져요'
  };

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

  function shuffle(arr, rng) {
    var out = arr.slice(), i, j, tmp;
    for (i = out.length - 1; i > 0; i--) {
      j = randInt(0, i, rng);
      tmp = out[i];
      out[i] = out[j];
      out[j] = tmp;
    }
    return out;
  }

  function arrayContains(arr, val) {
    for (var i = 0; i < arr.length; i++) {
      if (arr[i] === val) return true;
    }
    return false;
  }

  function hasBatchim(word) {
    if (!word) return false;
    var s = String(word);
    var code = s.charCodeAt(s.length - 1);
    if (code < 0xAC00 || code > 0xD7A3) return false;
    return (code - 0xAC00) % 28 !== 0;
  }

  function josa(word, pair) {
    var parts = String(pair).split('/');
    if (parts.length !== 2) return '';
    return hasBatchim(word) ? parts[0] : parts[1];
  }

  function josaNum(n, pair) {
    var parts = String(pair).split('/');
    if (parts.length !== 2) return '';
    var d = Math.abs(Math.floor(Number(n))) % 10;
    var batchim = (d === 0 || d === 1 || d === 3 || d === 6 || d === 7 || d === 8);
    return batchim ? parts[0] : parts[1];
  }

  function speakText(text) {
    if (text == null) return '';
    var s = String(text);
    s = s.replace(/□ 칸/g, '빈칸').replace(/□/g, '빈칸');
    s = s.replace(/★ 칸/g, '별 칸').replace(/★/g, '별');
    s = s.replace(/→/g, '오른쪽').replace(/↓/g, '아래');
    s = s.replace(/↘/g, '오른쪽 아래').replace(/↙/g, '왼쪽 아래');
    s = s.replace(/ × /g, ' 곱하기 ');
    s = s.replace(/[\uD83C-\uD83E][\uDC00-\uDFFF]/g, '');
    s = s.replace(/[\u2600-\u27BF\u2B00-\u2BFF]/g, '');
    s = s.replace(/[\uFE0F\u200D]/g, '');
    s = s.replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '');
    return s;
  }

  function buildSpeak(fact, question) {
    return speakText(fact ? (fact + '. ' + question) : question);
  }

  function seqRange(start) {
    return [start, start + 1, start + 2, start + 3];
  }

  function findStack(familyId) {
    for (var i = 0; i < STACKS.length; i++) {
      if (STACKS[i].id === familyId) return STACKS[i];
    }
    return STACKS[0];
  }

  function findItemSetByEmoji(emoji) {
    var i, j;
    for (i = 0; i < ITEM_SETS.length; i++) {
      for (j = 0; j < ITEM_SETS[i].items.length; j++) {
        if (ITEM_SETS[i].items[j].emoji === emoji) return ITEM_SETS[i];
      }
    }
    return ITEM_SETS[0];
  }

  function findShapeInfo(emoji) {
    var s, c;
    for (s = 0; s < SHAPE_KEYS.length; s++) {
      for (c = 0; c < COLOR_KEYS.length; c++) {
        if (SHAPES[SHAPE_KEYS[s]][COLOR_KEYS[c]] === emoji) {
          return { shape: SHAPE_KEYS[s], color: COLOR_KEYS[c] };
        }
      }
    }
    return { shape: 'circle', color: 'red' };
  }

  function makeProblem(kind, rng, opts) {
    var o = opts || {};
    var unit, set, items, map, len, seq, i, fact, q, start, colors, blank;
    var fam, shapes, countShapes, rows, cols, star, dir, dirs, r, c, marks;
    var row, ia, ib, a, b, firstDay, d, weekday, first, nth, date, rowNames, perRow;

    if (kind === 'pattern-next') {
      unit = UNITS[randInt(0, UNITS.length - 1, rng)];
      set = ITEM_SETS[randInt(0, ITEM_SETS.length - 1, rng)];
      items = shuffle(set.items, rng);
      map = { A: items[0].emoji, B: items[1].emoji, C: items[2].emoji };
      len = unit.length === 4 ? 8 : randInt(8, 9, rng);
      seq = [];
      for (i = 0; i < len; i++) seq.push(map[unit.charAt(i % unit.length)]);
      q = '다음에 올 것은?';
      return {
        kind: kind, seq: seq, unit: unit,
        fact: '', question: q, speak: buildSpeak('', q),
        answerText: map[unit.charAt(len % unit.length)]
      };
    }
    if (kind === 'pattern-turn') {
      start = randInt(0, 3, rng);
      seq = [];
      for (i = 0; i < 8; i++) seq.push(ARROWS[(start + i) % 4]);
      fact = '화살표가 시계 방향으로 돌아요';
      q = '다음에 올 것은?';
      return {
        kind: kind, seq: seq,
        fact: fact, question: q, speak: buildSpeak(fact, q),
        answerText: ARROWS[start]
      };
    }
    if (kind === 'pattern-two') {
      colors = shuffle(COLOR_KEYS, rng).slice(0, 3);
      seq = [];
      for (i = 0; i < 9; i++) {
        seq.push(SHAPES[SHAPE_KEYS[i % 2]][colors[i % 3]]);
      }
      blank = randInt(6, 8, rng);
      fact = '모양과 색깔이 따로 바뀌어요';
      q = '□에 알맞은 것은?';
      return {
        kind: kind, seq: seq, blank: blank,
        fact: fact, question: q, speak: buildSpeak(fact, q),
        answerText: seq[blank]
      };
    }
    if (kind === 'stack-step' || kind === 'stack-next' || kind === 'stack-fifth') {
      fam = o.family ? findStack(o.family) : STACKS[randInt(0, STACKS.length - 1, rng)];
      countShapes = kind === 'stack-fifth' ? 4 : 3;
      shapes = [];
      for (i = 1; i <= countShapes; i++) shapes.push(fam.shape(i));
      if (kind === 'stack-step') {
        q = '쌓기나무가 몇 개씩 늘어나요?';
        return {
          kind: kind, family: fam.id, shapes: shapes, a: fam.a, d: fam.d,
          fact: '', question: q, speak: buildSpeak('', q),
          answerText: fam.d + '개씩'
        };
      }
      if (kind === 'stack-next') {
        q = '넷째 모양은 쌓기나무 몇 개?';
        return {
          kind: kind, family: fam.id, shapes: shapes, a: fam.a, d: fam.d,
          fact: '', question: q, speak: buildSpeak('', q),
          answerText: (fam.a + 3 * fam.d) + '개'
        };
      }
      q = '다섯째 모양은 쌓기나무 몇 개?';
      return {
        kind: kind, family: fam.id, shapes: shapes, a: fam.a, d: fam.d,
        fact: '', question: q, speak: buildSpeak('', q),
        answerText: (fam.a + 4 * fam.d) + '개'
      };
    }
    if (kind === 'add-blank') {
      rows = seqRange(randInt(0, 5, rng));
      cols = seqRange(randInt(0, 5, rng));
      star = [randInt(0, 3, rng), randInt(0, 3, rng)];
      q = '★ 칸에 알맞은 수는?';
      return {
        kind: kind, rows: rows, cols: cols, star: star,
        fact: '', question: q, speak: buildSpeak('', q),
        answerText: String(rows[star[0]] + cols[star[1]])
      };
    }
    if (kind === 'add-dir') {
      rows = seqRange(randInt(0, 5, rng));
      cols = seqRange(randInt(0, 5, rng));
      dirs = ['→', '↓', '↘', '↙'];
      dir = dirs[randInt(0, 3, rng)];
      if (dir === '→') {
        r = randInt(0, 3, rng);
        c = randInt(0, 1, rng);
        marks = [[r, c], [r, c + 1], [r, c + 2]];
      } else if (dir === '↓') {
        r = randInt(0, 1, rng);
        c = randInt(0, 3, rng);
        marks = [[r, c], [r + 1, c], [r + 2, c]];
      } else if (dir === '↘') {
        r = randInt(0, 1, rng);
        c = randInt(0, 1, rng);
        marks = [[r, c], [r + 1, c + 1], [r + 2, c + 2]];
      } else {
        r = randInt(0, 1, rng);
        c = randInt(2, 3, rng);
        marks = [[r, c], [r + 1, c - 1], [r + 2, c - 2]];
      }
      fact = dir + ' 방향으로 칠했어요';
      q = '칠한 수는 어떻게 바뀌어요?';
      return {
        kind: kind, rows: rows, cols: cols, marks: marks, dir: dir,
        fact: fact, question: q, speak: buildSpeak(fact, q),
        answerText: dir === '↙' ? '모두 같아요' : (dir === '↘' ? '2씩 커져요' : '1씩 커져요')
      };
    }
    if (kind === 'add-diag') {
      rows = seqRange(randInt(0, 5, rng));
      cols = seqRange(randInt(0, 5, rng));
      marks = [[0, 0], [1, 1], [2, 2]];
      blank = [3, 3];
      fact = '↘ 방향으로 칠했어요';
      q = '□ 칸에 알맞은 수는?';
      return {
        kind: kind, rows: rows, cols: cols, marks: marks, blank: blank,
        fact: fact, question: q, speak: buildSpeak(fact, q),
        answerText: String(rows[3] + cols[3])
      };
    }
    if (kind === 'mul-step') {
      rows = seqRange(randInt(2, 6, rng));
      cols = seqRange(randInt(1, 6, rng));
      row = randInt(0, 3, rng);
      q = '칠한 가로줄의 수는 몇씩 커져요?';
      return {
        kind: kind, rows: rows, cols: cols, row: row,
        fact: '', question: q, speak: buildSpeak('', q),
        answerText: rows[row] + '씩 커져요'
      };
    }
    if (kind === 'mul-blank') {
      rows = seqRange(randInt(2, 6, rng));
      cols = seqRange(randInt(1, 6, rng));
      star = [randInt(0, 3, rng), randInt(0, 3, rng)];
      q = '★ 칸에 알맞은 수는?';
      return {
        kind: kind, rows: rows, cols: cols, star: star,
        fact: '', question: q, speak: buildSpeak('', q),
        answerText: String(rows[star[0]] * cols[star[1]])
      };
    }
    if (kind === 'mul-swap') {
      rows = seqRange(randInt(2, 6, rng));
      cols = rows.slice();
      ia = randInt(0, 3, rng);
      ib = (ia + randInt(1, 3, rng)) % 4;
      a = rows[ia];
      b = cols[ib];
      q = a + ' × ' + b + josaNum(b, '과/와') + ' 곱한 값이 같은 것은?';
      return {
        kind: kind, rows: rows, cols: cols, a: a, b: b,
        fact: '', question: q, speak: buildSpeak('', q),
        answerText: b + ' × ' + a
      };
    }
    if (kind === 'cal-dir') {
      firstDay = randInt(0, 6, rng);
      dir = randInt(0, 1, rng) === 0 ? '→' : '↓';
      if (dir === '→') {
        d = pickWithRetry(function () {
          var cand = randInt(1, 28, rng);
          return ((firstDay + cand - 1) % 7) <= 4 ? cand : null;
        }, 1);
        if (((firstDay + d - 1) % 7) > 4) {
          d = (7 - firstDay) % 7 + 1;
        }
        marks = [d, d + 1, d + 2];
      } else {
        d = randInt(1, 16, rng);
        marks = [d, d + 7, d + 14];
      }
      fact = dir + ' 방향으로 칠했어요';
      q = '칠한 수는 몇씩 커져요?';
      return {
        kind: kind, firstDay: firstDay, days: 30, marks: marks, dir: dir,
        fact: fact, question: q, speak: buildSpeak(fact, q),
        answerText: dir === '→' ? '1씩 커져요' : '7씩 커져요'
      };
    }
    if (kind === 'cal-week') {
      weekday = randInt(0, 6, rng);
      first = randInt(1, 7, rng);
      firstDay = ((weekday - (first - 1)) % 7 + 7) % 7;
      nth = randInt(3, 4, rng);
      date = first + 7 * (nth - 1);
      fact = '이번 달 첫째 ' + DAY_NAMES[weekday] + '요일은 ' + first + '일이에요';
      q = (nth === 3 ? '셋째' : '넷째') + ' ' + DAY_NAMES[weekday] + '요일은 며칠이에요?';
      return {
        kind: kind, firstDay: firstDay, days: 31, weekday: weekday, first: first, nth: nth,
        fact: fact, question: q, speak: buildSpeak(fact, q),
        answerText: date + '일'
      };
    }
    if (kind === 'seat-blank') {
      rowNames = ROW_NAMES.slice(0, randInt(3, 4, rng));
      perRow = randInt(5, 6, rng);
      blank = { r: randInt(1, rowNames.length - 1, rng), c: randInt(0, perRow - 1, rng) };
      fact = '오른쪽으로 1씩, 아래로 ' + perRow + '씩 커져요';
      q = '□ 자리의 번호는?';
      return {
        kind: kind, rowNames: rowNames, perRow: perRow, blank: blank,
        fact: fact, question: q, speak: buildSpeak(fact, q),
        answerText: String(blank.r * perRow + blank.c + 1)
      };
    }
    return makeProblem('pattern-next', rng, opts);
  }

  function pushChoice(list, p, text, mistake) {
    if (list.length >= 2 || !text || text === p.answerText) return;
    var allowZero = p.kind === 'add-blank';
    var m = /^(-?\d+)(개씩|개|씩 커져요|일)?$/.exec(text);
    if (m) {
      var val = parseInt(m[1], 10);
      if (allowZero ? val < 0 : val < 1) return;
      if (p.kind === 'cal-week' && (val < 1 || val > 31)) return;
    }
    for (var i = 0; i < list.length; i++) {
      if (list[i].text === text) return;
    }
    list.push({ text: text, mistake: mistake });
  }

  function fillNumFallback(list, p) {
    var m = /^(\d+)(개씩|개|씩 커져요|일)?$/.exec(p.answerText);
    if (!m) return;
    var base = parseInt(m[1], 10), unit = m[2] || '';
    var deltas = [1, -1, 2, -2, 3, -3], i, v;
    for (i = 0; i < deltas.length && list.length < 2; i++) {
      v = base + deltas[i];
      pushChoice(list, p, v + unit, 'count-slip');
    }
  }

  function wrongChoices(p) {
    var list = [], i, set, info, c, val, last, rv, cv, idx, d, date, num, rowAbove;
    var addOpts = ['1씩 커져요', '2씩 커져요', '모두 같아요'];
    if (p.kind === 'pattern-next') {
      pushChoice(list, p, p.seq[p.seq.length - 1], 'repeat-last');
      for (i = 0; i < p.seq.length && list.length < 2; i++) {
        pushChoice(list, p, p.seq[i], 'unit-shift');
      }
      set = findItemSetByEmoji(p.seq[0]);
      for (i = 0; i < set.items.length && list.length < 2; i++) {
        pushChoice(list, p, set.items[i].emoji, 'other-item');
      }
    } else if (p.kind === 'pattern-turn') {
      last = p.seq[p.seq.length - 1];
      idx = 0;
      for (i = 0; i < ARROWS.length; i++) {
        if (ARROWS[i] === last) { idx = i; break; }
      }
      pushChoice(list, p, ARROWS[(idx + 3) % 4], 'turn-back');
      pushChoice(list, p, last, 'repeat-last');
    } else if (p.kind === 'pattern-two') {
      info = findShapeInfo(p.answerText);
      for (i = 0; i < 3; i++) {
        c = findShapeInfo(p.seq[i]).color;
        if (c !== info.color) {
          pushChoice(list, p, SHAPES[info.shape][c], 'color-wrong');
          break;
        }
      }
      pushChoice(list, p, SHAPES[info.shape === 'circle' ? 'square' : 'circle'][info.color], 'shape-wrong');
    } else if (p.kind === 'stack-step') {
      pushChoice(list, p, (p.d + 1) + '개씩', 'step-plus');
      pushChoice(list, p, (p.a + p.d) + '개씩', 'second-count');
      pushChoice(list, p, (p.d + 2) + '개씩', 'second-count');
    } else if (p.kind === 'stack-next') {
      pushChoice(list, p, (p.a + 2 * p.d) + '개', 'same-as-last');
      pushChoice(list, p, (p.a + 3 * p.d + 1) + '개', 'count-slip');
      pushChoice(list, p, (p.a + 4 * p.d) + '개', 'count-slip');
    } else if (p.kind === 'stack-fifth') {
      pushChoice(list, p, (p.a + 3 * p.d) + '개', 'same-as-last');
      pushChoice(list, p, (p.a + 4 * p.d + 1) + '개', 'count-slip');
    } else if (p.kind === 'add-blank') {
      val = parseInt(p.answerText, 10);
      pushChoice(list, p, String(val + 1), 'count-slip');
      pushChoice(list, p, String(val - 1 < 0 ? val + 2 : val - 1), 'count-slip');
    } else if (p.kind === 'add-dir') {
      for (i = 0; i < addOpts.length; i++) {
        pushChoice(list, p, addOpts[i], 'dir-mix');
      }
    } else if (p.kind === 'add-diag') {
      last = p.rows[2] + p.cols[2];
      pushChoice(list, p, String(last + 1), 'step-one');
      pushChoice(list, p, String(last + 3), 'count-slip');
    } else if (p.kind === 'mul-step') {
      d = p.rows[p.row];
      pushChoice(list, p, (d + 1) + '씩 커져요', 'next-dan');
      pushChoice(list, p, (d === 2 ? d + 2 : d - 1) + '씩 커져요', 'prev-dan');
    } else if (p.kind === 'mul-blank') {
      rv = p.rows[p.star[0]];
      cv = p.cols[p.star[1]];
      pushChoice(list, p, String(rv + cv), 'add-instead');
      pushChoice(list, p, String(rv * (cv < 9 ? cv + 1 : cv - 1)), 'next-cell');
      if (cv > 1) pushChoice(list, p, String(rv * (cv - 1)), 'next-cell');
    } else if (p.kind === 'mul-swap') {
      pushChoice(list, p, p.a + ' + ' + p.b, 'add-instead');
      pushChoice(list, p, p.b + ' × ' + (p.a + 1 <= 9 ? p.a + 1 : p.a - 1), 'swap-slip');
    } else if (p.kind === 'cal-dir') {
      if (p.dir === '→') {
        pushChoice(list, p, '7씩 커져요', 'dir-mix');
        pushChoice(list, p, '2씩 커져요', 'count-cells');
      } else {
        pushChoice(list, p, '1씩 커져요', 'dir-mix');
        pushChoice(list, p, '8씩 커져요', 'count-cells');
      }
    } else if (p.kind === 'cal-week') {
      date = parseInt(p.answerText, 10);
      pushChoice(list, p, (date - 7) + '일', 'one-week-short');
      if (date + 7 <= 31) pushChoice(list, p, (date + 7) + '일', 'one-week-more');
      else pushChoice(list, p, (date + 1) + '일', 'count-slip');
    } else if (p.kind === 'seat-blank') {
      num = parseInt(p.answerText, 10);
      rowAbove = num - p.perRow + 1;
      pushChoice(list, p, String(rowAbove === num ? num + 2 : rowAbove), 'row-as-one');
      pushChoice(list, p, String(num + 1), 'count-slip');
    }
    fillNumFallback(list, p);
    return list;
  }

  function hintFor(p, mistake) {
    return HINTS[mistake] || '문제를 다시 읽어 봐요';
  }

  function problemKey(p) {
    return p.kind + ':' + (p.unit || p.family || p.dir || '') + ':' + p.answerText;
  }

  function makeRound(lab, rng) {
    var kinds = LAB_KINDS[lab] || LAB_KINDS[1], used = {}, out = [], i, opts = null, p;
    if (lab === 2) {
      opts = { family: STACKS[randInt(0, STACKS.length - 1, rng)].id };
    }
    for (i = 0; i < kinds.length; i++) {
      p = pickWithRetry(function () {
        var cand = makeProblem(kinds[i], rng, opts);
        return used[problemKey(cand)] ? null : cand;
      }, makeProblem(kinds[i], rng, opts));
      used[problemKey(p)] = true;
      out.push(p);
    }
    return out;
  }

  function makePuzzle(rng) {
    var rows = 4, cols = 5, mode = randInt(0, 1, rng) === 0 ? 'col' : 'diag';
    var L = randInt(2, 3, rng);
    var shuffled = shuffle(TILES, rng);
    var unit = shuffled.slice(0, L), cells = [], r, c, blanks, palette;
    for (r = 0; r < rows; r++) {
      for (c = 0; c < cols; c++) {
        cells.push(mode === 'col' ? unit[c % L] : unit[(c + r) % L]);
      }
    }
    var maxC = mode === 'diag' ? 3 : 4;
    blanks = pickWithRetry(function () {
      var cs = [randInt(0, maxC, rng), randInt(0, maxC, rng), randInt(0, maxC, rng)];
      var d1 = [1 - cs[0], 2 - cs[1], 3 - cs[2]];
      var d2 = [1 + cs[0], 2 + cs[1], 3 + cs[2]];
      if (d1[0] === d1[1] || d1[0] === d1[2] || d1[1] === d1[2]) return null;
      if (d2[0] === d2[1] || d2[0] === d2[2] || d2[1] === d2[2]) return null;
      if (cs[0] === cs[1] || cs[0] === cs[2] || cs[1] === cs[2]) return null;
      return [5 + cs[0], 10 + cs[1], 15 + cs[2]];
    }, [5, 13, 16]);
    palette = unit.slice();
    if (L === 2) palette.push(shuffled[2]);
    palette = shuffle(palette, rng);
    return { rows: rows, cols: cols, cells: cells, blanks: blanks, palette: palette, mode: mode };
  }

  function puzzleCheck(puzzle, blankIdx, tile) {
    return !!(puzzle && puzzle.cells && puzzle.cells[blankIdx] === tile);
  }

  function puzzleHint(puzzle) {
    return puzzle && puzzle.mode === 'diag' ? '오른쪽 위 칸을 봐요' : '바로 위 칸을 봐요';
  }

  function tryOneBingo(kind, rng) {
    var a, d, k, m, n, call, ans;
    if (kind === 'seq-up') {
      a = randInt(1, 20, rng);
      d = randInt(2, 5, rng);
      ans = a + 4 * d;
      if (ans > 81) return null;
      call = a + ', ' + (a + d) + ', ' + (a + 2 * d) + ', ' + (a + 3 * d) + ' 다음 수는?';
      return { kind: kind, call: call, speak: speakText(call), answerText: String(ans) };
    }
    if (kind === 'seq-down') {
      d = randInt(2, 5, rng);
      a = randInt(4 * d + 1, 40, rng);
      ans = a - 4 * d;
      call = a + ', ' + (a - d) + ', ' + (a - 2 * d) + ', ' + (a - 3 * d) + ' 다음 수는?';
      return { kind: kind, call: call, speak: speakText(call), answerText: String(ans) };
    }
    if (kind === 'cal-below') {
      n = randInt(1, 23, rng);
      ans = n + 7;
      call = '달력에서 ' + n + '일 바로 아래 수는?';
      return { kind: kind, call: call, speak: speakText(call), answerText: String(ans) };
    }
    k = randInt(2, 9, rng);
    m = randInt(4, 8, rng);
    ans = k * (m + 1);
    call = k + '단: ' + (k * (m - 2)) + ', ' + (k * (m - 1)) + ', ' + (k * m) + ' 다음 수는?';
    return { kind: kind, call: call, speak: speakText(call), answerText: String(ans) };
  }

  function makeBingo(rng) {
    var baseKinds = ['seq-up', 'seq-up', 'seq-down', 'seq-down', 'cal-below', 'cal-below', 'mul-next', 'mul-next'];
    var extra = ['seq-up', 'seq-down', 'cal-below', 'mul-next'][randInt(0, 3, rng)];
    var kinds = shuffle(baseKinds.concat([extra]), rng);
    var res = pickWithRetry(function () {
      var out = [], used = {}, i, item;
      for (i = 0; i < kinds.length; i++) {
        item = tryOneBingo(kinds[i], rng);
        if (!item || used[item.answerText] || item.call.length > 25) return null;
        used[item.answerText] = true;
        out.push(item);
      }
      return out;
    }, null);
    if (res) return res;
    return [
      { kind: 'seq-up', call: '2, 4, 6, 8 다음 수는?', speak: '2, 4, 6, 8 다음 수는?', answerText: '10' },
      { kind: 'seq-up', call: '3, 6, 9, 12 다음 수는?', speak: '3, 6, 9, 12 다음 수는?', answerText: '15' },
      { kind: 'seq-down', call: '20, 18, 16, 14 다음 수는?', speak: '20, 18, 16, 14 다음 수는?', answerText: '12' },
      { kind: 'seq-down', call: '30, 27, 24, 21 다음 수는?', speak: '30, 27, 24, 21 다음 수는?', answerText: '18' },
      { kind: 'cal-below', call: '달력에서 4일 바로 아래 수는?', speak: '달력에서 4일 바로 아래 수는?', answerText: '11' },
      { kind: 'cal-below', call: '달력에서 9일 바로 아래 수는?', speak: '달력에서 9일 바로 아래 수는?', answerText: '16' },
      { kind: 'mul-next', call: '4단: 8, 12, 16 다음 수는?', speak: '4단 8, 12, 16 다음 수는?', answerText: '20' },
      { kind: 'mul-next', call: '5단: 15, 20, 25 다음 수는?', speak: '5단 15, 20, 25 다음 수는?', answerText: '30' },
      { kind: 'mul-next', call: '6단: 18, 24, 30 다음 수는?', speak: '6단 18, 24, 30 다음 수는?', answerText: '36' }
    ];
  }

  global.RuleFindCore = {
    randInt: randInt,
    josa: josa,
    josaNum: josaNum,
    speakText: speakText,
    ITEM_SETS: ITEM_SETS,
    ARROWS: ARROWS,
    SHAPES: SHAPES,
    TILES: TILES,
    UNITS: UNITS,
    STACKS: STACKS,
    LAB_KINDS: LAB_KINDS,
    HINTS: HINTS,
    makeProblem: makeProblem,
    wrongChoices: wrongChoices,
    hintFor: hintFor,
    makeRound: makeRound,
    makePuzzle: makePuzzle,
    puzzleCheck: puzzleCheck,
    puzzleHint: puzzleHint,
    makeBingo: makeBingo
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = global.RuleFindCore;
})(typeof window !== 'undefined' ? window : globalThis);
