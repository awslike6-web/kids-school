/**
 * ========================================================
 * 🍬 수학방 3대 인터랙티브 학습 엔진 (math_factors_logic.js)
 * 1. 사탕 분배 시뮬레이터 (약수 시각화 & 비약수 나머지 검출)
 * 2. 구구단 짝꿍 찾기 게임 (두 수의 곱 매칭)
 * 3. 모눈종이 세로셈 보드 (엑셀형 격자 나눗셈 자릿수 완벽 정렬)
 * 4. 💎 민수(다이아) & 🍬 민서(하리보) 노션 보상/오답노트/학습일지 연동
 * ========================================================
 */

// 전역 과목 및 오답노트 버퍼 초기화
window.currentSubject = "수학";
window.wrongNotes = window.wrongNotes || [];
window.roomStartTime = window.roomStartTime || new Date();

// 사운드 시스템
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

function soundPop() { playTone(587.33, 'triangle', 0.1, 0.25); }
function soundSuccess() {
  [523.25, 659.25, 783.99, 1046.50].forEach((f, i) => {
    setTimeout(() => playTone(f, 'sine', 0.18, 0.25), i * 75);
  });
}
function soundWrong() { playTone(220, 'sawtooth', 0.25, 0.25); }
function soundFly() {
  [440, 554.37, 659.25, 880].forEach((f, i) => {
    setTimeout(() => playTone(f, 'triangle', 0.1, 0.15), i * 40);
  });
}

function speak(text) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'ko-KR';
  utter.rate = 0.95;
  window.speechSynthesis.speak(utter);
}

/* ========================================================
   보상 지급 및 자산 UI 헬퍼 연동
   ======================================================== */
async function giveMathReward(amount = 1, isSilent = false) {
  if (typeof grantRewardAndShowUI === 'function') {
    try {
      await grantRewardAndShowUI(amount, isSilent);
    } catch (e) {
      console.warn("보상 지급 연동 실패(오프라인 모드):", e);
    }
  }
}

function recordMathWrongAnswer(problemText, wrongInputText) {
  window.wrongNotes.push({
    text: problemText,
    wrongInput: wrongInputText,
    time: new Date().toLocaleTimeString()
  });
  console.log(`📝 [오답노트 기록] ${problemText} -> ${wrongInputText}`);
}

/* ========================================================
   Confetti 폭죽 효과
   ======================================================== */
const confCanvas = document.getElementById('confetti-canvas');
let confCtx = null;
let confettiParticles = [];

if (confCanvas) {
  confCtx = confCanvas.getContext('2d');
  function resizeConfetti() {
    confCanvas.width = window.innerWidth;
    confCanvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeConfetti);
  resizeConfetti();

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
}

function triggerConfetti() {
  const colors = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'];
  for (let i = 0; i < 70; i++) {
    confettiParticles.push({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
      vx: (Math.random() - 0.5) * 20,
      vy: (Math.random() - 0.7) * 20,
      size: Math.random() * 8 + 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 10,
      life: 100
    });
  }
}

/* ========================================================
   1. [사탕 분배 시뮬레이터] 로직
   ======================================================== */
let candyTargetNum = 12;
const candyIcons = ['🍭', '🍬', '🍡', '🍫', '🍩'];

function setCandyTarget(num) {
  candyTargetNum = num;
  document.querySelectorAll('.candy-num-btn').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.num) === num);
  });
  renderCandyBasket();
  resetCandyPlates();
  soundPop();
  speak(`사탕 ${num}개를 준비했어요! 몇 명에게 똑같이 나누어 줄까요?`);
}

function renderCandyBasket() {
  const tray = document.getElementById('candies-tray');
  const countEl = document.getElementById('basket-count-display');
  if (!tray || !countEl) return;

  countEl.textContent = `${candyTargetNum}개`;
  tray.innerHTML = '';

  for (let i = 0; i < candyTargetNum; i++) {
    const candy = document.createElement('div');
    candy.className = 'candy-item';
    candy.id = `candy-item-${i}`;
    candy.textContent = candyIcons[i % candyIcons.length];
    tray.appendChild(candy);
  }
}

function resetCandyPlates() {
  const grid = document.getElementById('plates-grid');
  const leftoverSlot = document.getElementById('leftover-candies-slot');
  const leftoverBox = document.getElementById('leftover-box');
  const banner = document.getElementById('candy-feedback-banner');

  if (grid) grid.innerHTML = '<div style="color:var(--text-muted); font-weight:700; text-align:center; width:100%; padding:20px;">아래의 [나누기] 버튼을 눌러보세요!</div>';
  if (leftoverSlot) leftoverSlot.innerHTML = '<span style="color:var(--text-muted); font-size:0.9rem;">없음</span>';
  if (leftoverBox) leftoverBox.style.display = 'none';
  if (banner) {
    banner.className = 'candy-feedback-banner';
    banner.style.display = 'none';
  }
}

function distributeCandies(divisor) {
  soundFly();
  const quotient = Math.floor(candyTargetNum / divisor);
  const remainder = candyTargetNum % divisor;
  const isFactor = (remainder === 0);

  const grid = document.getElementById('plates-grid');
  grid.innerHTML = '';

  // 접시 생성
  for (let p = 0; p < divisor; p++) {
    const plate = document.createElement('div');
    plate.className = 'plate-box';
    plate.id = `plate-box-${p}`;
    plate.innerHTML = `
      <div class="plate-title">🍽️ ${p + 1}번 접시</div>
      <div class="plate-candy-slot" id="plate-slot-${p}"></div>
    `;
    grid.appendChild(plate);
  }

  // 바구니 비우기 & 접시에 담기
  const tray = document.getElementById('candies-tray');
  tray.innerHTML = '';
  document.getElementById('basket-count-display').textContent = '0개 (분배 완료)';

  let candyIndex = 0;
  for (let q = 0; q < quotient; q++) {
    for (let p = 0; p < divisor; p++) {
      const plateSlot = document.getElementById(`plate-slot-${p}`);
      const candy = document.createElement('div');
      candy.className = 'candy-item';
      candy.textContent = candyIcons[candyIndex % candyIcons.length];
      plateSlot.appendChild(candy);
      candyIndex++;
    }
  }

  // 남은 사탕 처리
  const leftoverBox = document.getElementById('leftover-box');
  const leftoverSlot = document.getElementById('leftover-candies-slot');
  if (remainder > 0) {
    leftoverBox.style.display = 'flex';
    leftoverSlot.innerHTML = '';
    for (let r = 0; r < remainder; r++) {
      const candy = document.createElement('div');
      candy.className = 'candy-item';
      candy.style.borderColor = '#EF4444';
      candy.textContent = candyIcons[candyIndex % candyIcons.length];
      leftoverSlot.appendChild(candy);
      candyIndex++;
    }
  } else {
    leftoverBox.style.display = 'none';
  }

  // 결과 피드백 & 보상/오답노트 연동
  const banner = document.getElementById('candy-feedback-banner');
  if (isFactor) {
    soundSuccess();
    triggerConfetti();
    giveMathReward(1, true); // 💎/🍬 +1 보상 지급
    banner.className = 'candy-feedback-banner success';
    banner.innerHTML = `🎉 <strong>완벽한 약수!</strong> ${candyTargetNum}개를 ${divisor}명에게 <strong>${quotient}개씩</strong> 똑같이 나누어 주었어요! (나머지: 0)`;
    speak(`대단해요! ${candyTargetNum}은 ${divisor}로 딱 나누어떨어지므로, ${divisor}는 ${candyTargetNum}의 약수입니다!`);
  } else {
    soundWrong();
    recordMathWrongAnswer(`사탕 분배: ${candyTargetNum}개 ÷ ${divisor}명`, `나머지 ${remainder}개 발생 (약수 아님)`);
    banner.className = 'candy-feedback-banner danger';
    banner.innerHTML = `⚠️ <strong>나머지 ${remainder}개 발생!</strong> ${divisor}명에게 ${quotient}개씩 나누었지만 <strong>${remainder}개가 남아서</strong> 약수가 아니에요!`;
    speak(`앗! 나머지가 ${remainder}개 생겼어요. 따라서 ${divisor}는 ${candyTargetNum}의 약수가 아닙니다!`);
  }
}

/* ========================================================
   2. [구구단 짝꿍 찾기 게임] 로직
   ======================================================== */
const matchGamesData = [
  { target: 24, factors: [1, 24, 2, 12, 3, 8, 4, 6], decoys: [5, 7, 9, 11] },
  { target: 18, factors: [1, 18, 2, 9, 3, 6], decoys: [4, 5, 7, 8, 12] },
  { target: 36, factors: [1, 36, 2, 18, 3, 12, 4, 9, 6, 6], decoys: [5, 7, 8, 10] },
  { target: 12, factors: [1, 12, 2, 6, 3, 4], decoys: [5, 7, 8, 9, 10] },
  { target: 30, factors: [1, 30, 2, 15, 3, 10, 5, 6], decoys: [4, 7, 8, 9, 12] }
];

let currentMatchGameIdx = 0;
let currentMatchGame = matchGamesData[0];
let selectedCards = [];
let foundPairsCount = 0;
let totalPairsTarget = 4;

function initMatchGame(gameIdx = 0) {
  currentMatchGameIdx = gameIdx;
  currentMatchGame = matchGamesData[gameIdx];
  selectedCards = [];
  foundPairsCount = 0;

  totalPairsTarget = Math.floor(currentMatchGame.factors.length / 2);

  document.getElementById('gem-target-num').textContent = currentMatchGame.target;
  document.getElementById('found-pairs-list').innerHTML = '<span style="color:var(--text-muted); font-size:0.9rem;">아직 찾은 짝꿍이 없어요</span>';

  // 카드 셔플 렌더링
  const allCards = [...currentMatchGame.factors, ...currentMatchGame.decoys].sort(() => Math.random() - 0.5);
  const grid = document.getElementById('number-cards-grid');
  grid.innerHTML = '';

  allCards.forEach((val, idx) => {
    const card = document.createElement('div');
    card.className = 'num-card-item';
    card.dataset.val = val;
    card.dataset.cardId = `card-${idx}`;
    card.textContent = val;
    card.onclick = () => handleCardClick(card, val);
    grid.appendChild(card);
  });

  speak(`타겟 숫자 ${currentMatchGame.target}을 만드는 두 수의 곱셈 짝꿍을 찾아보세요!`);
}

function handleCardClick(cardEl, val) {
  if (cardEl.classList.contains('matched-glow') || cardEl.classList.contains('selected')) return;

  soundPop();
  cardEl.classList.add('selected');
  selectedCards.push({ element: cardEl, value: val });

  if (selectedCards.length === 2) {
    const [c1, c2] = selectedCards;
    const prod = c1.value * c2.value;

    if (prod === currentMatchGame.target) {
      // 정답 짝꿍!
      soundSuccess();
      giveMathReward(1, true); // 💎/🍬 +1 보상
      c1.element.classList.remove('selected');
      c2.element.classList.remove('selected');
      c1.element.classList.add('matched-glow');
      c2.element.classList.add('matched-glow');

      // 수집판에 추가
      const pairsList = document.getElementById('found-pairs-list');
      if (foundPairsCount === 0) pairsList.innerHTML = '';

      const pill = document.createElement('div');
      pill.className = 'pair-pill';
      pill.textContent = `⭐ ${c1.value} × ${c2.value} = ${currentMatchGame.target}`;
      pairsList.appendChild(pill);

      foundPairsCount++;
      selectedCards = [];

      if (foundPairsCount >= totalPairsTarget) {
        triggerConfetti();
        giveMathReward(3, false); // 모든 짝꿍 완료 시 축하 보상 3개!
        speak(`와아! ${currentMatchGame.target}의 모든 곱셈 짝꿍을 다 찾았어요! 정말 최고예요!`);
      } else {
        speak(`딩동댕! ${c1.value} 곱하기 ${c2.value}은 ${currentMatchGame.target} 짝꿍 맞아요!`);
      }
    } else {
      // 오답!
      soundWrong();
      recordMathWrongAnswer(`짝꿍 찾기 (타겟 ${currentMatchGame.target})`, `${c1.value} × ${c2.value} = ${prod}`);
      c1.element.classList.add('shake-wrong');
      c2.element.classList.add('shake-wrong');

      speak(`${c1.value} 곱하기 ${c2.value}은 ${prod}이어서 ${currentMatchGame.target}이 아니에요.`);

      setTimeout(() => {
        c1.element.classList.remove('selected', 'shake-wrong');
        c2.element.classList.remove('selected', 'shake-wrong');
        selectedCards = [];
      }, 700);
    }
  }
}

function nextMatchGame() {
  const nextIdx = (currentMatchGameIdx + 1) % matchGamesData.length;
  initMatchGame(nextIdx);
}

/* ========================================================
   3. [모눈종이 세로셈 보드] 로직
   ======================================================== */
const divisionProblems = [
  {
    dividend: 72, divisor: 3, quotient: 24, remainder: 0,
    steps: [
      { step: 1, desc: '1️⃣ [십의 자리]: 7 안에 3이 몇 번 들어갈까요? 2번 들어가요! 몫의 십의 자리에 2를 써요.', tensQ: '2', onesQ: '', prod1: '6', sub1: '1', bringDown: '2', prod2: '', sub2: '' },
      { step: 2, desc: '2️⃣ [십의 자리 곱셈 & 뺄셈]: 3 × 2 = 6! 7에서 6을 빼면 1이 남아요.', tensQ: '2', onesQ: '', prod1: '6', sub1: '1', bringDown: '2', prod2: '', sub2: '' },
      { step: 3, desc: '3️⃣ [일의 자리 내리기]: 일의 자리 2를 내려서 12를 만들어요. 12 안에 3이 몇 번 들어갈까요? 4번!', tensQ: '2', onesQ: '4', prod1: '6', sub1: '1', bringDown: '2', prod2: '12', sub2: '0' },
      { step: 4, desc: '4️⃣ [최종 완성]: 3 × 4 = 12! 12에서 12를 빼면 0! 몫은 24, 나머지는 0입니다!', tensQ: '2', onesQ: '4', prod1: '6', sub1: '1', bringDown: '2', prod2: '12', sub2: '0' }
    ]
  },
  {
    dividend: 96, divisor: 4, quotient: 24, remainder: 0,
    steps: [
      { step: 1, desc: '1️⃣ [십의 자리]: 9 안에 4가 2번 들어가므로 몫의 십의 자리에 2를 씁니다.', tensQ: '2', onesQ: '', prod1: '8', sub1: '1', bringDown: '6', prod2: '', sub2: '' },
      { step: 2, desc: '2️⃣ [일의 자리]: 16 안에 4가 4번 들어가므로 몫의 일의 자리에 4를 씁니다. 몫: 24!', tensQ: '2', onesQ: '4', prod1: '8', sub1: '1', bringDown: '6', prod2: '16', sub2: '0' }
    ]
  },
  {
    dividend: 84, divisor: 6, quotient: 14, remainder: 0,
    steps: [
      { step: 1, desc: '1️⃣ [십의 자리]: 8 안에 6이 1번 들어가요. 몫의 십의 자리에 1을 씁니다.', tensQ: '1', onesQ: '', prod1: '6', sub1: '2', bringDown: '4', prod2: '', sub2: '' },
      { step: 2, desc: '2️⃣ [일의 자리]: 24 안에 6이 4번 들어가요. 몫의 일의 자리에 4를 씁니다. 몫: 14!', tensQ: '1', onesQ: '4', prod1: '6', sub1: '2', bringDown: '4', prod2: '24', sub2: '0' }
    ]
  },
  {
    dividend: 144, divisor: 6, quotient: 24, remainder: 0,
    steps: [
      { step: 1, desc: '1️⃣ [자릿수 주의!]: 1 안에는 6이 안 들어가므로 14를 봅니다. 14 안에 6이 2번! 몫의 십의 자리에 2!', tensQ: '2', onesQ: '', prod1: '12', sub1: '2', bringDown: '4', prod2: '', sub2: '' },
      { step: 2, desc: '2️⃣ [일의 자리]: 24 안에 6이 4번 들어갑니다. 몫의 일의 자리에 4를 씁니다. 몫: 24!', tensQ: '2', onesQ: '4', prod1: '12', sub1: '2', bringDown: '4', prod2: '24', sub2: '0' }
    ]
  }
];

let currentDivProbIdx = 0;

function loadDivisionProblem(probIdx = 0) {
  currentDivProbIdx = probIdx;
  const prob = divisionProblems[probIdx];

  document.querySelectorAll('.picker-btn').forEach((btn, idx) => {
    btn.classList.toggle('active', idx === probIdx);
  });

  const guideBox = document.getElementById('place-value-guide-box');
  guideBox.innerHTML = `💡 <strong>[${prob.dividend} ÷ ${prob.divisor}] 세로셈:</strong> ${prob.steps[0].desc}`;

  renderDivisionGrid(prob);
  soundPop();
  speak(`${prob.dividend} 나누기 ${prob.divisor}을 모눈종이에 자릿수를 맞추어 계산해 보세요!`);
}

function renderDivisionGrid(prob) {
  const container = document.getElementById('division-grid-container');
  if (!container) return;

  const is3Digit = prob.dividend >= 100;
  const divStr = String(prob.dividend);

  let html = `
    <div class="division-vertical-grid">
      <!-- 1행: 몫 (Quotient) -->
      <div class="grid-cell"></div>
      <div class="grid-cell"></div>
      <div class="grid-cell">
        <input type="text" class="grid-digit-input grid-input-step" id="q-tens" maxlength="1" placeholder="?">
      </div>
      <div class="grid-cell">
        <input type="text" class="grid-digit-input grid-input-step" id="q-ones" maxlength="1" placeholder="?">
      </div>
      <div class="grid-cell"></div>
      <div class="grid-cell"></div>

      <!-- 2행: 나누는 수(제수) & 나눗셈 갈고리선 & 나뉠 수(피제수) -->
      <div class="grid-cell">${prob.divisor}</div>
      <div class="grid-cell cell-div-symbol">${is3Digit ? divStr[0] : ''}</div>
      <div class="grid-cell cell-div-line-top">${is3Digit ? divStr[1] : divStr[0]}</div>
      <div class="grid-cell cell-div-line-top">${is3Digit ? divStr[2] : divStr[1]}</div>
      <div class="grid-cell cell-div-line-top"></div>
      <div class="grid-cell"></div>

      <!-- 3행: 1차 곱셈 결과 -->
      <div class="grid-cell"></div>
      <div class="grid-cell"></div>
      <div class="grid-cell cell-sub-line">
        <input type="text" class="grid-digit-input grid-input-step" id="step1-prod-tens" maxlength="1" placeholder="?">
      </div>
      <div class="grid-cell cell-sub-line"></div>
      <div class="grid-cell"></div>
      <div class="grid-cell"></div>

      <!-- 4행: 1차 뺄셈 & 일의 자리 내리기 -->
      <div class="grid-cell"></div>
      <div class="grid-cell"></div>
      <div class="grid-cell">
        <input type="text" class="grid-digit-input grid-input-step" id="step2-sub-tens" maxlength="1" placeholder="?">
      </div>
      <div class="grid-cell">
        <input type="text" class="grid-digit-input grid-input-step" id="step2-bring-ones" maxlength="1" placeholder="?">
      </div>
      <div class="grid-cell"></div>
      <div class="grid-cell"></div>

      <!-- 5행: 2차 곱셈 결과 -->
      <div class="grid-cell"></div>
      <div class="grid-cell"></div>
      <div class="grid-cell cell-sub-line">
        <input type="text" class="grid-digit-input grid-input-step" id="step3-prod-tens" maxlength="1" placeholder="?">
      </div>
      <div class="grid-cell cell-sub-line">
        <input type="text" class="grid-digit-input grid-input-step" id="step3-prod-ones" maxlength="1" placeholder="?">
      </div>
      <div class="grid-cell"></div>
      <div class="grid-cell"></div>

      <!-- 6행: 최종 나머지 -->
      <div class="grid-cell"></div>
      <div class="grid-cell"></div>
      <div class="grid-cell"></div>
      <div class="grid-cell">
        <input type="text" class="grid-digit-input grid-input-step" id="step4-rem" maxlength="1" placeholder="?">
      </div>
      <div class="grid-cell"></div>
      <div class="grid-cell"></div>
    </div>
  `;

  container.innerHTML = html;
  setupGridAutoTab();
}

function setupGridAutoTab() {
  const inputs = Array.from(document.querySelectorAll('.grid-input-step'));
  inputs.forEach((input, idx) => {
    input.addEventListener('input', (e) => {
      input.value = input.value.replace(/[^0-9]/g, '');
      if (input.value.length === 1 && idx < inputs.length - 1) {
        inputs[idx + 1].focus();
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && input.value.length === 0 && idx > 0) {
        inputs[idx - 1].focus();
      }
    });
  });
}

function checkGridDivisionAnswer() {
  const prob = divisionProblems[currentDivProbIdx];
  const qTens = document.getElementById('q-tens')?.value;
  const qOnes = document.getElementById('q-ones')?.value;
  const userQuotient = parseInt((qTens || '') + (qOnes || ''));

  const rem = document.getElementById('step4-rem')?.value;

  const isQuotientRight = (userQuotient === prob.quotient);
  const isRemRight = (parseInt(rem) === prob.remainder || (rem === '0' && prob.remainder === 0));

  if (isQuotientRight && isRemRight) {
    soundSuccess();
    triggerConfetti();
    giveMathReward(2, false); // 💎/🍬 +2 보상
    document.querySelectorAll('.grid-input-step').forEach(el => el.classList.add('correct'));
    document.getElementById('place-value-guide-box').innerHTML = `
      🎉 <strong>완벽한 정답입니다!</strong> ${prob.dividend} ÷ ${prob.divisor} = <strong>${prob.quotient}</strong> (나머지: 0) 자릿수가 위아래로 완벽히 정렬되었어요!
    `;
    speak(`정답입니다! 몫은 ${prob.quotient}이고 나머지는 0입니다! 자릿수를 아주 잘 맞추었어요!`);
  } else {
    soundWrong();
    recordMathWrongAnswer(`나눗셈 세로셈: ${prob.dividend} ÷ ${prob.divisor}`, `입력 몫: ${userQuotient || '미입력'}`);
    document.querySelectorAll('.grid-input-step').forEach(el => {
      if (!el.value) el.classList.add('wrong');
    });
    speak('자릿수와 계산을 다시 확인해보세요. [풀이 시연] 버튼을 누르면 풀이 과정을 볼 수 있어요!');
  }
}

function autoSolveDivisionGrid() {
  const prob = divisionProblems[currentDivProbIdx];
  speak('모눈종이 나눗셈 풀이 과정을 순서대로 보여줄게요!');

  const qTens = document.getElementById('q-tens');
  const qOnes = document.getElementById('q-ones');
  const p1Tens = document.getElementById('step1-prod-tens');
  const s2Tens = document.getElementById('step2-sub-tens');
  const s2Ones = document.getElementById('step2-bring-ones');
  const p3Tens = document.getElementById('step3-prod-tens');
  const p3Ones = document.getElementById('step3-prod-ones');
  const rem = document.getElementById('step4-rem');

  const qStr = String(prob.quotient).padStart(2, '0');
  const tensQVal = qStr[0];
  const onesQVal = qStr[1];

  let delay = 0;

  setTimeout(() => {
    if (qTens) { qTens.value = tensQVal; qTens.classList.add('correct'); soundPop(); }
    document.getElementById('place-value-guide-box').innerHTML = prob.steps[0].desc;
  }, delay += 400);

  setTimeout(() => {
    const p1Val = String(parseInt(tensQVal) * prob.divisor);
    if (p1Tens) { p1Tens.value = p1Val; p1Tens.classList.add('correct'); soundPop(); }
  }, delay += 600);

  setTimeout(() => {
    if (s2Tens) { s2Tens.value = prob.steps[0].sub1; s2Tens.classList.add('correct'); soundPop(); }
    if (s2Ones) { s2Ones.value = prob.steps[0].bringDown; s2Ones.classList.add('correct'); soundPop(); }
    if (prob.steps[1]) document.getElementById('place-value-guide-box').innerHTML = prob.steps[1].desc;
  }, delay += 600);

  setTimeout(() => {
    if (qOnes) { qOnes.value = onesQVal; qOnes.classList.add('correct'); soundPop(); }
  }, delay += 600);

  setTimeout(() => {
    const p2Val = String(parseInt(onesQVal) * prob.divisor).padStart(2, '0');
    if (p3Tens) { p3Tens.value = p2Val[0]; p3Tens.classList.add('correct'); soundPop(); }
    if (p3Ones) { p3Ones.value = p2Val[1]; p3Ones.classList.add('correct'); soundPop(); }
  }, delay += 600);

  setTimeout(() => {
    if (rem) { rem.value = '0'; rem.classList.add('correct'); soundSuccess(); triggerConfetti(); }
    document.getElementById('place-value-guide-box').innerHTML = `✨ <strong>풀이 완료:</strong> 몫은 ${prob.quotient}, 나머지는 0입니다!`;
  }, delay += 600);
}

function resetDivisionGrid() {
  loadDivisionProblem(currentDivProbIdx);
}

/* ========================================================
   방 나가기 및 노션 학습일지/오답노트 최종 전송
   ======================================================== */
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
        subject: "수학(약수와 나눗셈)",
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

/* ========================================================
   초기화
   ======================================================== */
document.addEventListener('DOMContentLoaded', () => {
  // 프로필 & 테마 동기화
  const currentProfile = localStorage.getItem('currentUser') || 'son';
  const name = currentProfile === 'son' ? '민수' : (currentProfile === 'daughter' ? '민서' : '어른');
  const icon = currentProfile === 'son' ? '👦' : (currentProfile === 'daughter' ? '👧' : '👨‍💻');
  
  const savedTheme = localStorage.getItem('currentTheme') || (currentProfile === 'daughter' ? '슬라임' : '마인크래프트');
  const themeClass = savedTheme === '슬라임' ? 'theme--slime' : 'theme--arcade';
  document.body.className = themeClass;

  const userEl = document.getElementById('userName');
  const iconEl = document.getElementById('userIcon');
  if (userEl) userEl.textContent = `${name} 대원`;
  if (iconEl) iconEl.textContent = icon;

  // 섹션 1: 사탕 분배기 초기화 (12개)
  setCandyTarget(12);

  // 섹션 2: 구구단 짝꿍 찾기 초기화 (24)
  initMatchGame(0);

  // 섹션 3: 모눈종이 세로셈 초기화 (72 / 3)
  loadDivisionProblem(0);
});
