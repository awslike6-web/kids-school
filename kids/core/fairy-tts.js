// 📄 kids/core/fairy-tts.js (요정 음성 합성: Edge 실시간 음성 대기열 · 브라우저 음성 대체 · 정지 · 말하기 속도)
// - fairy-engine.js(코코 프리셋·캐릭터 목소리·칭찬 헬퍼)보다 먼저 실어야 한다.
// - 실시간 음성은 Worker /api/tts 한 곳만 부른다. Edge가 막히면 Worker가 서버 비밀값으로 OpenAI를 대신 부른다.
//   (브라우저에서 OpenAI를 직접 부르거나 키를 저장하지 않는다: 전사 헌법 §5)

// 🎶 재생 상태
let currentUtterance = null;      // 브라우저 음성(WebSpeech) 발화
let isSpeechUnlocked = false;
let fairyPresetAudio = null;      // 녹음된 짧은 음성(코코 프리셋·캐릭터 목소리)
let currentTtsAudio = null;       // 실시간 음성 대기열에서 지금 재생 중인 문장
let isPlayingTtsQueue = false;
let currentTtsSessionId = 0;      // 새 발화·정지마다 올라간다. 옛 세션의 콜백은 무시
let releaseActiveTtsQueue = null; // 정지할 때 미리 받아 둔 문장 음성을 해제하는 함수

// 📦 짧은 문장 음성 캐시 (칭찬·안내 멘트 재사용). 캐시에 든 주소는 재생이 끝나도 해제하지 않는다
const ttsAudioBlobCache = new Map();
const TTS_CACHE_MAX_CHARS = 60;
const TTS_CACHE_MAX_ITEMS = 40;
const TTS_PREFETCH_AHEAD = 2;     // 지금 문장 + 다음 2문장만 미리 받는다
const TTS_FETCH_TIMEOUT_MS = 6000;

// ========================================================
// ⚙️ 학생·설정값 (SettingsManager가 없는 화면에서도 같은 저장소를 읽는다)
// ========================================================

/** 지금 학생('son' | 'daughter'). 설정창과 같은 규칙 */
function getSafeStudent() {
    if (typeof SettingsManager !== 'undefined' && typeof SettingsManager.getCurrentStudent === 'function') {
        return SettingsManager.getCurrentStudent();
    }
    try {
        const userParam = new URLSearchParams(window.location.search).get('user');
        if (userParam === 'daughter' || userParam === 'minseo' || userParam === '민서') return 'daughter';
        if (userParam === 'son' || userParam === 'minsu' || userParam === '민수') return 'son';
        if (localStorage.getItem('currentUser') === 'daughter' || localStorage.getItem('currentChild') === 'minseo'
            || localStorage.getItem('currentUserName') === '민서') return 'daughter';
    } catch (e) {}
    return 'son';
}

/** 저장된 설정값 하나 (학생별 설정 우선, 없으면 통합·레거시 설정). 저장된 적 없으면 undefined */
function getStoredAppSetting(key) {
    try {
        for (const storageKey of [`MINMIN_APP_SETTINGS_${getSafeStudent()}`, 'MINMIN_APP_SETTINGS']) {
            const raw = localStorage.getItem(storageKey);
            const parsed = raw ? JSON.parse(raw) : null;
            if (parsed && parsed[key] !== undefined) return parsed[key];
        }
    } catch (e) {
        console.warn('[fairy-tts] 설정 읽기 경고:', e);
    }
    return undefined;
}

/** 설정값 저장. 설정창 엔진이 있으면 그쪽(노션 동기화 포함), 없으면 학생별 설정에 직접 */
function setStoredAppSetting(key, value) {
    if (typeof SettingsManager !== 'undefined' && typeof SettingsManager.set === 'function') {
        SettingsManager.set(key, value);
        return;
    }
    try {
        const storageKey = `MINMIN_APP_SETTINGS_${getSafeStudent()}`;
        const all = JSON.parse(localStorage.getItem(storageKey) || '{}') || {};
        all[key] = value;
        localStorage.setItem(storageKey, JSON.stringify(all));
    } catch (e) {}
}

// ========================================================
// 🐢 말하기 속도 (아이별 저장, 영어방 속도 단추와 설정창이 같은 값을 바꾼다)
// ========================================================
const ENGLISH_SPEECH_RATE_DEFAULT = 0.85; // 느린 학습자 민수 안심 기본 배속
const KOREAN_SPEECH_RATE_DEFAULT = 1.0;   // 1.0 = 요정 기본 속도(Edge +6%)

function readSpeechRate(key, legacyKey, fallback) {
    let rate = parseFloat(getStoredAppSetting(key));
    if (isNaN(rate) && legacyKey) {
        try { rate = parseFloat(localStorage.getItem(legacyKey)); } catch (e) {}
    }
    return (!isNaN(rate) && rate >= 0.4 && rate <= 2.0) ? rate : fallback;
}

function writeSpeechRate(key, rate) {
    const num = parseFloat(rate);
    if (isNaN(num) || num < 0.4 || num > 2.0) return;
    setStoredAppSetting(key, num);
    if (typeof window.updateSpeechRateUi === 'function') window.updateSpeechRateUi();
}

function getEnglishSpeechRate() {
    // 'english_speech_rate' 단독 키는 예전 저장 위치 (한 번 읽어 오는 용도)
    return readSpeechRate('english_speech_rate', 'english_speech_rate', ENGLISH_SPEECH_RATE_DEFAULT);
}

function setEnglishSpeechRate(rate) {
    writeSpeechRate('english_speech_rate', rate);
}

function getKoreanSpeechRate() {
    return readSpeechRate('korean_speech_rate', null, KOREAN_SPEECH_RATE_DEFAULT);
}

function setKoreanSpeechRate(rate) {
    writeSpeechRate('korean_speech_rate', rate);
}

/** 한국어 속도 배율 → Edge 속도 문자열 (1.0 → '+6%', 0.85 → '-10%', 1.15 → '+22%') */
function koreanRateToEdgePercent(rate) {
    const pct = Math.round((1.06 * rate - 1) * 100);
    return `${pct >= 0 ? '+' : ''}${pct}%`;
}

// ========================================================
// ✂️ 글 다듬기
// ========================================================

/** 긴 답변을 문장 단위로 나눈다 (문장부호 유지) */
function splitTextIntoSentences(text) {
    if (!text) return [];
    const rawChunks = text.split(/(?<=[.!?\n])\s+/);
    const sentences = [];

    for (let chunk of rawChunks) {
        const trimmed = chunk.trim();
        if (!trimmed) continue;
        // 너무 짧은 감탄사나 마침표만 있는 경우 앞 문장에 병합
        if (sentences.length > 0 && trimmed.length <= 2) {
            sentences[sentences.length - 1] += ' ' + trimmed;
        } else if (trimmed.length > 120) {
            // 한 문장이 너무 길면 쉼표 단위로 2차 분할
            const subChunks = trimmed.split(/(?<=[,])\s+/);
            sentences.push(...subChunks.filter(s => s.trim().length > 0));
        } else {
            sentences.push(trimmed);
        }
    }
    return sentences.length > 0 ? sentences : [text.trim()];
}

/** 텍스트의 주 언어가 영어인지 감지 */
function isEnglishText(text) {
    if (!text) return false;
    const str = String(text).trim();
    const hasKorean = /[가-힯ᄀ-ᇿ㄰-㆏]/.test(str);
    const englishMatch = str.match(/[a-zA-Z]/g);
    const englishLetters = englishMatch ? englishMatch.length : 0;

    // 한글이 없고 영문 알파벳이 포함되어 있으면 영어
    if (!hasKorean && englishLetters > 0) return true;

    // 한글과 영어가 혼합된 경우, 영문 비중이 70% 이상이면 영어
    const koreanMatch = str.match(/[가-힯]/g);
    const koreanLetters = koreanMatch ? koreanMatch.length : 0;
    return englishLetters > 0 && englishLetters >= koreanLetters * 2.5;
}

// '=' 앞 낱말의 받침에 맞춘 조사 (숫자는 한자어 읽기 기준: 일·삼·육·칠·팔·영/십/백/천은 받침 있음)
const DIGIT_TOPIC_JOSA = { 0: '은', 1: '은', 2: '는', 3: '은', 4: '는', 5: '는', 6: '은', 7: '은', 8: '은', 9: '는' };

function topicJosa(lastChar) {
    if (/\d/.test(lastChar)) return DIGIT_TOPIC_JOSA[lastChar];
    const code = lastChar.charCodeAt(0);
    if (code >= 0xAC00 && code <= 0xD7A3) return (code - 0xAC00) % 28 ? '은' : '는';
    return '는';
}

/** 수식 기호를 말로 바꾼다: "3+4=7" → "3 더하기 4는 7". '-'는 등호가 있는 식 안에서만 '빼기'("5-2학기" 보호) */
function speakMathSymbols(text) {
    return String(text)
        .replace(/\d[\d\s.+\-×÷*()]*=/g, expr => expr.replace(/([\d)])\s*-\s*(?=[\d(])/g, '$1 빼기 '))
        .replace(/(\d)\s*\+\s*(?=\d)/g, '$1 더하기 ')
        .replace(/(\d)\s*[×*]\s*(?=\d)/g, '$1 곱하기 ')
        .replace(/(\d)\s*÷\s*(?=\d)/g, '$1 나누기 ')
        .replace(/([\d가-힣)])\s*=\s*/g, (m, last) => `${last === ')' ? last + '는' : last + topicJosa(last)} `);
}

function cleanTextForTTS(rawText) {
    const original = String(rawText || '');
    const isQuestion = original.includes('?') || /(까|니|나요|가요|게요|죠|을까|ㄹ까)\s*$/g.test(original.trim());

    const cleaned = speakMathSymbols(original)
        .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/gu, '')
        .replace(/[\*\#\`\~\_\>\[\]\(\)\{\}\=\+\-\|\\]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    return { text: cleaned, isQuestion };
}

// ========================================================
// ⚡ Worker Edge 음성 (Cloudflare /api/tts)
// ========================================================

/** Worker 주소와 언어별 성우·속도 */
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
        // 영어는 원어민 속도로 받아 재생 배속(getEnglishSpeechRate)으로 늦추고, 한국어는 설정 속도로 합성
        rate: isEng ? '+0%' : koreanRateToEdgePercent(getKoreanSpeechRate()),
        pitch: isEng ? '+0Hz' : '+4Hz',
        isEnglish: isEng
    };
}

function cacheTtsAudioUrl(key, url) {
    ttsAudioBlobCache.set(key, url);
    if (ttsAudioBlobCache.size > TTS_CACHE_MAX_ITEMS) {
        const [oldKey, oldUrl] = ttsAudioBlobCache.entries().next().value;
        ttsAudioBlobCache.delete(oldKey);
        if (currentTtsAudio?.src !== oldUrl) URL.revokeObjectURL(oldUrl);
    }
}

function isCachedTtsAudioUrl(url) {
    for (const cached of ttsAudioBlobCache.values()) if (cached === url) return true;
    return false;
}

/** 다 쓴 문장 음성 해제 (캐시에 든 짧은 문장은 남긴다) */
function releaseTtsAudioUrl(url) {
    if (url && String(url).startsWith('blob:') && !isCachedTtsAudioUrl(url)) {
        try { URL.revokeObjectURL(url); } catch (e) {}
    }
}

/** Worker에서 문장 하나의 음성을 받아 Blob 주소로 돌려준다 */
async function fetchCloudflareEdgeTtsAudio(sentence, config) {
    const trimmed = sentence.trim();
    if (!trimmed) return null;

    const cacheKey = `edge_${config.voice}_${config.rate}_${trimmed}`;
    if (ttsAudioBlobCache.has(cacheKey)) {
        const url = ttsAudioBlobCache.get(cacheKey);
        ttsAudioBlobCache.delete(cacheKey); // 최근 사용 순서로 다시 넣기
        ttsAudioBlobCache.set(cacheKey, url);
        return url;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TTS_FETCH_TIMEOUT_MS);

    try {
        const response = await fetch(config.workerUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: trimmed,
                voice: config.voice || 'ko-KR-SunHiNeural',
                rate: config.rate || '+6%',
                pitch: config.pitch || '+4Hz'
            }),
            signal: controller.signal
        });
        if (!response.ok) throw new Error(`Edge-TTS Worker HTTP ${response.status}`);

        const blob = await response.blob();
        if (blob.size === 0) throw new Error('Empty audio response');

        const audioUrl = URL.createObjectURL(blob);
        if (trimmed.length <= TTS_CACHE_MAX_CHARS) cacheTtsAudioUrl(cacheKey, audioUrl);
        return audioUrl;
    } finally {
        clearTimeout(timeoutId);
    }
}

/**
 * 🚀 문장 대기열 재생기 (실시간 음성 공통)
 * - 지금 문장 + 다음 TTS_PREFETCH_AHEAD 문장만 미리 받는다
 * - 첫 문장부터 실패하면 Promise를 거절해 호출한 쪽이 브라우저 음성으로 넘어가게 한다
 * - 중간 문장이 실패하면 건너뛰고, 끝나면 onEnd를 한 번 부른다 (새 발화·정지로 끊기면 부르지 않음)
 * - 첫 문장 재생이 시작되면 Promise가 풀린다
 */
function playTtsSentenceQueue(sentences, fetchAudio, { playbackRate = 1, label = 'TTS', onEnd = null } = {}) {
    stopFairyTTS(true); // 같은 발화의 엔진 전환은 재생 UI를 유지
    const sessionId = ++currentTtsSessionId;
    const isLive = () => sessionId === currentTtsSessionId;
    const pending = new Map();
    let index = 0;
    let started = false;

    const request = i => {
        if (i >= sentences.length || pending.has(i)) return;
        const promise = Promise.resolve().then(() => fetchAudio(sentences[i]));
        promise.catch(() => {}); // 실패는 차례가 왔을 때 처리
        pending.set(i, promise);
    };
    const releaseFrom = from => {
        for (const [i, promise] of pending) {
            if (i >= from) promise.then(releaseTtsAudioUrl, () => {});
        }
    };
    const stopQueue = () => {
        isPlayingTtsQueue = false;
        currentTtsAudio = null;
        if (releaseActiveTtsQueue === releaseQueue) releaseActiveTtsQueue = null;
    };
    const releaseQueue = () => releaseFrom(index);

    isPlayingTtsQueue = true;
    releaseActiveTtsQueue = releaseQueue;

    return new Promise((resolveStart, rejectStart) => {
        const fail = (i, err) => {
            if (!started) {
                stopQueue();
                releaseFrom(i + 1);
                rejectStart(err);
                return;
            }
            console.warn(`[${label}] ${i + 1}번째 문장 실패, 건너뜀:`, err?.message || err);
            playAt(i + 1);
        };

        const playAt = async i => {
            index = i;
            if (!isLive()) return;
            if (i >= sentences.length) {
                stopQueue();
                resolveStart();
                if (onEnd) onEnd();
                return;
            }
            for (let k = i; k <= i + TTS_PREFETCH_AHEAD; k++) request(k);

            let url;
            try {
                url = await pending.get(i);
            } catch (err) {
                if (isLive()) fail(i, err);
                return;
            }
            if (!isLive()) { releaseTtsAudioUrl(url); return; }
            if (!url) { playAt(i + 1); return; } // 빈 문장

            const audio = new Audio(url);
            if (playbackRate !== 1) audio.playbackRate = playbackRate;
            currentTtsAudio = audio;
            let done = false;
            const finishSentence = err => {
                if (done || !isLive()) return;
                done = true;
                audio.onended = audio.onerror = null;
                releaseTtsAudioUrl(url);
                if (err) fail(i, err);
                else playAt(i + 1);
            };
            audio.onended = () => finishSentence(null);
            audio.onerror = e => finishSentence(new Error(`재생 오류 ${e?.type || ''}`.trim()));
            try {
                await audio.play();
                if (!isLive()) return;
                started = true;
                resolveStart();
            } catch (err) {
                finishSentence(err);
            }
        };

        playAt(0);
    });
}

/** Worker Edge 음성으로 긴 글을 문장 단위로 이어 읽기 */
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
    if (!config.workerUrl) throw new Error('TTS_WORKER_URL_NOT_FOUND');

    const sentences = splitTextIntoSentences(fullText);
    const voiceLabel = config.isEnglish ? 'Jenny (미국 원어민)' : 'SunHi (한국어 요정)';
    console.log(`🎙️ [Edge-TTS] 총 ${sentences.length}개 문장 [${voiceLabel}] 재생 시작`);

    await playTtsSentenceQueue(sentences, s => fetchCloudflareEdgeTtsAudio(s, config), {
        playbackRate: config.isEnglish ? getEnglishSpeechRate() : 1,
        label: 'Edge-TTS',
        onEnd: onEndCallback
    });
}

/** 🇺🇸 미국 원어민(Jenny) 전용 발화 (영어방) */
async function speakEnglish(text, onEndCallback = null) {
    const trimmed = String(text || '').trim();
    if (!trimmed || localStorage.getItem('fairy_tts_enabled') === 'false') {
        if (onEndCallback) onEndCallback();
        return;
    }

    try {
        const enVoice = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.DEFAULT_ENGLISH_VOICE) || 'en-US-JennyNeural';
        await playCloudflareEdgeTtsStream(trimmed, onEndCallback, enVoice);
    } catch (err) {
        console.warn('⚠️ [원어민 TTS 대체] 브라우저 영어 음성으로 전환합니다:', err);
        speakWebSpeechFallback(trimmed, false, onEndCallback, { forceVoice: 'en-US' });
    }
}

// ========================================================
// 🗣️ 브라우저 음성(WebSpeech) 대체
// ========================================================

/** 브라우저 내 최고 음질 한국어 보이스 */
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

/** 첫 터치 때 브라우저 음성을 깨워 둔다 (모바일 자동재생 제한 대비). 여러 화면이 직접 부른다 */
function initFairyAudio() {
    const unlockOnce = () => {
        unlockFairySpeechEngine();
        document.removeEventListener('click', unlockOnce);
        document.removeEventListener('touchstart', unlockOnce);
        document.removeEventListener('mousedown', unlockOnce);
    };
    document.addEventListener('click', unlockOnce);
    document.addEventListener('touchstart', unlockOnce);
    document.addEventListener('mousedown', unlockOnce);
}

function speakWebSpeechFallback(cleanText, isQuestion, onEndCallback, options = {}) {
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

    const isEng = (options && options.forceVoice && (options.forceVoice.includes('Jenny') || options.forceVoice.includes('en-'))) || isEnglishText(cleanText);

    const runSpeak = () => {
        if (sessionId !== currentTtsSessionId) return; // 최신 세션이 아니면 취소

        try {
            const utterance = new SpeechSynthesisUtterance(cleanText);
            if (isEng) {
                utterance.lang = 'en-US';
                utterance.rate = getEnglishSpeechRate();
                const voices = window.speechSynthesis.getVoices() || [];
                const enVoice = voices.find(v => v.lang && v.lang.startsWith('en') && (v.name.includes('Jenny') || v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha')));
                if (enVoice) utterance.voice = enVoice;
            } else {
                utterance.lang = 'ko-KR';
                utterance.rate = (isQuestion ? 1.0 : 1.05) * getKoreanSpeechRate();
                utterance.pitch = isQuestion ? 1.22 : 1.06;
                const bestVoice = getBestKoreanVoice();
                if (bestVoice) utterance.voice = bestVoice;
            }

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

// ========================================================
// 📢 요정 음성 메인 출력
// ========================================================

/**
 * 순서: ① 센터 고정 MP3 → ② 녹음된 짧은 음성(코코 프리셋·캐릭터 목소리) → ③ Worker 실시간 음성 → ④ 브라우저 음성
 * 두 번째 인자로 옵션 객체를 넘겨도 된다: speakFairyTTS(text, { skipPreset: true })
 */
async function speakFairyTTS(text, onEndCallback = null, options = {}) {
    if (onEndCallback && typeof onEndCallback === 'object' && !options.forceVoice && !options.skipPreset) {
        options = onEndCallback;
        onEndCallback = null;
    }

    stopFairyTTS(); // 새 발화 요청 시 이전 오디오/TTS 즉시 중단

    const trimmed = String(text || '').trim();
    if (!trimmed || localStorage.getItem('fairy_tts_enabled') === 'false') {
        if (onEndCallback) onEndCallback();
        return;
    }

    // ① 센터 고정 콘텐츠는 실제 대본·설정 해시가 일치하는 Edge MP3를 먼저 재생한다.
    if (window.CenterReadingAudio && !options.skipStatic && !options.forceVoice?.startsWith('en-')) {
        const sessionId = currentTtsSessionId;
        try {
            const handled = await window.CenterReadingAudio.play(trimmed, {
                onEnd: onEndCallback,
                onError: () => {
                    if (sessionId === currentTtsSessionId) {
                        speakFairyTTS(trimmed, onEndCallback, { ...options, skipStatic: true });
                    }
                }
            });
            if (handled || sessionId !== currentTtsSessionId) return;
        } catch (error) {
            if (sessionId !== currentTtsSessionId) return;
            console.warn('[센터 MP3] 실시간 음성으로 전환:', error.message);
        }
    }

    // ② 녹음된 짧은 음성 (fairy-engine.js의 키워드 라우터. 챗봇·긴 글은 건너뜀)
    const isSkipPreset = (options && options.skipPreset) || trimmed.length > 25 || trimmed.includes('\n');
    if (!isSkipPreset && typeof resolveFairyPresetAudio === 'function') {
        const matchedPresetAudio = resolveFairyPresetAudio(trimmed);
        if (matchedPresetAudio) {
            playFairyPresetAudio(matchedPresetAudio, onEndCallback);
            return;
        }
    }

    const { text: cleanText, isQuestion } = cleanTextForTTS(text);
    if (!cleanText) {
        if (onEndCallback) onEndCallback();
        return;
    }

    // ③ Worker 실시간 음성 (Edge, 막히면 Worker가 OpenAI로 대신)
    try {
        await playCloudflareEdgeTtsStream(cleanText, onEndCallback, (options && options.forceVoice) || null);
        return;
    } catch (edgeError) {
        console.warn('ℹ️ [실시간 음성 미응답] 브라우저 음성으로 전환합니다:', edgeError?.message || edgeError);
    }

    // ④ 브라우저 음성
    speakWebSpeechFallback(cleanText, isQuestion, onEndCallback, options);
}

/** 🛑 모든 음성 즉시 정지 */
function stopFairyTTS(preserveStatus = false) {
    currentTtsSessionId++;
    isPlayingTtsQueue = false;
    if (releaseActiveTtsQueue) {
        const release = releaseActiveTtsQueue;
        releaseActiveTtsQueue = null;
        release();
    }
    if (window.CenterReadingAudio) window.CenterReadingAudio.stop();
    if (!preserveStatus && typeof window.dispatchEvent === 'function') window.dispatchEvent(new Event('fairy-audio-stop'));

    if (currentTtsAudio) {
        try {
            currentTtsAudio.onended = currentTtsAudio.onerror = null;
            currentTtsAudio.pause();
            currentTtsAudio.currentTime = 0;
        } catch (e) {}
        currentTtsAudio = null;
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
    }
}

/** 녹음된 짧은 음성 재생 (파일 이름만 주면 코코 음성 폴더 기준) */
function playFairyPresetAudio(src, onEndCallback = null) {
    stopFairyTTS();
    if (localStorage.getItem('fairy_tts_enabled') === 'false') {
        if (onEndCallback) onEndCallback();
        return;
    }

    try {
        let fullSrc = src;
        if (!src.includes('/') && !src.includes('\\') && typeof getFairyAssetBaseUrl === 'function') {
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
            if (err && err.name !== 'AbortError') {
                console.warn('오디오 자동재생 제한:', err);
            }
            if (onEndCallback) onEndCallback();
        });
    } catch (err) {
        if (onEndCallback) onEndCallback();
    }
}

// 🌐 전역 공개 (화면들이 부르는 이름 그대로)
window.speakFairyTTS = speakFairyTTS;
window.fairySpeak = speakFairyTTS;
window.speak = speakFairyTTS;
window.speakFairy = speakFairyTTS;
window.speakEnglish = speakEnglish;
window.stopFairyTTS = stopFairyTTS;
window.playFairyPresetAudio = playFairyPresetAudio;
window.playFairyPreset = playFairyPresetAudio;
window.getBestKoreanVoice = getBestKoreanVoice;
window.unlockFairySpeechEngine = unlockFairySpeechEngine;
window.initFairyAudio = initFairyAudio;
window.isEnglishText = isEnglishText;
window.getCloudflareEdgeTtsConfig = getCloudflareEdgeTtsConfig;
window.fetchCloudflareEdgeTtsAudio = fetchCloudflareEdgeTtsAudio;
window.playCloudflareEdgeTtsStream = playCloudflareEdgeTtsStream;
window.getEnglishSpeechRate = getEnglishSpeechRate;
window.setEnglishSpeechRate = setEnglishSpeechRate;
window.getKoreanSpeechRate = getKoreanSpeechRate;
window.setKoreanSpeechRate = setKoreanSpeechRate;

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    // 예전 OpenAI 직접 호출용으로 기기에 저장됐던 키를 지운다 (키는 Worker 비밀값에만 둔다)
    try {
        localStorage.removeItem('OPENAI_API_KEY');
        localStorage.removeItem('OPENAI_TTS_VOICE');
    } catch (e) {}
    window.addEventListener('DOMContentLoaded', initFairyAudio);
}
