// kids/js/english_common.js
// 🏰 영어 멀티버스 공용 관제탑 대문 파사드 (골디락스 모듈화 통합 버전)
// - 전사 최고 거버넌스 헌법(규칙 7조) 준수: 최적 응집도(300~600줄) 대문 파사드
// - 서브모듈 분리 완료:
//   * [1단계 스토리북] kids/js/english_storybook.js (window.EnglishStorybook)
//   * [1단계/3단계 파닉스] kids/js/english_phonics.js (window.EnglishPhonics)
//   * [2단계/3단계/4단계 어휘·문장] kids/js/english_voca.js (window.EnglishVoca)
//   * [5단계 독해] kids/core/reading_engine.js (window.ReadingEngine)
//   * [6단계 AI 토론] kids/js/english_chat.js (window.EnglishChat)

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

// 독해 및 토론 지문 상태
let readingFetchedBooks = [];
let activePassage = null;
let isCurrentEnglishMissionLogged = false;

// 🧚‍♀️ 아나운서 요정 코코 TTS 엔진 안전 우회막
if (!window.stopFairyTTS) {
    window.stopFairyTTS = function() { console.log("🔊 [TTS 우회] 아직 요정 엔진 로드 전입니다."); };
    window.stopFairyTTS.isMock = true;
}
if (!window.speakFairyTTS) {
    window.speakFairyTTS = function(msg) { console.log("🔊 [TTS 우회] 아직 요정 엔진 로드 전입니다:", msg); };
    window.speakFairyTTS.isMock = true;
}

// ========================================================
// 🛠️ 영어방 초기화 및 테마 동기화
// ========================================================
function initializeEnglishRoom() {
    console.log("🛠️ 영어방 초기화 엔진 가동...");
    window.roomStartTime = window.roomStartTime || new Date();

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

    if (typeof updateTtsToggleUi === 'function') updateTtsToggleUi();
    if (typeof initChatMemorySession === 'function') {
        initChatMemorySession('공부방');
    }

    // 🚀 [초고속 프리패치] 로비 진입 시 0.01초 내 노션 VOCA 및 독해 사전 캐싱
    prefetchEnglishResources();
}

function prefetchEnglishResources() {
    const targetStudent = (currentProfile === 'daughter' || currentUserName === '민서') ? '민서' : '민수';
    if (typeof prefetchVocaData === 'function') {
        prefetchVocaData(targetStudent);
    }
    if (typeof prefetchReadingData === 'function') {
        prefetchReadingData({ student: targetStudent, subject: "영어" });
    }
}

// ========================================================
// 🚪 오버레이 미션 팝업 연동 제어
// ========================================================
function isEnglishMissionInProgress() {
    const overlay = document.getElementById('missionOverlay');
    if (!overlay || overlay.style.display !== 'flex') return false;
    if (['voca_pool', 'stage1', 'stage2', 'stage3', 'stage4'].includes(currentMissionType)) {
        return Array.isArray(activeSectionData) && activeSectionData.length > 0
            && activeQuizIdx < activeSectionData.length;
    }
    if (currentMissionType === 'stage5') {
        return window.ReadingEngine && typeof window.ReadingEngine.isMissionInProgress === 'function'
            ? window.ReadingEngine.isMissionInProgress()
            : !!activePassage;
    }
    if (currentMissionType === 'stage6') {
        return !!activePassage;
    }
    return false;
}

function openMissionView(type) {
    const overlay = document.getElementById('missionOverlay');
    const headerTitle = document.getElementById('overlayHeaderTitle');
    const headerIcon = document.getElementById('overlayHeaderIcon');
    const innerBody = document.getElementById('overlayInnerBody');
    if (!overlay || !innerBody) return;
    
    overlay.style.display = "flex";
    activeQuizIdx = 0;
    activePassage = null;
    stopFairyTTS();
    window.engWrongNotes = [];
    window.wrongNotes = [];
    isCurrentEnglishMissionLogged = false;
    currentMissionType = type;

    if (window.EnglishVoca && typeof window.EnglishVoca.setStage3QuizMode === 'function') {
        window.EnglishVoca.setStage3QuizMode(null);
    }

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
    if (headerTitle) headerTitle.textContent = targetTitle;
    if (headerIcon) headerIcon.textContent = targetIcon;

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
            Fairy_🧚‍♀️ 코코 요정이 영단어를 챙겨오고 있어요...
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
        const history = window.EnglishChat && typeof window.EnglishChat.getHistory === 'function' 
            ? window.EnglishChat.getHistory() 
            : [];
        if (currentMissionType === 'stage6' && history.length > 0) {
            if (typeof finalizeSentenceDiscussionSession === 'function') {
                await finalizeSentenceDiscussionSession({
                    messages: history,
                    roomType: '공부방',
                    missionType: 'stage6'
                });
            } else if (typeof saveChatMemoryFromConversation === 'function') {
                await saveChatMemoryFromConversation({ roomType: '공부방', messages: history });
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
        if (overlay) overlay.style.display = "none";
        activeSectionData = [];
        activeQuizIdx = 0;
        activePassage = null;
        if (window.EnglishVoca && typeof window.EnglishVoca.setStage3QuizMode === 'function') {
            window.EnglishVoca.setStage3QuizMode(null);
        }
        stopFairyTTS();
    });
}

// ========================================================
// 📊 데이터 페칭 및 동적 UI 라우팅
// ========================================================
async function fetchAndBuildDynamicUI(type, innerBody) {
    try {
        if (type === 'stage5') {
            // 📖 [5단계 독해] 코어 ReadingEngine으로 단일화
            if (window.ReadingEngine && typeof window.ReadingEngine.renderLobby === 'function') {
                await window.ReadingEngine.renderLobby(innerBody, { subject: "영어" });
                return;
            }
        }
        
        if (type === 'stage6') {
            let notionPassages = [];
            if (typeof fetchReadingPassagesFromNotion === 'function') {
                try {
                    notionPassages = await fetchReadingPassagesFromNotion({ subject: "영어", student: targetStudent });
                } catch (err) {
                    console.warn('[english] 독해 DB 조회 실패, 로컬 지문으로 대체:', err);
                }
            }

            const localDb = (typeof ENGLISH_READING_DATABASE !== 'undefined' && Array.isArray(ENGLISH_READING_DATABASE))
                ? ENGLISH_READING_DATABASE
                : [];

            let mergedPassages = [];
            const seen = new Set();

            // 1. 2학기 최신 스토리북/단원 지문(8단원, 7단원 등) 우선 배치
            for (const b of localDb) {
                if (!seen.has(b.id)) {
                    mergedPassages.push(b);
                    seen.add(b.id);
                }
            }

            // 2. 노션 독해 마스터 DB 지문 병합
            for (const np of (notionPassages || [])) {
                const docId = np.id || np.book_id;
                if (docId && !seen.has(docId)) {
                    mergedPassages.push({
                        id: docId,
                        title: np.title,
                        fullText: np.fullText,
                        summary: np.summary,
                        translation: np.translation || np.summary || "",
                        paragraphs: np.paragraphs || [{ id: 'p1', label: 'A', text: np.fullText }]
                    });
                    seen.add(docId);
                }
            }

            readingFetchedBooks = mergedPassages;
            window.readingFetchedBooks = readingFetchedBooks;

            if (readingFetchedBooks.length === 0) {
                innerBody.innerHTML = `<div style="text-align:center; padding:40px;">등록된 토론 지문이 없습니다.</div>`;
                return;
            }

            if (window.EnglishChat && typeof window.EnglishChat.renderSentenceUI === 'function') {
                window.EnglishChat.renderSentenceUI(innerBody, readingFetchedBooks);
            }
            return;
        }

        // 단어/문장/파닉스 등 노션 VOCA DB 연동
        const records = await fetchVocaFromNotion({ subject: "영어", filterByStudent: true });
        
        if (records && records.length > 0) {
            allFetchedRecords = records;
            
            let candidateRecords = records;
            if (type === 'stage2' || type === 'stage3' || type === 'voca_pool') {
                candidateRecords = records.filter(isVocaOrIdiomRecord);
            } else if (type === 'stage4') {
                candidateRecords = records.filter(isSentenceRecord);
            }
            
            const uniqueGrades = [...new Set(candidateRecords.flatMap(r => r.grades || [r.grade]))].filter(g => g && g !== "공통").sort();
            if (uniqueGrades.length === 0) {
                startMissionWithFilteredData(candidateRecords, innerBody);
            } else if (uniqueGrades.length === 1) {
                selectDynamicGrade(uniqueGrades[0]);
            } else {
                renderDynamicGradeUI(uniqueGrades, innerBody);
            }
        } else {
            innerBody.innerHTML = `<div style="text-align:center; padding:40px;">데이터가 없습니다.</div>`;
        }
    } catch(e) {
        console.error("통신 에러:", e);
        innerBody.innerHTML = `<div style="text-align:center; padding:40px;">오류가 발생했습니다: ${e.message}</div>`;
    }
}

// ========================================================
// 🔍 영단어/숙어 vs 문장 판별 헬퍼 (노션 어휘유형 및 품사 동기화)
// ========================================================
function isSentenceRecord(r) {
    if (!r) return false;
    const type = String(r.wordType || r.type || r.pos || '').trim();
    if (type === '문장') return true;
    
    // 💡 방어 로직: type/pos 누락 시에도 문장부호(. ? !) 또는 3단어 이상인 경우 문장으로 자동 인식
    const word = String(r.word || '').trim();
    if (word.includes(' ') && (word.endsWith('.') || word.endsWith('?') || word.endsWith('!') || word.split(/\s+/).length >= 3)) {
        return true;
    }
    return false;
}

function isVocaOrIdiomRecord(r) {
    if (!r) return false;
    if (isSentenceRecord(r)) return false;
    return true; // '단어', '숙어' 및 기본 어휘 항목
}

// ========================================================
// 🎒 학년/단원 필터 UI
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
    let matchedRecords = allFetchedRecords.filter(r => r.grade === grade || (r.grades && r.grades.includes(grade)));
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
        (r.grade === selectedEnglishGrade || (r.grades && r.grades.includes(selectedEnglishGrade))) &&
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
        matchedRecords = matchedRecords.filter(r => r.grade === selectedEnglishGrade || (r.grades && r.grades.includes(selectedEnglishGrade)));
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
        if (window.EnglishVoca && typeof window.EnglishVoca.renderStage3ModeSelectUI === 'function') {
            window.EnglishVoca.renderStage3ModeSelectUI(innerBody, {
                orderToggleHtml: getEnglishOrderToggleHtml(),
                infoText: [selectedEnglishGrade, selectedEnglishUnit].filter(Boolean).join(' · '),
                totalCount: activeSectionData.length
            });
            return;
        }
    }
    renderSectionUI();
}

// ========================================================
// 🏆 퀴즈 공통 채점 흐름 및 오답노트·일지 자동 전송
// ========================================================
async function advanceEnglishQuizAfterCorrect(delayMs = 1200) {
    if (typeof rewardQuizCorrect === 'function') {
        await rewardQuizCorrect(activeQuizIdx);
    }
    const prevItem = activeSectionData[activeQuizIdx];
    activeQuizIdx++;

    let expl = null;
    if (prevItem) {
        expl = `<strong>${prevItem.word}</strong> : ${prevItem.meaning || prevItem.desc || ''}`;
    }

    if (typeof triggerQuizAdvance === 'function') {
        triggerQuizAdvance({
            onAdvance: renderSectionUI,
            delayMs: delayMs,
            subject: '영어',
            explanation: expl
        });
    } else {
        setTimeout(renderSectionUI, delayMs);
    }
}

function skipEnglishQuestion() {
    activeQuizIdx++;
    renderSectionUI();
}

// 📝 영어 오답 노트 자동 수집기
window.engWrongNotes = [];
window.wrongNotes = [];

function recordEnglishWrongAnswer(item, wrongInput) {
    if (!item) return;
    window.engWrongNotes = window.engWrongNotes || [];
    window.wrongNotes = window.engWrongNotes;

    const targetWord = (item.word || item.text || '').trim();
    if (!targetWord) return;
    const meaning = (item.meaning || item.desc || '').trim();
    const wrongStr = typeof wrongInput === 'string' ? wrongInput.trim() : (wrongInput ? String(wrongInput).trim() : '오답');

    const existing = window.engWrongNotes.find(q => (q.word || q.text || '').trim() === targetWord);
    if (existing) {
        if (wrongStr) existing.wrongInput = wrongStr;
    } else {
        window.engWrongNotes.push({
            word: targetWord,
            text: targetWord,
            meaning: meaning,
            wrongInput: wrongStr
        });
        console.log(`📝 [영어 오답노트 수집] ${targetWord} (제출오답: ${wrongStr}) ➔ 누적 ${window.engWrongNotes.length}개`);
    }
}

function promptEnglishWrong(onRetry) {
    const retry = typeof onRetry === 'function' ? onRetry : () => {};
    if (typeof promptQuizRetryOrSkip === 'function') {
        const curItem = (activeSectionData && activeSectionData[activeQuizIdx]) ? activeSectionData[activeQuizIdx] : null;
        promptQuizRetryOrSkip({
            onRetry: retry,
            onSkip: skipEnglishQuestion,
            word: curItem?.word || curItem?.english || null,
            subject: '영어',
            meaning: curItem?.meaning || curItem?.korean || null,
            hint: curItem?.phonics || curItem?.hint || null
        });
        return;
    }
    speakFairyTTS("아쉽지만 틀렸어요. 다시 한번 생각해볼까요?");
    retry();
}

async function finalizeEnglishMissionImmediately() {
    if (isCurrentEnglishMissionLogged) return;
    isCurrentEnglishMissionLogged = true;

    try {
        const student = (currentProfile === 'daughter' || currentUserName === '민서' || localStorage.getItem('currentUser') === 'daughter' || localStorage.getItem('currentChild') === 'minseo') ? '민서' : '민수';
        let subj = '영어';
        if (selectedEnglishUnit) subj = `영어(${selectedEnglishUnit})`;

        const targetNotes = window.engWrongNotes || window.wrongNotes || [];
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
            console.log(`🎉 [영어 미션 완수] 완주 보너스(+5) & 노션 학습일지 자동 전송 완료! (${student} - ${subj})`);
        }
    } catch (e) {
        console.error("영어 미션 완수 일지 전송 오류:", e);
    }
}

// ========================================================
// 🎯 대문 파사드 메인 렌더 라우터
// ========================================================
function renderSectionUI() {
    const container = document.getElementById('overlayInnerBody');
    if (!container) return;
    container.innerHTML = "";
    
    if (activeQuizIdx >= activeSectionData.length) {
        // ⚡ 10문제 완료 즉각 완주 보너스 & 학습일지 자동 전송
        finalizeEnglishMissionImmediately();
        container.innerHTML = `
            <div style="text-align:center; padding: 40px 20px;">
                <div style="font-size:3rem; margin-bottom:15px;">🎉</div>
                <p style="font-size:1.4rem; color:var(--primary); margin-bottom:10px;">모든 문제를 완료했습니다!</p>
                <p style="font-size:1rem; color:#10b981; font-weight:bold; margin-bottom:20px;">✨ 완주 보너스(+5💎)와 학습일지가 안전하게 기록되었어요!</p>
                <div style="display:flex; flex-direction:column; gap:10px;">
                    ${currentMissionType === 'stage3' ? `<button class="quiz-button" style="background:var(--sky-blue); color:white;" onclick="if(window.EnglishVoca) window.EnglishVoca.showStage3ModeSelect();">🔄 다른 방식으로 다시하기</button>` : ''}
                    <button class="quiz-button" style="background:var(--pink); color:white;" onclick="closeMissionView();">✅ 나가기</button>
                </div>
            </div>`;
        return;
    }

    const currentItem = activeSectionData[activeQuizIdx];
    const helpers = {
        currentIdx: activeQuizIdx,
        totalCount: activeSectionData.length,
        orderToggleHtml: getEnglishOrderToggleHtml(),
        allRecords: allFetchedRecords,
        infoText: [selectedEnglishGrade, selectedEnglishUnit].filter(Boolean).join(' · '),
        advanceQuiz: advanceEnglishQuizAfterCorrect,
        recordWrong: recordEnglishWrongAnswer,
        promptWrong: promptEnglishWrong,
        rewardCorrect: (idx) => { if (typeof rewardQuizCorrect === 'function') rewardQuizCorrect(idx); }
    };

    if (currentMissionType === 'stage1') {
        if (window.EnglishPhonics && typeof window.EnglishPhonics.renderStage1UI === 'function') {
            window.EnglishPhonics.renderStage1UI(container, currentItem, helpers);
        }
    } else if (currentMissionType === 'stage2') {
        if (window.EnglishPhonics && typeof window.EnglishPhonics.renderStage2UI === 'function') {
            window.EnglishPhonics.renderStage2UI(container, currentItem, helpers);
        }
    } else if (currentMissionType === 'voca_pool') {
        if (window.EnglishVoca && typeof window.EnglishVoca.renderVocaPoolUI === 'function') {
            window.EnglishVoca.renderVocaPoolUI(container, currentItem, helpers);
        }
    } else if (currentMissionType === 'stage3') {
        if (window.EnglishVoca && typeof window.EnglishVoca.renderStage3UI === 'function') {
            window.EnglishVoca.renderStage3UI(container, currentItem, helpers);
        }
    } else if (currentMissionType === 'stage4') {
        if (window.EnglishVoca && typeof window.EnglishVoca.renderStage4UI === 'function') {
            window.EnglishVoca.renderStage4UI(container, currentItem, helpers);
        }
    }
}

// ========================================================
// 🖨️ 영어 용어사전 4선 공책 인쇄 모듈 (클릭 순서 큐)
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
    
    let html = '<div class="print-container" style="padding: 20px;">';
    html += '<h2 style="text-align:center; font-family:\'Jua\', sans-serif; margin-bottom: 30px;">📝 영어 4선 공책 인쇄</h2>';
    
    selectedPrintOrder.forEach(r => {
        if (typeof buildFourLineRowHtml === 'function') {
            html += buildFourLineRowHtml(r.word, r.meaning);
        }
    });
    html += '</div>';
    
    printArea.innerHTML = html;
    if (typeof printWhenFontsReady === 'function') {
        printWhenFontsReady();
    } else {
        window.print();
    }
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
};

// 🎁 보상 지급 연동
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
    if (currentCount + rewardAmount > 100) actualReward = 100 - currentCount;
    localStorage.setItem(countKey, currentCount + actualReward);
    if (typeof grantRewardAndShowUI === 'function') {
        await grantRewardAndShowUI(actualReward, false, '영어');
    }
};

// ========================================================
// 🌐 전역 네임스페이스 및 글로벌 브리지
// ========================================================
window.EnglishCommon = {
    initialize: initializeEnglishRoom,
    openMissionView,
    closeMissionView,
    renderSectionUI,
    advanceQuiz: advanceEnglishQuizAfterCorrect,
    skipQuiz: skipEnglishQuestion,
    recordWrong: recordEnglishWrongAnswer,
    promptWrong: promptEnglishWrong
};

window.initializeEnglishRoom = initializeEnglishRoom;
window.openMissionView = openMissionView;
window.closeMissionView = closeMissionView;
window.renderSectionUI = renderSectionUI;
window.isSentenceRecord = isSentenceRecord;
window.isVocaOrIdiomRecord = isVocaOrIdiomRecord;
window.renderDynamicGradeUI = renderDynamicGradeUI;
window.renderDynamicUnitUI = renderDynamicUnitUI;
window.skipEnglishQuestion = skipEnglishQuestion;