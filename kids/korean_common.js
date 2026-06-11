// kids/korean_common.js
// 🔗 국어 멀티버스 공용 관제탑 엔진 (수학커먼 벤치마킹)

let currentProfile = localStorage.getItem('currentUser') || 'son';
let currentUserName = localStorage.getItem('currentUserName') || '민수';
let currentTheme = localStorage.getItem('currentTheme') || '마인크래프트';

// ⏱️ 입장 타이머 작동 (방에 발을 디딘 순간 기록)
const roomStartTime = new Date();
let wrongNotes = []; // 오답 기록을 모을 가방
let isExiting = false; // 중복 전송 방지 자물쇠

// 🎨 테마 및 프로필 자동 초기화 함수
function initKoreanTheme() {
    const themeClass = (currentTheme === '슬라임') ? 'theme--slime' : 'theme--minecraft';
    document.body.className = themeClass;
    
    const badge = document.getElementById('currentUserBadge');
    if (badge) {
        const userName = (currentProfile === 'son') ? '민수' : '민서';
        badge.innerHTML = `현재 사용자: ${currentProfile === 'son' ? '👦' : '👧'} ${userName} (${currentTheme} 모드)`;
    }
}

// 🔄 프로필 수동 전환 기능
function toggleProfileManually() {
    if (currentProfile === 'son') {
        currentProfile = 'daughter';
        currentUserName = '민서';
        currentTheme = '슬라임';
    } else {
        currentProfile = 'son';
        currentUserName = '민수';
        currentTheme = '마인크래프트';
    }
    localStorage.setItem('currentUser', currentProfile);
    localStorage.setItem('currentUserName', currentUserName);
    localStorage.setItem('currentTheme', currentTheme);
    location.reload();
}

// 🚀 [마스터 퇴근 함수] 노션 학습일지 DB로 데이터 전송 후 빠져나가기
async function exitRoom(subjectName) {
    if (isExiting) return;
    isExiting = true;

    const roomEndTime = new Date();
    const timeDiff = roomEndTime - roomStartTime;
    let calculatedMinutes = Math.floor(timeDiff / 60000);
    if (calculatedMinutes < 1) calculatedMinutes = 1; // 최소 1분 보장

    // 오답 기록 가공 (배열이 있으면 콤마로 합치고, 없으면 기본 메시지)
    const errorReport = wrongNotes.length > 0 ? wrongNotes.join(', ') : "오답 없음";

    console.log(`📡 관제탑 일지 출고 완료 ➔ 과목: ${subjectName} | 소요시간: ${calculatedMinutes}분`);

    // notion-helper.js의 공통 발사대 호출
    const success = await sendStudyLogToNotion({
        childName: currentProfile === 'son' ? '민수' : '민서',
        subject: subjectName, // "국어(문장)" 또는 "국어(빈칸퀴즈)" 등 파라미터 자동 바인딩
        startTime: roomStartTime.toISOString(),
        endTime: roomEndTime.toISOString(),
        durationMinutes: calculatedMinutes,
        errorReport: errorReport,
        wordFairyCount: 0
    });

    if (success) {
        // 퇴근 성공 시 국어 허브(중문) 화면으로 안전하게 리다이렉트
        location.href = 'korean.html';
    } else {
        alert("앗! 노션 학습 일지 기록에 문제가 발생하여 허브로 이동하지 못했습니다. 아빠에게 삐삐 쳐주세요!");
        isExiting = false; // 실패 시 자물쇠 풀기
    }
}

// 🚨 블랙박스 로직: 아이들이 창을 그냥 꺼버려도 강제 기록
window.addEventListener('pagehide', () => {
    // 퀴즈방의 이름을 자동 판별하여 기록 (현재 열린 타이틀이나 전역변수 활용 가능)
    const currentSubject = window.KOREAN_SUBJECT_TITLE || "국어(학습)";
    exitRoom(currentSubject);
});

// 페이지 로드 시 테마 가동
window.addEventListener('DOMContentLoaded', initKoreanTheme);