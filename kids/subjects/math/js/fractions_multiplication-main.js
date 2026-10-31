// ----------------------------------------------------
// 1. 피자 복제기 렌더링
// ----------------------------------------------------
function renderPizzaPlayground() {
  const wrap = document.getElementById('pizzaCanvasWrap');
  if (!wrap) return;

  const totalSlices = pizzaNum * pizzaMult;
  const fullPizzas = Math.floor(totalSlices / pizzaDen);
  const remainSlices = totalSlices % pizzaDen;
  const numPizzas = fullPizzas + (remainSlices > 0 ? 1 : 0);

  let html = '';
  let sliceCountSoFar = 0;

  for (let p = 0; p < Math.max(1, numPizzas); p++) {
    const activeInThisPizza = Math.min(pizzaDen, totalSlices - sliceCountSoFar);
    sliceCountSoFar += activeInThisPizza;

    html += `
      <div style="display:flex; flex-direction:column; align-items:center; gap:8px;">
        <svg width="150" height="150" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="46" fill="#fef3c7" stroke="#d97706" stroke-width="4"/>
          ${renderPizzaSvgSlices(pizzaDen, activeInThisPizza)}
        </svg>
        <span style="font-family:'Jua',sans-serif; color:#78350f; font-size:1rem;">
          피자 ${p + 1}판 (${activeInThisPizza}/${pizzaDen} 조각)
        </span>
      </div>
    `;
  }

  wrap.innerHTML = html;

  const mathBox = document.getElementById('formulaMathBox');
  if (mathBox) {
    const isOver = totalSlices >= pizzaDen;
    let resHtml = `<span class="inline-frac"><span>${totalSlices}</span><span class="bar">/</span><span>${pizzaDen}</span></span>`;
    if (isOver && remainSlices > 0) {
      resHtml += ` = ${fullPizzas}<span class="inline-frac"><span>${remainSlices}</span><span class="bar">/</span><span>${pizzaDen}</span></span>`;
    } else if (isOver && remainSlices === 0) {
      resHtml += ` = ${fullPizzas}판`;
    }

    mathBox.innerHTML = `
      <span class="inline-frac"><span>${pizzaNum}</span><span class="bar">/</span><span>${pizzaDen}</span></span> 
      × ${pizzaMult} = 
      <span class="inline-frac"><span>${pizzaNum} × ${pizzaMult}</span><span class="bar">/</span><span>${pizzaDen}</span></span>
      = <span style="color:#b45309; font-size:1.15em;">${resHtml}</span>
    `;
  }
}

function renderPizzaSvgSlices(den, activeCount) {
  let paths = '';
  const cx = 50, cy = 50, r = 44;
  const angleStep = 360 / den;

  for (let i = 0; i < den; i++) {
    const startAngle = i * angleStep - 90;
    const endAngle = (i + 1) * angleStep - 90;
    const isFilled = (i < activeCount);

    const x1 = cx + r * Math.cos(startAngle * Math.PI / 180);
    const y1 = cy + r * Math.sin(startAngle * Math.PI / 180);
    const x2 = cx + r * Math.cos(endAngle * Math.PI / 180);
    const y2 = cy + r * Math.sin(endAngle * Math.PI / 180);

    const largeArc = angleStep > 180 ? 1 : 0;
    const fill = isFilled ? "#ef4444" : "#ffedd5";
    const stroke = "#d97706";

    paths += `
      <path d="M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z" 
            fill="${fill}" stroke="${stroke}" stroke-width="2" style="transition:all 0.3s;"/>
    `;

    if (isFilled) {
      const midAngle = (startAngle + endAngle) / 2;
      const sx = cx + (r * 0.6) * Math.cos(midAngle * Math.PI / 180);
      const sy = cy + (r * 0.6) * Math.sin(midAngle * Math.PI / 180);
      paths += `<circle cx="${sx}" cy="${sy}" r="3" fill="#ffffff" opacity="0.9"/>`;
    }
  }
  return paths;
}

function setPizzaPreset(num, den, mult) {
  playSfx('click');
  pizzaNum = num;
  pizzaDen = den;
  pizzaMult = mult;
  renderConceptTab(0);
}

function changePizzaMult(delta) {
  playSfx('pizza');
  pizzaMult = Math.max(1, Math.min(6, pizzaMult + delta));
  renderPizzaPlayground();
  const controls = document.getElementById('controlsArea');
  if (controls) controls.innerHTML = getControlsHtml('pizza');
}

function resetPizza() {
  playSfx('click');
  pizzaMult = 2;
  renderPizzaPlayground();
  const controls = document.getElementById('controlsArea');
  if (controls) controls.innerHTML = getControlsHtml('pizza');
}

// ----------------------------------------------------
// 2. 수직선 징검다리 렌더링
// ----------------------------------------------------
function renderNumberlinePlayground() {
  const svg = document.getElementById('numberlineSvg');
  if (!svg) return;

  const startX = 50;
  const endX = 550;
  const lineY = 90;
  const totalLength = endX - startX;
  const unitPx = totalLength / 2;
  const stepPx = unitPx / 5;

  let ticks = '';
  for (let i = 0; i <= 10; i++) {
    const x = startX + i * stepPx;
    const isMain = (i % 5 === 0);
    const h = isMain ? 24 : 12;
    const strokeW = isMain ? 3 : 1.5;
    const strokeC = isMain ? "#b45309" : "#9ca3af";

    ticks += `<line x1="${x}" y1="${lineY - h/2}" x2="${x}" y2="${lineY + h/2}" stroke="${strokeC}" stroke-width="${strokeW}"/>`;

    if (isMain) {
      const val = i / 5;
      ticks += `<text x="${x}" y="${lineY + 30}" font-family="Jua" font-size="18" fill="#78350f" text-anchor="middle">${val}</text>`;
      if (val === 1 || val === 2) {
        ticks += `<text x="${x}" y="${lineY - 24}" font-size="18" text-anchor="middle">🚩</text>`;
      }
    }
  }

  let jumpArcs = '';
  for (let j = 0; j < jumpStep; j++) {
    const x1 = startX + (j * 2) * stepPx;
    const x2 = startX + ((j + 1) * 2) * stepPx;
    const midX = (x1 + x2) / 2;
    const arcY = lineY - 45;
    jumpArcs += `
      <path d="M ${x1} ${lineY} Q ${midX} ${arcY} ${x2} ${lineY}" 
            fill="none" stroke="#10b981" stroke-width="4" stroke-dasharray="6,4"/>
      <text x="${midX}" y="${arcY - 6}" font-family="Jua" font-size="14" fill="#047857" text-anchor="middle">+2/5</text>
    `;
  }

  const currentFrogX = startX + (jumpStep * 2) * stepPx;
  const frogEl = `
    <g transform="translate(${currentFrogX}, ${lineY - 14})">
      <circle cx="0" cy="0" r="16" fill="#10b981" stroke="#ffffff" stroke-width="2"/>
      <text x="0" y="5" font-size="16" text-anchor="middle">🐸</text>
    </g>
  `;

  svg.innerHTML = `
    <line x1="${startX}" y1="${lineY}" x2="${endX}" y2="${lineY}" stroke="#d97706" stroke-width="4" stroke-linecap="round"/>
    ${ticks}
    ${jumpArcs}
    ${frogEl}
  `;

  const statusEl = document.getElementById('jumpStatusText');
  if (statusEl) {
    if (jumpStep === 0) {
      statusEl.textContent = "🐸 개구리가 징검다리를 건널 준비를 하고 있어요! (0 / 3 점프)";
    } else if (jumpStep === 1) {
      statusEl.innerHTML = "첫 번째 점프! <b>2/5 지점</b>에 도착했어요!";
    } else if (jumpStep === 2) {
      statusEl.innerHTML = "두 번째 점프! <b>4/5 지점</b>에 도착했어요!";
    } else if (jumpStep === 3) {
      statusEl.innerHTML = "세 번째 점프! 깃발 1을 넘어 <b>6/5 (즉 1과 1/5)</b>에 완벽 도착! 🎉";
    }
  }
}

function doJump() {
  if (jumpStep < 3) {
    playSfx('jump');
    jumpStep++;
    renderNumberlinePlayground();
  }
}

function resetJump() {
  playSfx('click');
  jumpStep = 0;
  renderNumberlinePlayground();
}

// ----------------------------------------------------
// 3. 포션 가분수 투구 렌더링
// ----------------------------------------------------
function renderPotionPlayground() {
  const wrap = document.getElementById('potionWrap');
  if (!wrap) return;

  let contentHtml = '';
  const stepBtn = document.getElementById('potionStepBtn');

  if (potionState === 'mixed') {
    if (stepBtn) stepBtn.textContent = "🪖 1단계: 가분수 투구 씌우기!";
    contentHtml = `
      <div style="display:flex; align-items:center; gap:20px;">
        <div style="text-align:center;">
          <div style="font-size:3.5rem;">🏺</div>
          <div style="font-family:'Jua'; color:#78350f;">온전한 1병 (3/3)</div>
        </div>
        <div style="font-size:2rem; font-family:'Jua'; color:#b45309;">+</div>
        <div style="text-align:center;">
          <div style="display:flex; gap:6px; font-size:2.4rem;">🧪🧪</div>
          <div style="font-family:'Jua'; color:#78350f;">작은 잔 2개 (2/3)</div>
        </div>
      </div>
      <div style="font-family:'Jua'; font-size:1.15rem; color:#b45309; background:#fffbeb; padding:8px 18px; border-radius:14px; border:1px solid #fde68a;">
        현재 상태: 대분수 1과 2/3병
      </div>
    `;
  } else if (potionState === 'helmet') {
    if (stepBtn) stepBtn.textContent = "🧪 2단계: 2배로 복제하기 (× 2)!";
    contentHtml = `
      <div style="text-align:center;">
        <div style="font-size:1.5rem; margin-bottom:6px;">🪖 펑! 1병이 작은 잔 3개로 변신!</div>
        <div style="display:flex; gap:8px; font-size:2.6rem; justify-content:center;">
          🧪🧪🧪 🧪🧪
        </div>
        <div style="font-family:'Jua'; color:#2563eb; font-size:1.2rem; margin-top:8px;">
          가분수 투구 착용: 총 5잔 (5/3)
        </div>
      </div>
    `;
  } else if (potionState === 'multiplied') {
    if (stepBtn) stepBtn.textContent = "✨ 3단계: 대분수로 정리하기!";
    contentHtml = `
      <div style="text-align:center;">
        <div style="font-size:1.4rem; color:#d97706; margin-bottom:8px;">× 2 복제 마법 발동! 잔이 2배로 늘어났어요!</div>
        <div style="display:flex; flex-wrap:wrap; max-width:320px; gap:8px; font-size:2.4rem; justify-content:center;">
          🧪🧪🧪🧪🧪 🧪🧪🧪🧪🧪
        </div>
        <div style="font-family:'Jua'; color:#b45309; font-size:1.2rem; margin-top:8px;">
          총 10잔 (10/3)
        </div>
      </div>
    `;
  } else if (potionState === 'restored') {
    if (stepBtn) stepBtn.textContent = "🎉 마법 완성! 처음으로";
    contentHtml = `
      <div style="display:flex; align-items:center; gap:16px;">
        <div style="text-align:center;">
          <div style="font-size:3.2rem;">🏺🏺🏺</div>
          <div style="font-family:'Jua'; color:#047857;">온전한 3병 (9/3)</div>
        </div>
        <div style="font-size:2rem; font-family:'Jua'; color:#047857;">+</div>
        <div style="text-align:center;">
          <div style="font-size:2.4rem;">🧪</div>
          <div style="font-family:'Jua'; color:#047857;">남은 1잔 (1/3)</div>
        </div>
      </div>
      <div style="font-family:'Jua'; font-size:1.25rem; color:#065f46; background:#ecfdf5; padding:10px 22px; border-radius:14px; border:2px solid #10b981;">
        최종 결과: 대분수 3과 1/3 리터 완성!
      </div>
    `;
  }

  wrap.innerHTML = contentHtml;
}

function nextPotionStep() {
  playSfx('pizza');
  if (potionState === 'mixed') potionState = 'helmet';
  else if (potionState === 'helmet') potionState = 'multiplied';
  else if (potionState === 'multiplied') potionState = 'restored';
  else if (potionState === 'restored') potionState = 'mixed';
  renderPotionPlayground();
}

function resetPotion() {
  playSfx('click');
  potionState = 'mixed';
  renderPotionPlayground();
}

// ----------------------------------------------------
// 4. 무지개 털실 렌더링
// ----------------------------------------------------
function renderYarnPlayground() {
  const wrap = document.getElementById('yarnWrap');
  if (!wrap) return;

  const stepBtn = document.getElementById('yarnStepBtn');
  let blocksHtml = '';

  if (yarnStep === 0) {
    if (stepBtn) stepBtn.textContent = "✂️ 1단계: 3도막으로 똑같이 나누기";
    blocksHtml = `
      <div style="width:100%; height:46px; background:linear-gradient(90deg, #f43f5e, #f59e0b, #10b981, #3b82f6); border-radius:14px; border:3px solid #d97706; display:flex; align-items:center; justify-content:center; color:#ffffff; font-family:'Jua'; font-size:1.3rem; box-shadow:0 4px 12px rgba(217,119,6,0.2);">
        길이가 6m인 전체 무지개 털실
      </div>
    `;
  } else if (yarnStep === 1) {
    if (stepBtn) stepBtn.textContent = "🎁 2단계: 2도막 가져오기 (× 2)";
    blocksHtml = `
      <div style="display:flex; gap:10px; width:100%;">
        <div style="flex:1; height:46px; background:#e0f2fe; border:2px dashed #0284c7; border-radius:12px; display:flex; align-items:center; justify-content:center; font-family:'Jua'; font-size:1.1rem; color:#0369a1;">1도막 (2m)</div>
        <div style="flex:1; height:46px; background:#e0f2fe; border:2px dashed #0284c7; border-radius:12px; display:flex; align-items:center; justify-content:center; font-family:'Jua'; font-size:1.1rem; color:#0369a1;">2도막 (2m)</div>
        <div style="flex:1; height:46px; background:#e0f2fe; border:2px dashed #0284c7; border-radius:12px; display:flex; align-items:center; justify-content:center; font-family:'Jua'; font-size:1.1rem; color:#0369a1;">3도막 (2m)</div>
      </div>
      <div style="font-family:'Jua'; color:#0369a1; margin-top:12px; font-size:1.05rem;">
        6m를 분모 3으로 나누니 1도막은 <b>2m</b>!
      </div>
    `;
  } else if (yarnStep === 2) {
    if (stepBtn) stepBtn.textContent = "🎉 4m 완성! 처음으로";
    blocksHtml = `
      <div style="display:flex; gap:10px; width:100%;">
        <div style="flex:1; height:46px; background:#fef3c7; border:3px solid #d97706; border-radius:12px; display:flex; align-items:center; justify-content:center; font-family:'Jua'; font-size:1.15rem; color:#b45309; box-shadow:0 4px 10px rgba(217,119,6,0.2);">선택 1도막 (2m) ⭐</div>
        <div style="flex:1; height:46px; background:#fef3c7; border:3px solid #d97706; border-radius:12px; display:flex; align-items:center; justify-content:center; font-family:'Jua'; font-size:1.15rem; color:#b45309; box-shadow:0 4px 10px rgba(217,119,6,0.2);">선택 2도막 (2m) ⭐</div>
        <div style="flex:1; height:46px; background:#f3f4f6; border:2px solid #d1d5db; border-radius:12px; display:flex; align-items:center; justify-content:center; font-family:'Jua'; font-size:1.1rem; color:#9ca3af;">남은 3도막 (2m)</div>
      </div>
      <div style="font-family:'Jua'; color:#065f46; margin-top:12px; font-size:1.2rem; background:#ecfdf5; padding:8px 18px; border-radius:12px; border:2px solid #10b981;">
        2도막을 가져오니 2m × 2 = <b>4m</b> 싹둑 완성! ✂️
      </div>
    `;
  }

  wrap.innerHTML = blocksHtml;
}

function nextYarnStep() {
  playSfx('scissor');
  yarnStep = (yarnStep + 1) % 3;
  renderYarnPlayground();
}

function resetYarn() {
  playSfx('click');
  yarnStep = 0;
  renderYarnPlayground();
}

// ----------------------------------------------------
// 5. 크리스털 창문 렌더링
// ----------------------------------------------------
function renderWindowPlayground() {
  const frame = document.getElementById('windowFrame');
  const legend = document.getElementById('windowLegend');
  if (!frame) return;

  const totalCells = windowX * windowY;

  if (!windowOverlapped) {
    const xPct = (100 / windowX).toFixed(1);
    const yPct = (100 / windowY).toFixed(1);
    frame.innerHTML = `
      <div style="width:100%; height:100%; position:relative;">
        <div style="position:absolute; top:0; left:0; width:${xPct}%; height:100%; background:rgba(59, 130, 246, 0.4); border-right:2px solid #2563eb; display:flex; align-items:center; justify-content:center; font-family:'Jua'; color:#1d4ed8; font-size:1.1rem;">
          가로 1/${windowX}
        </div>
        <div style="position:absolute; top:0; left:0; width:100%; height:${yPct}%; background:rgba(234, 179, 8, 0.35); border-bottom:2px solid #ca8a04; display:flex; align-items:center; justify-content:center; font-family:'Jua'; color:#a16207; font-size:1.1rem;">
          세로 1/${windowY}
        </div>
      </div>
    `;
    legend.textContent = `가로 1/${windowX} 빛과 세로 1/${windowY} 빛이 포개질 준비를 하고 있어요!`;
  } else {
    let gridCells = '';
    for (let r = 0; r < windowY; r++) {
      for (let c = 0; c < windowX; c++) {
        const isOverlap = (r === 0 && c === 0);
        const bg = isOverlap ? "linear-gradient(135deg, #10b981, #059669)" : (c === 0 ? "rgba(59,130,246,0.2)" : (r === 0 ? "rgba(234,179,8,0.2)" : "#ffffff"));
        const border = "1px solid #94a3b8";
        const txt = isOverlap ? `<b style='color:#fff; font-size:1.15rem;'>1/${totalCells} ✨</b>` : "";
        gridCells += `
          <div style="background:${bg}; border:${border}; display:flex; align-items:center; justify-content:center; font-family:'Jua';">
            ${txt}
          </div>
        `;
      }
    }
    frame.innerHTML = `
      <div style="display:grid; grid-template-columns:repeat(${windowX}, 1fr); grid-template-rows:repeat(${windowY}, 1fr); width:100%; height:100%;">
        ${gridCells}
      </div>
    `;
    legend.innerHTML = `겹쳐진 초록색 에메랄드 칸은 전체 <b>${totalCells}칸 중 딱 1칸 (1/${totalCells})</b>!`;
  }
}

function setWindowPreset(x, y) {
  playSfx('click');
  windowX = x;
  windowY = y;
  windowOverlapped = false;
  renderConceptTab(4);
}

function toggleWindowOverlap() {
  playSfx('magic');
  windowOverlapped = true;
  renderWindowPlayground();
}

function resetWindow() {
  playSfx('click');
  windowOverlapped = false;
  renderWindowPlayground();
}

// ----------------------------------------------------
// 6. 마법 가위 번개 약분술 렌더링
// ----------------------------------------------------
function renderScissorPlayground() {
  const wrap = document.getElementById('scissorWrap');
  if (!wrap) return;

  let exprHtml = '';
  if (scissorMode === 1) {
    if (!scissorCut) {
      exprHtml = `
        <div style="display:flex; align-items:center; gap:16px; font-family:'Jua'; font-size:2.2rem; color:#78350f;">
          <span class="inline-frac">
            <span>3</span>
            <span class="bar">/</span>
            <span class="touch-target-num" onclick="toggleScissorCut()" title="터치해서 약분하기!" style="color:#ef4444; border:3px solid #ef4444; border-radius:10px; padding:2px 8px; background:#fff;">4 ✂️</span>
          </span>
          <span>×</span>
          <span class="inline-frac">
            <span class="touch-target-num" onclick="toggleScissorCut()" title="터치해서 약분하기!" style="color:#ef4444; border:3px solid #ef4444; border-radius:10px; padding:2px 8px; background:#fff;">2 ✂️</span>
            <span class="bar">/</span>
            <span>7</span>
          </span>
        </div>
        <div style="font-family:'Jua'; color:#ef4444; font-size:1.15rem; background:#fee2e2; padding:8px 18px; border-radius:12px; border:1px solid #f87171; cursor:pointer;" onclick="toggleScissorCut()">
          ⚡ 빨간 박스의 4나 2를 손가락으로 콕 터치해 보세요! (마법 가위 발동)
        </div>
      `;
    } else {
      exprHtml = `
        <div style="display:flex; align-items:center; gap:16px; font-family:'Jua'; font-size:2rem; color:#78350f;">
          <span class="inline-frac">
            <span>3</span>
            <span class="bar">/</span>
            <span><del style="color:#ef4444;">4</del> <small style="color:#2563eb; font-size:0.9em; font-weight:800;">2</small></span>
          </span>
          <span>×</span>
          <span class="inline-frac">
            <span><del style="color:#ef4444;">2</del> <small style="color:#2563eb; font-size:0.9em; font-weight:800;">1</small></span>
            <span class="bar">/</span>
            <span>7</span>
          </span>
          <span>=</span>
          <span class="inline-frac">
            <span>3 × 1</span>
            <span class="bar">/</span>
            <span>2 × 7</span>
          </span>
          <span>=</span>
          <span class="inline-frac" style="color:#047857; font-size:1.2em;">
            <span>3</span>
            <span class="bar">/</span>
            <span>14</span>
          </span>
        </div>
        <div style="font-family:'Jua'; color:#065f46; font-size:1.2rem; background:#ecfdf5; padding:8px 20px; border-radius:12px; border:2px solid #10b981;">
          ✂️ 싹둑! 4는 2가 되고, 2는 1이 되어 답이 3/14로 쏙 나왔어요!
        </div>
      `;
    }
  } else {
    if (!scissorCut) {
      exprHtml = `
        <div style="display:flex; align-items:center; gap:16px; font-family:'Jua'; font-size:1.8rem; color:#78350f;">
          <span>2<span class="inline-frac"><span>1</span><span class="bar">/</span><span>3</span></span> × 1<span class="inline-frac"><span>1</span><span class="bar">/</span><span>5</span></span></span>
          <span>➔</span>
          <span class="inline-frac">
            <span>7</span>
            <span class="bar">/</span>
            <span class="touch-target-num" onclick="toggleScissorCut()" style="color:#ef4444; border:3px solid #ef4444; border-radius:10px; padding:2px 8px; background:#fff;">3 ✂️</span>
          </span>
          <span>×</span>
          <span class="inline-frac">
            <span class="touch-target-num" onclick="toggleScissorCut()" style="color:#ef4444; border:3px solid #ef4444; border-radius:10px; padding:2px 8px; background:#fff;">6 ✂️</span>
            <span class="bar">/</span>
            <span>5</span>
          </span>
        </div>
        <div style="font-family:'Jua'; color:#ef4444; font-size:1.15rem; background:#fee2e2; padding:8px 18px; border-radius:12px; border:1px solid #f87171; cursor:pointer;" onclick="toggleScissorCut()">
          ⚡ 빨간 박스의 3이나 6을 터치해 보세요! (3으로 약분)
        </div>
      `;
    } else {
      exprHtml = `
        <div style="display:flex; align-items:center; gap:14px; font-family:'Jua'; font-size:1.8rem; color:#78350f;">
          <span class="inline-frac">
            <span>7</span>
            <span class="bar">/</span>
            <span><del style="color:#ef4444;">3</del> <small style="color:#2563eb; font-weight:800;">1</small></span>
          </span>
          <span>×</span>
          <span class="inline-frac">
            <span><del style="color:#ef4444;">6</del> <small style="color:#2563eb; font-weight:800;">2</small></span>
            <span class="bar">/</span>
            <span>5</span>
          </span>
          <span>=</span>
          <span class="inline-frac">
            <span>14</span>
            <span class="bar">/</span>
            <span>5</span>
          </span>
          <span>=</span>
          <span style="color:#047857; font-size:1.15em;">2<span class="inline-frac"><span>4</span><span class="bar">/</span><span>5</span></span></span>
        </div>
        <div style="font-family:'Jua'; color:#065f46; font-size:1.2rem; background:#ecfdf5; padding:8px 20px; border-radius:12px; border:2px solid #10b981;">
          약분 덕분에 7×2=14, 1×5=5로 쉬워졌어요! 대분수 2와 4/5 정답!
        </div>
      `;
    }
  }

  wrap.innerHTML = exprHtml;
}

function toggleScissorCut() {
  playSfx('scissor');
  scissorCut = true;
  renderScissorPlayground();
}

function toggleScissorExample() {
  playSfx('click');
  scissorMode = scissorMode === 1 ? 2 : 1;
  scissorCut = false;
  renderScissorPlayground();
}

// 초기 로드
window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('gemCount').textContent = getGemCount();
  switchTab(0);
});
