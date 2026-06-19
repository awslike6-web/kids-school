// kids/core/fairy-chatbot.js
// 🤖 요정 챗봇 코어 엔진 (전 과목 공용 UI 및 대화 처리)

if (typeof window.fairyHistory === 'undefined') {
    window.fairyHistory = [];
}
window.currentFairySubject = window.currentFairySubject || "KOREAN";

function initFairyChat(subject) {
    window.currentFairySubject = subject;
    
    // 💡 혹시 CONFIG가 아예 구성 안 됐을 상황을 대비한 최상위 방어막
    let config = {
        name: "요정 코코",
        greeting: "반가워! 나랑 같이 재미있게 탐험하자! 🧚",
        systemPrompt: "친절하고 다정한 초등 홈스쿨링 말동무 인공지능 요정"
    };

    if (typeof FAIRY_CONFIG !== 'undefined') {
        if (FAIRY_CONFIG[subject]) {
            config = {
                name: FAIRY_CONFIG[subject].name || "요정 코코",
                greeting: FAIRY_CONFIG[subject].greeting || (FAIRY_CONFIG.greetings ? (localStorage.getItem('currentUser') === 'daughter' ? FAIRY_CONFIG.greetings.minseo : FAIRY_CONFIG.greetings.minsu) : "안녕!"),
                systemPrompt: FAIRY_CONFIG[subject].systemPrompt || "친절하고 다정한 초등 홈스쿨링 말동무 인공지능 요정"
            };
        } else if (FAIRY_CONFIG.name) {
            config = {
                name: FAIRY_CONFIG.name,
                greeting: FAIRY_CONFIG.greetings ? (localStorage.getItem('currentUser') === 'daughter' ? FAIRY_CONFIG.greetings.minseo : FAIRY_CONFIG.greetings.minsu) : "안녕!",
                systemPrompt: "친절하고 다정한 초등 홈스쿨링 말동무 인공지능 요정"
            };
        }
    }

    // 1. 화면에 요정 챗봇 UI 강제 주입 (기존 위젯이 있으면 중복 제거)
    const existingWidget = document.getElementById('fairy-widget');
    if (existingWidget) existingWidget.remove();

    const fairyUI = `
        <div id="fairy-widget" style="position: fixed; bottom: 20px; right: 20px; z-index: 10000; font-family: 'Malgun Gothic', Arial, sans-serif;">
            <button id="fairy-toggle-btn" onclick="toggleFairyWindow()" style="width: 55px; height: 55px; border-radius: 50%; background: #ab47bc; border: 3px solid #fff; box-shadow: 0 4px 10px rgba(0,0,0,0.3); font-size: 1.6rem; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: transform 0.2s;">
                🧚
            </button>
            
            <div id="fairy-chat-panel" style="display: none; position: absolute; bottom: 70px; right: 0; width: 300px; height: 400px; background: #161b22; border: 2px solid #30363d; border-radius: 15px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); flex-direction: column; overflow: hidden; text-align: left;">
                <div style="background: #ab47bc; padding: 10px; color: white; font-weight: bold; text-align: center; font-size: 1rem;">
                    ${config.name}
                </div>
                <div id="fairy-messages" style="flex: 1; padding: 12px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; background: #0d1117;">
                    <div style="background: #21262d; border-left: 4px solid #ab47bc; color: #c9d1d9; padding: 8px; border-radius: 8px; font-size: 0.85rem; align-self: flex-start; max-width: 85%;">
                        ${config.greeting}
                    </div>
                </div>
                <div style="padding: 8px; background: #161b22; border-top: 1px solid #30363d; display: flex; gap: 6px;">
                    <input type="text" id="fairy-input" placeholder="요정에게 말하기..." style="flex: 1; padding: 6px; border-radius: 5px; border: 1px solid #30363d; background: #0d1117; color: #c9d1d9; font-size: 0.85rem;" onkeypress="if(event.key === 'Enter') sendToFairy()">
                    <button onclick="sendToFairy()" style="background: #ab47bc; color: white; border: none; padding: 0 12px; border-radius: 5px; font-weight: bold; cursor: pointer; font-size: 0.85rem;">전송</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', fairyUI);
}
window.initFairyChat = initFairyChat;

function toggleFairyWindow() {
    const panel = document.getElementById('fairy-chat-panel');
    if (!panel) return;
    panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
}
window.toggleFairyWindow = toggleFairyWindow;

async function sendToFairy() {
    const inputEl = document.getElementById('fairy-input');
    if (!inputEl) return;
    const text = inputEl.value.trim();
    if (!text) return;

    // 📈 학습 세션 내 카운터 증가 (보상 연동)
    if (window.learningSession) {
        window.learningSession.fairyClickCount = (window.learningSession.fairyClickCount || 0) + 1;
    }

    appendFairyMsg('user', text);
    inputEl.value = '';
    
    let config = {
        name: "요정 코코",
        greeting: "반가워!",
        systemPrompt: "친절하고 다정한 초등 홈스쿨링 말동무 인공지능 요정"
    };

    if (typeof FAIRY_CONFIG !== 'undefined' && FAIRY_CONFIG[window.currentFairySubject]) {
        config = FAIRY_CONFIG[window.currentFairySubject];
    }

    const WORKER_PROXY_URL = typeof PROXY_URL !== 'undefined' ? PROXY_URL : "https://minmin-notion.awslike6.workers.dev";

    if (window.fairyHistory.length === 0) {
        window.fairyHistory.push({ role: "model", parts: [{ text: config.greeting || "안녕!" }] });
    }
    window.fairyHistory.push({ role: "user", parts: [{ text: text }] });

    try {
        const response = await fetch(`${WORKER_PROXY_URL}/v1/gemini`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                system_instruction: { parts: [{ text: config.systemPrompt || "친절하고 사랑스러운 아나운서 아동 가이딩 멘토 요정" }] },
                contents: window.fairyHistory,
                generationConfig: { temperature: 0.7 }
            })
        });

        const data = await response.json();
        const aiResponse = data.candidates[0].content.parts[0].text;
        
        window.fairyHistory.push({ role: "model", parts: [{ text: aiResponse }] });
        appendFairyMsg('fairy', aiResponse);
        
        // 🎙️ 진짜 코코 음성(TTS) 엔진과 결합 바인딩!
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
