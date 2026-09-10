/**
 * ========================================================
 * 🚀 [시간표 연동 예·복습 데일리 부스트 엔진] timetable-boost.js
 * ========================================================
 * 오늘·내일 학교 시간표와 실시간 연동하여 아이들이 주도적으로
 * 예습과 복습을 즐길 수 있도록 혜택을 제공하는 스마트 보상 부스터.
 * 
 * 1) 🔥 [오늘 복습 부스트] (당일 시간표 과목)
 *    - 일일 보상 획득 상한선: 기본 100개 ➔ 150개 대폭 확장!
 *    - 과목 경험치(EXP): 1.2배 부스트 지급!
 * 
 * 2) ✨ [내일 예습 부스트] (익일 시간표 과목)
 *    - 10문제 완주 보너스: 기본 +5개 ➔ +7개 대량 보너스 (+2개 추가)!
 * 
 * 3) 🌱 [일반 탐험] (그 외 과목)
 *    - 기본 일일 상한선 100개, 완주 보너스 +5개 유지.
 */

(function () {
    const DAY_NAMES = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    const TARGET_SUBJECTS = ['국어', '수학', '영어', '사회', '과학'];

    // 💡 오프라인 및 기본 시간표 (timetable_controller.js 기반 단일 원천 SSOT)
    const DEFAULT_TIMETABLE = {
        '민수': {
            '월요일': ['영어', '수학', '국어'],
            '화요일': ['과학', '사회', '국어'],
            '수요일': ['사회', '영어', '국어', '수학'],
            '목요일': ['과학', '영어', '사회', '수학'],
            '금요일': ['국어']
        },
        '민서': {
            '월요일': ['국어', '수학'],
            '화요일': ['국어', '수학'],
            '수요일': ['국어', '수학'],
            '목요일': ['국어'],
            '금요일': ['국어', '수학']
        }
    };

    /**
     * 오늘과 내일의 학교 요일 계산
     * (금요일이면 내일은 월요일, 토/일 주말은 월요일을 예습 타겟으로 지정)
     */
    function getTargetDays() {
        const now = new Date();
        const dayIdx = now.getDay(); // 0: 일, 1: 월, ..., 5: 금, 6: 토

        const todayName = DAY_NAMES[dayIdx];
        let tomorrowName = '월요일';

        if (dayIdx >= 1 && dayIdx <= 4) {
            // 월(1) -> 화(2), 화(2) -> 수(3), 수(3) -> 목(4), 목(4) -> 금(5)
            tomorrowName = DAY_NAMES[dayIdx + 1];
        } else {
            // 금(5), 토(6), 일(0)의 다음 등교일은 모두 월요일!
            tomorrowName = '월요일';
        }

        return {
            todayName,
            tomorrowName,
            isWeekend: (dayIdx === 0 || dayIdx === 6)
        };
    }

    /**
     * 학생별 오늘/내일 시간표 과목 목록 조회
     * @param {string} childName - '민수' | '민서'
     * @returns {Object} { todaySubjects: string[], tomorrowSubjects: string[] }
     */
    function getTimetableSubjects(childName) {
        const name = childName || (localStorage.getItem('currentUser') === 'daughter' || localStorage.getItem('currentUserName') === '민서' ? '민서' : '민수');
        const { todayName, tomorrowName, isWeekend } = getTargetDays();

        let todaySubjects = [];
        let tomorrowSubjects = [];

        // 1. 캐시된 노션 시간표 데이터가 있는지 확인
        let timetableRows = window.__MINMIN_TIMETABLE_DATA || null;
        if (!timetableRows) {
            try {
                const cached = localStorage.getItem('MINMIN_TIMETABLE_CACHE');
                if (cached) timetableRows = JSON.parse(cached);
            } catch (_) {}
        }

        if (Array.isArray(timetableRows) && timetableRows.length > 0) {
            // 노션 시간표 데이터에서 학생 및 요일 필터링
            timetableRows.forEach(row => {
                const rowChild = row.child || row.student || '';
                const rowDay = row.dayOfWeek || '';
                const rowSubj = row.subject || row.title || '';

                if (!rowChild.includes(name)) return;

                // 5대 교과 매칭
                const matchedSubj = TARGET_SUBJECTS.find(s => rowSubj.includes(s));
                if (!matchedSubj) return;

                if (!isWeekend && rowDay.includes(todayName) && !todaySubjects.includes(matchedSubj)) {
                    todaySubjects.push(matchedSubj);
                }
                if (rowDay.includes(tomorrowName) && !tomorrowSubjects.includes(matchedSubj)) {
                    tomorrowSubjects.push(matchedSubj);
                }
            });
        }

        // 2. 만약 시간표 데이터가 비어있으면 기본 시간표로 안전하게 폴백
        const studentDefault = DEFAULT_TIMETABLE[name] || DEFAULT_TIMETABLE['민수'];
        if (todaySubjects.length === 0 && !isWeekend && studentDefault[todayName]) {
            todaySubjects = [...studentDefault[todayName]];
        }
        if (tomorrowSubjects.length === 0 && studentDefault[tomorrowName]) {
            tomorrowSubjects = [...studentDefault[tomorrowName]];
        }

        return {
            todaySubjects,
            tomorrowSubjects,
            todayName,
            tomorrowName,
            isWeekend
        };
    }

    /**
     * 특정 과목의 데일리 부스트 상태 판별
     * @param {string} subject - '국어', '수학', '영어', '사회', '과학'
     * @param {string} [childName]
     * @returns {Object} { type: 'review' | 'preview' | 'normal', limit: number, expMultiplier: number, completionBonus: number, badge: Object }
     */
    function getSubjectBoostInfo(subject, childName) {
        const { todaySubjects, tomorrowSubjects, isWeekend } = getTimetableSubjects(childName);
        const subj = String(subject || '').trim();

        // 1. 오늘 복습 과목 (주말이 아니고 오늘 시간표에 포함된 경우)
        if (!isWeekend && todaySubjects.includes(subj)) {
            return {
                type: 'review',
                label: '오늘 복습 부스트',
                limit: 150, // 일일 보상 상한선 150개 확장
                expMultiplier: 1.2, // 경험치 1.2배
                completionBonus: 5, // 기본 완주 보너스 5개
                badge: {
                    text: '🔥 오늘 복습',
                    subText: '한도 150개 · EXP 1.2배',
                    color: '#ff5722',
                    bgGradient: 'linear-gradient(135deg, #ffefe9 0%, #ffe0d6 100%)',
                    borderColor: '#ff7043'
                }
            };
        }

        // 2. 내일 예습 과목 (내일 등교일 시간표에 포함된 경우)
        if (tomorrowSubjects.includes(subj)) {
            return {
                type: 'preview',
                label: '내일 예습 부스트',
                limit: 100, // 기본 상한선
                expMultiplier: 1.0,
                completionBonus: 7, // 완주 보너스 +7개 (+2개 추가 보너스!)
                badge: {
                    text: '✨ 내일 예습',
                    subText: '10문제 완주 시 +7개!',
                    color: '#8b5cf6',
                    bgGradient: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
                    borderColor: '#a78bfa'
                }
            };
        }

        // 3. 일반 탐험 과목
        return {
            type: 'normal',
            label: '일반 탐험',
            limit: 100,
            expMultiplier: 1.0,
            completionBonus: 5,
            badge: null
        };
    }

    // 전역 노출
    window.TimetableBoost = {
        getTargetDays,
        getTimetableSubjects,
        getSubjectBoostInfo
    };

    console.log('🚀 [시간표 부스트 엔진 로드 완료] TimetableBoost 활성화');
})();
