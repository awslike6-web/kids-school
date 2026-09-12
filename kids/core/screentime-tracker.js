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
    const APPROVED_MINS_KEY_PREFIX = 'MINMIN_SCREENTIME_APPROVED_MINS_';

    function getTodayApprovedMinutes(childName) {
        const name = childName || getCurrentChildName();
        const todayStr = getTodayKey();
        const key = `${APPROVED_MINS_KEY_PREFIX}${name}_${todayStr}`;
        const val = parseInt(localStorage.getItem(key) || '0', 10);
        return Math.max(0, val);
    }

    function setTodayApprovedMinutes(minutes, childName) {
        const name = childName || getCurrentChildName();
        const todayStr = getTodayKey();
        const key = `${APPROVED_MINS_KEY_PREFIX}${name}_${todayStr}`;
        const mins = Math.max(0, Number(minutes) || 0);
        localStorage.setItem(key, String(mins));
        return mins;
    }

    function getTodayKey() {
        const d = new Date();
        const kst = new Date(d.getTime() + (9 * 60 + d.getTimezoneOffset()) * 60000);
        const year = kst.getFullYear();
        const month = String(kst.getMonth() + 1).padStart(2, '0');
        const date = String(kst.getDate()).padStart(2, '0');
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

        // 2. 노션 인벤토리 내 '학습설정' 속성에서 부모 승인 상태 및 누적 승인분 추출
        try {
            const settingRaw = props['학습설정']?.rich_text || props['학습설정'];
            let jsonText = '';
            if (typeof settingRaw === 'string') jsonText = settingRaw;
            else if (Array.isArray(settingRaw)) jsonText = settingRaw.map(t => t.plain_text || t.text?.content || '').join('');
            else if (settingRaw?.rich_text && Array.isArray(settingRaw.rich_text)) jsonText = settingRaw.rich_text.map(t => t.plain_text || t.text?.content || '').join('');

            if (jsonText && jsonText.trim()) {
                const parsed = JSON.parse(jsonText);
                if (parsed && typeof parsed === 'object') {
                    const approvalDate = parsed.screentimeApproval?.date || parsed.screentime_approved_date;
                    const isApproved = parsed.screentimeApproval?.approved ?? (approvalDate === todayStr);
                    if (approvalDate === todayStr && typeof isApproved === 'boolean') {
                        const approvalKey = `${APPROVAL_KEY_PREFIX}${name}_${todayStr}`;
                        localStorage.setItem(approvalKey, String(isApproved));
                        
                        // ⏰ [차액 정산] 승인 누적 분 동기화
                        if (parsed.screentimeApproval?.approvedMinutes !== undefined) {
                            setTodayApprovedMinutes(parsed.screentimeApproval.approvedMinutes, name);
                        } else if (isApproved) {
                            // 과거 호환: boolean이 true면 현재까지 계산된 시간 전량 승인으로 간주
                            const raw = getTodayStudyMinutes(name);
                            const adj = raw > 0 ? Math.ceil(raw / 10) * 10 : 0;
                            const bonus = (getTodayEarnedCurrency(name) >= 50) ? 30 : 0;
                            setTodayApprovedMinutes(adj + bonus, name);
                        }
                        console.log(`☁️ [스크린타임 승인 동기화] ${name}: 승인 (${isApproved ? '완료' : '대기'}), 누적승인: ${getTodayApprovedMinutes(name)}분 ➔ 로컬 반영 완료`);
                    }
                }
            }
        } catch (e) {
            console.warn('⚠️ [학습설정 승인 상태 파싱 경고]:', e);
        }
    }

    /**
     * 10분 단위 올림 및 티켓 정산 종합 분석 (차액 정산 기반)
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

        // 3. 오늘 총 인정 시간 합산
        const totalMinutes = adjustedStudyMinutes + questBonusMinutes;

        // 4. [차액 정산 핵심] 오늘 이미 승인(연장) 완료된 시간 & 지금 추가 연장할 잔여 대기 시간
        const todayStr = getTodayKey();
        const approvalKey = `${APPROVAL_KEY_PREFIX}${name}_${todayStr}`;
        const legacyApproved = localStorage.getItem(approvalKey) === 'true';
        let approvedMinutes = getTodayApprovedMinutes(name);

        // 과거 호환: approvedMinutes가 0인데 legacyApproved가 true면 totalMinutes 전량 승인으로 간주
        if (approvedMinutes === 0 && legacyApproved && totalMinutes > 0) {
            approvedMinutes = totalMinutes;
            setTodayApprovedMinutes(totalMinutes, name);
        }
        // 승인 완료 시간은 총 인정 시간을 초과할 수 없음
        approvedMinutes = Math.min(totalMinutes, approvedMinutes);

        // 👉 지금 추가 연장해야 할 대기 시간 (정산 차액)
        const pendingMinutes = Math.max(0, totalMinutes - approvedMinutes);
        const isFullyApproved = totalMinutes > 0 && pendingMinutes === 0;

        // 5. 티켓 분할 연산 (대기 중인 티켓 & 승인 완료 티켓)
        const count30m = Math.floor(pendingMinutes / 30);
        const count10m = Math.floor((pendingMinutes % 30) / 10);
        const totalCount30m = Math.floor(totalMinutes / 30);
        const totalCount10m = Math.floor((totalMinutes % 30) / 10);
        const approvedCount30m = Math.floor(approvedMinutes / 30);
        const approvedCount10m = Math.floor((approvedMinutes % 30) / 10);

        // 6. 초1 민서 맞춤형 시계 바늘 비유 텍스트
        let clockMetaphor = '';
        if (totalMinutes === 0) {
            clockMetaphor = '아직 공부를 시작하지 않았어요!';
        } else if (pendingMinutes > 0) {
            clockMetaphor = `⏰ 지금 추가 연장할 시간: ${pendingMinutes}분!`;
        } else {
            clockMetaphor = `🎉 오늘 달성한 ${totalMinutes}분 모두 승인 완료!`;
        }

        // 7. 티켓 객체 배열 구성
        const tickets = [];
        if (count30m > 0) {
            tickets.push({ label: '30분권', minutes: 30, count: count30m, badge: '지금 연장', status: 'pending' });
        }
        if (count10m > 0) {
            tickets.push({ label: '10분권', minutes: 10, count: count10m, badge: '지금 연장', status: 'pending' });
        }
        if (approvedCount30m > 0) {
            tickets.push({ label: '30분권', minutes: 30, count: approvedCount30m, badge: '승인 완료', status: 'approved' });
        }
        if (approvedCount10m > 0) {
            tickets.push({ label: '10분권', minutes: 10, count: approvedCount10m, badge: '승인 완료', status: 'approved' });
        }

        return {
            childName: name,
            rawMinutes,
            adjustedStudyMinutes,
            roundUpBonus,
            earnedCurrency,
            is50QuestReached,
            questBonusMinutes,
            totalMinutes,

            // [차액 정산 핵심 프로퍼티]
            approvedMinutes,
            pendingMinutes,
            isFullyApproved,
            isApproved: isFullyApproved,

            count30m,
            count10m,
            totalCount30m,
            totalCount10m,
            approvedCount30m,
            approvedCount10m,
            clockMetaphor,

            // [parent_dashboard 호환 프로퍼티]
            rawStudyMinutes: rawMinutes,
            studyMinutes: adjustedStudyMinutes,
            todayRewardEarned: earnedCurrency,
            isBonusTicketEarned: is50QuestReached,
            totalTimeGrantMinutes: totalMinutes,
            isParentApproved: isFullyApproved,
            tickets: tickets
        };
    }

    /**
     * 부모가 '지금 추가 연장 대기 시간'을 승인 완료 처리
     * (대기 시간 ➔ 승인 누적치로 합산, 대기 시간 0분으로 초기화)
     */
    function approvePendingTime(childName) {
        const name = childName || getCurrentChildName();
        const s = getScreenTimeSummary(name);
        const todayStr = getTodayKey();
        const approvalKey = `${APPROVAL_KEY_PREFIX}${name}_${todayStr}`;

        // 총 인정 시간을 전량 승인 완료로 확정
        setTodayApprovedMinutes(s.totalMinutes, name);
        localStorage.setItem(approvalKey, 'true');
        console.log(`📱 [스크린타임 연장 승인 완료] ${name}: 총 ${s.totalMinutes}분 승인 (새로 승인: +${s.pendingMinutes}분) ➔ 대기 시간 0분 초기화`);

        return {
            childName: name,
            totalMinutes: s.totalMinutes,
            approvedMinutes: s.totalMinutes,
            newlyApprovedMinutes: s.pendingMinutes,
            pendingMinutes: 0
        };
    }

    /**
     * 승인 초기화/재계산 (취소 시 대기 시간 복원)
     */
    function resetApproval(childName) {
        const name = childName || getCurrentChildName();
        const todayStr = getTodayKey();
        const approvalKey = `${APPROVAL_KEY_PREFIX}${name}_${todayStr}`;
        setTodayApprovedMinutes(0, name);
        localStorage.setItem(approvalKey, 'false');
        console.log(`📱 [스크린타임 승인 초기화] ${name}: 승인 누적분 0분으로 재설정`);
        return getScreenTimeSummary(name);
    }

    /**
     * 부모 승인 토글 처리 (하위 호환)
     */
    function toggleParentApproval(childName, approvedState) {
        const name = childName || getCurrentChildName();
        const s = getScreenTimeSummary(name);
        if (approvedState === true || (approvedState === undefined && s.pendingMinutes > 0)) {
            approvePendingTime(name);
            return true;
        } else {
            resetApproval(name);
            return false;
        }
    }

    /**
     * 학생용 스크린타임 정산 영수증 모달 렌더링 (차액 정산 및 사용 완료 도장 완벽 연동)
     */
    function openScreenTimeReceiptModal(targetChildName) {
        removeScreenTimeModal();

        const name = targetChildName || getCurrentChildName();
        const s = getScreenTimeSummary(name);
        const modal = document.createElement('div');
        modal.id = 'screenTimeReceiptModal';
        modal.className = 'screentime-modal-overlay';

        const isApprovedAll = s.isFullyApproved || (s.totalMinutes > 0 && s.pendingMinutes === 0);

        modal.innerHTML = `
            <div class="screentime-modal-card animate-pop-up">
                <button type="button" class="screentime-close-btn" onclick="window.closeScreenTimeReceiptModal()">✕</button>
                
                <div class="screentime-header">
                    <span class="screentime-icon">${isApprovedAll ? '💖' : '🎟️'}</span>
                    <div>
                        <h2 class="screentime-title">${s.childName}의 오늘 폰시간 정산소</h2>
                        <span class="screentime-subtitle">${isApprovedAll ? '오늘 획득한 폰 시간이 모두 패밀리링크에 충전되었습니다!' : '공부하느라 쓴 폰 시간 100% 보상 & 보너스 정산!'}</span>
                    </div>
                </div>

                <!-- 1. 시계 바늘 비유 배너 -->
                <div class="screentime-clock-banner ${isApprovedAll ? 'banner-completed' : ''}">
                    <div class="clock-icon-anim">${isApprovedAll ? '🎉' : '⏰'}</div>
                    <div class="clock-banner-text">
                        <div class="clock-headline">${isApprovedAll ? `오늘 획득한 ${s.totalMinutes}분 모두 충전 완료!` : s.clockMetaphor}</div>
                        <div class="clock-subline">${isApprovedAll ? '부모님이 패밀리링크에서 시간을 이미 늘려주셨어요. 지금 신청할 대기 시간이 없습니다.' : `실제 공부 ${s.rawMinutes}분 ➔ 10분 단위 올림으로 <b>${s.adjustedStudyMinutes}분</b> 인정!`}</div>
                    </div>
                </div>

                ${isApprovedAll ? `
                <!-- 🌟 전량 충전 완료 안심 카드 (아이가 착각하여 추가 요구하지 않도록 0장 명확 고지) -->
                <div class="screentime-completed-hero">
                    <div class="completed-hero-title">✅ 오늘 폰 시간 충전 완료</div>
                    <div class="completed-hero-desc">
                        오늘 열심히 공부해서 획득한 <b>${s.totalMinutes}분</b>을 부모님이 패밀리링크에 모두 충전해주셨습니다.
                    </div>
                    <div class="completed-zero-badge">
                        🚫 지금 사용할 수 있는 남은 티켓: <b>0장 (모두 사용 완료)</b>
                    </div>
                    <div class="completed-hero-sub">
                        💡 문제를 더 풀거나 새로운 과목을 공부하면 추가 시간이 다시 쌓여요!
                    </div>
                </div>
                ` : ''}

                <!-- 2. 영수증 내역 리스트 -->
                <div class="screentime-receipt-box">
                    <div class="receipt-row">
                        <span class="r-label">📚 오늘 공부방 순수 열공</span>
                        <span class="r-val">${s.rawMinutes}분</span>
                    </div>
                    <div class="receipt-row highlight-bonus">
                        <span class="r-label">🎁 10분 단위 쿨한 올림 보정</span>
                        <span class="r-val">+${s.roundUpBonus}분</span>
                    </div>
                    ${s.is50QuestReached ? `
                    <div class="receipt-row highlight-bonus">
                        <span class="r-label">🎯 오늘 50개 달성 보너스</span>
                        <span class="r-val">+30분 추가!</span>
                    </div>` : `
                    <div class="receipt-row">
                        <span class="r-label">🎯 오늘 보상 획득 (${s.earnedCurrency}/50개)</span>
                        <span class="r-val" style="color:#64748b;">${Math.max(0, 50 - s.earnedCurrency)}개 더 모으면 +30분</span>
                    </div>`}
                    <div class="receipt-divider"></div>
                    <div class="receipt-row total-row">
                        <span class="r-total-label">🏆 오늘 총 인정 시간</span>
                        <span class="r-total-val" style="color:#0284c7;">${s.totalMinutes}분</span>
                    </div>
                    ${s.approvedMinutes > 0 ? `
                    <div class="receipt-row" style="margin-top:6px; font-size:0.92rem;">
                        <span class="r-label" style="color:#16a34a; font-weight:bold;">✅ 부모님 패밀리링크 충전 완료</span>
                        <span class="r-val" style="color:#16a34a; font-weight:bold;">${s.approvedMinutes}분 (사용됨)</span>
                    </div>` : ''}
                    
                    ${isApprovedAll ? `
                    <div class="receipt-row" style="margin-top:6px; font-size:1.02rem; background:#f0fdf4; padding:7px 10px; border-radius:10px; border:1.5px solid #86efac;">
                        <span class="r-label" style="color:#15803d; font-weight:bold;">👉 지금 추가 연장할 남은 시간</span>
                        <span class="r-val" style="color:#15803d; font-weight:900; font-size:1.25rem;">0분 (대기 없음)</span>
                    </div>
                    ` : `
                    <div class="receipt-row" style="margin-top:6px; font-size:1.02rem; background:#fff1f2; padding:7px 10px; border-radius:10px; border:1.5px solid #fecdd3;">
                        <span class="r-label" style="color:#e11d48; font-weight:bold;">⏳ 지금 부모님께 받을 시간</span>
                        <span class="r-val" style="color:#e11d48; font-weight:bold; font-size:1.35rem;">+${s.pendingMinutes}분</span>
                    </div>
                    `}
                </div>

                <!-- 3. 발급 티켓 꾸러미 -->
                <div class="screentime-tickets-area">
                    <div class="tickets-title">
                        ${isApprovedAll 
                            ? '📁 오늘 사용 완료된 티켓 보관소 (재사용 불가)' 
                            : '🎫 지금 부모님께 보여드릴 티켓 (총 ' + s.pendingMinutes + '분)'}
                    </div>
                    <div class="tickets-grid">
                        ${s.count30m > 0 ? `
                            <div class="screentime-ticket ticket-30m animate-pulse-ticket">
                                <div class="ticket-badge" style="background:#ea580c; color:#fff; border-radius:6px; padding:2px 6px;">👉 지금 연장 신청</div>
                                <div class="ticket-time">30분권</div>
                                <div class="ticket-qty">x ${s.count30m}장</div>
                            </div>
                        ` : ''}
                        ${s.count10m > 0 ? `
                            <div class="screentime-ticket ticket-10m animate-pulse-ticket">
                                <div class="ticket-badge" style="background:#c026d3; color:#fff; border-radius:6px; padding:2px 6px;">👉 지금 연장 신청</div>
                                <div class="ticket-time">10분권</div>
                                <div class="ticket-qty">x ${s.count10m}장</div>
                            </div>
                        ` : ''}
                        ${isApprovedAll ? `
                            ${s.approvedCount30m > 0 ? `
                                <div class="screentime-ticket ticket-used">
                                    <div class="ticket-badge badge-used">🚫 사용 완료 (0장 남음)</div>
                                    <div class="ticket-time time-used">30분권</div>
                                    <div class="ticket-qty qty-used">패밀리링크 충전 완료</div>
                                </div>
                            ` : ''}
                            ${s.approvedCount10m > 0 ? `
                                <div class="screentime-ticket ticket-used">
                                    <div class="ticket-badge badge-used">🚫 사용 완료 (0장 남음)</div>
                                    <div class="ticket-time time-used">10분권</div>
                                    <div class="ticket-qty qty-used">패밀리링크 충전 완료</div>
                                </div>
                            ` : ''}
                        ` : ''}
                        ${s.totalMinutes === 0 ? `
                            <div class="no-tickets-msg">아직 오늘 공부 기록이 없어요! 문제를 풀면 시간이 쌓여요. 🚀</div>
                        ` : ''}
                    </div>
                </div>

                <!-- 4. 하단 승인 상태 및 안내 -->
                <div class="screentime-footer">
                    <div class="approval-status-chip ${isApprovedAll ? 'is-approved' : 'is-pending'}">
                        ${isApprovedAll 
                            ? '💖 오늘 폰 시간 충전이 모두 끝났습니다! (남은 대기 티켓 없음)' 
                            : (s.pendingMinutes > 0 ? `⏳ ${s.pendingMinutes}분 추가 연장 대기 중 (아빠/엄마께 보여주세요!)` : '대기 중')}
                    </div>
                    <button type="button" class="screentime-confirm-btn ${isApprovedAll ? 'btn-completed' : ''}" onclick="window.closeScreenTimeReceiptModal()">
                        ${isApprovedAll ? '확인 완료 (닫기) 👍' : '부모님께 보여드리기 👍'}
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
            .screentime-clock-banner.banner-completed {
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                box-shadow: 0 4px 14px rgba(16, 185, 129, 0.25);
            }
            .clock-icon-anim { font-size: 2.2rem; animation: pulseClock 2s infinite ease-in-out; }
            @keyframes pulseClock {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.12); }
            }
            .clock-headline { font-family: 'Jua', sans-serif; font-size: 1.15rem; margin-bottom: 3px; }
            .clock-subline { font-size: 0.85rem; opacity: 0.92; word-break: keep-all; }

            .screentime-completed-hero {
                background: #f0fdf4; border: 2px solid #86efac;
                border-radius: 18px; padding: 14px 16px; text-align: center;
                margin-bottom: 16px;
            }
            .completed-hero-title {
                font-family: 'Jua', sans-serif; font-size: 1.25rem; color: #15803d; margin-bottom: 4px;
            }
            .completed-hero-desc {
                font-size: 0.88rem; color: #166534; line-height: 1.45; word-break: keep-all;
            }
            .completed-zero-badge {
                margin-top: 8px; display: inline-block; background: #ffffff;
                border: 1.5px solid #22c55e; border-radius: 12px; padding: 5px 12px;
                font-size: 0.95rem; font-weight: bold; color: #15803d;
            }
            .completed-hero-sub {
                font-size: 0.78rem; color: #64748b; margin-top: 6px;
            }

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

            .screentime-ticket.ticket-used {
                background: #f1f5f9; border-color: #cbd5e1; color: #64748b;
                box-shadow: none; opacity: 0.8;
            }
            .ticket-badge.badge-used {
                background: #dc2626; color: #ffffff; border-radius: 6px;
                padding: 2px 6px; font-size: 0.72rem; font-weight: bold;
            }
            .ticket-time.time-used {
                color: #94a3b8; text-decoration: line-through; font-size: 1.25rem; margin: 3px 0;
            }
            .ticket-qty.qty-used {
                color: #dc2626; font-size: 0.78rem; font-weight: bold;
            }

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
            .screentime-confirm-btn.btn-completed {
                background: linear-gradient(135deg, #0284c7 0%, #2563eb 100%);
                box-shadow: 0 4px 12px rgba(2, 132, 199, 0.3);
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
        approvePendingTime,
        resetApproval,
        getTodayApprovedMinutes,
        setTodayApprovedMinutes,
        openScreenTimeReceiptModal,
        closeScreenTimeReceiptModal
    };

    window.openScreenTimeReceiptModal = openScreenTimeReceiptModal;
    window.closeScreenTimeReceiptModal = closeScreenTimeReceiptModal;
    window.trackStudySession = trackStudySession;
    window.recordDailyRewardEarned = recordDailyRewardEarned;
    window.syncFromInventoryProps = syncFromInventoryProps;
    window.approvePendingScreenTime = approvePendingTime;
    window.resetScreenTimeApproval = resetApproval;

    console.log('⏰ [스크린타임 트래커 로드 완료] ScreenTimeTracker 활성화 (차액 정산 엔진 탑재)');
})();
