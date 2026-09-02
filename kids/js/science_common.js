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
    storybook: { title: "과학 단원 동화 도서관", icon: "📚" },
    voca: { title: "과학 핵심 용어방", icon: "🔬" },
    safety: { title: "실험실 안전 라이선스 시험장", icon: "🥽" },
    lab: { title: "가상 실험실 (Virtual Lab)", icon: "🧪" },
    report: { title: "『실험관찰』 디지털 탐구 보고서", icon: "📝" }
};

const SCIENCE_STORYBOOK_LIBRARY = [
    {
        id: "5_1_0_1",
        grade: "5학년 1학기",
        unit: "0단원",
        bookNum: "1권",
        title: "과학 교과서 탐험대: 완벽 공부법",
        subtitle: "교과서 7단계 순서 정복과 완벽 공부 비법",
        desc: "민우, 서연, 지훈이와 함께 떠나는 과학 교과서 탐험! '단원 열기'부터 '체험 더하기'까지 7단계로 과학 왕이 되어보자!",
        icon: "🔍",
        color: "#0284c7",
        bgGrad: "linear-gradient(135deg, rgba(2, 132, 199, 0.15) 0%, rgba(30, 41, 59, 0.9) 100%)",
        border: "#0284c7",
        link: "science_storybook.html",
        coverImg: "images/minsu/5-1/0/storybook/science_story_p1.png"
    },
    {
        id: "5_1_0_2",
        grade: "5학년 1학기",
        unit: "0단원",
        bookNum: "2권",
        title: "안전을 지키는 꼬마 과학자 탐험대",
        subtitle: "실험실 & 야외 탐구 안전 수칙 완벽 마스터",
        desc: "유진, 수현, 지아와 함께 배우는 필수 안전 수칙! 실험 복장부터 비상 대피, 야외 탐구 안전까지 완벽 대비해요.",
        icon: "🛡️",
        color: "#059669",
        bgGrad: "linear-gradient(135deg, rgba(5, 150, 105, 0.15) 0%, rgba(30, 41, 59, 0.9) 100%)",
        border: "#059669",
        link: "science_safety_storybook.html",
        coverImg: "images/minsu/5-1/0/safety_storybook/science_safety_story_p1.png"
    },
    {
        id: "5_1_1_1",
        grade: "5학년 1학기",
        unit: "1단원",
        bookNum: "3권",
        title: "섞여 있어도 괜찮아! 혼합물 분리 대모험",
        subtitle: "1단원 혼합물의 분리 원리와 생활 속 분리배출",
        desc: "민재, 하은, 수아와 함께하는 신나는 과학 탐구! 콩·팥 분리, 거름, 증발, AI 선별 로봇부터 새활용 필통까지!",
        icon: "🧪",
        color: "#2563eb",
        bgGrad: "linear-gradient(135deg, rgba(37, 99, 235, 0.15) 0%, rgba(30, 41, 59, 0.9) 100%)",
        border: "#2563eb",
        link: "science_mix_storybook.html",
        coverImg: "images/minsu/5-1/1/storybook/science_mix_story_p1.png"
    }
];

function renderScienceStorybookLibrary(innerBody) {
    innerBody.innerHTML = `
        <div style="max-width: 800px; margin: 0 auto; padding: 10px;">
            <div style="text-align: center; margin-bottom: 24px;">
                <h3 style="font-family: 'Jua', sans-serif; font-size: 1.4rem; color: #38bdf8; margin-bottom: 6px;">
                    📚 과학 단원 동화 도서관
                </h3>
                <p style="font-size: 0.95rem; color: #94a3b8;">
                    교과서 내용이 쏙쏙 이해되는 재미있는 동화와 성우 구연동화 음성을 만나보세요!
                </p>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px;">
                ${SCIENCE_STORYBOOK_LIBRARY.map(book => `
                    <div style="
                        background: ${book.bgGrad};
                        border: 2px solid ${book.border};
                        border-radius: 16px;
                        padding: 16px;
                        display: flex;
                        flex-direction: column;
                        justify-content: space-between;
                        gap: 12px;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                        transition: transform 0.2s, box-shadow 0.2s;
                    ">
                        <div style="display: flex; gap: 14px; align-items: flex-start;">
                            <img src="${book.coverImg}?v=20260902_1" alt="${book.title}" style="
                                width: 90px;
                                height: 120px;
                                object-fit: cover;
                                border-radius: 8px;
                                border: 1px solid rgba(255,255,255,0.2);
                                box-shadow: 0 2px 8px rgba(0,0,0,0.4);
                                flex-shrink: 0;
                            ">
                            <div style="flex: 1; display: flex; flex-direction: column; gap: 4px;">
                                <div style="display: flex; gap: 6px; align-items: center;">
                                    <span style="
                                        background: ${book.color};
                                        color: white;
                                        padding: 2px 8px;
                                        border-radius: 6px;
                                        font-size: 0.75rem;
                                        font-family: 'Jua', sans-serif;
                                    ">${book.bookNum}</span>
                                    <span style="font-size: 0.8rem; color: #94a3b8;">${book.grade}</span>
                                </div>
                                <h4 style="font-family: 'Jua', sans-serif; font-size: 1.15rem; color: white; margin: 2px 0;">
                                    ${book.title}
                                </h4>
                                <p style="font-size: 0.85rem; color: #cbd5e1; line-height: 1.4; margin: 0;">
                                    ${book.subtitle}
                                </p>
                            </div>
                        </div>

                        <p style="font-size: 0.83rem; color: #94a3b8; line-height: 1.45; margin: 0; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 8px;">
                            ${book.desc}
                        </p>

                        <a href="${book.link}" style="
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            gap: 6px;
                            background: ${book.color};
                            color: white;
                            text-decoration: none;
                            padding: 10px;
                            border-radius: 10px;
                            font-family: 'Jua', sans-serif;
                            font-size: 1rem;
                            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                            transition: filter 0.2s;
                        ">
                            📖 동화책 읽기 (구연동화)
                        </a>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

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

    titleEl.textContent = meta.title;
    iconEl.textContent = meta.icon;

    if (type === 'storybook') {
        renderScienceStorybookLibrary(innerBody);
        return;
    }

    if (type === 'lab') {
        overlay.style.display = 'none';
        location.href = 'science_virtual_lab.html';
        return;
    }

    if (type === 'safety') {
        renderSafetyLicenseUI(innerBody);
        return;
    }

    if (type === 'report') {
        renderLabReportUI(innerBody);
        return;
    }

    if (typeof initQuizRewardSession === 'function') {
        initQuizRewardSession(type);
    }

    if (typeof armQuizLeaveGuard === 'function') {
        armQuizLeaveGuard({
            isActive: isScienceMissionInProgress,
            onLeave: () => closeMissionView(true)
        });
    }

    // 💡 용어방 등 미션 진입 시 노션 및 교과서 데이터셋을 동적으로 불러와 2단계(학년 ➔ 단원) 선택 UI 제공
    showLoadingSpinner(innerBody);
    fetchAndBuildScienceUI(type, innerBody);
}

// ==========================================
// 🥽 1. 실험실 안전 라이선스 시험 & 골드 카드 발급
// ==========================================
let safetyExamAnswers = {};
let safetyExamCurrentIdx = 0;

function renderSafetyLicenseUI(container) {
    safetyExamAnswers = {};
    safetyExamCurrentIdx = 0;
    const data = window.SCIENCE_SAFETY_LICENSE_DATA;
    if (!data) return;

    renderSafetyQuestion(container, 0);
}

function renderSafetyQuestion(container, qIdx) {
    const data = window.SCIENCE_SAFETY_LICENSE_DATA;
    const q = data.questions[qIdx];
    safetyExamCurrentIdx = qIdx;

    container.innerHTML = `
        <div style="max-width: 680px; margin: 0 auto; padding: 12px; font-family: 'Jua', sans-serif;">
            <div style="background: linear-gradient(135deg, #065f46 0%, #047857 100%); padding: 14px 18px; border-radius: 16px; color: white; margin-bottom: 16px; box-shadow: 0 4px 15px rgba(4, 120, 87, 0.3);">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 1.15rem; color: #a7f3d0;">🥽 ${data.title}</span>
                    <span style="background: rgba(0,0,0,0.25); padding: 4px 12px; border-radius: 10px; font-size: 0.95rem;">
                        문제 ${qIdx + 1} / ${data.questions.length}
                    </span>
                </div>
                <p style="font-size: 0.9rem; color: #e2e8f0; margin-top: 4px;">모든 안전 문제를 맞히면 '공인 꼬마 과학자 연구원증'이 발급됩니다!</p>
            </div>

            <div style="background: white; border-radius: 18px; padding: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); border: 2px solid #a7f3d0;">
                <div style="display: inline-block; background: #ecfdf5; color: #047857; padding: 4px 10px; border-radius: 8px; font-size: 0.85rem; margin-bottom: 10px;">
                    📌 [${q.category}]
                </div>
                <h3 style="color: #1e293b; font-size: 1.25rem; line-height: 1.5; margin-bottom: 18px;">
                    ${q.question}
                </h3>

                <div style="display: flex; flex-direction: column; gap: 10px;">
                    ${q.options.map((opt, idx) => `
                        <button class="quiz-choice-btn" style="
                            padding: 14px 16px;
                            font-size: 1.02rem;
                            text-align: left;
                            justify-content: flex-start;
                            line-height: 1.4;
                            border-radius: 12px;
                        " onclick="submitSafetyAnswer(${qIdx}, ${idx})">
                            <span style="font-weight: bold; color: #059669; margin-right: 8px;">${idx + 1}.</span> ${opt}
                        </button>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

function submitSafetyAnswer(qIdx, selectedIdx) {
    safetyExamAnswers[qIdx] = selectedIdx;
    const data = window.SCIENCE_SAFETY_LICENSE_DATA;
    const q = data.questions[qIdx];
    const isCorrect = (selectedIdx === q.answer);

    const container = document.getElementById('overlayInnerBody');

    if (!isCorrect) {
        container.innerHTML = `
            <div style="max-width: 550px; margin: 30px auto; padding: 24px; text-align: center; background: white; border-radius: 20px; box-shadow: 0 15px 35px rgba(0,0,0,0.15); border: 3px solid #f87171; font-family: 'Jua', sans-serif;">
                <div style="font-size: 3.5rem; margin-bottom: 10px;">⚠️</div>
                <h3 style="color: #dc2626; font-size: 1.4rem; margin-bottom: 8px;">앗! 안전 수칙을 다시 확인해 볼까요?</h3>
                <p style="color: #475569; font-size: 1rem; line-height: 1.6; margin-bottom: 16px;">
                    ${q.explanation}
                </p>
                <button class="btn-action-primary" style="background: #059669;" onclick="renderSafetyQuestion(document.getElementById('overlayInnerBody'), ${qIdx})">
                    🔄 다시 도전하기
                </button>
            </div>
        `;
        return;
    }

    if (qIdx + 1 < data.questions.length) {
        renderSafetyQuestion(container, qIdx + 1);
    } else {
        // 전원 정답 -> 골드 라이선스 발급
        renderGoldLicenseCard(container);
    }
}

function renderGoldLicenseCard(container) {
    const studentName = currentUserName || '민수';
    const dateStr = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });

    // 보석 지급
    if (typeof grantRewardGem === 'function') {
        grantRewardGem(10, '실험실 안전 라이선스 획득');
    }

    container.innerHTML = `
        <div style="max-width: 580px; margin: 10px auto; padding: 12px; font-family: 'Jua', sans-serif; text-align: center;">
            <div style="font-size: 2.5rem; margin-bottom: 6px;">🎉 🥽 🏆</div>
            <h2 style="color: #059669; font-size: 1.5rem; margin-bottom: 14px;">실험실 안전 라이선스 합격을 축하합니다! (+10💎)</h2>

            <!-- 골드 라이선스 카드 -->
            <div style="
                background: linear-gradient(135deg, #fef3c7 0%, #fde68a 50%, #f59e0b 100%);
                border: 4px solid #d97706;
                border-radius: 20px;
                padding: 24px 20px;
                box-shadow: 0 15px 40px rgba(217, 119, 6, 0.4), inset 0 0 20px rgba(255,255,255,0.6);
                color: #78350f;
                position: relative;
                overflow: hidden;
            ">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px dashed #b45309; padding-bottom: 12px; margin-bottom: 16px;">
                    <div style="text-align: left;">
                        <span style="font-size: 0.85rem; color: #92400e; letter-spacing: 1px;">KIDS SCIENCE LAB LICENSE</span>
                        <h3 style="font-size: 1.4rem; color: #78350f; margin: 2px 0;">공인 꼬마 과학자 연구원증</h3>
                    </div>
                    <span style="font-size: 2.8rem;">🔬</span>
                </div>

                <div style="display: flex; gap: 16px; align-items: center; text-align: left; margin-bottom: 16px;">
                    <div style="width: 85px; height: 105px; background: white; border-radius: 10px; border: 2px solid #b45309; display: flex; flex-direction: column; justify-content: center; align-items: center; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
                        <span style="font-size: 2.8rem;">🧑‍🔬</span>
                        <span style="font-size: 0.75rem; color: #047857; font-weight: bold; margin-top: 2px;">수석 연구원</span>
                    </div>
                    <div style="flex: 1; display: flex; flex-direction: column; gap: 6px;">
                        <div style="font-size: 1.15rem; color: #1e293b;"><b>연구원 성명</b> : <span style="color: #047857; font-size: 1.25rem;">${studentName}</span></div>
                        <div style="font-size: 0.95rem; color: #334155;"><b>인증 등급</b> : 5학년 과학 탐구 마스터 (1급)</div>
                        <div style="font-size: 0.95rem; color: #334155;"><b>발급 번호</b> : SCI-2026-SAFE-0501</div>
                        <div style="font-size: 0.85rem; color: #64748b;"><b>발급 일자</b> : ${dateStr}</div>
                    </div>
                </div>

                <div style="background: rgba(255,255,255,0.7); padding: 10px; border-radius: 12px; font-size: 0.92rem; line-height: 1.5; color: #78350f;">
                    위 학생은 과학 실험실 및 야외 탐구 안전 수칙을 완벽하게 숙지하였으므로 본 공인 라이선스를 수여합니다.
                </div>
            </div>

            <div style="margin-top: 20px; display: flex; justify-content: center; gap: 10px;">
                <button class="back-to-lobby-btn" style="background: #0284c7; color: white;" onclick="openMissionView('lab')">
                    🧪 가상 실험실로 이동하기
                </button>
                <button class="back-to-lobby-btn" onclick="closeMissionView(true)">
                    닫기
                </button>
            </div>
        </div>
    `;
}

// ==========================================
// 📝 2. 『실험관찰』 디지털 탐구 보고서 (2단계: 요약 노트 + 실전 퀴즈)
// ==========================================
let currentReportTab = 'doc'; // 'doc' | 'quiz'
let currentReportQuizIdx = 0;
let userBlankAnswers = {};

function renderLabReportUI(container, tabName) {
    if (tabName) currentReportTab = tabName;
    const data = window.SCIENCE_LAB_REPORT_DATA;
    if (!data) return;

    container.innerHTML = `
        <div style="max-width: 780px; margin: 0 auto; padding: 6px 12px; font-family: 'Jua', sans-serif;">
            
            <!-- 상단 2단계 모드 전환 탭 -->
            <div style="display: flex; gap: 8px; margin-bottom: 16px; background: #e0f2fe; padding: 6px; border-radius: 14px;">
                <button onclick="renderLabReportUI(document.getElementById('overlayInnerBody'), 'doc')" style="
                    flex: 1; padding: 10px 14px; border-radius: 10px; border: none; font-family: 'Jua'; font-size: 1.05rem; cursor: pointer;
                    background: ${currentReportTab === 'doc' ? '#0284c7' : 'transparent'};
                    color: ${currentReportTab === 'doc' ? 'white' : '#0369a1'};
                    box-shadow: ${currentReportTab === 'doc' ? '0 2px 8px rgba(2, 132, 199, 0.3)' : 'none'};
                    transition: all 0.2s;
                ">
                    📑 1. 탐구 요약 노트 (읽기 & 복습)
                </button>
                <button onclick="renderLabReportUI(document.getElementById('overlayInnerBody'), 'quiz')" style="
                    flex: 1; padding: 10px 14px; border-radius: 10px; border: none; font-family: 'Jua'; font-size: 1.05rem; cursor: pointer;
                    background: ${currentReportTab === 'quiz' ? '#0284c7' : 'transparent'};
                    color: ${currentReportTab === 'quiz' ? 'white' : '#0369a1'};
                    box-shadow: ${currentReportTab === 'quiz' ? '0 2px 8px rgba(2, 132, 199, 0.3)' : 'none'};
                    transition: all 0.2s;
                ">
                    ✍️ 2. 실전 탐구 퀴즈 (참여형 문제 풀기)
                </button>
            </div>

            <div id="reportTabContent"></div>
        </div>
    `;

    const tabContent = document.getElementById('reportTabContent');
    if (currentReportTab === 'doc') {
        renderLabReportDoc(tabContent);
    } else {
        currentReportQuizIdx = 0;
        userBlankAnswers = {};
        renderLabReportQuiz(tabContent, 0);
    }
}

// 📑 [탭 1] 완벽 요약 노트
function renderLabReportDoc(container) {
    const data = window.SCIENCE_LAB_REPORT_DATA;
    container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <span style="font-size: 0.92rem; color: #64748b;">교과서 『실험관찰』 12~19쪽 핵심 내용을 한눈에 읽어보세요!</span>
            <button class="back-to-lobby-btn" style="background: #0284c7; color: white; padding: 6px 14px; font-size: 0.9rem;" onclick="renderLabReportUI(document.getElementById('overlayInnerBody'), 'quiz')">
                ✍️ 퀴즈 풀러 가기 ➔
            </button>
        </div>

        <div style="display: flex; flex-direction: column; gap: 16px; max-height: 520px; overflow-y: auto; padding-right: 4px;">
            ${data.summaryDoc.map((item, idx) => `
                <div style="background: white; border-radius: 16px; padding: 16px; border: 2px solid #bae6fd; box-shadow: 0 4px 10px rgba(0,0,0,0.04);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <h4 style="color: #0369a1; font-size: 1.15rem; margin: 0;">${item.title}</h4>
                        <span style="font-size: 0.8rem; background: #e0f2fe; color: #0284c7; padding: 2px 8px; border-radius: 6px;">${item.page}</span>
                    </div>
                    
                    <div style="font-size: 0.9rem; line-height: 1.55; color: #334155; margin-bottom: 8px;">
                        <b>[탐구 과정]</b><br>
                        ${item.process}
                    </div>

                    <div style="background: #f8fafc; padding: 10px 12px; border-radius: 8px; border-left: 4px solid #0284c7; font-size: 0.88rem; line-height: 1.55; color: #1e293b; margin-bottom: 8px;">
                        <b>[관찰 결과]</b><br>
                        ${item.result}
                    </div>

                    <div style="background: #f0fdf4; padding: 8px 12px; border-radius: 8px; font-size: 0.88rem; color: #166534; line-height: 1.5; margin-bottom: 6px;">
                        🎯 <b>결론</b> : ${item.conclusion}
                    </div>

                    <div style="font-size: 0.85rem; color: #d97706; padding-left: 4px;">
                        💡 <b>생각해 볼까요?</b> : ${item.think}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// ✍️ [탭 2] 인터랙티브 참여형 실전 퀴즈
function renderLabReportQuiz(container, qIdx) {
    const data = window.SCIENCE_LAB_REPORT_DATA;
    const q = data.quizItems[qIdx];
    currentReportQuizIdx = qIdx;

    let quizBodyHtml = "";

    // 1) 빈칸 채우기 (q1)
    if (q.type === 'blank') {
        quizBodyHtml = `
            <div style="background: #f8fafc; border-radius: 12px; padding: 14px; margin-bottom: 16px; font-size: 1rem; line-height: 1.8; color: #1e293b;">
                콩, 팥, 조가 섞인 혼합물을 눈이 큰 체에 넣고 흔들었을 때, 체 위에 남는 물질은 
                <span id="blank_1" style="display:inline-block; min-width:80px; padding:2px 10px; background:#e0f2fe; color:#0369a1; border-bottom:2px solid #0284c7; border-radius:6px; font-weight:bold; text-align:center;">
                    ${userBlankAnswers['b1'] || '❓ 선택'}
                </span>이고, 아래로 빠져나간 물질은 
                <span id="blank_2" style="display:inline-block; min-width:80px; padding:2px 10px; background:#e0f2fe; color:#0369a1; border-bottom:2px solid #0284c7; border-radius:6px; font-weight:bold; text-align:center;">
                    ${userBlankAnswers['b2'] || '❓ 선택'}
                </span>입니다. 이 분리 방법은 물질의 
                <span id="blank_3" style="display:inline-block; min-width:80px; padding:2px 10px; background:#e0f2fe; color:#0369a1; border-bottom:2px solid #0284c7; border-radius:6px; font-weight:bold; text-align:center;">
                    ${userBlankAnswers['b3'] || '❓ 선택'}
                </span> 차이를 이용한 것입니다.
            </div>

            <div style="margin-bottom: 12px;">
                <span style="font-size: 0.88rem; color: #64748b;">👇 알맞은 단어 카드를 순서대로 터치하세요:</span>
                <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px;">
                    ${q.options.map(opt => `
                        <button class="quiz-choice-btn" style="padding: 8px 14px; font-size: 0.95rem;" onclick="selectBlankWord('${opt}')">
                            🏷️ ${opt}
                        </button>
                    `).join('')}
                </div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px;">
                <button class="btn-reset" onclick="resetBlankAnswers()">🔄 다시 채우기</button>
                <button class="btn-action-primary" onclick="checkBlankAnswer(${qIdx})">
                    ✅ 정답 확인하기
                </button>
            </div>
        `;
    } 
    // 2) 객관식 4지선다 (q2, q4)
    else if (q.type === 'choice') {
        quizBodyHtml = `
            <div style="color: #1e293b; font-size: 1.15rem; line-height: 1.5; margin-bottom: 16px;">
                ${q.questionText}
            </div>

            <div style="display: flex; flex-direction: column; gap: 10px;">
                ${q.choices.map((choice, idx) => `
                    <button class="quiz-choice-btn" style="padding: 12px 16px; font-size: 0.98rem; text-align: left; justify-content: flex-start; line-height: 1.4;" onclick="submitChoiceQuiz(${qIdx}, ${idx})">
                        <span style="font-weight: bold; color: #0284c7; margin-right: 8px;">${idx + 1}.</span> ${choice}
                    </button>
                `).join('')}
            </div>
        `;
    }
    // 3) 순서 맞추기 (q3)
    else if (q.type === 'order') {
        quizBodyHtml = `
            <div style="color: #1e293b; font-size: 1.1rem; line-height: 1.5; margin-bottom: 14px;">
                ${q.questionText}
            </div>

            <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px;">
                ${q.steps.map(s => `
                    <div style="background: #f0f9ff; padding: 10px 14px; border-radius: 10px; border: 1.5px solid #bae6fd; font-size: 0.95rem; color: #0369a1; display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 1.2rem;">🔹</span> ${s.text}
                    </div>
                `).join('')}
            </div>

            <div style="text-align: center;">
                <button class="btn-action-primary" onclick="passOrderQuiz(${qIdx})">
                    ✅ 순서 확인 완료! 다음 문제로 ➔
                </button>
            </div>
        `;
    }
    // 4) 스스로 평가하기 (q5)
    else if (q.type === 'self_check') {
        quizBodyHtml = `
            <div style="color: #1e293b; font-size: 1.1rem; line-height: 1.5; margin-bottom: 14px;">
                ${q.questionText}
            </div>

            <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px;">
                ${q.checklist.map((item, idx) => `
                    <div style="display: flex; justify-content: space-between; align-items: center; background: #f0fdf4; padding: 12px 16px; border-radius: 12px; border: 1.5px solid #bbf7d0;">
                        <span style="font-size: 0.95rem; color: #166534;">${idx + 1}. ${item}</span>
                        <div style="display: flex; gap: 6px; font-size: 1.4rem; cursor: pointer;">
                            <span onclick="this.style.opacity=1" style="color: #eab308;">⭐</span>
                            <span onclick="this.style.opacity=1" style="color: #eab308;">⭐</span>
                            <span onclick="this.style.opacity=1" style="color: #eab308;">⭐</span>
                        </div>
                    </div>
                `).join('')}
            </div>

            <div style="text-align: center;">
                <button class="btn-action-primary" style="background: #059669; font-size: 1.1rem; padding: 12px 30px;" onclick="finishAllReportQuiz()">
                    🎉 탐구 보고서 마스터 완료! (+5💎)
                </button>
            </div>
        `;
    }

    container.innerHTML = `
        <div style="background: white; border-radius: 18px; padding: 20px; box-shadow: 0 8px 25px rgba(0,0,0,0.06); border: 2px solid #bae6fd;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
                <div style="color: #0369a1; font-size: 1.15rem; font-weight: bold;">
                    ${q.title}
                </div>
                <span style="background: #e0f2fe; color: #0284c7; padding: 3px 10px; border-radius: 8px; font-size: 0.85rem;">
                    문제 ${qIdx + 1} / ${data.quizItems.length}
                </span>
            </div>

            ${quizBodyHtml}
        </div>
    `;
}

function selectBlankWord(word) {
    if (!userBlankAnswers['b1']) {
        userBlankAnswers['b1'] = word;
    } else if (!userBlankAnswers['b2']) {
        userBlankAnswers['b2'] = word;
    } else if (!userBlankAnswers['b3']) {
        userBlankAnswers['b3'] = word;
    }
    const tabContent = document.getElementById('reportTabContent');
    renderLabReportQuiz(tabContent, 0);
}

function resetBlankAnswers() {
    userBlankAnswers = {};
    const tabContent = document.getElementById('reportTabContent');
    renderLabReportQuiz(tabContent, 0);
}

function checkBlankAnswer(qIdx) {
    const isCorrect = (userBlankAnswers['b1'] === "콩과 팥" && userBlankAnswers['b2'] === "조" && userBlankAnswers['b3'] === "알갱이의 크기");
    const container = document.getElementById('reportTabContent');

    if (isCorrect) {
        showQuizFeedback(container, true, "정답입니다! 👏 알갱이 크기 차이로 콩과 팥은 체 위에 남고 조는 빠져나갑니다.", () => {
            renderLabReportQuiz(container, qIdx + 1);
        });
    } else {
        showQuizFeedback(container, false, "앗! 다시 한번 생각해 볼까요? 체 위에 남는 것은 큰 알갱이, 빠져나가는 것은 작은 알갱이입니다.", () => {
            resetBlankAnswers();
        });
    }
}

function submitChoiceQuiz(qIdx, selectedIdx) {
    const data = window.SCIENCE_LAB_REPORT_DATA;
    const q = data.quizItems[qIdx];
    const isCorrect = (selectedIdx === q.answer);
    const container = document.getElementById('reportTabContent');

    if (isCorrect) {
        showQuizFeedback(container, true, `정답입니다! 🎉 ${q.explanation}`, () => {
            renderLabReportQuiz(container, qIdx + 1);
        });
    } else {
        showQuizFeedback(container, false, `오답입니다! 💡 ${q.explanation}`, () => {
            renderLabReportQuiz(container, qIdx);
        });
    }
}

function passOrderQuiz(qIdx) {
    const container = document.getElementById('reportTabContent');
    renderLabReportQuiz(container, qIdx + 1);
}

function showQuizFeedback(container, isSuccess, message, nextCallback) {
    container.innerHTML = `
        <div style="text-align: center; padding: 24px; background: white; border-radius: 18px; border: 3px solid ${isSuccess ? '#10b981' : '#f87171'};">
            <div style="font-size: 3rem; margin-bottom: 8px;">${isSuccess ? '🎉' : '💡'}</div>
            <h3 style="color: ${isSuccess ? '#059669' : '#dc2626'}; font-size: 1.35rem; margin-bottom: 10px;">
                ${isSuccess ? '훌륭해요! 정답입니다!' : '힌트를 확인해 보세요!'}
            </h3>
            <p style="color: #334155; font-size: 0.98rem; line-height: 1.6; margin-bottom: 18px;">
                ${message}
            </p>
            <button class="btn-action-primary" style="background: ${isSuccess ? '#059669' : '#0284c7'};" onclick="(${nextCallback.toString()})()">
                ${isSuccess ? '다음 문제로 ➔' : '🔄 다시 풀기'}
            </button>
        </div>
    `;
}

function finishAllReportQuiz() {
    if (typeof grantRewardGem === 'function') {
        grantRewardGem(5, '실험관찰 탐구 보고서 완벽 마스터');
    }
    const container = document.getElementById('overlayInnerBody');
    container.innerHTML = `
        <div style="text-align: center; padding: 30px; font-family: 'Jua';">
            <div style="font-size: 3.5rem; margin-bottom: 10px;">🌟 📝 💎</div>
            <h2 style="color: #059669; font-size: 1.55rem; margin-bottom: 8px;">『실험관찰』 디지털 탐구 보고서 마스터 완료!</h2>
            <p style="color: #475569; font-size: 1.05rem; margin-bottom: 20px;">
                1단원 혼합물의 분리 핵심 개념과 실험관찰 기록을 완벽하게 학습했습니다! (+5💎)
            </p>
            <button class="back-to-lobby-btn" style="background: #0284c7; color: white;" onclick="closeMissionView(true)">
                과학 대기실로 돌아가기
            </button>
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
    if (typeof finalizeQuizRewardSession === 'function') {
        finalizeQuizRewardSession();
    }
    document.getElementById('missionOverlay').style.display = 'none';
    activeSectionData = [];
    activeQuizIdx = 0;
    stopFairyTTS();
}

function showLoadingSpinner(container) {
    container.innerHTML = `
      <div style="text-align:center; padding:50px 20px; font-family:'Jua', sans-serif;">
        <div style="width:45px; height:45px; border:4px solid #bae6fd; border-top:4px solid #0284c7; border-radius:50%; animation:spin 1s linear infinite; margin:0 auto 15px auto;"></div>
        <p style="font-size:1.15rem; color:#0369a1;">
            🧚‍♀️ 코코 요정이 노션 등대에서 과학 용어들을 챙겨오고 있어요...
        </p>
      </div>
      <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
    `;
}

function getCurriculumUnits() {
    if (typeof window !== 'undefined' && window.SCIENCE_CURRICULUM_DATA && Array.isArray(window.SCIENCE_CURRICULUM_DATA)) {
        return window.SCIENCE_CURRICULUM_DATA;
    }
    return [];
}

function getCurriculumRecords(type) {
    const curriculum = getCurriculumUnits();
    const list = [];
    curriculum.forEach(unit => {
        const items = unit[type] || unit.voca || [];
        items.forEach(item => {
            list.push({
                word: item.word || item.title || "",
                hint: item.hint || getChosung(item.word || item.title || ""),
                detailContext: item.desc || item.meaning || "",
                meaning: item.meaning || item.desc || "",
                imageUrl: item.img || item.image || "",
                grade: unit.grade || "5학년 1학기",
                grades: [unit.grade || "5학년 1학기"],
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
    try {
        let records = [];
        try {
            if (typeof fetchVocaFromNotion === 'function') {
                records = await fetchVocaFromNotion({
                    subject: "과학",
                    areaZone: "용어방",
                    useServerFilter: true,
                    filterByStudent: !isAdmin
                });
            }
        } catch (netErr) {
            console.warn("ℹ️ 노션 통신 대기 -> 표준 과학 데이터셋으로 전환합니다.", netErr);
        }

        if (!records || records.length === 0) {
            records = curriculumRecords;
        } else if (curriculumRecords.length > 0) {
            const existingWords = new Set(records.map(r => r.word));
            const extra = curriculumRecords.filter(r => !existingWords.has(r.word));
            records = [...records, ...extra];
        }

        allFetchedRecords = records;
        
        // 학년/학기 목록 추출 (예: ["5학년 1학기", "5학년 2학기"])
        const uniqueGrades = [...new Set(records.flatMap(r => r.grades || [r.grade]))].filter(g => g && g !== "공통").sort();

        if (uniqueGrades.length === 0) {
            startScienceMissionWithFilteredData(records, innerBody, "과학 탐구");
        } else {
            renderScienceGradeUI(uniqueGrades, innerBody);
        }
    } catch(e) {
        console.warn("데이터 로딩 예외 -> 교과서 데이터셋 구동", e);
        allFetchedRecords = curriculumRecords;
        const uniqueGrades = [...new Set(curriculumRecords.map(r => r.grade))].filter(Boolean).sort();
        renderScienceGradeUI(uniqueGrades, innerBody);
    }
}

function renderScienceGradeUI(grades, container) {
    speakFairyTTS("공부할 학년과 학기를 골라보세요! 🧚‍♀️");
    
    container.innerHTML = `
        <div style="text-align:center; padding:15px 10px; font-family:'Jua'; width:100%; max-width:540px; margin:0 auto;">
            <div style="font-size:2.5rem; margin-bottom:6px;">🎒</div>
            <h3 style="margin-bottom:6px; color:var(--primary); font-size:1.6rem;">1. 학년 & 학기 고르기</h3>
            <p style="color:var(--text-muted); margin-bottom:20px; font-size:0.95rem;">탐구하고 싶은 교과서 학기와 단원을 선택해 보세요!</p>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:14px;">
                ${grades.map(g => `
                    <button class="quiz-choice-btn" style="
                        padding:18px 14px; font-size:1.2rem; text-align:center; justify-content:center;
                        border-radius:14px; background:linear-gradient(180deg, #ffffff 0%, #f0f9ff 100%);
                        border:2px solid #38bdf8;
                    " onclick="selectScienceGrade('${g}')">
                        📖 ${g}
                    </button>
                `).join('')}
            </div>

            <button class="quiz-choice-btn" style="
                background:#f1f5f9; width:100%; text-align:center; justify-content:center;
                padding:12px; font-size:1.05rem; border-radius:12px;
            " onclick="selectScienceGrade('ALL')">
                🌟 전체 학년·학기 종합 탐구 (모아보기)
            </button>
        </div>
    `;
}

function selectScienceGrade(grade) {
    selectedScienceGrade = grade;
    const innerBody = document.getElementById('overlayInnerBody');

    let matchedRecords = [];
    if (grade === 'ALL') {
        matchedRecords = allFetchedRecords;
    } else {
        matchedRecords = allFetchedRecords.filter(r => r.grade === grade || (r.grades && r.grades.includes(grade)));
    }

    // 💡 단원 목록 추출
    const uniqueUnits = [...new Set(matchedRecords.map(r => String(r.level || r.stage || '').trim()))].filter(u => u && u !== "기본 단원").sort();

    // 단원이 1개이든 여러 개이든 무조건 2단계 단원 선택 UI를 거치도록 보장!
    renderScienceUnitUI(uniqueUnits, innerBody, matchedRecords, grade);
}

function renderScienceUnitUI(units, container, matchedRecords, grade) {
    speakFairyTTS("공부할 과학 단원을 골라보세요!");
    
    // 각 단원별 단어 개수 계산
    const unitCountMap = {};
    units.forEach(u => {
        unitCountMap[u] = matchedRecords.filter(r => String(r.level || r.stage || '').trim() === u).length;
    });

    container.innerHTML = `
        <div style="text-align:center; padding:15px 10px; font-family:'Jua'; width:100%; max-width:620px; margin:0 auto;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                <button class="back-to-lobby-btn" style="padding:6px 14px; font-size:0.9rem;" onclick="renderScienceGradeUI(['5학년 1학기', '5학년 2학기'], document.getElementById('overlayInnerBody'))">
                    🔙 학년 다시 고르기
                </button>
                <span style="font-size:1.05rem; color:#0284c7; font-weight:bold; background:#e0f2fe; padding:4px 12px; border-radius:8px;">
                    📖 ${grade === 'ALL' ? '전체 학년·학기' : grade}
                </span>
            </div>

            <h3 style="margin-bottom:6px; color:var(--primary); font-size:1.55rem;">📚 2. 탐구할 단원 고르기</h3>
            <p style="color:var(--text-muted); margin-bottom:18px; font-size:0.95rem;">원하는 단원을 선택해 교과서 핵심 용어를 정복해 보세요!</p>

            <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:16px;">
                ${units.map(u => `
                    <button class="quiz-choice-btn" style="
                        padding:14px 18px; font-size:1.1rem; text-align:left; justify-content:space-between;
                        border-radius:14px; border:2px solid #bae6fd; background:linear-gradient(180deg, #ffffff 0%, #f0f9ff 100%);
                    " onclick="selectScienceUnit('${u}', '${grade}')">
                        <span style="display:flex; align-items:center; gap:8px;">
                            🔬 <b>${u}</b>
                        </span>
                        <span style="font-size:0.85rem; background:#0284c7; color:white; padding:3px 10px; border-radius:10px; font-weight:normal;">
                            ${unitCountMap[u] || 0}개 용어
                        </span>
                    </button>
                `).join('')}
            </div>

            <button class="quiz-choice-btn" style="
                background:#f1f5f9; width:100%; text-align:center; justify-content:center;
                padding:12px; font-size:1.05rem; border-radius:12px;
            " onclick="selectScienceUnit('ALL', '${grade}')">
                🌟 [${grade === 'ALL' ? '전체' : grade}] 모든 단원 모아보기 (${matchedRecords.length}개 용어)
            </button>
        </div>
    `;
}

function selectScienceUnit(unitName, grade) {
    selectedScienceUnit = unitName;
    const innerBody = document.getElementById('overlayInnerBody');

    let matchedRecords = [];
    if (grade === 'ALL') {
        matchedRecords = allFetchedRecords;
    } else {
        matchedRecords = allFetchedRecords.filter(r => r.grade === grade || (r.grades && r.grades.includes(grade)));
    }

    if (unitName !== 'ALL') {
        matchedRecords = matchedRecords.filter(r => String(r.level || r.stage || '').trim() === unitName);
    }

    startScienceMissionWithFilteredData(matchedRecords, innerBody, `${grade} - ${unitName === 'ALL' ? '전체 종합' : unitName}`);
}

function startScienceMissionWithFilteredData(records, container, titleStr) {
    let items = [...records];
    if (scienceVocaOrderType === 'shuffle') {
        items.sort(() => Math.random() - 0.5);
    }

    activeSectionData = items;
    activeQuizIdx = 0;

    if (titleStr) {
        document.getElementById('overlayHeaderTitle').textContent = `${SCIENCE_MISSION_META[currentMissionType].title} [${titleStr}]`;
    }

    renderSectionUI(currentMissionType, container);
}

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
        speakFairyTTS("정답이야! 아주 잘했어!");
        alert("🎉 정답입니다!");
        skipToNextScienceQuiz();
    } else {
        if (typeof playSoundEffect === 'function') playSoundEffect('wrong');
        speakFairyTTS("다시 한번 관찰해 봐!");
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
        speakFairyTTS("정답이야! 잘했어!");
        alert(`🎉 정답! [${currentItem.word}] 맞습니다!`);
        skipToNextScienceQuiz();
    } else {
        if (typeof playSoundEffect === 'function') playSoundEffect('wrong');
        speakFairyTTS("힌트를 보고 다시 맞춰봐!");
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
