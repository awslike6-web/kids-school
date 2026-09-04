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
let currentTtsSessionId = 0;
const ttsAudioBlobCache = new Map(); // 짧은 칭찬 멘트 메모리 캐시

// 🎧 Neural AI(선희) 요정 코코 MP3 프리셋 데이터베이스
const FAIRY_AUDIO_PRESETS = {
    // 1. 환영 인사 & 과목 입장 (8종)
    welcome_lobby: "fairy_welcome_lobby.mp3",
    welcome_minsu: "fairy_welcome_minsu.mp3",
    welcome_minseo: "fairy_welcome_minseo.mp3",
    welcome_math: "fairy_welcome_math.mp3",
    welcome_korean: "fairy_welcome_korean.mp3",
    welcome_society: "fairy_welcome_society.mp3",
    welcome_science: "fairy_welcome_science.mp3",
    welcome_english: "fairy_welcome_english.mp3",

    // 2. 정답 & 칭찬 풀 (10종)
    praises: [
        "fairy_praise_1.mp3", "fairy_praise_2.mp3", "fairy_praise_3.mp3", "fairy_praise_4.mp3", "fairy_praise_5.mp3",
        "fairy_praise_6.mp3", "fairy_praise_7.mp3", "fairy_praise_8.mp3", "fairy_praise_9.mp3", "fairy_praise_10.mp3"
    ],

    // 3. 오답 & 응원/힌트 풀 (8종)
    encourages: [
        "fairy_encourage_1.mp3", "fairy_encourage_2.mp3", "fairy_encourage_3.mp3", "fairy_encourage_4.mp3",
        "fairy_encourage_5.mp3", "fairy_encourage_6.mp3", "fairy_encourage_7.mp3", "fairy_encourage_8.mp3"
    ],

    // 4. 퀘스트 완료 & 레벨업 & 보상 (6종)
    quest_complete: "fairy_quest_complete.mp3",
    level_up: "fairy_level_up.mp3",
    reward_diamond: "fairy_reward_diamond.mp3",
    reward_star: "fairy_reward_star.mp3",
    study_finish: "fairy_study_finish.mp3",
    streak_bonus: "fairy_streak_bonus.mp3",

    // 5. 시작 & 집중 (4종)
    focus_start: "fairy_focus_start.mp3",
    ready_go: "fairy_ready_go.mp3",
    think_careful: "fairy_think_careful.mp3",
    hint_open: "fairy_hint_open.mp3"
};

// 레거시 호환용 매핑
const FAIRY_PRESET_AUDIOS = {
    "welcome_korean": "fairy_welcome_korean.mp3",
    "welcome_math_minsu": "fairy_welcome_minsu.mp3",
    "welcome_math_minseo": "fairy_welcome_minseo.mp3",
    "welcome_lobby": "fairy_welcome_lobby.mp3",
    "quest_complete": "fairy_quest_complete.mp3"
};

/**
 * 🔍 페이지 위치(루트/하위 과목 폴더)에 관계없이 요정 음성 에셋 기본 경로 반환
 */
function getFairyAssetBaseUrl() {
    if (typeof document !== 'undefined') {
        const scripts = document.getElementsByTagName('script');
        for (let s of scripts) {
            if (s.src && s.src.includes('fairy-engine.js')) {
                const coreUrl = s.src.substring(0, s.src.lastIndexOf('/')); // .../kids/core
                const kidsUrl = coreUrl.substring(0, coreUrl.lastIndexOf('/')); // .../kids
                return kidsUrl + '/assets/sounds/fairy/';
            }
        }
    }
    return 'assets/sounds/fairy/';
}

/**
 * 🎯 입력 텍스트/의도에 따른 고음질 선희 Neural 프리셋 음성 매칭 라우터
 */
function resolveFairyPresetAudio(text) {
    if (!text) return null;
    const trimmed = String(text).trim();
    const baseUrl = getFairyAssetBaseUrl();

    // 1) 직접 프리셋 키 매핑
    if (FAIRY_AUDIO_PRESETS[trimmed] && typeof FAIRY_AUDIO_PRESETS[trimmed] === 'string') {
        return baseUrl + FAIRY_AUDIO_PRESETS[trimmed];
    }
    if (FAIRY_PRESET_AUDIOS[trimmed]) {
        return baseUrl + FAIRY_PRESET_AUDIOS[trimmed];
    }

    // 2) 퀘스트 완료 / 보상 / 레벨업 키워드 매칭
    if (/퀘스트.*완료|미션.*완료|퀘스트를.*완료/i.test(trimmed)) return baseUrl + FAIRY_AUDIO_PRESETS.quest_complete;
    if (/레벨업|레벨.*올랐/i.test(trimmed)) return baseUrl + FAIRY_AUDIO_PRESETS.level_up;
    if (/다이아|보석/i.test(trimmed)) return baseUrl + FAIRY_AUDIO_PRESETS.reward_diamond;
    if (/별조각|황금.*별/i.test(trimmed)) return baseUrl + FAIRY_AUDIO_PRESETS.reward_star;
    if (/공부.*끝|오늘.*학습.*완료|오늘.*공부.*완료/i.test(trimmed)) return baseUrl + FAIRY_AUDIO_PRESETS.study_finish;
    if (/연속.*학습|스트릭/i.test(trimmed)) return baseUrl + FAIRY_AUDIO_PRESETS.streak_bonus;

    // 3) 환영 인사 키워드 매칭
    if (/민민이네.*공부방|공부방에.*온.*걸|로비/i.test(trimmed)) return baseUrl + FAIRY_AUDIO_PRESETS.welcome_lobby;
    if (/민수야.*안녕|민수.*퀘스트/i.test(trimmed)) return baseUrl + FAIRY_AUDIO_PRESETS.welcome_minsu;
    if (/민서야.*반가워|민서.*별/i.test(trimmed)) return baseUrl + FAIRY_AUDIO_PRESETS.welcome_minseo;
    if (/수학.*탐험|수학.*배움/i.test(trimmed)) return baseUrl + FAIRY_AUDIO_PRESETS.welcome_math;
    if (/국어.*배움|국어.*탐험/i.test(trimmed)) return baseUrl + FAIRY_AUDIO_PRESETS.welcome_korean;
    if (/사회.*탐험|사회.*배움/i.test(trimmed)) return baseUrl + FAIRY_AUDIO_PRESETS.welcome_society;
    if (/과학.*실험|과학.*탐험/i.test(trimmed)) return baseUrl + FAIRY_AUDIO_PRESETS.welcome_science;
    if (/영어.*모험|영어.*배움/i.test(trimmed)) return baseUrl + FAIRY_AUDIO_PRESETS.welcome_english;

    // 4) 정답 & 칭찬 키워드 매칭 (10종 중 무작위 선택)
    if (/정답|완벽|대단|천재|멋져|딩동댕|최고|잘했|맞혔|맞았/i.test(trimmed)) {
        const praises = FAIRY_AUDIO_PRESETS.praises;
        const chosen = praises[Math.floor(Math.random() * praises.length)];
        return baseUrl + chosen;
    }

    // 5) 오답 & 응원/힌트 키워드 매칭 (8종 중 무작위 선택)
    if (/아쉬워|틀렸|다시.*생각|다시.*한번|힌트|힘내|포기하지|괜찮아|도전/i.test(trimmed)) {
        const encourages = FAIRY_AUDIO_PRESETS.encourages;
        const chosen = encourages[Math.floor(Math.random() * encourages.length)];
        return baseUrl + chosen;
    }

    // 6) 시작 & 집중 키워드 매칭
    if (/집중|시작해|출발/i.test(trimmed)) return baseUrl + FAIRY_AUDIO_PRESETS.focus_start;
    if (/준비.*완료|신나는.*퀴즈/i.test(trimmed)) return baseUrl + FAIRY_AUDIO_PRESETS.ready_go;
    if (/차근차근.*읽어/i.test(trimmed)) return baseUrl + FAIRY_AUDIO_PRESETS.think_careful;
    if (/비밀.*힌트|힌트를.*열어/i.test(trimmed)) return baseUrl + FAIRY_AUDIO_PRESETS.hint_open;

    return null;
}

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
 * 🌐 텍스트의 주 언어가 영어인지 감지 (스마트 바이링구얼 엔진)
 */
function isEnglishText(text) {
    if (!text) return false;
    const str = String(text).trim();
    const hasKorean = /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/.test(str);
    const englishMatch = str.match(/[a-zA-Z]/g);
    const englishLetters = englishMatch ? englishMatch.length : 0;
    
    // 한글이 없고 영문 알파벳이 포함되어 있으면 영어
    if (!hasKorean && englishLetters > 0) return true;
    
    // 한글과 영어가 혼합된 경우, 영문 비중이 70% 이상이면 영어
    const koreanMatch = str.match(/[\uAC00-\uD7AF]/g);
    const koreanLetters = koreanMatch ? koreanMatch.length : 0;
    if (englishLetters > 0 && englishLetters >= koreanLetters * 2.5) {
        return true;
    }
    
    return false;
}

/**
 * ⚡ Cloudflare Worker Edge TTS 설정 조회 (언어별 성우 자동 전환)
 */
function getCloudflareEdgeTtsConfig(text = '') {
    let workerUrl = '';
    if (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.TTS_WORKER_URL) {
        workerUrl = APP_CONFIG.TTS_WORKER_URL;
    } else if (typeof localStorage !== 'undefined' && localStorage.getItem('TTS_WORKER_URL')) {
        workerUrl = localStorage.getItem('TTS_WORKER_URL');
    } else {
        const baseProxy = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.WORKER_PROXY_URL) 
            || (typeof PROXY_URL !== 'undefined' ? PROXY_URL : 'https://minmin-notion.awslike6.workers.dev');
        workerUrl = `${baseProxy.replace(/\/$/, '')}/api/tts`;
    }

    const isEng = isEnglishText(text);

    let voice = isEng ? 'en-US-JennyNeural' : 'ko-KR-SunHiNeural';
    if (isEng) {
        if (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.DEFAULT_ENGLISH_VOICE) {
            voice = APP_CONFIG.DEFAULT_ENGLISH_VOICE;
        } else if (typeof localStorage !== 'undefined' && localStorage.getItem('EDGE_TTS_VOICE_EN')) {
            voice = localStorage.getItem('EDGE_TTS_VOICE_EN');
        }
    } else {
        if (typeof localStorage !== 'undefined' && localStorage.getItem('EDGE_TTS_VOICE')) {
            voice = localStorage.getItem('EDGE_TTS_VOICE');
        } else if (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.EDGE_TTS_VOICE) {
            voice = APP_CONFIG.EDGE_TTS_VOICE;
        }
    }

    return {
        workerUrl: workerUrl,
        voice: voice,
        rate: isEng ? '+0%' : '+6%',     // 영어는 자연스러운 원어민 속도(+0%), 한국어는 발랄한 요정 속도(+6%)
        pitch: isEng ? '+0Hz' : '+4Hz',  // 영어는 자연스러운 피치, 한국어는 귀여운 요정 피치
        isEnglish: isEng
    };
}

/**
 * ⚡ Cloudflare Edge-TTS API 단일 문장 오디오 가져오기 (Blob URL 반환)
 */
async function fetchCloudflareEdgeTtsAudio(sentence, config) {
    const trimmed = sentence.trim();
    if (!trimmed) return null;

    const cacheKey = `edge_${config.voice}_${config.rate}_${trimmed}`;
    if (ttsAudioBlobCache.has(cacheKey)) {
        return ttsAudioBlobCache.get(cacheKey);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6초 타임아웃

    try {
        const response = await fetch(config.workerUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: trimmed,
                voice: config.voice || 'ko-KR-SunHiNeural',
                rate: config.rate || '+6%',
                pitch: config.pitch || '+4Hz'
            }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`Edge-TTS Worker HTTP ${response.status}`);
        }

        const blob = await response.blob();
        if (blob.size === 0) throw new Error("Empty audio response");

        const audioUrl = URL.createObjectURL(blob);

        if (trimmed.length <= 60) {
            ttsAudioBlobCache.set(cacheKey, audioUrl);
        }

        return audioUrl;
    } catch (err) {
        clearTimeout(timeoutId);
        throw err;
    }
}

/**
 * 🚀 Cloudflare Edge-TTS 문장 큐잉 & 실시간 연속 스트리밍 재생기
 */
async function playCloudflareEdgeTtsStream(fullText, onEndCallback = null, forceVoice = null) {
    const config = getCloudflareEdgeTtsConfig(fullText);
    if (forceVoice) {
        config.voice = forceVoice;
        if (forceVoice.includes('Jenny') || forceVoice.includes('en-')) {
            config.rate = '+0%';
            config.pitch = '+0Hz';
            config.isEnglish = true;
        }
    }
    if (!config.workerUrl) {
        throw new Error("TTS_WORKER_URL_NOT_FOUND");
    }

    stopFairyTTS();
    const sessionId = ++currentTtsSessionId;

    const sentences = splitTextIntoSentences(fullText);
    if (sentences.length === 0) {
        if (onEndCallback) onEndCallback();
        return;
    }

    const voiceLabel = config.isEnglish ? 'Jenny (미국 원어민)' : 'SunHi (한국어 요정)';
    console.log(`🎙️ [Edge-TTS Stream] (세션 #${sessionId}) 총 ${sentences.length}개 문장 [${voiceLabel}] 스트리밍 시작`);
    isPlayingTtsQueue = true;

    const audioPromises = sentences.map(s => fetchCloudflareEdgeTtsAudio(s, config));

    let currentIndex = 0;

    const playNext = async () => {
        if (sessionId !== currentTtsSessionId || !isPlayingTtsQueue || currentIndex >= sentences.length) {
            if (sessionId === currentTtsSessionId) {
                isPlayingTtsQueue = false;
                currentOpenAiAudio = null;
                if (onEndCallback) onEndCallback();
            }
            return;
        }

        try {
            const audioUrl = await audioPromises[currentIndex];
            if (sessionId !== currentTtsSessionId || !isPlayingTtsQueue || !audioUrl) {
                return;
            }

            const audio = new Audio(audioUrl);
            currentOpenAiAudio = audio;

            audio.onended = () => {
                if (sessionId !== currentTtsSessionId) return;
                currentIndex++;
                playNext();
            };

            audio.onerror = (e) => {
                if (sessionId !== currentTtsSessionId) return;
                console.warn(`[Edge-TTS] ${currentIndex + 1}번째 문장 재생 오류, 다음으로 진행:`, e);
                currentIndex++;
                playNext();
            };

            await audio.play();
        } catch (err) {
            if (sessionId !== currentTtsSessionId) return;
            throw err;
        }
    };

    await playNext();
}

/**
 * 🇺🇸 미국 원어민(Jenny) 전용 발화 헬퍼 (영어방 전용)
 */
async function speakEnglish(text, onEndCallback = null) {
    const trimmed = String(text || '').trim();
    if (!trimmed) {
        if (onEndCallback) onEndCallback();
        return;
    }

    const isTtsEnabled = localStorage.getItem('fairy_tts_enabled') !== 'false';
    if (!isTtsEnabled) {
        if (onEndCallback) onEndCallback();
        return;
    }

    try {
        const enVoice = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.DEFAULT_ENGLISH_VOICE) || 'en-US-JennyNeural';
        await playCloudflareEdgeTtsStream(trimmed, onEndCallback, enVoice);
    } catch (err) {
        console.warn("⚠️ [원어민 TTS 폴백] WebSpeech 영어 음성으로 전환합니다:", err);
        if ('speechSynthesis' in window) {
            try { window.speechSynthesis.cancel(); } catch (e) {}
            const utterance = new SpeechSynthesisUtterance(trimmed);
            utterance.lang = 'en-US';
            utterance.rate = 0.88;
            if (onEndCallback) utterance.onend = onEndCallback;
            window.speechSynthesis.speak(utterance);
        } else if (onEndCallback) {
            onEndCallback();
        }
    }
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

    stopFairyTTS(); // 이전 재생 즉시 중단
    const sessionId = ++currentTtsSessionId;

    const sentences = splitTextIntoSentences(fullText);
    if (sentences.length === 0) {
        if (onEndCallback) onEndCallback();
        return;
    }

    console.log(`🎙️ [OpenAI TTS] (세션 #${sessionId}) 총 ${sentences.length}개 문장 스트리밍 큐 시동 (보이스: ${config.voice})`);
    isPlayingTtsQueue = true;

    // 문장별 오디오 프로미스 프리페치 맵
    const audioPromises = sentences.map(s => fetchOpenAiTtsAudio(s, config));

    let currentIndex = 0;

    const playNext = async () => {
        if (sessionId !== currentTtsSessionId || !isPlayingTtsQueue || currentIndex >= sentences.length) {
            if (sessionId === currentTtsSessionId) {
                isPlayingTtsQueue = false;
                currentOpenAiAudio = null;
                if (onEndCallback) onEndCallback();
            }
            return;
        }

        try {
            // 현재 순서의 오디오 URL 대기
            const audioUrl = await audioPromises[currentIndex];
            if (sessionId !== currentTtsSessionId || !isPlayingTtsQueue || !audioUrl) {
                return;
            }

            const audio = new Audio(audioUrl);
            currentOpenAiAudio = audio;

            audio.onended = () => {
                if (sessionId !== currentTtsSessionId) return;
                currentIndex++;
                playNext();
            };

            audio.onerror = (e) => {
                if (sessionId !== currentTtsSessionId) return;
                console.warn(`[OpenAI TTS] ${currentIndex + 1}번째 문장 재생 오류, 다음 문장으로 진행:`, e);
                currentIndex++;
                playNext();
            };

            await audio.play();
        } catch (err) {
            if (sessionId !== currentTtsSessionId) return;
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
    stopFairyTTS(); // 새 발화 요청 시 이전 오디오/TTS 즉시 중단

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

    // 1. 🎵 사전 녹음된 Neural AI(선희) MP3 프리셋 및 스마트 키워드 매칭
    const matchedPresetAudio = resolveFairyPresetAudio(trimmed);
    if (matchedPresetAudio) {
        playFairyPresetAudio(matchedPresetAudio, onEndCallback);
        return;
    }

    const { text: cleanText, isQuestion } = cleanTextForTTS(text);
    if (!cleanText) {
        if (onEndCallback) onEndCallback();
        return;
    }

    // 2. 🌟 1순위: Cloudflare Worker Edge Neural AI TTS (선희 성우 초고음질 실시간 스트리밍)
    try {
        await playCloudflareEdgeTtsStream(cleanText, onEndCallback);
        return;
    } catch (edgeError) {
        console.warn("ℹ️ [Cloudflare Edge-TTS 미응답/폴백] OpenAI TTS 또는 WebSpeech로 자동 전환합니다:", edgeError.message || edgeError);
    }

    // 3. 🌟 2순위: OpenAI TTS (스튜디오급 성우 음성)
    const openAiConfig = getOpenAITtsConfig();
    if (openAiConfig.apiKey) {
        try {
            await playOpenAiTtsStream(cleanText, onEndCallback);
            return;
        } catch (openAiError) {
            console.warn("⚠️ [OpenAI TTS 실패] 브라우저 기본 TTS로 안전하게 자동 폴백합니다:", openAiError);
        }
    }

    // 4. 🗣️ 3순위 (폴백): 브라우저 WebSpeech API 최고 품질 낭독
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
    const sessionId = ++currentTtsSessionId;

    try {
        if (window.speechSynthesis.paused) window.speechSynthesis.resume();
        window.speechSynthesis.cancel();
    } catch (e) {}

    const runSpeak = () => {
        if (sessionId !== currentTtsSessionId) return; // 최신 세션이 아니면 취소

        try {
            const utterance = new SpeechSynthesisUtterance(cleanText);
            utterance.lang = 'ko-KR';
            utterance.rate = isQuestion ? 1.0 : 1.05;
            utterance.pitch = isQuestion ? 1.22 : 1.06;

            const bestVoice = getBestKoreanVoice();
            if (bestVoice) utterance.voice = bestVoice;

            utterance.onend = () => {
                if (sessionId !== currentTtsSessionId) return;
                currentUtterance = null;
                if (onEndCallback) onEndCallback();
            };

            utterance.onerror = (e) => {
                if (sessionId !== currentTtsSessionId) return;
                if (e.error !== 'interrupted') console.error('WebSpeech TTS 에러:', e);
                currentUtterance = null;
                if (onEndCallback) onEndCallback();
            };

            currentUtterance = utterance;
            window.speechSynthesis.speak(utterance);
        } catch (err) {
            if (sessionId !== currentTtsSessionId) return;
            console.error('🚀 [WebSpeech TTS 에러]:', err);
            if (onEndCallback) onEndCallback();
        }
    };

    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) {
        window.speechSynthesis.onvoiceschanged = () => {
            window.speechSynthesis.onvoiceschanged = null;
            if (sessionId === currentTtsSessionId) runSpeak();
        };
        setTimeout(() => {
            if (sessionId === currentTtsSessionId) runSpeak();
        }, 100);
    } else {
        setTimeout(() => {
            if (sessionId === currentTtsSessionId) runSpeak();
        }, 30);
    }
}

/**
 * 🛑 모든 음성 즉시 정지
 */
function stopFairyTTS() {
    currentTtsSessionId++;
    isPlayingTtsQueue = false;
    
    if (currentOpenAiAudio) {
        try {
            currentOpenAiAudio.pause();
            currentOpenAiAudio.currentTime = 0;
        } catch (e) {}
        currentOpenAiAudio = null;
    }

    if (fairyPresetAudio) {
        try { 
            fairyPresetAudio.pause(); 
            fairyPresetAudio.currentTime = 0;
        } catch (e) {}
        fairyPresetAudio = null;
    }

    if (window.speechSynthesis) {
        try { window.speechSynthesis.cancel(); } catch (e) {}
        currentUtterance = null;
        pendingSpeech = null;
    }
}

function playFairyPresetAudio(src, onEndCallback = null) {
    stopFairyTTS();
    const isTtsEnabled = localStorage.getItem('fairy_tts_enabled') !== 'false';
    if (!isTtsEnabled) {
        if (onEndCallback) onEndCallback();
        return;
    }

    try {
        let fullSrc = src;
        if (!src.includes('/') && !src.includes('\\')) {
            fullSrc = getFairyAssetBaseUrl() + src;
        }
        fairyPresetAudio = new Audio(fullSrc);
        fairyPresetAudio.volume = 1.0;
        fairyPresetAudio.onended = () => {
            fairyPresetAudio = null;
            if (onEndCallback) onEndCallback();
        };
        fairyPresetAudio.onerror = (e) => {
            console.warn(`프리셋 오디오(${fullSrc}) 로드 실패:`, e);
            fairyPresetAudio = null;
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

/**
 * 🌟 정답/극찬 전용 헬퍼 (10개 선희 고음질 음성 중 무작위 재생)
 */
function fairyPraise(onEndCallback = null) {
    const praises = FAIRY_AUDIO_PRESETS.praises;
    const chosen = praises[Math.floor(Math.random() * praises.length)];
    playFairyPresetAudio(getFairyAssetBaseUrl() + chosen, onEndCallback);
}

/**
 * 🌸 오답/응원 전용 헬퍼 (8개 선희 고음질 음성 중 무작위 재생)
 */
function fairyEncourage(onEndCallback = null) {
    const encourages = FAIRY_AUDIO_PRESETS.encourages;
    const chosen = encourages[Math.floor(Math.random() * encourages.length)];
    playFairyPresetAudio(getFairyAssetBaseUrl() + chosen, onEndCallback);
}

/**
 * 🎁 퀘스트/레벨업/보상 전용 헬퍼
 */
function fairyReward(type = 'quest', onEndCallback = null) {
    const baseUrl = getFairyAssetBaseUrl();
    const map = {
        quest: FAIRY_AUDIO_PRESETS.quest_complete,
        level: FAIRY_AUDIO_PRESETS.level_up,
        diamond: FAIRY_AUDIO_PRESETS.reward_diamond,
        star: FAIRY_AUDIO_PRESETS.reward_star,
        finish: FAIRY_AUDIO_PRESETS.study_finish,
        streak: FAIRY_AUDIO_PRESETS.streak_bonus
    };
    const file = map[type] || FAIRY_AUDIO_PRESETS.quest_complete;
    playFairyPresetAudio(baseUrl + file, onEndCallback);
}

/**
 * 🏰 환영/과목 입장 전용 헬퍼
 */
function fairyGreet(target = 'lobby', onEndCallback = null) {
    const baseUrl = getFairyAssetBaseUrl();
    const map = {
        lobby: FAIRY_AUDIO_PRESETS.welcome_lobby,
        minsu: FAIRY_AUDIO_PRESETS.welcome_minsu,
        minseo: FAIRY_AUDIO_PRESETS.welcome_minseo,
        math: FAIRY_AUDIO_PRESETS.welcome_math,
        korean: FAIRY_AUDIO_PRESETS.welcome_korean,
        society: FAIRY_AUDIO_PRESETS.welcome_society,
        science: FAIRY_AUDIO_PRESETS.welcome_science,
        english: FAIRY_AUDIO_PRESETS.welcome_english
    };
    const file = map[target] || FAIRY_AUDIO_PRESETS.welcome_lobby;
    playFairyPresetAudio(baseUrl + file, onEndCallback);
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
                    <label style="font-size:0.9rem; font-weight:bold; color:#58a6ff; display:block; margin-bottom:6px;">🔑 OpenAI API Key (sk-...)</label>
                    <input type="password" id="ttsOpenAiKeyInput" value="${currentKey}" placeholder="sk-proj-..." style="width:100%; box-sizing:border-box; padding:10px 14px; border-radius:10px; border:1px solid #30363d; background:#0d1117; color:#fff; font-size:0.95rem;">
                    <p style="font-size:0.8rem; color:#8b949e; margin:6px 0 0 0; line-height:1.4;">
                        ※ <strong>OpenAI(ChatGPT) 전용 키</strong>를 입력해 주세요. (발급: <a href="https://platform.openai.com/api-keys" target="_blank" style="color:#58a6ff;">platform.openai.com/api-keys</a>)<br>
                        <span style="color:#e3b341;">(⚠️ AQ... 로 시작하는 구글 제미나이 키는 사용하실 수 없습니다.)</span>
                    </p>
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

    // Google Gemini 키 입력 감지 시 친절한 안내
    if (key.startsWith('AQ.') || key.startsWith('AIza')) {
        alert("⚠️ 입력하신 키는 Google Gemini API 키입니다!\n\nOpenAI 음성(Nova/Shimmer)을 사용하시려면 OpenAI 플랫폼(https://platform.openai.com/api-keys)에서 발급받은 'sk-'로 시작하는 OpenAI API 키를 입력해 주세요.");
        return;
    }

    if (!key.startsWith('sk-')) {
        alert("⚠️ 올바른 OpenAI API 키 형식이 아닙니다.\nOpenAI 키는 보통 'sk-' 또는 'sk-proj-'로 시작합니다.");
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
    if (key && (key.startsWith('AQ.') || key.startsWith('AIza'))) {
        alert("⚠️ 입력하신 키는 Google Gemini 키입니다. 'sk-'로 시작하는 OpenAI 키를 입력해 주세요.");
        return;
    }
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
window.playFairyPreset = playFairyPresetAudio;
window.fairyPraise = fairyPraise;
window.fairyEncourage = fairyEncourage;
window.fairyReward = fairyReward;
window.fairyGreet = fairyGreet;
window.resolveFairyPresetAudio = resolveFairyPresetAudio;
window.getFairyAssetBaseUrl = getFairyAssetBaseUrl;
window.FAIRY_AUDIO_PRESETS = FAIRY_AUDIO_PRESETS;
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
window.getCloudflareEdgeTtsConfig = getCloudflareEdgeTtsConfig;
window.fetchCloudflareEdgeTtsAudio = fetchCloudflareEdgeTtsAudio;
window.playCloudflareEdgeTtsStream = playCloudflareEdgeTtsStream;
window.isEnglishText = isEnglishText;
window.speakEnglish = speakEnglish;

// 초기화
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        initFairyAudio();
        updateTtsToggleUi();
    });
}
