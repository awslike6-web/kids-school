// ==========================================
// 💎 전역 만능 보상 지급 및 노션 학습 연동 핵심 통합 헬퍼 (notion-helper.js)
// ==========================================

var PROXY_URL = "https://minmin-notion.awslike6.workers.dev";
var STUDY_LOG_DB_ID = "37aa27115b68001b2ffe5e6c8f82ab2"; 
var INVENTORY_DB_ID = "374a27115b680042bb61e6a102242e12"; // 기본 백업 인벤토리 DB ID

/**
 * 아버님의 새로운 노션 DB 구조에 맞춰 학습 일지를 생성하는 함수
 */
async function sendStudyLogToNotion({ childName, subject, startTime, endTime, durationMinutes, errorReport, wordFairyCount = 0 }) {
    console.log(`🚀 [학습일지 배달 시작] 학생: ${childName} | 과목: ${subject}`);

    // 💡 [핵심 방어막] 현재 로그인한 사람이 아빠나 엄마인지 실시간 체크!
    const savedName = localStorage.getItem('currentUserName');
    if (savedName === '아빠' || savedName === '엄마') {
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
  
  if (userName === '아빠' || userName === '엄마' || userName === '어른') {
      console.log(`🛠️ [보상 프리패스] ${earned}개 획득 처리 완료 (노션 전송 X)`);
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

    // 💡 3. 일일 상한선 체크 브레이크
    if (todayEarned + earned > DAILY_LIMIT) {
        if (!isSilent) {
            alert(`⏳ 오늘 [${subjectName}] 과목에서 얻을 수 있는 보상을 모두 모았어요!\n(일일 상한선 ${DAILY_LIMIT}개 도달)\n내일 다시 즐겁게 탐험해 봐요!`);
        }
        console.log(`⚠️ 일일 보상 상한선 도달 (${todayEarned}/${DAILY_LIMIT})`);
        return false; 
    }

    // 💡 4. 자산 및 경험치 계산
    let diamond = props["다이아몬드 개수"]?.number || 0; 
    let slime = props["슬라임 파츠 개수"]?.number || 0;
    let tickets = props["소원권 개수"]?.number || 0;
    let currentExp = props[expPropName]?.number || 0; 
    
    let previousWealth = currentTheme === '마인크래프트' ? diamond : slime;
    let currentWealth = previousWealth + earned;
    let newExp = currentExp + earned; 
    
    const prevLevelInfo = calculateLevelInfo(currentExp);
    const currLevelInfo = calculateLevelInfo(newExp);

    let earnedTickets = Math.floor(currentWealth / 150) - Math.floor(previousWealth / 150);
    let newTickets = tickets + earnedTickets;

    // 📦 5. 노션 업데이트 보따리 (없는 칼럼은 빼고 전송!)
    let updateProps = { 
        "소원권 개수": { number: newTickets },
        [expPropName]: { number: newExp },                   // 사회 경험치 OR 용어 경험치_사회
        [dailyPropName]: { number: todayEarned + earned }    // 오늘 획득_사회 업데이트!
    };
    
    // 레벨 칼럼 이름이 존재할 때만(일반 과목일 때만) 레벨 업데이트 추가
    if (levelPropName) {
        updateProps[levelPropName] = { number: currLevelInfo.level };
    }
    
    if (currentTheme === '마인크래프트') updateProps["다이아몬드 개수"] = { number: currentWealth }; 
    else updateProps["슬라임 파츠 개수"] = { number: currentWealth };

    // 노션으로 쏘기!
    await fetch(`${PROXY_URL}/v1/pages/${page.id}`, { 
      method: "PATCH", headers: { "Content-Type": "application/json" }, 
      body: JSON.stringify({ properties: updateProps }) 
    });
    
    if (!isSilent) {
        let alertMsg = `🎉 보상 획득 완료!\n+${earned}개 적립! (오늘 ${todayEarned + earned}/${DAILY_LIMIT})`;
        if (levelPropName) {
            alertMsg += `\n${subjectName} 레벨: Lv.${currLevelInfo.level}`;
        } else {
            alertMsg += `\n용어 경험치가 상승했습니다!`;
        }
        alert(alertMsg);
    }

    return true;
  } catch (err) {
    console.error("❌ 보상 저장 오류:", err);
    return false;
  }
}
