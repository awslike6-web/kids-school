// world-input.js — 초안: 안티그래비티 Hydrogen, 검토: Claude (docs/world_module_spec.md §11)
(function () {
  'use strict';
  const root = typeof window !== 'undefined' ? window : globalThis;
  const ZERO = { x: 0, y: 0 };
  const KEY_ACTION = { Space: 'attack', ShiftLeft: 'dash', ShiftRight: 'dash', KeyQ: 'swap' };
  const MOVE_KEYS = {
    KeyW: [0, -1], ArrowUp: [0, -1],
    KeyS: [0, 1], ArrowDown: [0, 1],
    KeyA: [-1, 0], ArrowLeft: [-1, 0],
    KeyD: [1, 0], ArrowRight: [1, 0],
  };

  // 조이스틱 원점·현재 좌표로 데드존 적용된 단위 벡터×세기를 계산한다
  function stickVector(origin, point, radius = 56, dead = 0.15) {
    if (!origin || !point) return { x: 0, y: 0, mag: 0 };
    const dx = point.x - origin.x;
    const dy = point.y - origin.y;
    const r = typeof radius === 'number' && Number.isFinite(radius) && radius > 0 ? radius : 0;
    const d = typeof dead === 'number' && Number.isFinite(dead) ? Math.max(0, dead) : 0;
    if (!Number.isFinite(dx) || !Number.isFinite(dy) || r === 0 || d >= 1) return { x: 0, y: 0, mag: 0 };
    const dist = Math.hypot(dx, dy);
    if (dist === 0) return { x: 0, y: 0, mag: 0 };
    const raw = Math.min(1, dist / r);
    if (raw <= d) return { x: 0, y: 0, mag: 0 };
    const mag = (raw - d) / (1 - d);
    return { x: (dx / dist) * mag, y: (dy / dist) * mag, mag };
  }

  // 눌린 키 Set에서 8방향 정규화 이동 벡터를 구한다
  function keyboardVector(keys) {
    if (!keys || typeof keys.has !== 'function') return { ...ZERO };
    let x = 0;
    let y = 0;
    for (const [code, vec] of Object.entries(MOVE_KEYS)) {
      if (keys.has(code)) { x += vec[0]; y += vec[1]; }
    }
    if (x === 0 && y === 0) return { ...ZERO };
    const len = Math.hypot(x, y);
    return { x: x / len, y: y / len };
  }

  // 사거리 내 살아있는 대상 중 가장 가까운 것(동률 시 id 사전순)을 고른다
  function pickTarget(from, targets, maxRange) {
    if (!from || !Number.isFinite(from.x) || !Number.isFinite(from.y)) return null;
    if (!Array.isArray(targets) || typeof maxRange !== 'number' || Number.isNaN(maxRange) || maxRange < 0) return null;
    let best = null;
    let bestDist = Infinity;
    for (const t of targets) {
      if (!t || t.alive === false || !Number.isFinite(t.x) || !Number.isFinite(t.y)) continue;
      const dist = Math.hypot(t.x - from.x, t.y - from.y);
      if (dist > maxRange) continue;
      const tId = String(t.id ?? '');
      const bId = best ? String(best.id ?? '') : '';
      if (dist < bestDist || (dist === bestDist && tId < bId)) { best = t; bestDist = dist; }
    }
    return best;
  }

  // 요소에 포인터 조이스틱·액션 버튼·키보드 입력을 연결한다
  function attach(el, opts) {
    const empty = () => ({ move: { ...ZERO }, pressed: new Set(), held: new Set() });
    if (!el || typeof el.addEventListener !== 'function') return { read: empty, destroy: () => {} };
    const { stickZone = 'left' } = opts || {};
    const radius = 56;
    const dead = 0.15;
    const pressed = new Set();
    const held = new Set();
    const keys = new Set();
    const actPtrs = new Map();
    let stickId = null;
    let origin = { ...ZERO };
    let stickVec = { ...ZERO };

    const doc = el.ownerDocument || (typeof document !== 'undefined' ? document : null);
    const keyTarget = (doc && doc.defaultView) || (typeof window !== 'undefined' ? window : el);
    let stickEl = null;
    let knobEl = null;
    if (doc && typeof doc.createElement === 'function') {
      stickEl = doc.createElement('div');
      stickEl.className = 'world-stick';
      stickEl.hidden = true;
      knobEl = doc.createElement('div');
      knobEl.className = 'world-stick__knob';
      stickEl.appendChild(knobEl);
      el.appendChild(stickEl);
    }

    const capture = (id) => { try { el.setPointerCapture && el.setPointerCapture(id); } catch (_) {} };
    const getRect = () => (el.getBoundingClientRect ? el.getBoundingClientRect() : { left: 0, top: 0, width: 0 });
    const moveKnob = (vx, vy) => {
      if (knobEl) knobEl.style.transform = `translate(${vx * radius}px, ${vy * radius}px)`;
    };
    const isActionHeld = (act) => {
      for (const a of actPtrs.values()) if (a === act) return true;
      for (const [k, a] of Object.entries(KEY_ACTION)) if (a === act && keys.has(k)) return true;
      return false;
    };

    const onDown = (e) => {
      const btn = e.target && typeof e.target.closest === 'function' ? e.target.closest('[data-action]') : null;
      if (btn && (!el.contains || el.contains(btn))) {
        const act = btn.getAttribute('data-action');
        if (act) {
          pressed.add(act);
          held.add(act);
          actPtrs.set(e.pointerId, act);
          capture(e.pointerId);
        }
        return;
      }
      if (stickId !== null) return;
      // 버튼·고르기 판·덮개 위를 누른 것은 조이스틱이 가로채지 않는다 (Claude 수정: 광장 지도 「닫기」가 안 눌리던 문제)
      const ui = e.target && typeof e.target.closest === 'function'
        ? e.target.closest('button, a, input, select, label, .world-sheet, .world-hud-top, [data-no-stick]') : null;
      if (ui && ui !== el && (!el.contains || el.contains(ui))) return;
      const rect = getRect();
      const rx = e.clientX - rect.left;
      const ry = e.clientY - rect.top;
      const inZone = stickZone === 'all' || (stickZone === 'right' ? rx >= rect.width / 2 : rx <= rect.width / 2);
      if (!inZone) return;
      stickId = e.pointerId;
      origin = { x: rx, y: ry };
      stickVec = { ...ZERO };
      capture(e.pointerId);
      if (stickEl) {
        stickEl.hidden = false;
        stickEl.style.left = `${rx}px`;
        stickEl.style.top = `${ry}px`;
        moveKnob(0, 0);
      }
    };

    const onMove = (e) => {
      if (e.pointerId !== stickId) return;
      const rect = getRect();
      const v = stickVector(origin, { x: e.clientX - rect.left, y: e.clientY - rect.top }, radius, dead);
      stickVec = { x: v.x, y: v.y };
      moveKnob(v.x, v.y);
    };

    const onUp = (e) => {
      if (actPtrs.has(e.pointerId)) {
        const act = actPtrs.get(e.pointerId);
        actPtrs.delete(e.pointerId);
        if (!isActionHeld(act)) held.delete(act);
      }
      if (e.pointerId !== stickId) return;
      stickId = null;
      stickVec = { ...ZERO };
      if (stickEl) { stickEl.hidden = true; moveKnob(0, 0); }
    };

    const onKeyDown = (e) => {
      const act = KEY_ACTION[e.code];
      if (act) {
        if (!e.repeat) pressed.add(act);
        held.add(act);
      }
      keys.add(e.code);
    };

    const onKeyUp = (e) => {
      keys.delete(e.code);
      const act = KEY_ACTION[e.code];
      if (act && !isActionHeld(act)) held.delete(act);
    };

    const onBlur = () => {
      keys.clear();
      held.clear();
      for (const a of actPtrs.values()) held.add(a);
    };

    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    keyTarget.addEventListener('keydown', onKeyDown);
    keyTarget.addEventListener('keyup', onKeyUp);
    keyTarget.addEventListener('blur', onBlur);

    const read = () => {
      const move = stickId !== null ? { ...stickVec } : keyboardVector(keys);
      const out = { move, pressed: new Set(pressed), held: new Set(held) };
      pressed.clear();
      return out;
    };

    const destroy = () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
      keyTarget.removeEventListener('keydown', onKeyDown);
      keyTarget.removeEventListener('keyup', onKeyUp);
      keyTarget.removeEventListener('blur', onBlur);
      if (stickEl && stickEl.parentNode) stickEl.parentNode.removeChild(stickEl);
      pressed.clear();
      held.clear();
      keys.clear();
      actPtrs.clear();
      stickId = null;
    };

    return { read, destroy };
  }

  root.WorldInput = Object.freeze({ stickVector, keyboardVector, pickTarget, attach });
})();
