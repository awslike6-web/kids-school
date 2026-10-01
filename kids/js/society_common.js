// ========================================================
// 🏰 [대문 파사드] 사회방 공통 비즈니스 로직 및 통합 라우터 (society_common.js)
// ========================================================
// 💡 [골디락스 아키텍처 규격]
// 프로필/테마 초기화, 노션 어휘/사료 프리패치, 미션 오버레이 라우팅, 학습일지 전송을 총괄하는 대문 파사드입니다.
// 세부 학습 UI는 5대 전문 서브모듈(storybook, voca, chart, map, history)에 위임합니다.

window.currentSubject = "사회"; // 전역 과목명 명시 (보상 및 학습일지 타겟용)

// 🔊 요정 음성 제어 헬퍼
function stopFairyTTS() {
    if (typeof FairyEngine !== 'undefined' && typeof FairyEngine.stop === 'function') {
        FairyEngine.stop();
        return;
    }
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
}

function speakFairyTTS(text) {
    if (!text) return;
    if (typeof FairyEngine !== 'undefined' && typeof FairyEngine.speak === 'function') {
        FairyEngine.speak(text);
        return;
    }
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = 'ko-KR';
        utter.rate = 0.9;
        window.speechSynthesis.speak(utter);
    }
}

// 🔒 로컬 속성 상태
let currentProfile = localStorage.getItem('currentUser') || 'son';
let currentUserName = localStorage.getItem('currentUserName') || '민수';
let currentTheme = localStorage.getItem('currentTheme') || 'theme--arcade';

const savedName = localStorage.getItem('currentUserName');
const isAdmin = (savedName === '아빠' || savedName === '엄마');

let activeSectionData = []; // 현재 로드된 해당 과목 DB 세트
let activeQuizIdx = 0; 
let societyVocaOrderType = "shuffle"; // 'shuffle' or 'sequence'
let societyVocaMasterCountMap = {}; // 마스터 횟수 기록용

let historyCollected = [];
try {
    const rawHistory = localStorage.getItem('society_history_collectibles');
    historyCollected = rawHistory ? JSON.parse(rawHistory) : [];
    if (!Array.isArray(historyCollected)) historyCollected = [];
} catch (e) {
    console.warn("⚠️ [사회방] 소장 유물 스토리지 복구 기본값 적용:", e);
    historyCollected = [];
}
window.historyCollected = historyCollected;

// 💡 [동적 메모리] 노션 원본 데이터 보관 및 학년/단원 실시간 추출
let allFetchedRecords = []; 
let selectedSocietyGrade = "";
let selectedSocietyUnit = "";
let currentMissionType = "";
let isCurrentSocietyMissionLogged = false;

// ========================================================
// 🛠️ 사회방 초기화 엔진 (initializeSocietyRoom)
// ========================================================
function initializeSocietyRoom() {
    console.log("🛠️ 사회방 초기화 엔진 가동...");

    const profile = localStorage.getItem('currentUser') || 'son';
    let firstName = "민수";
    let secondName = "민서";

    try {
        if (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.CHILDREN) {
            firstName = APP_CONFIG.CHILDREN.first?.name || APP_CONFIG.CHILDREN.son?.name || "민수";
            secondName = APP_CONFIG.CHILDREN.second?.name || APP_CONFIG.CHILDREN.daughter?.name || "민서";
        }
    } catch (e) {
        console.log("⚠️ 전역 설정 객체 로드 지연으로 기본 이름을 사용합니다.");
    }

    if (profile === 'son') {
        document.body.className = "theme--arcade";
        const titleEl = document.getElementById('societyTitle');
        if (titleEl) titleEl.textContent = `${firstName}의 사회 탐험 대기실`;
        
        const badgeEl = document.getElementById('adminBadgeTag');
        if (badgeEl) {
            badgeEl.className = "admin-status-badge";
            badgeEl.textContent = `🎮 [${firstName}] 네온 관제`;
        }
    } else {
        document.body.className = "theme--slime";
        const titleEl = document.getElementById('societyTitle');
        if (titleEl) titleEl.textContent = `${secondName}의 사회 탐험 대기실`;
        
        const badgeEl = document.getElementById('adminBadgeTag');
        if (badgeEl) {
            badgeEl.className = "admin-status-badge korean--fairy";
            badgeEl.textContent = `🎠 [${secondName}] 동화 모드`;
        }
    }

    if (isAdmin) {
        const titleEl = document.getElementById('societyTitle');
        if (titleEl) titleEl.innerHTML = `<span style="color:var(--orange);">🛠️ 사회 관리자 시뮬레이터</span>`;
        const goalEl = document.getElementById('societyGoalText');
        if (goalEl) goalEl.textContent = "🔧 아버님/어머님 테스트 구역: 실질적인 노션 전송을 완전 차단하고, 고품격 가상 검증 데이터를 지원 중입니다.";
        const badgeEl = document.getElementById('adminBadgeTag');
        if (badgeEl) {
            badgeEl.textContent = `🛠️ [${savedName} 검수용] 프리패스 가동`;
            badgeEl.style.color = "var(--yellow)";
            badgeEl.style.borderColor = "var(--orange)";
        }
    } else {
        if (typeof startLearning === 'function') {
            startLearning("초등 사회 탐색 교실");
        }
    }

    let customGreeting = "안녕! 보상을 얻으러 사회 탐험을 출발해볼까?";
    if (typeof FAIRY_CONFIG !== 'undefined' && FAIRY_CONFIG.greetings) {
        customGreeting = FAIRY_CONFIG.greetings[profile] || customGreeting;
        if (isAdmin && FAIRY_CONFIG.greetings.admin) {
            customGreeting = FAIRY_CONFIG.greetings.admin;
        }
    }
    const speakerEl = document.getElementById('fairySpeakerText');
    if (speakerEl) speakerEl.textContent = customGreeting;

    if (typeof updateTtsToggleUi === 'function') updateTtsToggleUi();
}

// ========================================================
// 🚪 오버레이 미션 팝업 라이프사이클 제어
// ========================================================
function isSocietyMissionInProgress() {
    const overlay = document.getElementById('missionOverlay');
    if (!overlay || overlay.style.display !== 'flex') return false;
    return Array.isArray(activeSectionData) && activeSectionData.length > 0
        && activeQuizIdx < activeSectionData.length;
}

function openMissionView(type) {
    const overlay = document.getElementById('missionOverlay');
    const headerTitle = document.getElementById('overlayHeaderTitle');
    const headerIcon = document.getElementById('overlayHeaderIcon');
    const innerBody = document.getElementById('overlayInnerBody');
    if (!overlay || !innerBody) return;
    
    overlay.style.display = "flex";
    activeQuizIdx = 0;
    stopFairyTTS();
    
    currentMissionType = type;
    if (typeof initQuizRewardSession === 'function') {
        initQuizRewardSession(type);
    }
    selectedSocietyGrade = "";
    selectedSocietyUnit = "";

    let targetTitle = "";
    let targetIcon = "";

    switch(type) {
        case 'storybook': targetTitle = "사회 단원 동화 도서관"; targetIcon = "📚"; break;
        case 'voca': targetTitle = "사회 용어방 (한자 초성 퀴즈)"; targetIcon = "📖"; break;
        case 'chart': targetTitle = "차트 & 도표 자료 분석실"; targetIcon = "📊"; break;
        case 'map': targetTitle = "랜선 국토 지도 탐방"; targetIcon = "🗺️"; break;
        case 'history': targetTitle = "역사 문화재 돋보기"; targetIcon = "⏳"; break;
    }

    if (headerTitle) headerTitle.textContent = targetTitle;
    if (headerIcon) headerIcon.textContent = targetIcon;

    if (type === 'storybook') {
        if (window.SocietyStorybook && typeof window.SocietyStorybook.render === 'function') {
            window.SocietyStorybook.render(innerBody);
        } else if (typeof renderSocietyStorybookLibrary === 'function') {
            renderSocietyStorybookLibrary(innerBody);
        }
        return;
    }

    if (typeof armQuizLeaveGuard === 'function') {
        armQuizLeaveGuard({
            isActive: isSocietyMissionInProgress,
            onLeave: () => closeMissionView(true)
        });
    }

    showLoadingSpinner(innerBody);
    fetchAndBuildDynamicUI(type, innerBody);
}

function showLoadingSpinner(container) {
    if (!container) return;
    container.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; font-family: 'Jua', sans-serif;">
            <div style="font-size: 3rem; animation: spin 1s infinite linear; margin-bottom: 16px;">⏳</div>
            <h3 style="font-size: 1.3rem; color: var(--purple); margin-bottom: 8px;">노션 교재 데이터 수신 중...</h3>
            <p style="font-size: 0.95rem; color: #888;">교과서 핵심 단원과 사료를 실시간으로 불러오고 있어요!</p>
        </div>
    `;
}

function closeMissionView(isForce = false) {
    const overlay = document.getElementById('missionOverlay');
    if (!overlay) return;

    if (!isForce && isSocietyMissionInProgress()) {
        if (typeof confirmQuizAbandon === 'function') {
            confirmQuizAbandon({
                onConfirm: () => closeMissionView(true)
            });
            return;
        }
    }

    overlay.style.display = "none";
    activeSectionData = [];
    activeQuizIdx = 0;
    stopFairyTTS();
}

// ========================================================
// 📊 노션 연동 및 표준 교과서 데이터셋 하이브리드 로더
// ========================================================
function getCurriculumRecords(type) {
    if (typeof SOCIETY_CURRICULUM_DATA === 'undefined') return [];
    const list = [];
    for (const [grade, units] of Object.entries(SOCIETY_CURRICULUM_DATA)) {
        for (const [unitName, unitObj] of Object.entries(units)) {
            const items = unitObj[type] || [];
            items.forEach(item => {
                const titleStr = item.word || item.title || item.name || "";
                list.push({
                    word: titleStr,
                    title: titleStr,
                    name: titleStr,
                    hint: item.hint || (window.SocietyVoca ? window.SocietyVoca.getChosung(titleStr) : ""),
                    detailContext: item.desc || item.explanation || "",
                    desc: item.desc || item.detailContext || "",
                    meaning: item.meaning || item.desc || "",
                    imageUrl: item.image || item.img || "",
                    img: item.image || item.img || "",
                    interactiveUrl: item.interactiveUrl || item.link || "",
                    grade: grade,
                    grades: [grade],
                    level: unitName,
                    summaryPassage: unitObj.summaryPassage || "",
                    quiz: item.quiz || "",
                    choices: item.choices || [],
                    correctIdx: (typeof item.correctIdx === 'number') ? item.correctIdx : 0,
                    explanation: item.explanation || item.desc || "",
                    artifactName: item.artifactName || titleStr,
                    artifactPeriod: item.artifactPeriod || "",
                    artifactUsage: item.artifactUsage || item.meaning || ""
                });
            });
        }
    }
    return list;
}

function normalizeSocietyGrade(g) {
    if (!g) return "";
    const str = String(g).trim();
    if (str === "5-1" || str === "5학년 1학기" || str === "5-1 (5학년 1학기)") return "5-1 (5학년 1학기)";
    if (str === "5-2" || str === "5학년 2학기" || str === "5-2 (5학년 2학기)") return "5-2 (5학년 2학기)";
    return str;
}

/**
 * 🏛️ 노션 [교재·사료 마스터 DB] 실시간 쿼리 함수 (2026 표준)
 */
async function fetchCurriculumFromNotion(type) {
    const PROXY = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.WORKER_PROXY_URL) ? APP_CONFIG.WORKER_PROXY_URL : "https://minmin-notion.awslike6.workers.dev";
    const DB_ID = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.CURRICULUM_DB_ID) ? APP_CONFIG.CURRICULUM_DB_ID : "3e8a27115b68806d94bfc81e9b3435fa";

    const zoneMap = { chart: "자료분석", map: "지도탐방", history: "역사사료" };
    const targetZone = zoneMap[type];
    if (!targetZone) return [];

    const url = `${PROXY}/v1/databases/${DB_ID}/query`;
    const payload = {
        page_size: 100,
        filter: {
            and: [
                { property: "과목", select: { equals: "사회" } },
                { property: "구역", select: { equals: targetZone } }
            ]
        }
    };

    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
        body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error(`Notion Curriculum Query Failed: HTTP ${res.status}`);
    const data = await res.json();

    return (data.results || []).map(page => {
        const p = page.properties || {};
        const title = (p["제목"]?.title || []).map(x => x.plain_text).join('').trim() || '무제';
        const grade = p["학년"]?.select?.name || '5-2';
        const unit = (p["단원"]?.rich_text || []).map(x => x.plain_text).join('').trim() || '1단원';
        const mediaUrl = p["미디어 URL"]?.url || '';
        const interactiveUrl = p["인터랙티브 URL"]?.url || '';
        const desc = (p["핵심 쓰임새/설명"]?.rich_text || []).map(x => x.plain_text).join('').trim();
        const quiz = (p["퀴즈 질문"]?.rich_text || []).map(x => x.plain_text).join('').trim();
        const choicesText = (p["보기 1~4"]?.rich_text || []).map(x => x.plain_text).join('').trim();
        const choices = choicesText ? choicesText.split('\n').map(s => s.trim()).filter(Boolean) : [];
        const ans = p["정답"]?.number ?? 1;
        const correctIdx = Math.max(0, ans - 1);
        const explanation = (p["해설"]?.rich_text || []).map(x => x.plain_text).join('').trim();

        return {
            word: title,
            title: title,
            name: title,
            hint: (window.SocietyVoca ? window.SocietyVoca.getChosung(title) : ""),
            detailContext: desc,
            desc: desc,
            meaning: desc,
            imageUrl: mediaUrl,
            img: mediaUrl,
            interactiveUrl: interactiveUrl,
            grade: grade,
            grades: [grade],
            level: unit,
            summaryPassage: "",
            quiz: quiz,
            choices: choices,
            correctIdx: correctIdx,
            explanation: explanation,
            artifactName: title,
            artifactPeriod: "",
            artifactUsage: desc,
            _fromNotion: true
        };
    });
}

async function fetchAndBuildDynamicUI(type, innerBody) {
    const curriculumRecords = getCurriculumRecords(type);
    const mockFallback = (window.SOCIETY_MOCK_DATA && window.SOCIETY_MOCK_DATA[type]) ? window.SOCIETY_MOCK_DATA[type] : [];

    try {
        let records = [];
        try {
            if (type === 'voca') {
                if (typeof fetchVocaFromNotion === 'function') {
                    records = await fetchVocaFromNotion({
                        subject: "사회", 
                        areaZone: "용어방",
                        useServerFilter: true,
                        filterByStudent: true 
                    });
                }
            } else {
                records = await fetchCurriculumFromNotion(type);
            }
        } catch (netErr) {
            console.warn("ℹ️ 노션 통신 대기 -> 표준 교과서 데이터셋으로 전환합니다.", netErr);
        }

        if (!records || records.length === 0) {
            records = curriculumRecords;
        } else if (curriculumRecords.length > 0) {
            const existingTitles = new Set(records.map(r => r.word || r.title || r.name));
            const extra = curriculumRecords.filter(r => !existingTitles.has(r.word || r.title || r.name));
            records = [...records, ...extra];
        }

        if (records && records.length > 0) {
            allFetchedRecords = records; 
            window.allFetchedRecords = records;

            const uniqueGrades = [...new Set(records.flatMap(r => (r.grades || [r.grade]).map(normalizeSocietyGrade)))].filter(g => g && g !== "공통").sort();

            if (uniqueGrades.length === 0) {
                startMissionWithFilteredData(records, innerBody);
            } else {
                renderDynamicGradeUI(uniqueGrades, innerBody);
            }
        } else {
            console.warn("⚠️ 데이터 결과가 없습니다. 가상 데이터 구동");
            activeSectionData = mockFallback;
            window.activeSectionData = mockFallback;
            renderSectionUI(type, innerBody);
        }
    } catch(e) {
        console.warn("통신 에러. 교과서/가상 데이터 구동", e);
        activeSectionData = (curriculumRecords && curriculumRecords.length > 0) ? curriculumRecords : mockFallback;
        window.activeSectionData = activeSectionData;
        renderSectionUI(type, innerBody);
    }
}

/**
 * 🎒 1단계: 학년 버튼 자동 생성
 */
function renderDynamicGradeUI(grades, container) {
    speakFairyTTS("공부할 학년과 학기를 마우스로 골라보세요! 🧚‍♀️");
    
    const buttonsHtml = grades.map(g => 
        `<button class="quiz-choice-btn" style="padding:15px; font-size:1.2rem;" onclick="selectDynamicGrade('${g}')">${g}</button>`
    ).join('');

    container.innerHTML = `
        <div style="text-align:center; padding:20px; font-family:'Jua'; width:100%; max-width:500px; margin:0 auto;">
            <h3 style="margin-bottom:20px; color:var(--purple); font-size:1.6rem;">🎒 1. 학년/학기 고르기</h3>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                ${buttonsHtml}
            </div>
        </div>
    `;
}

function selectDynamicGrade(grade) {
    selectedSocietyGrade = grade;
    window.selectedSocietyGrade = grade;
    const innerBody = document.getElementById('overlayInnerBody');
    
    const matchedRecords = allFetchedRecords.filter(r => {
        const rGrades = (r.grades || [r.grade]).map(normalizeSocietyGrade);
        return rGrades.includes(grade) || r.grade === grade;
    });
    const uniqueUnits = [...new Set(matchedRecords.map(r => String(r.level).trim()))].filter(u => u && u !== "기본 단원").sort();

    if (uniqueUnits.length === 0) {
        startMissionWithFilteredData(matchedRecords, innerBody);
    } else {
        renderDynamicUnitUI(uniqueUnits, innerBody);
    }
}

/**
 * 📖 2단계: 단원 버튼 자동 생성
 */
function renderDynamicUnitUI(units, container) {
    speakFairyTTS("이어서 공부할 단원을 선택해 주세요!");
    
    const buttonsHtml = units.map(u => 
        `<button class="quiz-choice-btn" style="padding:15px 5px; font-size:1.1rem;" onclick="selectDynamicUnit('${u}')">${u}</button>`
    ).join('');

    container.innerHTML = `
        <div style="text-align:center; padding:20px; font-family:'Jua'; width:100%; max-width:500px; margin:0 auto;">
            <h3 style="margin-bottom:5px; color:var(--purple); font-size:1.6rem;">📖 2. 단원 고르기</h3>
            <p style="color:var(--pink); margin-bottom:20px; font-size:1.1rem;">선택된 학기: ${selectedSocietyGrade}</p>
            <div style="display:grid; grid-template-columns:repeat(2, 1fr); gap:10px; margin-bottom:20px;">
                ${buttonsHtml}
            </div>
            <button class="quiz-button" style="background:#8b949e; width:100%;" onclick="openMissionView(currentMissionType)">⬅️ 처음으로 돌아가기</button>
        </div>
    `;
}

function selectDynamicUnit(unit) {
    selectedSocietyUnit = unit;
    window.selectedSocietyUnit = unit;
    const innerBody = document.getElementById('overlayInnerBody');
    
    const finalRecords = allFetchedRecords.filter(r => {
        const rGrades = (r.grades || [r.grade]).map(normalizeSocietyGrade);
        return (rGrades.includes(selectedSocietyGrade) || r.grade === selectedSocietyGrade) &&
               String(r.level).trim() === unit;
    });
    
    startMissionWithFilteredData(finalRecords, innerBody);
}

/**
 * 🚀 데이터 조립 및 최종 미션 개시
 */
function startMissionWithFilteredData(records, innerBody) {
    const parsed = records.map(record => {
        const titleStr = record.word || record.title || record.name || "미상";
        const meaningStr = record.meaning || "뜻풀이 없음";
        const descStr = record.detailContext || record.desc || "해당 유적/지형 설명이 준비되어 있습니다.";
        const imgUrl = record.imageUrl || record.img || "";
        const hintStr = record.hint || (window.SocietyVoca ? window.SocietyVoca.getChosung(titleStr) : "");
        const summaryPassage = record.summaryPassage || "";
        const interactiveUrl = record.interactiveUrl || "";

        if (currentMissionType === 'voca') {
            return { 
                word: titleStr, 
                meaning: meaningStr, 
                hint: hintStr, 
                desc: descStr, 
                image: imgUrl, 
                interactiveUrl: interactiveUrl,
                pageId: record.pageId, 
                isMastered: record.isMastered,
                summaryPassage: summaryPassage
            };
        } else if (currentMissionType === 'chart') {
            return {
                title: titleStr, 
                img: imgUrl, 
                meaning: meaningStr, 
                desc: descStr, 
                interactiveUrl: interactiveUrl,
                quiz: record.quiz || `${titleStr}의 퀴즈: 본 자료의 성격으로 가장 알맞은 것은?`,
                choices: (record.choices && record.choices.length > 0) ? record.choices : ["전형적인 통계 자료", "가짜 관찰 보고서", "모킹 가설", "1등급 유망 자료"],
                correctIdx: (typeof record.correctIdx === 'number') ? record.correctIdx : 0,
                explanation: record.explanation || descStr,
                summaryPassage: summaryPassage,
                artifactName: record.artifactName || titleStr,
                artifactPeriod: record.artifactPeriod || "",
                artifactUsage: record.artifactUsage || meaningStr
            };
        } else {
            return { 
                name: titleStr, 
                img: imgUrl, 
                meaning: meaningStr, 
                desc: descStr, 
                interactiveUrl: interactiveUrl,
                summaryPassage: summaryPassage
            };
        }
    });

    if (currentMissionType === 'voca') {
        societyVocaMasterCountMap = JSON.parse(localStorage.getItem(`society_voca_master_${currentUserName}`) || '{}');
        window.societyVocaMasterCountMap = societyVocaMasterCountMap;
        
        activeSectionData = parsed.filter(item => {
            const isNotionMastered = item.isMastered === true;
            const isLocalMastered = (societyVocaMasterCountMap[item.word] || 0) >= 3;
            return !isNotionMastered && !isLocalMastered;
        });
        
        if (societyVocaOrderType === "shuffle") {
            activeSectionData.sort(() => Math.random() - 0.5);
        }
    } else {
        activeSectionData = parsed;
    }

    window.activeSectionData = activeSectionData;
    window.activeQuizIdx = 0;
    activeQuizIdx = 0;
    
    if (currentMissionType === 'voca' || currentMissionType === 'chart') {
        const badge = ` [${selectedSocietyGrade} ${selectedSocietyUnit}]`;
        const titleEl = document.getElementById('overlayHeaderTitle');
        if (titleEl) {
            titleEl.textContent = (currentMissionType === 'voca' ? "사회 용어방 (한자 초성 퀴즈)" : "차트 & 도표 자료 분석실") + badge;
        }
    }

    renderSectionUI(currentMissionType, innerBody);
}

/**
 * 🎨 [통합 렌더링 라우터] 각 전문 서브모듈로 UI 렌더링 위임
 */
function renderSectionUI(type, container) {
    if (!container) container = document.getElementById('overlayInnerBody');
    if (!container) return;

    if (!activeSectionData || activeSectionData.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #cbd5e1;">
                <div style="font-size: 3rem; margin-bottom: 12px;">🎉</div>
                <h3 style="font-family: 'Jua'; font-size: 1.4rem; color: #10b981;">축하합니다! 모든 미션을 완료했습니다!</h3>
                <p style="font-size: 1rem; color: #94a3b8; margin: 10px 0 20px;">이 단원의 모든 문항을 마스터했어요.</p>
                <button class="back-to-lobby-btn" onclick="closeMissionView(true)">대기실로 돌아가기</button>
            </div>
        `;
        return;
    }

    if (activeQuizIdx >= activeSectionData.length) {
        finalizeSocietyMissionImmediately();
        speakFairyTTS("모든 미션을 완료했어요! 참 잘했어요!");
        alert("🏆 축하합니다! 모든 사회 탐구 단계를 완료하셨습니다!");
        closeMissionView(true);
        return;
    }

    // 10문제 커트라인 체크 팝업 (용어방 전용)
    if (type === 'voca' && activeQuizIdx > 0 && activeQuizIdx % 10 === 0 && !window.societyVocaContinueFlag) {
        finalizeSocietyMissionImmediately();
        container.innerHTML = `
            <div class="screen loaded quiz-card" style="text-align:center; padding: 40px 20px;">
                <div style="font-size:3.5rem; margin-bottom:10px;">🏆</div>
                <h2 style="font-size:1.8rem; color:#A78BFA; margin-bottom:15px;">벌써 10문제를 완주했어요!</h2>
                <p style="font-size:1.15rem; color:#10b981; font-weight:bold; margin-bottom:15px;">🎉 완주 보너스(+5💎)와 학습일지가 안전하게 기록되었어요!</p>
                <p style="font-size:1.1rem; color:#666; margin-bottom:30px;">더 탐험하고 싶다면 계속해서 도전해볼까요?</p>
                <div style="display:flex; justify-content:center; gap:15px;">
                    <button class="back-to-lobby-btn" style="background:#FF6B9D; color:white;" onclick="closeMissionView(true);">✅ 여기서 나가기</button>
                    <button class="back-to-lobby-btn" style="background:#6EC6F5; color:white;" onclick="window.societyVocaContinueFlag=true; renderSectionUI('${type}', document.getElementById('overlayInnerBody'));">🚀 계속 이어서 풀기</button>
                </div>
            </div>
        `;
        return;
    }
    window.societyVocaContinueFlag = false;

    const currentItem = activeSectionData[activeQuizIdx];
    container.innerHTML = "";

    const safePassageText = (currentItem.summaryPassage || "").replace(/'/g, "\\'").replace(/"/g, "&quot;");
    const passageHtml = currentItem.summaryPassage ? `
        <div class="passage-summary-box">
            <div class="passage-header">
                <span>📖 교과서 핵심 지문 돋보기</span>
                <button class="quiz-button" style="padding:4px 10px; font-size:0.85rem; background:var(--purple);" onclick="speakFairyTTS('${safePassageText}')">🔊 지문 듣기</button>
            </div>
            <p style="font-size:0.95rem; line-height:1.5; color:inherit;">${currentItem.summaryPassage}</p>
        </div>
    ` : '';

    // 5대 서브모듈로 UI 렌더링 위임
    switch(type) {
        case 'voca':
            if (window.SocietyVoca && typeof window.SocietyVoca.render === 'function') {
                window.SocietyVoca.render(container, currentItem, activeQuizIdx, activeSectionData.length);
            }
            break;
        case 'chart':
            if (window.SocietyChart && typeof window.SocietyChart.render === 'function') {
                window.SocietyChart.render(container, currentItem, activeQuizIdx, activeSectionData.length, passageHtml);
            }
            break;
        case 'map':
            if (window.SocietyMap && typeof window.SocietyMap.render === 'function') {
                window.SocietyMap.render(container, currentItem, activeQuizIdx, activeSectionData.length, passageHtml);
            }
            break;
        case 'history':
            if (window.SocietyHistory && typeof window.SocietyHistory.render === 'function') {
                window.SocietyHistory.render(container, currentItem, activeQuizIdx, activeSectionData.length);
            }
            break;
        default:
            console.warn(`알 수 없는 미션 타입: ${type}`);
    }
}

/**
 * 🏆 미션 완주 및 학습일지 전송
 */
async function finalizeSocietyMissionImmediately() {
    if (isCurrentSocietyMissionLogged) return;
    isCurrentSocietyMissionLogged = true;

    try {
        const student = (currentProfile === 'daughter' || currentUserName === '민서' || localStorage.getItem('currentUser') === 'daughter' || localStorage.getItem('currentChild') === 'minseo') ? '민서' : '민수';
        let subj = '사회';
        if (selectedSocietyUnit) subj = `사회(${selectedSocietyUnit})`;

        const targetNotes = window.wrongNotes || [];
        const errorReport = targetNotes.length > 0 ? targetNotes.map(q => {
            if (q.wrongInput) return `${q.word || q.text} (오답: ${q.wrongInput})`;
            return q.word || q.text || q;
        }).join(' / ') : "오답 없음";

        if (typeof finalizeQuizRewardSession === 'function') {
            await finalizeQuizRewardSession({
                isFullComplete: true,
                subject: subj,
                childName: student,
                errorReport: errorReport
            });
            console.log(`🎉 [사회 미션 완수] 완주 보너스(+5) & 노션 학습일지 자동 전송 완료! (${student} - ${subj})`);
        }
    } catch (e) {
        console.error("사회 미션 완수 일지 전송 오류:", e);
    }
}

function skipToNextQuiz(type) {
    activeQuizIdx++;
    window.activeQuizIdx = activeQuizIdx;
    const innerBody = document.getElementById('overlayInnerBody');
    if (type !== 'voca' && activeQuizIdx >= activeSectionData.length) {
        speakFairyTTS("모든 미션을 완료했어요! 참 잘했어요!");
        alert("🏆 축하합니다! 모든 사회 탐구 단계를 완료하셨습니다!");
        closeMissionView(true);
    } else {
        renderSectionUI(type, innerBody);
    }
}

// 💎 보상 지급 브릿지
async function triggerAwardDispense(amount, type) {
    if (typeof dispenseRewardDirectly === 'function') {
        await dispenseRewardDirectly(amount, type);
    }
}

// 🖨️ 사회방 인쇄 로직 (printSocietySummary)
async function printSocietySummary() {
    let printArea = document.getElementById('print-area');
    if (!printArea) {
        printArea = document.createElement('div');
        printArea.id = 'print-area';
        document.body.appendChild(printArea);
    }
    
    let targetList = allFetchedRecords && allFetchedRecords.length > 0 ? allFetchedRecords : (window.SOCIETY_MOCK_DATA?.voca || []);
    
    let html = `
        <div style="padding: 20px; font-family: 'Nanum Gothic', sans-serif;">
            <div style="border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px;">
                <h1 style="margin: 0; font-size: 1.8rem;">🗺️ 민민이네 공부방 - 초등 사회 핵심 요약집</h1>
                <p style="margin: 5px 0 0 0; color: #666;">단원: ${selectedSocietyGrade || '5-2'} ${selectedSocietyUnit || '1단원 옛사람들의 삶과 문화'} | 인쇄일자: ${new Date().toLocaleDateString('ko-KR')}</p>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
    `;
    
    targetList.forEach((item, idx) => {
        const title = item.word || item.title || item.name || '';
        const meaning = item.meaning || item.desc || item.detailContext || '';
        const hint = item.hint || (window.SocietyVoca ? window.SocietyVoca.getChosung(title) : '');
        html += `
            <div style="border: 1px solid #ddd; padding: 12px; border-radius: 8px; page-break-inside: avoid;">
                <div style="font-weight: bold; font-size: 1.1rem; color: #2563eb; margin-bottom: 6px;">
                    ${idx + 1}. ${title} <span style="font-size: 0.85rem; color: #e11d48; border: 1px solid #fecdd3; padding: 1px 6px; border-radius: 10px;">[${hint}]</span>
                </div>
                <div style="font-size: 0.95rem; line-height: 1.5; color: #334155;">
                    ${meaning}
                </div>
            </div>
        `;
    });
    
    html += `</div></div>`;
    printArea.innerHTML = html;
    window.print();
}

// ========================================================
// 🌐 전역 핵심 함수 명시적 바인딩 (인라인 HTML 이벤트 연동 철벽 방어)
// ========================================================
window.initializeSocietyRoom = initializeSocietyRoom;
window.openMissionView = openMissionView;
window.closeMissionView = closeMissionView;
window.renderSectionUI = renderSectionUI;
window.skipToNextQuiz = skipToNextQuiz;
window.triggerAwardDispense = triggerAwardDispense;
window.printSocietySummary = printSocietySummary;
window.startMissionWithFilteredData = startMissionWithFilteredData;
window.selectDynamicGrade = selectDynamicGrade;
window.selectDynamicUnit = selectDynamicUnit;
window.fetchAndBuildDynamicUI = fetchAndBuildDynamicUI;
window.getCurriculumRecords = getCurriculumRecords;
window.normalizeSocietyGrade = normalizeSocietyGrade;
window.isSocietyMissionInProgress = isSocietyMissionInProgress;
window.stopFairyTTS = stopFairyTTS;
window.speakFairyTTS = speakFairyTTS;
