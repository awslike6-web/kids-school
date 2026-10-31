
    // ========================================================
    // 전역 상태 & 보석 관리
    // ========================================================
    let gems = parseInt(localStorage.getItem('min_science_gems') || '0', 10);
    document.getElementById('gemCount').textContent = gems;

    let currentMode = 'map';
    let currentQuizIdx = 0;
    let quizScore = 0;
    let quizAnswered = false;

    // Web Audio 사운드 엔진
    let audioCtx = null;
    function playTone(freq, type = 'sine', duration = 0.2) {
        try {
            if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + duration);
        } catch(e) {}
    }

    function playSuccessSound() {
        playTone(523, 'sine', 0.12);
        setTimeout(() => playTone(659, 'sine', 0.12), 100);
        setTimeout(() => playTone(784, 'sine', 0.25), 200);
    }

    function playFanfareSound() {
        const notes = [523, 659, 784, 1046];
        notes.forEach((n, idx) => {
            setTimeout(() => playTone(n, 'triangle', 0.25), idx * 120);
        });
    }

    // ========================================================
    // 탭 모드 전환
    // ========================================================
    function switchMode(mode) {
        currentMode = mode;
        const tabs = document.querySelectorAll('.mode-tab-btn');
        tabs.forEach(t => t.classList.remove('active'));

        document.getElementById('modeMap').style.display = 'none';
        document.getElementById('modeSeason').style.display = 'none';
        document.getElementById('modeMatrix').style.display = 'none';
        document.getElementById('modeQuiz').style.display = 'none';

        if (mode === 'map') {
            tabs[0].classList.add('active');
            document.getElementById('modeMap').style.display = 'flex';
            setFairyMsg("지도의 <b>4대 공기 덩어리(기단)</b>를 터치하면 성질과 계절 바람 방향을 볼 수 있어!");
        } else if (mode === 'season') {
            tabs[1].classList.add('active');
            document.getElementById('modeSeason').style.display = 'flex';
            setFairyMsg("봄, 여름, 가을, 겨울, 그리고 <b>초여름 장마</b> 버튼을 눌러 계절별 기상 변화를 체감해 봐!");
        } else if (mode === 'matrix') {
            tabs[2].classList.add('active');
            document.getElementById('modeMatrix').style.display = 'flex';
            setFairyMsg("공기 덩어리는 <b>태어난 땅(대륙/바다)</b>과 <b>위도(찬곳/더운곳)</b>의 성질을 그대로 빼닮는단다!");
        } else if (mode === 'quiz') {
            tabs[3].classList.add('active');
            document.getElementById('modeQuiz').style.display = 'flex';
            renderQuiz();
            setFairyMsg("기상청 꼬마 예보관 라이선스 퀴즈 5문항에 도전해 봐! 모두 맞히면 <b>+5💎</b> 보석을 줘!");
        }
        playTone(440, 'sine', 0.08);
    }

    function setFairyMsg(html) {
        document.getElementById('fairyMsg').innerHTML = html;
    }

    // ========================================================
    // 모드 1: 기단 선택 및 지도 애니메이션
    // ========================================================
    const AIRMASS_DATA = {
        siberia: {
            name: "시베리아 기단",
            season: "겨울 ❄️",
            origin: "북서쪽 고위도 유라시아 대륙",
            prop: "차갑고 건조함",
            temp: "-10°C ~ 2°C",
            wind: "북서풍 (차가운 삭풍)",
            desc: "매서운 한파와 눈보라, 삼한사온 현상을 몰고 와요.",
            arrowId: "windArrowSiberia"
        },
        pacific: {
            name: "북태평양 기단",
            season: "여름 ☀️",
            origin: "남동쪽 저위도 태평양 바다",
            prop: "덥고 습함 (고온다습)",
            temp: "28°C ~ 35°C",
            wind: "남동풍 (따뜻하고 축축한 바람)",
            desc: "푹푹 찌는 무더위와 열대야, 소나기를 몰고 와요.",
            arrowId: "windArrowPacific"
        },
        okhotsk: {
            name: "오호츠크해 기단",
            season: "초여름 🌊",
            origin: "북동쪽 고위도 오호츠크해 바다",
            prop: "차갑고 습함 (한랭다습)",
            temp: "15°C ~ 20°C",
            wind: "북동풍 (서늘한 바닷바람)",
            desc: "동해안에 서늘한 안개를 만들고, 북태평양 기단과 부딪혀 장마전선을 형성해요.",
            arrowId: "windArrowOkhotsk"
        },
        yangtze: {
            name: "양쯔강 기단",
            season: "봄·가을 🌾",
            origin: "남서쪽 저위도 중국 대륙",
            prop: "따뜻하고 건조함 (온난건조)",
            temp: "14°C ~ 22°C",
            wind: "남서풍 / 이동성 고기압",
            desc: "화창하고 맑은 날씨를 선물하지만, 봄철 건조와 꽃샘추위, 황사를 동반하기도 해요.",
            arrowId: "windArrowYangtze"
        }
    };

    function selectAirmass(key) {
        const cards = document.querySelectorAll('.airmass-card');
        cards.forEach(c => c.classList.remove('active'));

        const targetCard = document.getElementById('card' + key.charAt(0).toUpperCase() + key.slice(1));
        if (targetCard) targetCard.classList.add('active');

        // 지도 화살표 가시화
        ['windArrowSiberia', 'windArrowPacific', 'windArrowOkhotsk', 'windArrowYangtze'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.setAttribute('opacity', '0');
        });

        const info = AIRMASS_DATA[key];
        const arrow = document.getElementById(info.arrowId);
        if (arrow) {
            arrow.setAttribute('opacity', '1');
        }

        setFairyMsg(`<b>${info.name}</b>은(는) <b>${info.origin}</b>에서 발생해서 <b>[${info.prop}]</b> 성질을 띠고 <b>${info.season}</b> 날씨를 만들어!`);
        playTone(587, 'triangle', 0.15);
    }

    // ========================================================
    // 모드 2: 사계절 시뮬레이터
    // ========================================================
    const SEASON_DATA = {
        spring: {
            name: "🌸 봄",
            airmass: "🌾 양쯔강 기단",
            prop: "따뜻하고 건조함",
            temp: "16°C (포근함)",
            humidity: "45% (건조)",
            wind: "남서풍 / 이동성 고기압",
            icon: "🧥",
            title: "가벼운 겉옷과 꽃구경 나들이",
            desc: "따뜻하고 맑은 날씨가 이어져요! 하지만 이동성 고기압으로 날씨가 자주 변하고 꽃샘추위가 찾아올 수 있어요.",
            fashion: "봄 자켓 & 편안한 운동화",
            monsoon: false
        },
        summer: {
            name: "☀️ 여름",
            airmass: "☀️ 북태평양 기단",
            prop: "덥고 습함 (고온다습)",
            temp: "32°C (한낮 무더위)",
            humidity: "85% (매우 습함)",
            wind: "남동풍 (축축하고 더운 바람)",
            icon: "🍉",
            title: "시원한 물놀이와 에어컨 필수!",
            desc: "북태평양 기단이 우리나라를 완전히 덮어 푹푹 찌는 무더위와 열대야가 계속돼요. 시원한 수박과 물놀이가 최고!",
            fashion: "시원한 반팔 티셔츠 & 선글라스",
            monsoon: false
        },
        monsoon: {
            name: "☔ 초여름 (장마철)",
            airmass: "🌊 오호츠크해 + ☀️ 북태평양 기단",
            prop: "차갑고 습함 vs 덥고 습함의 충돌!",
            temp: "23°C (눅눅하고 축축함)",
            humidity: "95% (비구름 가득)",
            wind: "불안정한 전선풍 (장마전선)",
            icon: "🌧️",
            title: "우산과 비옷, 장화 필수 착용!",
            desc: "차가운 오호츠크해 기단과 더운 북태평양 기단이 한반도 상공에서 팽팽하게 맞서며 며칠 동안 많은 비를 뿌려요!",
            fashion: "튼튼한 우산 & 방수 장화 & 레인코트",
            monsoon: true
        },
        autumn: {
            name: "🍁 가을",
            airmass: "🌾 양쯔강 기단 (맑은 이동성 고기압)",
            prop: "선선하고 맑으며 쾌적함",
            temp: "18°C (선선하고 청명함)",
            humidity: "50% (쾌적)",
            wind: "선선한 북서~남서풍",
            icon: "📚",
            title: "청명한 가을 하늘과 독서의 계절",
            desc: "하늘이 높고 푸르며 공기가 맑고 쾌적해요! 야외 활동과 단풍놀이 가기에 가장 좋은 계절이랍니다.",
            fashion: "포근한 니트 가디건 & 청바지",
            monsoon: false
        },
        winter: {
            name: "❄️ 겨울",
            airmass: "❄️ 시베리아 기단",
            prop: "차갑고 건조함 (한랭건조)",
            temp: "-8°C (매서운 한파)",
            humidity: "35% (바싹 건조)",
            wind: "강한 북서풍 (살을 에는 칼바람)",
            icon: "⛄",
            title: "두꺼운 패딩 점퍼와 눈사람 만들기",
            desc: "시베리아 기단이 강하게 확장하면 영하의 한파와 폭설이 찾아와요. 3일 춥고 4일 따뜻한 삼한사온이 나타나요.",
            fashion: "롱패딩 점퍼 & 털모자 & 장갑",
            monsoon: false
        }
    };

    function setSeason(seasonKey) {
        const btns = document.querySelectorAll('.season-btn');
        btns.forEach(b => b.className = 'season-btn');

        const btnMap = { spring: 0, summer: 1, monsoon: 2, autumn: 3, winter: 4 };
        const activeBtn = btns[btnMap[seasonKey]];
        if (activeBtn) {
            activeBtn.classList.add('active');
            if (seasonKey === 'summer') activeBtn.classList.add('summer');
            if (seasonKey === 'winter') activeBtn.classList.add('winter');
            if (seasonKey === 'monsoon') activeBtn.classList.add('monsoon');
        }

        const data = SEASON_DATA[seasonKey];
        document.getElementById('dispSeasonName').textContent = data.name;
        document.getElementById('dispAirmassName').textContent = data.airmass;
        document.getElementById('dispAirmassProp').textContent = data.prop;
        document.getElementById('dispTemp').textContent = data.temp;
        document.getElementById('dispHumidity').textContent = data.humidity;
        document.getElementById('dispWindDir').textContent = data.wind;

        document.getElementById('dispLifeIcon').textContent = data.icon;
        document.getElementById('dispLifeTitle').textContent = data.title;
        document.getElementById('dispLifeDesc').textContent = data.desc;
        document.getElementById('dispFashion').textContent = data.fashion;

        const monsoonBanner = document.getElementById('monsoonBanner');
        if (data.monsoon) {
            monsoonBanner.style.display = 'flex';
            playTone(350, 'sawtooth', 0.25);
            setFairyMsg("⚡ <b>오호츠크해 기단</b>과 <b>북태평양 기단</b>이 힘겨루기를 하며 한반도에 <b>장마전선</b>을 만들었어!");
        } else {
            monsoonBanner.style.display = 'none';
            playTone(520, 'sine', 0.12);
            setFairyMsg(`<b>${data.name}</b>에는 <b>${data.airmass}</b>의 영향으로 날씨가 <b>${data.prop}</b>해진단다!`);
        }
    }

    // ========================================================
    // 모드 3: 매트릭스 하이라이트
    // ========================================================
    function highlightMatrix(key) {
        const info = AIRMASS_DATA[key];
        const guide = document.getElementById('matrixGuide');
        guide.innerHTML = `🌟 <b>${info.name}</b>은(는) <b>${info.origin}</b>에서 만들어져서 <b>[${info.prop}]</b> 성질을 띠고 <b>${info.season}</b> 날씨를 지배해요!`;
        guide.style.borderColor = '#38bdf8';
        playTone(659, 'sine', 0.15);
    }

    // ========================================================
    // 모드 4: 실전 퀴즈 엔진 (5문항)
    // ========================================================
    const QUIZ_LIST = [
        {
            q: "넓은 지역에 오랫동안 머물면서 기온과 습도가 지표면의 성질을 닮은 '거대한 공기 덩어리'를 무엇이라고 부를까요?",
            options: [
                "기단 (공기 덩어리)",
                "수증기",
                "이슬방울",
                "응결핵"
            ],
            ans: 0,
            exp: "넓은 대륙이나 바다에 머물며 고유한 기온과 습도를 지닌 큰 공기 덩어리를 <b>기단(Air Mass)</b>이라고 합니다."
        },
        {
            q: "우리나라의 '한겨울'에 찾아와 살을 에는 매서운 한파와 눈보라, 북서풍을 몰고 오는 공기 덩어리는 무엇일까요?",
            options: [
                "북태평양 기단 (남동쪽 바다)",
                "시베리아 기단 (북서쪽 대륙)",
                "양쯔강 기단 (남서쪽 대륙)",
                "적도 기단 (남쪽 바다)"
            ],
            ans: 1,
            exp: "겨울철에는 북서쪽의 차가운 유라시아 대륙에서 발생한 <b>시베리아 기단</b>이 확장하여 춥고 건조한 날씨를 만듭니다."
        },
        {
            q: "우리나라의 '한여름'에 찾아와 푹푹 찌는 찜통 무더위와 열대야, 시원한 소나기를 내리는 공기 덩어리는?",
            options: [
                "시베리아 기단 (차갑고 건조함)",
                "오호츠크해 기단 (차갑고 습함)",
                "북태평양 기단 (덥고 습함)",
                "양쯔강 기단 (따뜻하고 건조함)"
            ],
            ans: 2,
            exp: "여름철에는 남동쪽의 뜨거운 바다에서 수증기를 가득 머금고 발달한 <b>북태평양 기단</b>이 무더위를 가져옵니다."
        },
        {
            q: "초여름 장마철에 며칠 동안 많은 비를 뿌리는 '장마전선'은 어떤 두 공기 덩어리가 한반도 상공에서 충돌하여 생길까요?",
            options: [
                "오호츠크해 기단(차갑고 습함) + 북태평양 기단(덥고 습함)",
                "시베리아 기단(차갑고 건조) + 양쯔강 기단(따뜻하고 건조)",
                "북태평양 기단(덥고 습함) + 적도 기단(덥고 건조)",
                "시베리아 기단(차갑고 건조) + 오호츠크해 기단(차갑고 습함)"
            ],
            ans: 0,
            exp: "초여름에는 북쪽의 차가운 <b>오호츠크해 기단</b>과 남쪽의 더운 <b>북태평양 기단</b>이 팽팽하게 힘겨루기를 하며 비구름대(정체전선)를 형성합니다."
        },
        {
            q: "공기 덩어리의 성질에 대한 설명으로 옳은 것은 무엇일까요?",
            options: [
                "바다(해양)에서 태어난 공기는 건조하다.",
                "대륙(땅)에서 태어난 공기는 물이 없어 건조하다.",
                "북쪽 고위도에서 태어난 공기는 언제나 뜨겁다.",
                "공기 덩어리의 성질은 태어난 곳과 아무런 상관이 없다."
            ],
            ans: 1,
            exp: "바다는 물이 증발하여 <b>습하고</b>, 대륙은 물기가 적어 <b>건조</b>하며, 북쪽은 <b>차갑고</b> 남쪽은 <b>따뜻</b>합니다!"
        }
    ];

    function renderQuiz() {
        quizAnswered = false;
        const q = QUIZ_LIST[currentQuizIdx];
        document.getElementById('qNum').textContent = currentQuizIdx + 1;
        document.getElementById('qText').innerHTML = q.q;
        document.getElementById('quizProgress').textContent = `문제 ${currentQuizIdx + 1} / ${QUIZ_LIST.length}`;

        const optsDiv = document.getElementById('qOptions');
        optsDiv.innerHTML = '';

        q.options.forEach((optText, idx) => {
            const btn = document.createElement('button');
            btn.className = 'quiz-opt-btn';
            btn.innerHTML = `${idx + 1}. ${optText}`;
            btn.onclick = () => checkQuiz(idx, btn);
            optsDiv.appendChild(btn);
        });

        const feedback = document.getElementById('qFeedback');
        feedback.style.display = 'none';
        document.getElementById('btnNextQuiz').style.display = 'none';
    }

    function checkQuiz(selectedIdx, btnEl) {
        if (quizAnswered) return;
        quizAnswered = true;

        const q = QUIZ_LIST[currentQuizIdx];
        const allBtns = document.querySelectorAll('.quiz-opt-btn');
        const feedback = document.getElementById('qFeedback');

        if (selectedIdx === q.ans) {
            btnEl.classList.add('correct');
            feedback.style.display = 'block';
            feedback.style.background = '#065f46';
            feedback.style.color = '#d1fae5';
            feedback.style.border = '1.5px solid #34d399';
            feedback.innerHTML = `🎉 <b>정답입니다!</b> ${q.exp}`;
            playSuccessSound();

            quizScore++;
            gems++;
            localStorage.setItem('min_science_gems', gems);
            document.getElementById('gemCount').textContent = gems;
        } else {
            btnEl.classList.add('wrong');
            allBtns[q.ans].classList.add('correct');
            feedback.style.display = 'block';
            feedback.style.background = '#7f1d1d';
            feedback.style.color = '#fee2e2';
            feedback.style.border = '1.5px solid #f87171';
            feedback.innerHTML = `💡 <b>아쉬워요!</b> 정답은 <b>${q.ans + 1}번</b>입니다.<br>${q.exp}`;
            playTone(220, 'sawtooth', 0.25);
        }

        document.getElementById('btnNextQuiz').style.display = 'inline-flex';
    }

    function nextQuiz() {
        currentQuizIdx++;
        if (currentQuizIdx < QUIZ_LIST.length) {
            renderQuiz();
        } else {
            // 퀴즈 완주
            showRewardModal();
        }
    }

    function showRewardModal() {
        playFanfareSound();
        gems += 5; // 완주 보너스
        localStorage.setItem('min_science_gems', gems);
        document.getElementById('gemCount').textContent = gems;
        document.getElementById('rewardModal').style.display = 'flex';
    }

    function closeRewardModal() {
        document.getElementById('rewardModal').style.display = 'none';
        currentQuizIdx = 0;
        switchMode('map');
    }

    // 초기 실행
    document.addEventListener('DOMContentLoaded', () => {
        selectAirmass('siberia');
    });
