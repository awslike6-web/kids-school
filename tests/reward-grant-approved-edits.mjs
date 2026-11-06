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
  return rewardToastEdit('// 보상 지급·오프라인 대기열의 단일 원천. 공개 전역은 MinminRewardGrant 하나입니다.\n' + body + '\n');
}

// 2026-11-06 승인 변경: 보상 알림 alert 창을 누를 필요 없는 작은 말풍선으로 바꿈 (공부 흐름 방해 방지)
export function rewardToastEdit(text) {
  text = replaceOnce(text, "  function saveQueue(queue) { localStorage.setItem(QUEUE_KEY, JSON.stringify(queue)); }\n", "  function saveQueue(queue) { localStorage.setItem(QUEUE_KEY, JSON.stringify(queue)); }\n\n  // 🫧 보상 말풍선: 공부 흐름을 막지 않도록 화면 위쪽에 잠깐 떴다가 저절로 사라진다.\n  // 누를 필요가 없고(pointer-events: none) 연달아 오면 한 개를 새 글자로 바꿔 다시 보여 준다(쌓이지 않음).\n  let toastTimer = null;\n  function ensureToastStyle(doc) {\n    if (doc.getElementById('minmin-reward-toast-style')) return;\n    const style = doc.createElement('style');\n    style.id = 'minmin-reward-toast-style';\n    style.textContent = `\n      .minmin-reward-toast { position: fixed; top: 14px; left: 50%; z-index: 2147483000;\n        transform: translate(-50%, -12px); opacity: 0; pointer-events: none;\n        max-width: calc(100vw - 32px); box-sizing: border-box; padding: 9px 16px; border-radius: 999px;\n        background: rgba(15, 23, 42, 0.88); color: #fff; font: 700 0.95rem/1.35 'Jua', 'Nanum Gothic', sans-serif;\n        border: 1px solid rgba(255, 255, 255, 0.28); box-shadow: 0 6px 18px rgba(0, 0, 0, 0.25); text-align: center; white-space: pre-line;\n        transition: opacity 0.25s ease, transform 0.25s ease; }\n      .minmin-reward-toast.is-shown { opacity: 1; transform: translate(-50%, 0); }\n      .minmin-reward-toast.is-levelup { background: linear-gradient(135deg, #7c3aed, #db2777); }\n      .minmin-reward-toast.is-info { background: rgba(71, 85, 105, 0.92); }\n      @media (prefers-reduced-motion: reduce) { .minmin-reward-toast { transition: opacity 0.2s ease; transform: translate(-50%, 0); } }`;\n    (doc.head || doc.documentElement).appendChild(style);\n  }\n  function showRewardToast(text, options = {}) {\n    const doc = window.document;\n    if (!doc || !doc.body || !text) return false;\n    ensureToastStyle(doc);\n    let el = doc.getElementById('minminRewardToast');\n    if (!el) {\n      el = doc.createElement('div');\n      el.id = 'minminRewardToast';\n      el.className = 'minmin-reward-toast';\n      el.setAttribute('role', 'status');\n      el.setAttribute('aria-live', 'polite');\n      doc.body.appendChild(el);\n    }\n    el.textContent = String(text);\n    el.classList.toggle('is-levelup', options.tone === 'levelup');\n    el.classList.toggle('is-info', options.tone === 'info');\n    el.classList.remove('is-shown');\n    void el.offsetWidth; // 같은 말풍선을 다시 띄울 때도 나타나는 움직임이 보이게 한다\n    el.classList.add('is-shown');\n    if (toastTimer) clearTimeout(toastTimer);\n    toastTimer = setTimeout(() => el.classList.remove('is-shown'), options.duration || 2400);\n    return true;\n  }\n");
  text = replaceOnce(text, "                alert(msg);", "                showRewardToast(`⏳ 오늘 ${subjectName} 보상은 다 모았어요! (${DAILY_LIMIT}/${DAILY_LIMIT})`, { tone: 'info', duration: 3000 });");
  text = replaceOnce(text, "        // 3️⃣ 기본 알림\n        else {\n            let alertMsg = `🎉 보상 획득 완료!\\n+${allowedCurrency}개 적립! (오늘 ${todayEarned + allowedCurrency}/${DAILY_LIMIT})`;\n            if (levelPropName) {\n                alertMsg += `\\n${subjectName} 레벨: Lv.${currLevelInfo.level}`;\n            } else {\n                alertMsg += `\\n용어 경험치가 상승했습니다!`;\n            }\n            alert(alertMsg);\n        }\n", "        // 3️⃣ 기본: 누를 필요 없는 작은 말풍선 (2026-11-06~, 예전에는 alert 창이라 매번 눌러 닫아야 했음)\n        else {\n            const leveledUp = levelPropName && currLevelInfo.level > prevLevelInfo.level;\n            let toastMsg = `${rewardName} +${allowedCurrency}  ·  오늘 ${todayEarned + allowedCurrency}/${DAILY_LIMIT}`;\n            if (leveledUp) toastMsg += `\\n🎉 ${subjectName} 레벨 업! Lv.${currLevelInfo.level}`;\n            else if (isLimitReached) toastMsg += `\\n오늘 모을 수 있는 만큼 다 모았어요!`;\n            showRewardToast(toastMsg, { tone: leveledUp ? 'levelup' : 'reward', duration: leveledUp ? 3600 : 2400 });\n        }\n");
  text = replaceOnce(text, "  window.MinminRewardGrant = { grant, flushQueue };", "  window.MinminRewardGrant = { grant, flushQueue, toast: showRewardToast };");
  return text;
}
