// ========================================================
// ✅ 공부방 회귀 시험 묶음 (node --test)
// - 실행: node --test "tests/**/*.test.mjs"   (공부방 저장소 루트에서, 약 3초)
// - 기존 단독 시험 스크립트를 그대로 돌려 종료 코드 0(통과)인지 본다.
//   각 스크립트는 실패하면 종료 코드 1로 끝나고, 노션 운영 DB에는 접속하지 않는다(모의 fetch).
// - 브라우저를 띄우는 수학 화면 시험(verify_math_phase*.cjs)은 느리고 playwright가 필요해 여기서 뺀다.
// ========================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const SUITES = [
  ['3·3·3 마스터리 엔진 (숙련도·스테이지·Max-Merge)', 'scripts/verify_quest_mastery.js'],
  ['5분 퀘스트 빈 캐시·오프라인 폴백', 'scripts/test_quest_fallback.js'],
  ['학습일지 일일 누적 Upsert (POST→PATCH, 오답리포트 병합)', 'scripts/test_study_logger_upsert.js'],
  ['학습일지 저장소·스트릭 단일 원천', 'scripts/verify_study_log_store.js'],
  ['KST 로컬 날짜 헬퍼', 'scripts/verify_kst_dates.js'],
  ['일기장 조회·노션 동기화 캐시 정리', 'scripts/verify_diary_sync.js'],
];

for (const [name, script] of SUITES) {
  test(name, () => {
    const r = spawnSync(process.execPath, [script], { cwd: ROOT, encoding: 'utf8', timeout: 60_000 });
    const tail = `${r.stdout || ''}\n${r.stderr || ''}`.trim().split('\n').slice(-15).join('\n');
    assert.equal(r.status, 0, `${script} 실패 (종료 코드 ${r.status})\n${tail}`);
  });
}
