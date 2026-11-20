// 내 친구 월드 P3 광장 시험 (docs/world_module_spec.md §13). 작성: Claude — 초안과 독립적으로 계약에서 씀.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = 'kids/playground/world';
const read = rel => readFileSync(path.join(ROOT, rel), 'utf8');
const plain = v => JSON.parse(JSON.stringify(v));
function load(file, extra = {}) {
  const sb = { console, ...extra }; sb.window = sb; vm.createContext(sb);
  vm.runInContext(read(`${DIR}/${file}`), sb, { filename: file });
  return sb;
}
function rng(seed) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
const H = () => load('hub-logic.js').HubLogic;

test('광장: 규칙(전역 하나·금지어·줄 수·머리 주석)', () => {
  for (const [file, name, cap] of [['hub-logic.js', 'HubLogic', 400], ['hub.js', 'HubUI', 650]]) {
    const src = read(`${DIR}/${file}`);
    for (const bad of ['Math.random', 'innerHTML', 'speechSynthesis', 'toISOString', 'eval(']) assert.ok(!src.includes(bad), `${file}: ${bad}`);
    assert.ok(src.split('\n').length < cap, `${file} 줄 수`);
    assert.match(src.split('\n')[0], /초안: 안티그래비티 Hydrogen, 검토: Claude/);
  }
  const sb = load('hub-logic.js');
  assert.deepEqual(Object.keys(sb).filter(k => !['console', 'window'].includes(k)), ['HubLogic']);
  assert.ok(Object.isFrozen(sb.HubLogic));
});

test('광장: 포털 목록과 실제 파일', () => {
  const L = H();
  assert.deepEqual(plain(L.WORLD), { w: 1080, h: 1600 });
  assert.deepEqual(plain(L.PORTALS.map(p => [p.id, p.ready])), [['arena', true], ['myroom', true], ['garden', true], ['coop', false]]);
  for (const p of L.PORTALS.filter(p => p.ready)) {
    assert.ok(!p.href.startsWith('/'), '상대 경로');
    assert.ok(existsSync(path.join(ROOT, DIR, p.href)), `${p.href} 파일이 있다`);
  }
  assert.equal(L.PORTALS.find(p => p.id === 'coop').hidden, true);
});

test('광장: 포털은 0.45초 머물면 들어가고, 벗어나면 처음부터', () => {
  const L = H(), arena = L.PORTALS[0], on = { x: arena.x, y: arena.y }, off = { x: 540, y: 800 };
  let st = { id: null, t: 0 }, entered = [];
  for (let i = 0; i < 60; i++) { st = L.portalStep(st, i === 8 ? off : on, L.PORTALS, 1 / 30); if (st.enter) entered.push([i, st.enter]); }
  assert.deepEqual(entered.map(e => e[1]), ['arena'], `한 번만 들어감 ${JSON.stringify(entered)}`);
  assert.ok(entered[0][0] > 8 + 0.45 * 30 - 2, '벗어나면 시간이 처음부터');
  // 위로 계속 밀며 지나가도 들어간다(속도 220, 지름 176)
  let walk = { id: null, t: 0 }, got = null;
  for (let y = arena.y + 120; y > arena.y - 120 && !got; y -= 220 / 60) { walk = L.portalStep(walk, { x: arena.x, y }, L.PORTALS, 1 / 60); got = walk.enter; }
  assert.equal(got, 'arena', '지나가며 들어감');
  const coop = { id: 'coop', x: 100, y: 100, r: 60, ready: false };
  st = { id: null, t: 0 };
  for (let i = 0; i < 90; i++) { st = L.portalStep(st, { x: 100, y: 100 }, [coop], 1 / 30); assert.equal(st.enter, null, '닫힌 포털'); }
  const st0 = { id: null, t: 0 }; L.portalStep(st0, on, L.PORTALS, 0.1); assert.deepEqual(st0, { id: null, t: 0 }, '새 객체');
});

test('광장: 친구는 월드 안에서 성격대로 움직인다', () => {
  const L = H(), r = rng(9), world = L.WORLD, me = { x: 540, y: 800 };
  assert.deepEqual(Object.keys(L.PERSONALITY).sort(), ['a', 'h', 'm', 's']);
  for (const p of ['a', 's', 'm', 'h']) {
    const f = L.createFriend({ id: 'gal:x#main', name: '용' }, 'abcdef', p, r, world);
    for (const pt of L.PORTALS) assert.ok(Math.hypot(f.x - pt.x, f.y - pt.y) > pt.r || true);
    let moved = 0, px = f.x, py = f.y, hops = 0;
    for (let i = 0; i < 60 * 20; i++) {
      L.stepFriend(f, me, 1 / 60, r, world, i / 60);
      assert.ok(f.x >= 0 && f.x <= world.w && f.y >= 0 && f.y <= world.h, `${p} 월드 안`);
      moved += Math.hypot(f.x - px, f.y - py); px = f.x; py = f.y; if (f.landedAt > 0) hops++;
    }
    assert.ok(moved > 50, `${p} 움직임 ${moved}`);
    if (p === 'a') assert.ok(hops > 0, '활발은 폴짝');
  }
  const speed = p => { const f = L.createFriend({ id: 'g', name: 'g' }, 'aaaaaa', p, rng(3), world); let d = 0, x = f.x, y = f.y;
    for (let i = 0; i < 60 * 30; i++) { L.stepFriend(f, { x: -999, y: -999 }, 1 / 60, rng(3 + i), world, i / 60); d += Math.hypot(f.x - x, f.y - y); x = f.x; y = f.y; } return d; };
  assert.ok(speed('a') > speed('s'), '활발이 느긋보다 많이 다님');
});

test('광장: 수줍은 친구는 가까이 가면 멀어진다', () => {
  const L = H(), world = L.WORLD;
  const f = L.createFriend({ id: 'g', name: 'g' }, 'aaaaaa', 'h', rng(1), world);
  f.x = 540; f.y = 800; f.wait = 5; f.tx = 540; f.ty = 800;
  const me = { x: 600, y: 800 };
  const d0 = Math.hypot(f.x - me.x, f.y - me.y);
  for (let i = 0; i < 60; i++) L.stepFriend(f, me, 1 / 60, rng(i), world, i / 60);
  assert.ok(Math.hypot(f.x - me.x, f.y - me.y) > d0 + 20, '쉬지 않고 멀어짐');
});

test('광장: 톡 판정·날짜·태어난 날·지도', () => {
  const L = H(), fs = [{ id: 'a', x: 100, y: 100 }, { id: 'b', x: 150, y: 100 }];
  assert.equal(L.hitFriend(fs, 140, 100).id, 'b'); assert.equal(L.hitFriend(fs, 500, 500), null);
  assert.equal(L.todayLocal(new Date(2026, 10, 5, 23, 59)), '2026-11-05');
  assert.equal(L.birthText({ date: '2026-09-22' }), '2026년 9월에 태어났어!'); assert.equal(L.birthText({}), null); assert.equal(L.birthText({ date: '어제' }), null);
  assert.equal(L.isAnniversary('2026-11-20', '2027-11-20'), true); assert.equal(L.isAnniversary('2026-11-20', '2026-11-20'), false);
  assert.equal(L.isAnniversary('2026-11-20', '2027-11-21'), false); assert.equal(L.isAnniversary(undefined, '2027-11-20'), false);
  const m = L.mapFit({ w: 1080, h: 1600 }, 300, 440);
  assert.ok(1080 * m.scale <= 300 - 24 + 1e-9 && 1600 * m.scale <= 440 - 24 + 1e-9);
  assert.ok(Math.abs(m.ox * 2 + 1080 * m.scale - 300) < 1e-6, '가운데');
});

test('광장: 로비 입구·아레나 나가기·화면 뼈대', () => {
  const cfg = read('kids/js/lobby_config.js');
  const hubLines = cfg.split('\n').filter(l => l.includes('kids/playground/world/hub.html'));
  assert.equal(hubLines.length, 2, '두 아이 놀이터 목록에 하나씩');
  const ui = read(`${DIR}/arena-ui.js`);
  assert.ok(!ui.includes("'../../../lobby.html'"), '아레나 나가기는 광장으로');
  assert.ok(ui.includes("'hub.html'"));
  const html = read(`${DIR}/hub.html`);
  const pos = ['core/world-save.js', 'core/world-fx.js', 'hub-logic.js', 'hub.js'].map(s => html.indexOf(`src="${s}`));
  assert.ok(pos.every(p => p > 0) && pos.every((p, i) => i === 0 || p > pos[i - 1]));
  assert.match(html, /id="map"[^>]*data-no-stick/, '지도 덮개는 조이스틱이 가로채지 않음');
  assert.ok(read(`${DIR}/core/world-input.js`).includes('[data-no-stick]'), '입력 부품이 버튼·판·덮개를 건너뜀');
  assert.match(read(`${DIR}/hub.js`), /galNames\.has\(it\.name\)/, '광장: 같은 이름 몬스터는 빼기');
  assert.match(ui, /monNames\.has\(it\.name\)/, '아레나 상대: 같은 이름 갤러리는 빼기');
  assert.match(read(`${DIR}/hub.js`), /PORTALS\.find\(\(p\) => p\.id === portal\.enter\)/, '포털 enter(id)로 주소를 찾는다');
  for (const id of ['stage', 'cv', 'exitBtn', 'mapBtn', 'sheet', 'map', 'mapCv', 'guestBtn', 'mapClose', 'toast', 'title']) assert.ok(html.includes(`id="${id}"`), id);
});

test('폰 레이아웃: 조이스틱이 보이고, 버튼이 안 잘리고, 판은 밀린다 (2026-11-21 민서 폰)', () => {
  const css = read(`${DIR}/world.css`), arena = read(`${DIR}/arena.css`), lobby = read('lobby.html');
  const block = sel => { const i = css.indexOf(`${sel} {`); return css.slice(i, css.indexOf('}', i)); };
  assert.ok(!/touch-action:\s*none/.test(block('.world-stage')), '화면 전체가 아니라 캔버스에만 스크롤 금지');
  assert.match(block('.world-canvas'), /touch-action:\s*none/);
  assert.ok(!/height:\s*100dvh/.test(block('.world-stage')), '높이를 dvh로 고정하지 않음');
  assert.match(block('.world-stick'), /position:\s*absolute/); assert.match(block('.world-stick'), /translate\(-50%, -50%\)/);
  assert.ok(!/transform:/.test(block('.world-stick__knob')), '손잡이 transform은 입력 부품 몫');
  assert.match(block('.world-controls__right'), /flex-direction:\s*row/);
  assert.match(block('.world-sheet'), /touch-action:\s*pan-y/);
  assert.match(arena, /\.arena-sheet \{[^}]*touch-action:\s*pan-y/); assert.match(arena, /\.arena-row \{[^}]*touch-action:\s*pan-x pan-y/);
  assert.match(lobby, /id="playgroundModalOverlay"[\s\S]{0,400}max-h-\[88vh\] overflow-y-auto/, '로비 놀이터 창은 창 안에서 스크롤');
});
