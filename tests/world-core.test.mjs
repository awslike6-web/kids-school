// 내 친구 월드 P1 공용 부품 시험 (docs/world_module_spec.md §11). 작성: Claude — 초안 코드와 독립적으로 계약에서 씀.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CORE = 'kids/playground/world/core';
const read = rel => readFileSync(path.join(ROOT, rel), 'utf8');
const plain = value => JSON.parse(JSON.stringify(value)); // vm realm 값을 이쪽 값으로

class Store {
  constructor(init = {}) { this.map = new Map(Object.entries(init)); }
  getItem(k) { return this.map.has(k) ? this.map.get(k) : null; }
  setItem(k, v) { this.map.set(k, String(v)); }
  removeItem(k) { this.map.delete(k); }
}

function load(file, extra = {}) {
  const sandbox = { console, ...extra };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(read(`${CORE}/${file}`), sandbox, { filename: file });
  return sandbox;
}

// 시드 고정 난수 (mulberry32)
function rng(seed) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

// ───────────── 공통 규칙 ─────────────
const FILES = { 'world-save.js': ['WorldSave', 600], 'world-sprites.js': ['WorldSprites', 600], 'world-view.js': ['WorldView', 600],
  'world-input.js': ['WorldInput', 600], 'world-fx.js': ['WorldFX', 600], 'world-sfx.js': ['WorldSFX', 400] };

test('공통: 불러올 때 DOM 없이 실리고 전역은 하나, 금지어 없음, 줄 수 상한', () => {
  for (const [file, [name, cap]] of Object.entries(FILES)) {
    const src = read(`${CORE}/${file}`);
    const before = new Set(Object.keys(load('world-sfx.js'))); // 기준 키(window, console 등)
    const sb = load(file);
    const added = Object.keys(sb).filter(k => !before.has(k) && k !== 'WorldSFX');
    assert.deepEqual(added.filter(k => k !== name), [], `${file}: 전역은 ${name} 하나`);
    assert.ok(sb[name] && Object.isFrozen(sb[name]), `${file}: ${name}는 얼린 객체`);
    for (const bad of ['innerHTML', 'speechSynthesis', 'toISOString', 'eval(']) assert.ok(!src.includes(bad), `${file}: ${bad} 금지`);
    assert.ok(src.split('\n').length < cap, `${file}: ${cap}줄 미만`);
    assert.match(src.split('\n')[0], /초안: 안티그래비티 Hydrogen, 검토: Claude/);
  }
});

// ───────────── WorldSave ─────────────
const S = () => load('world-save.js').WorldSave;

test('저장: FNV-1a 기준값과 짧은 id', () => {
  const W = S();
  assert.equal(W.fnv1a(''), 2166136261);
  assert.equal(W.fnv1a('a'), 3826002220);
  assert.equal(W.fnv1a('가'), 3452996373); // UTF-8 바이트 기준
  assert.equal(W.shortId(''), 'ztntfp');
  assert.equal(W.shortId('a'), 'r9wi7g');          // 32비트 값이 36진수 7자여도 6자로 자름
  assert.equal(W.shortId('gal:art_x#main'), '1ude2h');
  assert.equal(W.shortId('gal:art_x#main', 7), '1ude2hy');
  assert.equal(W.shortId('a', 7), 'r9wi7g5');
});

test('저장: assignIds는 겹치는 무리를 모두 7자로, 입력 순서와 무관', () => {
  const W = S();
  const a = 'gal:art_c88799#main', b = 'gal:art_c328712#main', c = 'gal:art_x#main';
  const m1 = W.assignIds([a, b, c]), m2 = W.assignIds([c, b, a]);
  assert.equal(m1.get(a), '0u0jen6'); assert.equal(m1.get(b), '0u0jen4'); assert.equal(m1.get(c), '1ude2h');
  for (const k of [a, b, c]) assert.equal(m1.get(k), m2.get(k));
});

test('저장: emptyState와 clean이 잘못된 값을 버린다', () => {
  const W = S();
  assert.deepEqual(plain(W.emptyState()), { v: 1, at: 0, arena: { best: {}, loadout: {} }, seen: [], found: [], cfg: { _t: 0 }, guest: false, keys: 0 });
  for (const junk of [null, undefined, 3, 'x', [], { v: 2 }]) assert.deepEqual(plain(W.clean(junk)), plain(W.emptyState()));
  const c = plain(W.clean({ v: 1, at: 5.5, arena: { best: { rival: 41.26, bad: -1, huge: 4000, s: 'x' }, loadout: { me: 'k3f9a1', long: 'x'.repeat(41), n: 3 } },
    seen: ['p0x2mz', 'k3f9a1', 'k3f9a1', 'BAD!', 'abc', 'abcdefgh'], found: ['k3f9a1', 7], cfg: { k3f9a1: 'p=a', bad: 'x', zzzzzz: 'y'.repeat(61), _t: 9 },
    guest: 'yes', keys: 100 }));
  assert.deepEqual(c.arena.best, { rival: 41.3 });
  assert.deepEqual(c.arena.loadout, { me: 'k3f9a1' });
  assert.deepEqual(c.seen, ['k3f9a1', 'p0x2mz']);
  assert.deepEqual(c.found, ['k3f9a1']);
  assert.deepEqual(c.cfg, { k3f9a1: 'p=a', _t: 9 });
  assert.equal(c.guest, false); assert.equal(c.keys, 0); assert.ok(Number.isInteger(c.at) && c.at >= 0);
});

function randomState(r) {
  const id = () => Math.floor(r() * 36 ** 6).toString(36).padStart(6, '0');
  const ids = Array.from({ length: 6 }, id);
  const pick = () => ids.filter(() => r() < 0.4);
  const best = {}; for (const k of ['rival', 'boss:rotek', 'boss:x']) if (r() < 0.6) best[k] = Math.round(r() * 1000) / 10 + 1;
  const cfg = { _t: Math.floor(r() * 5) }; for (const k of pick()) cfg[k] = `p=${'asmh'[Math.floor(r() * 4)]}`;
  return { v: 1, at: Math.floor(r() * 5), arena: { best, loadout: r() < 0.5 ? { me: ids[0] } : {} }, seen: pick(), found: pick(), cfg,
    guest: r() < 0.5, keys: Math.floor(r() * 4) };
}

test('저장: merge 교환·멱등·흡수 (시드 고정 무작위 500회)', () => {
  const W = S(), r = rng(20261120);
  for (let i = 0; i < 500; i++) {
    const a = W.clean(randomState(r)), b = W.clean(randomState(r));
    const ab = plain(W.merge(a, b));
    assert.deepEqual(ab, plain(W.merge(b, a)), `교환 ${i}`);
    assert.deepEqual(plain(W.merge(a, a)), plain(W.clean(a)), `멱등 ${i}`);
    assert.deepEqual(plain(W.merge(W.merge(a, b), b)), ab, `흡수 ${i}`);
  }
});

test('저장: merge 규칙 — 합집합, 짧은 기록, cfg는 _t, keys는 at', () => {
  const W = S();
  const a = { v: 1, at: 10, arena: { best: { rival: 50, x: 9 }, loadout: { me: 'aaaaaa' } }, seen: ['aaaaaa'], found: [], cfg: { aaaaaa: 'p=a', _t: 3 }, guest: false, keys: 1 };
  const b = { v: 1, at: 20, arena: { best: { rival: 40 }, loadout: { me: 'bbbbbb' } }, seen: ['bbbbbb'], found: ['bbbbbb'], cfg: { bbbbbb: 'p=s', _t: 2 }, guest: true, keys: 3 };
  const m = plain(W.merge(a, b));
  assert.deepEqual(m.seen, ['aaaaaa', 'bbbbbb']); assert.deepEqual(m.found, ['bbbbbb']);
  assert.deepEqual(m.arena.best, { rival: 40, x: 9 });
  assert.deepEqual(m.cfg, { aaaaaa: 'p=a', _t: 3 });
  assert.equal(m.keys, 3); assert.equal(m.guest, true); assert.deepEqual(m.arena.loadout, { me: 'bbbbbb' }); assert.equal(m.at, 20);
});

test('저장: pack은 1,800자 이하, best → 없는 그림 cfg 순으로 버리고 seen·found는 지킨다', () => {
  const W = S();
  const ids = Array.from({ length: 60 }, (_, i) => i.toString(36).padStart(6, '0'));
  const best = {}; for (let i = 0; i < 80; i++) best[`boss:b${String(i).padStart(2, '0')}`] = 10 + i;
  const cfg = { _t: 1 }; for (const id of ids) cfg[id] = 'p=a;t=b;w=r;e=f;c=3;d=d';
  const state = W.clean({ v: 1, at: 1, arena: { best, loadout: {} }, seen: ids, found: ids.slice(0, 30), cfg, guest: false, keys: 0 });
  const live = ids.slice(0, 20);
  const text = W.pack(state, live), out = JSON.parse(text);
  assert.ok(text.length <= 1800, `길이 ${text.length}`);
  assert.deepEqual(out.seen, ids); assert.deepEqual(out.found, ids.slice(0, 30));
  assert.deepEqual(Object.keys(out.arena.best), []);                  // best를 먼저 다 버림
  for (const id of live) assert.ok(out.cfg[id], `살아 있는 ${id} 설정 유지`);
  assert.deepEqual(Object.keys(out).slice(0, 8), ['v', 'at', 'arena', 'seen', 'found', 'cfg', 'guest', 'keys']);
  const small = W.clean({ v: 1, seen: ['aaaaaa'], arena: { best: { rival: 3 } } });
  assert.deepEqual(JSON.parse(W.pack(small, [])).arena.best, { rival: 3 });
  const tooMany = W.clean({ v: 1, seen: Array.from({ length: 300 }, (_, i) => i.toString(36).padStart(6, '0')) });
  assert.throws(() => W.pack(tooMany, []));
});

test('저장: cfg 문자열 ↔ 객체', () => {
  const W = S();
  assert.deepEqual(plain(W.parseCfg('p=a;b=k3f9a1;t=b;w=r;e=f;c=3;d=f')), { p: 'a', b: 'k3f9a1', t: 'b', w: 'r', e: 'f', c: 3, d: 'f' });
  assert.deepEqual(plain(W.parseCfg('p=z;x=1;c=9;e=r;junk')), { e: 'r' });
  assert.equal(W.formatCfg({ d: 'd', c: 0, p: 's', e: 'x' }), 'p=s;e=x;c=0;d=d');
  assert.equal(W.formatCfg(W.parseCfg('t=m;w=s;b=abcdefg')), 'b=abcdefg;t=m;w=s');
  assert.equal(W.formatCfg({}), '');
});

test('저장: 기기 저장·update·부모는 노션 예약 없음', () => {
  const timers = [];
  const store = new Store({ currentUser: 'son' });
  const sb = load('world-save.js', { localStorage: store, setTimeout: (fn, ms) => (timers.push({ fn, ms }), timers.length), clearTimeout: () => {} });
  const W = sb.WorldSave, synced = [];
  assert.equal(W.childOf(), 'son'); assert.equal(W.isParent(), false);
  W.setSyncHook(child => synced.push(child));
  const s = W.update('son', st => ({ ...st, keys: 2 }));
  assert.equal(s.keys, 2); assert.ok(s.at > 0);
  assert.equal(plain(W.load('son')).keys, 2);
  assert.ok(store.getItem('kids_world_v1_son'));
  assert.ok(timers.some(t => t.ms === 1500)); timers.at(-1).fn(); assert.deepEqual(synced, ['son']);
  assert.equal(W.update('parent', st => st), null);
  store.setItem('currentUserName', '아빠'); assert.equal(W.isParent(), true);
  const n = timers.length; W.update('daughter', st => ({ ...st, keys: 1 })); assert.equal(timers.length, n, '부모는 예약 안 함');
  store.setItem('kids_world_v1_son', '{깨진'); assert.deepEqual(plain(W.load('son')), plain(W.emptyState()));
  const broken = load('world-save.js', { localStorage: { getItem() { throw new Error('막힘'); }, setItem() { throw new Error('막힘'); } } }).WorldSave;
  assert.equal(broken.childOf(), null); assert.equal(broken.save('son', broken.emptyState()), false);
});

// 모의 노션: 인벤토리 조회·페이지 GET·PATCH를 기록한다
function mockNotion(propValue) {
  const calls = [];
  let prop = propValue;
  const fetch = async (url, opts = {}) => {
    calls.push({ url, method: opts.method || 'GET', body: opts.body ? JSON.parse(opts.body) : null });
    const json = body => ({ ok: true, status: 200, json: async () => body });
    if (url.includes('/query')) return json({ results: [{ id: 'page-1' }] });
    if (opts.method === 'PATCH') { prop = { type: 'rich_text', rich_text: [{ plain_text: JSON.parse(opts.body).properties['월드기록'].rich_text[0].text.content }] }; return json({}); }
    return json({ properties: prop === undefined ? {} : { 월드기록: prop, 런너기록: { type: 'rich_text', rich_text: [] } } });
  };
  return { fetch, calls, get prop() { return prop; } };
}
const richText = obj => ({ type: 'rich_text', rich_text: [{ plain_text: JSON.stringify(obj) }] });
function syncBox(notion, user = 'son', name = '') {
  const store = new Store({ currentUser: user, ...(name ? { currentUserName: name } : {}) });
  const sb = load('world-save.js', { localStorage: store, fetch: notion.fetch, setTimeout: () => 0, clearTimeout: () => {} });
  return { W: sb.WorldSave, store };
}

test('노션: pull은 합치고, flush는 「월드기록」 한 칸만 PATCH', async () => {
  const notion = mockNotion(richText({ v: 1, at: 5, seen: ['cccccc'], found: ['cccccc'], arena: { best: { rival: 30 } }, keys: 2 }));
  const { W } = syncBox(notion);
  W.save('son', W.clean({ v: 1, at: 1, seen: ['aaaaaa'], arena: { best: { rival: 50 } } }));
  const pulled = plain(await W.pull('son'));
  assert.deepEqual(pulled.seen, ['aaaaaa', 'cccccc']); assert.equal(pulled.arena.best.rival, 30); assert.equal(pulled.keys, 2);
  assert.equal(notion.calls.filter(c => c.method === 'PATCH').length, 0, 'pull은 쓰지 않는다');
  await W.flush('son');
  const patches = notion.calls.filter(c => c.method === 'PATCH');
  assert.equal(patches.length, 1);
  assert.deepEqual(Object.keys(patches[0].body.properties), ['월드기록']);
  assert.deepEqual(JSON.parse(notion.prop.rich_text[0].plain_text).seen, ['aaaaaa', 'cccccc']);
  await W.flush('son');
  assert.equal(notion.calls.filter(c => c.method === 'PATCH').length, 1, '바뀐 게 없으면 다시 쓰지 않는다');
});

test('노션: 칸이 없거나 유형이 다르거나 JSON이 깨졌거나 부모면 쓰지 않는다', async () => {
  for (const prop of [undefined, { type: 'number', number: 3 }, { type: 'rich_text', rich_text: [{ plain_text: '{깨짐' }] }, richText({ v: 2 })]) {
    const notion = mockNotion(prop), { W } = syncBox(notion);
    W.save('son', W.clean({ v: 1, seen: ['aaaaaa'] }));
    assert.equal(await W.flush('son'), false);
    assert.equal(notion.calls.filter(c => c.method === 'PATCH').length, 0, JSON.stringify(prop));
  }
  const notion = mockNotion(richText({ v: 1 })), { W } = syncBox(notion, 'son', '엄마');
  assert.equal(await W.flush('son'), false); assert.equal(notion.calls.length, 0, '부모는 노션에 손대지 않음');
  const empty = mockNotion({ type: 'rich_text', rich_text: [] }), box = syncBox(empty, 'daughter');
  box.W.save('daughter', box.W.clean({ v: 1, found: ['bbbbbb'] }));
  await box.W.flush('daughter');
  assert.equal(empty.calls.filter(c => c.method === 'PATCH').length, 1, '빈 칸에는 처음 기록을 쓴다');
  assert.equal(empty.calls[0].body.filter.title.equals, '민서');
});

test('노션: update는 설정이 바뀌면 cfg._t를 올린다', () => {
  const { W } = syncBox(mockNotion(richText({ v: 1 })));
  const a = W.update('son', s => ({ ...s, keys: 1 })); assert.equal(a.cfg._t, 0);
  const b = W.update('son', s => ({ ...s, cfg: { ...s.cfg, aaaaaa: 'p=s' } })); assert.equal(b.cfg._t, b.at);
});

// ───────────── WorldSprites ─────────────
const P = () => load('world-sprites.js').WorldSprites;
const charactersOf = item => Array.isArray(item.characters) ? item.characters.filter(c => c && c.key && c.name && c.spriteUrl) : [];
const ITEMS = [
  { id: 'art_a', author: '민수', title: '보라 용', date: '2026-10-29', category: '캐릭터', characters: [{ key: 'main', name: '보라 용', spriteUrl: 'https://x.test/a.png' }, { key: 'b2', name: '꼬마', spriteUrl: 'https://x.test/b.png' }] },
  { id: 'art_b', author: '민서', title: '토끼', date: '2026-11-01', category: '그림/미술', characters: [{ key: 'main', name: '토끼', spriteUrl: 'https://x.test/c.png' }] },
  { id: 'art_c', author: '공동', title: '가족', date: '2026-11-02', category: '만들기/공예', characters: [{ key: 'main', name: '우리', spriteUrl: 'https://x.test/d.png' }] },
  { id: 'art_a', author: '민수', title: '중복', characters: [{ key: 'main', name: '보라 용', spriteUrl: 'https://x.test/a.png' }] },
  { id: 'art_d', author: '아빠', title: '부모', characters: [{ key: 'main', name: '아빠꺼', spriteUrl: 'https://x.test/e.png' }] },
  { id: 'art_e', author: '민수', title: '캐릭터 없음' }
];
const ROSTER = { rotek: { id: 'rotek', name: '로텤', poses: { idle: './kids/assets/monsters/rotek/idle.png', rage: 'kids/assets/monsters/rotek/rage.png' } } };

test('그림: 경로·작성자 필터·중복·몬스터', () => {
  const W = P();
  assert.equal(W.resolvePath('./kids/a.png', '../../../'), '../../../kids/a.png');
  assert.equal(W.resolvePath('kids/a.png', '../../../'), '../../../kids/a.png');
  assert.equal(W.resolvePath('https://x.test/a.png', '../'), 'https://x.test/a.png');
  assert.deepEqual(plain(W.authorsFor('son', false)), ['민수', '공동']);
  assert.deepEqual(plain(W.authorsFor('daughter', true)), ['민서', '공동', '민수']);
  const list = plain(W.collect({ items: ITEMS, charactersOf, roster: ROSTER, order: ['nope', 'rotek'], child: 'son', guest: false, root: '../../../' }));
  assert.deepEqual(list.map(i => i.id), ['gal:art_a#main', 'gal:art_a#b2', 'gal:art_c#main', 'mon:rotek']);
  assert.deepEqual(list[0], { id: 'gal:art_a#main', kind: 'gallery', artId: 'art_a', charKey: 'main', name: '보라 용', src: 'https://x.test/a.png', poses: null, author: '민수', title: '보라 용', date: '2026-10-29', category: '캐릭터' });
  const mon = list[3];
  assert.equal(mon.kind, 'monster'); assert.equal(mon.src, '../../../kids/assets/monsters/rotek/idle.png');
  assert.equal(mon.poses.rage, '../../../kids/assets/monsters/rotek/rage.png'); assert.equal(mon.author, '민수');
  const guest = plain(W.collect({ items: ITEMS, charactersOf, roster: {}, order: [], child: 'daughter', guest: true, root: '' }));
  assert.deepEqual(guest.map(i => i.id), ['gal:art_a#main', 'gal:art_a#b2', 'gal:art_b#main', 'gal:art_c#main']);
});

test('그림: 대표색 → 무기 효과', () => {
  const W = P();
  const cases = [[[255, 0, 0], 'f'], [[255, 140, 0], 'f'], [[255, 220, 0], 'l'], [[30, 200, 60], 'w'], [[80, 180, 255], 'i'], [[20, 40, 230], 'i'],
    [[150, 50, 220], 'x'], [[255, 80, 180], 'x'], [[128, 128, 128], 'r'], [[10, 10, 10], 'r'], [[250, 250, 250], 'r']];
  for (const [[r, g, b], want] of cases) assert.equal(W.hueTrait(r, g, b), want, `${r},${g},${b}`);
});

test('그림: dominantColor는 투명 화소를 빼고 가장 많은 색 구간', () => {
  const W = P();
  const img = (pixels) => ({ width: pixels.length, height: 1, data: Uint8ClampedArray.from(pixels.flat()) });
  const c = plain(W.dominantColor(img([...Array(7).fill([20, 40, 230, 255]), ...Array(3).fill([255, 0, 0, 255]), ...Array(20).fill([255, 0, 0, 0])])));
  assert.deepEqual(c, { r: 20, g: 40, b: 230 });
  assert.deepEqual(plain(W.dominantColor(img([[100, 100, 100, 255], [120, 120, 120, 255]]))), { r: 110, g: 110, b: 110 });
  assert.equal(W.dominantColor(img([[1, 2, 3, 0]])), null);
});

test('그림: 새 친구와 살아 있는 id', () => {
  const W = P(), list = [{ id: 'gal:a#main', kind: 'gallery' }, { id: 'gal:b#main', kind: 'gallery' }, { id: 'mon:rotek', kind: 'monster' }];
  const idMap = new Map([['gal:a#main', 'aaaaaa'], ['gal:b#main', 'bbbbbb'], ['mon:rotek', 'cccccc']]);
  assert.deepEqual(plain(W.newFriends(list, ['aaaaaa'], idMap)).map(i => i.id), ['gal:b#main']);
  assert.deepEqual(plain(W.liveOnly(['aaaaaa', 'zzzzzz', 'cccccc'], idMap)), ['aaaaaa', 'cccccc']);
});

test('그림: Image가 없으면 load는 null', async () => {
  assert.equal(await P().load({ src: 'https://x.test/a.png' }, 128), null);
});

// ───────────── WorldView ─────────────
const V = () => load('world-view.js').WorldView;

test('화면: 폰은 360, 넓은 화면은 540을 보여 주고 비율은 같다', () => {
  const W = V(), close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} ≈ ${b}`);
  let v = W.fitView(375, 812); close(v.scale, 375 / 360); close(v.viewW, 360); close(v.viewH * v.scale, 812);
  v = W.fitView(812, 375); close(v.viewH, 360); close(v.viewW * v.scale, 812);
  v = W.fitView(1280, 800); close(v.scale, 800 / 540); close(v.viewH, 540); close(v.viewW, 1280 * 540 / 800);
  v = W.fitView(768, 1024); close(v.viewW, 540);
  assert.equal(W.dprFor(3), 2); assert.equal(W.dprFor(0.5), 1); assert.equal(W.dprFor(NaN), 1); assert.equal(W.dprFor(1.5), 1.5);
  close(W.clampDt(16), 0.016); assert.equal(W.clampDt(500), 0.05); assert.equal(W.clampDt(-5), 0); assert.equal(W.clampDt(NaN), 0);
});

test('화면: 카메라는 따라가고, 월드 밖으로 안 나가고, 작은 축은 가운데', () => {
  const W = V(), view = { w: 360, h: 640 }, world = { w: 720, h: 1100 };
  const cam = { x: 0, y: 0 };
  let c = cam; for (let i = 0; i < 200; i++) c = W.follow(c, { x: 400, y: 600 }, view, world, 0.05);
  assert.ok(Math.abs(c.x - 220) < 0.5 && Math.abs(c.y - 280) < 0.5, JSON.stringify(c));
  assert.deepEqual(cam, { x: 0, y: 0 }, '원래 카메라는 그대로');
  c = W.follow({ x: 0, y: 0 }, { x: 0, y: 0 }, view, world, 10); assert.deepEqual(plain(c), { x: 0, y: 0 });
  c = W.follow({ x: 0, y: 0 }, { x: 9999, y: 9999 }, view, world, 10); assert.ok(Math.abs(c.x - 360) < 1e-6 && Math.abs(c.y - 460) < 1e-6);
  c = W.follow({ x: 0, y: 0 }, { x: 100, y: 100 }, view, { w: 200, h: 2000 }, 10); assert.ok(Math.abs(c.x - (-80)) < 1e-6, '작은 축 가운데');
  const s = W.toScreen({ x: 30, y: 40 }, 1.5, 100, 200), back = W.toWorld({ x: 30, y: 40 }, 1.5, s.x, s.y);
  assert.ok(Math.abs(back.x - 100) < 1e-9 && Math.abs(back.y - 200) < 1e-9);
});

// ───────────── WorldInput ─────────────
const I = () => load('world-input.js').WorldInput;

test('입력: 조이스틱·키보드·자동 조준', () => {
  const W = I(), len = v => Math.hypot(v.x, v.y);
  assert.deepEqual(plain(W.stickVector({ x: 0, y: 0 }, { x: 3, y: 0 })), { x: 0, y: 0, mag: 0 });
  let v = W.stickVector({ x: 0, y: 0 }, { x: 200, y: 0 }); assert.equal(v.mag, 1); assert.ok(Math.abs(v.x - 1) < 1e-9);
  v = W.stickVector({ x: 10, y: 10 }, { x: 10, y: 38 }); assert.ok(v.mag > 0 && v.mag < 1 && Math.abs(len(v) - v.mag) < 1e-9 && v.y > 0);
  assert.deepEqual(plain(W.keyboardVector(new Set())), { x: 0, y: 0 });
  v = W.keyboardVector(new Set(['KeyW', 'KeyD'])); assert.ok(Math.abs(len(v) - 1) < 1e-9 && v.x > 0 && v.y < 0);
  v = W.keyboardVector(new Set(['ArrowLeft', 'ArrowRight'])); assert.equal(len(v), 0);
  const targets = [{ id: 'b', x: 10, y: 0 }, { id: 'a', x: -10, y: 0 }, { id: 'c', x: 1, y: 0, alive: false }, { id: 'd', x: 500, y: 0 }];
  assert.equal(W.pickTarget({ x: 0, y: 0 }, targets, 100).id, 'a');
  assert.equal(W.pickTarget({ x: 0, y: 0 }, targets, 5), null);
  assert.equal(W.pickTarget({ x: 0, y: 0 }, [], 100), null);
});

// ───────────── WorldFX ─────────────
const F = () => load('world-fx.js').WorldFX;

test('연출: 입자 풀 상한·히트스톱·흔들림 감쇠', () => {
  const W = F(), fx = W.createFx({ max: 40 });
  for (const k of ['spark', 'dust', 'ring', 'fire', 'ice', 'bolt', 'wind', 'boom', 'star']) fx.burst(k, 0, 0, 10);
  assert.equal(fx.alive, 40);
  fx.hitstop(100); assert.equal(fx.step(0.016), 0);
  for (let i = 0; i < 10; i++) fx.step(0.016);
  assert.ok(fx.step(0.016) > 0, '히트스톱이 끝나면 dt가 돌아온다');
  fx.shake(10, 200); fx.step(0.01); const o = fx.offset(); assert.ok(Math.abs(o.x) <= 10 && Math.abs(o.y) <= 10);
  for (let i = 0; i < 30; i++) fx.step(0.016);
  assert.deepEqual(plain(fx.offset()), { x: 0, y: 0 });
  for (let i = 0; i < 300; i++) fx.step(0.05);
  assert.equal(fx.alive, 0, '입자는 결국 사라진다');
});

test('연출: 숨쉬기·착지 스쿼시·맞음 번쩍임', () => {
  const W = F();
  for (let t = 0; t < 4; t += 0.05) { const b = W.body({ t }); assert.ok(Math.abs(b.sx - 1) <= 0.031 && Math.abs(b.sy - 1) <= 0.031 && !b.flash); }
  let maxSx = 0, minSy = 2;
  for (let t = 10; t < 10.3; t += 0.01) {
    const b = W.body({ t, landedAt: 10 }); maxSx = Math.max(maxSx, b.sx); minSy = Math.min(minSy, b.sy);
    assert.ok(b.sx <= 1.25 + 0.031 && b.sy >= 0.75 - 0.031 && Math.abs(b.sx * b.sy - 1) < 0.1, JSON.stringify(b));
  }
  assert.ok(maxSx > 1.15 && minSy < 0.85, '착지 직후 눈에 띄게 납작');
  assert.equal(W.body({ t: 5.05, hitAt: 5 }).flash, true); assert.equal(W.body({ t: 5.2, hitAt: 5 }).flash, false);
});

// ───────────── WorldSFX ─────────────
test('소리: 오디오가 없어도 조용히, 음소거는 기기 키', () => {
  const store = new Store();
  const W = load('world-sfx.js', { localStorage: store }).WorldSFX;
  assert.doesNotThrow(() => { W.unlock(); W.play('hit'); W.play('xylo', 3); W.play('없는소리'); });
  assert.equal(W.isMuted(), false);
  W.setMuted(true); assert.equal(store.getItem('kids_world_sfx'), 'off'); assert.equal(W.isMuted(), true);
  W.setMuted(false); assert.equal(store.getItem('kids_world_sfx'), null);
});
