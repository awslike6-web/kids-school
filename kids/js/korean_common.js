// kids/js/korean_common.js
// 🔗 국어 멀티버스 공용 관제탑 엔진 (싱글 HTML 팝업 아키텍처 대통합 버전)

window.currentSubject = "국어"; // 전역 과목명 명시
let currentProfile = localStorage.getItem('currentUser') || 'son';
let currentUserName = localStorage.getItem('currentUserName') || '민수';
let currentTheme = localStorage.getItem('currentTheme') || 'theme--minecraft';
const isAdmin = (currentUserName === '아빠' || currentUserName === '엄마');

let activeSectionData = [];
let activeQuizIdx = 0;
let currentMissionType = "";
let allFetchedRecords = [];
let selectedKoreanGrade = "";
let selectedKoreanUnit = "";

// AI 문장방 상태
let sentenceMode = 'base';
let sentenceHistory = [];
let sentenceCount = 0;

// 독해방 상태
let readingFetchedBooks = [];
let activePassage = null;
let readingStage = 0;
let readingConjunctionIndex = 0;
let userOrderTracking = [];

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

function toggleProfileManually() {
    if (currentProfile === 'son') {
        currentProfile = 'daughter'; currentUserName = '민서'; currentTheme = 'theme--slime';
    } else {
        currentProfile = 'son'; currentUserName = '민수'; currentTheme = 'theme--minecraft';
    }
    localStorage.setItem('currentUser', currentProfile);
    localStorage.setItem('currentUserName', currentUserName);
    localStorage.setItem('currentTheme', currentTheme);
    location.reload();
}

function initializeKoreanRoom() {
    console.log("🛠️ 국어방 초기화 엔진 가동...");
    const titleEl = document.getElementById('koreanTitle');
    const badgeEl = document.getElementById('adminBadgeTag');
    
    if (currentProfile === 'son') {
        document.body.className = "theme--minecraft";
        if (titleEl) titleEl.textContent = `${currentUserName}의 국어 멀티버스 대기실`;
        if (badgeEl) { badgeEl.className = "admin-status-badge"; badgeEl.textContent = `🎮 [${currentUserName}] 네온 관제`; }
    } else {
        document.body.className = "theme--slime";
        if (titleEl) titleEl.textContent = `${currentUserName}의 국어 멀티버스 대기실`;
        if (badgeEl) { badgeEl.className = "admin-status-badge korean--fairy"; badgeEl.textContent = `🎠 [${currentUserName}] 동화 모드`; }
    }

    if (isAdmin) {
        if (titleEl) titleEl.innerHTML = `<span style="color:var(--orange);">🛠️ 국어 관리자 시뮬레이터</span>`;
        if (badgeEl) badgeEl.textContent = `🛠️ [${currentUserName} 검수용] 프리패스 가동`;
    } else {
        if (typeof startLearning === 'function') startLearning("초등 국어 멀티버스");
    }
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
    
    currentMissionType = type;
    selectedKoreanGrade = "";
    selectedKoreanUnit = "";

    let targetTitle = ""; let targetIcon = "";
    switch(type) {
        case 'sentence': targetTitle = "AI 지문 토론방"; targetIcon = "🗣️"; break;
        case 'reading': targetTitle = "정밀 독해 멀티버스방"; targetIcon = "📖"; break;
        case 'voca': targetTitle = "국어 용어방"; targetIcon = "📚"; break;
        case 'dictation': targetTitle = "받아쓰기 훈련소"; targetIcon = "✍️"; break;
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
    document.getElementById('missionOverlay').style.display = "none";
    stopFairyTTS();
}

// ========================================================
// 📊 데이터 페칭 및 동적 UI 생성
// ========================================================
async function fetchAndBuildDynamicUI(type, innerBody) {
    try {
        if (type === 'sentence' || type === 'reading') {
            if (typeof fetchLibraryBooksFromNotion === 'function') {
                const records = await fetchLibraryBooksFromNotion();
                if (records && records.length > 0) {
                    readingFetchedBooks = records.map(res => {
                        const barcode = res.properties["도서 키(ID)"]?.rich_text[0]?.plain_text;
                        return KOREAN_READING_DATABASE.find(book => book.id === barcode);
                    }).filter(book => book !== undefined);
                    
                    if (type === 'sentence') {
                        renderSentenceUI(innerBody);
                    } else {
                        renderReadingLobby(innerBody);
                    }
                } else {
                    throw new Error("추천 지문 없음");
                }
            } else {
                // Fallback to mock
                readingFetchedBooks = KOREAN_READING_DATABASE.slice(0, 2);
                if (type === 'sentence') {
                    renderSentenceUI(innerBody);
                } else {
                    renderReadingLobby(innerBody);
                }
            }
        } else if (type === 'voca' || type === 'dictation') {
            const subjectTag = type === 'voca' ? "국어" : "받아쓰기";
            const records = await fetchVocaFromNotion({ subject: subjectTag, filterByStudent: !isAdmin });
            
            if (records && records.length > 0) {
                allFetchedRecords = records;
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
        <h3 style="color:var(--purple); margin-bottom:15px;">🎒 도전할 학년을 선택하세요!</h3>
        <div class="grade-grid">`;
    grades.forEach(g => {
        html += `<button class="quiz-choice-btn" style="padding:15px; font-size:1.2rem;" onclick="selectDynamicGrade('${g}')">${g}</button>`;
    });
    html += `</div></div>`;
    container.innerHTML = html;
}

window.selectDynamicGrade = function(grade) {
    selectedKoreanGrade = grade;
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
        <h3 style="color:var(--sky); margin-bottom:15px;">📚 [${selectedKoreanGrade}] 도전할 단원을 선택하세요!</h3>
        <div class="grade-grid">`;
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
    selectedKoreanUnit = unit;
    const innerBody = document.getElementById('overlayInnerBody');
    const finalRecords = allFetchedRecords.filter(r => 
        (r.grade === selectedKoreanGrade || r.grades.includes(selectedKoreanGrade)) &&
        String(r.level).trim() === unit
    );
    startMissionWithFilteredData(finalRecords, innerBody);
};

function startMissionWithFilteredData(records, innerBody) {
    activeSectionData = records.sort(() => Math.random() - 0.5).slice(0, 10); // 최대 10문제
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
                <p style="font-size:1.4rem; color:var(--purple); margin-bottom:20px;">모든 문제를 완료했습니다!</p>
                <button class="back-to-lobby-btn" style="background:var(--pink); color:white;" onclick="triggerAwardDispense(${activeQuizIdx * 2}, currentMissionType); if (typeof sendStudyLogToNotion === 'function') sendStudyLogToNotion({ subject: '국어' }); closeMissionView();">🎁 보상 받고 나가기</button>
            </div>`;
        return;
    }

    if (currentMissionType === 'voca') renderVocaUI(container);
    else if (currentMissionType === 'dictation') renderDictationUI(container);
}

// --------------------------------------------------------
// 1. 국어 용어방 (단어 -> 뜻 맞추기 객관식 강제)
// --------------------------------------------------------
function renderVocaUI(container) {
    const currentItem = activeSectionData[activeQuizIdx];
    const answerMeaning = currentItem.meaning;
    
    const imageUrl = currentItem.imageUrl || currentItem.image;
    const imageHtml = imageUrl ? `
        <div style="text-align:center; margin-bottom:15px;">
            <img src="${imageUrl}" style="max-width:100%; max-height:200px; border-radius:10px; box-shadow:0 4px 8px rgba(0,0,0,0.2); object-fit:contain;" alt="${currentItem.word}">
        </div>
    ` : '';

    // 무조건 객관식 3지선다 (오답 뜻 2개 추출)
    const choices = [answerMeaning];
    const otherMeanings = allFetchedRecords.filter(r => r.meaning && r.meaning !== answerMeaning).map(r => r.meaning);
    otherMeanings.sort(() => Math.random() - 0.5);
    choices.push(otherMeanings[0] || "전혀 관계없는 뜻입니다.");
    choices.push(otherMeanings[1] || "다른 단어의 뜻입니다.");
    choices.sort(() => Math.random() - 0.5);

    window.verifyKoreanVocaChoice = function(selectedMeaning) {
        if (selectedMeaning === answerMeaning) {
            speakFairyTTS("정답이에요! 아주 훌륭해요!");
            activeQuizIdx++;
            setTimeout(renderSectionUI, 1000);
        } else {
            speakFairyTTS("아쉽지만 틀렸어요. 다시 한번 생각해볼까요?");
            if (!window.wrongNotes) window.wrongNotes = [];
            window.wrongNotes.push({ word: currentItem.word, wrongInput: selectedMeaning });
        }
    };

    container.innerHTML = `
        <div class="quiz-card">
            <div style="font-size: 0.95rem; opacity:0.7; margin-bottom: 10px;">단어 ${activeQuizIdx + 1} / ${activeSectionData.length}</div>
            ${imageHtml}
            <div class="quiz-descr" style="font-size: 2rem; font-weight: bold; color: var(--purple);">${currentItem.word}</div>
            <div style="margin-bottom: 20px; color: #666;">이 단어의 올바른 뜻을 골라보세요!</div>
            
            <div class="quiz-choices-container">
                ${choices.map(choice => `
                     <button class="quiz-choice-btn" style="text-align:left; line-height:1.4;" onclick="verifyKoreanVocaChoice('${choice.replace(/'/g, "\\'")}')">${choice}</button>
                `).join('')}
            </div>
            
            <div style="margin-top: 20px; display: flex; gap: 8px; justify-content: center;">
                <button class="quiz-button" style="background:#8b949e;" onclick="speakFairyTTS('${currentItem.word}')">🔊 단어 듣기</button>
                <button class="quiz-button" style="background:var(--pink);" onclick="activeQuizIdx++; renderSectionUI();">건너뛰기 ⏩</button>
            </div>
        </div>
    `;
    speakFairyTTS(currentItem.word);
}

// --------------------------------------------------------
// 2. 받아쓰기 훈련소
// --------------------------------------------------------
function renderDictationUI(container) {
    const currentItem = activeSectionData[activeQuizIdx];
    
    window.verifyKoreanDictation = function() {
        const inputVal = document.getElementById('dictationInput').value.trim();
        if (inputVal === currentItem.word.trim()) {
            speakFairyTTS("완벽해요! 띄어쓰기까지 정확하게 맞췄어요!");
            document.getElementById('dictationInput').classList.add('correct');
            activeQuizIdx++;
            setTimeout(renderSectionUI, 1500);
        } else {
            speakFairyTTS("아쉽네요. 다시 한번 잘 듣고 적어보세요.");
            document.getElementById('dictationInput').classList.add('wrong');
            setTimeout(() => document.getElementById('dictationInput').classList.remove('wrong'), 1000);
            if (!window.wrongNotes) window.wrongNotes = [];
            window.wrongNotes.push({ word: currentItem.word, wrongInput: inputVal });
        }
    };

    container.innerHTML = `
        <div class="quiz-card">
            <div style="font-size: 0.95rem; opacity:0.7; margin-bottom: 10px;">받아쓰기 ${activeQuizIdx + 1} / ${activeSectionData.length}</div>
            <div style="font-size: 5rem; margin-bottom: 20px;">🎧</div>
            <div id="dictationHint" style="font-size: 1.2rem; color: #888; margin-bottom: 20px; display: none;">${currentItem.word}</div>
            
            <input id="dictationInput" class="text-input-field" type="text" autocomplete="off" placeholder="여기에 받아 적으세요" onkeypress="if(event.key === 'Enter') verifyKoreanDictation()" style="width:100%; margin-bottom:20px;">
            
            <div style="display:flex; gap:10px; justify-content:center;">
                <button class="quiz-button" onclick="verifyKoreanDictation()">정답 내기</button>
                <button class="quiz-button" style="background:#ff9f43;" onclick="speakFairyTTS('${currentItem.word}')">🔊 다시 듣기</button>
            </div>
            <button style="margin-top: 20px; background: none; border: none; color: #ccc; text-decoration: underline; cursor: pointer;" onclick="document.getElementById('dictationHint').style.display='block'">모르겠어요 (정답 보기)</button>
        </div>
    `;
    setTimeout(() => speakFairyTTS(currentItem.word), 500);
}

// --------------------------------------------------------
// 3. AI 지문 토론방
// --------------------------------------------------------
function renderSentenceUI(container) {
    let buttonsHtml = readingFetchedBooks.map(book => 
        `<button class="quiz-choice-btn" style="margin-bottom: 10px; width: 100%; text-align: left;" onclick="startSentenceMission('${book.id}')">
            🗣️ [${book.title}] 토론 시작하기
        </button>`
    ).join('');

    container.innerHTML = `
        <div class="quiz-card">
            <h3 style="color:var(--purple); margin-bottom:20px;">아빠가 준비한 오늘의 토론 지문입니다. 원하는 지문을 선택하세요!</h3>
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
    
    window.processSentenceInput = async function() {
        const inputEl = document.getElementById('sentenceInput');
        const text = inputEl.value.trim();
        if (!text) return;
        inputEl.value = '';
        appendSentenceMsg('user', text);
        
        const loadingId = appendSentenceMsg('ai', "⏳ 코코가 생각 중이에요...");
        
        try {
            sentenceHistory.push({ role: "user", content: text });
            const response = await fetch(`${PROXY_URL}/v1/chat/completions?type=ai`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: "gemini-2.5-flash",
                    messages: [
                        { role: "system", content: activePassage.chatbotSystemPrompt + "\n\n다음은 아이가 읽은 지문 원문이야:\n" + activePassage.fullText },
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
                setTimeout(() => {
                    triggerAwardDispense(5, 'sentence');
                    if (typeof sendStudyLogToNotion === 'function') sendStudyLogToNotion({ subject: '국어' });
                }, 2000);
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
            ${activePassage.fullText.replace(/\n/g, '<br>')}
        </div>
        <div class="chat-box" id="sentenceChatBox" style="height:250px;"></div>
        <div class="interactive-input-group">
            <input type="text" class="text-input-field" id="sentenceInput" placeholder="여기에 생각을 입력하세요!" onkeypress="if(event.key==='Enter') processSentenceInput()">
            <button class="quiz-button" onclick="processSentenceInput()">전송</button>
        </div>
    `;
    
    if (sentenceHistory.length === 0) {
        const initialMsg = `안녕! 방금 읽은 <strong>[${activePassage.title}]</strong> 이야기에 대해 나랑 이야기해볼까? 어떤 생각이 들었어? ✨`;
        appendSentenceMsg('ai', initialMsg);
        speakFairyTTS(`안녕! 방금 읽은 ${activePassage.title} 이야기에 대해 나랑 이야기해볼까?`);
    } else {
        sentenceHistory.forEach(h => appendSentenceMsg(h.role === 'user' ? 'user' : 'ai', h.content.replace(/\n/g, '<br>')));
    }
};

// --------------------------------------------------------
// 4. 정밀 독해 멀티버스방
// --------------------------------------------------------
function renderReadingLobby(container) {
    let buttonsHtml = readingFetchedBooks.map(book => 
        `<button class="quiz-choice-btn" style="margin-bottom: 10px; width: 100%; text-align: left;" onclick="startReadingMission('${book.id}')">
            📖 [${book.title}] 미션 시작하기
        </button>`
    ).join('');

    container.innerHTML = `
        <div class="quiz-card">
            <h3 style="color:var(--mint); margin-bottom:20px;">아빠가 준비한 오늘의 독해 미션입니다. 원하는 지문을 선택하세요!</h3>
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
    
    if (readingStage === 0) {
        // 문단 순서 맞추기 (실시간 분할 로직 적용)
        const rawParagraphs = activePassage.fullText.split('\n').filter(p => p.trim() !== '');
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
                speakFairyTTS("정확해요! 문단 순서를 완벽하게 맞췄어요!");
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
                <h3 style="color:var(--purple); margin-bottom:15px;">🧩 미션 1: 문단의 올바른 순서를 완성하라!</h3>
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
            if (ans === conj.answer) {
                speakFairyTTS("정답이에요! " + conj.commentary);
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
                <h3 style="color:var(--orange); margin-bottom:15px;">🔗 미션 2: 끊어진 연결 고리를 복구하라! (${readingConjunctionIndex+1}/${activePassage.conjunctions.length})</h3>
                <div class="passage-box">
                    ${conj.sentenceBefore} <br><br>
                    <span class="blank-indicator">[ ? ]</span> <br><br>
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
                speakFairyTTS("정답이에요! 핵심을 정확히 짚어냈네요!");
                readingStage++;
                setTimeout(renderReadingStage, 2000);
            } else {
                speakFairyTTS("아니에요. 글쓴이가 진짜 하고 싶은 말이 무엇일지 다시 생각해보세요.");
            }
        };

        container.innerHTML = `
            <div class="quiz-card">
                <h3 style="color:var(--pink); margin-bottom:15px;">🎯 미션 3: 핵심 주제를 찾아라!</h3>
                <div class="quiz-descr">${quiz.question}</div>
                <div style="display:flex; flex-direction:column; gap:10px;">
                    ${quiz.options.map((opt, i) => `<button class="quiz-choice-btn" style="text-align:left;" onclick="verifyReadingTheme(${i})">${i+1}. ${opt}</button>`).join('')}
                </div>
            </div>
        `;
    } else {
        // 완료 및 보상
        container.innerHTML = `
            <div style="text-align:center; padding: 40px 20px;">
                <div style="font-size:3rem; margin-bottom:15px;">🎉</div>
                <p style="font-size:1.4rem; color:var(--mint); margin-bottom:20px;">독해 미션을 완벽하게 클리어했습니다!</p>
                <button class="back-to-lobby-btn" style="background:var(--sky); color:white; border:none;" onclick="triggerAwardDispense(10, 'reading'); if (typeof sendStudyLogToNotion === 'function') sendStudyLogToNotion({ subject: '국어' }); closeMissionView();">🎁 보상 받고 나가기</button>
            </div>
        `;
    }
};

// ========================================================
// 🎁 보상 지급 연동 (사회방 로직 이식)
// ========================================================
window.triggerAwardDispense = async function(rewardAmount, type) {
    if (isAdmin) {
        alert(`[관리자 모드] ${rewardAmount}개의 보상 지급이 시뮬레이션 되었습니다.`);
        return;
    }
    
    // 일일 제한 100개 룰 적용
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
        // 국어방은 '국어' 과목 경험치도 같이 올려주기 위해 customExp 파라미터 전달
        await grantRewardAndShowUI(actualReward, false, '국어');
    }
};
