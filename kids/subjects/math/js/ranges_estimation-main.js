    function setRoundingScope(scopeKey, btn) {
      currentScope = scopeKey;
      document.querySelectorAll('#section-rounding .candy-num-btn').forEach(b => b.classList.remove('active'));
      if (btn) btn.classList.add('active');

      const cfg = SCOPE_CONFIG[scopeKey];
      document.getElementById('magnifierTitle').innerHTML = cfg.title;
      document.getElementById('magnifierSub').innerHTML = cfg.sub;

      rollDigit(currentSelectedDigit, null);
    }

    function rollDigit(digit, btn, shouldSpeak = true) {
      currentSelectedDigit = digit;
      document.querySelectorAll('.digit-ball-btn').forEach(b => b.classList.remove('active'));
      if (btn) btn.classList.add('active');

      const ballGroup = document.getElementById('rollingBallGroup');
      const ballText = document.getElementById('ballDigitText');
      ballText.textContent = digit;

      const isRoundUp = digit >= 5;

      ballGroup.style.transition = 'none';
      ballGroup.setAttribute('transform', 'translate(300, 35)');

      setTimeout(() => {
        ballGroup.style.transition = 'all 0.6s cubic-bezier(0.25, 1, 0.5, 1)';
        if (isRoundUp) {
          ballGroup.setAttribute('transform', 'translate(540, 100)');
        } else {
          ballGroup.setAttribute('transform', 'translate(60, 100)');
        }
      }, 50);

      const vBox = document.getElementById('roundingVerdictBox');
      if (isRoundUp) {
        vBox.innerHTML = `<span style="color:#dc2626;">🚀 숫자 <strong>${digit}</strong>은(는) 5 이상이므로 <strong>올림(+1)</strong>! ➔ 윗자리 숫자를 1 올려줍니다!</span>`;
        if (shouldSpeak) playUnitAudio('round_up', `숫자 ${digit}은 5 이상이므로 올림하여 윗자리 숫자가 1 커집니다!`);
      } else {
        vBox.innerHTML = `<span style="color:#2563eb;">🛝 숫자 <strong>${digit}</strong>은(는) 4 이하이므로 <strong>버림(0)</strong>! ➔ 아랫자리 숫자를 모두 0으로 만듭니다!</span>`;
        if (shouldSpeak) playUnitAudio('round_down', `숫자 ${digit}은 4 이하이므로 버림하여 0으로 만듭니다!`);
      }
    }

    /* ========================================================
       3. 실생활 롤플레잉 공작소 로직
       ======================================================== */
    let packSize = 10;
    function setPackBoxSize(size) {
      packSize = size;
      document.getElementById('btnPack10').classList.toggle('active', size === 10);
      document.getElementById('btnPack100').classList.toggle('active', size === 100);
      calcBadgePacking();
    }
    function calcBadgePacking() {
      const total = parseInt(document.getElementById('badgeTotalInput').value) || 0;
      const fullBoxes = Math.floor(total / packSize);
      const remainder = total % packSize;
      const neededBoxes = remainder > 0 ? fullBoxes + 1 : fullBoxes;

      document.getElementById('badgePackResult').innerHTML = `
        📦 <strong>${neededBoxes}상자 필요! (올림)</strong><br>
        <span style="font-size:0.9rem; color:#475569;">
          (${fullBoxes}상자 꽉 참 + ${remainder > 0 ? remainder + '개 담을 1상자 추가!' : '남는 배지 없음!'})
        </span>
      `;
    }

    let exchangeUnit = 1000;
    function setExchangeUnit(unit) {
      exchangeUnit = unit;
      document.getElementById('btnBill1000').classList.toggle('active', unit === 1000);
      document.getElementById('btnBill10000').classList.toggle('active', unit === 10000);
      calcCoinExchange();
    }
    function calcCoinExchange() {
      const total = parseInt(document.getElementById('coinTotalInput').value) || 0;
      const bills = Math.floor(total / exchangeUnit);
      const exchangedMoney = bills * exchangeUnit;
      const leftCoins = total % exchangeUnit;

      document.getElementById('coinExchangeResult').innerHTML = `
        💵 <strong>${exchangedMoney.toLocaleString()}원 (${bills}장) 교환! (버림)</strong><br>
        <span style="font-size:0.9rem; color:#475569;">
          (바꿀 수 없는 ${leftCoins.toLocaleString()}원은 동전으로 남김!)
        </span>
      `;
    }

    let audiencePlace = 1000;
    function setAudiencePlace(place) {
      audiencePlace = place;
      document.getElementById('btnAudience1000').classList.toggle('active', place === 1000);
      document.getElementById('btnAudience100').classList.toggle('active', place === 100);
      calcStadiumAudience();
    }
    function calcStadiumAudience() {
      const total = parseInt(document.getElementById('stadiumAudienceInput').value) || 0;
      let rounded = 0;
      let desc = '';

      if (audiencePlace === 1000) {
        const hundredsDigit = Math.floor((total % 1000) / 100);
        rounded = Math.round(total / 1000) * 1000;
        desc = `(백의 자리 ${hundredsDigit} ${hundredsDigit >= 5 ? '≥ 5 이므로 올림' : '< 5 이므로 버림'}!)`;
      } else {
        const tensDigit = Math.floor((total % 100) / 10);
        rounded = Math.round(total / 100) * 100;
        desc = `(십의 자리 ${tensDigit} ${tensDigit >= 5 ? '≥ 5 이므로 올림' : '< 5 이므로 버림'}!)`;
      }

      document.getElementById('stadiumResult').innerHTML = `
        📰 <strong>"오늘 약 ${rounded.toLocaleString()}명 입장!"</strong><br>
        <span style="font-size:0.9rem; color:#475569;">${desc}</span>
      `;
    }

    /* ========================================================
       4. AI 코코 탐정 퀴즈 로직
       ======================================================== */
    const QUIZ_LIST = [
      {
        q: "20 이상인 수에는 20이 포함될까요?",
        ans: "포함된다 (20과 같거나 큰 수)",
        choices: [
          "포함된다 (20과 같거나 큰 수)",
          "포함되지 않는다 (20보다 큰 수)",
          "때에 따라 다르다",
          "자연수일 때만 포함된다"
        ],
        explain: "💡 '이상'과 '이하'는 그 수를 포함하므로 20이 들어갑니다!"
      },
      {
        q: "수직선에서 15 미만을 나타낼 때, 15 위치에 표시해야 하는 동그라미는?",
        ans: "○ (속이 빈 동그라미 - 15 제외)",
        choices: [
          "○ (속이 빈 동그라미 - 15 제외)",
          "● (속이 찬 동그라미 - 15 포함)",
          "▲ (세모 기호)",
          "동그라미를 그리지 않는다"
        ],
        explain: "💡 '초과'와 '미만'은 기준 수를 포함하지 않으므로 속이 빈 동그라미(○)를 그립니다!"
      },
      {
        q: "어떤 놀이기구 탑승 조건이 '키 130cm 초과 150cm 이하'일 때 탑승 가능한 어린이는?",
        ans: "140cm",
        choices: ["130cm", "140cm", "155cm", "125cm"],
        explain: "💡 130 초과이므로 130은 탑승 불가! 150 이하이므로 140cm 친구만 탈 수 있어요!"
      },
      {
        q: "공책 246권을 10권씩 묶음으로 포장하려고 합니다. 남는 공책 없이 모두 포장하려면 최소 몇 묶음 상자가 필요할까요? (올림)",
        ans: "25묶음",
        choices: ["25묶음", "24묶음", "20묶음", "30묶음"],
        explain: "💡 24상자를 채우고 6권이 남으므로, 1상자가 더 필요합니다! (246 올림 ➔ 250권 분량 = 25상자)"
      },
      {
        q: "저금통에 35,780원이 있습니다. 이 돈을 10,000원 지폐로만 바꾼다면 최대 얼마까지 바꿀 수 있을까요? (버림)",
        ans: "30,000원",
        choices: ["30,000원", "40,000원", "35,000원", "36,000원"],
        explain: "💡 만 원 미만의 5,780원은 지폐로 바꿀 수 없으므로 버림하여 30,000원(3장)만 바꿉니다!"
      },
      {
        q: "수 4,785를 백의 자리까지 반올림하면 얼마가 될까요?",
        ans: "4,800",
        choices: ["4,800", "4,700", "5,000", "4,780"],
        explain: "💡 백의 자리까지 구하므로 바로 아래 십의 자리(8)를 봅니다. 8 ≥ 5 이므로 올림하여 4,800이 됩니다!"
      },
      {
        q: "어떤 수를 반올림하여 십의 자리까지 나타내었더니 70이 되었습니다. 이 수가 될 수 있는 자연수의 범위는?",
        ans: "65 이상 75 미만",
        choices: [
          "65 이상 75 미만",
          "60 이상 70 이하",
          "70 이상 80 미만",
          "65 초과 75 이하"
        ],
        explain: "💡 일의 자리가 5, 6, 7, 8, 9이면 올림(65~69 ➔ 70), 0, 1, 2, 3, 4이면 버림(70~74 ➔ 70)이므로 [65 이상 75 미만]입니다!"
      },
      {
        q: "어떤 수의 범위를 수직선에 그렸을 때, 12에는 속이 찬 점(●), 18에는 속이 빈 점(○)이 찍혀 있습니다. 올바른 표현은?",
        ans: "12 이상 18 미만",
        choices: [
          "12 이상 18 미만",
          "12 초과 18 이하",
          "12 이상 18 이하",
          "12 초과 18 미만"
        ],
        explain: "💡 속이 찬 점(●)은 이상, 속이 빈 점(○)은 미만을 뜻합니다!"
      },
      {
        q: "소수 8.46을 소수 첫째 자리까지 올림하여 나타내면 얼마일까요?",
        ans: "8.5",
        choices: ["8.5", "8.4", "9.0", "8.40"],
        explain: "💡 소수 둘째 자리 6이 0보다 크므로 소수 첫째 자리를 1 올려서 8.5가 됩니다!"
      },
      {
        q: "어린이 박물관 입장료가 7,300원일 때, 1,000원짜리 지폐로만 지불하려면 최소 몇 장을 내야 할까요? (올림)",
        ans: "8장 (8,000원)",
        choices: ["8장 (8,000원)", "7장 (7,000원)", "73장", "10장"],
        explain: "💡 7장(7,000원)만 내면 300원이 부족하므로 무조건 8장(8,000원)을 내야 합니다!"
      }
    ];

    let quizIdx = 0;

    function renderQuiz() {
      const q = QUIZ_LIST[quizIdx % QUIZ_LIST.length];
      document.getElementById('quizProgressText').textContent = `문제 ${quizIdx + 1} / ${QUIZ_LIST.length}`;
      document.getElementById('quizQuestion').textContent = q.q;

      const choicesBox = document.getElementById('quizChoices');
      choicesBox.innerHTML = '';
      document.getElementById('quizFeedback').innerHTML = '';

      const shuffled = [...q.choices].sort(() => Math.random() - 0.5);

      shuffled.forEach(choice => {
        const btn = document.createElement('button');
        btn.className = 'candy-num-btn';
        btn.style.width = '100%';
        btn.style.fontSize = '1.15rem';
        btn.style.padding = '12px';
        btn.textContent = choice;
        btn.onclick = () => checkQuizAnswer(choice, q);
        choicesBox.appendChild(btn);
      });
    }

    function checkQuizAnswer(selected, q) {
      const fb = document.getElementById('quizFeedback');
      const qNum = (quizIdx % QUIZ_LIST.length) + 1;
      const isCorrect = selected === q.ans;

      if (isCorrect) {
        fb.innerHTML = `
          <div style="color:#10b981; margin-bottom:4px;">🎉 완벽한 정답입니다! 다이아몬드 1개 획득! 💎</div>
          <div style="font-size:0.95rem; color:#475569;">${q.explain}</div>
        `;
        playUnitAudio(`q${qNum}_correct`, '정답이에요! 참 잘했어요!');
        if (typeof grantRewardAndShowUI === 'function') grantRewardAndShowUI(1, false, 'math');
      } else {
        fb.innerHTML = `
          <div style="color:#ef4444; margin-bottom:4px;">😅 아쉬워요! 정답은 [${q.ans}] 입니다.</div>
          <div style="font-size:0.95rem; color:#475569;">${q.explain}</div>
        `;
        playUnitAudio(`q${qNum}_incorrect`, `아쉬워요! 정답은 ${q.ans} 입니다.`);
      }
    }

    function nextQuizQuestion() {
      quizIdx = (quizIdx + 1) % QUIZ_LIST.length;
      renderQuiz();
    }

    function exitRoom() {
      location.href = 'math.html#concepts';
    }

    /* 💡 [노션 Headless CMS] CURRICULUM_DB 수의 범위 퀴즈 실시간 동기화 */
    async function loadNotionCurriculumData() {
      try {
        const PROXY = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.WORKER_PROXY_URL) ? APP_CONFIG.WORKER_PROXY_URL : "https://minmin-notion.awslike6.workers.dev";
        const DB_ID = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.CURRICULUM_DB_ID) ? APP_CONFIG.CURRICULUM_DB_ID : "3e8a27115b68806d94bfc81e9b3435fa";
        const url = `${PROXY}/v1/databases/${DB_ID}/query`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            page_size: 100,
            filter: {
              and: [
                { property: "과목", select: { equals: "수학" } },
                { property: "단원", rich_text: { contains: "수의 범위" } }
              ]
            }
          })
        });
        if (!res.ok) return;
        const data = await res.json();
        const results = data.results || [];
        if (results.length === 0) return;

        const quizPages = results.filter(r => r.properties?.["구역"]?.select?.name === "탐구퀴즈");
        if (quizPages.length > 0) {
          const loadedQuizzes = quizPages.map(page => {
            const p = page.properties || {};
            const q = (p["퀴즈 질문"]?.rich_text || []).map(x => x.plain_text).join('').trim();
            const choicesText = (p["보기 1~4"]?.rich_text || []).map(x => x.plain_text).join('').trim();
            const choices = choicesText ? choicesText.split('\n').map(s => s.trim()).filter(Boolean) : [];
            const ansNum = p["정답"]?.number;
            const ansText = (ansNum && choices[ansNum - 1]) ? choices[ansNum - 1] : choices[0];
            const explain = (p["해설"]?.rich_text || []).map(x => x.plain_text).join('').trim();
            return { q, ans: ansText, choices, explain };
          }).filter(x => x.q && x.choices.length >= 2);

          if (loadedQuizzes.length >= 5) {
            QUIZ_LIST.length = 0;
            loadedQuizzes.forEach(item => QUIZ_LIST.push(item));
            renderQuiz();
            console.log(`[노션 연동] 수의 범위 퀴즈 ${loadedQuizzes.length}건 실시간 연동 완료!`);
          }
        }
      } catch (e) {
        console.warn("노션 교재 데이터 동기화 폴백 안내 (로컬 캐시 안전 구동):", e);
      }
    }

    /* 초기화 */
    document.addEventListener('DOMContentLoaded', () => {
      let currentProfile = localStorage.getItem('currentUser') || 'daughter';
      const name = currentProfile === 'son' ? '민수' : '민서';
      const icon = currentProfile === 'son' ? '👦' : '👧';
      const themeClass = currentProfile === 'daughter' ? 'theme--slime' : 'theme--arcade';
      document.body.className = themeClass;
      document.getElementById('userName').textContent = `${name} 대원`;
      document.getElementById('userIcon').textContent = icon;

      selectRangePreset('iseong', false); // 초기 로딩 시 무발화
      rollDigit(8, null, false);          // 초기 로딩 시 무발화
      calcBadgePacking();
      calcCoinExchange();
      calcStadiumAudience();
      renderQuiz();

      // 노션 교재 퀴즈 비동기 동기화
      loadNotionCurriculumData();

      if (typeof initFairyAudio === 'function') initFairyAudio();
      if (typeof initFairyChat === 'function') initFairyChat("MATH", "수의 범위와 어림하기");
      if (typeof updateTtsToggleUi === 'function') updateTtsToggleUi();
    });
  