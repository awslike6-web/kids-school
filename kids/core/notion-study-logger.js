// ==============================================================================
// 📝 [Notion Study Logger] 학습일지 & 보상/레벨업 전송 엔진 (notion-study-logger.js)
// - 단일 책임: STUDY_LOG_DB 학습일지 생성, 25초 중복 전송 방어막, 오답 리포트 적재,
//             INVENTORY_DB 보상 지급, 일일 상한선 체크, 소원권/경험치/레벨 연산
// - 골디락스 응집도: ~380줄 컴팩트 독립 모듈
// ==============================================================================

(function(window) {
    'use strict';

    const PROXY_URL = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.WORKER_PROXY_URL) ? APP_CONFIG.WORKER_PROXY_URL : "https://minmin-notion.awslike6.workers.dev";
    const STUDY_LOG_DB_ID = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.STUDY_LOG_DB_ID) ? APP_CONFIG.STUDY_LOG_DB_ID : "37aa27115b688001b2ffe5e6c8f82ab2";
    const INVENTORY_DB_ID = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.INVENTORY_DB_ID) ? APP_CONFIG.INVENTORY_DB_ID : "374a27115b688042bb61e6a102242e12";

    // 🕒 전역 학습 시작 시간 자동 기록
    window.roomStartTime = window.roomStartTime || new Date();

    /**
     * 실행 페이지의 디렉터리 깊이에 따른 로비(lobby.html) 상대 경로 자동 계산
     */
    function getRelativeLobbyUrl() {
        const path = window.location.pathname;
        if (path.includes('/kids/subjects/') || path.includes('/kids/common_space/') || path.includes('/kids/playground/')) {
            return '../../../lobby.html';
        }
        if (path.includes('/kids/')) {
            return '../../lobby.html';
        }
        return './lobby.html';
    }
    window.getRelativeLobbyUrl = getRelativeLobbyUrl;

    /**
     * 경험치를 바탕으로 레벨업 단계 정보를 연산하는 공식
     */
    function calculateLevelInfo(totalRewards) {
        let level = 1; let requiredForNext = 20; let accumulatedForCurrentLevel = 0; 
        while (totalRewards >= accumulatedForCurrentLevel + requiredForNext) {
            accumulatedForCurrentLevel += requiredForNext; level++; requiredForNext = 20 + (level - 1) * 5; 
        }
        let currentLevelProgress = totalRewards - accumulatedForCurrentLevel; 
        let remainingForNext = requiredForNext - currentLevelProgress; 
        return { level, requiredForNext, remainingForNext, currentLevelProgress };
    }

    /**
     * 아버님의 새로운 노션 DB 구조에 맞춰 학습 일지를 생성하는 통합 함수
     */
    async function sendStudyLogToNotion(options = {}) {
        let childName = options.childName;
        if (!childName) {
            const curUser = localStorage.getItem('currentUser');
            const curChild = localStorage.getItem('currentChild');
            const curUserName = localStorage.getItem('currentUserName');
            if (curUser === 'daughter' || curChild === 'minseo' || curUserName === '민서' || (typeof currentProfile !== 'undefined' && currentProfile === 'daughter') || (window.currentProfile === 'daughter')) {
                childName = '민서';
            } else {
                childName = '민수';
            }
        }
        let subject = options.subject || window.currentSubject;
        if (!subject && typeof detectSubjectFromContext === 'function') {
            subject = detectSubjectFromContext();
        }

        // 🚨 [원천 방어막] 유효한 과목명이 없거나 "미상 과목"인 경우 노션 DB 오염 방지를 위해 전송 차단
        if (!subject || subject === "미상 과목") {
            console.warn(`⚠️ [학습일지 방어막] 유효한 교과목명이 없어 노션 전송을 안전하게 차단합니다. (감지된 과목: ${subject})`);
            return false;
        }

        // 🛑 [원천 중복 전송 방어막] 동일 세션 25초 이내 동일/유사 과목 재전송 원천 차단
        const nowTs = Date.now();
        window.__lastStudyLogHistory = window.__lastStudyLogHistory || [];
        const recentDuplicate = window.__lastStudyLogHistory.find(h => {
            const timeDiff = (nowTs - h.time) / 1000;
            const isSameStudent = h.childName === childName;
            const isRelatedSubj = h.subject === subject || h.subject.startsWith(subject) || subject.startsWith(h.subject);
            return isSameStudent && isRelatedSubj && timeDiff < 25;
        });

        if (recentDuplicate) {
            console.warn(`🛑 [학습일지 중복 방어막] 최근 ${Math.round((nowTs - recentDuplicate.time)/1000)}초 전에 이미 [${recentDuplicate.subject}] 일지가 기록되었습니다. 중복 전송을 안전하게 차단합니다! (시도: ${childName} - ${subject})`);
            return true;
        }

        const startTime = options.startTime || (window.roomStartTime ? window.roomStartTime.toISOString() : new Date().toISOString());
        const endTime = options.endTime || new Date().toISOString();
        
        // 소요시간 자동 연산
        let durationMinutes = options.durationMinutes;
        if (durationMinutes === undefined) {
            const timeDiff = new Date(endTime) - new Date(startTime);
            durationMinutes = Math.floor(timeDiff / 60000);
            if (durationMinutes < 1) durationMinutes = 1;
        }

        // ⏰ [스크린타임 트래커 연동] 오늘 순수 공부 시간 누적 기록
        if (typeof window.ScreenTimeTracker !== 'undefined' && typeof window.ScreenTimeTracker.trackStudySession === 'function') {
            window.ScreenTimeTracker.trackStudySession(durationMinutes, subject);
        } else if (typeof window.trackStudySession === 'function') {
            window.trackStudySession(durationMinutes, subject);
        } else {
            try {
                const now = new Date();
                const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                const k1 = `MINMIN_DAILY_STUDY_TIME_${childName}_${todayStr}`;
                const k2 = `MINMIN_DAILY_STUDY_TIME_${childName}_${now.toLocaleDateString()}`;
                const cur = Math.max(parseInt(localStorage.getItem(k1) || '0', 10), parseInt(localStorage.getItem(k2) || '0', 10)) + durationMinutes;
                localStorage.setItem(k1, String(cur));
                localStorage.setItem(k2, String(cur));
            } catch(e) {}
        }
        
        // 오답 리포트 자동 수집
        let errorReport = options.errorReport;
        if (errorReport === undefined) {
            const targetNotes = window.engWrongNotes || window.wrongNotes || [];
            errorReport = targetNotes.length > 0 ? targetNotes.map(q => {
                if (q.wrongInput) return `${q.word || q.text} (오답: ${q.wrongInput})`;
                return q.word || q.text || q;
            }).join(' / ') : "오답 없음";
        }
        
        const wordFairyCount = options.wordFairyCount || window.wordFairyCount || (window.learningSession ? window.learningSession.fairyClickCount : 0) || 0;

        console.log(`🚀 [학습일지 배달 시작] 학생: ${childName} | 과목: ${subject}`);

        // 💡 [핵심 방어막] 부모 계정 시뮬레이터 가동 시 데이터 오염 방지
        const savedName = localStorage.getItem('currentUserName');
        if (savedName === '아빠' || savedName === '엄마' || savedName === '어른') {
            console.log(`🛠️ [관리자 시뮬레이터 가동] ${savedName} 모드이므로 노션 서버 전송을 건너뛰고 프리패스합니다!`);
            return true; 
        }

        try {
            const payload = {
                parent: { database_id: STUDY_LOG_DB_ID },
                properties: {
                    "ID": { 
                        title: [{ text: { content: `${childName}_${new Date().toLocaleDateString()}` } }] 
                    },
                    "학생": { 
                        select: { name: childName } 
                    },
                    "과목": { 
                        rich_text: [{ text: { content: subject } }] 
                    },
                    "입장": { 
                        date: { start: startTime } 
                    },
                    "퇴장": { 
                        date: { start: endTime } 
                    },
                    "소요시간": { 
                        number: durationMinutes 
                    },
                    "오답리포트": { 
                        rich_text: [{ text: { content: errorReport || "오답 없음" } }] 
                    },
                    "단어요정": { 
                        number: wordFairyCount 
                    }
                }
            };

            const response = await fetch(`${PROXY_URL}/v1/pages`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
                keepalive: true 
            });

            if (!response.ok) throw new Error(`노션 통신 오류 (상태: ${response.status})`);

            window.__isStudyLogSentInSession = true;
            window.__lastStudyLogHistory.push({ childName, subject, time: nowTs });

            console.log("🎉 노션에 학습 일지가 완벽하게 기록되었습니다!");
            return true;
        } catch (error) {
            console.error("학습일지 전송 실패:", error);
            return false;
        }
    }

    /**
     * 💎 전역 만능 보상 지급 엔진 (일일 상한선 노션DB 연동 & 용어방 독립)
     */
    async function grantRewardAndShowUI(earned, isSilent = false, customExpType = null) {
        const userName = localStorage.getItem('currentUser') === 'son' ? '민수' : '민서'; 
        const currentTheme = localStorage.getItem('currentTheme') || '마인크래프트';
        
        // 💡 관리자 우회 모드 시 보상 전송 차단
        const savedName = localStorage.getItem('currentUserName');
        if (savedName === '아빠' || savedName === '엄마' || savedName === '어른') {
            console.log(`🛠️ [보상 프리패스] ${savedName} 모드이므로 노션 서버 전송을 건너뛰고 프리패스합니다! (${earned}개 획득 처리)`);
            return true;
        }

        const subjectName = window.currentSubject || "사회"; 
        let expPropName = `${subjectName} 경험치`;
        let levelPropName = `${subjectName} 레벨`;
        let dailyPropName = `오늘 획득_${subjectName}`;

        let vocaExpPropName = null;
        if (customExpType === 'voca') {
            vocaExpPropName = `용어 경험치_${subjectName}`;
        }

        // 🚀 시간표 부스트 연동
        const boostInfo = typeof window.TimetableBoost !== 'undefined'
            ? window.TimetableBoost.getSubjectBoostInfo(subjectName, userName)
            : { limit: 100, expMultiplier: 1.0, completionBonus: 5 };

        const DAILY_LIMIT = boostInfo.limit || 100;

        try {
            const response = await fetch(`${PROXY_URL}/v1/databases/${INVENTORY_DB_ID}/query`, { 
                method: "POST", headers: { "Content-Type": "application/json" }, 
                body: JSON.stringify({ filter: { property: "이름", title: { equals: userName } } }) 
            });
            
            if (!response.ok) {
                const queryErr = await response.text();
                console.error("인벤토리 조회 쿼리 실패:", queryErr);
                throw new Error(`인벤토리 조회 실패 (${response.status})`);
            }

            const data = await response.json(); 
            if (!data.results || data.results.length === 0) throw new Error("학생 인벤토리 없음");
            
            const page = data.results[0]; 
            const props = page.properties;

            localStorage.setItem(`MINMIN_INVENTORY_PAGE_ID_${userName}`, page.id);
            if (typeof window.ScreenTimeTracker !== 'undefined' && typeof window.ScreenTimeTracker.syncFromInventoryProps === 'function') {
                window.ScreenTimeTracker.syncFromInventoryProps(props, userName);
            }
            if (props["학습설정"]) {
                if (typeof syncQuizFlowFromCloud === 'function') {
                    syncQuizFlowFromCloud(props["학습설정"]);
                }
                if (typeof SettingsManager !== 'undefined' && typeof SettingsManager.syncFromCloud === 'function') {
                    SettingsManager.syncFromCloud(props["학습설정"]);
                }
            }

            // 자정 초기화 체크
            const todayStr = new Date().toLocaleDateString();
            const lastDateKey = `last_play_date_${userName}_${subjectName}`;
            const lastPlayDate = localStorage.getItem(lastDateKey);
            
            let todayEarned = props[dailyPropName]?.number || 0;
            if (lastPlayDate !== todayStr) {
                todayEarned = 0;
                localStorage.setItem(lastDateKey, todayStr);
            }

            // 일일 상한선 체크
            let allowedCurrency = earned;
            let isLimitReached = false;
            if (todayEarned + earned > DAILY_LIMIT) {
                allowedCurrency = Math.max(0, DAILY_LIMIT - todayEarned);
                isLimitReached = true;
            }
            
            if (allowedCurrency <= 0 && isLimitReached) {
                if (!isSilent) {
                    let msg = `⏳ 오늘 [${subjectName}] 과목에서 얻을 수 있는 보상을 모두 모았어요!\n(일일 상한선 ${DAILY_LIMIT}개 도달${boostInfo.type === 'review' ? ' · 오늘 복습 부스트 150개 적용됨' : ''})\n내일 다시 즐겁게 탐험해 봐요!`;
                    if (typeof showRewardModal === 'function' && typeof updateRewardModal === 'function') {
                        showRewardModal(`<div style="color: #ff073a; font-weight: bold;">⚠️ 오늘 ${subjectName} 보상을 모두 캤습니다!<br><span style="font-size:0.9rem; color:#666;">(일일 상한선 ${DAILY_LIMIT}개 도달)</span><br><br><button onclick="location.href=(typeof getRelativeLobbyUrl==='function'?getRelativeLobbyUrl():'./lobby.html')">로비로 나가기</button></div>`);
                    } else {
                        alert(msg);
                    }
                }
                return false; 
            }

            let diamond = props["다이아몬드 개수"]?.number || 0; 
            let slime = typeof getDaughterRewardCount === 'function'
                ? getDaughterRewardCount(props)
                : (props["슬라임 파츠 개수"]?.number || 0);
            let tickets = props["소원권 개수"]?.number || 0;
            let currentExp = props[expPropName]?.number || 0; 
            
            let previousWealth = currentTheme === '마인크래프트' ? diamond : slime;
            let currentWealth = previousWealth + allowedCurrency;
            
            let finalEarnedExp = Math.round(earned * (boostInfo.expMultiplier || 1.0));
            let newExp = currentExp + finalEarnedExp;
            
            const prevLevelInfo = calculateLevelInfo(currentExp);
            const currLevelInfo = calculateLevelInfo(newExp);

            const cumKey = `MINMIN_CUMULATIVE_WEALTH_${userName}`;
            let cumulativeWealth = parseInt(localStorage.getItem(cumKey), 10);
            if (isNaN(cumulativeWealth) || cumulativeWealth < currentWealth) {
                cumulativeWealth = currentWealth;
            }
            const prevCumulative = cumulativeWealth;
            cumulativeWealth += allowedCurrency;
            localStorage.setItem(cumKey, String(cumulativeWealth));

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

            let earnedTickets = Math.floor(cumulativeWealth / 150) - Math.floor(prevCumulative / 150);
            earnedTickets = Math.max(0, earnedTickets);
            let newTickets = tickets + earnedTickets;

            let updateProps = { 
                "소원권 개수": { number: newTickets },
                [expPropName]: { number: newExp },
                [dailyPropName]: { number: todayEarned + allowedCurrency }
            };
            
            if (levelPropName) {
                updateProps[levelPropName] = { number: currLevelInfo.level };
            }

            if (vocaExpPropName) {
                let currentVocaExp = props[vocaExpPropName]?.number || 0;
                let newVocaExp = currentVocaExp + earned;
                updateProps[vocaExpPropName] = { number: newVocaExp };
                
                const subjects = ["국어", "수학", "영어", "사회", "과학"];
                let totalVocaLevel = 0;
                let subjectCount = 0;
                
                for (const sub of subjects) {
                    const propName = `용어 경험치_${sub}`;
                    if (props[propName] !== undefined || sub === subjectName) {
                        let exp = props[propName]?.number || 0;
                        if (sub === subjectName) exp = newVocaExp;
                        const levelInfo = calculateLevelInfo(exp);
                        totalVocaLevel += levelInfo.level;
                        subjectCount++;
                    }
                }
                
                if (subjectCount > 0) {
                    const averageVocaLevel = Math.floor(totalVocaLevel / subjectCount);
                    updateProps["용어 레벨"] = { number: averageVocaLevel };
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

            const patchRes = await fetch(`${PROXY_URL}/v1/pages/${page.id}`, { 
                method: "PATCH", headers: { "Content-Type": "application/json" }, 
                body: JSON.stringify({ properties: updateProps }) 
            });
            
            if (!patchRes.ok) {
                const errText = await patchRes.text();
                throw new Error(`노션 업데이트 실패 (상태: ${patchRes.status}): ${errText}`);
            }
            
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
            } catch (e) {}
            
            if (!isSilent) {
                let rewardName = typeof getRewardDisplayLabel === 'function'
                    ? getRewardDisplayLabel(currentTheme)
                    : (currentTheme === '마인크래프트' ? '💎 다이아몬드' : '🍬 하리보 젤리');
                
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
                        <button onclick="location.href=(typeof getRelativeLobbyUrl==='function'?getRelativeLobbyUrl():'./lobby.html')" style="padding: 10px 20px; font-size: 1.1rem; border: none; border-radius: 8px; background-color: #4CAF50; color: white; cursor: pointer; font-weight: bold;">대형 로비로 돌아가기</button>
                    `);
                    const modal = document.getElementById('rewardModal');
                    if (modal) modal.style.display = 'block';
                } else if (document.getElementById('r-detail')) {
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
                } else {
                    let alertMsg = `🎉 보상 획득 완료!\n+${allowedCurrency}개 적립! (오늘 ${todayEarned + allowedCurrency}/${DAILY_LIMIT})`;
                    if (levelPropName) alertMsg += `\n${subjectName} 레벨: Lv.${currLevelInfo.level}`;
                    else alertMsg += `\n용어 경험치가 상승했습니다!`;
                    alert(alertMsg);
                }
            }

            if (earnedTickets > 0) {
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
            return false;
        }
    }

    // ----------------------------------------------------
    // 전역 바인딩 및 네임스페이스
    // ----------------------------------------------------
    window.NotionStudyLogger = {
        calculateLevelInfo,
        sendStudyLogToNotion,
        grantRewardAndShowUI
    };

    window.calculateLevelInfo = calculateLevelInfo;
    window.sendStudyLogToNotion = sendStudyLogToNotion;
    window.grantRewardAndShowUI = grantRewardAndShowUI;

})(typeof window !== 'undefined' ? window : this);
