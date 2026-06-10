// ==========================================
// 🌟 민민이네 수학방 공통 시스템 (math_common.js)
// ==========================================

// 1️⃣ 노션 API 설정

const INVENTORY_DB_ID = "374a27115b688042bb61e6a102242e12"; 
// (나중에 학습 데이터를 보낼 DB ID도 여기에 추가하면 됩니다)

// 2️⃣ 사용자 프로필 & 테마 관리
let currentProfile = localStorage.getItem('currentUser') || 'son'; 
let currentTheme = localStorage.getItem('currentTheme') || '마인크래프트';

function toggleProfileManually() {
  if (currentProfile === 'son') { currentProfile = 'daughter'; currentTheme = '슬라임'; } 
  else { currentProfile = 'son'; currentTheme = '마인크래프트'; }
  localStorage.setItem('currentUser', currentProfile); 
  localStorage.setItem('currentTheme', currentTheme);
  
  // 테마 강제 리로드 (수학방과 구구단방 클래스명 통일화 필요)
  const themeClass = currentTheme === '슬라임' ? 'theme--slime' : 'theme--minecraft';
  document.body.className = themeClass;
  
  // 뱃지 업데이트 
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

// 4️⃣ 노션 보상 전송 로직 (수학방, 구구단방 공통)
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

    let diamond = props["다이아몬드 개수"]?.number || 0; 
    let slime = props["슬라임 파츠 개수"]?.number || 0;
    let tickets = props["소원권 개수"]?.number || 0;
    
    let previousTotal = 0;
    let currentTotal = 0;
    let rewardName = currentTheme === '마인크래프트' ? '💎 다이아몬드' : '💧 슬라임 파츠';

    if (currentTheme === '마인크래프트') { previousTotal = diamond; currentTotal = diamond + earned; } 
    else { previousTotal = slime; currentTotal = slime + earned; }

    const prevLevelInfo = calculateLevelInfo(previousTotal);
    const currLevelInfo = calculateLevelInfo(currentTotal);
    let isLevelUp = currLevelInfo.level > prevLevelInfo.level;

    let earnedTickets = Math.floor(currentTotal / 150) - Math.floor(previousTotal / 150);
    let newTickets = tickets + earnedTickets;
    let isWishTicketEarned = earnedTickets > 0;

    let updateProps = {
      "수학 레벨": { number: currLevelInfo.level },
      "소원권 개수": { number: newTickets }
    };
    if (currentTheme === '마인크래프트') updateProps["다이아몬드 개수"] = { number: currentTotal }; 
    else updateProps["슬라임 파츠 개수"] = { number: currentTotal };

    await fetch(`${PROXY_URL}/v1/pages/${page.id}`, { 
      method: "PATCH", headers: { "Content-Type": "application/json" }, 
      body: JSON.stringify({ properties: updateProps }) 
    });
    
    document.getElementById('notion-loading-msg').style.display = 'none';
    
    detailEl.innerHTML = originalText + `
      <div style="background:rgba(255,255,255,0.8); border:2px dashed var(--sky); padding:16px; border-radius:12px; margin-top:10px; text-align: left;">
        <div style="font-size: 1.15rem; margin-bottom: 8px;">
          <b style="color:#0288D1;">${rewardName} x ${currentTotal}</b>
        </div>
        <div style="font-size: 0.95rem; color: #666; margin-bottom: 6px;">
          다음 레벨(Lv.${currLevelInfo.level + 1})까지 <b>${currLevelInfo.remainingForNext}</b>개 남음!
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
            overlay.classList.add('active'); // 수학방 방식
            overlay.style.display = 'flex';  // 구구단방 방식 지원
        }
      }, 1000);
    }
  } catch (err) {
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

// 5️⃣ (신규) 학습 데이터 분석 트래커 그릇 준비
let learningSession = {
  studentName: "",
  roomName: "",
  startTime: null,
  endTime: null,
  problemDetails: [], // 예: [{ id: 1, result: "O", time: 5, failCount: 0 }]
  fairyClickCount: 0
};

function startLearning(roomName) {
  learningSession.studentName = currentProfile === 'son' ? '민수' : '민서';
  learningSession.roomName = roomName;
  learningSession.startTime = new Date().toISOString();
  learningSession.problemDetails = [];
  learningSession.fairyClickCount = 0;
}
