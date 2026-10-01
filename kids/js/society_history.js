// ========================================================
// ⏳ [5단계] 역사 & 문화재 돋보기 모듈 (society_history.js)
// ========================================================
// 국보·보물 역사 문화재 카드 탐구, 박물관 가랜드 도킹 및 유물 소장 전담 모듈

(() => {
    'use strict';

    /**
     * 안전하게 로컬 유물 소장 목록 로드
     */
    function getCollected() {
        if (!Array.isArray(window.historyCollected)) {
            try {
                const raw = localStorage.getItem('society_history_collectibles');
                window.historyCollected = raw ? JSON.parse(raw) : [];
                if (!Array.isArray(window.historyCollected)) window.historyCollected = [];
            } catch (e) {
                window.historyCollected = [];
            }
        }
        return window.historyCollected;
    }

    /**
     * 역사 & 문화재 화면 렌더링
     */
    function render(container, currentItem, activeQuizIdx, totalCount) {
        if (!container || !currentItem) return;

        const screenWrapper = document.createElement('div');
        screenWrapper.className = "screen loaded card-slide-box";

        const collectedList = getCollected();
        const isCollected = collectedList.includes(currentItem.name);
        const currentUserName = localStorage.getItem('currentUserName') || '민수';

        screenWrapper.innerHTML = `
            <div style="font-size: 0.85rem; opacity:0.7;">역사유물 ${activeQuizIdx + 1} / ${totalCount}</div>
            <div class="dual-card-container">
                <div class="artifact-card-left">
                    <div class="artifact-photo-frame">
                        <img src="${currentItem.img}" class="artifact-img" alt="역사 유물" onerror="this.src='https://images.unsplash.com/photo-1598970434795-0c54fe7c0648?w=500&auto=format&fit=crop'">
                    </div>
                    <div class="artifact-name">${currentItem.name || ''}</div>
                    <span style="font-size:0.8rem; background:var(--gold); color:#333; padding:2px 8px; border-radius:99px; font-weight:bold;">
                        ${isCollected ? "🏆 소장 완료" : "🔒 미소장"}
                    </span>
                </div>
                
                <div class="artifact-card-right">
                    <p class="history-summary-text">"${currentItem.desc || ''}"</p>
                </div>
            </div>

            <div style="display:flex; gap:10px; flex-wrap:wrap; justify-content:center; align-items:center;">
                <button class="quiz-button" style="background:var(--gold); color:#111;" data-art-name="${(currentItem.name || '').replace(/"/g, '&quot;')}" onclick="window.SocietyHistory.handleCollectClick(this)">💎 박물관 가랜드에 소장하기</button>
                ${currentItem.interactiveUrl ? `<a href="${currentItem.interactiveUrl}" target="_blank" rel="noopener noreferrer" class="quiz-button" style="background:linear-gradient(135deg, #2563eb, #1d4ed8); color:white; text-decoration:none; display:inline-flex; align-items:center; gap:6px;">🏛️ 국립박물관 유물 정보 ↗</a>` : ''}
                <button class="quiz-button" style="background:var(--pink);" onclick="window.skipToNextQuiz('history')">다음 유물 ⏩</button>
            </div>

            <div class="museum-showcase" style="width:100%;">
                <div class="museum-title">🏛️ ${currentUserName}의 국보 역사박물관</div>
                <div class="museum-grid" id="museumGridDock"></div>
            </div>
        `;

        container.appendChild(screenWrapper);
        renderMuseumGridDock();

        if (typeof window.speakFairyTTS === 'function') {
            window.speakFairyTTS((currentItem.name || '') + "입니다. " + (currentItem.desc || ''));
        }
    }

    /**
     * 박물관 도크 렌더링
     */
    function renderMuseumGridDock() {
        const dock = document.getElementById('museumGridDock');
        if (!dock) return;
        dock.innerHTML = "";

        const activeData = window.activeSectionData || [];
        const collectedList = getCollected();
        const allArtNames = activeData.map(item => item.name);

        allArtNames.forEach(name => {
            const collected = collectedList.includes(name);
            const el = document.createElement('span');
            el.className = `collected-badge ${collected ? '' : 'locked'}`;
            el.style.background = collected ? 'linear-gradient(90deg, #ff9a9e, #fecfef)' : 'transparent';
            el.style.color = collected ? '#4a3352' : '#888';
            el.style.border = collected ? '2px solid' : '1.5px solid';
            el.style.borderColor = collected ? 'var(--gold)' : '#555';
            el.innerHTML = collected ? `🏆 ${name}` : `🔒 ${name}`;
            dock.appendChild(el);
        });
    }

    /**
     * 버튼 클릭 핸들러 (따옴표 파괴 방지)
     */
    function handleCollectClick(btnEl) {
        if (!btnEl) return;
        const artName = btnEl.getAttribute('data-art-name') || '';
        collectArtifact(artName);
    }

    /**
     * 유물 수집 & 저장
     */
    async function collectArtifact(artName) {
        const collectedList = getCollected();
        if (collectedList.includes(artName)) {
            alert("이미 박물관 컬렉션에 보존된 소중한 유물입니다!");
            return;
        }

        collectedList.push(artName);
        localStorage.setItem('society_history_collectibles', JSON.stringify(collectedList));

        if (typeof window.speakFairyTTS === 'function') {
            window.speakFairyTTS("축하해요! 유물 획득 완료!");
        }
        alert(`🏆 유물 획득! [${artName}]을 소장했습니다!`);

        const activeIdx = window.activeQuizIdx || 0;
        if (typeof window.rewardQuizCorrect === 'function') {
            await window.rewardQuizCorrect(activeIdx);
        }
        renderMuseumGridDock();

        setTimeout(() => {
            if (typeof window.skipToNextQuiz === 'function') {
                window.skipToNextQuiz('history');
            }
        }, 1200);
    }

    // 네임스페이스 및 전역 브릿지
    window.SocietyHistory = {
        render,
        renderMuseumGridDock,
        collectArtifact,
        handleCollectClick,
        getCollected
    };

    window.renderMuseumGridDock = renderMuseumGridDock;
    window.collectArtifact = collectArtifact;
})();
