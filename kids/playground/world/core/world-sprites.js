// world-sprites.js — 초안: 안티그래비티 Hydrogen, 검토: Claude (docs/world_module_spec.md §11)
(function () {
  'use strict';

  // 작성자 표기 상수 (실제 이름 치환 지점)
  const AUTHORS = Object.freeze({ son: '민수', daughter: '민서', shared: '공동' });
  const LOAD_TIMEOUT_MS = 4000;
  const loadCache = new Map();

  // 상대 경로를 루트 기준으로 보정
  function resolvePath(src, root) {
    if (typeof src !== 'string' || !src) return '';
    if (/^https?:\/\//i.test(src)) return src;
    const base = typeof root === 'string' ? root : '';
    if (src.startsWith('./kids/')) return base + src.slice(2);
    if (src.startsWith('kids/')) return base + src;
    return src;
  }

  // 현재 아이와 손님 여부에 따른 허용 작성자 목록
  function authorsFor(child, guest) {
    if (child === 'son') return guest ? [AUTHORS.son, AUTHORS.shared, AUTHORS.daughter] : [AUTHORS.son, AUTHORS.shared];
    if (child === 'daughter') {
      return guest ? [AUTHORS.daughter, AUTHORS.shared, AUTHORS.son] : [AUTHORS.daughter, AUTHORS.shared];
    }
    return guest ? [AUTHORS.son, AUTHORS.daughter, AUTHORS.shared] : [AUTHORS.shared];
  }

  // 갤러리·몬스터 항목을 통합 수집 (갤러리 우선, 몬스터 뒤)
  function collect(opts) {
    const o = opts && typeof opts === 'object' ? opts : {};
    const items = Array.isArray(o.items) ? o.items : [];
    const roster = o.roster && typeof o.roster === 'object' ? o.roster : {};
    const order = Array.isArray(o.order) ? o.order : [];
    const allowed = new Set(authorsFor(o.child, o.guest));
    const seenIds = new Set();
    const out = [];

    if (typeof o.charactersOf === 'function') {
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (!it || typeof it !== 'object' || !allowed.has(it.author)) continue;
        let chars = null;
        try { chars = o.charactersOf(it); } catch (_) { chars = null; }
        if (!Array.isArray(chars)) continue;
        const artId = it.id != null ? String(it.id) : '';
        if (!artId) continue;
        for (let j = 0; j < chars.length; j++) {
          const ch = chars[j];
          if (!ch || typeof ch !== 'object') continue;
          const key = ch.key != null ? String(ch.key) : '';
          if (!key) continue;
          const id = 'gal:' + artId + '#' + key;
          if (seenIds.has(id)) continue;
          seenIds.add(id);
          out.push({
            id,
            kind: 'gallery',
            artId,
            charKey: key,
            name: ch.name || it.title || '',
            src: resolvePath(ch.spriteUrl || ch.src || '', o.root),
            poses: null,
            author: it.author || '',
            title: it.title || '',
            date: it.date || '',
            category: it.category || ''
          });
        }
      }
    }

    for (let i = 0; i < order.length; i++) {
      const mId = order[i];
      const m = roster[mId];
      if (!m || typeof m !== 'object') continue;
      const rawId = m.id != null ? String(m.id) : String(mId);
      const id = 'mon:' + rawId;
      if (seenIds.has(id)) continue;
      seenIds.add(id);
      const poses = {};
      if (m.poses && typeof m.poses === 'object') {
        const keys = Object.keys(m.poses);
        for (let k = 0; k < keys.length; k++) {
          const pk = keys[k];
          if (m.poses[pk]) poses[pk] = resolvePath(m.poses[pk], o.root);
        }
      }
      out.push({
        id,
        kind: 'monster',
        name: m.name || rawId,
        src: poses.idle || '',
        poses,
        author: AUTHORS.son
      });
    }
    return out;
  }

  // 표준 RGB(0~255) -> HSL(h:0~360, s:0~1, l:0~1)
  function rgbToHsl(r, g, b) {
    const rn = r / 255, gn = g / 255, bn = b / 255;
    const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
    const l = (max + min) / 2;
    if (max === min) return { h: 0, s: 0, l };
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h = 0;
    if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    return { h: h * 60, s, l };
  }

  // 색상각·채도·명도로 성향 코드 판정
  function hueTrait(r, g, b) {
    if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b)) return 'r';
    const { h, s, l } = rgbToHsl(r, g, b);
    if (s < 0.25 || l < 0.15 || l > 0.9) return 'r';
    if (h < 40 || h >= 330) return 'f';
    if (h < 70) return 'l';
    if (h < 170) return 'w';
    if (h < 260) return 'i';
    return 'x';
  }

  // 12구간 색상 히스토그램 기반 대표색 추출
  function dominantColor(img) {
    if (!img || !img.data || !img.data.length) return null;
    const data = img.data;
    const bins = Array.from({ length: 12 }, () => ({ n: 0, r: 0, g: 0, b: 0 }));
    let opN = 0, opR = 0, opG = 0, opB = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] <= 128) continue;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      opN++; opR += r; opG += g; opB += b;
      const { h, s } = rgbToHsl(r, g, b);
      if (s < 0.25) continue;
      const bin = Math.floor(h / 30) % 12;
      bins[bin].n++; bins[bin].r += r; bins[bin].g += g; bins[bin].b += b;
    }
    let best = null;
    for (let i = 0; i < 12; i++) {
      if (bins[i].n > 0 && (!best || bins[i].n > best.n)) best = bins[i];
    }
    if (best) return { r: Math.round(best.r / best.n), g: Math.round(best.g / best.n), b: Math.round(best.b / best.n) };
    if (opN > 0) return { r: Math.round(opR / opN), g: Math.round(opG / opN), b: Math.round(opB / opN) };
    return null;
  }

  // 아직 보지 않은 갤러리 새 친구 필터 (몬스터 제외)
  function newFriends(list, seen, idMap) {
    if (!Array.isArray(list) || !idMap || typeof idMap.get !== 'function') return [];
    const seenSet = seen instanceof Set ? seen : new Set(Array.isArray(seen) ? seen : []);
    const out = [];
    for (let i = 0; i < list.length; i++) {
      const it = list[i];
      if (!it || it.kind !== 'gallery') continue;
      const sid = idMap.get(it.id);
      if (sid != null && !seenSet.has(sid)) out.push(it);
    }
    return out;
  }

  // 현재 살아있는 idMap 값에 포함된 단축 ID만 유지 (원본 배열 불변)
  function liveOnly(savedShortIds, idMap) {
    if (!Array.isArray(savedShortIds) || !idMap || typeof idMap.values !== 'function') return [];
    const live = new Set(idMap.values());
    return savedShortIds.filter((id) => live.has(id));
  }

  // 이미지 로드 후 축소 캔버스·대표색·성향 반환 (src+size 캐시)
  function load(item, size) {
    const src = typeof item === 'string' ? item : (item && item.src ? item.src : '');
    const maxSide = Number.isFinite(size) && size > 0 ? Math.round(size) : 64;
    if (!src || typeof Image === 'undefined' || typeof document === 'undefined') return Promise.resolve(null);
    const cacheKey = src + '|' + maxSide;
    if (loadCache.has(cacheKey)) return loadCache.get(cacheKey);

    const p = new Promise((resolve) => {
      const img = new Image();
      let settled = false;
      const done = (val) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        img.onload = img.onerror = null;
        if (!val) loadCache.delete(cacheKey);
        resolve(val);
      };
      const timer = setTimeout(() => done(null), LOAD_TIMEOUT_MS);
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const nw = img.naturalWidth || img.width || 1;
          const nh = img.naturalHeight || img.height || 1;
          const scale = maxSide / Math.max(nw, nh);
          const w = Math.max(1, Math.round(nw * scale));
          const h = Math.max(1, Math.round(nh * scale));
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) return done(null);
          ctx.drawImage(img, 0, 0, w, h);
          let color = null;
          let trait = 'r';
          try {
            color = dominantColor(ctx.getImageData(0, 0, w, h));
            if (color) trait = hueTrait(color.r, color.g, color.b);
          } catch (_) {
            color = null;
            trait = 'r';
          }
          done({ canvas, color, trait });
        } catch (_) {
          done(null);
        }
      };
      img.onerror = () => done(null);
      img.src = src;
    });

    loadCache.set(cacheKey, p);
    return p;
  }

  const root = typeof window !== 'undefined' ? window : globalThis;
  root.WorldSprites = Object.freeze({
    resolvePath, authorsFor, collect, hueTrait, dominantColor, newFriends, liveOnly, load
  });
})();
