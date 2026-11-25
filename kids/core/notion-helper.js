// ==============================================================================
// 🏰 [Notion Helper Facade] 노션 통합 대문 파사드 엔진 (notion-helper.js)
// - 역할: 6대 전문 서브모듈 자동 로드 및 기존 전역 API 100% 하위 호환성 브리지
// - 골디락스 응집도: 1,551줄 ➔ ~280줄 초경량 대문 파사드로 다이어트 완료
// ==============================================================================

// ----------------------------------------------------
// 0. 전사 공통 환경 변수 및 DB ID (SSOT)
// ----------------------------------------------------
var PROXY_URL = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.WORKER_PROXY_URL) ? APP_CONFIG.WORKER_PROXY_URL : "https://minmin-notion.awslike6.workers.dev";
var STUDY_LOG_DB_ID = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.STUDY_LOG_DB_ID) ? APP_CONFIG.STUDY_LOG_DB_ID : "37aa27115b688001b2ffe5e6c8f82ab2";
var INVENTORY_DB_ID = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.INVENTORY_DB_ID) ? APP_CONFIG.INVENTORY_DB_ID : "374a27115b688042bb61e6a102242e12";
var VOCA_DB_ID = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.VOCA_DB_ID) ? APP_CONFIG.VOCA_DB_ID : "375a27115b688038b686d3994ee12919";
var NOTION_CHAT_MEMORY_DB_ID = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.NOTION_CHAT_MEMORY_DB_ID) ? APP_CONFIG.NOTION_CHAT_MEMORY_DB_ID : "373a27115b6880ba82cdfeaa1c825547";
var TIMETABLE_DB_ID = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.TIMETABLE_DB_ID) ? APP_CONFIG.TIMETABLE_DB_ID : "e3f9b3917c2b48bfa3d47db4bd0545fd";

// 🕒 전역 학습 시작 시간 자동 기록
window.roomStartTime = window.roomStartTime || new Date();

// ----------------------------------------------------
// 1. 6대 전문 서브모듈 자동 동적 로더 (Auto Module Loader)
// ----------------------------------------------------
(function _initNotionFacade() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const submodules = [
        'study-activity.js?v=c3dc3018', // foreground, idle, interval ledger
        'notion-cache-manager.js?v=dc0ca8ba', // ⚡ 캐시 & 프리패치 & syncAllNotionData
        'notion-api-client.js?v=b86a9650',      // 🌐 Worker 통신 & VOCA/독해/시간표 쿼리 및 파서
        'study-log-store.js?v=80cfe205', // 📒 학습일지 일일 Upsert & 연속 학습 스트릭 단일 원천
        'learning-log.js?v=5cf3ce8e', // 📒 문항 단위 학습 기록 (학습일지 행의 '문항기록' 칸)
        'timetable-boost.js?v=82713b6c', // 🚀 시간표 부스트(오늘 복습 1.2배·한도 150, 내일 예습 완주 +7) — 과목방에서도 적용 (2026-11-23)
        'today-path.js?v=a7dff240', // 🛤️ 오늘의 길 완료 장부 (과목방·독해 완료 신호, lobby.html과 같은 버전 문자열)
        'notion-study-logger.js?v=9ade0a15', // 📝 학습일지 & 보상/레벨업 전송 엔진
        'stt-debouncer.js?v=11e203dd',      // 🎙️ STT 음성인식 디바운서
        'mission-reward-engine.js?v=4329b9a2',  // 💎 미션 보상 및 축하 모달
        'quiz-feedback-overlay.js?v=37cb3099',  // 🛡️ 오답 피드백 오버레이 & 이탈 방지 가드
        'gemini-chat.js?v=afe4670a',        // 🧚 AI 요정 대화 (Worker 프록시 호출·재시도·안내 문구)
        'chat-memory.js?v=ffe980a6' // 🧠 AI 대화 기억 보관소 저장 (창 닫을 때 요약 1줄)
    ];

    let basePath = '';
    const scripts = document.getElementsByTagName('script');
    for (let i = scripts.length - 1; i >= 0; i--) {
        const src = scripts[i].src || '';
        if (src.includes('notion-helper.js')) {
            basePath = src.substring(0, src.lastIndexOf('/') + 1);
            break;
        }
    }

    if (basePath) {
        submodules.forEach(mod => {
            // 같은 파일이면 버전(내용 해시, scripts/stamp_versions.mjs)도 같으므로 쿼리는 빼고 「이 폴더의 그 파일」인지만 본다 —
            // 로비 코어 로더처럼 다른 버전 글자로 먼저 실린 경우에도 두 번 싣지 않게, 다른 폴더의 같은 이름 파일과는 구분 (2026-11-24)
            const target = basePath + mod.split('?')[0];
            const alreadyLoaded = Array.from(document.scripts).some(s => (s.src || '').split(/[?#]/)[0] === target);
            if (!alreadyLoaded) {
                const s = document.createElement('script');
                s.src = basePath + mod;
                s.async = false; // 실행 순서 보장
                document.head.appendChild(s);
            }
        });
    }
})();

// ----------------------------------------------------
// 2. 투명한 프록시 브리지 (서브모듈 지연 로딩 대응 Safe Wrapper)
// ----------------------------------------------------

// ⚡ VOCA 쿼리
async function fetchVocaFromNotion(options = {}) {
    if (window.NotionApiClient && typeof window.NotionApiClient.fetchVocaFromNotion === 'function') {
        return window.NotionApiClient.fetchVocaFromNotion(options);
    }
    // 서브모듈 로드 대기 (최대 1.5초)
    await _waitForModule('NotionApiClient');
    if (window.NotionApiClient?.fetchVocaFromNotion) {
        return window.NotionApiClient.fetchVocaFromNotion(options);
    }
    return [];
}

// ⚡ 백그라운드 프리패치
async function prefetchVocaData(studentName = null) {
    if (window.NotionCacheManager && typeof window.NotionCacheManager.prefetchVocaData === 'function') {
        return window.NotionCacheManager.prefetchVocaData(studentName);
    }
    await _waitForModule('NotionCacheManager');
    if (window.NotionCacheManager?.prefetchVocaData) {
        return window.NotionCacheManager.prefetchVocaData(studentName);
    }
}

async function prefetchReadingData(options = {}) {
    if (window.NotionCacheManager && typeof window.NotionCacheManager.prefetchReadingData === 'function') {
        return window.NotionCacheManager.prefetchReadingData(options);
    }
    await _waitForModule('NotionCacheManager');
    if (window.NotionCacheManager?.prefetchReadingData) {
        return window.NotionCacheManager.prefetchReadingData(options);
    }
}

// 🔄 전사 통합 마스터 동기화
async function syncAllNotionData(options = {}) {
    if (window.NotionCacheManager && typeof window.NotionCacheManager.syncAllNotionData === 'function') {
        return window.NotionCacheManager.syncAllNotionData(options);
    }
    await _waitForModule('NotionCacheManager');
    if (window.NotionCacheManager?.syncAllNotionData) {
        return window.NotionCacheManager.syncAllNotionData(options);
    }
}

// 🍞 동기화 토스트
function showNotionSyncToast(msg) {
    if (window.NotionCacheManager && typeof window.NotionCacheManager.showNotionSyncToast === 'function') {
        return window.NotionCacheManager.showNotionSyncToast(msg);
    }
}

// 📖 독해 및 도서관
async function fetchLibraryBooksFromNotion(options = {}) {
    if (window.NotionApiClient && typeof window.NotionApiClient.fetchLibraryBooksFromNotion === 'function') {
        return window.NotionApiClient.fetchLibraryBooksFromNotion(options);
    }
    await _waitForModule('NotionApiClient');
    return window.NotionApiClient?.fetchLibraryBooksFromNotion?.(options) || [];
}

async function fetchReadingPassagesFromNotion(options = {}) {
    if (window.NotionApiClient && typeof window.NotionApiClient.fetchReadingPassagesFromNotion === 'function') {
        return window.NotionApiClient.fetchReadingPassagesFromNotion(options);
    }
    await _waitForModule('NotionApiClient');
    return window.NotionApiClient?.fetchReadingPassagesFromNotion?.(options) || [];
}

// ⏰ 시간표
async function fetchTimetableFromNotion(options = {}) {
    if (window.NotionApiClient && typeof window.NotionApiClient.fetchTimetableFromNotion === 'function') {
        return window.NotionApiClient.fetchTimetableFromNotion(options);
    }
    await _waitForModule('NotionApiClient');
    return window.NotionApiClient?.fetchTimetableFromNotion?.(options) || [];
}

async function fetchDualTimetableFromNotion() {
    if (window.NotionApiClient && typeof window.NotionApiClient.fetchDualTimetableFromNotion === 'function') {
        return window.NotionApiClient.fetchDualTimetableFromNotion();
    }
    await _waitForModule('NotionApiClient');
    return window.NotionApiClient?.fetchDualTimetableFromNotion?.() || { staticRows: [], overlayRows: [], allRows: [] };
}

async function updateTimetableItemComplete(pageId, isCompleted) {
    if (window.NotionApiClient && typeof window.NotionApiClient.updateTimetableItemComplete === 'function') {
        return window.NotionApiClient.updateTimetableItemComplete(pageId, isCompleted);
    }
    await _waitForModule('NotionApiClient');
    return window.NotionApiClient?.updateTimetableItemComplete?.(pageId, isCompleted) || false;
}

// 📝 학습일지 & 보상
async function sendStudyLogToNotion(options = {}) {
    if (window.NotionStudyLogger && typeof window.NotionStudyLogger.sendStudyLogToNotion === 'function') {
        return window.NotionStudyLogger.sendStudyLogToNotion(options);
    }
    await _waitForModule('NotionStudyLogger');
    return window.NotionStudyLogger?.sendStudyLogToNotion?.(options) || false;
}

async function grantRewardAndShowUI(earned, isSilent = false, customExpType = null) {
    if (window.NotionStudyLogger && typeof window.NotionStudyLogger.grantRewardAndShowUI === 'function') {
        return window.NotionStudyLogger.grantRewardAndShowUI(earned, isSilent, customExpType);
    }
    await _waitForModule('NotionStudyLogger');
    return window.NotionStudyLogger?.grantRewardAndShowUI?.(earned, isSilent, customExpType) || false;
}

function calculateLevelInfo(totalRewards) {
    if (window.NotionStudyLogger && typeof window.NotionStudyLogger.calculateLevelInfo === 'function') {
        return window.NotionStudyLogger.calculateLevelInfo(totalRewards);
    }
    let level = 1; let requiredForNext = 20; let accumulatedForCurrentLevel = 0; 
    while (totalRewards >= accumulatedForCurrentLevel + requiredForNext) {
        accumulatedForCurrentLevel += requiredForNext; level++; requiredForNext = 20 + (level - 1) * 5; 
    }
    return { level, requiredForNext, remainingForNext: requiredForNext - (totalRewards - accumulatedForCurrentLevel), currentLevelProgress: totalRewards - accumulatedForCurrentLevel };
}

async function updateVocaMasteryStatus(pageId, isMastered) {
    if (window.NotionApiClient && typeof window.NotionApiClient.updateVocaMasteryStatus === 'function') {
        return window.NotionApiClient.updateVocaMasteryStatus(pageId, isMastered);
    }
    await _waitForModule('NotionApiClient');
    return window.NotionApiClient?.updateVocaMasteryStatus?.(pageId, isMastered) || false;
}

// 헬퍼: 서브모듈 비동기 로드 대기기
function _waitForModule(moduleName, maxTimeout = 1500) {
    return new Promise(resolve => {
        if (window[moduleName]) return resolve();
        const start = Date.now();
        const timer = setInterval(() => {
            if (window[moduleName] || (Date.now() - start > maxTimeout)) {
                clearInterval(timer);
                resolve();
            }
        }, 30);
    });
}

// ----------------------------------------------------
// 3. 전역 네임스페이스 및 하위 호환성 100% 바인딩
// ----------------------------------------------------
window.fetchVocaFromNotion = fetchVocaFromNotion;
window.prefetchVocaData = prefetchVocaData;
window.prefetchReadingData = prefetchReadingData;
window.syncAllNotionData = syncAllNotionData;
window.showNotionSyncToast = showNotionSyncToast;
window.fetchLibraryBooksFromNotion = fetchLibraryBooksFromNotion;
window.fetchReadingPassagesFromNotion = fetchReadingPassagesFromNotion;
window.fetchTimetableFromNotion = fetchTimetableFromNotion;
window.fetchDualTimetableFromNotion = fetchDualTimetableFromNotion;
window.updateTimetableItemComplete = updateTimetableItemComplete;
window.sendStudyLogToNotion = sendStudyLogToNotion;
window.grantRewardAndShowUI = grantRewardAndShowUI;
window.calculateLevelInfo = calculateLevelInfo;
window.updateVocaMasteryStatus = updateVocaMasteryStatus;
