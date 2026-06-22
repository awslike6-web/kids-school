// ==========================================
// 💎 전역 만능 보상 지급 및 노션 학습 연동 핵심 통합 헬퍼 (notion-helper.js)
// ==========================================

var PROXY_URL = typeof APP_CONFIG !== 'undefined' && APP_CONFIG.WORKER_PROXY_URL ? APP_CONFIG.WORKER_PROXY_URL : "https://minmin-notion.awslike6.workers.dev";
var STUDY_LOG_DB_ID = typeof APP_CONFIG !== 'undefined' && APP_CONFIG.STUDY_LOG_DB_ID ? APP_CONFIG.STUDY_LOG_DB_ID : "37aa27115b688001b2ffe5e6c8f82ab2"; // 학습일지 DB ID
var INVENTORY_DB_ID = typeof APP_CONFIG !== 'undefined' && APP_CONFIG.INVENTORY_DB_ID ? APP_CONFIG.INVENTORY_DB_ID : "374a27115b688042bb61e6a102242e12"; // 8042로 통일
var VOCA_DB_ID = typeof APP_CONFIG !== 'undefined' && APP_CONFIG.VOCA_DB_ID ? APP_CONFIG.VOCA_DB_ID : "375a27115b688038b686d3994ee12919";
var NOTION_CHAT_MEMORY_DB_ID = typeof APP_CONFIG !== 'undefined' && APP_CONFIG.NOTION_CHAT_MEMORY_DB_ID ? APP_CONFIG.NOTION_CHAT_MEMORY_DB_ID : "373a27115b6880ba82cdfeaa1c825547";

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
    const audioFile = p["음성파일"]?.files?.[0];
    const audioUrl = audioFile?.file?.url || audioFile?.external?.url
        || p["음성파일"]?.url
        || p["음성파일"]?.rich_text?.[0]?.plain_text
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
        audioUrl,
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
        isMastered: p["달성"]?.checkbox || false, // '달성' 필드 기반 마스터 여부 동기화
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

async function fetchLibraryBooksFromNotion() {
    const LIBRARY_DB_ID = "37ca27115b688023a7d2cc5b3ff51fee";
    try {
        const response = await fetch(`${PROXY_URL}/v1/databases/${LIBRARY_DB_ID}/query`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                filter: { property: "추천 여부", checkbox: { equals: true } },
                page_size: 10
            })
        });
        if (!response.ok) throw new Error(`노션 도서관 DB 통신 오류 (상태: ${response.status})`);
        const data = await response.json();
        return data.results || [];
    } catch (error) {
        console.error("[fetchLibraryBooksFromNotion] 로딩 실패:", error);
        throw error;
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
    
    const wordFairyCount = options.wordFairyCount || window.wordFairyCount || (window.learningSession ? window.learningSession.fairyClickCount : 0) || 0;

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
  // window.currentSubject가 없으면 "사회"로 폴백
  const subjectName = window.currentSubject || "사회"; 
  let expPropName = `${subjectName} 경험치`;   // 기본: "수학 경험치" 등
  let levelPropName = `${subjectName} 레벨`;   // 기본: "수학 레벨" 등
  let dailyPropName = `오늘 획득_${subjectName}`; // 기본: "오늘 획득_수학" 등

  let vocaExpPropName = null;
  // 용어방에서 호출했을 경우, 메인 경험치와 용어 경험치 쌍끌이(동시 누적) 적용
  if (customExpType === 'voca') {
      vocaExpPropName = `용어 경험치_${subjectName}`; // "용어 경험치_사회"
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
    let newExp = currentExp + earned; // 메인 경험치는 깎이지 않고 순수하게 모두 오르게 처리
    
    const prevLevelInfo = calculateLevelInfo(currentExp);
    const currLevelInfo = calculateLevelInfo(newExp);

    let earnedTickets = Math.floor(currentWealth / 150) - Math.floor(previousWealth / 150);
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

/**
 * 용어사전(VOCA DB)의 '달성(체크박스)' 필드 갱신 (마스터 연동용)
 */
async function updateVocaMasteryStatus(pageId, isMastered) {
    if (!pageId) return false;
    // 관리자 모드이거나 로컬 런타임이면 무시
    const savedName = localStorage.getItem('currentUserName');
    if (savedName === '아빠' || savedName === '엄마' || savedName === '어른') {
        console.log(`🛠️ [마스터 프리패스] 관리자 모드이므로 노션 마스터 체크 갱신을 생략합니다.`);
        return true;
    }
    
    try {
        const res = await fetch(`${PROXY_URL}/v1/pages/${pageId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                properties: {
                    "달성": { checkbox: isMastered }
                }
            })
        });
        if (!res.ok) throw new Error(await res.text());
        console.log(`✅ [마스터 연동 완료] 페이지(${pageId}) 달성 상태가 ${isMastered}로 갱신되었습니다.`);
        return true;
    } catch (e) {
        console.error("❌ VOCA 달성 상태 업데이트 실패:", e);
        return false;
    }
}

// ========================================================
// 🧠 AI 대화 기억 보관소 (Chat Memory) + 3x2 페르소나 매트릭스
// ========================================================

const IMPORTANT_MEMORY_TRIGGERS = [
    '꼭 기억해', '꼭 기억해줘', '꼭 기억해 줘', '기억해줘', '기억해 줘',
    '중요한 얘기', '중요한 이야기', '내 비밀이야', '내 비밀', '잊지마', '잊지 마'
];

function getActiveChildName() {
    let loginName = (window.currentUserName || localStorage.getItem('currentUserName') || '민수').trim();
    if (loginName === '아빠' || loginName === '엄마' || loginName === '어른') {
        const profile = window.currentProfile || localStorage.getItem('currentUser') || 'son';
        loginName = profile === 'daughter' ? '민서' : '민수';
    }
    return loginName;
}

function _isChatMemoryAdminMode() {
    const savedName = localStorage.getItem('currentUserName');
    return savedName === '아빠' || savedName === '엄마' || savedName === '어른';
}

function parseChatMemoryPage(page) {
    const p = page.properties;
    return {
        pageId: page.id,
        sessionId: p["세션ID"]?.title?.[0]?.plain_text || "",
        childName: p["아이 이름"]?.select?.name || "",
        roomType: p["소속 방"]?.select?.name || "",
        conversationSummary: p["대화 요약"]?.rich_text?.map(t => t.plain_text).join("") || "",
        isImportant: p["장기 기억 여부"]?.checkbox === true,
        createdTime: page.created_time,
        lastEditedTime: page.last_edited_time
    };
}

function buildPersonaSystemPrompt(childName, roomType) {
    const name = childName || getActiveChildName();

    if (roomType === '로비') {
        return `너는 초등학생과 일상 고민과 수다를 편하게 나누는 다정한 '형/단짝 친구' AI 코코야.
말투는 밝고 유창한 아나운서 톤이지만, 선생님처럼 가르치려 들지 말고 친구처럼 공감해줘.
아이의 감정을 먼저 받아주고, 짧게 묻기보다 대화를 자연스럽게 이어가줘.`;
    }

    if (roomType === '용어방') {
        if (name === '민수') {
            return `너는 용어사전방의 '사고 확장 도우미' AI 코코야. 대상은 민수(첫째).
정답을 바로 알려주지 말고, 질문을 던져 민수가 스스로 생각을 넓히게 유도해.
"만약 ~라면?", "왜 그럴까?", "비슷한 경험이 있어?" 같은 질문으로 사고를 확장하고, 민수의 아이디어를 구체적으로 칭찬해.`;
        }
        return `너는 용어사전방의 '동화 스토리텔링 도우미' AI 코코야. 대상은 민서(둘째).
어려운 단어와 개념을 동화·비유·짧은 이야기로 쉽게 풀어줘.
민서를 '언니/누나'라고 부르며, 설명이 재미있게 느껴지도록 리액션을 크게 해줘.`;
    }

    if (name === '민수') {
        return `너는 민수(첫째)와 함께 공부하는 '전략적 탐험가' AI 게임 파트너 코코야.
절대 선생님처럼 가르치려 들지 말고, 함께 작전을 짜는 게임 파트너로 행동해.
낯선 문제나 틀린 문제는 "강한 보스 몬스터 등장!" 또는 "함정 카드를 밟았다"로 치환해 멘탈을 보호해.
정답을 바로 주지 말고, 민수가 가진 지식 무기로 작전을 짜서 공략하도록 유도하고, 결과보다 '작전을 짜는 과정'을 게임 칭찬처럼 구체적으로 격려해.`;
    }

    return `너는 민서(둘째)와 함께 공부하는 '성장형 리더십' AI 동생 요정 코코야.
민서를 무조건 '언니' 또는 '누나'라고 부르며, 배움을 갈구하는 귀여운 동생 AI로 행동해.
"언니, 나 이거 진짜 모르겠는데 나한테 설명해 줄 수 있어?"라며 도움을 요청하고,
민서가 크리에이터(유튜버)처럼 신나서 설명할 수 있도록 리액션을 극대화해. (설명하며 스스로 깨닫는 메타인지 유도)`;
}

function formatChatMemoryForPrompt(memoryBundle) {
    if (!memoryBundle) return '';
    const { important = [], recent = [] } = memoryBundle;
    let text = '';

    if (important.length > 0) {
        text += '[장기 기억 - 최우선 반영]\n';
        important.forEach(m => { text += `- ${m.conversationSummary}\n`; });
    }
    if (recent.length > 0) {
        text += '\n[최근 대화 요약]\n';
        recent.forEach(m => { text += `- ${m.conversationSummary}\n`; });
    }
    return text.trim();
}

async function fetchChatMemoryFromNotion(options = {}) {
    const childName = options.childName || getActiveChildName();
    const dbId = options.dbId || NOTION_CHAT_MEMORY_DB_ID;

    try {
        let allResults = [];
        let hasMore = true;
        let nextCursor = undefined;

        while (hasMore) {
            const bodyData = {
                page_size: 100,
                filter: {
                    property: "아이 이름",
                    select: { equals: childName }
                }
            };
            if (nextCursor) bodyData.start_cursor = nextCursor;

            const response = await fetch(`${PROXY_URL}/v1/databases/${dbId}/query`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(bodyData)
            });

            if (!response.ok) throw new Error(`노션 AI 기억 DB 통신 오류 (상태: ${response.status})`);

            const data = await response.json();
            allResults = allResults.concat(data.results || []);
            hasMore = data.has_more;
            nextCursor = data.next_cursor;
        }

        const parsed = allResults.map(parseChatMemoryPage).filter(r => r.conversationSummary);
        const important = parsed.filter(r => r.isImportant);
        const normal = parsed
            .filter(r => !r.isImportant)
            .sort((a, b) => new Date(b.lastEditedTime || b.createdTime) - new Date(a.lastEditedTime || a.createdTime))
            .slice(0, 3);

        return { important, recent: normal, allForPrompt: [...important, ...normal] };
    } catch (error) {
        console.error("[fetchChatMemoryFromNotion] 로딩 실패:", error);
        return { important: [], recent: [], allForPrompt: [] };
    }
}

function buildFullAISystemPrompt(roomType, extraPrompt = '') {
    const childName = getActiveChildName();
    const persona = buildPersonaSystemPrompt(childName, roomType);
    const memoryContext = window.chatSessionState?.memoryContext
        || window.cachedChatMemoryContext
        || '';

    let full = persona;
    if (memoryContext) {
        full += `\n\n[과거 기억 맥락]\n${memoryContext}\n위 기억을 자연스럽게 대화에 반영하되, "내가 다 기억하고 있어!"라고 과하게 말하지 마.`;
    }
    if (extraPrompt) {
        full += `\n\n[추가 지침]\n${extraPrompt}`;
    }
    full += `\n\n[장기 기억 트리거] 아이가 "꼭 기억해줘", "중요한 얘기야", "내 비밀이야" 등을 말하면, 그 내용을 특별히 기억하겠다고 다정하게 확인해줘.`;
    return full;
}

function generateChatSessionId() {
    return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function initChatMemorySession(roomType) {
    const childName = getActiveChildName();
    window.chatSessionState = {
        sessionId: generateChatSessionId(),
        roomType,
        childName,
        userMessages: [],
        assistantMessages: [],
        memoryContext: '',
        saved: false
    };

    const memoryBundle = await fetchChatMemoryFromNotion({ childName });
    const memoryContext = formatChatMemoryForPrompt(memoryBundle);
    window.chatSessionState.memoryContext = memoryContext;
    window.cachedChatMemoryContext = memoryContext;
    return window.chatSessionState;
}

function detectImportantMemoryTrigger(text) {
    if (!text) return false;
    const normalized = String(text).replace(/\s/g, '');
    return IMPORTANT_MEMORY_TRIGGERS.some(trigger =>
        normalized.includes(trigger.replace(/\s/g, ''))
    );
}

function trackChatMemoryUserMessage(text) {
    if (!window.chatSessionState || !text) return;
    window.chatSessionState.userMessages.push(text);
}

function trackChatMemoryAssistantMessage(text) {
    if (!window.chatSessionState || !text) return;
    window.chatSessionState.assistantMessages.push(text);
}

async function summarizeChatSessionWithGemini(transcript, options = {}) {
    const childName = options.childName || getActiveChildName();
    try {
        const response = await fetch(`${PROXY_URL}/v1/chat/completions?type=ai`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "gemini-2.5-flash",
                messages: [
                    {
                        role: "system",
                        content: `너는 대화 요약 전문가야. ${childName}와 나눈 대화를 2~3줄로 핵심만 한국어로 요약해. 요약문만 출력하고 다른 설명은 하지 마.`
                    },
                    { role: "user", content: transcript }
                ]
            })
        });
        if (!response.ok) throw new Error(`요약 API 오류 (${response.status})`);
        const data = await response.json();
        return (data.choices?.[0]?.message?.content || '').trim() || '오늘 대화 요약';
    } catch (error) {
        console.error("[summarizeChatSessionWithGemini] 실패:", error);
        return transcript.slice(0, 200) || '오늘 대화 요약';
    }
}

async function saveChatMemoryToNotion({ sessionId, childName, roomType, conversationSummary, isImportant }) {
    if (_isChatMemoryAdminMode()) {
        console.log(`🛠️ [기억 프리패스] 관리자 모드 - AI 기억 저장 생략 (isImportant: ${isImportant})`);
        return true;
    }

    try {
        const payload = {
            parent: { database_id: NOTION_CHAT_MEMORY_DB_ID },
            properties: {
                "세션ID": {
                    title: [{ text: { content: sessionId || generateChatSessionId() } }]
                },
                "아이 이름": {
                    select: { name: childName }
                },
                "소속 방": {
                    select: { name: roomType }
                },
                "대화 요약": {
                    rich_text: [{ text: { content: (conversationSummary || '').slice(0, 1900) } }]
                },
                "장기 기억 여부": {
                    checkbox: isImportant === true
                }
            }
        };

        const response = await fetch(`${PROXY_URL}/v1/pages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error(`노션 AI 기억 저장 오류 (상태: ${response.status})`);
        console.log(`🧠 [AI 기억 저장 완료] ${childName} / ${roomType} / important=${isImportant}`);
        return true;
    } catch (error) {
        console.error("[saveChatMemoryToNotion] 저장 실패:", error);
        return false;
    }
}

function _buildTranscriptFromMessages(messages) {
    return messages.map(m => {
        const role = m.role === 'model' ? 'assistant' : m.role;
        const speaker = role === 'user' ? '아이' : '코코';
        const content = m.content || m.parts?.[0]?.text || '';
        return `${speaker}: ${content}`;
    }).join('\n');
}

async function saveChatMemoryFromConversation({ roomType, messages, childName, isImportant }) {
    if (!messages || messages.length === 0) return false;

    const normalized = messages.map(m => ({
        role: m.role === 'model' ? 'assistant' : m.role,
        content: m.content || ''
    }));
    const userMessages = normalized.filter(m => m.role === 'user').map(m => m.content);
    if (userMessages.length === 0) return false;

    const name = childName || getActiveChildName();
    const room = roomType || '공부방';
    const markImportant = isImportant === true || userMessages.some(detectImportantMemoryTrigger);
    const transcript = _buildTranscriptFromMessages(normalized);
    const summary = await summarizeChatSessionWithGemini(transcript, { childName: name });

    return saveChatMemoryToNotion({
        sessionId: generateChatSessionId(),
        childName: name,
        roomType: room,
        conversationSummary: summary,
        isImportant: markImportant
    });
}

async function finalizeChatMemorySession(options = {}) {
    const state = options.state || window.chatSessionState;
    if (!state || state.saved) return false;

    const userMessages = options.userMessages || state.userMessages || [];
    if (userMessages.length === 0) return false;

    const messages = [];
    const maxLen = Math.max(userMessages.length, (state.assistantMessages || []).length);
    for (let i = 0; i < maxLen; i++) {
        if (userMessages[i]) messages.push({ role: 'user', content: userMessages[i] });
        if (state.assistantMessages && state.assistantMessages[i]) {
            messages.push({ role: 'assistant', content: state.assistantMessages[i] });
        }
    }

    const saved = await saveChatMemoryFromConversation({
        roomType: options.roomType || state.roomType,
        messages,
        childName: options.childName || state.childName,
        isImportant: options.isImportant
    });

    if (saved) state.saved = true;
    return saved;
}

window.addEventListener('beforeunload', () => {
    if (window.chatSessionState && !window.chatSessionState.saved && window.chatSessionState.userMessages?.length > 0) {
        finalizeChatMemorySession();
    }
});
