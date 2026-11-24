// 초1·2 수학 백·십·일 수 모형 그리기·조작 공용 모듈 (BaseTenDraw)
(function (global) {
  'use strict';

  var STYLE_ID = 'mx-baseten-style';
  var PLACE_NAME = { h: '백', t: '십', o: '일' };
  var PLACE_STEP = { h: 100, t: 10, o: 1 };
  var GLOW_MS = 300;
  var ANIM_MS = 600;
  var DONE_MS = 300;

  function clamp(n, lo, hi) {
    var v = n | 0;
    if (v < lo) return lo;
    if (v > hi) return hi;
    return v;
  }

  function toTotal(s) {
    return ((s.h | 0) * 100) + ((s.t | 0) * 10) + (s.o | 0);
  }

  // 모형 버튼 한 번 눌렀을 때 할 일 판정 (순수 함수)
  function planPress(state, place, target) {
    var name = PLACE_NAME[place] || '일';
    var tgt = target ? (target[place] | 0) : 0;
    var cur = state ? (state[place] | 0) : 0;
    if (tgt <= 0) {
      return { action: 'blocked-zero', hint: name + '의 자리는 0이라 놓지 않아요' };
    }
    if (cur >= tgt) {
      return { action: 'blocked-full', hint: name + ' 모형은 다 놓았어요' };
    }
    return { action: 'add' };
  }

  // 목표 수(h·t·o) 도달 여부 (순수 함수)
  function isReached(state, target) {
    if (!state || !target) return false;
    return (state.h | 0) === (target.h | 0) &&
      (state.t | 0) === (target.t | 0) &&
      (state.o | 0) === (target.o | 0);
  }

  // 10개 묶기 대상 자리 반환: 'ones' → 'tens' → null (순수 함수)
  function carryPlan(state) {
    if (!state) return null;
    if ((state.o | 0) >= 10) return 'ones';
    if ((state.t | 0) >= 10) return 'tens';
    return null;
  }

  function reducedMotion() {
    if (typeof global.matchMedia !== 'function') return false;
    return Boolean(global.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function makeEl(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  // 수 모형 전용 스타일을 head에 한 번만 삽입
  function ensureStyle() {
    if (typeof document === 'undefined' || !document || !document.head) return;
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = [
      '.bt-board{width:100%;max-width:340px;margin:8px auto;padding:10px;box-sizing:border-box;',
      'border-radius:14px;border:1.5px solid var(--mx-line,#fcd34d);background:var(--mx-soft,#fffbeb)}',
      '.bt-row-h{display:grid;grid-template-columns:repeat(5,48px);gap:6px;justify-content:center;',
      'min-height:48px;margin-bottom:10px}',
      '.bt-hundred{width:48px;height:48px;box-sizing:border-box;border-radius:6px;',
      'border:2px solid var(--mx-strong,#b45309);background-color:var(--mx-soft,#fffbeb);',
      'background-image:linear-gradient(to right,var(--mx-line,#fcd34d) 1px,transparent 1px),',
      'linear-gradient(to bottom,var(--mx-line,#fcd34d) 1px,transparent 1px);background-size:8px 8px;',
      'color:var(--mx-strong,#b45309);font-size:.85rem;font-weight:800;display:flex;',
      'align-items:center;justify-content:center;user-select:none}',
      '.bt-row-to{display:flex;align-items:flex-end;justify-content:center;gap:14px;min-height:76px}',
      '.bt-group-t{display:flex;flex-wrap:wrap;align-items:flex-end;gap:4px;',
      'min-width:60px;min-height:72px;max-width:160px}',
      '.bt-ten{width:12px;height:72px;box-sizing:border-box;border-radius:3px;',
      'border:1.5px solid var(--mx-strong,#b45309);background-color:var(--mx-accent,#f59e0b);',
      'background-image:repeating-linear-gradient(to bottom,transparent 0,transparent 6px,',
      'var(--mx-soft,#fffbeb) 6px,var(--mx-soft,#fffbeb) 7.2px)}',
      '.bt-group-o{display:grid;grid-template-columns:repeat(5,14px);gap:4px;',
      'align-content:end;min-width:86px;min-height:72px}',
      '.bt-one{width:14px;height:14px;box-sizing:border-box;border-radius:3px;',
      'border:1.5px solid var(--mx-strong,#b45309);background-color:var(--mx-line,#fcd34d)}',
      '.bt-one.is-gone{opacity:.35;background-image:linear-gradient(135deg,transparent 42%,',
      'var(--mx-strong,#b45309) 42%,var(--mx-strong,#b45309) 58%,transparent 58%)}',
      '.bt-hundred.is-glow,.bt-ten.is-glow,.bt-one.is-glow{',
      'box-shadow:0 0 0 3px var(--mx-accent,#f59e0b);animation:btGlow .3s ease infinite alternate}',
      '.bt-ten.is-merge,.bt-one.is-merge{animation:btMerge .6s ease forwards}',
      '.bt-one.is-split{animation:btSplit .6s ease}',
      '.bt-hundred.is-pop,.bt-ten.is-pop{animation:btPop .3s ease}',
      '.bt-controls{width:100%;max-width:340px;margin:8px auto;text-align:center}',
      '.bt-controls [hidden]{display:none}',
      '.bt-btn-row{display:flex;flex-wrap:wrap;gap:8px;justify-content:center}',
      '.bt-btn{min-height:56px;flex:1 1 90px;box-sizing:border-box;font-size:1.05rem;font-weight:800}',
      '.bt-btn.mx-glow{border-color:var(--mx-accent,#f59e0b);',
      'box-shadow:0 0 0 3px var(--mx-accent,#f59e0b);animation:btGlow .8s ease infinite alternate}',
      '@keyframes btGlow{0%{box-shadow:0 0 0 2px var(--mx-accent,#f59e0b)}',
      '100%{box-shadow:0 0 0 5px var(--mx-accent,#f59e0b)}}',
      '@keyframes btMerge{0%{opacity:1;transform:scale(1)}',
      '100%{opacity:0;transform:scale(.2) translateY(-14px)}}',
      '@keyframes btSplit{0%{opacity:0;transform:scale(.3) translateX(-18px)}',
      '100%{opacity:1;transform:scale(1) translateX(0)}}',
      '@keyframes btPop{0%{transform:scale(.7)}65%{transform:scale(1.08)}100%{transform:scale(1)}}',
      '@media (prefers-reduced-motion:reduce){',
      '.bt-hundred,.bt-ten,.bt-one,.bt-btn.mx-glow{animation:none;transition:none}}'
    ].join('');
    document.head.appendChild(s);
  }

  // 수 모형 판 생성 (h·t·o 각 0~19 지원)
  function model(init) {
    ensureStyle();
    var src = init || {};
    var state = {
      h: clamp(src.h || 0, 0, 19),
      t: clamp(src.t || 0, 0, 19),
      o: clamp(src.o || 0, 0, 19)
    };
    var erasedCount = 0;
    var isBusy = false;
    var hNodes = [];
    var tNodes = [];
    var oNodes = [];

    var board = makeEl('div', 'bt-board');
    var rowH = makeEl('div', 'bt-row-h');
    var rowTO = makeEl('div', 'bt-row-to');
    var groupT = makeEl('div', 'bt-group-t');
    var groupO = makeEl('div', 'bt-group-o');
    rowTO.appendChild(groupT);
    rowTO.appendChild(groupO);
    board.appendChild(rowH);
    board.appendChild(rowTO);

    function applyErased() {
      var start = state.o - erasedCount;
      for (var i = 0; i < oNodes.length; i += 1) {
        if (i >= start) oNodes[i].classList.add('is-gone');
        else oNodes[i].classList.remove('is-gone');
      }
    }

    function render(popPlace, splitNew) {
      var i, node;
      rowH.replaceChildren();
      groupT.replaceChildren();
      groupO.replaceChildren();
      hNodes = [];
      tNodes = [];
      oNodes = [];

      for (i = 0; i < state.h; i += 1) {
        node = makeEl('div', 'bt-hundred', '100');
        if (popPlace === 'h' && i === state.h - 1) node.classList.add('is-pop');
        hNodes.push(node);
        rowH.appendChild(node);
      }
      for (i = 0; i < state.t; i += 1) {
        node = makeEl('div', 'bt-ten');
        if (popPlace === 't' && i === state.t - 1) node.classList.add('is-pop');
        tNodes.push(node);
        groupT.appendChild(node);
      }
      for (i = 0; i < state.o; i += 1) {
        node = makeEl('div', 'bt-one');
        if (splitNew && i < 10) node.classList.add('is-split');
        oNodes.push(node);
        groupO.appendChild(node);
      }
      applyErased();
    }

    function get() {
      return { h: state.h, t: state.t, o: state.o };
    }

    function set(h, t, o) {
      if (h && typeof h === 'object') {
        state.h = clamp(h.h || 0, 0, 19);
        state.t = clamp(h.t || 0, 0, 19);
        state.o = clamp(h.o || 0, 0, 19);
      } else {
        state.h = clamp(h || 0, 0, 19);
        state.t = clamp(t || 0, 0, 19);
        state.o = clamp(o || 0, 0, 19);
      }
      erasedCount = 0;
      render(null, false);
    }

    function erase(n) {
      erasedCount = clamp(n || 0, 0, state.o);
      applyErased();
    }

    function erased() {
      return erasedCount;
    }

    function bundle(place, done) {
      var cb = typeof done === 'function' ? done : function () {};
      var isOnes = place === 'ones';
      if (isBusy) return;
      if (isOnes && state.o < 10) { cb(); return; }
      if (!isOnes && (place !== 'tens' || state.t < 10)) { cb(); return; }

      function commit(withPop) {
        if (isOnes) {
          state.o -= 10;
          state.t = clamp(state.t + 1, 0, 19);
          if (erasedCount > state.o) erasedCount = state.o;
          render(withPop ? 't' : null, false);
        } else {
          state.t -= 10;
          state.h = clamp(state.h + 1, 0, 19);
          render(withPop ? 'h' : null, false);
        }
      }

      if (reducedMotion()) {
        commit(false);
        cb();
        return;
      }

      isBusy = true;
      var list = isOnes ? oNodes : tNodes;
      var targets = list.slice(0, 10);
      var i;
      for (i = 0; i < targets.length; i += 1) targets[i].classList.add('is-glow');

      setTimeout(function () {
        for (i = 0; i < targets.length; i += 1) {
          targets[i].classList.remove('is-glow');
          targets[i].classList.add('is-merge');
        }
        setTimeout(function () {
          commit(true);
          isBusy = false;
          cb();
        }, ANIM_MS);
      }, GLOW_MS);
    }

    function unbundleTen(done) {
      var cb = typeof done === 'function' ? done : function () {};
      if (isBusy) return;
      if (state.t <= 0) { cb(); return; }

      if (reducedMotion()) {
        state.t -= 1;
        state.o = clamp(state.o + 10, 0, 19);
        render(null, false);
        cb();
        return;
      }

      isBusy = true;
      var tenNode = tNodes[tNodes.length - 1];
      if (tenNode) tenNode.classList.add('is-glow');

      setTimeout(function () {
        state.t -= 1;
        state.o = clamp(state.o + 10, 0, 19);
        render(null, true);
        setTimeout(function () {
          for (var i = 0; i < oNodes.length; i += 1) oNodes[i].classList.remove('is-split');
          isBusy = false;
          cb();
        }, ANIM_MS);
      }, GLOW_MS);
    }

    function busy() {
      return isBusy;
    }

    render(null, false);
    return {
      el: board,
      get: get,
      set: set,
      bundle: bundle,
      unbundleTen: unbundleTen,
      busy: busy,
      erase: erase,
      erased: erased
    };
  }

  // 모형 놓기 버튼 줄 (에러리스 안내 + 선택적 자동 묶기)
  function placeControls(ui, o) {
    ensureStyle();
    var opts = o || {};
    var m = opts.model;
    var target = opts.target || { h: 0, t: 0, o: 0 };
    var places = Array.isArray(opts.places) ? opts.places : ['h', 't', 'o'];
    var autoBundle = Boolean(opts.autoBundle);
    var say = typeof opts.say === 'function' ? opts.say : null;
    var onDone = typeof opts.onDone === 'function' ? opts.onDone : null;

    var wrap = ui.el('div', 'bt-controls');
    var row = ui.el('div', 'bt-btn-row');
    var hintEl = ui.el('div', 'mx-hint');
    hintEl.hidden = true;
    wrap.appendChild(row);
    wrap.appendChild(hintEl);

    var buttons = [];
    var locked = false;
    var finished = false;

    function disableAll() {
      for (var i = 0; i < buttons.length; i += 1) buttons[i].disabled = true;
    }

    function checkDone() {
      if (finished || !isReached(m.get(), target)) return;
      finished = true;
      locked = true;
      disableAll();
      ui.hint(hintEl, '');
      setTimeout(function () {
        if (onDone) onDone();
      }, DONE_MS);
    }

    function runBundles() {
      var place = carryPlan(m.get());
      if (place) {
        locked = true;
        m.bundle(place, function () {
          runBundles();
        });
        return;
      }
      locked = false;
      checkDone();
    }

    function decidePress(cur, place) {
      if (!autoBundle) return planPress(cur, place, target);
      var step = PLACE_STEP[place] || 1;
      if (toTotal(cur) + step <= toTotal(target)) return { action: 'add' };
      var p = planPress(cur, place, target);
      if (p.action !== 'add') return p;
      return { action: 'blocked-full', hint: (PLACE_NAME[place] || '일') + ' 모형은 다 놓았어요' };
    }

    function handlePress(place) {
      if (finished || locked || m.busy()) return;
      var cur = m.get();
      var res = decidePress(cur, place);
      if (res.action !== 'add') {
        ui.hint(hintEl, res.hint);
        if (say) say(res.hint);
        return;
      }
      ui.hint(hintEl, '');
      cur[place] += 1;
      m.set(cur.h, cur.t, cur.o);
      if (autoBundle) runBundles();
      else checkDone();
    }

    for (var i = 0; i < places.length; i += 1) {
      (function (pl) {
        var label = '＋ ' + (PLACE_NAME[pl] || '일');
        var btn = ui.button(label, 'mx-btn bt-btn', function () {
          handlePress(pl);
        });
        buttons.push(btn);
        row.appendChild(btn);
      })(places[i]);
    }

    return wrap;
  }

  // 받아내림용 '[－ 일]'과 '[십 모형 1개 풀기]' 버튼 줄
  function minusControls(ui, o) {
    ensureStyle();
    var opts = o || {};
    var m = opts.model;
    var remove = clamp(opts.remove || 0, 0, 19);
    var say = typeof opts.say === 'function' ? opts.say : null;
    var onDone = typeof opts.onDone === 'function' ? opts.onDone : null;

    var wrap = ui.el('div', 'bt-controls');
    var row = ui.el('div', 'bt-btn-row');
    var hintEl = ui.el('div', 'mx-hint');
    hintEl.hidden = true;
    wrap.appendChild(row);
    wrap.appendChild(hintEl);

    var locked = false;
    var finished = false;
    var minusBtn = null;
    var unbundleBtn = null;

    function syncUnbundleState() {
      if (unbundleBtn) unbundleBtn.disabled = finished || m.get().t <= 0;
    }

    minusBtn = ui.button('－ 일', 'mx-btn bt-btn', function () {
      if (finished || locked || m.busy()) return;
      var cur = m.get();
      var gone = m.erased();
      if (cur.o - gone <= 0) {
        var msg = '낱개가 모자라요. 십 모형을 풀어요';
        ui.hint(hintEl, msg);
        if (say) say(msg);
        if (unbundleBtn && !unbundleBtn.disabled) unbundleBtn.classList.add('mx-glow');
        return;
      }
      m.erase(gone + 1);
      ui.hint(hintEl, '');
      if (unbundleBtn) unbundleBtn.classList.remove('mx-glow');
      if (m.erased() >= remove) {
        finished = true;
        locked = true;
        minusBtn.disabled = true;
        unbundleBtn.disabled = true;
        setTimeout(function () {
          if (onDone) onDone();
        }, DONE_MS);
      }
    });

    unbundleBtn = ui.button('십 모형 1개 풀기', 'mx-btn bt-btn bt-unbundle', function () {
      if (finished || locked || m.busy() || m.get().t <= 0) return;
      locked = true;
      unbundleBtn.classList.remove('mx-glow');
      ui.hint(hintEl, '');
      m.unbundleTen(function () {
        locked = false;
        syncUnbundleState();
      });
    });

    row.appendChild(minusBtn);
    row.appendChild(unbundleBtn);
    syncUnbundleState();
    return wrap;
  }

  // 조작 없는 수 모형 그림(0~999)의 el만 반환
  function picture(n) {
    var v = clamp(n || 0, 0, 999);
    var h = (v - (v % 100)) / 100;
    var rem = v % 100;
    var t = (rem - (rem % 10)) / 10;
    var o = rem % 10;
    return model({ h: h, t: t, o: o }).el;
  }

  global.BaseTenDraw = {
    planPress: planPress,
    isReached: isReached,
    carryPlan: carryPlan,
    model: model,
    placeControls: placeControls,
    minusControls: minusControls,
    picture: picture
  };
})(typeof window !== 'undefined' ? window : globalThis);
