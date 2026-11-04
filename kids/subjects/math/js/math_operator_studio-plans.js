// ========================================================
// 🧮 연산 멀티 스튜디오 - 사칙연산 풀이 계획 엔진 (Plans Engine)
// 단계마다 칠판 상태(board)를 함께 만들어 세로셈 화면과 풀이를 일치시킨다.
// ========================================================
const STUDIO_PLACE_NAMES = ['일', '십', '백', '천'];
const DIVIDEND_MAX = 999;
const DIVISOR_MAX = 99;

function clampStudioValue(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function clampDivisionValue(value, max) {
  return Math.min(Math.max(value, 1), max);
}

// 숫자를 소리 내어 읽을 때 받침 유무로 조사 판정 (2·4·5·9만 받침 없음)
function studioNumberJosa(n, withBatchim, withoutBatchim) {
  return [2, 4, 5, 9].includes(Math.abs(Number(n)) % 10) ? withoutBatchim : withBatchim;
}

// ➗ 1. 나눗셈 풀이 계획 엔진
function buildDivisionPlan(dividend, divisor) {
  const digits = String(dividend).split('').map(Number);
  const lastCol = digits.length - 1;
  const qTotal = Math.floor(dividend / divisor);
  const rTotal = dividend % divisor;
  const resultText = `전체 몫은 ${qTotal}, 나머지는 ${rTotal}${studioNumberJosa(rTotal, '이에요', '예요')}.`;
  const placeName = col => STUDIO_PLACE_NAMES[lastCol - col];
  const divisorGa = `${divisor}${studioNumberJosa(divisor, '이', '가')}`;

  const quotient = digits.map(() => '');
  const rows = [];
  const plan = [];

  const pushStep = (focus, val, title, desc, speech, marks = {}) => {
    const step = plan.length + 1;
    plan.push({
      step,
      title: `${step}단계: ${title}`,
      desc,
      speech,
      focus,
      val,
      board: {
        quotient: [...quotient],
        rows: rows.map(r => ({ ...r })),
        activeQuotientCol: marks.quotientCol ?? null,
        activeDividendCols: marks.dividendCols ?? [],
        activeRow: marks.row ?? null
      }
    });
  };

  let col = 0;
  let running = digits[0];

  if (running < divisor && lastCol > 0) {
    const first = running;
    while (running < divisor && col < lastCol) {
      col++;
      running = running * 10 + digits[col];
    }
    pushStep('look', running, '어디부터 나눌까요? 🔍',
      `<strong>${first}</strong>에는 ${divisorGa} 들어가지 않아요. <strong>${running}</strong>까지 함께 봐요!`,
      `${first}에는 ${divisorGa} 들어가지 않아요. 그래서 ${running}까지 함께 보고 나눌 거예요!`,
      { dividendCols: digits.map((_, i) => i).filter(i => i <= col) }
    );
  }

  for (;;) {
    const q = Math.floor(running / divisor);
    const product = q * divisor;
    const rem = running - product;
    const isLast = col === lastCol;
    quotient[col] = String(q);

    if (q === 0) {
      if (isLast) {
        if (rows.length === 0) rows.push({ kind: 'remainder', value: String(running), endCol: col, broughtCol: null });
        pushStep('remainder', running, '나머지 확인 🎉',
          `<strong>${running}</strong>에는 ${divisorGa} 들어가지 않아 몫에 0을 적어요. ${resultText}`,
          `${running}에는 ${divisorGa} 들어가지 않아서 몫에 0을 적어요. ${resultText} 참 잘했어요!`,
          { quotientCol: col, row: rows.length - 1 }
        );
        break;
      }
      pushStep('quotient', 0, `${placeName(col)}의 자리 몫은 0`,
        `<strong>${running}</strong>에는 ${divisorGa} 들어가지 않아요. 몫의 ${placeName(col)}의 자리에 <strong>0</strong>을 적어요.`,
        `${running}에는 ${divisorGa} 들어가지 않아요. 몫의 ${placeName(col)}의 자리에 0을 적어요!`,
        { quotientCol: col }
      );
    } else {
      pushStep('quotient', q, `${placeName(col)}의 자리 몫 구하기`,
        `<strong>${running}</strong>에 ${divisorGa} 몇 번 들어갈까요? <strong>${q}번</strong> 들어가요!`,
        `${running}에는 ${divisorGa} ${q}번 들어가요! 몫의 ${placeName(col)}의 자리에 ${q}${studioNumberJosa(q, '을', '를')} 적어요.`,
        { quotientCol: col }
      );

      rows.push({ kind: 'product', value: String(product), endCol: col, lineFromCol: col - String(running).length + 1 });
      pushStep('product', product, '곱해서 적기',
        `${divisor} × ${q} = <strong>${product}</strong>`,
        `${divisor} 곱하기 ${q}${studioNumberJosa(q, '은', '는')} ${product}! ${running} 밑에 ${product}${studioNumberJosa(product, '을', '를')} 적어요.`,
        { row: rows.length - 1 }
      );

      rows.push({ kind: 'remainder', value: String(rem), endCol: col, broughtCol: null });
      if (isLast) {
        pushStep('remainder', rem, '빼고 나머지 확인 🎉',
          `${running} - ${product} = <strong>${rem}</strong>. ${resultText}`,
          `${running}에서 ${product}${studioNumberJosa(product, '을', '를')} 빼면 ${rem}${studioNumberJosa(rem, '이', '가')} 남아요! ${resultText} 참 잘했어요!`,
          { row: rows.length - 1 }
        );
        break;
      }
      pushStep('subtract', rem, '빼기',
        `${running} - ${product} = <strong>${rem}</strong>`,
        `${running} 빼기 ${product}${studioNumberJosa(product, '은', '는')} ${rem}${studioNumberJosa(rem, '이에요', '예요')}.`,
        { row: rows.length - 1 }
      );
    }

    col++;
    const brought = digits[col];
    running = rem * 10 + brought;
    const current = rows[rows.length - 1];
    current.value = String(running);
    current.endCol = col;
    current.broughtCol = col;
    pushStep('bring_down', running, `${placeName(col)}의 자리 내려쓰기 ⬇️`,
      `${placeName(col)}의 자리 <strong>${brought}</strong>${studioNumberJosa(brought, '이', '가')} 내려와서 <strong>${running}</strong>${studioNumberJosa(running, '이', '가')} 되었어요!`,
      `${placeName(col)}의 자리 숫자 ${brought}${studioNumberJosa(brought, '이', '가')} 내려와서 ${running}${studioNumberJosa(running, '이', '가')} 되었어요! 이제 나눌 차례예요.`,
      { row: rows.length - 1, dividendCols: [col] }
    );
  }

  if (typeof divisionPlan !== 'undefined') divisionPlan = plan;
  if (typeof window !== 'undefined') window.divisionPlan = plan;
  return plan;
}

// ➕ 2. 덧셈 풀이 계획 엔진
function buildAdditionPlan(numA, numB) {
  const sumTotal = numA + numB;
  const strA = String(numA);
  const strB = String(numB);
  const strSum = String(sumTotal);
  const colCount = Math.max(strA.length, strB.length, strSum.length);

  const padRight = (str, len) => str.padStart(len, ' ').split('').map(c => (c === ' ' ? '' : c));
  const digitsA = padRight(strA, colCount);
  const digitsB = padRight(strB, colCount);
  const carries = Array(colCount).fill('');
  const result = Array(colCount).fill('');
  const plan = [];

  const pushStep = (title, desc, speech, marks = {}) => {
    const step = plan.length + 1;
    plan.push({
      step,
      title: `${step}단계: ${title}`,
      desc,
      speech,
      val: marks.val ?? null,
      board: {
        op: 'add',
        colCount,
        digitsA: [...digitsA],
        digitsB: [...digitsB],
        carries: [...carries],
        result: [...result],
        activeCol: marks.activeCol ?? null,
        activeCarryCol: marks.activeCarryCol ?? null
      }
    });
  };

  pushStep('자릿수 맞추어 쓰기', '일의 자리와 십의 자리를 줄 맞추어 세로로 썼어요.',
    `${numA} 더하기 ${numB}을 계산해 볼까요? 일의 자리부터 차례대로 더해요!`, { val: null });

  let carry = 0;
  for (let c = colCount - 1; c >= 0; c--) {
    const da = digitsA[c] === '' ? 0 : Number(digitsA[c]);
    const db = digitsB[c] === '' ? 0 : Number(digitsB[c]);
    const pName = STUDIO_PLACE_NAMES[colCount - 1 - c] || `${colCount - c}번째`;
    if (digitsA[c] === '' && digitsB[c] === '' && carry === 0) continue;

    const subSum = da + db + carry;
    const digitOut = subSum % 10;
    const nextCarry = Math.floor(subSum / 10);
    const prevCarryNotice = carry > 0 ? `올림수 1 + ` : '';
    const formulaStr = `${prevCarryNotice}${da} + ${db} = <strong>${subSum}</strong>`;
    const speechFormula = carry > 0 ? `올림수 1에 ${da}와 ${db}를 더하면 ${subSum}` : `${da} 더하기 ${db}는 ${subSum}`;

    if (nextCarry > 0) {
      pushStep(`${pName}의 자리 더하기`, `${pName}의 자리: ${formulaStr}`,
        `${pName}의 자리를 더해볼까요? ${speechFormula}이에요!`, { activeCol: c, val: subSum });

      result[c] = String(digitOut);
      if (c - 1 >= 0) carries[c - 1] = '1';
      pushStep(`${pName}의 자리 받아올림 ⬆️`,
        `${pName}의 자리에 <strong>${digitOut}</strong>을 적고, 10개를 모아 윗자리에 <strong>1</strong>을 올려요!`,
        `${subSum}에서 10개를 모아 윗자리에 1을 올리고, ${pName}의 자리에는 ${digitOut}을 적어요!`,
        { activeCol: c, activeCarryCol: c - 1 >= 0 ? c - 1 : null, val: digitOut });
    } else {
      result[c] = String(digitOut);
      pushStep(`${pName}의 자리 계산`, `${pName}의 자리: ${formulaStr}. <strong>${digitOut}</strong>을 적어요.`,
        `${pName}의 자리 ${speechFormula}이니까, 결과 칸에 ${digitOut}${studioNumberJosa(digitOut, '을', '를')} 적어요!`,
        { activeCol: c, val: digitOut });
    }
    carry = nextCarry;
  }

  pushStep('계산 완료 🎉', `${numA} + ${numB} = <strong>${sumTotal}</strong>`,
    `짜잔! ${numA} 더하기 ${numB}의 합은 ${sumTotal}이에요. 참 잘했어요!`, { val: sumTotal });

  return plan;
}

// ➖ 3. 뺄셈 풀이 계획 엔진
function buildSubtractionPlan(numA, numB) {
  const plan = [];
  if (numA < numB) {
    plan.push({
      step: 1,
      title: '초등 수학에서는 큰 수에서 작은 수를 빼요! 💡',
      desc: `지금은 <strong>${numA} − ${numB}</strong>라 뺄 수 없어요. <strong>${numB} − ${numA}</strong>처럼 큰 수를 앞에 적어보세요!`,
      speech: `초등 수학에서는 큰 수에서 작은 수를 빼요! 큰 수를 앞에 적어볼까요?`,
      val: 0,
      isNegative: true,
      board: {
        op: 'sub',
        colCount: String(numB).length,
        digitsA: String(numA).padStart(String(numB).length, ' ').split('').map(c => (c === ' ' ? '' : c)),
        digitsB: String(numB).split(''),
        borrows: Array(String(numB).length).fill(null),
        result: Array(String(numB).length).fill(''),
        activeCol: null
      }
    });
    return plan;
  }

  const diffTotal = numA - numB;
  const strA = String(numA);
  const strB = String(numB);
  const colCount = Math.max(strA.length, strB.length);
  const padRight = (str, len) => str.padStart(len, ' ').split('').map(c => (c === ' ' ? '' : c));
  const digitsA = padRight(strA, colCount);
  const digitsB = padRight(strB, colCount);
  const borrows = Array(colCount).fill(null);
  const result = Array(colCount).fill('');
  const currentA = digitsA.map(d => (d === '' ? 0 : Number(d)));

  const pushStep = (title, desc, speech, marks = {}) => {
    const step = plan.length + 1;
    plan.push({
      step,
      title: `${step}단계: ${title}`,
      desc,
      speech,
      val: marks.val ?? null,
      board: {
        op: 'sub',
        colCount,
        digitsA: [...digitsA],
        digitsB: [...digitsB],
        borrows: borrows.map(b => (b ? { ...b } : null)),
        result: [...result],
        activeCol: marks.activeCol ?? null,
        activeBorrowCol: marks.activeBorrowCol ?? null
      }
    });
  };

  pushStep('자릿수 맞추어 쓰기', '일의 자리와 십의 자리를 줄 맞추어 세로로 썼어요.',
    `${numA} 빼기 ${numB}을 계산해 볼까요? 일의 자리부터 차례대로 빼요!`, { val: null });

  for (let c = colCount - 1; c >= 0; c--) {
    const db = digitsB[c] === '' ? 0 : Number(digitsB[c]);
    const pName = STUDIO_PLACE_NAMES[colCount - 1 - c] || `${colCount - c}번째`;
    if (digitsA[c] === '' && digitsB[c] === '') continue;

    if (currentA[c] < db) {
      let borrowSource = c - 1;
      while (borrowSource >= 0 && currentA[borrowSource] === 0) borrowSource--;

      if (borrowSource >= 0) {
        if (borrowSource < c - 1) {
          const bSrcPName = STUDIO_PLACE_NAMES[colCount - 1 - borrowSource];
          currentA[borrowSource] -= 1;
          borrows[borrowSource] = { val: currentA[borrowSource], crossed: true, add10: false };

          pushStep(`${bSrcPName}의 자리에서 받아내림 준비 💥`,
            `십의 자리가 0이라서 <strong>${bSrcPName}의 자리</strong>에서 먼저 10을 가져와요!`,
            `십의 자리가 0이라서 ${bSrcPName}의 자리에서 먼저 10을 빌려와요!`,
            { activeCol: borrowSource, activeBorrowCol: borrowSource });

          for (let mid = borrowSource + 1; mid < c; mid++) {
            currentA[mid] = 9;
            borrows[mid] = { val: 9, crossed: true, add10: false };
          }
        } else {
          currentA[c - 1] -= 1;
          borrows[c - 1] = { val: currentA[c - 1], crossed: true, add10: false };
        }

        currentA[c] += 10;
        borrows[c] = { val: currentA[c], crossed: true, add10: true };
        const prevPName = STUDIO_PLACE_NAMES[colCount - c] || '윗';

        pushStep(`${pName}의 자리 받아내림 ⬇️`,
          `<strong>${currentA[c] - 10}</strong>에서 ${db}를 뺄 수 없어서 ${prevPName}의 자리에서 <strong>10</strong>을 빌려왔어요! (이제 <strong>${currentA[c]}</strong>)`,
          `${currentA[c] - 10}에서 ${db}${studioNumberJosa(db, '을', '를')} 뺄 수 없어서 ${prevPName}의 자리에서 10을 빌려왔어요! 이제 ${currentA[c]}에서 빼요!`,
          { activeCol: c, activeBorrowCol: c, val: currentA[c] });
      }
    }

    const subDiff = currentA[c] - db;
    result[c] = String(subDiff);
    pushStep(`${pName}의 자리 빼기`,
      `${pName}의 자리: ${currentA[c]} − ${db} = <strong>${subDiff}</strong>`,
      `${pName}의 자리 ${currentA[c]} 빼기 ${db}${studioNumberJosa(db, '은', '는')} ${subDiff}! 결과 칸에 ${subDiff}${studioNumberJosa(subDiff, '을', '를')} 적어요.`,
      { activeCol: c, val: subDiff });
  }

  for (let k = 0; k < colCount - 1; k++) {
    if (result[k] === '0') result[k] = '';
    else break;
  }

  pushStep('계산 완료 🎉', `${numA} − ${numB} = <strong>${diffTotal}</strong>`,
    `짜잔! ${numA} 빼기 ${numB}의 남은 수는 ${diffTotal}이에요. 참 잘했어요!`, { val: diffTotal });

  return plan;
}

// ✖️ 4. 곱셈 풀이 계획 엔진
function buildMultiplicationPlan(numA, numB) {
  const prodTotal = numA * numB;
  const isTwoDigit = numB >= 10;
  const strA = String(numA);
  const strB = String(numB);
  const strProd = String(prodTotal);
  const colCount = Math.max(strA.length + 1, strProd.length);

  const padRight = (str, len) => str.padStart(len, ' ').split('').map(c => (c === ' ' ? '' : c));
  const digitsA = padRight(strA, colCount);
  const digitsB = padRight(strB, colCount);
  const carries = Array(colCount).fill('');
  const rows = [];
  const plan = [];

  const pushStep = (title, desc, speech, marks = {}) => {
    const step = plan.length + 1;
    plan.push({
      step,
      title: `${step}단계: ${title}`,
      desc,
      speech,
      val: marks.val ?? null,
      board: {
        op: 'mul',
        product: prodTotal,
        isTwoDigit,
        colCount,
        digitsA: [...digitsA],
        digitsB: [...digitsB],
        carries: [...carries],
        rows: rows.map(r => ({ ...r })),
        activeCol: marks.activeCol ?? null,
        activeRow: marks.activeRow ?? null
      }
    });
  };

  pushStep('자릿수 맞추어 쓰기', `${numA} × ${numB}을 세로셈으로 자릿수를 맞추어 썼어요.`,
    `${numA} 곱하기 ${numB}을 세로셈으로 계산해 볼까요? 일의 자리부터 곱해요!`, { val: null });

  if (!isTwoDigit) {
    const resultRow = Array(colCount).fill('');
    let carry = 0;
    const aRev = strA.split('').reverse().map(Number);

    for (let i = 0; i < aRev.length; i++) {
      const pName = STUDIO_PLACE_NAMES[i] || `${i + 1}번째`;
      const col = colCount - 1 - i;
      const partMult = aRev[i] * numB + carry;
      const digitOut = partMult % 10;
      const nextCarry = Math.floor(partMult / 10);
      const carryNotice = carry > 0 ? `올림수 ${carry} + ` : '';
      const formulaStr = `${carryNotice}(${aRev[i]} × ${numB}) = <strong>${partMult}</strong>`;
      const speechFormula = carry > 0 ? `올림수 ${carry}에 ${aRev[i]} 곱하기 ${numB}를 더하면 ${partMult}` : `${aRev[i]} 곱하기 ${numB}는 ${partMult}`;

      resultRow[col] = String(digitOut);

      if (nextCarry > 0 && i < aRev.length - 1) {
        if (col - 1 >= 0) carries[col - 1] = String(nextCarry);
        pushStep(`${pName}의 자리 곱하고 받아올림 ⬆️`,
          `${formulaStr}. <strong>${digitOut}</strong>을 적고 <strong>${nextCarry}</strong>를 윗자리에 올려요!`,
          `${speechFormula}! ${digitOut}을 적고 ${nextCarry}${studioNumberJosa(nextCarry, '을', '를')} 윗자리에 올려요!`,
          { activeCol: col, activeRow: 0, val: digitOut });
      } else {
        if (nextCarry > 0 && i === aRev.length - 1) resultRow[col - 1] = String(nextCarry);
        pushStep(`${pName}의 자리 곱하기`, `${formulaStr}. 결과 칸에 적어요.`, `${speechFormula}이에요!`,
          { activeCol: col, activeRow: 0, val: digitOut });
      }
      carry = nextCarry;
    }
    rows.push({ kind: 'result', cells: [...resultRow] });
  } else {
    const onesB = numB % 10;
    const tensB = Math.floor(numB / 10);
    const p1 = numA * onesB;
    const p2 = numA * tensB;

    const row1Cells = padRight(String(p1), colCount);
    rows.push({ kind: 'part1', label: `${numA} × ${onesB}`, cells: [...row1Cells] });
    pushStep(`1단계: 일의 자리 곱하기 (${numA} × ${onesB})`, `${numA} × ${onesB} = <strong>${p1}</strong>`,
      `먼저 일의 자리 ${onesB}를 곱해요! ${numA} 곱하기 ${onesB}는 ${p1}이에요.`, { activeRow: 0, val: p1 });

    const strP2 = String(p2);
    const row2Cells = Array(colCount).fill('');
    for (let k = 0; k < strP2.length; k++) {
      row2Cells[colCount - 1 - strP2.length + k] = strP2[k];
    }
    rows.push({ kind: 'part2', label: `${numA} × ${tensB}0`, cells: [...row2Cells] });
    pushStep(`2단계: 십의 자리 곱하기 (${numA} × ${tensB}0)`,
      `${numA} × ${tensB}0 = <strong>${p2 * 10}</strong> (십의 자리이므로 한 칸 앞으로 써요)`,
      `다음은 십의 자리 ${tensB}를 곱해요! 십의 자리니까 한 칸 앞으로 당겨서 ${p2}${studioNumberJosa(p2, '을', '를')} 적어요.`,
      { activeRow: 1, val: p2 * 10 });

    const sumCells = padRight(String(prodTotal), colCount);
    rows.push({ kind: 'sum', label: `더하기`, cells: [...sumCells] });
    pushStep('3단계: 두 부분곱 더하기', `${p1} + ${p2 * 10} = <strong>${prodTotal}</strong>`,
      `이제 구한 두 수를 세로로 더해요! ${p1} 더하기 ${p2 * 10}은 ${prodTotal}이 됩니다!`, { activeRow: 2, val: prodTotal });
  }

  pushStep('계산 완료 🎉', `${numA} × ${numB} = <strong>${prodTotal}</strong>`,
    `짜잔! ${numA} 곱하기 ${numB}의 결과는 ${prodTotal}이에요. 완벽해요!`, { val: prodTotal });

  return plan;
}

// 📏 5. 수직선 모델 생성기 (기존 나눗셈 규격 완전 일치)
function buildNumberLineModel(dividend, divisor, maxJumps = 12) {
  const quotient = Math.floor(dividend / divisor);
  const remainder = dividend % divisor;
  const compressed = quotient > maxJumps;
  const edgeJumps = Math.floor((maxJumps - 2) / 2);

  const indexes = [];
  for (let i = 1; i <= quotient; i++) {
    if (!compressed || i <= edgeJumps || i > quotient - edgeJumps) indexes.push(i);
  }
  const jumps = indexes.map(index => ({
    index,
    from: dividend - (index - 1) * divisor,
    to: dividend - index * divisor
  }));

  const values = new Set([0, remainder, dividend]);
  jumps.forEach(jump => {
    values.add(jump.from);
    values.add(jump.to);
  });
  const sorted = [...values].sort((a, b) => a - b);

  let gap = null;
  let position;
  if (compressed) {
    const gapStart = dividend - (quotient - edgeJumps) * divisor;
    const gapIndex = sorted.indexOf(gapStart);
    const slotCount = sorted.length;
    position = value => {
      const index = sorted.indexOf(value);
      return ((index > gapIndex ? index + 1 : index) / slotCount) * 100;
    };
    gap = {
      skipped: quotient - edgeJumps * 2,
      pos: ((gapIndex + 1) / slotCount) * 100
    };
  } else {
    position = value => (value / dividend) * 100;
  }

  return {
    dividend,
    divisor,
    quotient,
    remainder,
    compressed,
    gap,
    jumps: jumps.map(jump => ({ ...jump, fromPos: position(jump.from), toPos: position(jump.to) })),
    ticks: sorted.map((value, i) => ({ value, pos: position(value), low: i % 2 === 0 }))
  };
}

function buildOpNumberLineModel(op, numA, numB, maxJumps = 10) {
  if (op === 'div') {
    const m = buildNumberLineModel(numA, numB, 12);
    return {
      ...m,
      op: 'div',
      startVal: numA,
      endVal: m.remainder,
      totalJumps: m.quotient
    };
  }

  if (op === 'add') {
    const sum = numA + numB;
    const tensB = Math.floor(numB / 10) * 10;
    const onesB = numB % 10;
    const jumps = [];
    if (tensB > 0) jumps.push({ index: 1, from: numA, to: numA + tensB, label: `+${tensB}` });
    if (onesB > 0) jumps.push({ index: jumps.length + 1, from: numA + tensB, to: sum, label: `+${onesB}` });
    if (jumps.length === 0) jumps.push({ index: 1, from: numA, to: sum, label: `+0` });
    return { op: 'add', startVal: numA, endVal: sum, totalJumps: jumps.length, compressed: false, jumps, minVal: numA, maxVal: sum,
      summary: `${numA}에서 ${numB}만큼 앞으로 뛰어 세어 ${sum}에 도착했어요!` };
  }

  if (op === 'sub') {
    if (numA < numB) return { op: 'sub', startVal: numA, endVal: 0, jumps: [], minVal: 0, maxVal: numB, summary: '큰 수에서 작은 수를 빼야 해요.' };
    const diff = numA - numB;
    const tensB = Math.floor(numB / 10) * 10;
    const onesB = numB % 10;
    const jumps = [];
    if (tensB > 0) jumps.push({ index: 1, from: numA, to: numA - tensB, label: `-${tensB}` });
    if (onesB > 0) jumps.push({ index: jumps.length + 1, from: numA - tensB, to: diff, label: `-${onesB}` });
    if (jumps.length === 0) jumps.push({ index: 1, from: numA, to: diff, label: `-0` });
    return { op: 'sub', startVal: numA, endVal: diff, totalJumps: jumps.length, compressed: false, jumps, minVal: diff, maxVal: numA,
      summary: `${numA}에서 ${numB}만큼 뒤로 뛰어 세어 ${diff}에 도착했어요!` };
  }

  if (op === 'mul') {
    const prod = numA * numB;
    const totalJumps = numB;
    const compressed = totalJumps > maxJumps;
    const edgeJumps = Math.floor((maxJumps - 2) / 2);
    const indexes = [];
    for (let i = 1; i <= totalJumps; i++) {
      if (!compressed || i <= edgeJumps || i > totalJumps - edgeJumps) indexes.push(i);
    }
    const jumps = indexes.map(index => ({
      index, from: (index - 1) * numA, to: index * numA, label: `+${numA}`
    }));
    return { op: 'mul', startVal: 0, endVal: prod, totalJumps, compressed, jumps, minVal: 0, maxVal: prod,
      summary: `${numA}씩 ${numB}번 앞으로 뛰어 세어 ${prod}에 도착했어요!` };
  }

  return null;
}

if (typeof window !== 'undefined') {
  window.STUDIO_PLACE_NAMES = STUDIO_PLACE_NAMES;
  window.clampStudioValue = clampStudioValue;
  window.clampDivisionValue = clampDivisionValue;
  window.DIVIDEND_MAX = DIVIDEND_MAX;
  window.DIVISOR_MAX = DIVISOR_MAX;
  window.studioNumberJosa = studioNumberJosa;
  window.buildDivisionPlan = buildDivisionPlan;
  window.buildAdditionPlan = buildAdditionPlan;
  window.buildSubtractionPlan = buildSubtractionPlan;
  window.buildMultiplicationPlan = buildMultiplicationPlan;
  window.buildNumberLineModel = buildNumberLineModel;
  window.buildOpNumberLineModel = buildOpNumberLineModel;
}
