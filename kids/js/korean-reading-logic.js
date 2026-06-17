// ⚙️ 국어 멀티버스 코어 운영 엔진 V4 (수학방 통일: PROXY_URL 단일화 완료)

const LIBRARY_DB_ID = "37ca27115b688023a7d2cc5b3ff51fee"; 

let currentStage = 0;       
let currentConjunctionIndex = 0; 
let activePassage = null;   
let chosenLesson = "";      
let conversationHistory = []; 
let userOrderTracking = []; 
let fetchedBooks = []; 
// 🚨 관제탑과 오답 가방(수레) 완벽 공유!
window.wrongNotes = window.wrongNotes || []; 

// 🎯 엔진 구동 트리거
function initKoreanUniverse() {
    fetchRecommendedBooks();
}

// 📡 [초고속 추천 엔진] 노션에서 체크(true)된 책을 최대 3개까지 스캔
async function fetchRecommendedBooks() {
    const zone = document.getElementById('game-zone');
    document.getElementById('stage-indicator').innerText = "📡 아빠 도서관에서 오늘의 미션 지문들을 스캔 중... ⏳";
    
    try {
        // 💡 [핵심 수정]: 수학방처럼 notion-helper의 PROXY_URL을 직접 사용!
        const response = await fetch(`${PROXY_URL}/v1/databases/${LIBRARY_DB_ID}/query`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                filter: { property: "추천 여부", checkbox: { equals: true } },
                page_size: 3 // 최대 3개까지 가져옵니다!
            })
        });

        const data = await response.json();
        if (!data.results || data.results.length === 0) {
            throw new Error("아빠가 추천해 준 지문이 없습니다! 노션에 체크박스를 켜주세요.");
        }

        fetchedBooks = data.results.map(res => {
            const barcode = res.properties["도서 키(ID)"]?.rich_text[0]?.plain_text;
            return KOREAN_READING_DATABASE.find(book => book.id === barcode);
        }).filter(book => book !== undefined);

        if (fetchedBooks.length === 0) {
            throw new Error(`노션에 체크된 바코드와 일치하는 지문 데이터가 창고에 없습니다.`);
        }

        renderLobby();
    } catch (error) {
        console.error("추천 엔진 스캔 실패:", error);
        document.getElementById('stage-indicator').innerHTML = `<span style="color: var(--danger-red);">⚠️ 엔진 오류: ${error.message}</span>`;
    }
}

// 🏛️ 대기실 로비
function renderLobby() {
    document.getElementById('stage-indicator').innerText = `📚 오늘의 독해 미션 (선택 대기 중)`;
    const zone = document.getElementById('game-zone');
    
    let buttonsHtml = fetchedBooks.map(book => 
        `<button class="action-btn" style="margin: 10px; font-size: 1.2rem;" onclick="startReadingSystem('${book.id}')">
            📖 [${book.title}] 미션 시작하기
        </button>`
    ).join('<br>');

    zone.innerHTML = `
        <h3>아빠가 준비한 오늘의 독해 미션입니다. 원하는 지문을 선택하세요!</h3>
        <div style="text-align: center; margin-top: 30px;">
            ${buttonsHtml}
        </div>
    `;
}

// 🚀 미션 시작!
function startReadingSystem(bookId) {
    activePassage = fetchedBooks.find(b => b.id === bookId);
    currentStage = 0;
    currentConjunctionIndex = 0;
    userOrderTracking = [];
    conversationHistory = [];
    window.wrongNotes = []; // 새 지문 시작 시 보따리 비우기
    renderStage();
}

function renderStage() {
    const zone = document.getElementById('game-zone');
    zone.innerHTML = '';
    document.getElementById('stage-indicator').innerText = `[${activePassage.title}] 미션 단계: ${currentStage + 1} / 5`;

    if (currentStage === 0) {
        zone.innerHTML = `
            <h3>🧩 미션 1: 문단의 올바른 순서를 완성하라!</h3>
            <p class="guide-text">아래 문단 블록들을 올바른 순서대로 차례대로 클릭하세요.</p>
            <div id="puzzle-pool" class="puzzle-pool"></div>
            <div id="puzzle-slots" class="puzzle-slots">선택한 순서: </div>
            <button class="action-btn" onclick="verifyParagraphOrder()">문단 결합 검사하기</button>
        `;
        setupParagraphPuzzle();
    } 
    else if (currentStage === 1) {
        const currentConj = activePassage.conjunctions[currentConjunctionIndex];
        let optionsHtml = currentConj.options.map(opt => `<button class="opt-btn" onclick="verifyConjunction('${opt}')">${opt}</button>`).join('');
        zone.innerHTML = `
            <h3>💎 미션 2: 빈칸에 맞는 연결 마법 보석을 끼워라! (${currentConjunctionIndex + 1}/3)</h3>
            <div class="passage-box">
                "${currentConj.sentenceBefore} <span class="blank-indicator">[ ? ]</span> ${currentConj.sentenceAfter}"
            </div>
            <div class="btn-grid">${optionsHtml}</div>
        `;
    } 
    else if (currentStage === 2) {
        const quiz = activePassage.themeQuiz;
        let optionsHtml = quiz.options.map((opt, idx) => `<button class="opt-btn" onclick="verifyThemeQuiz(${idx})">${opt}</button>`).join('');
        zone.innerHTML = `
            <h3>🧠 미션 3: 이 글의 진정한 주제 코드를 찾아라!</h3>
            <div class="question-text">${quiz.question}</div>
            <div class="btn-grid-vertical">${optionsHtml}</div>
        `;
    } 
    else if (currentStage === 3) {
        let cardsHtml = activePassage.lessonCards.map(card => `<div class="lesson-card" onclick="selectLessonCard('${card}')">${card}</div>`).join('');
        zone.innerHTML = `
            <h3>✉️ 미션 4: 마음에 남는 오늘의 교훈 카드를 선택하세요.</h3>
            <div class="card-stack">${cardsHtml}</div>
        `;
    } 
    else if (currentStage === 4) {
        zone.innerHTML = `
            <h3>🤖 최종 미션: 검사관과의 대화실</h3>
            <div class="chat-box" id="chat-box"></div>
            <div class="chat-input-area" id="chat-input-area">
                <textarea id="user-input" placeholder="이 지문을 읽고 느낀 점이나 생각을 온전한 문장으로 적어보세요..."></textarea>
                <button class="send-btn" id="send-btn" onclick="processUserStatement()">전송</button>
            </div>
            <button class="exit-gate-btn" id="exit-gate" style="display:none;" onclick="triggerFinalExit()">📬 생각 우체통 슝 날리고 방 탈출하기</button>
        `;
        initChatbot();
    }
}

function setupParagraphPuzzle() {
    const pool = document.getElementById('puzzle-pool');
    const shuffled = [...activePassage.paragraphs].sort(() => Math.random() - 0.5);
    shuffled.forEach(p => {
        const block = document.createElement('div');
        block.className = 'puzzle-block';
        block.innerText = `${p.label} ${p.text}`;
        block.onclick = () => {
            if (userOrderTracking.includes(p.id)) return;
            userOrderTracking.push(p.id);
            block.classList.add('selected');
            document.getElementById('puzzle-slots').innerText += ` -> ${p.label}`;
        };
        pool.appendChild(block);
    });
}

function verifyParagraphOrder() {
    const target = activePassage.correctOrder;
    if (JSON.stringify(userOrderTracking) === JSON.stringify(target)) {
        alert("🎉 완벽한 문단 결합입니다! 공간 통로가 열립니다.");
        currentStage++;
        renderStage();
    } else {
        alert("❌ 문단 흐름이 어색합니다. 결합 장치가 초기화됩니다.");
        window.wrongNotes.push(`[Stage 1 오답] 문단 순서 틀림`);
        userOrderTracking = [];
        renderStage();
    }
}

function verifyConjunction(selected) {
    const currentConj = activePassage.conjunctions[currentConjunctionIndex];
    if (selected === currentConj.answer) {
        alert(`🎉 정답! ${currentConj.commentary}`);
        currentConjunctionIndex++;
        if (currentConjunctionIndex >= activePassage.conjunctions.length) currentStage++;
        renderStage();
    } else {
        alert("❌ 틀렸습니다. 보석의 마력이 어긋났습니다. 다시 골라보세요.");
        window.wrongNotes.push(`[Stage 2 오답] ${currentConjunctionIndex + 1}번 접속사 오류: ${selected}`);
    }
}

function verifyThemeQuiz(idx) {
    if (idx === activePassage.themeQuiz.answerIndex) {
        alert(`🎉 정답! ${activePassage.themeQuiz.commentary}`);
        currentStage++;
        renderStage();
    } else {
        alert("❌ 핵심 코드와 일치하지 않는 가치관입니다. 다시 생각해 보세요.");
        window.wrongNotes.push(`[Stage 3 오답] 주제 틀림 (${idx + 1}번 선택)`);
    }
}

function selectLessonCard(card) {
    chosenLesson = card;
    alert(`✉️ 카드 선택 완료!\n"${card}"`);
    currentStage++;
    renderStage();
}

function initChatbot() {
    const saveKey = `korean_save_${activePassage.id}`;
    const savedThought = localStorage.getItem(saveKey);

    if (savedThought) {
        appendChatMessage('ai', "이전에 네가 이 지문을 읽고 훌륭하게 남겨둔 기록이 보존되어 있다. 멋진 생각이구나!");
        appendChatMessage('user', savedThought);
        document.getElementById('chat-input-area').style.display = 'none';
        document.getElementById('exit-gate').style.display = 'block';
    } else {
        appendChatMessage('ai', "반갑다. 나는 독해 마스터 엔진이다. 네가 선택한 카드 외에, 지문을 통해 깨달은 생각을 한 문장 이상으로 정교하게 입력해 보아라.");
    }
}

async function processUserStatement() {
    const inputEl = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const text = inputEl.value.trim();
    if (!text) return;

    appendChatMessage('user', text);
    inputEl.value = '';
    sendBtn.disabled = true;

    conversationHistory.push({ role: "user", parts: [{ text: text }] });

    try {
        // 💡 [핵심 수정]: 수학방처럼 AI 엔진 통신도 PROXY_URL로 통일!
        const response = await fetch(`${PROXY_URL}/v1/gemini`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                system_instruction: {
                    parts: [{ text: `${activePassage.chatbotSystemPrompt}\n[필수규칙]: 아이의 문장 수준이 타당하고 생각이 잘 드러났다면 대답 끝에 반드시 [SUCCESS] 문구를 포함시켜 미션을 클리어시켜라.` }]
                },
                contents: conversationHistory,
                generationConfig: { temperature: 0.6 }
            })
        });

        if (!response.ok) throw new Error(`서버 통신 붕괴 (코드: ${response.status})`);

        const data = await response.json();
        const aiResponse = data.candidates[0].content.parts[0].text;
        
        conversationHistory.push({ role: "model", parts: [{ text: aiResponse }] });
        appendChatMessage('ai', aiResponse);

        if (aiResponse.includes('[SUCCESS]')) {
            localStorage.setItem(`korean_save_${activePassage.id}`, text);
            document.getElementById('exit-gate').style.display = 'block';
            document.getElementById('exit-gate').scrollIntoView({ behavior: 'smooth' });
        }

    } catch (error) {
        console.error("AI 엔진 오류:", error);
        appendChatMessage('ai', `[비상 통신 모드] 삐리릿.. 아빠의 AI 서버가 잠시 점검 중입니다. 하지만 네가 남긴 멋진 생각은 확실히 전달받았습니다! 비상 탈출구를 개방합니다.`);
        document.getElementById('exit-gate').style.display = 'block';
        document.getElementById('exit-gate').scrollIntoView({ behavior: 'smooth' });
    } finally {
        sendBtn.disabled = false;
    }
}

function appendChatMessage(sender, text) {
    const box = document.getElementById('chat-box');
    const div = document.createElement('div');
    div.className = `chat-msg ${sender}`;
    div.innerText = text.replace(/\[SUCCESS\]/g, '').trim();
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
}

// 📬 독해방 엔진 최종 탈출 무대 배선
function triggerFinalExit() {
    console.log("📬 생각 우체통 발사 버튼 감지 완료!");
    
    const lessonText = typeof chosenLesson !== 'undefined' && chosenLesson !== "" ? chosenLesson : "선택 안 함";
    window.wrongNotes.unshift(`[선택한 카드]: ${lessonText}`);
    
    let passageTitle = (activePassage && activePassage.title) ? activePassage.title : "알 수 없는 지문";

    console.log(`📡 국어 관제탑의 exitRoom 함수를 호출합니다!`);
    
    if (typeof exitRoom === 'function') {
        exitRoom(`국어(정밀독해) - ${passageTitle}`);
    } else {
        alert("🚨 오류: 관제탑 연결 실패!");
    }
}
