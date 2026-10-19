/**
 * ============================================================================
 * 🔬 민민이네 과학실험실 - 3단원 [열과 우리 생활] 가상 실험실 공통 엔진
 * 파일: kids/js/science_u3_engine.js
 * 기능: Retina DPI 스케일러, 애니메이션 루프/메모리 가드, 보석 트랜잭션, 효과음
 * ============================================================================
 */

(function(window) {
    'use strict';

    // 전역 오디오 컨텍스트 (필요 시 Lazy 생성)
    let audioCtx = null;
    function getAudioContext() {
        if (!audioCtx && (window.AudioContext || window.webkitAudioContext)) {
            const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
            audioCtx = new AudioCtxClass();
        }
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        return audioCtx;
    }

    // =========================================================================
    // 1. Retina DPI 캔버스 스케일러
    // =========================================================================
    function setupCanvasDPI(canvas) {
        if (!canvas) return null;
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        
        // CSS 크기가 지정되어 있지 않거나 숨김 탭(display:none)인 경우 부모 뷰포트 탐색
        let displayWidth = rect.width;
        let displayHeight = rect.height;
        if (!displayWidth || displayWidth === 0) {
            const parent = canvas.closest('.sim-viewport') || canvas.parentElement;
            if (parent) {
                const pRect = parent.getBoundingClientRect();
                displayWidth = pRect.width > 0 ? pRect.width : (canvas.clientWidth || 640);
                displayHeight = pRect.height > 0 ? pRect.height : (canvas.clientHeight || 400);
            } else {
                displayWidth = canvas.clientWidth || 640;
                displayHeight = canvas.clientHeight || 400;
            }
        }

        canvas.width = Math.round(displayWidth * dpr);
        canvas.height = Math.round(displayHeight * dpr);

        const ctx = canvas.getContext('2d');
        ctx.resetTransform && ctx.resetTransform();
        ctx.scale(dpr, dpr);

        return {
            ctx,
            width: displayWidth,
            height: displayHeight,
            dpr
        };
    }

    // =========================================================================
    // 2. 애니메이션 루프 & 메모리 가드 (rAF 제어)
    // =========================================================================
    const activeLoops = new Set();

    function createLoop(renderFn) {
        let animId = null;
        let isRunning = false;

        const loop = {
            start: function() {
                if (isRunning) return;
                isRunning = true;
                activeLoops.add(loop);

                const frame = (timestamp) => {
                    if (!isRunning) return;
                    renderFn(timestamp);
                    animId = requestAnimationFrame(frame);
                };
                animId = requestAnimationFrame(frame);
            },
            stop: function() {
                if (!isRunning) return;
                isRunning = false;
                activeLoops.delete(loop);
                if (animId) {
                    cancelAnimationFrame(animId);
                    animId = null;
                }
            },
            isRunning: function() {
                return isRunning;
            }
        };

        return loop;
    }

    // 화면이 백그라운드로 전환될 때 자동 절전 (모바일 발열 방지)
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            activeLoops.forEach(l => l.stop());
        }
    });

    // =========================================================================
    // 3. 서브 탭 전환 컨트롤러 (모드 스위치)
    // =========================================================================
    function initTabs(tabsSelector, panesSelector, onTabChange) {
        const tabBtns = document.querySelectorAll(tabsSelector);
        const panes = document.querySelectorAll(panesSelector);

        tabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const targetTab = btn.getAttribute('data-tab');
                if (!targetTab) return;

                // 탭 버튼 활성화 변경
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // 탭 본문 활성화 변경
                panes.forEach(pane => {
                    if (pane.id === targetTab || pane.getAttribute('data-tab') === targetTab) {
                        pane.classList.add('active');
                    } else {
                        pane.classList.remove('active');
                    }
                });

                if (typeof onTabChange === 'function') {
                    onTabChange(targetTab);
                }
            });
        });
    }

    // =========================================================================
    // 4. 유튜브 3컷 만화 요약 아코디언 토글
    // =========================================================================
    function initSummaryAccordion(btnSelector, contentSelector) {
        const btn = document.querySelector(btnSelector);
        const content = document.querySelector(contentSelector);
        if (!btn || !content) return;

        btn.addEventListener('click', () => {
            const isOpen = content.classList.toggle('open');
            const arrow = btn.querySelector('.summary-arrow');
            if (arrow) {
                arrow.textContent = isOpen ? '▲ 닫기' : '▼ 펼치기';
            }
        });
    }

    // =========================================================================
    // 5. 보석 리워드 트랜잭션 & 클리어 관리 (1회 한정 수령 가드)
    // =========================================================================
    function getLabStorageKey(labId) {
        if (!labId) return 'minmin_sci_lab_cleared';
        if (labId.startsWith('minmin_sci_')) return labId;
        if (labId.startsWith('u4_') || labId.startsWith('u4-') || labId.includes('_u4_')) {
            return `minmin_sci_${labId}_cleared`;
        }
        return `minmin_sci_u3_${labId}_cleared`;
    }

    function isLabCleared(labId) {
        return localStorage.getItem(getLabStorageKey(labId)) === 'true';
    }

    function getCurrentGems() {
        const stored = localStorage.getItem('min_science_gems') || localStorage.getItem('minmin_gems') || '0';
        return parseInt(stored, 10) || 0;
    }

    function updateGemDisplay(newCount) {
        const el = document.getElementById('gemCount');
        if (el) el.textContent = newCount;
    }

    function grantLabReward(labId, amount, callback) {
        const key = getLabStorageKey(labId);
        const alreadyCleared = localStorage.getItem(key) === 'true';
        let currentGems = getCurrentGems();

        if (!alreadyCleared) {
            localStorage.setItem(key, 'true');
            currentGems += (amount || 5);
            localStorage.setItem('min_science_gems', currentGems);
            localStorage.setItem('minmin_gems', currentGems);
            updateGemDisplay(currentGems);

            // 성공 효과음 화음
            playSuccessFanfare();

            if (typeof callback === 'function') {
                callback({ firstClear: true, gems: currentGems, reward: amount || 5 });
            }
        } else {
            if (typeof callback === 'function') {
                callback({ firstClear: false, gems: currentGems, reward: 0 });
            }
        }
    }

    // =========================================================================
    // 6. Web Audio 신시사이저 효과음
    // =========================================================================
    function playTone(freq, type = 'sine', duration = 0.15, gainVal = 0.2) {
        try {
            const ctx = getAudioContext();
            if (!ctx) return;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = type;
            osc.frequency.setValueAtTime(freq, ctx.currentTime);

            gain.gain.setValueAtTime(gainVal, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start();
            osc.stop(ctx.currentTime + duration);
        } catch (e) {
            console.warn('[Audio] 효과음 재생 생략:', e);
        }
    }

    function playSuccessFanfare() {
        // 도 - 미 - 솔 - 높은 도 팡파르
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
            setTimeout(() => {
                playTone(freq, 'sine', 0.22, 0.25);
            }, idx * 110);
        });
    }

    function playCorrectChime() {
        playTone(587.33, 'triangle', 0.15, 0.25); // 레
        setTimeout(() => playTone(880.00, 'triangle', 0.25, 0.25), 120); // 라
    }

    function playWrongBuzzer() {
        playTone(220, 'sawtooth', 0.25, 0.2);
    }

    function playClickSound() {
        playTone(800, 'sine', 0.05, 0.1);
    }

    // =========================================================================
    // 7. 퀴즈 엔진 헬퍼 (공통 슬롯 바인딩 및 피드백)
    // =========================================================================
    // 보기 버튼을 무작위로 섞고 ①~④ 번호를 화면 순서대로 다시 매김 (정답 판정은 data-ans로 유지)
    function shuffleChoices(btnList) {
        const btns = Array.from(btnList);
        for (let i = btns.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [btns[i], btns[j]] = [btns[j], btns[i]];
        }
        const marks = ['①', '②', '③', '④', '⑤', '⑥'];
        btns.forEach((btn, idx) => {
            if (btn.parentNode) btn.parentNode.appendChild(btn);
            const numSpan = btn.querySelector('span');
            if (numSpan) numSpan.textContent = marks[idx] || `${idx + 1}`;
        });
        return btns;
    }

    function getChoiceText(btn) {
        if (!btn) return '';
        const spans = btn.querySelectorAll('span');
        return (spans.length > 1 ? spans[spans.length - 1] : btn).textContent.trim();
    }

    function setupQuiz(config) {
        const { labId, slotId, feedbackId, answer, explanation, gemAmount = 5 } = config;
        const slotEl = document.getElementById(slotId);
        const fbEl = document.getElementById(feedbackId);
        const choiceBtns = shuffleChoices(document.querySelectorAll('.quiz-choice-btn'));
        const answerText = getChoiceText(choiceBtns.find(b => b.getAttribute('data-ans') === answer)) || answer;

        // 이미 완료된 실험실인 경우 사전 표시
        if (isLabCleared(labId) && slotEl) {
            slotEl.textContent = answerText;
            slotEl.style.color = '#34d399';
            if (fbEl) {
                fbEl.className = 'quiz-feedback-box correct show';
                fbEl.innerHTML = `🎉 <b>이미 클리어한 실험실입니다!</b><br>${explanation}`;
            }
        }

        choiceBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const selected = btn.getAttribute('data-ans');
                if (selected === answer) {
                    // 정답 처리
                    if (slotEl) {
                        slotEl.textContent = `${answerText} ✅`;
                        slotEl.style.color = '#34d399';
                        slotEl.style.borderBottomColor = '#10b981';
                    }

                    choiceBtns.forEach(b => {
                        b.disabled = true;
                        if (b.getAttribute('data-ans') === answer) {
                            b.classList.add('correct');
                        }
                    });

                    playCorrectChime();

                    grantLabReward(labId, gemAmount, (res) => {
                        if (fbEl) {
                            fbEl.className = 'quiz-feedback-box correct show';
                            const rewardMsg = res.firstClear 
                                ? `🎉 <b>딩동댕! 정답입니다!</b> (+${res.reward}💎 획득!)` 
                                : `🎉 <b>정답입니다!</b> (이미 보석을 획득했습니다)`;
                            fbEl.innerHTML = `${rewardMsg}<br>${explanation}`;
                        }
                    });
                } else {
                    // 오답 처리
                    playWrongBuzzer();
                    btn.classList.add('wrong');
                    setTimeout(() => btn.classList.remove('wrong'), 600);

                    if (fbEl) {
                        fbEl.className = 'quiz-feedback-box wrong show';
                        fbEl.innerHTML = `💡 <b>다시 한번 생각해 볼까요?</b> 실험 화면의 변화를 자세히 관찰해보세요!`;
                    }
                }
            });
        });
    }

    // =========================================================================
    // 🌟 네임스페이스 노출
    // =========================================================================
    const engineExport = {
        setupCanvasDPI,
        setupHiDPICanvas: setupCanvasDPI,
        createLoop,
        initTabs,
        initSummaryAccordion,
        getLabStorageKey,
        isLabCleared,
        grantLabReward,
        getCurrentGems,
        updateGemDisplay,
        playTone,
        playSuccessFanfare,
        playCorrectChime,
        playWrongBuzzer,
        playClickSound,
        setupQuiz
    };

    window.ScienceU3Engine = engineExport;
    window.ScienceLabEngine = engineExport;

    // 초기 보석 카운트 동기화
    document.addEventListener('DOMContentLoaded', () => {
        updateGemDisplay(getCurrentGems());
    });

})(window);
