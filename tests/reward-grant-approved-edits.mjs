// 고정 원문에 적용할 공용화 승인 변경. 기대값을 운영 소스에서 만들지 않는다.
import assert from 'node:assert/strict';
import fs from 'node:fs';

export const version = '20261101-reward-grant-shared';
export const normalize = text => text.replace(/\r\n/g, '\n').replace(/[\t ]+$/gm, '').replace(/\n+$/, '');
export const beforeReward = fs.readFileSync(new URL('./fixtures/reward-grant-shared/notion-reward.js', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
export const beforeLogger = fs.readFileSync(new URL('./fixtures/reward-grant-shared/notion-study-logger.js', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
export function replaceOnce(text, before, after) {
  assert.equal(text.split(before).length, 2, '승인 변경 대상은 정확히 한 번 존재해야 함');
  return text.replace(before, after);
}
export const rewardBody = beforeReward.slice(beforeReward.indexOf('var grantRewardAndShowUI = (function () {'), beforeReward.indexOf('\n\n\nwindow.__sttSession'));
export const loggerBody = beforeLogger.slice(beforeLogger.indexOf('    async function grantRewardAndShowUI('), beforeLogger.indexOf('\n\n    // ----------------------------------------------------', beforeLogger.indexOf('    async function grantRewardAndShowUI(')));

export function wrapper(owner) {
  return `var grantRewardAndShowUI = (function () {
  // 기존 helper가 캐시되어 있어도 지급 모듈을 같은 폴더에서 직접 불러온다.
  const source = typeof document === 'undefined' ? null : document.currentScript?.src
    || Array.from(document.scripts).find(s => (s.src || '').includes('${owner}'))?.src;
  let loading = null;
  function ensureModule() {
    if (window.MinminRewardGrant) return Promise.resolve(window.MinminRewardGrant);
    if (loading) return loading;
    if (!source) return Promise.resolve(null);
    loading = new Promise(resolve => {
      const existing = Array.from(document.scripts).find(s => (s.src || '').includes('/reward-grant.js'));
      const script = existing || document.createElement('script');
      const done = () => resolve(window.MinminRewardGrant || null);
      const failed = () => { script.remove?.(); loading = null; resolve(null); };
      if (existing) {
        script.addEventListener('load', done, { once: true });
        script.addEventListener('error', failed, { once: true });
      } else {
        script.onload = done; script.onerror = failed;
        script.src = new URL('reward-grant.js?v=${version}', source).href;
        script.async = false;
        document.head.appendChild(script);
      }
    });
    return loading;
  }
  ensureModule();
  return async function grantRewardAndShowUI(earned, isSilent = false, customExpType = null) {
    if (['아빠', '엄마', '어른'].includes(localStorage.getItem('currentUserName'))) return true;
    const context = {
      childName: localStorage.getItem('currentUser') === 'son' ? '민수' : '민서',
      currentTheme: localStorage.getItem('currentTheme') || '마인크래프트',
      subject: window.currentSubject || null, createdAt: Date.now()
    };
    const module = await ensureModule();
    return module ? module.grant(earned, isSilent, customExpType, context) : false;
  };
})();`;
}
export const extractedReward = text => replaceOnce(normalize(text), normalize(rewardBody), wrapper('notion-reward.js'));
export function extractedLogger(text) {
  text = replaceOnce(text, loggerBody, wrapper('notion-study-logger.js').split('\n').map(line => '    ' + line).join('\n'));
  text = replaceOnce(text, '//             INVENTORY_DB 보상 지급, 일일 상한선 체크, 소원권/경험치/레벨 연산', '//             보상은 공용 reward-grant.js로 위임, 기존 전역 API 유지');
  text = replaceOnce(text, '// - 골디락스 응집도: ~380줄 컴팩트 독립 모듈', '// - 학습일지·로비 경로·레벨 API와 보상 모듈 자동 로드 껍데기');
  const constants = beforeLogger.slice(beforeLogger.indexOf('    const PROXY_URL'), beforeLogger.indexOf('    // 🕒 전역 학습 시작'));
  return replaceOnce(text, constants, '');
}

export function sharedSource() {
  let body = rewardBody.replace('var grantRewardAndShowUI = (function () {', `(function (window) {
  'use strict';
  if (window.MinminRewardGrant) return;
  const PROXY_URL = typeof APP_CONFIG !== 'undefined' && APP_CONFIG.WORKER_PROXY_URL ? APP_CONFIG.WORKER_PROXY_URL : 'https://minmin-notion.awslike6.workers.dev';
  const INVENTORY_DB_ID = typeof APP_CONFIG !== 'undefined' && APP_CONFIG.INVENTORY_DB_ID ? APP_CONFIG.INVENTORY_DB_ID : '374a27115b688042bb61e6a102242e12';`);
  body = replaceOnce(body, '    if (!entry.subject || isAdmin()) return;', '    if (!entry.subject || isAdmin()) return false;');
  body = replaceOnce(body, '    saveQueue(queue);\n  }', '    saveQueue(queue);\n    return true;\n  }');
  body = replaceOnce(body, '    if (!response.ok) throw Object.assign(new Error(`보상 요청 실패 (${response.status})`), { retryReward: true });', `    if (!response.ok) {
      let detail = '';
      try { detail = await response.text(); } catch {}
      console.error('노션 보상 요청 에러 응답:', detail);
      throw Object.assign(new Error('보상 요청 실패 (' + response.status + '): ' + detail), { retryReward: true });
    }`);
  body = replaceOnce(body, "  if (window.addEventListener) window.addEventListener('load', () => flushQueue());", '');
  body = replaceOnce(body, '        syncQuizFlowFromCloud(props["학습설정"]);\n    }', `        syncQuizFlowFromCloud(props["학습설정"]);
    }
    if (activeChild === userName && props["학습설정"] && typeof SettingsManager !== 'undefined' && typeof SettingsManager.syncFromCloud === 'function') {
        SettingsManager.syncFromCloud(props["학습설정"]);
    }`);
  const fallback = beforeLogger.slice(beforeLogger.indexOf('            if (allowedCurrency > 0) {'), beforeLogger.indexOf('\n\n            let earnedTickets'));
  body = replaceOnce(body, '      () => { if (window.ScreenTimeTracker && allowedCurrency > 0) window.ScreenTimeTracker.recordDailyRewardEarned(allowedCurrency, userName); }', '      () => {\n' + fallback + '\n      }');
  body = body.replaceAll("location.href=window.location.pathname.includes('/kids-school/') ? '/kids-school/lobby.html' : '/lobby.html'", "location.href=(typeof getRelativeLobbyUrl==='function'?getRelativeLobbyUrl():(window.location.pathname.includes('/kids-school/') ? '/kids-school/lobby.html' : '/lobby.html'))");
  body = replaceOnce(body, `    if (err.retryReward && !fromQueue) {
      try { enqueue(entry); } catch (error) { console.warn('[보상 대기열 저장 실패]', error); }
    }`, `    let queued = false;
    if (err.retryReward && !fromQueue) {
      try { queued = enqueue(entry); } catch (error) { console.warn('[보상 대기열 저장 실패]', error); }
    }
    if (queued) {
      if (!isSilent && typeof showRewardModal === 'function' && typeof updateRewardModal === 'function') {
        showRewardModal('<div id="rewardModalContent"></div>');
        updateRewardModal('인터넷이 연결되면 보상이 자동으로 들어가요');
      }
      return false;
    }`);
  body = replaceOnce(body, '  return async function grantRewardAndShowUI(earned, isSilent = false, customExpType = null) {', '  async function grant(earned, isSilent = false, customExpType = null, context = null) {');
  body = replaceOnce(body, '      subject: window.currentSubject || null, earned, customExpType, createdAt: Date.now()', '      subject: window.currentSubject || null, createdAt: Date.now(), ...context, earned, customExpType');
  body = replaceOnce(body, '  };\n})();', `  }
  window.MinminRewardGrant = { grant, flushQueue };
  if (window.addEventListener) window.addEventListener('load', () => flushQueue());
  // 동적 로더가 load 뒤 완료되어도 저장된 보상을 한 번 재시도한다.
  if (typeof document !== 'undefined' && document.readyState === 'complete') flushQueue();
})(typeof window !== 'undefined' ? window : this);`);
  return '// 보상 지급·오프라인 대기열의 단일 원천. 공개 전역은 MinminRewardGrant 하나입니다.\n' + body + '\n';
}
