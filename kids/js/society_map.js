// ========================================================
// 🧭 [4단계] 랜선 지도 탐방실 모듈 (society_map.js)
// ========================================================
// 국토 지리 명소 탐방, 지도 사료 돋보기 및 한 줄 탐방록 전담 모듈

(() => {
    'use strict';

    /**
     * 랜선 지도 탐방실 화면 렌더링
     */
    function render(container, currentItem, activeQuizIdx, totalCount, passageHtml) {
        if (!container || !currentItem) return;

        const screenWrapper = document.createElement('div');
        screenWrapper.className = "screen loaded quiz-card";

        const mapMediaHtml = currentItem.img ? `
            <div class="chart-container-box">
                <div class="chart-ctrl-toolbar">
                    <div class="chart-ctrl-group">
                        <button class="card-zoom-btn" onclick="adjustCardZoom(0.4)" title="확대">➕ 확대</button>
                        <button class="card-zoom-btn" onclick="adjustCardZoom(-0.4)" title="축소">➖ 축소</button>
                        <button class="card-zoom-btn" onclick="rotateCardImage()" title="시계방향 90도 회전">🔄 90° 회전</button>
                        <button class="card-zoom-btn" onclick="resetCardZoom()" title="원래대로">🔄 원본</button>
                    </div>
                    <button class="card-zoom-btn card-popup-btn" onclick="openImageInNewWindow('${currentItem.img}')" title="새 창으로 띄워서 보기">🪟 새창 열기</button>
                </div>
                <div class="chart-image-viewport" id="cardZoomViewport" ondragstart="return false;">
                    <img id="cardZoomImg" src="${currentItem.img}" class="chart-img" alt="${currentItem.name || '지도 명소'}" onerror="this.closest('.chart-container-box').style.display='none';">
                </div>
                <div class="chart-zoom-guide">💡 마우스 드래그 이동 / 휠로 확대 / 더블클릭 토글 / 🔄 90° 회전 / 🪟 새창 열기</div>
            </div>
        ` : `
            <div style="text-align:center; margin-bottom:12px;">
                <div style="display:inline-flex; align-items:center; gap:8px; background:rgba(78, 205, 196, 0.12); border:1.5px dashed var(--mint); border-radius:14px; padding:8px 18px; font-family:'Jua', sans-serif; color:var(--mint); font-size:1.05rem;">
                    <span>🗺️ 랜선 국토 지리 탐방</span>
                </div>
            </div>
        `;

        const safeDesc = (currentItem.desc || "").replace(/'/g, "\\'").replace(/"/g, "&quot;");

        screenWrapper.innerHTML = `
            ${passageHtml || ''}
            <div style="font-size: 0.95rem; opacity:0.7;">국토 명소 ${activeQuizIdx + 1} / ${totalCount}</div>
            <h3 style="font-size: 1.35rem; margin-bottom: 8px;">🏕️ ${currentItem.name || ''}</h3>
            ${mapMediaHtml}
            <div class="quiz-descr" style="line-height:1.6; font-size:1.05rem; margin-bottom:14px;">${currentItem.desc || ''}</div>
            
            <div class="interactive-input-group" style="flex-direction:column; gap:5px; margin-bottom:12px;">
                <label style="text-align:left; font-size: 0.9rem; font-weight:bold;">✍️ 요정 코코의 해설을 듣고 한 줄 탐방기를 남겨주세요!</label>
                <div style="display:flex; gap:10px; width:100%;">
                    <input type="text" class="text-input-field" id="mapJourneyInput" placeholder="이 아름다운 명소에 대해 느낀 생각을 자유롭게 남겨봐!" onkeypress="if(event.key==='Enter') window.SocietyMap.submitJourney()">
                    <button class="quiz-button" style="background:var(--mint);" onclick="window.SocietyMap.submitJourney()">탐방기 완성</button>
                </div>
            </div>
            <div style="display:flex; justify-content:center; gap:8px;">
                <button class="quiz-button" style="background:#8b949e;" onclick="window.speakFairyTTS('${safeDesc}')">🔊 명소 해설 듣기</button>
                <button class="quiz-button" style="background:var(--pink);" onclick="window.skipToNextQuiz('map')">건너뛰기 ⏩</button>
            </div>
        `;

        container.appendChild(screenWrapper);
        if (currentItem.img && typeof window.initCardZoomListeners === 'function') {
            window.initCardZoomListeners();
        }

        if (typeof window.speakFairyTTS === 'function') {
            window.speakFairyTTS(currentItem.desc || '');
        }
    }

    /**
     * 한 줄 탐방기 등록 및 완료
     */
    async function submitJourney() {
        const input = document.getElementById('mapJourneyInput');
        if (!input) return;
        const text = input.value.trim();
        if (text.length < 5) {
            alert("한 줄 탐방기를 작성해주세요! (최소 5글자 이상)");
            return;
        }

        if (typeof window.speakFairyTTS === 'function') {
            window.speakFairyTTS("멋진 탐방기네요! 참 잘했어요!");
        }
        alert("📝 멋진 랜선 지리 탐방록 기록 완료!");

        const activeIdx = window.activeQuizIdx || 0;
        if (typeof window.rewardQuizCorrect === 'function') {
            await window.rewardQuizCorrect(activeIdx);
        }

        if (typeof window.skipToNextQuiz === 'function') {
            window.skipToNextQuiz('map');
        }
    }

    // 네임스페이스 및 전역 브릿지
    window.SocietyMap = {
        render,
        submitJourney
    };

    window.submitMapJourney = submitJourney;
})();
