// arena-fighter.js — 초안: 안티그래비티 Hydrogen, 검토: Claude (docs/world_module_spec.md §12)
(function () {
  'use strict';
  const root = typeof window !== 'undefined' ? window : globalThis;

  // 수치 상수 (계약 §12-2)
  const C = Object.freeze({
    WORLD_W: 720, WORLD_H: 1100, WALL: 24,
    ME_R: 26, ME_HP: 160, ME_SPEED: 230,
    DASH_CD: 0.9, DASH_DUR: 0.18, DASH_SPEED: 620, DASH_INVULN: 0.35,
    SHIELD_DUR: 3, LOW_HP_RATIO: 0.3, RELOAD_VULN_MULT: 1.3, KB_DAMP: 8,
    STRAFE_SEC: 1.2, THINK_INIT_CD: 0.75, ATTACK_CD_MULT: 0.6,
    RANGE: Object.freeze({ blade: 90, rifle: 300, shotgun: 160 }),
    RANGE_TOL: 40, ATTACK_PAD: 60, DODGE_DT_MULT: 4
  });

  const LEVELS = Object.freeze({
    kid: Object.freeze({ speed: 140, windupMult: 1.55, reloadSec: 1.8, bursts: 2, thinkSec: 0.48, dodgeChance: 0.08, hp: 160 }),
    normal: Object.freeze({ speed: 165, windupMult: 1.25, reloadSec: 1.5, bursts: 2, thinkSec: 0.3, dodgeChance: 0.24, hp: 230 }),
    ace: Object.freeze({ speed: 190, windupMult: 0.96, reloadSec: 1.35, bursts: 3, thinkSec: 0.16, dodgeChance: 0.45, hp: 270 })
  });

  const COVERS = Object.freeze({
    pillars4: Object.freeze([
      Object.freeze({ x: 144, y: 294, w: 72, h: 72 }),
      Object.freeze({ x: 504, y: 294, w: 72, h: 72 }),
      Object.freeze({ x: 144, y: 734, w: 72, h: 72 }),
      Object.freeze({ x: 504, y: 734, w: 72, h: 72 })
    ]),
    cross: Object.freeze([
      Object.freeze({ x: 250, y: 522, w: 220, h: 56 }),
      Object.freeze({ x: 332, y: 420, w: 56, h: 260 }),
      Object.freeze({ x: 300, y: 242, w: 120, h: 36 }),
      Object.freeze({ x: 300, y: 822, w: 120, h: 36 })
    ]),
    open: Object.freeze([])
  });

  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

  function create(opts) {
    const o = opts || {};
    const team = o.team || 'me';
    const lvKey = o.level && LEVELS[o.level] ? o.level : 'normal';
    const lv = LEVELS[lvKey];
    const hp = team === 'me' ? C.ME_HP : lv.hp;
    const speed = team === 'me' ? C.ME_SPEED : lv.speed;
    return {
      id: o.id || team, team, x: o.x || 0, y: o.y || 0, vx: 0, vy: 0,
      r: C.ME_R, hp, maxHp: hp, speed,
      aim: team === 'me' ? -Math.PI / 2 : Math.PI / 2,
      dashT: 0, dashCd: 0, invulnT: 0, shieldT: 0, hitAt: -9, landedAt: -9,
      slowT: 0, slowMult: 1, stunT: 0, burnT: 0, burnDps: 0, burnAcc: 0,
      weapon: o.weapon || { cls: 'blade', trait: 'r', skin: null },
      atk: { phase: 'idle', t: 0, step: 0, comboT: 0, hit: false, shots: 0, queued: false },
      level: lvKey, dashDir: { x: 0, y: team === 'me' ? -1 : 1 },
      ai: { strafeDir: 1, strafeT: C.STRAFE_SEC, thinkT: 0, cooldown: C.THINK_INIT_CD, bursts: 0, reloadT: 0, last: null }
    };
  }

  // 원-사각형 충돌 해소
  function pushOutRect(f, c) {
    const cx = clamp(f.x, c.x, c.x + c.w);
    const cy = clamp(f.y, c.y, c.y + c.h);
    const dx = f.x - cx, dy = f.y - cy, d2 = dx * dx + dy * dy;
    if (d2 >= f.r * f.r) return;
    if (d2 > 1e-8) {
      const d = Math.sqrt(d2), push = f.r - d;
      f.x += (dx / d) * push;
      f.y += (dy / d) * push;
      return;
    }
    // 중심이 사각형 내부이면 가장 가까운 변으로 밀어냄
    const dl = f.x - c.x, dr = c.x + c.w - f.x, dt = f.y - c.y, db = c.y + c.h - f.y;
    const m = Math.min(dl, dr, dt, db);
    if (m === dl) f.x = c.x - f.r;
    else if (m === dr) f.x = c.x + c.w + f.r;
    else if (m === dt) f.y = c.y - f.r;
    else f.y = c.y + c.h + f.r;
  }

  function move(f, vec, dt, covers, world) {
    if (f.stunT > 0) return f;
    const vxIn = vec ? vec.x || 0 : 0, vyIn = vec ? vec.y || 0 : 0;
    const len = Math.hypot(vxIn, vyIn);
    const spd = f.speed * (f.slowT > 0 ? f.slowMult : 1);
    let mx = 0, my = 0;
    if (f.dashT > 0) {
      const d = f.dashDir || { x: Math.cos(f.aim), y: Math.sin(f.aim) };
      mx = d.x * C.DASH_SPEED;
      my = d.y * C.DASH_SPEED;
    } else if (len > 0) {
      const s = len > 1 ? 1 / len : 1;
      mx = vxIn * s * spd;
      my = vyIn * s * spd;
    }
    if (len > 0.1 && (!f.atk || f.atk.phase === 'idle')) f.aim = Math.atan2(vyIn, vxIn);
    f.x += (mx + f.vx) * dt;
    f.y += (my + f.vy) * dt;
    const damp = Math.exp(-C.KB_DAMP * dt);
    f.vx *= damp;
    f.vy *= damp;
    if (covers) for (let i = 0; i < covers.length; i++) pushOutRect(f, covers[i]);
    const w = (world && world.w) || C.WORLD_W, h = (world && world.h) || C.WORLD_H;
    f.x = clamp(f.x, C.WALL + f.r, w - C.WALL - f.r);
    f.y = clamp(f.y, C.WALL + f.r, h - C.WALL - f.r);
    return f;
  }

  function dash(f, vec) {
    if (f.dashCd > 0 || f.stunT > 0) return null;
    const vx = vec ? vec.x || 0 : 0, vy = vec ? vec.y || 0 : 0;
    const len = Math.hypot(vx, vy);
    f.dashDir = len > 0 ? { x: vx / len, y: vy / len } : { x: Math.cos(f.aim), y: Math.sin(f.aim) };
    f.dashT = C.DASH_DUR;
    f.invulnT = Math.max(f.invulnT, C.DASH_INVULN);
    f.dashCd = C.DASH_CD;
    return { type: 'dash', x: f.x, y: f.y };
  }

  function damage(f, hit) {
    if (f.invulnT > 0 || f.shieldT > 0) return { taken: 0, events: [] };
    const h = hit || {};
    const mult = f.atk && f.atk.phase === 'reload' ? C.RELOAD_VULN_MULT : 1;
    const taken = Math.round((h.dmg || 0) * mult);
    f.hp -= taken;
    const events = [];
    // 보호막(패배 없음)은 내 캐릭터만. 라이벌은 0이 되면 진다 (Claude 수정: 계약 빈틈)
    if (f.hp <= 0 && f.team !== 'me') { f.hp = 0; events.push({ type: 'down' }); }
    else if (f.hp <= 0) {
      f.hp = Math.round(f.maxHp * C.LOW_HP_RATIO);
      f.shieldT = C.SHIELD_DUR;
      events.push({ type: 'shield' });
    }
    if (h.kb) { f.vx += h.kb.x || 0; f.vy += h.kb.y || 0; }
    f.hitAt = h.now ?? 0;
    return { taken, events };
  }

  // 리앙-바스키 선분-사각형 교차 검사
  function hitsRect(ax, ay, dx, dy, c) {
    let t0 = 0, t1 = 1;
    const p = [-dx, dx, -dy, dy];
    const q = [ax - c.x, c.x + c.w - ax, ay - c.y, c.y + c.h - ay];
    for (let i = 0; i < 4; i++) {
      if (p[i] === 0) { if (q[i] < 0) return false; }
      else {
        const r = q[i] / p[i];
        if (p[i] < 0) { if (r > t1) return false; if (r > t0) t0 = r; }
        else { if (r < t0) return false; if (r < t1) t1 = r; }
      }
    }
    return t0 <= t1;
  }

  function lineOfSight(a, b, covers) {
    if (!covers || !covers.length) return true;
    const dx = b.x - a.x, dy = b.y - a.y;
    for (let i = 0; i < covers.length; i++) {
      if (hitsRect(a.x, a.y, dx, dy, covers[i])) return false;
    }
    return true;
  }

  function think(foe, me, covers, dt, rng) {
    const lv = LEVELS[foe.level] || LEVELS.normal;
    const ai = foe.ai;
    ai.strafeT -= dt;
    if (ai.strafeT <= 0) { ai.strafeDir *= -1; ai.strafeT = C.STRAFE_SEC; }
    ai.cooldown = Math.max(0, ai.cooldown - dt);

    const dx = me.x - foe.x, dy = me.y - foe.y, dist = Math.hypot(dx, dy) || 1;
    const ux = dx / dist, uy = dy / dist;
    const px = -uy * ai.strafeDir, py = ux * ai.strafeDir;
    const dodge = rng() < lv.dodgeChance * dt * C.DODGE_DT_MULT;

    if (ai.reloadT > 0) {
      ai.reloadT = Math.max(0, ai.reloadT - dt);
      if (ai.reloadT === 0 && foe.atk) foe.atk.phase = 'idle';
      const rx = -ux * 0.6 + px * 0.8, ry = -uy * 0.6 + py * 0.8;
      const rl = Math.hypot(rx, ry) || 1;
      return { move: { x: rx / rl, y: ry / rl }, attack: false, dash: dodge, events: [] };
    }

    if (ai.thinkT > 0 && ai.last) {
      ai.thinkT -= dt;
      return { move: ai.last.move, attack: ai.last.attack, dash: ai.last.dash, events: [] };
    }

    ai.thinkT = lv.thinkSec;
    const cls = foe.weapon && foe.weapon.cls;
    const want = C.RANGE[cls] || C.RANGE.shotgun;
    const diff = dist - want;
    let mx = px, my = py;
    if (diff > C.RANGE_TOL) { mx = ux; my = uy; }
    else if (diff < -C.RANGE_TOL) { mx = -ux; my = -uy; }

    let attack = false;
    const events = [];
    if (ai.cooldown <= 0 && dist <= want + C.ATTACK_PAD && lineOfSight(foe, me, covers)) {
      attack = true;
      ai.cooldown = C.ATTACK_CD_MULT * lv.windupMult;
      ai.bursts += 1;
      if (ai.bursts >= lv.bursts) {
        ai.bursts = 0;
        ai.reloadT = lv.reloadSec;
        if (foe.atk) foe.atk.phase = 'reload';
        events.push({ type: 'reload' });
      }
    }

    ai.last = { move: { x: mx, y: my }, attack, dash: dodge };
    return { move: ai.last.move, attack, dash: dodge, events };
  }

  function stepStatus(f, dt) {
    const events = [];
    if (f.burnT > 0) {
      f.burnAcc = (f.burnAcc || 0) + f.burnDps * dt;
      if (f.burnAcc >= 1) {
        const dmgInt = Math.floor(f.burnAcc);
        f.burnAcc -= dmgInt;
        const res = damage(f, { dmg: dmgInt, kb: { x: 0, y: 0 }, now: 0 });
        for (let i = 0; i < res.events.length; i++) events.push(res.events[i]);
      }
    }
    f.dashT = Math.max(0, f.dashT - dt);
    f.dashCd = Math.max(0, f.dashCd - dt);
    f.invulnT = Math.max(0, f.invulnT - dt);
    f.shieldT = Math.max(0, f.shieldT - dt);
    f.slowT = Math.max(0, f.slowT - dt);
    if (f.slowT === 0) f.slowMult = 1;
    f.stunT = Math.max(0, f.stunT - dt);
    f.burnT = Math.max(0, f.burnT - dt);
    if (f.burnT === 0) { f.burnDps = 0; f.burnAcc = 0; }
    return events;
  }

  root.ArenaFighter = Object.freeze({
    LEVELS, COVERS, create, move, dash, damage, lineOfSight, think, stepStatus
  });
})();
