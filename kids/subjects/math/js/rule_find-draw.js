// 초등 2-2 '6. 규칙 찾기' 그림 부품 (RuleDraw, docs/math_2-2_rule_spec.md)
(function (global) {
  'use strict';

  var STACK_NAMES = ['첫째', '둘째', '셋째', '넷째', '다섯째'];

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

  function pairKey(r, c) {
    return String(r) + ',' + String(c);
  }

  function buildCoordMap(list) {
    var map = {};
    if (!Array.isArray(list)) return map;
    for (var i = 0; i < list.length; i += 1) {
      var p = list[i];
      if (Array.isArray(p) && p.length >= 2) {
        map[pairKey(Math.floor(Number(p[0])), Math.floor(Number(p[1])))] = true;
      }
    }
    return map;
  }

  // 1관: 무늬 줄 (8~9칸 한 줄, 빈칸 □)
  function row(items, opts) {
    var o = opts || {};
    var list = Array.isArray(items) ? items : [];
    var blank = typeof o.blank === 'number' ? Math.floor(o.blank) : -1;
    var count = list.length > 0 ? list.length : 1;

    var wrap = makeEl('div', 'rf-row');
    wrap.style.gridTemplateColumns = 'repeat(' + count + ', minmax(0, 1fr))';

    for (var i = 0; i < list.length; i += 1) {
      var isBlank = i === blank;
      var text = isBlank ? '□' : (list[i] !== undefined && list[i] !== null ? list[i] : '');
      var cell = makeEl('div', isBlank ? 'rf-cell is-blank' : 'rf-cell', text);
      wrap.appendChild(cell);
    }

    return wrap;
  }

  // 2관: 쌓기나무 앞모습 여러 개 + 화살표 + 선택적 '?' 상자
  function stackSeries(list, opts) {
    var o = opts || {};
    var shapes = Array.isArray(list) ? list : [];
    var totalCols = 0;
    for (var t = 0; t < shapes.length; t += 1) {
      if (Array.isArray(shapes[t])) totalCols += shapes[t].length;
    }

    var wrap = makeEl('div', totalCols > 10 ? 'rf-stacks is-dense' : 'rf-stacks');

    for (var i = 0; i < shapes.length; i += 1) {
      if (i > 0) {
        var arrow = makeEl('span', 'rf-arrow', '→');
        arrow.setAttribute('aria-hidden', 'true');
        wrap.appendChild(arrow);
      }

      var cols = Array.isArray(shapes[i]) ? shapes[i] : [];
      var unit = makeEl('div', 'rf-stack-unit');
      var stack = makeEl('div', 'rf-stack');

      for (var c = 0; c < cols.length; c += 1) {
        var h = clamp(cols[c], 0, 8);
        var colEl = makeEl('div', 'rf-col');
        for (var k = 0; k < h; k += 1) {
          colEl.appendChild(makeEl('div', 'rf-cube'));
        }
        stack.appendChild(colEl);
      }

      unit.appendChild(stack);
      var nameText = STACK_NAMES[i] || ((i + 1) + '째');
      unit.appendChild(makeEl('span', 'rf-stack-name', nameText));
      wrap.appendChild(unit);
    }

    if (o.last !== undefined && o.last !== null && o.last !== '') {
      if (shapes.length > 0) {
        var lastArrow = makeEl('span', 'rf-arrow', '→');
        lastArrow.setAttribute('aria-hidden', 'true');
        wrap.appendChild(lastArrow);
      }
      var qUnit = makeEl('div', 'rf-stack-unit');
      qUnit.appendChild(makeEl('div', 'rf-stack-q', o.last));
      var qName = STACK_NAMES[shapes.length] || ((shapes.length + 1) + '째');
      qUnit.appendChild(makeEl('span', 'rf-stack-name', qName));
      wrap.appendChild(qUnit);
    }

    return wrap;
  }

  // 3관·4관: 덧셈표·곱셈표 (4×4 + 머리 줄)
  function numTable(opts) {
    var o = opts || {};
    var op = o.op === '×' || o.op === '*' ? '×' : '+';
    var rows = Array.isArray(o.rows) ? o.rows : [];
    var cols = Array.isArray(o.cols) ? o.cols : [];
    var starKey = Array.isArray(o.star) && o.star.length >= 2
      ? pairKey(Math.floor(Number(o.star[0])), Math.floor(Number(o.star[1])))
      : '';
    var blankMap = buildCoordMap(o.blanks);
    var markMap = buildCoordMap(o.marks);
    var firstMarkKey = Array.isArray(o.marks) && o.marks.length > 0 && Array.isArray(o.marks[0]) && o.marks[0].length >= 2
      ? pairKey(Math.floor(Number(o.marks[0][0])), Math.floor(Number(o.marks[0][1])))
      : '';
    var arrowText = o.arrow ? String(o.arrow) : '';

    var tbl = makeEl('table', 'rf-table');
    var thead = makeEl('thead');
    var trHead = makeEl('tr');

    var thCorner = makeEl('th', 'rf-th', op);
    thCorner.setAttribute('scope', 'col');
    trHead.appendChild(thCorner);

    for (var c = 0; c < cols.length; c += 1) {
      var thCol = makeEl('th', 'rf-th', cols[c]);
      thCol.setAttribute('scope', 'col');
      trHead.appendChild(thCol);
    }
    thead.appendChild(trHead);
    tbl.appendChild(thead);

    var tbody = makeEl('tbody');
    for (var r = 0; r < rows.length; r += 1) {
      var tr = makeEl('tr');
      var thRow = makeEl('th', 'rf-th', rows[r]);
      thRow.setAttribute('scope', 'row');
      tr.appendChild(thRow);

      var rv = Number(rows[r]) || 0;
      for (var j = 0; j < cols.length; j += 1) {
        var key = pairKey(r, j);
        var isStar = key === starKey;
        var isBlank = Boolean(blankMap[key]);
        var isMark = Boolean(markMap[key]);
        var cls = 'rf-td';
        if (isMark) cls += ' is-mark';
        if (isStar) cls += ' rf-star';
        else if (isBlank) cls += ' rf-blank';

        var cv = Number(cols[j]) || 0;
        var val = op === '×' ? rv * cv : rv + cv;
        var text = isStar ? '★' : (isBlank ? '□' : String(val));
        var td = makeEl('td', cls, text);

        if (arrowText && key === firstMarkKey) {
          var dirEl = makeEl('span', 'rf-dir', arrowText);
          dirEl.setAttribute('aria-hidden', 'true');
          td.appendChild(dirEl);
        }
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    tbl.appendChild(tbody);

    return tbl;
  }

  // 5관: 자리 번호 표 (줄 이름 × 한 줄 자리 수)
  function seats(opts) {
    var o = opts || {};
    var rowNames = Array.isArray(o.rowNames) ? o.rowNames : [];
    var perRow = clamp(o.perRow === undefined ? 5 : o.perRow, 1, 10);
    var blankCoord = Array.isArray(o.blank) && o.blank.length >= 2
      ? pairKey(Math.floor(Number(o.blank[0])), Math.floor(Number(o.blank[1])))
      : (o.blank && typeof o.blank === 'object' ? pairKey(Math.floor(Number(o.blank.r)), Math.floor(Number(o.blank.c))) : '');
    var blankNum = typeof o.blank === 'number' ? Math.floor(o.blank) : -1;

    var markCoord = {};
    var markNum = {};
    if (Array.isArray(o.marks)) {
      for (var m = 0; m < o.marks.length; m += 1) {
        var entry = o.marks[m];
        if (Array.isArray(entry) && entry.length >= 2) {
          markCoord[pairKey(Math.floor(Number(entry[0])), Math.floor(Number(entry[1])))] = true;
        } else if (typeof entry === 'number') {
          markNum[Math.floor(entry)] = true;
        }
      }
    }

    var tbl = makeEl('table', 'rf-seats');
    var tbody = makeEl('tbody');

    for (var r = 0; r < rowNames.length; r += 1) {
      var tr = makeEl('tr');
      var th = makeEl('th', 'rf-th', rowNames[r]);
      th.setAttribute('scope', 'row');
      tr.appendChild(th);

      for (var c = 0; c < perRow; c += 1) {
        var num = r * perRow + c + 1;
        var key = pairKey(r, c);
        var isBlank = (blankCoord && key === blankCoord) || (blankNum > 0 && num === blankNum);
        var isMark = Boolean(markCoord[key] || markNum[num]);
        var cls = 'rf-td';
        if (isMark) cls += ' is-mark';
        if (isBlank) cls += ' rf-blank';
        tr.appendChild(makeEl('td', cls, isBlank ? '□' : String(num)));
      }
      tbody.appendChild(tr);
    }

    tbl.appendChild(tbody);
    return tbl;
  }

  // 6관: 무늬 타일 퍼즐 판 + 팔레트 3개
  function tileBoard(opts) {
    var o = opts || {};
    var rows = clamp(o.rows === undefined ? 4 : o.rows, 1, 8);
    var cols = clamp(o.cols === undefined ? 5 : o.cols, 1, 8);
    var total = rows * cols;
    var rawCells = Array.isArray(o.cells) ? o.cells : [];
    var flatCells = [];

    if (rawCells.length > 0 && Array.isArray(rawCells[0])) {
      for (var rr = 0; rr < rawCells.length; rr += 1) {
        for (var cc = 0; cc < rawCells[rr].length; cc += 1) {
          flatCells.push(rawCells[rr][cc]);
        }
      }
    } else {
      flatCells = rawCells.slice();
    }

    var blankList = [];
    var blankState = {};
    if (Array.isArray(o.blanks)) {
      for (var b = 0; b < o.blanks.length; b += 1) {
        var bi = Math.floor(Number(o.blanks[b]));
        if (!isNaN(bi) && bi >= 0 && bi < total && !blankState[bi]) {
          blankList.push(bi);
          blankState[bi] = 'empty';
        }
      }
    }

    var palette = Array.isArray(o.palette) ? o.palette : [];
    var onPick = typeof o.onPick === 'function' ? o.onPick : null;
    var locked = false;
    var current = blankList.length > 0 ? blankList[0] : -1;
    var tileEls = [];
    var palBtns = [];

    var wrap = makeEl('div', 'rf-puzzle');
    var board = makeEl('div', 'rf-board');
    board.style.gridTemplateColumns = 'repeat(' + cols + ', minmax(0, 1fr))';

    function syncCurrent() {
      for (var k = 0; k < blankList.length; k += 1) {
        var idx = blankList[k];
        var el = tileEls[idx];
        if (!el) continue;
        var isCur = idx === current && blankState[idx] === 'empty';
        el.classList.toggle('is-current', isCur);
      }
    }

    function select(i) {
      if (locked) return false;
      var idx = Math.floor(Number(i));
      if (blankState[idx] !== 'empty') return false;
      current = idx;
      syncCurrent();
      return true;
    }

    function fill(i, tileOverride) {
      var idx = (i === undefined || i === null) ? current : Math.floor(Number(i));
      if (blankState[idx] !== 'empty') return false;
      blankState[idx] = 'filled';

      var node = tileEls[idx];
      if (node) {
        var val = tileOverride !== undefined ? tileOverride : flatCells[idx];
        node.textContent = val !== undefined && val !== null ? String(val) : '';
        node.classList.remove('is-empty', 'is-current');
        node.classList.add('is-filled');
        node.disabled = true;
      }

      var next = -1;
      for (var k = 0; k < blankList.length; k += 1) {
        if (blankState[blankList[k]] === 'empty') {
          next = blankList[k];
          break;
        }
      }
      current = next;
      syncCurrent();
      return true;
    }

    function lock(bool) {
      locked = bool === undefined ? true : Boolean(bool);
      wrap.classList.toggle('is-locked', locked);
      for (var k = 0; k < blankList.length; k += 1) {
        var idx = blankList[k];
        if (tileEls[idx]) {
          tileEls[idx].disabled = locked || blankState[idx] !== 'empty';
        }
      }
      for (var p = 0; p < palBtns.length; p += 1) {
        palBtns[p].disabled = locked;
      }
    }

    function bindBlank(btn, idx) {
      btn.addEventListener('click', function () {
        if (locked) return;
        if (blankState[idx] !== 'empty') return;
        select(idx);
      });
    }

    function bindPalette(btn, tile) {
      btn.addEventListener('click', function () {
        if (locked) return;
        if (current < 0 || blankState[current] !== 'empty') return;
        if (onPick) onPick(current, tile);
      });
    }

    for (var idx = 0; idx < total; idx += 1) {
      var rPos = Math.floor(idx / cols) + 1;
      var cPos = (idx % cols) + 1;
      var tileEl;
      if (blankState[idx] === 'empty') {
        tileEl = makeEl('button', 'rf-tile is-empty', '');
        tileEl.type = 'button';
        tileEl.setAttribute('aria-label', rPos + '줄 ' + cPos + '칸 빈칸');
        bindBlank(tileEl, idx);
      } else {
        var cellVal = flatCells[idx] !== undefined && flatCells[idx] !== null ? flatCells[idx] : '';
        tileEl = makeEl('div', 'rf-tile', cellVal);
      }
      tileEls[idx] = tileEl;
      board.appendChild(tileEl);
    }

    var palEl = makeEl('div', 'rf-palette');
    for (var p = 0; p < palette.length; p += 1) {
      var tile = palette[p];
      var pBtn = makeEl('button', 'rf-pal-btn', tile);
      pBtn.type = 'button';
      pBtn.setAttribute('aria-label', String(tile) + ' 타일 놓기');
      bindPalette(pBtn, tile);
      palBtns.push(pBtn);
      palEl.appendChild(pBtn);
    }

    wrap.appendChild(board);
    wrap.appendChild(palEl);
    syncCurrent();

    return {
      el: wrap,
      select: select,
      fill: fill,
      lock: lock
    };
  }

  global.RuleDraw = {
    row: row,
    stackSeries: stackSeries,
    numTable: numTable,
    seats: seats,
    tileBoard: tileBoard
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = global.RuleDraw;
})(typeof window !== 'undefined' ? window : globalThis);
