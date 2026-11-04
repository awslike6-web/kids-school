// ========================================================
// 🧮 연산 멀티 스튜디오 상태 관리 및 코어 엔진
// ========================================================
let currentOp = 'div'; // 'div', 'mul', 'add', 'sub'
let curNumA = 74;
let curNumB = 6;
let currentViewTab = 'blocks'; // 'blocks', 'vertical', 'numberline', 'area'

let blockCurrentStep = 1;

let tutorCurrentStep = 1;
let currentPlan = [];

// 풀이 계획 엔진(math_operator_studio-plans.js)에서 쓰는 이름들
const StudioPlans = window.OperatorStudioPlans;
const {
  DIVIDEND_MAX,
  DIVISOR_MAX,
  clampStudioValue,
  clampDivisionValue,
  numberJosa,
  divisionResultText,
  buildDivisionPlan,
  buildAdditionPlan,
  buildSubtractionPlan,
  buildMultiplicationPlan
} = StudioPlans;

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
    { a: 85, b: 47, label: '85 + 47 (두 번 올림)' },
    { a: 156, b: 87, label: '156 + 87 (두 번 올림)' },
    { a: 389, b: 425, label: '389 + 425 (세 자리 두 번 올림)' },
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
    currentPlan = buildDivisionPlan(curNumA, curNumB);
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

// 뺄셈에서 앞의 수가 작으면 모든 탭에서 이 안내만 보여 준다
function renderSubtractionGuide(container) {
  container.innerHTML = `
    <div class="subtraction-guide">
      <h3>큰 수에서 작은 수를 빼요! 💡</h3>
      <p>지금은 <strong>${curNumA} − ${curNumB}</strong>라서 뺄 수 없어요. <strong>${curNumB} − ${curNumA}</strong>처럼 큰 수를 앞에 적어 보세요!</p>
    </div>
  `;
  studioSpeak('큰 수에서 작은 수를 빼요! 큰 수를 앞에 적어 볼까요?');
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
