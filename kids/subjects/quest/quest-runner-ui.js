/**
 * 🎨 quest-runner-ui.js — 5분 퀘스트 러너 화면 장식·보조 도구 모듈 (IIFE)
 * - Web Audio 효과음 (tap / correct / wrong / fanfare)
 * - 민수·민서 테마 적용, 과목 심화관 버튼 라벨·이동 경로
 * - 리벤지·클리어·나가기 모달의 민서 전용 스킨 + 모달 열고 닫기
 * - [수학 전용] 손글씨 계산 메모장, 사료/실험/지도 사진 확대 라이트박스
 * 퀘스트 진행 흐름(문제 렌더링·채점·노션 전송)은 quest-runner.js가 담당합니다.
 * HTML onclick 호환을 위해 playSound, toggleMathMemoPad, clearMathMemoCanvas,
 * openImageZoom, closeImageZoom은 window 전역으로도 노출합니다.
 */
(function (global) {
  'use strict';

  // ========================================================
  // 🔊 Web Audio 사운드 엔진
  // ========================================================
  let audioCtx = null;

  function initAudio() {
    if (!audioCtx) audioCtx = new (global.AudioContext || global.webkitAudioContext)();
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  }
  global.addEventListener('pointerdown', initAudio, { once: true });

  // 주파수 배열을 간격(step)마다 순서대로 울리는 공통 아르페지오
  function playNotes(freqs, wave, step, volume, decay, stopAfter) {
    const now = audioCtx.currentTime;
    freqs.forEach((freq, idx) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = wave;
      osc.frequency.setValueAtTime(freq, now + idx * step);
      gain.gain.setValueAtTime(volume, now + idx * step);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * step + decay);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now + idx * step);
      osc.stop(now + idx * step + stopAfter);
    });
  }

  function playSound(type) {
    initAudio();
    if (!audioCtx) return;
    const now = audioCtx.currentTime;

    if (type === 'tap') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(540, now);
      osc.frequency.exponentialRampToValueAtTime(160, now + 0.07);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'correct') {
      playNotes([523.25, 659.25, 783.99, 1046.50], 'triangle', 0.08, 0.25, 0.28, 0.29);
    } else if (type === 'wrong') {
      playNotes([320, 240], 'sawtooth', 0.12, 0.2, 0.2, 0.22);
    } else if (type === 'fanfare') {
      playNotes([523.25, 659.25, 783.99, 1046.50, 1318.51], 'triangle', 0.1, 0.3, 0.4, 0.45);
    }
  }

  // ========================================================
  // 🌸 테마 & 과목 심화관 버튼
  // ========================================================
  function applyChildTheme(isMinseo) {
    if (isMinseo) {
      document.body.classList.remove('theme-minsu', 'text-white');
      document.body.classList.add('theme-minseo');
      document.title = "5-Min Sweet Quest Runner 🧸";
      const monster = document.getElementById('cheerMonster');
      if (monster) {
        monster.src = './assets/images/characters/minseo_3d_single.png';
        monster.onerror = () => {
          monster.src = './assets/images/minseo-char1.png';
        };
      }
    } else {
      document.body.classList.remove('theme-minseo');
      document.body.classList.add('theme-minsu', 'text-white');
    }
  }

  // [클리어 모달 버튼 라벨, 나가기 모달 버튼 라벨]
  function deepTrainingLabels(isMinseo, subj, quest) {
    if (isMinseo) {
      if (subj === 'haru') return [`🎒 슬기로운 하루 탐험관 가기 ➔`, `🎒 슬기로운 하루 탐험관으로`];
      if (subj === 'korean') return [`📖 낱말 베이커리 국어관 가기 ➔`, `📖 낱말 베이커리 국어관으로`];
      if (subj === 'math') return [`🧮 캔디 수학 놀이터 가기 ➔`, `🧮 캔디 수학 놀이터로`];
      if (subj === 'english') return [`🔤 파닉스 영어 기억방 가기 ➔`, `🔤 파닉스 영어 기억방으로`];
      return [`📚 달콤 그림 낱말 사전관 가기 ➔`, `📚 달콤 그림 낱말 사전관으로`];
    }
    if (subj === 'english') return [`🔤 초5 영어 원어민 스피킹관(english.html) 가기 ➔`, `🔤 초5 영어 원어민 스피킹관으로`];
    if (subj === 'math') return [`🧮 5-2 분수 실전 훈련관(fractions_training) 가기 ➔`, `🧮 5-2 분수 실전 훈련관으로`];
    return [`${quest.icon} ${quest.title} 심화관 가기 ➔`, `${quest.icon} 과목 심화관으로`];
  }

  function applyDeepTrainingLabels(isMinseo, subj, quest) {
    const [clearLabel, exitLabel] = deepTrainingLabels(isMinseo, subj, quest);
    const deepBtn = document.getElementById('deepTrainingBtn');
    const exitDeepBtn = document.getElementById('exitDeepTrainingBtn');
    if (deepBtn) deepBtn.innerHTML = clearLabel;
    if (exitDeepBtn) exitDeepBtn.innerHTML = exitLabel;
  }

  // 🎯 과목별 심화 실전 훈련관 경로 (수학: 분수관, 영어: 스피킹관, 기타: 과목 메인)
  function deepTrainingUrl(isMinseo, subj) {
    if (isMinseo) {
      if (subj === 'korean') return 'kids/subjects/korean/korean.html';
      if (subj === 'english') return 'kids/subjects/english/english.html';
      return 'kids/subjects/math/math.html';
    }
    if (subj === 'english') return 'kids/subjects/english/english.html';
    if (subj === 'math') return 'kids/subjects/math/fractions_training.html';
    return `kids/subjects/${subj}/${subj}.html`;
  }

  // 📝 수학 과목 전용 원터치 계산 메모장 버튼 제어
  function setMathMemoVisible(visible) {
    const memoBtn = document.getElementById('mathMemoBtn');
    if (!memoBtn) return;
    memoBtn.classList.toggle('hidden', !visible);
    memoBtn.classList.toggle('flex', visible);
  }

  // ========================================================
  // 🪟 모달 열기/닫기 & 민서 전용 스킨
  // ========================================================
  function showModal(id) {
    const modal = document.getElementById(id);
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  function hideModal(id) {
    const modal = document.getElementById(id);
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }

  function setClass(el, className, text) {
    if (!el) return;
    el.className = className;
    if (text !== undefined) el.textContent = text;
  }

  // ⚔️ 몬스터 리벤지 배틀 모달 → 민서는 베리 버니 핑크 모달
  function skinRevengeModalForMinseo() {
    const modal = document.getElementById('revengeModal');
    const box = modal.querySelector('div');
    setClass(box, "bg-[#fff5f8] border-2 border-[#ff7597] rounded-3xl max-w-xs w-full p-5 text-center space-y-3.5 shadow-2xl animate-sheet-up text-[#4a2e2b]");
    setClass(box ? box.querySelector('div') : null,
      "w-16 h-16 rounded-2xl bg-[#ffe4ec] border-2 border-[#ff7597] mx-auto flex items-center justify-center text-3xl animate-bounce", "🐰");
    setClass(box ? box.querySelector('h3') : null, "text-lg font-bold text-[#d8496e]", "🌸 베리 버니와 다시 도전!");
    setClass(box ? box.querySelector('p') : null, "text-xs text-[#a03a57] mt-1", "놓쳤던 문제를 다시 풀고 예쁜 별빛 캔디를 100% 모아보자!");
    setClass(modal.querySelector('.jelly-btn'),
      "jelly-btn w-full py-3.5 rounded-2xl bg-[#ff7597] text-white font-bold text-sm shadow-[0_4px_0_0_#d8496e]", "별빛 구출하러 가기! 🌸");
  }

  // 🏆 클리어 모달 → 민서는 달콤 퀘스트 완독 모달
  function skinClearModalForMinseo() {
    const $ = id => document.getElementById(id);
    setClass($('clearModalBox'), "bg-[#fff5f8] border-2 border-[#ff7597] rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl text-[#4a2e2b]");
    setClass($('clearModalIcon'), "w-20 h-20 rounded-full bg-[#ffe4ec] border-2 border-[#ff7597] mx-auto flex items-center justify-center text-4xl animate-bounce", "🎀");
    setClass($('clearModalTitle'), "text-xl font-bold text-[#d8496e]", "오늘의 달콤 퀘스트 완독! 🌸");
    setClass($('clearModalStreak'), "text-xs text-[#ff6584] mt-1 font-bold", "✨ 반짝반짝 별빛 도장 획득 성공!");
    setClass($('clearRewardBox'), "bg-white/90 border border-[#ffd1dc] rounded-2xl p-3.5 text-left space-y-2 text-[#4a2e2b]");
    setClass($('clearExpText'), "font-eng font-bold text-[#d8496e]");
    setClass($('clearCoinText'), "font-eng font-bold text-[#e67e22]", "🍬 3 캔디");
    setClass($('clearPartnerText'), "font-eng font-bold text-[#ff6584]", "민서 & 베리 버니 💖");
    setClass($('clearReturnBtn'), "jelly-btn w-full py-3.5 rounded-2xl bg-[#ff7597] text-white font-bold text-base shadow-[0_6px_0_0_#d8496e]", "연구실로 돌아가기 🧸");
  }

  // 🚪 나가기 모달 → 민서 핑크 스킨
  function skinExitModalForMinseo() {
    const box = document.getElementById('exitModal').querySelector('div');
    setClass(box, "bg-[#fff5f8] border-2 border-[#ffd1dc] rounded-3xl max-w-xs w-full p-5 text-center space-y-3.5 shadow-2xl text-[#4a2e2b]");
    setClass(box ? box.querySelector('h3') : null, "text-lg font-bold text-[#d8496e]");
    setClass(box ? box.querySelector('.jelly-btn') : null,
      "jelly-btn w-full py-3 rounded-xl bg-[#ff7597] text-white font-bold text-sm shadow-[0_4px_0_0_#d8496e]", "계속 공부하기 🌸");
  }

  // ========================================================
  // 📝 [수학 전용] 손글씨 계산 메모장 제어
  // ========================================================
  let memoCanvas = null, memoCtx = null, isMemoDrawing = false;
  function initMathMemo() {
    memoCanvas = document.getElementById('mathMemoCanvas');
    if (!memoCanvas) return;
    memoCtx = memoCanvas.getContext('2d');

    const rect = memoCanvas.getBoundingClientRect();
    memoCanvas.width = rect.width * (global.devicePixelRatio || 1);
    memoCanvas.height = rect.height * (global.devicePixelRatio || 1);
    memoCtx.scale(global.devicePixelRatio || 1, global.devicePixelRatio || 1);
    memoCtx.strokeStyle = '#fef08a'; // 선명한 분필 노란색
    memoCtx.lineWidth = 3.5;
    memoCtx.lineCap = 'round';
    memoCtx.lineJoin = 'round';

    const getPos = (e) => {
      const r = memoCanvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return { x: clientX - r.left, y: clientY - r.top };
    };

    const startDraw = (e) => {
      isMemoDrawing = true;
      const pos = getPos(e);
      memoCtx.beginPath();
      memoCtx.moveTo(pos.x, pos.y);
    };
    const draw = (e) => {
      if (!isMemoDrawing) return;
      const pos = getPos(e);
      memoCtx.lineTo(pos.x, pos.y);
      memoCtx.stroke();
    };
    const stopDraw = () => { isMemoDrawing = false; };

    memoCanvas.onmousedown = startDraw;
    memoCanvas.onmousemove = draw;
    global.onmouseup = stopDraw;
    memoCanvas.ontouchstart = (e) => { e.preventDefault(); startDraw(e); };
    memoCanvas.ontouchmove = (e) => { e.preventDefault(); draw(e); };
    memoCanvas.ontouchend = stopDraw;
  }

  function toggleMathMemoPad() {
    const modal = document.getElementById('mathMemoModal');
    if (!modal) return;
    modal.classList.toggle('hidden');
    if (!modal.classList.contains('hidden')) {
      setTimeout(initMathMemo, 50);
    }
  }

  function clearMathMemoCanvas() {
    if (memoCanvas && memoCtx) {
      memoCtx.clearRect(0, 0, memoCanvas.width, memoCanvas.height);
    }
  }

  // ========================================================
  // 🔍 사료/실험/지도 사진 고화질 라이트박스 돋보기
  // ========================================================
  function openImageZoom(imgUrl) {
    if (!imgUrl) return;
    const modal = document.getElementById('imageZoomModal');
    const target = document.getElementById('imageZoomTarget');
    if (modal && target) {
      target.src = imgUrl;
      modal.classList.remove('hidden');
    }
  }
  function closeImageZoom() {
    const modal = document.getElementById('imageZoomModal');
    if (modal) modal.classList.add('hidden');
  }

  global.QuestRunnerUI = {
    playSound, applyChildTheme, applyDeepTrainingLabels, deepTrainingUrl, setMathMemoVisible,
    showModal, hideModal, skinRevengeModalForMinseo, skinClearModalForMinseo, skinExitModalForMinseo,
    toggleMathMemoPad, clearMathMemoCanvas, openImageZoom, closeImageZoom
  };
  // HTML onclick / 동적 생성 마크업 호환 전역
  Object.assign(global, { playSound, toggleMathMemoPad, clearMathMemoCanvas, openImageZoom, closeImageZoom });
})(window);
