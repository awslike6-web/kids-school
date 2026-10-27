// ========================================================
// 🎭 화면 시험용 playwright 불러오기 (verify_math_phase*.cjs 공용)
// - 찾는 순서: ① 설치된 playwright  ② 환경변수 PLAYWRIGHT_MODULE 경로
//              ③ 이 PC의 Codex 런타임 사본 (있을 때만)
// - 어디에도 없으면 시험을 실패시키지 않고 "건너뜀"을 알린 뒤 종료 코드 0으로 끝낸다.
//   (Codex 캐시가 지워져도 시험 스크립트가 깨지지 않게 하기 위함)
// ========================================================
const CANDIDATES = [
  'playwright',
  process.env.PLAYWRIGHT_MODULE,
  'C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright',
].filter(Boolean);

function loadChromium() {
  for (const id of CANDIDATES) {
    try { return require(id).chromium; } catch (e) { /* 다음 후보 */ }
  }
  console.log('⏭️ playwright를 찾지 못해 화면 시험을 건너뜁니다.');
  console.log('   설치: npm i -D playwright && npx playwright install chromium  (또는 PLAYWRIGHT_MODULE에 경로 지정)');
  process.exit(0);
}

module.exports = { chromium: loadChromium() };
