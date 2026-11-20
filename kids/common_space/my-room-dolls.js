// my-room-dolls.js — 초안: 안티그래비티 Hydrogen, 검토: Claude (docs/world_module_spec.md §15)
// 마이룸의 상태(placedFurniture·currentProfile·isDragging·activeDragElement)는 let 전역이라 window에 없다 → 이름으로 직접 읽는다 (Claude 수정)
(function () {
  'use strict';
  const root = typeof window !== 'undefined' ? window : globalThis;
  const TAGS = Object.freeze({ sleep: '💤', eat: '😋', bounce: '🦘', music: '🎵' });
  const TAG_BY_CHAR = { s: 'sleep', e: 'eat', b: 'bounce', m: 'music' };
  const TAG_CYCLE = ['b', 's', 'e', 'm'];
  const SPEEDS = { a: 40, s: 15, m: 28, h: 22 };
  const PERSONA_IDX = { a: 0, s: 1, m: 2, h: 3 };
  const SIZE = 88;
  const HALF = 44;
  const ROAM_PREFIX = 'myroom_doll_roam_';
  const ALBUM_DB = 'kids_world_album';
  const ALBUM_STORE = 'photos';
  const dolls = new Map();
  const greetCool = new Map();
  let rng = null;
  let loopStarted = false;
  let lastTs = 0;

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function rand() {
    if (!rng) rng = mulberry32((Date.now() ^ 0x9e3779b9) >>> 0);
    return rng();
  }

  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  function getProfile() {
    return (typeof currentProfile !== 'undefined' ? currentProfile : null) === 'daughter' ? 'daughter' : 'son';
  }

  function galId(artId, key) {
    return 'gal:' + artId + '#' + key;
  }

  function parseGalId(id) {
    if (typeof id !== 'string' || id.indexOf('gal:') !== 0) return null;
    const body = id.slice(4);
    const hash = body.indexOf('#');
    if (hash <= 0 || hash >= body.length - 1) return null;
    return { artId: body.slice(0, hash), key: body.slice(hash + 1) };
  }

  function nearTag(doll, furn, r) {
    const lim = typeof r === 'number' ? r : 90;
    if (!doll || !Array.isArray(furn)) return null;
    const dx0 = (doll.x || 0) + HALF;
    const dy0 = (doll.y || 0) + HALF;
    let best = null;
    let bestD = lim;
    for (let i = 0; i < furn.length; i++) {
      const f = furn[i];
      if (!f || !f.tag) continue;
      const d = Math.hypot((f.x || 0) + HALF - dx0, (f.y || 0) + HALF - dy0);
      if (d <= bestD) { bestD = d; best = f.tag; }
    }
    return best;
  }

  function trimAlbum(list, max) {
    const lim = typeof max === 'number' ? max : 6;
    if (!Array.isArray(list)) return [];
    return list.slice().sort(function (a, b) {
      return ((b && b.at) || 0) - ((a && a.at) || 0);
    }).slice(0, lim);
  }

  function friends() {
    const profile = getProfile();
    const ws = root.WorldSprites;
    const wSave = root.WorldSave;
    const gl = root.GardenLogic;
    const mr = root.MonsterRoster;
    const items = ws && typeof ws.collect === 'function' ? ws.collect({
      items: root.DEFAULT_GALLERY_DATA || [],
      charactersOf: mr && typeof mr.charactersOf === 'function' ? mr.charactersOf : undefined,
      roster: {}, order: [], child: profile, guest: false, root: '../../'
    }) : [];
    const state = wSave && typeof wSave.load === 'function' ? wSave.load(profile) : { cfg: {}, found: [] };
    const ids = items.map(function (it) { return it.id; });
    const idMap = wSave && typeof wSave.assignIds === 'function' ? wSave.assignIds(ids) : new Map();
    const visArr = gl && typeof gl.visibleIds === 'function'
      ? gl.visibleIds(items, state.found || [], idMap) : ids;
    const visSet = new Set(visArr);
    const visible = items.filter(function (it) { return visSet.has(it.id); });
    return { items: visible, hiddenCount: items.length - visible.length, state: state, idMap: idMap, profile: profile };
  }

  function persistRoom(entry) {
    const isAdmin = typeof root.isAdminUser === 'function' && root.isAdminUser();
    if (isAdmin) {
      if (typeof root.saveAdminRoomStateToLocal === 'function') root.saveAdminRoomStateToLocal();
      return Promise.resolve(true);
    }
    if (typeof root.syncRoomDataToNotion === 'function') {
      return Promise.resolve(root.syncRoomDataToNotion()).then(
        function () { return true; },
        function () { return false; }
      );
    }
    return Promise.resolve(true);
  }

  function rollbackEntry(entry) {
    const arr = (typeof placedFurniture !== 'undefined' ? placedFurniture : null);
    if (!Array.isArray(arr)) return;
    const idx = arr.indexOf(entry);
    if (idx >= 0) arr.splice(idx, 1);
  }

  function renderDock(dock) {
    if (!dock) return;
    while (dock.firstChild) dock.removeChild(dock.firstChild);
    const data = friends();
    const placed = new Set((Array.isArray((typeof placedFurniture !== 'undefined' ? placedFurniture : null)) ? (typeof placedFurniture !== 'undefined' ? placedFurniture : null) : []).map(function (p) {
      return p && p.id;
    }));
    if (!data.items.length) {
      dock.appendChild(el('p', 'doll-empty', '갤러리에 캐릭터를 등록하면 여기 나와요!'));
    }
    data.items.forEach(function (item) {
      const card = el('div', 'item-card');
      const img = el('img', 'item-img');
      img.crossOrigin = 'anonymous';
      img.src = item.src;
      img.alt = '';
      const name = el('div', 'item-name', item.name || '');
      const btn = el('button', 'place-btn', placed.has(item.id) ? '방에 있음' : '방에 꺼내기');
      btn.type = 'button';
      btn.disabled = placed.has(item.id);
      btn.addEventListener('click', function () {
        if (!Array.isArray((typeof placedFurniture !== 'undefined' ? placedFurniture : null))) return;
        const room = document.getElementById('my-room');
        const rect = room ? room.getBoundingClientRect() : { width: 320, height: 320 };
        const x = Math.round(rand() * Math.max(0, (rect.width || 320) - SIZE));
        const y = Math.round(rand() * Math.max(0, (rect.height || 320) - SIZE));
        const entry = { id: item.id, x: x, y: y, rotation: 0, flipX: false };
        (typeof placedFurniture !== 'undefined' ? placedFurniture : null).push(entry);
        persistRoom(entry).then(function (ok) {
          if (!ok) {
            rollbackEntry(entry);
            root.alert('❌ 저장에 실패했어요. 다시 시도해 주세요!');
            return;
          }
          if (typeof root.renderRoomFurniture === 'function') root.renderRoomFurniture();
          if (typeof root.renderDock === 'function') root.renderDock();
        });
      });
      card.appendChild(img);
      card.appendChild(name);
      card.appendChild(btn);
      dock.appendChild(card);
    });
    if (data.hiddenCount > 0) {
      const hCard = el('div', 'item-card doll-hidden-card');
      hCard.appendChild(el('div', 'item-name', '🌿 정원에 숨은 친구 ' + data.hiddenCount + '명'));
      const link = el('a', 'place-btn', '찾으러 가기');
      link.href = '../playground/world/garden.html';
      hCard.appendChild(link);
      dock.appendChild(hCard);
    }
  }

  function showBubble(node, text, ms) {
    if (!node) return;
    node.textContent = text;
    node.hidden = false;
    if (node._timer) clearTimeout(node._timer);
    node._timer = setTimeout(function () { node.hidden = true; }, ms || 2500);
  }

  function updateCfg(profile, shortId, patch) {
    const wSave = root.WorldSave;
    if (!shortId || !wSave || typeof wSave.update !== 'function') return;
    wSave.update(profile, function (st) {
      const cfg = st.cfg || (st.cfg = {});
      const cur = typeof wSave.parseCfg === 'function' ? wSave.parseCfg(cfg[shortId]) : {};
      const next = Object.assign({}, cur, patch);
      cfg[shortId] = typeof wSave.formatCfg === 'function' ? wSave.formatCfg(next) : next;
      return st;
    });
    if (typeof root.renderRoomFurniture === 'function') root.renderRoomFurniture();
  }

  function makeCtrlBtn(label, onClick) {
    const btn = el('button', 'furn-ctrl-btn', label);
    btn.type = 'button';
    btn.addEventListener('mousedown', function (e) { e.stopPropagation(); });
    btn.addEventListener('touchstart', function (e) { e.stopPropagation(); }, { passive: false });
    btn.addEventListener('click', function (e) { e.stopPropagation(); onClick(); });
    return btn;
  }

  function isRoamOn(profile) {
    try { return root.localStorage.getItem(ROAM_PREFIX + profile) !== 'off'; }
    catch (_) { return true; }
  }

  function ensureToolbar(room, profile) {
    let tb = room.querySelector('.doll-toolbar');
    if (!tb) {
      tb = el('div', 'doll-toolbar');
      const roamBtn = el('button', 'doll-roam-btn', '🚶 산책');
      roamBtn.type = 'button';
      roamBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        const p = getProfile();
        const nextOff = isRoamOn(p);
        try { root.localStorage.setItem(ROAM_PREFIX + p, nextOff ? 'off' : 'on'); } catch (_) {}
        roamBtn.classList.toggle('is-off', nextOff);
      });
      const photoBtn = el('button', 'doll-photo-btn', '📸');
      photoBtn.type = 'button';
      photoBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        takePhoto(room, getProfile());
      });
      tb.appendChild(roamBtn);
      tb.appendChild(photoBtn);
      room.appendChild(tb);
    }
    const rBtn = tb.querySelector('.doll-roam-btn');
    if (rBtn) rBtn.classList.toggle('is-off', !isRoamOn(profile));
  }

  function renderRoom(room) {
    if (!room) return;
    const data = friends();
    const byId = new Map();
    data.items.forEach(function (it) { byId.set(it.id, it); });
    const wSave = root.WorldSave;
    const placed = Array.isArray((typeof placedFurniture !== 'undefined' ? placedFurniture : null)) ? (typeof placedFurniture !== 'undefined' ? placedFurniture : null) : [];
    dolls.clear();
    placed.forEach(function (p) {
      if (!p || typeof p.id !== 'string' || p.id.indexOf('gal:') !== 0) return;
      const item = byId.get(p.id);
      if (!item) return;
      const shortId = data.idMap.get(p.id);
      const rawCfg = shortId && data.state.cfg ? data.state.cfg[shortId] : null;
      const cfg = wSave && typeof wSave.parseCfg === 'function' ? wSave.parseCfg(rawCfg) : {};
      const isFurn = cfg.d === 'f';
      const tagChar = TAG_BY_CHAR[cfg.t] ? cfg.t : 'b';
      const wrap = el('div', 'furniture-item doll-item' + (isFurn ? ' is-furniture' : ''));
      wrap.id = 'furn_' + p.id;
      wrap.style.left = (p.x || 0) + 'px';
      wrap.style.top = (p.y || 0) + 'px';
      const ctrl = el('div', 'furniture-controls');
      ctrl.appendChild(makeCtrlBtn('↻', function () {
        if (typeof root.rotatePlacedItem === 'function') root.rotatePlacedItem(p.id);
      }));
      ctrl.appendChild(makeCtrlBtn('↔', function () {
        if (typeof root.flipPlacedItem === 'function') root.flipPlacedItem(p.id);
      }));
      ctrl.appendChild(makeCtrlBtn(isFurn ? '🚶' : '🪑', function () {
        updateCfg(data.profile, shortId, { d: isFurn ? 'd' : 'f' });
      }));
      if (isFurn) {
        ctrl.appendChild(makeCtrlBtn('🏷️', function () {
          const next = TAG_CYCLE[(TAG_CYCLE.indexOf(tagChar) + 1) % TAG_CYCLE.length];
          updateCfg(data.profile, shortId, { t: next });
        }));
      }
      const walk = el('div', 'doll-walk');
      const vis = el('div', 'furniture-visual');
      vis.style.transform = 'rotate(' + (p.rotation || 0) + 'deg) scaleX(' + (p.flipX ? -1 : 1) + ')';
      const img = el('img');
      img.crossOrigin = 'anonymous';
      img.src = item.src;
      img.alt = item.name || '';
      img.draggable = false;
      vis.appendChild(img);
      walk.appendChild(vis);
      const bubble = el('span', 'doll-bubble');
      bubble.hidden = true;
      const react = el('span', 'doll-react');
      react.hidden = true;
      wrap.appendChild(ctrl);
      wrap.appendChild(walk);
      wrap.appendChild(bubble);
      wrap.appendChild(react);
      let downX = 0;
      let downY = 0;
      const onDown = function (e) {
        const pt = e.touches && e.touches[0] ? e.touches[0] : e;
        downX = pt.clientX || 0;
        downY = pt.clientY || 0;
        if (typeof root.dragStart === 'function') root.dragStart(e);
      };
      wrap.addEventListener('mousedown', onDown);
      wrap.addEventListener('touchstart', onDown, { passive: false });
      wrap.addEventListener('click', function (e) {
        if ((typeof isDragging !== 'undefined' && isDragging)) return;
        const pt = e.changedTouches && e.changedTouches[0] ? e.changedTouches[0] : e;
        if (Math.hypot((pt.clientX || 0) - downX, (pt.clientY || 0) - downY) > 6) return;
        if (typeof root.setSelectedFurniture === 'function') root.setSelectedFurniture(p.id);
        const hl = root.HubLogic;
        const bt = hl && typeof hl.birthText === 'function' ? hl.birthText(item) : '';
        showBubble(bubble, (item.name || '') + '\n' + (bt || '안녕!'), 2500);
        if (root.WorldSFX && typeof root.WorldSFX.play === 'function') {
          if (typeof root.WorldSFX.unlock === 'function') root.WorldSFX.unlock();
          root.WorldSFX.play('xylo', PERSONA_IDX[cfg.p] || 0);
        }
        if (data.profile === 'daughter' && typeof root.speakFairyTTS === 'function') {
          root.speakFairyTTS(item.name || '');
        }
      });
      room.appendChild(wrap);
      dolls.set(p.id, {
        id: p.id, el: wrap, walk: walk, bubble: bubble, react: react,
        p: cfg.p || 'a', isFurn: isFurn, tagChar: tagChar,
        x: p.x || 0, y: p.y || 0, tx: null, ty: null, waitUntil: 0, tagCool: 0
      });
    });
    ensureToolbar(room, data.profile);
    if (!loopStarted) {
      loopStarted = true;
      root.requestAnimationFrame(tick);
    }
  }

  function collectTaggedFurn(profile) {
    const out = [];
    const cat = typeof root.getCatalogItems === 'function' ? root.getCatalogItems(profile) : [];
    const byId = new Map();
    if (Array.isArray(cat)) cat.forEach(function (c) { if (c && c.tag) byId.set(c.id, c.tag); });
    const placed = Array.isArray((typeof placedFurniture !== 'undefined' ? placedFurniture : null)) ? (typeof placedFurniture !== 'undefined' ? placedFurniture : null) : [];
    placed.forEach(function (p) {
      if (!p || !p.id || p.id.indexOf('gal:') === 0) return;
      const tag = byId.get(p.id);
      if (tag) out.push({ x: p.x || 0, y: p.y || 0, tag: tag });
    });
    dolls.forEach(function (d) {
      if (d.isFurn) out.push({ x: d.x, y: d.y, tag: TAG_BY_CHAR[d.tagChar] || 'bounce' });
    });
    return out;
  }

  function tick(ts) {
    root.requestAnimationFrame(tick);
    if (document.hidden) { lastTs = ts; return; }
    const dt = lastTs ? Math.min(0.1, (ts - lastTs) / 1000) : 0;
    lastTs = ts;
    const room = document.getElementById('my-room');
    const profile = getProfile();
    if (!room || !isRoamOn(profile) || !dolls.size) return;
    const rect = room.getBoundingClientRect();
    const maxX = Math.max(0, (rect.width || 320) - SIZE);
    const maxY = Math.max(0, (rect.height || 320) - SIZE);
    const furns = collectTaggedFurn(profile);
    const walkers = [];
    dolls.forEach(function (d) {
      if (!d.el.isConnected || d.isFurn) return;
      walkers.push(d);
      if ((typeof activeDragElement !== 'undefined' ? activeDragElement : null) === d.el) {
        d.x = parseFloat(d.el.style.left) || 0;
        d.y = parseFloat(d.el.style.top) || 0;
        d.tx = null;
        return;
      }
      if (d.waitUntil > ts) return;
      if (!d.react.hidden) {
        d.react.hidden = true;
        d.walk.classList.remove('doll-hop');
      }
      if (d.tagCool <= ts) {
        const hit = nearTag(d, furns);
        if (hit) {
          d.waitUntil = ts + 3000;
          d.tagCool = ts + 8000;
          d.react.textContent = TAGS[hit] || '';
          d.react.hidden = false;
          if (hit === 'bounce') d.walk.classList.add('doll-hop');
          return;
        }
      }
      if (d.tx == null) {
        d.tx = rand() * maxX;
        d.ty = rand() * maxY;
      }
      const dx = d.tx - d.x;
      const dy = d.ty - d.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= 2) {
        d.x = d.tx;
        d.y = d.ty;
        d.tx = null;
        d.waitUntil = ts + 1000 + rand() * 2000;
      } else {
        const step = Math.min(dist, (SPEEDS[d.p] || 40) * dt);
        d.x += (dx / dist) * step;
        d.y += (dy / dist) * step;
        if (dx < -0.5) d.walk.style.transform = 'scaleX(-1)';
        else if (dx > 0.5) d.walk.style.transform = 'scaleX(1)';
      }
      d.el.style.left = d.x.toFixed(1) + 'px';
      d.el.style.top = d.y.toFixed(1) + 'px';
    });
    for (let i = 0; i < walkers.length; i++) {
      for (let j = i + 1; j < walkers.length; j++) {
        const a = walkers[i];
        const b = walkers[j];
        if (Math.hypot(a.x - b.x, a.y - b.y) > 60) continue;
        const key = a.id < b.id ? a.id + '|' + b.id : b.id + '|' + a.id;
        if ((greetCool.get(key) || 0) > ts) continue;
        greetCool.set(key, ts + 10000);
        showBubble(a.bubble, '안녕! 💕', 2000);
        showBubble(b.bubble, '안녕! 💕', 2000);
      }
    }
  }

  function loadImg(src) {
    return new Promise(function (resolve) {
      const img = new root.Image();
      img.crossOrigin = 'anonymous';
      img.onload = function () { resolve(img); };
      img.onerror = function () { resolve(null); };
      img.src = src;
    });
  }

  function openAlbum(photos) {
    const old = document.querySelector('.doll-album');
    if (old) old.remove();
    const wrap = el('div', 'doll-album');
    const card = el('div', 'doll-album__card');
    const grid = el('div', 'doll-album__grid');
    photos.forEach(function (ph) {
      const cell = el('div');
      const thumb = el('img', 'doll-album__thumb');
      thumb.src = ph.data;
      thumb.alt = '';
      const dl = el('a', 'doll-album__dl', '내려받기');
      dl.href = ph.data;
      dl.download = 'myroom-' + ph.at + '.jpg';
      cell.appendChild(thumb);
      cell.appendChild(dl);
      grid.appendChild(cell);
    });
    const closeBtn = el('button', 'doll-album__close', '닫기');
    closeBtn.type = 'button';
    closeBtn.addEventListener('click', function () { wrap.remove(); });
    card.appendChild(grid);
    card.appendChild(closeBtn);
    wrap.appendChild(card);
    document.body.appendChild(wrap);
  }

  function savePhotoToDb(profile, data) {
    return new Promise(function (resolve, reject) {
      if (!root.indexedDB) { reject(new Error('no idb')); return; }
      const req = root.indexedDB.open(ALBUM_DB, 1);
      req.onupgradeneeded = function () {
        const db = req.result;
        if (!db.objectStoreNames.contains(ALBUM_STORE)) db.createObjectStore(ALBUM_STORE, { keyPath: 'at' });
      };
      req.onerror = function () { reject(req.error); };
      req.onsuccess = function () {
        const db = req.result;
        const tx = db.transaction(ALBUM_STORE, 'readwrite');
        const store = tx.objectStore(ALBUM_STORE);
        store.put({ at: Date.now(), child: profile, data: data });
        const allReq = store.getAll();
        allReq.onsuccess = function () {
          const mine = (allReq.result || []).filter(function (r) { return r && r.child === profile; });
          const kept = trimAlbum(mine, 6);
          const keepSet = new Set(kept.map(function (r) { return r.at; }));
          mine.forEach(function (r) { if (!keepSet.has(r.at)) store.delete(r.at); });
          tx.oncomplete = function () { db.close(); resolve(kept); };
        };
        tx.onerror = function () { db.close(); reject(tx.error); };
      };
    });
  }

  function takePhoto(room, profile) {
    const rect = room.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    const scale = w > 480 ? 480 / w : 1;
    const cw = Math.round(w * scale);
    const ch = Math.round(h * scale);
    const canvas = document.createElement('canvas');
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext('2d');
    const cs = root.getComputedStyle(room);
    ctx.fillStyle = cs.backgroundColor || '#ffffff';
    ctx.fillRect(0, 0, cw, ch);
    const m = /url\(["']?([^"')]+)["']?\)/.exec(cs.backgroundImage || '');
    const bgTask = m ? loadImg(m[1]) : Promise.resolve(null);
    bgTask.then(function (bg) {
      if (bg && bg.width && bg.height) {
        const sc = Math.max(cw / bg.width, ch / bg.height);
        const dw = bg.width * sc;
        const dh = bg.height * sc;
        ctx.drawImage(bg, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
      }
      const imgs = room.querySelectorAll('.furniture-item img');
      for (let i = 0; i < imgs.length; i++) {
        const ir = imgs[i].getBoundingClientRect();
        try {
          ctx.drawImage(
            imgs[i], (ir.left - rect.left) * scale, (ir.top - rect.top) * scale,
            ir.width * scale, ir.height * scale
          );
        } catch (_) {}
      }
      const data = canvas.toDataURL('image/jpeg', 0.7);
      return savePhotoToDb(profile, data);
    }).then(openAlbum).catch(function () {
      root.alert('이 기기에는 저장할 수 없어요');
    });
  }

  root.MyRoomDolls = Object.freeze({
    TAGS: TAGS,
    galId: galId,
    parseGalId: parseGalId,
    nearTag: nearTag,
    trimAlbum: trimAlbum,
    renderDock: renderDock,
    renderRoom: renderRoom
  });
}());
