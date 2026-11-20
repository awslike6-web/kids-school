// world-voice.js — 초안: 안티그래비티 Hydrogen, 검토: Claude (docs/world_module_spec.md §17-4)
(() => {
  'use strict';
  const root = typeof window !== 'undefined' ? window : globalThis;
  const DB_NAME = 'kids_world_voice';
  const DB_VER = 1;
  const STORE = 'clips';
  const MAX_CLIPS = 30;
  const SHORT_RE = /^[0-9a-z]{6,7}$/;
  let recording = false;

  const valid = (child, shortId) =>
    (child === 'son' || child === 'daughter') && typeof shortId === 'string' && SHORT_RE.test(shortId);

  const keyOf = (child, shortId) => `${child}:${shortId}`;

  const trimPlan = (list, max = MAX_CLIPS) => {
    if (!Array.isArray(list)) return [];
    const limit = Number.isFinite(max) && max >= 0 ? Math.floor(max) : MAX_CLIPS;
    if (list.length <= limit) return [];
    const sorted = list.slice().sort((a, b) => (a?.at || 0) - (b?.at || 0));
    return sorted.slice(0, sorted.length - limit).map((item) => item.key);
  };

  const supported = () =>
    Boolean(root.navigator?.mediaDevices?.getUserMedia && root.MediaRecorder && root.indexedDB);

  const reqP = (req) => new Promise((res, rej) => {
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error || new Error('idb'));
  });

  const openDb = () => new Promise((res, rej) => {
    const idb = root.indexedDB;
    if (!idb) return rej(new Error('no_idb'));
    const req = idb.open(DB_NAME, DB_VER);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'key' });
    };
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error || new Error('open'));
  });

  const withStore = async (mode, fn) => {
    let db;
    try {
      db = await openDb();
      return await fn(db.transaction(STORE, mode).objectStore(STORE));
    } finally {
      if (db) db.close();
    }
  };

  const record = async (child, shortId, ms = 2500) => {
    if (!valid(child, shortId) || !supported() || recording) return false;
    recording = true;
    let stream;
    try {
      const dur = Number.isFinite(ms) && ms > 0 ? ms : 2500;
      stream = await root.navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new root.MediaRecorder(stream);
      const BlobCtor = root.Blob || Blob;
      const { blob, type } = await new Promise((res, rej) => {
        const chunks = [];
        let timer = null;
        rec.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.push(e.data); };
        rec.onerror = () => { if (timer) clearTimeout(timer); rej(new Error('rec')); };
        rec.onstop = () => {
          if (timer) clearTimeout(timer);
          const mime = rec.mimeType || 'audio/webm';
          res({ blob: new BlobCtor(chunks, { type: mime }), type: mime });
        };
        rec.start();
        timer = setTimeout(() => { if (rec.state !== 'inactive') rec.stop(); }, dur);
      });
      await withStore('readwrite', async (store) => {
        await reqP(store.put({
          key: keyOf(child, shortId), child, shortId, blob, type, at: Date.now()
        }));
        const all = await reqP(store.getAll());
        const mine = (all || []).filter((x) => x && x.child === child);
        for (const k of trimPlan(mine, MAX_CLIPS)) await reqP(store.delete(k));
      });
      return true;
    } catch {
      return false;
    } finally {
      if (stream) stream.getTracks().forEach((t) => { try { t.stop(); } catch {} });
      recording = false;
    }
  };

  const has = async (child, shortId) => {
    if (!valid(child, shortId) || !root.indexedDB) return false;
    try {
      const item = await withStore('readonly', (s) => reqP(s.get(keyOf(child, shortId))));
      return Boolean(item && item.blob);
    } catch {
      return false;
    }
  };

  const play = async (child, shortId) => {
    const AudioCtor = root.Audio;
    const UrlApi = root.URL;
    if (!valid(child, shortId) || !root.indexedDB || !AudioCtor || !UrlApi?.createObjectURL) return false;
    let url;
    try {
      const item = await withStore('readonly', (s) => reqP(s.get(keyOf(child, shortId))));
      if (!item || !item.blob) return false;
      url = UrlApi.createObjectURL(item.blob);
      const audio = new AudioCtor(url);
      const revoke = () => { try { UrlApi.revokeObjectURL(url); } catch {} };
      audio.addEventListener('ended', revoke, { once: true });
      audio.addEventListener('error', revoke, { once: true });
      await audio.play();
      return true;
    } catch {
      if (url && UrlApi?.revokeObjectURL) { try { UrlApi.revokeObjectURL(url); } catch {} }
      return false;
    }
  };

  const remove = async (child, shortId) => {
    if (!valid(child, shortId) || !root.indexedDB) return false;
    try {
      await withStore('readwrite', (s) => reqP(s.delete(keyOf(child, shortId))));
      return true;
    } catch {
      return false;
    }
  };

  root.WorldVoice = Object.freeze({ supported, record, has, play, remove, keyOf, trimPlan });
})();
