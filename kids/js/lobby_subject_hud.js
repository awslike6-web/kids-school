(function () {
'use strict';

function create(ctx) {
  const { getRealChildName, getTodayKstString, runtimeDailyEarned } = ctx;

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
    const uKey = userKey || ctx.getActiveUserKey();
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
    const uKey = userKey || ctx.getActiveUserKey();
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
    const uKey = userKey || ctx.getActiveUserKey();
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
      minsuTitleLevel.textContent = ctx.getIsAdminSession()
        ? `관리자 시뮬레이터 [LVL-${level}]`
        : `차원 사령관 [LVL-${level}]`;
    }
  }

  async function fetchInventoryForUser(userKey, childName) {
    const defaultTheme = userKey === 'minsu' ? '마인크래프트' : '슬라임';
    localStorage.setItem('currentTheme', defaultTheme);

    if (ctx.getIsAdminSession()) {
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

  return {
    getSubjectBoost,
    getSubjectCapState,
    renderSubjectCapStates,
    findRecommendedSubject,
    updateGuardianHud,
    fetchInventoryForUser
  };
}

window.LobbySubjectHud = { create };
})();
