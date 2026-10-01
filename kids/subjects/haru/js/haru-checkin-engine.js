/**
 * 🐷 haru-checkin-engine.js
 * 초등 1-2 통합교과 '하루' - 30초 원스톱 체크인 & 매일의 습관 엔진
 * - 저금통 황금 코인 & 20칸 완주 마일스톤 (가족 소원권/마이룸 황금돼지 연동)
 * - 튼튼 운동 달력 스탬프
 * - 알록달록 마음 날씨
 * - 30초 원스톱 하루 체크인 모달 엔진 & 노션 STUDY_LOG 자동 전송
 */

(() => {
  // 30초 원스톱 체크인 상태 객체
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
    const child = window.currentChild || "minseo";
    return `haru_checkin_done_${getTodayDateStr()}_${child}`;
  }

  // =========================================================
  // 1. [매일의 습관 & 루틴] 저금통 로직
  // =========================================================
  function getPiggyCoins() {
    const child = window.currentChild || "minseo";
    return parseInt(localStorage.getItem("haru_piggy_coins_" + child) || "0", 10);
  }

  function setPiggyCoins(val) {
    const child = window.currentChild || "minseo";
    localStorage.setItem("haru_piggy_coins_" + child, val);
  }

  function renderHabitsTab() {
    renderPiggyBankWidget();
    renderWorkoutWidget();
    renderMindWidget();
  }

  // 🐷 저금통 위젯 렌더링
  function renderPiggyBankWidget() {
    const container = document.getElementById("piggyBoardGrid");
    const countDisplay = document.getElementById("piggyCountDisplay");
    if (!container || !window.HARU_DATA?.dailyHabits?.piggyBank) return;

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
    const max = window.HARU_DATA?.dailyHabits?.piggyBank?.maxCoins || 20;

    coins++;
    setPiggyCoins(coins);
    if (typeof window.playCoinSound === "function") window.playCoinSound();
    renderPiggyBankWidget();
    if (typeof window.speakText === "function") {
      window.speakText(`땡그랑! [${habitName}] 실천 완료! 황금 코인이 쏙 들어갔어요!`);
    }

    // 20칸 완주 마일스톤 발동!
    if (coins >= max) {
      triggerPiggyBankMilestone();
      setPiggyCoins(0); // 새로운 저금통으로 리셋
      renderPiggyBankWidget();
    }
  }

  // 🐷 20칸 완주 특별 마일스톤 (마이룸 황금 돼지 가구 + 주말 가족 소원권)
  function triggerPiggyBankMilestone() {
    if (typeof window.playSuccessSound === "function") window.playSuccessSound();
    unlockMyRoomTrophy("trophy_golden_piggy");

    const child = window.currentChild || "minseo";
    const childTitle = child === 'minseo' ? '민서' : '민수';
    if (typeof window.speakText === "function") {
      window.speakText(`축하합니다! ${childTitle}가 20칸 착한 습관 저금통을 모두 채웠어요! 마이룸에 황금 돼지 저금통 인형이 배달되었고 주말 가족 소원권이 발급되었습니다!`);
    }

    alert(`🎉 대단해요! 20칸 착한 습관 저금통 완주 달성! 🎊\n\n1. 🐷 마이룸에 [🏆 황금 돼지 저금통] 명예 가구가 배달되었습니다!\n2. 🎫 이번 주말 [가족 소원권] 1장이 발급되었습니다! (엄마 아빠와 함께 가고 싶은 곳이나 맛있는 메뉴를 골라보세요!)`);

    // 노션 학습일지에 완주 축하 피드 전송
    sendMilestoneToNotion("20칸 하루 저금통 완주 (가족 소원권 발급)");
  }

  function unlockMyRoomTrophy(itemId) {
    const child = window.currentChild || "minseo";
    const profileKey = child === 'minsu' ? 'son' : 'daughter';
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

  // =========================================================
  // 2. 💪 운동 체크 위젯
  // =========================================================
  function getWorkoutLogs() {
    const child = window.currentChild || "minseo";
    try {
      return JSON.parse(localStorage.getItem("haru_workout_logs_" + child) || "{}");
    } catch(e) { return {}; }
  }

  function renderWorkoutWidget() {
    const container = document.getElementById("workoutCalendarRow");
    if (!container || !window.HARU_DATA?.dailyHabits?.workout) return;

    const days = ["일", "월", "화", "수", "목", "금", "토"];
    const todayIdx = new Date().getDay();
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
    const child = window.currentChild || "minseo";
    const todayIdx = new Date().getDay();
    const logs = getWorkoutLogs();
    logs[todayIdx] = icon;
    localStorage.setItem("haru_workout_logs_" + child, JSON.stringify(logs));
    renderWorkoutWidget();
    if (typeof window.grantReward === "function") {
      window.grantReward(1, `오늘의 건강 운동 실천: ${name}`);
    }
    if (typeof window.speakText === "function") {
      window.speakText(`오늘의 튼튼 운동 [${name}] 실천 완료! 참 잘했어요!`);
    }
    alert(`💪 [${name}] 실천 완료! 오늘 건강 스탬프가 찍히고 보상 1개를 받았어요!`);
  }

  // =========================================================
  // 3. 🌈 마음 날씨 위젯
  // =========================================================
  function renderMindWidget() {
    const container = document.getElementById("moodChipsRow");
    if (!container || !window.HARU_DATA?.dailyHabits?.mind) return;

    const child = window.currentChild || "minseo";
    const moods = window.HARU_DATA.dailyHabits.mind.moodColors;
    const currentMood = localStorage.getItem("haru_today_mood_" + child) || "";

    container.innerHTML = moods.map(m => `
      <div class="mood-chip ${currentMood === m.mood ? 'selected' : ''}" onclick="selectMoodColor('${m.mood}', '${m.color}', '${m.desc}')">
        <div style="font-size:1.8rem; margin-bottom:4px;">${m.icon}</div>
        <div style="font-family:'Jua'; font-size:1.05rem; color:${m.color};">${m.mood}</div>
        <div style="font-size:0.8rem; color:#888; margin-top:2px;">${m.desc}</div>
      </div>
    `).join("");
  }

  function selectMoodColor(mood, color, desc) {
    const child = window.currentChild || "minseo";
    localStorage.setItem("haru_today_mood_" + child, mood);
    renderMindWidget();
    const childTitle = child === 'minseo' ? '민서' : '민수';
    if (typeof window.speakText === "function") {
      window.speakText(`오늘 ${childTitle}의 마음은 ${mood}이군요! ${desc}`);
    }
  }

  function goToDailyDiary() {
    const child = window.currentChild || "minseo";
    if (window.DailyDiary && typeof window.DailyDiary.openDiaryModal === "function") {
      window.DailyDiary.openDiaryModal(child);
    } else {
      location.href = `../../../lobby.html?user=${child}#diary`;
    }
  }

  // =========================================================
  // 4. ✨ 30초 원스톱 하루 체크인 모달 엔진
  // =========================================================
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
    const child = window.currentChild || "minseo";
    const childTitle = child === "minsu" ? "민수" : "민서";
    if (typeof window.speakText === "function") {
      window.speakText(`30초 하루 체크인! 오늘 ${childTitle}가 실천한 착한 행동을 하나 골라보세요!`);
    }
  }

  function closeQuickCheckInModal() {
    const overlay = document.getElementById("quickCheckInModalOverlay");
    if (overlay) overlay.classList.remove("active");
    document.body.style.overflow = "auto";
    if (typeof window.stopAllSpeech === "function") window.stopAllSpeech();
  }

  function renderCheckInStep() {
    const body = document.getElementById("checkInModalInnerBody");
    if (!body || !window.HARU_DATA?.dailyHabits) return;

    const { step } = checkInState;
    const child = window.currentChild || "minseo";
    const childTitle = child === "minsu" ? "민수" : "민서";
    const curName = child === "minsu" ? "다이아 1개" : "젤리 1개";

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
    if (typeof window.playCoinSound === "function") window.playCoinSound();
    checkInState.step = 2;
    renderCheckInStep();
    if (typeof window.speakText === "function") {
      window.speakText(`참 착해요! [${name}] 실천 완료! 이번엔 오늘 실천한 튼튼 운동을 골라보세요!`);
    }
  }

  function selectCheckInWorkout(name, icon) {
    checkInState.workout = { name, icon };
    if (typeof window.playCoinSound === "function") window.playCoinSound();
    checkInState.step = 3;
    renderCheckInStep();
    const child = window.currentChild || "minseo";
    const childTitle = child === "minsu" ? "민수" : "민서";
    if (typeof window.speakText === "function") {
      window.speakText(`몸도 튼튼! [${name}] 완료! 마지막으로 오늘 ${childTitle}의 마음 날씨를 골라보세요!`);
    }
  }

  function selectCheckInMood(mood, color, icon, desc) {
    checkInState.mood = { mood, color, icon, desc };
    finishQuickCheckIn();
  }

  async function finishQuickCheckIn() {
    const { habit, workout, mood } = checkInState;
    const child = window.currentChild || "minseo";

    // 1) 저금통 코인 +1 적립
    let coins = getPiggyCoins();
    const max = window.HARU_DATA?.dailyHabits?.piggyBank?.maxCoins || 20;
    coins++;
    setPiggyCoins(coins);

    // 1-1) 오늘 실천한 착한 습관 & 운동 명칭 저장 (부모 대시보드 코칭 연동)
    localStorage.setItem("haru_today_habit_" + child, habit.name);
    localStorage.setItem("haru_today_workout_" + child, workout.name);
    localStorage.setItem("haru_last_checkin_date_" + child, getTodayDateStr());

    // 2) 운동 달력 오늘 요일 스탬프 저장
    const todayIdx = new Date().getDay();
    const workoutLogs = getWorkoutLogs();
    workoutLogs[todayIdx] = workout.icon;
    localStorage.setItem("haru_workout_logs_" + child, JSON.stringify(workoutLogs));

    // 3) 마음 날씨 저장
    localStorage.setItem("haru_today_mood_" + child, mood.mood);

    // 4) 오늘 완료 플래그 저장
    localStorage.setItem(getTodayCheckInKey(), "true");

    // 5) 보상 지급 (참여 격려 1개로 절제)
    if (typeof window.grantReward === "function") {
      window.grantReward(1, "30초 하루 체크인 완료");
    }

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
    const child = window.currentChild || "minseo";
    const childTitle = child === "minsu" ? "민수" : "민서";
    const curSymbol = child === "minsu" ? "💎" : "🍬";
    const curName = child === "minsu" ? "다이아 1개" : "젤리 1개";
    const curWordSpoken = child === "minsu" ? "다이아몬드 1개" : "젤리 1개";

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

    if (!reachedMilestone && typeof window.speakText === "function") {
      window.speakText(`오늘 하루 체크인 완료! 저금통과 운동 달력에 쏙 들어가고 ${curWordSpoken}를 선물받았습니다!`);
    }
  }

  // 🌐 노션 완주 마일스톤 피드 전송
  async function sendMilestoneToNotion(milestoneTitle) {
    const proxyUrl = typeof PROXY_URL !== "undefined" ? PROXY_URL : "https://minmin-notion.awslike6.workers.dev";
    const dbId = typeof STUDY_LOG_DB_ID !== "undefined" ? STUDY_LOG_DB_ID : "37aa27115b688001b2ffe5e6c8f82ab2";
    const child = window.currentChild || "minseo";
    const childTitle = child === "minseo" ? "민서" : "민수";
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
    const child = window.currentChild || "minseo";
    const childTitle = child === "minseo" ? "민서" : "민수";
    const isMinsu = child === "minsu";
    const nowIso = new Date().toISOString();

    const payload = {
      parent: { database_id: dbId },
      properties: {
        "ID": {
          title: [{ text: { content: `${childTitle}_${todayStr} (${isMinsu ? '데일리 루틴 체크인' : '슬기로운 하루 체크인'})` } }]
        },
        "학생": { select: { name: childTitle } },
        "과목": { rich_text: [{ text: { content: isMinsu ? "데일리 루틴" : "하루" } }] },
        "입장": { date: { start: nowIso } },
        "퇴장": { date: { start: nowIso } },
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
    } catch(e) {
      console.warn("노션 하루 체크인 자동 동기화 예외 (로컬 안전 보존됨):", e);
    }
  }

  // =========================================================
  // 5. 전역 네임스페이스 바인딩 (100% 하위 호환성 유지)
  // =========================================================
  window.getTodayDateStr = getTodayDateStr;
  window.getTodayCheckInKey = getTodayCheckInKey;
  window.getPiggyCoins = getPiggyCoins;
  window.setPiggyCoins = setPiggyCoins;
  window.renderHabitsTab = renderHabitsTab;
  window.renderPiggyBankWidget = renderPiggyBankWidget;
  window.recordHabitAction = recordHabitAction;
  window.triggerPiggyBankMilestone = triggerPiggyBankMilestone;
  window.unlockMyRoomTrophy = unlockMyRoomTrophy;
  window.getWorkoutLogs = getWorkoutLogs;
  window.renderWorkoutWidget = renderWorkoutWidget;
  window.recordWorkout = recordWorkout;
  window.renderMindWidget = renderMindWidget;
  window.selectMoodColor = selectMoodColor;
  window.goToDailyDiary = goToDailyDiary;
  window.updateCheckInBannerStatus = updateCheckInBannerStatus;
  window.openQuickCheckInModal = openQuickCheckInModal;
  window.closeQuickCheckInModal = closeQuickCheckInModal;
  window.renderCheckInStep = renderCheckInStep;
  window.selectCheckInHabit = selectCheckInHabit;
  window.selectCheckInWorkout = selectCheckInWorkout;
  window.selectCheckInMood = selectCheckInMood;
  window.finishQuickCheckIn = finishQuickCheckIn;
  window.renderCheckInCompletionView = renderCheckInCompletionView;
  window.sendMilestoneToNotion = sendMilestoneToNotion;
  window.sendCheckInToNotion = sendCheckInToNotion;

  window.HaruCheckInEngine = {
    getTodayDateStr,
    getPiggyCoins,
    setPiggyCoins,
    renderHabitsTab,
    renderPiggyBankWidget,
    renderWorkoutWidget,
    renderMindWidget,
    updateCheckInBannerStatus,
    openQuickCheckInModal,
    closeQuickCheckInModal,
    finishQuickCheckIn
  };
})();
