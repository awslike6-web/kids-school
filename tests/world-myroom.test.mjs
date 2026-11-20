// 내 친구 월드 P4b 마이룸 인형 시험 (docs/world_module_spec.md §15). 작성: Claude — 초안과 독립적으로 계약에서 씀.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = 'kids/common_space/my-room-dolls.js';
const read = rel => readFileSync(path.join(ROOT, rel), 'utf8');
const plain = v => JSON.parse(JSON.stringify(v));
function load() { const sb = { console }; sb.window = sb; vm.createContext(sb); vm.runInContext(read(FILE), sb, { filename: FILE }); return sb; }

test('인형: 규칙(불러올 때 DOM 없음·전역 하나·금지어·줄 수·머리 주석)', () => {
  const src = read(FILE), sb = load();
  assert.deepEqual(Object.keys(sb).filter(k => !['console', 'window'].includes(k)), ['MyRoomDolls']);
  assert.ok(Object.isFrozen(sb.MyRoomDolls));
  for (const bad of ['Math.random', 'innerHTML', 'speechSynthesis', 'toISOString', 'eval(', 'localStorage.setItem(\'placed']) assert.ok(!src.includes(bad), bad);
  assert.ok(src.split('\n').length < 600);
  assert.match(src.split('\n')[0], /초안: 안티그래비티 Hydrogen, 검토: Claude/);
  assert.match(src, /syncRoomDataToNotion/, '기존 저장 함수를 쓴다'); assert.match(src, /dragStart/, '기존 끌기를 쓴다');
  assert.match(src, /crossOrigin\s*=\s*'anonymous'/, '사진 합성을 위해 교차 출처 허용');
  // 마이룸 상태는 let 전역 → window.placedFurniture로는 안 보인다(2026-11-20 꺼내기가 안 되던 원인)
  for (const name of ['placedFurniture', 'currentProfile', 'isDragging', 'activeDragElement']) assert.ok(!src.includes(`root.${name}`), `root.${name} 금지`);
});

test('인형: 배치 id·태그·가까운 가구·사진첩', () => {
  const D = load().MyRoomDolls;
  assert.deepEqual(plain(D.TAGS), { sleep: '💤', eat: '😋', bounce: '🦘', music: '🎵' });
  assert.equal(D.galId('art_x', 'main'), 'gal:art_x#main');
  assert.deepEqual(plain(D.parseGalId('gal:art_x#main')), { artId: 'art_x', key: 'main' });
  assert.equal(D.parseGalId('mc_redbed'), null); assert.equal(D.parseGalId('gal:nokey'), null);
  const furn = [{ x: 100, y: 100, tag: 'sleep' }, { x: 300, y: 100, tag: 'eat' }, { x: 120, y: 120 }];
  assert.equal(D.nearTag({ x: 150, y: 150 }, furn), 'sleep');
  assert.equal(D.nearTag({ x: 340, y: 150 }, furn), 'eat');
  assert.equal(D.nearTag({ x: 600, y: 600 }, furn), null);
  assert.equal(D.nearTag({ x: 150, y: 150 }, furn, 5), null);
  const album = D.trimAlbum([{ at: 1 }, { at: 9 }, { at: 5 }, { at: 7 }, { at: 3 }, { at: 8 }, { at: 2 }]);
  assert.deepEqual(plain(album).map(a => a.at), [9, 8, 7, 5, 3, 2]);
});

test('인형: 기존 마이룸 연결과 상품 태그', () => {
  const main = read('kids/common_space/my-room-main.js'), core = read('kids/common_space/my-room-core.js'), html = read('kids/common_space/my-room.html');
  assert.match(main, /currentTab === 'friends'[\s\S]{0,80}MyRoomDolls\.renderDock\(dock\)/);
  assert.match(main, /MyRoomDolls\.renderRoom\(room\)/);
  assert.match(html, /id="tab-friends-btn"/);
  for (const [id, tag] of [['mc_redbed', 'sleep'], ['item_radio', 'music'], ['item_hoverboard', 'bounce'], ['fruit_apple', 'eat'], ['item_haribo', 'eat'], ['item_slime', 'bounce']]) {
    assert.match(core, new RegExp(`id: "${id}"[^}]*tag: "${tag}"`), `${id} → ${tag}`);
  }
});
