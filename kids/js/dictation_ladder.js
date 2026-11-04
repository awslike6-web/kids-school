// kids/js/dictation_ladder.js
// 🪜 받아쓰기 3단계 사다리 계산 엔진 (DOM 없음, 화면은 korean_dictation.js 담당)
// - 단계: 1 어절 블록 → 2 글자 자석 → 3 직접 쓰기. 문장마다 풀 수 있는 단계만 거친다.
// - 숙련도 칸 형식은 5분방과 같은 "count|첫 통과일|최근 통과일"이고, 받아쓰기에서 count는 통과한 단계 번호(0~3)다.
// - 철자 오답·날짜·병합 규칙은 quest-mastery.js(window.QuestMastery)를 그대로 쓴다.

(function (root) {
    'use strict';

    const ROUNDS = [
        { no: 1, key: 'blocks', icon: '🧱', label: '어절 블록' },
        { no: 2, key: 'letters', icon: '🧲', label: '글자 자석' },
        { no: 3, key: 'writing', icon: '✍️', label: '직접 쓰기' }
    ];
    const STORE_PREFIX = 'MINMIN_DICTATION_LADDER_V1_';
    const STALE_GUARD_MS = 10 * 60 * 1000; // Worker 엣지 캐시(5분)보다 넉넉한 최근 전송 보호 구간
    const HINT_AFTER_WRONG = 2; // 2번 틀리면 초성 힌트를 먼저 보여 준다
    const EASIER_AFTER_WRONG = 3; // 3번 틀리면 한 단계 쉬운 방식으로 내려 준다
    const MAX_TRAP_LETTERS = 2;
    const PUNCTUATION = /[.,!?'"“”‘’~…·]/g;

    const qm = () => root.QuestMastery;

    // ---------- 문장 다루기 ----------
    function normalize(text) {
        return String(text || '').normalize('NFC').trim().replace(/\s+/g, ' ');
    }

    function tokensOf(sentence) {
        const clean = normalize(sentence);
        return clean ? clean.split(' ') : [];
    }

    function hangulOf(token) {
        return String(token).replace(/[^가-힣]/g, '');
    }

    /**
     * 문장에서 철자 함정을 만들 어절 하나를 고른다 (겹받침 → 복합모음 → 받침 순, 같으면 앞 어절).
     * 만들 수 없으면 null: 예) `학교`, `노는 건 정말 즐거워.`
     */
    function pickTrap(sentence) {
        const tokens = tokensOf(sentence);
        const cleans = tokens.map(hangulOf);
        let best = null;
        tokens.forEach((token, index) => {
            const clean = cleans[index];
            if (!clean) return;
            const wrong = qm().misspellingsOf(clean).find(w => !cleans.includes(w));
            if (!wrong) return;
            const tier = qm().koreanTier(clean);
            if (!best || tier < best.tier) {
                best = { index, tier, token, clean, wrongClean: wrong, wrongToken: token.replace(clean, wrong) };
            }
        });
        return best;
    }

    // ---------- 단계 계산 ----------
    function eligibleRounds(sentence) {
        const tokens = tokensOf(sentence);
        const charCount = tokens.join('').length;
        const rounds = [];
        if (tokens.length >= 2) rounds.push(1);
        if (charCount >= 2 || pickTrap(sentence)) rounds.push(2);
        rounds.push(3);
        return rounds;
    }

    function nextRoundFor(sentence, passedRound) {
        const next = eligibleRounds(sentence).find(r => r > (passedRound || 0));
        return next === undefined ? null : next;
    }

    /** 아직 끝나지 않은 문장들의 가장 낮은 단계. 모두 끝났으면 null */
    function currentRound(items, stateOf) {
        const rounds = items
            .map(item => nextRoundFor(item.word, stateOf(item.id).c))
            .filter(r => r !== null);
        return rounds.length > 0 ? Math.min(...rounds) : null;
    }

    function queueFor(items, round, stateOf) {
        return items.filter(item => nextRoundFor(item.word, stateOf(item.id).c) === round);
    }

    function roundsIn(items) {
        return [...new Set(items.flatMap(item => eligibleRounds(item.word)))].sort((a, b) => a - b);
    }

    function progressOf(items, stateOf) {
        const all = roundsIn(items);
        const current = currentRound(items, stateOf);
        return {
            total: all.length,
            done: current === null ? all.length : all.filter(r => r < current).length,
            complete: current === null,
            started: items.some(item => stateOf(item.id).c > 0)
        };
    }

    function passRound(state, round, today) {
        return {
            c: Math.max(state.c || 0, round),
            s: state.s || today,
            r: today
        };
    }

    /** 이번에 보여 줄 입력 방식. 여러 번 틀린 문장은 막히지 않게 쉬운 방식으로 내려 준다 */
    function inputModeFor(round, wrongCount, sentence) {
        const key = ROUNDS.find(r => r.no === round).key;
        if (wrongCount < EASIER_AFTER_WRONG) return key;
        const eligible = eligibleRounds(sentence);
        if (key === 'writing' && eligible.includes(2)) return 'letters';
        if (key === 'letters' && eligible.includes(1)) return 'blocks';
        return key;
    }

    function shouldShowHint(wrongCount) {
        return wrongCount >= HINT_AFTER_WRONG;
    }

    // ---------- 문제 재료 ----------
    function shuffled(list, rng) {
        const out = [...list];
        for (let i = out.length - 1; i > 0; i--) {
            const j = Math.floor(rng() * (i + 1));
            [out[i], out[j]] = [out[j], out[i]];
        }
        return out;
    }

    // 처음부터 정답 순서로 놓이지 않게 몇 번 다시 섞는다
    function shuffledAwayFrom(list, rng) {
        let out = shuffled(list, rng);
        const answer = list.filter(x => !x.trap).map(x => x.text).join('\n');
        for (let i = 0; i < 8 && out.filter(x => !x.trap).map(x => x.text).join('\n') === answer; i++) {
            out = shuffled(list, rng);
        }
        return out;
    }

    function buildBlocks(sentence, rng = Math.random) {
        const chips = tokensOf(sentence).map((text, id) => ({ id, text, trap: false }));
        const trap = pickTrap(sentence);
        if (trap) chips.push({ id: chips.length, text: trap.wrongToken, trap: true });
        return shuffledAwayFrom(chips, rng);
    }

    function buildLetters(sentence, rng = Math.random) {
        const chars = Array.from(tokensOf(sentence).join(''));
        const chips = chars.map((text, id) => ({ id, text, trap: false }));
        const trap = pickTrap(sentence);
        if (trap) {
            const own = new Set(chars);
            [...new Set(Array.from(trap.wrongClean))]
                .filter(ch => !own.has(ch))
                .slice(0, MAX_TRAP_LETTERS)
                .forEach(text => chips.push({ id: chips.length, text, trap: true }));
        }
        return shuffledAwayFrom(chips, rng);
    }

    // ---------- 채점 ----------
    function stripPunctuation(text) {
        return text.replace(PUNCTUATION, '').replace(/\s+/g, ' ').trim();
    }

    /** kind: 'punct'(문장 부호만 다름) · 'space'(띄어쓰기만 다름) · 'letters'(글자가 다름) */
    function judge(target, submission) {
        const a = normalize(target);
        const b = normalize(submission);
        if (a === b) return { ok: true, kind: null };
        if (stripPunctuation(a) === stripPunctuation(b)) return { ok: false, kind: 'punct' };
        if (a.replace(/ /g, '') === b.replace(/ /g, '')) return { ok: false, kind: 'space' };
        return { ok: false, kind: 'letters' };
    }

    /** 정답 어절마다 아이가 쓴 같은 자리 어절과 다른지 표시 */
    function diffTokens(target, submission) {
        const written = tokensOf(submission);
        return tokensOf(target).map((text, i) => ({ text, wrong: written[i] !== text }));
    }

    // ---------- 저장 (로컬 즉시 + 노션 숙련도 칸 비동기) ----------
    function storage() {
        try { return root.localStorage || null; } catch (e) { return null; }
    }

    function loadStore(child) {
        let data = null;
        try {
            const ls = storage();
            data = ls ? JSON.parse(ls.getItem(STORE_PREFIX + child) || 'null') : null;
        } catch (e) { /* 깨진 값은 빈 저장소로 시작 */ }
        if (!data || typeof data !== 'object') data = {};
        data.items = data.items || {};
        data.dirty = data.dirty || {};
        data.pushedAt = data.pushedAt || {};
        return data;
    }

    function saveStore(child, store) {
        try {
            const ls = storage();
            if (ls) ls.setItem(STORE_PREFIX + child, JSON.stringify(store));
        } catch (e) {
            console.warn('[DictationLadder] 저장 실패:', e);
        }
    }

    function getState(child, id) {
        return loadStore(child).items[id] || { c: 0, s: '', r: '' };
    }

    /** isFresh=true: 노션에서 방금 읽은 값과 병합. false: 캐시 값은 로컬 기록이 없을 때만 씨앗으로 쓴다 */
    function mergeFromRecords(child, records, isFresh) {
        const store = loadStore(child);
        records.forEach(record => {
            const remote = qm().parseMastery(record.mastery);
            const local = store.items[record.id] || null;
            if (isFresh) {
                const recent = Date.now() - (store.pushedAt[record.id] || 0) < STALE_GUARD_MS;
                store.items[record.id] = qm().mergeRemote(local, remote, store.dirty[record.id], recent);
                if (store.dirty[record.id] && qm().formatMastery(store.items[record.id]) === qm().formatMastery(remote)) {
                    delete store.dirty[record.id];
                }
            } else if (!local) {
                store.items[record.id] = remote;
            }
        });
        saveStore(child, store);
    }

    function markPassed(child, id, round, today = qm().todayStr()) {
        const store = loadStore(child);
        store.items[id] = passRound(store.items[id] || { c: 0, s: '', r: '' }, round, today);
        store.dirty[id] = true;
        saveStore(child, store);
        return store.items[id];
    }

    /** 바뀐 문장의 숙련도만 노션에 보낸다. 달성 칸은 건드리지 않고(null), 실패한 문장은 다음에 다시 보낸다 */
    async function pushDirty(child, patchFn) {
        if (typeof patchFn !== 'function') return { sent: 0, failed: 0 };
        const ids = Object.keys(loadStore(child).dirty);
        let sent = 0;
        let failed = 0;
        for (const id of ids) {
            const text = qm().formatMastery(getState(child, id));
            let ok = false;
            try { ok = await patchFn(id, text, null); } catch (e) { ok = false; }
            if (!ok) { failed++; continue; }
            const latest = loadStore(child);
            // 보내는 사이 다음 단계를 통과했으면 표시를 남겨 다음에 다시 보낸다
            if (qm().formatMastery(latest.items[id] || { c: 0 }) === text) delete latest.dirty[id];
            latest.pushedAt[id] = Date.now();
            saveStore(child, latest);
            sent++;
        }
        return { sent, failed };
    }

    const api = {
        ROUNDS, normalize, tokensOf, pickTrap,
        eligibleRounds, nextRoundFor, currentRound, queueFor, roundsIn, progressOf, passRound,
        inputModeFor, shouldShowHint, buildBlocks, buildLetters, judge, diffTokens,
        loadStore, getState, mergeFromRecords, markPassed, pushDirty
    };
    root.DictationLadder = api;
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
