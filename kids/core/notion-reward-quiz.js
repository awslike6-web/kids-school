// kids/core/notion-reward-quiz.js - notion-reward.js 분리 2/3: 음성 입력·접속사 채점·미션·퀴즈 보상 (순서대로 로드)
function setupDebouncedSTT(options = {}) {
    const {
        inputEl,
        onSend,
        debounceMs = 2500,
        lang = 'ko-KR',
        onStart,
        onEnd,
        onError
    } = options;

    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
        alert("현재 브라우저에서는 마이크 기능이 지원되지 않아요. (크롬 브라우저를 사용해주세요!)");
        return null;
    }

    // 💡 이미 듣고 있는 상태에서 마이크 버튼을 다시 누르면 즉시 마무리 및 전송 (토글 기능)
    if (window.__sttSession && window.__sttSession.isListening) {
        console.log('[STT] 마이크 재클릭으로 즉시 마무리 및 전송');
        if (typeof window.__sttSession.flushAndSend === 'function') {
            window.__sttSession.flushAndSend();
        }
        return null;
    }

    // 기존 세션 정리 (이전 인스턴스의 이벤트 핸들러를 먼저 제거하여 aborted 전파 차단)
    if (window.__sttSession?.recognition) {
        const oldRec = window.__sttSession.recognition;
        oldRec.onstart = null;
        oldRec.onend = null;
        oldRec.onerror = null;
        oldRec.onresult = null;
        try { oldRec.abort(); } catch (e) { /* noop */ }
        clearTimeout(window.__sttSession.debounceTimer);
    }

    // 마이크 시작 전 TTS 즉시 중지 (마이크 하울링/간섭 방지)
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }

    // 🎤 데스크톱 크롬/웨일 마이크 하드웨어 스트림 깨우기 및 연결 장치 확인
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
            window.__micStreamWoken = true;
            const track = stream.getAudioTracks()[0];
            const micLabel = track?.label || '기본 마이크';
            window.__activeMicDeviceLabel = micLabel;
            
            const isVirtual = /droidcam|virtual|stereo mix|스테레오 믹스/i.test(micLabel);
            if (isVirtual) {
                console.warn(`%c[STT 마이크 경고] ⚠️ 현재 브라우저가 가상 마이크("${micLabel}")를 바라보고 있습니다! 실제 마이크(Realtek 등)로 소리를 전달하려면 브라우저 주소창 좌측 🔒 자물쇠 > 마이크 설정(또는 chrome://settings/content/microphone)에서 실제 마이크로 변경해 주세요.`, 'color: #f59e0b; font-weight: bold;');
            } else {
                console.log(`%c[STT 마이크 진단] 🎤 활성 마이크 장치: "${micLabel}"`, 'color: #10b981; font-weight: bold;');
            }
            stream.getTracks().forEach(t => t.stop());
        }).catch(err => {
            console.warn('[STT 마이크 진단] getUserMedia 접근 실패 (권한 또는 장치 비활성화):', err);
        });

        if (navigator.mediaDevices.enumerateDevices) {
            navigator.mediaDevices.enumerateDevices().then(devices => {
                const mics = devices.filter(d => d.kind === 'audioinput').map(d => d.label || '이름 없음');
                if (mics.length > 0) {
                    console.log(`%c[STT 마이크 목록] 🎧 PC에 연결된 전체 마이크 (${mics.length}개):`, 'color: #6366f1; font-weight: bold;', mics);
                }
            }).catch(() => {});
        }
    }

    let accumulatedFinal = '';
    let debounceTimer = null;
    let hasSent = false;
    let isListening = false;

    const recognition = new Recognition();
    recognition.lang = lang;
    recognition.continuous = false; // 크롬 데스크톱에서 가장 안정적인 단일 턴 모드
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    // 💡 상세 오디오 상태 진단 이벤트
    recognition.onaudiostart = function() {
        console.log('%c[STT 진단] 🎙️ 오디오 스트림 수신 시작 (브라우저가 마이크 소리를 듣고 있습니다)', 'color: #0284c7;');
    };
    recognition.onspeechstart = function() {
        console.log('%c[STT 진단] 🗣️ 사람 목소리(발화) 감지됨!', 'color: #ec4899; font-weight: bold;');
    };
    recognition.onspeechend = function() {
        console.log('%c[STT 진단] 🤫 발화 종료 감지됨', 'color: #8b5cf6;');
    };
    recognition.onaudioend = function() {
        console.log('%c[STT 진단] ⏹️ 오디오 수신 종료', 'color: #64748b;');
    };

    function finishMicUI() {
        isListening = false;
        if (window.__sttSession) window.__sttSession.isListening = false;
        if (onEnd) onEnd();
    }

    function flushAndSend() {
        clearTimeout(debounceTimer);
        if (hasSent) return;
        const text = (inputEl.value || accumulatedFinal).trim();
        if (!text) {
            finishMicUI();
            return;
        }
        hasSent = true;
        accumulatedFinal = text;
        inputEl.value = text;
        try { recognition.stop(); } catch (e) { /* noop */ }
        finishMicUI();
        onSend(text);
    }

    recognition.onstart = function() {
        hasSent = false;
        isListening = true;
        accumulatedFinal = '';
        inputEl.value = '';
        if (window.__sttSession) window.__sttSession.isListening = true;
        if (onStart) onStart();
    };

    recognition.onresult = function(event) {
        if (hasSent) return;

        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalTranscript += transcript;
            } else {
                interimTranscript += transcript;
            }
        }

        if (finalTranscript) {
            accumulatedFinal = (accumulatedFinal ? accumulatedFinal + ' ' : '') + finalTranscript.trim();
        }

        const fullText = (accumulatedFinal + (interimTranscript ? (accumulatedFinal ? ' ' : '') + interimTranscript.trim() : '')).trim();
        if (fullText) {
            inputEl.value = fullText;
        }

        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(flushAndSend, debounceMs);
    };

    recognition.onend = function() {
        clearTimeout(debounceTimer);
        if (!hasSent && (accumulatedFinal.trim() || inputEl.value.trim())) {
            flushAndSend();
        } else if (!hasSent) {
            finishMicUI();
        }
    };

    recognition.onerror = function(event) {
        clearTimeout(debounceTimer);
        const errType = String(event.error || '');
        // aborted는 사용자의 재클릭 또는 정상 리셋 동작이므로 오류로 취급하지 않음
        if (errType === 'aborted') {
            return;
        }
        console.warn('[STT 오류]', event.error);
        if (!hasSent) finishMicUI();
        if (onError) onError(event);
    };

    window.__sttSession = {
        recognition,
        debounceTimer: null,
        isListening: false,
        flushAndSend
    };

    try {
        recognition.start();
    } catch (e) {
        console.error('[STT 시작 실패]', e);
        finishMicUI();
        if (onError) onError({ error: e.message || 'start_failed' });
    }

    return recognition;
}

// ========================================================
// 🔗 접속사 채점 가드레일 (원인-결과 vs 역접 분리)
// ========================================================

const CONJUNCTION_GRADING_GUARDRAIL = `[접속사 채점 절대 규칙]
- 앞 문장이 원인, 뒤 문장이 결과(결론) 관계이면 오직 '따라서', '그러므로', '그래서', '그리하여' 계열만 정답이다.
- 앞 문장이 결과, 뒤 문장이 이유/원인 설명이면 오직 '왜냐하면 (~때문이다)'만 정답이다. '그래서'나 '따라서'와 절대 혼동하거나 호환 처리하지 마라.
- '하지만', '그러나', '그런데'는 앞뒤가 반대·대조·역접일 때만 쓴다.
- 원인-결과 문맥에서 '하지만'이나 '왜냐하면'을 정답으로 제시하거나 옹호하지 마라.`;

function inferConjunctionRelation(conj) {
    if (!conj) return 'exact';
    if (conj.relationType === 'cause-effect' || conj.relationType === 'contrast') {
        return conj.relationType;
    }
    const commentary = conj.commentary || '';
    if (/원인|결과|그래서|따라서|그러므로/.test(commentary)) return 'cause-effect';
    if (/이유|까닭|때문|왜냐하면/.test(commentary)) return 'reason';
    if (/반대|역접|대조|반면|하지만|그러나/.test(commentary)) return 'contrast';
    return 'exact';
}

function gradeConjunctionAnswer(conj, userAnswer) {
    if (!conj || !conj.answer || userAnswer == null) return false;
    // 🎯 객관식 접속사 문제는 지정된 고유 정답과 정확히 일치해야 함 (왜냐하면 vs 그래서 오답 판정 철저)
    return String(userAnswer).trim().toLowerCase() === String(conj.answer).trim().toLowerCase();
}

function getConjunctionCorrectAnswer(conj) {
    return conj?.answer || '';
}

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
    if (window.StudyActivity?.setPhase) window.StudyActivity.setPhase('quiz');
    window.__quizRewardSession = {
        missionType: missionType || window.currentMissionType || 'quiz',
        sessionId: crypto.randomUUID(),
        answeredIds: new Set(),
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
    const answerId = `${session.sessionId}:${quizIndex}`;
    if (session.answeredIds.has(answerId)) return false;
    session.answeredIds.add(answerId);
    window.StudyActivity?.recordCorrect?.(answerId);
    session.solvedCount = (session.solvedCount || 0) + 1;
    session.correctCount = (session.correctCount || 0) + 1;

    // 💡 [신규 보상 밸런스 공식]
    // 2문제 맞출 때마다 1개씩 즉시 실시간 지급 (2, 4, 6, 8, 10번째 정답 시 +1💎/🍬)
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
    if (window.StudyActivity?.setPhase) window.StudyActivity.setPhase('paused');
    const session = window.__quizRewardSession;
    if (!session) {
        return false;
    }

    const opts = typeof options === 'boolean' ? { isFullComplete: options } : (options || {});
    const isFullComplete = opts.isFullComplete || false;
    const subj = opts.subject || window.currentSubject || '국어';

    // 1. 🏆 10문제 전량 완수 시 완주 보너스 대량 지급 (기본 +5💎/🍬, 내일 예습 부스트 과목은 +7💎/🍬)
    if (isFullComplete) {
        // 🎙️ 완주 축하 음성 자동 송출 (직전 정답 음성 안전 차단 후 완주 음성 100% 보장)
        if (typeof fairyReward === 'function') {
            fairyReward('finish');
        }

        const bonusKey = `${buildMissionRewardKey(session.missionType, session.sessionId)}_complete_bonus`;
        const bonusAmount = (typeof window.TimetableBoost !== 'undefined'
            ? window.TimetableBoost.getSubjectBoostInfo(subj, opts.childName).completionBonus
            : 5) || 5;

        try {
            await claimMissionRewardOnce(bonusKey, {
                amount: bonusAmount,
                missionType: session.missionType,
                subject: subj,
                silent: false,
                skipStudyLog: true
            });
            console.log(`🏆 [10문제 완주 보너스 지급 완료] +${bonusAmount}개 획득! (${subj}${bonusAmount > 5 ? ' - ✨ 내일 예습 부스트!' : ''})`);
        } catch (e) {
            console.warn("완주 보너스 지급 중 오류:", e);
        }
    }

    // 2. 📝 노션 학습일지 안전 전송 (1세션 1회 전송 원칙, 중복 방지)
    if (!session.isLogged && (session.solvedCount > 0 || session.correctCount > 0 || window.wrongNotes?.length || window.engWrongNotes?.length)) {
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

