// ==========================================
// 🔍 민민이네 공부방 공통 이미지 돋보기 & 핀치줌 엔진 (image_zoom_modal.js)
// ==========================================
// 과학 실험 관찰 사진 및 사회 역사 유물/지도 사료를 
// 마우스 드래그, 90도 회전, 모바일 핀치줌으로 자유롭게 탐색할 수 있는 공통 뷰어 코어입니다.

let cardZoomScale = 1.0;
let cardZoomX = 0;
let cardZoomY = 0;
let cardRotationDeg = 0;
let isCardZoomDragging = false;
let startCardDragX = 0;
let startCardDragY = 0;
let cardLastTouchDist = 0;

/**
 * 줌/이동/회전 CSS Transform 일괄 갱신
 */
function updateCardZoomTransform() {
    const img = document.getElementById("cardZoomImg");
    if (img) {
        img.style.transform = `translate(${cardZoomX}px, ${cardZoomY}px) rotate(${cardRotationDeg}deg) scale(${cardZoomScale})`;
    }
}

/**
 * 이미지 90도 회전
 */
function rotateCardImage() {
    cardRotationDeg = (cardRotationDeg + 90) % 360;
    updateCardZoomTransform();
}

/**
 * 줌 배율 조절 (+ / -)
 */
function adjustCardZoom(delta) {
    cardZoomScale = Math.min(Math.max(0.6, cardZoomScale + delta), 4.5);
    updateCardZoomTransform();
}

/**
 * 줌 상태 원위치 초기화
 */
function resetCardZoom() {
    cardZoomScale = 1.0;
    cardZoomX = 0;
    cardZoomY = 0;
    cardRotationDeg = 0;
    updateCardZoomTransform();
}

/**
 * 사료/실험 사진을 전용 고화질 팝업 창으로 열기
 */
function openImageInNewWindow(imgSrc, title, period, usage) {
    const img = document.getElementById("cardZoomImg");
    const url = imgSrc || (img ? img.src : "");
    if (!url) return;
    
    const w = Math.min(1050, window.screen.availWidth - 80);
    const h = Math.min(900, window.screen.availHeight - 80);
    const left = Math.max(0, Math.floor((window.screen.availWidth - w) / 2));
    const top = Math.max(0, Math.floor((window.screen.availHeight - h) / 2));

    const winTitle = title || (window.currentSubject === '과학' ? '실험 관찰 사진 돋보기' : '교과서 사료 돋보기');
    const newWin = window.open(
        "",
        "TextbookViewer_" + Date.now(),
        `width=${w},height=${h},top=${top},left=${left},resizable=yes,scrollbars=yes,status=no,location=no,toolbar=no,menubar=no`
    );
    
    if (newWin) {
        newWin.document.write(`
            <!DOCTYPE html>
            <html lang="ko">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${winTitle}</title>
                <link rel="preconnect" href="https://fonts.googleapis.com">
                <link href="https://fonts.googleapis.com/css2?family=Jua&family=Noto+Sans+KR:wght@400;600;700&display=swap" rel="stylesheet">
                <style>
                    body {
                        margin: 0;
                        padding: 20px;
                        background: #0f172a;
                        color: #f8fafc;
                        font-family: 'Noto Sans KR', sans-serif;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        box-sizing: border-box;
                    }
                    .header-box {
                        width: 100%;
                        max-width: 960px;
                        background: rgba(30, 41, 59, 0.95);
                        border: 2px solid #8b5cf6;
                        border-radius: 16px;
                        padding: 16px 20px;
                        box-sizing: border-box;
                        margin-bottom: 16px;
                    }
                    .title {
                        font-family: 'Jua', sans-serif;
                        font-size: 1.5rem;
                        color: #fbbf24;
                        margin: 0 0 8px 0;
                    }
                    .meta-row {
                        display: flex;
                        gap: 12px;
                        font-size: 0.95rem;
                        color: #94a3b8;
                    }
                    .img-wrap {
                        width: 100%;
                        max-width: 960px;
                        background: #000;
                        border-radius: 16px;
                        overflow: hidden;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        padding: 10px;
                        box-sizing: border-box;
                    }
                    .img-wrap img {
                        max-width: 100%;
                        max-height: 75vh;
                        object-fit: contain;
                    }
                </style>
            </head>
            <body>
                <div class="header-box">
                    <h1 class="title">🔍 ${winTitle}</h1>
                    ${period || usage ? `<div class="meta-row"><span>${period || ''}</span><span>${usage || ''}</span></div>` : ''}
                </div>
                <div class="img-wrap">
                    <img src="${url}" alt="${winTitle}">
                </div>
            </body>
            </html>
        `);
        newWin.document.close();
    }
}

/**
 * 마우스 드래그 및 모바일 터치/핀치줌 이벤트 리스너 바인딩
 */
function initCardZoomListeners() {
    resetCardZoom();
    const viewport = document.getElementById("cardZoomViewport");
    if (!viewport) return;

    // 1. PC 마우스 드래그
    viewport.onmousedown = (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        isCardZoomDragging = true;
        viewport.classList.add("is-dragging");
        startCardDragX = e.clientX - cardZoomX;
        startCardDragY = e.clientY - cardZoomY;
    };

    window.onmousemove = (e) => {
        if (!isCardZoomDragging) return;
        e.preventDefault();
        cardZoomX = e.clientX - startCardDragX;
        cardZoomY = e.clientY - startCardDragY;
        updateCardZoomTransform();
    };

    window.onmouseup = () => {
        if (isCardZoomDragging) {
            isCardZoomDragging = false;
            if (viewport) viewport.classList.remove("is-dragging");
        }
    };

    // 2. 모바일 터치 드래그 및 핀치줌
    viewport.ontouchstart = (e) => {
        if (e.touches.length === 1) {
            isCardZoomDragging = true;
            startCardDragX = e.touches[0].clientX - cardZoomX;
            startCardDragY = e.touches[0].clientY - cardZoomY;
        } else if (e.touches.length === 2) {
            isCardZoomDragging = false;
            cardLastTouchDist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
        }
    };

    viewport.ontouchmove = (e) => {
        if (e.touches.length === 1 && isCardZoomDragging) {
            e.preventDefault();
            cardZoomX = e.touches[0].clientX - startCardDragX;
            cardZoomY = e.touches[0].clientY - startCardDragY;
            updateCardZoomTransform();
        } else if (e.touches.length === 2) {
            e.preventDefault();
            const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            if (cardLastTouchDist > 0) {
                const diff = (dist - cardLastTouchDist) * 0.005;
                adjustCardZoom(diff);
            }
            cardLastTouchDist = dist;
        }
    };

    viewport.ontouchend = () => {
        isCardZoomDragging = false;
        cardLastTouchDist = 0;
    };
}

// 전역 네임스페이스 바인딩 (하위 호환성 100% 보장)
window.updateCardZoomTransform = updateCardZoomTransform;
window.rotateCardImage = rotateCardImage;
window.adjustCardZoom = adjustCardZoom;
window.resetCardZoom = resetCardZoom;
window.openImageInNewWindow = openImageInNewWindow;
window.initCardZoomListeners = initCardZoomListeners;
