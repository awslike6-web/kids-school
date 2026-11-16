// 노션 DB 여러 쪽 조회에는 정렬을 꼭 건다 (정렬 없으면 쪽 경계에서 행이 빠짐: 2026-11-17 VOCA_DB 2,106행 중 1행 누락)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../kids/core/notion-api-client.js', import.meta.url), 'utf8');

test('notion-api-client의 DB 조회 본문(page_size 객체)은 모두 sorts를 가진다', () => {
  const bodies = [...src.matchAll(/\{\s*page_size:\s*100[^}]*\}/g)].map(m => m[0]);
  assert.ok(bodies.length >= 3, `조회 본문을 찾지 못함: ${bodies.length}`);
  for (const b of bodies) assert.match(b, /sorts:\s*STABLE_SORTS/, `정렬 없는 조회 본문: ${b}`);
});

test('STABLE_SORTS는 만든 시각 오름차순', () => {
  assert.match(src, /const STABLE_SORTS = \[\{ timestamp: "created_time", direction: "ascending" \}\];/);
});
