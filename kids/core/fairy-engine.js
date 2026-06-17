// fairy-engine.js
// 🤖 요정 챗봇 코어 엔진 (전 과목 공용)

let fairyHistory = [];
let currentFairySubject = "KOREAN";

function initFairyChat(subject) {
    currentFairySubject = subject;
    const config = FAIRY_CONFIG[subject];
    
    // 1. 화면에 요정 챗봇 UI 강제 주입 (플로// kids-school/kids/core/fairy-engine.js
// 🧚‍♀️ 아나운서 요정 코코의 음성 합성(TTS) 및 대화 제어 인공지능 엔진 (깃허브 배포 완벽 지원 + 모바일 언락 가드 탑재)

let currentUtterance = null;
let pendingSpeech = null; // 사용자의 첫 상호작용 전까지 낭독 요청을 대기시키는 포켓
let isSpeechUnlocked = false; // 브라우저 음성 합성 채널 해제 여부

function initFairyAudio() {
    console.log(`🧚‍♀️ [요정 엔진] 음성 가드 및 오디오 잠금장치 시동 완료!`);
    
    // 💡 [초미세 안전 기법] 최초 유저 클릭 시 오디오 엔진 전격 잠금해제(Unlock) 설정
    const unlockSpeechEngine = () => {
        if (isSpeechUnlocked) return;
        
        if (window.speechSynthesis) {
            // 빈 음성을 한번 들려주어 브라우저의 오디오 맥을 뻥! 뚫어줍니다.
            try {
                const silentUtterance = new SpeechSynthesisUtterance("");
                // 조용히 목소리만 언락
                silentUtterance.volume = 0;
                window.speechSynthesis.speak(silentUtterance);
                isSpeechUnlocked = true;
                console.log("🔊 [요정 코코] 브라우저 음성 채널 잠금해제(Unlocked) 성공!");
                
                // 대기 중인 요정 음성이 있었다면 즉시 터트립니다!
                if (pendingSpeech) {
                    const { text, onEndCallback } = pendingSpeech;
                    pendingSpeech = null;
                    speakFairyTTS(text, onEndCallback);
                }
            } catch (err) {
                console.log("⚠️ [요정 코코] 음성 엔진 언락 실행 중 조율 지연:", err);
            }
        }
        
        // 이벤트 해제
        document.removeEventListener('click', unlockSpeechEngine);
        document.removeEventListener('touchstart', unlockSpeechEngine);
        document.removeEventListener('mousedown', unlockSpeechEngine);
    };

    document.addEventListener('click', unlockSpeechEngine);
    document.addEventListener('touchstart', unlockSpeechEngine);
    document.addEventListener('mousedown', unlockSpeechEngine);
}

/**
 * 🎙️ 우아한 아나운서 요정 코코의 말하기(TTS) 엔진
 * @param {string} text - 요정이 읽어줄 텍스트
 * @param {function} onEndCallback - 다 읽었을 대 기동할 콜백 함수
 */
function speakFairyTTS(text, onEndCallback = null) {
    // 🧠 요정 음성(TTS) ON/OFF 상태를 localStorage에서 확인하여 우회 처리
    const isTtsEnabled = localStorage.getItem('fairy_tts_enabled') !== 'false';
    if (!isTtsEnabled) {
        console.log("🔊 [TTS 우회] 코코 음성 설정이 OFF 상태이므로 낭독을 생략합니다.");
        if (onEndCallback) onEndCallback();
        return;
    }

    if (!window.speechSynthesis) {
        console.warn("이 브라우저는 음성 합성을 지원하지 않아요.");
        if (onEndCallback) onEndCallback();
        return;
    }

    // 💡 [철벽 가드] 사용자가 클릭을 한 번도 하지 않은 상태에서 speak가 불리면 
    // 브라우저가 강제로 소리를 막아버릴 수 있으므로, 제스처를 취하기 전까지 큐에 고이 모셔둡니다!
    if (!isSpeechUnlocked) {
        console.log("⏳ [TTS 대기] 사용자의 첫 터치/클릭 제스처를 기다리며 낭독을 대기 큐에 보관합니다.");
        pendingSpeech = { text, onEndCallback };
        return;
    }

    // 기존 목소리는 우아하게 차단
    window.speechSynthesis.cancel();

    // 0.15초의 안전 지연(Cooling Delay)을 주어 오디오 자원 충돌과 꼬임을 완벽 소거합니다.
    setTimeout(() => {
        try {
            const cleanText = text.replace(/[\\*#_]/g, ''); // 마크다운 장식 지움
            const utterance = new SpeechSynthesisUtterance(cleanText);
            
            utterance.lang = "ko-KR";
            utterance.rate = 1.05;  // 다정한 아나운서 낭독 속도 (미세한 경쾌함 조율)
            utterance.pitch = 1.12; // 코코의 맑고 귀여운 하이톤

            // 한국어 자연스러운 여성 목소리 찾기 시도
            const selectVoice = () => {
                const voices = window.speechSynthesis.getVoices();
                let subVoice = voices.find(v => v.lang.includes("ko") && (v.name.includes("Heami") || v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Yuna")));
                if (!subVoice) {
                    // 차선책으로 일반 한국어 보이스 선택
                    subVoice = voices.find(v => v.lang.includes("ko"));
                }
                if (subVoice) {
                    utterance.voice = subVoice;
                }
            };

            selectVoice();
            // 크롬의 비동기 음성 갱신 지원용 리스너
            if (window.speechSynthesis.onvoiceschanged !== undefined) {
                window.speechSynthesis.onvoiceschanged = selectVoice;
            }

            utterance.onend = () => {
                console.log("🧚 코코의 낭독 완료!");
                currentUtterance = null;
                if (onEndCallback) onEndCallback();
            };

            utterance.onerror = (e) => {
                if (e.error === 'interrupted') {
                    console.warn("🧚 코코의 TTS가 새로운 음성 명령에 의해 우아하게 양보했습니다.");
                } else {
                    console.error("TTS 에러:", e);
                }
                currentUtterance = null;
                if (onEndCallback) onEndCallback();
            };

            currentUtterance = utterance;
            window.speechSynthesis.speak(utterance);
        } catch (err) {
            console.error("🚀 [TTS 엔진 에러] 오디오 버퍼 조립 누수 감지:", err);
            if (onEndCallback) onEndCallback();
        }
    }, 150);
}

/**
 * 활성화된 코코 목소리 정지
 */
function stopFairyTTS() {
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
        currentUtterance = null;
        pendingSpeech = null; // 대기중인 녀석들도 안전히 폐기
        console.log("🧚 코코가 잠시 목소리를 쉬고 있어요.");
    }
}

// 🌐 브라우저 전역에 강제 소켓 결합 바인딩
window.speakFairyTTS = speakFairyTTS;
window.stopFairyTTS = stopFairyTTS;

// 엔진 구동 시점에 자동 시동
initFairyAudio();

// 💡 [엔진 로드 완료 브릿지] 대기실 웰컴 텍스트 자동 조립 스캐너
setTimeout(() => {
    const speakerTextEl = document.getElementById('fairySpeakerText');
    if (speakerTextEl && !window.isFairyGreetingSpoken) {
        const textToSpeak = speakerTextEl.textContent || speakerTextEl.innerText;
        if (textToSpeak && textToSpeak.length > 0) {
            console.log("🧚 [엔진 결합 안전 브릿지] 로드된 요정 음성 엔진이 대기실 말상자 글귀를 자동 스캔하여 낭독을 시작합니다!");
            speakFairyTTS(textToSpeak);
            window.isFairyGreetingSpoken = true;
        }
    }
}, 350);
팅 팝업 스타일)
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
