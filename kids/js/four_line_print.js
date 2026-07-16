// ========================================================
// 📏 4선지 인쇄 통합 규격 - 공용 헬퍼 v1
// --------------------------------------------------------
// 쌍둥이 파일: kids/css/four_line_print.css (규격 원본)
// 소비처: print_english.html, english_common.js(printDictionary)
// ========================================================

/** 알파벳만 <span class="ch char-X"> 로 래핑 (낱글자 --dy/--sc 교정용) */
window.wrapFourLineChars = function (word) {
    return [...String(word)].map(c =>
        /[a-zA-Z]/.test(c) ? `<span class="ch char-${c}">${c}</span>` : c
    ).join('');
};

/** 단어 길이에 따른 따라쓰기 반복 횟수 (규격 공통 기준) */
window.getTraceCount = function (word) {
    const len = String(word).length;
    if (len < 6) return 4;
    if (len < 10) return 3;
    if (len < 15) return 2;
    return 1;
};

/** A4 인쇄방 practice-area 실제 가용 너비 (meaning-wrap 180px 제외 후 여유) */
window.FOUR_LINE_PRACTICE_WIDTH = 380;

/** 따라쓰기 칸 안에서 trace-word가 몇 줄(48px 칸)을 차지할지 예측 */
window.layoutTraceWordRows = function (word, traceCount, lineWidth = FOUR_LINE_PRACTICE_WIDTH) {
    const charW = 14;
    const margin = 25;
    const unitW = (String(word).length * charW) + margin;
    const rows = [];
    let currentRow = [];
    let rowW = 0;
    for (let i = 0; i < traceCount; i++) {
        if (rowW > 0 && rowW + unitW > lineWidth) {
            rows.push(currentRow);
            currentRow = [i];
            rowW = unitW;
        } else {
            currentRow.push(i);
            rowW += unitW;
        }
    }
    if (currentRow.length) rows.push(currentRow);
    return rows;
};

window.estimateTraceLineCount = function (word, traceCount, lineWidth = FOUR_LINE_PRACTICE_WIDTH) {
    return layoutTraceWordRows(word, traceCount, lineWidth).length;
};

/** 따라쓰기 반복을 48px 행 단위 four-line-bg로 분할 (2줄째 베이스라인 정렬 보장) */
window.buildTraceRowsHtml = function (word, traceCount, lineWidth = FOUR_LINE_PRACTICE_WIDTH) {
    const span = `<span class="trace-word">${wrapFourLineChars(word)}</span>`;
    return layoutTraceWordRows(word, traceCount, lineWidth)
        .map(indices => `<div class="four-line-bg">${indices.map(() => span).join('')}</div>`)
        .join('');
};

/**
 * 단어 1개 분량의 4선지 행 HTML 생성
 * (왼쪽 한글 뜻 + 오른쪽 [따라쓰기 줄 + 동일 높이 빈 줄])
 */
window.buildFourLineRowHtml = function (word, meaning) {
    const traceRows = buildTraceRowsHtml(word, getTraceCount(word));
    return `
        <div class="word-row">
            <div class="meaning-wrap">${meaning || ''}</div>
            <div class="practice-area">
                <div class="trace-rows">${traceRows}</div>
                <div class="trace-rows empty-row-dynamic">${traceRows}</div>
            </div>
        </div>`;
};

/** 웹폰트 로딩 완료를 보장한 뒤 인쇄창 호출 (폴백 유격 방지) */
window.printWhenFontsReady = function () {
    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => window.print());
    } else {
        window.print();
    }
};
