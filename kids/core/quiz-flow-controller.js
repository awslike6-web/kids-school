/**
 * ========================================================
 * ⏱️ [공통 퀴즈 템포 & 해설 컨트롤러] quiz-flow-controller.js
 * ========================================================
 * 아이들의 인지 특성(민수: 확인 및 되돌아보기, 민서: 스피드 연산/받아쓰기)에 맞춰
 * 1) ⚡ 스피드 모드 (1.2초 후 자동 넘김)
 * 2) 🔍 꼼꼼 탐구 모드 (정답/풀이 확인 후 [다음 문제 ➡️] 직접 클릭)
 * 를 진입 전, 퀴즈 도중, 개별 문제 단위에서 실시간 전환할 수 있는 공통 모듈.
 */

(function () {
    const STORAGE_PREFIX = 'kids_quiz_flow_mode_';

    // 과목별 기본 권장 모드 ('speed' | 'review')
    const DEFAULT_FLOW_MODES = {
        '국어': 'speed',
        '영어': 'speed',
        '수학': 'review',
        '사회': 'review',
        '과학': 'review'
    };

    let activeAdvanceTimer = null;
    let currentAdvanceCallback = null;

    /**
     * 현재 과목의 템포 모드 조회
     */
    function getQuizFlowMode(subject) {
        const subj = subject || window.currentSubject || '기본';
        const saved = localStorage.getItem(STORAGE_PREFIX + subj);
        if (saved === 'speed' || saved === 'review') return saved;
        return DEFAULT_FLOW_MODES[subj] || 'review';
    }

    /**
     * 현재 과목의 템포 모드 설정
     */
    function setQuizFlowMode(subject, mode) {
        const subj = subject || window.currentSubject || '기본';
        if (mode === 'speed' || mode === 'review') {
            localStorage.setItem(STORAGE_PREFIX + subj, mode);
            updateAllToggleButtons(subj, mode);
            console.log(`⏱️ [학습 템포 모드 변경] ${subj} ➔ ${mode === 'speed' ? '⚡ 자동 넘김' : '🔍 꼼꼼 확인'}`);
        }
    }

    /**
     * 자동 넘김 타이머 즉시 취소
     */
    function cancelQuizAdvanceTimer() {
        if (activeAdvanceTimer) {
            clearTimeout(activeAdvanceTimer);
            activeAdvanceTimer = null;
        }
    }

    /**
     * 정답 맞춘 후 문제 넘김을 제어하는 만능 디스패처
     * @param {Object} options
     * @param {Function} options.onAdvance - 다음 문제로 전진하는 실제 콜백
     * @param {number} [options.delayMs=1300] - 스피드 모드 시 지연 시간
     * @param {string} [options.subject] - 과목명
     * @param {string} [options.explanation] - 정답/풀이 해설 텍스트
     * @param {HTMLElement} [options.container] - 해설 및 다음 버튼을 마운트할 컨테이너 (기본: overlayInnerBody)
     */
    function triggerQuizAdvance(options = {}) {
        cancelQuizAdvanceTimer();
        const onAdvance = options.onAdvance || (() => {});
        currentAdvanceCallback = onAdvance;

        const subj = options.subject || window.currentSubject || '기본';
        const mode = getQuizFlowMode(subj);
        const delayMs = options.delayMs || 1300;
        const container = options.container || document.getElementById('overlayInnerBody');

        if (mode === 'speed') {
            // ⚡ 스피드 모드: 자동 넘김 타이머 작동
            // 사용자에게 타이머 일시정지 버튼을 작게 띄워줌
            renderSpeedTimerBadge(container, () => {
                cancelQuizAdvanceTimer();
                // 멈춤을 누르면 즉시 수동 넘김 UI로 전환
                renderReviewAdvanceUI(container, options);
            });

            activeAdvanceTimer = setTimeout(() => {
                activeAdvanceTimer = null;
                removeSpeedTimerBadge();
                onAdvance();
            }, delayMs);
        } else {
            // 🔍 꼼꼼 탐구 모드: 자동으로 안 넘어가고 해설 및 [다음 문제 ➡️] 버튼 노출
            renderReviewAdvanceUI(container, options);
        }
    }

    /**
     * 꼼꼼 탐구 모드 전용: 해설 카드 및 [다음 문제로 전진! ➡️] 버튼 렌더링
     */
    function renderReviewAdvanceUI(container, options = {}) {
        removeSpeedTimerBadge();
        if (!container) return;

        // 기존에 붙어있는 advance-bar가 있으면 제거
        const existing = container.querySelector('.quiz-flow-advance-bar');
        if (existing) existing.remove();

        const bar = document.createElement('div');
        bar.className = 'quiz-flow-advance-bar animate-fade-in';
        bar.innerHTML = `
            ${options.explanation ? `
                <div class="quiz-flow-explanation-card">
                    <div style="display:flex; align-items:center; gap:6px; font-weight:bold; color:#0284c7; margin-bottom:4px;">
                        <span>💡 [풀이 & 핵심 원리]</span>
                    </div>
                    <p style="margin:0; font-size:1.05rem; line-height:1.5; color:#334155;">${options.explanation}</p>
                </div>
            ` : ''}
            <div style="display:flex; justify-content:center; gap:12px; margin-top:14px;">
                <button class="quiz-flow-next-btn" id="quizFlowNextBtn">
                    다음 문제로 전진! 🚀 ➡️
                </button>
            </div>
        `;

        container.appendChild(bar);

        const btn = document.getElementById('quizFlowNextBtn');
        if (btn) {
            btn.focus();
            btn.onclick = () => {
                bar.remove();
                if (typeof options.onAdvance === 'function') {
                    options.onAdvance();
                }
            };
        }
    }

    /**
     * 스피드 모드 시 상단에 뜨는 일시정지 뱃지
     */
    function renderSpeedTimerBadge(container, onPause) {
        removeSpeedTimerBadge();
        const badge = document.createElement('div');
        badge.id = 'quizFlowTimerBadge';
        badge.className = 'quiz-flow-timer-badge';
        badge.innerHTML = `
            <span>⚡ 1초 후 자동 이동</span>
            <button class="quiz-flow-pause-chip" title="멈추고 풀이 확인하기">⏸️ 멈추기</button>
        `;
        document.body.appendChild(badge);

        const chip = badge.querySelector('.quiz-flow-pause-chip');
        if (chip) {
            chip.onclick = (e) => {
                e.stopPropagation();
                if (typeof onPause === 'function') onPause();
            };
        }
    }

    function removeSpeedTimerBadge() {
        const badge = document.getElementById('quizFlowTimerBadge');
        if (badge) badge.remove();
    }

    /**
     * 템포 토글 스위치 UI 렌더링 (각 과목방 헤더/액션바에 삽입 가능)
     */
    function renderQuizFlowToggleUI(containerId, subject) {
        const target = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
        if (!target) return;

        const subj = subject || window.currentSubject || '기본';
        const currentMode = getQuizFlowMode(subj);

        const wrapper = document.createElement('div');
        wrapper.className = 'quiz-flow-toggle-wrapper';
        wrapper.dataset.flowSubject = subj;
        wrapper.innerHTML = createToggleHtml(subj, currentMode);

        target.appendChild(wrapper);
        bindToggleEvents(wrapper, subj);
    }

    function createToggleHtml(subj, mode) {
        const isSpeed = mode === 'speed';
        return `
            <div class="quiz-flow-pill ${isSpeed ? 'is-speed' : 'is-review'}">
                <button type="button" class="quiz-flow-opt ${isSpeed ? 'active' : ''}" data-mode="speed" title="정답 맞추면 1.2초 뒤 다음 문제로 슝!">
                    ⚡ 빠른 진행
                </button>
                <button type="button" class="quiz-flow-opt ${!isSpeed ? 'active' : ''}" data-mode="review" title="정답 후 풀이 보고 [다음 문제] 직접 클릭!">
                    🔍 꼼꼼 탐구
                </button>
            </div>
        `;
    }

    function bindToggleEvents(wrapper, subj) {
        const buttons = wrapper.querySelectorAll('.quiz-flow-opt');
        buttons.forEach(btn => {
            btn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                const newMode = btn.dataset.mode;
                setQuizFlowMode(subj, newMode);
            };
        });
    }

    function updateAllToggleButtons(subj, mode) {
        const wrappers = document.querySelectorAll(`.quiz-flow-toggle-wrapper[data-flow-subject="${subj}"]`);
        wrappers.forEach(w => {
            w.innerHTML = createToggleHtml(subj, mode);
            bindToggleEvents(w, subj);
        });
    }

    // CSS 스타일 자동 주입 (Self-contained)
    function injectStyles() {
        if (document.getElementById('quiz-flow-controller-style')) return;
        const style = document.createElement('style');
        style.id = 'quiz-flow-controller-style';
        style.textContent = `
            .quiz-flow-toggle-wrapper {
                display: inline-flex;
                align-items: center;
                user-select: none;
                font-family: 'Jua', sans-serif;
            }
            .quiz-flow-pill {
                display: inline-flex;
                background: #f1f5f9;
                padding: 3px;
                border-radius: 20px;
                border: 1.5px solid #cbd5e1;
                box-shadow: inset 0 1px 3px rgba(0,0,0,0.06);
            }
            .quiz-flow-opt {
                border: none;
                background: transparent;
                padding: 5px 12px;
                font-size: 0.88rem;
                font-family: 'Jua', sans-serif;
                border-radius: 16px;
                cursor: pointer;
                color: #64748b;
                transition: all 0.2s ease;
            }
            .quiz-flow-opt.active {
                background: #ffffff;
                color: #0284c7;
                font-weight: bold;
                box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            }
            .quiz-flow-pill.is-speed .quiz-flow-opt.active {
                background: #38bdf8;
                color: #ffffff;
            }
            .quiz-flow-pill.is-review .quiz-flow-opt.active {
                background: #10b981;
                color: #ffffff;
            }
            .quiz-flow-timer-badge {
                position: fixed;
                top: 18px;
                right: 20px;
                z-index: 99999;
                background: rgba(15, 23, 42, 0.88);
                backdrop-filter: blur(4px);
                color: #ffffff;
                padding: 6px 14px;
                border-radius: 20px;
                display: flex;
                align-items: center;
                gap: 10px;
                font-family: 'Jua', sans-serif;
                font-size: 0.95rem;
                box-shadow: 0 4px 12px rgba(0,0,0,0.25);
                animation: slideDownFlow 0.25s ease-out;
            }
            .quiz-flow-pause-chip {
                background: #f59e0b;
                color: #ffffff;
                border: none;
                border-radius: 12px;
                padding: 3px 8px;
                font-size: 0.82rem;
                cursor: pointer;
                font-family: 'Jua', sans-serif;
                font-weight: bold;
            }
            .quiz-flow-pause-chip:hover {
                background: #d97706;
            }
            .quiz-flow-advance-bar {
                margin-top: 18px;
                padding: 14px 18px;
                background: #f8fafc;
                border: 2px dashed #38bdf8;
                border-radius: 16px;
                box-shadow: 0 4px 12px rgba(56, 189, 248, 0.12);
            }
            .quiz-flow-explanation-card {
                background: #ffffff;
                border-radius: 12px;
                padding: 12px 14px;
                border-left: 4px solid #0284c7;
                margin-bottom: 10px;
                text-align: left;
            }
            .quiz-flow-next-btn {
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                color: #ffffff;
                border: none;
                border-radius: 14px;
                padding: 14px 32px;
                font-size: 1.25rem;
                font-family: 'Jua', sans-serif;
                cursor: pointer;
                box-shadow: 0 4px 12px rgba(16, 185, 129, 0.35);
                transition: transform 0.15s ease, box-shadow 0.15s ease;
            }
            .quiz-flow-next-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 16px rgba(16, 185, 129, 0.45);
            }
            @keyframes slideDownFlow {
                from { transform: translateY(-20px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
            @keyframes fadeInFlow {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            .animate-fade-in {
                animation: fadeInFlow 0.25s ease-out;
            }
        `;
        document.head.appendChild(style);
    }

    function autoMountHeaderToggle() {
        const overlayHeaders = document.querySelectorAll('.overlay-header');
        overlayHeaders.forEach(header => {
            if (header.querySelector('.quiz-flow-toggle-wrapper')) return;
            const subj = window.currentSubject || (typeof detectSubjectFromContext === 'function' ? detectSubjectFromContext() : '국어');
            const wrapper = document.createElement('div');
            wrapper.className = 'quiz-flow-toggle-wrapper';
            wrapper.style.marginLeft = 'auto';
            wrapper.style.marginRight = '35px'; // 닫기(✖) 버튼과의 간격 확보
            wrapper.dataset.flowSubject = subj;
            wrapper.innerHTML = createToggleHtml(subj, getQuizFlowMode(subj));
            header.appendChild(wrapper);
            bindToggleEvents(wrapper, subj);
        });
    }

    // 전역 노출
    window.getQuizFlowMode = getQuizFlowMode;
    window.setQuizFlowMode = setQuizFlowMode;
    window.triggerQuizAdvance = triggerQuizAdvance;
    window.cancelQuizAdvanceTimer = cancelQuizAdvanceTimer;
    window.renderQuizFlowToggleUI = renderQuizFlowToggleUI;
    window.autoMountHeaderToggle = autoMountHeaderToggle;

    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                injectStyles();
                autoMountHeaderToggle();
            });
        } else {
            injectStyles();
            autoMountHeaderToggle();
        }

        // 모달 열림 감지 (MutationObserver)
        const observer = new MutationObserver(() => {
            autoMountHeaderToggle();
        });
        document.addEventListener('DOMContentLoaded', () => {
            const overlay = document.getElementById('missionOverlay');
            if (overlay) {
                observer.observe(overlay, { attributes: true, attributeFilter: ['style', 'class'] });
            }
        });
    }
})();
