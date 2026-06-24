// ==========================================================
// ⚙️ 민민이네 영어 멀티버스 코어 운영 엔진 (6단계 파이프라인 통합)
// ==========================================================

window.currentSubject = "영어"; // 전역 과목명 명시
let currentProfile = localStorage.getItem('currentUser') || 'son';
let currentUserName = localStorage.getItem('currentUserName') || '민수';
let currentTheme = localStorage.getItem('currentTheme') || 'theme--minecraft';
const isAdmin = (currentUserName === '아빠' || currentUserName === '엄마');

let activeSectionData = [];
let activeQuizIdx = 0;
let currentMissionType = "";
let allFetchedRecords = [];
let selectedEnglishGrade = "";
let selectedEnglishUnit = "";

// 독해방 상태
let readingFetchedBooks = [];
let activePassage = null;
let readingStage = 0;
let readingConjunctionIndex = 0;
let userOrderTracking = [];

// AI 문장방 상태
let sentenceHistory = [];

// 🧚‍♀️ 아나운서 요정 코코 TTS 엔진 안전 우회막
if (!window.stopFairyTTS) {
    window.stopFairyTTS = function() { console.log("🔊 [TTS 우회] 아직 요정 엔진 로드 전입니다."); };
    window.stopFairyTTS.isMock = true;
}
if (!window.speakFairyTTS) {
    window.speakFairyTTS = function(msg) { console.log("🔊 [TTS 우회] 아직 요정 엔진 로드 전입니다:", msg); };
    window.speakFairyTTS.isMock = true;
}

function toggleFairyTtsSetting() {
    const isCurrentlyEnabled = localStorage.getItem('fairy_tts_enabled') !== 'false';
    const nextState = !isCurrentlyEnabled;
    localStorage.setItem('fairy_tts_enabled', nextState ? 'true' : 'false');
    updateTtsToggleUi();
    if (!nextState) stopFairyTTS();
    else setTimeout(() => speakFairyTTS("요정 코코의 나긋나긋한 낭독 서비스가 켜졌습니다! 🧚‍♀️"), 150);
}

function updateTtsToggleUi() {
    const btn = document.getElementById('ttsToggleBtn');
    if (!btn) return;
    const isEnabled = localStorage.getItem('fairy_tts_enabled') !== 'false';
    if (isEnabled) {
        btn.innerHTML = "🔊 요정 음성 ON";
        btn.style.borderColor = currentProfile === 'son' ? "#00f2fe" : "#ff6b9d";
        btn.style.color = currentProfile === 'son' ? "#00f2fe" : "#ff6b9d";
    } else {
        btn.innerHTML = "🔇 요정 음성 OFF";
        btn.style.borderColor = "#8b949e";
        btn.style.color = "#8b949e";
    }
}

function initializeEnglishRoom() {
    console.log("🛠️ 영어방 초기화 엔진 가동...");
    const titleEl = document.getElementById('englishTitle');
    const badgeEl = document.getElementById('adminBadgeTag');
    
    if (currentProfile === 'son') {
        document.body.className = "theme--minecraft";
        if (titleEl) titleEl.textContent = `${currentUserName}의 영어 멀티버스 대기실`;
        if (badgeEl) { badgeEl.className = "admin-status-badge"; badgeEl.textContent = `🎮 [${currentUserName}] 네온 관제`; }
    } else {
        document.body.className = "theme--slime";
        if (titleEl) titleEl.textContent = `${currentUserName}의 영어 멀티버스 대기실`;
        if (badgeEl) { badgeEl.className = "admin-status-badge english--fairy"; badgeEl.textContent = `🎠 [${currentUserName}] 동화 모드`; }
    }

    if (isAdmin) {
        if (titleEl) titleEl.innerHTML = `<span style="color:var(--accent-orange);">🛠️ 영어 관리자 시뮬레이터</span>`;
        if (badgeEl) badgeEl.textContent = `🛠️ [${currentUserName} 검수용] 프리패스 가동`;
    } else {
        if (typeof startLearning === 'function') startLearning("초등 영어 멀티버스");
    }
    updateTtsToggleUi();
    if (typeof initChatMemorySession === 'function') {
        initChatMemorySession('공부방');
    }
}

// ==========================================
// 🗣️ 원어민 음성 출력 엔진 (TTS)
// ==========================================
function speakEnglish(text) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel(); 
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US'; 
    utterance.rate = 0.85; 
    window.speechSynthesis.speak(utterance);
  } else {
    console.warn("이 기기에서는 음성 지원(TTS)이 되지 않습니다.");
  }
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
    
    currentMissionType = type;

    let targetTitle = ""; let targetIcon = "";
    switch(type) {
        case 'stage1': targetTitle = "1단계: 알파벳 터치방"; targetIcon = "🔤"; break;
        case 'stage2': targetTitle = "2단계: 파닉스 듣기방"; targetIcon = "🎧"; break;
        case 'stage3': targetTitle = "3단계: 영단어/숙어방"; targetIcon = "📝"; break;
        case 'stage4': targetTitle = "4단계: 영어 문장방"; targetIcon = "💬"; break;
        case 'stage5': targetTitle = "5단계: 짧은 문단 독해"; targetIcon = "📖"; break;
        case 'stage6': targetTitle = "6단계: 예비 중등 토론"; targetIcon = "🗣️"; break;
    }
    headerTitle.textContent = targetTitle;
    headerIcon.textContent = targetIcon;

    showLoadingSpinner(innerBody);
    fetchAndBuildDynamicUI(type, innerBody);
}

function showLoadingSpinner(container) {
    container.innerHTML = `
      <div class="spinner-wrapper">
        <div class="spinner-circle"></div>
        <p style="font-family:'Gaegu', cursive; font-size:1.3rem; font-weight:bold; color:inherit; text-align:center;">
            Fairy_🧚‍♀️ 코코 요정이 자료를 챙겨오고 있어요...
        </p>
      </div>
    `;
}

function closeMissionView() {
    if (typeof flushPendingMissionReward === 'function') {
        flushPendingMissionReward();
    }
    if (currentMissionType === 'stage6' && sentenceHistory.length > 0 && typeof saveChatMemoryFromConversation === 'function') {
        saveChatMemoryFromConversation({ roomType: '공부방', messages: sentenceHistory });
    }
    document.getElementById('missionOverlay').style.display = "none";
    stopFairyTTS();
}

// ========================================================
// 📊 데이터 페칭 및 동적 UI 생성
// ========================================================
async function fetchAndBuildDynamicUI(type, innerBody) {
    try {
        if (type === 'stage5' || type === 'stage6') {
            // 독해/토론방 로직 (국어방 구조 재활용)
            if (typeof fetchLibraryBooksFromNotion === 'function') {
                const records = await fetchLibraryBooksFromNotion();
                // 영어 독해용 데이터로 매핑
                readingFetchedBooks = (records && records.length > 0) 
                    ? records.map(res => {
                        const barcode = res.properties["도서 키(ID)"]?.rich_text[0]?.plain_text;
                        return ENGLISH_READING_DATABASE.find(book => book.id === barcode);
                    }).filter(book => book !== undefined)
                    : ENGLISH_READING_DATABASE;
                
                // 만약 노션 추천 도서 중 영어 데이터가 없으면 로컬 DB 전체 사용
                if (readingFetchedBooks.length === 0) readingFetchedBooks = ENGLISH_READING_DATABASE;
            } else {
                readingFetchedBooks = ENGLISH_READING_DATABASE;
            }
            
            if (type === 'stage6') {
                renderSentenceUI(innerBody);
            } else {
                renderReadingLobby(innerBody);
            }
        } else {
            // 단어/문장/파닉스 등 노션 VOCA DB 연동
            const records = await fetchVocaFromNotion({ subject: "영어", filterByStudent: !isAdmin });
            
            if (records && records.length > 0) {
                allFetchedRecords = records;
                
                // 학년/단원 필터 UI (사회방 이식)
                const uniqueGrades = [...new Set(records.flatMap(r => r.grades || [r.grade]))].filter(g => g && g !== "공통").sort();
                if (uniqueGrades.length === 0) {
                    startMissionWithFilteredData(records, innerBody);
                } else {
                    renderDynamicGradeUI(uniqueGrades, innerBody);
                }
            } else {
                innerBody.innerHTML = `<div style="text-align:center; padding:40px;">데이터가 없습니다.</div>`;
            }
        }
    } catch(e) {
        console.error("통신 에러:", e);
        innerBody.innerHTML = `<div style="text-align:center; padding:40px;">오류가 발생했습니다: ${e.message}</div>`;
    }
}

// ========================================================
// 🎒 학년/단원 필터 UI (사회방 이식)
// ========================================================
function renderDynamicGradeUI(grades, container) {
    let html = `<div style="text-align:center; margin-bottom:20px;">
        <h3 style="color:var(--primary); margin-bottom:15px;">🎒 도전할 학년을 선택하세요!</h3>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">`;
    grades.forEach(g => {
        html += `<button class="quiz-choice-btn" style="padding:15px; font-size:1.2rem;" onclick="selectDynamicGrade('${g}')">${g}</button>`;
    });
    html += `</div></div>`;
    container.innerHTML = html;
}

window.selectDynamicGrade = function(grade) {
    selectedEnglishGrade = grade;
    const innerBody = document.getElementById('overlayInnerBody');
    const matchedRecords = allFetchedRecords.filter(r => r.grade === grade || r.grades.includes(grade));
    const uniqueUnits = [...new Set(matchedRecords.map(r => String(r.level).trim()))].filter(u => u && u !== "undefined").sort((a,b) => a.localeCompare(b, undefined, {numeric: true}));
    
    if (uniqueUnits.length === 0 || (uniqueUnits.length === 1 && uniqueUnits[0] === "기본 단원")) {
        startMissionWithFilteredData(matchedRecords, innerBody);
    } else {
        renderDynamicUnitUI(uniqueUnits, innerBody);
    }
};

function renderDynamicUnitUI(units, container) {
    let html = `<div style="text-align:center; margin-bottom:20px;">
        <h3 style="color:var(--mint); margin-bottom:15px;">📚 [${selectedEnglishGrade}] 도전할 단원을 선택하세요!</h3>
        <div style="display:grid; grid-template-columns:repeat(2, 1fr); gap:10px;">`;
    units.forEach(u => {
        html += `<button class="quiz-choice-btn" style="padding:15px 5px; font-size:1.1rem;" onclick="selectDynamicUnit('${u}')">${u}</button>`;
    });
    html += `</div>
        <div style="margin-top:20px;">
            <button class="quiz-button" style="background:#8b949e; width:100%;" onclick="openMissionView(currentMissionType)">⬅️ 처음으로 돌아가기</button>
        </div>
    </div>`;
    container.innerHTML = html;
}

window.selectDynamicUnit = function(unit) {
    selectedEnglishUnit = unit;
    const innerBody = document.getElementById('overlayInnerBody');
    const finalRecords = allFetchedRecords.filter(r => 
        (r.grade === selectedEnglishGrade || r.grades.includes(selectedEnglishGrade)) &&
        String(r.level).trim() === unit
    );
    startMissionWithFilteredData(finalRecords, innerBody);
};

function startMissionWithFilteredData(records, innerBody) {
    // 품사 필터링 분기
    if (currentMissionType === 'stage3') {
        activeSectionData = records.filter(r => r.pos !== '문장').sort(() => Math.random() - 0.5).slice(0, 10);
    } else if (currentMissionType === 'stage4') {
        activeSectionData = records.filter(r => r.pos === '문장').sort(() => Math.random() - 0.5).slice(0, 10);
    } else {
        activeSectionData = records.sort(() => Math.random() - 0.5).slice(0, 10);
    }

    if (activeSectionData.length === 0) {
        innerBody.innerHTML = `<div style="text-align:center; padding:40px;">해당 조건의 문제가 없습니다.</div>`;
        return;
    }
    renderSectionUI();
}

// ========================================================
// 🎯 각 모드별 UI 렌더링 및 로직
// ========================================================
function renderSectionUI() {
    const container = document.getElementById('overlayInnerBody');
    container.innerHTML = "";
    
    if (activeQuizIdx >= activeSectionData.length) {
        container.innerHTML = `
            <div style="text-align:center; padding: 40px 20px;">
                <div style="font-size:3rem; margin-bottom:15px;">🎉</div>
                <p style="font-size:1.4rem; color:var(--primary); margin-bottom:20px;">모든 문제를 완료했습니다!</p>
                <button class="quiz-button" style="background:var(--pink); color:white;" onclick="triggerAwardDispense(${activeQuizIdx * 2}, currentMissionType); if (typeof sendStudyLogToNotion === 'function') sendStudyLogToNotion({ subject: '영어' }); closeMissionView();">🎁 보상 받고 나가기</button>
            </div>`;
        return;
    }

    if (currentMissionType === 'stage1') renderStage1UI(container);
    else if (currentMissionType === 'stage2') renderStage2UI(container);
    else if (currentMissionType === 'stage3') renderStage3UI(container);
    else if (currentMissionType === 'stage4') renderStage4UI(container);
}

// --------------------------------------------------------
// 1단계: 알파벳 터치방 (타이핑 금지)
// --------------------------------------------------------
function renderStage1UI(container) {
    const currentItem = activeSectionData[activeQuizIdx];
    const answerWord = currentItem.word.trim();
    
    const imageUrl = currentItem.imageUrl || currentItem.image;
    const imageHtml = imageUrl ? `
        <div style="text-align:center; margin-bottom:15px;">
            <img src="${imageUrl}" style="max-width:100%; max-height:200px; border-radius:10px; box-shadow:0 4px 8px rgba(0,0,0,0.2); object-fit:contain;" alt="${currentItem.word}">
        </div>
    ` : '';

    window.verifyStage1 = function() {
        speakEnglish(answerWord);
        speakFairyTTS("참 잘했어요!");
        activeQuizIdx++;
        setTimeout(renderSectionUI, 1500);
    };

    container.innerHTML = `
        <div class="quiz-card">
            <div style="font-size: 0.95rem; opacity:0.7; margin-bottom: 15px;">알파벳 ${activeQuizIdx + 1} / ${activeSectionData.length}</div>
            ${imageHtml}
            <div class="quiz-descr" style="font-size: 3rem; font-weight: bold; color: var(--primary); margin-bottom: 20px;">${answerWord}</div>
            <div style="margin-bottom: 20px; color: #666;">이 단어를 소리 내어 읽고 아래 버튼을 눌러보세요!</div>
            
            <div style="display:flex; gap:10px; justify-content:center; margin-top:20px;">
                <button class="quiz-button" onclick="verifyStage1()">👆 다 읽었어요!</button>
                <button class="quiz-button" style="background:#8b949e;" onclick="speakEnglish('${answerWord.replace(/'/g, "\\'")}')">🔊 원어민 발음 듣기</button>
            </div>
        </div>
    `;
    speakEnglish(answerWord);
}

// --------------------------------------------------------
// 2단계: 파닉스 듣기방 (객관식)
// --------------------------------------------------------
function renderStage2UI(container) {
    const currentItem = activeSectionData[activeQuizIdx];
    const answerWord = currentItem.word.trim();
    
    const imageUrl = currentItem.imageUrl || currentItem.image;
    const imageHtml = imageUrl ? `
        <div style="text-align:center; margin-bottom:15px;">
            <img src="${imageUrl}" style="max-width:100%; max-height:200px; border-radius:10px; box-shadow:0 4px 8px rgba(0,0,0,0.2); object-fit:contain;" alt="${currentItem.word}">
        </div>
    ` : '';

    const choices = [answerWord];
    const otherWords = allFetchedRecords.filter(r => r.word !== answerWord).map(r => r.word);
    otherWords.sort(() => Math.random() - 0.5);
    choices.push(otherWords[0] || "apple");
    choices.push(otherWords[1] || "banana");
    choices.sort(() => Math.random() - 0.5);

    window.verifyStage2 = function(selectedWord) {
        if (selectedWord === answerWord) {
            speakFairyTTS("정답이에요! 귀가 아주 밝네요!");
            activeQuizIdx++;
            setTimeout(renderSectionUI, 1000);
        } else {
            speakFairyTTS("아쉽지만 틀렸어요. 다시 한번 잘 들어볼까요?");
        }
    };

    container.innerHTML = `
        <div class="quiz-card">
            <div style="font-size: 0.95rem; opacity:0.7; margin-bottom: 15px;">파닉스 ${activeQuizIdx + 1} / ${activeSectionData.length}</div>
            ${imageHtml}
            <div style="font-size: 5rem; margin-bottom: 20px; cursor: pointer;" onclick="speakEnglish('${answerWord.replace(/'/g, "\\'")}')">🎧</div>
            <div style="margin-bottom: 20px; color: #666;">소리를 듣고 알맞은 단어를 고르세요!</div>
            
            <div class="quiz-choices-container" style="display: flex; flex-direction: column; gap: 10px;">
                ${choices.map(choice => `
                     <button class="quiz-choice-btn" onclick="verifyStage2('${choice.replace(/'/g, "\\'")}')">${choice}</button>
                `).join('')}
            </div>
            <div style="margin-top:20px;">
                <button class="quiz-button" style="background:#8b949e;" onclick="speakEnglish('${answerWord.replace(/'/g, "\\'")}')">🔊 다시 듣기</button>
            </div>
        </div>
    `;
    setTimeout(() => speakEnglish(answerWord), 500);
}

// --------------------------------------------------------
// 3단계: 영단어/숙어방 (자동 스위칭 UI)
// --------------------------------------------------------
function renderStage3UI(container) {
    const currentItem = activeSectionData[activeQuizIdx];
    const answerWord = currentItem.word.trim();
    const wordsArray = answerWord.split(/\s+/);
    const wordCount = wordsArray.length;
    const totalLength = answerWord.length;

    const imageUrl = currentItem.imageUrl || currentItem.image;
    const imageHtml = imageUrl ? `
        <div style="text-align:center; margin-bottom:15px;">
            <img src="${imageUrl}" style="max-width:100%; max-height:200px; border-radius:10px; box-shadow:0 4px 8px rgba(0,0,0,0.2); object-fit:contain;" alt="${currentItem.word}">
        </div>
    ` : '';

    let interactiveHtml = '';

    if (wordCount === 1 && totalLength >= 7) {
        // [자석 낱말 카드 조립 UI] 발동 (7글자 이상)
        const chars = answerWord.split('').filter(c => c.trim() !== '');
        const scrambled = [...chars].sort(() => Math.random() - 0.5);

        window.currentEngMagnetAnswer = [];
        window.engMagnetTargetWord = answerWord;

        window.selectEngMagnet = function(letter, idx) {
            const btn = document.getElementById(`eng-magnet-btn-${idx}`);
            if (btn.style.visibility === 'hidden') return;
            btn.style.visibility = 'hidden';
            window.currentEngMagnetAnswer.push({ letter, idx });
            window.renderEngMagnetBlanks();
        };

        window.renderEngMagnetBlanks = function() {
            const blankContainer = document.getElementById('eng-magnet-blanks');
            if (!blankContainer) return;
            let html = '';
            let answerIdx = 0;
            for (let i = 0; i < window.engMagnetTargetWord.length; i++) {
                if (answerIdx < window.currentEngMagnetAnswer.length) {
                    html += `<span style="border-bottom:3px solid var(--primary); width:30px; display:inline-block; text-align:center; color:var(--primary); font-weight:bold;">${window.currentEngMagnetAnswer[answerIdx].letter}</span>`;
                    answerIdx++;
                } else {
                    html += '<span style="border-bottom:3px solid #ccc; width:30px; display:inline-block; text-align:center;">_</span>';
                }
            }
            blankContainer.innerHTML = html;
        };

        window.resetEngMagnets = function() {
            window.currentEngMagnetAnswer.forEach(item => {
                const btn = document.getElementById(`eng-magnet-btn-${item.idx}`);
                if (btn) btn.style.visibility = 'visible';
            });
            window.currentEngMagnetAnswer = [];
            window.renderEngMagnetBlanks();
        };

        window.verifyEngMagnet = function() {
            const answerStr = window.currentEngMagnetAnswer.map(item => item.letter).join('');
            if (answerStr.toLowerCase() === window.engMagnetTargetWord.toLowerCase()) {
                speakFairyTTS("정답이에요! 스펠링을 완벽하게 맞췄어요!");
                activeQuizIdx++;
                setTimeout(renderSectionUI, 1000);
            } else {
                speakFairyTTS("아쉽지만 틀렸어요. 다시 한번 조합해볼까요?");
                const blankContainer = document.getElementById('eng-magnet-blanks');
                if (blankContainer) {
                    blankContainer.classList.add('wrong');
                    setTimeout(() => blankContainer.classList.remove('wrong'), 800);
                }
            }
        };

        interactiveHtml = `
            <div id="eng-magnet-blanks" style="font-size: 2rem; letter-spacing: 5px; margin-bottom: 20px; min-height: 40px; display: flex; justify-content: center; gap: 5px;">
                ${answerWord.split('').map(() => '<span style="border-bottom:3px solid #ccc; width:30px; display:inline-block; text-align:center;">_</span>').join('')}
            </div>
            <div id="eng-magnet-pool" style="display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-bottom: 20px;">
                ${scrambled.map((l, i) => `<button id="eng-magnet-btn-${i}" class="quiz-choice-btn" style="padding: 10px 20px; font-size: 1.5rem;" onclick="selectEngMagnet('${l}', ${i})">${l}</button>`).join('')}
            </div>
            <div style="display:flex; gap:10px; justify-content:center; margin-top:20px;">
                <button class="quiz-button" style="background:#ff9f43;" onclick="resetEngMagnets()">다시 조합하기</button>
                <button class="quiz-button" onclick="verifyEngMagnet()">정답 확인</button>
            </div>
        `;
    } else {
        // [주관식 타이핑 UI] (6글자 이하 또는 다단어 숙어)
        window.verifyStage3Typing = function() {
            const inputEl = document.getElementById('stage3Input');
            if (!inputEl) return;
            const inputVal = inputEl.value.trim().toLowerCase();
            if (inputVal === answerWord.toLowerCase()) {
                speakFairyTTS("정답이에요! 아주 훌륭해요!");
                inputEl.classList.add('correct');
                activeQuizIdx++;
                setTimeout(renderSectionUI, 1000);
            } else {
                speakFairyTTS("아쉽지만 틀렸어요. 다시 한번 생각해볼까요?");
                inputEl.classList.add('wrong');
                setTimeout(() => inputEl.classList.remove('wrong'), 1000);
            }
        };

        interactiveHtml = `
            <div class="interactive-input-group" style="margin-bottom: 20px;">
                <input id="stage3Input" class="text-input-field" type="text" autocomplete="off" placeholder="영어 단어를 입력하세요!" onkeypress="if(event.key === 'Enter') verifyStage3Typing()" style="width:100%;">
            </div>
            <div style="display:flex; gap:10px; justify-content:center; margin-top:20px;">
                <button class="quiz-button" onclick="verifyStage3Typing()">정답 확인</button>
            </div>
        `;
    }

    container.innerHTML = `
        <div class="quiz-card">
            <div style="font-size: 0.95rem; opacity:0.7; margin-bottom: 15px;">영단어 ${activeQuizIdx + 1} / ${activeSectionData.length}</div>
            ${imageHtml}
            <div class="quiz-descr" style="font-size: 1.5rem; font-weight: bold; color: var(--primary); margin-bottom: 20px;">${currentItem.meaning}</div>
            <div style="margin-bottom: 20px; color: #666;">이 뜻에 맞는 영단어를 맞춰보세요!</div>
            ${interactiveHtml}
            <div style="margin-top:20px;">
                <button class="quiz-button" style="background:#8b949e;" onclick="speakEnglish('${answerWord.replace(/'/g, "\\'")}')">🔊 원어민 발음 듣기</button>
            </div>
        </div>
    `;
}

// --------------------------------------------------------
// 4단계: 영어 문장방 (자동 스위칭 UI)
// --------------------------------------------------------
function renderStage4UI(container) {
    const currentItem = activeSectionData[activeQuizIdx];
    const answerSentence = currentItem.word.trim();
    const wordsArray = answerSentence.split(/\s+/);

    const imageUrl = currentItem.imageUrl || currentItem.image;
    const imageHtml = imageUrl ? `
        <div style="text-align:center; margin-bottom:15px;">
            <img src="${imageUrl}" style="max-width:100%; max-height:200px; border-radius:10px; box-shadow:0 4px 8px rgba(0,0,0,0.2); object-fit:contain;" alt="${currentItem.word}">
        </div>
    ` : '';
    
    let interactiveHtml = '';

    if (wordsArray.length >= 3) {
        // [단어 카드 순서 배열 팝업 UI]
        const scrambled = [...wordsArray].sort(() => Math.random() - 0.5);
        window.currentSentenceAnswer = [];
        window.sentenceTargetWords = wordsArray;

        window.selectSentenceWord = function(word, idx) {
            const btn = document.getElementById(`sent-word-btn-${idx}`);
            if (btn.style.visibility === 'hidden') return;
            btn.style.visibility = 'hidden';
            window.currentSentenceAnswer.push({ word, idx });
            window.renderSentenceBlanks();
        };

        window.renderSentenceBlanks = function() {
            const blankContainer = document.getElementById('sent-word-blanks');
            if (!blankContainer) return;
            let html = '';
            for (let i = 0; i < window.sentenceTargetWords.length; i++) {
                if (i < window.currentSentenceAnswer.length) {
                    html += `<span style="border-bottom:3px solid var(--primary); padding:0 10px; display:inline-block; text-align:center; color:var(--primary); font-weight:bold; margin:0 5px;">${window.currentSentenceAnswer[i].word}</span>`;
                } else {
                    html += '<span style="border-bottom:3px solid #ccc; width:50px; display:inline-block; margin:0 5px;"></span>';
                }
            }
            blankContainer.innerHTML = html;
        };

        window.resetSentenceWords = function() {
            window.currentSentenceAnswer.forEach(item => {
                const btn = document.getElementById(`sent-word-btn-${item.idx}`);
                if (btn) btn.style.visibility = 'visible';
            });
            window.currentSentenceAnswer = [];
            window.renderSentenceBlanks();
        };

        window.verifySentenceOrder = function() {
            const answerStr = window.currentSentenceAnswer.map(item => item.word).join(' ');
            if (answerStr === answerSentence) {
                speakFairyTTS("정답이에요! 문장을 완벽하게 완성했어요!");
                speakEnglish(answerSentence);
                activeQuizIdx++;
                setTimeout(renderSectionUI, 1500);
            } else {
                speakFairyTTS("아쉽지만 틀렸어요. 문장 순서를 다시 생각해볼까요?");
                const blankContainer = document.getElementById('sent-word-blanks');
                if (blankContainer) {
                    blankContainer.classList.add('wrong');
                    setTimeout(() => blankContainer.classList.remove('wrong'), 800);
                }
            }
        };

        interactiveHtml = `
            <div id="sent-word-blanks" style="font-size: 1.5rem; margin-bottom: 20px; min-height: 40px; display: flex; justify-content: center; flex-wrap: wrap; line-height: 2;">
                ${wordsArray.map(() => '<span style="border-bottom:3px solid #ccc; width:50px; display:inline-block; margin:0 5px;"></span>').join('')}
            </div>
            <div id="sent-word-pool" style="display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-bottom: 20px;">
                ${scrambled.map((w, i) => `<button id="sent-word-btn-${i}" class="quiz-choice-btn" onclick="selectSentenceWord('${w.replace(/'/g, "\\'")}', ${i})">${w}</button>`).join('')}
            </div>
            <div style="display:flex; gap:10px; justify-content:center; margin-top:20px;">
                <button class="quiz-button" style="background:#ff9f43;" onclick="resetSentenceWords()">다시 배열하기</button>
                <button class="quiz-button" onclick="verifySentenceOrder()">정답 확인</button>
            </div>
        `;
    } else {
        // [빈칸 뚫기 객관식 3지선다 UI] (짧은 문장)
        const choices = [answerSentence];
        const otherSentences = allFetchedRecords.filter(r => r.pos === '문장' && r.word !== answerSentence).map(r => r.word);
        otherSentences.sort(() => Math.random() - 0.5);
        choices.push(otherSentences[0] || "I am a boy.");
        choices.push(otherSentences[1] || "You are a girl.");
        choices.sort(() => Math.random() - 0.5);

        window.verifyStage4Choice = function(selectedSentence) {
            if (selectedSentence === answerSentence) {
                speakFairyTTS("정답이에요! 훌륭해요!");
                speakEnglish(answerSentence);
                activeQuizIdx++;
                setTimeout(renderSectionUI, 1500);
            } else {
                speakFairyTTS("아쉽지만 틀렸어요. 뜻을 다시 한번 읽어보세요.");
            }
        };

        interactiveHtml = `
            <div class="quiz-choices-container" style="display: flex; flex-direction: column; gap: 10px;">
                ${choices.map(choice => `
                     <button class="quiz-choice-btn" onclick="verifyStage4Choice('${choice.replace(/'/g, "\\'")}')">${choice}</button>
                `).join('')}
            </div>
        `;
    }

    container.innerHTML = `
        <div class="quiz-card">
            <div style="font-size: 0.95rem; opacity:0.7; margin-bottom: 15px;">영어 문장 ${activeQuizIdx + 1} / ${activeSectionData.length}</div>
            ${imageHtml}
            <div class="quiz-descr" style="font-size: 1.5rem; font-weight: bold; color: var(--primary); margin-bottom: 20px;">${currentItem.meaning}</div>
            <div style="margin-bottom: 20px; color: #666;">이 뜻에 맞는 영어 문장을 완성하세요!</div>
            ${interactiveHtml}
            <div style="margin-top:20px;">
                <button class="quiz-button" style="background:#8b949e;" onclick="speakEnglish('${answerSentence.replace(/'/g, "\\'")}')">🔊 원어민 발음 힌트</button>
            </div>
        </div>
    `;
}

// --------------------------------------------------------
// 5단계: 짧은 문단 독해 (국어 정밀독해방 구조 100% 재활용)
// --------------------------------------------------------
function renderReadingLobby(container) {
    let buttonsHtml = readingFetchedBooks.map(book => 
        `<button class="quiz-choice-btn" style="margin-bottom: 10px; width: 100%; text-align: left;" onclick="startReadingMission('${book.id}')">
            📖 [${book.title}] Reading Mission Start
        </button>`
    ).join('');

    container.innerHTML = `
        <div class="quiz-card">
            <h3 style="color:var(--mint); margin-bottom:20px;">오늘의 영어 독해 미션입니다. 원하는 지문을 선택하세요!</h3>
            ${buttonsHtml}
        </div>
    `;
}

window.startReadingMission = function(bookId) {
    activePassage = readingFetchedBooks.find(b => b.id === bookId);
    readingStage = 0;
    readingConjunctionIndex = 0;
    userOrderTracking = [];
    renderReadingStage();
};

window.renderReadingStage = function() {
    const container = document.getElementById('overlayInnerBody');
    const passageText = activePassage.fullText || (activePassage.paragraphs ? activePassage.paragraphs.map(p => p.text).join('\n') : "");
    
    if (readingStage === 1 && (!activePassage.conjunctions || activePassage.conjunctions.length === 0)) {
        readingStage = 2;
    }
    if (readingStage === 2 && !activePassage.themeQuiz) {
        readingStage = 3;
    }
    
    if (readingStage === 0) {
        // 문단 순서 맞추기
        const rawParagraphs = passageText.split('\n').filter(p => p.trim() !== '');
        const paragraphs = rawParagraphs.map((text, idx) => ({ id: `p${idx+1}`, text: text }));
        const correctOrder = paragraphs.map(p => p.id);
        const shuffled = [...paragraphs].sort(() => Math.random() - 0.5);

        window.selectReadingPuzzle = function(id, text, el) {
            if (el.classList.contains('selected')) return;
            el.classList.add('selected');
            userOrderTracking.push(id);
            document.getElementById('puzzle-slots').innerHTML += `<div style="margin-top:5px; color:var(--dark); font-weight:normal;">- ${text}</div>`;
        };
        window.verifyReadingOrder = function() {
            if (userOrderTracking.length !== correctOrder.length) {
                alert("모든 문단을 선택해주세요!"); return;
            }
            if (JSON.stringify(userOrderTracking) === JSON.stringify(correctOrder)) {
                speakFairyTTS("Perfect! 순서를 완벽하게 맞췄어요!");
                readingStage++;
                setTimeout(renderReadingStage, 1500);
            } else {
                speakFairyTTS("순서가 틀렸어요. 다시 한번 잘 읽어보세요!");
                userOrderTracking = [];
                renderReadingStage();
            }
        };

        container.innerHTML = `
            <div class="quiz-card">
                <h3 style="color:var(--purple); margin-bottom:15px;">🧩 Mission 1: 문단의 올바른 순서를 완성하라!</h3>
                <div class="puzzle-pool">
                    ${shuffled.map(p => `<div class="puzzle-block" onclick="selectReadingPuzzle('${p.id}', '${p.text.replace(/'/g, "\\'")}', this)">${p.text}</div>`).join('')}
                </div>
                <div id="puzzle-slots" class="puzzle-slots">선택한 순서: </div>
                <button class="quiz-button" style="width:100%;" onclick="verifyReadingOrder()">문단 결합 검사하기</button>
            </div>
        `;
    } else if (readingStage === 1) {
        // 접속사 퀴즈
        const conj = activePassage.conjunctions[readingConjunctionIndex];
        window.verifyReadingConj = function(ans) {
            const isCorrect = typeof gradeConjunctionAnswer === 'function'
                ? gradeConjunctionAnswer(conj, ans)
                : (ans === conj.answer);
            if (isCorrect) {
                const correctWord = typeof getConjunctionCorrectAnswer === 'function'
                    ? getConjunctionCorrectAnswer(conj)
                    : conj.answer;
                speakFairyTTS("정답이에요! " + (conj.commentary || correctWord));
                readingConjunctionIndex++;
                if (readingConjunctionIndex >= activePassage.conjunctions.length) {
                    readingStage++;
                }
                setTimeout(renderReadingStage, 2000);
            } else {
                speakFairyTTS("틀렸어요. 앞뒤 문맥을 다시 한번 살펴보세요.");
            }
        };

        container.innerHTML = `
            <div class="quiz-card">
                <h3 style="color:var(--accent-orange); margin-bottom:15px;">🔗 Mission 2: 알맞은 연결어 찾기! (${readingConjunctionIndex+1}/${activePassage.conjunctions.length})</h3>
                <div class="passage-box">
                    ${conj.sentenceBefore} <br><br>
                    <span style="color:var(--primary); font-weight:bold;">[ ? ]</span> <br><br>
                    ${conj.sentenceAfter}
                </div>
                <div style="display:flex; flex-direction:column; gap:10px;">
                    ${conj.options.map(opt => `<button class="quiz-choice-btn" onclick="verifyReadingConj('${opt}')">${opt}</button>`).join('')}
                </div>
            </div>
        `;
    } else if (readingStage === 2) {
        // 주제 찾기 퀴즈
        const quiz = activePassage.themeQuiz;
        window.verifyReadingTheme = function(idx) {
            if (idx === quiz.answerIndex) {
                speakFairyTTS("Excellent! 핵심을 정확히 짚어냈네요!");
                readingStage++;
                setTimeout(renderReadingStage, 2000);
            } else {
                speakFairyTTS("아니에요. 글쓴이가 진짜 하고 싶은 말이 무엇일지 다시 생각해보세요.");
            }
        };

        container.innerHTML = `
            <div class="quiz-card">
                <h3 style="color:var(--pink); margin-bottom:15px;">🎯 Mission 3: 핵심 주제를 찾아라!</h3>
                <div class="quiz-descr">${quiz.question}</div>
                <div style="display:flex; flex-direction:column; gap:10px;">
                    ${quiz.options.map((opt, i) => `<button class="quiz-choice-btn" style="text-align:left;" onclick="verifyReadingTheme(${i})">${i+1}. ${opt}</button>`).join('')}
                </div>
            </div>
        `;
    } else {
        if (typeof dispatchSuccessMissionReward === 'function') {
            dispatchSuccessMissionReward('stage5', activePassage?.id, 10);
        }
        // 완료 및 보상
        container.innerHTML = `
            <div style="text-align:center; padding: 40px 20px;">
                <div style="font-size:3rem; margin-bottom:15px;">🎉</div>
                <p style="font-size:1.4rem; color:var(--mint); margin-bottom:20px;">독해 미션을 완벽하게 클리어했습니다!</p>
                <button class="quiz-button" style="background:var(--sky-blue); color:white; border:none;" onclick="closeMissionView();">🎁 보상 확인하고 나가기</button>
            </div>
        `;
    }
};

// --------------------------------------------------------
// 6단계: 예비 중등 토론 (AI 지문 토론방 구조 재활용)
// --------------------------------------------------------
function renderSentenceUI(container) {
    let buttonsHtml = readingFetchedBooks.map(book => 
        `<button class="quiz-choice-btn" style="margin-bottom: 10px; width: 100%; text-align: left;" onclick="startSentenceMission('${book.id}')">
            🗣️ [${book.title}] Discussion Start
        </button>`
    ).join('');

    container.innerHTML = `
        <div class="quiz-card">
            <h3 style="color:var(--purple); margin-bottom:20px;">오늘의 영어 토론 지문입니다. 원하는 지문을 선택하세요!</h3>
            ${buttonsHtml}
        </div>
    `;
}

window.startSentenceMission = function(bookId) {
    activePassage = readingFetchedBooks.find(b => b.id === bookId);
    sentenceHistory = [];
    renderSentenceChat();
};

window.renderSentenceChat = function() {
    const container = document.getElementById('overlayInnerBody');
    const passageText = activePassage.fullText || (activePassage.paragraphs ? activePassage.paragraphs.map(p => p.text).join('\n') : "");
    
    window.processSentenceInput = async function() {
        const inputEl = document.getElementById('sentenceInput');
        const text = inputEl.value.trim();
        if (!text) return;
        inputEl.value = '';
        appendSentenceMsg('user', text);
        
        const loadingId = appendSentenceMsg('ai', "⏳ 코코가 생각 중이에요...");
        
        try {
            sentenceHistory.push({ role: "user", content: text });
            const passageExtra = (activePassage.chatbotSystemPrompt || `
                너는 방금 읽은 영어 지문을 바탕으로 아이와 다정하게 대화를 나누는 AI 영어 멘토 코코야. 
                단순히 대화만 나누는 것이 아니라, 다음 내용들을 아이와 함께 알아가거나 설명해줘야 해:
                1. 문장의 구성 (주어, 동사 등 핵심 구조)
                2. 글의 주제와 핵심 내용
                3. 지칭 대명사(it, they, he, she 등)가 본문에서 무엇을 가리키는지 설명
                
                말투는 어린이 진행자처럼 다정하고 유창하게 하고, 아이가 영어로 대답하도록 유도해줘. 
                문법이 틀려도 다정하게 교정해주며 칭찬해줘. 
                아이가 지문에 대해 자신의 생각을 한 문장 이상 잘 표현했다면 반드시 대답 끝에 [SUCCESS]를 붙여줘.
            `) + (typeof CONJUNCTION_GRADING_GUARDRAIL !== 'undefined' ? `\n\n${CONJUNCTION_GRADING_GUARDRAIL}` : '')
                + "\n\n다음은 아이가 읽은 영어 지문 원문이야:\n" + passageText;
            const systemPrompt = typeof buildFullAISystemPrompt === 'function'
                ? buildFullAISystemPrompt('공부방', passageExtra)
                : passageExtra;
            
            const response = await fetch(`${PROXY_URL}/v1/chat/completions?type=ai`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: "gemini-2.5-flash",
                    messages: [
                        { role: "system", content: systemPrompt },
                        ...sentenceHistory
                    ]
                })
            });
            const data = await response.json();
            const reply = data.choices[0].message.content;
            sentenceHistory.push({ role: "assistant", content: reply });
            
            document.getElementById(loadingId).innerHTML = reply.replace(/\n/g, '<br>');
            speakFairyTTS(reply.replace(/\[SUCCESS\]/g, ''));
            
            if (reply.includes("[SUCCESS]")) {
                if (typeof dispatchSuccessMissionReward === 'function') {
                    dispatchSuccessMissionReward('stage6', activePassage?.id, 5);
                } else {
                    triggerAwardDispense(5, 'stage6');
                    if (typeof sendStudyLogToNotion === 'function') sendStudyLogToNotion({ subject: '영어' });
                }
            }
        } catch (e) {
            document.getElementById(loadingId).innerHTML = "😢 통신 오류가 발생했어요.";
        }
    };

    window.appendSentenceMsg = function(sender, text) {
        const chatBox = document.getElementById('sentenceChatBox');
        const msgId = 'msg_' + Date.now();
        const msgHtml = `<div id="${msgId}" class="msg ${sender}">${text}</div>`;
        chatBox.insertAdjacentHTML('beforeend', msgHtml);
        chatBox.scrollTop = chatBox.scrollHeight;
        return msgId;
    };

    container.innerHTML = `
        <div class="passage-box" style="font-size:0.95rem; max-height:150px; overflow-y:auto; margin-bottom:15px; border-left-color:var(--purple);">
            <strong>[${activePassage.title}]</strong><br>
            ${passageText.replace(/\n/g, '<br>')}
        </div>
        <div class="chat-box" id="sentenceChatBox" style="height:250px;"></div>
        <div class="interactive-input-group">
            <input type="text" class="text-input-field" id="sentenceInput" placeholder="Type your thoughts here!" onkeypress="if(event.key==='Enter') processSentenceInput()">
            <button class="quiz-button" onclick="processSentenceInput()">Send</button>
        </div>
    `;
    
    if (sentenceHistory.length === 0) {
        const initialMsg = `Hello! 방금 읽은 <strong>[${activePassage.title}]</strong> 이야기에 대해 나랑 이야기해볼까? What do you think about this story? ✨`;
        appendSentenceMsg('ai', initialMsg);
        speakFairyTTS(`Hello! 방금 읽은 ${activePassage.title} 이야기에 대해 나랑 이야기해볼까?`);
    } else {
        sentenceHistory.forEach(h => appendSentenceMsg(h.role === 'user' ? 'user' : 'ai', h.content.replace(/\n/g, '<br>')));
    }
};

// ========================================================
// 🎁 보상 지급 연동
// ========================================================
window.triggerAwardDispense = async function(rewardAmount, type) {
    if (isAdmin) {
        alert(`[관리자 모드] ${rewardAmount}개의 보상 지급이 시뮬레이션 되었습니다.`);
        return;
    }
    
    const todayKey = new Date().toLocaleDateString();
    const countKey = `daily_reward_count_${currentUserName}_${todayKey}`;
    let currentCount = parseInt(localStorage.getItem(countKey) || "0");
    
    if (currentCount >= 100) {
        alert("🛑 오늘의 최대 획득 가능 보상(100개)을 모두 채웠습니다! 내일 다시 도전하세요!");
        return;
    }
    
    let actualReward = rewardAmount;
    if (currentCount + rewardAmount > 100) {
        actualReward = 100 - currentCount;
    }
    
    localStorage.setItem(countKey, currentCount + actualReward);
    
    if (typeof grantRewardAndShowUI === 'function') {
        await grantRewardAndShowUI(actualReward, false, '영어');
    }
};
