// kids/js/science_common.js

window.currentSubject = "과학"; // 전역 과목명 명시 (보상 및 학습일지 타겟용)

// ========================================================
// 🧬 초등 과학 4단원 <우리 몸의 구조와 기능> 초기 데이터 셋
// ========================================================
const SCIENCE_MOCK_DATA = {
    voca: [
        { word: "뼈와 근육", hint: "ㅃㅇ ㄱㅇ", desc: "우리 몸의 형태를 유지하고 움직이게 하는 기관입니다." },
        { word: "소화 기관", hint: "ㅅㅎ ㄱㄱ", desc: "음식물을 잘게 쪼개어 영양소를 흡수하는 기관입니다." },
        { word: "순환 기관", hint: "ㅅㅎ ㄱㄱ", desc: "심장과 혈관을 통해 온몸으로 혈액을 이동시키는 기관입니다." },
        { word: "호흡 기관", hint: "ㅎㅎ ㄱㄱ", desc: "산소를 들이마시고 이산화 탄소를 내보내는 기관입니다." },
        { word: "배설 기관", hint: "ㅂㅅ ㄱㄱ", desc: "혈액 속의 노폐물을 걸러내어 몸 밖으로 내보내는 기관입니다." },
        { word: "감각 기관", hint: "ㄱㄱ ㄱㄱ", desc: "눈, 귀, 코, 혀, 피부처럼 주변의 자극을 받아들이는 기관입니다." },
        { word: "자극과 반응", hint: "ㅈㄱㄱ ㅂㅇ", desc: "주변 환경의 변화를 느끼고 그에 맞게 행동하는 과정입니다." }
    ],
    experiment: [
        { word: "소화 모형 실험", hint: "ㅅㅎ ㅁㅎ ㅅㅎ", desc: "비닐봉지와 스타킹을 이용해 위와 장의 역할을 알아보는 실험입니다." },
        { word: "폐 모형 만들기", hint: "ㅍ ㅁㅎ ㅁㄷㄱ", desc: "페트병과 고무풍선을 이용해 호흡의 원리를 알아보는 실험입니다." }
    ],
    nature: [
        { word: "심장장박동", hint: "ㅅㅈㅈㅂㄷ", desc: "가슴에 손을 얹었을 때 느껴지는 규칙적인 움직임입니다." },
        { word: "땀 분비", hint: "ㄸ ㅂㅂ", desc: "더울 때 체온을 조절하기 위해 피부에서 물방울이 나오는 현상입니다." }
    ],
    inventor: [
        { word: "청진기", hint: "ㅊㅈㄱ", desc: "몸속에서 나는 소리를 듣기 위해 의사 선생님들이 사용하는 도구입니다." },
        { word: "현미경", hint: "ㅎㅁㄱ", desc: "눈에 보이지 않는 아주 작은 세포나 세균을 크게 확대해서 보는 도구입니다." }
    ]
};

let currentMissionType = '';
let activeSectionData = [];
let activeQuizIdx = 0;
let scienceVocaMasterCountMap = {};

// ========================================================
// 🚀 초기화 및 UI 제어
// ========================================================
function initializeScienceRoom() {
    console.log("🧬 과학방 초기화 완료!");
    // 로컬 스토리지에서 마스터 기록 불러오기
    const currentUserName = localStorage.getItem('currentUserName') || '민수';
    scienceVocaMasterCountMap = JSON.parse(localStorage.getItem(`science_voca_master_${currentUserName}`) || '{}');
}

function openMissionView(type) {
    currentMissionType = type;
    activeQuizIdx = 0;
    
    // 데이터 로드
    activeSectionData = SCIENCE_MOCK_DATA[type] || [];
    
    // 마스터한 단어 필터링 (용어방 전용)
    if (type === 'voca') {
        activeSectionData = activeSectionData.filter(item => {
            return (scienceVocaMasterCountMap[item.word] || 0) < 3;
        });
        // 섞기
        activeSectionData.sort(() => Math.random() - 0.5);
    }

    const overlay = document.getElementById('missionOverlay');
    const titleEl = document.getElementById('overlayHeaderTitle');
    const iconEl = document.getElementById('overlayHeaderIcon');
    
    if (type === 'voca') {
        titleEl.textContent = "과학 용어방";
        iconEl.textContent = "🔬";
    } else if (type === 'experiment') {
        titleEl.textContent = "가상 실험실";
        iconEl.textContent = "🧪";
    } else if (type === 'nature') {
        titleEl.textContent = "자연 생태 탐험실";
        iconEl.textContent = "🌿";
    } else if (type === 'inventor') {
        titleEl.textContent = "위대한 발명가 돋보기";
        iconEl.textContent = "💡";
    }

    overlay.style.display = 'flex';
    renderSectionUI();
}

function closeMissionView() {
    document.getElementById('missionOverlay').style.display = 'none';
}

// ========================================================
// 🖌️ 동적 UI 렌더링 및 스위칭 알고리즘
// ========================================================
function renderSectionUI() {
    const container = document.getElementById('overlayInnerBody');
    container.innerHTML = "";
    
    if (!activeSectionData || activeSectionData.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding: 40px 20px;">
                <div style="font-size:3rem; margin-bottom:15px;">🎉</div>
                <p style="font-size:1.4rem; color:var(--primary); margin-bottom:20px;">이 구역의 모든 미션을 완벽하게 마스터했습니다!</p>
                <button class="back-to-lobby-btn" onclick="triggerAwardDispense(10, currentMissionType); closeMissionView();">🎁 보상 받기</button>
            </div>`;
        return;
    }

    const currentItem = activeSectionData[activeQuizIdx];
    const answerWord = currentItem.word;
    
    // 💡 대장님의 [띄어쓰기 유무 및 단어 개수 기반 자동 퀴즈 UI 스위칭 알고리즘]
    const wordsArray = answerWord.trim().split(/\s+/);
    const wordCount = wordsArray.length; // 띄어쓰기로 구분된 단어 개수
    const totalLength = answerWord.replace(/\s/g, '').length; // 띄어쓰기를 제외한 순수 글자 수
    
    let interactiveHtml = '';
    
    if (wordCount === 1 && totalLength >= 5) {
        // 💡 조건 1: 띄어쓰기 없는 '1개 단어'인데 5글자 이상인 경우
        // ➔ 낱말 카드 툭툭 고르는 [빈칸 채우기 UI]
        const chars = answerWord.split('').filter(c => c.trim() !== '');
        const scrambled = [...chars].sort(() => Math.random() - 0.5);
        
        window.currentMagnetAnswer = [];
        window.magnetTargetWord = answerWord;
        window.magnetScrambled = scrambled;
        
        interactiveHtml = `
            <div id="magnet-blanks" style="font-size: 2rem; letter-spacing: 5px; margin-bottom: 20px; min-height: 40px; display: flex; justify-content: center; gap: 5px;">
                ${answerWord.split('').map(c => c.trim() === '' ? '<span style="width:15px;"></span>' : '<span style="border-bottom:3px solid #ccc; width:30px; display:inline-block; text-align:center;">_</span>').join('')}
            </div>
            <div id="magnet-pool" style="display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-bottom: 20px;">
                ${scrambled.map((l, i) => `<button id="magnet-btn-${i}" class="quiz-choice-btn" style="padding: 10px 20px; font-size: 1.5rem;" onclick="selectScienceMagnet('${l}', ${i})">${l}</button>`).join('')}
            </div>
            <div style="display: flex; gap: 10px; justify-content: center;">
                <button class="quiz-button" style="background:#ff9f43;" onclick="resetScienceMagnets()">다시 조합하기</button>
                <button class="quiz-button" onclick="verifyScienceMagnet()">정답 확인</button>
            </div>
        `;
    } else if (wordCount >= 3) {
        // 💡 조건 2: 띄어쓰기가 있는 답 중 '3단어 이상' 결합된 경우
        // ➔ 보기에서 고르는 [객관식 문제 UI]
        const choices = [answerWord];
        // 오답 생성 (다른 단어들 중에서 랜덤 추출)
        const allWords = Object.values(SCIENCE_MOCK_DATA).flat().map(item => item.word).filter(w => w !== answerWord);
        allWords.sort(() => Math.random() - 0.5);
        choices.push(allWords[0] || "오답1");
        choices.push(allWords[1] || "오답2");
        choices.sort(() => Math.random() - 0.5);
        
        interactiveHtml = `
            <div class="quiz-choices-container" style="margin-bottom: 20px; display: flex; flex-direction: column; gap: 10px;">
                ${choices.map((choice, i) => `
                     <button class="quiz-choice-btn" onclick="verifyScienceChoice('${choice}')">${choice}</button>
                `).join('')}
            </div>
        `;
    } else {
        // 💡 조건 3: 4글자 이하 단어이거나, 2단어 이하 결합인 경우
        // ➔ 기존 주관식 타이핑 UI
        interactiveHtml = `
            <div class="interactive-input-group">
                <input type="text" class="text-input-field" id="scienceAnswerInput" placeholder="정답을 입력하세요!" onkeypress="if(event.key==='Enter') verifyScienceAnswer()">
                <button class="quiz-button" onclick="verifyScienceAnswer()">정답 확인</button>
            </div>
        `;
    }

    container.innerHTML = `
        <div class="quiz-card">
            <div style="font-size: 0.95rem; opacity:0.7; margin-bottom: 10px;">미션 ${activeQuizIdx + 1} / ${activeSectionData.length}</div>
            <div class="quiz-hint-box">초성 힌트: ${currentItem.hint}</div>
            <div class="quiz-descr">${currentItem.desc}</div>
            ${interactiveHtml}
            <div style="margin-top: 20px; display: flex; gap: 8px; justify-content: center;">
                <button class="quiz-button" style="background:#8b949e;" onclick="speakFairyTTS('${currentItem.desc}')">🔊 설명 듣기</button>
                <button class="quiz-button" style="background:var(--accent);" onclick="skipToNextQuiz()">건너뛰기 ⏩</button>
            </div>
        </div>
    `;
    
    // 자동 낭독
    if (typeof speakFairyTTS === 'function') {
        speakFairyTTS(currentItem.desc);
    }
}

// ========================================================
// ✏️ 문제 검증 및 정답 처리 로직
// ========================================================
function handleCorrectAnswer() {
    const currentUserName = localStorage.getItem('currentUserName') || '민수';
    const wordKey = activeSectionData[activeQuizIdx].word;
    
    // 마스터 카운트 증가
    scienceVocaMasterCountMap[wordKey] = (scienceVocaMasterCountMap[wordKey] || 0) + 1;
    localStorage.setItem(`science_voca_master_${currentUserName}`, JSON.stringify(scienceVocaMasterCountMap));

    if (typeof speakFairyTTS === 'function') speakFairyTTS("정답이야! 아주 훌륭해!");
    
    setTimeout(() => skipToNextQuiz(), 1200);
}

function handleWrongAnswer(wrongInput) {
    if (typeof speakFairyTTS === 'function') speakFairyTTS("아쉽다. 다시 한번 생각해봐!");
    
    // 오답 기록
    if (typeof window.wrongNotes === 'undefined') window.wrongNotes = [];
    window.wrongNotes.push({
        word: activeSectionData[activeQuizIdx].word,
        wrongInput: wrongInput
    });
}

// 1. 주관식 타이핑 검증
window.verifyScienceAnswer = function() {
    const input = document.getElementById('scienceAnswerInput');
    const answer = input.value.trim().replace(/\s/g, '');
    const correctTarget = activeSectionData[activeQuizIdx].word.replace(/\s/g, '');

    if (answer === correctTarget) {
        input.classList.add('correct-glow');
        handleCorrectAnswer();
    } else {
        input.classList.add('wrong-shake');
        handleWrongAnswer(input.value);
        setTimeout(() => {
            input.classList.remove('wrong-shake');
            input.value = "";
            input.focus();
        }, 800);
    }
}

// 2. 객관식 선택 검증
window.verifyScienceChoice = function(selectedWord) {
    const correctTarget = activeSectionData[activeQuizIdx].word;
    if (selectedWord === correctTarget) {
        handleCorrectAnswer();
    } else {
        handleWrongAnswer(selectedWord);
    }
}

// 3. 자석 빈칸 채우기 로직
window.selectScienceMagnet = function(letter, idx) {
    const btn = document.getElementById(`magnet-btn-${idx}`);
    if (btn.style.visibility === 'hidden') return;
    btn.style.visibility = 'hidden';
    window.currentMagnetAnswer.push({ letter, idx });
    renderScienceMagnetBlanks();
}

window.renderScienceMagnetBlanks = function() {
    const container = document.getElementById('magnet-blanks');
    if (!container) return;
    let html = '';
    let answerIdx = 0;
    for (let i = 0; i < window.magnetTargetWord.length; i++) {
        const char = window.magnetTargetWord[i];
        if (char.trim() === '') {
            html += '<span style="width:15px;"></span>';
        } else {
            if (answerIdx < window.currentMagnetAnswer.length) {
                html += `<span style="border-bottom:3px solid var(--primary); width:30px; display:inline-block; text-align:center; color:var(--primary); font-weight:bold;">${window.currentMagnetAnswer[answerIdx].letter}</span>`;
                answerIdx++;
            } else {
                html += '<span style="border-bottom:3px solid #ccc; width:30px; display:inline-block; text-align:center;">_</span>';
            }
        }
    }
    container.innerHTML = html;
}

window.resetScienceMagnets = function() {
    window.currentMagnetAnswer.forEach(item => {
        const btn = document.getElementById(`magnet-btn-${item.idx}`);
        if (btn) btn.style.visibility = 'visible';
    });
    window.currentMagnetAnswer = [];
    renderScienceMagnetBlanks();
}

window.verifyScienceMagnet = function() {
    const answerStr = window.currentMagnetAnswer.map(item => item.letter).join('');
    const correctTarget = window.magnetTargetWord.replace(/\s/g, '');
    
    if (answerStr === correctTarget) {
        handleCorrectAnswer();
    } else {
        handleWrongAnswer(answerStr);
        const container = document.getElementById('magnet-blanks');
        if (container) {
            container.classList.add('wrong-shake');
            setTimeout(() => container.classList.remove('wrong-shake'), 800);
        }
    }
}

// ========================================================
// ⏭️ 진행 및 보상
// ========================================================
function skipToNextQuiz() {
    activeQuizIdx++;
    if (activeQuizIdx >= activeSectionData.length) {
        if (typeof speakFairyTTS === 'function') speakFairyTTS("모든 미션을 완료했어! 훌륭해!");
        alert("🏆 축하합니다! 이 구역의 모든 과학 탐구 단계를 완료하셨습니다!");
        
        if (typeof sendStudyLogToNotion === 'function') {
            sendStudyLogToNotion({ subject: "과학" });
        }
        
        triggerAwardDispense(10, currentMissionType);
        closeMissionView();
    } else {
        renderSectionUI();
    }
}

async function triggerAwardDispense(amount, type) {
    let customExp = (type === 'voca') ? 'voca' : null;
    try {
        if (typeof grantRewardAndShowUI === 'function') {
            await grantRewardAndShowUI(amount, false, customExp); 
        }
    } catch(err) {
        console.warn("보상 지급 중 로컬 백엔드 연동 모듈 우회:", err);
    }
}

// 퇴장 시 일지 작성
window.addEventListener("beforeunload", () => {
    if (typeof sendStudyLogToNotion === 'function') {
        sendStudyLogToNotion({ subject: "과학" });
    }
});