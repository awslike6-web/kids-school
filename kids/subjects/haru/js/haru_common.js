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

  // TTS 설정 로드
  const savedTts = localStorage.getItem("fairy_tts_enabled");
  if (savedTts !== null) isTtsEnabled = savedTts === "true";
  updateTtsButtonUI();

  // 지갑 잔액 표시
  updateCurrencyDisplay();

  // 탭별 콘텐츠 초기 렌더링
  renderHabitsTab();
  renderArtTab();
  renderSpecialDaysTab();
});

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
// 🔊 음성 TTS & 효과음
// ==========================================
function toggleHaruTts() {
  isTtsEnabled = !isTtsEnabled;
  localStorage.setItem("fairy_tts_enabled", isTtsEnabled);
  updateTtsButtonUI();
  if (isTtsEnabled) {
    speakText("요정 음성이 켜졌어요! 반짝이는 하루를 시작해요!");
  } else {
    window.speechSynthesis?.cancel();
  }
}

function updateTtsButtonUI() {
  const btn = document.getElementById("haruTtsBtn");
  if (!btn) return;
  if (isTtsEnabled) {
    btn.classList.add("active");
    btn.innerHTML = "🔊 요정 음성 ON";
  } else {
    btn.classList.remove("active");
    btn.innerHTML = "🔇 요정 음성 OFF";
  }
}

function speakText(text) {
  if (!isTtsEnabled) return;
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ko-KR";
    utterance.rate = 0.95;
    utterance.pitch = 1.15;
    window.speechSynthesis.speak(utterance);
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
  const savedWallet = localStorage.getItem("kids_wallet_" + currentChild);
  let count = 0;
  if (savedWallet) {
    try { count = JSON.parse(savedWallet).balance || 0; }
    catch(e) { count = parseInt(savedWallet) || 0; }
  } else {
    count = parseInt(localStorage.getItem("rewardCount_" + currentChild) || "0");
  }
  curDisplay.innerText = count + " 🍬";
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
  if (coins >= max) {
    alert("🎉 20칸 저금통이 가득 찼어요! 정말 성실하게 실천했군요! 새로운 저금통으로 비워둘게요!");
    coins = 0;
  }
  coins++;
  setPiggyCoins(coins);
  playCoinSound();
  renderPiggyBankWidget();
  speakText(`땡그랑! [${habitName}] 실천 완료! 황금 코인이 쏙 들어갔어요!`);

  if (coins % 5 === 0) {
    grantReward(2, `저금통 ${coins}코인 달성`);
    alert(`🎊 축하합니다! 착한 습관 ${coins}회 달성 보너스로 하리보 젤리 2개(+🍬🍬)가 지급되었습니다!`);
  }
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
