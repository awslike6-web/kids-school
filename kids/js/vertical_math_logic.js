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
  document.getElementById('userName').textContent = `${name} 탐험대원`;
  document.getElementById('userIcon').textContent = icon;
});

// 🚪 학습 종료(exitRoom) 배선 및 학습 일지 전송
window.exitRoom = async function() {
  if (isExiting) return;
  isExiting = true;

  const opNames = { add: '수학(덧셈 세로셈)', sub: '수학(뺄셈 세로셈)', mul: '수학(곱셈 세로셈)', div: '수학(나눗셈 세로셈)' };
  const currentOpName = gameState.mode ? opNames[gameState.mode] : '수학(세로셈 메인)';

  if (typeof sendStudyLogToNotion === 'function') {
      await sendStudyLogToNotion({ subject: currentOpName });
  }
  
  location.href = 'math.html';
};

// 🚨 돌발 이탈 방지 (블랙박스 기록)
window.addEventListener('pagehide', () => {
    if (!isExiting && typeof sendStudyLogToNotion === 'function') {
        const opNames = { add: '덧셈', sub: '뺄셈', mul: '곱셈', div: '나눗셈' };
        const modeName = gameState.mode ? opNames[gameState.mode] : '기초';
        sendStudyLogToNotion({ subject: `수학(세로셈_${modeName}_중도이탈)` });
    }
});

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

// 가상 키패드 로직 (자동 이동 기능 추가)
window.pressNum = function(num) {
  if (!focusedInput) return;
  focusedInput.value = num; // 동적 그리드는 셀당 1글자만!
  
  // 왼쪽 칸으로 자동 이동 (세로셈은 오른쪽에서 왼쪽으로 푸는 게 자연스러우므로)
  const row = parseInt(focusedInput.dataset.row);
  const col = parseInt(focusedInput.dataset.col);
  const nextInput = document.querySelector(`.grid-input[data-row="${row}"][data-col="${col - 1}"]`);
  if (nextInput) setFocus(nextInput);
}

window.pressBackspace = function() {
  if (!focusedInput) return;
  focusedInput.value = '';
  
  // 지울 때는 오른쪽 칸으로 역이동
  const row = parseInt(focusedInput.dataset.row);
  const col = parseInt(focusedInput.dataset.col);
  const prevInput = document.querySelector(`.grid-input[data-row="${row}"][data-col="${col + 1}"]`);
  if (prevInput) setFocus(prevInput);
}

window.pressClear = function() {
  if (!focusedInput) return;
  focusedInput.value = '';
}

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
  
  const titles = { add: '➕ 덧셈 기지', sub: '➖ 뺄셈 기지', mul: '✖️ 곱셈 기지', div: '➗ 나눗셈 기지' };
  document.getElementById('game-title').innerHTML = `${titles[mode]} <span style="font-size:1rem;color:#ccc;font-weight:normal;">(${lvl.label})</span>`;
  
  showScreen('screen-game');
  nextQuestion();
}

// 🚀 핵심: 세로셈 동적 그리드 생성 함수 (isPrint 매개변수 추가)
function renderDynamicGrid(mode, q, isPrint = false) {
  const aStr = String(q.numA);
  const bStr = String(q.numB);
  let W = 0;
  let gridHTML = '';

  const commonInp = isPrint ? 'disabled' : `inputmode="none" readonly onclick="setFocus(this)"`;

  if (mode === 'add' || mode === 'sub') {
      W = Math.max(aStr.length, bStr.length) + 2; // 연산자 기호 칸 1개 + 올림수 여유 칸 1개
      gridHTML += `<div class="math-grid" style="grid-template-columns: repeat(${W}, 45px);">`;
      
      // 1행: 올림/내림수 메모 (cell-carry)
      for(let c=1; c<=W; c++) {
          gridHTML += `<input type="text" class="grid-input cell-carry" data-row="1" data-col="${c}" style="grid-area: 1 / ${c};" ${commonInp}>`;
      }
      
      // 2행: 피연산자 A (오른쪽 정렬)
      for(let i=0; i<aStr.length; i++) {
          let c = W - aStr.length + 1 + i;
          gridHTML += `<div class="grid-cell" style="grid-area: 2 / ${c};">${aStr[i]}</div>`;
      }
      
      // 3행: 연산자 기호 & 피연산자 B (오른쪽 정렬)
      const opSym = mode === 'add' ? '＋' : '－';
      let opCol = W - Math.max(aStr.length, bStr.length);
      gridHTML += `<div class="grid-cell cell-op" style="grid-area: 3 / ${opCol};">${opSym}</div>`;
      
      for(let i=0; i<bStr.length; i++) {
          let c = W - bStr.length + 1 + i;
          gridHTML += `<div class="grid-cell" style="grid-area: 3 / ${c};">${bStr[i]}</div>`;
      }
      
      // 4행: 밑줄
      gridHTML += `<div class="grid-line" style="grid-area: 4 / 1 / 4 / ${W + 1};"></div>`;
      
      // 5행: 최종 정답 (cell-ans)
      for(let c=1; c<=W; c++) {
          gridHTML += `<input type="text" class="grid-input cell-ans" data-type="ans" data-row="5" data-col="${c}" style="grid-area: 5 / ${c};" ${commonInp}>`;
      }
      gridHTML += `</div>`;
  }
  else if (mode === 'mul') {
      W = aStr.length + bStr.length + 1; // 곱셈 결과 최대 길이 + 1
      gridHTML += `<div class="math-grid" style="grid-template-columns: repeat(${W}, 45px);">`;
      
      // 1행: 올림수
      for(let c=1; c<=W; c++) {
          gridHTML += `<input type="text" class="grid-input cell-carry" data-row="1" data-col="${c}" style="grid-area: 1 / ${c};" ${commonInp}>`;
      }
      
      // 2행: 피연산자 A
      for(let i=0; i<aStr.length; i++) {
          let c = W - aStr.length + 1 + i;
          gridHTML += `<div class="grid-cell" style="grid-area: 2 / ${c};">${aStr[i]}</div>`;
      }
      
      // 3행: 연산자 & 피연산자 B
      let opCol = W - Math.max(aStr.length, bStr.length);
      gridHTML += `<div class="grid-cell cell-op" style="grid-area: 3 / ${opCol};">×</div>`;
      for(let i=0; i<bStr.length; i++) {
          let c = W - bStr.length + 1 + i;
          gridHTML += `<div class="grid-cell" style="grid-area: 3 / ${c};">${bStr[i]}</div>`;
      }
      
      // 4행: 첫 번째 밑줄
      gridHTML += `<div class="grid-line" style="grid-area: 4 / 2 / 4 / ${W + 1};"></div>`;
      
      let row = 5;
      // B가 2자리 이상일 때 중간 풀이과정 행 생성
      if (bStr.length > 1) {
          // 오른쪽 자릿수부터 한 줄씩 생성
          for(let j=bStr.length-1; j>=0; j--) {
              let shift = (bStr.length - 1) - j; // 왼쪽으로 이동할 칸 수
              for(let k=0; k<=aStr.length+1; k++) {
                  let c = W - shift - k;
                  if(c > 0) {
                      gridHTML += `<input type="text" class="grid-input cell-inter" data-row="${row}" data-col="${c}" style="grid-area: ${row} / ${c};" ${commonInp}>`;
                  }
              }
              row++;
          }
          // 덧셈 전 두 번째 밑줄
          gridHTML += `<div class="grid-line" style="grid-area: ${row} / 1 / ${row} / ${W + 1};"></div>`;
          row++;
      }
      
      // 마지막 행: 최종 정답
      for(let c=1; c<=W; c++) {
          gridHTML += `<input type="text" class="grid-input cell-ans" data-type="ans" data-row="${row}" data-col="${c}" style="grid-area: ${row} / ${c};" ${commonInp}>`;
      }
      gridHTML += `</div>`;
  }
  else if (mode === 'div') {
      W = aStr.length + bStr.length + 2; 
      gridHTML += `<div class="math-grid" style="grid-template-columns: repeat(${W}, 45px);">`;
      
      let row = 1;
      // 1행: 몫 (Quotient)
      for (let i = 0; i < aStr.length; i++) {
          let c = bStr.length + 2 + i;
          gridHTML += `<input type="text" class="grid-input cell-ans" data-type="q" data-row="${row}" data-col="${c}" style="grid-area: ${row} / ${c};" ${commonInp}>`;
      }
      row++;
      
      // 2행: 지붕 모양 가로선
      gridHTML += `<div class="grid-line" style="grid-area: ${row} / ${bStr.length + 2} / ${row} / ${W + 1};"></div>`;
      row++;
      
      // 3행: 제수 ) 피제수
      for (let i = 0; i < bStr.length; i++) {
          gridHTML += `<div class="grid-cell" style="grid-area: ${row} / ${1 + i};">${bStr[i]}</div>`;
      }
      gridHTML += `<div class="grid-cell cell-op" style="grid-area: ${row} / ${bStr.length + 1};">)</div>`;
      for (let i = 0; i < aStr.length; i++) {
          let c = bStr.length + 2 + i;
          gridHTML += `<div class="grid-cell" style="grid-area: ${row} / ${c};">${aStr[i]}</div>`;
      }
      row++;
      
      // 4행: 곱셈 결과 빼기 (Intermediate)
      for (let i = 0; i < aStr.length; i++) {
          let c = bStr.length + 2 + i;
          gridHTML += `<input type="text" class="grid-input cell-inter" data-row="${row}" data-col="${c}" style="grid-area: ${row} / ${c};" ${commonInp}>`;
      }
      row++;
      
      // 5행: 밑줄
      gridHTML += `<div class="grid-line" style="grid-area: ${row} / ${bStr.length + 2} / ${row} / ${W + 1};"></div>`;
      row++;
      
      // 6행: 나머지 (Remainder)
      for (let i = 0; i < aStr.length; i++) {
          let c = bStr.length + 2 + i;
          gridHTML += `<input type="text" class="grid-input cell-ans" data-type="rem" data-row="${row}" data-col="${c}" style="grid-area: ${row} / ${c};" ${commonInp}>`;
      }
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

  // 포커스 자동 지정 로직: 입력해야 할 칸 중 가장 오른쪽 칸을 찾아서 포커스
  const ansCells = Array.from(document.querySelectorAll('.cell-ans, .cell-inter'));
  if (ansCells.length > 0) {
      setFocus(ansCells[ansCells.length - 1]);
  }
}

window.submitAnswer = function() {
  const q = gameState.questions[gameState.current];
  let isCorrect = false;
  let userAnsText = "";
  let correctAnsText = "";

  if (gameState.mode === 'div') {
      const qCells = Array.from(document.querySelectorAll('.cell-ans[data-type="q"]'));
      const qStr = qCells.map(c => c.value || '0').join('');
      const userQ = parseInt(qStr, 10);
      
      const remCells = Array.from(document.querySelectorAll('.cell-ans[data-type="rem"]'));
      const remStr = remCells.map(c => c.value || '0').join('');
      const userRem = parseInt(remStr, 10);

      isCorrect = (userQ === q.answer && userRem === q.rem);
      userAnsText = `몫 ${userQ} 나머지 ${userRem}`;
      correctAnsText = `몫 ${q.answer} 나머지 ${q.rem}`;
  } else {
      const ansCells = Array.from(document.querySelectorAll('.cell-ans[data-type="ans"]'));
      const ansStr = ansCells.map(c => c.value || '').join('');
      if (ansStr === '') return; // 아무것도 입력 안했을 때
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
      
      gameState.correctCount++;
      gameState.current++;
      setTimeout(nextQuestion, 1200); // 1.2초 후 자동으로 다음 문제 그려짐
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
      msgBox.textContent = "땡! 아쉽네요. 다시 한번 계산해볼까요? 💥";

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
          q.wrongLogged = true; // 중복 저장 방지 자물쇠
          
          console.log("🎒 오답 가방에 쏙 들어갔어요!", note);
      }

      // 틀린 문제 재도전 기회 (입력 칸 초기화)
      setTimeout(() => {
          document.querySelectorAll('.cell-ans').forEach(c => {
              c.style.borderColor = '';
              c.style.background = '';
              c.value = ''; // 재도전시 정답칸 초기화
          });
          msgBox.textContent = '';
          
          // 다시 포커스
          const ansCells = Array.from(document.querySelectorAll('.cell-ans'));
          if (ansCells.length > 0) setFocus(ansCells[ansCells.length - 1]);
      }, 1800);
  }
}

async function showResult() {
  document.getElementById('r-score').textContent = (gameState.correctCount * 10) + '점';
  document.getElementById('r-detail').textContent = `10문제 중 ${gameState.correctCount}개 성공!`;
  showScreen('screen-result');

  // 노션 보상 연동: 1타 2피 쌍끌이 모드 & MAX 자동 제한 캡 탑재
  if (gameState.correctCount > 0 && typeof grantRewardAndShowUI === 'function') {
      window.currentSubject = "수학";
      // 'voca' 커스텀 타입을 던져서 [오늘 획득_수학]과 [용어 경험치_수학]을 실시간 동시 누적!
      await grantRewardAndShowUI(gameState.correctCount, false, 'voca');
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