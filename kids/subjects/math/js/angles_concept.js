
  window.currentSubject = "수학"; // 🚨 전역 과목명 명시
    // 1. 반원 각도기 시뮬레이터
    let currentAngle = 90;

    function setAngleValue(deg, btn) {
      currentAngle = parseInt(deg);
      document.getElementById('angleSlider').value = currentAngle;
      document.querySelectorAll('#angle-preset-buttons .candy-num-btn').forEach(b => b.classList.remove('active'));
      if (btn) btn.classList.add('active');
      renderProtractorVisuals(btn !== null);
    }

    function onSliderAngleChange(val) {
      currentAngle = parseInt(val);
      document.querySelectorAll('#angle-preset-buttons .candy-num-btn').forEach(b => b.classList.remove('active'));
      renderProtractorVisuals(false);
    }

    function renderProtractorVisuals(shouldSpeak = false) {
      const deg = currentAngle;
      const wrap = document.getElementById('protractor-svg-wrap');
      const cx = 200, cy = 180, r = 150;

      // 각도 회전 끝점 (0도는 오른쪽 수평 x=cx+r, y=cy)
      const rad = (deg * Math.PI) / 180;
      const x2 = cx + r * Math.cos(rad);
      const y2 = cy - r * Math.sin(rad);

      // 각도 부채꼴 호
      const arcR = 50;
      const arcX = cx + arcR * Math.cos(rad);
      const arcY = cy - arcR * Math.sin(rad);
      const largeArc = deg > 180 ? 1 : 0;

      wrap.innerHTML = `
        <svg viewBox="0 0 400 220">
          <defs>
            <linearGradient id="protractorGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#bae6fd" stop-opacity="0.85"/>
              <stop offset="100%" stop-color="#7dd3fc" stop-opacity="0.95"/>
            </linearGradient>
          </defs>

          <!-- 반원 각도기 본체 -->
          <path d="M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy} Z" fill="url(#protractorGrad)" stroke="#0284c7" stroke-width="3"/>
          <path d="M ${cx - 35} ${cy} A 35 35 0 0 1 ${cx + 35} ${cy} Z" fill="#fff" stroke="#0284c7" stroke-width="2"/>

          <!-- 각도기 눈금 (10도 단위) -->
          ${Array.from({length: 19}).map((_, i) => {
            const a = i * 10;
            const aRad = (a * Math.PI) / 180;
            const xInner = cx + (r - (a % 30 === 0 ? 20 : 10)) * Math.cos(aRad);
            const yInner = cy - (r - (a % 30 === 0 ? 20 : 10)) * Math.sin(aRad);
            const xOuter = cx + r * Math.cos(aRad);
            const yOuter = cy - r * Math.sin(aRad);
            let textTag = '';
            if (a % 30 === 0 && a > 0 && a < 180) {
              const xText = cx + (r - 30) * Math.cos(aRad);
              const yText = cy - (r - 30) * Math.sin(aRad) + 4;
              textTag = `<text x="${xText}" y="${yText}" font-family="Jua" font-size="11" fill="#0369a1" text-anchor="middle">${a}°</text>`;
            }
            return `<line x1="${xInner}" y1="${yInner}" x2="${xOuter}" y2="${yOuter}" stroke="#0369a1" stroke-width="${a % 30 === 0 ? 2 : 1}"/>${textTag}`;
          }).join('')}

          <!-- 밑금 (기준선 0도) -->
          <line x1="${cx - r}" y1="${cy}" x2="${cx + r}" y2="${cy}" stroke="#0f172a" stroke-width="3"/>
          <circle cx="${cx}" cy="${cy}" r="4" fill="#e11d48"/>

          <!-- 회전하는 각 변 (빨간 레이저 선) -->
          <line x1="${cx}" y1="${cy}" x2="${x2}" y2="${y2}" stroke="#e11d48" stroke-width="4" stroke-linecap="round"/>

          <!-- 각도 부채꼴 영역 -->
          ${deg > 0 ? `<path d="M ${cx} ${cy} L ${cx + arcR} ${cy} A ${arcR} ${arcR} 0 ${largeArc} 0 ${arcX} ${arcY} Z" fill="#f43f5e" opacity="0.35"/>` : ''}

          <!-- 꼭짓점 텍스트 -->
          <text x="${cx}" y="${cy + 22}" font-family="Jua" font-size="13" fill="#64748b" text-anchor="middle">각도기 중심 (꼭짓점)</text>
        </svg>
      `;

      let typeHtml = '';
      let typeVoice = '';
      if (deg === 90) {
        typeHtml = '<span class="angle-type-tag tag-right">📐 직각 (정확히 90°)</span>';
        typeVoice = '정확히 90도인 직각입니다!';
      } else if (deg > 0 && deg < 90) {
        typeHtml = '<span class="angle-type-tag tag-acute">⚡ 예각 (0° 초과 ~ 90° 미만)</span>';
        typeVoice = `${deg}도로, 직각보다 작은 예각입니다!`;
      } else if (deg > 90 && deg < 180) {
        typeHtml = '<span class="angle-type-tag tag-obtuse">🪭 둔각 (90° 초과 ~ 180° 미만)</span>';
        typeVoice = `${deg}도로, 직각보다 큰 둔각입니다!`;
      } else if (deg === 180) {
        typeHtml = '<span class="angle-type-tag tag-straight">📏 평각 (일직선 180°)</span>';
        typeVoice = '180도 일직선인 평각입니다!';
      } else {
        typeHtml = '<span class="angle-type-tag" style="background:#e2e8f0;">0° (벌어지지 않음)</span>';
        typeVoice = '0도입니다.';
      }

      document.getElementById('angleResultText').innerHTML = `${deg}° ${typeHtml}`;

      if (shouldSpeak && typeof fairySpeak === 'function') {
        fairySpeak(`현재 각도는 ${deg}도이며, ${typeVoice}`);
      }
    }

    function speakCurrentAngle() {
      renderProtractorVisuals(true);
    }

    // 2. 각의 4대 분류 카드
    const ANGLE_TYPES = {
      acute: {
        deg: 45,
        title: '⚡ 예각 (Acute Angle) : 0°보다 크고 90°보다 작은 뾰족한 각',
        desc: '<div>• 가위를 살짝 벌렸을 때의 날카로운 모서리 각도예요! (예: 30°, 45°, 60°, 80°)</div>',
        voice: '예각은 0도보다 크고 90도보다 작은 뾰족한 각입니다!'
      },
      right: {
        deg: 90,
        title: '📐 직각 (Right Angle) : 정확히 90°인 각',
        desc: '<div>• 삼각자의 직각 모서리, 교과서 모서리, 시계 3시 정각의 바늘 모양이에요!</div>',
        voice: '직각은 정확히 90도인 각입니다!'
      },
      obtuse: {
        deg: 135,
        title: '🪭 둔각 (Obtuse Angle) : 90°보다 크고 180°보다 작은 펑퍼짐한 각',
        desc: '<div>• 부채를 넓게 펼쳤을 때나 미끄럼틀 계단의 완만한 경사 각도예요! (예: 100°, 120°, 150°)</div>',
        voice: '둔각은 90도보다 크고 180도보다 작은 넓은 각입니다!'
      },
      straight: {
        deg: 180,
        title: '📏 평각 (Straight Angle) : 일직선으로 쫙 펴진 180°',
        desc: '<div>• 시계 6시 정각의 바늘처럼 일직선으로 곧게 펴진 각이에요! (직각 2개가 모인 크기)</div>',
        voice: '평각은 일직선으로 펼쳐진 180도인 각입니다!'
      }
    };

    function selectAngleType(key, btn) {
      document.querySelectorAll('#section-angle-types .angle-btn-card').forEach(b => b.classList.remove('active'));
      if (btn) btn.classList.add('active');

      const t = ANGLE_TYPES[key];
      document.getElementById('angleTypeDetailBox').innerHTML = `
        <div><strong>${t.title}</strong></div>
        ${t.desc}
      `;
      setAngleValue(t.deg, null);

      if (btn && typeof fairySpeak === 'function') {
        fairySpeak(t.voice);
      }
    }

    // 3. 다각형 각의 합 동적 인터랙티브 (삼각형 180° & 사각형 360°)
    let curPolygonType = 'triangle'; // 'triangle' | 'quad'
    let curQuadMethod = 'corners';   // 'corners' | 'diagonal'
    let triCutState = 'original';    // 'original' | 'merged'
    let quadCutState = 'original';   // 'original' | 'merged'
    let quadSplitState = false;      // false | true

    function switchPolygonSum(type, shouldVoice = true) {
      curPolygonType = type;
      document.getElementById('btnPolyTri').classList.toggle('active', type === 'triangle');
      document.getElementById('btnPolyQuad').classList.toggle('active', type === 'quad');
      document.getElementById('quadMethodSubBar').style.display = type === 'quad' ? 'flex' : 'none';

      renderPolygonInteractive(shouldVoice);
    }

    function setQuadMethod(method) {
      curQuadMethod = method;
      document.getElementById('btnQuadM1').classList.toggle('active', method === 'corners');
      document.getElementById('btnQuadM2').classList.toggle('active', method === 'diagonal');

      renderPolygonInteractive(true);
    }

    function setTriCutState(state) {
      triCutState = state;
      renderPolygonInteractive(true);
    }

    function setQuadCutState(state) {
      quadCutState = state;
      renderPolygonInteractive(true);
    }

    function setQuadSplit(split) {
      quadSplitState = split;
      renderPolygonInteractive(true);
    }

    function renderPolygonInteractive(shouldVoice = false) {
      const sWrap = document.getElementById('polygonSvgWrap');
      const cBtns = document.getElementById('polygonControlButtons');
      const fText = document.getElementById('polygonFormulaText');
      const dText = document.getElementById('polygonDescText');

      if (curPolygonType === 'triangle') {
        // ------------------ 🔺 삼각형 세 각의 합 (180°) ------------------
        cBtns.innerHTML = `
          <button class="ctrl-btn ${triCutState === 'merged' ? 'active' : ''}" onclick="setTriCutState('merged')">✂️ 세 모퉁이 잘라서 모으기 (180° 일직선 마법)</button>
          <button class="ctrl-btn ${triCutState === 'original' ? 'active' : ''}" onclick="setTriCutState('original')">🔄 원래 삼각형으로</button>
        `;

        if (triCutState === 'original') {
          sWrap.innerHTML = `
            <svg viewBox="0 0 320 200" style="max-width:340px;">
              <!-- 삼각형 본체 -->
              <polygon points="160,30 50,165 270,165" fill="#fdf2f8" stroke="#ec4899" stroke-width="3"/>
              
              <!-- 3개 모퉁이 부채꼴 각 -->
              <!-- 꼭짓점 A (위 50도 - 핑크) -->
              <path d="M 160 30 L 140 70 A 45 45 0 0 0 180 70 Z" fill="#ec4899" opacity="0.8"/>
              <text x="160" y="58" font-family="Jua" font-size="14" fill="#fff" text-anchor="middle">50°</text>

              <!-- 꼭짓점 B (왼쪽 60도 - 주황) -->
              <path d="M 50 165 L 95 165 A 45 45 0 0 0 72 125 Z" fill="#f97316" opacity="0.85"/>
              <text x="68" y="155" font-family="Jua" font-size="14" fill="#fff">60°</text>

              <!-- 꼭짓점 C (오른쪽 70도 - 파랑) -->
              <path d="M 270 165 L 248 125 A 45 45 0 0 0 225 165 Z" fill="#0284c7" opacity="0.85"/>
              <text x="250" y="155" font-family="Jua" font-size="14" fill="#fff" text-anchor="end">70°</text>
            </svg>
          `;
          fText.textContent = "60° + 50° + 70° = 180° (삼각형의 합은 항상 180°!)";
          dText.innerHTML = `
            <div>💡 <strong>삼각형 모퉁이 관찰:</strong></div>
            <div>• 세 각의 크기가 각각 <strong>60°, 50°, 70°</strong>인 삼각형입니다.</div>
            <div>• 상단의 [✂️ 세 모퉁이 잘라서 모으기] 버튼을 눌러 일직선(180°)이 되는 마법을 확인하세요!</div>
          `;
          if (shouldVoice && typeof fairySpeak === 'function') fairySpeak('삼각형의 세 모퉁이를 잘라서 모아보세요!');
        } else {
          // 세 모퉁이 모인 180도 반원 상태
          sWrap.innerHTML = `
            <svg viewBox="0 0 320 200" style="max-width:340px;">
              <!-- 일직선 수평 기준선 (180도 평각) -->
              <line x1="20" y1="160" x2="300" y2="160" stroke="#0f172a" stroke-width="3"/>
              
              <!-- 모퉁이 조각 3개가 모여 완벽한 반원 형성 (cx=160, cy=160, r=85) -->
              <!-- 조각 1: 70도 (파랑: 110도 ~ 180도 - 왼쪽) -->
              <path d="M 160 160 L 75 160 A 85 85 0 0 1 131 80 Z" fill="#0284c7" stroke="#fff" stroke-width="2"/>
              <text x="110" y="135" font-family="Jua" font-size="16" fill="#fff" text-anchor="middle">70°</text>

              <!-- 조각 2: 50도 (핑크: 60도 ~ 110도 - 중앙) -->
              <path d="M 160 160 L 131 80 A 85 85 0 0 1 202 86 Z" fill="#ec4899" stroke="#fff" stroke-width="2"/>
              <text x="160" y="115" font-family="Jua" font-size="16" fill="#fff" text-anchor="middle">50°</text>

              <!-- 조각 3: 60도 (주황: 0도 ~ 60도 - 오른쪽) -->
              <path d="M 160 160 L 202 86 A 85 85 0 0 1 245 160 Z" fill="#f97316" stroke="#fff" stroke-width="2"/>
              <text x="205" y="135" font-family="Jua" font-size="16" fill="#fff" text-anchor="middle">60°</text>

              <!-- 중심점 -->
              <circle cx="160" cy="160" r="5" fill="#e11d48"/>
              <text x="160" y="185" font-family="Jua" font-size="14" fill="#0369a1" text-anchor="middle">✨ 세 모퉁이가 모여 완벽한 일직선 평각 (180°)!</text>
            </svg>
          `;
          fText.innerHTML = `<span style="color:#059669;">🎉 60° + 50° + 70° = 180° (완벽한 일직선 평각 180° 완성!)</span>`;
          dText.innerHTML = `
            <div>💡 <strong>180° 일직선 증명 성공!</strong></div>
            <div>• 세 꼭짓점을 잘라 한 점에 모았더니 빈틈없이 완벽한 <strong>일직선 평각(180°)</strong>이 되었습니다!</div>
            <div>• 세상의 모든 삼각형은 모양과 상관없이 세 각의 합이 항상 <strong>180°</strong>입니다.</div>
          `;
          if (shouldVoice && typeof fairySpeak === 'function') fairySpeak('와! 세 모퉁이가 모여 완벽한 180도 일직선이 되었습니다!');
        }

      } else {
        // ------------------ 🔷 사각형 네 각의 합 (360°) ------------------
        if (curQuadMethod === 'corners') {
          // 방법 1: 4개 모퉁이 모아 360도 원 만들기
          cBtns.innerHTML = `
            <button class="ctrl-btn ${quadCutState === 'merged' ? 'active' : ''}" onclick="setQuadCutState('merged')">✂️ 4개 모퉁이 모으기 (360° 원 마법)</button>
            <button class="ctrl-btn ${quadCutState === 'original' ? 'active' : ''}" onclick="setQuadCutState('original')">🔄 원래 사각형으로</button>
          `;

          if (quadCutState === 'original') {
            sWrap.innerHTML = `
              <svg viewBox="0 0 320 200" style="max-width:340px;">
                <!-- 사각형 본체 -->
                <polygon points="60,165 260,165 225,45 85,45" fill="#eff6ff" stroke="#2563eb" stroke-width="3"/>
                
                <!-- 4개 모퉁이 부채꼴 (85°, 95°, 100°, 80°) -->
                <!-- A (좌상 95° - 핑크) -->
                <path d="M 85 45 L 125 45 A 40 40 0 0 1 75 80 Z" fill="#ec4899" opacity="0.85"/>
                <text x="96" y="65" font-family="Jua" font-size="12" fill="#fff">95°</text>

                <!-- B (우상 85° - 파랑) -->
                <path d="M 225 45 L 235 80 A 40 40 0 0 1 185 45 Z" fill="#0284c7" opacity="0.85"/>
                <text x="212" y="65" font-family="Jua" font-size="12" fill="#fff">85°</text>

                <!-- C (우하 100° - 주황) -->
                <path d="M 260 165 L 220 165 A 40 40 0 0 1 250 130 Z" fill="#f97316" opacity="0.85"/>
                <text x="240" y="155" font-family="Jua" font-size="12" fill="#fff">100°</text>

                <!-- D (좌하 80° - 초록) -->
                <path d="M 60 165 L 70 130 A 40 40 0 0 1 100 165 Z" fill="#10b981" opacity="0.85"/>
                <text x="75" y="155" font-family="Jua" font-size="12" fill="#fff">80°</text>
              </svg>
            `;
            fText.textContent = "95° + 85° + 100° + 80° = 360° (네 각의 합은 360°!)";
            dText.innerHTML = `
              <div>💡 <strong>방법 1 : 4개 모퉁이 모으기 원리</strong></div>
              <div>• 사각형의 네 모퉁이를 잘라서 한 점에 둥글게 모으면 ➔ <strong>완벽한 360° 원</strong>이 됩니다!</div>
              <div>• 상단의 [✂️ 4개 모퉁이 모으기] 버튼을 눌러 원이 완성되는 마법을 확인하세요!</div>
            `;
            if (shouldVoice && typeof fairySpeak === 'function') fairySpeak('사각형의 네 모퉁이를 모으면 360도 원이 됩니다!');
          } else {
            // 4개 모퉁이가 모여 완벽한 360도 원 형성
            sWrap.innerHTML = `
              <svg viewBox="0 0 320 200" style="max-width:340px;">
                <!-- 4개 부채꼴이 모인 원 (cx=160, cy=100, r=70) -->
                <!-- 조각 1: 95도 핑크 (0 ~ 95) -->
                <path d="M 160 100 L 230 100 A 70 70 0 0 1 154 170 Z" fill="#ec4899" stroke="#fff" stroke-width="2"/>
                <text x="185" y="135" font-family="Jua" font-size="15" fill="#fff">95°</text>

                <!-- 조각 2: 85도 파랑 (95 ~ 180) -->
                <path d="M 160 100 L 154 170 A 70 70 0 0 1 90 100 Z" fill="#0284c7" stroke="#fff" stroke-width="2"/>
                <text x="130" y="135" font-family="Jua" font-size="15" fill="#fff">85°</text>

                <!-- 조각 3: 100도 주황 (180 ~ 280) -->
                <path d="M 160 100 L 90 100 A 70 70 0 0 1 172 31 Z" fill="#f97316" stroke="#fff" stroke-width="2"/>
                <text x="130" y="70" font-family="Jua" font-size="15" fill="#fff">100°</text>

                <!-- 조각 4: 80도 초록 (280 ~ 360) -->
                <path d="M 160 100 L 172 31 A 70 70 0 0 1 230 100 Z" fill="#10b981" stroke="#fff" stroke-width="2"/>
                <text x="185" y="70" font-family="Jua" font-size="15" fill="#fff">80°</text>

                <!-- 중심점 -->
                <circle cx="160" cy="100" r="5" fill="#1e1b4b"/>
                <text x="160" y="190" font-family="Jua" font-size="14" fill="#1d4ed8" text-anchor="middle">✨ 네 모퉁이가 모여 완벽한 360° 원 완성!</text>
              </svg>
            `;
            fText.innerHTML = `<span style="color:#2563eb;">🎉 95° + 85° + 100° + 80° = 360° (한 바퀴 360° 원 완성!)</span>`;
            dText.innerHTML = `
              <div>💡 <strong>360° 원 증명 성공!</strong></div>
              <div>• 사각형의 네 꼭짓점을 잘라 한 점에 모았더니 빈틈없이 완벽한 <strong>360° 원(한 바퀴)</strong>이 되었습니다!</div>
            `;
            if (shouldVoice && typeof fairySpeak === 'function') fairySpeak('와! 네 모퉁이가 모여 완벽한 360도 원이 되었습니다!');
          }

        } else {
          // 방법 2: 대각선으로 삼각형 2개 쪼개기 (180° + 180°)
          cBtns.innerHTML = `
            <button class="ctrl-btn ${quadSplitState ? 'active' : ''}" onclick="setQuadSplit(true)">✂️ 대각선으로 삼각형 2개 쪼개기 (분리!)</button>
            <button class="ctrl-btn ${!quadSplitState ? 'active' : ''}" onclick="setQuadSplit(false)">🔄 사각형으로 합치기</button>
          `;

          if (!quadSplitState) {
            sWrap.innerHTML = `
              <svg viewBox="0 0 320 200" style="max-width:340px;">
                <polygon points="60,160 260,160 225,45 85,45" fill="#eff6ff" stroke="#2563eb" stroke-width="3"/>
                <!-- 대각선 점선 -->
                <line x1="85" y1="45" x2="260" y2="160" stroke="#e11d48" stroke-width="3" stroke-dasharray="5"/>
                <text x="160" y="115" font-family="Jua" font-size="15" fill="#e11d48" text-anchor="middle">대각선</text>
              </svg>
            `;
            fText.textContent = "180° × 2 = 360° (대각선을 그으면 삼각형 2개!)";
            dText.innerHTML = `
              <div>💡 <strong>방법 2 : 대각선 분할의 원리</strong></div>
              <div>• 사각형의 마주보는 꼭짓점을 잇는 <strong>대각선</strong>을 1개 그으면 ➔ <strong>삼각형 2개</strong>로 쪼개집니다.</div>
              <div>• [✂️ 대각선으로 삼각형 2개 쪼개기] 버튼을 눌러 두 삼각형이 분리되는 모습을 확인하세요!</div>
            `;
            if (shouldVoice && typeof fairySpeak === 'function') fairySpeak('대각선으로 쪼개면 삼각형 2개가 됩니다!');
          } else {
            // 두 삼각형이 살짝 분리된 모습
            sWrap.innerHTML = `
              <svg viewBox="0 0 320 200" style="max-width:340px;">
                <!-- 위쪽 삼각형 (핑크) -->
                <polygon points="85,35 225,35 255,145" fill="#fdf2f8" stroke="#ec4899" stroke-width="3"/>
                <text x="165" y="75" font-family="Jua" font-size="15" fill="#be185d" text-anchor="middle">삼각형 ① (180°)</text>

                <!-- 아래쪽 삼각형 (하늘) -->
                <polygon points="60,170 260,170 90,60" fill="#eff6ff" stroke="#0284c7" stroke-width="3"/>
                <text x="155" y="145" font-family="Jua" font-size="15" fill="#0369a1" text-anchor="middle">삼각형 ② (180°)</text>
              </svg>
            `;
            fText.innerHTML = `<span style="color:#0284c7;">🎉 180°(삼각형①) + 180°(삼각형②) = 360°!</span>`;
            dText.innerHTML = `
              <div>💡 <strong>삼각형 2개 분할 증명 완료!</strong></div>
              <div>• 사각형은 항상 <strong>삼각형 2개</strong>로 쪼개집니다.</div>
              <div>• 삼각형 1개의 세 각의 합이 <strong>180°</strong>이므로, <strong>180° × 2 = 360°</strong>가 됩니다!</div>
            `;
            if (shouldVoice && typeof fairySpeak === 'function') fairySpeak('삼각형 두 개의 합인 180도 더하기 180도는 360도입니다!');
          }
        }
      }
    }

    // 4. 🎲 실전 미지의 각 찾기 도전
    let currentMissingAngleProblem = { a: 60, b: 70, ans: 50 };

    function generateMissingAngleProblem(speak = false) {
      const a = (Math.floor(Math.random() * 8) + 3) * 10; // 30 ~ 100
      const b = (Math.floor(Math.random() * 6) + 3) * 10; // 30 ~ 80
      const remain = 180 - (a + b);
      if (remain <= 10) return generateMissingAngleProblem(speak);

      currentMissingAngleProblem = { a, b, ans: remain };

      const wrap = document.getElementById('missingAngleSvgWrap');
      wrap.innerHTML = `
        <svg viewBox="0 0 280 140" style="max-width:260px;">
          <polygon points="40,120 240,120 140,25" fill="#fdf2f8" stroke="#ec4899" stroke-width="3"/>
          <text x="140" y="48" font-family="Jua" font-size="18" fill="#e11d48" font-weight="bold" text-anchor="middle">?°</text>
          <text x="65" y="112" font-family="Jua" font-size="15" fill="#be185d">${a}°</text>
          <text x="215" y="112" font-family="Jua" font-size="15" fill="#be185d" text-anchor="end">${b}°</text>
        </svg>
      `;

      document.getElementById('missingAngleQuestionText').textContent = `삼각형의 두 각이 ${a}°, ${b}° 일 때, ? 의 각도는?`;

      const correctStr = `${remain}°`;
      const choicesSet = new Set([correctStr]);

      while (choicesSet.size < 4) {
        const fakeDiff = (Math.floor(Math.random() * 5) - 2) * 10;
        const fakeVal = Math.max(15, remain + (fakeDiff === 0 ? 20 : fakeDiff));
        choicesSet.add(`${fakeVal}°`);
      }

      const choicesArr = Array.from(choicesSet).sort(() => Math.random() - 0.5);
      const cBox = document.getElementById('missingAngleChoices');
      cBox.innerHTML = '';
      document.getElementById('missingAngleFeedback').innerHTML = '';

      choicesArr.forEach(c => {
        const btn = document.createElement('button');
        btn.className = 'candy-num-btn';
        btn.style.fontSize = '1.25rem';
        btn.style.width = '100%';
        btn.textContent = c;
        btn.onclick = () => checkMissingAngleAnswer(c, correctStr);
        cBox.appendChild(btn);
      });

      if (speak && typeof fairySpeak === 'function') {
        fairySpeak(`삼각형의 두 각이 ${a}도와 ${b}도입니다. 나머지 한 각을 계산해 보세요!`);
      }
    }

    function checkMissingAngleAnswer(selected, correct) {
      const fb = document.getElementById('missingAngleFeedback');
      const p = currentMissingAngleProblem;
      if (selected === correct) {
        fb.innerHTML = `<span style="color:#10b981;">🎉 대단해요! 180° - (${p.a}° + ${p.b}°) = <strong>${p.ans}°</strong> 정답!</span>`;
        if (typeof fairySpeak === 'function') fairySpeak(`정답이에요! 180도에서 두 각을 빼면 ${p.ans}도입니다!`);
        if (typeof grantRewardAndShowUI === 'function') grantRewardAndShowUI(1, false, 'math');
      } else {
        fb.innerHTML = `<span style="color:#ef4444;">😅 아쉬워요! 정답은 [${correct}] 이에요.</span>`;
        if (typeof fairySpeak === 'function') fairySpeak(`아쉬워요! 정답은 ${correct} 입니다.`);
      }
    }

    // 5. 퀴즈
    const QUIZ_LIST = [
      { q: "0°보다 크고 90°보다 작은 각을 무엇이라고 할까요?", ans: "예각", choices: ["예각", "직각", "둔각", "평각"] },
      { q: "정확히 90°인 각을 무엇이라고 부를까요?", ans: "직각", choices: ["직각", "예각", "둔각", "평각"] },
      { q: "90°보다 크고 180°보다 작은 각은?", ans: "둔각", choices: ["둔각", "직각", "예각", "평각"] },
      { q: "삼각형의 세 각의 크기의 합은 항상 몇 도일까요?", ans: "180°", choices: ["180°", "360°", "90°", "270°"] },
      { q: "사각형의 네 각의 크기의 합은 항상 몇 도일까요?", ans: "360°", choices: ["360°", "180°", "270°", "400°"] },
      { q: "삼각형의 두 각이 40°, 60°일 때, 나머지 한 각은?", ans: "80°", choices: ["80°", "90°", "70°", "100°"] }
    ];
    let qIdx = 0;

    function shuffleArray(arr) {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    }

    function renderQuiz() {
      const q = QUIZ_LIST[qIdx % QUIZ_LIST.length];
      document.getElementById('quiz-question').textContent = q.q;
      const cBox = document.getElementById('quiz-choices');
      cBox.innerHTML = '';
      document.getElementById('quiz-feedback').textContent = '';

      const shuffled = shuffleArray(q.choices);

      shuffled.forEach(c => {
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
        fb.innerHTML = `<span style="color:#10b981;">🎉 정답! 각도 마스터 박사님이시네요!</span>`;
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
      location.href = 'math.html#concepts';
    }

    document.addEventListener('DOMContentLoaded', () => {
      let currentProfile = localStorage.getItem('currentUser') || 'daughter';
      const name = currentProfile === 'son' ? '민수' : '민서';
      const icon = currentProfile === 'son' ? '👦' : '👧';
      const themeClass = currentProfile === 'daughter' ? 'theme--slime' : 'theme--arcade';
      document.body.className = themeClass;
      document.getElementById('userName').textContent = `${name} 대원`;
      document.getElementById('userIcon').textContent = icon;

      renderProtractorVisuals(false); // 초기 로딩 시 무발화
      switchPolygonSum('triangle', false); // 초기 로딩 시 무발화
      generateMissingAngleProblem(false); // 초기 로딩 시 무발화
      renderQuiz();

      if (typeof initFairyAudio === 'function') initFairyAudio();
      if (typeof initFairyChat === 'function') initFairyChat("MATH", "각도");
      if (typeof updateTtsToggleUi === 'function') updateTtsToggleUi();
    });
  