// kids/js/korean_voca.js
// 📚 [3단계] 국어 어휘 퀴즈 훈련소 전담 엔진 (골디락스 모듈)
// - 전사 거버넌스 헌법(규칙 7조) 준수: 단일 책임 완성형 모듈
// - 객관식(단어->뜻)/주관식(뜻->단어, 자석/선택/입력 하이브리드) 퀴즈 렌더링 및 채점·힌트 총괄

(function() {
    'use strict';

    let koreanVocaMode = 'choice'; // 'choice' or 'subjective'
    let koreanVocaOrderType = 'shuffle'; // 'shuffle' or 'sequence'

    function setKoreanVocaMode(mode) {
        koreanVocaMode = mode;
        if (typeof window.koreanVocaMode !== 'undefined') {
            window.koreanVocaMode = mode;
        }
        if (typeof window.renderSectionUI === 'function') {
            window.renderSectionUI();
        } else {
            const container = document.getElementById('overlayInnerBody');
            if (container) renderVocaUI(container);
        }
    }

    function getOrderToggleHtml(orderType) {
        if (typeof window.getKoreanOrderToggleHtml === 'function') {
            return window.getKoreanOrderToggleHtml(orderType);
        }
        return `
            <div style="display:flex; justify-content:center; align-items:center; margin-bottom: 20px;">
                <button class="quiz-button" onclick="window.koreanToggleQuizOrder()" style="padding: 8px 16px; font-size: 0.95rem; border-radius: 20px;">
                    ${orderType === 'shuffle' ? '🎲 랜덤 섞기 (클릭하여 순서대로)' : '➡️ 순서대로 (클릭하여 랜덤 섞기)'}
                </button>
            </div>
        `;
    }

    function advanceQuiz(delayMs) {
        if (typeof window.advanceKoreanQuizAfterCorrect === 'function') {
            window.advanceKoreanQuizAfterCorrect(delayMs);
        } else {
            if (typeof window.activeQuizIdx !== 'undefined') window.activeQuizIdx++;
            if (typeof window.renderSectionUI === 'function') setTimeout(window.renderSectionUI, delayMs || 1000);
        }
    }

    function reportWrong(note, onRetry) {
        if (typeof window.promptKoreanWrong === 'function') {
            window.promptKoreanWrong(note, onRetry);
        } else {
            if (typeof window.speakFairyTTS === 'function') {
                window.speakFairyTTS("아쉽지만 틀렸어요. 다시 한번 생각해볼까요?");
            }
            if (typeof onRetry === 'function') onRetry();
        }
    }

    function renderVocaUI(container) {
        const activeData = window.activeSectionData || [];
        const activeIdx = window.activeQuizIdx || 0;
        const currentItem = activeData[activeIdx];
        if (!currentItem) return;

        const allRecords = window.allFetchedRecords || [];
        const imageUrl = currentItem.imageUrl || currentItem.image;
        const imageHtml = imageUrl ? `
            <div style="text-align:center; margin-bottom:15px;">
                <img src="${imageUrl}" style="max-width:100%; max-height:200px; border-radius:10px; box-shadow:0 4px 8px rgba(0,0,0,0.2); object-fit:contain;" alt="${currentItem.word}">
            </div>
        ` : '';

        const orderType = window.koreanVocaOrderType || koreanVocaOrderType;
        const orderToggleHtml = getOrderToggleHtml(orderType);

        // 상단 토글 탭 UI
        const currentMode = window.koreanVocaMode || koreanVocaMode;
        const toggleHtml = `
            ${orderToggleHtml}
            <div style="display:flex; justify-content:center; gap:10px; margin-bottom:20px;">
                <button class="quiz-button" style="background: ${currentMode === 'subjective' ? 'var(--purple)' : '#ccc'}; color: white; padding: 8px 16px; border-radius: 20px; font-size: 0.95rem;" onclick="setKoreanVocaMode('subjective')">✏️ 단어 맞추기 (주관식)</button>
                <button class="quiz-button" style="background: ${currentMode === 'choice' ? 'var(--purple)' : '#ccc'}; color: white; padding: 8px 16px; border-radius: 20px; font-size: 0.95rem;" onclick="setKoreanVocaMode('choice')">🧐 뜻 고르기 (객관식)</button>
            </div>
        `;

        let quizContentHtml = '';

        if (currentMode === 'subjective') {
            // [✏️ 단어 맞추기 (주관식)]
            // 노션 데이터의 '뜻풀이'가 문제 텍스트로 출제되고, 하단 UI는 단어 구조에 따라 동적 변환
            const answerWord = (currentItem.word || '').trim();
            const wordsArray = answerWord.split(/\s+/);
            const wordCount = wordsArray.length;
            const totalLength = answerWord.length;

            let interactiveHtml = '';

            if (wordCount === 1 && totalLength > 5) {
                // 💡 조건 1: 띄어쓰기 없는 '1개 단어'인데 5글자가 넘는 경우 -> 자석 UI (빈칸 채우기)
                const chars = answerWord.split('').filter(c => c.trim() !== '');
                const scrambled = [...chars].sort(() => Math.random() - 0.5);

                window.currentKoreanMagnetAnswer = [];
                window.koreanMagnetTargetWord = answerWord;

                window.selectKoreanVocaMagnet = function(letter, idx) {
                    const btn = document.getElementById(`korean-magnet-btn-${idx}`);
                    if (!btn || btn.style.visibility === 'hidden') return;
                    btn.style.visibility = 'hidden';
                    window.currentKoreanMagnetAnswer.push({ letter, idx });
                    window.renderKoreanVocaMagnetBlanks();
                };

                window.renderKoreanVocaMagnetBlanks = function() {
                    const bContainer = document.getElementById('korean-magnet-blanks');
                    if (!bContainer) return;
                    let html = '';
                    let answerIdx = 0;
                    for (let i = 0; i < window.koreanMagnetTargetWord.length; i++) {
                        const char = window.koreanMagnetTargetWord[i];
                        if (char.trim() === '') {
                            html += '<span style="width:15px;"></span>';
                        } else {
                            if (answerIdx < window.currentKoreanMagnetAnswer.length) {
                                html += `<span style="border-bottom:3px solid var(--purple); width:30px; display:inline-block; text-align:center; color:var(--purple); font-weight:bold;">${window.currentKoreanMagnetAnswer[answerIdx].letter}</span>`;
                                answerIdx++;
                            } else {
                                html += '<span style="border-bottom:3px solid #ccc; width:30px; display:inline-block; text-align:center;">_</span>';
                            }
                        }
                    }
                    bContainer.innerHTML = html;
                };

                window.resetKoreanVocaMagnets = function() {
                    window.currentKoreanMagnetAnswer.forEach(item => {
                        const btn = document.getElementById(`korean-magnet-btn-${item.idx}`);
                        if (btn) btn.style.visibility = 'visible';
                    });
                    window.currentKoreanMagnetAnswer = [];
                    window.renderKoreanVocaMagnetBlanks();
                };

                window.verifyKoreanVocaMagnet = function() {
                    const answerStr = window.currentKoreanMagnetAnswer.map(item => item.letter).join('');
                    const correctTarget = window.koreanMagnetTargetWord.replace(/\s/g, '');

                    if (answerStr === correctTarget) {
                        if (typeof window.speakFairyTTS === 'function') window.speakFairyTTS("정답이에요! 아주 훌륭해요!");
                        advanceQuiz(1000);
                    } else {
                        const bContainer = document.getElementById('korean-magnet-blanks');
                        if (bContainer) bContainer.classList.add('wrong');
                        reportWrong(
                            { word: currentItem.word, wrongInput: answerStr },
                            () => {
                                if (bContainer) bContainer.classList.remove('wrong');
                                if (typeof window.resetKoreanVocaMagnets === 'function') window.resetKoreanVocaMagnets();
                            }
                        );
                    }
                };

                interactiveHtml = `
                    <div id="korean-magnet-blanks" style="font-size: 2rem; letter-spacing: 5px; margin-bottom: 20px; min-height: 40px; display: flex; justify-content: center; gap: 5px;">
                        ${answerWord.split('').map(c => c.trim() === '' ? '<span style="width:15px;"></span>' : '<span style="border-bottom:3px solid #ccc; width:30px; display:inline-block; text-align:center;">_</span>').join('')}
                    </div>
                    <div id="korean-magnet-pool" style="display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-bottom: 20px;">
                        ${scrambled.map((l, i) => `<button id="korean-magnet-btn-${i}" class="quiz-choice-btn" style="padding: 10px 20px; font-size: 1.5rem;" onclick="selectKoreanVocaMagnet('${l}', ${i})">${l}</button>`).join('')}
                    </div>
                    <div style="display:flex; gap:10px; justify-content:center; margin-top:20px;">
                        <button class="quiz-button" style="background:#ff9f43;" onclick="resetKoreanVocaMagnets()">다시 조합하기</button>
                        <button class="quiz-button" onclick="verifyKoreanVocaMagnet()">정답 확인</button>
                        <button class="quiz-button" style="background:#8b949e;" onclick="speakFairyTTS('${(currentItem.meaning || '').replace(/'/g, "\\'")}')">🔊 문제 듣기</button>
                        <button class="quiz-button" style="background:var(--pink);" onclick="activeQuizIdx++; renderSectionUI();">건너뛰기 ⏩</button>
                    </div>
                `;
            } else if (wordCount >= 3) {
                // 💡 조건 2: 3단어 이상 결합된 경우 -> 객관식 문제 UI
                const choices = [answerWord];
                const otherWords = allRecords.filter(r => r.word !== answerWord).map(r => r.word);
                otherWords.sort(() => Math.random() - 0.5);
                choices.push(otherWords[0] || "오답 1");
                choices.push(otherWords[1] || "오답 2");
                choices.sort(() => Math.random() - 0.5);

                window.verifyKoreanVocaSubjectiveChoice = function(selectedWord) {
                    if (selectedWord === answerWord) {
                        if (typeof window.speakFairyTTS === 'function') window.speakFairyTTS("정답이에요! 아주 훌륭해요!");
                        advanceQuiz(1000);
                    } else {
                        reportWrong(
                            { word: currentItem.word, wrongInput: selectedWord },
                            () => {}
                        );
                    }
                };

                interactiveHtml = `
                    <div class="quiz-choices-container" style="margin-bottom: 20px; display: flex; flex-direction: column; gap: 10px;">
                        ${choices.map(choice => `
                             <button class="quiz-choice-btn" style="text-align:left; line-height:1.4;" onclick="verifyKoreanVocaSubjectiveChoice('${choice.replace(/'/g, "\\'")}')">${choice}</button>
                        `).join('')}
                    </div>
                    <div style="display:flex; gap:10px; justify-content:center; margin-top:20px;">
                        <button class="quiz-button" style="background:#8b949e;" onclick="speakFairyTTS('${(currentItem.meaning || '').replace(/'/g, "\\'")}')">🔊 문제 듣기</button>
                        <button class="quiz-button" style="background:var(--pink);" onclick="activeQuizIdx++; renderSectionUI();">건너뛰기 ⏩</button>
                    </div>
                `;
            } else {
                // 💡 조건 3: 그 외의 경우 -> 기존 주관식 타이핑 UI
                window.verifyKoreanVocaSubjective = function() {
                    const inputEl = document.getElementById('vocaSubjectiveInput');
                    if (!inputEl) return;
                    const inputVal = inputEl.value.trim().replace(/\s/g, '');
                    const correctTarget = answerWord.replace(/\s/g, '');
                    if (inputVal === correctTarget) {
                        if (typeof window.speakFairyTTS === 'function') window.speakFairyTTS("정답이에요! 아주 훌륭해요!");
                        inputEl.classList.add('correct');
                        advanceQuiz(1000);
                    } else {
                        inputEl.classList.add('wrong');
                        reportWrong(
                            { word: currentItem.word, wrongInput: inputVal },
                            () => {
                                inputEl.classList.remove('wrong');
                                inputEl.value = '';
                                inputEl.focus();
                            }
                        );
                    }
                };

                interactiveHtml = `
                    <div class="interactive-input-group" style="margin-bottom: 20px;">
                        <input id="vocaSubjectiveInput" class="text-input-field" type="text" autocomplete="off" placeholder="정답 단어를 입력하세요!" onkeypress="if(event.key === 'Enter') verifyKoreanVocaSubjective()" style="width:100%;">
                    </div>
                    
                    <div style="display:flex; gap:10px; justify-content:center; margin-top:20px;">
                        <button class="quiz-button" onclick="verifyKoreanVocaSubjective()">정답 확인</button>
                        <button class="quiz-button" style="background:#8b949e;" onclick="speakFairyTTS('${(currentItem.meaning || '').replace(/'/g, "\\'")}')">🔊 문제 듣기</button>
                        <button class="quiz-button" style="background:var(--pink);" onclick="activeQuizIdx++; renderSectionUI();">건너뛰기 ⏩</button>
                    </div>
                `;
            }

            quizContentHtml = `
                <div class="quiz-descr" style="font-size: 1.5rem; font-weight: bold; color: var(--purple); margin-bottom: 20px;">${currentItem.meaning}</div>
                <div style="margin-bottom: 20px; color: #666;">이 뜻풀이에 알맞은 단어를 적어보세요!</div>
                ${interactiveHtml}
            `;
        } else {
            // [🧐 뜻 고르기 (객관식)]
            // 노션 데이터의 '단어명'이 문제로 출제되고, 하단 UI는 객관식 3지선다(정답은 뜻풀이)
            const answerMeaning = currentItem.meaning;
            const choices = [answerMeaning];
            const otherMeanings = allRecords.filter(r => r.meaning && r.meaning !== answerMeaning).map(r => r.meaning);
            otherMeanings.sort(() => Math.random() - 0.5);
            choices.push(otherMeanings[0] || "전혀 관계없는 뜻입니다.");
            choices.push(otherMeanings[1] || "다른 단어의 뜻입니다.");
            choices.sort(() => Math.random() - 0.5);

            window.verifyKoreanVocaChoice = function(selectedMeaning) {
                if (selectedMeaning === answerMeaning) {
                    if (typeof window.speakFairyTTS === 'function') window.speakFairyTTS("정답이에요! 아주 훌륭해요!");
                    advanceQuiz(1000);
                } else {
                    reportWrong(
                        { word: currentItem.word, wrongInput: selectedMeaning },
                        () => {}
                    );
                }
            };

            quizContentHtml = `
                <div class="quiz-descr" style="font-size: 2.2rem; font-weight: bold; color: var(--purple); margin-bottom: 20px;">${currentItem.word}</div>
                <div style="margin-bottom: 20px; color: #666;">이 단어의 올바른 뜻을 골라보세요!</div>
                
                <div class="quiz-choices-container" style="margin-bottom: 20px;">
                    ${choices.map(choice => `
                         <button class="quiz-choice-btn" style="text-align:left; line-height:1.4;" onclick="verifyKoreanVocaChoice('${(choice || '').replace(/'/g, "\\'")}')">${choice}</button>
                    `).join('')}
                </div>
                
                <div style="display:flex; gap:10px; justify-content:center; margin-top:20px;">
                    <button class="quiz-button" style="background:#8b949e;" onclick="speakFairyTTS('${(currentItem.word || '').replace(/'/g, "\\'")}')">🔊 단어 듣기</button>
                    <button class="quiz-button" style="background:var(--pink);" onclick="activeQuizIdx++; renderSectionUI();">건너뛰기 ⏩</button>
                </div>
            `;
        }

        container.innerHTML = `
            <div class="quiz-card">
                <div style="font-size: 0.95rem; opacity:0.7; margin-bottom: 15px;">단어 ${activeIdx + 1} / ${activeData.length}</div>
                ${toggleHtml}
                ${imageHtml}
                ${quizContentHtml}
            </div>
        `;

        // 자동 낭독
        if (typeof window.speakFairyTTS === 'function') {
            if (currentMode === 'subjective') {
                window.speakFairyTTS(currentItem.meaning);
            } else {
                window.speakFairyTTS(currentItem.word);
            }
        }
    }

    // 🌐 전역 네임스페이스 및 하위 호환 브리지
    window.KoreanVoca = {
        renderUI: renderVocaUI,
        setMode: setKoreanVocaMode,
        getOrderToggleHtml: getOrderToggleHtml
    };

    window.renderVocaUI = renderVocaUI;
    window.setKoreanVocaMode = setKoreanVocaMode;

})();
