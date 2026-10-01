/* ========================================================
   📖 민민이네 공부방 모바일 핀포인트 독해 뷰어 엔진 (reading_engine.js)
   - Zero-Hardcoding: 노션 독해 마스터 DB(LIBRARY_DB) 실시간 동적 송출
   - Mobile-First UX: 스크롤 핑퐁 없는 1문항 슬라이스 & 바텀시트
   - Self-Paced Scaffolding: [💡 단락 단서 힌트 토글] 자기주도 난이도 조절
   - Errorless Learning: 오답 경고음 배제, 부드러운 힌트 디딤돌
   ======================================================== */
(function() {
    'use strict';

    let currentPassages = [];
    let activePassage = null;
    let activeQuestionIdx = 0;
    let activeTrack = "🏥 센터 독해"; // "🏥 센터 독해" or "🏫 교과서 독해"
    let activeGrade = "5-1"; // 영어 등 학기/학년 탭 구분
    let activeSubject = "국어";
    let userAnswers = [];
    let isHintOpen = false;
    let isBottomSheetOpen = false;
    let containerEl = null;

    /**
     * 🏁 독해 로비 화면 (공부방 표준: 학년 선택 바 + 단원별 그룹화 서가)
     */
    async function renderReadingLobby(container, options = {}) {
        containerEl = container;
        const subject = options.subject || window.currentSubject || "국어";
        activeSubject = subject;
        const student = (window.currentUserName === '민서') ? '민서' : '민수';

        // 학년 기본값 설정
        if (options.grade) {
            activeGrade = options.grade;
        } else if (!activeGrade || activeGrade === 'ALL') {
            activeGrade = (subject === "영어") ? "5-1" : "5-2";
        }

        container.innerHTML = `
            <div class="spinner-wrapper">
                <div class="spinner-circle"></div>
                <p style="font-family:'Gaegu', cursive; font-size:1.3rem; font-weight:bold; color:inherit; text-align:center;">
                    🧚‍♀️ 코코 요정이 [${subject}] 독해 서가를 가져오고 있어요...
                </p>
            </div>
        `;

        if (typeof window.fetchReadingPassagesFromNotion !== 'function') {
            container.innerHTML = `<div style="text-align:center; padding:40px; color:#ef4444;">노션 독해 헬퍼를 불러올 수 없습니다.</div>`;
            return;
        }

        // 노션 독해 마스터 DB에서 실시간 조회 (과목 전체 수급 후 클라이언트 스마트 필터링)
        const fetchParams = {
            subject,
            student
        };

        let rawPassages = await window.fetchReadingPassagesFromNotion(fetchParams);

        // 🛡️ [내결함성 안전망] 노션 API 일시 장애/오프라인 시 로컬 캐시 폴백
        if (!rawPassages || rawPassages.length === 0) {
            const cacheKey = (subject === "영어") ? window.ENGLISH_READING_DATABASE : window.KOREAN_READING_DATABASE;
            if (Array.isArray(cacheKey)) {
                console.info(`🛡️ [ReadingEngine] 노션 조회 결과 없음 ➔ 로컬 캐시 폴백 가동 (과목: ${subject})`);
                rawPassages = cacheKey.map(p => ({
                    id: p.id,
                    title: p.title,
                    track: p.track || (subject === '영어' ? '🏫 교과서 독해' : '🏥 센터 독해'),
                    unit: p.unit || p.unitTitle || "1회차",
                    grade: p.grade || "5-1",
                    order: p.order || 1,
                    fullText: p.fullText || (p.paragraphs ? p.paragraphs.map(x => x.text).join('\n') : ""),
                    summary: p.summary || p.unitTitle || "",
                    date: p.date || "",
                    questions: p.questions || (p.themeQuiz ? [{
                        type: "choice",
                        question: p.themeQuiz.question,
                        options: p.themeQuiz.options,
                        answerIndex: p.themeQuiz.answerIndex,
                        answer: p.themeQuiz.options[p.themeQuiz.answerIndex],
                        clue: p.fullText ? p.fullText.slice(0, 100) : "",
                        explanation: p.themeQuiz.commentary
                    }] : [])
                }));
            }
        }

        currentPassages = rawPassages || [];

        // 1. 선택된 학년(activeGrade) 기준으로 지문 필터링
        let filteredPassages = currentPassages.filter(p => {
            if (activeGrade === 'ALL') return true;
            const pGrade = p.grade || "5-1";
            if (activeGrade === '5-1') {
                return pGrade.includes('5-1') || (!pGrade.includes('5-2') && !pGrade.includes('1-'));
            }
            if (activeGrade === '5-2') {
                return pGrade.includes('5-2');
            }
            return pGrade.includes(activeGrade);
        });

        // 2. 상단 학년 칩 바 생성 (과목별 특화)
        let gradeTabs = [];
        if (subject === "영어") {
            gradeTabs = [
                { key: "5-1", label: "📘 5-1 (1학기)" },
                { key: "5-2", label: "📗 5-2 (2학기)" },
                { key: "ALL", label: "🌟 전체보기" }
            ];
        } else {
            gradeTabs = [
                { key: "5-2", label: "🏫 5-2 (2학기 교과·센터)" },
                { key: "5-1", label: "🏥 5-1 (1학기 센터)" },
                { key: "ALL", label: "🌟 전체보기" }
            ];
        }

        const gradeBarHtml = `
            <div class="reading-grade-bar">
                ${gradeTabs.map(tab => `
                    <button class="reading-grade-chip ${activeGrade === tab.key ? 'active' : ''}" 
                            onclick="window.ReadingEngine.switchGrade('${tab.key}')">
                        ${tab.label}
                    </button>
                `).join('')}
            </div>
        `;

        // 3. 지문들을 단원/회차(unit) 기준으로 그룹화
        let sectionsHtml = "";
        if (filteredPassages.length === 0) {
            sectionsHtml = `
                <div style="text-align:center; padding:40px 20px; background:#fff; border-radius:18px; border:2px dashed #cbd5e1;">
                    <div style="font-size:2.5rem; margin-bottom:10px;">📭</div>
                    <h4 style="font-family:'Jua', sans-serif; font-size:1.2rem; color:#475569; margin-bottom:6px;">
                        등록된 ${activeGrade === 'ALL' ? '전체' : activeGrade} 지문이 없습니다.
                    </h4>
                    <p style="font-size:0.9rem; color:#94a3b8;">부모님이 스마트폰 노션 앱에서 지문을 등록하시면 바로 여기에 나타납니다!</p>
                </div>
            `;
        } else {
            // 단원별 그룹 맵 생성
            const unitGroupMap = new Map();

            // 순서 보장을 위해 정렬
            const sortedPassages = [...filteredPassages].sort((a, b) => {
                const orderA = typeof a.order === 'number' ? a.order : 999;
                const orderB = typeof b.order === 'number' ? b.order : 999;
                if (orderA !== orderB) return orderA - orderB;
                return (a.title || '').localeCompare(b.title || '');
            });

            for (const p of sortedPassages) {
                const uKey = (p.unit || "기본 단원").trim();
                if (!unitGroupMap.has(uKey)) {
                    unitGroupMap.set(uKey, []);
                }
                unitGroupMap.get(uKey).push(p);
            }

            // 각 단원 그룹별 렌더링
            const groupSections = [];
            for (const [unitName, pList] of unitGroupMap.entries()) {
                const cardsHtml = pList.map((p, idx) => {
                    const qCount = p.questions ? p.questions.length : 0;
                    const dateBadge = p.date ? `<span style="font-size:0.75rem; color:#888; background:#f1f5f9; padding:2px 8px; border-radius:10px;">📅 ${p.date}</span>` : '';
                    const trackBadge = p.track ? `<span style="font-size:0.75rem; color:#64748b; background:#f8fafc; border:1px solid #e2e8f0; padding:2px 6px; border-radius:8px;">${p.track}</span>` : '';

                    return `
                        <div class="reading-passage-card" onclick="window.ReadingEngine.startMission('${p.id}')">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; gap:6px; flex-wrap:wrap;">
                                <span class="reading-unit-chip">${unitName}</span>
                                <div style="display:flex; gap:4px; align-items:center;">
                                    ${trackBadge}
                                    ${dateBadge}
                                </div>
                            </div>
                            <h4 class="reading-card-title">📖 ${p.title}</h4>
                            <p class="reading-card-desc">${p.summary || (p.fullText ? p.fullText.slice(0, 70) + '...' : '지문을 정독하고 퀴즈를 풀어보아요!')}</p>
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:12px; border-top:1px dashed #e2e8f0; padding-top:8px;">
                                <span style="font-size:0.85rem; color:#059669; font-weight:bold;">🎯 문제 ${qCount}문항</span>
                                <span style="font-size:0.9rem; color:#f43f5e; font-family:'Jua', sans-serif;">도전하기 ▶</span>
                            </div>
                        </div>
                    `;
                }).join('');

                groupSections.push(`
                    <div class="reading-unit-section">
                        <div class="reading-unit-header">
                            <div class="reading-unit-title">
                                📂 <span>${unitName}</span>
                            </div>
                            <span class="reading-unit-count">지문 ${pList.length}편</span>
                        </div>
                        <div class="reading-lobby-grid">
                            ${cardsHtml}
                        </div>
                    </div>
                `);
            }

            sectionsHtml = groupSections.join('');
        }

        container.innerHTML = `
            <div style="max-width: 860px; margin: 0 auto; padding: 10px;">
                <!-- 상단 헤더 -->
                <div style="text-align: center; margin-bottom: 20px;">
                    <h3 style="font-family: 'Jua', sans-serif; font-size: 1.5rem; color: #1e293b; margin-bottom: 6px;">
                        📖 [${subject}] 정밀 독해 트레이닝 멀티버스
                    </h3>
                    <p style="font-size: 0.95rem; color: #64748b;">
                        학년과 단원별 지문을 차근차근 정독하고, 문제 속 단서를 찾아 스스로 해결해 봐요! ✨
                    </p>
                </div>

                ${gradeBarHtml}

                <!-- 단원별 그룹화 지문 섹션 -->
                <div class="reading-sections-container">
                    ${sectionsHtml}
                </div>
            </div>
        `;
    }

    /**
     * 🔄 학년 전환 (5-1, 5-2, ALL 등)
     */
    function switchGrade(gradeName) {
        activeGrade = gradeName;
        if (containerEl) {
            renderReadingLobby(containerEl, { subject: activeSubject, grade: gradeName });
        }
    }

    /**
     * 🔄 레거시 트랙 전환 브리지 (하위 호환 100% 보장)
     */
    function switchTrack(trackName) {
        activeTrack = trackName;
        if (trackName.includes('교과서')) {
            switchGrade('5-2');
        } else if (trackName.includes('센터')) {
            switchGrade('5-1');
        } else {
            if (containerEl) {
                renderReadingLobby(containerEl, { subject: activeSubject });
            }
        }
    }

    /**
     * 🚀 독해 미션 시작 (지문 정독 1단계 카드)
     */
    function startMission(passageId) {
        activePassage = currentPassages.find(p => p.id === passageId);
        if (!activePassage) return;

        activeQuestionIdx = 0;
        userAnswers = [];
        isHintOpen = false;
        isBottomSheetOpen = false;

        renderStep1Reader();
    }

    /**
     * 📖 1단계: 편안한 지문 정독 카드
     */
    function renderStep1Reader() {
        if (!containerEl || !activePassage) return;

        const p = activePassage;
        const qCount = p.questions ? p.questions.length : 0;
        const formattedText = (p.fullText || "").split('\n').filter(t => t.trim()).map(para => `<p style="margin-bottom:12px; text-indent:8px;">${para}</p>`).join('');

        containerEl.innerHTML = `
            <div class="reading-reader-wrapper">
                <!-- 상단 헤더 & 음성 낭독 -->
                <div class="reading-reader-header">
                    <span class="reading-unit-chip">${p.unit || '독해 미션'}</span>
                    <button class="reading-tts-btn" onclick="window.ReadingEngine.toggleTts()">
                        🔊 요정 코코 낭독 듣기
                    </button>
                </div>

                <h3 class="reading-passage-title">📖 ${p.title}</h3>

                <!-- 지문 본문 정독 카드 -->
                <div class="reading-body-card">
                    ${formattedText || '<p style="color:#94a3b8;">등록된 지문 본문이 없습니다.</p>'}
                </div>

                <!-- 하단 액션 버튼 -->
                <div style="display:flex; justify-content:center; gap:12px; margin-top:20px;">
                    <button class="reading-btn-secondary" onclick="window.ReadingEngine.renderLobby()">
                        ⬅️ 서가로 돌아가기
                    </button>
                    <button class="reading-btn-primary" onclick="window.ReadingEngine.startQuestions()">
                        🎯 문제 풀러 가기 (${qCount}문제) ➡️
                    </button>
                </div>
            </div>
        `;

        if (typeof window.speakFairyTTS === 'function') {
            window.speakFairyTTS(`안녕! 방금 읽을 이야기는 ${p.title}이에요. 편안하게 읽어보고 문제를 풀어봐요!`);
        }
    }

    /**
     * 🎯 2단계: 1문항 슬라이스 집중 풀이
     */
    function startQuestions() {
        if (!activePassage || !activePassage.questions || activePassage.questions.length === 0) {
            alert("이 지문에는 등록된 문제가 없습니다. 서가로 돌아갑니다.");
            renderReadingLobby(containerEl);
            return;
        }

        activeQuestionIdx = 0;
        renderQuestionStep();
    }

    /**
     * 🧩 1문항 렌더링 (단락 힌트 토글 + 바텀시트 포함)
     */
    function renderQuestionStep() {
        if (!containerEl || !activePassage) return;

        const questions = activePassage.questions || [];
        if (activeQuestionIdx >= questions.length) {
            renderCompletionReward();
            return;
        }

        isHintOpen = false; // 새 문항 시작 시 힌트 기본 접힘 상태 유지
        const q = questions[activeQuestionIdx];
        const total = questions.length;
        const currentNum = activeQuestionIdx + 1;

        // 💡 단락 힌트 박스 HTML (아버님 요청: 토글로 숨김/표시 - clue / hintParagraph 완벽 호환)
        const hintText = (q.clue || q.hint || q.hintParagraph || '').trim();
        const chosungText = (q.chosung || q.chosungHint || '').trim();

        const hintHtml = hintText ? `
            <div style="margin-bottom:14px;">
                <button type="button" id="readingHintToggleBtn" class="reading-hint-toggle-btn ${isHintOpen ? 'active' : ''}" onclick="window.ReadingEngine.toggleHint()">
                    💡 ${isHintOpen ? '이 문제의 결정적 단서 접기 🙈' : '이 문제의 결정적 단서 보기 (단락 힌트) 🔍'}
                </button>
                <div id="readingHintBox" class="reading-hint-box" style="display:${isHintOpen ? 'block' : 'none'};">
                    <div style="font-weight:bold; color:#059669; font-size:0.85rem; margin-bottom:4px;">✨ 지문 속 정답 단서:</div>
                    <div style="font-size:0.95rem; color:#1e293b; line-height:1.6;">${hintText}</div>
                </div>
            </div>
        ` : '';

        // 문항 유형별 선택지/입력 영역 렌더링
        let inputHtml = '';
        if (q.type === 'short' || q.type === 'subjective') {
            // 단답형 주관식
            inputHtml = `
                <div style="margin: 20px 0;">
                    ${chosungText ? `<div class="quiz-hint-box" style="margin-bottom:12px;">초성 힌트: ${chosungText}</div>` : ''}
                    <input type="text" id="readingShortInput" class="text-input-field" placeholder="정답을 입력하세요" style="width:100%; max-width:360px;" onkeypress="if(event.key==='Enter')window.ReadingEngine.submitShortAnswer()">
                    <div style="margin-top:14px;">
                        <button class="reading-btn-primary" onclick="window.ReadingEngine.submitShortAnswer()">✅ 정답 확인</button>
                    </div>
                </div>
            `;
        } else {
            // 기본: 4지선다 객관식
            const choices = q.choices || q.options || [];
            inputHtml = `
                <div class="reading-choices-list">
                    ${choices.map((choice, cIdx) => `
                        <button class="reading-choice-btn" id="choiceBtn_${cIdx}" onclick="window.ReadingEngine.chooseAnswer(${cIdx})">
                            <span class="choice-num-badge">${cIdx + 1}</span>
                            <span class="choice-text">${choice}</span>
                        </button>
                    `).join('')}
                </div>
            `;
        }

        containerEl.innerHTML = `
            <div class="reading-question-wrapper">
                <!-- 상단 프로그레스 헤더 -->
                <div class="reading-progress-header">
                    <span style="font-family:'Jua', sans-serif; color:#475569; font-size:0.95rem;">
                        📖 ${activePassage.title}
                    </span>
                    <span class="reading-badge-count">
                        문제 ${currentNum} / ${total}
                    </span>
                </div>

                <!-- 💡 단락 힌트 토글 -->
                ${hintHtml}

                <!-- 질문 발문 카드 -->
                <div class="reading-question-card">
                    <div class="reading-q-title">Q${currentNum}. ${q.question}</div>
                    ${inputHtml}
                </div>

                <!-- 하단 바텀시트 토글 플로팅 바 (지문 전문 확인용) -->
                <div class="reading-bottom-sheet-bar" onclick="window.ReadingEngine.openBottomSheet()">
                    <span>📖 지문 전문 전체 확인하기 (터치) ⬆️</span>
                </div>

                <!-- 📜 지문 전문 바텀시트 모달 (오버레이) -->
                <div id="readingBottomSheet" class="reading-bottom-sheet ${isBottomSheetOpen ? 'open' : ''}">
                    <div class="bottom-sheet-header">
                        <span style="font-family:'Jua', sans-serif; font-size:1.1rem; color:#1e293b;">📖 지문 전문</span>
                        <button class="sheet-close-btn" onclick="window.ReadingEngine.closeBottomSheet()">✖ 닫기</button>
                    </div>
                    <div class="bottom-sheet-content">
                        ${(activePassage.fullText || "").split('\n').filter(t => t.trim()).map(para => `<p style="margin-bottom:12px;">${para}</p>`).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * 💡 단락 힌트 토글
     */
    function toggleHint() {
        isHintOpen = !isHintOpen;
        const box = document.getElementById('readingHintBox');
        const btn = document.getElementById('readingHintToggleBtn');
        if (box) {
            box.style.display = isHintOpen ? 'block' : 'none';
        }
        if (btn) {
            btn.classList.toggle('active', isHintOpen);
            btn.innerHTML = `💡 ${isHintOpen ? '이 문제의 결정적 단서 접기 🙈' : '이 문제의 결정적 단서 보기 (단락 힌트) 🔍'}`;
        }
    }

    /**
     * 📜 바텀시트 열기/닫기
     */
    function openBottomSheet() {
        isBottomSheetOpen = true;
        const sheet = document.getElementById('readingBottomSheet');
        if (sheet) sheet.classList.add('open');
    }

    function closeBottomSheet() {
        isBottomSheetOpen = false;
        const sheet = document.getElementById('readingBottomSheet');
        if (sheet) sheet.classList.remove('open');
    }

    /**
     * 🎯 객관식 정답 채점 (Errorless Learning)
     */
    function chooseAnswer(selectedIdx) {
        const q = activePassage.questions[activeQuestionIdx];
        const choices = q.choices || q.options || [];
        let correctIdx = 0;
        if (typeof q.answerIndex === 'number') {
            correctIdx = q.answerIndex;
        } else if (typeof q.answer === 'number') {
            correctIdx = q.answer;
        } else if (typeof q.answer === 'string') {
            const parsedNum = parseInt(q.answer, 10);
            if (!isNaN(parsedNum) && parsedNum >= 1 && parsedNum <= choices.length) {
                correctIdx = parsedNum - 1;
            } else {
                const foundIdx = choices.findIndex(c => c.trim() === q.answer.trim());
                correctIdx = foundIdx !== -1 ? foundIdx : 0;
            }
        }

        const btn = document.getElementById(`choiceBtn_${selectedIdx}`);

        if (selectedIdx === correctIdx) {
            // 정답!
            if (btn) btn.classList.add('correct');
            if (typeof window.fairyPraise === 'function') window.fairyPraise();
            if (typeof window.speakFairyTTS === 'function') window.speakFairyTTS("정답이에요! 아주 훌륭해요!");

            // 실시간 소액 보상 (+1💎/🍬)
            if (typeof window.triggerAwardDispense === 'function') {
                window.triggerAwardDispense(1, 'reading');
            }

            setTimeout(() => {
                isHintOpen = false;
                activeQuestionIdx++;
                renderQuestionStep();
            }, 1200);
        } else {
            // 오답: 에러리스 학습 안내 & 힌트 자동 개방
            if (btn) btn.classList.add('wrong');
            if (typeof window.fairyEncourage === 'function') window.fairyEncourage();
            if (typeof window.speakFairyTTS === 'function') window.speakFairyTTS("괜찮아요! 단락 힌트를 다시 한번 살펴볼까요?");

            isHintOpen = true;
            const box = document.getElementById('readingHintBox');
            if (box) box.style.display = 'block';

            setTimeout(() => {
                if (btn) btn.classList.remove('wrong');
            }, 1000);
        }
    }

    /**
     * ✍️ 단답형 주관식 제출
     */
    function submitShortAnswer() {
        const inputEl = document.getElementById('readingShortInput');
        if (!inputEl) return;
        const userText = inputEl.value.trim();
        if (!userText) {
            alert("정답을 입력해 주세요!");
            return;
        }

        const q = activePassage.questions[activeQuestionIdx];
        const correctAnswers = Array.isArray(q.answer) ? q.answer : [String(q.answer || "").trim()];

        const isMatch = correctAnswers.some(ans => ans.replace(/\s+/g, '') === userText.replace(/\s+/g, ''));

        if (isMatch) {
            inputEl.classList.add('correct');
            if (typeof window.fairyPraise === 'function') window.fairyPraise();
            if (typeof window.speakFairyTTS === 'function') window.speakFairyTTS("정답이에요! 완벽하게 맞췄어요!");

            if (typeof window.triggerAwardDispense === 'function') {
                window.triggerAwardDispense(1, 'reading');
            }

            setTimeout(() => {
                isHintOpen = false;
                activeQuestionIdx++;
                renderQuestionStep();
            }, 1200);
        } else {
            inputEl.classList.add('wrong');
            if (typeof window.fairyEncourage === 'function') window.fairyEncourage();
            if (typeof window.speakFairyTTS === 'function') window.speakFairyTTS("비슷했어요! 초성 힌트와 단락 단서를 다시 확인해 볼까요?");

            isHintOpen = true;
            const box = document.getElementById('readingHintBox');
            if (box) box.style.display = 'block';

            setTimeout(() => {
                inputEl.classList.remove('wrong');
            }, 1000);
        }
    }

    /**
     * 🎉 전체 미션 클리어 축하 및 보상 모달
     */
    async function renderCompletionReward() {
        if (!containerEl || !activePassage) return;

        // 완주 보너스 (+3💎)
        if (typeof window.triggerAwardDispense === 'function') {
            window.triggerAwardDispense(3, 'reading_clear');
        }

        // 노션 학습일지 자동 전송
        if (typeof window.sendStudyLogToNotion === 'function') {
            await window.sendStudyLogToNotion({
                subject: '국어',
                errorReport: `독해 미션 완료: [${activePassage.title}] 전 문항 클리어`
            });
        }

        containerEl.innerHTML = `
            <div style="text-align:center; padding: 40px 20px;">
                <div style="font-size:3.5rem; margin-bottom:12px;">🎉</div>
                <h3 style="font-size:1.6rem; color:#059669; font-family:'Jua', sans-serif; margin-bottom:8px;">
                    [${activePassage.title}] 독해 미션 완벽 클리어!
                </h3>
                <p style="font-size:1.05rem; color:#475569; margin-bottom:20px;">
                    지문을 꼼꼼히 정독하고 단서를 찾아 끝까지 완주했어요! 참 대견해요! ✨
                </p>
                <div style="display:inline-block; background:#ecfdf5; border:2px solid #10b981; padding:12px 24px; border-radius:18px; margin-bottom:24px;">
                    <span style="font-size:1.2rem; font-weight:bold; color:#047857;">💎 완주 축하 보너스 +3 다이아 적립 완료!</span>
                </div>
                <div>
                    <button class="reading-btn-primary" style="font-size:1.15rem; padding:12px 32px;" onclick="window.ReadingEngine.renderLobby()">
                        📚 다른 독해 지문 도전하기 ➔
                    </button>
                </div>
            </div>
        `;

        if (typeof window.fairyReward === 'function') window.fairyReward();
    }

    function toggleTts() {
        if (!activePassage || !activePassage.fullText) return;
        if (typeof window.speakFairyTTS === 'function') {
            window.speakFairyTTS(activePassage.fullText);
        }
    }

    // 전역 인터페이스 노출 (Facade)
    window.ReadingEngine = {
        renderLobby: (c, opts) => renderReadingLobby(c || containerEl, opts),
        switchTrack,
        switchGrade,
        startMission,
        startQuestions,
        renderStep1Reader,
        toggleHint,
        openBottomSheet,
        closeBottomSheet,
        chooseAnswer,
        submitShortAnswer,
        toggleTts
    };

})();
