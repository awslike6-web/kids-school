
    let currentMode = 'heat'; // 'heat' or 'wind'
    let isLampOn = false;
    let sandTemp = 20.0;
    let waterTemp = 20.0;
    let heatTimer = null;

    let windTime = 'day'; // 'day' or 'night'
    let windAnimId = null;
    let smokeParticles = [];

    let gems = parseInt(localStorage.getItem('min_science_gems') || '0', 10);
    document.getElementById('gemCount').textContent = gems;

    // Web Audio
    let audioCtx = null;
    function getAudioContext() {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        return audioCtx;
    }
    function playTone(freq, type, duration) {
        const ctx = getAudioContext();
        if (!ctx) return;
        try {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, ctx.currentTime);
            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + duration);
        } catch(e) {}
    }

    // 모드 전환
    function switchLabMode(mode) {
        currentMode = mode;
        playTone(450, 'sine', 0.1);

        const tabHeat = document.getElementById('tabHeat');
        const tabWind = document.getElementById('tabWind');
        const heatStage = document.getElementById('heatStage');
        const convectionStage = document.getElementById('convectionStage');
        const heatControls = document.getElementById('heatControls');
        const windControls = document.getElementById('windControls');
        const subBadge = document.getElementById('subLabBadge');

        if (mode === 'heat') {
            tabHeat.classList.add('active');
            tabWind.classList.remove('active');
            heatStage.style.display = 'flex';
            convectionStage.style.display = 'none';
            heatControls.style.display = 'flex';
            windControls.style.display = 'none';
            subBadge.textContent = "실험 A : 전등 가열 모래 vs 물";
            document.getElementById('fairyBubble').innerHTML = "<span>🧚 코코: '[전등 켜기]를 누르면 모래와 물의 온도가 어떻게 변하는지 봐봐!'</span>";
            if (windAnimId) cancelAnimationFrame(windAnimId);
        } else {
            tabWind.classList.add('active');
            tabHeat.classList.remove('active');
            heatStage.style.display = 'none';
            convectionStage.style.display = 'flex';
            heatControls.style.display = 'none';
            windControls.style.display = 'flex';
            subBadge.textContent = "실험 B : 향 연기로 바람 관찰";
            document.getElementById('fairyBubble').innerHTML = "<span>🧚 코코: '가운데 향 연기가 어느 쪽으로 흘러가는지 잘 관찰해 봐!'</span>";
            startWindSimulation();
        }
    }

    // 전등 토글
    function toggleLamp() {
        isLampOn = !isLampOn;
        const beam = document.getElementById('lampBeam');
        const btn = document.getElementById('btnLamp');

        if (isLampOn) {
            playTone(600, 'sine', 0.2);
            beam.style.opacity = "1";
            btn.innerHTML = "🌙 전등 끄기 (밤이 됨)";
            btn.style.background = "#334155";
            btn.style.borderColor = "#64748b";

            // 가열 시작: 모래는 급상승, 물은 완만 상승
            startHeating();
            document.getElementById('fairyBubble').innerHTML = "<span>🧚 코코: '전등을 켜니까 <b>모래가 물보다 훨씬 빠르게</b> 뜨거워지고 있어!'</span>";
        } else {
            playTone(300, 'sine', 0.2);
            beam.style.opacity = "0";
            btn.innerHTML = "💡 전등 켜기 (낮의 햇빛)";
            btn.style.background = "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)";
            btn.style.borderColor = "#fbbf24";

            // 냉각 시작: 모래가 훨씬 빠르게 식음
            startCooling();
            document.getElementById('fairyBubble').innerHTML = "<span>🧚 코코: '전등을 끄니까 <b>모래가 물보다 훨씬 빠르게</b> 식고 있어!'</span>";
        }
    }

    function startHeating() {
        if (heatTimer) clearInterval(heatTimer);
        heatTimer = setInterval(() => {
            if (sandTemp < 34.0) sandTemp += 0.8;
            if (waterTemp < 24.5) waterTemp += 0.3;

            updateTemps();
            if (sandTemp >= 34.0) clearInterval(heatTimer);
        }, 150);
    }

    function startCooling() {
        if (heatTimer) clearInterval(heatTimer);
        heatTimer = setInterval(() => {
            if (sandTemp > 18.0) sandTemp -= 0.8;
            if (waterTemp > 21.0) waterTemp -= 0.2;

            updateTemps();
            if (sandTemp <= 18.0) clearInterval(heatTimer);
        }, 150);
    }

    function updateTemps() {
        document.getElementById('sandTemp').textContent = sandTemp.toFixed(1) + " °C";
        document.getElementById('waterTemp').textContent = waterTemp.toFixed(1) + " °C";

        const sandP = document.getElementById('sandPressure');
        const waterP = document.getElementById('waterPressure');

        if (sandTemp > waterTemp) {
            // 낮: 모래가 뜨거움(저기압), 물이 시원함(고기압)
            sandP.textContent = "저기압 (L) 🔥";
            sandP.style.background = "#78350f";
            sandP.style.color = "#fef08a";

            waterP.textContent = "고기압 (H) ❄️";
            waterP.style.background = "#0369a1";
            waterP.style.color = "#e0f2fe";
        } else if (sandTemp < waterTemp) {
            // 밤: 모래가 차가움(고기압), 물이 따뜻함(저기압)
            sandP.textContent = "고기압 (H) ❄️";
            sandP.style.background = "#0369a1";
            sandP.style.color = "#e0f2fe";

            waterP.textContent = "저기압 (L) 🔥";
            waterP.style.background = "#78350f";
            waterP.style.color = "#fef08a";
        } else {
            sandP.textContent = "기압: 보통";
            waterP.textContent = "기압: 보통";
        }
    }

    function resetHeat() {
        if (heatTimer) clearInterval(heatTimer);
        isLampOn = false;
        sandTemp = 20.0;
        waterTemp = 20.0;
        document.getElementById('lampBeam').style.opacity = "0";
        document.getElementById('btnLamp').innerHTML = "💡 전등 켜기 (낮의 햇빛)";
        document.getElementById('btnLamp').style.background = "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)";
        document.getElementById('btnLamp').style.borderColor = "#fbbf24";
        updateTemps();
        document.getElementById('fairyBubble').innerHTML = "<span>🧚 코코: '초기화 완료! [전등 켜기]를 눌러 실험을 다시 해봐!'</span>";
    }

    // [실험 B] 바람 방향 시뮬레이션
    function setWindTime(time) {
        windTime = time;
        playTone(500, 'sine', 0.15);

        const btnDay = document.getElementById('btnDayWind');
        const btnNight = document.getElementById('btnNightWind');
        const sandTag = document.getElementById('chamberSandTag');
        const waterTag = document.getElementById('chamberWaterTag');

        if (time === 'day') {
            btnDay.style.background = "#0284c7";
            btnDay.style.borderColor = "#38bdf8";
            btnDay.style.color = "white";
            btnNight.style.background = "#1a3258";
            btnNight.style.borderColor = "#2d5088";
            btnNight.style.color = "#94a3b8";

            sandTag.textContent = "🏖️ 따뜻한 모래 (저기압 L)";
            sandTag.style.color = "#f59e0b";
            waterTag.textContent = "🌊 시원한 물 (고기압 H)";
            waterTag.style.color = "#38bdf8";

            document.getElementById('fairyBubble').innerHTML = "<span>🧚 코코: '낮에는 시원한 바다(고기압)에서 따뜻한 육지(저기압)로 바람이 불어! <b>[해풍]</b>'</span>";
        } else {
            btnNight.style.background = "#0284c7";
            btnNight.style.borderColor = "#38bdf8";
            btnNight.style.color = "white";
            btnDay.style.background = "#1a3258";
            btnDay.style.borderColor = "#2d5088";
            btnDay.style.color = "#94a3b8";

            sandTag.textContent = "🏖️ 차가운 모래 (고기압 H)";
            sandTag.style.color = "#38bdf8";
            waterTag.textContent = "🌊 따뜻한 물 (저기압 L)";
            waterTag.style.color = "#f59e0b";

            document.getElementById('fairyBubble').innerHTML = "<span>🧚 코코: '밤에는 차가운 육지(고기압)에서 따뜻한 바다(저기압)로 바람이 불어! <b>[육풍]</b>'</span>";
        }
    }

    function startWindSimulation() {
        const canvas = document.getElementById('windCanvas');
        smokeParticles = [];
        for (let i = 0; i < 60; i++) {
            smokeParticles.push({
                x: canvas.width / 2 + (Math.random() - 0.5) * 10,
                y: canvas.height - 55 - Math.random() * 20,
                radius: 4 + Math.random() * 6,
                alpha: 0.1 + Math.random() * 0.4,
                speedY: 0.8 + Math.random() * 1.2
            });
        }
        renderWindFrame();
    }

    function renderWindFrame() {
        const canvas = document.getElementById('windCanvas');
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        smokeParticles.forEach(p => {
            p.y -= p.speedY;

            // 바람 방향 제어: day면 모래쪽(왼쪽)으로 꺾임, night면 물쪽(오른쪽)으로 꺾임
            if (windTime === 'day') {
                p.x -= 1.8; // 왼쪽 모래로 이동
            } else {
                p.x += 1.8; // 오른쪽 물로 이동
            }

            p.radius += 0.15;
            p.alpha -= 0.005;

            // 재생성
            if (p.y < 30 || p.alpha <= 0 || p.x < 30 || p.x > canvas.width - 30) {
                p.x = canvas.width / 2 + (Math.random() - 0.5) * 8;
                p.y = canvas.height - 55;
                p.radius = 4 + Math.random() * 4;
                p.alpha = 0.5 + Math.random() * 0.3;
            }

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(241, 245, 249, ${p.alpha})`;
            ctx.fill();
        });

        windAnimId = requestAnimationFrame(renderWindFrame);
    }

    // 퀴즈
    let quizSolved = false;
    function selectAnswer(ans) {
        const slot = document.getElementById('blank1');
        const msg = document.getElementById('quizMsg');

        if (ans === '고기압에서') {
            slot.textContent = '고기압에서 ❄️';
            slot.style.background = '#0284c7';
            slot.style.color = 'white';

            msg.style.display = 'block';
            msg.style.background = '#065f46';
            msg.style.color = '#a7f3d0';
            msg.innerHTML = "🎉 <b>딩동댕! 정답입니다!</b> 공기는 항상 차갑고 빽빽한 <b>고기압(차가운 곳)에서 저기압(따뜻한 곳)</b>으로 불어갑니다! (+1💎 획득)";

            if (!quizSolved) {
                quizSolved = true;
                gems++;
                localStorage.setItem('min_science_gems', gems);
                document.getElementById('gemCount').textContent = gems;
                playTone(523, 'sine', 0.15);
                setTimeout(() => playTone(659, 'sine', 0.15), 120);
                setTimeout(() => playTone(784, 'sine', 0.3), 240);
            }
        } else {
            slot.textContent = '다시 생각하기 💡';
            slot.style.background = '#854d0e';
            slot.style.color = '#fef08a';

            msg.style.display = 'block';
            msg.style.background = '#78350f';
            msg.style.color = '#fde68a';
            msg.innerHTML = "💡 <b>힌트</b>: 공기는 빽빽하게 누르는 힘이 큰 <b>차가운 고기압에서</b> 가벼운 저기압 쪽으로 밀려난답니다! 다시 골라보세요.";
        }
    }

    function clearBlank() {
        document.getElementById('blank1').textContent = '[ ❓ 선택 ]';
        document.getElementById('blank1').style.background = '#1e3a66';
        document.getElementById('blank1').style.color = '#38bdf8';
        document.getElementById('quizMsg').style.display = 'none';
    }
