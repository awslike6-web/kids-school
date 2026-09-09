// ==========================================================
// ⚙️ 민민이네 영어 멀티버스 코어 운영 엔진 (6단계 파이프라인 통합)
// ==========================================================

window.currentSubject = "영어"; // 전역 과목명 명시
let currentProfile = localStorage.getItem('currentUser') || 'son';
let currentUserName = localStorage.getItem('currentUserName') || '민수';
let currentTheme = localStorage.getItem('currentTheme') || 'theme--minecraft';
const isAdmin = (currentUserName === '아빠' || currentUserName === '엄마');

let activeSectionData = [];
let activeQuizIdx = 0;
let currentMissionType = "";
let allFetchedRecords = [];
let selectedEnglishGrade = "";
let selectedEnglishUnit = "";
let englishVocaOrderType = 'shuffle'; // 'shuffle' or 'sequence'
let stage3QuizMode = null;

const STAGE3_MODES = [
    { id: 'copy', icon: '✏️', label: '보고 따라 적기', desc: '영어를 보고 똑같이 써요' },
    { id: 'toEnglish', icon: '🇺🇸', label: '한글 → 영어', desc: '뜻을 보고 영단어를 써요' },
    { id: 'toKorean', icon: '🇰🇷', label: '영어 → 한글', desc: '영어를 보고 한글 뜻을 써요' },
    { id: 'listening', icon: '🎧', label: '듣고 적기', desc: '소리를 듣고 영단어를 써요' },
];

// 독해방 상태
let readingFetchedBooks = [];
let activePassage = null;
let readingStage = 0;
let readingConjunctionIndex = 0;
let userOrderTracking = [];

// AI 문장방 상태
let sentenceHistory = [];

// 🧚‍♀️ 아나운서 요정 코코 TTS 엔진 안전 우회막
if (!window.stopFairyTTS) {
    window.stopFairyTTS = function() { console.log("🔊 [TTS 우회] 아직 요정 엔진 로드 전입니다."); };
    window.stopFairyTTS.isMock = true;
}
if (!window.speakFairyTTS) {
    window.speakFairyTTS = function(msg) { console.log("🔊 [TTS 우회] 아직 요정 엔진 로드 전입니다:", msg); };
    window.speakFairyTTS.isMock = true;
}

// toggleFairyTtsSetting / updateTtsToggleUi → fairy-engine.js

function initializeEnglishRoom() {
    console.log("🛠️ 영어방 초기화 엔진 가동...");
    const titleEl = document.getElementById('englishTitle');
    const badgeEl = document.getElementById('adminBadgeTag');
    
    if (currentProfile === 'son') {
        document.body.className = "theme--minecraft";
        if (titleEl) titleEl.textContent = `${currentUserName}의 영어 멀티버스 대기실`;
        if (badgeEl) { badgeEl.className = "admin-status-badge"; badgeEl.textContent = `🎮 [${currentUserName}] 네온 관제`; }
    } else {
        document.body.className = "theme--slime";
        if (titleEl) titleEl.textContent = `${currentUserName}의 영어 멀티버스 대기실`;
        if (badgeEl) { badgeEl.className = "admin-status-badge english--fairy"; badgeEl.textContent = `🎠 [${currentUserName}] 동화 모드`; }
    }

    if (isAdmin) {
        if (titleEl) titleEl.innerHTML = `<span style="color:var(--accent-orange);">🛠️ 영어 관리자 시뮬레이터</span>`;
        if (badgeEl) badgeEl.textContent = `🛠️ [${currentUserName} 검수용] 프리패스 가동`;
    } else {
        if (typeof startLearning === 'function') startLearning("초등 영어 멀티버스");
    }
    updateTtsToggleUi();
    if (typeof initChatMemorySession === 'function') {
        initChatMemorySession('공부방');
    }
}

// ==========================================
// 🗣️ 원어민 음성 출력 엔진 (TTS - 미국 원어민 Jenny Neural 연동)
// ==========================================
function speakEnglish(text, onEndCallback = null) {
  // 1. 요정 엔진의 초고음질 미국 원어민(Jenny) 스트리밍 우선 호출
  if (typeof window.speakEnglish === 'function' && window.speakEnglish !== speakEnglish) {
    window.speakEnglish(text, onEndCallback);
    return;
  }
  if (typeof window.playCloudflareEdgeTtsStream === 'function') {
    window.playCloudflareEdgeTtsStream(text, onEndCallback, 'en-US-JennyNeural').catch(() => {
      fallbackWebSpeech(text, onEndCallback);
    });
    return;
  }

  // 2. 오프라인 또는 요정 엔진 로드 전 폴백
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

// ==========================================
// 🎛️ 원어민 발음 속도 조절 칩 컴포넌트 (0.5x ~ 1.0x)
// ==========================================
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

window.changeEnglishSpeechRate = function(rate) {
  if (typeof window.setEnglishSpeechRate === 'function') {
    window.setEnglishSpeechRate(rate);
  }
  const chips = document.querySelectorAll('.speech-rate-chip');
  chips.forEach(chip => {
    const text = chip.textContent || '';
    if (text.includes(`${rate}x`)) {
      chip.classList.add('active');
    } else {
      chip.classList.remove('active');
    }
  });
};

// ========================================================
// 🗣️ 초등 영어 파닉스(한글 발음) 1:1 딕셔너리 & 렌더링 엔진
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

  // 8단원 (길 찾기 & 장소 안내) 핵심 단어
  "library": "라이브러리", "straight": "스트레이트", "turn": "턴", "left": "레프트", "right": "라이트",
  "corner": "코너", "first": "퍼스트", "second": "세컨드", "third": "써드", "floor": "플로어",
  "school": "스쿨", "park": "파크", "hospital": "하스피털", "post": "포스트", "office": "오피스",
  "bank": "뱅크", "bookstore": "북스토어", "behind": "비하인드", "front": "프런트", "excuse": "익스큐즈",
  "find": "파인드", "station": "스테이션", "store": "스토어", "market": "마켓",

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

// 단어 끝 구두점(? . , ! ' ")을 분리하여 한글 발음으로 변환
function getPhonicsKorean(rawWord) {
  if (!rawWord) return "";
  const trimmed = String(rawWord).trim();
  if (!trimmed) return "";

  // 앞뒤 구두점 분리
  const match = trimmed.match(/^([^a-zA-Z0-9]*)([a-zA-Z0-9'’-]+)([^a-zA-Z0-9]*)$/);
  if (!match) {
    return trimmed; // 특수문자만 있는 경우 그대로
  }

  const prefix = match[1] || "";
  const coreWord = match[2].toLowerCase();
  const postfix = match[3] || "";

  let kor = ENGLISH_PHONICS_DICT[coreWord];
  if (!kor) {
    // 사전에 없는 경우 아포스트로피 제거 후 재시도
    const noApos = coreWord.replace(/['’]/g, '');
    kor = ENGLISH_PHONICS_DICT[noApos];
  }

  if (!kor) {
    // 규칙 기반 간이 파닉스 폴백 생성기
    kor = phonicsRuleFallback(coreWord);
  }

  return `${prefix}${kor}${postfix}`;
}

// 규칙 기반 기본 파닉스 음가 생성기
function phonicsRuleFallback(word) {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return word;
  
  // 간단한 음가 맵
  const map = {
    'ph': '프', 'th': '쓰', 'sh': '쉬', 'ch': '치', 'ck': '크', 'ng': '응', 'wh': '왓',
    'b': '브', 'c': '크', 'd': '드', 'f': '프', 'g': '그', 'h': '흐', 'j': '즈',
    'k': '크', 'l': '르', 'm': '므', 'n': '느', 'p': '프', 'q': '크', 'r': '르',
    's': '스', 't': '트', 'v': '브', 'w': '우', 'x': '크스', 'y': '이', 'z': '즈',
    'a': '애', 'e': '에', 'i': '이', 'o': '오', 'u': '어',
    'ai': '에이', 'ay': '에이', 'ee': '이', 'ea': '이', 'oa': '오', 'oo': '우', 'ou': '아우', 'ow': '아우'
  };
  
  // 3음절 이하 약식 조합
  return w.length <= 4 ? (ENGLISH_PHONICS_DICT[w] || w) : w;
}

// 문장 전체를 단어별 1:1 상하 파닉스 블록 HTML로 렌더링
function renderSentencePhonicsHtml(sentence) {
  if (!sentence) return "";
  const words = String(sentence).trim().split(/\s+/);
  return `
    <div class="phonics-sentence-box">
      ${words.map(w => `
        <div class="phonics-word-unit">
          <span class="p-eng">${w}</span>
          <span class="p-kor">${getPhonicsKorean(w)}</span>
        </div>
      `).join('')}
    </div>
  `;
}

window.getPhonicsKorean = getPhonicsKorean;
window.renderSentencePhonicsHtml = renderSentencePhonicsHtml;

// ========================================================
// 🚪 오버레이 미션 팝업 연동 총 제어
// ========================================================
function isEnglishMissionInProgress() {
    const overlay = document.getElementById('missionOverlay');
    if (!overlay || overlay.style.display !== 'flex') return false;
    if (['voca_pool', 'stage1', 'stage2', 'stage3', 'stage4'].includes(currentMissionType)) {
        if (currentMissionType === 'stage3' && !stage3QuizMode) return false;
        return Array.isArray(activeSectionData) && activeSectionData.length > 0
            && activeQuizIdx < activeSectionData.length;
    }
    if (currentMissionType === 'stage5') {
        return !!activePassage && readingStage < 3;
    }
    if (currentMissionType === 'stage6') {
        return !!activePassage;
    }
    return false;
}

// ========================================================
// 📚 [1단계] 단원 동화 도서관 서가 모달 (L7 & L8 동화 선택)
// ========================================================
window.openEnglishLibraryModal = function() {
    const overlay = document.getElementById('missionOverlay');
    const headerTitle = document.getElementById('overlayHeaderTitle');
    const headerIcon = document.getElementById('overlayHeaderIcon');
    const innerBody = document.getElementById('overlayInnerBody');
    if (!overlay || !innerBody) return;

    overlay.style.display = "flex";
    currentMissionType = "library_modal";
    stopFairyTTS();

    if (headerTitle) headerTitle.textContent = "📚 단원 동화 도서관 서가";
    if (headerIcon) headerIcon.textContent = "📚";

    const isMinecraft = (currentProfile === 'son');
    const books = [
        {
            id: "l8",
            badge: "🧭 8단원 최신 동화",
            title: "Minsu Explores the Village",
            koreanTitle: "민수의 신나는 마을 탐험",
            desc: "초등 영어 5-2 8단원 (위치 묻고 길 안내하기)",
            keyExpr: "Where is the library? / Go straight and turn right.",
            url: "english_l8_storybook.html",
            color: "#10b981",
            themeTag: isMinecraft ? "🟩 마인크래프트 마을" : "🟢 슬라임 파크"
        },
        {
            id: "l7",
            badge: "⛺ 7단원 그림 동화",
            title: "Minsu and Junwoo's Weekend",
            koreanTitle: "민수와 준우의 즐거운 주말",
            desc: "초등 영어 5-2 7단원 (지난 일 묻고 답하기)",
            keyExpr: "What did you do last weekend? / I went camping.",
            url: "english_l7_storybook.html",
            color: "#3b82f6",
            themeTag: isMinecraft ? "🏕️ 캠핑과 별빛 밤" : "✨ 주말 나들이"
        }
    ];

    innerBody.innerHTML = `
        <div style="text-align:center; padding:10px 0 20px;">
            <h3 style="color:var(--primary); margin-bottom:8px; font-family:'Jua', sans-serif; font-size:1.35rem;">
                📖 읽고 싶은 단원 동화를 선택하세요!
            </h3>
            <p style="font-size:0.95rem; color:#666; margin-bottom:20px;">
                0.85배속의 편안한 원어민 음성과 쉬운 우리말 해설로 재미있게 읽어요.
            </p>
            <div style="display:grid; grid-template-columns:1fr; gap:16px; max-width:540px; margin:0 auto;">
                ${books.map(b => `
                    <div onclick="location.href='${b.url}'" style="background:#fff; border:2.5px solid ${b.color}; border-radius:16px; padding:18px 20px; cursor:pointer; text-align:left; box-shadow:0 4px 12px rgba(0,0,0,0.06); transition:transform 0.2s, box-shadow 0.2s;" onmouseover="this.style.transform='translateY(-3px)'" onmouseout="this.style.transform='none'">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                            <span style="background:${b.color}; color:#fff; font-size:0.82rem; font-weight:bold; padding:4px 10px; border-radius:12px;">${b.badge}</span>
                            <span style="font-size:0.82rem; color:#888; font-weight:bold;">${b.themeTag}</span>
                        </div>
                        <div style="font-size:1.2rem; font-weight:bold; color:#1e293b; margin-bottom:4px; font-family:'Jua', sans-serif;">
                            ${b.title}
                        </div>
                        <div style="font-size:0.95rem; color:#475569; margin-bottom:10px;">
                            "${b.koreanTitle}" · <span style="color:#64748b; font-size:0.88rem;">${b.desc}</span>
                        </div>
                        <div style="background:#f8fafc; border-left:3px solid ${b.color}; padding:6px 12px; font-size:0.85rem; color:#334155; border-radius:0 8px 8px 0;">
                            🎯 <b>핵심 표현:</b> ${b.keyExpr}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
};

function openMissionView(type) {
    const overlay = document.getElementById('missionOverlay');
    const headerTitle = document.getElementById('overlayHeaderTitle');
    const headerIcon = document.getElementById('overlayHeaderIcon');
    const innerBody = document.getElementById('overlayInnerBody');
    
    overlay.style.display = "flex";
    activeQuizIdx = 0;
    activePassage = null;
    stopFairyTTS();
    
    currentMissionType = type;
    if (type === 'stage3') stage3QuizMode = null;
    if (['voca_pool', 'stage1', 'stage2', 'stage3', 'stage4'].includes(type) && typeof initQuizRewardSession === 'function') {
        initQuizRewardSession(type);
    }

    let targetTitle = ""; let targetIcon = "";
    switch(type) {
        case 'voca_pool': targetTitle = "[2단계] 단어 퐁당 (핵심 영단어)"; targetIcon = "🔤"; break;
        case 'stage1': targetTitle = "[1단계] 알파벳 터치방"; targetIcon = "🔤"; break;
        case 'stage2': targetTitle = "[3단계] 소리 귀 뚫기 (파닉스/듣기)"; targetIcon = "🎧"; break;
        case 'stage3': targetTitle = "3단계: 영단어/숙어방"; targetIcon = "📝"; break;
        case 'stage4': targetTitle = "[4단계] 문장 조각 맞추기 (블록 놀이)"; targetIcon = "🧩"; break;
        case 'stage5': targetTitle = "[5단계] 동화 장면 퀴즈 (짧은 독해)"; targetIcon = "📖"; break;
        case 'stage6': targetTitle = "[6단계] 코코와 한 줄 인사 (다정한 대화)"; targetIcon = "🧚‍♀️"; break;
    }
    headerTitle.textContent = targetTitle;
    headerIcon.textContent = targetIcon;

    if (typeof armQuizLeaveGuard === 'function') {
        armQuizLeaveGuard({
            isActive: isEnglishMissionInProgress,
            onLeave: () => closeMissionView(true)
        });
    }

    showLoadingSpinner(innerBody);
    fetchAndBuildDynamicUI(type, innerBody);
}

function showLoadingSpinner(container) {
    container.innerHTML = `
      <div class="spinner-wrapper">
        <div class="spinner-circle"></div>
        <p style="font-family:'Gaegu', cursive; font-size:1.3rem; font-weight:bold; color:inherit; text-align:center;">
            Fairy_🧚‍♀️ 코코 요정이 자료를 챙겨오고 있어요...
        </p>
      </div>
    `;
}

function closeMissionView(force) {
    if (!force && typeof confirmLeaveActiveSession === 'function' && !confirmLeaveActiveSession()) {
        return;
    }
    if (typeof disarmQuizLeaveGuard === 'function') {
        disarmQuizLeaveGuard();
    }

    const overlay = document.getElementById('missionOverlay');
    const finalizeDiscussion = async () => {
        if (currentMissionType === 'stage6' && sentenceHistory.length > 0) {
            if (typeof finalizeSentenceDiscussionSession === 'function') {
                await finalizeSentenceDiscussionSession({
                    messages: sentenceHistory,
                    roomType: '공부방',
                    missionType: 'stage6'
                });
            } else if (typeof saveChatMemoryFromConversation === 'function') {
                await saveChatMemoryFromConversation({ roomType: '공부방', messages: sentenceHistory });
            }
            return;
        }
        if (typeof flushPendingMissionReward === 'function') {
            await flushPendingMissionReward();
        } else if (typeof finalizeDiscussionSessionRewards === 'function') {
            await finalizeDiscussionSessionRewards();
        }
        if (typeof finalizeQuizRewardSession === 'function') {
            await finalizeQuizRewardSession();
        }
    };

    finalizeDiscussion().finally(() => {
        overlay.style.display = "none";
        activeSectionData = [];
        activeQuizIdx = 0;
        activePassage = null;
        stage3QuizMode = null;
        stopFairyTTS();
    });
}

// ========================================================
// 📊 데이터 페칭 및 동적 UI 생성
// ========================================================
async function fetchAndBuildDynamicUI(type, innerBody) {
    try {
        if (type === 'stage5' || type === 'stage6') {
            let libraryRecords = [];
            if (typeof fetchLibraryBooksFromNotion === 'function') {
                try {
                    libraryRecords = await fetchLibraryBooksFromNotion();
                } catch (err) {
                    console.warn('[english] 도서관 노션 조회 실패, 로컬 지문으로 대체합니다:', err);
                }
            }

            readingFetchedBooks = typeof resolveReadingPassageList === 'function'
                ? resolveReadingPassageList(libraryRecords, ENGLISH_READING_DATABASE)
                : ENGLISH_READING_DATABASE.slice(0, 10);

            if (readingFetchedBooks.length === 0) {
                innerBody.innerHTML = `<div style="text-align:center; padding:40px;">등록된 지문이 없습니다.</div>`;
                return;
            }

            if (type === 'stage6') {
                renderSentenceUI(innerBody);
            } else {
                renderReadingLobby(innerBody);
            }
        } else {
            // 단어/문장/파닉스 등 노션 VOCA DB 연동
            const records = await fetchVocaFromNotion({ subject: "영어", filterByStudent: !isAdmin });
            
            if (records && records.length > 0) {
                allFetchedRecords = records;
                
                // 2단계(단어 퐁당), 3단계(파닉스/듣기/어휘), 4단계(영어 문장) 데이터 목적별 분리
                let candidateRecords = records;
                if (type === 'stage2' || type === 'stage3' || type === 'voca_pool') {
                    candidateRecords = records.filter(isVocaOrIdiomRecord);
                } else if (type === 'stage4') {
                    candidateRecords = records.filter(isSentenceRecord);
                }
                
                // 학년/단원 필터 UI
                const uniqueGrades = [...new Set(candidateRecords.flatMap(r => r.grades || [r.grade]))].filter(g => g && g !== "공통").sort();
                if (uniqueGrades.length === 0) {
                    startMissionWithFilteredData(candidateRecords, innerBody);
                } else if (uniqueGrades.length === 1) {
                    // 💡 학년이 1개뿐인 경우 불필요한 학년 선택 과정을 건너뛰고 바로 단원 선택으로 직행
                    selectDynamicGrade(uniqueGrades[0]);
                } else {
                    renderDynamicGradeUI(uniqueGrades, innerBody);
                }
            } else {
                innerBody.innerHTML = `<div style="text-align:center; padding:40px;">데이터가 없습니다.</div>`;
            }
        }
    } catch(e) {
        console.error("통신 에러:", e);
        innerBody.innerHTML = `<div style="text-align:center; padding:40px;">오류가 발생했습니다: ${e.message}</div>`;
    }
}

// ========================================================
// 🔍 영단어/숙어 vs 문장 판별 헬퍼 (노션 어휘유형 및 품사 속성 동기화)
// ========================================================
function isSentenceRecord(r) {
    if (!r) return false;
    const type = String(r.wordType || r.type || r.pos || '').trim();
    return type === '문장';
}

function isVocaOrIdiomRecord(r) {
    if (!r) return false;
    const type = String(r.wordType || r.type || r.pos || '').trim();
    if (type === '문장') return false;
    return true; // '단어', '숙어' 및 기본 어휘 항목
}

// ========================================================
// 🎒 학년/단원 필터 UI (사회방 이식)
// ========================================================
function renderDynamicGradeUI(grades, container) {
    let html = `<div style="text-align:center; margin-bottom:20px;">
        <h3 style="color:var(--primary); margin-bottom:15px;">🎒 도전할 학년을 선택하세요!</h3>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">`;
    grades.forEach(g => {
        html += `<button class="quiz-choice-btn" style="padding:15px; font-size:1.2rem;" onclick="selectDynamicGrade('${g}')">${g}</button>`;
    });
    html += `</div></div>`;
    container.innerHTML = html;
}

window.selectDynamicGrade = function(grade) {
    selectedEnglishGrade = grade;
    const innerBody = document.getElementById('overlayInnerBody');
    let matchedRecords = allFetchedRecords.filter(r => r.grade === grade || r.grades.includes(grade));
    if (currentMissionType === 'stage2' || currentMissionType === 'stage3' || currentMissionType === 'voca_pool') {
        matchedRecords = matchedRecords.filter(isVocaOrIdiomRecord);
    } else if (currentMissionType === 'stage4') {
        matchedRecords = matchedRecords.filter(isSentenceRecord);
    }
    const uniqueUnits = [...new Set(matchedRecords.map(r => String(r.level).trim()))].filter(u => u && u !== "undefined").sort((a,b) => a.localeCompare(b, undefined, {numeric: true}));
    
    if (uniqueUnits.length === 0 || (uniqueUnits.length === 1 && uniqueUnits[0] === "기본 단원")) {
        startMissionWithFilteredData(matchedRecords, innerBody);
    } else {
        renderDynamicUnitUI(uniqueUnits, innerBody);
    }
};

window._currentDynamicUnits = [];
function renderDynamicUnitUI(units, container) {
    window._currentDynamicUnits = units;
    let html = `<div style="text-align:center; margin-bottom:20px;">
        <h3 style="color:var(--mint); margin-bottom:15px;">📚 [${selectedEnglishGrade}] 도전할 단원을 선택하세요!</h3>
        <div style="display:grid; grid-template-columns:repeat(2, 1fr); gap:10px;">`;
    units.forEach((u, idx) => {
        let displayLabel = u;
        if (/^L\d+$/i.test(u)) {
            const num = u.replace(/\D/g, '');
            displayLabel = `${u} (${num}단원)`;
        }
        html += `<button class="quiz-choice-btn" style="padding:15px 5px; font-size:1.15rem; font-weight:bold;" onclick="selectDynamicUnitByIndex(${idx})">${displayLabel}</button>`;
    });
    html += `</div>
        <div style="margin-top:20px;">
            <button class="quiz-button" style="background:#8b949e; width:100%;" onclick="openMissionView(currentMissionType)">⬅️ 처음으로 돌아가기</button>
        </div>
    </div>`;
    container.innerHTML = html;
}

window.selectDynamicUnitByIndex = function(idx) {
    if (window._currentDynamicUnits && window._currentDynamicUnits[idx]) {
        selectDynamicUnit(window._currentDynamicUnits[idx]);
    }
};

window.selectDynamicUnit = function(unit) {
    selectedEnglishUnit = unit;
    const innerBody = document.getElementById('overlayInnerBody');
    let finalRecords = allFetchedRecords.filter(r => 
        (r.grade === selectedEnglishGrade || r.grades.includes(selectedEnglishGrade)) &&
        String(r.level).trim() === unit
    );
    if (currentMissionType === 'stage2' || currentMissionType === 'stage3' || currentMissionType === 'voca_pool') {
        finalRecords = finalRecords.filter(isVocaOrIdiomRecord);
    } else if (currentMissionType === 'stage4') {
        finalRecords = finalRecords.filter(isSentenceRecord);
    }
    startMissionWithFilteredData(finalRecords, innerBody);
};

function getEnglishFilteredRecords() {
    let matchedRecords = allFetchedRecords;
    if (currentMissionType === 'stage2' || currentMissionType === 'stage3' || currentMissionType === 'voca_pool') {
        matchedRecords = matchedRecords.filter(isVocaOrIdiomRecord);
    } else if (currentMissionType === 'stage4') {
        matchedRecords = matchedRecords.filter(isSentenceRecord);
    }
    if (selectedEnglishGrade) {
        matchedRecords = matchedRecords.filter(r => r.grade === selectedEnglishGrade || r.grades.includes(selectedEnglishGrade));
    }
    if (selectedEnglishUnit) {
        matchedRecords = matchedRecords.filter(r => String(r.level).trim() === selectedEnglishUnit);
    }
    return matchedRecords;
}

function prepareEnglishVocaRecords(records) {
    const prepared = [...records];
    if (englishVocaOrderType === 'shuffle') {
        prepared.sort(() => Math.random() - 0.5);
    }
    return prepared;
}

function getEnglishOrderToggleHtml() {
    return `
        <div style="display:flex; justify-content:center; align-items:center; margin-bottom: 20px;">
            <button class="quiz-button" onclick="window.englishToggleOrder()" style="padding: 8px 16px; font-size: 0.95rem; border-radius: 20px;">
                ${englishVocaOrderType === 'shuffle' ? '🎲 랜덤 섞기 (클릭하여 순서대로)' : '➡️ 순서대로 (클릭하여 랜덤 섞기)'}
            </button>
        </div>
    `;
}

window.englishToggleOrder = function() {
    englishVocaOrderType = (englishVocaOrderType === 'shuffle') ? 'sequence' : 'shuffle';
    activeQuizIdx = 0;
    const innerBody = document.getElementById('overlayInnerBody');
    if (!innerBody) return;
    startMissionWithFilteredData(getEnglishFilteredRecords(), innerBody);
};

function startMissionWithFilteredData(records, innerBody) {
    let filtered = records;
    if (currentMissionType === 'stage2' || currentMissionType === 'stage3' || currentMissionType === 'voca_pool') {
        filtered = records.filter(isVocaOrIdiomRecord);
    } else if (currentMissionType === 'stage4') {
        filtered = records.filter(isSentenceRecord);
    }
    activeSectionData = prepareEnglishVocaRecords(filtered).slice(0, 10);

    if (activeSectionData.length === 0) {
        innerBody.innerHTML = `<div style="text-align:center; padding:40px;">해당 조건의 문제가 없습니다.</div>`;
        return;
    }
    if (currentMissionType === 'stage3') {
        renderStage3ModeSelectUI(innerBody);
        return;
    }
    renderSectionUI();
}

function getStage3ModeLabel(mode) {
    const found = STAGE3_MODES.find(m => m.id === mode);
    return found ? found.label : '영단어 연습';
}

function generateStage3Hint(word) {
    let hint = "";
    for (let i = 0; i < word.length; i++) {
        if (word[i] === " ") hint += "  ";
        else if (i % 2 === 0) hint += word[i] + " ";
        else hint += "_ ";
    }
    return hint.trim();
}

function renderStage3ModeSelectUI(container) {
    const modeButtons = STAGE3_MODES.map(m => `
        <button class="quiz-choice-btn" style="padding:18px 10px; display:flex; flex-direction:column; align-items:center; gap:6px; min-height:110px;" onclick="selectStage3Mode('${m.id}')">
            <span style="font-size:2rem;">${m.icon}</span>
            <span style="font-size:1.05rem; font-weight:bold;">${m.label}</span>
            <span style="font-size:0.82rem; opacity:0.75; line-height:1.3;">${m.desc}</span>
        </button>
    `).join('');

    container.innerHTML = `
        <div style="text-align:center; padding:10px 0 20px;">
            ${getEnglishOrderToggleHtml()}
            <h3 style="color:var(--primary); margin-bottom:8px;">🎯 연습 방식을 선택하세요!</h3>
            <p style="font-size:0.95rem; color:#666; margin-bottom:18px;">
                ${selectedEnglishGrade || selectedEnglishUnit ? `[${[selectedEnglishGrade, selectedEnglishUnit].filter(Boolean).join(' · ')}] ` : ''}
                총 ${activeSectionData.length}문제
            </p>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:16px;">
                ${modeButtons}
            </div>
            <button class="quiz-button" style="background:#8b949e; width:100%;" onclick="openMissionView('stage3')">⬅️ 학년/단원 다시 고르기</button>
        </div>
    `;
}

window.selectStage3Mode = function(mode) {
    stage3QuizMode = mode;
    activeQuizIdx = 0;
    renderSectionUI();
};

window.showStage3ModeSelect = function() {
    stopFairyTTS();
    renderStage3ModeSelectUI(document.getElementById('overlayInnerBody'));
};

function checkStage3Answer(inputVal, answerWord, currentItem) {
    const normalized = inputVal.trim().toLowerCase();
    if (stage3QuizMode === 'toKorean') {
        const meaning = (currentItem.meaning || '').replace(/ /g, '');
        const user = inputVal.replace(/ /g, '');
        return meaning.includes(user) && user !== '';
    }
    return normalized === answerWord.toLowerCase().trim();
}

async function advanceEnglishQuizAfterCorrect(delayMs = 1000) {
    if (typeof rewardQuizCorrect === 'function') {
        await rewardQuizCorrect(activeQuizIdx);
    }
    activeQuizIdx++;
    setTimeout(renderSectionUI, delayMs);
}

function skipEnglishQuestion() {
    activeQuizIdx++;
    renderSectionUI();
}

function promptEnglishWrong(onRetry) {
    const retry = typeof onRetry === 'function' ? onRetry : () => {};
    if (typeof promptQuizRetryOrSkip === 'function') {
        promptQuizRetryOrSkip({ onRetry: retry, onSkip: skipEnglishQuestion });
        return;
    }
    speakFairyTTS("아쉽지만 틀렸어요. 다시 한번 생각해볼까요?");
    retry();
}

// ========================================================
// 🎯 각 모드별 UI 렌더링 및 로직
// ========================================================
function renderSectionUI() {
    const container = document.getElementById('overlayInnerBody');
    container.innerHTML = "";
    
    if (activeQuizIdx >= activeSectionData.length) {
        container.innerHTML = `
            <div style="text-align:center; padding: 40px 20px;">
                <div style="font-size:3rem; margin-bottom:15px;">🎉</div>
                <p style="font-size:1.4rem; color:var(--primary); margin-bottom:10px;">모든 문제를 완료했습니다!</p>
                <p style="font-size:1rem; color:#666; margin-bottom:20px;">${getStage3ModeLabel(stage3QuizMode)} 연습 완료</p>
                <div style="display:flex; flex-direction:column; gap:10px;">
                    ${currentMissionType === 'stage3' ? `<button class="quiz-button" style="background:var(--sky-blue); color:white;" onclick="showStage3ModeSelect()">🔄 다른 방식으로 다시하기</button>` : ''}
                    <button class="quiz-button" style="background:var(--pink); color:white;" onclick="closeMissionView();">✅ 나가기</button>
                </div>
            </div>`;
        return;
    }

    if (currentMissionType === 'voca_pool') renderVocaPoolUI(container);
    else if (currentMissionType === 'stage1') renderStage1UI(container);
    else if (currentMissionType === 'stage2') renderStage2UI(container);
    else if (currentMissionType === 'stage3') renderStage3UI(container);
    else if (currentMissionType === 'stage4') renderStage4UI(container);
}

// ========================================================
// 🔤 2단계: 단어 퐁당 (느린 학습자 민수 맞춤형 3지선다 콕 터치 & 소리 듣기)
// ========================================================
let vocaPoolQuizMode = 'meaning'; // 'meaning' (단어 보고 뜻 고르기) or 'listening' (소리 듣고 뜻 고르기)

window.setVocaPoolMode = function(mode) {
    vocaPoolQuizMode = mode;
    renderSectionUI();
};

function renderVocaPoolUI(container) {
    const currentItem = activeSectionData[activeQuizIdx];
    const answerWord = currentItem.word.trim();
    const answerMeaning = (currentItem.meaning || '').trim();

    const imageUrl = currentItem.imageUrl || currentItem.image;
    const imageHtml = imageUrl ? `
        <div style="text-align:center; margin-bottom:15px;">
            <img src="${imageUrl}" style="max-width:100%; max-height:180px; border-radius:12px; box-shadow:0 4px 10px rgba(0,0,0,0.15); object-fit:contain;" alt="${answerWord}">
        </div>
    ` : '';

    // 3지선다 객관식 보기 생성 (정답 1개 + 오답 2개)
    const choices = [answerMeaning];
    const otherMeanings = allFetchedRecords
        .filter(r => r.meaning && r.meaning.trim() !== answerMeaning)
        .map(r => r.meaning.trim());
    otherMeanings.sort(() => Math.random() - 0.5);
    choices.push(otherMeanings[0] || "신나는 놀이");
    choices.push(otherMeanings[1] || "맛있는 간식");
    choices.sort(() => Math.random() - 0.5);

    window.verifyVocaPoolChoice = function(selectedMeaning) {
        if (selectedMeaning === answerMeaning) {
            speakFairyTTS("정답이에요! 아주 잘 맞혔어요!");
            if (typeof speakEnglish === 'function') speakEnglish(answerWord);
            advanceEnglishQuizAfterCorrect(1000);
        } else {
            promptEnglishWrong(() => {});
        }
    };

    // 상단 모드 전환 탭 (뜻 맞추기 vs 소리 듣고 맞추기)
    const toggleHtml = `
        <div style="display:flex; justify-content:center; gap:8px; margin-bottom:16px;">
            <button class="quiz-button" style="background:${vocaPoolQuizMode === 'meaning' ? 'var(--primary)' : '#e2e8f0'}; color:${vocaPoolQuizMode === 'meaning' ? '#fff' : '#475569'}; padding:7px 16px; border-radius:20px; font-size:0.9rem; font-family:'Jua',sans-serif;" onclick="setVocaPoolMode('meaning')">
                🧐 뜻 맞추기 (단어 보기)
            </button>
            <button class="quiz-button" style="background:${vocaPoolQuizMode === 'listening' ? 'var(--primary)' : '#e2e8f0'}; color:${vocaPoolQuizMode === 'listening' ? '#fff' : '#475569'}; padding:7px 16px; border-radius:20px; font-size:0.9rem; font-family:'Jua',sans-serif;" onclick="setVocaPoolMode('listening')">
                🎧 소리 듣고 맞추기 (귀 쫑긋)
            </button>
        </div>
    `;

    // 문제 본문 (meaning 모드: 큼직한 영단어 / listening 모드: 🎧 아이콘)
    let displayContentHtml = '';
    if (vocaPoolQuizMode === 'listening') {
        displayContentHtml = `
            <div style="font-size: 4.5rem; margin: 10px 0; cursor: pointer; animation: bounceObj 2s infinite;" onclick="speakEnglish('${answerWord.replace(/'/g, "\\'")}')">
                🎧
            </div>
            ${getEnglishSpeechRateChipsHtml()}
            <div style="font-size: 1.05rem; color: #64748b; margin-bottom: 20px;">
                원어민 소리를 잘 듣고, 알맞은 뜻을 골라보세요!
            </div>
        `;
    } else {
        displayContentHtml = `
            <div class="quiz-descr" style="font-size: 2.5rem; font-weight: bold; color: var(--primary); margin: 8px 0 4px;">
                ${answerWord}
            </div>
            <div style="margin-bottom: 12px;">
                <span class="voca-phonics-badge">🗣️ [${getPhonicsKorean(answerWord)}]</span>
            </div>
            <div style="font-size: 1.05rem; color: #64748b; margin-bottom: 20px;">
                이 단어의 알맞은 우리말 뜻을 골라보세요!
            </div>
        `;
    }

    container.innerHTML = `
        <div class="quiz-card">
            ${getEnglishOrderToggleHtml()}
            <div style="font-size: 0.95rem; opacity:0.7; margin-bottom: 12px;">단어 퐁당 ${activeQuizIdx + 1} / ${activeSectionData.length}</div>
            ${toggleHtml}
            ${imageHtml}
            ${displayContentHtml}
            
            <div class="quiz-choices-container" style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px;">
                ${choices.map(choice => `
                     <button class="quiz-choice-btn" style="padding: 16px 20px; font-size: 1.2rem; text-align: center; border-radius: 16px; line-height: 1.4; transition: all 0.2s;" onclick="verifyVocaPoolChoice('${choice.replace(/'/g, "\\'")}')">
                        ${choice}
                     </button>
                `).join('')}
            </div>
            
            <div style="display:flex; gap:10px; justify-content:center; margin-top:15px;">
                <button class="quiz-button" style="background:#64748b; color:white;" onclick="speakEnglish('${answerWord.replace(/'/g, "\\'")}')">
                    🔊 원어민 소리 다시 듣기
                </button>
                <button class="quiz-button" style="background:var(--pink); color:white;" onclick="activeQuizIdx++; renderSectionUI();">
                    건너뛰기 ⏩
                </button>
            </div>
        </div>
    `;

    // 문제 진입 시 원어민 음성 자동 재생 (천천히 0.85배속)
    setTimeout(() => {
        if (typeof speakEnglish === 'function') speakEnglish(answerWord);
    }, 400);
}

function getStage3ModeLabel(mode) {
    const labels = {
        copy: '따라 쓰기',
        toEnglish: '영단어 맞추기',
        toKorean: '한글 뜻 맞추기',
        listening: '듣고 쓰기'
    };
    return labels[mode] || '단어 학습';
}

function showStage3ModeSelect() {
    stage3QuizMode = null;
    renderSectionUI();
}

function renderStage3ModeSelectUI(container) {
    container.innerHTML = `
        <div class="quiz-card">
            <h3 style="color:var(--primary); margin-bottom:15px; font-family:'Jua',sans-serif; font-size:1.3rem;">
                📝 학습 방식을 선택하세요!
            </h3>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:20px;">
                <button class="quiz-choice-btn" style="padding:15px;" onclick="stage3QuizMode='copy'; renderSectionUI();">
                    ✏️ 따라 쓰기
                </button>
                <button class="quiz-choice-btn" style="padding:15px;" onclick="stage3QuizMode='toKorean'; renderSectionUI();">
                    🇰🇷 한글 뜻 맞추기
                </button>
                <button class="quiz-choice-btn" style="padding:15px;" onclick="stage3QuizMode='toEnglish'; renderSectionUI();">
                    🇺🇸 영단어 맞추기
                </button>
                <button class="quiz-choice-btn" style="padding:15px;" onclick="stage3QuizMode='listening'; renderSectionUI();">
                    🎧 듣고 맞추기
                </button>
            </div>
        </div>
    `;
}

// --------------------------------------------------------
// 1단계: 알파벳 터치방 (타이핑 금지)
// --------------------------------------------------------
function renderStage1UI(container) {
    const currentItem = activeSectionData[activeQuizIdx];
    const answerWord = currentItem.word.trim();
    
    const imageUrl = currentItem.imageUrl || currentItem.image;
    const imageHtml = imageUrl ? `
        <div style="text-align:center; margin-bottom:15px;">
            <img src="${imageUrl}" style="max-width:100%; max-height:200px; border-radius:10px; box-shadow:0 4px 8px rgba(0,0,0,0.2); object-fit:contain;" alt="${currentItem.word}">
        </div>
    ` : '';

    window.verifyStage1 = function() {
        speakEnglish(answerWord);
        speakFairyTTS("참 잘했어요!");
        advanceEnglishQuizAfterCorrect(1500);
    };

    const meaningHtml = currentItem.meaning ? `
        <div style="font-size: 1.25rem; font-weight: bold; color: #e11d48; margin-bottom: 15px; background: rgba(255,255,255,0.8); display: inline-block; padding: 4px 14px; border-radius: 15px;">
            🇰🇷 ${currentItem.meaning}
        </div>
    ` : '';

    container.innerHTML = `
        <div class="quiz-card">
            ${getEnglishOrderToggleHtml()}
            <div style="font-size: 0.95rem; opacity:0.7; margin-bottom: 15px;">알파벳 ${activeQuizIdx + 1} / ${activeSectionData.length}</div>
            ${imageHtml}
            <div class="quiz-descr" style="font-size: 3rem; font-weight: bold; color: var(--primary); margin-bottom: 4px;">${answerWord}</div>
            <div style="margin-bottom: 12px;">
                <span class="voca-phonics-badge">🗣️ [${getPhonicsKorean(answerWord)}]</span>
            </div>
            ${meaningHtml}
            <div style="margin-bottom: 20px; color: #666;">이 단어를 소리 내어 읽고 아래 버튼을 눌러보세요!</div>
            
            <div style="display:flex; gap:10px; justify-content:center; margin-top:20px;">
                <button class="quiz-button" onclick="verifyStage1()">👆 다 읽었어요!</button>
                <button class="quiz-button" style="background:#8b949e;" onclick="speakEnglish('${answerWord.replace(/'/g, "\\'")}')">🔊 원어민 발음 듣기</button>
            </div>
        </div>
    `;
    speakEnglish(answerWord);
}

// --------------------------------------------------------
// 2단계: 파닉스 듣기방 (객관식)
// --------------------------------------------------------
function renderStage2UI(container) {
    const currentItem = activeSectionData[activeQuizIdx];
    const answerWord = currentItem.word.trim();
    
    const imageUrl = currentItem.imageUrl || currentItem.image;
    const imageHtml = imageUrl ? `
        <div style="text-align:center; margin-bottom:15px;">
            <img src="${imageUrl}" style="max-width:100%; max-height:200px; border-radius:10px; box-shadow:0 4px 8px rgba(0,0,0,0.2); object-fit:contain;" alt="${currentItem.word}">
        </div>
    ` : '';

    const choices = [answerWord];
    const otherWords = allFetchedRecords.filter(r => r.word !== answerWord).map(r => r.word);
    otherWords.sort(() => Math.random() - 0.5);
    choices.push(otherWords[0] || "apple");
    choices.push(otherWords[1] || "banana");
    choices.sort(() => Math.random() - 0.5);

    window.verifyStage2 = function(selectedWord) {
        if (selectedWord === answerWord) {
            speakFairyTTS("정답이에요! 귀가 아주 밝네요!");
            advanceEnglishQuizAfterCorrect(1000);
        } else {
            promptEnglishWrong(() => {});
        }
    };

    container.innerHTML = `
        <div class="quiz-card">
            ${getEnglishOrderToggleHtml()}
            <div style="font-size: 0.95rem; opacity:0.7; margin-bottom: 15px;">파닉스 ${activeQuizIdx + 1} / ${activeSectionData.length}</div>
            ${imageHtml}
            <div style="font-size: 5rem; margin-bottom: 20px; cursor: pointer;" onclick="speakEnglish('${answerWord.replace(/'/g, "\\'")}')">🎧</div>
            <div style="margin-bottom: 20px; color: #666;">소리를 듣고 알맞은 단어를 고르세요!</div>
            
            <div class="quiz-choices-container" style="display: flex; flex-direction: column; gap: 10px;">
                ${choices.map(choice => `
                     <button class="quiz-choice-btn" onclick="verifyStage2('${choice.replace(/'/g, "\\'")}')">${choice}</button>
                `).join('')}
            </div>
            <div style="margin-top:20px;">
                <button class="quiz-button" style="background:#8b949e;" onclick="speakEnglish('${answerWord.replace(/'/g, "\\'")}')">🔊 다시 듣기</button>
            </div>
        </div>
    `;
    setTimeout(() => speakEnglish(answerWord), 500);
}

// --------------------------------------------------------
// 3단계: 영단어/숙어방 (4가지 연습 방식 + 자동 스위칭 UI)
// --------------------------------------------------------
function renderStage3UI(container) {
    if (!stage3QuizMode) {
        renderStage3ModeSelectUI(container);
        return;
    }

    const currentItem = activeSectionData[activeQuizIdx];
    const answerWord = currentItem.word.trim();
    const wordsArray = answerWord.split(/\s+/);
    const wordCount = wordsArray.length;
    const totalLength = answerWord.length;
    const mode = stage3QuizMode;
    const expectsEnglish = mode !== 'toKorean';

    const modeMeta = {
        copy: {
            display: answerWord,
            sub: '영어 단어를 보고 똑같이 적으며 한글 뜻도 익혀보세요!',
            placeholder: '똑같이 적어봐!',
            autoSpeak: true,
        },
        toEnglish: {
            display: currentItem.meaning,
            sub: '이 뜻에 맞는 영단어를 맞춰보세요!',
            placeholder: '영어 단어를 입력하세요!',
            autoSpeak: false,
            showHint: true,
        },
        toKorean: {
            display: answerWord,
            sub: '영어 단어의 한글 뜻을 적어보세요!',
            placeholder: '한글 뜻을 입력하세요!',
            autoSpeak: true,
        },
        listening: {
            display: '🎧',
            sub: '소리를 듣고 영단어를 적어보세요!',
            placeholder: '들은 단어를 입력하세요!',
            autoSpeak: true,
            showHint: true,
            listening: true,
        },
    }[mode] || {
        display: currentItem.meaning,
        sub: '이 뜻에 맞는 영단어를 맞춰보세요!',
        placeholder: '영어 단어를 입력하세요!',
    };

    const imageUrl = currentItem.imageUrl || currentItem.image;
    const imageHtml = imageUrl ? `
        <div style="text-align:center; margin-bottom:15px;">
            <img src="${imageUrl}" style="max-width:100%; max-height:200px; border-radius:10px; box-shadow:0 4px 8px rgba(0,0,0,0.2); object-fit:contain;" alt="${currentItem.word}">
        </div>
    ` : '';

    let hintHtml = '';
    if (modeMeta.showHint) {
        hintHtml = `<div style="font-size:1.1rem; color:var(--pink); letter-spacing:3px; margin-bottom:12px;">${generateStage3Hint(answerWord)}</div>`;
    }
    if (mode === 'toEnglish' && currentItem.detailContext && currentItem.detailContext.trim()) {
        hintHtml += `
            <details style="margin-bottom:16px; text-align:left; background:#f8f9fa; border-radius:10px; padding:10px; border:1px solid #ddd; font-size:0.95rem;">
                <summary style="cursor:pointer; font-weight:bold; color:var(--purple);">💡 상세설명 (힌트) 보기</summary>
                <div style="margin-top:10px; color:#555; line-height:1.5;">${currentItem.detailContext.replace(/\n/g, '<br>')}</div>
            </details>
        `;
    }

    let interactiveHtml = '';
    const useMagnet = expectsEnglish && wordCount === 1 && totalLength >= 7;

    if (useMagnet) {
        const chars = answerWord.split('').filter(c => c.trim() !== '');
        const scrambled = [...chars].sort(() => Math.random() - 0.5);

        window.currentEngMagnetAnswer = [];
        window.engMagnetTargetWord = answerWord;

        window.selectEngMagnet = function(letter, idx) {
            const btn = document.getElementById(`eng-magnet-btn-${idx}`);
            if (btn.style.visibility === 'hidden') return;
            btn.style.visibility = 'hidden';
            window.currentEngMagnetAnswer.push({ letter, idx });
            window.renderEngMagnetBlanks();
        };

        window.renderEngMagnetBlanks = function() {
            const blankContainer = document.getElementById('eng-magnet-blanks');
            if (!blankContainer) return;
            let html = '';
            let answerIdx = 0;
            for (let i = 0; i < window.engMagnetTargetWord.length; i++) {
                if (answerIdx < window.currentEngMagnetAnswer.length) {
                    html += `<span style="border-bottom:3px solid var(--primary); width:30px; display:inline-block; text-align:center; color:var(--primary); font-weight:bold;">${window.currentEngMagnetAnswer[answerIdx].letter}</span>`;
                    answerIdx++;
                } else {
                    html += '<span style="border-bottom:3px solid #ccc; width:30px; display:inline-block; text-align:center;">_</span>';
                }
            }
            blankContainer.innerHTML = html;
        };

        window.resetEngMagnets = function() {
            window.currentEngMagnetAnswer.forEach(item => {
                const btn = document.getElementById(`eng-magnet-btn-${item.idx}`);
                if (btn) btn.style.visibility = 'visible';
            });
            window.currentEngMagnetAnswer = [];
            window.renderEngMagnetBlanks();
        };

        window.verifyEngMagnet = function() {
            const answerStr = window.currentEngMagnetAnswer.map(item => item.letter).join('');
            if (answerStr.toLowerCase() === window.engMagnetTargetWord.toLowerCase()) {
                speakFairyTTS("정답이에요! 스펠링을 완벽하게 맞췄어요!");
                if (typeof speakEnglish === 'function') speakEnglish(answerWord);
                advanceEnglishQuizAfterCorrect(1000);
            } else {
                const blankContainer = document.getElementById('eng-magnet-blanks');
                if (blankContainer) blankContainer.classList.add('wrong');
                promptEnglishWrong(() => {
                    if (blankContainer) blankContainer.classList.remove('wrong');
                    if (typeof resetEngMagnets === 'function') resetEngMagnets();
                });
            }
        };

        interactiveHtml = `
            <div id="eng-magnet-blanks" style="font-size: 2rem; letter-spacing: 5px; margin-bottom: 20px; min-height: 40px; display: flex; justify-content: center; gap: 5px;">
                ${answerWord.split('').map(() => '<span style="border-bottom:3px solid #ccc; width:30px; display:inline-block; text-align:center;">_</span>').join('')}
            </div>
            <div id="eng-magnet-pool" style="display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-bottom: 20px;">
                ${scrambled.map((l, i) => `<button id="eng-magnet-btn-${i}" class="quiz-choice-btn" style="padding: 10px 20px; font-size: 1.5rem;" onclick="selectEngMagnet('${l.replace(/'/g, "\\'")}', ${i})">${l}</button>`).join('')}
            </div>
            <div style="display:flex; gap:10px; justify-content:center; margin-top:20px;">
                <button class="quiz-button" style="background:#ff9f43;" onclick="resetEngMagnets()">다시 조합하기</button>
                <button class="quiz-button" onclick="verifyEngMagnet()">정답 확인</button>
            </div>
        `;
    } else {
        window.verifyStage3Typing = function() {
            const inputEl = document.getElementById('stage3Input');
            if (!inputEl) return;
            const inputVal = inputEl.value.trim();
            if (checkStage3Answer(inputVal, answerWord, currentItem)) {
                speakFairyTTS("정답이에요! 아주 훌륭해요!");
                if (mode !== 'toKorean' && typeof speakEnglish === 'function') speakEnglish(answerWord);
                inputEl.classList.add('correct');
                advanceEnglishQuizAfterCorrect(1000);
            } else {
                inputEl.classList.add('wrong');
                promptEnglishWrong(() => {
                    inputEl.classList.remove('wrong');
                    inputEl.value = '';
                    inputEl.focus();
                });
            }
        };

        interactiveHtml = `
            <div class="interactive-input-group" style="margin-bottom: 20px;">
                <input id="stage3Input" class="text-input-field" type="text" autocomplete="off" placeholder="${modeMeta.placeholder}" onkeypress="if(event.key === 'Enter') verifyStage3Typing()" style="width:100%;">
            </div>
            <div style="display:flex; gap:10px; justify-content:center; margin-top:20px;">
                <button class="quiz-button" onclick="verifyStage3Typing()">정답 확인</button>
            </div>
        `;
    }

    let displayHtml = '';
    if (mode === 'copy') {
        displayHtml = `
            <div style="background: linear-gradient(135deg, rgba(167, 139, 250, 0.12), rgba(110, 198, 245, 0.15)); border: 2px dashed var(--purple); border-radius: 16px; padding: 15px; margin-bottom: 15px;">
                <div class="quiz-descr" style="font-size: 2.2rem; font-weight: bold; color: var(--primary); margin-bottom: 6px;">${answerWord}</div>
                <div style="font-size: 1.25rem; font-weight: bold; color: #e11d48; background: #fff; display: inline-block; padding: 4px 14px; border-radius: 20px; box-shadow: 0 2px 6px rgba(0,0,0,0.06);">
                    🇰🇷 ${currentItem.meaning || '뜻풀이'}
                </div>
            </div>
        `;
    } else if (modeMeta.listening) {
        displayHtml = `<div class="quiz-descr" style="font-size: 2.5rem; margin-bottom: 10px;">${modeMeta.display}</div>`;
    } else {
        displayHtml = `<div class="quiz-descr" style="font-size: 1.5rem; font-weight: bold; color: var(--primary); margin-bottom: 20px;">${modeMeta.display}</div>`;
    }

    container.innerHTML = `
        <div class="quiz-card">
            ${getEnglishOrderToggleHtml()}
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.9rem; opacity:0.8; margin-bottom:12px; gap:8px; flex-wrap:wrap;">
                <span>${getStage3ModeLabel(mode)} · ${activeQuizIdx + 1} / ${activeSectionData.length}</span>
                <button class="quiz-choice-btn" style="padding:6px 12px; font-size:0.85rem;" onclick="showStage3ModeSelect()">🔄 방식 바꾸기</button>
            </div>
            ${imageHtml}
            ${displayHtml}
            <div style="margin-bottom: 12px; color: #666;">${modeMeta.sub}</div>
            ${hintHtml}
            ${interactiveHtml}
            <div style="margin-top:16px;">
                ${getEnglishSpeechRateChipsHtml()}
                <button class="quiz-button" style="background:#8b949e;" onclick="speakEnglish('${answerWord.replace(/'/g, "\\'")}')">🔊 원어민 발음 듣기</button>
            </div>
        </div>
    `;

    if (modeMeta.autoSpeak && typeof speakEnglish === 'function') {
        setTimeout(() => speakEnglish(answerWord), mode === 'listening' ? 300 : 500);
    }
}

// --------------------------------------------------------
// 4단계: 영어 문장방 (자동 스위칭 UI)
// --------------------------------------------------------
function renderStage4UI(container) {
    const currentItem = activeSectionData[activeQuizIdx];
    const answerSentence = currentItem.word.trim();
    const wordsArray = answerSentence.split(/\s+/);

    const imageUrl = currentItem.imageUrl || currentItem.image;
    const imageHtml = imageUrl ? `
        <div style="text-align:center; margin-bottom:15px;">
            <img src="${imageUrl}" style="max-width:100%; max-height:200px; border-radius:10px; box-shadow:0 4px 8px rgba(0,0,0,0.2); object-fit:contain;" alt="${currentItem.word}">
        </div>
    ` : '';
    
    let interactiveHtml = '';

    if (wordsArray.length >= 3) {
        // [단어 카드 순서 배열 팝업 UI]
        const scrambled = [...wordsArray].sort(() => Math.random() - 0.5);
        window.currentSentenceAnswer = [];
        window.sentenceTargetWords = wordsArray;

        window.selectSentenceWord = function(word, idx) {
            const btn = document.getElementById(`sent-word-btn-${idx}`);
            if (btn.style.visibility === 'hidden') return;
            btn.style.visibility = 'hidden';
            window.currentSentenceAnswer.push({ word, idx });
            window.renderSentenceBlanks();
        };

        window.renderSentenceBlanks = function() {
            const blankContainer = document.getElementById('sent-word-blanks');
            if (!blankContainer) return;
            let html = '';
            for (let i = 0; i < window.sentenceTargetWords.length; i++) {
                if (i < window.currentSentenceAnswer.length) {
                    const ansItem = window.currentSentenceAnswer[i];
                    html += `
                        <span style="border-bottom:3px solid var(--primary); padding:2px 8px; display:inline-flex; flex-direction:column; align-items:center; color:var(--primary); font-weight:bold; margin:0 4px; line-height:1.2;">
                            <span style="font-size:1.4rem;">${ansItem.word}</span>
                            <span style="font-size:0.85rem; font-family:'Jua',sans-serif; color:#0284c7; margin-top:2px;">${getPhonicsKorean(ansItem.word)}</span>
                        </span>
                    `;
                } else {
                    html += '<span style="border-bottom:3px solid #ccc; width:50px; display:inline-block; margin:0 5px; height:36px;"></span>';
                }
            }
            blankContainer.innerHTML = html;
        };

        window.resetSentenceWords = function() {
            window.currentSentenceAnswer.forEach(item => {
                const btn = document.getElementById(`sent-word-btn-${item.idx}`);
                if (btn) btn.style.visibility = 'visible';
            });
            window.currentSentenceAnswer = [];
            window.renderSentenceBlanks();
        };

        window.verifySentenceOrder = function() {
            const answerStr = window.currentSentenceAnswer.map(item => item.word).join(' ');
            if (answerStr === answerSentence) {
                speakFairyTTS("정답이에요! 문장을 완벽하게 완성했어요!");
                speakEnglish(answerSentence);
                if (typeof rewardQuizCorrect === 'function') {
                    rewardQuizCorrect(activeQuizIdx);
                }
                renderStage4SuccessCard(container, answerSentence, currentItem.meaning);
            } else {
                const blankContainer = document.getElementById('sent-word-blanks');
                if (blankContainer) blankContainer.classList.add('wrong');
                promptEnglishWrong(() => {
                    if (blankContainer) blankContainer.classList.remove('wrong');
                    if (typeof resetSentenceWords === 'function') resetSentenceWords();
                });
            }
        };

        interactiveHtml = `
            <div id="sent-word-blanks" style="font-size: 1.5rem; margin-bottom: 20px; min-height: 48px; display: flex; justify-content: center; flex-wrap: wrap; line-height: 2;">
                ${wordsArray.map(() => '<span style="border-bottom:3px solid #ccc; width:50px; display:inline-block; margin:0 5px; height:36px;"></span>').join('')}
            </div>
            <div id="sent-word-pool" style="display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-bottom: 20px;">
                ${scrambled.map((w, i) => `
                    <button id="sent-word-btn-${i}" class="quiz-choice-btn sent-word-btn" onclick="selectSentenceWord('${w.replace(/'/g, "\\'")}', ${i})">
                        <span class="btn-eng">${w}</span>
                        <span class="btn-kor-phonics">${getPhonicsKorean(w)}</span>
                    </button>
                `).join('')}
            </div>
            <div style="display:flex; gap:10px; justify-content:center; margin-top:20px;">
                <button class="quiz-button" style="background:#ff9f43;" onclick="resetSentenceWords()">다시 배열하기</button>
                <button class="quiz-button" onclick="verifySentenceOrder()">정답 확인</button>
            </div>
        `;
    } else {
        // [빈칸 뚫기 객관식 3지선다 UI] (짧은 문장)
        const choices = [answerSentence];
        const otherSentences = allFetchedRecords.filter(r => isSentenceRecord(r) && r.word !== answerSentence).map(r => r.word);
        otherSentences.sort(() => Math.random() - 0.5);
        choices.push(otherSentences[0] || "I am a boy.");
        choices.push(otherSentences[1] || "You are a girl.");
        choices.sort(() => Math.random() - 0.5);

        window.verifyStage4Choice = function(selectedSentence) {
            if (selectedSentence === answerSentence) {
                speakFairyTTS("정답이에요! 훌륭해요!");
                speakEnglish(answerSentence);
                if (typeof rewardQuizCorrect === 'function') {
                    rewardQuizCorrect(activeQuizIdx);
                }
                renderStage4SuccessCard(container, answerSentence, currentItem.meaning);
            } else {
                promptEnglishWrong(() => {});
            }
        };

        interactiveHtml = `
            <div class="quiz-choices-container" style="display: flex; flex-direction: column; gap: 10px;">
                ${choices.map(choice => `
                     <button class="quiz-choice-btn" style="padding: 14px 18px; text-align: left; line-height: 1.4;" onclick="verifyStage4Choice('${choice.replace(/'/g, "\\'")}')">
                        <div style="font-size: 1.25rem; font-weight: bold;">${choice}</div>
                        <div style="font-size: 0.95rem; font-family: 'Jua', sans-serif; color: #0284c7; margin-top: 4px;">🗣️ ${choice.split(/\s+/).map(w => getPhonicsKorean(w)).join(' ')}</div>
                     </button>
                `).join('')}
            </div>
        `;
    }

    container.innerHTML = `
        <div class="quiz-card">
            ${getEnglishOrderToggleHtml()}
            <div style="font-size: 0.95rem; opacity:0.7; margin-bottom: 12px;">영어 문장 ${activeQuizIdx + 1} / ${activeSectionData.length}</div>
            ${imageHtml}
            <div class="quiz-descr" style="font-size: 1.5rem; font-weight: bold; color: var(--primary); margin-bottom: 14px;">${currentItem.meaning}</div>
            <div style="margin-bottom: 14px; color: #64748b; font-size: 0.98rem;">이 뜻에 맞는 영어 문장을 완성하세요!</div>
            
            ${getEnglishSpeechRateChipsHtml()}

            ${interactiveHtml}

            <div style="margin-top:20px;">
                <button class="quiz-button" style="background:#8b949e;" onclick="speakEnglish('${answerSentence.replace(/'/g, "\\'")}')">🔊 원어민 발음 힌트 듣기</button>
            </div>
        </div>
    `;
}

// --------------------------------------------------------
// 🌟 4단계 정답 성공 확인 카드 (완성된 문장을 눈으로 충분히 읽고 수동 넘김)
// --------------------------------------------------------
function renderStage4SuccessCard(container, sentence, meaning) {
    if (window._sentenceAutoAdvanceTimer) {
        clearTimeout(window._sentenceAutoAdvanceTimer);
    }

    container.innerHTML = `
        <div class="quiz-card" style="border: 2.5px solid #10b981; background: linear-gradient(180deg, rgba(16, 185, 129, 0.05) 0%, rgba(255, 255, 255, 0.95) 100%);">
            <div style="text-align:center; padding: 10px 5px 20px;">
                <div style="font-size: 3.5rem; margin-bottom: 6px; animation: bounceObj 1.2s infinite;">🎉</div>
                <div style="font-family:'Jua', sans-serif; font-size: 1.5rem; color: #059669; margin-bottom: 16px;">
                    참 잘했어요! 멋진 영어 문장 완성!
                </div>

                <!-- 완성된 문장 및 단어별 한글 파닉스 발음 1:1 블록 -->
                <div style="background: rgba(16, 185, 129, 0.12); border: 2px solid #10b981; border-radius: 18px; padding: 16px 12px; margin-bottom: 18px; box-shadow: 0 8px 25px rgba(16, 185, 129, 0.15);">
                    ${renderSentencePhonicsHtml(sentence)}
                    <div style="font-size: 1.2rem; font-weight: bold; color: #1e293b; background: rgba(255, 255, 255, 0.95); display: inline-block; padding: 6px 18px; border-radius: 25px; border: 1.5px solid #a7f3d0; margin-top: 4px;">
                        🇰🇷 ${meaning}
                    </div>
                </div>

                <!-- 배속 조절 칩 -->
                ${getEnglishSpeechRateChipsHtml()}

                <!-- 버튼 그룹 (다시 듣기 & 다음 문제 수동 넘김) -->
                <div style="display:flex; flex-direction:column; gap:12px; max-width:340px; margin: 20px auto 0;">
                    <button class="quiz-button" style="background:#0284c7; color:white; font-size:1.05rem; padding:12px 20px; border-radius:14px;" onclick="speakEnglish('${sentence.replace(/'/g, "\\'")}')">
                        🔊 원어민 발음 다시 듣기
                    </button>
                    <button class="quiz-button" style="background:linear-gradient(135deg, #10b981 0%, #059669 100%); color:white; font-size:1.3rem; font-weight:bold; padding:16px 24px; border-radius:18px; box-shadow:0 8px 25px rgba(16, 185, 129, 0.4); cursor:pointer;" onclick="window.proceedToNextSentenceQuiz()">
                        👉 다음 문제 풀기 ➡️
                    </button>
                </div>
            </div>
        </div>
    `;

    // 느긋하게 눈으로 확인할 수 있도록 15초 안전 자동 진행 타이머
    window._sentenceAutoAdvanceTimer = setTimeout(() => {
        window.proceedToNextSentenceQuiz();
    }, 15000);
}

window.proceedToNextSentenceQuiz = function() {
    if (window._sentenceAutoAdvanceTimer) {
        clearTimeout(window._sentenceAutoAdvanceTimer);
    }
    activeQuizIdx++;
    renderSectionUI();
};

// --------------------------------------------------------
// 5단계: 짧은 문단 독해 (국어 정밀독해방 구조 100% 재활용)
// --------------------------------------------------------
function renderReadingLobby(container) {
    let buttonsHtml = readingFetchedBooks.map(book => 
        `<button class="quiz-choice-btn" style="margin-bottom: 10px; width: 100%; text-align: left;" onclick="startReadingMission('${book.id}')">
            📖 [${book.title}] Reading Mission Start
        </button>`
    ).join('');

    container.innerHTML = `
        <div class="quiz-card">
            <h3 style="color:var(--mint); margin-bottom:20px;">오늘의 영어 독해 미션입니다. 원하는 지문을 선택하세요!</h3>
            ${buttonsHtml}
        </div>
    `;
}

window.startReadingMission = function(bookId) {
    activePassage = readingFetchedBooks.find(b => b.id === bookId);
    readingStage = 0;
    readingConjunctionIndex = 0;
    userOrderTracking = [];
    renderReadingStage();
};

window.renderReadingStage = function() {
    const container = document.getElementById('overlayInnerBody');
    const passageText = activePassage.fullText || (activePassage.paragraphs ? activePassage.paragraphs.map(p => p.text).join('\n') : "");
    
    if (readingStage === 1 && (!activePassage.conjunctions || activePassage.conjunctions.length === 0)) {
        if (typeof dispatchReadingStageReward === 'function') {
            dispatchReadingStageReward('stage5', activePassage?.id, 2);
        }
        readingStage = 2;
    }
    if (readingStage === 2 && !activePassage.themeQuiz) {
        if (typeof dispatchReadingStageReward === 'function') {
            dispatchReadingStageReward('stage5', activePassage?.id, 3);
        }
        readingStage = 3;
    }
    
    if (readingStage === 0) {
        // 문단 순서 맞추기 (paragraphs 배열 우선 → 없으면 fullText 줄바꿈 분할)
        let paragraphs;
        if (activePassage.paragraphs && activePassage.paragraphs.length > 0) {
            paragraphs = activePassage.paragraphs.map((p, idx) => ({
                id: p.id || `p${idx + 1}`,
                text: p.text
            }));
        } else {
            const rawParagraphs = passageText.split('\n').filter(p => p.trim() !== '');
            paragraphs = rawParagraphs.map((text, idx) => ({ id: `p${idx + 1}`, text }));
        }
        const correctOrder = activePassage.correctOrder || paragraphs.map(p => p.id);
        const shuffled = [...paragraphs].sort(() => Math.random() - 0.5);

        window.selectReadingPuzzle = function(id, el) {
            if (el.classList.contains('selected')) return;
            el.classList.add('selected');
            userOrderTracking.push(id);
            const text = el.textContent;
            document.getElementById('puzzle-slots').innerHTML += `<div style="margin-top:5px; color:var(--dark); font-weight:normal;">- ${text}</div>`;
        };
        window.verifyReadingOrder = function() {
            if (userOrderTracking.length !== correctOrder.length) {
                alert("모든 문단을 선택해주세요!"); return;
            }
            const isCorrect = userOrderTracking.every((id, index) => id === correctOrder[index]);
            if (isCorrect) {
                speakFairyTTS("Perfect! 순서를 완벽하게 맞췄어요!");
                if (typeof dispatchReadingStageReward === 'function') {
                    dispatchReadingStageReward('stage5', activePassage?.id, 1);
                }
                readingStage++;
                setTimeout(renderReadingStage, 1500);
            } else {
                if (typeof promptQuizRetryOrSkip === 'function') {
                    promptQuizRetryOrSkip({
                        message: '순서가 틀렸어요.',
                        onRetry: () => {
                            userOrderTracking = [];
                            const puzzleBlocks = document.querySelectorAll('.puzzle-block');
                            puzzleBlocks.forEach(b => b.classList.remove('selected'));
                            document.getElementById('puzzle-slots').innerHTML = "선택한 순서: ";
                        },
                        onSkip: () => {
                            readingStage++;
                            userOrderTracking = [];
                            renderReadingStage();
                        },
                    });
                } else {
                    speakFairyTTS("순서가 틀렸어요. 다시 한번 잘 읽어보세요!");
                    userOrderTracking = [];
                    const puzzleBlocks = document.querySelectorAll('.puzzle-block');
                    puzzleBlocks.forEach(b => b.classList.remove('selected'));
                    document.getElementById('puzzle-slots').innerHTML = "선택한 순서: ";
                }
            }
        };

        container.innerHTML = `
            <div class="quiz-card">
                <h3 style="color:var(--purple); margin-bottom:15px;">🧩 Mission 1: 문단의 올바른 순서를 완성하라!</h3>
                <div class="puzzle-pool">
                    ${shuffled.map(p => `<div class="puzzle-block" data-id="${p.id}" onclick="selectReadingPuzzle('${p.id}', this)">${p.text}</div>`).join('')}
                </div>
                <div id="puzzle-slots" class="puzzle-slots">선택한 순서: </div>
                <button class="quiz-button" style="width:100%;" onclick="verifyReadingOrder()">문단 결합 검사하기</button>
            </div>
        `;
    } else if (readingStage === 1) {
        // 접속사 퀴즈
        const conj = activePassage.conjunctions[readingConjunctionIndex];
        window.verifyReadingConj = function(optIdx) {
            const ans = conj.options[optIdx];
            const isCorrect = typeof gradeConjunctionAnswer === 'function'
                ? gradeConjunctionAnswer(conj, ans)
                : (ans === conj.answer);
            if (isCorrect) {
                const correctWord = typeof getConjunctionCorrectAnswer === 'function'
                    ? getConjunctionCorrectAnswer(conj)
                    : conj.answer;
                speakFairyTTS("정답이에요! Great job!");
                readingConjunctionIndex++;
                if (readingConjunctionIndex >= activePassage.conjunctions.length) {
                    if (typeof dispatchReadingStageReward === 'function') {
                        dispatchReadingStageReward('stage5', activePassage?.id, 2);
                    }
                    readingStage++;
                }
                setTimeout(renderReadingStage, 2000);
            } else {
                if (typeof promptQuizRetryOrSkip === 'function') {
                    promptQuizRetryOrSkip({
                        onRetry: () => {},
                        onSkip: () => {
                            readingConjunctionIndex++;
                            if (readingConjunctionIndex >= activePassage.conjunctions.length) {
                                readingStage++;
                                readingConjunctionIndex = 0;
                            }
                            renderReadingStage();
                        },
                    });
                } else {
                    speakFairyTTS("다시 한번 생각해봐요.");
                }
            }
        };

        container.innerHTML = `
            <div class="quiz-card">
                <h3 style="color:var(--accent-orange); margin-bottom:15px;">🔗 Mission 2: 알맞은 연결어 찾기! (${readingConjunctionIndex+1}/${activePassage.conjunctions.length})</h3>
                <div class="passage-box">
                    ${conj.sentenceBefore} <br><br>
                    <span style="color:var(--primary); font-weight:bold;">[ ? ]</span> <br><br>
                    ${conj.sentenceAfter}
                </div>
                <div style="display:flex; flex-direction:column; gap:10px;">
                    ${conj.options.map((opt, idx) => `<button class="quiz-choice-btn" onclick="verifyReadingConj(${idx})">${opt}</button>`).join('')}
                </div>
            </div>
        `;
    } else if (readingStage === 2) {
        // 주제 찾기 퀴즈
        const quiz = activePassage.themeQuiz;
        window.verifyReadingTheme = function(idx) {
            if (idx === quiz.answerIndex) {
                speakFairyTTS("Great job! 정답이에요!");
                if (typeof dispatchReadingStageReward === 'function') {
                    dispatchReadingStageReward('stage5', activePassage?.id, 3);
                }
                readingStage++;
                setTimeout(renderReadingStage, 2000);
            } else {
                if (typeof promptQuizRetryOrSkip === 'function') {
                    promptQuizRetryOrSkip({
                        onRetry: () => {},
                        onSkip: () => {
                            readingStage++;
                            renderReadingStage();
                        },
                    });
                } else {
                    speakFairyTTS("아니에요. 다시 한번 읽어볼까요?");
                }
            }
        };

        container.innerHTML = `
            <div class="quiz-card">
                <h3 style="color:var(--pink); margin-bottom:15px;">🎯 Mission 3: 핵심 주제를 찾아라!</h3>
                <div class="quiz-descr">${quiz.question}</div>
                <div style="display:flex; flex-direction:column; gap:10px;">
                    ${quiz.options.map((opt, i) => `<button class="quiz-choice-btn" style="text-align:left;" onclick="verifyReadingTheme(${i})">${i+1}. ${opt}</button>`).join('')}
                </div>
            </div>
        `;
    } else {
        if (typeof dispatchReadingClearBonus === 'function') {
            dispatchReadingClearBonus('stage5', activePassage?.id, activePassage?.title);
        }
        // 완료 및 보상
        const rewardCurrencyLabel = (currentProfile === 'son') ? '💎 다이아몬드 +30개' : '🍬 하리보 젤리 +30개';
        container.innerHTML = `
            <div style="text-align:center; padding: 40px 20px;">
                <div style="font-size:3.5rem; margin-bottom:15px;">🎉</div>
                <p style="font-size:1.45rem; color:var(--mint); font-weight:bold; margin-bottom:10px;">독해 미션을 완벽하게 클리어했습니다!</p>
                <div style="background: rgba(255,255,255,0.9); border-radius: 16px; padding: 15px 24px; display: inline-block; margin-bottom: 22px; border: 2px solid var(--primary); box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
                    <div style="font-size:1.4rem; font-weight:bold; color:var(--primary); margin-bottom:4px; font-family:'Jua', sans-serif;">
                        ${rewardCurrencyLabel} 획득!
                    </div>
                    <div style="font-size:0.95rem; color:#64748b;">
                        (스테이지 보상 15 + 클리어 보너스 15 = 총 30)
                    </div>
                </div><br>
                <button class="quiz-button" style="background:var(--sky-blue); color:white; border:none; padding:12px 28px; font-size:1.1rem; border-radius:12px; font-family:'Jua', sans-serif; cursor:pointer;" onclick="closeMissionView();">🎁 보상 챙기고 나가기</button>
            </div>
        `;
    }
};

// --------------------------------------------------------
// 6단계: 예비 중등 토론 (AI 지문 토론방 구조 재활용)
// --------------------------------------------------------
function renderSentenceUI(container) {
    let buttonsHtml = readingFetchedBooks.map(book => 
        `<button class="quiz-choice-btn" style="margin-bottom: 10px; width: 100%; text-align: left;" onclick="startSentenceMission('${book.id}')">
            🗣️ [${book.title}] Discussion Start
        </button>`
    ).join('');

    container.innerHTML = `
        <div class="quiz-card">
            <h3 style="color:var(--purple); margin-bottom:20px;">오늘의 영어 토론 지문입니다. 원하는 지문을 선택하세요!</h3>
            ${buttonsHtml}
        </div>
    `;
}

window.startSentenceMission = function(bookId) {
    activePassage = readingFetchedBooks.find(b => b.id === bookId);
    sentenceHistory = [];
    window.__sentenceDiscussionMemorySaved = false;
    if (typeof initDiscussionRewardSession === 'function') {
        initDiscussionRewardSession('stage6', activePassage);
    }
    renderSentenceChat();
};

window.renderSentenceChat = function() {
    const container = document.getElementById('overlayInnerBody');
    const passageText = activePassage.fullText || (activePassage.paragraphs ? activePassage.paragraphs.map(p => p.text).join('\n') : "");
    
    window.processSentenceInput = async function() {
        const inputEl = document.getElementById('sentenceInput');
        const text = inputEl.value.trim();
        if (!text) return;
        if (typeof resetGeminiChatErrorState === 'function') resetGeminiChatErrorState();
        inputEl.value = '';
        appendSentenceMsg('user', text);
        
        const loadingId = appendSentenceMsg('ai', "⏳ 코코가 생각 중이에요...");
        
        try {
            if (typeof processDiscussionMessageRewards === 'function') {
                await processDiscussionMessageRewards(text);
            }
            sentenceHistory.push({ role: "user", content: text });
            const systemPrompt = typeof buildDiscussionAISystemPrompt === 'function'
                ? buildDiscussionAISystemPrompt('영어', activePassage)
                : (typeof buildFullAISystemPrompt === 'function' ? buildFullAISystemPrompt('공부방', passageText) : passageText);
            
            const { text: reply } = await fetchWithGeminiRetry(
                `${PROXY_URL}/v1/chat/completions?type=ai`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        model: "gemini-2.5-flash",
                        messages: [
                            { role: "system", content: systemPrompt },
                            ...sentenceHistory
                        ]
                    })
                },
                {
                    maxRetries: 3,
                    baseDelayMs: 1000,
                    ui: { elementId: loadingId, chatBoxId: 'sentenceChatBox' }
                }
            );
            sentenceHistory.push({ role: "assistant", content: reply });

            if (typeof processDiscussionAiReply === 'function') {
                await processDiscussionAiReply(reply, {
                    missionType: 'stage6',
                    passageId: activePassage?.id,
                    bubbleId: loadingId,
                    chatBoxId: 'sentenceChatBox',
                    subject: '영어'
                });
            } else {
                applyGeminiResponseToWaitUI(reply.replace(/\n/g, '<br>'), {
                    elementId: loadingId,
                    chatBoxId: 'sentenceChatBox'
                });
                speakFairyTTS(reply.replace(/\[SUCCESS\]/g, ''));
                if (reply.includes("[SUCCESS]") && typeof dispatchDiscussionSuccessJackpot === 'function') {
                    await dispatchDiscussionSuccessJackpot('stage6', activePassage?.id);
                }
            }
        } catch (e) {
            console.error('[processSentenceInput] Gemini 호출 실패:', e);
            popLastPendingUserTurn(sentenceHistory, 'role', ['user']);
            if (typeof showGeminiFinalFailUI === 'function') {
                showGeminiFinalFailUI({ elementId: loadingId, chatBoxId: 'sentenceChatBox' });
            }
        }
    };

    window.appendSentenceMsg = function(sender, text) {
        const chatBox = document.getElementById('sentenceChatBox');
        if (!chatBox) return null;
        const msgId = typeof createChatBubbleId === 'function'
            ? createChatBubbleId('msg')
            : ('msg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8));
        const msgHtml = `<div id="${msgId}" class="msg ${sender}">${text}</div>`;
        chatBox.insertAdjacentHTML('beforeend', msgHtml);
        chatBox.scrollTop = chatBox.scrollHeight;
        return msgId;
    };

    window.toggleReadingTranslation = function() {
        const el = document.getElementById('sentenceTranslation');
        if (!el) return;
        el.style.display = el.style.display === 'none' ? 'block' : 'none';
    };

    const translationBlock = activePassage.translation ? `
            <button type="button" class="quiz-button" style="margin-top:10px; width:100%; font-size:0.85rem; padding:8px;" onclick="toggleReadingTranslation()">🇰🇷 한글 해석 보기 / 숨기기</button>
            <div id="sentenceTranslation" style="display:none; margin-top:10px; padding-top:10px; border-top:1px dashed #ccc; color:#555; line-height:1.6;">
                ${activePassage.translation.replace(/\n/g, '<br>')}
            </div>` : '';

    const isParent = (typeof isParentProfile === 'function' && isParentProfile()) || (isAdmin ?? false);
    let parentBadgeHtml = '';
    if (isParent && typeof getFairyPersonaSummary === 'function') {
        const summary = getFairyPersonaSummary('ENGLISH', '공부방');
        parentBadgeHtml = `
            <div style="background:linear-gradient(135deg, rgba(255, 215, 0, 0.12), rgba(59, 130, 246, 0.18)); border: 1px solid rgba(255, 215, 0, 0.4); border-radius: 10px; padding: 8px 12px; margin-bottom: 12px; font-size: 0.8rem; text-align: left;">
                <div style="font-weight:bold; color:#d97706; margin-bottom:3px; display:flex; justify-content:space-between; align-items:center;">
                    <span>👨‍👩‍👧 [부모 검수 모드] ${summary.icon} ${summary.title}</span>
                    <span style="background:rgba(217, 119, 6, 0.15); padding:1px 6px; border-radius:6px; font-size:0.72rem;">대상: ${summary.childName}</span>
                </div>
                <div style="color:#4b5563; font-size:0.78rem; line-height:1.4;">
                    🎭 <strong>역할</strong>: ${summary.role}<br>
                    💡 <strong>코칭 전략</strong>: ${summary.description}
                </div>
            </div>
        `;
    }

    container.innerHTML = `
        ${parentBadgeHtml}
        <div class="passage-box" style="font-size:0.95rem; max-height:150px; overflow-y:auto; margin-bottom:15px; border-left-color:var(--purple);">
            <strong>[${activePassage.title}]</strong><br>
            ${passageText.replace(/\n/g, '<br>')}
            ${translationBlock}
        </div>
        <div class="chat-box" id="sentenceChatBox" style="height:250px;"></div>
        <div class="interactive-input-group">
            <input type="text" class="text-input-field" id="sentenceInput" placeholder="영어로 짧게 적어봐요! (예: I think..., I like...)" onfocus="if(typeof resetGeminiChatErrorState==='function')resetGeminiChatErrorState()" onkeypress="if(event.key==='Enter') processSentenceInput()">
            <button class="quiz-button" onclick="processSentenceInput()">Send</button>
        </div>
        <div style="font-size: 0.8rem; color: #888; text-align: center; margin-top: 5px;">💡 Tip: 단어 하나만 적거나 한글로 모르는 걸 물어봐도 코코가 친절하게 알려줘요!</div>
    `;
    
    if (sentenceHistory.length === 0) {
        const initialMsgHtml = `Hello! 방금 읽은 <strong>[${activePassage.title}]</strong> 잘 읽어봤어? 첫 번째 질문! ✨<br>Did you like this story? Type 'Yes' or 'No'! (이야기가 마음에 들었어? Yes나 No로 대답해봐!)`;
        const initialMsgText = `Hello! Did you like the story [${activePassage.title}]? Type Yes or No!`;
        appendSentenceMsg('ai', initialMsgHtml);
        sentenceHistory.push({ role: "assistant", content: initialMsgText });
        speakFairyTTS(`Did you like this story? Type Yes or No!`);
    } else {
        sentenceHistory.forEach(h => appendSentenceMsg(h.role === 'user' ? 'user' : 'ai', h.content.replace(/\n/g, '<br>')));
    }
};

// ========================================================
// 🎁 보상 지급 연동
// ========================================================
window.triggerAwardDispense = async function(rewardAmount, type) {
    if (isAdmin) {
        alert(`[관리자 모드] ${rewardAmount}개의 보상 지급이 시뮬레이션 되었습니다.`);
        return;
    }
    
    const todayKey = new Date().toLocaleDateString();
    const countKey = `daily_reward_count_${currentUserName}_${todayKey}`;
    let currentCount = parseInt(localStorage.getItem(countKey) || "0");
    
    if (currentCount >= 100) {
        alert("🛑 오늘의 최대 획득 가능 보상(100개)을 모두 채웠습니다! 내일 다시 도전하세요!");
        return;
    }
    
    let actualReward = rewardAmount;
    if (currentCount + rewardAmount > 100) {
        actualReward = 100 - currentCount;
    }
    
    localStorage.setItem(countKey, currentCount + actualReward);
    
    if (typeof grantRewardAndShowUI === 'function') {
        await grantRewardAndShowUI(actualReward, false, '영어');
    }
};


// ========================================================
// 🖨️ [안전 증설] 영어 용어사전 4선 공책 인쇄 모듈 (클릭 순서 큐)
// ========================================================
let selectedPrintOrder = [];

window.toggleDictionarySelection = function(id) {
    const idx = selectedPrintOrder.findIndex(item => item.id === id);
    if (idx >= 0) {
        selectedPrintOrder.splice(idx, 1);
    } else {
        const record = allFetchedRecords.find(r => r.id === id);
        if(record) selectedPrintOrder.push(record);
    }
    updateDictionaryCheckboxes();
};

window.updateDictionaryCheckboxes = function() {
    allFetchedRecords.forEach(r => {
        const badge = document.getElementById(`dict-badge-${r.id}`);
        const checkbox = document.getElementById(`dict-chk-${r.id}`);
        if(badge && checkbox) {
            const orderIdx = selectedPrintOrder.findIndex(item => item.id === r.id);
            if (orderIdx >= 0) {
                checkbox.checked = true;
                const circleNumbers = ['①','②','③','④','⑤','⑥','⑦','⑧','⑨','⑩','⑪','⑫','⑬','⑭','⑮'];
                badge.textContent = orderIdx < 15 ? circleNumbers[orderIdx] : `(${orderIdx + 1})`;
                badge.style.display = 'inline-block';
            } else {
                checkbox.checked = false;
                badge.style.display = 'none';
            }
        }
    });
};

window.printDictionary = function() {
    if (selectedPrintOrder.length === 0) {
        alert('인쇄할 단어를 먼저 체크해주세요!');
        return;
    }
    
    let printArea = document.getElementById('print-area');
    if (!printArea) {
        printArea = document.createElement('div');
        printArea.id = 'print-area';
        document.body.appendChild(printArea);
    }
    
    // 📏 4선지 통합 규격 (four_line_print.css/js) 기반 렌더링
    let html = '<div class="print-container" style="padding: 20px;">';
    html += '<h2 style="text-align:center; font-family:\'Jua\', sans-serif; margin-bottom: 30px;">📝 영어 4선 공책 인쇄</h2>';
    
    selectedPrintOrder.forEach(r => {
        html += buildFourLineRowHtml(r.word, r.meaning);
    });
    html += '</div>';
    
    printArea.innerHTML = html;
    printWhenFontsReady();
};

window.renderDictionaryUI = function(container) {
    selectedPrintOrder = []; 
    
    let html = `
        <div class="quiz-card">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; flex-wrap:wrap; gap:10px;">
                <h3 style="color:var(--primary); margin:0;">📚 영어 용어사전</h3>
                <button class="quiz-button" style="background:var(--pink);" onclick="printDictionary()">🖨️ 4선 공책 인쇄하기</button>
            </div>
            <p style="text-align:left; font-size:0.9rem; color:#666; margin-bottom:15px;">인쇄할 단어를 체크하세요. <strong>체크한 순서대로</strong> 4선 공책에 배치됩니다!</p>
            <div style="text-align:left; max-height:400px; overflow-y:auto; border:2px solid #eee; padding:10px; border-radius:10px; background:#fff;">
    `;
    
    allFetchedRecords.forEach((r, idx) => {
        if(!r.id) r.id = 'voca_' + idx;
        html += `
            <div style="display:flex; align-items:center; padding:10px 5px; border-bottom:1px dashed #eee;">
                <input type="checkbox" id="dict-chk-${r.id}" onchange="toggleDictionarySelection('${r.id}')">
                <span id="dict-badge-${r.id}" style="display:none; color:var(--pink); font-weight:bold; margin-right:8px; width:22px; text-align:center; font-size:1.1rem;"></span>
                <span style="font-weight:bold; font-size:1.15rem; width:160px; display:inline-block; color:var(--ticket-border);">${r.word}</span>
                <span style="color:#666; font-size:1rem; flex:1;">${r.meaning || ''}</span>
            </div>
        `;
    });
    
    html += `
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}