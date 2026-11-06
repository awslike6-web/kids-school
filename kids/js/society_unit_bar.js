// kids/js/society_unit_bar.js
// 📚 사회방 학기·단원 칩 바 & 3단계 사다리 카드 갱신 (window.SocietyUnitBar)
// - 칩 바 자체는 공통 부품 kids/core/unit_chip_bar.js(UnitChipBar)를 쓴다. 여기에는 사회방 설정만 둔다.
// - 학기·단원 목록: 노션 VOCA_DB(용어방) + 교재·사료 DB(자료분석·지도탐방·역사사료)의 「학년」·「단원」 원문.
// - 단원을 고르면 사다리 카드마다 그 단원 자료 수를 보여 주고, 활동을 열면 선택 화면 없이 그 단원으로 시작한다.
// - 1단계 동화 카드는 그 단원 동화만, 3단계 5분 퀘스트 카드는 그 단원으로 바로 출발한다.
(function () {
    'use strict';
    if (!window.UnitChipBar) {
        console.warn('[society-unit-bar] kids/core/unit_chip_bar.js가 먼저 로드되어야 합니다.');
        return;
    }
    const esc = window.UnitChipBar.escapeHtml;
    const STAGES = ['voca', 'history', 'map', 'chart'];
    const COUNT_WORD = { voca: '용어', history: '사료', map: '명소', chart: '문제' };
    const byStage = { voca: [], history: [], map: [], chart: [] };

    function normalizeGrade(g) {
        return typeof window.normalizeSocietyGrade === 'function' ? window.normalizeSocietyGrade(g) : String(g || '').trim();
    }

    function gradesOf(r) {
        return ((r.grades && r.grades.length) ? r.grades : [r.grade]).map(normalizeGrade);
    }

    function gradeLabel(g) {
        // 표시용: "5-2 (5학년 2학기)" → "5-2"
        return String(g).replace(/\s*\(.*\)$/, '');
    }

    async function loadStage(stage) {
        try {
            if (stage === 'voca') {
                return typeof window.fetchVocaFromNotion === 'function'
                    ? await window.fetchVocaFromNotion({ subject: '사회', areaZone: '용어방', useServerFilter: true, filterByStudent: true })
                    : [];
            }
            return typeof window.fetchCurriculumFromNotion === 'function' ? await window.fetchCurriculumFromNotion(stage) : [];
        } catch (e) {
            console.warn(`[society-unit-bar] ${stage} 조회 실패:`, e);
            return [];
        }
    }

    async function loadRecords() {
        const lists = await Promise.all(STAGES.map(loadStage));
        STAGES.forEach((s, i) => {
            const local = typeof window.getCurriculumRecords === 'function' ? window.getCurriculumRecords(s) : [];
            const seen = new Set(lists[i].map(r => r.word || r.title || r.name));
            byStage[s] = [...lists[i], ...local.filter(r => !seen.has(r.word || r.title || r.name))];
        });
        return STAGES.flatMap(s => byStage[s]);
    }

    function booksFor(pick) {
        const lib = (window.SocietyStorybook && window.SocietyStorybook.getList) ? window.SocietyStorybook.getList() : [];
        if (pick.unit) return lib.filter(b => (b.units || []).includes(pick.unit));
        if (pick.grade) return lib.filter(b => normalizeGrade(b.grade) === pick.grade);
        return lib;
    }

    function questHref(pick) {
        let profile = 'son';
        try { profile = localStorage.getItem('currentUser') || 'son'; } catch (e) { /* 기본값 */ }
        const user = profile === 'daughter' ? 'minseo' : 'minsu';
        return `../../../quest_runner.html?subject=society&user=${user}` + (pick.unit ? `&unit=${encodeURIComponent(pick.unit)}` : '');
    }

    function updateLadder(pick) {
        STAGES.forEach(s => {
            const badge = document.querySelector(`[data-count-for="${s}"]`);
            const card = badge && badge.closest('.society-grid-btn');
            if (!badge) return;
            const n = bar.countFor(byStage[s]);
            badge.textContent = pick.grade ? `${COUNT_WORD[s]} ${n}개` : `${COUNT_WORD[s]} ${byStage[s].length}개`;
            if (card) card.classList.toggle('is-empty', !!pick.unit && n === 0);
            if (pick.unit && n === 0) badge.textContent = '이 단원 자료 준비 중';
        });

        const books = booksFor(pick);
        const bookBadge = document.querySelector('[data-count-for="storybook"]');
        if (bookBadge) bookBadge.textContent = books.length > 0 ? `동화 ${books.length}권` : '이 단원 동화 준비 중';
        const bookDesc = document.getElementById('ladderStorybookDesc');
        if (bookDesc) {
            bookDesc.innerHTML = pick.unit
                ? (books.length > 0
                    ? `<strong>이 단원 동화</strong> ${books.map(b => `「${esc(b.bookNum)}」`).join(' ')} 성우 구연동화로 먼저 이야기를 만나요!`
                    : '이 단원 동화는 아직 없어요. 눌러서 전체 서가를 둘러볼 수 있어요.')
                : bookDesc.dataset.defaultText;
        }
        const storyCard = bookBadge && bookBadge.closest('.society-grid-btn');
        if (storyCard) storyCard.classList.toggle('is-empty', !!pick.unit && books.length === 0);

        const quest = document.getElementById('ladderQuestLink');
        if (quest) quest.href = questHref(pick);
        const questDesc = document.getElementById('ladderQuestDesc');
        if (questDesc) {
            questDesc.textContent = pick.unit
                ? `「${pick.unit}」 용어로 3·3·3 퀘스트 한 판! 틀려도 괜찮아요.`
                : '부모님이 정해 둔 단원으로 3·3·3 퀘스트 한 판! 단원을 고르면 그 단원으로 출발해요.';
        }

        const goal = document.getElementById('societyGoalText');
        if (goal && !goal.dataset.adminLocked) {
            if (!goal.dataset.defaultText) goal.dataset.defaultText = goal.textContent;
            goal.textContent = pick.unit ? `📌 [${gradeLabel(pick.grade)}] ${pick.unit}` : goal.dataset.defaultText;
        }
    }

    const bar = window.UnitChipBar.create({
        globalName: 'SocietyUnitBar',
        boxId: 'societyUnitBar',
        storagePrefix: 'society_unit_pick',
        loadRecords,
        gradesOf,
        unitOf: r => r.level,
        gradeLabel,
        onChange: updateLadder,
        hints: {
            all: '📌 단원을 고르면 아래 활동이 모두 그 단원으로 바로 시작해요.',
            unitPerStage: '📌 {grade}만 골랐어요. 단원은 활동마다 고를 수 있어요.',
            unit: '📌 지금은 <strong>{grade} · {unit}</strong>으로 활동이 바로 시작해요.'
        }
    });

    window.SocietyUnitBar = {
        init: bar.init,
        render: bar.render,
        selectGrade: bar.selectGrade,
        selectUnit: bar.selectUnit,
        getPick: bar.getPick,
        booksFor: () => booksFor(bar.getPick()),
        // society_common.js가 용어방·돋보기·지도·차트를 열 때 부른다. 고른 학기·단원으로 바로 시작했으면 true.
        applyToMission: (records) => bar.applyToMission(records, {
            gradeUnit: (g, u) => window.selectSocietyGradeUnit && window.selectSocietyGradeUnit(g, u),
            grade: (g) => window.selectDynamicGrade && window.selectDynamicGrade(g)
        }),
        _state: bar._state
    };
})();
