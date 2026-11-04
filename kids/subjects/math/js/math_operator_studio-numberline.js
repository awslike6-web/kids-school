// ========================================================
// 📏 연산 멀티 스튜디오 - 수직선 (모델 + 화면)
// 모델은 DOM을 쓰지 않는 순수 계산이고, 화면은 모델만 그린다.
// ========================================================
(() => {
  'use strict';

  // ========================================================
  // 📏 수직선 모델: 점프 목록과 눈금 위치(%)
  // ========================================================
  const MAX_DRAWN_JUMPS = 12;

  // 점프가 많으면 앞뒤만 그리고 줄인 구간에 칸을 하나 비운다. 축은 비례가 아니라 고른 칸이 된다.
  function compressedPosition(sorted, gapStart) {
    const gapIndex = sorted.indexOf(gapStart);
    const slotCount = sorted.length;
    return {
      gapPos: ((gapIndex + 1) / slotCount) * 100,
      position: value => {
        const index = sorted.indexOf(value);
        return ((index > gapIndex ? index + 1 : index) / slotCount) * 100;
      }
    };
  }

  function repeatedJumpIndexes(total, maxJumps) {
    const compressed = total > maxJumps;
    const edgeJumps = Math.floor((maxJumps - 2) / 2);
    const indexes = [];
    for (let i = 1; i <= total; i++) {
      if (!compressed || i <= edgeJumps || i > total - edgeJumps) indexes.push(i);
    }
    return { compressed, edgeJumps, indexes };
  }

  function finishLineModel(model, jumps, sorted, position) {
    return {
      ...model,
      jumps: jumps.map(jump => ({ ...jump, fromPos: position(jump.from), toPos: position(jump.to) })),
      ticks: sorted.map((value, i) => ({ value, pos: position(value), low: i % 2 === 0 }))
    };
  }

  // ➗ 나누어지는 수에서 나누는 수씩 뒤로 뛴다
  function buildNumberLineModel(dividend, divisor, maxJumps = MAX_DRAWN_JUMPS) {
    const quotient = Math.floor(dividend / divisor);
    const remainder = dividend % divisor;
    const { compressed, edgeJumps, indexes } = repeatedJumpIndexes(quotient, maxJumps);
    const jumps = indexes.map(index => ({
      index,
      from: dividend - (index - 1) * divisor,
      to: dividend - index * divisor
    }));

    const values = new Set([0, remainder, dividend]);
    jumps.forEach(jump => { values.add(jump.from); values.add(jump.to); });
    const sorted = [...values].sort((a, b) => a - b);

    let gap = null;
    let position = value => (value / dividend) * 100;
    if (compressed) {
      const layout = compressedPosition(sorted, dividend - (quotient - edgeJumps) * divisor);
      position = layout.position;
      gap = { skipped: quotient - edgeJumps * 2, pos: layout.gapPos };
    }

    return finishLineModel(
      { op: 'div', dividend, divisor, quotient, remainder, compressed, gap, startVal: dividend, endVal: remainder, totalJumps: quotient },
      jumps,
      sorted,
      position
    );
  }

  // ✖️ 0에서 곱해지는 수씩 앞으로 뛴다
  function buildMultiplicationLineModel(numA, numB, maxJumps = MAX_DRAWN_JUMPS) {
    const product = numA * numB;
    const { compressed, edgeJumps, indexes } = repeatedJumpIndexes(numB, maxJumps);
    const jumps = indexes.map(index => ({ index, from: (index - 1) * numA, to: index * numA }));

    const values = new Set([0, product]);
    jumps.forEach(jump => { values.add(jump.from); values.add(jump.to); });
    const sorted = [...values].sort((a, b) => a - b);

    let gap = null;
    let position = value => (value / product) * 100;
    if (compressed) {
      const layout = compressedPosition(sorted, edgeJumps * numA);
      position = layout.position;
      gap = { skipped: numB - edgeJumps * 2, pos: layout.gapPos };
    }

    return finishLineModel(
      { op: 'mul', numA, numB, compressed, gap, startVal: 0, endVal: product, totalJumps: numB },
      jumps,
      sorted,
      position
    );
  }

  // ➕➖ 자리별로 나누어 뛴다 (+400, +20, +5). 작은 점프도 보이도록 칸 너비에 하한을 둔다.
  function buildPlaceJumpLineModel(op, numA, numB) {
    if (op === 'sub' && numA < numB) return { op, blocked: true };

    const sign = op === 'add' ? 1 : -1;
    const symbol = op === 'add' ? '+' : '−';
    const parts = [100, 10, 1]
      .map(unit => Math.floor(numB / unit) % 10 * unit)
      .filter(part => part > 0);

    let current = numA;
    const jumps = parts.map((part, i) => {
      const from = current;
      current += sign * part;
      return { index: i + 1, from, to: current, label: `${symbol}${part}` };
    });

    const sorted = [...new Set([numA, current])].concat(jumps.map(jump => jump.to))
      .filter((value, i, list) => list.indexOf(value) === i)
      .sort((a, b) => a - b);
    const widths = sorted.slice(1).map((value, i) => Math.max(value - sorted[i], numB * 0.2));
    const widthTotal = widths.reduce((sum, width) => sum + width, 0);
    const positions = new Map([[sorted[0], 0]]);
    let walked = 0;
    widths.forEach((width, i) => {
      walked += width;
      positions.set(sorted[i + 1], (walked / widthTotal) * 100);
    });

    return finishLineModel(
      { op, numA, numB, compressed: false, gap: null, startVal: numA, endVal: current, totalJumps: jumps.length },
      jumps,
      sorted,
      value => positions.get(value)
    );
  }

  function buildOpNumberLineModel(op, numA, numB) {
    if (op === 'div') return buildNumberLineModel(numA, numB);
    if (op === 'mul') return buildMultiplicationLineModel(numA, numB);
    return buildPlaceJumpLineModel(op, numA, numB);
  }

  window.OperatorStudioLines = { buildNumberLineModel, buildOpNumberLineModel };
})();

// ========================================================
// 📏 [탭 3] 수직선 렌더링 (4대 연산 공통)
// 실제 수직선 위에서 "다음 점프"를 누를 때마다 한 번씩 뛴다.
// ========================================================
function numberLineSpeech(model, step) {
  const { op, jumps, startVal, endVal } = model;
  const eul = n => `${n}${numberJosa(n, '을', '를')}`;
  const eun = n => `${n}${numberJosa(n, '은', '는')}`;
  const ieyo = n => `${n}${numberJosa(n, '이에요', '예요')}`;

  if (op === 'div') {
    const resultText = divisionResultText(model.quotient, model.remainder);
    if (jumps.length === 0) return `${startVal}에서는 ${eul(model.divisor)} 한 번도 뺄 수 없어요. ${resultText}`;
    if (step === 0) return `수직선에서 ${startVal}부터 ${model.divisor}씩 뒤로 뛰어 볼까요? 다음 점프 버튼을 눌러 보세요!`;
    const jump = jumps[step - 1];
    const previous = jumps[step - 2];
    const skipped = previous && jump.index > previous.index + 1 ? `중간의 ${jump.index - previous.index - 1}번은 건너뛰고, ` : '';
    const text = `${skipped}${jump.from}에서 ${eul(model.divisor)} 빼면 ${jump.to}! ${jump.index}번 뛰었어요.`;
    return step === jumps.length ? `${text} 더는 뛸 수 없어요. ${resultText}` : text;
  }

  if (op === 'mul') {
    if (step === 0) return `수직선에서 0부터 ${model.numA}씩 ${model.numB}번 앞으로 뛰어 볼까요? 다음 점프 버튼을 눌러 보세요!`;
    const jump = jumps[step - 1];
    const previous = jumps[step - 2];
    const skipped = previous && jump.index > previous.index + 1 ? `중간의 ${jump.index - previous.index - 1}번은 건너뛰고, ` : '';
    const text = `${skipped}${jump.from}에서 ${model.numA}만큼 뛰면 ${jump.to}! ${jump.index}번 뛰었어요.`;
    return step === jumps.length ? `${text} ${model.numA} 곱하기 ${eun(model.numB)} ${ieyo(endVal)}.` : text;
  }

  const direction = op === 'add' ? '앞으로' : '뒤로';
  if (step === 0) return `수직선에서 ${startVal}부터 ${model.numB}만큼 ${direction} 뛰어 볼까요? 자리별로 나누어 뛰어요!`;
  const jump = jumps[step - 1];
  const text = `${jump.from}에서 ${Math.abs(jump.to - jump.from)}만큼 ${direction} 뛰면 ${jump.to}!`;
  const wordOp = op === 'add' ? '더하기' : '빼기';
  return step === jumps.length ? `${text} ${startVal} ${wordOp} ${eun(model.numB)} ${ieyo(endVal)}.` : text;
}

// 연산별 안내 글자와 결과 칸
function numberLineSummary(model, currentValue, jumpCount, isDone) {
  const { op, startVal, endVal } = model;
  if (op === 'div') {
    return {
      pill: `${model.divisor}씩 뒤로 뛰기 (${jumpCount} / ${model.quotient}번)`,
      equation: isDone
        ? `${startVal} - (${model.divisor} × ${model.quotient}) = <span style="color:#ef4444;">${model.remainder}</span>`
        : `${startVal} - (${model.divisor} × ${jumpCount}) = ${currentValue}`,
      leftLabel: '뛰어 덜어낸 횟수 (몫)',
      leftValue: `${jumpCount}번`,
      rightLabel: '0에 못 닿고 남은 수 (나머지)',
      rightValue: isDone ? model.remainder : '?'
    };
  }
  if (op === 'mul') {
    return {
      pill: `${model.numA}씩 앞으로 뛰기 (${jumpCount} / ${model.numB}번)`,
      equation: `${model.numA} × ${jumpCount} = ${currentValue}`,
      leftLabel: '앞으로 뛴 횟수',
      leftValue: `${jumpCount}번`,
      rightLabel: '도착한 수 (곱)',
      rightValue: isDone ? endVal : '?'
    };
  }
  const moved = Math.abs(currentValue - startVal);
  const symbol = op === 'add' ? '+' : '−';
  return {
    pill: `자리별로 ${op === 'add' ? '앞으로' : '뒤로'} 뛰기 (${jumpCount} / ${model.totalJumps}번)`,
    equation: `${startVal} ${symbol} ${moved} = ${currentValue}`,
    leftLabel: '지금까지 뛴 만큼',
    leftValue: `${symbol}${moved}`,
    rightLabel: op === 'add' ? '도착한 수 (합)' : '도착한 수 (차)',
    rightValue: isDone ? endVal : '?'
  };
}

function renderNumberLineView(container) {
  const model = window.OperatorStudioLines.buildOpNumberLineModel(currentOp, curNumA, curNumB);
  if (model.blocked) {
    renderSubtractionGuide(container);
    return;
  }

  const { jumps } = model;
  numberLineStep = Math.max(0, Math.min(jumps.length, numberLineStep));

  const isDone = numberLineStep === jumps.length;
  const currentJump = jumps[numberLineStep - 1];
  const currentValue = currentJump ? currentJump.to : model.startVal;
  const jumpCount = currentJump ? currentJump.index : 0;
  const summary = numberLineSummary(model, currentValue, jumpCount, isDone);
  const directionClass = model.op === 'add' || model.op === 'mul' ? 'nl-jump-arc--forward' : 'nl-jump-arc--back';

  // 줄인 수직선은 칸이 좁아 번호가 겹치므로 방금 뛴 점프의 번호만 적는다
  const arcsHtml = jumps.slice(0, numberLineStep).map((jump, i) => {
    const showCount = !model.compressed || i === numberLineStep - 1;
    const left = Math.min(jump.fromPos, jump.toPos);
    const width = Math.abs(jump.fromPos - jump.toPos);
    return `
      <div class="nl-jump-arc ${directionClass}" style="left:${left}%; width:${width}%;">
        ${showCount ? `<span class="nl-jump-count">${jump.label || jump.index}</span>` : ''}
      </div>
    `;
  }).join('');

  const hasLongLabels = String(Math.max(model.startVal, model.endVal)).length >= 4;
  const ticksHtml = model.ticks.map(tick => `
    <div class="nl-tick ${tick.value === currentValue ? 'nl-tick--current' : ''}" style="left:${tick.pos}%;"></div>
    <div class="nl-label ${tick.low ? 'nl-label--low' : ''} ${tick.value === currentValue ? 'nl-label--current' : ''} ${hasLongLabels ? 'nl-label--tiny' : ''}" style="left:${tick.pos}%;">${tick.value}</div>
  `).join('');

  const gapHtml = model.gap
    ? `<div class="nl-gap" style="left:${model.gap.pos}%;">⋯ ${model.gap.skipped}번 더</div>`
    : '';

  container.innerHTML = `
    <div class="numberline-wrap">
      <div class="block-step-nav">
        <span class="step-pill">📏 ${summary.pill}</span>
        <div class="nav-btn-group">
          <button class="step-control-btn" onclick="changeNumberLineStep(-1)" ${numberLineStep === 0 ? 'disabled' : ''}>◀ 이전</button>
          <button class="step-control-btn" onclick="changeNumberLineStep(1)" ${isDone ? 'disabled' : ''} style="background:#0284c7; color:#fff; border-color:#38bdf8;">다음 점프 ▶</button>
        </div>
      </div>

      <div class="nl-axis-container" role="img" aria-label="${model.startVal}에서 ${model.endVal}까지 뛰는 수직선">
        <div class="nl-track">
          <div class="nl-axis-line"></div>
          ${arcsHtml}
          ${ticksHtml}
          ${gapHtml}
        </div>
      </div>

      <div class="nl-result-card">
        <div style="font-family:'Jua'; font-size:1.5rem; color:#f59e0b; margin-bottom:16px;">${summary.equation}</div>
        <div style="display:flex; justify-content:space-around; align-items:center; flex-wrap:wrap; gap:12px;">
          <div style="background:rgba(2,132,199,0.15); border:1.5px solid #0284c7; border-radius:12px; padding:14px 20px;">
            <div style="font-size:0.9rem; color:#94a3b8;">${summary.leftLabel}</div>
            <div style="font-family:'Jua'; font-size:2rem; color:#38bdf8;">${summary.leftValue}</div>
          </div>
          <div style="background:rgba(239,68,68,0.15); border:1.5px solid #ef4444; border-radius:12px; padding:14px 20px;">
            <div style="font-size:0.9rem; color:#94a3b8;">${summary.rightLabel}</div>
            <div style="font-family:'Jua'; font-size:2rem; color:#ef4444;">${summary.rightValue}</div>
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
