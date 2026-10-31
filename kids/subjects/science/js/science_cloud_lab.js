
    // 상태 변수
    let pumpCount = 0;
    const maxPumps = 5;
    let isCloudFormed = false;
    let hasSmoke = true; // 응결핵 유무 (기본값 true)
    let isSqueezing = false;
    let gems = parseInt(localStorage.getItem('min_science_gems') || '0', 10);
    document.getElementById('gemCount').textContent = gems;

    // Web Audio 효과음 합성 엔진
    let audioCtx = null;

    function getAudioContext() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
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
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + duration);
        } catch (e) { }
    }

    function playPopSound() {
        playTone(160, 'sine', 0.25);
        setTimeout(() => playTone(90, 'triangle', 0.3), 50);
    }

    function playPumpSound() {
        playTone(320, 'sawtooth', 0.08);
    }

    function playSuccessSound() {
        playTone(523, 'sine', 0.15);
        setTimeout(() => playTone(659, 'sine', 0.15), 120);
        setTimeout(() => playTone(784, 'sine', 0.3), 240);
    }

    // 응결핵(향 연기) 모드 설정
    function setSmokeMode(smokeOn) {
        if (isCloudFormed || pumpCount > 0) {
            if (!confirm("실험 조건을 변경하려면 처음부터 다시 시작합니다. 계속할까요?")) return;
            resetExperiment();
        }
        hasSmoke = smokeOn;
        const btnOn = document.getElementById('btnSmokeOn');
        const btnOff = document.getElementById('btnSmokeOff');
        const text = document.getElementById('conditionText');

        if (hasSmoke) {
            btnOn.style.background = '#0284c7';
            btnOn.style.color = 'white';
            btnOn.style.borderColor = '#38bdf8';
            btnOff.style.background = '#1a3258';
            btnOff.style.color = '#94a3b8';
            btnOff.style.borderColor = '#2d5088';
            text.textContent = '향 연기 있음 (응결핵 O - 구름 뽀얗게 발생)';
            text.style.color = '#38bdf8';
            document.getElementById('fairyBubble').innerHTML = "<span>🧚 코코: '향 연기를 넣었어! 이제 공기 펌프를 5번 눌러봐!'</span>";
        } else {
            btnOff.style.background = '#0284c7';
            btnOff.style.color = 'white';
            btnOff.style.borderColor = '#38bdf8';
            btnOn.style.background = '#1a3258';
            btnOn.style.color = '#94a3b8';
            btnOn.style.borderColor = '#2d5088';
            text.textContent = '물만 있음 (연기 없음 - 구름이 거의 안 보임)';
            text.style.color = '#94a3b8';
            document.getElementById('fairyBubble').innerHTML = "<span>🧚 코코: '연기 없이 물만 넣었어! 구름이 생기는지 비교해 보자!'</span>";
        }
    }

    // 펌프 누르기 인터랙션
    function pressPump() {
        if (isCloudFormed) return;
        if (pumpCount >= maxPumps) return;

        pumpCount++;
        playPumpSound();

        const handle = document.getElementById('pumpHandle');
        handle.style.transform = "translateX(-50%) translateY(14px) scale(0.95)";
        setTimeout(() => {
            handle.style.transform = "translateX(-50%) translateY(0) scale(1)";
        }, 120);

        const pressure = (1.0 + pumpCount * 0.25).toFixed(1);
        const temp = (20.0 + pumpCount * 0.4).toFixed(1);
        
        document.getElementById('pressureVal').textContent = pressure + " atm";
        document.getElementById('pressureVal').style.color = "#ef4444";
        document.getElementById('tempVal').textContent = temp + " °C";
        document.getElementById('tempVal').style.color = "#f59e0b";
        document.getElementById('stateVal').textContent = "단열 압축 중";
        document.getElementById('stateVal').style.color = "#ef4444";
        document.getElementById('pumpCount').textContent = pumpCount;

        const bottle = document.getElementById('bottleBody');
        bottle.style.stroke = "#f59e0b";
        bottle.style.strokeWidth = "4";

        if (pumpCount >= maxPumps) {
            document.getElementById('pumpBtn').style.display = 'none';
            document.getElementById('openBtn').style.display = 'inline-flex';
            document.getElementById('stepBadge').textContent = "단열 팽창 준비 완료!";
            document.getElementById('fairyBubble').innerHTML = "<span>🧚 코코: '우와! 팽팽하게 압축됐어! 이제 [뚜껑 펑! 열기]를 눌러봐!'</span>";
        } else {
            document.getElementById('fairyBubble').innerHTML = `<span>🧚 코코: '공기가 꽉 차고 있어! (${pumpCount}/5회)'</span>`;
        }
    }

    // 뚜껑 펑! 열기 (단열 팽창 및 구름 발생)
    function openCap() {
        if (isCloudFormed) return;
        isCloudFormed = true;
        playPopSound();

        const handle = document.getElementById('pumpHandle');
        handle.style.transition = "transform 0.4s ease-out, opacity 0.4s";
        handle.style.transform = "translateX(-50%) translateY(-60px) rotate(20deg)";
        handle.style.opacity = "0";

        document.getElementById('pressureVal').textContent = "1.0 atm";
        document.getElementById('pressureVal').style.color = "#38bdf8";
        document.getElementById('tempVal').textContent = "14.5 °C (급하강!)";
        document.getElementById('tempVal').style.color = "#38bdf8";
        document.getElementById('stateVal').textContent = "단열 팽창 (구름!)";
        document.getElementById('stateVal').style.color = "#38bdf8";

        const bottle = document.getElementById('bottleBody');
        bottle.style.stroke = "#38bdf8";
        bottle.style.strokeWidth = "3";

        // 구름 애니메이션 시작
        startCloudAnimation();

        document.getElementById('openBtn').style.display = 'none';
        document.getElementById('squeezeBtn').style.display = 'inline-flex';
        document.getElementById('zoomBtn').style.display = 'inline-flex';

        if (hasSmoke) {
            document.getElementById('stepBadge').textContent = "하얀 구름 발생 성공! ☁️";
            document.getElementById('fairyBubble').innerHTML = "<span>🧚 코코: '와아! 향 연기(응결핵) 덕분에 <b>새하얀 구름</b>이 가득 찼어! 이제 보라색 [꾹 누르고 있기] 버튼을 눌러봐!'</span>";
        } else {
            document.getElementById('stepBadge').textContent = "구름 희미함 (응결핵 없음) 🌫️";
            document.getElementById('fairyBubble').innerHTML = "<span>🧚 코코: '어라? 향 연기가 없으니까 수증기가 뭉치지 못해서 <b>구름이 거의 안 보여!</b>'</span>";
        }
    }

    // 캔버스 구름 파티클 렌더링
    const canvas = document.getElementById('cloudCanvas');
    const ctx = canvas.getContext('2d');
    let particles = [];
    let cloudAnimId = null;

    function startCloudAnimation() {
        particles = [];
        // 향 연기 유무에 따라 입자 수와 불투명도 차등
        const particleCount = hasSmoke ? 50 : 10;
        const maxAlphaCap = hasSmoke ? 0.6 : 0.12;

        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: canvas.height - 10 - Math.random() * 20,
                radius: 14 + Math.random() * 18,
                targetY: 15 + Math.random() * (canvas.height - 30),
                alpha: 0,
                baseMaxAlpha: (0.3 + Math.random() * 0.3) * (hasSmoke ? 1.0 : 0.2),
                currentMaxAlpha: (0.3 + Math.random() * 0.3) * (hasSmoke ? 1.0 : 0.2),
                speedY: 1.5 + Math.random() * 2.5
            });
        }
        renderCloudFrame();
    }

    function renderCloudFrame() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        particles.forEach(p => {
            if (p.y > p.targetY) {
                p.y -= p.speedY;
            }

            // 누르고 있을 땐 투명(증발), 놓으면 다시 나타남
            if (isSqueezing) {
                if (p.alpha > 0.02) p.alpha -= 0.05;
                else p.alpha = 0;
            } else {
                if (p.alpha < p.currentMaxAlpha) p.alpha += 0.025;
            }

            if (p.alpha > 0) {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
                ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
                ctx.shadowBlur = 12;
                ctx.fill();
            }
        });

        cloudAnimId = requestAnimationFrame(renderCloudFrame);
    }

    // ✊ [마법 실시간 토글] 꾹 누르기 (단열 압축 -> 구름 사라짐/투명해짐)
    function startSqueeze() {
        if (!isCloudFormed) return;
        isSqueezing = true;

        // 병 찌그러짐 시각 효과
        const wrap = document.getElementById('bottleWrap');
        wrap.style.transition = "transform 0.15s ease";
        wrap.style.transform = "scaleX(0.88) scaleY(1.04)";

        // 계기판 변화 (압축: 기압 상승, 온도 상승)
        document.getElementById('pressureVal').textContent = "1.8 atm (압축!)";
        document.getElementById('pressureVal').style.color = "#ef4444";
        document.getElementById('tempVal').textContent = "22.5 °C (상승!)";
        document.getElementById('tempVal').style.color = "#ef4444";
        document.getElementById('stateVal').textContent = "압축: 구름 증발!";
        document.getElementById('stateVal').style.color = "#f59e0b";

        document.getElementById('fairyBubble').innerHTML = "<span>🧚 코코: '우와! 꾹 누르니까 온도가 올라가서 <b>구름이 마법처럼 사라지고 투명</b>해졌어!'</span>";
    }

    // 손 떼기 (단열 팽창 -> 구름 재발생)
    function endSqueeze() {
        if (!isCloudFormed) return;
        isSqueezing = false;

        const wrap = document.getElementById('bottleWrap');
        wrap.style.transform = "scale(1)";

        document.getElementById('pressureVal').textContent = "1.0 atm";
        document.getElementById('pressureVal').style.color = "#38bdf8";
        document.getElementById('tempVal').textContent = "14.5 °C (하강!)";
        document.getElementById('tempVal').style.color = "#38bdf8";
        document.getElementById('stateVal').textContent = "팽창: 구름 재발생!";
        document.getElementById('stateVal').style.color = "#38bdf8";

        document.getElementById('fairyBubble').innerHTML = "<span>🧚 코코: '손을 떼니까 다시 차가워져서 <b>하얀 구름이 퐁퐁</b> 다시 나타났어!'</span>";
    }

    // 돋보기 모달
    function showZoom() {
        document.getElementById('zoomModal').style.display = 'flex';
    }
    function closeZoom() {
        document.getElementById('zoomModal').style.display = 'none';
    }

    // 실험 리셋
    function resetExperiment() {
        if (cloudAnimId) cancelAnimationFrame(cloudAnimId);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        pumpCount = 0;
        isCloudFormed = false;
        isSqueezing = false;

        const handle = document.getElementById('pumpHandle');
        handle.style.transition = "none";
        handle.style.transform = "translateX(-50%) translateY(0)";
        handle.style.opacity = "1";

        const wrap = document.getElementById('bottleWrap');
        wrap.style.transform = "scale(1)";

        document.getElementById('pressureVal').textContent = "1.0 atm";
        document.getElementById('pressureVal').style.color = "#38bdf8";
        document.getElementById('tempVal').textContent = "20.0 °C";
        document.getElementById('tempVal').style.color = "#38bdf8";
        document.getElementById('stateVal').textContent = "보통 상태";
        document.getElementById('stateVal').style.color = "#38bdf8";
        document.getElementById('pumpCount').textContent = "0";

        document.getElementById('pumpBtn').style.display = 'inline-flex';
        document.getElementById('openBtn').style.display = 'none';
        document.getElementById('squeezeBtn').style.display = 'none';
        document.getElementById('zoomBtn').style.display = 'none';
        document.getElementById('stepBadge').textContent = "준비 단계 : 펌프 누르기";
        document.getElementById('fairyBubble').innerHTML = "<span>🧚 코코: '다시 시작해보자! 펌프를 5번 눌러봐!'</span>";
    }

    // 퀴즈 처리 (실패 없는 민수 인지 프로필)
    let quizSolved = false;
    function selectAnswer(ans) {
        const slot = document.getElementById('blank1');
        const msg = document.getElementById('quizMsg');

        if (ans === '낮아져서') {
            slot.textContent = '낮아져서 ❄️';
            slot.style.background = '#0284c7';
            slot.style.color = 'white';

            msg.style.display = 'block';
            msg.style.background = '#065f46';
            msg.style.color = '#a7f3d0';
            msg.innerHTML = "🎉 <b>딩동댕! 정답입니다!</b> 단열 팽창으로 온도가 <b>낮아져서(차가워져서)</b> 수증기가 향 연기(응결핵)에 달라붙어 구름이 생겨요! (+1💎 획득)";

            if (!quizSolved) {
                quizSolved = true;
                gems++;
                localStorage.setItem('min_science_gems', gems);
                document.getElementById('gemCount').textContent = gems;
                playSuccessSound();
            }
        } else {
            slot.textContent = '다시 생각하기 💡';
            slot.style.background = '#854d0e';
            slot.style.color = '#fef08a';

            msg.style.display = 'block';
            msg.style.background = '#78350f';
            msg.style.color = '#fde68a';
            msg.innerHTML = "💡 <b>힌트</b>: 뚜껑을 열거나 손을 떼면 공기가 팽창하면서 온도가 <b>시원하게 낮아진답니다!</b> 다시 골라보세요.";
        }
    }

    function clearBlank() {
        document.getElementById('blank1').textContent = '[ ❓ 선택 ]';
        document.getElementById('blank1').style.background = '#1e3a66';
        document.getElementById('blank1').style.color = '#38bdf8';
        document.getElementById('quizMsg').style.display = 'none';
    }
