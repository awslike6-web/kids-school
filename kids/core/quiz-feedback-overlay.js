// ==========================================
// 💥 퀴즈 오답 피드백 & 이탈 방지 가드 엔진 (quiz-feedback-overlay.js)
// ==========================================

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
// 💥 퀴즈 오답 — 다시 풀기 / 다음 문제로 (전 과목 공통)
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

    if (typeof fairyEncourage === 'function') {
        fairyEncourage();
    } else if (typeof speakFairyTTS === 'function') {
        speakFairyTTS(options.message || '아쉽지만 틀렸어요!');
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

