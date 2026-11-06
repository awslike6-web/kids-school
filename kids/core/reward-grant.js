// 보상 지급·오프라인 대기열의 단일 원천. 공개 전역은 MinminRewardGrant 하나입니다.
(function (window) {
  'use strict';
  if (window.MinminRewardGrant) return;
  const PROXY_URL = typeof APP_CONFIG !== 'undefined' && APP_CONFIG.WORKER_PROXY_URL ? APP_CONFIG.WORKER_PROXY_URL : 'https://minmin-notion.awslike6.workers.dev';
  const INVENTORY_DB_ID = typeof APP_CONFIG !== 'undefined' && APP_CONFIG.INVENTORY_DB_ID ? APP_CONFIG.INVENTORY_DB_ID : '374a27115b688042bb61e6a102242e12';
  const QUEUE_KEY = 'MINMIN_REWARD_QUEUE_V1';
  let flushing = null, pending = Promise.resolve();
  const isAdmin = () => ['아빠', '엄마', '어른'].includes(localStorage.getItem('currentUserName'));
  function readQueue() {
    try {
      const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '{}');
      return queue && typeof queue === 'object' && !Array.isArray(queue) ? queue : {};
    } catch { return {}; }
  }
  function saveQueue(queue) { localStorage.setItem(QUEUE_KEY, JSON.stringify(queue)); }

  // 🫧 보상 말풍선: 공부 흐름을 막지 않도록 화면 위쪽에 잠깐 떴다가 저절로 사라진다.
  // 누를 필요가 없고(pointer-events: none) 연달아 오면 한 개를 새 글자로 바꿔 다시 보여 준다(쌓이지 않음).
  let toastTimer = null;
  function ensureToastStyle(doc) {
    if (doc.getElementById('minmin-reward-toast-style')) return;
    const style = doc.createElement('style');
    style.id = 'minmin-reward-toast-style';
    style.textContent = `
      .minmin-reward-toast { position: fixed; top: 14px; left: 50%; z-index: 2147483000;
        transform: translate(-50%, -12px); opacity: 0; pointer-events: none;
        max-width: calc(100vw - 32px); box-sizing: border-box; padding: 9px 16px; border-radius: 999px;
        background: rgba(15, 23, 42, 0.88); color: #fff; font: 700 0.95rem/1.35 'Jua', 'Nanum Gothic', sans-serif;
        border: 1px solid rgba(255, 255, 255, 0.28); box-shadow: 0 6px 18px rgba(0, 0, 0, 0.25); text-align: center; white-space: pre-line;
        transition: opacity 0.25s ease, transform 0.25s ease; }
      .minmin-reward-toast.is-shown { opacity: 1; transform: translate(-50%, 0); }
      .minmin-reward-toast.is-levelup { background: linear-gradient(135deg, #7c3aed, #db2777); }
      .minmin-reward-toast.is-info { background: rgba(71, 85, 105, 0.92); }
      @media (prefers-reduced-motion: reduce) { .minmin-reward-toast { transition: opacity 0.2s ease; transform: translate(-50%, 0); } }`;
    (doc.head || doc.documentElement).appendChild(style);
  }
  function showRewardToast(text, options = {}) {
    const doc = window.document;
    if (!doc || !doc.body || !text) return false;
    ensureToastStyle(doc);
    let el = doc.getElementById('minminRewardToast');
    if (!el) {
      el = doc.createElement('div');
      el.id = 'minminRewardToast';
      el.className = 'minmin-reward-toast';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      doc.body.appendChild(el);
    }
    el.textContent = String(text);
    el.classList.toggle('is-levelup', options.tone === 'levelup');
    el.classList.toggle('is-info', options.tone === 'info');
    el.classList.remove('is-shown');
    void el.offsetWidth; // 같은 말풍선을 다시 띄울 때도 나타나는 움직임이 보이게 한다
    el.classList.add('is-shown');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-shown'), options.duration || 2400);
    return true;
  }
  function enqueue(entry) {
    if (!entry.subject || isAdmin()) return false;
    const queue = readQueue();
    queue[entry.id] = entry;
    saveQueue(queue);
    return true;
  }
  function serialize(fn) {
    const task = pending.catch(() => {}).then(() => window.navigator?.locks?.request
      ? window.navigator.locks.request('minmin-reward-queue', fn) : fn());
    pending = task;
    return task;
  }
  async function requestReward(url, options) {
    let response;
    try { response = await fetch(url, options); }
    catch (cause) { throw Object.assign(new Error('보상 요청 네트워크 오류', { cause }), { retryReward: true }); }
    if (!response.ok) {
      let detail = '';
      try { detail = await response.text(); } catch {}
      console.error('노션 보상 요청 에러 응답:', detail);
      throw Object.assign(new Error('보상 요청 실패 (' + response.status + '): ' + detail), { retryReward: true });
    }
    return response;
  }
  function flushQueue() {
    if (flushing) return flushing;
    flushing = serialize(async () => {
      if (isAdmin()) return;
      const entries = Object.values(readQueue()).sort((a, b) => a.createdAt - b.createdAt).slice(0, 10);
      for (const saved of entries) {
        if (isAdmin()) break;
        const entry = readQueue()[saved.id];
        if (!entry) continue;
        if (await payReward(entry, true, true)) {
          const latest = readQueue(); delete latest[entry.id]; saveQueue(latest);
        }
      }
    }).catch(error => console.warn('[보상 대기열] 다음 연결 때 재시도합니다.', error))
      .finally(() => { flushing = null; });
    return flushing;
  }


  async function payReward(entry, isSilent, fromQueue = false) {
  if (isAdmin()) return false;
  const { childName: userName, currentTheme, earned, customExpType } = entry;
  let patchSucceeded = false;

  // 💡 1. 대장님 노션 DB 칼럼명에 맞춘 완벽한 자동 라우팅
  // window.currentSubject가 없으면 "사회"로 폴백
  const subjectName = entry.subject || "사회";
  let expPropName = `${subjectName} 경험치`;   // 기본: "수학 경험치" 등
  let levelPropName = `${subjectName} 레벨`;   // 기본: "수학 레벨" 등
  let dailyPropName = `오늘 획득_${subjectName}`; // 기본: "오늘 획득_수학" 등

  let vocaExpPropName = null;
  // 용어방에서 호출했을 경우, 메인 경험치와 용어 경험치 쌍끌이(동시 누적) 적용
  if (customExpType === 'voca') {
      vocaExpPropName = `용어 경험치_${subjectName}`; // "용어 경험치_사회"
  }

  // 🚀 [시간표 부스트 연동] 오늘 복습 과목: 한도 150개 & EXP 1.2배!
  const boostInfo = typeof window.TimetableBoost !== 'undefined'
      ? window.TimetableBoost.getSubjectBoostInfo(subjectName, userName)
      : { limit: 100, expMultiplier: 1.0, completionBonus: 5 };

  const DAILY_LIMIT = boostInfo.limit || 100; // 하루 보상 획득 상한선 (복습 과목 150개 확장)

  try {
    const response = await requestReward(`${PROXY_URL}/v1/databases/${INVENTORY_DB_ID}/query?force=true`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filter: { property: "이름", title: { equals: userName } } })
    });

    const data = await response.json();
    if (!data.results || data.results.length === 0) throw new Error("학생 인벤토리 없음");

    const page = data.results[0];
    const props = page.properties;

    // ⚡ [SWR 클라우드 동기화] 인벤토리 페이지 ID 캐싱 및 노션 '학습설정' 동기화
    localStorage.setItem(`MINMIN_INVENTORY_PAGE_ID_${userName}`, page.id);
    if (typeof window.ScreenTimeTracker !== 'undefined' && typeof window.ScreenTimeTracker.syncFromInventoryProps === 'function') {
        window.ScreenTimeTracker.syncFromInventoryProps(props, userName);
    }
    const activeChild = localStorage.getItem('currentUser') === 'son' ? '민수' : '민서';
    if (activeChild === userName && props["학습설정"] && typeof syncQuizFlowFromCloud === 'function') {
        syncQuizFlowFromCloud(props["학습설정"]);
    }
    if (activeChild === userName && props["학습설정"] && typeof SettingsManager !== 'undefined' && typeof SettingsManager.syncFromCloud === 'function') {
        SettingsManager.syncFromCloud(props["학습설정"]);
    }

    // 💡 2. 자정(12시) 초기화를 위한 스마트 날짜 체크 로직
    const todayStr = new Date().toLocaleDateString();
    const lastDateKey = `last_play_date_${userName}_${subjectName}`;
    const lastPlayDate = localStorage.getItem(lastDateKey);

    // 노션에서 '오늘 획득_사회' 값 가져오기
    let todayEarned = props[dailyPropName]?.number || 0;

    // 만약 접속한 날짜가 바뀌었다면? (새로운 날이면 오늘 획득량을 0으로 리셋)
    if (lastPlayDate !== todayStr) {
        todayEarned = 0;
    }

    // 💡 3. 일일 상한선 (부분 지급 지원)
    let allowedCurrency = earned;
    let isLimitReached = false;
    if (todayEarned + earned > DAILY_LIMIT) {
        allowedCurrency = Math.max(0, DAILY_LIMIT - todayEarned);
        isLimitReached = true;
    }

    // 만약 이미 상한을 채워서 받을 수 있는 보상이 0개라면 조용히 넘어가거나 알림
    if (allowedCurrency <= 0 && isLimitReached) {
        if (!isSilent) {
            let msg = `⏳ 오늘 [${subjectName}] 과목에서 얻을 수 있는 보상을 모두 모았어요!\n(일일 상한선 ${DAILY_LIMIT}개 도달${boostInfo.type === 'review' ? ' · 오늘 복습 부스트 150개 적용됨' : ''})\n내일 다시 즐겁게 탐험해 봐요!`;
            if (typeof showRewardModal === 'function' && typeof updateRewardModal === 'function') {
                showRewardModal(`<div style="color: #ff073a; font-weight: bold;">⚠️ 오늘 ${subjectName} 보상을 모두 캤습니다!<br><span style="font-size:0.9rem; color:#666;">(일일 상한선 ${DAILY_LIMIT}개 도달)</span><br><br><button onclick="location.href=(typeof getRelativeLobbyUrl==='function'?getRelativeLobbyUrl():(window.location.pathname.includes('/kids-school/') ? '/kids-school/lobby.html' : '/lobby.html'))">로비로 나가기</button></div>`);
            } else {
                showRewardToast(`⏳ 오늘 ${subjectName} 보상은 다 모았어요! (${DAILY_LIMIT}/${DAILY_LIMIT})`, { tone: 'info', duration: 3000 });
            }
        }
        return false;
    }

    // 💡 4. 자산 및 경험치 계산 (시간표 부스트 가산)
    let diamond = props["다이아몬드 개수"]?.number || 0;
    let slime = typeof getDaughterRewardCount === 'function'
        ? getDaughterRewardCount(props)
        : (props["슬라임 파츠 개수"]?.number || 0);
    let tickets = props["소원권 개수"]?.number || 0;
    let currentExp = props[expPropName]?.number || 0;

    let previousWealth = currentTheme === '마인크래프트' ? diamond : slime;
    let currentWealth = previousWealth + allowedCurrency;

    // 🔥 복습 과목이면 경험치 1.2배 부스트 적용
    let finalEarnedExp = Math.round(earned * (boostInfo.expMultiplier || 1.0));
    let newExp = currentExp + finalEarnedExp; // 메인 경험치는 깎이지 않고 순수하게 모두 오르게 처리

    const prevLevelInfo = calculateLevelInfo(currentExp);
    const currLevelInfo = calculateLevelInfo(newExp);

    // 🎫 [소원권 누적 발급 안정화] 마이룸 가구 구매로 지갑이 줄어도 누적 150개 기준 안전 보존!
    const cumKey = `MINMIN_CUMULATIVE_WEALTH_${userName}`;
    let cumulativeWealth = parseInt(localStorage.getItem(cumKey), 10);
    if (isNaN(cumulativeWealth) || cumulativeWealth < currentWealth) {
        cumulativeWealth = currentWealth;
    }
    const prevCumulative = cumulativeWealth;
    cumulativeWealth += allowedCurrency;

    let earnedTickets = Math.floor(cumulativeWealth / 150) - Math.floor(prevCumulative / 150);
    earnedTickets = Math.max(0, earnedTickets);
    let newTickets = tickets + earnedTickets;

    // 📦 5. 노션 업데이트 보따리 (기본 공통 칼럼)
    let updateProps = {
        "소원권 개수": { number: newTickets },
        [expPropName]: { number: newExp },
        [dailyPropName]: { number: todayEarned + allowedCurrency }
    };

    if (levelPropName) {
        updateProps[levelPropName] = { number: currLevelInfo.level };
    }

    // 💡 용어(보카)방 전용 쌍끌이 보상 및 용어레벨(평균) 계산
    if (vocaExpPropName) {
        let currentVocaExp = props[vocaExpPropName]?.number || 0;
        let newVocaExp = currentVocaExp + earned;
        updateProps[vocaExpPropName] = { number: newVocaExp };

        // 전체 과목의 용어레벨 평균 계산
        const subjects = ["국어", "수학", "영어", "사회", "과학"];
        let totalVocaLevel = 0;
        let subjectCount = 0; // 실제로 용어 경험치 칼럼이 존재하는 과목만 카운트

        for (const sub of subjects) {
            const propName = `용어 경험치_${sub}`;
            // 노션 DB에 해당 과목의 용어 경험치 칼럼이 존재하는지 확인
            if (props[propName] !== undefined || sub === subjectName) {
                let exp = props[propName]?.number || 0;
                if (sub === subjectName) {
                    exp = newVocaExp; // 방금 얻은 최신 용어 경험치로 치환
                }
                const levelInfo = calculateLevelInfo(exp);
                totalVocaLevel += levelInfo.level;
                subjectCount++;
            }
        }

        // 유효한 과목이 있을 때만 평균 계산 및 업데이트
        if (subjectCount > 0) {
            const averageVocaLevel = Math.floor(totalVocaLevel / subjectCount);
            updateProps["용어 레벨"] = { number: averageVocaLevel }; // [용어 레벨] 필드에 평균값 매핑
        }
    }

    if (currentTheme === '마인크래프트') {
        updateProps["다이아몬드 개수"] = { number: currentWealth };
    } else {
        const daughterProp = typeof getRewardPropertyForUpdate === 'function'
            ? getRewardPropertyForUpdate(props, currentTheme)
            : "슬라임 파츠 개수";
        updateProps[daughterProp] = { number: currentWealth };
    }

    console.log(`[노션 보상 업데이트 시도] DB_ID: ${INVENTORY_DB_ID}, PAGE_ID: ${page.id}`);
    console.log("업데이트할 데이터:", JSON.stringify(updateProps, null, 2));

    // 노션으로 쏘기!
    await requestReward(`${PROXY_URL}/v1/pages/${page.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ properties: updateProps })
    });

    patchSucceeded = true;
    // 지급 확인 뒤에만 로컬 보상 누적을 반영한다. 로컬 오류 때문에 재지급하지 않는다.
    for (const apply of [
      () => localStorage.setItem(lastDateKey, todayStr),
      () => localStorage.setItem(cumKey, String(cumulativeWealth)),
      () => {
            if (allowedCurrency > 0) {
                if (typeof window.ScreenTimeTracker !== 'undefined' && typeof window.ScreenTimeTracker.recordDailyRewardEarned === 'function') {
                    window.ScreenTimeTracker.recordDailyRewardEarned(allowedCurrency, userName);
                } else if (typeof window.recordDailyRewardEarned === 'function') {
                    window.recordDailyRewardEarned(allowedCurrency, userName);
                } else {
                    try {
                        const now = new Date();
                        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                        const dk1 = `MINMIN_DAILY_REWARD_SUM_${userName}_${todayStr}`;
                        const dk2 = `MINMIN_DAILY_REWARD_SUM_${userName}_${now.toLocaleDateString()}`;
                        const curR = Math.max(parseInt(localStorage.getItem(dk1) || '0', 10), parseInt(localStorage.getItem(dk2) || '0', 10)) + allowedCurrency;
                        localStorage.setItem(dk1, String(curR));
                        localStorage.setItem(dk2, String(curR));
                    } catch(e) {}
                }
            }
      }
    ]) {
      try { apply(); } catch (error) { console.warn('[보상 로컬 반영 실패]', error); }
    }

    // ⚡ [SWR 캐시 동기화] 로비 인벤토리 로컬 캐시 즉각 최신화 (페이지 복귀 시 0.01초 반영)
    try {
      const invCacheKey = `MINMIN_INVENTORY_CACHE_${userName}`;
      const diamondVal = currentTheme === '마인크래프트' ? currentWealth : (props["다이아몬드 개수"]?.number || 0);
      const slimeVal = currentTheme !== '마인크래프트' ? currentWealth : (typeof getDaughterRewardCount === 'function' ? getDaughterRewardCount(props) : (props["슬라임 파츠 개수"]?.number || 0));
      localStorage.setItem(invCacheKey, JSON.stringify({
        diamond: diamondVal,
        slime: slimeVal,
        level: currLevelInfo.level,
        theme: currentTheme,
        updatedAt: Date.now()
      }));
    } catch (e) {
      console.warn("[Inventory Cache] 로컬 캐시 갱신 실패:", e);
    }

    if (!isSilent) {
        let rewardName = typeof getRewardDisplayLabel === 'function'
            ? getRewardDisplayLabel(currentTheme)
            : (currentTheme === '마인크래프트' ? '💎 다이아몬드' : '🍬 하리보 젤리');

        // 1️⃣ 국어방 모달 UI가 있다면 활용
        if (typeof showRewardModal === 'function' && typeof updateRewardModal === 'function') {
            let limitMessageHtml = "";
            if (isLimitReached) {
                limitMessageHtml = `<div style="background: rgba(255,152,0,0.1); border: 2px solid #ff9800; padding: 10px; border-radius: 8px; color: #ff9800; font-weight: bold; margin-bottom: 15px;">⚠️ 일일 최대 보상(${DAILY_LIMIT}개) 도달!<br><span style="font-size:0.9rem;">(이번엔 ${allowedCurrency}개만 획득)</span></div>`;
            }
            updateRewardModal(`
                ${limitMessageHtml}
                <b style="color:#0288D1; font-size: 1.5rem;">${rewardName} ${allowedCurrency}개 획득!</b> <span style="color:#8b949e; font-size:0.9rem;">(경험치 +${earned})</span><br><br>
                현재 총 자산: <b>${currentWealth}</b>개<br>
                <span style="font-size:0.9rem; color:#666;">다음 ${subjectName} 레벨(Lv.${currLevelInfo.level + 1})까지 경험치 ${currLevelInfo.remainingForNext} 필요!</span>
                ${currLevelInfo.level > prevLevelInfo.level ? `<br><br><span style="font-size:1.3rem; color:#FF6B9D; font-weight:bold;">🎉 ${subjectName} 레벨 업! Lv.${currLevelInfo.level} 🎉</span>` : ''}
                ${earnedTickets > 0 ? `<br><br><span style="font-size:1.2rem; color:#FFD700; font-weight:bold;">🎫 소원권 ${earnedTickets}장 추가 획득!!</span>` : ''}
                <br><br>
                <button onclick="location.href=(typeof getRelativeLobbyUrl==='function'?getRelativeLobbyUrl():(window.location.pathname.includes('/kids-school/') ? '/kids-school/lobby.html' : '/lobby.html'))" style="padding: 10px 20px; font-size: 1.1rem; border: none; border-radius: 8px; background-color: #4CAF50; color: white; cursor: pointer; font-weight: bold;">대형 로비로 돌아가기</button>
            `);

            // 여기서 화면에 띄우기 (만약 닫혀있었다면)
            const modal = document.getElementById('rewardModal');
            if (modal) {
                modal.style.display = 'block';
            }
        }
        // 2️⃣ 수학방 r-detail UI가 있다면 활용
        else if (document.getElementById('r-detail')) {
            let detailEl = document.getElementById('r-detail');
            detailEl.innerHTML += `
              <div style="background:rgba(255,255,255,0.8); border:2px dashed #6EC6F5; padding:16px; border-radius:12px; margin-top:10px; text-align: left;">
                <div style="font-size: 1.15rem; margin-bottom: 8px;">
                  <b style="color:#0288D1;">${rewardName} x ${allowedCurrency} 획득! (총 ${currentWealth}개)</b>
                </div>
                <div style="font-size: 0.95rem; color: #666; margin-bottom: 6px;">
                  다음 ${subjectName} 레벨(Lv.${currLevelInfo.level + 1})까지 경험치 <b>${currLevelInfo.remainingForNext}</b> 필요!
                </div>
                ${currLevelInfo.level > prevLevelInfo.level ? `<div style="text-align:center; font-size:1.3rem; color:#FF6B9D; font-weight:bold; margin-top:10px;">🎉 ${subjectName} 레벨 업! Lv.${currLevelInfo.level} 🎉</div>` : ''}
              </div>
            `;
        }
        // 3️⃣ 기본: 누를 필요 없는 작은 말풍선 (2026-11-06~, 예전에는 alert 창이라 매번 눌러 닫아야 했음)
        else {
            const leveledUp = levelPropName && currLevelInfo.level > prevLevelInfo.level;
            let toastMsg = `${rewardName} +${allowedCurrency}  ·  오늘 ${todayEarned + allowedCurrency}/${DAILY_LIMIT}`;
            if (leveledUp) toastMsg += `\n🎉 ${subjectName} 레벨 업! Lv.${currLevelInfo.level}`;
            else if (isLimitReached) toastMsg += `\n오늘 모을 수 있는 만큼 다 모았어요!`;
            showRewardToast(toastMsg, { tone: leveledUp ? 'levelup' : 'reward', duration: leveledUp ? 3600 : 2400 });
        }
    }

    // 소원권 공통 알림(모달 오버레이)
    if (!isSilent && earnedTickets > 0) {
        setTimeout(() => {
            const ticketDisplay = document.getElementById('wishTicketCountDisplay');
            if(ticketDisplay) ticketDisplay.textContent = newTickets;
            const overlay = document.getElementById('wishTicketOverlay');
            if(overlay) {
                overlay.classList.add('active');
                overlay.style.display = 'flex';
            }
        }, 1000);
    }

    return true;
  } catch (err) {
    console.error("❌ 보상 저장 오류:", err);
    if (patchSucceeded) return true;
    let queued = false;
    if (err.retryReward && !fromQueue) {
      try { queued = enqueue(entry); } catch (error) { console.warn('[보상 대기열 저장 실패]', error); }
    }
    if (queued) {
      if (!isSilent && typeof showRewardModal === 'function' && typeof updateRewardModal === 'function') {
        showRewardModal('<div id="rewardModalContent"></div>');
        updateRewardModal('인터넷이 연결되면 보상이 자동으로 들어가요');
      }
      return false;
    }
    if (!isSilent) {
        if (typeof updateRewardModal === 'function' && typeof showRewardModal === 'function') {
            showRewardModal(`<div id="rewardModalContent">보상 처리 중...</div>`);
            updateRewardModal(`
                <div style="color: #ff073a; font-weight: bold; font-size: 1.1rem; line-height: 1.5;">
                ❌ 노션 보상 저장 실패!<br>
                <span style="font-size:0.9rem; color:#555;">(노션 DB에 칼럼이 없거나 잘못되었을 확률이 높습니다)</span><br><br>
                💡 아빠! 인벤토리 DB에 아래 이름의 <b>[숫자] 속성(칼럼)</b>들이<br>모두 띄어쓰기까지 정확하게 만들어져 있는지 확인해주세요!<br>
                <div style="background:#fff; padding:10px; border-radius:8px; margin-top:10px; color:#333; font-size:0.95rem; text-align:left;">
                    - ${expPropName}<br>
                    - ${levelPropName ? levelPropName : '(레벨 칼럼은 안 씀)'}<br>
                    - ${dailyPropName}<br>
                    - 소원권 개수<br>
                    - 다이아몬드 개수<br>
                    - 하리보 젤리 개수 (또는 슬라임 파츠 개수)
                </div><br>
                자세한 에러 메시지는 개발자 도구(F12) 콘솔창에 빨간 글씨로 나옵니다.<br><br>
                <button onclick="location.href=(typeof getRelativeLobbyUrl==='function'?getRelativeLobbyUrl():(window.location.pathname.includes('/kids-school/') ? '/kids-school/lobby.html' : '/lobby.html'))">로비로 나가기</button>
                </div>
            `);
        } else {
            alert("❌ 보상 저장 실패! 노션 DB에 칼럼이 부족합니다. (F12 콘솔창 확인)\n에러 상세: " + err.message);
        }
    }
    return false;
  }
}

  async function grant(earned, isSilent = false, customExpType = null, context = null) {
    if (isAdmin()) return true;
    const entry = {
      id: window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      childName: localStorage.getItem('currentUser') === 'son' ? '민수' : '민서',
      currentTheme: localStorage.getItem('currentTheme') || '마인크래프트',
      subject: window.currentSubject || null, createdAt: Date.now(), ...context, earned, customExpType
    };
    try {
      const paid = await serialize(() => payReward(entry, isSilent));
      if (paid) await flushQueue();
      return paid;
    } catch (error) { console.warn('[보상 지급 실패]', error); return false; }
  }
  window.MinminRewardGrant = { grant, flushQueue, toast: showRewardToast };
  if (window.addEventListener) window.addEventListener('load', () => flushQueue());
  // 동적 로더가 load 뒤 완료되어도 저장된 보상을 한 번 재시도한다.
  if (typeof document !== 'undefined' && document.readyState === 'complete') flushQueue();
})(typeof window !== 'undefined' ? window : this);
