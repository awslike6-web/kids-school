// kids/core/fairy-engine.js
// 🧚‍♀️ 아나운서 요정 코코의 음성 합성(TTS) 제어 인공지능 엔진 (모바일 언락 가드 완벽 탑재)

let currentUtterance = null;
let pendingSpeech = null; // 사용자의 첫 상호작용 전까지 낭독 요청을 대기시키는 포켓
let isSpeechUnlocked = false; // 브라우저 음성 합성 채널 해제 여부

function initFairyAudio() {
    console.log(`🧚‍♀️ [요정 엔진] 음성 가드 및 오디오 잠금장치 시동 완료!`);
    
    const unlockSpeechEngine = () => {
        if (isSpeechUnlocked) return;
        
        if (window.speechSynthesis) {
            try {
                const silentUtterance = new SpeechSynthesisUtterance("");
                silentUtterance.volume = 0;
                window.speechSynthesis.speak(silentUtterance);
                isSpeechUnlocked = true;
                console.log("🔊 [요정 코코] 브라우저 음성 채널 잠금해제(Unlocked) 성공!");
                
                if (pendingSpeech) {
                    const { text, onEndCallback } = pendingSpeech;
                    pendingSpeech = null;
                    speakFairyTTS(text, onEndCallback);
                }
            } catch (err) {
                console.log("⚠️ [요정 코코] 음성 엔진 언락 실행 중 조율 지연:", err);
            }
        }
        
        document.removeEventListener('click', unlockSpeechEngine);
        document.removeEventListener('touchstart', unlockSpeechEngine);
        document.removeEventListener('mousedown', unlockSpeechEngine);
    };

    document.addEventListener('click', unlockSpeechEngine);
    document.addEventListener('touchstart', unlockSpeechEngine);
    document.addEventListener('mousedown', unlockSpeechEngine);
}

function speakFairyTTS(text, onEndCallback = null) {
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

    if (!isSpeechUnlocked) {
        console.log("⏳ [TTS 대기] 사용자의 첫 터치/클릭 제스처를 기다리며 낭독을 대기 큐에 보관합니다.");
        pendingSpeech = { text, onEndCallback };
        return;
    }

    window.speechSynthesis.cancel();

    setTimeout(() => {
        try {
            const cleanText = text.replace(/[\\*#_]/g, ''); 
            const utterance = new SpeechSynthesisUtterance(cleanText);
            
            utterance.lang = "ko-KR";
            utterance.rate = 1.05;  
            utterance.pitch = 1.12; 

            const selectVoice = () => {
                const voices = window.speechSynthesis.getVoices();
                let subVoice = voices.find(v => v.lang.includes("ko") && (v.name.includes("Heami") || v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Yuna")));
                if (!subVoice) {
                    subVoice = voices.find(v => v.lang.includes("ko"));
                }
                if (subVoice) {
                    utterance.voice = subVoice;
                }
            };

            selectVoice();
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

function stopFairyTTS() {
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
        currentUtterance = null;
        pendingSpeech = null;
        console.log("🧚 코코가 잠시 목소리를 쉬고 있어요.");
    }
}

// 🌐 브라우저 전역 소켓 결합 바인딩
window.speakFairyTTS = speakFairyTTS;
window.stopFairyTTS = stopFairyTTS;

// 엔진 구동 시점에 자동 시동
initFairyAudio();

// 💡 [엔진 로드 완료 브릿지] 대기실 말상자 글귀 자동 스캔 기능
setTimeout(() => {
    const speakerTextEl = document.getElementById('fairySpeakerText');
    if (speakerTextEl && !window.isFairyGreetingSpoken) {
        const textToSpeak = speakerTextEl.textContent || speakerTextEl.innerText;
        if (textToSpeak && textToSpeak.length > 0) {
            console.log("🧚 [엔진 결합 브릿지] 대기실 글귀 자동 스캔 낭독을 시작합니다!");
            speakFairyTTS(textToSpeak);
            window.isFairyGreetingSpoken = true;
        }
    }
}, 350);
