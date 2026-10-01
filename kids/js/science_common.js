// kids/js/science_common.js - 🔬 초등 과학 탐구방 통합 대문 파사드 엔진 (골디락스 아키텍처)
// - 전사 거버넌스 헌법(규칙 7조) 준수: 적정 응집도 300~600줄, 대문 파사드 표준
// - 5대 전문 서브모듈 중계:
//   1) 🥽 ScienceSafety (science_safety.js) : 실험실 안전 라이선스 시험 & 골드 연구원증
//   2) 📚 ScienceStorybook (science_storybook.js) : 과학 단원 동화 도서관 (1~5권)
//   3) 💡 ScienceVoca (science_voca.js) : 과학 핵심 용어방 & 2단계 학년·단원 선택
//   4) 🧪 ScienceLab (science_lab.js) : 가상 실험실 & 교재 DB 실시간 연동
//   5) 📝 ScienceReport (science_report.js) : 『실험관찰』 디지털 탐구 보고서 & 실전 퀴즈

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
    storybook: { title: "과학 단원 동화 도서관", icon: "📚" },
    voca: { title: "과학 핵심 용어방", icon: "🔬" },
    safety: { title: "실험실 안전 라이선스 시험장", icon: "🥽" },
    lab: { title: "가상 실험실 (Virtual Lab)", icon: "🧪" },
    report: { title: "『실험관찰』 디지털 탐구 보고서", icon: "📝" }
};

// ==========================================
// 🌐 전역 상태 관리 (하위 호환성 유지)
// ==========================================
let allFetchedRecords = [];
let selectedScienceGrade = "5-1";
let selectedScienceUnit = "";
let currentMissionType = '';
let activeSectionData = [];
let activeQuizIdx = 0;
let scienceVocaMasterCountMap = {};
let scienceVocaOrderType = 'shuffle';
let scienceDataLoadPromise = null;

// window 공유 속성 동기화
window.allFetchedRecords = allFetchedRecords;
window.selectedScienceGrade = selectedScienceGrade;
window.selectedScienceUnit = selectedScienceUnit;
window.activeSectionData = activeSectionData;
window.activeQuizIdx = activeQuizIdx;
window.scienceDataLoadPromise = null;

if (!window.stopFairyTTS) {
    window.stopFairyTTS = function() {};
}
if (!window.speakFairyTTS) {
    window.speakFairyTTS = function() {};
}

// ==========================================
// 🚀 과학방 초기화 및 프리페치
// ==========================================
function initializeScienceRoom() {
    console.log("🧬 과학방 골디락스 통합 엔진 가동 완료!");
    scienceVocaMasterCountMap = JSON.parse(localStorage.getItem(`science_voca_master_${currentUserName}`) || '{}');

    // 📡 노션 교재 DB 실시간 프리페치 (ScienceLab 서브모듈 위임)
    if (window.ScienceLab && typeof window.ScienceLab.fetchCurriculum === 'function') {
        window.ScienceLab.fetchCurriculum().catch(err => {
            console.warn("과학 교재 백그라운드 프리페치 폴백 안내:", err);
        });
    } else if (typeof fetchScienceCurriculumFromNotion === 'function') {
        fetchScienceCurriculumFromNotion().catch(err => {
            console.warn("과학 교재 백그라운드 프리페치 폴백 안내:", err);
        });
    }
}

// ==========================================
// 🚦 미션 진행 상태 및 가드레일
// ==========================================
function isScienceMissionInProgress() {
    const overlay = document.getElementById('missionOverlay');
    if (!overlay || overlay.style.display !== 'flex') return false;
    return Array.isArray(activeSectionData) && activeSectionData.length > 0
        && activeQuizIdx < activeSectionData.length;
}

// ==========================================
// 🏰 대문 라우팅: openMissionView
// ==========================================
function openMissionView(type) {
    const overlay = document.getElementById('missionOverlay');
    const titleEl = document.getElementById('overlayHeaderTitle');
    const iconEl = document.getElementById('overlayHeaderIcon');
    const innerBody = document.getElementById('overlayInnerBody');
    const meta = SCIENCE_MISSION_META[type] || { title: "과학 미션", icon: "🔬" };

    if (!overlay || !innerBody) return;

    overlay.style.display = 'flex';
    activeQuizIdx = 0;
    window.activeQuizIdx = 0;
    currentMissionType = type;
    selectedScienceGrade = "5-1";
    selectedScienceUnit = "";
    window.selectedScienceGrade = "5-1";
    window.selectedScienceUnit = "";
    stopFairyTTS();

    if (titleEl) titleEl.textContent = meta.title;
    if (iconEl) iconEl.textContent = meta.icon;

    // 1) 📚 [1단계] 동화 도서관 위임
    if (type === 'storybook') {
        if (window.ScienceStorybook && typeof window.ScienceStorybook.renderLibrary === 'function') {
            window.ScienceStorybook.renderLibrary(innerBody);
        } else if (typeof renderScienceStorybookLibrary === 'function') {
            renderScienceStorybookLibrary(innerBody);
        }
        return;
    }

    // 2) 🧪 [3단계] 가상 실험실 직접 이동
    if (type === 'lab') {
        overlay.style.display = 'none';
        location.href = 'science_virtual_lab.html';
        return;
    }

    // 3) 🥽 [0단계] 안전 라이선스 시험장 위임
    if (type === 'safety') {
        if (window.ScienceSafety && typeof window.ScienceSafety.renderUI === 'function') {
            window.ScienceSafety.renderUI(innerBody);
        } else if (typeof renderSafetyLicenseUI === 'function') {
            renderSafetyLicenseUI(innerBody);
        }
        return;
    }

    // 4) 📝 [4단계] 탐구 보고서 위임
    if (type === 'report' || type === 'report_unit1') {
        if (window.ScienceReport && typeof window.ScienceReport.renderUI === 'function') {
            window.ScienceReport.renderUI(innerBody, 'doc', 1);
        } else if (typeof renderLabReportUI === 'function') {
            renderLabReportUI(innerBody, 'doc', 1);
        }
        return;
    }

    if (type === 'report_unit2') {
        if (window.ScienceReport && typeof window.ScienceReport.renderUI === 'function') {
            window.ScienceReport.renderUI(innerBody, 'doc', 2);
        } else if (typeof renderLabReportUI === 'function') {
            renderLabReportUI(innerBody, 'doc', 2);
        }
        return;
    }

    // 5) 보상 세션 및 이탈 가드 활성화
    if (typeof initQuizRewardSession === 'function') {
        initQuizRewardSession(type);
    }

    if (typeof armQuizLeaveGuard === 'function') {
        armQuizLeaveGuard({
            isActive: isScienceMissionInProgress,
            onLeave: () => closeMissionView(true)
        });
    }

    // 6) 💡 용어방 등 동적 데이터 수급 및 2단계 선택 UI 진입
    showLoadingSpinner(innerBody);
    fetchAndBuildScienceUI(type, innerBody);
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
    const overlay = document.getElementById('missionOverlay');
    if (overlay) overlay.style.display = 'none';

    activeSectionData = [];
    activeQuizIdx = 0;
    window.activeSectionData = [];
    window.activeQuizIdx = 0;
    stopFairyTTS();
}

function showLoadingSpinner(container) {
    if (!container) return;
    container.innerHTML = `
      <div style="text-align:center; padding:50px 20px; font-family:'Jua', sans-serif;">
        <div style="width:45px; height:45px; border:4px solid #bae6fd; border-top:4px solid #0284c7; border-radius:50%; animation:spin 1s linear infinite; margin:0 auto 15px auto;"></div>
        <p style="font-size:1.15rem; color:#0369a1;">
            🧚‍♀️ 코코 요정이 노션 등대에서 과학 데이터들을 챙겨오고 있어요...
        </p>
      </div>
      <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
    `;
}

// ==========================================
// 📡 교과 데이터셋 수급 파이프라인
// ==========================================
function getCurriculumUnits() {
    if (typeof window !== 'undefined' && window.SCIENCE_CURRICULUM_DATA && Array.isArray(window.SCIENCE_CURRICULUM_DATA)) {
        return window.SCIENCE_CURRICULUM_DATA;
    }
    return [];
}

function getCurriculumRecords(type) {
    const curriculum = getCurriculumUnits();
    const list = [];
    const getChosung = (window.ScienceVoca && window.ScienceVoca.getChosung) || function(s) { return s; };

    curriculum.forEach(unit => {
        const items = unit[type] || unit.voca || [];
        items.forEach(item => {
            list.push({
                word: item.word || item.title || "",
                hint: item.hint || getChosung(item.word || item.title || ""),
                detailContext: item.desc || item.meaning || "",
                meaning: item.meaning || item.desc || "",
                imageUrl: item.img || item.image || "",
                grade: unit.grade || "5-1",
                grades: [unit.grade || "5-1"],
                level: unit.unit || unit.title,
                summaryPassage: unit.summary || "",
                quiz: item.quiz || "",
                choices: item.choices || [],
                explanation: item.desc || item.meaning || ""
            });
        });
    });
    return list;
}

async function fetchAndBuildScienceUI(type, innerBody) {
    const curriculumRecords = getCurriculumRecords(type);
    const getChosung = (window.ScienceVoca && window.ScienceVoca.getChosung) || function(s) { return s; };

    scienceDataLoadPromise = (async () => {
        try {
            let records = [];
            if (type === 'voca') {
                try {
                    if (typeof fetchVocaFromNotion === 'function') {
                        records = await fetchVocaFromNotion({
                            subject: "과학",
                            areaZone: "용어방",
                            useServerFilter: true,
                            filterByStudent: true
                        });
                    }
                } catch (netErr) {
                    console.warn("ℹ️ 노션 통신 대기 -> 표준 과학 데이터셋으로 전환합니다.", netErr);
                }
            } else {
                // 🔬 교재 마스터 DB (실험실, 자연탐험, 발명가)
                try {
                    const zoneName = SCIENCE_ZONE_MAP[type] || "실험실";
                    const fetcher = (window.ScienceLab && window.ScienceLab.fetchCurriculum) || window.fetchScienceCurriculumFromNotion;
                    const allCurriculum = fetcher ? await fetcher() : null;

                    if (allCurriculum && allCurriculum.length > 0) {
                        const matched = allCurriculum.filter(it => it.zone === zoneName);
                        if (matched.length > 0) {
                            records = matched.map(it => ({
                                word: it.title,
                                title: it.title,
                                name: it.title,
                                hint: getChosung(it.title),
                                detailContext: it.desc,
                                meaning: it.desc,
                                imageUrl: it.mediaUrl,
                                img: it.mediaUrl,
                                grade: it.grade,
                                grades: [it.grade],
                                level: it.unit,
                                summaryPassage: "",
                                quiz: it.quiz,
                                choices: it.choices,
                                correctIdx: it.correctIdx,
                                explanation: it.explanation,
                                _fromNotion: true
                            }));
                        }
                    }
                } catch (netErr) {
                    console.warn("ℹ️ 노션 교재 DB 통신 대기 -> 로컬 데이터셋으로 전환합니다.", netErr);
                }
            }

            if (!records || records.length === 0) {
                records = curriculumRecords;
            } else if (curriculumRecords.length > 0) {
                const existingWords = new Set(records.map(r => r.word));
                const extra = curriculumRecords.filter(r => !existingWords.has(r.word));
                records = [...records, ...extra];
            }

            allFetchedRecords = records;
            window.allFetchedRecords = records;
            
            // 학년/학기 목록 추출 (예: ["5-1", "5-2"])
            const uniqueGrades = [...new Set(records.flatMap(r => r.grades || [r.grade]))].filter(g => g && g !== "공통").sort();

            // 직결 오픈(openScienceVocaDirect) 중이면 중간 학년 선택 화면 렌더링 생략
            if (!window._isScienceDirectNavigating) {
                if (uniqueGrades.length === 0) {
                    startScienceMissionWithFilteredData(records, innerBody, "과학 탐구");
                } else {
                    if (window.ScienceVoca && typeof window.ScienceVoca.renderGradeUI === 'function') {
                        window.ScienceVoca.renderGradeUI(uniqueGrades, innerBody);
                    } else if (typeof renderScienceGradeUI === 'function') {
                        renderScienceGradeUI(uniqueGrades, innerBody);
                    }
                }
            }
            return records;
        } catch(e) {
            console.warn("데이터 로딩 예외 -> 교과서 데이터셋 구동", e);
            allFetchedRecords = curriculumRecords;
            window.allFetchedRecords = curriculumRecords;
            const uniqueGrades = [...new Set(curriculumRecords.map(r => r.grade))].filter(Boolean).sort();
            if (!window._isScienceDirectNavigating) {
                if (window.ScienceVoca && typeof window.ScienceVoca.renderGradeUI === 'function') {
                    window.ScienceVoca.renderGradeUI(uniqueGrades, innerBody);
                } else if (typeof renderScienceGradeUI === 'function') {
                    renderScienceGradeUI(uniqueGrades, innerBody);
                }
            }
            return curriculumRecords;
        }
    })();

    window.scienceDataLoadPromise = scienceDataLoadPromise;
    return scienceDataLoadPromise;
}

// ==========================================
// 🎯 퀴즈 세션 가동 & 뷰어 디스패치
// ==========================================
function startScienceMissionWithFilteredData(records, container, titleStr) {
    let items = [...records];
    if (scienceVocaOrderType === 'shuffle') {
        items.sort(() => Math.random() - 0.5);
    }

    activeSectionData = items;
    activeQuizIdx = 0;
    window.activeSectionData = items;
    window.activeQuizIdx = 0;

    if (titleStr) {
        const headerTitleEl = document.getElementById('overlayHeaderTitle');
        if (headerTitleEl) {
            headerTitleEl.textContent = `${SCIENCE_MISSION_META[currentMissionType].title} [${titleStr}]`;
        }
    }

    renderSectionUI(currentMissionType, container);
}

function renderSectionUI(type, container, unitObj) {
    if (typeof container === 'string') container = document.getElementById('overlayInnerBody');
    if (!container) return;
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
        // 🧪 ScienceLab에 위임
        if (window.ScienceLab && typeof window.ScienceLab.renderExperimentUI === 'function') {
            window.ScienceLab.renderExperimentUI(container, currentItem, activeQuizIdx, activeSectionData.length, passageHtml);
        }
    } else if (type === 'voca') {
        // 💡 ScienceVoca에 위임
        if (window.ScienceVoca && typeof window.ScienceVoca.renderVocaQuiz === 'function') {
            window.ScienceVoca.renderVocaQuiz(container, currentItem, activeQuizIdx, activeSectionData.length, passageHtml);
        }
    } else {
        // 🌿 nature / inventor 위임
        if (window.ScienceLab && typeof window.ScienceLab.renderNatureInventorUI === 'function') {
            window.ScienceLab.renderNatureInventorUI(container, currentItem, activeQuizIdx, activeSectionData.length, passageHtml);
        }
    }
}

async function skipToNextScienceQuiz() {
    activeQuizIdx++;
    window.activeQuizIdx = activeQuizIdx;

    if (activeQuizIdx < activeSectionData.length) {
        const curriculum = getCurriculumUnits();
        const unitObj = curriculum.find(u => u.code === selectedScienceUnit);
        renderSectionUI(currentMissionType, document.getElementById('overlayInnerBody'), unitObj);
    } else {
        // 🏆 10문제 전량 완료 시 완주 보너스(+5) 및 일지 자동 전송!
        if (typeof finalizeQuizRewardSession === 'function') {
            await finalizeQuizRewardSession({ isFullComplete: true, subject: '과학' });
        }
        if (typeof showRewardPopup === 'function') {
            showRewardPopup("과학 탐구 정복 완료!", "과학 단원 탐구를 완벽하게 마쳤습니다! 🌟");
        }
        openMissionView(currentMissionType);
    }
}

// ==========================================
// 🌟 네임스페이스 및 전역 하위 호환성 브리지
// ==========================================
window.ScienceCommon = {
    initialize: initializeScienceRoom,
    openMissionView,
    closeMissionView,
    isMissionInProgress: isScienceMissionInProgress,
    fetchAndBuildUI: fetchAndBuildScienceUI,
    startMissionWithFilteredData: startScienceMissionWithFilteredData,
    renderSectionUI,
    skipToNextQuiz: skipToNextScienceQuiz
};

// 🌐 기존 글로벌 식별자 100% 호환 보존
window.initializeScienceRoom = initializeScienceRoom;
window.openMissionView = openMissionView;
window.closeMissionView = closeMissionView;
window.isScienceMissionInProgress = isScienceMissionInProgress;
window.startScienceMissionWithFilteredData = startScienceMissionWithFilteredData;
window.renderSectionUI = renderSectionUI;
window.skipToNextScienceQuiz = skipToNextScienceQuiz;
