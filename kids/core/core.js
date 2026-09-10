// ========================================================
// 🏰 민민이네 공부방 공통 핵심 코어 엔진 (core.js)
// ========================================================

var requiredCores = [
    "notion-helper.js",
    "fairy-config.js",
    "fairy-engine.js",
    "daily-diary.js",
    "quiz-flow-controller.js"
];

// 글로벌 헬퍼 상태 정의 (공통 사용)
window.currentProfile = localStorage.getItem('currentUser') || 'son';
window.currentUserName = localStorage.getItem('currentUserName') || '민수';
window.currentChild = localStorage.getItem('currentChild') || (window.currentProfile === 'daughter' ? 'minseo' : 'minsu');
window.currentTheme = localStorage.getItem('currentTheme') || (window.currentProfile === 'daughter' ? '슬라임' : '마인크래프트');
window.savedName = localStorage.getItem('currentUserName');
window.isAdmin = (window.savedName === '아빠' || window.savedName === '엄마');

// 🏰 코어 및 테마 준비
document.addEventListener("DOMContentLoaded", () => {
    // 💡 [경로 무결성 자동 계산] 어떤 HTML(루트, 1단계, 2단계 하위)에서 호출되더라도
    // 현재 core.js 스크립트가 위치한 실제 디렉토리를 찾아내어 정확한 경로로 부품을 조립합니다.
    let corePath = "../../core/";
    try {
        const coreScript = document.querySelector('script[src*="core.js"]');
        if (coreScript && coreScript.src) {
            const cleanUrl = coreScript.src.split('?')[0];
            corePath = cleanUrl.substring(0, cleanUrl.lastIndexOf('/') + 1);
        } else {
            const path = window.location.pathname;
            if (path.includes('/subjects/') || path.includes('/playground/')) {
                corePath = "../../core/";
            } else if (path.includes('/common_space/') || path.includes('/kids/')) {
                corePath = "../core/";
            } else {
                corePath = "kids/core/";
            }
        }
    } catch (e) {
        corePath = "../../core/";
    }
    
    // 💡 모든 로비 복귀 링크에 현재 활성 자녀 파라미터 자동 동기화
    const syncLobbyReturnLinks = () => {
        const activeChild = window.currentChild || (window.currentProfile === 'daughter' ? 'minseo' : 'minsu');
        document.querySelectorAll('a[href*="lobby.html"]').forEach(link => {
            try {
                const href = link.getAttribute('href');
                if (href && !href.includes('user=')) {
                    const [base, hash] = href.split('#');
                    const separator = base.includes('?') ? '&' : '?';
                    link.setAttribute('href', `${base}${separator}user=${activeChild}${hash ? '#' + hash : ''}`);
                }
            } catch (e) {}
        });
    };
    syncLobbyReturnLinks();

    const initRoom = () => {
        const initFuncs = ['initializeRoom', 'initializeSocietyRoom', 'initializeKoreanRoom', 'initializeScienceRoom', 'initializeEnglishRoom', 'initializeMathRoom'];
        for (const funcName of initFuncs) {
            if (typeof window[funcName] === 'function') {
                window[funcName]();
                return;
            }
        }
    };

    if (typeof loadCoreScripts === 'function') {
        loadCoreScripts(corePath, requiredCores, () => {
            console.log("🧚 [학습방 공통 코어 결합 완료] 코코 요정 탑재!");
            if (typeof initRuntimeGeminiKey === 'function') initRuntimeGeminiKey();
            initRoom();
        });
    } else {
        console.warn("⚠️ loadCoreScripts 로드 실패, 비동기 폴백 직접 실행");
        if (typeof initRuntimeGeminiKey === 'function') initRuntimeGeminiKey();
        initRoom();
    }
});

/**
 * 🔑 런타임 Gemini API 키 안전 수령 엔진 (시크릿 디스펜서 패턴)
 * 깃허브 공개 코드에 키를 노출하지 않고, 브라우저가 실행될 때 워커의 비공개 Secret에서 메모리(RAM)로만 키를 내려받습니다.
 */
async function initRuntimeGeminiKey() {
    if (window.__RUNTIME_GEMINI_KEY) return window.__RUNTIME_GEMINI_KEY;
    try {
        const proxyUrl = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.WORKER_PROXY_URL) ? APP_CONFIG.WORKER_PROXY_URL : "https://minmin-notion.awslike6.workers.dev";
        const res = await fetch(`${proxyUrl}/api/gemini-key`);
        if (res.ok) {
            const data = await res.json();
            if (data && data.key) {
                window.__RUNTIME_GEMINI_KEY = data.key;
                if (typeof APP_CONFIG !== 'undefined') {
                    APP_CONFIG.GEMINI_API_KEY = data.key;
                }
                console.log("🔑 [Gemini 런타임 보안 키 활성화] 한국 로컬 통신 준비 완료!");
                return data.key;
            }
        }
    } catch (e) {
        console.warn("[RuntimeKey] 워커에서 런타임 키 수령 우회:", e);
    }
    return null;
}
window.initRuntimeGeminiKey = initRuntimeGeminiKey;

// toggleFairyTtsSetting / updateTtsToggleUi → fairy-engine.js

/**
 * ⏳ 로딩 스피너 전송 헬퍼 함수
 */
function showLoadingSpinner(container) {
    if (!container) return;
    container.innerHTML = `
      <div class="spinner-wrapper">
        <div class="spinner-circle"></div>
        <p style="font-family:'Gaegu', cursive; font-size:1.3rem; font-weight:bold; color:inherit; text-align:center; opacity: 0.95;">
           🧚‍♀️ 코코 요정이 노션 등대에서 자료를 가방에 챙겨오고 있어요...
        </p>
      </div>
    `;
}

/**
 * 한글 초성을 자동으로 자르는 초강력 헬퍼함수
 */
function getChosung(str) {
    if (!str) return "";
    const cho = ["ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ","ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];
    let result = "";
    for(let i=0; i<str.length; i++) {
        const code = str.charCodeAt(i) - 44032;
        if(code > -1 && code < 11172) {
            result += cho[Math.floor(code / 588)];
        } else {
            result += str.charAt(i);
        }
    }
    return result;
}

/**
 * 보상 지급 연동 브릿지 공용 헬퍼
 */
async function triggerAwardDispense(amount) {
    const isAdminUser = window.isAdmin || (localStorage.getItem('currentUserName') === '아빠' || localStorage.getItem('currentUserName') === '엄마');
    if (isAdminUser) {
        console.log("🛠️ 아버님/어머님 검수 중이므로 노션 실제 크레딧 지급을 프리패스합니다.");
        return true;
    }

    try {
        if (typeof grantRewardAndShowUI === 'function') {
            await grantRewardAndShowUI(amount, true); // 조용한 노티 전송 및 데이터 업데이트
        }
    } catch(err) {
        console.warn("보상 지급 중 로컬 백엔드 연동 모듈 우회:", err);
    }
}

/**
 * 🧭 화면 및 URL 기반 지능형 교과목 감지 엔진
 * window.currentSubject가 정의되어 있으면 우선 채택하고,
 * 누락된 경우 URL 경로를 분석하여 과목명을 자동 추론합니다.
 * 로비, 놀이터, 마이룸 등 비교과 공간은 null을 반환합니다.
 */
function detectSubjectFromContext() {
    if (window.currentSubject && window.currentSubject !== "미상 과목") {
        return window.currentSubject;
    }

    const path = (window.location.pathname || "").toLowerCase().replace(/\\/g, '/');
    const href = (window.location.href || "").toLowerCase().replace(/\\/g, '/');
    const targetUrl = path || href;

    // 1. 비학습/놀이터/생활 공간은 과목 없음(null)으로 명확히 배제
    if (
        targetUrl.includes('lobby.html') ||
        targetUrl.includes('/playground/') ||
        targetUrl.includes('my-room.html') ||
        targetUrl.includes('gallery.html') ||
        targetUrl.includes('timetable.html') ||
        targetUrl.includes('parent_') ||
        targetUrl.includes('admin')
    ) {
        return null;
    }

    // 2. 교과목 경로 기반 자동 매핑
    if (targetUrl.includes('/subjects/math/') || targetUrl.includes('math_') || targetUrl.includes('/math/')) {
        return "수학";
    }
    if (targetUrl.includes('/subjects/korean/') || targetUrl.includes('/korean/')) {
        return "국어";
    }
    if (targetUrl.includes('/subjects/english/') || targetUrl.includes('/english/')) {
        return "영어";
    }
    if (targetUrl.includes('/subjects/science/') || targetUrl.includes('/science/')) {
        return "과학";
    }
    if (targetUrl.includes('/subjects/society/') || targetUrl.includes('/society/')) {
        return "사회";
    }
    if (targetUrl.includes('/common_space/voca')) {
        return "용어사전";
    }

    return null;
}
window.detectSubjectFromContext = detectSubjectFromContext;

/**
 * 퇴장 시 일지 작성 자동 안전 배선 (동적 과목명 적용 및 비학습 화면 차단)
 */
window.addEventListener("beforeunload", () => {
    const isAdminUser = window.isAdmin || (localStorage.getItem('currentUserName') === '아빠' || localStorage.getItem('currentUserName') === '엄마');
    if (isAdminUser) return;

    // 💡 이미 세션 학습일지가 발행되었거나 퀴즈 세션이 완료된 경우 중복 발행 원천 차단
    if (window.__isStudyLogSentInSession || window.isCurrentEnglishMissionLogged || (window.__quizRewardSession && window.__quizRewardSession.isLogged)) {
        console.log("🛡️ [core.js 이탈 방어막] 이미 학습일지가 발행되었으므로 중복 전송을 차단합니다.");
        return;
    }

    // 💡 퀴즈 세션이 활성화되어 아직 미발행된 경우 notion-reward.js 플러시에 위임
    if (window.__quizRewardSession) {
        return;
    }

    if (typeof sendStudyLogToNotion === 'function') {
        const subjectName = detectSubjectFromContext();
        // 🚨 유효한 교과목이 아니거나 비학습 공간(null)이면 노션 학습일지 전송 완전 차단
        if (!subjectName || subjectName === "미상 과목") {
            return;
        }

        const profile = localStorage.getItem('currentUser') || 'son';
        const userName = profile === 'son' ? '민수' : '민서';
        sendStudyLogToNotion({
            childName: userName,
            subject: subjectName
        });
    }
});
