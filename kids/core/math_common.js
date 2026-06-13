// ==========================================
// 🌟 민민이네 수학방 공통 시스템 V2 (math_common.js)
// 📈 경험치/재화 독립 분리 버전 적용 완료!
// ==========================================

// 1️⃣ 노션 API 설정
const INVENTORY_DB_ID = "374a27115b688042bb61e6a102242e12"; 

// 2️⃣ 사용자 프로필 & 테마 관리
let currentProfile = localStorage.getItem('currentUser') || 'son'; 
let currentTheme = localStorage.getItem('currentTheme') || '마인크래프트';

function toggleProfileManually() {
  if (currentProfile === 'son') { currentProfile = 'daughter'; currentTheme = '슬라임'; } 
  else { currentProfile = 'son'; currentTheme = '마인크래프트'; }
  localStorage.setItem('currentUser', currentProfile); 
  localStorage.setItem('currentTheme', currentTheme);
  
  const themeClass = currentTheme === '슬라임' ? 'theme--slime' : 'theme--minecraft';
  document.body.className = themeClass;
  
  const badge = document.getElementById('currentUserBadge') || document.getElementById('profileBadge');
  if (badge) {
    const userName = currentProfile === 'son' ? '민수' : '민서';
    const icon = currentProfile === 'son' ? '👦' : '👧';
    badge.innerHTML = `${icon} ${userName} (${currentTheme} 모드)`;
  }
}

// 3️⃣ 다이내믹 레벨업 계산 엔진
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

// 4️⃣ 🎁 노션 보상 전송 로직 (수학 경험치 기반 독립 개조)
async function saveRewardToNotion(earned, detailElementId = 'r-detail') {
  const userName = currentProfile === 'son' ? '민수' : '민서'; 
  if (userName === '아빠' || userName === '엄마' || userName === '어른') return;
  
  const detailEl = document.getElementById(detailElementId); 
  if(!detailEl) return;
  
  const originalText = detailEl.innerHTML;
  detailEl.innerHTML = originalText + `<br><br><span id="notion-loading-msg" style="color:#6EC6F5; font-weight:bold;">⏳ 우주선 통신 중... (보상 ${earned}개 적립)</span>`;

  try {
    const response = await fetch(`${PROXY_URL}/v1/databases/${INVENTORY_DB_ID}/query`, { 
      method: "POST", headers: { "Content-Type": "application/json" }, 
      body: JSON.stringify({ filter: { property: "이름", title: { equals: userName } } }) 
    });
    
    const data = await response.json(); 
    if (!data.results || data.results.length === 0) throw new Error("인벤토리 없음");
    
    const page = data.results[0]; 
    const props = page.properties;

    // 노션에서 자산과 '수학 경험치' 가져오기
    let diamond = props["다이아몬드 개수"]?.number || 0; 
    let slime = props["슬라임 파츠 개수"]?.number || 0;
    let tickets = props["소원권 개수"]?.number || 0;
    let mathExp = props["수학 경험치"]?.number || 0; // 👈 새로 매칭된 수학 경험치 기둥!
    
    let previousWealth = currentTheme === '마인크래프트' ? diamond : slime;
    let currentWealth = previousWealth + earned;
    let rewardName = currentTheme === '마인크래프트' ? '💎 다이아몬드' : '💧 슬라임 파츠';

    // 📈 [핵심] 레벨 계산 기준을 총 자산에서 '수학 경험치'로 전격 교체!
    let newMathExp = mathExp + earned; 
    const prevLevelInfo = calculateLevelInfo(mathExp);
    const currLevelInfo = calculateLevelInfo(newMathExp);
    let isLevelUp = currLevelInfo.level > prevLevelInfo.level;

    // 소원권 계산 (공용 자산 늘어난 기준)
    let earnedTickets = Math.floor(currentWealth / 150) - Math.floor(previousWealth / 150);
    let newTickets = tickets + earnedTickets;
    let isWishTicketEarned = earnedTickets > 0;

    // 노션 보따리 싸기
    let updateProps = {
      "수학 레벨": { number: currLevelInfo.level },
      "수학 경험치": { number: newMathExp }, // 👈 수학 경험치 누적 저장!
      "소원권 개수": { number: newTickets }
    };
    if (currentTheme === '마인크래프트') updateProps["다이아몬드 개수"] = { number: currentWealth }; 
    else updateProps["슬라임 파츠 개수"] = { number: currentWealth };

    // 노션으로 업데이트 발사!
    await fetch(`${PROXY_URL}/v1/pages/${page.id}`, { 
      method: "PATCH", headers: { "Content-Type": "application/json" }, 
      body: JSON.stringify({ properties: updateProps }) 
    });
    
    document.getElementById('notion-loading-msg').style.display = 'none';
    
    // UI 출력 (다음 수학 레벨까지 남은 경험치 표시)
    detailEl.innerHTML = originalText + `
      <div style="background:rgba(255,255,255,0.8); border:2px dashed var(--sky); padding:16px; border-radius:12px; margin-top:10px; text-align: left;">
        <div style="font-size: 1.15rem; margin-bottom: 8px;">
          <b style="color:#0288D1;">${rewardName} x ${earned} 획득! (총 ${currentWealth}개)</b>
        </div>
        <div style="font-size: 0.95rem; color: #666; margin-bottom: 6px;">
          다음 수학 레벨(Lv.${currLevelInfo.level + 1})까지 경험치 <b>${currLevelInfo.remainingForNext}</b> 필요!
        </div>
        ${isLevelUp ? `<div style="text-align:center; font-size:1.3rem; color:#FF6B9D; font-weight:bold; margin-top:10px;">🎉 수학 레벨 업! Lv.${currLevelInfo.level} 🎉</div>` : ''}
      </div>
    `;

    if (isWishTicketEarned) {
      setTimeout(() => {
        const ticketDisplay = document.getElementById('wishTicketCountDisplay');
        if(ticketDisplay) ticketDisplay.textContent = newTickets;
        const overlay = document.getElementById('wishTicketOverlay');
        if(overlay) {
            overlay.classList.add('active'); 
            overlay.style.display = 'flex';  
        }
      }, 1000);
    }
  } catch (err) {
    console.error("수학 보상 저장 오류:", err);
    const errorMsg = document.getElementById('notion-loading-msg');
    if(errorMsg) errorMsg.textContent = `❌ 보상 저장 실패`;
  }
}

function closeWishTicket() {
  const overlay = document.getElementById('wishTicketOverlay');
  if(overlay) {
      overlay.classList.remove('active');
      overlay.style.display = 'none';
  }
}

// 5️⃣ 학습 데이터 분석 트래커 그릇 준비
let learningSession = {
  studentName: "",
  roomName: "",
  startTime: null,
  endTime: null,
  problemDetails: [], 
  fairyClickCount: 0
};

function startLearning(roomName) {
  learningSession.studentName = currentProfile === 'son' ? '민수' : '민서';
  learningSession.roomName = roomName;
  learningSession.startTime = new Date().toISOString();
  learningSession.problemDetails = [];
  learningSession.fairyClickCount = 0;
}
