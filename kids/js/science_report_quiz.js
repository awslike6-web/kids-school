// kids/js/science_report_quiz.js
// 📝 [4단계] 『실험관찰』 탐구 보고서의 실전 퀴즈 — 빈칸 채우기·객관식·실험 순서 조립·별점 체크리스트·완료 보상
// - 2026-11-28 리팩토링 묶음 D3: science_report.js(784줄)에서 퀴즈 구역을 그대로 옮겼다.
//   진행 상태(S)와 보고서 도우미는 science_report.js가 ScienceReport._state·_helpers로 내놓는다 → 그 파일 다음에 싣는다.

(function() {
    'use strict';

    const R = window.ScienceReport;
    if (!R || !R._state || !R._helpers) throw new Error('[ScienceReport] science_report.js를 science_report_quiz.js보다 먼저 실어야 합니다');
    const S = R._state;
    const { getArrangedItems, getActiveReportData, getUnitTheme, renderEquilibriumGraphSvg } = R._helpers;

    // 🔊 채점 소리 — 정답 fairyPraise, 오답 fairyEncourage, 완주 fairyReward (헌법 §6 3단계, 2026-11-28 추가: 그전엔 소리가 없었음)
    function playQuizSound(name) {
        const fn = window[name];
        if (typeof fn !== 'function') return;
        try { fn(); } catch (e) { console.warn(`[ScienceReport] ${name} 실패`, e); }
    }

    function renderLabReportQuiz(container, qIdx) {
        const data = getActiveReportData();
        if (!data || !data.quizItems || !data.quizItems[qIdx]) return;
        const q = data.quizItems[qIdx];
        S.currentReportQuizIdx = qIdx;

        const th = getUnitTheme(data);
        const themeColor = th.color;
        const borderColor = th.border;
        const tagBg = th.bg;
        const textColor = th.text;

        let quizBodyHtml = "";

        // 1) 서술형 문장 조립 빌더 & 빈칸 채우기 (type === 'blank')
        if (q.type === 'blank') {
            const renderSlot = (blankId, idx) => {
                const filled = S.userBlankAnswers[blankId];
                return `<span onclick="ScienceReport.clearBlankSlot('${blankId}')" title="클릭하면 비웁니다" style="display:inline-block; min-width:84px; padding:2px 10px; margin:2px 3px; background:${filled ? themeColor : tagBg}; color:${filled ? 'white' : textColor}; border:1.5px solid ${themeColor}; border-radius:8px; font-weight:bold; text-align:center; cursor:pointer;">${filled || `❓ 빈칸 ${idx + 1}`}</span>`;
            };

            let questionRenderText = "";
            if (q.templateHtml && Array.isArray(q.blanks)) {
                questionRenderText = q.templateHtml;
                q.blanks.forEach((b, idx) => {
                    questionRenderText = questionRenderText.replace(`{${b.id}}`, renderSlot(b.id, idx));
                });
            } else if (S.currentReportUnitId === 2) {
                questionRenderText = `
                    공기가 건조할수록 습구 온도계의 젖은 헝겊에서 물이 활발하게 ${renderSlot('b1', 0)}하면서 주변의 열을 빼앗아갑니다. 따라서 건구 온도와 습구 온도의 차이가 ${renderSlot('b2', 1)}. 이 온도 차이를 이용해 현재 공기 중의 ${renderSlot('b3', 2)}를 측정합니다.
                `;
            } else {
                questionRenderText = `
                    콩, 팥, 조가 섞인 혼합물을 눈이 큰 체에 넣고 흔들었을 때, 체 위에 남는 물질은 ${renderSlot('b1', 0)}이고, 아래로 빠져나간 물질은 ${renderSlot('b2', 1)}입니다. 이 분리 방법은 물질의 ${renderSlot('b3', 2)} 차이를 이용한 것입니다.
                `;
            }

            const rubricHtml = Array.isArray(q.rubric) ? `
                <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 8px 12px; margin-bottom: 10px; font-size: 0.82rem; color: #92400e;">
                    <div style="font-weight: bold; margin-bottom: 3px;">📋 서술형 채점 기준 가이드 (터치해서 문장을 완성해 보세요!)</div>
                    ${q.rubric.map(r => `<div>• ${r}</div>`).join('')}
                </div>
            ` : '';

            quizBodyHtml = `
                ${q.questionText ? `<div style="color: #334155; font-size: 0.96rem; line-height: 1.5; margin-bottom: 8px;">${q.questionText}</div>` : ''}
                ${q.hasEquilibriumGraph ? renderEquilibriumGraphSvg(true) : ''}
                ${q.diagramHtml ? q.diagramHtml : ''}
                ${rubricHtml}
                <div style="background: #f8fafc; border-radius: 12px; padding: 14px; margin-bottom: 14px; font-size: 0.98rem; line-height: 1.85; color: #1e293b; border: 1.5px solid #e2e8f0;">
                    ${questionRenderText}
                </div>

                <div style="margin-bottom: 12px;">
                    <span style="font-size: 0.86rem; color: #64748b;">👇 알맞은 과학 구절 카드를 터치하세요 (채운 빈칸을 다시 누르면 취소됩니다):</span>
                    <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px;">
                        ${getArrangedItems(`${S.currentReportUnitId}_${qIdx}_blank`, q.options).map(c => `
                            <button class="quiz-choice-btn" data-choice-index="${c.index}" style="padding: 8px 14px; font-size: 0.93rem;" onclick="ScienceReport.selectBlankWordByIdx(${qIdx}, ${c.index})">
                                🏷️ ${c.text}
                            </button>
                        `).join('')}
                    </div>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 14px;">
                    <button class="btn-reset" onclick="ScienceReport.resetBlankAnswers()">🔄 처음부터 다시 채우기</button>
                    <button class="btn-action-primary" style="background: ${themeColor};" onclick="ScienceReport.checkBlankAnswer(${qIdx})">
                        ✅ 서술형 답안 채점하기
                    </button>
                </div>
            `;
        }
        // 2) 객관식 4지선다 (type === 'choice')
        else if (q.type === 'choice') {
            const choiceOrder = getArrangedItems(`${S.currentReportUnitId}_${qIdx}_choice`, q.choices);
            quizBodyHtml = `
                <div style="color: #1e293b; font-size: 1.08rem; line-height: 1.55; margin-bottom: 16px;">
                    ${q.questionText}
                </div>

                <div style="display: flex; flex-direction: column; gap: 10px;">
                    ${choiceOrder.map((c, pos) => `
                        <button class="quiz-choice-btn" data-choice-index="${c.index}" style="padding: 12px 16px; font-size: 0.95rem; text-align: left; justify-content: flex-start; line-height: 1.45;" onclick="ScienceReport.submitChoiceQuiz(${qIdx}, ${c.index})">
                            <span style="font-weight: bold; color: ${themeColor}; margin-right: 8px;">${pos + 1}.</span> ${c.text}
                        </button>
                    `).join('')}
                </div>
            `;
        }
        // 3) 참여형 실험 순서 직접 배열하기 (type === 'order')
        else if (q.type === 'order') {
            const quizKey = `${S.currentReportUnitId}_${qIdx}`;
            if (S.lastOrderQuizKey !== quizKey) {
                S.lastOrderQuizKey = quizKey;
                S.userOrderPicks = [];
                // 항상 섞인 순서로 제시 (역순/교차 배치)
                S.shuffledOrderPool = [...q.steps].sort((a, b) => (b.id % 2) - (a.id % 2) || b.id - a.id);
            }
            const remainingSteps = S.shuffledOrderPool.filter(s => !S.userOrderPicks.some(p => p.id === s.id));

            quizBodyHtml = `
                <div style="color: #1e293b; font-size: 1.02rem; line-height: 1.5; margin-bottom: 12px;">
                    ${q.questionText}
                </div>

                <!-- 조립된 순서 슬롯 -->
                <div style="background: #f8fafc; border-radius: 12px; padding: 12px; border: 1.5px solid ${borderColor}; margin-bottom: 12px;">
                    <div style="font-size: 0.85rem; color: ${textColor}; font-weight: bold; margin-bottom: 8px;">
                        📋 내가 조립한 실험 순서 (${S.userOrderPicks.length} / ${q.steps.length}단계 완료 · 카드를 누르면 취소)
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 6px;">
                        ${q.steps.map((_, slotIdx) => {
                            const picked = S.userOrderPicks[slotIdx];
                            return picked ? `
                                <div onclick="ScienceReport.removeOrderStep(${slotIdx})" style="background: ${tagBg}; padding: 9px 12px; border-radius: 9px; border: 1.5px solid ${themeColor}; font-size: 0.92rem; color: #1e293b; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
                                    <span><b style="color:${themeColor};">[${slotIdx + 1}단계]</b> ${picked.text}</span>
                                    <span style="font-size: 0.78rem; color: #dc2626; margin-left: 8px;">✖ 취소</span>
                                </div>
                            ` : `
                                <div style="background: white; padding: 8px 12px; border-radius: 9px; border: 1.5px dashed #cbd5e1; font-size: 0.88rem; color: #94a3b8;">
                                    [${slotIdx + 1}단계] 아래 보기에서 ${slotIdx + 1}번째로 수행할 실험 과정을 터치하세요
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>

                <!-- 남은 보기 카드 -->
                ${remainingSteps.length > 0 ? `
                    <div style="margin-bottom: 14px;">
                        <div style="font-size: 0.85rem; color: #64748b; margin-bottom: 6px;">👇 섞여 있는 실험 과정 카드 (순서대로 터치하세요):</div>
                        <div style="display: flex; flex-direction: column; gap: 8px;">
                            ${remainingSteps.map(s => `
                                <button class="quiz-choice-btn" style="padding: 10px 14px; font-size: 0.92rem; text-align: left; justify-content: flex-start; line-height: 1.4;" onclick="ScienceReport.pickOrderStep(${s.id})">
                                    🔹 ${s.text}
                                </button>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <button class="btn-reset" onclick="ScienceReport.resetOrderSteps()">🔄 순서 다시 배열</button>
                    <button class="btn-action-primary" style="background: ${themeColor};" onclick="ScienceReport.checkOrderQuiz(${qIdx})">
                        ✅ 실험 순서 정답 확인하기
                    </button>
                </div>
            `;
        }
        // 4) 인터랙티브 스스로 평가하기 체크리스트 (type === 'self_check')
        else if (q.type === 'self_check') {
            quizBodyHtml = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 6px;">
                    <div style="color: #1e293b; font-size: 1.02rem; line-height: 1.45;">
                        ${q.questionText}
                    </div>
                    <button class="btn-reset" style="font-size: 0.82rem; padding: 5px 10px;" onclick="ScienceReport.fillAllStars(${q.checklist.length})">
                        🌟 모두 별 3개로 채우기
                    </button>
                </div>

                <div style="display: flex; flex-direction: column; gap: 9px; margin-bottom: 18px;">
                    ${q.checklist.map((item, idx) => {
                        const rating = S.userStarRatings[idx] || 3;
                        return `
                            <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px; background: #f0fdf4; padding: 10px 14px; border-radius: 12px; border: 1.5px solid #bbf7d0;">
                                <span style="font-size: 0.9rem; color: #166534; line-height: 1.4; flex: 1;"><b>${idx + 1}.</b> ${item}</span>
                                <div style="display: flex; gap: 4px; font-size: 1.35rem; cursor: pointer; user-select: none; white-space: nowrap;">
                                    ${[1, 2, 3].map(starVal => `
                                        <span onclick="ScienceReport.setStarRating(${idx}, ${starVal})" style="opacity: ${starVal <= rating ? '1' : '0.25'}; transform: scale(${starVal <= rating ? '1.05' : '0.9'}); transition: all 0.15s;">⭐</span>
                                    `).join('')}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>

                <div style="text-align: center;">
                    <button class="btn-action-primary" style="background: #059669; font-size: 1.08rem; padding: 12px 28px;" onclick="ScienceReport.finishAllQuiz()">
                        🎉 실험연계 탐구 보고서 마스터 완료! (+5💎)
                    </button>
                </div>
            `;
        }

        container.innerHTML = `
            <div style="background: white; border-radius: 18px; padding: 18px; box-shadow: 0 8px 25px rgba(0,0,0,0.06); border: 2px solid ${borderColor};">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; flex-wrap: wrap; gap: 6px;">
                    <div>
                        <div style="color: ${themeColor}; font-size: 1.12rem; font-weight: bold;">${q.title}</div>
                        ${q.bookRef ? `<div style="font-size: 0.78rem; color: #64748b;">${q.bookRef}</div>` : ''}
                    </div>
                    <span style="background: ${tagBg}; color: ${themeColor}; padding: 3px 10px; border-radius: 8px; font-size: 0.85rem; font-weight: bold;">
                        미션 ${qIdx + 1} / ${data.quizItems.length}
                    </span>
                </div>

                ${quizBodyHtml}
            </div>
        `;
    }

    function selectBlankWordByIdx(qIdx, optIdx) {
        const data = getActiveReportData();
        const q = data && data.quizItems ? data.quizItems[qIdx] : null;
        if (!q || !q.options || typeof q.options[optIdx] === 'undefined') return;
        selectBlankWord(q.options[optIdx]);
    }

    function selectBlankWord(word) {
        const data = getActiveReportData();
        const q = data && data.quizItems ? data.quizItems[S.currentReportQuizIdx] : null;
        const blankIds = (q && Array.isArray(q.blanks)) ? q.blanks.map(b => b.id) : ['b1', 'b2', 'b3'];

        for (const id of blankIds) {
            if (!S.userBlankAnswers[id]) {
                S.userBlankAnswers[id] = word;
                break;
            }
        }
        const tabContent = document.getElementById('reportTabContent');
        renderLabReportQuiz(tabContent, S.currentReportQuizIdx);
    }

    function clearBlankSlot(blankId) {
        delete S.userBlankAnswers[blankId];
        const tabContent = document.getElementById('reportTabContent');
        renderLabReportQuiz(tabContent, S.currentReportQuizIdx);
    }

    function resetBlankAnswers() {
        S.userBlankAnswers = {};
        const tabContent = document.getElementById('reportTabContent');
        renderLabReportQuiz(tabContent, S.currentReportQuizIdx);
    }

    // 📒 문항 단위 학습 기록 (docs/learning_record_spec.md §5 3차): 정적 자료 's:sci-report-<단원>:<문항 번호>'
    function reportTrack(qIdx) {
        const L = window.LearningLog, data = getActiveReportData();
        if (!L || !L.itemTracker || !data || !Array.isArray(data.quizItems)) return null;
        return L.itemTracker({ subject: '과학', list: data.quizItems, idx: qIdx, session: S.reportQuizSession,
            key: L.keyFor('s', `sci-report-${S.currentReportUnitId}`, qIdx) });
    }

    function checkBlankAnswer(qIdx) {
        const data = getActiveReportData();
        const q = data.quizItems[qIdx];
        const blanks = Array.isArray(q.blanks) ? q.blanks : [];

        const isCorrect = blanks.length > 0 && blanks.every(b => S.userBlankAnswers[b.id] === b.answer);
        const container = document.getElementById('reportTabContent');
        const track = reportTrack(qIdx);
        const filled = blanks.length > 0 && blanks.every(b => S.userBlankAnswers[b.id]); // 덜 채운 제출은 답이 아님
        if (track) {
            if (isCorrect) track.done();
            else if (filled) track.wrong(blanks.map(b => S.userBlankAnswers[b.id]).join('/'));
        }

        if (isCorrect) {
            playQuizSound('fairyPraise');
            showQuizFeedback(container, true, `정답입니다! 👏 ${q.explanation}`, () => {
                S.userBlankAnswers = {};
                renderLabReportQuiz(container, qIdx + 1);
            });
        } else {
            const expectedGuide = blanks.map((b, i) => `빈칸 ${i + 1}(${b.target}): <b>[${b.answer}]</b>`).join(', ');
            const hintMsg = `앗! 일부 빈칸이 비어 있거나 순서가 바뀌었어요.<br>💡 <b>정답 힌트</b>: ${expectedGuide}`;
            playQuizSound('fairyEncourage');
            showQuizFeedback(container, false, hintMsg, () => {
                renderLabReportQuiz(container, qIdx);
            });
        }
    }

    function submitChoiceQuiz(qIdx, selectedIdx) {
        const data = getActiveReportData();
        const q = data.quizItems[qIdx];
        const isCorrect = (selectedIdx === q.answer);
        const container = document.getElementById('reportTabContent');
        const track = reportTrack(qIdx);
        if (track) {
            if (isCorrect) track.done();
            else track.wrong((q.choices || [])[selectedIdx]);
        }

        if (isCorrect) {
            playQuizSound('fairyPraise');
            showQuizFeedback(container, true, `정답입니다! 🎉 ${q.explanation}`, () => {
                renderLabReportQuiz(container, qIdx + 1);
            });
        } else {
            playQuizSound('fairyEncourage');
            showQuizFeedback(container, false, `오답입니다! 💡 ${q.explanation}`, () => {
                renderLabReportQuiz(container, qIdx);
            });
        }
    }

    function pickOrderStep(stepId) {
        const data = getActiveReportData();
        const q = data.quizItems[S.currentReportQuizIdx];
        if (!q || !Array.isArray(q.steps)) return;
        const found = q.steps.find(s => s.id === stepId);
        if (found && !S.userOrderPicks.some(p => p.id === stepId)) {
            S.userOrderPicks.push(found);
        }
        renderLabReportQuiz(document.getElementById('reportTabContent'), S.currentReportQuizIdx);
    }

    function removeOrderStep(slotIdx) {
        S.userOrderPicks.splice(slotIdx, 1);
        renderLabReportQuiz(document.getElementById('reportTabContent'), S.currentReportQuizIdx);
    }

    function resetOrderSteps() {
        S.userOrderPicks = [];
        renderLabReportQuiz(document.getElementById('reportTabContent'), S.currentReportQuizIdx);
    }

    function checkOrderQuiz(qIdx) {
        const data = getActiveReportData();
        const q = data.quizItems[qIdx];
        const container = document.getElementById('reportTabContent');

        if (S.userOrderPicks.length < q.steps.length) {
            showQuizFeedback(container, false, `아직 ${q.steps.length}단계 중 ${S.userOrderPicks.length}단계만 선택했어요! 모든 실험 과정 카드를 터치해 순서를 완성해 주세요.`, () => {
                renderLabReportQuiz(container, qIdx);
            });
            return;
        }

        const isCorrect = S.userOrderPicks.every((picked, idx) => picked.id === idx + 1);
        const track = reportTrack(qIdx); // 단계를 다 고른 뒤의 판정만 센다(덜 고른 것은 답이 아님)
        if (track) {
            if (isCorrect) track.done();
            else track.wrong(S.userOrderPicks.map(p => p.id).join('-'));
        }
        if (isCorrect) {
            playQuizSound('fairyPraise');
            showQuizFeedback(container, true, `실험 순서 조립 성공! 🧪 ${q.explanation}`, () => {
                S.userOrderPicks = [];
                S.lastOrderQuizKey = '';
                renderLabReportQuiz(container, qIdx + 1);
            });
        } else {
            playQuizSound('fairyEncourage');
            showQuizFeedback(container, false, `실험 순서가 조금 뒤바뀌었어요! 💡 1단계는 <b>"${q.steps[0].text}"</b>부터 시작해야 해요. 다시 조립해 볼까요?`, () => {
                S.userOrderPicks = [];
                renderLabReportQuiz(container, qIdx);
            });
        }
    }

    function passOrderQuiz(qIdx) {
        checkOrderQuiz(qIdx);
    }

    function setStarRating(itemIdx, stars) {
        S.userStarRatings[itemIdx] = stars;
        renderLabReportQuiz(document.getElementById('reportTabContent'), S.currentReportQuizIdx);
    }

    function fillAllStars(count) {
        for (let i = 0; i < count; i++) S.userStarRatings[i] = 3;
        renderLabReportQuiz(document.getElementById('reportTabContent'), S.currentReportQuizIdx);
    }

    // 💡 피드백 콜백 안전 레지스트리
    function showQuizFeedback(container, isSuccess, message, nextCallback) {
        S.pendingFeedbackCallback = nextCallback;
        const data = getActiveReportData();
        const th = getUnitTheme(data);
        const okColor = isSuccess ? '#059669' : th.color;
        container.innerHTML = `
            <div style="text-align: center; padding: 24px; background: white; border-radius: 18px; border: 3px solid ${isSuccess ? '#10b981' : '#f87171'};">
                <div style="font-size: 3rem; margin-bottom: 8px;">${isSuccess ? '🎉' : '💡'}</div>
                <h3 style="color: ${isSuccess ? '#059669' : '#dc2626'}; font-size: 1.35rem; margin-bottom: 10px;">
                    ${isSuccess ? '훌륭해요! 정답입니다!' : '힌트를 확인해 보세요!'}
                </h3>
                <p style="color: #334155; font-size: 0.96rem; line-height: 1.65; margin-bottom: 18px;">
                    ${message}
                </p>
                <button class="btn-action-primary" style="background: ${okColor};" onclick="ScienceReport.triggerFeedbackNext()">
                    ${isSuccess ? '다음 미션으로 ➔' : '🔄 다시 도전하기'}
                </button>
            </div>
        `;
    }

    function triggerFeedbackNext() {
        if (typeof S.pendingFeedbackCallback === 'function') {
            const cb = S.pendingFeedbackCallback;
            S.pendingFeedbackCallback = null;
            cb();
        }
    }

    function finishAllReportQuiz() {
        const data = getActiveReportData() || {};
        const th = getUnitTheme(data);
        playQuizSound('fairyReward');
        if (typeof grantRewardGem === 'function') {
            const rewardMsg = data.rewardMsg || (S.currentReportUnitId === 3
                ? '3단원 열과 우리 생활 실험연계 탐구 보고서 완벽 마스터'
                : (S.currentReportUnitId === 2
                    ? '2단원 날씨와 우리 생활 실험관찰 탐구 보고서 완벽 마스터'
                    : `${data.unit || S.currentReportUnitId + '단원'} 실험연계 탐구 보고서 완벽 마스터`));
            grantRewardGem(5, rewardMsg);
        }
        const container = document.getElementById('overlayInnerBody');
        const unitTitle = data.unit || `${S.currentReportUnitId}단원 실험연계 학습 보고서`;
        const iconStr = `${th.icon} 🧪 🏆 💎`;
        const unitDesc = data.masterDesc || (S.currentReportUnitId === 3
            ? '5종 온도계 비교, 두 물체 접촉 열평형 꺾은선그래프 서술형, ㄷ자 구리판 전도, 액체·기체 대류, 복사, 단열 장치와 KSTAR 인공 태양(1억 ℃)까지 완벽하게 정복했습니다! (+5💎)'
            : (S.currentReportUnitId === 2
                ? '습도계 측정, 이슬과 안개, 구름 발생, 바람, 사계절 기단 탐구 기록을 완벽하게 마스터했습니다! (+5💎)'
                : `${unitTitle}의 핵심 개념표와 교과서 탐구 실험, 서술형 미션을 완벽하게 마스터했습니다! (+5💎)`));

        container.innerHTML = `
            <div style="text-align: center; padding: 30px; font-family: 'Jua';">
                <div style="font-size: 3.4rem; margin-bottom: 10px;">${iconStr}</div>
                <h2 style="color: #059669; font-size: 1.55rem; margin-bottom: 8px;">『실험관찰』 실험연계 탐구 보고서 마스터 완료!</h2>
                <h3 style="color: ${th.color}; font-size: 1.22rem; margin-bottom: 10px;">[${unitTitle}]</h3>
                <p style="color: #475569; font-size: 1.02rem; line-height: 1.6; max-width: 580px; margin: 0 auto 22px auto;">
                    ${unitDesc}
                </p>
                <button class="back-to-lobby-btn" style="background: #0284c7; color: white;" onclick="if(typeof closeMissionView==='function') closeMissionView(true)">
                    과학 대기실로 돌아가기
                </button>
            </div>
        `;
    }

    // 🌟 이름표에 퀴즈 함수 더하기 (화면 onclick은 ScienceReport.xxx로 부른다)
    Object.assign(R, {
        renderQuiz: renderLabReportQuiz,
        selectBlankWord,
        selectBlankWordByIdx,
        clearBlankSlot,
        resetBlankAnswers,
        checkBlankAnswer,
        submitChoiceQuiz,
        pickOrderStep,
        removeOrderStep,
        resetOrderSteps,
        checkOrderQuiz,
        passOrderQuiz,
        setStarRating,
        fillAllStars,
        triggerFeedbackNext,
        finishAllQuiz: finishAllReportQuiz
    });

    // 🌐 하위 호환성 전역 브리지
    window.renderLabReportQuiz = renderLabReportQuiz;
    window.selectBlankWord = selectBlankWord;
    window.resetBlankAnswers = resetBlankAnswers;
    window.checkBlankAnswer = checkBlankAnswer;
    window.submitChoiceQuiz = submitChoiceQuiz;
    window.passOrderQuiz = passOrderQuiz;
    window.finishAllReportQuiz = finishAllReportQuiz;

})();
