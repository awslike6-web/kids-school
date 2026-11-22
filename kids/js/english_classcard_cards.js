// kids/js/english_classcard_cards.js
// 🃏 클래스카드 연습 2단계 「테스트」: 카드 넘기기 6지선다·철자 (window.EnglishClasscard.Cards)
// - 앞면에서 문제를 보고 카드를 왼쪽으로 밀면(또는 아래 띠를 누르면) 뒷면 보기가 나온다. 한 판 10장.
// - 유형 세 가지를 돌아가며: 뜻 보고 영어 고르기 · 소리 듣고 뜻 고르기 · 뜻 보고 철자 맞추기.
// - 보기 순서는 문제를 열 때 한 번 window.QuizChoices.arrange로 섞고, 채점은 원래 보기 번호로 한다 (GEMINI §4-5).
// - 철자는 로비의 「타이핑 비중」으로 정한다 (2026-11-23): 블럭 전체 / 마무리 타이핑(마지막 1~2문항) / 전체 타이핑.
//   🧩 글자 블럭은 기호 없는 세 낱말 이하 카드만, ⌨️ 타이핑(english_qwerty.js 폰 자판)은 기호가 든 문장도 낸다
//   (/·{2}·~·.·? 는 자판 모듈이 회색으로 미리 채우고 건너뜀). 맞지 않는 카드는 다른 카드와 자리를 바꾸고, 없으면 6지선다.
// - 타이핑 오타는 에러리스: 칸만 흔들리고 감점 없음. 자판 위치 안내(항상·막히면 반짝·끄기)는 로비 설정.
// - 정답 fairyPraise · 오답 fairyEncourage · 완주 fairyReward(공통 보상 세션). 문항기록은 s:cc-<학년>-<단원>:<카드 id>.
(function () {
    'use strict';

    const EC = window.EnglishClasscard = window.EnglishClasscard || {};
    const S = () => EC.state;
    const $ = id => document.getElementById(id);
    const esc = s => EC.util.esc(s);

    const TYPE_LABELS = { toEn: '뜻 보고 영어 고르기', toKo: '소리 듣고 뜻 고르기', spell: '뜻 보고 철자 맞추기', typing: '뜻 보고 직접 입력하기' };

    const c = {
        questions: [], idx: 0, side: 'front', answered: false, correct: 0,
        tile: null, qw: null, typoCount: 0, wrongItems: new Map(), tracker: null,
        active: false, finished: false, swipeX: null, swipeY: null, slideTimer: null
    };

    // ---------------- 문제 만들기 (DOM 없음) ----------------
    function isSpellable(item) {
        return /^[A-Za-z' ]+$/.test(item.en.trim()) && item.en.trim().split(/\s+/).length <= 3;
    }

    // 타이핑으로 낼 수 있는 카드: 자판 모듈이 건너뛰는 기호를 빼고 입력할 글자가 2개 이상
    function isTypable(item) {
        const Q = window.EnglishQwerty;
        if (!Q || typeof Q.buildSlots !== 'function') return isSpellable(item);
        return Q.buildSlots(item.en).filter(s => s.kind === 'key').length >= 2;
    }

    // 철자 자리(3번째마다) 중 타이핑으로 낼 자리: tiles 없음 · finish 마지막 1~2자리 · typing 전부
    function typingPositions(count, mode) {
        const spots = [];
        for (let i = 2; i < count; i += 3) spots.push(i);
        if (mode === 'typing') return new Set(spots);
        if (mode === 'finish') return new Set(spots.slice(spots.length >= 3 ? -2 : -1));
        return new Set();
    }

    function buildQuestions(active, all, size, typingMode = 'tiles') {
        const chosen = EC.util.shuffle(active).slice(0, Math.min(size, active.length));
        const typingAt = typingPositions(chosen.length, typingMode);
        const spare = active.filter(i => !chosen.includes(i));
        // 철자 자리에 맞지 않는 카드는 객관식 자리 카드나 남은 카드와 바꾼다
        for (let i = 2; i < chosen.length; i += 3) {
            const fits = typingAt.has(i) ? isTypable : isSpellable;
            if (fits(chosen[i])) continue;
            const j = chosen.findIndex((it, k) => k % 3 !== 2 && fits(it));
            if (j >= 0) { [chosen[i], chosen[j]] = [chosen[j], chosen[i]]; continue; }
            const s = spare.findIndex(fits);
            if (s >= 0) chosen[i] = spare.splice(s, 1)[0];
        }
        return chosen.map((item, i) => {
            const mod = i % 3;
            const typing = mod === 2 && typingAt.has(i) && isTypable(item);
            const type = typing ? 'typing' : mod === 1 ? 'toKo' : mod === 2 && isSpellable(item) ? 'spell' : 'toEn';
            if (type === 'spell' || type === 'typing') return { item, type, options: [] };
            const label = o => (type === 'toEn' ? o.en : o.ko);
            const source = active.length >= 6 ? active : all;
            const others = EC.util.shuffle(source.filter(o => o.id !== item.id && label(o) !== label(item))).slice(0, 5);
            return { item, type, options: [item].concat(others), order: null };
        });
    }

    // 철자 조각: 한 낱말은 글자 단위, 두 낱말은 2~3글자 덩어리, 세 낱말은 낱말 단위
    function tokenize(en) {
        const words = en.trim().split(/\s+/);
        if (words.length === 1) return words[0].split('');
        if (words.length >= 3) return words;
        const chunks = [];
        words.forEach(w => {
            if (w.length <= 4) chunks.push(w);
            else { const mid = Math.ceil(w.length / 2); chunks.push(w.slice(0, mid), w.slice(mid)); }
        });
        return chunks;
    }

    const norm = s => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');

    // ---------------- 진행 ----------------
    function start() {
        c.questions = buildQuestions(S().activeItems(), S().deck.items, EC.CONFIG.ROUND_SIZE, S().spellTyping);
        Object.assign(c, { idx: 0, side: 'front', answered: false, correct: 0, active: true, finished: false });
        c.wrongItems = new Map();
        EC.lastMode = 'quiz';
        EC.reward.quizStart();
        bindSwipe();
        openQuestion();
    }

    function closeKeyboard() {
        if (c.qw) { c.qw.destroy(); c.qw = null; }
    }

    function leave() {
        clearTimeout(c.slideTimer);
        closeKeyboard();
        if (c.active && !c.finished) EC.reward.quizEnd(false, wrongWords());
        c.active = false;
    }

    function wrongWords() { return Array.from(c.wrongItems.values()).map(i => i.en); }

    function current() { return c.questions[c.idx]; }

    function openQuestion() {
        const q = current();
        c.side = 'front';
        c.answered = false;
        c.tile = null;
        c.typoCount = 0;
        closeKeyboard();
        c.tracker = EC.reward.tracker(q.item);
        if (q.options.length && !q.order) {
            const labels = q.options.map(o => (q.type === 'toEn' ? o.en : o.ko));
            q.order = window.QuizChoices && typeof window.QuizChoices.arrange === 'function'
                ? window.QuizChoices.arrange(labels)
                : labels.map((text, index) => ({ text, index }));
        }
        render(true);
    }

    function slideThen(fn) {
        const card = $('cc-card');
        card.classList.add('slide-out');
        clearTimeout(c.slideTimer);
        c.slideTimer = setTimeout(() => { card.classList.remove('slide-out'); fn(); }, 170);
    }

    function flip() {
        if (c.side === 'back') return;
        slideThen(() => { c.side = 'back'; render(true); });
    }

    function next() {
        if (!c.answered) return;
        if (c.idx < c.questions.length - 1) slideThen(() => { c.idx += 1; openQuestion(); });
        else finish();
    }

    function finish() {
        if (c.finished || !c.active) return;
        c.finished = true;
        c.active = false;
        closeKeyboard();
        EC.reward.quizEnd(true, wrongWords());
        EC.showSummary({
            mode: 'quiz',
            emoji: '🌟',
            title: '2단계 테스트 완주!',
            scoreText: `${c.correct} / ${c.questions.length} 한 번에 정답`,
            subtitle: '차분하게 끝까지 잘 풀었어요!',
            wrongItems: Array.from(c.wrongItems.values())
        });
    }

    // ---------------- 그리기 ----------------
    function render(animate) {
        const q = current();
        $('cc-quiz-counter').innerHTML = `${c.idx + 1}<span>/${c.questions.length}</span>`;
        updateStar();
        const card = $('cc-card');
        if (animate) { card.classList.remove('slide-in'); void card.offsetWidth; card.classList.add('slide-in'); }
        if (c.side === 'front') renderFront(card, q);
        else if (q.type === 'spell') renderSpell(card, q);
        else if (q.type === 'typing') renderTyping(card, q);
        else renderChoices(card, q);
    }

    function footer(text, ready) {
        return `<button type="button" class="cc-swipe-footer${ready ? ' ready' : ''}" data-cc="advance"><span>««</span><span>${esc(text)}</span></button>`;
    }

    function renderFront(card, q) {
        const center = q.type === 'toKo'
            ? `<button type="button" class="cc-front-speaker" data-cc="speak" aria-label="발음 듣기">🔊</button>
               <div class="cc-front-sub">스피커를 누르면 다시 들려요</div>`
            : `<div class="cc-front-meaning">${esc(q.item.ko)}</div>`;
        card.innerHTML = `<span class="cc-type-chip">${TYPE_LABELS[q.type]}</span>
            <div class="cc-front-center">${center}</div>
            ${footer('문제를 확인하고, 카드를 왼쪽으로 미세요', false)}`;
        if (q.type === 'toKo') setTimeout(() => { if (c.side === 'front' && current() === q) EC.sound.speak(q.item); }, 180);
    }

    function renderChoices(card, q) {
        const rows = q.order.map((o, pos) => `
            <button type="button" class="cc-option" data-cc="choice" data-index="${o.index}">
                <span class="cc-opt-num">${pos + 1}</span><span class="cc-opt-text">${esc(o.text)}</span><span class="cc-opt-badge">정답</span>
            </button>`).join('');
        // 뒷면 위에 문제를 작게 다시 보여 준다 (소리 문제는 다시 듣기 단추)
        const prompt = q.type === 'toKo'
            ? '<button type="button" class="cc-back-speak" data-cc="speak" aria-label="다시 듣기">🔊 다시 듣기</button>'
            : `<div class="cc-back-prompt">${esc(q.item.ko)}</div>`;
        card.innerHTML = `${prompt}<div class="cc-options">${rows}</div>${footer('정답을 골라 보세요', false)}`;
    }

    function readyFooter() {
        const f = document.querySelector('#cc-card [data-cc="advance"]');
        if (!f) return;
        f.classList.add('ready');
        f.innerHTML = c.idx >= c.questions.length - 1
            ? '<span>🎉 마지막 문제 끝! 결과 보기 →</span>'
            : '<span>««</span><span>카드를 왼쪽으로 밀어 다음 문제로</span>';
    }

    function markCorrect(q) {
        c.answered = true;
        c.tracker && c.tracker.done();
        if (!c.wrongItems.has(q.item.id)) c.correct += 1;
        EC.reward.quizCorrect(c.idx);
        EC.sound.speak(q.item, () => EC.sound.praise());
        readyFooter();
    }

    // 실전 모드에서 틀리면 정답을 보여 주고 그 문항은 끝낸다
    function markWrongFinal(q) {
        c.answered = true;
        c.wrongItems.set(q.item.id, q.item);
        c.tracker && c.tracker.done();
        EC.sound.chime('bad');
        EC.sound.speak(q.item);
        readyFooter();
    }

    function choose(btn) {
        if (c.answered || btn.classList.contains('dimmed')) return;
        const q = current();
        const chosen = q.options[Number(btn.dataset.index)];
        const showEn = el => { if (q.type === 'toKo') el.querySelector('.cc-opt-text').textContent = `${q.item.ko} (${q.item.en})`; };
        if (chosen.id === q.item.id) {
            btn.classList.add('correct');
            showEn(btn);
            markCorrect(q);
            return;
        }
        c.tracker && c.tracker.wrong(btn.querySelector('.cc-opt-text').textContent);
        c.wrongItems.set(q.item.id, q.item);
        if (S().errorless) {
            // 안심 모드: 고른 보기만 흐려지고 다시 고를 수 있다
            btn.classList.add('dimmed');
            EC.sound.encourage();
            return;
        }
        btn.classList.add('wrong');
        btn.insertAdjacentHTML('beforeend', '<span class="cc-x-mark">✕</span>');
        const right = document.querySelector(`#cc-card .cc-option[data-index="${q.options.indexOf(q.item)}"]`);
        if (right) { right.classList.add('correct'); showEn(right); }
        markWrongFinal(q);
    }

    // ---------------- 철자 ----------------
    function renderSpell(card, q) {
        if (!c.tile) {
            const target = tokenize(q.item.en);
            c.tile = { target, pool: EC.util.shuffle(target.map((text, i) => ({ text, i }))), placed: [] };
        }
        card.innerHTML = `
            <div class="cc-spell">
                <span class="cc-spell-tag">🧩 글자 블럭</span>
                <div class="cc-spell-prompt">${esc(q.item.ko)}</div>
                <div id="cc-spell-area"></div>
            </div>
            ${footer('철자를 완성해 보세요', c.answered)}`;
        renderTiles(q);
        if (c.answered) readyFooter();
    }

    function matchedPrefix() {
        const t = c.tile;
        let n = 0;
        while (n < t.placed.length && t.pool[t.placed[n]].text === t.target[n]) n++;
        return n;
    }

    function renderTiles(q) {
        const t = c.tile;
        const placed = t.placed.length
            ? t.placed.map((p, pos) => `<button type="button" class="cc-tile placed" data-cc="unplace" data-pos="${pos}">${esc(t.pool[p].text)}</button>`).join('')
            : '<span class="cc-tile-guide">아래 조각을 순서대로 눌러요</span>';
        const pool = t.pool.map((tok, i) =>
            `<button type="button" class="cc-tile${t.placed.includes(i) ? ' used' : ''}" data-cc="place" data-pool="${i}">${esc(tok.text)}</button>`).join('');
        $('cc-spell-area').innerHTML = `
            <div class="cc-tile-answer${c.answered ? ' correct' : ''}" id="cc-tile-answer">${placed}</div>
            <div class="cc-tile-pool">${pool}</div>
            <div class="cc-spell-actions">
                <button type="button" class="cc-btn cc-btn-outline cc-btn-sm" data-cc="tilehint">💡 한 조각 힌트</button>
                <button type="button" class="cc-btn cc-btn-outline cc-btn-sm" data-cc="tileclear">↺ 지우기</button>
            </div>`;
    }

    function placeTile(poolIdx) {
        const t = c.tile;
        if (c.answered || t.placed.includes(poolIdx)) return;
        t.placed.push(poolIdx);
        renderTiles(current());
        if (t.placed.length === t.target.length) verifyTiles();
    }

    function tileHint() {
        if (c.answered) return;
        const t = c.tile;
        c.tracker && c.tracker.hint();
        t.placed = t.placed.slice(0, matchedPrefix());
        const need = t.target[t.placed.length];
        const found = t.pool.findIndex((tok, i) => tok.text === need && !t.placed.includes(i));
        if (found >= 0) placeTile(found);
    }

    function verifyTiles() {
        const q = current();
        const t = c.tile;
        const typed = t.placed.map(i => t.pool[i].text).join('');
        if (norm(typed) === norm(t.target.join(''))) {
            markCorrect(q);
            renderTiles(q);
            readyFooter();
            return;
        }
        c.tracker && c.tracker.wrong(t.placed.map(i => t.pool[i].text).join(' '));
        c.wrongItems.set(q.item.id, q.item);
        EC.sound.encourage();
        const zone = $('cc-tile-answer');
        if (zone) zone.classList.add('wrong-hint', 'shake');
        // 맞은 앞부분만 남기고 다시 고르게 한다 (조각은 감점 없이 몇 번이든)
        setTimeout(() => {
            if (current() !== q || c.answered || c.side !== 'back') return;
            t.placed = t.placed.slice(0, matchedPrefix());
            renderTiles(q);
        }, 600);
    }

    // ---------------- 타이핑 (폰 자판: english_qwerty.js) ----------------
    function renderTyping(card, q) {
        card.innerHTML = `
            <div class="cc-spell typing">
                <span class="cc-spell-tag">⌨️ 직접 입력</span>
                <div class="cc-spell-prompt">${esc(q.item.ko)}</div>
                <div class="cc-qwerty" id="cc-qwerty"></div>
            </div>
            ${footer('자판으로 철자를 입력해 보세요', c.answered)}`;
        if (!window.EnglishQwerty) {
            $('cc-qwerty').textContent = '자판을 불러오지 못했어요. 화면을 새로 열어 주세요.';
            return;
        }
        closeKeyboard();
        c.qw = window.EnglishQwerty.mount($('cc-qwerty'), {
            answer: q.item.en,
            guide: S().keyGuide,
            onComplete: () => { if (current() === q && !c.answered) markCorrect(q); },
            // 에러리스: 칸만 흔들린다. 문항기록에는 처음 세 번의 오타만 남긴다
            onWrong: key => {
                if (current() !== q || c.answered) return;
                c.typoCount += 1;
                c.wrongItems.set(q.item.id, q.item);
                if (c.typoCount <= 3 && c.tracker) c.tracker.wrong(key === 'space' ? '␣' : key);
                if (c.typoCount === 1) EC.sound.encourage(); else EC.sound.chime('soft');
            },
            onHint: () => { if (current() === q && c.tracker) c.tracker.hint(); }
        });
        if (c.answered) readyFooter();
    }

    // ---------------- 별표·밀기·누르기 ----------------
    function updateStar() {
        const q = current();
        const on = q && S().isBookmarked(q.item.id);
        const btn = $('cc-quiz-star');
        btn.textContent = on ? '★' : '☆';
        btn.classList.toggle('on', !!on);
    }

    function toggleStar() {
        const q = current();
        if (!q) return;
        S().toggleBookmark(q.item.id);
        updateStar();
    }

    function bindSwipe() {
        const wrap = $('cc-card-wrap');
        if (wrap.dataset.bound === '1') return;
        wrap.dataset.bound = '1';
        const begin = (x, y) => { c.swipeX = x; c.swipeY = y; };
        const end = (x, y) => {
            if (c.swipeX === null || !c.active) { c.swipeX = c.swipeY = null; return; }
            const dx = x - c.swipeX;
            const dy = Math.abs(y - c.swipeY);
            c.swipeX = c.swipeY = null;
            if (dx < -48 && dy < 80) { if (c.side === 'front') flip(); else next(); }
        };
        wrap.addEventListener('touchstart', e => begin(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
        wrap.addEventListener('touchend', e => end(e.changedTouches[0].clientX, e.changedTouches[0].clientY), { passive: true });
        wrap.addEventListener('mousedown', e => begin(e.clientX, e.clientY));
        wrap.addEventListener('mouseup', e => end(e.clientX, e.clientY));
        wrap.addEventListener('click', e => {
            const el = e.target.closest('[data-cc]');
            if (!el || !c.active) return;
            const act = el.dataset.cc;
            if (act === 'advance') { if (c.side === 'front') flip(); else next(); }
            else if (act === 'speak') EC.sound.speak(current().item);
            else if (act === 'choice') choose(el);
            else if (act === 'place') placeTile(Number(el.dataset.pool));
            else if (act === 'unplace') { if (!c.answered) { c.tile.placed.splice(Number(el.dataset.pos), 1); renderTiles(current()); } }
            else if (act === 'tilehint') tileHint();
            else if (act === 'tileclear') { if (!c.answered) { c.tile.placed = []; renderTiles(current()); } }
        });
    }

    EC.Cards = { start, leave, toggleStar, buildQuestions, tokenize, isSpellable, isTypable, typingPositions, _state: c };
})();
