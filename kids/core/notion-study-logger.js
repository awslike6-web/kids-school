// ==============================================================================
// 📝 [Notion Study Logger] 학습일지 & 보상/레벨업 전송 엔진 (notion-study-logger.js)
// - 단일 책임: STUDY_LOG_DB 학습일지 생성, 25초 중복 전송 방어막, 오답 리포트 적재,
//             보상은 공용 reward-grant.js로 위임, 기존 전역 API 유지
// - 학습일지·로비 경로·레벨 API와 보상 모듈 자동 로드 껍데기
// ==============================================================================

(function(window) {
    'use strict';

    // 🕒 전역 학습 시작 시간 자동 기록
    window.roomStartTime = window.roomStartTime || new Date();

    // 📒 Upsert·스트릭 단일 원천 보장: 캐시된 구버전 notion-helper.js가 study-log-store.js를 빠뜨려도 직접 로드
    (function ensureStudyLogStore() {
        if (typeof document === 'undefined' || window.StudyLogStore) return;
        if (Array.from(document.scripts).some(s => (s.src || '').includes('study-log-store.js'))) return;
        const source = document.currentScript?.src || Array.from(document.scripts).find(s => (s.src || '').includes('notion-study-logger.js'))?.src;
        if (!source) return;
        const script = document.createElement('script');
        script.src = new URL('study-log-store.js?v=20261024-1', source).href;
        script.async = false;
        document.head.appendChild(script);
    })();

    /**
     * 실행 페이지의 디렉터리 깊이에 따른 로비(lobby.html) 상대 경로 자동 계산
     */
    function getRelativeLobbyUrl() {
        const path = window.location.pathname;
        if (path.includes('/kids/subjects/') || path.includes('/kids/common_space/') || path.includes('/kids/playground/')) {
            return '../../../lobby.html';
        }
        if (path.includes('/kids/')) {
            return '../../lobby.html';
        }
        return './lobby.html';
    }
    window.getRelativeLobbyUrl = getRelativeLobbyUrl;

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
     * 아버님의 새로운 노션 DB 구조에 맞춰 학습 일지를 생성하는 통합 함수
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

        // 🛑 [원천 중복 전송 방어막] 동일 세션 25초 이내 동일/유사 과목 재전송 원천 차단
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
        
        // Completion reports preserve answers/rewards; active time has its own interval ledger.
        const durationMinutes = 0;
        if (window.StudyActivity?.flush) window.StudyActivity.flush();

        // 오답 리포트 자동 수집
        let errorReport = options.errorReport;
        if (errorReport === undefined) {
            const targetNotes = window.engWrongNotes || window.wrongNotes || [];
            errorReport = targetNotes.length > 0 ? targetNotes.map(q => {
                if (q.wrongInput) return `${q.word || q.text} (오답: ${q.wrongInput})`;
                return q.word || q.text || q;
            }).join(' / ') : "오답 없음";
        }
        
        const wordFairyCount = options.wordFairyCount || window.wordFairyCount || (window.learningSession ? window.learningSession.fairyClickCount : 0) || 0;

        console.log(`🚀 [학습일지 배달 시작] 학생: ${childName} | 과목: ${subject}`);

        // 💡 [핵심 방어막] 부모 계정 시뮬레이터 가동 시 데이터 오염 방지
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
     * 💎 전역 만능 보상 지급 엔진 (일일 상한선 노션DB 연동 & 용어방 독립)
     */
    var grantRewardAndShowUI = (function () {
      // 기존 helper가 캐시되어 있어도 지급 모듈을 같은 폴더에서 직접 불러온다.
      const source = typeof document === 'undefined' ? null : document.currentScript?.src
        || Array.from(document.scripts).find(s => (s.src || '').includes('notion-study-logger.js'))?.src;
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

    // ----------------------------------------------------
    // 전역 바인딩 및 네임스페이스
    // ----------------------------------------------------
    window.NotionStudyLogger = {
        calculateLevelInfo,
        sendStudyLogToNotion,
        grantRewardAndShowUI
    };

    window.calculateLevelInfo = calculateLevelInfo;
    window.sendStudyLogToNotion = sendStudyLogToNotion;
    window.grantRewardAndShowUI = grantRewardAndShowUI;

})(typeof window !== 'undefined' ? window : this);
