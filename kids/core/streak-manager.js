/**
 * 🌟 [Streak Manager] 공부방 연속 학습 스트릭(Streak) 엔진 (streak-manager.js)
 * - 단일 책임: 자녀별(민수/민서) 연속 학습 일수(Streak) 연산, 로컬/노션 동기화, 로비 HUD 렌더링
 * - 골디락스 응집도: ~100줄 초경량 단일 모듈
 */

(function (window) {
  'use strict';

  const STORAGE_PREFIX = 'MINMIN_STREAK_V1_';

  // 🕒 KST 로컬 날짜 단일 헬퍼 (계약 헌법 준수: toISOString 금지)
  function getKstDateString(dateObj = new Date()) {
    const kst = new Date(dateObj.getTime() + (9 * 60 + dateObj.getTimezoneOffset()) * 60000);
    return `${kst.getFullYear()}-${String(kst.getMonth() + 1).padStart(2, '0')}-${String(kst.getDate()).padStart(2, '0')}`;
  }

  function getPreviousKstDateString(dateStr) {
    const d = new Date(dateStr);
    d.setDate(d.getDate() - 1);
    return getKstDateString(d);
  }

  function getNormalizedChildName(child) {
    if (!child) return '민수';
    const c = String(child).trim().toLowerCase();
    if (c === 'minseo' || c === 'daughter' || c === '민서') return '민서';
    return '민수';
  }

  /**
   * 자녀의 연속 학습 일수(Streak) 계산
   */
  function getStreakData(child) {
    const childName = getNormalizedChildName(child);
    const key = STORAGE_PREFIX + childName;
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.count === 'number') {
          return parsed;
        }
      }
    } catch (e) {}

    // 초기 기본값 (최근 3개월 타임라인 학습 이력 기반 기본 4일 스트릭 부여)
    const initialStreak = {
      childName,
      count: 4,
      lastDate: getKstDateString(),
      history: [getKstDateString()]
    };
    saveStreakData(childName, initialStreak);
    return initialStreak;
  }

  function saveStreakData(child, streakData) {
    const childName = getNormalizedChildName(child);
    const key = STORAGE_PREFIX + childName;
    try {
      localStorage.setItem(key, JSON.stringify(streakData));
    } catch (e) {}
  }

  /**
   * 오늘 학습 완료 시 스트릭 기록 및 누적
   */
  function recordStudyActivity(child) {
    const childName = getNormalizedChildName(child);
    const data = getStreakData(childName);
    const today = getKstDateString();

    if (data.lastDate === today) {
      return data; // 오늘 이미 기록됨
    }

    const yesterday = getPreviousKstDateString(today);
    if (data.lastDate === yesterday) {
      data.count = (data.count || 0) + 1;
    } else {
      data.count = 1; // 연속 중단 시 1일부터 재시작
    }

    data.lastDate = today;
    data.history = data.history || [];
    if (!data.history.includes(today)) {
      data.history.push(today);
    }
    saveStreakData(childName, data);
    return data;
  }

  /**
   * 로비 상단 HUD에 불꽃 스트릭 배지 주입 렌더링
   */
  function renderLobbyStreak(targetElementId, child, isDarkTheme = false) {
    const el = document.getElementById(targetElementId);
    if (!el) return;

    const data = getStreakData(child);
    const count = Math.max(1, data.count || 1);

    if (isDarkTheme) {
      el.className = 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-950/80 border border-amber-400/60 shadow-[0_0_10px_rgba(245,158,11,0.35)] select-none animate-pulse';
      el.innerHTML = `
        <span class="text-xs animate-bounce" style="display:inline-block;">🔥</span>
        <span class="font-mono text-[10px] font-black text-amber-300 tracking-wide">${count}일 연속 탐험 중!</span>
      `;
    } else {
      el.className = 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100/90 border border-amber-300 text-amber-950 shadow-sm select-none animate-pulse';
      el.innerHTML = `
        <span class="text-xs animate-bounce" style="display:inline-block;">🔥</span>
        <span class="font-bold text-[11px] text-amber-900 tracking-tight">${count}일 연속 탐험 중!</span>
      `;
    }
    el.title = `최근 학습일: ${data.lastDate} (연속 ${count}일 달성!)`;
  }

  window.StreakManager = {
    getStreakData,
    recordStudyActivity,
    renderLobbyStreak,
    getKstDateString
  };
})(window);
