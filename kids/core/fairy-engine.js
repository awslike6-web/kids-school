// 📄 kids/core/fairy-engine.js (요정 코코 녹음 음성 · 캐릭터 목소리 · 칭찬/응원/보상 헬퍼 · 음성 토글)
// - 실시간 음성 합성(speakFairyTTS·대기열·정지·말하기 속도)은 fairy-tts.js에 있고, 그 파일이 먼저 실려야 한다.
// - 코코 녹음 음성 목록(FAIRY_AUDIO_PRESETS)·캐릭터 목소리 목록(VOICE_CATALOG)은 fairy-settings-catalog.js.

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
 * 🧚 요정 코코 녹음 음성 (목록: fairy-settings-catalog.js의 FAIRY_AUDIO_PRESETS)
 * 목록이 아직 없으면 null → 소리 없이 넘어간다 (모든 화면이 목록을 먼저 싣는다: tests/fairy-tts.test.mjs)
 */
function cocoPresetFile(key) {
    if (typeof FAIRY_AUDIO_PRESETS === 'undefined') return null;
    const name = (FAIRY_AUDIO_PRESETS.aliases && FAIRY_AUDIO_PRESETS.aliases[key]) || key;
    const file = FAIRY_AUDIO_PRESETS[name];
    return typeof file === 'string' ? getFairyAssetBaseUrl() + file : null;
}

function cocoRandomFile(listKey) {
    const list = typeof FAIRY_AUDIO_PRESETS !== 'undefined' ? FAIRY_AUDIO_PRESETS[listKey] : null;
    if (!Array.isArray(list) || list.length === 0) return null;
    return getFairyAssetBaseUrl() + list[Math.floor(Math.random() * list.length)];
}

/** 녹음 음성 재생. 파일이 없으면 소리 없이 끝 콜백만 부른다 */
function playFairyVoiceOrSkip(src, onEndCallback) {
    if (src) playFairyPresetAudio(src, onEndCallback);
    else if (onEndCallback) onEndCallback();
}

/**
 * 🎯 입력 텍스트/의도에 따른 고음질 선희 Neural 프리셋 및 캐릭터(깐죽이/깍쟁이) 음성 매칭 라우터
 */
function resolveFairyPresetAudio(text) {
    if (!text) return null;
    const trimmed = String(text).trim();
    // 💡 문장이 길거나(35자 초과) 줄바꿈이 포함된 AI 생성 문단은 프리셋 가로채기 방지 (실시간 TTS 낭독)
    if (trimmed.length > 35 || trimmed.includes('\n')) return null;

    // 1) 직접 프리셋 키 매핑 (옛 이름 포함)
    const direct = cocoPresetFile(trimmed);
    if (direct) return direct;

    // 2) 퀘스트 완료 / 보상 / 레벨업 키워드 매칭
    if (/퀘스트.*완료|미션.*완료|퀘스트를.*완료/i.test(trimmed)) {
        return pickPersonaVoiceFile('clear') || cocoPresetFile('quest_complete');
    }
    if (/레벨업|레벨.*올랐/i.test(trimmed)) return cocoPresetFile('level_up');
    if (/다이아|보석/i.test(trimmed)) return cocoPresetFile('reward_diamond');
    if (/별조각|황금.*별/i.test(trimmed)) return cocoPresetFile('reward_star');
    if (/공부.*끝|오늘.*학습.*완료|오늘.*공부.*완료/i.test(trimmed)) {
        return pickPersonaVoiceFile('clear') || cocoPresetFile('study_finish');
    }
    if (/연속.*학습|스트릭/i.test(trimmed)) return cocoPresetFile('streak_bonus');

    // 3) 환영 인사 키워드 매칭
    if (/민민이네.*공부방|공부방에.*온.*걸|로비/i.test(trimmed)) {
        return pickPersonaVoiceFile('welcome') || cocoPresetFile('welcome_lobby');
    }
    if (/민수야.*안녕|민수.*퀘스트/i.test(trimmed)) {
        return pickPersonaVoiceFile('welcome') || cocoPresetFile('welcome_minsu');
    }
    if (/민서야.*반가워|민서.*별/i.test(trimmed)) {
        return pickPersonaVoiceFile('welcome') || cocoPresetFile('welcome_minseo');
    }
    if (/수학.*탐험|수학.*배움/i.test(trimmed)) return cocoPresetFile('welcome_math');
    if (/국어.*배움|국어.*탐험/i.test(trimmed)) return cocoPresetFile('welcome_korean');
    if (/사회.*탐험|사회.*배움/i.test(trimmed)) return cocoPresetFile('welcome_society');
    if (/과학.*실험|과학.*탐험/i.test(trimmed)) return cocoPresetFile('welcome_science');
    if (/영어.*모험|영어.*배움/i.test(trimmed)) return cocoPresetFile('welcome_english');

    // 4) 오답 & 응원/힌트 키워드 우선 매칭 (예: "아쉽네요! 정답은 14"와 같이 오답 문구 내 정답 단어 포함 시 오답 우선 판별)
    if (/아쉽|아쉬|틀렸|오답|땡|다시.*생각|다시.*한번|힌트|힘내|포기하지|괜찮아|도전|아깝/i.test(trimmed)) {
        const personaWrong = pickPersonaVoiceFile('wrong');
        if (personaWrong) return personaWrong;
        return cocoRandomFile('encourages');
    }

    // 5) 정답 & 칭찬 키워드 매칭 (오답 멘트가 아닐 때만 순수 정답으로 처리)
    if (!/아쉽|아쉬|틀렸|오답|땡|다시/i.test(trimmed) && /정답|완벽|대단|천재|멋져|딩동댕|최고|잘했|맞혔|맞았|훌륭/i.test(trimmed)) {
        const personaCorrect = pickPersonaVoiceFile('correct');
        if (personaCorrect) return personaCorrect;
        return cocoRandomFile('praises');
    }

    // 6) 시작 & 집중 키워드 매칭
    if (/집중|시작해|출발/i.test(trimmed)) return cocoPresetFile('focus_start');
    if (/준비.*완료|신나는.*퀴즈/i.test(trimmed)) return cocoPresetFile('ready_go');
    if (/차근차근.*읽어/i.test(trimmed)) return cocoPresetFile('think_careful');
    if (/비밀.*힌트|힌트를.*열어/i.test(trimmed)) return cocoPresetFile('hint_open');

    return null;
}

/**
 * 🔍 페이지 위치에 관계없이 캐릭터 전용 보이스(/assets/voices/) 기본 경로 반환
 */
function getFairyVoiceAssetBaseUrl() {
    if (typeof document !== 'undefined') {
        const scripts = document.getElementsByTagName('script');
        for (let s of scripts) {
            if (s.src && s.src.includes('fairy-engine.js')) {
                const coreUrl = s.src.substring(0, s.src.lastIndexOf('/')); // .../kids/core
                const kidsUrl = coreUrl.substring(0, coreUrl.lastIndexOf('/')); // .../kids
                return kidsUrl + '/assets/voices/';
            }
        }
    }
    return './kids/assets/voices/';
}

/**
 * 🛡️ SettingsManager 유무에 관계없이 안전하게 현재 학생의 voice_persona 추출 (자가 치유 파사드)
 */
function getSafeVoicePersona() {
    if (typeof SettingsManager !== 'undefined' && typeof SettingsManager.get === 'function') {
        return SettingsManager.get('voice_persona') || 'default';
    }
    return getStoredAppSetting('voice_persona') || 'default'; // fairy-tts.js
}

/**
 * 🛡️ 효과음/음성 활성화 여부 안전 조회
 */
function isSafeSfxEnabled() {
    if (typeof SettingsManager !== 'undefined' && typeof SettingsManager.get === 'function') {
        return SettingsManager.get('sfx_enabled');
    }
    const stored = getStoredAppSetting('sfx_enabled'); // fairy-tts.js
    return stored === undefined ? true : !!stored;
}

// 🎙️ 직전 재생 음성 추적 (연속 동일 음성 반복 방지, 키: '{목소리id}:{상황}')
const _lastFairyAudioPlayed = {};

function getNonRepeatingRandomFairyVoice(list, trackKey) {
    if (!list || list.length === 0) return null;
    if (list.length === 1) return list[0];
    const last = _lastFairyAudioPlayed[trackKey];
    const filtered = list.filter(f => f !== last);
    const chosen = (filtered.length > 0)
        ? filtered[Math.floor(Math.random() * filtered.length)]
        : list[Math.floor(Math.random() * list.length)];
    _lastFairyAudioPlayed[trackKey] = chosen;
    return chosen;
}

/**
 * 🎙️ 캐릭터 목소리 고르기: 목소리 목록(fairy-settings-catalog.js의 VOICE_CATALOG)만 보고 파일을 고른다.
 * 파일 규칙: assets/voices/{voiceDir}/{voiceDir}_{상황}_{01~}.wav (상황: welcome·correct·wrong·clear)
 * 기본 요정 목소리로 돌아가는 경우: 기본 선택, 목록 미로딩, 파일 없는 '준비중' 목소리, 다른 아이 전용 목소리
 */
function getActiveVoicePersona() {
    const id = getSafeVoicePersona();
    if (id === 'default' || typeof VOICE_CATALOG === 'undefined') return null;
    const voice = VOICE_CATALOG.find(v => v.id === id);
    if (!voice || !voice.voiceDir || !voice.files) return null;
    if (voice.target !== 'all' && voice.target !== getSafeStudent()) return null;
    return voice;
}

function pickPersonaVoiceFile(kind) {
    const voice = getActiveVoicePersona();
    const count = voice ? (voice.files[kind] || 0) : 0;
    if (!count) return null;
    const list = Array.from({ length: count }, (_, i) => `${voice.voiceDir}_${kind}_${String(i + 1).padStart(2, '0')}.wav`);
    const chosen = getNonRepeatingRandomFairyVoice(list, `${voice.id}:${kind}`);
    return getFairyVoiceAssetBaseUrl() + voice.voiceDir + '/' + chosen;
}

/**
 * 📚 목소리 목록을 싣지 않는 화면에서도 캐릭터 목소리가 나오도록, 엔진 옆의 목록 파일을 한 번 불러온다.
 * 불러오기 전에 울리는 음성은 기본 요정 목소리로 나간다.
 */
function ensureVoiceCatalogLoaded() {
    if (typeof VOICE_CATALOG !== 'undefined' || typeof document === 'undefined') return;
    if (document.querySelector('script[src*="fairy-settings-catalog.js"]')) return;
    const engine = Array.from(document.getElementsByTagName('script')).find(s => s.src && s.src.includes('fairy-engine.js'));
    if (!engine) return;
    const tag = document.createElement('script');
    tag.src = engine.src.substring(0, engine.src.lastIndexOf('/') + 1) + 'fairy-settings-catalog.js';
    (document.head || document.documentElement).appendChild(tag);
}

/**
 * 🌟 정답/극찬 전용 헬퍼 (캐릭터 목소리 정답 파일 중 무작위, 없으면 선희 고음질 칭찬)
 */
function fairyPraise(onEndCallback = null) {
    if (!isSafeSfxEnabled()) {
        if (onEndCallback) onEndCallback();
        return;
    }
    const personaFile = pickPersonaVoiceFile('correct');
    if (personaFile) {
        playFairyPresetAudio(personaFile, onEndCallback);
        return;
    }

    playFairyVoiceOrSkip(cocoRandomFile('praises'), onEndCallback);
}

/**
 * 🌸 오답/응원 전용 헬퍼 (캐릭터 목소리 오답 파일 중 무작위, 없으면 선희 고음질 응원)
 */
function fairyEncourage(onEndCallback = null) {
    if (!isSafeSfxEnabled()) {
        if (onEndCallback) onEndCallback();
        return;
    }
    const personaFile = pickPersonaVoiceFile('wrong');
    if (personaFile) {
        playFairyPresetAudio(personaFile, onEndCallback);
        return;
    }

    playFairyVoiceOrSkip(cocoRandomFile('encourages'), onEndCallback);
}

/**
 * 🎁 퀘스트/레벨업/보상/완주 전용 헬퍼
 */
function fairyReward(type = 'quest', onEndCallback = null) {
    if (!isSafeSfxEnabled()) {
        if (onEndCallback) onEndCallback();
        return;
    }

    // 🛡️ 직전 정답 음성과 타이밍 충돌 방지: 직전 오디오 즉시 안전 정지
    stopFairyTTS();

    // 완주·퀘스트 완료는 캐릭터 목소리 완주 파일
    const personaFile = (type === 'finish' || type === 'quest') ? pickPersonaVoiceFile('clear') : null;
    if (personaFile) {
        playFairyPresetAudio(personaFile, onEndCallback);
        return;
    }

    const map = {
        quest: 'quest_complete',
        level: 'level_up',
        diamond: 'reward_diamond',
        star: 'reward_star',
        finish: 'study_finish',
        streak: 'streak_bonus'
    };
    playFairyVoiceOrSkip(cocoPresetFile(map[type] || 'quest_complete'), onEndCallback);
}

/**
 * 🏰 환영/과목 입장 전용 헬퍼
 */
function fairyGreet(target = 'lobby', onEndCallback = null) {
    if (!isSafeSfxEnabled()) {
        if (onEndCallback) onEndCallback();
        return;
    }

    // 로비·아이 이름 인사는 캐릭터 목소리 첫인사 파일 (과목 입장 인사는 요정 코코 그대로)
    const personaFile = ['lobby', 'minsu', 'minseo'].includes(target) ? pickPersonaVoiceFile('welcome') : null;
    if (personaFile) {
        playFairyPresetAudio(personaFile, onEndCallback);
        return;
    }

    const map = {
        lobby: 'welcome_lobby',
        minsu: 'welcome_minsu',
        minseo: 'welcome_minseo',
        math: 'welcome_math',
        korean: 'welcome_korean',
        society: 'welcome_society',
        science: 'welcome_science',
        english: 'welcome_english'
    };
    playFairyVoiceOrSkip(cocoPresetFile(map[target] || 'welcome_lobby'), onEndCallback);
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

// 🌐 브라우저 전역 공개
window.fairyPraise = fairyPraise;
window.fairyEncourage = fairyEncourage;
window.fairyReward = fairyReward;
window.fairyGreet = fairyGreet;
window.resolveFairyPresetAudio = resolveFairyPresetAudio;
window.pickPersonaVoiceFile = pickPersonaVoiceFile;
window.getFairyAssetBaseUrl = getFairyAssetBaseUrl;
window.toggleFairyTtsSetting = toggleFairyTtsSetting;
window.updateTtsToggleUi = updateTtsToggleUi;

// 초기화
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', updateTtsToggleUi);
    // 목소리 목록: 화면의 <script> 태그가 모두 실행된 뒤 확인해야 중복으로 싣지 않는다
    if (typeof document !== 'undefined' && document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', ensureVoiceCatalogLoaded);
    } else {
        ensureVoiceCatalogLoaded();
    }
}
