/**
 * ==============================================================================
 * 🎮 몬스터 퀘스트 연구소 메인 인터랙션 컨트롤러 (monster_lab_controller.js)
 * ------------------------------------------------------------------------------
 * - 신디사이저 4대 물리 사운드 합성 (AudioContext 언락 & 웹 오디오 API)
 * - 사용자 프로필 동적 감지 & 민수(사이버 네온) / 민서(달콤 파스텔) 테마 스위칭
 * - 3D 클레이 몬스터 & 인형 상호작용 (Poke 바운스, 말풍선 대사, 캐릭터 음성 연동)
 * - 5대 교과 마이크로 던전 서랍(Drawer) 제어 및 4+1 듀오링고 원터치 직결 출격
 * - 부모님 권한 감지 및 레벨 배지 5회 연속 탭 긴급 인증 해제
 * ==============================================================================
 */

(function(window) {
  'use strict';

  let isSoundEnabled = true;
  let audioCtx = null;
  let targetSubject = 'math';

  // 1. 브라우저 첫 터치 즉시 AudioContext 자동 언락 및 캐릭터 웰컴 보이스 재생
  async function unlockAudio() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      await audioCtx.resume();
    }
    // 🎙️ 첫 터치 시 캐릭터 웰컴 음성 (깐죽이 / 깍쟁이 / 선희) 부드럽게 1회 재생
    if (typeof window.fairyGreet === 'function' && !window._hasGreetedMonster) {
      window._hasGreetedMonster = true;
      const targetChild = (typeof currentChild !== 'undefined') ? currentChild : (isMinseo ? 'minseo' : 'minsu');
      window.fairyGreet(targetChild);
    }
  }

  window.addEventListener('pointerdown', unlockAudio, { once: true });
  window.addEventListener('touchstart', unlockAudio, { once: true });

  function toggleSound() {
    isSoundEnabled = !isSoundEnabled;
    const icon = document.getElementById('soundIcon');
    if (isSoundEnabled) {
      if (icon) icon.textContent = 'volume_up';
      pokeSound('level');
    } else {
      if (icon) icon.textContent = 'volume_off';
    }
  }

  function triggerHaptic(duration = 20) {
    if (navigator.vibrate) {
      try { navigator.vibrate(duration); } catch (e) {}
    }
  }

  // 2. 4대 직관적 신디사이저 사운드 합성
  async function pokeSound(type = 'pop') {
    if (!isSoundEnabled) return;
    await unlockAudio();
    triggerHaptic(type === 'launch' ? [40, 60, 40] : 15);

    if (!audioCtx) return;
    const now = audioCtx.currentTime;

    switch (type) {
      // ① 쫀득한 젤리 팝음
      case 'pop': {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(540, now);
        osc.frequency.exponentialRampToValueAtTime(140, now + 0.08);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.09);
        break;
      }

      // ② 출격 워프음
      case 'launch': {
        const osc1 = audioCtx.createOscillator();
        const gain1 = audioCtx.createGain();
        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(160, now);
        osc1.frequency.exponentialRampToValueAtTime(880, now + 0.3);
        gain1.gain.setValueAtTime(0.3, now);
        gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.32);
        osc1.connect(gain1);
        gain1.connect(audioCtx.destination);
        osc1.start(now);
        osc1.stop(now + 0.33);
        break;
      }

      // ③ 짤랑 코인음
      case 'coin': {
        [987.77, 1318.51].forEach((freq, idx) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.08);
          gain.gain.setValueAtTime(0.28, now + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.25);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(now + idx * 0.08);
          osc.stop(now + idx * 0.08 + 0.26);
        });
        break;
      }

      // ④ 몬스터 콕(Poke) 워블음
      case 'monster': {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(280, now);
        osc.frequency.exponentialRampToValueAtTime(620, now + 0.09);
        osc.frequency.exponentialRampToValueAtTime(340, now + 0.22);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.25);
        break;
      }

      // 레벨 / 차임
      case 'level': {
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + idx * 0.08);
          gain.gain.setValueAtTime(0.25, now + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.25);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(now + idx * 0.08);
          osc.stop(now + idx * 0.08 + 0.26);
        });
        break;
      }
    }
  }

  // 3. 사용자 및 테마 동적 스위칭 (민수 vs 민서)
  const urlParams = new URLSearchParams(window.location.search);
  let currentChild = urlParams.get('user') || localStorage.getItem('currentChild') || localStorage.getItem('currentUser') || localStorage.getItem('currentUserName') || 'minsu';
  if (currentChild === 'son' || currentChild === '민수') currentChild = 'minsu';
  if (currentChild === 'daughter' || currentChild === '민서') currentChild = 'minseo';
  const isMinseo = (currentChild === 'minseo');

  // 캐릭터 말풍선 대사 목록
  const DIALOGUES_MINSU = [
    "민수야! 오늘 5분 퀘스트 깨러 가자! 🚀",
    "오늘 수학 보스 격파하고 치킨 먹자! 🍗",
    "클레이 바이트 에너지 충전 완료! ⚡",
    "오늘 1개만 풀면 불꽃 스트릭 유지 성공! 🔥",
    "간지러워 크하핫! 몬스터 빔 발사! ✨"
  ];

  const DIALOGUES_MINSEO = [
    "민수 오빠랑 귀여운 냥이랑 5분 퀘스트 하러 가자! 🚀✨",
    "민수 오빠랑 힘을 합치면 100점 문제도 뚝딱! 💖",
    "귀여운 냥이 삼총사와 함께하는 달콤 연구실! 🐱✨",
    "오늘 1개만 풀면 하트 스트릭 충전 완료! ✨",
    "달콤 마시멜로 튜브 타고 출격! 뽀용뽀용~ 🍭"
  ];

  let simpleDialogues = isMinseo ? DIALOGUES_MINSEO : DIALOGUES_MINSU;
  let dIndex = 0;

  // 5대 교과 메타데이터 (아이콘, 과목명, 세부 설명, 알고리즘 권장 진도)
  const SUBJECT_METAS_MINSU = {
    math: {
      icon: '🧮',
      title: '🧮 수학 5분 퀘스트',
      desc: '민수의 학습 진도에 맞춘 기초 필수 나눗셈 & 분수 배틀!',
      recommend: '💡 오늘의 권장 진도: 두 자릿수 나눗셈 (기초 필수 ⭐)'
    },
    english: {
      icon: '🔤',
      title: '🔤 영어 5분 퀘스트',
      desc: '초5-2 정규 교과 외모·옷차림 묘사 & 원어민 스피킹 훈련!',
      recommend: '💡 오늘의 권장 진도: 8단원 He Has Short Curly Hair ⭐'
    },
    korean: {
      icon: '📖',
      title: '📖 국어 5분 퀘스트',
      desc: '속담, 반의어, 접속사, 3문장 중심 생각 독해 5문제 출제!',
      recommend: '💡 오늘의 배틀 주제: 어휘·속담 & 문맥 독해 아레나'
    },
    science: {
      icon: '🔬',
      title: '🔬 과학 5분 퀘스트',
      desc: '온도와 열의 3대 이동, 물질의 상태변화, 산·염기 지시약 5문제!',
      recommend: '💡 오늘의 탐구 주제: 온도와 열의 이동 & 가상 실험'
    },
    society: {
      icon: '🗺️',
      title: '🗺️ 사회 5분 퀘스트',
      desc: '조선 건국, 한양 4대문, 세종대왕 발명품, 임진왜란 5문제!',
      recommend: '💡 오늘의 역사 주제: 조선의 건국과 발전 & 한양 도성'
    }
  };

  const SUBJECT_METAS_MINSEO = {
    math: {
      icon: '🧮',
      title: '🧮 캔디 수학 5분 퀘스트',
      desc: '초1-2 100까지의 수 & 달콤 한 자릿수 덧뺄셈 5문제 출제!',
      recommend: '💡 오늘의 추천 진도: 100까지의 수 & 덧셈 기초 (필수 ⭐)'
    },
    korean: {
      icon: '📖',
      title: '📖 낱말 베이커리 5분 퀘스트',
      desc: '초1-2 받아쓰기 100문장 & 알쏭달쏭 그림 낱말 탐험 5문제!',
      recommend: '💡 오늘의 추천 진도: 그림 낱말 탐험 & 받침 글자 (필수 ⭐)'
    },
    english: {
      icon: '🔤',
      title: '🔤 파닉스 영어 5분 퀘스트',
      desc: '초1 기초 알파벳 소리 & 그림 단어 매칭 훈련!',
      recommend: '💡 오늘의 권장 진도: 파닉스 소리 익히기 & 첫 단어 ⭐'
    }
  };

  const SUBJECT_METAS = isMinseo ? SUBJECT_METAS_MINSEO : SUBJECT_METAS_MINSU;

  // 4. 🎨 테마 및 DOM 초기화
  function applyTheme() {
    if (isMinseo) {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('theme-minseo');
      document.body.classList.remove('theme-minsu', 'text-white');
      document.body.classList.add('theme-minseo');
      document.title = "Minseo's Dreamy Plushie Lab 🧸";

      const lobbyLink = document.getElementById('headerLobbyLink');
      if (lobbyLink) lobbyLink.href = 'lobby.html?user=minseo';

      const userAvatar = document.getElementById('userAvatar');
      if (userAvatar) userAvatar.textContent = '👧';

      const userName = document.getElementById('userName');
      if (userName) userName.textContent = '민서';

      const userLevel = document.getElementById('userLevel');
      if (userLevel) {
        userLevel.textContent = 'Lv.15';
        userLevel.className = 'bg-[#ff85a2] text-white text-[11px] font-eng font-black px-1.5 py-0.5 rounded-md leading-none';
      }

      const streakIcon = document.getElementById('streakIcon');
      if (streakIcon) streakIcon.textContent = '💖';

      const streakText = document.getElementById('streakText');
      if (streakText) {
        streakText.textContent = '15일';
        streakText.className = 'text-sm font-eng font-black text-[#ff85a2]';
      }

      const coinIcon = document.getElementById('coinIcon');
      if (coinIcon) coinIcon.textContent = '✨';

      const coinText = document.getElementById('coinText');
      if (coinText) {
        coinText.textContent = '2,450';
        coinText.className = 'text-sm font-eng font-black text-[#a03a57]';
      }

      // 챔버 스위칭 (민수 스테이지 숨김, 민서 튜브 챔버 노출)
      const minsuStage = document.getElementById('minsuStageWrap');
      if (minsuStage) minsuStage.classList.add('hidden');

      const minseoChamber = document.getElementById('minseoChamberWrap');
      if (minseoChamber) {
        minseoChamber.classList.remove('hidden');
        minseoChamber.classList.add('flex');
      }

      // 서랍 그리드 스위칭 (민수 5대 교과 숨김, 민서 하루/국어/수학/영어/용어방 노출)
      const minsuGrid = document.getElementById('minsuSubjectGrid');
      if (minsuGrid) minsuGrid.classList.add('hidden');

      const minseoGrid = document.getElementById('minseoSubjectGrid');
      if (minseoGrid) minseoGrid.classList.remove('hidden');

      const drawerTitle = document.getElementById('drawerTitle');
      if (drawerTitle) drawerTitle.textContent = '🌸 민서의 달콤 과목 던전';

      const drawerBtnText = document.getElementById('drawerBtnText');
      if (drawerBtnText) drawerBtnText.textContent = '수학·국어·영어 다른 과목 보기';

      const speech = document.getElementById('speechText');
      if (speech) speech.textContent = simpleDialogues[0];

      const pName = document.getElementById('partnerName');
      if (pName) pName.textContent = '민수 & 냥이 & 민서 삼총사';

      const pDot = document.getElementById('partnerDot');
      if (pDot) pDot.className = 'w-1.5 h-1.5 rounded-full bg-[#ff85a2] animate-pulse';

      const pRole = document.getElementById('partnerRole');
      if (pRole) {
        pRole.textContent = '패밀리 수호대';
        pRole.className = 'text-[11px] text-[#ff85a2] font-bold';
      }

      const qTitle = document.getElementById('mainQuestTitle');
      if (qTitle) qTitle.textContent = '오늘의 5분 요정 퀘스트 시작! 🧸';

      const qSub = document.getElementById('mainQuestSub');
      if (qSub) qSub.textContent = '🧮 1-2 100까지 수 & 덧셈 던전 · 필수 ⭐';

      const modalIconEl = document.getElementById('modalIcon');
      const modalRecBox = document.getElementById('modalRecommendBox');
      if (modalIconEl) modalIconEl.className = 'w-14 h-14 rounded-2xl bg-[#ff85a2]/20 border-2 border-[#ff85a2] mx-auto flex items-center justify-center text-3xl';
      if (modalRecBox) modalRecBox.className = 'mt-2.5 py-1.5 px-3 rounded-xl bg-[#ff85a2]/15 border border-[#ff85a2]/40 text-[11px] text-[#a03a57] font-bold';
    } else {
      document.documentElement.classList.add('dark', 'theme-minsu');
      document.documentElement.classList.remove('theme-minseo');
      document.body.classList.remove('theme-minseo');
      document.body.classList.add('theme-minsu', 'text-white');
      document.title = "Minsu's Monster Lab 👾";

      const lobbyLink = document.getElementById('headerLobbyLink');
      if (lobbyLink) lobbyLink.href = 'lobby.html?user=minsu';

      const userAvatar = document.getElementById('userAvatar');
      if (userAvatar) userAvatar.textContent = '👦';

      const userName = document.getElementById('userName');
      if (userName) userName.textContent = '민수';

      const userLevel = document.getElementById('userLevel');
      if (userLevel) {
        userLevel.textContent = 'Lv.12';
        userLevel.className = 'bg-neon-cyan text-lab-bg text-[11px] font-eng font-black px-1.5 py-0.5 rounded-md leading-none';
      }

      const streakIcon = document.getElementById('streakIcon');
      if (streakIcon) streakIcon.textContent = '🔥';

      const streakText = document.getElementById('streakText');
      if (streakText) {
        streakText.textContent = '15일';
        streakText.className = 'text-sm font-eng font-black text-fire-orange';
      }

      const coinIcon = document.getElementById('coinIcon');
      if (coinIcon) coinIcon.textContent = '🪙';

      const coinText = document.getElementById('coinText');
      if (coinText) {
        coinText.textContent = '120';
        coinText.className = 'text-sm font-eng font-black text-yellow-300';
      }

      const minsuStage = document.getElementById('minsuStageWrap');
      if (minsuStage) minsuStage.classList.remove('hidden');

      const minseoChamber = document.getElementById('minseoChamberWrap');
      if (minseoChamber) {
        minseoChamber.classList.add('hidden');
        minseoChamber.classList.remove('flex');
      }

      // 서랍 그리드 스위칭 (민수 5대 교과 노출, 민서 그리드 숨김)
      const minsuGrid = document.getElementById('minsuSubjectGrid');
      if (minsuGrid) minsuGrid.classList.remove('hidden');

      const minseoGrid = document.getElementById('minseoSubjectGrid');
      if (minseoGrid) minseoGrid.classList.add('hidden');

      const drawerTitle = document.getElementById('drawerTitle');
      if (drawerTitle) drawerTitle.textContent = '📚 5대 교과 마이크로 던전';

      const drawerBtnText = document.getElementById('drawerBtnText');
      if (drawerBtnText) drawerBtnText.textContent = '국·영·수·사·과 다른 과목 보기';

      const speech = document.getElementById('speechText');
      if (speech) speech.textContent = simpleDialogues[0];

      const pName = document.getElementById('partnerName');
      if (pName) pName.textContent = '네온 드래곤';

      const pDot = document.getElementById('partnerDot');
      if (pDot) pDot.className = 'w-1.5 h-1.5 rounded-full bg-neon-cyan animate-pulse';

      const pRole = document.getElementById('partnerRole');
      if (pRole) {
        pRole.textContent = '수호 비스트';
        pRole.className = 'text-[11px] text-neon-cyan font-bold';
      }

      const qTitle = document.getElementById('mainQuestTitle');
      if (qTitle) qTitle.textContent = '오늘의 5분 몬스터 던전 입장! 🚀';

      const qSub = document.getElementById('mainQuestSub');
      if (qSub) qSub.textContent = '🧮 5-2 두 자릿수 나눗셈 집중 연산 · 필수 ⭐';

      const modalIconEl = document.getElementById('modalIcon');
      const modalRecBox = document.getElementById('modalRecommendBox');
      if (modalIconEl) modalIconEl.className = 'w-14 h-14 rounded-2xl bg-neon-green/20 border-2 border-neon-green mx-auto flex items-center justify-center text-3xl';
      if (modalRecBox) modalRecBox.className = 'mt-2.5 py-1.5 px-3 rounded-xl bg-neon-cyan/15 border border-neon-cyan/40 text-[11px] text-neon-cyan font-bold';
    }

    if (typeof window.updateMainQuestSubText === 'function') {
      window.updateMainQuestSubText();
    }
  }

  // 5. 콕 찌르기 (Poke) 인터랙션
  function pokeMonster(event) {
    if (event) event.stopPropagation();
    pokeSound(isMinseo ? 'pop' : 'monster');
    triggerHaptic(30);

    const targetAnim = isMinseo 
      ? document.getElementById('characterPlushieWrap') 
      : document.getElementById('monsterImg');
    const bubble = document.getElementById('monsterSpeechBubble');
    const speechText = document.getElementById('speechText');

    if (targetAnim) {
      targetAnim.classList.remove('poke-bounce');
      void targetAnim.offsetWidth;
      targetAnim.classList.add('poke-bounce');
    }

    dIndex = (dIndex + 1) % simpleDialogues.length;
    if (speechText) speechText.textContent = simpleDialogues[dIndex];

    if (bubble) {
      bubble.classList.remove('animate-bubble');
      void bubble.offsetWidth;
      bubble.classList.add('animate-bubble');
    }

    // 🎙️ 캐릭터 음성 (깐죽이 / 깍쟁이 / 선희) 대화 음성 출력
    if (typeof window.fairyGreet === 'function') {
      const targetChild = (typeof currentChild !== 'undefined') ? currentChild : (isMinseo ? 'minseo' : 'minsu');
      window.fairyGreet(targetChild);
    }
  }

  // 6. 메인 시작 버튼 (민수: 두 자릿수 나눗셈, 민서: 100까지 수 & 덧셈)
  function handleStartQuest() {
    pokeSound('launch');
    triggerHaptic(50);
    selectSubject('math');
  }

  // 7. 서랍 제어
  function openDrawer() {
    pokeSound('pop');
    const overlay = document.getElementById('drawerOverlay');
    if (overlay) {
      overlay.classList.remove('hidden');
      overlay.classList.add('flex');
    }
  }

  function closeDrawer(event) {
    if (event) event.stopPropagation();
    pokeSound('pop');
    const overlay = document.getElementById('drawerOverlay');
    if (overlay) {
      overlay.classList.add('hidden');
      overlay.classList.remove('flex');
    }
  }

  // 8. 아이 원터치 직결 출격 파이프라인
  function launchQuestDirect(subj = 'math') {
    pokeSound('launch');
    triggerHaptic([50, 80, 50]);

    // 출격 중 시각 피드백 (버튼 눌림 유지)
    const btn = document.getElementById('mainQuestBtn');
    if (btn) btn.classList.add('scale-95', 'opacity-90');

    const childKey = isMinseo ? 'minseo' : 'minsu';
    const settings = window.currentParentSettings || {};
    const chosenUnit = (settings[childKey] && settings[childKey][subj]) ? settings[childKey][subj] : '';

    setTimeout(() => {
      const targetUrl = `quest_runner.html?subject=${encodeURIComponent(subj)}&user=${encodeURIComponent(currentChild)}${chosenUnit ? `&unit=${encodeURIComponent(chosenUnit)}` : ''}`;
      window.location.href = targetUrl;
    }, 250);
  }

  // 9. 과목 선택 (서랍에서 터치 시 직결 출격)
  function selectSubject(subj = 'math') {
    closeDrawer();
    launchQuestDirect(subj);
  }

  let selectedUnit = isMinseo ? '100num' : 'division';
  let selectedMode = isMinseo ? 'speed' : 'mixed';

  function setQuestUnit(unit) {
    selectedUnit = unit;
    pokeSound('pop');
  }

  function setQuestMode(mode) {
    selectedMode = mode;
    pokeSound('pop');
  }

  // 10. 확인 모달 제어 (호환성 유지)
  function openQuestModal(icon, title, desc, subj = 'math', recommend = '') {
    targetSubject = subj;
    launchQuestDirect(subj);
  }

  function closeQuestModal() {
    pokeSound('pop');
    const modal = document.getElementById('questModal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  function launchQuestNow() {
    launchQuestDirect(targetSubject || 'math');
  }

  function handleStreakClick() {
    pokeSound('level');
    if (isMinseo) {
      alert('💖 15일 연속 사랑 충전 중!\n오늘 딱 1개 퀘스트만 완료하면 하트가 유지돼요! ✨');
    } else {
      alert('🔥 15일 연속 학습 성공 중!\n오늘 딱 1개 퀘스트만 완료하면 불꽃이 유지됩니다!');
    }
  }

  function handleCoinClick() {
    pokeSound('coin');
    if (isMinseo) {
      alert('✨ 보유 요정 가루: 2,450개\n퀘스트를 완료하면 반짝이는 요정 가루가 쌓여요!');
    } else {
      alert('🪙 보유 코인: 120개\n퀘스트를 완료하면 코인이 쌓입니다!');
    }
  }

  // 11. ⚙️ 부모 진도 설정 버튼 노출 제어 (아이들 프로필 접속 시 원천 숨김)
  function updateParentProgressBtnVisibility() {
    const savedName = localStorage.getItem('currentUserName');
    const isAdmin = (savedName === '아빠' || savedName === '엄마') || urlParams.get('admin') === 'true' || urlParams.get('role') === 'admin';
    const btnParent = document.getElementById('btnParentProgressTrigger');
    if (btnParent) {
      if (isAdmin) {
        btnParent.classList.remove('hidden');
      } else {
        btnParent.classList.add('hidden');
      }
    }
  }

  // 12. 💡 부모님 긴급 인증 해제 (아이 프로필 상태에서 상단 레벨 배지를 5회 연속 탭 시 비밀번호 입력으로 진도 설정 열기)
  let secretTapCount = 0;
  let secretTapTimer = null;
  function handleSecretParentUnlock() {
    secretTapCount++;
    clearTimeout(secretTapTimer);
    secretTapTimer = setTimeout(() => { secretTapCount = 0; }, 2000);
    if (secretTapCount >= 5) {
      secretTapCount = 0;
      const pw = prompt("🔒 부모님 비밀번호 4자리를 입력하세요:");
      if (pw === "0000") {
        const btnParent = document.getElementById('btnParentProgressTrigger');
        if (btnParent) btnParent.classList.remove('hidden');
        if (typeof window.openParentProgressModal === 'function') {
          window.openParentProgressModal();
        }
      } else if (pw !== null) {
        alert("❌ 비밀번호가 올바르지 않습니다.");
      }
    }
  }

  // 13. 전역 인터페이스 노출 (인라인 onclick 등 HTML 바인딩 보장)
  window.unlockAudio = unlockAudio;
  window.toggleSound = toggleSound;
  window.triggerHaptic = triggerHaptic;
  window.pokeSound = pokeSound;
  window.applyTheme = applyTheme;
  window.pokeMonster = pokeMonster;
  window.handleStartQuest = handleStartQuest;
  window.openDrawer = openDrawer;
  window.closeDrawer = closeDrawer;
  window.launchQuestDirect = launchQuestDirect;
  window.selectSubject = selectSubject;
  window.setQuestUnit = setQuestUnit;
  window.setQuestMode = setQuestMode;
  window.openQuestModal = openQuestModal;
  window.closeQuestModal = closeQuestModal;
  window.launchQuestNow = launchQuestNow;
  window.handleStreakClick = handleStreakClick;
  window.handleCoinClick = handleCoinClick;
  window.updateParentProgressBtnVisibility = updateParentProgressBtnVisibility;
  window.handleSecretParentUnlock = handleSecretParentUnlock;

  window.currentChild = currentChild;
  window.isMinseo = isMinseo;
  window.selectedUnit = selectedUnit;
  window.selectedMode = selectedMode;
  window.targetSubject = targetSubject;

  // 14. 페이지 진입 즉시 테마 적용 및 버튼 노출 제어
  window.addEventListener('DOMContentLoaded', () => {
    applyTheme();
    updateParentProgressBtnVisibility();
  });

})(window);
