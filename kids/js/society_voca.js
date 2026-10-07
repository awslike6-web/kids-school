// ========================================================
// 💡 [2단계] 사회 용어방 모듈 (society_voca.js)
// ========================================================
// 초성 퀴즈, 객관식, 빈칸 자석 조합 UI 및 채점/마스터 관리 전담 모듈

(() => {
    'use strict';

    /**
     * 한글 초성을 자동으로 추출하는 헬퍼 함수
     */
    function getChosung(str) {
        if (!str) return "";
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

    /**
     * 출제 순서 (랜덤 섞기 <-> 순서대로 풀기) 토글
     */
    function toggleOrder() {
        if (typeof window.societyVocaOrderType === 'undefined') window.societyVocaOrderType = 'shuffle';
        window.societyVocaOrderType = (window.societyVocaOrderType === 'shuffle') ? 'sequence' : 'shuffle';
        window.activeQuizIdx = 0;
        const innerBody = document.getElementById('overlayInnerBody');
        if (!innerBody) return;

        let matchedRecords = window.allFetchedRecords || [];
        if (window.selectedSocietyGrade) {
            matchedRecords = matchedRecords.filter(r =>
                r.grade === window.selectedSocietyGrade || (r.grades && r.grades.includes(window.selectedSocietyGrade))
            );
        }
        if (window.selectedSocietyUnit) {
            matchedRecords = matchedRecords.filter(r => String(r.level).trim() === window.selectedSocietyUnit);
        }
        if (typeof window.startMissionWithFilteredData === 'function') {
            window.startMissionWithFilteredData(matchedRecords, innerBody);
        }
    }

    /**
     * 현재 단원 용어 마스터 기록 초기화
     */
    async function resetMasterAndReload() {
        if (!confirm("정말로 이 단원의 모든 용어 마스터(3회 정답) 기록을 지우고 처음부터 다시 시작할까요?")) {
            return;
        }

        const innerBody = document.getElementById('overlayInnerBody');
        if (innerBody) innerBody.innerHTML = "<div style='text-align:center; padding:40px;'>노션 데이터를 초기화 중입니다... ⏳</div>";

        const currentUserName = localStorage.getItem('currentUserName') || '민수';
        localStorage.removeItem(`society_voca_master_${currentUserName}`);
        window.societyVocaMasterCountMap = {};

        const matchedRecords = (window.allFetchedRecords || []).filter(r => 
            (r.grade === window.selectedSocietyGrade || (r.grades && r.grades.includes(window.selectedSocietyGrade))) &&
            String(r.level).trim() === window.selectedSocietyUnit &&
            r.isMastered === true
        );

        if (typeof window.updateVocaMasteryStatus === 'function') {
            for (const r of matchedRecords) {
                await window.updateVocaMasteryStatus(r.pageId, false);
                r.isMastered = false;
            }
        }

        alert("학습 기록이 노션에서 완전히 초기화되었습니다! 다시 신나게 풀어볼까요?");
        if (typeof window.closeMissionView === 'function') window.closeMissionView();
        setTimeout(() => {
            if (typeof window.openMissionView === 'function') window.openMissionView('voca');
        }, 300);
    }

    /**
     * 용어방 메인 화면 렌더링
     */
    function render(container, currentItem, activeQuizIdx, totalCount) {
        if (!container || !currentItem) return;

        const screenWrapper = document.createElement('div');
        screenWrapper.className = "screen loaded quiz-card";

        const orderType = window.societyVocaOrderType || 'shuffle';
        const orderToggleHtml = `
            <div style="display:flex; justify-content:center; align-items:center; margin-bottom: 20px;">
                <button class="order-toggle-btn" onclick="window.SocietyVoca.toggleOrder()" style="padding: 8px 16px; font-size: 1rem; border-radius: 20px; font-family: 'Jua', sans-serif; cursor: pointer; display: flex; align-items: center; gap: 8px;">
                    ${orderType === 'shuffle' ? '🎲 랜덤 섞기 모드 (클릭하여 순서대로 풀기로 변경)' : '➡️ 순서대로 풀기 모드 (클릭하여 랜덤 섞기로 변경)'}
                </button>
            </div>
        `;

        const passageText = currentItem.summaryPassage || "";
        const safePassageText = passageText.replace(/'/g, "\\'").replace(/"/g, "&quot;");
        const passageHtml = passageText ? `
            <div class="passage-summary-box">
                <div class="passage-header">
                    <span>📖 교과서 핵심 지문 돋보기</span>
                    <button class="quiz-button" style="padding:4px 10px; font-size:0.85rem; background:var(--purple);" onclick="window.speakFairyTTS('${safePassageText}')">🔊 지문 듣기</button>
                </div>
                <p style="font-size:0.95rem; line-height:1.5; color:inherit;">${passageText}</p>
            </div>
        ` : '';

        const answerWord = currentItem.word || "";
        const wordsArray = answerWord.trim().split(/\s+/);
        const wordCount = wordsArray.length;
        const totalLength = answerWord.length;

        let interactiveHtml = '';

        if (wordCount === 1 && totalLength > 5) {
            // 💡 긴 1단어: 낱말 카드 자석 빈칸 채우기
            const chars = answerWord.split('').filter(c => c.trim() !== '');
            const scrambled = [...chars].sort(() => Math.random() - 0.5);

            window.currentMagnetAnswer = [];
            window.magnetTargetWord = answerWord;
            window.magnetScrambled = scrambled;

            interactiveHtml = `
                <div id="magnet-blanks" style="font-size: 2rem; letter-spacing: 5px; margin-bottom: 20px; min-height: 40px; display: flex; justify-content: center; gap: 5px;">
                    ${answerWord.split('').map(c => c.trim() === '' ? '<span style="width:15px;"></span>' : '<span style="border-bottom:3px solid #ccc; width:30px; display:inline-block; text-align:center;">_</span>').join('')}
                </div>
                <div id="magnet-pool" style="display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-bottom: 20px;">
                    ${scrambled.map((l, i) => `<button id="magnet-btn-${i}" class="quiz-choice-btn" style="padding: 10px 20px; font-size: 1.5rem;" onclick="window.SocietyVoca.selectMagnet('${l}', ${i})">${l}</button>`).join('')}
                </div>
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button class="quiz-button" style="background:#ff9f43;" onclick="window.SocietyVoca.resetMagnets()">다시 조합하기</button>
                    <button class="quiz-button" onclick="window.SocietyVoca.verifyMagnet()">정답 확인</button>
                </div>
            `;
        } else if (wordCount >= 3) {
            // 💡 3단어 이상 긴 구문: 4지선다형 객관식
            const choices = [answerWord];
            const otherWords = (window.allFetchedRecords || []).filter(r => r.word !== answerWord).map(r => r.word);
            otherWords.sort(() => Math.random() - 0.5);
            choices.push(otherWords[0] || "오답1");
            choices.push(otherWords[1] || "오답2");
            choices.sort(() => Math.random() - 0.5);

            interactiveHtml = `
                <div class="quiz-choices-container" style="margin-bottom: 20px; display: flex; flex-direction: column; gap: 10px;">
                    ${choices.map((choice, i) => `
                         <button class="quiz-choice-btn" data-choice-index="${i}" onclick="window.SocietyVoca.handleChoiceClick(this)">${choice}</button>
                    `).join('')}
                </div>
            `;
            window._currentVocaChoices = choices;
        } else {
            // 💡 일반 낱말: 주관식 타이핑
            interactiveHtml = `
                <div class="interactive-input-group">
                    <input type="text" class="text-input-field" id="vocaAnswerInput" placeholder="정답 한글 낱말을 입력하세요!" onkeypress="if(event.key==='Enter') window.SocietyVoca.verifyAnswer()">
                    <button class="quiz-button" onclick="window.SocietyVoca.verifyAnswer()">정답 확인</button>
                </div>
            `;
        }

        const imageUrl = currentItem.imageUrl || currentItem.image;
        const imageHtml = imageUrl ? `
            <div class="chart-container-box">
                <div class="chart-ctrl-toolbar">
                    <div class="chart-ctrl-group">
                        <button class="card-zoom-btn" onclick="adjustCardZoom(0.4)" title="확대">➕ 확대</button>
                        <button class="card-zoom-btn" onclick="adjustCardZoom(-0.4)" title="축소">➖ 축소</button>
                        <button class="card-zoom-btn" onclick="rotateCardImage()" title="시계방향 90도 회전">🔄 90° 회전</button>
                        <button class="card-zoom-btn" onclick="resetCardZoom()" title="원래대로">🔄 원본</button>
                    </div>
                    <button class="card-zoom-btn card-popup-btn" onclick="openImageInNewWindow('${imageUrl}')" title="새 창으로 띄워서 보기">🪟 새창 열기</button>
                </div>
                <div class="chart-image-viewport" id="cardZoomViewport" ondragstart="return false;">
                    <img id="cardZoomImg" src="${imageUrl}" class="chart-img" alt="${currentItem.word}" onerror="this.closest('.chart-container-box').style.display='none';">
                </div>
            </div>
        ` : '';

        const safeMeaning = (currentItem.meaning || "").replace(/'/g, "\\'").replace(/"/g, "&quot;");

        screenWrapper.innerHTML = `
            ${orderToggleHtml}
            ${passageHtml}
            <div style="font-size: 0.95rem; opacity:0.7;">단어 ${activeQuizIdx + 1} / ${totalCount}</div>
            <div class="quiz-hint-box">초성 힌트: ${currentItem.hint || getChosung(currentItem.word)}</div>
            ${imageHtml}
            <div class="quiz-descr" style="font-size: 1.4rem; font-weight: bold;">${currentItem.meaning || ''}</div>
            <details class="hint-details" style="margin-bottom: 20px; text-align: left; border-radius: 10px; padding: 10px;">
                <summary style="cursor: pointer; font-weight: bold;">💡 상세설명 (힌트) 보기</summary>
                <div style="margin-top: 10px; font-size: 1rem; line-height: 1.5;">${currentItem.desc || ''}</div>
            </details>
            ${interactiveHtml}
            ${currentItem.interactiveUrl ? `
                <div style="text-align:center; margin-top: 10px; margin-bottom: 5px;">
                    <a href="${currentItem.interactiveUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-flex; align-items:center; gap:6px; color:#4f46e5; background:#eef2ff; border:1.5px solid #c7d2fe; border-radius:99px; padding:6px 16px; font-size:0.9rem; font-weight:bold; text-decoration:none;">
                        🏛️ 국립박물관 유물·역사관 공식 정보 보기 ↗
                    </a>
                </div>
            ` : ''}
            <div style="margin-top: 10px; display: flex; gap: 8px; justify-content: center;">
                <button class="quiz-button" style="background:#8b949e;" onclick="window.speakFairyTTS('${safeMeaning}')">🔊 문제 한번 더 듣기</button>
                <button class="quiz-button" style="background:var(--pink);" onclick="window.skipToNextQuiz('voca')">건너뛰기 ⏩</button>
            </div>
            <div style="text-align:center; margin-top:20px;">
                <button class="back-to-lobby-btn" style="background:#ffdd57; color:#555; padding: 8px 16px; font-size: 0.9rem;" onclick="window.SocietyVoca.resetMasterAndReload()">🔄 학습 리셋하기</button>
            </div>
        `;

        container.appendChild(screenWrapper);
        if (imageUrl && typeof window.initCardZoomListeners === 'function') {
            window.initCardZoomListeners();
        }

        if (typeof window.speakFairyTTS === 'function') {
            window.speakFairyTTS(currentItem.meaning);
        }
    }

    /**
     * 객관식 보기 클릭 이벤트 핸들러 (따옴표 파괴 방지)
     */
    function handleChoiceClick(btnEl) {
        if (!btnEl) return;
        const idx = parseInt(btnEl.getAttribute('data-choice-index'), 10);
        const choices = window._currentVocaChoices || [];
        const selectedWord = choices[idx] || btnEl.textContent.trim();
        verifyChoice(selectedWord);
    }

    /**
     * 정답 채점 완료 처리
     */
    async function handleCorrect() {
        const activeData = window.activeSectionData || [];
        const activeIdx = window.activeQuizIdx || 0;
        const curItem = activeData[activeIdx];
        if (!curItem) return;

        const currentUserName = localStorage.getItem('currentUserName') || '민수';
        const wordKey = curItem.word;
        if (!window.societyVocaMasterCountMap) window.societyVocaMasterCountMap = {};
        window.societyVocaMasterCountMap[wordKey] = (window.societyVocaMasterCountMap[wordKey] || 0) + 1;
        localStorage.setItem(`society_voca_master_${currentUserName}`, JSON.stringify(window.societyVocaMasterCountMap));

        // 3회 정답 시 노션 DB [달성] true 마킹
        if (window.societyVocaMasterCountMap[wordKey] >= 3 && curItem.pageId) {
            if (typeof window.updateVocaMasteryStatus === 'function') {
                window.updateVocaMasteryStatus(curItem.pageId, true);
                curItem.isMastered = true;
            }
        }

        if (typeof window.rewardQuizCorrect === 'function') {
            await window.rewardQuizCorrect(activeIdx);
        }

        const expl = curItem ? `<strong>${curItem.word}</strong>: ${curItem.meaning || curItem.desc || ''}` : null;
        if (typeof window.triggerQuizAdvance === 'function') {
            window.triggerQuizAdvance({
                onAdvance: () => window.skipToNextQuiz('voca'),
                delayMs: 1200,
                subject: '사회',
                explanation: expl
            });
        } else {
            setTimeout(() => window.skipToNextQuiz('voca'), 1200);
        }
    }

    /**
     * 오답 피드백 처리
     */
    function handleWrong(wrongInput, onRetryReset) {
        if (typeof window.wrongNotes === 'undefined') window.wrongNotes = [];
        const activeData = window.activeSectionData || [];
        const activeIdx = window.activeQuizIdx || 0;
        const curWord = activeData[activeIdx] ? activeData[activeIdx].word : '문제';

        window.wrongNotes.push({
            word: curWord,
            wrongInput: wrongInput
        });

        const retry = typeof onRetryReset === 'function' ? onRetryReset : () => {};
        const skip = () => window.skipToNextQuiz('voca');

        if (typeof window.promptQuizRetryOrSkip === 'function') {
            const activeItem = activeData[activeIdx] || null;
            window.promptQuizRetryOrSkip({
                onRetry: retry,
                onSkip: skip,
                word: activeItem?.word || curWord,
                subject: '사회',
                meaning: activeItem?.meaning || activeItem?.desc || null,
                hint: activeItem?.hint || null
            });
            return;
        }

        if (typeof window.speakFairyTTS === 'function') {
            window.speakFairyTTS("아쉽다. 다시 한번 생각해봐!");
        }
        retry();
    }

    /**
     * 주관식 타이핑 정답 확인
     */
    function verifyAnswer() {
        const input = document.getElementById('vocaAnswerInput');
        if (!input) return;
        const activeData = window.activeSectionData || [];
        const activeIdx = window.activeQuizIdx || 0;
        const curItem = activeData[activeIdx];
        if (!curItem) return;

        const answer = input.value.trim().replace(/\s/g, '');
        const correctTarget = (curItem.word || '').replace(/\s/g, '');

        if (answer === correctTarget) {
            input.classList.add('correct-glow');
            if (typeof window.speakFairyTTS === 'function') window.speakFairyTTS("정답이야! 아주 잘했어!");
            handleCorrect();
        } else {
            input.classList.add('wrong-shake');
            handleWrong(input.value, () => {
                input.classList.remove('wrong-shake');
                input.value = '';
                input.focus();
            });
        }
    }

    /**
     * 객관식 보기 검증
     */
    function verifyChoice(selectedWord) {
        const activeData = window.activeSectionData || [];
        const activeIdx = window.activeQuizIdx || 0;
        const curItem = activeData[activeIdx];
        if (!curItem) return;

        if (selectedWord === curItem.word) {
            if (typeof window.speakFairyTTS === 'function') window.speakFairyTTS("정답이야! 아주 잘했어!");
            handleCorrect();
        } else {
            handleWrong(selectedWord, () => {});
        }
    }

    /**
     * 자석 글자 선택
     */
    function selectMagnet(letter, idx) {
        const btn = document.getElementById(`magnet-btn-${idx}`);
        if (!btn || btn.style.visibility === 'hidden') return;
        btn.style.visibility = 'hidden';
        if (!window.currentMagnetAnswer) window.currentMagnetAnswer = [];
        window.currentMagnetAnswer.push({ letter, idx });
        renderMagnetBlanks();
    }

    /**
     * 자석 빈칸 갱신
     */
    function renderMagnetBlanks() {
        const container = document.getElementById('magnet-blanks');
        if (!container || !window.magnetTargetWord) return;
        let html = '';
        let answerIdx = 0;
        for (let i = 0; i < window.magnetTargetWord.length; i++) {
            const char = window.magnetTargetWord[i];
            if (char.trim() === '') {
                html += '<span style="width:15px;"></span>';
            } else {
                if (window.currentMagnetAnswer && answerIdx < window.currentMagnetAnswer.length) {
                    html += `<span style="border-bottom:3px solid var(--primary); width:30px; display:inline-block; text-align:center; color:var(--primary); font-weight:bold;">${window.currentMagnetAnswer[answerIdx].letter}</span>`;
                    answerIdx++;
                } else {
                    html += '<span style="border-bottom:3px solid #ccc; width:30px; display:inline-block; text-align:center;">_</span>';
                }
            }
        }
        container.innerHTML = html;
    }

    /**
     * 자석 글자 리셋
     */
    function resetMagnets() {
        if (Array.isArray(window.currentMagnetAnswer)) {
            window.currentMagnetAnswer.forEach(item => {
                const btn = document.getElementById(`magnet-btn-${item.idx}`);
                if (btn) btn.style.visibility = 'visible';
            });
        }
        window.currentMagnetAnswer = [];
        renderMagnetBlanks();
    }

    /**
     * 자석 조합 정답 확인
     */
    function verifyMagnet() {
        const answerStr = (window.currentMagnetAnswer || []).map(item => item.letter).join('');
        const correctTarget = (window.magnetTargetWord || '').replace(/\s/g, '');

        if (answerStr === correctTarget) {
            if (typeof window.speakFairyTTS === 'function') window.speakFairyTTS("정답이야! 아주 잘했어!");
            handleCorrect();
        } else {
            handleWrong(answerStr, () => {
                resetMagnets();
                const container = document.getElementById('magnet-blanks');
                if (container) container.classList.remove('wrong-shake');
            });
            const container = document.getElementById('magnet-blanks');
            if (container) container.classList.add('wrong-shake');
        }
    }

    // 네임스페이스 노출 및 전역 브릿지
    window.SocietyVoca = {
        getChosung,
        toggleOrder,
        resetMasterAndReload,
        render,
        handleChoiceClick,
        handleCorrect,
        handleWrong,
        verifyAnswer,
        verifyChoice,
        selectMagnet,
        renderMagnetBlanks,
        resetMagnets,
        verifyMagnet
    };

    window.getChosung = getChosung;
    window.societyToggleOrder = toggleOrder;
    window.resetSocietyVocaMasterAndReload = resetMasterAndReload;
    window.handleVocaCorrect = handleCorrect;
    window.handleVocaWrong = handleWrong;
    window.verifyVocaAnswer = verifyAnswer;
    window.verifyVocaChoice = verifyChoice;
    window.selectVocaMagnet = selectMagnet;
    window.renderVocaMagnetBlanks = renderMagnetBlanks;
    window.resetVocaMagnets = resetMagnets;
    window.verifyVocaMagnet = verifyMagnet;
})();
