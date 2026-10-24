/**
 * verify_study_log_store.js
 * -----------------------------------------------------------
 * 학습일지 Upsert & 연속 학습 스트릭 단일 원천(study-log-store.js) 검증 (운영 노션 DB 무접촉, 모의 네트워크)
 * 1) KST 날짜·스트릭 계산 (가짜 기본값 없음, 월 경계, 끊김)
 * 2) 5분 퀘스트·용어사전 경로(notion-reward.js) : 1회차 POST → 2회차 PATCH 누적
 * 3) 파사드 경로(notion-study-logger.js)       : 1회차 POST → 2회차 PATCH 누적
 * 4) 로비 스트릭 노션 동기화 (연속이 끊긴 지점에서 페이지 넘김 중단) & 배지 숨김
 * 실행: node scripts/verify_study_log_store.js
 * -----------------------------------------------------------
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const CORE = path.join(__dirname, '../kids/core');
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

function makeStorage(initial = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: k => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
    removeItem: k => { delete data[k]; }
  };
}

function makeElement() {
  const attrs = {};
  return {
    className: '', innerHTML: '', title: '',
    removeAttribute: k => { delete attrs[k]; }
  };
}

// 모의 노션: STUDY_LOG_DB 페이지 저장소 + 호출 기록
function makeMockNotion() {
  const db = {};
  const calls = { query: 0, post: 0, patch: 0, bodies: [] };
  let seq = 0;
  const fetch = async (url, options = {}) => {
    const method = options.method || 'GET';
    const body = options.body ? JSON.parse(options.body) : {};
    calls.bodies.push({ url, method, body, keepalive: !!options.keepalive });
    const json = data => ({ ok: true, status: 200, json: async () => data });
    if (url.includes('/query') && method === 'POST') {
      calls.query++;
      const key = body.filter?.title?.equals;
      return json({ results: Object.values(db).filter(p => p.properties.ID.title[0].text.content === key), has_more: false });
    }
    if (url.endsWith('/v1/pages') && method === 'POST') {
      calls.post++;
      const id = `mock_page_${++seq}`;
      db[id] = { id, properties: body.properties };
      return json({ id });
    }
    if (url.includes('/v1/pages/') && method === 'PATCH') {
      calls.patch++;
      const id = url.split('/v1/pages/')[1];
      Object.assign(db[id].properties, body.properties);
      return json({ id });
    }
    return { ok: false, status: 404, json: async () => ({}) };
  };
  return { db, calls, fetch };
}

function makeSandbox({ fetch, storage = makeStorage(), elements = {} }) {
  const sandbox = {
    console, setTimeout, clearTimeout, Date, Math, JSON, URL, URLSearchParams, Promise,
    fetch,
    localStorage: storage,
    location: { search: '', pathname: '/quest_runner.html', href: 'http://localhost/quest_runner.html' },
    document: {
      currentScript: null,
      scripts: [],
      head: { appendChild: () => {} },
      getElementById: id => elements[id] || null,
      addEventListener: () => {},
      querySelector: () => null
    },
    addEventListener: () => {},
    removeEventListener: () => {}
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  return sandbox;
}

const load = (sandbox, file) => vm.runInContext(fs.readFileSync(path.join(CORE, file), 'utf8'), sandbox, { filename: file });

(async () => {
  console.log('🧪 [Verify] study-log-store.js 학습일지 Upsert & 스트릭 검증 시작...');

  // ---------- 1. KST 날짜 & 스트릭 계산 ----------
  console.log('  ▶ 1. KST 날짜·스트릭 계산');
  {
    const sb = makeSandbox({ fetch: async () => ({ ok: false }), storage: makeStorage({ 'MINMIN_STREAK_V1_민수': JSON.stringify({ count: 4, lastDate: '2026-10-24' }) }) });
    load(sb, 'study-log-store.js');
    const S = sb.StudyLogStore;
    assert(S.getKstDateString('2026-10-23T23:30:00.000Z') === '2026-10-24', 'UTC 23:30(전날) → KST 다음 날 08:30으로 오늘 날짜 기록');
    assert(S.getKstDateString('2026-10-24T15:00:00Z') === '2026-10-25', 'UTC 15:00 → KST 자정 넘어 다음 날');
    assert(S.computeStreak([], '2026-10-24').count === 0, '학습 기록이 없으면 0일 (가짜 기본값 없음)');
    const s3 = S.computeStreak(['2026-10-24', '2026-10-23', '2026-10-22'], '2026-10-24');
    assert(s3.count === 3 && s3.studiedToday, '오늘·어제·그제 학습 → 3일 연속, 오늘 완료');
    const s2 = S.computeStreak(['2026-10-23', '2026-10-22'], '2026-10-24');
    assert(s2.count === 2 && !s2.studiedToday, '오늘 아직 안 했어도 어제까지 이어지면 2일 연속 유지');
    assert(S.computeStreak(['2026-10-22', '2026-10-21'], '2026-10-24').count === 0, '어제를 건너뛰면 연속 끊김(0일)');
    assert(S.computeStreak(['2026-11-01', '2026-10-31', '2026-10-30'], '2026-11-01').count === 3, '월 경계(10/30~11/1)에서도 3일 연속');
    const legacy = S.getStreakData('minsu');
    assert(legacy.count === 0 && sb.localStorage.getItem('MINMIN_STREAK_V1_민수') === null, '구 캐시의 가짜 4일 값은 지우고 0일로 계산');
  }

  // ---------- 2. 5분 퀘스트·용어사전 경로 (notion-reward.js) ----------
  async function verifyUpsertPath(label, files) {
    console.log(`  ▶ ${label}`);
    const mock = makeMockNotion();
    const sb = makeSandbox({ fetch: mock.fetch });
    files.forEach(f => load(sb, f));
    const today = sb.StudyLogStore.getKstDateString();
    const key = `민수_${today}_수학`;

    const ok1 = await sb.sendStudyLogToNotion({ childName: '민수', subject: '수학', errorReport: '3×4 (오답: 13)', wordFairyCount: 3 });
    assert(ok1 === true && mock.calls.post === 1 && mock.calls.patch === 0, '1회차: 신규 POST 1건');
    const created = Object.values(mock.db)[0];
    assert(created && created.properties.ID.title[0].text.content === key, `1회차: ID가 KST 복합키(${key})`);

    sb.__lastStudyLogHistory = []; // 25초 중복 방어막은 별도 기능이므로 2회차 시뮬레이션에서 해제
    const ok2 = await sb.sendStudyLogToNotion({ childName: '민수', subject: '수학', errorReport: '7×8 (오답: 54)', wordFairyCount: 2 });
    assert(ok2 === true && mock.calls.post === 1 && mock.calls.patch === 1, '2회차: 새 페이지 없이 기존 페이지 PATCH');
    assert(Object.keys(mock.db).length === 1, '당일 같은 학생·과목 페이지는 1건 유지');
    assert(created.properties['단어요정'].number === 5, `단어요정 누적 3 + 2 = ${created.properties['단어요정'].number}`);
    const report = created.properties['오답리포트'].rich_text[0].text.content;
    assert(report === '3×4 (오답: 13) | 7×8 (오답: 54)', `오답리포트 병합: ${report}`);
    const writes = mock.calls.bodies.filter(b => b.method !== 'POST' || !b.url.includes('/query'));
    assert(writes.every(b => b.keepalive), '쓰기 요청(POST/PATCH)은 모두 keepalive');
    const streak = sb.StudyLogStore.getStreakData('민수');
    assert(streak.count >= 1 && streak.studiedToday, '전송 성공 후 오늘이 스트릭에 즉시 반영');
  }
  await verifyUpsertPath('2. 5분 퀘스트·용어사전 경로 (notion-reward.js)', ['study-log-store.js', 'notion-reward.js']);
  await verifyUpsertPath('3. 파사드 경로 (notion-study-logger.js)', ['study-log-store.js', 'notion-study-logger.js']);

  // ---------- 4. 로비 스트릭 노션 동기화 ----------
  console.log('  ▶ 4. 로비 스트릭 노션 동기화 & 배지');
  {
    const sb0 = makeSandbox({ fetch: async () => ({ ok: false }) });
    load(sb0, 'study-log-store.js');
    const S0 = sb0.StudyLogStore;
    const today = S0.getKstDateString();
    const day = n => S0.getKstDateString(new Date(Date.now() - n * 86400000));
    const at = n => ({ properties: { '입장': { date: { start: new Date(Date.now() - n * 86400000).toISOString() } } } });

    let queries = [];
    const pages = [
      { results: [at(0), at(0), at(1)], has_more: true, next_cursor: 'c2' },
      { results: [at(2), at(4)], has_more: true, next_cursor: 'c3' },
      { results: [at(5)], has_more: false }
    ];
    const fetch = async (url, options) => {
      const body = JSON.parse(options.body);
      queries.push(body);
      const page = pages[queries.length - 1];
      return { ok: true, status: 200, json: async () => page };
    };
    const elements = { minsuStreakBadge: makeElement(), minseoStreakBadge: makeElement() };
    const sb = makeSandbox({ fetch, elements });
    load(sb, 'study-log-store.js');
    const result = await sb.StudyLogStore.refreshStreak('minsu');
    assert(result.count === 3 && result.studiedToday, `노션 학습일(오늘·어제·그제) → ${result.count}일 연속`);
    assert(queries.length === 2, `연속이 끊긴 기록(4일 전)까지 읽고 페이지 넘김 중단 (조회 ${queries.length}회)`);
    const f = queries[0].filter.and;
    assert(f[0].select.equals === '민수' && f[1].date.on_or_after, '조회 필터: 학생=민수 & 최근 60일');
    assert(queries[1].start_cursor === 'c2', '두 번째 조회는 다음 페이지 커서 사용');

    sb.StudyLogStore.renderStreakBadge('minsuStreakBadge', 'minsu', true);
    assert(elements.minsuStreakBadge.innerHTML.includes('3일 연속'), '민수 배지: 🔥 3일 연속 표시');
    sb.StudyLogStore.renderStreakBadge('minseoStreakBadge', 'minseo', false);
    assert(elements.minseoStreakBadge.className === 'hidden' && elements.minseoStreakBadge.innerHTML === '', '기록 없는 민서 배지는 숨김');
    assert(day(0) === today, '테스트 기준일 일치');
  }

  console.log(`\n📊 [검증 결과] 통과: ${passed}건 / 실패: ${failed}건`);
  if (failed > 0) process.exit(1);
  console.log('🎉 학습일지 Upsert & 스트릭 단일 원천 검증 완료!\n');
})().catch(e => {
  console.error('💥 검증 스크립트 오류:', e);
  process.exit(1);
});
