// kids/js/korean_common.js
// 🔗 국어 멀티버스 공용 관제탑 엔진 (싱글 HTML 팝업 아키텍처 대통합 버전)

window.currentSubject = "국어"; // 전역 과목명 명시
let currentProfile = localStorage.getItem('currentUser') || 'son';
let currentUserName = localStorage.getItem('currentUserName') || '민수';
let currentTheme = localStorage.getItem('currentTheme') || 'theme--minecraft';
const isAdmin = (currentUserName === '아빠' || currentUserName === '엄마');

let activeSectionData = [];
let activeQuizIdx = 0;
let currentMissionType = "";
let allFetchedRecords = [];
let selectedKoreanGrade = "";
let selectedKoreanUnit = "";
let koreanVocaMode = 'choice'; // 'choice' or 'subjective'
let koreanVocaOrderType = 'shuffle'; // 'shuffle' or 'sequence'
let koreanDictationOrderType = 'shuffle'; // 'shuffle' or 'sequence'
let dictationAudioEl = null;

window.setKoreanVocaMode = function(mode) {
    koreanVocaMode = mode;
    renderSectionUI();
};

// AI 문장방 상태
let sentenceMode = 'base';
let sentenceHistory = [];
let sentenceCount = 0;

// 독해방 상태
let readingFetchedBooks = [];
let activePassage = null;
let readingStage = 0;
let readingConjunctionIndex = 0;
let userOrderTracking = [];

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

function toggleProfileManually() {
    if (currentProfile === 'son') {
        currentProfile = 'daughter'; currentUserName = '민서'; currentTheme = 'theme--slime';
    } else {
        currentProfile = 'son'; currentUserName = '민수'; currentTheme = 'theme--minecraft';
    }
    localStorage.setItem('currentUser', currentProfile);
    localStorage.setItem('currentUserName', currentUserName);
    localStorage.setItem('currentTheme', currentTheme);
    location.reload();
}

function initializeKoreanRoom() {
    console.log("🛠️ 국어방 초기화 엔진 가동...");
    const titleEl = document.getElementById('koreanTitle');
    const badgeEl = document.getElementById('adminBadgeTag');
    
    if (currentProfile === 'son') {
        document.body.className = "theme--minecraft";
        if (titleEl) titleEl.textContent = `${currentUserName}의 국어 멀티버스 대기실`;
        if (badgeEl) { badgeEl.className = "admin-status-badge"; badgeEl.textContent = `🎮 [${currentUserName}] 네온 관제`; }
    } else {
        document.body.className = "theme--slime";
        if (titleEl) titleEl.textContent = `${currentUserName}의 국어 멀티버스 대기실`;
        if (badgeEl) { badgeEl.className = "admin-status-badge korean--fairy"; badgeEl.textContent = `🎠 [${currentUserName}] 동화 모드`; }
    }

    if (isAdmin) {
        if (titleEl) titleEl.innerHTML = `<span style="color:var(--orange);">🛠️ 국어 관리자 시뮬레이터</span>`;
        if (badgeEl) badgeEl.textContent = `🛠️ [${currentUserName} 검수용] 프리패스 가동`;
    } else {
        if (typeof startLearning === 'function') startLearning("초등 국어 멀티버스");
    }
    updateTtsToggleUi();
    if (typeof initChatMemorySession === 'function') {
        initChatMemorySession('공부방');
    }
}

// ========================================================
// 🚪 오버레이 미션 팝업 연동 총 제어
// ========================================================
function isKoreanMissionInProgress() {
    const overlay = document.getElementById('missionOverlay');
    if (!overlay || overlay.style.display !== 'flex') return false;
    if (currentMissionType === 'voca' || currentMissionType === 'dictation') {
        return Array.isArray(activeSectionData) && activeSectionData.length > 0
            && activeQuizIdx < activeSectionData.length;
    }
    if (currentMissionType === 'reading') {
        return !!activePassage && readingStage < 3;
    }
    if (currentMissionType === 'sentence') {
        return !!activePassage;
    }
    return false;
}

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
    if ((type === 'voca' || type === 'dictation') && typeof initQuizRewardSession === 'function') {
        initQuizRewardSession(type);
    }
    selectedKoreanGrade = "";
    selectedKoreanUnit = "";

    let targetTitle = ""; let targetIcon = "";
    switch(type) {
        case 'storybook': targetTitle = "단원 동화 도서관 (Storybook Library)"; targetIcon = "📚"; break;
        case 'sentence': targetTitle = "AI 지문 토론방"; targetIcon = "🗣️"; break;
        case 'reading': targetTitle = "정밀 독해 멀티버스방"; targetIcon = "📖"; break;
        case 'voca': targetTitle = "국어 용어방"; targetIcon = "📚"; break;
        case 'dictation': targetTitle = "받아쓰기 훈련소"; targetIcon = "✍️"; break;
    }
    headerTitle.textContent = targetTitle;
    headerIcon.textContent = targetIcon;

    if (typeof armQuizLeaveGuard === 'function') {
        armQuizLeaveGuard({
            isActive: isKoreanMissionInProgress,
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
        if (currentMissionType === 'sentence' && sentenceHistory.length > 0) {
            if (typeof finalizeSentenceDiscussionSession === 'function') {
                await finalizeSentenceDiscussionSession({
                    messages: sentenceHistory,
                    roomType: '공부방',
                    missionType: 'sentence'
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
        stopDictationAudio();
        stopFairyTTS();
    });
}

function stopDictationAudio() {
    if (dictationAudioEl) {
        dictationAudioEl.pause();
        dictationAudioEl.currentTime = 0;
        dictationAudioEl.onended = null;
        dictationAudioEl.onerror = null;
        dictationAudioEl = null;
    }
}

function playDictationAudio(item) {
    if (!item) return;
    stopDictationAudio();
    const text = item.word.trim();
    if (item.audioUrl) {
        dictationAudioEl = new Audio(item.audioUrl);
        dictationAudioEl.onerror = () => {
            speakFairyTTS(text);
        };
        dictationAudioEl.play().catch(() => speakFairyTTS(text));
    } else {
        speakFairyTTS(text);
    }
}

window.replayDictationAudio = function() {
    playDictationAudio(activeSectionData[activeQuizIdx]);
};

function getKoreanFilteredRecords() {
    let matchedRecords = allFetchedRecords;
    if (selectedKoreanGrade) {
        matchedRecords = matchedRecords.filter(r =>
            r.grade === selectedKoreanGrade || r.grades.includes(selectedKoreanGrade)
        );
    }
    if (selectedKoreanUnit) {
        matchedRecords = matchedRecords.filter(r => String(r.level).trim() === selectedKoreanUnit);
    }
    return matchedRecords;
}

function getKoreanOrderToggleHtml(orderType) {
    return `
        <div style="display:flex; justify-content:center; align-items:center; margin-bottom: 20px;">
            <button class="quiz-button" onclick="window.koreanToggleQuizOrder()" style="padding: 8px 16px; font-size: 0.95rem; border-radius: 20px;">
                ${orderType === 'shuffle' ? '🎲 랜덤 섞기 (클릭하여 순서대로)' : '➡️ 순서대로 (클릭하여 랜덤 섞기)'}
            </button>
        </div>
    `;
}

window.koreanToggleQuizOrder = function() {
    if (currentMissionType === 'dictation') {
        koreanDictationOrderType = (koreanDictationOrderType === 'shuffle') ? 'sequence' : 'shuffle';
    } else if (currentMissionType === 'voca') {
        koreanVocaOrderType = (koreanVocaOrderType === 'shuffle') ? 'sequence' : 'shuffle';
    }
    activeQuizIdx = 0;
    const innerBody = document.getElementById('overlayInnerBody');
    if (!innerBody) return;
    startMissionWithFilteredData(getKoreanFilteredRecords(), innerBody);
};

window.koreanToggleDictationOrder = window.koreanToggleQuizOrder;

// ========================================================
// 📚 국어 단원별 스토리북 도서관 데이터베이스
// ========================================================
const KOREAN_STORYBOOK_LIBRARY = [
    {
        id: "1_2_1_1",
        grade: "1학년 2학기",
        gradeCode: "1-2",
        unit: "1단원",
        bookNum: "1권",
        title: "마음 똑똑! 감정 라디오 교실",
        subtitle: "감정의 날씨와 화해 이야기",
        desc: "마음속에 찾아오는 날씨와 다양한 감정들! 실수로 그림이 찢어졌을 때 민서와 서율이는 어떻게 화해했을까요?",
        icon: "📻",
        color: "#ec4899",
        bgGrad: "linear-gradient(135deg, rgba(236, 72, 153, 0.15) 0%, rgba(30, 41, 59, 0.9) 100%)",
        border: "#ec4899",
        link: "korean_1_2_1_storybook.html",
        coverImg: "images/minseo/1-2/1/storybook/korean_story_p1.png"
    },
    {
        id: "1_2_1_2",
        grade: "1학년 2학기",
        gradeCode: "1-2",
        unit: "1단원",
        bookNum: "2권",
        title: "소곤소곤 나-전달법",
        subtitle: "우유 쏟은 민수 오빠와 마법 주문",
        desc: "상황-감정-바라는 점 3단계 마법 주문! 화내지 않고 소곤소곤 예쁘게 내 마음을 전하는 법을 배워요.",
        icon: "💬",
        color: "#3b82f6",
        bgGrad: "linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(30, 41, 59, 0.9) 100%)",
        border: "#3b82f6",
        link: "korean_1_2_1_storybook_2.html",
        coverImg: "images/minseo/1-2/1/storybook_2/korean_story_p1.png"
    },
    {
        id: "1_2_1_3",
        grade: "1학년 2학기",
        gradeCode: "1-2",
        unit: "1단원",
        bookNum: "3권",
        title: "슬찬이의 필통 소동",
        subtitle: "교실에서 실천한 나-전달법 마법 주문",
        desc: "와장창 쏟아진 필통과 그림에 그어진 까만 선! 화내지 않고 나-전달법으로 슬기롭게 해결해요.",
        icon: "✏️",
        color: "#10b981",
        bgGrad: "linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(30, 41, 59, 0.9) 100%)",
        border: "#10b981",
        link: "korean_1_2_1_storybook_3.html",
        coverImg: "images/minseo/1-2/1/storybook_3/korean_story_p1.png"
    },
    {
        id: "1_2_1_4",
        grade: "1학년 2학기",
        gradeCode: "1-2",
        unit: "1단원",
        bookNum: "4권",
        title: "가슴이 얼음처럼 꽁꽁 긴장돼요!",
        subtitle: "발표 불안을 녹이는 솔직한 고백과 친구들의 응원",
        desc: "친구들 앞 발표에 가슴이 쿵쾅쿵쾅! 솔직하게 내 마음을 털어놓고 친구들의 따뜻한 응원으로 용기를 얻어요.",
        icon: "🧊",
        color: "#8b5cf6",
        bgGrad: "linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(30, 41, 59, 0.9) 100%)",
        border: "#8b5cf6",
        link: "korean_1_2_1_storybook_4.html",
        coverImg: "images/minseo/1-2/1/storybook_4/korean_story_p1.png"
    }
];

function renderStorybookLibrary(innerBody) {
    innerBody.innerHTML = `
        <div style="max-width: 800px; margin: 0 auto; padding: 10px;">
            <div style="text-align: center; margin-bottom: 24px;">
                <h3 style="font-family: 'Jua', sans-serif; font-size: 1.4rem; color: #f472b6; margin-bottom: 6px;">
                    📖 국어 단원 동화 도서관
                </h3>
                <p style="font-size: 0.95rem; color: #94a3b8;">
                    교과서 내용이 쏙쏙 이해되는 재미있는 동화와 구연동화 음성을 만나보세요!
                </p>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px;">
                ${KOREAN_STORYBOOK_LIBRARY.map(book => `
                    <div style="background: ${book.bgGrad}; border: 2px solid ${book.border}; border-radius: 18px; padding: 16px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 8px 25px rgba(0,0,0,0.4); transition: transform 0.2s;" onmouseover="this.style.transform='translateY(-4px)'" onmouseout="this.style.transform='none'">
                        <div>
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                                <span style="background: ${book.color}; color: white; padding: 3px 10px; border-radius: 12px; font-family: 'Jua', sans-serif; font-size: 0.85rem;">
                                    [${book.gradeCode} ${book.unit}] ${book.bookNum}
                                </span>
                                <span style="font-size: 1.3rem;">${book.icon}</span>
                            </div>
                            
                            <img src="${book.coverImg}?v=20260902_1" alt="${book.title}" style="width: 100%; height: 160px; object-fit: cover; border-radius: 12px; margin-bottom: 12px; border: 1px solid rgba(255,255,255,0.1);">
                            
                            <h4 style="font-family: 'Jua', sans-serif; font-size: 1.15rem; color: #f8fafc; margin-bottom: 4px;">
                                ${book.title}
                            </h4>
                            <p style="font-size: 0.88rem; color: #f472b6; font-weight: bold; margin-bottom: 8px;">
                                ${book.subtitle}
                            </p>
                            <p style="font-size: 0.85rem; color: #cbd5e1; line-height: 1.5; margin-bottom: 14px;">
                                ${book.desc}
                            </p>
                        </div>

                        <a href="${book.link}" style="display: block; width: 100%; padding: 10px 0; background: ${book.color}; color: white; text-align: center; border-radius: 12px; font-family: 'Jua', sans-serif; font-size: 1rem; text-decoration: none; box-shadow: 0 4px 12px rgba(0,0,0,0.3); transition: opacity 0.2s;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
                            📖 동화책 읽기 (구연동화)
                        </a>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// ========================================================
// 📊 데이터 페칭 및 동적 UI 생성
// ========================================================
async function fetchAndBuildDynamicUI(type, innerBody) {
    try {
        if (type === 'storybook') {
            renderStorybookLibrary(innerBody);
            return;
        }

        if (type === 'sentence' || type === 'reading') {
            let libraryRecords = [];
            if (typeof fetchLibraryBooksFromNotion === 'function') {
                try {
                    libraryRecords = await fetchLibraryBooksFromNotion();
                } catch (err) {
                    console.warn('[korean] 도서관 노션 조회 실패, 로컬 지문으로 대체합니다:', err);
                }
            }

            readingFetchedBooks = typeof resolveReadingPassageList === 'function'
                ? resolveReadingPassageList(libraryRecords, KOREAN_READING_DATABASE)
                : KOREAN_READING_DATABASE.slice(0, 10);

            if (readingFetchedBooks.length === 0) {
                innerBody.innerHTML = `<div style="text-align:center; padding:40px;">등록된 지문이 없습니다.</div>`;
                return;
            }

            if (type === 'sentence') {
                renderSentenceUI(innerBody);
            } else {
                renderReadingLobby(innerBody);
            }
        } else if (type === 'voca' || type === 'dictation') {
            const subjectTag = type === 'voca' ? "국어" : "받아쓰기";
            const records = await fetchVocaFromNotion({ subject: subjectTag, filterByStudent: !isAdmin });
            
            if (records && records.length > 0) {
                allFetchedRecords = records;
                const uniqueGrades = [...new Set(records.flatMap(r => r.grades || [r.grade]))].filter(g => g && g !== "공통").sort();
                if (uniqueGrades.length === 0) {
                    startMissionWithFilteredData(records, innerBody);
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
// 🎒 학년/단원 필터 UI (사회방 이식)
// ========================================================
function renderDynamicGradeUI(grades, container) {
    let html = `<div style="text-align:center; margin-bottom:20px;">
        <h3 style="color:var(--purple); margin-bottom:15px;">🎒 도전할 학년을 선택하세요!</h3>
        <div class="grade-grid">`;
    grades.forEach(g => {
        html += `<button class="quiz-choice-btn" style="padding:15px; font-size:1.2rem;" onclick="selectDynamicGrade('${g}')">${g}</button>`;
    });
    html += `</div></div>`;
    container.innerHTML = html;
}

window.selectDynamicGrade = function(grade) {
    selectedKoreanGrade = grade;
    const innerBody = document.getElementById('overlayInnerBody');
    const matchedRecords = allFetchedRecords.filter(r => r.grade === grade || r.grades.includes(grade));
    const uniqueUnits = [...new Set(matchedRecords.map(r => String(r.level).trim()))].filter(u => u && u !== "undefined").sort((a,b) => a.localeCompare(b, undefined, {numeric: true}));
    
    if (uniqueUnits.length === 0 || (uniqueUnits.length === 1 && uniqueUnits[0] === "기본 단원")) {
        startMissionWithFilteredData(matchedRecords, innerBody);
    } else {
        renderDynamicUnitUI(uniqueUnits, innerBody);
    }
};

function renderDynamicUnitUI(units, container) {
    let html = `<div style="text-align:center; margin-bottom:20px;">
        <h3 style="color:var(--sky); margin-bottom:15px;">📚 [${selectedKoreanGrade}] 도전할 단원을 선택하세요!</h3>
        <div class="grade-grid">`;
    units.forEach(u => {
        html += `<button class="quiz-choice-btn" style="padding:15px 5px; font-size:1.1rem;" onclick="selectDynamicUnit('${u}')">${u}</button>`;
    });
    html += `</div>
        <div style="margin-top:20px;">
            <button class="quiz-button" style="background:#8b949e; width:100%;" onclick="openMissionView(currentMissionType)">⬅️ 처음으로 돌아가기</button>
        </div>
    </div>`;
    container.innerHTML = html;
}

window.selectDynamicUnit = function(unit) {
    selectedKoreanUnit = unit;
    const innerBody = document.getElementById('overlayInnerBody');
    const finalRecords = allFetchedRecords.filter(r => 
        (r.grade === selectedKoreanGrade || r.grades.includes(selectedKoreanGrade)) &&
        String(r.level).trim() === unit
    );
    startMissionWithFilteredData(finalRecords, innerBody);
};

function startMissionWithFilteredData(records, innerBody) {
    let prepared = [...records];
    const orderType = currentMissionType === 'dictation'
        ? koreanDictationOrderType
        : (currentMissionType === 'voca' ? koreanVocaOrderType : 'shuffle');
    if (orderType === 'shuffle') {
        prepared.sort(() => Math.random() - 0.5);
    }
    activeSectionData = prepared.slice(0, 10); // 최대 10문제
    if (activeSectionData.length === 0) {
        innerBody.innerHTML = `<div style="text-align:center; padding:40px;">해당 조건의 문제가 없습니다.</div>`;
        return;
    }
    renderSectionUI();
}

async function advanceKoreanQuizAfterCorrect(delayMs = 1000) {
    if (typeof rewardQuizCorrect === 'function') {
        await rewardQuizCorrect(activeQuizIdx);
    }
    activeQuizIdx++;
    setTimeout(renderSectionUI, delayMs);
}

function skipKoreanQuestion() {
    activeQuizIdx++;
    renderSectionUI();
}

function promptKoreanWrong(note, onRetry) {
    if (!window.wrongNotes) window.wrongNotes = [];
    window.wrongNotes.push(note);
    const retry = typeof onRetry === 'function' ? onRetry : () => {};
    if (typeof promptQuizRetryOrSkip === 'function') {
        promptQuizRetryOrSkip({ onRetry: retry, onSkip: skipKoreanQuestion });
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
                <p style="font-size:1.4rem; color:var(--purple); margin-bottom:20px;">모든 문제를 완료했습니다!</p>
                <button class="back-to-lobby-btn" style="background:var(--pink); color:white;" onclick="closeMissionView();">✅ 나가기</button>
            </div>`;
        return;
    }

    if (currentMissionType === 'voca') renderVocaUI(container);
    else if (currentMissionType === 'dictation') renderDictationUI(container);
}

// --------------------------------------------------------
// 1. 국어 용어방 (단어 -> 뜻 맞추기 객관식 강제)
// --------------------------------------------------------
// --------------------------------------------------------
// 1. 국어 용어방 (단어 -> 뜻 맞추기 객관식 / 뜻 -> 단어 맞추기 주관식 선택)
// --------------------------------------------------------
function renderVocaUI(container) {
    const currentItem = activeSectionData[activeQuizIdx];
    
    const imageUrl = currentItem.imageUrl || currentItem.image;
    const imageHtml = imageUrl ? `
        <div style="text-align:center; margin-bottom:15px;">
            <img src="${imageUrl}" style="max-width:100%; max-height:200px; border-radius:10px; box-shadow:0 4px 8px rgba(0,0,0,0.2); object-fit:contain;" alt="${currentItem.word}">
        </div>
    ` : '';

    const orderToggleHtml = getKoreanOrderToggleHtml(koreanVocaOrderType);

    // 상단 토글 탭 UI
    const toggleHtml = `
        ${orderToggleHtml}
        <div style="display:flex; justify-content:center; gap:10px; margin-bottom:20px;">
            <button class="quiz-button" style="background: ${koreanVocaMode === 'subjective' ? 'var(--purple)' : '#ccc'}; color: white; padding: 8px 16px; border-radius: 20px; font-size: 0.95rem;" onclick="setKoreanVocaMode('subjective')">✏️ 단어 맞추기 (주관식)</button>
            <button class="quiz-button" style="background: ${koreanVocaMode === 'choice' ? 'var(--purple)' : '#ccc'}; color: white; padding: 8px 16px; border-radius: 20px; font-size: 0.95rem;" onclick="setKoreanVocaMode('choice')">🧐 뜻 고르기 (객관식)</button>
        </div>
    `;

    let quizContentHtml = '';

    if (koreanVocaMode === 'subjective') {
        // [✏️ 단어 맞추기 (주관식)]
        // 노션 데이터의 '뜻풀이'가 문제 텍스트로 출제되고, 하단 UI는 단어 구조에 따라 동적 변환
        const answerWord = currentItem.word.trim();
        const wordsArray = answerWord.split(/\s+/);
        const wordCount = wordsArray.length;
        const totalLength = answerWord.length;

        let interactiveHtml = '';

        if (wordCount === 1 && totalLength > 5) {
            // 💡 조건 1: 띄어쓰기 없는 '1개 단어'인데 5글자가 넘는 경우 -> 자석 UI (빈칸 채우기)
            const chars = answerWord.split('').filter(c => c.trim() !== '');
            const scrambled = [...chars].sort(() => Math.random() - 0.5);

            window.currentKoreanMagnetAnswer = [];
            window.koreanMagnetTargetWord = answerWord;

            window.selectKoreanVocaMagnet = function(letter, idx) {
                const btn = document.getElementById(`korean-magnet-btn-${idx}`);
                if (btn.style.visibility === 'hidden') return;
                btn.style.visibility = 'hidden';
                window.currentKoreanMagnetAnswer.push({ letter, idx });
                window.renderKoreanVocaMagnetBlanks();
            };

            window.renderKoreanVocaMagnetBlanks = function() {
                const container = document.getElementById('korean-magnet-blanks');
                if (!container) return;
                let html = '';
                let answerIdx = 0;
                for (let i = 0; i < window.koreanMagnetTargetWord.length; i++) {
                    const char = window.koreanMagnetTargetWord[i];
                    if (char.trim() === '') {
                        html += '<span style="width:15px;"></span>';
                    } else {
                        if (answerIdx < window.currentKoreanMagnetAnswer.length) {
                            html += `<span style="border-bottom:3px solid var(--purple); width:30px; display:inline-block; text-align:center; color:var(--purple); font-weight:bold;">${window.currentKoreanMagnetAnswer[answerIdx].letter}</span>`;
                            answerIdx++;
                        } else {
                            html += '<span style="border-bottom:3px solid #ccc; width:30px; display:inline-block; text-align:center;">_</span>';
                        }
                    }
                }
                container.innerHTML = html;
            };

            window.resetKoreanVocaMagnets = function() {
                window.currentKoreanMagnetAnswer.forEach(item => {
                    const btn = document.getElementById(`korean-magnet-btn-${item.idx}`);
                    if (btn) btn.style.visibility = 'visible';
                });
                window.currentKoreanMagnetAnswer = [];
                window.renderKoreanVocaMagnetBlanks();
            };

            window.verifyKoreanVocaMagnet = function() {
                const answerStr = window.currentKoreanMagnetAnswer.map(item => item.letter).join('');
                const correctTarget = window.koreanMagnetTargetWord.replace(/\s/g, '');

                if (answerStr === correctTarget) {
                    speakFairyTTS("정답이에요! 아주 훌륭해요!");
                    advanceKoreanQuizAfterCorrect(1000);
                } else {
                    const container = document.getElementById('korean-magnet-blanks');
                    if (container) container.classList.add('wrong');
                    promptKoreanWrong(
                        { word: currentItem.word, wrongInput: answerStr },
                        () => {
                            if (container) container.classList.remove('wrong');
                            if (typeof resetKoreanVocaMagnets === 'function') resetKoreanVocaMagnets();
                        }
                    );
                }
            };

            interactiveHtml = `
                <div id="korean-magnet-blanks" style="font-size: 2rem; letter-spacing: 5px; margin-bottom: 20px; min-height: 40px; display: flex; justify-content: center; gap: 5px;">
                    ${answerWord.split('').map(c => c.trim() === '' ? '<span style="width:15px;"></span>' : '<span style="border-bottom:3px solid #ccc; width:30px; display:inline-block; text-align:center;">_</span>').join('')}
                </div>
                <div id="korean-magnet-pool" style="display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-bottom: 20px;">
                    ${scrambled.map((l, i) => `<button id="korean-magnet-btn-${i}" class="quiz-choice-btn" style="padding: 10px 20px; font-size: 1.5rem;" onclick="selectKoreanVocaMagnet('${l}', ${i})">${l}</button>`).join('')}
                </div>
                <div style="display:flex; gap:10px; justify-content:center; margin-top:20px;">
                    <button class="quiz-button" style="background:#ff9f43;" onclick="resetKoreanVocaMagnets()">다시 조합하기</button>
                    <button class="quiz-button" onclick="verifyKoreanVocaMagnet()">정답 확인</button>
                    <button class="quiz-button" style="background:#8b949e;" onclick="speakFairyTTS('${currentItem.meaning.replace(/'/g, "\\'")}')">🔊 문제 듣기</button>
                    <button class="quiz-button" style="background:var(--pink);" onclick="activeQuizIdx++; renderSectionUI();">건너뛰기 ⏩</button>
                </div>
            `;
        } else if (wordCount >= 3) {
            // 💡 조건 2: 3단어 이상 결합된 경우 -> 객관식 문제 UI
            const choices = [answerWord];
            const otherWords = allFetchedRecords.filter(r => r.word !== answerWord).map(r => r.word);
            otherWords.sort(() => Math.random() - 0.5);
            choices.push(otherWords[0] || "오답 1");
            choices.push(otherWords[1] || "오답 2");
            choices.sort(() => Math.random() - 0.5);

            window.verifyKoreanVocaSubjectiveChoice = function(selectedWord) {
                if (selectedWord === answerWord) {
                    speakFairyTTS("정답이에요! 아주 훌륭해요!");
                    advanceKoreanQuizAfterCorrect(1000);
                } else {
                    promptKoreanWrong(
                        { word: currentItem.word, wrongInput: selectedWord },
                        () => {}
                    );
                }
            };

            interactiveHtml = `
                <div class="quiz-choices-container" style="margin-bottom: 20px; display: flex; flex-direction: column; gap: 10px;">
                    ${choices.map(choice => `
                         <button class="quiz-choice-btn" style="text-align:left; line-height:1.4;" onclick="verifyKoreanVocaSubjectiveChoice('${choice.replace(/'/g, "\\'")}')">${choice}</button>
                    `).join('')}
                </div>
                <div style="display:flex; gap:10px; justify-content:center; margin-top:20px;">
                    <button class="quiz-button" style="background:#8b949e;" onclick="speakFairyTTS('${currentItem.meaning.replace(/'/g, "\\'")}')">🔊 문제 듣기</button>
                    <button class="quiz-button" style="background:var(--pink);" onclick="activeQuizIdx++; renderSectionUI();">건너뛰기 ⏩</button>
                </div>
            `;
        } else {
            // 💡 조건 3: 그 외의 경우 -> 기존 주관식 타이핑 UI
            window.verifyKoreanVocaSubjective = function() {
                const inputEl = document.getElementById('vocaSubjectiveInput');
                if (!inputEl) return;
                const inputVal = inputEl.value.trim().replace(/\s/g, '');
                const correctTarget = answerWord.replace(/\s/g, '');
                if (inputVal === correctTarget) {
                    speakFairyTTS("정답이에요! 아주 훌륭해요!");
                    inputEl.classList.add('correct');
                    advanceKoreanQuizAfterCorrect(1000);
                } else {
                    inputEl.classList.add('wrong');
                    promptKoreanWrong(
                        { word: currentItem.word, wrongInput: inputVal },
                        () => {
                            inputEl.classList.remove('wrong');
                            inputEl.value = '';
                            inputEl.focus();
                        }
                    );
                }
            };

            interactiveHtml = `
                <div class="interactive-input-group" style="margin-bottom: 20px;">
                    <input id="vocaSubjectiveInput" class="text-input-field" type="text" autocomplete="off" placeholder="정답 단어를 입력하세요!" onkeypress="if(event.key === 'Enter') verifyKoreanVocaSubjective()" style="width:100%;">
                </div>
                
                <div style="display:flex; gap:10px; justify-content:center; margin-top:20px;">
                    <button class="quiz-button" onclick="verifyKoreanVocaSubjective()">정답 확인</button>
                    <button class="quiz-button" style="background:#8b949e;" onclick="speakFairyTTS('${currentItem.meaning.replace(/'/g, "\\'")}')">🔊 문제 듣기</button>
                    <button class="quiz-button" style="background:var(--pink);" onclick="activeQuizIdx++; renderSectionUI();">건너뛰기 ⏩</button>
                </div>
            `;
        }

        quizContentHtml = `
            <div class="quiz-descr" style="font-size: 1.5rem; font-weight: bold; color: var(--purple); margin-bottom: 20px;">${currentItem.meaning}</div>
            <div style="margin-bottom: 20px; color: #666;">이 뜻풀이에 알맞은 단어를 적어보세요!</div>
            ${interactiveHtml}
        `;
    } else {
        // [🧐 뜻 고르기 (객관식)]
        // 노션 데이터의 '단어명'이 문제로 출제되고, 하단 UI는 기존에 만들어둔 객관식 3지선다(정답은 뜻풀이)
        const answerMeaning = currentItem.meaning;
        const choices = [answerMeaning];
        const otherMeanings = allFetchedRecords.filter(r => r.meaning && r.meaning !== answerMeaning).map(r => r.meaning);
        otherMeanings.sort(() => Math.random() - 0.5);
        choices.push(otherMeanings[0] || "전혀 관계없는 뜻입니다.");
        choices.push(otherMeanings[1] || "다른 단어의 뜻입니다.");
        choices.sort(() => Math.random() - 0.5);

        window.verifyKoreanVocaChoice = function(selectedMeaning) {
            if (selectedMeaning === answerMeaning) {
                speakFairyTTS("정답이에요! 아주 훌륭해요!");
                advanceKoreanQuizAfterCorrect(1000);
            } else {
                promptKoreanWrong(
                    { word: currentItem.word, wrongInput: selectedMeaning },
                    () => {}
                );
            }
        };

        quizContentHtml = `
            <div class="quiz-descr" style="font-size: 2.2rem; font-weight: bold; color: var(--purple); margin-bottom: 20px;">${currentItem.word}</div>
            <div style="margin-bottom: 20px; color: #666;">이 단어의 올바른 뜻을 골라보세요!</div>
            
            <div class="quiz-choices-container" style="margin-bottom: 20px;">
                ${choices.map(choice => `
                     <button class="quiz-choice-btn" style="text-align:left; line-height:1.4;" onclick="verifyKoreanVocaChoice('${choice.replace(/'/g, "\\'")}')">${choice}</button>
                `).join('')}
            </div>
            
            <div style="display:flex; gap:10px; justify-content:center; margin-top:20px;">
                <button class="quiz-button" style="background:#8b949e;" onclick="speakFairyTTS('${currentItem.word.replace(/'/g, "\\'")}')">🔊 단어 듣기</button>
                <button class="quiz-button" style="background:var(--pink);" onclick="activeQuizIdx++; renderSectionUI();">건너뛰기 ⏩</button>
            </div>
        `;
    }

    container.innerHTML = `
        <div class="quiz-card">
            <div style="font-size: 0.95rem; opacity:0.7; margin-bottom: 15px;">단어 ${activeQuizIdx + 1} / ${activeSectionData.length}</div>
            ${toggleHtml}
            ${imageHtml}
            ${quizContentHtml}
        </div>
    `;

    // 자동 낭독
    if (koreanVocaMode === 'subjective') {
        speakFairyTTS(currentItem.meaning);
    } else {
        speakFairyTTS(currentItem.word);
    }
}

// --------------------------------------------------------
// 2. 받아쓰기 훈련소
// --------------------------------------------------------
function renderDictationUI(container) {
    const currentItem = activeSectionData[activeQuizIdx];
    const audioSourceLabel = currentItem.audioUrl ? '🎙️ 아빠/엄마 녹음' : '🧚‍♀️ 요정 TTS';

    const orderToggleHtml = getKoreanOrderToggleHtml(koreanDictationOrderType);
    
    window.verifyKoreanDictation = function() {
        const inputVal = document.getElementById('dictationInput').value.trim();
        if (inputVal === currentItem.word.trim()) {
            speakFairyTTS("완벽해요! 띄어쓰기까지 정확하게 맞췄어요!");
            document.getElementById('dictationInput').classList.add('correct');
            advanceKoreanQuizAfterCorrect(1500);
        } else {
            const inputEl = document.getElementById('dictationInput');
            inputEl.classList.add('wrong');
            promptKoreanWrong(
                { word: currentItem.word, wrongInput: inputVal },
                () => {
                    inputEl.classList.remove('wrong');
                    inputEl.value = '';
                    inputEl.focus();
                }
            );
        }
    };

    container.innerHTML = `
        <div class="quiz-card">
            ${orderToggleHtml}
            <div style="font-size: 0.95rem; opacity:0.7; margin-bottom: 10px;">받아쓰기 ${activeQuizIdx + 1} / ${activeSectionData.length}</div>
            <div style="font-size: 5rem; margin-bottom: 10px; cursor: pointer;" onclick="replayDictationAudio()">🎧</div>
            <div style="font-size: 0.9rem; color: #888; margin-bottom: 20px;">${audioSourceLabel}</div>
            <div id="dictationHint" style="font-size: 1.2rem; color: #888; margin-bottom: 20px; display: none;">${currentItem.word}</div>
            
            <input id="dictationInput" class="text-input-field" type="text" autocomplete="off" placeholder="여기에 받아 적으세요" onkeypress="if(event.key === 'Enter') verifyKoreanDictation()" style="width:100%; margin-bottom:20px;">
            
            <div style="display:flex; gap:10px; justify-content:center;">
                <button class="quiz-button" onclick="verifyKoreanDictation()">정답 내기</button>
                <button class="quiz-button" style="background:#ff9f43;" onclick="replayDictationAudio()">🔊 다시 듣기</button>
            </div>
            <button style="margin-top: 20px; background: none; border: none; color: #ccc; text-decoration: underline; cursor: pointer;" onclick="document.getElementById('dictationHint').style.display='block'">모르겠어요 (정답 보기)</button>
        </div>
    `;
    setTimeout(() => playDictationAudio(currentItem), 500);
}

// --------------------------------------------------------
// 3. AI 지문 토론방
// --------------------------------------------------------
function renderSentenceUI(container) {
    let buttonsHtml = readingFetchedBooks.map(book => 
        `<button class="quiz-choice-btn" style="margin-bottom: 10px; width: 100%; text-align: left;" onclick="startSentenceMission('${book.id}')">
            🗣️ [${book.title}] 토론 시작하기
        </button>`
    ).join('');

    container.innerHTML = `
        <div class="quiz-card">
            <h3 style="color:var(--purple); margin-bottom:20px;">아빠가 준비한 오늘의 토론 지문입니다. 원하는 지문을 선택하세요!</h3>
            ${buttonsHtml}
        </div>
    `;
}

window.startSentenceMission = function(bookId) {
    activePassage = readingFetchedBooks.find(b => b.id === bookId);
    sentenceHistory = [];
    window.__sentenceDiscussionMemorySaved = false;
    if (typeof initDiscussionRewardSession === 'function') {
        initDiscussionRewardSession('sentence', activePassage);
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
                ? buildDiscussionAISystemPrompt('국어', activePassage)
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
                    missionType: 'sentence',
                    passageId: activePassage?.id,
                    bubbleId: loadingId,
                    chatBoxId: 'sentenceChatBox',
                    subject: '국어'
                });
            } else {
                applyGeminiResponseToWaitUI(reply.replace(/\n/g, '<br>'), {
                    elementId: loadingId,
                    chatBoxId: 'sentenceChatBox'
                });
                speakFairyTTS(reply.replace(/\[SUCCESS\]/g, ''));
                if (reply.includes("[SUCCESS]") && typeof dispatchDiscussionSuccessJackpot === 'function') {
                    await dispatchDiscussionSuccessJackpot('sentence', activePassage?.id);
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

    const isParent = (typeof isParentProfile === 'function' && isParentProfile()) || (isAdmin ?? false);
    let parentBadgeHtml = '';
    if (isParent && typeof getFairyPersonaSummary === 'function') {
        const summary = getFairyPersonaSummary('국어_토론', '공부방');
        parentBadgeHtml = `
            <div style="background:linear-gradient(135deg, rgba(255, 215, 0, 0.12), rgba(171, 71, 188, 0.18)); border: 1px solid rgba(255, 215, 0, 0.4); border-radius: 10px; padding: 8px 12px; margin-bottom: 12px; font-size: 0.8rem; text-align: left;">
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
        </div>
        <div class="chat-box" id="sentenceChatBox" style="height:250px;"></div>
        <div class="interactive-input-group">
            <input type="text" class="text-input-field" id="sentenceInput" placeholder="여기에 생각을 입력하세요!" onfocus="if(typeof resetGeminiChatErrorState==='function')resetGeminiChatErrorState()" onkeypress="if(event.key==='Enter') processSentenceInput()">
            <button class="quiz-button" onclick="processSentenceInput()">전송</button>
        </div>
    `;
    
    if (sentenceHistory.length === 0) {
        const initialMsgHtml = `안녕! 방금 읽은 <strong>[${activePassage.title}]</strong> 이야기에 대해 나랑 이야기해볼까? 어떤 생각이 들었어? ✨`;
        const initialMsgText = `안녕! 방금 읽은 [${activePassage.title}] 이야기에 대해 나랑 이야기해볼까? 어떤 생각이 들었어?`;
        appendSentenceMsg('ai', initialMsgHtml);
        sentenceHistory.push({ role: "assistant", content: initialMsgText });
        speakFairyTTS(`안녕! 방금 읽은 ${activePassage.title} 이야기에 대해 나랑 이야기해볼까?`);
    } else {
        sentenceHistory.forEach(h => appendSentenceMsg(h.role === 'user' ? 'user' : 'ai', h.content.replace(/\n/g, '<br>')));
    }
};

// --------------------------------------------------------
// 4. 정밀 독해 멀티버스방
// --------------------------------------------------------
function renderReadingLobby(container) {
    let buttonsHtml = readingFetchedBooks.map(book => 
        `<button class="quiz-choice-btn" style="margin-bottom: 10px; width: 100%; text-align: left;" onclick="startReadingMission('${book.id}')">
            📖 [${book.title}] 미션 시작하기
        </button>`
    ).join('');

    container.innerHTML = `
        <div class="quiz-card">
            <h3 style="color:var(--mint); margin-bottom:20px;">아빠가 준비한 오늘의 독해 미션입니다. 원하는 지문을 선택하세요!</h3>
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
    
    // 단계 건너뛰기 자동 제어 (데이터가 없을 경우)
    if (readingStage === 1 && (!activePassage.conjunctions || activePassage.conjunctions.length === 0)) {
        if (typeof dispatchReadingStageReward === 'function') {
            dispatchReadingStageReward('reading', activePassage?.id, 2);
        }
        readingStage = 2;
    }
    if (readingStage === 2 && !activePassage.themeQuiz) {
        if (typeof dispatchReadingStageReward === 'function') {
            dispatchReadingStageReward('reading', activePassage?.id, 3);
        }
        readingStage = 3;
    }
    
    if (readingStage === 0) {
        // 문단 순서 맞추기 (paragraphs 배열·correctOrder 우선 → 없으면 fullText 줄바꿈 분할)
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
            // 1. 선택 개수 검증
            if (userOrderTracking.length !== correctOrder.length) {
                alert("모든 문단을 선택해주세요!"); 
                return;
            }

            // 2. 정답 검증 (ID가 정확히 정답 순서대로 들어왔는지 확인)
            const isCorrect = userOrderTracking.every((id, index) => id === correctOrder[index]);

            if (isCorrect) {
                speakFairyTTS("Perfect! 순서를 완벽하게 맞췄어요!");
                if (typeof dispatchReadingStageReward === 'function') {
                    dispatchReadingStageReward('reading', activePassage?.id, 1);
                }
                readingStage++;
                setTimeout(renderReadingStage, 1500);
            } else {
                speakFairyTTS("순서가 틀렸어요. 다시 한번 잘 읽어보고 선택해봐!");
                // 💡 리셋 로직 추가: 틀리면 다시 고를 수 있게 초기화
                userOrderTracking = [];
                const puzzleBlocks = document.querySelectorAll('.puzzle-block');
                puzzleBlocks.forEach(el => el.classList.remove('selected'));
                document.getElementById('puzzle-slots').innerHTML = "선택한 순서: ";
            }
        };


        container.innerHTML = `
            <div class="quiz-card">
                <h3 style="color:var(--purple); margin-bottom:15px;">🧩 미션 1: 문단의 올바른 순서를 완성하라!</h3>
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
        window.verifyReadingConj = function(ans) {
            const isCorrect = typeof gradeConjunctionAnswer === 'function'
                ? gradeConjunctionAnswer(conj, ans)
                : (ans === conj.answer);
            if (isCorrect) {
                const correctWord = typeof getConjunctionCorrectAnswer === 'function'
                    ? getConjunctionCorrectAnswer(conj)
                    : conj.answer;
                speakFairyTTS("정답이에요! 아주 잘했어요!");
                readingConjunctionIndex++;
                if (readingConjunctionIndex >= activePassage.conjunctions.length) {
                    if (typeof dispatchReadingStageReward === 'function') {
                        dispatchReadingStageReward('reading', activePassage?.id, 2);
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
                    speakFairyTTS("틀렸어요. 다시 한번 찾아볼까요?");
                }
            }
        };

        container.innerHTML = `
            <div class="quiz-card">
                <h3 style="color:var(--orange); margin-bottom:15px;">🔗 미션 2: 끊어진 연결 고리를 복구하라! (${readingConjunctionIndex+1}/${activePassage.conjunctions.length})</h3>
                <div class="passage-box">
                    ${conj.sentenceBefore} <br><br>
                    <span class="blank-indicator">[ ? ]</span> <br><br>
                    ${conj.sentenceAfter}
                </div>
                <div style="display:flex; flex-direction:column; gap:10px;">
                    ${conj.options.map(opt => `<button class="quiz-choice-btn" onclick="verifyReadingConj('${opt}')">${opt}</button>`).join('')}
                </div>
            </div>
        `;
    } else if (readingStage === 2) {
        // 주제 찾기 퀴즈
        const quiz = activePassage.themeQuiz;
        window.verifyReadingTheme = function(idx) {
            if (idx === quiz.answerIndex) {
                speakFairyTTS("정답이에요! 참 잘했어요!");
                if (typeof dispatchReadingStageReward === 'function') {
                    dispatchReadingStageReward('reading', activePassage?.id, 3);
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
                    speakFairyTTS("아니에요. 다시 한번 생각해볼까요?");
                }
            }
        };

        container.innerHTML = `
            <div class="quiz-card">
                <h3 style="color:var(--pink); margin-bottom:15px;">🎯 미션 3: 핵심 주제를 찾아라!</h3>
                <div class="quiz-descr">${quiz.question}</div>
                <div style="display:flex; flex-direction:column; gap:10px;">
                    ${quiz.options.map((opt, i) => `<button class="quiz-choice-btn" style="text-align:left;" onclick="verifyReadingTheme(${i})">${i+1}. ${opt}</button>`).join('')}
                </div>
            </div>
        `;
    } else {
        if (typeof dispatchReadingClearBonus === 'function') {
            dispatchReadingClearBonus('reading', activePassage?.id, activePassage?.title);
        }
        // 완료 및 보상
        container.innerHTML = `
            <div style="text-align:center; padding: 40px 20px;">
                <div style="font-size:3rem; margin-bottom:15px;">🎉</div>
                <p style="font-size:1.4rem; color:var(--mint); margin-bottom:10px;">독해 미션을 완벽하게 클리어했습니다!</p>
                <p style="font-size:1rem; color:#666; margin-bottom:20px;">단계별 5점 × 3 + 클리어 보너스 15점 = 총 30점!</p>
                <button class="back-to-lobby-btn" style="background:var(--sky); color:white; border:none;" onclick="closeMissionView();">🎁 보상 확인하고 나가기</button>
            </div>
        `;
    }
};

// ========================================================
// 🎁 보상 지급 연동 (사회방 로직 이식)
// ========================================================
window.triggerAwardDispense = async function(rewardAmount, type) {
    if (isAdmin) {
        alert(`[관리자 모드] ${rewardAmount}개의 보상 지급이 시뮬레이션 되었습니다.`);
        return;
    }
    
    // 일일 제한 100개 룰 적용
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
        // 국어방은 '국어' 과목 경험치도 같이 올려주기 위해 customExp 파라미터 전달
        await grantRewardAndShowUI(actualReward, false, '국어');
    }
};
