// kids/js/english_classcard.js
// 🃏 영어 「클래스카드 연습」 대문 모듈 (window.EnglishClasscard)
// - 담임 클래스카드 시험 흐름을 그대로 연습한다: 1단계 테스트(2×4 짝맞추기, 1,500점) → 2단계 매칭(카드 넘기기 6지선다·철자).
// - 실제 앱과 다른 점은 시간제한(없음·천천히·기본)과 안심 모드(감점·잠금 없음)뿐이다. 아이가 구조에 익숙해지는 것이 목적.
// - 이 파일: 공용 도구·저장 상태·소리·보상 연결·화면 전환(로비·결과·안내창).
//   테스트 격자는 english_classcard_grid.js(EnglishClasscard.Grid), 카드 퀴즈는 english_classcard_cards.js(EnglishClasscard.Cards).
// - 카드 묶음은 kids/subjects/english/data/classcard_<학년>_L<단원>.js(window.CLASSCARD_DECK). 명세: docs/english_spec.md §2-3.
(function () {
    'use strict';

    const EC = window.EnglishClasscard = window.EnglishClasscard || {};

    const CONFIG = {
        PASS_SCORE: 1500,
        ROUND_SIZE: 10,
        PASS_REWARD: 3,
        TIMER_SECONDS: { none: 0, slow: 210, normal: 120 },
        TIMER_LABELS: { none: '없음', slow: '천천히 3분 30초', normal: '기본 2분' },
        // 2단계 철자: 타이핑 비중(블럭 전체·마무리 타이핑·전체 타이핑)과 자판 위치 안내(항상·막히면 반짝·끄기)
        SPELL_TYPING: ['tiles', 'finish', 'typing'],
        KEY_GUIDE: ['always', 'stuck', 'off']
    };
    const ADULTS = ['아빠', '엄마', '어른'];

    // ---------------- 공용 도구 ----------------
    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }
    // 고르게 섞기: 공용 부품(QuizChoices.shuffle, Fisher–Yates)을 먼저 쓰고, 아직 없으면 같은 방식으로 직접 섞는다. 원본은 그대로 둔다.
    function shuffle(list) {
        if (window.QuizChoices && typeof window.QuizChoices.shuffle === 'function') return window.QuizChoices.shuffle(list);
        const a = list.slice();
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }
    function pick(list) { return list[Math.floor(Math.random() * list.length)]; }
    function localDate(d = new Date()) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
    function $(id) { return document.getElementById(id); }
    function storageGet(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
    function isParent() { return ADULTS.includes(storageGet('currentUserName') || ''); }
    function profile() { return storageGet('currentUser') === 'daughter' ? 'daughter' : 'son'; }
    function deckKey(deck) { return `cc-${deck.grade}-${deck.unit}`; }

    // ---------------- 저장 상태 (아이·카드 묶음마다 따로) ----------------
    const state = {
        deck: null,
        section: 'all',        // 'all' | 구간 id 글자 | 'star'
        timerMode: 'none',     // 'none' | 'slow' | 'normal'
        errorless: true,       // 안심 모드
        bestScore: 0,
        unlocked: false,       // 1,500점을 한 번 넘으면 계속 열림 (실제 앱과 같음)
        preview: false,        // 부모 미리보기 잠금해제
        bookmarks: [],         // 별표 카드 id
        passRewardDate: '',    // 테스트 통과 보상을 받은 날 (하루 한 번)
        spellTyping: 'tiles',  // 2단계 철자 타이핑 비중
        keyGuide: 'stuck',     // 타이핑 자판 위치 안내 (기본: 막히면 반짝이기)

        key() { return `classcard_v1_${profile()}_${this.deck.grade}_${this.deck.unit}`; },
        load() {
            try {
                const saved = JSON.parse(localStorage.getItem(this.key()) || 'null');
                if (!saved || typeof saved !== 'object') return;
                ['section', 'timerMode', 'errorless', 'bestScore', 'unlocked', 'preview', 'bookmarks', 'passRewardDate', 'spellTyping', 'keyGuide'].forEach(k => {
                    if (k in saved) this[k] = saved[k];
                });
                if (!CONFIG.TIMER_SECONDS.hasOwnProperty(this.timerMode)) this.timerMode = 'none';
                if (!CONFIG.SPELL_TYPING.includes(this.spellTyping)) this.spellTyping = 'tiles';
                if (!CONFIG.KEY_GUIDE.includes(this.keyGuide)) this.keyGuide = 'stuck';
                if (!Array.isArray(this.bookmarks)) this.bookmarks = [];
                const ids = new Set(this.deck.items.map(i => i.id));
                this.bookmarks = this.bookmarks.filter(id => ids.has(id));
                // 카드 묶음을 고쳐 구간이 없어졌거나 값이 깨졌으면 전체로
                const sectionIds = this.deck.sections.map(s => String(s.id));
                if (this.section === 'star' ? this.bookmarks.length < 4 : this.section !== 'all' && !sectionIds.includes(String(this.section))) this.section = 'all';
                this.bestScore = Number(this.bestScore) || 0;
            } catch (e) { /* 저장값이 깨졌으면 기본값으로 시작 */ }
        },
        save() {
            const { section, timerMode, errorless, bestScore, unlocked, preview, bookmarks, passRewardDate, spellTyping, keyGuide } = this;
            try {
                localStorage.setItem(this.key(), JSON.stringify({ section, timerMode, errorless, bestScore, unlocked, preview, bookmarks, passRewardDate, spellTyping, keyGuide }));
            } catch (e) { /* 저장 불가 기기에서는 이번 열람 동안만 유지 */ }
        },
        reset() {
            this.bestScore = 0; this.unlocked = false; this.preview = false; this.bookmarks = []; this.section = 'all';
            this.save();
        },
        activeItems() {
            const items = this.deck.items;
            if (this.section === 'star') return items.filter(i => this.bookmarks.includes(i.id));
            if (this.section === 'all') return items.slice();
            return items.filter(i => String(i.section) === String(this.section));
        },
        canMatch() { return this.unlocked || this.preview || this.bestScore >= CONFIG.PASS_SCORE; },
        isBookmarked(id) { return this.bookmarks.includes(id); },
        toggleBookmark(id) {
            const at = this.bookmarks.indexOf(id);
            if (at >= 0) this.bookmarks.splice(at, 1); else this.bookmarks.push(id);
            this.save();
            return at < 0;
        },
        recordScore(score) {
            if (score > this.bestScore) this.bestScore = score;
            if (score >= CONFIG.PASS_SCORE) this.unlocked = true;
            this.save();
        }
    };

    // ---------------- 소리: 공부방 음성 엔진(fairy-*)만 쓴다 ----------------
    // 짝맞추기는 빠르게 이어지므로 짧은 효과음 + 영어 발음만, 카드 퀴즈는 칭찬·격려 음성을 쓴다.
    const sound = {
        ctx: null,
        speak(item, onEnd) { this.speakText(item.say || item.en, onEnd); },
        speakText(text, onEnd) {
            if (typeof window.speakEnglish === 'function') window.speakEnglish(text, onEnd);
            else if (typeof onEnd === 'function') onEnd();
        },
        stop() { if (typeof window.stopFairyTTS === 'function') window.stopFairyTTS(); },
        praise(onEnd) { if (typeof window.fairyPraise === 'function') window.fairyPraise(onEnd); else if (onEnd) onEnd(); },
        encourage() { if (typeof window.fairyEncourage === 'function') window.fairyEncourage(); },
        reward(type) { if (typeof window.fairyReward === 'function') window.fairyReward(type); },
        rate() { return typeof window.getEnglishSpeechRate === 'function' ? Number(window.getEnglishSpeechRate()) || 0.85 : 0.85; },
        setRate(r) { if (typeof window.setEnglishSpeechRate === 'function') window.setEnglishSpeechRate(r); },
        // 짧은 효과음 (Web Audio). ok: 맞힘, soft: 안심 모드 틀림, bad: 실전 모드 틀림
        chime(kind) {
            try {
                if (!this.ctx) {
                    const Ctx = window.AudioContext || window.webkitAudioContext;
                    if (!Ctx) return;
                    this.ctx = new Ctx();
                }
                if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
                const now = this.ctx.currentTime;
                const notes = kind === 'ok' ? [587.33, 880] : kind === 'soft' ? [260] : [210];
                notes.forEach((freq, i) => {
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    const t = now + i * 0.075;
                    osc.type = kind === 'bad' ? 'triangle' : 'sine';
                    osc.frequency.setValueAtTime(freq, t);
                    if (kind !== 'ok') osc.frequency.exponentialRampToValueAtTime(freq * 0.72, t + 0.18);
                    gain.gain.setValueAtTime(0.001, t);
                    gain.gain.exponentialRampToValueAtTime(kind === 'ok' ? 0.16 : 0.12, t + 0.02);
                    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
                    osc.connect(gain);
                    gain.connect(this.ctx.destination);
                    osc.start(t);
                    osc.stop(t + 0.24);
                });
            } catch (e) { /* 효과음이 안 나도 학습은 이어간다 */ }
        }
    };

    // ---------------- 보상·학습 기록 연결 (공용 부품만 부른다) ----------------
    const reward = {
        testStart() { window.StudyActivity?.setPhase?.('quiz'); },
        testEnd() { window.StudyActivity?.setPhase?.('paused'); },
        // 1,500점을 처음 넘은 날 한 번: 보석 + 학습일지 한 줄 (mission-reward-engine.js claimMissionRewardOnce)
        testPassed(score) {
            const today = localDate();
            if (state.passRewardDate === today || typeof window.claimMissionRewardOnce !== 'function') return;
            // 같은 열람 안의 중복은 claimMissionRewardOnce 키가 막고, 날짜는 지급이 끝난 뒤에 적는다 (실패하면 다음 통과 때 다시)
            Promise.resolve(window.claimMissionRewardOnce(`${profile()}_classcard_test_${deckKey(state.deck)}_${today}`, {
                amount: CONFIG.PASS_REWARD,
                missionType: 'classcard_test',
                subject: '영어',
                silent: false,
                skipStudyLog: false,
                errorReport: `클래스카드 ${state.deck.unit} 테스트 ${score.toLocaleString()}점 통과`
            })).then(ok => {
                if (ok === false) return;
                state.passRewardDate = today;
                state.save();
            }).catch(() => { /* 지급 실패: 날짜를 적지 않아 다음 통과 때 다시 시도 */ });
        },
        // 2단계 매칭: 공통 퀴즈 보상 세션 (2문제 맞힐 때마다 1개, 완주 보너스 + 학습일지 한 번)
        quizStart() { if (typeof window.initQuizRewardSession === 'function') window.initQuizRewardSession('classcard_match'); },
        quizCorrect(idx) { if (typeof window.rewardQuizCorrect === 'function') window.rewardQuizCorrect(idx); },
        quizEnd(isFullComplete, wrongWords) {
            if (typeof window.finalizeQuizRewardSession === 'function') {
                window.finalizeQuizRewardSession({
                    isFullComplete,
                    subject: '영어',
                    errorReport: wrongWords.length ? `클래스카드 ${state.deck.unit} 매칭 오답: ${wrongWords.join(', ')}` : `클래스카드 ${state.deck.unit} 매칭 오답 없음`
                });
            }
            window.LearningLog?.flush?.();
        },
        // 문항 단위 기록 (learning-log.js): 정적 자료 접두어 s: + 카드 묶음 + 카드 id
        tracker(item) {
            const L = window.LearningLog;
            if (!L || typeof L.question !== 'function' || typeof L.keyFor !== 'function') return null;
            const key = L.keyFor('s', deckKey(state.deck), item.id);
            return key ? L.question({ subject: '영어', key }) : null;
        }
    };

    // ---------------- 화면 전환 ----------------
    function showScreen(id) {
        document.querySelectorAll('.cc-screen').forEach(el => el.classList.toggle('active', el.id === id));
        window.scrollTo(0, 0);
    }

    function showModal({ emoji, title, desc, actions }) {
        $('cc-modal-emoji').textContent = emoji;
        $('cc-modal-title').textContent = title;
        $('cc-modal-desc').textContent = desc;
        const box = $('cc-modal-actions');
        box.innerHTML = '';
        actions.forEach(a => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = a.primary ? 'cc-btn cc-btn-green' : 'cc-btn cc-btn-outline';
            btn.textContent = a.label;
            btn.addEventListener('click', () => { hideModal(); a.onClick && a.onClick(); });
            box.appendChild(btn);
        });
        $('cc-modal').classList.add('active');
    }
    function hideModal() { $('cc-modal').classList.remove('active'); }

    function sectionPills() {
        const deck = state.deck;
        const pills = [{ value: 'all', label: `전체(${deck.items.length})` }]
            .concat(deck.sections.map(s => ({ value: String(s.id), label: `${s.label}(${deck.items.filter(i => i.section === s.id).length})` })));
        if (state.bookmarks.length >= 4) pills.push({ value: 'star', label: `⭐ 별표(${state.bookmarks.length})` });
        $('cc-section-pills').innerHTML = pills.map(p =>
            `<button type="button" class="cc-pill${state.section === p.value ? ' active' : ''}" data-section="${esc(p.value)}">${esc(p.label)}</button>`
        ).join('');
    }

    function syncLobby() {
        sectionPills();
        $('cc-word-count').textContent = `${state.activeItems().length}개 선택됨`;
        document.querySelectorAll('#cc-timer-pills .cc-pill').forEach(b => b.classList.toggle('active', b.dataset.timer === state.timerMode));
        document.querySelectorAll('#cc-typing-pills .cc-pill').forEach(b => b.classList.toggle('active', b.dataset.typing === state.spellTyping));
        document.querySelectorAll('#cc-guide-pills .cc-pill').forEach(b => b.classList.toggle('active', b.dataset.guide === state.keyGuide));
        $('cc-opt-errorless').checked = state.errorless;
        const rate = sound.rate();
        document.querySelectorAll('#cc-speed-group .cc-speed').forEach(b => b.classList.toggle('active', Math.abs(Number(b.dataset.speed) - rate) < 0.01));

        const pct = Math.min(100, Math.round(state.bestScore / CONFIG.PASS_SCORE * 100));
        $('cc-best-score').textContent = `${state.bestScore.toLocaleString()}점`;
        $('cc-progress-fill').style.width = `${pct}%`;
        $('cc-goal-status').textContent = state.bestScore >= CONFIG.PASS_SCORE ? '통과 완료! 🎉' : `목표 ${CONFIG.PASS_SCORE.toLocaleString()}점`;

        const open = state.canMatch();
        const step2 = $('cc-start-step2');
        step2.classList.toggle('locked', !open);
        $('cc-step2-badge').textContent = open ? '2단계 · 열림' : '2단계 · 잠김';
        $('cc-step2-icon').textContent = open ? '🃏' : '🔒';
        $('cc-step2-action').textContent = open ? '시작하기 →' : `🔒 ${CONFIG.PASS_SCORE.toLocaleString()}점 넘으면 열려요`;

        $('cc-parent-tools').hidden = !isParent();
        $('cc-preview-toggle').textContent = state.preview ? '미리보기 잠그기' : '2단계 미리보기 열기';
        $('cc-bookmark-count').textContent = `⭐ 별표 카드 ${state.bookmarks.length}개`;
    }

    function goLobby() {
        EC.Grid && EC.Grid.stop();
        EC.Cards && EC.Cards.leave();
        sound.stop();
        hideModal();
        syncLobby();
        showScreen('cc-lobby');
    }

    function goTest() {
        if (state.activeItems().length < 4) {
            showModal({ emoji: '📚', title: '카드가 4개보다 적어요', desc: '짝맞추기는 카드가 4개 이상 필요해요. 구간을 다시 골라 주세요.', actions: [{ label: '확인', primary: true }] });
            return;
        }
        showScreen('cc-test');
        EC.Grid.start();
    }

    function goQuiz() {
        if (!state.canMatch()) {
            showModal({
                emoji: '🔒', title: '2단계 매칭이 잠겨 있어요',
                desc: `먼저 1단계 테스트에서 ${CONFIG.PASS_SCORE.toLocaleString()}점을 넘으면 열려요!`,
                actions: [{ label: '1단계 테스트 하러 가기', primary: true, onClick: goTest }, { label: '닫기' }]
            });
            return;
        }
        if (state.activeItems().length === 0) { state.section = 'all'; state.save(); }
        showScreen('cc-quiz');
        EC.Cards.start();
    }

    // 결과 화면 (테스트·매칭 공용)
    function showSummary({ mode, emoji, title, scoreText, subtitle, wrongItems }) {
        EC.lastMode = mode; // 「다시 하기」가 방금 한 단계로 돌아가게
        const starred = state.deck.items.filter(i => state.isBookmarked(i.id));
        const rows = list => list.map(i => `
            <div class="cc-review-item">
                <div><div class="cc-review-en">${esc(i.en)}</div><div class="cc-review-ko">${esc(i.ko)}</div></div>
                <button type="button" class="cc-mini-speak" data-speak-id="${esc(i.id)}" aria-label="발음 듣기">🔊</button>
            </div>`).join('');
        const wrongHtml = wrongItems && wrongItems.length
            ? `<div class="cc-panel"><div class="cc-panel-title"><span>🔁 다시 볼 카드 (${wrongItems.length}개)</span></div><div class="cc-review-list">${rows(wrongItems)}</div></div>` : '';
        const canStep2 = mode === 'test' && state.canMatch();

        $('cc-summary-body').innerHTML = `
            <div class="cc-summary-hero">
                <div class="cc-summary-emoji">${emoji}</div>
                <h2>${esc(title)}</h2>
                <div class="cc-summary-score">${esc(scoreText)}</div>
                <p>${esc(subtitle)}</p>
                <div class="cc-summary-actions">
                    ${canStep2 ? '<button type="button" class="cc-btn cc-btn-green" data-act="quiz">2단계 매칭 하러 가기 →</button>' : ''}
                    <button type="button" class="cc-btn ${canStep2 ? 'cc-btn-outline' : 'cc-btn-green'}" data-act="retry">${mode === 'test' ? '1단계 테스트 다시 하기' : '매칭 다시 풀기'}</button>
                    <button type="button" class="cc-btn cc-btn-outline" data-act="home">처음 화면으로</button>
                </div>
            </div>
            ${wrongHtml}
            <div class="cc-panel">
                <div class="cc-panel-title"><span>⭐ 별표 카드 (${starred.length}개)</span></div>
                ${starred.length ? `<div class="cc-review-list">${rows(starred)}</div>` : '<div class="cc-empty-note">카드 위 ☆를 누르면 여기에 모여요.</div>'}
            </div>`;
        showScreen('cc-summary');
    }

    function bindEvents() {
        $('cc-section-pills').addEventListener('click', e => {
            const btn = e.target.closest('[data-section]');
            if (!btn) return;
            state.section = btn.dataset.section;
            state.save();
            syncLobby();
        });
        $('cc-timer-pills').addEventListener('click', e => {
            const btn = e.target.closest('[data-timer]');
            if (!btn) return;
            state.timerMode = btn.dataset.timer;
            state.save();
            syncLobby();
        });
        $('cc-typing-pills').addEventListener('click', e => {
            const btn = e.target.closest('[data-typing]');
            if (!btn) return;
            state.spellTyping = btn.dataset.typing;
            state.save();
            syncLobby();
        });
        $('cc-guide-pills').addEventListener('click', e => {
            const btn = e.target.closest('[data-guide]');
            if (!btn) return;
            state.keyGuide = btn.dataset.guide;
            state.save();
            syncLobby();
        });
        $('cc-opt-errorless').addEventListener('change', e => { state.errorless = e.target.checked; state.save(); });
        $('cc-speed-group').addEventListener('click', e => {
            const btn = e.target.closest('[data-speed]');
            if (!btn) return;
            sound.setRate(Number(btn.dataset.speed));
            syncLobby();
            sound.speak(state.deck.items[0]);
        });
        $('cc-start-step1').addEventListener('click', goTest);
        $('cc-start-step2').addEventListener('click', goQuiz);
        $('cc-preview-toggle').addEventListener('click', () => { state.preview = !state.preview; state.save(); syncLobby(); });
        $('cc-reset').addEventListener('click', () => showModal({
            emoji: '🔄', title: '기록을 지울까요?', desc: '최고 점수, 2단계 열림, 별표 카드가 모두 지워져요.',
            actions: [{ label: '지우기', primary: true, onClick: () => { state.reset(); syncLobby(); } }, { label: '취소' }]
        }));

        $('cc-test-back').addEventListener('click', goLobby);
        $('cc-test-finish').addEventListener('click', () => EC.Grid.finish(false));
        $('cc-quiz-back').addEventListener('click', goLobby);
        $('cc-quiz-star').addEventListener('click', () => EC.Cards.toggleStar());
        $('cc-summary-home').addEventListener('click', goLobby);
        $('cc-summary-body').addEventListener('click', e => {
            const speakBtn = e.target.closest('[data-speak-id]');
            if (speakBtn) {
                const item = state.deck.items.find(i => String(i.id) === speakBtn.dataset.speakId);
                if (item) sound.speak(item);
                return;
            }
            const act = e.target.closest('[data-act]');
            if (!act) return;
            if (act.dataset.act === 'quiz') goQuiz();
            else if (act.dataset.act === 'home') goLobby();
            else if (EC.lastMode === 'test') goTest();
            else goQuiz();
        });
    }

    function init(deck) {
        if (!deck || !Array.isArray(deck.items) || deck.items.length < 4) throw new Error('클래스카드 묶음이 비었거나 4개보다 적습니다.');
        state.deck = deck;
        state.load();
        $('cc-title').textContent = deck.title || `${deck.grade} ${deck.unit}`;
        $('cc-source').textContent = `${deck.source || ''} · 총 ${deck.items.length}개`;
        bindEvents();
        syncLobby();
        showScreen('cc-lobby');
    }

    Object.assign(EC, {
        CONFIG, state, sound, reward,
        util: { esc, shuffle, pick, localDate, $ },
        init, goLobby, goTest, goQuiz, showModal, hideModal, showSummary, syncLobby,
        lastMode: 'test'
    });
})();
