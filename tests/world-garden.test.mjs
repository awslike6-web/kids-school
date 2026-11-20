// 내 친구 월드 P4a 비밀 정원 시험 (docs/world_module_spec.md §14). 작성: Claude — 초안과 독립적으로 계약에서 씀.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = 'kids/playground/world';
const read = rel => readFileSync(path.join(ROOT, rel), 'utf8');
const plain = v => JSON.parse(JSON.stringify(v));
function load(file) { const sb = { console }; sb.window = sb; vm.createContext(sb); vm.runInContext(read(`${DIR}/${file}`), sb, { filename: file }); return sb; }
function rng(seed) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
const G = () => load('garden-logic.js').GardenLogic;
const item = (id, date, kind = 'gallery') => ({ id, date, kind, name: id });
const ITEMS = [item('gal:a#m', '2026-09-01'), item('gal:b#m', '2026-10-05'), item('gal:c#m', '2026-11-01'), item('gal:d#m', '2026-11-10'), item('gal:e#m', '2026-08-01')];
const ID = new Map(ITEMS.map((it, i) => [it.id, `s${i}aaaa`]).concat([['mon:x', 'monxxx']]));

test('정원: 규칙(전역 하나·금지어·줄 수·머리 주석)', () => {
  for (const [file, cap] of [['garden-logic.js', 300], ['garden.js', 650]]) {
    const src = read(`${DIR}/${file}`);
    for (const bad of ['Math.random', 'innerHTML', 'speechSynthesis', 'toISOString', 'eval(']) assert.ok(!src.includes(bad), `${file}: ${bad}`);
    assert.ok(src.split('\n').length < cap, `${file} 줄 수`);
    assert.match(src.split('\n')[0], /초안: 안티그래비티 Hydrogen, 검토: Claude/);
  }
  const sb = load('garden-logic.js');
  assert.deepEqual(Object.keys(sb).filter(k => !['console', 'window'].includes(k)), ['GardenLogic']);
  assert.ok(Object.isFrozen(sb.GardenLogic));
});

test('정원: 숨는 곳 8개는 HUD·도구 줄을 피한다', () => {
  const L = G();
  assert.deepEqual(plain(L.SPOTS.map(s => s.kind)).sort(), ['bud', 'bud', 'bud', 'bush', 'bush', 'bush', 'pool', 'pool']);
  for (const s of L.SPOTS) assert.ok(s.x > 0.05 && s.x < 0.95 && s.y >= 0.12 && s.y <= 0.86, JSON.stringify(s));
});

test('정원: 처음 들어가면 최근 3명만 숨고 나머지는 찾은 친구', () => {
  const L = G();
  const first = plain(L.baseline(ITEMS, [], ID));
  assert.deepEqual(first.hidden, ['gal:d#m', 'gal:c#m', 'gal:b#m']);
  assert.deepEqual(first.toFound.sort(), ['s0aaaa', 's4aaaa']);
  const later = plain(L.baseline(ITEMS, ['s0aaaa', 's4aaaa', 's2aaaa'], ID));
  assert.deepEqual(later.hidden, ['gal:d#m', 'gal:b#m']); assert.deepEqual(later.toFound, []);
  const many = Array.from({ length: 12 }, (_, i) => item(`gal:n${i}#m`, `2026-11-${String(i + 1).padStart(2, '0')}`));
  const idm = new Map(many.map((it, i) => [it.id, `n${i}aaaa`]));
  assert.equal(L.baseline(many, ['zzzzzz'], idm).hidden.length, 8, '최대 8');
});

test('정원: 광장·마이룸에 보일 친구', () => {
  const L = G(), withMon = ITEMS.concat([item('mon:x', '', 'monster')]);
  assert.equal(L.visibleIds(withMon, [], ID).length, 6, '정원에 안 갔으면 전부');
  assert.deepEqual(plain(L.visibleIds(withMon, ['s0aaaa'], ID)).sort(), ['gal:a#m', 'mon:x']);
});

test('정원: 자리 배치 — 숨은 친구는 한 자리씩, 나머지는 장식·열쇠', () => {
  const L = G(), spots = plain(L.plan(['gal:a#m', 'gal:b#m'], rng(3)));
  assert.equal(spots.length, 8);
  const friends = spots.filter(s => s.content.type === 'friend').map(s => s.content.id).sort();
  assert.deepEqual(friends, ['gal:a#m', 'gal:b#m']);
  for (const s of spots) { assert.equal(s.open, false); if (s.content.type !== 'friend') assert.ok(['key', 'deco'].includes(s.content.type)); }
  for (const s of spots.filter(s => s.kind !== 'bush' && s.content.type !== 'friend')) assert.equal(s.content.type, 'deco');
  let keys = 0; for (let i = 0; i < 200; i++) keys += plain(L.plan([], rng(i))).filter(s => s.content.type === 'key').length;
  assert.ok(keys > 100 && keys < 260, `덤불 30% 열쇠: ${keys}/600`);
});

test('정원: 덤불 3번·물 1·열쇠 1개', () => {
  const L = G(), [bush, bud, pool] = ['bush', 'bud', 'pool'].map(k => ({ i: 0, kind: k, x: .5, y: .5, taps: 0, water: 0, open: false, content: { type: 'friend', id: 'gal:a#m' } }));
  assert.equal(L.tap(bush).shake, true); L.tap(bush);
  const opened = plain(L.tap(bush)); assert.equal(opened.open, true); assert.equal(opened.content.id, 'gal:a#m');
  assert.equal(L.tap(bush), null, '열린 뒤엔 null');
  assert.deepEqual(plain(L.tap(bud)), { need: 'water' }); assert.deepEqual(plain(L.tap(pool)), { need: 'key' });
  assert.equal(L.water(bud, 0.6).open, undefined); assert.equal(L.water(bud, 0.5).open, true);
  assert.deepEqual(plain(L.unlock(pool, 0)), { need: 'key' });
  const u = plain(L.unlock(pool, 2)); assert.equal(u.open, true); assert.equal(u.keys, 1);
  const spots = [{ ...bush, open: true, x: .5, y: .5 }, { ...bud, open: false, water: 0, x: .52, y: .5 }];
  assert.equal(L.nearest(spots, .5, .5).kind, 'bud', '열린 자리는 건너뜀'); assert.equal(L.nearest(spots, .9, .9), null);
});

test('정원: 화면 뼈대·광장 포털·광장 친구 필터', () => {
  const html = read(`${DIR}/garden.html`);
  const pos = ['core/world-save.js', 'hub-logic.js', 'garden-logic.js', 'garden.js'].map(s => html.indexOf(`src="${s}`));
  assert.ok(pos.every(p => p > 0) && pos.every((p, i) => i === 0 || p > pos[i - 1]));
  for (const id of ['stage', 'cv', 'exitBtn', 'keys', 'can', 'found', 'foundImg', 'foundName', 'foundBirth', 'toRoom', 'keepLooking', 'toast']) assert.ok(html.includes(`id="${id}"`), id);
  const hubLogic = load('hub-logic.js').HubLogic;
  assert.equal(hubLogic.PORTALS.find(p => p.id === 'garden').ready, true, '정원 포털 열림');
  assert.match(read(`${DIR}/hub.js`), /GardenLogic\.visibleIds/, '광장은 찾은 친구만');
  assert.ok(read(`${DIR}/hub.html`).includes('garden-logic.js'), '광장이 정원 규칙을 싣는다');
});
