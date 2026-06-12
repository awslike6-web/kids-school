// kids/korean_common.js
// 🔗 국어 멀티버스 공용 관제탑 엔진 (학습일지 + 보상 시스템 통합 버전)

const WORKER_PROXY_URL = "https://minmin-notion.awslike6.workers.dev";
const INVENTORY_DB_ID = "374a27115b688042bb61e6a102242e12"; // 아빠의 인벤토리 DB

let currentProfile = localStorage.getItem('currentUser') || 'son';
let currentUserName = localStorage.getItem('currentUserName') || '민수';
let currentTheme = localStorage.getItem('currentTheme') || '마인크래프트';

// ⏱️ 입장 타이머 작동
const roomStartTime = new Date();

// 🛠️ [수정됨] 독해방과 관제탑이 하나의 공용 오답 가방을 쓰도록 통합!
window.wrongNotes = window.wrongNotes || []; 
let isExiting = false; 

// 🎨 테마 및 프로필 자동 초기화
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
        currentProfile = 'daughter'; currentUserName = '민서'; currentTheme = '슬라임';
    } else {
        currentProfile = 'son'; currentUserName = '민수'; currentTheme = '마인크래프트';
    }
    localStorage.setItem('currentUser', currentProfile);
    localStorage.setItem('currentUserName', currentUserName);
    localStorage.setItem('currentTheme', currentTheme);
    location.reload();
}

// 📈 다이내믹 레벨업 계산 엔진
function calculateLevelInfo(totalRewards) {
    let level = 1;
    let requiredForNext = 20; 
    let accumulatedForCurrentLevel = 0; 

    while (totalRewards >= accumulatedForCurrentLevel + requiredForNext) {
        accumulatedForCurrentLevel += requiredForNext;
        level++;
        requiredForNext = 20 + (level - 1) * 5; 
    }
    let currentLevelProgress = totalRewards - accumulatedForCurrentLevel; 
    let remainingForNext = requiredForNext - currentLevelProgress; 
    return { level, requiredForNext, remainingForNext, currentLevelProgress };
}

// 🎁 노션 인벤토리 보상 전송 로직
async function grantRewardAndShowUI(earnedPoints) {
    const userName = currentProfile === 'son' ? '민수' : '민서'; 
    if (userName === '아빠' || userName === '엄마' || userName === '어른') return true;

    showRewardModal(`⏳ 우주선 통신 중...<br>학습 일지를 기록하고 보상을 싣고 있습니다!`);

    try {
        const response = await fetch(`${WORKER_PROXY_URL}/v1/databases/${INVENTORY_DB_ID}/query`, { 
            method: "POST", headers: { "Content-Type": "application/json" }, 
            body: JSON.stringify({ filter: { property: "이름", title: { equals: userName } } }) 
        });
        
        const data = await response.json(); 
        if (!data.results || data.results.length === 0) throw new Error("인벤토리 없음");
        
        const page = data.results[0]; 
        const props = page.properties;

        let diamond = props["다이아몬드 개수"]?.number || 0; 
        let slime = props["슬라임 파츠 개수"]?.number || 0;
        let tickets = props["소원권 개수"]?.number || 0;
        let koreanExp = props["국어 경험치"]?.number || 0; 
        
        let previousWealth = currentTheme === '마인크래프트' ? diamond : slime;
        let currentWealth = previousWealth + earnedPoints;
        let rewardName = currentTheme === '마인크래프트' ? '💎 다이아몬드' : '💧 슬라임 파츠';

        let newKoreanExp = koreanExp + earnedPoints; 
        const prevLevelInfo = calculateLevelInfo(koreanExp);
        const currLevelInfo = calculateLevelInfo(newKoreanExp);
        let isLevelUp = currLevelInfo.level > prevLevelInfo.level;

        let earnedTickets = Math.floor(currentWealth / 150) - Math.floor(previousWealth / 150);
        let newTickets = tickets + earnedTickets;

        let updateProps = {
            "국어 레벨": { number: currLevelInfo.level },
            "국어 경험치": { number: newKoreanExp }, 
            "소원권 개수": { number: newTickets }
        };
        if (currentTheme === '마인크래프트') updateProps["다이아몬드 개수"] = { number: currentWealth }; 
        else updateProps["슬라임 파츠 개수"] = { number: currentWealth };

        await fetch(`${WORKER_PROXY_URL}/v1/pages/${page.id}`, { 
            method: "PATCH", headers: { "Content-Type": "application/json" }, 
            body: JSON.stringify({ properties: updateProps }) 
        });
        
        // 🛠️ [수정됨] 허브가 아닌 대형 로비(../lobby.html)로 탈출하도록 버튼 경로 수정!
        updateRewardModal(`
            <b style="color:#0288D1; font-size: 1.5rem;">${rewardName} ${earnedPoints}개 획득!</b><br><br>
            현재 총 자산: <b>${currentWealth}</b>개<br>
            <span style="font-size:0.9rem; color:#666;">다음 국어 레벨(Lv.${currLevelInfo.level + 1})까지 경험치 ${currLevelInfo.remainingForNext} 필요!</span>
            ${isLevelUp ? `<br><br><span style="font-size:1.3rem; color:#FF6B9D; font-weight:bold;">🎉 국어 레벨 업! Lv.${currLevelInfo.level} 🎉</span>` : ''}
            ${earnedTickets > 0 ? `<br><br><span style="font-size:1.2rem; color:#FFD700; font-weight:bold;">🎫 소원권 ${earnedTickets}장 추가 획득!!</span>` : ''}
            <br><br>
            <button onclick="location.href='../lobby.html'" style="padding: 10px 20px; font-size: 1.1rem; border: none; border-radius: 8px; background-color: var(--primary); color: white; cursor: pointer; font-weight: bold;">대형 로비로 돌아가기</button>
        `);
        return true;

        } catch (err) {
        console.error("보상 시스템 오류:", err);
        updateRewardModal(`❌ 보상 저장 실패. 아빠에게 알려주세요!<br><br><button onclick="location.href='../lobby.html'">그냥 나가기</button>`);
        return false;
    }
}

// 🚀 [마스터 퇴근 함수] 학습일지 + 보상 동시 처리
async function exitRoom(subjectName) {
    if (isExiting) return;
    isExiting = true;

    const roomEndTime = new Date();
    const timeDiff = roomEndTime - roomStartTime;
    let calculatedMinutes = Math.floor(timeDiff / 60000);
    if (calculatedMinutes < 1) calculatedMinutes = 1; 

    // 🛠️ [수정됨] 공용 오답 가방(window.wrongNotes)에서 오답을 꺼내오도록 변경!
    const targetNotes = window.wrongNotes || [];
    const errorReport = targetNotes.length > 0 ? targetNotes.join(', ') : "오답 없음";
    console.log(`📡 학습일지 출고 준비 ➔ 과목: ${subjectName} | 소요시간: ${calculatedMinutes}분`);

    if (typeof sendStudyLogToNotion === 'function') {
        await sendStudyLogToNotion({
            childName: currentProfile === 'son' ? '민수' : '민서',
            subject: subjectName, 
            startTime: roomStartTime.toISOString(),
            endTime: roomEndTime.toISOString(),
            durationMinutes: calculatedMinutes,
            errorReport: errorReport,
            wordFairyCount: 0
        });
    }

    await grantRewardAndShowUI(30); 
}

// --- 임시 UI 모달 ---
function showRewardModal(message) {
    const modalHtml = `
        <div id="korean-reward-modal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); display:flex; justify-content:center; align-items:center; z-index:9999;">
            <div id="korean-reward-content" style="background:white; padding:30px; border-radius:15px; text-align:center; box-shadow: 0 10px 25px rgba(0,0,0,0.2); max-width: 400px; width: 80%; line-height: 1.5; color: #333;">
                ${message}
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function updateRewardModal(message) {
    const content = document.getElementById('korean-reward-content');
    if (content) content.innerHTML = message;
}

window.addEventListener('DOMContentLoaded', initKoreanTheme);
