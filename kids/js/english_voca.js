// kids/js/english_voca.js
// 🧩 [2·3·4단계] 초등 영어 어휘·문장 훈련소 모듈 (EnglishVoca)
// - [2단계] 단어 퐁당 (3지선다 콕 터치 & 소리 듣기)
// - [3단계] 영단어/숙어방 (4종 모드 + 슬라임 철자 자석판)
// - [4단계] 문장 조각 맞추기 (단어 블록 카드 순서 배열 + 1:1 파닉스 성공 카드)
// - 네임스페이스: window.EnglishVoca

(function() {
    'use strict';

    let vocaPoolQuizMode = 'meaning'; // 'meaning' (단어 보고 뜻) or 'listening' (소리 듣고 뜻)
    let stage3QuizMode = null; // 'copy', 'toEnglish', 'toKorean', 'listening'

    const STAGE3_MODES = [
        { id: 'copy', icon: '✏️', label: '보고 따라 적기', desc: '영어를 보고 똑같이 써요' },
        { id: 'toEnglish', icon: '🇺🇸', label: '한글 → 영어', desc: '뜻을 보고 영단어를 써요' },
        { id: 'toKorean', icon: '🇰🇷', label: '영어 → 한글', desc: '영어를 보고 한글 뜻을 써요' },
        { id: 'listening', icon: '🎧', label: '듣고 적기', desc: '소리를 듣고 영단어를 써요' },
    ];

    function safeEscape(str) {
        if (!str) return '';
        return String(str).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    }

    // ========================================================
    // 🔤 [2단계] 단어 퐁당 (3지선다 콕 터치 & 소리 듣기)
    // ========================================================
    function setVocaPoolMode(mode, onUpdate) {
        vocaPoolQuizMode = mode;
        if (typeof onUpdate === 'function') onUpdate();
        else if (typeof window.renderSectionUI === 'function') window.renderSectionUI();
    }

    function renderVocaPoolUI(container, currentItem, helpers = {}) {
        if (!currentItem) return;
        const answerWord = currentItem.word.trim();
        const answerMeaning = (currentItem.meaning || '').trim();

        const imageUrl = currentItem.imageUrl || currentItem.image;
        const imageHtml = imageUrl ? `
            <div style="text-align:center; margin-bottom:15px;">
                <img src="${imageUrl}" style="max-width:100%; max-height:180px; border-radius:12px; box-shadow:0 4px 10px rgba(0,0,0,0.15); object-fit:contain;" alt="${answerWord}">
            </div>
        ` : '';

        // 3지선다 객관식 보기 생성 (정답 1개 + 오답 2개)
        const choices = [answerMeaning];
        const allRecords = helpers.allRecords || [];
        const otherMeanings = allRecords
            .filter(r => r.meaning && r.meaning.trim() !== answerMeaning)
            .map(r => r.meaning.trim());
        otherMeanings.sort(() => Math.random() - 0.5);
        choices.push(otherMeanings[0] || "신나는 놀이");
        choices.push(otherMeanings[1] || "맛있는 간식");
        choices.sort(() => Math.random() - 0.5);

        window.verifyVocaPoolChoice = function(selectedMeaning) {
            if (selectedMeaning === answerMeaning) {
                if (typeof window.speakFairyTTS === 'function') window.speakFairyTTS("정답이에요! 아주 잘 맞혔어요!");
                if (typeof window.speakEnglish === 'function') window.speakEnglish(answerWord);
                if (typeof helpers.advanceQuiz === 'function') helpers.advanceQuiz(1000);
            } else {
                if (typeof helpers.recordWrong === 'function') helpers.recordWrong(currentItem, selectedMeaning);
                if (typeof helpers.promptWrong === 'function') helpers.promptWrong(() => {});
            }
        };

        const toggleHtml = `
            <div style="display:flex; justify-content:center; gap:8px; margin-bottom:16px;">
                <button class="quiz-button" style="background:${vocaPoolQuizMode === 'meaning' ? 'var(--primary)' : '#e2e8f0'}; color:${vocaPoolQuizMode === 'meaning' ? '#fff' : '#475569'}; padding:7px 16px; border-radius:20px; font-size:0.9rem; font-family:'Jua',sans-serif;" onclick="window.EnglishVoca.setVocaPoolMode('meaning')">
                    🧐 뜻 맞추기 (단어 보기)
                </button>
                <button class="quiz-button" style="background:${vocaPoolQuizMode === 'listening' ? 'var(--primary)' : '#e2e8f0'}; color:${vocaPoolQuizMode === 'listening' ? '#fff' : '#475569'}; padding:7px 16px; border-radius:20px; font-size:0.9rem; font-family:'Jua',sans-serif;" onclick="window.EnglishVoca.setVocaPoolMode('listening')">
                    🎧 소리 듣고 맞추기 (귀 쫑긋)
                </button>
            </div>
        `;

        const safeWordEscaped = safeEscape(answerWord);

        let displayContentHtml = '';
        if (vocaPoolQuizMode === 'listening') {
            displayContentHtml = `
                <div style="font-size: 4.5rem; margin: 10px 0; cursor: pointer; animation: bounceObj 2s infinite;" onclick="window.speakEnglish('${safeWordEscaped}')">
                    🎧
                </div>
                ${typeof window.getEnglishSpeechRateChipsHtml === 'function' ? window.getEnglishSpeechRateChipsHtml() : ''}
                <div style="font-size: 1.05rem; color: #64748b; margin-bottom: 20px;">
                    원어민 소리를 잘 듣고, 알맞은 뜻을 골라보세요!
                </div>
            `;
        } else {
            displayContentHtml = `
                <div class="quiz-descr" style="font-size: 2.5rem; font-weight: bold; color: var(--primary); margin: 8px 0 14px;">
                    ${answerWord}
                </div>
                <div style="font-size: 1.05rem; color: #64748b; margin-bottom: 20px;">
                    이 단어의 알맞은 우리말 뜻을 골라보세요!
                </div>
            `;
        }

        container.innerHTML = `
            <div class="quiz-card">
                ${helpers.orderToggleHtml || ''}
                <div style="font-size: 0.95rem; opacity:0.7; margin-bottom: 12px;">단어 퐁당 ${helpers.currentIdx + 1} / ${helpers.totalCount}</div>
                ${toggleHtml}
                ${imageHtml}
                ${displayContentHtml}
                
                <div class="quiz-choices-container" style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px;">
                    ${choices.map(choice => {
                        const safeChoice = safeEscape(choice);
                        return `
                            <button class="quiz-choice-btn" style="padding: 16px 20px; font-size: 1.2rem; text-align: center; border-radius: 16px; line-height: 1.4; transition: all 0.2s;" onclick="verifyVocaPoolChoice('${safeChoice}')">
                                ${choice}
                            </button>
                        `;
                    }).join('')}
                </div>
                
                <div style="display:flex; gap:10px; justify-content:center; margin-top:15px;">
                    <button class="quiz-button" style="background:#64748b; color:white;" onclick="window.speakEnglish('${safeWordEscaped}')">
                        🔊 원어민 소리 다시 듣기
                    </button>
                    <button class="quiz-button" style="background:var(--pink); color:white;" onclick="if(typeof window.skipEnglishQuestion==='function') window.skipEnglishQuestion(); else { window.activeQuizIdx++; window.renderSectionUI(); }">
                        건너뛰기 ⏩
                    </button>
                </div>
            </div>
        `;

        setTimeout(() => {
            if (typeof window.speakEnglish === 'function') window.speakEnglish(answerWord);
        }, 400);
    }

    // ========================================================
    // 📝 [3단계] 영단어/숙어방 (4종 모드 + 슬라임 철자 자석판)
    // ========================================================
    function generateStage3Hint(word) {
        let hint = "";
        for (let i = 0; i < word.length; i++) {
            if (word[i] === " ") hint += "  ";
            else if (i % 2 === 0) hint += word[i] + " ";
            else hint += "_ ";
        }
        return hint.trim();
    }

    function checkStage3Answer(inputVal, answerWord, currentItem) {
        const normalized = inputVal.trim().toLowerCase();
        if (stage3QuizMode === 'toKorean') {
            const meaning = (currentItem.meaning || '').replace(/ /g, '');
            const user = inputVal.replace(/ /g, '');
            return meaning.includes(user) && user !== '';
        }
        return normalized === answerWord.toLowerCase().trim();
    }

    function renderStage3ModeSelectUI(container, helpers = {}) {
        const modeButtons = STAGE3_MODES.map(m => `
            <button class="quiz-choice-btn" style="padding:18px 10px; display:flex; flex-direction:column; align-items:center; gap:6px; min-height:110px;" onclick="window.EnglishVoca.selectStage3Mode('${m.id}')">
                <span style="font-size:2rem;">${m.icon}</span>
                <span style="font-size:1.05rem; font-weight:bold;">${m.label}</span>
                <span style="font-size:0.82rem; opacity:0.75; line-height:1.3;">${m.desc}</span>
            </button>
        `).join('');

        container.innerHTML = `
            <div style="text-align:center; padding:10px 0 20px;">
                ${helpers.orderToggleHtml || ''}
                <h3 style="color:var(--primary); margin-bottom:8px;">🎯 연습 방식을 선택하세요!</h3>
                <p style="font-size:0.95rem; color:#666; margin-bottom:18px;">
                    ${helpers.infoText ? `[${helpers.infoText}] ` : ''}총 ${helpers.totalCount || 10}문제
                </p>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:16px;">
                    ${modeButtons}
                </div>
                <button class="quiz-button" style="background:#8b949e; width:100%;" onclick="openMissionView('stage3')">⬅️ 학년/단원 다시 고르기</button>
            </div>
        `;
    }

    function selectStage3Mode(mode) {
        stage3QuizMode = mode;
        if (typeof window.activeQuizIdx !== 'undefined') window.activeQuizIdx = 0;
        if (typeof window.renderSectionUI === 'function') window.renderSectionUI();
    }

    function showStage3ModeSelect() {
        stage3QuizMode = null;
        if (typeof window.stopFairyTTS === 'function') window.stopFairyTTS();
        if (typeof window.renderSectionUI === 'function') window.renderSectionUI();
    }

    function renderStage3UI(container, currentItem, helpers = {}) {
        if (!stage3QuizMode) {
            renderStage3ModeSelectUI(container, helpers);
            return;
        }
        if (!currentItem) return;

        const answerWord = currentItem.word.trim();
        const wordsArray = answerWord.split(/\s+/);
        const wordCount = wordsArray.length;
        const totalLength = answerWord.length;
        const mode = stage3QuizMode;
        const expectsEnglish = mode !== 'toKorean';

        const modeMeta = {
            copy: {
                display: answerWord,
                sub: '영어 단어를 보고 똑같이 적으며 한글 뜻도 익혀보세요!',
                placeholder: '똑같이 적어봐!',
                autoSpeak: true,
            },
            toEnglish: {
                display: currentItem.meaning,
                sub: '이 뜻에 맞는 영단어를 맞춰보세요!',
                placeholder: '영어 단어를 입력하세요!',
                autoSpeak: false,
                showHint: true,
            },
            toKorean: {
                display: answerWord,
                sub: '영어 단어의 한글 뜻을 적어보세요!',
                placeholder: '한글 뜻을 입력하세요!',
                autoSpeak: true,
            },
            listening: {
                display: '🎧',
                sub: '소리를 듣고 영단어를 적어보세요!',
                placeholder: '들은 단어를 입력하세요!',
                autoSpeak: true,
                showHint: true,
                listening: true,
            },
        }[mode] || {
            display: currentItem.meaning,
            sub: '이 뜻에 맞는 영단어를 맞춰보세요!',
            placeholder: '영어 단어를 입력하세요!',
        };

        const imageUrl = currentItem.imageUrl || currentItem.image;
        const imageHtml = imageUrl ? `
            <div style="text-align:center; margin-bottom:15px;">
                <img src="${imageUrl}" style="max-width:100%; max-height:200px; border-radius:10px; box-shadow:0 4px 8px rgba(0,0,0,0.2); object-fit:contain;" alt="${answerWord}">
            </div>
        ` : '';

        let hintHtml = '';
        if (modeMeta.showHint) {
            hintHtml = `<div style="font-size:1.1rem; color:var(--pink); letter-spacing:3px; margin-bottom:12px;">${generateStage3Hint(answerWord)}</div>`;
        }
        if (mode === 'toEnglish' && currentItem.detailContext && currentItem.detailContext.trim()) {
            hintHtml += `
                <details style="margin-bottom:16px; text-align:left; background:#f8f9fa; border-radius:10px; padding:10px; border:1px solid #ddd; font-size:0.95rem;">
                    <summary style="cursor:pointer; font-weight:bold; color:var(--purple);">💡 상세설명 (힌트) 보기</summary>
                    <div style="margin-top:10px; color:#555; line-height:1.5;">${currentItem.detailContext.replace(/\n/g, '<br>')}</div>
                </details>
            `;
        }

        let interactiveHtml = '';
        const useMagnet = expectsEnglish && wordCount === 1 && totalLength >= 7;

        if (useMagnet) {
            // [슬라임 철자 자석판 모드]
            const chars = answerWord.split('').filter(c => c.trim() !== '');
            const scrambled = [...chars].sort(() => Math.random() - 0.5);

            window.currentEngMagnetAnswer = [];
            window.engMagnetTargetWord = answerWord;

            window.selectEngMagnet = function(letter, idx) {
                const btn = document.getElementById(`eng-magnet-btn-${idx}`);
                if (btn && btn.style.visibility === 'hidden') return;
                if (btn) btn.style.visibility = 'hidden';
                window.currentEngMagnetAnswer.push({ letter, idx });
                window.renderEngMagnetBlanks();
            };

            window.renderEngMagnetBlanks = function() {
                const blankContainer = document.getElementById('eng-magnet-blanks');
                if (!blankContainer) return;
                let html = '';
                let answerIdx = 0;
                for (let i = 0; i < window.engMagnetTargetWord.length; i++) {
                    if (answerIdx < window.currentEngMagnetAnswer.length) {
                        html += `<span style="border-bottom:3px solid var(--primary); width:30px; display:inline-block; text-align:center; color:var(--primary); font-weight:bold;">${window.currentEngMagnetAnswer[answerIdx].letter}</span>`;
                        answerIdx++;
                    } else {
                        html += '<span style="border-bottom:3px solid #ccc; width:30px; display:inline-block; text-align:center;">_</span>';
                    }
                }
                blankContainer.innerHTML = html;
            };

            window.resetEngMagnets = function() {
                window.currentEngMagnetAnswer.forEach(item => {
                    const btn = document.getElementById(`eng-magnet-btn-${item.idx}`);
                    if (btn) btn.style.visibility = 'visible';
                });
                window.currentEngMagnetAnswer = [];
                window.renderEngMagnetBlanks();
            };

            window.verifyEngMagnet = function() {
                const answerStr = window.currentEngMagnetAnswer.map(item => item.letter).join('');
                if (answerStr.toLowerCase() === window.engMagnetTargetWord.toLowerCase()) {
                    if (typeof window.speakFairyTTS === 'function') window.speakFairyTTS("정답이에요! 스펠링을 완벽하게 맞췄어요!");
                    if (typeof window.speakEnglish === 'function') window.speakEnglish(answerWord);
                    if (typeof helpers.advanceQuiz === 'function') helpers.advanceQuiz(1000);
                } else {
                    if (typeof helpers.recordWrong === 'function') helpers.recordWrong(currentItem, answerStr || '철자 오류');
                    const blankContainer = document.getElementById('eng-magnet-blanks');
                    if (blankContainer) blankContainer.classList.add('wrong');
                    if (typeof helpers.promptWrong === 'function') {
                        helpers.promptWrong(() => {
                            if (blankContainer) blankContainer.classList.remove('wrong');
                            if (typeof window.resetEngMagnets === 'function') window.resetEngMagnets();
                        });
                    }
                }
            };

            interactiveHtml = `
                <div id="eng-magnet-blanks" style="font-size: 2rem; letter-spacing: 5px; margin-bottom: 20px; min-height: 40px; display: flex; justify-content: center; gap: 5px;">
                    ${answerWord.split('').map(() => '<span style="border-bottom:3px solid #ccc; width:30px; display:inline-block; text-align:center;">_</span>').join('')}
                </div>
                <div id="eng-magnet-pool" style="display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-bottom: 20px;">
                    ${scrambled.map((l, i) => {
                        const safeL = safeEscape(l);
                        return `<button id="eng-magnet-btn-${i}" class="quiz-choice-btn" style="padding: 10px 20px; font-size: 1.5rem;" onclick="selectEngMagnet('${safeL}', ${i})">${l}</button>`;
                    }).join('')}
                </div>
                <div style="display:flex; gap:10px; justify-content:center; margin-top:20px;">
                    <button class="quiz-button" style="background:#ff9f43;" onclick="resetEngMagnets()">다시 조합하기</button>
                    <button class="quiz-button" onclick="verifyEngMagnet()">정답 확인</button>
                </div>
            `;
        } else {
            // [키보드 타이핑 모드]
            window.verifyStage3Typing = function() {
                const inputEl = document.getElementById('stage3Input');
                if (!inputEl) return;
                const inputVal = inputEl.value.trim();
                if (checkStage3Answer(inputVal, answerWord, currentItem)) {
                    if (typeof window.speakFairyTTS === 'function') window.speakFairyTTS("정답이에요! 아주 훌륭해요!");
                    if (mode !== 'toKorean' && typeof window.speakEnglish === 'function') window.speakEnglish(answerWord);
                    inputEl.classList.add('correct');
                    if (typeof helpers.advanceQuiz === 'function') helpers.advanceQuiz(1000);
                } else {
                    if (typeof helpers.recordWrong === 'function') helpers.recordWrong(currentItem, inputVal || '오답');
                    inputEl.classList.add('wrong');
                    if (typeof helpers.promptWrong === 'function') {
                        helpers.promptWrong(() => {
                            inputEl.classList.remove('wrong');
                            inputEl.value = '';
                            inputEl.focus();
                        });
                    }
                }
            };

            interactiveHtml = `
                <div class="interactive-input-group" style="margin-bottom: 20px;">
                    <input id="stage3Input" class="text-input-field" type="text" autocomplete="off" placeholder="${modeMeta.placeholder}" onkeypress="if(event.key === 'Enter') verifyStage3Typing()" style="width:100%;">
                </div>
                <div style="display:flex; gap:10px; justify-content:center; margin-top:20px;">
                    <button class="quiz-button" onclick="verifyStage3Typing()">정답 확인</button>
                </div>
            `;
        }

        let displayHtml = '';
        if (mode === 'copy') {
            displayHtml = `
                <div style="background: linear-gradient(135deg, rgba(167, 139, 250, 0.12), rgba(110, 198, 245, 0.15)); border: 2px dashed var(--purple); border-radius: 16px; padding: 15px; margin-bottom: 15px;">
                    <div class="quiz-descr" style="font-size: 2.2rem; font-weight: bold; color: var(--primary); margin-bottom: 6px;">${answerWord}</div>
                    <div style="font-size: 1.25rem; font-weight: bold; color: #e11d48; background: #fff; display: inline-block; padding: 4px 14px; border-radius: 20px; box-shadow: 0 2px 6px rgba(0,0,0,0.06);">
                        🇰🇷 ${currentItem.meaning || '뜻풀이'}
                    </div>
                </div>
            `;
        } else if (modeMeta.listening) {
            displayHtml = `<div class="quiz-descr" style="font-size: 2.5rem; margin-bottom: 10px;">${modeMeta.display}</div>`;
        } else {
            displayHtml = `<div class="quiz-descr" style="font-size: 1.5rem; font-weight: bold; color: var(--primary); margin-bottom: 20px;">${modeMeta.display}</div>`;
        }

        const safeWordEscaped = safeEscape(answerWord);

        container.innerHTML = `
            <div class="quiz-card">
                ${helpers.orderToggleHtml || ''}
                <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.9rem; opacity:0.8; margin-bottom:12px; gap:8px; flex-wrap:wrap;">
                    <span>${STAGE3_MODES.find(m => m.id === mode)?.label || '영단어 학습'} · ${helpers.currentIdx + 1} / ${helpers.totalCount}</span>
                    <button class="quiz-choice-btn" style="padding:6px 12px; font-size:0.85rem;" onclick="window.EnglishVoca.showStage3ModeSelect()">🔄 방식 바꾸기</button>
                </div>
                ${imageHtml}
                ${displayHtml}
                <div style="margin-bottom: 12px; color: #666;">${modeMeta.sub}</div>
                ${hintHtml}
                ${interactiveHtml}
                <div style="margin-top:16px;">
                    ${typeof window.getEnglishSpeechRateChipsHtml === 'function' ? window.getEnglishSpeechRateChipsHtml() : ''}
                    <button class="quiz-button" style="background:#8b949e;" onclick="window.speakEnglish('${safeWordEscaped}')">🔊 원어민 발음 듣기</button>
                </div>
            </div>
        `;

        if (modeMeta.autoSpeak && typeof window.speakEnglish === 'function') {
            setTimeout(() => window.speakEnglish(answerWord), mode === 'listening' ? 300 : 500);
        }
    }

    // ========================================================
    // 🧩 [4단계] 영어 문장 조각 맞추기 (단어 블록 놀이 & 성공 카드)
    // ========================================================
    function renderStage4UI(container, currentItem, helpers = {}) {
        if (!currentItem) return;
        const answerSentence = currentItem.word.trim();
        const wordsArray = answerSentence.split(/\s+/);

        const imageUrl = currentItem.imageUrl || currentItem.image;
        const imageHtml = imageUrl ? `
            <div style="text-align:center; margin-bottom:15px;">
                <img src="${imageUrl}" style="max-width:100%; max-height:200px; border-radius:10px; box-shadow:0 4px 8px rgba(0,0,0,0.2); object-fit:contain;" alt="${currentItem.word}">
            </div>
        ` : '';
        
        let interactiveHtml = '';

        if (wordsArray.length >= 3) {
            // [단어 카드 순서 배열 팝업 UI]
            const scrambled = [...wordsArray].sort(() => Math.random() - 0.5);
            window.currentSentenceAnswer = [];
            window.sentenceTargetWords = wordsArray;

            window.selectSentenceWord = function(word, idx) {
                const btn = document.getElementById(`sent-word-btn-${idx}`);
                if (btn && btn.style.visibility === 'hidden') return;
                if (btn) btn.style.visibility = 'hidden';
                window.currentSentenceAnswer.push({ word, idx });
                window.renderSentenceBlanks();
            };

            window.renderSentenceBlanks = function() {
                const blankContainer = document.getElementById('sent-word-blanks');
                if (!blankContainer) return;
                let html = '';
                for (let i = 0; i < window.sentenceTargetWords.length; i++) {
                    if (i < window.currentSentenceAnswer.length) {
                        const ansItem = window.currentSentenceAnswer[i];
                        html += `<span style="border-bottom:3px solid var(--primary); padding:0 10px; display:inline-block; text-align:center; color:var(--primary); font-weight:bold; margin:0 5px; font-size:1.4rem;">${ansItem.word}</span>`;
                    } else {
                        html += '<span style="border-bottom:3px solid #ccc; width:50px; display:inline-block; margin:0 5px; height:36px;"></span>';
                    }
                }
                blankContainer.innerHTML = html;
            };

            window.resetSentenceWords = function() {
                window.currentSentenceAnswer.forEach(item => {
                    const btn = document.getElementById(`sent-word-btn-${item.idx}`);
                    if (btn) btn.style.visibility = 'visible';
                });
                window.currentSentenceAnswer = [];
                window.renderSentenceBlanks();
            };

            window.verifySentenceOrder = function() {
                const answerStr = window.currentSentenceAnswer.map(item => item.word).join(' ');
                if (answerStr === answerSentence) {
                    if (typeof window.speakFairyTTS === 'function') window.speakFairyTTS("정답이에요! 문장을 완벽하게 완성했어요!");
                    if (typeof window.speakEnglish === 'function') window.speakEnglish(answerSentence);
                    if (typeof helpers.rewardCorrect === 'function') helpers.rewardCorrect(helpers.currentIdx);
                    renderStage4SuccessCard(container, answerSentence, currentItem.meaning, helpers);
                } else {
                    if (typeof helpers.recordWrong === 'function') helpers.recordWrong(currentItem, answerStr || '순서 오류');
                    const blankContainer = document.getElementById('sent-word-blanks');
                    if (blankContainer) blankContainer.classList.add('wrong');
                    if (typeof helpers.promptWrong === 'function') {
                        helpers.promptWrong(() => {
                            if (blankContainer) blankContainer.classList.remove('wrong');
                            if (typeof window.resetSentenceWords === 'function') window.resetSentenceWords();
                        });
                    }
                }
            };

            interactiveHtml = `
                <div id="sent-word-blanks" style="font-size: 1.5rem; margin-bottom: 20px; min-height: 48px; display: flex; justify-content: center; flex-wrap: wrap; line-height: 2;">
                    ${wordsArray.map(() => '<span style="border-bottom:3px solid #ccc; width:50px; display:inline-block; margin:0 5px; height:36px;"></span>').join('')}
                </div>
                <div id="sent-word-pool" style="display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-bottom: 20px;">
                    ${scrambled.map((w, i) => {
                        const safeW = safeEscape(w);
                        return `
                            <button id="sent-word-btn-${i}" class="quiz-choice-btn" style="padding: 12px 20px; font-size: 1.25rem;" onclick="selectSentenceWord('${safeW}', ${i})">${w}</button>
                        `;
                    }).join('')}
                </div>
                <div style="display:flex; gap:10px; justify-content:center; margin-top:20px;">
                    <button class="quiz-button" style="background:#ff9f43;" onclick="resetSentenceWords()">다시 배열하기</button>
                    <button class="quiz-button" onclick="verifySentenceOrder()">정답 확인</button>
                </div>
            `;
        } else {
            // [짧은 문장용 3지선다 객관식]
            const choices = [answerSentence];
            const allRecords = helpers.allRecords || [];
            const otherSentences = allRecords.filter(r => (typeof window.isSentenceRecord === 'function' ? window.isSentenceRecord(r) : true) && r.word !== answerSentence).map(r => r.word);
            otherSentences.sort(() => Math.random() - 0.5);
            choices.push(otherSentences[0] || "I am a boy.");
            choices.push(otherSentences[1] || "You are a girl.");
            choices.sort(() => Math.random() - 0.5);

            window.verifyStage4Choice = function(selectedSentence) {
                if (selectedSentence === answerSentence) {
                    if (typeof window.speakFairyTTS === 'function') window.speakFairyTTS("정답이에요! 훌륭해요!");
                    if (typeof window.speakEnglish === 'function') window.speakEnglish(answerSentence);
                    if (typeof helpers.rewardCorrect === 'function') helpers.rewardCorrect(helpers.currentIdx);
                    renderStage4SuccessCard(container, answerSentence, currentItem.meaning, helpers);
                } else {
                    if (typeof helpers.recordWrong === 'function') helpers.recordWrong(currentItem, selectedSentence);
                    if (typeof helpers.promptWrong === 'function') helpers.promptWrong(() => {});
                }
            };

            interactiveHtml = `
                <div class="quiz-choices-container" style="display: flex; flex-direction: column; gap: 10px;">
                    ${choices.map(choice => {
                        const safeC = safeEscape(choice);
                        return `<button class="quiz-choice-btn" style="padding: 16px 20px; font-size: 1.25rem;" onclick="verifyStage4Choice('${safeC}')">${choice}</button>`;
                    }).join('')}
                </div>
            `;
        }

        const safeSentenceEscaped = safeEscape(answerSentence);

        container.innerHTML = `
            <div class="quiz-card">
                ${helpers.orderToggleHtml || ''}
                <div style="font-size: 0.95rem; opacity:0.7; margin-bottom: 12px;">영어 문장 ${helpers.currentIdx + 1} / ${helpers.totalCount}</div>
                ${imageHtml}
                <div class="quiz-descr" style="font-size: 1.5rem; font-weight: bold; color: var(--primary); margin-bottom: 14px;">${currentItem.meaning}</div>
                <div style="margin-bottom: 14px; color: #64748b; font-size: 0.98rem;">이 뜻에 맞는 영어 문장을 완성하세요!</div>
                
                ${typeof window.getEnglishSpeechRateChipsHtml === 'function' ? window.getEnglishSpeechRateChipsHtml() : ''}

                ${interactiveHtml}

                <div style="margin-top:20px;">
                    <button class="quiz-button" style="background:#8b949e;" onclick="window.speakEnglish('${safeSentenceEscaped}')">🔊 원어민 발음 힌트 듣기</button>
                </div>
            </div>
        `;
    }

    // 🌟 4단계 정답 성공 확인 카드
    function renderStage4SuccessCard(container, sentence, meaning, helpers = {}) {
        if (window._sentenceAutoAdvanceTimer) {
            clearTimeout(window._sentenceAutoAdvanceTimer);
        }

        const phonicsHtml = typeof window.renderSentencePhonicsHtml === 'function' ? window.renderSentencePhonicsHtml(sentence) : sentence;
        const toggleBtnHtml = typeof window.getEnglishPhonicsToggleBtnHtml === 'function' ? window.getEnglishPhonicsToggleBtnHtml() : '';
        const speechRateChipsHtml = typeof window.getEnglishSpeechRateChipsHtml === 'function' ? window.getEnglishSpeechRateChipsHtml() : '';
        const safeSentenceEscaped = safeEscape(sentence);

        container.innerHTML = `
            <div class="quiz-card" style="border: 2.5px solid #10b981; background: linear-gradient(180deg, rgba(16, 185, 129, 0.05) 0%, rgba(255, 255, 255, 0.95) 100%);">
                <div style="text-align:center; padding: 10px 5px 20px;">
                    <div style="font-size: 3.5rem; margin-bottom: 6px; animation: bounceObj 1.2s infinite;">🎉</div>
                    <div style="font-family:'Jua', sans-serif; font-size: 1.5rem; color: #059669; margin-bottom: 16px;">
                        참 잘했어요! 멋진 영어 문장 완성!
                    </div>

                    <!-- 완성된 문장 및 단어별 한글 파닉스 발음 1:1 블록 -->
                    <div style="background: rgba(16, 185, 129, 0.12); border: 2px solid #10b981; border-radius: 18px; padding: 16px 12px; margin-bottom: 18px; box-shadow: 0 8px 25px rgba(16, 185, 129, 0.15);">
                        ${phonicsHtml}
                        <div style="font-size: 1.2rem; font-weight: bold; color: #1e293b; background: rgba(255, 255, 255, 0.95); display: inline-block; padding: 6px 18px; border-radius: 25px; border: 1.5px solid #a7f3d0; margin-top: 4px;">
                            🇰🇷 ${meaning}
                        </div>
                    </div>

                    <!-- 발음 ON/OFF 토글 버튼 -->
                    <div style="display:flex; justify-content:center; align-items:center; gap:8px; margin: 4px 0 14px; flex-wrap:wrap;">
                        ${toggleBtnHtml}
                    </div>

                    <!-- 배속 조절 칩 -->
                    ${speechRateChipsHtml}

                    <!-- 버튼 그룹 (다시 듣기 & 다음 문제 수동 넘김) -->
                    <div style="display:flex; flex-direction:column; gap:12px; max-width:340px; margin: 20px auto 0;">
                        <button class="quiz-button" style="background:#0284c7; color:white; font-size:1.05rem; padding:12px 20px; border-radius:14px;" onclick="window.speakEnglish('${safeSentenceEscaped}')">
                            🔊 원어민 발음 다시 듣기
                        </button>
                        <button class="quiz-button" style="background:linear-gradient(135deg, #10b981 0%, #059669 100%); color:white; font-size:1.3rem; font-weight:bold; padding:16px 24px; border-radius:18px; box-shadow:0 8px 25px rgba(16, 185, 129, 0.4); cursor:pointer;" onclick="window.EnglishVoca.proceedToNextSentenceQuiz()">
                            👉 다음 문제 풀기 ➡️
                        </button>
                    </div>
                </div>
            </div>
        `;

        const flowMode = (typeof window.getQuizFlowMode === 'function') ? window.getQuizFlowMode('영어') : 'review';
        if (flowMode === 'speed') {
            window._sentenceAutoAdvanceTimer = setTimeout(() => {
                proceedToNextSentenceQuiz();
            }, 1800);
        } else {
            window._sentenceAutoAdvanceTimer = null;
        }
    }

    function proceedToNextSentenceQuiz() {
        if (window._sentenceAutoAdvanceTimer) {
            clearTimeout(window._sentenceAutoAdvanceTimer);
        }
        if (typeof window.activeQuizIdx !== 'undefined') window.activeQuizIdx++;
        if (typeof window.renderSectionUI === 'function') window.renderSectionUI();
    }

    const EnglishVoca = {
        setVocaPoolMode,
        renderVocaPoolUI,
        selectStage3Mode,
        showStage3ModeSelect,
        renderStage3ModeSelectUI,
        renderStage3UI,
        renderStage4UI,
        renderStage4SuccessCard,
        proceedToNextSentenceQuiz,
        getStage3QuizMode: () => stage3QuizMode,
        setStage3QuizMode: (mode) => { stage3QuizMode = mode; }
    };

    window.EnglishVoca = EnglishVoca;

    // 하위 호환 글로벌 브리지
    window.setVocaPoolMode = (m) => setVocaPoolMode(m);
    window.selectStage3Mode = (m) => selectStage3Mode(m);
    window.showStage3ModeSelect = showStage3ModeSelect;
    window.proceedToNextSentenceQuiz = proceedToNextSentenceQuiz;

})();
