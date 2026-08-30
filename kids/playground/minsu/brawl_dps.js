// ⚔️ 브롤스타즈 DPS & 밸런스 연구소 코어 스크립트 (brawl_dps.js)

(function () {
  'use strict';

  // -------------------------------------------------------------
  // 1. 브롤러 프리셋 데이터 (공식 스탯 기반)
  // -------------------------------------------------------------
  const BRAWLERS = {
    colt: {
      name: '콜트 (Colt)',
      icon: '🤠',
      hp: 5600,
      damagePerBullet: 720,
      bulletsPerAttack: 6,
      reloadTime: 1.7, // 초
      range: '장거리 (9.0칸)',
      hyperchargeMultiplier: 1.25,
      desc: '초당 6발의 총알을 쏟아붓는 저격수! 정밀한 에임과 곱셈 연산이 필수.'
    },
    shelly: {
      name: '쉘리 (Shelly)',
      icon: '💥',
      hp: 7400,
      damagePerBullet: 600,
      bulletsPerAttack: 5,
      reloadTime: 1.5,
      range: '중거리 (7.6칸)',
      hyperchargeMultiplier: 1.25,
      desc: '근접 샷건 폭딜의 대명사! 탄환 5발을 모두 맞출 때의 위력을 계산해보자.'
    },
    frank: {
      name: '프랭크 (Frank)',
      icon: '🔨',
      hp: 14000,
      damagePerBullet: 2480,
      bulletsPerAttack: 1,
      reloadTime: 0.8,
      range: '근/중거리 (6.0칸)',
      hyperchargeMultiplier: 1.20,
      desc: '초대형 체력 탱커! 해머 공격으로 묵직한 한 방 피해를 줌.'
    },
    spike: {
      name: '스파이크 (Spike)',
      icon: '🌵',
      hp: 4800,
      damagePerBullet: 1120,
      bulletsPerAttack: 6,
      reloadTime: 2.0,
      range: '중거리 (7.6칸)',
      hyperchargeMultiplier: 1.25,
      desc: '가시 수류탄이 6방향으로 퍼지는 광역 딜러.'
    },
    edgar: {
      name: '에드가 (Edgar)',
      icon: '🧣',
      hp: 6600,
      damagePerBullet: 1080,
      bulletsPerAttack: 2,
      reloadTime: 0.7,
      range: '초근접 (2.0칸)',
      hyperchargeMultiplier: 1.25,
      desc: '빛의 속도로 목도리 연타를 날리는 암살자.'
    }
  };

  let currentBrawlerKey = 'colt';
  let isHypercharge = false;
  let hasShieldGear = false; // 상대 실드 기어 (피해량 0.8배)

  // -------------------------------------------------------------
  // 2. 5학년 수학 연계 DPS 및 데미지 계산 엔진
  // -------------------------------------------------------------
  function calculateStats() {
    const data = getActiveBrawlerData();

    // 1회 공격 피해량 = 탄환당 데미지 × 탄환 수
    let singleAttackDamage = data.damagePerBullet * data.bulletsPerAttack;

    // 하이퍼차지 배율 (소수의 곱셈: × 1.25)
    if (isHypercharge) {
      singleAttackDamage = Math.round(singleAttackDamage * data.hyperchargeMultiplier);
    }

    // 상대 실드 기어 적용 (소수의 곱셈: × 0.8)
    if (hasShieldGear) {
      singleAttackDamage = Math.round(singleAttackDamage * 0.8);
    }

    // 탄창 3발 순간 폭딜 (Burst Damage)
    const burstDamage = singleAttackDamage * 3;

    // 지속 DPS (초당 피해량) = (3회 공격 피해량) / (3발 발사 + 3발 장전 시간)
    const totalCycleTime = 1.0 + (data.reloadTime * 3);
    const sustainedDps = Math.round(burstDamage / totalCycleTime);

    // 타겟(체력 10,000 기준) 처치 시간(TTK) 계산
    const targetHp = parseInt(document.getElementById('targetHpInput')?.value || 10000, 10);
    const attacksNeeded = Math.ceil(targetHp / singleAttackDamage);
    const timeToKill = attacksNeeded <= 3 
      ? (attacksNeeded * 0.35).toFixed(2)
      : (1.0 + (attacksNeeded - 3) * data.reloadTime).toFixed(2);

    // UI 렌더링
    renderStatDisplay({
      singleAttackDamage,
      burstDamage,
      sustainedDps,
      attacksNeeded,
      timeToKill,
      targetHp,
      data
    });
  }

  function getActiveBrawlerData() {
    if (currentBrawlerKey === 'custom') {
      return {
        name: '내가 만든 커스텀 브롤러',
        icon: '🤖',
        hp: parseInt(document.getElementById('customHp')?.value || 6000, 10),
        damagePerBullet: parseInt(document.getElementById('customDmg')?.value || 800, 10),
        bulletsPerAttack: parseInt(document.getElementById('customBullets')?.value || 3, 10),
        reloadTime: parseFloat(document.getElementById('customReload')?.value || 1.5),
        range: '커스텀',
        hyperchargeMultiplier: 1.25
      };
    }
    return BRAWLERS[currentBrawlerKey];
  }

  function renderStatDisplay(calc) {
    document.getElementById('statSingleDmg').textContent = calc.singleAttackDamage.toLocaleString();
    document.getElementById('statBurstDmg').textContent = calc.burstDamage.toLocaleString();
    document.getElementById('statDps').textContent = calc.sustainedDps.toLocaleString();
    document.getElementById('statAttacksNeeded').textContent = `${calc.attacksNeeded}회 발사`;
    document.getElementById('statTtk').textContent = `${calc.timeToKill}초`;

    // 5학년 수학 풀이과정 설명 박스
    const mathFormulaBox = document.getElementById('mathFormulaExplanation');
    if (mathFormulaBox) {
      mathFormulaBox.innerHTML = `
        <b>📐 5학년 수학 연산 공식:</b><br>
        • 1발 데미지 = ${calc.data.damagePerBullet} × ${calc.data.bulletsPerAttack} = <b>${calc.data.damagePerBullet * calc.data.bulletsPerAttack}</b><br>
        ${isHypercharge ? `• 하이퍼차지 강화 (소수 곱셈) = ${calc.data.damagePerBullet * calc.data.bulletsPerAttack} × ${calc.data.hyperchargeMultiplier} = <b>${calc.singleAttackDamage}</b><br>` : ''}
        ${hasShieldGear ? `• 상대 방어막 감쇄 (소수 곱셈) = ${calc.singleAttackDamage} × 0.8 = <b>${Math.round(calc.singleAttackDamage * 0.8)}</b><br>` : ''}
        • 3탄창 순간 폭딜 = ${calc.singleAttackDamage} × 3 = <b>${calc.burstDamage.toLocaleString()}</b><br>
        • 목표 체력(${calc.targetHp.toLocaleString()}) 처치 필요 횟수 = ${calc.targetHp} ÷ ${calc.singleAttackDamage} ≈ <b>${calc.attacksNeeded}발</b>
      `;
    }
  }

  // -------------------------------------------------------------
  // 3. 2D 캔버스 1:1 가상 배틀 시뮬레이터
  // -------------------------------------------------------------
  const battleCanvas = document.getElementById('battleCanvas');
  const battleCtx = battleCanvas?.getContext('2d');
  let battleAnimationId = null;

  function runBattleSimulation() {
    if (!battleCanvas || !battleCtx) return;
    cancelAnimationFrame(battleAnimationId);

    const brawler = getActiveBrawlerData();
    const targetMaxHp = parseInt(document.getElementById('targetHpInput')?.value || 10000, 10);
    let targetCurrentHp = targetMaxHp;
    let brawlerCurrentHp = brawler.hp;

    const w = battleCanvas.width = 720;
    const h = battleCanvas.height = 240;

    let frame = 0;
    let bullets = [];
    let isFinished = false;

    if (window.StarrDropEngine && window.StarrDropEngine.AudioEngine) {
      window.StarrDropEngine.AudioEngine.playTap(1.5);
    }

    function animate() {
      frame++;
      battleCtx.clearRect(0, 0, w, h);

      // 배경 그리드
      battleCtx.fillStyle = '#16122c';
      battleCtx.fillRect(0, 0, w, h);

      // 왼쪽: 아군 브롤러
      battleCtx.font = '48px sans-serif';
      battleCtx.fillText(brawler.icon || '🤠', 80, 140);
      battleCtx.font = 'bold 16px Nanum Gothic';
      battleCtx.fillStyle = '#00f2fe';
      battleCtx.fillText(brawler.name.split(' ')[0], 70, 175);

      // 오른쪽: 상대 타겟 샌드백
      battleCtx.font = '48px sans-serif';
      battleCtx.fillText('🎯', 580, 140);
      battleCtx.font = 'bold 16px Nanum Gothic';
      battleCtx.fillStyle = '#ff007f';
      battleCtx.fillText('타겟 샌드백', 560, 175);

      // 타겟 HP 바
      const hpBarW = 120;
      const hpPercent = Math.max(0, targetCurrentHp / targetMaxHp);
      battleCtx.fillStyle = 'rgba(0,0,0,0.6)';
      battleCtx.fillRect(540, 75, hpBarW, 14);
      battleCtx.fillStyle = hpPercent > 0.3 ? '#4ade80' : '#ef4444';
      battleCtx.fillRect(540, 75, hpBarW * hpPercent, 14);
      battleCtx.strokeStyle = '#fff';
      battleCtx.strokeRect(540, 75, hpBarW, 14);
      battleCtx.font = '12px Nanum Gothic';
      battleCtx.fillStyle = '#fff';
      battleCtx.fillText(`${Math.max(0, targetCurrentHp)} / ${targetMaxHp}`, 550, 68);

      // 탄환 생성 (일정 주기마다 발사)
      if (frame % 25 === 0 && targetCurrentHp > 0) {
        for (let i = 0; i < brawler.bulletsPerAttack; i++) {
          bullets.push({
            x: 140,
            y: 115 + (i * 6 - (brawler.bulletsPerAttack * 3)),
            vx: 12 + Math.random() * 2,
            damage: brawler.damagePerBullet * (isHypercharge ? 1.25 : 1) * (hasShieldGear ? 0.8 : 1)
          });
        }
      }

      // 탄환 이동 및 충돌
      battleCtx.fillStyle = '#ffcc00';
      bullets.forEach((b, idx) => {
        b.x += b.vx;
        battleCtx.beginPath();
        battleCtx.arc(b.x, b.y, 5, 0, Math.PI * 2);
        battleCtx.fill();

        // 충돌 검사
        if (b.x >= 570 && targetCurrentHp > 0) {
          targetCurrentHp -= Math.round(b.damage);
          bullets.splice(idx, 1);

          // 피격 팝업 데미지
          battleCtx.font = 'bold 20px Jua';
          battleCtx.fillStyle = '#ff4757';
          battleCtx.fillText(`-${Math.round(b.damage)}`, 590 + Math.random() * 20, 95);
        }
      });

      if (targetCurrentHp <= 0 && !isFinished) {
        isFinished = true;
        targetCurrentHp = 0;
        if (window.StarrDropEngine && window.StarrDropEngine.AudioEngine) {
          window.StarrDropEngine.AudioEngine.playFanfare(4);
        }
      }

      if (!isFinished) {
        battleAnimationId = requestAnimationFrame(animate);
      } else {
        battleCtx.fillStyle = 'rgba(0,0,0,0.7)';
        battleCtx.fillRect(0, 0, w, h);
        battleCtx.font = 'bold 36px Jua';
        battleCtx.fillStyle = '#ffcc00';
        battleCtx.textAlign = 'center';
        battleCtx.fillText('💥 TARGET ELIMINATED! (처치 완료)', w / 2, h / 2 + 10);
        battleCtx.textAlign = 'left';
      }
    }

    animate();
  }

  // -------------------------------------------------------------
  // 4. 5학년 수학 미션 퀴즈 풀기
  // -------------------------------------------------------------
  const MATH_QUIZZES = [
    {
      question: "🤠 콜트가 1발당 720 데미지인 총알을 6발 발사했습니다. 1회 공격의 총 피해량은 얼마일까요?",
      answer: 4320,
      hint: "720 × 6 을 계산해 보세요!"
    },
    {
      question: "💥 쉘리가 1회 데미지 3000인 상태에서 하이퍼차지(공격력 1.25배)를 켰습니다. 강화된 데미지는 얼마일까요?",
      answer: 3750,
      hint: "3000 × 1.25 (소수의 곱셈)을 계산해 보세요!"
    },
    {
      question: "🔨 체력 14000인 프랭크를 1회당 3500 데미지를 주는 공격으로 잡으려면 최소 몇 번 맞춰야 할까요?",
      answer: 4,
      hint: "14000 ÷ 3500 을 계산해 보세요!"
    }
  ];

  let currentQuizIdx = 0;

  function loadQuiz() {
    const q = MATH_QUIZZES[currentQuizIdx];
    document.getElementById('quizQuestion').textContent = q.question;
    document.getElementById('quizAnswerInput').value = '';
    document.getElementById('quizResultMsg').textContent = '';
  }

  function checkQuizAnswer() {
    const inputVal = parseInt(document.getElementById('quizAnswerInput').value, 10);
    const q = MATH_QUIZZES[currentQuizIdx];
    const msg = document.getElementById('quizResultMsg');

    if (inputVal === q.answer) {
      msg.innerHTML = '🎉 <b>정답입니다!</b> 트로피 +30개와 스타 드롭 충전 완료!';
      msg.style.color = '#4ade80';

      if (window.StarrDropEngine) {
        window.StarrDropEngine.addTrophies(30);
        window.StarrDropEngine.addDrop(1);
        if (window.StarrDropEngine.AudioEngine) {
          window.StarrDropEngine.AudioEngine.playFanfare(3);
        }
      }

      setTimeout(() => {
        currentQuizIdx = (currentQuizIdx + 1) % MATH_QUIZZES.length;
        loadQuiz();
      }, 2000);
    } else {
      msg.innerHTML = `❌ 아쉬워요! 다시 계산해볼까요? (힌트: ${q.hint})`;
      msg.style.color = '#ef4444';
    }
  }

  // -------------------------------------------------------------
  // 5. 이벤트 바인딩
  // -------------------------------------------------------------
  document.addEventListener('DOMContentLoaded', () => {
    // 브롤러 프리셋 탭 전환
    document.querySelectorAll('.brawler-select-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.brawler-select-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        currentBrawlerKey = e.currentTarget.dataset.brawler;

        const customPanel = document.getElementById('customBrawlerPanel');
        if (currentBrawlerKey === 'custom') {
          customPanel.style.display = 'block';
        } else {
          customPanel.style.display = 'none';
        }

        calculateStats();
      });
    });

    // 스위치 체크박스
    document.getElementById('hyperchargeToggle')?.addEventListener('change', (e) => {
      isHypercharge = e.target.checked;
      calculateStats();
    });

    document.getElementById('shieldGearToggle')?.addEventListener('change', (e) => {
      hasShieldGear = e.target.checked;
      calculateStats();
    });

    document.getElementById('targetHpInput')?.addEventListener('input', calculateStats);

    // 커스텀 슬라이더
    ['customHp', 'customDmg', 'customBullets', 'customReload'].forEach(id => {
      document.getElementById(id)?.addEventListener('input', calculateStats);
    });

    // 배틀 시뮬레이터 시작
    document.getElementById('startSimBtn')?.addEventListener('click', runBattleSimulation);

    // 퀴즈 제출
    document.getElementById('submitQuizBtn')?.addEventListener('click', checkQuizAnswer);

    loadQuiz();
    calculateStats();
  });

})();
