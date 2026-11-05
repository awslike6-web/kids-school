// ========================================================
// ✅ 특별한 날 영상 버튼 시험 (node --test)
// - 구글 포토·유튜브 공유 주소는 웹페이지라 갤러리 모달의 창 안 <video>로 틀 수 없다.
//   2026-11-06 롯데월드·경동시장 등록 때 `🎬 3D 회전영상` 칸을 누르면 사진이 사라지고 까만 화면이 됐다.
// - 버튼 문구가 "🏰 퍼레이드"처럼 이모지로 시작하면 아이콘 자리에 다시 붙여 "🏰 🏰 퍼레이드"가 됐다.
// ========================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { loadBrowserScripts } from './browser-sandbox.mjs';

const plain = (v) => JSON.parse(JSON.stringify(v));
const gallery = loadBrowserScripts(['kids/common_space/gallery-modal-manager.js']).sandbox;
const haru = loadBrowserScripts([
  'kids/data/special-days-data.js',
  'kids/subjects/haru/data/haru_data.js',
  'kids/subjects/haru/js/haru-special-days.js',
]).sandbox;

test('창 안 영상 칸은 영상 파일 주소일 때만 만든다', () => {
  const playable = gallery.isInlinePlayableVideo;
  for (const url of [
    'https://raw.githubusercontent.com/awslike6-web/kids-archive/main/assets/media/minseo/2026_elem_1/minseo_20261028_seasons_tree_video.mp4',
    'https://example.com/a.WEBM?x=1',
    'https://example.com/a.mov#t=3',
  ]) assert.equal(playable(url), true, url);
  for (const url of [
    'https://photos.app.goo.gl/1vW5j1pYXL2mDkQ18',
    'https://youtu.be/abc',
    'https://example.com/mp4',
    '',
    undefined,
  ]) assert.equal(playable(url), false, String(url));
});

test('버튼 문구 맨 앞 이모지는 아이콘으로 옮기고 한 번만 남긴다 (갤러리·하루방 같은 규칙)', () => {
  for (const split of [gallery.splitLeadingEmoji, haru.splitLeadingEmoji]) {
    assert.deepEqual(plain(split('🏰 10분 퍼레이드 풀영상 감상하기', '🎬')), { icon: '🏰', label: '10분 퍼레이드 풀영상 감상하기' });
    assert.deepEqual(plain(split('🎶 수노 AI 생일 축하송', '🎵')), { icon: '🎶', label: '수노 AI 생일 축하송' });
    assert.deepEqual(plain(split('❤️ 하트 영상', '🎬')), { icon: '❤️', label: '하트 영상' });
    assert.deepEqual(plain(split('👨‍👩‍👧 가족 영상', '🎬')), { icon: '👨‍👩‍👧', label: '가족 영상' });
    // 이모지가 뒤에 있거나 없으면 기본 아이콘을 쓰고 문구는 그대로
    assert.deepEqual(plain(split('사계절 변신 AI 영상 감상하기 🔄', '🎬')), { icon: '🎬', label: '사계절 변신 AI 영상 감상하기 🔄' });
    assert.deepEqual(plain(split('15분 드론쇼 풀영상', '🎬')), { icon: '🎬', label: '15분 드론쇼 풀영상' });
  }
});

test('실제 특별한 날 데이터의 영상 버튼에 이모지가 두 번 붙지 않는다', () => {
  const data = plain(vm.runInContext('DEFAULT_SPECIAL_DAYS_DATA', haru));
  const labels = data.flatMap(s => [
    ...(s.videoBtnText ? [{ text: s.videoBtnText, icon: '🎬' }] : []),
    ...(s.videos || []).map(v => ({ text: v.text, icon: v.icon || '🎬' })),
  ]);
  assert.ok(labels.length > 0);
  for (const { text, icon: fallback } of labels) {
    const { icon, label } = haru.splitLeadingEmoji(text, fallback);
    assert.ok(!label.startsWith(icon), `"${icon} ${label}" 이모지가 두 번 붙습니다`);
  }
});
