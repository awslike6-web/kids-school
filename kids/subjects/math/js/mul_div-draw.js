// 초등 4-1 곱셈과 나눗셈 탐험관 그리기 부품 MulDivDraw (보기 전용, 누르는 칸 없음)
(function (global) {
  'use strict';

  var FILL_STEP_MS = 250;
  var CHECK_NEXT_MS = 500;
  var CHECK_DONE_MS = 320;

  function makeEl(ui, tag, cls, text) {
    if (ui && typeof ui.el === 'function') {
      return ui.el(tag, cls, text);
    }
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function reducedMotion() {
    return Boolean(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function clearTimers(list) {
    var i;
    for (i = 0; i < list.length; i += 1) {
      global.clearTimeout(list[i]);
    }
    list.length = 0;
  }

  function buildDigitRow(ui, cols, extraCls) {
    var rowCls = extraCls ? 'da-col-row md4-row ' + extraCls : 'da-col-row md4-row';
    var row = makeEl(ui, 'div', rowCls);
    var cells = [];
    var i, cell;
    for (i = 0; i < cols; i += 1) {
      cell = makeEl(ui, 'span', 'da-col-cell md4-cell', '');
      cells.push(cell);
      row.appendChild(cell);
    }
    return { el: row, cells: cells };
  }

  function writeRightAligned(cells, valueStr, endCol, markGhostLast) {
    var i, idx, ch;
    for (i = 0; i < cells.length; i += 1) {
      cells[i].textContent = '';
      cells[i].classList.remove('md4-ghost', 'md4-filled');
    }
    for (i = 0; i < valueStr.length; i += 1) {
      idx = endCol - i;
      if (idx < 0 || idx >= cells.length) continue;
      ch = valueStr.charAt(valueStr.length - 1 - i);
      cells[idx].textContent = ch;
      cells[idx].classList.add('md4-filled');
      if (markGhostLast && i === 0 && ch === '0') {
        cells[idx].classList.add('md4-ghost');
      }
    }
  }

  // 1. 곱셈 세로셈 판: 열 수 = String(a * b).length + 1 고정, 빈 세 줄로 시작
  function mulBoard(ui, a, b) {
    var prod = a * b;
    var cols = String(prod).length + 1;
    var d1 = b % 10;
    var d2 = Math.floor(b / 10);
    var values = {
      ones: String(a * d1),
      tens: String(a * d2 * 10),
      sum: String(prod)
    };

    var wrap = makeEl(ui, 'div', 'da-col md4-board md4-mul');
    var grid = makeEl(ui, 'div', 'da-col-grid md4-mul-grid');
    wrap.appendChild(grid);

    var rowA = buildDigitRow(ui, cols, 'md4-row-static');
    writeRightAligned(rowA.cells, String(a), cols - 1, false);
    grid.appendChild(rowA.el);

    var rowB = buildDigitRow(ui, cols, 'md4-row-static');
    writeRightAligned(rowB.cells, String(b), cols - 1, false);
    rowB.cells[0].textContent = '×';
    rowB.cells[0].className = 'da-col-cell da-col-sign md4-cell md4-sign';
    grid.appendChild(rowB.el);

    grid.appendChild(makeEl(ui, 'div', 'da-col-bar md4-bar'));

    var rowOnes = buildDigitRow(ui, cols, 'md4-row-ans');
    var rowTens = buildDigitRow(ui, cols, 'md4-row-ans');
    grid.appendChild(rowOnes.el);
    grid.appendChild(rowTens.el);

    grid.appendChild(makeEl(ui, 'div', 'da-col-bar md4-bar'));

    var rowSum = buildDigitRow(ui, cols, 'md4-row-ans md4-row-sum');
    grid.appendChild(rowSum.el);

    var rowMap = {
      ones: rowOnes,
      tens: rowTens,
      sum: rowSum
    };
    var rowTimers = { ones: [], tens: [], sum: [] };

    function resetRow(rowObj) {
      var i;
      for (i = 0; i < rowObj.cells.length; i += 1) {
        rowObj.cells[i].textContent = '';
        rowObj.cells[i].classList.remove('md4-ghost', 'md4-filled');
      }
    }

    function fill(rowName, done) {
      var target = rowMap[rowName];
      var str = values[rowName];
      if (!target || str === undefined) {
        if (typeof done === 'function') done();
        return;
      }

      clearTimers(rowTimers[rowName]);
      resetRow(target);

      var isTens = rowName === 'tens';
      if (reducedMotion()) {
        writeRightAligned(target.cells, str, cols - 1, isTens);
        if (typeof done === 'function') done();
        return;
      }

      var len = str.length;
      var timers = rowTimers[rowName];
      var step;

      function scheduleDigit(offset) {
        var tid = global.setTimeout(function () {
          var idx = cols - 1 - offset;
          var ch = str.charAt(len - 1 - offset);
          if (idx >= 0 && idx < target.cells.length) {
            target.cells[idx].textContent = ch;
            target.cells[idx].classList.add('md4-filled');
            if (isTens && offset === 0 && ch === '0') {
              target.cells[idx].classList.add('md4-ghost');
            }
          }
          if (offset === len - 1 && typeof done === 'function') {
            var endTid = global.setTimeout(function () { done(); }, FILL_STEP_MS);
            timers.push(endTid);
          }
        }, offset * FILL_STEP_MS);
        timers.push(tid);
      }

      for (step = 0; step < len; step += 1) {
        scheduleDigit(step);
      }
    }

    function focus(rowName) {
      var keys = ['ones', 'tens', 'sum'];
      var i, key;
      for (i = 0; i < keys.length; i += 1) {
        key = keys[i];
        rowMap[key].el.classList.toggle('md4-focus', key === rowName);
      }
    }

    return {
      el: wrap,
      fill: fill,
      focus: focus
    };
  }

  // 2. 나눗셈 세로셈 판: 교과서 꼴 b ) a + 위 몫 칸 + 단계별 곱/나머지 + 아래 나머지 꼬리표
  function resolveSteps(a, b, steps) {
    if (Array.isArray(steps) && steps.length > 0) return steps;
    if (global.MulDivCore && typeof global.MulDivCore.longDivide === 'function') {
      return global.MulDivCore.longDivide(a, b).steps;
    }
    return [{ q: Math.floor(a / b), take: a, product: Math.floor(a / b) * b, remain: a % b, next: null }];
  }

  function makeDivRow(ui, cols, gutterText, rowCls, bodyCls) {
    var row = makeEl(ui, 'div', rowCls ? 'md4-div-row ' + rowCls : 'md4-div-row');
    var gutter = makeEl(ui, 'span', 'md4-div-gutter', gutterText || '');
    var body = makeEl(ui, 'div', bodyCls ? 'md4-div-body ' + bodyCls : 'md4-div-body');
    var cells = [];
    var i, cell;
    for (i = 0; i < cols; i += 1) {
      cell = makeEl(ui, 'span', 'da-col-cell md4-cell', '');
      cells.push(cell);
      body.appendChild(cell);
    }
    row.appendChild(gutter);
    row.appendChild(body);
    return { el: row, gutter: gutter, body: body, cells: cells };
  }

  function divBoard(ui, a, b, rawSteps) {
    var steps = resolveSteps(a, b, rawSteps);
    var aStr = String(a);
    var cols = aStr.length;
    var stepCount = steps.length;
    var lastIdx = stepCount - 1;

    function colEnd(stepIdx) {
      return cols - stepCount + stepIdx;
    }

    var wrap = makeEl(ui, 'div', 'da-col md4-board md4-div');
    var grid = makeEl(ui, 'div', 'da-col-grid md4-div-grid');
    wrap.appendChild(grid);

    // 몫 줄
    var qRow = makeDivRow(ui, cols, '', 'md4-div-qrow', 'md4-div-pad');
    var qCells = [];
    var i, colPos;
    for (i = 0; i < cols; i += 1) {
      qRow.cells[i].classList.add('md4-spacer');
    }
    for (i = 0; i < stepCount; i += 1) {
      colPos = colEnd(i);
      if (colPos >= 0 && colPos < cols) {
        qRow.cells[colPos].classList.remove('md4-spacer');
        qRow.cells[colPos].classList.add('md4-qcell');
        qCells.push(qRow.cells[colPos]);
      }
    }
    grid.appendChild(qRow.el);

    // 나누는 수 b ) 나누어지는 수 a 줄
    var aRow = makeDivRow(ui, cols, String(b), 'md4-div-arow', 'md4-div-bracket');
    aRow.gutter.classList.add('md4-div-divisor');
    writeRightAligned(aRow.cells, aStr, cols - 1, false);
    grid.appendChild(aRow.el);

    // 단계별 곱한 값 줄 + 가로선 + 뺀 값(또는 내려쓴 수) 줄
    var stepViews = [];
    var prodRow, barWrap, barLine, remRow, stepEl;
    for (i = 0; i < stepCount; i += 1) {
      stepEl = makeEl(ui, 'div', 'md4-div-step');

      prodRow = makeDivRow(ui, cols, '', 'md4-div-prow', 'md4-div-pad');
      prodRow.el.hidden = true;

      barWrap = makeEl(ui, 'div', 'md4-div-row md4-div-brow');
      barWrap.appendChild(makeEl(ui, 'span', 'md4-div-gutter', ''));
      barLine = makeEl(ui, 'div', 'md4-div-bar');
      barWrap.appendChild(barLine);
      barWrap.hidden = true;

      remRow = makeDivRow(ui, cols, '', i === lastIdx ? 'md4-div-rrow md4-div-final' : 'md4-div-rrow', 'md4-div-pad');
      remRow.el.hidden = true;

      stepEl.appendChild(prodRow.el);
      stepEl.appendChild(barWrap);
      stepEl.appendChild(remRow.el);
      grid.appendChild(stepEl);

      stepViews.push({
        prodRow: prodRow,
        barWrap: barWrap,
        remRow: remRow
      });
    }

    // 판 아래 나머지 보조 줄
    var remTag = makeEl(ui, 'div', 'md4-remtag', '');
    remTag.hidden = true;
    wrap.appendChild(remTag);

    function fillQuotient(idx, done) {
      if (idx >= 0 && idx < stepCount && qCells[idx]) {
        qCells[idx].textContent = String(steps[idx].q);
        qCells[idx].classList.add('md4-filled');
      }
      if (typeof done === 'function') done();
    }

    function fillProduct(idx, done) {
      var view = stepViews[idx];
      var step = steps[idx];
      if (view && step) {
        view.prodRow.el.hidden = false;
        view.barWrap.hidden = false;
        writeRightAligned(view.prodRow.cells, String(step.product), colEnd(idx), false);
      }
      if (typeof done === 'function') done();
    }

    function fillRemain(idx, done) {
      var view = stepViews[idx];
      var step = steps[idx];
      if (view && step) {
        view.remRow.el.hidden = false;
        if (idx < lastIdx && step.next !== null && step.next !== undefined) {
          writeRightAligned(view.remRow.cells, String(step.next), colEnd(idx) + 1, false);
        } else {
          writeRightAligned(view.remRow.cells, String(step.remain), colEnd(idx), false);
          remTag.textContent = '나머지 ' + step.remain;
          remTag.hidden = false;
        }
      }
      if (typeof done === 'function') done();
    }

    function focus(target) {
      var k, match, qIdx;
      for (k = 0; k < qCells.length; k += 1) {
        qCells[k].classList.remove('md4-focus');
      }
      var finalRem = stepViews[lastIdx] ? stepViews[lastIdx].remRow : null;
      if (finalRem) {
        finalRem.body.classList.remove('md4-focus');
      }

      if (!target) return;
      if (target === 'rem') {
        if (finalRem) {
          finalRem.el.hidden = false;
          finalRem.body.classList.add('md4-focus');
        }
        return;
      }
      match = /^q(\d+)$/.exec(String(target));
      if (match) {
        qIdx = Number(match[1]);
        if (qCells[qIdx]) {
          qCells[qIdx].classList.add('md4-focus');
        }
      }
    }

    return {
      el: wrap,
      fillQuotient: fillQuotient,
      fillProduct: fillProduct,
      fillRemain: fillRemain,
      focus: focus
    };
  }

  // 3. 곱셈 줄: b × 1 ~ b × 9 아홉 칩, 3열 × 3줄 격자 (표시 전용)
  function timesLadder(ui, b) {
    var grid = makeEl(ui, 'div', 'md4-ladder');
    var n, chip;
    for (n = 1; n <= 9; n += 1) {
      chip = makeEl(ui, 'div', 'md4-chip', b + ' × ' + n + ' = ' + (b * n));
      grid.appendChild(chip);
    }
    return grid;
  }

  // 4. 검산 장면: r > 0이면 두 줄(0.5초 간격), r === 0이면 한 줄. 끝나면 done()
  function checkLine(ui, a, b, q, r, done) {
    var wrap = makeEl(ui, 'div', 'md4-check');
    var prod = b * q;
    var fast = reducedMotion();

    if (r > 0) {
      wrap.appendChild(makeEl(ui, 'div', 'md4-check-step', b + ' × ' + q + ' = ' + prod));
      var line2 = makeEl(ui, 'div', 'md4-check-step md4-check-ok', prod + ' + ' + r + ' = ' + a + ' ✓');
      if (fast) {
        wrap.appendChild(line2);
        if (typeof done === 'function') {
          global.setTimeout(function () { done(); }, 0);
        }
      } else {
        global.setTimeout(function () {
          wrap.appendChild(line2);
          if (typeof done === 'function') done();
        }, CHECK_NEXT_MS);
      }
      return wrap;
    }

    wrap.appendChild(makeEl(ui, 'div', 'md4-check-step md4-check-ok', b + ' × ' + q + ' = ' + a + ' ✓'));
    if (typeof done === 'function') {
      global.setTimeout(function () { done(); }, fast ? 0 : CHECK_DONE_MS);
    }
    return wrap;
  }

  // 5. 0 지우기 줄: '240 ÷ 60' 끝 0 두 개에 빗금 → '24 ÷ 6', 나머지 시 '나머지 1 → 10'
  function buildStruckNumber(ui, num) {
    var s = String(num);
    var holder = makeEl(ui, 'span', 'md4-znum');
    if (s.length > 1 && s.charAt(s.length - 1) === '0') {
      holder.appendChild(makeEl(ui, 'span', '', s.slice(0, -1)));
      holder.appendChild(makeEl(ui, 'span', 'md4-strike', '0'));
    } else {
      holder.textContent = s;
    }
    return holder;
  }

  function zeroCancel(ui, a, b) {
    var wrap = makeEl(ui, 'div', 'md4-zero');
    var main = makeEl(ui, 'div', 'md4-zrow');
    main.appendChild(buildStruckNumber(ui, a));
    main.appendChild(makeEl(ui, 'span', 'md4-zop', ' ÷ '));
    main.appendChild(buildStruckNumber(ui, b));
    main.appendChild(makeEl(ui, 'span', 'md4-zarrow', ' → '));
    main.appendChild(makeEl(ui, 'span', 'md4-zshort', (a / 10) + ' ÷ ' + (b / 10)));
    wrap.appendChild(main);

    var remLine = null;

    function giveZeroBack(r2, r) {
      if (remLine && remLine.parentNode === wrap) {
        wrap.removeChild(remLine);
      }
      remLine = makeEl(ui, 'div', 'md4-zrem');
      var rStr = String(r);
      remLine.appendChild(makeEl(ui, 'span', '', '나머지 ' + r2 + ' → '));
      if (rStr.length > 1 && rStr.charAt(rStr.length - 1) === '0') {
        remLine.appendChild(makeEl(ui, 'span', 'md4-zrem-val', rStr.slice(0, -1)));
        remLine.appendChild(makeEl(ui, 'span', 'md4-zrem-zero', '0'));
      } else {
        remLine.appendChild(makeEl(ui, 'span', 'md4-zrem-val', rStr));
      }
      wrap.appendChild(remLine);
    }

    return {
      el: wrap,
      giveZeroBack: giveZeroBack
    };
  }

  // 6. 도움 줄 (1관 ① '325 × 4 = 1300')
  function helpLine(ui, text) {
    return makeEl(ui, 'div', 'md4-help', text);
  }

  global.MulDivDraw = {
    mulBoard: mulBoard,
    divBoard: divBoard,
    timesLadder: timesLadder,
    checkLine: checkLine,
    zeroCancel: zeroCancel,
    helpLine: helpLine
  };
})(typeof window !== 'undefined' ? window : globalThis);
