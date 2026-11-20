// arena-boss.js — 초안: 안티그래비티 Hydrogen, 검토: Claude (docs/world_module_spec.md §12)
(function () {
  'use strict';
  const root = typeof window !== 'undefined' ? window : globalThis;

  const CFG = Object.freeze({
    WALL: 24, R: 54, WALK: 60, WALK_P2: 1.35, IDLE_1: 1.0, IDLE_2: 0.7, IDLE_KID: 1.6,
    HP_NORMAL: 1800, HP_KID: 1100, PREP_P2: 0.85, PREP_KID: 1.4, KID_DMG: 0.6,
    ENGAGE_DIST: 180, HIST_KEEP: 1.2, HIST_LAG: 0.35,
    PATS_NORMAL: Object.freeze(['charge', 'aoe', 'ring', 'slam']),
    PATS_KID: Object.freeze(['charge', 'aoe']),
    CHARGE_PREP: 0.96, CHARGE_LOCK: 0.35, CHARGE_SPD: 680, CHARGE_MAX: 560,
    CHARGE_STUN: 1.6, CHARGE_DMG: 34, CHARGE_KB: 520, STUN_MULT: 1.5,
    AOE_PREP: 0.52, AOE_ARM: 0.9, AOE_R: 76, AOE_DMG: 28, AOE_LIFE_PAD: 0.1,
    AOE_N1: 4, AOE_N2: 3, AOE_WAVE_DELAY: 0.55, AOE_SPREAD: 140,
    RING_PREP: 0.82, ORB_N1: 5, ORB_N2: 7, ORB_ARC1: 1.15, ORB_ARC2: 1.55,
    ORB_SPD1: 280, ORB_SPD2: 330, ORB_R: 10, ORB_DMG: 26, ORB_LIFE: 2.8,
    RING_SPD1: 240, RING_SPD2: 290, RING_W: 18, RING_MAX: 520, RING_DMG: 30,
    SLAM_PREP: 0.98, SLAM_MOVE: 175, SLAM_DUR: 0.25, SLAM_R1: 155, SLAM_R2: 172,
    SLAM_DMG: 40, SLAM_KB: 600, SLAM_LIFE: 0.2
  });

  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
  const dist2d = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
  const idleWait = (b) => (b.level === 'kid' ? CFG.IDLE_KID : b.phase === 2 ? CFG.IDLE_2 : CFG.IDLE_1);
  const prepMult = (b) => (b.phase === 2 ? CFG.PREP_P2 : 1) * (b.level === 'kid' ? CFG.PREP_KID : 1);
  const dmgOut = (b, d) => (b.level === 'kid' ? Math.round(d * CFG.KID_DMG) : d);

  function kbVec(sx, sy, tx, ty, mag, fallbackAim) {
    if (!mag) return { x: 0, y: 0 };
    const dx = tx - sx, dy = ty - sy, d = Math.hypot(dx, dy);
    if (d > 1e-4) return { x: (dx / d) * mag, y: (dy / d) * mag };
    const a = fallbackAim || 0;
    return { x: Math.cos(a) * mag, y: Math.sin(a) * mag };
  }

  function makeHit(target, dmg, x, y, kb, trait) {
    return { type: 'hit', target, dmg, x, y, kb, trait: trait || null, crit: false };
  }

  function clampWorld(b, w) {
    const pad = CFG.WALL + b.r;
    const nx = clamp(b.x, pad, w.w - pad), ny = clamp(b.y, pad, w.h - pad);
    const hitWall = nx !== b.x || ny !== b.y;
    b.x = nx; b.y = ny;
    return hitWall;
  }

  // 원과 사각형(엄폐물) 겹침 검사 및 밀어내기
  function resolveCover(b, c, push) {
    const cx = clamp(b.x, c.x, c.x + c.w), cy = clamp(b.y, c.y, c.y + c.h);
    const ox = b.x - cx, oy = b.y - cy, d = Math.hypot(ox, oy);
    if (d >= b.r) return false;
    if (!push) return true;
    if (d > 1e-4) {
      const m = b.r - d;
      b.x += (ox / d) * m; b.y += (oy / d) * m;
    } else {
      const dl = b.x - c.x, dr = c.x + c.w - b.x, dt = b.y - c.y, db = c.y + c.h - b.y;
      const min = Math.min(dl, dr, dt, db);
      if (min === dl) b.x = c.x - b.r;
      else if (min === dr) b.x = c.x + c.w + b.r;
      else if (min === dt) b.y = c.y - b.r;
      else b.y = c.y + c.h + b.r;
    }
    return true;
  }

  function resolveCovers(b, covers, push) {
    let hit = false;
    for (let i = 0; i < covers.length; i++) if (resolveCover(b, covers[i], push)) hit = true;
    return hit;
  }

  function pushHistory(b, me) {
    if (!me) return;
    b.history.push({ t: b.clock, x: me.x, y: me.y });
    while (b.history.length > 1 && b.clock - b.history[0].t > CFG.HIST_KEEP) b.history.shift();
  }

  function delayedTarget(b, me) {
    const targetT = b.clock - CFG.HIST_LAG;
    let pick = b.history[0];
    for (let i = 0; i < b.history.length; i++) {
      if (b.history[i].t <= targetT) pick = b.history[i];
      else break;
    }
    return pick || me;
  }

  function spawnZones(b, me, world, n, armT, rng) {
    const out = [], rand = rng || (() => 0.5), pad = CFG.WALL + CFG.AOE_R;
    const dmg = dmgOut(b, CFG.AOE_DMG);
    for (let i = 0; i < n; i++) {
      const a = rand() * Math.PI * 2, d = rand() * CFG.AOE_SPREAD;
      const x = clamp(me.x + Math.cos(a) * d, pad, world.w - pad);
      const y = clamp(me.y + Math.sin(a) * d, pad, world.h - pad);
      out.push({
        kind: 'zone', x, y, r: CFG.AOE_R, vx: 0, vy: 0,
        dmg, kb: 0, armT, life: armT + CFG.AOE_LIFE_PAD, width: 0
      });
    }
    return out;
  }

  function spawnRingBurst(b, me) {
    const out = [], p2 = b.phase === 2;
    const count = p2 ? CFG.ORB_N2 : CFG.ORB_N1;
    const arc = p2 ? CFG.ORB_ARC2 : CFG.ORB_ARC1;
    const oSpd = p2 ? CFG.ORB_SPD2 : CFG.ORB_SPD1;
    const base = Math.atan2(me.y - b.y, me.x - b.x);
    b.aim = base;
    for (let i = 0; i < count; i++) {
      const a = base + (count > 1 ? -arc / 2 + (arc * i) / (count - 1) : 0);
      out.push({
        kind: 'orb', x: b.x + Math.cos(a) * b.r, y: b.y + Math.sin(a) * b.r,
        r: CFG.ORB_R, vx: Math.cos(a) * oSpd, vy: Math.sin(a) * oSpd,
        dmg: dmgOut(b, CFG.ORB_DMG), kb: 0, armT: 0, life: CFG.ORB_LIFE, width: 0
      });
    }
    const rSpd = p2 ? CFG.RING_SPD2 : CFG.RING_SPD1;
    out.push({
      kind: 'ring', x: b.x, y: b.y, r: 0, vx: 0, vy: 0, speed: rSpd, maxR: CFG.RING_MAX,
      dmg: dmgOut(b, CFG.RING_DMG), kb: 0, armT: 0, life: CFG.RING_MAX / rSpd, width: CFG.RING_W
    });
    return out;
  }

  function startWindup(b, me, world, rng, hazards, events) {
    const pats = b.level === 'kid' ? CFG.PATS_KID : CFG.PATS_NORMAL;
    const pat = pats[b.patternIdx % pats.length];
    b.patternIdx += 1; b.pattern = pat; b.state = 'windup'; b.data = {};
    b.vx = 0; b.vy = 0;
    const pm = prepMult(b);
    events.push({ type: 'telegraph', pattern: pat });
    if (pat === 'charge') b.t = CFG.CHARGE_PREP * pm;
    else if (pat === 'aoe') {
      b.t = CFG.AOE_PREP * pm;
      const armT = CFG.AOE_ARM * pm;
      const n = b.phase === 2 ? CFG.AOE_N2 : CFG.AOE_N1;
      const zs = spawnZones(b, me, world, n, armT, rng);
      for (let i = 0; i < zs.length; i++) hazards.push(zs[i]);
      if (b.phase === 2) b.wave = { t: CFG.AOE_WAVE_DELAY, armT, n: CFG.AOE_N2 };
    } else if (pat === 'ring') b.t = CFG.RING_PREP * pm;
    else b.t = CFG.SLAM_PREP * pm;
  }

  function startActive(b, me, hazards) {
    b.state = 'active';
    if (b.pattern === 'charge') {
      b.data = { dist: 0, hitMe: false };
      b.t = CFG.CHARGE_MAX / CFG.CHARGE_SPD;
    } else if (b.pattern === 'ring') {
      const hs = spawnRingBurst(b, me);
      for (let i = 0; i < hs.length; i++) hazards.push(hs[i]);
      b.t = 0.25;
    } else if (b.pattern === 'slam') {
      const dx = me.x - b.x, dy = me.y - b.y, d = Math.hypot(dx, dy);
      const mv = Math.min(CFG.SLAM_MOVE, d);
      if (d > 1e-4) b.aim = Math.atan2(dy, dx);
      b.data = {
        sx: b.x, sy: b.y, dur: CFG.SLAM_DUR,
        tx: d > 1e-4 ? b.x + (dx / d) * mv : b.x,
        ty: d > 1e-4 ? b.y + (dy / d) * mv : b.y
      };
      b.t = CFG.SLAM_DUR;
    } else b.t = 0.25;
  }

  function create(opts) {
    const o = opts || {}, level = o.level === 'kid' ? 'kid' : 'normal';
    const maxHp = level === 'kid' ? CFG.HP_KID : CFG.HP_NORMAL;
    return {
      id: o.id || 'boss', name: o.name || 'Boss', x: o.x || 0, y: o.y || 0,
      vx: 0, vy: 0, r: CFG.R, hp: maxHp, maxHp, phase: 1, state: 'idle',
      t: level === 'kid' ? CFG.IDLE_KID : CFG.IDLE_1, pattern: null, patternIdx: 0,
      level, aim: Math.PI / 2, hitAt: -9, walk: CFG.WALK, data: {}, history: [], clock: 0
    };
  }

  function step(boss, me, covers, world, dt, rng) {
    if (boss.state === 'dead') return { events: [], hazards: [] };
    const events = [], hazards = [], cvs = covers || [];
    boss.clock = (boss.clock || 0) + dt;
    pushHistory(boss, me);
    // 2페이즈 장판 후속 3개 지연 생성
    if (boss.wave) {
      boss.wave.t -= dt;
      if (boss.wave.t <= 0) {
        const zs = spawnZones(boss, me, world, boss.wave.n, boss.wave.armT, rng);
        for (let i = 0; i < zs.length; i++) hazards.push(zs[i]);
        boss.wave = null;
      }
    }
    if (boss.state === 'stunned') {
      boss.vx = 0; boss.vy = 0; boss.t -= dt;
      if (boss.t <= 0) { boss.state = 'idle'; boss.t = idleWait(boss); boss.pattern = null; boss.data = {}; }
    } else if (boss.state === 'idle') {
      const dx = me.x - boss.x, dy = me.y - boss.y, d = Math.hypot(dx, dy);
      if (d > CFG.ENGAGE_DIST && d > 1e-4) {
        const spd = boss.walk * (boss.phase === 2 ? CFG.WALK_P2 : 1);
        boss.vx = (dx / d) * spd; boss.vy = (dy / d) * spd;
        boss.x += boss.vx * dt; boss.y += boss.vy * dt;
        boss.aim = Math.atan2(dy, dx);
      } else { boss.vx = 0; boss.vy = 0; }
      resolveCovers(boss, cvs, true); clampWorld(boss, world);
      boss.t -= dt;
      if (boss.t <= 0) startWindup(boss, me, world, rng, hazards, events);
    } else if (boss.state === 'windup') {
      boss.vx = 0; boss.vy = 0; boss.t -= dt;
      if (boss.pattern === 'charge' && boss.t > CFG.CHARGE_LOCK) {
        const p = delayedTarget(boss, me);
        boss.aim = Math.atan2(p.y - boss.y, p.x - boss.x);
      }
      if (boss.t <= 0) startActive(boss, me, hazards);
    } else if (boss.state === 'active') {
      if (boss.pattern === 'charge') {
        const stepD = CFG.CHARGE_SPD * dt;
        boss.vx = Math.cos(boss.aim) * CFG.CHARGE_SPD;
        boss.vy = Math.sin(boss.aim) * CFG.CHARGE_SPD;
        boss.x += boss.vx * dt; boss.y += boss.vy * dt;
        boss.data.dist = (boss.data.dist || 0) + stepD;
        if (resolveCovers(boss, cvs, true)) {
          boss.vx = 0; boss.vy = 0; boss.state = 'stunned';
          boss.t = CFG.CHARGE_STUN; boss.pattern = null; boss.data = {};
          events.push({ type: 'stun', x: boss.x, y: boss.y });
          return { events, hazards };
        }
        if (!boss.data.hitMe && me && me.invulnT <= 0 && dist2d(boss.x, boss.y, me.x, me.y) < boss.r + me.r) {
          boss.data.hitMe = true;
          const kb = kbVec(boss.x, boss.y, me.x, me.y, CFG.CHARGE_KB, boss.aim);
          events.push(makeHit('me', dmgOut(boss, CFG.CHARGE_DMG), me.x, me.y, kb, 'charge'));
        }
        if (clampWorld(boss, world) || boss.data.dist >= CFG.CHARGE_MAX) {
          boss.vx = 0; boss.vy = 0; boss.state = 'idle'; boss.t = idleWait(boss);
          boss.pattern = null; boss.data = {};
        }
      } else if (boss.pattern === 'slam') {
        boss.t -= dt;
        const p = clamp(1 - boss.t / (boss.data.dur || CFG.SLAM_DUR), 0, 1);
        boss.x = boss.data.sx + (boss.data.tx - boss.data.sx) * p;
        boss.y = boss.data.sy + (boss.data.ty - boss.data.sy) * p;
        resolveCovers(boss, cvs, true); clampWorld(boss, world);
        if (boss.t <= 0) {
          hazards.push({
            kind: 'slam', x: boss.x, y: boss.y, r: boss.phase === 2 ? CFG.SLAM_R2 : CFG.SLAM_R1,
            vx: 0, vy: 0, dmg: dmgOut(boss, CFG.SLAM_DMG), kb: CFG.SLAM_KB,
            armT: 0, life: CFG.SLAM_LIFE, width: 0
          });
          boss.vx = 0; boss.vy = 0; boss.state = 'idle'; boss.t = idleWait(boss);
          boss.pattern = null; boss.data = {};
        }
      } else {
        boss.t -= dt;
        if (boss.t <= 0) { boss.state = 'idle'; boss.t = idleWait(boss); boss.pattern = null; boss.data = {}; }
      }
    }
    return { events, hazards };
  }

  function damage(boss, hit) {
    if (boss.state === 'dead') return { taken: 0, events: [] };
    const raw = hit && hit.dmg ? hit.dmg : 0;
    const taken = Math.round(raw * (boss.state === 'stunned' ? CFG.STUN_MULT : 1));
    boss.hp -= taken;
    const events = [];
    if (boss.phase === 1 && boss.hp <= boss.maxHp / 2) { boss.phase = 2; events.push({ type: 'phase2' }); }
    if (boss.hp <= 0) { boss.hp = 0; boss.state = 'dead'; boss.vx = 0; boss.vy = 0; boss.wave = null; }
    return { taken, events };
  }

  function stepHazards(list, me, dt) {
    const out = [], events = [], invuln = !me || me.invulnT > 0;
    for (let i = 0; i < (list ? list.length : 0); i++) {
      const hz = list[i];
      hz.armT = Math.max(0, (hz.armT || 0) - dt);
      hz.life -= dt;
      if (hz.kind === 'orb') { hz.x += hz.vx * dt; hz.y += hz.vy * dt; }
      else if (hz.kind === 'ring') hz.r += (hz.speed || 0) * dt;
      if (hz.armT <= 0 && !hz.done) {
        const d = me ? dist2d(hz.x, hz.y, me.x, me.y) : Infinity;
        const hitRange = hz.kind === 'ring'
          ? Math.abs(d - hz.r) < (hz.width || CFG.RING_W) / 2 + (me ? me.r : 0)
          : d < hz.r + (me ? me.r : 0);
        if (!invuln && hitRange) {
          hz.done = true;
          const kb = kbVec(hz.x, hz.y, me.x, me.y, hz.kb || 0, 0);
          events.push(makeHit('me', hz.dmg, me.x, me.y, kb, hz.kind));
        } else if (hz.kind === 'zone') hz.done = true; // 장판은 폭발 순간 1회만 판정
      }
      if (hz.life > 0 && (hz.kind !== 'ring' || hz.r < (hz.maxR || CFG.RING_MAX))) out.push(hz);
    }
    return { list: out, events };
  }

  root.ArenaBoss = Object.freeze({ create, step, damage, stepHazards });
})();
