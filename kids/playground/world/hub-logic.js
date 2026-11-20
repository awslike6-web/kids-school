// hub-logic.js — 초안: 안티그래비티 Hydrogen, 검토: Claude (docs/world_module_spec.md §13)
(function () {
  'use strict';

  const root = typeof window !== 'undefined' ? window : globalThis;

  const WORLD = Object.freeze({ w: 1080, h: 1600 });

  const PORTALS = Object.freeze([
    Object.freeze({ id: 'arena', name: '아레나', icon: '⚔️', x: 540, y: 260, r: 88, href: 'arena.html', ready: true }),
    Object.freeze({
      id: 'myroom', name: '마이룸', icon: '🏠', x: 210, y: 1240, r: 88,
      href: '../../common_space/my-room.html', ready: true
    }),
    Object.freeze({ id: 'garden', name: '비밀 정원', icon: '🌿', x: 870, y: 1240, r: 88, href: 'garden.html', ready: false }),
    Object.freeze({
      id: 'coop', name: '남매 보물문', icon: '🎁', x: 540, y: 1500, r: 60,
      href: null, ready: false, hidden: true
    })
  ]);

  const PERSONALITY = Object.freeze({
    a: Object.freeze({ speed: 95, rest: Object.freeze([0.3, 1.2]), hop: true, dance: false, shy: 0 }),
    s: Object.freeze({ speed: 40, rest: Object.freeze([1.5, 4]), hop: false, dance: false, shy: 0 }),
    m: Object.freeze({ speed: 70, rest: Object.freeze([0.5, 1.5]), hop: false, dance: true, shy: 0 }),
    h: Object.freeze({ speed: 60, rest: Object.freeze([1, 2.5]), hop: false, dance: false, shy: 180 })
  });

  const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
  }

  function randRange(rng, lo, hi) {
    return lo + rng() * (hi - lo);
  }

  function randPos(rng, world) {
    const mx = Math.min(100, world.w / 2);
    const my = Math.min(100, world.h / 2);
    return {
      x: randRange(rng, mx, world.w - mx),
      y: randRange(rng, my, world.h - my)
    };
  }

  function overlapsAnyPortal(x, y) {
    for (let i = 0; i < PORTALS.length; i += 1) {
      const p = PORTALS[i];
      if (p.hidden) continue;
      const dx = x - p.x;
      const dy = y - p.y;
      const lim = p.r + 40;
      if (dx * dx + dy * dy <= lim * lim) return true;
    }
    return false;
  }

  function portalStep(st, me, portals, dt, need) {
    const req = typeof need === 'number' ? need : 0.45; // 걸어서 지나가도 들어가게 (Claude 수정, 폰 시험)
    const list = portals || PORTALS;
    let hit = null;
    for (let i = 0; i < list.length; i += 1) {
      const p = list[i];
      if (p.hidden || !p.ready) continue;
      const dx = me.x - p.x;
      const dy = me.y - p.y;
      if (dx * dx + dy * dy <= p.r * p.r) {
        hit = p;
        break;
      }
    }
    if (!hit) return { id: null, t: 0, enter: null };
    const prevT = st && st.id === hit.id ? (st.t || 0) : 0;
    const nextT = prevT + dt;
    const enter = prevT < req && nextT >= req ? hit.id : null;
    return { id: hit.id, t: nextT, enter };
  }

  function createFriend(item, shortId, p, rng, world) {
    const w = world || WORLD;
    const rfn = typeof rng === 'function' ? rng : mulberry32(1);
    const spec = PERSONALITY[p] || PERSONALITY.a;
    let pos = randPos(rfn, w);
    for (let i = 0; i < 10; i += 1) {
      if (!overlapsAnyPortal(pos.x, pos.y)) break;
      pos = randPos(rfn, w);
    }
    return {
      id: item.id,
      shortId,
      name: item.name,
      item,
      p,
      x: pos.x,
      y: pos.y,
      tx: pos.x,
      ty: pos.y,
      wait: randRange(rfn, spec.rest[0], spec.rest[1]),
      landedAt: -9,
      hitAt: -9,
      face: 1,
      bubble: null,
      bubbleT: 0
    };
  }

  function stepFriend(f, me, dt, rng, world, t) {
    const w = world || WORLD;
    const rfn = typeof rng === 'function' ? rng : mulberry32(1);
    const spec = PERSONALITY[f.p] || PERSONALITY.a;
    const mx = Math.min(100, w.w / 2);
    const my = Math.min(100, w.h / 2);

    f.bubbleT -= dt;
    if (f.bubbleT <= 0) {
      f.bubbleT = 0;
      f.bubble = null;
    }

    if (spec.shy > 0 && me) {
      const dxm = f.x - me.x;
      const dym = f.y - me.y;
      const dm = Math.hypot(dxm, dym);
      if (dm < spec.shy) {
        f.wait = 0;
        const ux = dm > 1e-4 ? dxm / dm : 1;
        const uy = dm > 1e-4 ? dym / dm : 0;
        f.tx = clamp(f.x + ux * 220, mx, w.w - mx);
        f.ty = clamp(f.y + uy * 220, my, w.h - my);
      }
    }

    if (f.wait > 0) {
      f.wait = Math.max(0, f.wait - dt);
      if (spec.dance) {
        f.dancePhase = (f.dancePhase || 0) + dt;
        while (f.dancePhase >= 0.3) {
          f.dancePhase -= 0.3;
          f.face = (f.face || 1) * -1;
        }
      }
    } else {
      let dx = f.tx - f.x;
      let dy = f.ty - f.y;
      let dist = Math.hypot(dx, dy);
      if (dist >= 2) {
        if (dx !== 0) f.face = dx > 0 ? 1 : -1;
        const step = spec.speed * dt;
        if (step >= dist) {
          f.x = f.tx;
          f.y = f.ty;
          dist = 0;
        } else {
          f.x += (dx / dist) * step;
          f.y += (dy / dist) * step;
          dx = f.tx - f.x;
          dy = f.ty - f.y;
          dist = Math.hypot(dx, dy);
        }
      }
      if (dist < 2) {
        f.wait = randRange(rfn, spec.rest[0], spec.rest[1]);
        const next = randPos(rfn, w);
        f.tx = next.x;
        f.ty = next.y;
        if (spec.hop) f.landedAt = t;
      }
    }

    f.x = clamp(f.x, 0, w.w);
    f.y = clamp(f.y, 0, w.h);
    return f;
  }

  function hitFriend(friends, x, y, radius) {
    const r = typeof radius === 'number' ? radius : 70;
    let best = null;
    let bestD2 = r * r;
    for (let i = 0; i < friends.length; i += 1) {
      const f = friends[i];
      const dx = f.x - x;
      const dy = f.y - y;
      const d2 = dx * dx + dy * dy;
      if (d2 <= bestD2) {
        bestD2 = d2;
        best = f;
      }
    }
    return best;
  }

  function todayLocal(date) {
    const d = date instanceof Date ? date : new Date(date || Date.now());
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function birthText(item) {
    if (!item || typeof item.date !== 'string') return null;
    const m = DATE_RE.exec(item.date);
    if (!m) return null;
    return m[1] + '년 ' + Number(m[2]) + '월에 태어났어!';
  }

  function isAnniversary(dateStr, today) {
    if (typeof dateStr !== 'string' || typeof today !== 'string') return false;
    const a = DATE_RE.exec(dateStr);
    const b = DATE_RE.exec(today);
    if (!a || !b) return false;
    return Number(b[1]) > Number(a[1]) && a[2] === b[2] && a[3] === b[3];
  }

  function mapFit(world, w, h, pad) {
    const p = typeof pad === 'number' ? pad : 12;
    const scale = Math.min((w - 2 * p) / world.w, (h - 2 * p) / world.h);
    const ox = (w - world.w * scale) / 2;
    const oy = (h - world.h * scale) / 2;
    return { scale, ox, oy };
  }

  root.HubLogic = Object.freeze({
    WORLD,
    PORTALS,
    PERSONALITY,
    portalStep,
    createFriend,
    stepFriend,
    hitFriend,
    todayLocal,
    birthText,
    isAnniversary,
    mapFit
  });
})();
