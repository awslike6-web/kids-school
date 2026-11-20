// arena-weapons.js — 초안: 안티그래비티 Hydrogen, 검토: Claude (docs/world_module_spec.md §12)
(function () {
  'use strict';

  const WALL = 24;
  const LUNGE_STEP = 0.12;
  const MUZZLE_OFF = 8;
  const SHOTGUN_JITTER = 0.04;
  const WIND_KB = 1.8;
  const BURN_RATIO = 0.15;
  const BURN_DUR = 2;
  const SLOW_DUR = 1.5;
  const SLOW_MULT = 0.6;
  const STUN_DUR = 0.12;
  const EXPLODE_R = 70;
  const CFG_MAP = { b: 'blade', r: 'rifle', s: 'shotgun' };
  const defRng = () => 0.5;

  // 무기 정의 (계약 §12-1 수치)
  const WEAPONS = Object.freeze({
    blade: Object.freeze({
      comboReset: 0.68,
      steps: Object.freeze([
        Object.freeze({
          windup: 0.075, active: 0.085, recovery: 0.14,
          range: 112, damage: 24, knockback: 350, lunge: 150, arc: 1.35, crit: false
        }),
        Object.freeze({
          windup: 0.065, active: 0.085, recovery: 0.145,
          range: 118, damage: 28, knockback: 400, lunge: 175, arc: 1.4, crit: false
        }),
        Object.freeze({
          windup: 0.125, active: 0.145, recovery: 0.24,
          range: 146, damage: 62, knockback: 720, lunge: 230, arc: Math.PI, crit: true
        })
      ])
    }),
    rifle: Object.freeze({
      windup: 0.014, active: 0.022, recovery: 0.082,
      damage: 14, pellets: 1, speed: 1220, spread: 0.055, kb: 165, recoil: 0, auto: true, r: 5, life: 0.9
    }),
    shotgun: Object.freeze({
      windup: 0.085, active: 0.045, recovery: 0.39,
      damage: 18, pellets: 5, speed: 1020, spread: 0.36, kb: 260, recoil: 320, auto: false, r: 5, life: 0.9
    })
  });

  // 속성 정의 (계약 §12-1 수치)
  const TRAITS = Object.freeze({
    r: Object.freeze({ mult: 1.0, burnRatio: 0, burnDur: 0, slowDur: 0, slowMult: 1, stunDur: 0, kbMult: 1 }),
    f: Object.freeze({
      mult: 0.85, burnRatio: BURN_RATIO, burnDur: BURN_DUR, slowDur: 0, slowMult: 1, stunDur: 0, kbMult: 1
    }),
    i: Object.freeze({
      mult: 0.92, burnRatio: 0, burnDur: 0, slowDur: SLOW_DUR, slowMult: SLOW_MULT, stunDur: 0, kbMult: 1
    }),
    l: Object.freeze({ mult: 0.92, burnRatio: 0, burnDur: 0, slowDur: 0, slowMult: 1, stunDur: STUN_DUR, kbMult: 1 }),
    w: Object.freeze({ mult: 0.95, burnRatio: 0, burnDur: 0, slowDur: 0, slowMult: 1, stunDur: 0, kbMult: WIND_KB }),
    x: Object.freeze({
      mult: 0.9, burnRatio: 0, burnDur: 0, slowDur: 0, slowMult: 1, stunDur: 0, kbMult: 1, explodeR: EXPLODE_R
    })
  });

  const clampAng = (a) => {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  };
  const targetTag = (t) => (t.team === 'me' ? 'me' : (t.id === 'boss' ? 'boss' : 'foe'));
  const getTrait = (t) => TRAITS[t] || TRAITS.r;
  const traitTotal = (trait) => { const t = getTrait(trait); return t.mult * (1 + t.burnRatio); };

  // 무기별 초당 기대 피해 계산
  function dps(cls, trait) {
    const mult = traitTotal(trait);
    if (cls === 'blade') {
      let dmg = 0;
      let dur = 0;
      for (let i = 0; i < WEAPONS.blade.steps.length; i++) {
        const s = WEAPONS.blade.steps[i];
        dmg += s.damage;
        dur += s.windup + s.active + s.recovery;
      }
      return (dmg * mult) / dur;
    }
    const w = WEAPONS[cls];
    if (!w) return 0;
    return (w.pellets * w.damage * mult) / (w.windup + w.active + w.recovery);
  }

  function fromShop(item) {
    const a = item && item.arena;
    if (!a || !WEAPONS[a.class] || !TRAITS[a.trait]) return null;
    return { cls: a.class, trait: a.trait, skin: item.id };
  }

  function fromCfg(cfg, colorTrait) {
    const cls = (cfg && CFG_MAP[cfg.w]) || 'blade';
    const trait = (cfg && TRAITS[cfg.e]) ? cfg.e : (TRAITS[colorTrait] ? colorTrait : 'r');
    return { cls, trait };
  }

  function ensureAtk(f) {
    if (!f.atk) f.atk = { phase: 'idle', t: 0, step: 0, comboT: 0, hit: false, shots: 0, queued: false };
    return f.atk;
  }

  function getSpec(f) {
    const cls = (f.weapon && f.weapon.cls) || 'blade';
    if (cls === 'blade') return WEAPONS.blade.steps[ensureAtk(f).step || 0] || WEAPONS.blade.steps[0];
    return WEAPONS[cls] || WEAPONS.rifle;
  }

  // 공격 시작 및 블레이드 콤보 예약
  function startAttack(f) {
    const atk = ensureAtk(f);
    if (atk.phase === 'reload') return false;
    const cls = (f.weapon && f.weapon.cls) || 'blade';
    if (atk.phase !== 'idle') {
      if (cls === 'blade') atk.queued = true;
      return false;
    }
    atk.phase = 'windup';
    atk.hit = false;
    atk.queued = false;
    atk.t = getSpec(f).windup;
    return true;
  }

  // 현재 무기의 탄 배열 생성
  function fire(f, rng) {
    const rFn = rng || defRng;
    const cls = (f.weapon && f.weapon.cls) || 'rifle';
    const spec = WEAPONS[cls] || WEAPONS.rifle;
    const trait = (f.weapon && f.weapon.trait) || 'r';
    const aim = f.aim || 0;
    const n = spec.pellets || 1;
    const off = (f.r || 0) + MUZZLE_OFF;
    const sx = f.x + Math.cos(aim) * off;
    const sy = f.y + Math.sin(aim) * off;
    const out = [];
    for (let i = 0; i < n; i++) {
      const spreadOff = n > 1
        ? (i / (n - 1) - 0.5) * spec.spread + (rFn() - 0.5) * SHOTGUN_JITTER
        : (rFn() - 0.5) * spec.spread;
      const ang = aim + spreadOff;
      out.push({
        x: sx, y: sy, vx: Math.cos(ang) * spec.speed, vy: Math.sin(ang) * spec.speed,
        r: spec.r, dmg: spec.damage, kb: spec.kb, trait, team: f.team, life: spec.life
      });
    }
    return out;
  }

  // 공격 상태 진행
  function stepAttack(f, dt, held, rng) {
    const atk = ensureAtk(f);
    const events = [];
    const projectiles = [];
    const cls = (f.weapon && f.weapon.cls) || 'blade';
    if (atk.phase === 'idle') {
      if (atk.comboT > 0) {
        atk.comboT -= dt;
        if (atk.comboT <= 0) { atk.comboT = 0; atk.step = 0; }
      }
      return { events, projectiles };
    }
    atk.t -= dt;
    while (atk.t <= 0 && atk.phase !== 'idle') {
      const spec = getSpec(f);
      if (atk.phase === 'windup') {
        atk.phase = 'active';
        atk.t += spec.active;
        atk.hit = false;
        if (cls === 'blade') {
          const aim = f.aim || 0;
          events.push({ type: 'swing', step: atk.step, x: f.x, y: f.y, aim });
          f.x += Math.cos(aim) * spec.lunge * LUNGE_STEP;
          f.y += Math.sin(aim) * spec.lunge * LUNGE_STEP;
        } else {
          atk.shots = (atk.shots || 0) + 1;
          events.push({ type: 'shoot', cls, x: f.x, y: f.y, aim: f.aim || 0 });
          const shots = fire(f, rng);
          for (let i = 0; i < shots.length; i++) projectiles.push(shots[i]);
        }
      } else if (atk.phase === 'active') {
        atk.phase = 'recovery';
        atk.t += spec.recovery;
        atk.hit = false;
      } else if (atk.phase === 'recovery') {
        if (cls === 'blade' && atk.queued) {
          atk.queued = false;
          atk.step = (atk.step + 1) % WEAPONS.blade.steps.length;
          atk.phase = 'windup';
          atk.t += getSpec(f).windup;
        } else if (cls !== 'blade' && spec.auto && held) {
          atk.phase = 'windup';
          atk.t += spec.windup;
        } else {
          atk.phase = 'idle';
          atk.t = 0;
          if (cls === 'blade') atk.comboT = WEAPONS.blade.comboReset;
        }
      } else {
        atk.phase = 'idle';
        atk.t = 0;
      }
    }
    return { events, projectiles };
  }

  // 블레이드 근접 적중 판정 (active당 1회)
  function meleeHits(f, targets) {
    const atk = ensureAtk(f);
    if (atk.phase !== 'active' || atk.hit) return [];
    atk.hit = true;
    const spec = WEAPONS.blade.steps[atk.step || 0] || WEAPONS.blade.steps[0];
    const trait = (f.weapon && f.weapon.trait) || 'r';
    const tr = getTrait(trait);
    const dmg = Math.round(spec.damage * tr.mult);
    const kbMag = spec.knockback * tr.kbMult;
    const aim = f.aim || 0;
    const events = [];
    for (let i = 0; i < targets.length; i++) {
      const tg = targets[i];
      if (!tg || tg.team === f.team) continue;
      const dx = tg.x - f.x;
      const dy = tg.y - f.y;
      const d = Math.hypot(dx, dy);
      if (d > spec.range + (tg.r || 0)) continue;
      if (spec.arc < Math.PI && Math.abs(clampAng(Math.atan2(dy, dx) - aim)) > spec.arc) continue;
      const ux = d > 0 ? dx / d : Math.cos(aim);
      const uy = d > 0 ? dy / d : Math.sin(aim);
      events.push({
        type: 'hit', target: targetTag(tg), dmg, x: tg.x, y: tg.y,
        kb: { x: ux * kbMag, y: uy * kbMag }, trait, crit: !!spec.crit
      });
    }
    return events;
  }

  function inCover(x, y, covers) {
    if (!covers) return false;
    for (let i = 0; i < covers.length; i++) {
      const c = covers[i];
      if (x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h) return true;
    }
    return false;
  }

  // 탄 이동 및 벽·엄폐물·대상 충돌 처리
  function stepProjectiles(list, targets, covers, world, dt) {
    const w = (world && world.w) || 720;
    const h = (world && world.h) || 1100;
    const next = [];
    const events = [];
    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      const np = {
        x: p.x + p.vx * dt, y: p.y + p.vy * dt, vx: p.vx, vy: p.vy,
        r: p.r, dmg: p.dmg, kb: p.kb, trait: p.trait, team: p.team, life: p.life - dt
      };
      if (np.life <= 0) continue;
      if (np.x < WALL || np.x > w - WALL || np.y < WALL || np.y > h - WALL) continue;
      if (inCover(np.x, np.y, covers)) continue;
      let hit = false;
      for (let j = 0; j < targets.length; j++) {
        const tg = targets[j];
        if (!tg || tg.team === np.team) continue;
        if (Math.hypot(tg.x - np.x, tg.y - np.y) < np.r + (tg.r || 0)) {
          const tr = getTrait(np.trait);
          const sp = Math.hypot(np.vx, np.vy) || 1;
          const kbMag = np.kb * tr.kbMult;
          events.push({
            type: 'hit', target: targetTag(tg), dmg: Math.round(np.dmg * tr.mult), x: np.x, y: np.y,
            kb: { x: (np.vx / sp) * kbMag, y: (np.vy / sp) * kbMag }, trait: np.trait, crit: false
          });
          hit = true;
          break;
        }
      }
      if (!hit) next.push(np);
    }
    return { list: next, events };
  }

  // 속성 상태이상 적용 및 넉백 배수 반환
  function applyTrait(f, trait, dmg) {
    const tr = getTrait(trait);
    if (!f) return tr.kbMult;
    if (tr.burnDur > 0) {
      const nextDps = (dmg * tr.burnRatio) / tr.burnDur;
      f.burnT = tr.burnDur;
      if (!f.burnDps || nextDps > f.burnDps) f.burnDps = nextDps;
    }
    if (tr.slowDur > 0) { f.slowT = tr.slowDur; f.slowMult = tr.slowMult; }
    if (tr.stunDur > 0) f.stunT = Math.max(f.stunT || 0, tr.stunDur);
    return tr.kbMult;
  }

  const root = typeof window !== 'undefined' ? window : globalThis;
  root.ArenaWeapons = Object.freeze({
    WEAPONS, TRAITS, traitTotal, dps, fromShop, fromCfg,
    startAttack, stepAttack, fire, meleeHits, stepProjectiles, applyTrait
  });
})();
