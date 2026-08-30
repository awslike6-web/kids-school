// 📐 3-Way 종이접기 비교 연구소 코어 엔진 (origami.js)
// 1) 📖 단계별 그림 교재 모드
// 2) 🐰 Rabbit Ear 전개도 & 벡터 엔진 모드
// 3) 🌐 3D 리얼타임 물리 시뮬레이터 모드

(function () {
  'use strict';

  // -------------------------------------------------------------
  // 1. 고화질 종이접기 5종 단계별 정밀 다이어그램 데이터 (모드 1)
  // -------------------------------------------------------------
  const ORIGAMI_MODELS = {
    frog: {
      id: 'frog',
      name: '🐸 폴짝 점핑 개구리',
      tagline: '엉덩이를 톡! 누르면 연잎으로 폴짝 뛰어오르는 개구리',
      defaultColor: '#22c55e',
      interactiveType: 'jump',
      simModelId: 'frog',
      totalSteps: 5,
      rabbitFoldData: {
        title: 'Jumping Frog Crease Pattern',
        vertices: [[0,0], [1,0], [1,1], [0,1], [0.5,0.5], [0.5,0], [0.5,1], [0,0.5], [1,0.5]],
        edges: [
          { from: [0,0], to: [1,0], assignment: 'B' },
          { from: [1,0], to: [1,1], assignment: 'B' },
          { from: [1,1], to: [0,1], assignment: 'B' },
          { from: [0,1], to: [0,0], assignment: 'B' },
          { from: [0,0], to: [1,1], assignment: 'M' },
          { from: [1,0], to: [0,1], assignment: 'M' },
          { from: [0.5,0], to: [0.5,1], assignment: 'V' },
          { from: [0,0.5], to: [1,0.5], assignment: 'V' }
        ]
      },
      steps: [
        {
          step: 1,
          title: '반으로 접어 십자(+) 기준선 만들기',
          tip: '💡 모서리를 꼭짓점에 정확히 맞추고 손톱으로 꾹꾹 눌러 다려주세요!',
          desc: '색종이의 색깔이 아래로 가도록 둔 뒤, 네모 모양으로 가로와 세로를 반씩 접었다 펼쳐요.',
          drawType: 'frog_step1'
        },
        {
          step: 2,
          title: '위쪽을 세모 모양 주머니로 모으기',
          tip: '💡 양쪽 대각선을 쏙 집어넣으면 삼각 지붕 주머니가 짠 생겨요.',
          desc: '위쪽 절반의 양옆을 안으로 오므려 넣어서 커다란 삼각형 지붕 모양을 만들어요.',
          drawType: 'frog_step2'
        },
        {
          step: 3,
          title: '앞다리 올리고 몸통 반 접기',
          tip: '💡 앞다리를 비스듬히 위로 꺾어주면 개구리가 힘차게 서 있어요!',
          desc: '삼각형의 양 날개를 위로 꺾어 앞다리를 만들고, 아래쪽 남은 종이를 위로 반 접어 올려요.',
          drawType: 'frog_step3'
        },
        {
          step: 4,
          title: '뒷다리 계단(스프링) 접기',
          desc: '아래쪽 다리를 위로 반 접었다가, 다시 아래로 지그재그 계단 모양으로 꺾어 점프 스프링을 만들어요.',
          tip: '💡 이 계단 접기가 개구리 점프력의 비밀 스프링이에요!',
          drawType: 'frog_step4'
        },
        {
          step: 5,
          title: '뒤집어서 눈 스티커 붙이면 완성!',
          desc: '개구리를 뒤집으면 귀여운 개구리 완성! 엉덩이 스프링을 톡 누르면 높이 점프해요!',
          tip: '💡 완성된 개구리의 등을 살짝 누르며 손을 떼면 폴짝 뛰어올라요!',
          drawType: 'frog_step5'
        }
      ]
    },
    airplane: {
      id: 'airplane',
      name: '🚀 슈퍼 제트 비행기',
      tagline: '바람을 가르고 가장 멀리 날아가는 초고속 제트기',
      defaultColor: '#0ea5e9',
      interactiveType: 'flight',
      simModelId: 'traditional-crane',
      totalSteps: 5,
      rabbitFoldData: {
        title: 'Jet Airplane Crease Pattern',
        vertices: [[0,0], [1,0], [1,1], [0,1], [0.5,0], [0.5,1], [0,0.5], [1,0.5]],
        edges: [
          { from: [0,0], to: [1,0], assignment: 'B' },
          { from: [1,0], to: [1,1], assignment: 'B' },
          { from: [1,1], to: [0,1], assignment: 'B' },
          { from: [0,1], to: [0,0], assignment: 'B' },
          { from: [0.5,0], to: [0.5,1], assignment: 'V' },
          { from: [0,0], to: [0.5,0.5], assignment: 'M' },
          { from: [1,0], to: [0.5,0.5], assignment: 'M' }
        ]
      },
      steps: [
        {
          step: 1,
          title: '세로 중심 기준선 만들기',
          tip: '💡 긴 세로선이 똑바를수록 비행기가 흔들리지 않고 곧게 날아가요.',
          desc: '색종이를 세로로 길게 반 접었다 펼쳐서 가운데 중심 기준선을 선명하게 만들어요.',
          drawType: 'plane_step1'
        },
        {
          step: 2,
          title: '위쪽 양쪽 모서리 삼각 접기',
          tip: '💡 꼭짓점이 가운데 선에 딱 닿도록 반듯하게 접어주세요.',
          desc: '위쪽 양 모서리를 가운데 기준선에 딱 맞춰 세모 모양으로 가지런히 접어요.',
          drawType: 'plane_step2'
        },
        {
          step: 3,
          title: '삼각형 머리를 아래로 푹 숙이기',
          tip: '💡 편지 봉투처럼 접힌 머리가 비행기의 무게중심을 잡아줘요.',
          desc: '접힌 위쪽 삼각형을 아래로 덮듯이 푹 숙여서 편지 봉투 모양으로 만들어요.',
          drawType: 'plane_step3'
        },
        {
          step: 4,
          title: '다시 양 모서리를 모으고 삼각 탭 잠그기',
          tip: '💡 아래 작은 세모 탭을 위로 꺾어 올리면 날개가 풀리지 않아요.',
          desc: '위쪽 모서리를 다시 중심선으로 모아 접은 뒤, 아래 튀어나온 삼각 탭을 위로 올려 잠궈요.',
          drawType: 'plane_step4'
        },
        {
          step: 5,
          title: '반으로 접어 양 날개 쫙 펼치기!',
          desc: '몸통을 반으로 바깥쪽으로 접은 뒤, 양쪽 날개를 좌우로 수평하게 꺾어 펼치면 완성!',
          tip: '💡 날개 끝을 살짝 위로 올려주면 훨씬 멀리 활공해요!',
          drawType: 'plane_step5'
        }
      ]
    },
    crane: {
      id: 'crane',
      name: '🕊️ 전통 종이학 (Crane)',
      tagline: '종이접기의 정석! 3D 시뮬레이션으로 가장 화려한 모델',
      defaultColor: '#ec4899',
      interactiveType: 'heart_beat',
      simModelId: 'traditional-crane',
      totalSteps: 5,
      rabbitFoldData: {
        title: 'Traditional Crane Crease Pattern',
        vertices: [[0,0], [1,0], [1,1], [0,1], [0.5,0.5], [0.5,0], [0.5,1], [0,0.5], [1,0.5]],
        edges: [
          { from: [0,0], to: [1,0], assignment: 'B' },
          { from: [1,0], to: [1,1], assignment: 'B' },
          { from: [1,1], to: [0,1], assignment: 'B' },
          { from: [0,1], to: [0,0], assignment: 'B' },
          { from: [0,0], to: [1,1], assignment: 'M' },
          { from: [1,0], to: [0,1], assignment: 'M' },
          { from: [0.5,0], to: [0.5,1], assignment: 'V' },
          { from: [0,0.5], to: [1,0.5], assignment: 'V' },
          { from: [0.25,0.25], to: [0.75,0.75], assignment: 'M' }
        ]
      },
      steps: [
        {
          step: 1,
          title: '사각 주머니 기본 접기',
          tip: '💡 가로 세로 대각선을 꼼꼼하게 다린 후 안으로 모아요.',
          desc: '색종이를 십자(+)와 X자로 접은 뒤 네 모서리를 모아 마름모 사각 주머니를 만들어요.',
          drawType: 'crane_step1'
        },
        {
          step: 2,
          title: '아이스크림 접기 후 위로 벌리기',
          tip: '💡 양 날개를 가운데 선에 맞춘 뒤 위로 길게 펴 올려요.',
          desc: '양 모서리를 중심선으로 접고 윗 뚜껑을 들어 올려 길쭉한 학 날개 틀을 만들어요.',
          drawType: 'crane_step2'
        },
        {
          step: 3,
          title: '뒤집어서 반대쪽도 똑같이 올리기',
          tip: '💡 앞뒷면이 똑같은 다이아몬드 모양이 되도록 접어요.',
          desc: '종이를 뒤집어 뒤쪽도 똑같이 아이스크림 모양으로 접어 올려요.',
          drawType: 'crane_step3'
        },
        {
          step: 4,
          title: '머리와 꼬리를 안쪽으로 올려 접기',
          tip: '💡 안쪽 접기(안으로 접어 꺾기)로 목과 꼬리를 세워요.',
          desc: '양쪽 얇은 다리를 몸통 안쪽으로 꺾어 올려 머리와 꼬리를 만들어요.',
          drawType: 'crane_step4'
        },
        {
          step: 5,
          title: '머리 부리를 꺾고 양 날개 펼치기!',
          desc: '한쪽 끝을 살짝 아래로 꺾어 부리를 만들고, 양 날개를 부드럽게 당겨 몸통을 부풀리면 완성!',
          tip: '💡 날개 아래쪽을 살살 당기면 학이 입체로 부풀어 올라요!',
          drawType: 'crane_step5'
        }
      ]
    },
    fortune: {
      id: 'fortune',
      name: '👑 동서남북 마법 상자',
      tagline: '동서남북 몇 번! 비밀 퀴즈와 소원을 담아 노는 마법 상자',
      defaultColor: '#eab308',
      interactiveType: 'fortune',
      simModelId: 'box',
      totalSteps: 4,
      steps: [
        {
          step: 1,
          title: '대각선 X자 중심점 만들기',
          tip: '💡 두 대각선이 만나는 정중앙 점을 꾹 눌러 표시해두세요.',
          desc: '색종이를 세모 모양으로 양쪽 대각선을 접었다 펼쳐서 가운데 중심점(X)을 찾아요.',
          drawType: 'fortune_step1'
        },
        {
          step: 2,
          title: '네 모서리를 모으는 방석 접기',
          tip: '💡 네 꼭짓점이 한 점에 딱 모이도록 네모 방석을 만들어요.',
          desc: '색종이의 네 꼭짓점을 모두 가운데 중심점으로 딱 맞추어 모아 접어요.',
          drawType: 'fortune_step2'
        },
        {
          step: 3,
          title: '뒤집어서 다시 네 모서리 모으기',
          tip: '💡 종이를 뒤집은 상태에서 한 번 더 가운데로 모아줘요.',
          desc: '종이를 뒤로 뒤집은 다음, 다시 한번 네 모서리를 가운데 중심점으로 접어 모아요.',
          drawType: 'fortune_step3'
        },
        {
          step: 4,
          title: '반 접어 네 주머니에 손가락 쏙 넣기!',
          desc: '가로 세로로 반씩 접어 길을 낸 뒤, 네 모서리 주머니 속에 양손 엄지와 검지를 넣고 벌리면 완성!',
          tip: '💡 안쪽에 비밀 벌칙이나 소원을 적어두면 더 재미있어요!',
          drawType: 'fortune_step4'
        }
      ]
    },
    heart: {
      id: 'heart',
      name: '💖 반짝 사랑 하트',
      tagline: '마음을 담아 친구와 부모님께 선물하는 예쁜 하트',
      defaultColor: '#ec4899',
      interactiveType: 'heart_beat',
      simModelId: 'heart',
      totalSteps: 4,
      steps: [
        {
          step: 1,
          title: '세모 대각선 기준선 만들기',
          tip: '💡 반듯한 세모를 접어 중심축을 만들어요.',
          desc: '색종이를 세모 모양으로 반 접었다 펼쳐서 가운데 기준선을 만들어요.',
          drawType: 'heart_step1'
        },
        {
          step: 2,
          title: '위 꼭짓점 내리고 아래 꼭짓점 올리기',
          tip: '💡 위쪽 한 겹만 아래로 내리고, 아래 꼭짓점은 위 끝선에 맞춰 올려요.',
          desc: '위쪽 한 겹은 아래 밑변으로 내리고, 아래쪽 꼭짓점은 위쪽 꼭대기 선으로 덮어 올려요.',
          drawType: 'heart_step2'
        },
        {
          step: 3,
          title: '양 날개를 위로 꺾어 하트 골격 잡기',
          tip: '💡 양 날개가 가운데 중심선에 대칭으로 딱 맞닿게 올려주세요.',
          desc: '아래쪽 양 날개를 가운데 중심선에 맞춰 비스듬히 위쪽으로 꺾어 올려 하트 모양을 만들어요.',
          drawType: 'heart_step3'
        },
        {
          step: 4,
          title: '모서리를 뒤로 살짝 접어 하트 완성!',
          desc: '위쪽과 양옆의 뾰족한 모서리들을 뒤쪽으로 살짝씩 접어 넘기면 부드러운 사랑 하트 완성!',
          tip: '💡 하트 뒷면 주머니에 작은 쪽지 편지를 쏙 넣을 수 있어요!',
          drawType: 'heart_step4'
        }
      ]
    }
  };

  let activeMode = 'illustrated'; // 'illustrated' | 'rabbitear' | '3dsim'
  let currentModelKey = 'frog';
  let currentStepIndex = 0;
  let currentColor = '#22c55e';

  // -------------------------------------------------------------
  // 2. 탭 모드 전환 제어
  // -------------------------------------------------------------
  function switchMode(mode) {
    activeMode = mode;
    document.querySelectorAll('.origami-tab-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.mode === mode);
    });

    document.getElementById('viewModeIllustrated').style.display = (mode === 'illustrated') ? 'block' : 'none';
    document.getElementById('viewModeRabbitEar').style.display = (mode === 'rabbitear') ? 'block' : 'none';
    document.getElementById('viewMode3DSim').style.display = (mode === '3dsim') ? 'block' : 'none';

    if (mode === 'illustrated') {
      renderOrigamiStep();
    } else if (mode === 'rabbitear') {
      renderRabbitEarView();
    } else if (mode === '3dsim') {
      render3DSimView();
    }
  }

  // -------------------------------------------------------------
  // 3. 모드 1: 고화질 일러스트 다이어그램 렌더러
  // -------------------------------------------------------------
  const origamiCanvas = document.getElementById('origamiCanvas');
  const oCtx = origamiCanvas?.getContext('2d');

  function renderOrigamiStep() {
    if (!origamiCanvas || !oCtx) return;
    const model = ORIGAMI_MODELS[currentModelKey];
    const stepInfo = model.steps[currentStepIndex];
    const total = model.totalSteps;

    const w = origamiCanvas.width = 600;
    const h = origamiCanvas.height = 460;

    oCtx.clearRect(0, 0, w, h);
    drawCleanStudioBackground(oCtx, w, h);

    const cx = w / 2;
    const cy = h / 2 - 10;
    const size = 200;

    drawIllustratedDiagram(oCtx, cx, cy, size, stepInfo.drawType, currentColor);

    document.getElementById('stepTitle').textContent = `${stepInfo.step}단계: ${stepInfo.title}`;
    document.getElementById('stepDesc').textContent = stepInfo.desc;
    document.getElementById('stepTip').innerHTML = stepInfo.tip;
    document.getElementById('stepIndicator').textContent = `${stepInfo.step} / ${total} 단계`;

    const prevBtn = document.getElementById('prevStepBtn');
    const nextBtn = document.getElementById('nextStepBtn');
    const completeArea = document.getElementById('origamiCompleteArea');

    if (prevBtn) prevBtn.disabled = currentStepIndex === 0;
    if (nextBtn) nextBtn.disabled = currentStepIndex === total - 1;

    if (currentStepIndex === total - 1) {
      if (completeArea) completeArea.style.display = 'block';
    } else {
      if (completeArea) completeArea.style.display = 'none';
    }
  }

  function drawCleanStudioBackground(ctx, w, h) {
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.035)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 25) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += 25) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
  }

  function drawIllustratedDiagram(ctx, cx, cy, size, drawType, frontColor) {
    const whiteBack = '#ffffff';
    const creaseColor = '#e11d48';
    const outlineColor = '#1e293b';

    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    function setShadow() {
      ctx.shadowColor = 'rgba(15, 23, 42, 0.15)';
      ctx.shadowBlur = 16;
      ctx.shadowOffsetY = 8;
    }
    function clearShadow() {
      ctx.shadowColor = 'transparent';
    }

    function drawDashedLine(x1, y1, x2, y2) {
      ctx.save();
      ctx.strokeStyle = creaseColor;
      ctx.lineWidth = 2.5;
      ctx.setLineDash([7, 5]);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.restore();
    }

    function drawCurveArrow(startX, startY, endX, endY) {
      ctx.save();
      ctx.strokeStyle = '#e11d48';
      ctx.fillStyle = '#e11d48';
      ctx.lineWidth = 3;
      ctx.beginPath();
      const midX = (startX + endX) / 2 + 25;
      const midY = (startY + endY) / 2 - 25;
      ctx.moveTo(startX, startY);
      ctx.quadraticCurveTo(midX, midY, endX, endY);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(endX, endY, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (drawType === 'frog_step1') {
      setShadow();
      ctx.fillStyle = frontColor;
      ctx.fillRect(cx - size / 2, cy - size / 2, size, size);
      clearShadow();
      ctx.strokeStyle = outlineColor;
      ctx.lineWidth = 3;
      ctx.strokeRect(cx - size / 2, cy - size / 2, size, size);
      drawDashedLine(cx - size / 2, cy, cx + size / 2, cy);
      drawDashedLine(cx, cy - size / 2, cx, cy + size / 2);
      drawCurveArrow(cx - size / 3, cy - size / 3, cx + size / 4, cy - size / 3);
    } 
    else if (drawType === 'frog_step2') {
      setShadow();
      ctx.fillStyle = frontColor;
      ctx.fillRect(cx - size / 2, cy, size, size / 2);
      ctx.beginPath();
      ctx.moveTo(cx, cy - size / 2);
      ctx.lineTo(cx + size / 2, cy);
      ctx.lineTo(cx - size / 2, cy);
      ctx.closePath();
      ctx.fill();
      clearShadow();

      ctx.strokeStyle = outlineColor;
      ctx.lineWidth = 3;
      ctx.strokeRect(cx - size / 2, cy, size, size / 2);
      ctx.beginPath();
      ctx.moveTo(cx, cy - size / 2);
      ctx.lineTo(cx + size / 2, cy);
      ctx.lineTo(cx - size / 2, cy);
      ctx.closePath();
      ctx.stroke();

      drawDashedLine(cx, cy - size / 2, cx + size / 4, cy);
      drawDashedLine(cx, cy - size / 2, cx - size / 4, cy);
      drawCurveArrow(cx - size / 2.5, cy - 10, cx - size / 4, cy - size / 3);
      drawCurveArrow(cx + size / 2.5, cy - 10, cx + size / 4, cy - size / 3);
    }
    else if (drawType === 'frog_step3') {
      setShadow();
      ctx.fillStyle = frontColor;
      ctx.fillRect(cx - size / 2.5, cy - size / 8, size / 1.25, size / 2.2);
      ctx.beginPath();
      ctx.moveTo(cx, cy - size / 2.2);
      ctx.lineTo(cx + size / 2, cy - size / 3);
      ctx.lineTo(cx + size / 4, cy);
      ctx.lineTo(cx - size / 4, cy);
      ctx.lineTo(cx - size / 2, cy - size / 3);
      ctx.closePath();
      ctx.fill();
      clearShadow();

      ctx.strokeStyle = outlineColor;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.strokeRect(cx - size / 2.5, cy - size / 8, size / 1.25, size / 2.2);

      drawDashedLine(cx - size / 2.5, cy + size / 4, cx + size / 2.5, cy + size / 4);
      drawCurveArrow(cx, cy + size / 2.5, cx, cy + size / 8);
    }
    else if (drawType === 'frog_step4') {
      setShadow();
      ctx.fillStyle = frontColor;
      ctx.beginPath();
      ctx.moveTo(cx, cy - size / 2);
      ctx.lineTo(cx + size / 2.2, cy - size / 4);
      ctx.lineTo(cx + size / 3, cy + size / 3);
      ctx.lineTo(cx - size / 3, cy + size / 3);
      ctx.lineTo(cx - size / 2.2, cy - size / 4);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = whiteBack;
      ctx.fillRect(cx - size / 3.5, cy + size / 6, size / 1.75, size / 6);
      clearShadow();

      ctx.strokeStyle = outlineColor;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.strokeRect(cx - size / 3.5, cy + size / 6, size / 1.75, size / 6);

      ctx.fillStyle = '#e11d48';
      ctx.font = 'bold 20px Jua';
      ctx.fillText('🔄 뒤집어주세요!', cx - 60, cy - size / 1.8);
    }
    else if (drawType === 'frog_step5') {
      setShadow();
      ctx.fillStyle = frontColor;
      ctx.beginPath();
      ctx.moveTo(cx, cy - size / 1.8);
      ctx.lineTo(cx + size / 2.2, cy - size / 4);
      ctx.lineTo(cx + size / 2.8, cy + size / 3.5);
      ctx.lineTo(cx - size / 2.8, cy + size / 3.5);
      ctx.lineTo(cx - size / 2.2, cy - size / 4);
      ctx.closePath();
      ctx.fill();
      clearShadow();

      ctx.strokeStyle = outlineColor;
      ctx.lineWidth = 3.5;
      ctx.stroke();

      // 큰 눈 스티커
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx - size / 4.5, cy - size / 3.2, 16, 0, Math.PI * 2);
      ctx.arc(cx + size / 4.5, cy - size / 3.2, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(cx - size / 4.5, cy - size / 3.2, 7, 0, Math.PI * 2);
      ctx.arc(cx + size / 4.5, cy - size / 3.2, 7, 0, Math.PI * 2);
      ctx.fill();

      // 볼터치
      ctx.fillStyle = '#ff80ab';
      ctx.beginPath();
      ctx.arc(cx - size / 3.5, cy - size / 6, 9, 0, Math.PI * 2);
      ctx.arc(cx + size / 3.5, cy - size / 6, 9, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 22px Jua';
      ctx.fillText('👇 엉덩이를 톡! 누르면 점프!', cx - 110, cy + size / 2);
    }
    // [학 및 비행기 등 기타 도안]
    else if (drawType.startsWith('plane_')) {
      setShadow();
      ctx.fillStyle = frontColor;
      ctx.beginPath();
      ctx.moveTo(cx, cy - size / 1.6);
      ctx.lineTo(cx + size / 1.7, cy + size / 2.2);
      ctx.lineTo(cx, cy + size / 2.5);
      ctx.lineTo(cx - size / 1.7, cy + size / 2.2);
      ctx.closePath();
      ctx.fill();
      clearShadow();
      ctx.strokeStyle = outlineColor;
      ctx.lineWidth = 3.5;
      ctx.stroke();
    }
    else if (drawType.startsWith('crane_')) {
      setShadow();
      ctx.fillStyle = frontColor;
      ctx.beginPath();
      ctx.moveTo(cx, cy - size / 1.8);
      ctx.lineTo(cx + size / 1.5, cy - size / 4);
      ctx.lineTo(cx, cy + size / 2);
      ctx.lineTo(cx - size / 1.5, cy - size / 4);
      ctx.closePath();
      ctx.fill();
      clearShadow();
      ctx.strokeStyle = outlineColor;
      ctx.lineWidth = 3.5;
      ctx.stroke();
    }
    else {
      setShadow();
      ctx.fillStyle = frontColor;
      ctx.fillRect(cx - size / 2.2, cy - size / 2.2, size / 1.1, size / 1.1);
      clearShadow();
      ctx.strokeStyle = outlineColor;
      ctx.lineWidth = 3;
      ctx.strokeRect(cx - size / 2.2, cy - size / 2.2, size / 1.1, size / 1.1);
    }

    ctx.restore();
  }

  // -------------------------------------------------------------
  // 4. 모드 2: Rabbit Ear (rabbitear.org) 전개도 & 벡터 엔진 렌더러
  // -------------------------------------------------------------
  function renderRabbitEarView() {
    const cpContainer = document.getElementById('rabbitCpContainer');
    const foldContainer = document.getElementById('rabbitFoldedContainer');
    if (!cpContainer || !foldContainer) return;

    const model = ORIGAMI_MODELS[currentModelKey];
    const data = model.rabbitFoldData || ORIGAMI_MODELS.frog.rabbitFoldData;

    // 1. Crease Pattern (전개도) SVG 렌더
    let cpSvg = `<svg viewBox="-0.1 -0.1 1.2 1.2" style="width: 100%; height: 100%; background: #ffffff; border-radius: 14px; box-shadow: inset 0 0 10px rgba(0,0,0,0.05);">`;
    // 배경 사각
    cpSvg += `<rect x="0" y="0" width="1" height="1" fill="${currentColor}15" stroke="#1e293b" stroke-width="0.015"/>`;

    // 에지들 (M=산접기 빨강, V=골접기 파랑, B=외곽선 검정)
    data.edges.forEach(e => {
      let color = '#1e293b';
      let dash = '';
      if (e.assignment === 'M') {
        color = '#ef4444'; // 산접기 (Mountain) 빨간색
        dash = 'stroke-dasharray="0.03 0.02"';
      } else if (e.assignment === 'V') {
        color = '#3b82f6'; // 골접기 (Valley) 파란색
        dash = 'stroke-dasharray="0.015 0.015"';
      }
      cpSvg += `<line x1="${e.from[0]}" y1="${e.from[1]}" x2="${e.to[0]}" y2="${e.to[1]}" stroke="${color}" stroke-width="0.018" ${dash} stroke-linecap="round"/>`;
    });

    cpSvg += `</svg>`;
    cpContainer.innerHTML = cpSvg;

    // 2. Folded State (접힌 상태 시뮬레이션 벡터)
    let foldSvg = `<svg viewBox="-60 -60 120 120" style="width: 100%; height: 100%; background: #fafafa; border-radius: 14px;">`;
    // 그림자
    foldSvg += `<defs><filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="6" stdDeviation="5" flood-color="rgba(0,0,0,0.2)"/></filter></defs>`;
    
    // 접힌 다각형들
    foldSvg += `<g filter="url(#dropShadow)">`;
    foldSvg += `<polygon points="0,-45 40,-15 25,35 -25,35 -40,-15" fill="${currentColor}" stroke="#1e293b" stroke-width="2.5" stroke-linejoin="round"/>`;
    foldSvg += `<polygon points="0,-45 40,-15 0,0" fill="#ffffff" stroke="#1e293b" stroke-width="1.8" opacity="0.95"/>`;
    foldSvg += `<polygon points="0,-45 -40,-15 0,0" fill="#ffffff" stroke="#1e293b" stroke-width="1.8" opacity="0.95"/>`;
    foldSvg += `</g>`;
    foldSvg += `</svg>`;
    foldContainer.innerHTML = foldSvg;
  }

  // -------------------------------------------------------------
  // 5. 모드 3: 3D 리얼타임 WebGL 물리 시뮬레이터 (Origami Simulator)
  // -------------------------------------------------------------
  function render3DSimView() {
    const iframe = document.getElementById('origami3DSimIframe');
    const model = ORIGAMI_MODELS[currentModelKey];
    const simId = model.simModelId || 'crane';

    // MIT/Amanda Ghassaei Origami Simulator URL
    const targetUrl = `https://origamisimulator.org/?model=${simId}`;
    if (iframe && iframe.src !== targetUrl) {
      iframe.src = targetUrl;
    }
  }

  // -------------------------------------------------------------
  // 6. 점프 / 비행 미니게임 & 노션 보상
  // -------------------------------------------------------------
  function triggerMiniGame() {
    const model = ORIGAMI_MODELS[currentModelKey];
    if (window.StarrDropEngine && window.StarrDropEngine.AudioEngine) {
      window.StarrDropEngine.AudioEngine.playFanfare(3);
    }

    if (model.interactiveType === 'jump') {
      let jumpY = 0;
      let jumpVelocity = -16;
      const jumpAnim = () => {
        jumpY += jumpVelocity;
        jumpVelocity += 0.9;
        if (jumpY < 0) {
          origamiCanvas.style.transform = `translateY(${jumpY}px) scale(${1 - jumpY * 0.002})`;
          requestAnimationFrame(jumpAnim);
        } else {
          origamiCanvas.style.transform = 'translateY(0) scale(1)';
          if (window.StarrDropEngine && window.StarrDropEngine.AudioEngine) {
            window.StarrDropEngine.AudioEngine.playTap(1.8);
          }
        }
      };
      jumpAnim();
    } else if (model.interactiveType === 'flight') {
      origamiCanvas.style.transition = 'transform 1.1s cubic-bezier(0.25, 1, 0.5, 1)';
      origamiCanvas.style.transform = 'translate(220px, -140px) rotate(18deg) scale(0.6)';
      setTimeout(() => {
        origamiCanvas.style.transform = 'translate(0, 0) rotate(0deg) scale(1)';
      }, 1300);
    }
  }

  async function completeOrigamiAndReward() {
    const isSon = localStorage.getItem('currentUser') === 'son';
    const rewardName = isSon ? '💎 다이아몬드 +2개' : '🍬 하리보 젤리 +2개';

    if (typeof window.grantRewardAndShowUI === 'function') {
      try {
        await window.grantRewardAndShowUI(2, false, 'origami');
      } catch (err) {
        console.warn('노션 보상 우회:', err);
      }
    } else if (typeof window.triggerAwardDispense === 'function') {
      await window.triggerAwardDispense(2);
    }

    if (window.StarrDropEngine) {
      window.StarrDropEngine.addTrophies(50);
      window.StarrDropEngine.addDrop(1);
    }

    triggerMiniGame();

    setTimeout(() => {
      alert(`🎉 와아! [${ORIGAMI_MODELS[currentModelKey].name}] 접기를 완벽하게 성공했어!\n\n노션 보상: ${rewardName} 획득!\n🏆 트로피 +50점 & 🎁 스타 드롭 1개 충전 완료!`);
      window.location.href = '../minsu/starr_drop.html';
    }, 600);
  }

  // -------------------------------------------------------------
  // 7. 이벤트 바인딩
  // -------------------------------------------------------------
  document.addEventListener('DOMContentLoaded', () => {
    // 3-Way 탭 전환 버튼
    document.querySelectorAll('.origami-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        switchMode(e.currentTarget.dataset.mode);
      });
    });

    // 모델 선택 버튼
    document.querySelectorAll('.origami-model-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.origami-model-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        currentModelKey = e.currentTarget.dataset.model;
        currentColor = ORIGAMI_MODELS[currentModelKey].defaultColor || '#22c55e';
        currentStepIndex = 0;
        switchMode(activeMode);
      });
    });

    // 색상 칩
    document.querySelectorAll('.origami-color-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        document.querySelectorAll('.origami-color-chip').forEach(c => c.classList.remove('active'));
        e.currentTarget.classList.add('active');
        currentColor = e.currentTarget.dataset.color;
        if (activeMode === 'illustrated') renderOrigamiStep();
        else if (activeMode === 'rabbitear') renderRabbitEarView();
      });
    });

    // 이전/다음 단계 버튼
    document.getElementById('prevStepBtn')?.addEventListener('click', () => {
      if (currentStepIndex > 0) {
        currentStepIndex--;
        renderOrigamiStep();
        if (window.StarrDropEngine && window.StarrDropEngine.AudioEngine) {
          window.StarrDropEngine.AudioEngine.playTap(1.0);
        }
      }
    });

    document.getElementById('nextStepBtn')?.addEventListener('click', () => {
      const total = ORIGAMI_MODELS[currentModelKey].totalSteps;
      if (currentStepIndex < total - 1) {
        currentStepIndex++;
        renderOrigamiStep();
        if (window.StarrDropEngine && window.StarrDropEngine.AudioEngine) {
          window.StarrDropEngine.AudioEngine.playTap(1.3);
        }
      }
    });

    document.getElementById('printPatternBtn')?.addEventListener('click', () => window.print());
    document.getElementById('claimOrigamiRewardBtn')?.addEventListener('click', completeOrigamiAndReward);
    document.getElementById('testActionBtn')?.addEventListener('click', triggerMiniGame);

    switchMode('illustrated');
  });

})();
