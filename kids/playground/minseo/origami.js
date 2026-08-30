// 📐 3-Way 종이접기 비교 연구소 코어 엔진 (origami.js)
// 1) 📖 단계별 그림 교재 모드 (1~5단계 순서도 & A4 인쇄)
// 2) 🐰 Rabbit Ear 전개도 & 모델별 고유 실시간 벡터 접힘 애니메이션
// 3) 🌐 리얼 3D WebGL 물리 시뮬레이터 (5종 모델별 고유 3D 지오메트리 & 힌지 리깅)

(function () {
  'use strict';

  // -------------------------------------------------------------
  // 1. 종이접기 5종 데이터 정의 (모델별 고유 CP 및 메타데이터)
  // -------------------------------------------------------------
  const ORIGAMI_MODELS = {
    frog: {
      id: 'frog',
      name: '🐸 폴짝 점핑 개구리',
      tagline: '엉덩이를 톡! 누르면 연잎으로 폴짝 뛰어오르는 개구리',
      defaultColor: '#22c55e',
      interactiveType: 'jump',
      totalSteps: 5,
      rabbitFoldData: {
        title: 'Jumping Frog Crease Pattern',
        edges: [
          { from: [0,0], to: [1,0], assignment: 'B' },
          { from: [1,0], to: [1,1], assignment: 'B' },
          { from: [1,1], to: [0,1], assignment: 'B' },
          { from: [0,1], to: [0,0], assignment: 'B' },
          { from: [0,0], to: [1,0.5], assignment: 'M' },
          { from: [1,0], to: [0,0.5], assignment: 'M' },
          { from: [0,0.5], to: [1,0.5], assignment: 'V' },
          { from: [0,0.75], to: [1,0.75], assignment: 'M' },
          { from: [0,0.88], to: [1,0.88], assignment: 'V' }
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
      totalSteps: 5,
      rabbitFoldData: {
        title: 'Jet Airplane Crease Pattern',
        edges: [
          { from: [0,0], to: [1,0], assignment: 'B' },
          { from: [1,0], to: [1,1], assignment: 'B' },
          { from: [1,1], to: [0,1], assignment: 'B' },
          { from: [0,1], to: [0,0], assignment: 'B' },
          { from: [0.5,0], to: [0.5,1], assignment: 'V' },
          { from: [0,0], to: [0.5,0.4], assignment: 'M' },
          { from: [1,0], to: [0.5,0.4], assignment: 'M' },
          { from: [0,0.4], to: [1,0.4], assignment: 'V' },
          { from: [0.25,0.4], to: [0.25,1], assignment: 'V' },
          { from: [0.75,0.4], to: [0.75,1], assignment: 'V' }
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
      totalSteps: 5,
      rabbitFoldData: {
        title: 'Traditional Crane Crease Pattern',
        edges: [
          { from: [0,0], to: [1,0], assignment: 'B' },
          { from: [1,0], to: [1,1], assignment: 'B' },
          { from: [1,1], to: [0,1], assignment: 'B' },
          { from: [0,1], to: [0,0], assignment: 'B' },
          { from: [0,0], to: [1,1], assignment: 'M' },
          { from: [1,0], to: [0,1], assignment: 'M' },
          { from: [0.5,0], to: [0.5,1], assignment: 'V' },
          { from: [0,0.5], to: [1,0.5], assignment: 'V' },
          { from: [0.25,0.25], to: [0.75,0.75], assignment: 'M' },
          { from: [0.75,0.25], to: [0.25,0.75], assignment: 'M' }
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
      totalSteps: 4,
      rabbitFoldData: {
        title: 'Fortune Teller Crease Pattern',
        edges: [
          { from: [0,0], to: [1,0], assignment: 'B' },
          { from: [1,0], to: [1,1], assignment: 'B' },
          { from: [1,1], to: [0,1], assignment: 'B' },
          { from: [0,1], to: [0,0], assignment: 'B' },
          { from: [0,0], to: [1,1], assignment: 'M' },
          { from: [1,0], to: [0,1], assignment: 'M' },
          { from: [0.5,0], to: [0,0.5], assignment: 'V' },
          { from: [0,0.5], to: [0.5,1], assignment: 'V' },
          { from: [0.5,1], to: [1,0.5], assignment: 'V' },
          { from: [1,0.5], to: [0.5,0], assignment: 'V' }
        ]
      },
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
      totalSteps: 4,
      rabbitFoldData: {
        title: 'Love Heart Crease Pattern',
        edges: [
          { from: [0,0], to: [1,0], assignment: 'B' },
          { from: [1,0], to: [1,1], assignment: 'B' },
          { from: [1,1], to: [0,1], assignment: 'B' },
          { from: [0,1], to: [0,0], assignment: 'B' },
          { from: [0,0], to: [1,1], assignment: 'V' },
          { from: [0.5,0], to: [0.5,1], assignment: 'M' },
          { from: [0,0.5], to: [0.5,1], assignment: 'M' },
          { from: [1,0.5], to: [0.5,1], assignment: 'M' }
        ]
      },
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
  // 2. 탭 모드 전환
  // -------------------------------------------------------------
  function switchMode(mode) {
    activeMode = mode;
    document.querySelectorAll('.origami-tab-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.mode === mode);
    });

    document.getElementById('viewModeIllustrated').style.display = (mode === 'illustrated') ? 'flex' : 'none';
    document.getElementById('viewModeRabbitEar').style.display = (mode === 'rabbitear') ? 'flex' : 'none';
    document.getElementById('viewMode3DSim').style.display = (mode === '3dsim') ? 'flex' : 'none';

    if (mode === 'illustrated') {
      renderOrigamiStep();
    } else if (mode === 'rabbitear') {
      updateRabbitEarFold(parseFloat(document.getElementById('rabbitFoldSlider').value));
    } else if (mode === '3dsim') {
      initThree3DScene();
      build3DPaperModel();
      updateThreeFold(parseFloat(document.getElementById('threeFoldSlider').value));
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

    // [1] 개구리 단계별 도안
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

      ctx.fillStyle = '#ff80ab';
      ctx.beginPath();
      ctx.arc(cx - size / 3.5, cy - size / 6, 9, 0, Math.PI * 2);
      ctx.arc(cx + size / 3.5, cy - size / 6, 9, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 22px Jua';
      ctx.fillText('👇 엉덩이를 톡! 누르면 점프!', cx - 110, cy + size / 2);
    }
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
  // 4. 모드 2: Rabbit Ear 모델별 고유 실시간 벡터 접힘 엔진
  // -------------------------------------------------------------
  let rabbitPlayInterval = null;

  function updateRabbitEarFold(percent) {
    document.getElementById('rabbitFoldPercentText').textContent = `${Math.round(percent)}%`;
    const cpContainer = document.getElementById('rabbitCpContainer');
    const foldContainer = document.getElementById('rabbitFoldedContainer');
    if (!cpContainer || !foldContainer) return;

    const model = ORIGAMI_MODELS[currentModelKey];
    const data = model.rabbitFoldData || ORIGAMI_MODELS.frog.rabbitFoldData;

    // 1. Crease Pattern (전개도) SVG
    let cpSvg = `<svg viewBox="-0.05 -0.05 1.1 1.1" style="width: 100%; height: 100%; background: #ffffff; border-radius: 14px; box-shadow: inset 0 0 10px rgba(0,0,0,0.05);">`;
    cpSvg += `<rect x="0" y="0" width="1" height="1" fill="${currentColor}15" stroke="#1e293b" stroke-width="0.015"/>`;

    data.edges.forEach(e => {
      let color = '#1e293b';
      let dash = '';
      if (e.assignment === 'M') {
        color = '#ef4444'; // 산접기 (Mountain)
        dash = 'stroke-dasharray="0.03 0.02"';
      } else if (e.assignment === 'V') {
        color = '#3b82f6'; // 골접기 (Valley)
        dash = 'stroke-dasharray="0.015 0.015"';
      }
      cpSvg += `<line x1="${e.from[0]}" y1="${e.from[1]}" x2="${e.to[0]}" y2="${e.to[1]}" stroke="${color}" stroke-width="0.018" ${dash} stroke-linecap="round"/>`;
    });
    cpSvg += `</svg>`;
    cpContainer.innerHTML = cpSvg;

    // 2. 모델별 고유 Folded State SVG
    const t = percent / 100; // 0.0 ~ 1.0
    let foldSvg = `<svg viewBox="-90 -90 180 180" style="width: 100%; height: 100%; background: #fafafa; border-radius: 14px;">`;
    foldSvg += `<defs><filter id="rfDrop" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="${3 + t*5}" stdDeviation="${3 + t*4}" flood-color="rgba(0,0,0,0.25)"/></filter></defs>`;
    foldSvg += `<g filter="url(#rfDrop)">`;

    if (currentModelKey === 'airplane') {
      // 🚀 비행기: 세로 날개 접힘 및 노즈콘 뾰족해짐
      const wingFold = t * 65;
      const noseDrop = t * 30;
      foldSvg += `<polygon points="0,-60 -${50 - t*30},${40 + noseDrop} 0,${30 + noseDrop} ${50 - t*30},${40 + noseDrop}" fill="${currentColor}" stroke="#1e293b" stroke-width="2.5" stroke-linejoin="round"/>`;
      foldSvg += `<polygon points="0,-60 -${30 * (1-t*0.5)},0 0,20" fill="#ffffff" stroke="#1e293b" stroke-width="1.8" opacity="0.9"/>`;
      foldSvg += `<polygon points="0,-60 ${30 * (1-t*0.5)},0 0,20" fill="#ffffff" stroke="#1e293b" stroke-width="1.8" opacity="0.9"/>`;
    }
    else if (currentModelKey === 'crane') {
      // 🕊️ 전통 학: 마름모에서 목과 꼬리가 길게 올라오고 날개 전개
      const flapY = Math.sin(t * Math.PI) * 25;
      foldSvg += `<polygon points="0,-${20 + t*45} -${50 - t*10},${flapY} 0,${20 + t*10} ${50 - t*10},${flapY}" fill="${currentColor}" stroke="#1e293b" stroke-width="2.5" stroke-linejoin="round"/>`;
      if (t > 0.4) {
        // 목과 머리
        foldSvg += `<line x1="0" y1="0" x2="-${t * 35}" y2="-${t * 55}" stroke="${currentColor}" stroke-width="6" stroke-linecap="round"/>`;
        // 꼬리
        foldSvg += `<line x1="0" y1="0" x2="${t * 35}" y2="-${t * 45}" stroke="${currentColor}" stroke-width="5" stroke-linecap="round"/>`;
      }
    }
    else if (currentModelKey === 'heart') {
      // 💖 사랑 하트: 아래 꼭짓점 모이고 상단 2개 엽 라운딩
      foldSvg += `<path d="M 0,${40 - t*15} C -${45 * t},${10 - t*20} -${50 * t},-${40 * t} 0,-${15 * t} C ${50 * t},-${40 * t} ${45 * t},${10 - t*20} 0,${40 - t*15} Z" fill="${currentColor}" stroke="#1e293b" stroke-width="2.5"/>`;
    }
    else if (currentModelKey === 'fortune') {
      // 👑 동서남북: 4개 삼각 모서리가 중심으로 모임
      const blintz = 45 * (1 - t * 0.6);
      foldSvg += `<polygon points="-${blintz},-${blintz} ${blintz},-${blintz} ${blintz},${blintz} -${blintz},${blintz}" fill="${currentColor}" stroke="#1e293b" stroke-width="2.5"/>`;
      foldSvg += `<line x1="-${blintz}" y1="-${blintz}" x2="${blintz}" y2="${blintz}" stroke="#ffffff" stroke-width="2"/>`;
      foldSvg += `<line x1="${blintz}" y1="-${blintz}" x2="-${blintz}" y2="${blintz}" stroke="#ffffff" stroke-width="2"/>`;
    }
    else {
      // 🐸 개구리: 삼각 머리와 Z자 스프링 다리 압축
      const springCompress = t * 25;
      foldSvg += `<polygon points="0,-50 -40,-10 40,-10" fill="${currentColor}" stroke="#1e293b" stroke-width="2.5"/>`;
      foldSvg += `<rect x="-25" y="-10" width="50" height="${35 - springCompress}" fill="${currentColor}" stroke="#1e293b" stroke-width="2"/>`;
      foldSvg += `<line x1="-25" y1="${10 - springCompress*0.5}" x2="25" y2="${10 - springCompress*0.5}" stroke="#ffffff" stroke-width="2.5"/>`;
      // 눈
      foldSvg += `<circle cx="-15" cy="-35" r="5" fill="#fff" stroke="#000" stroke-width="1.5"/><circle cx="-15" cy="-35" r="2" fill="#000"/>`;
      foldSvg += `<circle cx="15" cy="-35" r="5" fill="#fff" stroke="#000" stroke-width="1.5"/><circle cx="15" cy="-35" r="2" fill="#000"/>`;
    }

    foldSvg += `</g>`;
    foldSvg += `</svg>`;
    foldContainer.innerHTML = foldSvg;
  }

  function toggleRabbitAutoPlay() {
    const btn = document.getElementById('rabbitPlayBtn');
    const slider = document.getElementById('rabbitFoldSlider');
    if (rabbitPlayInterval) {
      clearInterval(rabbitPlayInterval);
      rabbitPlayInterval = null;
      btn.textContent = '▶️ 자동 접기 재생';
    } else {
      btn.textContent = '⏸️ 일시 정지';
      let direction = 1;
      rabbitPlayInterval = setInterval(() => {
        let val = parseFloat(slider.value) + (direction * 2);
        if (val >= 100) {
          val = 100;
          direction = -1;
        } else if (val <= 0) {
          val = 0;
          direction = 1;
        }
        slider.value = val;
        updateRabbitEarFold(val);
      }, 40);
    }
  }

  // -------------------------------------------------------------
  // 5. 모드 3: 리얼 3D WebGL 물리 시뮬레이터 (Three.js 모델별 고유 리깅)
  // -------------------------------------------------------------
  let threeScene, threeCamera, threeRenderer, threeControls;
  let paperRootGroup;
  let modelSpecificParts = {}; // 3D 부품 힌지 그룹들 저장
  let threePlayInterval = null;
  let isThreeInitialized = false;

  function initThree3DScene() {
    const container = document.getElementById('threeCanvasContainer');
    if (!container || isThreeInitialized) return;

    const width = container.clientWidth || 540;
    const height = container.clientHeight || 380;

    // 1. Scene
    threeScene = new THREE.Scene();
    threeScene.background = new THREE.Color(0x0f0b21);

    // 2. Camera
    threeCamera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    threeCamera.position.set(0, 6.5, 11);

    // 3. Renderer
    threeRenderer = new THREE.WebGLRenderer({ antialias: true });
    threeRenderer.setSize(width, height);
    threeRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    threeRenderer.shadowMap.enabled = true;
    container.appendChild(threeRenderer.domElement);

    // 4. OrbitControls
    if (typeof THREE.OrbitControls === 'function') {
      threeControls = new THREE.OrbitControls(threeCamera, threeRenderer.domElement);
      threeControls.enableDamping = true;
      threeControls.dampingFactor = 0.06;
      threeControls.maxPolarAngle = Math.PI / 2 + 0.35;
    }

    // 5. 조명
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    threeScene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.85);
    dirLight.position.set(6, 12, 8);
    dirLight.castShadow = true;
    threeScene.add(dirLight);

    // 바닥 격자 그리드
    const grid = new THREE.GridHelper(16, 16, 0x00f2fe, 0x22194d);
    grid.position.y = -2.2;
    threeScene.add(grid);

    // 6. 렌더 루프
    const animate = () => {
      requestAnimationFrame(animate);
      if (threeControls) threeControls.update();
      threeRenderer.render(threeScene, threeCamera);
    };
    animate();

    isThreeInitialized = true;

    window.addEventListener('resize', () => {
      if (!container || !threeCamera || !threeRenderer) return;
      const nw = container.clientWidth;
      const nh = container.clientHeight;
      threeCamera.aspect = nw / nh;
      threeCamera.updateProjectionMatrix();
      threeRenderer.setSize(nw, nh);
    });
  }

  // -------------------------------------------------------------
  // 5-1. 모델별 고유 3D 지오메트리 빌더
  // -------------------------------------------------------------
  function build3DPaperModel() {
    if (!threeScene) return;

    const existing = threeScene.getObjectByName('OrigamiPaperRoot');
    if (existing) threeScene.remove(existing);

    paperRootGroup = new THREE.Group();
    paperRootGroup.name = 'OrigamiPaperRoot';
    modelSpecificParts = {};

    const frontMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(currentColor),
      roughness: 0.35,
      metalness: 0.05,
      side: THREE.FrontSide
    });
    const backMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0xffffff),
      roughness: 0.25,
      side: THREE.BackSide
    });

    // 헬퍼: 양면 메쉬 생성기
    function createDoubleSidedMesh(geometry) {
      const g = new THREE.Group();
      const f = new THREE.Mesh(geometry, frontMat);
      const b = new THREE.Mesh(geometry, backMat);
      f.castShadow = true;
      b.castShadow = true;
      g.add(f);
      g.add(b);
      return g;
    }

    // ==========================================
    // [1] 🚀 슈퍼 제트 비행기 고유 3D 지오메트리
    // ==========================================
    if (currentModelKey === 'airplane') {
      // 중앙 척추 동체
      const bodyGeom = new THREE.PlaneGeometry(1.2, 5.0);
      const body = createDoubleSidedMesh(bodyGeom);
      body.rotation.x = -Math.PI / 2;
      paperRootGroup.add(body);

      // 좌측 제트 날개 (힌지: -0.6)
      const lWingGroup = new THREE.Group();
      lWingGroup.position.set(-0.6, 0, 0);
      const lWingGeom = new THREE.BufferGeometry();
      lWingGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
        0, 0, -2.5,
        -3.5, 0, 1.8,
        0, 0, 2.5
      ]), 3));
      lWingGeom.computeVertexNormals();
      lWingGroup.add(createDoubleSidedMesh(lWingGeom));
      paperRootGroup.add(lWingGroup);
      modelSpecificParts.leftWing = lWingGroup;

      // 우측 제트 날개 (힌지: +0.6)
      const rWingGroup = new THREE.Group();
      rWingGroup.position.set(0.6, 0, 0);
      const rWingGeom = new THREE.BufferGeometry();
      rWingGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
        0, 0, -2.5,
        3.5, 0, 1.8,
        0, 0, 2.5
      ]), 3));
      rWingGeom.computeVertexNormals();
      rWingGroup.add(createDoubleSidedMesh(rWingGeom));
      paperRootGroup.add(rWingGroup);
      modelSpecificParts.rightWing = rWingGroup;

      // 뾰족한 앞 노즈콘
      const noseGroup = new THREE.Group();
      noseGroup.position.set(0, 0, -2.5);
      const noseGeom = new THREE.BufferGeometry();
      noseGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
        -0.6, 0, 0,
        0, 0, -1.8,
        0.6, 0, 0
      ]), 3));
      noseGeom.computeVertexNormals();
      noseGroup.add(createDoubleSidedMesh(noseGeom));
      paperRootGroup.add(noseGroup);
      modelSpecificParts.nose = noseGroup;
    }

    // ==========================================
    // [2] 🐸 점핑 개구리 고유 3D 지오메트리
    // ==========================================
    else if (currentModelKey === 'frog') {
      // 머리 삼각 주머니
      const headGeom = new THREE.BufferGeometry();
      headGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
        -2.2, 0, 0,
        0, 0, -2.5,
        2.2, 0, 0
      ]), 3));
      headGeom.computeVertexNormals();
      paperRootGroup.add(createDoubleSidedMesh(headGeom));

      // 입체 눈 2개
      const eyeGeom = new THREE.SphereGeometry(0.35, 16, 16);
      const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
      const pupilMat = new THREE.MeshBasicMaterial({ color: 0x000000 });

      const eyeL = new THREE.Mesh(eyeGeom, eyeMat);
      eyeL.position.set(-0.9, 0.35, -1.2);
      const pupilL = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), pupilMat);
      pupilL.position.set(0, 0.15, -0.25);
      eyeL.add(pupilL);
      paperRootGroup.add(eyeL);

      const eyeR = new THREE.Mesh(eyeGeom, eyeMat);
      eyeR.position.set(0.9, 0.35, -1.2);
      const pupilR = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), pupilMat);
      pupilR.position.set(0, 0.15, -0.25);
      eyeR.add(pupilR);
      paperRootGroup.add(eyeR);

      // 앞다리 2개
      const legL = new THREE.Group();
      legL.position.set(-2.0, 0, 0);
      const legLGeom = new THREE.BufferGeometry();
      legLGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
        0, 0, 0, -1.5, 0, -1.2, 0, 0, 1.2
      ]), 3));
      legLGeom.computeVertexNormals();
      legL.add(createDoubleSidedMesh(legLGeom));
      paperRootGroup.add(legL);
      modelSpecificParts.frontLegL = legL;

      const legR = new THREE.Group();
      legR.position.set(2.0, 0, 0);
      const legRGeom = new THREE.BufferGeometry();
      legRGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
        0, 0, 0, 1.5, 0, -1.2, 0, 0, 1.2
      ]), 3));
      legRGeom.computeVertexNormals();
      legR.add(createDoubleSidedMesh(legRGeom));
      paperRootGroup.add(legR);
      modelSpecificParts.frontLegR = legR;

      // 중앙 몸통
      const bodyGeom = new THREE.PlaneGeometry(3.2, 2.0);
      const body = createDoubleSidedMesh(bodyGeom);
      body.rotation.x = -Math.PI / 2;
      body.position.set(0, 0, 1.0);
      paperRootGroup.add(body);

      // 뒷다리 Z자 아코디언 스프링 계단 (1단 & 2단)
      const spring1 = new THREE.Group();
      spring1.position.set(0, 0, 2.0);
      const s1Geom = new THREE.PlaneGeometry(3.0, 1.2);
      const s1 = createDoubleSidedMesh(s1Geom);
      s1.rotation.x = -Math.PI / 2;
      spring1.add(s1);

      const spring2 = new THREE.Group();
      spring2.position.set(0, 0, 1.2);
      const s2Geom = new THREE.PlaneGeometry(2.8, 1.2);
      const s2 = createDoubleSidedMesh(s2Geom);
      s2.rotation.x = -Math.PI / 2;
      spring2.add(s2);
      spring1.add(spring2);

      paperRootGroup.add(spring1);
      modelSpecificParts.spring1 = spring1;
      modelSpecificParts.spring2 = spring2;
    }

    // ==========================================
    // [3] 🕊️ 전통 종이학 고유 3D 지오메트리
    // ==========================================
    else if (currentModelKey === 'crane') {
      // 마름모 중앙 다이아몬드 코어
      const coreGeom = new THREE.BufferGeometry();
      coreGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
        0, 0.4, -1.2,
        -1.4, 0, 0,
        0, -0.4, 0,
        1.4, 0, 0,
        0, 0.4, 1.2
      ]), 3));
      coreGeom.setIndex([0,1,2, 0,2,3, 4,2,1, 4,3,2]);
      coreGeom.computeVertexNormals();
      paperRootGroup.add(createDoubleSidedMesh(coreGeom));

      // 긴 목 & 머리 힌지
      const neckGroup = new THREE.Group();
      neckGroup.position.set(0, 0, -1.2);
      const neckGeom = new THREE.CylinderGeometry(0.12, 0.25, 3.2, 8);
      const neck = new THREE.Mesh(neckGeom, frontMat);
      neck.rotation.x = Math.PI / 3;
      neck.position.set(0, 1.2, -0.8);
      neckGroup.add(neck);

      // 머리 부리
      const beak = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.8, 6), frontMat);
      beak.rotation.x = -Math.PI / 2;
      beak.position.set(0, 2.5, -1.8);
      neckGroup.add(beak);
      paperRootGroup.add(neckGroup);
      modelSpecificParts.neck = neckGroup;

      // 꼬리 힌지
      const tailGroup = new THREE.Group();
      tailGroup.position.set(0, 0, 1.2);
      const tailGeom = new THREE.ConeGeometry(0.25, 3.0, 6);
      const tail = new THREE.Mesh(tailGeom, frontMat);
      tail.rotation.x = -Math.PI / 3;
      tail.position.set(0, 1.0, 1.0);
      tailGroup.add(tail);
      paperRootGroup.add(tailGroup);
      modelSpecificParts.tail = tailGroup;

      // 좌측 커다란 학 날개
      const lWing = new THREE.Group();
      lWing.position.set(-1.4, 0, 0);
      const lWingGeom = new THREE.BufferGeometry();
      lWingGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
        0, 0, -1.2,
        -4.2, 0, 0,
        0, 0, 1.2
      ]), 3));
      lWingGeom.computeVertexNormals();
      lWing.add(createDoubleSidedMesh(lWingGeom));
      paperRootGroup.add(lWing);
      modelSpecificParts.craneWingL = lWing;

      // 우측 커다란 학 날개
      const rWing = new THREE.Group();
      rWing.position.set(1.4, 0, 0);
      const rWingGeom = new THREE.BufferGeometry();
      rWingGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
        0, 0, -1.2,
        4.2, 0, 0,
        0, 0, 1.2
      ]), 3));
      rWingGeom.computeVertexNormals();
      rWing.add(createDoubleSidedMesh(rWingGeom));
      paperRootGroup.add(rWing);
      modelSpecificParts.craneWingR = rWing;
    }

    // ==========================================
    // [4] 💖 반짝 사랑 하트 고유 3D 지오메트리
    // ==========================================
    else if (currentModelKey === 'heart') {
      // 하단 뾰족한 밑변
      const baseGeom = new THREE.BufferGeometry();
      baseGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
        -1.8, 0, 0,
        0, 0, 2.8,
        1.8, 0, 0
      ]), 3));
      baseGeom.computeVertexNormals();
      paperRootGroup.add(createDoubleSidedMesh(baseGeom));

      // 좌측 둥근 하트 엽
      const lobeL = new THREE.Group();
      lobeL.position.set(-1.0, 0, 0);
      const lobeLGeom = new THREE.CylinderGeometry(1.2, 1.2, 0.1, 24, 1, false, 0, Math.PI);
      const lobeLMesh = new THREE.Mesh(lobeLGeom, frontMat);
      lobeLMesh.rotation.x = -Math.PI / 2;
      lobeLMesh.position.set(-0.6, 0, -1.2);
      lobeL.add(lobeLMesh);
      paperRootGroup.add(lobeL);
      modelSpecificParts.heartLobeL = lobeL;

      // 우측 둥근 하트 엽
      const lobeR = new THREE.Group();
      lobeR.position.set(1.0, 0, 0);
      const lobeRGeom = new THREE.CylinderGeometry(1.2, 1.2, 0.1, 24, 1, false, 0, Math.PI);
      const lobeRMesh = new THREE.Mesh(lobeRGeom, frontMat);
      lobeRMesh.rotation.x = -Math.PI / 2;
      lobeRMesh.position.set(0.6, 0, -1.2);
      lobeR.add(lobeRMesh);
      paperRootGroup.add(lobeR);
      modelSpecificParts.heartLobeR = lobeR;
    }

    // ==========================================
    // [5] 👑 동서남북 마법 상자 고유 3D 지오메트리
    // ==========================================
    else {
      // 4개의 사각뿔 피라미드 포켓 (북, 남, 서, 동)
      const pNorth = new THREE.Group();
      pNorth.position.set(0, 0, -1.0);
      const pNorthGeom = new THREE.ConeGeometry(1.5, 2.2, 4);
      const mNorth = new THREE.Mesh(pNorthGeom, frontMat);
      mNorth.rotation.x = Math.PI / 4;
      pNorth.add(mNorth);
      paperRootGroup.add(pNorth);
      modelSpecificParts.fortuneNorth = pNorth;

      const pSouth = new THREE.Group();
      pSouth.position.set(0, 0, 1.0);
      const mSouth = new THREE.Mesh(pNorthGeom, frontMat);
      mSouth.rotation.x = -Math.PI / 4;
      pSouth.add(mSouth);
      paperRootGroup.add(pSouth);
      modelSpecificParts.fortuneSouth = pSouth;

      const pWest = new THREE.Group();
      pWest.position.set(-1.0, 0, 0);
      const mWest = new THREE.Mesh(pNorthGeom, frontMat);
      mWest.rotation.z = -Math.PI / 4;
      pWest.add(mWest);
      paperRootGroup.add(pWest);
      modelSpecificParts.fortuneWest = pWest;

      const pEast = new THREE.Group();
      pEast.position.set(1.0, 0, 0);
      const mEast = new THREE.Mesh(pNorthGeom, frontMat);
      mEast.rotation.z = Math.PI / 4;
      pEast.add(mEast);
      paperRootGroup.add(pEast);
      modelSpecificParts.fortuneEast = pEast;
    }

    threeScene.add(paperRootGroup);
  }

  // -------------------------------------------------------------
  // 5-2. 0% ~ 100% 진행도에 따른 모델별 고유 3D 물리 힌지 연산
  // -------------------------------------------------------------
  function updateThreeFold(percent) {
    document.getElementById('threeFoldPercentText').textContent = `${Math.round(percent)}%`;
    if (!paperRootGroup) return;

    const t = percent / 100; // 0.0 ~ 1.0

    if (currentModelKey === 'airplane') {
      // 🚀 비행기: 날개 힌지 회전 (0%는 평면, 100%는 활공 각도)
      if (modelSpecificParts.leftWing) modelSpecificParts.leftWing.rotation.z = -t * Math.PI * 0.75;
      if (modelSpecificParts.rightWing) modelSpecificParts.rightWing.rotation.z = t * Math.PI * 0.75;
      if (modelSpecificParts.nose) modelSpecificParts.nose.rotation.x = t * Math.PI * 0.5;
    }
    else if (currentModelKey === 'frog') {
      // 🐸 개구리: 뒷다리 Z자 계단 스프링 압축 및 앞다리 세움
      if (modelSpecificParts.spring1) modelSpecificParts.spring1.rotation.x = -t * Math.PI * 0.65;
      if (modelSpecificParts.spring2) modelSpecificParts.spring2.rotation.x = t * Math.PI * 1.35;
      if (modelSpecificParts.frontLegL) modelSpecificParts.frontLegL.rotation.y = t * Math.PI * 0.35;
      if (modelSpecificParts.frontLegR) modelSpecificParts.frontLegR.rotation.y = -t * Math.PI * 0.35;
    }
    else if (currentModelKey === 'crane') {
      // 🕊️ 전통 학: 목과 꼬리 솟아오름 & 날개 상하 펄럭임
      if (modelSpecificParts.neck) modelSpecificParts.neck.rotation.x = -t * Math.PI * 0.45;
      if (modelSpecificParts.tail) modelSpecificParts.tail.rotation.x = t * Math.PI * 0.45;
      if (modelSpecificParts.craneWingL) modelSpecificParts.craneWingL.rotation.z = Math.sin(t * Math.PI) * 0.85;
      if (modelSpecificParts.craneWingR) modelSpecificParts.craneWingR.rotation.z = -Math.sin(t * Math.PI) * 0.85;
    }
    else if (currentModelKey === 'heart') {
      // 💖 하트: 둥근 양 엽이 안쪽으로 모이며 입체 볼륨 형성
      if (modelSpecificParts.heartLobeL) modelSpecificParts.heartLobeL.rotation.y = -t * Math.PI * 0.35;
      if (modelSpecificParts.heartLobeR) modelSpecificParts.heartLobeR.rotation.y = t * Math.PI * 0.35;
    }
    else {
      // 👑 동서남북: 4개 피라미드 포켓이 오므려졌다 벌어지는 팝업
      const spread = (1 - t) * 0.8;
      if (modelSpecificParts.fortuneNorth) modelSpecificParts.fortuneNorth.position.z = -1.0 - spread;
      if (modelSpecificParts.fortuneSouth) modelSpecificParts.fortuneSouth.position.z = 1.0 + spread;
      if (modelSpecificParts.fortuneWest) modelSpecificParts.fortuneWest.position.x = -1.0 - spread;
      if (modelSpecificParts.fortuneEast) modelSpecificParts.fortuneEast.position.x = 1.0 + spread;
    }
  }

  function toggleThreeAutoPlay() {
    const btn = document.getElementById('threePlayBtn');
    const slider = document.getElementById('threeFoldSlider');
    if (threePlayInterval) {
      clearInterval(threePlayInterval);
      threePlayInterval = null;
      btn.textContent = '▶️ 3D 연속 접기 재생';
    } else {
      btn.textContent = '⏸️ 3D 일시 정지';
      let direction = 1;
      threePlayInterval = setInterval(() => {
        let val = parseFloat(slider.value) + (direction * 1.5);
        if (val >= 100) {
          val = 100;
          direction = -1;
        } else if (val <= 0) {
          val = 0;
          direction = 1;
        }
        slider.value = val;
        updateThreeFold(val);
      }, 35);
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
        
        // 3D 모델 및 Rabbit Ear 데이터 즉시 재빌드
        if (isThreeInitialized) {
          build3DPaperModel();
        }
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
        else if (activeMode === 'rabbitear') updateRabbitEarFold(parseFloat(document.getElementById('rabbitFoldSlider').value));
        else if (activeMode === '3dsim') {
          build3DPaperModel();
          updateThreeFold(parseFloat(document.getElementById('threeFoldSlider').value));
        }
      });
    });

    // [모드 1] 이전/다음 단계 버튼
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

    // [모드 2] Rabbit Ear 슬라이더 & 재생 버튼
    document.getElementById('rabbitFoldSlider')?.addEventListener('input', (e) => {
      updateRabbitEarFold(parseFloat(e.target.value));
    });
    document.getElementById('rabbitPlayBtn')?.addEventListener('click', toggleRabbitAutoPlay);

    // [모드 3] 3D Three.js 슬라이더 & 재생 버튼
    document.getElementById('threeFoldSlider')?.addEventListener('input', (e) => {
      updateThreeFold(parseFloat(e.target.value));
    });
    document.getElementById('threePlayBtn')?.addEventListener('click', toggleThreeAutoPlay);

    // 인쇄 & 보상
    document.getElementById('printPatternBtn')?.addEventListener('click', () => window.print());
    document.getElementById('claimOrigamiRewardBtn')?.addEventListener('click', completeOrigamiAndReward);
    document.getElementById('testActionBtn')?.addEventListener('click', triggerMiniGame);

    switchMode('illustrated');
  });

})();
