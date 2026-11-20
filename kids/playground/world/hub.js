// hub.js — 초안: 안티그래비티 Hydrogen, 검토: Claude (docs/world_module_spec.md §13)
(function () {
  'use strict';
  const root = typeof window !== 'undefined' ? window : globalThis;
  const CFG_P = [
    { id: 'a', label: '⚡활발' }, { id: 's', label: '💤느긋' },
    { id: 'm', label: '🎵흥부자' }, { id: 'h', label: '🙈수줍' }
  ];
  const XYLO = { a: 0, s: 1, m: 2, h: 3 };
  const PAL = {
    arcade: { bg: '#0b1020', road: '#16213e', accent: '#00e5ff', dot: 'rgba(0,229,255,0.16)' },
    slime: { bg: '#eafff4', road: '#ffe4ef', accent: '#ff8fb8', dot: 'rgba(255,143,184,0.22)' }
  };

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
  const el = (id) => document.getElementById(id);

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function boot() {
    const child = WorldSave.childOf() || 'son';
    const isDaughter = child === 'daughter';
    const pal = isDaughter ? PAL.slime : PAL.arcade;
    const rng = mulberry32(isDaughter ? 202502 : 202501);
    const stageEl = el('stage');
    const cvEl = el('cv');
    const titleEl = el('title');
    const toastEl = el('toast');
    const sheetEl = el('sheet');
    const mapEl = el('map');
    const mapCv = el('mapCv');
    const guestBtn = el('guestBtn');

    if (isDaughter) {
      stageEl.classList.remove('theme--arcade');
      stageEl.classList.add('theme--slime');
    }
    titleEl.textContent = '🌍 ' + (isDaughter ? '민서' : '민수') + '의 광장';
    el('exitBtn').addEventListener('click', () => { location.href = '../../../lobby.html'; });
    stageEl.addEventListener('pointerdown', () => { WorldSFX.unlock(); }, { once: true });

    const m = WorldView.mount(cvEl, () => {});
    const input = WorldInput.attach(stageEl);
    const fx = WorldFX.createFx();
    const sprites = {};
    const me = { x: 540, y: 900, face: 1, landedAt: -9, hitAt: -9, item: null, shortId: null };
    let friends = [];
    let newSet = new Set();
    let cam = WorldView.follow({ x: 0, y: 0 }, me, m.view, HubLogic.WORLD, 1);
    let portal = null;
    let t = 0;
    let toastTimer = 0;
    let bdayDone = false;
    let navigating = false;
    let downPos = null;
    let loop = null;

    function showToast(msg) {
      clearTimeout(toastTimer);
      toastEl.textContent = msg;
      toastEl.hidden = false;
      toastTimer = setTimeout(() => { toastEl.hidden = true; }, 1600);
    }

    function closeSheet() {
      sheetEl.hidden = true;
      sheetEl.textContent = '';
    }

    function openSheet(f) {
      closeSheet();
      const name = (f.item && (f.item.name || f.item.title)) || f.name || '친구';
      const h2 = document.createElement('h2');
      h2.className = 'hub-sheet__title';
      h2.textContent = name + '의 성격';
      const row = document.createElement('div');
      row.className = 'hub-sheet__row';
      CFG_P.forEach((opt) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'world-chip' + (f.p === opt.id ? ' is-on' : '');
        btn.textContent = opt.label;
        btn.addEventListener('click', () => {
          WorldSave.update(child, (s) => {
            const cfg = Object.assign({}, s.cfg);
            const prev = WorldSave.parseCfg(cfg[f.shortId] || '');
            cfg[f.shortId] = WorldSave.formatCfg(Object.assign({}, prev, { p: opt.id }));
            return Object.assign({}, s, { cfg });
          });
          f.p = opt.id;
          closeSheet();
          WorldSFX.play('pop');
        });
        row.appendChild(btn);
      });
      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'world-btn';
      const lbl = document.createElement('span');
      lbl.className = 'world-btn__label';
      lbl.textContent = '닫기';
      closeBtn.appendChild(lbl);
      closeBtn.addEventListener('click', closeSheet);
      sheetEl.appendChild(h2);
      sheetEl.appendChild(row);
      sheetEl.appendChild(closeBtn);
      sheetEl.hidden = false;
    }

    function loadSprite(it) {
      if (!it || sprites[it.id]) return;
      WorldSprites.load(it, 128).then((res) => { if (res) sprites[it.id] = res; });
    }

    function buildFriends() {
      const state = WorldSave.load(child) || {};
      const mr = root.MonsterRoster || {};
      const items = WorldSprites.collect({
        items: root.DEFAULT_GALLERY_DATA || [],
        charactersOf: mr.charactersOf,
        roster: mr.MONSTER_ROSTER,
        order: mr.MONSTER_ORDER,
        child,
        guest: !!state.guest,
        root: '../../../'
      });
      const idMap = WorldSave.assignIds(items.map((it) => it.id));
      WorldSave.setLiveIds(items.map((it) => idMap.get(it.id)).filter(Boolean));
      const loadoutMe = state.arena && state.arena.loadout && state.arena.loadout.me;
      const meItem = items.find((it) => idMap.get(it.id) === loadoutMe) ||
        items.find((it) => it.kind === 'gallery') || null;
      me.item = meItem;
      me.shortId = meItem ? idMap.get(meItem.id) : null;
      loadSprite(meItem);

      const others = items.filter((it) => it !== meItem);
      const gal = others.filter((it) => it.kind === 'gallery').slice(0, 12);
      // 갤러리에 같은 이름 캐릭터가 있으면 몬스터 쪽은 빼서 같은 친구가 둘 돌아다니지 않게 (Claude 수정)
      const galNames = new Set(items.filter((it) => it.kind === 'gallery').map((it) => it.name));
      const mon = child === 'son' ? others.filter((it) => it.kind === 'monster' && !galNames.has(it.name)) : [];
      const list = gal.concat(mon);
      const cfgMap = state.cfg || {};
      friends = list.map((it) => {
        const sid = idMap.get(it.id);
        const p = WorldSave.parseCfg(cfgMap[sid] || '').p || 'a';
        const f = HubLogic.createFriend(it, sid, p, rng, HubLogic.WORLD);
        if (!f.item) f.item = it;
        if (!f.shortId) f.shortId = sid;
        loadSprite(it);
        return f;
      });
      const fresh = WorldSprites.newFriends(items, state.seen || [], idMap);
      newSet = new Set(fresh.map((it) => it.id));

      if (!bdayDone) {
        const today = HubLogic.todayLocal();
        const bFriend = friends.find((f) => f.item && HubLogic.isAnniversary(f.item.date, today));
        if (bFriend) {
          bdayDone = true;
          const bName = bFriend.item.name || bFriend.item.title || '친구';
          showToast('🎂 ' + bName + ' 태어난 날이에요!');
          for (let i = 0; i < 3; i++) {
            fx.burst('star', bFriend.x + (i - 1) * 26, bFriend.y - 42 - (i % 2) * 22, 16);
          }
        }
      }
    }

    function drawMap() {
      const ctx = mapCv.getContext('2d');
      const fit = HubLogic.mapFit(HubLogic.WORLD, 300, 440);
      const sc = fit.scale !== undefined ? fit.scale : (fit.s !== undefined ? fit.s : 1);
      const ox = fit.ox !== undefined ? fit.ox : (fit.x || 0);
      const oy = fit.oy !== undefined ? fit.oy : (fit.y || 0);
      ctx.fillStyle = pal.bg;
      ctx.fillRect(0, 0, 300, 440);
      ctx.strokeStyle = pal.accent;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(ox, oy, HubLogic.WORLD.w * sc, HubLogic.WORLD.h * sc);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '14px sans-serif';
      HubLogic.PORTALS.forEach((p) => {
        if (p.hidden) return;
        const px = ox + p.x * sc;
        const py = oy + p.y * sc;
        ctx.beginPath();
        ctx.arc(px, py, 12, 0, Math.PI * 2);
        ctx.fillStyle = p.ready ? pal.accent : '#64748b';
        ctx.globalAlpha = p.ready ? 0.35 : 0.25;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillText(p.icon || '🌀', px, py);
      });
      friends.forEach((f) => {
        ctx.beginPath();
        ctx.arc(ox + f.x * sc, oy + f.y * sc, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = pal.accent;
        ctx.fill();
      });
      ctx.beginPath();
      ctx.arc(ox + me.x * sc, oy + me.y * sc, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#facc15';
      ctx.fill();
      const st = WorldSave.load(child) || {};
      const on = !!st.guest;
      guestBtn.textContent = '🤝 ' + (isDaughter ? '오빠' : '동생') + ' 친구 초대 ' + (on ? '켬' : '끔');
      guestBtn.classList.toggle('is-on', on);
    }

    el('mapBtn').addEventListener('click', () => {
      drawMap();
      mapEl.hidden = false;
    });
    el('mapClose').addEventListener('click', () => { mapEl.hidden = true; });
    guestBtn.addEventListener('click', () => {
      WorldSave.update(child, (s) => Object.assign({}, s, { guest: !s.guest }));
      buildFriends();
      drawMap();
    });

    stageEl.addEventListener('pointerdown', (e) => {
      downPos = { x: e.clientX, y: e.clientY, moved: false };
    });
    stageEl.addEventListener('pointermove', (e) => {
      if (!downPos || downPos.moved) return;
      if (Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y) > 12) downPos.moved = true;
    });
    stageEl.addEventListener('click', (e) => {
      const moved = downPos && downPos.moved;
      downPos = null;
      // 버튼·판·지도 위 클릭이 광장까지 내려와 뒤의 친구를 누르지 않게 (Claude 수정: 지도 「닫기」 뒤 친구가 눌리던 문제)
      const ui = e.target && e.target.closest && e.target.closest('button, a, .world-sheet, .world-hud-top, [data-no-stick]');
      if (ui || moved || !mapEl.hidden || !sheetEl.hidden) return;
      const rect = cvEl.getBoundingClientRect();
      const w = WorldView.toWorld(cam, m.view.scale, e.clientX - rect.left, e.clientY - rect.top);
      const f = HubLogic.hitFriend(friends, w.x, w.y);
      if (!f) return;
      const name = (f.item && (f.item.name || f.item.title)) || f.name || '친구';
      const bText = HubLogic.birthText(f.item) || '안녕!';
      f.bubble = name + '\n' + bText;
      f.bubbleT = 2.5;
      f.landedAt = t;
      WorldSFX.play('xylo', XYLO[f.p] !== undefined ? XYLO[f.p] : 0);
      if (isDaughter && typeof root.speakFairyTTS === 'function') root.speakFairyTTS(name + ' ' + bText);
      if (f.item && f.item.kind === 'gallery') openSheet(f);
    });

    function drawBubble(ctx, x, y, text) {
      const lines = String(text).split('\n');
      ctx.font = 'bold 16px sans-serif';
      let mw = 0;
      lines.forEach((ln) => { mw = Math.max(mw, ctx.measureText(ln).width); });
      const bw = mw + 22;
      const bh = lines.length * 22 + 14;
      const bx = x - bw / 2;
      const by = y - bh;
      ctx.fillStyle = '#ffffff';
      roundRect(ctx, bx, by, bw, bh, 12);
      ctx.fill();
      ctx.strokeStyle = 'rgba(15,23,42,0.18)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      lines.forEach((ln, i) => { ctx.fillText(ln, x, by + 8 + i * 22); });
    }

    function drawActor(ctx, a, isMe) {
      WorldFX.shadow(ctx, a.x, a.y, isMe ? 64 : 54);
      const b = WorldFX.body({ t, landedAt: a.landedAt || -9, hitAt: a.hitAt || -9 });
      const h = isMe ? 110 : 96;
      const sp = a.item && sprites[a.item.id];
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.scale((a.face < 0 ? -1 : 1) * (b.sx || 1), b.sy || 1);
      if (sp && sp.canvas) {
        const w = h * (sp.canvas.width / sp.canvas.height || 1);
        ctx.drawImage(sp.canvas, -w / 2, -h, w, h);
      } else {
        ctx.beginPath();
        ctx.arc(0, -h * 0.45, h * 0.42, 0, Math.PI * 2);
        ctx.fillStyle = (sp && sp.color) || (isMe ? '#38bdf8' : pal.accent);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 28px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const nm = (a.item && (a.item.name || a.item.title)) || (isMe ? '나' : '?');
        ctx.fillText(nm.slice(0, 1), 0, -h * 0.45);
      }
      ctx.restore();
      if (!isMe && a.item && newSet.has(a.item.id)) {
        const bob = Math.sin(t * 5 + a.x) * 4;
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText('✨', a.x, a.y - h - 6 + bob);
      }
      if (!isMe && a.bubble && a.bubbleT > 0) drawBubble(ctx, a.x, a.y - h - 18, a.bubble);
    }

    function drawPortal(ctx, p) {
      const r = p.r || 60;
      const cur = portal && (portal.active || portal.portal || portal);
      const isCur = cur && (cur === p || cur.id === p.id);
      const prog = isCur ? clamp((portal.t || 0) / 0.8, 0, 1) : 0;
      ctx.save();
      if (!p.ready) ctx.globalAlpha = 0.55;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fillStyle = p.ready ? 'rgba(255,255,255,0.08)' : 'rgba(100,116,139,0.16)';
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = p.ready ? pal.accent : '#64748b';
      ctx.stroke();
      if (prog > 0) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, r + 8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * prog);
        ctx.lineWidth = 6;
        ctx.strokeStyle = pal.accent;
        ctx.stroke();
      }
      ctx.font = '48px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.icon || '🌀', p.x, p.y);
      ctx.font = 'bold 18px sans-serif';
      ctx.fillStyle = isDaughter ? '#1e293b' : '#f8fafc';
      ctx.textBaseline = 'top';
      ctx.fillText(p.name || p.label || '', p.x, p.y + r + 8);
      if (!p.ready) {
        ctx.font = '14px sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('🚧 곧 열려요', p.x, p.y + r + 30);
      }
      ctx.restore();
    }

    function drawOffscreenPortal(ctx, p, vw, vh) {
      const sx = p.x - cam.x;
      const sy = p.y - cam.y;
      if (sx >= 0 && sx <= vw && sy >= 0 && sy <= vh) return;
      const ax = clamp(sx, 28, vw - 28);
      const ay = clamp(sy, 28, vh - 28);
      const ang = Math.atan2(sy - vh / 2, sx - vw / 2);
      ctx.save();
      ctx.translate(ax, ay);
      ctx.save();
      ctx.rotate(ang);
      ctx.beginPath();
      ctx.moveTo(16, 0);
      ctx.lineTo(-8, -9);
      ctx.lineTo(-8, 9);
      ctx.closePath();
      ctx.fillStyle = p.ready ? pal.accent : '#64748b';
      ctx.fill();
      ctx.restore();
      ctx.font = '18px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.icon || '🌀', -Math.cos(ang) * 18, -Math.sin(ang) * 18);
      ctx.restore();
    }

    function update(dt) {
      t += dt;
      const d = fx.step(dt);
      const inp = input.read();
      const mv = (inp && inp.move) || { x: 0, y: 0 };
      me.x = clamp(me.x + mv.x * 220 * d, 30, HubLogic.WORLD.w - 30);
      me.y = clamp(me.y + mv.y * 220 * d, 150, HubLogic.WORLD.h - 30); // 위 150: 상단 바에 가리지 않게
      if (Math.abs(mv.x) > 0.05) me.face = mv.x < 0 ? -1 : 1;
      cam = WorldView.follow(cam, me, m.view, HubLogic.WORLD, dt);
      for (let i = 0; i < friends.length; i++) HubLogic.stepFriend(friends[i], me, d, rng, HubLogic.WORLD, t);
      portal = HubLogic.portalStep(portal, me, HubLogic.PORTALS, d);
      if (portal && portal.enter && !navigating) {
        // portalStep의 enter는 포털 id 문자열(계약 §13-1) → 목록에서 주소를 찾는다 (Claude 연결 수정)
        const target = HubLogic.PORTALS.find((p) => p.id === portal.enter);
        const href = target && target.href;
        if (href) {
          navigating = true;
          WorldSFX.play('chime');
          fx.flash(250);
          setTimeout(() => { location.href = href; }, 250);
        }
      }
    }

    function render() {
      const ctx = m.ctx;
      const vw = m.view.w;
      const vh = m.view.h;
      ctx.fillStyle = pal.bg;
      ctx.fillRect(0, 0, vw, vh);
      const off = fx.offset();
      ctx.save();
      ctx.translate(-cam.x + off.x, -cam.y + off.y);

      ctx.strokeStyle = pal.road;
      ctx.lineWidth = 90;
      ctx.lineCap = 'round';
      HubLogic.PORTALS.forEach((p) => {
        if (p.hidden) return;
        ctx.beginPath();
        ctx.moveTo(540, 800);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      });
      ctx.beginPath();
      ctx.arc(540, 800, 300, 0, Math.PI * 2);
      ctx.fillStyle = pal.road;
      ctx.fill();

      ctx.fillStyle = pal.dot;
      for (let gx = 60; gx < HubLogic.WORLD.w; gx += 120) {
        for (let gy = 60; gy < HubLogic.WORLD.h; gy += 120) {
          ctx.beginPath();
          ctx.arc(gx, gy, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      HubLogic.PORTALS.forEach((p) => { if (!p.hidden) drawPortal(ctx, p); });
      const actors = friends.map((f) => ({ f, me: false })).concat([{ f: me, me: true }]);
      actors.sort((a, b) => a.f.y - b.f.y);
      actors.forEach((a) => { drawActor(ctx, a.f, a.me); });
      fx.draw(ctx);
      ctx.restore();

      HubLogic.PORTALS.forEach((p) => { if (!p.hidden) drawOffscreenPortal(ctx, p, vw, vh); });
    }

    buildFriends();
    loop = WorldView.createLoop({ update, render });
    loop.start();
    WorldSave.pull(child).then(() => { buildFriends(); }).catch(() => {});
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) loop.stop();
      else loop.start();
    });
  }

  root.HubUI = Object.freeze({ boot });
})();
