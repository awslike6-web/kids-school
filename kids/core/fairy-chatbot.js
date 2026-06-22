// kids/core/fairy-chatbot.js
// 🤖 요정 챗봇 코어 엔진 (전 과목 공용 UI 및 대화 처리 + AI 기억 연동)

if (typeof window.fairyHistory === 'undefined') {
    window.fairyHistory = [];
}
window.currentFairySubject = window.currentFairySubject || "KOREAN";
window.currentFairyRoomType = window.currentFairyRoomType || "공부방";

async function initFairyChat(subject, roomType = '공부방') {
    window.currentFairySubject = subject;
    window.currentFairyRoomType = roomType;
    window.fairyHistory = [];

    if (typeof initChatMemorySession === 'function') {
        await initChatMemorySession(roomType);
    }
    
    let config = {
        name: "요정 코코",
        greeting: "반가워! 나랑 같이 재미있게 탐험하자! 🧚",
        systemPrompt: ""
    };

    if (typeof FAIRY_CONFIG !== 'undefined') {
        if (FAIRY_CONFIG[subject]) {
            config = {
                name: FAIRY_CONFIG[subject].name || "요정 코코",
                greeting: FAIRY_CONFIG[subject].greeting || (FAIRY_CONFIG.greetings ? (localStorage.getItem('currentUser') === 'daughter' ? FAIRY_CONFIG.greetings.minseo : FAIRY_CONFIG.greetings.minsu) : "안녕!"),
                systemPrompt: FAIRY_CONFIG[subject].systemPrompt || ""
            };
        } else if (FAIRY_CONFIG.name) {
            config = {
                name: FAIRY_CONFIG.name,
                greeting: FAIRY_CONFIG.greetings ? (localStorage.getItem('currentUser') === 'daughter' ? FAIRY_CONFIG.greetings.minseo : FAIRY_CONFIG.greetings.minsu) : "안녕!",
                systemPrompt: ""
            };
        }
    }

    if (roomType === '로비') {
        const childName = typeof getActiveChildName === 'function'
            ? getActiveChildName()
            : (localStorage.getItem('currentUser') === 'daughter' ? '민서' : '민수');
        if (childName === '민서') {
            config.name = "동생 코코 🧚";
            config.greeting = "언니! 나 코코야! 오늘 하루 어땠어? 나한테 재밌는 얘기 들려줘! ✨";
        }
    }

    const existingWidget = document.getElementById('fairy-widget');
    if (existingWidget) existingWidget.remove();

    const fairyUI = `
        <div id="fairy-widget" style="position: fixed; bottom: 20px; right: 20px; z-index: 10000; font-family: 'Malgun Gothic', Arial, sans-serif;">
            <button id="fairy-toggle-btn" onclick="toggleFairyWindow()" style="width: 55px; height: 55px; border-radius: 50%; background: #ab47bc; border: 3px solid #fff; box-shadow: 0 4px 10px rgba(0,0,0,0.3); font-size: 1.6rem; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: transform 0.2s;">
                🧚
            </button>
            
            <div id="fairy-chat-panel" style="display: none; position: absolute; bottom: 70px; right: 0; width: 320px; height: 450px; background: #161b22; border: 2px solid #30363d; border-radius: 15px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); flex-direction: column; overflow: hidden; text-align: left;">
                <div style="background: #ab47bc; padding: 10px; color: white; font-weight: bold; text-align: center; font-size: 1rem; display: flex; justify-content: space-between; align-items: center;">
                    <span style="flex:1; text-align:center;">${config.name}</span>
                    <button onclick="toggleFairyWindow()" style="background:none; border:none; color:white; font-size:1.2rem; cursor:pointer;">✖</button>
                </div>
                <div id="fairy-messages" style="flex: 1; padding: 12px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; background: #0d1117;">
                    <div style="background: #21262d; border-left: 4px solid #ab47bc; color: #c9d1d9; padding: 8px; border-radius: 8px; font-size: 0.85rem; align-self: flex-start; max-width: 85%;">
                        ${config.greeting}
                    </div>
                </div>
                <div style="padding: 8px; background: #161b22; border-top: 1px solid #30363d; display: flex; gap: 6px; align-items: center;">
                    <button id="fairy-mic-btn" onclick="startFairyVoiceInput()" style="background: #ab47bc; color: white; border: none; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 1rem; transition: transform 0.2s;" title="마이크로 말하기">
                        🎙️
                    </button>
                    <input type="text" id="fairy-input" placeholder="요정에게 말하기..." style="flex: 1; padding: 8px; border-radius: 5px; border: 1px solid #30363d; background: #0d1117; color: #c9d1d9; font-size: 0.85rem;" onkeypress="if(event.key === 'Enter') sendToFairy()">
                    <button onclick="sendToFairy()" style="background: #ab47bc; color: white; border: none; padding: 8px 12px; border-radius: 5px; font-weight: bold; cursor: pointer; font-size: 0.85rem;">전송</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', fairyUI);
}
window.initFairyChat = initFairyChat;

function startFairyVoiceInput() {
    const micBtn = document.getElementById('fairy-mic-btn');
    const inputEl = document.getElementById('fairy-input');
    
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
        alert("현재 브라우저에서는 마이크 기능이 지원되지 않아요. (크롬 브라우저를 사용해주세요!)");
        return;
    }

    const recognition = new Recognition();
    recognition.lang = 'ko-KR';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = function() {
        micBtn.innerText = "👂";
        micBtn.style.transform = "scale(1.1)";
        micBtn.style.backgroundColor = "#e53e3e";
        inputEl.placeholder = "듣고 있어요...";
    };
    
    recognition.onresult = function(event) {
        const rawText = event.results[0][0].transcript;
        inputEl.value = rawText;
        sendToFairy();
    };
    
    recognition.onend = function() {
        micBtn.innerText = "🎙️";
        micBtn.style.transform = "scale(1)";
        micBtn.style.backgroundColor = "#ab47bc";
        inputEl.placeholder = "요정에게 말하기...";
    };
    
    recognition.onerror = function(event) {
        console.error("음성 인식 오류:", event.error);
        micBtn.innerText = "🎙️";
        micBtn.style.backgroundColor = "#ab47bc";
        inputEl.placeholder = "요정에게 말하기...";
    };
    
    recognition.start();
}
window.startFairyVoiceInput = startFairyVoiceInput;

function toggleFairyWindow() {
    const panel = document.getElementById('fairy-chat-panel');
    if (!panel) return;
    const isOpen = panel.style.display !== 'none';
    panel.style.display = isOpen ? 'none' : 'flex';
    if (isOpen && typeof finalizeChatMemorySession === 'function') {
        finalizeChatMemorySession();
    }
}
window.toggleFairyWindow = toggleFairyWindow;

async function sendToFairy() {
    const inputEl = document.getElementById('fairy-input');
    if (!inputEl) return;
    const text = inputEl.value.trim();
    if (!text) return;

    if (window.learningSession) {
        window.learningSession.fairyClickCount = (window.learningSession.fairyClickCount || 0) + 1;
    }

    appendFairyMsg('user', text);
    inputEl.value = '';

    if (typeof trackChatMemoryUserMessage === 'function') {
        trackChatMemoryUserMessage(text);
    }
    
    let extraPrompt = "";
    if (typeof FAIRY_CONFIG !== 'undefined' && FAIRY_CONFIG[window.currentFairySubject]) {
        extraPrompt = FAIRY_CONFIG[window.currentFairySubject].systemPrompt || "";
    }

    const fullSystemPrompt = typeof buildFullAISystemPrompt === 'function'
        ? buildFullAISystemPrompt(window.currentFairyRoomType || '공부방', extraPrompt)
        : (extraPrompt || "친절하고 다정한 초등 홈스쿨링 말동무 인공지능 요정");

    const WORKER_PROXY_URL = typeof PROXY_URL !== 'undefined' ? PROXY_URL : "https://minmin-notion.awslike6.workers.dev";

    if (window.fairyHistory.length === 0) {
        window.fairyHistory.push({ role: "model", parts: [{ text: "안녕!" }] });
    }
    window.fairyHistory.push({ role: "user", parts: [{ text: text }] });

    try {
        const response = await fetch(`${WORKER_PROXY_URL}/v1/gemini`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                system_instruction: { parts: [{ text: fullSystemPrompt }] },
                contents: window.fairyHistory,
                generationConfig: { temperature: 0.7 }
            })
        });

        const data = await response.json();
        const aiResponse = data.candidates[0].content.parts[0].text;
        
        window.fairyHistory.push({ role: "model", parts: [{ text: aiResponse }] });

        if (typeof trackChatMemoryAssistantMessage === 'function') {
            trackChatMemoryAssistantMessage(aiResponse);
        }

        appendFairyMsg('fairy', aiResponse);
        
        if (typeof window.speakFairyTTS === 'function') {
            window.speakFairyTTS(aiResponse);
        }
    } catch (error) {
        appendFairyMsg('fairy', "앗! 요정 세계와 통신이 끊어졌어! 다시 말해줄래?");
    }
}
window.sendToFairy = sendToFairy;

function appendFairyMsg(sender, text) {
    const msgDiv = document.createElement('div');
    msgDiv.style.padding = '8px';
    msgDiv.style.borderRadius = '8px';
    msgDiv.style.fontSize = '0.85rem';
    msgDiv.style.maxWidth = '85%';
    msgDiv.style.lineHeight = '1.4';
    msgDiv.style.wordBreak = 'break-all';

    if (sender === 'user') {
        msgDiv.style.background = '#1f6feb';
        msgDiv.style.color = '#fff';
        msgDiv.style.alignSelf = 'flex-end';
    } else {
        msgDiv.style.background = '#21262d';
        msgDiv.style.borderLeft = '4px solid #ab47bc';
        msgDiv.style.color = '#c9d1d9';
        msgDiv.style.alignSelf = 'flex-start';
    }
    msgDiv.innerText = text;
    
    const box = document.getElementById('fairy-messages');
    if (box) {
        box.appendChild(msgDiv);
        box.scrollTop = box.scrollHeight;
    }
}
window.appendFairyMsg = appendFairyMsg;
