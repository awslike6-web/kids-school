// arena-render.js — 초안: 안티그래비티 Hydrogen, 검토: Claude (docs/world_module_spec.md §12)
(function (root) {
  'use strict';

  var TRAIT_COLORS = Object.freeze({
    r: '#ffffff',
    f: '#ff8c1a',
    i: '#7fd6ff',
    l: '#ffe14d',
    w: '#7dff8a',
    x: '#c86bff'
  });

  var PALETTES = {
    arcade: {
      bg: '#0b1020',
      grid: 'rgba(0,229,255,.12)',
      wall: '#1b2440',
      cover: '#24345c',
      coverLine: '#00e5ff',
      me: '#00ff9d',
      foe: '#ff3366',
      boss: '#ff5c5c'
    },
    slime: {
      bg: '#eafff4',
      grid: 'rgba(255,140,180,.18)',
      wall: '#ffd6e7',
      cover: '#ffe9f2',
      coverLine: '#ff8fb8',
      me: '#23c483',
      foe: '#ff6f91',
      boss: '#ff7a59'
    }
  };

  var WALL_T = 24;
  var GRID_STEP = 80;

  function drawStar(ctx, x, y, r) {
    var i, a, rad;
    ctx.beginPath();
    for (i = 0; i < 10; i++) {
      a = -Math.PI / 2 + i * (Math.PI / 5);
      rad = i % 2 === 0 ? r : r * 0.45;
      if (i === 0) ctx.moveTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
      else ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
    }
    ctx.closePath();
    ctx.fill();
  }

  function drawStunStars(ctx, x, y, r, t) {
    var i, a;
    ctx.save();
    ctx.fillStyle = '#ffe14d';
    for (i = 0; i < 3; i++) {
      a = t * 5 + i * ((Math.PI * 2) / 3);
      drawStar(ctx, x + Math.cos(a) * r * 0.8, y + Math.sin(a) * r * 0.28, 5.5);
    }
    ctx.restore();
  }

  function drawLabel(ctx, text, x, y, size, color) {
    ctx.save();
    ctx.font = 'bold ' + size + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(10,14,26,0.85)';
    ctx.strokeText(text, x, y);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  function drawGridAndWalls(ctx, world, pal) {
    var w = world.w, h = world.h, x, y;
    ctx.save();
    ctx.strokeStyle = pal.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (x = GRID_STEP; x < w; x += GRID_STEP) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    for (y = GRID_STEP; y < h; y += GRID_STEP) {
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();

    ctx.fillStyle = pal.wall;
    ctx.fillRect(0, 0, w, WALL_T);
    ctx.fillRect(0, h - WALL_T, w, WALL_T);
    ctx.fillRect(0, WALL_T, WALL_T, h - WALL_T * 2);
    ctx.fillRect(w - WALL_T, WALL_T, WALL_T, h - WALL_T * 2);
    ctx.restore();
  }

  function drawCovers(ctx, covers, pal) {
    var i, c;
    if (!covers || !covers.length) return;
    ctx.save();
    ctx.fillStyle = pal.cover;
    ctx.strokeStyle = pal.coverLine;
    ctx.lineWidth = 2;
    for (i = 0; i < covers.length; i++) {
      c = covers[i];
      ctx.fillRect(c.x, c.y, c.w, c.h);
      ctx.strokeRect(c.x, c.y, c.w, c.h);
    }
    ctx.restore();
  }

  function drawHazards(ctx, hazards, t) {
    var i, h, ratio, alpha;
    if (!hazards || !hazards.length) return;
    for (i = 0; i < hazards.length; i++) {
      h = hazards[i];
      ctx.save();
      if (h.kind === 'zone') {
        if (h.armT > 0) {
          ctx.setLineDash([8, 6]);
          ctx.strokeStyle = 'rgba(255,60,90,0.85)';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(h.x, h.y, h.r, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          if (h.maxArmT && h.maxArmT > 0) {
            ratio = Math.max(0, Math.min(1, 1 - h.armT / h.maxArmT));
            ctx.fillStyle = 'rgba(255,50,80,0.28)';
            ctx.beginPath();
            ctx.arc(h.x, h.y, h.r * ratio, 0, Math.PI * 2);
            ctx.fill();
          } else {
            alpha = 0.16 + 0.14 * Math.sin(t * 14);
            ctx.fillStyle = 'rgba(255,50,80,' + alpha.toFixed(3) + ')';
            ctx.beginPath();
            ctx.arc(h.x, h.y, h.r, 0, Math.PI * 2);
            ctx.fill();
          }
        } else {
          ctx.fillStyle = 'rgba(220,24,60,0.55)';
          ctx.strokeStyle = '#ff4d6d';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(h.x, h.y, h.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      } else if (h.kind === 'orb') {
        ctx.shadowBlur = 16;
        ctx.shadowColor = '#ff3df0';
        ctx.fillStyle = '#ff3df0';
        ctx.beginPath();
        ctx.arc(h.x, h.y, h.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffd6fb';
        ctx.beginPath();
        ctx.arc(h.x, h.y, h.r * 0.45, 0, Math.PI * 2);
        ctx.fill();
      } else if (h.kind === 'ring') {
        ctx.globalAlpha = h.armT > 0 ? 0.35 : 0.85;
        ctx.strokeStyle = '#ff3df0';
        ctx.lineWidth = h.width || 12;
        ctx.beginPath();
        ctx.arc(h.x, h.y, h.r, 0, Math.PI * 2);
        ctx.stroke();
      } else if (h.kind === 'slam') {
        ctx.fillStyle = 'rgba(255,102,0,0.52)';
        ctx.strokeStyle = '#ff944d';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(h.x, h.y, h.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  function drawBossTelegraph(ctx, boss, me, t) {
    var alpha, i, ang, dx, dy, dist, tx, ty;
    if (!boss || boss.state !== 'windup') return;
    alpha = 0.35 + 0.25 * Math.sin(t * 12);
    ctx.save();
    if (boss.pattern === 'charge') {
      ctx.translate(boss.x, boss.y);
      ctx.rotate(boss.aim || 0);
      ctx.fillStyle = 'rgba(255,50,80,' + alpha.toFixed(3) + ')';
      ctx.fillRect(0, -boss.r, 560, boss.r * 2);
      ctx.beginPath();
      ctx.moveTo(560, -boss.r * 1.25);
      ctx.lineTo(590, 0);
      ctx.lineTo(560, boss.r * 1.25);
      ctx.closePath();
      ctx.fill();
    } else if (boss.pattern === 'ring') {
      ctx.strokeStyle = 'rgba(255,50,90,' + (alpha + 0.2).toFixed(3) + ')';
      ctx.lineWidth = 4;
      for (i = 0; i < 5; i++) {
        ang = (boss.aim || 0) + (i - 2) * 0.4;
        ctx.beginPath();
        ctx.moveTo(boss.x, boss.y);
        ctx.lineTo(boss.x + Math.cos(ang) * 440, boss.y + Math.sin(ang) * 440);
        ctx.stroke();
      }
    } else if (boss.pattern === 'slam') {
      tx = boss.x;
      ty = boss.y;
      if (me) {
        dx = me.x - boss.x;
        dy = me.y - boss.y;
        dist = Math.hypot(dx, dy);
        if (dist <= 175) {
          tx = me.x;
          ty = me.y;
        } else if (dist > 0) {
          tx = boss.x + (dx / dist) * 175;
          ty = boss.y + (dy / dist) * 175;
        }
      }
      ctx.setLineDash([10, 8]);
      ctx.strokeStyle = 'rgba(255,120,30,' + (alpha + 0.25).toFixed(3) + ')';
      ctx.fillStyle = 'rgba(255,120,30,' + (alpha * 0.45).toFixed(3) + ')';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(tx, ty, 155, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawWeaponBar(ctx, f) {
    var cls = f.weapon && f.weapon.cls ? f.weapon.cls : 'blade';
    var trait = f.weapon && f.weapon.trait ? f.weapon.trait : 'r';
    var tc = TRAIT_COLORS[trait] || '#ffffff';
    var len = f.r * 1.3, w = 4, col = '#e8f4ff';
    if (cls === 'rifle') {
      len = f.r * 1.65;
      w = 4;
      col = '#cbd5e1';
    } else if (cls === 'shotgun') {
      len = f.r * 1.4;
      w = 8;
      col = '#94a3b8';
    }
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(f.aim || 0);
    ctx.strokeStyle = col;
    ctx.lineWidth = w;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(f.r * 0.45, 0);
    ctx.lineTo(len, 0);
    ctx.stroke();
    ctx.fillStyle = tc;
    ctx.beginPath();
    ctx.arc(len, 0, w * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawFighter(ctx, f, sprite, color, t) {
    var body = WorldFX.body({ t: t, landedAt: f.landedAt || 0, hitAt: f.hitAt || 0 });
    var aim = f.aim || 0;
    var i, dx, dy, len, nx, ny, img, h, w, ex, ey;

    if (f.dashT > 0) {
      dx = f.vx || Math.cos(aim);
      dy = f.vy || Math.sin(aim);
      len = Math.hypot(dx, dy) || 1;
      nx = dx / len;
      ny = dy / len;
      for (i = 1; i <= 2; i++) {
        ctx.save();
        ctx.globalAlpha = i === 1 ? 0.3 : 0.15;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(f.x - nx * f.r * 0.7 * i, f.y - ny * f.r * 0.7 * i, f.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    ctx.save();
    ctx.translate(f.x, f.y + f.r);
    ctx.scale(body.sx, body.sy);
    if (sprite && sprite.canvas) {
      h = f.r * 3.2;
      w = h * ((sprite.canvas.width / sprite.canvas.height) || 1);
      img = body.flash ? WorldFX.silhouette(sprite.canvas) : sprite.canvas;
      ctx.drawImage(img, -w / 2, -h, w, h);
    } else {
      ctx.fillStyle = body.flash ? '#ffffff' : color;
      ctx.beginPath();
      ctx.arc(0, -f.r, f.r, 0, Math.PI * 2);
      ctx.fill();
      ex = Math.cos(aim) * f.r * 0.25;
      ey = -f.r + Math.sin(aim) * f.r * 0.2;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex - f.r * 0.28, ey, f.r * 0.18, 0, Math.PI * 2);
      ctx.arc(ex + f.r * 0.28, ey, f.r * 0.18, 0, Math.PI * 2);
      ctx.fill();
    }
    if (f.slowT > 0) {
      ctx.strokeStyle = '#7fd6ff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, -f.r, f.r + 2, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    drawWeaponBar(ctx, f);

    if (f.shieldT > 0) {
      ctx.save();
      ctx.globalAlpha = 0.35 + 0.2 * Math.sin(t * 14);
      ctx.fillStyle = 'rgba(90,180,255,0.35)';
      ctx.strokeStyle = '#6ec6ff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * 1.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    if (f.burnT > 0) {
      ctx.save();
      ctx.fillStyle = '#ff8c1a';
      for (i = 0; i < 4; i++) {
        dx = Math.sin(t * 7 + i * 1.7) * f.r * 0.7;
        dy = -((t * 30 + i * 9) % (f.r * 1.6));
        ctx.beginPath();
        ctx.arc(f.x + dx, f.y + f.r * 0.4 + dy, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    if (f.stunT > 0) drawStunStars(ctx, f.x, f.y - f.r * 2.1, f.r, t);
    if (f.atk && f.atk.phase === 'reload') {
      drawLabel(ctx, '재장전!', f.x, f.y - f.r * 2.35, 18, '#ffe14d');
    }
  }

  function drawBoss(ctx, boss, sprite, color, t) {
    var body = WorldFX.body({ t: t, landedAt: 0, hitAt: boss.hitAt || 0 });
    var img, h, w;
    ctx.save();
    if (boss.phase === 2) {
      ctx.shadowBlur = 24;
      ctx.shadowColor = '#ff2a2a';
    }
    ctx.translate(boss.x, boss.y + boss.r);
    ctx.scale(body.sx, body.sy);
    if (sprite && sprite.canvas) {
      h = boss.r * 3.4;
      w = h * ((sprite.canvas.width / sprite.canvas.height) || 1);
      img = body.flash ? WorldFX.silhouette(sprite.canvas) : sprite.canvas;
      ctx.drawImage(img, -w / 2, -h, w, h);
    } else {
      ctx.fillStyle = body.flash ? '#ffffff' : color;
      ctx.beginPath();
      ctx.arc(0, -boss.r, boss.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-boss.r * 0.3, -boss.r * 1.05, boss.r * 0.16, 0, Math.PI * 2);
      ctx.arc(boss.r * 0.3, -boss.r * 1.05, boss.r * 0.16, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#1b1020';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-boss.r * 0.5, -boss.r * 1.32);
      ctx.lineTo(-boss.r * 0.12, -boss.r * 1.18);
      ctx.moveTo(boss.r * 0.5, -boss.r * 1.32);
      ctx.lineTo(boss.r * 0.12, -boss.r * 1.18);
      ctx.stroke();
    }
    ctx.restore();

    if (boss.state === 'stunned') {
      drawStunStars(ctx, boss.x, boss.y - boss.r * 2.2, boss.r * 0.75, t);
      drawLabel(ctx, '기절!', boss.x, boss.y - boss.r * 2.55, 20, '#ffe14d');
    }
  }

  function drawProjectiles(ctx, list) {
    var i, p, len, nx, ny, c;
    if (!list || !list.length) return;
    ctx.save();
    ctx.lineCap = 'round';
    for (i = 0; i < list.length; i++) {
      p = list[i];
      c = TRAIT_COLORS[p.trait] || '#ffffff';
      len = Math.hypot(p.vx, p.vy) || 1;
      nx = p.vx / len;
      ny = p.vy / len;
      ctx.strokeStyle = c;
      ctx.lineWidth = Math.max(2, (p.r || 4) * 0.9);
      ctx.beginPath();
      ctx.moveTo(p.x - nx * 20, p.y - ny * 20);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r || 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawMeleeArc(ctx, f, color) {
    var step, steps, range, half, aim, a0, a1;
    if (!f || !f.weapon || f.weapon.cls !== 'blade') return;
    if (!f.atk || f.atk.phase !== 'active') return;
    step = f.atk.step || 0;
    steps = ArenaWeapons && ArenaWeapons.WEAPONS && ArenaWeapons.WEAPONS.blade.steps;
    range = (steps && steps[step] && steps[step].range) || f.r * 2.5;
    aim = f.aim || 0;
    half = step >= 2 ? Math.PI : 1.35;
    a0 = aim - half;
    a1 = aim + half;
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = color;
    ctx.beginPath();
    if (step < 2) ctx.moveTo(f.x, f.y);
    ctx.arc(f.x, f.y, range, a0, a1);
    if (step < 2) ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 0.92;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(f.x, f.y, range, a0, a1);
    ctx.stroke();
    ctx.restore();
  }

  function drawArena(ctx, s, cam, view, t) {
    var pal = PALETTES[s.theme === 'slime' ? 'slime' : 'arcade'];
    var o = s.fx && s.fx.offset ? s.fx.offset() : { x: 0, y: 0 };
    var sprites = s.sprites || {};
    var actors = [];
    var i, a;

    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, view.w, view.h);

    ctx.save();
    ctx.translate(-cam.x + o.x, -cam.y + o.y);

    drawGridAndWalls(ctx, s.world, pal);
    drawCovers(ctx, s.covers, pal);
    drawHazards(ctx, s.hazards, t);
    drawBossTelegraph(ctx, s.boss, s.me, t);

    if (s.me) actors.push({ k: 'f', e: s.me, sp: sprites.me, col: pal.me });
    if (s.foe) actors.push({ k: 'f', e: s.foe, sp: sprites.foe, col: pal.foe });
    if (s.boss) actors.push({ k: 'b', e: s.boss, sp: sprites.boss, col: pal.boss });
    actors.sort(function (u, v) { return u.e.y - v.e.y; });

    for (i = 0; i < actors.length; i++) {
      a = actors[i];
      WorldFX.shadow(ctx, a.e.x, a.e.y + a.e.r * 0.9, a.e.r * (a.k === 'b' ? 1.8 : 1.6));
      if (a.k === 'b') drawBoss(ctx, a.e, a.sp, a.col, t);
      else drawFighter(ctx, a.e, a.sp, a.col, t);
    }

    drawProjectiles(ctx, s.projectiles);
    drawMeleeArc(ctx, s.me, pal.me);
    drawMeleeArc(ctx, s.foe, pal.foe);

    if (s.fx && s.fx.draw) s.fx.draw(ctx);
    ctx.restore();
  }

  function drawOffscreen(ctx, view, cam, things, t) {
    var i, th, sx, sy, px, py, ang, alpha, pad = 24;
    if (!things || !things.length) return;
    alpha = 0.6 + 0.4 * Math.sin(t * 10);
    ctx.save();
    ctx.globalAlpha = alpha;
    for (i = 0; i < things.length; i++) {
      th = things[i];
      sx = th.x - cam.x;
      sy = th.y - cam.y;
      if (sx >= 0 && sx <= view.w && sy >= 0 && sy <= view.h) continue;
      px = Math.max(pad, Math.min(view.w - pad, sx));
      py = Math.max(pad, Math.min(view.h - pad, sy));
      ang = Math.atan2(sy - py, sx - px);
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(ang);
      ctx.fillStyle = th.color || '#ffffff';
      ctx.beginPath();
      ctx.moveTo(8, 0);
      ctx.lineTo(-8, -7);
      ctx.lineTo(-8, 7);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  function drawCheer(ctx, list, t, jumpAt, view) {
    var n = Math.min(2, (list && list.length) || 0);
    var dt = t - jumpAt;
    var jumpY = 0;
    var i, item, c, h = 54, w, x = view.w - 12, baseY = 72 + h, sway;
    if (!n) return;
    if (dt >= 0 && dt < 0.4) {
      jumpY = 4 * (dt / 0.4) * (1 - dt / 0.4) * 16;
    }
    for (i = 0; i < n; i++) {
      item = list[i];
      c = item && item.canvas;
      if (!c) continue;
      w = h * ((c.width / c.height) || 1);
      x -= w;
      sway = Math.sin(t * 6 + i * 1.4) * 0.08;
      ctx.save();
      ctx.translate(x + w / 2, baseY - jumpY);
      ctx.rotate(sway);
      ctx.drawImage(c, -w / 2, -h, w, h);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(w * 0.35, -h * 0.3);
      ctx.lineTo(w * 0.35, -h * 0.95);
      ctx.stroke();
      ctx.fillStyle = i === 0 ? '#ffe14d' : '#ff6f91';
      ctx.beginPath();
      ctx.moveTo(w * 0.35, -h * 0.95);
      ctx.lineTo(w * 0.35 + 11, -h * 0.85 + Math.sin(t * 10 + i) * 2);
      ctx.lineTo(w * 0.35, -h * 0.75);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      x -= 8;
    }
  }

  root.ArenaRender = Object.freeze({
    drawArena: drawArena,
    drawOffscreen: drawOffscreen,
    drawCheer: drawCheer,
    TRAIT_COLORS: TRAIT_COLORS
  });
}(window));
