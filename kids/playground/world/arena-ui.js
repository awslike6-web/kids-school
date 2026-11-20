// arena-ui.js — 초안: 안티그래비티 Hydrogen, 검토: Claude (docs/world_module_spec.md §12)
(function () {
  'use strict';
  const WORLD = { w: 720, h: 1100 };
  const CLS_LIST = [
    { id: 'blade', label: '🗡️검', code: 'b' },
    { id: 'rifle', label: '🔫라이플', code: 'r' },
    { id: 'shotgun', label: '💥샷건', code: 's' }
  ];
  const TRAIT_LIST = [
    { id: 'r', label: '🌈무지개' }, { id: 'f', label: '🔥불꽃' }, { id: 'i', label: '❄️얼음' },
    { id: 'l', label: '⚡번개' }, { id: 'w', label: '💨바람' }, { id: 'x', label: '💥폭발' }
  ];
  const LVL_LIST = [
    { id: 'kid', label: '🐣꼬마' }, { id: 'normal', label: '⚔️보통' }, { id: 'ace', label: '🔥에이스' }
  ];
  const BURST_KIND = { r: 'star', f: 'fire', i: 'ice', l: 'bolt', w: 'wind', x: 'boom' };
  const CLS_FROM_CODE = { b: 'blade', r: 'rifle', s: 'shotgun' };
  const CODE_FROM_CLS = { blade: 'b', rifle: 'r', shotgun: 's' };

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rng = mulberry32(Date.now());
  const $ = (id) => document.getElementById(id);
  const warn = (e) => { if (e) console.warn('[ArenaUI]', e); };
  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function speak(text) {
    try { if (typeof window.speakFairyTTS === 'function') window.speakFairyTTS(text, { skipPreset: true }); } catch (e) { warn(e); }
  }

  let child = 'son';
  let defLvl = 'normal';
  let studied = false;
  let items = [];
  let idMap = new Map();
  let byShort = new Map();
  let state = { arena: { best: {}, loadout: {} }, seen: [], cfg: {} };
  let fullToasted = false; // 필살기 가득 알림은 찰 때마다 한 번
  let sel = { me: 'runner', foe: 'rival', cls: 'blade', trait: 'r', level: 'normal' };
  let ttsGreeted = false;
  let toastTimer = 0;

  let viewMount = null;
  let input = null;
  let fx = null;
  let loop = null;
  let playing = false;
  let ended = false;
  let t = 0;
  let elapsed = 0;
  let cam = { x: 0, y: 0 };
  let me = null;
  let foe = null;
  let boss = null;
  let foeItem = null;
  let projectiles = [];
  let hazards = [];
  let cheer = [];
  let meter = 0;
  let jumpAt = -9;

  function showToast(msg) {
    const box = $('toast');
    if (!box) return;
    box.textContent = msg;
    box.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { box.hidden = true; }, 1400);
  }

  function collectFriends() {
    const mr = typeof window.MonsterRoster !== 'undefined' && window.MonsterRoster ? window.MonsterRoster : {};
    const raw = typeof window.DEFAULT_GALLERY_DATA !== 'undefined' && window.DEFAULT_GALLERY_DATA
      ? window.DEFAULT_GALLERY_DATA : [];
    items = WorldSprites.collect({
      items: raw, charactersOf: mr.charactersOf, roster: mr.MONSTER_ROSTER,
      order: mr.MONSTER_ORDER, child, guest: false, root: '../../../'
    }) || [];
    idMap = WorldSave.assignIds(items.map((i) => i.id));
    WorldSave.setLiveIds([...idMap.values()]);
    byShort = new Map();
    for (let i = 0; i < items.length; i++) {
      const sid = idMap.get(items[i].id);
      if (sid) byShort.set(sid, items[i]);
    }
  }

  // ── 상점 무기 (§16, Claude): 마이룸 상품 중 arena 필드가 있고 아이가 산 것 ──
  let owned = new Set();
  const ICON_BASE = '../../../assets/images/';
  function shopWeapons() {
    const list = typeof MARKET_ITEMS !== 'undefined' && MARKET_ITEMS && Array.isArray(MARKET_ITEMS[child]) ? MARKET_ITEMS[child] : [];
    return list.filter((it) => it.arena && owned.has(it.id) && ArenaWeapons.fromShop(it));
  }
  function readOwned(text) {
    try { const a = JSON.parse(text || '[]'); return Array.isArray(a) ? a.filter((x) => typeof x === 'string') : []; } catch (e) { return []; }
  }
  function loadOwned() {
    try { readOwned(localStorage.getItem(`${child}_owned_items`)).forEach((id) => owned.add(id)); } catch (e) { warn(e); }
    if (!WorldSave.inventoryProps) return Promise.resolve();
    return WorldSave.inventoryProps(child).then((props) => {
      const prop = props && props['보유 아이템 (텍스트)'];
      const text = prop && Array.isArray(prop.rich_text) ? prop.rich_text.map((p) => p.plain_text || '').join('') : '';
      readOwned(text).forEach((id) => owned.add(id));
    }).catch(warn);
  }

  function syncSelectionFromState() {
    state = WorldSave.load(child) || { arena: { best: {}, loadout: {} }, seen: [], cfg: {} };
    const lo = (state.arena && state.arena.loadout) || {};
    sel.me = lo.me && (lo.me === 'runner' || byShort.has(lo.me)) ? lo.me : 'runner';
    sel.foe = lo.foe && (lo.foe === 'rival' || byShort.has(lo.foe)) ? lo.foe : 'rival';
    sel.cls = CLS_FROM_CODE[CODE_FROM_CLS[lo.cls]] || 'blade';
    sel.trait = TRAIT_LIST.some((x) => x.id === lo.trait) ? lo.trait : 'r';
    sel.level = LVL_LIST.some((x) => x.id === lo.level) ? lo.level : defLvl;
    sel.skin = lo.skin && shopWeapons().some((it) => it.id === lo.skin) ? lo.skin : null;
    if (sel.foe !== 'rival' && sel.level === 'ace') sel.level = defLvl;
  }

  function saveMeCfg() {
    if (sel.me === 'runner') return;
    try {
      state = WorldSave.update(child, (s) => {
        const cfg = Object.assign({}, s.cfg);
        const prev = WorldSave.parseCfg(cfg[sel.me] || '');
        cfg[sel.me] = WorldSave.formatCfg(Object.assign({}, prev, {
          w: CODE_FROM_CLS[sel.cls] || 'b', e: sel.trait
        }));
        return Object.assign({}, s, { cfg });
      });
    } catch (e) { warn(e); }
  }

  function pickMe(sid) {
    sel.me = sid;
    if (sid !== 'runner') {
      const cfg = WorldSave.parseCfg((state.cfg && state.cfg[sid]) || '');
      if (cfg.w && CLS_FROM_CODE[cfg.w]) sel.cls = CLS_FROM_CODE[cfg.w];
      if (cfg.e && TRAIT_LIST.some((x) => x.id === cfg.e)) {
        sel.trait = cfg.e;
      } else {
        const it = byShort.get(sid);
        if (it) {
          WorldSprites.load(it, 128).then((res) => {
            if (res && res.trait && sel.me === sid && !playing) {
              sel.trait = res.trait;
              renderSheet();
            }
          }).catch(warn);
        }
      }
    }
    renderSheet();
  }

  function makeChip(label, onClick, isOn, imgSrc, isNew) {
    const btn = el('button', 'world-chip' + (isOn ? ' is-on' : ''));
    btn.type = 'button';
    if (imgSrc) {
      const img = el('img', 'arena-thumb');
      img.src = imgSrc;
      img.alt = '';
      btn.appendChild(img);
    }
    btn.appendChild(el('span', 'arena-chip__name', label));
    if (isNew) btn.appendChild(el('span', 'arena-new', 'NEW'));
    btn.addEventListener('click', onClick);
    return btn;
  }

  function addSection(parent, title, chips) {
    const sec = el('div', 'arena-section');
    sec.appendChild(el('h3', 'arena-section__title', title));
    const row = el('div', 'arena-row');
    for (let i = 0; i < chips.length; i++) row.appendChild(chips[i]);
    sec.appendChild(row);
    parent.appendChild(sec);
  }

  function renderSheet() {
    const sheet = $('sheet');
    if (!sheet) return;
    sheet.textContent = '';
    sheet.appendChild(el('h2', 'arena-sheet__title', '누구로 싸울까?'));
    if (child === 'daughter' && !ttsGreeted) { ttsGreeted = true; speak('누구랑 놀까?'); }

    const newList = WorldSprites.newFriends(items, state.seen || [], idMap) || [];
    const newIds = new Set(newList.map((i) => i.id));

    const meChips = [makeChip('🏃 기본', () => pickMe('runner'), sel.me === 'runner', null, false)];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.kind !== 'gallery') continue;
      const sid = idMap.get(it.id);
      if (!sid) continue;
      meChips.push(makeChip(it.name, () => pickMe(sid), sel.me === sid, it.src, newIds.has(it.id)));
    }
    addSection(sheet, '나', meChips);

    const foeChips = [makeChip('⚔️ 라이벌', () => {
      sel.foe = 'rival'; renderSheet();
    }, sel.foe === 'rival', null, false)];
    // 몬스터 목록에 같은 이름이 있으면 갤러리 쪽은 빼고 몬스터(화난 포즈 있음)만 보스 후보로 (Claude 수정)
    const monNames = new Set(items.filter((x) => x.kind === 'monster').map((x) => x.name));
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const sid = idMap.get(it.id);
      if (!sid || (it.kind === 'gallery' && monNames.has(it.name))) continue;
      foeChips.push(makeChip(it.name, () => {
        sel.foe = sid;
        if (sel.level === 'ace') sel.level = defLvl;
        renderSheet();
      }, sel.foe === sid, it.src, newIds.has(it.id)));
    }
    addSection(sheet, '상대', foeChips);

    const weaponChips = CLS_LIST.map((w) => makeChip(w.label, () => {
      sel.cls = w.id; sel.skin = null; saveMeCfg(); renderSheet();
    }, !sel.skin && sel.cls === w.id));
    shopWeapons().forEach((it) => {
      const wpn = ArenaWeapons.fromShop(it);
      weaponChips.push(makeChip(it.name, () => {
        sel.skin = it.id; sel.cls = wpn.cls; sel.trait = wpn.trait; saveMeCfg(); renderSheet();
      }, sel.skin === it.id, ICON_BASE + it.icon));
    });
    addSection(sheet, '무기', weaponChips);

    addSection(sheet, '효과', TRAIT_LIST.map((tr) => makeChip(tr.label, () => {
      sel.trait = tr.id; saveMeCfg(); renderSheet();
    }, sel.trait === tr.id)));

    const lvChips = [];
    for (let i = 0; i < LVL_LIST.length; i++) {
      const lv = LVL_LIST[i];
      if (lv.id === 'ace' && sel.foe !== 'rival') continue;
      lvChips.push(makeChip(lv.label, () => { sel.level = lv.id; renderSheet(); }, sel.level === lv.id));
    }
    addSection(sheet, '난이도', lvChips);

    const startBtn = el('button', 'world-btn arena-start', '▶ 시작!');
    startBtn.type = 'button';
    startBtn.addEventListener('click', () => {
      try {
        state = WorldSave.update(child, (s) => {
          const seenSet = new Set(s.seen || []);
          for (const sid of idMap.values()) seenSet.add(sid);
          const arena = Object.assign({}, s.arena, {
            loadout: { me: sel.me, foe: sel.foe, cls: sel.cls, trait: sel.trait, level: sel.level, skin: sel.skin || '' }
          });
          return Object.assign({}, s, { seen: [...seenSet], arena });
        });
      } catch (e) { warn(e); }
      startGame();
    });
    sheet.appendChild(startBtn);
  }

  function targetOf(f) {
    return { id: f.id, team: f.team || f.id, x: f.x, y: f.y, r: f.r || 24 };
  }

  function loadSprite(item, size, onDone) {
    if (!item) return;
    WorldSprites.load(item, size).then((res) => {
      if (res && res.canvas) onDone(res.canvas);
    }).catch(warn);
  }

  function startGame() {
    const covers = ArenaFighter.COVERS.pillars4;
    const meItem = sel.me !== 'runner' ? byShort.get(sel.me) : null;
    foeItem = sel.foe !== 'rival' ? byShort.get(sel.foe) : null;
    me = ArenaFighter.create({
      id: 'me', team: 'me', x: 360, y: 900, weapon: { cls: sel.cls, trait: sel.trait, skin: sel.skin || null }
    });
    const skinItem = sel.skin ? shopWeapons().find((it) => it.id === sel.skin) : null;
    if (skinItem) { const img = new Image(); img.onload = () => { if (me) me.weaponImg = img; }; img.src = ICON_BASE + skinItem.icon; }
    if (foeItem) {
      boss = ArenaBoss.create({
        id: 'boss', name: foeItem.name, level: sel.level === 'kid' ? 'kid' : 'normal', x: 360, y: 240
      });
      foe = null;
    } else {
      const rCls = CLS_LIST[(rng() * 3) | 0].id;
      foe = ArenaFighter.create({
        id: 'foe', team: 'foe', x: 360, y: 220, level: sel.level, weapon: { cls: rCls, trait: 'r', skin: null }
      });
      boss = null;
    }

    projectiles = [];
    hazards = [];
    cheer = [];
    meter = 0;
    t = 0;
    elapsed = 0;
    jumpAt = -9;
    ended = false;
    playing = true;
    cam = { x: 0, y: Math.max(0, WORLD.h - (viewMount ? viewMount.view.h : 600)) };

    if (meItem) loadSprite(meItem, 128, (cv) => { if (me) me.skin = cv; });
    if (boss && foeItem) {
      const srcItem = foeItem.poses && foeItem.poses.idle
        ? Object.assign({}, foeItem, { src: foeItem.poses.idle }) : foeItem;
      loadSprite(srcItem, 256, (cv) => { if (boss) boss.skin = cv; });
    }

    let cCount = 0;
    for (let i = 0; i < items.length && cCount < 2; i++) {
      const it = items[i];
      if (it.kind !== 'gallery') continue;
      const sid = idMap.get(it.id);
      if (sid === sel.me || sid === sel.foe) continue;
      cCount++;
      loadSprite(it, 64, (cv) => { cheer.push({ item: it, canvas: cv }); });
    }

    $('sheet').hidden = true;
    $('result').hidden = true;
    $('hud').hidden = false;
    $('controls').hidden = false;
    $('meName').textContent = meItem ? meItem.name : '기본';
    $('foeName').textContent = boss ? foeItem.name : '라이벌';
    updateHud();

    if (boss && foeItem) {
      let msg = foeItem.name + ' 등장!';
      if (foeItem.date) {
        const p = foeItem.date.split('-');
        if (p.length >= 2) msg = p[0] + '년 ' + parseInt(p[1], 10) + '월에 태어난 ' + foeItem.name + '!';
      }
      showToast(msg);
      fx.flash(200);
      WorldSFX.play('levelup');
    } else if (studied) {
      showToast('📚 오늘 공부 파워! 필살기가 빨리 차요');
    }

    if (!loop) loop = WorldView.createLoop({ update, render });
    loop.start();
  }

  function handleList(list) {
    if (!list) return;
    for (let i = 0; i < list.length; i++) handle(list[i]);
  }

  function handle(ev) {
    if (!ev || ended) return;
    if (ev.type === 'hit') {
      let taken = 0;
      if (ev.target === 'me') {
        // 라이벌이 주는 피해는 난이도별로 줄인다(시제품 수치는 아이에게 너무 아픔 — Claude, 2026-11-20 폰 시험)
        const foeMult = foe ? ({ kid: 0.5, normal: 0.75, ace: 1 }[sel.level] || 0.75) : 1;
        const res = ArenaFighter.damage(me, Object.assign({}, ev, { now: t, dmg: Math.round(ev.dmg * foeMult) }));
        taken = res.taken || 0;
        handleList(res.events);
        if (ev.trait && taken > 0) ArenaWeapons.applyTrait(me, ev.trait, taken);
      } else if (ev.target === 'foe' && foe) {
        const res = ArenaFighter.damage(foe, Object.assign({}, ev, { now: t }));
        taken = res.taken || 0;
        handleList(res.events);
        if (ev.trait && taken > 0) ArenaWeapons.applyTrait(foe, ev.trait, taken);
      } else if (ev.target === 'boss' && boss) {
        const res = ArenaBoss.damage(boss, ev);
        taken = res.taken || 0;
        boss.hitAt = t;
        handleList(res.events);
      }
      fx.burst(BURST_KIND[ev.trait] || 'spark', ev.x, ev.y, ev.crit ? 14 : 8);
      if (ev.crit) { fx.hitstop(90); fx.shake(14, 220); } else { fx.hitstop(40); fx.shake(5, 140); }
      WorldSFX.play('hit');
      if (ev.target !== 'me' && taken > 0) {
        meter = Math.min(100, meter + taken * (studied ? 1.5 : 1) * 0.6);
        jumpAt = t;
      }
    } else if (ev.type === 'swing') {
      WorldSFX.play('slash');
    } else if (ev.type === 'shoot') {
      WorldSFX.play(ev.cls === 'shotgun' ? 'shotgun' : 'shot');
    } else if (ev.type === 'telegraph') {
      WorldSFX.play('chime');
    } else if (ev.type === 'stun') {
      const sx = ev.x != null ? ev.x : (boss ? boss.x : 360);
      const sy = ev.y != null ? ev.y : (boss ? boss.y : 240);
      fx.burst('ring', sx, sy, 10);
      fx.shake(12, 200);
      WorldSFX.play('pop');
      showToast('💫 기절! 지금이야!');
    } else if (ev.type === 'phase2') {
      showToast('😡 화났다!');
      fx.flash(250);
      if (foeItem && foeItem.poses && foeItem.poses.rage) {
        loadSprite(Object.assign({}, foeItem, { src: foeItem.poses.rage }), 256, (cv) => {
          if (boss) boss.skin = cv;
        });
      }
    } else if (ev.type === 'shield') {
      showToast('🛡️ 보호막!');
      WorldSFX.play('chime');
    } else if (ev.type === 'dash') {
      fx.burst('dust', ev.x != null ? ev.x : me.x, ev.y != null ? ev.y : me.y, 6);
    } else if (ev.type === 'reload') {
      showToast('🔄 재장전 중! 지금이야!');
    } else if (ev.type === 'down') {
      if (!ev.target || ev.target !== 'me') win();
    }
  }

  function updateHud() {
    const enemy = boss || foe;
    const mePct = me ? Math.max(0, Math.min(100, (me.hp / (me.maxHp || 1)) * 100)) : 100;
    const foePct = enemy ? Math.max(0, Math.min(100, (enemy.hp / (enemy.maxHp || 1)) * 100)) : 100;
    const meHp = $('meHp');
    const foeHp = $('foeHp');
    if (meHp) { meHp.style.width = mePct + '%'; meHp.classList.toggle('is-low', mePct <= 30); }
    if (foeHp) { foeHp.style.width = foePct + '%'; foeHp.classList.toggle('is-low', foePct <= 30); }
    const tm = $('timer');
    if (tm) tm.textContent = elapsed.toFixed(1);
    const mt = $('meter');
    if (mt) {
      const full = meter >= 100;
      // 필살기: 글자는 늘 「필살기」, 게이지는 버튼 둘레가 차오름(--fill). 가득 차면 「GO!」 (2026-11-21 알아보기 어렵다는 의견)
      mt.textContent = full ? '필살기 GO!' : '필살기';
      if (full && !fullToasted) { fullToasted = true; showToast('⭐ 필살기가 꽉 찼어! 눌러 봐!'); }
      if (!full) fullToasted = false;
      if (mt.parentElement) { mt.parentElement.classList.toggle('is-full', full); mt.parentElement.style.setProperty('--fill', Math.floor(meter) + '%'); }
    }
  }

  function update(dt) {
    if (!playing || ended) return;
    t += dt;
    elapsed += dt;
    const d = fx.step(dt);
    const covers = ArenaFighter.COVERS.pillars4;
    if (d > 0) {
      const inp = input.read();
      const enemy = boss || foe;
      ArenaFighter.move(me, inp.move, d, covers, WORLD);
      if (inp.pressed.has('dash')) {
        const dv = ArenaFighter.dash(me, inp.move);
        if (dv) handle(dv);
      }
      const heldAtk = inp.held.has('attack');
      if (enemy && (inp.pressed.has('attack') || heldAtk)) {
        me.aim = Math.atan2(enemy.y - me.y, enemy.x - me.x);
      }
      if (inp.pressed.has('attack') || (me.weapon.cls !== 'blade' && heldAtk)) {
        ArenaWeapons.startAttack(me);
      }
      const mOut = ArenaWeapons.stepAttack(me, d, heldAtk, rng);
      handleList(mOut.events);
      if (mOut.projectiles && mOut.projectiles.length) projectiles.push(...mOut.projectiles);
      const foeT = enemy ? targetOf(enemy) : null;
      if (foeT) handleList(ArenaWeapons.meleeHits(me, [foeT]));

      if (foe) {
        const dec = ArenaFighter.think(foe, me, covers, d, rng);
        ArenaFighter.move(foe, dec.move, d, covers, WORLD);
        if (dec.dash) { const dv = ArenaFighter.dash(foe, dec.move); if (dv) handle(dv); }
        if (dec.attack) {
          foe.aim = Math.atan2(me.y - foe.y, me.x - foe.x);
          ArenaWeapons.startAttack(foe);
        }
        const fOut = ArenaWeapons.stepAttack(foe, d, !!dec.attack, rng);
        handleList(fOut.events);
        if (fOut.projectiles && fOut.projectiles.length) projectiles.push(...fOut.projectiles);
        handleList(ArenaWeapons.meleeHits(foe, [targetOf(me)]));
        handleList(dec.events);
      }

      if (boss) {
        const bOut = ArenaBoss.step(boss, me, covers, WORLD, d, rng);
        handleList(bOut.events);
        if (bOut.hazards && bOut.hazards.length) hazards.push(...bOut.hazards);
        const hz = ArenaBoss.stepHazards(hazards, me, d);
        hazards = hz.list || [];
        handleList(hz.events);
        const dx = me.x - boss.x;
        const dy = me.y - boss.y;
        const dist = Math.hypot(dx, dy);
        const minD = (me.r || 20) + (boss.r || 42);
        if (dist > 0 && dist < minD) {
          const push = minD - dist;
          me.x += (dx / dist) * push;
          me.y += (dy / dist) * push;
        }
      }

      const targets = foeT ? [targetOf(me), foeT] : [targetOf(me)];
      const pr = ArenaWeapons.stepProjectiles(projectiles, targets, covers, WORLD, d);
      projectiles = pr.list || [];
      handleList(pr.events);
      handleList(ArenaFighter.stepStatus(me, d));
      if (foe) handleList(ArenaFighter.stepStatus(foe, d));

      if (inp.pressed.has('special') && meter >= 100 && enemy && !ended) {
        meter = 0;
        fx.burst('star', me.x, me.y, 24);
        fx.flash(150);
        WorldSFX.play('levelup');
        if (window.WorldVoice && sel.me !== 'runner') window.WorldVoice.play(child, sel.me); // 내 목소리 기합(§17-5)
        const dx = enemy.x - me.x;
        const dy = enemy.y - me.y;
        const dist = Math.hypot(dx, dy);
        if (dist <= 170) {
          const nx = dist > 0 ? dx / dist : 0;
          const ny = dist > 0 ? dy / dist : -1;
          handle({
            type: 'hit', target: boss ? 'boss' : 'foe', dmg: 60, trait: me.weapon.trait,
            crit: true, x: enemy.x, y: enemy.y, kb: { x: nx * 500, y: ny * 500 }
          });
        }
      }

      if (boss && boss.state === 'dead' && !ended) win();
    }
    cam = WorldView.follow(cam, me, viewMount.view, WORLD, dt);
    updateHud();
  }

  function render() {
    if (!viewMount) return;
    const s = {
      world: WORLD, covers: ArenaFighter.COVERS.pillars4, me, foe, boss,
      projectiles, hazards, fx, meter, studied,
      // 그리기 계약(§12-4): 테마와 sprites:{me, foe, boss} = {canvas}|null (Claude 연결 수정)
      theme: child === 'daughter' ? 'slime' : 'arcade',
      sprites: { me: me && me.skin ? { canvas: me.skin } : null, foe: foe && foe.skin ? { canvas: foe.skin } : null,
        boss: boss && boss.skin ? { canvas: boss.skin } : null }
    };
    ArenaRender.drawArena(viewMount.ctx, s, cam, viewMount.view, t);
    const things = [];
    const enemy = boss || foe;
    if (enemy) things.push(enemy);
    for (let i = 0; i < hazards.length; i++) {
      if (hazards[i].armT > 0) things.push(hazards[i]);
    }
    ArenaRender.drawOffscreen(viewMount.ctx, viewMount.view, cam, things, t);
    ArenaRender.drawCheer(viewMount.ctx, cheer, t, jumpAt, viewMount.view);
  }

  function win() {
    if (ended) return;
    ended = true;
    playing = false;
    if (loop) loop.stop();
    const sec = Math.max(0.1, Number(elapsed.toFixed(1)));
    const key = boss ? ('boss:' + sel.foe) : ('rival:' + sel.level);
    const prev = state.arena && state.arena.best ? state.arena.best[key] : null;
    const isNew = prev == null || sec < prev;
    const bestVal = prev == null ? sec : Math.min(prev, sec);
    try {
      state = WorldSave.update(child, (s) => {
        const arena = Object.assign({}, s.arena);
        const best = Object.assign({}, arena.best);
        best[key] = bestVal;
        arena.best = best;
        return Object.assign({}, s, { arena });
      });
    } catch (e) { warn(e); }

    $('hud').hidden = true;
    $('controls').hidden = true;
    const res = $('result');
    res.textContent = '';
    res.appendChild(el('h2', 'arena-result__title', '🏆 ' + sec.toFixed(1) + '초 만에 이겼어요!'));
    if (isNew) res.appendChild(el('p', 'arena-result__line', '🎉 새 기록!'));
    res.appendChild(el('p', 'arena-result__line', '최고 기록: ' + bestVal.toFixed(1) + '초'));

    const acts = el('div', 'arena-result__actions');
    const bRetry = el('button', 'world-btn', '🔁 다시');
    bRetry.type = 'button';
    bRetry.addEventListener('click', startGame);
    const bPick = el('button', 'world-btn', '🎛️ 고르기');
    bPick.type = 'button';
    bPick.addEventListener('click', () => {
      res.hidden = true;
      $('sheet').hidden = false;
      renderSheet();
    });
    const bExit = el('button', 'world-btn', '🏠 나가기');
    bExit.type = 'button';
    bExit.addEventListener('click', () => { cleanup(); window.location.href = 'hub.html'; });
    acts.appendChild(bRetry);
    acts.appendChild(bPick);
    acts.appendChild(bExit);
    res.appendChild(acts);
    res.hidden = false;

    if (child === 'daughter') speak('이겼다! 최고야!');
    WorldSFX.play('levelup');
  }

  function cleanup() {
    clearTimeout(toastTimer);
    if (loop) loop.stop();
    if (input && input.destroy) input.destroy();
    if (viewMount && viewMount.destroy) viewMount.destroy();
    loop = null;
    input = null;
    viewMount = null;
  }

  function onVis() {
    if (!loop || !playing || ended) return;
    if (document.hidden) loop.stop();
    else loop.start();
  }

  function boot() {
    child = WorldSave.childOf() || 'son';
    defLvl = child === 'daughter' ? 'kid' : 'normal';
    const stage = $('stage');
    if (stage && child === 'daughter') {
      stage.classList.remove('theme--arcade');
      stage.classList.add('theme--slime');
    }
    $('exitBtn').addEventListener('click', () => { cleanup(); window.location.href = 'hub.html'; });
    document.addEventListener('pointerdown', () => { try { WorldSFX.unlock(); } catch (e) { warn(e); } }, { once: true });
    document.addEventListener('visibilitychange', onVis);

    viewMount = WorldView.mount($('cv'));
    input = WorldInput.attach(stage);
    fx = WorldFX.createFx();

    collectFriends();
    syncSelectionFromState();
    renderSheet();

    const sls = typeof window.StudyLogStore !== 'undefined' ? window.StudyLogStore : null;
    if (sls && typeof sls.refreshStreak === 'function') {
      Promise.resolve(sls.refreshStreak(child)).then(() => {
        const d = sls.getStreakData && sls.getStreakData(child);
        studied = !!(d && d.studiedToday);
      }).catch(warn);
    }
    Promise.all([Promise.resolve(WorldSave.pull(child)), loadOwned()]).then(() => {
      if (!playing) {
        collectFriends();
        syncSelectionFromState();
        renderSheet();
      }
    }).catch(warn);
  }

  window.ArenaUI = Object.freeze({ boot });
})();
