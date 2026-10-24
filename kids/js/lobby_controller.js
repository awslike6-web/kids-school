/**
 * ==============================================================================
 * 🏰 [Lobby Controller] Stitch AI 듀얼 테마 로비 & 한도 도달 모달 통합 컨트롤러
 * ==============================================================================
 * 역할 및 구성:
 * 1. USER_CONFIGS & 상수: 민수(SECTOR-07 다크) / 민서(구름섬 라이트) 설정 및 하위 호환 유지.
 * 2. 동적 테마 & 뷰 스왑: html.light.theme-minseo ↔ html.dark.theme-minsu 즉시 전환.
 * 3. 노션 INVENTORY_DB & SWR 캐시: 하리보/다이아몬드, 통합 레벨, 소원권, 가디언 남은 시간 연동.
 * 4. 시간표 연동 다중 과목 버프 & 과목별 일일 한도(Daily Cap) 신호등:
 *    - 시간표 과목(2~4과목 동시 지원): 🔥 오늘 복습(1.2x, 한도 150) / ✨ 내일 예습(+2 보너스) 점등
 *    - 여유(🟢/⚡) ➔ 마감임박 70%+(🟡/CRITICAL) ➔ 한도 100% 도달 시 소등(💤 완료/냉각)
 * 5. 한도 도달 갈림길 모달(한도도달ui) & 5구역 하단바(일기·찰칵·용어사전·놀이터·프로필) 라우팅.
 * ==============================================================================
 */

// 🖼️ 민수 상단 프로필 아바타 상수 (외부 임시 URL 대체 · 추후 자작 캐릭터로 교체 용이)
const MINSU_AVATAR_SRC = './kids/assets/images/monsters/purple_monster.png';

// 📚 과목 메타데이터 사전 (라우팅 경로, 아이콘, 추천 우선순위)
const SUBJECT_META = {
  korean: {
    key: 'korean', ko: '국어', code: 'KOR', shortId: 'kor',
    emoji: '📖', icon: 'menu_book', roomLabel: '📖 국어 방',
    href: 'kids/subjects/korean/korean.html', bonusText: '남은 시간 +30분 보너스'
  },
  math: {
    key: 'math', ko: '수학', code: 'MATH', shortId: 'math',
    emoji: '🧮', icon: 'calculate', roomLabel: '🧮 수학 방',
    href: 'kids/subjects/math/math.html', bonusText: '남은 시간 +30분 보너스'
  },
  english: {
    key: 'english', ko: '영어', code: 'ENG', shortId: 'eng',
    emoji: '🔤', icon: 'translate', roomLabel: '🔤 영어 방',
    href: 'kids/subjects/english/english.html', bonusText: '남은 시간 +30분 보너스'
  },
  society: {
    key: 'society', ko: '사회', code: 'SOC', shortId: 'soc',
    emoji: '🏛️', icon: 'public', roomLabel: '🏛️ 사회 방',
    href: 'kids/subjects/society/society.html', bonusText: '남은 시간 +30분 보너스'
  },
  science: {
    key: 'science', ko: '과학', code: 'SCI', shortId: 'sci',
    emoji: '🧪', icon: 'science', roomLabel: '🧪 과학 방',
    href: 'kids/subjects/science/science.html', bonusText: '남은 시간 +30분 보너스'
  },
  haru: {
    key: 'haru', ko: '하루', code: 'HARU', shortId: 'haru',
    emoji: '🌱', icon: 'wb_sunny', roomLabel: '🌱 하루 방',
    href: 'kids/subjects/haru/haru.html', bonusText: '일일 30초 체크인 보너스'
  }
};

// 🎡 자녀별 놀이터 & 특별 탐험 목록
const PLAYGROUND_ITEMS = {
  minsu: [
    { icon: '⚔️', title: '브롤 DPS & 밸런스 연구소', desc: '5학년 수학 연계! 브롤러 스탯 분석 & 1:1 시뮬레이션', href: 'kids/playground/minsu/brawl_dps.html', badge: '인기' },
    { icon: '🎁', title: '스타 드롭 & 트로피 보관소', desc: '톡톡 탭해서 전설 스타 드롭 개봉 및 보상 획득!', href: 'kids/playground/minsu/starr_drop.html', badge: '보상' },
    { icon: '🌱', title: '30초 데일리 루틴 & 저금통', desc: '착한 습관 저금통 + 건강 운동 도장 + 마음 날씨 체크인', href: 'kids/subjects/haru/haru.html?user=minsu', badge: '매일' }
  ],
  minseo: [
    { icon: '🎨', title: '매직 컬러링 스튜디오', desc: '사진을 넣으면 밑그림으로 변신! 웹 색칠 & A4 도안 출력', href: 'kids/playground/minseo/coloring.html', badge: '미술' },
    { icon: '📐', title: '인터랙티브 종이접기', desc: '비행기, 개구리, 동서남북 3D 단계별 접기 & 도안 인쇄', href: 'kids/playground/minseo/origami.html', badge: '공예' },
    { icon: '🎁', title: '스타 드롭 & 트로피 보관소', desc: '톡톡 탭해서 신나는 스타 드롭 개봉!', href: 'kids/playground/minsu/starr_drop.html', badge: '보상' },
    { icon: '🔬', title: '3학년 과학 실험실 (미리보기)', desc: '동물, 곤충, 별자리 요정들의 비밀을 알아보는 과학방', href: 'kids/subjects/science/science.html?user=minseo', badge: '예습' },
    { icon: '🏛️', title: '3학년 사회 역사방 (미리보기)', desc: '우리 동네 지도와 옛날 위인 동화 속으로 떠나는 모험', href: 'kids/subjects/society/society.html?user=minseo', badge: '예습' }
  ]
};

// 💎 기존 모듈과의 하위 호환성을 위한 USER_CONFIGS 유지
const USER_CONFIGS = {
  minsu: {
    name: '민수', key: 'son', themeClass: 'theme--arcade',
    htmlClasses: ['dark', 'theme-minsu'],
    subjects: ['english', 'korean', 'math', 'society', 'science', 'haru'],
    defaultGuardianMins: 100,
    studyWorlds: [
      { title: '🧮 수학 월드', color: '#f59e0b', rooms: [{ name: '수학 멀티버스 대모험', href: 'kids/subjects/math/math.html', desc: '단원 동화부터 실전 연산까지!' }] },
      { title: '✍️ 국어 월드', color: '#ec4899', rooms: [{ name: '국어 문장 구성방', href: 'kids/subjects/korean/korean.html', desc: '어휘, 정밀독해, AI토론까지!' }] },
      { title: '🔤 영어 던전', color: '#0284c7', rooms: [{ name: '영단어 기억방', href: 'kids/subjects/english/english.html', desc: '사이버 알파벳 던전 탐험!' }] },
      { title: '🧪 과학 실험실', color: '#10b981', rooms: [{ name: '과학 개념 탐구방', href: 'kids/subjects/science/science.html', desc: '생태계와 과학 법칙 실험실' }] },
      { title: '🏛️ 사회 연대기', color: '#d97706', rooms: [{ name: '사회 역사 탐험방', href: 'kids/subjects/society/society.html', desc: '지리와 역사 타임머신' }] },
      { title: '🦖 탐구 사전관', color: '#8b5cf6', rooms: [{ name: '종합 용어사전방', href: 'kids/common_space/voca.html', desc: '모든 교과서 낱말 총집합!' }] }
    ],
    hideoutWorlds: []
  },
  minseo: {
    name: '민서', key: 'daughter', themeClass: 'theme--hideout',
    htmlClasses: ['light', 'theme-minseo'],
    subjects: ['korean', 'math', 'english', 'haru'],
    defaultGuardianMins: 45,
    studyWorlds: [
      { title: '🧮 수학 월드', color: '#f59e0b', rooms: [{ name: '수학 놀이터 대모험', href: 'kids/subjects/math/math.html', desc: '단원 동화부터 세로셈 연산까지!' }] },
      { title: '✍️ 국어 월드', color: '#ec4899', rooms: [{ name: '국어 문장 구성방', href: 'kids/subjects/korean/korean.html', desc: '감정 스토리북과 논리 대화방' }] },
      { title: '🌱 슬기로운 하루', color: '#2ed573', rooms: [{ name: '하루 탐험관', href: 'kids/subjects/haru/haru.html', desc: '매일 30초 착한 습관 체크인!' }] },
      { title: '🔤 영어 던전', color: '#0284c7', rooms: [{ name: '영단어 기억방', href: 'kids/subjects/english/english.html', desc: '반짝이는 마법 단어장' }] },
      { title: '🦖 탐구 사전관', color: '#8b5cf6', rooms: [{ name: '종합 용어사전방', href: 'kids/common_space/voca.html', desc: '초등 새싹 개념 백과사전' }] }
    ],
    futureWorlds: [],
    hideoutWorlds: []
  }
};

Object.values(USER_CONFIGS).forEach(cfg => {
  cfg.worlds = [...(cfg.studyWorlds || []), ...(cfg.futureWorlds || []), ...(cfg.hideoutWorlds || [])];
});
window.USER_CONFIGS = USER_CONFIGS;

(function () {
  'use strict';

  const lobbyCores = [
    'core.js',
    'notion-helper.js',
    'fairy-config.js',
    'fairy-engine.js',
    'fairy-settings-catalog.js',
    'fairy-settings-engine.js',
    'fairy-chatbot.js',
    'daily-diary.js',
    'quiz-flow-controller.js',
    'timetable-boost.js',
    'screentime-tracker.js'
  ];

  let activeUserKey = 'minsu';
  let isAdminSession = false;
  let modalState = {
    completedSubjKey: 'korean',
    recommendedSubjKey: 'math'
  };
  const runtimeDailyEarned = {
    minseo: {},
    minsu: {}
  };

  function getTodayKstString() {
    const now = new Date();
    const kst = new Date(now.getTime() + (9 * 60 + now.getTimezoneOffset()) * 60000);
    return `${kst.getFullYear()}-${String(kst.getMonth() + 1).padStart(2, '0')}-${String(kst.getDate()).padStart(2, '0')}`;
  }

  function resolveInitialUserKey() {
    const urlParams = new URLSearchParams(window.location.search);
    const paramUser = urlParams.get('user');
    if (paramUser && USER_CONFIGS[paramUser]) return paramUser;

    const savedChild = localStorage.getItem('currentChild');
    if (savedChild && USER_CONFIGS[savedChild]) return savedChild;

    const savedUser = localStorage.getItem('currentUser');
    if (savedUser === 'daughter') return 'minseo';
    if (savedUser === 'son') return 'minsu';

    const savedName = localStorage.getItem('currentUserName');
    if (savedName === '민서') return 'minseo';
    return 'minsu';
  }

  function getRealChildName(userKey) {
    if (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.CHILDREN) {
      return userKey === 'minseo' ? APP_CONFIG.CHILDREN.second.name : APP_CONFIG.CHILDREN.first.name;
    }
    return userKey === 'minseo' ? '민서' : '민수';
  }

  // =========================================================
  // 🎨 1. 테마 & 유저 전환 엔진 (CSS 변수 스왑 + 뷰 토글)
  // =========================================================
  function applyLobbyThemeAndView(userKey, updateHistory = false) {
    activeUserKey = USER_CONFIGS[userKey] ? userKey : 'minsu';
    window.__activeLobbyUser = activeUserKey;
    const cfg = USER_CONFIGS[activeUserKey];
    const realName = getRealChildName(activeUserKey);

    const savedName = localStorage.getItem('currentUserName');
    isAdminSession = (savedName === '아빠' || savedName === '엄마');

    localStorage.setItem('currentChild', activeUserKey);
    localStorage.setItem('currentUser', cfg.key);
    if (!isAdminSession) {
      localStorage.setItem('currentUserName', realName);
    }

    const htmlEl = document.documentElement;
    htmlEl.classList.remove('light', 'dark', 'theme-minseo', 'theme-minsu');
    cfg.htmlClasses.forEach(cls => htmlEl.classList.add(cls));

    const minseoView = document.getElementById('minseoLobbyView');
    const minsuView = document.getElementById('minsuLobbyView');
    if (minseoView && minsuView) {
      if (activeUserKey === 'minseo') {
        minseoView.classList.remove('hidden');
        minsuView.classList.add('hidden');
      } else {
        minsuView.classList.remove('hidden');
        minseoView.classList.add('hidden');
      }
    }

    const avatarEl = document.getElementById('minsuAvatarImg');
    if (avatarEl) {
      avatarEl.src = MINSU_AVATAR_SRC;
    }

    if (updateHistory && window.history && window.history.replaceState) {
      const url = new URL(window.location.href);
      url.searchParams.set('user', activeUserKey);
      window.history.replaceState({}, '', url.toString());
    }

    closeAllSubjectPopups();
    updateAdminToolbar(realName);
    updateQuestCtaAndBoosts(activeUserKey, realName);
    renderSubjectCapStates(activeUserKey);
    updateGuardianHud(activeUserKey, realName);
    fetchInventoryForUser(activeUserKey, realName);

    // 🔥 연속 학습 불꽃 스트릭(Streak) HUD 점등
    if (window.StreakManager && typeof window.StreakManager.renderLobbyStreak === 'function') {
      window.StreakManager.renderLobbyStreak('minseoStreakBadge', 'minseo', false);
      window.StreakManager.renderLobbyStreak('minsuStreakBadge', 'minsu', true);
    }
  }

  function closeAllSubjectPopups() {
    const allCards = [
      'minseo-pop-korean', 'minseo-math-tooltip', 'minseo-pop-english', 'minseo-pop-haru',
      'card-eng', 'card-kor', 'card-math', 'card-soc', 'card-sci'
    ];
    allCards.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add('hidden');
    });
  }

  function updateAdminToolbar(realName) {
    const toolbar = document.getElementById('adminQuickToolbar');
    const modeLabel = document.getElementById('adminModeLabel');
    const towerLink = document.getElementById('adminTowerLink');
    const subStatus = document.getElementById('minseoSubStatusText');
    const clearance = document.getElementById('minsuClearanceBadge');
    const savedName = localStorage.getItem('currentUserName');

    if (isAdminSession) {
      if (toolbar) {
        toolbar.classList.remove('hidden');
        toolbar.classList.add('flex');
      }
      if (modeLabel) modeLabel.textContent = `🛠️ [${savedName} 검수] ${realName}`;
      if (subStatus) subStatus.textContent = `🛠️ ${savedName} 시뮬레이터 가동 중`;
      if (clearance) clearance.textContent = `SIMULATOR: ${savedName} MODE`;
      if (towerLink && savedName === '아빠' && typeof APP_CONFIG !== 'undefined' && APP_CONFIG.MASTER_TOWER_URL) {
        towerLink.href = APP_CONFIG.MASTER_TOWER_URL;
        towerLink.classList.remove('hidden');
      }
    } else {
      if (toolbar) {
        toolbar.classList.add('hidden');
        toolbar.classList.remove('flex');
      }
      if (subStatus) subStatus.textContent = '즐거운 1학년 탐험 중!';
      if (clearance) clearance.textContent = 'CLEARANCE: O5-MINSU';
    }
  }

  function updateQuestCtaAndBoosts(userKey, realName) {
    const nameEl = document.getElementById('minseoNameBadge');
    if (nameEl) nameEl.textContent = realName;

    if (typeof window.TimetableBoost !== 'undefined' && typeof window.TimetableBoost.getTimetableSubjects === 'function') {
      const tt = window.TimetableBoost.getTimetableSubjects(realName);
      const todayList = (tt && tt.todaySubjects) ? tt.todaySubjects : [];
      const tomorrowList = (tt && tt.tomorrowSubjects) ? tt.tomorrowSubjects : [];

      // 민서 상단 말풍선 툴팁: 오늘 복습 과목들 또는 내일 예습 과목들 동적 표시
      const tooltipTitle = document.getElementById('minseo-math-tooltip-title');
      const tooltipMult = document.getElementById('minseo-math-tooltip-mult');
      const tooltipDesc = document.getElementById('minseo-math-tooltip-desc');
      if (tooltipTitle && tooltipMult && tooltipDesc) {
        if (todayList.length > 0) {
          tooltipTitle.textContent = `🔥 오늘 복습 : ${todayList.join('·')}`;
          tooltipMult.textContent = '1.2x';
          tooltipDesc.textContent = '한도 150개 확장 · EXP 1.2배!';
        } else if (tomorrowList.length > 0) {
          tooltipTitle.textContent = `✨ 내일 예습 : ${tomorrowList.join('·')}`;
          tooltipMult.textContent = '+2개';
          tooltipDesc.textContent = '10문제 완주 시 보너스 +7개!';
        } else {
          tooltipTitle.textContent = '🧮 수학 : 10 만들기';
          tooltipMult.textContent = '추천';
          tooltipDesc.textContent = '오늘의 보물을 찾아 떠나볼까?';
        }
      }

      // 민수 하단 워프 요약줄: 시간표 부스트 과목 표시
      const minsuBoostSummary = document.getElementById('minsuBoostSummaryText');
      if (minsuBoostSummary) {
        if (todayList.length > 0) {
          minsuBoostSummary.textContent = `🔥 오늘 시간표 버프(1.2x): ${todayList.join(' · ')}`;
        } else if (tomorrowList.length > 0) {
          minsuBoostSummary.textContent = `✨ 내일 예습 버프(+2💎): ${tomorrowList.join(' · ')}`;
        } else {
          minsuBoostSummary.textContent = 'WARP VELOCITY // READY';
        }
      }
    }
  }

  // =========================================================
  // 🚦 2. 과목별 시간표 버프(2~4과목 동시) & 일일 한도(Daily Cap) 신호등
  // =========================================================
  function getSubjectBoost(subjKey, userKey) {
    const meta = SUBJECT_META[subjKey];
    if (!meta || subjKey === 'haru') return { type: 'normal', limit: 100, expMultiplier: 1.0 };
    const childName = getRealChildName(userKey);
    if (typeof window.TimetableBoost !== 'undefined' && typeof window.TimetableBoost.getSubjectBoostInfo === 'function') {
      return window.TimetableBoost.getSubjectBoostInfo(meta.ko, childName) || { type: 'normal', limit: 100, expMultiplier: 1.0 };
    }
    return { type: 'normal', limit: 100, expMultiplier: 1.0 };
  }

  function getSubjectEarnedToday(subjKey, userKey) {
    const meta = SUBJECT_META[subjKey];
    if (!meta) return 0;
    const childName = getRealChildName(userKey);
    const todayKst = getTodayKstString();
    const todayLocal = new Date().toLocaleDateString();

    if (subjKey === 'haru') {
      const done = localStorage.getItem(`haru_checkin_done_${todayKst}_${userKey}`) === 'true';
      return done ? 100 : 0;
    }

    let localVal = 0;
    const lastDate = localStorage.getItem(`last_play_date_${childName}_${meta.ko}`);
    if (lastDate === todayKst || lastDate === todayLocal) {
      localVal = parseInt(localStorage.getItem(`today_earned_${childName}_${meta.ko}`) || '0', 10) || 0;
    }
    const cloudVal = Number(runtimeDailyEarned[userKey]?.[subjKey] || 0);
    return Math.max(localVal, cloudVal);
  }

  function getSubjectCapState(subjKey, userKey) {
    const uKey = userKey || activeUserKey;
    const override = localStorage.getItem(`DAILY_CAP_OVERRIDE_${uKey}_${subjKey}`);
    if (override === 'available' || override === 'critical' || override === 'completed') {
      return override;
    }

    const boost = getSubjectBoost(subjKey, uKey);
    const limit = boost.limit || 100;
    const earned = getSubjectEarnedToday(subjKey, uKey);

    if (earned >= limit) return 'completed';
    if (earned >= Math.floor(limit * 0.7)) return 'critical';
    return 'available';
  }

  function renderSubjectCapStates(userKey) {
    const uKey = userKey || activeUserKey;
    if (uKey === 'minseo') {
      renderMinseoSubjectStates();
    } else {
      renderMinsuSubjectStates();
    }
  }

  function renderMinseoSubjectStates() {
    const subjects = USER_CONFIGS.minseo.subjects;
    subjects.forEach(subjKey => {
      const state = getSubjectCapState(subjKey, 'minseo');
      const boost = getSubjectBoost(subjKey, 'minseo');
      const cardEl = document.getElementById(`minseo-card-${subjKey}`);
      const statusEl = document.getElementById(`minseo-status-${subjKey}`);
      const cornerEl = document.getElementById(`minseo-corner-${subjKey}`);
      const boostEl = document.getElementById(`minseo-boost-${subjKey}`);
      if (!cardEl || !statusEl) return;

      // 1) 시간표 버프 배지 (한도 완료가 아닐 때만 시간표 해당 모든 과목에 동시 표시)
      if (boostEl) {
        if (state !== 'completed' && boost.type === 'review') {
          boostEl.className = '-mb-1 z-20 bg-amber-100 border border-amber-400 text-amber-900 text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-sm whitespace-nowrap animate-bounce';
          boostEl.textContent = '🔥 오늘 복습 1.2x';
        } else if (state !== 'completed' && boost.type === 'preview') {
          boostEl.className = '-mb-1 z-20 bg-purple-100 border border-purple-400 text-purple-900 text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-sm whitespace-nowrap';
          boostEl.textContent = '✨ 내일 예습 +2';
        } else {
          boostEl.className = 'hidden';
        }
      }

      // 민서 팝업 내부 버프/상태 동적 업데이트
      const popMult = document.getElementById(subjKey === 'math' ? 'minseo-math-tooltip-mult' : `minseo-${subjKey}-pop-mult`);
      const popDesc = document.getElementById(subjKey === 'math' ? 'minseo-math-tooltip-desc' : `minseo-${subjKey}-pop-desc`);

      // 2) 일일 한도 신호등 상태 반영 (여유 ➔ 마지막 1판 ➔ 한도 도달 시 소등)
      if (state === 'completed') {
        cardEl.classList.add('clay-card-dim', 'grayscale', 'opacity-75');
        cardEl.classList.remove('ring-4', 'ring-amber-300/80');
        statusEl.className = 'mt-3.5 inline-flex items-center gap-1 bg-slate-200/80 text-slate-500 px-3 py-1 rounded-full font-bold text-xs';
        statusEl.innerHTML = '완료 💤';
        if (cornerEl) cornerEl.textContent = '💤';
        if (popMult) {
          popMult.textContent = '완료 💤';
          popMult.className = 'bg-slate-100 text-slate-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full';
        }
        if (popDesc) popDesc.textContent = '오늘 시간 보물 완료! 복습하기';
      } else if (state === 'critical') {
        cardEl.classList.remove('clay-card-dim', 'grayscale', 'opacity-75');
        cardEl.classList.add('ring-4', 'ring-amber-300/80');
        statusEl.className = 'mt-3.5 inline-flex items-center gap-1 bg-amber-50 text-amber-800 px-3 py-1 rounded-full font-extrabold text-xs shadow-sm border border-amber-300 animate-pulse';
        statusEl.innerHTML = '<span>⚡</span> 🟡 마지막 1판!';
        if (cornerEl) cornerEl.textContent = '🔥';
        if (popMult) {
          popMult.textContent = '마지막 1판 ⚡';
          popMult.className = 'bg-amber-100 text-amber-800 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full';
        }
        if (popDesc) popDesc.textContent = '마감 임박: 마지막 보너스 찬스!';
      } else {
        cardEl.classList.remove('clay-card-dim', 'grayscale', 'opacity-75');
        if (boost.type === 'review') {
          cardEl.classList.add('ring-4', 'ring-amber-300/80');
          if (popMult) {
            popMult.textContent = '1.2x';
            popMult.className = 'bg-amber-100 text-amber-800 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full';
          }
          if (popDesc) popDesc.textContent = '오늘 시간표 복습 보너스 1.2x!';
        } else if (boost.type === 'preview') {
          cardEl.classList.remove('ring-4', 'ring-amber-300/80');
          if (popMult) {
            popMult.textContent = '+2';
            popMult.className = 'bg-purple-100 text-purple-800 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full';
          }
          if (popDesc) popDesc.textContent = '내일 시간표 예습 보너스!';
        } else {
          cardEl.classList.remove('ring-4', 'ring-amber-300/80');
        }
        statusEl.className = 'mt-3.5 inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full font-bold text-xs shadow-sm border border-emerald-200';
        statusEl.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span> 🟢 보물 열림';
      }
    });
  }

  function renderMinsuSubjectStates() {
    // 민수 30초 하루 루틴 미니 위성 상태
    const haruState = getSubjectCapState('haru', 'minsu');
    const haruBtn = document.getElementById('minsu-node-haru');
    const haruSub = document.getElementById('minsu-sub-haru');
    if (haruBtn && haruSub) {
      if (haruState === 'completed') {
        haruBtn.className = 'flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-900/90 border border-slate-700 text-[10px] font-mono text-slate-500 opacity-75';
        haruSub.textContent = '루틴 완료 💤';
      } else {
        haruBtn.className = 'flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-950/90 border border-emerald-400/50 text-[10px] font-mono font-bold text-emerald-300 hover:scale-105 active:scale-95 transition-transform shadow-[0_0_10px_rgba(16,185,129,0.25)]';
        haruSub.textContent = '30초 루틴 ⚡';
      }
    }

    // 민수 5대 차원 포털 상태 (시간표 다중 과목 버프 + 일일 한도 신호등)
    const portalSubjects = ['english', 'korean', 'math', 'society', 'science'];
    portalSubjects.forEach(subjKey => {
      const meta = SUBJECT_META[subjKey];
      if (!meta) return;
      const state = getSubjectCapState(subjKey, 'minsu');
      const boost = getSubjectBoost(subjKey, 'minsu');

      const nodeEl = document.getElementById(`minsu-node-${subjKey}`);
      const orbEl = document.getElementById(`minsu-orb-${subjKey}`);
      const dotEl = document.getElementById(`minsu-dot-${subjKey}`);
      const subEl = document.getElementById(`minsu-sub-${subjKey}`);
      const boostEl = document.getElementById(`minsu-boost-${subjKey}`);
      const cardHeaderEl = document.getElementById(`card-${meta.shortId}-header`);
      const cardStatusEl = document.getElementById(`card-${meta.shortId}-status`);
      const cardEl = document.getElementById(`card-${meta.shortId}`);
      const entryBtn = cardEl ? cardEl.querySelector('button[onclick*="handleSubjectNodeClick"]') : null;

      // 1) 시간표 다중 과목 버프 배지 점등 (2과목이든 4과목이든 모두 켜짐, 완료 시 소등)
      if (boostEl) {
        if (state !== 'completed' && boost.type === 'review') {
          boostEl.className = '-mb-1 z-20 px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 font-mono text-[9px] font-black shadow-[0_0_8px_#F59E0B] animate-pulse';
          boostEl.textContent = '🔥 복습 1.2x';
        } else if (state !== 'completed' && boost.type === 'preview') {
          boostEl.className = '-mb-1 z-20 px-1.5 py-0.5 rounded bg-purple-500 text-white font-mono text-[9px] font-black shadow-[0_0_8px_#A855F7]';
          boostEl.textContent = '✨ 예습 +2';
        } else {
          boostEl.className = 'hidden';
        }
      }

      // 2) 일일 한도 신호등 스타일 반영
      if (state === 'completed') {
        if (nodeEl) nodeEl.classList.add('opacity-70');
        if (orbEl) {
          orbEl.classList.add('grayscale', 'opacity-70');
          orbEl.classList.remove('ring-2', 'ring-amber-400');
        }
        if (dotEl) dotEl.className = 'absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-slate-600';
        if (subEl) {
          subEl.className = 'mt-0.5 text-[9px] font-mono text-slate-500 bg-slate-900/90 px-1.5 py-0.5 rounded border border-slate-800';
          subEl.textContent = '💤 냉각 (오늘완료)';
        }
        if (cardHeaderEl) cardHeaderEl.textContent = `[${meta.code} // DEPLETED]`;
        if (cardStatusEl) cardStatusEl.textContent = '💤 금일 한도 도달 (냉각 중)';
        if (entryBtn) entryBtn.textContent = '포털 진입 (보상없음)';
      } else if (state === 'critical') {
        if (nodeEl) nodeEl.classList.remove('opacity-70');
        if (orbEl) {
          orbEl.classList.remove('grayscale', 'opacity-70');
          orbEl.classList.add('ring-2', 'ring-amber-400');
        }
        if (dotEl) dotEl.className = 'absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_#F59E0B] animate-ping';
        if (subEl) {
          subEl.className = 'mt-0.5 text-[9px] font-mono font-bold text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded border border-amber-400/60';
          subEl.textContent = '🟡 마지막 1판!';
        }
        if (cardHeaderEl) cardHeaderEl.textContent = `[${meta.code} // CRITICAL]`;
        if (cardStatusEl) cardStatusEl.textContent = '🟡 마감 임박: 마지막 1판 보너스!';
        if (entryBtn) entryBtn.textContent = '포털 진입 ➔';
      } else {
        if (nodeEl) nodeEl.classList.remove('opacity-70');
        if (orbEl) {
          orbEl.classList.remove('grayscale', 'opacity-70');
          if (boost.type === 'review') {
            orbEl.classList.add('ring-2', 'ring-amber-400');
          } else {
            orbEl.classList.remove('ring-2', 'ring-amber-400');
          }
        }
        if (dotEl) {
          dotEl.className = boost.type === 'review'
            ? 'absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_6px_#F59E0B]'
            : 'absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-secondary shadow-[0_0_6px_#10B981]';
        }
        if (subEl) {
          if (boost.type === 'review') {
            subEl.className = 'mt-0.5 text-[9px] font-mono font-bold text-amber-300 bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-400/50';
            subEl.textContent = '⚡ 채굴가능 (1.2x)';
          } else {
            subEl.className = 'mt-0.5 text-[9px] font-mono text-secondary bg-secondary/10 px-1.5 py-0.5 rounded border border-secondary/30';
            subEl.textContent = '⚡ 채굴가능 +30m';
          }
        }
        if (cardHeaderEl) cardHeaderEl.textContent = boost.type === 'review' ? `[${meta.code} // BOOST 1.2x]` : `[${meta.code} // ACTIVE]`;
        if (cardStatusEl) cardStatusEl.textContent = boost.type === 'review' ? '🔥 오늘 복습: 한도 150 · EXP 1.2x' : '⚡ 채굴 가능: +30분 보너스 열림';
        if (entryBtn) entryBtn.textContent = '포털 진입 ➔';
      }
    });
  }

  // =========================================================
  // 🛑 3. 한도 도달 갈림길 모달 (한도도달ui.html) & 놀이터 모달 연동
  // =========================================================
  function findRecommendedSubject(excludedSubjKey, userKey) {
    const uKey = userKey || activeUserKey;
    const candidateOrder = uKey === 'minseo'
      ? ['math', 'korean', 'english', 'haru']
      : ['math', 'english', 'korean', 'society', 'science'];

    // 1순위: 오늘 시간표 버프가 있으면서 아직 완료되지 않은 과목
    for (const key of candidateOrder) {
      if (key !== excludedSubjKey && getSubjectCapState(key, uKey) !== 'completed' && getSubjectBoost(key, uKey).type === 'review') {
        return key;
      }
    }
    // 2순위: 아직 완료되지 않은 첫 번째 과목
    for (const key of candidateOrder) {
      if (key !== excludedSubjKey && getSubjectCapState(key, uKey) !== 'completed') {
        return key;
      }
    }
    return candidateOrder.find(k => k !== excludedSubjKey) || 'math';
  }

  window.openDailyCapModal = function (subjKey) {
    const doneMeta = SUBJECT_META[subjKey] || SUBJECT_META.korean;
    const recKey = findRecommendedSubject(doneMeta.key, activeUserKey);
    const recMeta = SUBJECT_META[recKey] || SUBJECT_META.math;
    const recBoost = getSubjectBoost(recKey, activeUserKey);

    modalState.completedSubjKey = doneMeta.key;
    modalState.recommendedSubjKey = recMeta.key;

    const doneTitleEl = document.getElementById('capModalDoneTitle');
    const doneIconEl = document.getElementById('capModalDoneIcon');
    const doneRoomEl = document.getElementById('capModalDoneRoomName');
    const doneBadgeEl = document.getElementById('capModalDoneBadgeText');
    const recIconEl = document.getElementById('capModalRecIcon');
    const recRoomEl = document.getElementById('capModalRecRoomName');
    const recBonusEl = document.getElementById('capModalRecBonusText');
    const priBtnTextEl = document.getElementById('capModalPrimaryBtnText');
    const secBtnTextEl = document.getElementById('capModalSecondaryBtnText');

    if (doneTitleEl) doneTitleEl.textContent = `[${doneMeta.ko}]`;
    if (doneIconEl) doneIconEl.textContent = doneMeta.icon;
    if (doneRoomEl) doneRoomEl.textContent = doneMeta.roomLabel;
    if (doneBadgeEl) doneBadgeEl.textContent = '보물 완료 (100% 충전)';
    if (recIconEl) recIconEl.textContent = recMeta.icon;
    if (recRoomEl) recRoomEl.textContent = `➔ ${recMeta.roomLabel}`;
    if (recBonusEl) {
      recBonusEl.textContent = recBoost.type === 'review' ? '🔥 오늘 복습 1.2x 보너스!' : '+30분 보물 가능!';
    }
    if (priBtnTextEl) priBtnTextEl.textContent = `보물이 남은 '${recMeta.ko}' 방 바로 가기!`;
    if (secBtnTextEl) secBtnTextEl.textContent = `시간 추가 없이 그냥 ${doneMeta.ko} 복습만 더 할래요`;

    const overlay = document.getElementById('dailyCapModalOverlay');
    if (overlay) {
      overlay.classList.remove('hidden');
      overlay.classList.add('flex');
    }
  };

  window.closeDailyCapModal = function () {
    const overlay = document.getElementById('dailyCapModalOverlay');
    if (overlay) {
      overlay.classList.add('hidden');
      overlay.classList.remove('flex');
    }
  };

  window.handleCapModalGoRecommended = function () {
    const recMeta = SUBJECT_META[modalState.recommendedSubjKey] || SUBJECT_META.math;
    window.closeDailyCapModal();
    navigateToSubjectRoom(recMeta.key);
  };

  window.handleCapModalReviewAnyway = function () {
    const doneMeta = SUBJECT_META[modalState.completedSubjKey] || SUBJECT_META.korean;
    window.closeDailyCapModal();
    navigateToSubjectRoom(doneMeta.key);
  };

  window.openPlaygroundModal = function (userKey) {
    const uKey = userKey || activeUserKey;
    const realName = getRealChildName(uKey);
    const titleEl = document.getElementById('playgroundModalTitle');
    const listEl = document.getElementById('playgroundModalList');
    const overlay = document.getElementById('playgroundModalOverlay');
    if (!overlay || !listEl) return;

    if (titleEl) {
      titleEl.textContent = `🎡 ${realName}의 창의 놀이터 & 특별 탐험`;
    }

    const items = PLAYGROUND_ITEMS[uKey] || PLAYGROUND_ITEMS.minsu;
    listEl.innerHTML = items.map(item => `
      <a href="${item.href}" class="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 hover:bg-sky-50 border border-slate-200 hover:border-sky-300 transition-all active:scale-98">
        <div class="w-11 h-11 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-2xl flex-shrink-0">${item.icon}</div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-1.5">
            <span class="font-extrabold text-sm text-slate-800 truncate">${item.title}</span>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-700">${item.badge}</span>
          </div>
          <p class="text-xs text-slate-500 mt-0.5 line-clamp-1">${item.desc}</p>
        </div>
        <span class="text-slate-400 font-bold text-sm">➔</span>
      </a>
    `).join('');

    overlay.classList.remove('hidden');
    overlay.classList.add('flex');
  };

  window.closePlaygroundModal = function () {
    const overlay = document.getElementById('playgroundModalOverlay');
    if (overlay) {
      overlay.classList.add('hidden');
      overlay.classList.remove('flex');
    }
  };

  function navigateToSubjectRoom(subjKey) {
    const meta = SUBJECT_META[subjKey];
    if (!meta) return;
    const sep = meta.href.includes('?') ? '&' : '?';
    window.location.href = `${meta.href}${sep}user=${activeUserKey}`;
  }

  // =========================================================
  // 🧭 4. 글로벌 클릭 핸들러 (과목 섬/포털, 4칸 허브, 5구역 하단바)
  // =========================================================
  window.handleSubjectNodeClick = function (subjKey) {
    const state = getSubjectCapState(subjKey, activeUserKey);
    if (state === 'completed') {
      window.openDailyCapModal(subjKey);
      return;
    }
    navigateToSubjectRoom(subjKey);
  };

  window.togglePortalCard = function (cardId) {
    const cards = ['card-eng', 'card-kor', 'card-math', 'card-soc', 'card-sci'];
    cards.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      if (id === cardId) {
        el.classList.toggle('hidden');
      } else {
        el.classList.add('hidden');
      }
    });
  };

  window.toggleMinseoCard = function (cardId) {
    const cards = ['minseo-pop-korean', 'minseo-math-tooltip', 'minseo-pop-english', 'minseo-pop-haru'];
    cards.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      if (id === cardId) {
        el.classList.toggle('hidden');
      } else {
        el.classList.add('hidden');
      }
    });
  };

  window.switchLobbyUser = function (targetUser) {
    if (!USER_CONFIGS[targetUser]) return;
    applyLobbyThemeAndView(targetUser, true);
  };

  window.switchAdminLobbyChild = function (targetChild) {
    window.switchLobbyUser(targetChild);
  };

  window.handleLobbySettingsClick = function (event) {
    if (event) event.stopPropagation();
    const shield = document.getElementById('shield-icon');
    if (shield) {
      shield.classList.add('scale-125', 'text-amber-400');
      setTimeout(() => shield.classList.remove('scale-125', 'text-amber-400'), 280);
    }
    if (typeof SettingsManager !== 'undefined' && typeof SettingsManager.openModal === 'function') {
      SettingsManager.openModal();
    }
  };

  window.handleGuardianClick = function (childName) {
    const targetName = childName || getRealChildName(activeUserKey);
    if (typeof window.openScreenTimeReceiptModal === 'function') {
      window.openScreenTimeReceiptModal(targetName);
    }
  };

  window.goToFiveMinQuest = function (userKey) {
    const uKey = userKey || activeUserKey;
    window.location.href = `monster_lab.html?user=${uKey}`;
  };

  window.navigateToHub = function (hubType, userKey) {
    const uKey = userKey || activeUserKey;
    switch (hubType) {
      case 'myroom':
      case 'wishshop':
        window.location.href = `kids/common_space/my-room.html?user=${uKey}`;
        break;
      case 'gallery':
        window.location.href = `kids/common_space/gallery.html?user=${uKey}`;
        break;
      case 'timetable':
        window.location.href = isAdminSession ? 'timetable.html?view=monitor' : `timetable.html?user=${uKey}`;
        break;
      case 'dashboard':
        window.location.href = isAdminSession ? 'parent_dashboard.html?role=parent' : `parent_dashboard.html?user=${uKey}`;
        break;
      case 'voca':
        window.location.href = `kids/common_space/voca.html?user=${uKey}`;
        break;
      default:
        break;
    }
  };

  window.handleBottomNav = function (tab, userKey, event) {
    if (event) event.preventDefault();
    const uKey = userKey || activeUserKey;
    const realName = getRealChildName(uKey);

    switch (tab) {
      case 'diary':
        if (typeof window.openDailyDiaryModal === 'function') {
          window.openDailyDiaryModal();
        } else {
          window.location.href = `lobby.html?user=${uKey}&action=diary`;
        }
        break;
      case 'upload':
        if (typeof window.openQuickUploader === 'function') {
          window.openQuickUploader({ defaultAuthor: realName });
        }
        break;
      case 'voca':
        window.location.href = `kids/common_space/voca.html?user=${uKey}`;
        break;
      case 'playground':
        window.openPlaygroundModal(uKey);
        break;
      case 'profile':
        window.location.href = 'index.html';
        break;
      default:
        window.scrollTo({ top: 0, behavior: 'smooth' });
        break;
    }
  };

  window.switchLobbyTab = function () {};
  window.toggleFutureWorlds = function () {};
  window.setSubjectCapOverride = function (userKey, subjKey, state) {
    if (!state) {
      localStorage.removeItem(`DAILY_CAP_OVERRIDE_${userKey}_${subjKey}`);
    } else {
      localStorage.setItem(`DAILY_CAP_OVERRIDE_${userKey}_${subjKey}`, state);
    }
    renderSubjectCapStates(activeUserKey);
  };

  // =========================================================
  // ⏰ 5. 가디언 남은 시간 & 노션 INVENTORY_DB 동기화
  // =========================================================
  function updateGuardianHud(userKey, childName) {
    const minseoText = document.getElementById('minseoGuardianText');
    const minseoBar = document.getElementById('minseoGuardianBar');
    const minsuText = document.getElementById('minsuGuardianText');
    const minsuBars = document.getElementById('minsuGuardianBars');

    let summary = null;
    if (typeof window.ScreenTimeTracker !== 'undefined' && typeof window.ScreenTimeTracker.getScreenTimeSummary === 'function') {
      summary = window.ScreenTimeTracker.getScreenTimeSummary(childName);
    }

    const totalStudied = summary ? Number(summary.totalMinutes || 0) : 0;
    const pendingMins = summary ? Number(summary.pendingMinutes || 0) : 0;

    if (minseoText) {
      if (totalStudied > 0) {
        const displayMins = pendingMins > 0 ? pendingMins : totalStudied;
        minseoText.textContent = `${displayMins}분 획득`;
        if (minseoBar) {
          const pct = Math.min(100, Math.max(20, Math.round((totalStudied / 60) * 100)));
          minseoBar.style.width = `${pct}%`;
        }
      } else {
        minseoText.textContent = `${USER_CONFIGS.minseo.defaultGuardianMins}분 남음`;
        if (minseoBar) minseoBar.style.width = '65%';
      }
    }

    if (minsuText) {
      if (totalStudied > 0) {
        minsuText.textContent = `GUARDIAN: +${totalStudied}m`;
      } else {
        minsuText.textContent = `GUARDIAN: ${USER_CONFIGS.minsu.defaultGuardianMins}m`;
      }
    }
    if (minsuBars && totalStudied > 0) {
      const activeCount = Math.min(4, Math.max(1, Math.ceil(totalStudied / 25)));
      const spans = minsuBars.querySelectorAll('span');
      spans.forEach((sp, idx) => {
        sp.className = idx < activeCount
          ? 'w-2 h-1.5 bg-secondary rounded-[1px] shadow-[0_0_3px_#10B981]'
          : 'w-2 h-1.5 bg-slate-700 rounded-[1px]';
      });
    }
  }

  function renderHudInventoryValues(userKey, data) {
    const diamond = Number(data.diamond ?? 2253);
    const slime = Number(data.slime ?? 24);
    const level = Number(data.level ?? 5);
    const tickets = Number(data.tickets ?? 3);

    const minseoHaribo = document.getElementById('minseoHariboText');
    const minseoWishNum = document.getElementById('minseoWishHariboNum');
    const minseoLevel = document.getElementById('minseoLevelBadge');
    const minseoCoin = document.getElementById('minseoCoinCount');

    if (minseoHaribo) minseoHaribo.textContent = `${slime.toLocaleString()} Haribo`;
    if (minseoWishNum) minseoWishNum.textContent = slime.toLocaleString();
    if (minseoLevel) minseoLevel.textContent = `★${level}`;
    if (minseoCoin) minseoCoin.textContent = `코인: ${tickets}개`;

    const minsuDiamond = document.getElementById('minsuDiamondText');
    const minsuArmory = document.getElementById('minsuArmoryCount');
    const minsuTitleLevel = document.getElementById('minsuTitleLevel');

    if (minsuDiamond) minsuDiamond.textContent = diamond.toLocaleString();
    if (minsuArmory) minsuArmory.textContent = `${diamond.toLocaleString()} 💎`;
    if (minsuTitleLevel) {
      minsuTitleLevel.textContent = isAdminSession
        ? `관리자 시뮬레이터 [LVL-${level}]`
        : `차원 사령관 [LVL-${level}]`;
    }
  }

  async function fetchInventoryForUser(userKey, childName) {
    const defaultTheme = userKey === 'minsu' ? '마인크래프트' : '슬라임';
    localStorage.setItem('currentTheme', defaultTheme);

    if (isAdminSession) {
      renderHudInventoryValues(userKey, { diamond: 2253, slime: 24, level: 99, tickets: 9 });
      return;
    }

    const invCacheKey = `MINMIN_INVENTORY_CACHE_${childName}`;
    try {
      const cachedRaw = localStorage.getItem(invCacheKey);
      if (cachedRaw) {
        const cached = JSON.parse(cachedRaw);
        if (cached && typeof cached === 'object') {
          renderHudInventoryValues(userKey, {
            diamond: cached.diamond ?? 2253,
            slime: cached.slime ?? 24,
            level: cached.level ?? 5,
            tickets: cached.tickets ?? 3
          });
          if (cached.dailyEarned && typeof cached.dailyEarned === 'object') {
            runtimeDailyEarned[userKey] = { ...cached.dailyEarned };
            renderSubjectCapStates(userKey);
          }
        }
      }
    } catch (e) {
      console.warn('[Lobby Inventory Cache] 캐시 파싱 경고:', e);
    }

    try {
      const proxyUrl = typeof PROXY_URL !== 'undefined'
        ? PROXY_URL
        : ((typeof APP_CONFIG !== 'undefined' && APP_CONFIG.WORKER_PROXY_URL) ? APP_CONFIG.WORKER_PROXY_URL : 'https://minmin-notion.awslike6.workers.dev');
      const invDbId = typeof INVENTORY_DB_ID !== 'undefined'
        ? INVENTORY_DB_ID
        : ((typeof APP_CONFIG !== 'undefined' && APP_CONFIG.INVENTORY_DB_ID) ? APP_CONFIG.INVENTORY_DB_ID : '374a27115b688042bb61e6a102242e12');

      const response = await fetch(`${proxyUrl}/v1/databases/${invDbId}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ filter: { property: '이름', title: { equals: childName } } })
      });
      const data = await response.json();
      if (!data.results || data.results.length === 0) return;

      const page = data.results[0];
      const props = page.properties || {};
      localStorage.setItem(`MINMIN_INVENTORY_PAGE_ID_${childName}`, page.id);

      if (typeof window.ScreenTimeTracker !== 'undefined' && typeof window.ScreenTimeTracker.syncFromInventoryProps === 'function') {
        window.ScreenTimeTracker.syncFromInventoryProps(props, childName);
        updateGuardianHud(userKey, childName);
      }
      if (props['학습설정']) {
        if (typeof syncQuizFlowFromCloud === 'function') syncQuizFlowFromCloud(props['학습설정']);
        if (typeof SettingsManager !== 'undefined' && typeof SettingsManager.syncFromCloud === 'function') {
          SettingsManager.syncFromCloud(props['학습설정']);
        }
      }

      const theme = props['현재 테마']?.select?.name || defaultTheme;
      localStorage.setItem('currentTheme', theme);

      const diamond = props['다이아몬드 개수']?.number ?? 2253;
      const slime = typeof getDaughterRewardCount === 'function'
        ? getDaughterRewardCount(props)
        : (props['하리보 개수']?.number ?? props['슬라임 파츠 개수']?.number ?? 24);
      const level = props['통합 레벨']?.formula?.number || props['수학 레벨']?.number || 5;
      const tickets = props['소원권 개수']?.number ?? props['소원뽑기권']?.number ?? 3;

      const lastDateText = props['오늘 획득_마지막날짜']?.rich_text?.[0]?.plain_text || '';
      const todayKst = getTodayKstString();
      const todayLocal = new Date().toLocaleDateString();
      const isTodayRecord = !lastDateText || lastDateText === todayKst || lastDateText === todayLocal;

      const dailyEarned = {};
      if (isTodayRecord) {
        Object.values(SUBJECT_META).forEach(meta => {
          const val = props[`오늘 획득_${meta.ko}`]?.number || 0;
          if (val > 0) dailyEarned[meta.key] = val;
        });
      }
      runtimeDailyEarned[userKey] = dailyEarned;

      renderHudInventoryValues(userKey, { diamond, slime, level, tickets });
      renderSubjectCapStates(userKey);

      localStorage.setItem(invCacheKey, JSON.stringify({
        diamond, slime, level, tickets, theme, dailyEarned, updatedAt: Date.now()
      }));
    } catch (err) {
      console.warn('[Lobby Inventory] 노션 동기화 오프라인/지연:', err);
    }
  }

  // =========================================================
  // ✨ 6. 마이크로 인터랙션 & 부트스트랩 구동
  // =========================================================
  function bindMicroInteractions() {
    document.addEventListener('click', function (e) {
      if (activeUserKey === 'minseo') {
        const s = document.createElement('div');
        s.className = 'sparkle';
        s.innerHTML = '✨';
        s.style.left = (e.pageX - 10) + 'px';
        s.style.top = (e.pageY - 10) + 'px';
        document.body.appendChild(s);
        setTimeout(() => s.remove(), 600);
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        window.closeDailyCapModal();
        window.closePlaygroundModal();
      }
    });
  }

  const initialUser = resolveInitialUserKey();
  bindMicroInteractions();
  applyLobbyThemeAndView(initialUser, false);

  if (typeof loadCoreScripts === 'function') {
    loadCoreScripts('kids/core/', lobbyCores, () => {
      console.log('🏰 Stitch AI 듀얼 로비 & 코어 엔진 결합 완료!');
      const realName = getRealChildName(activeUserKey);

      applyLobbyThemeAndView(activeUserKey, false);

      if (typeof initFairyChat === 'function') initFairyChat('KOREAN', '로비');
      if (typeof prefetchVocaData === 'function') prefetchVocaData(realName);
      if (typeof prefetchReadingData === 'function') prefetchReadingData({ student: realName });

      if (typeof window.ScreenTimeTracker !== 'undefined' && typeof window.ScreenTimeTracker.syncFromStudyLogs === 'function') {
        const proxyUrl = typeof PROXY_URL !== 'undefined'
          ? PROXY_URL
          : ((typeof APP_CONFIG !== 'undefined' && APP_CONFIG.WORKER_PROXY_URL) ? APP_CONFIG.WORKER_PROXY_URL : 'https://minmin-notion.awslike6.workers.dev');
        const studyDbId = typeof STUDY_LOG_DB_ID !== 'undefined'
          ? STUDY_LOG_DB_ID
          : ((typeof APP_CONFIG !== 'undefined' && APP_CONFIG.STUDY_LOG_DB_ID) ? APP_CONFIG.STUDY_LOG_DB_ID : '37aa27115b688001b2ffe5e6c8f82ab2');

        fetch(`${proxyUrl}/v1/databases/${studyDbId}/query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
          body: JSON.stringify({ page_size: 30, sorts: [{ property: '입장', direction: 'descending' }] })
        })
          .then(r => r.json())
          .then(data => {
            if (data && data.results) {
              window.ScreenTimeTracker.syncFromStudyLogs(data.results, getRealChildName(activeUserKey));
              updateGuardianHud(activeUserKey, getRealChildName(activeUserKey));
            }
          })
          .catch(e => console.warn('[ScreenTime] 일지 동기화 경고:', e));
      }

      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('action') === 'diary') {
        setTimeout(() => {
          if (typeof openDailyDiaryModal === 'function') openDailyDiaryModal();
        }, 350);
      }
    });
  }
})();
