// kids/js/korean_common.js
// 🏰 국어 멀티버스 공용 관제탑 대문 파사드 (골디락스 모듈화 통합 버전)
// - 전사 최고 거버넌스 헌법(규칙 7조) 준수: 최적 응집도(300~600줄) 파사드
// - 서브모듈 분리 완료:
//   * [1단계 동화] kids/js/korean_storybook.js (window.KoreanStorybook)
//   * [2단계 받아쓰기] kids/js/korean_dictation.js (window.KoreanDictation)
//   * [3단계 어휘] kids/js/korean_voca.js (window.KoreanVoca)
//   * [4단계 독해] kids/core/reading_engine.js (window.ReadingEngine)
//   * [5단계 AI 토론] kids/js/korean_sentence.js (window.KoreanSentence)

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
let koreanDictationOrderType = 'sequence'; // 'sequence'(1번~10번 교재순서 기본) or 'shuffle'
let dictationInputMode = 'magnet'; // 'magnet' or 'typing'

// AI 문장방 및 독해방 상태
let readingFetchedBooks = [];
let activePassage = null;
let isCurrentMissionLogged = false;

// 🧚‍♀️ 아나운서 요정 코코 TTS 엔진 안전 우회막
if (!window.stopFairyTTS) {
    window.stopFairyTTS = function() { console.log("🔊 [TTS 우회] 아직 요정 엔진 로드 전입니다."); };
    window.stopFairyTTS.isMock = true;
}
if (!window.speakFairyTTS) {
    window.speakFairyTTS = function(msg) { console.log("🔊 [TTS 우회] 아직 요정 엔진 로드 전입니다:", msg); };
    window.speakFairyTTS.isMock = true;
}

function getHangulChosung(text) {
    const CHOSUNG = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
    let res = '';
    for (let i = 0; i < text.length; i++) {
        const code = text.charCodeAt(i) - 44032;
        if (code >= 0 && code <= 11171) {
            const chosungIndex = Math.floor(code / 588);
            res += CHOSUNG[chosungIndex];
        } else {
            res += text[i];
        }
    }
    return res;
}

window.setDictationInputMode = function(mode) {
    dictationInputMode = mode;
    if (window.KoreanDictation && typeof window.KoreanDictation.setInputMode === 'function') {
        window.KoreanDictation.setInputMode(mode);
    } else {
        renderSectionUI();
    }
};

window.setKoreanVocaMode = function(mode) {
    koreanVocaMode = mode;
    if (window.KoreanVoca && typeof window.KoreanVoca.setMode === 'function') {
        window.KoreanVoca.setMode(mode);
    } else {
        renderSectionUI();
    }
};

function toggleProfileManually() {
    if (currentProfile === 'son') {
        currentProfile = 'daughter'; currentUserName = '민서'; currentTheme = 'theme--slime';
    } else {
        currentProfile = 'son'; currentUserName = '민수'; currentTheme = 'theme--minecraft';
    }
    localStorage.setItem('currentUser', currentProfile);
    localStorage.setItem('currentUserName', currentUserName);
    localStorage.setItem('currentTheme', currentTheme);
    localStorage.setItem('currentChild', currentProfile === 'daughter' ? 'minseo' : 'minsu');
    location.reload();
}

function initializeKoreanRoom() {
    console.log("🛠️ 국어방 초기화 엔진 가동...");
    window.roomStartTime = window.roomStartTime || new Date(); // ⏱️ 학습 시작 시간 확정

    // 💡 URL 파라미터(?user=minseo 등) 기반 활성 자녀 우선 동기화
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const userParam = urlParams.get('user');
        if (userParam === 'minseo' || userParam === 'daughter') {
            currentProfile = 'daughter'; currentUserName = '민서'; currentTheme = 'theme--slime';
            localStorage.setItem('currentUser', 'daughter');
            localStorage.setItem('currentUserName', '민서');
            localStorage.setItem('currentTheme', 'theme--slime');
            localStorage.setItem('currentChild', 'minseo');
        } else if (userParam === 'minsu' || userParam === 'son') {
            currentProfile = 'son'; currentUserName = '민수'; currentTheme = 'theme--minecraft';
            localStorage.setItem('currentUser', 'son');
            localStorage.setItem('currentUserName', '민수');
            localStorage.setItem('currentTheme', 'theme--minecraft');
            localStorage.setItem('currentChild', 'minsu');
        }
    } catch (e) {
        console.warn("URL 파라미터 파싱 오류:", e);
    }

    const titleEl = document.getElementById('koreanTitle');
    const badgeEl = document.getElementById('adminBadgeTag');
    
    if (currentProfile === 'son') {
        document.body.className = "theme--minecraft";
        if (titleEl) titleEl.textContent = `${currentUserName}의 국어 멀티버스 대기실`;
        if (badgeEl) { badgeEl.className = "admin-status-badge"; badgeEl.textContent = `🎮 [${currentUserName}] 네온 관제 (클릭 시 전환)`; }
    } else {
        document.body.className = "theme--slime";
        if (titleEl) titleEl.textContent = `${currentUserName}의 국어 멀티버스 대기실`;
        if (badgeEl) { badgeEl.className = "admin-status-badge korean--fairy"; badgeEl.textContent = `🎠 [${currentUserName}] 동화 모드 (클릭 시 전환)`; }
    }

    if (badgeEl) {
        badgeEl.style.cursor = "pointer";
        badgeEl.title = "클릭하면 민수 ↔ 민서 프로필이 바로 전환됩니다!";
        badgeEl.onclick = toggleProfileManually;
    }

    if (isAdmin) {
        if (titleEl) titleEl.innerHTML = `<span style="color:var(--orange);">🛠️ [${currentUserName}] 국어방 (${currentProfile === 'daughter' ? '민서' : '민수'} 학습)</span>`;
    } else {
        if (typeof startLearning === 'function') startLearning("초등 국어 멀티버스");
    }
    if (typeof updateTtsToggleUi === 'function') updateTtsToggleUi();
    if (typeof initChatMemorySession === 'function') {
        initChatMemorySession('공부방');
    }

    // 🚀 [초고속 선로딩] 국어방 진입 즉시 백그라운드에서 오늘치 어휘 및 독해 지문 사전 캐싱 (0.01초 로딩 보장)
    const targetStudent = currentProfile === 'daughter' ? '민서' : '민수';
    if (typeof prefetchVocaData === 'function') {
        prefetchVocaData(targetStudent);
    }
    if (typeof prefetchReadingData === 'function') {
        prefetchReadingData({ student: targetStudent, subject: "국어" });
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
        return window.ReadingEngine && typeof window.ReadingEngine.isMissionInProgress === 'function'
            ? window.ReadingEngine.isMissionInProgress()
            : !!activePassage;
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
    if (overlay) {
        overlay.style.display = "none";
    }
    stopDictationAudio();
    stopFairyTTS();

    const finalizeDiscussion = async () => {
        const sHistory = window.sentenceHistory || [];
        if (currentMissionType === 'sentence' && sHistory.length > 0) {
            if (typeof finalizeSentenceDiscussionSession === 'function') {
                await finalizeSentenceDiscussionSession({
                    messages: sHistory,
                    roomType: '공부방',
                    missionType: 'sentence'
                });
            } else if (typeof saveChatMemoryFromConversation === 'function') {
                await saveChatMemoryFromConversation({ roomType: '공부방', messages: sHistory });
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
        if ((currentMissionType === 'dictation' || currentMissionType === 'voca') && !isCurrentMissionLogged && activeQuizIdx > 0) {
            await finalizeKoreanMissionImmediately();
        }
    };

    finalizeDiscussion().catch(e => console.warn('[closeMissionView] 백그라운드 정산 경고:', e))
        .finally(() => {
            activeSectionData = [];
            activeQuizIdx = 0;
            activePassage = null;
        });
}

function stopDictationAudio() {
    if (window.KoreanDictation && typeof window.KoreanDictation.stopAudio === 'function') {
        window.KoreanDictation.stopAudio();
    }
}

function playDictationAudio(item) {
    if (window.KoreanDictation && typeof window.KoreanDictation.playAudio === 'function') {
        window.KoreanDictation.playAudio(item);
    }
}

window.replayDictationAudio = function() {
    if (window.KoreanDictation && typeof window.KoreanDictation.replayAudio === 'function') {
        window.KoreanDictation.replayAudio();
    }
};

function getKoreanFilteredRecords() {
    let matchedRecords = allFetchedRecords;
    if (selectedKoreanGrade) {
        matchedRecords = matchedRecords.filter(r =>
            r.grade === selectedKoreanGrade || (r.grades && r.grades.includes(selectedKoreanGrade))
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
// 📊 데이터 페칭 및 동적 UI 생성 (라우팅 파사드)
// ========================================================
async function fetchAndBuildDynamicUI(type, innerBody) {
    try {
        if (type === 'storybook') {
            if (window.KoreanStorybook && typeof window.KoreanStorybook.renderLibrary === 'function') {
                window.KoreanStorybook.renderLibrary(innerBody);
            } else if (typeof renderStorybookLibrary === 'function') {
                renderStorybookLibrary(innerBody);
            }
            return;
        }

        if (type === 'reading') {
            if (window.ReadingEngine && typeof window.ReadingEngine.renderLobby === 'function') {
                await window.ReadingEngine.renderLobby(innerBody, { subject: "국어" });
                return;
            }
        }

        if (type === 'sentence') {
            let libraryRecords = [];
            if (typeof fetchLibraryBooksFromNotion === 'function') {
                try {
                    libraryRecords = await fetchLibraryBooksFromNotion();
                } catch (err) {
                    console.warn('[korean] 도서관 노션 조회 실패, 로컬 지문으로 대체합니다:', err);
                }
            }

            const fallbackDb = typeof KOREAN_READING_DATABASE !== 'undefined' ? KOREAN_READING_DATABASE : [];
            readingFetchedBooks = typeof resolveReadingPassageList === 'function'
                ? resolveReadingPassageList(libraryRecords, fallbackDb)
                : fallbackDb.slice(0, 10);
            window.readingFetchedBooks = readingFetchedBooks;

            if (readingFetchedBooks.length === 0) {
                innerBody.innerHTML = `<div style="text-align:center; padding:40px;">등록된 지문이 없습니다.</div>`;
                return;
            }

            if (window.KoreanSentence && typeof window.KoreanSentence.renderUI === 'function') {
                window.KoreanSentence.renderUI(innerBody);
            } else if (typeof renderSentenceUI === 'function') {
                renderSentenceUI(innerBody);
            }
            return;
        }

        if (type === 'voca' || type === 'dictation') {
            const subjectTag = type === 'voca' ? "국어" : "받아쓰기";
            let records = await fetchVocaFromNotion({ subject: subjectTag, filterByStudent: true, forceRefresh: false });
            if (type === 'voca' && records) {
                // 국어 용어방: 순수 국어 어휘/단어만 학습 (받아쓰기 문장 제외)
                records = records.filter(r => !r.subject.includes('받아쓰기') && r.wordType !== '문장' && r.type !== '문장');
            }
            
            if (records && records.length > 0) {
                allFetchedRecords = records;
                window.allFetchedRecords = records;
                const uniqueGrades = [...new Set(records.flatMap(r => r.grades || [r.grade]))].filter(g => g && g !== "공통").sort();
                if (uniqueGrades.length === 0) {
                    startMissionWithFilteredData(records, innerBody);
                } else if (uniqueGrades.length === 1) {
                    // 💡 학년이 1개뿐인 경우 불필요한 학년 선택 뎁스를 건너뛰고 곧바로 단원 선택 화면으로 직행
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
// 🎒 학년/단원 필터 UI
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
    const matchedRecords = allFetchedRecords.filter(r => r.grade === grade || (r.grades && r.grades.includes(grade)));
    const uniqueUnits = [...new Set(matchedRecords.map(r => String(r.level).trim()))].filter(u => u && u !== "undefined").sort((a,b) => a.localeCompare(b, undefined, {numeric: true}));
    
    if (uniqueUnits.length === 0 || (uniqueUnits.length === 1 && uniqueUnits[0] === "기본 단원")) {
        startMissionWithFilteredData(matchedRecords, innerBody);
    } else {
        renderDynamicUnitUI(uniqueUnits, innerBody);
    }
};

function renderDynamicUnitUI(units, container) {
    if (currentMissionType === 'dictation') {
        let html = `<div style="text-align:center; margin-bottom:20px;">
            <div style="font-family:'Jua', sans-serif; font-size:1.4rem; color:#db2777; margin-bottom:6px;">✍️ [${selectedKoreanGrade}] 오늘 숙제할 단원을 선택하세요!</div>
            <p style="font-size:0.9rem; color:#888; margin-bottom:18px;">하루 1단원씩 자석 놀이하며 100문장 완전 정복! 🍬</p>
            <div class="dictation-unit-grid">`;
        units.forEach(u => {
            const num = parseInt(u.replace(/[^0-9]/g, '')) || 1;
            const startNo = (num - 1) * 10 + 1;
            const endNo = num * 10;
            html += `
                <div class="dictation-unit-card" onclick="selectDynamicUnit('${u}')">
                    <div style="font-size:1.6rem; margin-bottom:4px;">🍬</div>
                    <div class="dictation-unit-num">${u}</div>
                    <div class="dictation-unit-range">${startNo}번 ~ ${endNo}번</div>
                </div>
            `;
        });
        html += `</div>
            <div style="margin-top:15px;">
                <button class="quiz-button" style="background:#8b949e; width:100%; border-radius:14px;" onclick="openMissionView(currentMissionType)">⬅️ 처음으로 돌아가기</button>
            </div>
        </div>`;
        container.innerHTML = html;
        return;
    }

    let html = `<div style="text-align:center; margin-bottom:20px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; flex-wrap:wrap; gap:8px;">
            <h3 style="color:var(--sky); margin:0; font-family:'Jua', sans-serif;">📚 [${selectedKoreanGrade}] 도전할 단원을 선택하세요!</h3>
            <button onclick="window.refreshKoreanVoca()" style="background:#f1f5f9; border:1px solid #cbd5e1; border-radius:12px; padding:6px 12px; font-size:0.82rem; cursor:pointer; color:#475569; display:inline-flex; align-items:center; gap:4px;" title="노션 최신 단어 즉시 동기화">
                🔄 최신 단어 동기화
            </button>
        </div>
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

window.refreshKoreanVoca = async function() {
    const innerBody = document.getElementById('overlayInnerBody');
    if (innerBody) {
        innerBody.innerHTML = `<div style="text-align:center; padding:40px;"><div class="quiz-spinner"></div><p style="margin-top:12px; color:#db2777; font-family:'Jua',sans-serif;">🔄 노션 전체 최신 데이터를 동기화하는 중입니다...</p></div>`;
    }
    if (typeof window.syncAllNotionData === 'function') {
        await window.syncAllNotionData();
    }
    if (typeof fetchAndBuildDynamicUI === 'function') {
        await fetchAndBuildDynamicUI(currentMissionType, innerBody);
    }
};

window.selectDynamicUnit = function(unit) {
    selectedKoreanUnit = unit;
    const innerBody = document.getElementById('overlayInnerBody');
    const finalRecords = allFetchedRecords.filter(r => 
        (r.grade === selectedKoreanGrade || (r.grades && r.grades.includes(selectedKoreanGrade))) &&
        String(r.level).trim() === unit
    );
    startMissionWithFilteredData(finalRecords, innerBody);
};

function extractKoreanItemNumber(r) {
    if (!r) return null;
    if (r.meaning) {
        const m = String(r.meaning).match(/(\d+)\s*번/);
        if (m) return parseInt(m[1], 10);
    }
    if (r.word) {
        const m = String(r.word).match(/^(\d+)[\.\s]/);
        if (m) return parseInt(m[1], 10);
        const m2 = String(r.word).match(/(\d+)\s*번/);
        if (m2) return parseInt(m2[1], 10);
    }
    if (r.quiz) {
        const m = String(r.quiz).match(/(\d+)\s*번/);
        if (m) return parseInt(m[1], 10);
    }
    return null;
}

function startMissionWithFilteredData(records, innerBody) {
    let prepared = [...records];
    const orderType = currentMissionType === 'dictation'
        ? koreanDictationOrderType
        : (currentMissionType === 'voca' ? koreanVocaOrderType : 'shuffle');
    if (orderType === 'shuffle') {
        prepared.sort(() => Math.random() - 0.5);
    } else {
        // ➡️ 순서대로: 1번 -> 10번 문항 번호 자연수 오름차순 정렬 (미식별 시 생성일시순)
        prepared.sort((a, b) => {
            const numA = extractKoreanItemNumber(a);
            const numB = extractKoreanItemNumber(b);
            if (numA !== null && numB !== null) return numA - numB;
            if (numA !== null) return -1;
            if (numB !== null) return 1;
            if (a.createdTime && b.createdTime) return a.createdTime.localeCompare(b.createdTime);
            return 0;
        });
    }
    isCurrentMissionLogged = false;
    activeSectionData = prepared.slice(0, 10); // 최대 10문제
    window.activeSectionData = activeSectionData;
    activeQuizIdx = 0;
    window.activeQuizIdx = activeQuizIdx;

    if (activeSectionData.length === 0) {
        innerBody.innerHTML = `<div style="text-align:center; padding:40px;">해당 조건의 문제가 없습니다.</div>`;
        return;
    }
    renderSectionUI();
}

async function finalizeKoreanMissionImmediately() {
    if (isCurrentMissionLogged) return;
    isCurrentMissionLogged = true;

    try {
        const student = (currentProfile === 'daughter' || currentUserName === '민서' || localStorage.getItem('currentUser') === 'daughter' || localStorage.getItem('currentChild') === 'minseo') ? '민서' : '민수';
        let subj = '국어';
        if (currentMissionType === 'dictation') {
            subj = selectedKoreanUnit ? `국어(받아쓰기_${selectedKoreanUnit})` : '국어(받아쓰기)';
        } else if (currentMissionType === 'voca') {
            subj = selectedKoreanUnit ? `국어(용어_${selectedKoreanUnit})` : '국어(용어방)';
        }

        const targetNotes = window.wrongNotes || [];
        const errorReport = targetNotes.length > 0 ? targetNotes.map(q => {
            if (q.wrongInput) return `${q.word || q.text} (오답: ${q.wrongInput})`;
            return q.word || q.text || q;
        }).join(' / ') : "오답 없음";

        // 🏆 10문제 완주 보너스(+5💎/🍬) 및 노션 학습일지 자동 전송
        if (typeof finalizeQuizRewardSession === 'function') {
            await finalizeQuizRewardSession({
                isFullComplete: true,
                subject: subj,
                childName: student,
                errorReport: errorReport
            });
            console.log(`🎉 [국어 미션 완수] 완주 보너스(+5) & 노션 학습일지 자동 전송 완료! (${student} - ${subj})`);
        } else if (typeof sendStudyLogToNotion === 'function') {
            await sendStudyLogToNotion({
                childName: student,
                subject: subj,
                errorReport: errorReport
            });
        }
    } catch (e) {
        console.error("국어 미션 완수 일지 전송 오류:", e);
    }
}

async function advanceKoreanQuizAfterCorrect(delayMs = 1200) {
    if (typeof rewardQuizCorrect === 'function') {
        await rewardQuizCorrect(activeQuizIdx);
    }
    activeQuizIdx++;
    window.activeQuizIdx = activeQuizIdx;
    if (typeof triggerQuizAdvance === 'function') {
        triggerQuizAdvance({
            onAdvance: renderSectionUI,
            delayMs: delayMs,
            subject: '국어'
        });
    } else {
        setTimeout(renderSectionUI, delayMs);
    }
}

function skipKoreanQuestion() {
    activeQuizIdx++;
    window.activeQuizIdx = activeQuizIdx;
    renderSectionUI();
}

function promptKoreanWrong(note, onRetry) {
    if (!window.wrongNotes) window.wrongNotes = [];
    window.wrongNotes.push(note);
    const retry = typeof onRetry === 'function' ? onRetry : () => {};
    if (typeof promptQuizRetryOrSkip === 'function') {
        const word = (typeof note === 'object' && note !== null) ? (note.word || note.text) : note;
        const meaning = (typeof note === 'object' && note !== null) ? (note.meaning || note.desc || note.hint) : null;
        promptQuizRetryOrSkip({
            onRetry: retry,
            onSkip: skipKoreanQuestion,
            word: word,
            subject: '국어',
            meaning: meaning
        });
        return;
    }
    speakFairyTTS("아쉽지만 틀렸어요. 다시 한번 생각해볼까요?");
    retry();
}

// ========================================================
// 🎯 각 모드별 UI 렌더링 및 로직 (파사드 디스패처)
// ========================================================
function renderSectionUI() {
    const container = document.getElementById('overlayInnerBody');
    if (!container) return;
    container.innerHTML = "";
    
    if (activeQuizIdx >= activeSectionData.length) {
        // ⚡ 10문제 완료 즉각 학습일지 자동 전송
        finalizeKoreanMissionImmediately();
        container.innerHTML = `
            <div style="text-align:center; padding: 40px 20px;">
                <div style="font-size:3.2rem; margin-bottom:12px;">🎉</div>
                <p style="font-size:1.5rem; font-weight:bold; color:var(--purple); margin-bottom:8px;">모든 문제를 멋지게 완료했습니다!</p>
                <p style="font-size:1.05rem; color:#10b981; font-weight:bold; margin-bottom:24px;">✨ 학습일지에 안전하게 기록되었어요!</p>
                <button class="back-to-lobby-btn" style="background:var(--pink); color:white; padding:12px 28px; font-size:1.1rem; cursor:pointer;" onclick="closeMissionView();">✅ 나가기</button>
            </div>`;
        return;
    }

    if (currentMissionType === 'voca') {
        if (window.KoreanVoca && typeof window.KoreanVoca.renderUI === 'function') {
            window.KoreanVoca.renderUI(container);
        } else if (typeof renderVocaUI === 'function') {
            renderVocaUI(container);
        }
    } else if (currentMissionType === 'dictation') {
        if (window.KoreanDictation && typeof window.KoreanDictation.renderUI === 'function') {
            window.KoreanDictation.renderUI(container);
        } else if (typeof renderDictationUI === 'function') {
            renderDictationUI(container);
        }
    }
}

// ========================================================
// 🎁 보상 지급 연동
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

// 🌐 전역 네임스페이스 및 하위 호환 바인딩 보존
window.initializeKoreanRoom = initializeKoreanRoom;
window.openMissionView = openMissionView;
window.closeMissionView = closeMissionView;
window.isKoreanMissionInProgress = isKoreanMissionInProgress;
window.renderSectionUI = renderSectionUI;
window.advanceKoreanQuizAfterCorrect = advanceKoreanQuizAfterCorrect;
window.skipKoreanQuestion = skipKoreanQuestion;
window.promptKoreanWrong = promptKoreanWrong;
window.getKoreanOrderToggleHtml = getKoreanOrderToggleHtml;
window.startMissionWithFilteredData = startMissionWithFilteredData;
