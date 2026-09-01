// 📄 kids/core/fairy-engine.js (초고음질 OpenAI TTS & 요정 코코 오디오 통합 엔진)

// 🎶 실시간 오디오 및 음성 엔진 전역 상태
let currentUtterance = null;
let isSpeechUnlocked = false;
let pendingSpeech = null;
let fairyPresetAudio = null;

// 🎙️ OpenAI TTS 재생 상태 & 오디오 캐시
let currentOpenAiAudio = null;
let currentTtsQueue = [];
let isPlayingTtsQueue = false;
const ttsAudioBlobCache = new Map(); // 짧은 칭찬 멘트 메모리 캐시

// 🎧 Neural AI 성우 MP3 프리셋 데이터베이스
const FAIRY_PRESET_AUDIOS = {
    "welcome_korean": "assets/sounds/welcome_korean.mp3",
    "welcome_math_minsu": "assets/sounds/welcome_math_minsu.mp3",
    "welcome_math_minseo": "assets/sounds/welcome_math_minseo.mp3",
    "welcome_lobby": "assets/sounds/welcome_lobby.mp3",
    "quest_complete": "assets/sounds/quest_complete.mp3"
};

/**
 * 🔑 OpenAI TTS 설정 조회 (APP_CONFIG 및 LocalStorage 동기화)
 */
function getOpenAITtsConfig() {
    let apiKey = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.OPENAI_API_KEY) || '';
    if (!apiKey && typeof localStorage !== 'undefined') {
        apiKey = localStorage.getItem('OPENAI_API_KEY') || '';
    }
    
    let voice = 'nova';
    if (typeof localStorage !== 'undefined' && localStorage.getItem('OPENAI_TTS_VOICE')) {
        voice = localStorage.getItem('OPENAI_TTS_VOICE');
    } else if (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.OPENAI_TTS_VOICE) {
        voice = APP_CONFIG.OPENAI_TTS_VOICE;
    }

    let speed = 1.06;
    if (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.OPENAI_TTS_SPEED) {
        speed = APP_CONFIG.OPENAI_TTS_SPEED;
    }

    return {
        apiKey: apiKey.trim(),
        voice: voice,
        model: (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.OPENAI_TTS_MODEL) || 'tts-1',
        speed: speed
    };
}

/**
 * ✂️ 긴 답변을 실시간 스트리밍 재생을 위해 문장 단위로 분할
 */
function splitTextIntoSentences(text) {
    if (!text) return [];
    // 마침표, 느낌표, 물음표, 줄바꿈 기준으로 분할하되 문장부호 유지
    const rawChunks = text.split(/(?<=[.!?\n])\s+/);
    const sentences = [];

    for (let chunk of rawChunks) {
        const trimmed = chunk.trim();
        if (!trimmed) continue;
        // 너무 짧은 감탄사나 마침표만 있는 경우 앞 문장에 병합
        if (sentences.length > 0 && trimmed.length <= 2) {
            sentences[sentences.length - 1] += ' ' + trimmed;
        } else if (trimmed.length > 120) {
            // 한 문장이 너무 길면 쉼표나 접속사 단위로 2차 분할
            const subChunks = trimmed.split(/(?<=[,])\s+/);
            sentences.push(...subChunks.filter(s => s.trim().length > 0));
        } else {
            sentences.push(trimmed);
        }
    }
    return sentences.length > 0 ? sentences : [text.trim()];
}

/**
 * ⚡ OpenAI TTS API 단일 문장 오디오 가져오기 (Blob URL 반환)
 */
async function fetchOpenAiTtsAudio(sentence, config) {
    const trimmed = sentence.trim();
    if (!trimmed) return null;

    // 캐시 확인
    const cacheKey = `${config.voice}_${config.speed}_${trimmed}`;
    if (ttsAudioBlobCache.has(cacheKey)) {
        return ttsAudioBlobCache.get(cacheKey);
    }

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: config.model || 'tts-1',
            input: trimmed,
            voice: config.voice || 'nova',
            speed: config.speed || 1.06
        })
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`OpenAI TTS API Error (${response.status}): ${errText}`);
    }

    const blob = await response.blob();
    const audioUrl = URL.createObjectURL(blob);

    // 짧은 문장(50자 이하)은 재사용을 위해 캐싱
    if (trimmed.length <= 50) {
        ttsAudioBlobCache.set(cacheKey, audioUrl);
    }

    return audioUrl;
}

/**
 * 🚀 OpenAI TTS 문장 큐잉 & 연속 스트리밍 재생기
 */
async function playOpenAiTtsStream(fullText, onEndCallback = null) {
    const config = getOpenAITtsConfig();
    if (!config.apiKey) {
        throw new Error("OPENAI_API_KEY_NOT_FOUND");
    }

    stopFairyTTS(); // 이전 재생 중단

    const sentences = splitTextIntoSentences(fullText);
    if (sentences.length === 0) {
        if (onEndCallback) onEndCallback();
        return;
    }

    console.log(`🎙️ [OpenAI TTS] 총 ${sentences.length}개 문장 스트리밍 큐 시동 (보이스: ${config.voice})`);
    isPlayingTtsQueue = true;

    // 문장별 오디오 프로미스 프리페치 맵
    const audioPromises = sentences.map(s => fetchOpenAiTtsAudio(s, config));

    let currentIndex = 0;

    const playNext = async () => {
        if (!isPlayingTtsQueue || currentIndex >= sentences.length) {
            isPlayingTtsQueue = false;
            currentOpenAiAudio = null;
            if (onEndCallback) onEndCallback();
            return;
        }

        try {
            // 현재 순서의 오디오 URL 대기
            const audioUrl = await audioPromises[currentIndex];
            if (!isPlayingTtsQueue || !audioUrl) {
                currentIndex++;
                playNext();
                return;
            }

            const audio = new Audio(audioUrl);
            currentOpenAiAudio = audio;

            audio.onended = () => {
                currentIndex++;
                playNext();
            };

            audio.onerror = (e) => {
                console.warn(`[OpenAI TTS] ${currentIndex + 1}번째 문장 재생 오류, 다음 문장으로 진행:`, e);
                currentIndex++;
                playNext();
            };

            await audio.play();
        } catch (err) {
            console.error(`[OpenAI TTS] 문장 스트리밍 도중 오류 발생:`, err);
            currentIndex++;
            playNext();
        }
    };

    // 1번째 문장 즉시 재생 시동
    playNext();
}

/**
 * 🎙️ 브라우저 내 최고 음질 한국어 보이스 우선순위 탐색기 (폴백용)
 */
function getBestKoreanVoice() {
    if (!window.speechSynthesis) return null;
    const voices = window.speechSynthesis.getVoices() || [];
    const koVoices = voices.filter(v => v.lang && (v.lang === 'ko-KR' || v.lang === 'ko_KR' || v.lang.startsWith('ko') || v.lang.includes('KO')));
    
    if (koVoices.length === 0) return null;

    let best = koVoices.find(v => (v.name.includes('Natural') || v.name.includes('Online') || v.name.includes('SunHi') || v.name.includes('Neural') || v.name.includes('InJoon')) && !v.name.includes('Heami'));
    if (best) return best;

    best = koVoices.find(v => v.name.includes('Google') || v.name.includes('한국어') || v.name.includes('Korean'));
    if (best) return best;

    best = koVoices.find(v => v.name.includes('Yuna') || v.name.includes('Sora') || v.name.includes('Seoyeon'));
    if (best) return best;

    return koVoices[0];
}

function initFairyAudio() {
    console.log(`🧚‍♀️ [요정 엔진] 초고음질 OpenAI TTS & WebSpeech 하이브리드 오디오 시스템 시동 완료!`);
    
    const unlockSpeechEngine = () => {
        if (isSpeechUnlocked) return;
        
        if (window.speechSynthesis) {
            try {
                const silentUtterance = new SpeechSynthesisUtterance("");
                silentUtterance.volume = 0;
                window.speechSynthesis.speak(silentUtterance);
                isSpeechUnlocked = true;
            } catch (err) {}
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
        return true;
    } catch (err) {
        return false;
    }
}

function cleanTextForTTS(rawText) {
    const original = String(rawText || '');
    const isQuestion = original.includes('?') || /(까|니|나요|가요|게요|죠|을까|ㄹ까)\s*$/g.test(original.trim());
    
    let cleaned = original
        .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/gu, '')
        .replace(/[\*\#\`\~\_\>\[\]\(\)\{\}\=\+\-\|\\]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    return { text: cleaned, isQuestion };
}

/**
 * 📢 요정 음성 메인 출력 함수 (1순위: OpenAI TTS ➔ 2순위: WebSpeech 폴백)
 */
async function speakFairyTTS(text, onEndCallback = null) {
    const isTtsEnabled = localStorage.getItem('fairy_tts_enabled') !== 'false';
    if (!isTtsEnabled) {
        if (onEndCallback) onEndCallback();
        return;
    }

    const trimmed = String(text || '').trim();
    if (!trimmed) {
        if (onEndCallback) onEndCallback();
        return;
    }

    // 1. 🎵 사전 녹음된 MP3 프리셋 확인
    if (FAIRY_PRESET_AUDIOS[trimmed]) {
        playFairyPresetAudio(FAIRY_PRESET_AUDIOS[trimmed], onEndCallback);
        return;
    }

    for (const [key, filename] of Object.entries(FAIRY_PRESET_AUDIOS)) {
        if (trimmed === key || trimmed.startsWith(key)) {
            playFairyPresetAudio(filename, onEndCallback);
            return;
        }
    }

    const { text: cleanText, isQuestion } = cleanTextForTTS(text);
    if (!cleanText) {
        if (onEndCallback) onEndCallback();
        return;
    }

    // 2. 🌟 1순위: OpenAI TTS (스튜디오급 성우 음성)
    const openAiConfig = getOpenAITtsConfig();
    if (openAiConfig.apiKey) {
        try {
            await playOpenAiTtsStream(cleanText, onEndCallback);
            return;
        } catch (openAiError) {
            console.warn("⚠️ [OpenAI TTS 실패] 브라우저 기본 TTS로 안전하게 자동 폴백합니다:", openAiError);
        }
    }

    // 3. 🗣️ 2순위 (폴백): 브라우저 WebSpeech API 최고 품질 낭독
    speakWebSpeechFallback(cleanText, isQuestion, onEndCallback);
}

/**
 * 🛡️ WebSpeech API 폴백 낭독기
 */
function speakWebSpeechFallback(cleanText, isQuestion, onEndCallback) {
    if (!window.speechSynthesis) {
        if (onEndCallback) onEndCallback();
        return;
    }

    isSpeechUnlocked = true;

    try {
        if (window.speechSynthesis.paused) window.speechSynthesis.resume();
        window.speechSynthesis.cancel();
    } catch (e) {}

    const runSpeak = () => {
        try {
            const utterance = new SpeechSynthesisUtterance(cleanText);
            utterance.lang = 'ko-KR';
            utterance.rate = isQuestion ? 1.0 : 1.05;
            utterance.pitch = isQuestion ? 1.22 : 1.06;

            const bestVoice = getBestKoreanVoice();
            if (bestVoice) utterance.voice = bestVoice;

            utterance.onend = () => {
                currentUtterance = null;
                if (onEndCallback) onEndCallback();
            };

            utterance.onerror = (e) => {
                if (e.error !== 'interrupted') console.error('WebSpeech TTS 에러:', e);
                currentUtterance = null;
                if (onEndCallback) onEndCallback();
            };

            currentUtterance = utterance;
            window.speechSynthesis.speak(utterance);
        } catch (err) {
            console.error('🚀 [WebSpeech TTS 에러]:', err);
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

/**
 * 🛑 모든 음성 즉시 정지
 */
function stopFairyTTS() {
    isPlayingTtsQueue = false;
    
    if (currentOpenAiAudio) {
        try {
            currentOpenAiAudio.pause();
            currentOpenAiAudio.currentTime = 0;
        } catch (e) {}
        currentOpenAiAudio = null;
    }

    if (fairyPresetAudio) {
        try { fairyPresetAudio.pause(); } catch (e) {}
    }

    if (window.speechSynthesis) {
        try { window.speechSynthesis.cancel(); } catch (e) {}
        currentUtterance = null;
        pendingSpeech = null;
    }
}

function playFairyPresetAudio(src, onEndCallback = null) {
    stopFairyTTS();
    try {
        fairyPresetAudio = new Audio(src);
        fairyPresetAudio.volume = 1.0;
        fairyPresetAudio.onended = () => {
            if (onEndCallback) onEndCallback();
        };
        fairyPresetAudio.onerror = (e) => {
            console.warn(`프리셋 오디오(${src}) 로드 실패, 동적 음성으로 대체합니다:`, e);
            if (onEndCallback) onEndCallback();
        };
        fairyPresetAudio.play().catch(err => {
            console.warn("오디오 자동재생 제한:", err);
            if (onEndCallback) onEndCallback();
        });
    } catch (err) {
        if (onEndCallback) onEndCallback();
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

    const panelTtsBtn = document.getElementById('fairy-panel-tts-btn');
    if (panelTtsBtn) {
        panelTtsBtn.innerHTML = isEnabled ? '🔊 음성 ON' : '🔇 음성 OFF';
        panelTtsBtn.style.background = isEnabled ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.3)';
        panelTtsBtn.style.color = isEnabled ? '#ffffff' : '#aaaaaa';
    }
}

/**
 * ⚙️ OpenAI TTS 키 설정 모달 열기
 */
function openTtsVoiceSettingsModal() {
    let existingModal = document.getElementById('ttsSettingsModal');
    if (existingModal) existingModal.remove();

    const currentKey = (typeof localStorage !== 'undefined' && localStorage.getItem('OPENAI_API_KEY')) || '';
    const currentVoice = (typeof localStorage !== 'undefined' && localStorage.getItem('OPENAI_TTS_VOICE')) || 'nova';

    const modalHtml = `
        <div id="ttsSettingsModal" style="position:fixed; inset:0; background:rgba(0,0,0,0.75); backdrop-filter:blur(6px); display:flex; justify-content:center; align-items:center; z-index:999999; padding:20px;">
            <div style="background:#161b22; border:1px solid #30363d; border-radius:18px; width:100%; max-width:480px; padding:24px; color:#f0f6fc; box-shadow:0 20px 50px rgba(0,0,0,0.7); display:flex; flex-direction:column; gap:16px;">
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #30363d; padding-bottom:12px;">
                    <h3 style="margin:0; font-size:1.2rem; display:flex; align-items:center; gap:8px;">🎙️ 요정 고음질 음성 설정 (OpenAI TTS)</h3>
                    <button onclick="document.getElementById('ttsSettingsModal').remove()" style="background:transparent; border:none; color:#8b949e; font-size:1.4rem; cursor:pointer;">✕</button>
                </div>

                <div>
                    <label style="font-size:0.9rem; font-weight:bold; color:#58a6ff; display:block; margin-bottom:6px;">🔑 OpenAI API Key</label>
                    <input type="password" id="ttsOpenAiKeyInput" value="${currentKey}" placeholder="sk-..." style="width:100%; box-sizing:border-box; padding:10px 14px; border-radius:10px; border:1px solid #30363d; background:#0d1117; color:#fff; font-size:0.95rem;">
                    <p style="font-size:0.8rem; color:#8b949e; margin:6px 0 0 0;">입력하신 키는 브라우저 로컬스토리지에 안전하게 보관됩니다.</p>
                </div>

                <div>
                    <label style="font-size:0.9rem; font-weight:bold; color:#58a6ff; display:block; margin-bottom:6px;">🎭 요정 목소리 캐릭터 선택</label>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                        <button type="button" class="voice-opt-btn ${currentVoice === 'nova' ? 'active' : ''}" onclick="selectTtsVoiceOpt('nova', this)" style="padding:12px; border-radius:12px; border:2px solid ${currentVoice === 'nova' ? '#ab47bc' : '#30363d'}; background:#21262d; color:#fff; cursor:pointer; text-align:left;">
                            <div style="font-weight:bold; font-size:0.95rem;">🌟 Nova (노바)</div>
                            <div style="font-size:0.8rem; color:#8b949e;">밝고 발랄한 요정 톤 (추천)</div>
                        </button>
                        <button type="button" class="voice-opt-btn ${currentVoice === 'shimmer' ? 'active' : ''}" onclick="selectTtsVoiceOpt('shimmer', this)" style="padding:12px; border-radius:12px; border:2px solid ${currentVoice === 'shimmer' ? '#ab47bc' : '#30363d'}; background:#21262d; color:#fff; cursor:pointer; text-align:left;">
                            <div style="font-weight:bold; font-size:0.95rem;">🌸 Shimmer (쉬머)</div>
                            <div style="font-size:0.8rem; color:#8b949e;">맑고 차분하며 다정한 톤</div>
                        </button>
                    </div>
                </div>

                <div style="display:flex; gap:10px; margin-top:8px;">
                    <button onclick="testCurrentTtsVoice()" style="flex:1; padding:12px; border-radius:10px; background:#21262d; border:1px solid #30363d; color:#fff; font-weight:bold; cursor:pointer;">▶️ 목소리 미리듣기</button>
                    <button onclick="saveTtsVoiceSettings()" style="flex:1; padding:12px; border-radius:10px; background:linear-gradient(135deg, #8a2be2, #ab47bc); border:none; color:#fff; font-weight:bold; cursor:pointer;">💾 저장하기</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

let selectedVoiceTemp = 'nova';
function selectTtsVoiceOpt(voice, btnEl) {
    selectedVoiceTemp = voice;
    document.querySelectorAll('.voice-opt-btn').forEach(b => {
        b.style.borderColor = '#30363d';
    });
    if (btnEl) btnEl.style.borderColor = '#ab47bc';
}

async function testCurrentTtsVoice() {
    const key = document.getElementById('ttsOpenAiKeyInput').value.trim();
    if (!key) {
        alert("API 키를 먼저 입력해 주세요!");
        return;
    }
    const sampleText = "안녕! 나는 공부방의 귀여운 인공지능 요정 코코야! 오늘 공부도 신나게 시작해볼까?";
    try {
        const audioUrl = await fetchOpenAiTtsAudio(sampleText, {
            apiKey: key,
            voice: selectedVoiceTemp || 'nova',
            model: 'tts-1',
            speed: 1.06
        });
        const audio = new Audio(audioUrl);
        audio.play();
    } catch (e) {
        alert("목소리 테스트 실패: " + e.message);
    }
}

function saveTtsVoiceSettings() {
    const key = document.getElementById('ttsOpenAiKeyInput').value.trim();
    localStorage.setItem('OPENAI_API_KEY', key);
    localStorage.setItem('OPENAI_TTS_VOICE', selectedVoiceTemp || 'nova');
    if (typeof APP_CONFIG !== 'undefined') {
        APP_CONFIG.OPENAI_API_KEY = key;
        APP_CONFIG.OPENAI_TTS_VOICE = selectedVoiceTemp || 'nova';
    }
    alert("요정 고음질 음성 설정이 저장되었습니다! ✨");
    const modal = document.getElementById('ttsSettingsModal');
    if (modal) modal.remove();
}

// 🌐 브라우저 전역 소켓 바인딩
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
window.openTtsVoiceSettingsModal = openTtsVoiceSettingsModal;
window.selectTtsVoiceOpt = selectTtsVoiceOpt;
window.testCurrentTtsVoice = testCurrentTtsVoice;
window.saveTtsVoiceSettings = saveTtsVoiceSettings;
window.getOpenAITtsConfig = getOpenAITtsConfig;

// 초기화
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        initFairyAudio();
        updateTtsToggleUi();
    });
}
