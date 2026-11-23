// 내 친구 월드 §18 「내가 그린 무기」 시험. 작성: Claude.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stampOfFile } from '../scripts/stamp_versions.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const W = 'kids/playground/world';
const read = rel => readFileSync(path.join(ROOT, rel), 'utf8');
const plain = v => JSON.parse(JSON.stringify(v));
function load(rel) { const sb = { console }; sb.window = sb; vm.createContext(sb); vm.runInContext(read(rel), sb, { filename: rel }); return sb; }

const ITEMS = [
  { id: 'art_minsu_a', author: '민수', category: '무기', title: '불꽃 칼', date: '2026-11-20', characters: [{ key: 'main', name: '불꽃 칼', spriteUrl: 'https://cdn/x/a.png' }] },
  { id: 'art_minsu_b', author: '민수', category: '무기', title: '얼음 총', date: '2026-11-21', characters: [{ key: 'main', spriteUrl: './kids/x/b.png' }] },
  { id: 'art_minseo_c', author: '민서', category: '무기', title: '하트 봉', date: '2026-11-21', characters: [{ key: 'main', name: '하트 봉', spriteUrl: 'https://cdn/x/c.png' }] },
  { id: 'art_together_d', author: '공동', category: '무기', title: '가족 방패', date: '2026-11-01', characters: [{ key: 'main', name: '가족 방패', spriteUrl: 'https://cdn/x/d.png' }, { key: 'no-sprite' }] },
  { id: 'art_minsu_e', author: '민수', category: '캐릭터', title: '보라 용', date: '2026-11-19', characters: [{ key: 'main', name: '보라 용', spriteUrl: 'https://cdn/x/e.png' }] },
  { id: 'art_minsu_f', author: '민수', category: '무기', title: '그림만', date: '2026-11-19' }
];
const charactersOf = it => it.characters || [];

test('무기 모으기: 「무기」 분류의 누끼 그림만, 그 아이·공동 것, 최신 먼저, 손님 없음', () => {
  const S = load(`${W}/core/world-sprites.js`).WorldSprites;
  const son = plain(S.collectWeapons({ items: ITEMS, charactersOf, child: 'son', root: '../../../' }));
  assert.deepEqual(son.map(w => [w.id, w.name, w.src]), [
    ['wpn:art_minsu_b#main', '얼음 총', '../../../kids/x/b.png'],
    ['wpn:art_minsu_a#main', '불꽃 칼', 'https://cdn/x/a.png'],
    ['wpn:art_together_d#main', '가족 방패', 'https://cdn/x/d.png']]);
  assert.deepEqual(plain(S.collectWeapons({ items: ITEMS, charactersOf, child: 'daughter' })).map(w => w.id), ['wpn:art_minseo_c#main', 'wpn:art_together_d#main']);
  assert.deepEqual(plain(S.collectWeapons({ items: ITEMS, child: 'son' })), [], 'charactersOf 없으면 빈 목록');
  assert.deepEqual(plain(S.collectWeapons(null)), []);
});

test('무기는 친구로 돌아다니지 않는다 (광장·정원·아레나 상대·마이룸 인형 모두 collect를 씀)', () => {
  const S = load(`${W}/core/world-sprites.js`).WorldSprites;
  const ids = plain(S.collect({ items: ITEMS, charactersOf, roster: {}, order: [], child: 'son', guest: true, root: '' })).map(i => i.id);
  assert.deepEqual(ids, ['gal:art_minsu_e#main']);
});

test('아레나 연결: 무기 줄에 그림 칩, 기본 3종은 쓰는 법을 겸함, 저장·복원·그리기', () => {
  const ui = read(`${W}/arena-ui.js`);
  assert.match(ui, /drawn = WorldSprites\.collectWeapons \? WorldSprites\.collectWeapons\(\{ items: raw, charactersOf: mr\.charactersOf, child/);
  assert.match(ui, /sel\.cls = w\.id; if \(!drawnOf\(sel\.skin\)\) sel\.skin = null;/, '그린 무기를 고른 채 쓰는 법만 바꿈');
  assert.match(ui, /drawn\.forEach\(\(w\) => \{\s*weaponChips\.push\(makeChip\(w\.name/);
  assert.match(ui, /sel\.skin = lo\.skin && skinSrc\(lo\.skin\) \? lo\.skin : null;/, '저장된 무기가 없어졌으면 기본으로');
  assert.match(ui, /const skinUrl = skinSrc\(sel\.skin\);/);
  const render = read(`${W}/arena-render.js`);
  assert.match(render, /tall = ih > iw \* 1\.15/, '세로로 그린 칼은 눕혀서 조준 방향으로');
  assert.match(render, /ctx\.drawImage\(img, -S \/ 2, -L \/ 2, S, L\)/);
});

test('등록 입구·갤러리: 찰칵등록 칩, 메모 안내, 빌더 분류', () => {
  const qu = read('kids/core/quick-uploader.js');
  assert.match(qu, /data-category="무기"><span class="qu-emoji">🗡️<\/span>내 무기 \(아레나\)/);
  assert.match(qu, /currentCategory === '무기' \? '무기 이름을 적어 줘!/);
  assert.match(read('scripts/build_gallery.py'), /if "무기" in raw_cat:[^\n]*\n\s+return "무기", "🗡️"/);
  assert.ok(read('lobby.html').includes('quick-uploader.js?v=' + stampOfFile('kids/core/quick-uploader.js'))); // 버전 = 내용 해시 (2026-11-24~)
});
