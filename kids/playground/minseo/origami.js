// 📐 3D/동적 인터랙티브 종이접기 연구소 코어 엔진 (origami.js)

(function () {
  'use strict';

  // -------------------------------------------------------------
  // 1. 5종 인기 종이접기 단계별 데이터 정의
  // -------------------------------------------------------------
  const ORIGAMI_MODELS = {
    airplane: {
      id: 'airplane',
      name: '🚀 슈퍼 제트 비행기',
      desc: '가장 멀리 날아가는 날렵한 제트기! 날개를 꼼꼼하게 접어보세요.',
      interactiveType: 'flight', // 완성 후 비행 시뮬레이터
      totalSteps: 5,
      steps: [
        {
          step: 1,
          title: '가운데 중심선 만들기',
          desc: '색종이를 세로로 길게 반으로 접었다가 펼쳐서 가운데 기준선을 만들어요.',
          foldLine: 'center-vertical',
          arrow: 'fold-right-to-left'
        },
        {
          step: 2,
          title: '위쪽 양쪽 모서리 삼각 접기',
          desc: '위쪽의 양 모서리를 가운데 중심선에 맞춰 세모 모양으로 가지런히 접어요.',
          foldLine: 'top-corners',
          arrow: 'fold-inward'
        },
        {
          step: 3,
          title: '삼각형 뾰족한 머리 아래로 내리기',
          desc: '접힌 위쪽 삼각형을 아래쪽으로 덮듯이 푹 숙여서 편지 봉투 모양으로 접어요.',
          foldLine: 'horizontal-crease',
          arrow: 'fold-down'
        },
        {
          step: 4,
          title: '다시 양쪽 모서리를 중심선으로 접기',
          desc: '위쪽 양쪽 모서리를 가운데 기준선으로 다시 모아 접고, 아래 튀어나온 작은 삼각 탭을 위로 올려 잠궈요.',
          foldLine: 'inner-corners',
          arrow: 'fold-inward-lock'
        },
        {
          step: 5,
          title: '반으로 뒤집어 접고 양 날개 펼치기!',
          desc: '몸통을 반으로 바깥쪽으로 접은 뒤, 양쪽 날개를 좌우로 반듯하게 꺾어 펼치면 완성!',
          foldLine: 'wings',
          arrow: 'fold-wings'
        }
      ]
    },
    frog: {
      id: 'frog',
      name: '🐸 폴짝 점핑 개구리',
      desc: '엉덩이를 톡 누르면 진짜로 폴짝 뛰어오르는 마법의 개구리!',
      interactiveType: 'jump', // 완성 후 점프 미니게임
      totalSteps: 5,
      steps: [
        {
          step: 1,
          title: '가로 세로 반 접기',
          desc: '네모 모양으로 가로와 세로를 반씩 접었다 펼쳐 십자(+) 기준선을 만들어요.',
          foldLine: 'cross',
          arrow: 'fold-cross'
        },
        {
          step: 2,
          title: '위쪽 삼각 주머니 접기',
          desc: '위쪽 절반의 대각선을 접어 양쪽을 쏙 집어넣어 삼각 지붕 주머니를 만들어요.',
          foldLine: 'triangle-pocket',
          arrow: 'fold-pocket'
        },
        {
          step: 3,
          title: '앞다리와 몸통 모으기',
          desc: '삼각형의 양쪽 날개를 위로 꺾어 앞다리를 만들고, 아래쪽 몸통을 반으로 올려 접어요.',
          foldLine: 'front-legs',
          arrow: 'fold-legs'
        },
        {
          step: 4,
          title: '뒷다리 계단 접기 (스프링 만들기)',
          desc: '아래쪽 다리를 위로 반 접었다가, 다시 아래로 지그재그(계단 모양)로 접어 점프 스프링을 만들어요.',
          foldLine: 'spring-fold',
          arrow: 'fold-accordion'
        },
        {
          step: 5,
          title: '뒤집어서 눈 스티커 붙이면 완성!',
          desc: '뒤집으면 귀여운 개구리 완성! 엉덩이 스프링 부분을 손가락으로 누르면 폴짝 뛰어올라요!',
          foldLine: 'finish',
          arrow: 'none'
        }
      ]
    },
    fortune: {
      id: 'fortune',
      name: '👑 동서남북 마법 상자',
      desc: '손가락에 끼워 동서남북 몇 번! 비밀 퀴즈와 소원을 담아 놀아요.',
      interactiveType: 'fortune',
      totalSteps: 4,
      steps: [
        {
          step: 1,
          title: '대각선 X자 기준선 만들기',
          desc: '색종이를 세모 모양으로 양쪽 대각선을 접었다 펼쳐서 가운데 중심점(X)을 찾아요.',
          foldLine: 'diagonal-x',
          arrow: 'fold-diagonal'
        },
        {
          step: 2,
          title: '네 모서리를 가운데로 모아 방석 접기',
          desc: '색종이의 네 모서리 끝을 모두 가운데 중심점으로 딱 맞추어 접어요 (방석 접기).',
          foldLine: 'cushion-front',
          arrow: 'fold-4corners'
        },
        {
          step: 3,
          title: '뒤집어서 다시 네 모서리를 가운데로!',
          desc: '종이를 뒤집은 다음, 다시 한번 네 모서리를 가운데 중심점으로 가지런히 모아 접어요.',
          foldLine: 'cushion-back',
          arrow: 'fold-4corners-back'
        },
        {
          step: 4,
          title: '반으로 접어 입체 주머니 손가락 끼우기',
          desc: '네모 모양으로 반 접은 뒤 네 군데 주머니 속에 양손 엄지와 검지를 쏙 집어넣어 벌리면 완성!',
          foldLine: 'finish-pocket',
          arrow: 'pop-open'
        }
      ]
    },
    heart: {
      id: 'heart',
      name: '💖 반짝 입체 사랑 하트',
      desc: '마음을 전하는 귀여운 하트! 편지를 써서 친구나 부모님께 선물해요.',
      interactiveType: 'heart_beat',
      totalSteps: 4,
      steps: [
        {
          step: 1,
          title: '삼각형으로 대각선 접기',
          desc: '색종이를 반으로 접어 커다란 세모 모양을 만든 뒤 가운데 중심선을 만들어요.',
          foldLine: 'triangle-center',
          arrow: 'fold-diagonal'
        },
        {
          step: 2,
          title: '위쪽 꼭짓점과 아래 꼭짓점 모으기',
          desc: '위쪽 한 겹은 아래 밑변으로 내리고, 아래쪽 꼭짓점은 위쪽 끝으로 덮어 올려요.',
          foldLine: 'top-down-bottom-up',
          arrow: 'fold-vertical'
        },
        {
          step: 3,
          title: '양 날개를 위로 꺾어 올리기',
          desc: '아래쪽 양 날개를 가운데 중심선에 맞춰 비스듬히 위쪽으로 꺾어 올려 하트 틀을 잡아요.',
          foldLine: 'wing-up',
          arrow: 'fold-wings-up'
        },
        {
          step: 4,
          title: '모서리 둥글게 다듬기',
          desc: '위쪽과 양옆의 뾰족한 모서리를 뒤로 살짝 접어 부드러운 하트 곡선을 만들면 완성!',
          foldLine: 'round-corners',
          arrow: 'fold-tuck'
        }
      ]
    },
    ttakji: {
      id: 'ttakji',
      name: '🪓 천하무적 딱지',
      desc: '두 장의 색종이가 합체! 단단하고 묵직한 딱지 배틀의 최강자.',
      interactiveType: 'slam',
      totalSteps: 4,
      steps: [
        {
          step: 1,
          title: '색종이 2장을 3등분으로 길게 접기',
          desc: '서로 다른 색깔의 색종이 2장을 각각 가로로 3등분하여 길쭉한 직사각형 2개를 만들어요.',
          foldLine: 'tri-fold',
          arrow: 'fold-3lines'
        },
        {
          step: 2,
          title: '양 끝을 45도 삼각형으로 꺾기',
          desc: '길쭉한 종이의 양쪽 끝 모서리를 서로 반대 방향으로 45도 꺾어 바람개비 날개처럼 만들어요.',
          foldLine: 'wings-45',
          arrow: 'fold-angles'
        },
        {
          step: 3,
          title: '두 종이를 십자(+)로 교차해 겹치기',
          desc: '두 종이를 가운데에 십자 모양으로 직각으로 포개어 올려놓아요.',
          foldLine: 'cross-overlap',
          arrow: 'overlay'
        },
        {
          step: 4,
          title: '시계 방향으로 네 날개를 차례로 끼워 넣기',
          desc: '아래, 오른쪽, 위, 왼쪽 날개를 시계 방향으로 순서대로 접어 마지막 틈새에 쏙 끼우면 단단한 딱지 완성!',
          foldLine: 'wind-lock',
          arrow: 'tuck-in'
        }
      ]
    }
  };

  let currentModelKey = 'frog';
  let currentStepIndex = 0; // 0-based
  let currentColor = '#4ade80'; // 기본 초록 (개구리)
  let currentPattern = 'solid'; // 'solid' | 'dots' | 'stripes' | 'stars'

  // -------------------------------------------------------------
  // 2. 단계별 2D/3D 종이접기 Canvas 렌더러
  // -------------------------------------------------------------
  const origamiCanvas = document.getElementById('origamiCanvas');
  const oCtx = origamiCanvas?.getContext('2d');

  function renderOrigamiStep() {
    if (!origamiCanvas || !oCtx) return;
    const model = ORIGAMI_MODELS[currentModelKey];
    const stepInfo = model.steps[currentStepIndex];
    const total = model.totalSteps;

    const w = origamiCanvas.width = 540;
    const h = origamiCanvas.height = 420;

    oCtx.clearRect(0, 0, w, h);

    // 배경 부드러운 방 모눈종이
    oCtx.fillStyle = '#ffffff';
    oCtx.fillRect(0, 0, w, h);
    drawGridBackground(oCtx, w, h);

    // 종이 중심점
    const cx = w / 2;
    const cy = h / 2;
    const size = 180;

    // 단계별 종이 형상 렌더링
    drawPaperShape(oCtx, cx, cy, size, currentModelKey, currentStepIndex, currentColor, currentPattern);

    // 접는 점선 및 화살표 가이드 렌더링
    drawFoldGuides(oCtx, cx, cy, size, stepInfo);

    // UI 텍스트 동기화
    document.getElementById('stepTitle').textContent = `${stepInfo.step}단계: ${stepInfo.title}`;
    document.getElementById('stepDesc').textContent = stepInfo.desc;
    document.getElementById('stepIndicator').textContent = `${stepInfo.step} / ${total} 단계`;

    // 이전/다음 버튼 제어
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

  function drawGridBackground(ctx, w, h) {
    ctx.strokeStyle = 'rgba(0,0,0,0.04)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 30) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += 30) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
  }

  // -------------------------------------------------------------
  // 3. 종이 형상 그리기 (패턴 및 음영)
  // -------------------------------------------------------------
  function drawPaperShape(ctx, cx, cy, size, modelKey, stepIdx, color, pattern) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.strokeStyle = '#2d3748';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // 그림자
    ctx.shadowColor = 'rgba(0,0,0,0.12)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetY = 8;

    if (stepIdx === 0) {
      // 1단계: 기본 펼쳐진 정사각형
      ctx.beginPath();
      ctx.rect(cx - size / 2, cy - size / 2, size, size);
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.stroke();
    } else if (stepIdx === 1) {
      // 2단계
      if (modelKey === 'airplane' || modelKey === 'frog') {
        ctx.beginPath();
        ctx.moveTo(cx - size / 2, cy + size / 2);
        ctx.lineTo(cx + size / 2, cy + size / 2);
        ctx.lineTo(cx + size / 2, cy);
        ctx.lineTo(cx, cy - size / 2);
        ctx.lineTo(cx - size / 2, cy);
        ctx.closePath();
        ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(cx, cy - size / 2);
        ctx.lineTo(cx + size / 2, cy);
        ctx.lineTo(cx, cy + size / 2);
        ctx.lineTo(cx - size / 2, cy);
        ctx.closePath();
        ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.stroke();
      }
    } else if (stepIdx === 2) {
      // 3단계
      ctx.beginPath();
      ctx.moveTo(cx - size / 2, cy + size / 2);
      ctx.lineTo(cx + size / 2, cy + size / 2);
      ctx.lineTo(cx + size / 3, cy - size / 4);
      ctx.lineTo(cx, cy - size / 3);
      ctx.lineTo(cx - size / 3, cy - size / 4);
      ctx.closePath();
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.stroke();
    } else if (stepIdx >= 3) {
      // 완성 단계에 가까운 완성형 실루엣
      if (modelKey === 'airplane') {
        // 비행기 삼각 날개 실루엣
        ctx.beginPath();
        ctx.moveTo(cx, cy - size / 1.5);
        ctx.lineTo(cx + size / 1.8, cy + size / 2);
        ctx.lineTo(cx + size / 8, cy + size / 2.5);
        ctx.lineTo(cx, cy + size / 2);
        ctx.lineTo(cx - size / 8, cy + size / 2.5);
        ctx.lineTo(cx - size / 1.8, cy + size / 2);
        ctx.closePath();
        ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.stroke();
      } else if (modelKey === 'frog') {
        // 개구리 실루엣 + 눈
        ctx.beginPath();
        ctx.moveTo(cx, cy - size / 2);
        ctx.lineTo(cx + size / 2.2, cy);
        ctx.lineTo(cx + size / 3, cy + size / 2.2);
        ctx.lineTo(cx - size / 3, cy + size / 2.2);
        ctx.lineTo(cx - size / 2.2, cy);
        ctx.closePath();
        ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.stroke();

        // 개구리 눈 스티커
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(cx - size / 4, cy - size / 3, 14, 0, Math.PI * 2);
        ctx.arc(cx + size / 4, cy - size / 3, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(cx - size / 4, cy - size / 3, 6, 0, Math.PI * 2);
        ctx.arc(cx + size / 4, cy - size / 3, 6, 0, Math.PI * 2);
        ctx.fill();
      } else if (modelKey === 'heart') {
        // 하트 실루엣
        ctx.beginPath();
        ctx.moveTo(cx, cy + size / 2.2);
        ctx.bezierCurveTo(cx - size / 1.5, cy, cx - size / 1.5, cy - size / 2, cx, cy - size / 4);
        ctx.bezierCurveTo(cx + size / 1.5, cy - size / 2, cx + size / 1.5, cy, cx, cy + size / 2.2);
        ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.stroke();
      } else {
        // 딱지/동서남북
        ctx.beginPath();
        ctx.rect(cx - size / 2.5, cy - size / 2.5, size / 1.25, size / 1.25);
        ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  // -------------------------------------------------------------
  // 4. 가이드 점선 및 접는 화살표 그리기
  // -------------------------------------------------------------
  function drawFoldGuides(ctx, cx, cy, size, stepInfo) {
    ctx.save();
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([8, 6]);

    // 기준 접는 점선
    if (stepInfo.foldLine === 'center-vertical') {
      ctx.beginPath();
      ctx.moveTo(cx, cy - size / 2);
      ctx.lineTo(cx, cy + size / 2);
      ctx.stroke();
    } else if (stepInfo.foldLine === 'top-corners') {
      ctx.beginPath();
      ctx.moveTo(cx - size / 2, cy - size / 2);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx + size / 2, cy - size / 2);
      ctx.stroke();
    }

    ctx.setLineDash([]);

    // 접는 방향 안내 화살표
    ctx.fillStyle = '#ff3838';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('↪️', cx + 20, cy);

    ctx.restore();
  }

  // -------------------------------------------------------------
  // 5. 완성 후 미니 인터랙티브 시뮬레이터 (개구리 점프 / 비행기 날리기)
  // -------------------------------------------------------------
  function triggerMiniGame() {
    const model = ORIGAMI_MODELS[currentModelKey];
    if (window.StarrDropEngine && window.StarrDropEngine.AudioEngine) {
      window.StarrDropEngine.AudioEngine.playFanfare(3);
    }

    if (model.interactiveType === 'jump') {
      // 개구리 점프 애니메이션
      let jumpY = 0;
      let jumpVelocity = -14;
      const jumpAnim = () => {
        jumpY += jumpVelocity;
        jumpVelocity += 0.8;
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
      // 비행기 날리기 애니메이션
      origamiCanvas.style.transition = 'transform 1s cubic-bezier(0.25, 1, 0.5, 1)';
      origamiCanvas.style.transform = 'translate(180px, -120px) rotate(15deg) scale(0.6)';
      setTimeout(() => {
        origamiCanvas.style.transform = 'translate(0, 0) rotate(0deg) scale(1)';
      }, 1200);
    }
  }

  // -------------------------------------------------------------
  // 6. 노션 보상 지급 연동 브릿지 (다이아몬드/하리보 +2개)
  // -------------------------------------------------------------
  async function completeOrigamiAndReward() {
    const isSon = localStorage.getItem('currentUser') === 'son';
    const rewardName = isSon ? '💎 다이아몬드 +2개' : '🍬 하리보 젤리 +2개';

    // 1. 노션 인벤토리 DB 연동 호출 (core.js / notion-helper.js 브릿지)
    if (typeof window.grantRewardAndShowUI === 'function') {
      try {
        await window.grantRewardAndShowUI(2, false, 'origami');
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
    }

    triggerMiniGame();

    setTimeout(() => {
      alert(`🎉 와아! [${ORIGAMI_MODELS[currentModelKey].name}] 접기를 완벽하게 성공했어!\n\n노션 보상: ${rewardName} 획득!\n🏆 트로피 +50점 & 🎁 스타 드롭 1개 충전 완료!`);
      window.location.href = '../minsu/starr_drop.html';
    }, 600);
  }

  // -------------------------------------------------------------
  // 7. A4 전용 색종이 도안 출력 (Print Template)
  // -------------------------------------------------------------
  function printOrigamiPattern() {
    window.print();
  }

  // -------------------------------------------------------------
  // 8. 전역 초기화 및 이벤트 리스너
  // -------------------------------------------------------------
  document.addEventListener('DOMContentLoaded', () => {
    // 모델 선택 버튼
    document.querySelectorAll('.origami-model-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.origami-model-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        currentModelKey = e.currentTarget.dataset.model;
        currentStepIndex = 0;
        renderOrigamiStep();
      });
    });

    // 색상 칩
    document.querySelectorAll('.origami-color-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        document.querySelectorAll('.origami-color-chip').forEach(c => c.classList.remove('active'));
        e.currentTarget.classList.add('active');
        currentColor = e.currentTarget.dataset.color;
        renderOrigamiStep();
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

    // 도안 인쇄 및 완료 보상 버튼
    document.getElementById('printPatternBtn')?.addEventListener('click', printOrigamiPattern);
    document.getElementById('claimOrigamiRewardBtn')?.addEventListener('click', completeOrigamiAndReward);
    document.getElementById('testActionBtn')?.addEventListener('click', triggerMiniGame);

    renderOrigamiStep();
  });

})();
