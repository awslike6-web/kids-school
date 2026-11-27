// kids/js/science_report.js
// 📝 [4단계] 『실험관찰』 실험연계 디지털 탐구 보고서 & 서술형 빌더 전담 엔진 (골디락스 모듈)
// - 전사 거버넌스 헌법(규칙 7조) 준수: 적정 응집도(<800줄), IIFE 캡슐화, 하위 호환성 100% 보존
// - 따옴표 구문 파괴 방지: 인라인 직렬화 대신 네임스페이스 콜백 레지스트리 패턴 적용
// - 2026-11-28 리팩토링 묶음 D3: 보고서 그리기(이 파일)와 실전 퀴즈(science_report_quiz.js)로 나눴다.
//   두 파일이 함께 쓰는 진행 상태는 ScienceReport._state 한 객체에 둔다. 싣는 순서: 이 파일 → science_report_quiz.js

(function() {
    'use strict';

    // 보고서·퀴즈가 함께 쓰는 진행 상태 (퀴즈 파일은 ScienceReport._state로 같은 객체를 본다)
    const S = {
        currentReportTab: 'doc', // 'doc' | 'quiz'
        currentReportQuizIdx: 0,
        currentReportUnitId: 1, // 1: 1단원 혼합물, 2: 2단원 날씨, 3: 3단원 열과 우리 생활
        userBlankAnswers: {},
        userOrderPicks: [],
        shuffledOrderPool: [],
        lastOrderQuizKey: '',
        choiceOrderCache: {},
        userStarRatings: {},
        pendingFeedbackCallback: null,
        reportQuizSession: {} // 📒 문항기록 회차 (docs/learning_record_spec.md §5 3차)
    };

    function getArrangedItems(cacheKey, list) {
        if (!S.choiceOrderCache[cacheKey]) {
            S.choiceOrderCache[cacheKey] = window.QuizChoices
                ? window.QuizChoices.arrange(list)
                : list.map((text, index) => ({ text, index }));
        }
        return S.choiceOrderCache[cacheKey];
    }

    const UNIT_THEME_DEFAULTS = {
        1: { icon: "🧪", color: "#0284c7", bg: "#e0f2fe", text: "#0369a1", border: "#bae6fd", badge: "🧪 교과서 12~19쪽 탐구 일지", guide: "교과서 『실험관찰』 12~19쪽 핵심 내용을 한눈에 읽어보세요!" },
        2: { icon: "🌤️", color: "#d97706", bg: "#fef3c7", text: "#b45309", border: "#fde68a", badge: "🌤️ 교과서 24~35쪽 탐구 일지", guide: "교과서 『실험관찰』 24~35쪽 날씨 탐구 핵심 내용을 한눈에 읽어보세요!" },
        3: { icon: "🔥", color: "#ea580c", bg: "#ffedd5", text: "#c2410c", border: "#fed7aa", badge: "🔥 교과서 『실험관찰』 16~25쪽 · 실험연계 보고서", guide: "🌡️ 5종 온도계 비교표, 교과서 5대 실험 분석, KSTAR 인공 태양(1억 ℃) 단열 비밀까지 한눈에 정복하세요!" },
        4: { icon: "🌱", color: "#059669", bg: "#d1fae5", text: "#047857", border: "#a7f3d0", badge: "🌱 교과서 『실험관찰』 36~45쪽 · 자원과 에너지", guide: "🌬️ 풍력 발전, ⛏️ 자원 유한성, ☀️ 6대 재생에너지, 🏷️ 에너지 효율 1등급, 🏡 단열 에코하우스까지 한눈에 정복하세요!" },
        5: { icon: "⚗️", color: "#059669", bg: "#d1fae5", text: "#047857", border: "#a7f3d0", badge: "⚗️ 5단원 실험연계 디지털 탐구 보고서", guide: "🔬 교과서 핵심 실험 비교표와 실험연계 탐구 노트를 한눈에 정복하세요!" }
    };

    function getActiveReportData() {
        if (S.currentReportUnitId > 1) {
            const dynamicData = window[`SCIENCE_LAB_REPORT_${S.currentReportUnitId}_DATA`];
            if (dynamicData) return dynamicData;
        }
        return window.SCIENCE_LAB_REPORT_DATA;
    }

    function getUnitTheme(data) {
        const base = UNIT_THEME_DEFAULTS[S.currentReportUnitId] || UNIT_THEME_DEFAULTS[4];
        return Object.assign({}, base, (data && data.theme) || {});
    }

    function openScienceReport(unitId = 1) {
        S.currentReportUnitId = unitId;
        S.choiceOrderCache = {};
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

        if (typeof unitId !== 'undefined') {
            if (unitId !== S.currentReportUnitId) S.choiceOrderCache = {};
            S.currentReportUnitId = unitId;
        }
        if (tabName) S.currentReportTab = tabName;
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
                        background: ${S.currentReportTab === 'doc' ? unitThemeColor : 'transparent'};
                        color: ${S.currentReportTab === 'doc' ? 'white' : unitTextColor};
                        box-shadow: ${S.currentReportTab === 'doc' ? '0 2px 8px rgba(0,0,0,0.15)' : 'none'};
                        transition: all 0.2s;
                    ">
                        📑 1. 실험연계 탐구 노트 (개념표 & 실험 분석)
                    </button>
                    <button onclick="ScienceReport.renderUI(document.getElementById('overlayInnerBody'), 'quiz')" style="
                        flex: 1; padding: 10px 12px; border-radius: 10px; border: none; font-family: 'Jua'; font-size: 1.02rem; cursor: pointer;
                        background: ${S.currentReportTab === 'quiz' ? unitThemeColor : 'transparent'};
                        color: ${S.currentReportTab === 'quiz' ? 'white' : unitTextColor};
                        box-shadow: ${S.currentReportTab === 'quiz' ? '0 2px 8px rgba(0,0,0,0.15)' : 'none'};
                        transition: all 0.2s;
                    ">
                        ✍️ 2. 실험 탐구 & 서술형 미션 (${data.quizItems ? data.quizItems.length : 5}문제)
                    </button>
                </div>

                <div id="reportTabContent"></div>
            </div>
        `;

        const tabContent = document.getElementById('reportTabContent');
        if (S.currentReportTab === 'doc') {
            renderLabReportDoc(tabContent);
        } else {
            S.currentReportQuizIdx = 0;
            S.userBlankAnswers = {};
            S.userOrderPicks = [];
            S.lastOrderQuizKey = '';
            S.reportQuizSession = {}; // 문항기록 회차: 퀴즈 탭을 열 때마다 새로 센다
            window.ScienceReport.renderQuiz(tabContent, 0);
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
                        <span style="font-size: 0.8rem; background: ${tagBg}; color: ${tagColor}; padding: 2px 8px; border-radius: 6px;">${item.page || item.bookRef || ''}</span>
                    </div>
                </div>

                ${item.process ? `
                <div style="font-size: 0.9rem; line-height: 1.55; color: #334155; margin-bottom: 8px;">
                    <b>[실험 준비 및 과정]</b><br>
                    ${item.process}
                </div>` : ''}

                ${item.hasEquilibriumGraph ? renderEquilibriumGraphSvg(false) : ''}
                ${item.diagramHtml ? item.diagramHtml : ''}

                ${Array.isArray(item.points) ? `
                <ul style="margin: 0 0 8px 0; padding-left: 18px; font-size: 0.88rem; line-height: 1.55; color: #1e293b;">
                    ${item.points.map(pt => `<li style="margin-bottom: 4px;">${pt}</li>`).join('')}
                </ul>` : ''}

                ${item.result ? `
                <div style="background: #f8fafc; padding: 10px 12px; border-radius: 8px; border-left: 4px solid ${tagColor}; font-size: 0.88rem; line-height: 1.55; color: #1e293b; margin-bottom: 8px;">
                    <b>[실험 결과 및 관찰 내용]</b><br>
                    ${item.result}
                </div>` : ''}

                ${item.conclusion ? `
                <div style="background: #f0fdf4; padding: 8px 12px; border-radius: 8px; font-size: 0.88rem; color: #166534; line-height: 1.5; margin-bottom: 6px;">
                    🎯 <b>실험 결론</b> : ${item.conclusion}
                </div>` : ''}

                ${item.think ? `
                <div style="font-size: 0.85rem; color: #d97706; padding-left: 4px; margin-bottom: ${item.safetyTip ? '6px' : '0'};">
                    💡 <b>생각해 볼까요?</b> : ${item.think}
                </div>` : ''}

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
                ${data.specialDeepDive.badge ? `
                <div style="display: inline-block; background: #f97316; color: white; font-size: 0.78rem; padding: 3px 10px; border-radius: 999px; margin-bottom: 8px;">
                    ${data.specialDeepDive.badge}
                </div>` : ''}
                <h4 style="font-size: 1.18rem; color: #fde047; margin: 0 0 4px 0;">${data.specialDeepDive.title}</h4>
                ${data.specialDeepDive.subtitle ? `<div style="font-size: 0.88rem; color: #c7d2fe; margin-bottom: 10px;">${data.specialDeepDive.subtitle}</div>` : ''}
                <p style="font-size: 0.88rem; line-height: 1.55; color: #e0e7ff; background: rgba(255,255,255,0.08); padding: 10px 12px; border-radius: 10px; margin: 0 0 10px 0;">
                    ${data.specialDeepDive.description || data.specialDeepDive.intro || ''}
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

    // 🌟 네임스페이스 공개 (퀴즈 함수는 science_report_quiz.js가 같은 이름표에 더한다)
    window.ScienceReport = Object.assign(window.ScienceReport || {}, {
        open: openScienceReport,
        openUnit2: openScienceReport2,
        openUnit3: openScienceReport3,
        openUnit4: openScienceReport4,
        openUnit5: openScienceReport5,
        renderUI: renderLabReportUI,
        renderDoc: renderLabReportDoc,
        _state: S,
        _helpers: { getArrangedItems, getActiveReportData, getUnitTheme, renderEquilibriumGraphSvg }
    });

    // 🌐 하위 호환성 전역 브리지
    window.openScienceReport = openScienceReport;
    window.openScienceReport2 = openScienceReport2;
    window.openScienceReport3 = openScienceReport3;
    window.openScienceReport4 = openScienceReport4;
    window.openScienceReport5 = openScienceReport5;
    window.renderLabReportUI = renderLabReportUI;
    window.renderLabReportDoc = renderLabReportDoc;

})();
