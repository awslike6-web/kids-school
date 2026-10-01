// kids/js/korean_dictation.js
// ✍️ [2단계] 국어 받아쓰기 훈련소 전담 엔진 (골디락스 모듈)
// - 전사 거버넌스 헌법(규칙 7조) 준수: 단일 책임 완성형 모듈
// - 슬라임 음절 자석판 + 직접 쓰기 하이브리드 입력 & 음성 재생, 단계적 초성 힌트, 문장 검증

(function() {
    'use strict';

    let dictationInputMode = 'magnet'; // 'magnet'(슬라임 음절 자석판 기본) or 'typing'(직접 쓰기)
    let dictationUserSlots = [];       // 자석판에 올린 음절 토큰 배열
    let dictationHintLevel = 0;        // 0: 숨김, 1: 초성 힌트, 2: 전체 정답
    let dictationAudioEl = null;

    function stopDictationAudio() {
        if (dictationAudioEl) {
            dictationAudioEl.pause();
            dictationAudioEl.currentTime = 0;
            dictationAudioEl.onended = null;
            dictationAudioEl.onerror = null;
            dictationAudioEl = null;
        }
    }

    function playDictationAudio(item) {
        if (!item) return;
        stopDictationAudio();
        const text = (item.word || '').trim();
        if (item.audioUrl) {
            dictationAudioEl = new Audio(item.audioUrl);
            dictationAudioEl.onerror = () => {
                if (typeof window.speakFairyTTS === 'function') window.speakFairyTTS(text);
            };
            dictationAudioEl.play().catch(() => {
                if (typeof window.speakFairyTTS === 'function') window.speakFairyTTS(text);
            });
        } else {
            if (typeof window.speakFairyTTS === 'function') window.speakFairyTTS(text);
        }
    }

    function replayDictationAudio() {
        if (typeof window.activeSectionData !== 'undefined' && Array.isArray(window.activeSectionData)) {
            const currentItem = window.activeSectionData[window.activeQuizIdx || 0];
            playDictationAudio(currentItem);
        }
    }

    function setDictationInputMode(mode) {
        dictationInputMode = mode;
        if (typeof window.renderSectionUI === 'function') {
            window.renderSectionUI();
        } else {
            const container = document.getElementById('overlayInnerBody');
            if (container) renderDictationUI(container);
        }
    }

    function renderDictationSlots() {
        const boardEl = document.getElementById('dictationBoard');
        if (!boardEl) return;
        if (dictationUserSlots.length === 0) {
            boardEl.innerHTML = `<span style="color:#f472b6; opacity:0.7; font-size:1.05rem; font-family:'Gaegu', cursive;">아래 자석을 눌러 문장을 완성해봐요! ✨</span>`;
            return;
        }
        let html = '';
        dictationUserSlots.forEach((slot) => {
            if (slot.isSpace) {
                html += `<div class="dictation-slot-space" title="띄어쓰기"></div>`;
            } else {
                html += `<div class="dictation-slot-chip">${slot.char}</div>`;
            }
        });
        boardEl.innerHTML = html;
    }

    function tapDictationChip(chipId, char) {
        dictationUserSlots.push({ chipId, char, isSpace: false });
        const chipBtn = document.getElementById(`dictChip_${chipId}`);
        if (chipBtn) chipBtn.classList.add('used');
        renderDictationSlots();
    }

    function tapDictationSpace() {
        if (dictationUserSlots.length === 0) return;
        if (dictationUserSlots[dictationUserSlots.length - 1].isSpace) return;
        dictationUserSlots.push({ chipId: -1, char: ' ', isSpace: true });
        renderDictationSlots();
    }

    function backspaceDictation() {
        if (dictationUserSlots.length === 0) return;
        const last = dictationUserSlots.pop();
        if (!last.isSpace && last.chipId >= 0) {
            const chipBtn = document.getElementById(`dictChip_${last.chipId}`);
            if (chipBtn) chipBtn.classList.remove('used');
        }
        renderDictationSlots();
    }

    function resetDictationBoard() {
        dictationUserSlots = [];
        document.querySelectorAll('.syllable-chip').forEach(el => el.classList.remove('used'));
        renderDictationSlots();
    }

    function stepDictationHint() {
        const activeSectionData = window.activeSectionData || [];
        const currentItem = activeSectionData[window.activeQuizIdx || 0];
        const targetSentence = (currentItem?.word || '').trim();

        dictationHintLevel = (dictationHintLevel + 1) % 3;
        const hintEl = document.getElementById('dictationHint');
        const hintBtn = document.getElementById('dictationHintBtn');
        if (!hintEl || !hintBtn) return;

        if (dictationHintLevel === 1) {
            const chosung = (typeof window.getHangulChosung === 'function')
                ? window.getHangulChosung(targetSentence)
                : targetSentence;
            hintEl.style.display = 'block';
            hintEl.innerHTML = `<span style="background:#fef08a; padding:4px 12px; border-radius:12px; color:#713f12; font-weight:bold; font-size:1.15rem;">초성 힌트: ${chosung}</span>`;
            hintBtn.textContent = "정답 전체 보기 👀";
        } else if (dictationHintLevel === 2) {
            hintEl.style.display = 'block';
            hintEl.innerHTML = `<span style="background:#dcfce7; padding:4px 12px; border-radius:12px; color:#14532d; font-weight:bold; font-size:1.15rem;">정답: ${targetSentence}</span>`;
            hintBtn.textContent = "힌트 숨기기 🙈";
        } else {
            hintEl.style.display = 'none';
            hintBtn.textContent = "💡 힌트 보기 (초성)";
        }
    }

    function verifyKoreanDictation() {
        const activeSectionData = window.activeSectionData || [];
        const activeQuizIdx = window.activeQuizIdx || 0;
        const currentItem = activeSectionData[activeQuizIdx];
        if (!currentItem) return;

        const targetSentence = (currentItem.word || '').trim();
        let submission = "";
        if (dictationInputMode === 'magnet') {
            submission = dictationUserSlots.map(s => s.isSpace ? ' ' : s.char).join('').trim();
        } else {
            const inputEl = document.getElementById('dictationInput');
            submission = inputEl ? inputEl.value.trim() : "";
        }

        if (!submission) {
            alert("문장을 완성한 뒤 제출해 주세요!");
            return;
        }

        if (submission === targetSentence) {
            if (typeof window.speakFairyTTS === 'function') {
                window.speakFairyTTS("완벽해요! 띄어쓰기까지 정확하게 맞췄어요!");
            }
            const board = document.getElementById('dictationBoard');
            if (board) board.style.borderColor = '#10b981';
            const inputEl = document.getElementById('dictationInput');
            if (inputEl) inputEl.classList.add('correct');
            if (typeof window.advanceKoreanQuizAfterCorrect === 'function') {
                window.advanceKoreanQuizAfterCorrect(1400);
            }
        } else {
            if (typeof window.speakFairyTTS === 'function') {
                window.speakFairyTTS("괜찮아요! 글자를 다시 한번 살펴보고 맞춰볼까요?");
            }
            if (dictationInputMode === 'magnet') {
                const board = document.getElementById('dictationBoard');
                if (board) {
                    board.style.borderColor = '#ef4444';
                    setTimeout(() => { if (board) board.style.borderColor = '#f472b6'; }, 800);
                }
            } else {
                const inputEl = document.getElementById('dictationInput');
                if (inputEl) {
                    inputEl.classList.add('wrong');
                    if (typeof window.promptKoreanWrong === 'function') {
                        window.promptKoreanWrong(
                            { word: currentItem.word, wrongInput: submission },
                            () => {
                                inputEl.classList.remove('wrong');
                                inputEl.value = '';
                                inputEl.focus();
                            }
                        );
                    }
                }
            }
        }
    }

    function renderDictationUI(container) {
        const activeSectionData = window.activeSectionData || [];
        const activeQuizIdx = window.activeQuizIdx || 0;
        if (!activeSectionData || activeSectionData.length === 0 || !activeSectionData[activeQuizIdx]) {
            container.innerHTML = `<div style="text-align:center; padding:40px;">받아쓰기 데이터가 없습니다.</div>`;
            return;
        }

        const currentItem = activeSectionData[activeQuizIdx];
        const targetSentence = (currentItem.word || '').trim();
        const audioSourceLabel = currentItem.audioUrl ? '🎙️ 아빠/엄마 녹음' : '🧚‍♀️ 요정 TTS';
        const orderToggleHtml = (typeof window.getKoreanOrderToggleHtml === 'function')
            ? window.getKoreanOrderToggleHtml(window.koreanDictationOrderType || 'sequence')
            : '';

        dictationUserSlots = [];
        dictationHintLevel = 0;

        let chipIndex = 0;
        const rawChips = [];
        for (let i = 0; i < targetSentence.length; i++) {
            const ch = targetSentence[i];
            if (ch !== ' ') {
                rawChips.push({ chipId: chipIndex++, char: ch, used: false });
            }
        }
        const shuffledChips = [...rawChips].sort(() => Math.random() - 0.5);

        const modeToggleHtml = `
            <div style="display:flex; justify-content:center; gap:10px; margin-bottom:15px;">
                <button class="quiz-button" style="background: ${dictationInputMode === 'magnet' ? 'var(--pink)' : '#ccc'}; color: white; padding: 7px 16px; border-radius: 20px; font-size: 0.95rem;" onclick="window.setDictationInputMode('magnet')">🧲 슬라임 자석판</button>
                <button class="quiz-button" style="background: ${dictationInputMode === 'typing' ? 'var(--purple)' : '#ccc'}; color: white; padding: 7px 16px; border-radius: 20px; font-size: 0.95rem;" onclick="window.setDictationInputMode('typing')">⌨️ 직접 쓰기 (공책)</button>
            </div>
        `;

        let inputAreaHtml = '';
        if (dictationInputMode === 'magnet') {
            inputAreaHtml = `
                <div id="dictationBoard" class="dictation-board">
                    <span style="color:#f472b6; opacity:0.7; font-size:1.05rem; font-family:'Gaegu', cursive;">아래 자석을 눌러 문장을 완성해봐요! ✨</span>
                </div>

                <div style="display:flex; justify-content:center; gap:8px; margin-bottom:14px;">
                    <button class="syllable-chip space-chip" onclick="window.tapDictationSpace()">띄어쓰기 ␣</button>
                    <button class="quiz-button" style="background:#f43f5e; padding:8px 14px; font-size:0.95rem;" onclick="window.backspaceDictation()">⌫ 지우기</button>
                    <button class="quiz-button" style="background:#94a3b8; padding:8px 14px; font-size:0.95rem;" onclick="window.resetDictationBoard()">↺ 다시 하기</button>
                </div>

                <div class="magnet-pool">
                    ${shuffledChips.map(chip => `
                        <button id="dictChip_${chip.chipId}" data-char="${encodeURIComponent(chip.char)}" class="syllable-chip" onclick="window.tapDictationChip(${chip.chipId}, decodeURIComponent(this.dataset.char))">${chip.char}</button>
                    `).join('')}
                </div>
            `;
        } else {
            inputAreaHtml = `
                <input id="dictationInput" class="text-input-field" type="text" autocomplete="off" placeholder="공책에 쓰고 여기에 입력하세요" onkeypress="if(event.key === 'Enter') window.verifyKoreanDictation()" style="width:100%; margin-bottom:20px;">
            `;
        }

        container.innerHTML = `
            <div class="quiz-card" style="border: 2.5px solid #fbcfe8;">
                ${orderToggleHtml}
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                    <span style="font-size: 0.95rem; color:#be185d; font-weight:bold;">[${window.selectedKoreanUnit || '받아쓰기'}] ${activeQuizIdx + 1} / ${activeSectionData.length}</span>
                    <span style="font-size: 0.85rem; color: #888;">${audioSourceLabel}</span>
                </div>

                ${modeToggleHtml}

                <div style="font-size: 4rem; margin-bottom: 8px; cursor: pointer;" onclick="window.replayDictationAudio()" title="소리 다시 듣기">🎧</div>
                <p style="font-size:0.9rem; color:#888; margin-bottom:14px;">헤드폰을 누르면 소리를 다시 들려줘요!</p>

                <div id="dictationHint" style="margin-bottom: 15px; display: none;"></div>

                ${inputAreaHtml}

                <div style="display:flex; gap:10px; justify-content:center; margin-top:15px;">
                    <button class="quiz-button" style="background:linear-gradient(135deg, #ec4899 0%, #db2777 100%); font-size:1.15rem; padding:12px 28px;" onclick="window.verifyKoreanDictation()">✅ 정답 확인</button>
                    <button class="quiz-button" style="background:#ff9f43;" onclick="window.replayDictationAudio()">🔊 소리 다시 듣기</button>
                </div>

                <div style="margin-top: 15px;">
                    <button id="dictationHintBtn" style="background: none; border: none; color: #db2777; text-decoration: underline; cursor: pointer; font-size:0.9rem; font-weight:bold;" onclick="window.stepDictationHint()">💡 힌트 보기 (초성)</button>
                </div>
            </div>
        `;

        setTimeout(() => playDictationAudio(currentItem), 500);
    }

    // 전역 브리지 & 네임스페이스
    window.KoreanDictation = {
        renderUI: renderDictationUI,
        verify: verifyKoreanDictation,
        playAudio: playDictationAudio,
        replayAudio: replayDictationAudio,
        stopAudio: stopDictationAudio,
        setMode: setDictationInputMode
    };

    window.renderDictationUI = renderDictationUI;
    window.verifyKoreanDictation = verifyKoreanDictation;
    window.replayDictationAudio = replayDictationAudio;
    window.stopDictationAudio = stopDictationAudio;
    window.setDictationInputMode = setDictationInputMode;
    window.renderDictationSlots = renderDictationSlots;
    window.tapDictationChip = tapDictationChip;
    window.tapDictationSpace = tapDictationSpace;
    window.backspaceDictation = backspaceDictation;
    window.resetDictationBoard = resetDictationBoard;
    window.stepDictationHint = stepDictationHint;
})();
