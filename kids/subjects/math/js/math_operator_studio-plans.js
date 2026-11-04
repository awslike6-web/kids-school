// ========================================================
// 🧮 연산 멀티 스튜디오 - 사칙연산 풀이 계획 엔진
// DOM을 쓰지 않는 순수 계산이다. 단계마다 칠판 상태(board)를 함께 만들고,
// 화면은 board와 수직선 모델만 그려 풀이와 화면이 어긋나지 않게 한다.
// ========================================================
(() => {
  'use strict';

  const PLACE_NAMES = ['일', '십', '백', '천', '만'];
  const DIVIDEND_MAX = 999;
  const DIVISOR_MAX = 99;

  function clampStudioValue(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function clampDivisionValue(value, max) {
    return clampStudioValue(value, 1, max);
  }

  // 숫자를 소리 내어 읽을 때 받침이 있는지로 조사를 고른다 (2·4·5·9만 받침 없음)
  function numberJosa(n, withBatchim, withoutBatchim) {
    return [2, 4, 5, 9].includes(Number(n) % 10) ? withoutBatchim : withBatchim;
  }
  const eul = n => `${n}${numberJosa(n, '을', '를')}`;
  const eun = n => `${n}${numberJosa(n, '은', '는')}`;
  const iga = n => `${n}${numberJosa(n, '이', '가')}`;
  const wa = n => `${n}${numberJosa(n, '과', '와')}`;
  const ieyo = n => `${n}${numberJosa(n, '이에요', '예요')}`;
  const inikka = n => `${n}${numberJosa(n, '이니까', '니까')}`;

  function divisionResultText(quotient, remainder) {
    return `전체 몫은 ${quotient}, 나머지는 ${ieyo(remainder)}.`;
  }

  const padCells = (text, length) => text.padStart(length, ' ').split('').map(c => (c === ' ' ? '' : c));

  // ➗ 나눗셈: 자릿수와 상관없이 세로셈을 한 자리씩 진행한다
  function buildDivisionPlan(dividend, divisor) {
    const digits = String(dividend).split('').map(Number);
    const lastCol = digits.length - 1;
    const resultText = divisionResultText(Math.floor(dividend / divisor), dividend % divisor);
    const placeName = col => PLACE_NAMES[lastCol - col];
    const divisorGa = iga(divisor);

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
          rows: rows.map(row => ({ ...row })),
          activeQuotientCol: marks.quotientCol ?? null,
          activeDividendCols: marks.dividendCols ?? [],
          activeRow: marks.row ?? null
        }
      });
    };

    let col = 0;
    let running = digits[0];

    // 맨 앞자리에 나누는 수가 들어가지 않으면 옆자리까지 함께 본다 (예: 56 ÷ 8은 5가 아니라 56부터)
    if (running < divisor && lastCol > 0) {
      const first = running;
      while (running < divisor && col < lastCol) {
        col++;
        running = running * 10 + digits[col];
      }
      pushStep(
        'look',
        running,
        '어디부터 나눌까요? 🔍',
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
          // 더 내려올 수가 없으므로 지금 수가 그대로 나머지가 된다
          if (rows.length === 0) {
            rows.push({ kind: 'remainder', value: String(running), endCol: col, broughtCol: null });
          }
          pushStep(
            'remainder',
            running,
            '나머지 확인 🎉',
            `<strong>${running}</strong>에는 ${divisorGa} 들어가지 않아 몫에 0을 적어요. ${resultText}`,
            `${running}에는 ${divisorGa} 들어가지 않아서 몫에 0을 적어요. ${resultText} 참 잘했어요!`,
            { quotientCol: col, row: rows.length - 1 }
          );
          break;
        }
        pushStep(
          'quotient',
          0,
          `${placeName(col)}의 자리 몫은 0`,
          `<strong>${running}</strong>에는 ${divisorGa} 들어가지 않아요. 몫의 ${placeName(col)}의 자리에 <strong>0</strong>을 적어요.`,
          `${running}에는 ${divisorGa} 들어가지 않아요. 몫의 ${placeName(col)}의 자리에 0을 적어요!`,
          { quotientCol: col }
        );
      } else {
        pushStep(
          'quotient',
          q,
          `${placeName(col)}의 자리 몫 구하기`,
          `<strong>${running}</strong>에 ${divisorGa} 몇 번 들어갈까요? <strong>${q}번</strong> 들어가요!`,
          `${running}에는 ${divisorGa} ${q}번 들어가요! 몫의 ${placeName(col)}의 자리에 ${eul(q)} 적어요.`,
          { quotientCol: col }
        );

        rows.push({
          kind: 'product',
          value: String(product),
          endCol: col,
          lineFromCol: col - String(running).length + 1
        });
        pushStep(
          'product',
          product,
          '곱해서 적기',
          `${divisor} × ${q} = <strong>${product}</strong>`,
          `${divisor} 곱하기 ${eun(q)} ${product}! ${running} 밑에 ${eul(product)} 적어요.`,
          { row: rows.length - 1 }
        );

        rows.push({ kind: 'remainder', value: String(rem), endCol: col, broughtCol: null });
        if (isLast) {
          pushStep(
            'remainder',
            rem,
            '빼고 나머지 확인 🎉',
            `${running} - ${product} = <strong>${rem}</strong>. ${resultText}`,
            `${running}에서 ${eul(product)} 빼면 ${iga(rem)} 남아요! ${resultText} 참 잘했어요!`,
            { row: rows.length - 1 }
          );
          break;
        }
        pushStep(
          'subtract',
          rem,
          '빼기',
          `${running} - ${product} = <strong>${rem}</strong>`,
          `${running} 빼기 ${eun(product)} ${ieyo(rem)}.`,
          { row: rows.length - 1 }
        );
      }

      // 다음 자리 내려쓰기: 앞이 0이면 "08"이 아니라 "8"로 적는다
      col++;
      const brought = digits[col];
      running = rem * 10 + brought;
      const current = rows[rows.length - 1];
      current.value = String(running);
      current.endCol = col;
      current.broughtCol = col;
      pushStep(
        'bring_down',
        running,
        `${placeName(col)}의 자리 내려쓰기 ⬇️`,
        `${placeName(col)}의 자리 <strong>${brought}</strong>${numberJosa(brought, '이', '가')} 스르륵 내려와서 <strong>${running}</strong>${numberJosa(running, '이', '가')} 되었어요!`,
        `${placeName(col)}의 자리 숫자 ${iga(brought)} 스르륵 내려와서 ${iga(running)} 되었어요! 이제 ${eul(running)} 나눌 차례예요.`,
        { row: rows.length - 1, dividendCols: [col] }
      );
    }

    return plan;
  }

  // ➕ 덧셈: 일의 자리부터 더하고 받아올림을 표시한다
  function buildAdditionPlan(numA, numB) {
    const sumTotal = numA + numB;
    const colCount = Math.max(String(numA).length, String(numB).length, String(sumTotal).length);
    const digitsA = padCells(String(numA), colCount);
    const digitsB = padCells(String(numB), colCount);
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

    pushStep(
      '자릿수 맞추어 쓰기',
      '같은 자리끼리 줄을 맞추어 세로로 썼어요.',
      `${numA} 더하기 ${eul(numB)} 계산해 볼까요? 일의 자리부터 차례대로 더해요!`
    );

    let carry = 0;
    for (let c = colCount - 1; c >= 0; c--) {
      const place = PLACE_NAMES[colCount - 1 - c];

      // 두 수에는 없는 윗자리: 올려 준 1만 그대로 적는다
      if (digitsA[c] === '' && digitsB[c] === '') {
        result[c] = String(carry);
        pushStep(
          `${place}의 자리 쓰기`,
          `올려 준 <strong>1</strong>을 ${place}의 자리에 그대로 적어요.`,
          `올려 준 1을 ${place}의 자리에 그대로 적어요!`,
          { activeCol: c, val: carry }
        );
        carry = 0;
        continue;
      }

      const da = Number(digitsA[c] || 0);
      const db = Number(digitsB[c] || 0);
      const subSum = da + db + carry;
      const digitOut = subSum % 10;
      const nextCarry = Math.floor(subSum / 10);
      const formula = `${carry > 0 ? '올림수 1 + ' : ''}${da} + ${db} = <strong>${subSum}</strong>`;
      const spoken = carry > 0
        ? `올림수 1에 ${wa(da)} ${eul(db)} 더하면`
        : `${da} 더하기 ${eun(db)}`;

      if (nextCarry > 0) {
        pushStep(
          `${place}의 자리 더하기`,
          `${place}의 자리: ${formula}`,
          `${place}의 자리를 더해 볼까요? ${spoken} ${ieyo(subSum)}!`,
          { activeCol: c, val: subSum }
        );
        result[c] = String(digitOut);
        if (c >= 1) carries[c - 1] = '1';
        pushStep(
          `${place}의 자리 받아올림 ⬆️`,
          `${place}의 자리에 <strong>${digitOut}</strong>${numberJosa(digitOut, '을', '를')} 적고, 10을 모아 윗자리에 <strong>1</strong>을 올려요!`,
          `${subSum}에서 10을 모아 윗자리에 1을 올리고, ${place}의 자리에는 ${eul(digitOut)} 적어요!`,
          { activeCol: c, activeCarryCol: c >= 1 ? c - 1 : null, val: digitOut }
        );
      } else {
        result[c] = String(digitOut);
        pushStep(
          `${place}의 자리 더하기`,
          `${place}의 자리: ${formula}. <strong>${digitOut}</strong>${numberJosa(digitOut, '을', '를')} 적어요.`,
          `${place}의 자리 ${spoken} ${inikka(subSum)}, 결과 칸에 ${eul(digitOut)} 적어요!`,
          { activeCol: c, val: digitOut }
        );
      }
      carry = nextCarry;
    }

    pushStep(
      '계산 완료 🎉',
      `${numA} + ${numB} = <strong>${sumTotal}</strong>`,
      `짜잔! ${numA} 더하기 ${numB}의 합은 ${ieyo(sumTotal)}. 참 잘했어요!`,
      { val: sumTotal }
    );

    return plan;
  }

  // ➖ 뺄셈: 칸 위에는 실제로 빼는 값을 보여 준다 (142 − 68의 십의 자리는 14가 아니라 13)
  function buildSubtractionPlan(numA, numB) {
    if (numA < numB) {
      return [{
        step: 1,
        title: '큰 수에서 작은 수를 빼요! 💡',
        desc: `지금은 <strong>${numA} − ${numB}</strong>라서 뺄 수 없어요. <strong>${numB} − ${numA}</strong>처럼 큰 수를 앞에 적어 보세요!`,
        speech: '큰 수에서 작은 수를 빼요! 큰 수를 앞에 적어 볼까요?',
        val: null,
        isNegative: true,
        board: null
      }];
    }

    const diffTotal = numA - numB;
    const colCount = String(numA).length;
    const digitsA = padCells(String(numA), colCount);
    const digitsB = padCells(String(numB), colCount);
    const borrows = Array(colCount).fill(null);
    const result = Array(colCount).fill('');
    const currentA = digitsA.map(Number);
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

    pushStep(
      '자릿수 맞추어 쓰기',
      '같은 자리끼리 줄을 맞추어 세로로 썼어요.',
      `${numA} 빼기 ${eul(numB)} 계산해 볼까요? 일의 자리부터 차례대로 빼요!`
    );

    for (let c = colCount - 1; c >= 0; c--) {
      const db = Number(digitsB[c] || 0);
      const place = PLACE_NAMES[colCount - 1 - c];

      // 받아내림으로 맨 앞자리가 0이 되고 뺄 수도 없으면 적을 것이 없다
      const isLeadingEmpty = digitsB[c] === '' && currentA.slice(0, c + 1).every(value => value === 0);
      if (isLeadingEmpty) continue;

      if (currentA[c] < db) {
        let source = c - 1;
        while (currentA[source] === 0) source--;

        if (source < c - 1) {
          const sourcePlace = PLACE_NAMES[colCount - 1 - source];
          currentA[source] -= 1;
          borrows[source] = { val: currentA[source], crossed: true, add10: false };
          pushStep(
            `${sourcePlace}의 자리에서 받아내림 준비 💥`,
            `${PLACE_NAMES[colCount - 1 - (source + 1)]}의 자리가 0이라서 <strong>${sourcePlace}의 자리</strong>에서 먼저 10을 가져와요!`,
            `${PLACE_NAMES[colCount - 1 - (source + 1)]}의 자리가 0이라서 ${sourcePlace}의 자리에서 먼저 10을 가져와요!`,
            { activeCol: source, activeBorrowCol: source }
          );
          for (let mid = source + 1; mid < c; mid++) {
            currentA[mid] = 9;
            borrows[mid] = { val: 9, crossed: true, add10: false };
          }
        } else {
          currentA[source] -= 1;
          borrows[source] = { val: currentA[source], crossed: true, add10: false };
        }

        const before = currentA[c];
        currentA[c] += 10;
        borrows[c] = { val: currentA[c], crossed: true, add10: true };
        const upperPlace = PLACE_NAMES[colCount - c];
        pushStep(
          `${place}의 자리 받아내림 ⬇️`,
          `<strong>${before}</strong>에서 ${eul(db)} 뺄 수 없어서 ${upperPlace}의 자리에서 <strong>10</strong>을 받아내렸어요! (이제 <strong>${currentA[c]}</strong>)`,
          `${before}에서 ${eul(db)} 뺄 수 없어서 ${upperPlace}의 자리에서 10을 받아내렸어요! 이제 ${currentA[c]}에서 빼요!`,
          { activeCol: c, activeBorrowCol: c, val: currentA[c] }
        );
      }

      const subDiff = currentA[c] - db;
      result[c] = String(subDiff);
      pushStep(
        `${place}의 자리 빼기`,
        `${place}의 자리: ${currentA[c]} − ${db} = <strong>${subDiff}</strong>`,
        `${place}의 자리 ${currentA[c]} 빼기 ${eun(db)} ${subDiff}! 결과 칸에 ${eul(subDiff)} 적어요.`,
        { activeCol: c, val: subDiff }
      );
    }

    // 답의 맨 앞 0은 적지 않는다 (65를 065로 쓰지 않음, 답이 0이면 0 하나만)
    for (let k = 0; k < colCount - 1; k++) {
      if (result[k] !== '' && result[k] !== '0') break;
      result[k] = '';
    }

    pushStep(
      '계산 완료 🎉',
      `${numA} − ${numB} = <strong>${diffTotal}</strong>`,
      `짜잔! ${numA} 빼기 ${numB}의 답은 ${ieyo(diffTotal)}. 참 잘했어요!`,
      { val: diffTotal }
    );

    return plan;
  }

  // ✖️ 곱셈: 곱하는 수가 한 자리면 자리별 올림, 두 자리면 부분곱 두 줄과 합
  function buildMultiplicationPlan(numA, numB) {
    const prodTotal = numA * numB;
    const isTwoDigit = numB >= 10;
    const strA = String(numA);
    const colCount = Math.max(strA.length + 1, String(prodTotal).length);
    const digitsA = padCells(strA, colCount);
    const digitsB = padCells(String(numB), colCount);
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
          rows: rows.map(row => ({ ...row, cells: [...row.cells] })),
          activeCol: marks.activeCol ?? null,
          activeRow: marks.activeRow ?? null
        }
      });
    };

    pushStep(
      '자릿수 맞추어 쓰기',
      `${numA} × ${numB}${numberJosa(numB, '을', '를')} 세로로 줄을 맞추어 썼어요.`,
      `${numA} 곱하기 ${eul(numB)} 세로셈으로 계산해 볼까요? 일의 자리부터 곱해요!`
    );

    if (!isTwoDigit) {
      const resultRow = { kind: 'result', cells: Array(colCount).fill('') };
      rows.push(resultRow);
      const digits = strA.split('').reverse().map(Number);
      let carry = 0;

      digits.forEach((digit, i) => {
        const place = PLACE_NAMES[i];
        const col = colCount - 1 - i;
        const isTopDigit = i === digits.length - 1;
        const partial = digit * numB + carry;
        const digitOut = partial % 10;
        const nextCarry = Math.floor(partial / 10);
        const formula = `${carry > 0 ? `올림수 ${carry} + ` : ''}${digit} × ${numB} = <strong>${partial}</strong>`;
        const spoken = carry > 0
          ? `올림수 ${carry}에 ${digit} 곱하기 ${eul(numB)} 더하면 ${partial}`
          : `${digit} 곱하기 ${eun(numB)} ${partial}`;

        resultRow.cells[col] = String(digitOut);
        if (nextCarry > 0 && !isTopDigit) {
          carries[col - 1] = String(nextCarry);
          pushStep(
            `${place}의 자리 곱하고 받아올림 ⬆️`,
            `${formula}. <strong>${digitOut}</strong>${numberJosa(digitOut, '을', '를')} 적고 <strong>${nextCarry}</strong>${numberJosa(nextCarry, '을', '를')} 윗자리에 올려요!`,
            `${spoken}! ${eul(digitOut)} 적고 ${eul(nextCarry)} 윗자리에 올려요!`,
            { activeCol: col, activeRow: 0, val: digitOut }
          );
        } else {
          if (nextCarry > 0) resultRow.cells[col - 1] = String(nextCarry);
          const written = partial;
          pushStep(
            `${place}의 자리 곱하기`,
            `${formula}. <strong>${written}</strong>${numberJosa(written, '을', '를')} 결과 칸에 적어요.`,
            `${spoken}! 결과 칸에 ${eul(written)} 적어요.`,
            { activeCol: col, activeRow: 0, val: written }
          );
        }
        carry = nextCarry;
      });
    } else {
      const onesB = numB % 10;
      const tensB = Math.floor(numB / 10);
      const p1 = numA * onesB;
      const p2 = numA * tensB;

      rows.push({ kind: 'part1', cells: padCells(String(p1), colCount) });
      pushStep(
        `일의 자리 곱하기 (${numA} × ${onesB})`,
        `${numA} × ${onesB} = <strong>${p1}</strong>`,
        `먼저 일의 자리 ${eul(onesB)} 곱해요! ${numA} 곱하기 ${eun(onesB)} ${ieyo(p1)}.`,
        { activeRow: 0, val: p1 }
      );

      // 십의 자리 부분곱은 일의 자리를 비우고 한 칸 왼쪽에 쓴다
      const shifted = padCells(String(p2), colCount - 1);
      rows.push({ kind: 'part2', cells: [...shifted, ''] });
      pushStep(
        `십의 자리 곱하기 (${numA} × ${tensB}0)`,
        `${numA} × ${tensB}0 = <strong>${p2 * 10}</strong> (십의 자리이므로 한 칸 왼쪽부터 써요)`,
        `다음은 십의 자리 ${eul(tensB)} 곱해요! 십의 자리니까 한 칸 왼쪽부터 ${eul(p2)} 적어요.`,
        { activeRow: 1, val: p2 * 10 }
      );

      rows.push({ kind: 'sum', cells: padCells(String(prodTotal), colCount) });
      pushStep(
        '두 부분곱 더하기',
        `${p1} + ${p2 * 10} = <strong>${prodTotal}</strong>`,
        `이제 구한 두 수를 세로로 더해요! ${p1} 더하기 ${eun(p2 * 10)} ${ieyo(prodTotal)}!`,
        { activeRow: 2, val: prodTotal }
      );
    }

    pushStep(
      '계산 완료 🎉',
      `${numA} × ${numB} = <strong>${prodTotal}</strong>`,
      `짜잔! ${numA} 곱하기 ${numB}의 답은 ${ieyo(prodTotal)}. 참 잘했어요!`,
      { val: prodTotal }
    );

    return plan;
  }

  // 🍫 면적 모델: 수를 자리별로 나눈다 (124 → 100, 20, 4). 0인 자리는 칸을 만들지 않는다.
  const placeParts = n => [100, 10, 1].map(unit => Math.floor(n / unit) % 10 * unit).filter(part => part > 0);

  function buildAreaModel(op, numA, numB) {
    if (op === 'mul') {
      const widths = placeParts(numA);
      const cells = placeParts(numB).flatMap(height => widths.map(width => ({ width, height, area: width * height })));
      return { op, columns: widths.length, cells, total: numA * numB };
    }
    const quotient = Math.floor(numA / numB);
    return {
      op: 'div',
      divisor: numB,
      quotient,
      remainder: numA % numB,
      parts: placeParts(quotient).map(height => ({ height, area: height * numB }))
    };
  }

  window.OperatorStudioPlans = {
    DIVIDEND_MAX,
    DIVISOR_MAX,
    clampStudioValue,
    clampDivisionValue,
    numberJosa,
    divisionResultText,
    buildDivisionPlan,
    buildAdditionPlan,
    buildSubtractionPlan,
    buildMultiplicationPlan,
    buildAreaModel
  };
})();
