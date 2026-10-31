
// ========================================================
// 🧮 연산 멀티 스튜디오 상태 관리 및 로직 엔진
// ========================================================
let currentOp = 'div'; // 'div', 'mul', 'add', 'sub'
let curNumA = 74;
let curNumB = 6;
let currentViewTab = 'blocks'; // 'blocks', 'vertical', 'numberline', 'area'

// 블록 모형 스텝
let blockCurrentStep = 1;
const blockMaxSteps = 5;

// 세로셈 스텝
let tutorCurrentStep = 1;
let divisionPlan = [];

// 사용자 프로필 및 음성 재생 제어 플래그
let currentProfile = localStorage.getItem('currentUser') || 'son';
let hasUserStarted = false; // 🚨 최초 진입 시 자동 음성 재생 방지 플래그

// 음성 낭독 함수 래퍼
function studioSpeak(text, force = false) {
  const fairyEl = document.getElementById('fairySpeechText');
  if (hasUserStarted || force) {
    if (fairyEl) fairyEl.textContent = text;
  }

  // 사용자가 아직 시작 버튼을 누르지 않았으면 소리를 내지 않음
  if (!hasUserStarted && !force) {
    return;
  }

  if (typeof speakFairyTTS === 'function') {
    speakFairyTTS(text);
  } else if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ko-KR';
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
  }
}

function replayCurrentVoice() {
  hasUserStarted = true;
  const text = document.getElementById('fairySpeechText')?.textContent;
  if (text) studioSpeak(text, true);
}

// 연산자 전환
function switchOperation(op, btn) {
  currentOp = op;
  document.querySelectorAll('.op-tab-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');

  const sym = document.getElementById('opSymbol');
  if (op === 'div') {
    sym.textContent = '÷';
    loadPreset(74, 6);
  } else if (op === 'mul') {
    sym.textContent = '×';
    loadPreset(23, 4);
  } else if (op === 'add') {
    sym.textContent = '+';
    loadPreset(48, 37);
  } else if (op === 'sub') {
    sym.textContent = '−';
    loadPreset(82, 35);
  }
}

// 프리셋 로드 (사용자 클릭 액션이므로 음성 허용)
function loadPreset(a, b) {
  hasUserStarted = true;
  document.getElementById('numA').value = a;
  document.getElementById('numB').value = b;
  startStudioCalculation(true);
}

// 뷰 탭 전환
function switchViewTab(tab, btn) {
  currentViewTab = tab;
  document.querySelectorAll('.view-tab-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderCurrentTab();
}

// 계산 시작 (userInitiated가 true일 때만 음성 활성화)
function startStudioCalculation(userInitiated = false) {
  if (userInitiated) {
    hasUserStarted = true;
  }

  curNumA = parseInt(document.getElementById('numA').value, 10) || 1;
  curNumB = parseInt(document.getElementById('numB').value, 10) || 1;
  
  if (curNumB === 0 && currentOp === 'div') {
    alert('0으로는 나눌 수 없어요!');
    curNumB = 1;
    document.getElementById('numB').value = 1;
  }

  // 나눗셈 풀이 계획 수립
  if (currentOp === 'div') {
    buildDivisionPlan(curNumA, curNumB);
  }

  blockCurrentStep = 1;
  tutorCurrentStep = 1;

  renderCurrentTab();
}

// ========================================================
// ➗ 나눗셈 풀이 계획 엔진 (Build Division Plan)
// ========================================================
function buildDivisionPlan(dividend, divisor) {
  divisionPlan = [];
  const sDiv = String(dividend);
  const qTotal = Math.floor(dividend / divisor);
  const rTotal = dividend % divisor;

  // 두 자리 수 나누기 한 자리 수 표준
  const tensDigit = Math.floor(dividend / 10);
  const onesDigit = dividend % 10;

  if (sDiv.length === 2) {
    const qTens = Math.floor(tensDigit / divisor);
    const multTens = qTens * divisor;
    const remTens = tensDigit - multTens;

    // 1단계: 십의 자리 몫
    if (qTens > 0) {
      divisionPlan.push({
        step: 1,
        title: "1단계: 십의 자리 몫 구하기",
        desc: `십의 자리 숫자 <strong>${tensDigit}</strong>에 ${divisor}이(가) 몇 번 들어갈까요?`,
        speech: `십의 자리 ${tensDigit}에는 ${divisor}가 ${qTens}번 들어가요! 몫의 십의 자리에 ${qTens}을 적어볼까요?`,
        focus: "q_tens",
        val: qTens
      });
      // 2단계: 곱하기
      divisionPlan.push({
        step: 2,
        title: "2단계: 십의 자리 곱해서 빼기",
        desc: `${divisor} × ${qTens} = <strong>${multTens}</strong>`,
        speech: `${divisor} 곱하기 ${qTens}은 ${multTens}이에요. ${tensDigit} 밑에 ${multTens}을 적고 빼요!`,
        focus: "mult_tens",
        val: multTens
      });
      // 3단계: 빼고 남은 수
      divisionPlan.push({
        step: 3,
        title: "3단계: 십의 자리 뺀 값",
        desc: `${tensDigit} - ${multTens} = <strong>${remTens}</strong>`,
        speech: `${tensDigit} 빼기 ${multTens}은 ${remTens}이에요.`,
        focus: "rem_tens",
        val: remTens
      });
    }

    // 4단계: 일의 자리 내려쓰기
    const newCombined = (remTens * 10) + onesDigit;
    divisionPlan.push({
      step: 4,
      title: "4단계: 일의 자리 내려오기 ⬇️",
      desc: `일의 자리 <strong>${onesDigit}</strong>이 스르륵 내려와서 <strong>${newCombined}</strong>이 되었어요!`,
      speech: `일의 자리 숫자 ${onesDigit}이 스르륵 내려와서 ${newCombined}이 되었어요! 이제 ${newCombined}을 나눌 차례예요.`,
      focus: "bring_down",
      val: newCombined
    });

    // 5단계: 일의 자리 몫
    const qOnes = Math.floor(newCombined / divisor);
    const multOnes = qOnes * divisor;
    const finalRem = newCombined - multOnes;

    divisionPlan.push({
      step: 5,
      title: "5단계: 일의 자리 몫 구하기",
      desc: `<strong>${newCombined}</strong>에 ${divisor}이(가) 몇 번 들어갈까요?`,
      speech: `${newCombined}에는 ${divisor}가 ${qOnes}번 들어가요! 몫의 일의 자리에 ${qOnes}을 올려요!`,
      focus: "q_ones",
      val: qOnes
    });

    // 6단계: 일의 자리 곱하기
    divisionPlan.push({
      step: 6,
      title: "6단계: 곱해서 적기",
      desc: `${divisor} × ${qOnes} = <strong>${multOnes}</strong>`,
      speech: `${divisor} 곱하기 ${qOnes}은 ${multOnes}! ${newCombined} 밑에 ${multOnes}을 적어요.`,
      focus: "mult_ones",
      val: multOnes
    });

    // 7단계: 최종 나머지 확인
    divisionPlan.push({
      step: 7,
      title: "7단계: 빼고 나머지 확인 🎉",
      desc: `${newCombined} - ${multOnes} = <strong>${finalRem}</strong> (나머지: ${finalRem})`,
      speech: `${newCombined}에서 ${multOnes}을 빼면 ${finalRem}이 남아요! 전체 몫은 ${qTotal}이고 나머지는 ${rTotal}이에요. 참 잘했어요!`,
      focus: "remainder",
      val: finalRem
    });
  } else {
    // 한 자리 수 나누기 또는 세 자리 기본 처리
    divisionPlan.push({
      step: 1,
      title: "단원 연산 한눈에 보기",
      desc: `${dividend} ÷ ${divisor} = 몫 <strong>${qTotal}</strong>, 나머지 <strong>${rTotal}</strong>`,
      speech: `${dividend}을 ${divisor}로 나누면 몫은 ${qTotal}이고 나머지는 ${rTotal}이에요!`,
      focus: "all",
      val: qTotal
    });
  }
}

// 탭 렌더링 디스패처
function renderCurrentTab() {
  const container = document.getElementById('studioViewport');
  if (!container) return;

  if (currentOp === 'div') {
    if (currentViewTab === 'blocks') {
      renderBlocksView(container);
    } else if (currentViewTab === 'vertical') {
      renderVerticalTutorView(container);
    } else if (currentViewTab === 'numberline') {
      renderNumberLineView(container);
    } else if (currentViewTab === 'area') {
      renderAreaModelView(container);
    }
  } else {
    renderGenericOpView(container);
  }
}

// ========================================================
// 🧱 [탭 1] 십진 블록 분배관 렌더링
// ========================================================
function renderBlocksView(container) {
  const tens = Math.floor(curNumA / 10);
  const ones = curNumA % 10;
  const divisor = curNumB;
  const quotient = Math.floor(curNumA / divisor);
  const remainder = curNumA % divisor;

  let stepTitle = "";
  let stepDesc = "";
  let speechText = "";

  if (blockCurrentStep === 1) {
    stepTitle = "1단계: 원래 수 블록으로 만들기";
    stepDesc = `<strong>${curNumA}</strong>는 <strong>10개짜리 막대 ${tens}개</strong>와 <strong>낱개 큐브 ${ones}개</strong>예요.`;
    speechText = `${curNumA}는 10개짜리 막대 ${tens}개와 낱개 큐브 ${ones}개로 이루어져 있어요. 이걸 ${divisor}명에게 똑같이 나누어 줄 거예요!`;
  } else if (blockCurrentStep === 2) {
    const tensPerPerson = Math.floor(tens / divisor);
    const leftTens = tens % divisor;
    stepTitle = "2단계: 10개짜리 막대 먼저 똑같이 나누기";
    stepDesc = `10개짜리 막대 ${tens}개를 ${divisor}명에게 나누어주면, <strong>한 사람당 ${tensPerPerson}개씩</strong> 받고 <strong>${leftTens}개</strong>가 남아요!`;
    speechText = `먼저 10개짜리 막대를 나누어줄게요. 한 사람당 ${tensPerPerson}개씩 받고, 10개짜리 ${leftTens}개가 남았어요!`;
  } else if (blockCurrentStep === 3) {
    const leftTens = tens % divisor;
    const brokenOnes = (leftTens * 10) + ones;
    stepTitle = "3단계: 남은 10개 막대 펑! 💥 낱개로 쪼개기";
    stepDesc = `남은 10개짜리 막대 ${leftTens}개를 낱개 10개로 쪼개서 기존 낱개 ${ones}개와 합치면 <strong>총 ${brokenOnes}개</strong>가 돼요!`;
    speechText = `남은 10개짜리 막대를 낱개로 쪼개볼까요? 펑! 낱개 10개로 변신해서 기존 낱개와 합치니 총 ${brokenOnes}개가 되었어요!`;
  } else if (blockCurrentStep === 4) {
    const tensPerPerson = Math.floor(tens / divisor);
    const onesPerPerson = Math.floor(((tens % divisor) * 10 + ones) / divisor);
    stepTitle = "4단계: 낱개 큐브 똑같이 나누어 담기";
    stepDesc = `낱개를 ${divisor}명에게 나누어주면 <strong>한 사람당 낱개 ${onesPerPerson}개씩</strong> 더 받아요!`;
    speechText = `이제 낱개들을 나누어 담아요. 한 사람당 낱개 ${onesPerPerson}개씩 더 받았어요!`;
  } else {
    const tensPerPerson = Math.floor(tens / divisor);
    const onesPerPerson = Math.floor(((tens % divisor) * 10 + ones) / divisor);
    stepTitle = "5단계: 최종 몫과 나머지 확인 🎉";
    stepDesc = `한 사람당 <strong>10개 막대 ${tensPerPerson}개 + 낱개 ${onesPerPerson}개 = 총 ${quotient}개(몫)</strong>! 남은 낱개 = <strong>${remainder}개(나머지)</strong>!`;
    speechText = `짜잔! 한 사람당 총 ${quotient}개씩 받았으니 몫은 ${quotient}이고, 바구니에 못 들어간 남은 낱개 ${remainder}개가 바로 나머지예요!`;
  }

  // 10개짜리 막대 HTML 생성
  let tensHtml = '';
  for (let i = 0; i < tens; i++) {
    tensHtml += `<div class="ten-rod"></div>`;
  }

  // 낱개 큐브 HTML 생성
  let onesHtml = '';
  for (let i = 0; i < ones; i++) {
    onesHtml += `<div class="unit-cube"></div>`;
  }

  // 바구니 생성
  let basketsHtml = '';
  const tensPerPerson = (blockCurrentStep >= 2) ? Math.floor(tens / divisor) : 0;
  const onesPerPerson = (blockCurrentStep >= 4) ? Math.floor(((tens % divisor) * 10 + ones) / divisor) : 0;

  for (let b = 1; b <= divisor; b++) {
    let bTens = '';
    for (let t = 0; t < tensPerPerson; t++) bTens += `<div class="ten-rod" style="height:70px;"></div>`;
    let bOnes = '';
    for (let o = 0; o < onesPerPerson; o++) bOnes += `<div class="unit-cube"></div>`;

    basketsHtml += `
      <div class="person-basket">
        <div class="basket-label">🧺 ${b}번 친구</div>
        <div style="display:flex; gap:4px; justify-content:center; align-items:center; flex-wrap:wrap; min-height:80px;">
          ${bTens} ${bOnes}
        </div>
      </div>
    `;
  }

  container.innerHTML = `
    <div class="block-stage-wrap">
      <div class="block-step-nav">
        <span class="step-pill">🧱 블록 쪼개기 탐험 (${blockCurrentStep} / ${blockMaxSteps}단계)</span>
        <div class="nav-btn-group">
          <button class="step-control-btn" onclick="changeBlockStep(-1)" ${blockCurrentStep === 1 ? 'disabled' : ''}>◀ 이전</button>
          <button class="step-control-btn" onclick="changeBlockStep(1)" ${blockCurrentStep === blockMaxSteps ? 'disabled' : ''} style="background:#0284c7; color:#fff; border-color:#38bdf8;">다음 단계 ▶</button>
        </div>
      </div>

      <div style="background:rgba(2,132,199,0.15); border:1.5px solid #0284c7; border-radius:14px; padding:14px;">
        <h3 style="margin:0 0 6px; font-family:'Jua'; color:#38bdf8; font-size:1.25rem;">${stepTitle}</h3>
        <p style="margin:0; font-size:1.05rem; line-height:1.5;">${stepDesc}</p>
      </div>

      <div class="block-display-area">
        <div class="block-group-box">
          <div class="block-group-title">
            <span>📦 원래 전체 수 (${curNumA})</span>
            <span style="font-size:0.85rem; color:#94a3b8;">10개짜리 ${tens}개 / 낱개 ${ones}개</span>
          </div>
          <div class="blocks-row">
            ${tensHtml}
            <div style="width:12px;"></div>
            ${onesHtml}
          </div>
        </div>

        <div class="block-group-box">
          <div class="block-group-title">
            <span>👥 ${divisor}명에게 똑같이 나누어주기</span>
            <span style="font-size:0.85rem; color:#4ade80;">한 사람당 몫: ${quotient}</span>
          </div>
          <div class="basket-grid">
            ${basketsHtml}
          </div>
        </div>
      </div>
    </div>
  `;

  studioSpeak(speechText);
}

function changeBlockStep(delta) {
  hasUserStarted = true;
  blockCurrentStep = Math.max(1, Math.min(blockMaxSteps, blockCurrentStep + delta));
  renderBlocksView(document.getElementById('studioViewport'));
}

