// world-sfx.js — 초안: 안티그래비티 Hydrogen, 검토: Claude (docs/world_module_spec.md §11)
(() => {
  'use strict';

  const root = typeof window !== 'undefined' ? window : globalThis;
  const STORAGE_KEY = 'kids_world_sfx';
  const MASTER_VOL = 0.35;
  const DEBOUNCE_MS = 40;
  const XYLO_NOTES = [523.25, 587.33, 659.25, 783.99, 880.0];
  const LEVELUP_NOTES = [523.25, 659.25, 783.99];
  const lastPlay = Object.create(null);

  let ctx = null;
  let master = null;
  let noiseBuf = null;

  const getLS = () => { try { return root.localStorage || null; } catch (_) { return null; } };

  // 첫 호출 시에만 AudioContext·마스터 게인 생성
  const ensureCtx = () => {
    if (ctx) return ctx;
    const AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = MASTER_VOL;
      master.connect(ctx.destination);
      return ctx;
    } catch (_) {
      ctx = null;
      master = null;
      return null;
    }
  };

  const getNoiseBuf = (c) => {
    if (noiseBuf) return noiseBuf;
    const len = Math.max(1, Math.floor(c.sampleRate * 0.5));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let k = 0; k < len; k++) data[k] = Math.random() * 2 - 1;
    noiseBuf = buf;
    return buf;
  };

  const tone = (c, type, f0, f1, dur, vol, delay = 0) => {
    const t = c.currentTime + delay;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) osc.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + dur);
    g.gain.setValueAtTime(Math.max(vol, 0.001), t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  };

  const noise = (c, dur, f0, f1, fType, vol, delay = 0) => {
    const t = c.currentTime + delay;
    const src = c.createBufferSource();
    const flt = c.createBiquadFilter();
    const g = c.createGain();
    src.buffer = getNoiseBuf(c);
    flt.type = fType;
    flt.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) flt.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + dur);
    g.gain.setValueAtTime(Math.max(vol, 0.001), t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(flt);
    flt.connect(g);
    g.connect(master);
    src.start(t);
    src.stop(t + dur + 0.02);
  };

  const SOUNDS = {
    hit: (c) => tone(c, 'triangle', 160, 45, 0.09, 0.9),
    slash: (c) => noise(c, 0.12, 2400, 500, 'bandpass', 0.75),
    shot: (c) => tone(c, 'square', 900, 220, 0.07, 0.45),
    shotgun: (c) => { noise(c, 0.22, 900, 180, 'lowpass', 0.95); tone(c, 'triangle', 120, 40, 0.12, 0.7); },
    dash: (c) => noise(c, 0.14, 600, 2200, 'bandpass', 0.5),
    pop: (c) => tone(c, 'sine', 280, 620, 0.06, 0.75),
    chime: (c) => { tone(c, 'sine', 880, 880, 0.32, 0.55); tone(c, 'sine', 1320, 1320, 0.24, 0.25); },
    xylo: (c, i) => {
      const f = XYLO_NOTES[Math.max(0, Math.min(4, i | 0))];
      tone(c, 'sine', f, f, 0.26, 0.65);
      tone(c, 'triangle', f * 2, f * 2, 0.08, 0.2);
    },
    levelup: (c) => LEVELUP_NOTES.forEach((f, k) => tone(c, 'triangle', f, f, 0.16, 0.55, k * 0.08))
  };

  // 음소거 여부 확인 ('off'일 때만 음소거)
  const isMuted = () => {
    const ls = getLS();
    try { return ls ? ls.getItem(STORAGE_KEY) === 'off' : false; } catch (_) { return false; }
  };

  // 음소거 설정 (true: 'off' 저장, false: 키 삭제)
  const setMuted = (b) => {
    const ls = getLS();
    if (!ls) return;
    try {
      if (b) ls.setItem(STORAGE_KEY, 'off');
      else ls.removeItem(STORAGE_KEY);
    } catch (_) {}
  };

  // 첫 터치 시 AudioContext 생성 및 재개
  const unlock = () => {
    const c = ensureCtx();
    if (!c) return;
    try {
      if (c.state === 'suspended' && typeof c.resume === 'function') c.resume().catch(() => {});
    } catch (_) {}
  };

  // 효과음 재생 (40ms 내 동일 이름 중복 무시)
  const play = (name, i) => {
    const fn = Object.prototype.hasOwnProperty.call(SOUNDS, name) ? SOUNDS[name] : null;
    if (!fn || isMuted()) return;
    const now = Date.now();
    if (now - (lastPlay[name] || 0) < DEBOUNCE_MS) return;
    const c = ensureCtx();
    if (!c) return;
    lastPlay[name] = now;
    try {
      if (c.state === 'suspended' && typeof c.resume === 'function') c.resume().catch(() => {});
      fn(c, i);
    } catch (_) {}
  };

  root.WorldSFX = Object.freeze({ play, unlock, setMuted, isMuted });
})();
