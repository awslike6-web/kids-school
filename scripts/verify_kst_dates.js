/**
 * verify_kst_dates.js
 * -----------------------------------------------------------
 * 한국 시간(KST) 날짜 계약 검증: 시계를 KST 10/26 08:30 (= UTC 10/25 23:30)으로 고정했을 때
 * 캐시 키·부모 대시보드 연속 학습 판정이 UTC '어제'가 아니라 KST '오늘'을 쓰는지 확인한다.
 * 실행: node scripts/verify_kst_dates.js
 * -----------------------------------------------------------
 */

process.env.TZ = 'Asia/Seoul';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const FIXED = Date.parse('2026-10-25T23:30:00Z'); // KST 2026-10-26 08:30
const TODAY = '2026-10-26';
const ROOT = path.join(__dirname, '..');
let passed = 0;
let failed = 0;
const assert = (cond, msg) => {
  if (cond) { console.log(`  ✅ PASS: ${msg}`); passed++; } else { console.error(`  ❌ FAIL: ${msg}`); failed++; }
};

class FixedDate extends Date {
  constructor(...args) { super(...(args.length ? args : [FIXED])); }
  static now() { return FIXED; }
}

function sandbox() {
  const store = {};
  const sb = {
    console, Date: FixedDate, Math, JSON, setTimeout, clearTimeout,
    localStorage: {
      get length() { return Object.keys(store).length; },
      key: i => Object.keys(store)[i] ?? null,
      getItem: k => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: k => { delete store[k]; }
    },
    document: { addEventListener: () => {}, getElementById: () => null, scripts: [] },
    addEventListener: () => {}
  };
  sb.window = sb;
  vm.createContext(sb);
  return sb;
}
const load = (sb, rel) => vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), sb, { filename: rel });

console.log(`🧪 [Verify] KST 날짜 계약 (고정 시각: UTC 2026-10-25 23:30 = KST ${TODAY} 08:30)`);

{
  const sb = sandbox();
  load(sb, 'kids/core/notion-cache-manager.js');
  const M = sb.NotionCacheManager;
  assert(M._getVocaCacheKey('민수', 'db').endsWith(`_${TODAY}`), `notion-cache-manager 어휘 캐시 키 날짜 = ${TODAY}`);
  assert(M._getReadingCacheKey('korean', '센터', '민수').endsWith(`_${TODAY}`), `notion-cache-manager 독해 캐시 키 날짜 = ${TODAY}`);
}

{
  const sb = sandbox();
  load(sb, 'kids/core/notion-voca.js');
  assert(sb._getVocaCacheKey('민수', 'db').endsWith(`_${TODAY}`), `notion-voca(5분 퀘스트) 어휘 캐시 키 날짜 = ${TODAY}`);
}

{
  // parent_dashboard.js는 DOM 초기화 코드가 섞여 있어 날짜 헬퍼와 calcStreak만 떼어 실행
  const src = fs.readFileSync(path.join(ROOT, 'kids/js/parent_dashboard.js'), 'utf8');
  const pick = name => {
    const start = src.indexOf(`function ${name}(`);
    let depth = 0;
    for (let i = src.indexOf('{', start); i < src.length; i++) {
      if (src[i] === '{') depth++;
      if (src[i] === '}' && --depth === 0) return src.slice(start, i + 1);
    }
    throw new Error(`${name} 추출 실패`);
  };
  const sb = sandbox();
  vm.runInContext(`${pick('localDateStr')}\n${pick('calcStreak')}\nthis.calcStreak = calcStreak;`, sb);
  const page = (iso, name = '민수') => ({ properties: { '학생': { select: { name } }, '입장': { date: { start: iso } } } });
  // 오늘 아침 8:30 KST 학습(UTC로는 10/25 23:30) + 어제(10/25) + 그제(10/24) 학습
  const logs = [page('2026-10-25T23:30:00.000Z'), page('2026-10-25T05:00:00.000Z'), page('2026-10-24T05:00:00.000Z')];
  assert(sb.calcStreak(logs, '민수') === 3, `부모 대시보드: 오전 8:30 학습이 오늘로 잡혀 3일 연속 (계산값 ${sb.calcStreak(logs, '민수')})`);
  assert(sb.calcStreak([page('2026-10-26')], '민수') === 1, '날짜만 있는 값(YYYY-MM-DD)은 그대로 오늘로 인정');
  assert(sb.calcStreak([page('2026-10-23T05:00:00.000Z')], '민수') === 0, '사흘 전 학습만 있으면 0일');
}

console.log(`\n📊 [검증 결과] 통과: ${passed}건 / 실패: ${failed}건`);
if (failed > 0) process.exit(1);
