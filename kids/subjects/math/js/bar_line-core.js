/* 4학년 막대그래프(4-1)·꺾은선그래프(4-2) — 주제 틀·문제·오답·한 판 (순수 계산, DOM 없음) */
(function (global) {
  'use strict';
  var M = global.MixCalcCore;

  var LAB_KINDS = { 1: ['bar-scale', 'bar-read-scale', 'bar-read'], 2: ['bar-most', 'bar-diff', 'bar-times'], 3: ['bar-cells', 'bar-cells', 'bar-missing'],
    4: ['line-scale', 'line-read', 'line-read'], 5: ['line-change', 'line-most', 'line-mid'], 6: ['wave-read', 'wave-read', 'wave-change'] };

  var MIXED_KINDS = ['bar-read', 'bar-most', 'bar-diff', 'bar-times', 'bar-missing', 'line-read', 'line-change', 'line-most', 'line-mid', 'wave-read'];

  var KIND_ORDER = { 'bar-scale': 0, 'bar-read-scale': 1, 'bar-read': 2, 'bar-most': 3, 'bar-diff': 4, 'bar-times': 5, 'bar-cells': 6, 'bar-missing': 7,
    'line-scale': 8, 'line-read': 9, 'line-change': 10, 'line-most': 11, 'line-mid': 12, 'wave-read': 13, 'wave-change': 14 };

  var TOPICS = {
    bar: [
      { id: 'fruit', title: '좋아하는 과일별 학생 수', cats: ['사과', '포도', '딸기', '수박', '참외', '자두'], unit: '명', axisUnit: '(명)' },
      { id: 'sport', title: '좋아하는 운동별 학생 수', cats: ['축구', '야구', '농구', '수영', '배구', '피구'], unit: '명', axisUnit: '(명)' },
      { id: 'class-stu', title: '반별 학생 수', cats: ['1반', '2반', '3반', '4반', '5반', '6반'], unit: '명', axisUnit: '(명)' },
      { id: 'books', title: '달마다 읽은 책 수', cats: ['3월', '4월', '5월', '6월', '7월', '8월'], unit: '권', axisUnit: '(권)' },
      { id: 'club', title: '동아리별 학생 수', cats: ['미술', '음악', '과학', '독서', '바둑', '요리'], unit: '명', axisUnit: '(명)' },
      { id: 'snack', title: '좋아하는 간식별 학생 수', cats: ['과자', '우유', '만두', '김밥', '사탕', '떡국'], unit: '명', axisUnit: '(명)' },
      { id: 'recycle', title: '모은 재활용품 무게', cats: ['종이', '유리', '비닐', '고철', '페트', '캔'], unit: 'kg', axisUnit: '(kg)' },
      { id: 'paper', title: '반별 접은 종이학 수', cats: ['1반', '2반', '3반', '4반', '5반', '6반'], unit: '개', axisUnit: '(개)' },
      { id: 'drink', title: '좋아하는 음료별 학생 수', cats: ['우유', '주스', '식혜', '녹차', '두유', '생수'], unit: '명', axisUnit: '(명)' }
    ],
    line: [
      { id: 'temp-day', title: '하루 동안의 기온', xs: ['9시', '10시', '11시', '12시', '13시', '14시', '15시'], xs2: ['8시', '10시', '12시', '14시', '16시', '18시', '20시'], unit: '도', axisUnit: '(도)', mid: true, down: true, wave: true, lo: 10, hi: 38 },
      { id: 'plant-height', title: '강낭콩 줄기의 키', xs: ['1주', '2주', '3주', '4주', '5주', '6주', '7주'], xs2: ['1주', '3주', '5주', '7주', '9주', '11주', '13주'], unit: 'cm', axisUnit: '(cm)', mid: true, down: false, wave: true, lo: 10, hi: 120 },
      { id: 'calf-weight', title: '송아지의 몸무게', xs: ['1달', '2달', '3달', '4달', '5달', '6달', '7달'], xs2: ['2달', '4달', '6달', '8달', '10달', '12달', '14달'], unit: 'kg', axisUnit: '(kg)', mid: true, down: false, wave: true, lo: 40, hi: 190 },
      { id: 'rain-month', title: '달별 강수량', xs: ['3월', '4월', '5월', '6월', '7월', '8월', '9월'], xs2: null, unit: 'mm', axisUnit: '(mm)', mid: false, down: true, wave: false, lo: 10, hi: 180 },
      { id: 'jump-rope', title: '줄넘기 횟수 기록', xs: ['월', '화', '수', '목', '금', '토', '일'], xs2: null, unit: '번', axisUnit: '(번)', mid: false, down: true, wave: true, lo: 20, hi: 140 },
      { id: 'kid-height', title: '한 어린이의 키 변화', xs: ['1살', '2살', '3살', '4살', '5살', '6살', '7살'], xs2: ['2살', '4살', '6살', '8살', '10살', '12살', '14살'], unit: 'cm', axisUnit: '(cm)', mid: true, down: false, wave: true, lo: 80, hi: 160 },
      { id: 'water-temp', title: '어항의 물 온도', xs: ['9시', '10시', '11시', '12시', '13시', '14시', '15시'], xs2: ['9시', '11시', '13시', '15시', '17시', '19시', '21시'], unit: '도', axisUnit: '(도)', mid: true, down: true, wave: true, lo: 14, hi: 38 }
    ]
  };

  var HINTS = {
    'label-value': '숫자는 여러 칸을 묶은 값이에요. 칸 수로 나눠요.',
    'cell-count': '칸 수가 아니라 한 칸이 나타내는 크기를 구해요.',
    'one': '0과 첫 숫자 사이 칸을 세어 나눠 봐요.',
    'next-label': '0과 첫 숫자 사이 칸을 세어 나눠 봐요.',
    'cells-only': '칸 수에 눈금 한 칸의 크기를 곱해요.',
    'off-one': '막대 끝(점)이 닿은 눈금을 다시 세어 봐요.',
    'neighbor': '어느 막대(점)인지 이름을 다시 봐요.',
    'opposite': '막대 길이를 다시 견줘 봐요.',
    'second': '막대 길이를 다시 견줘 봐요.',
    'bigger-only': '두 값의 차를 구해요.',
    'smaller-only': '두 값의 차를 구해요.',
    'later-only': '두 값의 차를 구해요.',
    'cells-diff': '칸 수의 차에 눈금 한 칸의 크기를 곱해요.',
    'sum': '더 많은 만큼은 빼서 구해요.',
    'diff': '몇 배는 나눠서 구해요.',
    'value-as-cells': '값을 눈금 한 칸의 크기로 나눠 칸 수를 구해요.',
    'half': '값을 눈금 한 칸의 크기로 나눠 칸 수를 구해요.',
    'forget-one': '합계에서 나머지 값을 하나씩 모두 빼요.',
    'extra-one': '합계에서 나머지 값을 하나씩 모두 빼요.',
    'total': '합계에서 나머지 값을 빼요.',
    'highest': '가장 높은 곳이 아니라 선이 가장 많이 기울어진 곳이에요.',
    'opposite-dir': '늘어났는지 줄어들었는지 선의 방향을 봐요.',
    'left': '가운데 시각의 값은 두 점을 이은 선의 가운데예요.',
    'right': '가운데 시각의 값은 두 점을 이은 선의 가운데예요.',
    'mid-off': '가운데 시각의 값은 두 점을 이은 선의 가운데예요.',
    'from-zero': '물결선 아래는 줄인 부분이라 0부터가 아니에요. 물결선 위 첫 숫자부터 세어요.',
    'count-by-one': '눈금 한 칸의 크기를 먼저 구해요.',
    'calc-slip': '다시 계산해 봐요.',
    'fix': '그래프와 뜻 카드를 다시 봐요.'
  };

  var CARDS = {
    'bar1': ['0과 첫 숫자 사이의 칸 수로 눈금 한 칸의 크기를 구해요.', '막대의 길이가 나타내는 값은 눈금 한 칸 × 칸 수예요.'],
    'bar2': ['막대의 길이를 견주어 가장 많은 것과 적은 것을 찾아요.', '차이는 뺄셈, 몇 배는 나눗셈으로 구해요.'],
    'bar3': ['표를 막대그래프로 나타낼 때는 값 ÷ 눈금 한 칸으로 칸 수를 구해요.', '빠진 자료 = 합계 − 나머지 값을 모두 더한 것.'],
    'line1': ['꺾은선그래프는 시간에 따라 변하는 모양을 점과 선으로 나타내요.', '막대그래프는 크기 비교, 꺾은선그래프는 변화에 알맞아요.'],
    'line2': ['선이 가장 많이 기울어진 곳이 가장 많이 변한 때예요.', '가운데 시각의 값은 두 점을 이은 선의 가운데에서 찾아요.'],
    'wave': ['물결선 아래는 줄여서 나타낸 부분이에요.', '물결선 위 첫 숫자부터 눈금 한 칸을 세어요.']
  };

  var POOLS = {};
  var SCALES = [2, 5, 10];
  var LABELS = [2, 5];
  var POOL_SIZE = 36;

  function randInt(lo, hi, rng) {
    return Math.floor(rng() * (hi - lo + 1)) + lo;
  }

  function makeSeedRng(seed) {
    var s = (seed >>> 0) || 1;
    return function () {
      s = (Math.imul ? Math.imul(s, 1664525) : (s * 1664525) | 0) + 1013904223;
      s = s >>> 0;
      return s / 4294967296;
    };
  }

  function hasBatchim(str) {
    if (!str || !str.length) { return false; }
    var code = str.charCodeAt(str.length - 1);
    if (code >= 0xAC00 && code <= 0xD7A3) { return (code - 0xAC00) % 28 !== 0; }
    if (code >= 48 && code <= 57) { return '013678'.indexOf(str.charAt(str.length - 1)) >= 0; }
    return false;
  }

  function josa(str, withB, noB) {
    return str + (hasBatchim(str) ? withB : noB);
  }

  function fmtVal(val, unit) {
    if (unit === 'cm' || unit === 'kg' || unit === 'mm') { return val + ' ' + unit; }
    return val + unit;
  }

  function midLabel(a, b) {
    var m1 = /^(\d+)(.*)$/.exec(a);
    var m2 = /^(\d+)(.*)$/.exec(b);
    if (m1 && m2) { return ((parseInt(m1[1], 10) + parseInt(m2[1], 10)) / 2) + m1[2]; }
    return a + '와 ' + b + ' 사이';
  }

  function rangeLabel(a, b) {
    return josa(a, '과', '와') + ' ' + b + ' 사이';
  }

  function pickDistinct(arr, k, rng) {
    var copy = arr.slice();
    var i, j, tmp;
    for (i = copy.length - 1; i > 0; i--) {
      j = randInt(0, i, rng);
      tmp = copy[i]; copy[i] = copy[j]; copy[j] = tmp;
    }
    return copy.slice(0, k);
  }

  function distinctCells(count, lo, hi, rng) {
    var pool = [], i;
    for (i = lo; i <= hi; i++) { pool.push(i); }
    return pickDistinct(pool, count, rng);
  }

  function makeBarRaw(kind, idx) {
    var rng = makeSeedRng(M.mixHash('pool|' + kind + '|' + idx));
    var tIdx = idx % TOPICS.bar.length;
    var topic = TOPICS.bar[tIdx];
    var scale = SCALES[randInt(0, 2, rng)];
    var labelEvery = LABELS[randInt(0, 1, rng)];
    var cells = randInt(6, 10, rng);
    var nCats = (kind === 'bar-cells' || kind === 'bar-missing') ? randInt(4, 5, rng) : randInt(4, 6, rng);
    if (kind === 'bar-missing' && scale === 10) { scale = SCALES[randInt(0, 1, rng)]; }
    var cats = topic.cats.slice(0, nCats);
    var cellArr = null, values = [], i, target = 0, other = 1, askMore = true, mult = 2;

    if (kind === 'bar-times') {
      var bCell = randInt(1, 2, rng);
      mult = randInt(2, Math.min(5, Math.floor(cells / bCell)), rng);
      if (mult < 2) { bCell = 1; mult = randInt(2, 5, rng); }
      var aCell = bCell * mult;
      var used = {}; used[aCell] = true; used[bCell] = true;
      var avail = [];
      for (i = 1; i <= cells; i++) { if (!used[i]) { avail.push(i); } }
      var rest = pickDistinct(avail, nCats - 2, rng);
      var pos = pickDistinct([0, 1, 2, 3, 4, 5].slice(0, nCats), 2, rng);
      target = pos[0]; other = pos[1];
      cellArr = [];
      var rIdx = 0;
      for (i = 0; i < nCats; i++) {
        if (i === target) { cellArr.push(aCell); }
        else if (i === other) { cellArr.push(bCell); }
        else { cellArr.push(rest[rIdx++]); }
      }
    } else if (kind === 'bar-missing') {
      var maxSumCells = Math.floor(200 / scale);
      var hiC = Math.min(cells, Math.floor(maxSumCells / nCats) + 2);
      if (hiC < nCats) { hiC = nCats; }
      cellArr = distinctCells(nCats, 1, hiC, rng);
      var sumC = 0;
      for (i = 0; i < nCats; i++) { sumC += cellArr[i]; }
      while (sumC * scale > 200) {
        cellArr = distinctCells(nCats, 1, Math.max(nCats, hiC - 1), rng);
        sumC = 0;
        for (i = 0; i < nCats; i++) { sumC += cellArr[i]; }
      }
      target = randInt(0, nCats - 1, rng);
    } else {
      cellArr = distinctCells(nCats, 1, cells, rng);
      if (kind === 'bar-read' || kind === 'bar-read-scale') {
        var cands = [];
        for (i = 0; i < nCats; i++) { if (cellArr[i] % labelEvery !== 0) { cands.push(i); } }
        if (!cands.length) {
          var fixC = 1;
          while (fixC <= cells && (fixC % labelEvery === 0 || cellArr.indexOf(fixC) >= 0)) { fixC++; }
          if (fixC <= cells) { cellArr[0] = fixC; }
          cands.push(0);
        }
        target = cands[randInt(0, cands.length - 1, rng)];
      } else if (kind === 'bar-most') {
        askMore = randInt(0, 1, rng) === 0;
        target = 0;
        for (i = 1; i < nCats; i++) {
          if (askMore ? cellArr[i] > cellArr[target] : cellArr[i] < cellArr[target]) { target = i; }
        }
      } else if (kind === 'bar-diff') {
        var pair = pickDistinct([0, 1, 2, 3, 4, 5].slice(0, nCats), 2, rng);
        if (cellArr[pair[0]] > cellArr[pair[1]]) { target = pair[0]; other = pair[1]; }
        else { target = pair[1]; other = pair[0]; }
      } else {
        target = randInt(0, nCats - 1, rng);
      }
    }

    for (i = 0; i < nCats; i++) { values.push(cellArr[i] * scale); }
    var askTag = kind + ':' + target + ':' + other + ':' + (askMore ? 1 : 0) + ':' + scale + ':' + labelEvery;
    return {
      kind: kind, tIdx: tIdx, topic: topic, scale: scale, labelEvery: labelEvery,
      cells: cells, base: 0, cats: cats, values: values,
      target: target, other: other, askMore: askMore, mult: mult,
      key: kind + '|' + topic.id + '|' + values.join(',') + '|' + askTag
    };
  }

  function filterLineTopics(pred) {
    var out = [], i;
    for (i = 0; i < TOPICS.line.length; i++) { if (pred(TOPICS.line[i])) { out.push(i); } }
    return out;
  }

  function makeLineRaw(kind, idx) {
    var rng = makeSeedRng(M.mixHash('pool|' + kind + '|' + idx));
    var isWave = kind.indexOf('wave-') === 0;
    var topicIdxList = filterLineTopics(function (t) {
      if (kind === 'line-mid') { return !!t.mid && !!t.xs2 && !!t.down && t.lo < 30; } // 오르내림이 자연스러운 기온만
      if (isWave) { return !!t.wave; }
      return t.lo < 30; // 0부터 그리는 축에는 값이 작은 주제만(키·송아지 몸무게는 물결선 그래프에서만)
    });
    var tIdx = topicIdxList[idx % topicIdxList.length];
    var topic = TOPICS.line[tIdx];
    var scale = SCALES[randInt(0, 2, rng)];
    var labelEvery = LABELS[randInt(0, 1, rng)];
    var base = 0, cells, nPts = randInt(5, 7, rng);

    if (isWave) {
      cells = randInt(6, 8, rng);
      var step = scale * labelEvery;
      var minBase = Math.max(20, Math.ceil(topic.lo / step) * step);
      var maxBase = Math.floor((Math.min(200, topic.hi) - scale * cells) / step) * step;
      if (maxBase < minBase) {
        scale = 2; labelEvery = 5; step = 10;
        minBase = Math.max(20, Math.ceil(topic.lo / step) * step);
        maxBase = Math.floor((Math.min(200, topic.hi) - scale * cells) / step) * step;
      }
      var bCount = Math.floor((maxBase - minBase) / step);
      base = minBase + randInt(0, Math.max(0, bCount), rng) * step;
    } else {
      cells = randInt(6, 10, rng);
      while (scale * cells > 200 || scale * cells > topic.hi) {
        if (cells > 6) { cells--; }
        else if (scale === 10) { scale = 5; }
        else { scale = 2; break; }
      }
    }

    var loCell = Math.max(1, Math.ceil((topic.lo - base) / scale));
    var hiCell = Math.min(cells, Math.floor((Math.min(200, topic.hi) - base) / scale));
    if (hiCell - loCell < 5) { loCell = 1; hiCell = cells; } // 범위가 좁으면 축 전체(점 5개 이상)

    var cats = (kind === 'line-mid' ? topic.xs2 : topic.xs).slice(0, nPts);
    var cellArr = [], i, target = 0, from = 0, to = 1;

    if (kind === 'line-mid') {
      // 묻는 두 점(target, target + 1)의 차를 4~6칸(짝수)으로 정하고, 앞뒤는 한두 칸씩 부드럽게 잇는다
      nPts = Math.min(nPts, 6); cats = topic.xs2.slice(0, nPts); target = randInt(0, nPts - 2, rng);
      var gap = Math.min(2 * randInt(2, 3, rng), hiCell - loCell - (hiCell - loCell) % 2), sgn = randInt(0, 1, rng) ? 1 : -1;
      var cA = sgn > 0 ? randInt(loCell, hiCell - gap, rng) : randInt(loCell + gap, hiCell, rng);
      cellArr = new Array(nPts); cellArr[target] = cA; cellArr[target + 1] = cA + sgn * gap;
      function stepFrom(prev, other) {
        var d = randInt(1, 2, rng), v = prev + (randInt(0, 1, rng) ? d : -d);
        if (v < loCell || v > hiCell) v = prev + (v < loCell ? d : -d);
        if (v < loCell || v > hiCell || v === other) v = prev + (prev < hiCell ? 1 : -1);
        return v;
      }
      for (i = target - 1; i >= 0; i--) cellArr[i] = stepFrom(cellArr[i + 1]);
      for (i = target + 2; i < nPts; i++) cellArr[i] = stepFrom(cellArr[i - 1]);
    } else if (kind === 'line-most') {
      var maxIdx = randInt(0, nPts - 2, rng);
      var maxDiff = randInt(Math.min(3, hiCell - loCell), Math.min(6, hiCell - loCell), rng);
      if (maxDiff < 2) { maxDiff = 2; }
      cellArr = new Array(nPts);
      var goDown = topic.down && randInt(0, 1, rng) === 0;
      if (goDown) {
        cellArr[maxIdx] = hiCell;
        cellArr[maxIdx + 1] = Math.max(loCell, hiCell - maxDiff);
      } else {
        cellArr[maxIdx] = loCell;
        cellArr[maxIdx + 1] = Math.min(hiCell, loCell + maxDiff);
      }
      var realMax = Math.abs(cellArr[maxIdx + 1] - cellArr[maxIdx]);
      for (i = maxIdx - 1; i >= 0; i--) {
        var dL = randInt(1, Math.max(1, realMax - 1), rng);
        var candL = (topic.down && randInt(0, 1, rng) === 0) ? cellArr[i + 1] + dL : cellArr[i + 1] - dL;
        if (candL < loCell || candL > hiCell) { candL = cellArr[i + 1] > (loCell + hiCell) / 2 ? cellArr[i + 1] - 1 : cellArr[i + 1] + 1; }
        if (candL === cellArr[i + 1]) { candL = cellArr[i + 1] < hiCell ? cellArr[i + 1] + 1 : cellArr[i + 1] - 1; }
        cellArr[i] = candL;
      }
      for (i = maxIdx + 2; i < nPts; i++) {
        var dR = randInt(1, Math.max(1, realMax - 1), rng);
        var candR = (topic.down && randInt(0, 1, rng) === 0) ? cellArr[i - 1] - dR : cellArr[i - 1] + dR;
        if (candR < loCell || candR > hiCell) { candR = cellArr[i - 1] > (loCell + hiCell) / 2 ? cellArr[i - 1] - 1 : cellArr[i - 1] + 1; }
        if (candR === cellArr[i - 1]) { candR = cellArr[i - 1] < hiCell ? cellArr[i - 1] + 1 : cellArr[i - 1] - 1; }
        cellArr[i] = candR;
      }
      target = maxIdx;
    } else {
      // 부드러운 흐름: 한 번에 1~2칸씩 오르내림(키·식물처럼 줄지 않는 주제는 늘 오름)
      nPts = Math.min(nPts, hiCell - loCell + 1); cats = cats.slice(0, nPts);
      var cur = topic.down ? randInt(loCell, hiCell, rng) : randInt(loCell, Math.max(loCell, hiCell - nPts + 1), rng), dir = 1;
      for (i = 0; i < nPts; i++) {
        if (i > 0) {
          var dlt = topic.down ? randInt(1, 2, rng) : (cur + 2 <= hiCell - (nPts - 1 - i) ? randInt(1, 2, rng) : 1);
          if (topic.down && randInt(0, 2, rng) === 0) dir = -dir;
          if (!topic.down) dir = 1;
          if (cur + dir * dlt < loCell || cur + dir * dlt > hiCell) dir = -dir;
          if (cur + dir * dlt < loCell || cur + dir * dlt > hiCell) dlt = 1;
          cur += dir * dlt;
        }
        cellArr.push(cur);
      }
      if (kind === 'line-read' || kind === 'wave-read') {
        var rcands = [];
        for (i = 0; i < nPts; i++) { if (cellArr[i] % labelEvery !== 0) { rcands.push(i); } }
        if (!rcands.length) {
          var f = loCell;
          while (f <= hiCell && (f % labelEvery === 0 || (nPts > 1 && f === cellArr[1]))) { f++; }
          if (f <= hiCell) { cellArr[0] = f; }
          rcands.push(0);
        }
        target = rcands[randInt(0, rcands.length - 1, rng)];
      } else if (kind === 'line-change' || kind === 'wave-change') {
        // 값이 다른 두 때만(차 ≥ 한 칸)
        var pairs = [], q1, q2, need = 3; // 차가 3칸 이상인 두 때 먼저(한 칸 덜·칸 수 차 오답이 겹치지 않게)
        for (; need >= 1 && !pairs.length; need--) for (q1 = 0; q1 < nPts - 1; q1++) for (q2 = q1 + 1; q2 < nPts; q2++) if (Math.abs(cellArr[q1] - cellArr[q2]) >= need) pairs.push([q1, q2]);
        var pr = pairs[randInt(0, pairs.length - 1, rng)];
        from = pr[0]; to = pr[1];
      }
    }

    var values = [];
    for (i = 0; i < nPts; i++) { values.push(base + cellArr[i] * scale); }
    var askTag = kind + ':' + target + ':' + from + ':' + to + ':' + base + ':' + scale + ':' + labelEvery;
    return {
      kind: kind, tIdx: tIdx, topic: topic, scale: scale, labelEvery: labelEvery,
      cells: cells, base: base, cats: cats, values: values,
      target: target, from: from, to: to,
      key: kind + '|' + topic.id + '|' + values.join(',') + '|' + askTag
    };
  }

  function poolOf(kind) {
    if (POOLS[kind]) { return POOLS[kind]; }
    var list = [], seen = {}, idx = 0, tries = 0;
    var isBar = kind.indexOf('bar-') === 0;
    while (list.length < POOL_SIZE && tries < 600) {
      var raw = isBar ? makeBarRaw(kind, idx) : makeLineRaw(kind, idx);
      idx++; tries++;
      if (!seen[raw.key]) { seen[raw.key] = true; list.push(raw); }
    }
    POOLS[kind] = list;
    return list;
  }

  function buildProblem(raw, opt) {
    var o = opt || {};
    var kind = raw.kind;
    var isBar = kind.indexOf('bar-') === 0;
    var grade = isBar ? '4-1' : '4-2';
    var orient = 'v';
    if (isBar) {
      if (o.orient) { orient = o.orient; }
      else if (kind === 'bar-read') { orient = 'h'; }
      else if (kind === 'bar-most' || kind === 'bar-diff' || kind === 'bar-times') {
        orient = (M.mixHash(raw.key) % 2 === 0) ? 'v' : 'h';
      }
    }
    var hidden = (kind === 'bar-cells' || kind === 'bar-missing') ? [raw.target] : [];
    var chart = {
      type: isBar ? 'bar' : 'line', orient: orient,
      title: raw.topic.title, axisUnit: raw.topic.axisUnit,
      cats: raw.cats, values: raw.values, scale: raw.scale,
      cells: raw.cells, labelEvery: raw.labelEvery, base: raw.base, hidden: hidden
    };
    var table = null, total = null, i;
    if (kind === 'bar-cells') {
      table = [];
      for (i = 0; i < raw.cats.length; i++) { table.push([raw.cats[i], raw.values[i]]); }
    }
    if (kind === 'bar-missing') {
      total = 0;
      for (i = 0; i < raw.values.length; i++) { total += raw.values[i]; }
    }

    var unit = raw.topic.unit;
    var steps = [], cardLines = CARDS.bar1;
    var scaleAsk = (orient === 'h' ? '눈금 한 칸은 몇 ' : '세로 눈금 한 칸은 몇 ') + josa(unit, '을', '를') + ' 나타내나요?';

    if (kind === 'bar-scale' || kind === 'line-scale') {
      steps.push({ ask: scaleAsk, answerText: fmtVal(raw.scale, unit), value: raw.scale, choiceKind: 'value', reveal: null });
      cardLines = isBar ? CARDS.bar1 : CARDS.line1;
    } else if (kind === 'bar-read-scale') {
      if (!o.mixed) {
        steps.push({ ask: scaleAsk, answerText: fmtVal(raw.scale, unit), value: raw.scale, choiceKind: 'value', reveal: null });
      }
      var cName = raw.cats[raw.target];
      steps.push({
        ask: josa(cName, '은', '는') + ' 몇 ' + unit + '인가요?',
        answerText: fmtVal(raw.values[raw.target], unit), value: raw.values[raw.target],
        choiceKind: 'value', reveal: { highlight: [raw.target] }
      });
      cardLines = CARDS.bar1;
    } else if (kind === 'bar-read' || kind === 'line-read' || kind === 'wave-read') {
      var rName = raw.cats[raw.target];
      steps.push({
        ask: josa(rName, '은', '는') + ' 몇 ' + unit + '인가요?',
        answerText: fmtVal(raw.values[raw.target], unit), value: raw.values[raw.target],
        choiceKind: 'value', reveal: { highlight: [raw.target] }
      });
      cardLines = kind === 'bar-read' ? CARDS.bar1 : (kind === 'line-read' ? CARDS.line1 : CARDS.wave);
    } else if (kind === 'bar-most') {
      var mWord = raw.askMore ? '가장 많은' : '가장 적은';
      steps.push({
        ask: mWord + ' 것은 무엇인가요?',
        answerText: raw.cats[raw.target], value: raw.target,
        choiceKind: 'name', reveal: { highlight: [raw.target] }
      });
      cardLines = CARDS.bar2;
    } else if (kind === 'bar-diff') {
      var diff = raw.values[raw.target] - raw.values[raw.other];
      steps.push({
        ask: josa(raw.cats[raw.target], '은', '는') + ' ' + raw.cats[raw.other] + '보다 몇 ' + unit + ' 더 많나요?',
        answerText: fmtVal(diff, unit), value: diff,
        choiceKind: 'value', reveal: { arrow: [raw.other, raw.target, fmtVal(diff, unit)] }
      });
      cardLines = CARDS.bar2;
    } else if (kind === 'bar-times') {
      steps.push({
        ask: josa(raw.cats[raw.target], '은', '는') + ' ' + raw.cats[raw.other] + '의 몇 배인가요?',
        answerText: raw.mult + '배', value: raw.mult,
        choiceKind: 'value', reveal: { highlight: [raw.target, raw.other] }
      });
      cardLines = CARDS.bar2;
    } else if (kind === 'bar-cells') {
      var ansCells = raw.values[raw.target] / raw.scale;
      steps.push({
        ask: '눈금 한 칸이 ' + fmtVal(raw.scale, unit) + '일 때, ' + raw.cats[raw.target] + ' 막대는 몇 칸으로 그리나요?',
        answerText: ansCells + '칸', value: ansCells,
        choiceKind: 'value', reveal: { bar: raw.target }
      });
      cardLines = CARDS.bar3;
    } else if (kind === 'bar-missing') {
      steps.push({
        ask: '합계가 ' + fmtVal(total, unit) + '일 때, 빠진 ' + josa(raw.cats[raw.target], '은', '는') + ' 몇 ' + unit + '인가요?',
        answerText: fmtVal(raw.values[raw.target], unit), value: raw.values[raw.target],
        choiceKind: 'value', reveal: { bar: raw.target }
      });
      cardLines = CARDS.bar3;
    } else if (kind === 'line-change' || kind === 'wave-change') {
      var v1 = raw.values[raw.from], v2 = raw.values[raw.to];
      var cDiff = Math.abs(v2 - v1);
      var verb = v2 > v1 ? '늘어났나요?' : '줄어들었나요?';
      steps.push({
        ask: raw.cats[raw.from] + '부터 ' + raw.cats[raw.to] + '까지 얼마나 ' + verb,
        answerText: fmtVal(cDiff, unit), value: cDiff,
        choiceKind: 'value', reveal: { arrow: [raw.from, raw.to, fmtVal(cDiff, unit)] }
      });
      cardLines = kind === 'wave-change' ? CARDS.wave : CARDS.line2;
    } else if (kind === 'line-most') {
      var lv1 = raw.values[raw.target], lv2 = raw.values[raw.target + 1];
      var lDiff = Math.abs(lv2 - lv1);
      var lWord = lv2 > lv1 ? '가장 많이 늘어난 때는' : '가장 많이 줄어든 때는';
      var rText = rangeLabel(raw.cats[raw.target], raw.cats[raw.target + 1]);
      steps.push({
        ask: lWord + ' 언제인가요?',
        answerText: rText, value: raw.target,
        choiceKind: 'name', reveal: { arrow: [raw.target, raw.target + 1, fmtVal(lDiff, unit)] }
      });
      cardLines = CARDS.line2;
    } else if (kind === 'line-mid') {
      var midX = midLabel(raw.cats[raw.target], raw.cats[raw.target + 1]);
      var midVal = (raw.values[raw.target] + raw.values[raw.target + 1]) / 2;
      steps.push({
        ask: midX + '의 값은 얼마쯤일까요?',
        answerText: fmtVal(midVal, unit), value: midVal,
        choiceKind: 'value', reveal: { mid: [raw.target, fmtVal(midVal, unit)] }
      });
      cardLines = CARDS.line2;
    }

    return {
      kind: kind, grade: grade, chart: chart, table: table, total: total,
      steps: steps, cardLines: cardLines, key: raw.key,
      _raw: raw
    };
  }

  function makeProblem(kind, rng, opt) {
    var pool = poolOf(kind);
    var raw = pool[randInt(0, pool.length - 1, rng)];
    return buildProblem(raw, opt);
  }

  function formatToken(kind, val, unit) {
    if (kind === 'bar-times') { return val + '배'; }
    if (kind === 'bar-cells') { return val + '칸'; }
    return fmtVal(val, unit);
  }

  function wrongNameChoices(p, raw, step) {
    var out = [], used = {};
    used[step.answerText] = true;
    var i, idx;
    if (p.kind === 'bar-most') {
      var idxs = [];
      for (i = 0; i < raw.cats.length; i++) { idxs.push(i); }
      idxs.sort(function (a, b) {
        return raw.askMore ? raw.values[a] - raw.values[b] : raw.values[b] - raw.values[a];
      });
      var opp = idxs[0];
      if (!used[raw.cats[opp]]) { used[raw.cats[opp]] = true; out.push({ token: raw.cats[opp], mistake: 'opposite' }); }
      var sec = raw.askMore ? idxs[idxs.length - 2] : idxs[1];
      if (out.length < 2 && sec !== undefined && !used[raw.cats[sec]]) {
        used[raw.cats[sec]] = true; out.push({ token: raw.cats[sec], mistake: 'second' });
      }
      for (i = 0; i < raw.cats.length && out.length < 2; i++) {
        if (!used[raw.cats[i]]) { used[raw.cats[i]] = true; out.push({ token: raw.cats[i], mistake: 'second' }); }
      }
      return out;
    }

    // line-most
    var wantUp = raw.values[raw.target + 1] > raw.values[raw.target];
    var maxPt = 0;
    for (i = 1; i < raw.values.length; i++) { if (raw.values[i] > raw.values[maxPt]) { maxPt = i; } }
    var highSegs = [];
    if (maxPt > 0) { highSegs.push(maxPt - 1); }
    if (maxPt < raw.values.length - 1) { highSegs.push(maxPt); }
    for (i = 0; i < highSegs.length && out.length < 1; i++) {
      idx = highSegs[i];
      var hTxt = rangeLabel(raw.cats[idx], raw.cats[idx + 1]);
      if (!used[hTxt]) { used[hTxt] = true; out.push({ token: hTxt, mistake: 'highest' }); }
    }
    var oppBest = -1, oppMax = 0, sameSec = -1, sameMax = 0;
    for (i = 0; i < raw.values.length - 1; i++) {
      if (i === raw.target) { continue; }
      var d = raw.values[i + 1] - raw.values[i];
      var isUp = d > 0;
      var absD = Math.abs(d);
      if (isUp !== wantUp && absD > oppMax) { oppMax = absD; oppBest = i; }
      if (isUp === wantUp && absD > sameMax) { sameMax = absD; sameSec = i; }
    }
    if (out.length < 2 && oppBest >= 0) {
      var oTxt = rangeLabel(raw.cats[oppBest], raw.cats[oppBest + 1]);
      if (!used[oTxt]) { used[oTxt] = true; out.push({ token: oTxt, mistake: 'opposite-dir' }); }
    }
    if (out.length < 2 && sameSec >= 0) {
      var sTxt = rangeLabel(raw.cats[sameSec], raw.cats[sameSec + 1]);
      if (!used[sTxt]) { used[sTxt] = true; out.push({ token: sTxt, mistake: 'second' }); }
    }
    for (i = 0; i < raw.values.length - 1 && out.length < 2; i++) {
      var aTxt = rangeLabel(raw.cats[i], raw.cats[i + 1]);
      if (!used[aTxt]) { used[aTxt] = true; out.push({ token: aTxt, mistake: 'second' }); }
    }
    return out;
  }

  function buildCandidates(p, raw, step, h) {
    var ans = step.value, scale = raw.scale, base = raw.base;
    var cands = [], kind = p.kind;
    function push(val, mistake) { cands.push({ val: val, mistake: mistake }); }

    if (kind === 'bar-scale' || kind === 'line-scale' || (kind === 'bar-read-scale' && p.steps.length === 2 && step === p.steps[0])) {
      push(scale * raw.labelEvery, 'label-value');
      push(raw.labelEvery, 'cell-count');
      push(1, 'one');
      push(scale * raw.labelEvery * 2, 'next-label');
      return cands;
    }
    if (kind === 'bar-read' || kind === 'line-read' || kind === 'bar-read-scale') {
      push((ans - base) / scale, 'cells-only');
      push(ans + scale, 'off-one');
      push(ans - scale, 'off-one');
      if (raw.target > 0) { push(raw.values[raw.target - 1], 'neighbor'); }
      if (raw.target + 1 < raw.values.length) { push(raw.values[raw.target + 1], 'neighbor'); }
      return cands;
    }
    if (kind === 'bar-diff') {
      push(raw.values[raw.target], 'bigger-only');
      push(ans / scale, 'cells-diff');
      push(raw.values[raw.target] + raw.values[raw.other], 'sum');
      push(raw.values[raw.other], 'smaller-only');
      return cands;
    }
    if (kind === 'line-change' || kind === 'wave-change') {
      push(ans / scale, 'cells-diff');
      push(raw.values[raw.to], 'later-only');
      push(ans + scale, 'off-one');
      push(ans - scale, 'off-one');
      return cands;
    }
    if (kind === 'bar-times') {
      var d = raw.values[raw.target] - raw.values[raw.other];
      if (d !== ans && d <= 20) { push(d, 'diff'); }
      push(d / scale, 'cells-diff');
      push(ans + 1, 'off-one');
      push(ans - 1, 'off-one');
      return cands;
    }
    if (kind === 'bar-cells') {
      push(raw.values[raw.target], 'value-as-cells');
      push(ans + 1, 'off-one');
      push(ans - 1, 'off-one');
      if (raw.target > 0) { push(raw.values[raw.target - 1] / scale, 'neighbor'); }
      if (raw.target + 1 < raw.values.length) { push(raw.values[raw.target + 1] / scale, 'neighbor'); }
      if (ans % 2 === 0) { push(ans / 2, 'half'); }
      return cands;
    }
    if (kind === 'bar-missing') {
      var oth = (raw.target === 0) ? 1 : 0;
      push(ans + raw.values[oth], 'forget-one');
      push(ans - raw.values[oth], 'extra-one');
      push(p.total, 'total');
      push(ans + scale, 'calc-slip');
      push(ans - scale, 'calc-slip');
      return cands;
    }
    if (kind === 'line-mid') {
      var vL = raw.values[raw.target], vR = raw.values[raw.target + 1];
      if (h % 2 === 0) {
        push(vL, 'left'); push(vR, 'right');
        push(ans + scale, 'mid-off'); push(ans - scale, 'mid-off');
      } else {
        // 홀수 판: 둘 다 정답보다 작은 쪽(가운데 − 한 칸, 작은 끝 값) → 정답이 가장 큰 자리
        push(ans - scale, 'mid-off'); push(Math.min(vL, vR), vL < vR ? 'left' : 'right');
        push(Math.max(vL, vR), vL < vR ? 'right' : 'left'); push(ans + scale, 'mid-off');
      }
      return cands;
    }
    if (kind === 'wave-read') {
      var cCount = (ans - base) / scale;
      push(ans - base, 'from-zero');
      if (scale > 1) { push(base + cCount, 'count-by-one'); }
      push(ans + scale, 'off-one');
      push(ans - scale, 'off-one');
      return cands;
    }
    return cands;
  }

  function wrongChoices(p, stepIndex) {
    var idx = stepIndex || 0;
    var step = p.steps[idx];
    var raw = p._raw;
    if (step.choiceKind === 'name') { return wrongNameChoices(p, raw, step); }

    var ans = step.value;
    var unit = raw.topic.unit;
    var h = M.mixHash(p.key + '|' + idx);
    var cands = buildCandidates(p, raw, step, h);
    var out = [], used = {};
    used[ans] = true;

    function valid(v) { return typeof v === 'number' && v >= 1 && Math.floor(v) === v && !used[v]; }
    function add(v, mistake) {
      used[v] = true;
      out.push({ token: formatToken(p.kind, v, unit), mistake: mistake });
    }

    var i;
    for (i = 0; i < cands.length; i++) {
      if (valid(cands[i].val)) { add(cands[i].val, cands[i].mistake); break; }
    }

    var wantLarger = (h % 2 === 0);
    for (i = 0; i < cands.length && out.length < 2; i++) {
      var cv = cands[i].val;
      if (valid(cv) && (wantLarger ? cv > ans : cv < ans)) { add(cv, cands[i].mistake); }
    }

    var slipStep = (p.kind === 'bar-times' || p.kind === 'bar-cells') ? 1 : raw.scale;
    if (out.length < 2) {
      var slip1 = wantLarger ? ans + slipStep : ans - slipStep;
      if (valid(slip1)) { add(slip1, 'calc-slip'); }
    }
    for (i = 0; i < cands.length && out.length < 2; i++) {
      if (valid(cands[i].val)) { add(cands[i].val, cands[i].mistake); }
    }
    if (out.length < 2) {
      var slip2 = wantLarger ? ans - slipStep : ans + slipStep;
      if (valid(slip2)) { add(slip2, 'calc-slip'); }
    }
    var delta = 1;
    while (out.length < 2 && delta < 50) {
      if (valid(ans + delta)) { add(ans + delta, 'fix'); }
      else if (valid(ans - delta)) { add(ans - delta, 'fix'); }
      delta++;
    }
    return out;
  }

  function hintFor(p, mistake) {
    return HINTS[mistake] || HINTS.fix;
  }

  function makeRound(lab, rng) {
    var kinds = LAB_KINDS[lab];
    if (!kinds) { throw new Error('Unknown lab: ' + lab); }
    var out = [], usedKeys = {}, i, tries, p;
    for (i = 0; i < kinds.length; i++) {
      var kind = kinds[i];
      var opt = null;
      if (lab === 1 && i === 2 && kind === 'bar-read') { opt = { orient: 'h' }; }
      else if (lab === 2) { opt = { orient: i === 1 ? 'h' : (rng() < 0.5 ? 'v' : 'h') }; }
      tries = 0;
      do {
        p = makeProblem(kind, rng, opt);
        tries++;
      } while (usedKeys[p.key] && tries < 40);
      usedKeys[p.key] = true;
      out.push(p);
    }
    return out;
  }

  function makeMixedRound(rng, n) {
    var totalN = (typeof n === 'number') ? n : 10;
    var barKinds = [], lineKinds = [], i;
    for (i = 0; i < MIXED_KINDS.length; i++) {
      if (MIXED_KINDS[i].indexOf('bar-') === 0) { barKinds.push(MIXED_KINDS[i]); }
      else { lineKinds.push(MIXED_KINDS[i]); }
    }
    var counts = {}, chosen = [];
    var nBar = Math.max(4, Math.min(totalN - 4, Math.floor(totalN / 2)));
    var nLine = totalN - nBar;

    function pickKinds(src, targetLen) {
      var safety = 0;
      while (targetLen > 0 && safety < 200) {
        safety++;
        var k = src[randInt(0, src.length - 1, rng)];
        if ((counts[k] || 0) < 2) {
          counts[k] = (counts[k] || 0) + 1;
          chosen.push(k);
          targetLen--;
        }
      }
    }
    pickKinds(barKinds, nBar);
    pickKinds(lineKinds, nLine);

    var out = [], usedKeys = {}, tries, p;
    for (i = 0; i < chosen.length; i++) {
      tries = 0;
      do {
        p = makeProblem(chosen[i], rng, { mixed: true });
        tries++;
      } while (usedKeys[p.key] && tries < 40);
      usedKeys[p.key] = true;
      out.push(p);
    }
    out.sort(function (a, b) {
      return (KIND_ORDER[a.kind] || 0) - (KIND_ORDER[b.kind] || 0);
    });
    return out;
  }

  global.BarLineCore = {
    LAB_KINDS: LAB_KINDS,
    MIXED_KINDS: MIXED_KINDS,
    KIND_ORDER: KIND_ORDER,
    TOPICS: TOPICS,
    HINTS: HINTS,
    hintFor: hintFor,
    makeProblem: makeProblem,
    wrongChoices: wrongChoices,
    makeRound: makeRound,
    makeMixedRound: makeMixedRound,
    poolOf: poolOf
  };
})(typeof window !== 'undefined' ? window : globalThis);
