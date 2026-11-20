// garden-logic.js — 초안: 안티그래비티 Hydrogen, 검토: Claude (docs/world_module_spec.md §14)
(function () {
  'use strict';
  const root = typeof window !== 'undefined' ? window : globalThis;

  const SPOTS = Object.freeze([
    { kind: 'bush', x: 0.2, y: 0.3 },
    { kind: 'bush', x: 0.78, y: 0.42 },
    { kind: 'bush', x: 0.3, y: 0.72 },
    { kind: 'bud', x: 0.55, y: 0.22 },
    { kind: 'bud', x: 0.15, y: 0.52 },
    { kind: 'bud', x: 0.7, y: 0.66 },
    { kind: 'pool', x: 0.45, y: 0.47 },
    { kind: 'pool', x: 0.82, y: 0.82 }
  ].map(function (s) {
    return Object.freeze(s);
  }));

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function sortGallery(items) {
    return items.filter(function (it) {
      return it && it.kind === 'gallery';
    }).sort(function (a, b) {
      const da = String(a.date || '');
      const db = String(b.date || '');
      if (da !== db) return db > da ? 1 : -1;
      const ia = String(a.id || '');
      const ib = String(b.id || '');
      return ia < ib ? -1 : (ia > ib ? 1 : 0);
    });
  }

  // idMap은 WorldSave.assignIds의 Map(계약 §14-2). 일반 객체도 받는다 (Claude 수정: map[id]로 읽어 늘 비던 문제)
  function sidOf(map, id) { return map && typeof map.get === 'function' ? map.get(id) : (map ? map[id] : undefined); }

  function baseline(items, found, idMap) {
    const list = Array.isArray(items) ? items : [];
    const foundArr = Array.isArray(found) ? found : [];
    const map = idMap && typeof idMap === 'object' ? idMap : {};
    const sorted = sortGallery(list);
    if (foundArr.length === 0) {
      const hidden = sorted.slice(0, 3).map(function (it) { return it.id; });
      const toFound = [];
      for (let i = 3; i < sorted.length; i += 1) {
        const sid = sidOf(map, sorted[i].id);
        if (sid !== undefined && sid !== null && sid !== '') toFound.push(sid);
      }
      return { toFound: toFound, hidden: hidden };
    }
    const foundSet = new Set(foundArr);
    const hidden = [];
    for (let i = 0; i < sorted.length && hidden.length < 8; i += 1) {
      const it = sorted[i];
      if (!foundSet.has(sidOf(map, it.id))) hidden.push(it.id);
    }
    return { toFound: [], hidden: hidden };
  }

  function visibleIds(items, found, idMap) {
    const list = Array.isArray(items) ? items : [];
    const foundArr = Array.isArray(found) ? found : [];
    if (foundArr.length === 0) {
      return list.filter(function (it) { return Boolean(it); }).map(function (it) { return it.id; });
    }
    const foundSet = new Set(foundArr);
    const map = idMap && typeof idMap === 'object' ? idMap : {};
    const out = [];
    for (let i = 0; i < list.length; i += 1) {
      const it = list[i];
      if (!it) continue;
      if (it.kind === 'monster' || (it.kind === 'gallery' && foundSet.has(sidOf(map, it.id)))) {
        out.push(it.id);
      }
    }
    return out;
  }

  function decoFor(kind, rand) {
    if (kind === 'bush') {
      return rand() < 0.3 ? { type: 'key' } : { type: 'deco', deco: 'butterfly' };
    }
    if (kind === 'bud') return { type: 'deco', deco: 'flower' };
    return { type: 'deco', deco: 'star' };
  }

  // eggArtIds: 기기가 기억하는 「🥚 알」의 작품 id(§17-3). 그 친구는 알 자리로 숨는다 (Claude)
  function plan(hiddenIds, rng, eggArtIds) {
    const eggs = new Set(Array.isArray(eggArtIds) ? eggArtIds : []);
    const artOf = (id) => String(id || '').replace(/^gal:/, '').split('#')[0];
    const rand = typeof rng === 'function' ? rng : mulberry32(0x6d2b79f5);
    const ids = Array.isArray(hiddenIds) ? hiddenIds : [];
    const spots = SPOTS.map(function (s, i) {
      return { i: i, kind: s.kind, x: s.x, y: s.y, taps: 0, water: 0, open: false, content: null };
    });
    const order = spots.map(function (_, i) { return i; });
    for (let k = order.length - 1; k > 0; k -= 1) {
      const j = Math.min(k, Math.floor(rand() * (k + 1)));
      const tmp = order[k];
      order[k] = order[j];
      order[j] = tmp;
    }
    const n = Math.min(spots.length, ids.length);
    for (let m = 0; m < order.length; m += 1) {
      const idx = order[m];
      spots[idx].content = m < n
        ? (eggs.has(artOf(ids[m])) ? { type: 'friend', id: ids[m], egg: true } : { type: 'friend', id: ids[m] })
        : decoFor(spots[idx].kind, rand);
    }
    return spots;
  }

  function tap(spot) {
    if (!spot || spot.open) return null;
    const isEgg = !!(spot.content && spot.content.egg); // 알은 자리 종류와 상관없이 톡톡 3번
    if (spot.kind === 'bush' || isEgg) {
      spot.taps = (spot.taps || 0) + 1;
      if (spot.taps >= 3) {
        spot.open = true;
        return { open: true, content: spot.content };
      }
      return { shake: true, taps: spot.taps };
    }
    if (spot.kind === 'bud') return { need: 'water' };
    if (spot.kind === 'pool') return { need: 'key' };
    return null;
  }

  function water(spot, amount) {
    if (!spot || spot.open || spot.kind !== 'bud') return null;
    const add = typeof amount === 'number' && amount > 0 ? amount : 0;
    spot.water = (spot.water || 0) + add;
    if (spot.water >= 1) {
      spot.open = true;
      return { open: true, content: spot.content };
    }
    return { water: spot.water };
  }

  function unlock(spot, keys) {
    if (!spot || spot.open || spot.kind !== 'pool') return null;
    const k = typeof keys === 'number' ? keys : 0;
    if (k <= 0) return { need: 'key' };
    spot.open = true;
    return { open: true, content: spot.content, keys: k - 1 };
  }

  function nearest(spots, x, y, r) {
    const list = Array.isArray(spots) ? spots : [];
    const radius = typeof r === 'number' ? r : 0.09;
    let best = null;
    let bestDist = Infinity;
    for (let i = 0; i < list.length; i += 1) {
      const s = list[i];
      if (!s || s.open) continue;
      const d = Math.hypot(x - s.x, y - s.y);
      if (d <= radius && d < bestDist) {
        bestDist = d;
        best = s;
      }
    }
    return best;
  }

  root.GardenLogic = Object.freeze({
    SPOTS: SPOTS,
    baseline: baseline,
    visibleIds: visibleIds,
    plan: plan,
    tap: tap,
    water: water,
    unlock: unlock,
    nearest: nearest
  });
}());
