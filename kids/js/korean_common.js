// kids/js/korean_common.js
// 🔗 국어 멀티버스 공용 관제탑 엔진 V8 (문장방 단계별 밸런싱 패치 및 전역 코어 연동 탑재)

// const INVENTORY_DB_ID = "374a27115b688042bb61e6a102242e12"; 
const MAX_DAILY_REWARD = 100; // 🛑 하루 최대 획득 가능한 총 다이아/파츠 개수

// 🚀 코어 관제탑(window)이 세탁해 둔 글로벌 상태를 그대로 이어받습니다!
window.currentSubject = "국어"; // 전역 과목명 명시 (보상 및 학습일지 타겟용)
let currentProfile = window.currentProfile || 'son';
let currentUserName = window.currentUserName || '민수';
let currentTheme = window.currentTheme || '마인크래프트';

const roomStartTime = new Date();
window.wrongNotes = window.wrongNotes || []; 
let isExiting = false; 

let learningSession = {
    studentName: currentProfile === 'son' ? '민수' : '민서',
    roomName: "국어 정밀독해방",
    startTime: new Date().toISOString(),
    endTime: null,
    problemDetails: [], 
    fairyClickCount: 0
};

function startLearning(roomName) {
    console.log(`🚀 [클린 관제탑] 학습 시작 승인: ${roomName}`);
    if (learningSession) {
        learningSession.roomName = roomName;
        learningSession.startTime = new Date().toISOString();
    }
}

function initKoreanTheme() {
    const themeClass = (currentTheme === '슬라임') ? 'theme--slime' : 'theme--minecraft';
    if(document.body) document.body.className = themeClass;
    
    const badge = document.getElementById('currentUserBadge');
    if (badge) {
        const userName = (currentProfile === 'son') ? '민수' : '민서';
        badge.innerHTML = `현재 사용자: ${currentProfile === 'son' ? '👦' : '👧'} ${userName} (${currentTheme} mode)`;
    }
}

function toggleProfileManually() {
    if (currentProfile === 'son') {
        currentProfile = 'daughter'; currentUserName = '민서'; currentTheme = '슬라임';
    } else {
        currentProfile = 'son'; currentUserName = '민수'; currentTheme = '마인크래프트';
    }
    // 💡 수동 전환 시에는 강제로 로컬스토리지 업데이트 (부모 우회 모드 중에도 변경 가능하도록)
    localStorage.setItem('currentUser', currentProfile);
    localStorage.setItem('currentUserName', currentUserName);
    localStorage.setItem('currentTheme', currentTheme);
    location.reload();
}

async function exitRoom(subjectName) {
    if (isExiting) return;
    isExiting = true;

    try {
        if (typeof sendStudyLogToNotion === 'function') {
            // 인자를 넘기지 않아도 notion-helper.js에서 자동 수집합니다.
            await sendStudyLogToNotion({ subject: subjectName });
        }
    } catch(e) {
        console.error("학습일지 기록 중 일시적 오류:", e);
    }

    if (typeof grantRewardAndShowUI === 'function') {
        await grantRewardAndShowUI(30, true); 
    }
}

window.addEventListener('DOMContentLoaded', initKoreanTheme);
