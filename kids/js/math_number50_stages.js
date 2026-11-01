// kids/js/math_number50_stages.js - math_number50.js 분리 2/2: STAGE 3·4·나가기·초기화 (math_number50.js 다음에 로드)
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
