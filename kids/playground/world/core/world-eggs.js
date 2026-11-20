// world-eggs.js — 작성: Claude (docs/world_module_spec.md §17-1·17-2)
// 아이가 찰칵등록 「🧸 내 캐릭터」로 올린 그림은 등록 전까지 「🥚 알」로 보인다.
// Worker 대기열의 사진 없는 요약만 읽는다(쓰지 않음). 등록 뒤 작품 id를 미리 알려고 등록 도구의 규칙을 그대로 쓴다.
(function () {
  'use strict';
  const root = typeof window !== 'undefined' ? window : globalThis;
  const FOLDER = { 민수: 'minsu', 민서: 'minseo', 공동: 'together', 공통: 'together' };
  const NAME = { son: '민수', daughter: '민서' };
  const KEY = 'kids_world_eggs_';
  const MAX_KNOWN = 30;

  // master-tower scripts/gallery_registration_options.py AUTHOR_MAP·strip_author_prefix와 같은 규칙
  function artIdFor(filename, author) {
    const folder = FOLDER[author] || 'minsu';
    let stem = String(filename || '').replace(/\.[^.]+$/, '');
    if (!stem) return null;
    if (stem.startsWith(`art_${folder}_`)) stem = stem.slice(folder.length + 5);
    else if (stem.startsWith(`${folder}_`)) stem = stem.slice(folder.length + 1);
    return `art_${folder}_${stem}`;
  }

  function pick(items, child) {
    const who = NAME[child];
    if (!who || !Array.isArray(items)) return [];
    return items.filter(it => it && it.category === '캐릭터' && it.author === who && it.filename)
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')) || String(a.id).localeCompare(String(b.id)))
      .slice(0, 3)
      .map(it => ({ id: String(it.id || ''), artId: artIdFor(it.filename, it.author), name: String(it.memo || '').trim() || '새 친구',
        date: String(it.date || '') }))
      .filter(e => e.artId);
  }

  async function fetchPending(child) {
    if (!NAME[child] || typeof root.fetch !== 'function') return [];
    try {
      const config = typeof root.APP_CONFIG === 'object' && root.APP_CONFIG ? root.APP_CONFIG : {};
      const proxy = String(config.WORKER_PROXY_URL || 'https://minmin-notion.awslike6.workers.dev').replace(/\/$/, '');
      const res = await root.fetch(`${proxy}/api/pending-media`);
      if (!res.ok) return [];
      const body = await res.json();
      return pick(body && body.items, child);
    } catch (_) { return []; }
  }

  function ls() { try { return root.localStorage || null; } catch (_) { return null; } }
  function known(child) {
    if (!NAME[child]) return [];
    try {
      const raw = JSON.parse((ls() && ls().getItem(KEY + child)) || '[]');
      return Array.isArray(raw) ? raw.filter(x => typeof x === 'string' && /^art_[a-z]+_/.test(x)) : [];
    } catch (_) { return []; }
  }
  function remember(child, eggs) {
    if (!NAME[child] || !Array.isArray(eggs)) return known(child);
    const merged = [...new Set(known(child).concat(eggs.map(e => e && e.artId).filter(Boolean)))].slice(-MAX_KNOWN);
    try { if (ls()) ls().setItem(KEY + child, JSON.stringify(merged)); } catch (_) { /* 저장 실패는 무시 */ }
    return merged;
  }

  root.WorldEggs = Object.freeze({ artIdFor, pick, fetchPending, remember, known });
})();
