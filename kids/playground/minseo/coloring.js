// 🎨 매직 컬러링 & 밑그림 공방 코어 스크립트 (coloring.js)

(function () {
  'use strict';

  // 캔버스 레이어: 밑그림(Outline) 레이어 + 색칠(Color) 레이어 이중 버퍼
  const outlineCanvas = document.getElementById('outlineCanvas');
  const outlineCtx = outlineCanvas.getContext('2d', { willReadFrequently: true });
  const colorCanvas = document.getElementById('colorCanvas');
  const colorCtx = colorCanvas.getContext('2d', { willReadFrequently: true });

  let currentColor = '#ff6b9d';
  let currentTool = 'fill'; // 'fill' | 'brush' | 'eraser'
  let brushSize = 14;
  let isDrawing = false;
  let lastX = 0, lastY = 0;

  // 되돌리기 히스토리 (최대 15단계)
  const history = [];
  let historyStep = -1;

  // 기본 프리셋 이미지 목록 (SVG/Canvas 프로그래밍 드로잉)
  const PRESETS = {
    cat: drawPresetCat,
    dino: drawPresetDino,
    unicorn: drawPresetUnicorn,
    spike: drawPresetSpike
  };

  // -------------------------------------------------------------
  // 1. 캔버스 초기화 및 리사이징
  // -------------------------------------------------------------
  function initCanvases(width = 800, height = 600) {
    outlineCanvas.width = width;
    outlineCanvas.height = height;
    colorCanvas.width = width;
    colorCanvas.height = height;

    // 흰 배경 초기화
    outlineCtx.fillStyle = '#ffffff';
    outlineCtx.fillRect(0, 0, width, height);
    colorCtx.clearRect(0, 0, width, height);

    saveState();
  }

  // -------------------------------------------------------------
  // 2. 외곽선(Edge Detection) 알고리즘 (Sobel Filter)
  // -------------------------------------------------------------
  function processImageToOutline(imgElement, sensitivity = 35) {
    const w = 800;
    const h = Math.round((imgElement.naturalHeight / imgElement.naturalWidth) * w) || 600;
    
    initCanvases(w, Math.min(Math.max(h, 500), 900));

    // 임시 캔버스에 원본 축소 렌더
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w;
    tempCanvas.height = outlineCanvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(imgElement, 0, 0, w, outlineCanvas.height);

    const imgData = tempCtx.getImageData(0, 0, w, outlineCanvas.height);
    const data = imgData.data;

    // 흑백 그레이스케일 변환
    const gray = new Float32Array(w * outlineCanvas.height);
    for (let i = 0; i < data.length; i += 4) {
      gray[i / 4] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }

    // Sobel 엣지 검출
    const output = outlineCtx.createImageData(w, outlineCanvas.height);
    const outData = output.data;

    for (let y = 1; y < outlineCanvas.height - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = y * w + x;
        // 수평/수직 그라디언트
        const gx =
          -1 * gray[idx - w - 1] + 1 * gray[idx - w + 1] +
          -2 * gray[idx - 1]     + 2 * gray[idx + 1] +
          -1 * gray[idx + w - 1] + 1 * gray[idx + w + 1];

        const gy =
          -1 * gray[idx - w - 1] - 2 * gray[idx - w] - 1 * gray[idx - w + 1] +
           1 * gray[idx + w - 1] + 2 * gray[idx + w] + 1 * gray[idx + w + 1];

        const mag = Math.sqrt(gx * gx + gy * gy);
        const isEdge = mag > sensitivity;

        const pIdx = idx * 4;
        if (isEdge) {
          outData[pIdx] = 30;     // R (진한 흑색선)
          outData[pIdx + 1] = 30; // G
          outData[pIdx + 2] = 30; // B
          outData[pIdx + 3] = 255;// A
        } else {
          outData[pIdx] = 255;    // 흰 바탕
          outData[pIdx + 1] = 255;
          outData[pIdx + 2] = 255;
          outData[pIdx + 3] = 255;
        }
      }
    }

    outlineCtx.putImageData(output, 0, 0);
    saveState();
  }

  // -------------------------------------------------------------
  // 3. 페인트통 채우기 (Flood Fill) 알고리즘
  // -------------------------------------------------------------
  function hexToRgb(hex) {
    const bigint = parseInt(hex.replace('#', ''), 16);
    return {
      r: (bigint >> 16) & 255,
      g: (bigint >> 8) & 255,
      b: bigint & 255
    };
  }

  function floodFill(startX, startY, fillColorHex) {
    const w = outlineCanvas.width;
    const h = outlineCanvas.height;
    const fillRgb = hexToRgb(fillColorHex);

    const outlineData = outlineCtx.getImageData(0, 0, w, h);
    const colorData = colorCtx.getImageData(0, 0, w, h);

    const startIdx = (startY * w + startX) * 4;

    // 만약 클릭한 곳이 검은 윤곽선이면 채우지 않음
    if (outlineData.data[startIdx] < 80 && outlineData.data[startIdx + 1] < 80 && outlineData.data[startIdx + 2] < 80) {
      return;
    }

    const targetR = colorData.data[startIdx];
    const targetG = colorData.data[startIdx + 1];
    const targetB = colorData.data[startIdx + 2];
    const targetA = colorData.data[startIdx + 3];

    if (targetR === fillRgb.r && targetG === fillRgb.g && targetB === fillRgb.b && targetA === 255) {
      return;
    }

    const queue = [[startX, startY]];
    const visited = new Uint8Array(w * h);

    while (queue.length > 0) {
      const [cx, cy] = queue.pop();
      const idx = (cy * w + cx) * 4;
      const flatIdx = cy * w + cx;

      if (visited[flatIdx]) continue;
      visited[flatIdx] = 1;

      // 윤곽선 충돌 검사
      if (outlineData.data[idx] < 80 && outlineData.data[idx + 1] < 80 && outlineData.data[idx + 2] < 80) {
        continue;
      }

      // 색상 칠하기
      colorData.data[idx] = fillRgb.r;
      colorData.data[idx + 1] = fillRgb.g;
      colorData.data[idx + 2] = fillRgb.b;
      colorData.data[idx + 3] = 255;

      if (cx > 0 && !visited[flatIdx - 1]) queue.push([cx - 1, cy]);
      if (cx < w - 1 && !visited[flatIdx + 1]) queue.push([cx + 1, cy]);
      if (cy > 0 && !visited[flatIdx - w]) queue.push([cx, cy - 1]);
      if (cy < h - 1 && !visited[flatIdx + w]) queue.push([cx, cy + 1]);
    }

    colorCtx.putImageData(colorData, 0, 0);
    saveState();
  }

  // -------------------------------------------------------------
  // 4. 드로잉 이벤트 (마우스 & 터치)
  // -------------------------------------------------------------
  function getPos(e) {
    const rect = colorCanvas.getBoundingClientRect();
    const scaleX = colorCanvas.width / rect.width;
    const scaleY = colorCanvas.height / rect.height;

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    return {
      x: Math.floor((clientX - rect.left) * scaleX),
      y: Math.floor((clientY - rect.top) * scaleY)
    };
  }

  function onPointerDown(e) {
    e.preventDefault();
    const { x, y } = getPos(e);

    if (currentTool === 'fill') {
      floodFill(x, y, currentColor);
      if (window.StarrDropEngine && window.StarrDropEngine.AudioEngine) {
        window.StarrDropEngine.AudioEngine.playTap(1.2);
      }
      return;
    }

    isDrawing = true;
    lastX = x;
    lastY = y;
  }

  function onPointerMove(e) {
    if (!isDrawing || currentTool === 'fill') return;
    e.preventDefault();
    const { x, y } = getPos(e);

    colorCtx.beginPath();
    colorCtx.moveTo(lastX, lastY);
    colorCtx.lineTo(x, y);
    colorCtx.lineCap = 'round';
    colorCtx.lineJoin = 'round';

    if (currentTool === 'eraser') {
      colorCtx.globalCompositeOperation = 'destination-out';
      colorCtx.lineWidth = brushSize * 1.5;
    } else {
      colorCtx.globalCompositeOperation = 'source-over';
      colorCtx.strokeStyle = currentColor;
      colorCtx.lineWidth = brushSize;
    }

    colorCtx.stroke();
    lastX = x;
    lastY = y;
  }

  function onPointerUp() {
    if (isDrawing) {
      isDrawing = false;
      saveState();
    }
  }

  colorCanvas.addEventListener('mousedown', onPointerDown);
  colorCanvas.addEventListener('mousemove', onPointerMove);
  window.addEventListener('mouseup', onPointerUp);

  colorCanvas.addEventListener('touchstart', onPointerDown, { passive: false });
  colorCanvas.addEventListener('touchmove', onPointerMove, { passive: false });
  window.addEventListener('touchend', onPointerUp);

  // -------------------------------------------------------------
  // 5. 되돌리기 (Undo / Redo)
  // -------------------------------------------------------------
  function saveState() {
    if (historyStep < history.length - 1) {
      history.splice(historyStep + 1);
    }
    history.push({
      outline: outlineCtx.getImageData(0, 0, outlineCanvas.width, outlineCanvas.height),
      color: colorCtx.getImageData(0, 0, colorCanvas.width, colorCanvas.height)
    });
    if (history.length > 15) history.shift();
    historyStep = history.length - 1;
    updateUndoRedoBtns();
  }

  function undo() {
    if (historyStep > 0) {
      historyStep--;
      restoreState(history[historyStep]);
      updateUndoRedoBtns();
    }
  }

  function redo() {
    if (historyStep < history.length - 1) {
      historyStep++;
      restoreState(history[historyStep]);
      updateUndoRedoBtns();
    }
  }

  function restoreState(state) {
    outlineCtx.putImageData(state.outline, 0, 0);
    colorCtx.putImageData(state.color, 0, 0);
  }

  function updateUndoRedoBtns() {
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');
    if (undoBtn) undoBtn.disabled = historyStep <= 0;
    if (redoBtn) redoBtn.disabled = historyStep >= history.length - 1;
  }

  // -------------------------------------------------------------
  // 6. 귀여운 기본 도안 벡터 프리셋 생성기
  // -------------------------------------------------------------
  function drawPresetCat() {
    initCanvases(800, 600);
    outlineCtx.strokeStyle = '#222222';
    outlineCtx.lineWidth = 6;
    outlineCtx.fillStyle = '#ffffff';
    outlineCtx.lineCap = 'round';
    outlineCtx.lineJoin = 'round';

    // 얼굴
    outlineCtx.beginPath();
    outlineCtx.arc(400, 300, 160, 0, Math.PI * 2);
    outlineCtx.stroke();

    // 귀
    outlineCtx.beginPath();
    outlineCtx.moveTo(270, 200); outlineCtx.lineTo(240, 90); outlineCtx.lineTo(340, 160);
    outlineCtx.moveTo(530, 200); outlineCtx.lineTo(560, 90); outlineCtx.lineTo(460, 160);
    outlineCtx.stroke();

    // 눈
    outlineCtx.fillStyle = '#222222';
    outlineCtx.beginPath();
    outlineCtx.arc(330, 270, 16, 0, Math.PI * 2);
    outlineCtx.arc(470, 270, 16, 0, Math.PI * 2);
    outlineCtx.fill();

    // 코와 입
    outlineCtx.beginPath();
    outlineCtx.moveTo(390, 310); outlineCtx.lineTo(410, 310); outlineCtx.lineTo(400, 325); outlineCtx.closePath();
    outlineCtx.fill();

    outlineCtx.beginPath();
    outlineCtx.moveTo(400, 325); outlineCtx.lineTo(400, 345);
    outlineCtx.moveTo(400, 345); outlineCtx.arc(375, 345, 25, 0, Math.PI);
    outlineCtx.moveTo(400, 345); outlineCtx.arc(425, 345, 25, 0, Math.PI);
    outlineCtx.stroke();

    // 수염
    outlineCtx.beginPath();
    outlineCtx.moveTo(240, 310); outlineCtx.lineTo(320, 315);
    outlineCtx.moveTo(230, 335); outlineCtx.lineTo(320, 330);
    outlineCtx.moveTo(560, 310); outlineCtx.lineTo(480, 315);
    outlineCtx.moveTo(570, 335); outlineCtx.lineTo(480, 330);
    outlineCtx.stroke();

    saveState();
  }

  function drawPresetDino() {
    initCanvases(800, 600);
    outlineCtx.strokeStyle = '#222222';
    outlineCtx.lineWidth = 6;
    outlineCtx.lineCap = 'round';

    // 아기 공룡 몸체
    outlineCtx.beginPath();
    outlineCtx.arc(360, 320, 140, 0, Math.PI * 2);
    outlineCtx.stroke();

    // 공룡 머리
    outlineCtx.beginPath();
    outlineCtx.arc(480, 200, 90, 0, Math.PI * 2);
    outlineCtx.stroke();

    // 등 뿔들
    const spikes = [[260, 220], [290, 180], [330, 160], [380, 150]];
    spikes.forEach(([sx, sy]) => {
      outlineCtx.beginPath();
      outlineCtx.moveTo(sx, sy);
      outlineCtx.lineTo(sx - 20, sy - 30);
      outlineCtx.lineTo(sx + 20, sy - 10);
      outlineCtx.stroke();
    });

    // 눈과 웃는 입
    outlineCtx.fillStyle = '#222222';
    outlineCtx.beginPath();
    outlineCtx.arc(510, 180, 14, 0, Math.PI * 2);
    outlineCtx.fill();

    outlineCtx.beginPath();
    outlineCtx.arc(520, 220, 25, 0.2 * Math.PI, 0.8 * Math.PI);
    outlineCtx.stroke();

    saveState();
  }

  function drawPresetUnicorn() {
    initCanvases(800, 600);
    outlineCtx.strokeStyle = '#222222';
    outlineCtx.lineWidth = 6;

    // 머리
    outlineCtx.beginPath();
    outlineCtx.arc(380, 300, 130, 0, Math.PI * 2);
    outlineCtx.stroke();

    // 뿔 (Unicorn Horn)
    outlineCtx.beginPath();
    outlineCtx.moveTo(420, 180);
    outlineCtx.lineTo(510, 60);
    outlineCtx.lineTo(460, 200);
    outlineCtx.closePath();
    outlineCtx.stroke();

    // 별 장식
    outlineCtx.fillStyle = '#222222';
    outlineCtx.beginPath();
    outlineCtx.arc(350, 280, 14, 0, Math.PI * 2);
    outlineCtx.fill();

    saveState();
  }

  function drawPresetSpike() {
    initCanvases(800, 600);
    outlineCtx.strokeStyle = '#222222';
    outlineCtx.lineWidth = 6;

    // 브롤스타즈 스파이크 선인장 몸
    outlineCtx.beginPath();
    outlineCtx.arc(400, 320, 150, 0, Math.PI * 2);
    outlineCtx.stroke();

    // 눈 (검은 십자가 형태)
    outlineCtx.fillStyle = '#222222';
    outlineCtx.fillRect(330, 260, 30, 30);
    outlineCtx.fillRect(440, 260, 30, 30);

    // 벌린 입
    outlineCtx.beginPath();
    outlineCtx.arc(400, 340, 30, 0, Math.PI);
    outlineCtx.fill();

    // 머리 위 꽃
    outlineCtx.beginPath();
    outlineCtx.arc(400, 160, 35, 0, Math.PI * 2);
    outlineCtx.stroke();

    saveState();
  }

  // -------------------------------------------------------------
  // 7. 인쇄 (A4 스케치북) 및 완성 보상
  // -------------------------------------------------------------
  function printDrawing() {
    window.print();
  }

  async function completeAndClaimReward() {
    const isSon = localStorage.getItem('currentUser') === 'son';
    const rewardName = isSon ? '💎 다이아몬드 +2개' : '🍬 하리보 젤리 +2개';

    // 1. 노션 인벤토리 DB 연동 호출
    if (typeof window.grantRewardAndShowUI === 'function') {
      try {
        await window.grantRewardAndShowUI(2, false, 'art');
      } catch (err) {
        console.warn('노션 보상 통신 우회:', err);
      }
    } else if (typeof window.triggerAwardDispense === 'function') {
      await window.triggerAwardDispense(2);
    }

    // 2. 스타드롭 및 트로피 로드 보상 추가
    if (window.StarrDropEngine) {
      window.StarrDropEngine.addTrophies(50);
      window.StarrDropEngine.addDrop(1);
      
      if (window.StarrDropEngine.AudioEngine) {
        window.StarrDropEngine.AudioEngine.playFanfare(3);
      }

      alert(`🎉 와아! 멋진 작품을 완성했어!\n\n노션 보상: ${rewardName} 획득!\n🏆 트로피 +50점과 🎁 스타 드롭 1개를 획득했어!`);
      window.location.href = '../minsu/starr_drop.html';
    }
  }

  // -------------------------------------------------------------
  // 8. 전역 인터페이스 노출 및 이벤트 바인딩
  // -------------------------------------------------------------
  window.ColoringStudio = {
    init() {
      drawPresetCat(); // 기본값 고양이

      // 도구 버튼
      document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
          const target = e.currentTarget;
          target.classList.add('active');
          currentTool = target.dataset.tool;
        });
      });

      // 컬러 팔레트
      document.querySelectorAll('.color-chip').forEach(chip => {
        chip.addEventListener('click', (e) => {
          document.querySelectorAll('.color-chip').forEach(c => c.classList.remove('active'));
          const target = e.currentTarget;
          target.classList.add('active');
          currentColor = target.dataset.color;
        });
      });

      // 브러시 크기 슬라이더
      const brushSlider = document.getElementById('brushSlider');
      if (brushSlider) {
        brushSlider.addEventListener('input', (e) => {
          brushSize = parseInt(e.target.value, 10);
        });
      }

      // 되돌리기 / 다시실행
      document.getElementById('undoBtn')?.addEventListener('click', undo);
      document.getElementById('redoBtn')?.addEventListener('click', redo);

      // 프리셋 선택
      document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const type = e.currentTarget.dataset.preset;
          if (PRESETS[type]) PRESETS[type]();
        });
      });

      // 이미지 업로드
      const imageUploadInput = document.getElementById('imageUploadInput');
      if (imageUploadInput) {
        imageUploadInput.addEventListener('change', (e) => {
          const file = e.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
              processImageToOutline(img);
            };
            img.src = event.target.result;
          };
          reader.readAsDataURL(file);
        });
      }

      // 인쇄 및 보상 버튼
      document.getElementById('printBtn')?.addEventListener('click', printDrawing);
      document.getElementById('completeBtn')?.addEventListener('click', completeAndClaimReward);
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    window.ColoringStudio.init();
  });

})();
