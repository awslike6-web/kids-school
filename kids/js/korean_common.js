// kids/js/korean_common.js
// 🔗 국어 멀티버스 공용 관제탑 엔진 V8 (문장방 단계별 밸런싱 패치 및 전역 코어 연동 탑재)

const INVENTORY_DB_ID = "374a27115b688042bb61e6a102242e12"; 
const MAX_DAILY_REWARD = 100; // 🛑 하루 최대 획득 가능한 총 다이아/파츠 개수

// 🚀 코어 관제탑(window)이 세탁해 둔 글로벌 상태를 그대로 이어받습니다!
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

function calculateLevelInfo(totalRewards) {
    let level = 1; let requiredForNext = 20; let accumulatedForCurrentLevel = 0; 
    while (totalRewards >= accumulatedForCurrentLevel + requiredForNext) {
        accumulatedForCurrentLevel += requiredForNext; level++; requiredForNext = 20 + (level - 1) * 5; 
    }
    let currentLevelProgress = totalRewards - accumulatedForCurrentLevel; 
    let remainingForNext = requiredForNext - currentLevelProgress; 
    return { level, requiredForNext, remainingForNext, currentLevelProgress };
}

// 🎁 [엔진 업그레이드] 일일 보상 제한 + 단계별 보상 연동 로직
async function grantRewardAndShowUI(earnedPoints, isSilent = false) {
    const userName = currentProfile === 'son' ? '민수' : '민서'; 
    if (userName === '아빠' || userName === '엄마' || userName === '어른') return true;

    if (!isSilent) {
        showRewardModal(`⏳ 우주선 통신 중...<br>학습 일지를 기록하고 보상을 싣고 있습니다!`);
    }

    const targetProxy = typeof PROXY_URL !== 'undefined' ? PROXY_URL : "https://minmin-notion.awslike6.workers.dev";

    try {
        const response = await fetch(`${targetProxy}/v1/databases/${INVENTORY_DB_ID}/query`, { 
            method: "POST", headers: { "Content-Type": "application/json" }, 
            body: JSON.stringify({ filter: { property: "이름", title: { equals: userName } } }) 
        });
        
        const data = await response.json(); 
        if (!data.results || data.results.length === 0) throw new Error("인벤토리 없음");
        
        const page = data.results[0]; 
        const props = page.properties;

        const today = new Date();
        const todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');

        let lastDateObj = props["최근 접속일"]?.date?.start;
        let lastDate = lastDateObj ? lastDateObj.split('T')[0] : "";

        let todayKorean = props["오늘 획득_국어"]?.number || 0;
        let updateProps = {};

        if (lastDate !== todayStr) {
            todayKorean = 0;
            updateProps["오늘 획득_수학"] = { number: 0 };
            updateProps["오늘 획득_영어"] = { number: 0 };
            updateProps["오늘 획득_사회"] = { number: 0 };
            updateProps["오늘 획득_과학"] = { number: 0 };
        }

        let allowedCurrency = earnedPoints;
        let isLimitReached = false;

        if (todayKorean + earnedPoints > MAX_DAILY_REWARD) {
            allowedCurrency = Math.max(0, MAX_DAILY_REWARD - todayKorean);
            isLimitReached = true;
        }

        let newTodayKorean = todayKorean + allowedCurrency;

        let diamond = props["다이아몬드 개수"]?.number || 0; 
        let slime = props["슬라임 파츠 개수"]?.number || 0;
        let tickets = props["소원권 개수"]?.number || 0;
        let koreanExp = props["국어 경험치"]?.number || 0; 
        
        let previousWealth = currentTheme === '마인크래프트' ? diamond : slime;
        let currentWealth = previousWealth + allowedCurrency;
        let rewardName = currentTheme === '마인크래프트' ? '💎 다이아몬드' : '💧 슬라임 파츠';

        let newKoreanExp = koreanExp + earnedPoints; 
        const prevLevelInfo = calculateLevelInfo(koreanExp);
        const currLevelInfo = calculateLevelInfo(newKoreanExp);
        let isLevelUp = currLevelInfo.level > prevLevelInfo.level;

        let earnedTickets = Math.floor(currentWealth / 150) - Math.floor(previousWealth / 150);
        let newTickets = tickets + earnedTickets;

        updateProps["최근 접속일"] = { date: { start: todayStr } };
        updateProps["오늘 획득_국어"] = { number: newTodayKorean };
        updateProps["국어 레벨"] = { number: currLevelInfo.level };
        updateProps["국어 경험치"] = { number: newKoreanExp }; 
        updateProps["소원권 개수"] = { number: newTickets };
        
        if (currentTheme === '마인크래프트') updateProps["다이아몬드 개수"] = { number: currentWealth }; 
        else updateProps["슬라임 파츠 개수"] = { number: currentWealth };

        await fetch(`${targetProxy}/v1/pages/${page.id}`, { 
            method: "PATCH", headers: { "Content-Type": "application/json" }, 
            body: JSON.stringify({ properties: updateProps }) 
        });
        
        if (!isSilent) {
            let limitMessageHtml = "";
            if (isLimitReached) {
                if (allowedCurrency === 0) {
                    limitMessageHtml = `<div style="background: rgba(255,7,58,0.1); border: 2px solid #ff073a; padding: 10px; border-radius: 8px; color: #ff073a; font-weight: bold; margin-bottom: 15px;">⚠️ 오늘 국어 광산의 보상을 모두 캤습니다!<br><span style="font-size:0.9rem;">(내일 다시 오거나 다른 과목을 공부하세요!)</span></div>`;
                } else {
                    limitMessageHtml = `<div style="background: rgba(255,152,0,0.1); border: 2px solid #ff9800; padding: 10px; border-radius: 8px; color: #ff9800; font-weight: bold; margin-bottom: 15px;">⚠️ 일일 최대 보상(100개)에 도달했습니다!<br><span style="font-size:0.9rem;">(이번엔 ${allowedCurrency}개만 획득)</span></div>`;
                }
            }

            updateRewardModal(`
                ${limitMessageHtml}
                <b style="color:#0288D1; font-size: 1.5rem;">${rewardName} ${allowedCurrency}개 획득!</b> <span style="color:#8b949e; font-size:0.9rem;">(경험치 +${earnedPoints})</span><br><br>
                현재 총 자산: <b>${currentWealth}</b>개<br>
                <span style="font-size:0.9rem; color:#666;">다음 국어 레벨(Lv.${currLevelInfo.level + 1})까지 경험치 ${currLevelInfo.remainingForNext} 필요!</span>
                ${isLevelUp ? `<br><br><span style="font-size:1.3rem; color:#FF6B9D; font-weight:bold;">🎉 국어 레벨 업! Lv.${currLevelInfo.level} 🎉</span>` : ''}
                ${earnedTickets > 0 ? `<br><br><span style="font-size:1.2rem; color:#FFD700; font-weight:bold;">🎫 소원권 ${earnedTickets}장 추가 획득!!</span>` : ''}
                <br><br>
                <button onclick="location.href='../lobby.html'" style="padding: 10px 20px; font-size: 1.1rem; border: none; border-radius: 8px; background-color: #4CAF50; color: white; cursor: pointer; font-weight: bold;">대형 로비로 돌아가기</button>
            `);
        }
        return { allowedCurrency, currentWealth, currLevelInfo, isLevelUp };

    } catch (err) {
        console.error("보상 시스템 오류:", err);
        if (!isSilent) {
            updateRewardModal(`❌ 보상 저장 실패. 아빠에게 알려주세요!<br><br><button onclick="location.href='../lobby.html'">그냥 나가기</button>`);
        }
        return false;
    }
}

async function exitRoom(subjectName) {
    if (isExiting) return;
    isExiting = true;

    const roomEndTime = new Date();
    const timeDiff = roomEndTime - roomStartTime;
    let calculatedMinutes = Math.floor(timeDiff / 60000);
    if (calculatedMinutes < 1) calculatedMinutes = 1; 

    const targetNotes = window.wrongNotes || [];
    const errorReport = targetNotes.length > 0 ? targetNotes.join(', ') : "오답 없음";

    try {
        if (typeof sendStudyLogToNotion === 'function') {
            await sendStudyLogToNotion({
                childName: currentProfile === 'son' ? '민수' : '민서', subject: subjectName, 
                startTime: roomStartTime.toISOString(), endTime: roomEndTime.toISOString(),
                durationMinutes: calculatedMinutes, errorReport: errorReport, wordFairyCount: 0
            });
        }
    } catch(e) {
        console.error("학습일지 기록 중 일시적 오류:", e);
    }

    await grantRewardAndShowUI(30); 
}

function showRewardModal(message) {
    if(document.getElementById('korean-reward-modal')) return;
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
