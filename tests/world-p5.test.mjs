// 내 친구 월드 P5 「🥚 알」·내 목소리 시험 (docs/world_module_spec.md §17). 작성: Claude.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const W = 'kids/playground/world';
const read = rel => readFileSync(path.join(ROOT, rel), 'utf8');
const plain = v => JSON.parse(JSON.stringify(v));
class Store { constructor() { this.m = new Map(); } getItem(k) { return this.m.has(k) ? this.m.get(k) : null; } setItem(k, v) { this.m.set(k, String(v)); } }
function load(rel, extra = {}) { const sb = { console, ...extra }; sb.window = sb; vm.createContext(sb); vm.runInContext(read(rel), sb, { filename: rel }); return sb; }

test('알: 작품 id는 등록 도구 규칙과 같다', () => {
  const E = load(`${W}/core/world-eggs.js`).WorldEggs;
  assert.equal(E.artIdFor('20261121_101500.jpg', '민수'), 'art_minsu_20261121_101500');
  assert.equal(E.artIdFor('minseo_20261121_101500.jpeg', '민서'), 'art_minseo_20261121_101500');
  assert.equal(E.artIdFor('art_together_x1.png', '공동'), 'art_together_x1');
  assert.equal(E.artIdFor('', '민수'), null);
});

test('알: 등록 도구(관제탑)의 폴더 표와 같다 — 관제탑이 없는 CI에서는 건너뜀', (t) => {
  const pyPath = path.join(ROOT, '..', 'scripts', 'gallery_registration_options.py');
  if (!existsSync(pyPath)) { t.skip('관제탑 scripts 없음 (CI)'); return; }
  const py = readFileSync(pyPath, 'utf8');
  for (const [who, folder] of [['민수', 'minsu'], ['민서', 'minseo'], ['공동', 'together']]) assert.ok(py.includes(`"${who}": ("${folder}"`), who);
});

test('알: 대기열에서 그 아이의 「캐릭터」만 최근 3개', () => {
  const E = load(`${W}/core/world-eggs.js`).WorldEggs;
  const items = [
    { id: 'u1', filename: '20261101_1.jpg', author: '민수', category: '캐릭터', memo: '보라 용', date: '2026-11-01' },
    { id: 'u2', filename: '20261102_1.jpg', author: '민수', category: '캐릭터', memo: '', date: '2026-11-02' },
    { id: 'u3', filename: '20261103_1.jpg', author: '민수', category: '작품', memo: 'x', date: '2026-11-03' },
    { id: 'u4', filename: '20261104_1.jpg', author: '민서', category: '캐릭터', memo: '토끼', date: '2026-11-04' },
    { id: 'u5', filename: '20261105_1.jpg', author: '민수', category: '캐릭터', memo: 'c', date: '2026-11-05' },
    { id: 'u6', filename: '20261106_1.jpg', author: '민수', category: '캐릭터', memo: 'd', date: '2026-11-06' }];
  assert.deepEqual(plain(E.pick(items, 'son')).map(e => [e.id, e.name]), [['u6', 'd'], ['u5', 'c'], ['u2', '새 친구']]);
  assert.deepEqual(plain(E.pick(items, 'daughter')), [{ id: 'u4', artId: 'art_minseo_20261104_1', name: '토끼', date: '2026-11-04' }]);
  assert.deepEqual(plain(E.pick(null, 'son')), []);
});

test('알: 대기열 읽기(요약만)·기억·실패하면 빈 목록', async () => {
  const calls = [];
  const store = new Store();
  const ok = load(`${W}/core/world-eggs.js`, { localStorage: store, fetch: async (url, o) => { calls.push([url, o]); return { ok: true, json: async () => ({ items: [{ id: 'u1', filename: '20261101_1.jpg', author: '민수', category: '캐릭터', memo: '용', date: '2026-11-01' }] }) }; } }).WorldEggs;
  const eggs = await ok.fetchPending('son');
  assert.equal(eggs.length, 1); assert.match(calls[0][0], /\/api\/pending-media$/); assert.equal(calls[0][1], undefined, 'GET만, 사진 포함 옵션 없음');
  assert.deepEqual(plain(ok.remember('son', eggs)), ['art_minsu_20261101_1']);
  ok.remember('son', [{ artId: 'art_minsu_b' }, { artId: 'art_minsu_20261101_1' }]);
  assert.deepEqual(plain(ok.known('son')), ['art_minsu_20261101_1', 'art_minsu_b']);
  assert.deepEqual(plain(ok.known('daughter')), []);
  const bad = load(`${W}/core/world-eggs.js`, { fetch: async () => { throw new Error('오프라인'); } }).WorldEggs;
  assert.deepEqual(plain(await bad.fetchPending('son')), []);
});

test('알: 정원에서 알 자리는 종류와 상관없이 톡톡 3번에 깨어난다', () => {
  const G = load(`${W}/garden-logic.js`).GardenLogic;
  const spots = G.plan(['gal:art_minsu_x#main', 'gal:art_minsu_y#main'], () => 0.42, ['art_minsu_x']);
  const egg = spots.find(s => s.content.type === 'friend' && s.content.egg);
  const plainFriend = spots.find(s => s.content.type === 'friend' && !s.content.egg);
  assert.equal(egg.content.id, 'gal:art_minsu_x#main'); assert.equal(plainFriend.content.id, 'gal:art_minsu_y#main');
  egg.kind = 'pool'; // 웅덩이 자리여도
  assert.equal(G.tap(egg).shake, true); G.tap(egg);
  const r = plain(G.tap(egg)); assert.equal(r.open, true); assert.equal(r.content.egg, true);
  assert.equal(G.plan(['gal:a#m'], () => 0.1).filter(s => s.content.egg).length, 0, '알 목록이 없으면 그대로');
});

test('목소리: 순수 함수·지원 안 되면 조용히 false', async () => {
  const sb = load(`${W}/core/world-voice.js`);
  const V = sb.WorldVoice;
  assert.deepEqual(Object.keys(sb).filter(k => !['console', 'window'].includes(k)), ['WorldVoice']);
  assert.equal(V.keyOf('son', 'abcdef'), 'son:abcdef');
  const list = Array.from({ length: 33 }, (_, i) => ({ key: `k${i}`, at: 100 - i }));
  assert.deepEqual(plain(V.trimPlan(list, 30)), ['k32', 'k31', 'k30'], '오래된 것부터');
  assert.deepEqual(plain(V.trimPlan(list.slice(0, 5), 30)), []);
  assert.equal(V.supported(), false);
  assert.equal(await V.record('son', 'abcdef'), false);
  assert.equal(await V.record('parent', 'abcdef'), false);
  assert.equal(await V.play('son', 'abcdef'), false);
  const src = read(`${W}/core/world-voice.js`);
  for (const bad of ['fetch(', 'XMLHttpRequest', 'sendBeacon', 'Math.random', 'innerHTML']) assert.ok(!src.includes(bad), `목소리는 밖으로 보내지 않음: ${bad}`);
  assert.match(src, /getTracks\(\)/, '녹음 뒤 마이크를 끈다');
});

test('연결: 광장 둥지·목소리 줄, 정원 알, 인형·필살기 목소리, 찰칵등록 칩', () => {
  const hub = read(`${W}/hub.js`), garden = read(`${W}/garden.js`);
  assert.match(hub, /WorldEggs\.fetchPending\(child\)/); assert.match(hub, /drawNest/); assert.match(hub, /VO\.record\(child, f\.shortId/);
  assert.match(hub, /WorldVoice\.play\(child, f\.shortId\)/);
  assert.match(garden, /GardenLogic\.plan\(hidden, rng, eggArt\)/); assert.match(garden, /content\.egg/);
  assert.match(read('kids/common_space/my-room-dolls.js'), /WorldVoice\.play\(data\.profile, shortId\)/);
  assert.match(read(`${W}/arena-ui.js`), /window\.WorldVoice\.play\(child, sel\.me\)/);
  assert.match(read('kids/core/quick-uploader.js'), /data-category="캐릭터"/);
  for (const [html, files] of [[`${W}/hub.html`, ['core/world-eggs.js', 'core/world-voice.js', 'hub.js']], [`${W}/garden.html`, ['core/world-eggs.js', 'garden.js']],
    [`${W}/arena.html`, ['core/world-voice.js', 'arena-ui.js']], ['kids/common_space/my-room.html', ['world/core/world-voice.js', 'my-room-dolls.js']]]) {
    const h = read(html); const pos = files.map(f => h.indexOf(f + "?v=")); assert.ok(pos.every(p => p > 0) && pos.every((p, i) => !i || p > pos[i - 1]), html);
  }
});

test('목소리: 캐릭터 목소리가 없으면 그 아이의 최근 목소리 (한 번 녹음하면 모두)', () => {
  const V = load(`${W}/core/world-voice.js`).WorldVoice;
  const list = [{ child: 'son', at: 1, blob: 'a', key: 'son:a' }, { child: 'son', at: 5, blob: 'b', key: 'son:b' }, { child: 'daughter', at: 9, blob: 'c', key: 'daughter:c' }, { child: 'son', at: 7 }];
  assert.equal(V.pickLatest(list, 'son').key, 'son:b'); assert.equal(V.pickLatest(list, 'daughter').key, 'daughter:c');
  assert.equal(V.pickLatest([], 'son'), null);
  assert.match(read(`${W}/core/world-voice.js`), /pickLatest\(all, child\)/, '재생할 때 대신 쓴다');
});

test('2026-11-21 의견 반영: 요정 음성은 바꿔치기 없이, 광장 톡은 말풍선만·꾹 누르면 판, 필살기 이름 표시', () => {
  for (const f of [`${W}/arena-ui.js`, `${W}/garden.js`, `${W}/hub.js`, 'kids/common_space/my-room-dolls.js']) {
    const calls = read(f).split('\n').filter(l => /speakFairyTTS\(/.test(l));
    assert.ok(calls.length > 0, f);
    for (const l of calls) assert.match(l, /skipPreset: true/, `${f}: 「정답이야」 같은 미리 녹음된 말로 바뀌지 않게 — ${l.trim()}`);
  }
  const hub = read(`${W}/hub.js`);
  assert.match(hub, /longTimer = setTimeout\(/);
  const clickBody = hub.slice(hub.indexOf("stageEl.addEventListener('click'"), hub.indexOf('function drawBubble'));
  assert.ok(!clickBody.includes('openSheet('), '톡(click)으로는 판을 열지 않음');
  assert.match(read(`${W}/arena.html`), /id="meter" class="world-btn__label">필살기</);
  assert.match(read(`${W}/arena.css`), /\.arena-special \{[^}]*conic-gradient/);
});
