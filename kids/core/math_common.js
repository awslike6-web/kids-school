// ==========================================
// 🌟 민민이네 수학방 공통 시스템 V2 (math_common.js)
// 📈 경험치/재화 독립 분리 버전 적용 완료!
// ==========================================

// 💡 전역 만능 헬퍼에게 이 방이 '수학' 방임을 알립니다.
window.currentSubject = "수학";

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
