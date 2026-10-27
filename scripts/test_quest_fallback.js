/**
 * test_quest_fallback.js
 * -----------------------------------------------------------
 * 5분 퀘스트 '빈 캐시 / 오프라인 폴백' 안전장치 단위 테스트
 * - 노션 캐시 완전 부재 & 오프라인 상황에서 5문항 출제 무중단 보장 검증
 * -----------------------------------------------------------
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('🧪 [Unit Test] 5분 퀘스트 빈 캐시/오프라인 폴백 검증 시작...');

// 브라우저 Mock 환경 구성
const sandbox = {
  console: console,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  Date: Date,
  Math: Math,
  URLSearchParams: URLSearchParams,
  crypto: { randomUUID: () => 'test-uuid-1234' },
  localStorage: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {}
  },
  location: {
    search: '?user=minsu&subject=math'
  },
  window: {}
};
sandbox.window = sandbox;
sandbox.global = sandbox;
vm.createContext(sandbox);

// 1. quest_data_minsu, quest_data_minseo 로드
const minsuDataPath = path.join(__dirname, '../kids/subjects/quest/quest_data_minsu.js');
const minseoDataPath = path.join(__dirname, '../kids/subjects/quest/quest_data_minseo.js');
if (fs.existsSync(minsuDataPath)) vm.runInContext(fs.readFileSync(minsuDataPath, 'utf8'), sandbox);
if (fs.existsSync(minseoDataPath)) vm.runInContext(fs.readFileSync(minseoDataPath, 'utf8'), sandbox);

// 2. quest_engine.js 로드
const enginePath = path.join(__dirname, '../kids/subjects/quest/quest_engine.js');
const engineCode = fs.readFileSync(enginePath, 'utf8');
vm.runInContext(engineCode, sandbox);

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

// Case 1: 민수 수학 기본 출제 (빈 캐시)
const minsuMath = sandbox.getSubjectQuest('math', 'division', 'mixed', 'minsu');
assert(minsuMath && Array.isArray(minsuMath.questions), '민수 수학 퀘스트 객체 정상 생성');
assert(minsuMath.questions.length >= 5, `민수 수학 문제 수: ${minsuMath.questions.length} (최소 5문항 이상)`);
assert(minsuMath.questions.every(q => q && q.q && Array.isArray(q.options) && q.options.length >= 2), '모든 문항의 질문/선택지 무결성 통과');

// Case 2: 민서 국어 출제 (빈 캐시)
const minseoKor = sandbox.getSubjectQuest('korean', 'dictation', 'speed', 'minseo');
assert(minseoKor && Array.isArray(minseoKor.questions), '민서 국어 퀘스트 객체 정상 생성');
assert(minseoKor.questions.length >= 5, `민서 국어 문제 수: ${minseoKor.questions.length} (최소 5문항 이상)`);

// Case 3: 완전히 존재하지 않는 단원/과목 (극단적 오프라인 폴백 방어)
const fallbackQuest = sandbox.getSubjectQuest('unknown_subj', 'non_existing_unit', 'mixed', 'minsu');
assert(fallbackQuest && Array.isArray(fallbackQuest.questions), '극단적 미상 단원 폴백 퀘스트 객체 생성');
assert(fallbackQuest.questions.length >= 5, `극단적 폴백 문제 수: ${fallbackQuest.questions.length} (무중단 5문항 보장)`);

console.log(`\n📊 [검증 결과] 통과: ${passed}건 / 실패: ${failed}건`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 5분 퀘스트 빈 캐시 / 오프라인 폴백 안전장치 검증 완료!\n');
}
