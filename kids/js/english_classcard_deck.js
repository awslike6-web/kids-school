// kids/js/english_classcard_deck.js
// 🃏 영어 「클래스카드 연습」 카드 묶음 불러오기 (window.EnglishClasscard.Deck)
// - 카드 묶음은 노션 「클래스카드 DB」(APP_CONFIG.CLASSCARD_DB_ID)가 원본이다. 코드에 카드를 적지 않는다(헌법 §7-4).
//   부모가 폰 노션에서 「사용」을 끄면 그 카드는 연습에서 빠지고, 새 단원은 노션 행(또는 scripts/register_classcard.py)만으로 생긴다.
// - 카드 하나 = {id: 카드번호, section: 구간, en: 영어, ko: 뜻, say: 읽기}. 엔진(english_classcard*.js)의 계약 그대로다.
//   카드번호는 별표·문항기록 키(s:cc-<학년>-<단원>:<번호>)라 노션에서도 바꾸지 않는다.
// - 학생 칸: 지금 아이 또는 「공통」 카드만. 민서가 영어방 「5학년 미리보기」를 켰으면 민수 카드도 본다(english_unit_bar.js와 같은 키).
// - 기기 기억: 노션에서 받은 마지막 묶음을 아이·단원마다 localStorage에 둔다. 통신이 안 되면 그것으로 연다.
// - 판정은 칸 값(학년·단원 선택지, 사용 체크, 숫자 칸)으로만 한다. 영어·뜻 글자를 잘라 해석하지 않는다(헌법 §7-9).
// - 명세: docs/english_spec.md §2-3, 노션 칸: docs/notion_schemas_school.md 「클래스카드 DB」.
(function () {
    'use strict';

    const EC = window.EnglishClasscard = window.EnglishClasscard || {};
    const MIN_CARDS = 4;                     // 매칭 2×4 판을 채우려면 최소 4장 (english_classcard.js init과 같은 기준)
    const TIMEOUT_MS = 6000;
    const DECK_CACHE = 'classcard_deck_v1';  // + _{son|daughter[_preview]}_{학년}_{단원}
    const UNITS_CACHE = 'classcard_units_v1';  // + _{son|daughter[_preview]}
    const PREVIEW_KEY = 'english_upper_preview_daughter';

    // ---------------- 환경 ----------------
    function cfg() { return window.APP_CONFIG || {}; }
    function dbId() { return cfg().CLASSCARD_DB_ID || ''; }
    function proxy() { return String(cfg().WORKER_PROXY_URL || '').replace(/\/+$/, ''); }
    function storageGet(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
    function storageSet(key, value) { try { localStorage.setItem(key, value); } catch (e) { /* 저장 불가 기기 */ } }
    function storageRemove(key) { try { localStorage.removeItem(key); } catch (e) { /* 저장 불가 기기 */ } }
    function profile() {
        if (storageGet('currentUser') === 'daughter') return 'daughter';
        if (storageGet('currentUser') === 'son') return 'son';
        return storageGet('currentUserName') === '민서' ? 'daughter' : 'son';
    }
    function viewKey() {
        const p = profile();
        return p + (p === 'daughter' && storageGet(PREVIEW_KEY) === '1' ? '_preview' : '');
    }

    // 지금 화면에서 보여 줄 학생 칸 값. 어른 로그인은 고른 아이 프로필을 따른다.
    function viewerStudents() {
        const p = profile();
        const list = [p === 'daughter' ? '민서' : '민수', '공통'];
        if (p === 'daughter' && storageGet(PREVIEW_KEY) === '1') list.push('민수');
        return list;
    }

    // ---------------- 노션 행 → 카드 ----------------
    const plain = prop => {
        const list = (prop && (prop.title || prop.rich_text)) || [];
        return list.map(t => (t.plain_text != null ? t.plain_text : (t.text && t.text.content) || '')).join('').trim();
    };
    const num = prop => (prop && typeof prop.number === 'number' ? prop.number : null);
    const selectName = prop => (prop && prop.select && prop.select.name) || '';

    function parsePage(page) {
        const p = (page && page.properties) || {};
        return {
            id: num(p['카드번호']),
            section: num(p['구간']),
            order: num(p['순번']),
            en: plain(p['영어']),
            ko: plain(p['뜻']),
            say: plain(p['읽기']),
            use: !!(p['사용'] && p['사용'].checkbox),
            grade: selectName(p['학년']),
            unit: selectName(p['단원']),
            students: ((p['학생'] && p['학생'].multi_select) || []).map(o => o.name)
        };
    }

    function visibleTo(row, students) {
        return row.students.some(s => students.includes(s));
    }

    // 표시용 제목만 만든다 (L11 → Lesson 11). 단원 값 자체는 노션 원문 그대로 쓴다.
    function deckTitle(grade, unit) {
        const m = /^L(\d+)$/i.exec(unit);
        return `${grade} ${m ? 'Lesson ' + m[1] : unit}`;
    }

    /**
     * 노션 행 목록 → 엔진 카드 묶음. 사용 꺼짐·학생 다름·번호 없음·글자 빈 카드는 빼고, 빈 구간은 만들지 않는다.
     * @returns {object|null} 카드가 MIN_CARDS보다 적으면 null
     */
    function buildDeck(rows, { grade, unit, students = viewerStudents() } = {}) {
        const seen = new Set();
        const items = (rows || []).map(r => (r && r.properties ? parsePage(r) : r))
            .filter(r => r && r.use && r.grade === grade && r.unit === unit && visibleTo(r, students))
            .filter(r => Number.isInteger(r.id) && r.id > 0 && Number.isInteger(r.section) && r.section > 0 && r.en && r.ko)
            .sort((a, b) => a.section - b.section || (a.order ?? a.id) - (b.order ?? b.id) || a.id - b.id)
            .filter(r => (seen.has(r.id) ? false : seen.add(r.id)))  // 노션에 같은 카드번호가 두 줄이면 앞의 것만
            .map(r => {
                const item = { id: r.id, section: r.section, en: r.en, ko: r.ko };
                if (r.say) item.say = r.say;
                return item;
            });
        if (items.length < MIN_CARDS) return null;
        const sectionIds = [...new Set(items.map(i => i.section))].sort((a, b) => a - b);
        return {
            grade, unit,
            title: deckTitle(grade, unit),
            source: '담임 클래스카드',
            sections: sectionIds.map(id => ({ id, label: `${id}구간` })),
            items
        };
    }

    // ---------------- 노션 조회 ----------------
    async function queryAll(filter, { force = false } = {}) {
        if (!dbId() || !proxy()) throw new Error('클래스카드 DB 설정이 없습니다 (APP_CONFIG.CLASSCARD_DB_ID)');
        const url = `${proxy()}/v1/databases/${dbId()}/query${force ? '?force=true' : ''}`;
        let results = [];
        let cursor = null;
        do {
            const controller = typeof AbortController === 'function' ? new AbortController() : null;
            const timer = controller ? setTimeout(() => controller.abort(), TIMEOUT_MS) : null;
            try {
                const body = { page_size: 100, filter, sorts: [{ property: '카드번호', direction: 'ascending' }] };
                if (cursor) body.start_cursor = cursor;
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                    signal: controller ? controller.signal : undefined
                });
                if (!res.ok) throw new Error(`클래스카드 DB 조회 오류 (상태: ${res.status})`);
                const data = await res.json();
                results = results.concat(data.results || []);
                cursor = data.has_more ? data.next_cursor : null;
            } finally {
                if (timer) clearTimeout(timer);
            }
        } while (cursor);
        return results;
    }

    function deckCacheKey(grade, unit) { return `${DECK_CACHE}_${viewKey()}_${grade}_${unit}`; }

    function readCache(key) {
        try {
            const saved = JSON.parse(storageGet(key) || 'null');
            return saved && typeof saved === 'object' ? saved : null;
        } catch (e) { return null; }
    }

    /**
     * 한 단원 카드 묶음을 연다. 노션을 새로 읽고(?force=true — 부모가 방금 끈 카드가 바로 빠지게), 안 되면 기기 기억.
     * @returns {Promise<{deck: object|null, from: 'notion'|'cache'|'none', error?: Error}>}
     *   deck=null & from='notion' → 노션에 그 단원 사용 카드가 4장보다 적음(준비 중). from='none' → 통신 실패 & 기억 없음.
     */
    async function load({ grade, unit }) {
        const key = deckCacheKey(grade, unit);
        try {
            const rows = await queryAll({
                and: [
                    { property: '학년', select: { equals: grade } },
                    { property: '단원', select: { equals: unit } },
                    { property: '사용', checkbox: { equals: true } }
                ]
            }, { force: true });
            const deck = buildDeck(rows, { grade, unit });
            if (deck) storageSet(key, JSON.stringify({ savedAt: Date.now(), deck }));
            else storageRemove(key);  // 부모가 다 껐으면 옛 기억으로 열지 않는다
            return { deck, from: 'notion' };
        } catch (error) {
            console.warn('[classcard-deck] 노션 조회 실패, 기기에 기억한 카드로 엽니다:', error);
            const saved = readCache(key);
            const deck = saved && saved.deck && Array.isArray(saved.deck.items) && saved.deck.items.length >= MIN_CARDS ? saved.deck : null;
            return { deck, from: deck ? 'cache' : 'none', error };
        }
    }

    /**
     * 영어방 「이번 단원 특별 활동」용: 지금 아이가 쓸 수 있는 클래스카드 단원 목록 [{grade, unit}].
     * 엣지 캐시(5분)를 그대로 쓰고, 실패하면 기기에 기억한 목록. 카드가 4장보다 적은 단원은 넣지 않는다.
     */
    async function listUnits() {
        const key = `${UNITS_CACHE}_${viewKey()}`;
        try {
            const rows = (await queryAll({ property: '사용', checkbox: { equals: true } })).map(parsePage);
            const students = viewerStudents();
            const groups = new Map();
            rows.forEach(r => {
                if (!r.grade || !r.unit) return;
                const k = JSON.stringify([r.grade, r.unit]);
                if (!groups.has(k)) groups.set(k, []);
                groups.get(k).push(r);
            });
            const units = [];
            groups.forEach((groupRows, k) => {
                const [grade, unit] = JSON.parse(k);
                if (buildDeck(groupRows, { grade, unit, students })) units.push({ grade, unit });
            });
            storageSet(key, JSON.stringify(units));
            return units;
        } catch (error) {
            console.warn('[classcard-deck] 단원 목록 조회 실패, 기기에 기억한 목록을 씁니다:', error);
            const saved = readCache(key);
            return Array.isArray(saved) ? saved : [];
        }
    }

    EC.Deck = { load, listUnits, buildDeck, parsePage, viewerStudents, deckTitle, MIN_CARDS };
})();
