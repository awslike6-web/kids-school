// 민민 우주 정거장 세로셈 동적 훈련소 로직 (vertical_math_logic.js)

let currentProfile = localStorage.getItem('currentUser') || 'son';
let gameState = { mode: '', questions: [], current: 0, correctCount: 0 };
let focusedInput = null;
window.wrongNotes = JSON.parse(localStorage.getItem(`minmin_math_wrong_${currentProfile}`)) || [];

let roomStartTime = new Date();
let isExiting = false;
window.currentSubject = "수학"; // 전역 관제탑을 위한 기본 과목 설정

document.addEventListener("DOMContentLoaded", () => {
  // 🚀 노션 관제탑 파이프라인 탑재
  if (typeof loadCoreScripts === 'function') {
      loadCoreScripts("../../core/", ["notion-helper.js"], () => {
          console.log("🚀 노션 관제탑(notion-helper) 파이프라인 연결 완료!");
      });
  }

  const name = currentProfile === 'son' ? '민수' : (currentProfile === 'daughter' ? '민서' : '어른');
  const icon = currentProfile === 'son' ? '👨‍🚀' : (currentProfile === 'daughter' ? '👩‍🚀' : '👨‍💻');
  
  // 💡 사회방과 완벽하게 동일한 테마 시스템 전파 (theme--arcade / theme--slime)
  const savedTheme = localStorage.getItem('currentTheme') || (currentProfile === 'daughter' ? '슬라임' : '마인크래프트');
  const themeClass = savedTheme === '슬라임' ? 'theme--slime' : 'theme--arcade';
  document.body.className = themeClass;

  document.getElementById('userName').textContent = `${name} 탐험대원`;
  document.getElementById('userIcon').textContent = icon;

  initMemoPad();

  // 🧚 수학요정 코코 시동
  if (typeof initFairyAudio === 'function') initFairyAudio();
  if (typeof initFairyChat === 'function') initFairyChat("MATH", "세로셈방");
  if (typeof updateTtsToggleUi === 'function') updateTtsToggleUi();
  if (typeof renderQuizFlowToggleUI === 'function') renderQuizFlowToggleUI('verticalMathFlowToggle', '수학');
});

// 📝 계산 메모장 (글씨 / 그리기)
let memoMode = 'text';
let memoDrawing = false;
let memoCanvasCtx = null;

function initMemoPad() {
  const canvas = document.getElementById('memo-canvas');
  if (!canvas || canvas.dataset.ready === '1') return;

  memoCanvasCtx = canvas.getContext('2d');
  resizeMemoCanvas();
  canvas.dataset.ready = '1';

  const startDraw = (e) => {
    if (memoMode !== 'draw') return;
    memoDrawing = true;
    const p = getMemoCanvasPoint(canvas, e);
    memoCanvasCtx.beginPath();
    memoCanvasCtx.moveTo(p.x, p.y);
    e.preventDefault();
  };

  const moveDraw = (e) => {
    if (!memoDrawing || memoMode !== 'draw') return;
    const p = getMemoCanvasPoint(canvas, e);
    memoCanvasCtx.lineTo(p.x, p.y);
    memoCanvasCtx.stroke();
    e.preventDefault();
  };

  const endDraw = () => { memoDrawing = false; };

  canvas.addEventListener('mousedown', startDraw);
  canvas.addEventListener('mousemove', moveDraw);
  canvas.addEventListener('mouseup', endDraw);
  canvas.addEventListener('mouseleave', endDraw);
  canvas.addEventListener('touchstart', startDraw, { passive: false });
  canvas.addEventListener('touchmove', moveDraw, { passive: false });
  canvas.addEventListener('touchend', endDraw);

  window.addEventListener('resize', resizeMemoCanvas);
}

function getMemoCanvasPoint(canvas, e) {
  const rect = canvas.getBoundingClientRect();
  const touch = e.touches && e.touches[0];
  const clientX = touch ? touch.clientX : e.clientX;
  const clientY = touch ? touch.clientY : e.clientY;
  return {
    x: (clientX - rect.left) * (canvas.width / rect.width),
    y: (clientY - rect.top) * (canvas.height / rect.height),
  };
}

function resizeMemoCanvas() {
  const canvas = document.getElementById('memo-canvas');
  if (!canvas || !memoCanvasCtx) return;

  const snapshot = document.createElement('canvas');
  if (canvas.width > 0 && canvas.height > 0) {
    snapshot.width = canvas.width;
    snapshot.height = canvas.height;
    snapshot.getContext('2d').drawImage(canvas, 0, 0);
  }

  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(200, Math.floor(rect.width) || 216);
  canvas.height = Math.max(180, Math.floor(rect.height) || 220);

  memoCanvasCtx.lineCap = 'round';
  memoCanvasCtx.lineJoin = 'round';
  memoCanvasCtx.lineWidth = 3;
  memoCanvasCtx.strokeStyle = '#2D2D4E';
  if (snapshot.width > 0) {
    memoCanvasCtx.drawImage(snapshot, 0, 0, canvas.width, canvas.height);
  }
}

window.switchMemoMode = function(mode) {
  memoMode = mode;
  document.querySelectorAll('.memo-tab').forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.mode === mode);
  });

  const textEl = document.getElementById('memo-text');
  const drawWrap = document.getElementById('memo-draw-wrap');
  if (!textEl || !drawWrap) return;

  if (mode === 'text') {
    textEl.hidden = false;
    drawWrap.hidden = true;
  } else {
    textEl.hidden = true;
    drawWrap.hidden = false;
    initMemoPad();
    resizeMemoCanvas();
  }
};

window.clearMemoPad = function() {
  const textEl = document.getElementById('memo-text');
  if (textEl) textEl.value = '';

  const canvas = document.getElementById('memo-canvas');
  if (canvas && memoCanvasCtx) {
    memoCanvasCtx.clearRect(0, 0, canvas.width, canvas.height);
  }
};

// 📝 계산 연습장 모달 토글
window.toggleCalcMemoModal = function(forceOpen) {
  const modal = document.getElementById('calc-memo-modal');
  if (!modal) return;
  const isHidden = (modal.style.display === 'none' || !modal.style.display);
  const willOpen = (typeof forceOpen === 'boolean') ? forceOpen : isHidden;
  
  if (willOpen) {
    modal.style.display = 'flex';
    initMemoPad();
    setTimeout(resizeMemoCanvas, 50);
  } else {
    modal.style.display = 'none';
  }
};

// 📱 키패드 접기/펼치기 토글
let isNumpadCollapsed = false;
window.toggleNumpadCollapse = function() {
  const container = document.getElementById('numpad-container');
  const toggleText = document.getElementById('numpadToggleText');
  if (!container) return;
  isNumpadCollapsed = !isNumpadCollapsed;
  container.classList.toggle('collapsed', isNumpadCollapsed);
  if (toggleText) {
    toggleText.textContent = isNumpadCollapsed ? '🔼 키패드 열기' : '🔽 키패드 접기';
  }
};

function isVerticalMathInProgress() {
  const gameScreen = document.getElementById('screen-game');
  return !!(gameScreen && gameScreen.classList.contains('active')
    && gameState && Array.isArray(gameState.questions) && gameState.questions.length > 0
    && gameState.current < gameState.questions.length);
}

// 🚪 학습 종료(exitRoom) 배선 및 학습 일지 전송
window.exitRoom = async function(force) {
  if (isExiting) return;
  if (!force && typeof confirmLeaveActiveSession === 'function' && !confirmLeaveActiveSession()) {
    return;
  }
  if (typeof disarmQuizLeaveGuard === 'function') disarmQuizLeaveGuard();
  isExiting = true;

  const opNames = { add: '수학(덧셈 세로셈)', sub: '수학(뺄셈 세로셈)', mul: '수학(곱셈 세로셈)', div: '수학(나눗셈 세로셈)' };
  const currentOpName = gameState.mode ? opNames[gameState.mode] : '수학(세로셈 메인)';

  const errorReportText = (window.wrongNotes && window.wrongNotes.length > 0)
      ? window.wrongNotes.map(n => `${n.text} (입력:${n.userAns}/정답:${n.answer})`).join(' / ')
      : '오답 없음';

  if (typeof finalizeQuizRewardSession === 'function') {
      await finalizeQuizRewardSession({
          isFullComplete: false,
          subject: currentOpName,
          errorReport: errorReportText
      });
  } else if (typeof sendStudyLogToNotion === 'function') {
      await sendStudyLogToNotion({ subject: currentOpName, errorReport: errorReportText });
  }
  
  location.href = 'math.html';
};

function setFocus(el) {
  if (!el) return;
  document.querySelectorAll('.grid-input').forEach(i => i.classList.remove('focused'));
  el.classList.add('focused');
  focusedInput = el;
}

window.showScreen = function(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

window.goSetup = function() { showScreen('screen-setup'); }

// 가상 키패드 로직 (지능형 자동 이동 기능)
window.pressNum = function(num) {
  if (!focusedInput) return;
  focusedInput.value = num; // 셀당 1글자 입력
  
  const allInputs = Array.from(document.querySelectorAll('.grid-input:not([disabled])'));
  const curIdx = allInputs.indexOf(focusedInput);
  
  // 1) 나눗셈 몫 칸(data-type="q"): 왼쪽에서 오른쪽으로 작성하므로 오른쪽 칸 우선 이동
  if (focusedInput.dataset.type === 'q') {
    const row = parseInt(focusedInput.dataset.row, 10);
    const col = parseInt(focusedInput.dataset.col, 10);
    const rightCell = document.querySelector(`.grid-input[data-row="${row}"][data-col="${col + 1}"]`);
    if (rightCell) {
      setFocus(rightCell);
      return;
    }
  }
  
  // 2) 일반 세로셈: 같은 행의 왼쪽 칸(col - 1)으로 자동 이동 (일의자리 ➔ 십의자리)
  const row = parseInt(focusedInput.dataset.row, 10);
  const col = parseInt(focusedInput.dataset.col, 10);
  const leftCell = document.querySelector(`.grid-input[data-row="${row}"][data-col="${col - 1}"]`);
  if (leftCell) {
    setFocus(leftCell);
    return;
  }
  
  // 3) 같은 행에 더 이상 칸이 없으면 DOM 순서상 다음 비어있는 칸으로 이동
  const nextEmpty = allInputs.find((el, idx) => idx > curIdx && !el.value);
  if (nextEmpty) {
    setFocus(nextEmpty);
  } else if (curIdx + 1 < allInputs.length) {
    setFocus(allInputs[curIdx + 1]);
  }
};

window.pressBackspace = function() {
  if (!focusedInput) return;
  focusedInput.value = '';
  
  const allInputs = Array.from(document.querySelectorAll('.grid-input:not([disabled])'));
  const curIdx = allInputs.indexOf(focusedInput);
  
  // 1) 나눗셈 몫 칸: 지울 때는 왼쪽 칸으로 역이동
  if (focusedInput.dataset.type === 'q') {
    const row = parseInt(focusedInput.dataset.row, 10);
    const col = parseInt(focusedInput.dataset.col, 10);
    const leftCell = document.querySelector(`.grid-input[data-row="${row}"][data-col="${col - 1}"]`);
    if (leftCell) {
      setFocus(leftCell);
      return;
    }
  }
  
  // 2) 일반 세로셈: 지울 때는 오른쪽 칸(col + 1)으로 역이동
  const row = parseInt(focusedInput.dataset.row, 10);
  const col = parseInt(focusedInput.dataset.col, 10);
  const rightCell = document.querySelector(`.grid-input[data-row="${row}"][data-col="${col + 1}"]`);
  if (rightCell) {
    setFocus(rightCell);
    return;
  }
  
  // 3) 이전 칸으로 역이동
  if (curIdx > 0) {
    setFocus(allInputs[curIdx - 1]);
  }
};

window.pressClear = function() {
  if (!focusedInput) return;
  focusedInput.value = '';
};

const DIFFICULTY_LEVELS = {
  add: [
    { id: '1_1', label: '1자리 + 1자리', aLen: 1, bLen: 1 },
    { id: '2_1', label: '2자리 + 1자리', aLen: 2, bLen: 1 },
    { id: '2_2', label: '2자리 + 2자리', aLen: 2, bLen: 2 },
    { id: '3_2', label: '3자리 + 2자리', aLen: 3, bLen: 2 },
    { id: '3_3', label: '3자리 + 3자리', aLen: 3, bLen: 3 },
  ],
  sub: [
    { id: '1_1', label: '1자리 - 1자리', aLen: 1, bLen: 1 },
    { id: '2_1', label: '2자리 - 1자리', aLen: 2, bLen: 1 },
    { id: '2_2', label: '2자리 - 2자리', aLen: 2, bLen: 2 },
    { id: '3_2', label: '3자리 - 2자리', aLen: 3, bLen: 2 },
    { id: '3_3', label: '3자리 - 3자리', aLen: 3, bLen: 3 },
  ],
  mul: [
    { id: '1_1', label: '1자리 x 1자리', aLen: 1, bLen: 1 },
    { id: '2_1', label: '2자리 x 1자리', aLen: 2, bLen: 1 },
    { id: '2_2', label: '2자리 x 2자리', aLen: 2, bLen: 2 },
    { id: '3_1', label: '3자리 x 1자리', aLen: 3, bLen: 1 },
    { id: '3_2', label: '3자리 x 2자리', aLen: 3, bLen: 2 },
  ],
  div: [
    { id: '2_1', label: '2자리 ÷ 1자리', aLen: 2, bLen: 1 },
    { id: '3_1', label: '3자리 ÷ 1자리', aLen: 3, bLen: 1 },
    { id: '3_2', label: '3자리 ÷ 2자리', aLen: 3, bLen: 2 },
  ]
};

window.showDifficultyModal = function(mode) {
  const modal = document.getElementById('difficulty-modal');
  const btnContainer = document.getElementById('diff-buttons');
  const title = document.getElementById('diff-modal-title');
  
  const titles = { add: '덧셈 기지', sub: '뺄셈 기지', mul: '곱셈 기지', div: '나눗셈 기지' };
  title.textContent = titles[mode];
  btnContainer.innerHTML = '';
  
  DIFFICULTY_LEVELS[mode].forEach(lvl => {
    const btn = document.createElement('button');
    btn.textContent = lvl.label;
    btn.style.cssText = "padding:15px; border-radius:12px; border:2px solid var(--sky); background:white; font-family:'Jua'; font-size:1.4rem; cursor:pointer; color:var(--dark); transition:0.2s;";
    btn.onmouseover = () => btn.style.background = '#e0f7fa';
    btn.onmouseout = () => btn.style.background = 'white';
    btn.onclick = () => {
      closeDifficultyModal();
      startGame(mode, lvl);
    };
    btnContainer.appendChild(btn);
  });
  
  modal.style.display = 'flex';
}

window.closeDifficultyModal = function() {
  document.getElementById('difficulty-modal').style.display = 'none';
}

// 문제 생성기 (동적 그리드를 뽐내기 위해 자릿수 강화)
function generateQuestions(mode, lvl) {
  const qs = [];
  for(let i=0; i<10; i++) {
    let a, b, ans, rem = 0;
    
    const getNum = (len) => {
        if (len === 1) return Math.floor(Math.random() * 9) + 1; // 1~9
        if (len === 2) return Math.floor(Math.random() * 90) + 10; // 10~99
        if (len === 3) return Math.floor(Math.random() * 900) + 100; // 100~999
        return 1;
    };

    if (mode === 'add') {
      a = getNum(lvl.aLen);
      b = getNum(lvl.bLen);
      ans = a + b;
    } else if (mode === 'sub') {
      a = getNum(lvl.aLen);
      b = getNum(lvl.bLen);
      if (a < b) { let temp = a; a = b; b = temp; } // 항상 큰 수에서 작은 수를 빼도록
      ans = a - b;
    } else if (mode === 'mul') {
      a = getNum(lvl.aLen);
      b = getNum(lvl.bLen);
      ans = a * b;
    } else if (mode === 'div') {
      b = getNum(lvl.bLen);
      if (b === 1 && Math.random() > 0.3) b = Math.floor(Math.random() * 8) + 2; // 1로 나누는 경우 줄임
      const minA = Math.pow(10, lvl.aLen - 1);
      const maxA = Math.pow(10, lvl.aLen) - 1;
      
      const maxQ = Math.floor(maxA / b);
      const minQ = Math.ceil(minA / b);
      
      if (maxQ < minQ) {
         a = getNum(lvl.aLen);
         ans = Math.floor(a / b);
         rem = a % b;
      } else {
         ans = Math.floor(Math.random() * (maxQ - minQ + 1)) + minQ;
         rem = Math.floor(Math.random() * b);
         a = (ans * b) + rem;
         if (a > maxA) { a = ans * b; rem = 0; }
      }
    }
    qs.push({ numA: a, numB: b, answer: ans, rem });
  }
  return qs;
}

window.startGame = function(mode, lvl) {
  if (!lvl) lvl = DIFFICULTY_LEVELS[mode][DIFFICULTY_LEVELS[mode].length - 1]; // 기본값: 가장 어려운 난이도

  gameState = { mode, lvl, questions: generateQuestions(mode, lvl), current: 0, correctCount: 0 };
  
  // 🚀 세로셈 퀴즈 세션 초기화 (표준 보상 & 일지 트래커)
  if (typeof initQuizRewardSession === 'function') {
      initQuizRewardSession('vertical_math_' + mode);
  }

  const titles = { add: '➕ 덧셈 기지', sub: '➖ 뺄셈 기지', mul: '✖️ 곱셈 기지', div: '➗ 나눗셈 기지' };
  document.getElementById('game-title').innerHTML = `${titles[mode]} <span style="font-size:1rem;color:#ccc;font-weight:normal;">(${lvl.label})</span>`;
  
  showScreen('screen-game');
  nextQuestion();
  if (typeof armQuizLeaveGuard === 'function') {
    armQuizLeaveGuard({
      isActive: isVerticalMathInProgress,
      onLeave: () => window.exitRoom(true)
    });
  }
}

// ➗ 나눗셈 롱 디비전(Long Division) 시뮬레이터
function simulateDivision(a, b) {
  const aStr = String(a);
  const steps = [];
  let currentVal = 0;
  const quotientDigits = [];
  let started = false;

  for (let i = 0; i < aStr.length; i++) {
    currentVal = currentVal * 10 + parseInt(aStr[i], 10);
    if (currentVal >= b) {
      started = true;
      const qDigit = Math.floor(currentVal / b);
      const product = qDigit * b;
      const remainder = currentVal - product;
      quotientDigits.push({ digit: qDigit, colIdx: i });
      steps.push({
        colEnd: i, // 피제수 기준 인덱스 (0-based)
        subDividend: currentVal,
        qDigit: qDigit,
        product: product,
        remainder: remainder
      });
      currentVal = remainder;
    } else if (started) {
      quotientDigits.push({ digit: 0, colIdx: i });
      steps.push({
        colEnd: i,
        subDividend: currentVal,
        qDigit: 0,
        product: 0,
        remainder: currentVal
      });
    }
  }

  if (quotientDigits.length === 0) {
    quotientDigits.push({ digit: 0, colIdx: aStr.length - 1 });
    steps.push({
      colEnd: aStr.length - 1,
      subDividend: a,
      qDigit: 0,
      product: 0,
      remainder: a
    });
  }

  return {
    quotientDigits,
    steps,
    finalRemainder: currentVal
  };
}

// 🚀 핵심: 세로셈 동적 그리드 정밀 생성 함수 (필요한 칸 수만 동적 할당)
function renderDynamicGrid(mode, q, isPrint = false) {
  const aStr = String(q.numA);
  const bStr = String(q.numB);
  let W = 0;
  let gridHTML = '';

  const commonInp = isPrint ? 'disabled' : `inputmode="none" readonly onclick="setFocus(this)"`;

  if (mode === 'add' || mode === 'sub') {
    const ansStr = String(q.answer);
    const numMaxLen = Math.max(aStr.length, bStr.length, ansStr.length);
    W = numMaxLen + 1; // 1열은 연산자 기호, 2~W열은 숫자
    
    gridHTML += `<div class="math-grid" style="grid-template-columns: repeat(${W}, 45px);">`;
    
    // 1행: 올림/내림수 메모 (실제 연산이 일어나는 열 범위에만 콤팩트 생성)
    const carryStartCol = Math.max(2, W - Math.max(aStr.length, bStr.length));
    for (let c = carryStartCol; c <= W; c++) {
      gridHTML += `<input type="text" class="grid-input cell-carry" data-row="1" data-col="${c}" style="grid-area: 1 / ${c};" ${commonInp}>`;
    }
    
    // 2행: 피연산자 A (우측 정렬)
    for (let i = 0; i < aStr.length; i++) {
      let c = W - aStr.length + 1 + i;
      gridHTML += `<div class="grid-cell" style="grid-area: 2 / ${c};">${aStr[i]}</div>`;
    }
    
    // 3행: 연산자 기호 (1열) & 피연산자 B (우측 정렬)
    const opSym = mode === 'add' ? '＋' : '－';
    gridHTML += `<div class="grid-cell cell-op" style="grid-area: 3 / 1;">${opSym}</div>`;
    for (let i = 0; i < bStr.length; i++) {
      let c = W - bStr.length + 1 + i;
      gridHTML += `<div class="grid-cell" style="grid-area: 3 / ${c};">${bStr[i]}</div>`;
    }
    
    // 4행: 밑줄 (1열부터 W열까지)
    gridHTML += `<div class="grid-line" style="grid-area: 4 / 1 / 4 / ${W + 1};"></div>`;
    
    // 5행: 최종 정답 (정확히 정답 자릿수만큼만 우측 정렬로 생성!)
    const ansStartCol = W - ansStr.length + 1;
    for (let c = ansStartCol; c <= W; c++) {
      gridHTML += `<input type="text" class="grid-input cell-ans" data-type="ans" data-row="5" data-col="${c}" style="grid-area: 5 / ${c};" ${commonInp}>`;
    }
    gridHTML += `</div>`;
  }
  else if (mode === 'mul') {
    const ansStr = String(q.answer);
    const numMaxLen = Math.max(aStr.length, bStr.length, ansStr.length);
    W = numMaxLen + 1; // 1열은 연산자 기호 '×'
    
    gridHTML += `<div class="math-grid" style="grid-template-columns: repeat(${W}, 45px);">`;
    
    // 1행: 올림수
    const carryStartCol = Math.max(2, W - aStr.length);
    for (let c = carryStartCol; c <= W; c++) {
      gridHTML += `<input type="text" class="grid-input cell-carry" data-row="1" data-col="${c}" style="grid-area: 1 / ${c};" ${commonInp}>`;
    }
    
    // 2행: 피승수 A (우측 정렬)
    for (let i = 0; i < aStr.length; i++) {
      let c = W - aStr.length + 1 + i;
      gridHTML += `<div class="grid-cell" style="grid-area: 2 / ${c};">${aStr[i]}</div>`;
    }
    
    // 3행: 연산자 '×' (1열) & 승수 B (우측 정렬)
    gridHTML += `<div class="grid-cell cell-op" style="grid-area: 3 / 1;">×</div>`;
    for (let i = 0; i < bStr.length; i++) {
      let c = W - bStr.length + 1 + i;
      gridHTML += `<div class="grid-cell" style="grid-area: 3 / ${c};">${bStr[i]}</div>`;
    }
    
    // 4행: 첫 번째 밑줄
    gridHTML += `<div class="grid-line" style="grid-area: 4 / 1 / 4 / ${W + 1};"></div>`;
    
    let row = 5;
    // B가 2자리 이상일 때만 중간 부분곱 행 생성! (1자리면 중간과정 없이 즉시 정답)
    if (bStr.length > 1) {
      for (let j = bStr.length - 1; j >= 0; j--) {
        const bDigit = parseInt(bStr[j], 10);
        const partialProd = q.numA * bDigit;
        const pStr = String(partialProd);
        const shift = (bStr.length - 1) - j;
        const pEndCol = W - shift;
        const pStartCol = pEndCol - pStr.length + 1;
        
        // 정확히 pStr.length개 칸에만 cell-inter 생성! (여유 빈칸 낭비 0개)
        for (let c = pStartCol; c <= pEndCol; c++) {
          gridHTML += `<input type="text" class="grid-input cell-inter cell-inter-mul" data-row="${row}" data-col="${c}" style="grid-area: ${row} / ${c};" ${commonInp}>`;
        }
        row++;
      }
      // 덧셈 전 밑줄
      gridHTML += `<div class="grid-line" style="grid-area: ${row} / 1 / ${row} / ${W + 1};"></div>`;
      row++;
    }
    
    // 최종 정답 행: ansStr.length개 칸만 우측 정렬로 생성!
    const ansStartCol = W - ansStr.length + 1;
    for (let c = ansStartCol; c <= W; c++) {
      gridHTML += `<input type="text" class="grid-input cell-ans" data-type="ans" data-row="${row}" data-col="${c}" style="grid-area: ${row} / ${c};" ${commonInp}>`;
    }
    gridHTML += `</div>`;
  }
  else if (mode === 'div') {
    const sim = simulateDivision(q.numA, q.numB);
    const dividendStartCol = bStr.length + 2; // 제수 자리수 + 괄호 ')' 다음
    W = dividendStartCol + aStr.length - 1;
    
    gridHTML += `<div class="math-grid" style="grid-template-columns: repeat(${W}, 45px);">`;
    
    let row = 1;
    // 1행: 몫 (Quotient) - 실제 피제수의 해당 자릿수 열 위에만 정확히 몫 칸 생성!
    sim.quotientDigits.forEach((qd) => {
      const col = dividendStartCol + qd.colIdx;
      gridHTML += `<input type="text" class="grid-input cell-ans" data-type="q" data-row="${row}" data-col="${col}" style="grid-area: ${row} / ${col};" ${commonInp}>`;
    });
    row++;
    
    // 2행: 지붕 가로선 (피제수 영역 전체)
    gridHTML += `<div class="grid-line" style="grid-area: ${row} / ${dividendStartCol} / ${row} / ${W + 1};"></div>`;
    row++;
    
    // 3행: 제수 ) 피제수
    for (let i = 0; i < bStr.length; i++) {
      gridHTML += `<div class="grid-cell" style="grid-area: ${row} / ${1 + i};">${bStr[i]}</div>`;
    }
    gridHTML += `<div class="grid-cell cell-op" style="grid-area: ${row} / ${bStr.length + 1};">)</div>`;
    for (let i = 0; i < aStr.length; i++) {
      let c = dividendStartCol + i;
      gridHTML += `<div class="grid-cell" style="grid-area: ${row} / ${c};">${aStr[i]}</div>`;
    }
    row++;
    
    // 4행 이후: 실제 나눗셈 단계들만 정밀 생성!
    sim.steps.forEach((st, stepIdx) => {
      const isLastStep = (stepIdx === sim.steps.length - 1);
      const absColEnd = dividendStartCol + st.colEnd;
      
      // (1) 곱한 수 행
      const prodStr = String(st.product);
      const prodStartCol = absColEnd - prodStr.length + 1;
      for (let c = prodStartCol; c <= absColEnd; c++) {
        gridHTML += `<input type="text" class="grid-input cell-inter cell-inter-mul" data-row="${row}" data-col="${c}" data-step="${stepIdx + 1}" data-part="mul" style="grid-area: ${row} / ${c};" ${commonInp}>`;
      }
      row++;
      
      // 밑줄 (곱한 수 영역)
      gridHTML += `<div class="grid-line" style="grid-area: ${row} / ${Math.min(prodStartCol, absColEnd)} / ${row} / ${absColEnd + 1};"></div>`;
      row++;
      
      // (2) 빼기 결과 행
      if (!isLastStep) {
        // 다음 단계가 있는 경우: 내려쓴 자리까지 포함한 다음 부분피제수 입력 칸 생성
        const nextStep = sim.steps[stepIdx + 1];
        const nextSubStr = String(nextStep.subDividend);
        const nextColEnd = dividendStartCol + nextStep.colEnd;
        const nextStartCol = nextColEnd - nextSubStr.length + 1;
        
        for (let c = nextStartCol; c <= nextColEnd; c++) {
          gridHTML += `<input type="text" class="grid-input cell-inter cell-inter-sub" data-row="${row}" data-col="${c}" data-step="${stepIdx + 1}" data-part="sub" style="grid-area: ${row} / ${c};" ${commonInp}>`;
        }
        row++;
      } else {
        // 마지막 단계인 경우: 최종 나머지(Remainder) 행!
        const remStr = String(sim.finalRemainder);
        const remStartCol = absColEnd - remStr.length + 1;
        for (let c = remStartCol; c <= absColEnd; c++) {
          gridHTML += `<input type="text" class="grid-input cell-ans" data-type="rem" data-row="${row}" data-col="${c}" style="grid-area: ${row} / ${c};" ${commonInp}>`;
        }
      }
    });
    
    gridHTML += `</div>`;
  }

  return gridHTML;
}

function nextQuestion() {
  if (gameState.current >= gameState.questions.length) {
    showResult();
    return;
  }
  const q = gameState.questions[gameState.current];
  document.getElementById('game-qnum').textContent = `${gameState.current + 1} / ${gameState.questions.length}`;
  document.getElementById('v-feedbackMsg').textContent = '';
  
  // 동적 그리드 생성 호출
  document.getElementById('vertical-container').innerHTML = renderDynamicGrid(gameState.mode, q, false);
  clearMemoPad();
  switchMemoMode('text');

  // 포커스 자동 지정:
  // 나눗셈: 첫 번째 몫 칸
  // 덧셈/뺄셈/곱셈: 정답 행의 가장 오른쪽(일의 자리) 칸
  if (gameState.mode === 'div') {
    const firstQCell = document.querySelector('.cell-ans[data-type="q"]');
    if (firstQCell) setFocus(firstQCell);
  } else {
    const ansCells = Array.from(document.querySelectorAll('.cell-ans[data-type="ans"]'));
    if (ansCells.length > 0) {
      setFocus(ansCells[ansCells.length - 1]);
    } else {
      const allInputs = Array.from(document.querySelectorAll('.grid-input:not([disabled])'));
      if (allInputs.length > 0) setFocus(allInputs[allInputs.length - 1]);
    }
  }
}

window.submitAnswer = function() {
  const q = gameState.questions[gameState.current];
  let isCorrect = false;
  let userAnsText = "";
  let correctAnsText = "";

  if (gameState.mode === 'div') {
    const qCells = Array.from(document.querySelectorAll('.cell-ans[data-type="q"]'));
    const qStr = qCells.map(c => c.value.trim()).filter(v => v !== '').join('');
    const userQ = qStr === '' ? NaN : parseInt(qStr, 10);
    
    const remCells = Array.from(document.querySelectorAll('.cell-ans[data-type="rem"]'));
    const remStr = remCells.map(c => c.value.trim()).filter(v => v !== '').join('');
    const userRem = remStr === '' ? 0 : parseInt(remStr, 10);

    isCorrect = (!isNaN(userQ) && userQ === q.answer && userRem === q.rem);
    userAnsText = isNaN(userQ) ? '미입력' : `몫 ${userQ}${userRem > 0 ? ' 나머지 ' + userRem : ''}`;
    correctAnsText = `몫 ${q.answer}${q.rem > 0 ? ' 나머지 ' + q.rem : ''}`;
  } else {
    const ansCells = Array.from(document.querySelectorAll('.cell-ans[data-type="ans"]'));
    const ansStr = ansCells.map(c => c.value.trim()).join('');
    if (ansStr === '') return; // 미입력 방어
    const userAns = parseInt(ansStr, 10);
    isCorrect = (userAns === q.answer);
    userAnsText = `${userAns}`;
    correctAnsText = `${q.answer}`;
  }

  const msgBox = document.getElementById('v-feedbackMsg');
  if (isCorrect) {
      // 🎵 딩동댕 연출
      document.querySelectorAll('.cell-ans').forEach(c => {
          c.style.borderColor = 'var(--green)';
          c.style.background = '#e8f5e9';
      });
      msgBox.style.color = 'var(--green)';
      msgBox.textContent = "딩동댕! 정답입니다! 🎵🎉";
      
      // 🎙️ 요정 코코 / 깐죽이 / 깍쟁이 칭찬 음성 재생
      if (typeof fairyPraise === 'function') fairyPraise();

      gameState.correctCount++;
      gameState.current++;

      // 💡 [2문제당 1개 지급 표준화]
      if (typeof rewardQuizCorrect === 'function') {
          rewardQuizCorrect(gameState.current - 1);
      }

      if (typeof triggerQuizAdvance === 'function') {
          triggerQuizAdvance({
              onAdvance: nextQuestion,
              delayMs: 1300,
              subject: '수학',
              container: document.getElementById('vertical-container')
          });
      } else {
          setTimeout(nextQuestion, 1200); // 1.2초 후 자동으로 다음 문제 그려짐
      }
  } else {
      // 💥 땡 연출
      document.querySelectorAll('.cell-ans').forEach(c => {
          if(c.value !== '') {
              c.style.borderColor = 'var(--pink)';
              c.style.background = '#ffebee';
          }
      });
      document.querySelector('.v-board').style.animation = 'shake 0.4s';
      setTimeout(() => document.querySelector('.v-board').style.animation = '', 400);

      msgBox.style.color = 'var(--pink)';
      msgBox.textContent = "땡! 아쉽네요. 💥";

      // 🎙️ 요정 코코 / 깐죽이 / 깍쟁이 격려 음성 재생
      if (typeof fairyEncourage === 'function') fairyEncourage();

      // 🎒 오답 가방(wrongNotes)에 저장 (해당 문제에서 처음 틀렸을 때 1회만)
      if (!q.wrongLogged) {
          let opSymbol = '';
          if(gameState.mode === 'add') opSymbol = '+';
          else if(gameState.mode === 'sub') opSymbol = '-';
          else if(gameState.mode === 'mul') opSymbol = 'x';
          else if(gameState.mode === 'div') opSymbol = '÷';

          const note = {
              text: `${q.numA} ${opSymbol} ${q.numB}`,
              userAns: userAnsText,
              answer: correctAnsText,
              opType: gameState.mode,
              timestamp: new Date().toISOString()
          };
          
          window.wrongNotes.push(note);
          localStorage.setItem(`minmin_math_wrong_${currentProfile}`, JSON.stringify(window.wrongNotes));
          q.wrongLogged = true;
          
          console.log("🎒 오답 가방에 쏙 들어갔어요!", note);
      }

      const resetInputs = () => {
          document.querySelectorAll('.cell-ans').forEach(c => {
              c.style.borderColor = '';
              c.style.background = '';
              c.value = '';
          });
          document.querySelectorAll('.cell-inter').forEach(c => {
              c.value = '';
          });
          msgBox.textContent = '';
          const ansCells = Array.from(document.querySelectorAll('.cell-ans'));
          if (ansCells.length > 0) setFocus(ansCells[ansCells.length - 1]);
      };

      const goNext = () => {
          resetInputs();
          gameState.current++;
          nextQuestion();
      };

      if (typeof promptQuizRetryOrSkip === 'function') {
          promptQuizRetryOrSkip({
              message: '아쉽네요! 정답은 ' + correctAnsText,
              hint: correctAnsText,
              onRetry: resetInputs,
              onSkip: goNext,
              silent: true
          });
      } else {
          msgBox.textContent = "땡! 아쉽네요. 다시 한번 계산해볼까요? 💥";
          setTimeout(resetInputs, 1800);
      }
  }
}

async function showResult() {
  document.getElementById('r-score').textContent = (gameState.correctCount * 10) + '점';
  document.getElementById('r-detail').textContent = `10문제 중 ${gameState.correctCount}개 성공!`;
  showScreen('screen-result');

  // 🎙️ 세로셈 완주 보상 음성 재생
  if (typeof fairyReward === 'function') fairyReward('finish');

  const opNames = { add: '수학(덧셈 세로셈)', sub: '수학(뺄셈 세로셈)', mul: '수학(곱셈 세로셈)', div: '수학(나눗셈 세로셈)' };
  const currentOpName = gameState.mode ? opNames[gameState.mode] : '수학(세로셈)';

  // 🏆 10문제 완주 보너스(+5💎/🍬) 및 노션 학습일지 자동 전송!
  window.currentSubject = "수학";
  const errorReportText = (window.wrongNotes && window.wrongNotes.length > 0)
      ? window.wrongNotes.map(n => `${n.text} (입력:${n.userAns}/정답:${n.answer})`).join(' / ')
      : '오답 없음';

  if (typeof finalizeQuizRewardSession === 'function') {
      await finalizeQuizRewardSession({
          isFullComplete: true,
          subject: currentOpName,
          errorReport: errorReportText
      });
  } else if (gameState.correctCount > 0 && typeof grantRewardAndShowUI === 'function') {
      await grantRewardAndShowUI(5, false, 'voca');
  }
}

// 🖨️ 프린트 출력 전용 모드
window.printWorksheet = function() {
    const printArea = document.getElementById('print-area');
    const opNames = { add: '덧셈', sub: '뺄셈', mul: '곱셈', div: '나눗셈' };
    const currentOpName = gameState.mode ? opNames[gameState.mode] : '세로셈';
    const lvlName = gameState.lvl ? `<span style="font-size: 1.5rem; color: #555;">(${gameState.lvl.label})</span>` : '';

    let html = `<div class="print-title">민민 우주 정거장 🚀 - 오늘의 ${currentOpName} 훈련 ${lvlName}</div>`;
    
    gameState.questions.forEach((q, idx) => {
        html += `<div class="print-item-wrapper">
                    <div class="print-qnum">문제 ${idx + 1}</div>
                    <div class="v-board">${renderDynamicGrid(gameState.mode, q, true)}</div>
                 </div>`;
    });
    
    printArea.innerHTML = html;
    window.print();
};