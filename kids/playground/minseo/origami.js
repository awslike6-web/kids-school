// 📐 고화질 마법 3D 비디오 & 단계별 종이접기 연구소 (origami.js)

(function () {
  'use strict';

  // -------------------------------------------------------------
  // 1. 종이접기 모델 정의 (비디오 타임스탬프 & 단계별 텍스트)
  // -------------------------------------------------------------
  const ORIGAMI_MODELS = {
    heart: {
      id: 'heart',
      name: '💖 마법의 반짝 사랑 하트',
      tagline: '구글 플로우 3D 비디오로 배우는 반짝이는 입체 하트',
      videoSrc: '../assets/videos/heart_origami.mp4',
      fallbackVideoSrc: '../../../uploads/ex/origami/Origami_paper_folding_into_heart_202608310525.mp4',
      hasVideo: true,
      totalSteps: 5,
      steps: [
        {
          step: 1,
          startTime: 0.0,
          endTime: 1.5,
          title: '1단계: 가운데 중심 십자선 만들기',
          desc: '색종이를 반으로 반듯하게 접었다가 펼쳐서 가운데 기준선을 만들어요.',
          tip: '💡 손톱으로 꾹꾹 눌러주면 다음 단계가 훨씬 쉬워져요!'
        },
        {
          step: 2,
          startTime: 1.5,
          endTime: 3.2,
          title: '2단계: 위쪽 모서리 삼각 접기',
          desc: '위쪽 모서리를 가운데 중심선에 맞춰 세모 모양으로 반듯하게 접어 내려요.',
          tip: '💡 꼭짓점이 중심선에 딱 닿도록 각도를 맞춰주세요.'
        },
        {
          step: 3,
          startTime: 3.2,
          endTime: 5.0,
          title: '3단계: 양쪽 날개 중심선으로 모으기',
          desc: '양쪽 날개를 가운데 선을 향해 안쪽으로 접어 하트의 기본 뼈대를 잡아요.',
          tip: '💡 양쪽 날개의 높이가 똑같은지 확인해 보세요!'
        },
        {
          step: 4,
          startTime: 5.0,
          endTime: 6.5,
          title: '4단계: 뾰족한 모서리 뒤로 넘겨 하트 완성!',
          desc: '위쪽과 양옆의 뾰족한 모서리를 뒤로 살짝 접어 넘겨 부드러운 하트를 만들어요.',
          tip: '💡 모서리를 살짝만 접어주면 귀여운 둥근 하트가 완성돼요!'
        },
        {
          step: 5,
          startTime: 6.5,
          endTime: 9.5,
          title: '5단계: ✨ 반짝이는 마법 하트 피날레!',
          desc: '완성된 하트가 반짝이는 별빛과 함께 공중으로 둥실 떠올라요!',
          tip: '💡 완성된 하트를 부모님이나 친구에게 선물해 보세요!'
        }
      ]
    },
    frog: {
      id: 'frog',
      name: '🐸 폴짝 점핑 개구리',
      tagline: '엉덩이를 톡 누르면 연잎으로 폴짝 뛰어오르는 개구리',
      videoSrc: '',
      hasVideo: false,
      totalSteps: 5,
      steps: [
        {
          step: 1,
          title: '1단계: 반으로 접어 십자(+) 기준선 만들기',
          desc: '네모 모양으로 가로와 세로를 반씩 접었다 펼쳐 십자 기준선을 만들어요.',
          tip: '💡 모서리를 꼭짓점에 정확히 맞추고 다려주세요!'
        },
        {
          step: 2,
          title: '2단계: 위쪽 삼각 주머니 모으기',
          desc: '위쪽 절반의 양옆을 안으로 오므려 넣어서 커다란 삼각 지붕을 만들어요.',
          tip: '💡 대각선을 안으로 쏙 집어넣으면 삼각 주머니가 생겨요.'
        },
        {
          step: 3,
          title: '3단계: 앞다리 올리고 몸통 반 접기',
          desc: '삼각형의 양 날개를 위로 꺾어 앞다리를 만들고, 아래쪽 종이를 올려 접어요.',
          tip: '💡 앞다리를 비스듬히 꺾으면 개구리가 힘차게 서 있어요!'
        },
        {
          step: 4,
          title: '4단계: 뒷다리 Z자 계단 스프링 접기',
          desc: '아래쪽 다리를 위로 반 접었다가, 다시 아래로 지그재그 계단 모양으로 접어요.',
          tip: '💡 이 계단 접기가 개구리 점프력의 비밀 스프링이에요!'
        },
        {
          step: 5,
          title: '5단계: 🐸 완성! 엉덩이를 톡 누르면 점프!',
          desc: '뒤집으면 귀여운 개구리 완성! 엉덩이 스프링을 톡 누르면 높이 점프해요!',
          tip: '💡 손가락으로 등을 살짝 누르며 떼면 폴짝 뛰어올라요!'
        }
      ]
    },
    airplane: {
      id: 'airplane',
      name: '🚀 슈퍼 제트 비행기',
      tagline: '바람을 가르고 가장 멀리 날아가는 초고속 제트기',
      videoSrc: '',
      hasVideo: false,
      totalSteps: 5,
      steps: [
        {
          step: 1,
          title: '1단계: 세로 중심 기준선 만들기',
          desc: '색종이를 세로로 길게 반 접었다 펼쳐서 가운데 중심 기준선을 만들어요.',
          tip: '💡 긴 세로선이 똑바를수록 비행기가 곧게 날아가요.'
        },
        {
          step: 2,
          title: '2단계: 위쪽 양 모서리 삼각 접기',
          desc: '위쪽 양 모서리를 가운데 기준선에 딱 맞춰 세모 모양으로 접어요.',
          tip: '💡 꼭짓점이 가운데 선에 딱 닿도록 반듯하게 접어주세요.'
        },
        {
          step: 3,
          title: '3단계: 삼각형 머리를 아래로 푹 숙이기',
          desc: '접힌 위쪽 삼각형을 아래로 덮듯이 푹 숙여서 편지 봉투 모양으로 만들어요.',
          tip: '💡 편지 봉투처럼 접힌 머리가 비행기의 무게중심을 잡아줘요.'
        },
        {
          step: 4,
          title: '4단계: 양 모서리 모으고 삼각 탭 잠그기',
          desc: '위쪽 모서리를 다시 중심선으로 모아 접은 뒤, 아래 삼각 탭을 올려 잠궈요.',
          tip: '💡 아래 작은 세모 탭을 올리면 날개가 풀리지 않아요.'
        },
        {
          step: 5,
          title: '5단계: 🚀 반으로 접어 양 날개 쫙 펼치기!',
          desc: '몸통을 반으로 접은 뒤, 양쪽 날개를 좌우로 수평하게 꺾어 펼치면 완성!',
          tip: '💡 날개 끝을 살짝 위로 올려주면 훨씬 멀리 활공해요!'
        }
      ]
    },
    crane: {
      id: 'crane',
      name: '🕊️ 전통 종이학',
      tagline: '종이접기의 정석! 날개가 펄럭이는 전통 학',
      videoSrc: '',
      hasVideo: false,
      totalSteps: 5,
      steps: [
        {
          step: 1,
          title: '1단계: 사각 주머니 기본 접기',
          desc: '십자(+)와 X자로 접은 뒤 네 모서리를 모아 마름모 사각 주머니를 만들어요.',
          tip: '💡 중심선을 선명하게 다린 후 모아주세요.'
        },
        {
          step: 2,
          title: '2단계: 아이스크림 접기 후 위로 벌리기',
          desc: '양 모서리를 중심선으로 접고 윗 뚜껑을 들어 올려 길쭉한 날개 틀을 만들어요.',
          tip: '💡 양 날개를 가운데 선에 맞춘 뒤 펴 올려요.'
        },
        {
          step: 3,
          title: '3단계: 뒤집어서 반대쪽도 똑같이 올리기',
          desc: '종이를 뒤집어 뒤쪽도 똑같이 아이스크림 모양으로 접어 올려요.',
          tip: '💡 앞뒷면이 똑같은 다이아몬드 모양이 되도록 접어요.'
        },
        {
          step: 4,
          title: '4단계: 머리와 꼬리를 안쪽으로 올려 접기',
          desc: '양쪽 얇은 다리를 몸통 안쪽으로 꺾어 올려 머리와 꼬리를 만들어요.',
          tip: '💡 안쪽 접기로 목과 꼬리를 세워요.'
        },
        {
          step: 5,
          title: '5단계: 🕊️ 머리 부리를 꺾고 양 날개 펼치기!',
          desc: '한쪽 끝을 꺾어 부리를 만들고, 양 날개를 부드럽게 당겨 몸통을 부풀리면 완성!',
          tip: '💡 날개 아래쪽을 살살 당기면 학이 입체로 부풀어 올라요!'
        }
      ]
    }
  };

  let currentModelKey = 'heart';
  let currentStepIdx = 0; // 0-based
  let currentPlaybackRate = 1.0;
  let targetStepEndTime = null;
  let hasAwardedForCurrentRun = false;

  const videoElem = document.getElementById('origamiMainVideo');

  // -------------------------------------------------------------
  // 2. 모델 선택 및 뷰 초기화
  // -------------------------------------------------------------
  function loadModel(modelKey) {
    currentModelKey = modelKey;
    currentStepIdx = 0;
    targetStepEndTime = null;
    hasAwardedForCurrentRun = false;

    const model = ORIGAMI_MODELS[modelKey];
    document.getElementById('currentOrigamiTitle').textContent = model.name;
    document.getElementById('currentOrigamiTagline').textContent = model.tagline;

    // 비디오 지원 여부에 따른 UI 분기
    const videoSection = document.getElementById('videoPlayerSection');
    const illustrationSection = document.getElementById('illustrationSection');
    const stepTabsContainer = document.getElementById('stepButtonsContainer');

    if (model.hasVideo) {
      videoSection.style.display = 'block';
      illustrationSection.style.display = 'none';

      // 비디오 소스 설정
      videoElem.src = model.videoSrc;
      videoElem.load();
      videoElem.playbackRate = currentPlaybackRate;
    } else {
      videoSection.style.display = 'none';
      illustrationSection.style.display = 'block';
      renderIllustratedStep();
    }

    // 단계별 버튼 렌더링
    renderStepButtons(model);
    updateStepText(0);
  }

  // -------------------------------------------------------------
  // 3. 단계별 버튼 UI 렌더링
  // -------------------------------------------------------------
  function renderStepButtons(model) {
    const container = document.getElementById('stepButtonsContainer');
    container.innerHTML = '';

    model.steps.forEach((st, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `step-pill-btn ${idx === 0 ? 'active' : ''}`;
      btn.dataset.stepIdx = idx;
      btn.innerHTML = `<span>${idx === model.steps.length - 1 ? '💖' : '👉'}</span> <b>${st.step}단계</b>`;
      
      btn.addEventListener('click', () => {
        jumpToStep(idx);
      });

      container.appendChild(btn);
    });
  }

  // -------------------------------------------------------------
  // 4. 비디오 스텝 점프 및 타임스탬프 동기화
  // -------------------------------------------------------------
  function jumpToStep(idx) {
    const model = ORIGAMI_MODELS[currentModelKey];
    if (idx < 0 || idx >= model.steps.length) return;

    currentStepIdx = idx;
    updateStepActiveBtn(idx);
    updateStepText(idx);

    if (model.hasVideo && videoElem) {
      const step = model.steps[idx];
      videoElem.currentTime = step.startTime;
      targetStepEndTime = step.endTime;
      videoElem.play();
      updatePlayPauseBtn(true);

      if (window.StarrDropEngine && window.StarrDropEngine.AudioEngine) {
        window.StarrDropEngine.AudioEngine.playTap(1.1 + idx * 0.15);
      }
    } else {
      renderIllustratedStep();
    }
  }

  function updateStepActiveBtn(idx) {
    document.querySelectorAll('.step-pill-btn').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.stepIdx, 10) === idx);
    });
  }

  function updateStepText(idx) {
    const model = ORIGAMI_MODELS[currentModelKey];
    const st = model.steps[idx];

    document.getElementById('stepTitleBadge').textContent = st.title;
    document.getElementById('stepDescText').textContent = st.desc;
    document.getElementById('stepTipText').textContent = st.tip;
    document.getElementById('stepProgressIndicator').textContent = `${st.step} / ${model.totalSteps} 단계`;

    // 이전/다음 버튼 활성화 제어
    document.getElementById('prevStepBtn').disabled = (idx === 0);
    document.getElementById('nextStepBtn').disabled = (idx === model.totalSteps - 1);

    // 마지막 단계일 경우 완성 보상 영역 표시
    const completeArea = document.getElementById('origamiCompleteArea');
    if (completeArea) {
      completeArea.style.display = (idx === model.totalSteps - 1) ? 'block' : 'none';
    }
  }

  // -------------------------------------------------------------
  // 5. 비디오 타임스탬프 리스너 & 피날레 잭팟 연동
  // -------------------------------------------------------------
  if (videoElem) {
    videoElem.addEventListener('timeupdate', () => {
      const model = ORIGAMI_MODELS[currentModelKey];
      if (!model || !model.hasVideo) return;

      const curTime = videoElem.currentTime;

      // 1. 프로그레스 바 갱신
      if (videoElem.duration) {
        const pct = (curTime / videoElem.duration) * 100;
        document.getElementById('videoProgressBar').style.width = `${pct}%`;
      }

      // 2. 단계별 자동 일시정지 (Step-by-Step Stop)
      if (targetStepEndTime !== null && curTime >= targetStepEndTime) {
        videoElem.pause();
        targetStepEndTime = null;
        updatePlayPauseBtn(false);
      }

      // 3. 현재 시간에 따른 활성 스텝 버튼 자동 동기화
      model.steps.forEach((st, idx) => {
        if (curTime >= st.startTime && curTime < st.endTime) {
          if (currentStepIdx !== idx && targetStepEndTime === null) {
            currentStepIdx = idx;
            updateStepActiveBtn(idx);
            updateStepText(idx);
          }
        }
      });

      // 4. 마법 피날레 (7.0초 이후 마법 하트 등장 시 효과음 & 보상 활성화)
      if (curTime >= 7.0 && !hasAwardedForCurrentRun) {
        hasAwardedForCurrentRun = true;
        if (window.StarrDropEngine && window.StarrDropEngine.AudioEngine) {
          window.StarrDropEngine.AudioEngine.playFanfare(4);
        }
      }
    });

    videoElem.addEventListener('ended', () => {
      updatePlayPauseBtn(false);
      targetStepEndTime = null;
    });

    // 비디오 로드 에러 시 fallback 경로 자동 전환
    videoElem.addEventListener('error', () => {
      const model = ORIGAMI_MODELS[currentModelKey];
      if (model && model.fallbackVideoSrc && videoElem.src !== model.fallbackVideoSrc) {
        videoElem.src = model.fallbackVideoSrc;
        videoElem.load();
      }
    });
  }

  function updatePlayPauseBtn(isPlaying) {
    const btn = document.getElementById('playPauseVideoBtn');
    if (btn) {
      btn.innerHTML = isPlaying ? '<span>⏸️ 일시 정지</span>' : '<span>▶️ 재생하기</span>';
    }
  }

  // -------------------------------------------------------------
  // 6. 노션 보상 실시간 연동 (하리보 젤리/다이아 +2개)
  // -------------------------------------------------------------
  async function completeAndClaimReward() {
    const isSon = localStorage.getItem('currentUser') === 'son';
    const rewardName = isSon ? '💎 다이아몬드 +2개' : '🍬 하리보 젤리 +2개';

    // 1. 노션 인벤토리 DB 연동 호출
    if (typeof window.grantRewardAndShowUI === 'function') {
      try {
        await window.grantRewardAndShowUI(2, false, 'origami');
      } catch (err) {
        console.warn('노션 보상 우회:', err);
      }
    } else if (typeof window.triggerAwardDispense === 'function') {
      await window.triggerAwardDispense(2);
    }

    // 2. 스타드롭 및 트로피 추가
    if (window.StarrDropEngine) {
      window.StarrDropEngine.addTrophies(50);
      window.StarrDropEngine.addDrop(1);
      if (window.StarrDropEngine.AudioEngine) {
        window.StarrDropEngine.AudioEngine.playFanfare(4);
      }
    }

    alert(`🎉 와아! [${ORIGAMI_MODELS[currentModelKey].name}] 접기를 완벽하게 성공했어!\n\n노션 보상: ${rewardName} 획득!\n🏆 트로피 +50점 & 🎁 스타 드롭 1개 충전 완료!`);
    window.location.href = '../minsu/starr_drop.html';
  }

  // -------------------------------------------------------------
  // 7. 기타 비디오 없는 모델용 일러스트 렌더러
  // -------------------------------------------------------------
  function renderIllustratedStep() {
    const canvas = document.getElementById('illustrationCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width = 560;
    const h = canvas.height = 380;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, w, h);

    // 안내 카드
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(w / 2, h / 2 - 20, 80, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px Jua';
    ctx.textAlign = 'center';
    ctx.fillText('🐸', w / 2, h / 2 - 10);

    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 20px Jua';
    ctx.fillText(`${currentStepIdx + 1}단계 도안을 따라 접어보세요!`, w / 2, h / 2 + 80);
  }

  // -------------------------------------------------------------
  // 8. 이벤트 바인딩
  // -------------------------------------------------------------
  document.addEventListener('DOMContentLoaded', () => {
    // 모델 선택 버튼
    document.querySelectorAll('.origami-model-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.origami-model-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        loadModel(e.currentTarget.dataset.model);
      });
    });

    // 비디오 전체 재생/일시정지 버튼
    document.getElementById('playPauseVideoBtn')?.addEventListener('click', () => {
      if (videoElem.paused) {
        targetStepEndTime = null;
        videoElem.play();
        updatePlayPauseBtn(true);
      } else {
        videoElem.pause();
        updatePlayPauseBtn(false);
      }
    });

    // 비디오 처음부터 다시보기
    document.getElementById('replayVideoBtn')?.addEventListener('click', () => {
      jumpToStep(0);
    });

    // 배속 조절 (0.75x, 1.0x, 1.25x)
    document.querySelectorAll('.speed-pill-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.speed-pill-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        currentPlaybackRate = parseFloat(e.currentTarget.dataset.speed);
        if (videoElem) videoElem.playbackRate = currentPlaybackRate;
      });
    });

    // 이전/다음 단계 버튼
    document.getElementById('prevStepBtn')?.addEventListener('click', () => {
      if (currentStepIdx > 0) jumpToStep(currentStepIdx - 1);
    });

    document.getElementById('nextStepBtn')?.addEventListener('click', () => {
      const model = ORIGAMI_MODELS[currentModelKey];
      if (currentStepIdx < model.steps.length - 1) jumpToStep(currentStepIdx + 1);
    });

    // 완성 보상 및 인쇄
    document.getElementById('claimOrigamiRewardBtn')?.addEventListener('click', completeAndClaimReward);
    document.getElementById('printPatternBtn')?.addEventListener('click', () => window.print());

    // 초기 하트 모델 로드
    loadModel('heart');
  });

})();
