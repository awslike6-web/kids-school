/**
 * test_study_logger_upsert.js
 * -----------------------------------------------------------
 * STUDY_LOG_DB 일일 누적 Upsert 압축 단위 테스트 (Mock Network)
 * - 1회차 완료: POST 신규 생성 ({학생}_{YYYY-MM-DD}_{과목})
 * - 2회차 완료: 동일 키 감지 -> PATCH 누적 갱신
 * -----------------------------------------------------------
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('🧪 [Unit Test] STUDY_LOG_DB 일일 누적 Upsert 압축 검증 시작...');

let queryCalls = 0;
let postCalls = 0;
let patchCalls = 0;
let mockDb = {}; // page_id -> page_obj

const mockFetch = async (url, options = {}) => {
  const method = options.method || 'GET';
  const body = options.body ? JSON.parse(options.body) : {};

  // 1. DB 쿼리
  if (url.includes('/query') && method === 'POST') {
    queryCalls++;
    const targetKey = body.filter?.title?.equals;
    const found = Object.values(mockDb).filter(p => p.properties.ID.title[0].text.content === targetKey);
    return {
      ok: true,
      status: 200,
      json: async () => ({ results: found })
    };
  }

  // 2. 신규 생성
  if (url.endsWith('/pages') && method === 'POST') {
    postCalls++;
    const newId = `mock_page_${Date.now()}`;
    mockDb[newId] = {
      id: newId,
      properties: body.properties
    };
    return {
      ok: true,
      status: 200,
      json: async () => ({ id: newId })
    };
  }

  // 3. 업데이트 (PATCH)
  if (url.includes('/pages/') && method === 'PATCH') {
    patchCalls++;
    const pageId = url.split('/pages/')[1];
    if (mockDb[pageId]) {
      const p = mockDb[pageId];
      if (body.properties['소요시간']) p.properties['소요시간'] = body.properties['소요시간'];
      if (body.properties['단어요정']) p.properties['단어요정'] = body.properties['단어요정'];
      if (body.properties['오답리포트']) p.properties['오답리포트'] = body.properties['오답리포트'];
      if (body.properties['퇴장']) p.properties['퇴장'] = body.properties['퇴장'];
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({ id: pageId })
    };
  }

  return { ok: true, status: 200, json: async () => ({}) };
};

const sandbox = {
  console: console,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  Date: Date,
  Math: Math,
  fetch: mockFetch,
  localStorage: {
    getItem: (k) => (k === 'currentUserName' ? '민수' : (k === 'currentChild' ? 'minsu' : null)),
    setItem: () => {},
    removeItem: () => {}
  },
  location: { pathname: '/kids/subjects/math/math.html' },
  window: {}
};
sandbox.window = sandbox;
sandbox.global = sandbox;
vm.createContext(sandbox);

// Upsert 쓰기는 study-log-store.js 단일 원천이 담당 (notion-helper.js가 로거보다 먼저 로드)
vm.runInContext(fs.readFileSync(path.join(__dirname, '../kids/core/study-log-store.js'), 'utf8'), sandbox);

const loggerPath = path.join(__dirname, '../kids/core/notion-study-logger.js');
const loggerCode = fs.readFileSync(loggerPath, 'utf8');
vm.runInContext(loggerCode, sandbox);

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

async function runTest() {
  // 1회차 활동 완료
  console.log('  ▶ 1회차 학습활동 완료 시뮬레이션...');
  const res1 = await sandbox.window.sendStudyLogToNotion({
    childName: '민수',
    subject: '수학',
    errorReport: '12x5 연산 실수',
    wordFairyCount: 3
  });
  assert(res1 === true, '1회차 전송 성공');
  assert(postCalls === 1, '1회차 호출 시 신규 POST 생성');
  assert(patchCalls === 0, '1회차 호출 시 PATCH 없음');

  // 25초 중복 방어막 해제 시뮬레이션 (시간 조작)
  sandbox.window.__lastStudyLogHistory = [];

  // 2회차 활동 완료 (동일 학생, 동일 과목)
  console.log('  ▶ 2회차 학습활동 완료 시뮬레이션 (동일 학생, 동일 과목)...');
  const res2 = await sandbox.window.sendStudyLogToNotion({
    childName: '민수',
    subject: '수학',
    errorReport: '분수 덧셈 실수',
    wordFairyCount: 2
  });
  assert(res2 === true, '2회차 전송 성공');
  assert(postCalls === 1, '2회차 호출 시 새 페이지 POST 없음 (폭증 방어)');
  assert(patchCalls === 1, '2회차 호출 시 기존 페이지 PATCH Upsert 실행');

  const page = Object.values(mockDb)[0];
  const fairy = page.properties['단어요정'].number;
  const errorReport = page.properties['오답리포트'].rich_text[0].text.content;
  assert(fairy === 5, `단어요정 누적 연산: ${fairy} (3 + 2 = 5)`);
  assert(errorReport.includes('12x5 연산 실수') && errorReport.includes('분수 덧셈 실수'), '오답리포트 누적 병합 완료');

  console.log(`\n📊 [Upsert 검증 결과] 통과: ${passed}건 / 실패: ${failed}건`);
  if (failed > 0) process.exit(1);
  console.log('🎉 STUDY_LOG_DB 일일 누적 Upsert 압축 기능 검증 완료!\n');
}

runTest();
