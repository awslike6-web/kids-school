// ⚔️ 브롤스타즈 DPS & 밸런스 연구소 코어 스크립트 (brawl_dps.js) - 정밀 실사 엔진

(function () {
  'use strict';

  // -------------------------------------------------------------
  // 1. 브롤스타즈 공식 11레벨 (만렙) 정밀 메커니즘 데이터
  // -------------------------------------------------------------
  const BRAWLERS = {
    colt: {
      name: '콜트 (Colt)',
      icon: '🤠',
      hp: 5600,
      bulletType: 'stream', // 직렬 6연사
      damagePerBullet: 720,
      bulletsPerAttack: 6,
      attackDuration: 0.75, // 6발 발사 소요 시간(초)
      attackDelay: 0.0,
      reloadTime: 1.7, // 초
      rangeType: '원거리 저격',
      hyperchargeMultiplier: 1.25,
      desc: '총알 1발당 720이지만 0.75초 동안 6발을 직렬 연사! 올히트 시 4,320이지만 무빙에 따라 빗나갈 수 있음.',
      hitRates: { close: 6, mid: 4, far: 2 } // 거리별 적중 탄환 수
    },
    shelly: {
      name: '쉘리 (Shelly)',
      icon: '💥',
      hp: 7400,
      bulletType: 'spread', // 산탄(샷건 5발 부채꼴)
      damagePerBullet: 600,
      bulletsPerAttack: 5,
      attackDuration: 0.25,
      attackDelay: 0.0,
      reloadTime: 1.5,
      rangeType: '산탄 샷건',
      hyperchargeMultiplier: 1.25,
      desc: '산탄 5발이 부채꼴로 발사! 초근접(접사)에서는 5발 직격(3,000), 멀어질수록 1~2발만 맞아 데미지 급감.',
      hitRates: { close: 5, mid: 3, far: 1 }
    },
    frank: {
      name: '프랭크 (Frank)',
      icon: '🔨',
      hp: 14000,
      bulletType: 'aoe', // 해머 단타 광역
      damagePerBullet: 2480,
      bulletsPerAttack: 1,
      attackDuration: 0.1,
      attackDelay: 0.45, // 해머를 들어 올리는 선딜레이 (0.45초)
      reloadTime: 0.8,
      rangeType: '광역 해머',
      hyperchargeMultiplier: 1.20,
      desc: '한 방 단타 깡딜이 2,480으로 압도적! 단, 해머를 내리찍기까지 0.45초의 선딜레이가 존재.',
      hitRates: { close: 1, mid: 1, far: 1 }
    },
    spike: {
      name: '스파이크 (Spike)',
      icon: '🌵',
      hp: 4800,
      bulletType: 'burst_split', // 가시 수류탄 직격 + 6갈래 분열
      damagePerBullet: 1120,
      bulletsPerAttack: 3, // 유효 평균 피격 가시 수 (최대 본체+파편)
      attackDuration: 0.3,
      attackDelay: 0.0,
      reloadTime: 2.0,
      rangeType: '분열 가시탄',
      hyperchargeMultiplier: 1.25,
      desc: '가시 수류탄 1개(1,120)가 터지며 6방향 파편(각 1,120)으로 분열. 초근접 대형 타겟은 다단히트!',
      hitRates: { close: 3, mid: 2, far: 1 }
    },
    edgar: {
      name: '에드가 (Edgar)',
      icon: '🧣',
      hp: 6600,
      bulletType: 'melee_combo', // 초고속 2연타 펀치 + 35% 흡혈
      damagePerBullet: 1080,
      bulletsPerAttack: 2,
      attackDuration: 0.2,
      attackDelay: 0.0,
      reloadTime: 0.7,
      rangeType: '초근접 연타',
      hyperchargeMultiplier: 1.25,
      vampirismRate: 0.35, // 준 피해량의 35% 체력 회복
      desc: '1회 탭 시 1,080 데미지 2연타(2,160). 준 피해량의 35%를 체력으로 즉시 흡혈!',
      hitRates: { close: 2, mid: 1, far: 0 }
    }
  };

  let currentBrawlerKey = 'colt';
  let currentDistance = 'close'; // 'close' (초근접) | 'mid' (중거리) | 'far' (원거리)
  let isHypercharge = false;
  let hasShieldGear = false;

  // -------------------------------------------------------------
  // 2. 5학년 수학 연계 정밀 데미지 & 실효 DPS 계산기
  // -------------------------------------------------------------
  function calculateStats() {
    const data = getActiveBrawlerData();

    // 1. 선택된 거리에 따른 유효 탄환 적중 수 (Hit Count)
    const effectiveBullets = data.hitRates ? data.hitRates[currentDistance] : data.bulletsPerAttack;

    // 2. 탄환 1발당 기본 데미지
    let perBulletDmg = data.damagePerBullet;

    // 3. 하이퍼차지 배율 (소수 곱셈: × 1.25)
    if (isHypercharge) {
      perBulletDmg = Math.round(perBulletDmg * data.hyperchargeMultiplier);
    }

    // 4. 상대 실드 기어 (소수 곱셈: × 0.8)
    if (hasShieldGear) {
      perBulletDmg = Math.round(perBulletDmg * 0.8);
    }

    // 5. 1회 공격 실효 데미지 (Effective Single Attack Damage)
    const singleEffectiveDamage = perBulletDmg * effectiveBullets;

    // 6. 이론상 1회 최대 데미지 (Max Theoretical Damage - 올히트 기준)
    const maxSingleDamage = perBulletDmg * data.bulletsPerAttack;

    // 7. 3탄창 순간 폭딜 (Burst Damage)
    const burstDamage = singleEffectiveDamage * 3;

    // 8. 1회 사이클 소요 시간 (초) = 선딜레이 + 발사 지속시간 + 장전 시간
    const singleCycleTime = (data.attackDelay || 0) + (data.attackDuration || 0.2) + data.reloadTime;
    
    // 9. 실효 초당 지속 데미지 (Sustained DPS)
    const sustainedDps = singleCycleTime > 0 ? Math.round(singleEffectiveDamage / singleCycleTime) : 0;

    // 10. 목표 체력 처치 시간 (TTK)
    const targetHp = parseInt(document.getElementById('targetHpInput')?.value || 10000, 10);
    const attacksNeeded = singleEffectiveDamage > 0 ? Math.ceil(targetHp / singleEffectiveDamage) : 999;
    
    let timeToKill = 0;
    if (attacksNeeded <= 3) {
      // 3탄창 이내 순삭 (발사 시간만 소요)
      timeToKill = ((attacksNeeded - 1) * ((data.attackDuration || 0.2) + 0.1) + (data.attackDelay || 0)).toFixed(2);
    } else {
      // 장전 시간 필요
      const reloadCount = attacksNeeded - 3;
      timeToKill = (3 * (data.attackDuration || 0.2) + (reloadCount * data.reloadTime) + (attacksNeeded * (data.attackDelay || 0))).toFixed(2);
    }

    // UI 렌더링
    renderStatDisplay({
      perBulletDmg,
      effectiveBullets,
      singleEffectiveDamage,
      maxSingleDamage,
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
      const bullets = parseInt(document.getElementById('customBullets')?.value || 3, 10);
      return {
        name: '커스텀 브롤러',
        icon: '🤖',
        hp: parseInt(document.getElementById('customHp')?.value || 6000, 10),
        damagePerBullet: parseInt(document.getElementById('customDmg')?.value || 800, 10),
        bulletsPerAttack: bullets,
        attackDuration: 0.3,
        attackDelay: 0.0,
        reloadTime: parseFloat(document.getElementById('customReload')?.value || 1.5),
        rangeType: '커스텀',
        hyperchargeMultiplier: 1.25,
        hitRates: {
          close: bullets,
          mid: Math.max(1, Math.round(bullets * 0.6)),
          far: Math.max(1, Math.round(bullets * 0.3))
        }
      };
    }
    return BRAWLERS[currentBrawlerKey];
  }

  function renderStatDisplay(calc) {
    document.getElementById('statPerBulletDmg').textContent = calc.perBulletDmg.toLocaleString();
    document.getElementById('statHitBullets').textContent = `${calc.effectiveBullets}발 / 총 ${calc.data.bulletsPerAttack}발`;
    document.getElementById('statSingleDmg').textContent = calc.singleEffectiveDamage.toLocaleString();
    document.getElementById('statBurstDmg').textContent = calc.burstDamage.toLocaleString();
    document.getElementById('statDps').textContent = calc.sustainedDps.toLocaleString();
    document.getElementById('statTtk').textContent = `${calc.timeToKill}초 (${calc.attacksNeeded}탄창)`;

    // 브롤러 설명 및 거리 안내
    const descBox = document.getElementById('brawlerMechanicDesc');
    if (descBox) {
      const distNames = { close: '🔴 초근접 (풀히트)', mid: '🟡 일반 교전 거리', far: '🟢 원거리 (스침)' };
      descBox.innerHTML = `
        <b>💡 ${calc.data.name} 실전 메커니즘:</b> ${calc.data.desc}<br>
        • 현재 교전 거리: <b>${distNames[currentDistance]}</b> ➡️ 탄환 <b>${calc.effectiveBullets}발</b> 적중 중!
      `;
    }

    // 5학년 수학 연산 공식
    const mathFormulaBox = document.getElementById('mathFormulaExplanation');
    if (mathFormulaBox) {
      mathFormulaBox.innerHTML = `
        <b>📐 5학년 수학 실전 데미지 연산식:</b><br>
        • <b>1발당 위력</b>: ${calc.data.damagePerBullet} ${isHypercharge ? `× 1.25(하이퍼차지) = <b>${calc.perBulletDmg}</b>` : ''} ${hasShieldGear ? `× 0.8(상대방어) = <b>${calc.perBulletDmg}</b>` : ''}<br>
        • <b>거리별 실효 1회 피해량</b>: 1발 위력(${calc.perBulletDmg}) × 적중 탄환(${calc.effectiveBullets}발) = <b>${calc.singleEffectiveDamage.toLocaleString()}</b> (최대 잠재력: ${calc.maxSingleDamage.toLocaleString()})<br>
        • <b>3탄창 순간 폭딜</b>: ${calc.singleEffectiveDamage} × 3 = <b>${calc.burstDamage.toLocaleString()}</b><br>
        • <b>목표 처치 연산</b>: 체력 ${calc.targetHp.toLocaleString()} ÷ ${calc.singleEffectiveDamage} = <b>${calc.attacksNeeded}번 발사</b> (처치 소요 시간: <b>${calc.timeToKill}초</b>)
      `;
    }
  }

  // -------------------------------------------------------------
  // 3. 2D 캔버스 실사형 1:1 가상 교전 시뮬레이터
  // -------------------------------------------------------------
  const battleCanvas = document.getElementById('battleCanvas');
  const battleCtx = battleCanvas?.getContext('2d');
  let battleAnimationId = null;

  function runBattleSimulation() {
    if (!battleCanvas || !battleCtx) return;
    cancelAnimationFrame(battleAnimationId);

    const brawler = getActiveBrawlerData();
    const effectiveBullets = brawler.hitRates ? brawler.hitRates[currentDistance] : brawler.bulletsPerAttack;
    const targetMaxHp = parseInt(document.getElementById('targetHpInput')?.value || 10000, 10);
    let targetCurrentHp = targetMaxHp;

    const w = battleCanvas.width = 720;
    const h = battleCanvas.height = 240;

    let frame = 0;
    let bullets = [];
    let isFinished = false;
    let attackTimer = 0;
    let floatTexts = [];

    // 거리별 타겟 X 좌표 (초근접: 280, 중거리: 480, 원거리: 620)
    const targetXMap = { close: 300, mid: 480, far: 620 };
    const targetX = targetXMap[currentDistance] || 480;

    if (window.StarrDropEngine && window.StarrDropEngine.AudioEngine) {
      window.StarrDropEngine.AudioEngine.playTap(1.4);
    }

    function animate() {
      frame++;
      battleCtx.clearRect(0, 0, w, h);

      // 배경
      battleCtx.fillStyle = '#141026';
      battleCtx.fillRect(0, 0, w, h);

      // 사거리 안내선
      battleCtx.strokeStyle = 'rgba(0, 242, 254, 0.15)';
      battleCtx.lineWidth = 2;
      battleCtx.setLineDash([6, 6]);
      battleCtx.beginPath();
      battleCtx.moveTo(140, 120);
      battleCtx.lineTo(targetX, 120);
      battleCtx.stroke();
      battleCtx.setLineDash([]);

      // 1. 아군 브롤러 렌더
      battleCtx.font = '44px sans-serif';
      battleCtx.fillText(brawler.icon || '🤠', 60, 135);
      battleCtx.font = 'bold 15px Nanum Gothic';
      battleCtx.fillStyle = '#00f2fe';
      battleCtx.fillText(brawler.name.split(' ')[0], 50, 170);

      // 2. 타겟 샌드백 렌더 (거리 X 반영)
      battleCtx.font = '44px sans-serif';
      battleCtx.fillText('🎯', targetX, 135);
      battleCtx.font = 'bold 15px Nanum Gothic';
      battleCtx.fillStyle = '#ff007f';
      battleCtx.fillText('타겟 샌드백', targetX - 15, 170);

      // 타겟 HP 바
      const hpBarW = 100;
      const hpPercent = Math.max(0, targetCurrentHp / targetMaxHp);
      battleCtx.fillStyle = 'rgba(0,0,0,0.6)';
      battleCtx.fillRect(targetX - 20, 75, hpBarW, 12);
      battleCtx.fillStyle = hpPercent > 0.3 ? '#4ade80' : '#ef4444';
      battleCtx.fillRect(targetX - 20, 75, hpBarW * hpPercent, 12);
      battleCtx.strokeStyle = '#fff';
      battleCtx.strokeRect(targetX - 20, 75, hpBarW, 12);
      battleCtx.font = '11px Nanum Gothic';
      battleCtx.fillStyle = '#fff';
      battleCtx.fillText(`${Math.max(0, targetCurrentHp)} / ${targetMaxHp}`, targetX - 15, 68);

      // 3. 발사 로직 (공격 선딜레이 및 연사 간격 반영)
      attackTimer++;
      const attackInterval = Math.round(((brawler.reloadTime || 1.5) + (brawler.attackDelay || 0)) * 25);

      if (attackTimer % Math.max(20, attackInterval) === 0 && targetCurrentHp > 0) {
        // 브롤러 특성에 따른 탄환 궤적 생성
        if (brawler.bulletType === 'spread') {
          // 쉘리 산탄 5발 (부채꼴)
          for (let i = 0; i < brawler.bulletsPerAttack; i++) {
            const spreadAngle = (i - 2) * 0.12;
            const willHit = i < effectiveBullets;
            bullets.push({
              x: 120,
              y: 120,
              vx: Math.cos(spreadAngle) * 11,
              vy: Math.sin(spreadAngle) * 11,
              damage: brawler.damagePerBullet * (isHypercharge ? 1.25 : 1) * (hasShieldGear ? 0.8 : 1),
              willHit: willHit,
              targetX: targetX
            });
          }
        } else if (brawler.bulletType === 'aoe') {
          // 프랭크 해머 충격파 (선딜 후 거대 파동)
          bullets.push({
            x: 120,
            y: 120,
            vx: 8,
            vy: 0,
            radius: 35,
            isAoe: true,
            damage: brawler.damagePerBullet * (isHypercharge ? 1.2 : 1) * (hasShieldGear ? 0.8 : 1),
            willHit: true,
            targetX: targetX
          });
        } else {
          // 콜트 6연사 / 일반
          for (let i = 0; i < brawler.bulletsPerAttack; i++) {
            const willHit = i < effectiveBullets;
            setTimeout(() => {
              if (targetCurrentHp > 0) {
                bullets.push({
                  x: 120,
                  y: 120 + (i * 2 - brawler.bulletsPerAttack),
                  vx: 14,
                  vy: willHit ? 0 : (Math.random() - 0.5) * 3,
                  damage: brawler.damagePerBullet * (isHypercharge ? 1.25 : 1) * (hasShieldGear ? 0.8 : 1),
                  willHit: willHit,
                  targetX: targetX
                });
              }
            }, i * 70);
          }
        }
      }

      // 4. 탄환 이동 및 충돌
      bullets.forEach((b, idx) => {
        b.x += b.vx;
        b.y += b.vy || 0;

        battleCtx.fillStyle = b.isAoe ? 'rgba(0, 242, 254, 0.4)' : '#ffcc00';
        battleCtx.beginPath();
        battleCtx.arc(b.x, b.y, b.radius || 4, 0, Math.PI * 2);
        battleCtx.fill();

        // 타겟 적중 검사
        if (b.x >= targetX && b.x <= targetX + 40 && Math.abs(b.y - 120) < 30) {
          if (b.willHit && targetCurrentHp > 0) {
            targetCurrentHp -= Math.round(b.damage);
            floatTexts.push({
              text: `-${Math.round(b.damage)}`,
              x: targetX + (Math.random() * 20),
              y: 90,
              alpha: 1.0
            });
          }
          bullets.splice(idx, 1);
        } else if (b.x > w || b.y < 0 || b.y > h) {
          bullets.splice(idx, 1);
        }
      });

      // 5. 피격 텍스트 팝업 렌더
      floatTexts.forEach((ft, fIdx) => {
        ft.y -= 0.8;
        ft.alpha -= 0.03;
        battleCtx.font = 'bold 18px Jua';
        battleCtx.fillStyle = `rgba(255, 71, 87, ${Math.max(0, ft.alpha)})`;
        battleCtx.fillText(ft.text, ft.x, ft.y);
        if (ft.alpha <= 0) floatTexts.splice(fIdx, 1);
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
        battleCtx.fillStyle = 'rgba(0,0,0,0.75)';
        battleCtx.fillRect(0, 0, w, h);
        battleCtx.font = 'bold 32px Jua';
        battleCtx.fillStyle = '#ffcc00';
        battleCtx.textAlign = 'center';
        battleCtx.fillText('💥 TARGET ELIMINATED! (처치 완료)', w / 2, h / 2 + 10);
        battleCtx.textAlign = 'left';
      }
    }

    animate();
  }

  // -------------------------------------------------------------
  // 4. 5학년 수학 실전 밸런스 퀴즈
  // -------------------------------------------------------------
  const MATH_QUIZZES = [
    {
      question: "💥 쉘리가 초근접에서 산탄 5발(발당 600)을 모두 맞추고 하이퍼차지(1.25배)를 켰습니다. 1회 공격의 총 피해량은 얼마일까요?",
      answer: 3750,
      hint: "(600 × 5) × 1.25 = 3000 × 1.25 를 계산해보세요!"
    },
    {
      question: "🤠 콜트가 원거리에서 6발 중 2발만 적중시켰습니다(발당 720). 이 상태로 3탄창을 쏘면 총 몇 데미지일까요?",
      answer: 4320,
      hint: "(720 × 2) × 3 = 1440 × 3 을 계산해보세요!"
    },
    {
      question: "🔨 프랭크(한 방 2480)가 상대 실드 기어(0.8배 감소)를 착용한 적을 1번 공격했습니다. 실제 들어간 데미지는?",
      answer: 1984,
      hint: "2480 × 0.8 (소수의 곱셈)을 계산해보세요!"
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
  // 5. 이벤트 리스너 바인딩
  // -------------------------------------------------------------
  document.addEventListener('DOMContentLoaded', () => {
    // 브롤러 선택
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

    // 거리 선택 버튼 (초근접 / 중거리 / 원거리)
    document.querySelectorAll('.dist-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.dist-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        currentDistance = e.currentTarget.dataset.dist;
        calculateStats();
      });
    });

    // 버프 스위치
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

    // 시뮬레이션 및 퀴즈
    document.getElementById('startSimBtn')?.addEventListener('click', runBattleSimulation);
    document.getElementById('submitQuizBtn')?.addEventListener('click', checkQuizAnswer);

    loadQuiz();
    calculateStats();
  });

})();
