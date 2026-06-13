// fairy-engine.js
// 🤖 요정 챗봇 코어 엔진 (전 과목 공용)

let fairyHistory = [];
let currentFairySubject = "KOREAN";

function initFairyChat(subject) {
    currentFairySubject = subject;
    const config = FAIRY_CONFIG[subject];
    
    // 1. 화면에 요정 챗봇 UI 강제 주입 (플로팅 팝업 스타일)
    const fairyUI = `
        <div id="fairy-widget" style="position: fixed; bottom: 20px; right: 20px; z-index: 10000; font-family: 'Malgun Gothic', sans-serif;">
            <!-- 요정 동동 버튼 -->
            <button id="fairy-toggle-btn" onclick="toggleFairyWindow()" style="width: 60px; height: 60px; border-radius: 50%; background: #ab47bc; border: 3px solid #fff; box-shadow: 0 4px 10px rgba(0,0,0,0.3); font-size: 1.8rem; cursor: pointer; transition: transform 0.2s;">
                ${config.name.split(' ')[1] || '🧚'}
            </button>
            
            <!-- 채팅창 패널 (초기엔 숨김) -->
            <div id="fairy-chat-panel" style="display: none; position: absolute; bottom: 75px; right: 0; width: 320px; height: 450px; background: #161b22; border: 2px solid #30363d; border-radius: 15px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); flex-direction: column; overflow: hidden;">
                <!-- 헤더 -->
                <div style="background: #ab47bc; padding: 12px; color: white; font-weight: bold; text-align: center; font-size: 1.1rem;">
                    ${config.name}
                </div>
                <!-- 대화 내용 -->
                <div id="fairy-messages" style="flex: 1; padding: 15px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; background: #0d1117;">
                    <div style="background: #21262d; border-left: 4px solid #ab47bc; color: #c9d1d9; padding: 10px; border-radius: 8px; font-size: 0.9rem; align-self: flex-start; max-width: 85%;">
                        ${config.greeting}
                    </div>
                </div>
                <!-- 입력창 -->
                <div style="padding: 10px; background: #161b22; border-top: 1px solid #30363d; display: flex; gap: 8px;">
                    <input type="text" id="fairy-input" placeholder="요정에게 말하기..." style="flex: 1; padding: 8px; border-radius: 5px; border: 1px solid #30363d; background: #0d1117; color: #c9d1d9;" onkeypress="if(event.key === 'Enter') sendToFairy()">
                    <button onclick="sendToFairy()" style="background: #ab47bc; color: white; border: none; padding: 0 15px; border-radius: 5px; font-weight: bold; cursor: pointer;">전송</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', fairyUI);
}

function toggleFairyWindow() {
    const panel = document.getElementById('fairy-chat-panel');
    panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
}

async function sendToFairy() {
    const inputEl = document.getElementById('fairy-input');
    const text = inputEl.value.trim();
    if (!text) return;

    // 📈 핵심: 요정과 대화할 때마다 관제탑 카운트 1씩 증가! (보상 연동용)
    if (window.learningSession) {
        window.learningSession.fairyClickCount = (window.learningSession.fairyClickCount || 0) + 1;
    }

    appendFairyMsg('user', text);
    inputEl.value = '';
    
    const config = FAIRY_CONFIG[currentFairySubject];
    const WORKER_PROXY_URL = typeof PROXY_URL !== 'undefined' ? PROXY_URL : "https://minmin-notion.awslike6.workers.dev";

    if (fairyHistory.length === 0) {
        fairyHistory.push({ role: "model", parts: [{ text: config.greeting }] });
    }
    fairyHistory.push({ role: "user", parts: [{ text: text }] });

    try {
        const response = await fetch(`${WORKER_PROXY_URL}/v1/gemini`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                system_instruction: { parts: [{ text: config.systemPrompt }] },
                contents: fairyHistory,
                generationConfig: { temperature: 0.7 }
            })
        });

        const data = await response.json();
        const aiResponse = data.candidates[0].content.parts[0].text;
        
        fairyHistory.push({ role: "model", parts: [{ text: aiResponse }] });
        appendFairyMsg('fairy', aiResponse);
    } catch (error) {
        appendFairyMsg('fairy', "앗! 요정 세계와 통신이 끊어졌어! 다시 말해줄래?");
    }
}

function appendFairyMsg(sender, text) {
    const msgDiv = document.createElement('div');
    msgDiv.style.padding = '10px';
    msgDiv.style.borderRadius = '8px';
    msgDiv.style.fontSize = '0.9rem';
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
    box.appendChild(msgDiv);
    box.scrollTop = box.scrollHeight;
}
