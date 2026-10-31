
  window.currentSubject = "수학"; // 🚨 전역 과목명 명시
    /* ========================================================
       🎧 고음질 MP3 전용 플레이어 (스토리북급 오디오 시스템)
       ======================================================== */
    let currentUnitAudio = null;

    function playUnitAudio(key, fallbackText = '') {
      const isTtsEnabled = localStorage.getItem('fairy_tts_enabled') !== 'false';
      if (!isTtsEnabled) return;

      // 이전 재생 즉시 정지
      if (currentUnitAudio) {
        try {
          currentUnitAudio.pause();
          currentUnitAudio.currentTime = 0;
        } catch (e) {}
        currentUnitAudio = null;
      }
      if (typeof stopFairyTTS === 'function') {
        stopFairyTTS();
      }

      const audioSrc = `audio/minsu/5-2/1/${key}.mp3`;
      const audio = new Audio(audioSrc);
      currentUnitAudio = audio;

      audio.onerror = () => {
        console.warn(`[Audio Fallback] ${audioSrc} 로드 실패, TTS로 폴백합니다.`);
        currentUnitAudio = null;
        if (fallbackText && typeof fairySpeak === 'function') {
          fairySpeak(fallbackText);
        }
      };

      audio.play().catch(err => {
        console.warn(`[Audio Play Error] ${err}`);
        if (fallbackText && typeof fairySpeak === 'function') {
          fairySpeak(fallbackText);
        }
      });
    }

    /* ========================================================
       0. 교과서 원본 e-Book 뷰어 로직
       ======================================================== */
    const TEXTBOOK_PAGES = [
      { file: '1000032806.jpg', title: '1단원 시작 (올림픽 자원봉사자)' },
      { file: '1000032807.jpg', title: 'p.10~11 이상과 이하 (● 채운 점)' },
      { file: '1000032808.jpg', title: 'p.12~13 초과와 미만 (○ 뚫린 점)' },
      { file: '1000032809.jpg', title: 'p.14~15 수의 범위 활용 (체급 & 티셔츠)' },
      { file: '1000032810.jpg', title: 'p.16~17 올림 (배지 포장 & 최소 지불)' },
      { file: '1000032811.jpg', title: 'p.18~19 버림 (동전 지폐 환전)' },
      { file: '1000032812.jpg', title: 'p.20~21 반올림 (관중 수 어림하기)' },
      { file: '1000032813.jpg', title: 'p.22~23 올림·버림·반올림 실생활 활용' },
      { file: '1000032814.jpg', title: 'p.24~25 탐구 수학 (환경과 현명한 선택)' },
      { file: '1000032815.jpg', title: 'p.26 얼마나 알고 있나요 ①' },
      { file: '1000032816.jpg', title: 'p.27 얼마나 알고 있나요 ②' },
      { file: '1000032817.jpg', title: 'p.28 얼마나 알고 있나요 ③' },
      { file: '1000032818.jpg', title: 'p.29 단원 마무리 & 수학 놀이터' }
    ];
    let currentTbIdx = 0;

    function openTextbookModal() {
      document.getElementById('textbookModal').classList.add('active');
      renderTextbookPage();
    }
    function closeTextbookModal() {
      document.getElementById('textbookModal').classList.remove('active');
    }
    function changeTextbookPage(delta) {
      currentTbIdx += delta;
      if (currentTbIdx < 0) currentTbIdx = 0;
      if (currentTbIdx >= TEXTBOOK_PAGES.length) currentTbIdx = TEXTBOOK_PAGES.length - 1;
      renderTextbookPage();
    }
    function renderTextbookPage() {
      const p = TEXTBOOK_PAGES[currentTbIdx];
      document.getElementById('textbookModalImg').src = `images/minsu/5-2/1/${p.file}`;
      document.getElementById('modalPageTitle').textContent = p.title;
      document.getElementById('modalPageCounter').textContent = `${currentTbIdx + 1} / ${TEXTBOOK_PAGES.length}`;
      document.getElementById('btnPrevPage').disabled = currentTbIdx === 0;
      document.getElementById('btnNextPage').disabled = currentTbIdx === TEXTBOOK_PAGES.length - 1;
    }

    /* ========================================================
       1. 수직선 공작소 로직
       ======================================================== */
    const RANGE_PRESETS = {
      iseong: {
        title: '🏃 20세 이상인 수 (올림픽 자원봉사자 모집)',
        minVal: 20, maxVal: null,
        minType: 'closed',
        scaleMin: 15, scaleMax: 25,
        explain: '💡 <strong>20 이상</strong>은 <strong>20을 포함</strong>하며 20과 같거나 큰 모든 수입니다.<br>수직선 20 위치에 <strong style="color:#0284c7;">● (채운 점)</strong>을 찍고 오른쪽으로 쭉 화살표를 긋습니다.',
        testCards: [18, 19, 20, 21, 24],
        audioKey: 'range_iseong',
        voice: '20 이상은 20을 포함하며 20과 같거나 큰 수입니다. 20에 채운 동그라미를 그립니다!'
      },
      iha: {
        title: '🧳 10kg 이하인 수 (비행기 기내 수하물 규정)',
        minVal: null, maxVal: 10,
        maxType: 'closed',
        scaleMin: 5, scaleMax: 15,
        explain: '💡 <strong>10 이하</strong>는 <strong>10을 포함</strong>하며 10과 같거나 작은 모든 수입니다.<br>수직선 10 위치에 <strong style="color:#0284c7;">● (채운 점)</strong>을 찍고 왼쪽으로 쭉 화살표를 긋습니다.',
        testCards: [8, 9, 10, 11, 13],
        audioKey: 'range_iha',
        voice: '10 이하는 10을 포함하며 10과 같거나 작은 수입니다. 10에 채운 점을 그립니다!'
      },
      chogwa: {
        title: '🛷 38kg 초과인 수 (봅슬레이 경기 썰매 무게)',
        minVal: 38, maxVal: null,
        minType: 'open',
        scaleMin: 34, scaleMax: 44,
        explain: '💡 <strong>38 초과</strong>는 <strong>38은 쏙 빠지고</strong> 38보다 큰 모든 수입니다.<br>수직선 38 위치에 <strong style="color:#e11d48;">○ (속이 빈 동그라미)</strong>를 찍고 오른쪽으로 화살표를 긋습니다.',
        testCards: [36, 37, 38, 39, 41],
        audioKey: 'range_chogwa',
        voice: '38 초과는 38은 빠지고 38보다 큰 수입니다. 38에 속이 빈 동그라미를 그립니다!'
      },
      miman: {
        title: '❄️ 30℃ 미만인 수 (시원한 권장 기온)',
        minVal: null, maxVal: 30,
        maxType: 'open',
        scaleMin: 25, scaleMax: 35,
        explain: '💡 <strong>30 미만</strong>은 <strong>30은 쏙 빠지고</strong> 30보다 작은 모든 수입니다.<br>수직선 30 위치에 <strong style="color:#e11d48;">○ (속이 빈 동그라미)</strong>를 찍고 왼쪽으로 화살표를 긋습니다.',
        testCards: [27, 29, 30, 31, 33],
        audioKey: 'range_miman',
        voice: '30 미만은 30은 빠지고 30보다 작은 수입니다. 30에 속이 빈 동그라미를 그립니다!'
      },
      combine1: {
        title: '👕 125 이상 135 미만 (민수의 티셔츠 권장 치수)',
        minVal: 125, maxVal: 135,
        minType: 'closed', maxType: 'open',
        scaleMin: 120, scaleMax: 140,
        explain: '💡 <strong>125 이상 135 미만</strong>: 125는 포함되므로 <strong style="color:#0284c7;">● (채운 점)</strong>, 135는 제외되므로 <strong style="color:#e11d48;">○ (빈 점)</strong>으로 표시하고 두 점 사이를 색칠합니다!',
        testCards: [124, 125, 130, 134, 135, 136],
        audioKey: 'range_combine1',
        voice: '125 이상 135 미만은 125에는 채운 점, 135에는 빈 점을 그리고 사이를 연결합니다!'
      },
      combine2: {
        title: '🏋️ 60 초과 70 이하 (역도 체급 경기 범위)',
        minVal: 60, maxVal: 70,
        minType: 'open', maxType: 'closed',
        scaleMin: 55, scaleMax: 75,
        explain: '💡 <strong>60 초과 70 이하</strong>: 60은 제외되므로 <strong style="color:#e11d48;">○ (빈 점)</strong>, 70은 포함되므로 <strong style="color:#0284c7;">● (채운 점)</strong>으로 표시하고 두 점 사이를 색칠합니다!',
        testCards: [58, 60, 65, 70, 71],
        audioKey: 'range_combine2',
        voice: '60 초과 70 이하는 60에는 빈 점, 70에는 채운 점을 그리고 사이를 연결합니다!'
      }
    };

    let currentRangeKey = 'iseong';

    function selectRangePreset(key, shouldSpeak = true) {
      currentRangeKey = key;
      document.querySelectorAll('#rangePresets .range-preset-btn').forEach(b => b.classList.remove('active'));
      const found = document.querySelector(`#rangePresets button[onclick*="'${key}'"]`);
      if (found) found.classList.add('active');

      const data = RANGE_PRESETS[key];
      document.getElementById('rangeDisplayTitle').innerHTML = data.title;
      document.getElementById('rangeExplainText').innerHTML = data.explain;
      document.getElementById('testResultFeedback').innerHTML = '';

      renderNumberLineSvg(data);
      renderTestCards(data);

      if (shouldSpeak) {
        playUnitAudio(data.audioKey, data.voice);
      }
    }

    function renderNumberLineSvg(data) {
      const svg = document.getElementById('numberLineSvg');
      const sMin = data.scaleMin;
      const sMax = data.scaleMax;
      const width = 600;
      const leftPad = 50;
      const rightPad = 550;
      const usableW = rightPad - leftPad;
      const yLine = 60;

      const valToX = (v) => leftPad + ((v - sMin) / (sMax - sMin)) * usableW;

      let svgHtml = `
        <line x1="${leftPad - 20}" y1="${yLine}" x2="${rightPad + 20}" y2="${yLine}" stroke="#64748b" stroke-width="4" stroke-linecap="round"/>
        <polygon points="${leftPad - 25},${yLine} ${leftPad - 15},${yLine - 6} ${leftPad - 15},${yLine + 6}" fill="#64748b"/>
        <polygon points="${rightPad + 25},${yLine} ${rightPad + 15},${yLine - 6} ${rightPad + 15},${yLine + 6}" fill="#64748b"/>
      `;

      for (let v = sMin; v <= sMax; v++) {
        const x = valToX(v);
        svgHtml += `
          <line x1="${x}" y1="${yLine - 8}" x2="${x}" y2="${yLine + 8}" stroke="#94a3b8" stroke-width="2"/>
          <text x="${x}" y="${yLine + 26}" text-anchor="middle" font-family="Jua" font-size="14" fill="#64748b">${v}</text>
        `;
      }

      if (data.minVal !== null && data.maxVal !== null) {
        const x1 = valToX(data.minVal);
        const x2 = valToX(data.maxVal);
        svgHtml += `<line x1="${x1}" y1="${yLine}" x2="${x2}" y2="${yLine}" stroke="#0284c7" stroke-width="8" opacity="0.8"/>`;
      } else if (data.minVal !== null) {
        const x1 = valToX(data.minVal);
        svgHtml += `
          <line x1="${x1}" y1="${yLine}" x2="${rightPad + 15}" y2="${yLine}" stroke="#0284c7" stroke-width="8" opacity="0.8"/>
          <polygon points="${rightPad + 22},${yLine} ${rightPad + 10},${yLine - 8} ${rightPad + 10},${yLine + 8}" fill="#0284c7"/>
        `;
      } else if (data.maxVal !== null) {
        const x2 = valToX(data.maxVal);
        svgHtml += `
          <line x1="${x2}" y1="${yLine}" x2="${leftPad - 15}" y2="${yLine}" stroke="#0284c7" stroke-width="8" opacity="0.8"/>
          <polygon points="${leftPad - 22},${yLine} ${leftPad - 10},${yLine - 8} ${leftPad - 10},${yLine + 8}" fill="#0284c7"/>
        `;
      }

      if (data.minVal !== null) {
        const x = valToX(data.minVal);
        const isClosed = data.minType === 'closed';
        svgHtml += `
          <circle cx="${x}" cy="${yLine}" r="9" fill="${isClosed ? '#0284c7' : '#ffffff'}" stroke="#0284c7" stroke-width="3.5" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.2))"/>
          <text x="${x}" y="${yLine - 14}" text-anchor="middle" font-family="Jua" font-size="13" fill="${isClosed ? '#0284c7' : '#e11d48'}" font-weight="bold">
            ${data.minVal} (${isClosed ? '●포함' : '○제외'})
          </text>
        `;
      }

      if (data.maxVal !== null) {
        const x = valToX(data.maxVal);
        const isClosed = data.maxType === 'closed';
        svgHtml += `
          <circle cx="${x}" cy="${yLine}" r="9" fill="${isClosed ? '#0284c7' : '#ffffff'}" stroke="#0284c7" stroke-width="3.5" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.2))"/>
          <text x="${x}" y="${yLine - 14}" text-anchor="middle" font-family="Jua" font-size="13" fill="${isClosed ? '#0284c7' : '#e11d48'}" font-weight="bold">
            ${data.maxVal} (${isClosed ? '●포함' : '○제외'})
          </text>
        `;
      }

      svg.innerHTML = svgHtml;
    }

    function renderTestCards(data) {
      const container = document.getElementById('testNumberButtons');
      container.innerHTML = '';
      data.testCards.forEach(num => {
        const btn = document.createElement('button');
        btn.className = 'test-num-card';
        btn.textContent = `숫자 ${num}`;
        btn.onclick = () => testNumberInclusion(num, data);
        container.appendChild(btn);
      });
    }

    function testNumberInclusion(num, data) {
      let isIncluded = false;
      let reason = '';

      if (data.minVal !== null && data.maxVal !== null) {
        const minOk = data.minType === 'closed' ? num >= data.minVal : num > data.minVal;
        const maxOk = data.maxType === 'closed' ? num <= data.maxVal : num < data.maxVal;
        isIncluded = minOk && maxOk;
        reason = isIncluded 
          ? `🎉 숫자 ${num}은(는) [${data.minVal} ~ ${data.maxVal}] 범위 안에 쏙 들어갑니다! (O)`
          : `❌ 숫자 ${num}은(는) 범위를 벗어납니다. (X)`;
      } else if (data.minVal !== null) {
        isIncluded = data.minType === 'closed' ? num >= data.minVal : num > data.minVal;
        if (num === data.minVal) {
          reason = data.minType === 'closed'
            ? `🎉 <strong>${num}</strong>은(는) <strong>'이상'</strong>이므로 <strong>포함됩니다! (O)</strong>`
            : `❌ <strong>${num}</strong>은(는) <strong>'초과'</strong>이므로 <strong>제외됩니다! (X)</strong>`;
        } else {
          reason = isIncluded ? `🎉 숫자 ${num}은(는) 범위에 포함됩니다! (O)` : `❌ 숫자 ${num}은(는) 범위에 포함되지 않습니다! (X)`;
        }
      } else if (data.maxVal !== null) {
        isIncluded = data.maxType === 'closed' ? num <= data.maxVal : num < data.maxVal;
        if (num === data.maxVal) {
          reason = data.maxType === 'closed'
            ? `🎉 <strong>${num}</strong>은(는) <strong>'이하'</strong>이므로 <strong>포함됩니다! (O)</strong>`
            : `❌ <strong>${num}</strong>은(는) <strong>'미만'</strong>이므로 <strong>제외됩니다! (X)</strong>`;
        } else {
          reason = isIncluded ? `🎉 숫자 ${num}은(는) 범위에 포함됩니다! (O)` : `❌ 숫자 ${num}은(는) 범위에 포함되지 않습니다! (X)`;
        }
      }

      const fb = document.getElementById('testResultFeedback');
      fb.innerHTML = `<span style="color:${isIncluded ? '#10b981' : '#ef4444'};">${reason}</span>`;

      playUnitAudio(isIncluded ? 'test_in' : 'test_out', isIncluded ? '축하합니다! 범위 안에 쏙 들어갑니다!' : '아쉬워요! 범위를 벗어납니다!');
    }

    /* ========================================================
       2. 미끄럼틀 언덕 반올림 시뮬레이터 로직
       ======================================================== */
    let currentScope = 'tens';
    let currentSelectedDigit = 8;

    const SCOPE_CONFIG = {
      tens: {
        title: '🔍 예시 수: <strong>22<span style="color:#ef4444; text-decoration:underline;">8</span></strong> (관찰할 일의 자리)',
        sub: '구하려는 자리가 <strong>십의 자리</strong>이므로, 바로 아래 <strong>일의 자리 숫자</strong>를 관찰해요!',
        baseVal: 220,
        factor: 10
      },
      hundreds: {
        title: '🔍 예시 수: <strong>2<span style="color:#ef4444; text-decoration:underline;">2</span>8</strong> (관찰할 십의 자리)',
        sub: '구하려는 자리가 <strong>백의 자리</strong>이므로, 바로 아래 <strong>십의 자리 숫자</strong>를 관찰해요!',
        baseVal: 200,
        factor: 100
      },
      thousands: {
        title: '🔍 예시 수: <strong>24,<span style="color:#ef4444; text-decoration:underline;">6</span>82</strong> (관찰할 백의 자리)',
        sub: '구하려는 자리가 <strong>천의 자리</strong>이므로, 바로 아래 <strong>백의 자리 숫자</strong>를 관찰해요!',
        baseVal: 24000,
        factor: 1000
      },
      decimal1: {
        title: '🔍 예시 수: <strong>3.7<span style="color:#ef4444; text-decoration:underline;">4</span></strong> (관찰할 소수 둘째 자리)',
        sub: '구하려는 자리가 <strong>소수 첫째 자리</strong>이므로, 바로 아래 <strong>소수 둘째 자리</strong>를 관찰해요!',
        baseVal: 3.7,
        factor: 0.1
      }
    };

