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

/** 단어/문장 길이에 상관없이 따라쓰기 1회로 통일 */
window.getTraceCount = function (word) {
    return 1;
};

/** A4 인쇄방 practice-area 실제 가용 너비 (meaning-wrap 160px 제외 후 여유) */
window.FOUR_LINE_PRACTICE_WIDTH = 520;

/** 문장/단어가 가용 너비를 초과할 경우 4선지 칸 단위(48px)로 줄바꿈 분할 */
window.layoutTraceWordRows = function (word, traceCount = 1, lineWidth = FOUR_LINE_PRACTICE_WIDTH) {
    const charW = 14;
    const spaceW = 10;
    const tokens = String(word).trim().split(/\s+/);
    const lines = [];
    let currentLine = [];
    let currentW = 0;

    tokens.forEach(tok => {
        const tokW = tok.length * charW;
        if (currentW > 0 && currentW + spaceW + tokW > lineWidth) {
            lines.push(currentLine.join(' '));
            currentLine = [tok];
            currentW = tokW;
        } else {
            currentLine.push(tok);
            currentW += (currentW > 0 ? spaceW : 0) + tokW;
        }
    });
    if (currentLine.length) lines.push(currentLine.join(' '));
    return lines.length ? lines : [word];
};

window.estimateTraceLineCount = function (word, traceCount = 1, lineWidth = FOUR_LINE_PRACTICE_WIDTH) {
    return layoutTraceWordRows(word, traceCount, lineWidth).length;
};

/** 따라쓰기 1회를 48px 행 단위 four-line-bg로 생성 (2줄째 베이스라인 정렬 보장) */
window.buildTraceRowsHtml = function (word, traceCount = 1, lineWidth = FOUR_LINE_PRACTICE_WIDTH) {
    const lines = layoutTraceWordRows(word, traceCount, lineWidth);
    return lines
        .map(lineText => `<div class="four-line-bg"><span class="trace-word">${wrapFourLineChars(lineText)}</span></div>`)
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
