(() => {
    window.currentSubject = "수학";

    /* ========================================================
       0. 네비게이션 탭 스위처
    ======================================================== */
    function switchLab(num) {
      document.querySelectorAll('.lab-panel').forEach(p => p.classList.remove('active'));
      document.querySelectorAll('.nav-tab-btn').forEach(b => b.classList.remove('active'));

      const target = document.getElementById('lab-' + num);
      if (target) target.classList.add('active');

      const tabs = document.querySelectorAll('.nav-tab-btn');
      if (tabs[num - 1]) tabs[num - 1].classList.add('active');

      if (num === 1) render3D();
      if (num === 2) drawSlideScene();
      if (num === 3) previewStack();
      if (num === 4) renderWorkshopSVG();
    }

    /* ========================================================
       1. LAB 1 : Canvas 정밀 3D 입체 렌더러
    ======================================================== */
    let wsTheme = 'robot';
    let wsStep = 0; // 0, 1, 2

    const WS_CONFIG = {
      robot: {
        name: "모양 로봇",
        steps: [
          { title: "1단계: 로봇의 [몸통]을 조립해요", hint: "💡 중심을 단단히 잡을 수 있는 평평한 상자 모양을 골라주세요!", correct: "box" },
          { title: "2단계: 로봇의 [팔과 다리]를 달아줘요", hint: "💡 길쭉하게 뻗어나갈 수 있는 둥근기둥 모양을 골라주세요!", correct: "cylinder" },
          { title: "3단계: 로봇의 [머리와 눈]을 올려줘요", hint: "💡 귀엽고 동글동글한 공 모양을 골라주세요!", correct: "sphere" }
        ]
      },
      car: {
        name: "씽씽 자동차",
        steps: [
          { title: "1단계: 자동차의 [차체(몸체)]를 만들어요", hint: "💡 사람이 타고 짐을 싣는 평평한 상자 모양을 골라주세요!", correct: "box" },
          { title: "2단계: 씽씽 달릴 [바퀴 4개]를 달아줘요", hint: "💡 데굴데굴 잘 굴러갈 수 있는 눕힌 둥근기둥 모양을 골라주세요!", correct: "cylinder" },
          { title: "3단계: 반짝이는 [헤드라이트]를 달아줘요", hint: "💡 앞을 환하게 비춰줄 동그란 공 모양을 골라주세요!", correct: "sphere" }
        ]
      },
      castle: {
        name: "튼튼한 성",
        steps: [
          { title: "1단계: 성의 [튼튼한 1층 성벽]을 쌓아요", hint: "💡 바닥에 흔들림 없이 착 달라붙는 상자 모양을 골라주세요!", correct: "box" },
          { title: "2단계: 높이 솟은 [성탑 기둥]을 세워요", hint: "💡 하늘 높이 뻗어나갈 수 있는 세운 둥근기둥 모양을 골라주세요!", correct: "cylinder" },
          { title: "3단계: 꼭대기 [마법 보석 구슬]을 얹어요", hint: "💡 성 꼭대기를 눈부시게 빛내줄 공 모양 보석을 골라주세요!", correct: "sphere" }
        ]
      }
    };

    function selectWorkshopTheme(theme) {
      wsTheme = theme;
      wsStep = 0;
      document.querySelectorAll('#lab-4 .shape-selector-btn').forEach(b => b.classList.remove('active'));
      const activeBtn = document.getElementById('btn-ws-' + theme);
      if (activeBtn) activeBtn.classList.add('active');
      renderWorkshopSVG();
      const fb = document.getElementById('lab4-feedback-box');
      if (fb) fb.innerHTML = `설계도를 보고 알맞은 모양 부품을 골라보세요! 🔧`;
    }

    function resetWorkshopCurrent() {
      wsStep = 0;
      renderWorkshopSVG();
      const fb = document.getElementById('lab4-feedback-box');
      if (fb) fb.innerHTML = `다시 처음부터 조립을 시작해요! 첫 번째 부품을 골라보세요! 🔧`;
    }

    function nextWorkshopTheme() {
      const themes = ['robot', 'car', 'castle'];
      const nextIdx = (themes.indexOf(wsTheme) + 1) % themes.length;
      selectWorkshopTheme(themes[nextIdx]);
    }

    function renderWorkshopSVG() {
      const cfg = WS_CONFIG[wsTheme];
      const svg = document.getElementById('workshop-svg');
      const titleEl = document.getElementById('ws-step-title');
      const hintEl = document.getElementById('ws-step-hint');
      const controlsEl = document.getElementById('ws-controls');

      // 1. 단계별 텍스트 및 조작 버튼 렌더링
      if (wsStep < 3) {
        const stepInfo = cfg.steps[wsStep];
        titleEl.innerHTML = `${stepInfo.title} <span style="color:#0284c7; font-size:1.1rem;">(${wsStep + 1}/3)</span>`;
        hintEl.textContent = stepInfo.hint;

        if (controlsEl) {
          controlsEl.innerHTML = `
            <button class="divide-btn" id="btn-ws-part-box" style="background:#ec4899; font-size:1.15rem; padding:10px 22px;" onclick="chooseWorkshopPart('box')">📦 상자 모양</button>
            <button class="divide-btn" id="btn-ws-part-cylinder" style="background:#0284c7; font-size:1.15rem; padding:10px 22px;" onclick="chooseWorkshopPart('cylinder')">🥫 둥근기둥 모양</button>
            <button class="divide-btn" id="btn-ws-part-sphere" style="background:#10b981; font-size:1.15rem; padding:10px 22px;" onclick="chooseWorkshopPart('sphere')">⚽ 공 모양</button>
          `;
        }
      } else {
        // 완공 상태
        titleEl.innerHTML = `🎉 <span style="color:#10b981;">[${cfg.name}] 완벽 조립 대성공!</span>`;
        hintEl.innerHTML = `상자 · 둥근기둥 · 공 모양이 하나로 합체되어 멋진 작품이 되었어요! 🌟`;

        if (controlsEl) {
          controlsEl.innerHTML = `
            <button class="divide-btn" style="background:#8b5cf6; font-size:1.1rem; padding:10px 20px;" onclick="resetWorkshopCurrent()">🔄 다시 조립하기</button>
            <button class="divide-btn" style="background:#059669; font-size:1.1rem; padding:10px 20px;" onclick="nextWorkshopTheme()">✨ 다음 작품 만들기 ➔</button>
          `;
        }
      }

      // 2. SVG 그래픽 실시간 렌더링
      let svgHtml = '';

      if (wsTheme === 'robot') {
        // ----------------------------------------------------
        // 테마 1: 모양 로봇
        // ----------------------------------------------------
        // 1. 몸통 (상자 모양)
        let bodyFill = (wsStep >= 1) ? '#ec4899' : 'none';
        let bodyStroke = (wsStep >= 1) ? '#be185d' : '#38bdf8';
        let bodyAnim = (wsStep === 1) ? 'class="part-snap"' : '';
        svgHtml += `<rect x="130" y="110" width="100" height="90" rx="12" fill="${bodyFill}" stroke="${bodyStroke}" stroke-width="3.5" stroke-dasharray="${wsStep >= 1 ? 'none' : '6 4'}" ${bodyAnim}/>`;
        if (wsStep >= 1) {
          // 몸통 내부 하트 에너지 코어
          svgHtml += `<circle cx="180" cy="155" r="18" fill="#f43f5e" stroke="#ffe4e6" stroke-width="2"/>`;
          svgHtml += `<text x="180" y="161" font-size="14" text-anchor="middle" fill="#ffffff">❤</text>`;
        }

        // 2. 팔과 다리 (둥근기둥 모양)
        let limbFill = (wsStep >= 2) ? '#0284c7' : 'none';
        let limbStroke = (wsStep >= 2) ? '#0369a1' : '#38bdf8';
        let limbAnim = (wsStep === 2) ? 'class="part-snap"' : '';
        // 양팔
        svgHtml += `<rect x="82" y="125" width="36" height="60" rx="14" fill="${limbFill}" stroke="${limbStroke}" stroke-width="3" stroke-dasharray="${wsStep >= 2 ? 'none' : '6 4'}" ${limbAnim}/>`;
        svgHtml += `<rect x="242" y="125" width="36" height="60" rx="14" fill="${limbFill}" stroke="${limbStroke}" stroke-width="3" stroke-dasharray="${wsStep >= 2 ? 'none' : '6 4'}" ${limbAnim}/>`;
        // 양다리
        svgHtml += `<rect x="144" y="205" width="30" height="55" rx="12" fill="${limbFill}" stroke="${limbStroke}" stroke-width="3" stroke-dasharray="${wsStep >= 2 ? 'none' : '6 4'}" ${limbAnim}/>`;
        svgHtml += `<rect x="186" y="205" width="30" height="55" rx="12" fill="${limbFill}" stroke="${limbStroke}" stroke-width="3" stroke-dasharray="${wsStep >= 2 ? 'none' : '6 4'}" ${limbAnim}/>`;
        if (wsStep >= 2) {
          // 팔다리 관절 링
          svgHtml += `<line x1="82" y1="145" x2="118" y2="145" stroke="#bae6fd" stroke-width="3"/>`;
          svgHtml += `<line x1="242" y1="145" x2="278" y2="145" stroke="#bae6fd" stroke-width="3"/>`;
        }

        // 3. 머리와 눈 (공 모양)
        let headFill = (wsStep >= 3) ? '#10b981' : 'none';
        let headStroke = (wsStep >= 3) ? '#047857' : '#38bdf8';
        let headAnim = (wsStep >= 3) ? 'class="part-snap"' : '';
        // 머리 구체
        svgHtml += `<circle cx="180" cy="65" r="42" fill="${headFill}" stroke="${headStroke}" stroke-width="3.5" stroke-dasharray="${wsStep >= 3 ? 'none' : '6 4'}" ${headAnim}/>`;
        if (wsStep >= 3) {
          // 안테나 (봉 + 구슬)
          svgHtml += `<line x1="180" y1="23" x2="180" y2="12" stroke="#fde047" stroke-width="3"/>`;
          svgHtml += `<circle cx="180" cy="10" r="7" fill="#fde047" stroke="#ca8a04" stroke-width="2"/>`;
          // 초롱초롱한 눈
          svgHtml += `<circle cx="166" cy="62" r="7" fill="#ffffff"/><circle cx="166" cy="62" r="4" fill="#0f172a"/><circle cx="164" cy="60" r="2" fill="#ffffff"/>`;
          svgHtml += `<circle cx="194" cy="62" r="7" fill="#ffffff"/><circle cx="194" cy="62" r="4" fill="#0f172a"/><circle cx="192" cy="60" r="2" fill="#ffffff"/>`;
          // 웃는 입 & 볼터치
          svgHtml += `<path d="M 172 78 Q 180 87 188 78" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round" fill="none"/>`;
          svgHtml += `<ellipse cx="157" cy="73" rx="5" ry="3" fill="#f43f5e" opacity="0.7"/>`;
          svgHtml += `<ellipse cx="203" cy="73" rx="5" ry="3" fill="#f43f5e" opacity="0.7"/>`;
          // 축하 반짝임 별
          svgHtml += `<text x="110" y="50" font-size="22">✨</text><text x="235" y="50" font-size="22">⭐</text>`;
        }
      } else if (wsTheme === 'car') {
        // ----------------------------------------------------
        // 테마 2: 씽씽 자동차
        // ----------------------------------------------------
        // 1. 차체 (상자 모양)
        let bodyFill = (wsStep >= 1) ? '#ea580c' : 'none';
        let bodyStroke = (wsStep >= 1) ? '#9a3412' : '#38bdf8';
        let bodyAnim = (wsStep === 1) ? 'class="part-snap"' : '';
        // 하부 차체
        svgHtml += `<rect x="65" y="115" width="230" height="75" rx="14" fill="${bodyFill}" stroke="${bodyStroke}" stroke-width="3.5" stroke-dasharray="${wsStep >= 1 ? 'none' : '6 4'}" ${bodyAnim}/>`;
        // 상부 캐빈
        svgHtml += `<rect x="115" y="65" width="130" height="52" rx="10" fill="${wsStep >= 1 ? '#fed7aa' : 'none'}" stroke="${bodyStroke}" stroke-width="2.5" stroke-dasharray="${wsStep >= 1 ? 'none' : '6 4'}" ${bodyAnim}/>`;
        if (wsStep >= 1) {
          // 유리창
          svgHtml += `<rect x="125" y="72" width="50" height="38" rx="6" fill="#bae6fd" stroke="#0284c7" stroke-width="1.5"/>`;
          svgHtml += `<rect x="185" y="72" width="50" height="38" rx="6" fill="#bae6fd" stroke="#0284c7" stroke-width="1.5"/>`;
        }

        // 2. 바퀴 (눕힌 둥근기둥 모양)
        let wheelFill = (wsStep >= 2) ? '#0284c7' : 'none';
        let wheelStroke = (wsStep >= 2) ? '#0369a1' : '#38bdf8';
        let wheelAnim = (wsStep === 2) ? 'class="part-snap"' : '';
        svgHtml += `<circle cx="120" cy="190" r="33" fill="${wheelFill}" stroke="${wheelStroke}" stroke-width="4" stroke-dasharray="${wsStep >= 2 ? 'none' : '6 4'}" ${wheelAnim}/>`;
        svgHtml += `<circle cx="240" cy="190" r="33" fill="${wheelFill}" stroke="${wheelStroke}" stroke-width="4" stroke-dasharray="${wsStep >= 2 ? 'none' : '6 4'}" ${wheelAnim}/>`;
        if (wsStep >= 2) {
          // 휠 캡 & 스포크
          svgHtml += `<circle cx="120" cy="190" r="14" fill="#f8fafc" stroke="#64748b" stroke-width="2"/>`;
          svgHtml += `<circle cx="240" cy="190" r="14" fill="#f8fafc" stroke="#64748b" stroke-width="2"/>`;
          svgHtml += `<line x1="120" y1="160" x2="120" y2="220" stroke="#ffffff" stroke-width="2.5"/>`;
          svgHtml += `<line x1="90" y1="190" x2="150" y2="190" stroke="#ffffff" stroke-width="2.5"/>`;
          svgHtml += `<line x1="240" y1="160" x2="240" y2="220" stroke="#ffffff" stroke-width="2.5"/>`;
          svgHtml += `<line x1="210" y1="190" x2="270" y2="190" stroke="#ffffff" stroke-width="2.5"/>`;
        }

        // 3. 헤드라이트 & 경광등 (공 모양)
        let lightFill = (wsStep >= 3) ? '#fde047' : 'none';
        let lightStroke = (wsStep >= 3) ? '#ca8a04' : '#38bdf8';
        let lightAnim = (wsStep >= 3) ? 'class="part-snap"' : '';
        // 전면 헤드라이트 공 모양
        svgHtml += `<circle cx="295" cy="145" r="18" fill="${lightFill}" stroke="${lightStroke}" stroke-width="3.5" stroke-dasharray="${wsStep >= 3 ? 'none' : '6 4'}" ${lightAnim}/>`;
        // 지붕 위 회전 경광등 공 모양
        svgHtml += `<circle cx="180" cy="52" r="14" fill="${wsStep >= 3 ? '#ef4444' : 'none'}" stroke="${wsStep >= 3 ? '#991b1b' : '#38bdf8'}" stroke-width="2.5" stroke-dasharray="${wsStep >= 3 ? 'none' : '6 4'}" ${lightAnim}/>`;
        if (wsStep >= 3) {
          // 밝은 헤드라이트 광선 빔
          svgHtml += `<polygon points="312,145 358,115 358,175" fill="rgba(253, 224, 71, 0.45)"/>`;
          svgHtml += `<text x="320" y="110" font-size="20">💡</text>`;
          svgHtml += `<text x="165" y="35" font-size="18">🚨</text>`;
        }
      } else if (wsTheme === 'castle') {
        // ----------------------------------------------------
        // 테마 3: 튼튼한 성
        // ----------------------------------------------------
        // 1. 성벽 (상자 모양)
        let wallFill = (wsStep >= 1) ? '#64748b' : 'none';
        let wallStroke = (wsStep >= 1) ? '#334155' : '#38bdf8';
        let wallAnim = (wsStep === 1) ? 'class="part-snap"' : '';
        svgHtml += `<rect x="90" y="135" width="180" height="95" rx="8" fill="${wallFill}" stroke="${wallStroke}" stroke-width="3.5" stroke-dasharray="${wsStep >= 1 ? 'none' : '6 4'}" ${wallAnim}/>`;
        if (wsStep >= 1) {
          // 성벽 아치 출입문
          svgHtml += `<path d="M 155 230 L 155 180 A 25 25 0 0 1 205 180 L 205 230 Z" fill="#1e293b" stroke="#f8fafc" stroke-width="2"/>`;
          // 성벽 요철
          for (let bx = 95; bx < 270; bx += 28) {
            svgHtml += `<rect x="${bx}" y="120" width="18" height="15" fill="#64748b" stroke="#334155" stroke-width="2"/>`;
          }
        }

        // 2. 기둥 성탑 (세운 둥근기둥 모양)
        let towerFill = (wsStep >= 2) ? '#0284c7' : 'none';
        let towerStroke = (wsStep >= 2) ? '#0369a1' : '#38bdf8';
        let towerAnim = (wsStep === 2) ? 'class="part-snap"' : '';
        svgHtml += `<rect x="55" y="75" width="48" height="155" rx="16" fill="${towerFill}" stroke="${towerStroke}" stroke-width="3.5" stroke-dasharray="${wsStep >= 2 ? 'none' : '6 4'}" ${towerAnim}/>`;
        svgHtml += `<rect x="257" y="75" width="48" height="155" rx="16" fill="${towerFill}" stroke="${towerStroke}" stroke-width="3.5" stroke-dasharray="${wsStep >= 2 ? 'none' : '6 4'}" ${towerAnim}/>`;
        if (wsStep >= 2) {
          // 탑 창문
          svgHtml += `<rect x="71" y="110" width="16" height="28" rx="8" fill="#fde047" stroke="#ca8a04" stroke-width="2"/>`;
          svgHtml += `<rect x="273" y="110" width="16" height="28" rx="8" fill="#fde047" stroke="#ca8a04" stroke-width="2"/>`;
        }

        // 3. 꼭대기 마법 구슬 (공 모양)
        let gemFill = (wsStep >= 3) ? '#f59e0b' : 'none';
        let gemStroke = (wsStep >= 3) ? '#d97706' : '#38bdf8';
        let gemAnim = (wsStep >= 3) ? 'class="part-snap"' : '';
        // 좌/우 꼭대기 황금 마법 구슬
        svgHtml += `<circle cx="79" cy="52" r="22" fill="${gemFill}" stroke="${gemStroke}" stroke-width="3.5" stroke-dasharray="${wsStep >= 3 ? 'none' : '6 4'}" ${gemAnim}/>`;
        svgHtml += `<circle cx="281" cy="52" r="22" fill="${gemFill}" stroke="${gemStroke}" stroke-width="3.5" stroke-dasharray="${wsStep >= 3 ? 'none' : '6 4'}" ${gemAnim}/>`;
        if (wsStep >= 3) {
          // 마법 구슬 에너지 하이라이트
          svgHtml += `<circle cx="73" cy="46" r="6" fill="#ffffff" opacity="0.75"/>`;
          svgHtml += `<circle cx="275" cy="46" r="6" fill="#ffffff" opacity="0.75"/>`;
          svgHtml += `<text x="68" y="25" font-size="20">🔮</text>`;
          svgHtml += `<text x="270" y="25" font-size="20">🔮</text>`;
          svgHtml += `<text x="165" y="90" font-size="26">🏰✨</text>`;
        }
      }

      svg.innerHTML = svgHtml;
    }

    function chooseWorkshopPart(choice) {
      if (wsStep >= 3) return; // 이미 완성된 상태면 무시

      const cfg = WS_CONFIG[wsTheme];
      const stepInfo = cfg.steps[wsStep];
      const fb = document.getElementById('lab4-feedback-box');
      const clickedBtn = document.getElementById('btn-ws-part-' + choice);

      if (choice === stepInfo.correct) {
        wsStep++;
        renderWorkshopSVG();

        if (wsStep < 3) {
          fb.innerHTML = `✨ <strong>정답!</strong> 알맞은 모양 부품이 설계도에 '철컥!' 결합되었어요! 다음 단계로 가볼까요?`;
          if (typeof fairySpeak === 'function') fairySpeak('정답이에요! 부품이 멋지게 결합되었어요!');
        } else {
          // 완공 축하
          fb.innerHTML = `🎉 <strong>대성공! [${cfg.name}] 완벽 조립 완성!</strong> 🍬 사탕 보상 획득!`;
          if (typeof fairySpeak === 'function') fairySpeak(`축하해요! 세상에서 가장 멋진 ${cfg.name}이 완성되었어요!`);
          if (typeof grantRewardAndShowUI === 'function') grantRewardAndShowUI(1, false, 'math');
          triggerConfetti();
        }
      } else {
        if (clickedBtn) {
          clickedBtn.classList.add('ws-shake');
          setTimeout(() => clickedBtn.classList.remove('ws-shake'), 450);
        }
        fb.innerHTML = `💡 아쉬워요! 지금 단계에는 다른 모양이 더 튼튼해요. 힌트를 다시 읽어보세요!`;
        if (typeof fairySpeak === 'function') fairySpeak('다른 모양이 더 어울려요. 힌트를 다시 확인해보세요!');
      }
    }

    /* ========================================================
       5. LAB 5 : 실생활 모양 분류 퀴즈
    ======================================================== */
    const SHAPE_QUIZ = [
      { emoji: "🎲", name: "주사위", ans: "상자 모양", choices: ["상자 모양", "둥근기둥 모양", "공 모양", "원뿔 모양"] },
      { emoji: "🥫", name: "음료수 캔", ans: "둥근기둥 모양", choices: ["상자 모양", "둥근기둥 모양", "공 모양", "도넛 모양"] },
      { emoji: "🏀", name: "농구공", ans: "공 모양", choices: ["상자 모양", "둥근기둥 모양", "공 모양", "달걀 모양"] },
      { emoji: "📦", name: "택배 상자", ans: "상자 모양", choices: ["상자 모양", "둥근기둥 모양", "공 모양", "삼각기둥"] },
      { emoji: "🛢️", name: "기름 드럼통", ans: "둥근기둥 모양", choices: ["상자 모양", "둥근기둥 모양", "공 모양", "원뿔 모양"] },
      { emoji: "⚽", name: "축구공", ans: "공 모양", choices: ["상자 모양", "둥근기둥 모양", "공 모양", "별 모양"] },
      { emoji: "🧱", name: "붉은 벽돌", ans: "상자 모양", choices: ["상자 모양", "둥근기둥 모양", "공 모양", "고깔 모양"] },
      { emoji: "🪵", name: "통나무 토막", ans: "둥근기둥 모양", choices: ["상자 모양", "둥근기둥 모양", "공 모양", "하트 모양"] },
      { emoji: "🌍", name: "지구본", ans: "공 모양", choices: ["상자 모양", "둥근기둥 모양", "공 모양", "도넛 모양"] },
      { emoji: "🎁", name: "선물 상자", ans: "상자 모양", choices: ["상자 모양", "둥근기둥 모양", "공 모양", "원기둥 모양"] }
    ];
    let sqIdx = 0;
    let sqSolved = false;

    function renderShapeQuiz() {
      sqSolved = false;
      const q = SHAPE_QUIZ[sqIdx % SHAPE_QUIZ.length];
      document.getElementById('item-emoji').textContent = q.emoji;
      document.getElementById('item-name').textContent = q.name;
      const cBox = document.getElementById('shape-quiz-choices');
      cBox.innerHTML = '';
      document.getElementById('shape-quiz-feedback').textContent = '';

      q.choices.forEach(c => {
        const btn = document.createElement('button');
        btn.className = 'divide-btn';
        btn.style.fontSize = '1.15rem';
        btn.style.padding = '12px 10px';
        btn.textContent = c;
        btn.onclick = () => checkShapeAns(c, q.ans);
        cBox.appendChild(btn);
      });
    }

    function checkShapeAns(selected, correct) {
      if (sqSolved) return;
      const fb = document.getElementById('shape-quiz-feedback');
      if (selected === correct) {
        sqSolved = true;
        fb.innerHTML = `<span style="color:#10b981;">🎉 정답! [${correct}] 맞았어요! 참 잘했어요!</span>`;
        if (typeof fairyPraise === 'function') fairyPraise();
        if (typeof grantRewardAndShowUI === 'function') grantRewardAndShowUI(1, false, 'math');
        triggerConfetti();
      } else {
        fb.innerHTML = `<span style="color:#92400e;">💡 [${correct}]의 평평한 면과 둥근 면을 떠올리고 다시 골라 봐요.</span>`;
        if (typeof fairyEncourage === 'function') fairyEncourage();
      }
    }

    function nextShapeQuiz() {
      sqIdx++;
      renderShapeQuiz();
    }

    function triggerConfetti() {
      const canvas = document.getElementById('confetti-canvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      const pieces = [];
      const colors = ['#ec4899', '#0284c7', '#10b981', '#f59e0b', '#8b5cf6'];
      for (let i = 0; i < 40; i++) {
        pieces.push({
          x: canvas.width / 2,
          y: canvas.height / 2,
          vx: (Math.random() - 0.5) * 12,
          vy: (Math.random() - 0.7) * 14,
          size: Math.random() * 8 + 4,
          color: colors[Math.floor(Math.random() * colors.length)],
          rot: Math.random() * 360,
          vrot: (Math.random() - 0.5) * 10
        });
      }

      let frames = 0;
      function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        pieces.forEach(p => {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.35;
          p.rot += p.vrot;

          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rot * Math.PI) / 180);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.restore();
        });
        frames++;
        if (frames < 50) requestAnimationFrame(render);
        else ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      render();
    }

    function exitRoom() {
      location.href = 'math.html';
    }

    document.addEventListener('DOMContentLoaded', () => {
      let currentProfile = localStorage.getItem('currentUser') || 'daughter';
      const name = currentProfile === 'son' ? '민수' : '민서';
      const icon = currentProfile === 'son' ? '👦' : '👧';
      const themeClass = currentProfile === 'daughter' ? 'theme--slime' : 'theme--arcade';
      document.body.className = themeClass;
      document.getElementById('userName').textContent = `${name} 대원`;
      document.getElementById('userIcon').textContent = icon;

      render3D();
      drawSlideScene();
      previewStack();
      renderWorkshopSVG();
      renderShapeQuiz();

      if (typeof initFairyAudio === 'function') initFairyAudio();
      if (typeof initFairyChat === 'function') initFairyChat("MATH", "여러가지모양");
      if (typeof updateTtsToggleUi === 'function') updateTtsToggleUi();
    });

Object.assign(window, {switchLab, selectWorkshopTheme, resetWorkshopCurrent, nextWorkshopTheme, renderWorkshopSVG, chooseWorkshopPart, renderShapeQuiz, checkShapeAns, nextShapeQuiz, triggerConfetti, exitRoom});
})();
