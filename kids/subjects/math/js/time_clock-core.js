// 초등 2학년 2학기 '4. 시각과 시간' 순수 계산 (TimeClockCore, docs/math_2-2_time_spec.md)
(function (global) {
  'use strict';

  var MAX_TRIES = 200;
  var WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
  var MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  var SCENES = [
    { name: '아침밥', q: '아침밥 먹는 시각은?', ampm: '오전', h: 7, m: 0, text: '오전 7시' },
    { name: '학교 가기', q: '학교 가는 시각은?', ampm: '오전', h: 8, m: 30, text: '오전 8시 30분' },
    { name: '수업 듣기', q: '수업 듣는 시각은?', ampm: '오전', h: 10, m: 0, text: '오전 10시' },
    { name: '학교 끝나기', q: '학교 끝나는 시각은?', ampm: '오후', h: 1, m: 0, text: '오후 1시' },
    { name: '간식 먹기', q: '간식 먹는 시각은?', ampm: '오후', h: 3, m: 0, text: '오후 3시' },
    { name: '저녁밥', q: '저녁밥 먹는 시각은?', ampm: '오후', h: 6, m: 0, text: '오후 6시' },
    { name: '잠자기', q: '잠자는 시각으로 알맞은 것은?', ampm: '오후', h: 9, m: 0, text: '오후 9시' }
  ];

  var FRIENDS = [
    { name: '토끼', emoji: '🐰', josa: '와' },
    { name: '곰', emoji: '🐻', josa: '과' },
    { name: '여우', emoji: '🦊', josa: '와' },
    { name: '다람쥐', emoji: '🐿️', josa: '와' },
    { name: '고양이', emoji: '🐱', josa: '와' }
  ];

  var LAB_KINDS = {
    1: ['min-of-number', 'read5', 'set5'],
    2: ['read1', 'set1', 'before'],
    3: ['h-to-min', 'min-to-h', 'elapsed'],
    4: ['am-pm', 'day-hours', 'day-elapsed'],
    5: ['week-days', 'cal-week', 'month-days']
  };

  var BINGO_KINDS = ['h-to-min', 'min-to-h', 'before', 'day-hours', 'week-days'];

  function randInt(lo, hi, rng) {
    var r = typeof rng === 'function' ? rng() : Math.random();
    var idx = Math.floor(r * (hi - lo + 1));
    if (idx < 0) idx = 0;
    if (idx > hi - lo) idx = hi - lo;
    return lo + idx;
  }

  function randDir(rng) {
    return randInt(0, 1, rng) === 0 ? 1 : -1;
  }

  function pickWithRetry(tryFn, fallback) {
    for (var i = 0; i < MAX_TRIES; i++) {
      var res = tryFn();
      if (res !== null) return res;
    }
    return fallback;
  }

  function fmtTime(h, m) {
    return m === 0 ? (h + '시') : (h + '시 ' + m + '분');
  }

  function fmtDur(min) {
    var h = Math.floor(min / 60);
    var m = min % 60;
    if (h === 0) return m + '분';
    if (m === 0) return h + '시간';
    return h + '시간 ' + m + '분';
  }

  function addMinutes(h, m, d) {
    var total = (((h % 12) * 60 + m + d) % 720 + 720) % 720;
    var nh = Math.floor(total / 60);
    if (nh === 0) nh = 12;
    return { h: nh, m: total % 60 };
  }

  function josaNum(n, kind) {
    var d = Math.abs(n) % 10;
    var batchim = (d === 0 || d === 1 || d === 3 || d === 6 || d === 7 || d === 8);
    if (kind === '을' || kind === '를') return batchim ? '을' : '를';
    if (kind === '이' || kind === '가') return batchim ? '이' : '가';
    if (kind === '와' || kind === '과') return batchim ? '과' : '와';
    if (kind === '은' || kind === '는') return batchim ? '은' : '는';
    return '';
  }

  function durValue(text) {
    if (text == null) return null;
    var s = String(text).replace(/^\s+|\s+$/g, '');
    if (s.indexOf('시') !== -1 && s.indexOf('시간') === -1) return null;
    if (s.indexOf('전') !== -1 || s.indexOf('오전') !== -1 || s.indexOf('오후') !== -1) return null;
    var mHM = /^(\d+)시간\s+(\d+)분$/.exec(s);
    if (mHM) return parseInt(mHM[1], 10) * 60 + parseInt(mHM[2], 10);
    var mH = /^(\d+)시간$/.exec(s);
    if (mH) return parseInt(mH[1], 10) * 60;
    var mM = /^(\d+)분$/.exec(s);
    if (mM) return parseInt(mM[1], 10);
    var mD = /^(\d+)일$/.exec(s);
    if (mD) return parseInt(mD[1], 10) * 1440;
    return null;
  }

  function timeValue(text) {
    if (text == null) return null;
    var s = String(text).replace(/^\s+|\s+$/g, '');
    if (s.indexOf('시간') !== -1 || s.indexOf('전') !== -1) return null;
    var ampm = 0;
    if (s.indexOf('오전 ') === 0) {
      s = s.slice(3);
    } else if (s.indexOf('오후 ') === 0) {
      ampm = 12;
      s = s.slice(3);
    }
    var mHM = /^(\d+)시\s+(\d+)분$/.exec(s);
    if (mHM) return (parseInt(mHM[1], 10) + ampm) * 60 + parseInt(mHM[2], 10);
    var mH = /^(\d+)시$/.exec(s);
    if (mH) return (parseInt(mH[1], 10) + ampm) * 60;
    return null;
  }

  function pickNonMult5(maxBlock, rng) {
    var idx = randInt(0, maxBlock * 4 - 1, rng);
    return Math.floor(idx / 4) * 5 + (idx % 4) + 1;
  }

  function buildSpeak(fact, question) {
    return fact ? (fact + ' ' + question) : question;
  }

  // 읽기 문제 시계: 짧은바늘과 긴바늘이 20° 이상 떨어진 시만 (4시 22분처럼 겹치면 읽기 어려움)
  function handsApart(h, m) {
    var d = Math.abs(((h % 12) * 30 + m * 0.5) - m * 6) % 360;
    return Math.min(d, 360 - d) >= 20;
  }

  function apartHour(m, rng) {
    var h = randInt(1, 12, rng), tries = 0;
    while (!handsApart(h, m) && tries < 24) { h = randInt(1, 12, rng); tries += 1; }
    while (!handsApart(h, m)) h = h % 12 + 1;
    return h;
  }

  function makeBeforeProblem(dir, rng) {
    var h = randInt(1, 12, rng);
    var m, next, q, ans, ansTime;
    if (dir === 'to') {
      m = [40, 45, 50, 55][randInt(0, 3, rng)];
      h = apartHour(m, rng);
      next = h === 12 ? 1 : h + 1;
      q = fmtTime(h, m) + '은 ' + next + '시 몇 분 전?';
      ans = (60 - m) + '분 전';
      return {
        kind: 'before', dir: 'to', h: h, m: m,
        question: q, fact: '', speak: q, answerText: ans
      };
    }
    m = [5, 10, 15, 20][randInt(0, 3, rng)];
    ansTime = addMinutes(h, 0, -m);
    q = h + '시 ' + m + '분 전은 몇 시 몇 분?';
    ans = fmtTime(ansTime.h, ansTime.m);
    return {
      kind: 'before', dir: 'from', h: h, m: m,
      question: q, fact: '', speak: q, answerText: ans
    };
  }

  function makeProblem(kind, rng) {
    var n, h, m, f, q, ans, total, picked, scene, cands, i, d, hr, pair, firstDay, date, dir, month, days;
    if (kind === 'min-of-number') {
      n = randInt(1, 11, rng);
      q = '긴바늘이 ' + n + josaNum(n, '을') + ' 가리키면 몇 분?';
      return {
        kind: kind, n: n, _dir: randDir(rng),
        question: q, fact: '', speak: q,
        answerText: (n * 5) + '분'
      };
    }
    if (kind === 'read5') {
      m = randInt(1, 11, rng) * 5;
      h = apartHour(m, rng);
      q = '몇 시 몇 분이에요?';
      return {
        kind: kind, h: h, m: m,
        question: q, fact: '', speak: q,
        answerText: fmtTime(h, m)
      };
    }
    if (kind === 'set5') {
      h = randInt(1, 12, rng);
      m = randInt(1, 11, rng) * 5;
      ans = fmtTime(h, m);
      q = ans + '을 만들어요';
      return {
        kind: kind, h: h, m: m,
        question: q, fact: '', speak: q,
        answerText: ans
      };
    }
    if (kind === 'read1') {
      m = pickNonMult5(11, rng);
      h = apartHour(m, rng);
      q = '몇 시 몇 분이에요?';
      return {
        kind: kind, h: h, m: m,
        question: q, fact: '', speak: q,
        answerText: fmtTime(h, m)
      };
    }
    if (kind === 'set1') {
      h = randInt(1, 12, rng);
      m = pickNonMult5(12, rng);
      ans = fmtTime(h, m);
      q = ans + '을 만들어요';
      return {
        kind: kind, h: h, m: m,
        question: q, fact: '', speak: q,
        answerText: ans
      };
    }
    if (kind === 'before') {
      return makeBeforeProblem(randInt(0, 1, rng) === 0 ? 'to' : 'from', rng);
    }
    if (kind === 'h-to-min') {
      h = randInt(1, 2, rng);
      m = randInt(1, 5, rng) * 10;
      total = h * 60 + m;
      q = fmtDur(total) + '은 몇 분?';
      return {
        kind: kind, h: h, m: m,
        question: q, fact: '', speak: q,
        answerText: total + '분'
      };
    }
    if (kind === 'min-to-h') {
      m = [70, 80, 90, 110, 130, 140, 150][randInt(0, 6, rng)];
      q = m + '분은 몇 시간 몇 분?';
      return {
        kind: kind, min: m, _dir: randDir(rng),
        question: q, fact: '', speak: q,
        answerText: fmtDur(m)
      };
    }
    if (kind === 'elapsed') {
      picked = pickWithRetry(function () {
        var sh = randInt(1, 10, rng);
        var sm = randInt(0, 5, rng) * 10;
        var dur = [20, 30, 40, 50, 70, 80, 90][randInt(0, 6, rng)];
        if (sm + dur < 60 || sm + dur >= 120) return null;
        var endMin = sh * 60 + sm + dur;
        if (endMin > 720) return null;
        var eh = Math.floor(endMin / 60);
        if (eh !== sh + 1) return null;
        return { sh: sh, sm: sm, eh: eh, em: endMin % 60, dur: dur };
      }, { sh: 2, sm: 40, eh: 3, em: 10, dur: 30 });
      f = fmtTime(picked.sh, picked.sm) + '에 시작해서 ' + fmtTime(picked.eh, picked.em) + '에 끝났어요';
      q = '걸린 시간은 얼마예요?';
      return {
        kind: kind, sh: picked.sh, sm: picked.sm, eh: picked.eh, em: picked.em, dur: picked.dur,
        _dir: randDir(rng),
        question: q, fact: f, speak: buildSpeak(f, q),
        answerText: fmtDur(picked.dur)
      };
    }
    if (kind === 'am-pm') {
      scene = SCENES[randInt(0, SCENES.length - 1, rng)];
      cands = [];
      for (i = 0; i < SCENES.length; i++) {
        if (SCENES[i].ampm !== scene.ampm && SCENES[i].h !== scene.h) cands.push(SCENES[i].text);
      }
      return {
        kind: kind, scene: scene,
        _altText: cands[randInt(0, cands.length - 1, rng)],
        question: scene.q, fact: '', speak: scene.q,
        answerText: scene.text
      };
    }
    if (kind === 'day-hours') {
      d = randInt(0, 3, rng) === 0 ? 2 : 1;
      hr = d === 2 ? 0 : randInt(1, 12, rng);
      f = '1일은 24시간이에요';
      q = d === 2 ? '2일은 몇 시간?' : ('1일 ' + hr + '시간은 몇 시간?');
      return {
        kind: kind, d: d, hr: hr,
        question: q, fact: f, speak: buildSpeak(f, q),
        answerText: (d * 24 + hr) + '시간'
      };
    }
    if (kind === 'day-elapsed') {
      pair = pickWithRetry(function () {
        var sv = randInt(8, 11, rng);
        var ev = randInt(1, 5, rng);
        return sv - ev === 6 ? null : { s: sv, e: ev };
      }, { s: 10, e: 2 });
      f = '오전 ' + pair.s + '시부터 오후 ' + pair.e + '시까지예요';
      q = '모두 몇 시간이에요?';
      return {
        kind: kind, start: pair.s, end: pair.e + 12, _dir: randDir(rng),
        question: q, fact: f, speak: buildSpeak(f, q),
        answerText: ((pair.e + 12) - pair.s) + '시간'
      };
    }
    if (kind === 'week-days') {
      n = randInt(1, 4, rng);
      q = n + '주일은 며칠이에요?';
      return {
        kind: kind, n: n,
        question: q, fact: '', speak: q,
        answerText: (7 * n) + '일'
      };
    }
    if (kind === 'cal-week') {
      firstDay = randInt(0, 6, rng);
      dir = ['after', 'before', 'same'][randInt(0, 2, rng)];
      date = dir === 'before' ? randInt(8, 30, rng) : randInt(1, 23, rng);
      ans = dir === 'before' ? (date - 7) : (date + 7);
      f = '달력을 보고 답해요';
      if (dir === 'after') q = date + '일에서 1주일 뒤는 며칠?';
      else if (dir === 'before') q = date + '일에서 1주일 전은 며칠?';
      else q = date + '일과 같은 요일인 다음 날은?';
      return {
        kind: kind, firstDay: firstDay, days: 30, date: date, dir: dir, _dir: randDir(rng),
        question: q, fact: f, speak: buildSpeak(f, q),
        answerText: ans + '일'
      };
    }
    if (kind === 'month-days') {
      month = randInt(0, 3, rng) === 0 ? 0 : randInt(1, 12, rng);
      if (month === 0) {
        q = '1년은 몇 개월이에요?';
        return {
          kind: kind, month: 0,
          question: q, fact: '', speak: q,
          answerText: '12개월'
        };
      }
      days = MONTH_DAYS[month - 1];
      q = month + '월은 며칠까지 있어요?';
      return {
        kind: kind, month: month,
        question: q, fact: '', speak: q,
        answerText: days + '일'
      };
    }
    return makeProblem('min-of-number', rng);
  }

  function isValidChoiceText(text) {
    var s = String(text);
    if (s === '0분 전' || s === '0시간' || s === '0분' || s === '0일' || s === '0개월') return false;
    var mHM = /^(\d+)시간\s+(\d+)분$/.exec(s);
    if (mHM) {
      var mm = parseInt(mHM[2], 10);
      if (mm <= 0 || mm >= 60) return false;
    }
    var mBf = /^(\d+)분 전$/.exec(s);
    if (mBf && parseInt(mBf[1], 10) <= 0) return false;
    var mT = /^(?:오전 |오후 )?(\d+)시(?:\s+(\d+)분)?$/.exec(s);
    if (mT) {
      var th = parseInt(mT[1], 10);
      var tm = mT[2] ? parseInt(mT[2], 10) : 0;
      if (th < 1 || th > 12 || tm < 0 || tm > 59) return false;
    }
    return true;
  }

  function pushChoice(list, p, text, mistake) {
    if (list.length >= 2 || !text || text === p.answerText) return;
    if (!isValidChoiceText(text)) return;
    var ansDur = durValue(p.answerText);
    var ansTime = timeValue(p.answerText);
    var candDur = durValue(text);
    var candTime = timeValue(text);
    if (ansDur !== null && candDur !== null && ansDur === candDur) return;
    if (ansTime !== null && candTime !== null && ansTime === candTime) return;
    for (var i = 0; i < list.length; i++) {
      if (list[i].text === text) return;
      var exDur = durValue(list[i].text);
      var exTime = timeValue(list[i].text);
      if (exDur !== null && candDur !== null && exDur === candDur) return;
      if (exTime !== null && candTime !== null && exTime === candTime) return;
    }
    list.push({ text: text, mistake: mistake });
  }

  function fillFallbackChoices(list, p) {
    var deltas = [5, -5, 10, -10, 1, -1, 2, -2];
    var i, d, t, v, m, base, unit;
    if (p.kind === 'read5' || p.kind === 'read1' || p.kind === 'set5' || p.kind === 'set1') {
      for (i = 0; i < deltas.length && list.length < 2; i++) {
        t = addMinutes(p.h, p.m, deltas[i]);
        pushChoice(list, p, fmtTime(t.h, t.m), 'off-min');
      }
      return;
    }
    if (p.kind === 'before') {
      if (p.dir === 'to') {
        base = 60 - p.m;
        for (i = 0; i < deltas.length && list.length < 2; i++) {
          v = base + deltas[i];
          if (v > 0 && v < 60) pushChoice(list, p, v + '분 전', 'off-five');
        }
      } else {
        base = addMinutes(p.h, 0, -p.m);
        for (i = 0; i < deltas.length && list.length < 2; i++) {
          t = addMinutes(base.h, base.m, deltas[i]);
          pushChoice(list, p, fmtTime(t.h, t.m), 'off-min');
        }
      }
      return;
    }
    if (p.kind === 'am-pm') {
      for (i = 0; i < SCENES.length && list.length < 2; i++) {
        pushChoice(list, p, SCENES[i].text, 'wrong-scene');
      }
      return;
    }
    var dv = durValue(p.answerText);
    if (dv !== null && (p.kind === 'min-of-number' || p.kind === 'h-to-min' || p.kind === 'min-to-h' || p.kind === 'elapsed')) {
      var minOnly = /^\d+분$/.test(p.answerText);
      for (i = 0; i < deltas.length && list.length < 2; i++) {
        v = dv + deltas[i];
        if (v > 0) pushChoice(list, p, minOnly ? (v + '분') : fmtDur(v), 'off-min');
      }
      return;
    }
    m = /^(\d+)(시간|일|개월)$/.exec(p.answerText);
    if (m) {
      base = parseInt(m[1], 10);
      unit = m[2];
      var unitDeltas = [1, -1, 2, -2, 5, -5, 10, -10];
      for (i = 0; i < unitDeltas.length && list.length < 2; i++) {
        v = base + unitDeltas[i];
        if (v > 0) pushChoice(list, p, v + unit, 'off-one');
      }
    }
  }

  function wrongChoices(p) {
    var list = [], d, n2, sh, sm, up, cbM, next, dir, v, ans, days, off;
    if (p.kind === 'min-of-number') {
      pushChoice(list, p, p.n + '분', 'number-as-minute');
      d = p._dir || 1;
      n2 = p.n === 1 ? 2 : (p.n === 11 ? 10 : p.n + d);
      pushChoice(list, p, (n2 * 5) + '분', 'next-number');
    } else if (p.kind === 'read5' || p.kind === 'set5') {
      pushChoice(list, p, fmtTime(p.h, p.m / 5), 'number-as-minute');
      sh = (p.m / 5) || 12;
      sm = (p.h * 5) % 60;
      pushChoice(list, p, fmtTime(sh, sm), 'hand-swap');
    } else if (p.kind === 'read1' || p.kind === 'set1') {
      up = Math.ceil(p.m / 5) * 5;
      cbM = up + (up - p.m);
      if (cbM < 60) pushChoice(list, p, fmtTime(p.h, cbM), 'count-back');
      sh = Math.floor(p.m / 5) || 12;
      sm = (p.h * 5) % 60;
      pushChoice(list, p, fmtTime(sh, sm), 'hand-swap');
    } else if (p.kind === 'before') {
      if (p.dir === 'to') {
        pushChoice(list, p, p.m + '분 전', 'before-as-minute');
        pushChoice(list, p, (60 - p.m + 5) + '분 전', 'off-five');
      } else {
        pushChoice(list, p, fmtTime(p.h, 60 - p.m), 'before-hour');
        pushChoice(list, p, fmtTime(p.h, p.m), 'before-ignore');
      }
    } else if (p.kind === 'h-to-min') {
      pushChoice(list, p, (p.h * 100 + p.m) + '분', 'hundred-hour');
      pushChoice(list, p, (p.h + p.m) + '분', 'hour-as-one');
    } else if (p.kind === 'min-to-h') {
      if (p.min >= 100) {
        pushChoice(list, p, Math.floor(p.min / 100) + '시간 ' + (p.min % 100) + '분', 'hundred-split');
      } else {
        pushChoice(list, p, Math.floor(p.min / 10) + '시간', 'digit-split');
      }
      dir = p._dir || 1;
      v = p.min + dir * 10;
      if (v % 60 === 0) v = p.min - dir * 10;
      if (v % 60 === 0) v = p.min + dir * 20;
      pushChoice(list, p, fmtDur(v), 'ten-off');
    } else if (p.kind === 'elapsed') {
      pushChoice(list, p, (p.eh - p.sh) + '시간', 'hours-only');
      dir = p._dir || 1;
      v = p.dur + dir * 10;
      if (v <= 0 || v % 60 === 0) v = p.dur - dir * 10;
      pushChoice(list, p, fmtDur(v), 'ten-off');
    } else if (p.kind === 'am-pm') {
      pushChoice(list, p, (p.scene.ampm === '오전' ? '오후 ' : '오전 ') + fmtTime(p.scene.h, p.scene.m), 'ampm-swap');
      pushChoice(list, p, p._altText, 'wrong-scene');
    } else if (p.kind === 'day-hours') {
      pushChoice(list, p, (p.d * 10 + p.hr) + '시간', 'ten-day');
      pushChoice(list, p, (p.d + p.hr) + '시간', 'day-as-one');
    } else if (p.kind === 'day-elapsed') {
      ans = p.end - p.start;
      v = p.start - (p.end - 12);
      if (v > 0) pushChoice(list, p, v + '시간', 'pm-raw');
      dir = p._dir || 1;
      v = ans + dir <= 0 ? ans + 1 : ans + dir;
      pushChoice(list, p, v + '시간', 'off-one');
    } else if (p.kind === 'week-days') {
      pushChoice(list, p, (10 * p.n) + '일', 'ten-week');
      pushChoice(list, p, (5 * p.n) + '일', 'school-week');
    } else if (p.kind === 'cal-week') {
      dir = p._dir || 1;
      if (p.dir === 'before') {
        ans = p.date - 7;
        pushChoice(list, p, (p.date - 1) + '일', 'minus-one');
        off = ans + dir;
        if (off < 1 || off > 30) off = ans - dir;
        pushChoice(list, p, off + '일', 'off-one');
      } else {
        ans = p.date + 7;
        pushChoice(list, p, (p.date + 1) + '일', 'plus-one');
        off = ans + dir;
        if (off < 1 || off > 30) off = ans - dir;
        pushChoice(list, p, off + '일', 'off-one');
      }
    } else if (p.kind === 'month-days') {
      if (p.month === 0) {
        pushChoice(list, p, '10개월', 'ten-year');
        pushChoice(list, p, '24개월', 'day-confuse');
      } else {
        days = MONTH_DAYS[p.month - 1];
        if (days === 28) {
          pushChoice(list, p, '30일', 'month-mix');
          pushChoice(list, p, '31일', 'month-mix');
        } else if (days === 30) {
          pushChoice(list, p, '31일', 'month-mix');
          pushChoice(list, p, '28일', 'month-mix');
        } else {
          pushChoice(list, p, '30일', 'month-mix');
          pushChoice(list, p, '28일', 'month-mix');
        }
      }
    }
    fillFallbackChoices(list, p);
    return list;
  }

  function problemKey(p) {
    if (p.kind === 'min-of-number' || p.kind === 'week-days') return p.kind + ':' + p.n;
    if (p.kind === 'read5' || p.kind === 'read1' || p.kind === 'set5' || p.kind === 'set1' || p.kind === 'h-to-min') {
      return p.kind + ':' + p.h + ':' + p.m;
    }
    if (p.kind === 'before') return p.kind + ':' + p.dir + ':' + p.h + ':' + p.m;
    if (p.kind === 'min-to-h') return p.kind + ':' + p.min;
    if (p.kind === 'elapsed') return p.kind + ':' + p.sh + ':' + p.sm + ':' + p.dur;
    if (p.kind === 'am-pm') return p.kind + ':' + p.scene.name;
    if (p.kind === 'day-hours') return p.kind + ':' + p.d + ':' + p.hr;
    if (p.kind === 'day-elapsed') return p.kind + ':' + p.start + ':' + p.end;
    if (p.kind === 'cal-week') return p.kind + ':' + p.dir + ':' + p.date;
    if (p.kind === 'month-days') return p.kind + ':' + p.month;
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
    if (p.kind === 'before') return p.h + '시 ' + p.m + '분 전은 몇 시 몇 분?';
    if (p.kind === 'week-days') return p.n + '주일은 며칠?';
    return p.question;
  }

  function makeBingo(rng) {
    var usedText = {}, usedDur = {}, usedTime = {}, out = [], i, p, h, m, v, txt, dv, tv;
    for (i = 0; i < 9; i++) {
      p = pickWithRetry(function () {
        var k = BINGO_KINDS[randInt(0, BINGO_KINDS.length - 1, rng)];
        var cand = k === 'before' ? makeBeforeProblem('from', rng) : makeProblem(k, rng);
        if (cand.answerText.length > 7) return null;
        if (usedText[cand.answerText]) return null;
        var d = durValue(cand.answerText);
        var t = timeValue(cand.answerText);
        if (d !== null && usedDur[d]) return null;
        if (t !== null && usedTime[t]) return null;
        return cand;
      }, null);
      if (p === null) {
        for (h = 1; h <= 2 && p === null; h++) {
          for (m = 10; m <= 50 && p === null; m += 10) {
            v = h * 60 + m;
            txt = v + '분';
            if (txt.length <= 7 && !usedText[txt] && !usedDur[v]) {
              p = {
                kind: 'h-to-min', h: h, m: m,
                question: fmtDur(v) + '은 몇 분?', fact: '', speak: fmtDur(v) + '은 몇 분?',
                answerText: txt
              };
            }
          }
        }
      }
      if (p === null) {
        for (h = 1; h <= 12 && p === null; h++) {
          var ansT = addMinutes(h, 0, -5);
          txt = fmtTime(ansT.h, ansT.m);
          tv = timeValue(txt);
          if (txt.length <= 7 && !usedText[txt] && !usedTime[tv]) {
            p = {
              kind: 'before', dir: 'from', h: h, m: 5,
              question: h + '시 5분 전은 몇 시 몇 분?', fact: '', speak: h + '시 5분 전은 몇 시 몇 분?',
              answerText: txt
            };
          }
        }
      }
      usedText[p.answerText] = true;
      dv = durValue(p.answerText);
      tv = timeValue(p.answerText);
      if (dv !== null) usedDur[dv] = true;
      if (tv !== null) usedTime[tv] = true;
      p.call = bingoCallText(p);
      p.speak = p.call;
      out.push(p);
    }
    return out;
  }

  function makePromise(rng) {
    var f = FRIENDS[randInt(0, FRIENDS.length - 1, rng)];
    var h = randInt(1, 12, rng);
    var m = randInt(0, 1, rng) === 0 ? randInt(1, 11, rng) * 5 : pickNonMult5(12, rng);
    var text = f.name + f.josa + ' ' + fmtTime(h, m) + '에 만나요!';
    return {
      name: f.name, emoji: f.emoji, h: h, m: m,
      text: text, speak: text
    };
  }

  function setFeedback(curM, targetM) {
    var diff = targetM - curM;
    var ok = diff === 0;
    var text = ok ? '딱 맞아요!' : (diff > 0 ? (diff + '분 더 돌려요') : ((-diff) + '분 덜 돌려요'));
    return { ok: ok, diff: diff, text: text };
  }

  global.TimeClockCore = {
    randInt: randInt,
    fmtTime: fmtTime,
    handsApart: handsApart,
    fmtDur: fmtDur,
    addMinutes: addMinutes,
    josaNum: josaNum,
    WEEKDAYS: WEEKDAYS,
    MONTH_DAYS: MONTH_DAYS,
    SCENES: SCENES,
    FRIENDS: FRIENDS,
    LAB_KINDS: LAB_KINDS,
    BINGO_KINDS: BINGO_KINDS,
    makeProblem: makeProblem,
    wrongChoices: wrongChoices,
    makeRound: makeRound,
    makeBingo: makeBingo,
    makePromise: makePromise,
    setFeedback: setFeedback,
    durValue: durValue,
    timeValue: timeValue
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = global.TimeClockCore;
})(typeof window !== 'undefined' ? window : globalThis);
