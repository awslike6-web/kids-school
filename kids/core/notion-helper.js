// ==========================================
// 💎 전역 만능 보상 지급 및 노션 학습 연동 핵심 통합 헬퍼 (notion-helper.js)
// ==========================================

var PROXY_URL = typeof APP_CONFIG !== 'undefined' && APP_CONFIG.WORKER_PROXY_URL ? APP_CONFIG.WORKER_PROXY_URL : "https://minmin-notion.awslike6.workers.dev";
var STUDY_LOG_DB_ID = typeof APP_CONFIG !== 'undefined' && APP_CONFIG.STUDY_LOG_DB_ID ? APP_CONFIG.STUDY_LOG_DB_ID : "37aa27115b688001b2ffe5e6c8f82ab2"; // 학습일지 DB ID
var INVENTORY_DB_ID = typeof APP_CONFIG !== 'undefined' && APP_CONFIG.INVENTORY_DB_ID ? APP_CONFIG.INVENTORY_DB_ID : "374a27115b688042bb61e6a102242e12"; // 8042로 통일
var VOCA_DB_ID = typeof APP_CONFIG !== 'undefined' && APP_CONFIG.VOCA_DB_ID ? APP_CONFIG.VOCA_DB_ID : "375a27115b688038b686d3994ee12919";

/**
 * 노션 VOCA DB 페이지 1건을 공통 객체로 변환
 */
function parseVocaPage(page) {
    const p = page.properties;
    const imgFile = p["이미지파일"]?.files?.[0];
    const imageUrl = imgFile?.file?.url || imgFile?.external?.url
        || p["이미지파일"]?.url
        || p["이미지파일"]?.rich_text?.[0]?.plain_text
        || null;
    const unitRaw = p["단원"]?.rich_text?.[0]?.plain_text
        ?? p["단원"]?.number
        ?? p["단원"]?.select?.name
        ?? p["단원"]?.multi_select?.[0]?.name
        ?? p["단계"]?.number
        ?? "기본 단원";
    const grades = p["학년"]?.multi_select?.map(item => item.name)
        || (p["학년"]?.select?.name ? [p["학년"].select.name] : [])
        || (p["학년"]?.rich_text?.[0]?.plain_text ? [p["학년"].rich_text[0].plain_text] : []);

    return {
        pageId: page.id,
        id: page.id,
        word: p["단어"]?.title?.[0]?.plain_text || p["이름"]?.title?.[0]?.plain_text || "",
        meaning: p["뜻풀이"]?.rich_text?.[0]?.plain_text || p["뜻"]?.rich_text?.[0]?.plain_text || "",
        detailContext: p["상세설명"]?.rich_text?.map(t => t.plain_text).join("") || "",
        imageUrl,
        pos: p["품사"]?.rich_text?.[0]?.plain_text || "",
        wordType: p["어휘유형"]?.select?.name || "",
        type: p["어휘유형"]?.select?.name || "",
        stage: String(unitRaw),
        level: unitRaw,
        grades,
        grade: grades[0] || "공통",
        subject: p["과목"]?.multi_select?.map(item => item.name) || [],
        target: p["학생"]?.multi_select?.map(item => item.name) || [],
        isAchieved: p["달성"]?.checkbox || false,
        areaZone: p["영역 분류"]?.select?.name || "",
        hint: p["초성힌트"]?.rich_text?.[0]?.plain_text || "",
        quiz: p["퀴즈제시"]?.rich_text?.[0]?.plain_text || ""
    };
}

function _matchesVocaRecord(record, options) {
    if (!record.word) return false;

    if (options.filterByStudent !== false) {
        let loginName = (options.studentName ?? window.currentUserName ?? "민수").trim();
        
        // 💡 부모님 프로필(아빠/엄마/어른)로 로그인해서 테스트 중일 때는,
        // 선택된 아이(son/daughter) 프로필을 기반으로 타겟팅을 스위칭해줍니다.
        if (loginName === '아빠' || loginName === '엄마' || loginName === '어른') {
            const profile = window.currentProfile || localStorage.getItem('currentUser') || 'son';
            loginName = profile === 'daughter' ? '민서' : '민수';
        }

        if (record.target.length > 0 && !record.target.some(t => t.trim() === loginName)) {
            return false;
        }
    }

    if (options.subject) {
        const allowed = [options.subject, ...(options.altSubjects || [])];
        if (!record.subject.some(s => allowed.includes(s))) return false;
    }

    if (options.areaZone && record.areaZone !== options.areaZone) return false;

    return true;
}

function _buildVocaQueryBody(options) {
    const body = { page_size: 100 };

    if (options.useServerFilter && options.subject && options.areaZone) {
        body.filter = {
            and: [
                { property: "과목", multi_select: { contains: options.subject } },
                { property: "영역 분류", select: { equals: options.areaZone } }
            ]
        };
    }

    return body;
}

/**
 * 노션 VOCA DB에서 단어·공부 데이터를 가져오는 통합 fetch
 *
 * @param {Object} [options]
 * @param {string} [options.subject] - "국어", "영어", "사회", "받아쓰기" 등. 생략 시 전 과목
 * @param {string[]} [options.altSubjects] - 과목 별칭 (예: 영어 → ["영단어"])
 * @param {string} [options.areaZone] - 사회방 "영역 분류" (용어방, 자료실, 지도탐방, 역사)
 * @param {string} [options.studentName] - 학생 이름 필터 (기본: window.currentUserName)
 * @param {boolean} [options.filterByStudent=true] - 학생 필터 적용 여부
 * @param {boolean} [options.useServerFilter=false] - true면 과목+영역을 노션 API filter로 전송
 * @param {string} [options.dbId] - DB ID override (기본: VOCA_DB_ID)
 * @returns {Promise<Array>}
 */
async function fetchVocaFromNotion(options = {}) {
    const dbId = options.dbId || VOCA_DB_ID;
    const queryOptions = {
        subject: options.subject || null,
        altSubjects: options.altSubjects || [],
        areaZone: options.areaZone || null,
        studentName: options.studentName,
        filterByStudent: options.filterByStudent !== false,
        useServerFilter: options.useServerFilter === true
    };

    let allResults = [];
    let hasMore = true;
    let nextCursor = undefined;

    try {
        while (hasMore) {
            const bodyData = _buildVocaQueryBody(queryOptions);
            if (nextCursor) bodyData.start_cursor = nextCursor;

            const response = await fetch(`${PROXY_URL}/v1/databases/${dbId}/query`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(bodyData)
            });

            if (!response.ok) throw new Error(`노션 VOCA DB 통신 오류 (상태: ${response.status})`);

            const data = await response.json();
            allResults = allResults.concat(data.results || []);
            hasMore = data.has_more;
            nextCursor = data.next_cursor;
        }

        return allResults
            .map(parseVocaPage)
            .filter(record => _matchesVocaRecord(record, queryOptions));
    } catch (error) {
        console.error(`[fetchVocaFromNotion] ${options.subject || "전체"} 데이터 로딩 실패:`, error);
        return [];
    }
}

// 🕒 전역 학습 시작 시간 자동 기록
window.roomStartTime = window.roomStartTime || new Date();

/**
 * 아버님의 새로운 노션 DB 구조에 맞춰 학습 일지를 생성하는 통합 함수
 * 매개변수를 생략해도 현재 환경(window 객체)을 바탕으로 자동으로 채웁니다.
 */
async function sendStudyLogToNotion(options = {}) {
    const childName = options.childName || (localStorage.getItem('currentUser') === 'son' ? '민수' : '민서');
    const subject = options.subject || window.currentSubject || "미상 과목";
    const startTime = options.startTime || window.roomStartTime.toISOString();
    const endTime = options.endTime || new Date().toISOString();
    
    // 소요시간 자동 연산
    let durationMinutes = options.durationMinutes;
    if (durationMinutes === undefined) {
        const timeDiff = new Date(endTime) - new Date(startTime);
        durationMinutes = Math.floor(timeDiff / 60000);
        if (durationMinutes < 1) durationMinutes = 1;
    }
    
    // 오답 리포트 자동 수집
    let errorReport = options.errorReport;
    if (errorReport === undefined) {
        // 영어(engWrongNotes) 또는 국어/수학(wrongNotes) 배열 호환
        const targetNotes = window.engWrongNotes || window.wrongNotes || [];
        errorReport = targetNotes.length > 0 ? targetNotes.map(q => {
            if (q.wrongInput) return `${q.word || q.text} (오답: ${q.wrongInput})`;
            return q.word || q.text || q;
        }).join(' / ') : "오답 없음";
    }
    
    const wordFairyCount = options.wordFairyCount || 0;

    console.log(`🚀 [학습일지 배달 시작] 학생: ${childName} | 과목: ${subject}`);

    // 💡 [핵심 방어막] 현재 로그인한 사람이 아빠나 엄마인지 실시간 체크!
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

        console.log("🎉 노션에 학습 일지가 완벽하게 기록되었습니다!");
        return true;
    } catch (error) {
        console.error("학습일지 전송 실패:", error);
        return false;
    }
}

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
 * 💎 전역 만능 보상 지급 엔진 (일일 상한선 노션DB 연동 & 용어방 독립)
 */
async function grantRewardAndShowUI(earned, isSilent = false, customExpType = null) {
  const userName = localStorage.getItem('currentUser') === 'son' ? '민수' : '민서'; 
  const currentTheme = localStorage.getItem('currentTheme') || '마인크래프트';
  
  // 💡 [핵심 방어막] 현재 로그인한 사람이 아빠나 엄마인지 실시간 체크 (우회 모드 시 보상 전송 차단)
  const savedName = localStorage.getItem('currentUserName');
  if (savedName === '아빠' || savedName === '엄마' || savedName === '어른') {
      console.log(`🛠️ [보상 프리패스] ${savedName} 모드이므로 노션 서버 전송을 건너뛰고 프리패스합니다! (${earned}개 획득 처리)`);
      return true;
  }

  // 💡 1. 대장님 노션 DB 칼럼명에 맞춘 완벽한 자동 라우팅
  const subjectName = window.currentSubject || "사회"; 
  let expPropName = `${subjectName} 경험치`;   // 기본: "사회 경험치"
  let levelPropName = `${subjectName} 레벨`;   // 기본: "사회 레벨"
  let dailyPropName = `오늘 획득_${subjectName}`; // 기본: "오늘 획득_사회"

  // 용어방에서 호출했을 경우 덮어쓰기 (레벨 칼럼은 없으므로 null 처리)
  if (customExpType === 'voca') {
      expPropName = `용어 경험치_${subjectName}`; // "용어 경험치_사회"
      levelPropName = null; // 대장님 기획대로 용어 레벨은 노션으로 전송하지 않음!
  }

  const DAILY_LIMIT = 100; // 하루 보상 획득 상한선 (필요시 수정)

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

    // 💡 2. 자정(12시) 초기화를 위한 스마트 날짜 체크 로직
    const todayStr = new Date().toLocaleDateString();
    const lastDateKey = `last_play_date_${userName}_${subjectName}`;
    const lastPlayDate = localStorage.getItem(lastDateKey);
    
    // 노션에서 '오늘 획득_사회' 값 가져오기
    let todayEarned = props[dailyPropName]?.number || 0;
    
    // 만약 접속한 날짜가 바뀌었다면? (새로운 날이면 오늘 획득량을 0으로 리셋)
    if (lastPlayDate !== todayStr) {
        todayEarned = 0;
        localStorage.setItem(lastDateKey, todayStr);
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
            let msg = `⏳ 오늘 [${subjectName}] 과목에서 얻을 수 있는 보상을 모두 모았어요!\n(일일 상한선 ${DAILY_LIMIT}개 도달)\n내일 다시 즐겁게 탐험해 봐요!`;
            if (typeof showRewardModal === 'function' && typeof updateRewardModal === 'function') {
                showRewardModal(`<div style="color: #ff073a; font-weight: bold;">⚠️ 오늘 ${subjectName} 보상을 모두 캤습니다!<br><br><button onclick="location.href=window.location.pathname.includes('/kids-school/') ? '/kids-school/lobby.html' : '/lobby.html'">로비로 나가기</button></div>`);
            } else {
                alert(msg);
            }
        }
        return false; 
    }

    // 💡 4. 자산 및 경험치 계산
    let diamond = props["다이아몬드 개수"]?.number || 0; 
    let slime = props["슬라임 파츠 개수"]?.number || 0;
    let tickets = props["소원권 개수"]?.number || 0;
    let currentExp = props[expPropName]?.number || 0; 
    
    let previousWealth = currentTheme === '마인크래프트' ? diamond : slime;
    let currentWealth = previousWealth + allowedCurrency;
    let newExp = currentExp + earned; // 경험치는 깎이지 않고 순수하게 모두 오르게 처리
    
    const prevLevelInfo = calculateLevelInfo(currentExp);
    const currLevelInfo = calculateLevelInfo(newExp);

    let earnedTickets = Math.floor(currentWealth / 150) - Math.floor(previousWealth / 150);
    let newTickets = tickets + earnedTickets;

    // 📦 5. 노션 업데이트 보따리 (없는 칼럼은 빼고 전송!)
    let updateProps = { 
        "소원권 개수": { number: newTickets },
        [expPropName]: { number: newExp },
        [dailyPropName]: { number: todayEarned + allowedCurrency }
    };
    
    if (levelPropName) {
        updateProps[levelPropName] = { number: currLevelInfo.level };
    }
    
    if (currentTheme === '마인크래프트') updateProps["다이아몬드 개수"] = { number: currentWealth };
    else updateProps["슬라임 파츠 개수"] = { number: currentWealth };

    console.log(`[노션 보상 업데이트 시도] DB_ID: ${INVENTORY_DB_ID}, PAGE_ID: ${page.id}`);
    console.log("업데이트할 데이터:", JSON.stringify(updateProps, null, 2));

    // 노션으로 쏘기!
    const patchRes = await fetch(`${PROXY_URL}/v1/pages/${page.id}`, { 
      method: "PATCH", headers: { "Content-Type": "application/json" }, 
      body: JSON.stringify({ properties: updateProps }) 
    });
    
    if (!patchRes.ok) {
        const errText = await patchRes.text();
        console.error("노션 PATCH 에러 응답:", errText);
        throw new Error(`노션 업데이트 실패 (상태: ${patchRes.status}): ${errText}`);
    }
    
    if (!isSilent) {
        let rewardName = currentTheme === '마인크래프트' ? '💎 다이아몬드' : '💧 슬라임 파츠';
        
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
                <button onclick="location.href=window.location.pathname.includes('/kids-school/') ? '/kids-school/lobby.html' : '/lobby.html'" style="padding: 10px 20px; font-size: 1.1rem; border: none; border-radius: 8px; background-color: #4CAF50; color: white; cursor: pointer; font-weight: bold;">대형 로비로 돌아가기</button>
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
        // 3️⃣ 기본 알림
        else {
            let alertMsg = `🎉 보상 획득 완료!\n+${allowedCurrency}개 적립! (오늘 ${todayEarned + allowedCurrency}/${DAILY_LIMIT})`;
            if (levelPropName) {
                alertMsg += `\n${subjectName} 레벨: Lv.${currLevelInfo.level}`;
            } else {
                alertMsg += `\n용어 경험치가 상승했습니다!`;
            }
            alert(alertMsg);
        }
    }

    // 소원권 공통 알림(모달 오버레이)
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
                    - 슬라임 파츠 개수
                </div><br>
                자세한 에러 메시지는 개발자 도구(F12) 콘솔창에 빨간 글씨로 나옵니다.<br><br>
                <button onclick="location.href=window.location.pathname.includes('/kids-school/') ? '/kids-school/lobby.html' : '/lobby.html'">로비로 나가기</button>
                </div>
            `);
        } else {
            alert("❌ 보상 저장 실패! 노션 DB에 칼럼이 부족합니다. (F12 콘솔창 확인)\n에러 상세: " + err.message);
        }
    }
    return false;
  }
}
