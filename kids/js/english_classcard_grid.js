// kids/js/english_classcard_grid.js
// 🎯 클래스카드 연습 1단계 「테스트」: 2×4 짝맞추기 (window.EnglishClasscard.Grid)
// - 왼쪽 4칸 영어, 오른쪽 4칸 뜻. 맞힌 두 칸만 새 카드로 바뀐다.
// - 실제 클래스카드처럼 판 위에 맞는 짝은 보통 1쌍, 가끔 2쌍뿐이다(나머지 카드는 짝이 없음). 그래도 0쌍인 판은 없다.
//   짝 없이 오래 남은 카드는 곧 짝이 들어오게 해서 한 카드가 판에 계속 머물지 않게 한다. (2026-11-23 사용자 요청)
// - 영어 발음은 맞혔을 때만 나온다(소리 카드는 눌러서 듣기). 카드를 누르기만 해서는 읽지 않는다.
// - 점수: 기본 50, 2연속 80, 4연속 100, 소리 카드(실전 모드) 100. 1,500점을 넘으면 2단계 매칭이 열린다.
// - 시간제한: 없음(무제한)·천천히·기본 (english_classcard.js CONFIG.TIMER_SECONDS).
// - 안심 모드: 틀려도 감점·잠금 없이 살짝 흔들고 뜻을 알려 준다. 실전 모드: -50점 + 3초 잠금(실제 앱과 같음).
// - 판 계산(logic)은 DOM 없이 돌도록 따로 두었다: tests/english-classcard.test.mjs가 짝 수·중복·오래 남은 카드를 검사한다.
(function () {
    'use strict';

    const EC = window.EnglishClasscard = window.EnglishClasscard || {};

    // ---------------- 판 계산 (DOM 없음) ----------------
    const TWO_PAIR_CHANCE = 0.2;   // 짝 2쌍 판이 나올 확률 (나머지는 1쌍)
    const STALE_AFTER = 4;         // 짝 없이 이만큼 카드가 바뀌는 동안 남으면 그 카드의 짝을 넣어 준다

    const logic = {
        TWO_PAIR_CHANCE, STALE_AFTER,
        randomPick(list, rng) { return list[Math.floor(rng() * list.length)]; },
        shuffle(list, rng) {
            const a = list.slice();
            for (let i = a.length - 1; i > 0; i--) {
                const j = Math.floor(rng() * (i + 1));
                [a[i], a[j]] = [a[j], a[i]];
            }
            return a;
        },
        wantPairs(rng) { return rng() < TWO_PAIR_CHANCE ? 2 : 1; },
        countValidPairs(left, right) {
            const rightIds = new Set(right.filter(Boolean).map(w => w.id));
            return left.filter(w => w && rightIds.has(w.id)).length;
        },
        // 처음 판: 짝 1쌍(가끔 2쌍) + 짝 없는 카드. 카드가 모자란 작은 구간은 짝이 더 생길 수 있다(어쩔 수 없음).
        initialBoard(pool, rng = Math.random) {
            const k = logic.wantPairs(rng);
            const left = logic.shuffle(pool, rng).slice(0, 4);
            const leftIds = new Set(left.map(w => w.id));
            const pairs = left.slice(0, k);
            const others = logic.shuffle(pool.filter(w => !leftIds.has(w.id)), rng).slice(0, 4 - k);
            const fill = left.slice(k).slice(0, 4 - k - others.length); // 다른 카드가 모자랄 때만 짝으로 채움
            return { left: logic.shuffle(left, rng), right: logic.shuffle(pairs.concat(others, fill), rng) };
        },
        // 맞힌 칸(lIdx, rIdx)에 넣을 새 카드 두 장.
        // 규칙: ① 같은 열에 같은 카드 없음 ② 짝은 1쌍(가끔 2쌍), 0쌍은 절대 없음
        //       ③ 짝 없이 오래 남은 카드(ages ≥ STALE_AFTER)가 있으면 그 짝부터 ④ 방금 맞힌 카드는 바로 다시 안 나옴
        // opts: { leftAge: [], rightAge: [] } 칸마다 짝 없이 지나간 횟수 (화면이 센다)
        refillPair(left, right, lIdx, rIdx, pool, rng = Math.random, opts = {}) {
            const restLeft = left.filter((w, i) => i !== lIdx && w);
            const restRight = right.filter((w, i) => i !== rIdx && w);
            const leftIds = new Set(restLeft.map(w => w.id));
            const rightIds = new Set(restRight.map(w => w.id));
            const leftCands = pool.filter(w => !leftIds.has(w.id));
            const rightCands = pool.filter(w => !rightIds.has(w.id));
            const base = logic.countValidPairs(restLeft, restRight);
            const pairsWith = (L, R) => base + (rightIds.has(L.id) ? 1 : 0) + (leftIds.has(R.id) ? 1 : 0) + (L.id === R.id ? 1 : 0);

            const combos = [];
            leftCands.forEach(L => rightCands.forEach(R => combos.push({ L, R, n: pairsWith(L, R) })));
            const want = logic.wantPairs(rng);
            let ok = combos.filter(c => c.n === want);
            if (!ok.length) {
                // 원하는 수가 안 되면(작은 구간) 0쌍이 아닌 것 중 가장 가까운 수
                const usable = combos.filter(c => c.n >= 1);
                const best = Math.min(...usable.map(c => Math.abs(c.n - want)));
                ok = usable.filter(c => Math.abs(c.n - want) === best);
            }
            const matchedId = left[lIdx] && left[lIdx].id;
            const noRepeat = ok.filter(c => c.L.id !== matchedId && c.R.id !== matchedId);
            if (noRepeat.length) ok = noRepeat;

            // 짝 없이 오래 남은 카드: 왼쪽 X는 오른쪽에 X를, 오른쪽 Y는 왼쪽에 Y를 넣으면 짝이 된다
            const lAge = opts.leftAge || [];
            const rAge = opts.rightAge || [];
            const stale = [];
            left.forEach((w, i) => { if (i !== lIdx && w && !rightIds.has(w.id) && (lAge[i] || 0) >= STALE_AFTER) stale.push({ side: 'L', w, age: lAge[i] }); });
            right.forEach((w, i) => { if (i !== rIdx && w && !leftIds.has(w.id) && (rAge[i] || 0) >= STALE_AFTER) stale.push({ side: 'R', w, age: rAge[i] }); });
            stale.sort((a, b) => b.age - a.age);
            if (stale.length) {
                // 오래 남은 카드의 짝은 원하는 짝 수 안에서 먼저 넣는다. 그 안에서 안 되면 보통 다음 차례에 넣으면 되지만
                // (1쌍 판을 지키려고), 아주 오래(STALE_AFTER + 2) 남은 카드는 2쌍 판이 되더라도 지금 넣는다.
                const wide = combos.filter(c => c.n >= 1 && c.n <= 2 && c.L.id !== matchedId && c.R.id !== matchedId);
                for (const s of stale) {
                    const pairsIt = c => (s.side === 'L' ? c.R.id === s.w.id : c.L.id === s.w.id);
                    const helps = ok.filter(pairsIt);
                    const helpsWide = helps.length || s.age < STALE_AFTER + 2 ? helps : wide.filter(pairsIt);
                    if (helpsWide.length) { ok = helpsWide; break; }
                }
            }
            const pick = logic.randomPick(ok, rng);
            return { newLeft: pick.L, newRight: pick.R };
        },
        pointsFor(combo, audioOnly) {
            let pts = audioOnly ? 100 : 50;
            if (combo >= 4) pts = Math.max(pts, 100);
            else if (combo >= 2) pts = Math.max(pts, 80);
            return pts;
        }
    };

    // ---------------- 화면 ----------------
    const LOCK_MS = 3000;
    const g = {
        pool: [], left: [], right: [],   // 칸: { item, audioOnly, lockedUntil, fresh }
        selL: null, selR: null,
        score: 0, combo: 0, matched: 0, wrong: 0,
        wrongItems: new Map(),
        passedShown: false, paused: false, remaining: 0,
        tick: null, toastTimer: null, refillTimer: null
    };

    const S = () => EC.state;
    const $ = id => document.getElementById(id);
    const esc = s => EC.util.esc(s);

    function slotOf(item) {
        return { item, audioOnly: !S().errorless && Math.random() < 0.15, lockedUntil: 0, fresh: true, age: 0 };
    }
    function rightSlotOf(item) { return { item, lockedUntil: 0, fresh: true, age: 0 }; }

    // 카드를 바꾼 뒤: 짝이 있는 칸은 0, 짝 없이 남은 칸은 1 늘린다 (오래 남은 카드는 판 계산이 짝을 넣어 줌)
    // 방금 들어온 칸(lIdx, rIdx)은 0에서 시작한다
    function ageSlots(lIdx, rIdx) {
        const leftIds = new Set(g.left.map(s => s.item.id));
        const rightIds = new Set(g.right.map(s => s.item.id));
        g.left.forEach((s, i) => { s.age = i === lIdx || rightIds.has(s.item.id) ? 0 : s.age + 1; });
        g.right.forEach((s, i) => { s.age = i === rIdx || leftIds.has(s.item.id) ? 0 : s.age + 1; });
    }

    function sizeClass(text) {
        const n = String(text).length;
        return n > 24 ? ' xlong' : n > 13 ? ' long' : '';
    }

    function start() {
        stop();
        g.pool = S().activeItems();
        const board = logic.initialBoard(g.pool);
        g.left = board.left.map(slotOf);
        g.right = board.right.map(rightSlotOf);
        Object.assign(g, { selL: null, selR: null, score: 0, combo: 0, matched: 0, wrong: 0, passedShown: false, paused: false });
        g.wrongItems = new Map();
        EC.lastMode = 'test';
        EC.reward.testStart();
        updateHeader();
        render();
        startTimer();
    }

    function stop() {
        clearInterval(g.tick);
        clearTimeout(g.toastTimer);
        clearTimeout(g.refillTimer);
        g.tick = g.toastTimer = g.refillTimer = null;
        const toastEl = $('cc-toast');
        if (toastEl) toastEl.classList.remove('show');
        if (!g.pool.length) return;
        if (g.score) EC.state.recordScore(g.score); // 뒤로 나가도 최고 점수는 남긴다
        EC.reward.testEnd();
    }

    function cardHtml(side, idx) {
        const slot = side === 'L' ? g.left[idx] : g.right[idx];
        const sel = side === 'L' ? g.selL === idx : g.selR === idx;
        const cls = ['cc-grid-card', side === 'L' ? 'en' : 'ko'];
        if (sel) cls.push('selected');
        if (slot.fresh) { cls.push('refill-in'); slot.fresh = false; }
        let inner;
        if (side === 'L' && slot.lockedUntil > Date.now()) {
            cls.push('locked');
            inner = `<div class="cc-lock-en">"${esc(slot.item.en)}"</div><div class="cc-lock-ko">${esc(slot.item.ko)}</div>
                <div class="cc-lock-sec">${Math.ceil((slot.lockedUntil - Date.now()) / 1000)}</div>`;
        } else if (side === 'L' && slot.audioOnly) {
            inner = '<span class="cc-pts">100</span><span class="cc-audio-icon" aria-hidden="true">🔊</span><span class="cc-audio-hint">눌러서 듣기</span>';
        } else {
            const text = side === 'L' ? slot.item.en : slot.item.ko;
            inner = `${side === 'L' ? '<span class="cc-pts">50</span>' : ''}<span class="cc-card-text${sizeClass(text)}">${esc(text)}</span>`;
        }
        return `<button type="button" class="${cls.join(' ')}" data-side="${side}" data-idx="${idx}">${inner}</button>`;
    }

    function render() {
        let html = '';
        for (let r = 0; r < 4; r++) html += cardHtml('L', r) + cardHtml('R', r);
        $('cc-grid').innerHTML = html;
    }

    function cardEl(side, idx) { return document.querySelector(`#cc-grid [data-side="${side}"][data-idx="${idx}"]`); }

    function markSelection() {
        document.querySelectorAll('#cc-grid .cc-grid-card').forEach(el => {
            const idx = Number(el.dataset.idx);
            el.classList.toggle('selected', el.dataset.side === 'L' ? g.selL === idx : g.selR === idx);
        });
    }

    function tap(side, idx) {
        if (g.paused || g.refillTimer) return;
        const slot = side === 'L' ? g.left[idx] : g.right[idx];
        if (!slot || slot.lockedUntil > Date.now()) return;
        if (side === 'L') {
            // 실제 앱처럼 영어 카드는 눌러도 읽지 않는다. 소리 카드만 눌러서 듣는다.
            if (slot.audioOnly) EC.sound.speak(slot.item);
            g.selL = g.selL === idx ? null : idx;
        } else {
            g.selR = g.selR === idx ? null : idx;
        }
        markSelection();
        if (g.selL !== null && g.selR !== null) check(g.selL, g.selR);
    }

    function shake(el) {
        if (!el) return;
        el.classList.remove('shake');
        void el.offsetWidth;
        el.classList.add('shake');
    }

    function check(lIdx, rIdx) {
        const L = g.left[lIdx];
        const R = g.right[rIdx];
        g.selL = g.selR = null;
        const lEl = cardEl('L', lIdx);
        const rEl = cardEl('R', rIdx);

        if (L.item.id === R.item.id) {
            g.combo += 1;
            g.matched += 1;
            const pts = logic.pointsFor(g.combo, L.audioOnly);
            g.score += pts;
            EC.sound.chime('ok');
            EC.sound.speak(L.item); // 맞혔을 때만 영어를 읽어 준다
            popScore(`+${pts}`, false, g.combo >= 2 ? `${g.combo} COMBO` : '');
            updateHeader();
            lEl && lEl.classList.add('matched-out');
            rEl && rEl.classList.add('matched-out');
            g.refillTimer = setTimeout(() => {
                g.refillTimer = null;
                const next = logic.refillPair(g.left.map(s => s.item), g.right.map(s => s.item), lIdx, rIdx, g.pool, Math.random,
                    { leftAge: g.left.map(s => s.age), rightAge: g.right.map(s => s.age) });
                g.left[lIdx] = slotOf(next.newLeft);
                g.right[rIdx] = rightSlotOf(next.newRight);
                ageSlots(lIdx, rIdx);
                render();
                checkPass();
            }, 210);
            return;
        }

        g.combo = 0;
        g.wrong += 1;
        g.wrongItems.set(L.item.id, L.item);
        markSelection();
        if (S().errorless) {
            EC.sound.chime('soft');
            shake(lEl);
            shake(rEl);
            toast(`💡 <strong>${esc(L.item.en)}</strong> = ${esc(L.item.ko)}`);
        } else {
            EC.sound.chime('bad');
            g.score = Math.max(0, g.score - 50);
            popScore('-50', true, '');
            updateHeader();
            L.lockedUntil = Date.now() + LOCK_MS;
            render();
        }
    }

    function checkPass() {
        if (g.passedShown || g.score < EC.CONFIG.PASS_SCORE) return;
        g.passedShown = true;
        g.paused = true;
        EC.state.recordScore(g.score);
        EC.sound.reward('quest');
        EC.reward.testPassed(g.score);
        EC.showModal({
            emoji: '🎉',
            title: `${EC.CONFIG.PASS_SCORE.toLocaleString()}점 통과!`,
            desc: '대단해요! 이제 2단계 매칭(카드 넘기기)이 열렸어요.',
            actions: [
                { label: '2단계 매칭 하러 가기 →', primary: true, onClick: () => { stop(); EC.goQuiz(); } },
                { label: '계속 점수 올리기', onClick: () => { g.paused = false; } }
            ]
        });
    }

    function startTimer() {
        const el = $('cc-timer');
        el.className = 'cc-timer';
        const total = EC.CONFIG.TIMER_SECONDS[S().timerMode] || 0;
        g.remaining = total;
        if (!total) el.textContent = '∞ 시간제한 없음';
        else renderTimer();
        // 1초마다: 남은 시간(제한이 있을 때) + 실전 모드 잠금 칸 숫자
        g.tick = setInterval(() => {
            if (g.left.some(s => s.lockedUntil)) {
                g.left.forEach(s => { if (s.lockedUntil && s.lockedUntil <= Date.now()) s.lockedUntil = 0; });
                if (!g.refillTimer) render();
            }
            if (!total || g.paused) return;
            g.remaining -= 1;
            renderTimer();
            if (g.remaining <= 0) finish(true);
        }, 1000);
    }

    function renderTimer() {
        const el = $('cc-timer');
        const m = String(Math.floor(g.remaining / 60)).padStart(2, '0');
        const s = String(g.remaining % 60).padStart(2, '0');
        // 안심 모드는 마지막 30초에도 재촉하지 않고 색만 바꾼다
        const hurry = g.remaining <= 30;
        el.className = 'cc-timer' + (hurry ? (S().errorless ? ' amber' : ' hurry') : '');
        el.textContent = hurry && !S().errorless && g.remaining % 4 === 0 ? 'Hurry UP!!' : `${m}:${s}`;
    }

    function updateHeader() {
        const pass = EC.CONFIG.PASS_SCORE;
        $('cc-score').textContent = g.score.toLocaleString();
        $('cc-goal-bar').style.width = `${Math.min(100, Math.round(g.score / pass * 100))}%`;
        $('cc-goal-text').textContent = g.score >= pass ? '통과 완료! 🎉' : `${g.score.toLocaleString()} / ${pass.toLocaleString()}`;
    }

    function popScore(text, negative, combo) {
        const el = $('cc-score-pop');
        el.className = 'cc-score-pop' + (negative ? ' negative' : '');
        el.innerHTML = `<span>${esc(text)}</span>${combo ? `<span class="cc-combo">${esc(combo)}</span>` : ''}`;
        void el.offsetWidth;
        el.classList.add('show');
    }

    function toast(html) {
        const el = $('cc-toast');
        el.innerHTML = html;
        el.classList.add('show');
        clearTimeout(g.toastTimer);
        g.toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
    }

    function finish(timeUp) {
        stop();
        EC.state.recordScore(g.score);
        const passed = g.score >= EC.CONFIG.PASS_SCORE;
        // 마지막 짝을 맞힌 직후(새 카드가 채워지기 전) 시간이 끝나도 통과 보상은 준다
        if (passed && !g.passedShown) {
            g.passedShown = true;
            EC.reward.testPassed(g.score);
        }
        EC.showSummary({
            mode: 'test',
            emoji: passed ? '🏆' : timeUp ? '⏰' : '👏',
            title: passed ? '테스트 통과!' : timeUp ? '시간이 다 됐어요. 잘했어요!' : '테스트 연습 끝!',
            scoreText: `${g.score.toLocaleString()}점`,
            subtitle: `맞춘 짝 ${g.matched}개 · 최고 기록 ${EC.state.bestScore.toLocaleString()}점`,
            wrongItems: Array.from(g.wrongItems.values())
        });
    }

    document.addEventListener('click', e => {
        const card = e.target.closest('#cc-grid .cc-grid-card');
        if (card) tap(card.dataset.side, Number(card.dataset.idx));
    });

    EC.Grid = { logic, start, stop, finish, _state: g };
})();
