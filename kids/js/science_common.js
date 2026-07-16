// kids/js/science_common.js

window.currentSubject = "과학";

const currentUserName = localStorage.getItem('currentUserName') || '민수';
const isAdmin = (currentUserName === '아빠' || currentUserName === '엄마');

const SCIENCE_ZONE_MAP = {
    voca: "용어방",
    experiment: "실험실",
    nature: "자연탐험",
    inventor: "발명가"
};

// 노션 데이터가 비어 있을 때 사용하는 폴백 셋
const SCIENCE_MOCK_DATA = {
    voca: [
        { word: "뼈와 근육", hint: "ㅃㅇ ㄱㅇ", meaning: "우리 몸의 형태를 유지하고 움직이게 하는 기관입니다.", desc: "뼈는 몸을 지탱하고 내장을 보호하며, 근육은 뼈에 붙어 몸을 움직이게 합니다.", image: "https://images.unsplash.com/photo-1530026405186-ed1f139313f8?w=500&auto=format&fit=crop" },
        { word: "소화 기관", hint: "ㅅㅎ ㄱㄱ", meaning: "음식물을 잘게 쪼개어 영양소를 흡수하는 기관입니다.", desc: "입, 식도, 위, 작은창자, 큰창자, 항문 등이 소화 기관에 속합니다." },
        { word: "순환 기관", hint: "ㅅㅎ ㄱㄱ", meaning: "심장과 혈관을 통해 온몸으로 혈액을 이동시키는 기관입니다.", desc: "혈액은 영양소와 산소를 온몸으로 운반하고, 노폐물을 거두어옵니다." },
        { word: "호흡 기관", hint: "ㅎㅎ ㄱㄱ", meaning: "산소를 들이마시고 이산화 탄소를 내보내는 기관입니다.", desc: "코, 기관, 기관지, 폐가 호흡 기관에 속하며 생명 유지에 필수적입니다." },
        { word: "배설 기관", hint: "ㅂㅅ ㄱㄱ", meaning: "혈액 속의 노폐물을 걸러내어 몸 밖으로 내보내는 기관입니다.", desc: "콩팥은 혈액 속 노폐물을 걸러 오줌을 만들고, 방광은 오줌을 모아둡니다." },
        { word: "감각 기관", hint: "ㄱㄱ ㄱㄱ", meaning: "눈, 귀, 코, 혀, 피부처럼 주변의 자극을 받아들이는 기관입니다.", desc: "시각, 청각, 후각, 미각, 촉각을 통해 위험을 피하고 환경에 적응합니다." },
        { word: "자극과 반응", hint: "ㅈㄱㄱ ㅂㅇ", meaning: "주변 환경의 변화를 느끼고 그에 맞게 행동하는 과정입니다.", desc: "감각 기관이 자극을 느끼면 뇌가 판단하여 운동 기관에 명령을 내립니다." }
    ],
    experiment: [
        { word: "소화 모형 실험", hint: "ㅅㅎ ㅁㅎ ㅅㅎ", meaning: "비닐봉지와 스타킹을 이용해 위와 장의 역할을 알아보는 실험입니다.", desc: "비닐봉지는 음식물을 섞는 위, 스타킹은 영양소를 흡수하는 장의 역할을 합니다." },
        { word: "폐 모형 만들기", hint: "ㅍ ㅁㅎ ㅁㄷㄱ", meaning: "페트병과 고무풍선을 이용해 호흡의 원리를 알아보는 실험입니다.", desc: "고무막을 당기면 풍선(폐)이 부풀고, 밀어 넣으면 풍선이 쪼그라듭니다." }
    ],
    nature: [
        { word: "심장 박동", hint: "ㅅㅈ ㅂㄷ", meaning: "가슴에 손을 얹었을 때 느껴지는 규칙적인 움직임입니다.", desc: "심장이 수축과 이완을 반복하며 혈액을 온몸으로 뿜어내는 과정입니다." },
        { word: "땀 분비", hint: "ㄸ ㅂㅂ", meaning: "더울 때 체온을 조절하기 위해 피부에서 물방울이 나오는 현상입니다.", desc: "땀이 증발하면서 몸의 열을 빼앗아 체온을 정상으로 유지해 줍니다." }
    ],
    inventor: [
        { word: "청진기", hint: "ㅊㅈㄱ", meaning: "몸속에서 나는 소리를 듣기 위해 의사 선생님들이 사용하는 도구입니다.", desc: "심장 소리나 숨소리를 들어 우리 몸이 건강한지 진찰할 때 씁니다." },
        { word: "현미경", hint: "ㅎㅁㄱ", meaning: "눈에 보이지 않는 아주 작은 세포나 세균을 크게 확대해서 보는 도구입니다.", desc: "렌즈를 여러 개 겹쳐서 물체를 수백 배에서 수천 배까지 크게 보여줍니다." }
    ]
};

const SCIENCE_MISSION_META = {
    voca: { title: "과학 용어방", icon: "🔬" },
    experiment: { title: "가상 실험실", icon: "🧪" },
    nature: { title: "자연 생태 탐험실", icon: "🌿" },
    inventor: { title: "위대한 발명가 돋보기", icon: "💡" }
};

let allFetchedRecords = [];
let selectedScienceGrade = "";
let selectedScienceUnit = "";
let currentMissionType = '';
let activeSectionData = [];
let activeQuizIdx = 0;
let scienceVocaMasterCountMap = {};
let scienceVocaOrderType = 'shuffle';

if (!window.stopFairyTTS) {
    window.stopFairyTTS = function() {};
}
if (!window.speakFairyTTS) {
    window.speakFairyTTS = function() {};
}

function getChosung(str) {
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

function initializeScienceRoom() {
    console.log("🧬 과학방 초기화 완료!");
    scienceVocaMasterCountMap = JSON.parse(localStorage.getItem(`science_voca_master_${currentUserName}`) || '{}');
}

function showLoadingSpinner(container) {
    container.innerHTML = `
      <div class="spinner-wrapper">
        <div class="spinner-circle"></div>
        <p style="font-family:'Gaegu', cursive; font-size:1.3rem; font-weight:bold; color:inherit; text-align:center; opacity: 0.95;">
            Fairy_🧚‍♀️ 코코 요정이 노션 등대에서 자료를 챙겨오고 있어요...
        </p>
      </div>
    `;
}

function openMissionView(type) {
    const overlay = document.getElementById('missionOverlay');
    const titleEl = document.getElementById('overlayHeaderTitle');
    const iconEl = document.getElementById('overlayHeaderIcon');
    const innerBody = document.getElementById('overlayInnerBody');
    const meta = SCIENCE_MISSION_META[type] || { title: "과학 미션", icon: "🔬" };

    overlay.style.display = 'flex';
    activeQuizIdx = 0;
    currentMissionType = type;
    selectedScienceGrade = "";
    selectedScienceUnit = "";
    stopFairyTTS();

    if (typeof initQuizRewardSession === 'function') {
        initQuizRewardSession(type);
    }

    titleEl.textContent = meta.title;
    iconEl.textContent = meta.icon;

    showLoadingSpinner(innerBody);
    fetchAndBuildDynamicUI(type, innerBody);
}

function closeMissionView() {
    if (typeof finalizeQuizRewardSession === 'function') {
        finalizeQuizRewardSession();
    }
    document.getElementById('missionOverlay').style.display = 'none';
    stopFairyTTS();
}

async function fetchAndBuildDynamicUI(type, innerBody) {
    const zoneTag = SCIENCE_ZONE_MAP[type];

    try {
        const records = await fetchVocaFromNotion({
            subject: "과학",
            areaZone: zoneTag,
            useServerFilter: true,
            filterByStudent: !isAdmin
        });

        if (records && records.length > 0) {
            allFetchedRecords = records;
            const uniqueGrades = [...new Set(records.flatMap(r => r.grades || [r.grade]))].filter(g => g && g !== "공통").sort();

            if (uniqueGrades.length === 0) {
                startMissionWithFilteredData(records, innerBody);
            } else {
                renderDynamicGradeUI(uniqueGrades, innerBody);
            }
        } else {
            console.warn("⚠️ 과학 노션 데이터 없음. 로컬 폴백 사용:", type);
            loadMockMissionData(type, innerBody);
        }
    } catch (e) {
        console.warn("과학 노션 통신 실패. 로컬 폴백 사용", e);
        loadMockMissionData(type, innerBody);
    }
}

function renderDynamicGradeUI(grades, container) {
    const buttonsHtml = grades.map(g =>
        `<button class="quiz-choice-btn" style="padding:15px; font-size:1.2rem;" onclick="selectScienceGrade('${g}')">${g}</button>`
    ).join('');

    container.innerHTML = `
        <div style="text-align:center; padding:20px; font-family:'Jua'; width:100%; max-width:500px; margin:0 auto;">
            <h3 style="margin-bottom:20px; color:var(--primary); font-size:1.6rem;">🎒 1. 학년/학기 고르기</h3>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                ${buttonsHtml}
            </div>
        </div>
    `;
}

window.selectScienceGrade = function(grade) {
    selectedScienceGrade = grade;
    const innerBody = document.getElementById('overlayInnerBody');
    const matchedRecords = allFetchedRecords.filter(r => r.grade === grade || (r.grades || []).includes(grade));
    const uniqueUnits = [...new Set(matchedRecords.map(r => String(r.level).trim()))].filter(u => u && u !== "undefined" && u !== "기본 단원").sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    if (uniqueUnits.length === 0) {
        startMissionWithFilteredData(matchedRecords, innerBody);
    } else {
        renderDynamicUnitUI(uniqueUnits, innerBody);
    }
};

function renderDynamicUnitUI(units, container) {
    const buttonsHtml = units.map(u =>
        `<button class="quiz-choice-btn" style="padding:15px 5px; font-size:1.1rem;" onclick="selectScienceUnit('${u}')">${u}</button>`
    ).join('');

    container.innerHTML = `
        <div style="text-align:center; padding:20px; font-family:'Jua'; width:100%; max-width:500px; margin:0 auto;">
            <h3 style="margin-bottom:5px; color:var(--primary); font-size:1.6rem;">📖 2. 단원 고르기</h3>
            <p style="color:var(--accent); margin-bottom:20px; font-size:1.1rem;">선택된 학기: ${selectedScienceGrade}</p>
            <div style="display:grid; grid-template-columns:repeat(2, 1fr); gap:10px; margin-bottom:20px;">
                ${buttonsHtml}
            </div>
            <button class="quiz-button" style="background:#8b949e; width:100%;" onclick="openMissionView(currentMissionType)">⬅️ 처음으로 돌아가기</button>
        </div>
    `;
}

window.selectScienceUnit = function(unit) {
    selectedScienceUnit = unit;
    const innerBody = document.getElementById('overlayInnerBody');
    const finalRecords = allFetchedRecords.filter(r =>
        (r.grade === selectedScienceGrade || (r.grades || []).includes(selectedScienceGrade)) &&
        String(r.level).trim() === unit
    );
    startMissionWithFilteredData(finalRecords, innerBody);
};

function parseScienceRecords(records) {
    return records.map(record => {
        const titleStr = record.word || "미상";
        return {
            word: titleStr,
            meaning: record.meaning || "뜻풀이 없음",
            hint: record.hint || getChosung(titleStr),
            desc: record.detailContext || record.meaning || "상세 설명이 노션에 기재 대기 중입니다.",
            image: record.imageUrl,
            imageUrl: record.imageUrl,
            pageId: record.pageId,
            isMastered: record.isMastered
        };
    });
}

function loadMockMissionData(type, innerBody) {
    allFetchedRecords = [];
    let data = [...(SCIENCE_MOCK_DATA[type] || [])];

    if (type === 'voca') {
        data = data.filter(item => (scienceVocaMasterCountMap[item.word] || 0) < 3);
        if (scienceVocaOrderType === 'shuffle') {
            data.sort(() => Math.random() - 0.5);
        }
    }

    activeSectionData = data;
    renderSectionUI(type, innerBody);
}

function startMissionWithFilteredData(records, innerBody) {
    const parsed = parseScienceRecords(records);

    if (currentMissionType === 'voca') {
        scienceVocaMasterCountMap = JSON.parse(localStorage.getItem(`science_voca_master_${currentUserName}`) || '{}');
        activeSectionData = parsed.filter(item => {
            const isNotionMastered = item.isMastered === true;
            const isLocalMastered = (scienceVocaMasterCountMap[item.word] || 0) >= 3;
            return !isNotionMastered && !isLocalMastered;
        });
        if (scienceVocaOrderType === 'shuffle') {
            activeSectionData.sort(() => Math.random() - 0.5);
        }
    } else {
        activeSectionData = parsed;
        if (scienceVocaOrderType === 'shuffle') {
            activeSectionData.sort(() => Math.random() - 0.5);
        }
    }

    if (selectedScienceGrade) {
        const badge = ` [${selectedScienceGrade}${selectedScienceUnit ? ' ' + selectedScienceUnit : ''}]`;
        document.getElementById('overlayHeaderTitle').textContent = SCIENCE_MISSION_META[currentMissionType].title + badge;
    }

    renderSectionUI(currentMissionType, innerBody);
}

function getScienceOrderToggleHtml() {
    return `
        <div style="display:flex; justify-content:center; align-items:center; margin-bottom: 20px;">
            <button class="quiz-button" onclick="window.scienceToggleOrder()" style="padding: 8px 16px; font-size: 0.95rem; border-radius: 20px;">
                ${scienceVocaOrderType === 'shuffle' ? '🎲 랜덤 섞기 (클릭하여 순서대로)' : '➡️ 순서대로 (클릭하여 랜덤 섞기)'}
            </button>
        </div>
    `;
}

window.scienceToggleOrder = function() {
    scienceVocaOrderType = (scienceVocaOrderType === 'shuffle') ? 'sequence' : 'shuffle';
    activeQuizIdx = 0;
    const innerBody = document.getElementById('overlayInnerBody');
    if (!innerBody) return;

    if (allFetchedRecords.length > 0) {
        let matchedRecords = allFetchedRecords;
        if (selectedScienceGrade) {
            matchedRecords = matchedRecords.filter(r =>
                r.grade === selectedScienceGrade || (r.grades || []).includes(selectedScienceGrade)
            );
        }
        if (selectedScienceUnit) {
            matchedRecords = matchedRecords.filter(r => String(r.level).trim() === selectedScienceUnit);
        }
        startMissionWithFilteredData(matchedRecords, innerBody);
    } else {
        loadMockMissionData(currentMissionType, innerBody);
    }
};

window.resetScienceVocaMasterAndReload = async function() {
    if (!confirm("정말로 이 단원의 모든 용어 마스터(3회 정답) 기록을 지우고 처음부터 다시 시작할까요?")) return;

    const innerBody = document.getElementById('overlayInnerBody');
    if (innerBody) innerBody.innerHTML = "<div style='text-align:center; padding:40px;'>노션 데이터를 초기화 중입니다... ⏳</div>";

    localStorage.removeItem(`science_voca_master_${currentUserName}`);

    const recordsToReset = allFetchedRecords.filter(r =>
        (!selectedScienceGrade || r.grade === selectedScienceGrade || (r.grades || []).includes(selectedScienceGrade)) &&
        (!selectedScienceUnit || String(r.level).trim() === selectedScienceUnit) &&
        r.isMastered === true
    );

    if (typeof updateVocaMasteryStatus === 'function') {
        for (const r of recordsToReset) {
            await updateVocaMasteryStatus(r.pageId, false);
            r.isMastered = false;
        }
    }

    alert("학습 기록이 초기화되었습니다! 다시 신나게 풀어볼까요?");
    closeMissionView();
    setTimeout(() => openMissionView('voca'), 300);
};

function getScienceWrongChoicePool(answerWord) {
    const fromNotion = allFetchedRecords.map(r => r.word).filter(Boolean);
    const fromMock = Object.values(SCIENCE_MOCK_DATA).flat().map(item => item.word);
    const pool = fromNotion.length > 0 ? fromNotion : fromMock;
    return pool.filter(w => w !== answerWord);
}

function renderSectionUI(type, container) {
    if (typeof container === 'string') container = document.getElementById('overlayInnerBody');
    container.innerHTML = "";

    if (!activeSectionData || activeSectionData.length === 0) {
        if (type === 'voca') {
            container.innerHTML = `
                <div style="text-align:center; padding: 40px 20px;">
                    <div style="font-size:3rem; margin-bottom:15px;">🎉</div>
                    <p style="font-size:1.4rem; color:var(--primary); margin-bottom:20px;">이 단원의 모든 용어를 완벽하게 마스터했습니다! 대단해요!</p>
                    <button class="back-to-lobby-btn" style="background:var(--accent);" onclick="closeMissionView(); resetScienceVocaMasterAndReload()">✅ 나가기 (학습 리셋)</button>
                </div>`;
        } else {
            container.innerHTML = `
                <div style="text-align:center; padding: 40px 20px;">
                    <div style="font-size:3rem; margin-bottom:15px;">📭</div>
                    <p style="font-size:1.2rem; color:var(--primary); margin-bottom:20px;">노션에 아직 이 구역 데이터가 없어요.<br>준비되면 자동으로 불러올게요!</p>
                    <button class="back-to-lobby-btn" onclick="closeMissionView();">✅ 나가기</button>
                </div>`;
        }
        return;
    }

    const currentItem = activeSectionData[activeQuizIdx];
    const answerWord = currentItem.word;
    const imageUrl = currentItem.imageUrl || currentItem.image || currentItem.img;
    const imageHtml = imageUrl ? `
        <div style="text-align:center; margin-bottom:15px;">
            <img src="${imageUrl}" style="max-width:100%; max-height:200px; border-radius:10px; box-shadow:0 4px 8px rgba(0,0,0,0.2); object-fit:contain;" alt="${currentItem.word}">
        </div>
    ` : '';

    const wordsArray = answerWord.trim().split(/\s+/);
    const wordCount = wordsArray.length;
    const totalLength = answerWord.replace(/\s/g, '').length;
    let interactiveHtml = '';

    if (wordCount === 1 && totalLength >= 5) {
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
        const choices = [answerWord];
        const otherWords = getScienceWrongChoicePool(answerWord);
        otherWords.sort(() => Math.random() - 0.5);
        choices.push(otherWords[0] || "오답1");
        choices.push(otherWords[1] || "오답2");
        choices.sort(() => Math.random() - 0.5);

        interactiveHtml = `
            <div class="quiz-choices-container" style="margin-bottom: 20px; display: flex; flex-direction: column; gap: 10px;">
                ${choices.map(choice => `
                     <button class="quiz-choice-btn" onclick="verifyScienceChoice('${choice.replace(/'/g, "\\'")}')">${choice}</button>
                `).join('')}
            </div>
        `;
    } else {
        interactiveHtml = `
            <div class="interactive-input-group">
                <input type="text" class="text-input-field" id="scienceAnswerInput" placeholder="정답을 입력하세요!" onkeypress="if(event.key==='Enter') verifyScienceAnswer()">
                <button class="quiz-button" onclick="verifyScienceAnswer()">정답 확인</button>
            </div>
        `;
    }

    const orderToggleHtml = type === 'voca' ? getScienceOrderToggleHtml() : '';

    container.innerHTML = `
        <div class="quiz-card">
            ${orderToggleHtml}
            <div style="font-size: 0.95rem; opacity:0.7; margin-bottom: 10px;">미션 ${activeQuizIdx + 1} / ${activeSectionData.length}</div>
            <div class="quiz-hint-box">초성 힌트: ${currentItem.hint}</div>
            ${imageHtml}
            <div class="quiz-descr" style="font-size: 1.4rem; font-weight: bold; color: var(--text-main);">${currentItem.meaning}</div>
            <details style="margin-bottom: 20px; text-align: left; background: #f8f9fa; border-radius: 10px; padding: 10px; border: 1px solid #ddd;">
                <summary style="cursor: pointer; font-weight: bold; color: var(--primary);">💡 상세설명 (힌트) 보기</summary>
                <div style="margin-top: 10px; font-size: 1rem; color: #555; line-height: 1.5;">${currentItem.desc}</div>
            </details>
            ${interactiveHtml}
            <div style="margin-top: 20px; display: flex; gap: 8px; justify-content: center;">
                <button class="quiz-button" style="background:#8b949e;" onclick="speakFairyTTS('${(currentItem.meaning || '').replace(/'/g, "\\'")}')">🔊 문제 듣기</button>
                <button class="quiz-button" style="background:var(--accent);" onclick="skipToNextQuiz()">건너뛰기 ⏭️</button>
            </div>
        </div>
    `;

    if (typeof speakFairyTTS === 'function') {
        speakFairyTTS(currentItem.meaning);
    }
}

async function handleCorrectAnswer() {
    const wordKey = activeSectionData[activeQuizIdx].word;

    if (currentMissionType === 'voca') {
        scienceVocaMasterCountMap[wordKey] = (scienceVocaMasterCountMap[wordKey] || 0) + 1;
        localStorage.setItem(`science_voca_master_${currentUserName}`, JSON.stringify(scienceVocaMasterCountMap));

        if (scienceVocaMasterCountMap[wordKey] >= 3) {
            const pageId = activeSectionData[activeQuizIdx].pageId;
            if (pageId && typeof updateVocaMasteryStatus === 'function') {
                updateVocaMasteryStatus(pageId, true);
                activeSectionData[activeQuizIdx].isMastered = true;
            }
        }
    }

    if (typeof speakFairyTTS === 'function') speakFairyTTS("정답이야! 아주 훌륭해!");
    if (typeof rewardQuizCorrect === 'function') {
        await rewardQuizCorrect(activeQuizIdx);
    }

    setTimeout(() => skipToNextQuiz(), 1200);
}

function handleWrongAnswer(wrongInput, onRetryReset) {
    if (typeof window.wrongNotes === 'undefined') window.wrongNotes = [];
    window.wrongNotes.push({
        word: activeSectionData[activeQuizIdx].word,
        wrongInput: wrongInput
    });

    const retry = typeof onRetryReset === 'function' ? onRetryReset : () => {};
    const skip = () => skipToNextQuiz();

    if (typeof promptQuizRetryOrSkip === 'function') {
        promptQuizRetryOrSkip({ onRetry: retry, onSkip: skip });
        return;
    }

    if (typeof speakFairyTTS === 'function') speakFairyTTS("아쉽다. 다시 한번 생각해봐!");
    retry();
}

window.verifyScienceAnswer = function() {
    const input = document.getElementById('scienceAnswerInput');
    const answer = input.value.trim().replace(/\s/g, '');
    const correctTarget = activeSectionData[activeQuizIdx].word.replace(/\s/g, '');

    if (answer === correctTarget) {
        input.classList.add('correct-glow');
        handleCorrectAnswer();
    } else {
        input.classList.add('wrong-shake');
        handleWrongAnswer(input.value, () => {
            input.classList.remove('wrong-shake');
            input.value = '';
            input.focus();
        });
    }
};

window.verifyScienceChoice = function(selectedWord) {
    const correctTarget = activeSectionData[activeQuizIdx].word;
    if (selectedWord === correctTarget) {
        handleCorrectAnswer();
    } else {
        handleWrongAnswer(selectedWord, () => {});
    }
};

window.selectScienceMagnet = function(letter, idx) {
    const btn = document.getElementById(`magnet-btn-${idx}`);
    if (btn.style.visibility === 'hidden') return;
    btn.style.visibility = 'hidden';
    window.currentMagnetAnswer.push({ letter, idx });
    renderScienceMagnetBlanks();
};

window.renderScienceMagnetBlanks = function() {
    const container = document.getElementById('magnet-blanks');
    if (!container) return;
    let html = '';
    let answerIdx = 0;
    for (let i = 0; i < window.magnetTargetWord.length; i++) {
        const char = window.magnetTargetWord[i];
        if (char.trim() === '') {
            html += '<span style="width:15px;"></span>';
        } else if (answerIdx < window.currentMagnetAnswer.length) {
            html += `<span style="border-bottom:3px solid var(--primary); width:30px; display:inline-block; text-align:center; color:var(--primary); font-weight:bold;">${window.currentMagnetAnswer[answerIdx].letter}</span>`;
            answerIdx++;
        } else {
            html += '<span style="border-bottom:3px solid #ccc; width:30px; display:inline-block; text-align:center;">_</span>';
        }
    }
    container.innerHTML = html;
};

window.resetScienceMagnets = function() {
    window.currentMagnetAnswer.forEach(item => {
        const btn = document.getElementById(`magnet-btn-${item.idx}`);
        if (btn) btn.style.visibility = 'visible';
    });
    window.currentMagnetAnswer = [];
    renderScienceMagnetBlanks();
};

window.verifyScienceMagnet = function() {
    const answerStr = window.currentMagnetAnswer.map(item => item.letter).join('');
    const correctTarget = window.magnetTargetWord.replace(/\s/g, '');

    if (answerStr === correctTarget) {
        handleCorrectAnswer();
    } else {
        handleWrongAnswer(answerStr, () => {
            resetScienceMagnets();
            const container = document.getElementById('magnet-blanks');
            if (container) container.classList.remove('wrong-shake');
        });
        const container = document.getElementById('magnet-blanks');
        if (container) container.classList.add('wrong-shake');
    }
};

function skipToNextQuiz() {
    activeQuizIdx++;
    if (activeQuizIdx >= activeSectionData.length) {
        if (typeof speakFairyTTS === 'function') speakFairyTTS("모든 미션을 완료했어! 훌륭해!");
        alert("🏆 축하합니다! 이 구역의 모든 과학 탐구 단계를 완료하셨습니다!");
        closeMissionView();
    } else {
        renderSectionUI(currentMissionType, document.getElementById('overlayInnerBody'));
    }
}

window.addEventListener("beforeunload", () => {
    if (typeof sendStudyLogToNotion === 'function') {
        sendStudyLogToNotion({ subject: "과학" });
    }
});

// ========================================================
// 🖨️ 과학방 인쇄 로직 (printScienceSummary)
// ========================================================
window.printScienceSummary = async function() {
    let printArea = document.getElementById('print-area');
    if (!printArea) {
        // print-area가 없으면 동적으로 생성
        printArea = document.createElement('div');
        printArea.id = 'print-area';
        document.body.appendChild(printArea);
    }
    
    let printData = SCIENCE_MOCK_DATA.voca;
    
    // 노션 원본 데이터를 인쇄용 포맷으로 매핑 (이미지 포함)
    const mapNotionToPrintData = (records) => {
        return records
            .filter(r => r.word && (r.desc || r.detailContext || r.meaning))
            .map(r => ({
                word: r.word,
                desc: r.desc || r.detailContext || r.meaning,
                img: r.imageUrl || r.image || null
            }));
    };

    // 이미 불러온 데이터(allFetchedRecords)가 있다면 그것을 활용
    if (allFetchedRecords && allFetchedRecords.length > 0) {
        const vocaRecords = mapNotionToPrintData(allFetchedRecords);
        if (vocaRecords.length > 0) {
            printData = vocaRecords;
        }
    } else {
        // 데이터가 없으면 즉시 백그라운드 스캔 시도
        try {
            const records = await fetchVocaFromNotion({
                subject: "과학", 
                areaZone: "용어방",
                useServerFilter: true,
                filterByStudent: !isAdmin 
            });
            if (records && records.length > 0) {
                const vocaRecords = mapNotionToPrintData(records);
                if (vocaRecords.length > 0) {
                    printData = vocaRecords;
                }
            }
        } catch (e) {
            console.warn("인쇄용 노션 데이터 로드 실패, 기본 가상 데이터 출력", e);
        }
    }
    
    let html = `<div class="print-title">민민 우주 정거장 🚀 - 오늘의 과학 핵심 요약집</div>`;
    html += `<div class="print-voca-list">`;
    
    printData.forEach(item => {
        html += `
            <div class="print-voca-item">
                ${item.img ? `<div class="print-voca-img-wrapper"><img src="${item.img}" alt="${item.word}" class="print-voca-img"></div>` : ''}
                <div class="print-voca-text-content">
                    <div class="print-voca-word">📖 ${item.word}</div>
                    <div class="print-voca-desc">${item.desc}</div>
                </div>
            </div>
        `;
    });
    
    html += `</div>`;
    
    printArea.innerHTML = html;
    window.print();
};

