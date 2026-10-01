// kids/js/english_phonics.js
// 🔤 [1단계 & 3단계] 초등 영어 파닉스 디딤돌 및 음성 훈련 엔진 (EnglishPhonics)
// - 1:1 파닉스 한글 발음 사전, Jenny Neural TTS 음성 및 4단계 배속 제어
// - [1단계] 알파벳 터치방 / [3단계] 소리 귀 뚫기(파닉스/듣기 퀴즈)
// - 네임스페이스: window.EnglishPhonics

(function() {
    'use strict';

    // ========================================================
    // 🗣️ 초등 영어 파닉스(한글 발음) 1:1 딕셔너리
    // ========================================================
    const ENGLISH_PHONICS_DICT = {
        // 의문사 & 조동사 & be동사
        "what": "왓", "where": "웨어", "how": "하우", "when": "웬", "who": "후", "why": "와이",
        "did": "디드", "do": "두", "does": "더즈", "done": "던", "doing": "두잉",
        "is": "이즈", "was": "워즈", "are": "아", "were": "워", "am": "앰", "be": "비", "been": "빈",
        "can": "캔", "could": "쿠드", "will": "윌", "would": "우드", "should": "슈드", "may": "메이",

        // 인칭대명사 & 지시대명사 & 부사
        "i": "아이", "you": "유", "he": "히", "she": "쉬", "it": "잇", "we": "위", "they": "데이",
        "my": "마이", "your": "유어", "his": "히즈", "her": "허", "its": "잇츠", "our": "아워", "their": "데어",
        "me": "미", "him": "힘", "them": "뎀", "us": "어스",
        "this": "디스", "that": "댓", "these": "디즈", "those": "도즈",
        "there": "데어", "here": "히어", "now": "나우", "then": "덴", "too": "투", "very": "베리",

        // 7단원 (지난 일 묻고 답하기) 핵심 단어 & 동사 과거형
        "last": "래스트", "played": "플레이드", "play": "플레이", "basketball": "배스킷볼", "baseball": "베이스볼", "soccer": "사커",
        "took": "툭", "take": "테이크", "many": "매니", "pictures": "픽처스", "picture": "픽처",
        "visited": "비지티드", "visit": "비짓", "grandpa": "그랜파", "grandparents": "그랜드패런츠",
        "watched": "왓치드", "watch": "왓치", "movie": "무비", "movies": "무비스",
        "saw": "쏘", "see": "씨", "cleaned": "클린드", "clean": "클린", "room": "룸",
        "went": "웬트", "go": "고", "camping": "캠핑", "camp": "캠프", "campfire": "캠프파이어",
        "fun": "펀", "hard": "하드", "boring": "보링", "great": "그레이트", "good": "굿", "nice": "나이스",
        "delicious": "딜리셔스", "food": "푸드", "chicken": "치킨", "made": "메이드", "make": "메이크", "car": "카",
        "ate": "에이트", "eat": "잇", "summer": "서머", "weekend": "위켄드", "yesterday": "예스터데이",
        "wonderful": "원더풀", "family": "패밀리", "dad": "대드", "mom": "맘",

        // 8단원 (외모 & 옷차림 묘사 & 친구 찾기) 핵심 단어
        "curly": "컬리", "straight": "스트레이트", "short": "쇼트", "long": "롱", "blonde": "블론드", "blond": "블론드",
        "hair": "헤어", "brown": "브라운", "blue": "블루", "green": "그린", "black": "블랙", "red": "레드", "hazel": "헤이즐",
        "eyes": "아이즈", "eye": "아이", "glasses": "글래시스", "pants": "팬츠", "shirt": "셔츠", "t-shirt": "티셔츠", "tshirt": "티셔츠", "dress": "드레스", "skirt": "스커트",
        "jacket": "재킷", "scarf": "스카프", "hat": "햇", "cap": "캡", "shoes": "슈즈", "shoe": "슈",
        "wear": "웨어", "wearing": "웨어링", "wore": "워", "find": "파인드", "cry": "크라이",
        "wrong": "롱", "girl": "걸", "boy": "보이", "ask": "애스크", "any": "애니", "looks": "룩스", "cool": "쿨",
        "sam": "샘", "brother": "브라더", "sister": "시스터",
        "magic": "매직", "show": "쇼", "snow": "스노", "snowing": "스노잉", "yellow": "옐로", "together": "투게더",

        // 9단원 (집 & 방 & 사물과 위치) 핵심 단어
        "house": "하우스", "living": "리빙", "bathroom": "배쓰룸", "bedroom": "베드룸", "garden": "가든",
        "toilet": "토일렛", "chair": "체어", "chairs": "체어스", "kitchen": "키친", "dream": "드림",
        "tree": "트리", "trees": "트리스", "4": "포", "four": "포",

        // 11단원 (길 찾기 & 장소 안내) 핵심 단어
        "library": "라이브러리", "turn": "턴", "left": "레프트", "right": "라이트",
        "corner": "코너", "first": "퍼스트", "second": "세컨드", "third": "써드", "floor": "플로어",
        "school": "스쿨", "park": "파크", "hospital": "하스피털", "post": "포스트", "office": "오피스",
        "bank": "뱅크", "bookstore": "북스토어", "behind": "비하인드", "front": "프런트", "excuse": "익스큐즈",
        "station": "스테이션", "store": "스토어", "market": "마켓",

        // 관사 & 전치사 & 접속사
        "a": "어", "an": "앤", "the": "더",
        "in": "인", "on": "온", "at": "앳", "to": "투", "for": "포", "of": "오브", "with": "위드",
        "next": "넥스트", "under": "언더", "by": "바이", "about": "어바웃",
        "and": "앤드", "but": "벗", "so": "쏘", "because": "비코즈",

        // 기타 주요 초등 어휘
        "hello": "헬로", "hi": "하이", "bye": "바이", "thanks": "땡큐", "thank": "땡크",
        "please": "플리즈", "sorry": "쏘리", "help": "헬프", "like": "라이크", "liked": "라이크트",
        "have": "해브", "had": "헤드", "has": "해즈", "want": "원트", "need": "니드",
        "look": "룩", "listen": "리슨", "read": "리드", "write": "라이트", "speak": "스피크",
        "night": "나이트", "nose": "노즈", "nest": "네스트", "nut": "너트", "net": "넷",
        "neck": "넥", "music": "뮤직", "moon": "문", "milk": "밀크", "melon": "멜론", "monkey": "멍키", "mouse": "마우스",

        // 축약형
        "what's": "왓츠", "it's": "잇츠", "i'm": "아임", "you're": "유어", "he's": "히즈", "she's": "쉬즈",
        "we're": "위어", "they're": "데어", "don't": "돈트", "didn't": "디든트", "can't": "캔트", "let's": "렛츠"
    };

    // ==========================================
    // 🗣️ 원어민 음성 출력 엔진 (TTS - 미국 원어민 Jenny Neural)
    // ==========================================
    function speakEnglish(text, onEndCallback = null) {
        if (!text) return;
        if (typeof window.speakEnglishFromCore === 'function') {
            window.speakEnglishFromCore(text, onEndCallback);
            return;
        }
        if (typeof window.playCloudflareEdgeTtsStream === 'function') {
            window.playCloudflareEdgeTtsStream(text, onEndCallback, 'en-US-JennyNeural').catch(() => {
                fallbackWebSpeech(text, onEndCallback);
            });
            return;
        }
        fallbackWebSpeech(text, onEndCallback);
    }

    function fallbackWebSpeech(text, onEndCallback = null) {
        if ('speechSynthesis' in window) {
            try { window.speechSynthesis.cancel(); } catch (e) {}
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'en-US'; 
            const speechRate = (typeof window.getEnglishSpeechRate === 'function') ? window.getEnglishSpeechRate() : 0.85;
            utterance.rate = speechRate; 
            if (onEndCallback) utterance.onend = onEndCallback;
            window.speechSynthesis.speak(utterance);
        } else {
            console.warn("이 기기에서는 음성 지원(TTS)이 되지 않습니다.");
            if (onEndCallback) onEndCallback();
        }
    }

    function getEnglishSpeechRateChipsHtml() {
        const currentRate = (typeof window.getEnglishSpeechRate === 'function') ? window.getEnglishSpeechRate() : 0.85;
        const rates = [
            { rate: 0.5, label: '🐢 0.5x 아주 느리게' },
            { rate: 0.75, label: '🌱 0.75x 느리게' },
            { rate: 0.85, label: '🟩 0.85x 민수 안심' },
            { rate: 1.0, label: '⚡ 1.0x 보통' }
        ];
        return `
            <div class="speech-rate-control-box">
                <div class="speech-rate-title">
                    🎧 원어민 발음 속도 선택
                </div>
                <div class="speech-rate-chip-group">
                    ${rates.map(r => `
                        <button type="button" 
                                class="speech-rate-chip ${Math.abs(currentRate - r.rate) < 0.03 ? 'active' : ''}" 
                                onclick="window.changeEnglishSpeechRate(${r.rate})" 
                                title="${r.label}">
                            ${r.label}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // ========================================================
    // 📖 파닉스 한글 발음 디딤돌 엔진
    // ========================================================
    function getPhonicsKorean(rawWord) {
        if (!rawWord) return "";
        const trimmed = String(rawWord).trim();
        if (!trimmed) return "";

        const match = trimmed.match(/^([^a-zA-Z0-9]*)([a-zA-Z0-9'’-]+)([^a-zA-Z0-9]*)$/);
        if (!match) return trimmed;

        const prefix = match[1] || "";
        const coreWord = match[2].toLowerCase();
        const postfix = match[3] || "";

        let kor = ENGLISH_PHONICS_DICT[coreWord];
        if (!kor) {
            const noApos = coreWord.replace(/['’]/g, '');
            kor = ENGLISH_PHONICS_DICT[noApos];
        }
        if (!kor) {
            kor = phonicsRuleFallback(coreWord);
        }
        return prefix + kor + postfix;
    }

    function phonicsRuleFallback(word) {
        const w = word.toLowerCase();
        if (w.length <= 4) return ENGLISH_PHONICS_DICT[w] || w;
        return w;
    }

    function isEnglishPhonicsEnabled() {
        try {
            return localStorage.getItem('english_phonics_visible') !== 'off';
        } catch (e) {
            return true;
        }
    }

    function setEnglishPhonicsEnabled(enabled) {
        try {
            localStorage.setItem('english_phonics_visible', enabled ? 'on' : 'off');
        } catch (e) {}
        updateEnglishPhonicsUi();
    }

    function toggleEnglishPhonics() {
        setEnglishPhonicsEnabled(!isEnglishPhonicsEnabled());
    }

    function updateEnglishPhonicsUi() {
        const enabled = isEnglishPhonicsEnabled();
        document.querySelectorAll('.phonics-sentence-box').forEach(box => {
            if (enabled) {
                box.classList.remove('hide-phonics');
            } else {
                box.classList.add('hide-phonics');
            }
        });
        document.querySelectorAll('.phonics-toggle-btn').forEach(btn => {
            btn.innerHTML = enabled ? '🗣️ 한글 발음 숨기기' : '🗣️ 한글 발음 보기';
            btn.classList.toggle('active', enabled);
        });
    }

    function getEnglishPhonicsToggleBtnHtml() {
        const enabled = isEnglishPhonicsEnabled();
        return `
            <button type="button" 
                    class="phonics-toggle-btn ${enabled ? 'active' : ''}" 
                    onclick="window.toggleEnglishPhonics()" 
                    style="background:#f1f5f9; border:1.5px solid #cbd5e1; border-radius:20px; padding:6px 14px; font-size:0.88rem; font-weight:bold; color:#475569; cursor:pointer; display:inline-flex; align-items:center; gap:6px; transition:all 0.2s;">
                ${enabled ? '🗣️ 한글 발음 숨기기' : '🗣️ 한글 발음 보기'}
            </button>
        `;
    }

    function renderSentencePhonicsHtml(sentence) {
        if (!sentence) return "";
        const words = String(sentence).trim().split(/\s+/);
        const hideClass = isEnglishPhonicsEnabled() ? "" : "hide-phonics";

        const unitsHtml = words.map(w => {
            const kor = getPhonicsKorean(w);
            return `
                <div class="phonics-word-unit">
                    <span class="p-eng">${w}</span>
                    <span class="p-kor">${kor}</span>
                </div>
            `;
        }).join('');

        return `<div class="phonics-sentence-box ${hideClass}">${unitsHtml}</div>`;
    }

    // ========================================================
    // 🎯 [1단계] 알파벳 터치방 (타이핑 배제)
    // ========================================================
    function renderStage1UI(container, currentItem, helpers = {}) {
        if (!currentItem) return;
        const answerWord = currentItem.word.trim();
        const imageUrl = currentItem.imageUrl || currentItem.image;
        const imageHtml = imageUrl ? `
            <div style="text-align:center; margin-bottom:15px;">
                <img src="${imageUrl}" style="max-width:100%; max-height:200px; border-radius:10px; box-shadow:0 4px 8px rgba(0,0,0,0.2); object-fit:contain;" alt="${answerWord}">
            </div>
        ` : '';

        const meaningHtml = currentItem.meaning ? `
            <div style="font-size: 1.25rem; font-weight: bold; color: #e11d48; margin-bottom: 15px; background: rgba(255,255,255,0.8); display: inline-block; padding: 4px 14px; border-radius: 15px;">
                🇰🇷 ${currentItem.meaning}
            </div>
        ` : '';

        window.verifyStage1 = function() {
            speakEnglish(answerWord);
            if (typeof window.speakFairyTTS === 'function') window.speakFairyTTS("참 잘했어요!");
            if (typeof helpers.advanceQuiz === 'function') helpers.advanceQuiz(1500);
        };

        const safeWordEscaped = answerWord.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

        container.innerHTML = `
            <div class="quiz-card">
                ${helpers.orderToggleHtml || ''}
                <div style="font-size: 0.95rem; opacity:0.7; margin-bottom: 15px;">알파벳 ${helpers.currentIdx + 1} / ${helpers.totalCount}</div>
                ${imageHtml}
                <div class="quiz-descr" style="font-size: 3rem; font-weight: bold; color: var(--primary); margin-bottom: 10px;">${answerWord}</div>
                ${meaningHtml}
                <div style="margin-bottom: 20px; color: #666;">이 단어를 소리 내어 읽고 아래 버튼을 눌러보세요!</div>
                
                <div style="display:flex; gap:10px; justify-content:center; margin-top:20px;">
                    <button class="quiz-button" onclick="verifyStage1()">👆 다 읽었어요!</button>
                    <button class="quiz-button" style="background:#8b949e;" onclick="window.EnglishPhonics.speak('${safeWordEscaped}')">🔊 원어민 발음 듣기</button>
                </div>
            </div>
        `;
        speakEnglish(answerWord);
    }

    // ========================================================
    // 🎧 [3단계] 소리 귀 뚫기 (파닉스/듣기 객관식 3지선다)
    // ========================================================
    function renderStage2UI(container, currentItem, helpers = {}) {
        if (!currentItem) return;
        const answerWord = currentItem.word.trim();
        const imageUrl = currentItem.imageUrl || currentItem.image;
        const imageHtml = imageUrl ? `
            <div style="text-align:center; margin-bottom:15px;">
                <img src="${imageUrl}" style="max-width:100%; max-height:200px; border-radius:10px; box-shadow:0 4px 8px rgba(0,0,0,0.2); object-fit:contain;" alt="${answerWord}">
            </div>
        ` : '';

        const choices = [answerWord];
        const allRecords = helpers.allRecords || [];
        const otherWords = allRecords.filter(r => r.word !== answerWord).map(r => r.word);
        otherWords.sort(() => Math.random() - 0.5);
        choices.push(otherWords[0] || "apple");
        choices.push(otherWords[1] || "banana");
        choices.sort(() => Math.random() - 0.5);

        window.verifyStage2 = function(selectedWord) {
            if (selectedWord === answerWord) {
                if (typeof window.speakFairyTTS === 'function') window.speakFairyTTS("정답이에요! 귀가 아주 밝네요!");
                if (typeof helpers.advanceQuiz === 'function') helpers.advanceQuiz(1000);
            } else {
                if (typeof helpers.recordWrong === 'function') helpers.recordWrong(currentItem, selectedWord);
                if (typeof helpers.promptWrong === 'function') helpers.promptWrong(() => {});
            }
        };

        const safeWordEscaped = answerWord.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

        container.innerHTML = `
            <div class="quiz-card">
                ${helpers.orderToggleHtml || ''}
                <div style="font-size: 0.95rem; opacity:0.7; margin-bottom: 15px;">소리 귀 뚫기 ${helpers.currentIdx + 1} / ${helpers.totalCount}</div>
                ${imageHtml}
                <div style="font-size: 5rem; margin-bottom: 20px; cursor: pointer;" onclick="window.EnglishPhonics.speak('${safeWordEscaped}')">🎧</div>
                ${getEnglishSpeechRateChipsHtml()}
                <div style="margin-bottom: 20px; color: #666;">소리를 듣고 알맞은 단어를 고르세요!</div>
                
                <div class="quiz-choices-container" style="display: flex; flex-direction: column; gap: 10px;">
                    ${choices.map(choice => {
                        const safeChoice = choice.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                        return `<button class="quiz-choice-btn" onclick="verifyStage2('${safeChoice}')">${choice}</button>`;
                    }).join('')}
                </div>
                <div style="margin-top:20px;">
                    <button class="quiz-button" style="background:#8b949e;" onclick="window.EnglishPhonics.speak('${safeWordEscaped}')">🔊 다시 듣기</button>
                </div>
            </div>
        `;
        setTimeout(() => speakEnglish(answerWord), 500);
    }

    const EnglishPhonics = {
        dict: ENGLISH_PHONICS_DICT,
        speak: speakEnglish,
        fallbackWebSpeech,
        getSpeechRateChipsHtml: getEnglishSpeechRateChipsHtml,
        getPhonicsKorean,
        renderSentencePhonicsHtml,
        getToggleBtnHtml: getEnglishPhonicsToggleBtnHtml,
        isEnabled: isEnglishPhonicsEnabled,
        setEnabled: setEnglishPhonicsEnabled,
        toggle: toggleEnglishPhonics,
        updateUi: updateEnglishPhonicsUi,
        renderStage1UI,
        renderStage2UI
    };

    window.EnglishPhonics = EnglishPhonics;

    // 하위 호환 글로벌 브리지
    window.speakEnglish = speakEnglish;
    window.getEnglishSpeechRateChipsHtml = getEnglishSpeechRateChipsHtml;
    window.getPhonicsKorean = getPhonicsKorean;
    window.renderSentencePhonicsHtml = renderSentencePhonicsHtml;
    window.getEnglishPhonicsToggleBtnHtml = getEnglishPhonicsToggleBtnHtml;
    window.isEnglishPhonicsEnabled = isEnglishPhonicsEnabled;
    window.setEnglishPhonicsEnabled = setEnglishPhonicsEnabled;
    window.toggleEnglishPhonics = toggleEnglishPhonics;
    window.updateEnglishPhonicsUi = updateEnglishPhonicsUi;

})();
