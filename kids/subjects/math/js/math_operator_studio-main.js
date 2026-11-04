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

const AREA_BOX_COLORS = [
  { background: 'rgba(2,132,199,0.35)', text: '#38bdf8' },
  { background: 'rgba(16,185,129,0.35)', text: '#10b981' },
  { background: 'rgba(245,158,11,0.3)', text: '#d97706' },
  { background: 'rgba(168,85,247,0.3)', text: '#a855f7' }
];

function renderAreaBox(index, topText, value, bottomText = '') {
  const color = AREA_BOX_COLORS[index % AREA_BOX_COLORS.length];
  return `
    <div class="area-box" style="background:${color.background};">
      <div style="color:var(--text-muted); font-size:0.85rem;">${topText}</div>
      <div style="color:${color.text}; font-size:1.3rem;">${value}</div>
      ${bottomText ? `<div style="color:var(--text-muted); font-size:0.8rem;">${bottomText}</div>` : ''}
    </div>
  `;
}

// 더할 값이 하나뿐이면 "= 7 = 7"처럼 같은 수를 두 번 쓰지 않는다
function areaSumText(values, total, colorText) {
  const result = `<span style="color:${colorText};">${total}</span>`;
  return values.length > 1 ? `${values.join(' + ')} = ${result}` : result;
}

function renderDivisionAreaView(container) {
  const model = StudioPlans.buildAreaModel('div', curNumA, curNumB);
  const { divisor, quotient, remainder, parts } = model;

  const remainderText = remainder > 0
    ? `남는 넓이는 ${remainder}${numberJosa(remainder, '이에요', '예요')}!`
    : '남는 넓이 없이 딱 맞아요!';
  const speech = `면적 모델이에요! 가로가 ${divisor}인 직사각형의 전체 넓이가 ${curNumA}일 때, 세로 길이는 몫인 ${quotient}${numberJosa(quotient, '이', '가')} 돼요. ${remainderText}`;

  const boxesHtml = parts
    .map((part, i) => renderAreaBox(i, `세로 ${part.height}`, `넓이 ${part.area}`, `(${divisor} × ${part.height})`))
    .join('');

  container.innerHTML = `
    <div class="area-model-wrap">
      <div style="text-align:center; max-width:600px;">
        <h3 style="font-family:'Jua'; color:#38bdf8; margin:0 0 6px;">🍫 면적 분할 모델 (나눗셈)</h3>
        <p style="color:var(--text-muted); font-size:0.95rem; margin:0;">
          가로 길이가 <strong>${divisor}</strong>일 때, 넓이 <strong>${curNumA}</strong>${numberJosa(curNumA, '을', '를')} 채우는 세로 길이를 찾아요!
        </p>
      </div>

      <div class="area-rect-container">
        ${boxesHtml}
        ${remainder > 0 ? `
        <div class="area-box" style="background:rgba(239,68,68,0.2);">
          <div style="color:var(--text-muted); font-size:0.85rem;">남은 넓이</div>
          <div style="color:#ef4444; font-size:1.3rem;">${remainder}</div>
          <div style="color:var(--text-muted); font-size:0.8rem;">(나머지)</div>
        </div>
        ` : ''}
      </div>

      <div class="area-total">
        전체 세로 길이(몫) = ${areaSumText(parts.map(part => part.height), quotient, '#38bdf8')}
        ${remainder > 0 ? ` (나머지: <span style="color:#ef4444;">${remainder}</span>)` : ''}
      </div>
    </div>
  `;
  studioSpeak(speech);
}

function renderMultiplicationAreaView(container) {
  const model = StudioPlans.buildAreaModel('mul', curNumA, curNumB);
  const { cells, columns, total } = model;
  const speech = `자리별 부분곱 넓이 모델이에요! 직사각형을 자리별로 나누어 부분 넓이들을 더하면 총 넓이는 ${total}${numberJosa(total, '이에요', '예요')}!`;

  const boxesHtml = cells
    .map((cell, i) => renderAreaBox(i, `${cell.width} × ${cell.height}`, cell.area))
    .join('');

  container.innerHTML = `
    <div class="area-model-wrap">
      <div style="text-align:center; max-width:600px;">
        <h3 style="font-family:'Jua'; color:#38bdf8; margin:0 0 6px;">🍫 자리별 부분곱 넓이 모델 (곱셈)</h3>
        <p style="color:var(--text-muted); font-size:0.95rem; margin:0;">
          가로 <strong>${curNumA}</strong>${numberJosa(curNumA, '과', '와')} 세로 <strong>${curNumB}</strong>${numberJosa(curNumB, '을', '를')} 자리별로 나누어 넓이를 구해요!
        </p>
      </div>

      <div class="area-rect-container area-rect-grid" style="grid-template-columns:repeat(${columns}, minmax(0, 1fr));">
        ${boxesHtml}
      </div>

      <div class="area-total">
        전체 넓이(곱) = ${areaSumText(cells.map(cell => cell.area), total, '#10b981')}
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
