
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

// 수직선 스텝 (0이면 아직 출발 전)
let numberLineStep = 0;

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

  const rawA = parseInt(document.getElementById('numA').value, 10);
  const rawB = parseInt(document.getElementById('numB').value, 10);
  curNumA = rawA || 1;
  curNumB = rawB || 1;

  if (currentOp === 'div') {
    if (rawB === 0) alert('0으로는 나눌 수 없어요!');

    // 입력칸 범위(1~999 ÷ 1~99)를 벗어난 값은 범위 안으로 맞춘 뒤 화면에도 보여 준다
    curNumA = clampDivisionValue(curNumA, DIVIDEND_MAX);
    curNumB = clampDivisionValue(curNumB, DIVISOR_MAX);
    document.getElementById('numA').value = curNumA;
    document.getElementById('numB').value = curNumB;

    // 나눗셈 풀이 계획 수립
    buildDivisionPlan(curNumA, curNumB);
  }

  blockCurrentStep = 1;
  tutorCurrentStep = 1;
  numberLineStep = 0;

  renderCurrentTab();
}

// ========================================================
// ➗ 나눗셈 풀이 계획 엔진 (Build Division Plan)
// 자릿수와 상관없이 세로셈을 한 자리씩 진행하고, 단계마다 칠판 상태(board)를 함께 저장한다.
// 화면은 board만 그리므로 풀이와 화면이 어긋나지 않는다.
// ========================================================
const DIVIDEND_MAX = 999;
const DIVISOR_MAX = 99;
const DIVISION_PLACE_NAMES = ['일', '십', '백'];

function clampDivisionValue(value, max) {
  return Math.min(Math.max(value, 1), max);
}

// 숫자를 소리 내어 읽을 때 받침이 있는지로 조사를 고른다 (2·4·5·9만 받침 없음)
function numberJosa(n, withBatchim, withoutBatchim) {
  return [2, 4, 5, 9].includes(n % 10) ? withoutBatchim : withBatchim;
}

function divisionResultText(quotient, remainder) {
  return `전체 몫은 ${quotient}, 나머지는 ${remainder}${numberJosa(remainder, '이에요', '예요')}.`;
}

function buildDivisionPlan(dividend, divisor) {
  const digits = String(dividend).split('').map(Number);
  const lastCol = digits.length - 1;
  const qTotal = Math.floor(dividend / divisor);
  const rTotal = dividend % divisor;
  const resultText = divisionResultText(qTotal, rTotal);
  const placeName = col => DIVISION_PLACE_NAMES[lastCol - col];
  const divisorGa = `${divisor}${numberJosa(divisor, '이', '가')}`;

  const quotient = digits.map(() => '');
  const rows = [];
  const plan = [];

  const pushStep = (focus, val, title, desc, speech, marks = {}) => {
    const step = plan.length + 1;
    plan.push({
      step,
      title: `${step}단계: ${title}`,
      desc,
      speech,
      focus,
      val,
      board: {
        quotient: [...quotient],
        rows: rows.map(row => ({ ...row })),
        activeQuotientCol: marks.quotientCol ?? null,
        activeDividendCols: marks.dividendCols ?? [],
        activeRow: marks.row ?? null
      }
    });
  };

  let col = 0;
  let running = digits[0];

  // 맨 앞자리에 나누는 수가 들어가지 않으면 옆자리까지 함께 본다 (예: 56 ÷ 8은 5가 아니라 56부터)
  if (running < divisor && lastCol > 0) {
    const first = running;
    while (running < divisor && col < lastCol) {
      col++;
      running = running * 10 + digits[col];
    }
    pushStep(
      'look',
      running,
      '어디부터 나눌까요? 🔍',
      `<strong>${first}</strong>에는 ${divisorGa} 들어가지 않아요. <strong>${running}</strong>까지 함께 봐요!`,
      `${first}에는 ${divisorGa} 들어가지 않아요. 그래서 ${running}까지 함께 보고 나눌 거예요!`,
      { dividendCols: digits.map((_, i) => i).filter(i => i <= col) }
    );
  }

  for (;;) {
    const q = Math.floor(running / divisor);
    const product = q * divisor;
    const rem = running - product;
    const isLast = col === lastCol;
    quotient[col] = String(q);

    if (q === 0) {
      if (isLast) {
        // 더 내려올 수가 없으므로 지금 수가 그대로 나머지가 된다
        if (rows.length === 0) {
          rows.push({ kind: 'remainder', value: String(running), endCol: col, broughtCol: null });
        }
        pushStep(
          'remainder',
          running,
          '나머지 확인 🎉',
          `<strong>${running}</strong>에는 ${divisorGa} 들어가지 않아 몫에 0을 적어요. ${resultText}`,
          `${running}에는 ${divisorGa} 들어가지 않아서 몫에 0을 적어요. ${resultText} 참 잘했어요!`,
          { quotientCol: col, row: rows.length - 1 }
        );
        break;
      }
      pushStep(
        'quotient',
        0,
        `${placeName(col)}의 자리 몫은 0`,
        `<strong>${running}</strong>에는 ${divisorGa} 들어가지 않아요. 몫의 ${placeName(col)}의 자리에 <strong>0</strong>을 적어요.`,
        `${running}에는 ${divisorGa} 들어가지 않아요. 몫의 ${placeName(col)}의 자리에 0을 적어요!`,
        { quotientCol: col }
      );
    } else {
      pushStep(
        'quotient',
        q,
        `${placeName(col)}의 자리 몫 구하기`,
        `<strong>${running}</strong>에 ${divisorGa} 몇 번 들어갈까요? <strong>${q}번</strong> 들어가요!`,
        `${running}에는 ${divisorGa} ${q}번 들어가요! 몫의 ${placeName(col)}의 자리에 ${q}${numberJosa(q, '을', '를')} 적어요.`,
        { quotientCol: col }
      );

      rows.push({
        kind: 'product',
        value: String(product),
        endCol: col,
        lineFromCol: col - String(running).length + 1
      });
      pushStep(
        'product',
        product,
        '곱해서 적기',
        `${divisor} × ${q} = <strong>${product}</strong>`,
        `${divisor} 곱하기 ${q}${numberJosa(q, '은', '는')} ${product}! ${running} 밑에 ${product}${numberJosa(product, '을', '를')} 적어요.`,
        { row: rows.length - 1 }
      );

      rows.push({ kind: 'remainder', value: String(rem), endCol: col, broughtCol: null });
      if (isLast) {
        pushStep(
          'remainder',
          rem,
          '빼고 나머지 확인 🎉',
          `${running} - ${product} = <strong>${rem}</strong>. ${resultText}`,
          `${running}에서 ${product}${numberJosa(product, '을', '를')} 빼면 ${rem}${numberJosa(rem, '이', '가')} 남아요! ${resultText} 참 잘했어요!`,
          { row: rows.length - 1 }
        );
        break;
      }
      pushStep(
        'subtract',
        rem,
        '빼기',
        `${running} - ${product} = <strong>${rem}</strong>`,
        `${running} 빼기 ${product}${numberJosa(product, '은', '는')} ${rem}${numberJosa(rem, '이에요', '예요')}.`,
        { row: rows.length - 1 }
      );
    }

    // 다음 자리 내려쓰기: 앞이 0이면 "08"이 아니라 "8"로 적는다
    col++;
    const brought = digits[col];
    running = rem * 10 + brought;
    const current = rows[rows.length - 1];
    current.value = String(running);
    current.endCol = col;
    current.broughtCol = col;
    pushStep(
      'bring_down',
      running,
      `${placeName(col)}의 자리 내려쓰기 ⬇️`,
      `${placeName(col)}의 자리 <strong>${brought}</strong>${numberJosa(brought, '이', '가')} 스르륵 내려와서 <strong>${running}</strong>${numberJosa(running, '이', '가')} 되었어요!`,
      `${placeName(col)}의 자리 숫자 ${brought}${numberJosa(brought, '이', '가')} 스르륵 내려와서 ${running}${numberJosa(running, '이', '가')} 되었어요! 이제 ${running}${numberJosa(running, '을', '를')} 나눌 차례예요.`,
      { row: rows.length - 1, dividendCols: [col] }
    );
  }

  divisionPlan = plan;
}

// ========================================================
// 📏 수직선 모델: 나누어지는 수에서 나누는 수씩 뒤로 뛰는 점프 목록과 눈금 위치(%)
// 점프가 너무 많으면 앞뒤만 그리고 가운데는 줄여서 보여 준다 (예: 999 ÷ 1).
// ========================================================
function buildNumberLineModel(dividend, divisor, maxJumps = 12) {
  const quotient = Math.floor(dividend / divisor);
  const remainder = dividend % divisor;
  const compressed = quotient > maxJumps;
  const edgeJumps = Math.floor((maxJumps - 2) / 2);

  const indexes = [];
  for (let i = 1; i <= quotient; i++) {
    if (!compressed || i <= edgeJumps || i > quotient - edgeJumps) indexes.push(i);
  }
  const jumps = indexes.map(index => ({
    index,
    from: dividend - (index - 1) * divisor,
    to: dividend - index * divisor
  }));

  const values = new Set([0, remainder, dividend]);
  jumps.forEach(jump => {
    values.add(jump.from);
    values.add(jump.to);
  });
  const sorted = [...values].sort((a, b) => a - b);

  let gap = null;
  let position;
  if (compressed) {
    // 축을 줄이면 비례가 맞지 않으므로 칸을 고르게 나누고, 줄인 구간에 한 칸을 더 비워 둔다
    const gapStart = dividend - (quotient - edgeJumps) * divisor;
    const gapIndex = sorted.indexOf(gapStart);
    const slotCount = sorted.length;
    position = value => {
      const index = sorted.indexOf(value);
      return ((index > gapIndex ? index + 1 : index) / slotCount) * 100;
    };
    gap = {
      skipped: quotient - edgeJumps * 2,
      pos: ((gapIndex + 1) / slotCount) * 100
    };
  } else {
    position = value => (value / dividend) * 100;
  }

  return {
    dividend,
    divisor,
    quotient,
    remainder,
    compressed,
    gap,
    jumps: jumps.map(jump => ({ ...jump, fromPos: position(jump.from), toPos: position(jump.to) })),
    ticks: sorted.map((value, i) => ({ value, pos: position(value), low: i % 2 === 0 }))
  };
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

