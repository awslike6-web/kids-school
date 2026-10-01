// ==========================================
// 🧮 민민이네 공부방 수학관 공통 퀴즈 & 인터랙션 엔진 (math_quiz_engine.js)
// ==========================================
// 수학 단원별 4지선다 퀴즈 루프, 보기 셔플, 분수 렌더러, 
// 통합 오디오(fairy-engine) 및 보상(notion-reward) 연동을 표준화합니다.

const MathQuizEngine = {
    state: {
        quizList: [],
        currentIndex: 0,
        score: 0,
        options: {
            questionId: 'quiz-question',
            choicesId: 'quiz-choices',
            feedbackId: 'quiz-feedback',
            rewardAmount: 1,
            rewardSubject: '수학',
            onComplete: null,
            choiceBtnClass: 'divide-btn'
        }
    },

    /**
     * 🎲 배열 무작위 셔플 (Fisher-Yates)
     */
    shuffleArray(arr) {
        if (!Array.isArray(arr)) return [];
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    },

    /**
     * 📐 진분수 HTML 시각화 렌더러
     */
    renderFrac(num, den) {
        return `<span class="frac" style="display:inline-flex; flex-direction:column; vertical-align:middle; text-align:center; padding:0 3px; font-size:0.9em; line-height:1.1;">` +
               `<span class="num" style="border-bottom:1.5px solid currentColor; padding-bottom:1px;">${num}</span>` +
               `<span class="den" style="padding-top:1px;">${den}</span>` +
               `</span>`;
    },

    /**
     * 🔢 대분수 HTML 시각화 렌더러
     */
    renderMixed(whole, num, den) {
        return `<span class="mixed-frac" style="display:inline-flex; align-items:center; gap:2px; font-size:1.1em;">` +
               `<span class="whole" style="font-weight:bold;">${whole}</span>` +
               this.renderFrac(num, den) +
               `</span>`;
    },

    /**
     * 🚀 수학 퀴즈 엔진 초기화
     */
    init(quizList, customOptions = {}) {
        this.state.quizList = Array.isArray(quizList) ? [...quizList] : [];
        this.state.currentIndex = 0;
        this.state.score = 0;
        this.state.options = { ...this.state.options, ...customOptions };
        this.renderCurrentQuiz();
    },

    /**
     * 🎨 현재 퀴즈 화면 렌더링
     */
    renderCurrentQuiz() {
        const { quizList, currentIndex, options } = this.state;
        if (!quizList || quizList.length === 0) return;

        const q = quizList[currentIndex % quizList.length];
        const qEl = document.getElementById(options.questionId);
        if (qEl) qEl.innerHTML = q.q;

        const cBox = document.getElementById(options.choicesId);
        if (cBox) {
            cBox.innerHTML = '';
            const shuffledChoices = this.shuffleArray(q.choices);

            shuffledChoices.forEach(choice => {
                const btn = document.createElement('button');
                btn.className = options.choiceBtnClass;
                btn.style.cursor = 'pointer';
                btn.innerHTML = typeof choice === 'object' && choice.html ? choice.html : choice;
                
                const val = typeof choice === 'object' && choice.val !== undefined ? choice.val : choice;
                btn.onclick = () => this.checkAnswer(val, q.ans, btn);
                cBox.appendChild(btn);
            });
        }

        const fb = document.getElementById(options.feedbackId);
        if (fb) fb.innerHTML = '';
    },

    /**
     * 🎯 정답 판정 및 효과음/보상 직결
     */
    checkAnswer(selected, correct, clickedBtn) {
        const { options } = this.state;
        const fb = document.getElementById(options.feedbackId);

        const isCorrect = String(selected).trim() === String(correct).trim();

        if (isCorrect) {
            this.state.score++;
            if (fb) fb.innerHTML = `<span style="color:#10b981; font-weight:bold;">🎉 정답! 참 잘했어요!</span>`;
            
            // 통합 오디오 칭찬 효과음
            if (typeof fairyPraise === 'function') {
                fairyPraise();
            } else if (typeof speakFairyTTS === 'function') {
                speakFairyTTS('정답이에요! 참 잘했어요!');
            }

            // 통합 보상 지급
            if (typeof grantRewardAndShowUI === 'function') {
                grantRewardAndShowUI(options.rewardAmount, false, options.rewardSubject);
            }
        } else {
            if (fb) fb.innerHTML = `<span style="color:#ef4444; font-weight:bold;">😅 아쉬워요! 정답은 [${correct}] 이에요.</span>`;
            
            // 통합 오디오 격려 효과음
            if (typeof fairyEncourage === 'function') {
                fairyEncourage();
            } else if (typeof speakFairyTTS === 'function') {
                speakFairyTTS(`아쉬워요! 정답은 ${correct} 입니다.`);
            }
        }
    },

    /**
     * ⏩ 다음 퀴즈 진행
     */
    next() {
        this.state.currentIndex++;
        this.renderCurrentQuiz();
    },

    /**
     * 🚪 과목 메인 로비로 나가기
     */
    exit(url = 'math.html') {
        location.href = url;
    }
};

// ==========================================
// 🧩 전역 네임스페이스 바인딩 (하위 호환성 100% 보장)
// ==========================================
window.MathQuizEngine = MathQuizEngine;
window.shuffleArray = (arr) => MathQuizEngine.shuffleArray(arr);
window.renderFrac = (num, den) => MathQuizEngine.renderFrac(num, den);
window.renderMixed = (w, n, d) => MathQuizEngine.renderMixed(w, n, d);
window.exitRoom = (url) => MathQuizEngine.exit(url);
