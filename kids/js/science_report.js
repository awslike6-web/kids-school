// kids/js/science_report.js
// 📝 [4단계] 『실험관찰』 실험연계 디지털 탐구 보고서 & 서술형 빌더 전담 엔진 (골디락스 모듈)
// - 전사 거버넌스 헌법(규칙 7조) 준수: 적정 응집도(<800줄), IIFE 캡슐화, 하위 호환성 100% 보존
// - 따옴표 구문 파괴 방지: 인라인 직렬화 대신 네임스페이스 콜백 레지스트리 패턴 적용

(function() {
    'use strict';

    let currentReportTab = 'doc'; // 'doc' | 'quiz'
    let currentReportQuizIdx = 0;
    let currentReportUnitId = 1; // 1: 1단원 혼합물, 2: 2단원 날씨, 3: 3단원 열과 우리 생활
    let userBlankAnswers = {};
    let userOrderPicks = [];
    let shuffledOrderPool = [];
    let lastOrderQuizKey = '';
    let userStarRatings = {};
    let pendingFeedbackCallback = null;

    const UNIT_THEME_DEFAULTS = {
        1: { icon: "🧪", color: "#0284c7", bg: "#e0f2fe", text: "#0369a1", border: "#bae6fd", badge: "🧪 교과서 12~19쪽 탐구 일지", guide: "교과서 『실험관찰』 12~19쪽 핵심 내용을 한눈에 읽어보세요!" },
        2: { icon: "🌤️", color: "#d97706", bg: "#fef3c7", text: "#b45309", border: "#fde68a", badge: "🌤️ 교과서 24~35쪽 탐구 일지", guide: "교과서 『실험관찰』 24~35쪽 날씨 탐구 핵심 내용을 한눈에 읽어보세요!" },
        3: { icon: "🔥", color: "#ea580c", bg: "#ffedd5", text: "#c2410c", border: "#fed7aa", badge: "🔥 교과서 『실험관찰』 16~25쪽 · 실험연계 보고서", guide: "🌡️ 5종 온도계 비교표, 교과서 5대 실험 분석, KSTAR 인공 태양(1억 ℃) 단열 비밀까지 한눈에 정복하세요!" },
        4: { icon: "🚀", color: "#7c3aed", bg: "#ede9fe", text: "#5b21b6", border: "#ddd6fe", badge: "🚀 4단원 실험연계 디지털 탐구 보고서", guide: "🔬 교과서 핵심 실험 비교표와 실험연계 탐구 노트를 한눈에 정복하세요!" },
        5: { icon: "⚗️", color: "#059669", bg: "#d1fae5", text: "#047857", border: "#a7f3d0", badge: "⚗️ 5단원 실험연계 디지털 탐구 보고서", guide: "🔬 교과서 핵심 실험 비교표와 실험연계 탐구 노트를 한눈에 정복하세요!" }
    };

    function getActiveReportData() {
        if (currentReportUnitId > 1) {
            const dynamicData = window[`SCIENCE_LAB_REPORT_${currentReportUnitId}_DATA`];
            if (dynamicData) return dynamicData;
        }
        return window.SCIENCE_LAB_REPORT_DATA;
    }

    function getUnitTheme(data) {
        const base = UNIT_THEME_DEFAULTS[currentReportUnitId] || UNIT_THEME_DEFAULTS[4];
        return Object.assign({}, base, (data && data.theme) || {});
    }

    function openScienceReport(unitId = 1) {
        currentReportUnitId = unitId;
        if (typeof window.openMissionView === 'function') {
            window.openMissionView('report');
        }
    }

    function openScienceReport2() { openScienceReport(2); }
    function openScienceReport3() { openScienceReport(3); }
    function openScienceReport4() { openScienceReport(4); }
    function openScienceReport5() { openScienceReport(5); }

    // 📈 [실험 1 전용] 따뜻한 물(600mL) + 차가운 물(300mL) 접촉 열평형 꺾은선그래프 SVG
    function renderEquilibriumGraphSvg(compact) {
        const height = compact ? 155 : 175;
        return `
            <div style="background: #fff7ed; border: 1.5px solid #fed7aa; border-radius: 12px; padding: 10px 12px; margin: 10px 0;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; flex-wrap: wrap; gap: 4px;">
                    <span style="font-size: 0.86rem; font-weight: bold; color: #c2410c;">📈 [실험 1] 두 물체 접촉 시 시간에 따른 온도 변화 꺾은선그래프</span>
                    <span style="font-size: 0.78rem; background: #ffedd5; color: #9a3412; padding: 2px 8px; border-radius: 999px;">🔥 열 이동: 따뜻한 물(고온) ➔ 차가운 물(저온)</span>
                </div>
                <svg viewBox="0 0 460 ${height}" style="width: 100%; height: auto; background: white; border-radius: 8px; border: 1px solid #e2e8f0;">
                    <!-- 격자선 -->
                    <line x1="48" y1="25" x2="430" y2="25" stroke="#f1f5f9" stroke-width="1" />
                    <line x1="48" y1="80" x2="430" y2="80" stroke="#cbd5e1" stroke-dasharray="4,4" stroke-width="1.5" />
                    <line x1="48" y1="130" x2="430" y2="130" stroke="#f1f5f9" stroke-width="1" />
                    <!-- 축 -->
                    <line x1="48" y1="15" x2="48" y2="140" stroke="#64748b" stroke-width="2" />
                    <line x1="48" y1="140" x2="435" y2="140" stroke="#64748b" stroke-width="2" />
                    <!-- Y축 라벨 -->
                    <text x="42" y="29" text-anchor="end" font-size="11" fill="#ea580c" font-weight="bold">60℃</text>
                    <text x="42" y="84" text-anchor="end" font-size="11" fill="#059669" font-weight="bold">36℃</text>
                    <text x="42" y="133" text-anchor="end" font-size="11" fill="#0284c7" font-weight="bold">12℃</text>
                    <!-- X축 라벨 (1분 간격) -->
                    <text x="55" y="153" text-anchor="middle" font-size="10" fill="#475569">0분</text>
                    <text x="130" y="153" text-anchor="middle" font-size="10" fill="#475569">1분</text>
                    <text x="205" y="153" text-anchor="middle" font-size="10" fill="#475569">2분</text>
                    <text x="280" y="153" text-anchor="middle" font-size="10" fill="#475569">3분</text>
                    <text x="355" y="153" text-anchor="middle" font-size="10" fill="#475569">4분</text>
                    <text x="420" y="153" text-anchor="middle" font-size="10" fill="#475569">5분</text>
                    <!-- 따뜻한 물 (600mL) 하강 곡선 -->
                    <polyline fill="none" stroke="#ea580c" stroke-width="3.2" points="55,25 130,48 205,65 280,75 355,80 420,80" />
                    <circle cx="55" cy="25" r="4" fill="#ea580c" /><circle cx="130" cy="48" r="4" fill="#ea580c" />
                    <circle cx="205" cy="65" r="4" fill="#ea580c" /><circle cx="280" cy="75" r="4" fill="#ea580c" />
                    <circle cx="355" cy="80" r="4" fill="#ea580c" /><circle cx="420" cy="80" r="4" fill="#ea580c" />
                    <!-- 차가운 물 (300mL) 상승 곡선 -->
                    <polyline fill="none" stroke="#0284c7" stroke-width="3.2" points="55,130 130,108 205,93 280,84 355,80 420,80" />
                    <circle cx="55" cy="130" r="4" fill="#0284c7" /><circle cx="130" cy="108" r="4" fill="#0284c7" />
                    <circle cx="205" cy="93" r="4" fill="#0284c7" /><circle cx="280" cy="84" r="4" fill="#0284c7" />
                    <circle cx="355" cy="80" r="4" fill="#059669" /><circle cx="420" cy="80" r="4" fill="#059669" />
                    <!-- 범례 및 설명 텍스트 -->
                    <text x="135" y="36" font-size="11" fill="#c2410c" font-weight="bold">따뜻한 물 600mL (점점 낮아짐 ↘)</text>
                    <text x="135" y="124" font-size="11" fill="#0369a1" font-weight="bold">차가운 물 300mL (점점 높아짐 ↗)</text>
                    <rect x="295" y="53" width="132" height="20" rx="5" fill="#dcfce7" stroke="#86efac" />
                    <text x="361" y="67" text-anchor="middle" font-size="10.5" fill="#166534" font-weight="bold">두 물체의 온도가 같아짐(━)</text>
                </svg>
            </div>
        `;
    }

    function renderLabReportUI(container, tabName, unitId) {
        if (!container) container = document.getElementById('overlayInnerBody');
        if (!container) return;

        if (typeof unitId !== 'undefined') currentReportUnitId = unitId;
        if (tabName) currentReportTab = tabName;
        const data = getActiveReportData();
        if (!data) return;

        const th = getUnitTheme(data);
        const titleEl = document.getElementById('overlayHeaderTitle');
        const iconEl = document.getElementById('overlayHeaderIcon');
        if (titleEl) titleEl.textContent = data.title;
        if (iconEl) iconEl.textContent = th.icon;

        const unitThemeColor = th.color;
        const unitBgColor = th.bg;
        const unitTextColor = th.text;
        const pageBadgeText = th.badge;

        container.innerHTML = `
            <div style="max-width: 820px; margin: 0 auto; padding: 6px 10px; font-family: 'Jua', sans-serif;">
                <!-- 단원 배지 -->
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; flex-wrap: wrap; gap: 6px;">
                    <span style="background: ${unitBgColor}; color: ${unitTextColor}; padding: 4px 12px; border-radius: 8px; font-size: 0.92rem; font-weight: bold;">
                        ${data.unit}
                    </span>
                    <span style="font-size: 0.85rem; color: #64748b;">
                        ${pageBadgeText}
                    </span>
                </div>

                <!-- 상단 2단계 모드 전환 탭 -->
                <div style="display: flex; gap: 8px; margin-bottom: 14px; background: ${unitBgColor}; padding: 6px; border-radius: 14px;">
                    <button onclick="ScienceReport.renderUI(document.getElementById('overlayInnerBody'), 'doc')" style="
                        flex: 1; padding: 10px 12px; border-radius: 10px; border: none; font-family: 'Jua'; font-size: 1.02rem; cursor: pointer;
                        background: ${currentReportTab === 'doc' ? unitThemeColor : 'transparent'};
                        color: ${currentReportTab === 'doc' ? 'white' : unitTextColor};
                        box-shadow: ${currentReportTab === 'doc' ? '0 2px 8px rgba(0,0,0,0.15)' : 'none'};
                        transition: all 0.2s;
                    ">
                        📑 1. 실험연계 탐구 노트 (개념표 & 실험 분석)
                    </button>
                    <button onclick="ScienceReport.renderUI(document.getElementById('overlayInnerBody'), 'quiz')" style="
                        flex: 1; padding: 10px 12px; border-radius: 10px; border: none; font-family: 'Jua'; font-size: 1.02rem; cursor: pointer;
                        background: ${currentReportTab === 'quiz' ? unitThemeColor : 'transparent'};
                        color: ${currentReportTab === 'quiz' ? 'white' : unitTextColor};
                        box-shadow: ${currentReportTab === 'quiz' ? '0 2px 8px rgba(0,0,0,0.15)' : 'none'};
                        transition: all 0.2s;
                    ">
                        ✍️ 2. 실험 탐구 & 서술형 미션 (${data.quizItems ? data.quizItems.length : 5}문제)
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
            userOrderPicks = [];
            lastOrderQuizKey = '';
            renderLabReportQuiz(tabContent, 0);
        }
    }

    // 📑 [탭 1] 실험연계 완벽 요약 노트 (비교표 + 실험 1~5 + 심화 탐구)
    function renderLabReportDoc(container) {
        const data = getActiveReportData();
        if (!data) return;
        const th = getUnitTheme(data);
        const btnColor = th.color;
        const borderColor = th.border;
        const tagBg = th.bg;
        const tagColor = th.text;
        const pageGuide = th.guide;

        // 1) 상단 개념 비교표 렌더링 (conceptTables 보유 시)
        const tablesHtml = Array.isArray(data.conceptTables) ? data.conceptTables.map(tb => `
            <div style="background: #ffffff; border-radius: 16px; padding: 14px 16px; border: 2px solid ${borderColor}; box-shadow: 0 3px 8px rgba(0,0,0,0.03);">
                <h4 style="color: ${tagColor}; font-size: 1.08rem; margin: 0 0 10px 0;">${tb.title}</h4>
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 0.88rem; line-height: 1.45;">
                        <thead>
                            <tr style="background: ${tagBg}; color: ${tagColor};">
                                ${tb.headers.map(h => `<th style="padding: 8px 10px; border: 1px solid ${borderColor}; text-align: left;">${h}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${tb.rows.map((row, rIdx) => `
                                <tr style="background: ${rIdx % 2 === 0 ? '#ffffff' : '#fffaf5'};">
                                    ${row.map((cell, cIdx) => `
                                        <td style="padding: 8px 10px; border: 1px solid #e2e8f0; color: #334155; ${cIdx === 0 ? 'font-weight:bold; white-space:nowrap; color:#1e293b;' : ''}">${cell}</td>
                                    `).join('')}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `).join('') : '';

        // 2) 중단 실험 상세 분석 카드
        const docsHtml = data.summaryDoc.map(item => `
            <div style="background: white; border-radius: 16px; padding: 16px; border: 2px solid ${borderColor}; box-shadow: 0 4px 10px rgba(0,0,0,0.04);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 6px;">
                    <h4 style="color: ${tagColor}; font-size: 1.12rem; margin: 0;">${item.title}</h4>
                    <div style="display: flex; align-items: center; gap: 6px;">
                        ${item.labLink ? `
                            <a href="${item.labLink}" style="text-decoration: none; font-size: 0.78rem; background: #0284c7; color: white; padding: 3px 9px; border-radius: 6px;">
                                🧪 가상 실험실 바로가기 ➔
                            </a>
                        ` : ''}
                        <span style="font-size: 0.8rem; background: ${tagBg}; color: ${tagColor}; padding: 2px 8px; border-radius: 6px;">${item.page}</span>
                    </div>
                </div>

                <div style="font-size: 0.9rem; line-height: 1.55; color: #334155; margin-bottom: 8px;">
                    <b>[실험 준비 및 과정]</b><br>
                    ${item.process}
                </div>

                ${item.hasEquilibriumGraph ? renderEquilibriumGraphSvg(false) : ''}
                ${item.diagramHtml ? item.diagramHtml : ''}

                <div style="background: #f8fafc; padding: 10px 12px; border-radius: 8px; border-left: 4px solid ${tagColor}; font-size: 0.88rem; line-height: 1.55; color: #1e293b; margin-bottom: 8px;">
                    <b>[실험 결과 및 관찰 내용]</b><br>
                    ${item.result}
                </div>

                <div style="background: #f0fdf4; padding: 8px 12px; border-radius: 8px; font-size: 0.88rem; color: #166534; line-height: 1.5; margin-bottom: 6px;">
                    🎯 <b>실험 결론</b> : ${item.conclusion}
                </div>

                <div style="font-size: 0.85rem; color: #d97706; padding-left: 4px; margin-bottom: ${item.safetyTip ? '6px' : '0'};">
                    💡 <b>생각해 볼까요?</b> : ${item.think}
                </div>

                ${item.safetyTip ? `
                    <div style="background: #fef2f2; border: 1px dashed #fca5a5; padding: 6px 10px; border-radius: 8px; font-size: 0.82rem; color: #b91c1c;">
                        ${item.safetyTip}
                    </div>
                ` : ''}
            </div>
        `).join('');

        // 3) 하단 심화 탐구 박스 (KSTAR 인공 태양 1억 ℃ 등)
        const deepDiveHtml = data.specialDeepDive ? `
            <div style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); color: white; border-radius: 18px; padding: 18px; border: 2px solid #818cf8; box-shadow: 0 6px 16px rgba(30, 27, 75, 0.2);">
                <div style="display: inline-block; background: #f97316; color: white; font-size: 0.78rem; padding: 3px 10px; border-radius: 999px; margin-bottom: 8px;">
                    ${data.specialDeepDive.badge}
                </div>
                <h4 style="font-size: 1.18rem; color: #fde047; margin: 0 0 4px 0;">${data.specialDeepDive.title}</h4>
                <div style="font-size: 0.88rem; color: #c7d2fe; margin-bottom: 10px;">${data.specialDeepDive.subtitle}</div>
                <p style="font-size: 0.88rem; line-height: 1.55; color: #e0e7ff; background: rgba(255,255,255,0.08); padding: 10px 12px; border-radius: 10px; margin: 0 0 10px 0;">
                    ${data.specialDeepDive.description}
                </p>
                <div style="display: flex; flex-direction: column; gap: 6px;">
                    ${data.specialDeepDive.points.map(pt => `
                        <div style="background: rgba(255,255,255,0.12); padding: 8px 12px; border-radius: 8px; font-size: 0.86rem; line-height: 1.45; color: #f8fafc;">
                            ${pt}
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : '';

        container.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
                <span style="font-size: 0.9rem; color: #475569;">${pageGuide}</span>
                <button class="back-to-lobby-btn" style="background: ${btnColor}; color: white; padding: 7px 15px; font-size: 0.92rem;" onclick="ScienceReport.renderUI(document.getElementById('overlayInnerBody'), 'quiz')">
                    ✍️ 실험 탐구 & 서술형 미션 시작 ➔
                </button>
            </div>

            <div style="display: flex; flex-direction: column; gap: 14px; max-height: 540px; overflow-y: auto; padding-right: 4px;">
                ${tablesHtml}
                ${docsHtml}
                ${deepDiveHtml}
            </div>
        `;
    }

    // ✍️ [탭 2] 실험 연계 탐구 & 서술형 문장 조립 미션
    function renderLabReportQuiz(container, qIdx) {
        const data = getActiveReportData();
        if (!data || !data.quizItems || !data.quizItems[qIdx]) return;
        const q = data.quizItems[qIdx];
        currentReportQuizIdx = qIdx;

        const th = getUnitTheme(data);
        const themeColor = th.color;
        const borderColor = th.border;
        const tagBg = th.bg;
        const textColor = th.text;

        let quizBodyHtml = "";

        // 1) 서술형 문장 조립 빌더 & 빈칸 채우기 (type === 'blank')
        if (q.type === 'blank') {
            const renderSlot = (blankId, idx) => {
                const filled = userBlankAnswers[blankId];
                return `<span onclick="ScienceReport.clearBlankSlot('${blankId}')" title="클릭하면 비웁니다" style="display:inline-block; min-width:84px; padding:2px 10px; margin:2px 3px; background:${filled ? themeColor : tagBg}; color:${filled ? 'white' : textColor}; border:1.5px solid ${themeColor}; border-radius:8px; font-weight:bold; text-align:center; cursor:pointer;">${filled || `❓ 빈칸 ${idx + 1}`}</span>`;
            };

            let questionRenderText = "";
            if (q.templateHtml && Array.isArray(q.blanks)) {
                questionRenderText = q.templateHtml;
                q.blanks.forEach((b, idx) => {
                    questionRenderText = questionRenderText.replace(`{${b.id}}`, renderSlot(b.id, idx));
                });
            } else if (currentReportUnitId === 2) {
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
                        ${q.options.map((opt, oIdx) => `
                            <button class="quiz-choice-btn" style="padding: 8px 14px; font-size: 0.93rem;" onclick="ScienceReport.selectBlankWordByIdx(${qIdx}, ${oIdx})">
                                🏷️ ${opt}
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
            quizBodyHtml = `
                <div style="color: #1e293b; font-size: 1.08rem; line-height: 1.55; margin-bottom: 16px;">
                    ${q.questionText}
                </div>

                <div style="display: flex; flex-direction: column; gap: 10px;">
                    ${q.choices.map((choice, idx) => `
                        <button class="quiz-choice-btn" style="padding: 12px 16px; font-size: 0.95rem; text-align: left; justify-content: flex-start; line-height: 1.45;" onclick="ScienceReport.submitChoiceQuiz(${qIdx}, ${idx})">
                            <span style="font-weight: bold; color: ${themeColor}; margin-right: 8px;">${idx + 1}.</span> ${choice}
                        </button>
                    `).join('')}
                </div>
            `;
        }
        // 3) 참여형 실험 순서 직접 배열하기 (type === 'order')
        else if (q.type === 'order') {
            const quizKey = `${currentReportUnitId}_${qIdx}`;
            if (lastOrderQuizKey !== quizKey) {
                lastOrderQuizKey = quizKey;
                userOrderPicks = [];
                // 항상 섞인 순서로 제시 (역순/교차 배치)
                shuffledOrderPool = [...q.steps].sort((a, b) => (b.id % 2) - (a.id % 2) || b.id - a.id);
            }
            const remainingSteps = shuffledOrderPool.filter(s => !userOrderPicks.some(p => p.id === s.id));

            quizBodyHtml = `
                <div style="color: #1e293b; font-size: 1.02rem; line-height: 1.5; margin-bottom: 12px;">
                    ${q.questionText}
                </div>

                <!-- 조립된 순서 슬롯 -->
                <div style="background: #f8fafc; border-radius: 12px; padding: 12px; border: 1.5px solid ${borderColor}; margin-bottom: 12px;">
                    <div style="font-size: 0.85rem; color: ${textColor}; font-weight: bold; margin-bottom: 8px;">
                        📋 내가 조립한 실험 순서 (${userOrderPicks.length} / ${q.steps.length}단계 완료 · 카드를 누르면 취소)
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 6px;">
                        ${q.steps.map((_, slotIdx) => {
                            const picked = userOrderPicks[slotIdx];
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
                        const rating = userStarRatings[idx] || 3;
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
        const q = data && data.quizItems ? data.quizItems[currentReportQuizIdx] : null;
        const blankIds = (q && Array.isArray(q.blanks)) ? q.blanks.map(b => b.id) : ['b1', 'b2', 'b3'];

        for (const id of blankIds) {
            if (!userBlankAnswers[id]) {
                userBlankAnswers[id] = word;
                break;
            }
        }
        const tabContent = document.getElementById('reportTabContent');
        renderLabReportQuiz(tabContent, currentReportQuizIdx);
    }

    function clearBlankSlot(blankId) {
        delete userBlankAnswers[blankId];
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
        const blanks = Array.isArray(q.blanks) ? q.blanks : [];

        const isCorrect = blanks.length > 0 && blanks.every(b => userBlankAnswers[b.id] === b.answer);
        const container = document.getElementById('reportTabContent');

        if (isCorrect) {
            showQuizFeedback(container, true, `정답입니다! 👏 ${q.explanation}`, () => {
                userBlankAnswers = {};
                renderLabReportQuiz(container, qIdx + 1);
            });
        } else {
            const expectedGuide = blanks.map((b, i) => `빈칸 ${i + 1}(${b.target}): <b>[${b.answer}]</b>`).join(', ');
            const hintMsg = `앗! 일부 빈칸이 비어 있거나 순서가 바뀌었어요.<br>💡 <b>정답 힌트</b>: ${expectedGuide}`;
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

    function pickOrderStep(stepId) {
        const data = getActiveReportData();
        const q = data.quizItems[currentReportQuizIdx];
        if (!q || !Array.isArray(q.steps)) return;
        const found = q.steps.find(s => s.id === stepId);
        if (found && !userOrderPicks.some(p => p.id === stepId)) {
            userOrderPicks.push(found);
        }
        renderLabReportQuiz(document.getElementById('reportTabContent'), currentReportQuizIdx);
    }

    function removeOrderStep(slotIdx) {
        userOrderPicks.splice(slotIdx, 1);
        renderLabReportQuiz(document.getElementById('reportTabContent'), currentReportQuizIdx);
    }

    function resetOrderSteps() {
        userOrderPicks = [];
        renderLabReportQuiz(document.getElementById('reportTabContent'), currentReportQuizIdx);
    }

    function checkOrderQuiz(qIdx) {
        const data = getActiveReportData();
        const q = data.quizItems[qIdx];
        const container = document.getElementById('reportTabContent');

        if (userOrderPicks.length < q.steps.length) {
            showQuizFeedback(container, false, `아직 ${q.steps.length}단계 중 ${userOrderPicks.length}단계만 선택했어요! 모든 실험 과정 카드를 터치해 순서를 완성해 주세요.`, () => {
                renderLabReportQuiz(container, qIdx);
            });
            return;
        }

        const isCorrect = userOrderPicks.every((picked, idx) => picked.id === idx + 1);
        if (isCorrect) {
            showQuizFeedback(container, true, `실험 순서 조립 성공! 🧪 ${q.explanation}`, () => {
                userOrderPicks = [];
                lastOrderQuizKey = '';
                renderLabReportQuiz(container, qIdx + 1);
            });
        } else {
            showQuizFeedback(container, false, `실험 순서가 조금 뒤바뀌었어요! 💡 1단계는 <b>"${q.steps[0].text}"</b>부터 시작해야 해요. 다시 조립해 볼까요?`, () => {
                userOrderPicks = [];
                renderLabReportQuiz(container, qIdx);
            });
        }
    }

    function passOrderQuiz(qIdx) {
        checkOrderQuiz(qIdx);
    }

    function setStarRating(itemIdx, stars) {
        userStarRatings[itemIdx] = stars;
        renderLabReportQuiz(document.getElementById('reportTabContent'), currentReportQuizIdx);
    }

    function fillAllStars(count) {
        for (let i = 0; i < count; i++) userStarRatings[i] = 3;
        renderLabReportQuiz(document.getElementById('reportTabContent'), currentReportQuizIdx);
    }

    // 💡 피드백 콜백 안전 레지스트리
    function showQuizFeedback(container, isSuccess, message, nextCallback) {
        pendingFeedbackCallback = nextCallback;
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
        if (typeof pendingFeedbackCallback === 'function') {
            const cb = pendingFeedbackCallback;
            pendingFeedbackCallback = null;
            cb();
        }
    }

    function finishAllReportQuiz() {
        const data = getActiveReportData() || {};
        const th = getUnitTheme(data);
        if (typeof grantRewardGem === 'function') {
            const rewardMsg = data.rewardMsg || (currentReportUnitId === 3
                ? '3단원 열과 우리 생활 실험연계 탐구 보고서 완벽 마스터'
                : (currentReportUnitId === 2
                    ? '2단원 날씨와 우리 생활 실험관찰 탐구 보고서 완벽 마스터'
                    : `${data.unit || currentReportUnitId + '단원'} 실험연계 탐구 보고서 완벽 마스터`));
            grantRewardGem(5, rewardMsg);
        }
        const container = document.getElementById('overlayInnerBody');
        const unitTitle = data.unit || `${currentReportUnitId}단원 실험연계 학습 보고서`;
        const iconStr = `${th.icon} 🧪 🏆 💎`;
        const unitDesc = data.masterDesc || (currentReportUnitId === 3
            ? '5종 온도계 비교, 두 물체 접촉 열평형 꺾은선그래프 서술형, ㄷ자 구리판 전도, 액체·기체 대류, 복사, 단열 장치와 KSTAR 인공 태양(1억 ℃)까지 완벽하게 정복했습니다! (+5💎)'
            : (currentReportUnitId === 2
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

    // 🌟 네임스페이스 공개
    window.ScienceReport = {
        open: openScienceReport,
        openUnit2: openScienceReport2,
        openUnit3: openScienceReport3,
        openUnit4: openScienceReport4,
        openUnit5: openScienceReport5,
        renderUI: renderLabReportUI,
        renderDoc: renderLabReportDoc,
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
    };

    // 🌐 하위 호환성 전역 브리지
    window.openScienceReport = openScienceReport;
    window.openScienceReport2 = openScienceReport2;
    window.openScienceReport3 = openScienceReport3;
    window.openScienceReport4 = openScienceReport4;
    window.openScienceReport5 = openScienceReport5;
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

