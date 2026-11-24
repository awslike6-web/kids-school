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
    // 오답은 경고음 대신 요정 격려 (에러리스, 2026-11-24 1학년 다리 B 묶음)
    function soundWrong() { if (typeof fairyEncourage === 'function') fairyEncourage(); }

    // 3지선다 고르기 줄: 틀린 보기는 꺼지고 힌트를 읽어 주며 정답 보기가 반짝인다. 보기 순서는 QuizChoices로 섞는다
    function renderPickChoices(box, values, answer, opts) {
      const o = opts || {};
      box.replaceChildren();
      const hintEl = o.hintEl || null;
      if (hintEl) { hintEl.hidden = true; hintEl.textContent = ''; }
      const list = window.QuizChoices ? window.QuizChoices.arrange(values).map(c => c.text) : values.slice();
      let rightBtn = null, solved = false;
      list.forEach(v => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'pick-btn';
        btn.textContent = String(v);
        if (String(v) === String(answer)) rightBtn = btn;
        btn.onclick = () => {
          if (solved || btn.disabled) return;
          if (String(v) === String(answer)) {
            solved = true; btn.classList.add('is-correct'); btn.classList.remove('is-glow');
            soundPop();
            if (o.onRight) o.onRight();
          } else {
            btn.disabled = true; btn.classList.add('is-off');
            if (rightBtn) rightBtn.classList.add('is-glow');
            if (hintEl && o.hint) { hintEl.hidden = false; hintEl.textContent = '💡 ' + o.hint; }
            soundWrong();
            if (o.hint) speak(o.hint);
            if (o.onWrong) o.onWrong(String(v));
          }
        };
        box.appendChild(btn);
      });
    }

    // 정답과 다르고 범위 안인 오답 2개 (후보를 차례로)
    function pickWrongs(answer, candidates, lo, hi) {
      const out = [];
      candidates.forEach(v => { if (out.length < 2 && Number.isInteger(v) && v >= lo && v <= hi && v !== answer && !out.includes(v)) out.push(v); });
      [answer + 1, answer - 1, answer + 2, answer - 2].forEach(v => { if (out.length < 2 && v >= lo && v <= hi && v !== answer && !out.includes(v)) out.push(v); });
      return out;
    }

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

      if (typeof stopFairyTTS === 'function') stopFairyTTS();
      // 단계를 열 때 그 단계의 질문을 읽어 준다 (숨은 단계는 읽지 않음, 2026-11-24)
      if (stageNum === 2) speakStage2Question();
      if (stageNum === 4 && typeof speakCompQuestion === 'function') speakCompQuestion();
      if (stageNum === 3) {
        setTimeout(() => {
          resizeMatchCanvas();
          drawMatchCanvas();
        }, 100);
      }
    }

    function isStageShown(n) {
      const card = document.getElementById('stage-' + n);
      return Boolean(card && card.classList.contains('active'));
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

      ['cell-tens', 'cell-ones', 'cell-total'].forEach(id => {
        const el = document.getElementById(id);
        el.textContent = '?';
        el.className = 'grid-cell-answer';
      });
      const readHint = document.getElementById('korean-read-hint');
      readHint.hidden = true;
      readHint.textContent = '';
      stage2Step = 0;
      askStage2Step();
    }

    // 2단계: 묶음 → 낱개 → 모두를 차례로 고른다 (누르기 3~6번, 키보드 없음)
    let stage2Step = 0;
    function stage2Steps() {
      const p = currentProblem, n = p.tens * 10 + p.ones;
      return [
        { q: '10개씩 묶음은 몇 개예요?', ans: p.tens, wrongs: pickWrongs(p.tens, [p.ones, p.tens + 1], 1, 9), cell: 'cell-tens', hint: '긴 막대를 하나씩 세어 봐요' },
        { q: '낱개는 몇 개예요?', ans: p.ones, wrongs: pickWrongs(p.ones, [p.tens, p.ones + 1], 0, 9), cell: 'cell-ones', hint: '작은 조각을 하나씩 세어 봐요' },
        { q: '모두 얼마예요?', ans: n, wrongs: pickWrongs(n, [p.ones * 10 + p.tens, p.tens + p.ones], 1, 50), cell: 'cell-total', hint: '묶음 수를 앞에, 낱개 수를 뒤에 써요' }
      ];
    }

    function speakStage2Question() {
      const step = stage2Steps()[stage2Step];
      speak(step ? step.q : '그림을 보고 10개씩 묶음과 낱개를 세어 봐요.');
    }

    function askStage2Step() {
      const p = currentProblem, n = p.tens * 10 + p.ones;
      const step = stage2Steps()[stage2Step];
      const qEl = document.getElementById('s2-question');
      const box = document.getElementById('s2-choices');
      if (!step) {
        const names = getNumberNames(n);
        const readHint = document.getElementById('korean-read-hint');
        readHint.textContent = `(읽기: ${names.sino}, ${names.native})`;
        readHint.hidden = false;
        qEl.textContent = '🎉 다 채웠어요!';
        box.replaceChildren();
        soundSuccess();
        addStar(1, false);
        speak(`참 잘했어요! 10개씩 묶음 ${p.tens}개와 낱개 ${p.ones}개는 ${n}이에요!`);
        return;
      }
      qEl.textContent = step.q;
      document.getElementById(step.cell).classList.add('is-asking');
      if (isStageShown(2)) speak(step.q);
      renderPickChoices(box, [step.ans, ...step.wrongs], step.ans, {
        hint: step.hint,
        hintEl: document.getElementById('s2-hint'),
        onWrong: (v) => window.wrongNotes.push({ text: `50까지의 수 표 채우기 (10개씩 ${p.tens}묶음, 낱개 ${p.ones}개) · ${step.q}`, wrongInput: v }),
        onRight: () => {
          const cell = document.getElementById(step.cell);
          cell.textContent = String(step.ans);
          cell.className = 'grid-cell-answer correct';
          stage2Step++;
          setTimeout(askStage2Step, 500);
        }
      });
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

