// kids/core/fairy-engine.js
// 🧚‍♀️ 아나운서 요정 코코의 음성 합성(TTS) 제어 인공지능 엔진 (모바일 언락 가드 완벽 탑재)

var currentUtterance = null;
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

function unlockFairySpeechEngine() {
    if (isSpeechUnlocked) return true;
    if (!window.speechSynthesis) return false;
    try {
        const silentUtterance = new SpeechSynthesisUtterance('');
        silentUtterance.volume = 0;
        window.speechSynthesis.speak(silentUtterance);
        isSpeechUnlocked = true;
        console.log('🔊 [요정 코코] 음성 채널 수동 잠금해제!');
        return true;
    } catch (err) {
        console.warn('⚠️ [요정 코코] 음성 잠금해제 실패:', err);
        return false;
    }
}


function cleanTextForTTS(rawText) {
    const original = String(rawText || '');
    
    // 1. 의문문 판별 (물음표 기호가 있거나 한국어 의문 종결어미인 경우)
    const isQuestion = original.includes('?') || /(까|니|나|죠|어|요|체|니\?|까\?|나\?|죠\?|요\?)\s*$/g.test(original.trim());

    let cleaned = original
        // 마크다운 및 불필요한 태그 제거
        .replace(/[\*#_`]/g, '')
        // 광범위 유니코드 이모지 전수 제거
        .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2300}-\u{23FF}\u{2B50}\u{200D}\u{FE0F}]/gu, '')
        // 뿅, 짜잔, 뾰로롱, 두둥 등 불필요한 의성어/추임새 제거
        .replace(/(뿅|뾰로롱|짜잔|두둥|얍|슝|쿵)[!\?~^]*\s*/g, '')
        // 특수기호가 "물음표", "느낌표", "별표" 등으로 낭독되는 현상 방지: 특수문자 전면 제거
        .replace(/[\?!~\^@#\$%\&\*\(\)\[\]\{\}<>_\+=/\\|'";:·…•\-\—]/g, ' ')
        // 연속 공백 및 쉼표 정돈
        .replace(/\s+/g, ' ')
        .trim();

    return { text: cleaned, isQuestion };
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

    // 💡 사용자가 버튼을 클릭하거나 직접 호출했을 때는 즉시 언락 처리
    isSpeechUnlocked = true;

    try {
        if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
        }
        window.speechSynthesis.cancel();
    } catch (e) {}

    const { text: cleanText, isQuestion } = cleanTextForTTS(text);
    if (!cleanText) {
        if (onEndCallback) onEndCallback();
        return;
    }

    const runSpeak = () => {
        try {
            const utterance = new SpeechSynthesisUtterance(cleanText);
            utterance.lang = 'ko-KR';
            utterance.rate = isQuestion ? 1.0 : 1.05;
            utterance.pitch = isQuestion ? 1.22 : 1.06;

            const voices = window.speechSynthesis.getVoices() || [];
            let subVoice = voices.find(v => (v.lang === 'ko-KR' || v.lang === 'ko_KR' || v.lang.includes('ko')) && (v.name.includes('Heami') || v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Yuna') || v.name.includes('SunHi')));
            if (!subVoice) {
                subVoice = voices.find(v => v.lang.includes('ko') || v.lang.includes('KO'));
            }
            if (subVoice) utterance.voice = subVoice;

            utterance.onend = () => {
                currentUtterance = null;
                if (onEndCallback) onEndCallback();
            };

            utterance.onerror = (e) => {
                if (e.error !== 'interrupted') console.error('TTS 에러:', e);
                currentUtterance = null;
                if (onEndCallback) onEndCallback();
            };

            currentUtterance = utterance;
            window.speechSynthesis.speak(utterance);
        } catch (err) {
            console.error('🚀 [TTS 엔진 에러]:', err);
            if (onEndCallback) onEndCallback();
        }
    };

    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) {
        window.speechSynthesis.onvoiceschanged = () => {
            window.speechSynthesis.onvoiceschanged = null;
            runSpeak();
        };
        setTimeout(runSpeak, 100);
    } else {
        setTimeout(runSpeak, 30);
    }
}

function stopFairyTTS() {
    if (window.speechSynthesis) {
        try {
            window.speechSynthesis.cancel();
        } catch (e) {}
        currentUtterance = null;
        pendingSpeech = null;
        console.log("🧚 코코가 잠시 목소리를 쉬고 있어요.");
    }
}

function toggleFairyTtsSetting() {
    const isCurrentlyEnabled = localStorage.getItem('fairy_tts_enabled') !== 'false';
    const nextState = !isCurrentlyEnabled;
    localStorage.setItem('fairy_tts_enabled', nextState ? 'true' : 'false');

    updateTtsToggleUi();

    if (!nextState) {
        stopFairyTTS();
    } else {
        unlockFairySpeechEngine();
        setTimeout(() => {
            speakFairyTTS('요정 코코의 나긋나긋한 음성 서비스가 켜졌습니다.');
        }, 100);
    }
}

function updateTtsToggleUi() {
    const isEnabled = localStorage.getItem('fairy_tts_enabled') !== 'false';
    const currentProfileLocal = localStorage.getItem('currentUser') || 'son';

    // 1. 상단 바 버튼(#ttsToggleBtn) 동기화
    const btn = document.getElementById('ttsToggleBtn');
    if (btn) {
        if (isEnabled) {
            btn.innerHTML = '🔊 요정 음성 ON';
            if (currentProfileLocal === 'son') {
                btn.style.borderColor = '#00f2fe';
                btn.style.color = '#00f2fe';
                btn.style.background = 'rgba(14, 10, 31, 0.6)';
            } else {
                btn.style.borderColor = '#ff6b9d';
                btn.style.color = '#ff6b9d';
                btn.style.background = '#ffffff';
            }
        } else {
            btn.innerHTML = '🔇 요정 음성 OFF';
            btn.style.borderColor = '#8b949e';
            btn.style.color = '#8b949e';
            if (currentProfileLocal === 'son') {
                btn.style.background = 'rgba(30,30,40,0.5)';
            } else {
                btn.style.background = '#fafafa';
            }
        }
    }

    // 2. 요정 대화창 내부 헤더 버튼(#fairy-panel-tts-btn) 동기화
    const panelTtsBtn = document.getElementById('fairy-panel-tts-btn');
    if (panelTtsBtn) {
        panelTtsBtn.innerHTML = isEnabled ? '🔊 음성 ON' : '🔇 음성 OFF';
        panelTtsBtn.style.background = isEnabled ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.3)';
        panelTtsBtn.style.color = isEnabled ? '#ffffff' : '#aaaaaa';
    }
}

// 🌐 브라우저 전역 소켓 결합 바인딩 (모든 수학방 및 교과방 호환)
window.speakFairyTTS = speakFairyTTS;
window.fairySpeak = speakFairyTTS;
window.speak = speakFairyTTS;
window.speakFairy = speakFairyTTS;
window.stopFairyTTS = stopFairyTTS;
window.unlockFairySpeechEngine = unlockFairySpeechEngine;
window.toggleFairyTtsSetting = toggleFairyTtsSetting;
window.updateTtsToggleUi = updateTtsToggleUi;

// 엔진 구동 시점에 자동 시동
initFairyAudio();

// 💡 [엔진 로드 완료] 입장 시 자동 낭독은 비활성화 (사용자 요청: 조용한 입장 환경 보장)
// 필요 시 사용자가 직접 버튼을 누르거나 챗봇과 대화할 때만 speakFairyTTS가 동작합니다.
