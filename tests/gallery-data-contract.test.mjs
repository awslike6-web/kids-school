// ========================================================
// ✅ 갤러리·특별한 날 데이터 규칙 시험 (node --test)
// - 어떤 에이전트(agy·Claude·사람)가 등록해도 데이터가 같은 규칙을 지키는지 본다.
//   등록 도구가 자동 커밋·푸시하므로, 규칙을 어기면 이 시험이 GitHub Actions에서 걸린다.
// - 2026-11-06: 경동시장 행사를 작성자 "공통"으로 저장해 갤러리 '온 가족 추억' 탭에서 빠지고
//   카드 이름표가 "공통"으로 나왔다. 온 가족 행사의 저장값은 "공동" 하나다.
// - 로컬에 kids-archive 저장소(../kids-archive)가 있으면 archive-master-data.js도 본다. CI에서는 건너뛴다.
// ========================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ARCHIVE_MASTER = path.resolve(ROOT, '..', 'kids-archive', 'data', 'archive-master-data.js');
const CDN = 'https://raw.githubusercontent.com/awslike6-web/kids-archive/main/assets/media/';
const require = createRequire(import.meta.url);
const { DEFAULT_GALLERY_DATA } = require(path.join(ROOT, 'kids/data/gallery-data.js'));
const { DEFAULT_SPECIAL_DAYS_DATA } = require(path.join(ROOT, 'kids/data/special-days-data.js'));

// 저장값 → kids-archive 폴더 (scripts/add_activity_photo.py AUTHORS와 같은 계약)
const SPECIAL_AUTHORS = { 민서: 'minseo', 민수: 'minsu', 공동: 'together', 아빠: 'together', 엄마: 'together' };
const ART_AUTHORS = { 민서: 'daughter', 민수: 'son', 공동: 'together' };
const SPECIAL_CATEGORIES = ['가족/생일파티', '생태/텃밭/체험', '소풍/현장학습', '학교행사/운동회', '사계절 자연관찰', '소중한 하루'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const HTTP_RE = /^https?:\/\//;

const problems = (items, check) => items.flatMap(item => check(item).map(msg => `  - ${item.id}: ${msg}`));
const report = (list) => `\n${list.join('\n')}`;

test('특별한 날: 작성자·id·날짜·분류가 규칙을 지킨다', () => {
  const seen = new Set();
  const bad = problems(DEFAULT_SPECIAL_DAYS_DATA, (s) => {
    const out = [];
    if (!(s.author in SPECIAL_AUTHORS)) out.push(`작성자 "${s.author}"는 ${Object.keys(SPECIAL_AUTHORS).join('·')} 중 하나여야 합니다 (온 가족은 "공동")`);
    if (!/^evt_[a-z0-9_]+$/.test(s.id || '')) out.push('id는 evt_ + 영문 소문자·숫자·_');
    if (seen.has(s.id)) out.push('id 중복');
    seen.add(s.id);
    if (!DATE_RE.test(s.date || '')) out.push(`날짜 "${s.date}"는 YYYY-MM-DD`);
    if (!SPECIAL_CATEGORIES.includes(s.category)) out.push(`분류 "${s.category}"는 갤러리 특별한 날 분류 6종 중 하나`);
    if (!s.title || !String(s.title).trim()) out.push('제목 없음');
    return out;
  });
  assert.deepEqual(bad, [], report(bad));
});

test('특별한 날: 사진·영상 주소가 규칙을 지킨다', () => {
  const bad = problems(DEFAULT_SPECIAL_DAYS_DATA, (s) => {
    const out = [];
    // 화면(gallery-modal-manager)과 같은 규칙: galleryImages가 없으면 imageUrl 한 장
    const images = (s.galleryImages && s.galleryImages.length) ? s.galleryImages : (s.imageUrl ? [s.imageUrl] : []);
    if (!images.length) out.push('대표 사진(imageUrl)이 없습니다');
    else if (s.imageUrl && images[0] !== s.imageUrl) out.push('imageUrl은 galleryImages 첫 장과 같아야 합니다');
    for (const url of images) {
      if (!url.startsWith(CDN)) out.push(`kids-archive CDN 주소가 아닙니다: ${url}`);
      else if (url.slice(CDN.length).split('/')[0] !== SPECIAL_AUTHORS[s.author]) {
        out.push(`작성자 ${s.author}의 사진은 ${SPECIAL_AUTHORS[s.author]}/ 폴더에 있어야 합니다: ${url}`);
      }
    }
    if (s.videoUrl && !HTTP_RE.test(s.videoUrl)) out.push(`videoUrl은 http(s) 주소: ${s.videoUrl}`);
    if (s.videos !== undefined) {
      if (!Array.isArray(s.videos) || !s.videos.length) out.push('videos는 비어 있지 않은 목록');
      else s.videos.forEach((v, i) => {
        if (!v || !HTTP_RE.test(v.url || '')) out.push(`videos ${i + 1}번째에 http(s) url이 없습니다`);
      });
      if (Array.isArray(s.videos) && s.videos.length && !s.videoUrl) out.push('videos가 있으면 videoUrl(첫 버튼)도 있어야 합니다');
    }
    return out;
  });
  assert.deepEqual(bad, [], report(bad));
});

test('갤러리 작품: 작성자·id·날짜가 규칙을 지킨다', () => {
  const seen = new Set();
  const bad = problems(DEFAULT_GALLERY_DATA, (a) => {
    const out = [];
    if (!(a.author in ART_AUTHORS)) out.push(`작성자 "${a.author}"는 ${Object.keys(ART_AUTHORS).join('·')} 중 하나 (온 가족은 "공동")`);
    else if (a.authorKey && a.authorKey !== ART_AUTHORS[a.author]) out.push(`authorKey "${a.authorKey}"가 작성자 ${a.author}와 맞지 않습니다`);
    if (!/^art_[A-Za-z0-9_()\-]+$/.test(a.id || '')) out.push('id는 art_로 시작');
    if (seen.has(a.id)) out.push('id 중복');
    seen.add(a.id);
    if (!DATE_RE.test(a.date || '')) out.push(`날짜 "${a.date}"는 YYYY-MM-DD`);
    return out;
  });
  assert.deepEqual(bad, [], report(bad));
});

test('kids-archive 마스터: 작성자 저장값과 특별한 날 짝이 맞는다 (로컬에 저장소가 있을 때만)', (t) => {
  if (!existsSync(ARCHIVE_MASTER)) { t.skip('../kids-archive 없음 (CI)'); return; }
  const text = readFileSync(ARCHIVE_MASTER, 'utf8');
  const m = text.match(/const ARCHIVE_MASTER_DATA = (\[[\s\S]*?\n\]);/);
  assert.ok(m, 'archive-master-data.js에서 ARCHIVE_MASTER_DATA 배열을 찾지 못했습니다');
  const master = JSON.parse(m[1]);
  const special = new Map(DEFAULT_SPECIAL_DAYS_DATA.map(s => [s.id, s]));
  const bad = problems(master, (r) => {
    const out = [];
    if (!['민서', '민수', '공동', '아빠', '엄마'].includes(r.student)) out.push(`student "${r.student}"는 민서·민수·공동·아빠·엄마 중 하나 (온 가족은 "공동")`);
    if (r.id.startsWith('evt_')) {
      const s = special.get(r.id);
      if (!s) out.push('special-days-data.js에 같은 id가 없습니다');
      else if (s.author !== r.student) out.push(`작성자가 다릅니다: 공부방 "${s.author}" / 아카이브 "${r.student}"`);
    }
    return out;
  });
  assert.deepEqual(bad, [], report(bad));
});
