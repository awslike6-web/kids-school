
// ========================================================
// 🔊 사운드 및 보상 헬퍼
// ========================================================
let audioCtx = null;
function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

function playSfx(type) {
  try {
    const ctx = getAudioCtx();
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === 'correct') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.15);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'wrong') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.setValueAtTime(196, now + 0.1);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    } else if (type === 'click') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
    } else if (type === 'fanfare') {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g);
        g.connect(ctx.destination);
        o.type = 'triangle';
        o.frequency.setValueAtTime(freq, now + i * 0.1);
        g.gain.setValueAtTime(0.25, now + i * 0.1);
        g.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.35);
        o.start(now + i * 0.1);
        o.stop(now + i * 0.1 + 0.35);
      });
    }
  } catch (e) {
    console.warn("Audio error:", e);
  }
}

function getGemCount() {
  return parseInt(localStorage.getItem('minmin_gems') || '0', 10);
}
function addGems(amount) {
  const cur = getGemCount() + amount;
  localStorage.setItem('minmin_gems', cur.toString());
  document.getElementById('gemCount').textContent = cur;
}

// ========================================================
// 📐 정품 세로 분수 HTML 생성 헬퍼 (슬래시 분수 표기 완전 제거)
// ========================================================
function renderFrac(num, den) {
  return `<span class="inline-frac"><span class="num">${num}</span><span class="bar"></span><span class="den">${den}</span></span>`;
}

function renderMixed(whole, num, den) {
  return `<span class="mixed-frac"><span class="whole">${whole}</span><span class="inline-frac"><span class="num">${num}</span><span class="bar"></span><span class="den">${den}</span></span></span>`;
}

// ========================================================
// 🧱 1. 단계별 빈칸 연산 훈련소 (6대 파트별 문제 은행 & 랜덤 생성)
// ========================================================
let trainMode = 'scaffold'; // 'scaffold' | 'battle'
let curCatIdx = 0;          // 0: 진분수x자연수, 1: 가분수탈출, 2: 대분수x자연수, 3: 자연수x진분수, 4: 진분수x진분수, 5: 대분수x대분수
let curProbIdx = 0;         // 0~4 (기본 5문제) or -1 (랜덤 생성 문제)
let customRandomProb = null;// 랜덤 생성 문제 임시 저장
let solvedMap = {};         // key: `${cat}_${prob}`, val: true

const CATEGORIES = [
  { name: "🍕 진분수 × 자연수", desc: "분모는 쉬고, 분자에만 자연수를 곱해요!" },
  { name: "🐸 가분수 탈출", desc: "분자가 분모보다 커지면 대분수로 변신!" },
  { name: "🧪 대분수 × 자연수", desc: "가분수 투구를 씌운 뒤 곱하고 대분수로 정리!" },
  { name: "🧶 자연수 × 진분수", desc: "자연수와 분모를 미리 싹둑 약분해요!" },
  { name: "💎 진분수 × 진분수", desc: "대각선 번개 약분 후 분모끼리, 분자끼리 곱해요!" },
  { name: "👑 대분수 × 대분수", desc: "양쪽 모두 가분수로 바꾼 뒤 번개 약분!" }
];

// 각 카테고리별 정선된 5개 문제 세트 (총 30문제)
const PROBLEM_BANKS = {
  // Part 0: 진분수 x 자연수 (결과가 진분수)
  0: [
    {
      hero: `${renderFrac(1, 3)} × 2`,
      steps: [
        { desc: "자연수 2는 분자에만 쏙 곱해요!", formula: `${renderFrac(`1 × <input class="blank-input" id="inp_s_0" data-ans="2" maxlength="2" onkeyup="checkInput(this)">`, 3)}`, hint: "자연수 2를 분자 자리에 넣으세요!" },
        { desc: "분자 1 × 2를 계산하면?", formula: `= ${renderFrac(`<input class="blank-input" id="inp_s_1" data-ans="2" maxlength="2" onkeyup="checkInput(this)">`, 3)}`, hint: "1 곱하기 2는 2예요!" }
      ]
    },
    {
      hero: `${renderFrac(1, 4)} × 3`,
      steps: [
        { desc: "자연수 3을 분자에만 곱해요!", formula: `${renderFrac(`1 × <input class="blank-input" id="inp_s_0" data-ans="3" maxlength="2" onkeyup="checkInput(this)">`, 4)}`, hint: "자연수 3을 분자 자리에 써보세요!" },
        { desc: "분자 1 × 3을 계산하면?", formula: `= ${renderFrac(`<input class="blank-input" id="inp_s_1" data-ans="3" maxlength="2" onkeyup="checkInput(this)">`, 4)}`, hint: "1 곱하기 3은 3이에요!" }
      ]
    },
    {
      hero: `${renderFrac(2, 7)} × 3`,
      steps: [
        { desc: "분자 2에 자연수 3을 곱해요!", formula: `${renderFrac(`2 × <input class="blank-input" id="inp_s_0" data-ans="3" maxlength="2" onkeyup="checkInput(this)">`, 7)}`, hint: "자연수 3을 분자에 곱해요!" },
        { desc: "분자 2 × 3을 계산하면?", formula: `= ${renderFrac(`<input class="blank-input" id="inp_s_1" data-ans="6" maxlength="2" onkeyup="checkInput(this)">`, 7)}`, hint: "2 곱하기 3은 6이에요!" }
      ]
    },
    {
      hero: `${renderFrac(1, 5)} × 4`,
      steps: [
        { desc: "자연수 4를 분자에만 곱해요!", formula: `${renderFrac(`1 × <input class="blank-input" id="inp_s_0" data-ans="4" maxlength="2" onkeyup="checkInput(this)">`, 5)}`, hint: "자연수 4를 분자에 넣어요!" },
        { desc: "분자 1 × 4를 계산하면?", formula: `= ${renderFrac(`<input class="blank-input" id="inp_s_1" data-ans="4" maxlength="2" onkeyup="checkInput(this)">`, 5)}`, hint: "1 곱하기 4는 4예요!" }
      ]
    },
    {
      hero: `${renderFrac(3, 8)} × 2`,
      steps: [
        { desc: "분모 8과 자연수 2를 2로 약분하면 분모 8은 무엇이 될까요?", formula: `분모 8은 ➔ <input class="blank-input" id="inp_s_0" data-ans="4" maxlength="2" onkeyup="checkInput(this)">`, hint: "8 나누기 2는 4예요!" },
        { desc: "약분하고 남은 분수 계산 결과는?", formula: `= ${renderFrac(`<input class="blank-input" id="inp_s_1" data-ans="3" maxlength="2" onkeyup="checkInput(this)">`, 4)}`, hint: "분자는 3 그대로 4분의 3이에요!" }
      ]
    }
  ],

  // Part 1: 진분수 x 자연수 (가분수 탈출 -> 대분수)
  1: [
    {
      hero: `${renderFrac(2, 5)} × 3`,
      steps: [
        { desc: `분자에 3을 곱해요 (2 × 3)`, formula: `= ${renderFrac(`<input class="blank-input" id="inp_s_0" data-ans="6" maxlength="2" onkeyup="checkInput(this)">`, 5)}`, hint: "2 곱하기 3은 6이에요!" },
        { desc: `가분수 ${renderFrac(6, 5)}를 대분수로 바꿔요! (6 = 5 × 1 + 1)`, formula: `= <input class="blank-input" id="inp_s_1" data-ans="1" maxlength="2" onkeyup="checkInput(this)">${renderFrac(`<input class="blank-input" id="inp_s_2" data-ans="1" maxlength="2" onkeyup="checkInput(this)">`, 5)}`, hint: "6 안에 5가 1번 들어가고 1이 남아요!" }
      ]
    },
    {
      hero: `${renderFrac(3, 4)} × 3`,
      steps: [
        { desc: `분자에 3을 곱해요 (3 × 3)`, formula: `= ${renderFrac(`<input class="blank-input" id="inp_s_0" data-ans="9" maxlength="2" onkeyup="checkInput(this)">`, 4)}`, hint: "3 곱하기 3은 9예요!" },
        { desc: `가분수 ${renderFrac(9, 4)}를 대분수로 바꿔요! (9 = 4 × 2 + 1)`, formula: `= <input class="blank-input" id="inp_s_1" data-ans="2" maxlength="2" onkeyup="checkInput(this)">${renderFrac(`<input class="blank-input" id="inp_s_2" data-ans="1" maxlength="2" onkeyup="checkInput(this)">`, 4)}`, hint: "9 안에 4가 2번 들어가고 1이 남아요!" }
      ]
    },
    {
      hero: `${renderFrac(4, 5)} × 2`,
      steps: [
        { desc: `분자에 2를 곱해요 (4 × 2)`, formula: `= ${renderFrac(`<input class="blank-input" id="inp_s_0" data-ans="8" maxlength="2" onkeyup="checkInput(this)">`, 5)}`, hint: "4 곱하기 2는 8이에요!" },
        { desc: `가분수 ${renderFrac(8, 5)}를 대분수로 정리!`, formula: `= <input class="blank-input" id="inp_s_1" data-ans="1" maxlength="2" onkeyup="checkInput(this)">${renderFrac(`<input class="blank-input" id="inp_s_2" data-ans="3" maxlength="2" onkeyup="checkInput(this)">`, 5)}`, hint: "8 안에 5가 1번 들어가고 3이 남아요!" }
      ]
    },
    {
      hero: `${renderFrac(2, 3)} × 4`,
      steps: [
        { desc: `분자에 4를 곱해요 (2 × 4)`, formula: `= ${renderFrac(`<input class="blank-input" id="inp_s_0" data-ans="8" maxlength="2" onkeyup="checkInput(this)">`, 3)}`, hint: "2 곱하기 4는 8이에요!" },
        { desc: `가분수 ${renderFrac(8, 3)}를 대분수로 변신!`, formula: `= <input class="blank-input" id="inp_s_1" data-ans="2" maxlength="2" onkeyup="checkInput(this)">${renderFrac(`<input class="blank-input" id="inp_s_2" data-ans="2" maxlength="2" onkeyup="checkInput(this)">`, 3)}`, hint: "8 안에 3이 2번 들어가고 2가 남아요!" }
      ]
    },
    {
      hero: `${renderFrac(5, 6)} × 2`,
      steps: [
        { desc: `분모 6과 자연수 2를 2로 약분하면 분모 6은?`, formula: `분모 6은 ➔ <input class="blank-input" id="inp_s_0" data-ans="3" maxlength="2" onkeyup="checkInput(this)">`, hint: "6 나누기 2는 3이에요!" },
        { desc: `약분 후 가분수 ${renderFrac(5, 3)}를 대분수로 정리!`, formula: `= <input class="blank-input" id="inp_s_1" data-ans="1" maxlength="2" onkeyup="checkInput(this)">${renderFrac(`<input class="blank-input" id="inp_s_2" data-ans="2" maxlength="2" onkeyup="checkInput(this)">`, 3)}`, hint: "5 안에 3이 1번 들어가고 2가 남아요!" }
      ]
    }
  ],

  // Part 2: 대분수 x 자연수
  2: [
    {
      hero: `${renderMixed(1, 2, 3)} × 2`,
      steps: [
        { desc: `대분수 ${renderMixed(1, 2, 3)}에게 가분수 투구 씌우기! (1×3 + 2)`, formula: `= ${renderFrac(`<input class="blank-input" id="inp_s_0" data-ans="5" maxlength="2" onkeyup="checkInput(this)">`, 3)} × 2`, hint: "1×3+2 = 5잔이에요!" },
        { desc: "분자 5에 자연수 2 곱하기", formula: `= ${renderFrac(`<input class="blank-input" id="inp_s_1" data-ans="10" maxlength="2" onkeyup="checkInput(this)">`, 3)}`, hint: "5 곱하기 2는 10이에요!" },
        { desc: `가분수 ${renderFrac(10, 3)}을 대분수로 정리!`, formula: `= <input class="blank-input" id="inp_s_2" data-ans="3" maxlength="2" onkeyup="checkInput(this)">${renderFrac(`<input class="blank-input" id="inp_s_3" data-ans="1" maxlength="2" onkeyup="checkInput(this)">`, 3)}`, hint: "10 안에 3이 3번 들어가고 1이 남아요!" }
      ]
    },
    {
      hero: `${renderMixed(1, 1, 4)} × 3`,
      steps: [
        { desc: `대분수 ${renderMixed(1, 1, 4)}를 가분수로 변신! (1×4 + 1)`, formula: `= ${renderFrac(`<input class="blank-input" id="inp_s_0" data-ans="5" maxlength="2" onkeyup="checkInput(this)">`, 4)} × 3`, hint: "1×4+1 = 5예요!" },
        { desc: "분자 5에 자연수 3 곱하기", formula: `= ${renderFrac(`<input class="blank-input" id="inp_s_1" data-ans="15" maxlength="2" onkeyup="checkInput(this)">`, 4)}`, hint: "5 곱하기 3은 15예요!" },
        { desc: `가분수 ${renderFrac(15, 4)}를 대분수로 정리!`, formula: `= <input class="blank-input" id="inp_s_2" data-ans="3" maxlength="2" onkeyup="checkInput(this)">${renderFrac(`<input class="blank-input" id="inp_s_3" data-ans="3" maxlength="2" onkeyup="checkInput(this)">`, 4)}`, hint: "15 안에 4가 3번 들어가고 3이 남아요!" }
      ]
    },
    {
      hero: `${renderMixed(2, 1, 5)} × 2`,
      steps: [
        { desc: `대분수 ${renderMixed(2, 1, 5)}를 가분수로 변신! (2×5 + 1)`, formula: `= ${renderFrac(`<input class="blank-input" id="inp_s_0" data-ans="11" maxlength="2" onkeyup="checkInput(this)">`, 5)} × 2`, hint: "2×5+1 = 11이에요!" },
        { desc: "분자 11에 자연수 2 곱하기", formula: `= ${renderFrac(`<input class="blank-input" id="inp_s_1" data-ans="22" maxlength="2" onkeyup="checkInput(this)">`, 5)}`, hint: "11 곱하기 2는 22예요!" },
        { desc: `가분수 ${renderFrac(22, 5)}를 대분수로 정리!`, formula: `= <input class="blank-input" id="inp_s_2" data-ans="4" maxlength="2" onkeyup="checkInput(this)">${renderFrac(`<input class="blank-input" id="inp_s_3" data-ans="2" maxlength="2" onkeyup="checkInput(this)">`, 5)}`, hint: "22 안에 5가 4번 들어가고 2가 남아요!" }
      ]
    },
    {
      hero: `${renderMixed(1, 1, 6)} × 3`,
      steps: [
        { desc: `대분수 ${renderMixed(1, 1, 6)}를 가분수로 변신! (1×6 + 1)`, formula: `= ${renderFrac(`<input class="blank-input" id="inp_s_0" data-ans="7" maxlength="2" onkeyup="checkInput(this)">`, 6)} × 3`, hint: "1×6+1 = 7이에요!" },
        { desc: "분모 6과 자연수 3을 3으로 약분하면 분모는?", formula: `분모 6은 ➔ <input class="blank-input" id="inp_s_1" data-ans="2" maxlength="2" onkeyup="checkInput(this)">`, hint: "6 나누기 3은 2예요!" },
        { desc: `남은 수 ${renderFrac(7, 2)}를 대분수로 정리!`, formula: `= <input class="blank-input" id="inp_s_2" data-ans="3" maxlength="2" onkeyup="checkInput(this)">${renderFrac(`<input class="blank-input" id="inp_s_3" data-ans="1" maxlength="2" onkeyup="checkInput(this)">`, 2)}`, hint: "7 안에 2가 3번 들어가고 1이 남아요!" }
      ]
    },
    {
      hero: `${renderMixed(2, 2, 3)} × 2`,
      steps: [
        { desc: `대분수 ${renderMixed(2, 2, 3)}를 가분수로 변신! (2×3 + 2)`, formula: `= ${renderFrac(`<input class="blank-input" id="inp_s_0" data-ans="8" maxlength="2" onkeyup="checkInput(this)">`, 3)} × 2`, hint: "2×3+2 = 8이에요!" },
        { desc: "분자 8에 자연수 2 곱하기", formula: `= ${renderFrac(`<input class="blank-input" id="inp_s_1" data-ans="16" maxlength="2" onkeyup="checkInput(this)">`, 3)}`, hint: "8 곱하기 2는 16이에요!" },
        { desc: `가분수 ${renderFrac(16, 3)}을 대분수로 정리!`, formula: `= <input class="blank-input" id="inp_s_2" data-ans="5" maxlength="2" onkeyup="checkInput(this)">${renderFrac(`<input class="blank-input" id="inp_s_3" data-ans="1" maxlength="2" onkeyup="checkInput(this)">`, 3)}`, hint: "16 안에 3이 5번 들어가고 1이 남아요!" }
      ]
    }
  ],

  // Part 3: 자연수 x 진분수 (약분 훈련)
  3: [
    {
      hero: `6 × ${renderFrac(2, 3)}`,
      steps: [
        { desc: "자연수 6과 분모 3을 3으로 약분하면 6은 몇이 될까요?", formula: `6은 ➔ <input class="blank-input" id="inp_s_0" data-ans="2" maxlength="2" onkeyup="checkInput(this)">`, hint: "6 나누기 3은 2예요!" },
        { desc: "남은 수 2 × 2를 계산하면?", formula: `= <input class="blank-input" id="inp_s_1" data-ans="4" maxlength="2" onkeyup="checkInput(this)">`, hint: "2 곱하기 2는 4예요!" }
      ]
    },
    {
      hero: `8 × ${renderFrac(3, 4)}`,
      steps: [
        { desc: "자연수 8과 분모 4를 4로 약분하면 8은 몇이 될까요?", formula: `8은 ➔ <input class="blank-input" id="inp_s_0" data-ans="2" maxlength="2" onkeyup="checkInput(this)">`, hint: "8 나누기 4는 2예요!" },
        { desc: "남은 수 2 × 3을 계산하면?", formula: `= <input class="blank-input" id="inp_s_1" data-ans="6" maxlength="2" onkeyup="checkInput(this)">`, hint: "2 곱하기 3은 6이에요!" }
      ]
    },
    {
      hero: `10 × ${renderFrac(2, 5)}`,
      steps: [
        { desc: "자연수 10과 분모 5를 5로 약분하면 10은 몇이 될까요?", formula: `10은 ➔ <input class="blank-input" id="inp_s_0" data-ans="2" maxlength="2" onkeyup="checkInput(this)">`, hint: "10 나누기 5는 2예요!" },
        { desc: "남은 수 2 × 2를 계산하면?", formula: `= <input class="blank-input" id="inp_s_1" data-ans="4" maxlength="2" onkeyup="checkInput(this)">`, hint: "2 곱하기 2는 4예요!" }
      ]
    },
    {
      hero: `9 × ${renderFrac(2, 3)}`,
      steps: [
        { desc: "자연수 9와 분모 3을 3으로 약분하면 9는 몇이 될까요?", formula: `9는 ➔ <input class="blank-input" id="inp_s_0" data-ans="3" maxlength="2" onkeyup="checkInput(this)">`, hint: "9 나누기 3은 3이에요!" },
        { desc: "남은 수 3 × 2를 계산하면?", formula: `= <input class="blank-input" id="inp_s_1" data-ans="6" maxlength="2" onkeyup="checkInput(this)">`, hint: "3 곱하기 2는 6이에요!" }
      ]
    },
    {
      hero: `12 × ${renderFrac(3, 4)}`,
      steps: [
        { desc: "자연수 12와 분모 4를 4로 약분하면 12는 몇이 될까요?", formula: `12는 ➔ <input class="blank-input" id="inp_s_0" data-ans="3" maxlength="2" onkeyup="checkInput(this)">`, hint: "12 나누기 4는 3이에요!" },
        { desc: "남은 수 3 × 3을 계산하면?", formula: `= <input class="blank-input" id="inp_s_1" data-ans="9" maxlength="2" onkeyup="checkInput(this)">`, hint: "3 곱하기 3은 9예요!" }
      ]
    }
  ],

  // Part 4: 진분수 x 진분수 (번개 약분)
  4: [
    {
      hero: `${renderFrac(1, 2)} × ${renderFrac(1, 3)}`,
      steps: [
        { desc: "분모끼리 곱하고, 분자끼리 곱해요!", formula: `= ${renderFrac("1 × 1", `<input class="blank-input" id="inp_s_0" data-ans="2" maxlength="2" onkeyup="checkInput(this)"> × <input class="blank-input" id="inp_s_1" data-ans="3" maxlength="2" onkeyup="checkInput(this)">`)}`, hint: "분모 2와 3을 분모 자리에 써요!" },
        { desc: "분모 2 × 3을 계산하면 전체 칸 수는?", formula: `= ${renderFrac(1, `<input class="blank-input" id="inp_s_2" data-ans="6" maxlength="2" onkeyup="checkInput(this)">`)}`, hint: "2 곱하기 3은 6이에요!" }
      ]
    },
    {
      hero: `${renderFrac(3, 4)} × ${renderFrac(2, 7)}`,
      steps: [
        { desc: "대각선의 4와 2를 2로 약분! 분모 4는 무엇이 될까요?", formula: `분모 4는 ➔ <input class="blank-input" id="inp_s_0" data-ans="2" maxlength="2" onkeyup="checkInput(this)">`, hint: "4 나누기 2는 2예요!" },
        { desc: "분자 2는 2로 나누면 무엇이 될까요?", formula: `분자 2는 ➔ <input class="blank-input" id="inp_s_1" data-ans="1" maxlength="2" onkeyup="checkInput(this)">`, hint: "2 나누기 2는 1이에요!" },
        { desc: `약분된 수로 계산: (3×1) / (2×7)`, formula: `= ${renderFrac(`<input class="blank-input" id="inp_s_2" data-ans="3" maxlength="2" onkeyup="checkInput(this)">`, `<input class="blank-input" id="inp_s_3" data-ans="14" maxlength="2" onkeyup="checkInput(this)">`)}`, hint: "분자는 3, 분모는 2×7=14예요!" }
      ]
    },
    {
      hero: `${renderFrac(2, 3)} × ${renderFrac(3, 5)}`,
      steps: [
        { desc: "대각선의 3과 3을 3으로 싹둑 약분하면 둘 다 무엇이 될까요?", formula: `3은 ➔ <input class="blank-input" id="inp_s_0" data-ans="1" maxlength="2" onkeyup="checkInput(this)">`, hint: "3 나누기 3은 1이에요!" },
        { desc: "남은 수로 계산한 최종 분수는?", formula: `= ${renderFrac(`<input class="blank-input" id="inp_s_1" data-ans="2" maxlength="2" onkeyup="checkInput(this)">`, `<input class="blank-input" id="inp_s_2" data-ans="5" maxlength="2" onkeyup="checkInput(this)">`)}`, hint: "분자는 2×1=2, 분모는 1×5=5예요!" }
      ]
    },
    {
      hero: `${renderFrac(5, 8)} × ${renderFrac(4, 9)}`,
      steps: [
        { desc: "대각선의 8과 4를 4로 약분하면 분모 8은 무엇이 될까요?", formula: `분모 8은 ➔ <input class="blank-input" id="inp_s_0" data-ans="2" maxlength="2" onkeyup="checkInput(this)">`, hint: "8 나누기 4는 2예요!" },
        { desc: "분자 4는 4로 나누면 무엇이 될까요?", formula: `분자 4는 ➔ <input class="blank-input" id="inp_s_1" data-ans="1" maxlength="2" onkeyup="checkInput(this)">`, hint: "4 나누기 4는 1이에요!" },
        { desc: "약분된 수로 계산한 분모는?", formula: `= ${renderFrac(5, `<input class="blank-input" id="inp_s_2" data-ans="18" maxlength="2" onkeyup="checkInput(this)">`)}`, hint: "분모 2 × 9 = 18이에요!" }
      ]
    },
    {
      hero: `${renderFrac(3, 5)} × ${renderFrac(5, 6)}`,
      steps: [
        { desc: "대각선의 5와 5를 약분하면 1! 3과 6을 3으로 약분하면 분모 6은?", formula: `분모 6은 ➔ <input class="blank-input" id="inp_s_0" data-ans="2" maxlength="2" onkeyup="checkInput(this)">`, hint: "6 나누기 3은 2예요!" },
        { desc: "최종 약분 계산 결과는?", formula: `= ${renderFrac(1, `<input class="blank-input" id="inp_s_1" data-ans="2" maxlength="2" onkeyup="checkInput(this)">`)}`, hint: "모두 약분되어 2분의 1이 돼요!" }
      ]
    }
  ],

  // Part 5: 대분수 x 대분수 보스
  5: [
    {
      hero: `${renderMixed(2, 1, 3)} × ${renderMixed(1, 1, 5)}`,
      steps: [
        { desc: `두 대분수를 모두 가분수로 변신!`, formula: `= ${renderFrac(`<input class="blank-input" id="inp_s_0" data-ans="7" maxlength="2" onkeyup="checkInput(this)">`, 3)} × ${renderFrac(`<input class="blank-input" id="inp_s_1" data-ans="6" maxlength="2" onkeyup="checkInput(this)">`, 5)}`, hint: "2×3+1=7, 1×5+1=6이에요!" },
        { desc: "분모 3과 분자 6을 3으로 약분하면 분자는 7 × 2 = ?", formula: `= ${renderFrac(`<input class="blank-input" id="inp_s_2" data-ans="14" maxlength="2" onkeyup="checkInput(this)">`, 5)}`, hint: "6이 2가 되니 7 곱하기 2는 14예요!" },
        { desc: `가분수 ${renderFrac(14, 5)}를 대분수로 변신!`, formula: `= <input class="blank-input" id="inp_s_3" data-ans="2" maxlength="2" onkeyup="checkInput(this)">${renderFrac(`<input class="blank-input" id="inp_s_4" data-ans="4" maxlength="2" onkeyup="checkInput(this)">`, 5)}`, hint: "14 안에 5가 2번 들어가고 4가 남아요!" }
      ]
    },
    {
      hero: `${renderMixed(1, 1, 2)} × ${renderMixed(1, 1, 3)}`,
      steps: [
        { desc: `두 대분수를 가분수로 변신!`, formula: `= ${renderFrac(`<input class="blank-input" id="inp_s_0" data-ans="3" maxlength="2" onkeyup="checkInput(this)">`, 2)} × ${renderFrac(`<input class="blank-input" id="inp_s_1" data-ans="4" maxlength="2" onkeyup="checkInput(this)">`, 3)}`, hint: "1×2+1=3, 1×3+1=4예요!" },
        { desc: "3끼리 약분되고, 분자 4를 분모 2로 나누면 남는 자연수는?", formula: `= <input class="blank-input" id="inp_s_2" data-ans="2" maxlength="2" onkeyup="checkInput(this)">`, hint: "4 나누기 2는 2예요!" }
      ]
    },
    {
      hero: `${renderMixed(1, 1, 4)} × ${renderMixed(2, 2, 5)}`,
      steps: [
        { desc: `두 대분수를 가분수로 변신!`, formula: `= ${renderFrac(`<input class="blank-input" id="inp_s_0" data-ans="5" maxlength="2" onkeyup="checkInput(this)">`, 4)} × ${renderFrac(`<input class="blank-input" id="inp_s_1" data-ans="12" maxlength="2" onkeyup="checkInput(this)">`, 5)}`, hint: "1×4+1=5, 2×5+2=12예요!" },
        { desc: "5끼리 약분되고, 12를 4로 나누면 최종 답은?", formula: `= <input class="blank-input" id="inp_s_2" data-ans="3" maxlength="2" onkeyup="checkInput(this)">`, hint: "12 나누기 4는 3이에요!" }
      ]
    },
    {
      hero: `${renderMixed(1, 2, 3)} × ${renderMixed(1, 1, 4)}`,
      steps: [
        { desc: `두 대분수를 가분수로 변신!`, formula: `= ${renderFrac(`<input class="blank-input" id="inp_s_0" data-ans="5" maxlength="2" onkeyup="checkInput(this)">`, 3)} × ${renderFrac(`<input class="blank-input" id="inp_s_1" data-ans="5" maxlength="2" onkeyup="checkInput(this)">`, 4)}`, hint: "1×3+2=5, 1×4+1=5예요!" },
        { desc: "분자끼리 곱하면 5 × 5 = ?", formula: `= ${renderFrac(`<input class="blank-input" id="inp_s_2" data-ans="25" maxlength="2" onkeyup="checkInput(this)">`, 12)}`, hint: "5 곱하기 5는 25예요!" },
        { desc: `가분수 ${renderFrac(25, 12)}를 대분수로 정리!`, formula: `= <input class="blank-input" id="inp_s_3" data-ans="2" maxlength="2" onkeyup="checkInput(this)">${renderFrac(`<input class="blank-input" id="inp_s_4" data-ans="1" maxlength="2" onkeyup="checkInput(this)">`, 12)}`, hint: "25 안에 12가 2번 들어가고 1이 남아요!" }
      ]
    },
    {
      hero: `${renderMixed(2, 1, 2)} × ${renderMixed(1, 3, 5)}`,
      steps: [
        { desc: `두 대분수를 가분수로 변신!`, formula: `= ${renderFrac(`<input class="blank-input" id="inp_s_0" data-ans="5" maxlength="2" onkeyup="checkInput(this)">`, 2)} × ${renderFrac(`<input class="blank-input" id="inp_s_1" data-ans="8" maxlength="2" onkeyup="checkInput(this)">`, 5)}`, hint: "2×2+1=5, 1×5+3=8이에요!" },
        { desc: "5끼리 약분되고, 8을 2로 나누면 답은?", formula: `= <input class="blank-input" id="inp_s_2" data-ans="4" maxlength="2" onkeyup="checkInput(this)">`, hint: "8 나누기 2는 4예요!" }
      ]
    }
  ]
};

// ========================================================
// 🎲 무한 랜덤 문제 생성 알고리즘
// ========================================================
function generateRandomProblem(catIdx) {
  if (catIdx === 0) {
    // 진분수 x 자연수 (결과 진분수)
    const dens = [5, 6, 7, 8, 9, 10];
    const d = dens[Math.floor(Math.random() * dens.length)];
    const n = Math.floor(Math.random() * 2) + 1; // 1 or 2
    const m = Math.floor(Math.random() * (Math.floor((d - 1) / n) - 1)) + 2;
    const prod = n * m;
    return {
      hero: `${renderFrac(n, d)} × ${m}`,
      steps: [
        { desc: `자연수 ${m}은 분자에만 곱해요!`, formula: `${renderFrac(`${n} × <input class="blank-input" id="inp_s_0" data-ans="${m}" maxlength="2" onkeyup="checkInput(this)">`, d)}`, hint: `자연수 ${m}을 분자에 쏙 넣어보세요!` },
        { desc: `분자 ${n} × ${m}을 계산하면?`, formula: `= ${renderFrac(`<input class="blank-input" id="inp_s_1" data-ans="${prod}" maxlength="2" onkeyup="checkInput(this)">`, d)}`, hint: `${n} 곱하기 ${m}은 ${prod}이에요!` }
      ]
    };
  } else if (catIdx === 1) {
    // 가분수 탈출 (결과 대분수)
    const d = [3, 4, 5, 7][Math.floor(Math.random() * 4)];
    const n = Math.floor(Math.random() * (d - 1)) + 1;
    const m = Math.floor(Math.random() * 3) + 2;
    const prod = n * m;
    if (prod <= d) return generateRandomProblem(catIdx); // 가분수가 되도록 재시도
    const w = Math.floor(prod / d);
    const rem = prod % d;
    return {
      hero: `${renderFrac(n, d)} × ${m}`,
      steps: [
        { desc: `분자에 ${m}을 곱해요 (${n} × ${m})`, formula: `= ${renderFrac(`<input class="blank-input" id="inp_s_0" data-ans="${prod}" maxlength="2" onkeyup="checkInput(this)">`, d)}`, hint: `${n} 곱하기 ${m}은 ${prod}이에요!` },
        { desc: `가분수 ${renderFrac(prod, d)}를 대분수로 정리!`, formula: `= <input class="blank-input" id="inp_s_1" data-ans="${w}" maxlength="2" onkeyup="checkInput(this)">${renderFrac(`<input class="blank-input" id="inp_s_2" data-ans="${rem}" maxlength="2" onkeyup="checkInput(this)">`, d)}`, hint: `${prod} 안에 ${d}가 ${w}번 들어가고 ${rem}이 남아요!` }
      ]
    };
  } else if (catIdx === 2) {
    // 대분수 x 자연수
    const d = [3, 4, 5][Math.floor(Math.random() * 3)];
    const w = Math.floor(Math.random() * 2) + 1;
    const n = Math.floor(Math.random() * (d - 1)) + 1;
    const m = Math.floor(Math.random() * 2) + 2;
    const improper = w * d + n;
    const prod = improper * m;
    const finW = Math.floor(prod / d);
    const finRem = prod % d;
    return {
      hero: `${renderMixed(w, n, d)} × ${m}`,
      steps: [
        { desc: `대분수 ${renderMixed(w, n, d)}를 가분수로 변신!`, formula: `= ${renderFrac(`<input class="blank-input" id="inp_s_0" data-ans="${improper}" maxlength="2" onkeyup="checkInput(this)">`, d)} × ${m}`, hint: `${w}×${d}+${n} = ${improper}예요!` },
        { desc: `분자 ${improper}에 자연수 ${m} 곱하기`, formula: `= ${renderFrac(`<input class="blank-input" id="inp_s_1" data-ans="${prod}" maxlength="2" onkeyup="checkInput(this)">`, d)}`, hint: `${improper} 곱하기 ${m}은 ${prod}이에요!` },
        { desc: `가분수를 대분수로 정리!`, formula: `= <input class="blank-input" id="inp_s_2" data-ans="${finW}" maxlength="2" onkeyup="checkInput(this)">${renderFrac(`<input class="blank-input" id="inp_s_3" data-ans="${finRem}" maxlength="2" onkeyup="checkInput(this)">`, d)}`, hint: `${prod} 안에 ${d}가 ${finW}번 들어가고 ${finRem}이 남아요!` }
      ]
    };
  } else if (catIdx === 3) {
    // 자연수 x 진분수 (약분)
    const d = [3, 4, 5, 6][Math.floor(Math.random() * 4)];
    const mult = Math.floor(Math.random() * 3) + 2;
    const nat = d * mult;
    const n = Math.floor(Math.random() * (d - 1)) + 1;
    const ans = mult * n;
    return {
      hero: `${nat} × ${renderFrac(n, d)}`,
      steps: [
        { desc: `자연수 ${nat}과 분모 ${d}를 ${d}로 약분하면 ${nat}은?`, formula: `${nat}은 ➔ <input class="blank-input" id="inp_s_0" data-ans="${mult}" maxlength="2" onkeyup="checkInput(this)">`, hint: `${nat} 나누기 ${d}는 ${mult}이에요!` },
        { desc: `남은 수 ${mult} × ${n}을 계산하면?`, formula: `= <input class="blank-input" id="inp_s_1" data-ans="${ans}" maxlength="2" onkeyup="checkInput(this)">`, hint: `${mult} 곱하기 ${n}은 ${ans}이에요!` }
      ]
    };
  } else if (catIdx === 4) {
    // 단위/진분수 x 진분수
    const d1 = [2, 3, 4][Math.floor(Math.random() * 3)];
    const d2 = [3, 5, 7][Math.floor(Math.random() * 3)];
    const prodDen = d1 * d2;
    return {
      hero: `${renderFrac(1, d1)} × ${renderFrac(1, d2)}`,
      steps: [
        { desc: "분모끼리 곱하고, 분자끼리 곱해요!", formula: `= ${renderFrac("1 × 1", `<input class="blank-input" id="inp_s_0" data-ans="${d1}" maxlength="2" onkeyup="checkInput(this)"> × <input class="blank-input" id="inp_s_1" data-ans="${d2}" maxlength="2" onkeyup="checkInput(this)">`)}`, hint: `분모 ${d1}과 ${d2}를 분모 자리에 써요!` },
        { desc: `분모 ${d1} × ${d2}를 계산하면 전체 칸 수는?`, formula: `= ${renderFrac(1, `<input class="blank-input" id="inp_s_2" data-ans="${prodDen}" maxlength="2" onkeyup="checkInput(this)">`)}`, hint: `${d1} 곱하기 ${d2}는 ${prodDen}이에요!` }
      ]
    };
  } else {
    // 대분수 x 대분수
    return {
      hero: `${renderMixed(1, 1, 2)} × ${renderMixed(1, 1, 3)}`,
      steps: [
        { desc: `두 대분수를 가분수로 변신!`, formula: `= ${renderFrac(`<input class="blank-input" id="inp_s_0" data-ans="3" maxlength="2" onkeyup="checkInput(this)">`, 2)} × ${renderFrac(`<input class="blank-input" id="inp_s_1" data-ans="4" maxlength="2" onkeyup="checkInput(this)">`, 3)}`, hint: "1×2+1=3, 1×3+1=4예요!" },
        { desc: "3끼리 약분되고, 분자 4를 분모 2로 나누면 남는 자연수는?", formula: `= <input class="blank-input" id="inp_s_2" data-ans="2" maxlength="2" onkeyup="checkInput(this)">`, hint: "4 나누기 2는 2예요!" }
      ]
    };
  }
}

let lastFocusedInput = null;

