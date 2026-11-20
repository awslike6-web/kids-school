// 내 친구 월드 P2 아레나 계산 엔진 시험 (docs/world_module_spec.md §12). 작성: Claude — 초안과 독립적으로 계약에서 씀.
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
function load(file) {
  const sb = { console }; sb.window = sb; vm.createContext(sb);
  vm.runInContext(read(`${DIR}/${file}`), sb, { filename: file });
  return sb;
}
function rng(seed) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
const W = () => load('arena-weapons.js').ArenaWeapons;
const F = () => load('arena-fighter.js').ArenaFighter;
const B = () => load('arena-boss.js').ArenaBoss;
const WORLD = { w: 720, h: 1100 };
const fighter = (over = {}) => ({ id: 'me', team: 'me', x: 360, y: 900, vx: 0, vy: 0, r: 26, hp: 160, maxHp: 160, speed: 230, aim: -Math.PI / 2,
  dashT: 0, dashCd: 0, invulnT: 0, shieldT: 0, hitAt: -9, landedAt: -9, slowT: 0, slowMult: 1, stunT: 0, burnT: 0, burnDps: 0,
  weapon: { cls: 'blade', trait: 'r', skin: null }, atk: { phase: 'idle', t: 0, step: 0, comboT: 0, hit: false, shots: 0, queued: false }, ...over });

test('공통: 전역 하나·금지어 없음·줄 수·머리 주석', () => {
  for (const [file, name, cap] of [['arena-weapons.js', 'ArenaWeapons', 600], ['arena-fighter.js', 'ArenaFighter', 650], ['arena-boss.js', 'ArenaBoss', 700]]) {
    const src = read(`${DIR}/${file}`), sb = load(file);
    assert.deepEqual(Object.keys(sb).filter(k => !['console', 'window'].includes(k)), [name]);
    assert.ok(Object.isFrozen(sb[name]));
    for (const bad of ['Math.random', 'innerHTML', 'document.', 'localStorage', 'toISOString', 'eval(']) assert.ok(!src.includes(bad), `${file}: ${bad}`);
    assert.ok(src.split('\n').length < cap, `${file} 줄 수`);
    assert.match(src.split('\n')[0], /초안: 안티그래비티 Hydrogen, 검토: Claude/);
  }
});

test('화면: arena.html이 부품을 순서대로 싣고, 그리기·화면 연결도 규칙을 지킨다', () => {
  const html = read(`${DIR}/arena.html`);
  const order = ['core/world-save.js', 'core/world-view.js', 'arena-weapons.js', 'arena-fighter.js', 'arena-boss.js', 'arena-render.js', 'arena-ui.js'];
  const pos = order.map(s => html.indexOf(`src="${s}`));
  assert.ok(pos.every(p => p > 0) && pos.every((p, i) => i === 0 || p > pos[i - 1]), '싣는 순서');
  assert.ok(!/src="\//.test(html) && !/href="\//.test(html), '절대 경로 금지');
  for (const [file, name, cap] of [['arena-render.js', 'ArenaRender', 600], ['arena-ui.js', 'ArenaUI', 650]]) {
    const src = read(`${DIR}/${file}`);
    for (const bad of ['Math.random', 'innerHTML', 'speechSynthesis', 'toISOString', 'eval(']) assert.ok(!src.includes(bad), `${file}: ${bad}`);
    assert.ok(src.split('\n').length < cap, `${file} 줄 수`);
    assert.ok(Object.isFrozen(load(file)[name]) || file === 'arena-ui.js', `${name}`);
  }
  const ui = read(`${DIR}/arena-ui.js`);
  assert.match(ui, /sprites: \{ me:/, '그리기 계약대로 sprites를 넘긴다');
  assert.match(ui, /kid: 0\.5, normal: 0\.75, ace: 1/, '라이벌 피해 난이도 배수');
});

// ───────────── 무기 ─────────────
test('무기: 시제품 수치 그대로', () => {
  const A = W(), b = A.WEAPONS.blade.steps;
  assert.deepEqual(plain(b.map(s => [s.windup, s.active, s.recovery, s.range, s.damage, s.knockback])),
    [[.075, .085, .14, 112, 24, 350], [.065, .085, .145, 118, 28, 400], [.125, .145, .24, 146, 62, 720]]);
  assert.equal(b[2].crit, true); assert.equal(A.WEAPONS.blade.comboReset, .68);
  assert.equal(A.WEAPONS.rifle.damage, 14); assert.equal(A.WEAPONS.shotgun.pellets, 5); assert.equal(A.WEAPONS.shotgun.damage, 18);
});

test('무기: 효과 6종의 피해 총량은 0.9~1.0, 효과별 초당 피해는 무지개 대비 ±10%', () => {
  const A = W();
  assert.deepEqual(Object.keys(A.TRAITS).sort(), ['f', 'i', 'l', 'r', 'w', 'x']);
  for (const t of Object.keys(A.TRAITS)) { const v = A.traitTotal(t); assert.ok(v >= 0.9 - 1e-9 && v <= 1.0 + 1e-9, `${t}=${v}`); }
  // 화상은 「맞은 피해(0.85배 뒤)」의 0.15 → 0.85 × 1.15 (계약 해석: Hydrogen, 범위 안이라 채택)
  assert.ok(Math.abs(A.traitTotal('f') - 0.85 * 1.15) < 1e-9, '불꽃 = 0.85 × (1 + 0.15)');
  for (const cls of ['blade', 'rifle', 'shotgun']) for (const t of Object.keys(A.TRAITS)) {
    const ratio = A.dps(cls, t) / A.dps(cls, 'r'); assert.ok(ratio >= 0.9 - 1e-9 && ratio <= 1.0 + 1e-9, `${cls}/${t} ${ratio}`);
  }
  assert.ok(Math.abs(A.dps('blade', 'r') - 114 / 1.105) < 1e-6);
  assert.ok(Math.abs(A.dps('rifle', 'r') - 14 / 0.118) < 1e-6);
});

test('무기: 상점·설정 → 무기', () => {
  const A = W();
  assert.deepEqual(plain(A.fromShop({ id: 'weapon_gun1', arena: { class: 'rifle', trait: 'l' } })), { cls: 'rifle', trait: 'l', skin: 'weapon_gun1' });
  assert.equal(A.fromShop({ id: 'mc_redbed' }), null);
  assert.equal(A.fromShop({ id: 'x', arena: { class: 'laser', trait: 'f' } }), null);
  assert.deepEqual(plain(A.fromCfg({ w: 's', e: 'i' }, 'f')), { cls: 'shotgun', trait: 'i' });
  assert.deepEqual(plain(A.fromCfg({}, 'w')), { cls: 'blade', trait: 'w' });
  assert.deepEqual(plain(A.fromCfg({}, undefined)), { cls: 'blade', trait: 'r' });
});

function run(A, f, seconds, held, r = rng(1), onStep) {
  const events = [], projectiles = [];
  for (let t = 0; t < seconds; t += 1 / 120) { const out = A.stepAttack(f, 1 / 120, held, r); events.push(...out.events); projectiles.push(...out.projectiles); onStep && onStep(t); }
  return { events, projectiles };
}

test('무기: 블레이드 3연타는 예약으로 이어지고, 쉬면 1단으로 돌아간다', () => {
  const A = W(), f = fighter();
  assert.equal(A.startAttack(f), true); assert.equal(f.atk.phase, 'windup');
  const swings = run(A, f, 1.3, false, rng(1), () => { if (f.atk.phase === 'recovery' || f.atk.phase === 'windup' || f.atk.phase === 'active') A.startAttack(f); }).events.filter(e => e.type === 'swing');
  assert.deepEqual(swings.slice(0, 3).map(e => e.step), [0, 1, 2]);
  const g = fighter(); A.startAttack(g); run(A, g, 1.5, false);
  assert.equal(g.atk.phase, 'idle'); assert.equal(g.atk.step, 0, 'comboReset 뒤 1단');
});

test('무기: 라이플은 누르고 있으면 연사, 샷건은 5발 좌우 대칭', () => {
  const A = W(), f = fighter({ weapon: { cls: 'rifle', trait: 'r', skin: null } });
  A.startAttack(f); const { projectiles } = run(A, f, 1.0, true);
  assert.ok(projectiles.length >= 7 && projectiles.length <= 10, `1초 ${projectiles.length}발`);
  assert.equal(projectiles[0].team, 'me'); assert.equal(projectiles[0].dmg, 14);
  const s = fighter({ weapon: { cls: 'shotgun', trait: 'f', skin: null }, aim: 0 });
  const shots = A.fire(s, () => 0.5);
  assert.equal(shots.length, 5);
  const angles = shots.map(p => Math.atan2(p.vy, p.vx));
  assert.ok(Math.abs(angles[0] + angles[4]) < 1e-9 && Math.abs(angles[2]) < 1e-9, '가운데 0, 양끝 대칭');
  assert.ok(Math.abs(angles[4] - angles[0] - 0.36) < 1e-9);
  assert.equal(shots[0].trait, 'f');
});

test('무기: 근접 판정은 앞쪽 부채꼴만, 한 번만', () => {
  const A = W(), f = fighter({ x: 0, y: 0, aim: 0, atk: { phase: 'active', t: .05, step: 0, comboT: 0, hit: false, shots: 0, queued: false } });
  const front = { id: 'foe', team: 'foe', x: 100, y: 0, r: 26 }, back = { id: 'foe2', team: 'foe', x: -100, y: 0, r: 26 }, far = { id: 'foe3', team: 'foe', x: 300, y: 0, r: 26 };
  const ev = plain(A.meleeHits(f, [front, back, far]));
  assert.equal(ev.length, 1); assert.equal(ev[0].target, 'foe'); assert.equal(ev[0].dmg, 24); assert.ok(ev[0].kb.x > 0);
  assert.equal(A.meleeHits(f, [front]).length, 0, '한 번만');
  const spin = fighter({ x: 0, y: 0, aim: 0, atk: { phase: 'active', t: .05, step: 2, comboT: 0, hit: false, shots: 0, queued: false } });
  assert.equal(A.meleeHits(spin, [back, { id: 'boss', team: 'boss', x: 0, y: 150, r: 54 }]).length, 2, '3단은 전 방향');
});

test('무기: 탄은 엄폐물에 막히고 상대에 맞으면 사라진다', () => {
  const A = W();
  const shot = { x: 100, y: 500, vx: 1000, vy: 0, r: 5, dmg: 14, kb: 165, trait: 'w', team: 'me', life: 0.9 };
  let out = A.stepProjectiles([shot], [{ id: 'foe', team: 'foe', x: 130, y: 500, r: 26 }], [], WORLD, 0.01);
  assert.equal(out.list.length, 0); assert.equal(out.events[0].type, 'hit'); assert.equal(out.events[0].dmg, 13); // 14×0.95
  assert.ok(Math.abs(out.events[0].kb.x - 165 * 1.8) < 1e-6);
  out = A.stepProjectiles([{ ...shot, trait: 'r' }], [{ id: 'me2', team: 'me', x: 130, y: 500, r: 26 }], [], WORLD, 0.01);
  assert.equal(out.events.length, 0, '같은 팀은 안 맞음');
  out = A.stepProjectiles([{ ...shot, trait: 'r' }], [], [{ x: 105, y: 480, w: 40, h: 40 }], WORLD, 0.01);
  assert.equal(out.list.length, 0, '엄폐물에 막힘');
  out = A.stepProjectiles([{ ...shot, trait: 'r', life: 0.005 }], [], [], WORLD, 0.01);
  assert.equal(out.list.length, 0, '수명');
});

test('무기: 효과 적용', () => {
  const A = W(), f = fighter();
  assert.equal(A.applyTrait(f, 'f', 20), 1); assert.equal(f.burnT, 2); assert.ok(Math.abs(f.burnDps - 1.5) < 1e-9);
  A.applyTrait(f, 'i', 20); assert.equal(f.slowT, 1.5); assert.equal(f.slowMult, 0.6);
  A.applyTrait(f, 'l', 20); assert.ok(f.stunT >= 0.12);
  assert.equal(A.applyTrait(f, 'w', 20), 1.8);
});

// ───────────── 전투원 ─────────────
test('전투원: 난이도 표와 만들기', () => {
  const A = F();
  assert.deepEqual(plain(['kid', 'normal', 'ace'].map(k => [A.LEVELS[k].speed, A.LEVELS[k].hp])), [[140, 160], [165, 230], [190, 270]]);
  const me = A.create({ id: 'me', team: 'me', x: 1, y: 2 }), foe = A.create({ id: 'foe', team: 'foe', x: 3, y: 4, level: 'ace' });
  assert.deepEqual([me.r, me.hp, me.speed], [26, 160, 230]); assert.deepEqual([foe.hp, foe.speed], [270, 190]);
  assert.equal(A.COVERS.pillars4.length, 4); assert.deepEqual(plain(A.COVERS.pillars4[0]), { x: 144, y: 294, w: 72, h: 72 });
  assert.deepEqual(plain(A.COVERS.open), []);
});

test('전투원: 이동은 엄폐물·벽 밖으로 밀려나고 경직이면 멈춘다', () => {
  const A = F(), covers = [{ x: 300, y: 300, w: 72, h: 72 }];
  const f = A.create({ id: 'me', team: 'me', x: 260, y: 336 });
  for (let i = 0; i < 60; i++) A.move(f, { x: 1, y: 0 }, 1 / 60, covers, WORLD);
  assert.ok(f.x <= 300 - 26 + 0.5, `기둥 왼쪽에 멈춤 x=${f.x}`);
  const g = A.create({ id: 'me', team: 'me', x: 40, y: 500 });
  for (let i = 0; i < 60; i++) A.move(g, { x: -1, y: 0 }, 1 / 60, [], WORLD);
  assert.ok(g.x >= 24 + 26 - 0.5, '벽 안');
  const h = A.create({ id: 'me', team: 'me', x: 360, y: 500 }); h.stunT = 1;
  A.move(h, { x: 1, y: 0 }, 0.1, [], WORLD); assert.equal(h.x, 360);
});

test('전투원: 대시 무적과 쿨다운', () => {
  const A = F(), f = A.create({ id: 'me', team: 'me', x: 360, y: 500 });
  assert.equal(A.dash(f, { x: 1, y: 0 }).type, 'dash'); assert.equal(A.dash(f, { x: 1, y: 0 }), null, '쿨다운');
  assert.equal(A.damage(f, { dmg: 50, kb: { x: 0, y: 0 } }).taken, 0, '무적');
});

test('전투원: 패배 없음 — 무작위 피해 1,000번에도 체력은 0이 되지 않는다', () => {
  const A = F(), r = rng(7), f = A.create({ id: 'me', team: 'me', x: 360, y: 500 });
  let shields = 0;
  for (let i = 0; i < 1000; i++) {
    const out = A.damage(f, { dmg: Math.floor(r() * 80), kb: { x: 0, y: 0 } });
    shields += out.events.filter(e => e.type === 'shield').length;
    assert.ok(f.hp > 0, `${i}번째 hp=${f.hp}`);
    A.stepStatus(f, 0.4 * r());
  }
  assert.ok(shields > 0, '보호막이 실제로 켜짐');
  const g = A.create({ id: 'me', team: 'me', x: 0, y: 0 });
  const out = A.damage(g, { dmg: 999, kb: { x: 0, y: 0 } });
  assert.equal(g.hp, 48); assert.equal(g.shieldT, 3); assert.equal(out.events[0].type, 'shield');
  assert.equal(A.damage(g, { dmg: 10, kb: { x: 0, y: 0 } }).taken, 0, '보호막 중 무적');
  const foe = A.create({ id: 'foe', team: 'foe', x: 0, y: 0, level: 'kid' });
  const down = A.damage(foe, { dmg: 999, kb: { x: 0, y: 0 } });
  assert.equal(foe.hp, 0, '라이벌은 보호막 없이 진다'); assert.equal(foe.shieldT, 0); assert.equal(down.events[0].type, 'down');
});

test('전투원: 재장전 중인 상대는 1.3배, 화상은 시간에 따라 깎인다', () => {
  const A = F(), foe = A.create({ id: 'foe', team: 'foe', x: 0, y: 0, level: 'normal' });
  foe.atk.phase = 'reload'; assert.equal(A.damage(foe, { dmg: 10, kb: { x: 0, y: 0 } }).taken, 13);
  const f = A.create({ id: 'me', team: 'me', x: 0, y: 0 }); f.burnT = 2; f.burnDps = 5;
  for (let i = 0; i < 120; i++) A.stepStatus(f, 1 / 60);
  assert.ok(f.hp <= 151 && f.hp >= 149, `화상 2초×5 ≈ 10 → ${f.hp}`); assert.ok(f.burnT < 1e-9);
});

test('전투원: 시야와 라이벌 생각', () => {
  const A = F(), pillar = [{ x: 330, y: 500, w: 60, h: 60 }];
  assert.equal(A.lineOfSight({ x: 360, y: 300 }, { x: 360, y: 800 }, pillar), false);
  assert.equal(A.lineOfSight({ x: 100, y: 300 }, { x: 100, y: 800 }, pillar), true);
  const me = A.create({ id: 'me', team: 'me', x: 360, y: 800 });
  const foe = A.create({ id: 'foe', team: 'foe', x: 360, y: 300, level: 'normal', weapon: { cls: 'rifle', trait: 'r', skin: null } });
  foe.ai.cooldown = 0;
  const blocked = A.think(foe, me, pillar, 1 / 60, rng(3));
  assert.equal(blocked.attack, false, '기둥에 가리면 안 쏨');
  let attacks = 0, reloads = 0; const r = rng(5);
  for (let i = 0; i < 60 * 8; i++) {
    const wasReloading = foe.ai.reloadT > 0;
    const d = A.think(foe, me, [], 1 / 60, r); if (d.attack) attacks++; reloads += (d.events || []).filter(e => e.type === 'reload').length;
    A.move(foe, d.move, 1 / 60, [], WORLD); // 생각대로 움직여야 사거리에 들어온다
    assert.ok(Math.hypot(d.move.x, d.move.y) <= 1 + 1e-9);
    if (wasReloading) assert.equal(d.attack, false, '재장전 중엔 공격 안 함');
  }
  assert.ok(attacks >= 2 && reloads >= 1, `공격 ${attacks}, 재장전 ${reloads}`);
});

// ───────────── 보스 ─────────────
const me0 = (over = {}) => ({ id: 'me', team: 'me', x: 360, y: 900, r: 26, invulnT: 0, shieldT: 0, ...over });
function runBoss(A, boss, me, covers, seconds, r = rng(11)) {
  const events = []; let hazards = []; const patterns = [];
  for (let t = 0; t < seconds; t += 1 / 60) {
    const out = A.step(boss, me, covers, WORLD, 1 / 60, r);
    events.push(...out.events); hazards = hazards.concat(out.hazards);
    const hz = A.stepHazards(hazards, me, 1 / 60); hazards = hz.list; events.push(...hz.events);
    if (boss.state === 'windup' && patterns.at(-1) !== boss.pattern + boss.patternIdx) patterns.push(boss.pattern + boss.patternIdx);
  }
  return { events, hazards, patterns };
}

test('보스: 만들기와 패턴 순서(normal 4개, kid 2개)', () => {
  const A = B();
  const boss = A.create({ id: 'boss', name: '로텤', level: 'normal', x: 360, y: 250 });
  assert.deepEqual([boss.hp, boss.r, boss.phase, boss.state], [1800, 54, 1, 'idle']);
  const seen = runBoss(A, boss, me0({ invulnT: 999 }), [], 30).events.filter(e => e.type === 'telegraph').map(e => e.pattern);
  assert.deepEqual(seen.slice(0, 5), ['charge', 'aoe', 'ring', 'slam', 'charge']);
  const kid = A.create({ id: 'boss', name: '로텤', level: 'kid', x: 360, y: 250 });
  assert.equal(kid.hp, 1100);
  const kseen = runBoss(A, kid, me0({ invulnT: 999 }), [], 30).events.filter(e => e.type === 'telegraph').map(e => e.pattern);
  assert.ok(kseen.length >= 3 && kseen.every(p => p === 'charge' || p === 'aoe'), kseen.join());
});

test('보스: 예고 중에는 피해가 없고, 피해는 예고 뒤에만', () => {
  const A = B(), boss = A.create({ id: 'boss', name: 'x', level: 'normal', x: 360, y: 700 });
  const me = me0({ x: 360, y: 820 });
  let firstTelegraph = null, firstHit = null, t = 0, hazards = [];
  const r = rng(2);
  for (; t < 20 && firstHit === null; t += 1 / 60) {
    const out = A.step(boss, me, [], WORLD, 1 / 60, r); hazards = hazards.concat(out.hazards);
    const hz = A.stepHazards(hazards, me, 1 / 60); hazards = hz.list;
    const all = out.events.concat(hz.events);
    if (firstTelegraph === null && all.some(e => e.type === 'telegraph')) firstTelegraph = t;
    if (all.some(e => e.type === 'hit')) firstHit = t;
  }
  assert.ok(firstTelegraph !== null && firstHit !== null && firstHit - firstTelegraph >= 0.5, `예고 ${firstTelegraph} → 피해 ${firstHit}`);
});

test('보스: 돌진하다 기둥에 부딪히면 기절, 기절 중 피해 1.5배', () => {
  const A = B(), covers = [{ x: 324, y: 480, w: 72, h: 72 }];
  const boss = A.create({ id: 'boss', name: 'x', level: 'normal', x: 360, y: 250 });
  const { events } = runBoss(A, boss, me0({ x: 360, y: 900, invulnT: 999 }), covers, 6);
  assert.ok(events.some(e => e.type === 'stun'), '기둥 충돌 기절');
  const s = A.create({ id: 'boss', name: 'x', level: 'normal', x: 0, y: 0 }); s.state = 'stunned'; s.t = 1;
  assert.equal(A.damage(s, { dmg: 100 }).taken, 150);
});

test('보스: 2페이즈는 절반에서 한 번만, 0이면 dead', () => {
  const A = B(), boss = A.create({ id: 'boss', name: 'x', level: 'normal', x: 0, y: 0 });
  const e1 = A.damage(boss, { dmg: 899 }).events; assert.equal(boss.phase, 1); assert.equal(e1.length, 0);
  const e2 = A.damage(boss, { dmg: 1 }).events; assert.equal(boss.phase, 2); assert.equal(e2.filter(e => e.type === 'phase2').length, 1);
  assert.equal(A.damage(boss, { dmg: 1 }).events.filter(e => e.type === 'phase2').length, 0);
  A.damage(boss, { dmg: 99999 }); assert.equal(boss.hp, 0); assert.equal(boss.state, 'dead');
  assert.equal(A.damage(boss, { dmg: 10 }).taken, 0);
  assert.deepEqual(plain(A.step(boss, me0(), [], WORLD, 0.1, rng(1))), { events: [], hazards: [] });
});

test('보스: 위험 판정 — 원·링·예고 시간·한 번만·무적', () => {
  const A = B();
  const zone = { kind: 'zone', x: 360, y: 900, r: 76, vx: 0, vy: 0, dmg: 28, kb: 0, armT: 0.5, life: 1, width: 0 };
  let out = A.stepHazards([zone], me0(), 0.1); assert.equal(out.events.length, 0, '예고 중');
  out = A.stepHazards(out.list, me0(), 0.45); assert.equal(out.events.filter(e => e.type === 'hit').length, 1);
  out = A.stepHazards(out.list, me0(), 0.05); assert.equal(out.events.length, 0, '한 번만');
  const ring = { kind: 'ring', x: 360, y: 600, r: 290, vx: 0, vy: 0, dmg: 30, kb: 300, armT: 0, life: 2, width: 18 };
  assert.equal(A.stepHazards([ring], me0({ y: 900 }), 0.01).events.length, 1, '링 테두리에 닿음');
  assert.equal(A.stepHazards([{ ...ring, r: 100 }], me0({ y: 900 }), 0.01).events.length, 0, '링 안쪽은 안전');
  assert.equal(A.stepHazards([{ ...zone, armT: 0 }], me0({ invulnT: 1 }), 0.01).events.length, 0, '무적');
});

test('보스: kid는 피해 0.6배', () => {
  const A = B(), hits = lvl => {
    const boss = A.create({ id: 'boss', name: 'x', level: lvl, x: 360, y: 700 });
    return runBoss(A, boss, me0({ x: 360, y: 820 }), [], 20, rng(4)).events.filter(e => e.type === 'hit').map(e => e.dmg);
  };
  const n = hits('normal'), k = hits('kid');
  assert.ok(n.length > 0 && k.length > 0);
  assert.ok(Math.max(...k) <= Math.round(40 * 0.6), `kid 최대 ${Math.max(...k)}`); assert.ok(Math.max(...n) > Math.max(...k));
});
