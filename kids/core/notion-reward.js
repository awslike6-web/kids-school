// kids/core/notion-reward.js - notion-reward.js 분리 1/3: 공용 모듈 로드·학습일지·보상 UI (순서대로 로드)

// Load the shared active-study meter and study-log store once, including pages without core.js.
(function() {
    const source=document.currentScript?.src || Array.from(document.scripts).find(s => (s.src || '').includes('notion-reward.js'))?.src;
    if (!source) return;
    [['StudyActivity', 'study-activity.js', '?v=20261030-lesson'], ['StudyLogStore', 'study-log-store.js', '?v=20261030-lesson']].forEach(([globalName, file, version]) => {
        if (window[globalName] || Array.from(document.scripts).some(s => (s.src || '').includes(file))) return;
        const script=document.createElement('script');
        script.src=new URL(file + version,source).href; script.async=false;
        document.head.appendChild(script);
    });
})();
// ==========================================
// 💎 김s 공부방 보상·학습일지·인벤토리 연동 모듈 (notion-reward.js)
// ==========================================

var PROXY_URL = typeof APP_CONFIG !== 'undefined' && APP_CONFIG.WORKER_PROXY_URL ? APP_CONFIG.WORKER_PROXY_URL : "https://minmin-notion.awslike6.workers.dev";
var STUDY_LOG_DB_ID = typeof APP_CONFIG !== 'undefined' && APP_CONFIG.STUDY_LOG_DB_ID ? APP_CONFIG.STUDY_LOG_DB_ID : "37aa27115b688001b2ffe5e6c8f82ab2";
var INVENTORY_DB_ID = typeof APP_CONFIG !== 'undefined' && APP_CONFIG.INVENTORY_DB_ID ? APP_CONFIG.INVENTORY_DB_ID : "374a27115b688042bb61e6a102242e12";

// 🕒 전역 학습 시작 시간 자동 기록
window.roomStartTime = window.roomStartTime || new Date();

/**
 * 아버님의 새로운 노션 DB 구조에 맞춰 학습 일지를 생성하는 통합 함수
 * 매개변수를 생략해도 현재 환경(window 객체)을 바탕으로 자동으로 채웁니다.
 */
async function sendStudyLogToNotion(options = {}) {
    let childName = options.childName;
    if (!childName) {
        const curUser = localStorage.getItem('currentUser');
        const curChild = localStorage.getItem('currentChild');
        const curUserName = localStorage.getItem('currentUserName');
        if (curUser === 'daughter' || curChild === 'minseo' || curUserName === '민서' || (typeof currentProfile !== 'undefined' && currentProfile === 'daughter') || (window.currentProfile === 'daughter')) {
            childName = '민서';
        } else {
            childName = '민수';
        }
    }
    let subject = options.subject || window.currentSubject;
    if (!subject && typeof detectSubjectFromContext === 'function') {
        subject = detectSubjectFromContext();
    }

    // 🚨 [원천 방어막] 유효한 과목명이 없거나 "미상 과목"인 경우 노션 DB 오염 방지를 위해 전송 차단
    if (!subject || subject === "미상 과목") {
        console.warn(`⚠️ [학습일지 방어막] 유효한 교과목명이 없어 노션 전송을 안전하게 차단합니다. (감지된 과목: ${subject})`);
        return false;
    }

    // 🛑 [원천 중복 전송 방어막] 동일 세션 25초 이내 동일/유사 과목 재전송 원천 차단 (버튼 연타 및 화면 이탈 중복 방지)
    const nowTs = Date.now();
    window.__lastStudyLogHistory = window.__lastStudyLogHistory || [];
    const recentDuplicate = window.__lastStudyLogHistory.find(h => {
        const timeDiff = (nowTs - h.time) / 1000;
        const isSameStudent = h.childName === childName;
        const isRelatedSubj = h.subject === subject || h.subject.startsWith(subject) || subject.startsWith(h.subject);
        return isSameStudent && isRelatedSubj && timeDiff < 25;
    });

    if (recentDuplicate) {
        console.warn(`🛑 [학습일지 중복 방어막] 최근 ${Math.round((nowTs - recentDuplicate.time)/1000)}초 전에 이미 [${recentDuplicate.subject}] 일지가 기록되었습니다. 중복 전송을 안전하게 차단합니다! (시도: ${childName} - ${subject})`);
        return true;
    }

    const startTime = options.startTime || (window.roomStartTime ? window.roomStartTime.toISOString() : new Date().toISOString());
    const endTime = options.endTime || new Date().toISOString();
    
    // Activity intervals are recorded separately, including unfinished sessions.
    // Completion/error reports must not award the same interval a second time.
    const durationMinutes = 0;
    if (window.StudyActivity?.flush) window.StudyActivity.flush();

    // 오답 리포트 자동 수집
    let errorReport = options.errorReport;
    if (errorReport === undefined) {
        // 영어(engWrongNotes) 또는 국어/수학(wrongNotes) 배열 호환
        const targetNotes = window.engWrongNotes || window.wrongNotes || [];
        errorReport = targetNotes.length > 0 ? targetNotes.map(q => {
            if (q.wrongInput) return `${q.word || q.text} (오답: ${q.wrongInput})`;
            return q.word || q.text || q;
        }).join(' / ') : "오답 없음";
    }
    
    const wordFairyCount = options.wordFairyCount || window.wordFairyCount || (window.learningSession ? window.learningSession.fairyClickCount : 0) || 0;

    console.log(`🚀 [학습일지 배달 시작] 학생: ${childName} | 과목: ${subject}`);

    // 💡 [핵심 방어막] 현재 로그인한 사람이 아빠나 엄마인지 실시간 체크 (부모 계정 시뮬레이터 가동 시 데이터 오염 방지)
    const savedName = localStorage.getItem('currentUserName');
    if (savedName === '아빠' || savedName === '엄마' || savedName === '어른') {
        console.log(`🛠️ [관리자 시뮬레이터 가동] ${savedName} 모드이므로 노션 서버 전송을 건너뛰고 프리패스합니다!`);
        return true; 
    }

    try {
        // 📦 당일 같은 학생·과목은 1건으로 누적 (Upsert·스트릭 단일 원천: study-log-store.js)
        if (!window.StudyLogStore) throw new Error("study-log-store.js가 로드되지 않았습니다");
        await window.StudyLogStore.upsertStudyLog({ childName, subject, startTime, endTime, durationMinutes, errorReport, wordFairyCount });

        window.__isStudyLogSentInSession = true;
        window.__lastStudyLogHistory.push({ childName, subject, time: nowTs });

        console.log("🎉 노션에 학습 일지가 완벽하게 기록되었습니다!");
        return true;
    } catch (error) {
        console.error("학습일지 전송 실패:", error);
        return false;
    }
}

/**
 * 경험치를 바탕으로 레벨업 단계 정보를 연산하는 공식
 */
function calculateLevelInfo(totalRewards) {
    let level = 1; let requiredForNext = 20; let accumulatedForCurrentLevel = 0; 
    while (totalRewards >= accumulatedForCurrentLevel + requiredForNext) {
        accumulatedForCurrentLevel += requiredForNext; level++; requiredForNext = 20 + (level - 1) * 5; 
    }
    let currentLevelProgress = totalRewards - accumulatedForCurrentLevel; 
    let remainingForNext = requiredForNext - currentLevelProgress; 
    return { level, requiredForNext, remainingForNext, currentLevelProgress };
}

/**
 * 💎 전역 만능 보상 지급 엔진 (일일 상한선 노션DB 연동 & 용어방 독립)
 */
var grantRewardAndShowUI = (function () {
  // 기존 helper가 캐시되어 있어도 지급 모듈을 같은 폴더에서 직접 불러온다.
  const source = typeof document === 'undefined' ? null : document.currentScript?.src
    || Array.from(document.scripts).find(s => (s.src || '').includes('notion-reward.js'))?.src;
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
        script.src = new URL('reward-grant.js?v=20261101-reward-grant-shared', source).href;
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
})();


window.__sttSession = null;

