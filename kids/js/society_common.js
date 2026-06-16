// ========================================================
// 💎 사회방 공통 비즈니스 로직 및 통신 모듈 (society_common.js)
// ========================================================

// 🧚‍♀️ 아나운서 요정 코코 TTS 엔진 안전 우회막 (초기 로딩 충돌 방지용)
if (!window.stopFairyTTS) {
    window.stopFairyTTS = function() { console.log("🔊 [TTS 우회] 아직 요정 엔진 로드 전입니다."); };
    window.stopFairyTTS.isMock = true;
}
if (!window.speakFairyTTS) {
    window.speakFairyTTS = function(msg) { console.log("🔊 [TTS 우회] 아직 요정 엔진 로드 전입니다:", msg); };
    window.speakFairyTTS.isMock = true;
}

/**
 * 🔊 요정 음성(TTS) ON/OFF 제어 로직
 */
function toggleFairyTtsSetting() {
    const isCurrentlyEnabled = localStorage.getItem('fairy_tts_enabled') !== 'false';
    const nextState = !isCurrentlyEnabled;
    localStorage.setItem('fairy_tts_enabled', nextState ? 'true' : 'false');
    
    updateTtsToggleUi();
    
    if (!nextState) {
        stopFairyTTS();
    } else {
        setTimeout(() => {
            speakFairyTTS("요정 코코의 나긋나긋한 낭독 서비스가 다시 켜졌습니다! 같이 떠나봐요! 🧚‍♀️");
        }, 150);
    }
}

function updateTtsToggleUi() {
    const btn = document.getElementById('ttsToggleBtn');
    if (!btn) return;
    
    const isEnabled = localStorage.getItem('fairy_tts_enabled') !== 'false';
    const currentProfileLocal = localStorage.getItem('currentUser') || 'son';
    
    if (isEnabled) {
        btn.innerHTML = "🔊 요정 음성 ON";
        if (currentProfileLocal === 'son') {
            btn.style.borderColor = "#00f2fe";
            btn.style.color = "#00f2fe";
            btn.style.background = "rgba(14, 10, 31, 0.6)";
        } else {
            btn.style.borderColor = "#ff6b9d";
            btn.style.color = "#ff6b9d";
            btn.style.background = "#ffffff";
        }
    } else {
        btn.innerHTML = "🔇 요정 음성 OFF";
        btn.style.borderColor = "#8b949e";
        btn.style.color = "#8b949e";
        if (currentProfileLocal === 'son') {
            btn.style.background = "rgba(30,30,40,0.5)";
        } else {
            btn.style.background = "#fafafa";
        }
    }
}

// ========================================================
// 💎 핵심 아키텍처: 관리자 분기 및 대화/퀴즈 모킹 데이터
// ========================================================
const SOCIETY_MOCK_DATA = {
  voca: [
    { word: "중심지", hint: "ㅈㅅㅈ", desc: "사람들이 활동을 하거나 여러 가지 필요를 해결하기 위해 자주 모이는 핵심적이고 중심이 되는 장소입니다. 도청, 시청, 큰 시장 등이 발달한 곳이랍니다!" },
    { word: "공공기관", hint: "ㄱㄱㄱㄱ", desc: "개인의 이익이 아니라 우리 동네 전체의 생활 편의와 복지를 위해 설립된 공공 보증 기관입니다. 예: 경찰서, 소방서, 동주민센터 등이 속해요." },
    { word: "공해", hint: "ㄱㅎ", desc: "공장이나 자동차 등에서 나오는 매연, 먼지, 폐수 등으로 인해 우리 자연환경이 오염되거나 주민들의 건강을 훼손시키는 심각한 환경 피해를 말합니다." }
  ],
  chart: [
    { 
      title: "지역별 인구 변화 도표",
      img: "https://raw.githubusercontent.com/awslike6/images/main/chart1.png", // 깃허브 이미지 매핑 시뮬레이터
      desc: "이 막대 그래프형 인구 도표를 보면 2010년에 비해 현재 우리 시의 어린이 비율은 줄고, 어르신 인구 비율이 가파르게 증가했음을 볼 수 있어요.",
      quiz: "도표에 따르면, 2010년과 비교할 때 가장 전형적으로 늘어난 주 연령층은 무엇일까요?",
      choices: ["어린이 연령층", "청장년 경제인구", "65세 이상 노인 어르신", "신생아 출생 비율"],
      correctIdx: 2
    },
    { 
      title: "중심지 교통량 도표",
      img: "https://raw.githubusercontent.com/awslike6/images/main/chart2.png",
      desc: "이 도표는 중심지별 하루 유입 수단 비중을 수치화한 것입니다. 대중교통(지하철, 버스)을 타고 유입되는 비중이 도보 유입의 4배가 넘습니다.",
      quiz: "위 자료를 바탕으로 분석한 생각 중 맞지 않는 의견은 무엇일까요?",
      choices: ["이 지역은 교통이 편리하게 잘 구축되어 있다.", "대중교통을 타는 손님 비중이 높은 편이다.", "지하철과 버스역 근처가 특히 발달할 것이다.", "모든 사람이 차를 끌고 다니므로 교통 정체가 없을 것이다."],
      correctIdx: 3
    }
  ],
  map: [
    { name: "백두산 천지", img: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=700&auto=format&fit=crop", desc: "한반도에서 가장 높고 장엄한 산인 백두산 정상에 위치한 화산호 천지입니다. 하늘의 연못이라 불릴 만큼 푸르고 웅장하며 하늘 빛깔을 가득 담고 있답니다." },
    { name: "독도", img: "https://images.unsplash.com/photo-1610992015762-466afb70fd45?w=700&auto=format&fit=crop", desc: "대한민국 동쪽 가장 끝자락에서 홀로 우리 동해 영토를 지키고 있는 화산 섬입니다. 맑은 날 울릉도에서 맨눈으로 볼 수 있는 아름다운 우리 국토의 심장입니다." },
    { name: "제주도 성산일출봉", img: "https://images.unsplash.com/photo-1542224566-6e85f2e6772f?w=700&auto=format&fit=crop", desc: "제주도 동쪽에 우뚝 솟아 있는 거대한 성 모양의 화산 봉우리입니다. 바닷속에서 화산이 분출하며 만들어진 세계 자연 유산으로, 해돋이 전경이 매우 찬란합니다." }
  ],
  history: [
    { name: "경주 첨성대", img: "https://images.unsplash.com/photo-1598970434795-0c54fe7c0648?w=500&auto=format&fit=crop", desc: "신라 선덕여왕 때 축조된 동양에서 가장 오래된 유서 깊은 천문 관측소입니다. 별자리의 움직임을 관찰해 농사기와 기후를 미리 파악했던 조상들의 지혜가 깃든 유적입니다." },
    { name: "무령왕릉 석수", img: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop", desc: "백제 무령왕릉 수호신 역할을 하기 위해 무덤 앞을 듬직하게 지키고 선 돌짐승 조각상입니다. 국보이며, 무덤 속을 악귀로부터 지키려는 마음이 담겨있답니다." },
    { name: "빗살무늬 토기", img: "https://images.unsplash.com/photo-1563089145-599997674d42?w=500&auto=format&fit=crop", desc: "신석기 시대 조상들이 곡식을 담아 보관했던 지혜로운 그릇입니다. 모래땅이나 흙속에 깊게 꽂을 수 있게 뾰족한 팽이 형태로 밑바닥을 과학적으로 디자인했답니다." }
  ]
};

// 🔒 로컬 속성 상태
let currentProfile = localStorage.getItem('currentUser') || 'son';
let currentUserName = localStorage.getItem('currentUserName') || '민수';
let currentTheme = localStorage.getItem('currentTheme') || '마인크래프트';
const savedName = localStorage.getItem('currentUserName');
const isAdmin = (savedName === '아빠' || savedName === '엄마');

let activeSectionData = []; // 현재 로드된 해당 국어 DB/모킹 데이터 세트
let activeQuizIdx = 0; 
let historyCollected = JSON.parse(localStorage.getItem('society_history_collectibles') || '[]');

function initializeSocietyRoom() {
    // 💡 안전 가드: config.js가 늦게 로드되어 APP_CONFIG가 없더라도 터지지 않게 백업 이름 지정
    const firstName = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.CHILDREN) ? APP_CONFIG.CHILDREN.first.name : "민수";
    const secondName = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.CHILDREN) ? APP_CONFIG.CHILDREN.second.name : "민서";

    // 💡 테마 동적 세팅
    if (currentProfile === 'son') {
        document.body.className = "theme--arcade";
        document.getElementById('societyTitle').textContent = `${firstName}의 사회 탐험 대기실`;
        document.getElementById('adminBadgeTag').textContent = `🎮 [${firstName}] 네온 관제`;
    } else {
        document.body.className = "theme--slime";
        document.getElementById('societyTitle').textContent = `${secondName}의 사회 탐험 대기실`;
        document.getElementById('adminBadgeTag').className = "admin-status-badge korean--fairy";
        document.getElementById('adminBadgeTag').textContent = `🎠 [${secondName}] 동화 모드`;
    }
    
    // ... (그 아래 관리자 진입 및 원래 코드는 그대로 두시면 됩니다!)
    // 관리자 진입 시 UI 변경
    if (isAdmin) {
        document.getElementById('societyTitle').innerHTML = `<span style="color:var(--orange);">🛠️ 사회 관리자 시뮬레이터</span>`;
        document.getElementById('societyGoalText').textContent = "🔧 아버님/어머님 테스트 구역: 실질적인 노션 전송을 완전 차단하고, 고품격 가상 검증 데이터를 지원 중입니다.";
        document.getElementById('adminBadgeTag').textContent = `🛠️ [${savedName} 검수용] 프리패스 가동`;
        document.getElementById('adminBadgeTag').style.color = "var(--yellow)";
        document.getElementById('adminBadgeTag').style.borderColor = "var(--orange)";
    } else {
        // 학습 세션 개시
        if (typeof startLearning === 'function') {
            startLearning("초등 사회 탐색 교실");
        }
    }

    // 요정 대화 다듬기
    let customGreeting = (typeof FAIRY_CONFIG !== 'undefined' ? FAIRY_CONFIG.greetings[currentProfile] : null) || "안녕! 보상을 얻으러 사회 탐험을 출발해볼까?";
    if (isAdmin && typeof FAIRY_CONFIG !== 'undefined') {
        customGreeting = FAIRY_CONFIG.greetings.admin;
    }
    document.getElementById('fairySpeakerText').textContent = customGreeting;

    // 요정 요음 초기 낭독 (요정 진짜 엔진 결합 완료 시 낭독 트리거)
    setTimeout(() => {
        if (typeof speakFairyTTS === 'function' && !speakFairyTTS.isMock && !window.isFairyGreetingSpoken) {
            speakFairyTTS(customGreeting);
            window.isFairyGreetingSpoken = true;
        } else {
            console.log("🔊 [TTS 대기 또는 완료] 요정 엔진 연합 전이거나 이미 환영 인사를 하였습니다.");
        }
    }, 1200);

    // 🔊 요정 음성 버튼 UI 초기 적용 
    updateTtsToggleUi();
}

// ========================================================
// 🚪 오버레이 미션 팝업 연동 총 제어
// ========================================================
function openMissionView(type) {
    const overlay = document.getElementById('missionOverlay');
    const headerTitle = document.getElementById('overlayHeaderTitle');
    const headerIcon = document.getElementById('overlayHeaderIcon');
    const innerBody = document.getElementById('overlayInnerBody');
    
    overlay.style.display = "flex";
    activeQuizIdx = 0;
    stopFairyTTS();

    let targetTitle = "";
    let targetIcon = "";

    // 🔒 데이터 가져오기 (Notion 혹은 Mock)
    if (isAdmin) {
        activeSectionData = SOCIETY_MOCK_DATA[type];
        renderSectionUI(type, innerBody);
    } else {
        // 1. 화면 떨림(Layout Shift) 방지를 위해 우선 로딩 스피너 전용 프레임으로 대기실 구획을 비웁니다.
        showLoadingSpinner(innerBody);
        
        // 2. 비동기 백그라운드로 노션 API 데이터를 로딩하며, 완전 조립 완료 시점에만 렌더링을 1회 호출해 꿀렁거림을 제거합니다.
        fetchNotionSocietyData(type, innerBody);
    }

    switch(type) {
        case 'voca':
            targetTitle = "사회 용어방 (한자 초성 퀴즈)";
            targetIcon = "📖";
            speakFairyTTS("사회 용어방에 온 걸 환영해! 초성을 보고, 낱말의 이름과 의미를 마법의 낭독과 함께 맞춰보자!");
            break;
        case 'chart':
            targetTitle = "차트 & 도표 자료 분석실";
            targetIcon = "📊";
            speakFairyTTS("도표를 정확하게 분석해보고, 사회 지형지식 퀴즈를 당당하게 클리어해보자!");
            break;
        case 'map':
            targetTitle = "랜선 국토 지도 탐방";
            targetIcon = "🗺️";
            speakFairyTTS("우리 국토의 지리 지형 사진이야! 사진을 더블클릭하면 코코가 상세히 읽어줄게. 감상록을 꼭 적어줘!");
            break;
        case 'history':
            targetTitle = "역사 문화재 돋보기";
            targetIcon = "⏳";
            speakFairyTTS("옛날 역사적 보물들이야. 아름다운 카드를 짝 맞춰서 수집해보자!");
            break;
    }

    headerTitle.textContent = targetTitle;
    headerIcon.textContent = targetIcon;
}

/**
 * ⏳ 로딩 스피너 전송 헬퍼 함수
 */
function showLoadingSpinner(container) {
    container.innerHTML = `
      <div class="spinner-wrapper">
        <div class="spinner-circle"></div>
        <p style="font-family:'Gaegu', cursive; font-size:1.3rem; font-weight:bold; color:inherit; text-align:center; opacity: 0.95;">
            Fairy_🧚‍♀️ 코코 요정이 노션 등대에서 자료를 가방에 챙겨오고 있어요...
        </p>
      </div>
    `;
}

function closeMissionView() {
    document.getElementById('missionOverlay').style.display = "none";
    stopFairyTTS();
}

// ========================================================
// 📊 노션 사회 데이터를 연동하는 비동기 통계 모듈
// ========================================================
async function fetchNotionSocietyData(type, innerBody) {
    const propertyMap = {
        voca: "용어방",
        chart: "자료실",
        map: "지도탐방",
        history: "역사"
    };

    const zoneTag = propertyMap[type];
    const proxyUrl = "https://minmin-notion.awslike6.workers.dev";
    
    // 🔒 용어방 DB ID는 '375a27115b688038b686d3994ee12919'으로 엄격하게 고정 배선합니다.
    const databaseId = "375a27115b688038b686d3994ee12919";

    try {
        // 노션 API 쿼리 바인딩
        const res = await fetch(`${proxyUrl}/v1/databases/${databaseId}/query`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                filter: {
                    and: [
                        { property: "과목", multi_select: { contains: "사회" } },
                        { property: "영역 분류", select: { equals: zoneTag } }
                    ]
                }
            })
        });

        if (!res.ok) throw new Error("Notion API 통신 실패");
        const json = await res.json();

        if (json && json.results && json.results.length > 0) {
            console.log(`🎉 [노션 실시간 결합 성공] 사회방 [${zoneTag}] 데이터 획득: ${json.results.length}건`);
            
            // 데이터를 우리 용도에 맞게 다이내믹 파싱
            const parsed = json.results.map(page => {
                const props = page.properties;
                const titleStr = props["단어"]?.title?.[0]?.plain_text || props["이름"]?.title?.[0]?.plain_text || "미상";
                const descStr = props["상세설명"]?.rich_text?.[0]?.plain_text || "해당 유적/지형 설명이 노션에 기재 대기 중입니다.";
                const imgUrl = props["이미지파일"]?.url || props["이미지파일"]?.rich_text?.[0]?.plain_text || "https://images.unsplash.com/photo-1598970434795-0c54fe7c0648?w=500&auto=format&fit=crop";
                const hintStr = props["초성힌트"]?.rich_text?.[0]?.plain_text || getChosung(titleStr);

                if (type === 'voca') {
                    return { word: titleStr, hint: hintStr, desc: descStr };
                } else if (type === 'chart') {
                    // 도표형 데이터 (퀴즈 초이스 파싱)
                    return {
                        title: titleStr, img: imgUrl, desc: descStr,
                        quiz: props["퀴즈제시"]?.rich_text?.[0]?.plain_text || `${titleStr}의 퀴즈: 본 자료의 성격은 무엇일까요?`,
                        choices: ["1등급 유망 자료", "전형적인 통계 자료", "가짜 관찰 보고서", "모킹 가설"],
                        correctIdx: 1
                    };
                } else if (type === 'map') {
                    return { name: titleStr, img: imgUrl, desc: descStr };
                } else {
                    return { name: titleStr, img: imgUrl, desc: descStr };
                }
            });

            activeSectionData = parsed;
        } else {
            console.warn("⚠️ 노션 데이터 결과가 비어있습니다. 기본 가상 데이터로 우회 구동합니다.");
            activeSectionData = SOCIETY_MOCK_DATA[type];
        }
    } catch(e) {
        console.warn("노션 실시간 통신 지연 또는 에러. 준비된 오프라인 견고 가상 데이터(Mock)로 무결성 구동합니다.", e);
        activeSectionData = SOCIETY_MOCK_DATA[type];
    } finally {
        renderSectionUI(type, innerBody); // 실시간 갱신 적용 및 렌더링
    }
}

// 한글 초성을 자동으로 자르는 초강력 헬퍼함수
function getChosung(str) {
    const cho = ["ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ","ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];
    let result = "";
    for(let i=0; i<str.length; i++) {
        const code = str.charCodeAt(i) - 44032;
        if(code > -1 && code < 11172) {
            result += cho[Math.floor(code / 588)];
        } else {
            result += str.charAt(i);
        }
    }
    return result;
}

// ========================================================
// 🖌️ 각 세부 파트별 학습 UI 렌더링 팩토리
// ========================================================
function renderSectionUI(type, container) {
    container.innerHTML = "";
    
    if (!activeSectionData || activeSectionData.length === 0) {
        container.innerHTML = `<p style="text-align:center; padding: 20px;">가용할 수 있는 학습 데이터가 비어 있습니다.</p>`;
        return;
    }

    const currentItem = activeSectionData[activeQuizIdx];

    // 🎬 .screen loaded 옷을 입힌 랩퍼를 생성하여 화면 떨림(Layout Shift) 방지 및 부드러운 페이드인 실현
    const screenWrapper = document.createElement('div');
    screenWrapper.className = "screen loaded";

    if (type === 'voca') {
        screenWrapper.className += " quiz-card";
        screenWrapper.innerHTML = `
            <div style="font-size: 0.95rem; opacity:0.7;">단어 ${activeQuizIdx + 1} / ${activeSectionData.length}</div>
            <div class="quiz-hint-box">초성 힌트: ${currentItem.hint}</div>
            <div class="quiz-descr">${currentItem.desc}</div>
            <div class="interactive-input-group">
                <input type="text" class="text-input-field" id="vocaAnswerInput" placeholder="정답 한글 낱말을 입력하세요!" onkeypress="if(event.key==='Enter') verifyVocaAnswer()">
                <button class="quiz-button" onclick="verifyVocaAnswer()">정답 확인</button>
            </div>
            <div style="margin-top: 10px; display: flex; gap: 8px; justify-content: center;">
                <button class="quiz-button" style="background:#8b949e;" onclick="speakFairyTTS('${currentItem.desc}')">🔊 설명 한번 더 읽기</button>
                <button class="quiz-button" style="background:var(--pink);" onclick="skipToNextQuiz('${type}')">건너뛰기 ⏩</button>
            </div>
        `;
        container.appendChild(screenWrapper);
        
        // 해당 단어 설명 자동 낭독 탑재 (아나운서 감성)
        speakFairyTTS(currentItem.desc);

    } else if (type === 'chart') {
        screenWrapper.className += " quiz-card";
        screenWrapper.innerHTML = `
            <div style="font-size: 0.95rem; opacity:0.7;">자료분석 ${activeQuizIdx + 1} / ${activeSectionData.length}</div>
            <h3>${currentItem.title}</h3>
            <div class="chart-image-frame">
                <img src="${currentItem.img}" class="chart-img" alt="사회 도표" onerror="this.src='https://raw.githubusercontent.com/awslike6/images/main/chart1.png'">
            </div>
            <div class="quiz-descr">${currentItem.desc}</div>
            <p style="font-weight: bold; font-size:1.1rem; text-align: left; margin-top:10px;">❓ ${currentItem.quiz}</p>
            <div class="quiz-choices-container">
                ${currentItem.choices.map((choice, i) => `
                     <button class="quiz-choice-btn" onclick="verifyChartChoice(${i}, ${currentItem.correctIdx})">${i+1}. ${choice}</button>
                `).join('')}
            </div>
            <div style="margin-top: 10px; display:flex; justify-content:center;">
                <button class="quiz-button" style="background:var(--pink);" onclick="skipToNextQuiz('${type}')">건너뛰기 ⏩</button>
            </div>
        `;
        container.appendChild(screenWrapper);
        speakFairyTTS(currentItem.desc + ". 퀴즈!" + currentItem.quiz);

    } else if (type === 'map') {
        screenWrapper.className += " map-photo-card";
        screenWrapper.innerHTML = `
            <div style="font-size: 0.95rem; opacity:0.7;">국토 명소 ${activeQuizIdx + 1} / ${activeSectionData.length}</div>
            <h3>🏕️ ${currentItem.name}</h3>
            <div class="map-img-frame" ondblclick="speakFairyTTS('${currentItem.desc}')">
                <img src="${currentItem.img}" class="map-photo-img" alt="${currentItem.name}" onerror="this.src='https://images.unsplash.com/photo-1542224566-6e85f2e6772f?w=700&auto=format&fit=crop'">
                <div class="double-click-badge">💡 더블클릭: 코코 해설 청취</div>
            </div>
            <div class="quiz-descr">${currentItem.desc}</div>
            
            <div class="interactive-input-group" style="flex-direction:column; gap:5px;">
                <label style="text-align:left; font-size: 0.9rem; font-weight:bold;">✍️ 요정 코코의 해설을 듣고 한 줄 탐방기를 남겨주세요!</label>
                <div style="display:flex; gap:10px; width:100%;">
                    <input type="text" class="text-input-field" id="mapJourneyInput" placeholder="이 아름다운 명소에 대해 느낀 생각을 자유롭게 남겨봐!">
                    <button class="quiz-button" style="background:var(--mint);" onclick="submitMapJourney()">탐방기 완성</button>
                </div>
            </div>
            <div style="display:flex; justify-content:center; gap:8px;">
                <button class="quiz-button" style="background:#8b949e;" onclick="speakFairyTTS('${currentItem.desc}')">🔊 해설 전체 듣기</button>
                <button class="quiz-button" style="background:var(--pink);" onclick="skipToNextQuiz('${type}')">다음 장소 탐방 ⏩</button>
            </div>
        `;
        container.appendChild(screenWrapper);
        speakFairyTTS(currentItem.name + " 탐방을 환영해요!. 더블클릭하면 상세한 이야기를 들려줄게요!");

    } else if (type === 'history') {
        // 유물 카드 맞추기 / 역사박물관 모으기 복합 수집 UI
        const isCollected = historyCollected.includes(currentItem.name);
        screenWrapper.className += " card-slide-box";
        screenWrapper.innerHTML = `
            <div style="font-size: 0.85rem; opacity:0.7;">역사유물 ${activeQuizIdx + 1} / ${activeSectionData.length}</div>
            <div class="dual-card-container">
                <div class="artifact-card-left">
                    <div class="artifact-photo-frame">
                        <img src="${currentItem.img}" class="artifact-img" alt="역사 유물" onerror="this.src='https://images.unsplash.com/photo-1598970434795-0c54fe7c0648?w=500&auto=format&fit=crop'">
                    </div>
                    <div class="artifact-name">${currentItem.name}</div>
                    <span style="font-size:0.8rem; background:var(--gold); color:#333; padding:2px 8px; border-radius:99px; font-weight:bold;">
                        ${isCollected ? "🏆 소장 완료" : "🔒 미소장"}
                    </span>
                </div>
                
                <div class="artifact-card-right">
                    <p class="history-summary-text">"${currentItem.desc}"</p>
                </div>
            </div>

            <div style="display:flex; gap:10px;">
                <button class="quiz-button" style="background:var(--gold); color:#111;" onclick="collectArtifact('${currentItem.name}')">💎 박물관 가랜드에 소장하기</button>
                <button class="quiz-button" style="background:var(--pink);" onclick="skipToNextQuiz('${type}')">다음 유물 ⏩</button>
            </div>

            <div class="museum-showcase" style="width:100%;">
                <div class="museum-title">🏛️ ${currentUserName}의 국보 역사박물관</div>
                <div class="museum-grid" id="museumGridDock"></div>
            </div>
        `;
        container.appendChild(screenWrapper);
        renderMuseumGridDock();
        speakFairyTTS(currentItem.name + "입니다. " + currentItem.desc);
    }
}

// ========================================================
// 🏆 역사 유물 박물관 컬랙션 렌더링 도킹
// ========================================================
function renderMuseumGridDock() {
    const dock = document.getElementById('museumGridDock');
    if(!dock) return;
    dock.innerHTML = "";

    const allArtNames = activeSectionData.map(item => item.name);
    allArtNames.forEach(name => {
        const activeItem = activeSectionData.find(x => x.name === name);
        const collected = historyCollected.includes(name);

        const el = document.createElement('span');
        el.className = `collected-badge ${collected ? '' : 'locked'}`;
        el.style.background = collected ? 'linear-gradient(90deg, #ff9a9e, #fecfef)' : 'transparent';
        el.style.color = collected ? '#4a3352' : '#888';
        el.style.border = collected ? '2px solid' : '1.5px solid';
        el.style.borderColor = collected ? 'var(--gold)' : '#555';
        el.innerHTML = collected ? `🏆 ${name}` : `🔒 ${name}`;
        dock.appendChild(el);
    });
}

// ========================================================
// ✏️ 문제 검증 및 포인트 보상 지급 모듈
// ========================================================
async function verifyVocaAnswer() {
    const userInput = document.getElementById('vocaAnswerInput').value.trim();
    const currentItem = activeSectionData[activeQuizIdx];

    if (!userInput) {
        alert("낱말 정답을 입력해주세요!");
        return;
    }

    if (userInput === currentItem.word || userInput.replace(/\s/g, "") === currentItem.word) {
        speakFairyTTS(`정답입니다! 참 지혜롭군요! ${currentItem.word}은 아주 명확한 사회 핵심 용어랍니다. 잘했습니다!`);
        alert(`🎉 정답 발견! [${currentItem.word}] 맞습니다!\n경험치가 상승하고 보상이 차오릅니다!`);
        
        // 보상 지급 브릿지 호출 (용어방 미션이므로 'voca' 플래그 전달)
        await triggerAwardDispense(15, 'voca');
        skipToNextQuiz('voca');
    } else {
        speakFairyTTS(`아쉬워요, 정답을 다시 한번 곱씹어볼까요? 초성은 ${currentItem.hint}이에요.`);
        alert("❌ 정답이 아직 완전하지 않아요! 초성 힌트를 보고 다시 정복해보세요!");
    }
}

async function verifyChartChoice(selectedIdx, correctIdx) {
    if (selectedIdx === correctIdx) {
        speakFairyTTS("대단해요! 도표 통계 자료를 매서운 학술적 안목으로 정밀하게 해독해냈군요! 훌륭한 관점입니다!");
        alert("🎉 명쾌한 지해력! 정답입니다!\n중심지 사회 도표 해독상으로 보상을 지급합니다!");
        
        // 일반 미션이므로 'chart' 플래그 전달
        await triggerAwardDispense(20, 'chart');
        skipToNextQuiz('chart');
    } else {
        speakFairyTTS("조금 아쉽네요. 중심지나 통계 수치들을 한 번만 면밀히 자로 재보아요.");
        alert("❌ 분석에 조금의 오차가 있어요! 다른 보기를 선택해주세요!");
    }
}

async function submitMapJourney() {
    const text = document.getElementById('mapJourneyInput').value.trim();
    if (text.length < 5) {
        alert("한 줄 탐방기의 깊이를 보강해주세요! (최소 5글자 이상 작성)");
        return;
    }

    speakFairyTTS("참 따뜻하고 사랑스러운 한 줄 탐방기네요. 조상과 우리 자연의 호흡이 완성되는 순간입니다!");
    alert("📝 멋진 랜선 지리 탐방록 기록 완료!\n탐방 학술 일지가 정상 보존되며 보석이 쏟아집니다!");

    await triggerAwardDispense(18, 'map');
    skipToNextQuiz('map');
}

async function collectArtifact(artName) {
    if (historyCollected.includes(artName)) {
        alert("이미 박물관 컬렉션에 보존된 소중한 유물입니다!");
        return;
    }

    historyCollected.push(artName);
    localStorage.setItem('society_history_collectibles', JSON.stringify(historyCollected));
    
    speakFairyTTS(`축하해요! ${artName} 유물이 우리 박물관 돋보기 전시대에 완벽하게 진열 소장되었습니다!`);
    alert(`🏆 유물 획득! [${artName}]을 소장하여 보상을 겟했습니다!`);

    await triggerAwardDispense(25, 'history');
    renderMuseumGridDock();
    
    setTimeout(() => {
        skipToNextQuiz('history');
    }, 1200);
}

// 다음 퀴즈 넘어가기
function skipToNextQuiz(type) {
    activeQuizIdx++;
    const innerBody = document.getElementById('overlayInnerBody');
    if (activeQuizIdx >= activeSectionData.length) {
        speakFairyTTS("모든 미션 코스가 우수하게 완결되었습니다! 박수 드려요. 대합실로 복귀합니다.");
        alert("🏆 축하합니다! 이 구역의 모든 사회 탐구 단계를 완료하셨습니다!");
        closeMissionView();
    } else {
        renderSectionUI(type, innerBody);
    }
}

// ========================================================
// 💎 보상 지급 브릿지 (전역 만능 보상 엔진 결합형)
// ========================================================
async function triggerAwardDispense(amount, type) {
    if (isAdmin) {
        console.log("🛠️ 아버님/어머님 검수 중이므로 노션 실제 크레딧 지급을 프리패스합니다.");
        return true;
    }

    // 💡 용어방(voca) 미션인 경우 'voca'라는 단서를 전역 만능 엔진에 넘겨줌!
    // 만능 엔진이 이 단서를 받으면 '용어 경험치_사회' 칼럼에 데이터를 꽂아 넣습니다.
    let customExp = (type === 'voca') ? 'voca' : null;

    try {
        if (typeof grantRewardAndShowUI === 'function') {
            // 전역 파일(notion-helper.js)에 장착된 신형 만능 보상 엔진을 호출합니다.
            await grantRewardAndShowUI(amount, false, customExp); 
        }
    } catch(err) {
        console.warn("보상 지급 중 로컬 백엔드 연동 모듈 우회:", err);
    }
}

// 퇴장 시 일지 작성 자동 안전 배선
window.addEventListener("beforeunload", () => {
    if (!isAdmin && typeof sendStudyLogToNotion === 'function') {
        const userName = currentProfile === 'son' ? '민수' : '민서';
        sendStudyLogToNotion({
            childName: userName,
            subject: "사회",
            startTime: new Date().toISOString(),
            endTime: new Date().toISOString(),
            durationMinutes: 5,
            errorReport: "사회 섭렵 돋보기 완료"
        });
    }
});
