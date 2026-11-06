// kids/js/english_unit_bar.js
// 📚 영어방 단원 칩 바 & 「이번 단원 특별 활동」 칸 (window.EnglishUnitBar)
// - 영어방은 6단계 사다리가 뼈대다. 이 바에서 학기·단원을 먼저 고르면 2~4단계가 그 단원으로 바로 시작한다.
// - 학기·단원 목록은 노션 VOCA_DB(fetchVocaFromNotion)의 「학년」·「단원」 원문에서 만든다. 하드코딩 없음.
// - 고른 값은 아이별로 이 기기에만 기억한다(english_unit_pick_{son|daughter}). 저장이 안 돼도 화면은 그대로 동작한다.
// - 특별 활동 목록은 kids/subjects/english/data/english_unit_activities.js(ENGLISH_UNIT_ACTIVITIES)에서 읽는다.
(function () {
    'use strict';

    const ALL = '';
    let records = [];
    let pick = { grade: ALL, unit: ALL };

    function profileKey() {
        const profile = localStorage.getItem('currentUser') || 'son';
        return 'english_unit_pick_' + (profile === 'daughter' ? 'daughter' : 'son');
    }

    function loadPick() {
        try {
            const raw = localStorage.getItem(profileKey());
            const saved = raw ? JSON.parse(raw) : null;
            if (saved && typeof saved === 'object') {
                return { grade: String(saved.grade || ALL), unit: String(saved.unit || ALL) };
            }
        } catch (e) { /* 저장소를 못 읽으면 전체 보기로 시작 */ }
        return { grade: ALL, unit: ALL };
    }

    function savePick() {
        try { localStorage.setItem(profileKey(), JSON.stringify(pick)); } catch (e) { /* 기억만 못 할 뿐 동작은 그대로 */ }
    }

    function recordGrades(r) {
        return (r.grades && r.grades.length) ? r.grades : [r.grade];
    }

    function hasGrade(r, grade) {
        return recordGrades(r).includes(grade);
    }

    function unitOf(r) {
        return String(r.level ?? '').trim();
    }

    function sortNumeric(list) {
        return list.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    }

    function listGrades() {
        const set = new Set();
        records.forEach(r => recordGrades(r).forEach(g => { if (g && g !== '공통') set.add(g); }));
        return sortNumeric([...set]);
    }

    function listUnits(grade) {
        const set = new Set();
        records.forEach(r => {
            if (!hasGrade(r, grade)) return;
            const u = unitOf(r);
            if (u && u !== 'undefined' && u !== '기본 단원') set.add(u);
        });
        return sortNumeric([...set]);
    }

    function unitLabel(unit) {
        // 표시용 이름만 바꾼다 (L8 → 8단원). 단원 값 자체는 원문 그대로 쓴다.
        return /^L\d+$/i.test(unit) ? unit.replace(/\D/g, '') + '단원' : unit;
    }

    function escapeHtml(text) {
        return String(text).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
    }

    function chip(label, active, onclick) {
        return `<button type="button" class="reading-grade-chip${active ? ' active' : ''}" onclick="${onclick}">${escapeHtml(label)}</button>`;
    }

    function activitiesFor(grade, unit) {
        const list = Array.isArray(window.ENGLISH_UNIT_ACTIVITIES) ? window.ENGLISH_UNIT_ACTIVITIES : [];
        return list.filter(a => a && a.grade === grade && a.unit === unit && a.href);
    }

    function activityHref(a) {
        const sep = a.href.includes('?') ? '&' : '?';
        return a.href + sep + 'grade=' + encodeURIComponent(a.grade) + '&unit=' + encodeURIComponent(a.unit);
    }

    function render() {
        const box = document.getElementById('englishUnitBar');
        if (!box) return;
        const grades = listGrades();
        if (grades.length === 0) { box.innerHTML = ''; return; }

        // 노션에서 사라진 학기·단원을 기억하고 있으면 전체 보기로 되돌린다
        if (pick.grade && !grades.includes(pick.grade)) pick = { grade: ALL, unit: ALL };
        const units = pick.grade ? listUnits(pick.grade) : [];
        if (pick.unit && !units.includes(pick.unit)) pick.unit = ALL;

        let html = `<div class="english-unit-bar-row"><span class="english-unit-bar-label">학기</span><div class="reading-grade-bar english-unit-chips">`;
        html += chip('전체', !pick.grade, 'EnglishUnitBar.selectGrade(-1)');
        grades.forEach((g, i) => { html += chip(g, pick.grade === g, `EnglishUnitBar.selectGrade(${i})`); });
        html += `</div></div>`;

        if (pick.grade && units.length > 0) {
            html += `<div class="english-unit-bar-row"><span class="english-unit-bar-label">단원</span><div class="reading-grade-bar english-unit-chips">`;
            html += chip('단계마다 고르기', !pick.unit, 'EnglishUnitBar.selectUnit(-1)');
            units.forEach((u, i) => { html += chip(unitLabel(u), pick.unit === u, `EnglishUnitBar.selectUnit(${i})`); });
            html += `</div></div>`;
        }

        html += `<p class="english-unit-bar-hint">${pick.unit
            ? `📌 지금은 <strong>${escapeHtml(pick.grade)} · ${escapeHtml(unitLabel(pick.unit))}</strong>으로 2~4단계가 바로 시작해요.`
            : (pick.grade ? `📌 ${escapeHtml(pick.grade)}만 골랐어요. 단원은 단계마다 고를 수 있어요.` : '📌 단원을 고르면 2~4단계가 그 단원으로 바로 시작해요.')}</p>`;

        const acts = pick.unit ? activitiesFor(pick.grade, pick.unit) : [];
        if (acts.length > 0) {
            html += `<div class="english-unit-special"><div class="english-unit-special-title">⭐ 이번 단원 특별 활동</div><div class="english-grid">`;
            acts.forEach(a => {
                html += `<a class="english-grid-btn english-unit-special-card" href="${escapeHtml(activityHref(a))}">
                    <span class="english-btn-icon">${escapeHtml(a.icon || '⭐')}</span>
                    <div class="english-btn-title">${escapeHtml(a.title || '특별 활동')}</div>
                    <p class="english-btn-desc">${escapeHtml(a.desc || '')}</p>
                </a>`;
            });
            html += `</div></div>`;
        }

        box.innerHTML = html;
        box._grades = grades;
        box._units = units;
    }

    function selectGrade(idx) {
        const box = document.getElementById('englishUnitBar');
        const grades = (box && box._grades) || [];
        const grade = idx >= 0 ? (grades[idx] || ALL) : ALL;
        pick = { grade, unit: ALL };
        savePick();
        render();
    }

    function selectUnit(idx) {
        const box = document.getElementById('englishUnitBar');
        const units = (box && box._units) || [];
        pick.unit = idx >= 0 ? (units[idx] || ALL) : ALL;
        savePick();
        render();
    }

    // english_common.js가 2~4단계를 열 때 부른다. 고른 학기·단원으로 바로 시작했으면 true.
    function applyToMission(candidateRecords) {
        if (!pick.grade) return false;
        const inGrade = (candidateRecords || []).filter(r => hasGrade(r, pick.grade));
        if (inGrade.length === 0) return false; // 그 학기에 이 단계 문제가 없으면 원래 선택 화면으로
        if (pick.unit) {
            const inUnit = inGrade.filter(r => unitOf(r) === pick.unit);
            if (inUnit.length > 0 && typeof window.selectDynamicGradeUnit === 'function') {
                window.selectDynamicGradeUnit(pick.grade, pick.unit);
                return true;
            }
        }
        if (typeof window.selectDynamicGrade === 'function') {
            window.selectDynamicGrade(pick.grade);
            return true;
        }
        return false;
    }

    async function init() {
        pick = loadPick();
        if (typeof window.fetchVocaFromNotion !== 'function') return;
        try {
            records = await window.fetchVocaFromNotion({ subject: '영어', filterByStudent: true }) || [];
        } catch (e) {
            console.warn('[english-unit-bar] VOCA 조회 실패, 단원 칩 없이 시작:', e);
            records = [];
        }
        render();
    }

    window.EnglishUnitBar = { init, render, selectGrade, selectUnit, applyToMission, getPick: () => ({ ...pick }) };
})();
