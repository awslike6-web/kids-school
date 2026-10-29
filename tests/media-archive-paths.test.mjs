// ========================================================
// ✅ 성장 아카이브 미디어 경로 계약 시험 (node --test)
// - 작품(갤러리)은 학년 폴더, 특별한 날·하루방 추억은 activities 폴더에 둔다
//   (docs/gallery_archive_spec.md). 화면에서는 어느 폴더든 사진이 보이므로
//   잘못 넣어도 아무도 모른다(2026-10-29 학교 행사 2건이 2026_elem_1에 들어간 사고).
// - 로컬에 kids-archive 저장소(../kids-archive)가 있으면 파일 실존도 확인한다. CI에서는 건너뛴다.
// ========================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';
import { loadBrowserScripts } from './browser-sandbox.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ARCHIVE_DIR = path.resolve(ROOT, '..', 'kids-archive');
const CDN = 'https://raw.githubusercontent.com/awslike6-web/kids-archive/main/assets/media/';
const ACTIVITIES = 'activities';
// 갤러리 작가 → kids-archive 아이 폴더 (sync_quick_upload.py AUTHOR_MAP과 같은 계약)
const CHILD_DIR = { 민수: 'minsu', 민서: 'minseo', 공동: 'together', 공통: 'together' };

const require = createRequire(import.meta.url);
const { DEFAULT_GALLERY_DATA } = require(path.join(ROOT, 'kids/data/gallery-data.js'));
const { DEFAULT_SPECIAL_DAYS_DATA } = require(path.join(ROOT, 'kids/data/special-days-data.js'));
const GALLERY_META = JSON.parse(readFileSync(path.join(ROOT, 'kids/data/gallery-meta.json'), 'utf8'));
const { sandbox } = loadBrowserScripts(['kids/subjects/haru/data/haru_data.js']);
const HARU_DATA = vm.runInContext('window.HARU_DATA', sandbox);

// 객체 안 어디에 있든 kids-archive 주소를 모두 모은다 → [{ where, child, folder, file, url }]
function archiveUrls(value, where, out = []) {
  if (typeof value === 'string') {
    if (value.startsWith(CDN)) {
      const [child, folder, ...rest] = value.slice(CDN.length).split('/');
      out.push({ where, child, folder, file: rest.join('/'), url: value });
    }
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) archiveUrls(v, Array.isArray(value) ? where : `${where}.${k}`, out);
  }
  return out;
}
const galleryUrls = [
  ...DEFAULT_GALLERY_DATA.flatMap(item => archiveUrls(item, `gallery-data.js ${item.id}`)
    .map(u => ({ ...u, author: item.author }))),
  ...Object.entries(GALLERY_META).flatMap(([id, meta]) => archiveUrls(meta, `gallery-meta.json ${id}`))
];
const memoryUrls = [
  ...DEFAULT_SPECIAL_DAYS_DATA.flatMap(item => archiveUrls(item, `special-days-data.js ${item.id}`)),
  ...archiveUrls(HARU_DATA, 'haru_data.js HARU_DATA')
];
const list = urls => urls.map(u => `  - ${u.where}: ${u.child}/${u.folder}/${u.file}`).join('\n');

test('데이터에서 kids-archive 주소를 읽어 온다 (시험 자체 점검)', () => {
  assert.ok(galleryUrls.length > 0, '갤러리 데이터에서 아카이브 주소를 하나도 찾지 못했습니다');
  assert.ok(memoryUrls.length > 0, '특별한 날·하루방 데이터에서 아카이브 주소를 하나도 찾지 못했습니다');
});

test('갤러리 작품 미디어는 activities 폴더에 두지 않는다', () => {
  const wrong = galleryUrls.filter(u => u.folder === ACTIVITIES);
  assert.equal(wrong.length, 0, `작품은 학년 폴더에 둡니다. activities를 가리키는 작품:\n${list(wrong)}`);
});

test('갤러리 작품 미디어는 작가와 같은 아이 폴더에 둔다', () => {
  const wrong = galleryUrls.filter(u => u.author !== undefined && CHILD_DIR[u.author] !== u.child);
  assert.equal(wrong.length, 0, `작가와 폴더가 다른 작품:\n${wrong.map(u => `  - ${u.where}: 작가 ${u.author} → ${u.child}/`).join('\n')}`);
});

test('특별한 날·하루방 추억 미디어는 activities 폴더에 둔다', () => {
  const wrong = memoryUrls.filter(u => u.folder !== ACTIVITIES);
  assert.equal(wrong.length, 0, `특별한 날은 {아이}/activities/에 둡니다. 다른 폴더를 가리키는 항목:\n${list(wrong)}`);
});

test('같은 파일을 작품과 특별한 날에 함께 등록하지 않는다', () => {
  const memoryFiles = new Set(memoryUrls.map(u => path.posix.basename(u.file)));
  const both = galleryUrls.filter(u => memoryFiles.has(path.posix.basename(u.file)));
  assert.equal(both.length, 0, `작품과 특별한 날에 함께 등록된 파일:\n${list(both)}`);
});

test('참조한 파일이 로컬 kids-archive에 실제로 있다', { skip: !existsSync(ARCHIVE_DIR) && 'kids-archive 저장소가 없어 건너뜀 (CI)' }, () => {
  const missing = [...galleryUrls, ...memoryUrls]
    .filter(u => !existsSync(path.join(ARCHIVE_DIR, 'assets', 'media', u.child, u.folder, ...u.file.split('/'))));
  assert.equal(missing.length, 0, `kids-archive에 없는 파일 (git pull 했는지도 확인):\n${list(missing)}`);
});
