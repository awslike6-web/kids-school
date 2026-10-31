function renderScaffoldMode() {
  const area = document.getElementById('mainTrainArea');
  
  // 1. 카테고리 알약 탭 (6대 파트)
  let catPillsHtml = CATEGORIES.map((cat, i) => `
    <button class="cat-pill ${i === curCatIdx ? 'active' : ''}" onclick="selectCategory(${i})">
      ${cat.name}
    </button>
  `).join('');

  // 2. 문제 번호 선택 바 (1번~5번 + 🎲 무한 랜덤 버튼)
  const isRandom = (curProbIdx === -1);
  let subPillsHtml = [0, 1, 2, 3, 4].map(pIdx => {
    const isSolved = solvedMap[`${curCatIdx}_${pIdx}`];
    return `
      <button class="prob-num-btn ${(!isRandom && curProbIdx === pIdx) ? 'active' : ''} ${isSolved ? 'done' : ''}" onclick="selectProblem(${pIdx})">
        ${pIdx + 1}번 문제
      </button>
    `;
  }).join('');

  subPillsHtml += `
    <button class="btn-random-generate" onclick="generateAndPlayRandom()">
      🎲 무한 랜덤 문제 뽑기!
    </button>
  `;

  // 현재 문제 객체 가져오기
  let prob;
  if (isRandom) {
    prob = customRandomProb || generateRandomProblem(curCatIdx);
    customRandomProb = prob;
  } else {
    prob = PROBLEM_BANKS[curCatIdx][curProbIdx];
  }

  // 3. 단계별 수식 스텝들
  let stepsHtml = prob.steps.map((st, sIdx) => `
    <div class="step-row ${sIdx === 0 ? 'active' : ''}" id="stepRow_${sIdx}">
      <div class="step-info">
        <span class="step-badge">${sIdx + 1}단계</span>
        <span class="step-desc">${st.desc}</span>
      </div>
      <div class="step-formula-area">
        ${st.formula}
      </div>
    </div>
  `).join('');

  area.innerHTML = `
    <!-- 6대 카테고리 탭 -->
    <div class="category-pills-bar">${catPillsHtml}</div>

    <!-- 1~5번 및 랜덤 선택 바 -->
    <div class="sub-problem-bar">${subPillsHtml}</div>

    <!-- 문제 헤로 박스 -->
    <div class="problem-hero-box">
      <span class="problem-badge">${CATEGORIES[curCatIdx].name}</span>
      <div class="problem-title">${prob.hero}</div>
    </div>

    <!-- 단계별 비계 입력 -->
    <div class="scaffold-steps-wrap">
      ${stepsHtml}
    </div>

    <!-- 코코 힌트 박스 -->
    <div class="hint-alert-box" id="hintAlertBox">
      <span style="font-size:1.4rem;">💡</span>
      <span id="hintAlertText">힌트가 여기에 표시됩니다.</span>
    </div>

    <!-- 온스크린 키패드 -->
    <div style="margin-top:24px; text-align:center;">
      <span style="font-family:'Jua'; color:#9ca3af; font-size:0.95rem;">📱 터치 입력 키패드</span>
      <div class="keypad-grid">
        ${[1,2,3,4,5,6,7,8,9,0].map(n => `<button class="keypad-btn" onclick="pressKeypad('${n}')">${n}</button>`).join('')}
        <button class="keypad-btn" style="color:#ef4444;" onclick="pressKeypad('del')">지우기 ⌫</button>
        <button class="keypad-btn" style="color:#047857;" onclick="pressKeypad('next')">다음 ➔</button>
      </div>
    </div>
  `;

  // 첫 번째 인풋 포커스
  setTimeout(() => {
    const firstInp = document.getElementById('inp_s_0');
    if (firstInp) {
      firstInp.focus();
      lastFocusedInput = firstInp;
    }
  }, 100);

  // 인풋 포커스 이벤트 연결
  document.querySelectorAll('.blank-input').forEach(inp => {
    inp.addEventListener('focus', () => { lastFocusedInput = inp; });
  });
}

function selectCategory(catIdx) {
  playSfx('click');
  curCatIdx = catIdx;
  curProbIdx = 0;
  customRandomProb = null;
  renderScaffoldMode();
}

function selectProblem(pIdx) {
  playSfx('click');
  curProbIdx = pIdx;
  customRandomProb = null;
  renderScaffoldMode();
}

function generateAndPlayRandom() {
  playSfx('click');
  curProbIdx = -1;
  customRandomProb = generateRandomProblem(curCatIdx);
  renderScaffoldMode();
}

function checkInput(inp) {
  const userVal = inp.value.trim();
  const correctAns = inp.getAttribute('data-ans');

  if (userVal === correctAns) {
    inp.classList.add('correct');
    playSfx('correct');
    hideHint();

    const inputs = Array.from(document.querySelectorAll('.blank-input'));
    const currIdx = inputs.indexOf(inp);
    const nextInp = inputs[currIdx + 1];

    if (nextInp) {
      nextInp.focus();
      lastFocusedInput = nextInp;
      const nextRow = nextInp.closest('.step-row');
      if (nextRow) nextRow.classList.add('active');
    } else {
      // 모든 단계 정답 완료!
      playSfx('fanfare');
      addGems(1);
      document.querySelectorAll('.step-row').forEach(r => r.classList.add('done'));
      
      if (curProbIdx >= 0) {
        solvedMap[`${curCatIdx}_${curProbIdx}`] = true;
      }

      showTrainModal("🎉 문제 정복 완료! 💎 +1 획득", "교과서 계산 공식을 완벽하게 마스터했습니다!");
    }
  } else if (userVal.length >= correctAns.length) {
    playSfx('wrong');
    showHint(inp);
  }
}

function showHint(inp) {
  let prob;
  if (curProbIdx === -1) {
    prob = customRandomProb;
  } else {
    prob = PROBLEM_BANKS[curCatIdx][curProbIdx];
  }
  const row = inp.closest('.step-row');
  const stepIdx = Array.from(document.querySelectorAll('.step-row')).indexOf(row);
  const hintText = prob?.steps[stepIdx]?.hint || "다시 한번 차근차근 생각해 보세요!";

  const box = document.getElementById('hintAlertBox');
  const txt = document.getElementById('hintAlertText');
  if (box && txt) {
    txt.textContent = hintText;
    box.style.display = 'flex';
  }
}

function hideHint() {
  const box = document.getElementById('hintAlertBox');
  if (box) box.style.display = 'none';
}

function pressKeypad(key) {
  if (!lastFocusedInput) return;
  if (key === 'del') {
    lastFocusedInput.value = '';
    playSfx('click');
  } else if (key === 'next') {
    const inputs = Array.from(document.querySelectorAll('.blank-input'));
    const idx = inputs.indexOf(lastFocusedInput);
    if (inputs[idx + 1]) inputs[idx + 1].focus();
  } else {
    lastFocusedInput.value = lastFocusedInput.value + key;
    checkInput(lastFocusedInput);
  }
}

// ========================================================
// ⚔️ 2. 6대 공식 퀴즈 배틀 (10제 - 세로 분수 전면 적용)
// ========================================================

const QUIZ_QUESTIONS = [
  {
    q: `진분수와 자연수를 곱할 때, 자연수는 어디에만 곱할까요?`,
    opts: ["분모에만 곱한다", "분자에만 곱한다", "분모와 분자 둘 다 곱한다"],
    ans: 1,
    tip: "분모는 피자 조각 크기라 침대에 누워 쉬고, 조각 수인 분자에만 곱해요!"
  },
  {
    q: `분수 ${renderFrac(6, 5)}처럼 분자가 분모보다 더 큰 무거운 가분수는 무엇으로 바꿀까요?`,
    opts: ["대분수", "단위분수", "소수"],
    ans: 0,
    tip: `온전한 1개(${renderFrac(5, 5)})를 쏙 뽑아 대분수 ${renderMixed(1, 1, 5)}로 변신시켜요!`
  },
  {
    q: `대분수와 자연수를 곱할 때는 대분수에게 무엇을 먼저 씌워야 할까요?`,
    opts: ["소수 안경", "가분수 투구", "거꾸로 모자"],
    ans: 1,
    tip: "뚱뚱한 대분수를 날씬한 가분수로 바꾸면 계산이 훨씬 쉬워져요!"
  },
  {
    q: `자연수 6과 ${renderFrac(2, 3)}를 곱할 때, 6과 3을 미리 약분하면 6은 무엇이 될까요?`,
    opts: ["1", "2", "3"],
    ans: 1,
    tip: "6 나누기 3은 2! 2가 남아요."
  },
  {
    q: `단위분수 ${renderFrac(1, 2)}과 ${renderFrac(1, 3)}을 곱하면 전체는 몇 칸으로 나뉠까요?`,
    opts: ["5칸", "6칸", "8칸"],
    ans: 1,
    tip: "가로 2줄 × 세로 3줄 = 분모끼리 곱해서 6칸이 돼요!"
  },
  {
    q: `분수끼리의 곱셈에서 계산하기 전에 대각선에 있는 숫자끼리 나누는 기술은?`,
    opts: ["통분술", "번개 약분술", "내림술"],
    ans: 1,
    tip: "마법 가위로 대각선 친구를 똑같은 수로 미리 싹둑 자르는 번개 약분술!"
  },
  {
    q: `대분수끼리 곱할 때 (${renderMixed(2, 1, 3)} × ${renderMixed(1, 1, 5)}) 가장 먼저 해야 할 일은?`,
    opts: ["둘 다 가분수로 바꾼다", "자연수끼리만 곱한다", "분모를 통분한다"],
    ans: 0,
    tip: "두 대분수를 반드시 모두 가분수로 먼저 변신시켜야 곱할 수 있어요!"
  },
  {
    q: `1보다 작은 진분수를 곱하면 원래 수보다 어떻게 될까요?`,
    opts: ["더 커진다", "더 작아진다", "변함이 없다"],
    ans: 1,
    tip: "1보다 작은 수를 곱하면 조각의 조각이 되어 알맞게 작아져요!"
  },
  {
    q: `${renderFrac(3, 4)} × ${renderFrac(2, 7)}에서 대각선 4와 2를 2로 약분하면 분모는 몇이 될까요?`,
    opts: ["14", "28", "8"],
    ans: 0,
    tip: "4가 2가 되었으니 분모는 2 × 7 = 14가 돼요!"
  },
  {
    q: `분수의 곱셈을 할 때 '약분'은 언제 하는 것이 가장 좋을까요?`,
    opts: ["곱하기 전에 미리 약분한다", "계산이 다 끝나고만 한다", "약분은 안 해도 된다"],
    ans: 0,
    tip: "곱하기 전에 미리 대각선 약분을 하면 숫자가 작아져서 계산 실수가 없어져요!"
  }
];

let curQuizIdx = 0;
let quizScore = 0;
let answeredThisQ = false;

function renderBattleMode() {
  const area = document.getElementById('mainTrainArea');
  const qData = QUIZ_QUESTIONS[curQuizIdx];

  area.innerHTML = `
    <div class="quiz-progress-bar">
      <span>문제 ${curQuizIdx + 1} / ${QUIZ_QUESTIONS.length}</span>
      <span>현재 정답: ${quizScore}개</span>
    </div>

    <div class="quiz-question-box">
      <span class="quiz-q-num">Q ${curQuizIdx + 1}</span>
      <h3 class="quiz-question-text">${qData.q}</h3>
    </div>

    <div class="quiz-options-list">
      ${qData.opts.map((opt, i) => `
        <button class="quiz-opt-btn" id="optBtn_${i}" onclick="selectQuizOption(${i})">
          <span class="quiz-opt-num">${i + 1}</span>
          <span>${opt}</span>
        </button>
      `).join('')}
    </div>

    <div class="hint-alert-box" id="quizHintBox" style="margin-top:20px;">
      <span style="font-size:1.4rem;">💡</span>
      <span id="quizHintText"></span>
    </div>
  `;

  answeredThisQ = false;
}

function selectQuizOption(choiceIdx) {
  if (answeredThisQ) return;
  const qData = QUIZ_QUESTIONS[curQuizIdx];
  const selectedBtn = document.getElementById(`optBtn_${choiceIdx}`);

  if (choiceIdx === qData.ans) {
    answeredThisQ = true;
    quizScore++;
    selectedBtn.classList.add('correct');
    playSfx('correct');

    if (quizScore % 2 === 0) {
      addGems(1);
    }

    setTimeout(() => {
      if (curQuizIdx < QUIZ_QUESTIONS.length - 1) {
        curQuizIdx++;
        renderBattleMode();
      } else {
        playSfx('fanfare');
        addGems(5);
        showTrainModal("🎉 10문제 배틀 완주 성공! 🎉", `10문제 중 ${quizScore}문제를 완벽하게 풀었습니다!<br><b>보석 +5 💎 & 수학 경험치 +15 EXP</b> 획득!`);
      }
    }, 900);
  } else {
    playSfx('wrong');
    selectedBtn.classList.add('wrong');
    const hintBox = document.getElementById('quizHintBox');
    const hintTxt = document.getElementById('quizHintText');
    if (hintBox && hintTxt) {
      hintTxt.innerHTML = qData.tip;
      hintBox.style.display = 'flex';
    }
  }
}

// 모드 스위치
function switchTrainMode(mode) {
  playSfx('click');
  trainMode = mode;
  const tabS = document.getElementById('tabScaffold');
  const tabB = document.getElementById('tabBattle');

  if (mode === 'scaffold') {
    tabS.classList.add('active');
    tabB.classList.remove('active');
    renderScaffoldMode();
  } else {
    tabS.classList.remove('active');
    tabB.classList.add('active');
    curQuizIdx = 0;
    quizScore = 0;
    renderBattleMode();
  }
}

function showTrainModal(title, desc) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalDesc').innerHTML = desc;
  document.getElementById('trainModal').style.display = 'flex';
}

function closeTrainModal() {
  playSfx('click');
  document.getElementById('trainModal').style.display = 'none';
  if (trainMode === 'scaffold') {
    if (curProbIdx >= 0) {
      curProbIdx = (curProbIdx + 1) % 5;
    } else {
      generateAndPlayRandom();
      return;
    }
    renderScaffoldMode();
  } else {
    curQuizIdx = 0;
    quizScore = 0;
    renderBattleMode();
  }
}

// 초기 로드
window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('gemCount').textContent = getGemCount();
  renderScaffoldMode();
});
