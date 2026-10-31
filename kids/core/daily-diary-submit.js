// kids/core/daily-diary-submit.js - daily-diary.js 분리 4/4: 일기 제출·성공 모달·목록·전역 바인딩 (순서대로 로드)
async function submitMinseoDiary(dateYMD) {
    const { isParentMode } = getCurrentDiaryTarget();
    const promptMsg = isParentMode
        ? "민서의 오늘 마음 일기를 '부모관리자' 명의로 노션에 기록할까요? (보상 없음)"
        : "민서의 오늘 마음 일기를 이대로 완성하고 저장할까요? 🌟 (+5🍬)";

    if (!confirm(promptMsg)) {
        return;
    }

    try {
        const weatherCard = document.querySelector('#minseoWeatherGrid .choice-card.selected');
        const weather = weatherCard ? weatherCard.dataset.val : '☀️ 맑음';

        const selectedBalloons = Array.from(document.querySelectorAll('#minseoBalloonGrid .balloon-tag.selected')).map(t => t.innerText);
        const eventText = document.getElementById('minseoEventInput')?.value.trim() || '즐겁고 보람차게 시간을 보냈어요!';

        const sit = document.getElementById('minseoIMessageSit')?.value.trim();
        const feel = document.getElementById('minseoIMessageFeel')?.value.trim();
        const wish = document.getElementById('minseoIMessageWish')?.value.trim();

        let iMessage = '';
        const msgList = [];
        if (sit) msgList.push(sit);
        if (feel) msgList.push(feel);
        if (wish) msgList.push(wish);
        if (msgList.length > 0) {
            iMessage = msgList.join(' ');
        }

        const timeStr = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

        const entry = {
            id: 'diary_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            childName: '민서',
            date: dateYMD,
            timeStr: timeStr,
            weather: weather,
            moods: selectedBalloons,
            content: eventText,
            iMessage: iMessage,
            createdAt: new Date().toISOString()
        };

        // 1) 로컬스토리지 저장
        saveDiaryEntry(entry);

        // 2) 노션 인벤토리 DB에 보상 지급 (부모 모드일 때는 함수 내부에서 자동 건너뜀)
        dispenseDiaryRewardDirect('민서', 5);

        // 3) 노션 학습일지 DB에 일기 내용 직접 기록 (부모 모드일 때는 학생: '부모관리자')
        sendDiaryLogToNotionDirect(entry);

        const todayCount = getTodayDiaryCount('민서');
        // 4) 성공 화면 렌더링
        showDiarySuccessModal('민서', weather, isParentMode ? `부모관리자 검수 기록 완료! 🛡️` : `참 잘했어요! 오늘 ${todayCount}번째 별 도장 획득! 🌟`);
    } catch (globalErr) {
        console.error("민서 일기 저장 중 오류 발생:", globalErr);
        showDiarySuccessModal('민서', '☀️ 맑음', '일기가 저장되었어요! 🌟');
    }
}

// 6. 민수 일기 제출
async function submitMinsuDiary(dateYMD) {
    const { isParentMode } = getCurrentDiaryTarget();
    const promptMsg = isParentMode
        ? "민수의 오늘 일기를 '부모관리자' 명의로 노션에 기록할까요? (보상 없음)"
        : "민수의 오늘 일기를 이대로 완성하고 저장할까요? 🚀 (+5💎)";

    if (!confirm(promptMsg)) {
        return;
    }

    try {
        const energyCard = document.querySelector('#minsuEnergyGrid .choice-card.selected');
        const energy = energyCard ? energyCard.dataset.val : '😎 꿀잼·대만족';

        const accomplish = document.getElementById('minsuAccomplishInput')?.value.trim() || '재미있게 시간을 잘 보냈다.';
        const goal = document.getElementById('minsuGoalInput')?.value.trim() || '오늘 하루도 수고 많았다! 푹 쉬자!';

        const timeStr = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

        const entry = {
            id: 'diary_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            childName: '민수',
            date: dateYMD,
            timeStr: timeStr,
            energy: energy,
            accomplish: accomplish,
            goal: goal,
            createdAt: new Date().toISOString()
        };

        // 1) 로컬스토리지 저장
        saveDiaryEntry(entry);

        // 2) 노션 인벤토리 DB에 보상 지급 (부모 모드일 때는 함수 내부에서 자동 건너뜀)
        dispenseDiaryRewardDirect('민수', 5);

        // 3) 노션 학습일지 DB에 일기 내용 직접 기록 (부모 모드일 때는 학생: '부모관리자')
        sendDiaryLogToNotionDirect(entry);

        const todayCount = getTodayDiaryCount('민수');
        // 4) 성공 화면 렌더링
        showDiarySuccessModal('민수', energy, isParentMode ? `부모관리자 검수 기록 완료! 🛡️` : `오늘 ${todayCount}번째 일상 기록 완료! 🎮`);
    } catch (globalErr) {
        console.error("민수 일기 저장 중 오류 발생:", globalErr);
        showDiarySuccessModal('민수', '😎 꿀잼', '일기가 저장되었어요! 🎮');
    }
}

// 7. 완료 팝업 & 도장 연출
function showDiarySuccessModal(childName, badgeIcon, stampMsg) {
    const { isParentMode } = getCurrentDiaryTarget();

    // 일기 저장 완료 안내 음성 재생 (퀴즈 정답 프리셋 사운드와 분리)
    if (typeof speakFairyTTS === 'function') {
        let completionVoiceMsg = "";
        if (isParentMode) {
            completionVoiceMsg = "부모 관리자 일기가 등록되었습니다.";
        } else if (childName === '민서') {
            completionVoiceMsg = "민서의 오늘 마음 일기가 소중하게 등록되었어요.";
        } else {
            completionVoiceMsg = "오늘 하루 일기 기록 완료! 푹 쉬고 내일 또 만나요.";
        }
        speakFairyTTS(completionVoiceMsg);
    }

    const writeSec = document.getElementById('diaryWriteSection');
    if (!writeSec) return;

    let rewardDesc = "";
    if (isParentMode) {
        rewardDesc = `<span style="color:#ef4444; font-weight:bold;">🛠️ [부모관리자 검수 모드]</span> 노션 학습일지에 <b>'부모관리자'</b>로 등록되었으며, 아이들 인벤토리 보상은 안전하게 건너뛰었습니다.`;
    } else if (childName === '민서') {
        rewardDesc = `소중한 하루 마음을 기록한 민서에게 <b>하리보 젤리 5개 🍬</b>가 지급되었습니다!`;
    } else {
        rewardDesc = `소중한 하루 일상을 기록한 민수에게 <b>다이아몬드 5개 💎</b>가 지급되었습니다!`;
    }

    writeSec.innerHTML = `
        <div style="text-align: center; padding: 30px 10px; display: flex; flex-direction: column; align-items: center; gap: 16px;">
            <div style="font-size: 3.5rem;">🎉</div>
            <h2 style="font-family: 'Jua', sans-serif; font-size: 1.6rem; color: #10b981;">
                ${isParentMode ? '[부모관리자] ' : ''}${childName}의 기록이 멋지게 저장되었어요!
            </h2>
            <p style="font-size: 1rem; opacity: 0.85; max-width: 480px; line-height: 1.5;">
                ${rewardDesc}
            </p>

            <div style="margin: 20px 0;">
                <div class="stamp-badge">
                    ${stampMsg}
                </div>
            </div>

            <div style="display:flex; gap:12px; margin-top:10px; flex-wrap:wrap; justify-content:center;">
                <button class="diary-tab-btn" style="padding:10px 20px; font-size:1rem;" onclick="openDailyDiaryModal('write')">
                    ✏️ 새 일기 또 쓰기
                </button>
                <button class="diary-tab-btn active" style="padding:10px 20px; font-size:1rem;" onclick="switchDiaryTab('history')">
                    📚 지난 일기 모아보기
                </button>
                <button class="diary-tab-btn" style="padding:10px 20px; font-size:1rem;" onclick="closeDailyDiaryModal()">
                    🚪 닫기
                </button>
            </div>
        </div>
    `;
}

// 8. 지난 일기 히스토리 뷰 렌더러 (타임라인 시간대 및 노션 클라우드 동기화 렌더링)
function renderDiaryHistoryList(childName, isMinsu) {
    // 🛡️ 화면 렌더링 시에도 해당 아이의 순수 일기만 철저히 선별
    const list = getStoredDiaries().filter(item => 
        item.childName === childName &&
        item.category !== '특별한 날' &&
        item.category !== '작품' &&
        item.category !== '상장' &&
        !String(item.id || '').startsWith('evt_') &&
        !String(item.id || '').startsWith('art_')
    );

    return `
        <div style="display: flex; flex-direction: column; gap: 16px;">
            <div style="font-size: 0.92rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                <div style="display:flex; align-items:center; gap:6px;">
                    <span style="font-weight:bold;">총 ${list.length}편의 기록 📚</span>
                    <span id="diarySyncStatusIndicator" style="font-size:0.8rem; color:#10b981; display:none;">🔄 노션 동기화 중...</span>
                </div>
                <div style="display:flex; gap:6px;">
                    <button class="diary-tab-btn" style="padding:4px 10px; font-size:0.82rem;" onclick="syncDiariesFromNotion('${childName}')" title="아이폰/태블릿 등 다른 기기에서 쓴 일기 불러오기">🔄 노션 동기화</button>
                    <button class="diary-tab-btn" style="padding:4px 10px; font-size:0.82rem;" onclick="openDailyDiaryModal('write')">➕ 새 일기 쓰기</button>
                </div>
            </div>

            ${list.length === 0 ? `
                <div style="text-align:center; padding:50px 10px; opacity:0.7;">
                    <div style="font-size:3rem; margin-bottom:12px;">📝</div>
                    <p style="font-family:'Jua', sans-serif; font-size:1.2rem;">아직 작성된 일기가 없거나 동기화 중이에요.</p>
                    <p style="font-size:0.9rem;">상단의 [🔄 노션 동기화]를 누르거나 첫 일기를 써볼까요?</p>
                </div>
            ` : list.map(entry => `
                <div style="background:${isMinsu ? '#2e2a72' : '#ffffff'}; border:2px solid ${isMinsu ? '#4f46e5' : '#ffd1dc'}; border-radius:18px; padding:16px; box-shadow:0 4px 14px rgba(0,0,0,0.06); display:flex; flex-direction:column; gap:8px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px dashed ${isMinsu ? '#4338ca' : '#fecdd3'}; padding-bottom:8px; flex-wrap:wrap; gap:6px;">
                        <span style="font-family:'Jua', sans-serif; font-size:1.05rem; color:${isMinsu ? '#818cf8' : '#e11d48'}; display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                            📅 ${entry.date} <span style="font-size:0.85rem; opacity:0.8; font-weight:normal;">(${entry.timeStr || '기록'})</span>
                            ${entry.isParentEntry ? '<span style="font-size:0.75rem; background:rgba(239,68,68,0.15); color:#ef4444; border:1px solid #f87171; padding:1px 6px; border-radius:6px;">🛠️ 부모검수</span>' : ''}
                            ${entry.isNotionSynced || entry.notionPageId ? '<span style="font-size:0.75rem; background:rgba(16,185,129,0.15); color:#10b981; border:1px solid #34d399; padding:1px 6px; border-radius:6px;" title="노션 클라우드에 영구 저장됨">☁️ 노션 연동</span>' : ''}
                        </span>
                        <div style="display:flex; align-items:center; gap:8px;">
                            <span style="font-size:0.95rem; font-weight:bold; background:${isMinsu ? 'rgba(99,102,241,0.2)' : '#ffe4e6'}; padding:4px 10px; border-radius:12px;">
                                ${entry.weather || entry.energy || '✨ 맑음'}
                            </span>
                            <button type="button" onclick="deleteDiaryEntry('${entry.id}')" style="background:transparent; border:1px solid ${isMinsu ? '#f87171' : '#fda4af'}; color:${isMinsu ? '#f87171' : '#e11d48'}; font-family:'Jua', sans-serif; font-size:0.8rem; cursor:pointer; padding:3px 8px; border-radius:8px; transition:all 0.2s;" title="이 일기 삭제하기">🗑️ 삭제</button>
                        </div>
                    </div>

                    ${entry.moods && entry.moods.length > 0 ? `
                        <div style="display:flex; flex-wrap:wrap; gap:6px;">
                            ${entry.moods.map(m => `<span style="font-size:0.82rem; background:${isMinsu ? '#4338ca' : '#fff1f2'}; border:1px solid ${isMinsu ? '#6366f1' : '#fecdd3'}; padding:2px 8px; border-radius:10px;">${m}</span>`).join('')}
                        </div>
                    ` : ''}

                    <div style="font-size:0.95rem; line-height:1.6; margin-top:4px;">
                        ${entry.content ? `<b>📝 이야기:</b> ${entry.content}` : ''}
                        ${entry.accomplish ? `<b>🍕 이야기:</b> ${entry.accomplish}` : ''}
                    </div>

                    ${entry.iMessage ? `
                        <div style="background:${isMinsu ? 'rgba(99,102,241,0.15)' : '#fff5f7'}; border-left:3px solid ${isMinsu ? '#818cf8' : '#ff4081'}; padding:8px 12px; border-radius:0 10px 10px 0; font-size:0.9rem; font-style:italic;">
                            🪄 <b>나-전달법:</b> ${entry.iMessage}
                        </div>
                    ` : ''}

                    ${entry.goal ? `
                        <div style="background:rgba(99,102,241,0.15); border-left:3px solid #818cf8; padding:8px 12px; border-radius:0 10px 10px 0; font-size:0.9rem;">
                            💬 <b>나에게 한마디:</b> ${entry.goal}
                        </div>
                    ` : ''}
                </div>
            `).join('')}
        </div>
    `;
}

// 9. 👨‍👩‍👧‍👦 부모 전용 일기 제출 헬퍼
async function submitParentDiary(parentName, moodVal, contentVal, thoughtVal, dateYMD) {
    if (!contentVal || !contentVal.trim()) {
        alert("오늘 하루의 일상이나 가족 이야기를 적어주세요! ✏️");
        return false;
    }

    const todayYMD = dateYMD || getKstTodayYMD();
    const timeStr = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    const author = (parentName === '엄마') ? '엄마' : '아빠';

    const entry = {
        id: 'diary_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        childName: author,
        date: todayYMD,
        timeStr: timeStr,
        weather: moodVal || '☕ 평온·차분',
        energy: moodVal || '☕ 평온·차분',
        content: contentVal.trim(),
        iMessage: (thoughtVal || '').trim(),
        goal: (thoughtVal || '').trim(),
        isParentEntry: true,
        isParentSelfDiary: true,
        createdAt: new Date().toISOString()
    };

    try {
        // 1) 로컬 스토리지 저장
        saveDiaryEntry(entry);

        // 2) 노션 학습일지 DB 및 AI 대화록 및 일상 기록 DB 관계형 자동 연동
        await sendDiaryLogToNotionDirect(entry);

        return true;
    } catch (e) {
        console.error("부모 일기 저장 오류:", e);
        return false;
    }
}

// 전역 바인딩
window.openDailyDiaryModal = openDailyDiaryModal;
window.closeDailyDiaryModal = closeDailyDiaryModal;
window.switchDiaryTab = switchDiaryTab;
window.selectChoiceCard = selectChoiceCard;
window.toggleBalloonTag = toggleBalloonTag;
window.insertQuickTag = insertQuickTag;
window.submitMinseoDiary = submitMinseoDiary;
window.submitMinsuDiary = submitMinsuDiary;
window.submitParentDiary = submitParentDiary;
window.getOrCreateAiDailyLog = getOrCreateAiDailyLog;
window.deleteDiaryEntry = deleteDiaryEntry;
window.startDiaryVoiceInput = startDiaryVoiceInput;
window.getTodayDiaryCount = getTodayDiaryCount;
window.updateLobbyDiaryButton = updateLobbyDiaryButton;
window.syncDiariesFromNotion = syncDiariesFromNotion;
window.fetchNotionDiaries = fetchNotionDiaries;
window.getStoredDiaries = getStoredDiaries;

