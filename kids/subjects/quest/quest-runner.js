/**
 * 🚀 quest-runner.js — 5분 퀘스트 러너 진행 흐름 컨트롤러 (IIFE)
 * - URL 파라미터 파싱 → quest_engine.js getSubjectQuest 바인딩
 * - 기존 4+1 문항 렌더링·채점·하트·리벤지 배틀
 * - 🧠 3·3·3 마스터리 연결부 (quest-mastery.js + quest-ui-renderer.js)
 * - 완주 시 노션 인벤토리 보상(grantRewardAndShowUI) + 학습일지(sendStudyLogToNotion) 전송
 * - 가디언 학습 측정(StudyActivity.setPhase / recordCorrect) 연동
 * 화면 장식·효과음·메모장·사진 확대는 quest-runner-ui.js(QuestRunnerUI)를 사용합니다.
 * HTML onclick에서 부르는 함수는 window 전역으로 노출하고, 시작은 QuestRunner.boot()입니다.
 */
(function (global) {
  'use strict';

  const UI = global.QuestRunnerUI;
  const playSound = UI.playSound;

  // ========================================================
  // 🚀 퀘스트 파라미터 파싱 및 데이터 바인딩
  // (quest_engine.js, quest_data_minsu.js, quest_data_minseo.js 연동)
  // ========================================================
  const urlParams = new URLSearchParams(global.location.search);
  const currentUser = urlParams.get('user') || localStorage.getItem('currentChild') || localStorage.getItem('currentUser') || 'minsu';
  const currentSubj = urlParams.get('subject') || 'math';
  const isMinseo = (currentUser === 'minseo' || currentUser === 'daughter');
  const parentSettings = (typeof getParentQuestSettings === 'function') ? getParentQuestSettings(currentUser) : null;
  // 다중 단원 묶음은 배열(부모 설정) 또는 '|' 결합 문자열(URL)로 들어온다 → '|' 문자열로 통일
  const rawConfiguredUnit = parentSettings && parentSettings[currentSubj];
  const configuredUnit = Array.isArray(rawConfiguredUnit) ? rawConfiguredUnit.join('|') : rawConfiguredUnit;
  const currentUnit = urlParams.get('unit') || configuredUnit || (isMinseo ? (currentSubj === 'korean' ? '1' : (currentSubj === 'english' ? 'L1' : '100num')) : (currentSubj === 'math' ? 'division' : (currentSubj === 'english' ? 'L9' : '1')));
  const currentMode = urlParams.get('mode') || (isMinseo ? 'speed' : 'mixed');

  // 퀘스트 데이터 바인딩 (quest_engine.js getSubjectQuest 호출)
  // 기존 4+1 경로는 단일 단원만 알아들으므로 묶음이면 첫 단원으로 폴백 출제
  let currentQuest = getSubjectQuest(currentSubj, String(currentUnit).split('|')[0], currentMode, currentUser);

  // 실제 입력이 계측되지 않거나 전송이 실패하면 화면에서 확인할 수 있습니다.
  const guardianStatus = document.createElement('p');
  guardianStatus.id = 'guardianStudyStatus';
  guardianStatus.className = 'text-xs text-center py-2 opacity-80';
  guardianStatus.setAttribute('role', 'status');
  document.getElementById('subjectBadgeTitle').parentElement.appendChild(guardianStatus);
  function updateGuardianStudyStatus() {
    const meter = global.StudyActivity?.meter;
    if (!meter) { guardianStatus.textContent = '학습 기록을 시작하지 못했어요. 새로고침해 주세요.'; return; }
    const status = meter.getStatus(), child = isMinseo ? '민서' : '민수';
    const minutes = meter.getTodayMinutes(child), correct = meter.getTodayCorrectAnswers(child);
    const detail = !status.storageHealthy ? ' · 저장 공간을 확인해 주세요' : status.failures ? ' · 전송 대기 중' : status.pending ? ' · 동기화 중' : '';
    guardianStatus.textContent = '오늘 활동 ' + minutes + '분 · 이 기기 정답 보너스 ' + Math.floor(correct / 2) + '분' + detail;
  }
  setInterval(updateGuardianStudyStatus, 1000);
  updateGuardianStudyStatus();
  const guardianAttemptId = crypto.randomUUID();
  const guardianQuestionIds = new WeakMap();
  let currentIndex = 0;
  let selectedOptionIndex = null;
  let hearts = 3;
  let isAnswerChecked = false;
  let sessionMissedQuestions = [];
  let sessionWrongLogs = [];
  let isRevengeMode = false;

  // 초기 화면 렌더링 & 파트너 몬스터/요정 포즈·3단 리액션 동기화 (자작 캐릭터 3단 리액션 헌법 준수)
  function syncCheerMonsterReaction(state = 'stageStart', overrideSpeech = null) {
    const monsterEl = document.getElementById('cheerMonster');
    const speechEl = document.getElementById('cheerSpeech');

    let poseSrc = null;
    let monsterName = '파트너';
    let line = overrideSpeech;
    let animClass = 'animate-cheer';

    if (state === 'correct') {
      animClass = 'victory-jump';
    } else if (state === 'encourage') {
      animClass = 'shake-gentle';
    } else if (state === 'clear') {
      animClass = 'animate-cheer scale-110';
    }

    if (isMinseo) {
      // 🌸 민서 요정 코코 & 삼총사 다정한 격려 리액션
      monsterName = '요정 코코';
      const minseoDialogues = {
        stageStart: '오늘도 예쁘게 5분 퀘스트 시작! 🌸',
        correct: ['우와 정답이야! 민서 최고! ✨💖', '대단해! 별빛 보석이 반짝반짝! 💎', '잘하고 있어 민서야! 힘내자! 🌸'],
        encourage: ['괜찮아 민서야! 힌트를 보고 한 번 더 골라보자! 🌱', '아깝다! 다시 읽어보면 바로 맞힐 수 있어! 💡'],
        clear: '와아아!! 오늘 퀘스트 완벽 클리어!! 🌸🏆'
      };
      if (!line) {
        const d = minseoDialogues[state] || minseoDialogues.stageStart;
        line = Array.isArray(d) ? d[Math.floor(Math.random() * d.length)] : d;
      }
    } else if (global.MonsterRoster) {
      // 👾 민수 자작 캐릭터 (콧툰봉돔돌 / 클레이 바이트)
      const monster = global.MonsterRoster.getSelectedMonster();
      const reaction = global.MonsterRoster.getRunnerReaction(state, monster.id);
      poseSrc = reaction.poseSrc;
      monsterName = monster.name;
      if (!line) line = reaction.speech;
    }

    if (monsterEl) {
      if (poseSrc && monsterEl.getAttribute('src') !== poseSrc) {
        monsterEl.src = poseSrc;
      }
      monsterEl.alt = monsterName;
      // CSS 키프레임 애니메이션 리셋 및 재점화
      monsterEl.className = 'w-14 h-14 object-contain filter drop-shadow-md transition-transform';
      void monsterEl.offsetWidth; // Force Reflow
      monsterEl.className = `${animClass} w-14 h-14 object-contain filter drop-shadow-md transition-transform`;
    }

    if (speechEl && line) {
      speechEl.textContent = `"${String(line).replace(/^"|"$/g, '')}"`;
    }
  }


  function initScreen() {
    UI.applyChildTheme(isMinseo);
    if (!isMinseo && global.MonsterRoster) {
      global.MonsterRoster.preloadAllMonsters();
    }
    document.getElementById('subjectBadgeIcon').textContent = currentQuest.icon;
    document.getElementById('subjectBadgeTitle').textContent = currentQuest.title;
    UI.applyDeepTrainingLabels(isMinseo, currentSubj, currentQuest);
    UI.setMathMemoVisible(currentSubj === 'math');
    renderQuestion();
  }

  // ========================================================
  // 🧠 3·3·3 마스터리 연결부 (quest-mastery.js + quest-ui-renderer.js)
  // - VOCA_DB 어휘 단원이면 마스터리 판, 아니면 기존 4+1 그대로 (수학·사료·민서 정적 뱅크)
  // ========================================================
  let masteryRound = null;

  async function bootQuest() {
    const canMastery = global.QuestMastery && global.QuestUIRenderer && urlParams.get('engine') !== 'classic'
      && QuestMastery.isEligibleSubject(currentSubj);
    if (canMastery) {
      document.getElementById('questionText').textContent = '단원 진도를 불러오는 중이에요... ⏳';
      try {
        // 🛡️ 최대 3초만 기다림: 노션이 늦으면 loadUnit이 조회를 끊고 오늘 캐시로 출제 (캐시도 없으면 아래 정적 폴백)
        const unit = await QuestMastery.loadUnit({ child: isMinseo ? 'minseo' : 'minsu', subj: currentSubj, unit: currentUnit, budgetMs: 3000 });

        if (unit && Array.isArray(unit.items) && unit.items.length > 0) {
          const round = QuestMastery.buildRound({ child: unit.child, items: unit.items, subj: currentSubj });
          if (round && Array.isArray(round.questions) && round.questions.length > 0) {
            masteryRound = { ...round, child: unit.child, items: unit.items };
            // 제목 = 과목방 이름 + 실제로 불러온 노션 단원명
            const brand = String(currentQuest.title).split(' · ')[0];
            const unitName = QuestMastery.unitTitle(unit.items, unit.units);
            currentQuest = { title: `${brand} · ${unitName || '3·3·3 마스터리'}`, icon: currentQuest.icon, questions: round.questions };
            document.getElementById('heartIcons').parentElement.classList.add('hidden');
          } else {
            throw new Error('empty_mastery_questions');
          }
        } else {
          throw new Error('empty_unit_items');
        }
      } catch (e) {
        console.warn('[3·3·3 마스터리] 노션 지연/캐시 부재로 기본 퀘스트로 즉시 전환합니다:', e.message || e);
        masteryRound = null;
      }
    }

    // 🛡️ 최종 방어선: currentQuest의 questions가 비어있으면 절대 멈추지 않고 정적 문제은행으로 즉시 복구
    if (!currentQuest || !Array.isArray(currentQuest.questions) || currentQuest.questions.length === 0) {
      console.warn('[Quest Fallback] 문제 배열 부재 감지 -> 정적 폴백 뱅크 재로딩');
      currentQuest = getSubjectQuest(currentSubj, '', 'fallback', currentUser);
    }

    initScreen();
  }

  function renderMasteryProgress() {
    const box = document.getElementById('masteryProgress');
    const summary = QuestMastery.getProgressSummary(masteryRound.child, masteryRound.items);
    QuestUIRenderer.renderProgressHeader(box, summary, masteryRound.meta, isMinseo ? 'minseo' : 'minsu');
    box.classList.remove('hidden');
  }

  function renderMasteryQuestion(q) {
    if (typeof stopFairyTTS === 'function') stopFairyTTS();
    document.getElementById('stepCounter').textContent = `문제 ${currentIndex + 1} / ${currentQuest.questions.length}`;
    document.getElementById('progressBar').style.width = `${((currentIndex + 1) / currentQuest.questions.length) * 100}%`;
    ['classicQuestionCard', 'choicesList'].forEach(id => document.getElementById(id).classList.add('hidden'));
    document.getElementById('checkAnswerBtn').parentElement.classList.add('hidden');
    document.getElementById('feedbackSheet').classList.add('hidden');
    const stageStartSpeech = q.isRustyReview
      ? '반짝이던 왕관에 먼지가 쌓였어! 다시 닦아 보자! 👑'
      : (isMinseo ? '"천천히 해도 괜찮아! 힌트를 보면서 해보자! 🌸"' : null);
    syncCheerMonsterReaction(currentIndex === 0 ? 'stageStart' : 'idle', stageStartSpeech);
    renderMasteryProgress();
    const stage = document.getElementById('masteryStage');
    stage.classList.remove('hidden');
    QuestUIRenderer.render(stage, q, {
      theme: isMinseo ? 'minseo' : 'minsu',
      speak: (text, lang) => {
        if (lang === 'en' && typeof speakEnglish === 'function') return speakEnglish(text);
        if (typeof speakFairyTTS === 'function') speakFairyTTS(text, null, { forceVoice: lang === 'en' ? 'en-US-JennyNeural' : 'ko-KR-SunHiNeural' });
      },
      onPraise: () => {
        playSound('correct');
        syncCheerMonsterReaction('correct');
        if (typeof fairyPraise === 'function') fairyPraise();
      },
      onEncourage: () => {
        syncCheerMonsterReaction('encourage');
        if (typeof fairyEncourage === 'function') fairyEncourage();
      },
      onDone: result => handleMasteryDone(q, result)
    });
  }

  function handleMasteryDone(q, result) {
    const changed = QuestMastery.applyResult(masteryRound.child, q, result.results);
    result.results.forEach(r => {
      if (r.firstTry) global.StudyActivity?.recordCorrect?.(`${guardianAttemptId}:${q.id}:${r.id}`);
    });
    if (!result.firstTry) {
      sessionWrongLogs.push({ q: q.q, chosen: '힌트 보고 해결', answer: q.items ? q.items.map(i => i.word).join(', ') : q.item.word });
    }
    renderMasteryProgress();

    const after = changed.map(c => c.after.c);
    let title = isMinseo ? '참 잘했어요! 🌸' : '좋아! 해냈어! 🎉';
    let desc = result.firstTry ? '첫 번에 성공! 숙련도 +1 ⬆️' : '힌트를 보고 스스로 해결했어요! 다음엔 첫 번에 도전! 💪';
    if (q.noCredit) desc = '복습 완료! 오늘은 은메달 상한선이라 내일 승급할 수 있어요 🥈';
    if (after.includes(QuestMastery.SILVER) && changed.some(c => c.before.c < QuestMastery.SILVER)) desc = '🥈 은메달 달성! 내일 다시 오면 금메달 도전이 열려요!';
    if (after.includes(QuestMastery.GOLD) && changed.some(c => c.before.c < QuestMastery.GOLD)) desc = '👑 금메달 마스터! 완벽하게 외웠어요!';
    if (q.isRustyReview && !result.firstTry) desc = '왕관을 다시 닦아야 해요. 은메달 직전 단계에서 다시 키워 보자! ✨';

    const box = document.getElementById('feedbackBox');
    box.className = isMinseo
      ? 'max-w-md mx-auto p-5 rounded-t-3xl shadow-2xl border-t-4 border-[#ff6584] bg-[#fff5f8] text-[#4a2e2b] space-y-3'
      : 'max-w-md mx-auto p-5 rounded-t-3xl shadow-2xl border-t-4 border-neon-green bg-[#112d14] text-white space-y-3';
    document.getElementById('feedbackTitle').textContent = title;
    document.getElementById('feedbackDesc').textContent = desc;
    document.getElementById('feedbackIconWrapper').textContent = result.firstTry ? '✨' : '💡';
    document.getElementById('nextStepBtn').className = isMinseo
      ? 'jelly-btn w-full py-3.5 rounded-2xl font-bold text-base text-center bg-[#ff7597] text-white shadow-[0_4px_0_0_#d8496e]'
      : 'jelly-btn w-full py-3.5 rounded-2xl font-bold text-base text-center bg-neon-green text-[#023300] shadow-[0_4px_0_0_#045300]';
    document.getElementById('feedbackSheet').classList.remove('hidden');
  }

  // ========================================================
  // 📋 기존 4+1 문항 렌더링·선택·채점
  // ========================================================
  function renderQuestion() {
    if (typeof stopFairyTTS === 'function') stopFairyTTS();
    if (global.StudyActivity?.setPhase && global.__guardianStudyPhase !== 'quiz') global.StudyActivity.setPhase('quiz');
    const q = currentQuest.questions[currentIndex];
    if (q && q.masteryType) return renderMasteryQuestion(q);
    selectedOptionIndex = null;
    isAnswerChecked = false;

    // 헤더 상태 갱신
    const stepCounterEl = document.getElementById('stepCounter');
    if (q.isPreview) {
      stepCounterEl.innerHTML = `<span class="bg-amber-400 text-amber-950 px-2.5 py-0.5 rounded-full text-[11px] font-bold shadow-sm animate-pulse">🎁 비밀 맛보기 (하트 0)</span>`;
    } else {
      stepCounterEl.textContent = `문제 ${currentIndex + 1} / ${currentQuest.questions.length}`;
    }
    document.getElementById('progressBar').style.width = `${((currentIndex + 1) / currentQuest.questions.length) * 100}%`;

    // 문제 텍스트 & 수식 (HTML 세로 분수 & 노션 시각자료 렌더링)
    document.getElementById('questionText').innerHTML = q.q;
    let formulaHtml = q.formula || '';
    if (q.imageUrl) {
      formulaHtml += `<div class="mt-2 text-center">
          <img src="${q.imageUrl}" class="max-h-48 mx-auto rounded-2xl border-2 border-white/20 shadow-md object-contain cursor-pointer hover:scale-105 active:scale-95 transition-all" alt="시각 자료" onclick="openImageZoom('${q.imageUrl}')" />
          <span class="block text-xs text-gray-400 mt-1.5 font-sans">🔍 사진을 터치하면 크게 볼 수 있어요</span>
        </div>`;
    }
    if (q.interactiveUrl) {
      formulaHtml += `<div class="mt-2 text-center"><a href="${q.interactiveUrl}" target="_blank" class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${isMinseo ? 'bg-[#ff6584]/15 text-[#ff6584] border border-[#ff6584]/30' : 'bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/30'} hover:opacity-80 transition-all">🔬 인터랙티브 탐구관 열기 ↗</a></div>`;
    }
    document.getElementById('formulaBox').innerHTML = formulaHtml;

    if (q.isPreview) {
      const previewSpeech = isMinseo
        ? `"와! 내일 배울 비밀 낱말이야! 틀려도 하트 안 깎이니까 편하게 골라봐! 🌸"`
        : `"다음 단원 맛보기 탐험이야! 힌트를 잘 보고 자유롭게 도전해봐! ⚡"`;
      syncCheerMonsterReaction('idle', previewSpeech);
    } else if (isMinseo) {
      document.getElementById('cheerSpeech').textContent = `"민서야 힘내! 예쁜 별빛을 모아보자! 🌸"`;
    } else {
      syncCheerMonsterReaction(currentIndex === 0 || isRevengeMode ? 'stageStart' : 'idle');
    }

    // 오디오 버튼 제어 (영어 및 국어 듣기 문제 지원)
    const audioWrapper = document.getElementById('audioPlayWrapper');
    const audioBtnText = document.getElementById('audioPlayBtnText');
    if (q.audioText) {
      audioWrapper.classList.remove('hidden');
      if (audioBtnText) {
        audioBtnText.textContent = (q.audioLang === 'ko' || currentSubj === 'korean') ? "🎧 소리 듣기" : "🎧 Jenny 원어민 발음 듣기";
      }
    } else {
      audioWrapper.classList.add('hidden');
    }

    // 선택지 렌더링 (세로 분수 완벽 지원)
    const list = document.getElementById('choicesList');
    list.innerHTML = '';
    q.options.forEach((opt, idx) => {
      const btn = document.createElement('button');
      if (isMinseo) {
        btn.className = `jelly-btn w-full bg-white/95 border-2 border-[#ffd1dc] hover:border-[#ff6584] py-3.5 px-4 rounded-2xl flex items-center justify-between text-left text-sm font-bold shadow-sm transition-all text-[#4a2e2b]`;
        btn.innerHTML = `
            <div class="flex items-center gap-3">
              <span class="w-6 h-6 rounded-full bg-[#fff0f5] flex items-center justify-center text-xs font-eng text-[#ff6584] font-bold border border-[#ffd1dc]">${idx + 1}</span>
              <span class="text-[#4a2e2b] text-base font-bold">${opt}</span>
            </div>
            <span class="material-symbols-outlined text-transparent text-lg check-icon">check_circle</span>
          `;
      } else {
        btn.className = `jelly-btn w-full bg-lab-card/90 border-2 border-lab-card-border hover:border-neon-cyan/60 py-3 px-4 rounded-2xl flex items-center justify-between text-left text-sm font-bold shadow-md transition-all`;
        btn.innerHTML = `
            <div class="flex items-center gap-3">
              <span class="w-6 h-6 rounded-full bg-lab-bg flex items-center justify-center text-xs font-eng text-gray-400 border border-lab-card-border">${idx + 1}</span>
              <span class="text-white text-base">${opt}</span>
            </div>
            <span class="material-symbols-outlined text-transparent text-lg check-icon">check_circle</span>
          `;
      }
      btn.id = `opt-${idx}`;
      btn.onclick = () => selectChoice(idx);
      list.appendChild(btn);
    });

    // 확인 버튼 초기화
    const checkBtn = document.getElementById('checkAnswerBtn');
    checkBtn.disabled = true;
    if (isMinseo) {
      checkBtn.className = "jelly-btn w-full bg-[#ff7597] text-white py-4 rounded-2xl text-center shadow-[0_6px_0_0_#d8496e] font-bold text-lg tracking-wide border border-[#ffa3ba] disabled:opacity-40 disabled:cursor-not-allowed";
      checkBtn.style.setProperty('--depth-color', '#d8496e');
    } else {
      checkBtn.className = "jelly-btn w-full bg-neon-green text-[#023300] py-4 rounded-2xl text-center shadow-[0_6px_0_0_#045300] font-bold text-lg tracking-wide border border-[#55ff35] disabled:opacity-40 disabled:cursor-not-allowed";
      checkBtn.style.setProperty('--depth-color', '#045300');
    }

    // 바텀시트 닫기
    document.getElementById('feedbackSheet').classList.add('hidden');
  }

  // 소리 / 발음 듣기 (공부방 SSOT 단일 오디오 파이프라인: 영어는 Jenny 원어민 0.85x, 국어는 SunHi)
  function playQuestionAudio() {
    const q = currentQuest.questions[currentIndex];
    if (!q || !q.audioText) return;
    playSound('tap');

    const isEnglish = currentSubj === 'english' || q.audioLang === 'en' || (typeof isEnglishText === 'function' && isEnglishText(q.audioText));

    if (isEnglish && typeof speakEnglish === 'function') {
      speakEnglish(q.audioText);
      return;
    }

    if (typeof speakFairyTTS === 'function') {
      speakFairyTTS(q.audioText, null, { forceVoice: isEnglish ? 'en-US-JennyNeural' : 'ko-KR-SunHiNeural' });
    }
  }

  // 보기 선택 (민서: 핑크 테두리 / 민수: 네온 그린 테두리)
  function selectChoice(index) {
    if (isAnswerChecked) return;
    playSound('tap');
    selectedOptionIndex = index;

    const on = isMinseo ? ['border-[#ff6584]', 'bg-[#ffeef2]'] : ['border-neon-green', 'bg-neon-green/10'];
    const off = isMinseo ? 'border-[#ffd1dc]' : 'border-lab-card-border';
    const iconOn = isMinseo ? 'text-[#ff6584]' : 'text-neon-green';
    currentQuest.questions[currentIndex].options.forEach((_, idx) => {
      const el = document.getElementById(`opt-${idx}`);
      if (!el) return;
      const icon = el.querySelector('.check-icon');
      if (idx === index) {
        el.classList.add(...on);
        el.classList.remove(off);
        if (icon) {
          icon.classList.remove('text-transparent');
          icon.classList.add(iconOn);
        }
      } else {
        el.classList.remove(...on);
        el.classList.add(off);
        if (icon) {
          icon.classList.add('text-transparent');
          icon.classList.remove(iconOn);
        }
      }
    });

    document.getElementById('checkAnswerBtn').disabled = false;
  }

  // 정답 확인
  function handleCheckAnswer() {
    if (selectedOptionIndex === null || isAnswerChecked) return;
    isAnswerChecked = true;

    const q = currentQuest.questions[currentIndex];
    const isCorrect = selectedOptionIndex === q.answer;

    const sheet = document.getElementById('feedbackSheet');
    const box = document.getElementById('feedbackBox');
    const title = document.getElementById('feedbackTitle');
    const desc = document.getElementById('feedbackDesc');
    const nextBtn = document.getElementById('nextStepBtn');
    const iconWrap = document.getElementById('feedbackIconWrapper');
    const monster = document.getElementById('cheerMonster');

    sheet.classList.remove('hidden');

    if (isCorrect) {
      playSound('correct');
      syncCheerMonsterReaction('correct');
      recordCorrectItem(currentUser, currentSubj, q);
      if (!guardianQuestionIds.has(q)) guardianQuestionIds.set(q, `${guardianAttemptId}:${crypto.randomUUID()}`);
      global.StudyActivity?.recordCorrect?.(guardianQuestionIds.get(q));

      if (typeof fairyPraise === 'function') {
        fairyPraise();
      } else if (typeof speakFairyTTS === 'function') {
        speakFairyTTS(isMinseo ? "정답이야! 참 잘했어!" : "정답이야! 대단해!");
      }

      if (monster) {
        monster.classList.remove('victory-jump');
        void monster.offsetWidth;
        monster.classList.add('victory-jump');
      }

      const expBonus = q.isPreview ? 20 : 10;
      const currencyBonus = q.isPreview ? 6 : 3;
      const bonusTag = q.isPreview ? " (🎁 비밀 맛보기 2배!)" : "";

      if (isMinseo) {
        box.className = "max-w-md mx-auto p-5 rounded-t-3xl shadow-2xl border-t-4 border-[#ff6584] bg-[#fff5f8] text-[#4a2e2b] space-y-3";
        title.textContent = q.isPreview ? "대단해! 비밀 탐험 정답이야! 🌸" : "참 잘했어요! 정답이야! 🌸";
        title.className = "text-base font-bold text-[#d8496e]";
        desc.textContent = `+${expBonus} EXP / +${currencyBonus} 🍬 획득!${bonusTag}`;
        desc.className = "text-xs text-[#a03a57] font-bold";
        iconWrap.textContent = "💖";
        iconWrap.className = "w-10 h-10 rounded-full bg-[#ffe4ec] text-[#ff6584] flex items-center justify-center text-xl";
        nextBtn.className = "jelly-btn w-full py-3.5 rounded-2xl font-bold text-base text-center bg-[#ff7597] text-white shadow-[0_4px_0_0_#d8496e]";
      } else {
        box.className = "max-w-md mx-auto p-5 rounded-t-3xl shadow-2xl border-t-4 border-neon-green bg-[#112d14] text-white space-y-3";
        title.textContent = q.isPreview ? "대단해! 다음 단원 맛보기 정답! 🎉" : "대단해! 정답이야! 🎉";
        title.className = "text-base font-bold text-neon-green";
        desc.textContent = `+${expBonus} EXP / +${currencyBonus} 🪙 획득!${bonusTag}`;
        desc.className = "text-xs opacity-90";
        iconWrap.textContent = "✨";
        iconWrap.className = "w-10 h-10 rounded-full bg-neon-green/20 text-neon-green flex items-center justify-center text-xl";
        nextBtn.className = "jelly-btn w-full py-3.5 rounded-2xl font-bold text-base text-center bg-neon-green text-[#023300] shadow-[0_4px_0_0_#045300]";
      }
    } else {
      playSound('wrong');
      syncCheerMonsterReaction('encourage');
      recordWrongItem(currentUser, currentSubj, q);
      if (!sessionMissedQuestions.some(m => m.q === q.q)) {
        sessionMissedQuestions.push(q);
      }

      if (typeof fairyEncourage === 'function') {
        fairyEncourage();
      } else if (typeof speakFairyTTS === 'function') {
        speakFairyTTS(q.isPreview ? "괜찮아! 내일 배울 거니까!" : (isMinseo ? "괜찮아! 다시 해보자!" : "아쉬워! 다시 힘내보자!"));
      }

      // 📝 노션 오답 리포트용 상세 로그 수집
      sessionWrongLogs.push({
        q: q.q,
        chosen: q.options[selectedOptionIndex] || "선택지 확인",
        answer: q.options[q.answer] || ""
      });

      // 🛡️ [맛보기 특권] isPreview 문항은 하트를 깎지 않음!
      if (!q.isPreview) {
        hearts = Math.max(0, hearts - 1);
        updateHearts();
      }

      const vocaWord = q.word || null;
      const vocaLinkHtml = vocaWord ? `
          <div class="mt-2">
            <a href="./kids/common_space/voca.html?subject=${encodeURIComponent(currentSubj)}&search=${encodeURIComponent(vocaWord)}" target="_blank" class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${isMinseo ? 'bg-[#ffe4ec] text-[#d8496e] border border-[#ffb6c1]' : 'bg-white/10 text-yellow-300 border border-yellow-500/40'}">
              📖 [${vocaWord}] 용어사전에서 확인 ↗
            </a>
          </div>
        ` : '';

      if (isMinseo) {
        box.className = "max-w-md mx-auto p-5 rounded-t-3xl shadow-2xl border-t-4 border-[#ff9aa2] bg-[#fff0f2] text-[#4a2e2b] space-y-3";
        title.textContent = q.isPreview ? "괜찮아요! 내일 배울 비밀 탐험이에요! 💡" : "아쉬워요! 다시 해볼까요? 💡";
        title.className = "text-base font-bold text-[#e05769]";
        desc.innerHTML = (q.isPreview ? "<span class='text-xs text-amber-700 font-bold'>[하트 차감 0]</span> " : "") + `정답 해설: ${q.hint}` + vocaLinkHtml;
        desc.className = "text-xs text-[#8c3a45]";
        iconWrap.textContent = "💧";
        iconWrap.className = "w-10 h-10 rounded-full bg-[#ffebee] text-[#ff6b81] flex items-center justify-center text-xl";
        nextBtn.className = "jelly-btn w-full py-3.5 rounded-2xl font-bold text-base text-center bg-[#ff9aa2] text-white shadow-[0_4px_0_0_#d46a74]";
      } else {
        box.className = "max-w-md mx-auto p-5 rounded-t-3xl shadow-2xl border-t-4 border-fire-orange bg-[#331811] text-white space-y-3";
        title.textContent = q.isPreview ? "괜찮아요! 다음 단원 맛보기 탐험이에요! 💡" : "아까워요! 💡";
        title.className = "text-base font-bold text-fire-orange";
        desc.innerHTML = (q.isPreview ? "<span class='text-xs text-yellow-400 font-bold'>[하트 차감 0]</span> " : "") + `정답 해설: ${q.hint}` + vocaLinkHtml;
        desc.className = "text-xs opacity-90";
        iconWrap.textContent = "💔";
        iconWrap.className = "w-10 h-10 rounded-full bg-fire-orange/20 text-fire-orange flex items-center justify-center text-xl";
        nextBtn.className = "jelly-btn w-full py-3.5 rounded-2xl font-bold text-base text-center bg-fire-orange text-white shadow-[0_4px_0_0_#602a00]";
      }
    }
  }

  function updateHearts() {
    document.getElementById('heartIcons').textContent = "❤️".repeat(hearts) + "🖤".repeat(3 - hearts);
  }

  // 다음 문제로 이동 (오답 발생 시 리벤지 배틀 트리거)
  function goToNextStep() {
    playSound('tap');
    if (currentIndex + 1 < currentQuest.questions.length) {
      currentIndex++;
      renderQuestion();
    } else if (sessionMissedQuestions.length > 0 && !isRevengeMode) {
      showRevengeModal();
    } else {
      showClearModal();
    }
  }

  // ========================================================
  // ⚔️ 리벤지 배틀 & 🏆 클리어 (노션 보상·학습일지 전송)
  // ========================================================
  function showRevengeModal() {
    playSound('wrong');
    if (isMinseo) UI.skinRevengeModalForMinseo();
    UI.showModal('revengeModal');
  }

  // ⚔️ 놓친 문제 즉시 복수전 시작 (당일 100% 구출 성공)
  function startRevengeRound() {
    playSound('tap');
    UI.hideModal('revengeModal');
    isRevengeMode = true;
    currentQuest = {
      title: isMinseo ? `🌸 ${currentQuest.title} · 별빛 구출` : `⚔️ ${currentQuest.title} · 리벤지 배틀`,
      icon: isMinseo ? "🐰" : "👾",
      questions: [...sessionMissedQuestions]
    };
    sessionMissedQuestions = [];
    currentIndex = 0;
    hearts = 3;
    updateHearts();
    renderQuestion();
  }

  // 복수전 스킵하고 클리어 모달로
  function skipRevengeAndClear() {
    playSound('tap');
    UI.hideModal('revengeModal');
    showClearModal();
  }

  const KOREAN_SUBJ_MAP = { math: "수학", english: "영어", korean: "국어", science: "과학", society: "사회", voca: "용어", haru: "하루" };

  // 5문제 완독 모달 (노션 인벤토리 보상 DB + 노션 학습일지 DB 자동 전송)
  async function showClearModal() {
    if (global.StudyActivity?.setPhase) global.StudyActivity.setPhase('paused');
    // 🧠 완주 시 변경된 단어만 노션 VOCA_DB '숙련도'/'달성' 백그라운드 동기화 (Non-blocking)
    if (masteryRound) {
      QuestMastery.pushChanges(masteryRound.child)
        .then(r => console.log(`[3·3·3 마스터리 동기화] 전송 ${r.sent}건 / 실패 ${r.failed}건`))
        .catch(e => console.warn('[3·3·3 마스터리 동기화 알림]', e));
    }
    playSound('fanfare');
    syncCheerMonsterReaction('clear');
    if (typeof fairyReward === 'function') {
      fairyReward();
    } else if (typeof speakFairyTTS === 'function') {
      speakFairyTTS(isMinseo ? "축하해! 퀘스트 완료!" : "퀘스트 완료!");
    }

    if (isMinseo) {
      UI.skinClearModalForMinseo();
    } else if (global.MonsterRoster) {
      const monster = global.MonsterRoster.getSelectedMonster();
      const clearPartnerEl = document.getElementById('clearPartnerText');
      if (clearPartnerEl && monster) {
        clearPartnerEl.textContent = `${monster.number} ${monster.name} ➔ 100% 💖`;
      }
    }
    UI.showModal('clearModal');

    const curKoreanSubj = KOREAN_SUBJ_MAP[currentSubj] || "국어";

    // 💎 1. 노션 인벤토리 DB 연동 (보상 +3💎/🍬, +50 EXP 지급)
    if (typeof grantRewardAndShowUI === 'function') {
      try {
        global.currentSubject = curKoreanSubj;
        await grantRewardAndShowUI(3, true);
        console.log(`[노션 인벤토리 동기화 완료] ${curKoreanSubj} 보상 반영`);
      } catch (e) {
        console.warn("[노션 보상 동기화 알림]", e);
      }
    }

    // 📝 2. 노션 학습일지 DB 연동 (오답 리포트 수집 및 5분 소요시간 전송)
    if (typeof sendStudyLogToNotion === 'function') {
      try {
        const missedSummary = sessionWrongLogs.length > 0
          ? sessionWrongLogs.map((item, idx) => `[${idx + 1}] ${String(item.q).replace(/\n/g, ' ')} ➔ 선택: "${item.chosen}" / 정답: "${item.answer}"`).join(' // ')
          : "🎉 100% 올클리어! 모든 문제를 완벽히 맞혔습니다! (마스터)";

        const activeStudentName = isMinseo ? '민서' : '민수';

        await sendStudyLogToNotion({
          childName: activeStudentName,
          subject: curKoreanSubj,
          durationMinutes: 5,
          errorReport: missedSummary
        });
        console.log(`[노션 학습일지 동기화 완료] 학생: ${activeStudentName} | 과목: ${curKoreanSubj} | 오답: ${missedSummary}`);
      } catch (e) {
        console.warn("[노션 학습일지 동기화 알림]", e);
      }
    }
  }

  // ========================================================
  // 🧭 화면 이동 & 나가기 모달
  // ========================================================
  function returnToLab() {
    playSound('tap');
    global.location.href = `monster_lab.html?user=${currentUser}`;
  }

  function goToSubjectDeepTraining() {
    playSound('tap');
    global.location.href = UI.deepTrainingUrl(isMinseo, currentSubj);
  }

  // 🏠 공부방 메인 로비로 직결
  function goToLobby() {
    playSound('tap');
    global.location.href = `lobby.html?user=${currentUser}`;
  }

  function confirmExit() {
    playSound('tap');
    if (isMinseo) UI.skinExitModalForMinseo();
    UI.showModal('exitModal');
  }

  function closeExitModal() {
    playSound('tap');
    UI.hideModal('exitModal');
  }

  global.QuestRunner = { boot: bootQuest };
  // HTML onclick 호환 전역
  Object.assign(global, {
    handleCheckAnswer, goToNextStep, playQuestionAudio, selectChoice,
    startRevengeRound, skipRevengeAndClear, confirmExit, closeExitModal,
    returnToLab, goToSubjectDeepTraining, goToMathDeepTraining: goToSubjectDeepTraining, goToLobby
  });
})(window);
