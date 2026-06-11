// ⚙️ 국어 멀티버스 코어 운영 엔진 (도서 추천 엔진 탑재 최종 버전)
const WORKER_PROXY_URL = "https://minmin-notion.awslike6.workers.dev";

// 🚨 아버님이 새로 만드실 [아빠 도서관 DB]의 ID를 꼭 여기에 넣어주세요!
const LIBRARY_DB_ID = "37ca27115b688023a7d2cc5b3ff51fee"; 

let currentStage = 0;       
let activePassage = null;   // 👈 초기에는 비워둡니다. 노션 스캔 후 화물이 채워집니다.
let chosenLesson = "";      
let conversationHistory = []; 
let userOrderTracking = []; // 퍼즐 순서 추적용 배낭

// 🎯 화면 로드 시 자동 구동 트리거
function initKoreanUniverse() {
    // 냅다 화면부터 그리지 않고, 아빠 도서관으로 퀵보이를 보냅니다!
    fetchRecommendedBook();
}

// 📡 [초고속 추천 엔진] 노션에서 바코드(ID)만 살짝 긁어오는 함수
async function fetchRecommendedBook() {
    const indicator = document.getElementById('stage-indicator');
    indicator.innerText = "📡 아빠 도서관에서 오늘의 추천 도서 스캔 중... ⏳";

    try {
        // 노션에 "추천 여부에 체크(true)된 것만 딱 1개 줘!" 하고 요청
        const response = await fetch(`${WORKER_PROXY_URL}/v1/databases/${LIBRARY_DB_ID}/query`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                filter: {
                    property: "추천 여부",
                    checkbox: { equals: true }
                },
                page_size: 1 // 바코드 딱 하나만 가져와서 로딩 극대화!
            })
        });

        const data = await response.json();
        
        if (!data.results || data.results.length === 0) {
            throw new Error("오늘의 추천 도서가 없습니다! 노션에서 체크박스를 켜주세요.");
        }

        // 노션에서 읽어온 가벼운 바코드 (예: "book_01")
        const bookBarcode = data.results[0].properties["도서 키(ID)"]?.rich_text[0]?.plain_text;
        console.log("📚 노션 바코드 스캔 완료:", bookBarcode);

        // 🚛 로컬 창고(KOREAN_READING_DATABASE)에서 바코드와 일치하는 무거운 화물 꺼내기!
        // (이 데이터는 korean-reading-data.js 에서 가져옵니다)
        activePassage = KOREAN_READING_DATABASE.find(book => book.id === bookBarcode);

        if (!activePassage) {
            throw new Error(`로컬 창고에 바코드 [${bookBarcode}]와 일치하는 지문 데이터가 없습니다.`);
        }

        // 화물 적재가 완료되었으니, 본격적으로 게임 스테이지 렌더링 시작!
        renderStage();

    } catch (error) {
        console.error("추천 엔진 스캔 실패:", error);
        indicator.innerHTML = `<span style="color: var(--danger-red);">⚠️ 엔진 오류: ${error.message}</span>`;
    }
}

// ----------------------------------------------------
// 🎮 여기서부터는 게임 화면을 그리고 정답을 체크하는 로직입니다.
// ----------------------------------------------------
function renderStage() {
    const zone = document.getElementById('game-zone');
    zone.innerHTML = '';
    
    document.getElementById('stage-indicator').innerText = `현재 미션 단계: ${currentStage + 1} / 5`;

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
        const conj = activePassage.conjunction;
        let optionsHtml = conj.options.map(opt => `<button class="opt-btn" onclick="verifyConjunction('${opt}')">${opt}</button>`).join('');
        zone.innerHTML = `
            <h3>💎 미션 2: 빈칸에 맞는 연결 마법 보석을 끼워라!</h3>
            <div class="passage-box">
                "${conj.sentenceBefore} <span class="blank-indicator">[ ? ]</span> ${conj.sentenceAfter}"
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
            <div class="chat-input-area">
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
        // 🌟 오답 발생 시 관제탑 오답 가방(wrongNotes)에 담기
        wrongNotes.push(`[Stage 1 오답] 문단 순서 틀림`);
        userOrderTracking = [];
        renderStage();
    }
}

function verifyConjunction(selected) {
    if (selected === activePassage.conjunction.answer) {
        alert(`🎉 정답! ${activePassage.conjunction.commentary}`);
        currentStage++;
        renderStage();
    } else {
        alert("❌ 틀렸습니다. 보석의 마력이 어긋났습니다. 다른 접속사를 고르세요.");
        wrongNotes.push(`[Stage 2 오답] 접속사 오류: ${selected}`);
    }
}

function verifyThemeQuiz(idx) {
    if (idx === activePassage.themeQuiz.answerIndex) {
        alert(`🎉 정답! ${activePassage.themeQuiz.commentary}`);
        currentStage++;
        renderStage();
    } else {
        alert("❌ 핵심 코드와 일치하지 않는 가치관입니다. 다시 생각해 보세요.");
        wrongNotes.push(`[Stage 3 오답] 주제 틀림 (${idx + 1}번 선택)`);
    }
}

function selectLessonCard(card) {
    chosenLesson = card;
    alert(`✉️ 카드 선택 완료!\n"${card}"`);
    currentStage++;
    renderStage();
}

function initChatbot() {
    const welcome = "반갑다. 나는 이 구역의 독해 마스터 엔진 검사관이다. 네가 선택한 카드 외에, 지문을 통해 깨달은 네 생각을 직접 한 문장 이상으로 정교하게 입력해 보아라. 대충 쓰거나 자음 난사는 통하지 않는다.";
    appendChatMessage('ai', welcome);
}

async function processUserStatement() {
    const inputEl = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const text = inputEl.value.trim();
    if (!text) return;

    if (/^[ㄱ-ㅎ\s]+$/.test(text.replace(/[^ㄱ-ㅎ]/g, ''))) {
        const warning = "경고: 무의미한 자음 노이즈가 발생했다. 온전한 어휘로 문장을 구성하라.";
        appendChatMessage('user', text);
        appendChatMessage('ai', warning);
        inputEl.value = '';
        return;
    }

    appendChatMessage('user', text);
    inputEl.value = '';
    sendBtn.disabled = true;

    conversationHistory.push({ role: "user", parts: [{ text: text }] });

    try {
        const response = await fetch(`${WORKER_PROXY_URL}/v1/gemini`, {
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
            document.getElementById('exit-gate').style.display = 'block';
            document.getElementById('exit-gate').scrollIntoView({ behavior: 'smooth' });
        }

    } catch (error) {
        console.error("AI 엔진 오류:", error);
        appendChatMessage('ai', `[엔진 에러] ${error.message} (정비팀의 설정을 확인하세요)`);
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

// 🌟 최종 탈출 및 마감 연동 (공용 관제탑 호출)
function triggerFinalExit() {
    // 아이가 선택한 교훈 카드를 관제탑이 가져갈 수 있도록 오답 가방 맨 앞에 넣어둡니다.
    wrongNotes.unshift(`[선택한 카드]: ${chosenLesson}`);
    
    // 공용 관제탑의 exitRoom 함수를 호출하여 노션 일지에 찍고 허브로 나갑니다!
    exitRoom("국어(정밀독해)");
}
