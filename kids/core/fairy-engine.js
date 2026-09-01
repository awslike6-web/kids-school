// kids/core/fairy-engine.js
// 🧚‍♀️ 아나운서 요정 코코의 음성 제어 인공지능 엔진 (초고음질 Neural MP3 프리셋 + 프리미엄 WebSpeech 보이스 가드 탑재)

var currentUtterance = null;
let pendingSpeech = null; // 사용자의 첫 상호작용 전까지 낭독 요청을 대기시키는 포켓
let isSpeechUnlocked = false; // 브라우저 음성 합성 채널 해제 여부
let fairyPresetAudio = null; // 초고음질 Neural AI 성우 MP3 전용 플레이어

// 🎵 초고음질 Neural AI 성우 MP3 프리셋 매핑 테이블
const FAIRY_PRESET_AUDIOS = {
    // 웰컴 인사
    "welcome_korean": "welcome_korean.mp3",
    "welcome_math_minsu": "welcome_math_minsu.mp3",
    "welcome_math_minseo": "welcome_math_minseo.mp3",
    "welcome_society": "welcome_society.mp3",
    "welcome_science": "welcome_science.mp3",
    "welcome_english": "welcome_english.mp3",

    // 칭찬 & 정답
    "정답이에요! 아주 훌륭해요!": "praise_correct_1.mp3",
    "정답이에요! 아주 훌륭해요": "praise_correct_1.mp3",
    "정답이에요! 훌륭해요!": "praise_correct_1.mp3",
    "정답이에요! 훌륭해요": "praise_correct_1.mp3",
    "우와, 정말 완벽하게 맞췄어요! 최고예요!": "praise_correct_2.mp3",
    "우와, 정말 완벽하게 맞췄어요!": "praise_correct_2.mp3",
    "참 잘했어요!": "praise_correct_3.mp3",
    "참 잘했어요": "praise_correct_3.mp3",

    // 오답 & 격려
    "아쉽지만 틀렸어요. 다시 한번 생각해볼까요?": "cheer_incorrect_1.mp3",
    "아쉽지만 틀렸어요. 다시 한번 생각해볼까요": "cheer_incorrect_1.mp3",
    "아쉽지만 틀렸어요!": "cheer_incorrect_1.mp3",
    "아쉽지만 틀렸어요": "cheer_incorrect_1.mp3",
    "괜찮아요! 다시 한번 차근차근 도전해봐요!": "cheer_incorrect_2.mp3",
    "다시 한번 생각해봐요.": "cheer_incorrect_1.mp3",
    "다시 한번 생각해봐요": "cheer_incorrect_1.mp3",
    "아니에요. 다시 한번 읽어볼까요?": "cheer_incorrect_1.mp3",
    "아니에요. 다시 한번 읽어볼까요": "cheer_incorrect_1.mp3",

    // TTS 켜짐 알림
    "요정 코코의 나긋나긋한 음성 서비스가 켜졌습니다.": "tts_enabled.mp3"
};

function getFairyAudioBasePath() {
    const path = window.location.pathname;
    if (path.includes('/subjects/')) {
        return '../../assets/audio/fairy/';
    } else if (path.includes('/kids/')) {
        return './assets/audio/fairy/';
    }
    return '../../assets/audio/fairy/';
}

function playFairyPresetAudio(mp3FileName, onEndCallback = null) {
    if (!fairyPresetAudio) {
        fairyPresetAudio = new Audio();
    }
    try {
        fairyPresetAudio.pause();
        fairyPresetAudio.src = getFairyAudioBasePath() + mp3FileName;
        fairyPresetAudio.onended = () => {
            if (onEndCallback) onEndCallback();
        };
        fairyPresetAudio.onerror = () => {
            if (onEndCallback) onEndCallback();
        };
        fairyPresetAudio.play().catch(err => {
            console.warn("요정 프리셋 MP3 재생 실패, TTS 폴백:", err);
            if (onEndCallback) onEndCallback();
        });
    } catch (e) {
        console.warn("오디오 플레이어 예외:", e);
        if (onEndCallback) onEndCallback();
    }
}

/**
 * 🎙️ 브라우저 내 최고 음질 한국어 보이스 우선순위 탐색기
 */
function getBestKoreanVoice() {
    if (!window.speechSynthesis) return null;
    const voices = window.speechSynthesis.getVoices() || [];
    const koVoices = voices.filter(v => v.lang && (v.lang === 'ko-KR' || v.lang === 'ko_KR' || v.lang.startsWith('ko') || v.lang.includes('KO')));
    
    if (koVoices.length === 0) return null;

    // 1순위: Microsoft Edge / Windows 고품질 온라인 자연스러운 음성 (SunHi, InJoon, Natural, Online, Neural)
    let best = koVoices.find(v => (v.name.includes('Natural') || v.name.includes('Online') || v.name.includes('SunHi') || v.name.includes('Neural') || v.name.includes('InJoon')) && !v.name.includes('Heami'));
    if (best) return best;

    // 2순위: Google Chrome 프리미엄 한국어 음성
    best = koVoices.find(v => v.name.includes('Google') || v.name.includes('한국어') || v.name.includes('Korean'));
    if (best) return best;

    // 3순위: 모바일/삼성/애플 고품질 음성 (Yuna, Sora, Seoyeon, Apple)
    best = koVoices.find(v => v.name.includes('Yuna') || v.name.includes('Sora') || v.name.includes('Seoyeon'));
    if (best) return best;

    // 4순위: 기타 한국어 음성 (Heami 등 기본 레거시 음성)
    return koVoices[0];
}

function initFairyAudio() {
    console.log(`🧚‍♀️ [요정 엔진] 초고음질 음성 가드 및 오디오 시스템 시동 완료!`);
    
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

    // ⚡ [맞춤/틀림/피드백 발화 간결화 가드: 최대 1~2문장, 60자 이내로 콤팩트 유지]
    if (cleaned.length > 55 && (cleaned.includes('정답') || cleaned.includes('틀렸') || cleaned.includes('아쉽') || cleaned.includes('잘했') || cleaned.includes('훌륭') || cleaned.includes('맞췄'))) {
        const sentences = cleaned.split(/(?<=[.!?])\s+/);
        if (sentences.length > 1) {
            cleaned = sentences[0];
        }
        if (cleaned.length > 55) {
            cleaned = cleaned.slice(0, 52) + '...';
        }
    }

    return { text: cleaned, isQuestion };
}

function speakFairyTTS(text, onEndCallback = null) {
    const isTtsEnabled = localStorage.getItem('fairy_tts_enabled') !== 'false';
    if (!isTtsEnabled) {
        console.log("🔊 [TTS 우회] 코코 음성 설정이 OFF 상태이므로 낭독을 생략합니다.");
        if (onEndCallback) onEndCallback();
        return;
    }

    // 1. 🎵 초고음질 Neural AI 성우 MP3 프리셋 매칭 확인
    const trimmed = String(text || '').trim();
    if (FAIRY_PRESET_AUDIOS[trimmed]) {
        console.log(`🎙️ [요정 엔진] 초고음질 Neural 성우 MP3 프리셋 재생: ${FAIRY_PRESET_AUDIOS[trimmed]}`);
        playFairyPresetAudio(FAIRY_PRESET_AUDIOS[trimmed], onEndCallback);
        return;
    }

    // 웰컴 프리셋 키 매칭 (ex: "welcome_korean", "welcome_math_minsu")
    for (const [key, filename] of Object.entries(FAIRY_PRESET_AUDIOS)) {
        if (trimmed === key || trimmed.startsWith(key)) {
            console.log(`🎙️ [요정 엔진] 웰컴 성우 MP3 프리셋 재생: ${filename}`);
            playFairyPresetAudio(filename, onEndCallback);
            return;
        }
    }

    // 2. 🗣️ 실시간 동적 텍스트는 최고 품질 WebSpeech 보이스로 낭독
    if (!window.speechSynthesis) {
        console.warn("이 브라우저는 음성 합성을 지원하지 않아요.");
        if (onEndCallback) onEndCallback();
        return;
    }

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

            const bestVoice = getBestKoreanVoice();
            if (bestVoice) {
                utterance.voice = bestVoice;
            }

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
    if (fairyPresetAudio) {
        try { fairyPresetAudio.pause(); } catch (e) {}
    }
    if (window.speechSynthesis) {
        try { window.speechSynthesis.cancel(); } catch (e) {}
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
window.playFairyPresetAudio = playFairyPresetAudio;
window.getBestKoreanVoice = getBestKoreanVoice;
window.stopFairyTTS = stopFairyTTS;
window.unlockFairySpeechEngine = unlockFairySpeechEngine;
window.toggleFairyTtsSetting = toggleFairyTtsSetting;
window.updateTtsToggleUi = updateTtsToggleUi;

// 엔진 구동 시점에 자동 시동
initFairyAudio();
