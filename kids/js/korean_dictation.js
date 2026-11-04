// kids/js/korean_dictation.js
// ✍️ [2단계] 국어 받아쓰기 훈련소 화면 (골디락스 모듈)
// - 어절 블록 → 글자 자석 → 직접 쓰기(타자·공책) 순서로 진행한다. 맞춘 문장은 빠지고, 틀린 문장은 그 단계 맨 뒤로 돌아간다.
// - 단계·채점·저장 계산은 dictation_ladder.js(window.DictationLadder)가 맡고, 여기는 화면과 소리만 다룬다.

(function() {
    'use strict';

    const WRITE_MODE_KEY = 'MINMIN_DICTATION_WRITE_MODE_';
    const FRESH_TIMEOUT_MS = 3000;

    let session = null;           // 회차 진행 상태
    let sessionToken = 0;         // 불러오는 사이 창을 닫았을 때 늦은 응답을 버리는 표시
    let chips = [];               // 이번 문제의 블록·글자 자석
    let slots = [];               // 판에 올린 조각 { chipId, text, isSpace }
    let inputMode = 'blocks';     // blocks | letters | writing
    let hintLevel = 0;            // 0 숨김, 1 초성, 2 전체 정답
    let locked = false;           // 채점 후 다음 문제로 넘어가기 전까지 입력 잠금
    let audioEl = null;
    let audioTimer = null;

    const ladder = () => window.DictationLadder;

    function escapeHtml(text) {
        return String(text).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
    }

    function currentItem() {
        const data = window.activeSectionData || [];
        return data[window.activeQuizIdx || 0] || null;
    }

    function stateOf(id) {
        if (session.practice) return session.practiceStates[id] || { c: 0, s: '', r: '' };
        return ladder().getState(session.child, id);
    }

    // ---------- 소리 ----------
    function stopDictationAudio() {
        if (audioTimer) {
            clearTimeout(audioTimer);
            audioTimer = null;
        }
        if (audioEl) {
            audioEl.pause();
            audioEl.currentTime = 0;
            audioEl.onended = null;
            audioEl.onerror = null;
            audioEl = null;
        }
    }

    function playDictationAudio(item) {
        if (!item) return;
        stopDictationAudio();
        const text = (item.word || '').trim();
        const speak = () => {
            if (typeof window.speakFairyTTS === 'function') window.speakFairyTTS(text);
        };
        if (!item.audioUrl) {
            speak();
            return;
        }
        audioEl = new Audio(item.audioUrl);
        audioEl.onerror = speak;
        audioEl.play().catch(speak);
    }

    function replayDictationAudio() {
        playDictationAudio(currentItem());
    }

    // ---------- 회차 시작 ----------
    /**
     * @param {object} options { records: 이 회차 문장(순서 확정), unit, child, container, onQueue(문장 배열) }
     */
    async function beginSession(options) {
        const { records, unit, child, container, onQueue } = options;
        if (session && session.unit === unit && session.child === child) {
            session.records = records;
            session.onQueue = onQueue;
            startRound();
            return;
        }
        const token = ++sessionToken;
        session = {
            unit, child, records, onQueue, container,
            practice: false, practiceStates: {},
            round: null, total: 0, passed: 0, wrongCounts: {}, sawAnswer: {}
        };
        if (typeof window.showLoadingSpinner === 'function') window.showLoadingSpinner(container);

        // 다른 기기에서 푼 진도를 먼저 가져온다. 실패하거나 느리면 이 기기 기록으로 시작한다
        let fresh = null;
        if (typeof window.fetchVocaUnitFresh === 'function') {
            fresh = await window.fetchVocaUnitFresh({
                studentName: child,
                subject: '받아쓰기',
                unit: unit || undefined,
                timeoutMs: FRESH_TIMEOUT_MS
            });
        }
        if (token !== sessionToken || !session) return;
        const ids = new Set(records.map(r => r.id));
        const freshRows = fresh ? fresh.filter(r => ids.has(r.id)) : [];
        ladder().mergeFromRecords(child, records, false);
        if (freshRows.length > 0) ladder().mergeFromRecords(child, freshRows, true);
        startRound();
    }

    function startRound() {
        const round = ladder().currentRound(session.records, stateOf);
        if (round === null) {
            renderUnitComplete(session.container);
            return;
        }
        const queue = ladder().queueFor(session.records, round, stateOf);
        session.round = round;
        session.total = queue.length;
        session.passed = 0;
        session.wrongCounts = {};
        session.sawAnswer = {};
        window.wrongNotes = [];
        session.onQueue(queue);
    }

    function nextRound() {
        startRound();
    }

    function practiceAgain() {
        session.practice = true;
        session.practiceStates = {};
        startRound();
    }

    function flushProgress() {
        if (!session || !ladder()) return Promise.resolve();
        return ladder().pushDirty(session.child, window.updateVocaMasteryProgress);
    }

    function endSession() {
        stopDictationAudio();
        sessionToken++;
        const closing = flushProgress();
        session = null;
        return closing;
    }

    // ---------- 입력 ----------
    function renderBoard() {
        const board = document.getElementById('dictationBoard');
        if (!board) return;
        if (slots.length === 0) {
            const guide = inputMode === 'blocks' ? '들은 문장을 블록으로 차례대로 놓아 봐요! ✨' : '아래 자석을 눌러 문장을 완성해 봐요! ✨';
            board.innerHTML = `<span class="dictation-board-guide">${guide}</span>`;
            return;
        }
        const chipClass = inputMode === 'blocks' ? 'dictation-slot-chip is-block' : 'dictation-slot-chip';
        board.innerHTML = slots.map(slot => (slot.isSpace
            ? '<div class="dictation-slot-space" title="띄어쓰기"></div>'
            : `<div class="${chipClass}">${escapeHtml(slot.text)}</div>`)).join('');
    }

    function tapChip(chipId) {
        if (locked) return;
        const chip = chips.find(c => c.id === chipId);
        if (!chip || slots.some(s => s.chipId === chipId)) return;
        slots.push({ chipId, text: chip.text, isSpace: false });
        const button = document.getElementById(`dictChip_${chipId}`);
        if (button) button.classList.add('used');
        renderBoard();
    }

    function tapSpace() {
        if (locked || slots.length === 0 || slots[slots.length - 1].isSpace) return;
        slots.push({ chipId: -1, text: ' ', isSpace: true });
        renderBoard();
    }

    function backspace() {
        if (locked || slots.length === 0) return;
        const last = slots.pop();
        if (!last.isSpace) {
            const button = document.getElementById(`dictChip_${last.chipId}`);
            if (button) button.classList.remove('used');
        }
        renderBoard();
    }

    function resetBoard() {
        if (locked) return;
        slots = [];
        document.querySelectorAll('.magnet-pool .syllable-chip').forEach(el => el.classList.remove('used'));
        renderBoard();
    }

    function submissionText() {
        if (inputMode === 'blocks') return slots.map(s => s.text).join(' ');
        if (inputMode === 'letters') return slots.map(s => s.text).join('');
        const input = document.getElementById('dictationInput');
        return input ? input.value : '';
    }

    function loadWriteMode() {
        try {
            return localStorage.getItem(WRITE_MODE_KEY + session.child) === 'notebook' ? 'notebook' : 'typing';
        } catch (e) {
            return 'typing';
        }
    }

    function setWriteMode(mode) {
        if (locked) return;
        try {
            localStorage.setItem(WRITE_MODE_KEY + session.child, mode);
        } catch (e) { /* 저장이 막힌 브라우저는 이번 화면에서만 적용 */ }
        if (typeof window.renderSectionUI === 'function') window.renderSectionUI();
    }

    // ---------- 힌트 ----------
    function hintHtml(sentence) {
        if (hintLevel === 1) {
            const chosung = typeof window.getHangulChosung === 'function' ? window.getHangulChosung(sentence) : '';
            return `<span class="dictation-hint-chip is-chosung">초성 힌트: ${escapeHtml(chosung)}</span>`;
        }
        if (hintLevel === 2) return `<span class="dictation-hint-chip is-answer">정답: ${escapeHtml(sentence)}</span>`;
        return '';
    }

    function hintButtonLabel() {
        if (hintLevel === 1) return '정답 전체 보기 👀';
        if (hintLevel === 2) return '힌트 숨기기 🙈';
        return '💡 힌트 보기 (초성)';
    }

    function stepHint() {
        const item = currentItem();
        if (!item || locked) return;
        hintLevel = (hintLevel + 1) % 3;
        const hintEl = document.getElementById('dictationHint');
        const hintBtn = document.getElementById('dictationHintBtn');
        if (!hintEl || !hintBtn) return;
        hintEl.style.display = hintLevel === 0 ? 'none' : 'block';
        hintEl.innerHTML = hintHtml(item.word);
        hintBtn.textContent = hintButtonLabel();
        // 초성 힌트가 나올 때만 힌트 음성 (정답 보기·숨기기는 조용히)
        if (hintLevel === 1 && typeof window.fairyHint === 'function') window.fairyHint();
        // 정답을 본 문장은 맞혀도 통과로 치지 않고 뒤에서 한 번 더 푼다
        if (hintLevel === 2) session.sawAnswer[item.id] = true;
    }

    // ---------- 채점 ----------
    function showFeedback(html) {
        const el = document.getElementById('dictationFeedback');
        if (!el) return;
        el.style.display = 'block';
        el.innerHTML = html;
    }

    function lockInput() {
        locked = true;
        const area = document.getElementById('dictationInputArea');
        if (area) area.classList.add('is-locked');
        const actions = document.getElementById('dictationActions');
        if (actions) actions.style.display = 'none';
        const input = document.getElementById('dictationInput');
        if (input) input.readOnly = true;
    }

    function retryButtonHtml() {
        const data = window.activeSectionData || [];
        const isLast = (window.activeQuizIdx || 0) >= data.length - 1;
        return `<button class="quiz-button dictation-retry-btn" onclick="window.KoreanDictation.requeueCurrent()">${isLast ? '🔁 다시 해 볼게요' : '➡️ 뒤에서 다시 할게요'}</button>`;
    }

    function requeueCurrent() {
        const item = currentItem();
        if (!item || !locked) return;
        window.activeSectionData.push(item);
        if (typeof window.skipKoreanQuestion === 'function') window.skipKoreanQuestion();
    }

    function verify() {
        const item = currentItem();
        if (!item || locked) return;
        const submission = submissionText();
        if (!ladder().normalize(submission)) {
            showFeedback('<p class="dictation-feedback-text">먼저 문장을 완성해 봐요! ✏️</p>');
            return;
        }
        const result = ladder().judge(item.word, submission);
        if (result.ok) handleCorrect(item);
        else handleWrong(item, submission, result.kind);
    }

    function handleCorrect(item) {
        lockInput();
        stopDictationAudio();
        const input = document.getElementById('dictationInput');
        if (session.sawAnswer[item.id]) {
            // 다시 나올 때는 정답을 본 표시를 지워야 그때 맞힌 것으로 통과한다
            delete session.sawAnswer[item.id];
            showFeedback(`<p class="dictation-feedback-text">잘 썼어요! 이번에는 정답을 보지 않고 한 번 더 해 봐요. 💪</p>${retryButtonHtml()}`);
            return;
        }
        if (session.practice) {
            session.practiceStates[item.id] = ladder().passRound(stateOf(item.id), session.round, '');
        } else {
            ladder().markPassed(session.child, item.id, session.round);
        }
        session.passed++;
        const board = document.getElementById('dictationBoard');
        if (board) board.classList.add('is-correct');
        if (input) input.classList.add('correct');
        showFeedback('<p class="dictation-feedback-text is-correct">완벽해요! 🎉</p>');
        if (typeof window.fairyPraise === 'function') window.fairyPraise();
        if (typeof window.advanceKoreanQuizAfterCorrect === 'function') window.advanceKoreanQuizAfterCorrect(1400);
    }

    function noteWrong(item, wrongInput) {
        session.wrongCounts[item.id] = (session.wrongCounts[item.id] || 0) + 1;
        if (!window.wrongNotes) window.wrongNotes = [];
        window.wrongNotes.push({ word: item.word, wrongInput });
        if (typeof window.fairyEncourage === 'function') window.fairyEncourage();
    }

    function handleWrong(item, submission, kind) {
        lockInput();
        stopDictationAudio();
        noteWrong(item, submission);
        const board = document.getElementById('dictationBoard');
        if (board) board.classList.add('is-wrong');
        const input = document.getElementById('dictationInput');
        if (input) input.classList.add('wrong');
        const message = {
            punct: '글자는 다 맞았어요! 문장 부호(. , ? !)를 살펴봐요.',
            space: '글자는 다 맞았어요! 띄어쓰기를 살펴봐요.',
            letters: '괜찮아요! 표시한 곳을 눈으로 익혀 봐요.'
        }[kind];
        const answer = ladder().diffTokens(item.word, submission)
            .map(t => `<span class="${t.wrong ? 'dictation-diff-wrong' : ''}">${escapeHtml(t.text)}</span>`)
            .join(' ');
        showFeedback(`<p class="dictation-feedback-text">${message}</p><p class="dictation-feedback-answer">${answer}</p>${retryButtonHtml()}`);
    }

    // 공책 모드: 쓴 뒤 정답을 펼쳐 아이가 직접 맞음/틀림을 고른다
    function revealNotebookAnswer() {
        const item = currentItem();
        if (!item || locked) return;
        lockInput();
        stopDictationAudio();
        showFeedback(`
            <p class="dictation-feedback-text">공책에 쓴 문장과 한 글자씩 비교해 봐요.</p>
            <p class="dictation-feedback-answer">${escapeHtml(item.word)}</p>
            <div class="dictation-self-check">
                <button class="quiz-button is-same" onclick="window.KoreanDictation.notebookResult(true)">⭕ 똑같이 썼어요</button>
                <button class="quiz-button is-different" onclick="window.KoreanDictation.notebookResult(false)">🔁 다르게 썼어요</button>
            </div>`);
    }

    function notebookResult(isSame) {
        const item = currentItem();
        if (!item || !locked) return;
        if (isSame) {
            handleCorrect(item);
            return;
        }
        noteWrong(item, '공책 자가 채점: 다르게 씀');
        requeueCurrent();
    }

    // ---------- 화면 ----------
    function stepsHtml() {
        const available = ladder().roundsIn(session.records);
        return `<div class="dictation-steps">${ladder().ROUNDS.filter(r => available.includes(r.no)).map(r => {
            const state = r.no < session.round ? 'is-done' : (r.no === session.round ? 'is-active' : '');
            return `<span class="dictation-step ${state}">${r.no < session.round ? '✅' : r.icon} ${r.label}</span>`;
        }).join('')}</div>`;
    }

    function blocksHtml() {
        return `
            <div id="dictationBoard" class="dictation-board"></div>
            <div class="dictation-board-actions">
                <button class="quiz-button is-erase" onclick="window.KoreanDictation.backspace()">⌫ 지우기</button>
                <button class="quiz-button is-reset" onclick="window.KoreanDictation.resetBoard()">↺ 다시 하기</button>
            </div>
            <div class="magnet-pool">${chips.map(c => `<button id="dictChip_${c.id}" class="syllable-chip block-chip" onclick="window.KoreanDictation.tapChip(${c.id})">${escapeHtml(c.text)}</button>`).join('')}</div>`;
    }

    function lettersHtml() {
        return `
            <div id="dictationBoard" class="dictation-board"></div>
            <div class="dictation-board-actions">
                <button class="syllable-chip space-chip" onclick="window.KoreanDictation.tapSpace()">띄어쓰기 ␣</button>
                <button class="quiz-button is-erase" onclick="window.KoreanDictation.backspace()">⌫ 지우기</button>
                <button class="quiz-button is-reset" onclick="window.KoreanDictation.resetBoard()">↺ 다시 하기</button>
            </div>
            <div class="magnet-pool">${chips.map(c => `<button id="dictChip_${c.id}" class="syllable-chip" onclick="window.KoreanDictation.tapChip(${c.id})">${escapeHtml(c.text)}</button>`).join('')}</div>`;
    }

    function writingHtml(writeMode) {
        const toggle = `
            <div class="dictation-write-toggle">
                <button class="quiz-button ${writeMode === 'typing' ? 'is-on' : ''}" onclick="window.KoreanDictation.setWriteMode('typing')">⌨️ 타자로 쓰기</button>
                <button class="quiz-button ${writeMode === 'notebook' ? 'is-on' : ''}" onclick="window.KoreanDictation.setWriteMode('notebook')">📓 공책에 쓰기</button>
            </div>`;
        if (writeMode === 'notebook') {
            return `${toggle}<p class="dictation-notebook-guide">소리를 듣고 공책에 쓴 다음, 아래 버튼을 눌러 정답과 비교해 봐요.</p>`;
        }
        return `${toggle}<input id="dictationInput" class="text-input-field dictation-input" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="들은 문장을 그대로 써 봐요" onkeydown="if(event.key === 'Enter' && !event.isComposing) window.KoreanDictation.verify()">`;
    }

    function renderDictationUI(container) {
        const item = currentItem();
        if (!session || !item) {
            container.innerHTML = '<div style="text-align:center; padding:40px;">받아쓰기 데이터가 없습니다.</div>';
            return;
        }
        const wrongCount = session.wrongCounts[item.id] || 0;
        inputMode = ladder().inputModeFor(session.round, wrongCount, item.word);
        slots = [];
        locked = false;
        hintLevel = ladder().shouldShowHint(wrongCount) ? 1 : 0;
        chips = inputMode === 'blocks' ? ladder().buildBlocks(item.word)
            : (inputMode === 'letters' ? ladder().buildLetters(item.word) : []);
        const writeMode = inputMode === 'writing' ? loadWriteMode() : null;

        let inputHtml;
        if (inputMode === 'blocks') inputHtml = blocksHtml();
        else if (inputMode === 'letters') inputHtml = lettersHtml();
        else inputHtml = writingHtml(writeMode);

        const submitButton = writeMode === 'notebook'
            ? '<button class="quiz-button dictation-submit-btn" onclick="window.KoreanDictation.revealNotebookAnswer()">✅ 다 썼어요, 정답 보기</button>'
            : '<button class="quiz-button dictation-submit-btn" onclick="window.KoreanDictation.verify()">✅ 정답 확인</button>';
        const orderToggle = typeof window.getKoreanOrderToggleHtml === 'function'
            ? window.getKoreanOrderToggleHtml(window.koreanDictationOrderType || 'sequence')
            : '';
        const roundLabel = session.practice ? '🔁 연습' : `${session.round}단계`;

        container.innerHTML = `
            <div class="quiz-card dictation-card">
                ${orderToggle}
                ${stepsHtml()}
                <div class="dictation-status">
                    <span class="dictation-count">[${escapeHtml(window.selectedKoreanUnit || session.unit || '받아쓰기')}] ${roundLabel} · 통과 ${session.passed} / ${session.total}</span>
                    ${wrongCount > 0 ? '<span class="dictation-again">🔁 다시 도전</span>' : `<span class="dictation-source">${item.audioUrl ? '🎙️ 아빠/엄마 녹음' : '🧚‍♀️ 요정 TTS'}</span>`}
                </div>
                <div class="dictation-listen" onclick="window.KoreanDictation.replayAudio()" title="소리 다시 듣기">🎧</div>
                <p class="dictation-listen-guide">헤드폰을 누르면 소리를 다시 들려줘요!</p>
                <div id="dictationHint" class="dictation-hint" style="display:${hintLevel === 0 ? 'none' : 'block'};">${hintHtml(item.word)}</div>
                <div id="dictationInputArea">${inputHtml}</div>
                <div id="dictationFeedback" class="dictation-feedback" style="display:none;"></div>
                <div id="dictationActions">
                    <div class="dictation-actions">
                        ${submitButton}
                        <button class="quiz-button dictation-replay-btn" onclick="window.KoreanDictation.replayAudio()">🔊 소리 다시 듣기</button>
                    </div>
                    <button id="dictationHintBtn" class="dictation-hint-btn" onclick="window.KoreanDictation.stepHint()">${hintButtonLabel()}</button>
                </div>
            </div>`;
        renderBoard();
        stopDictationAudio();
        audioTimer = setTimeout(() => {
            audioTimer = null;
            playDictationAudio(item);
        }, 500);
    }

    function renderRoundDone(container) {
        stopDictationAudio();
        if (!session) return;
        if (!session.practice) flushProgress();
        const next = ladder().currentRound(session.records, stateOf);
        if (next === null) {
            renderUnitComplete(container);
            return;
        }
        const nextInfo = ladder().ROUNDS.find(r => r.no === next);
        container.innerHTML = `
            <div class="dictation-done">
                <div class="dictation-done-icon">🎉</div>
                <p class="dictation-done-title">${session.round}단계를 모두 통과했어요!</p>
                <p class="dictation-done-text">다음은 ${nextInfo.icon} ${nextInfo.label} 단계예요. 지금 해도 좋고, 내일 이어서 해도 돼요.</p>
                <div class="dictation-done-actions">
                    <button class="quiz-button dictation-submit-btn" onclick="window.KoreanDictation.nextRound()">${nextInfo.icon} ${nextInfo.label} 시작</button>
                    <button class="quiz-button is-reset" onclick="closeMissionView()">✅ 나가기</button>
                </div>
            </div>`;
    }

    function renderUnitComplete(container) {
        const title = session.practice ? '연습을 모두 마쳤어요!' : '이 회차의 모든 단계를 통과했어요!';
        container.innerHTML = `
            <div class="dictation-done">
                <div class="dictation-done-icon">🏅</div>
                <p class="dictation-done-title">${title}</p>
                <p class="dictation-done-text">다시 연습해도 통과 기록은 그대로 남아 있어요.</p>
                <div class="dictation-done-actions">
                    <button class="quiz-button dictation-submit-btn" onclick="window.KoreanDictation.practiceAgain()">🔁 처음부터 다시 연습</button>
                    <button class="quiz-button is-reset" onclick="closeMissionView()">✅ 나가기</button>
                </div>
            </div>`;
    }

    /** 회차 고르기 카드에 보여 줄 진도 글자 */
    function unitBadge(records, child) {
        if (!ladder() || records.length === 0) return '';
        ladder().mergeFromRecords(child, records, false);
        const progress = ladder().progressOf(records, r => ladder().getState(child, r));
        if (progress.complete) return '🏅 완성';
        if (!progress.started) return '시작 전';
        return `⭐ ${progress.done} / ${progress.total}단계`;
    }

    // 전역 네임스페이스 (korean_common.js 파사드와 화면 버튼이 부른다)
    window.KoreanDictation = {
        beginSession,
        endSession,
        flushProgress,
        nextRound,
        practiceAgain,
        renderUI: renderDictationUI,
        renderRoundDone,
        unitBadge,
        verify,
        tapChip,
        tapSpace,
        backspace,
        resetBoard,
        stepHint,
        setWriteMode,
        requeueCurrent,
        revealNotebookAnswer,
        notebookResult,
        playAudio: playDictationAudio,
        replayAudio: replayDictationAudio,
        stopAudio: stopDictationAudio
    };

    window.renderDictationUI = renderDictationUI;
    window.verifyKoreanDictation = verify;
})();
