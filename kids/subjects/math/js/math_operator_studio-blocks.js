// ========================================================
// 🧱 [탭 1] 십진 블록 뷰
// 덧셈·뺄셈·곱셈은 단계마다 블록 묶음 상태를 만들고(순수 계산) 그 상태만 그린다.
// 나눗셈 분배관은 기존 화면을 그대로 유지한다.
// ========================================================
(() => {
  'use strict';

  const { numberJosa } = window.OperatorStudioPlans;
  const ieyo = n => `${n}${numberJosa(n, '이에요', '예요')}`;

  const PLACE_ORDER = ['o', 't', 'h'];
  const PLACE_LABEL = { o: '낱개', t: '10개 막대', h: '100개 판', th: '1000개 블록' };
  const PLACE_EUL = { o: '낱개를', t: '10개 막대를', h: '100개 판을' };
  const PLACE_EUN = { o: '낱개는', t: '10개 막대는', h: '100개 판은' };
  const PLACE_RO = { t: '10개 막대로', h: '100개 판으로', th: '1000개 블록으로' };
  const UPPER_PLACE = { o: 't', t: 'h', h: 'th' };

  const emptyCounts = () => ({ th: 0, h: 0, t: 0, o: 0 });
  const toCounts = n => ({ th: 0, h: Math.floor(n / 100), t: Math.floor(n / 10) % 10, o: n % 10 });
  const digitOf = (n, place) => ({ o: n % 10, t: Math.floor(n / 10) % 10, h: Math.floor(n / 100) % 10 }[place]);

  function countsValue(counts) {
    return counts.th * 1000 + counts.h * 100 + counts.t * 10 + counts.o;
  }

  function makeRecorder() {
    const steps = [];
    return {
      steps,
      push(title, desc, speech, groups) {
        const step = steps.length + 1;
        steps.push({
          step,
          title: `${step}단계: ${title}`,
          desc,
          speech,
          groups: groups.map(group => ({ ...group, counts: { ...group.counts } }))
        });
      }
    };
  }

  // ➕ 같은 자리 블록을 모으고, 10개가 되면 윗자리 블록 1개로 바꾼다
  function buildAdditionBlockSteps(numA, numB) {
    const a = toCounts(numA);
    const b = toCounts(numB);
    const sum = emptyCounts();
    const { steps, push } = makeRecorder();
    const groups = active => [
      { role: 'a', label: `첫 번째 수에 남은 블록`, counts: a, active: false },
      { role: 'b', label: `두 번째 수에 남은 블록`, counts: b, active: false },
      { role: 'sum', label: '모은 블록', counts: sum, active }
    ];

    push(
      '두 수의 블록 준비하기',
      `<strong>${numA}</strong>${numberJosa(numA, '과', '와')} <strong>${numB}</strong>${numberJosa(numB, '을', '를')} 블록으로 놓았어요. 낱개부터 모아 볼까요?`,
      `${numA}${numberJosa(numA, '과', '와')} ${numB}${numberJosa(numB, '을', '를')} 블록으로 놓았어요. 낱개부터 모아 볼까요?`,
      groups(false)
    );

    for (const place of PLACE_ORDER) {
      const moved = a[place] + b[place];
      if (moved > 0) {
        sum[place] += moved;
        a[place] = 0;
        b[place] = 0;
        push(
          `${PLACE_LABEL[place]} 모으기`,
          `${PLACE_EUL[place]} 모두 모으니 <strong>${sum[place]}개</strong>가 되었어요!`,
          `${PLACE_EUL[place]} 모두 모으니 ${sum[place]}개가 되었어요!`,
          groups(true)
        );
      }
      if (sum[place] >= 10) {
        const upper = UPPER_PLACE[place];
        sum[place] -= 10;
        sum[upper] += 1;
        push(
          `펑! 💥 ${PLACE_RO[upper]} 변신 (받아올림)`,
          `${PLACE_LABEL[place]} 10개를 묶어 <strong>${PLACE_LABEL[upper]} 1개</strong>로 바꾸었어요! ${PLACE_EUN[place]} ${sum[place]}개가 남아요.`,
          `${PLACE_LABEL[place]} 10개를 묶어 ${PLACE_LABEL[upper]} 1개로 바꾸었어요! ${PLACE_EUN[place]} ${sum[place]}개가 남아요.`,
          groups(true)
        );
      }
    }

    const total = numA + numB;
    push(
      '최종 합 확인 🎉',
      `${numA} + ${numB} = <strong>${total}</strong>`,
      `짜잔! 모은 블록은 모두 ${ieyo(total)}. 참 잘했어요!`,
      [{ role: 'sum', label: `🎉 합 = ${total}`, counts: sum, active: true }]
    );
    return steps;
  }

  // ➖ 낱개부터 덜어낸다. 모자라면 윗자리 블록 1개를 10개로 쪼갠다.
  function buildSubtractionBlockSteps(numA, numB) {
    const left = toCounts(numA);
    const removed = emptyCounts();
    const { steps, push } = makeRecorder();
    const groups = active => [
      { role: 'left', label: '남은 블록', counts: left, active },
      { role: 'removed', label: `덜어낸 블록 (${countsValue(removed)})`, counts: removed, active: false }
    ];

    push(
      '원래 수 블록 준비하기',
      `<strong>${numA}</strong>${numberJosa(numA, '을', '를')} 블록으로 놓았어요. 여기서 <strong>${numB}</strong>만큼 덜어낼 거예요.`,
      `${numA}${numberJosa(numA, '을', '를')} 블록으로 놓았어요. 여기서 ${numB}만큼 덜어낼 거예요!`,
      groups(false)
    );

    for (const place of PLACE_ORDER) {
      const need = digitOf(numB, place);
      if (left[place] < need) {
        const upper = UPPER_PLACE[place];
        if (left[upper] === 0) {
          left.h -= 1;
          left.t += 10;
          push(
            '판 1개 펑! 💥 막대 10개로 쪼개기',
            `10개 막대가 없어서 <strong>100개 판 1개</strong>를 막대 10개로 쪼갰어요!`,
            '10개 막대가 없어서 100개 판 1개를 막대 10개로 쪼갰어요!',
            groups(true)
          );
        }
        left[upper] -= 1;
        left[place] += 10;
        push(
          `${PLACE_LABEL[upper]} 1개 펑! 💥 (받아내림)`,
          `${PLACE_LABEL[place]}가 모자라서 <strong>${PLACE_LABEL[upper]} 1개</strong>를 ${PLACE_LABEL[place]} 10개로 쪼갰어요! 이제 ${left[place]}개예요.`,
          `${PLACE_LABEL[place]}가 모자라서 ${PLACE_LABEL[upper]} 1개를 ${PLACE_LABEL[place]} 10개로 쪼갰어요! 이제 ${left[place]}개예요.`,
          groups(true)
        );
      }
      if (need > 0) {
        left[place] -= need;
        removed[place] += need;
        push(
          `${PLACE_LABEL[place]} ${need}개 덜어내기`,
          `${PLACE_LABEL[place]} ${need}개를 덜어내니 <strong>${left[place]}개</strong>가 남았어요!`,
          `${PLACE_LABEL[place]} ${need}개를 덜어내니 ${left[place]}개가 남았어요!`,
          groups(true)
        );
      }
    }

    const diff = numA - numB;
    push(
      '남은 수 확인 🎉',
      `${numA} − ${numB} = <strong>${diff}</strong>`,
      `짜잔! 남은 블록은 모두 ${ieyo(diff)}. 참 잘했어요!`,
      [
        { role: 'left', label: `🎉 남은 수 = ${diff}`, counts: left, active: true },
        { role: 'removed', label: `덜어낸 블록 (${numB})`, counts: removed, active: false }
      ]
    );
    return steps;
  }

  // ✖️ 같은 묶음을 놓고 자리별로 모은 뒤, 10개씩 윗자리로 묶는다
  const MAX_DRAWN_BUNDLES = 6;

  function buildMultiplicationBlockSteps(numA, numB) {
    const unit = toCounts(numA);
    const { steps, push } = makeRecorder();

    push(
      '한 묶음 확인하기',
      `한 묶음에 <strong>${numA}</strong>씩 들어 있어요.`,
      `한 묶음에 ${numA}씩 들어 있어요. 이걸 ${numB}묶음 놓을 거예요!`,
      [{ role: 'bundle', label: `한 묶음 (${numA})`, counts: unit, active: true, compact: true }]
    );

    const drawn = Math.min(numB, MAX_DRAWN_BUNDLES);
    const bundles = Array.from({ length: drawn }, (_, i) => ({
      role: 'bundle',
      label: `${i + 1}번째 묶음`,
      counts: unit,
      active: true,
      compact: true
    }));
    if (numB > drawn) {
      bundles.push({ role: 'more', label: `⋯ 같은 묶음 ${numB - drawn}개 더`, counts: emptyCounts(), active: false, compact: true });
    }
    push(
      `${numB}묶음 놓기`,
      `${numA}씩 <strong>${numB}묶음</strong>을 놓았어요.`,
      `${numA}씩 ${numB}묶음을 놓았어요!`,
      bundles
    );

    const total = {
      th: 0,
      h: unit.h * numB,
      t: unit.t * numB,
      o: unit.o * numB
    };
    const groups = () => [{ role: 'total', label: '모은 블록', counts: total, active: true }];
    push(
      '자리별로 모으기',
      `낱개 ${total.o}개, 10개 막대 ${total.t}개, 100개 판 ${total.h}개로 모았어요.`,
      `같은 블록끼리 모았어요. 낱개 ${total.o}개, 10개 막대 ${total.t}개, 100개 판 ${total.h}개예요!`,
      groups()
    );

    for (const place of PLACE_ORDER) {
      if (total[place] < 10) continue;
      const upper = UPPER_PLACE[place];
      const made = Math.floor(total[place] / 10);
      total[place] -= made * 10;
      total[upper] += made;
      push(
        `${PLACE_LABEL[place]} 10개씩 묶기`,
        `${PLACE_LABEL[place]} 10개씩 묶어 <strong>${PLACE_LABEL[upper]} ${made}개</strong>를 만들고, ${PLACE_EUN[place]} ${total[place]}개가 남아요.`,
        `${PLACE_LABEL[place]} 10개씩 묶어 ${PLACE_LABEL[upper]} ${made}개를 만들었어요!`,
        groups()
      );
    }

    const product = numA * numB;
    push(
      '최종 곱 확인 🎉',
      `${numA} × ${numB} = <strong>${product}</strong>`,
      `짜잔! 블록은 모두 ${ieyo(product)}. 참 잘했어요!`,
      [{ role: 'total', label: `🎉 곱 = ${product}`, counts: total, active: true }]
    );
    return steps;
  }

  window.OperatorStudioBlocks = {
    countsValue,
    buildAdditionBlockSteps,
    buildSubtractionBlockSteps,
    buildMultiplicationBlockSteps
  };
})();

// 곱셈은 블록이 아주 많아질 수 있어(999 × 99) 한 종류를 일정 개수까지만 그리고 나머지는 숫자로 적는다
const BLOCK_DRAW_LIMIT = 20;
const BLOCK_ICON_CLASS = { th: 'thousand-block', h: 'hundred-plate', t: 'ten-rod', o: 'unit-cube' };
const BLOCK_ICON_NAME = { th: '1000개 블록', h: '100개 판', t: '10개 막대', o: '낱개' };

let blockStepCount = 0;

function renderBlockIcons(counts) {
  return ['th', 'h', 't', 'o'].map(place => {
    const count = counts[place];
    if (count === 0) return '';
    const drawn = Math.min(count, BLOCK_DRAW_LIMIT);
    const more = count - drawn;
    return `<div class="block-place-row">${`<div class="${BLOCK_ICON_CLASS[place]}"></div>`.repeat(drawn)}${more > 0 ? `<span class="block-more">+${more}개</span>` : ''}</div>`;
  }).join('');
}

function renderBlockGroup(group) {
  const summary = ['th', 'h', 't', 'o']
    .filter(place => group.counts[place] > 0)
    .map(place => `${BLOCK_ICON_NAME[place]} ${group.counts[place]}개`)
    .join(' · ');
  const classes = ['block-group-box'];
  if (group.active) classes.push('block-group-box--active');
  if (group.role === 'removed') classes.push('block-group-box--removed');
  if (group.compact) classes.push('block-group-box--compact');
  return `
    <div class="${classes.join(' ')}">
      <div class="block-group-title"><span>${group.label}</span></div>
      <div class="block-summary">${summary || (group.role === 'more' ? '' : '블록 없음')}</div>
      <div class="blocks-row">${renderBlockIcons(group.counts)}</div>
    </div>
  `;
}

function renderBlockStepNav(label, stepNow, stepTotal) {
  return `
    <div class="block-step-nav">
      <span class="step-pill">🧱 ${label} (${stepNow} / ${stepTotal}단계)</span>
      <div class="nav-btn-group">
        <button class="step-control-btn" onclick="changeBlockStep(-1)" ${stepNow === 1 ? 'disabled' : ''}>◀ 이전</button>
        <button class="step-control-btn" onclick="changeBlockStep(1)" ${stepNow === stepTotal ? 'disabled' : ''} style="background:#0284c7; color:#fff; border-color:#38bdf8;">다음 단계 ▶</button>
      </div>
    </div>
  `;
}

function renderBlockModelView(container, label, steps) {
  blockStepCount = steps.length;
  blockCurrentStep = Math.min(blockCurrentStep, steps.length);
  const step = steps[blockCurrentStep - 1];
  // 모두 옮겨 비어 버린 상자는 자리만 차지하므로 그리지 않는다
  const { countsValue } = window.OperatorStudioBlocks;
  const groups = step.groups.filter(group => !['a', 'b', 'removed'].includes(group.role) || countsValue(group.counts) > 0);
  container.innerHTML = `
    <div class="block-stage-wrap">
      ${renderBlockStepNav(label, blockCurrentStep, steps.length)}
      <div style="background:rgba(2,132,199,0.15); border:1.5px solid #0284c7; border-radius:14px; padding:14px;">
        <h3 style="margin:0 0 6px; font-family:'Jua'; color:#38bdf8; font-size:1.25rem;">${step.title}</h3>
        <p style="margin:0; font-size:1.05rem; line-height:1.5;">${step.desc}</p>
      </div>
      <div class="block-display-area ${groups[0].compact ? 'block-display-area--compact' : ''}">
        ${groups.map(renderBlockGroup).join('')}
      </div>
    </div>
  `;
  studioSpeak(step.speech);
}

function renderBlocksView(container) {
  const blocks = window.OperatorStudioBlocks;
  if (currentOp === 'div') {
    renderDivisionBlocksView(container);
  } else if (currentOp === 'add') {
    renderBlockModelView(container, '자리별 블록 모으기', blocks.buildAdditionBlockSteps(curNumA, curNumB));
  } else if (currentOp === 'mul') {
    renderBlockModelView(container, '묶음 블록 모델', blocks.buildMultiplicationBlockSteps(curNumA, curNumB));
  } else if (curNumA < curNumB) {
    renderSubtractionGuide(container);
  } else {
    renderBlockModelView(container, '블록 덜어내기', blocks.buildSubtractionBlockSteps(curNumA, curNumB));
  }
}

function changeBlockStep(delta) {
  hasUserStarted = true;
  blockCurrentStep = Math.max(1, Math.min(blockStepCount, blockCurrentStep + delta));
  renderBlocksView(document.getElementById('studioViewport'));
}

// ➗ 나눗셈 십진 블록 분배관
const DIVISION_BLOCK_STEPS = 5;

function renderDivisionBlocksView(container) {
  blockStepCount = DIVISION_BLOCK_STEPS;
  const tens = Math.floor(curNumA / 10);
  const ones = curNumA % 10;
  const divisor = curNumB;
  const quotient = Math.floor(curNumA / divisor);
  const remainder = curNumA % divisor;

  let stepTitle = "";
  let stepDesc = "";
  let speechText = "";

  if (blockCurrentStep === 1) {
    stepTitle = "1단계: 원래 수 블록으로 만들기";
    stepDesc = `<strong>${curNumA}</strong>${numberJosa(curNumA, '은', '는')} <strong>10개짜리 막대 ${tens}개</strong>와 <strong>낱개 큐브 ${ones}개</strong>예요.`;
    speechText = `${curNumA}${numberJosa(curNumA, '은', '는')} 10개짜리 막대 ${tens}개와 낱개 큐브 ${ones}개로 이루어져 있어요. 이걸 ${divisor}명에게 똑같이 나누어 줄 거예요!`;
  } else if (blockCurrentStep === 2) {
    const tensPerPerson = Math.floor(tens / divisor);
    const leftTens = tens % divisor;
    stepTitle = "2단계: 10개짜리 막대 먼저 똑같이 나누기";
    stepDesc = `10개짜리 막대 ${tens}개를 ${divisor}명에게 나누어주면, <strong>한 사람당 ${tensPerPerson}개씩</strong> 받고 <strong>${leftTens}개</strong>가 남아요!`;
    speechText = `먼저 10개짜리 막대를 나누어줄게요. 한 사람당 ${tensPerPerson}개씩 받고, 10개짜리 ${leftTens}개가 남았어요!`;
  } else if (blockCurrentStep === 3) {
    const leftTens = tens % divisor;
    const brokenOnes = (leftTens * 10) + ones;
    stepTitle = "3단계: 남은 10개 막대 펑! 💥 낱개로 쪼개기";
    stepDesc = `남은 10개짜리 막대 ${leftTens}개를 낱개 10개로 쪼개서 기존 낱개 ${ones}개와 합치면 <strong>총 ${brokenOnes}개</strong>가 돼요!`;
    speechText = `남은 10개짜리 막대를 낱개로 쪼개볼까요? 펑! 낱개 10개로 변신해서 기존 낱개와 합치니 총 ${brokenOnes}개가 되었어요!`;
  } else if (blockCurrentStep === 4) {
    const tensPerPerson = Math.floor(tens / divisor);
    const onesPerPerson = Math.floor(((tens % divisor) * 10 + ones) / divisor);
    stepTitle = "4단계: 낱개 큐브 똑같이 나누어 담기";
    stepDesc = `낱개를 ${divisor}명에게 나누어주면 <strong>한 사람당 낱개 ${onesPerPerson}개씩</strong> 더 받아요!`;
    speechText = `이제 낱개들을 나누어 담아요. 한 사람당 낱개 ${onesPerPerson}개씩 더 받았어요!`;
  } else {
    const tensPerPerson = Math.floor(tens / divisor);
    const onesPerPerson = Math.floor(((tens % divisor) * 10 + ones) / divisor);
    stepTitle = "5단계: 최종 몫과 나머지 확인 🎉";
    stepDesc = `한 사람당 <strong>10개 막대 ${tensPerPerson}개 + 낱개 ${onesPerPerson}개 = 총 ${quotient}개(몫)</strong>! 남은 낱개 = <strong>${remainder}개(나머지)</strong>!`;
    speechText = `짜잔! 한 사람당 총 ${quotient}개씩 받았으니 몫은 ${quotient}${numberJosa(quotient, '이고', '고')}, 바구니에 못 들어간 남은 낱개 ${remainder}개가 바로 나머지예요!`;
  }

  // 10개짜리 막대 HTML 생성
  let tensHtml = '';
  for (let i = 0; i < tens; i++) {
    tensHtml += `<div class="ten-rod"></div>`;
  }

  // 낱개 큐브 HTML 생성
  let onesHtml = '';
  for (let i = 0; i < ones; i++) {
    onesHtml += `<div class="unit-cube"></div>`;
  }

  // 바구니 생성
  let basketsHtml = '';
  const tensPerPerson = (blockCurrentStep >= 2) ? Math.floor(tens / divisor) : 0;
  const onesPerPerson = (blockCurrentStep >= 4) ? Math.floor(((tens % divisor) * 10 + ones) / divisor) : 0;

  for (let b = 1; b <= divisor; b++) {
    let bTens = '';
    for (let t = 0; t < tensPerPerson; t++) bTens += `<div class="ten-rod" style="height:70px;"></div>`;
    let bOnes = '';
    for (let o = 0; o < onesPerPerson; o++) bOnes += `<div class="unit-cube"></div>`;

    basketsHtml += `
      <div class="person-basket">
        <div class="basket-label">🧺 ${b}번 친구</div>
        <div style="display:flex; gap:4px; justify-content:center; align-items:center; flex-wrap:wrap; min-height:80px;">
          ${bTens} ${bOnes}
        </div>
      </div>
    `;
  }

  container.innerHTML = `
    <div class="block-stage-wrap">
      <div class="block-step-nav">
        <span class="step-pill">🧱 블록 쪼개기 탐험 (${blockCurrentStep} / ${DIVISION_BLOCK_STEPS}단계)</span>
        <div class="nav-btn-group">
          <button class="step-control-btn" onclick="changeBlockStep(-1)" ${blockCurrentStep === 1 ? 'disabled' : ''}>◀ 이전</button>
          <button class="step-control-btn" onclick="changeBlockStep(1)" ${blockCurrentStep === DIVISION_BLOCK_STEPS ? 'disabled' : ''} style="background:#0284c7; color:#fff; border-color:#38bdf8;">다음 단계 ▶</button>
        </div>
      </div>

      <div style="background:rgba(2,132,199,0.15); border:1.5px solid #0284c7; border-radius:14px; padding:14px;">
        <h3 style="margin:0 0 6px; font-family:'Jua'; color:#38bdf8; font-size:1.25rem;">${stepTitle}</h3>
        <p style="margin:0; font-size:1.05rem; line-height:1.5;">${stepDesc}</p>
      </div>

      <div class="block-display-area">
        <div class="block-group-box">
          <div class="block-group-title">
            <span>📦 원래 전체 수 (${curNumA})</span>
            <span style="font-size:0.85rem; color:#94a3b8;">10개짜리 ${tens}개 / 낱개 ${ones}개</span>
          </div>
          <div class="blocks-row">
            ${tensHtml}
            <div style="width:12px;"></div>
            ${onesHtml}
          </div>
        </div>

        <div class="block-group-box">
          <div class="block-group-title">
            <span>👥 ${divisor}명에게 똑같이 나누어주기</span>
            <span style="font-size:0.85rem; color:#4ade80;">한 사람당 몫: ${quotient}</span>
          </div>
          <div class="basket-grid">
            ${basketsHtml}
          </div>
        </div>
      </div>
    </div>
  `;

  studioSpeak(speechText);
}
