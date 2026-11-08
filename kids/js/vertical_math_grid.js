// kids/js/vertical_math_grid.js - vertical_math_logic.js 분리 2/2: 나눗셈 시뮬레이터·격자 그리기·채점·결과·인쇄 (vertical_math_logic.js 다음에 로드)
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

    let html = `<div class="print-title">김s 우주 정거장 🚀 - 오늘의 ${currentOpName} 훈련 ${lvlName}</div>`;
    
    gameState.questions.forEach((q, idx) => {
        html += `<div class="print-item-wrapper">
                    <div class="print-qnum">문제 ${idx + 1}</div>
                    <div class="v-board">${renderDynamicGrid(gameState.mode, q, true)}</div>
                 </div>`;
    });
    
    printArea.innerHTML = html;
    window.print();
};