// ========================================================
// 📝 [탭 2] 단계별 격자 세로셈 튜터 렌더링
// ========================================================
const DIVISION_ROW_COLORS = { product: '#ec4899', remainder: 'inherit' };

// 풀이 줄 하나를 자리 칸에 오른쪽 정렬로 그린다
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
  const isFinalStep = step.step === divisionPlan.length;

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

function renderVerticalTutorView(container) {
  if (!divisionPlan || divisionPlan.length === 0) {
    buildDivisionPlan(curNumA, curNumB);
  }

  const curPlan = divisionPlan[tutorCurrentStep - 1] || divisionPlan[0];

  container.innerHTML = `
    <div class="vertical-tutor-container">
      <div class="division-board-card">
        ${renderDivisionBoard(curPlan, curNumA, curNumB)}
      </div>

      <div class="tutor-guide-panel">
        <div class="tutor-step-card">
          <div class="tutor-step-title">${curPlan.title}</div>
          <div class="tutor-step-desc">${curPlan.desc}</div>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
          <span style="font-family:'Jua'; color:#94a3b8;">진행: ${tutorCurrentStep} / ${divisionPlan.length}단계</span>
          <div class="nav-btn-group">
            <button class="step-control-btn" onclick="changeTutorStep(-1)" ${tutorCurrentStep === 1 ? 'disabled' : ''}>◀ 이전</button>
            <button class="step-control-btn" onclick="changeTutorStep(1)" ${tutorCurrentStep === divisionPlan.length ? 'disabled' : ''} style="background:#0284c7; color:#fff; border-color:#38bdf8;">다음 단계 ▶</button>
          </div>
        </div>
      </div>
    </div>
  `;

  studioSpeak(curPlan.speech);
}
function changeTutorStep(delta) {
  hasUserStarted = true;
  tutorCurrentStep = Math.max(1, Math.min(divisionPlan.length, tutorCurrentStep + delta));
  renderVerticalTutorView(document.getElementById('studioViewport'));
}

// ========================================================
// 📏 [탭 3] 수직선 덜어내기 렌더링
// ========================================================
function numberLineSpeech(model, step) {
  const { dividend, divisor, quotient, remainder, jumps } = model;
  const divisorEul = `${divisor}${numberJosa(divisor, '을', '를')}`;
  const resultText = divisionResultText(quotient, remainder);

  if (jumps.length === 0) {
    return `${dividend}에서는 ${divisorEul} 한 번도 뺄 수 없어요. ${resultText}`;
  }
  if (step === 0) {
    return `수직선에서 ${dividend}부터 ${divisor}씩 뒤로 뛰어 볼까요? 다음 점프 버튼을 눌러 보세요!`;
  }

  const jump = jumps[step - 1];
  const previous = jumps[step - 2];
  const skippedText = previous && jump.index > previous.index + 1
    ? `중간의 ${jump.index - previous.index - 1}번은 건너뛰고, `
    : '';
  const jumpText = `${skippedText}${jump.from}에서 ${divisorEul} 빼면 ${jump.to}! ${jump.index}번 뛰었어요.`;
  return step === jumps.length ? `${jumpText} 더는 뛸 수 없어요. ${resultText}` : jumpText;
}

function renderNumberLineView(container) {
  const model = buildNumberLineModel(curNumA, curNumB);
  const { dividend, divisor, quotient, remainder, jumps } = model;
  numberLineStep = Math.max(0, Math.min(jumps.length, numberLineStep));

  const isDone = numberLineStep === jumps.length;
  const currentJump = jumps[numberLineStep - 1];
  const currentValue = currentJump ? currentJump.to : dividend;
  const jumpCount = currentJump ? currentJump.index : 0;

  // 줄인 수직선은 칸이 좁고 번호가 길어 겹치므로 방금 뛴 점프의 번호만 적는다
  const arcsHtml = jumps.slice(0, numberLineStep).map((jump, i) => {
    const showCount = !model.compressed || i === numberLineStep - 1;
    return `
      <div class="nl-jump-arc" style="left:${jump.toPos}%; width:${jump.fromPos - jump.toPos}%;">
        ${showCount ? `<span class="nl-jump-count">${jump.index}</span>` : ''}
      </div>
    `;
  }).join('');

  const ticksHtml = model.ticks.map(tick => `
    <div class="nl-tick ${tick.value === currentValue ? 'nl-tick--current' : ''}" style="left:${tick.pos}%;"></div>
    <div class="nl-label ${tick.low ? 'nl-label--low' : ''} ${tick.value === currentValue ? 'nl-label--current' : ''}" style="left:${tick.pos}%;">${tick.value}</div>
  `).join('');

  const gapHtml = model.gap
    ? `<div class="nl-gap" style="left:${model.gap.pos}%;">⋯ ${model.gap.skipped}번 더</div>`
    : '';

  container.innerHTML = `
    <div class="numberline-wrap">
      <div class="block-step-nav">
        <span class="step-pill">📏 ${divisor}씩 뒤로 뛰기 (${jumpCount} / ${quotient}번)</span>
        <div class="nav-btn-group">
          <button class="step-control-btn" onclick="changeNumberLineStep(-1)" ${numberLineStep === 0 ? 'disabled' : ''}>◀ 이전</button>
          <button class="step-control-btn" onclick="changeNumberLineStep(1)" ${isDone ? 'disabled' : ''} style="background:#0284c7; color:#fff; border-color:#38bdf8;">다음 점프 ▶</button>
        </div>
      </div>

      <div class="nl-axis-container" role="img" aria-label="${dividend}에서 ${divisor}씩 뒤로 뛰는 수직선">
        <div class="nl-track">
          <div class="nl-axis-line"></div>
          ${arcsHtml}
          ${ticksHtml}
          ${gapHtml}
        </div>
      </div>

      <div style="background:rgba(15,23,42,0.6); border:2px solid var(--border-color); border-radius:16px; padding:20px; text-align:center;">
        <div style="font-family:'Jua'; font-size:1.5rem; color:#f59e0b; margin-bottom:16px;">
          ${isDone
            ? `${dividend} - (${divisor} × ${quotient}) = <span style="color:#ef4444;">${remainder}</span>`
            : `${dividend} - (${divisor} × ${jumpCount}) = ${currentValue}`}
        </div>
        <div style="display:flex; justify-content:space-around; align-items:center; flex-wrap:wrap; gap:12px;">
          <div style="background:rgba(2,132,199,0.15); border:1.5px solid #0284c7; border-radius:12px; padding:14px 20px;">
            <div style="font-size:0.9rem; color:#94a3b8;">뛰어 덜어낸 횟수 (몫)</div>
            <div style="font-family:'Jua'; font-size:2rem; color:#38bdf8;">${jumpCount}번</div>
          </div>
          <div style="background:rgba(239,68,68,0.15); border:1.5px solid #ef4444; border-radius:12px; padding:14px 20px;">
            <div style="font-size:0.9rem; color:#94a3b8;">0에 못 닿고 남은 수 (나머지)</div>
            <div style="font-family:'Jua'; font-size:2rem; color:#ef4444;">${isDone ? remainder : '?'}</div>
          </div>
        </div>
      </div>
    </div>
  `;

  studioSpeak(numberLineSpeech(model, numberLineStep));
}

function changeNumberLineStep(delta) {
  hasUserStarted = true;
  numberLineStep += delta;
  renderNumberLineView(document.getElementById('studioViewport'));
}
// ========================================================
// 🍫 [탭 4] 면적(넓이) 모델 렌더링
// ========================================================
function renderAreaModelView(container) {
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
        <h3 style="font-family:'Jua'; color:#38bdf8; margin:0 0 6px;">🍫 면적 분할 모델 (Area Model)</h3>
        <p style="color:var(--text-muted); font-size:0.95rem; margin:0;">
          가로 길이가 <strong>${divisor}</strong>일 때, 넓이 <strong>${dividend}</strong>를 채우는 세로 길이를 찾아요!
        </p>
      </div>

      <div class="area-rect-container">
        ${tensQ > 0 ? `
        <div class="area-box" style="background:linear-gradient(135deg, rgba(2,132,199,0.35) 0%, rgba(3,105,161,0.35) 100%); min-width:140px;">
          <div style="color:#94a3b8; font-size:0.85rem;">세로 ${tensQ}</div>
          <div style="color:#38bdf8; font-size:1.5rem;">넓이 ${tensQ * divisor}</div>
          <div style="color:#94a3b8; font-size:0.85rem;">(${divisor} × ${tensQ})</div>
        </div>
        ` : ''}

        <div class="area-box" style="background:linear-gradient(135deg, rgba(16,185,129,0.35) 0%, rgba(5,150,105,0.35) 100%); min-width:140px;">
          <div style="color:#94a3b8; font-size:0.85rem;">세로 ${onesQ}</div>
          <div style="color:#4ade80; font-size:1.5rem;">넓이 ${onesQ * divisor}</div>
          <div style="color:#94a3b8; font-size:0.85rem;">(${divisor} × ${onesQ})</div>
        </div>

        ${remainder > 0 ? `
        <div class="area-box" style="background:linear-gradient(135deg, rgba(239,68,68,0.25) 0%, rgba(185,28,28,0.25) 100%); min-width:100px;">
          <div style="color:#94a3b8; font-size:0.85rem;">남은 넓이</div>
          <div style="color:#ef4444; font-size:1.5rem;">${remainder}</div>
          <div style="color:#94a3b8; font-size:0.85rem;">(나머지)</div>
        </div>
        ` : ''}
      </div>

      <div style="font-family:'Jua'; font-size:1.3rem; color:#f8fafc; text-align:center;">
        전체 세로 길이(몫) = ${tensQ > 0 ? tensQ + ' + ' : ''}${onesQ} = <span style="color:#38bdf8;">${quotient}</span>
        ${remainder > 0 ? ` (나머지: <span style="color:#ef4444;">${remainder}</span>)` : ''}
      </div>
    </div>
  `;

  studioSpeak(speech);
}

// 덧셈/뺄셈/곱셈 일반 뷰 렌더링
function renderGenericOpView(container) {
  let res = 0;
  let desc = "";
  if (currentOp === 'mul') {
    res = curNumA * curNumB;
    desc = `${curNumA}를 ${curNumB}번 더한 것과 같아요! 넓이 = ${res}`;
  } else if (currentOp === 'add') {
    res = curNumA + curNumB;
    desc = `${curNumA}와 ${curNumB}를 한 상자에 모았어요! 합 = ${res}`;
  } else if (currentOp === 'sub') {
    res = curNumA - curNumB;
    desc = `${curNumA}에서 ${curNumB}만큼 덜어냈어요! 남은 수 = ${res}`;
  }

  container.innerHTML = `
    <div style="text-align:center; padding:40px 20px;">
      <h3 style="font-family:'Jua'; font-size:2.2rem; color:#38bdf8; margin-bottom:16px;">
        ${curNumA} ${document.getElementById('opSymbol').textContent} ${curNumB} = ${res}
      </h3>
      <p style="font-size:1.2rem; color:var(--text-main); margin-bottom:24px;">${desc}</p>
      <div style="background:rgba(255,255,255,0.05); border:1px dashed var(--border-color); border-radius:16px; padding:20px; max-width:480px; margin:0 auto;">
        💡 사칙연산 전체 인터랙티브 모듈이 준비되어 있습니다. 상단 ➗ 나눗셈 탭에서 집중 특화된 4대 시각화를 경험해 보세요!
      </div>
    </div>
  `;

  studioSpeak(`${curNumA} 계산 결과는 ${res}입니다!`);
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
  startStudioCalculation(false); // 🚨 최초 진입 시에는 음성을 내지 않음
});
