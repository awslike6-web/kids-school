// ==========================================
// 🎁 민민이네 공부방 미션 보상 및 모달 UI 엔진 (mission-reward-engine.js)
// ==========================================

// ========================================================
// 🎁 미션 보상 자동 지급 (SUCCESS 즉시 + 중복 방지 락)
// ========================================================

window.__missionRewardLocks = window.__missionRewardLocks || {};
window.__pendingMissionReward = null;

function buildMissionRewardKey(missionType, passageId) {
    const user = typeof getActiveChildName === 'function'
        ? getActiveChildName()
        : (localStorage.getItem('currentUserName') || '민수');
    return `${user}_${missionType}_${passageId || 'default'}`;
}

function formatReadingStudyLogReport(passageId, passageTitle) {
    const id = String(passageId || '미상').trim();
    const title = String(passageTitle || '제목 없음').trim();
    const targetNotes = window.engWrongNotes || window.wrongNotes || [];
    const wrongPart = targetNotes.length > 0
        ? targetNotes.map(q => {
            if (q.wrongInput) return `${q.word || q.text} (오답: ${q.wrongInput})`;
            return q.word || q.text || q;
        }).join(' / ')
        : '오답 없음';
    return `${id} · ${title} | ${wrongPart}`;
}

function getReadingClearSubject(missionType) {
    if (missionType === 'stage5') return '영어(독해)';
    const base = window.currentSubject || '국어';
    return `${base}(독해)`;
}

async function claimMissionRewardOnce(rewardKey, options = {}) {
    const {
        amount = 5,
        missionType = '',
        subject = null,
        silent = true,
        customExpType = null,
        skipStudyLog = false,
        errorReport = null
    } = options;

    if (window.__missionRewardLocks[rewardKey] === 'done') {
        return true;
    }
    if (window.__missionRewardLocks[rewardKey] === 'processing') {
        return window.__pendingMissionRewardPromise || true;
    }

    window.__missionRewardLocks[rewardKey] = 'processing';
    const subj = subject || window.currentSubject || '국어';
    const expType = customExpType !== null
        ? customExpType
        : (subj === '영어' ? '영어' : subj === '국어' ? '국어' : null);

    const task = (async () => {
        try {
            if (typeof grantRewardAndShowUI === 'function') {
                await grantRewardAndShowUI(amount, silent, expType);
            } else if (typeof window.triggerAwardDispense === 'function') {
                await window.triggerAwardDispense(amount, missionType);
            }
            if (!skipStudyLog && typeof sendStudyLogToNotion === 'function') {
                await sendStudyLogToNotion({
                    subject: subj,
                    errorReport: errorReport !== null ? errorReport : undefined
                });
            }
            window.__missionRewardLocks[rewardKey] = 'done';
            console.log(`🎁 [보상 자동 지급 완료] ${rewardKey} / ${amount}개`);
            return true;
        } catch (err) {
            console.error('🎁 [보상 자동 지급 실패]', err);
            delete window.__missionRewardLocks[rewardKey];
            return false;
        }
    })();

    window.__pendingMissionRewardPromise = task;
    return task;
}

function dispatchReadingStageReward(missionType, passageId, stageNumber) {
    const rewardKey = `${buildMissionRewardKey(missionType, passageId)}_stage${stageNumber}`;
    return claimMissionRewardOnce(rewardKey, {
        amount: 5,
        missionType,
        subject: window.currentSubject,
        silent: true,
        skipStudyLog: true
    });
}

function dispatchReadingClearBonus(missionType, passageId, passageTitle) {
    const rewardKey = `${buildMissionRewardKey(missionType, passageId)}_clear`;
    const subject = getReadingClearSubject(missionType);
    const errorReport = formatReadingStudyLogReport(passageId, passageTitle);
    window.__pendingMissionReward = {
        rewardKey,
        amount: 15,
        missionType,
        subject,
        errorReport
    };
    return claimMissionRewardOnce(rewardKey, {
        amount: 15,
        missionType,
        subject,
        errorReport,
        silent: true,
        skipStudyLog: false
    });
}

window.__quizRewardSession = null;

function initQuizRewardSession(missionType) {
    window.__quizRewardSession = {
        missionType: missionType || window.currentMissionType || 'quiz',
        sessionId: String(Date.now()),
        solvedCount: 0,
        correctCount: 0,
        awardedCount: 0,
        isLogged: false,
        startTime: new Date().toISOString()
    };
}

async function rewardQuizCorrect(quizIndex, options = {}) {
    if (!window.__quizRewardSession) {
        initQuizRewardSession(window.currentMissionType);
    }
    const session = window.__quizRewardSession;
    session.solvedCount = (session.solvedCount || 0) + 1;
    session.correctCount = (session.correctCount || 0) + 1;

    // 💡 [신규 보상 밸런스 공식] 2문제 맞출 때마다 1개씩 즉시 실시간 지급
    const shouldAward = (session.correctCount % 2 === 0) || options.forceAward;
    if (shouldAward) {
        const pairIdx = Math.floor(session.correctCount / 2);
        const rewardKey = `${buildMissionRewardKey(session.missionType, session.sessionId)}_pair${pairIdx}`;
        session.awardedCount = (session.awardedCount || 0) + 1;
        const result = await claimMissionRewardOnce(rewardKey, {
            amount: 1,
            missionType: session.missionType,
            subject: window.currentSubject,
            silent: false,
            skipStudyLog: true
        });
        return result;
    }
    return true;
}

async function finalizeQuizRewardSession(options = {}) {
    const session = window.__quizRewardSession;
    if (!session) {
        return false;
    }

    const opts = typeof options === 'boolean' ? { isFullComplete: options } : (options || {});
    const isFullComplete = opts.isFullComplete || false;
    const subj = opts.subject || window.currentSubject || '국어';

    // 1. 🏆 10문제 전량 완수 시 완주 보너스 대량 지급 (+5💎/🍬 & 과목 경험치)
    if (isFullComplete) {
        const bonusKey = `${buildMissionRewardKey(session.missionType, session.sessionId)}_complete_bonus`;
        try {
            await claimMissionRewardOnce(bonusKey, {
                amount: 5,
                missionType: session.missionType,
                subject: subj,
                silent: false,
                skipStudyLog: true
            });
            console.log(`🏆 [10문제 완주 보너스 지급 완료] +5개 획득! (${subj})`);
        } catch (e) {
            console.warn("완주 보너스 지급 중 오류:", e);
        }
    }

    // 2. 📝 노션 학습일지 안전 전송 (1세션 1회 전송 원칙, 중복 방지)
    if (!session.isLogged && (session.solvedCount > 0 || session.correctCount > 0)) {
        session.isLogged = true;
        if (typeof sendStudyLogToNotion === 'function') {
            try {
                await sendStudyLogToNotion({
                    subject: subj,
                    childName: opts.childName,
                    errorReport: opts.errorReport,
                    startTime: session.startTime,
                    endTime: new Date().toISOString()
                });
                console.log(`📝 [퀴즈 세션 일지 기록 완료] ${session.solvedCount}문제 풀이 반영 (${subj})`);
            } catch (e) {
                console.error("퀴즈 세션 일지 전송 오류:", e);
            }
        }
    }

    window.__quizRewardSession = null;
    return true;
}

// 🛡️ 브라우저 이탈(탭 닫기, 새로고침, 뒤로가기) 시 미기록 세션 안전 자동 플러시
if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', () => {
        const session = window.__quizRewardSession;
        if (session && !session.isLogged && (session.solvedCount > 0 || session.correctCount > 0)) {
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

