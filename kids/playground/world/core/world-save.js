// world-save.js — 초안: 안티그래비티 Hydrogen, 검토: Claude (docs/world_module_spec.md §11)
(function () {
  'use strict';
  const root = typeof window !== 'undefined' ? window : globalThis;
  const ID_RE = /^[0-9a-z]{6,7}$/;
  const CFG_KEYS = ['p', 'b', 't', 'w', 'e', 'c', 'd'];
  const CFG_RULES = {
    p: v => v === 'a' || v === 's' || v === 'm' || v === 'h',
    b: v => ID_RE.test(v),
    t: v => v === 's' || v === 'e' || v === 'b' || v === 'm',
    w: v => v === 'b' || v === 'r' || v === 's',
    e: v => v === 'f' || v === 'i' || v === 'l' || v === 'w' || v === 'x' || v === 'r',
    c: v => /^[0-5]$/.test(v),
    d: v => v === 'd' || v === 'f'
  };
  const B36_6 = 2176782336;
  const KEY_PREFIX = 'kids_world_v1_';
  const MAX_PACK = 1800;

  let syncHook = null;
  const syncTimers = Object.create(null);

  // UTF-8 바이트 변환 (TextEncoder 우선, 폴백 encodeURIComponent)
  function toUtf8Bytes(text) {
    const s = String(text == null ? '' : text);
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(s);
    const out = [];
    try {
      const enc = encodeURIComponent(s);
      for (let i = 0; i < enc.length; i++) {
        if (enc[i] === '%') { out.push(parseInt(enc.slice(i + 1, i + 3), 16)); i += 2; }
        else out.push(enc.charCodeAt(i));
      }
    } catch (_) {
      for (let i = 0; i < s.length; i++) out.push(s.charCodeAt(i) & 0xff);
    }
    return out;
  }

  function fnv1a(text) {
    const bytes = toUtf8Bytes(text);
    let h = 0x811c9dc5;
    for (let i = 0; i < bytes.length; i++) { h ^= bytes[i]; h = Math.imul(h, 0x01000193); }
    return h >>> 0;
  }

  function shortId(fullId, len = 6) {
    const s = String(fullId == null ? '' : fullId);
    const base = (fnv1a(s) % B36_6).toString(36).padStart(6, '0');
    // 7번째 글자는 '#'를 앞에 붙인 독립 해시 (뒤에 붙이면 원래 해시가 같을 때 결과도 같아 충돌을 못 푼다)
    return len === 7 ? base + (fnv1a('#' + s) % 36).toString(36) : base;
  }

  function assignIds(fullIds) {
    const out = new Map();
    if (!fullIds || typeof fullIds[Symbol.iterator] !== 'function') return out;
    const groups = new Map();
    for (const raw of fullIds) {
      const id = String(raw);
      const s6 = shortId(id, 6);
      if (!groups.has(s6)) groups.set(s6, new Set());
      groups.get(s6).add(id);
    }
    for (const [s6, set] of groups) {
      if (set.size === 1) { for (const id of set) out.set(id, s6); }
      else { for (const id of set) out.set(id, shortId(id, 7)); }
    }
    return out;
  }

  function emptyState() {
    return { v: 1, at: 0, arena: { best: {}, loadout: {} }, seen: [], found: [], cfg: { _t: 0 }, guest: false, keys: 0 };
  }

  function toUint(v) { return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0; }

  function cleanIdList(arr) {
    if (!Array.isArray(arr)) return [];
    const set = new Set();
    for (let i = 0; i < arr.length; i++) {
      if (typeof arr[i] === 'string' && ID_RE.test(arr[i])) set.add(arr[i]);
    }
    return Array.from(set).sort();
  }

  function clean(raw) {
    const st = emptyState();
    if (!raw || typeof raw !== 'object') return st;
    st.at = toUint(raw.at);
    const ar = raw.arena && typeof raw.arena === 'object' ? raw.arena : null;
    if (ar && ar.best && typeof ar.best === 'object') {
      const ks = Object.keys(ar.best).sort();
      for (let i = 0; i < ks.length; i++) {
        const k = ks[i], val = ar.best[k];
        if (!k || k === '__proto__') continue;
        if (typeof val === 'number' && Number.isFinite(val) && val > 0 && val <= 3600) {
          const r = Math.round(val * 10) / 10;
          if (r > 0 && r <= 3600) st.arena.best[k] = r;
        }
      }
    }
    if (ar && ar.loadout && typeof ar.loadout === 'object') {
      const ks = Object.keys(ar.loadout).sort();
      for (let i = 0; i < ks.length; i++) {
        const k = ks[i], val = ar.loadout[k];
        if (!k || k === '__proto__') continue;
        if (typeof val === 'string' && val.length <= 40) st.arena.loadout[k] = val;
      }
    }
    st.seen = cleanIdList(raw.seen);
    st.found = cleanIdList(raw.found);
    if (raw.cfg && typeof raw.cfg === 'object') {
      const cfg = {};
      const ks = Object.keys(raw.cfg).sort();
      for (let i = 0; i < ks.length; i++) {
        const k = ks[i], val = raw.cfg[k];
        if (ID_RE.test(k) && typeof val === 'string' && val.length <= 60) cfg[k] = val;
      }
      cfg._t = toUint(raw.cfg._t);
      st.cfg = cfg;
    }
    st.guest = raw.guest === true;
    const k = raw.keys;
    st.keys = typeof k === 'number' && Number.isInteger(k) && k >= 0 && k <= 99 ? k : 0;
    return st;
  }

  function unionSorted(a, b) {
    const set = new Set(a);
    for (let i = 0; i < b.length; i++) set.add(b[i]);
    return Array.from(set).sort();
  }

  function pickTie(va, vb) { return JSON.stringify(va) >= JSON.stringify(vb) ? va : vb; }

  function cloneObj(o) {
    const out = {};
    const ks = Object.keys(o);
    for (let i = 0; i < ks.length; i++) out[ks[i]] = o[ks[i]];
    return out;
  }

  function merge(a, b) {
    const ca = clean(a), cb = clean(b), out = emptyState();
    out.at = Math.max(ca.at, cb.at);
    const bKeys = unionSorted(Object.keys(ca.arena.best), Object.keys(cb.arena.best));
    for (let i = 0; i < bKeys.length; i++) {
      const k = bKeys[i], va = ca.arena.best[k], vb = cb.arena.best[k];
      out.arena.best[k] = va !== undefined && vb !== undefined ? Math.min(va, vb) : (va !== undefined ? va : vb);
    }
    if (ca.at !== cb.at) {
      const win = ca.at > cb.at ? ca : cb;
      out.arena.loadout = cloneObj(win.arena.loadout);
      out.guest = win.guest;
      out.keys = win.keys;
    } else {
      out.arena.loadout = cloneObj(pickTie(ca.arena.loadout, cb.arena.loadout));
      out.guest = pickTie(ca.guest, cb.guest);
      out.keys = pickTie(ca.keys, cb.keys);
    }
    out.seen = unionSorted(ca.seen, cb.seen);
    out.found = unionSorted(ca.found, cb.found);
    if (ca.cfg._t !== cb.cfg._t) out.cfg = cloneObj(ca.cfg._t > cb.cfg._t ? ca.cfg : cb.cfg);
    else out.cfg = cloneObj(pickTie(ca.cfg, cb.cfg));
    return out;
  }

  function pack(state, liveIds) {
    const s = clean(state);
    let json = JSON.stringify(s);
    if (json.length <= MAX_PACK) return json;
    const bKeys = Object.keys(s.arena.best).sort();
    for (let i = 0; i < bKeys.length; i++) {
      delete s.arena.best[bKeys[i]];
      json = JSON.stringify(s);
      if (json.length <= MAX_PACK) return json;
    }
    const live = new Set(liveIds && typeof liveIds[Symbol.iterator] === 'function' ? liveIds : []);
    const cKeys = Object.keys(s.cfg).filter(k => k !== '_t' && !live.has(k)).sort();
    for (let i = 0; i < cKeys.length; i++) {
      delete s.cfg[cKeys[i]];
      json = JSON.stringify(s);
      if (json.length <= MAX_PACK) return json;
    }
    throw new Error('pack: size limit exceeded');
  }

  function parseCfg(text) {
    const out = {};
    if (typeof text !== 'string' || !text) return out;
    const raw = {};
    const parts = text.split(';');
    for (let i = 0; i < parts.length; i++) {
      const eq = parts[i].indexOf('=');
      if (eq > 0) raw[parts[i].slice(0, eq)] = parts[i].slice(eq + 1);
    }
    for (let i = 0; i < CFG_KEYS.length; i++) {
      const k = CFG_KEYS[i];
      if (Object.prototype.hasOwnProperty.call(raw, k) && CFG_RULES[k](raw[k])) out[k] = k === 'c' ? Number(raw[k]) : raw[k];
    }
    return out;
  }

  function formatCfg(obj) {
    if (!obj || typeof obj !== 'object') return '';
    const out = [];
    for (let i = 0; i < CFG_KEYS.length; i++) {
      const k = CFG_KEYS[i];
      if (obj[k] == null) continue;
      const v = String(obj[k]);
      if (CFG_RULES[k](v)) out.push(k + '=' + v);
    }
    return out.join(';');
  }

  function getLs() { try { return root.localStorage || null; } catch (_) { return null; } }
  function isChild(c) { return c === 'son' || c === 'daughter'; }

  function childOf() {
    try {
      const ls = getLs(), u = ls ? ls.getItem('currentUser') : null;
      return isChild(u) ? u : null;
    } catch (_) { return null; }
  }

  function isParent() {
    try {
      const ls = getLs(), n = ls ? ls.getItem('currentUserName') : null;
      return n === '아빠' || n === '엄마' || n === '어른';
    } catch (_) { return false; }
  }

  function load(child) {
    if (!isChild(child)) return emptyState();
    try {
      const ls = getLs(), raw = ls ? ls.getItem(KEY_PREFIX + child) : null;
      return raw ? clean(JSON.parse(raw)) : emptyState();
    } catch (_) { return emptyState(); }
  }

  function save(child, state) {
    if (!isChild(child)) return false;
    try {
      const ls = getLs();
      if (!ls) return false;
      ls.setItem(KEY_PREFIX + child, JSON.stringify(clean(state)));
      return true;
    } catch (_) { return false; }
  }

  function setSyncHook(fn) { syncHook = typeof fn === 'function' ? fn : null; }

  function update(child, fn) {
    if (!isChild(child)) return null;
    const cur = load(child);
    let next = cur;
    if (typeof fn === 'function') {
      try { const res = fn(cur); if (res && typeof res === 'object') next = res; }
      catch (_) { return null; }
    }
    const cleaned = clean(next);
    cleaned.at = Date.now();
    // 설정(cfg)이 바뀌었으면 _t도 올려야 두 기기 합칠 때 새 설정이 이긴다 (Claude 추가)
    const cfgBody = c => JSON.stringify(Object.keys(c).filter(k => k !== '_t').sort().map(k => [k, c[k]]));
    if (cfgBody(cleaned.cfg) !== cfgBody(cur.cfg)) cleaned.cfg._t = cleaned.at;
    save(child, cleaned);
    if (!isParent() && syncHook) {
      if (syncTimers[child]) clearTimeout(syncTimers[child]);
      syncTimers[child] = setTimeout(() => {
        delete syncTimers[child];
        if (syncHook) try { syncHook(child); } catch (_) {}
      }, 1500);
    }
    return cleaned;
  }

  // ───── 노션 「월드기록」 동기화 (Claude 작성, gallery-runner-rewards.js 「런너기록」과 같은 방식) ─────
  // 그 칸 하나만 읽고 그 칸 하나만 PATCH한다. 칸이 없거나 rich_text가 아니거나 JSON이 깨졌으면 쓰지 않는다.
  const PROP = '월드기록';
  const NAMES = { son: '민수', daughter: '민서' };
  const queues = Object.create(null);
  let liveIds = null; // null이면 cfg의 모든 그림을 살아 있는 것으로 본다(pack이 설정을 버리지 않게)

  function setLiveIds(ids) { liveIds = Array.isArray(ids) ? ids.filter(id => ID_RE.test(id)) : null; }
  function canSync(child) { return isChild(child) && !isParent() && typeof root.fetch === 'function'; }
  function enqueue(child, task) {
    const next = (queues[child] || Promise.resolve()).then(task).catch(error => {
      try { console.warn('[월드기록 동기화]', error && error.message); } catch (_) { /* 기록 실패 무시 */ }
      return false;
    });
    queues[child] = next; return next;
  }
  async function cloudOf(child) {
    const config = typeof root.APP_CONFIG === 'object' && root.APP_CONFIG ? root.APP_CONFIG : {};
    const proxy = String(config.WORKER_PROXY_URL || 'https://minmin-notion.awslike6.workers.dev').replace(/\/$/, '');
    const db = config.INVENTORY_DB_ID || '374a27115b688042bb61e6a102242e12';
    const name = NAMES[child], cacheKey = `MINMIN_INVENTORY_PAGE_ID_${name}`, ls = getLs();
    const headers = { 'Content-Type': 'application/json', 'Notion-Version': '2022-06-28' };
    let pageId = null;
    try { pageId = ls ? ls.getItem(cacheKey) : null; } catch (_) { /* 캐시 없이 조회 */ }
    if (!pageId) {
      const res = await root.fetch(`${proxy}/v1/databases/${db}/query`, { method: 'POST', headers,
        body: JSON.stringify({ filter: { property: '이름', title: { equals: name } } }) });
      if (!res.ok) throw new Error(`인벤토리 조회 ${res.status}`);
      pageId = (await res.json()).results?.[0]?.id;
      if (!pageId) return null;
      try { if (ls) ls.setItem(cacheKey, pageId); } catch (_) { /* 캐시 실패는 무시 */ }
    }
    const url = `${proxy}/v1/pages/${encodeURIComponent(pageId)}`;
    const res = await root.fetch(`${url}?force=true`, { headers });
    if (!res.ok) throw new Error(`월드기록 조회 ${res.status}`);
    const prop = (await res.json()).properties?.[PROP];
    if (prop?.type !== 'rich_text' || !Array.isArray(prop.rich_text)) return null;
    const text = prop.rich_text.map(p => p.plain_text ?? p.text?.content ?? '').join('');
    const raw = text ? JSON.parse(text) : {};
    if (text && (!raw || raw.v !== 1)) throw new Error('월드기록 JSON 형식 오류');
    return { url, headers, text, state: text ? clean(raw) : emptyState() };
  }
  function pull(child) {
    if (!canSync(child)) return Promise.resolve(false);
    return enqueue(child, async () => {
      const cloud = await cloudOf(child);
      if (!cloud) return false;
      const merged = merge(load(child), cloud.state);
      return save(child, merged) ? merged : false;
    });
  }
  function flush(child) {
    if (!canSync(child)) return Promise.resolve(false);
    return enqueue(child, async () => {
      const cloud = await cloudOf(child);
      if (!cloud) return false;
      const merged = merge(load(child), cloud.state);
      const content = pack(merged, liveIds || Object.keys(merged.cfg).filter(k => k !== '_t'));
      if (content !== cloud.text) {
        const res = await root.fetch(cloud.url, { method: 'PATCH', headers: cloud.headers,
          body: JSON.stringify({ properties: { [PROP]: { rich_text: [{ text: { content } }] } } }) });
        if (!res.ok) throw new Error(`월드기록 저장 ${res.status}`);
      }
      // PATCH 도중 바뀐 기기 값도 합쳐서 남긴다(합치기는 멱등이라 안전).
      const latest = merge(load(child), merged);
      return save(child, latest) ? latest : false;
    });
  }
  syncHook = flush;

  root.WorldSave = Object.freeze({
    fnv1a, shortId, assignIds, emptyState, clean, merge, pack,
    parseCfg, formatCfg, childOf, isParent, load, save, update, setSyncHook, setLiveIds, pull, flush
  });
})();
