// 초등 2-2 '5. 표와 그래프' 그림 부품 (TableGraphDraw, docs/math_2-2_graph_spec.md)
(function (global) {
  'use strict';

  function clamp(n, lo, hi) {
    var v = Math.floor(Number(n));
    if (isNaN(v)) v = lo;
    if (v < lo) return lo;
    if (v > hi) return hi;
    return v;
  }

  function makeEl(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  // 순수 함수: 표시 k번째(0부터)가 들어갈 칸 영역 좌표 (머리 칸 제외, DOM 없음)
  function cellFor(orient, col, k, rows) {
    var c = Math.floor(Number(col) || 0);
    var idx = Math.floor(Number(k) || 0);
    var r = Math.floor(Number(rows) || 0);
    if (orient === 'h') {
      return { x: idx, y: c };
    }
    return { x: c, y: r - 1 - idx };
  }

  // 순수 함수: 기둥에 count개 있을 때 idx번째 칸(0부터)을 누른 결과 (DOM 없음)
  function tapResult(count, idx) {
    var c = Math.floor(Number(count) || 0);
    var i = Math.floor(Number(idx) || 0);
    if (i === c) return 'add';
    if (i === c - 1) return 'erase';
    return 'gap';
  }

  // 그림 카드 격자 (1관 분류해 세기 · 2관 조사한 자료)
  function cards(list, opts) {
    var o = opts || {};
    var items = Array.isArray(list) ? list : [];
    var cols = Number(o.cols) > 0 ? Math.floor(Number(o.cols)) : 4;
    var wrap = makeEl('div', 'tg-cards');
    wrap.style.gridTemplateColumns = 'repeat(' + cols + ', minmax(0, 1fr))';

    for (var i = 0; i < items.length; i += 1) {
      var item = items[i] || {};
      var isFriend = item.name !== undefined && item.name !== null && item.name !== '';
      var card = makeEl('div', isFriend ? 'tg-card tg-card-friend' : 'tg-card');
      if (isFriend) {
        card.appendChild(makeEl('span', 'tg-card-name', item.name));
        card.appendChild(makeEl('span', 'tg-card-emoji', item.emoji || ''));
        if (item.label !== undefined && item.label !== null && item.label !== '') {
          card.appendChild(makeEl('span', 'tg-card-label', item.label));
        }
      } else {
        card.appendChild(makeEl('span', 'tg-card-emoji', item.emoji || ''));
        if (item.label !== undefined && item.label !== null && item.label !== '') {
          card.appendChild(makeEl('span', 'tg-card-label', item.label));
        }
      }
      wrap.appendChild(card);
    }

    return wrap;
  }

  // 가로 두 줄 표 (교과서 모양, 합계 열 선택, 빈칸 □ 지원)
  function table(t) {
    var o = t || {};
    var kinds = Array.isArray(o.kinds) ? o.kinds : [];
    var values = Array.isArray(o.values) ? o.values : [];
    var noTotal = Boolean(o.noTotal);
    var blank = o.blank === undefined ? null : o.blank;
    var totalVal = o.total;

    if (totalVal === undefined || totalVal === null) {
      totalVal = 0;
      for (var s = 0; s < kinds.length; s += 1) {
        totalVal += Number(values[s]) || 0;
      }
    }

    var tbl = makeEl('table', 'tg-table');
    var thead = makeEl('thead');
    var trHead = makeEl('tr');

    var thHead = makeEl('th', 'tg-th-head', o.head || '');
    thHead.setAttribute('scope', 'col');
    trHead.appendChild(thHead);

    for (var i = 0; i < kinds.length; i += 1) {
      var k = kinds[i] || {};
      var th = makeEl('th', 'tg-th-kind');
      th.setAttribute('scope', 'col');
      if (k.emoji) th.appendChild(makeEl('span', 'tg-th-emoji', k.emoji));
      th.appendChild(makeEl('span', 'tg-th-label', k.label || ''));
      trHead.appendChild(th);
    }

    if (!noTotal) {
      var thTotal = makeEl('th', 'tg-th-total', '합계');
      thTotal.setAttribute('scope', 'col');
      trHead.appendChild(thTotal);
    }
    thead.appendChild(trHead);
    tbl.appendChild(thead);

    var tbody = makeEl('tbody');
    var trBody = makeEl('tr');

    var thRow = makeEl('th', 'tg-td-head', o.rowHead || '');
    thRow.setAttribute('scope', 'row');
    trBody.appendChild(thRow);

    for (var j = 0; j < kinds.length; j += 1) {
      var isBlank = typeof blank === 'number' && blank === j;
      var valText = isBlank ? '□' : String(values[j] !== undefined ? values[j] : '');
      var td = makeEl('td', isBlank ? 'tg-td-val tg-blank' : 'tg-td-val', valText);
      trBody.appendChild(td);
    }

    if (!noTotal) {
      var isTotalBlank = blank === 'total';
      var totalText = isTotalBlank ? '□' : String(totalVal);
      var tdTotal = makeEl('td', isTotalBlank ? 'tg-td-total tg-blank' : 'tg-td-total', totalText);
      trBody.appendChild(tdTotal);
    }
    tbody.appendChild(trBody);
    tbl.appendChild(tbody);

    return tbl;
  }

  // ○·×·/ 그래프 (세로·가로, 그리기 editable, 투표 add, 강조 highlight, 잠금 lock)
  function graph(g) {
    var o = g || {};
    var orient = o.orient === 'h' ? 'h' : 'v';
    var kinds = Array.isArray(o.kinds) ? o.kinds : [];
    var rows = clamp(o.rows === undefined ? 6 : o.rows, 1, 10);
    var mark = o.mark || '○';
    var axisText = o.axisLabel !== undefined && o.axisLabel !== null
      ? String(o.axisLabel)
      : (o.unit ? '(' + o.unit + ')' : '');
    var kindHead = o.kindHead || '';
    var editable = o.editable && typeof o.editable === 'object' ? o.editable : null;
    var editCol = editable && editable.col !== undefined && editable.col !== null
      ? Math.floor(Number(editable.col))
      : -1;
    var onChange = editable && typeof editable.onChange === 'function' ? editable.onChange : null;
    var onHint = editable && typeof editable.onHint === 'function' ? editable.onHint : null;

    var curValues = [];
    var initVals = Array.isArray(o.values) ? o.values : [];
    for (var v = 0; v < kinds.length; v += 1) {
      curValues.push(clamp(initVals[v] || 0, 0, rows));
    }

    var locked = false;
    var cells = [];
    var marks = [];
    var popTimers = [];

    var wrap = makeEl('div', 'tg-graph-wrap tg-graph-' + orient);
    if (axisText) {
      wrap.appendChild(makeEl('div', 'tg-axis-label', axisText));
    }

    var grid = makeEl('div', 'tg-graph tg-orient-' + orient);
    if (orient === 'v') {
      grid.style.gridTemplateColumns = 'minmax(28px, 34px) repeat(' + kinds.length + ', minmax(40px, 48px))';
      grid.style.gridTemplateRows = 'repeat(' + rows + ', minmax(40px, 44px)) auto';
    } else {
      grid.style.gridTemplateColumns = '56px repeat(' + rows + ', minmax(40px, 48px))';
      grid.style.gridTemplateRows = 'repeat(' + kinds.length + ', minmax(40px, 44px)) auto';
    }

    // 축 머리 칸·종류 칸·구석 칸
    if (orient === 'v') {
      for (var r = 0; r < rows; r += 1) {
        var numV = makeEl('div', 'tg-axis-num', String(rows - r));
        numV.style.gridColumn = '1';
        numV.style.gridRow = String(r + 1);
        grid.appendChild(numV);
      }

      var cornerV = makeEl('div', 'tg-corner', kindHead);
      cornerV.style.gridColumn = '1';
      cornerV.style.gridRow = String(rows + 1);
      grid.appendChild(cornerV);

      for (var cv = 0; cv < kinds.length; cv += 1) {
        var kv = kinds[cv] || {};
        var kCellV = makeEl('div', 'tg-kind-cell');
        if (kv.emoji) kCellV.appendChild(makeEl('span', 'tg-kind-emoji', kv.emoji));
        kCellV.appendChild(makeEl('span', 'tg-kind-label', kv.label || ''));
        kCellV.style.gridColumn = String(cv + 2);
        kCellV.style.gridRow = String(rows + 1);
        grid.appendChild(kCellV);
      }
    } else {
      for (var ch = 0; ch < kinds.length; ch += 1) {
        var kh = kinds[ch] || {};
        var kCellH = makeEl('div', 'tg-kind-cell');
        if (kh.emoji) kCellH.appendChild(makeEl('span', 'tg-kind-emoji', kh.emoji));
        kCellH.appendChild(makeEl('span', 'tg-kind-label', kh.label || ''));
        kCellH.style.gridColumn = '1';
        kCellH.style.gridRow = String(ch + 1);
        grid.appendChild(kCellH);
      }

      var cornerH = makeEl('div', 'tg-corner', kindHead);
      cornerH.style.gridColumn = '1';
      cornerH.style.gridRow = String(kinds.length + 1);
      grid.appendChild(cornerH);

      for (var nh = 0; nh < rows; nh += 1) {
        var numH = makeEl('div', 'tg-axis-num', String(nh + 1));
        numH.style.gridColumn = String(nh + 2);
        numH.style.gridRow = String(kinds.length + 1);
        grid.appendChild(numH);
      }
    }

    function clearPop(col, k) {
      if (popTimers[col] && popTimers[col][k]) {
        clearTimeout(popTimers[col][k]);
        popTimers[col][k] = null;
      }
      if (cells[col] && cells[col][k]) {
        cells[col][k].classList.remove('is-pop');
      }
    }

    function triggerPop(col, k) {
      if (!cells[col] || !cells[col][k]) return;
      clearPop(col, k);
      var target = cells[col][k];
      target.classList.add('is-pop');
      popTimers[col][k] = setTimeout(function () {
        target.classList.remove('is-pop');
        popTimers[col][k] = null;
      }, 300);
    }

    function syncCol(col) {
      if (col < 0 || col >= kinds.length) return;
      var count = curValues[col];
      var isEditCol = editable !== null && col === editCol;
      for (var k = 0; k < rows; k += 1) {
        var cell = cells[col][k];
        var markEl = marks[col][k];
        var on = k < count;
        cell.classList.toggle('is-on', on);
        markEl.textContent = on ? mark : '';
        if (isEditCol) {
          var isNext = !locked && k === count && count < rows;
          cell.classList.toggle('is-next', isNext);
          cell.disabled = locked;
        }
      }
    }

    function syncAll() {
      for (var c = 0; c < kinds.length; c += 1) {
        syncCol(c);
      }
    }

    function bindTap(btn, col, k) {
      btn.addEventListener('click', function () {
        if (locked) return;
        var count = curValues[col];
        var res = tapResult(count, k);
        if (res === 'add') {
          if (count >= rows) return;
          curValues[col] = count + 1;
          syncCol(col);
          triggerPop(col, count);
          if (onChange) onChange(curValues[col]);
        } else if (res === 'erase') {
          curValues[col] = count - 1;
          clearPop(col, k);
          syncCol(col);
          if (onChange) onChange(curValues[col]);
        } else {
          if (onHint) onHint('gap');
        }
      });
    }

    // 칸 영역 생성 (cellFor 좌표로 배치)
    for (var col = 0; col < kinds.length; col += 1) {
      cells[col] = [];
      marks[col] = [];
      popTimers[col] = [];
      var isEdit = editable !== null && col === editCol;
      var kindLabel = (kinds[col] && kinds[col].label) ? kinds[col].label : '';

      for (var k = 0; k < rows; k += 1) {
        var pos = cellFor(orient, col, k, rows);
        var cell = isEdit
          ? makeEl('button', 'tg-cell tg-tap')
          : makeEl('div', 'tg-cell');
        if (isEdit) {
          cell.type = 'button';
          cell.setAttribute('aria-label', kindLabel + ' ' + (k + 1) + '번째 칸');
          bindTap(cell, col, k);
        }
        cell.style.gridColumn = String(pos.x + 2);
        cell.style.gridRow = String(pos.y + 1);

        var markEl = makeEl('span', 'tg-mark');
        cell.appendChild(markEl);
        grid.appendChild(cell);

        cells[col][k] = cell;
        marks[col][k] = markEl;
        popTimers[col][k] = null;
      }
    }

    wrap.appendChild(grid);
    syncAll();

    function set(values) {
      var next = Array.isArray(values) ? values : [];
      for (var c = 0; c < kinds.length; c += 1) {
        curValues[c] = clamp(next[c] || 0, 0, rows);
      }
      syncAll();
    }

    function get() {
      return curValues.slice();
    }

    function add(colIdx) {
      var c = Math.floor(Number(colIdx));
      if (isNaN(c) || c < 0 || c >= kinds.length) return false;
      if (curValues[c] >= rows) return false;
      var idx = curValues[c];
      curValues[c] = idx + 1;
      syncCol(c);
      triggerPop(c, idx);
      return true;
    }

    function highlight(cols) {
      var hlMap = {};
      if (Array.isArray(cols)) {
        for (var i = 0; i < cols.length; i += 1) {
          hlMap[Math.floor(Number(cols[i]))] = true;
        }
      }
      for (var c = 0; c < kinds.length; c += 1) {
        var on = Boolean(hlMap[c]);
        for (var k = 0; k < rows; k += 1) {
          cells[c][k].classList.toggle('is-hl', on);
        }
      }
    }

    function lock(bool) {
      locked = Boolean(bool);
      wrap.classList.toggle('is-locked', locked);
      if (editable !== null && editCol >= 0 && editCol < kinds.length) {
        syncCol(editCol);
      }
    }

    return {
      el: wrap,
      set: set,
      get: get,
      add: add,
      highlight: highlight,
      lock: lock
    };
  }

  global.TableGraphDraw = {
    cellFor: cellFor,
    tapResult: tapResult,
    cards: cards,
    table: table,
    graph: graph
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = global.TableGraphDraw;
})(typeof window !== 'undefined' ? window : globalThis);
