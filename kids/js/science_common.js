// kids/js/science_common.js - 🔬 5학년 1학기 과학 탐구방 통합 제어 엔진

window.currentSubject = "과학";

const currentUserName = localStorage.getItem('currentUserName') || '민수';
const isAdmin = (currentUserName === '아빠' || currentUserName === '엄마');

const SCIENCE_ZONE_MAP = {
    voca: "용어방",
    experiment: "실험실",
    nature: "자연탐험",
    inventor: "발명가"
};

const SCIENCE_MISSION_META = {
    voca: { title: "과학 용어방", icon: "🔬" },
    experiment: { title: "가상 실험실", icon: "🧪" },
    nature: { title: "자연 생태 탐험실", icon: "🌿" },
    inventor: { title: "위대한 발명가 돋보기", icon: "💡" }
};

let allFetchedRecords = [];
let selectedScienceGrade = "5학년 1학기";
let selectedScienceUnit = "";
let currentMissionType = '';
let activeSectionData = [];
let activeQuizIdx = 0;
let scienceVocaMasterCountMap = {};
let scienceVocaOrderType = 'shuffle';

if (!window.stopFairyTTS) {
    window.stopFairyTTS = function() {};
}
if (!window.speakFairyTTS) {
    window.speakFairyTTS = function() {};
}

function getChosung(str) {
    const cho = ["ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ","ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];
    let result = "";
    for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i) - 44032;
        if (code > -1 && code < 11172) {
            result += cho[Math.floor(code / 588)];
        } else {
            result += str.charAt(i);
        }
    }
    return result;
}

function initializeScienceRoom() {
    console.log("🧬 과학방 초기화 완료!");
    scienceVocaMasterCountMap = JSON.parse(localStorage.getItem(`science_voca_master_${currentUserName}`) || '{}');
}

function isScienceMissionInProgress() {
    const overlay = document.getElementById('missionOverlay');
    if (!overlay || overlay.style.display !== 'flex') return false;
    return Array.isArray(activeSectionData) && activeSectionData.length > 0
        && activeQuizIdx < activeSectionData.length;
}

function openMissionView(type) {
    const overlay = document.getElementById('missionOverlay');
    const titleEl = document.getElementById('overlayHeaderTitle');
    const iconEl = document.getElementById('overlayHeaderIcon');
    const innerBody = document.getElementById('overlayInnerBody');
    const meta = SCIENCE_MISSION_META[type] || { title: "과학 미션", icon: "🔬" };

    overlay.style.display = 'flex';
    activeQuizIdx = 0;
    currentMissionType = type;
    selectedScienceGrade = "5학년 1학기";
    selectedScienceUnit = "";
    stopFairyTTS();

    if (typeof initQuizRewardSession === 'function') {
        initQuizRewardSession(type);
    }

    titleEl.textContent = meta.title;
    iconEl.textContent = meta.icon;

    if (typeof armQuizLeaveGuard === 'function') {
        armQuizLeaveGuard({
            isActive: isScienceMissionInProgress,
            onLeave: () => closeMissionView(true)
        });
    }

    renderScienceUnitSelectionUI(type, innerBody);
}

function closeMissionView(force) {
    if (!force && typeof confirmLeaveActiveSession === 'function' && !confirmLeaveActiveSession()) {
        return;
    }
    if (typeof disarmQuizLeaveGuard === 'function') {
        disarmQuizLeaveGuard();
    }
    if (typeof finalizeQuizRewardSession === 'function') {
        finalizeQuizRewardSession();
    }
    document.getElementById('missionOverlay').style.display = 'none';
    activeSectionData = [];
    activeQuizIdx = 0;
    stopFairyTTS();
}

function getCurriculumUnits() {
    if (typeof window !== 'undefined' && window.SCIENCE_CURRICULUM_DATA && Array.isArray(window.SCIENCE_CURRICULUM_DATA)) {
        return window.SCIENCE_CURRICULUM_DATA;
    }
    if (typeof SCIENCE_CURRICULUM_DATA !== 'undefined' && Array.isArray(SCIENCE_CURRICULUM_DATA)) {
        return SCIENCE_CURRICULUM_DATA;
    }
    return [];
}

function renderScienceUnitSelectionUI(type, container) {
    const curriculum = getCurriculumUnits();
    
    // Group by major unit: 3단원 vs 4단원
    const unit3List = curriculum.filter(u => u.code.startsWith("3-"));
    const unit4List = curriculum.filter(u => u.code.startsWith("4-"));

    container.innerHTML = `
        <div style="text-align:center; padding:15px 10px; font-family:'Jua'; width:100%; max-width:620px; margin:0 auto;">
            <h3 style="margin-bottom:6px; color:var(--primary); font-size:1.55rem;">🎒 5학년 1학기 과학 단원 고르기</h3>
            <p style="color:var(--text-muted); margin-bottom:16px; font-size:0.95rem;">실제 교과서 사진 자료와 퀴즈를 풀 소단원을 선택해 보세요!</p>
            
            <div style="text-align:left; margin-bottom:14px;">
                <div style="font-size:1.15rem; color:#0d9488; font-weight:bold; margin-bottom:8px;">💧 3. 용해와 용액</div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
                    ${unit3List.map(u => `
                        <button class="quiz-choice-btn" style="padding:10px 12px; font-size:0.92rem; justify-content:flex-start;" onclick="startScienceUnitMission('${u.code}')">
                            ${u.title}
                        </button>
                    `).join('')}
                </div>
            </div>

            <div style="text-align:left; margin-bottom:16px;">
                <div style="font-size:1.15rem; color:#e11d48; font-weight:bold; margin-bottom:8px;">🫀 4. 우리 몸의 구조와 기능</div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
                    ${unit4List.map(u => `
                        <button class="quiz-choice-btn" style="padding:10px 12px; font-size:0.92rem; justify-content:flex-start;" onclick="startScienceUnitMission('${u.code}')">
                            ${u.title}
                        </button>
                    `).join('')}
                </div>
            </div>

            <button class="quiz-choice-btn" style="background:#f1f5f9; width:100%; text-align:center; justify-content:center; padding:12px; font-size:1.05rem;" onclick="startScienceUnitMission('ALL')">
                🌟 전체 소단원 종합 탐구 (모아보기)
            </button>
        </div>
    `;
}

window.startScienceUnitMission = function(unitCode) {
    selectedScienceUnit = unitCode;
    const curriculum = getCurriculumUnits();
    let targetUnits = [];

    if (unitCode === 'ALL') {
        targetUnits = curriculum;
    } else {
        targetUnits = curriculum.filter(u => u.code === unitCode);
    }

    let items = [];
    if (currentMissionType === 'voca') {
        items = targetUnits.flatMap(u => u.voca || []);
    } else if (currentMissionType === 'experiment') {
        items = targetUnits.flatMap(u => (u.experiment && u.experiment.length > 0) ? u.experiment : (u.voca || []));
    } else if (currentMissionType === 'nature') {
        items = targetUnits.flatMap(u => (u.nature && u.nature.length > 0) ? u.nature : (u.experiment || u.voca || []));
    } else if (currentMissionType === 'inventor') {
        items = targetUnits.flatMap(u => (u.inventor && u.inventor.length > 0) ? u.inventor : (u.voca || []));
    }

    if (scienceVocaOrderType === 'shuffle') {
        items.sort(() => Math.random() - 0.5);
    }

    activeSectionData = items;
    activeQuizIdx = 0;

    const unitObj = curriculum.find(u => u.code === unitCode);
    const unitTitle = unitObj ? unitObj.title : (unitCode === 'ALL' ? '전체 종합' : unitCode);
    document.getElementById('overlayHeaderTitle').textContent = `${SCIENCE_MISSION_META[currentMissionType].title} [${unitTitle}]`;

    renderSectionUI(currentMissionType, document.getElementById('overlayInnerBody'), unitObj);
};

function renderSectionUI(type, container, unitObj) {
    if (typeof container === 'string') container = document.getElementById('overlayInnerBody');
    container.innerHTML = "";

    if (!activeSectionData || activeSectionData.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding: 40px 20px;">
                <div style="font-size:3rem; margin-bottom:15px;">🎉</div>
                <p style="font-size:1.3rem; color:var(--primary); margin-bottom:20px;">이 단원의 모든 학습 내용을 멋지게 탐구했습니다!</p>
                <button class="back-to-lobby-btn" onclick="openMissionView(currentMissionType)">단원 다시 선택하기</button>
            </div>`;
        return;
    }

    const currentItem = activeSectionData[activeQuizIdx];
    const screenWrapper = document.createElement("div");

    // 본문 지문 요약 박스
    const passageText = (unitObj && unitObj.summary) ? unitObj.summary : (currentItem.desc || "");
    const passageHtml = (activeQuizIdx === 0 && passageText) ? `
        <div class="passage-summary-box">
            <div class="passage-summary-header">
                <span class="passage-title-tag">📖 교과서 핵심 탐구 요약</span>
                <button class="passage-tts-btn" onclick="speakFairyTTS('${passageText.replace(/'/g, "\\'")}')">🔊 요정 낭독</button>
            </div>
            <div class="passage-summary-body">${passageText}</div>
        </div>
    ` : '';

    if (type === 'experiment') {
        screenWrapper.className = "quiz-card";
        
        const chartMediaHtml = currentItem.img ? `
            <div class="chart-container-box">
                <div class="chart-ctrl-toolbar">
                    <div class="chart-ctrl-group">
                        <button class="card-zoom-btn" onclick="adjustCardZoom(0.4)" title="확대">➕ 확대</button>
                        <button class="card-zoom-btn" onclick="adjustCardZoom(-0.4)" title="축소">➖ 축소</button>
                        <button class="card-zoom-btn" onclick="rotateCardImage()" title="시계방향 90도 회전">🔄 90° 회전</button>
                        <button class="card-zoom-btn" onclick="resetCardZoom()" title="원래대로">🔄 원본</button>
                    </div>
                    <button class="card-zoom-btn card-popup-btn" onclick="openImageInNewWindow('${currentItem.img}')" title="새 창으로 띄워서 문제와 나란히 보기">🪟 새창 열기</button>
                </div>
                <div class="chart-image-viewport" id="cardZoomViewport" ondragstart="return false;">
                    <img id="cardZoomImg" src="${currentItem.img}" class="chart-img" alt="과학 교과서 탐구 자료" onerror="this.closest('.chart-container-box').style.display='none';">
                </div>
                <div class="chart-zoom-guide">💡 마우스 드래그 이동 / 휠로 확대 / 더블클릭 토글 / 🔄 90° 회전 / 🪟 새창 열기</div>
            </div>
        ` : `
            <div style="text-align:center; margin-bottom:12px;">
                <div style="display:inline-flex; align-items:center; gap:8px; background:rgba(78, 205, 196, 0.12); border:1.5px dashed var(--primary); border-radius:14px; padding:8px 18px; font-family:'Jua', sans-serif; color:#0d9488; font-size:1.05rem;">
                    <span>🧪 교과서 핵심 탐구 실험 분석</span>
                </div>
            </div>
        `;

        const choices = currentItem.choices || ["선택지 1", "선택지 2", "선택지 3", "선택지 4"];
        const correctIdx = currentItem.correctIdx !== undefined ? currentItem.correctIdx : 0;
        const quizQuestion = currentItem.quiz || `${currentItem.title}에서 알 수 있는 사실은 무엇일까요?`;

        screenWrapper.innerHTML = `
            ${passageHtml}
            <div style="font-size: 0.95rem; opacity:0.7;">탐구 실험 ${activeQuizIdx + 1} / ${activeSectionData.length}</div>
            <h3 style="font-size: 1.35rem; margin-bottom: 8px;">${currentItem.title || "가상 실험실"}</h3>
            ${chartMediaHtml}
            <div class="quiz-descr" style="line-height:1.6; font-size:1.05rem;">${currentItem.desc || ""}</div>
            <p style="font-weight: bold; font-size:1.15rem; text-align: left; margin-top:14px;">❓ ${quizQuestion}</p>
            <div class="quiz-choices-container">
                ${choices.map((choice, i) => `
                     <button class="quiz-choice-btn" onclick="verifyExperimentChoice(${i}, ${correctIdx})">${i+1}. ${choice}</button>
                `).join('')}
            </div>
            <div style="margin-top: 14px; display:flex; justify-content:center;">
                <button class="quiz-button" style="background:var(--accent);" onclick="skipToNextScienceQuiz()">건너뛰기 ⏩</button>
            </div>
        `;
        container.appendChild(screenWrapper);
        if (currentItem.img) {
            initCardZoomListeners();
        }
        speakFairyTTS((currentItem.desc || "") + ". 퀴즈!" + quizQuestion);

    } else if (type === 'voca') {
        screenWrapper.className = "quiz-card";

        const imageHtml = currentItem.img ? `
            <div class="chart-container-box">
                <div class="chart-ctrl-toolbar">
                    <div class="chart-ctrl-group">
                        <button class="card-zoom-btn" onclick="adjustCardZoom(0.4)">➕ 확대</button>
                        <button class="card-zoom-btn" onclick="adjustCardZoom(-0.4)">➖ 축소</button>
                        <button class="card-zoom-btn" onclick="resetCardZoom()">🔄 원본</button>
                    </div>
                    <button class="card-zoom-btn card-popup-btn" onclick="openImageInNewWindow('${currentItem.img}')">🪟 새창 열기</button>
                </div>
                <div class="chart-image-viewport" id="cardZoomViewport" ondragstart="return false;">
                    <img id="cardZoomImg" src="${currentItem.img}" class="chart-img" alt="${currentItem.word}" onerror="this.closest('.chart-container-box').style.display='none';">
                </div>
            </div>
        ` : '';

        screenWrapper.innerHTML = `
            ${passageHtml}
            <div style="font-size: 0.95rem; opacity:0.7; margin-bottom: 8px;">용어 퀴즈 ${activeQuizIdx + 1} / ${activeSectionData.length}</div>
            <div class="quiz-hint-box" style="font-size:1.3rem; margin-bottom:12px;">초성 힌트: <strong style="color:var(--accent);">${currentItem.hint || getChosung(currentItem.word)}</strong></div>
            ${imageHtml}
            <div class="quiz-descr" style="font-size: 1.25rem; font-weight: bold; color: var(--text-main); margin-bottom:12px;">${currentItem.meaning || currentItem.desc}</div>
            <div class="interactive-input-group">
                <input type="text" class="text-input-field" id="scienceAnswerInput" placeholder="정답 용어를 입력하세요!" onkeypress="if(event.key==='Enter') verifyScienceVocaAnswer()">
                <button class="quiz-button" onclick="verifyScienceVocaAnswer()">정답 확인</button>
            </div>
            <div style="margin-top: 14px; display:flex; justify-content:center;">
                <button class="quiz-button" style="background:var(--accent);" onclick="skipToNextScienceQuiz()">건너뛰기 ⏩</button>
            </div>
        `;
        container.appendChild(screenWrapper);
        if (currentItem.img) {
            initCardZoomListeners();
        }
        setTimeout(() => {
            const input = document.getElementById("scienceAnswerInput");
            if (input) input.focus();
        }, 100);
        speakFairyTTS(currentItem.meaning || currentItem.desc);

    } else {
        // nature / inventor
        screenWrapper.className = "quiz-card";
        const mediaHtml = currentItem.img ? `
            <div class="chart-container-box">
                <div class="chart-ctrl-toolbar">
                    <div class="chart-ctrl-group">
                        <button class="card-zoom-btn" onclick="adjustCardZoom(0.4)">➕ 확대</button>
                        <button class="card-zoom-btn" onclick="adjustCardZoom(-0.4)">➖ 축소</button>
                        <button class="card-zoom-btn" onclick="resetCardZoom()">🔄 원본</button>
                    </div>
                    <button class="card-zoom-btn card-popup-btn" onclick="openImageInNewWindow('${currentItem.img}')">🪟 새창 열기</button>
                </div>
                <div class="chart-image-viewport" id="cardZoomViewport" ondragstart="return false;">
                    <img id="cardZoomImg" src="${currentItem.img}" class="chart-img" alt="${currentItem.title || '탐구 자료'}" onerror="this.closest('.chart-container-box').style.display='none';">
                </div>
            </div>
        ` : '';

        screenWrapper.innerHTML = `
            ${passageHtml}
            <div style="font-size: 0.95rem; opacity:0.7;">탐구 ${activeQuizIdx + 1} / ${activeSectionData.length}</div>
            <h3 style="font-size: 1.35rem; margin-bottom: 8px;">${currentItem.title || "과학 탐구"}</h3>
            ${mediaHtml}
            <div class="quiz-descr" style="line-height:1.6; font-size:1.05rem; margin-bottom:14px;">${currentItem.desc || ""}</div>
            <div style="display:flex; justify-content:center; gap:10px; margin-top:14px;">
                <button class="quiz-button" onclick="skipToNextScienceQuiz()">다음 탐구 보기 ⏩</button>
            </div>
        `;
        container.appendChild(screenWrapper);
        if (currentItem.img) {
            initCardZoomListeners();
        }
        speakFairyTTS(currentItem.desc || currentItem.title);
    }
}

window.verifyExperimentChoice = function(choiceIdx, correctIdx) {
    if (choiceIdx === correctIdx) {
        if (typeof playSoundEffect === 'function') playSoundEffect('correct');
        speakFairyTTS("정답이야! 과학적 원리를 아주 정확하게 파악했어!");
        alert("🎉 딩동댕! 정답입니다!");
        skipToNextScienceQuiz();
    } else {
        if (typeof playSoundEffect === 'function') playSoundEffect('wrong');
        speakFairyTTS("다시 한번 교과서 사진과 실험 내용을 자세히 관찰해 봐!");
        alert("앗, 다시 한 번 생각해 볼까요? 교과서 사진을 확대해서 살펴보세요!");
    }
};

window.verifyScienceVocaAnswer = function() {
    const input = document.getElementById("scienceAnswerInput");
    if (!input) return;
    const userVal = input.value.trim().replace(/\s+/g, '');
    const currentItem = activeSectionData[activeQuizIdx];
    const answer = currentItem.word.trim().replace(/\s+/g, '');

    if (userVal === answer) {
        if (typeof playSoundEffect === 'function') playSoundEffect('correct');
        speakFairyTTS("정답이야! 과학 용어를 완벽하게 마스터했어!");
        alert(`🎉 정답! [${currentItem.word}] 맞습니다!`);
        skipToNextScienceQuiz();
    } else {
        if (typeof playSoundEffect === 'function') playSoundEffect('wrong');
        speakFairyTTS("초성 힌트를 잘 보고 다시 맞춰봐!");
        alert("아쉬워요! 초성 힌트를 다시 확인해 보세요!");
        input.value = "";
        input.focus();
    }
};

window.skipToNextScienceQuiz = function() {
    activeQuizIdx++;
    if (activeQuizIdx < activeSectionData.length) {
        const curriculum = getCurriculumUnits();
        const unitObj = curriculum.find(u => u.code === selectedScienceUnit);
        renderSectionUI(currentMissionType, document.getElementById('overlayInnerBody'), unitObj);
    } else {
        if (typeof showRewardPopup === 'function') {
            showRewardPopup("과학 탐구 정복 완료!", "5학년 1학기 과학 단원 탐구를 완벽하게 마쳤습니다! 🌟");
        }
        openMissionView(currentMissionType);
    }
};

// ========================================================
// 🔍 퀴즈 카드 일체형 교과서 사진 줌/팬 & 새창 엔진
// ========================================================
let cardZoomScale = 1.0;
let cardZoomX = 0;
let cardZoomY = 0;
let cardRotationDeg = 0;
let isCardZoomDragging = false;
let startCardDragX = 0;
let startCardDragY = 0;
let cardLastTouchDist = 0;

function updateCardZoomTransform() {
    const img = document.getElementById("cardZoomImg");
    if (img) {
        img.style.transform = `translate(${cardZoomX}px, ${cardZoomY}px) rotate(${cardRotationDeg}deg) scale(${cardZoomScale})`;
    }
}

function rotateCardImage() {
    cardRotationDeg = (cardRotationDeg + 90) % 360;
    updateCardZoomTransform();
}

function adjustCardZoom(delta) {
    cardZoomScale = Math.min(Math.max(0.6, cardZoomScale + delta), 4.5);
    updateCardZoomTransform();
}

function resetCardZoom() {
    cardZoomScale = 1.0;
    cardZoomX = 0;
    cardZoomY = 0;
    cardRotationDeg = 0;
    updateCardZoomTransform();
}

function openImageInNewWindow(imgSrc) {
    const img = document.getElementById("cardZoomImg");
    const url = imgSrc || (img ? img.src : "");
    if (!url) return;
    const w = Math.min(1050, window.screen.availWidth - 80);
    const h = Math.min(900, window.screen.availHeight - 80);
    const left = Math.max(0, Math.floor((window.screen.availWidth - w) / 2));
    const top = Math.max(0, Math.floor((window.screen.availHeight - h) / 2));
    window.open(
        url,
        "ScienceViewer_" + Date.now(),
        `width=${w},height=${h},top=${top},left=${left},resizable=yes,scrollbars=yes,status=no,location=no,toolbar=no,menubar=no`
    );
}

function initCardZoomListeners() {
    resetCardZoom();
    const viewport = document.getElementById("cardZoomViewport");
    if (!viewport) return;

    // 1. 마우스 드래그 이동 (PC)
    viewport.onmousedown = (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        isCardZoomDragging = true;
        viewport.classList.add("is-dragging");
        startCardDragX = e.clientX - cardZoomX;
        startCardDragY = e.clientY - cardZoomY;
    };

    window.onmousemove = (e) => {
        if (!isCardZoomDragging) return;
        e.preventDefault();
        cardZoomX = e.clientX - startCardDragX;
        cardZoomY = e.clientY - startCardDragY;
        updateCardZoomTransform();
    };

    window.onmouseup = () => {
        if (isCardZoomDragging) {
            isCardZoomDragging = false;
            if (viewport) viewport.classList.remove("is-dragging");
        }
    };

    // 2. 휠 스크롤 줌 (PC)
    viewport.onwheel = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const delta = e.deltaY < 0 ? 0.35 : -0.35;
        adjustCardZoom(delta);
    };

    // 3. 더블클릭 토글 (PC)
    viewport.ondblclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (cardZoomScale > 1.25) {
            resetCardZoom();
        } else {
            cardZoomScale = 2.4;
            updateCardZoomTransform();
        }
    };

    // 4. 모바일 터치 드래그 및 핀치 줌
    viewport.ontouchstart = (e) => {
        if (e.touches.length === 1) {
            isCardZoomDragging = true;
            startCardDragX = e.touches[0].clientX - cardZoomX;
            startCardDragY = e.touches[0].clientY - cardZoomY;
        } else if (e.touches.length === 2) {
            isCardZoomDragging = false;
            cardLastTouchDist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
        }
    };

    viewport.ontouchmove = (e) => {
        if (e.touches.length === 1 && isCardZoomDragging) {
            cardZoomX = e.touches[0].clientX - startCardDragX;
            cardZoomY = e.touches[0].clientY - startCardDragY;
            updateCardZoomTransform();
        } else if (e.touches.length === 2) {
            const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            if (cardLastTouchDist > 0) {
                const diff = (dist - cardLastTouchDist) * 0.008;
                adjustCardZoom(diff);
            }
            cardLastTouchDist = dist;
        }
    };

    viewport.ontouchend = () => {
        isCardZoomDragging = false;
        cardLastTouchDist = 0;
    };
}
