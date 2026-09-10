/**
 * ========================================================
 * ⏰ [스크린타임 스마트 정산 엔진] screentime-tracker.js
 * ========================================================
 * 공부방 웹 학습 시간으로 인해 폰 스크린타임이 깎여 억울해하지 않도록,
 * 1) 순수 공부방 학습 시간을 10분 단위로 쿨하게 올림(Round Up) 보정!
 * 2) 오늘 보상 50개 달성 시 '30분 자유 시간 추가권' 1장 지급!
 * 3) 30분 표준권 + 10분 보너스권으로 분할하여 직관적인 정산 영수증 제공!
 */

(function () {
    const STORAGE_KEY_PREFIX = 'MINMIN_DAILY_STUDY_TIME_';
    const APPROVAL_KEY_PREFIX = 'MINMIN_SCREENTIME_APPROVED_';

    function getTodayKey() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const date = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${date}`;
    }

    function getCurrentChildName() {
        if (typeof getActiveChildName === 'function') {
            const name = getActiveChildName();
            if (name) return name;
        }
        const profile = localStorage.getItem('currentUser') || 'son';
        const user = localStorage.getItem('currentUserName') || '';
        const child = localStorage.getItem('currentChild') || '';
        if (profile === 'daughter' || user === '민서' || child === 'minseo') return '민서';
        return '민수';
    }

    /**
     * 오늘 순수 공부방 학습 시간 누적 기록
     * @param {number} minutes - 이번 세션 소요 시간(분)
     * @param {string} [subject] - 과목명
     */
    function trackStudySession(minutes, subject) {
        const mins = Math.max(1, Math.round(Number(minutes) || 1));
        const childName = getCurrentChildName();
        const todayStr = getTodayKey();
        const key = `${STORAGE_KEY_PREFIX}${childName}_${todayStr}`;
        const legacyKey = `${STORAGE_KEY_PREFIX}${childName}_${new Date().toLocaleDateString()}`;

        let currentTotal = Math.max(
            parseInt(localStorage.getItem(key) || '0', 10),
            parseInt(localStorage.getItem(legacyKey) || '0', 10)
        );
        currentTotal += mins;
        localStorage.setItem(key, String(currentTotal));
        localStorage.setItem(legacyKey, String(currentTotal)); // 하위 호환 보존

        console.log(`⏱️ [순공 시간 기록] ${childName} +${mins}분 (${subject || '학습'}) ➔ 오늘 누적 ${currentTotal}분`);
        return currentTotal;
    }

    /**
     * 오늘 순수 공부 시간(분) 조회
     */
    function getTodayStudyMinutes(childName) {
        const name = childName || getCurrentChildName();
        const todayStr = getTodayKey();
        const key = `${STORAGE_KEY_PREFIX}${name}_${todayStr}`;
        const legacyKey = `${STORAGE_KEY_PREFIX}${name}_${new Date().toLocaleDateString()}`;
        const val = parseInt(localStorage.getItem(key) || '0', 10);
        const legacyVal = parseInt(localStorage.getItem(legacyKey) || '0', 10);
        return Math.max(val, legacyVal);
    }

    /**
     * 오늘 획득한 보상 개수 조회
     */
    function getTodayEarnedCurrency(childName) {
        const name = childName || getCurrentChildName();
        const todayStr = getTodayKey();
        const legacyDateStr = new Date().toLocaleDateString();
        
        // 각 과목별 '오늘 획득_과목' 로컬 캐시 또는 합산
        const subjects = ['국어', '수학', '영어', '사회', '과학', '용어사전'];
        let total = 0;

        subjects.forEach(subj => {
            const key = `last_play_date_${name}_${subj}`;
            const lastDate = localStorage.getItem(key);
            if (lastDate === todayStr || lastDate === legacyDateStr) {
                // 노션 일일 카운터 보조 합산
                const val = parseInt(localStorage.getItem(`today_earned_${name}_${subj}`) || '0', 10);
                total += val;
            }
        });

        // 인벤토리 캐시의 당일 누적 보정치 확인
        const dailyKey = `MINMIN_DAILY_REWARD_SUM_${name}_${todayStr}`;
        const legacyDailyKey = `MINMIN_DAILY_REWARD_SUM_${name}_${legacyDateStr}`;
        const sumVal = parseInt(localStorage.getItem(dailyKey) || '0', 10);
        const legacySumVal = parseInt(localStorage.getItem(legacyDailyKey) || '0', 10);
        return Math.max(total, sumVal, legacySumVal);
    }

    /**
     * 오늘 보상 획득 시 당일 합계 누적 (notion-reward.js에서 호출)
     */
    function recordDailyRewardEarned(amount, childName) {
        const name = childName || getCurrentChildName();
        const todayStr = getTodayKey();
        const dailyKey = `MINMIN_DAILY_REWARD_SUM_${name}_${todayStr}`;
        const legacyDailyKey = `MINMIN_DAILY_REWARD_SUM_${name}_${new Date().toLocaleDateString()}`;
        let current = Math.max(
            parseInt(localStorage.getItem(dailyKey) || '0', 10),
            parseInt(localStorage.getItem(legacyDailyKey) || '0', 10)
        );
        current += Number(amount) || 0;
        localStorage.setItem(dailyKey, String(current));
        localStorage.setItem(legacyDailyKey, String(current));
        return current;
    }

    /**
     * 노션 학습일지 목록(studyLogs)에서 오늘 공부한 시간을 추출하여 로컬과 양방향 동기화
     * (기기 간 이동, 모바일 학습 후 PC 대시보드 조회 시 100% 자동 복원)
     * @param {Array} studyLogs - 노션 query 결과 객체 배열
     * @param {string} [targetName] - 특정 자녀 이름 ('민수' 또는 '민서')
     */
    function syncFromStudyLogs(studyLogs, targetName) {
        if (!Array.isArray(studyLogs) || studyLogs.length === 0) return;
        const todayStr = getTodayKey();
        const targetChildren = targetName ? [targetName] : ['민수', '민서'];

        targetChildren.forEach(child => {
            let notionTotalMinutes = 0;
            studyLogs.forEach(page => {
                const props = page.properties;
                if (!props) return;
                const pageChild = props['학생']?.select?.name;
                if (pageChild !== child) return;

                const enterDate = props['입장']?.date?.start || '';
                let isToday = false;
                if (enterDate) {
                    if (enterDate.startsWith(todayStr)) {
                        isToday = true;
                    } else {
                        const d = new Date(enterDate);
                        if (!isNaN(d.getTime())) {
                            // KST (UTC+9) 기준 당일 판별
                            const kstTime = new Date(d.getTime() + (9 * 60 * 60 * 1000));
                            const y = kstTime.getUTCFullYear();
                            const m = String(kstTime.getUTCMonth() + 1).padStart(2, '0');
                            const dt = String(kstTime.getUTCDate()).padStart(2, '0');
                            if (`${y}-${m}-${dt}` === todayStr) isToday = true;
                        }
                    }
                }

                if (isToday) {
                    const duration = Number(props['소요시간']?.number) || 1;
                    notionTotalMinutes += duration;
                }
            });

            if (notionTotalMinutes > 0) {
                const key = `${STORAGE_KEY_PREFIX}${child}_${todayStr}`;
                const legacyKey = `${STORAGE_KEY_PREFIX}${child}_${new Date().toLocaleDateString()}`;
                const currentLocal = Math.max(
                    parseInt(localStorage.getItem(key) || '0', 10),
                    parseInt(localStorage.getItem(legacyKey) || '0', 10)
                );
                const maxMinutes = Math.max(currentLocal, notionTotalMinutes);
                localStorage.setItem(key, String(maxMinutes));
                localStorage.setItem(legacyKey, String(maxMinutes));
                console.log(`☁️ [스크린타임 클라우드 동기화] ${child}: 노션 ${notionTotalMinutes}분 ➔ 로컬 동기화 완료 (최종: ${maxMinutes}분)`);
            }
        });
    }

    /**
     * ☁️ 노션 인벤토리 DB 데이터(오늘 획득_*, 학습설정)에서 보상 및 부모 승인 상태를 추출하여 동기화
     * (부모 대시보드 및 타 기기 접속 시 실시간 100% 동기화)
     * @param {Object} props - 노션 페이지 properties
     * @param {string} childName - 학생 이름 ('민수' 또는 '민서')
     */
    function syncFromInventoryProps(props, childName) {
        if (!props) return;
        const name = childName || getCurrentChildName();
        const todayStr = getTodayKey();
        const legacyDateStr = new Date().toLocaleDateString();

        // 1. 노션 인벤토리 내 '오늘 획득_*' 속성 전수 합산
        let totalEarned = 0;
        Object.keys(props).forEach(key => {
            if (key.startsWith('오늘 획득') || key.startsWith('오늘_획득')) {
                const val = Number(props[key]?.number) || 0;
                totalEarned += val;
            }
        });

        if (totalEarned > 0) {
            const dailyKey = `MINMIN_DAILY_REWARD_SUM_${name}_${todayStr}`;
            const legacyDailyKey = `MINMIN_DAILY_REWARD_SUM_${name}_${legacyDateStr}`;
            const current = Math.max(
                parseInt(localStorage.getItem(dailyKey) || '0', 10),
                parseInt(localStorage.getItem(legacyDailyKey) || '0', 10)
            );
            const maxEarned = Math.max(current, totalEarned);
            localStorage.setItem(dailyKey, String(maxEarned));
            localStorage.setItem(legacyDailyKey, String(maxEarned));
            console.log(`☁️ [스크린타임 보상 동기화] ${name}: 노션 인벤토리 합산 ${totalEarned}개 ➔ 로컬 동기화 완료 (${maxEarned}개)`);
        }

        // 2. 노션 인벤토리 내 '학습설정' 속성에서 부모 승인 상태 추출
        try {
            const settingRaw = props['학습설정']?.rich_text || props['학습설정'];
            let jsonText = '';
            if (typeof settingRaw === 'string') jsonText = settingRaw;
            else if (Array.isArray(settingRaw)) jsonText = settingRaw.map(t => t.plain_text || t.text?.content || '').join('');
            else if (settingRaw?.rich_text && Array.isArray(settingRaw.rich_text)) jsonText = settingRaw.rich_text.map(t => t.plain_text || t.text?.content || '').join('');

            if (jsonText && jsonText.trim()) {
                const parsed = JSON.parse(jsonText);
                if (parsed && typeof parsed === 'object') {
                    // 예: parsed.screentimeApproval = { "2026-09-10": true } 또는 parsed.screentime_approved === true
                    const approvalDate = parsed.screentimeApproval?.date || parsed.screentime_approved_date;
                    const isApproved = parsed.screentimeApproval?.approved ?? (approvalDate === todayStr);
                    if (approvalDate === todayStr && typeof isApproved === 'boolean') {
                        const approvalKey = `${APPROVAL_KEY_PREFIX}${name}_${todayStr}`;
                        localStorage.setItem(approvalKey, String(isApproved));
                        console.log(`☁️ [스크린타임 승인 동기화] ${name}: 클라우드 승인 상태 (${isApproved ? '승인' : '미승인'}) ➔ 로컬 반영 완료`);
                    }
                }
            }
        } catch (e) {
            console.warn('⚠️ [학습설정 승인 상태 파싱 경고]:', e);
        }
    }

    /**
     * 10분 단위 올림 및 티켓 정산 종합 분석
     * @param {string} [childName]
     */
    function getScreenTimeSummary(childName) {
        const name = childName || getCurrentChildName();
        const rawMinutes = getTodayStudyMinutes(name);
        const earnedCurrency = getTodayEarnedCurrency(name);

        // 1. 순공 시간 10분 단위 올림 보정 (최소 10분, 단 공부 시간이 0분이면 0분)
        const adjustedStudyMinutes = rawMinutes > 0 ? Math.ceil(rawMinutes / 10) * 10 : 0;
        const roundUpBonus = Math.max(0, adjustedStudyMinutes - rawMinutes);

        // 2. 오늘의 50개 달성 보너스 (50개 이상 시 +30분)
        const is50QuestReached = earnedCurrency >= 50;
        const questBonusMinutes = is50QuestReached ? 30 : 0;

        // 3. 총 인정 시간 합산
        const totalMinutes = adjustedStudyMinutes + questBonusMinutes;

        // 4. 티켓 분할 연산 (30분권 단위 묶음 + 10분권 자투리)
        const count30m = Math.floor(totalMinutes / 30);
        const count10m = Math.floor((totalMinutes % 30) / 10);

        // 5. 초1 민서 맞춤형 시계 바늘 비유 텍스트
        let clockMetaphor = '';
        if (totalMinutes === 0) {
            clockMetaphor = '아직 공부를 시작하지 않았어요!';
        } else if (totalMinutes < 30) {
            clockMetaphor = `⏰ 깜짝 10분 보너스 ${count10m}칸!`;
        } else if (totalMinutes === 30) {
            clockMetaphor = '⏰ 시계 긴바늘 딱 반 바퀴(30분) 완성!';
        } else if (totalMinutes === 60) {
            clockMetaphor = '⏰ 시계 긴바늘 한 바퀴(60분) 완벽 정복!';
        } else {
            const hours = Math.floor(totalMinutes / 60);
            const remainMins = totalMinutes % 60;
            clockMetaphor = `⏰ 총 ${hours > 0 ? hours + '시간 ' : ''}${remainMins > 0 ? remainMins + '분' : ''} 자유 이용권!`;
        }

        // 6. 부모 승인 상태 확인
        const todayStr = getTodayKey();
        const approvalKey = `${APPROVAL_KEY_PREFIX}${name}_${todayStr}`;
        const isApproved = localStorage.getItem(approvalKey) === 'true';

        // 7. 티켓 객체 배열 구성
        const tickets = [];
        if (count30m > 0) {
            tickets.push({ label: '30분권', minutes: 30, count: count30m, badge: '시계 반 바퀴' });
        }
        if (count10m > 0) {
            tickets.push({ label: '10분권', minutes: 10, count: count10m, badge: '보너스 칸' });
        }

        return {
            childName: name,
            // [포맷 1] screentime-tracker 원본 프로퍼티
            rawMinutes,
            adjustedStudyMinutes,
            roundUpBonus,
            earnedCurrency,
            is50QuestReached,
            questBonusMinutes,
            totalMinutes,
            count30m,
            count10m,
            clockMetaphor,
            isApproved,

            // [포맷 2] parent_dashboard.js 완전 호환 프로퍼티
            rawStudyMinutes: rawMinutes,
            studyMinutes: adjustedStudyMinutes,
            todayRewardEarned: earnedCurrency,
            isBonusTicketEarned: is50QuestReached,
            totalTimeGrantMinutes: totalMinutes,
            isParentApproved: isApproved,
            tickets: tickets
        };
    }

    /**
     * 부모 승인 토글 처리
     */
    function toggleParentApproval(childName, approvedState) {
        const name = childName || getCurrentChildName();
        const todayStr = getTodayKey();
        const approvalKey = `${APPROVAL_KEY_PREFIX}${name}_${todayStr}`;
        const state = approvedState !== undefined ? !!approvedState : (localStorage.getItem(approvalKey) !== 'true');
        localStorage.setItem(approvalKey, String(state));
        console.log(`📱 [스크린타임 승인 상태 변경] ${name}: ${state ? '승인 완료 ✅' : '미승인 ⏳'}`);
        return state;
    }

    /**
     * 학생용 스크린타임 정산 영수증 모달 렌더링
     */
    function openScreenTimeReceiptModal() {
        removeScreenTimeModal();

        const s = getScreenTimeSummary();
        const modal = document.createElement('div');
        modal.id = 'screenTimeReceiptModal';
        modal.className = 'screentime-modal-overlay';
        modal.innerHTML = `
            <div class="screentime-modal-card animate-pop-up">
                <button type="button" class="screentime-close-btn" onclick="window.closeScreenTimeReceiptModal()">✕</button>
                
                <div class="screentime-header">
                    <span class="screentime-icon">🎟️</span>
                    <div>
                        <h2 class="screentime-title">${s.childName}의 오늘 스크린타임 정산소</h2>
                        <span class="screentime-subtitle">공부하느라 쓴 폰 시간 100% 보상 & 보너스 정산!</span>
                    </div>
                </div>

                <!-- 1. 시계 바늘 비유 배너 (초1 민서 눈높이) -->
                <div class="screentime-clock-banner">
                    <div class="clock-icon-anim">⏰</div>
                    <div class="clock-banner-text">
                        <div class="clock-headline">${s.clockMetaphor}</div>
                        <div class="clock-subline">실제 공부 ${s.rawMinutes}분 ➔ 10분 단위 올림으로 <b>${s.adjustedStudyMinutes}분</b> 인정!</div>
                    </div>
                </div>

                <!-- 2. 영수증 내역 리스트 -->
                <div class="screentime-receipt-box">
                    <div class="receipt-row">
                        <span class="r-label">📚 오늘 공부방 순수 열공</span>
                        <span class="r-val">${s.rawMinutes}분</span>
                    </div>
                    <div class="receipt-row highlight-bonus">
                        <span class="r-label">🎁 아빠의 쿨한 올림 보너스</span>
                        <span class="r-val">+${s.roundUpBonus}분 보정</span>
                    </div>
                    <div class="receipt-row">
                        <span class="r-label">🎯 오늘 보상 획득 (${s.earnedCurrency}/50개)</span>
                        <span class="r-val">${s.is50QuestReached ? '✨ 50개 달성 완료 (+30분)' : '⏳ 진행 중'}</span>
                    </div>
                    <div class="receipt-divider"></div>
                    <div class="receipt-row total-row">
                        <span class="r-total-label">👉 오늘 총 획득 시간</span>
                        <span class="r-total-val">${s.totalMinutes}분</span>
                    </div>
                </div>

                <!-- 3. 발급 티켓 꾸러미 -->
                <div class="screentime-tickets-area">
                    <div class="tickets-title">🎫 발급된 티켓 목록 (부모님께 보여주세요!)</div>
                    <div class="tickets-grid">
                        ${s.count30m > 0 ? `
                            <div class="screentime-ticket ticket-30m">
                                <div class="ticket-badge">시계 반 바퀴</div>
                                <div class="ticket-time">30분권</div>
                                <div class="ticket-qty">x ${s.count30m}장</div>
                            </div>
                        ` : ''}
                        ${s.count10m > 0 ? `
                            <div class="screentime-ticket ticket-10m">
                                <div class="ticket-badge">보너스 칸</div>
                                <div class="ticket-time">10분권</div>
                                <div class="ticket-qty">x ${s.count10m}장</div>
                            </div>
                        ` : ''}
                        ${s.totalMinutes === 0 ? `
                            <div class="no-tickets-msg">아직 오늘 공부 기록이 없어요! 문제를 풀면 시간이 쌓여요. 🚀</div>
                        ` : ''}
                    </div>
                </div>

                <!-- 4. 하단 승인 상태 및 안내 -->
                <div class="screentime-footer">
                    <div class="approval-status-chip ${s.isApproved ? 'is-approved' : 'is-pending'}">
                        ${s.isApproved ? '✅ 부모님 승인 완료! (패밀리링크 연장됨)' : '⏳ 부모님 승인 대기 중 (아빠/엄마께 자랑하세요!)'}
                    </div>
                    <button type="button" class="screentime-confirm-btn" onclick="window.closeScreenTimeReceiptModal()">
                        확인 완료 👍
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        injectScreenTimeStyles();
    }

    function closeScreenTimeReceiptModal() {
        removeScreenTimeModal();
    }

    function removeScreenTimeModal() {
        const el = document.getElementById('screenTimeReceiptModal');
        if (el) el.remove();
    }

    function injectScreenTimeStyles() {
        if (document.getElementById('screentime-tracker-style')) return;
        const style = document.createElement('style');
        style.id = 'screentime-tracker-style';
        style.textContent = `
            .screentime-modal-overlay {
                position: fixed; inset: 0;
                background: rgba(15, 23, 42, 0.75);
                backdrop-filter: blur(6px);
                z-index: 100001;
                display: flex; justify-content: center; align-items: center;
                padding: 16px; box-sizing: border-box;
            }
            .screentime-modal-card {
                background: #ffffff;
                border-radius: 28px;
                max-width: 500px; width: 100%;
                max-height: 90vh; overflow-y: auto;
                padding: 28px 24px;
                box-shadow: 0 25px 50px rgba(0,0,0,0.35);
                border: 2px solid #cbd5e1;
                font-family: 'Nanum Gothic', 'Jua', sans-serif;
                position: relative;
            }
            .screentime-close-btn {
                position: absolute; top: 18px; right: 20px;
                background: none; border: none; font-size: 1.5rem;
                cursor: pointer; color: #94a3b8; line-height: 1;
            }
            .screentime-header {
                display: flex; align-items: center; gap: 12px;
                margin-bottom: 18px; border-bottom: 2px dashed #e2e8f0;
                padding-bottom: 14px;
            }
            .screentime-icon { font-size: 2.2rem; }
            .screentime-title { margin: 0; font-family: 'Jua', sans-serif; font-size: 1.45rem; color: #0f172a; }
            .screentime-subtitle { font-size: 0.88rem; color: #64748b; }
            
            .screentime-clock-banner {
                background: linear-gradient(135deg, #0284c7 0%, #2563eb 100%);
                color: #ffffff; border-radius: 18px;
                padding: 14px 18px; display: flex; align-items: center; gap: 14px;
                margin-bottom: 18px; box-shadow: 0 4px 14px rgba(2, 132, 199, 0.25);
            }
            .clock-icon-anim { font-size: 2.2rem; animation: pulseClock 2s infinite ease-in-out; }
            @keyframes pulseClock {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.12); }
            }
            .clock-headline { font-family: 'Jua', sans-serif; font-size: 1.15rem; margin-bottom: 3px; }
            .clock-subline { font-size: 0.85rem; opacity: 0.92; word-break: keep-all; }

            .screentime-receipt-box {
                background: #f8fafc; border: 1.5px solid #e2e8f0;
                border-radius: 16px; padding: 14px 16px; margin-bottom: 18px;
            }
            .receipt-row {
                display: flex; justify-content: space-between; align-items: center;
                font-size: 0.92rem; color: #475569; margin-bottom: 6px;
            }
            .receipt-row.highlight-bonus { color: #0284c7; font-weight: bold; }
            .receipt-divider { height: 1px; background: #cbd5e1; margin: 8px 0; border-top: 1px dashed #cbd5e1; }
            .total-row { margin-bottom: 0; }
            .r-total-label { font-family: 'Jua', sans-serif; font-size: 1.15rem; color: #0f172a; }
            .r-total-val { font-family: 'Jua', sans-serif; font-size: 1.4rem; color: #e11d48; }

            .screentime-tickets-area { margin-bottom: 20px; }
            .tickets-title { font-family: 'Jua', sans-serif; font-size: 1.02rem; color: #334155; margin-bottom: 10px; }
            .tickets-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px; }
            .screentime-ticket {
                border-radius: 14px; padding: 12px 14px; text-align: center;
                box-shadow: 0 3px 8px rgba(0,0,0,0.08); border: 2px dashed;
            }
            .ticket-30m { background: #fff7ed; border-color: #f97316; color: #c2410c; }
            .ticket-10m { background: #fdf4ff; border-color: #d946ef; color: #a21caf; }
            .ticket-badge { font-size: 0.75rem; font-weight: bold; opacity: 0.85; margin-bottom: 4px; }
            .ticket-time { font-family: 'Jua', sans-serif; font-size: 1.4rem; }
            .ticket-qty { font-size: 0.88rem; font-weight: bold; margin-top: 2px; }
            .no-tickets-msg { grid-column: 1 / -1; text-align: center; color: #94a3b8; font-size: 0.9rem; padding: 10px 0; }

            .screentime-footer { display: flex; flex-direction: column; gap: 10px; }
            .approval-status-chip {
                padding: 10px 14px; border-radius: 12px; text-align: center;
                font-family: 'Jua', sans-serif; font-size: 0.95rem;
            }
            .approval-status-chip.is-approved { background: #dcfce7; color: #15803d; border: 1.5px solid #86efac; }
            .approval-status-chip.is-pending { background: #fef3c7; color: #b45309; border: 1.5px solid #fde68a; }
            .screentime-confirm-btn {
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                color: #ffffff; border: none; border-radius: 14px;
                padding: 12px; font-family: 'Jua', sans-serif; font-size: 1.15rem;
                cursor: pointer; box-shadow: 0 4px 12px rgba(16,185,129,0.3);
            }
            @keyframes popUpReceipt {
                from { transform: scale(0.92); opacity: 0; }
                to { transform: scale(1); opacity: 1; }
            }
            .animate-pop-up { animation: popUpReceipt 0.22s ease-out; }
        `;
        document.head.appendChild(style);
    }

    // 전역 노출
    window.ScreenTimeTracker = {
        trackStudySession,
        getTodayStudyMinutes,
        getTodayEarnedCurrency,
        recordDailyRewardEarned,
        syncFromStudyLogs,
        syncFromInventoryProps,
        getScreenTimeSummary,
        toggleParentApproval,
        openScreenTimeReceiptModal,
        closeScreenTimeReceiptModal
    };

    window.openScreenTimeReceiptModal = openScreenTimeReceiptModal;
    window.closeScreenTimeReceiptModal = closeScreenTimeReceiptModal;
    window.trackStudySession = trackStudySession;
    window.recordDailyRewardEarned = recordDailyRewardEarned;
    window.syncFromInventoryProps = syncFromInventoryProps;

    console.log('⏰ [스크린타임 트래커 로드 완료] ScreenTimeTracker 활성화');
})();
