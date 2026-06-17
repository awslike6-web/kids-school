// kids-school/kids/core/fairy-chatbot.js
// 🧚‍♀️ 아나운서 요정 코코의 음성 합성(TTS) 및 대화 제어 인공지능 엔진 (깃허브 배포 완벽 지원 + 모바일 언락 가드 탑재)

let currentUtterance = null;
let pendingSpeech = null; // 사용자의 첫 상호작용 전까지 낭독 요청을 대기시키는 포켓
let isSpeechUnlocked = false; // 브라우저 음성 합성 채널 해제 여부

function initFairyChat(mode) {
    console.log(`🧚‍♀️ [요정 엔진] ${mode} 모드로 요정 코코 시동 완료!`);
    
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
window.initFairyChat = initFairyChat;

// 엔진 구동 시점에 자동 시동
initFairyChat("KOREAN");

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
