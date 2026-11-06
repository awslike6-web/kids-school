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
        loadRecords: () => (typeof window.fetchVocaFromNotion === 'function'
            ? window.fetchVocaFromNotion({ subject: '영어', filterByStudent: true })
            : Promise.resolve([])),
        gradesOf: r => (r.grades && r.grades.length) ? r.grades : [r.grade],
        unitOf: r => r.level,
        unitLabel,
        extraHtml: specialActivitiesHtml,
        hints: {
            all: '📌 단원을 고르면 2~4단계가 그 단원으로 바로 시작해요.',
            unitPerStage: '📌 {grade}만 골랐어요. 단원은 단계마다 고를 수 있어요.',
            unit: '📌 지금은 <strong>{grade} · {unit}</strong>으로 2~4단계가 바로 시작해요.'
        }
    });

    window.EnglishUnitBar = {
        init: bar.init,
        render: bar.render,
        selectGrade: bar.selectGrade,
        selectUnit: bar.selectUnit,
        getPick: bar.getPick,
        // english_common.js가 2~4단계를 열 때 부른다. 고른 학기·단원으로 바로 시작했으면 true.
        applyToMission: (candidateRecords) => bar.applyToMission(candidateRecords, {
            gradeUnit: (g, u) => window.selectDynamicGradeUnit && window.selectDynamicGradeUnit(g, u),
            grade: (g) => window.selectDynamicGrade && window.selectDynamicGrade(g)
        }),
        _state: bar._state
    };
})();
