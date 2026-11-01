/* =========================================================================
       1. 사운드 및 오디오
       ========================================================================= */
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    function playTone(freq, type = 'sine', duration = 0.15, gainVal = 0.2) {
      try {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(gainVal, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
      } catch (e) {}
    }

    function soundPop() { playTone(587.33, 'triangle', 0.1, 0.3); }
    function soundSuccess() {
      [523.25, 659.25, 783.99, 1046.50].forEach((f, i) => {
        setTimeout(() => playTone(f, 'sine', 0.2, 0.25), i * 80);
      });
    }
    function soundCombine() {
      [440, 554.37, 659.25, 880, 1108.73, 1318.51].forEach((f, i) => {
        setTimeout(() => playTone(f, 'triangle', 0.15, 0.2), i * 50);
      });
    }
    function soundWrong() { playTone(220, 'sawtooth', 0.25, 0.25); }

    function speak(text) {
      if (typeof speakFairyTTS === 'function') {
        speakFairyTTS(text);
      } else if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = 'ko-KR';
        utter.rate = 0.95;
        window.speechSynthesis.speak(utter);
      }
    }

    window.currentSubject = "수학";
    window.wrongNotes = window.wrongNotes || [];
    window.roomStartTime = window.roomStartTime || new Date();

    let stars = 0;
    async function addStar(amount = 1, isSilent = true) {
      stars += amount;
      document.getElementById('star-count').textContent = stars;
      triggerConfetti();
      if (typeof grantRewardAndShowUI === 'function') {
        try {
          await grantRewardAndShowUI(amount, isSilent);
        } catch (e) {
          console.warn("보상 지급 연동 실패:", e);
        }
      }
    }

    /* =========================================================================
       2. Confetti 폭죽
       ========================================================================= */
    const confCanvas = document.getElementById('confetti-canvas');
    const confCtx = confCanvas.getContext('2d');
    let confettiParticles = [];

    function resizeConfetti() {
      confCanvas.width = window.innerWidth;
      confCanvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resizeConfetti);
    resizeConfetti();

    function triggerConfetti() {
      const colors = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'];
      for (let i = 0; i < 60; i++) {
        confettiParticles.push({
          x: window.innerWidth / 2,
          y: window.innerHeight / 2,
          vx: (Math.random() - 0.5) * 18,
          vy: (Math.random() - 0.7) * 18,
          size: Math.random() * 8 + 6,
          color: colors[Math.floor(Math.random() * colors.length)],
          rotation: Math.random() * 360,
          rotSpeed: (Math.random() - 0.5) * 10,
          life: 100
        });
      }
    }

    function updateConfetti() {
      confCtx.clearRect(0, 0, confCanvas.width, confCanvas.height);
      for (let i = confettiParticles.length - 1; i >= 0; i--) {
        const p = confettiParticles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.4;
        p.rotation += p.rotSpeed;
        p.life -= 1.5;

        confCtx.save();
        confCtx.translate(p.x, p.y);
        confCtx.rotate((p.rotation * Math.PI) / 180);
        confCtx.fillStyle = p.color;
        confCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        confCtx.restore();

        if (p.life <= 0 || p.y > window.innerHeight) {
          confettiParticles.splice(i, 1);
        }
      }
      requestAnimationFrame(updateConfetti);
    }
    updateConfetti();

    /* =========================================================================
       3. 탭 전환
       ========================================================================= */
    function switchTab(stageNum) {
      document.querySelectorAll('.tab-btn').forEach((btn, idx) => {
        btn.classList.toggle('active', idx === stageNum - 1);
      });
      document.querySelectorAll('.stage-card').forEach((card, idx) => {
        card.classList.toggle('active', idx === stageNum - 1);
      });

      if (stageNum === 3) {
        setTimeout(() => {
          resizeMatchCanvas();
          drawMatchCanvas();
        }, 100);
      }
    }

    /* =========================================================================
       4. STAGE 1: 10 만들기 다양화 로직
       ========================================================================= */
    let stage1Cubes = 0;
    let stage1Target = 10;
    let stage1Mode = 'free'; // 'free', 'quiz', 'double'
    let quizTargetMissing = 0;

    function setStage1Mode(mode) {
      stage1Mode = mode;
      document.querySelectorAll('.mode-chip').forEach(c => c.classList.remove('active'));
      if (mode === 'free') document.getElementById('chip-free').classList.add('active');
      if (mode === 'quiz') document.getElementById('chip-quiz').classList.add('active');
      if (mode === 'double') document.getElementById('chip-double').classList.add('active');

      resetStage1();

      if (mode === 'quiz') {
        const initial = Math.floor(Math.random() * 8) + 1; // 1~8
        quizTargetMissing = 10 - initial;
        stage1Cubes = initial;
        renderStage1();
        document.getElementById('stage1-target-indicator').textContent = `목표: 10개 맞추기`;
        document.getElementById('stage1-bubble').innerHTML = `
          🎯 <strong>퀴즈 미션:</strong> 상자에 낱개가 <strong>${initial}개</strong> 있어요.<br>
          10을 만들려면 <strong>몇 개를 더 넣어야</strong> 할까요? (정답: <strong>${quizTargetMissing}개</strong> 더 넣기!)
        `;
        speak(`상자에 ${initial}개가 있어요. 10을 만들려면 몇 개를 더 넣어야 할까요?`);
      } else if (mode === 'double') {
        stage1Target = 20;
        document.getElementById('stage1-target-indicator').textContent = `목표: 20개 (2묶음)`;
        document.getElementById('stage1-bubble').innerHTML = `
          🌟 <strong>20 만들기 도전!</strong> 낱개를 20개 모아서 <strong>10개 묶음 막대 2개</strong>를 완성해 보세요! (20 = 이십 = 스물)
        `;
        speak('낱개 20개를 모아 10개 묶음 막대 2개를 만들어보세요!');
      } else {
        stage1Target = 10;
        document.getElementById('stage1-target-indicator').textContent = `목표: 10개`;
        document.getElementById('stage1-bubble').innerHTML = `
          💡 <strong>토끼쌤:</strong> 낱개 10개는 <strong>10개씩 1묶음</strong>과 같아요. 10은 <strong>십</strong> 또는 <strong>열</strong>이라고 읽어요!
        `;
      }
    }

    function addSingleCube() {
      if (stage1Cubes >= stage1Target) return;
      stage1Cubes++;
      soundPop();
      renderStage1();

      if (stage1Cubes === 10 && stage1Target === 10) {
        setTimeout(triggerStage1Combine, 300);
      } else if (stage1Cubes === 20 && stage1Target === 20) {
        setTimeout(triggerStage1CombineDouble, 300);
      }
    }

    function renderStage1() {
      const tray = document.getElementById('cube-tray');
      const countEl = document.getElementById('cube-count');
      countEl.textContent = stage1Cubes;

      tray.innerHTML = '';
      for (let i = 0; i < stage1Cubes; i++) {
        const cube = document.createElement('div');
        cube.className = 'single-cube';
        cube.textContent = (i % 10) + 1;
        tray.appendChild(cube);
      }
    }

    function triggerStage1Combine() {
      soundCombine();
      addStar();

      document.getElementById('cube-tray').innerHTML = '<span style="color:#10B981; font-weight:800; font-size:1.2rem;">🌟 10개 완성! 묶음 막대로 합체!</span>';
      document.getElementById('combine-result-tray').innerHTML = `
        <div class="ten-rod">
          ${Array(10).fill('<div class="rod-unit"></div>').join('')}
        </div>
        <div style="font-weight:800; font-size:1.2rem; color:#2563EB; margin-top:8px;">
          ✨ 10개 묶음 막대 1개 (수: 10, 십, 열)
        </div>
      `;
      speak('축하합니다! 낱개 10개가 10개 묶음 막대 1개로 합체했어요!');
    }

    function triggerStage1CombineDouble() {
      soundCombine();
      addStar();

      document.getElementById('cube-tray').innerHTML = '<span style="color:#10B981; font-weight:800; font-size:1.2rem;">🌟 20개 완성! 2묶음 합체!</span>';
      document.getElementById('combine-result-tray').innerHTML = `
        <div style="display:flex; gap:12px;">
          <div class="ten-rod">${Array(10).fill('<div class="rod-unit"></div>').join('')}</div>
          <div class="ten-rod">${Array(10).fill('<div class="rod-unit"></div>').join('')}</div>
        </div>
        <div style="font-weight:800; font-size:1.2rem; color:#2563EB; margin-top:8px;">
          ✨ 10개 묶음 막대 2개 (수: 20, 이십, 스물)
        </div>
      `;
      speak('대단해요! 낱개 20개가 모여 10개 묶음 막대 2개가 되었어요!');
    }

    function resetStage1() {
      stage1Cubes = 0;
      stage1Target = stage1Mode === 'double' ? 20 : 10;
      renderStage1();
      document.getElementById('combine-result-tray').innerHTML = `
        <span id="combine-placeholder" style="color:var(--text-muted); font-weight:600;">낱개가 10개가 되면 막대로 변신합니다!</span>
      `;
    }

    function loadPresetStage1(initial, add) {
      setStage1Mode('free');
      stage1Cubes = initial;
      renderStage1();
      speak(`${initial}에 ${add}을 더해 10을 완성해보세요!`);
      document.getElementById('stage1-bubble').innerHTML = `
        🎯 <strong>짝꿍수 미션:</strong> <strong>${initial}</strong>에 낱개 <strong>${add}개</strong>를 더 넣으면 10이 완성됩니다!
      `;
    }

    /* =========================================================================
       5. STAGE 2: 그리드 문제
       ========================================================================= */
    const sinoDigit = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
    const sinoTens = ['', '십', '이십', '삼십', '사십', '오십'];
    const nativeTens = ['', '열', '스물', '서른', '마흔', '쉰'];
    const nativeDigit = ['', '하나', '둘', '셋', '넷', '다섯', '여섯', '일곱', '여덟', '아홉'];

    function getNumberNames(num) {
      const t = Math.floor(num / 10);
      const o = num % 10;
      let sino = '';
      let native = '';

      if (num === 10) { sino = '십'; native = '열'; }
      else if (num === 20) { sino = '이십'; native = '스물'; }
      else if (num === 30) { sino = '삼십'; native = '서른'; }
      else if (num === 40) { sino = '사십'; native = '마흔'; }
      else if (num === 50) { sino = '오십'; native = '쉰'; }
      else {
        sino = (t === 1 ? '십' : sinoTens[t]) + sinoDigit[o];
        native = nativeTens[t] + nativeDigit[o];
      }
      return { sino, native };
    }

    let currentProblem = { tens: 2, ones: 4 };

    function generateRandomGridProblem() {
      const t = Math.floor(Math.random() * 4) + 1; // 1~4
      const o = Math.floor(Math.random() * 9) + 1; // 1~9
      currentProblem = { tens: t, ones: o };
      renderStage2Problem();
    }

    function renderStage2Problem() {
      const p = currentProblem;
      const modelArea = document.getElementById('stage2-model-area');
      modelArea.innerHTML = '';

      const rodGroup = document.createElement('div');
      rodGroup.className = 'rod-group';
      for (let i = 0; i < p.tens; i++) {
        const rod = document.createElement('div');
        rod.className = 'ten-rod';
        rod.innerHTML = Array(10).fill('<div class="rod-unit"></div>').join('');
        rodGroup.appendChild(rod);
      }
      modelArea.appendChild(rodGroup);

      if (p.ones > 0) {
        const cubeGroup = document.createElement('div');
        cubeGroup.className = 'cube-group';
        for (let i = 0; i < p.ones; i++) {
          const cube = document.createElement('div');
          cube.className = 'single-cube';
          cube.textContent = i + 1;
          cubeGroup.appendChild(cube);
        }
        modelArea.appendChild(cubeGroup);
      }

      ['input-tens', 'input-ones', 'input-total'].forEach(id => {
        const el = document.getElementById(id);
        el.value = '';
        el.className = 'num-input';
      });

      const names = getNumberNames(p.tens * 10 + p.ones);
      document.getElementById('korean-read-hint').textContent = `(읽기: ${names.sino}, ${names.native})`;
    }

    function checkAnswerStage2() {
      const p = currentProblem;
      const userTens = parseInt(document.getElementById('input-tens').value);
      const userOnes = parseInt(document.getElementById('input-ones').value);
      const userTotal = parseInt(document.getElementById('input-total').value);

      const isTensCorrect = userTens === p.tens;
      const isOnesCorrect = userOnes === p.ones;
      const isTotalCorrect = userTotal === (p.tens * 10 + p.ones);

      document.getElementById('input-tens').className = `num-input ${isTensCorrect ? 'correct' : 'wrong'}`;
      document.getElementById('input-ones').className = `num-input ${isOnesCorrect ? 'correct' : 'wrong'}`;
      document.getElementById('input-total').className = `num-input ${isTotalCorrect ? 'correct' : 'wrong'}`;

      if (isTensCorrect && isOnesCorrect && isTotalCorrect) {
        soundSuccess();
        addStar(1, false);
        const names = getNumberNames(p.tens * 10 + p.ones);
        speak(`참 잘했어요! 10개씩 ${p.tens}묶음과 낱개 ${p.ones}개는 ${p.tens * 10 + p.ones}입니다!`);
      } else {
        soundWrong();
        window.wrongNotes.push({
          text: `50까지의 수 표 채우기 (10개씩 ${p.tens}묶음, 낱개 ${p.ones}개)`,
          wrongInput: `${userTens || '?'}묶음 ${userOnes || '?'}개 (전체: ${userTotal || '?'})`
        });
        speak('다시 세어보세요. 움직이는 풀이과정을 참고해보세요!');
      }
    }

    function nextProblemStage2() {
      generateRandomGridProblem();
    }

    /* 풀이 모달 */
    let explainStep = 1;
    function showExplanationStage2() {
      document.getElementById('explain-modal').classList.add('show');
      explainStep = 1;
      updateExplainStepView();
    }

    function closeExplanationModal() {
      document.getElementById('explain-modal').classList.remove('show');
    }

    function updateExplainStepView() {
      const p = currentProblem;
      const stage = document.getElementById('modal-anim-stage');
      const text = document.getElementById('modal-explain-text');
      const counter = document.getElementById('modal-step-counter');
      const names = getNumberNames(p.tens * 10 + p.ones);

      counter.textContent = `${explainStep} / 3 단계`;

      if (explainStep === 1) {
        stage.innerHTML = `
          <div class="rod-group" style="background:#FEF3C7; border-color:#F59E0B;">
            ${Array(p.tens).fill(`<div class="ten-rod">${Array(10).fill('<div class="rod-unit"></div>').join('')}</div>`).join('')}
          </div>
        `;
        text.innerHTML = `1️⃣ <strong>10개씩 묶음 막대</strong>가 <span style="color:#2563EB; font-size:1.3rem;">${p.tens}개</span> 있으므로 <strong>10개씩 ${p.tens}묶음</strong>입니다.`;
        speak(`1단계: 10개씩 묶음 막대가 ${p.tens}개 있습니다.`);
      } else if (explainStep === 2) {
        stage.innerHTML = `
          <div class="cube-group" style="background:#FEF3C7; border-color:#F59E0B;">
            ${Array(p.ones).fill(0).map((_, i) => `<div class="single-cube">${i + 1}</div>`).join('')}
          </div>
        `;
        text.innerHTML = `2️⃣ <strong>낱개 큐브</strong>가 <span style="color:#EA580C; font-size:1.3rem;">${p.ones}개</span> 있습니다.`;
        speak(`2단계: 낱개 큐브는 ${p.ones}개 있습니다.`);
      } else if (explainStep === 3) {
        const total = p.tens * 10 + p.ones;
        stage.innerHTML = `
          <div style="font-size:2.2rem; font-weight:800; color:#4F46E5;">
            ${p.tens * 10} + ${p.ones} = <span style="color:#10B981;">${total}</span>
          </div>
        `;
        text.innerHTML = `3️⃣ 합치면 <strong>${total}</strong>이 되고, <strong>${names.sino}</strong> 또는 <strong>${names.native}</strong>(이)라고 읽습니다! ✨`;
        speak(`3단계: 합치면 ${total}이 됩니다!`);
      }
    }

    function nextExplainStep() {
      if (explainStep < 3) { explainStep++; updateExplainStepView(); }
      else { closeExplanationModal(); }
    }
    function prevExplainStep() {
      if (explainStep > 1) { explainStep--; updateExplainStepView(); }
    }

    /* =========================================================================
       6. STAGE 3: 무작위 셔플 선 잇기 (랜덤 생성 & 배치)
       ========================================================================= */
    let currentMatchItems = [];
    let matchLines = [];
    let activeDrag = null;

    function shuffleArray(arr) {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    }

    function generateNewRandomMatching() {
      matchLines = [];

      // 10~50 사이에서 4개의 서로 다른 수를 무작위 선택
      const allPossible = [10, 20, 30, 40, 50, 12, 23, 34, 45, 16, 27, 38, 49, 15, 25, 35, 42];
      const selected = shuffleArray(allPossible).slice(0, 4);

      currentMatchItems = selected.map(val => {
        const t = Math.floor(val / 10);
        const o = val % 10;
        const names = getNumberNames(val);
        return {
          val: val,
          tens: t,
          ones: o,
          sino: names.sino,
          native: names.native
        };
      });

      renderMatchingBoard();
    }

    function renderMatchingBoard() {
      const colModels = document.getElementById('col-models');
      const colSino = document.getElementById('col-sino');
      const colDigits = document.getElementById('col-digits');
      const colNative = document.getElementById('col-native');

      colModels.innerHTML = '<div class="match-col-header">수 모형</div>';
      colSino.innerHTML = '<div class="match-col-header">읽기 (한자어)</div>';
      colDigits.innerHTML = '<div class="match-col-header">숫자</div>';
      colNative.innerHTML = '<div class="match-col-header">읽기 (우리말)</div>';

      // 각 열마다 무작위로 셔플!
      const modelsShuffled = shuffleArray(currentMatchItems);
      const sinoShuffled = shuffleArray(currentMatchItems);
      const digitsShuffled = shuffleArray(currentMatchItems);
      const nativeShuffled = shuffleArray(currentMatchItems);

      // 1열 모형
      modelsShuffled.forEach(d => {
        const item = document.createElement('div');
        item.className = 'match-item';
        item.dataset.val = d.val;
        item.innerHTML = `
          <div style="display:flex; gap:4px; align-items:center;">
            ${Array(d.tens).fill('<div style="width:8px; height:42px; background:#3B82F6; border-radius:2px;"></div>').join('')}
            ${d.ones > 0 ? `<div style="display:flex; flex-direction:column; gap:2px;">${Array(d.ones).fill('<div style="width:6px; height:6px; background:#F97316; border-radius:1px;"></div>').join('')}</div>` : ''}
          </div>
          <div class="match-dot dot-right" data-col="0" data-val="${d.val}"></div>
        `;
        colModels.appendChild(item);
      });

      // 2열 한자어
      sinoShuffled.forEach(d => {
        const item = document.createElement('div');
        item.className = 'match-item';
        item.dataset.val = d.val;
        item.innerHTML = `
          <div class="match-dot dot-left" data-col="1" data-side="left" data-val="${d.val}"></div>
          <span>${d.sino}</span>
          <div class="match-dot dot-right" data-col="1" data-side="right" data-val="${d.val}"></div>
        `;
        colSino.appendChild(item);
      });

      // 3열 숫자
      digitsShuffled.forEach(d => {
        const item = document.createElement('div');
        item.className = 'match-item';
        item.dataset.val = d.val;
        item.innerHTML = `
          <div class="match-dot dot-left" data-col="2" data-side="left" data-val="${d.val}"></div>
          <span>${d.val}</span>
          <div class="match-dot dot-right" data-col="2" data-side="right" data-val="${d.val}"></div>
        `;
        colDigits.appendChild(item);
      });

      // 4열 우리말
      nativeShuffled.forEach(d => {
        const item = document.createElement('div');
        item.className = 'match-item';
        item.dataset.val = d.val;
        item.innerHTML = `
          <div class="match-dot dot-left" data-col="3" data-val="${d.val}"></div>
          <span>${d.native}</span>
        `;
        colNative.appendChild(item);
      });

      setupMatchEvents();
      resizeMatchCanvas();
      drawMatchCanvas();
    }

    function setupMatchEvents() {
      const wrapper = document.getElementById('match-board-wrapper');

      wrapper.onmousedown = wrapper.ontouchstart = function(e) {
        const dot = e.target.closest('.match-dot');
        if (!dot) return;

        const rect = wrapper.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        activeDrag = {
          startDot: dot,
          currentX: clientX - rect.left,
          currentY: clientY - rect.top
        };
        soundPop();
      };

      window.onmousemove = window.ontouchmove = function(e) {
        if (!activeDrag) return;
        const wrapper = document.getElementById('match-board-wrapper');
        const rect = wrapper.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        activeDrag.currentX = clientX - rect.left;
        activeDrag.currentY = clientY - rect.top;
        drawMatchCanvas();
      };

      window.onmouseup = window.ontouchend = function(e) {
        if (!activeDrag) return;
        const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
        const clientY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;

        const targetEl = document.elementFromPoint(clientX, clientY);
        const targetDot = targetEl ? targetEl.closest('.match-dot') : null;

        if (targetDot && targetDot !== activeDrag.startDot) {
          handleConnectDots(activeDrag.startDot, targetDot);
        }

        activeDrag = null;
        drawMatchCanvas();
      };
    }

    function handleConnectDots(dot1, dot2) {
      const col1 = parseInt(dot1.dataset.col);
      const col2 = parseInt(dot2.dataset.col);
      const val1 = parseInt(dot1.dataset.val);
      const val2 = parseInt(dot2.dataset.val);

      if (Math.abs(col1 - col2) === 1) {
        if (val1 === val2) {
          // 이미 연결되었는지 확인
          const exists = matchLines.some(l => 
            (l.from === dot1 && l.to === dot2) || (l.from === dot2 && l.to === dot1)
          );
          if (!exists) {
            soundSuccess();
            matchLines.push({
              from: col1 < col2 ? dot1 : dot2,
              to: col1 < col2 ? dot2 : dot1,
              val: val1
            });
            addStar();
            checkAllMatchingDone();
          }
        } else {
          soundWrong();
        }
      }
    }

    function resizeMatchCanvas() {
      const wrapper = document.getElementById('match-board-wrapper');
      const canvas = document.getElementById('match-canvas');
      if (!wrapper || !canvas) return;
      canvas.width = wrapper.clientWidth;
      canvas.height = wrapper.clientHeight;
    }
    window.addEventListener('resize', () => {
      resizeMatchCanvas();
      drawMatchCanvas();
    });

    function drawMatchCanvas() {
      const canvas = document.getElementById('match-canvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const wrapper = document.getElementById('match-board-wrapper');
      const wrapRect = wrapper.getBoundingClientRect();

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      matchLines.forEach(line => {
        const r1 = line.from.getBoundingClientRect();
        const r2 = line.to.getBoundingClientRect();
        const x1 = r1.left + r1.width / 2 - wrapRect.left;
        const y1 = r1.top + r1.height / 2 - wrapRect.top;
        const x2 = r2.left + r2.width / 2 - wrapRect.left;
        const y2 = r2.top + r2.height / 2 - wrapRect.top;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = '#10B981';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.stroke();
      });

      if (activeDrag) {
        const r1 = activeDrag.startDot.getBoundingClientRect();
        const x1 = r1.left + r1.width / 2 - wrapRect.left;
        const y1 = r1.top + r1.height / 2 - wrapRect.top;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(activeDrag.currentX, activeDrag.currentY);
        ctx.strokeStyle = '#6366F1';
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 6]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    function checkAllMatchingDone() {
      if (matchLines.length >= 12) {
        soundSuccess();
        speak('우와! 모든 줄을 완벽하게 다 이었어요! 새로운 문제에 도전해보세요!');
        setTimeout(() => {
          if (confirm('🎉 완벽해요! 새로운 랜덤 문제로 또 풀어볼까요?')) {
            generateNewRandomMatching();
          }
        }, 600);
      }
    }

    function resetCurrentMatchingLines() {
      matchLines = [];
      drawMatchCanvas();
    }

    function autoSolveMatching() {
      matchLines = [];
      speak('정답 풀이 과정을 보여줄게요!');
      
      const dots = Array.from(document.querySelectorAll('.match-dot'));
      let delay = 0;

      currentMatchItems.forEach(item => {
        const val = item.val;
        const dot0 = dots.find(d => d.dataset.col === '0' && parseInt(d.dataset.val) === val);
        const dot1Left = dots.find(d => d.dataset.col === '1' && d.dataset.side === 'left' && parseInt(d.dataset.val) === val);
        const dot1Right = dots.find(d => d.dataset.col === '1' && d.dataset.side === 'right' && parseInt(d.dataset.val) === val);
        const dot2Left = dots.find(d => d.dataset.col === '2' && d.dataset.side === 'left' && parseInt(d.dataset.val) === val);
        const dot2Right = dots.find(d => d.dataset.col === '2' && d.dataset.side === 'right' && parseInt(d.dataset.val) === val);
        const dot3 = dots.find(d => d.dataset.col === '3' && parseInt(d.dataset.val) === val);

        setTimeout(() => {
          if (dot0 && dot1Left) matchLines.push({ from: dot0, to: dot1Left, val });
          soundPop();
          drawMatchCanvas();
        }, delay += 300);

        setTimeout(() => {
          if (dot1Right && dot2Left) matchLines.push({ from: dot1Right, to: dot2Left, val });
          soundPop();
          drawMatchCanvas();
        }, delay += 300);

        setTimeout(() => {
          if (dot2Right && dot3) matchLines.push({ from: dot2Right, to: dot3, val });
          soundSuccess();
          drawMatchCanvas();
        }, delay += 300);
      });
    }

    /* =========================================================================
       7. STAGE 4: 기차 수 순서 & 무한 크기 비교 로직
       ========================================================================= */
    let currentTrainData = [];

    function generateRandomTrainTrack() {
      const start = Math.floor(Math.random() * 41) + 1; // 1~41 시작
      const length = 7;
      currentTrainData = [];

      // 7개 연속 수 중 무작위 2~3개 위치를 빈칸으로 지정
      const blankIndices = new Set();
      while (blankIndices.size < 3) {
        blankIndices.add(Math.floor(Math.random() * length));
      }

      for (let i = 0; i < length; i++) {
        currentTrainData.push({
          num: start + i,
          isBlank: blankIndices.has(i)
        });
      }

      renderTrainTrack();
    }

    function renderTrainTrack() {
      const track = document.getElementById('train-track');
      track.innerHTML = '';

      currentTrainData.forEach((item, idx) => {
        const car = document.createElement('div');
        car.className = 'car-box';

        if (!item.isBlank) {
          car.innerHTML = `
            <div class="car-icon">🚃</div>
            <div class="car-num">${item.num}</div>
          `;
        } else {
          car.innerHTML = `
            <div class="car-icon">❓</div>
            <input type="number" class="car-input" id="train-in-${idx}" placeholder="?">
          `;
        }
        track.appendChild(car);
      });
    }

    function checkTrainTrack() {
      let allCorrect = true;

      currentTrainData.forEach((item, idx) => {
        if (item.isBlank) {
          const inputEl = document.getElementById(`train-in-${idx}`);
          const val = parseInt(inputEl.value);
          if (val === item.num) {
            inputEl.style.borderColor = '#10B981';
            inputEl.style.backgroundColor = '#ECFDF5';
          } else {
            allCorrect = false;
            inputEl.style.borderColor = '#EF4444';
            inputEl.style.backgroundColor = '#FEF2F2';
          }
        }
      });

      if (allCorrect) {
        soundSuccess();
        addStar();
        speak('정답입니다! 칙칙폭폭 기차가 출발합니다!');
        setTimeout(() => {
          generateRandomTrainTrack(); // 맞추면 즉시 다음 새로운 랜덤 기차 생성!
        }, 1200);
      } else {
        soundWrong();
        speak('빈칸의 숫자를 다시 확인해보세요!');
      }
    }

    /* === 무한 크기 비교 퀴즈 로직 === */
    let compQuizType = 'greater';
    let compNum1 = 0;
    let compNum2 = 0;
    let compStreak = 0;

    function generateNextCompQuiz() {
      compQuizType = Math.random() > 0.5 ? 'greater' : 'smaller';
      compNum1 = Math.floor(Math.random() * 50) + 1;
      compNum2 = Math.floor(Math.random() * 50) + 1;
      while (compNum1 === compNum2) {
        compNum2 = Math.floor(Math.random() * 50) + 1;
      }

      const qEl = document.getElementById('comp-quiz-question');
      if (compQuizType === 'greater') {
        qEl.innerHTML = `🚩 [문제] 두 수 중 <span style="color:#EF4444; text-decoration:underline;">더 큰 수</span>를 터치하세요!`;
        speak(`두 수 중 더 큰 수는 어느 것일까요?`);
      } else {
        qEl.innerHTML = `🚩 [문제] 두 수 중 <span style="color:#3B82F6; text-decoration:underline;">더 작은 수</span>를 터치하세요!`;
        speak(`두 수 중 더 작은 수는 어느 것일까요?`);
      }

      const btnL = document.getElementById('comp-btn-left');
      const btnR = document.getElementById('comp-btn-right');
      btnL.textContent = compNum1;
      btnR.textContent = compNum2;
      btnL.className = 'comp-choice-card';
      btnR.className = 'comp-choice-card';
      document.getElementById('comp-feedback-msg').textContent = '';
    }

    function handleCompChoice(side) {
      const chosenNum = side === 'left' ? compNum1 : compNum2;
      const targetCorrect = compQuizType === 'greater' ? Math.max(compNum1, compNum2) : Math.min(compNum1, compNum2);
      const clickedBtn = side === 'left' ? document.getElementById('comp-btn-left') : document.getElementById('comp-btn-right');
      const fb = document.getElementById('comp-feedback-msg');

      if (chosenNum === targetCorrect) {
        soundSuccess();
        addStar(1, false);
        compStreak++;
        document.getElementById('comp-streak-count').textContent = compStreak;
        clickedBtn.classList.add('correct');
        fb.innerHTML = `<span style="color:#10B981;">🎉 딩동댕! 정답입니다! (${compNum1}과 ${compNum2} 중 ${targetCorrect}이(가) 맞아요)</span>`;
        
        setTimeout(() => {
          generateNextCompQuiz();
        }, 1100);
      } else {
        soundWrong();
        window.wrongNotes.push({
          text: `크기 비교 (${compNum1} vs ${compNum2}, ${compQuizType === 'greater' ? '더 큰 수 찾기' : '더 작은 수 찾기'})`,
          wrongInput: `선택: ${chosenNum}`
        });
        compStreak = 0;
        document.getElementById('comp-streak-count').textContent = compStreak;
        clickedBtn.classList.add('wrong');
        fb.innerHTML = `<span style="color:#EF4444;">앗! 다시 생각해볼까요? 십의 자리와 일의 자리를 비교해보세요!</span>`;
      }
    }

    /* 방 나가기 및 학습일지/오답노트 전송 */
    let isExiting = false;
    window.exitRoom = async function(force = false) {
      if (isExiting) return;
      isExiting = true;

      const childName = localStorage.getItem('currentUser') === 'son' ? '민수' : '민서';
      const errorReportText = window.wrongNotes.length > 0
        ? window.wrongNotes.map(n => `${n.text} (${n.wrongInput})`).join(' / ')
        : "오답 없음 (완벽 달성!)";

      if (typeof sendStudyLogToNotion === 'function') {
        try {
          await sendStudyLogToNotion({
            childName: childName,
            subject: "수학(50까지의 수)",
            errorReport: errorReportText
          });
        } catch (e) {
          console.error("학습일지 전송 실패:", e);
        }
      }

      location.href = 'math.html';
    };

    window.addEventListener('pagehide', () => {
      if (!isExiting && typeof window.exitRoom === 'function') {
        window.exitRoom(true);
      }
    });

    /* 초기화 & 프로필 로드 */
    document.addEventListener("DOMContentLoaded", () => {
      let currentProfile = localStorage.getItem('currentUser') || 'daughter';
      const name = currentProfile === 'son' ? '민수' : (currentProfile === 'daughter' ? '민서' : '어른');
      const icon = currentProfile === 'son' ? '👦' : (currentProfile === 'daughter' ? '👧' : '👨‍💻');
      
      const savedTheme = localStorage.getItem('currentTheme') || (currentProfile === 'daughter' ? '슬라임' : '마인크래프트');
      const themeClass = savedTheme === '슬라임' ? 'theme--slime' : 'theme--arcade';
      document.body.className = themeClass;

      document.getElementById('userName').textContent = `${name} 대원`;
      document.getElementById('userIcon').textContent = icon;

      renderStage1();
      generateRandomGridProblem();
      generateNewRandomMatching();
      generateRandomTrainTrack();
      generateNextCompQuiz();

      // 🧚 수학요정 코코 시동
      if (typeof initFairyAudio === 'function') initFairyAudio();
      if (typeof initFairyChat === 'function') initFairyChat("MATH", "50까지의수");
      if (typeof updateTtsToggleUi === 'function') updateTtsToggleUi();
    });
