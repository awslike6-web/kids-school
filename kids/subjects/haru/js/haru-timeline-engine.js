/**
 * 🕰️ haru-timeline-engine.js
 * 초등 1-2 통합교과 '하루' - 24시간 매직 시계판 & 타임라인 엔진
 * - 24시간/12시간 모드 전환 및 동적 눈금/시침·분침 실시간 애니메이션
 * - 2중 동심원 지그재그 스티커 핀 배치 및 툴팁
 * - 매일 반복 고정 루틴 vs 당일 특별 일정 분기 저장 & 요일별 필터링
 * - 추천 스티커 트레이 및 나만의 일과 직접 등록 모달
 * - 오늘 하루 완성 및 노션 타임머신 일지 비동기 전송
 */

(() => {
  let currentTimelineDate = "";
  let timelineFilterPeriod = "all";
  let selectedCustomEmoji = "⭐";
  let clockLiveInterval = null;
  let clockHourFormat = "24"; // "12" or "24"

  function initTimelineState() {
    const child = window.currentChild || "minseo";
    currentTimelineDate = typeof window.getTodayDateStr === "function" ? window.getTodayDateStr() : new Date().toISOString().slice(0, 10);
    clockHourFormat = localStorage.getItem("haru_clock_format_" + child) || "24";
  }

  function getRecurringStorageKey() {
    return `haru_recurring_routine_${window.currentChild || "minseo"}`;
  }

  function getDailyStorageKey(dateStr) {
    return `haru_daily_timeline_${window.currentChild || "minseo"}_${dateStr || currentTimelineDate}`;
  }

  function getTimelineCompletedKey(dateStr) {
    return `haru_timeline_completed_${window.currentChild || "minseo"}_${dateStr || currentTimelineDate}`;
  }

  // 요일 배열(0=일~6=토) 한글 라벨 변환 헬퍼
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

  // 매일 반복 고정 루틴 로드/저장
  function getRecurringRoutine() {
    const child = window.currentChild || "minseo";
    const key = getRecurringStorageKey();
    const raw = localStorage.getItem(key);
    if (raw) {
      try { return JSON.parse(raw); } catch(e) { return []; }
    }
    const todayStr = typeof window.getTodayDateStr === "function" ? window.getTodayDateStr() : new Date().toISOString().slice(0, 10);
    const oldRaw = localStorage.getItem(`haru_timeline_${child}_${todayStr}`);
    if (oldRaw) {
      try {
        const parsed = JSON.parse(oldRaw).map(it => ({ ...it, isRecurring: true }));
        localStorage.setItem(key, JSON.stringify(parsed));
        return parsed;
      } catch(e) {}
    }
    if (window.HARU_DATA?.timelineClock?.defaultPlan) {
      const defaults = JSON.parse(JSON.stringify(window.HARU_DATA.timelineClock.defaultPlan)).map(it => ({ ...it, isRecurring: true }));
      localStorage.setItem(key, JSON.stringify(defaults));
      return defaults;
    }
    return [];
  }

  function saveRecurringRoutine(items) {
    localStorage.setItem(getRecurringStorageKey(), JSON.stringify(items));
  }

  function getDailyTimelineItems(dateStr) {
    const raw = localStorage.getItem(getDailyStorageKey(dateStr));
    if (raw) {
      try { return JSON.parse(raw); } catch(e) { return []; }
    }
    return [];
  }

  function saveDailyTimelineItems(items, dateStr) {
    localStorage.setItem(getDailyStorageKey(dateStr), JSON.stringify(items));
  }

  function getTimelineItems(dateStr) {
    if (!currentTimelineDate) initTimelineState();
    const targetDate = dateStr || currentTimelineDate;
    const recurring = getRecurringRoutine();
    const daily = getDailyTimelineItems(targetDate);
    const targetDayIdx = (new Date(targetDate + "T00:00:00")).getDay();

    const matchedRecurring = recurring.filter(it => {
      if (!it.repeatDays || !Array.isArray(it.repeatDays) || it.repeatDays.length === 0 || it.repeatDays.length >= 7) return true;
      return it.repeatDays.includes(targetDayIdx);
    });

    const combined = [...matchedRecurring, ...daily];
    combined.sort((a, b) => (a.time || "").localeCompare(b.time || ""));
    return combined;
  }

  // 시계판 12/24시간 모드 전환
  function setClockHourFormat(format) {
    if (format !== "12" && format !== "24") return;
    const child = window.currentChild || "minseo";
    clockHourFormat = format;
    localStorage.setItem(`haru_clock_format_${child}`, format);

    const btn24 = document.getElementById("clockMode24Btn");
    const btn12 = document.getElementById("clockMode12Btn");
    if (btn24) btn24.classList.toggle("active", format === "24");
    if (btn12) btn12.classList.toggle("active", format === "12");

    const quadsLayer = document.querySelector(".clock-quads-layer");
    if (quadsLayer) quadsLayer.style.opacity = format === "12" ? "0.15" : "1";

    renderClockTicks(true);
    updateLiveClockHands();
    renderClockPins();

    const modeName = format === "12" ? "12시간 표준 시계" : "24시간 매직 시계";
    if (typeof window.speakText === "function") window.speakText(`${modeName} 모드로 바꿨어요!`);
  }

  function renderTimelineTab() {
    if (!currentTimelineDate) initTimelineState();
    updateTimelineDateUI();

    const btn24 = document.getElementById("clockMode24Btn");
    const btn12 = document.getElementById("clockMode12Btn");
    if (btn24) btn24.classList.toggle("active", clockHourFormat === "24");
    if (btn12) btn12.classList.toggle("active", clockHourFormat === "12");

    const quadsLayer = document.querySelector(".clock-quads-layer");
    if (quadsLayer) quadsLayer.style.opacity = clockHourFormat === "12" ? "0.15" : "1";

    renderClockBoard();
    renderTimelineList();
    renderStickerTray();
    startClockLiveTimer();
  }

  function updateTimelineDateUI() {
    const dateTextEl = document.getElementById("timelineDateText");
    const starBadgeEl = document.getElementById("timelineStarBadge");
    const completeBtn = document.getElementById("timelineCompleteBtn");
    if (!dateTextEl) return;

    const todayStr = typeof window.getTodayDateStr === "function" ? window.getTodayDateStr() : new Date().toISOString().slice(0, 10);
    const dateObj = new Date(currentTimelineDate + "T00:00:00");
    const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
    const dayStr = dayNames[dateObj.getDay()] || "";
    const isToday = currentTimelineDate === todayStr;
    dateTextEl.textContent = `${currentTimelineDate} (${dayStr})${isToday ? " (오늘)" : ""}`;

    const isCompleted = localStorage.getItem(getTimelineCompletedKey()) === "true";
    if (starBadgeEl) starBadgeEl.style.display = isCompleted ? "inline-flex" : "none";

    if (completeBtn) {
      const isMinsu = (window.currentChild || "minseo") === "minsu";
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

  function changeTimelineDate(delta) {
    if (!currentTimelineDate) initTimelineState();
    const cur = new Date(currentTimelineDate + "T00:00:00");
    cur.setDate(cur.getDate() + delta);
    const y = cur.getFullYear(), m = String(cur.getMonth() + 1).padStart(2, "0"), d = String(cur.getDate()).padStart(2, "0");
    currentTimelineDate = `${y}-${m}-${d}`;
    renderTimelineTab();
  }

  function goToTodayTimeline() {
    currentTimelineDate = typeof window.getTodayDateStr === "function" ? window.getTodayDateStr() : new Date().toISOString().slice(0, 10);
    renderTimelineTab();
  }

  function filterTimelinePeriod(period) {
    timelineFilterPeriod = period;
    document.querySelectorAll(".period-filter-btn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.period === period);
    });
    renderClockBoard();
    renderTimelineList();
    renderStickerTray();
  }

  function renderClockBoard() {
    renderClockTicks();
    updateLiveClockHands();
    renderClockPins();
  }

  function renderClockTicks(force = false) {
    const ticksLayer = document.getElementById("clockTicksLayer");
    if (!ticksLayer) return;
    if (!force && ticksLayer.dataset.format === clockHourFormat && ticksLayer.children.length > 0) return;

    ticksLayer.innerHTML = "";
    ticksLayer.dataset.format = clockHourFormat;

    if (clockHourFormat === "12") {
      for (let h = 1; h <= 12; h++) {
        const rad = ((h % 12) * 30 - 90) * (Math.PI / 180);
        const tickEl = document.createElement("div");
        tickEl.className = "clock-tick-mark major";
        tickEl.style.left = `${(50 + 43 * Math.cos(rad)).toFixed(2)}%`;
        tickEl.style.top = `${(50 + 43 * Math.sin(rad)).toFixed(2)}%`;
        tickEl.innerHTML = `<span>${h}</span>`;
        ticksLayer.appendChild(tickEl);
      }
    } else {
      for (let h = 0; h < 24; h++) {
        const rad = (h * 15 - 90) * (Math.PI / 180);
        const tickEl = document.createElement("div");
        tickEl.className = `clock-tick-mark ${h % 3 === 0 ? 'major' : 'minor'}`;
        tickEl.style.left = `${(50 + 43 * Math.cos(rad)).toFixed(2)}%`;
        tickEl.style.top = `${(50 + 43 * Math.sin(rad)).toFixed(2)}%`;
        if (h % 3 === 0) tickEl.innerHTML = `<span>${h}</span>`;
        ticksLayer.appendChild(tickEl);
      }
    }
  }

  function updateLiveClockHands() {
    const hourHand = document.getElementById("clockHandHour");
    const minHand = document.getElementById("clockHandMinute");
    const hubTime = document.getElementById("clockHubTime");
    const liveTimeTag = document.getElementById("clockLiveTimeTag");
    if (!hourHand || !minHand) return;

    const now = new Date();
    const hours = now.getHours(), minutes = now.getMinutes();
    const hourAngle = clockHourFormat === "12" ? (hours % 12) * 30 + (minutes / 60) * 30 : (hours % 24) * 15 + (minutes / 60) * 15;
    const minAngle = minutes * 6;

    hourHand.style.transform = `rotate(${hourAngle}deg)`;
    minHand.style.transform = `rotate(${minAngle}deg)`;

    if (hubTime) {
      hubTime.textContent = clockHourFormat === "12" ? `${hours < 12 ? '오전' : '오후'} ${hours % 12 || 12}시` : `${hours}시`;
    }
    if (liveTimeTag) {
      liveTimeTag.textContent = `현재 ${now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}`;
    }
  }

  function startClockLiveTimer() {
    if (clockLiveInterval) clearInterval(clockLiveInterval);
    clockLiveInterval = setInterval(updateLiveClockHands, 10000);
  }

  function renderClockPins() {
    const pinsLayer = document.getElementById("clockPinsLayer");
    if (!pinsLayer) return;
    pinsLayer.innerHTML = "";

    const items = getTimelineItems();
    const filtered = timelineFilterPeriod === "all" ? items : items.filter(it => it.period === timelineFilterPeriod);
    if (!filtered || filtered.length === 0) return;

    const is12H = clockHourFormat === "12";
    const parsedItems = filtered
      .filter(item => item.time && item.time.includes(":"))
      .map(item => {
        const parts = item.time.split(":");
        const h = parseInt(parts[0], 10) || 0, m = parseInt(parts[1], 10) || 0;
        const totalMinutes = (h % 24) * 60 + m;
        const angleDeg = is12H ? ((h % 12) * 60 + m) * 0.5 : totalMinutes * 0.25;
        return { item, h, m, totalMinutes, angleDeg };
      })
      .sort((a, b) => a.totalMinutes - b.totalMinutes);

    const placedPins = [];

    parsedItems.forEach((entry) => {
      const { item, h, m, angleDeg } = entry;
      const radAngle = (angleDeg - 90) * (Math.PI / 180);
      const isAM = h < 12, isThirtyish = (m >= 15 && m < 45);
      const candidateRadii = is12H 
        ? (isAM ? [25.5, 36.5, 18.5, 31.0] : [36.5, 25.5, 31.0, 18.5])
        : (isThirtyish ? [25.5, 36.5, 18.5, 31.0] : [36.5, 25.5, 31.0, 18.5]);

      let chosenRadius = candidateRadii[0], bestDist = -1;
      for (let r of candidateRadii) {
        const curX = 50 + r * Math.cos(radAngle), curY = 50 + r * Math.sin(radAngle);
        let minDistance = 9999;
        for (let p of placedPins) {
          const dist = Math.hypot(curX - p.x, curY - p.y);
          if (dist < minDistance) minDistance = dist;
        }
        if (minDistance >= 9.5) { chosenRadius = r; bestDist = minDistance; break; }
        else if (minDistance > bestDist) { bestDist = minDistance; chosenRadius = r; }
      }

      const finalX = 50 + chosenRadius * Math.cos(radAngle), finalY = 50 + chosenRadius * Math.sin(radAngle);
      placedPins.push({ x: finalX, y: finalY, item });

      const pinEl = document.createElement("div");
      pinEl.className = `clock-pin-badge period-${item.period || 'lunch'}${finalY < 22 ? ' pop-down' : ''}`;
      pinEl.style.left = `${finalX.toFixed(2)}%`;
      pinEl.style.top = `${finalY.toFixed(2)}%`;

      const ampmStr = h < 12 ? "오전" : "오후";
      const timeDisplay = is12H ? `${ampmStr} ${h % 12 || 12}:${String(m).padStart(2, "0")}` : item.time;
      let repeatLabel = "📅 오늘";
      if (item.isRecurring) {
        repeatLabel = (item.repeatDays && Array.isArray(item.repeatDays) && item.repeatDays.length > 0 && item.repeatDays.length < 7)
          ? `🏫 ${formatRepeatDays(item.repeatDays)}` : "🔄 매일";
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
        pinsLayer.querySelectorAll(".clock-pin-badge").forEach(p => { if (p !== pinEl) p.classList.remove("active"); });
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

  function renderTimelineList() {
    const scrollContainer = document.getElementById("timelineCardsScroll");
    const countChip = document.getElementById("timelineCountChip");
    if (!scrollContainer) return;

    const items = getTimelineItems();
    items.sort((a, b) => (a.time || "").localeCompare(b.time || ""));
    if (countChip) countChip.textContent = `${items.length}개`;

    const filtered = timelineFilterPeriod === "all" ? items : items.filter(it => it.period === timelineFilterPeriod);
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

    const periodMap = { morning: "아침", lunch: "점심", evening: "저녁", night: "밤" };
    const todayStr = typeof window.getTodayDateStr === "function" ? window.getTodayDateStr() : new Date().toISOString().slice(0, 10);
    const isToday = currentTimelineDate === todayStr;

    scrollContainer.innerHTML = filtered.map(item => {
      const pLabel = periodMap[item.period] || "일과";
      const isRec = !!item.isRecurring;
      const repeatChip = isRec 
        ? (item.repeatDays && Array.isArray(item.repeatDays) && item.repeatDays.length > 0 && item.repeatDays.length < 7
            ? `<span class="item-repeat-chip days" title="매주 ${formatRepeatDays(item.repeatDays)} 반복되는 학원/고정 일정">🏫 ${formatRepeatDays(item.repeatDays)}</span>`
            : `<span class="item-repeat-chip recurring" title="매일 반복되는 고정 루틴">🔄 매일</span>`)
        : `<span class="item-repeat-chip daily" title="이 날만의 특별 일정">📅 ${isToday ? "오늘" : "이날"}</span>`;

      return `
        <div class="timeline-card-item period-${item.period || 'lunch'}" data-id="${item.id}">
          <div class="timeline-card-time-col">
            <div class="timeline-badge-group">
              <span class="timeline-period-badge ${item.period || 'lunch'}">${pLabel}</span>
              ${repeatChip}
            </div>
            <div class="timeline-time-input-wrap" title="시간을 콕 눌러 원하는 시간으로 변경해요">
              <span class="time-prefix-icon">⏰</span>
              <input type="time" class="timeline-time-input" value="${item.time || '12:00'}" 
                     onchange="updateTimelineItemTime('${item.id}', this.value)" onclick="event.stopPropagation()">
            </div>
          </div>
          <div class="timeline-card-body" onclick="speakTimelineItemById('${item.id}')">
            <span class="timeline-card-icon">${item.icon || "⭐"}</span>
            <div class="timeline-card-info">
              <div class="timeline-card-title">${item.title}</div>
              ${item.memo ? `<div class="timeline-card-memo">💭 ${item.memo}</div>` : ""}
            </div>
          </div>
          <div class="timeline-card-actions">
            <button type="button" class="timeline-icon-btn audio-btn" onclick="speakTimelineItemById('${item.id}')" title="요정 코코에게 듣기">🔊</button>
            <button type="button" class="timeline-icon-btn delete-btn" onclick="removeTimelineItem('${item.id}')" title="일정 삭제하기">✖</button>
          </div>
        </div>
      `;
    }).join("");
  }

  function updateTimelineItemTime(id, newTime) {
    if (!newTime || !newTime.includes(":")) return;
    const recurring = getRecurringRoutine();
    const daily = getDailyTimelineItems(currentTimelineDate);
    const h = parseInt(newTime.split(":")[0], 10) || 0;
    const newPeriod = (h >= 6 && h < 12) ? "morning" : (h >= 12 && h < 17) ? "lunch" : (h >= 17 && h < 21) ? "evening" : "night";
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
    if (typeof window.speakText === "function") window.speakText(`${foundTitle} 시간을 ${newTime}으로 바꿨어요! ✨`);
  }

  function renderStickerTray() {
    const trayGrid = document.getElementById("stickerTrayGrid");
    if (!trayGrid || !window.HARU_DATA?.timelineClock?.stickers) return;

    const stickers = window.HARU_DATA.timelineClock.stickers;
    const filtered = timelineFilterPeriod === "all" ? stickers : stickers.filter(s => s.period === timelineFilterPeriod);

    trayGrid.innerHTML = filtered.map(s => `
      <button type="button" class="sticker-chip-btn" onclick="addTimelineItemFromSticker('${s.id}')" title="${s.time} ${s.title}">
        <span class="sticker-chip-icon">${s.icon}</span>
        <span class="sticker-chip-text">${s.title}</span>
        <span class="sticker-chip-time">${s.time}</span>
      </button>
    `).join("");
  }

  function addTimelineItemFromSticker(stickerId) {
    if (!window.HARU_DATA?.timelineClock?.stickers) return;
    const sticker = window.HARU_DATA.timelineClock.stickers.find(s => s.id === stickerId);
    if (!sticker) return;

    const dailyItems = getDailyTimelineItems(currentTimelineDate);
    dailyItems.push({
      id: `daily_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      time: sticker.time,
      title: sticker.title,
      icon: sticker.icon,
      period: sticker.period,
      memo: sticker.speech || "",
      isRecurring: false
    });
    saveDailyTimelineItems(dailyItems, currentTimelineDate);

    renderClockBoard();
    renderTimelineList();
    if (typeof window.speakText === "function") window.speakText(sticker.speech || `${sticker.time}! ${sticker.title} 스티커를 쏙 붙였어요!`);
  }

  function speakTimelineItem(item) {
    if (!item) return;
    if (typeof window.speakText === "function") window.speakText(item.memo || `${item.time}! ${item.title} 시간이에요!`);

    const hourHand = document.getElementById("clockHandHour");
    const minHand = document.getElementById("clockHandMinute");
    if (hourHand && minHand && item.time) {
      const parts = item.time.split(":");
      const h = parseInt(parts[0], 10) || 0, m = parseInt(parts[1], 10) || 0;
      const hAngle = clockHourFormat === "12" ? (h % 12) * 30 + (m / 60) * 30 : (h % 24) * 15 + (m / 60) * 15;
      hourHand.style.transform = `rotate(${hAngle}deg)`;
      minHand.style.transform = `rotate(${m * 6}deg)`;
      setTimeout(updateLiveClockHands, 3000);
    }
  }

  function speakTimelineItemById(id) {
    const found = getTimelineItems().find(it => it.id === id);
    if (found) speakTimelineItem(found);
  }

  function removeTimelineItem(id) {
    const recurring = getRecurringRoutine();
    const daily = getDailyTimelineItems(currentTimelineDate);
    const recItem = recurring.find(it => it.id === id);

    if (recItem) {
      const daysLabel = (recItem.repeatDays && Array.isArray(recItem.repeatDays) && recItem.repeatDays.length > 0 && recItem.repeatDays.length < 7)
        ? `매주 ${formatRepeatDays(recItem.repeatDays)} 고정 일정` : "매일 반복되는 고정 일정";
      if (!confirm(`'${recItem.title}'은 ${daysLabel}이에요.\n고정 일정에서 완전히 삭제할까요?`)) return;
      saveRecurringRoutine(recurring.filter(it => it.id !== id));
      if (typeof window.speakText === "function") window.speakText(`'${recItem.title}' 고정 일정을 삭제했어요.`);
    } else {
      const dailyItem = daily.find(it => it.id === id);
      const title = dailyItem ? dailyItem.title : "일과";
      if (!confirm(`'${title}' 스티커를 시계판에서 뗄까요?`)) return;
      saveDailyTimelineItems(daily.filter(it => it.id !== id), currentTimelineDate);
      if (typeof window.speakText === "function") window.speakText(`'${title}' 스티커를 뗐어요! 언제든 다시 붙일 수 있어요.`);
    }

    renderClockBoard();
    renderTimelineList();
  }

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
    if (daysBox) daysBox.style.display = type === "days" ? "block" : "none";

    if (type === "days") {
      const activeChips = document.querySelectorAll("#customWeekdayChipsRow .weekday-chip.active");
      if (activeChips.length === 0) {
        const curDay = (new Date(currentTimelineDate + "T00:00:00")).getDay();
        const targetChip = document.querySelector(`#customWeekdayChipsRow .weekday-chip[data-day="${curDay}"]`);
        if (targetChip) targetChip.classList.add("active");
      }
    }
  }

  function toggleWeekdayChip(btn) {
    if (btn) btn.classList.toggle("active");
  }

  function setDaysPreset(preset) {
    document.querySelectorAll("#customWeekdayChipsRow .weekday-chip").forEach(chip => {
      const day = parseInt(chip.dataset.day, 10);
      let shouldActive = false;
      if (preset === "weekdays") shouldActive = (day >= 1 && day <= 5);
      else if (preset === "mwf") shouldActive = (day === 1 || day === 3 || day === 5);
      else if (preset === "tt") shouldActive = (day === 2 || day === 4);
      else if (preset === "weekend") shouldActive = (day === 0 || day === 6);
      chip.classList.toggle("active", shouldActive);
    });
  }

  function openCustomTimelineModal() {
    const modal = document.getElementById("customTimelineModalOverlay");
    if (!modal) return;

    const now = new Date();
    const h = String(now.getHours()).padStart(2, "0"), m = String(now.getMinutes()).padStart(2, "0");
    const timeInput = document.getElementById("customItemTimeInput");
    if (timeInput) timeInput.value = `${h}:${m}`;

    const periodSelect = document.getElementById("customItemPeriodSelect");
    if (periodSelect) {
      const hn = now.getHours();
      periodSelect.value = (hn >= 6 && hn < 12) ? "morning" : (hn >= 12 && hn < 17) ? "lunch" : (hn >= 17 && hn < 21) ? "evening" : "night";
    }

    const titleInput = document.getElementById("customItemTitleInput");
    if (titleInput) titleInput.value = "";
    const memoInput = document.getElementById("customItemMemoInput");
    if (memoInput) memoInput.value = "";

    selectScheduleType("daily");
    document.querySelectorAll("#customWeekdayChipsRow .weekday-chip").forEach(c => c.classList.remove("active"));
    selectedCustomEmoji = "⭐";
    document.querySelectorAll("#customEmojiRow .emoji-opt").forEach((opt, idx) => opt.classList.toggle("active", idx === 0));

    modal.classList.add("active");
    document.body.style.overflow = "hidden";
    if (typeof window.speakText === "function") window.speakText("어떤 멋진 일을 했나요? 나만의 스티커를 만들어봐요!");
  }

  function closeCustomTimelineModal() {
    const modal = document.getElementById("customTimelineModalOverlay");
    if (modal) modal.classList.remove("active");
    document.body.style.overflow = "auto";
  }

  function selectCustomEmoji(el, emoji) {
    document.querySelectorAll("#customEmojiRow .emoji-opt").forEach(opt => opt.classList.remove("active"));
    el.classList.add("active");
    selectedCustomEmoji = emoji;
  }

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
    const scheduleType = typeInput ? typeInput.value : "daily";

    let repeatDays = [];
    if (scheduleType === "days") {
      document.querySelectorAll("#customWeekdayChipsRow .weekday-chip.active").forEach(c => {
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
      time, title, icon: selectedCustomEmoji || "⭐", period, memo, isRecurring,
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

    let typeDesc = scheduleType === "recurring" ? "매일 반복되는 고정 루틴으로" : scheduleType === "days" ? `매주 ${formatRepeatDays(repeatDays)} 고정 일정으로` : "오늘의 특별 일정으로";
    if (typeof window.speakText === "function") window.speakText(`${time}! ${title} 스티커를 ${typeDesc} 찰칵 붙였어요! 멋져요!`);
  }

  async function completeTodayTimeline() {
    const items = getTimelineItems();
    if (items.length < 3) {
      alert("하루 일과 스티커를 3개 이상 붙이고 완성해 볼까요? ✨");
      if (typeof window.speakText === "function") window.speakText("스티커를 3개 이상 붙이고 완성 버튼을 눌러주세요!");
      return;
    }

    const completedKey = getTimelineCompletedKey();
    if (localStorage.getItem(completedKey) === "true") {
      alert("이미 오늘 하루 일과를 멋지게 완성했어요! ⭐");
      if (typeof window.speakText === "function") window.speakText("이미 오늘 하루 일과를 완성했어요! 참 잘했어요!");
      return;
    }

    localStorage.setItem(completedKey, "true");
    const isMinsu = (window.currentChild || "minseo") === "minsu";
    if (typeof window.grantReward === "function") window.grantReward(2, "하루 24시간 매직 시계판 일과 완성");

    const childName = isMinsu ? "민수" : "민서";
    const rewardCur = isMinsu ? "다이아몬드 2개" : "캔디 2개";
    if (typeof window.speakText === "function") window.speakText(`와아! 오늘 하루 일과를 멋지게 완성했구나! 규칙적인 멋진 하루를 보낸 ${childName}에게 ${rewardCur}를 선물할게!`);

    updateTimelineDateUI();
    await sendTimelineToNotion(items);
  }

  async function sendTimelineToNotion(items) {
    const proxyUrl = typeof PROXY_URL !== "undefined" ? PROXY_URL : "https://minmin-notion.awslike6.workers.dev";
    const dbId = typeof STUDY_LOG_DB_ID !== "undefined" ? STUDY_LOG_DB_ID : "37aa27115b688001b2ffe5e6c8f82ab2";
    const todayStr = currentTimelineDate || (typeof window.getTodayDateStr === "function" ? window.getTodayDateStr() : new Date().toISOString().slice(0, 10));
    const childTitle = (window.currentChild || "minseo") === "minseo" ? "민서" : "민수";
    const nowIso = new Date().toISOString();

    const sortedItems = [...items].sort((a, b) => (a.time || "").localeCompare(b.time || ""));
    const itemsSummary = sortedItems.map(it => `• [${it.time}] ${it.icon || ""} ${it.title}${it.memo ? ` - ${it.memo}` : ""}`).join("\n");

    const payload = {
      parent: { database_id: dbId },
      properties: {
        "ID": { title: [{ text: { content: `${childTitle}_${todayStr} [24시간 타임머신] 일과 기록 완성` } }] },
        "학생": { select: { name: childTitle } },
        "과목": { rich_text: [{ text: { content: "하루" } }] },
        "입장": { date: { start: nowIso } },
        "퇴장": { date: { start: nowIso } },
        "오답리포트": {
          rich_text: [{
            text: { content: `[🕰️ 24시간 매직 타임머신 시계판 일과 완성]\n• 기록 일자: ${todayStr}\n• 등록 일과 수: ${items.length}개\n• 세부 일과 내역:\n${itemsSummary}\n• 완료 보상: +2${childTitle === "민수" ? "💎" : "🍬"}` }
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

  // 전역 네임스페이스 바인딩
  window.setClockHourFormat = setClockHourFormat;
  window.renderTimelineTab = renderTimelineTab;
  window.updateTimelineDateUI = updateTimelineDateUI;
  window.changeTimelineDate = changeTimelineDate;
  window.goToTodayTimeline = goToTodayTimeline;
  window.filterTimelinePeriod = filterTimelinePeriod;
  window.renderClockBoard = renderClockBoard;
  window.renderClockTicks = renderClockTicks;
  window.updateLiveClockHands = updateLiveClockHands;
  window.startClockLiveTimer = startClockLiveTimer;
  window.renderClockPins = renderClockPins;
  window.renderTimelineList = renderTimelineList;
  window.updateTimelineItemTime = updateTimelineItemTime;
  window.renderStickerTray = renderStickerTray;
  window.addTimelineItemFromSticker = addTimelineItemFromSticker;
  window.speakTimelineItem = speakTimelineItem;
  window.speakTimelineItemById = speakTimelineItemById;
  window.removeTimelineItem = removeTimelineItem;
  window.selectScheduleType = selectScheduleType;
  window.toggleWeekdayChip = toggleWeekdayChip;
  window.setDaysPreset = setDaysPreset;
  window.openCustomTimelineModal = openCustomTimelineModal;
  window.closeCustomTimelineModal = closeCustomTimelineModal;
  window.selectCustomEmoji = selectCustomEmoji;
  window.saveCustomTimelineItem = saveCustomTimelineItem;
  window.completeTodayTimeline = completeTodayTimeline;
  window.sendTimelineToNotion = sendTimelineToNotion;
  window.getTimelineItems = getTimelineItems;

  window.HaruTimelineEngine = {
    renderTimelineTab,
    setClockHourFormat,
    getTimelineItems,
    openCustomTimelineModal,
    closeCustomTimelineModal,
    completeTodayTimeline
  };
})();
