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

  // 탭별 콘텐츠 초기 렌더링 (첫 진입 시 음성은 나가지 않도록 false 전달)
  renderHabitsTab();
  renderArtTab();
  renderSpecialDaysTab();
  renderTimelineTab();
  renderSafetyQuizQuestion(false);

  // 첫 진입 시 짧고 산뜻한 환영 안내 1회만 제공
  const isMinsu = currentChild === "minsu";
  const welcomeMsg = isMinsu 
    ? "민수의 데일리 라이프 공간이에요! ✨" 
    : "슬기로운 하루 공간에 온 걸 환영해요! ✨";
  speakText(welcomeMsg);
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

  // 탭 3 특별한 날 이야기 남기기 폼 문구
  const storyAuthorTag = document.getElementById("storyAuthorNameTag");
  if (storyAuthorTag) storyAuthorTag.innerText = childName;

  const storySubmitBtn = document.getElementById("storySubmitBtn");
  if (storySubmitBtn) {
    storySubmitBtn.innerHTML = isMinsu 
      ? "💖 추억 게시판에 등록하고 다이아 2개 받기 💎💎" 
      : "💖 추억 게시판에 등록하고 젤리 2개 받기 🍬🍬";
  }

  // 탭 4 황금 안전 지킴이 면허증 정보 세팅
  const licName = document.getElementById("licenseChildName");
  if (licName) licName.innerText = childName;
  const licGrade = document.getElementById("licenseChildGrade");
  if (licGrade) licGrade.innerText = isMinsu ? "초등학교 5학년" : "초등학교 1학년";
  const licPhoto = document.getElementById("licensePhotoFrame");
  if (licPhoto) licPhoto.innerText = isMinsu ? "👦" : "👧";
  const licReward = document.getElementById("licenseRewardBadge");
  if (licReward) {
    licReward.innerHTML = isMinsu 
      ? "💎 완주 축하 보너스 다이아 +5개 획득!" 
      : "🍬 완주 축하 보너스 젤리 +5개 획득!";
  }
}

// ==========================================
// 🧭 4대 영역 탭 스위칭 (탭 이동 시 이전 음성 즉시 정지 & 불필요한 자동 낭독 제거)
// ==========================================
function switchHaruTab(tabName) {
  // 💡 탭을 왔다갔다 할 때는 이전 음성을 즉시 끊어 사용자 피로도를 방지합니다!
  stopAllSpeech();

  document.querySelectorAll(".nav-tab-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === tabName);
  });
  document.querySelectorAll(".tab-content-panel").forEach(panel => {
    panel.classList.toggle("active", panel.id === `tab_${tabName}`);
  });

  if (tabName === "timeline") {
    renderTimelineTab();
  }
}

// ==========================================
// 🔊 음성 TTS & 효과음 (공통 초고음질 요정 엔진 연동 & 멈춤 토글 지원)
// ==========================================
let isHaruSpeaking = false;
let currentSpeakingCardId = null;

function showAudioControls(text) {
  isHaruSpeaking = true;
  const stopBtn = document.getElementById("haruQuickStopBtn");
  if (stopBtn) stopBtn.style.display = "inline-flex";
  const floatBar = document.getElementById("haruAudioFloatingBar");
  const floatText = document.getElementById("floatingAudioText");
  if (floatBar) {
    if (floatText && text) {
      const cleanText = text.replace(/^[^\w가-힣\s]+/, '').trim();
      const short = cleanText.length > 18 ? cleanText.slice(0, 18) + "..." : cleanText;
      floatText.innerText = `요정 코코: "${short}"`;
    }
    floatBar.style.display = "flex";
  }
}

function hideAudioControls() {
  isHaruSpeaking = false;
  currentSpeakingCardId = null;
  const stopBtn = document.getElementById("haruQuickStopBtn");
  if (stopBtn) stopBtn.style.display = "none";
  const floatBar = document.getElementById("haruAudioFloatingBar");
  if (floatBar) floatBar.style.display = "none";
  updateSpeakingCardUi();
}

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

function speakText(text, onEndCallback = null) {
  const isEnabled = localStorage.getItem("fairy_tts_enabled") !== "false";
  if (!isEnabled || !text) {
    if (onEndCallback) onEndCallback();
    return;
  }

  showAudioControls(text);

  const handleEnd = () => {
    hideAudioControls();
    if (onEndCallback) onEndCallback();
  };

  // 1순위: 초고음질 요정 엔진 (사전녹음 MP3 프리셋 및 Cloudflare Worker Edge-TTS 실시간 스트리밍)
  if (typeof speakFairyTTS === "function") {
    speakFairyTTS(text, handleEnd);
    return;
  }

  // 2순위: 브라우저 WebSpeech API 오프라인 폴백
  if ("speechSynthesis" in window) {
    try { window.speechSynthesis.cancel(); } catch(e) {}
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ko-KR";
    utterance.rate = 0.95;
    utterance.pitch = 1.15;
    utterance.onend = handleEnd;
    utterance.onerror = handleEnd;
    window.speechSynthesis.speak(utterance);
  } else {
    handleEnd();
  }
}

function stopAllSpeech(userInitiated = false) {
  if (typeof stopFairyTTS === "function") {
    stopFairyTTS();
  }
  if (window.speechSynthesis) {
    try { window.speechSynthesis.cancel(); } catch (e) {}
  }
  hideAudioControls();
  if (userInitiated) {
    console.log("⏹️ 사용자가 음성을 즉시 중단했습니다.");
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
let selectedStoryPhotoBase64 = "";

function handleStoryPhotoSelect(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    selectedStoryPhotoBase64 = e.target.result;
    const previewBox = document.getElementById("storyImgPreviewBox");
    const previewImg = document.getElementById("storyImgPreview");
    if (previewBox && previewImg) {
      previewImg.src = selectedStoryPhotoBase64;
      previewBox.style.display = "flex";
    }
  };
  reader.readAsDataURL(file);
}

function handleStoryUrlInput(url) {
  const trimmed = url ? url.trim() : "";
  const previewBox = document.getElementById("storyImgPreviewBox");
  const previewImg = document.getElementById("storyImgPreview");
  if (!previewBox || !previewImg) return;

  if (trimmed) {
    selectedStoryPhotoBase64 = trimmed;
    previewImg.src = trimmed;
    previewBox.style.display = "flex";
  } else {
    selectedStoryPhotoBase64 = "";
    previewBox.style.display = "none";
  }
}

function getSpecialStories() {
  const defaults = (window.HARU_DATA && window.HARU_DATA.specialDays && window.HARU_DATA.specialDays.defaultEvents) || [];
  try {
    const saved = localStorage.getItem("haru_special_stories_" + currentChild);
    if (saved) {
      const parsed = JSON.parse(saved);
      // 사용자가 직접 추가한 커스텀 스토리(evt_custom_...) 분리
      const customStories = parsed.filter(s => s.id && s.id.startsWith("evt_custom_"));
      // 기본 이벤트들은 HARU_DATA 최신 데이터 기준으로 동기화 (사용자가 제목 수정한 경우 그 제목만 유지)
      const mergedDefaults = defaults.map(def => {
        const found = parsed.find(s => s.id === def.id);
        if (found && found._userEditedTitle) {
          return { ...def, title: found.title, _userEditedTitle: true };
        }
        return def;
      });
      return [...customStories, ...mergedDefaults];
    }
  } catch(e) {}
  return defaults;
}

function switchCardPhoto(event, thumbEl, targetUrl, mainImgId) {
  if (event) event.stopPropagation();
  const mainImg = document.getElementById(mainImgId);
  if (mainImg) {
    mainImg.src = targetUrl;
  }
  const parent = thumbEl.parentElement;
  if (parent) {
    parent.querySelectorAll('.special-card-thumb-btn').forEach(btn => btn.classList.remove('active'));
    thumbEl.classList.add('active');
  }
}

// 🖼️ 특별한 날 사진 팝업 모달 열기
function openSpecialPhotoModal(storyId, mainImgId) {
  const modal = document.getElementById("specialPhotoModalOverlay");
  const modalImg = document.getElementById("photoModalImg");
  const modalTitle = document.getElementById("photoModalTitle");
  const modalThumbs = document.getElementById("photoModalThumbs");
  const modalCaption = document.getElementById("photoModalCaption");
  if (!modal || !modalImg) return;

  const stories = getSpecialStories();
  const story = stories.find(s => s.id === storyId);
  if (!story) return;

  if (modalTitle) {
    modalTitle.innerHTML = `<span>📸</span> ${story.title || '사진 전체보기'}`;
  }

  // 현재 카드에서 선택된 사진이 있으면 해당 URL 우선 적용
  let currentSrc = story.imageUrl;
  if (mainImgId) {
    const cardMainImg = document.getElementById(mainImgId);
    if (cardMainImg && cardMainImg.src) {
      currentSrc = cardMainImg.src;
    }
  }
  modalImg.src = currentSrc;

  const galleryList = (story.galleryImages && story.galleryImages.length > 0) ? story.galleryImages : (story.imageUrl ? [story.imageUrl] : []);

  if (modalThumbs) {
    if (galleryList.length > 1) {
      modalThumbs.innerHTML = galleryList.map((gUrl, idx) => `
        <button type="button" class="photo-modal-thumb-btn ${gUrl === currentSrc ? 'active' : ''}" onclick="switchModalPhoto(this, '${gUrl}')" title="사진 ${idx + 1}">
          <img src="${gUrl}" alt="사진 ${idx + 1}" />
        </button>
      `).join("");
      modalThumbs.style.display = "flex";
    } else {
      modalThumbs.innerHTML = "";
      modalThumbs.style.display = "none";
    }
  }

  if (modalCaption) {
    modalCaption.textContent = `📅 ${story.date || '특별한 날'} · ${galleryList.length > 1 ? '아래 썸네일을 눌러 사진을 바꿔볼 수 있어요' : '사진 전체보기'}`;
  }

  modal.classList.add("active");
  document.body.style.overflow = "hidden";
}

// 모달 내부 사진 전환
function switchModalPhoto(btn, targetUrl) {
  const modalImg = document.getElementById("photoModalImg");
  if (modalImg) {
    modalImg.src = targetUrl;
  }
  const parent = btn.parentElement;
  if (parent) {
    parent.querySelectorAll(".photo-modal-thumb-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
  }
}

// 팝업 모달 닫기
function closeSpecialPhotoModal() {
  const modal = document.getElementById("specialPhotoModalOverlay");
  if (modal) modal.classList.remove("active");
  document.body.style.overflow = "auto";
}

function stampReaction(event, storyId, emoji, label, storyTitle) {
  if (event) event.stopPropagation();
  const childName = currentChild === "minsu" ? "민수" : "민서";
  const isMinsu = currentChild === "minsu";
  const curSymbol = isMinsu ? "다이아 2개(+💎💎)" : "젤리 2개(+🍬🍬)";
  const curWord = isMinsu ? "다이아몬드 2개" : "젤리 2개";

  const stampKey = `haru_stamp_${currentChild}_${storyId}`;
  const alreadyStamped = localStorage.getItem(stampKey);

  const stampData = {
    emoji: emoji,
    label: label,
    date: new Date().toISOString().slice(5, 10).replace("-", "/")
  };
  localStorage.setItem(stampKey, JSON.stringify(stampData));

  if (!alreadyStamped) {
    grantReward(2, `특별한 하루 추억 도장: ${label}`);
    speakText(`${childName}가 [${label}] 감정 도장을 쾅 찍었네요! 신나는 하루 추억을 완성해서 ${curWord}를 선물합니다!`);
    alert(`🎉 도장 쾅! [${emoji} ${label}] 도장이 찍혔습니다!\n추억을 완성해서 ${curSymbol}를 선물 받았어요!`);
  } else {
    speakText(`${childName}의 마음이 [${label}] 도장으로 바뀌었어요!`);
  }

  renderSpecialDaysTab();
}

function toggleEditTitle(event, storyId) {
  if (event) event.stopPropagation();
  const editBox = document.getElementById(`title_edit_box_${storyId}`);
  const displayBox = document.getElementById(`title_display_${storyId}`);
  if (!editBox) return;

  const isHidden = editBox.style.display === "none" || !editBox.style.display;
  editBox.style.display = isHidden ? "flex" : "none";
  if (displayBox) displayBox.style.display = isHidden ? "none" : "block";

  if (isHidden) {
    const input = document.getElementById(`title_edit_input_${storyId}`);
    if (input) {
      input.focus();
      input.select();
    }
  }
}

function saveEditedTitle(event, storyId) {
  if (event) event.stopPropagation();
  const input = document.getElementById(`title_edit_input_${storyId}`);
  if (!input) return;

  const newTitle = input.value.trim();
  if (!newTitle) {
    alert("제목을 입력해 주세요! ✏️");
    return;
  }

  const stories = JSON.parse(JSON.stringify(getSpecialStories()));
  const story = stories.find(s => s.id === storyId);
  if (story) {
    story.title = newTitle;
    story._userEditedTitle = true;
    localStorage.setItem("haru_special_stories_" + currentChild, JSON.stringify(stories));
    renderSpecialDaysTab();
    speakText(`제목이 '${newTitle}'(으)로 변경되었어요!`);
  }
}

function toggleCustomStampInput(event, storyId) {
  if (event) event.stopPropagation();
  const row = document.getElementById(`custom_stamp_row_${storyId}`);
  if (!row) return;

  const isHidden = row.style.display === "none" || !row.style.display;
  row.style.display = isHidden ? "flex" : "none";
  if (isHidden) {
    const input = document.getElementById(`custom_stamp_input_${storyId}`);
    if (input) {
      input.focus();
      input.select();
    }
  }
}

function submitCustomStamp(event, storyId, storyTitle) {
  if (event) event.stopPropagation();
  const input = document.getElementById(`custom_stamp_input_${storyId}`);
  if (!input) return;

  const text = input.value.trim();
  if (!text) {
    alert("느낌이나 생각을 적어주세요! (예: 너무 신났어! 😋)");
    return;
  }

  const emojiMatch = text.match(/^(\p{Emoji})/u);
  const emoji = emojiMatch ? emojiMatch[1] : "💮";
  const label = emojiMatch ? text.slice(emoji.length).trim() : text;

  stampReaction(event, storyId, emoji, label || text, storyTitle);
}

function handleNewStoryStampPreset(val) {
  const customInput = document.getElementById("newStoryCustomStamp");
  if (!customInput) return;
  if (val === "custom") {
    customInput.style.display = "block";
    customInput.focus();
  } else {
    customInput.style.display = "none";
  }
}

function renderSpecialDaysTab() {
  const container = document.getElementById("specialFeedGrid");
  if (!container) return;

  const childName = currentChild === "minsu" ? "민수" : "민서";
  const stories = getSpecialStories();

  container.innerHTML = stories.map((s, idx) => {
    const hasPhoto = !!s.imageUrl;
    const category = s.category || "특별한날";
    const categoryIcon = s.categoryIcon || (hasPhoto ? "🌱" : (s.icon || "🌟"));
    const galleryList = (s.galleryImages && s.galleryImages.length > 0) ? s.galleryImages : (hasPhoto ? [s.imageUrl] : []);
    const mainImgId = `main_img_${s.id || idx}`;

    const stampKey = `haru_stamp_${currentChild}_${s.id}`;
    let savedStamp = null;
    try {
      const raw = localStorage.getItem(stampKey);
      if (raw) savedStamp = JSON.parse(raw);
    } catch(e) {}

    const stampBtns = [
      { emoji: "😆", label: "꿀잼" },
      { emoji: "😲", label: "신기해" },
      { emoji: "🧺", label: "뿌듯해" },
      { emoji: "😋", label: "고소해" }
    ];

    const titleRowHtml = `
      <div class="special-card-title-row">
        <div class="special-card-title" id="title_display_${s.id}">${s.title}</div>
        <button class="title-edit-btn" onclick="toggleEditTitle(event, '${s.id}')" title="제목 직접 수정하기">✏️</button>
      </div>
      <div id="title_edit_box_${s.id}" class="title-edit-row" style="display:none;" onclick="event.stopPropagation();">
        <input type="text" id="title_edit_input_${s.id}" class="title-edit-input" value="${s.title}" placeholder="새로운 제목 입력" onkeydown="if(event.key==='Enter') saveEditedTitle(event, '${s.id}')" />
        <button class="title-save-btn" onclick="saveEditedTitle(event, '${s.id}')">저장</button>
        <button class="title-cancel-btn" onclick="toggleEditTitle(event, '${s.id}')">취소</button>
      </div>
    `;

    const stampHtml = `
      <div class="special-card-reactions">
        <div class="reaction-label">
          <span>💮 ${childName}의 감정 도장:</span>
          ${savedStamp ? `<span style="font-size:0.75rem; color:#2ed573;">완성됨 ✨</span>` : `<span style="font-size:0.75rem; color:#888;">도장 찍고 젤리 받기 🍬</span>`}
        </div>
        <div class="reaction-btns">
          ${stampBtns.map(st => {
            const isSelected = savedStamp && savedStamp.label === st.label;
            return `<button class="reaction-stamp-btn ${isSelected ? 'selected' : ''}" onclick="stampReaction(event, '${s.id}', '${st.emoji}', '${st.label}', '${s.title}')">${st.emoji} ${st.label}</button>`;
          }).join("")}
          <button class="reaction-stamp-btn custom-btn" onclick="toggleCustomStampInput(event, '${s.id}')" title="내 느낌 직접 쓰기">✏️ 직접 쓰기</button>
        </div>
        <div id="custom_stamp_row_${s.id}" class="custom-stamp-input-row" style="display:none;" onclick="event.stopPropagation();">
          <input type="text" id="custom_stamp_input_${s.id}" class="custom-stamp-input" placeholder="나만의 느낌 쓰기 (예: 너무 재밌었어!)" maxlength="15" onkeydown="if(event.key==='Enter') submitCustomStamp(event, '${s.id}', '${s.title}')" />
          <button class="custom-stamp-submit-btn" onclick="submitCustomStamp(event, '${s.id}', '${s.title}')">도장 쾅! 💮</button>
        </div>
        ${savedStamp ? `<div class="reaction-stamp-badge"><span>💖</span> <b>${childName}의 소감:</b> [${savedStamp.emoji} ${savedStamp.label}!] (${savedStamp.date})</div>` : ''}
      </div>
    `;

    const videoList = (s.videos && Array.isArray(s.videos) && s.videos.length > 0)
      ? s.videos
      : (s.videoUrl ? [{ url: s.videoUrl, text: s.videoBtnText, icon: "🎬" }] : []);

    let videoBtnHtml = "";
    if (videoList.length > 0) {
      videoBtnHtml = `
        <div class="special-card-video-wrap" style="display:flex; flex-direction:column; gap:8px;" onclick="event.stopPropagation();">
          ${videoList.map(v => {
            const label = v.text || (v.url && v.url.includes("photos.app.goo.gl") ? "구글 포토 영상 보러가기" : "동영상 보러가기");
            const icon = v.icon || "🎬";
            return `
              <a href="${v.url}" target="_blank" rel="noopener noreferrer" class="special-card-video-btn" title="동영상 감상하기 (구글 포토/유튜브/드라이브)">
                <div class="video-btn-left">
                  <span class="video-btn-icon">${icon}</span>
                  <span class="video-btn-text">${label}</span>
                </div>
                <span class="video-btn-badge">고화질 재생 ➔</span>
              </a>
            `;
          }).join("")}
        </div>
      `;
    }

    if (hasPhoto) {
      const thumbsHtml = galleryList.length > 1 ? `
        <div class="special-card-thumbs">
          ${galleryList.map((gUrl, gIdx) => `
            <button class="special-card-thumb-btn ${gIdx === 0 ? 'active' : ''}" onclick="switchCardPhoto(event, this, '${gUrl}', '${mainImgId}')" title="사진 ${gIdx + 1}">
              <img src="${gUrl}" alt="썸네일 ${gIdx + 1}" />
            </button>
          `).join("")}
        </div>
      ` : "";

      return `
        <div class="special-card has-photo" id="special_card_${s.id}" onclick="toggleSpeakStoryText('${s.id}', '${s.title}', '${s.desc}')" title="터치하면 이야기 낭독 / 다시 터치하면 멈춤 ⏹️">
          <div class="special-card-img-wrap" onclick="event.stopPropagation(); openSpecialPhotoModal('${s.id}', '${mainImgId}')" title="터치하면 사진을 팝업으로 전체 감상해요 🔍">
            <span class="special-card-category-chip">${categoryIcon} ${category}</span>
            ${galleryList.length > 1 ? `<span class="special-card-photo-count">📷 사진 ${galleryList.length}장</span>` : ''}
            ${videoList.length > 0 ? `<span class="special-card-video-chip">🎬 영상 ${videoList.length > 1 ? `${videoList.length}편 ` : ''}포함</span>` : ''}
            <span class="special-card-zoom-chip">🔍 전체보기</span>
            <img id="${mainImgId}" src="${s.imageUrl}" class="special-card-img" alt="${s.title}" onerror="this.parentElement.style.display='none';" />
          </div>
          ${thumbsHtml}
          ${titleRowHtml}
          <div class="special-card-date">📅 ${s.date || '특별한 날'}</div>
          <p class="special-card-desc">${s.desc}</p>
          ${videoBtnHtml}
          ${stampHtml}
        </div>
      `;
    }

    return `
      <div class="special-card" id="special_card_${s.id}" onclick="toggleSpeakStoryText('${s.id}', '${s.title}', '${s.desc}')" title="터치하면 이야기 낭독 / 다시 터치하면 멈춤 ⏹️">
        <div class="special-card-icon">${s.icon || '🌟'}</div>
        ${titleRowHtml}
        <div class="special-card-date">📅 ${s.date || '특별한 날'}</div>
        <p class="special-card-desc">${s.desc}</p>
        ${videoBtnHtml}
        ${stampHtml}
      </div>
    `;
  }).join("");
}

function updateSpeakingCardUi() {
  document.querySelectorAll(".special-card").forEach(el => {
    const badge = el.querySelector(".card-speaking-badge");
    if (badge) badge.remove();
    el.classList.remove("is-speaking");
  });
  if (currentSpeakingCardId) {
    const activeEl = document.getElementById(`special_card_${currentSpeakingCardId}`);
    if (activeEl) {
      activeEl.classList.add("is-speaking");
      const badge = document.createElement("div");
      badge.className = "card-speaking-badge";
      badge.innerHTML = `<span>🔊 낭독 중</span> <span>(터치 시 멈춤 ⏹️)</span>`;
      activeEl.appendChild(badge);
    }
  }
}

function toggleSpeakStoryText(cardId, title, desc) {
  // 💡 이미 이 카드가 낭독 중일 때 다시 누르면 즉시 음성 중단! (피로도 방지 토글)
  if (currentSpeakingCardId === cardId && isHaruSpeaking) {
    stopAllSpeech(true);
    return;
  }

  // 이전 음성 중단 후 새 카드 낭독 시작
  stopAllSpeech();
  currentSpeakingCardId = cardId;
  updateSpeakingCardUi();

  const cleanTitle = title ? title.replace(/^[^\w가-힣\s]+/, '').trim() : '';
  speakText(`${cleanTitle}! ${desc}`, () => {
    if (currentSpeakingCardId === cardId) {
      currentSpeakingCardId = null;
      updateSpeakingCardUi();
    }
  });
}

function speakStoryText(title, desc) {
  toggleSpeakStoryText('temp_' + Date.now(), title, desc);
}

function addNewSpecialStory() {
  const catInput = document.getElementById("newStoryCategory");
  const titleInput = document.getElementById("newStoryTitle");
  const dateInput = document.getElementById("newStoryDate");
  const descInput = document.getElementById("newStoryDesc");
  const fileInput = document.getElementById("newStoryFileInput");
  const urlInput = document.getElementById("newStoryUrlInput");
  const videoInput = document.getElementById("newStoryVideoInput");

  if (!titleInput || !descInput) return;

  const category = catInput ? catInput.value : "특별한날";
  const title = titleInput.value.trim();
  const date = dateInput && dateInput.value.trim() ? dateInput.value.trim() : new Date().toISOString().slice(0, 10);
  const desc = descInput.value.trim();
  const photoUrl = selectedStoryPhotoBase64 || (urlInput ? urlInput.value.trim() : "");
  const videoUrl = videoInput ? videoInput.value.trim() : "";

  if (!title || !desc) {
    alert("특별한 날의 제목과 즐거웠던 이야기를 적어주세요! ✏️");
    return;
  }

  const categoryIconMap = {
    "생태/텃밭": "🌱",
    "학교활동": "🎒",
    "가을소풍": "🍁",
    "가족기념일": "🎂",
    "자연관찰": "🌿",
    "특별한날": "⭐"
  };

  const stampPreset = document.getElementById("newStoryStampPreset") ? document.getElementById("newStoryStampPreset").value : "";
  const customStampInput = document.getElementById("newStoryCustomStamp") ? document.getElementById("newStoryCustomStamp").value.trim() : "";

  let initialStamp = null;
  if (stampPreset === "custom" && customStampInput) {
    const emojiMatch = customStampInput.match(/^(\p{Emoji})/u);
    const emoji = emojiMatch ? emojiMatch[1] : "💮";
    const label = emojiMatch ? customStampInput.slice(emoji.length).trim() : customStampInput;
    initialStamp = { emoji: emoji, label: label || customStampInput, date: new Date().toISOString().slice(5, 10).replace("-", "/") };
  } else if (stampPreset && stampPreset !== "custom") {
    const parts = stampPreset.split(" ");
    initialStamp = { emoji: parts[0], label: parts.slice(1).join(" "), date: new Date().toISOString().slice(5, 10).replace("-", "/") };
  }

  const newStoryId = "evt_custom_" + Date.now();
  if (initialStamp) {
    localStorage.setItem(`haru_stamp_${currentChild}_${newStoryId}`, JSON.stringify(initialStamp));
  }

  const stories = getSpecialStories();
  stories.unshift({
    id: newStoryId,
    category: category,
    categoryIcon: categoryIconMap[category] || "⭐",
    title: `✨ ${title}`,
    date: date,
    desc: desc,
    icon: categoryIconMap[category] || "💖",
    imageUrl: photoUrl || null,
    videoUrl: videoUrl || null
  });

  localStorage.setItem("haru_special_stories_" + currentChild, JSON.stringify(stories));
  titleInput.value = "";
  if (dateInput) dateInput.value = "";
  descInput.value = "";
  if (fileInput) fileInput.value = "";
  if (urlInput) urlInput.value = "";
  if (videoInput) videoInput.value = "";
  if (document.getElementById("newStoryCustomStamp")) {
    document.getElementById("newStoryCustomStamp").value = "";
    document.getElementById("newStoryCustomStamp").style.display = "none";
  }
  if (document.getElementById("newStoryStampPreset")) {
    document.getElementById("newStoryStampPreset").value = "😆 꿀잼";
  }
  selectedStoryPhotoBase64 = "";
  const previewBox = document.getElementById("storyImgPreviewBox");
  if (previewBox) previewBox.style.display = "none";

  renderSpecialDaysTab();

  const isMinsu = currentChild === "minsu";
  const curSymbol = isMinsu ? "다이아 2개(+💎💎)" : "젤리 2개(+🍬🍬)";
  const curWord = isMinsu ? "다이아몬드 2개" : "젤리 2개";
  grantReward(2, `특별한 하루 추억 작성: ${title}`);
  speakText(`새로운 특별한 하루 이야기 [${title}]이 우리 게시판에 등록되었어요! ${curWord}를 선물합니다!`);
  alert(`🎉 [${title}] 이야기가 추억 게시판에 등록되었습니다! ${curSymbol}를 받았어요!\n\n💡 팁: 학교 사진을 12년 성장 아카이브(kids-archive)에 영구 보존하려면 [scripts/add_activity_photo.py] 도구를 활용해 보세요!`);
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

// 📅 로컬 타임존(한국 KST) 기준 날짜 생성 헬퍼 (YYYY-MM-DD)
function getTodayDateStr() {
  const d = new Date();
  const kst = new Date(d.getTime() + (9 * 60 + d.getTimezoneOffset()) * 60000);
  return `${kst.getFullYear()}-${String(kst.getMonth() + 1).padStart(2, '0')}-${String(kst.getDate()).padStart(2, '0')}`;
}

function getTodayCheckInKey() {
  return `haru_checkin_done_${getTodayDateStr()}_${currentChild}`;
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
  localStorage.setItem("haru_last_checkin_date_" + currentChild, getTodayDateStr());

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
          <span style="font-size:1.5rem;">🐷</span>
          <div>
            <div style="font-size:0.8rem; color:#888;">오늘 실천한 착한 습관</div>
            <strong style="color:var(--dark);">${habit.name}</strong>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:1.5rem;">💪</span>
          <div>
            <div style="font-size:0.8rem; color:#888;">오늘 실천한 튼튼 운동</div>
            <strong style="color:var(--dark);">${workout.name}</strong>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:1.5rem;">${mood.icon}</span>
          <div>
            <div style="font-size:0.8rem; color:#888;">오늘 마음 날씨</div>
            <strong style="color:${mood.color};">${mood.mood}</strong> <span style="font-size:0.85rem; color:#666;">(${mood.desc})</span>
          </div>
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
  const todayStr = getTodayDateStr();
  const childTitle = currentChild === "minseo" ? "민서" : "민수";
  const nowIso = new Date().toISOString();

  const payload = {
    parent: { database_id: dbId },
    properties: {
      "ID": {
        title: [{ text: { content: `🏆 [마일스톤 완주] ${childTitle}_${milestoneTitle}` } }]
      },
      "학생": { select: { name: childTitle } },
      "과목": { rich_text: [{ text: { content: "하루" } }] },
      "입장": { date: { start: nowIso } },
      "퇴장": { date: { start: nowIso } },
      "오답리포트": {
        rich_text: [{
          text: { content: `🎉 축하합니다! 20칸 착한 습관 저금통을 모두 채웠습니다.\n• 마이룸 [황금 돼지 저금통] 트로피 가구 지급 완료\n• 이번 주말 [가족 소원권] 발급 완료 (부모님 확인 필요)` }
        }]
      },
      "소요시간": { number: 1 },
      "단어요정": { number: 0 }
    }
  };

  try {
    await fetch(`${proxyUrl}/v1/pages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0" },
      body: JSON.stringify(payload)
    });
  } catch(e) {}
}

// 🌐 노션 학습일지 DB 자동 기록
async function sendCheckInToNotion(habit, workout, mood) {
  const proxyUrl = typeof PROXY_URL !== "undefined" ? PROXY_URL : "https://minmin-notion.awslike6.workers.dev";
  const dbId = typeof STUDY_LOG_DB_ID !== "undefined" ? STUDY_LOG_DB_ID : "37aa27115b688001b2ffe5e6c8f82ab2";
  const todayStr = getTodayDateStr();
  const timeStr = new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
  const childTitle = currentChild === "minseo" ? "민서" : "민수";
  const isMinsu = currentChild === "minsu";
  const nowIso = new Date().toISOString();

  const payload = {
    parent: { database_id: dbId },
    properties: {
      "ID": {
        title: [{ text: { content: `${childTitle}_${todayStr} (${isMinsu ? '데일리 루틴 체크인' : '슬기로운 하루 체크인'})` } }]
      },
      "학생": {
        select: { name: childTitle }
      },
      "과목": {
        rich_text: [{ text: { content: isMinsu ? "데일리 루틴" : "하루" } }]
      },
      "입장": {
        date: { start: nowIso }
      },
      "퇴장": {
        date: { start: nowIso }
      },
      "오답리포트": {
        rich_text: [{
          text: {
            content: `[30초 ${isMinsu ? '데일리 루틴' : '하루'} 체크인]\n• 착한습관: ${habit.name}\n• 건강운동: ${workout.name}\n• 마음날씨: ${mood.mood} (${mood.desc}) [${timeStr}]`
          }
        }]
      },
      "감정날씨": {
        rich_text: [{ text: { content: `${mood.icon} ${mood.mood}` } }]
      },
      "소요시간": {
        number: 1
      },
      "단어요정": {
        number: 0
      }
    }
  };

  try {
    await fetch(`${proxyUrl}/v1/pages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0" },
      body: JSON.stringify(payload)
    });
  } catch(e) {
    console.warn("노션 하루 체크인 자동 동기화 예외 (로컬 안전 보존됨):", e);
  }
}

// =========================================================
// 4. [출동! 119 안전 수호대 & 닥터 코코 응급처치 상담소]
// =========================================================
let currentSafetyQuizIndex = 0;
let currentActiveSymptomKey = "scrape";

function getSafetyQuizList() {
  return window.HARU_DATA?.safetyStation?.oxQuizList || [];
}

function renderSafetyQuizQuestion(shouldSpeak = false) {
  const quizList = getSafetyQuizList();
  if (!quizList || quizList.length === 0) return;

  const placeTag = document.getElementById("safetyQuizPlaceTag");
  const progressTag = document.getElementById("safetyQuizProgressTag");
  const questionEl = document.getElementById("safetyQuestionText");
  const feedbackBox = document.getElementById("safetyQuizFeedbackBox");
  const licenseCard = document.getElementById("safetyLicenseCard");
  const oxGroup = document.getElementById("oxBtnGroup");

  if (licenseCard) licenseCard.style.display = "none";
  if (oxGroup) oxGroup.style.display = "grid";
  if (feedbackBox) feedbackBox.style.display = "none";

  const item = quizList[currentSafetyQuizIndex];
  if (!item) return;

  if (placeTag) placeTag.innerText = item.place;
  if (progressTag) progressTag.innerText = `문제 ${currentSafetyQuizIndex + 1} / ${quizList.length}`;
  if (questionEl) questionEl.innerText = item.question;

  // 버튼을 누르거나 다음 문제로 넘어갔을 때만 음성 안내 (첫 진입 시에는 무음)
  if (shouldSpeak) {
    speakText(`${item.place} 안전 수칙이에요! ${item.question}`);
  }
}

// 🔊 안전 퀴즈 문제 음성 다시 듣기
function playSafetyQuizAudio() {
  const quizList = getSafetyQuizList();
  const item = quizList[currentSafetyQuizIndex];
  if (!item) return;
  speakText(`${item.place} 안전 수칙이에요! ${item.question}`);
}

function handleSafetyQuizAnswer(userChoice) {
  const quizList = getSafetyQuizList();
  const item = quizList[currentSafetyQuizIndex];
  if (!item) return;

  const feedbackBox = document.getElementById("safetyQuizFeedbackBox");
  const feedbackTitle = document.getElementById("safetyFeedbackTitle");
  const feedbackDesc = document.getElementById("safetyFeedbackDesc");
  const nextBtn = document.getElementById("safetyQuizNextBtn");
  if (!feedbackBox || !feedbackTitle || !feedbackDesc) return;

  const isCorrect = userChoice === item.answer;

  feedbackBox.style.display = "block";
  feedbackBox.className = "quiz-feedback-box " + (isCorrect ? "correct" : "hint");

  if (isCorrect) {
    playCoinSound();
    feedbackTitle.innerHTML = `<span>✨</span> <span>참 잘했어요! 완벽한 안전 수칙이에요!</span>`;
    feedbackDesc.innerText = item.explain;
    speakText(`딩동댕! ${item.explain}`);
  } else {
    // 무감점 원칙: 오답 스트레스 없이 다정한 안전 팁 안내
    feedbackTitle.innerHTML = `<span>💡</span> <span>코코의 안전 힌트! 이렇게 하면 더 안전해요:</span>`;
    feedbackDesc.innerText = item.explain + (item.tip ? ` (${item.tip})` : "");
    speakText(`괜찮아! ${item.explain}`);
  }

  const isLast = currentSafetyQuizIndex >= quizList.length - 1;
  if (nextBtn) {
    nextBtn.innerText = isLast ? "🏆 황금 안전 지킴이 면허증 받기! ➔" : "다음 안전 수칙으로 ➔";
  }
}

function nextSafetyQuizQuestion() {
  const quizList = getSafetyQuizList();
  if (currentSafetyQuizIndex < quizList.length - 1) {
    currentSafetyQuizIndex++;
    renderSafetyQuizQuestion(true);
  } else {
    renderSafetyLicense();
  }
}

function renderSafetyLicense() {
  const feedbackBox = document.getElementById("safetyQuizFeedbackBox");
  const licenseCard = document.getElementById("safetyLicenseCard");
  const oxGroup = document.getElementById("oxBtnGroup");
  const questionEl = document.getElementById("safetyQuestionText");
  const progressTag = document.getElementById("safetyQuizProgressTag");

  if (feedbackBox) feedbackBox.style.display = "none";
  if (oxGroup) oxGroup.style.display = "none";
  if (questionEl) questionEl.innerText = "🎉 축하합니다! 모든 안전 수칙을 완벽하게 마스터했어요!";
  if (progressTag) progressTag.innerText = "미션 완료 🏅";

  if (licenseCard) {
    licenseCard.style.display = "block";
    const dateEl = document.getElementById("licenseIssueDate");
    if (dateEl) {
      dateEl.innerText = new Date().toISOString().slice(0, 10);
    }
  }

  playCoinSound();
  const childTitle = currentChild === "minsu" ? "민수" : "민서";
  const rewardName = currentChild === "minsu" ? "다이아 5개" : "젤리 5개";

  speakText(`축하합니다! ${childTitle} 어린이가 119 황금 안전 지킴이 면허증을 획득했어요! 보너스 ${rewardName}를 선물로 드립니다!`);
  grantReward(5, "119 안전 수호대 면허증 취득 보너스");

  // 노션 학습일지 자동 전송
  sendSafetyLicenseToNotion();
}

function restartSafetyQuiz() {
  currentSafetyQuizIndex = 0;
  renderSafetyQuizQuestion(true);
}

// 🩺 닥터 코코 365 응급처치 상담소
function selectFirstAidSymptom(key) {
  currentActiveSymptomKey = key;
  document.querySelectorAll(".symptom-chip").forEach(chip => {
    chip.classList.toggle("active", chip.dataset.symptom === key);
  });
  renderFirstAidGuide(key);
}

function renderFirstAidGuide(key) {
  const guides = window.HARU_DATA?.safetyStation?.firstAidGuides;
  if (!guides || !guides[key]) return;

  const guide = guides[key];
  const resultCard = document.getElementById("firstAidResultCard");
  const iconEl = document.getElementById("firstAidIcon");
  const titleEl = document.getElementById("firstAidTitle");
  const badgeEl = document.getElementById("firstAidBadge");
  const cocoSpeech = document.getElementById("cocoVoiceSpeechText");
  const stepsList = document.getElementById("firstAidStepsList");
  const timeTag = document.getElementById("parentNotifiedTimeTag");

  if (iconEl) iconEl.innerText = guide.icon;
  if (titleEl) titleEl.innerText = guide.title;
  if (badgeEl) badgeEl.innerText = guide.badge;
  if (cocoSpeech) cocoSpeech.innerText = `"${guide.cocoSay}"`;

  if (stepsList && guide.steps) {
    stepsList.innerHTML = guide.steps.map(s => `
      <div class="firstaid-step-item">
        <div class="step-num-bubble">${s.step}</div>
        <div class="step-info">
          <div class="step-title">${s.title}</div>
          <div class="step-desc">${s.desc}</div>
        </div>
      </div>
    `).join("");
  }

  const nowTime = new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
  if (timeTag) timeTag.innerText = nowTime;

  if (resultCard) {
    resultCard.style.display = "block";
    resultCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  // 코코의 따뜻한 안내 음성
  speakText(guide.cocoSay);

  // 로컬스토리지에 부모 대시보드 연동용 최신 상담 저장
  const consultationLog = {
    key: guide.id,
    title: guide.title,
    icon: guide.icon,
    badge: guide.badge,
    date: getTodayDateStr(),
    time: nowTime,
    cocoSay: guide.cocoSay
  };
  localStorage.setItem("haru_last_safety_consultation_" + currentChild, JSON.stringify(consultationLog));

  // 노션 학습일지 DB 자동 전송
  sendSafetyConsultationToNotion(guide);
}

function playCurrentFirstAidVoice() {
  const guides = window.HARU_DATA?.safetyStation?.firstAidGuides;
  if (guides && guides[currentActiveSymptomKey]) {
    speakText(guides[currentActiveSymptomKey].cocoSay);
  }
}

function consultDoctorCocoCustom() {
  const input = document.getElementById("customSymptomInput");
  if (!input) return;
  const q = input.value.trim();
  if (!q) {
    speakText("어디가 어떻게 다쳤는지 적어주세요!");
    return;
  }

  let matchedKey = "scrape";
  if (q.includes("부딪") || q.includes("혹") || q.includes("멍") || q.includes("이마")) {
    matchedKey = "bump";
  } else if (q.includes("데였") || q.includes("뜨거") || q.includes("화상") || q.includes("물집")) {
    matchedKey = "burn";
  } else if (q.includes("코피") || q.includes("피가") && q.includes("코")) {
    matchedKey = "nosebleed";
  } else if (q.includes("벌레") || q.includes("모기") || q.includes("가려") || q.includes("물렸")) {
    matchedKey = "bugbite";
  } else if (q.includes("눈") || q.includes("모래") || q.includes("먼지")) {
    matchedKey = "eye";
  }

  selectFirstAidSymptom(matchedKey);
}

// 🌐 노션 학습일지 DB: 면허증 발급 기록
async function sendSafetyLicenseToNotion() {
  const proxyUrl = typeof PROXY_URL !== "undefined" ? PROXY_URL : "https://minmin-notion.awslike6.workers.dev";
  const dbId = typeof STUDY_LOG_DB_ID !== "undefined" ? STUDY_LOG_DB_ID : "37aa27115b688001b2ffe5e6c8f82ab2";
  const todayStr = getTodayDateStr();
  const timeStr = new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
  const childTitle = currentChild === "minseo" ? "민서" : "민수";
  const nowIso = new Date().toISOString();

  const payload = {
    parent: { database_id: dbId },
    properties: {
      "ID": {
        title: [{ text: { content: `${childTitle}_${todayStr} [119 안전수호대] 황금 지킴이 면허증 취득` } }]
      },
      "학생": { select: { name: childTitle } },
      "과목": { rich_text: [{ text: { content: "하루" } }] },
      "입장": { date: { start: nowIso } },
      "퇴장": { date: { start: nowIso } },
      "오답리포트": {
        rich_text: [{
          text: {
            content: `[119 안전 수호대 완주 인증]\n• 획득: 황금 안전 지킴이 면허증 발급 🏆\n• 항목: 학교 복도, 계단, 횡단보도, 날카로운 도구, 놀이터 안전 수칙 6문항 100% 마스터\n• 시간: ${timeStr}\n• 보상: 보너스 +5개 획득`
          }
        }]
      },
      "소요시간": { number: 3 },
      "단어요정": { number: 0 }
    }
  };

  try {
    await fetch(`${proxyUrl}/v1/pages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0" },
      body: JSON.stringify(payload)
    });
  } catch(e) {}
}

// 🌐 노션 학습일지 DB: 닥터 코코 응급 상담 기록
async function sendSafetyConsultationToNotion(guide) {
  const proxyUrl = typeof PROXY_URL !== "undefined" ? PROXY_URL : "https://minmin-notion.awslike6.workers.dev";
  const dbId = typeof STUDY_LOG_DB_ID !== "undefined" ? STUDY_LOG_DB_ID : "37aa27115b688001b2ffe5e6c8f82ab2";
  const todayStr = getTodayDateStr();
  const timeStr = new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
  const childTitle = currentChild === "minseo" ? "민서" : "민수";
  const nowIso = new Date().toISOString();

  const payload = {
    parent: { database_id: dbId },
    properties: {
      "ID": {
        title: [{ text: { content: `${childTitle}_${todayStr} [🚨 닥터 코코 상담] ${guide.title}` } }]
      },
      "학생": { select: { name: childTitle } },
      "과목": { rich_text: [{ text: { content: "하루" } }] },
      "입장": { date: { start: nowIso } },
      "퇴장": { date: { start: nowIso } },
      "오답리포트": {
        rich_text: [{
          text: {
            content: `[닥터 코코 365 안심 응급상담]\n• 증상: ${guide.icon} ${guide.title} (${guide.badge})\n• 처치안내: ${guide.cocoSay}\n• 시간: ${timeStr}\n• 부모 대시보드 실시간 알림 연동 완료`
          }
        }]
      },
      "소요시간": { number: 1 },
      "단어요정": { number: 0 }
    }
  };

  try {
    await fetch(`${proxyUrl}/v1/pages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0" },
      body: JSON.stringify(payload)
    });
  } catch(e) {}
}

// =========================================================
// =========================================================
// 🕰️ 5. 매직 타임머신 시계판 (하루 일과 & 시간 표현, 32~57쪽)
// =========================================================
let currentTimelineDate = getTodayDateStr();
let timelineFilterPeriod = "all";
let selectedCustomEmoji = "⭐";
let clockLiveInterval = null;
let clockHourFormat = localStorage.getItem("haru_clock_format_" + currentChild) || "24"; // "12" or "24"

function getRecurringStorageKey() {
  return `haru_recurring_routine_${currentChild}`;
}

function getDailyStorageKey(dateStr) {
  return `haru_daily_timeline_${currentChild}_${dateStr || currentTimelineDate}`;
}

function getTimelineCompletedKey(dateStr) {
  return `haru_timeline_completed_${currentChild}_${dateStr || currentTimelineDate}`;
}

// 요일 배열(0=일, 1=월, ..., 6=토) 한글 라벨 변환 헬퍼
function formatRepeatDays(days) {
  if (!Array.isArray(days) || days.length === 0 || days.length >= 7) return "매일";
  const sorted = [...days].sort((a, b) => a - b);
  const sStr = sorted.join(",");
  if (sStr === "1,2,3,4,5") return "평일";
  if (sStr === "0,6") return "주말";
  if (sStr === "1,3,5") return "월·수·금";
  if (sStr === "2,4") return "화·목";
  const names = ["일", "월", "화", "수", "목", "금", "토"];
  return sorted.map(d => names[d]).join("·");
}

// 매일 반복되는 고정 루틴 로드
function getRecurringRoutine() {
  const key = getRecurringStorageKey();
  const raw = localStorage.getItem(key);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch(e) {
      return [];
    }
  }

  // 레거시 데이터 마이그레이션: 기존 오늘 날짜 데이터가 있으면 기본 고정 루틴으로 승격
  const oldTodayKey = `haru_timeline_${currentChild}_${getTodayDateStr()}`;
  const oldRaw = localStorage.getItem(oldTodayKey);
  if (oldRaw) {
    try {
      const parsed = JSON.parse(oldRaw).map(it => ({ ...it, isRecurring: true }));
      localStorage.setItem(key, JSON.stringify(parsed));
      return parsed;
    } catch(e) {}
  }

  // 기본 defaultPlan으로 초기화
  if (window.HARU_DATA && window.HARU_DATA.timelineClock && window.HARU_DATA.timelineClock.defaultPlan) {
    const defaults = JSON.parse(JSON.stringify(window.HARU_DATA.timelineClock.defaultPlan)).map(it => ({
      ...it,
      isRecurring: true
    }));
    localStorage.setItem(key, JSON.stringify(defaults));
    return defaults;
  }
  return [];
}

// 매일 반복되는 고정 루틴 저장
function saveRecurringRoutine(items) {
  const key = getRecurringStorageKey();
  localStorage.setItem(key, JSON.stringify(items));
}

// 해당 날짜만의 특별 일정 로드
function getDailyTimelineItems(dateStr) {
  const key = getDailyStorageKey(dateStr);
  const raw = localStorage.getItem(key);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch(e) {
      return [];
    }
  }
  return [];
}

// 해당 날짜만의 특별 일정 저장
function saveDailyTimelineItems(items, dateStr) {
  const key = getDailyStorageKey(dateStr);
  localStorage.setItem(key, JSON.stringify(items));
}

// 통합 일정 조회 (고정 루틴 + 해당 날짜 특별 일정 - 특정 요일 필터링 지원)
function getTimelineItems(dateStr) {
  const targetDate = dateStr || currentTimelineDate;
  const recurring = getRecurringRoutine();
  const daily = getDailyTimelineItems(targetDate);

  // 대상 날짜의 요일 (0: 일, 1: 월, ..., 6: 토)
  const targetDayIdx = (new Date(targetDate + "T00:00:00")).getDay();

  // 고정 루틴 요일 필터링 (매일 반복 or 특정 요일 반복 매칭)
  const matchedRecurring = recurring.filter(it => {
    if (!it.repeatDays || !Array.isArray(it.repeatDays) || it.repeatDays.length === 0 || it.repeatDays.length >= 7) {
      return true; // 매일 반복
    }
    return it.repeatDays.includes(targetDayIdx);
  });

  const combined = [...matchedRecurring, ...daily];
  combined.sort((a, b) => (a.time || "").localeCompare(b.time || ""));
  return combined;
}

// 시계판 12시간 / 24시간 모드 전환
function setClockHourFormat(format) {
  if (format !== "12" && format !== "24") return;
  clockHourFormat = format;
  localStorage.setItem(`haru_clock_format_${currentChild}`, format);

  const btn24 = document.getElementById("clockMode24Btn");
  const btn12 = document.getElementById("clockMode12Btn");
  if (btn24) btn24.classList.toggle("active", format === "24");
  if (btn12) btn12.classList.toggle("active", format === "12");

  const quadsLayer = document.querySelector(".clock-quads-layer");
  if (quadsLayer) {
    quadsLayer.style.opacity = format === "12" ? "0.15" : "1";
  }

  renderClockTicks(true);
  updateLiveClockHands();
  renderClockPins();

  const modeName = format === "12" ? "12시간 표준 시계" : "24시간 매직 시계";
  speakText(`${modeName} 모드로 바꿨어요!`);
}

// 탭 렌더링 진입점
function renderTimelineTab() {
  updateTimelineDateUI();

  // 12h / 24h 토글 버튼 UI 초기화
  const btn24 = document.getElementById("clockMode24Btn");
  const btn12 = document.getElementById("clockMode12Btn");
  if (btn24) btn24.classList.toggle("active", clockHourFormat === "24");
  if (btn12) btn12.classList.toggle("active", clockHourFormat === "12");

  const quadsLayer = document.querySelector(".clock-quads-layer");
  if (quadsLayer) {
    quadsLayer.style.opacity = clockHourFormat === "12" ? "0.15" : "1";
  }

  renderClockBoard();
  renderTimelineList();
  renderStickerTray();
  startClockLiveTimer();
}

// 날짜 네비게이션 UI 업데이트
function updateTimelineDateUI() {
  const dateTextEl = document.getElementById("timelineDateText");
  const starBadgeEl = document.getElementById("timelineStarBadge");
  const completeBtn = document.getElementById("timelineCompleteBtn");
  if (!dateTextEl) return;

  const dateObj = new Date(currentTimelineDate + "T00:00:00");
  const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
  const dayStr = dayNames[dateObj.getDay()] || "";
  const isToday = currentTimelineDate === getTodayDateStr();
  dateTextEl.textContent = `${currentTimelineDate} (${dayStr})${isToday ? " (오늘)" : ""}`;

  const isCompleted = localStorage.getItem(getTimelineCompletedKey()) === "true";
  if (starBadgeEl) {
    starBadgeEl.style.display = isCompleted ? "inline-flex" : "none";
  }

  if (completeBtn) {
    const isMinsu = currentChild === "minsu";
    const curSymbol = isMinsu ? "💎" : "🍬";
    if (isCompleted) {
      completeBtn.classList.add("completed");
      completeBtn.innerHTML = `⭐ 오늘 하루 완성됨! (+2${curSymbol} 획득)`;
    } else {
      completeBtn.classList.remove("completed");
      completeBtn.innerHTML = `✨ 오늘 하루 완성하기 (+2${curSymbol})`;
    }
  }
}

// 날짜 변경 (어제 / 내일)
function changeTimelineDate(delta) {
  const cur = new Date(currentTimelineDate + "T00:00:00");
  cur.setDate(cur.getDate() + delta);
  const y = cur.getFullYear();
  const m = String(cur.getMonth() + 1).padStart(2, "0");
  const d = String(cur.getDate()).padStart(2, "0");
  currentTimelineDate = `${y}-${m}-${d}`;
  renderTimelineTab();
}

// 오늘 날짜로 즉시 이동
function goToTodayTimeline() {
  currentTimelineDate = getTodayDateStr();
  renderTimelineTab();
}

// 시간대 필터링 변경
function filterTimelinePeriod(period) {
  timelineFilterPeriod = period;
  document.querySelectorAll(".period-filter-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.period === period);
  });
  renderClockBoard();
  renderTimelineList();
  renderStickerTray();
}

// 원형 시계판 렌더링
function renderClockBoard() {
  renderClockTicks();
  updateLiveClockHands();
  renderClockPins();
}

/// 24시간 또는 12시간 눈금 레이어 렌더링
function renderClockTicks(force = false) {
  const ticksLayer = document.getElementById("clockTicksLayer");
  if (!ticksLayer) return;
  if (!force && ticksLayer.dataset.format === clockHourFormat && ticksLayer.children.length > 0) return;

  ticksLayer.innerHTML = "";
  ticksLayer.dataset.format = clockHourFormat;

  if (clockHourFormat === "12") {
    // 12시간 표준 아날로그 시계 눈금 (1 ~ 12)
    for (let h = 1; h <= 12; h++) {
      const angleDeg = (h % 12) * 30; // 360도 / 12시간 = 30도/시
      const rad = (angleDeg - 90) * (Math.PI / 180);
      const x = 50 + 43 * Math.cos(rad);
      const y = 50 + 43 * Math.sin(rad);

      const tickEl = document.createElement("div");
      tickEl.className = "clock-tick-mark major";
      tickEl.style.left = `${x.toFixed(2)}%`;
      tickEl.style.top = `${y.toFixed(2)}%`;
      tickEl.innerHTML = `<span>${h}</span>`;
      ticksLayer.appendChild(tickEl);
    }
  } else {
    // 24시간 눈금 (0 ~ 23)
    for (let h = 0; h < 24; h++) {
      const angleDeg = h * 15; // 360도 / 24시간 = 15도/시
      const rad = (angleDeg - 90) * (Math.PI / 180);
      const x = 50 + 43 * Math.cos(rad);
      const y = 50 + 43 * Math.sin(rad);

      const tickEl = document.createElement("div");
      tickEl.className = "clock-tick-mark";
      tickEl.style.left = `${x.toFixed(2)}%`;
      tickEl.style.top = `${y.toFixed(2)}%`;

      if (h % 3 === 0) {
        tickEl.classList.add("major");
        tickEl.innerHTML = `<span>${h}</span>`;
      } else {
        tickEl.classList.add("minor");
      }
      ticksLayer.appendChild(tickEl);
    }
  }
}

// 실시간 시계 바늘 위치 갱신
function updateLiveClockHands() {
  const hourHand = document.getElementById("clockHandHour");
  const minHand = document.getElementById("clockHandMinute");
  const hubTime = document.getElementById("clockHubTime");
  const liveTimeTag = document.getElementById("clockLiveTimeTag");
  if (!hourHand || !minHand) return;

  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();

  let hourAngle = 0;
  let minAngle = minutes * 6; // 360도 / 60분 = 6도/분

  if (clockHourFormat === "12") {
    // 12시간제: 시침은 1시간에 30도, 1분에 0.5도
    hourAngle = (hours % 12) * 30 + (minutes / 60) * 30;
  } else {
    // 24시간제: 시침은 1시간에 15도, 1분에 0.25도
    hourAngle = (hours % 24) * 15 + (minutes / 60) * 15;
  }

  hourHand.style.transform = `rotate(${hourAngle}deg)`;
  minHand.style.transform = `rotate(${minAngle}deg)`;

  if (hubTime) {
    if (clockHourFormat === "12") {
      const ampm = hours < 12 ? "오전" : "오후";
      const h12 = hours % 12 || 12;
      hubTime.textContent = `${ampm} ${h12}시`;
    } else {
      hubTime.textContent = `${hours}시`;
    }
  }
  if (liveTimeTag) {
    const timeFormatted = now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
    liveTimeTag.textContent = `현재 ${timeFormatted}`;
  }
}

// 실시간 시계 타이머 가동 (10초마다 갱신)
function startClockLiveTimer() {
  if (clockLiveInterval) clearInterval(clockLiveInterval);
  clockLiveInterval = setInterval(() => {
    updateLiveClockHands();
  }, 10000);
}

// 시계판 스티커 핀 렌더링 (2중 동심원 지그재그 & 12h/24h 지원)
function renderClockPins() {
  const pinsLayer = document.getElementById("clockPinsLayer");
  if (!pinsLayer) return;
  pinsLayer.innerHTML = "";

  const items = getTimelineItems();
  const filtered = timelineFilterPeriod === "all" 
    ? items 
    : items.filter(it => it.period === timelineFilterPeriod);

  if (!filtered || filtered.length === 0) return;

  const is12H = clockHourFormat === "12";

  // 1. 유효 시간 파싱 및 각도 계산 후 시간순 정렬
  const parsedItems = filtered
    .filter(item => item.time && item.time.includes(":"))
    .map(item => {
      const parts = item.time.split(":");
      const h = parseInt(parts[0], 10) || 0;
      const m = parseInt(parts[1], 10) || 0;
      const totalMinutes = (h % 24) * 60 + m;

      let angleDeg = 0;
      if (is12H) {
        // 12시간 원형: 720분 = 360도 => 1분당 0.5도, 1시간당 30도
        angleDeg = ((h % 12) * 60 + m) * 0.5;
      } else {
        // 24시간 원형: 1440분 = 360도 => 1분당 0.25도, 1시간당 15도
        angleDeg = totalMinutes * 0.25;
      }
      return { item, h, m, totalMinutes, angleDeg };
    })
    .sort((a, b) => a.totalMinutes - b.totalMinutes);

  // 2. 2중 지그재그 트랙 (외곽 36.5% / 내곽 25.5% / 보조 18.5%)
  const placedPins = [];

  parsedItems.forEach((entry) => {
    const { item, h, m, angleDeg } = entry;
    const radAngle = (angleDeg - 90) * (Math.PI / 180);

    let candidateRadii;
    if (is12H) {
      // 12시간 모드: 오전(h < 12)은 내곽 우선, 오후(h >= 12)는 외곽 우선
      const isAM = h < 12;
      candidateRadii = isAM 
        ? [25.5, 36.5, 18.5, 31.0] 
        : [36.5, 25.5, 31.0, 18.5];
    } else {
      // 24시간 모드: 30분대는 내곽, 정각대는 외곽
      const isThirtyish = (m >= 15 && m < 45);
      candidateRadii = isThirtyish 
        ? [25.5, 36.5, 18.5, 31.0] 
        : [36.5, 25.5, 31.0, 18.5];
    }

    let chosenRadius = candidateRadii[0];
    let bestDist = -1;

    // 이미 배치된 핀들과의 거리(%) 계산하여 겹치지 않는(최소 9.5% 이상) 최적 반경 선택
    for (let r of candidateRadii) {
      const curX = 50 + r * Math.cos(radAngle);
      const curY = 50 + r * Math.sin(radAngle);

      let minDistance = 9999;
      for (let p of placedPins) {
        const dist = Math.hypot(curX - p.x, curY - p.y);
        if (dist < minDistance) minDistance = dist;
      }

      if (minDistance >= 9.5) {
        chosenRadius = r;
        bestDist = minDistance;
        break;
      } else if (minDistance > bestDist) {
        bestDist = minDistance;
        chosenRadius = r;
      }
    }

    const finalX = 50 + chosenRadius * Math.cos(radAngle);
    const finalY = 50 + chosenRadius * Math.sin(radAngle);

    placedPins.push({ x: finalX, y: finalY, item });

    const pinEl = document.createElement("div");
    pinEl.className = `clock-pin-badge period-${item.period || 'lunch'}`;
    pinEl.style.left = `${finalX.toFixed(2)}%`;
    pinEl.style.top = `${finalY.toFixed(2)}%`;

    if (finalY < 22) {
      pinEl.classList.add("pop-down");
    }

    // 12시간제 시간 라벨 및 반복 뱃지
    const ampmStr = h < 12 ? "오전" : "오후";
    const h12 = h % 12 || 12;
    const timeDisplay = is12H 
      ? `${ampmStr} ${h12}:${String(m).padStart(2, "0")}` 
      : item.time;
    let repeatLabel = "📅 오늘";
    if (item.isRecurring) {
      if (item.repeatDays && Array.isArray(item.repeatDays) && item.repeatDays.length > 0 && item.repeatDays.length < 7) {
        repeatLabel = `🏫 ${formatRepeatDays(item.repeatDays)}`;
      } else {
        repeatLabel = "🔄 매일";
      }
    }

    pinEl.innerHTML = `
      <span class="pin-icon">${item.icon || "⭐"}</span>
      <div class="pin-pop-tooltip">
        <span class="pin-pop-time">⏰ ${timeDisplay} · ${repeatLabel}</span>
        <span class="pin-pop-title">${item.icon || "⭐"} ${item.title}</span>
        ${item.memo ? `<span class="pin-pop-memo">💭 ${item.memo}</span>` : ""}
      </div>
    `;

    pinEl.addEventListener("click", (e) => {
      e.stopPropagation();
      const allPins = pinsLayer.querySelectorAll(".clock-pin-badge");
      allPins.forEach(p => { if (p !== pinEl) p.classList.remove("active"); });
      pinEl.classList.toggle("active");

      speakTimelineItem(item);
    });

    pinsLayer.appendChild(pinEl);
  });

  if (!window._clockPinGlobalClickBound) {
    window._clockPinGlobalClickBound = true;
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".clock-pin-badge")) {
        document.querySelectorAll(".clock-pin-badge.active").forEach(p => p.classList.remove("active"));
      }
    });
  }
}

// 타임라인 리스트 렌더링
function renderTimelineList() {
  const scrollContainer = document.getElementById("timelineCardsScroll");
  const countChip = document.getElementById("timelineCountChip");
  if (!scrollContainer) return;

  const items = getTimelineItems();
  items.sort((a, b) => (a.time || "").localeCompare(b.time || ""));

  if (countChip) {
    countChip.textContent = `${items.length}개`;
  }

  const filtered = timelineFilterPeriod === "all"
    ? items
    : items.filter(it => it.period === timelineFilterPeriod);

  if (filtered.length === 0) {
    scrollContainer.innerHTML = `
      <div class="timeline-empty-card">
        <span class="empty-icon">🎨</span>
        <div class="empty-title">등록된 일과가 아직 없어요</div>
        <div class="empty-desc">아래의 추천 스티커 보관함에서 스티커를 쏙 붙이거나,<br><b>[✏️ 나만의 일과 직접 쓰기]</b>로 등록해 보세요!</div>
      </div>
    `;
    return;
  }

  const periodMap = {
    morning: { label: "아침" },
    lunch: { label: "점심" },
    evening: { label: "저녁" },
    night: { label: "밤" }
  };

  const isToday = currentTimelineDate === getTodayDateStr();

  scrollContainer.innerHTML = filtered.map(item => {
    const pMeta = periodMap[item.period] || { label: "일과" };
    const isRec = !!item.isRecurring;
    return `
      <div class="timeline-card-item period-${item.period || 'lunch'}" data-id="${item.id}">
        <!-- 좌측: 시간 영역 및 반복 배지 -->
        <div class="timeline-card-time-col">
          <div class="timeline-badge-group">
            <span class="timeline-period-badge ${item.period || 'lunch'}">${pMeta.label}</span>
            ${isRec 
              ? (item.repeatDays && Array.isArray(item.repeatDays) && item.repeatDays.length > 0 && item.repeatDays.length < 7
                  ? `<span class="item-repeat-chip days" title="매주 ${formatRepeatDays(item.repeatDays)} 반복되는 학원/고정 일정">🏫 ${formatRepeatDays(item.repeatDays)}</span>`
                  : `<span class="item-repeat-chip recurring" title="매일 반복되는 고정 루틴">🔄 매일</span>`)
              : `<span class="item-repeat-chip daily" title="이 날만의 특별 일정">📅 ${isToday ? "오늘" : "이날"}</span>`}
          </div>
          <div class="timeline-time-input-wrap" title="시간을 콕 눌러 원하는 시간으로 변경해요">
            <span class="time-prefix-icon">⏰</span>
            <input type="time" class="timeline-time-input" value="${item.time || '12:00'}" 
                   onchange="updateTimelineItemTime('${item.id}', this.value)"
                   onclick="event.stopPropagation()">
          </div>
        </div>

        <!-- 중앙: 아이콘 + 제목 + 메모 -->
        <div class="timeline-card-body" onclick="speakTimelineItemById('${item.id}')">
          <span class="timeline-card-icon">${item.icon || "⭐"}</span>
          <div class="timeline-card-info">
            <div class="timeline-card-title">${item.title}</div>
            ${item.memo ? `<div class="timeline-card-memo">💭 ${item.memo}</div>` : ""}
          </div>
        </div>

        <!-- 우측: 액션 버튼들 -->
        <div class="timeline-card-actions">
          <button type="button" class="timeline-icon-btn audio-btn" onclick="speakTimelineItemById('${item.id}')" title="요정 코코에게 듣기">
            🔊
          </button>
          <button type="button" class="timeline-icon-btn delete-btn" onclick="removeTimelineItem('${item.id}')" title="일정 삭제하기">
            ✖
          </button>
        </div>
      </div>
    `;
  }).join("");
}

// 기존 카드에서 시간 임의 직접 수정
function updateTimelineItemTime(id, newTime) {
  if (!newTime || !newTime.includes(":")) return;

  const recurring = getRecurringRoutine();
  const daily = getDailyTimelineItems(currentTimelineDate);

  const parts = newTime.split(":");
  const h = parseInt(parts[0], 10) || 0;
  let newPeriod = "lunch";
  if (h >= 6 && h < 12) newPeriod = "morning";
  else if (h >= 12 && h < 17) newPeriod = "lunch";
  else if (h >= 17 && h < 21) newPeriod = "evening";
  else newPeriod = "night";

  let foundTitle = "일과";

  const recIdx = recurring.findIndex(it => it.id === id);
  if (recIdx !== -1) {
    recurring[recIdx].time = newTime;
    recurring[recIdx].period = newPeriod;
    foundTitle = recurring[recIdx].title;
    saveRecurringRoutine(recurring);
  } else {
    const dailyIdx = daily.findIndex(it => it.id === id);
    if (dailyIdx !== -1) {
      daily[dailyIdx].time = newTime;
      daily[dailyIdx].period = newPeriod;
      foundTitle = daily[dailyIdx].title;
      saveDailyTimelineItems(daily, currentTimelineDate);
    }
  }

  renderClockBoard();
  renderTimelineList();
  speakText(`${foundTitle} 시간을 ${newTime}으로 바꿨어요! ✨`);
}

// 추천 스티커 보관함 렌더링
function renderStickerTray() {
  const trayGrid = document.getElementById("stickerTrayGrid");
  if (!trayGrid || !window.HARU_DATA || !window.HARU_DATA.timelineClock) return;

  const stickers = window.HARU_DATA.timelineClock.stickers || [];
  const filtered = timelineFilterPeriod === "all"
    ? stickers
    : stickers.filter(s => s.period === timelineFilterPeriod);

  trayGrid.innerHTML = filtered.map(s => `
    <button type="button" class="sticker-chip-btn" onclick="addTimelineItemFromSticker('${s.id}')" title="${s.time} ${s.title}">
      <span class="sticker-chip-icon">${s.icon}</span>
      <span class="sticker-chip-text">${s.title}</span>
      <span class="sticker-chip-time">${s.time}</span>
    </button>
  `).join("");
}

// 스티커 보관함에서 쏙 붙이기 (당일 일정으로 추가)
function addTimelineItemFromSticker(stickerId) {
  if (!window.HARU_DATA || !window.HARU_DATA.timelineClock) return;
  const sticker = window.HARU_DATA.timelineClock.stickers.find(s => s.id === stickerId);
  if (!sticker) return;

  const dailyItems = getDailyTimelineItems(currentTimelineDate);
  const newItem = {
    id: `daily_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    time: sticker.time,
    title: sticker.title,
    icon: sticker.icon,
    period: sticker.period,
    memo: sticker.speech || "",
    isRecurring: false
  };

  dailyItems.push(newItem);
  saveDailyTimelineItems(dailyItems, currentTimelineDate);

  renderClockBoard();
  renderTimelineList();

  const speechText = sticker.speech || `${sticker.time}! ${sticker.title} 스티커를 쏙 붙였어요!`;
  speakText(speechText);
}

// 스티커 아이템 음성 안내 및 시계 바늘 가리키기 (12h/24h 지원)
function speakTimelineItem(item) {
  if (!item) return;
  const speechText = item.memo || `${item.time}! ${item.title} 시간이에요!`;
  speakText(speechText);

  const hourHand = document.getElementById("clockHandHour");
  const minHand = document.getElementById("clockHandMinute");
  if (hourHand && minHand && item.time) {
    const parts = item.time.split(":");
    const h = parseInt(parts[0], 10) || 0;
    const m = parseInt(parts[1], 10) || 0;

    let hAngle = 0;
    let mAngle = m * 6;

    if (clockHourFormat === "12") {
      hAngle = (h % 12) * 30 + (m / 60) * 30;
    } else {
      hAngle = (h % 24) * 15 + (m / 60) * 15;
    }

    hourHand.style.transform = `rotate(${hAngle}deg)`;
    minHand.style.transform = `rotate(${mAngle}deg)`;

    setTimeout(() => {
      updateLiveClockHands();
    }, 3000);
  }
}

function speakTimelineItemById(id) {
  const items = getTimelineItems();
  const found = items.find(it => it.id === id);
  if (found) speakTimelineItem(found);
}

// 스티커 제거 (고정 일정 vs 당일 일정 분기 삭제)
function removeTimelineItem(id) {
  const recurring = getRecurringRoutine();
  const daily = getDailyTimelineItems(currentTimelineDate);

  const recItem = recurring.find(it => it.id === id);
  if (recItem) {
    const daysLabel = (recItem.repeatDays && Array.isArray(recItem.repeatDays) && recItem.repeatDays.length > 0 && recItem.repeatDays.length < 7)
      ? `매주 ${formatRepeatDays(recItem.repeatDays)} 고정 일정`
      : "매일 반복되는 고정 일정";
    if (!confirm(`'${recItem.title}'은 ${daysLabel}이에요.\n고정 일정에서 완전히 삭제할까요?`)) return;
    const updated = recurring.filter(it => it.id !== id);
    saveRecurringRoutine(updated);
    speakText(`'${recItem.title}' 고정 일정을 삭제했어요.`);
  } else {
    const dailyItem = daily.find(it => it.id === id);
    const title = dailyItem ? dailyItem.title : "일과";
    if (!confirm(`'${title}' 스티커를 시계판에서 뗄까요?`)) return;
    const updated = daily.filter(it => it.id !== id);
    saveDailyTimelineItems(updated, currentTimelineDate);
    speakText(`'${title}' 스티커를 뗐어요! 언제든 다시 붙일 수 있어요.`);
  }

  renderClockBoard();
  renderTimelineList();
}

// 나만의 일과 모달: 일정 종류 선택 토글 (당일 vs 매일 반복 vs 특정 요일)
function selectScheduleType(type) {
  const typeInput = document.getElementById("customItemScheduleType");
  if (typeInput) typeInput.value = type;

  const dailyBtn = document.getElementById("schedTypeDailyBtn");
  const recBtn = document.getElementById("schedTypeRecurringBtn");
  const daysBtn = document.getElementById("schedTypeDaysBtn");
  const daysBox = document.getElementById("customDaysSelectorBox");

  if (dailyBtn) dailyBtn.classList.toggle("active", type === "daily");
  if (recBtn) recBtn.classList.toggle("active", type === "recurring");
  if (daysBtn) daysBtn.classList.toggle("active", type === "days");

  if (daysBox) {
    daysBox.style.display = type === "days" ? "block" : "none";
  }

  // 특정 요일 선택 시, 아무 요일도 선택되어 있지 않다면 현재 선택 날짜의 요일 기본 활성화
  if (type === "days") {
    const activeChips = document.querySelectorAll("#customWeekdayChipsRow .weekday-chip.active");
    if (activeChips.length === 0) {
      const curDay = (new Date(currentTimelineDate + "T00:00:00")).getDay();
      const targetChip = document.querySelector(`#customWeekdayChipsRow .weekday-chip[data-day="${curDay}"]`);
      if (targetChip) targetChip.classList.add("active");
    }
  }
}

// 요일 칩 개별 토글
function toggleWeekdayChip(btn) {
  if (!btn) return;
  btn.classList.toggle("active");
}

// 요일 프리셋 일괄 설정 (평일, 월수금, 화목, 주말)
function setDaysPreset(preset) {
  const chips = document.querySelectorAll("#customWeekdayChipsRow .weekday-chip");
  chips.forEach(chip => {
    const day = parseInt(chip.dataset.day, 10);
    let shouldActive = false;
    if (preset === "weekdays") {
      shouldActive = (day >= 1 && day <= 5);
    } else if (preset === "mwf") {
      shouldActive = (day === 1 || day === 3 || day === 5);
    } else if (preset === "tt") {
      shouldActive = (day === 2 || day === 4);
    } else if (preset === "weekend") {
      shouldActive = (day === 0 || day === 6);
    }
    chip.classList.toggle("active", shouldActive);
  });
}

// 나만의 일과 직접 쓰기 모달 열기 (정상 active 클래스 적용)
function openCustomTimelineModal() {
  const modal = document.getElementById("customTimelineModalOverlay");
  if (!modal) return;

  const now = new Date();
  const h = String(now.getHours()).padStart(2, "0");
  const m = String(now.getMinutes()).padStart(2, "0");

  const timeInput = document.getElementById("customItemTimeInput");
  if (timeInput) timeInput.value = `${h}:${m}`;

  const periodSelect = document.getElementById("customItemPeriodSelect");
  if (periodSelect) {
    const hourNum = now.getHours();
    if (hourNum >= 6 && hourNum < 12) periodSelect.value = "morning";
    else if (hourNum >= 12 && hourNum < 17) periodSelect.value = "lunch";
    else if (hourNum >= 17 && hourNum < 21) periodSelect.value = "evening";
    else periodSelect.value = "night";
  }

  const titleInput = document.getElementById("customItemTitleInput");
  if (titleInput) titleInput.value = "";

  const memoInput = document.getElementById("customItemMemoInput");
  if (memoInput) memoInput.value = "";

  selectScheduleType("daily");
  document.querySelectorAll("#customWeekdayChipsRow .weekday-chip").forEach(c => c.classList.remove("active"));

  selectedCustomEmoji = "⭐";
  document.querySelectorAll("#customEmojiRow .emoji-opt").forEach((opt, idx) => {
    opt.classList.toggle("active", idx === 0);
  });

  modal.classList.add("active");
  document.body.style.overflow = "hidden";
  speakText("어떤 멋진 일을 했나요? 나만의 스티커를 만들어봐요!");
}

// 모달 닫기
function closeCustomTimelineModal() {
  const modal = document.getElementById("customTimelineModalOverlay");
  if (modal) modal.classList.remove("active");
  document.body.style.overflow = "auto";
}

// 모달 이모지 선택
function selectCustomEmoji(el, emoji) {
  document.querySelectorAll("#customEmojiRow .emoji-opt").forEach(opt => opt.classList.remove("active"));
  el.classList.add("active");
  selectedCustomEmoji = emoji;
}

// 나만의 일과 저장 (고정 일정 vs 당일 일정 분기 저장)
function saveCustomTimelineItem() {
  const titleInput = document.getElementById("customItemTitleInput");
  const timeInput = document.getElementById("customItemTimeInput");
  const periodSelect = document.getElementById("customItemPeriodSelect");
  const memoInput = document.getElementById("customItemMemoInput");
  const typeInput = document.getElementById("customItemScheduleType");

  const title = (titleInput ? titleInput.value : "").trim();
  if (!title) {
    alert("어떤 일을 했는지 제목을 입력해 주세요! ✨");
    if (titleInput) titleInput.focus();
    return;
  }

  const time = (timeInput ? timeInput.value : "") || "12:00";
  const period = (periodSelect ? periodSelect.value : "") || "lunch";
  const memo = (memoInput ? memoInput.value : "").trim();
  const scheduleType = (typeInput ? typeInput.value : "daily");

  let repeatDays = [];
  if (scheduleType === "days") {
    const activeChips = document.querySelectorAll("#customWeekdayChipsRow .weekday-chip.active");
    activeChips.forEach(c => {
      const d = parseInt(c.dataset.day, 10);
      if (!isNaN(d)) repeatDays.push(d);
    });
    repeatDays.sort((a, b) => a - b);

    if (repeatDays.length === 0) {
      alert("반복할 요일을 하나 이상 선택해 주세요! 🏫");
      return;
    }
  }

  const isRecurring = (scheduleType === "recurring" || scheduleType === "days");

  const newItem = {
    id: `${scheduleType}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    time: time,
    title: title,
    icon: selectedCustomEmoji || "⭐",
    period: period,
    memo: memo,
    isRecurring: isRecurring,
    ...(scheduleType === "days" ? { repeatDays } : {})
  };

  if (isRecurring) {
    const recurring = getRecurringRoutine();
    recurring.push(newItem);
    saveRecurringRoutine(recurring);
  } else {
    const daily = getDailyTimelineItems(currentTimelineDate);
    daily.push(newItem);
    saveDailyTimelineItems(daily, currentTimelineDate);
  }

  closeCustomTimelineModal();
  renderClockBoard();
  renderTimelineList();

  let typeDesc = "오늘의 특별 일정으로";
  if (scheduleType === "recurring") {
    typeDesc = "매일 반복되는 고정 루틴으로";
  } else if (scheduleType === "days") {
    typeDesc = `매주 ${formatRepeatDays(repeatDays)} 고정 일정으로`;
  }
  speakText(`${time}! ${title} 스티커를 ${typeDesc} 찰칵 붙였어요! 멋져요!`);
}

// 오늘 하루 완성하기 (보상 + 노션 연동)
async function completeTodayTimeline() {
  const items = getTimelineItems();
  if (items.length < 3) {
    alert("하루 일과 스티커를 3개 이상 붙이고 완성해 볼까요? ✨");
    speakText("스티커를 3개 이상 붙이고 완성 버튼을 눌러주세요!");
    return;
  }

  const completedKey = getTimelineCompletedKey();
  if (localStorage.getItem(completedKey) === "true") {
    alert("이미 오늘 하루 일과를 멋지게 완성했어요! ⭐");
    speakText("이미 오늘 하루 일과를 완성했어요! 참 잘했어요!");
    return;
  }

  // 완료 기록
  localStorage.setItem(completedKey, "true");

  // 보상 지급 (+2🍬/💎)
  const isMinsu = currentChild === "minsu";
  const rewardCur = isMinsu ? "다이아몬드 2개" : "캔디 2개";
  grantReward(2, "하루 24시간 매직 시계판 일과 완성");

  // 축하 음성
  const childName = isMinsu ? "민수" : "민서";
  const congratsMsg = `와아! 오늘 하루 일과를 멋지게 완성했구나! 규칙적인 멋진 하루를 보낸 ${childName}에게 ${rewardCur}를 선물할게!`;
  speakText(congratsMsg);

  // UI 즉시 갱신
  updateTimelineDateUI();

  // 노션 학습일지 DB 비동기 전송
  await sendTimelineToNotion(items);
}

// 🌐 노션 학습일지 DB: 24시간 타임머신 일과 완성 기록
async function sendTimelineToNotion(items) {
  const proxyUrl = typeof PROXY_URL !== "undefined" ? PROXY_URL : "https://minmin-notion.awslike6.workers.dev";
  const dbId = typeof STUDY_LOG_DB_ID !== "undefined" ? STUDY_LOG_DB_ID : "37aa27115b688001b2ffe5e6c8f82ab2";
  const todayStr = currentTimelineDate || getTodayDateStr();
  const childTitle = currentChild === "minseo" ? "민서" : "민수";
  const nowIso = new Date().toISOString();

  // 일과 텍스트 요약 생성
  const sortedItems = [...items].sort((a, b) => (a.time || "").localeCompare(b.time || ""));
  const itemsSummary = sortedItems.map(it => `• [${it.time}] ${it.icon || ""} ${it.title}${it.memo ? ` - ${it.memo}` : ""}`).join("\n");

  const payload = {
    parent: { database_id: dbId },
    properties: {
      "ID": {
        title: [{ text: { content: `${childTitle}_${todayStr} [24시간 타임머신] 일과 기록 완성` } }]
      },
      "학생": { select: { name: childTitle } },
      "과목": { rich_text: [{ text: { content: "하루" } }] },
      "입장": { date: { start: nowIso } },
      "퇴장": { date: { start: nowIso } },
      "오답리포트": {
        rich_text: [{
          text: {
            content: `[🕰️ 24시간 매직 타임머신 시계판 일과 완성]\n• 기록 일자: ${todayStr}\n• 등록 일과 수: ${items.length}개\n• 세부 일과 내역:\n${itemsSummary}\n• 완료 보상: +2${childTitle === "민수" ? "💎" : "🍬"}`
          }
        }]
      },
      "소요시간": { number: 2 },
      "단어요정": { number: 0 }
    }
  };

  try {
    await fetch(`${proxyUrl}/v1/pages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0" },
      body: JSON.stringify(payload)
    });
  } catch(e) {
    console.warn("노션 타임머신 일지 전송 실패 (오프라인 모드 유지):", e);
  }
}


