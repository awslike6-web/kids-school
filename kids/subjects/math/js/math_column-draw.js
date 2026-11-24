// 공용 세로셈 단계별 칸판 (ColumnDraw): 자연수·소수 덧셈과 뺄셈 세로셈 공통 그리기 모듈
(function (global) {
  'use strict';

  // 숫자·소수 글자 뒤 조사(받침에 맞춤), MathExplorer.josa가 없으면 글자 그대로 반환
  function J(t, type) {
    var me = global.MathExplorer;
    return me && me.josa ? me.josa(String(t), type) : String(t);
  }

  function makeEl(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) { node.className = cls; }
    if (text !== undefined && text !== null) { node.textContent = String(text); }
    return node;
  }

  // 정수(number) 또는 소수 객체({ int, places })를 { int, places } 형태로 정규화
  function toDec(v) {
    if (typeof v === 'number') {
      return { int: v, places: 0 };
    }
    return { int: v.int, places: v.places || 0 };
  }

  // 두 수의 소수점 아래 자리 수를 큰 쪽에 맞춤 (DecimalAddCore 비의존)
  function align(a, b) {
    var da = toDec(a);
    var db = toDec(b);
    var P = Math.max(da.places, db.places);
    var padA = P - da.places;
    var padB = P - db.places;
    return {
      a: { int: da.int * Math.pow(10, padA), places: P },
      b: { int: db.int * Math.pow(10, padB), places: P },
      places: P,
      padA: padA,
      padB: padB
    };
  }

  // 세로셈 단계별 칸판 (정수 자리 연산만 사용)
  function column(ui, o) {
    var al = align(o.a, o.b);
    var places = al.places;
    var aInt = al.a.int;
    var bInt = al.b.int;
    var isAdd = o.op === '+';
    var resInt = isAdd ? aInt + bInt : aInt - bInt;
    var pow = Math.pow(10, places);
    var intCols = Math.max(
      String(Math.floor(aInt / pow)).length,
      String(Math.floor(bInt / pow)).length,
      String(Math.floor(resInt / pow)).length,
      1
    );
    var totalDigits = intCols + places;

    function digitAt(num, col) {
      return Math.floor(num / Math.pow(10, col)) % 10;
    }

    function hasOrigDigit(num, pad, col) {
      if (col < pad) { return false; }
      if (col < places) { return true; }
      if (col === places) { return true; }
      return num >= Math.pow(10, col);
    }

    var root = makeEl('div', o.big ? 'da-col mx-col-big' : 'da-col');
    var table = makeEl('div', 'da-col-grid');
    var ctrl = makeEl('div', 'da-col-ctrl');
    root.appendChild(table);
    root.appendChild(ctrl);

    var markCells = [];
    var aCells = [];
    var bCells = [];
    var ansCells = [];
    var ansPointCell = null;

    function buildRow(cls, signChar, fillFn) {
      var row = makeEl('div', 'da-col-row ' + cls);
      row.appendChild(makeEl('span', 'da-col-cell da-col-sign', signChar));
      for (var c = totalDigits - 1; c >= 0; c--) {
        if (places > 0 && c === places - 1) {
          var pt = fillFn('point', c);
          row.appendChild(pt);
        }
        row.appendChild(fillFn('digit', c));
      }
      table.appendChild(row);
    }

    buildRow('da-col-marks', '', function (kind, c) {
      var cell = makeEl('span', kind === 'point' ? 'da-col-pt' : 'da-col-mark');
      if (kind === 'digit') { markCells[c] = cell; }
      return cell;
    });
    buildRow('da-col-a', '', function (kind, c) {
      if (kind === 'point') { return makeEl('span', 'da-col-pt', '.'); }
      var isPad = c < al.padA;
      var txt = isPad ? '' : (hasOrigDigit(aInt, al.padA, c) ? String(digitAt(aInt, c)) : '');
      var cell = makeEl('span', isPad ? 'da-col-cell da-pad-wait' : 'da-col-cell', txt);
      aCells[c] = cell;
      return cell;
    });
    buildRow('da-col-b', o.op, function (kind, c) {
      if (kind === 'point') { return makeEl('span', 'da-col-pt', '.'); }
      var isPad = c < al.padB;
      var txt = isPad ? '' : (hasOrigDigit(bInt, al.padB, c) ? String(digitAt(bInt, c)) : '');
      var cell = makeEl('span', isPad ? 'da-col-cell da-pad-wait' : 'da-col-cell', txt);
      bCells[c] = cell;
      return cell;
    });
    table.appendChild(makeEl('div', 'da-col-bar'));
    buildRow('da-col-ans', '', function (kind, c) {
      var cell = makeEl('span', kind === 'point' ? 'da-col-pt' : 'da-col-cell');
      if (kind === 'point') { ansPointCell = cell; } else { ansCells[c] = cell; }
      return cell;
    });

    function setColHighlight(col, on) {
      var cells = [markCells[col], aCells[col], bCells[col], ansCells[col]];
      for (var i = 0; i < cells.length; i++) {
        if (!cells[i]) { continue; }
        cells[i].className = cells[i].className.replace(' da-col-hl', '') + (on ? ' da-col-hl' : '');
      }
    }

    function clearCtrl() {
      while (ctrl.firstChild) { ctrl.removeChild(ctrl.firstChild); }
    }

    function runStepDigits(col, carryOrBorrow) {
      if (col >= totalDigits) {
        if (o.onDone) { o.onDone(); }
        return;
      }
      clearCtrl();
      setColHighlight(col, true);

      var da = digitAt(aInt, col);
      var db = digitAt(bInt, col);
      var correct = 0;
      var nextCB = 0;
      var noCB = 0;

      if (isAdd) {
        var sum = da + db + carryOrBorrow;
        correct = sum % 10;
        nextCB = Math.floor(sum / 10);
        noCB = (da + db) % 10;
        if (noCB === correct) { noCB = (correct + 1) % 10; }
      } else {
        var top = da - carryOrBorrow;
        if (top < db) {
          correct = top + 10 - db;
          nextCB = 1;
        } else {
          correct = top - db;
          nextCB = 0;
        }
        noCB = Math.abs(da - db) % 10;
        if (noCB === correct) { noCB = (correct + 1) % 10; }
      }

      var other = (correct + 2) % 10;
      if (other === noCB || other === correct) { other = (correct + 3) % 10; }

      var choices = [String(correct), String(noCB), String(other)];
      var qOpts = {
        question: '이 자리 숫자는?',
        choices: choices,
        answer: 0,
        hint: '받아올림·받아내림을 했는지 봐요.',
        explain: '이 자리 숫자는 ' + J(correct, 'ieyo') + '.',
        onSolved: function () {
          ansCells[col].textContent = String(correct);
          setColHighlight(col, false);
          if (nextCB > 0 && col + 1 < totalDigits) {
            if (isAdd) {
              markCells[col + 1].textContent = '1';
            } else {
              var prevTop = digitAt(aInt, col + 1);
              markCells[col + 1].textContent = String(prevTop > 0 ? prevTop - 1 : 9);
            }
          }
          runStepDigits(col + 1, nextCB);
        }
      };
      if (o.onWrong) {
        qOpts.onWrong = function (picked) {
          var text = typeof picked === 'number' && choices[picked] !== undefined
            ? choices[picked]
            : String(picked);
          o.onWrong(text);
        };
      }
      ctrl.appendChild(ui.choiceQuestion(qOpts));
    }

    function runStepPoint() {
      clearCtrl();
      if (places <= 0) {
        runStepDigits(0, 0);
        return;
      }
      var btnPt = ui.button('소수점 내려 찍기', 'mx-btn primary', function () {
        if (ansPointCell) { ansPointCell.textContent = '.'; }
        runStepDigits(0, 0);
      });
      ctrl.appendChild(btnPt);
    }

    function runStepPad() {
      if (al.padA === 0 && al.padB === 0) {
        runStepPoint();
        return;
      }
      var btnPad = ui.button('0 채우기', 'mx-btn primary', function () {
        for (var i = 0; i < al.padA; i++) {
          aCells[i].textContent = '0';
          aCells[i].className = 'da-col-cell';
        }
        for (var j = 0; j < al.padB; j++) {
          bCells[j].textContent = '0';
          bCells[j].className = 'da-col-cell';
        }
        runStepPoint();
      });
      ctrl.appendChild(btnPad);
    }

    if (places <= 0) {
      runStepDigits(0, 0);
    } else {
      runStepPad();
    }
    return root;
  }

  global.ColumnDraw = {
    column: column
  };
})(typeof window !== 'undefined' ? window : globalThis);
