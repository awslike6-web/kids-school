// 노션 DB 여러 쪽 조회에는 정렬을 꼭 건다 (정렬 없으면 쪽 경계에서 행이 빠짐: 2026-11-17 VOCA_DB 2,106행 중 1행 누락)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../kids/core/notion-api-client.js', import.meta.url), 'utf8');

test('notion-api-client의 DB 조회 본문(page_size 객체)은 모두 sorts를 가진다', () => {
  const bodies = [...src.matchAll(/\{\s*page_size:\s*100[^}]*\}/g)].map(m => m[0]);
  assert.ok(bodies.length >= 2, `조회 본문을 찾지 못함: ${bodies.length}`); // VOCA·독해 (시간표는 2026-11-27부터 notion-timetable.js)
  for (const b of bodies) assert.match(b, /sorts:\s*STABLE_SORTS/, `정렬 없는 조회 본문: ${b}`);
});

test('STABLE_SORTS는 만든 시각 오름차순', () => {
  assert.match(src, /const STABLE_SORTS = \[\{ timestamp: "created_time", direction: "ascending" \}\];/);
});

// 시간표 파서는 2026-11-27(리팩토링 묶음 D)부터 notion-timetable.js 한 벌 — 이 파일 조회에도 같은 정렬
const timetableSrc = readFileSync(new URL('../kids/core/notion-timetable.js', import.meta.url), 'utf8');

test('notion-timetable의 DB 조회 본문도 sorts를 가진다 (만든 시각 오름차순)', () => {
  const bodies = [...timetableSrc.matchAll(/\{\s*page_size:\s*100[^}]*\}/g)].map(m => m[0]);
  assert.ok(bodies.length >= 1, '시간표 조회 본문을 찾지 못함');
  for (const b of bodies) assert.match(b, /sorts:\s*TIMETABLE_STABLE_SORTS/, `정렬 없는 조회 본문: ${b}`);
  assert.match(timetableSrc, /(?:var|const) TIMETABLE_STABLE_SORTS = \[\{ timestamp: "created_time", direction: "ascending" \}\];/);
});

test('시간표 함수는 한 벌: notion-api-client에는 시간표 파서·조회가 없다', () => {
  for (const name of ['parseTimetablePeriodSlot', 'inferPeriodNumFromDate', 'parseTimetablePage', 'isTimetableNoticeCandidate',
    'enrichTimetableRowsWithPageContent', 'fetchTimetableFromNotion', 'fetchDualTimetableFromNotion', 'updateTimetableItemComplete']) {
    assert.doesNotMatch(src, new RegExp(`function\\s+${name}\\b`), `notion-api-client.js에 ${name} 사본이 다시 생김`);
    assert.match(timetableSrc, new RegExp(`function\\s+${name}\\b`), `notion-timetable.js에 ${name} 없음`);
  }
  // 노션 페이지 본문 읽기는 반대로 api-client 한 벌
  for (const name of ['extractPlainTextFromNotionBlock', 'fetchNotionBlockChildrenPlainText', 'collectPlainTextFromNotionBlock', 'fetchNotionPageBlocksPlainText']) {
    assert.doesNotMatch(timetableSrc, new RegExp(`function\\s+${name}\\b`), `notion-timetable.js에 ${name} 사본이 다시 생김`);
    assert.match(src, new RegExp(`function\\s+${name}\\b`), `notion-api-client.js에 ${name} 없음`);
  }
  assert.match(timetableSrc, /window\.NotionApiClient && window\.NotionApiClient\.fetchNotionPageBlocksPlainText/);
});
