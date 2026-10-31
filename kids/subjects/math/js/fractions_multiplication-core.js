
// ========================================================
// 🍰 5-2 수학 2단원 : 분수의 곱셈 개념 탐험관 엔진
// ========================================================

// 🎵 Web Audio API 네이티브 효과음 신디사이저
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSfx(type) {
  try {
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    const now = audioCtx.currentTime;

    if (type === 'click') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.05);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.05);
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.start(now); osc.stop(now + 0.05);
    } else if (type === 'pizza') {
      // 착! 딸기 피자 붙는 통통한 소리
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(350, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.12);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.12);
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.start(now); osc.stop(now + 0.12);
    } else if (type === 'jump') {
      // 통~ 뿅! 개구리 점프음
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(850, now + 0.18);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.18);
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.start(now); osc.stop(now + 0.18);
    } else if (type === 'scissor') {
      // 챙! 싹둑! 마법 가위 쇳소리
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc1.type = 'sawtooth';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(1400, now);
      osc1.frequency.exponentialRampToValueAtTime(400, now + 0.1);
      osc2.frequency.setValueAtTime(2200, now);
      osc2.frequency.exponentialRampToValueAtTime(600, now + 0.1);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.1);
      osc1.connect(gain); osc2.connect(gain);
      gain.connect(audioCtx.destination);
      osc1.start(now); osc2.start(now);
      osc1.stop(now + 0.1); osc2.stop(now + 0.1);
    } else if (type === 'magic') {
      // 샤라랑~ 마법 빛 겹치기
      [523, 659, 783, 1046].forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);
        gain.gain.setValueAtTime(0.2, now + idx * 0.06);
        gain.gain.linearRampToValueAtTime(0, now + idx * 0.06 + 0.15);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.15);
      });
    } else if (type === 'fanfare') {
      // 팡파르
      [440, 554, 659, 880].forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);
        gain.gain.setValueAtTime(0.3, now + idx * 0.1);
        gain.gain.linearRampToValueAtTime(0, now + idx * 0.1 + 0.3);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.3);
      });
    }
  } catch (e) {
    // AudioContext 미지원 또는 무음 환경 안전 무시
  }
}

const TAB_DATA = [
  // 1관: 진분수 × 자연수 (딸기 피자 복제기)
  {
    id: 0,
    tag: "🍕 제 1 관 : 딸기 피자 복제기",
    title: "진분수 × 자연수 : 조각의 개수 늘리기",
    tts: "진분수에 자연수를 곱할 때는, 분모는 그대로 두고 분자에만 자연수를 곱해요! 조각의 크기는 그대로이고, 조각의 개수만 늘어나기 때문이랍니다.",
    ruleCatch: "분모는 침대에 누워 쉬고, 분자랑 자연수만 곱해요!",
    parentTip: "민수야, 분모 3은 피자 조각 크기니까 변할까? 조각 개수(분자)만 2배로 쑥 늘어나는 거야!",
    mathType: "pizza",
    formulaHtml: `
      <span class="inline-frac"><span>1</span><span class="bar">/</span><span>3</span></span> 
      × 2 = 
      <span class="inline-frac"><span>1 × 2</span><span class="bar">/</span><span>3</span></span>
      = <span class="inline-frac" style="color:#b45309; font-size:1.15em;"><span>2</span><span class="bar">/</span><span>3</span></span>
    `
  },
  // 2관: 가분수 ➔ 대분수 탈출 (수직선 징검다리)
  {
    id: 1,
    tag: "🐸 제 2 관 : 수직선 징검다리",
    title: "가분수 탈출 : 온전한 1을 뽑아 대분수로!",
    tts: "점프를 계속해서 분자가 분모보다 커지면 무거운 가분수가 돼요. 온전한 1개, 즉 5분의 5를 쏙 뽑아내면 가벼운 대분수 1과 5분의 1로 변신할 수 있어요!",
    ruleCatch: "무거운 가분수는 온전한 1을 쏙 뽑아 대분수로 변신!",
    parentTip: "깃발 1을 넘었네! 5분의 5는 온전한 피자 1판이니까 밖으로 쏙 꺼내 대분수로 만들자!",
    mathType: "numberline",
    formulaHtml: `
      <span class="inline-frac"><span>2</span><span class="bar">/</span><span>5</span></span> 
      × 3 = 
      <span class="inline-frac"><span>6</span><span class="bar">/</span><span>5</span></span>
      = <span style="color:#b45309; font-size:1.15em;">1<span class="inline-frac"><span>1</span><span class="bar">/</span><span>5</span></span></span>
    `
  },
  // 3관: 대분수 × 자연수 (가분수 투구 변신소)
  {
    id: 2,
    tag: "🧪 제 3 관 : 가분수 투구 변신소",
    title: "대분수 × 자연수 : 가분수로 바꾸어 계산!",
    tts: "대분수는 계산하기 복잡해 보여요. 하지만 가분수 투구를 씌워 3분의 5로 변신시키면 자연수와 쉽게 곱할 수 있답니다. 마지막엔 다시 대분수로 예쁘게 정리해요!",
    ruleCatch: "대분수는 날씬한 가분수로 싹 바꾸고 곱하면 끝!",
    parentTip: "대분수는 너무 뚱뚱해서 곱하기 힘들어! 온전한 1병을 작은 잔 3개로 쪼개서 날씬한 가분수 투구를 씌워볼까?",
    mathType: "potion",
    formulaHtml: `
      1<span class="inline-frac"><span>2</span><span class="bar">/</span><span>3</span></span> × 2 
      = <span class="inline-frac"><span>5</span><span class="bar">/</span><span>3</span></span> × 2 
      = <span class="inline-frac"><span>10</span><span class="bar">/</span><span>3</span></span>
      = <span style="color:#b45309; font-size:1.15em;">3<span class="inline-frac"><span>1</span><span class="bar">/</span><span>3</span></span></span>
    `
  },
  // 4관: 자연수 × 진분수 (요술 무지개 털실)
  {
    id: 3,
    tag: "🧶 제 4 관 : 요술 무지개 털실",
    title: "자연수 × 진분수 : 전체의 몇 분의 몇 구하기",
    tts: "6미터의 3분의 2를 구할 때는, 6을 분모 3으로 먼저 나누어 1도막인 2미터를 구한 뒤, 분자 2를 곱해 4미터를 만들어요! 약분을 미리 하면 훨씬 빨라져요.",
    ruleCatch: "'전체의 몇 분의 몇'은 분모로 나누고 분자만큼 곱하기!",
    parentTip: "6m를 3도막으로 자르면 1도막은 몇 m지? 6 나누기 3은 2! 그중 2도막을 가져오면 2 곱하기 2는 4!",
    mathType: "yarn",
    formulaHtml: `
      6 × <span class="inline-frac"><span>2</span><span class="bar">/</span><span>3</span></span>
      = <span class="inline-frac"><span><del style="color:#ef4444;">6</del> <small style="color:#2563eb;">2</small> × 2</span><span class="bar">/</span><span><del style="color:#ef4444;">3</del> <small style="color:#2563eb;">1</small></span></span>
      = <span style="color:#b45309; font-size:1.15em;">4 (m)</span>
    `
  },
  // 5관: 단위분수 × 단위분수 (차원의 크리스털 창문)
  {
    id: 4,
    tag: "💎 제 5 관 : 차원의 크리스털 창문",
    title: "단위분수 × 단위분수 : 가로×세로 면적 겹치기",
    tts: "2분의 1의 3분의 1은, 가로로 2등분하고 세로로 3등분한 사각형에서 겹치는 1칸의 넓이예요! 분모끼리 곱하면 전체 6칸, 분자끼리 곱하면 1칸으로 6분의 1이 돼요.",
    ruleCatch: "분모끼리 슝! 분자끼리 착! 조각의 조각을 구해요!",
    parentTip: "가로 2줄, 세로 3줄이면 크리스털 창문은 총 몇 칸으로 나뉠까? 2 곱하기 3은 6! 겹친 건 딱 1칸이니까 6분의 1이야!",
    mathType: "window",
    formulaHtml: `
      <span class="inline-frac"><span>1</span><span class="bar">/</span><span>2</span></span> 
      × <span class="inline-frac"><span>1</span><span class="bar">/</span><span>3</span></span> 
      = <span class="inline-frac"><span>1 × 1</span><span class="bar">/</span><span>2 × 3</span></span>
      = <span class="inline-frac" style="color:#b45309; font-size:1.15em;"><span>1</span><span class="bar">/</span><span>6</span></span>
    `
  },
  // 6관: 진분수 × 진분수 (마법 가위 번개 약분술)
  {
    id: 5,
    tag: "✂️ 제 6 관 : 마법 가위 번개 약분술",
    title: "진분수 × 진분수 : 대각선 미리 약분으로 숫자 축소!",
    tts: "분수끼리 곱할 때 숫자가 너무 커지면 계산이 힘들어져요. 곱하기 전에 대각선에 있는 숫자끼리 같은 수로 싹둑 약분하면, 놀랍도록 쉽고 빠르게 답을 찾을 수 있답니다!",
    ruleCatch: "계산하기 전에 대각선 친구를 똑같은 수로 미리 싹둑!",
    parentTip: "대각선에 짝수 친구 4와 2가 마주보고 있네! 손가락으로 빨간 상자 숫자를 콕 터치해서 2로 싹둑 잘라볼까?",
    mathType: "scissor",
    formulaHtml: `
      <span class="inline-frac"><span>3</span><span class="bar">/</span><span><del style="color:#ef4444;">4</del> <small style="color:#2563eb;">2</small></span></span> 
      × 
      <span class="inline-frac"><span><del style="color:#ef4444;">2</del> <small style="color:#2563eb;">1</small></span><span class="bar">/</span><span>7</span></span> 
      = <span class="inline-frac"><span>3 × 1</span><span class="bar">/</span><span>2 × 7</span></span>
      = <span class="inline-frac" style="color:#b45309; font-size:1.15em;"><span>3</span><span class="bar">/</span><span>14</span></span>
    `
  }
];

let currentTab = 0;
let exploredSet = new Set([0]);

// 보석 로드 & 저장
function getGemCount() {
  return parseInt(localStorage.getItem('math_gem_count') || '0', 10);
}
function addGems(n) {
  const c = getGemCount() + n;
  localStorage.setItem('math_gem_count', c);
  document.getElementById('gemCount').textContent = c;
}

// 탭 전환
function switchTab(idx) {
  playSfx('click');
  currentTab = idx;
  exploredSet.add(idx);
  updateProgressUI();

  document.querySelectorAll('.nav-tab-btn').forEach((btn, i) => {
    btn.classList.toggle('active', i === idx);
  });

  renderConceptTab(idx);
}

function updateProgressUI() {
  const count = exploredSet.size;
  document.getElementById('exploredCount').textContent = count;
  const pct = Math.round((count / 6) * 100);
  document.getElementById('progressBarFill').style.width = `${pct}%`;

  if (count === 6 && !localStorage.getItem('math_bakery_concepts_completed')) {
    localStorage.setItem('math_bakery_concepts_completed', 'true');
    addGems(5);
    playSfx('fanfare');
    setTimeout(() => {
      document.getElementById('completionModal').style.display = 'flex';
    }, 600);
  }
}

function closeCompletionModal() {
  playSfx('click');
  document.getElementById('completionModal').style.display = 'none';
}

// 탭별 렌더링
function renderConceptTab(idx) {
  const data = TAB_DATA[idx];
  const container = document.getElementById('conceptContainer');

  container.innerHTML = `
    <article class="concept-card">
      <div class="concept-header">
        <div>
          <span class="concept-tag">${data.tag}</span>
          <h2 class="concept-title">${data.title}</h2>
        </div>
        <button class="btn-speak-tts" onclick="speakConceptTTS('${data.tts.replace(/'/g, "\'")}')">
          <span>🔊</span> 코코의 설명 듣기
        </button>
      </div>

      <!-- 프리셋 바 (피자 & 창문 관) -->
      ${getPresetBarHtml(data.mathType)}

      <!-- 인터랙티브 조작 캔버스 -->
      <div class="visual-playground" id="playgroundArea">
        ${getPlaygroundHtml(data.mathType)}
      </div>

      <!-- 조작 버튼들 -->
      <div class="controls-bar" id="controlsArea">
        ${getControlsHtml(data.mathType)}
      </div>

      <!-- 민수의 한 줄 공식 카드 -->
      <div class="formula-rule-card">
        <span class="formula-badge">💡 민수의 한 줄 공식</span>
        <div class="formula-catchphrase">"${data.ruleCatch}"</div>
        <div class="formula-math-display" id="formulaMathBox">
          ${data.formulaHtml}
        </div>
      </div>

      <!-- 👨‍🏫 아빠표 1초 코칭 팁 버블 -->
      <div class="parent-coach-card">
        <div class="parent-coach-icon">👨‍🏫</div>
        <div class="parent-coach-body">
          <div class="parent-coach-title">
            <span>아빠표 1초 코칭 가이드</span>
            <span style="font-size:0.8rem; background:#bfdbfe; color:#1e3a8a; padding:2px 8px; border-radius:10px;">유도 질문</span>
          </div>
          <p class="parent-coach-text">"${data.parentTip}"</p>
        </div>
      </div>
    </article>
  `;

  initPlayground(data.mathType);
}

// 요정 코코 TTS 음성 출력
function speakConceptTTS(text) {
  playSfx('click');
  if (typeof speakFairyTTS === 'function') {
    speakFairyTTS(text);
  } else if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ko-KR';
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
  }
}

// ========================================================
// 🎮 6대 시각화 인터랙션 뷰 HTML & 스크립트
// ========================================================

// 1. 피자 복제기 상태
let pizzaNum = 1;
let pizzaDen = 3;
let pizzaMult = 2;

// 2. 수직선 점프 상태
let jumpStep = 0;

// 3. 포션 가분수 투구 상태
let potionState = 'mixed';

// 4. 무지개 털실 상태
let yarnStep = 0;

// 5. 크리스털 창문 상태
let windowOverlapped = false;
let windowX = 2; // 가로 2등분
let windowY = 3; // 세로 3등분

// 6. 마법 가위 번개 약분 상태
let scissorCut = false;
let scissorMode = 1;

function getPresetBarHtml(type) {
  if (type === 'pizza') {
    return `
      <div class="preset-row">
        <span style="font-family:'Jua'; color:#78350f; display:flex; align-items:center;">교과서 대표 문제:</span>
        <button class="preset-pill ${pizzaDen===3&&pizzaNum===1?'active':''}" onclick="setPizzaPreset(1, 3, 2)">🍕 1/3 × 2 (딸기 피자)</button>
        <button class="preset-pill ${pizzaDen===4&&pizzaNum===1?'active':''}" onclick="setPizzaPreset(1, 4, 3)">🧀 1/4 × 3 (치즈 피자)</button>
        <button class="preset-pill ${pizzaDen===5&&pizzaNum===2?'active':''}" onclick="setPizzaPreset(2, 5, 2)">🍄 2/5 × 2 (버섯 피자)</button>
      </div>
    `;
  }
  if (type === 'window') {
    return `
      <div class="preset-row">
        <span style="font-family:'Jua'; color:#0369a1; display:flex; align-items:center;">창문 유리 분할:</span>
        <button class="preset-pill ${windowX===2&&windowY===3?'active':''}" onclick="setWindowPreset(2, 3)">💎 가로 1/2 × 세로 1/3 (1/6)</button>
        <button class="preset-pill ${windowX===3&&windowY===4?'active':''}" onclick="setWindowPreset(3, 4)">🔮 가로 1/3 × 세로 1/4 (1/12)</button>
        <button class="preset-pill ${windowX===2&&windowY===4?'active':''}" onclick="setWindowPreset(2, 4)">✨ 가로 1/2 × 세로 1/4 (1/8)</button>
      </div>
    `;
  }
  return '';
}

function getPlaygroundHtml(type) {
  if (type === 'pizza') {
    return `<div id="pizzaCanvasWrap" style="display:flex; flex-wrap:wrap; justify-content:center; gap:20px; align-items:center;"></div>`;
  }
  if (type === 'numberline') {
    return `
      <div style="width:100%; max-width:640px; text-align:center;">
        <svg id="numberlineSvg" viewBox="0 0 600 160" style="width:100%; height:auto;"></svg>
        <div id="jumpStatusText" style="font-family:'Jua',sans-serif; font-size:1.15rem; color:#b45309; margin-top:10px;">
          🐸 개구리가 징검다리를 건널 준비를 하고 있어요! (0 / 3 점프)
        </div>
      </div>
    `;
  }
  if (type === 'potion') {
    return `<div id="potionWrap" style="display:flex; flex-direction:column; align-items:center; gap:16px;"></div>`;
  }
  if (type === 'yarn') {
    return `<div id="yarnWrap" style="width:100%; max-width:640px; text-align:center;"></div>`;
  }
  if (type === 'window') {
    return `
      <div style="display:flex; flex-direction:column; align-items:center; gap:12px;">
        <div id="windowFrame" style="width:240px; height:240px; border:4px solid #0284c7; border-radius:12px; position:relative; overflow:hidden; background:#ffffff; box-shadow:0 8px 20px rgba(2,132,199,0.15);"></div>
        <div id="windowLegend" style="font-family:'Jua',sans-serif; font-size:1.05rem; color:#0369a1;"></div>
      </div>
    `;
  }
  if (type === 'scissor') {
    return `<div id="scissorWrap" style="display:flex; flex-direction:column; align-items:center; gap:16px;"></div>`;
  }
  return '';
}

function getControlsHtml(type) {
  if (type === 'pizza') {
    return `
      <button class="ctrl-btn" onclick="changePizzaMult(-1)">➖ 조각 줄이기</button>
      <button class="ctrl-btn primary" onclick="changePizzaMult(1)">➕ 피자 조각 곱하기 (× ${pizzaMult})</button>
      <button class="ctrl-btn" onclick="resetPizza()">🔄 처음으로</button>
    `;
  }
  if (type === 'numberline') {
    return `
      <button class="ctrl-btn primary" onclick="doJump()">🐸 다음 징검다리로 점프! (2/5씩)</button>
      <button class="ctrl-btn" onclick="resetJump()">🔄 출발선으로</button>
    `;
  }
  if (type === 'potion') {
    return `
      <button class="ctrl-btn primary" id="potionStepBtn" onclick="nextPotionStep()">🪖 1단계: 가분수 투구 씌우기!</button>
      <button class="ctrl-btn" onclick="resetPotion()">🔄 처음으로</button>
    `;
  }
  if (type === 'yarn') {
    return `
      <button class="ctrl-btn primary" id="yarnStepBtn" onclick="nextYarnStep()">✂️ 1단계: 3도막으로 똑같이 나누기</button>
      <button class="ctrl-btn" onclick="resetYarn()">🔄 처음으로</button>
    `;
  }
  if (type === 'window') {
    return `
      <button class="ctrl-btn primary" onclick="toggleWindowOverlap()">✨ 마법 빛 겹치기 (1/${windowX} × 1/${windowY})</button>
      <button class="ctrl-btn" onclick="resetWindow()">🔄 분리하기</button>
    `;
  }
  if (type === 'scissor') {
    return `
      <button class="ctrl-btn primary" onclick="toggleScissorCut()">✂️⚡ 번개 약분술 발동!</button>
      <button class="ctrl-btn" onclick="toggleScissorExample()">🔁 예제 바꾸기 (대분수×대분수)</button>
    `;
  }
  return '';
}

function initPlayground(type) {
  if (type === 'pizza') renderPizzaPlayground();
  if (type === 'numberline') renderNumberlinePlayground();
  if (type === 'potion') renderPotionPlayground();
  if (type === 'yarn') renderYarnPlayground();
  if (type === 'window') renderWindowPlayground();
  if (type === 'scissor') renderScissorPlayground();
}

