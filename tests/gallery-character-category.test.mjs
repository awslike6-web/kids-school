// 갤러리 「🧸 캐릭터 친구들」 분류 (docs/world_module_spec.md §3-1, P0)
// 화면 분류 목록·아이콘·편집 선택 목록·빌더 정규화가 같은 분류 묶음을 쓰는지 본다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => readFileSync(path.join(ROOT, rel), 'utf8');
const python = process.env.GALLERY_TEST_PYTHON || (process.platform === 'win32' ? 'C:/Users/pc/AppData/Local/Python/pythoncore-3.14-64/python.exe' : 'python');

function loadDataSync() {
  const sandbox = { window: {}, console };
  vm.createContext(sandbox);
  vm.runInContext(`${read('kids/common_space/gallery-data-sync.js')}\n;globalThis.__out = { ART_CATEGORIES, getCategoryIcon };`, sandbox);
  return sandbox.__out;
}

// vm 안 배열은 다른 realm이라 deepEqual을 위해 이쪽 배열로 옮긴다.
const artKeys = () => Array.from(loadDataSync().ART_CATEGORIES, c => c.key).filter(k => k !== 'all');

test('화면: 캐릭터 분류가 목록 끝에 있고 아이콘이 🧸', () => {
  const { ART_CATEGORIES, getCategoryIcon } = loadDataSync();
  const last = ART_CATEGORIES[ART_CATEGORIES.length - 1];
  assert.deepEqual({ ...last }, { key: '캐릭터', label: '캐릭터 친구들', icon: '🧸' });
  assert.equal(getCategoryIcon('캐릭터'), '🧸');
  // 기존 분류 아이콘은 그대로
  assert.equal(getCategoryIcon('만들기/공예'), '✂️');
  assert.equal(getCategoryIcon('그림/미술'), '🎨');
  assert.equal(getCategoryIcon('탐구/프로젝트'), '🔬');
});

test('화면: 편집·새 작품 선택 목록 두 곳이 분류 목록과 같다', () => {
  const html = read('kids/common_space/gallery.html');
  const keys = artKeys();
  for (const id of ['editArtCategorySelect', 'newArtCategory']) {
    const block = html.match(new RegExp(`<select id="${id}"[\\s\\S]*?</select>`));
    assert.ok(block, `${id} 선택 목록이 있다`);
    const values = [...block[0].matchAll(/<option value="([^"]+)"/g)].map(m => m[1]);
    assert.deepEqual(values, keys, `${id} 보기 = ART_CATEGORIES`);
  }
});

test('빌더: 분류 정규화가 캐릭터를 지키고 기존 분류는 그대로', () => {
  const result = spawnSync(python, ['-X', 'utf8', '-c', String.raw`
import importlib.util, json
from pathlib import Path
spec = importlib.util.spec_from_file_location('builder', Path.cwd()/'scripts/build_gallery.py')
b = importlib.util.module_from_spec(spec); spec.loader.exec_module(b)
cases = ['캐릭터', '만들기/공예', '그림/미술', '종이접기/디자인', '상장/기념', '탐구/프로젝트', '수상', '', None, 123]
print(json.dumps([list(b.normalize_category(c)) for c in cases], ensure_ascii=False))
`], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const got = JSON.parse(result.stdout.trim().split('\n').pop());
  assert.deepEqual(got, [
    ['캐릭터', '🧸'], ['만들기/공예', '✂️'], ['그림/미술', '🎨'], ['종이접기/디자인', '📐'],
    ['상장/기념', '🏆'], ['탐구/프로젝트', '🔬'], ['상장/기념', '🏆'],
    ['그림/미술', '🎨'], ['그림/미술', '🎨'], ['그림/미술', '🎨']
  ]);
  // 빌더가 낼 수 있는 분류는 화면 분류 목록 안에 있다
  assert.ok(got.every(([cat]) => artKeys().includes(cat)));
});
