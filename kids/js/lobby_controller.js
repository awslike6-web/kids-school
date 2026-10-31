
(function () {
  'use strict';

  const lobbyCores = [
    'core.js',
    'notion-helper.js',
    'fairy-config.js',
    'fairy-tts.js',
    'fairy-engine.js',
    'fairy-settings-catalog.js',
    'fairy-settings-engine.js',
    'fairy-chatbot.js',
    'daily-diary-base.js',
    'daily-diary-forms.js',
    'daily-diary-sync.js',
    'daily-diary-submit.js',
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

  const {
    getSubjectBoost, getSubjectCapState, renderSubjectCapStates,
    findRecommendedSubject, updateGuardianHud, fetchInventoryForUser
  } = window.LobbySubjectHud.create({
    getActiveUserKey: () => activeUserKey,
    getIsAdminSession: () => isAdminSession,
    runtimeDailyEarned,
    getRealChildName,
    getTodayKstString
  });

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

    renderLobbyStreaks();
  }

  // 🔥 연속 학습 불꽃 스트릭(Streak) HUD 점등 (학습 기록이 없으면 배지 숨김)
  function renderLobbyStreaks() {
    if (!window.StudyLogStore) return;
    window.StudyLogStore.renderStreakBadge('minseoStreakBadge', 'minseo', false);
    window.StudyLogStore.renderStreakBadge('minsuStreakBadge', 'minsu', true);
  }

  function setPopupLayer(cardEl, isOpen) {
    if (!cardEl) return;
    let target = cardEl.parentElement;
    while (target && target !== document.body) {
      const z = window.getComputedStyle(target).zIndex;
      if (z && z !== 'auto') break;
      target = target.parentElement;
    }
    if (!target) return;
    target.style.zIndex = isOpen ? '40' : '';
    target.style.animationPlayState = isOpen ? 'paused' : '';
  }

  function closeAllSubjectPopups() {
    const allCards = [
      'minseo-pop-korean', 'minseo-math-tooltip', 'minseo-pop-english', 'minseo-pop-haru',
      'card-eng', 'card-kor', 'card-math', 'card-soc', 'card-sci'
    ];
    allCards.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.classList.add('hidden');
        setPopupLayer(el, false);
      }
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
        const willOpen = el.classList.contains('hidden');
        el.classList.toggle('hidden');
        setPopupLayer(el, willOpen);
      } else {
        el.classList.add('hidden');
        setPopupLayer(el, false);
      }
    });
  };

  window.toggleMinseoCard = function (cardId) {
    const cards = ['minseo-pop-korean', 'minseo-math-tooltip', 'minseo-pop-english', 'minseo-pop-haru'];
    cards.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      if (id === cardId) {
        const willOpen = el.classList.contains('hidden');
        el.classList.toggle('hidden');
        setPopupLayer(el, willOpen);
      } else {
        el.classList.add('hidden');
        setPopupLayer(el, false);
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
    window.location.href = ['minseo', 'daughter'].includes(uKey) ? 'quest_runner.html?user=minseo&lesson=bite' : `monster_lab.html?user=${uKey}`;
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

      // 🔥 스트릭: 로컬 캐시로 먼저 그린 뒤, 노션 STUDY_LOG_DB 학습일 기준으로 다시 계산해 갱신
      if (window.StudyLogStore) {
        Promise.allSettled(['minseo', 'minsu'].map(child => window.StudyLogStore.refreshStreak(child)))
          .then(results => {
            results.filter(r => r.status === 'rejected').forEach(r => console.warn('[Streak] 학습일 동기화 경고:', r.reason));
            renderLobbyStreaks();
          });
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
