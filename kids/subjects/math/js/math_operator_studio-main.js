// ========================================================
// 📝 [탭 2] 단계별 격자 세로셈 튜터 렌더링
// ========================================================
function renderVerticalTutorView(container) {
  if (!divisionPlan || divisionPlan.length === 0) {
    buildDivisionPlan(curNumA, curNumB);
  }

  const curPlan = divisionPlan[tutorCurrentStep - 1] || divisionPlan[0];
  const tensDigit = Math.floor(curNumA / 10);
  const onesDigit = curNumA % 10;
  const divisor = curNumB;

  const qTens = Math.floor(tensDigit / divisor);
  const multTens = qTens * divisor;
  const remTens = tensDigit - multTens;
  const broughtDown = (remTens * 10) + onesDigit;
  const qOnes = Math.floor(broughtDown / divisor);
  const multOnes = qOnes * divisor;
  const remainder = broughtDown - multOnes;

  // 세로셈 테이블 셀 렌더링
  container.innerHTML = `
    <div class="vertical-tutor-container">
      <div class="division-board-card">
        <table class="division-table">
          <!-- 몫 행 -->
          <tr>
            <td></td>
            <td class="td-divisor-arc"></td>
            <td class="td-quotient-line ${curPlan.focus === 'q_tens' ? 'cell-active' : ''}">
              ${tutorCurrentStep >= 1 && qTens > 0 ? qTens : ''}
            </td>
            <td class="td-quotient-line ${curPlan.focus === 'q_ones' ? 'cell-active' : ''}">
              ${tutorCurrentStep >= 5 ? qOnes : ''}
            </td>
          </tr>
          <!-- 나누어지는 수 행 -->
          <tr>
            <td style="color:#f59e0b;">${divisor}</td>
            <td class="td-divisor-arc">)</td>
            <td style="color:#38bdf8;">${tensDigit}</td>
            <td style="color:#38bdf8;">${onesDigit}</td>
          </tr>
          <!-- 십의 자리 곱한 값 -->
          ${tutorCurrentStep >= 2 ? `
          <tr>
            <td></td>
            <td>-</td>
            <td class="${curPlan.focus === 'mult_tens' ? 'cell-active' : ''}" style="color:#ec4899;">${multTens}</td>
            <td></td>
          </tr>
          ` : ''}
          <!-- 십의 자리 뺀 값 및 내려쓰기 -->
          ${tutorCurrentStep >= 3 ? `
          <tr>
            <td></td>
            <td class="calc-step-line"></td>
            <td class="calc-step-line ${curPlan.focus === 'rem_tens' ? 'cell-active' : ''}">${remTens}</td>
            <td class="calc-step-line ${curPlan.focus === 'bring_down' ? 'cell-active' : ''}" style="color:#10b981;">
              ${tutorCurrentStep >= 4 ? onesDigit : ''}
            </td>
          </tr>
          ` : ''}
          <!-- 일의 자리 곱한 값 -->
          ${tutorCurrentStep >= 6 ? `
          <tr>
            <td></td>
            <td>-</td>
            <td>${Math.floor(multOnes / 10) || ''}</td>
            <td class="${curPlan.focus === 'mult_ones' ? 'cell-active' : ''}" style="color:#ec4899;">${multOnes % 10}</td>
          </tr>
          ` : ''}
          <!-- 최종 나머지 행 -->
          ${tutorCurrentStep >= 7 ? `
          <tr>
            <td></td>
            <td class="calc-step-line"></td>
            <td class="calc-step-line"></td>
            <td class="calc-step-line ${curPlan.focus === 'remainder' ? 'cell-active' : ''}" style="color:#ef4444;">
              ${remainder}
            </td>
          </tr>
          ` : ''}
        </table>
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
function renderNumberLineView(container) {
  const dividend = curNumA;
  const divisor = curNumB;
  const quotient = Math.floor(dividend / divisor);
  const remainder = dividend % divisor;

  const speech = `수직선에서 ${dividend}부터 ${divisor}씩 뒤로 점프하며 덜어내 볼까요? 총 ${quotient}번 덜어내고 ${remainder}이 남아요!`;

  container.innerHTML = `
    <div class="numberline-wrap">
      <h3 style="font-family:'Jua'; color:#38bdf8; margin:0 0 10px;">📏 수직선 동수누감 (점프해서 덜어내기)</h3>
      <p style="color:var(--text-muted); font-size:1rem; margin:0 0 20px;">
        ${dividend}에서 ${divisor}씩 몇 번을 뺄 수 있을까요? <strong>총 ${quotient}번 덜어내고 ${remainder}이 남습니다!</strong>
      </p>

      <div style="background:rgba(15,23,42,0.6); border:2px solid var(--border-color); border-radius:16px; padding:30px 20px; text-align:center;">
        <div style="font-family:'Jua'; font-size:1.8rem; color:#f59e0b; margin-bottom:20px;">
          ${dividend} - (${divisor} × ${quotient}) = <span style="color:#ef4444;">${remainder}</span>
        </div>
        <div style="display:flex; justify-content:space-around; align-items:center; flex-wrap:wrap; gap:12px;">
          <div style="background:rgba(2,132,199,0.15); border:1.5px solid #0284c7; border-radius:12px; padding:14px 20px;">
            <div style="font-size:0.9rem; color:#94a3b8;">뛰어 덜어낸 횟수 (몫)</div>
            <div style="font-family:'Jua'; font-size:2rem; color:#38bdf8;">${quotient}번</div>
          </div>
          <div style="background:rgba(239,68,68,0.15); border:1.5px solid #ef4444; border-radius:12px; padding:14px 20px;">
            <div style="font-size:0.9rem; color:#94a3b8;">0에 못 닿고 남은 수 (나머지)</div>
            <div style="font-family:'Jua'; font-size:2rem; color:#ef4444;">${remainder}</div>
          </div>
        </div>
      </div>
    </div>
  `;

  studioSpeak(speech);
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
