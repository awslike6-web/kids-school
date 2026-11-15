// kids/js/english_unit_bar.js
// 📚 영어방 단원 칩 바 & 「이번 단원 특별 활동」 칸 (window.EnglishUnitBar)
// - 칩 바 자체는 공통 부품 kids/core/unit_chip_bar.js(UnitChipBar)를 쓴다. 여기에는 영어방 설정만 둔다.
// - 학기·단원은 노션 VOCA_DB(fetchVocaFromNotion)의 「학년」·「단원」 원문. 표시만 L8 → 8단원.
// - 단원을 고르면 2~4단계가 그 단원으로 바로 시작한다(english_common.js가 applyToMission 호출).
// - 특별 활동 목록은 kids/subjects/english/data/english_unit_activities.js(ENGLISH_UNIT_ACTIVITIES).
(function () {
    'use strict';
    if (!window.UnitChipBar) {
        console.warn('[english-unit-bar] kids/core/unit_chip_bar.js가 먼저 로드되어야 합니다.');
        return;
    }
    const esc = window.UnitChipBar.escapeHtml;
    const PREVIEW_KEY = 'english_upper_preview_daughter';

    function isDaughterProfile() {
        try {
            return localStorage.getItem('currentUser') === 'daughter' || localStorage.getItem('currentUserName') === '민서';
        } catch (e) { return false; }
    }

    function isUpperPreview() {
        if (!isDaughterProfile()) return false;
        try { return localStorage.getItem(PREVIEW_KEY) === '1'; } catch (e) { return false; }
    }

    async function fetchRecords() {
        if (typeof window.fetchVocaFromNotion !== 'function') return [];
        const own = (await window.fetchVocaFromNotion({ subject: '영어', filterByStudent: true })) || [];
        if (!isUpperPreview()) return own;
        const upper = (await window.fetchVocaFromNotion({ subject: '영어', studentName: '민수', filterByStudent: true })) || [];
        const seen = new Set();
        return [...own, ...upper].filter(r => {
            const key = (r && (r.pageId || r.id || r.word)) || '';
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    function previewToggleHtml() {
        if (!isDaughterProfile()) return '';
        const on = isUpperPreview();
        return `<div class="english-preview-toggle-bar" style="margin-top:8px; display:flex; justify-content:flex-end;">
            <button type="button" class="unit-chip${on ? ' active' : ''}" onclick="EnglishUnitBar.toggleUpperPreview()">
                ${on ? '🎀 내 기초 단원만 보기' : '🔭 5학년 단원·특별활동 미리보기'}
            </button>
        </div>`;
    }

    function unitLabel(unit) {
        // 표시용 이름만 바꾼다 (L8 → 8단원). 단원 값 자체는 원문 그대로 쓴다.
        return /^L\d+$/i.test(unit) ? unit.replace(/\D/g, '') + '단원' : unit;
    }

    function activitiesFor(grade, unit) {
        const list = Array.isArray(window.ENGLISH_UNIT_ACTIVITIES) ? window.ENGLISH_UNIT_ACTIVITIES : [];
        return list.filter(a => a && a.grade === grade && a.unit === unit && a.href);
    }

    function activityHref(a) {
        const sep = a.href.includes('?') ? '&' : '?';
        return a.href + sep + 'grade=' + encodeURIComponent(a.grade) + '&unit=' + encodeURIComponent(a.unit);
    }

    function specialActivitiesHtml(pick) {
        const acts = pick.unit ? activitiesFor(pick.grade, pick.unit) : [];
        if (acts.length === 0) return '';
        return `<div class="english-unit-special"><div class="english-unit-special-title">⭐ 이번 단원 특별 활동</div><div class="english-grid">${
            acts.map(a => `<a class="english-grid-btn english-unit-special-card" href="${esc(activityHref(a))}">
                    <span class="english-btn-icon">${esc(a.icon || '⭐')}</span>
                    <div class="english-btn-title">${esc(a.title || '특별 활동')}</div>
                    <p class="english-btn-desc">${esc(a.desc || '')}</p>
                </a>`).join('')
        }</div></div>`;
    }

    const bar = window.UnitChipBar.create({
        globalName: 'EnglishUnitBar',
        boxId: 'englishUnitBar',
        storagePrefix: 'english_unit_pick',
        loadRecords: fetchRecords,
        gradesOf: r => (r.grades && r.grades.length) ? r.grades : [r.grade],
        unitOf: r => r.level,
        unitLabel,
        extraHtml: (pick) => previewToggleHtml() + specialActivitiesHtml(pick),
        hints: {
            all: '📌 단원을 고르면 2~4단계가 그 단원으로 바로 시작해요.',
            unitPerStage: '📌 {grade}만 골랐어요. 단원은 단계마다 고를 수 있어요.',
            unit: '📌 지금은 <strong>{grade} · {unit}</strong>으로 2~4단계가 바로 시작해요.'
        }
    });

    async function toggleUpperPreview(forceState) {
        const next = typeof forceState === 'boolean' ? forceState : !isUpperPreview();
        try { localStorage.setItem(PREVIEW_KEY, next ? '1' : '0'); } catch (e) { /* 저장 불가 시 무시 */ }
        if (!next && bar.getPick().grade.startsWith('5-')) bar.selectGrade(-1);
        await bar.init();
        return next;
    }

    window.EnglishUnitBar = {
        init: bar.init,
        render: bar.render,
        selectGrade: bar.selectGrade,
        selectUnit: bar.selectUnit,
        getPick: bar.getPick,
        fetchRecords,
        isUpperPreview,
        toggleUpperPreview,
        // english_common.js가 2~4단계를 열 때 부른다. 고른 학기·단원으로 바로 시작했으면 true.
        applyToMission: (candidateRecords) => bar.applyToMission(candidateRecords, {
            gradeUnit: (g, u) => window.selectDynamicGradeUnit && window.selectDynamicGradeUnit(g, u),
            grade: (g) => window.selectDynamicGrade && window.selectDynamicGrade(g)
        }),
        _state: bar._state
    };
})();
