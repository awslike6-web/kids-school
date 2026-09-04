// ==========================================
// 💎 민민이네 공부방 보상·학습일지·인벤토리 연동 모듈 (notion-reward.js)
// ==========================================

var PROXY_URL = typeof APP_CONFIG !== 'undefined' && APP_CONFIG.WORKER_PROXY_URL ? APP_CONFIG.WORKER_PROXY_URL : "https://minmin-notion.awslike6.workers.dev";
var STUDY_LOG_DB_ID = typeof APP_CONFIG !== 'undefined' && APP_CONFIG.STUDY_LOG_DB_ID ? APP_CONFIG.STUDY_LOG_DB_ID : "37aa27115b688001b2ffe5e6c8f82ab2";
var INVENTORY_DB_ID = typeof APP_CONFIG !== 'undefined' && APP_CONFIG.INVENTORY_DB_ID ? APP_CONFIG.INVENTORY_DB_ID : "374a27115b688042bb61e6a102242e12";

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
    let slime = typeof getDaughterRewardCount === 'function'
        ? getDaughterRewardCount(props)
        : (props["슬라임 파츠 개수"]?.number || 0);
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
                    - 하리보 젤리 개수 (또는 슬라임 파츠 개수)
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


window.__sttSession = null;

function setupDebouncedSTT(options = {}) {
    const {
        inputEl,
        onSend,
        debounceMs = 2500,
        lang = 'ko-KR',
        onStart,
        onEnd,
        onError
    } = options;

    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
        alert("현재 브라우저에서는 마이크 기능이 지원되지 않아요. (크롬 브라우저를 사용해주세요!)");
        return null;
    }

    // 💡 이미 듣고 있는 상태에서 마이크 버튼을 다시 누르면 즉시 마무리 및 전송 (토글 기능)
    if (window.__sttSession && window.__sttSession.isListening) {
        console.log('[STT] 마이크 재클릭으로 즉시 마무리 및 전송');
        if (typeof window.__sttSession.flushAndSend === 'function') {
            window.__sttSession.flushAndSend();
        }
        return null;
    }

    // 기존 세션 정리 (이전 인스턴스의 이벤트 핸들러를 먼저 제거하여 aborted 전파 차단)
    if (window.__sttSession?.recognition) {
        const oldRec = window.__sttSession.recognition;
        oldRec.onstart = null;
        oldRec.onend = null;
        oldRec.onerror = null;
        oldRec.onresult = null;
        try { oldRec.abort(); } catch (e) { /* noop */ }
        clearTimeout(window.__sttSession.debounceTimer);
    }

    // 마이크 시작 전 TTS 즉시 중지 (마이크 하울링/간섭 방지)
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }

    // 🎤 데스크톱 크롬/웨일 마이크 하드웨어 스트림 깨우기 및 연결 장치 확인
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
            window.__micStreamWoken = true;
            const track = stream.getAudioTracks()[0];
            const micLabel = track?.label || '기본 마이크';
            window.__activeMicDeviceLabel = micLabel;
            
            const isVirtual = /droidcam|virtual|stereo mix|스테레오 믹스/i.test(micLabel);
            if (isVirtual) {
                console.warn(`%c[STT 마이크 경고] ⚠️ 현재 브라우저가 가상 마이크("${micLabel}")를 바라보고 있습니다! 실제 마이크(Realtek 등)로 소리를 전달하려면 브라우저 주소창 좌측 🔒 자물쇠 > 마이크 설정(또는 chrome://settings/content/microphone)에서 실제 마이크로 변경해 주세요.`, 'color: #f59e0b; font-weight: bold;');
            } else {
                console.log(`%c[STT 마이크 진단] 🎤 활성 마이크 장치: "${micLabel}"`, 'color: #10b981; font-weight: bold;');
            }
            stream.getTracks().forEach(t => t.stop());
        }).catch(err => {
            console.warn('[STT 마이크 진단] getUserMedia 접근 실패 (권한 또는 장치 비활성화):', err);
        });

        if (navigator.mediaDevices.enumerateDevices) {
            navigator.mediaDevices.enumerateDevices().then(devices => {
                const mics = devices.filter(d => d.kind === 'audioinput').map(d => d.label || '이름 없음');
                if (mics.length > 0) {
                    console.log(`%c[STT 마이크 목록] 🎧 PC에 연결된 전체 마이크 (${mics.length}개):`, 'color: #6366f1; font-weight: bold;', mics);
                }
            }).catch(() => {});
        }
    }

    let accumulatedFinal = '';
    let debounceTimer = null;
    let hasSent = false;
    let isListening = false;

    const recognition = new Recognition();
    recognition.lang = lang;
    recognition.continuous = false; // 크롬 데스크톱에서 가장 안정적인 단일 턴 모드
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    // 💡 상세 오디오 상태 진단 이벤트
    recognition.onaudiostart = function() {
        console.log('%c[STT 진단] 🎙️ 오디오 스트림 수신 시작 (브라우저가 마이크 소리를 듣고 있습니다)', 'color: #0284c7;');
    };
    recognition.onspeechstart = function() {
        console.log('%c[STT 진단] 🗣️ 사람 목소리(발화) 감지됨!', 'color: #ec4899; font-weight: bold;');
    };
    recognition.onspeechend = function() {
        console.log('%c[STT 진단] 🤫 발화 종료 감지됨', 'color: #8b5cf6;');
    };
    recognition.onaudioend = function() {
        console.log('%c[STT 진단] ⏹️ 오디오 수신 종료', 'color: #64748b;');
    };

    function finishMicUI() {
        isListening = false;
        if (window.__sttSession) window.__sttSession.isListening = false;
        if (onEnd) onEnd();
    }

    function flushAndSend() {
        clearTimeout(debounceTimer);
        if (hasSent) return;
        const text = (inputEl.value || accumulatedFinal).trim();
        if (!text) {
            finishMicUI();
            return;
        }
        hasSent = true;
        accumulatedFinal = text;
        inputEl.value = text;
        try { recognition.stop(); } catch (e) { /* noop */ }
        finishMicUI();
        onSend(text);
    }

    recognition.onstart = function() {
        hasSent = false;
        isListening = true;
        accumulatedFinal = '';
        inputEl.value = '';
        if (window.__sttSession) window.__sttSession.isListening = true;
        if (onStart) onStart();
    };

    recognition.onresult = function(event) {
        if (hasSent) return;

        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalTranscript += transcript;
            } else {
                interimTranscript += transcript;
            }
        }

        if (finalTranscript) {
            accumulatedFinal = (accumulatedFinal ? accumulatedFinal + ' ' : '') + finalTranscript.trim();
        }

        const fullText = (accumulatedFinal + (interimTranscript ? (accumulatedFinal ? ' ' : '') + interimTranscript.trim() : '')).trim();
        if (fullText) {
            inputEl.value = fullText;
        }

        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(flushAndSend, debounceMs);
    };

    recognition.onend = function() {
        clearTimeout(debounceTimer);
        if (!hasSent && (accumulatedFinal.trim() || inputEl.value.trim())) {
            flushAndSend();
        } else if (!hasSent) {
            finishMicUI();
        }
    };

    recognition.onerror = function(event) {
        clearTimeout(debounceTimer);
        const errType = String(event.error || '');
        // aborted는 사용자의 재클릭 또는 정상 리셋 동작이므로 오류로 취급하지 않음
        if (errType === 'aborted') {
            return;
        }
        console.warn('[STT 오류]', event.error);
        if (!hasSent) finishMicUI();
        if (onError) onError(event);
    };

    window.__sttSession = {
        recognition,
        debounceTimer: null,
        isListening: false,
        flushAndSend
    };

    try {
        recognition.start();
    } catch (e) {
        console.error('[STT 시작 실패]', e);
        finishMicUI();
        if (onError) onError({ error: e.message || 'start_failed' });
    }

    return recognition;
}

// ========================================================
// 🔗 접속사 채점 가드레일 (원인-결과 vs 역접 분리)
// ========================================================

const CONJUNCTION_GRADING_GUARDRAIL = `[접속사 채점 절대 규칙]
- 앞 문장이 원인, 뒤 문장이 결과(결론) 관계이면 오직 '따라서', '그러므로', '그래서', '그리하여' 계열만 정답이다.
- 앞 문장이 결과, 뒤 문장이 이유/원인 설명이면 오직 '왜냐하면 (~때문이다)'만 정답이다. '그래서'나 '따라서'와 절대 혼동하거나 호환 처리하지 마라.
- '하지만', '그러나', '그런데'는 앞뒤가 반대·대조·역접일 때만 쓴다.
- 원인-결과 문맥에서 '하지만'이나 '왜냐하면'을 정답으로 제시하거나 옹호하지 마라.`;

function inferConjunctionRelation(conj) {
    if (!conj) return 'exact';
    if (conj.relationType === 'cause-effect' || conj.relationType === 'contrast') {
        return conj.relationType;
    }
    const commentary = conj.commentary || '';
    if (/원인|결과|그래서|따라서|그러므로/.test(commentary)) return 'cause-effect';
    if (/이유|까닭|때문|왜냐하면/.test(commentary)) return 'reason';
    if (/반대|역접|대조|반면|하지만|그러나/.test(commentary)) return 'contrast';
    return 'exact';
}

function gradeConjunctionAnswer(conj, userAnswer) {
    if (!conj || !conj.answer || userAnswer == null) return false;
    // 🎯 객관식 접속사 문제는 지정된 고유 정답과 정확히 일치해야 함 (왜냐하면 vs 그래서 오답 판정 철저)
    return String(userAnswer).trim().toLowerCase() === String(conj.answer).trim().toLowerCase();
}

function getConjunctionCorrectAnswer(conj) {
    return conj?.answer || '';
}

// ========================================================
// 🎁 미션 보상 자동 지급 (SUCCESS 즉시 + 중복 방지 락)
// ========================================================

window.__missionRewardLocks = window.__missionRewardLocks || {};
window.__pendingMissionReward = null;

function buildMissionRewardKey(missionType, passageId) {
    const user = typeof getActiveChildName === 'function'
        ? getActiveChildName()
        : (localStorage.getItem('currentUserName') || '민수');
    return `${user}_${missionType}_${passageId || 'default'}`;
}

function formatReadingStudyLogReport(passageId, passageTitle) {
    const id = String(passageId || '미상').trim();
    const title = String(passageTitle || '제목 없음').trim();
    const targetNotes = window.engWrongNotes || window.wrongNotes || [];
    const wrongPart = targetNotes.length > 0
        ? targetNotes.map(q => {
            if (q.wrongInput) return `${q.word || q.text} (오답: ${q.wrongInput})`;
            return q.word || q.text || q;
        }).join(' / ')
        : '오답 없음';
    return `${id} · ${title} | ${wrongPart}`;
}

function getReadingClearSubject(missionType) {
    if (missionType === 'stage5') return '영어(독해)';
    const base = window.currentSubject || '국어';
    return `${base}(독해)`;
}

async function claimMissionRewardOnce(rewardKey, options = {}) {
    const {
        amount = 5,
        missionType = '',
        subject = null,
        silent = true,
        customExpType = null,
        skipStudyLog = false,
        errorReport = null
    } = options;

    if (window.__missionRewardLocks[rewardKey] === 'done') {
        return true;
    }
    if (window.__missionRewardLocks[rewardKey] === 'processing') {
        return window.__pendingMissionRewardPromise || true;
    }

    window.__missionRewardLocks[rewardKey] = 'processing';
    const subj = subject || window.currentSubject || '국어';
    const expType = customExpType !== null
        ? customExpType
        : (subj === '영어' ? '영어' : subj === '국어' ? '국어' : null);

    const task = (async () => {
        try {
            if (typeof grantRewardAndShowUI === 'function') {
                await grantRewardAndShowUI(amount, silent, expType);
            } else if (typeof window.triggerAwardDispense === 'function') {
                await window.triggerAwardDispense(amount, missionType);
            }
            if (!skipStudyLog && typeof sendStudyLogToNotion === 'function') {
                await sendStudyLogToNotion({
                    subject: subj,
                    errorReport: errorReport !== null ? errorReport : undefined
                });
            }
            window.__missionRewardLocks[rewardKey] = 'done';
            console.log(`🎁 [보상 자동 지급 완료] ${rewardKey} / ${amount}개`);
            return true;
        } catch (err) {
            console.error('🎁 [보상 자동 지급 실패]', err);
            delete window.__missionRewardLocks[rewardKey];
            return false;
        }
    })();

    window.__pendingMissionRewardPromise = task;
    return task;
}

function dispatchReadingStageReward(missionType, passageId, stageNumber) {
    const rewardKey = `${buildMissionRewardKey(missionType, passageId)}_stage${stageNumber}`;
    return claimMissionRewardOnce(rewardKey, {
        amount: 5,
        missionType,
        subject: window.currentSubject,
        silent: true,
        skipStudyLog: true
    });
}

function dispatchReadingClearBonus(missionType, passageId, passageTitle) {
    const rewardKey = `${buildMissionRewardKey(missionType, passageId)}_clear`;
    const subject = getReadingClearSubject(missionType);
    const errorReport = formatReadingStudyLogReport(passageId, passageTitle);
    window.__pendingMissionReward = {
        rewardKey,
        amount: 15,
        missionType,
        subject,
        errorReport
    };
    return claimMissionRewardOnce(rewardKey, {
        amount: 15,
        missionType,
        subject,
        errorReport,
        silent: true,
        skipStudyLog: false
    });
}

window.__quizRewardSession = null;

function initQuizRewardSession(missionType) {
    window.__quizRewardSession = {
        missionType: missionType || window.currentMissionType || 'quiz',
        sessionId: String(Date.now()),
        solvedCount: 0
    };
}

async function rewardQuizCorrect(quizIndex) {
    if (!window.__quizRewardSession) {
        initQuizRewardSession(window.currentMissionType);
    }
    const session = window.__quizRewardSession;
    const idx = typeof quizIndex === 'number' ? quizIndex : session.solvedCount;
    const rewardKey = `${buildMissionRewardKey(session.missionType, session.sessionId)}_q${idx}`;
    const result = await claimMissionRewardOnce(rewardKey, {
        amount: 1,
        missionType: session.missionType,
        subject: window.currentSubject,
        silent: false,
        skipStudyLog: true
    });
    if (result) session.solvedCount = (session.solvedCount || 0) + 1;
    return result;
}

async function finalizeQuizRewardSession() {
    const session = window.__quizRewardSession;
    if (!session || session.solvedCount <= 0) {
        window.__quizRewardSession = null;
        return false;
    }
    if (typeof sendStudyLogToNotion === 'function') {
        await sendStudyLogToNotion({ subject: window.currentSubject || '국어' });
    }
    window.__quizRewardSession = null;
    return true;
}

const DISCUSSION_STOP_WORDS = new Set([
    'the', 'and', 'that', 'this', 'with', 'will', 'have', 'from', 'they', 'what', 'about',
    'you', 'your', 'are', 'for', 'was', 'were', 'been', 'being', 'their', 'there', 'then',
    'when', 'where', 'which', 'while', 'would', 'could', 'should', 'into', 'after', 'before',
    'both', 'also', 'just', 'very', 'much', 'more', 'some', 'such', 'only', 'over', 'under',
    '그리고', '하지만', '그래서', '있다', '없다', '한다', '된다', '이다', '에서', '으로', '에게'
]);

function extractPassageKeywords(passage) {
    if (passage?.keywords && Array.isArray(passage.keywords)) {
        return passage.keywords.map(k => String(k).trim()).filter(Boolean);
    }
    const raw = `${passage?.title || ''} ${passage?.fullText || ''}`;
    const scored = new Map();

    (raw.match(/[a-zA-Z]{4,}/g) || []).forEach(word => {
        const key = word.toLowerCase();
        if (DISCUSSION_STOP_WORDS.has(key)) return;
        scored.set(key, (scored.get(key) || 0) + 1);
    });
    (raw.match(/[가-힣]{2,}/g) || []).forEach(word => {
        if (DISCUSSION_STOP_WORDS.has(word)) return;
        scored.set(word, (scored.get(word) || 0) + 1);
    });

    return [...scored.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12)
        .map(([word]) => word);
}

function messageContainsPassageKeyword(text, keywords) {
    if (!text || !keywords?.length) return false;
    const lower = text.toLowerCase();
    return keywords.some(keyword => {
        if (/^[a-z]/i.test(keyword)) return lower.includes(keyword.toLowerCase());
        return text.includes(keyword);
    });
}

function initDiscussionRewardSession(missionType, passage) {
    window.__discussionRewardState = {
        missionType,
        passageId: passage?.id || 'default',
        startedAt: Date.now(),
        longMsgPoints: 0,
        timeMinutesGranted: 0,
        keywordBonusGranted: false,
        successJackpotGranted: false,
        keywords: extractPassageKeywords(passage)
    };
}

async function grantDiscussionTimeRewards() {
    const state = window.__discussionRewardState;
    if (!state) return;

    const elapsedMinutes = Math.floor((Date.now() - state.startedAt) / 60000);
    while (state.timeMinutesGranted < elapsedMinutes && state.timeMinutesGranted < 3) {
        state.timeMinutesGranted += 1;
        const rewardKey = `${buildMissionRewardKey(state.missionType, state.passageId)}_time${state.timeMinutesGranted}`;
        await claimMissionRewardOnce(rewardKey, {
            amount: 2,
            missionType: state.missionType,
            subject: window.currentSubject,
            silent: true,
            skipStudyLog: true
        });
    }
}

async function processDiscussionMessageRewards(text) {
    const state = window.__discussionRewardState;
    if (!state) return;

    await grantDiscussionTimeRewards();

    const compactLen = String(text || '').replace(/\s/g, '').length;
    if (compactLen >= 5 && state.longMsgPoints < 5) {
        state.longMsgPoints += 1;
        const rewardKey = `${buildMissionRewardKey(state.missionType, state.passageId)}_msg${state.longMsgPoints}`;
        await claimMissionRewardOnce(rewardKey, {
            amount: 1,
            missionType: state.missionType,
            subject: window.currentSubject,
            silent: true,
            skipStudyLog: true
        });
    }

    if (!state.keywordBonusGranted && messageContainsPassageKeyword(text, state.keywords)) {
        state.keywordBonusGranted = true;
        const rewardKey = `${buildMissionRewardKey(state.missionType, state.passageId)}_keyword`;
        await claimMissionRewardOnce(rewardKey, {
            amount: 5,
            missionType: state.missionType,
            subject: window.currentSubject,
            silent: true,
            skipStudyLog: true
        });
    }
}

function dispatchDiscussionSuccessJackpot(missionType, passageId) {
    const state = window.__discussionRewardState;
    if (state?.successJackpotGranted) return false;
    if (state) state.successJackpotGranted = true;

    const rewardKey = `${buildMissionRewardKey(missionType, passageId)}_success`;
    window.__pendingMissionReward = {
        rewardKey,
        amount: 10,
        missionType,
        subject: window.currentSubject
    };
    return claimMissionRewardOnce(rewardKey, {
        amount: 10,
        missionType,
        subject: window.currentSubject,
        silent: true,
        skipStudyLog: false
    });
}

async function finalizeDiscussionSessionRewards() {
    await grantDiscussionTimeRewards();
}

function dispatchSuccessMissionReward(missionType, passageId, amount = 5) {
    if (amount >= 10) {
        return dispatchDiscussionSuccessJackpot(missionType, passageId);
    }
    const rewardKey = buildMissionRewardKey(missionType, passageId);
    window.__pendingMissionReward = {
        rewardKey,
        amount,
        missionType,
        subject: window.currentSubject
    };
    return claimMissionRewardOnce(rewardKey, {
        amount,
        missionType,
        subject: window.currentSubject,
        silent: true,
        skipStudyLog: false
    });
}

async function flushPendingMissionReward() {
    await finalizeDiscussionSessionRewards();
    if (!window.__pendingMissionReward) return false;
    const { rewardKey, amount, missionType, subject, errorReport } = window.__pendingMissionReward;
    if (window.__missionRewardLocks[rewardKey] === 'done') return true;
    return claimMissionRewardOnce(rewardKey, {
        amount,
        missionType,
        subject,
        errorReport,
        silent: true,
        skipStudyLog: false
    });
}

async function processDiscussionAiReply(reply, options = {}) {
    const {
        missionType,
        passageId,
        bubbleId,
        chatBoxId = 'sentenceChatBox',
        subject = window.currentSubject || '국어'
    } = options;

    const replyText = String(reply || '');
    const displayHtml = replyText.replace(/\n/g, '<br>');
    setChatBubbleContent(bubbleId, displayHtml, { chatBoxId, asHtml: true });
    window.__geminiRetryWaitRef = null;

    const speechText = replyText.replace(/\[SUCCESS\]/g, '').trim();
    if (speechText && typeof speakFairyTTS === 'function') {
        speakFairyTTS(speechText);
    }

    if (!replyText.includes('[SUCCESS]')) return false;

    if (typeof dispatchDiscussionSuccessJackpot === 'function') {
        return dispatchDiscussionSuccessJackpot(missionType, passageId);
    }
    if (typeof dispatchSuccessMissionReward === 'function') {
        return dispatchSuccessMissionReward(missionType, passageId, 10);
    }
    if (typeof window.triggerAwardDispense === 'function') {
        await window.triggerAwardDispense(10, missionType);
        if (typeof sendStudyLogToNotion === 'function') {
            await sendStudyLogToNotion({ subject });
        }
    }
    return true;
}

async function finalizeSentenceDiscussionSession(options = {}) {
    const {
        messages = [],
        roomType = '공부방',
        missionType = 'sentence'
    } = options;

    if (window.__sentenceDiscussionMemorySaved) return true;

    const hasUserTurn = Array.isArray(messages) && messages.some(m => m.role === 'user' && m.content);
    if (!hasUserTurn) return false;

    if (typeof flushPendingMissionReward === 'function') {
        await flushPendingMissionReward();
    } else if (typeof finalizeDiscussionSessionRewards === 'function') {
        await finalizeDiscussionSessionRewards();
    }

    if (typeof saveChatMemoryFromConversation !== 'function') return false;

    const saved = await saveChatMemoryFromConversation({
        roomType,
        messages
    });
    if (saved) window.__sentenceDiscussionMemorySaved = true;
    return saved;
}

// ========================================================
// 🧠 AI 대화 기억 보관소 (Chat Memory) + 3x2 페르소나 매트릭스
// ========================================================


// ========================================================
function ensureQuizWrongChoiceOverlay() {
    if (document.getElementById('quizWrongChoiceOverlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'quizWrongChoiceOverlay';
    overlay.style.cssText =
        'display:none; position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:100000; justify-content:center; align-items:center; padding:20px; box-sizing:border-box;';

    overlay.innerHTML = `
        <div style="background:#fff; border-radius:24px; padding:28px 22px; max-width:380px; width:100%; text-align:center; box-shadow:0 16px 48px rgba(0,0,0,0.25); font-family:'Nanum Gothic','Jua',sans-serif;">
            <div style="font-size:2.5rem; margin-bottom:12px;">💥</div>
            <div id="quizWrongChoiceMessage" style="font-size:1.25rem; color:#333; margin-bottom:8px; line-height:1.45;">아쉽지만 틀렸어요!</div>
            <div id="quizWrongChoiceSub" style="font-size:0.95rem; color:#666; margin-bottom:22px; line-height:1.5;">다시 풀어볼까요, 아니면 다음 문제로 넘어갈까요?</div>
            <div style="display:flex; flex-direction:column; gap:10px;">
                <button id="quizWrongChoiceRetryBtn" type="button" style="padding:14px; border:none; border-radius:16px; background:linear-gradient(135deg,#4facfe,#00f2fe); color:#fff; font-family:inherit; font-size:1.1rem; cursor:pointer;">🔄 다시 풀기</button>
                <button id="quizWrongChoiceSkipBtn" type="button" style="padding:14px; border:none; border-radius:16px; background:#8b949e; color:#fff; font-family:inherit; font-size:1.1rem; cursor:pointer;">⏭️ 다음 문제로</button>
            </div>
        </div>
    `;

    overlay.querySelector('#quizWrongChoiceRetryBtn').addEventListener('click', () => {
        overlay.style.display = 'none';
        const fn = window.__quizWrongChoiceRetry;
        window.__quizWrongChoiceRetry = null;
        window.__quizWrongChoiceSkip = null;
        if (typeof fn === 'function') fn();
    });

    overlay.querySelector('#quizWrongChoiceSkipBtn').addEventListener('click', () => {
        overlay.style.display = 'none';
        const fn = window.__quizWrongChoiceSkip;
        window.__quizWrongChoiceRetry = null;
        window.__quizWrongChoiceSkip = null;
        if (typeof fn === 'function') fn();
    });

    document.body.appendChild(overlay);
}

window.promptQuizRetryOrSkip = function(options = {}) {
    ensureQuizWrongChoiceOverlay();
    const overlay = document.getElementById('quizWrongChoiceOverlay');
    const msgEl = document.getElementById('quizWrongChoiceMessage');
    const subEl = document.getElementById('quizWrongChoiceSub');

    msgEl.textContent = options.message || '아쉽지만 틀렸어요!';
    subEl.textContent =
        options.subMessage || '다시 풀어볼까요, 아니면 다음 문제로 넘어갈까요?';
    if (options.hint) {
        subEl.textContent += `\n💡 ${options.hint}`;
    }

    window.__quizWrongChoiceRetry = options.onRetry || null;
    window.__quizWrongChoiceSkip = options.onSkip || null;
    overlay.style.display = 'flex';

    if (typeof speakFairyTTS === 'function') {
        speakFairyTTS(options.message || '아쉽지만 틀렸어요!');
    }
};

window.closeQuizWrongChoice = function() {
    const overlay = document.getElementById('quizWrongChoiceOverlay');
    if (overlay) overlay.style.display = 'none';
};

// ========================================================
// 🚪 퀴즈/미션 진행 중 이탈 확인 (브라우저 뒤로 · 나가기 공통)
// ========================================================
window.LEAVE_SESSION_MSG = '나가시겠어요?\n풀던 문제가 사라질 수 있어요.';

window.__quizLeaveGuard = {
    armed: false,
    checking: false,
    isActive: null,
    onLeave: null
};

window.isQuizLeaveGuardActive = function() {
    const g = window.__quizLeaveGuard;
    if (!g || !g.armed || typeof g.isActive !== 'function') return false;
    try {
        return !!g.isActive();
    } catch (_) {
        return false;
    }
};

window.confirmLeaveActiveSession = function(message) {
    if (!window.isQuizLeaveGuardActive()) return true;
    return window.confirm(message || window.LEAVE_SESSION_MSG);
};

function __onQuizLeaveLobbyClick(e) {
    const link = e.target && e.target.closest
        ? e.target.closest('a.back-to-lobby-btn, a.exit-btn, a[href*="lobby.html"]')
        : null;
    if (!link) return;
    if (!window.isQuizLeaveGuardActive()) return;
    if (!window.confirm(window.LEAVE_SESSION_MSG)) {
        e.preventDefault();
        e.stopPropagation();
        return;
    }
    window.disarmQuizLeaveGuard();
}

window.armQuizLeaveGuard = function(options = {}) {
    const g = window.__quizLeaveGuard;
    g.isActive = typeof options.isActive === 'function' ? options.isActive : null;
    g.onLeave = typeof options.onLeave === 'function' ? options.onLeave : null;
    if (g.armed) return;
    g.armed = true;
    document.addEventListener('click', __onQuizLeaveLobbyClick, true);
    try {
        history.pushState({ kidsQuizGuard: 1 }, '');
    } catch (_) {}
};

window.disarmQuizLeaveGuard = function() {
    const g = window.__quizLeaveGuard;
    if (!g) return;
    if (g.armed) {
        document.removeEventListener('click', __onQuizLeaveLobbyClick, true);
    }
    g.armed = false;
    g.checking = false;
    g.isActive = null;
    g.onLeave = null;
};

window.addEventListener('popstate', () => {
    const g = window.__quizLeaveGuard;
    if (!g || !g.armed || g.checking) return;

    // 퀴즈 진행 중이면 확인 후 이탈, 학년/단원 선택 화면이면 확인 없이 오버레이만 닫기
    if (window.isQuizLeaveGuardActive()) {
        g.checking = true;
        const ok = window.confirm(window.LEAVE_SESSION_MSG);
        if (ok) {
            const leaveFn = g.onLeave;
            window.disarmQuizLeaveGuard();
            if (typeof leaveFn === 'function') leaveFn();
        } else {
            try {
                history.pushState({ kidsQuizGuard: 1 }, '');
            } catch (_) {}
        }
        g.checking = false;
        return;
    }

    const leaveFn = g.onLeave;
    window.disarmQuizLeaveGuard();
    if (typeof leaveFn === 'function') leaveFn();
});

window.addEventListener('beforeunload', (e) => {
    if (!window.isQuizLeaveGuardActive()) return;
    e.preventDefault();
    e.returnValue = '';
});
