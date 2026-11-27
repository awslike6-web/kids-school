// 초등 2학년 2학기 '5. 표와 그래프' 순수 계산 (TableGraphCore, docs/math_2-2_graph_spec.md)
(function (global) {
  'use strict';

  var MAX_TRIES = 200;

  var TOPICS = [
    {
      id: 'fruit', word: '과일', unit: '명',
      kinds: [
        { emoji: '🍎', label: '사과' }, { emoji: '🍌', label: '바나나' },
        { emoji: '🍊', label: '귤' }, { emoji: '🍇', label: '포도' }, { emoji: '🍓', label: '딸기' }
      ]
    },
    {
      id: 'animal', word: '동물', unit: '명',
      kinds: [
        { emoji: '🐶', label: '강아지' }, { emoji: '🐱', label: '고양이' },
        { emoji: '🐰', label: '토끼' }, { emoji: '🐻', label: '곰' }, { emoji: '🦊', label: '여우' }
      ]
    },
    {
      id: 'color', word: '색깔', unit: '명',
      kinds: [
        { emoji: '🔴', label: '빨강' }, { emoji: '🟡', label: '노랑' },
        { emoji: '🔵', label: '파랑' }, { emoji: '🟢', label: '초록' }, { emoji: '🟣', label: '보라' }
      ]
    },
    {
      id: 'sport', word: '운동', unit: '명',
      kinds: [
        { emoji: '⚽', label: '축구' }, { emoji: '🏊', label: '수영' },
        { emoji: '⚾', label: '야구' }, { emoji: '🏀', label: '농구' }, { emoji: '🥋', label: '태권도' }
      ]
    },
    {
      id: 'snack', word: '간식', unit: '명',
      kinds: [
        { emoji: '🍬', label: '사탕' }, { emoji: '🍪', label: '과자' },
        { emoji: '🍩', label: '도넛' }, { emoji: '🍫', label: '초코' }, { emoji: '🍰', label: '케이크' }
      ]
    },
    {
      id: 'season', word: '계절', unit: '명',
      kinds: [
        { emoji: '🌸', label: '봄' }, { emoji: '☀️', label: '여름' },
        { emoji: '🍁', label: '가을' }, { emoji: '⛄', label: '겨울' }
      ]
    },
    {
      id: 'basket', word: '과일', unit: '개',
      kinds: [
        { emoji: '🍎', label: '사과' }, { emoji: '🍌', label: '바나나' },
        { emoji: '🍊', label: '귤' }, { emoji: '🍇', label: '포도' }, { emoji: '🍓', label: '딸기' }
      ]
    }
  ];

  var FRIENDS = ['지우', '하준', '서연', '도윤', '수아', '시우', '하은', '은우', '지호', '예린', '준서', '다온'];

  var LAB_KINDS = {
    1: ['count-kind', 'table-total', 'table-blank'],
    2: ['survey-count', 'survey-who', 'survey-most'],
    3: ['graph-count', 'graph-most', 'graph-diff'],
    4: ['draw-col', 'draw-col', 'graph-rows'],
    5: ['more-than', 'which-easy', 'most-least-diff']
  };

  var HINTS = {
    'miss-one': '손가락으로 짚으며 세어요',
    'other-kind': '다른 것을 셌어요',
    'skip-one': '빠뜨린 것이 있어요',
    'add-slip': '다시 더해 봐요',
    'total-as-blank': '합계는 빈칸이 아니에요',
    'sum-others': '합계에서 빼요',
    'count-all': '고른 친구만 세어요',
    'wrong-friend': '이름 아래 그림을 봐요',
    'next-cell': '○ 수만 세어요',
    'rows-as-count': '칸 수가 아니라 ○ 수',
    'most-least-swap': '가장 많은지 적은지 봐요',
    'add-instead': '더 많은 만큼은 빼요',
    'read-one': '두 수를 같이 봐요',
    'count-slip': '다시 세어 봐요',
    'total-rows': '합계가 아니라 가장 큰 수',
    'kinds-rows': '가장 큰 수만큼 칸이 필요해요',
    'include-equal': '같은 것은 많은 게 아니에요'
  };

  var SURVEY_TOPICS = ['animal', 'fruit', 'sport', 'snack'];
  var STUDENT_TOPICS = ['fruit', 'animal', 'color', 'sport', 'snack', 'season'];
  var TOOL_NAMES = { survey: '조사한 자료', table: '표', graph: '그래프' };

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

  function markWord(mark) {
    if (mark === '○') return '동그라미';
    if (mark === '×') return '엑스';
    if (mark === '/') return '빗금';
    return String(mark || '');
  }

  function speakText(text) {
    if (text == null) return '';
    var s = String(text);
    s = s.replace(/[\uD83C-\uD83E][\uDC00-\uDFFF]/g, '');
    s = s.replace(/[\u2600-\u27BF\u2B00-\u2BFF]/g, '');
    s = s.replace(/[\uFE0F\u200D]/g, '');
    s = s.replace(/□/g, '빈칸');
    s = s.replace(/○를/g, '동그라미를').replace(/○/g, '동그라미');
    s = s.replace(/×를/g, '엑스를').replace(/×/g, '엑스');
    s = s.replace(/\/를/g, '빗금을').replace(/(^|\s)\/(?=\s|$)/g, '$1빗금');
    s = s.replace(/:/g, '');
    s = s.replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '');
    return s;
  }

  function buildSpeak(fact, question) {
    return speakText(fact ? (fact + ' ' + question) : question);
  }

  function arrayContains(arr, val) {
    for (var i = 0; i < arr.length; i++) {
      if (arr[i] === val) return true;
    }
    return false;
  }

  function sumValues(values) {
    var t = 0;
    for (var i = 0; i < values.length; i++) t += values[i];
    return t;
  }

  function extremeIndex(values, wantMax) {
    var idx = 0;
    for (var i = 1; i < values.length; i++) {
      if (wantMax ? (values[i] > values[idx]) : (values[i] < values[idx])) idx = i;
    }
    return idx;
  }

  function checkDataConstraints(values, opts) {
    var i, j, total = sumValues(values), minV = values[0], maxV = values[0], ones = 0;
    if (total < opts.minTotal || total > opts.maxTotal) return false;
    for (i = 0; i < values.length; i++) {
      if (values[i] < minV) minV = values[i];
      if (values[i] > maxV) maxV = values[i];
      if (values[i] === 1) ones++;
      if (opts.distinct) {
        for (j = i + 1; j < values.length; j++) {
          if (values[i] === values[j]) return false;
        }
      }
    }
    if (opts.exactOne && ones !== 1) return false;
    if (opts.uniqueMax || opts.uniqueMin) {
      var maxCnt = 0, minCnt = 0;
      for (i = 0; i < values.length; i++) {
        if (values[i] === maxV) maxCnt++;
        if (values[i] === minV) minCnt++;
      }
      if (opts.uniqueMax && maxCnt !== 1) return false;
      if (opts.uniqueMin && minCnt !== 1) return false;
    }
    return true;
  }

  function fallbackValues(kCount, opts) {
    var vals = [], i, total;
    if (opts.exactOne && kCount === 3 && opts.minTotal <= 8 && opts.maxTotal >= 8) {
      return [1, 3, 4];
    }
    if (opts.distinct && kCount === 5 && opts.max >= 8 && opts.maxTotal >= 26) {
      return [2, 4, 5, 7, 8];
    }
    for (i = 0; i < kCount; i++) {
      vals.push(Math.min(opts.max, opts.min + i));
    }
    total = sumValues(vals);
    while (total < opts.minTotal) {
      for (i = kCount - 1; i >= 0 && total < opts.minTotal; i--) {
        if (vals[i] < opts.max) { vals[i]++; total++; }
      }
    }
    while (total > opts.maxTotal) {
      for (i = kCount - 1; i >= 0 && total > opts.maxTotal; i--) {
        if (vals[i] > opts.min) { vals[i]--; total--; }
      }
    }
    return vals;
  }

  function makeData(rng, opts) {
    var o = opts || {};
    var kCount = o.kinds || randInt(3, 4, rng);
    var cfg = {
      min: o.min != null ? o.min : 1,
      max: o.max != null ? o.max : 6,
      distinct: !!o.distinct,
      uniqueMax: !!o.uniqueMax,
      uniqueMin: !!o.uniqueMin,
      exactOne: !!o.exactOne,
      minTotal: o.minTotal != null ? o.minTotal : 0,
      maxTotal: o.maxTotal != null ? o.maxTotal : 20
    };
    var allowIds = o.topicIds || STUDENT_TOPICS;
    var pool = [], i;
    for (i = 0; i < TOPICS.length; i++) {
      if (arrayContains(allowIds, TOPICS[i].id) && TOPICS[i].kinds.length >= kCount) {
        pool.push(TOPICS[i]);
      }
    }
    if (pool.length === 0) pool.push(TOPICS[0]);
    var topic = pool[randInt(0, pool.length - 1, rng)];
    var idxs = [], j;
    for (i = 0; i < topic.kinds.length; i++) idxs.push(i);
    idxs = shuffle(idxs, rng).slice(0, kCount);
    idxs.sort(function (a, b) { return a - b; });
    var kinds = [];
    for (i = 0; i < idxs.length; i++) kinds.push(topic.kinds[idxs[i]]);
    var values = pickWithRetry(function () {
      var arr = [];
      for (j = 0; j < kCount; j++) arr.push(randInt(cfg.min, cfg.max, rng));
      return checkDataConstraints(arr, cfg) ? arr : null;
    }, null);
    if (!values) values = fallbackValues(kCount, cfg);
    return {
      topic: topic,
      kinds: kinds,
      values: values,
      total: sumValues(values)
    };
  }

  function buildSurvey(data, rng) {
    var names = shuffle(FRIENDS, rng), list = [], i, j, pos = 0;
    for (i = 0; i < data.kinds.length; i++) {
      for (j = 0; j < data.values[i]; j++) {
        list.push({ name: names[pos++], kind: i });
      }
    }
    return shuffle(list, rng);
  }

  function pickRows(data, rng) {
    var maxV = data.values[extremeIndex(data.values, true)];
    if (maxV >= 6) return 6;
    return randInt(5, 6, rng);
  }

  function pickOrient(rng, opts) {
    if (opts && (opts.orient === 'v' || opts.orient === 'h')) return opts.orient;
    return randInt(0, 1, rng) === 0 ? 'v' : 'h';
  }

  function pickMark(rng) {
    return ['○', '×', '/'][randInt(0, 2, rng)];
  }

  function makeProblem(kind, rng, opts) {
    var data, target, label, fact, q, cards, survey, i, j, blank, orient, mark, rows;
    var most, idx, a, b, pairs, col, maxV, minV, baseCands, base, k, tool, half;
    if (kind === 'count-kind') {
      data = makeData(rng, { kinds: randInt(3, 4, rng), min: 1, max: 5, minTotal: 8, maxTotal: 10, topicIds: ['basket'] });
      target = randInt(0, data.kinds.length - 1, rng);
      cards = [];
      for (i = 0; i < data.kinds.length; i++) {
        for (j = 0; j < data.values[i]; j++) {
          cards.push({ emoji: data.kinds[i].emoji, label: data.kinds[i].label });
        }
      }
      cards = shuffle(cards, rng);
      label = data.kinds[target].label;
      fact = '바구니 속 과일을 세어요';
      q = label + josa(label, '은/는') + ' 몇 개예요?';
      return {
        kind: kind, data: data, cards: cards, target: target,
        fact: fact, question: q, speak: buildSpeak(fact, q),
        answerText: data.values[target] + '개'
      };
    }
    if (kind === 'table-total') {
      data = makeData(rng);
      fact = '좋아하는 ' + data.topic.word + '을 조사했어요';
      q = '합계는 몇 명이에요?';
      return {
        kind: kind, data: data, _dir: randInt(0, 1, rng) === 0 ? 1 : -1,
        fact: fact, question: q, speak: buildSpeak(fact, q),
        answerText: data.total + '명'
      };
    }
    if (kind === 'table-blank') {
      data = makeData(rng);
      blank = randInt(0, data.kinds.length - 1, rng);
      half = randInt(0, 1, rng);
      fact = '합계는 ' + data.total + '명이에요';
      q = '□에 알맞은 수는?';
      return {
        kind: kind, data: data, blank: blank, _half: half,
        fact: fact, question: q, speak: buildSpeak(fact, q),
        answerText: data.values[blank] + '명'
      };
    }
    if (kind === 'survey-count') {
      data = makeData(rng, { kinds: 3, min: 1, max: 5, minTotal: 7, maxTotal: 9, topicIds: SURVEY_TOPICS });
      survey = buildSurvey(data, rng);
      target = randInt(0, data.kinds.length - 1, rng);
      label = data.kinds[target].label;
      fact = '친구들이 좋아하는 ' + data.topic.word + '을 조사했어요';
      q = label + josa(label, '을/를') + ' 고른 친구는 몇 명이에요?';
      return {
        kind: kind, data: data, survey: survey, target: target,
        fact: fact, question: q, speak: buildSpeak(fact, q),
        answerText: data.values[target] + '명'
      };
    }
    if (kind === 'survey-who') {
      data = makeData(rng, { kinds: 3, min: 1, max: 6, exactOne: true, minTotal: 7, maxTotal: 9, topicIds: SURVEY_TOPICS });
      survey = buildSurvey(data, rng);
      target = 0;
      for (i = 0; i < data.values.length; i++) {
        if (data.values[i] === 1) { target = i; break; }
      }
      var who = survey[0].name;
      for (i = 0; i < survey.length; i++) {
        if (survey[i].kind === target) { who = survey[i].name; break; }
      }
      label = data.kinds[target].label;
      fact = '친구들이 좋아하는 ' + data.topic.word + '을 조사했어요';
      q = label + josa(label, '을/를') + ' 고른 친구는 누구예요?';
      return {
        kind: kind, data: data, survey: survey, target: target,
        fact: fact, question: q, speak: buildSpeak(fact, q),
        answerText: who
      };
    }
    if (kind === 'survey-most') {
      data = makeData(rng, { kinds: 3, min: 1, max: 6, uniqueMax: true, uniqueMin: true, minTotal: 7, maxTotal: 9, topicIds: SURVEY_TOPICS });
      survey = buildSurvey(data, rng);
      idx = extremeIndex(data.values, true);
      fact = '친구들이 좋아하는 ' + data.topic.word + '을 조사했어요';
      q = '가장 많은 친구가 고른 ' + data.topic.word + '은?';
      return {
        kind: kind, data: data, survey: survey,
        fact: fact, question: q, speak: buildSpeak(fact, q),
        answerText: data.kinds[idx].label
      };
    }
    if (kind === 'graph-count') {
      data = makeData(rng);
      orient = pickOrient(rng, opts);
      mark = pickMark(rng);
      rows = pickRows(data, rng);
      target = randInt(0, data.kinds.length - 1, rng);
      label = data.kinds[target].label;
      fact = '좋아하는 ' + data.topic.word + '을 그래프로 나타냈어요';
      q = label + josa(label, '을/를') + ' 좋아하는 학생은 몇 명이에요?';
      return {
        kind: kind, data: data, orient: orient, mark: mark, rows: rows, target: target,
        fact: fact, question: q, speak: buildSpeak(fact, q),
        answerText: data.values[target] + '명'
      };
    }
    if (kind === 'graph-most') {
      data = makeData(rng, { uniqueMax: true, uniqueMin: true });
      orient = pickOrient(rng, opts);
      mark = pickMark(rng);
      rows = pickRows(data, rng);
      most = randInt(0, 1, rng) === 0;
      idx = extremeIndex(data.values, most);
      fact = '좋아하는 ' + data.topic.word + '을 그래프로 나타냈어요';
      q = '가장 ' + (most ? '많은' : '적은') + ' 학생이 좋아하는 ' + data.topic.word + '은?';
      return {
        kind: kind, data: data, orient: orient, mark: mark, rows: rows, most: most,
        fact: fact, question: q, speak: buildSpeak(fact, q),
        answerText: data.kinds[idx].label
      };
    }
    if (kind === 'graph-diff') {
      data = makeData(rng, { uniqueMax: true, uniqueMin: true });
      orient = pickOrient(rng, opts);
      mark = pickMark(rng);
      rows = pickRows(data, rng);
      pairs = [];
      for (i = 0; i < data.values.length; i++) {
        for (j = 0; j < data.values.length; j++) {
          if (data.values[i] > data.values[j]) pairs.push([i, j]);
        }
      }
      var pair = pairs[randInt(0, pairs.length - 1, rng)];
      a = pair[0];
      b = pair[1];
      half = randInt(0, 1, rng);
      fact = '좋아하는 ' + data.topic.word + '을 그래프로 나타냈어요';
      q = data.kinds[a].label + josa(data.kinds[a].label, '은/는') + ' ' + data.kinds[b].label + '보다 몇 명 더 많아요?';
      return {
        kind: kind, data: data, orient: orient, mark: mark, rows: rows, a: a, b: b, _half: half,
        fact: fact, question: q, speak: buildSpeak(fact, q),
        answerText: (data.values[a] - data.values[b]) + '명'
      };
    }
    if (kind === 'draw-col') {
      data = makeData(rng, { max: 5 });
      orient = pickOrient(rng, opts);
      rows = pickRows(data, rng);
      col = randInt(0, data.kinds.length - 1, rng);
      fact = '표를 보고 그래프를 완성해요';
      q = data.kinds[col].label + ' 칸에 ○를 그려요';
      return {
        kind: kind, data: data, orient: orient, mark: '○', rows: rows, col: col,
        fact: fact, question: q, speak: buildSpeak(fact, q),
        answerText: data.values[col] + '개'
      };
    }
    if (kind === 'graph-rows') {
      data = makeData(rng);
      maxV = data.values[extremeIndex(data.values, true)];
      fact = '표를 보고 세로 그래프를 그리려고 해요';
      q = '세로 칸은 가장 적게 몇 칸 필요해요?';
      return {
        kind: kind, data: data,
        fact: fact, question: q, speak: buildSpeak(fact, q),
        answerText: maxV + '칸'
      };
    }
    if (kind === 'more-than') {
      data = makeData(rng, { uniqueMax: true });
      orient = pickOrient(rng, opts);
      mark = pickMark(rng);
      rows = pickRows(data, rng);
      maxV = data.values[extremeIndex(data.values, true)];
      baseCands = [];
      for (i = 0; i < data.values.length; i++) {
        if (data.values[i] < maxV && !arrayContains(baseCands, data.values[i])) {
          baseCands.push(data.values[i]);
        }
      }
      base = baseCands[randInt(0, baseCands.length - 1, rng)];
      k = 0;
      for (i = 0; i < data.values.length; i++) {
        if (data.values[i] > base) k++;
      }
      fact = '좋아하는 ' + data.topic.word + '을 그래프로 나타냈어요';
      q = base + '명보다 많은 ' + data.topic.word + '은 몇 가지예요?';
      return {
        kind: kind, data: data, orient: orient, mark: mark, rows: rows, base: base,
        fact: fact, question: q, speak: buildSpeak(fact, q),
        answerText: k + '가지'
      };
    }
    if (kind === 'which-easy') {
      tool = ['survey', 'table', 'graph'][randInt(0, 2, rng)];
      if (tool === 'survey') q = '누가 무엇을 골랐는지 알 수 있는 것은?';
      else if (tool === 'table') q = '모두 몇 명인지 알기 쉬운 것은?';
      else q = '가장 많은 것을 한눈에 알기 쉬운 것은?';
      return {
        kind: kind, tool: tool,
        fact: '', question: q, speak: speakText(q),
        answerText: TOOL_NAMES[tool]
      };
    }
    if (kind === 'most-least-diff') {
      data = makeData(rng, { uniqueMax: true, uniqueMin: true });
      orient = pickOrient(rng, opts);
      mark = pickMark(rng);
      rows = pickRows(data, rng);
      maxV = data.values[extremeIndex(data.values, true)];
      minV = data.values[extremeIndex(data.values, false)];
      fact = '가장 많은 것과 가장 적은 것을 견주어요';
      q = '가장 많은 쪽이 몇 명 더 많아요?';
      return {
        kind: kind, data: data, orient: orient, mark: mark, rows: rows,
        fact: fact, question: q, speak: buildSpeak(fact, q),
        answerText: (maxV - minV) + '명'
      };
    }
    return makeProblem('table-total', rng, opts);
  }

  function pushChoice(list, p, text, mistake) {
    if (list.length >= 2 || !text || text === p.answerText) return;
    var m = /^(\d+)(개|명|칸|가지)$/.exec(text);
    if (m && parseInt(m[1], 10) < 1) return;
    for (var i = 0; i < list.length; i++) {
      if (list[i].text === text) return;
    }
    list.push({ text: text, mistake: mistake });
  }

  function fillNumFallback(list, p) {
    var m = /^(\d+)(개|명|칸|가지)$/.exec(p.answerText);
    if (!m) return;
    var base = parseInt(m[1], 10), unit = m[2];
    var deltas = [1, -1, 2, -2, 3, -3], i, v;
    for (i = 0; i < deltas.length && list.length < 2; i++) {
      v = base + deltas[i];
      if (v >= 1) pushChoice(list, p, v + unit, 'add-slip');
    }
  }

  function wrongChoices(p) {
    var list = [], i, n, v, other, maxI, minI, diff, va, vb, eqCnt, kCnt, tools;
    if (p.kind === 'count-kind') {
      n = p.data.values[p.target];
      other = null;
      for (i = 0; i < p.data.values.length; i++) {
        if (i !== p.target && p.data.values[i] !== n) {
          if (other === null || p.data.values[i] < n) other = p.data.values[i];
        }
      }
      if (n >= 2) {
        if (other !== null && other < n) {
          pushChoice(list, p, other + '개', 'other-kind');
          pushChoice(list, p, (n + 1) + '개', 'miss-one');
        } else {
          pushChoice(list, p, (n - 1) + '개', 'miss-one');
          if (other !== null) pushChoice(list, p, other + '개', 'other-kind');
        }
      } else {
        pushChoice(list, p, (n + 1) + '개', 'miss-one');
        if (other !== null) pushChoice(list, p, other + '개', 'other-kind');
      }
    } else if (p.kind === 'table-total') {
      pushChoice(list, p, (p.data.total - p.data.values[0]) + '명', 'skip-one');
      v = p.data.total + (p._dir || 1);
      if (v < 1) v = p.data.total + 1;
      pushChoice(list, p, v + '명', 'add-slip');
    } else if (p.kind === 'table-blank') {
      v = p.data.values[p.blank];
      pushChoice(list, p, p.data.total + '명', 'total-as-blank');
      if (p._half === 0) {
        pushChoice(list, p, (p.data.total - v) + '명', 'sum-others');
      } else {
        pushChoice(list, p, (v >= 2 ? v - 1 : v + 1) + '명', 'add-slip');
      }
    } else if (p.kind === 'survey-count') {
      n = p.data.values[p.target];
      pushChoice(list, p, (n >= 2 ? n - 1 : n + 1) + '명', 'miss-one');
      pushChoice(list, p, p.data.total + '명', 'count-all');
    } else if (p.kind === 'survey-who') {
      for (i = 0; i < p.survey.length && list.length < 2; i++) {
        if (p.survey[i].kind !== p.target) {
          pushChoice(list, p, p.survey[i].name, 'wrong-friend');
        }
      }
    } else if (p.kind === 'survey-most') {
      minI = extremeIndex(p.data.values, false);
      pushChoice(list, p, p.data.kinds[minI].label, 'most-least-swap');
      for (i = 0; i < p.data.kinds.length && list.length < 2; i++) {
        pushChoice(list, p, p.data.kinds[i].label, 'other-kind');
      }
    } else if (p.kind === 'graph-count') {
      n = p.data.values[p.target];
      if (n >= 2) pushChoice(list, p, (n - 1) + '명', 'miss-one');
      if (n < p.rows) pushChoice(list, p, (n + 1) + '명', 'next-cell');
      if (p.rows !== n) pushChoice(list, p, p.rows + '명', 'rows-as-count');
    } else if (p.kind === 'graph-most') {
      other = extremeIndex(p.data.values, !p.most);
      pushChoice(list, p, p.data.kinds[other].label, 'most-least-swap');
      for (i = 0; i < p.data.kinds.length && list.length < 2; i++) {
        pushChoice(list, p, p.data.kinds[i].label, 'other-kind');
      }
    } else if (p.kind === 'graph-diff') {
      va = p.data.values[p.a];
      vb = p.data.values[p.b];
      diff = va - vb;
      pushChoice(list, p, (va + vb) + '명', 'add-instead');
      if (p._half === 0) {
        pushChoice(list, p, va + '명', 'read-one');
      } else {
        pushChoice(list, p, (diff >= 2 ? diff - 1 : diff + 1) + '명', 'count-slip');
      }
    } else if (p.kind === 'graph-rows') {
      pushChoice(list, p, p.data.total + '칸', 'total-rows');
      pushChoice(list, p, p.data.kinds.length + '칸', 'kinds-rows');
    } else if (p.kind === 'more-than') {
      eqCnt = 0;
      kCnt = 0;
      for (i = 0; i < p.data.values.length; i++) {
        if (p.data.values[i] >= p.base) eqCnt++;
        if (p.data.values[i] > p.base) kCnt++;
      }
      pushChoice(list, p, eqCnt + '가지', 'include-equal');
      if (kCnt >= 2) pushChoice(list, p, (kCnt - 1) + '가지', 'miss-one');
      else pushChoice(list, p, p.data.kinds.length + '가지', 'count-all');
    } else if (p.kind === 'which-easy') {
      tools = ['survey', 'table', 'graph'];
      for (i = 0; i < tools.length; i++) {
        if (tools[i] !== p.tool) pushChoice(list, p, TOOL_NAMES[tools[i]], 'mix-tool');
      }
    } else if (p.kind === 'most-least-diff') {
      maxI = extremeIndex(p.data.values, true);
      minI = extremeIndex(p.data.values, false);
      diff = p.data.values[maxI] - p.data.values[minI];
      pushChoice(list, p, p.data.values[maxI] + '명', 'read-one');
      pushChoice(list, p, (diff >= 2 ? diff - 1 : diff + 1) + '명', 'count-slip');
    }
    fillNumFallback(list, p);
    return list;
  }

  function hintFor(p, mistake, pickedText) {
    if (p && p.kind === 'which-easy') {
      if (p.tool === 'survey') {
        if (pickedText === '표') return '표로는 누가 골랐는지 몰라요';
        if (pickedText === '그래프') return '그래프로는 누가 골랐는지 몰라요';
      } else if (p.tool === 'table') {
        if (pickedText === '조사한 자료') return '하나하나 다 세어야 해요';
        if (pickedText === '그래프') return '표에 합계가 있어요';
      } else if (p.tool === 'graph') {
        if (pickedText === '조사한 자료') return '하나하나 세어야 해요';
        if (pickedText === '표') return '그래프는 높이로 바로 보여요';
      }
    }
    if (p && mistake === 'other-kind' && (p.kind === 'graph-most' || p.kind === 'survey-most')) {
      return p.most === false ? '가장 적은 것을 찾아요' : '가장 많은 것을 찾아요';
    }
    return HINTS[mistake] || '문제를 다시 읽어 봐요';
  }

  function problemKey(p) {
    var topicId = p.data ? p.data.topic.id : '';
    return p.kind + ':' + topicId + ':' + (p.orient || '') + ':' + p.answerText;
  }

  function makeRound(lab, rng) {
    var kinds = LAB_KINDS[lab] || LAB_KINDS[1], used = {}, out = [], i, opts, p;
    for (i = 0; i < kinds.length; i++) {
      opts = (lab === 4 && kinds[i] === 'draw-col') ? { orient: i === 0 ? 'v' : 'h' } : null;
      p = pickWithRetry(function () {
        var cand = makeProblem(kinds[i], rng, opts);
        return used[problemKey(cand)] ? null : cand;
      }, makeProblem(kinds[i], rng, opts));
      used[problemKey(p)] = true;
      out.push(p);
    }
    return out;
  }

  function drawFeedback(count, target) {
    var diff = target - count;
    var ok = diff === 0;
    var text = ok ? '딱 맞아요!' : (diff > 0 ? ('○ ' + diff + '개 더 그려요') : ('○ ' + (-diff) + '개 지워요'));
    return { ok: ok, diff: diff, text: text };
  }

  function makeVote(rng) {
    var pool = ['fruit', 'animal', 'color', 'sport', 'snack', 'season'];
    var tid = pool[randInt(0, pool.length - 1, rng)];
    var data = makeData(rng, {
      kinds: randInt(3, 4, rng), min: 1, max: 5,
      uniqueMax: true, minTotal: 6, maxTotal: 8, topicIds: [tid]
    });
    var votes = buildSurvey(data, rng);
    var answer = extremeIndex(data.values, true);
    var speakCards = [], i, v;
    for (i = 0; i < votes.length; i++) {
      v = votes[i];
      speakCards.push(v.name + josa(v.name, '은/는') + ' ' + data.kinds[v.kind].label);
    }
    return {
      topic: data.topic,
      kinds: data.kinds,
      votes: votes,
      answer: answer,
      speakCards: speakCards
    };
  }

  function voteFeedback(cardKind, pressedKind, kinds) {
    if (cardKind === pressedKind) return { ok: true, text: '' };
    var label = kinds && kinds[cardKind] ? kinds[cardKind].label : '';
    return { ok: false, text: label + ' 칸에 그려요' };
  }

  function tryBingoProblems(data, rng) {
    var problems = [], usedAns = {}, usedPairs = {}, i, a, b, call, ans, kind, labelA, labelB;
    for (i = 0; i < data.kinds.length; i++) {
      labelA = data.kinds[i].label;
      call = labelA + josa(labelA, '은/는') + ' 몇 명?';
      ans = data.values[i] + '명';
      if (usedAns[ans]) return null;
      usedAns[ans] = true;
      problems.push({ kind: 'bingo-count', call: call, speak: speakText(call), answerText: ans });
    }
    call = '합계는 몇 명?';
    ans = data.total + '명';
    if (usedAns[ans]) return null;
    usedAns[ans] = true;
    problems.push({ kind: 'bingo-total', call: call, speak: speakText(call), answerText: ans });
    var cands = [];
    for (a = 0; a < data.kinds.length; a++) {
      for (b = 0; b < data.kinds.length; b++) {
        if (a === b) continue;
        var pk = a < b ? (a + ':' + b) : (b + ':' + a);
        if (data.values[a] > data.values[b]) {
          cands.push({ kind: 'bingo-diff', a: a, b: b, pk: pk, val: data.values[a] - data.values[b] });
        }
        if (a < b) {
          cands.push({ kind: 'bingo-pair', a: a, b: b, pk: pk, val: data.values[a] + data.values[b] });
        }
      }
    }
    cands = shuffle(cands, rng);
    for (i = 0; i < cands.length && problems.length < 9; i++) {
      var c = cands[i];
      ans = c.val + '명';
      if (usedPairs[c.pk] || usedAns[ans]) continue;
      usedPairs[c.pk] = true;
      usedAns[ans] = true;
      labelA = data.kinds[c.a].label;
      labelB = data.kinds[c.b].label;
      kind = c.kind;
      if (kind === 'bingo-diff') {
        call = labelA + josa(labelA, '은/는') + ' ' + labelB + '보다 몇 명 더 많아요?';
      } else {
        call = labelA + josa(labelA, '과/와') + ' ' + labelB + josa(labelB, '은/는') + ' 모두 몇 명?';
      }
      problems.push({ kind: kind, call: call, speak: speakText(call), answerText: ans });
    }
    return problems.length === 9 ? problems : null;
  }

  function makeBingo(rng) {
    var res = pickWithRetry(function () {
      var d = makeData(rng, { kinds: 5, min: 1, max: 9, distinct: true, maxTotal: 30 });
      var probs = tryBingoProblems(d, rng);
      return probs ? { data: d, problems: probs } : null;
    }, null);
    if (res) return res;
    var fbData = makeData(rng, { kinds: 5, min: 1, max: 9, distinct: true, maxTotal: 30 });
    fbData.values = [1, 2, 4, 7, 10];
    fbData.total = 24;
    return { data: fbData, problems: tryBingoProblems(fbData, rng) || [] };
  }

  global.TableGraphCore = {
    randInt: randInt,
    josa: josa,
    markWord: markWord,
    speakText: speakText,
    TOPICS: TOPICS,
    FRIENDS: FRIENDS,
    LAB_KINDS: LAB_KINDS,
    HINTS: HINTS,
    makeData: makeData,
    makeProblem: makeProblem,
    wrongChoices: wrongChoices,
    hintFor: hintFor,
    makeRound: makeRound,
    drawFeedback: drawFeedback,
    makeVote: makeVote,
    voteFeedback: voteFeedback,
    makeBingo: makeBingo
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = global.TableGraphCore;
})(typeof window !== 'undefined' ? window : globalThis);
