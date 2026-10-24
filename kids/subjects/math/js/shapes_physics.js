(() => {
    const sCanvas = document.getElementById('slide-canvas');
    const sCtx = sCanvas.getContext('2d');
    let slideShape = 'box';
    let simState = 'idle'; // 'idle', 'running', 'finished'
    let simTime = 0;
    let animFrameId = null;

    // 미끄럼틀 트랙 지오메트리
    // 상단 대기대: (70, 70)
    // 경사로: (70, 70) -> (380, 245)
    // 평지 활주로: (380, 245) -> (740, 245)
    function selectSlideShape(type) {
      if (simState === 'running') return;
      slideShape = type;
      document.querySelectorAll('#lab-2 .shape-selector-btn').forEach(b => b.classList.remove('active'));
      document.getElementById('btn-slide-' + type).classList.add('active');

      const fb = document.getElementById('lab2-feedback-box');
      fb.innerHTML = `선택된 모양: <strong>${getShapeName(type)}</strong>! [🚀 준비, 출발!] 버튼을 눌러보세요.`;
      resetSlideSimulation();
    }

    function getShapeName(type) {
      if (type === 'box') return '상자 모양';
      if (type === 'cyl-stand') return '세운 둥근기둥';
      if (type === 'cyl-roll') return '눕힌 둥근기둥 (바퀴)';
      if (type === 'sphere') return '공 모양';
      return '';
    }

    function drawSlideScene(posX = 70, posY = 70, angle = 0) {
      const W = sCanvas.width, H = sCanvas.height;
      sCtx.clearRect(0, 0, W, H);

      // 1. 잔디 지면
      sCtx.fillStyle = "#84cc16";
      sCtx.fillRect(0, 255, W, H - 255);
      sCtx.fillStyle = "#4d7c0f";
      sCtx.fillRect(0, 255, W, 6);

      // 2. 나무 계단 탑 & 미끄럼틀 기둥
      sCtx.fillStyle = "#b45309";
      sCtx.fillRect(35, 75, 20, 180);
      sCtx.fillRect(65, 75, 15, 180);
      // 사다리 발판
      for (let y = 100; y < 250; y += 30) {
        sCtx.fillRect(30, y, 55, 6);
      }
      // 탑승 데크
      sCtx.fillStyle = "#92400e";
      sCtx.fillRect(20, 65, 80, 14);

      // 3. 미끄럼틀 경사로 (주황색 슬라이드)
      sCtx.save();
      sCtx.beginPath();
      sCtx.moveTo(70, 75);
      sCtx.lineTo(380, 250);
      sCtx.lineTo(380, 260);
      sCtx.lineTo(70, 85);
      sCtx.closePath();
      sCtx.fillStyle = "#ea580c";
      sCtx.fill();

      // 슬라이드 레일
      sCtx.beginPath();
      sCtx.moveTo(70, 75);
      sCtx.lineTo(380, 250);
      sCtx.strokeStyle = "#fbbf24";
      sCtx.lineWidth = 5;
      sCtx.stroke();
      sCtx.restore();

      // 4. 도착 깃발 (우측 끝)
      sCtx.save();
      sCtx.fillStyle = "#64748b";
      sCtx.fillRect(680, 160, 6, 95);
      // 깃발 천
      sCtx.beginPath();
      sCtx.moveTo(686, 160);
      sCtx.lineTo(740, 180);
      sCtx.lineTo(686, 200);
      sCtx.closePath();
      sCtx.fillStyle = "#ef4444";
      sCtx.fill();
      sCtx.font = "bold 13px Jua";
      sCtx.fillStyle = "#fff";
      sCtx.fillText("도착", 692, 185);
      sCtx.restore();

      // 5. 물체 렌더링
      drawMovingObject(posX, posY, angle);
    }

    function drawMovingObject(x, y, angle) {
      sCtx.save();
      sCtx.translate(x, y);
      sCtx.rotate(angle);

      if (slideShape === 'box') {
        // 상자 블록 (회전 안 함)
        sCtx.fillStyle = "#ec4899";
        sCtx.fillRect(-22, -22, 44, 44);
        sCtx.strokeStyle = "#be185d";
        sCtx.lineWidth = 3;
        sCtx.strokeRect(-22, -22, 44, 44);
        // 리본
        sCtx.fillStyle = "#fbcfe8";
        sCtx.fillRect(-4, -22, 8, 44);
        sCtx.fillRect(-22, -4, 44, 8);
      } else if (slideShape === 'cyl-stand') {
        // 세운 둥근기둥 (회전 안 함)
        sCtx.fillStyle = "#0284c7";
        sCtx.fillRect(-18, -25, 36, 50);
        sCtx.strokeStyle = "#0369a1";
        sCtx.lineWidth = 2.5;
        sCtx.strokeRect(-18, -25, 36, 50);
        // 캔 상하 타원
        sCtx.beginPath();
        sCtx.ellipse(0, -25, 18, 7, 0, 0, Math.PI * 2);
        sCtx.fillStyle = "#7dd3fc";
        sCtx.fill();
        sCtx.stroke();
      } else if (slideShape === 'cyl-roll') {
        // 눕힌 둥근기둥 (바퀴처럼 고속 회전!)
        sCtx.beginPath();
        sCtx.arc(0, 0, 22, 0, Math.PI * 2);
        sCtx.fillStyle = "#f59e0b";
        sCtx.fill();
        sCtx.strokeStyle = "#b45309";
        sCtx.lineWidth = 3;
        sCtx.stroke();
        // 바퀴 스포크 무늬
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 2) {
          sCtx.beginPath();
          sCtx.moveTo(0, 0);
          sCtx.lineTo(Math.cos(a) * 22, Math.sin(a) * 22);
          sCtx.strokeStyle = "#78350f";
          sCtx.lineWidth = 2.5;
          sCtx.stroke();
        }
        sCtx.beginPath();
        sCtx.arc(0, 0, 6, 0, Math.PI * 2);
        sCtx.fillStyle = "#fff";
        sCtx.fill();
      } else if (slideShape === 'sphere') {
        // 공 모양 (360도 롤링 회전)
        sCtx.beginPath();
        sCtx.arc(0, 0, 24, 0, Math.PI * 2);
        let grad = sCtx.createRadialGradient(-7, -7, 3, 0, 0, 24);
        grad.addColorStop(0, "#6ee7b7");
        grad.addColorStop(0.6, "#10b981");
        grad.addColorStop(1, "#047857");
        sCtx.fillStyle = grad;
        sCtx.fill();
        sCtx.strokeStyle = "#065f46";
        sCtx.lineWidth = 2.5;
        sCtx.stroke();
        // 공 무늬
        sCtx.beginPath();
        sCtx.arc(0, 0, 11, 0, Math.PI * 2);
        sCtx.strokeStyle = "rgba(255,255,255,0.7)";
        sCtx.lineWidth = 3;
        sCtx.stroke();
      }
      sCtx.restore();
    }

    function startSlideSimulation() {
      if (simState === 'running') return;
      simState = 'running';
      simTime = 0;

      const fb = document.getElementById('lab2-feedback-box');
      fb.innerHTML = `🚀 <strong>${getShapeName(slideShape)}</strong> 출발합니다!`;

      function step() {
        simTime += 0.016;

        let posX, posY, angle;
        // 경사 구간: t in 0..1.2
        if (simTime <= 1.2) {
          let t = simTime / 1.2;
          posX = 70 + (380 - 70) * t;
          posY = 60 + (235 - 60) * t;

          if (slideShape === 'sphere' || slideShape === 'cyl-roll') {
            angle = simTime * 12; // 떼구르르 고속 회전!
          } else {
            angle = 0.52; // 경사각 30도에 맞춘 슬라이딩
          }
        } else {
          // 평지 구간: t in 1.2..3.0
          let t2 = simTime - 1.2;
          posY = 232;

          if (slideShape === 'sphere') {
            // 공: 가장 멀리 도착깃발 너머까지 골인
            posX = Math.min(710, 380 + t2 * 250);
            angle = 1.2 * 12 + t2 * 10;
          } else if (slideShape === 'cyl-roll') {
            // 눕힌 원기둥: 도착 깃발 부근까지 굴러감
            posX = Math.min(660, 380 + t2 * 210);
            angle = 1.2 * 12 + t2 * 8;
          } else if (slideShape === 'box') {
            // 상자: 마찰력으로 460 부근에서 스르륵 멈춤
            posX = Math.min(460, 380 + (1 - Math.exp(-t2 * 2.5)) * 90);
            angle = 0;
          } else if (slideShape === 'cyl-stand') {
            // 세운 원기둥: 480 부근에서 멈춤
            posX = Math.min(480, 380 + (1 - Math.exp(-t2 * 2.8)) * 105);
            angle = 0;
          }
        }

        drawSlideScene(posX, posY, angle);

        if (simTime < 2.5) {
          animFrameId = requestAnimationFrame(step);
        } else {
          simState = 'finished';
          showSlideResult();
        }
      }
      animFrameId = requestAnimationFrame(step);
    }

    function showSlideResult() {
      const fb = document.getElementById('lab2-feedback-box');
      if (slideShape === 'sphere') {
        fb.innerHTML = `🎉 <strong>공 모양</strong>은 몸 전체가 둥글어서 <span style="color:#10b981;">데굴데굴 360도 회전하며 가장 멀리 굴러갔어요!</span>`;
        if (typeof fairySpeak === 'function') fairySpeak('공 모양은 어디로든 가장 씽씽 잘 굴러가요!');
      } else if (slideShape === 'cyl-roll') {
        fb.innerHTML = `🌀 <strong>눕힌 둥근기둥</strong>은 옆면이 둥글어서 <span style="color:#f59e0b;">바퀴처럼 데굴데굴 고속으로 굴러갔어요!</span>`;
        if (typeof fairySpeak === 'function') fairySpeak('눕힌 둥근기둥은 바퀴처럼 잘 굴러가요!');
      } else if (slideShape === 'cyl-stand') {
        fb.innerHTML = `💡 <strong>세운 둥근기둥</strong>은 평평한 바닥면이 닿아서 <span style="color:#0284c7;">굴러가지 않고 스르륵 미끄러져 멈췄어요!</span>`;
        if (typeof fairySpeak === 'function') fairySpeak('세운 둥근기둥은 굴러가지 않고 미끄러져요!');
      } else if (slideShape === 'box') {
        fb.innerHTML = `💡 <strong>상자 모양</strong>은 모든 면이 평평해서 <span style="color:#ec4899;">전혀 구르지 않고 미끄러지듯 내려왔어요!</span>`;
        if (typeof fairySpeak === 'function') fairySpeak('상자 모양은 평평해서 굴러가지 않고 미끄러져 내려와요!');
      }
    }

    function resetSlideSimulation() {
      if (animFrameId) cancelAnimationFrame(animFrameId);
      simState = 'idle';
      drawSlideScene(70, 60, (slideShape === 'box' || slideShape === 'cyl-stand') ? 0.52 : 0);
    }

    /* ========================================================
       3. LAB 3 : 와르르 블록 탑 쌓기 챌린지 (실물 블록 & 슬랩스틱)
    ======================================================== */
    function previewStack() {
      const f1 = document.getElementById('stack-floor-1').value;
      const f2 = document.getElementById('stack-floor-2').value;
      const f3 = document.getElementById('stack-floor-3').value;

      applyBlockStyle('stack-layer-1', f1, '1층');
      applyBlockStyle('stack-layer-2', f2, '2층');
      applyBlockStyle('stack-layer-3', f3, '3층');

      // 애니메이션 리셋
      ['stack-layer-1', 'stack-layer-2', 'stack-layer-3'].forEach(id => {
        const el = document.getElementById(id);
        el.className = 'block-item ' + getBlockClass(id === 'stack-layer-1' ? f1 : (id === 'stack-layer-2' ? f2 : f3));
        el.style.transform = 'none';
        el.style.opacity = '1';
      });
    }

    function getBlockClass(type) {
      if (type === 'box') return 'block-cube';
      if (type === 'cyl-stand') return 'block-cyl-stand';
      if (type === 'cyl-roll') return 'block-cyl-roll';
      if (type === 'sphere') return 'block-sphere';
      return '';
    }

    function applyBlockStyle(elId, type, label) {
      const el = document.getElementById(elId);
      if (!el) return;
      el.className = 'block-item ' + getBlockClass(type);
      if (type === 'box') el.textContent = `📦 ${label} 상자`;
      else if (type === 'cyl-stand') el.textContent = `🥫 ${label} 기둥`;
      else if (type === 'cyl-roll') el.textContent = `🛢️ ${label} 눕힘`;
      else if (type === 'sphere') el.textContent = `⚽ ${label} 공`;
    }

    function runStackChallenge() {
      const f1 = document.getElementById('stack-floor-1').value;
      const f2 = document.getElementById('stack-floor-2').value;
      const f3 = document.getElementById('stack-floor-3').value;
      const fb = document.getElementById('lab3-feedback-box');

      const willFall = (f1 === 'sphere' || f1 === 'cyl-roll' || f2 === 'sphere' || f2 === 'cyl-roll');

      if (willFall) {
        // 와르르 슬랩스틱 연출
        const b1 = document.getElementById('stack-layer-1');
        const b2 = document.getElementById('stack-layer-2');
        const b3 = document.getElementById('stack-layer-3');

        setTimeout(() => {
          b3.classList.add('fall-scatter-2');
          b2.classList.add('fall-scatter-1');
          if (f1 === 'sphere' || f1 === 'cyl-roll') b1.classList.add('fall-scatter-3');

          fb.innerHTML = `⚠️ <span style="color:#ef4444; font-size:1.35rem;">와르르 쿵! 탑이 무너졌어요!</span><br>둥근 모양은 흔들려서 위에 다른 블록을 쌓을 수 없어요. 바닥에는 <strong>평평한 상자나 세운 둥근기둥</strong>을 놓아보세요!`;
          if (typeof fairySpeak === 'function') fairySpeak('와르르 무너졌어요! 둥근 모양 위에는 쌓을 수 없어요. 바닥에는 평평한 상자를 놓아볼까요?');
        }, 300);
      } else {
        // 대성공!
        setTimeout(() => {
          fb.innerHTML = `🎉 <span style="color:#10b981; font-size:1.35rem;">대성공! 튼튼하고 끄떡없는 탑 완성!</span><br>평평한 면끼리 맞닿아서 바람이 불어도 끄떡없어요! ⭐ 별 보상 획득!`;
          if (typeof fairySpeak === 'function') fairySpeak('대성공이에요! 평평한 면끼리 만나서 튼튼한 탑이 완성되었어요!');
          if (typeof grantRewardAndShowUI === 'function') grantRewardAndShowUI(1, false, 'math');
          triggerConfetti();
        }, 350);
      }
    }

    /* ========================================================
       4. LAB 4 : 뚝딱뚝딱 모양 조립 공방 (파츠 결합형)
    ======================================================== */

Object.assign(window, {selectSlideShape, getShapeName, drawSlideScene, drawMovingObject, startSlideSimulation, showSlideResult, resetSlideSimulation, previewStack, getBlockClass, applyBlockStyle, runStackChallenge});
})();
