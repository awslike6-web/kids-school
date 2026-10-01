/**
 * 🌅 haru_common.js
 * 민민이네 공부방 - 초등 1-2 통합교과 '하루' 대문 파사드 & 핵심 제어기
 * 
 * 🏛️ 골디락스 4대 전문 엔진 구조:
 * 1) haru-checkin-engine.js: 30초 하루 체크인, 저금통 코인, 운동 달력, 마음 날씨 (~540줄)
 * 2) haru-timeline-engine.js: 24시간 매직 시계판, 루틴 관리, 일정 스티커, 타임머신 (~800줄 미만)
 * 3) haru-safety-quiz.js: 119 안전 수호대 OX 퀴즈, 닥터 코코 365 응급상담, 면허증 (~300줄)
 * 4) haru-special-days.js: 특별한 날 추억 피드, 사진 전체보기 팝업, 감정 도장 (~450줄)
 * 5) haru_common.js (본 파일): 대문 파사드, 프로필 전환, 탭 스위칭, TTS, 자연·예술 (~380줄)
 */

let currentChild = "minseo";
let isTtsEnabled = true;

// ==========================================
// 🚀 1. 초기화 진입점
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  currentChild = urlParams.get("user") || localStorage.getItem("currentChild") || "minseo";
  window.currentChild = currentChild;

  // 민수 / 민서 프로필 UI 동적 세팅
  setupChildProfileUI();

  // TTS 설정 로드
  const savedTts = localStorage.getItem("fairy_tts_enabled");
  if (savedTts !== null) isTtsEnabled = savedTts === "true";
  updateTtsButtonUI();

  // 지갑 잔액 표시
  updateCurrencyDisplay();

  // 30초 하루 체크인 배너 상태 갱신
  if (typeof updateCheckInBannerStatus === "function") {
    updateCheckInBannerStatus();
  }

  // 탭별 콘텐츠 초기 렌더링
  if (typeof renderHabitsTab === "function") renderHabitsTab();
  renderArtTab();
  if (typeof renderSpecialDaysTab === "function") renderSpecialDaysTab();
  if (typeof renderTimelineTab === "function") renderTimelineTab();
  if (typeof renderSafetyQuizQuestion === "function") renderSafetyQuizQuestion(false);

  // 첫 진입 시 환영 인사
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
// 🧭 2. 5대 영역 탭 스위칭 (탭 이동 시 이전 음성 즉시 정지)
// ==========================================
function switchHaruTab(tabName) {
  stopAllSpeech();

  document.querySelectorAll(".nav-tab-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === tabName);
  });
  document.querySelectorAll(".tab-content-panel").forEach(panel => {
    panel.classList.toggle("active", panel.id === `tab_${tabName}`);
  });

  if (tabName === "timeline" && typeof renderTimelineTab === "function") {
    renderTimelineTab();
  }
}

// ==========================================
// 🔊 3. 음성 TTS & 효과음 (공통 초고음질 요정 엔진 연동)
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

  if (typeof speakFairyTTS === "function") {
    speakFairyTTS(text, handleEnd);
    return;
  }

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

function playSuccessSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now + idx * 0.1);
      gain.setValueAtTime(0.2, now + idx * 0.1);
      gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.1);
      osc.stop(now + idx * 0.1 + 0.3);
    });
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
    catch(e) { count = parseInt(savedWallet, 10) || 0; }
  } else {
    count = parseInt(localStorage.getItem("rewardCount_" + currentChild) || "0", 10);
  }
  curDisplay.innerText = count + curSymbol;
}

function grantReward(amount, desc) {
  if (window.NotionReward && typeof window.NotionReward.grantRewardDirectly === "function") {
    window.NotionReward.grantRewardDirectly(currentChild, amount, desc);
  } else {
    let current = parseInt(localStorage.getItem("rewardCount_" + currentChild) || "0", 10);
    current += amount;
    localStorage.setItem("rewardCount_" + currentChild, current);
  }
  updateCurrencyDisplay();
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
  if (currentSpeakingCardId === cardId && isHaruSpeaking) {
    stopAllSpeech(true);
    return;
  }

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

// =========================================================
// 🎨 4. [자연 & 예술 감상실] 렌더링 & 로직
// =========================================================
function renderArtTab() {
  if (!window.HARU_DATA?.natureAndArt) return;
  const sky = window.HARU_DATA.natureAndArt.skyArt;

  const dayCard = document.getElementById("monetCardBody");
  if (dayCard && sky.day) {
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
  if (nightCard && sky.night) {
    nightCard.innerHTML = `
      <div class="art-title">${sky.night.title} (${sky.night.period})</div>
      <div class="art-artist">화가: ${sky.night.artist}</div>
      <p class="art-desc">${sky.night.desc}</p>
      <button class="back-btn" style="padding:6px 14px; font-size:0.9rem;" onclick="speakText('${sky.night.voiceMsg}')">
        🔊 고흐 할아버지 이야기 듣기
      </button>
    `;
  }

  const snailBox = document.getElementById("snailLyricsBox");
  if (snailBox && window.HARU_DATA.natureAndArt.snail) {
    snailBox.innerText = window.HARU_DATA.natureAndArt.snail.song.lyrics;
  }

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
  alert("✨ 오늘 하늘 관찰 메모가 멋지게 기록되었어요! 보상 1개 획득!");
  speakText(`오늘의 하늘 관찰 기록 완료! "${val}" 참 멋진 관찰이에요!`);
}

function playRainSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
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
// 🌐 전역 네임스페이스 및 파사드 인터페이스 노출
// =========================================================
window.setupChildProfileUI = setupChildProfileUI;
window.switchHaruTab = switchHaruTab;
window.showAudioControls = showAudioControls;
window.hideAudioControls = hideAudioControls;
window.toggleHaruTts = toggleHaruTts;
window.updateTtsButtonUI = updateTtsButtonUI;
window.speakText = speakText;
window.stopAllSpeech = stopAllSpeech;
window.playCoinSound = playCoinSound;
window.playSuccessSound = playSuccessSound;
window.updateCurrencyDisplay = updateCurrencyDisplay;
window.grantReward = grantReward;
window.renderArtTab = renderArtTab;
window.saveTodaySkyNote = saveTodaySkyNote;
window.playRainSound = playRainSound;
window.updateSpeakingCardUi = updateSpeakingCardUi;
window.toggleSpeakStoryText = toggleSpeakStoryText;
window.speakStoryText = speakStoryText;
