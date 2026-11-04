// ========================================================
// 📝 [탭 2] 단계별 격자 세로셈 튜터 렌더링 (4대 연산 지원)
// 화면은 curPlan.board만 그리므로 풀이와 화면이 일치한다.
// ========================================================

const DIVISION_ROW_COLORS = { product: '#ec4899', remainder: 'inherit' };

function renderDivisionRowCells(row, columnCount, isActive, isFinal) {
  const startCol = row.endCol - row.value.length + 1;
  let html = '';
  for (let col = 0; col < columnCount; col++) {
    const hasDigit = col >= startCol && col <= row.endCol;
    const digit = hasDigit ? row.value[col - startCol] : '';
    const classes = [];
    if (row.kind === 'product' && col >= row.lineFromCol && col <= row.endCol) classes.push('calc-step-line');
    if (isActive && hasDigit) classes.push('cell-active');

    let color = DIVISION_ROW_COLORS[row.kind];
    if (col === row.broughtCol) color = '#10b981';
    if (isFinal && row.kind === 'remainder') color = '#ef4444';

    html += `<td class="${classes.join(' ')}" style="color:${color};">${digit}</td>`;
  }
  return html;
}

function renderDivisionBoard(step, dividend, divisor) {
  const { board } = step;
  const digits = String(dividend).split('');
  const isFinalStep = step.step === currentPlan.length;

  const quotientCells = board.quotient.map((digit, col) => {
    const active = col === board.activeQuotientCol ? 'cell-active' : '';
    return `<td class="td-quotient-line ${active}">${digit}</td>`;
  }).join('');

  const dividendCells = digits.map((digit, col) => {
    const active = board.activeDividendCols.includes(col) ? 'cell-active' : '';
    return `<td class="${active}" style="color:#38bdf8;">${digit}</td>`;
  }).join('');

  const workRows = board.rows.map((row, index) => {
    const isActive = index === board.activeRow;
    const isFinalRow = isFinalStep && index === board.rows.length - 1;
    return `
      <tr>
        <td></td>
        <td>${row.kind === 'product' ? '-' : ''}</td>
        ${renderDivisionRowCells(row, digits.length, isActive, isFinalRow)}
      </tr>
    `;
  }).join('');

  return `
    <table class="division-table">
      <tr>
        <td></td>
        <td class="td-divisor-arc"></td>
        ${quotientCells}
      </tr>
      <tr>
        <td style="color:#f59e0b;">${divisor}</td>
        <td class="td-divisor-arc">)</td>
        ${dividendCells}
      </tr>
      ${workRows}
    </table>
  `;
}

// 세로 덧셈·뺄셈·곱셈 공통 줄: 가로줄은 계산 결과 바로 위(아래 수의 밑)에 긋는다
function renderOperandRows(board, sign, markBottomActive = true) {
  const activeClass = col => (col === board.activeCol ? 'cell-active' : '');
  const rowA = board.digitsA.map((digit, col) => {
    const crossed = board.borrows?.[col]?.crossed ? 'text-decoration:line-through; opacity:0.6;' : '';
    return `<td class="${activeClass(col)}" style="color:#38bdf8; ${crossed}">${digit}</td>`;
  }).join('');
  const rowB = board.digitsB.map((digit, col) => {
    const active = markBottomActive ? activeClass(col) : '';
    return `<td class="calc-step-line ${active}" style="color:#d97706;">${digit}</td>`;
  }).join('');
  return `
    <tr><td></td>${rowA}</tr>
    <tr><td class="calc-step-line" style="color:#f59e0b; font-weight:800;">${sign}</td>${rowB}</tr>
  `;
}

function renderResultRow(board) {
  const cells = board.result.map((digit, col) => {
    const active = col === board.activeCol ? 'cell-active' : '';
    return `<td class="${active}" style="color:#10b981; font-weight:800;">${digit}</td>`;
  }).join('');
  return `<tr class="result-row"><td></td>${cells}</tr>`;
}

function renderAdditionBoard(step) {
  const { board } = step;
  const carriesRow = board.carries.map((carry, col) => {
    const active = col === board.activeCarryCol ? 'cell-active' : '';
    return `<td class="${active}" style="color:#ec4899; font-weight:800;">${carry}</td>`;
  }).join('');

  return `
    <table class="division-table standard-vertical-table">
      <tr class="carry-row"><td></td>${carriesRow}</tr>
      ${renderOperandRows(board, '+')}
      ${renderResultRow(board)}
    </table>
  `;
}

// 윗줄에는 실제로 빼는 값을 적는다. 142 − 68의 십의 자리는 받아내린 뒤 13이다.
function renderSubtractionBoard(step) {
  const { board } = step;
  const borrowsRow = board.borrows.map((mark, col) => {
    if (!mark) return '<td></td>';
    const active = col === board.activeBorrowCol ? 'cell-active' : '';
    return `<td class="${active}" style="color:#ec4899; font-weight:800;">${mark.val}</td>`;
  }).join('');

  return `
    <table class="division-table standard-vertical-table">
      <tr class="carry-row"><td></td>${borrowsRow}</tr>
      ${renderOperandRows(board, '−')}
      ${renderResultRow(board)}
    </table>
  `;
}

function renderMultiplicationBoard(step) {
  const { board } = step;
  const carriesRow = board.carries.map((carry, col) => {
    const active = carry && col === board.activeCol ? 'cell-active' : '';
    return `<td class="${active}" style="color:#ec4899; font-weight:800;">${carry}</td>`;
  }).join('');

  const rowsHtml = board.rows.map((row, index) => {
    const isActive = index === board.activeRow;
    const isPart2 = row.kind === 'part2';
    const isAnswer = row.kind === 'sum' || row.kind === 'result';
    const cells = row.cells.map((digit, col) => {
      const classes = [];
      if (isPart2) classes.push('calc-step-line');
      if (isActive && (row.kind !== 'result' || col === board.activeCol)) classes.push('cell-active');
      return `<td class="${classes.join(' ')}" style="color:${isAnswer ? '#10b981' : 'inherit'}; font-weight:${isAnswer ? '800' : '700'};">${digit}</td>`;
    }).join('');
    return `
      <tr>
        <td class="${isPart2 ? 'calc-step-line' : ''}" style="color:#f59e0b; font-weight:800;">${isPart2 ? '+' : ''}</td>
        ${cells}
      </tr>
    `;
  }).join('');

  return `
    <table class="division-table standard-vertical-table">
      <tr class="carry-row"><td></td>${carriesRow}</tr>
      ${renderOperandRows(board, '×', false)}
      ${rowsHtml}
    </table>
  `;
}

function renderVerticalTutorView(container) {
  if (!currentPlan || currentPlan.length === 0) {
    startStudioCalculation(false);
  }

  const curPlan = currentPlan[tutorCurrentStep - 1] || currentPlan[0];
  if (curPlan.isNegative) {
    renderSubtractionGuide(container);
    return;
  }

  let boardMarkup = '';
  if (currentOp === 'div') {
    boardMarkup = renderDivisionBoard(curPlan, curNumA, curNumB);
  } else if (currentOp === 'add') {
    boardMarkup = renderAdditionBoard(curPlan);
  } else if (currentOp === 'sub') {
    boardMarkup = renderSubtractionBoard(curPlan);
  } else if (currentOp === 'mul') {
    boardMarkup = renderMultiplicationBoard(curPlan);
  }

  container.innerHTML = `
    <div class="vertical-tutor-container">
      <div class="division-board-card">
        ${boardMarkup}
      </div>

      <div class="tutor-guide-panel">
        <div class="tutor-step-card">
          <div class="tutor-step-title">${curPlan.title}</div>
          <div class="tutor-step-desc">${curPlan.desc}</div>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
          <span style="font-family:'Jua'; color:#94a3b8;">진행: ${tutorCurrentStep} / ${currentPlan.length}단계</span>
          <div class="nav-btn-group">
            <button class="step-control-btn" onclick="changeTutorStep(-1)" ${tutorCurrentStep === 1 ? 'disabled' : ''}>◀ 이전</button>
            <button class="step-control-btn" onclick="changeTutorStep(1)" ${tutorCurrentStep === currentPlan.length ? 'disabled' : ''} style="background:#0284c7; color:#fff; border-color:#38bdf8;">다음 단계 ▶</button>
          </div>
        </div>
      </div>
    </div>
  `;

  studioSpeak(curPlan.speech);
}

function changeTutorStep(delta) {
  hasUserStarted = true;
  tutorCurrentStep = Math.max(1, Math.min(currentPlan.length, tutorCurrentStep + delta));
  renderVerticalTutorView(document.getElementById('studioViewport'));
}

// ========================================================
// 🍫 [탭 4] 면적(넓이) 모델 렌더링 (모바일 375px 무넘침 설계)
// ========================================================
function renderAreaModelView(container) {
  if (currentOp === 'mul') {
    renderMultiplicationAreaView(container);
  } else {
    renderDivisionAreaView(container);
  }
}

function renderDivisionAreaView(container) {
  const dividend = curNumA;
  const divisor = curNumB;
  const quotient = Math.floor(dividend / divisor);
  const remainder = dividend % divisor;
  const tensQ = Math.floor(quotient / 10) * 10;
  const onesQ = quotient % 10;

  const speech = `면적 모델이에요! 가로가 ${divisor}인 직사각형의 전체 넓이가 ${dividend}일 때, 세로 길이는 몫인 ${quotient}이 되고 남는 넓이는 ${remainder}가 돼요!`;

  container.innerHTML = `
    <div class="area-model-wrap">
      <div style="text-align:center; max-width:600px;">
        <h3 style="font-family:'Jua'; color:#38bdf8; margin:0 0 6px;">🍫 면적 분할 모델 (나눗셈)</h3>
        <p style="color:var(--text-muted); font-size:0.95rem; margin:0;">
          가로 길이가 <strong>${divisor}</strong>일 때, 넓이 <strong>${dividend}</strong>를 채우는 세로 길이를 찾아요!
        </p>
      </div>

      <div class="area-rect-container">
        ${tensQ > 0 ? `
        <div class="area-box" style="background:linear-gradient(135deg, rgba(2,132,199,0.35) 0%, rgba(3,105,161,0.35) 100%);">
          <div style="color:#94a3b8; font-size:0.85rem;">세로 ${tensQ}</div>
          <div style="color:#38bdf8; font-size:1.4rem;">넓이 ${tensQ * divisor}</div>
          <div style="color:#94a3b8; font-size:0.8rem;">(${divisor} × ${tensQ})</div>
        </div>
        ` : ''}

        <div class="area-box" style="background:linear-gradient(135deg, rgba(16,185,129,0.35) 0%, rgba(5,150,105,0.35) 100%);">
          <div style="color:#94a3b8; font-size:0.85rem;">세로 ${onesQ}</div>
          <div style="color:#4ade80; font-size:1.4rem;">넓이 ${onesQ * divisor}</div>
          <div style="color:#94a3b8; font-size:0.8rem;">(${divisor} × ${onesQ})</div>
        </div>

        ${remainder > 0 ? `
        <div class="area-box" style="background:linear-gradient(135deg, rgba(239,68,68,0.25) 0%, rgba(185,28,28,0.25) 100%);">
          <div style="color:#94a3b8; font-size:0.85rem;">남은 넓이</div>
          <div style="color:#ef4444; font-size:1.4rem;">${remainder}</div>
          <div style="color:#94a3b8; font-size:0.8rem;">(나머지)</div>
        </div>
        ` : ''}
      </div>

      <div style="font-family:'Jua'; font-size:1.25rem; color:#f8fafc; text-align:center;">
        전체 세로 길이(몫) = ${tensQ > 0 ? tensQ + ' + ' : ''}${onesQ} = <span style="color:#38bdf8;">${quotient}</span>
        ${remainder > 0 ? ` (나머지: <span style="color:#ef4444;">${remainder}</span>)` : ''}
      </div>
    </div>
  `;
  studioSpeak(speech);
}

function renderMultiplicationAreaView(container) {
  const tensA = Math.floor(curNumA / 10) * 10;
  const onesA = curNumA % 10;
  const isTwoDigitB = curNumB >= 10;
  const tensB = Math.floor(curNumB / 10) * 10;
  const onesB = curNumB % 10;
  const prod = curNumA * curNumB;

  let boxesHtml = '';
  if (!isTwoDigitB) {
    boxesHtml = `
      ${tensA > 0 ? `
      <div class="area-box" style="background:linear-gradient(135deg, rgba(2,132,199,0.35), rgba(3,105,161,0.35));">
        <div style="color:#94a3b8; font-size:0.85rem;">가로 ${tensA} × 세로 ${curNumB}</div>
        <div style="color:#38bdf8; font-size:1.4rem;">넓이 ${tensA * curNumB}</div>
      </div>
      ` : ''}
      <div class="area-box" style="background:linear-gradient(135deg, rgba(16,185,129,0.35), rgba(5,150,105,0.35));">
        <div style="color:#94a3b8; font-size:0.85rem;">가로 ${onesA} × 세로 ${curNumB}</div>
        <div style="color:#4ade80; font-size:1.4rem;">넓이 ${onesA * curNumB}</div>
      </div>
    `;
  } else {
    boxesHtml = `
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; width:100%; max-width:440px;">
        ${tensA > 0 ? `
        <div class="area-box" style="background:linear-gradient(135deg, rgba(2,132,199,0.35), rgba(3,105,161,0.35));">
          <div style="color:#94a3b8; font-size:0.8rem;">${tensA} × ${tensB}</div>
          <div style="color:#38bdf8; font-size:1.2rem;">${tensA * tensB}</div>
        </div>
        ` : ''}
        <div class="area-box" style="background:linear-gradient(135deg, rgba(245,158,11,0.35), rgba(217,119,6,0.35));">
          <div style="color:#94a3b8; font-size:0.8rem;">${onesA} × ${tensB}</div>
          <div style="color:#fbbf24; font-size:1.2rem;">${onesA * tensB}</div>
        </div>
        ${tensA > 0 ? `
        <div class="area-box" style="background:linear-gradient(135deg, rgba(168,85,247,0.35), rgba(126,34,206,0.35));">
          <div style="color:#94a3b8; font-size:0.8rem;">${tensA} × ${onesB}</div>
          <div style="color:#c084fc; font-size:1.2rem;">${tensA * onesB}</div>
        </div>
        ` : ''}
        <div class="area-box" style="background:linear-gradient(135deg, rgba(16,185,129,0.35), rgba(5,150,105,0.35));">
          <div style="color:#94a3b8; font-size:0.8rem;">${onesA} × ${onesB}</div>
          <div style="color:#4ade80; font-size:1.2rem;">${onesA * onesB}</div>
        </div>
      </div>
    `;
  }

  const speech = `자리별 부분곱 넓이 모델이에요! 직사각형을 자릿수별로 나누어 부분 넓이들을 더하면 총 넓이는 ${prod}${numberJosa(prod, '이에요', '예요')}!`;

  container.innerHTML = `
    <div class="area-model-wrap">
      <div style="text-align:center; max-width:600px;">
        <h3 style="font-family:'Jua'; color:#38bdf8; margin:0 0 6px;">🍫 자리별 부분곱 넓이 모델 (곱셈)</h3>
        <p style="color:var(--text-muted); font-size:0.95rem; margin:0;">
          가로 <strong>${curNumA}</strong>와 세로 <strong>${curNumB}</strong>를 자릿수별로 나누어 넓이를 구해요!
        </p>
      </div>

      <div class="area-rect-container">
        ${boxesHtml}
      </div>

      <div style="font-family:'Jua'; font-size:1.25rem; color:#f8fafc; text-align:center;">
        전체 직사각형 넓이(곱) = <span style="color:#10b981;">${prod}</span>
      </div>
    </div>
  `;
  studioSpeak(speech);
}

// 테마 초기화
function applyTheme() {
  document.body.className = (currentProfile === 'son') ? 'theme--arcade' : 'theme--slime';
  const tag = document.getElementById('userProfileTag');
  if (tag) {
    tag.textContent = (currentProfile === 'son') ? '🚀 [민수] 5학년 모드' : '🎠 [민서] 1학년 모드';
    tag.style.borderColor = (currentProfile === 'son') ? '#0284c7' : '#ec4899';
    tag.style.color = (currentProfile === 'son') ? '#38bdf8' : '#ec4899';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  applyTheme();
  renderPresetRow(currentOp);
  updateViewTabsUi(currentOp);
  startStudioCalculation(false);
});
