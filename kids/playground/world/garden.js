// garden.js — 초안: 안티그래비티 Hydrogen, 검토: Claude (docs/world_module_spec.md §14)
(function () {
  'use strict';

  const root = typeof window !== 'undefined' ? window : globalThis;

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function el(id) {
    return document.getElementById(id);
  }

  function boot() {
    const stage = el('stage');
    const cv = el('cv');
    const exitBtn = el('exitBtn');
    const titleEl = el('title');
    const keysEl = el('keys');
    const canEl = el('can');
    const toastEl = el('toast');
    const foundEl = el('found');
    const foundImg = el('foundImg');
    const foundName = el('foundName');
    const foundBirth = el('foundBirth');
    const toRoom = el('toRoom');
    const keepLooking = el('keepLooking');

    const child = WorldSave.childOf() || 'son';
    const isSlime = child === 'daughter';
    stage.classList.toggle('theme--slime', isSlime);
    stage.classList.toggle('theme--arcade', !isSlime);
    titleEl.textContent = '🌿 ' + (isSlime ? '민서' : '민수') + '의 비밀 정원';

    exitBtn.addEventListener('click', () => {
      location.href = 'hub.html';
    });
    toRoom.addEventListener('click', () => {
      location.href = '../../common_space/my-room.html';
    });
    keepLooking.addEventListener('click', () => {
      foundEl.hidden = true;
    });

    document.addEventListener('pointerdown', () => {
      WorldSFX.unlock();
    }, { once: true, passive: true });

    const rng = mulberry32(Date.now() ^ (isSlime ? 0x2222 : 0x1111));
    const V = { w: 360, h: 640 };
    const m = WorldView.mount(cv, () => {
      V.w = m.view.w;
      V.h = m.view.h;
    });
    V.w = m.view.w;
    V.h = m.view.h;

    const fx = WorldFX.createFx();
    let t = 0;
    let state = {};
    let keysCount = 0;
    let spots = [];
    let walkers = [];
    let idMap = new Map();
    let itemById = new Map();
    let openedAny = false;
    let pullDone = false;
    let toastTimer = 0;
    let bumpTimer = 0;
    let dragging = false;
    let dragX = 0;
    let dragY = 0;
    let waterFxT = 0;

    function showToast(msg) {
      toastEl.textContent = msg;
      toastEl.hidden = false;
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => {
        toastEl.hidden = true;
      }, 2600);
      if (isSlime && typeof root.speakFairyTTS === 'function') {
        root.speakFairyTTS(msg, { skipPreset: true });
      }
    }

    function bumpKeys() {
      keysEl.classList.remove('is-bump');
      void keysEl.offsetWidth;
      keysEl.classList.add('is-bump');
      clearTimeout(bumpTimer);
      bumpTimer = setTimeout(() => {
        keysEl.classList.remove('is-bump');
      }, 600);
    }

    function addWalker(item, sid) {
      const cfg = WorldSave.parseCfg(state.cfg && state.cfg[sid]);
      const p = (cfg && cfg.p) || 'a';
      const w = HubLogic.createFriend(item, sid, p, rng, { w: V.w, h: V.h });
      w.sprite = null;
      walkers.push(w);
      WorldSprites.load(item, 96).then((sp) => {
        if (sp) w.sprite = sp;
      });
    }

    function setup() {
      state = WorldSave.load(child) || {};
      keysCount = Number(state.keys) || 0;
      keysEl.textContent = '🔑 ' + keysCount;

      const gallery = Array.isArray(root.DEFAULT_GALLERY_DATA) ? root.DEFAULT_GALLERY_DATA : [];
      const charsOf = root.MonsterRoster && typeof root.MonsterRoster.charactersOf === 'function'
        ? root.MonsterRoster.charactersOf
        : () => [];
      const items = WorldSprites.collect({
        items: gallery,
        charactersOf: charsOf,
        roster: {},
        order: [],
        child,
        guest: false,
        root: '../../../'
      }) || [];

      itemById = new Map();
      for (let i = 0; i < items.length; i++) {
        itemById.set(items[i].id, items[i]);
      }
      idMap = WorldSave.assignIds(items.map((it) => it.id));

      const foundArr = Array.isArray(state.found) ? state.found : [];
      const b = GardenLogic.baseline(items, foundArr, idMap);
      if (b.toFound && b.toFound.length) {
        state = WorldSave.update(child, (s) => {
          const cur = Array.isArray(s.found) ? s.found : [];
          return Object.assign({}, s, { found: Array.from(new Set(cur.concat(b.toFound))) });
        });
      }

      const hidden = Array.isArray(b.hidden) ? b.hidden : [];
      // 「🥚 알」(§17): 이 기기가 기억하는 알의 작품 id면 알 자리로 숨긴다 (Claude)
      const eggArt = root.WorldEggs ? root.WorldEggs.known(child) : [];
      spots = GardenLogic.plan(hidden, rng, eggArt).map((sp) => Object.assign({}, sp, { shakeT: 0, openT: -9 }));
      if (hidden.length === 0) {
        showToast('새 친구가 오면 여기 숨어 있을 거야!');
      }

      walkers = [];
      const latestFound = Array.isArray(state.found) ? state.found : [];
      const foundSet = new Set(latestFound);
      for (let i = 0; i < items.length && walkers.length < 4; i++) {
        const sid = idMap.get(items[i].id);
        if (sid && foundSet.has(sid)) {
          addWalker(items[i], sid);
        }
      }
    }

    function clientToNorm(cx, cy) {
      const rect = cv.getBoundingClientRect();
      const sx = cx - rect.left;
      const sy = cy - rect.top;
      const scale = m.view.scale || 1;
      const wp = WorldView.toWorld({ x: 0, y: 0 }, scale, sx, sy);
      return { x: wp.x / (V.w || 1), y: wp.y / (V.h || 1) };
    }

    function reveal(spot, content) {
      openedAny = true;
      spot.openT = t;
      const px = spot.x * V.w;
      const py = spot.y * V.h;
      if (!content) return;

      if (content.type === 'friend') {
        const fid = content.id || content.itemId;
        const item = itemById.get(fid);
        const sid = idMap.get(fid);
        if (sid) {
          state = WorldSave.update(child, (s) => {
            const cur = Array.isArray(s.found) ? s.found : [];
            if (cur.indexOf(sid) >= 0) return s;
            return Object.assign({}, s, { found: cur.concat([sid]) });
          });
        }
        const titleEl = foundEl.querySelector('.garden-found__title');
        if (titleEl) titleEl.textContent = content.egg ? '🐣 알에서 깨어났어!' : '✨ 새로운 친구 발견!';
        foundImg.src = item ? item.src : '';
        foundImg.alt = item ? item.name : '';
        foundName.textContent = item ? item.name : '';
        foundBirth.textContent = (item && HubLogic.birthText(item)) || '';
        foundEl.hidden = false;
        WorldSFX.play('levelup');
        fx.burst('star', px, py, 24);
        fx.flash(200);
        if (isSlime && typeof root.speakFairyTTS === 'function') {
          root.speakFairyTTS('새로운 친구 발견! ' + (item ? item.name : ''), { skipPreset: true });
        }
        if (item && sid) addWalker(item, sid);
        return;
      }

      if (content.type === 'key') {
        keysCount += 1;
        state = WorldSave.update(child, (s) => Object.assign({}, s, { keys: keysCount }));
        keysEl.textContent = '🔑 ' + keysCount;
        bumpKeys();
        showToast('🔑 열쇠를 찾았어!');
        WorldSFX.play('chime');
        fx.burst('star', px, py, 10);
        return;
      }

      if (content.deco === 'butterfly') {
        fx.burst('wind', px, py, 12);
      } else if (content.deco === 'flower') {
        fx.burst('star', px, py, 12);
      } else {
        fx.burst('star', px, py, 16);
      }
      WorldSFX.play('xylo', Math.floor(rng() * 5));
    }

    stage.addEventListener('click', (e) => {
      if (!foundEl.hidden) return;
      if (e.target.closest('#tools, #hud, #found, button')) return;
      const np = clientToNorm(e.clientX, e.clientY);
      const spot = GardenLogic.nearest(spots, np.x, np.y);
      if (!spot) return;

      if (spot.kind === 'bush' || (spot.content && spot.content.egg)) {
        const r = GardenLogic.tap(spot);
        if (!r) return;
        if (r.shake) {
          spot.shakeT = 0.3;
          WorldSFX.play('pop');
          fx.burst('dust', spot.x * V.w, spot.y * V.h, 6);
        }
        if (r.open) reveal(spot, r.content);
      } else if (spot.kind === 'bud') {
        showToast('💧 물뿌리개를 끌어다 줘!');
      } else if (spot.kind === 'pool') {
        const r = GardenLogic.unlock(spot, keysCount);
        if (!r) return;
        if (r.need) {
          showToast('🔑 열쇠가 필요해! 덤불을 톡톡 해 봐');
        } else if (r.open) {
          keysCount = r.keys;
          state = WorldSave.update(child, (s) => Object.assign({}, s, { keys: keysCount }));
          keysEl.textContent = '🔑 ' + keysCount;
          reveal(spot, r.content);
        }
      }
    });

    function stopDrag() {
      if (!dragging) return;
      dragging = false;
      canEl.classList.remove('is-dragging');
      canEl.style.position = '';
      canEl.style.left = '';
      canEl.style.top = '';
      canEl.style.transform = '';
      canEl.style.zIndex = '';
    }

    canEl.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      dragging = true;
      dragX = e.clientX;
      dragY = e.clientY;
      waterFxT = 0.1;
      canEl.classList.add('is-dragging');
      canEl.style.position = 'fixed';
      canEl.style.left = dragX + 'px';
      canEl.style.top = dragY + 'px';
      canEl.style.transform = 'translate(-50%, -50%)';
      canEl.style.zIndex = '30';
      try {
        canEl.setPointerCapture(e.pointerId);
      } catch (_) {}
    });

    canEl.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      dragX = e.clientX;
      dragY = e.clientY;
      canEl.style.left = dragX + 'px';
      canEl.style.top = dragY + 'px';
    });
    canEl.addEventListener('pointerup', stopDrag);
    canEl.addEventListener('pointercancel', stopDrag);

    function drawBg(ctx, w, h) {
      if (isSlime) {
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, '#eafff4');
        g.addColorStop(1, '#d7f7e1');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 18; i++) {
          const x = ((i * 97 + 41) % 100) * 0.01 * w;
          const y = ((i * 61 + 23) % 100) * 0.01 * h;
          ctx.fillStyle = i % 3 === 0 ? '#f472b6' : '#86efac';
          ctx.beginPath();
          ctx.arc(x, y, i % 3 === 0 ? 4 : 3, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        ctx.fillStyle = '#0b1020';
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = 'rgba(34, 211, 238, 0.12)';
        ctx.lineWidth = 1;
        const step = 48;
        for (let x = 0; x < w; x += step) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, h);
          ctx.stroke();
        }
        for (let y = 0; y < h; y += step) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }
        ctx.fillStyle = 'rgba(56, 189, 248, 0.14)';
        for (let i = 0; i < 4; i++) {
          const px = (0.14 + i * 0.24) * w;
          const py = (i % 2 === 0 ? 0.22 : 0.72) * h;
          ctx.fillRect(px - 10, py - 24, 20, 48);
        }
      }
    }

    function drawSpot(ctx, sp, R) {
      const x = sp.x * V.w;
      const y = sp.y * V.h;
      const shake = sp.shakeT > 0 ? Math.sin(t * 48) * 6 * (sp.shakeT / 0.3) : 0;
      ctx.save();
      ctx.translate(x + shake, y);

      if (!sp.open && sp.content && sp.content.egg) { // 🥚 알 자리: 흔들리는 알, 톡톡 횟수만큼 금
        const wob = Math.sin(t * 3 + sp.i) * 0.12;
        ctx.rotate(wob);
        ctx.fillStyle = 'rgba(0,0,0,0.12)';
        ctx.beginPath(); ctx.ellipse(0, R * 0.62, R * 0.55, R * 0.14, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = isSlime ? '#fff7e6' : '#f1f5f9';
        ctx.strokeStyle = isSlime ? '#f4a261' : '#00e5ff'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(0, 0, R * 0.55, R * 0.72, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = isSlime ? '#ffb4c8' : '#7dd3fc';
        [[-0.2, -0.25], [0.22, 0.05], [-0.1, 0.32]].forEach((d) => {
          ctx.beginPath(); ctx.arc(d[0] * R, d[1] * R, R * 0.09, 0, Math.PI * 2); ctx.fill();
        });
        if (sp.taps > 0) {
          ctx.strokeStyle = '#7c4a1e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-R * 0.3, -R * 0.1);
          for (let k = 0; k < sp.taps * 2; k++) ctx.lineTo(-R * 0.3 + (k + 1) * R * 0.12, (k % 2 ? -0.1 : 0.05) * R);
          ctx.stroke();
        }
        ctx.restore();
        return;
      }

      if (sp.kind === 'bush') {
        const c1 = isSlime ? '#22c55e' : '#059669';
        const c2 = isSlime ? '#4ade80' : '#10b981';
        if (sp.open) {
          for (let d = -1; d <= 1; d += 2) {
            ctx.fillStyle = c1;
            ctx.beginPath();
            ctx.arc(d * R * 0.55, 0, R * 0.52, 0, Math.PI * 2);
            ctx.fill();
          }
        } else {
          ctx.fillStyle = c1;
          ctx.beginPath();
          ctx.arc(-R * 0.38, R * 0.1, R * 0.5, 0, Math.PI * 2);
          ctx.arc(R * 0.38, R * 0.1, R * 0.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = c2;
          ctx.beginPath();
          ctx.arc(0, -R * 0.16, R * 0.58, 0, Math.PI * 2);
          ctx.fill();
          for (let i = 0; i < (sp.taps || 0); i++) {
            ctx.fillStyle = '#bbf7d0';
            ctx.beginPath();
            ctx.ellipse((i - 0.5) * 14, R * 0.65 + i * 4, 5, 3, 0.4, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      } else if (sp.kind === 'bud') {
        ctx.strokeStyle = isSlime ? '#16a34a' : '#2dd4bf';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(0, R * 0.7);
        ctx.lineTo(0, 0);
        ctx.stroke();
        if (sp.open) {
          ctx.fillStyle = '#f472b6';
          for (let i = 0; i < 6; i++) {
            const a = (i * Math.PI) / 3;
            ctx.beginPath();
            ctx.arc(Math.cos(a) * R * 0.36, -R * 0.15 + Math.sin(a) * R * 0.36, R * 0.24, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.fillStyle = '#facc15';
          ctx.beginPath();
          ctx.arc(0, -R * 0.15, R * 0.22, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = '#ec4899';
          ctx.beginPath();
          ctx.ellipse(0, -R * 0.15, R * 0.32, R * 0.44, 0, 0, Math.PI * 2);
          ctx.fill();
          if ((sp.water || 0) > 0) {
            const bw = R * 1.1;
            ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
            ctx.fillRect(-bw * 0.5, R * 0.76, bw, 7);
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(-bw * 0.5, R * 0.76, bw * Math.min(1, sp.water), 7);
          }
        }
      } else {
        ctx.fillStyle = sp.open ? 'rgba(125, 211, 252, 0.55)' : 'rgba(56, 189, 248, 0.4)';
        ctx.beginPath();
        ctx.ellipse(0, R * 0.1, R * 0.85, R * 0.48, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#bae6fd';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = Math.round(R * 0.65) + 'px sans-serif';
        ctx.fillText(sp.open ? '✨' : '🔒', 0, R * 0.05);
      }
      ctx.restore();
    }

    function drawWalker(ctx, w) {
      WorldFX.shadow(ctx, w.x, w.y, 44);
      const b = WorldFX.body({ t, landedAt: w.landedAt, hitAt: w.hitAt });
      ctx.save();
      ctx.translate(w.x, w.y);
      ctx.scale((w.face || 1) * b.sx, b.sy);
      if (w.sprite && w.sprite.canvas) {
        const sc = 64 / (w.sprite.canvas.height || 64);
        const dw = w.sprite.canvas.width * sc;
        ctx.drawImage(w.sprite.canvas, -dw * 0.5, -64, dw, 64);
      } else {
        ctx.fillStyle = '#a7f3d0';
        ctx.beginPath();
        ctx.arc(0, -24, 20, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    function update(dt) {
      t += dt;
      const d = fx.step(dt);
      V.w = m.view.w;
      V.h = m.view.h;

      for (let i = 0; i < spots.length; i++) {
        if (spots[i].shakeT > 0) spots[i].shakeT = Math.max(0, spots[i].shakeT - d);
      }

      if (dragging) {
        const np = clientToNorm(dragX, dragY);
        const bud = GardenLogic.nearest(spots, np.x, np.y, 0.12);
        if (bud && bud.kind === 'bud' && !bud.open) {
          const r = GardenLogic.water(bud, d * 0.9);
          waterFxT += d;
          if (waterFxT >= 0.1) {
            waterFxT = 0;
            fx.burst('ice', bud.x * V.w, bud.y * V.h, 2);
          }
          if (r && r.open) reveal(bud, r.content);
        }
      }

      const far = { x: -999, y: -999 };
      for (let i = 0; i < walkers.length; i++) {
        HubLogic.stepFriend(walkers[i], far, d, rng, V, t);
      }
    }

    function render() {
      V.w = m.view.w;
      V.h = m.view.h;
      const ctx = m.ctx;
      const off = fx.offset();
      ctx.save();
      ctx.translate(off.x, off.y);
      drawBg(ctx, V.w, V.h);
      const R = Math.min(V.w, V.h) * 0.11;
      for (let i = 0; i < spots.length; i++) {
        drawSpot(ctx, spots[i], R);
      }
      for (let i = 0; i < walkers.length; i++) {
        drawWalker(ctx, walkers[i]);
      }
      ctx.restore();
      fx.draw(ctx);
    }

    setup();
    const loop = WorldView.createLoop({ update, render });
    loop.start();

    WorldSave.pull(child).then(() => {
      if (!pullDone && !openedAny) {
        pullDone = true;
        setup();
      }
    }).catch(() => {});

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) loop.stop();
      else loop.start();
    });
  }

  root.GardenUI = Object.freeze({ boot });
})();
