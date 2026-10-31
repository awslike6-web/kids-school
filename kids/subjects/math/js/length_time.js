
  window.currentSubject = "수학"; // 🚨 전역 과목명 명시
    // 1. 돋보기 자
    const RULER_ITEMS = {
      clip: { name: '클립', cm: 2, mm: 4, totalMm: 24, emoji: '📎' },
      eraser: { name: '지우개', cm: 3, mm: 8, totalMm: 38, emoji: '🧼' },
      pencil: { name: '연필', cm: 6, mm: 5, totalMm: 65, emoji: '✏️' },
      candy: { name: '사탕', cm: 1, mm: 7, totalMm: 17, emoji: '🍬' }
    };
    let currentItemKey = 'clip';

    function selectRulerItem(key, btn) {
      currentItemKey = key;
      document.querySelectorAll('#item-preset-buttons .candy-num-btn').forEach(b => b.classList.remove('active'));
      if (btn) btn.classList.add('active');
      renderRulerVisuals(btn !== null);
    }

    function renderRulerVisuals(shouldSpeak = false) {
      const item = RULER_ITEMS[currentItemKey];
      const wrap = document.getElementById('ruler-svg-wrap');
      const pxPerMm = 6.8;
      const barWidth = item.totalMm * pxPerMm;

      wrap.innerHTML = `
        <svg viewBox="0 0 540 140">
          <!-- 측정 물건 -->
          <rect x="20" y="20" width="${barWidth}" height="35" rx="8" fill="#38bdf8" stroke="#0284c7" stroke-width="3"/>
          <text x="${20 + barWidth/2}" y="45" font-family="Jua" font-size="18" fill="#fff" text-anchor="middle">${item.emoji} ${item.name} (${item.cm}cm ${item.mm}mm)</text>
          
          <!-- 자 본체 -->
          <rect x="20" y="70" width="500" height="50" fill="#fef08a" stroke="#ca8a04" stroke-width="3" rx="6"/>
          
          <!-- 눈금 그리기 (0 ~ 7cm) -->
          ${Array.from({length: 71}).map((_, i) => {
            const x = 20 + i * pxPerMm;
            const isCm = (i % 10 === 0);
            const isHalf = (i % 5 === 0 && !isCm);
            const h = isCm ? 25 : (isHalf ? 16 : 9);
            const strokeColor = isCm ? '#854d0e' : '#a16207';
            const strokeWidth = isCm ? 2.5 : 1.5;
            let textTag = '';
            if (isCm) {
              textTag = `<text x="${x}" y="112" font-family="Jua" font-size="14" fill="#854d0e" text-anchor="middle">${i/10}</text>`;
            }
            return `<line x1="${x}" y1="70" x2="${x}" y2="${70 + h}" stroke="${strokeColor}" stroke-width="${strokeWidth}"/>${textTag}`;
          }).join('')}

          <!-- 측정 화살표 끝선 -->
          <line x1="${20 + barWidth}" y1="15" x2="${20 + barWidth}" y2="70" stroke="#e11d48" stroke-width="2" stroke-dasharray="4"/>
          <circle cx="${20 + barWidth}" cy="70" r="4" fill="#e11d48"/>
        </svg>
      `;

      document.getElementById('ruler-length-display').textContent = `${item.cm}cm ${item.mm}mm = ${item.totalMm}mm`;
      document.getElementById('ruler-desc-display').innerHTML = `
        <div>💡 <strong>1cm = 10mm</strong> 예요!</div>
        <div>• <strong>${item.cm}cm</strong>는 <strong>${item.cm * 10}mm</strong>이고, 작은 눈금 <strong>${item.mm}mm</strong>를 더하면 ➔ <span style="color:#e11d48; font-weight:bold;">${item.totalMm}mm</span>가 됩니다!</div>
      `;

      if (shouldSpeak && typeof fairySpeak === 'function') {
        fairySpeak(`${item.name}의 길이는 ${item.cm}센티미터 ${item.mm}밀리미터이며, ${item.totalMm}밀리미터입니다!`);
      }
    }

    function speakCurrentRuler() {
      renderRulerVisuals(true);
    }

    // 2. 🎲 자 위 랜덤 막대 실전 측정기
    let currentRandomBar = { startMm: 0, lengthMm: 34, ansCm: 3, ansMm: 4 };

    function generateRandomRulerBar(speak = false) {
      const starts = [0, 0, 0, 10, 15, 20];
      const startMm = starts[Math.floor(Math.random() * starts.length)];
      const lengthMm = Math.floor(Math.random() * 34) + 15;
      const endMm = startMm + lengthMm;

      const ansCm = Math.floor(lengthMm / 10);
      const ansMm = lengthMm % 10;
      currentRandomBar = { startMm, lengthMm, endMm, ansCm, ansMm };

      const wrap = document.getElementById('random-ruler-svg-wrap');
      const pxPerMm = 6.8;
      const startX = 20 + startMm * pxPerMm;
      const barW = lengthMm * pxPerMm;
      const endX = startX + barW;

      wrap.innerHTML = `
        <svg viewBox="0 0 540 140">
          <!-- 측정 랜덤 막대 -->
          <rect x="${startX}" y="22" width="${barW}" height="32" rx="6" fill="#f43f5e" stroke="#be123c" stroke-width="3"/>
          <text x="${startX + barW/2}" y="44" font-family="Jua" font-size="16" fill="#fff" text-anchor="middle">📏 측정할 막대 (?)</text>

          <!-- 자 본체 -->
          <rect x="20" y="70" width="500" height="50" fill="#fef08a" stroke="#ca8a04" stroke-width="3" rx="6"/>
          
          <!-- 눈금 그리기 (0 ~ 7cm) -->
          ${Array.from({length: 71}).map((_, i) => {
            const x = 20 + i * pxPerMm;
            const isCm = (i % 10 === 0);
            const isHalf = (i % 5 === 0 && !isCm);
            const h = isCm ? 25 : (isHalf ? 16 : 9);
            const strokeColor = isCm ? '#854d0e' : '#a16207';
            const strokeWidth = isCm ? 2.5 : 1.5;
            let textTag = '';
            if (isCm) {
              textTag = `<text x="${x}" y="112" font-family="Jua" font-size="14" fill="#854d0e" text-anchor="middle">${i/10}</text>`;
            }
            return `<line x1="${x}" y1="70" x2="${x}" y2="${70 + h}" stroke="${strokeColor}" stroke-width="${strokeWidth}"/>${textTag}`;
          }).join('')}

          <!-- 시작선 / 끝선 점선 -->
          <line x1="${startX}" y1="18" x2="${startX}" y2="70" stroke="#0284c7" stroke-width="2" stroke-dasharray="3"/>
          <circle cx="${startX}" cy="70" r="4" fill="#0284c7"/>
          <line x1="${endX}" y1="18" x2="${endX}" y2="70" stroke="#e11d48" stroke-width="2" stroke-dasharray="3"/>
          <circle cx="${endX}" cy="70" r="4" fill="#e11d48"/>
        </svg>
      `;

      const correctStr = `${ansCm}cm ${ansMm}mm (${lengthMm}mm)`;
      const choicesSet = new Set([correctStr]);
      while (choicesSet.size < 4) {
        const fakeDiff = (Math.floor(Math.random() * 5) - 2) * 10 + (Math.floor(Math.random() * 7) - 3);
        const fakeTotal = Math.max(12, lengthMm + (fakeDiff === 0 ? 3 : fakeDiff));
        const fakeCm = Math.floor(fakeTotal / 10);
        const fakeMm = fakeTotal % 10;
        choicesSet.add(`${fakeCm}cm ${fakeMm}mm (${fakeTotal}mm)`);
      }
      const choicesArr = Array.from(choicesSet).sort(() => Math.random() - 0.5);

      const cBox = document.getElementById('random-bar-choices');
      cBox.innerHTML = '';
      document.getElementById('random-bar-feedback').innerHTML = '';

      choicesArr.forEach(c => {
        const btn = document.createElement('button');
        btn.className = 'candy-num-btn';
        btn.style.fontSize = '1.05rem';
        btn.style.width = '100%';
        btn.textContent = c;
        btn.onclick = () => checkRandomBarAnswer(c, correctStr);
        cBox.appendChild(btn);
      });

      if (speak && typeof fairySpeak === 'function') {
        fairySpeak('새로운 막대가 놓였습니다! 시작 눈금과 끝 눈금을 보고 길이를 맞춰보세요!');
      }
    }

    function checkRandomBarAnswer(selected, correct) {
      const fb = document.getElementById('random-bar-feedback');
      const b = currentRandomBar;
      if (selected === correct) {
        let calcMsg = b.startMm === 0 
          ? `0부터 시작하여 <strong>${b.ansCm}cm ${b.ansMm}mm</strong> 지점에 닿았으므로 정답!`
          : `시작 눈금(${Math.floor(b.startMm/10)}cm ${b.startMm%10}mm)부터 끝 눈금(${Math.floor(b.endMm/10)}cm ${b.endMm%10}mm)까지 차이를 빼서 정확히 맞췄어요!`;
        fb.innerHTML = `<span style="color:#10b981;">🎉 대단해요! ${calcMsg} (${b.lengthMm}mm)</span>`;
        if (typeof fairySpeak === 'function') fairySpeak('정답이에요! 눈금을 아주 정확하게 읽으셨네요!');
        if (typeof grantRewardAndShowUI === 'function') grantRewardAndShowUI(1, false, 'math');
      } else {
        fb.innerHTML = `<span style="color:#ef4444;">😅 아쉬워요! 정답은 [${correct}] 이에요.</span>`;
        if (typeof fairySpeak === 'function') fairySpeak(`아쉬워요! 정답은 ${correct} 입니다.`);
      }
    }

    // 3. 🪐 태양계 행성 소축적 우주 지도 (동적 SVG & 과학 천문 연계)
    const PLANETS_DATA = {
      moon: {
        title: '🌕 지구에서 달까지의 축척 거리',
        origin: '지구 🌍',
        target: '달 🌕',
        targetX: 180,
        kmStr: '3km 844m',
        totalM: '3,844 m (3844m)',
        desc: '실제 거리(384,400km)를 10만분의 1 축척 지도로 줄인 값이에요! 집에서 이웃 동네까지 자전거 타는 거리(약 3.8km)와 비슷해요.',
        voice: '지구에서 달까지의 축척 거리는 3킬로미터 844미터이며, 3844미터입니다!'
      },
      mercury: {
        title: '☿️ 태양에서 수성까지의 축척 거리',
        origin: '태양 ☀️',
        target: '수성 ☿️',
        targetX: 130,
        kmStr: '580m',
        totalM: '580 m',
        desc: '학교 운동장 3바퀴 정도 걷는 거리예요! 태양계에서 태양과 가장 가까운 행성이랍니다.',
        voice: '태양에서 수성까지의 축척 거리는 580미터입니다!'
      },
      venus: {
        title: '♀️ 태양에서 금성까지의 축척 거리',
        origin: '태양 ☀️',
        target: '금성 ♀️',
        targetX: 190,
        kmStr: '1km 80m',
        totalM: '1,080 m (1080m)',
        desc: '지하철 한 정거장 정도의 거리예요! 1km 80m는 1080m와 같아요.',
        voice: '태양에서 금성까지의 축척 거리는 1킬로미터 80미터이며, 1080미터입니다!'
      },
      earth: {
        title: '🌍 태양에서 지구까지의 축척 거리 (1 AU)',
        origin: '태양 ☀️',
        target: '지구 🌍',
        targetX: 260,
        kmStr: '1km 500m',
        totalM: '1,500 m (1500m)',
        desc: '천문학에서 1 천문단위(1 AU)라고 불러요! 걸어서 약 20분 정도 걸리는 친근한 거리예요.',
        voice: '태양에서 지구까지의 축척 거리는 1킬로미터 500미터이며, 1500미터입니다!'
      },
      mars: {
        title: '♂️ 태양에서 화성까지의 축척 거리',
        origin: '태양 ☀️',
        target: '화성 ♂️',
        targetX: 330,
        kmStr: '2km 280m',
        totalM: '2,280 m (2280m)',
        desc: '2km 280m는 2280m와 같아요! 붉은 모래로 덮인 화성까지 탐험을 떠나요.',
        voice: '태양에서 화성까지의 축척 거리는 2킬로미터 280미터이며, 2280미터입니다!'
      },
      jupiter: {
        title: '♃ 태양에서 목성까지의 축척 거리',
        origin: '태양 ☀️',
        target: '목성 ♃',
        targetX: 420,
        kmStr: '7km 780m',
        totalM: '7,780 m (7780m)',
        desc: '옆 도시 입구까지 가는 긴 드라이브 거리예요! 7km 780m는 7780m가 됩니다.',
        voice: '태양에서 목성까지의 축척 거리는 7킬로미터 780미터이며, 7780미터입니다!'
      },
      saturn: {
        title: '♄ 태양에서 토성까지의 축척 거리',
        origin: '태양 ☀️',
        target: '토성 ♄',
        targetX: 500,
        kmStr: '14km 300m',
        totalM: '14,300 m (14300m)',
        desc: '아름다운 거대 고리가 있는 토성까지의 대원정이에요! 14km 300m는 14300m와 같습니다.',
        voice: '태양에서 토성까지의 축척 거리는 14킬로미터 300미터이며, 14300미터입니다!'
      }
    };
    let currentPlanetKey = 'moon';

    function renderSpaceInteractiveCanvas() {
      const p = PLANETS_DATA[currentPlanetKey];
      const wrap = document.getElementById('space-interactive-wrap');
      const startX = (currentPlanetKey === 'moon') ? 60 : 50;
      const targetX = p.targetX;

      wrap.innerHTML = `
        <svg viewBox="0 0 560 160">
          <defs>
            <linearGradient id="orbitBeam" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.8"/>
              <stop offset="100%" stop-color="#f59e0b" stop-opacity="1"/>
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          <!-- 반짝이는 우주 별들 -->
          <circle cx="80" cy="30" r="1.5" fill="#fff" opacity="0.6"/>
          <circle cx="150" cy="20" r="2" fill="#ffd700" opacity="0.8"/>
          <circle cx="240" cy="35" r="1" fill="#fff" opacity="0.5"/>
          <circle cx="350" cy="25" r="2" fill="#fff" opacity="0.7"/>
          <circle cx="460" cy="20" r="1.5" fill="#38bdf8" opacity="0.8"/>
          <circle cx="510" cy="40" r="2" fill="#fff" opacity="0.6"/>

          <!-- 궤도 기준선 -->
          <line x1="40" y1="80" x2="520" y2="80" stroke="#334155" stroke-width="2" stroke-dasharray="4"/>

          <!-- 출발지 (태양 또는 지구) -->
          ${currentPlanetKey === 'moon' ? `
            <circle cx="60" cy="80" r="16" fill="#38bdf8" stroke="#0284c7" stroke-width="2"/>
            <text x="60" y="86" font-size="16" text-anchor="middle">🌍</text>
            <text x="60" y="112" font-family="Jua" font-size="12" fill="#93c5fd" text-anchor="middle">지구 (0m)</text>
          ` : `
            <circle cx="50" cy="80" r="22" fill="#f59e0b" filter="url(#glow)"/>
            <text x="50" y="88" font-size="20" text-anchor="middle">☀️</text>
            <text x="50" y="118" font-family="Jua" font-size="12" fill="#fde047" text-anchor="middle">태양 (0m)</text>
          `}

          <!-- 황금빛 거리 측정 빔 -->
          <line x1="${startX}" y1="80" x2="${targetX}" y2="80" stroke="url(#orbitBeam)" stroke-width="5" stroke-linecap="round" filter="url(#glow)"/>

          <!-- 비행 중인 로켓 🚀 -->
          <g transform="translate(${targetX - 22}, 62)">
            <text x="0" y="0" font-size="22" filter="url(#glow)">🚀</text>
          </g>

          <!-- 도착 행성 목표물 -->
          <circle cx="${targetX}" cy="80" r="15" fill="#7c3aed" opacity="0.3" filter="url(#glow)"/>
          <text x="${targetX}" y="86" font-size="18" text-anchor="middle">${p.target.split(' ')[1] || '🌕'}</text>
          <text x="${targetX}" y="112" font-family="Jua" font-size="12" fill="#e9d5ff" text-anchor="middle">${p.target.split(' ')[0]}</text>

          <!-- 거리 태그 뱃지 -->
          <rect x="${(startX + targetX)/2 - 45}" y="35" width="90" height="24" rx="12" fill="#1e1b4b" stroke="#f59e0b" stroke-width="2"/>
          <text x="${(startX + targetX)/2}" y="51" font-family="Jua" font-size="12" fill="#fef08a" text-anchor="middle">${p.kmStr}</text>
        </svg>
      `;
    }

    function selectPlanet(key, btn) {
      currentPlanetKey = key;
      document.querySelectorAll('#planet-buttons .planet-btn-card').forEach(b => b.classList.remove('active'));
      if (btn) btn.classList.add('active');

      const p = PLANETS_DATA[key];
      renderSpaceInteractiveCanvas();

      document.getElementById('planet-title-display').textContent = `${p.title} : ${p.kmStr} = ${p.totalM}`;
      document.getElementById('planet-desc-display').innerHTML = `
        <div>🚀 <strong>1km = 1000m</strong> 단위 환산:</div>
        <div>• <strong>${p.kmStr}</strong> = <strong style="color:#e11d48;">${p.totalM}</strong></div>
        <div style="margin-top:6px; color:#475569;">📏 <strong>실제 거리와 축척:</strong> ${p.desc}</div>
      `;

      if (btn && typeof fairySpeak === 'function') {
        fairySpeak(p.voice);
      }
    }

    function speakCurrentPlanet() {
      const p = PLANETS_DATA[currentPlanetKey];
      if (typeof fairySpeak === 'function') {
        fairySpeak(p.voice);
      }
    }

    // 4. ⏱️ 실전 스톱워치 타임 어택 챌린지 미니게임
    let timerTargetSeconds = 10;
    let timerStartTime = 0;
    let timerInterval = null;
    let isTimerRunning = false;

    function setTimerTarget(sec, btn) {
      if (isTimerRunning) return;
      timerTargetSeconds = sec;
      document.querySelectorAll('#timer-target-presets .candy-num-btn').forEach(b => b.classList.remove('active'));
      if (btn) btn.classList.add('active');

      const min = Math.floor(sec / 60);
      const remSec = sec % 60;
      const desc = min > 0 ? (remSec > 0 ? `${min}분 ${remSec}초 (${sec}초)` : `${min}분 (${sec}초)`) : `${sec}초`;
      
      document.getElementById('stopwatchTargetDesc').innerHTML = `🎯 목표 시간 : <strong>${desc}</strong> 에 정확히 멈추기!`;
      document.getElementById('stopwatchDisplay').textContent = "00 : 00 . 00";
      document.getElementById('stopwatchResultBox').innerHTML = `
        <div>🎯 목표 시간이 <strong>${desc}</strong>(으)로 설정되었습니다!</div>
        <div style="color:#475569; margin-top:4px;">[타이머 시작]을 누르고 다른 문제를 풀다가 시간에 맞춰 멈춰보세요!</div>
      `;
    }

    function setRandomTimerTarget(btn) {
      if (isTimerRunning) return;
      const targets = [8, 12, 18, 25, 35, 45, 50, 70];
      const randSec = targets[Math.floor(Math.random() * targets.length)];
      setTimerTarget(randSec, btn);
    }

    function startStopwatchChallenge() {
      if (isTimerRunning) return;
      isTimerRunning = true;
      timerStartTime = Date.now();

      document.getElementById('btnTimerStart').style.display = 'none';
      document.getElementById('btnTimerStop').style.display = 'inline-block';
      document.getElementById('floatingTimerCapsule').style.display = 'flex';

      document.getElementById('stopwatchResultBox').innerHTML = `
        <div style="color:#0284c7; font-size:1.3rem;">⏳ <strong>스톱워치 출발!</strong> 시간이 흐르고 있어요!</div>
        <div style="color:#475569; margin-top:4px;">다른 섹션의 문제를 풀거나 자를 측정하다가 목표 <strong>${timerTargetSeconds}초</strong>에 돌아와서 [멈춤]을 누르세요!</div>
      `;

      if (typeof fairySpeak === 'function') {
        fairySpeak(`스톱워치 출발! 목표 시간 ${timerTargetSeconds}초에 맞춰 멈춰보세요!`);
      }

      timerInterval = setInterval(() => {
        const elapsedMs = Date.now() - timerStartTime;
        const totalSec = elapsedMs / 1000;
        const m = Math.floor(totalSec / 60);
        const s = Math.floor(totalSec % 60);
        const ms = Math.floor((elapsedMs % 1000) / 10);

        const mStr = String(m).padStart(2, '0');
        const sStr = String(s).padStart(2, '0');
        const msStr = String(ms).padStart(2, '0');
        
        document.getElementById('stopwatchDisplay').textContent = `${mStr} : ${sStr} . ${msStr}`;
        document.getElementById('floatingTimerText').textContent = `${totalSec.toFixed(1)}s`;
      }, 30);
    }

    function stopStopwatchChallenge() {
      if (!isTimerRunning) return;
      clearInterval(timerInterval);
      isTimerRunning = false;

      const elapsedMs = Date.now() - timerStartTime;
      const elapsedSec = elapsedMs / 1000;
      const diff = elapsedSec - timerTargetSeconds;
      const absDiff = Math.abs(diff);

      document.getElementById('btnTimerStart').style.display = 'inline-block';
      document.getElementById('btnTimerStop').style.display = 'none';
      document.getElementById('floatingTimerCapsule').style.display = 'none';

      const resBox = document.getElementById('stopwatchResultBox');
      const stoppedStr = `${elapsedSec.toFixed(2)}초`;
      const diffStr = diff >= 0 ? `+${diff.toFixed(2)}초` : `${diff.toFixed(2)}초`;

      if (absDiff <= 1.0) {
        // 🌟 성공! (오차 1초 이내)
        const isPerfect = absDiff <= 0.3;
        const badge = isPerfect ? '🌟 [완벽한 신의 손!]' : '🎉 [미션 대성공!]';
        resBox.innerHTML = `
          <div style="color:#10b981; font-size:1.4rem;">${badge} <strong>${stoppedStr}</strong> 에 멈춤! (오차: ${diffStr})</div>
          <div style="color:#047857; margin-top:6px; font-size:1.15rem;">
            오차범위 ±1초 안에 정확히 안착했습니다! <strong>보상 다이아 획득 & 노션 기록 완료!</strong> 💎✨
          </div>
        `;

        if (typeof fairySpeak === 'function') {
          fairySpeak(`대단해요! ${stoppedStr}에 멈춰서 오차범위 1초 안에 성공했어요!`);
        }
        if (typeof grantRewardAndShowUI === 'function') {
          grantRewardAndShowUI(1, false, 'math');
        }
      } else {
        // 😅 실패 (오차 1초 초과)
        resBox.innerHTML = `
          <div style="color:#ef4444; font-size:1.3rem;">😅 아쉬워요! <strong>${stoppedStr}</strong> 에 멈췄어요. (오차: ${diffStr})</div>
          <div style="color:#475569; margin-top:6px;">
            목표 시간(${timerTargetSeconds}초)과 <strong>${absDiff.toFixed(2)}초</strong> 차이가 났어요. 다시 도전해 보세요! 💪
          </div>
        `;

        if (typeof fairySpeak === 'function') {
          fairySpeak(`아쉬워요! ${stoppedStr}에 멈췄습니다. 오차가 ${absDiff.toFixed(1)}초예요. 다시 도전해 보세요!`);
        }
      }
    }

    function resetStopwatchChallenge() {
      if (isTimerRunning) {
        clearInterval(timerInterval);
        isTimerRunning = false;
      }
      document.getElementById('btnTimerStart').style.display = 'inline-block';
      document.getElementById('btnTimerStop').style.display = 'none';
      document.getElementById('floatingTimerCapsule').style.display = 'none';
      document.getElementById('stopwatchDisplay').textContent = "00 : 00 . 00";
      document.getElementById('stopwatchResultBox').innerHTML = `
        <div>💡 <strong>게임 룰:</strong> [시작]을 누르면 시간이 흐릅니다. 다른 섹션의 자 측정이나 퀴즈를 풀다가 목표 시간에 돌아와 [정지]를 누르세요!</div>
        <div style="color:#0284c7; margin-top:4px;">오차범위 <strong>±1초 안에 안착</strong>하면 노션 학습 기록 및 보상 다이아가 지급됩니다! 🎁</div>
      `;
    }

    function scrollToStopwatch() {
      const el = document.getElementById('section-stopwatch-game');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }

    // 5. 퀴즈
    const QUIZ_LIST = [
      { q: "3cm 5mm는 몇 mm일까요?", ans: "35mm", choices: ["35mm", "305mm", "350mm", "8mm"] },
      { q: "52mm를 cm와 mm로 바르게 나타낸 것은?", ans: "5cm 2mm", choices: ["5cm 2mm", "52cm", "5cm 20mm", "2cm 5mm"] },
      { q: "1km는 몇 m와 같을까요?", ans: "1000m", choices: ["1000m", "100m", "10m", "10000m"] },
      { q: "지구에서 달까지 축척 거리가 3km 844m입니다. 몇 m일까요?", ans: "3844m", choices: ["3844m", "384m", "30844m", "38440m"] },
      { q: "1분 30초는 모두 몇 초일까요?", ans: "90초", choices: ["90초", "130초", "60초", "30초"] },
      { q: "100초를 분과 초로 바르게 나타낸 것은?", ans: "1분 40초", choices: ["1분 40초", "1분 00초", "10분", "2분 20초"] }
    ];
    let qIdx = 0;

    function renderQuiz() {
      const q = QUIZ_LIST[qIdx % QUIZ_LIST.length];
      document.getElementById('quiz-question').textContent = q.q;
      const cBox = document.getElementById('quiz-choices');
      cBox.innerHTML = '';
      document.getElementById('quiz-feedback').textContent = '';

      q.choices.forEach(c => {
        const btn = document.createElement('button');
        btn.className = 'divide-btn';
        btn.style.fontSize = '1.2rem';
        btn.textContent = c;
        btn.onclick = () => checkAnswer(c, q.ans);
        cBox.appendChild(btn);
      });
    }

    function checkAnswer(selected, correct) {
      const fb = document.getElementById('quiz-feedback');
      if (selected === correct) {
        fb.innerHTML = `<span style="color:#10b981;">🎉 정답! 측정 박사님이시네요!</span>`;
        if (typeof fairySpeak === 'function') fairySpeak('정답이에요! 참 잘했어요!');
        if (typeof grantRewardAndShowUI === 'function') grantRewardAndShowUI(1, false, 'math');
      } else {
        fb.innerHTML = `<span style="color:#ef4444;">😅 아쉬워요! 정답은 [${correct}] 이에요.</span>`;
        if (typeof fairySpeak === 'function') fairySpeak(`아쉬워요! 정답은 ${correct} 입니다.`);
      }
    }

    function nextQuiz() {
      qIdx++;
      renderQuiz();
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

      renderRulerVisuals(false); // 초기 로딩 시 무발화
      generateRandomRulerBar(false); // 초기 랜덤 막대 생성 (무발화)
      renderSpaceInteractiveCanvas(); // 초기 동적 우주 캔버스 렌더링
      renderQuiz();

      if (typeof initFairyAudio === 'function') initFairyAudio();
      if (typeof initFairyChat === 'function') initFairyChat("MATH", "길이와 시간");
      if (typeof updateTtsToggleUi === 'function') updateTtsToggleUi();
    });
  