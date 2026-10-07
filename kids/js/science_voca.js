// kids/js/science_voca.js
// 💡 [2단계] 과학 핵심 용어방 전담 엔진 (골디락스 모듈)
// - 전사 거버넌스 헌법(규칙 7조) 준수: 적정 응집도, IIFE 캡슐화, 하위 호환성 100% 보존

(function() {
    'use strict';

    function getChosung(str) {
        if (!str || typeof str !== 'string') return "";
        const cho = ["ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ","ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];
        let result = "";
        for (let i = 0; i < str.length; i++) {
            const code = str.charCodeAt(i) - 44032;
            if (code > -1 && code < 11172) {
                result += cho[Math.floor(code / 588)];
            } else {
                result += str.charAt(i);
            }
        }
        return result;
    }

    function renderScienceGradeUI(grades, container) {
        if (typeof speakFairyTTS === 'function') {
            speakFairyTTS("공부할 학년과 학기를 골라보세요! 🧚‍♀️");
        }
        
        container.innerHTML = `
            <div style="text-align:center; padding:15px 10px; font-family:'Jua'; width:100%; max-width:540px; margin:0 auto;">
                <div style="font-size:2.5rem; margin-bottom:6px;">🎒</div>
                <h3 style="margin-bottom:6px; color:var(--primary); font-size:1.6rem;">1. 학년 & 학기 고르기</h3>
                <p style="color:var(--text-muted); margin-bottom:20px; font-size:0.95rem;">탐구하고 싶은 교과서 학기와 단원을 선택해 보세요!</p>

                <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:14px;">
                    ${grades.map(g => {
                        const label = (g === '5-1' || g === '5학년 1학기') ? '📖 5학년 1학기 (5-1)' : (g === '5-2' || g === '5학년 2학기') ? '📖 5학년 2학기 (5-2)' : `📖 ${g}`;
                        return `
                        <button class="quiz-choice-btn" style="
                            padding:18px 14px; font-size:1.15rem; text-align:center; justify-content:center;
                            border-radius:14px; background:linear-gradient(180deg, #ffffff 0%, #f0f9ff 100%);
                            border:2px solid #38bdf8;
                        " onclick="ScienceVoca.selectGrade('${g}')">
                            ${label}
                        </button>
                        `;
                    }).join('')}
                </div>

                <button class="quiz-choice-btn" style="
                    background:#f1f5f9; width:100%; text-align:center; justify-content:center;
                    padding:12px; font-size:1.05rem; border-radius:12px;
                " onclick="ScienceVoca.selectGrade('ALL')">
                    🌟 전체 학년·학기 종합 탐구 (모아보기)
                </button>
            </div>
        `;
    }

    function selectScienceGrade(grade) {
        window.selectedScienceGrade = grade;
        const innerBody = document.getElementById('overlayInnerBody');
        const records = window.allFetchedRecords || [];

        let matchedRecords = [];
        if (grade === 'ALL') {
            matchedRecords = records;
        } else {
            matchedRecords = records.filter(r => {
                if (r.grade === grade || (r.grades && r.grades.includes(grade))) return true;
                if (grade === '5-1' && (r.grade === '5학년 1학기' || (r.grades && r.grades.includes('5학년 1학기')))) return true;
                if (grade === '5-2' && (r.grade === '5학년 2학기' || (r.grades && r.grades.includes('5학년 2학기')))) return true;
                if (grade === '5학년 1학기' && (r.grade === '5-1' || (r.grades && r.grades.includes('5-1')))) return true;
                if (grade === '5학년 2학기' && (r.grade === '5-2' || (r.grades && r.grades.includes('5-2')))) return true;
                return false;
            });
        }

        // 단원 목록 추출
        const uniqueUnits = [...new Set(matchedRecords.map(r => String(r.level || r.stage || '').trim()))].filter(u => u && u !== "기본 단원").sort();

        // 2단계 단원 선택 UI 호출
        renderScienceUnitUI(uniqueUnits, innerBody, matchedRecords, grade);
    }

    function renderScienceUnitUI(units, container, matchedRecords, grade) {
        if (typeof speakFairyTTS === 'function') {
            speakFairyTTS("공부할 과학 단원을 골라보세요!");
        }
        
        // 각 단원별 단어 개수 계산
        const unitCountMap = {};
        units.forEach(u => {
            unitCountMap[u] = matchedRecords.filter(r => String(r.level || r.stage || '').trim() === u).length;
        });

        const gradeLabel = grade === 'ALL' ? '전체 학년·학기' : (grade === '5-1' || grade === '5학년 1학기') ? '5-1 (1학기)' : (grade === '5-2' || grade === '5학년 2학기') ? '5-2 (2학기)' : grade;

        container.innerHTML = `
            <div style="text-align:center; padding:15px 10px; font-family:'Jua'; width:100%; max-width:620px; margin:0 auto;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                    <button class="back-to-lobby-btn" style="padding:6px 14px; font-size:0.9rem;" onclick="ScienceVoca.renderGradeUI(['5-1', '5-2'], document.getElementById('overlayInnerBody'))">
                        🔙 학년 다시 고르기
                    </button>
                    <span style="font-size:1.05rem; color:#0284c7; font-weight:bold; background:#e0f2fe; padding:4px 12px; border-radius:8px;">
                        📖 ${gradeLabel}
                    </span>
                </div>

                <h3 style="margin-bottom:6px; color:var(--primary); font-size:1.55rem;">📚 2. 탐구할 단원 고르기</h3>
                <p style="color:var(--text-muted); margin-bottom:18px; font-size:0.95rem;">원하는 단원을 선택해 교과서 핵심 용어를 정복해 보세요!</p>

                <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:16px;">
                    ${units.map(u => `
                        <button class="quiz-choice-btn" style="
                            padding:14px 18px; font-size:1.1rem; text-align:left; justify-content:space-between;
                            border-radius:14px; border:2px solid #bae6fd; background:linear-gradient(180deg, #ffffff 0%, #f0f9ff 100%);
                        " onclick="ScienceVoca.selectUnit('${u}', '${grade}')">
                            <span style="display:flex; align-items:center; gap:8px;">
                                🔬 <b>${u}</b>
                            </span>
                            <span style="font-size:0.85rem; background:#0284c7; color:white; padding:3px 10px; border-radius:10px; font-weight:normal;">
                                ${unitCountMap[u] || 0}개 용어
                            </span>
                        </button>
                    `).join('')}
                </div>

                <button class="quiz-choice-btn" style="
                    background:#f1f5f9; width:100%; text-align:center; justify-content:center;
                    padding:12px; font-size:1.05rem; border-radius:12px;
                " onclick="ScienceVoca.selectUnit('ALL', '${grade}')">
                    🌟 [${grade === 'ALL' ? '전체' : grade}] 모든 단원 모아보기 (${matchedRecords.length}개 용어)
                </button>
            </div>
        `;
    }

    function selectScienceUnit(unitName, grade) {
        window.selectedScienceUnit = unitName;
        const innerBody = document.getElementById('overlayInnerBody');
        const records = window.allFetchedRecords || [];

        let matchedRecords = [];
        if (grade === 'ALL') {
            matchedRecords = records;
        } else {
            matchedRecords = records.filter(r => {
                const g = r.grade || '';
                const gArr = r.grades || [];
                if (g === grade || gArr.includes(grade)) return true;
                if (grade === '5-1' && (g === '5학년 1학기' || g === '5학년' || gArr.includes('5학년 1학기') || gArr.includes('5-1'))) return true;
                if (grade === '5-2' && (g === '5학년 2학기' || gArr.includes('5학년 2학기') || gArr.includes('5-2'))) return true;
                if (grade === '5학년 1학기' && (g === '5-1' || gArr.includes('5-1'))) return true;
                if (grade === '5학년 2학기' && (g === '5-2' || gArr.includes('5-2'))) return true;
                return false;
            });
        }

        if (unitName !== 'ALL') {
            const cleanUnit = String(unitName || '').replace(/단원$/, '').trim();
            const unitNumMatch = cleanUnit.match(/^(\d+)/);
            const unitNum = unitNumMatch ? unitNumMatch[1] : cleanUnit;

            matchedRecords = matchedRecords.filter(r => {
                const levelStr = String(r.level || r.stage || '').trim();
                if (!levelStr) return false;
                if (levelStr === unitName) return true;
                if (levelStr.includes(unitName)) return true;
                if (unitNum && (levelStr.startsWith(unitNum + '.') || levelStr.startsWith(unitNum + '단원') || levelStr.includes(unitNum + '단원'))) return true;
                return false;
            });
        }

        if (typeof window.startScienceMissionWithFilteredData === 'function') {
            window.startScienceMissionWithFilteredData(matchedRecords, innerBody, `${grade} - ${unitName === 'ALL' ? '전체 종합' : unitName}`);
        }
    }

    // 🔬 단원 직결 보카 오픈 헬퍼
    async function openScienceVocaDirect(targetGrade, targetUnit) {
        window._isScienceDirectNavigating = true;
        if (typeof window.openMissionView === 'function') {
            window.openMissionView('voca');
        }

        // 노션 또는 로컬 데이터셋 로딩 완료 대기
        if (window.scienceDataLoadPromise) {
            try {
                await window.scienceDataLoadPromise;
            } catch (e) {
                console.warn("과학 데이터 로딩 대기 중 예외:", e);
            }
        } else {
            let attempts = 0;
            while ((!window.allFetchedRecords || window.allFetchedRecords.length === 0) && attempts < 25) {
                await new Promise(r => setTimeout(r, 100));
                attempts++;
            }
        }

        window._isScienceDirectNavigating = false;

        // 단원명 스마트 자동 매칭 탐색 (예: '1단원' ➔ '1. 혼합물의 분리')
        let matchedUnit = targetUnit;
        const records = window.allFetchedRecords || [];
        if (records.length > 0 && targetUnit) {
            const cleanUnit = String(targetUnit).replace(/단원$/, '').trim();
            const unitNumMatch = cleanUnit.match(/^(\d+)/);
            const unitNum = unitNumMatch ? unitNumMatch[1] : cleanUnit;

            const availableUnits = [...new Set(records.map(r => String(r.level || r.stage || '').trim()))].filter(Boolean);
            const found = availableUnits.find(u => {
                if (u === targetUnit) return true;
                if (u.includes(targetUnit)) return true;
                if (unitNum && (u.startsWith(unitNum + '.') || u.startsWith(unitNum + '단원') || u.includes(unitNum + '단원'))) return true;
                return false;
            });
            if (found) {
                matchedUnit = found;
            }
        }

        selectScienceUnit(matchedUnit, targetGrade);
    }

    // 💡 용어 퀴즈 카드 렌더링
    function renderVocaQuiz(container, currentItem, activeQuizIdx, totalCount, passageHtml) {
        const screenWrapper = document.createElement("div");
        screenWrapper.className = "quiz-card";

        const imageHtml = currentItem.img ? `
            <div class="chart-container-box">
                <div class="chart-ctrl-toolbar">
                    <div class="chart-ctrl-group">
                        <button class="card-zoom-btn" onclick="adjustCardZoom(0.4)">➕ 확대</button>
                        <button class="card-zoom-btn" onclick="adjustCardZoom(-0.4)">➖ 축소</button>
                        <button class="card-zoom-btn" onclick="resetCardZoom()">🔄 원본</button>
                    </div>
                    <button class="card-zoom-btn card-popup-btn" onclick="openImageInNewWindow('${currentItem.img}')">🪟 새창 열기</button>
                </div>
                <div class="chart-image-viewport" id="cardZoomViewport" ondragstart="return false;">
                    <img id="cardZoomImg" src="${currentItem.img}" class="chart-img" alt="${currentItem.word}" onerror="this.closest('.chart-container-box').style.display='none';">
                </div>
            </div>
        ` : '';

        screenWrapper.innerHTML = `
            ${passageHtml || ''}
            <div style="font-size: 0.95rem; opacity:0.7; margin-bottom: 8px;">용어 퀴즈 ${activeQuizIdx + 1} / ${totalCount}</div>
            <div class="quiz-hint-box" style="font-size:1.3rem; margin-bottom:12px;">초성 힌트: <strong style="color:var(--accent);">${currentItem.hint || getChosung(currentItem.word)}</strong></div>
            ${imageHtml}
            <div class="quiz-descr" style="font-size: 1.25rem; font-weight: bold; color: var(--text-main); margin-bottom:12px;">${currentItem.meaning || currentItem.desc}</div>
            <div class="interactive-input-group">
                <input type="text" class="text-input-field" id="scienceAnswerInput" placeholder="정답 용어를 입력하세요!" onkeypress="if(event.key==='Enter') ScienceVoca.verifyAnswer()">
                <button class="quiz-button" onclick="ScienceVoca.verifyAnswer()">정답 확인</button>
            </div>
            <div style="margin-top: 14px; display:flex; justify-content:center;">
                <button class="quiz-button" style="background:var(--accent);" onclick="skipToNextScienceQuiz()">건너뛰기 ⏩</button>
            </div>
        `;
        container.appendChild(screenWrapper);

        if (currentItem.img && typeof initCardZoomListeners === 'function') {
            initCardZoomListeners();
        }

        setTimeout(() => {
            const input = document.getElementById("scienceAnswerInput");
            if (input) input.focus();
        }, 100);

        if (typeof speakFairyTTS === 'function') {
            speakFairyTTS(currentItem.meaning || currentItem.desc);
        }
    }

    // 💡 용어 정답 검증
    async function verifyScienceVocaAnswer() {
        const input = document.getElementById("scienceAnswerInput");
        if (!input) return;
        const userVal = input.value.trim().replace(/\s+/g, '');
        const activeSectionData = window.activeSectionData || [];
        const activeQuizIdx = window.activeQuizIdx || 0;
        const currentItem = activeSectionData[activeQuizIdx];
        if (!currentItem) return;

        const answer = currentItem.word.trim().replace(/\s+/g, '');

        if (userVal === answer) {
            if (typeof playSoundEffect === 'function') playSoundEffect('correct');
            if (typeof speakFairyTTS === 'function') speakFairyTTS("정답이야! 잘했어!");
            alert(`🎉 정답! [${currentItem.word}] 맞습니다!`);
            if (typeof rewardQuizCorrect === 'function') {
                await rewardQuizCorrect(activeQuizIdx);
            }
            if (typeof triggerQuizAdvance === 'function') {
                triggerQuizAdvance({
                    onAdvance: window.skipToNextScienceQuiz,
                    delayMs: 1200,
                    subject: '과학',
                    explanation: `<strong>${currentItem.word}</strong> : ${currentItem.meaning || currentItem.desc || ''}`
                });
            } else if (typeof window.skipToNextScienceQuiz === 'function') {
                window.skipToNextScienceQuiz();
            }
        } else {
            if (typeof playSoundEffect === 'function') playSoundEffect('wrong');
            if (!window.wrongNotes) window.wrongNotes = [];
            window.wrongNotes.push({ word: currentItem.word, wrongInput: userVal });

            if (typeof window.promptQuizRetryOrSkip === 'function') {
                window.promptQuizRetryOrSkip({
                    onRetry: () => { input.value = ""; input.focus(); },
                    onSkip: () => { if (typeof window.skipToNextScienceQuiz === 'function') window.skipToNextScienceQuiz(); },
                    word: currentItem.word,
                    subject: '과학',
                    meaning: currentItem.meaning || currentItem.desc || null,
                    hint: currentItem.hint || currentItem.chosung || null
                });
                return;
            }

            if (typeof speakFairyTTS === 'function') speakFairyTTS("힌트를 보고 다시 맞춰봐!");
            alert("아쉬워요! 초성 힌트를 다시 확인해 보세요!");
            input.value = "";
            input.focus();
        }
    }

    // 🌟 네임스페이스 공개
    window.ScienceVoca = {
        getChosung,
        renderGradeUI: renderScienceGradeUI,
        selectGrade: selectScienceGrade,
        renderUnitUI: renderScienceUnitUI,
        selectUnit: selectScienceUnit,
        openDirect: openScienceVocaDirect,
        renderVocaQuiz,
        verifyAnswer: verifyScienceVocaAnswer
    };

    // 🌐 하위 호환성 전역 브리지
    window.getChosung = getChosung;
    window.renderScienceGradeUI = renderScienceGradeUI;
    window.selectScienceGrade = selectScienceGrade;
    window.renderScienceUnitUI = renderScienceUnitUI;
    window.selectScienceUnit = selectScienceUnit;
    window.openScienceVocaDirect = openScienceVocaDirect;
    window.verifyScienceVocaAnswer = verifyScienceVocaAnswer;

})();
