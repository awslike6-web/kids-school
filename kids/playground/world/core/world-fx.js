// world-fx.js — 초안: 안티그래비티 Hydrogen, 검토: Claude (docs/world_module_spec.md §11)
(function () {
  'use strict';

  const silCache = new WeakMap();
  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
  const num = (v, d) => (typeof v === 'number' && Number.isFinite(v) ? v : d);

  // kind별 기본 입자 수, 속도, 수명, 크기, 중력, 기본 색상각
  const KINDS = {
    spark: { n: 8, spd: [90, 220], life: [0.22, 0.42], size: [2, 4], g: 240, hue: 0 },
    dust: { n: 7, spd: [25, 70], life: [0.35, 0.65], size: [4, 9], g: -15, hue: 0 },
    ring: { n: 6, spd: [40, 110], life: [0.3, 0.5], size: [6, 12], g: 0, hue: 200 },
    fire: { n: 10, spd: [40, 110], life: [0.35, 0.65], size: [4, 9], g: -160, hue: 35 },
    ice: { n: 8, spd: [70, 170], life: [0.3, 0.55], size: [4, 8], g: 180, hue: 195 },
    bolt: { n: 8, spd: [180, 320], life: [0.12, 0.25], size: [8, 16], g: 0, hue: 52 },
    wind: { n: 7, spd: [120, 240], life: [0.25, 0.45], size: [12, 24], g: 0, hue: 140 },
    boom: { n: 12, spd: [60, 190], life: [0.28, 0.5], size: [6, 14], g: 0, hue: 280 },
    star: { n: 10, spd: [70, 180], life: [0.4, 0.75], size: [4, 8], g: 120, hue: 0 }
  };

  function makeRng(seed) {
    let s = (seed >>> 0) || 0x9e3779b9;
    return () => {
      s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
      return (s >>> 0) / 4294967296;
    };
  }

  function createFx(opts) {
    const cap = Math.max(1, (opts && opts.max | 0) || 40);
    const rand = makeRng(opts && opts.seed);
    const rr = (a, b) => a + rand() * (b - a);
    const pool = Array.from({ length: cap }, () => ({
      x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 0, size: 0, kind: 'spark', hue: 0, seq: 0
    }));
    let seq = 0, shakePow = 0, shakeDur = 0, shakeLeft = 0;
    let hitLeft = 0, flashDur = 0, flashLeft = 0;

    // 빈 슬롯 우선, 가득 차면 가장 오래된 입자 재사용
    function alloc() {
      let oldest = pool[0];
      for (let i = 0; i < cap; i++) {
        if (pool[i].life <= 0) return pool[i];
        if (pool[i].seq < oldest.seq) oldest = pool[i];
      }
      return oldest;
    }

    function burst(kind, x, y, n) {
      const k = KINDS[kind] ? kind : 'spark';
      const spec = KINDS[k];
      const count = n == null ? spec.n : Math.max(0, n | 0);
      const bx = num(x, 0), by = num(y, 0);
      for (let i = 0; i < count; i++) {
        const p = alloc();
        const spd = rr(spec.spd[0], spec.spd[1]);
        let ang = rand() * Math.PI * 2;
        if (k === 'fire') ang = rr(-Math.PI * 0.85, -Math.PI * 0.15);
        else if (k === 'wind') ang = rand() < 0.5 ? rr(-0.2, 0.2) : rr(Math.PI - 0.2, Math.PI + 0.2);
        p.x = bx; p.y = by;
        p.vx = Math.cos(ang) * spd; p.vy = Math.sin(ang) * spd;
        p.max = rr(spec.life[0], spec.life[1]); p.life = p.max;
        p.size = rr(spec.size[0], spec.size[1]);
        p.kind = k;
        p.hue = k === 'star' ? (i * 36 + rand() * 30) % 360 : spec.hue;
        p.seq = ++seq;
      }
    }

    function shake(power, ms) {
      shakePow = Math.max(0, num(power, 0));
      shakeDur = Math.max(0, num(ms, 0)) / 1000;
      shakeLeft = shakeDur;
    }

    function hitstop(ms) {
      const d = Math.max(0, num(ms, 0)) / 1000;
      if (d > hitLeft) hitLeft = d;
    }

    function flash(ms) {
      flashDur = Math.max(0, num(ms, 0)) / 1000;
      flashLeft = flashDur;
    }

    function step(dt) {
      const rdt = dt > 0 && Number.isFinite(dt) ? dt : 0;
      if (shakeLeft > 0) shakeLeft = Math.max(0, shakeLeft - rdt);
      if (flashLeft > 0) flashLeft = Math.max(0, flashLeft - rdt);
      for (let i = 0; i < cap; i++) {
        const p = pool[i];
        if (p.life <= 0) continue;
        p.life = Math.max(0, p.life - rdt);
        const g = (KINDS[p.kind] || KINDS.spark).g;
        p.vy += g * rdt;
        if (p.kind === 'boom' || p.kind === 'dust') {
          const damp = Math.max(0, 1 - 2.5 * rdt);
          p.vx *= damp; p.vy *= damp;
        }
        p.x += p.vx * rdt; p.y += p.vy * rdt;
      }
      if (hitLeft > 0) {
        const prev = hitLeft;
        hitLeft = Math.max(0, hitLeft - rdt);
        return rdt > prev ? rdt - prev : 0;
      }
      return rdt;
    }

    function drawStar(ctx, x, y, r) {
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const rad = i % 2 === 0 ? r : r * 0.45;
        const a = (i * Math.PI) / 5 - Math.PI / 2;
        if (i === 0) ctx.moveTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
        else ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
      }
      ctx.closePath(); ctx.fill();
    }

    function drawParticle(ctx, p) {
      const t = p.max > 0 ? p.life / p.max : 0;
      ctx.globalAlpha = clamp(t, 0, 1);
      const k = p.kind, s = p.size;
      if (k === 'spark') {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(p.x, p.y, s * (0.4 + 0.6 * t), 0, Math.PI * 2); ctx.fill();
      } else if (k === 'dust') {
        ctx.fillStyle = '#9ca3af';
        ctx.beginPath(); ctx.arc(p.x, p.y, s * (1.2 - 0.4 * t), 0, Math.PI * 2); ctx.fill();
      } else if (k === 'ring') {
        ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(p.x, p.y, s * (1.8 - t), 0, Math.PI * 2); ctx.stroke();
      } else if (k === 'fire') {
        ctx.fillStyle = `hsl(${Math.round(p.hue * t)},95%,55%)`;
        ctx.beginPath(); ctx.arc(p.x, p.y, s * t, 0, Math.PI * 2); ctx.fill();
      } else if (k === 'ice') {
        ctx.fillStyle = '#7dd3fc';
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - s); ctx.lineTo(p.x + s * 0.6, p.y);
        ctx.lineTo(p.x, p.y + s); ctx.lineTo(p.x - s * 0.6, p.y);
        ctx.closePath(); ctx.fill();
      } else if (k === 'bolt') {
        ctx.strokeStyle = '#fde047'; ctx.lineWidth = 2;
        const mag = Math.hypot(p.vx, p.vy) || 1;
        ctx.beginPath(); ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - (p.vx / mag) * s, p.y - (p.vy / mag) * s); ctx.stroke();
      } else if (k === 'wind') {
        ctx.strokeStyle = '#4ade80'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(p.x - s * 0.5, p.y); ctx.lineTo(p.x + s * 0.5, p.y); ctx.stroke();
      } else if (k === 'boom') {
        ctx.fillStyle = '#a855f7';
        ctx.beginPath(); ctx.arc(p.x, p.y, s * (1.5 - 0.5 * t), 0, Math.PI * 2); ctx.fill();
      } else if (k === 'star') {
        ctx.fillStyle = `hsl(${p.hue},90%,65%)`;
        drawStar(ctx, p.x, p.y, s * (0.5 + 0.5 * t));
      }
    }

    function draw(ctx) {
      if (!ctx) return;
      ctx.save();
      for (let i = 0; i < cap; i++) {
        if (pool[i].life > 0) drawParticle(ctx, pool[i]);
      }
      if (flashLeft > 0 && flashDur > 0) {
        const w = ctx.canvas ? ctx.canvas.width : 0;
        const h = ctx.canvas ? ctx.canvas.height : 0;
        ctx.globalAlpha = 0.5 * (flashLeft / flashDur);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
      }
      ctx.restore();
    }

    function offset() {
      if (shakeLeft <= 0 || shakeDur <= 0 || shakePow <= 0) return { x: 0, y: 0 };
      const amp = shakePow * (shakeLeft / shakeDur);
      return { x: (rand() * 2 - 1) * amp, y: (rand() * 2 - 1) * amp };
    }

    return {
      burst, shake, hitstop, flash, step, draw, offset,
      get alive() {
        let c = 0;
        for (let i = 0; i < cap; i++) if (pool[i].life > 0) c++;
        return c;
      }
    };
  }

  function body(opts) {
    const o = opts || {};
    const t = num(o.t, 0);
    const breath = Math.sin(t * Math.PI) * 0.03;
    let sx = 1 - breath, sy = 1 + breath;
    const la = o.landedAt;
    if (typeof la === 'number' && Number.isFinite(la) && t >= la && t - la < 0.25) {
      const k = 1 - (t - la) / 0.25;
      sx *= 1 + 0.25 * k;
      sy *= 1 - 0.25 * k;
    }
    const ha = o.hitAt;
    const flash = typeof ha === 'number' && Number.isFinite(ha) && t >= ha && t - ha < 0.12;
    return { sx, sy, flash };
  }

  function shadow(ctx, x, y, w) {
    if (!ctx) return;
    const rx = Math.max(1, num(w, 20) * 0.5);
    const ry = Math.max(1, num(w, 20) * 0.16);
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath();
    ctx.ellipse(num(x, 0), num(y, 0), rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function silhouette(canvas) {
    if (!canvas || typeof document === 'undefined') return null;
    const cached = silCache.get(canvas);
    if (cached) return cached;
    const c = document.createElement('canvas');
    c.width = canvas.width || 1;
    c.height = canvas.height || 1;
    const g = c.getContext('2d');
    if (!g) return null;
    g.drawImage(canvas, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, c.width, c.height);
    silCache.set(canvas, c);
    return c;
  }

  const root = typeof window !== 'undefined' ? window : globalThis;
  root.WorldFX = Object.freeze({ createFx, body, shadow, silhouette });
})();
