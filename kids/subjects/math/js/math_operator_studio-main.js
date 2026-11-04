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

function renderAdditionBoard(step) {
  const { board } = step;
  const carriesRow = board.carries.map((c, col) => {
    const active = col === board.activeCarryCol ? 'cell-active' : '';
    return `<td class="${active}" style="color:#ec4899; font-size:0.95rem; font-weight:800; min-height:24px;">${c ? '①' : ''}</td>`;
  }).join('');

  const rowA = board.digitsA.map((d, col) => {
    const active = col === board.activeCol ? 'cell-active' : '';
    return `<td class="${active}" style="color:#38bdf8;">${d}</td>`;
  }).join('');

  const rowB = board.digitsB.map((d, col) => {
    const active = col === board.activeCol ? 'cell-active' : '';
    return `<td class="${active}" style="color:#fbbf24;">${d}</td>`;
  }).join('');

  const resultRow = board.result.map((d, col) => {
    const active = col === board.activeCol ? 'cell-active' : '';
    return `<td class="calc-step-line ${active}" style="color:#10b981; font-weight:800;">${d}</td>`;
  }).join('');

  return `
    <table class="division-table standard-vertical-table">
      <tr class="carry-row">
        <td></td>
        ${carriesRow}
      </tr>
      <tr>
        <td></td>
        ${rowA}
      </tr>
      <tr>
        <td style="color:#f59e0b; font-weight:800;">+</td>
        ${rowB}
      </tr>
      <tr class="result-row">
        <td class="calc-step-line"></td>
        ${resultRow}
      </tr>
    </table>
  `;
}

function renderSubtractionBoard(step) {
  const { board } = step;
  if (step.isNegative) {
    return `<div style="text-align:center; padding:20px; color:#ef4444; font-family:'Jua'; font-size:1.3rem;">큰 수에서 작은 수를 빼야 해요!</div>`;
  }

  const borrowsRow = board.borrows.map((b, col) => {
    const active = col === board.activeBorrowCol ? 'cell-active' : '';
    if (!b) return `<td></td>`;
    return `<td class="${active}" style="color:#ec4899; font-size:0.95rem; font-weight:800;">${b.add10 ? '⑩' : b.val}</td>`;
  }).join('');

  const rowA = board.digitsA.map((d, col) => {
    const b = board.borrows[col];
    const crossed = b && b.crossed ? 'text-decoration:line-through; opacity:0.6;' : '';
    const active = col === board.activeCol ? 'cell-active' : '';
    return `<td class="${active}" style="color:#38bdf8; ${crossed}">${d}</td>`;
  }).join('');

  const rowB = board.digitsB.map((d, col) => {
    const active = col === board.activeCol ? 'cell-active' : '';
    return `<td class="${active}" style="color:#fbbf24;">${d}</td>`;
  }).join('');

  const resultRow = board.result.map((d, col) => {
    const active = col === board.activeCol ? 'cell-active' : '';
    return `<td class="calc-step-line ${active}" style="color:#10b981; font-weight:800;">${d}</td>`;
  }).join('');

  return `
    <table class="division-table standard-vertical-table">
      <tr class="carry-row">
        <td></td>
        ${borrowsRow}
      </tr>
      <tr>
        <td></td>
        ${rowA}
      </tr>
      <tr>
        <td style="color:#f59e0b; font-weight:800;">−</td>
        ${rowB}
      </tr>
      <tr class="result-row">
        <td class="calc-step-line"></td>
        ${resultRow}
      </tr>
    </table>
  `;
}

function renderMultiplicationBoard(step) {
  const { board } = step;
  const carriesRow = board.carries.map((c, col) => {
    const active = col === board.activeCol ? 'cell-active' : '';
    return `<td class="${active}" style="color:#ec4899; font-size:0.95rem; font-weight:800;">${c ? `(${c})` : ''}</td>`;
  }).join('');

  const rowA = board.digitsA.map((d, col) => {
    const active = col === board.activeCol ? 'cell-active' : '';
    return `<td class="${active}" style="color:#38bdf8;">${d}</td>`;
  }).join('');

  const rowB = board.digitsB.map((d, col) => {
    return `<td style="color:#fbbf24;">${d}</td>`;
  }).join('');

  let rowsHtml = '';
  if (!board.isTwoDigit) {
    const resultCells = (board.rows[0]?.cells || Array(board.colCount).fill('')).map((d, col) => {
      const active = col === board.activeCol ? 'cell-active' : '';
      return `<td class="calc-step-line ${active}" style="color:#10b981; font-weight:800;">${d}</td>`;
    }).join('');
    rowsHtml = `
      <tr class="result-row">
        <td class="calc-step-line"></td>
        ${resultCells}
      </tr>
    `;
  } else {
    rowsHtml = board.rows.map((r, rIdx) => {
      const isActive = rIdx === board.activeRow;
      const isSum = r.kind === 'sum';
      const lineClass = isSum || rIdx === 0 ? 'calc-step-line' : '';
      const cells = r.cells.map(d => `<td class="${lineClass} ${isActive ? 'cell-active' : ''}" style="color:${isSum ? '#10b981' : '#f8fafc'}; font-weight:${isSum ? '800' : '700'};">${d}</td>`).join('');
      return `
        <tr>
          <td class="${lineClass}" style="font-size:0.8rem; color:#94a3b8;">${isSum ? '+' : ''}</td>
          ${cells}
        </tr>
      `;
    }).join('');
  }

  return `
    <table class="division-table standard-vertical-table">
      <tr class="carry-row">
        <td></td>
        ${carriesRow}
      </tr>
      <tr>
        <td></td>
        ${rowA}
      </tr>
      <tr>
        <td style="color:#f59e0b; font-weight:800;">×</td>
        ${rowB}
      </tr>
      ${rowsHtml}
    </table>
  `;
}

function renderVerticalTutorView(container) {
  if (!currentPlan || currentPlan.length === 0) {
    startStudioCalculation(false);
  }

  const curPlan = currentPlan[tutorCurrentStep - 1] || currentPlan[0];
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
// 📏 [탭 3] 수직선 뛰어 세기 / 덜어내기 렌더링 (4대 연산 공통)
// ========================================================
function renderNumberLineView(container) {
  const model = buildOpNumberLineModel(currentOp, curNumA, curNumB);
  if (!model) return;

  const titleMap = {
    div: '📏 수직선 동수누감 (점프해서 덜어내기)',
    add: '📏 수직선 이어 세기 (앞으로 뛰어 세기)',
    sub: '📏 수직선 덜어 세기 (뒤로 뛰어 세기)',
    mul: '📏 수직선 동수누가 (일정하게 뛰어 세기)'
  };

  const jumpBadges = model.jumps.map(j => `
    <div style="background:rgba(2,132,199,0.2); border:1.5px solid #0284c7; border-radius:10px; padding:6px 12px; text-align:center;">
      <div style="font-size:0.75rem; color:#94a3b8;">${j.index}단계</div>
      <div style="font-family:'Jua'; color:#38bdf8; font-size:1.1rem;">${j.from} → ${j.to}</div>
      <div style="font-size:0.8rem; color:#f59e0b;">(${j.label})</div>
    </div>
  `).join('');

  container.innerHTML = `
    <div class="numberline-wrap">
      <h3 style="font-family:'Jua'; color:#38bdf8; margin:0 0 10px;">${titleMap[currentOp]}</h3>
      <p style="color:var(--text-muted); font-size:1rem; margin:0 0 20px;">${model.summary}</p>
      <div style="background:rgba(15,23,42,0.6); border:2px solid var(--border-color); border-radius:16px; padding:24px 16px; text-align:center;">
        <div style="display:flex; justify-content:center; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:20px;">
          ${jumpBadges}
          ${model.compressed ? '<div style="color:#94a3b8; font-family:\'Jua\'; align-self:center;">... 중간 생략 ...</div>' : ''}
        </div>
        <div style="display:flex; justify-content:space-around; align-items:center; flex-wrap:wrap; gap:12px;">
          <div style="background:rgba(2,132,199,0.15); border:1.5px solid #0284c7; border-radius:12px; padding:12px 18px;">
            <div style="font-size:0.85rem; color:#94a3b8;">시작 수</div>
            <div style="font-family:'Jua'; font-size:1.8rem; color:#38bdf8;">${model.startVal}</div>
          </div>
          <div style="background:rgba(16,185,129,0.15); border:1.5px solid #10b981; border-radius:12px; padding:12px 18px;">
            <div style="font-size:0.85rem; color:#94a3b8;">도착한 수 (결과)</div>
            <div style="font-family:'Jua'; font-size:1.8rem; color:#10b981;">${model.endVal}</div>
          </div>
        </div>
      </div>
    </div>
  `;

  studioSpeak(model.summary);
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

  const speech = `자리별 부분곱 넓이 모델이에요! 직사각형을 자릿수별로 나누어 부분 넓이들을 더하면 총 넓이 ${prod}가 돼요!`;

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
