// kids/js/english_qwerty.js
// ⌨️ 폰용 영문 자판 + 글자 칸 입력기 (window.EnglishQwerty) — 클래스카드 연습 2단계 타이핑 문항에서 쓴다 (2026-11-23)
// - 실제 폰 영문 자판처럼 10-9-7 배열, 소문자 고정(대소문자 구분 없이 채점, 칸에는 원래 글자를 보임).
// - <input>을 쓰지 않는다: 폰 OS 키보드·자동완성이 정답을 보여 주지 않게. PC 물리 키보드(keydown)도 같은 처리로 받는다.
// - 에러리스: 틀린 키는 칸에 들어가지 않고 지금 칸만 흔들린다(빨간 X·감점 없음).
// - 위치 안내 guide: 'always'(다음 키 항상 표시) · 'stuck'(틀리거나 idleMs 동안 멈추면 반짝) · 'off'. 힌트 키는 늘 동작.
// - 자동 건너뜀 규칙은 맨 위 AUTO_SKIP_REGEX 한 줄 ({…}·/·~·.·?). 그 밖의 알파벳·공백·' 아닌 글자도 건너뛴다.
// - 계약: mount(host, { answer, guide, idleMs, onComplete, onWrong(key, expectKey), onHint }) → { input, hint, isDone, destroy }.
//   불러올 때 document를 건드리지 않는다(노드 시험이 buildSlots·keyOf를 바로 시험). 초안: hydrogen, 검수·조립: Claude.
(function () {
  'use strict';

  // 자동으로 건너뛸 글자 규칙 (이 한 줄만 고치면 규칙이 바뀜)
  var AUTO_SKIP_REGEX = /\{[^}]*\}|[\/~.?]/g;

  var ROWS = [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm']
  ];

  // 정답 문자열을 글자 칸 배열로 변환
  function buildSlots(answer) {
    var str = answer == null ? '' : String(answer);
    var len = str.length;
    var skipMask = new Array(len);
    var rx = new RegExp(AUTO_SKIP_REGEX.source, AUTO_SKIP_REGEX.flags);
    var m, i, j;

    while ((m = rx.exec(str)) !== null) {
      if (m[0].length === 0) {
        rx.lastIndex += 1;
        continue;
      }
      for (i = m.index; i < m.index + m[0].length; i++) {
        skipMask[i] = true;
      }
    }

    var slots = [];
    for (i = 0; i < len; i++) {
      var ch = str.charAt(i);
      if (skipMask[i]) {
        slots.push({ ch: ch, kind: 'skip', expect: null });
      } else if (ch === ' ') {
        slots.push({ ch: ch, kind: 'space', expect: ' ' });
      } else if ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === "'") {
        slots.push({ ch: ch, kind: 'key', expect: ch.toLowerCase() });
      } else {
        slots.push({ ch: ch, kind: 'skip', expect: null });
      }
    }

    // skip 덩어리 양옆이 모두 space이면 뒤쪽 space를 skip으로 변경
    i = 0;
    while (i < slots.length) {
      if (slots[i].kind === 'skip') {
        j = i;
        while (j < slots.length && slots[j].kind === 'skip') j++;
        if (i > 0 && j < slots.length && slots[i - 1].kind === 'space' && slots[j].kind === 'space') {
          slots[j].kind = 'skip';
          slots[j].expect = null;
        }
        i = j;
      } else {
        i++;
      }
    }

    // 뒤에 입력 칸이 없는 끝쪽 space는 skip으로 변경
    for (i = slots.length - 1; i >= 0; i--) {
      if (slots[i].kind === 'key') break;
      if (slots[i].kind === 'space') {
        slots[i].kind = 'skip';
        slots[i].expect = null;
      }
    }
    // 첫 글자 앞 space도 skip ("~ apple"처럼 기호로 시작하면 Space부터 치지 않게)
    for (i = 0; i < slots.length; i++) {
      if (slots[i].kind === 'key') break;
      if (slots[i].kind === 'space') {
        slots[i].kind = 'skip';
        slots[i].expect = null;
      }
    }

    return slots;
  }

  // 칸에 대응하는 자판 키 이름 반환
  function keyOf(slot) {
    if (!slot || slot.kind === 'skip') return null;
    if (slot.kind === 'space') return 'space';
    if (slot.kind === 'key') return slot.expect;
    return null;
  }

  function makeBtn(key, label, extraClass) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = extraClass ? 'qw-key ' + extraClass : 'qw-key';
    btn.setAttribute('data-key', key);
    btn.textContent = label;
    return btn;
  }

  // host 안에 글자 칸과 영문 자판을 그리고 제어기 반환
  function mount(host, opts) {
    opts = opts || {};
    var guide = opts.guide || 'off';
    var idleMs = typeof opts.idleMs === 'number' ? opts.idleMs : 3000;
    var slots = buildSlots(opts.answer);

    host.textContent = '';

    var root = document.createElement('div');
    root.className = 'qw-root';

    var slotsEl = document.createElement('div');
    slotsEl.className = 'qw-slots';

    var slotEls = new Array(slots.length);
    var wordEl = null;
    var i;

    for (i = 0; i < slots.length; i++) {
      var s = slots[i];
      var span = document.createElement('span');
      if (s.kind === 'space') {
        span.className = 'qw-slot space';
      } else if (s.kind === 'skip') {
        span.className = 'qw-slot skip';
        span.textContent = s.ch;
      } else {
        span.className = 'qw-slot';
      }
      slotEls[i] = span;

      // 공백 자리에서만 줄바꿈되도록 낱말 단위로 묶음
      if (s.kind === 'space' || s.ch === ' ') {
        wordEl = null;
        slotsEl.appendChild(span);
      } else {
        if (!wordEl) {
          wordEl = document.createElement('span');
          wordEl.className = 'qw-word';
          slotsEl.appendChild(wordEl);
        }
        wordEl.appendChild(span);
      }
    }

    var kbEl = document.createElement('div');
    kbEl.className = 'qw-kb';
    var keyBtns = Object.create(null);

    function registerBtn(key, label, extraClass, parent) {
      var b = makeBtn(key, label, extraClass);
      keyBtns[key] = b;
      parent.appendChild(b);
    }

    for (var r = 0; r < ROWS.length; r++) {
      var rowEl = document.createElement('div');
      rowEl.className = r === 1 ? 'qw-row r2' : 'qw-row';
      for (var c = 0; c < ROWS[r].length; c++) {
        var ch = ROWS[r][c];
        registerBtn(ch, ch, '', rowEl);
      }
      if (r === 2) registerBtn('back', '⌫', 'wide', rowEl);
      kbEl.appendChild(rowEl);
    }

    var row4 = document.createElement('div');
    row4.className = 'qw-row';
    registerBtn("'", "'", '', row4);
    registerBtn('space', 'Space', 'space', row4);
    registerBtn('hint', '💡 힌트', 'hint', row4);
    kbEl.appendChild(row4);

    root.appendChild(slotsEl);
    root.appendChild(kbEl);
    host.appendChild(root);

    function nextInput(from) {
      for (var idx = from; idx < slots.length; idx++) {
        if (slots[idx].kind !== 'skip') return idx;
      }
      return slots.length;
    }

    function prevFilled(before) {
      for (var idx = before - 1; idx >= 0; idx--) {
        if (slots[idx].kind !== 'skip') return idx;
      }
      return -1;
    }

    var cursor = nextInput(0);
    var done = cursor >= slots.length;
    var completedFired = false;
    var destroyed = false;
    var idleTimer = null;
    var blinkTimer = null;
    var guideKey = null;
    var blinkedKey = null;

    function clearIdleTimer() {
      if (idleTimer !== null) {
        clearTimeout(idleTimer);
        idleTimer = null;
      }
    }

    function clearBlink() {
      if (blinkTimer !== null) {
        clearTimeout(blinkTimer);
        blinkTimer = null;
      }
      if (blinkedKey && keyBtns[blinkedKey]) {
        keyBtns[blinkedKey].classList.remove('blink');
      }
      blinkedKey = null;
    }

    function blinkKey(key, durationMs) {
      clearBlink();
      if (!key || !keyBtns[key]) return;
      blinkedKey = key;
      keyBtns[key].classList.add('blink');
      if (durationMs > 0) {
        blinkTimer = setTimeout(function () {
          blinkTimer = null;
          clearBlink();
        }, durationMs);
      }
    }

    function updateGuide(expectKey) {
      if (guideKey && keyBtns[guideKey]) {
        keyBtns[guideKey].classList.remove('guide');
      }
      guideKey = null;
      if (guide === 'always' && expectKey && keyBtns[expectKey]) {
        guideKey = expectKey;
        keyBtns[expectKey].classList.add('guide');
      }
    }

    function resetIdleTimer() {
      clearIdleTimer();
      if (guide !== 'stuck' || done || destroyed) return;
      idleTimer = setTimeout(function () {
        idleTimer = null;
        if (!done && !destroyed) {
          blinkKey(keyOf(slots[cursor]), 0);
        }
      }, idleMs);
    }

    function flashPress(key) {
      var btn = keyBtns[key];
      if (!btn) return;
      btn.classList.add('press');
      setTimeout(function () {
        btn.classList.remove('press');
      }, 120);
    }

    function syncCursor(prevIdx) {
      if (prevIdx >= 0 && prevIdx < slotEls.length) {
        slotEls[prevIdx].classList.remove('cur');
      }
      if (cursor < slotEls.length) {
        slotEls[cursor].classList.add('cur');
      }
    }

    if (done) {
      // 칠 칸이 하나도 없는 문제: 바로 끝난 것으로 알린다 (부르는 쪽이 controller를 받은 뒤에)
      slotsEl.classList.add('done');
      kbEl.classList.add('done');
      completedFired = true;
      if (typeof opts.onComplete === 'function') setTimeout(function () { if (!destroyed) opts.onComplete(); }, 0);
    } else {
      syncCursor(-1);
      updateGuide(keyOf(slots[cursor]));
      resetIdleTimer();
    }

    function hint() {
      if (destroyed || done) return;
      var expectKey = keyOf(slots[cursor]);
      if (expectKey) blinkKey(expectKey, 1600);
      resetIdleTimer(); // 'stuck'이면 힌트 반짝임이 꺼진 뒤에도 멈춰 있으면 다시 반짝인다
      if (typeof opts.onHint === 'function') opts.onHint();
    }

    function handle(rawKey) {
      if (destroyed || done || rawKey == null) return;
      var key = String(rawKey);
      if (key === ' ') key = 'space';
      else if (key.length === 1) key = key.toLowerCase();

      if (key === 'hint') {
        hint();
        return;
      }

      if (key === 'back') {
        var prev = prevFilled(cursor);
        if (prev < 0) return;
        var oldCursor = cursor;
        slotEls[prev].classList.remove('filled', 'shake');
        slotEls[prev].textContent = '';
        cursor = prev;
        syncCursor(oldCursor);
        clearBlink();
        updateGuide(keyOf(slots[cursor]));
        resetIdleTimer();
        return;
      }

      var curSlot = slots[cursor];
      var expectKey = keyOf(curSlot);

      if (key === expectKey) {
        var curEl = slotEls[cursor];
        curEl.classList.remove('shake');
        curEl.classList.add('filled');
        curEl.textContent = curSlot.ch;
        clearBlink();

        var prevCur = cursor;
        cursor = nextInput(cursor + 1);
        syncCursor(prevCur);

        if (cursor >= slots.length) {
          done = true;
          clearIdleTimer();
          updateGuide(null);
          slotsEl.classList.add('done');
          kbEl.classList.add('done');
          if (!completedFired && typeof opts.onComplete === 'function') {
            completedFired = true;
            opts.onComplete();
          }
        } else {
          updateGuide(keyOf(slots[cursor]));
          resetIdleTimer();
        }
      } else {
        var wrongEl = slotEls[cursor];
        wrongEl.classList.remove('shake');
        void wrongEl.offsetWidth;
        wrongEl.classList.add('shake');
        if (typeof opts.onWrong === 'function') opts.onWrong(key, expectKey);
        if (guide === 'stuck') blinkKey(expectKey, 0);
      }
    }

    function onPointerDown(e) {
      var btn = e.target && e.target.closest ? e.target.closest('.qw-key') : null;
      if (!btn || !kbEl.contains(btn)) return;
      e.preventDefault();
      var key = btn.getAttribute('data-key');
      if (!key) return;
      flashPress(key);
      handle(key);
    }

    function onKeyDown(e) {
      if (destroyed || done) return;
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      if (!host.isConnected || host.offsetParent === null) return;

      var mapped = null;
      if (e.key === 'Backspace') {
        e.preventDefault();
        mapped = 'back';
      } else if (e.key === ' ') {
        e.preventDefault();
        mapped = 'space';
      } else if (e.key === "'") {
        mapped = "'";
      } else if (typeof e.key === 'string' && /^[a-zA-Z]$/.test(e.key)) {
        mapped = e.key.toLowerCase();
      }
      if (!mapped) return;
      flashPress(mapped);
      handle(mapped);
    }

    host.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);

    return {
      input: function (key) {
        handle(key);
      },
      hint: hint,
      isDone: function () {
        return done;
      },
      destroy: function () {
        if (destroyed) return;
        destroyed = true;
        clearIdleTimer();
        clearBlink();
        host.removeEventListener('pointerdown', onPointerDown);
        document.removeEventListener('keydown', onKeyDown);
        host.textContent = '';
      }
    };
  }

  window.EnglishQwerty = {
    AUTO_SKIP_REGEX: AUTO_SKIP_REGEX,
    buildSlots: buildSlots,
    keyOf: keyOf,
    mount: mount
  };
})();
