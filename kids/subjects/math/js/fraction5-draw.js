// 초등 5-1 분수 탐험관 공용 그리기·조작 도우미 (약분과 통분 · 분수의 덧셈과 뺄셈 공용)
(function (global) {
  'use strict';

  var ANIM_MS = 400;
  var PRIMES = [2, 3, 5, 7];

  function makeEl(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function clearNode(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function reducedMotion() {
    return Boolean(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function fillNode(node, text, fillFn) {
    if (typeof fillFn === 'function') {
      fillFn(node, text);
    } else {
      node.textContent = text === undefined || text === null ? '' : String(text);
    }
    return node;
  }

  function praise() {
    if (typeof global.fairyPraise === 'function') {
      try { global.fairyPraise(); } catch (e) {}
    }
  }

  function encourage() {
    if (typeof global.fairyEncourage === 'function') {
      try { global.fairyEncourage(); } catch (e) {}
    }
  }

  function josa(word, type) {
    if (global.MathExplorer && typeof global.MathExplorer.josa === 'function') {
      return global.MathExplorer.josa(word, type);
    }
    var s = String(word);
    if (type === 'ro') return s + (s === '3' || s === '6' ? '으로' : '로');
    if (type === 'eun') return s + (/[013678]$/.test(s) ? '은' : '는');
    return s;
  }

  function tokenOf(f) {
    if (global.FractionCore && typeof global.FractionCore.token === 'function') {
      return global.FractionCore.token(f);
    }
    if (f.w > 0 && f.n === 0) return String(f.w);
    return f.w > 0 ? (f.w + '와 ' + f.n + '/' + f.d) : (f.n + '/' + f.d);
  }

  // 나눠지고 합쳐지는 분수 막대 (칸 수 ≤ 24, 0.4초 장면 뒤 done 호출)
  function splitBar(d, n, cls) {
    var curD = d;
    var curN = n < 0 ? 0 : (n > d ? d : n);
    var colorCls = cls || 'blue';
    var wrap = makeEl('div', 'f5-bar');
    var busy = false;

    function renderCells() {
      var i, cell;
      clearNode(wrap);
      wrap.classList.toggle('is-dense', curD >= 16);
      for (i = 0; i < curD; i += 1) {
        cell = makeEl('div', i < curN ? ('f5-cell on ' + colorCls) : 'f5-cell');
        wrap.appendChild(cell);
      }
    }

    function finish(done) {
      busy = false;
      if (typeof done === 'function') done();
    }

    function resplit(k, done) {
      if (busy || !k || k <= 1 || curD * k > 24) {
        if (typeof done === 'function') done();
        return;
      }
      if (reducedMotion()) {
        curD = curD * k;
        curN = curN * k;
        renderCells();
        if (typeof done === 'function') done();
        return;
      }
      busy = true;
      var cells = wrap.children;
      var i, j;
      for (i = 0; i < cells.length; i += 1) {
        clearNode(cells[i]);
        for (j = 0; j < k; j += 1) {
          cells[i].appendChild(makeEl('span', 'f5-sub'));
        }
      }
      wrap.classList.add('is-splitting');
      global.setTimeout(function () {
        wrap.classList.remove('is-splitting');
        curD = curD * k;
        curN = curN * k;
        renderCells();
        finish(done);
      }, ANIM_MS);
    }

    function merge(k, done) {
      if (busy || !k || k <= 1 || curD % k !== 0 || curN % k !== 0) {
        if (typeof done === 'function') done();
        return;
      }
      if (reducedMotion()) {
        curD = curD / k;
        curN = curN / k;
        renderCells();
        if (typeof done === 'function') done();
        return;
      }
      busy = true;
      wrap.classList.add('is-merging');
      global.setTimeout(function () {
        wrap.classList.remove('is-merging');
        curD = curD / k;
        curN = curN / k;
        renderCells();
        finish(done);
      }, ANIM_MS);
    }

    renderCells();
    return {
      el: wrap,
      resplit: resplit,
      merge: merge,
      get: function () { return { d: curD, n: curN }; }
    };
  }

  // 두 막대 위아래 맞대기 (왼쪽 끝 맞춤, 같은 길이)
  function pairBars(a, b) {
    var wrap = makeEl('div', 'f5-pair');
    var top = splitBar(a.d, a.n, 'blue');
    var bottom = splitBar(b.d, b.n, 'green');
    wrap.appendChild(top.el);
    wrap.appendChild(bottom.el);

    function resplitTo(targetD, done) {
      var left = 2;
      var ka = targetD / top.get().d;
      var kb = targetD / bottom.get().d;
      function onOne() {
        left -= 1;
        if (left === 0 && typeof done === 'function') done();
      }
      top.resplit(ka, onOne);
      bottom.resplit(kb, onOne);
    }

    return {
      el: wrap,
      top: top,
      bottom: bottom,
      resplitTo: resplitTo
    };
  }

  // 대분수 자연수 배지 (분수의 덧셈과 뺄셈 화면에서 사용)
  function wholeBadge(w) {
    return makeEl('span', 'f5-badge', '자연수 ' + w);
  }

  // 나누기 버튼 줄: [÷2] [÷3] [÷5] [÷7]
  function divideRow(f, onChange, onDone, opts) {
    var FRC = global.FracReduceCore;
    var fillFn = opts && opts.fill;
    var cur = { w: f.w || 0, n: f.n, d: f.d };
    var trail = [tokenOf(cur)];
    var finished = false;
    var buttons = [];

    var wrap = makeEl('div', 'f5-divide-wrap');
    var head = makeEl('div', 'f5-divide-head');
    var row = makeEl('div', 'f5-divide');
    var note = makeEl('p', 'f5-note');
    wrap.appendChild(head);
    wrap.appendChild(row);
    wrap.appendChild(note);

    function updateHead() {
      fillNode(head, trail.join(' → '), fillFn);
    }

    function setAllDisabled(flag) {
      var i;
      for (i = 0; i < buttons.length; i += 1) {
        buttons[i].disabled = flag;
        if (!flag) buttons[i].classList.remove('is-off');
      }
    }

    function canDivideMore(fracObj) {
      var i, p;
      for (i = 0; i < PRIMES.length; i += 1) {
        p = PRIMES[i];
        if (fracObj.n % p === 0 && fracObj.d % p === 0) return true;
      }
      return false;
    }

    function lockDone() {
      finished = true;
      setAllDisabled(true);
      note.classList.add('is-done');
      fillNode(note, '✨ 더 나눌 수 없어요 = 기약분수 ' + tokenOf(cur), fillFn);
      if (typeof onDone === 'function') onDone(cur);
    }

    function makeDivBtn(k) {
      var btn = makeEl('button', 'mx-btn f5-div-btn', '÷' + k);
      btn.type = 'button';
      btn.addEventListener('click', function () {
        if (finished || btn.disabled) return;
        if (cur.n % k === 0 && cur.d % k === 0) {
          var prev = cur;
          cur = FRC ? FRC.reduceBy(cur, k) : { w: cur.w, n: cur.n / k, d: cur.d / k };
          trail.push(tokenOf(cur));
          updateHead();
          setAllDisabled(false);
          praise();
          if (typeof onChange === 'function') onChange(cur, k, prev);
          if ((FRC && FRC.isSimplest(cur)) || !canDivideMore(cur)) {
            lockDone();
          } else {
            fillNode(note, tokenOf(prev) + ' → ' + tokenOf(cur) + ' · 더 나눌 수 있어요!', fillFn);
          }
          return;
        }
        btn.disabled = true;
        btn.classList.add('is-off');
        encourage();
        var badNum = (cur.n % k !== 0) ? cur.n : cur.d;
        fillNode(note, josa(badNum, 'eun') + ' ' + josa(k, 'ro') + ' 나누어떨어지지 않아요.', fillFn);
      });
      return btn;
    }

    var idx;
    for (idx = 0; idx < PRIMES.length; idx += 1) {
      var b = makeDivBtn(PRIMES[idx]);
      buttons.push(b);
      row.appendChild(b);
    }

    updateHead();
    if ((FRC && FRC.isSimplest(cur)) || !canDivideMore(cur)) {
      lockDone();
    } else {
      fillNode(note, '분자와 분모를 둘 다 나눌 수 있는 수를 눌러요.', fillFn);
    }
    return wrap;
  }

  // 배수 칩 줄: 큰 분모의 배수를 하나씩 눌러 공통분모 찾기
  function multipleChips(big, small, onDone, opts) {
    var FRC = global.FracReduceCore;
    var fillFn = opts && opts.fill;
    var hi = big >= small ? big : small;
    var lo = big >= small ? small : big;
    var cd = FRC ? FRC.commonDenominator(hi, lo) : { d: hi, chips: [hi] };
    var list = cd.chips;
    var activeIdx = 0;
    var locked = false;
    var chipBtns = [];

    var wrap = makeEl('div', 'f5-chips-wrap');
    var row = makeEl('div', 'f5-chips');
    var note = makeEl('p', 'f5-note');
    wrap.appendChild(row);
    wrap.appendChild(note);

    fillNode(note, hi + '의 배수를 차례로 눌러 ' + josa(lo, 'ro') + ' 나누어떨어지는 수를 찾아요.', fillFn);

    function syncActive() {
      var i;
      for (i = 0; i < chipBtns.length; i += 1) {
        if (locked) {
          chipBtns[i].disabled = true;
          chipBtns[i].classList.remove('is-next');
        } else {
          chipBtns[i].disabled = (i !== activeIdx);
          chipBtns[i].classList.toggle('is-next', i === activeIdx);
        }
      }
    }

    function makeChip(val, idx) {
      var btn = makeEl('button', 'mx-btn f5-chip-btn', String(val));
      btn.type = 'button';
      btn.addEventListener('click', function () {
        if (locked || idx !== activeIdx) return;
        if (val % lo === 0) {
          locked = true;
          btn.classList.add('is-hit');
          syncActive();
          praise();
          note.classList.add('is-done');
          fillNode(note, val + ' ÷ ' + lo + ' = ' + (val / lo) + ' ✓ 공통분모 ' + val, fillFn);
          if (typeof onDone === 'function') onDone(val);
        } else {
          btn.classList.add('is-miss');
          fillNode(note, val + ' ÷ ' + lo + ' → 나누어떨어지지 않아요', fillFn);
          activeIdx += 1;
          syncActive();
        }
      });
      return btn;
    }

    var i;
    for (i = 0; i < list.length; i += 1) {
      var cb = makeChip(list[i], i);
      chipBtns.push(cb);
      row.appendChild(cb);
    }
    syncActive();
    return wrap;
  }

  // 소수 두 자리/한 자리 칸과 0~1 눈금 막대(10등분)
  function buildDecimalBoxes(info) {
    var box = makeEl('span', 'f5-dec-boxes');
    var wStr = String(info.scaled.w);
    box.appendChild(makeEl('span', 'f5-dec-cell', wStr));
    box.appendChild(makeEl('span', 'f5-dec-dot', '.'));
    if (info.scaled.d === 10) {
      box.appendChild(makeEl('span', 'f5-dec-cell', String(info.scaled.n)));
    } else {
      var tens = Math.floor(info.scaled.n / 10);
      var ones = info.scaled.n % 10;
      box.appendChild(makeEl('span', tens === 0 ? 'f5-dec-cell is-zero' : 'f5-dec-cell', String(tens)));
      box.appendChild(makeEl('span', 'f5-dec-cell', String(ones)));
    }
    return box;
  }

  function buildRuler(info) {
    var wrap = makeEl('div', 'f5-ruler');
    var track = makeEl('div', 'f5-ruler-track');
    var i, tick;
    for (i = 0; i <= 10; i += 1) {
      tick = makeEl('span', i === 0 || i === 5 || i === 10 ? 'f5-ruler-tick is-major' : 'f5-ruler-tick');
      tick.style.left = (i * 10) + '%';
      track.appendChild(tick);
    }
    var pct = (info.scaled.n / info.scaled.d) * 100;
    var dot = makeEl('span', 'f5-ruler-dot');
    dot.style.left = pct + '%';
    track.appendChild(dot);

    var labels = makeEl('div', 'f5-ruler-labels');
    var baseW = info.scaled.w;
    labels.appendChild(makeEl('span', '', String(baseW)));
    labels.appendChild(makeEl('span', '', baseW + '.5'));
    labels.appendChild(makeEl('span', '', String(baseW + 1)));

    wrap.appendChild(track);
    wrap.appendChild(labels);
    return wrap;
  }

  // 소수 띠: [×k 하기] → 분모 10/100 분수 → [소수로 쓰기] → 소수 칸 + 10등분 눈금 점
  function decimalStrip(f, onDone, opts) {
    var FRC = global.FracReduceCore;
    var fillFn = opts && opts.fill;
    var info = FRC.toDecimal(f);
    var wrap = makeEl('div', 'f5-strip');
    var flow = makeEl('div', 'f5-strip-flow');
    wrap.appendChild(flow);

    var startEl = makeEl('span', 'f5-strip-item');
    fillNode(startEl, tokenOf(f), fillFn);
    flow.appendChild(startEl);

    var mulBtn = makeEl('button', 'mx-btn primary f5-action-btn', '×' + info.k + ' 하기');
    mulBtn.type = 'button';
    flow.appendChild(mulBtn);

    mulBtn.addEventListener('click', function () {
      if (mulBtn.disabled) return;
      mulBtn.disabled = true;
      praise();
      flow.appendChild(makeEl('span', 'f5-strip-arrow', '→'));
      var scaledEl = makeEl('span', 'f5-strip-item');
      fillNode(scaledEl, tokenOf(info.scaled), fillFn);
      flow.appendChild(scaledEl);
      // opts.stopAtScaled: 소수로 바꾸는 문제는 분모 10·100 분수까지만 보여 주고 고르기로 넘긴다(답 미리 보이지 않게)
      if (opts && opts.stopAtScaled) {
        if (typeof onDone === 'function') onDone(info);
        return;
      }

      var decBtn = makeEl('button', 'mx-btn primary f5-action-btn', '소수로 쓰기');
      decBtn.type = 'button';
      flow.appendChild(decBtn);

      decBtn.addEventListener('click', function () {
        if (decBtn.disabled) return;
        decBtn.disabled = true;
        praise();
        flow.appendChild(makeEl('span', 'f5-strip-arrow', '→'));
        flow.appendChild(buildDecimalBoxes(info));
        wrap.appendChild(buildRuler(info));
        if (typeof onDone === 'function') onDone(info);
      });
    });

    return wrap;
  }

  global.Frac5Draw = {
    splitBar: splitBar,
    pairBars: pairBars,
    wholeBadge: wholeBadge,
    divideRow: divideRow,
    multipleChips: multipleChips,
    decimalStrip: decimalStrip
  };
})(typeof window !== 'undefined' ? window : globalThis);
