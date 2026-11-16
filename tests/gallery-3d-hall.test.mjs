// tests/gallery-3d-hall.test.mjs - 3D 미술관 배치 계산·엔진·HTML 계약 시험
// 초안: 안티그래비티 Hydrogen, 검토: Claude
'use strict';

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';

const C = Object.freeze({
  EPS: 1e-9,
  HALF_PI: Math.PI / 2,
  TWO: 2,
  HALL_WIDTH: 8,
  HALL_HEIGHT: 4,
  HALF_HALL_WIDTH: 4,
  WALL_INSET: 0.05,
  WALL_X: 3.95,
  BOUNDS_MARGIN: 0.7,
  BOUNDS_MAX_Z: 2,
  EYE_HEIGHT: 1.45,
  SPACING: 3.2,
  HALF_SPACING: 1.6,
  START_GAP: 4,
  END_GAP: 4,
  PER_ROOM: 10,
  FRAME_CENTER_Y: 1.7,
  FRAME_MAX_W: 1.8,
  FRAME_MAX_H: 1.6,
  VIEW_DISTANCE: 2.6,
  VIEW_CUSTOM_DISTANCE: 2.0,
  START_X: 0,
  START_Z: 1.5,
  START_YAW: 0,
  TEXTURE_GRACE: 4,
  COUNT_0: 0,
  COUNT_1: 1,
  COUNT_10: 10,
  COUNT_11: 11,
  COUNT_25: 25,
  ROOM_1: 1,
  ROOM_2: 2,
  ROOM_3: 3,
  ODD_PER_ROOM: 5,
  ROUNDED_PER_ROOM: 6,
  INVALID_PER_ROOM_LOW: 1,
  STEP_NONE: -1,
  STEP_BACK: -1,
  STEP_FWD: 1,
  ASPECT_WIDE: 16 / 9,
  ASPECT_TALL: 0.5,
  ASPECT_SQUARE: 1,
  ASPECT_ULTRA_WIDE: 100,
  ASPECT_ULTRA_TALL: 0.01,
  ASPECT_ZERO: 0,
  ASPECT_NEG: -2,
  CLAMP_OUT_X: 10,
  CLAMP_OUT_Z: 10,
  CLAMP_IN_X: 1.2,
  CLAMP_IN_Z: -3.5,
  BUDGET_SMALL: 2,
  BUDGET_ONE: 1,
  MAX_HALL_LINES: 800,
  DPR_CAP_STR: '1.75',
});

const root = new URL('../', import.meta.url);
const layoutPath = new URL('kids/common_space/gallery-3d-layout.js', root);
const hallPath = new URL('kids/common_space/gallery-3d-hall.js', root);
const htmlPath = new URL('kids/common_space/gallery.html', root);

function loadLayoutModule() {
  const source = readFileSync(layoutPath, 'utf8');
  const forbidden = () => {
    throw Error('엔진에서 화면·저장소·네트워크를 사용했어요.');
  };
  const context = { crypto: webcrypto, fetch: forbidden };
  Object.defineProperties(context, {
    document: { get: forbidden },
    localStorage: { get: forbidden },
  });
  context.window = context;
  vm.runInNewContext(source, context, { filename: 'gallery-3d-layout.js' });
  return { context, E: context.Gallery3DLayout };
}

function assertNear(actual, expected, msg) {
  assert.ok(
    Math.abs(actual - expected) < C.EPS,
    `${msg || '실수 불일치'}: actual=${actual}, expected=${expected}`
  );
}

function toPlain(value) {
  return JSON.parse(JSON.stringify(value));
}

function makeItems(count) {
  const items = [];
  for (let i = 0; i < count; i += 1) {
    items.push({
      id: `art-${i}`,
      title: `작품 ${i}`,
      caption: `설명 ${i}`,
      date: '2026-10-15',
      imageUrl: `https://example.com/${i}.jpg`,
      hasCutout: i % C.TWO === 0,
      characterUrl: `https://example.com/char-${i}.png`,
    });
  }
  return items;
}

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const { context: vmContext, E } = loadLayoutModule();
const hallSource = readFileSync(hallPath, 'utf8');
const hallCodeOnly = stripComments(hallSource);
const scenePath = new URL('kids/common_space/gallery-3d-scene.js', root);
const sceneSource = readFileSync(scenePath, 'utf8');
const sceneCodeOnly = stripComments(sceneSource);
const htmlSource = readFileSync(htmlPath, 'utf8');

test('계산 모듈이 DOM·fetch·localStorage 없이 로드되고 Gallery3DLayout만 공개한다', () => {
  assert.ok(E && typeof E === 'object', 'Gallery3DLayout 객체가 있어야 한다');
  assert.equal(vmContext.Gallery3DLayout, E);
  const exposed = Object.keys(vmContext).filter(
    (k) => k !== 'crypto' && k !== 'fetch' && k !== 'window'
  );
  assert.deepEqual(exposed, ['Gallery3DLayout']);
});

test('Gallery3DLayout과 CONST는 Object.freeze로 잠겨 있다', () => {
  assert.equal(Object.isFrozen(E), true);
  assert.equal(Object.isFrozen(E.CONST), true);
});

test('Gallery3DLayout.CONST 상수가 명세 값과 일치한다', () => {
  assertNear(E.CONST.HALL_WIDTH, C.HALL_WIDTH, 'HALL_WIDTH');
  assertNear(E.CONST.HALL_HEIGHT, C.HALL_HEIGHT, 'HALL_HEIGHT');
  assertNear(E.CONST.EYE_HEIGHT, C.EYE_HEIGHT, 'EYE_HEIGHT');
  assertNear(E.CONST.SPACING, C.SPACING, 'SPACING');
  assertNear(E.CONST.START_GAP, C.START_GAP, 'START_GAP');
  assertNear(E.CONST.END_GAP, C.END_GAP, 'END_GAP');
  assert.equal(E.CONST.PER_ROOM, C.PER_ROOM);
  assertNear(E.CONST.FRAME_CENTER_Y, C.FRAME_CENTER_Y, 'FRAME_CENTER_Y');
  assertNear(E.CONST.FRAME_MAX_W, C.FRAME_MAX_W, 'FRAME_MAX_W');
  assertNear(E.CONST.FRAME_MAX_H, C.FRAME_MAX_H, 'FRAME_MAX_H');
});

test('buildLayout: 0점이면 frames·rooms가 비고 기본 bounds·start를 반환한다', () => {
  const layout = E.buildLayout([]);
  assert.deepEqual(toPlain(layout.frames), []);
  assert.deepEqual(toPlain(layout.rooms), []);
  assertNear(layout.bounds.minX, -C.HALF_HALL_WIDTH + C.BOUNDS_MARGIN, 'minX');
  assertNear(layout.bounds.maxX, C.HALF_HALL_WIDTH - C.BOUNDS_MARGIN, 'maxX');
  assertNear(layout.bounds.minZ, -(C.START_GAP + C.END_GAP) + C.BOUNDS_MARGIN, 'minZ');
  assertNear(layout.bounds.maxZ, C.BOUNDS_MAX_Z, 'maxZ');
  assert.deepEqual(toPlain(layout.start), { x: C.START_X, z: C.START_Z, yaw: C.START_YAW });
});

test('buildLayout: 1점은 왼쪽 벽에 걸리고 방 1개가 생긴다', () => {
  const layout = E.buildLayout(makeItems(C.COUNT_1));
  assert.equal(layout.frames.length, C.COUNT_1);
  assert.equal(layout.rooms.length, C.ROOM_1);
  const f = layout.frames[0];
  assert.equal(f.side, 'left');
  assertNear(f.x, -C.WALL_X, 'x');
  assertNear(f.y, C.FRAME_CENTER_Y, 'y');
  assertNear(f.z, -C.START_GAP, 'z');
  assertNear(f.rotY, C.HALF_PI, 'rotY');
});

test('buildLayout: 10점은 방 1개이고 좌우 번갈아 같은 쌍 같은 z를 쓴다', () => {
  const layout = E.buildLayout(makeItems(C.COUNT_10));
  assert.equal(layout.frames.length, C.COUNT_10);
  assert.equal(layout.rooms.length, C.ROOM_1);
  for (let i = 0; i < layout.frames.length; i += C.TWO) {
    const left = layout.frames[i];
    const right = layout.frames[i + 1];
    assert.equal(left.side, 'left');
    assert.equal(right.side, 'right');
    assertNear(left.z, right.z, `pair ${i} z`);
    assertNear(left.rotY, C.HALF_PI, 'left rotY');
    assertNear(right.rotY, -C.HALF_PI, 'right rotY');
  }
});

test('buildLayout: 11점은 방 2개이고 11번째 작품이 두 번째 방에 들어간다', () => {
  const layout = E.buildLayout(makeItems(C.COUNT_11));
  assert.equal(layout.frames.length, C.COUNT_11);
  assert.equal(layout.rooms.length, C.ROOM_2);
  assert.equal(layout.frames[C.COUNT_10].roomIndex, 1);
  assert.equal(layout.rooms[1].firstIndex, C.COUNT_10);
  assert.equal(layout.rooms[1].lastIndex, C.COUNT_10);
});

test('buildLayout: 25점은 방 3개이고 모든 액자가 bounds 바깥 벽에 붙는다', () => {
  const layout = E.buildLayout(makeItems(C.COUNT_25));
  assert.equal(layout.frames.length, C.COUNT_25);
  assert.equal(layout.rooms.length, C.ROOM_3);
  for (const f of layout.frames) {
    assertNear(Math.abs(f.x), C.WALL_X, `frame ${f.index} |x|`);
    assert.ok(Math.abs(f.x) > layout.bounds.maxX, '액자는 bounds 바깥 벽에 있어야 한다');
  }
});

test('buildLayout: rooms 경계가 이어지고 겹치지 않으며 끝벽까지 덮는다', () => {
  const layout = E.buildLayout(makeItems(C.COUNT_25));
  const rooms = layout.rooms;
  assertNear(rooms[0].zStart, 0, '첫 방 zStart');
  for (let k = 0; k < rooms.length - 1; k += 1) {
    assert.ok(rooms[k].zStart > rooms[k].zEnd, 'zStart > zEnd');
    assertNear(rooms[k].zEnd, rooms[k + 1].zStart, `방 ${k}~${k + 1} 경계 연속`);
  }
  const lastFrame = layout.frames[layout.frames.length - 1];
  const endWallZ = lastFrame.z - C.END_GAP;
  assertNear(rooms[rooms.length - 1].zEnd, endWallZ, '마지막 방 zEnd');
});

test('buildLayout: start가 bounds 안에 있고 초기 크기는 fitFrame(1)이다', () => {
  const layout = E.buildLayout(makeItems(C.COUNT_10));
  const { start, bounds, frames } = layout;
  assert.ok(start.x >= bounds.minX && start.x <= bounds.maxX);
  assert.ok(start.z >= bounds.minZ && start.z <= bounds.maxZ);
  const sq = E.fitFrame(C.ASPECT_SQUARE);
  assertNear(frames[0].width, sq.width, '초기 width');
  assertNear(frames[0].height, sq.height, '초기 height');
});

test('buildLayout: opts.perRoom 홀수는 짝수로 올리고 2 미만·비숫자는 10을 쓴다', () => {
  const oddLayout = E.buildLayout(makeItems(C.COUNT_10), { perRoom: C.ODD_PER_ROOM });
  assert.equal(oddLayout.rooms[0].lastIndex, C.ROUNDED_PER_ROOM - 1);
  const lowLayout = E.buildLayout(makeItems(C.COUNT_11), { perRoom: C.INVALID_PER_ROOM_LOW });
  assert.equal(lowLayout.rooms.length, C.ROOM_2);
  const nanLayout = E.buildLayout(makeItems(C.COUNT_11), { perRoom: 'abc' });
  assert.equal(nanLayout.rooms.length, C.ROOM_2);
});

test('buildLayout: title·caption의 null과 undefined는 빈 문자열이 된다', () => {
  const items = [
    { id: 'a', title: null, caption: undefined, date: '2026-10-01', imageUrl: 'x' },
  ];
  const layout = E.buildLayout(items);
  assert.equal(layout.frames[0].title, '');
  assert.equal(layout.frames[0].caption, '');
});

test('fitFrame: 가로가 긴 비율은 너비가 maxW와 같고 비율을 유지한다', () => {
  const r = E.fitFrame(C.ASPECT_WIDE);
  assertNear(r.width, C.FRAME_MAX_W, 'width');
  assertNear(r.width / r.height, C.ASPECT_WIDE, 'aspect');
  assert.ok(r.height <= C.FRAME_MAX_H + C.EPS);
});

test('fitFrame: 세로가 긴 비율은 높이가 maxH와 같고 비율을 유지한다', () => {
  const r = E.fitFrame(C.ASPECT_TALL);
  assertNear(r.height, C.FRAME_MAX_H, 'height');
  assertNear(r.width / r.height, C.ASPECT_TALL, 'aspect');
  assert.ok(r.width <= C.FRAME_MAX_W + C.EPS);
});

test('fitFrame: 정사각과 아주 긴 비율도 최대값 이하에서 비율을 유지한다', () => {
  const sq = E.fitFrame(C.ASPECT_SQUARE);
  assertNear(sq.width, C.FRAME_MAX_H, '정사각 width');
  assertNear(sq.height, C.FRAME_MAX_H, '정사각 height');
  const wide = E.fitFrame(C.ASPECT_ULTRA_WIDE);
  assertNear(wide.width, C.FRAME_MAX_W, '초광폭 width');
  assertNear(wide.width / wide.height, C.ASPECT_ULTRA_WIDE, '초광폭 aspect');
  const tall = E.fitFrame(C.ASPECT_ULTRA_TALL);
  assertNear(tall.height, C.FRAME_MAX_H, '초세로 height');
  assertNear(tall.width / tall.height, C.ASPECT_ULTRA_TALL, '초세로 aspect');
});

test('fitFrame: 0·음수·NaN·Infinity는 정사각으로 떨어진다', () => {
  const minDim = Math.min(C.FRAME_MAX_W, C.FRAME_MAX_H);
  for (const bad of [C.ASPECT_ZERO, C.ASPECT_NEG, Number.NaN, Infinity, -Infinity]) {
    const r = E.fitFrame(bad);
    assertNear(r.width, minDim, `bad=${bad} width`);
    assertNear(r.height, minDim, `bad=${bad} height`);
  }
});

test('viewpointFor: 왼쪽 벽 액자의 시점과 각도가 맞다', () => {
  const layout = E.buildLayout(makeItems(C.COUNT_10));
  const left = layout.frames[0];
  const vp = E.viewpointFor(left);
  assertNear(vp.x, left.x + C.VIEW_DISTANCE, 'left vp.x');
  assertNear(vp.z, left.z, 'left vp.z');
  assertNear(vp.yaw, C.HALF_PI, 'left vp.yaw');
});

test('viewpointFor: 오른쪽 벽 액자의 시점과 각도가 맞다', () => {
  const layout = E.buildLayout(makeItems(C.COUNT_10));
  const right = layout.frames[1];
  const vp = E.viewpointFor(right, C.VIEW_CUSTOM_DISTANCE);
  assertNear(vp.x, right.x - C.VIEW_CUSTOM_DISTANCE, 'right vp.x');
  assertNear(vp.z, right.z, 'right vp.z');
  assertNear(vp.yaw, -C.HALF_PI, 'right vp.yaw');
});

test('viewpointFor: 시점에서 액자 방향이 (-sin yaw, -cos yaw)와 같고 bounds 안이다', () => {
  const layout = E.buildLayout(makeItems(C.COUNT_10));
  for (const frame of [layout.frames[0], layout.frames[1]]) {
    const vp = E.viewpointFor(frame);
    const dx = frame.x - vp.x;
    const dz = frame.z - vp.z;
    const dist = Math.hypot(dx, dz);
    assertNear(dist, C.VIEW_DISTANCE, '거리');
    assertNear(dx / dist, -Math.sin(vp.yaw), '방향 x');
    assertNear(dz / dist, -Math.cos(vp.yaw), '방향 z');
    assert.ok(vp.x >= layout.bounds.minX && vp.x <= layout.bounds.maxX);
    assert.ok(vp.z >= layout.bounds.minZ && vp.z <= layout.bounds.maxZ);
  }
});

test('clampPosition: 영역 안은 유지하고 밖 좌표는 bounds 경계로 자른다', () => {
  const { bounds } = E.buildLayout(makeItems(C.COUNT_10));
  const inside = E.clampPosition(C.CLAMP_IN_X, C.CLAMP_IN_Z, bounds);
  assertNear(inside.x, C.CLAMP_IN_X, 'inside x');
  assertNear(inside.z, C.CLAMP_IN_Z, 'inside z');
  const outHi = E.clampPosition(C.CLAMP_OUT_X, C.CLAMP_OUT_Z, bounds);
  assertNear(outHi.x, bounds.maxX, 'outHi x');
  assertNear(outHi.z, bounds.maxZ, 'outHi z');
  const outLo = E.clampPosition(-C.CLAMP_OUT_X, -C.CLAMP_OUT_X * C.CLAMP_OUT_X, bounds);
  assertNear(outLo.x, bounds.minX, 'outLo x');
  assertNear(outLo.z, bounds.minZ, 'outLo z');
});

test('stepIndex: -1에서 +1은 0이 되고 count=0이면 -1이다', () => {
  assert.equal(E.stepIndex(C.STEP_NONE, C.STEP_FWD, C.COUNT_10), 0);
  assert.equal(E.stepIndex(C.STEP_NONE, C.STEP_FWD, C.COUNT_0), C.STEP_NONE);
  assert.equal(E.stepIndex(0, C.STEP_BACK, C.COUNT_0), C.STEP_NONE);
});

test('stepIndex: 0 미만과 count 이상으로 가지 않고 양끝에서 멈춘다', () => {
  assert.equal(E.stepIndex(0, C.STEP_BACK, C.COUNT_10), 0);
  assert.equal(E.stepIndex(C.COUNT_10 - 1, C.STEP_FWD, C.COUNT_10), C.COUNT_10 - 1);
  assert.equal(E.stepIndex(C.COUNT_1, C.STEP_FWD, C.COUNT_10), C.COUNT_1 + 1);
});

test('roomLabel: 같은 달이면 연월 하나만 반환한다', () => {
  assert.equal(E.roomLabel(['2026-10-03', '2026-10-29']), '2026년 10월');
});

test('roomLabel: 같은 해 다른 달과 해 넘김을 올바르게 묶는다', () => {
  assert.equal(E.roomLabel(['2026-10-01', '2026-09-15']), '2026년 9월 ~ 10월');
  assert.equal(E.roomLabel(['2026-01-05', '2025-12-20']), '2025년 12월 ~ 2026년 1월');
});

test('roomLabel: 형식이 맞지 않는 값은 빼고 남는 게 없으면 빈 문자열을 반환한다', () => {
  assert.equal(E.roomLabel(['invalid', '2026-13', null, '2026-05-01']), '2026년 5월');
  assert.equal(E.roomLabel(['bad', '', undefined]), '');
});

test('planTextures: 예산 안의 미로드 항목을 가까운 순으로 load에 담는다', () => {
  const { frames } = E.buildLayout(makeItems(C.COUNT_10));
  const plan = E.planTextures(frames, { x: 0, z: -C.START_GAP }, ['art-0'], C.BUDGET_SMALL);
  assert.deepEqual(toPlain(plan.load), ['art-1']);
  assert.deepEqual(toPlain(plan.unload), []);
});

test('planTextures: budget + 4 여유 밖의 loadedIds만 unload에 담는다', () => {
  const { frames } = E.buildLayout(makeItems(C.COUNT_10));
  const loaded = ['art-0', 'art-4', 'art-5', 'art-9'];
  const plan = E.planTextures(frames, { x: 0, z: -C.START_GAP }, loaded, C.BUDGET_ONE);
  assert.ok(plan.unload.includes('art-9'), '여유 4 밖인 art-9는 해제되어야 한다');
  assert.equal(plan.unload.includes('art-4'), false, '여유 4 안인 art-4는 유지된다');
});

test('planTextures: 배열과 Set을 모두 받고 동거리면 index 작은 순으로 고른다', () => {
  const { frames } = E.buildLayout(makeItems(C.COUNT_10));
  const loadedSet = new Set(['art-2']);
  const plan = E.planTextures(frames, { x: 0, z: -C.START_GAP }, loadedSet, C.BUDGET_SMALL);
  assert.deepEqual(toPlain(plan.load), ['art-0', 'art-1']);
});

test('planTextures: 입력 frames와 loadedIds를 변경하지 않는다', () => {
  const { frames } = E.buildLayout(makeItems(C.COUNT_10));
  const framesSnap = toPlain(frames);
  const loadedArr = ['art-0', 'art-9'];
  const loadedSet = new Set(loadedArr);
  E.planTextures(frames, { x: 0, z: -C.START_GAP }, loadedArr, C.BUDGET_ONE);
  E.planTextures(frames, { x: 0, z: -C.START_GAP }, loadedSet, C.BUDGET_ONE);
  assert.deepEqual(toPlain(frames), framesSnap);
  assert.deepEqual(loadedArr, ['art-0', 'art-9']);
  assert.deepEqual([...loadedSet], ['art-0', 'art-9']);
});

test('엔진 정적 규칙: gallery-3d-hall.js가 존재하고 800줄 미만이다', () => {
  assert.equal(existsSync(hallPath), true);
  const lines = hallSource.split(/\r?\n/).length;
  assert.ok(lines < C.MAX_HALL_LINES, `줄 수(${lines})가 ${C.MAX_HALL_LINES} 미만이어야 한다`);
  const sceneLines = sceneSource.split(/\r?\n/).length;
  assert.ok(sceneLines < C.MAX_HALL_LINES, `장면 부품 줄 수(${sceneLines})가 ${C.MAX_HALL_LINES} 미만이어야 한다`);
});

test('엔진 정적 규칙: 고정 CDN 주소, DPR 상한, context/자원 정리를 포함한다', () => {
  assert.match(hallCodeOnly, /https:\/\/[^\s'"]*three/i);
  assert.ok(hallCodeOnly.includes('Math.min('), 'Math.min( 포함');
  assert.ok(sceneCodeOnly.includes(`MAX_DPR: ${C.DPR_CAP_STR}`), '1.75 DPR 상한 상수(장면 부품 CFG) 포함');
  assert.ok(hallCodeOnly.includes('CFG.MAX_DPR'), '엔진이 DPR 상한 상수를 쓴다');
  assert.ok(hallCodeOnly.includes('forceContextLoss'), 'forceContextLoss 포함');
  assert.ok(hallCodeOnly.includes('dispose'), 'dispose 포함');
});

test('엔진 정적 규칙: 주석 제외 소스에서 금지된 그림자·저장소·DOM API가 없다', () => {
  const forbidden = [
    'castShadow',
    'shadowMap',
    'speechSynthesis',
    'localStorage',
    'innerHTML',
    'toISOString',
  ];
  for (const word of forbidden) {
    assert.equal(hallCodeOnly.includes(word), false, `금지어 ${word}가 없어야 한다`);
    assert.equal(sceneCodeOnly.includes(word), false, `장면 부품에 금지어 ${word}가 없어야 한다`);
  }
});

test('gallery.html: css·layout·hall을 상대 경로로 싣고 스크립트 순서가 맞다', () => {
  assert.match(htmlSource, /<link\b[^>]*href="\.\/gallery-3d\.css(?:\?[^"]*)?"/);
  const layoutMatch = htmlSource.match(/<script\b[^>]*src="\.\/gallery-3d-layout\.js(?:\?[^"]*)?"/);
  const sceneMatch = htmlSource.match(/<script\b[^>]*src="\.\/gallery-3d-scene\.js(?:\?[^"]*)?"/);
  const hallMatch = htmlSource.match(/<script\b[^>]*src="\.\/gallery-3d-hall\.js(?:\?[^"]*)?"/);
  const ctrlMatch = htmlSource.match(/<script\b[^>]*src="\.\/gallery_controller\.js(?:\?[^"]*)?"/);
  assert.ok(layoutMatch, 'gallery-3d-layout.js 상대 경로 스크립트가 있어야 한다');
  assert.ok(hallMatch, 'gallery-3d-hall.js 상대 경로 스크립트가 있어야 한다');
  assert.ok(ctrlMatch, 'gallery_controller.js 상대 경로 스크립트가 있어야 한다');
  assert.ok(sceneMatch, 'gallery-3d-scene.js 상대 경로 스크립트가 있어야 한다');
  assert.ok(layoutMatch.index < sceneMatch.index, 'layout이 scene보다 먼저 와야 한다');
  assert.ok(sceneMatch.index < hallMatch.index, 'scene이 hall보다 먼저 와야 한다');
  assert.ok(hallMatch.index < ctrlMatch.index, 'hall이 gallery_controller.js보다 먼저 와야 한다');
});

test('gallery.html: /kids-school/ 같은 루트 절대 경로가 없다', () => {
  assert.equal(htmlSource.includes('"/kids-school/'), false);
  assert.equal(htmlSource.includes("'/kids-school/"), false);
});

test('엔진 동작 계약: 액자 클릭은 앞에 서기까지만 하고 크게 보기 버튼으로 상세 창을 연다', () => {
  const tapMatch = hallCodeOnly.match(/function handleTap[\s\S]*?\n  \}/);
  assert.ok(tapMatch, 'handleTap 함수가 존재해야 한다');
  assert.equal(tapMatch[0].includes('onSelect'), false, 'handleTap 안에서는 onSelect를 직접 부르지 않는다');
  assert.ok(hallCodeOnly.includes('g3d-view'), '크게 보기 버튼(.g3d-view)이 엔진에 포함되어야 한다');
  assert.ok(hallCodeOnly.includes('state.els.viewBtn'), 'viewBtn 클릭 이벤트가 연결되어야 한다');
});
