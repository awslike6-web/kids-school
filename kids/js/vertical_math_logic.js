// 김s 우주 정거장 세로셈 동적 훈련소 로직 (vertical_math_logic.js)

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

