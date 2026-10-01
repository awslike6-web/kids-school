// kids/js/science_safety.js
// 🥽 [0단계] 실험실 안전 라이선스 시험장 & 골드 연구원증 발급 전담 엔진 (골디락스 모듈)
// - 전사 거버넌스 헌법(규칙 7조) 준수: 적정 응집도, IIFE 캡슐화, 하위 호환성 100% 보존

(function() {
    'use strict';

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
        if (!data || !data.questions || !data.questions[qIdx]) return;

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
                        📌 [${q.category || '안전 수칙'}]
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
                            " onclick="ScienceSafety.submitAnswer(${qIdx}, ${idx})">
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
        if (!data || !data.questions || !data.questions[qIdx]) return;

        const q = data.questions[qIdx];
        const isCorrect = (selectedIdx === q.answer);
        const container = document.getElementById('overlayInnerBody');
        if (!container) return;

        if (!isCorrect) {
            container.innerHTML = `
                <div style="max-width: 550px; margin: 30px auto; padding: 24px; text-align: center; background: white; border-radius: 20px; box-shadow: 0 15px 35px rgba(0,0,0,0.15); border: 3px solid #f87171; font-family: 'Jua', sans-serif;">
                    <div style="font-size: 3.5rem; margin-bottom: 10px;">⚠️</div>
                    <h3 style="color: #dc2626; font-size: 1.4rem; margin-bottom: 8px;">앗! 안전 수칙을 다시 확인해 볼까요?</h3>
                    <p style="color: #475569; font-size: 1rem; line-height: 1.6; margin-bottom: 16px;">
                        ${q.explanation || '안전 수칙을 다시 확인해 보세요.'}
                    </p>
                    <button class="btn-action-primary" style="background: #059669;" onclick="ScienceSafety.renderQuestion(document.getElementById('overlayInnerBody'), ${qIdx})">
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
        const studentName = (typeof currentUserName !== 'undefined' ? currentUserName : (localStorage.getItem('currentUserName') || '민수'));
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
                    <button class="back-to-lobby-btn" style="background: #0284c7; color: white;" onclick="if(typeof openMissionView==='function') openMissionView('lab');">
                        🧪 가상 실험실로 이동하기
                    </button>
                    <button class="back-to-lobby-btn" onclick="if(typeof closeMissionView==='function') closeMissionView(true);">
                        닫기
                    </button>
                </div>
            </div>
        `;
    }

    // 🌟 네임스페이스 공개
    window.ScienceSafety = {
        renderUI: renderSafetyLicenseUI,
        renderQuestion: renderSafetyQuestion,
        submitAnswer: submitSafetyAnswer,
        renderGoldCard: renderGoldLicenseCard
    };

    // 🌐 하위 호환성 전역 브리지
    window.renderSafetyLicenseUI = renderSafetyLicenseUI;
    window.renderSafetyQuestion = renderSafetyQuestion;
    window.submitSafetyAnswer = submitSafetyAnswer;
    window.renderGoldLicenseCard = renderGoldLicenseCard;

})();
