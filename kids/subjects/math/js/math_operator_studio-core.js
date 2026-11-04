// ========================================================
// 🧮 연산 멀티 스튜디오 상태 관리 및 코어 엔진
// ========================================================
let currentOp = 'div'; // 'div', 'mul', 'add', 'sub'
let curNumA = 74;
let curNumB = 6;
let currentViewTab = 'blocks'; // 'blocks', 'vertical', 'numberline', 'area'

let blockCurrentStep = 1;
const blockMaxSteps = 5;

let tutorCurrentStep = 1;
let currentPlan = [];
let divisionPlan = []; // 하위 호환 및 테스트 연동

let currentProfile = localStorage.getItem('currentUser') || 'son';
let hasUserStarted = false;
let numberLineStep = 0;

// 연산별 추천 프리셋
const OPERATION_PRESETS = {
  div: [
    { a: 74, b: 6, label: '74 ÷ 6 (나머지 2)' },
    { a: 85, b: 4, label: '85 ÷ 4 (나머지 1)' },
    { a: 92, b: 3, label: '92 ÷ 3 (나머지 2)' },
    { a: 48, b: 4, label: '48 ÷ 4 (딱 떨어짐)' },
    { a: 56, b: 8, label: '56 ÷ 8 (구구단 한자리)' },
    { a: 35, b: 5, label: '35 ÷ 5 (구구단 5단)' }
  ],
  mul: [
    { a: 23, b: 4, label: '23 × 4 (올림 1회)' },
    { a: 45, b: 6, label: '45 × 6 (올림 2회)' },
    { a: 124, b: 3, label: '124 × 3 (세 자리 × 한 자리)' },
    { a: 56, b: 8, label: '56 × 8 (구구단 확장)' },
    { a: 34, b: 12, label: '34 × 12 (두 자리 × 두 자리)' },
    { a: 78, b: 25, label: '78 × 25 (두 자리 곱셈 실전)' }
  ],
  add: [
    { a: 32, b: 25, label: '32 + 25 (받아올림 없음)' },
    { a: 48, b: 37, label: '48 + 37 (일의 자리 올림)' },
    { a: 85, b: 47, label: '85 + 47 (십의 자리 올림)' },
    { a: 156, b: 87, label: '156 + 87 (연속 올림)' },
    { a: 389, b: 425, label: '389 + 425 (세 자리 연속 올림)' },
    { a: 99, b: 1, label: '99 + 1 (100 만들기)' }
  ],
  sub: [
    { a: 57, b: 23, label: '57 − 23 (받아내림 없음)' },
    { a: 82, b: 35, label: '82 − 35 (일의 자리 내림)' },
    { a: 100, b: 35, label: '100 − 35 (0 낀 연속 내림)' },
    { a: 142, b: 68, label: '142 − 68 (연속 받아내림)' },
    { a: 504, b: 168, label: '504 − 168 (중간 0 낀 내림)' },
    { a: 73, b: 49, label: '73 − 49 (받아내림 실전)' }
  ]
};

const OPERATION_INPUT_CONFIG = {
  div: { minA: 1, maxA: 999, labelA: '나누어지는 수', minB: 1, maxB: 99, labelB: '나누는 수', sym: '÷' },
  mul: { minA: 1, maxA: 999, labelA: '곱해지는 수', minB: 1, maxB: 99, labelB: '곱하는 수', sym: '×' },
  add: { minA: 1, maxA: 999, labelA: '더해지는 수', minB: 1, maxB: 999, labelB: '더하는 수', sym: '+' },
  sub: { minA: 1, maxA: 999, labelA: '빼어지는 수', minB: 1, maxB: 999, labelB: '빼는 수', sym: '−' }
};

const OPERATION_TAB_LABELS = {
  div: { blocks: '🧱 십진 블록 분배관', vertical: '📝 단계별 세로셈 튜터', numberline: '📏 수직선 덜어내기', area: '🍫 면적(넓이) 모델' },
  mul: { blocks: '🧱 묶음 블록 모델', vertical: '📝 단계별 세로셈 튜터', numberline: '📏 수직선 뛰어 세기', area: '🍫 자리별 부분곱 넓이 모델' },
  add: { blocks: '🧱 자리별 블록 모으기', vertical: '📝 단계별 세로셈 튜터', numberline: '📏 수직선 앞으로 뛰어 세기', area: null },
  sub: { blocks: '🧱 블록 덜어내기(가르기)', vertical: '📝 단계별 세로셈 튜터', numberline: '📏 수직선 뒤로 뛰어 세기', area: null }
};

// 음성 낭독 함수 (speakFairyTTS 단일 원천)
function studioSpeak(text, force = false) {
  const fairyEl = document.getElementById('fairySpeechText');
  if (hasUserStarted || force) {
    if (fairyEl) fairyEl.textContent = text;
  }
  if (!hasUserStarted && !force) return;

  if (typeof speakFairyTTS === 'function') {
    speakFairyTTS(text);
  }
}

function replayCurrentVoice() {
  hasUserStarted = true;
  const text = document.getElementById('fairySpeechText')?.textContent;
  if (text) studioSpeak(text, true);
}

// 프리셋 버튼 목록 렌더링
function renderPresetRow(op) {
  const row = document.querySelector('.preset-row');
  if (!row) return;
  const presets = OPERATION_PRESETS[op] || OPERATION_PRESETS.div;
  const btnsHtml = presets.map(p =>
    `<button class="preset-btn" onclick="loadPreset(${p.a}, ${p.b})">${p.label}</button>`
  ).join('');
  row.innerHTML = `<span class="preset-label">💡 맞춤 추천 문제:</span> ${btnsHtml}`;
}

// 탭 버튼 텍스트 및 가시성 업데이트
function updateViewTabsUi(op) {
  const labels = OPERATION_TAB_LABELS[op] || OPERATION_TAB_LABELS.div;
  document.querySelectorAll('.view-tab-btn').forEach(btn => {
    const tabKey = btn.getAttribute('onclick')?.match(/switchViewTab\('([^']+)'/)?.[1];
    if (!tabKey) return;
    const label = labels[tabKey];
    if (label) {
      btn.style.display = '';
      btn.textContent = label;
    } else {
      btn.style.display = 'none';
      if (currentViewTab === tabKey) {
        currentViewTab = 'blocks';
      }
    }
  });

  document.querySelectorAll('.view-tab-btn').forEach(btn => {
    const tabKey = btn.getAttribute('onclick')?.match(/switchViewTab\('([^']+)'/)?.[1];
    btn.classList.toggle('active', tabKey === currentViewTab);
  });
}

// 연산자 전환
function switchOperation(op, btn) {
  currentOp = op;
  document.querySelectorAll('.op-tab-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');

  const cfg = OPERATION_INPUT_CONFIG[op];
  const sym = document.getElementById('opSymbol');
  if (sym) sym.textContent = cfg.sym;

  const inA = document.getElementById('numA');
  const inB = document.getElementById('numB');
  if (inA) {
    inA.min = cfg.minA; inA.max = cfg.maxA; inA.setAttribute('aria-label', cfg.labelA);
  }
  if (inB) {
    inB.min = cfg.minB; inB.max = cfg.maxB; inB.setAttribute('aria-label', cfg.labelB);
  }

  renderPresetRow(op);
  updateViewTabsUi(op);

  const firstPreset = (OPERATION_PRESETS[op] && OPERATION_PRESETS[op][0]) || { a: 74, b: 6 };
  loadPreset(firstPreset.a, firstPreset.b);
}

function loadPreset(a, b) {
  hasUserStarted = true;
  const inA = document.getElementById('numA');
  const inB = document.getElementById('numB');
  if (inA) inA.value = a;
  if (inB) inB.value = b;
  startStudioCalculation(true);
}

function switchViewTab(tab, btn) {
  currentViewTab = tab;
  document.querySelectorAll('.view-tab-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderCurrentTab();
}

function startStudioCalculation(userInitiated = false) {
  if (userInitiated) hasUserStarted = true;

  const inA = document.getElementById('numA');
  const inB = document.getElementById('numB');

  const rawA = parseInt(inA?.value, 10);
  const rawB = parseInt(inB?.value, 10);
  curNumA = isNaN(rawA) ? 1 : (rawA === 0 ? 0 : rawA);
  curNumB = isNaN(rawB) ? 1 : (rawB === 0 ? 0 : rawB);

  if (currentOp === 'div') {
    if (rawB === 0) alert('0으로는 나눌 수 없어요!');
    curNumA = clampDivisionValue(curNumA || 1, DIVIDEND_MAX);
    curNumB = clampDivisionValue(curNumB || 1, DIVISOR_MAX);
    if (inA) inA.value = curNumA;
    if (inB) inB.value = curNumB;
    divisionPlan = buildDivisionPlan(curNumA, curNumB);
    currentPlan = divisionPlan;
  } else {
    const cfg = OPERATION_INPUT_CONFIG[currentOp] || OPERATION_INPUT_CONFIG.div;
    curNumA = clampStudioValue(curNumA || 1, cfg.minA, cfg.maxA);
    curNumB = clampStudioValue(curNumB || 1, cfg.minB, cfg.maxB);
    if (inA) inA.value = curNumA;
    if (inB) inB.value = curNumB;

    if (currentOp === 'add') {
      currentPlan = buildAdditionPlan(curNumA, curNumB);
    } else if (currentOp === 'sub') {
      currentPlan = buildSubtractionPlan(curNumA, curNumB);
    } else if (currentOp === 'mul') {
      currentPlan = buildMultiplicationPlan(curNumA, curNumB);
    }
  }

  blockCurrentStep = 1;
  tutorCurrentStep = 1;
  numberLineStep = 0;

  renderCurrentTab();
}

// 탭 렌더링 디스패처
function renderCurrentTab() {
  const container = document.getElementById('studioViewport');
  if (!container) return;

  if (currentViewTab === 'blocks') {
    renderBlocksView(container);
  } else if (currentViewTab === 'vertical') {
    renderVerticalTutorView(container);
  } else if (currentViewTab === 'numberline') {
    renderNumberLineView(container);
  } else if (currentViewTab === 'area') {
    renderAreaModelView(container);
  }
}

// ========================================================
// 🧱 [탭 1] 블록 모델 뷰 렌더링 (4대 연산 분기)
// ========================================================
function renderBlocksView(container) {
  if (currentOp === 'div') {
    renderDivisionBlocksView(container);
  } else if (currentOp === 'add') {
    renderAdditionBlocksView(container);
  } else if (currentOp === 'sub') {
    renderSubtractionBlocksView(container);
  } else if (currentOp === 'mul') {
    renderMultiplicationBlocksView(container);
  }
}

function renderDivisionBlocksView(container) {
  const tens = Math.floor(curNumA / 10);
  const ones = curNumA % 10;
  const divisor = curNumB;
  const quotient = Math.floor(curNumA / divisor);
  const remainder = curNumA % divisor;

  let stepTitle = "", stepDesc = "", speechText = "";
  if (blockCurrentStep === 1) {
    stepTitle = "1단계: 원래 수 블록으로 만들기";
    stepDesc = `<strong>${curNumA}</strong>는 <strong>10개 막대 ${tens}개</strong>와 <strong>낱개 큐브 ${ones}개</strong>예요.`;
    speechText = `${curNumA}는 10개짜리 막대 ${tens}개와 낱개 큐브 ${ones}개로 이루어져 있어요. 이걸 ${divisor}명에게 똑같이 나누어 줄 거예요!`;
  } else if (blockCurrentStep === 2) {
    const tensPerPerson = Math.floor(tens / divisor);
    const leftTens = tens % divisor;
    stepTitle = "2단계: 10개 막대 먼저 똑같이 나누기";
    stepDesc = `10개 막대 ${tens}개를 ${divisor}명에게 나누면 <strong>한 명당 ${tensPerPerson}개씩</strong> 받고 <strong>${leftTens}개</strong>가 남아요!`;
    speechText = `먼저 10개짜리 막대를 나누어줄게요. 한 사람당 ${tensPerPerson}개씩 받고, 10개짜리 ${leftTens}개가 남았어요!`;
  } else if (blockCurrentStep === 3) {
    const leftTens = tens % divisor;
    const brokenOnes = (leftTens * 10) + ones;
    stepTitle = "3단계: 남은 10개 막대 펑! 💥 낱개로 쪼개기";
    stepDesc = `남은 10개 막대 ${leftTens}개를 낱개 10개로 쪼개서 기존 낱개와 합치면 <strong>총 ${brokenOnes}개</strong>가 돼요!`;
    speechText = `남은 10개짜리 막대를 낱개로 쪼개볼까요? 펑! 낱개 10개로 변신해서 총 ${brokenOnes}개가 되었어요!`;
  } else if (blockCurrentStep === 4) {
    const onesPerPerson = Math.floor(((tens % divisor) * 10 + ones) / divisor);
    stepTitle = "4단계: 낱개 큐브 똑같이 나누어 담기";
    stepDesc = `낱개를 ${divisor}명에게 나누어 담으면 <strong>한 명당 낱개 ${onesPerPerson}개씩</strong> 더 받아요!`;
    speechText = `이제 낱개들을 나누어 담아요. 한 사람당 낱개 ${onesPerPerson}개씩 더 받았어요!`;
  } else {
    stepTitle = "5단계: 최종 몫과 나머지 확인 🎉";
    stepDesc = `한 명당 <strong>몫: ${quotient}개</strong>, 남은 낱개 <strong>나머지: ${remainder}개</strong>!`;
    speechText = `짜잔! 한 사람당 총 ${quotient}개씩 받았으니 몫은 ${quotient}이고, 남은 낱개 ${remainder}개가 나머지예요!`;
  }

  const tensHtml = '<div class="ten-rod"></div>'.repeat(tens);
  const onesHtml = '<div class="unit-cube"></div>'.repeat(ones);
  const tensPer = (blockCurrentStep >= 2) ? Math.floor(tens / divisor) : 0;
  const onesPer = (blockCurrentStep >= 4) ? Math.floor(((tens % divisor) * 10 + ones) / divisor) : 0;

  let basketsHtml = '';
  for (let b = 1; b <= divisor; b++) {
    basketsHtml += `
      <div class="person-basket">
        <div class="basket-label">🧺 ${b}번 친구</div>
        <div style="display:flex; gap:4px; justify-content:center; align-items:center; flex-wrap:wrap; min-height:80px;">
          ${'<div class="ten-rod" style="height:70px;"></div>'.repeat(tensPer)}
          ${'<div class="unit-cube"></div>'.repeat(onesPer)}
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
          <div class="block-group-title"><span>📦 원래 수 (${curNumA})</span><span style="font-size:0.85rem; color:#94a3b8;">10개 막대 ${tens}개 / 낱개 ${ones}개</span></div>
          <div class="blocks-row">${tensHtml}<div style="width:12px;"></div>${onesHtml}</div>
        </div>
        <div class="block-group-box">
          <div class="block-group-title"><span>👥 ${divisor}명에게 나누기</span><span style="font-size:0.85rem; color:#4ade80;">몫: ${quotient}</span></div>
          <div class="basket-grid">${basketsHtml}</div>
        </div>
      </div>
    </div>
  `;
  studioSpeak(speechText);
}

function renderAdditionBlocksView(container) {
  const tensA = Math.floor(curNumA / 10), onesA = curNumA % 10;
  const tensB = Math.floor(curNumB / 10), onesB = curNumB % 10;
  const sum = curNumA + curNumB;
  const onesSum = onesA + onesB;
  const carry = onesSum >= 10 ? 1 : 0;
  const finalOnes = onesSum % 10;
  const finalTens = tensA + tensB + carry;

  let stepTitle = "", stepDesc = "", speechText = "";
  if (blockCurrentStep === 1) {
    stepTitle = "1단계: 두 수의 블록 준비하기";
    stepDesc = `첫 번째 수 <strong>${curNumA}</strong>와 두 번째 수 <strong>${curNumB}</strong>의 블록을 놓았어요.`;
    speechText = `${curNumA}와 ${curNumB}를 블록으로 나타냈어요. 이제 자리별로 모아볼까요?`;
  } else if (blockCurrentStep === 2) {
    stepTitle = "2단계: 낱개 큐브 먼저 한곳에 모으기";
    stepDesc = `낱개 <strong>${onesA}개</strong>와 <strong>${onesB}개</strong>를 모으니 <strong>총 ${onesSum}개</strong>가 되었어요!`;
    speechText = `먼저 낱개 큐브를 모았어요. ${onesA}개와 ${onesB}개를 모으니 총 ${onesSum}개예요!`;
  } else if (blockCurrentStep === 3) {
    stepTitle = carry ? "3단계: 낱개 10개 펑! 💥 10개 막대로 변신 (받아올림)" : "3단계: 낱개 확인";
    stepDesc = carry
      ? `낱개 10개를 묶어 <strong>10개 막대 1개</strong>로 올리고, 낱개는 <strong>${finalOnes}개</strong>가 남아요!`
      : `낱개가 10개 미만이라 그대로 <strong>${onesSum}개</strong>예요!`;
    speechText = carry
      ? `낱개가 10개가 넘었어요! 10개를 묶어 10개짜리 막대 1개로 변신시키고, 낱개는 ${finalOnes}개가 남아요!`
      : `낱개가 10개가 안 되어서 그대로 ${onesSum}개예요!`;
  } else if (blockCurrentStep === 4) {
    stepTitle = "4단계: 10개 막대 모두 모으기";
    stepDesc = `10개 막대 ${tensA}개 + ${tensB}개${carry ? ' + 올림 막대 1개' : ''} = <strong>총 ${finalTens}개</strong>!`;
    speechText = `이제 10개짜리 막대들을 모두 모아요. 총 ${finalTens}개가 되었어요!`;
  } else {
    stepTitle = "5단계: 최종 합 확인 🎉";
    stepDesc = `10개 막대 ${finalTens}개(${finalTens * 10}) + 낱개 ${finalOnes}개 = <strong>총합 ${sum}</strong>!`;
    speechText = `짜잔! 10개 막대와 낱개를 합치니 전체 합은 ${sum}이에요. 참 잘했어요!`;
  }

  container.innerHTML = `
    <div class="block-stage-wrap">
      <div class="block-step-nav">
        <span class="step-pill">🧱 자리별 블록 모으기 (${blockCurrentStep} / ${blockMaxSteps}단계)</span>
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
          <div class="block-group-title"><span>📦 첫 번째 수 (${curNumA})</span><span style="font-size:0.85rem; color:#94a3b8;">10개 막대 ${tensA}개 / 낱개 ${onesA}개</span></div>
          <div class="blocks-row">${'<div class="ten-rod"></div>'.repeat(tensA)}<div style="width:12px;"></div>${'<div class="unit-cube"></div>'.repeat(onesA)}</div>
        </div>
        <div class="block-group-box">
          <div class="block-group-title"><span>📦 두 번째 수 (${curNumB})</span><span style="font-size:0.85rem; color:#94a3b8;">10개 막대 ${tensB}개 / 낱개 ${onesB}개</span></div>
          <div class="blocks-row">${'<div class="ten-rod" style="background:linear-gradient(180deg,#f59e0b,#d97706);"></div>'.repeat(tensB)}<div style="width:12px;"></div>${'<div class="unit-cube" style="background:#fbbf24; border-color:#f59e0b;"></div>'.repeat(onesB)}</div>
        </div>
      </div>
    </div>
  `;
  studioSpeak(speechText);
}

function renderSubtractionBlocksView(container) {
  if (curNumA < curNumB) {
    container.innerHTML = `
      <div style="text-align:center; padding:30px; background:rgba(239,68,68,0.1); border:1.5px solid #ef4444; border-radius:16px;">
        <h3 style="font-family:'Jua'; color:#ef4444;">초등 수학에서는 큰 수에서 작은 수를 빼요! 💡</h3>
        <p style="color:var(--text-main); font-size:1.1rem;">지금은 ${curNumA} − ${curNumB}라 뺄 수 없어요. 첫 번째 수를 더 크게 입력해 보세요!</p>
      </div>
    `;
    studioSpeak('초등 수학에서는 큰 수에서 작은 수를 빼요! 큰 수를 앞에 적어볼까요?');
    return;
  }

  const tensA = Math.floor(curNumA / 10), onesA = curNumA % 10;
  const tensB = Math.floor(curNumB / 10), onesB = curNumB % 10;
  const diff = curNumA - curNumB;
  const needBorrow = onesA < onesB;

  let stepTitle = "", stepDesc = "", speechText = "";
  if (blockCurrentStep === 1) {
    stepTitle = "1단계: 원래 수 블록 준비하기";
    stepDesc = `<strong>${curNumA}</strong>는 10개 막대 ${tensA}개와 낱개 ${onesA}개예요. 여기서 <strong>${curNumB}</strong>만큼 덜어낼 거예요.`;
    speechText = `${curNumA}에서 ${curNumB}만큼 덜어내 볼까요? 먼저 낱개부터 비교해요!`;
  } else if (blockCurrentStep === 2) {
    stepTitle = needBorrow ? "2단계: 낱개가 부족해요! 막대 1개 펑! 💥 (받아내림)" : "2단계: 낱개 비교하기";
    stepDesc = needBorrow
      ? `낱개 ${onesA}개에서 ${onesB}개를 뺄 수 없어 <strong>10개 막대 1개를 낱개 10개로 쪼갰어요!</strong> (낱개 ${onesA + 10}개)`
      : `낱개 ${onesA}개에서 ${onesB}개를 바로 뺄 수 있어요!`;
    speechText = needBorrow
      ? `낱개가 부족해요! 10개짜리 막대 1개를 낱개 10개로 쪼개서 합쳐요!`
      : `낱개가 충분해서 바로 덜어낼 수 있어요!`;
  } else if (blockCurrentStep === 3) {
    const leftOnes = (needBorrow ? onesA + 10 : onesA) - onesB;
    stepTitle = "3단계: 낱개 큐브 덜어내기";
    stepDesc = `낱개 ${onesB}개를 덜어내니 <strong>낱개 ${leftOnes}개</strong>가 남았어요!`;
    speechText = `낱개를 덜어냈어요! 남은 낱개는 ${leftOnes}개예요.`;
  } else if (blockCurrentStep === 4) {
    const leftTens = (needBorrow ? tensA - 1 : tensA) - tensB;
    stepTitle = "4단계: 10개 막대 덜어내기";
    stepDesc = `10개 막대 ${tensB}개를 덜어내니 <strong>10개 막대 ${leftTens}개</strong>가 남았어요!`;
    speechText = `이제 10개 막대를 덜어내요. 남은 10개 막대는 ${leftTens}개예요!`;
  } else {
    stepTitle = "5단계: 최종 남은 수 확인 🎉";
    stepDesc = `남은 블록 = <strong>${diff}</strong> (${curNumA} − ${curNumB} = ${diff})!`;
    speechText = `짜잔! 모두 덜어내고 남은 수는 ${diff}이에요. 참 잘했어요!`;
  }

  container.innerHTML = `
    <div class="block-stage-wrap">
      <div class="block-step-nav">
        <span class="step-pill">🧱 블록 덜어내기 (${blockCurrentStep} / ${blockMaxSteps}단계)</span>
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
          <div class="block-group-title"><span>📦 원래 수 (${curNumA})</span><span style="font-size:0.85rem; color:#94a3b8;">10개 막대 ${tensA}개 / 낱개 ${onesA}개</span></div>
          <div class="blocks-row">${'<div class="ten-rod"></div>'.repeat(tensA)}<div style="width:12px;"></div>${'<div class="unit-cube"></div>'.repeat(onesA)}</div>
        </div>
        <div class="block-group-box">
          <div class="block-group-title"><span>✂️ 덜어낼 수 (${curNumB})</span><span style="font-size:0.85rem; color:#ef4444;">10개 막대 ${tensB}개 / 낱개 ${onesB}개 덜어냄</span></div>
          <div class="blocks-row">${'<div class="ten-rod" style="opacity:0.4; border-style:dashed;"></div>'.repeat(tensB)}<div style="width:12px;"></div>${'<div class="unit-cube" style="opacity:0.4; border-style:dashed;"></div>'.repeat(onesB)}</div>
        </div>
      </div>
    </div>
  `;
  studioSpeak(speechText);
}

function renderMultiplicationBlocksView(container) {
  const prod = curNumA * curNumB;
  let stepTitle = "", stepDesc = "", speechText = "";

  if (blockCurrentStep === 1) {
    stepTitle = "1단계: 한 묶음의 크기 확인";
    stepDesc = `한 묶음에 <strong>${curNumA}개</strong>씩 들어있는 상자를 준비해요.`;
    speechText = `한 묶음에 ${curNumA}개씩 들어있어요. 이걸 ${curNumB}묶음 모을 거예요!`;
  } else if (blockCurrentStep === 2) {
    stepTitle = "2단계: 묶음 수만큼 상자 나란히 놓기";
    stepDesc = `상자 <strong>${curNumB}개</strong>를 나란히 놓았어요! (동수누가: ${curNumA}를 ${curNumB}번 더하기)`;
    speechText = `${curNumA}개짜리 상자가 ${curNumB}개 있어요!`;
  } else if (blockCurrentStep === 3) {
    stepTitle = "3단계: 자리별로 묶어 세기";
    stepDesc = `십의 자리와 일의 자리를 나누어 묶으면 훨씬 쉽게 셀 수 있어요!`;
    speechText = `자리별로 나누어 묶어볼까요?`;
  } else if (blockCurrentStep === 4) {
    stepTitle = "4단계: 10개 낱개 모아 10 막대로 정리";
    stepDesc = `낱개가 10개 모일 때마다 10개 막대로 묶어서 정리해요!`;
    speechText = `낱개들을 10개씩 모아 10개 막대로 정리해요!`;
  } else {
    stepTitle = "5단계: 최종 곱 확인 🎉";
    stepDesc = `${curNumA} × ${curNumB} = <strong>${prod}</strong> (총 ${prod}개)!`;
    speechText = `짜잔! 전체 개수는 ${prod}개예요. 참 잘했어요!`;
  }

  const sampleBoxes = Math.min(curNumB, 6);
  let boxesHtml = '';
  for (let i = 1; i <= sampleBoxes; i++) {
    boxesHtml += `
      <div style="background:rgba(56,189,248,0.15); border:1.5px solid #38bdf8; border-radius:12px; padding:10px; text-align:center; min-width:60px;">
        <div style="font-size:0.8rem; color:#94a3b8;">${i}번째 상자</div>
        <div style="font-family:'Jua'; color:#38bdf8; font-size:1.3rem;">${curNumA}개</div>
      </div>
    `;
  }
  if (curNumB > 6) {
    boxesHtml += `<div style="align-self:center; font-family:'Jua'; color:#94a3b8; font-size:1.2rem;">... 외 ${curNumB - 6}상자</div>`;
  }

  container.innerHTML = `
    <div class="block-stage-wrap">
      <div class="block-step-nav">
        <span class="step-pill">🧱 묶음 블록 모델 (${blockCurrentStep} / ${blockMaxSteps}단계)</span>
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
          <div class="block-group-title"><span>📦 ${curNumA}개씩 ${curNumB}묶음</span><span style="font-size:0.85rem; color:#4ade80;">총 곱: ${prod}</span></div>
          <div style="display:flex; gap:8px; flex-wrap:wrap; justify-content:center; padding:10px;">${boxesHtml}</div>
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
