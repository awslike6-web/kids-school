/**
 * 🌅 민민이네 공부방 - 통합교과 '하루' (1-2) 라이프 & 이벤트 허브 컨트롤러
 * - [매일의 습관]: 저금통 코인, 건강 운동 체크, 마음 날씨 & 일기 연계
 * - [자연 & 예술]: 하늘의 하루(모네/고흐 명화 감상평 & 오늘 하늘 메모), 달팽이 동요
 * - [특별한 날 추억 피드]: 가장 좋아하는 하루 & 나만의 특별한 하루 게시판
 */

let currentChild = "minseo";
let isTtsEnabled = true;

// ==========================================
// 🚀 초기화 진입점
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  currentChild = urlParams.get("user") || localStorage.getItem("currentChild") || "minseo";

  // 민수 / 민서 프로필 UI 동적 세팅
  setupChildProfileUI();

  // TTS 설정 로드
  const savedTts = localStorage.getItem("fairy_tts_enabled");
  if (savedTts !== null) isTtsEnabled = savedTts === "true";
  updateTtsButtonUI();

  // 지갑 잔액 표시
  updateCurrencyDisplay();

  // 30초 하루 체크인 배너 상태 갱신
  updateCheckInBannerStatus();

  // 탭별 콘텐츠 초기 렌더링
  renderHabitsTab();
  renderArtTab();
  renderSpecialDaysTab();
});

// 👦👧 사용자 프로필별 UI 동적 전환
function setupChildProfileUI() {
  const isMinsu = currentChild === "minsu";
  const childName = isMinsu ? "민수" : "민서";
  const curSymbol = isMinsu ? "💎" : "🍬";

  // 로비 복귀 링크
  const exitBtn = document.getElementById("haruExitBtn");
  if (exitBtn) exitBtn.href = `../../../lobby.html?user=${currentChild}`;

  // 상단 지갑 배너
  const currencyBadgeIcon = document.querySelector(".currency-badge > span:first-child");
  if (currencyBadgeIcon) currencyBadgeIcon.textContent = curSymbol;
  const currencyBadge = document.querySelector(".currency-badge");
  if (currencyBadge) currencyBadge.title = `${childName}의 지갑 잔액`;

  // 헤더 배너
  const headerBadge = document.querySelector(".haru-header-badge");
  if (headerBadge && isMinsu) {
    headerBadge.innerText = "초등 5학년 데일리 라이프 (착한 습관 & 건강 운동 루틴)";
  }

  const headerDesc = document.querySelector(".haru-header-desc");
  if (headerDesc && isMinsu) {
    headerDesc.innerHTML = "매일의 좋은 습관과 건강한 운동, 신기한 자연 관찰, 잊지 못할 특별한 날의 추억이 모두 모여있는 민수의 하루 공간이에요 ✨";
  }

  // 30초 체크인 배너 문구
  const bannerDesc = document.querySelector(".checkin-banner-desc");
  if (bannerDesc && isMinsu) {
    bannerDesc.innerHTML = "착한 일 1개 + 운동 1개 + 마음 날씨 1개 톡! 땡그랑 황금 코인 & 다이아 받기 💎";
  }

  // 위젯 섹션별 프롬프트 문구
  const habitPrompt = document.getElementById("habitsSectionPrompt");
  if (habitPrompt) {
    habitPrompt.innerText = `✨ 오늘 ${childName}가 실천한 착한 행동을 골라보세요!`;
  }

  const workoutDesc = document.getElementById("workoutSectionDesc");
  if (workoutDesc && isMinsu) {
    workoutDesc.innerText = "스트레칭, 줄넘기, 걷기와 달리기! 오늘 실천한 운동을 눌러 건강 스탬프를 찍고 다이아몬드를 받아요.";
  }

  const moodDesc = document.getElementById("moodSectionDesc");
  if (moodDesc) {
    moodDesc.innerText = `내 마음속에는 알록달록 무지개가 살아요! 오늘 ${childName}의 마음 색깔은 어떤 빛깔인가요?`;
  }
}

// ==========================================
// 🧭 3대 영역 탭 스위칭
// ==========================================
function switchHaruTab(tabName) {
  document.querySelectorAll(".nav-tab-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === tabName);
  });
  document.querySelectorAll(".tab-content-panel").forEach(panel => {
    panel.classList.toggle("active", panel.id === `tab_${tabName}`);
  });

  if (tabName === "habits") {
    speakText("매일매일 실천하는 착한 습관 저금통과 건강 운동을 확인해 보아요!");
  } else if (tabName === "art") {
    speakText("하늘과 자연의 변화를 느끼며 모네와 고흐의 명화를 감상해 보아요!");
  } else if (tabName === "special") {
    speakText("생일, 소풍, 축제! 내가 가장 좋아하는 특별한 날의 이야기를 나누어 보아요!");
  }
}

// ==========================================
// 🔊 음성 TTS & 효과음 (공통 초고음질 요정 엔진 연동)
// ==========================================
function toggleHaruTts() {
  if (typeof toggleFairyTtsSetting === "function") {
    toggleFairyTtsSetting();
    updateTtsButtonUI();
  } else {
    isTtsEnabled = !isTtsEnabled;
    localStorage.setItem("fairy_tts_enabled", isTtsEnabled ? "true" : "false");
    updateTtsButtonUI();
    if (isTtsEnabled) {
      speakText("요정 음성이 켜졌어요! 반짝이는 하루를 시작해요!");
    } else {
      stopAllSpeech();
    }
  }
}

function updateTtsButtonUI() {
  const btn = document.getElementById("haruTtsBtn");
  if (!btn) return;
  const isEnabled = localStorage.getItem("fairy_tts_enabled") !== "false";
  isTtsEnabled = isEnabled;
  if (isEnabled) {
    btn.classList.add("active");
    btn.innerHTML = "🔊 요정 음성 ON";
  } else {
    btn.classList.remove("active");
    btn.innerHTML = "🔇 요정 음성 OFF";
  }
}

function speakText(text) {
  const isEnabled = localStorage.getItem("fairy_tts_enabled") !== "false";
  if (!isEnabled) return;

  // 1순위: 초고음질 요정 엔진 (사전녹음 MP3 프리셋 및 Cloudflare Worker Edge-TTS 실시간 스트리밍)
  if (typeof speakFairyTTS === "function") {
    speakFairyTTS(text);
    return;
  }

  // 2순위: 브라우저 WebSpeech API 오프라인 폴백
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ko-KR";
    utterance.rate = 0.95;
    utterance.pitch = 1.15;
    window.speechSynthesis.speak(utterance);
  }
}

function stopAllSpeech() {
  if (typeof stopFairyTTS === "function") {
    stopFairyTTS();
  }
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

function playCoinSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(987.77, ctx.currentTime);
    osc.frequency.setValueAtTime(1318.51, ctx.currentTime + 0.08);
    gain.setValueAtTime(0.3, ctx.currentTime);
    gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch(e) {}
}

function updateCurrencyDisplay() {
  const curDisplay = document.getElementById("walletCurrencyVal");
  if (!curDisplay) return;
  const isMinsu = currentChild === "minsu";
  const curSymbol = isMinsu ? " 💎" : " 🍬";
  const savedWallet = localStorage.getItem("kids_wallet_" + currentChild);
  let count = 0;
  if (savedWallet) {
    try { count = JSON.parse(savedWallet).balance || 0; }
    catch(e) { count = parseInt(savedWallet) || 0; }
  } else {
    count = parseInt(localStorage.getItem("rewardCount_" + currentChild) || "0");
  }
  curDisplay.innerText = count + curSymbol;
}

function grantReward(amount, desc) {
  if (window.NotionReward && typeof window.NotionReward.grantRewardDirectly === "function") {
    window.NotionReward.grantRewardDirectly(currentChild, amount, desc);
  } else {
    let current = parseInt(localStorage.getItem("rewardCount_" + currentChild) || "0");
    current += amount;
    localStorage.setItem("rewardCount_" + currentChild, current);
  }
  updateCurrencyDisplay();
}

// =========================================================
// 1. [매일의 습관 & 루틴] 렌더링 & 로직
// =========================================================
function getPiggyCoins() {
  return parseInt(localStorage.getItem("haru_piggy_coins_" + currentChild) || "0");
}

function setPiggyCoins(val) {
  localStorage.setItem("haru_piggy_coins_" + currentChild, val);
}

function renderHabitsTab() {
  renderPiggyBankWidget();
  renderWorkoutWidget();
  renderMindWidget();
}

// 🐷 저금통 위젯
function renderPiggyBankWidget() {
  const container = document.getElementById("piggyBoardGrid");
  const countDisplay = document.getElementById("piggyCountDisplay");
  if (!container) return;

  const piggy = window.HARU_DATA.dailyHabits.piggyBank;
  const coins = getPiggyCoins();
  if (countDisplay) countDisplay.innerText = `${coins} / ${piggy.maxCoins}개`;

  let slotsHtml = "";
  for (let i = 1; i <= piggy.maxCoins; i++) {
    const isFilled = i <= coins;
    slotsHtml += `<div class="piggy-coin-slot ${isFilled ? 'filled' : ''}">${isFilled ? '🪙' : i}</div>`;
  }
  container.innerHTML = slotsHtml;

  const habitsList = document.getElementById("habitsActionList");
  if (habitsList) {
    habitsList.innerHTML = piggy.habits.map(h => `
      <button class="habit-action-btn" onclick="recordHabitAction('${h.name}')">
        <span style="font-size:1.4rem;">${h.icon}</span>
        <div>
          <span style="font-size:0.75rem; color:#888;">[${h.category}]</span><br/>
          <strong>${h.name}</strong>
        </div>
      </button>
    `).join("");
  }
}

function recordHabitAction(habitName) {
  let coins = getPiggyCoins();
  const max = window.HARU_DATA.dailyHabits.piggyBank.maxCoins;
  
  coins++;
  setPiggyCoins(coins);
  playCoinSound();
  renderPiggyBankWidget();
  speakText(`땡그랑! [${habitName}] 실천 완료! 황금 코인이 쏙 들어갔어요!`);

  // 20칸 완주 마일스톤 발동!
  if (coins >= max) {
    triggerPiggyBankMilestone();
    setPiggyCoins(0); // 새로운 저금통으로 리셋
    renderPiggyBankWidget();
  }
}

// 🐷 20칸 완주 특별 마일스톤 (마이룸 황금 돼지 가구 + 주말 가족 소원권)
function triggerPiggyBankMilestone() {
  playSuccessSound();
  unlockMyRoomTrophy("trophy_golden_piggy");

  const childTitle = currentChild === 'minseo' ? '민서' : '민수';
  speakText(`축하합니다! ${childTitle}가 20칸 착한 습관 저금통을 모두 채웠어요! 마이룸에 황금 돼지 저금통 인형이 배달되었고 주말 가족 소원권이 발급되었습니다!`);

  alert(`🎉 대단해요! 20칸 착한 습관 저금통 완주 달성! 🎊\n\n1. 🐷 마이룸에 [🏆 황금 돼지 저금통] 명예 가구가 배달되었습니다!\n2. 🎫 이번 주말 [가족 소원권] 1장이 발급되었습니다! (엄마 아빠와 함께 가고 싶은 곳이나 맛있는 메뉴를 골라보세요!)`);

  // 노션 학습일지에 완주 축하 피드 전송
  sendMilestoneToNotion("20칸 하루 저금통 완주 (가족 소원권 발급)");
}

function unlockMyRoomTrophy(itemId) {
  const profileKey = currentChild === 'minsu' ? 'son' : 'daughter';
  // my-room.html에서 사용하는 로컬스토리지 키 양식 지원
  const keys = [`myroom_owned_${profileKey}`, `kids_myroom_owned_${profileKey}`, `ownedItems_${profileKey}`];
  keys.forEach(k => {
    try {
      let owned = JSON.parse(localStorage.getItem(k) || "[]");
      if (!owned.includes(itemId)) {
        owned.push(itemId);
        localStorage.setItem(k, JSON.stringify(owned));
      }
    } catch(e) {}
  });
}

// 💪 운동 체크 위젯
function getWorkoutLogs() {
  try {
    return JSON.parse(localStorage.getItem("haru_workout_logs_" + currentChild) || "{}");
  } catch(e) { return {}; }
}

function renderWorkoutWidget() {
  const container = document.getElementById("workoutCalendarRow");
  if (!container) return;

  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const todayIdx = new Date().getDay();
  const todayKey = new Date().toISOString().slice(0, 10);
  const logs = getWorkoutLogs();

  container.innerHTML = days.map((dayName, idx) => {
    const isToday = idx === todayIdx;
    const isDone = logs[idx] !== undefined;
    return `
      <div class="workout-day-card ${isToday ? 'today' : ''} ${isDone ? 'done' : ''}">
        <div style="font-size:0.85rem; font-weight:bold; color:${isToday ? '#ff9f43' : '#57606f'};">
          ${dayName}${isToday ? ' (오늘)' : ''}
        </div>
        <div class="workout-stamp">${isDone ? (logs[idx] || '🏃') : '⚪'}</div>
      </div>
    `;
  }).join("");

  const exList = document.getElementById("exerciseButtonsRow");
  if (exList) {
    const exercises = window.HARU_DATA.dailyHabits.workout.exercises;
    exList.innerHTML = exercises.map(ex => `
      <button class="habit-action-btn" onclick="recordWorkout('${ex.icon}', '${ex.name}')">
        <span style="font-size:1.4rem;">${ex.icon}</span>
        <strong>${ex.name}</strong>
      </button>
    `).join("");
  }
}

function recordWorkout(icon, name) {
  const todayIdx = new Date().getDay();
  const logs = getWorkoutLogs();
  logs[todayIdx] = icon;
  localStorage.setItem("haru_workout_logs_" + currentChild, JSON.stringify(logs));
  renderWorkoutWidget();
  grantReward(1, `오늘의 건강 운동 실천: ${name}`);
  speakText(`오늘의 튼튼 운동 [${name}] 실천 완료! 참 잘했어요!`);
  alert(`💪 [${name}] 실천 완료! 오늘 건강 스탬프가 찍히고 젤리 1개(+🍬)를 받았어요!`);
}

// 🌈 마음 날씨 위젯
function renderMindWidget() {
  const container = document.getElementById("moodChipsRow");
  if (!container) return;

  const moods = window.HARU_DATA.dailyHabits.mind.moodColors;
  const currentMood = localStorage.getItem("haru_today_mood_" + currentChild) || "";

  container.innerHTML = moods.map(m => `
    <div class="mood-chip ${currentMood === m.mood ? 'selected' : ''}" onclick="selectMoodColor('${m.mood}', '${m.color}', '${m.desc}')">
      <div style="font-size:1.8rem; margin-bottom:4px;">${m.icon}</div>
      <div style="font-family:'Jua'; font-size:1.05rem; color:${m.color};">${m.mood}</div>
      <div style="font-size:0.8rem; color:#888; margin-top:2px;">${m.desc}</div>
    </div>
  `).join("");
}

function selectMoodColor(mood, color, desc) {
  localStorage.setItem("haru_today_mood_" + currentChild, mood);
  renderMindWidget();
  speakText(`오늘 민서의 마음은 ${mood}이군요! ${desc}`);
}

function goToDailyDiary() {
  // 공부방 로비의 마음 날씨 일기장 모달 직접 호출 또는 로비로 이동
  if (window.DailyDiary && typeof window.DailyDiary.openDiaryModal === "function") {
    window.DailyDiary.openDiaryModal(currentChild);
  } else {
    location.href = `../../../lobby.html?user=${currentChild}#diary`;
  }
}

// =========================================================
// 2. [자연 & 예술 감상실] 렌더링 & 로직
// =========================================================
function renderArtTab() {
  const sky = window.HARU_DATA.natureAndArt.skyArt;

  // 하늘 명화 렌더링
  const dayCard = document.getElementById("monetCardBody");
  if (dayCard) {
    dayCard.innerHTML = `
      <div class="art-title">${sky.day.title} (${sky.day.period})</div>
      <div class="art-artist">화가: ${sky.day.artist}</div>
      <p class="art-desc">${sky.day.desc}</p>
      <button class="back-btn" style="padding:6px 14px; font-size:0.9rem;" onclick="speakText('${sky.day.voiceMsg}')">
        🔊 모네 할아버지 이야기 듣기
      </button>
    `;
  }

  const nightCard = document.getElementById("goghCardBody");
  if (nightCard) {
    nightCard.innerHTML = `
      <div class="art-title">${sky.night.title} (${sky.night.period})</div>
      <div class="art-artist">화가: ${sky.night.artist}</div>
      <p class="art-desc">${sky.night.desc}</p>
      <button class="back-btn" style="padding:6px 14px; font-size:0.9rem;" onclick="speakText('${sky.night.voiceMsg}')">
        🔊 고흐 할아버지 이야기 듣기
      </button>
    `;
  }

  // 달팽이 동요
  const snailBox = document.getElementById("snailLyricsBox");
  if (snailBox) {
    const snail = window.HARU_DATA.natureAndArt.snail;
    snailBox.innerText = snail.song.lyrics;
  }

  // 저장된 오늘 하늘 메모 로드
  const savedSkyNote = localStorage.getItem("haru_sky_note_" + currentChild) || "";
  const noteInput = document.getElementById("todaySkyNoteInput");
  if (noteInput && savedSkyNote) noteInput.value = savedSkyNote;
}

function saveTodaySkyNote() {
  const input = document.getElementById("todaySkyNoteInput");
  if (!input) return;
  const val = input.value.trim();
  if (!val) {
    alert("오늘 관찰한 하늘의 모습이나 감상평을 한 줄 적어보세요! 🌤️");
    return;
  }
  localStorage.setItem("haru_sky_note_" + currentChild, val);
  grantReward(1, "오늘의 하늘 관찰 메모 작성");
  alert("✨ 오늘 하늘 관찰 메모가 멋지게 기록되었어요! 하리보 젤리 1개(+🍬) 획득!");
  speakText(`오늘의 하늘 관찰 기록 완료! "${val}" 참 멋진 관찰이에요!`);
}

function playRainSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    // 부드러운 화이트 노이즈로 빗소리 시뮬레이션
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 0.1 - 0.05;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1000;
    noise.connect(filter);
    filter.connect(ctx.destination);
    noise.start();
    speakText("촉촉한 비가 내리는 날, 풀잎 위 달팽이 친구를 노래해 보아요!");
  } catch(e) {}
}

// =========================================================
// 3. [특별한 날 추억 게시판] 렌더링 & 로직
// =========================================================
function getSpecialStories() {
  try {
    const saved = localStorage.getItem("haru_special_stories_" + currentChild);
    if (saved) return JSON.parse(saved);
  } catch(e) {}
  return window.HARU_DATA.specialDays.defaultEvents;
}

function renderSpecialDaysTab() {
  const container = document.getElementById("specialFeedGrid");
  if (!container) return;

  const stories = getSpecialStories();
  container.innerHTML = stories.map((s, idx) => `
    <div class="special-card" onclick="speakText('${s.title}! ${s.desc}')">
      <div class="special-card-icon">${s.icon || '🌟'}</div>
      <div class="special-card-title">${s.title}</div>
      <div class="special-card-date">📅 ${s.date || '특별한 날'}</div>
      <p class="special-card-desc">${s.desc}</p>
    </div>
  `).join("");
}

function addNewSpecialStory() {
  const titleInput = document.getElementById("newStoryTitle");
  const dateInput = document.getElementById("newStoryDate");
  const descInput = document.getElementById("newStoryDesc");

  if (!titleInput || !descInput) return;

  const title = titleInput.value.trim();
  const date = dateInput ? dateInput.value.trim() : "특별한 날";
  const desc = descInput.value.trim();

  if (!title || !desc) {
    alert("특별한 날의 제목과 즐거웠던 이야기를 적어주세요! ✏️");
    return;
  }

  const stories = getSpecialStories();
  stories.unshift({
    id: "evt_custom_" + Date.now(),
    title: `✨ ${title}`,
    date: date || "소중한 추억",
    desc: desc,
    icon: "💖"
  });

  localStorage.setItem("haru_special_stories_" + currentChild, JSON.stringify(stories));
  titleInput.value = "";
  if (dateInput) dateInput.value = "";
  descInput.value = "";

  renderSpecialDaysTab();
  grantReward(2, `특별한 하루 추억 작성: ${title}`);
  speakText(`새로운 특별한 하루 이야기 [${title}]이 우리 게시판에 등록되었어요! 젤리 2개를 선물합니다!`);
  alert(`🎉 [${title}] 이야기가 추억 게시판에 등록되었습니다! 젤리 2개(+🍬🍬)를 받았어요!`);
}

// =========================================================
// ✨ 4. [30초 원스톱 하루 체크인 익스프레스] 모달 엔진
// =========================================================
let checkInState = {
  step: 1,
  habit: null,
  workout: null,
  mood: null
};

function getTodayCheckInKey() {
  const todayStr = new Date().toISOString().slice(0, 10);
  return `haru_checkin_done_${todayStr}_${currentChild}`;
}

function updateCheckInBannerStatus() {
  const isDone = localStorage.getItem(getTodayCheckInKey()) === "true";
  const banner = document.getElementById("quickCheckInBanner");
  const badge = document.getElementById("checkInStatusBadge");
  const actionBtn = document.getElementById("checkInActionBtn");
  if (!banner || !badge) return;

  if (isDone) {
    banner.classList.add("done");
    badge.innerText = "오늘 완료! 🎉";
    badge.style.background = "#10ac84";
    if (actionBtn) actionBtn.innerText = "다시 확인하기 ➔";
  } else {
    banner.classList.remove("done");
    badge.innerText = "미완료 ⏳";
    badge.style.background = "rgba(255,255,255,0.3)";
    if (actionBtn) actionBtn.innerText = "체크인 시작! ➔";
  }
}

function openQuickCheckInModal() {
  const overlay = document.getElementById("quickCheckInModalOverlay");
  if (!overlay) return;

  checkInState = { step: 1, habit: null, workout: null, mood: null };
  renderCheckInStep();
  overlay.classList.add("active");
  document.body.style.overflow = "hidden";
  const childTitle = currentChild === "minsu" ? "민수" : "민서";
  speakText(`30초 하루 체크인! 오늘 ${childTitle}가 실천한 착한 행동을 하나 골라보세요!`);
}

function closeQuickCheckInModal() {
  const overlay = document.getElementById("quickCheckInModalOverlay");
  if (overlay) overlay.classList.remove("active");
  document.body.style.overflow = "auto";
  stopAllSpeech();
}

function renderCheckInStep() {
  const body = document.getElementById("checkInModalInnerBody");
  if (!body) return;

  const { step } = checkInState;
  const childTitle = currentChild === "minsu" ? "민수" : "민서";
  const curName = currentChild === "minsu" ? "다이아 1개" : "젤리 1개";

  // 상단 스텝 인디케이터
  const stepTrackerHtml = `
    <div class="checkin-step-tracker">
      <div class="step-dot ${step === 1 ? 'active' : (step > 1 ? 'completed' : '')}">1. 착한 습관 🐷</div>
      <div class="step-dot ${step === 2 ? 'active' : (step > 2 ? 'completed' : '')}">2. 튼튼 운동 💪</div>
      <div class="step-dot ${step === 3 ? 'active' : ''}">3. 마음 날씨 🌈</div>
    </div>
  `;

  let contentHtml = "";

  if (step === 1) {
    const habits = window.HARU_DATA.dailyHabits.piggyBank.habits;
    contentHtml = `
      <div style="text-align:center; margin-bottom:14px;">
        <h3 style="font-family:'Jua'; font-size:1.25rem; color:var(--dark);">
          🐷 오늘 ${childTitle}가 실천한 착한 행동은 무엇인가요?
        </h3>
        <p style="font-size:0.9rem; color:#888;">터치하면 땡그랑 황금 코인이 저금통으로 들어갑니다!</p>
      </div>
      <div class="checkin-choices-grid">
        ${habits.map(h => `
          <div class="checkin-card" onclick="selectCheckInHabit('${h.name}', '${h.icon}')">
            <div class="checkin-card-icon">${h.icon}</div>
            <div class="checkin-card-title">${h.name}</div>
            <div class="checkin-card-sub">[${h.category}]</div>
          </div>
        `).join("")}
      </div>
    `;
  } else if (step === 2) {
    const exercises = window.HARU_DATA.dailyHabits.workout.exercises;
    contentHtml = `
      <div style="text-align:center; margin-bottom:14px;">
        <h3 style="font-family:'Jua'; font-size:1.25rem; color:var(--dark);">
          💪 오늘 몸을 튼튼하게 만든 운동은 무엇인가요?
        </h3>
        <p style="font-size:0.9rem; color:#888;">터치하면 일주일 운동 달력에 참잘했어요 도장이 찍혀요!</p>
      </div>
      <div class="checkin-choices-grid">
        ${exercises.map(ex => `
          <div class="checkin-card" onclick="selectCheckInWorkout('${ex.name}', '${ex.icon}')">
            <div class="checkin-card-icon">${ex.icon}</div>
            <div class="checkin-card-title">${ex.name}</div>
          </div>
        `).join("")}
      </div>
    `;
  } else if (step === 3) {
    const moods = window.HARU_DATA.dailyHabits.mind.moodColors;
    contentHtml = `
      <div style="text-align:center; margin-bottom:14px;">
        <h3 style="font-family:'Jua'; font-size:1.25rem; color:var(--dark);">
          🌈 오늘 ${childTitle}의 마음속 무지개 날씨는 어떤 색깔인가요?
        </h3>
        <p style="font-size:0.9rem; color:#888;">터치하면 오늘 마음 날씨가 기록되고 ${curName}를 받아요!</p>
      </div>
      <div class="checkin-choices-grid">
        ${moods.map(m => `
          <div class="checkin-card" onclick="selectCheckInMood('${m.mood}', '${m.color}', '${m.icon}', '${m.desc}')">
            <div class="checkin-card-icon">${m.icon}</div>
            <div class="checkin-card-title" style="color:${m.color};">${m.mood}</div>
            <div class="checkin-card-sub">${m.desc}</div>
          </div>
        `).join("")}
      </div>
    `;
  }

  body.innerHTML = stepTrackerHtml + contentHtml;
}

function selectCheckInHabit(name, icon) {
  checkInState.habit = { name, icon };
  playCoinSound();
  checkInState.step = 2;
  renderCheckInStep();
  speakText(`참 착해요! [${name}] 실천 완료! 이번엔 오늘 실천한 튼튼 운동을 골라보세요!`);
}

function selectCheckInWorkout(name, icon) {
  checkInState.workout = { name, icon };
  playCoinSound();
  checkInState.step = 3;
  renderCheckInStep();
  const childTitle = currentChild === "minsu" ? "민수" : "민서";
  speakText(`몸도 튼튼! [${name}] 완료! 마지막으로 오늘 ${childTitle}의 마음 날씨를 골라보세요!`);
}

function selectCheckInMood(mood, color, icon, desc) {
  checkInState.mood = { mood, color, icon, desc };
  finishQuickCheckIn();
}

async function finishQuickCheckIn() {
  const { habit, workout, mood } = checkInState;

  // 1) 저금통 코인 +1 적립
  let coins = getPiggyCoins();
  const max = window.HARU_DATA.dailyHabits.piggyBank.maxCoins;
  coins++;
  setPiggyCoins(coins);

  // 1-1) 오늘 실천한 착한 습관 & 운동 명칭 저장 (부모 대시보드 코칭 연동)
  localStorage.setItem("haru_today_habit_" + currentChild, habit.name);
  localStorage.setItem("haru_today_workout_" + currentChild, workout.name);

  // 2) 운동 달력 오늘 요일 스탬프 저장
  const todayIdx = new Date().getDay();
  const workoutLogs = getWorkoutLogs();
  workoutLogs[todayIdx] = workout.icon;
  localStorage.setItem("haru_workout_logs_" + currentChild, JSON.stringify(workoutLogs));

  // 3) 마음 날씨 저장
  localStorage.setItem("haru_today_mood_" + currentChild, mood.mood);

  // 4) 오늘 완료 플래그 저장
  localStorage.setItem(getTodayCheckInKey(), "true");

  // 5) 보상 지급 (참여 격려 1개로 절제)
  grantReward(1, "30초 하루 체크인 완료");

  // 6) 배너 및 하단 위젯 화면 갱신
  updateCheckInBannerStatus();
  renderHabitsTab();

  // 7) 노션 학습일지 DB 자동 전송
  sendCheckInToNotion(habit, workout, mood);

  // 8) 20칸 저금통 완주 여부 확인
  let reachedMilestone = false;
  if (coins >= max) {
    reachedMilestone = true;
    triggerPiggyBankMilestone();
    setPiggyCoins(0);
    renderHabitsTab();
  }

  // 9) 완료 축하 뷰 표시
  renderCheckInCompletionView(reachedMilestone);
}

function renderCheckInCompletionView(reachedMilestone = false) {
  const body = document.getElementById("checkInModalInnerBody");
  if (!body) return;

  const { habit, workout, mood } = checkInState;
  const childTitle = currentChild === "minsu" ? "민수" : "민서";
  const curSymbol = currentChild === "minsu" ? "💎" : "🍬";
  const curName = currentChild === "minsu" ? "다이아 1개" : "젤리 1개";
  const curWordSpoken = currentChild === "minsu" ? "다이아몬드 1개" : "젤리 1개";

  body.innerHTML = `
    <div style="text-align:center; padding:20px 10px;">
      <div style="font-size:3.8rem; margin-bottom:10px;">${reachedMilestone ? '🎊' : '🎉'}</div>
      <h2 style="font-family:'Jua'; font-size:1.6rem; color:#10ac84; margin-bottom:12px;">
        ${reachedMilestone ? '대박! 20칸 저금통 완주 달성!' : `${childTitle}의 30초 체크인 완료!`}
      </h2>
      <p style="font-size:1.05rem; color:#57606f; margin-bottom:20px;">
        ${reachedMilestone 
          ? '20일 동안 착한 습관을 실천하여 [황금 돼지 트로피]와 [주말 가족 소원권]을 얻었어요!' 
          : `기록들이 제자리에 쏙 들어가고 오늘의 참여 ${curName}(+${curSymbol})를 받았어요!`}
      </p>

      <div style="background:#f8f9fa; border-radius:18px; padding:16px; margin-bottom:22px; text-align:left; display:flex; flex-direction:column; gap:10px; border:2px solid #eef2f5;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span>🐷</span> <b>저금통:</b> [${habit.name}] 황금 코인 1개 적립! (20칸 완주 시 황금 돼지 트로피 & 소원권)
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <span>💪</span> <b>운동 달력:</b> [${workout.name}] 오늘 스탬프 쾅!
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <span>🌈</span> <b>마음 날씨:</b> [${mood.mood}] ${mood.desc}
        </div>
      </div>

      <button class="card-footer-btn" style="padding:12px 36px; font-size:1.1rem; border-radius:999px;" onclick="closeQuickCheckInModal()">
        확인하고 둘러보기 💖
      </button>
    </div>
  `;

  if (!reachedMilestone) {
    speakText(`오늘 하루 체크인 완료! 저금통과 운동 달력에 쏙 들어가고 ${curWordSpoken}를 선물받았습니다!`);
  }
}

// 🌐 노션 완주 마일스톤 피드 전송
async function sendMilestoneToNotion(milestoneTitle) {
  const proxyUrl = typeof PROXY_URL !== "undefined" ? PROXY_URL : "https://minmin-notion.awslike6.workers.dev";
  const dbId = typeof STUDY_LOG_DB_ID !== "undefined" ? STUDY_LOG_DB_ID : "37aa27115b688001b2ffe5e6c8f82ab2";
  const todayStr = new Date().toISOString().slice(0, 10);
  const childTitle = currentChild === "minseo" ? "민서" : "민수";

  const payload = {
    parent: { database_id: dbId },
    properties: {
      "제목": {
        title: [{ text: { content: `🏆 [마일스톤 완주] ${childTitle}_${milestoneTitle}` } }]
      },
      "학생": { select: { name: childTitle } },
      "과목": { select: { name: "하루" } },
      "날짜": { date: { start: todayStr } },
      "학습내용": {
        rich_text: [{
          text: { content: `🎉 축하합니다! 20칸 착한 습관 저금통을 모두 채웠습니다.\n• 마이룸 [황금 돼지 저금통] 트로피 가구 지급 완료\n• 이번 주말 [가족 소원권] 발급 완료 (부모님 확인 필요)` }
        }]
      },
      "획득보상": { number: 0 }
    }
  };

  try {
    await fetch(`${proxyUrl}/v1/pages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  } catch(e) {}
}

// 🌐 노션 학습일지 DB 자동 기록
async function sendCheckInToNotion(habit, workout, mood) {
  const proxyUrl = typeof PROXY_URL !== "undefined" ? PROXY_URL : "https://minmin-notion.awslike6.workers.dev";
  const dbId = typeof STUDY_LOG_DB_ID !== "undefined" ? STUDY_LOG_DB_ID : "37aa27115b688001b2ffe5e6c8f82ab2";
  const todayStr = new Date().toISOString().slice(0, 10);
  const timeStr = new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
  const childTitle = currentChild === "minseo" ? "민서" : "민수";
  const isMinsu = currentChild === "minsu";

  const payload = {
    parent: { database_id: dbId },
    properties: {
      "제목": {
        title: [{ text: { content: `${childTitle}_${todayStr} (${isMinsu ? '데일리 루틴 체크인' : '슬기로운 하루 체크인'})` } }]
      },
      "학생": {
        select: { name: childTitle }
      },
      "과목": {
        select: { name: "하루" }
      },
      "날짜": {
        date: { start: todayStr }
      },
      "학습내용": {
        rich_text: [{
          text: {
            content: `[30초 ${isMinsu ? '데일리 루틴' : '하루'} 체크인]\n• 착한습관: ${habit.name}\n• 건강운동: ${workout.name}\n• 마음날씨: ${mood.mood} (${mood.desc}) [${timeStr}]`
          }
        }]
      },
      "획득보상": {
        number: 1
      }
    }
  };

  try {
    await fetch(`${proxyUrl}/v1/pages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  } catch(e) {
    console.warn("노션 하루 체크인 자동 동기화 예외 (로컬 안전 보존됨):", e);
  }
}

