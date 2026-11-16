/* ========================================================
   📖 김s 공부방 모바일 핀포인트 독해 뷰어 엔진 (reading_engine.js)
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
    let currentStep = 0; // 0: 로비, 1: 지문정독, 2: 문제풀이, 3: 완료
    let activeSubject = "국어";
    let userAnswers = [];
    let isHintOpen = false;
    let isBottomSheetOpen = false;
    let containerEl = null;

    // 🎧 오디오 낭독 수명주기 & 센터 정적 MP3 캐시
    let isAudioPlaying = false;
    let questionChoiceOrders = {};

    // 트랙 순서: 교과서 → 센터 → 미니 독해 (그 밖의 트랙은 뒤에 글자순)
    const TRACK_ORDER = ['🏫 교과서 독해', '🏥 센터 독해', '🌱 민서 미니 독해'];
    let lastLobbyOptions = {};

    function passageGrade(p) {
        return (Array.isArray(p.grades) && p.grades[0]) || String(p.grade || '').split(',')[0].trim() || '공통';
    }

    function isOwnPassage(p, student) {
        return !Array.isArray(p.student) || p.student.length === 0 || p.student.includes(student);
    }

    function passageItem(p, opts) {
        // 센터 지문은 「순번」이 곧 회차 번호(5~37). 교과서·미니 독해는 순번이 정렬용(101~)이라 단원 이름을 소제목으로 쓴다.
        const isCenter = p.track === '🏥 센터 독해' && typeof p.order === 'number' && p.order < 100;
        const qCount = (p.questions || []).length;
        return {
            id: p.id,
            num: isCenter ? `${p.order}번` : '',
            section: isCenter ? '' : (p.unit || ''),
            title: p.title,
            meta: opts.showQuestionCount === false ? '' : `${qCount}문항`,
            summary: p.summary || (p.fullText ? p.fullText.slice(0, 90) + '…' : ''),
            actionLabel: opts.actionLabel
        };
    }

    function byOrder(a, b) {
        const oa = typeof a.order === 'number' ? a.order : 999;
        const ob = typeof b.order === 'number' ? b.order : 999;
        return (oa - ob) || String(a.title || '').localeCompare(String(b.title || ''));
    }

    /**
     * 지문 목록 → 묶음 목록 부품(GroupedList) 입력. 정밀 독해·AI 지문 토론방이 같이 쓴다.
     * - 대분류 트랙(교과서/센터/미니), 소분류 학기. 지금 학기 묶음만 펼친다.
     * - 민서(초1)는 자기 지문만 위에 두고, 5학년 지문은 「🔭 5학년 미리보기」(접힘)로 모은다.
     * - highlight {grade, unit}: 영어 로비 단원 칩에서 고른 단원. 「회차/단원」이 글자까지 같은 지문을 맨 위
     *   「⭐ 고른 단원」에 모으고, 없으면 "준비 중" 안내만 띄운다(거르지 않음: 단원당 1~2편이라 빈 화면이 되기 쉽다).
     */
    function buildPassageGroups(passages, opts = {}) {
        const student = opts.student || '민수';
        const newestFirst = student !== '민서';
        const list = [...(passages || [])].sort(byOrder);
        const own = list.filter(p => isOwnPassage(p, student));
        const others = list.filter(p => !isOwnPassage(p, student));

        const semSort = (a, b) => newestFirst ? b.localeCompare(a, undefined, { numeric: true }) : a.localeCompare(b, undefined, { numeric: true });
        const trackSort = (a, b) => {
            const ia = TRACK_ORDER.indexOf(a), ib = TRACK_ORDER.indexOf(b);
            return ((ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib)) || a.localeCompare(b);
        };

        function trackGroups(items, idPrefix, openFirst) {
            const byTrack = new Map();
            items.forEach(p => {
                const t = p.track || '📖 독해';
                if (!byTrack.has(t)) byTrack.set(t, new Map());
                const sem = passageGrade(p);
                if (!byTrack.get(t).has(sem)) byTrack.get(t).set(sem, []);
                byTrack.get(t).get(sem).push(p);
            });
            return [...byTrack.keys()].sort(trackSort).map(track => {
                const sems = [...byTrack.get(track).keys()].sort(semSort);
                return {
                    id: `${idPrefix}${track}`,
                    title: track,
                    open: openFirst,
                    children: sems.map((sem, i) => ({
                        id: `${idPrefix}${track}-${sem}`,
                        title: sem,
                        open: openFirst && i === 0,
                        items: byTrack.get(track).get(sem).map(p => passageItem(p, opts))
                    }))
                };
            });
        }

        const groups = [];
        const hl = opts.highlight;
        if (hl && hl.unit) {
            const picked = list.filter(p => String(p.unit || '').trim() === hl.unit && (!hl.grade || passageGrade(p) === hl.grade));
            groups.push({
                id: 'picked', title: `고른 단원: ${hl.grade ? hl.grade + ' ' : ''}${hl.unit}`, icon: '⭐', highlight: true, open: true,
                note: picked.length ? '' : `${hl.unit} 지문은 아직 준비 중이에요. 아래에서 다른 지문을 골라 볼까요?`,
                items: picked.map(p => passageItem(p, opts))
            });
        }
        groups.push(...trackGroups(own, 'own-', true));
        if (others.length) {
            groups.push({ id: 'preview', title: student === '민서' ? '5학년 미리보기' : '다른 학년 지문', icon: '🔭', open: false, children: trackGroups(others, 'preview-', false) });
        }
        return groups;
    }

    function localFallbackPassages(subject) {
        const db = (subject === "영어") ? window.ENGLISH_READING_DATABASE : window.KOREAN_READING_DATABASE;
        if (!Array.isArray(db)) return [];
        // 국어 예비 파일에는 예전에 섞여 들어간 영어 지문이 있어 과목으로 한 번 거른다.
        return db.filter(p => !p.subject || p.subject === subject).map(p => ({
            id: p.id || p.book_id,
            title: p.title,
            track: p.track || (subject === '영어' ? '🏫 교과서 독해' : '🏥 센터 독해'),
            unit: p.unit || p.unitTitle || "",
            grade: p.grade || "5-1",
            order: p.order || 999,
            student: p.student || [],
            fullText: p.fullText || p.full_text || (p.paragraphs ? p.paragraphs.map(x => x.text).join('\n') : ""),
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

    // 노션 독해 DB(LIBRARY_DB)에서 과목 지문 전체를 읽는다. 노션이 비거나 끊기면 로컬 예비 파일.
    async function loadPassages(subject) {
        let raw = [];
        if (typeof window.fetchReadingPassagesFromNotion === 'function') {
            raw = await window.fetchReadingPassagesFromNotion({ subject, includeAllStudents: true });
        }
        if (!raw || raw.length === 0) {
            console.info(`🛡️ [ReadingEngine] 노션 조회 결과 없음 ➔ 로컬 예비 지문 사용 (과목: ${subject})`);
            raw = localFallbackPassages(subject);
        }
        return raw || [];
    }

    /**
     * 🏁 독해 로비: 학기 탭 없이 [트랙 → 학기] 묶음 + 한 줄 목록. 줄을 누르면 요약과 [도전하기]가 펼쳐진다.
     */
    async function renderReadingLobby(container, options = {}) {
        stopAudio();
        currentStep = 0;
        activePassage = null;
        activeQuestionIdx = 0;
        questionChoiceOrders = {};
        containerEl = container;
        if (options && Object.keys(options).length) lastLobbyOptions = options;
        const opts = lastLobbyOptions;
        const subject = opts.subject || window.currentSubject || "국어";
        activeSubject = subject;
        const student = (window.currentUserName === '민서') ? '민서' : '민수';

        container.innerHTML = `
            <div class="spinner-wrapper">
                <div class="spinner-circle"></div>
                <p style="font-family:'Gaegu', cursive; font-size:1.3rem; font-weight:bold; color:inherit; text-align:center;">
                    🧚‍♀️ 코코 요정이 [${subject}] 독해 서가를 가져오고 있어요...
                </p>
            </div>
        `;

        currentPassages = await loadPassages(subject);
        const groups = buildPassageGroups(currentPassages, { student, highlight: opts.highlight, actionLabel: '도전하기 ▶' });

        container.innerHTML = `
            <div style="max-width: 860px; margin: 0 auto; padding: 6px;">
                <div style="text-align: center; margin-bottom: 14px;">
                    <h3 style="font-family: 'Jua', sans-serif; font-size: 1.4rem; color: #1e293b; margin-bottom: 4px;">📖 [${subject}] 정밀 독해 트레이닝</h3>
                    <p style="font-size: 0.92rem; color: #64748b;">지문을 누르면 내용이 보여요. 마음에 들면 [도전하기]! ✨</p>
                </div>
                <div id="readingLobbyList"></div>
            </div>
        `;
        if (window.GroupedList) {
            window.GroupedList.render(container.querySelector('#readingLobbyList'), groups, {
                expandable: true,
                memoryKey: `reading_${subject}_${student}`,
                emptyText: '부모님이 노션에 지문을 등록하시면 바로 여기에 나타나요!',
                onPick: item => startMission(item.id)
            });
        }
    }

    // 예전 학기 탭·트랙 탭 호출 호환 (이제 탭이 없어 목록만 다시 그린다)
    function switchGrade() { stopAudio(); if (containerEl) renderReadingLobby(containerEl); }
    function switchTrack() { switchGrade(); }


    /**
     * 🚀 독해 미션 시작 (지문 정독 1단계 카드)
     */
    function startMission(passageId) {
        stopAudio();
        activePassage = currentPassages.find(p => p.id === passageId);
        if (!activePassage) return;

        activeQuestionIdx = 0;
        questionChoiceOrders = {};
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
        currentStep = 1;

        const p = activePassage;
        const qCount = p.questions ? p.questions.length : 0;
        const formattedText = (p.fullText || "").split('\n').filter(t => t.trim()).map(para => `<p style="margin-bottom:12px; text-indent:8px;">${para}</p>`).join('');

        containerEl.innerHTML = `
            <div class="reading-reader-wrapper">
                <!-- 상단 헤더 & 음성 낭독 & 서가 닫기 -->
                <div class="reading-reader-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                    <div style="display:flex; gap:8px; align-items:center;">
                        <span class="reading-unit-chip">${p.unit || '독해 미션'}</span>
                        <button class="reading-tts-btn" onclick="window.ReadingEngine.toggleTts()">
                            🔊 요정 코코 낭독 듣기
                        </button>
                    </div>
                    <button class="reading-btn-secondary" style="padding:6px 14px; font-size:0.9rem;" onclick="window.ReadingEngine.renderLobby()">
                        ✖ 서가로 닫기
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
        stopAudio();
        if (!activePassage || !activePassage.questions || activePassage.questions.length === 0) {
            alert("이 지문에는 등록된 문제가 없습니다. 서가로 돌아갑니다.");
            renderReadingLobby(containerEl);
            return;
        }
        currentStep = 2;

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
            if (!questionChoiceOrders[activeQuestionIdx]) {
                questionChoiceOrders[activeQuestionIdx] = window.QuizChoices
                    ? window.QuizChoices.arrange(choices)
                    : choices.map((text, index) => ({ text, index }));
            }
            const choiceOrder = questionChoiceOrders[activeQuestionIdx];
            inputHtml = `
                <div class="reading-choices-list">
                    ${choiceOrder.map((c, pos) => `
                        <button class="reading-choice-btn" id="choiceBtn_${c.index}" data-choice-index="${c.index}" onclick="window.ReadingEngine.chooseAnswer(${c.index})">
                            <span class="choice-num-badge">${pos + 1}</span>
                            <span class="choice-text">${c.text}</span>
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

                <!-- 🌫️ 지문 전문 바텀시트 백드롭 (바깥 터치 시 즉시 닫힘) -->
                <div id="readingSheetBackdrop" class="reading-sheet-backdrop" onclick="window.ReadingEngine.closeBottomSheet()"></div>

                <!-- 📜 지문 전문 바텀시트 모달 (오버레이) -->
                <div id="readingBottomSheet" class="reading-bottom-sheet" style="display:none;">
                    <div class="bottom-sheet-header">
                        <span style="font-family:'Jua', sans-serif; font-size:1.15rem; color:#1e293b;">📖 지문 전문 전체 확인</span>
                        <button class="sheet-close-btn" onclick="window.ReadingEngine.closeBottomSheet()">✖ 닫기</button>
                    </div>
                    <div class="bottom-sheet-content">
                        ${(activePassage.fullText || "").split('\n').filter(t => t.trim()).map(para => `<p style="margin-bottom:12px; text-indent:8px;">${para}</p>`).join('')}
                    </div>
                    <div style="padding:10px 16px; border-top:1px solid #f1f5f9; background:#f8fafc; text-align:center;">
                        <button class="sheet-close-btn" style="width:100%; padding:10px; font-size:1rem;" onclick="window.ReadingEngine.closeBottomSheet()">
                            ✖ 지문 전문 닫고 문제로 돌아가기
                        </button>
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
        // 단서를 열 때만 힌트 음성 (fairy-engine.js)
        if (isHintOpen && typeof window.fairyHint === 'function') window.fairyHint();
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
        const backdrop = document.getElementById('readingSheetBackdrop');
        const sheet = document.getElementById('readingBottomSheet');
        if (backdrop) {
            backdrop.style.display = 'block';
            requestAnimationFrame(() => backdrop.classList.add('open'));
        }
        if (sheet) {
            sheet.style.display = 'flex';
            sheet.style.transform = '';
            requestAnimationFrame(() => sheet.classList.add('open'));
        }
    }

    function closeBottomSheet() {
        isBottomSheetOpen = false;
        const backdrop = document.getElementById('readingSheetBackdrop');
        const sheet = document.getElementById('readingBottomSheet');
        if (backdrop) {
            backdrop.classList.remove('open');
            backdrop.style.display = 'none';
        }
        if (sheet) {
            sheet.classList.remove('open');
            sheet.style.transform = 'translateY(100%)';
            setTimeout(() => {
                if (!isBottomSheetOpen && sheet) {
                    sheet.style.display = 'none';
                }
            }, 250);
        }
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
            if (typeof window.fairyPraise === 'function') {
                window.fairyPraise();
            } else if (typeof window.speakFairyTTS === 'function') {
                window.speakFairyTTS("정답이에요! 아주 훌륭해요!");
            }

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
            if (typeof window.fairyEncourage === 'function') {
                window.fairyEncourage();
            } else if (typeof window.speakFairyTTS === 'function') {
                window.speakFairyTTS("괜찮아요! 단락 힌트를 다시 한번 살펴볼까요?");
            }

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
            if (typeof window.fairyPraise === 'function') {
                window.fairyPraise();
            } else if (typeof window.speakFairyTTS === 'function') {
                window.speakFairyTTS("정답이에요! 완벽하게 맞췄어요!");
            }

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
                subject: activeSubject,
                errorReport: `독해 미션 완료: [${activePassage.title}] 전 문항 클리어`
            });
        }

        currentStep = 3;
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
                <div style="display:flex; flex-direction:column; gap:10px; align-items:center;">
                    ${typeof window.openDiscussionForPassage === 'function' ? `
                    <button class="reading-btn-primary" style="font-size:1.15rem; padding:12px 32px; background:linear-gradient(135deg,#8b5cf6,#6d28d9);" onclick="window.openDiscussionForPassage(window.ReadingEngine.getActivePassageId())">
                        🗣️ 이 지문으로 코코와 토론하기
                    </button>` : ''}
                    <button class="reading-btn-primary" style="font-size:1.15rem; padding:12px 32px;" onclick="window.ReadingEngine.renderLobby()">
                        📚 다른 독해 지문 도전하기 ➔
                    </button>
                </div>
            </div>
        `;

        if (typeof window.fairyReward === 'function') window.fairyReward();
    }

    function isMissionInProgress() {
        // 문제 풀이 중(Step 2)이고 1문항 이상 풀었으며 아직 완주하지 않았을 때만 진행 중으로 판정
        return currentStep === 2 && !!activePassage && activeQuestionIdx > 0 && activeQuestionIdx < (activePassage.questions || []).length;
    }

    // 정적 MP3와 실시간 TTS 모두 공통 엔진의 중지 경로를 사용한다.
    function resetAudioUI() {
        isAudioPlaying = false;
        updateTtsButtonUI(false);
    }

    function stopAudio() {
        resetAudioUI();
        if (typeof window.stopFairyTTS === 'function') window.stopFairyTTS();
    }

    function updateTtsButtonUI(playing) {
        const btn = containerEl ? containerEl.querySelector('.reading-tts-btn') : null;
        if (!btn) return;
        btn.innerHTML = playing ? '⏹️ 낭독 멈추기' : '🔊 요정 코코 낭독 듣기';
        btn.classList.toggle('playing', playing);
        btn.style.background = playing ? '#f43f5e' : '';
        btn.style.color = playing ? '#ffffff' : '';
    }

    function toggleTts() {
        if (!activePassage || !activePassage.fullText) return;
        if (isAudioPlaying) { stopAudio(); return; }
        if (localStorage.getItem('fairy_tts_enabled') === 'false') return;
        if (typeof window.speakFairyTTS !== 'function') return;
        // speakFairyTTS 내부의 CenterReadingAudio가 ID 대신 본문 해시로 조회한다.
        window.speakFairyTTS(activePassage.fullText, resetAudioUI);
        isAudioPlaying = true;
        updateTtsButtonUI(true);
    }

    window.addEventListener('fairy-audio-stop', resetAudioUI);

    // 전역 인터페이스 노출 (Facade)
    window.ReadingEngine = {
        renderLobby: (c, opts) => renderReadingLobby(c || containerEl, opts),
        buildPassageGroups,
        loadPassages,
        getActivePassageId: () => (activePassage ? activePassage.id : ''),
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
        toggleTts,
        stopAudio,
        isMissionInProgress
    };

    // 창 전환/닫기 시 오디오 정지 이벤트 리스너 등록
    window.addEventListener('beforeunload', stopAudio);
    window.addEventListener('pagehide', stopAudio);

})();
