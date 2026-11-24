// 초1 버튼 촉감·합성음 피젯 도우미 (MathSquishy)
(function (global) {
  'use strict';

  var SOUNDS = [
    { id: 'keycap', label: '⌨️ 키캡 도각', locked: false },
    { id: 'slime', label: '🫧 슬라임 뽁', locked: false },
    { id: 'mallang', label: '🍡 말랑 꾹', locked: false },
    { id: 'jelly', label: '🍮 젤리 퐁', locked: true },
    { id: 'bell', label: '🔔 방울 딸랑', locked: true },
    { id: 'off', label: '🔇 소리 없음', locked: false }
  ];

  var LOCK_HINT = '빙고 한 판을 끝내면 열 수 있어요';
  // 버튼 소리를 켠 화면에서는 정답 칭찬·설명 음성을 이만큼 낮춰 버튼 소리가 묻히지 않게 한다 (2026-11-25)
  var VOICE_VOLUME_WITH_SOUND = 0.6;
  // 키캡 소리 키움 배율 (2026-11-25 사용자 요청: 음성에 묻혀 잘 안 들림)
  var KEYCAP_BOOST = 2.6;
  var STYLE_ID = 'mx-squishy-style';
  var audioCtx = null;
  var attached = false;

  function findSound(id) {
    if (typeof id !== 'string') return null;
    for (var i = 0; i < SOUNDS.length; i += 1) {
      if (SOUNDS[i].id === id) return SOUNDS[i];
    }
    return null;
  }

  // 현재 학생 키를 돌려준다
  function childKey() {
    return global.currentChild === 'minseo' ? 'minseo' : 'minsu';
  }

  function storageKey() {
    return 'math_squishy_' + childKey();
  }

  function defaultPrefs() {
    return {
      sound: childKey() === 'minseo' ? 'slime' : 'off',
      unlocked: []
    };
  }

  function savePrefs(prefs) {
    try {
      if (global.localStorage && typeof global.localStorage.setItem === 'function') {
        global.localStorage.setItem(storageKey(), JSON.stringify(prefs));
      }
    } catch (e) {
      // 저장소가 막혀 있어도 앱을 멈추지 않는다
    }
  }

  // 학생별 버튼 소리 설정을 읽는다
  function getPrefs() {
    var base = defaultPrefs();
    var raw = null;
    try {
      if (global.localStorage && typeof global.localStorage.getItem === 'function') {
        raw = global.localStorage.getItem(storageKey());
      }
    } catch (e) {
      return base;
    }
    if (!raw) return base;
    try {
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return base;
      var unlocked = [];
      if (Array.isArray(parsed.unlocked)) {
        for (var i = 0; i < parsed.unlocked.length; i += 1) {
          var uid = parsed.unlocked[i];
          if (findSound(uid) && unlocked.indexOf(uid) === -1) unlocked.push(uid);
        }
      }
      var item = findSound(parsed.sound);
      var canUse = item && (!item.locked || unlocked.indexOf(item.id) !== -1);
      return { sound: canUse ? item.id : base.sound, unlocked: unlocked };
    } catch (e) {
      return base;
    }
  }

  // 소리가 열려 있는지 확인한다
  function isUnlocked(id) {
    var item = findSound(id);
    if (!item) return false;
    if (!item.locked) return true;
    return getPrefs().unlocked.indexOf(id) !== -1;
  }

  // 열린 소리를 현재 소리로 저장한다
  function setSound(id) {
    if (!isUnlocked(id)) return false;
    var prefs = getPrefs();
    prefs.sound = id;
    savePrefs(prefs);
    syncVoiceVolume();
    return true;
  }

  // 잠긴 소리를 해금하고 저장한다
  function unlock(id) {
    var item = findSound(id);
    if (!item || !item.locked) return false;
    var prefs = getPrefs();
    if (prefs.unlocked.indexOf(id) !== -1) return false;
    prefs.unlocked.push(id);
    savePrefs(prefs);
    return true;
  }

  // Web Audio 컨텍스트를 처음 재생 시 한 번만 만든다
  function getAudioCtx() {
    if (!audioCtx) {
      var Ctor = global.AudioContext || global.webkitAudioContext;
      if (typeof Ctor !== 'function') return null;
      audioCtx = new Ctor();
    }
    if (audioCtx.state === 'suspended' && typeof audioCtx.resume === 'function') {
      var res = audioCtx.resume();
      if (res && typeof res.catch === 'function') res.catch(function () {});
    }
    return audioCtx;
  }

  function makeNoiseBuffer(ctx, duration) {
    var len = Math.max(1, Math.floor(ctx.sampleRate * duration));
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < len; i += 1) {
      data[i] = Math.random() * 2 - 1;
    }
    return buf;
  }

  // 잡음 한 토막을 대역 필터로 걸러 짧게 낸다 (키캡 스위치의 '딸깍')
  function noiseClick(ctx, now, sec, freq, q, vol) {
    var src = ctx.createBufferSource();
    src.buffer = makeNoiseBuffer(ctx, sec);
    var filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(freq, now);
    filter.Q.setValueAtTime(q, now);
    var ng = ctx.createGain();
    ng.gain.setValueAtTime(vol, now);
    ng.gain.exponentialRampToValueAtTime(0.001, now + sec);
    src.connect(filter);
    filter.connect(ng);
    ng.connect(ctx.destination);
    src.start(now);
    src.stop(now + sec + 0.002);
  }

  // 미끄러지며 낮아지는 짧은 음 (바닥에 닿는 '도각')
  function sweepTone(ctx, now, type, from, to, sec, vol) {
    var osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(from, now);
    osc.frequency.exponentialRampToValueAtTime(to, now + sec * 0.9);
    var og = ctx.createGain();
    og.gain.setValueAtTime(vol, now);
    og.gain.exponentialRampToValueAtTime(0.001, now + sec);
    osc.connect(og);
    og.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + sec + 0.003);
  }

  // 키캡 누름: 스위치 딸깍(1.9kHz) + 바닥 도각(삼각파 175→62Hz). 사용자의 스티치 「키캡 빙고」 시안 소리 (2026-11-25)
  function playKeycap(ctx, now) {
    noiseClick(ctx, now, 0.014, 1900, 1.6, 0.32 * KEYCAP_BOOST);
    sweepTone(ctx, now, 'triangle', 175, 62, 0.045, 0.26 * KEYCAP_BOOST);
  }

  // 키캡 뗌: 위로 올라오는 가벼운 '착'
  function playKeycapUp(ctx, now) {
    noiseClick(ctx, now, 0.01, 2600, 2, 0.18 * KEYCAP_BOOST);
    sweepTone(ctx, now, 'sine', 240, 135, 0.028, 0.1 * KEYCAP_BOOST);
  }

  function playSlime(ctx, now) {
    // 600Hz -> 180Hz 사인 뽁(120ms)
    var osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.12);
    var og = ctx.createGain();
    og.gain.setValueAtTime(0.01, now);
    og.gain.linearRampToValueAtTime(0.22, now + 0.015);
    og.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(og);
    og.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.125);
    // 아주 약한 물기 잡음
    var src = ctx.createBufferSource();
    src.buffer = makeNoiseBuffer(ctx, 0.06);
    var filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, now);
    var ng = ctx.createGain();
    ng.gain.setValueAtTime(0.04, now);
    ng.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    src.connect(filter);
    filter.connect(ng);
    ng.connect(ctx.destination);
    src.start(now);
    src.stop(now + 0.062);
  }

  function playMallang(ctx, now) {
    // 220Hz -> 140Hz 부드러운 삼각파 꾹(160ms)
    var osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.16);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.22, now + 0.06);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.165);
  }

  function playJelly(ctx, now) {
    // 300Hz -> 520Hz 올라가는 퐁(110ms)
    var osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.11);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.01, now);
    g.gain.linearRampToValueAtTime(0.22, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.115);
  }

  function playBell(ctx, now) {
    // 1320Hz·1980Hz 두 사인 겹침(350ms)
    var freqs = [1320, 1980];
    var gains = [0.15, 0.09];
    for (var i = 0; i < freqs.length; i += 1) {
      var osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freqs[i], now);
      var g = ctx.createGain();
      g.gain.setValueAtTime(gains[i], now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.355);
    }
  }

  // 선택한 효과음을 Web Audio로 한 번 합성한다
  function play(id) {
    if (!id || id === 'off') return;
    try {
      var ctx = getAudioCtx();
      if (!ctx) return;
      var now = ctx.currentTime;
      if (id === 'keycap') playKeycap(ctx, now);
      else if (id === 'keycap-up') playKeycapUp(ctx, now);
      else if (id === 'slime') playSlime(ctx, now);
      else if (id === 'mallang') playMallang(ctx, now);
      else if (id === 'jelly') playJelly(ctx, now);
      else if (id === 'bell') playBell(ctx, now);
    } catch (e) {
      // 오디오 오류는 학습 흐름을 막지 않는다
    }
  }

  function ensureStyle() {
    if (typeof document === 'undefined' || !document || !document.head) return;
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = [
      '.mx-btn{transition:transform .08s ease}',
      '.mx-btn.mx-squish{transform:scale(.93,.86)}',
      '.mx-btn.mx-squish-out{animation:mxSquishOut .35s ease}',
      '@keyframes mxSquishOut{0%{transform:scale(.93,.86)}55%{transform:scale(1.05,1.03)}',
      '80%{transform:scale(.98,1)}100%{transform:scale(1)}}',
      '@media (prefers-reduced-motion: reduce){',
      '.mx-btn.mx-squish,.mx-btn.mx-squish-out{transform:none;animation:none}}',
      '.mx-squishy-panel{margin-top:8px;padding:12px;border-radius:14px;',
      'background:var(--mx-soft,#fffbeb);border:1.5px solid var(--mx-line,#fcd34d)}',
      '.mx-squishy-title{margin:0 0 8px;font-weight:700;color:var(--mx-strong,#b45309)}',
      '.mx-squishy-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}',
      '.mx-squishy-pick{min-height:56px;padding:8px;border-radius:12px;',
      'border:1.5px solid var(--mx-line,#fcd34d);background:#fff}',
      '.mx-squishy-pick.is-picked{border:2.5px solid var(--mx-strong,#b45309);font-weight:700}',
      '.mx-squishy-pick.is-locked{opacity:.65}',
      '.mx-squishy-hint{margin:8px 0 0;min-height:20px;font-size:13px;',
      'color:var(--mx-strong,#b45309)}',
      '.mx-squishy-close{margin-top:8px;width:100%}'
    ].join('');
    document.head.appendChild(s);
  }

  function closestMxBtn(node) {
    var cur = node;
    while (cur && cur.nodeType === 1) {
      if (cur.tagName === 'BUTTON' && cur.classList && cur.classList.contains('mx-btn')) {
        return cur;
      }
      cur = cur.parentNode;
    }
    return null;
  }

  // 버튼 소리가 켜져 있으면 음성을 낮추고, 꺼져 있으면 원래대로 둔다
  function syncVoiceVolume() {
    if (typeof global.setFairyVoiceVolume !== 'function') return;
    try {
      global.setFairyVoiceVolume(getPrefs().sound === 'off' ? 1 : VOICE_VOLUME_WITH_SOUND);
    } catch (e) {
      // 음성 크기 조정 실패는 학습을 막지 않는다
    }
  }

  // 문서에 눌림 촉감·소리 위임 듣기를 한 번만 단다
  function attach() {
    if (attached || typeof document === 'undefined' || !document) return;
    attached = true;
    ensureStyle();
    syncVoiceVolume();
    document.addEventListener('pointerdown', function (e) {
      var btn = closestMxBtn(e.target);
      if (!btn || btn.disabled) return;
      btn.classList.remove('mx-squish-out');
      btn.classList.add('mx-squish');
      var sound = btn.classList.contains('mx-squishy-pick') ? 'off' : getPrefs().sound;
      play(sound);
      syncVoiceVolume();
      function onRelease(ev) {
        if (sound === 'keycap' && ev && ev.type === 'pointerup') play('keycap-up');
        btn.removeEventListener('pointerup', onRelease);
        btn.removeEventListener('pointercancel', onRelease);
        btn.removeEventListener('pointerleave', onRelease);
        btn.classList.remove('mx-squish');
        btn.classList.add('mx-squish-out');
        if (btn._mxSquishTimer) clearTimeout(btn._mxSquishTimer);
        btn._mxSquishTimer = setTimeout(function () {
          btn.classList.remove('mx-squish-out');
        }, 350);
      }
      btn.addEventListener('pointerup', onRelease);
      btn.addEventListener('pointercancel', onRelease);
      btn.addEventListener('pointerleave', onRelease);
    });
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function buildPanel(onClose) {
    var panel = el('div', 'mx-squishy-panel');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', '버튼 소리 고르기');
    panel.appendChild(el('div', 'mx-squishy-title', '버튼 소리 고르기'));
    var grid = el('div', 'mx-squishy-grid');
    var hint = el('p', 'mx-squishy-hint', '');
    hint.setAttribute('aria-live', 'polite');
    var current = getPrefs().sound;
    var pickBtns = [];

    function markPicked(activeId) {
      for (var j = 0; j < pickBtns.length; j += 1) {
        var isCur = pickBtns[j].id === activeId;
        pickBtns[j].node.classList.toggle('is-picked', isCur);
        pickBtns[j].node.setAttribute('aria-pressed', isCur ? 'true' : 'false');
      }
    }

    for (var i = 0; i < SOUNDS.length; i += 1) {
      (function (item) {
        var open = isUnlocked(item.id);
        var cls = 'mx-btn mx-squishy-pick' + (open ? '' : ' is-locked');
        var label = open ? item.label : '🔒 ' + item.label;
        var b = el('button', cls, label);
        b.type = 'button';
        pickBtns.push({ id: item.id, node: b });
        b.addEventListener('click', function () {
          if (!isUnlocked(item.id)) {
            hint.textContent = LOCK_HINT;
            return;
          }
          hint.textContent = '';
          play(item.id);
          setSound(item.id);
          markPicked(item.id);
        });
        grid.appendChild(b);
      })(SOUNDS[i]);
    }
    markPicked(current);
    panel.appendChild(grid);
    panel.appendChild(hint);

    var closeBtn = el('button', 'mx-btn mx-squishy-close', '닫기');
    closeBtn.type = 'button';
    closeBtn.addEventListener('click', onClose);
    panel.appendChild(closeBtn);
    return panel;
  }

  // 소리 고르기 창을 여닫는 버튼을 만든다
  function chooserButton() {
    var btn = el('button', 'mx-btn mx-squishy-open', '🫧 내 버튼');
    btn.type = 'button';
    btn.setAttribute('aria-expanded', 'false');
    var panel = null;

    function closePanel() {
      if (panel && panel.parentNode) panel.parentNode.removeChild(panel);
      panel = null;
      btn.setAttribute('aria-expanded', 'false');
    }

    btn.addEventListener('click', function () {
      if (panel && panel.parentNode) {
        closePanel();
        return;
      }
      panel = buildPanel(closePanel);
      if (btn.parentNode) btn.parentNode.insertBefore(panel, btn.nextSibling);
      btn.setAttribute('aria-expanded', 'true');
    });
    return btn;
  }

  // 촉감 듣기를 붙이고 host 끝에 고르기 버튼을 한 번만 붙인다
  function mount(host) {
    attach();
    if (!host || typeof host.appendChild !== 'function') return;
    if (host.querySelector && host.querySelector('.mx-squishy-open')) return;
    host.appendChild(chooserButton());
  }

  global.MathSquishy = {
    SOUNDS: SOUNDS,
    childKey: childKey,
    getPrefs: getPrefs,
    setSound: setSound,
    isUnlocked: isUnlocked,
    unlock: unlock,
    play: play,
    attach: attach,
    chooserButton: chooserButton,
    mount: mount
  };
})(typeof window !== 'undefined' ? window : globalThis);
