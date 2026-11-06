// kids/core/unit_chip_bar.js
// 📚 과목방 공통 학기·단원 칩 바 (window.UnitChipBar)
// - 과목방 대기실에서 학기·단원을 먼저 고르면, 각 활동이 단원 선택 화면 없이 그 단원으로 바로 시작한다.
// - 학기·단원 목록은 과목방이 넘겨 준 노션 기록의 원문으로 만든다(하드코딩 없음). 표시 이름만 unitLabel로 바꾼다.
// - 고른 값은 이 기기에만 아이별로 기억한다. 저장이 안 되는 환경에서도 화면은 그대로 동작한다.
// - 과목방은 create(options)로 한 벌을 만들고, 전역 이름(globalName)으로 onclick에서 부른다.
// - 스타일: kids/css/unit_chip_bar.css
(function () {
    'use strict';

    function escapeHtml(text) {
        return String(text ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
    }

    function sortNumeric(list) {
        return list.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    }

    /**
     * @param {object} o
     * @param {string} o.globalName      onclick에서 부를 전역 이름 (예: 'EnglishUnitBar')
     * @param {string} o.boxId           칩 바를 그릴 요소 id
     * @param {string} o.storagePrefix   기억 키 앞부분 (뒤에 _son / _daughter)
     * @param {() => Promise<object[]>} o.loadRecords  노션 기록 불러오기
     * @param {(r: object) => string[]} o.gradesOf     기록의 학기 목록
     * @param {(r: object) => string} o.unitOf         기록의 단원 원문
     * @param {(grade: string) => string} [o.gradeLabel]
     * @param {(unit: string) => string} [o.unitLabel]
     * @param {(pick: {grade: string, unit: string}) => string} [o.extraHtml]  칩 아래에 덧붙일 내용
     * @param {(pick: {grade: string, unit: string}) => void} [o.onChange]
     * @param {{all: string, unitPerStage: string}} [o.hints]
     */
    function create(o) {
        const ALL = '';
        let records = [];
        let grades = [];
        let units = [];
        let pick = { grade: ALL, unit: ALL };
        const gradeLabel = o.gradeLabel || (g => g);
        const unitLabel = o.unitLabel || (u => u);
        const hints = Object.assign({
            all: '📌 단원을 고르면 활동이 그 단원으로 바로 시작해요.',
            unitPerStage: '📌 {grade}만 골랐어요. 단원은 활동마다 고를 수 있어요.',
            unit: '📌 지금은 <strong>{grade} · {unit}</strong>으로 활동이 바로 시작해요.'
        }, o.hints || {});

        function storageKey() {
            let profile = 'son';
            try { profile = localStorage.getItem('currentUser') || 'son'; } catch (e) { /* 기본값 */ }
            return o.storagePrefix + (profile === 'daughter' ? '_daughter' : '_son');
        }

        function loadPick() {
            try {
                const raw = localStorage.getItem(storageKey());
                const saved = raw ? JSON.parse(raw) : null;
                if (saved && typeof saved === 'object') {
                    return { grade: String(saved.grade || ALL), unit: String(saved.unit || ALL) };
                }
            } catch (e) { /* 못 읽으면 전체 보기 */ }
            return { grade: ALL, unit: ALL };
        }

        function savePick() {
            try { localStorage.setItem(storageKey(), JSON.stringify(pick)); } catch (e) { /* 기억만 못 함 */ }
        }

        function hasGrade(r, grade) {
            return (o.gradesOf(r) || []).includes(grade);
        }

        function unitOf(r) {
            return String(o.unitOf(r) ?? '').trim();
        }

        function listGrades() {
            const set = new Set();
            records.forEach(r => (o.gradesOf(r) || []).forEach(g => { if (g && g !== '공통') set.add(g); }));
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

        function chip(label, active, call) {
            return `<button type="button" class="unit-chip${active ? ' active' : ''}" aria-pressed="${active}" onclick="${o.globalName}.${call}">${escapeHtml(label)}</button>`;
        }

        function fill(template) {
            return template
                .replace('{grade}', escapeHtml(gradeLabel(pick.grade)))
                .replace('{unit}', escapeHtml(unitLabel(pick.unit)));
        }

        function render() {
            const box = document.getElementById(o.boxId);
            if (!box) return;
            grades = listGrades();
            if (grades.length === 0) { box.innerHTML = ''; return; }

            // 노션에서 사라진 학기·단원을 기억하고 있으면 전체 보기로 되돌린다
            if (pick.grade && !grades.includes(pick.grade)) pick = { grade: ALL, unit: ALL };
            units = pick.grade ? listUnits(pick.grade) : [];
            if (pick.unit && !units.includes(pick.unit)) pick.unit = ALL;

            let html = `<div class="unit-chip-row"><span class="unit-chip-label">학기</span><div class="unit-chip-list">`;
            html += chip('전체', !pick.grade, 'selectGrade(-1)');
            grades.forEach((g, i) => { html += chip(gradeLabel(g), pick.grade === g, `selectGrade(${i})`); });
            html += `</div></div>`;

            if (pick.grade && units.length > 0) {
                html += `<div class="unit-chip-row"><span class="unit-chip-label">단원</span><div class="unit-chip-list">`;
                html += chip('활동마다 고르기', !pick.unit, 'selectUnit(-1)');
                units.forEach((u, i) => { html += chip(unitLabel(u), pick.unit === u, `selectUnit(${i})`); });
                html += `</div></div>`;
            }

            html += `<p class="unit-chip-hint">${pick.unit ? fill(hints.unit) : (pick.grade ? fill(hints.unitPerStage) : hints.all)}</p>`;
            if (typeof o.extraHtml === 'function') html += o.extraHtml({ ...pick }) || '';
            box.innerHTML = html;
        }

        function changed() {
            savePick();
            render();
            if (typeof o.onChange === 'function') o.onChange({ ...pick });
        }

        function selectGrade(idx) {
            pick = { grade: idx >= 0 ? (grades[idx] || ALL) : ALL, unit: ALL };
            changed();
        }

        function selectUnit(idx) {
            pick.unit = idx >= 0 ? (units[idx] || ALL) : ALL;
            changed();
        }

        /**
         * 활동을 열 때 부른다. 고른 학기·단원으로 바로 시작했으면 true.
         * @param {object[]} candidateRecords  그 활동에 쓸 기록
         * @param {{gradeUnit: (g: string, u: string) => void, grade: (g: string) => void}} go
         */
        function applyToMission(candidateRecords, go) {
            if (!pick.grade || !go) return false;
            const inGrade = (candidateRecords || []).filter(r => hasGrade(r, pick.grade));
            if (inGrade.length === 0) return false; // 그 학기에 이 활동 자료가 없으면 원래 선택 화면으로
            if (pick.unit && inGrade.some(r => unitOf(r) === pick.unit) && typeof go.gradeUnit === 'function') {
                go.gradeUnit(pick.grade, pick.unit);
                return true;
            }
            if (typeof go.grade === 'function') {
                go.grade(pick.grade);
                return true;
            }
            return false;
        }

        // 고른 학기·단원에 맞는 기록 수 (단원을 안 골랐으면 학기, 학기도 안 골랐으면 전체)
        function countFor(list) {
            return (list || []).filter(r => (!pick.grade || hasGrade(r, pick.grade)) && (!pick.unit || unitOf(r) === pick.unit)).length;
        }

        async function init() {
            pick = loadPick();
            try {
                records = (await o.loadRecords()) || [];
            } catch (e) {
                console.warn(`[${o.globalName}] 기록 조회 실패, 단원 칩 없이 시작:`, e);
                records = [];
            }
            render();
            if (typeof o.onChange === 'function') o.onChange({ ...pick });
        }

        function setRecords(list) {
            records = list || [];
            render();
        }

        return {
            init, render, selectGrade, selectUnit, applyToMission, countFor, setRecords,
            getPick: () => ({ ...pick }),
            _state: () => ({ grades: [...grades], units: [...units] })
        };
    }

    window.UnitChipBar = { create, escapeHtml };
})();
