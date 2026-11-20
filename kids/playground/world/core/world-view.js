// world-view.js — 초안: 안티그래비티 Hydrogen, 검토: Claude (docs/world_module_spec.md §11)
(function () {
  'use strict';
  const root = typeof window !== 'undefined' ? window : globalThis;

  // 유한한 숫자가 아니면 기본값 반환
  const num = (v, fallback) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
  const pos = (v, fallback) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : fallback);
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  // 짧은 변 600 미만이면 360, 이상이면 540 기준으로 동일 배율 계산
  function fitView(cssW, cssH) {
    const w = pos(cssW, 360), h = pos(cssH, 640);
    const short = Math.min(w, h), visShort = short < 600 ? 360 : 540;
    const scale = short / visShort;
    return { scale, viewW: w / scale, viewH: h / scale };
  }

  // DPR을 1~2로 제한(잘못된 값은 1)
  const dprFor = (ratio) => (typeof ratio === 'number' && Number.isFinite(ratio) && ratio > 0 ? clamp(ratio, 1, 2) : 1);

  // ms를 초 단위로 변환하고 0~0.05로 제한
  const clampDt = (ms) => (typeof ms === 'number' && Number.isFinite(ms) && ms > 0 ? clamp(ms / 1000, 0, 0.05) : 0);

  // 축 하나를 월드 범위 안으로 자르거나 월드가 작으면 가운데 정렬
  const clampAxis = (posVal, viewLen, worldLen) =>
    (worldLen <= viewLen ? (worldLen - viewLen) / 2 : clamp(posVal, 0, worldLen - viewLen));

  // 대상 중심을 화면 가운데로 두는 새 카메라 좌표 계산(원본 cam 불변)
  function follow(cam, target, view, world, dt, k = 8) {
    const cx = num(cam && cam.x, 0), cy = num(cam && cam.y, 0);
    const tx = num(target && target.x, cx), ty = num(target && target.y, cy);
    const vw = pos(view && view.w, 360), vh = pos(view && view.h, 640);
    const ww = pos(world && world.w, vw), wh = pos(world && world.h, vh);
    const safeDt = num(dt, 0) > 0 ? num(dt, 0) : 0, kk = num(k, 8) >= 0 ? num(k, 8) : 8;
    const alpha = 1 - Math.exp(-kk * safeDt);
    const nx = cx + (tx - vw / 2 - cx) * alpha;
    const ny = cy + (ty - vh / 2 - cy) * alpha;
    return { x: clampAxis(nx, vw, ww), y: clampAxis(ny, vh, wh) };
  }

  // 월드 좌표 <-> 화면 좌표 변환(서로 역함수)
  function toScreen(cam, scale, x, y) {
    const cx = num(cam && cam.x, 0), cy = num(cam && cam.y, 0), s = pos(scale, 1);
    return { x: (num(x, 0) - cx) * s, y: (num(y, 0) - cy) * s };
  }

  function toWorld(cam, scale, sx, sy) {
    const cx = num(cam && cam.x, 0), cy = num(cam && cam.y, 0), s = pos(scale, 1);
    return { x: num(sx, 0) / s + cx, y: num(sy, 0) / s + cy };
  }

  // 캔버스 크기·DPR·변환 행렬을 부모 크기에 맞춰 자동 동기화
  function mount(canvas, onResize) {
    let view = { w: 360, h: 640, scale: 1, dpr: 1, cssW: 360, cssH: 640 };
    if (!canvas || typeof canvas.getContext !== 'function') {
      return { ctx: null, get view() { return view; }, destroy() {} };
    }
    const ctx = canvas.getContext('2d');
    const parent = canvas.parentElement;
    let destroyed = false, ro = null;

    const sync = (notify) => {
      if (destroyed) return;
      const cssW = pos(parent ? parent.clientWidth : canvas.clientWidth, 360);
      const cssH = pos(parent ? parent.clientHeight : canvas.clientHeight, 640);
      const dpr = dprFor(root.devicePixelRatio);
      const fitted = fitView(cssW, cssH);
      canvas.width = Math.max(1, Math.round(cssW * dpr));
      canvas.height = Math.max(1, Math.round(cssH * dpr));
      if (canvas.style) { canvas.style.width = cssW + 'px'; canvas.style.height = cssH + 'px'; }
      if (ctx && typeof ctx.setTransform === 'function') {
        ctx.setTransform(fitted.scale * dpr, 0, 0, fitted.scale * dpr, 0, 0);
      }
      view = { w: fitted.viewW, h: fitted.viewH, scale: fitted.scale, dpr, cssW, cssH };
      if (notify && typeof onResize === 'function') onResize(view);
    };

    sync(false);
    const onWinResize = () => sync(true);
    if (typeof root.addEventListener === 'function') root.addEventListener('resize', onWinResize);
    if (typeof root.ResizeObserver === 'function' && (parent || canvas)) {
      ro = new root.ResizeObserver(onWinResize);
      ro.observe(parent || canvas);
    }
    return {
      ctx,
      get view() { return view; },
      destroy() {
        if (destroyed) return;
        destroyed = true;
        if (typeof root.removeEventListener === 'function') root.removeEventListener('resize', onWinResize);
        if (ro) { ro.disconnect(); ro = null; }
      }
    };
  }

  // rAF 기반 게임 루프(탭 숨김 시 정지, 복귀 시 첫 프레임 dt=0)
  function createLoop(opts) {
    const { update, render } = opts || {};
    let running = false, rafId = 0, lastTs = 0, resetDt = false;
    const getDoc = () => (typeof document !== 'undefined' ? document : root.document);
    const raf = (fn) => (typeof root.requestAnimationFrame === 'function'
      ? root.requestAnimationFrame(fn) : setTimeout(() => fn(Date.now()), 16));
    const caf = (id) => (typeof root.cancelAnimationFrame === 'function'
      ? root.cancelAnimationFrame(id) : clearTimeout(id));

    const tick = (ts) => {
      if (!running) return;
      const dt = resetDt || !lastTs ? 0 : clampDt(ts - lastTs);
      resetDt = false; lastTs = ts;
      if (typeof update === 'function') update(dt);
      if (typeof render === 'function') render();
      if (running) rafId = raf(tick);
    };

    const onVis = () => {
      const d = getDoc();
      if (!running || !d) return;
      if (d.hidden) { if (rafId) { caf(rafId); rafId = 0; } }
      else if (!rafId) { resetDt = true; rafId = raf(tick); }
    };

    const start = () => {
      if (running) return;
      running = true; lastTs = 0; resetDt = true;
      const d = getDoc();
      if (d && typeof d.addEventListener === 'function') d.addEventListener('visibilitychange', onVis);
      if (!(d && d.hidden)) rafId = raf(tick);
    };

    const stop = () => {
      if (!running) return;
      running = false;
      if (rafId) { caf(rafId); rafId = 0; }
      const d = getDoc();
      if (d && typeof d.removeEventListener === 'function') d.removeEventListener('visibilitychange', onVis);
    };

    return { start, stop, get running() { return running; } };
  }

  root.WorldView = Object.freeze({ fitView, dprFor, clampDt, follow, toScreen, toWorld, mount, createLoop });
})();
