// ========================================================
// 📊 [3단계] 차트 & 도표 자료실 모듈 (society_chart.js)
// ========================================================
// 교과서 사료/도표/통계 이미지 분석 및 4지선다형 퀴즈 전담 모듈

(() => {
    'use strict';

    /**
     * 차트 & 도표 자료실 화면 렌더링
     */
    function render(container, currentItem, activeQuizIdx, totalCount, passageHtml) {
        if (!container || !currentItem) return;

        const screenWrapper = document.createElement('div');
        screenWrapper.className = "screen loaded quiz-card";

        const safeArtifactName = (currentItem.artifactName || currentItem.title || "").replace(/'/g, "\\'").replace(/"/g, "&quot;");
        const safePeriod = (currentItem.artifactPeriod || "").replace(/'/g, "\\'").replace(/"/g, "&quot;");
        const safeUsage = (currentItem.artifactUsage || currentItem.meaning || "").replace(/'/g, "\\'").replace(/"/g, "&quot;");

        const chartMediaHtml = currentItem.img ? `
            <div class="chart-container-box">
                <div class="chart-ctrl-toolbar">
                    <div class="chart-ctrl-group">
                        <button class="card-zoom-btn" onclick="adjustCardZoom(0.4)" title="확대">➕ 확대</button>
                        <button class="card-zoom-btn" onclick="adjustCardZoom(-0.4)" title="축소">➖ 축소</button>
                        <button class="card-zoom-btn" onclick="rotateCardImage()" title="시계방향 90도 회전">🔄 90° 회전</button>
                        <button class="card-zoom-btn" onclick="resetCardZoom()" title="원래대로">🔄 원본</button>
                    </div>
                    <button class="card-zoom-btn card-popup-btn" onclick="openImageInNewWindow('${currentItem.img}', '${safeArtifactName}', '${safePeriod}', '${safeUsage}')" title="새 창으로 띄워서 문제와 나란히 보기">🪟 새창 열기</button>
                </div>
                <div class="chart-image-viewport" id="cardZoomViewport" ondragstart="return false;">
                    <img id="cardZoomImg" src="${currentItem.img}" class="chart-img" alt="교과서 탐구 자료" onerror="this.closest('.chart-container-box').style.display='none';">
                </div>
                <div class="chart-zoom-guide">💡 마우스 드래그 이동 / 휠로 확대 / 더블클릭 토글 / 🔄 90° 회전 / 🪟 새창 열기</div>
            </div>
        ` : `
            <div style="text-align:center; margin-bottom:12px;">
                <div style="display:inline-flex; align-items:center; gap:8px; background:rgba(110, 198, 245, 0.12); border:1.5px dashed var(--sky); border-radius:14px; padding:8px 18px; font-family:'Jua', sans-serif; color:var(--sky); font-size:1.05rem;">
                    <span>📊 교과서 핵심 탐구 자료 분석</span>
                </div>
            </div>
        `;

        const artifactHintToggleHtml = `
            <details class="artifact-hint-toggle" style="margin: 12px 0; background: rgba(255, 255, 255, 0.9); border: 1.5px dashed var(--purple, #8b5cf6); border-radius: 14px; padding: 10px 14px; text-align: left; cursor: pointer;">
                <summary style="font-weight: bold; color: var(--purple, #8b5cf6); font-size: 0.95rem; outline: none; user-select: none; font-family:'Jua', sans-serif;">
                    💡 사진 속 유물/자료 돋보기 (이름과 쓰임새 살짝 엿보기)
                </summary>
                <div style="margin-top: 10px; font-size: 0.9rem; line-height: 1.55; color: #334155; border-top: 1px dashed #cbd5e1; padding-top: 8px;">
                    <div style="font-weight:bold; color:#0f172a; margin-bottom:4px;">
                        🏛️ <b>유물/자료명</b>: ${currentItem.artifactName || currentItem.title} 
                        ${currentItem.artifactPeriod ? `<span style="font-size:0.8rem; background:#8b5cf6; color:white; padding:2px 8px; border-radius:10px; margin-left:4px;">${currentItem.artifactPeriod}</span>` : ''}
                    </div>
                    <div>📌 <b>핵심 쓰임새</b>: ${currentItem.artifactUsage || currentItem.meaning || '교과서 핵심 사료'}</div>
                </div>
            </details>
        `;

        const choices = currentItem.choices || [];
        const choicesHtml = choices.map((choice, i) => `
            <button class="quiz-choice-btn" data-choice-index="${i}" onclick="window.SocietyChart.handleChoiceClick(this)">${i+1}. ${choice}</button>
        `).join('');

        screenWrapper.innerHTML = `
            ${passageHtml || ''}
            <div style="font-size: 0.95rem; opacity:0.7;">자료분석 ${activeQuizIdx + 1} / ${totalCount}</div>
            <h3 style="font-size: 1.35rem; margin-bottom: 8px;">${currentItem.title || ''}</h3>
            ${chartMediaHtml}
            ${artifactHintToggleHtml}
            <div class="quiz-descr" style="line-height:1.6; font-size:1.05rem;">${currentItem.desc || ''}</div>
            <p style="font-weight: bold; font-size:1.15rem; text-align: left; margin-top:14px;">❓ ${currentItem.quiz || ''}</p>
            <div class="quiz-choices-container">
                ${choicesHtml}
            </div>
            <div style="margin-top: 14px; display:flex; justify-content:center;">
                <button class="quiz-button" style="background:var(--pink);" onclick="window.skipToNextQuiz('chart')">건너뛰기 ⏩</button>
            </div>
        `;

        container.appendChild(screenWrapper);
        if (currentItem.img && typeof window.initCardZoomListeners === 'function') {
            window.initCardZoomListeners();
        }
    }

    /**
     * 선택지 클릭 핸들러 (따옴표 파괴 방지)
     */
    function handleChoiceClick(btnEl) {
        if (!btnEl) return;
        const selectedIdx = parseInt(btnEl.getAttribute('data-choice-index'), 10);
        const activeData = window.activeSectionData || [];
        const activeIdx = window.activeQuizIdx || 0;
        const curItem = activeData[activeIdx] || {};
        verifyChoice(selectedIdx, curItem.correctIdx);
    }

    /**
     * 객관식 정답 검증
     */
    async function verifyChoice(selectedIdx, correctIdx) {
        const activeData = window.activeSectionData || [];
        const activeIdx = window.activeQuizIdx || 0;
        const currentItem = activeData[activeIdx] || {};

        if (selectedIdx === correctIdx) {
            if (typeof window.speakFairyTTS === 'function') {
                window.speakFairyTTS("정답이에요! " + (currentItem.artifactName ? currentItem.artifactName + "에 대한 탐구를 완벽히 해냈어요!" : "아주 잘했어요!"));
            }
            if (typeof window.rewardQuizCorrect === 'function') {
                await window.rewardQuizCorrect(activeIdx);
            }
            showSuccessModal(currentItem);
        } else {
            if (typeof window.promptQuizRetryOrSkip === 'function') {
                window.promptQuizRetryOrSkip({
                    message: '아쉽지만 틀렸어요! 돋보기를 다시 한번 살펴볼까요?',
                    onRetry: () => {},
                    onSkip: () => window.skipToNextQuiz('chart'),
                });
            } else {
                if (typeof window.speakFairyTTS === 'function') {
                    window.speakFairyTTS("아쉬워요. 다른 보기를 다시 골라볼까요?");
                }
                alert("❌ 아쉽지만 틀렸어요! 다른 보기를 선택해주세요!");
            }
        }
    }

    /**
     * 차트 문제 정답 축하 모달
     */
    function showSuccessModal(item) {
        let modal = document.getElementById('chartSuccessModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'chartSuccessModal';
            modal.style.position = 'fixed';
            modal.style.inset = '0';
            modal.style.background = 'rgba(15, 23, 42, 0.85)';
            modal.style.backdropFilter = 'blur(6px)';
            modal.style.zIndex = '999999';
            modal.style.display = 'flex';
            modal.style.alignItems = 'center';
            modal.style.justifyContent = 'center';
            modal.style.padding = '20px';
            document.body.appendChild(modal);
        }

        const artName = item.artifactName || item.title || '역사 사료';
        const artPeriod = item.artifactPeriod ? `<span style="display:inline-block; background:#8b5cf6; color:white; font-size:0.8rem; padding:2px 8px; border-radius:12px; margin-left:6px;">${item.artifactPeriod}</span>` : '';
        const artUsage = (item.artifactUsage || item.meaning) ? `<div style="background:#f8fafc; border-left:4px solid #3b82f6; padding:10px 14px; border-radius:8px; margin:12px 0; text-align:left; font-size:0.95rem; color:#334155; line-height:1.55;">📌 <b>유물/자료의 쓰임새</b><br>${item.artifactUsage || item.meaning}</div>` : '';
        const expl = item.explanation ? `<div style="background:#f0fdf4; border-left:4px solid #22c55e; padding:10px 14px; border-radius:8px; margin:12px 0; text-align:left; font-size:0.95rem; color:#166534; line-height:1.55;">💡 <b>교과서 핵심 해설</b><br>${item.explanation}</div>` : '';
        const museumBtn = item.interactiveUrl ? `<a href="${item.interactiveUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-flex; align-items:center; gap:6px; background:linear-gradient(135deg, #2563eb, #1d4ed8); color:white; padding:10px 18px; border-radius:12px; text-decoration:none; font-family:'Jua', sans-serif; font-size:0.95rem; box-shadow:0 4px 12px rgba(37,99,235,0.3);">🏛️ 국립박물관 공식 정보 ↗</a>` : '';

        modal.innerHTML = `
            <div style="background:white; border-radius:24px; max-width:540px; width:100%; padding:26px 22px; box-shadow:0 20px 40px rgba(0,0,0,0.35); text-align:center; max-height:90vh; overflow-y:auto; box-sizing:border-box; animation:popIn 0.3s ease-out;">
                <div style="font-size:3rem; margin-bottom:6px;">🎉</div>
                <h3 style="font-family:'Jua', sans-serif; font-size:1.6rem; color:#10b981; margin:0 0 10px 0;">정답입니다! 아주 완벽해요!</h3>
                
                <div style="display:flex; align-items:center; gap:14px; background:#f1f5f9; padding:12px; border-radius:14px; margin-bottom:12px; text-align:left;">
                    ${item.img ? `<img src="${item.img}" style="width:70px; height:70px; object-fit:cover; border-radius:10px; border:2px solid #cbd5e1; flex-shrink:0;">` : ''}
                    <div>
                        <div style="font-family:'Jua', sans-serif; font-size:1.15rem; color:#0f172a; display:flex; align-items:center; flex-wrap:wrap;">
                            ${artName} ${artPeriod}
                        </div>
                        <div style="font-size:0.85rem; color:#64748b; margin-top:3px;">${item.title}</div>
                    </div>
                </div>

                ${artUsage}
                ${expl}

                <div style="display:flex; flex-wrap:wrap; justify-content:center; gap:10px; margin-top:20px;">
                    ${museumBtn}
                    <button onclick="window.SocietyChart.closeSuccessModalAndNext()" style="background:linear-gradient(135deg, #10b981, #059669); color:white; border:none; padding:10px 24px; border-radius:14px; font-family:'Jua', sans-serif; font-size:1.1rem; cursor:pointer; box-shadow:0 4px 14px rgba(16,185,129,0.35);">
                        다음 사료 탐구하기 ⏩
                    </button>
                </div>
            </div>
        `;
        modal.style.display = 'flex';
    }

    /**
     * 성공 모달 닫고 다음 문제로
     */
    function closeSuccessModalAndNext() {
        const modal = document.getElementById('chartSuccessModal');
        if (modal) modal.style.display = 'none';
        if (typeof window.skipToNextQuiz === 'function') {
            window.skipToNextQuiz('chart');
        }
    }

    // 네임스페이스 및 전역 브릿지
    window.SocietyChart = {
        render,
        handleChoiceClick,
        verifyChoice,
        showSuccessModal,
        closeSuccessModalAndNext
    };

    window.showChartSuccessModal = showSuccessModal;
    window.closeChartSuccessModalAndNext = closeSuccessModalAndNext;
    window.verifyChartChoice = verifyChoice;
})();
