// kids/core/notion-reward-discussion.js - notion-reward.js 분리 3/3: 이탈 플러시·토론 보상·이탈 확인·용어 정독 (순서대로 로드)
// 🛡️ 브라우저 이탈(탭 닫기, 새로고침, 뒤로가기) 시 미기록 세션 안전 자동 플러시
if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', () => {
        const session = window.__quizRewardSession;
        if (session && !session.isLogged && (session.solvedCount > 0 || session.correctCount > 0 || window.wrongNotes?.length || window.engWrongNotes?.length)) {
            session.isLogged = true;
            const subj = window.currentSubject || (typeof detectSubjectFromContext === 'function' ? detectSubjectFromContext() : '국어');
            if (typeof sendStudyLogToNotion === 'function') {
                sendStudyLogToNotion({
                    subject: subj,
                    startTime: session.startTime,
                    endTime: new Date().toISOString()
                });
            }
        }
    });
}

const DISCUSSION_STOP_WORDS = new Set([
    'the', 'and', 'that', 'this', 'with', 'will', 'have', 'from', 'they', 'what', 'about',
    'you', 'your', 'are', 'for', 'was', 'were', 'been', 'being', 'their', 'there', 'then',
    'when', 'where', 'which', 'while', 'would', 'could', 'should', 'into', 'after', 'before',
    'both', 'also', 'just', 'very', 'much', 'more', 'some', 'such', 'only', 'over', 'under',
    '그리고', '하지만', '그래서', '있다', '없다', '한다', '된다', '이다', '에서', '으로', '에게'
]);

function extractPassageKeywords(passage) {
    if (passage?.keywords && Array.isArray(passage.keywords)) {
        return passage.keywords.map(k => String(k).trim()).filter(Boolean);
    }
    const raw = `${passage?.title || ''} ${passage?.fullText || ''}`;
    const scored = new Map();

    (raw.match(/[a-zA-Z]{4,}/g) || []).forEach(word => {
        const key = word.toLowerCase();
        if (DISCUSSION_STOP_WORDS.has(key)) return;
        scored.set(key, (scored.get(key) || 0) + 1);
    });
    (raw.match(/[가-힣]{2,}/g) || []).forEach(word => {
        if (DISCUSSION_STOP_WORDS.has(word)) return;
        scored.set(word, (scored.get(word) || 0) + 1);
    });

    return [...scored.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12)
        .map(([word]) => word);
}

function messageContainsPassageKeyword(text, keywords) {
    if (!text || !keywords?.length) return false;
    const lower = text.toLowerCase();
    return keywords.some(keyword => {
        if (/^[a-z]/i.test(keyword)) return lower.includes(keyword.toLowerCase());
        return text.includes(keyword);
    });
}

function initDiscussionRewardSession(missionType, passage) {
    window.__discussionRewardState = {
        missionType,
        passageId: passage?.id || 'default',
        startedAt: Date.now(),
        longMsgPoints: 0,
        timeMinutesGranted: 0,
        keywordBonusGranted: false,
        successJackpotGranted: false,
        keywords: extractPassageKeywords(passage)
    };
}

async function grantDiscussionTimeRewards() {
    const state = window.__discussionRewardState;
    if (!state) return;

    const elapsedMinutes = Math.floor((Date.now() - state.startedAt) / 60000);
    while (state.timeMinutesGranted < elapsedMinutes && state.timeMinutesGranted < 3) {
        state.timeMinutesGranted += 1;
        const rewardKey = `${buildMissionRewardKey(state.missionType, state.passageId)}_time${state.timeMinutesGranted}`;
        await claimMissionRewardOnce(rewardKey, {
            amount: 2,
            missionType: state.missionType,
            subject: window.currentSubject,
            silent: true,
            skipStudyLog: true
        });
    }
}

async function processDiscussionMessageRewards(text) {
    const state = window.__discussionRewardState;
    if (!state) return;

    await grantDiscussionTimeRewards();

    const compactLen = String(text || '').replace(/\s/g, '').length;
    if (compactLen >= 5 && state.longMsgPoints < 5) {
        state.longMsgPoints += 1;
        const rewardKey = `${buildMissionRewardKey(state.missionType, state.passageId)}_msg${state.longMsgPoints}`;
        await claimMissionRewardOnce(rewardKey, {
            amount: 1,
            missionType: state.missionType,
            subject: window.currentSubject,
            silent: true,
            skipStudyLog: true
        });
    }

    if (!state.keywordBonusGranted && messageContainsPassageKeyword(text, state.keywords)) {
        state.keywordBonusGranted = true;
        const rewardKey = `${buildMissionRewardKey(state.missionType, state.passageId)}_keyword`;
        await claimMissionRewardOnce(rewardKey, {
            amount: 5,
            missionType: state.missionType,
            subject: window.currentSubject,
            silent: true,
            skipStudyLog: true
        });
    }
}

function dispatchDiscussionSuccessJackpot(missionType, passageId) {
    const state = window.__discussionRewardState;
    if (state?.successJackpotGranted) return false;
    if (state) state.successJackpotGranted = true;

    const rewardKey = `${buildMissionRewardKey(missionType, passageId)}_success`;
    window.__pendingMissionReward = {
        rewardKey,
        amount: 10,
        missionType,
        subject: window.currentSubject
    };
    return claimMissionRewardOnce(rewardKey, {
        amount: 10,
        missionType,
        subject: window.currentSubject,
        silent: true,
        skipStudyLog: false
    });
}

async function finalizeDiscussionSessionRewards() {
    await grantDiscussionTimeRewards();
}

function dispatchSuccessMissionReward(missionType, passageId, amount = 5) {
    if (amount >= 10) {
        return dispatchDiscussionSuccessJackpot(missionType, passageId);
    }
    const rewardKey = buildMissionRewardKey(missionType, passageId);
    window.__pendingMissionReward = {
        rewardKey,
        amount,
        missionType,
        subject: window.currentSubject
    };
    return claimMissionRewardOnce(rewardKey, {
        amount,
        missionType,
        subject: window.currentSubject,
        silent: true,
        skipStudyLog: false
    });
}

async function flushPendingMissionReward() {
    await finalizeDiscussionSessionRewards();
    if (!window.__pendingMissionReward) return false;
    const { rewardKey, amount, missionType, subject, errorReport } = window.__pendingMissionReward;
    if (window.__missionRewardLocks[rewardKey] === 'done') return true;
    return claimMissionRewardOnce(rewardKey, {
        amount,
        missionType,
        subject,
        errorReport,
        silent: true,
        skipStudyLog: false
    });
}

async function processDiscussionAiReply(reply, options = {}) {
    const {
        missionType,
        passageId,
        bubbleId,
        chatBoxId = 'sentenceChatBox',
        subject = window.currentSubject || '국어'
    } = options;

    const replyText = String(reply || '');
    const displayHtml = replyText.replace(/\n/g, '<br>');
    setChatBubbleContent(bubbleId, displayHtml, { chatBoxId, asHtml: true });
    window.__geminiRetryWaitRef = null;

    const speechText = replyText.replace(/\[SUCCESS\]/g, '').trim();
    if (speechText && typeof speakFairyTTS === 'function') {
        speakFairyTTS(speechText);
    }

    if (!replyText.includes('[SUCCESS]')) return false;

    if (typeof dispatchDiscussionSuccessJackpot === 'function') {
        return dispatchDiscussionSuccessJackpot(missionType, passageId);
    }
    if (typeof dispatchSuccessMissionReward === 'function') {
        return dispatchSuccessMissionReward(missionType, passageId, 10);
    }
    if (typeof window.triggerAwardDispense === 'function') {
        await window.triggerAwardDispense(10, missionType);
        if (typeof sendStudyLogToNotion === 'function') {
            await sendStudyLogToNotion({ subject });
        }
    }
    return true;
}

async function finalizeSentenceDiscussionSession(options = {}) {
    const {
        messages = [],
        roomType = '공부방',
        missionType = 'sentence'
    } = options;

    if (window.__sentenceDiscussionMemorySaved) return true;

    const hasUserTurn = Array.isArray(messages) && messages.some(m => m.role === 'user' && m.content);
    if (!hasUserTurn) return false;

    if (typeof flushPendingMissionReward === 'function') {
        await flushPendingMissionReward();
    } else if (typeof finalizeDiscussionSessionRewards === 'function') {
        await finalizeDiscussionSessionRewards();
    }

    if (typeof saveChatMemoryFromConversation !== 'function') return false;

    const saved = await saveChatMemoryFromConversation({
        roomType,
        messages
    });
    if (saved) window.__sentenceDiscussionMemorySaved = true;
    return saved;
}

// ========================================================
// 🧠 AI 대화 기억 보관소 (Chat Memory) + 3x2 페르소나 매트릭스
// ========================================================


// ========================================================
function ensureQuizWrongChoiceOverlay() {
    if (document.getElementById('quizWrongChoiceOverlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'quizWrongChoiceOverlay';
    overlay.style.cssText =
        'display:none; position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:100000; justify-content:center; align-items:center; padding:20px; box-sizing:border-box;';

    overlay.innerHTML = `
        <div style="background:#fff; border-radius:24px; padding:28px 22px; max-width:380px; width:100%; text-align:center; box-shadow:0 16px 48px rgba(0,0,0,0.25); font-family:'Nanum Gothic','Jua',sans-serif;">
            <div style="font-size:2.5rem; margin-bottom:12px;">💥</div>
            <div id="quizWrongChoiceMessage" style="font-size:1.25rem; color:#333; margin-bottom:8px; line-height:1.45;">아쉽지만 틀렸어요!</div>
            <div id="quizWrongChoiceSub" style="font-size:0.95rem; color:#666; margin-bottom:22px; line-height:1.5;">다시 풀어볼까요, 아니면 다음 문제로 넘어갈까요?</div>
            <div style="display:flex; flex-direction:column; gap:10px;">
                <button id="quizWrongChoiceRetryBtn" type="button" style="padding:14px; border:none; border-radius:16px; background:linear-gradient(135deg,#4facfe,#00f2fe); color:#fff; font-family:inherit; font-size:1.1rem; cursor:pointer;">🔄 다시 풀기</button>
                <button id="quizWrongChoiceSkipBtn" type="button" style="padding:14px; border:none; border-radius:16px; background:#8b949e; color:#fff; font-family:inherit; font-size:1.1rem; cursor:pointer;">⏭️ 다음 문제로</button>
            </div>
        </div>
    `;

    overlay.querySelector('#quizWrongChoiceRetryBtn').addEventListener('click', () => {
        overlay.style.display = 'none';
        const fn = window.__quizWrongChoiceRetry;
        window.__quizWrongChoiceRetry = null;
        window.__quizWrongChoiceSkip = null;
        if (typeof fn === 'function') fn();
    });

    overlay.querySelector('#quizWrongChoiceSkipBtn').addEventListener('click', () => {
        overlay.style.display = 'none';
        const fn = window.__quizWrongChoiceSkip;
        window.__quizWrongChoiceRetry = null;
        window.__quizWrongChoiceSkip = null;
        if (typeof fn === 'function') fn();
    });

    document.body.appendChild(overlay);
}

window.promptQuizRetryOrSkip = function(options = {}) {
    ensureQuizWrongChoiceOverlay();
    const overlay = document.getElementById('quizWrongChoiceOverlay');
    const msgEl = document.getElementById('quizWrongChoiceMessage');
    const subEl = document.getElementById('quizWrongChoiceSub');

    msgEl.textContent = options.message || '아쉽지만 틀렸어요!';
    subEl.textContent =
        options.subMessage || '다시 풀어볼까요, 아니면 다음 문제로 넘어갈까요?';
    if (options.hint) {
        subEl.textContent += `\n💡 ${options.hint}`;
    }

    window.__quizWrongChoiceRetry = options.onRetry || null;
    window.__quizWrongChoiceSkip = options.onSkip || null;
    overlay.style.display = 'flex';

    if (!options.silent) {
        if (typeof fairyEncourage === 'function') {
            fairyEncourage();
        } else if (typeof speakFairyTTS === 'function') {
            speakFairyTTS(options.message || '아쉽지만 틀렸어요!');
        }
    }
};

window.closeQuizWrongChoice = function() {
    const overlay = document.getElementById('quizWrongChoiceOverlay');
    if (overlay) overlay.style.display = 'none';
};

// ========================================================
// 🚪 퀴즈/미션 진행 중 이탈 확인 (브라우저 뒤로 · 나가기 공통)
// ========================================================
window.LEAVE_SESSION_MSG = '나가시겠어요?\n풀던 문제가 사라질 수 있어요.';

window.__quizLeaveGuard = {
    armed: false,
    checking: false,
    isActive: null,
    onLeave: null
};

window.isQuizLeaveGuardActive = function() {
    const g = window.__quizLeaveGuard;
    if (!g || !g.armed || typeof g.isActive !== 'function') return false;
    try {
        return !!g.isActive();
    } catch (_) {
        return false;
    }
};

window.confirmLeaveActiveSession = function(message) {
    if (!window.isQuizLeaveGuardActive()) return true;
    return window.confirm(message || window.LEAVE_SESSION_MSG);
};

function __onQuizLeaveLobbyClick(e) {
    const link = e.target && e.target.closest
        ? e.target.closest('a.back-to-lobby-btn, a.exit-btn, a[href*="lobby.html"]')
        : null;
    if (!link) return;
    if (!window.isQuizLeaveGuardActive()) return;
    if (!window.confirm(window.LEAVE_SESSION_MSG)) {
        e.preventDefault();
        e.stopPropagation();
        return;
    }
    window.disarmQuizLeaveGuard();
}

window.armQuizLeaveGuard = function(options = {}) {
    const g = window.__quizLeaveGuard;
    g.isActive = typeof options.isActive === 'function' ? options.isActive : null;
    g.onLeave = typeof options.onLeave === 'function' ? options.onLeave : null;
    if (g.armed) return;
    g.armed = true;
    document.addEventListener('click', __onQuizLeaveLobbyClick, true);
    try {
        history.pushState({ kidsQuizGuard: 1 }, '');
    } catch (_) {}
};

window.disarmQuizLeaveGuard = function() {
    const g = window.__quizLeaveGuard;
    if (!g) return;
    if (g.armed) {
        document.removeEventListener('click', __onQuizLeaveLobbyClick, true);
    }
    g.armed = false;
    g.checking = false;
    g.isActive = null;
    g.onLeave = null;
};

window.addEventListener('popstate', () => {
    const g = window.__quizLeaveGuard;
    if (!g || !g.armed || g.checking) return;

    // 퀴즈 진행 중이면 확인 후 이탈, 학년/단원 선택 화면이면 확인 없이 오버레이만 닫기
    if (window.isQuizLeaveGuardActive()) {
        g.checking = true;
        const ok = window.confirm(window.LEAVE_SESSION_MSG);
        if (ok) {
            const leaveFn = g.onLeave;
            window.disarmQuizLeaveGuard();
            if (typeof leaveFn === 'function') leaveFn();
        } else {
            try {
                history.pushState({ kidsQuizGuard: 1 }, '');
            } catch (_) {}
        }
        g.checking = false;
        return;
    }

    const leaveFn = g.onLeave;
    window.disarmQuizLeaveGuard();
    if (typeof leaveFn === 'function') leaveFn();
});

window.addEventListener('beforeunload', (e) => {
    if (!window.isQuizLeaveGuardActive()) return;
    e.preventDefault();
    e.returnValue = '';
});

// ========================================================
// 📖 [체류형 어휘 탐구 보상] 용어 카드 20초 정독 시 용어 경험치 지급
// ========================================================
window.grantVocaDwellReward = async function (word, subject) {
    const subj = subject || window.currentSubject || '사회';
    const userName = (typeof getActiveChildName === 'function' ? getActiveChildName() : null)
        || (localStorage.getItem('currentUser') === 'daughter' || localStorage.getItem('currentUserName') === '민서' ? '민서' : '민수');

    const todayStr = new Date().toLocaleDateString();
    const dwellKey = `voca_dwell_count_${userName}_${subj}_${todayStr}`;
    let dwellCount = parseInt(localStorage.getItem(dwellKey) || '0', 10);

    // 하루 과목당 5회 한도 (남용 방지)
    if (dwellCount >= 5) {
        console.log(`[어휘 정독] 오늘 [${subj}] 용어 정독 보상(최대 5회)을 모두 달성했습니다.`);
        return false;
    }

    dwellCount++;
    localStorage.setItem(dwellKey, String(dwellCount));
    console.log(`💡 [어휘 정독 탐구 완료] ${word || '용어'} (${subj}) ➔ 용어 경험치 +3 & 보상 +1💎/🍬 지급 (오늘 ${dwellCount}/5회)`);

    // 용어방 쌍끌이 보상 모드('voca')로 지급
    if (typeof grantRewardAndShowUI === 'function') {
        return await grantRewardAndShowUI(1, true, 'voca');
    }
    return false;
};

