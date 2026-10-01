// kids/js/science_report.js
// 📝 [4단계] 『실험관찰』 디지털 탐구 보고서 & 퀴즈 전담 엔진 (골디락스 모듈)
// - 전사 거버넌스 헌법(규칙 7조) 준수: 적정 응집도, IIFE 캡슐화, 하위 호환성 100% 보존
// - 따옴표 구문 파괴 방지: 인라인 직렬화 대신 네임스페이스 콜백 레지스트리 패턴 적용

(function() {
    'use strict';

    let currentReportTab = 'doc'; // 'doc' | 'quiz'
    let currentReportQuizIdx = 0;
    let currentReportUnitId = 1; // 1: 1단원 혼합물, 2: 2단원 날씨
    let userBlankAnswers = {};
    let pendingFeedbackCallback = null;

    function getActiveReportData() {
        if (currentReportUnitId === 2) {
            return window.SCIENCE_LAB_REPORT_2_DATA || window.SCIENCE_LAB_REPORT_DATA;
        }
        return window.SCIENCE_LAB_REPORT_DATA;
    }

    function openScienceReport(unitId = 1) {
        currentReportUnitId = unitId;
        if (typeof window.openMissionView === 'function') {
            window.openMissionView('report');
        }
    }

    function openScienceReport2() {
        openScienceReport(2);
    }

    function renderLabReportUI(container, tabName, unitId) {
        if (!container) container = document.getElementById('overlayInnerBody');
        if (!container) return;

        if (typeof unitId !== 'undefined') currentReportUnitId = unitId;
        if (tabName) currentReportTab = tabName;
        const data = getActiveReportData();
        if (!data) return;

        // 헤더 타이틀 및 아이콘 실시간 갱신
        const titleEl = document.getElementById('overlayHeaderTitle');
        const iconEl = document.getElementById('overlayHeaderIcon');
        if (titleEl) titleEl.textContent = data.title;
        if (iconEl) iconEl.textContent = currentReportUnitId === 2 ? "🌤️" : "📝";

        const unitThemeColor = currentReportUnitId === 2 ? '#d97706' : '#0284c7';
        const unitBgColor = currentReportUnitId === 2 ? '#fef3c7' : '#e0f2fe';
        const unitTextColor = currentReportUnitId === 2 ? '#b45309' : '#0369a1';

        container.innerHTML = `
            <div style="max-width: 780px; margin: 0 auto; padding: 6px 12px; font-family: 'Jua', sans-serif;">
                
                <!-- 단원 배지 -->
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <span style="background: ${unitBgColor}; color: ${unitTextColor}; padding: 4px 12px; border-radius: 8px; font-size: 0.92rem; font-weight: bold;">
                        ${data.unit}
                    </span>
                    <span style="font-size: 0.85rem; color: #64748b;">
                        ${currentReportUnitId === 2 ? '🌤️ 교과서 24~35쪽 탐구 일지' : '🧪 교과서 12~19쪽 탐구 일지'}
                    </span>
                </div>

                <!-- 상단 2단계 모드 전환 탭 -->
                <div style="display: flex; gap: 8px; margin-bottom: 16px; background: ${unitBgColor}; padding: 6px; border-radius: 14px;">
                    <button onclick="ScienceReport.renderUI(document.getElementById('overlayInnerBody'), 'doc')" style="
                        flex: 1; padding: 10px 14px; border-radius: 10px; border: none; font-family: 'Jua'; font-size: 1.05rem; cursor: pointer;
                        background: ${currentReportTab === 'doc' ? unitThemeColor : 'transparent'};
                        color: ${currentReportTab === 'doc' ? 'white' : unitTextColor};
                        box-shadow: ${currentReportTab === 'doc' ? '0 2px 8px rgba(0,0,0,0.15)' : 'none'};
                        transition: all 0.2s;
                    ">
                        📑 1. 탐구 요약 노트 (읽기 & 복습)
                    </button>
                    <button onclick="ScienceReport.renderUI(document.getElementById('overlayInnerBody'), 'quiz')" style="
                        flex: 1; padding: 10px 14px; border-radius: 10px; border: none; font-family: 'Jua'; font-size: 1.05rem; cursor: pointer;
                        background: ${currentReportTab === 'quiz' ? unitThemeColor : 'transparent'};
                        color: ${currentReportTab === 'quiz' ? 'white' : unitTextColor};
                        box-shadow: ${currentReportTab === 'quiz' ? '0 2px 8px rgba(0,0,0,0.15)' : 'none'};
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
        const data = getActiveReportData();
        if (!data) return;
        const btnColor = currentReportUnitId === 2 ? '#d97706' : '#0284c7';
        const borderColor = currentReportUnitId === 2 ? '#fde68a' : '#bae6fd';
        const tagBg = currentReportUnitId === 2 ? '#fef3c7' : '#e0f2fe';
        const tagColor = currentReportUnitId === 2 ? '#b45309' : '#0284c7';
        const pageGuide = currentReportUnitId === 2 ? '교과서 『실험관찰』 24~35쪽 날씨 탐구 핵심 내용을 한눈에 읽어보세요!' : '교과서 『실험관찰』 12~19쪽 핵심 내용을 한눈에 읽어보세요!';

        container.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
                <span style="font-size: 0.92rem; color: #64748b;">${pageGuide}</span>
                <button class="back-to-lobby-btn" style="background: ${btnColor}; color: white; padding: 6px 14px; font-size: 0.9rem;" onclick="ScienceReport.renderUI(document.getElementById('overlayInnerBody'), 'quiz')">
                    ✍️ 퀴즈 풀러 가기 ➔
                </button>
            </div>

            <div style="display: flex; flex-direction: column; gap: 16px; max-height: 520px; overflow-y: auto; padding-right: 4px;">
                ${data.summaryDoc.map(item => `
                    <div style="background: white; border-radius: 16px; padding: 16px; border: 2px solid ${borderColor}; box-shadow: 0 4px 10px rgba(0,0,0,0.04);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <h4 style="color: ${tagColor}; font-size: 1.15rem; margin: 0;">${item.title}</h4>
                            <span style="font-size: 0.8rem; background: ${tagBg}; color: ${tagColor}; padding: 2px 8px; border-radius: 6px;">${item.page}</span>
                        </div>
                        
                        <div style="font-size: 0.9rem; line-height: 1.55; color: #334155; margin-bottom: 8px;">
                            <b>[탐구 과정]</b><br>
                            ${item.process}
                        </div>

                        <div style="background: #f8fafc; padding: 10px 12px; border-radius: 8px; border-left: 4px solid ${tagColor}; font-size: 0.88rem; line-height: 1.55; color: #1e293b; margin-bottom: 8px;">
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
        const data = getActiveReportData();
        if (!data || !data.quizItems || !data.quizItems[qIdx]) return;
        const q = data.quizItems[qIdx];
        currentReportQuizIdx = qIdx;

        const themeColor = currentReportUnitId === 2 ? '#d97706' : '#0284c7';
        const borderColor = currentReportUnitId === 2 ? '#fde68a' : '#bae6fd';
        const tagBg = currentReportUnitId === 2 ? '#fef3c7' : '#e0f2fe';

        let quizBodyHtml = "";

        // 1) 빈칸 채우기 (q1)
        if (q.type === 'blank') {
            let questionRenderText = "";
            if (currentReportUnitId === 2) {
                questionRenderText = `
                    공기가 건조할수록 습구 온도계의 젖은 헝겊에서 물이 활발하게 
                    <span id="blank_1" style="display:inline-block; min-width:80px; padding:2px 10px; background:#fef3c7; color:#b45309; border-bottom:2px solid #d97706; border-radius:6px; font-weight:bold; text-align:center;">
                        ${userBlankAnswers['b1'] || '❓ 선택'}
                    </span>하면서 주변의 열을 빼앗아갑니다. 따라서 건구 온도와 습구 온도의 차이가 
                    <span id="blank_2" style="display:inline-block; min-width:80px; padding:2px 10px; background:#fef3c7; color:#b45309; border-bottom:2px solid #d97706; border-radius:6px; font-weight:bold; text-align:center;">
                        ${userBlankAnswers['b2'] || '❓ 선택'}
                    </span>. 이 온도 차이를 이용해 현재 공기 중의 
                    <span id="blank_3" style="display:inline-block; min-width:80px; padding:2px 10px; background:#fef3c7; color:#b45309; border-bottom:2px solid #d97706; border-radius:6px; font-weight:bold; text-align:center;">
                        ${userBlankAnswers['b3'] || '❓ 선택'}
                    </span>를 측정합니다.
                `;
            } else {
                questionRenderText = `
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
                `;
            }

            quizBodyHtml = `
                <div style="background: #f8fafc; border-radius: 12px; padding: 14px; margin-bottom: 16px; font-size: 1rem; line-height: 1.8; color: #1e293b;">
                    ${questionRenderText}
                </div>

                <div style="margin-bottom: 12px;">
                    <span style="font-size: 0.88rem; color: #64748b;">👇 알맞은 단어 카드를 순서대로 터치하세요:</span>
                    <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px;">
                        ${q.options.map(opt => `
                            <button class="quiz-choice-btn" style="padding: 8px 14px; font-size: 0.95rem;" onclick="ScienceReport.selectBlankWord('${opt}')">
                                🏷️ ${opt}
                            </button>
                        `).join('')}
                    </div>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px;">
                    <button class="btn-reset" onclick="ScienceReport.resetBlankAnswers()">🔄 다시 채우기</button>
                    <button class="btn-action-primary" style="background: ${themeColor};" onclick="ScienceReport.checkBlankAnswer(${qIdx})">
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
                        <button class="quiz-choice-btn" style="padding: 12px 16px; font-size: 0.98rem; text-align: left; justify-content: flex-start; line-height: 1.4;" onclick="ScienceReport.submitChoiceQuiz(${qIdx}, ${idx})">
                            <span style="font-weight: bold; color: ${themeColor}; margin-right: 8px;">${idx + 1}.</span> ${choice}
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
                        <div style="background: ${tagBg}; padding: 10px 14px; border-radius: 10px; border: 1.5px solid ${borderColor}; font-size: 0.95rem; color: ${themeColor}; display: flex; align-items: center; gap: 8px;">
                            <span style="font-size: 1.2rem;">🔹</span> ${s.text}
                        </div>
                    `).join('')}
                </div>

                <div style="text-align: center;">
                    <button class="btn-action-primary" style="background: ${themeColor};" onclick="ScienceReport.passOrderQuiz(${qIdx})">
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
                    <button class="btn-action-primary" style="background: #059669; font-size: 1.1rem; padding: 12px 30px;" onclick="ScienceReport.finishAllQuiz()">
                        🎉 탐구 보고서 마스터 완료! (+5💎)
                    </button>
                </div>
            `;
        }

        container.innerHTML = `
            <div style="background: white; border-radius: 18px; padding: 20px; box-shadow: 0 8px 25px rgba(0,0,0,0.06); border: 2px solid ${borderColor};">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
                    <div style="color: ${themeColor}; font-size: 1.15rem; font-weight: bold;">
                        ${q.title}
                    </div>
                    <span style="background: ${tagBg}; color: ${themeColor}; padding: 3px 10px; border-radius: 8px; font-size: 0.85rem;">
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
        renderLabReportQuiz(tabContent, currentReportQuizIdx);
    }

    function resetBlankAnswers() {
        userBlankAnswers = {};
        const tabContent = document.getElementById('reportTabContent');
        renderLabReportQuiz(tabContent, currentReportQuizIdx);
    }

    function checkBlankAnswer(qIdx) {
        const data = getActiveReportData();
        const q = data.quizItems[qIdx];
        
        let isCorrect = false;
        if (currentReportUnitId === 2) {
            isCorrect = (userBlankAnswers['b1'] === "증발" && userBlankAnswers['b2'] === "커집니다" && userBlankAnswers['b3'] === "습도");
        } else {
            isCorrect = (userBlankAnswers['b1'] === "콩과 팥" && userBlankAnswers['b2'] === "조" && userBlankAnswers['b3'] === "알갱이의 크기");
        }

        const container = document.getElementById('reportTabContent');

        if (isCorrect) {
            showQuizFeedback(container, true, `정답입니다! 👏 ${q.explanation}`, () => {
                renderLabReportQuiz(container, qIdx + 1);
            });
        } else {
            const hintMsg = currentReportUnitId === 2
                ? "앗! 다시 한번 생각해 볼까요? 건조할수록 물이 활발하게 [증발]하여 열을 빼앗기 때문에 온도 차이가 [커집니다]."
                : "앗! 다시 한번 생각해 볼까요? 체 위에 남는 것은 큰 알갱이, 빠져나가는 것은 작은 알갱이입니다.";
            showQuizFeedback(container, false, hintMsg, () => {
                resetBlankAnswers();
            });
        }
    }

    function submitChoiceQuiz(qIdx, selectedIdx) {
        const data = getActiveReportData();
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

    // 💡 피드백 콜백 안전 레지스트리 (따옴표 구문 파괴 원천 방지)
    function showQuizFeedback(container, isSuccess, message, nextCallback) {
        pendingFeedbackCallback = nextCallback;
        const okColor = isSuccess ? '#059669' : (currentReportUnitId === 2 ? '#d97706' : '#0284c7');
        container.innerHTML = `
            <div style="text-align: center; padding: 24px; background: white; border-radius: 18px; border: 3px solid ${isSuccess ? '#10b981' : '#f87171'};">
                <div style="font-size: 3rem; margin-bottom: 8px;">${isSuccess ? '🎉' : '💡'}</div>
                <h3 style="color: ${isSuccess ? '#059669' : '#dc2626'}; font-size: 1.35rem; margin-bottom: 10px;">
                    ${isSuccess ? '훌륭해요! 정답입니다!' : '힌트를 확인해 보세요!'}
                </h3>
                <p style="color: #334155; font-size: 0.98rem; line-height: 1.6; margin-bottom: 18px;">
                    ${message}
                </p>
                <button class="btn-action-primary" style="background: ${okColor};" onclick="ScienceReport.triggerFeedbackNext()">
                    ${isSuccess ? '다음 문제로 ➔' : '🔄 다시 풀기'}
                </button>
            </div>
        `;
    }

    function triggerFeedbackNext() {
        if (typeof pendingFeedbackCallback === 'function') {
            const cb = pendingFeedbackCallback;
            pendingFeedbackCallback = null;
            cb();
        }
    }

    function finishAllReportQuiz() {
        if (typeof grantRewardGem === 'function') {
            const rewardMsg = currentReportUnitId === 2 
                ? '2단원 날씨와 우리 생활 실험관찰 탐구 보고서 완벽 마스터' 
                : '1단원 혼합물의 분리 실험관찰 탐구 보고서 완벽 마스터';
            grantRewardGem(5, rewardMsg);
        }
        const container = document.getElementById('overlayInnerBody');
        const unitTitle = currentReportUnitId === 2 ? '2단원 날씨와 우리 생활' : '1단원 혼합물의 분리';
        const iconStr = currentReportUnitId === 2 ? '🌤️ 📝 💎' : '🌟 📝 💎';
        const unitDesc = currentReportUnitId === 2 
            ? '습도계 측정, 이슬과 안개, 구름 발생, 바람, 사계절 기단 탐구 기록을 완벽하게 마스터했습니다! (+5💎)'
            : '1단원 혼합물의 분리 핵심 개념과 실험관찰 기록을 완벽하게 학습했습니다! (+5💎)';

        container.innerHTML = `
            <div style="text-align: center; padding: 30px; font-family: 'Jua';">
                <div style="font-size: 3.5rem; margin-bottom: 10px;">${iconStr}</div>
                <h2 style="color: #059669; font-size: 1.55rem; margin-bottom: 8px;">『실험관찰』 디지털 탐구 보고서 마스터 완료!</h2>
                <h3 style="color: #0284c7; font-size: 1.25rem; margin-bottom: 8px;">[${unitTitle}]</h3>
                <p style="color: #475569; font-size: 1.05rem; margin-bottom: 20px;">
                    ${unitDesc}
                </p>
                <button class="back-to-lobby-btn" style="background: #0284c7; color: white;" onclick="if(typeof closeMissionView==='function') closeMissionView(true)">
                    과학 대기실로 돌아가기
                </button>
            </div>
        `;
    }

    // 🌟 네임스페이스 공개
    window.ScienceReport = {
        open: openScienceReport,
        openUnit2: openScienceReport2,
        renderUI: renderLabReportUI,
        renderDoc: renderLabReportDoc,
        renderQuiz: renderLabReportQuiz,
        selectBlankWord,
        resetBlankAnswers,
        checkBlankAnswer,
        submitChoiceQuiz,
        passOrderQuiz,
        triggerFeedbackNext,
        finishAllQuiz: finishAllReportQuiz
    };

    // 🌐 하위 호환성 전역 브리지
    window.openScienceReport = openScienceReport;
    window.openScienceReport2 = openScienceReport2;
    window.renderLabReportUI = renderLabReportUI;
    window.renderLabReportDoc = renderLabReportDoc;
    window.renderLabReportQuiz = renderLabReportQuiz;
    window.selectBlankWord = selectBlankWord;
    window.resetBlankAnswers = resetBlankAnswers;
    window.checkBlankAnswer = checkBlankAnswer;
    window.submitChoiceQuiz = submitChoiceQuiz;
    window.passOrderQuiz = passOrderQuiz;
    window.finishAllReportQuiz = finishAllReportQuiz;

})();
