// kids/js/english_listen_place.js
// 🎧 [영어 공통 엔진] 듣고 끌어다 놓기 (Listen & Place) 엔진
// - 문장을 듣고 물건을 끌어다 놓거나 눌러서 채점하는 단원 확장형 공통 엔진
// - 에러리스 학습 피드백, 폰(375px) 무스크롤, VOCA_DB 실시간 연동
// - 전역 네임스페이스: window.EnglishListenPlace

(function() {
  'use strict';

  window.currentSubject = '영어';

  const SCENES = {};
  if (window._PENDING_SCENES) Object.assign(SCENES, window._PENDING_SCENES);

  let _currentScene = null;
  let _sceneData = null;
  let _questions = [];
  let _currentQIdx = 0;
  let _currentQuestion = null;
  let _vocaMap = {};
  let _currentAnswerFound = [];
  let _totalCorrect = 0;
  let _wrongLogs = [];
  let _container = null;
  let _stageEl = null;
  let _trayCards = new Map();
  let _finaleCandidates = [];

  function registerScene(name, sceneObj) {
    SCENES[name] = sceneObj;
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }

  function speak(text) {
    if (!text) return;
    if (typeof window.speakEnglish === 'function') window.speakEnglish(text);
    else if (typeof window.fairySpeak === 'function') window.fairySpeak(text, 'en');
  }

  function shuffle(arr) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  /**
   * 받침대(트레이) 물건 4개 고르기
   * - 정답 물건을 먼저 넣고, 같은 부위(slot)의 다른 물건으로 채운다.
   * - 같은 부위에 확실히 다른 물건이 3개가 안 되면(예: 안경), 다른 부위 물건(모자 등)으로 채운다.
   */
  function pickTrayItems(allItems, answers) {
    const answerItems = allItems.filter(item => answers.includes(item.id));
    const answerSlots = [...new Set(answerItems.map(it => it.slot))];
    const picked = [...answerItems];

    const sameSlotDistractors = shuffle(
      allItems.filter(item => answerSlots.includes(item.slot) && !answers.includes(item.id))
    );
    for (const item of sameSlotDistractors) {
      if (picked.length >= 4) break;
      picked.push(item);
    }

    if (picked.length < 4) {
      const headItems = shuffle(allItems.filter(item => item.slot === 'head' && !picked.some(p => p.id === item.id)));
      const otherItems = shuffle(allItems.filter(item => item.slot !== 'head' && !picked.some(p => p.id === item.id)));
      for (const item of [...headItems, ...otherItems]) {
        if (picked.length >= 4) break;
        picked.push(item);
      }
    }
    return shuffle(picked);
  }

  /**
   * 정답/오답 판정 순수 함수 (엔진 내부 및 단위 시험 공용)
   */
  function judgeAttempt(question, foundAnswers, item) {
    const answers = (question && question.answer) || [];
    const currentFound = Array.isArray(foundAnswers) ? [...foundAnswers] : [];
    const isCorrect = Boolean(item && answers.includes(item.id));

    if (isCorrect) {
      if (!currentFound.includes(item.id)) currentFound.push(item.id);
      const completed = answers.length > 0 && answers.every(ansId => currentFound.includes(ansId));
      return { correct: true, completed, foundAnswers: currentFound, guideTargets: [], wrongLog: null };
    }

    const guideTargets = answers.filter(ansId => !currentFound.includes(ansId));
    const wrongLabel = (item && (item.label || item.id)) || '알 수 없음';
    const wrongLog = `${(question && question.text) || ''} (오답: ${wrongLabel})`;
    return { correct: false, completed: false, foundAnswers: currentFound, guideTargets, wrongLog };
  }

  function buildFinaleCandidates(allItems, finaleQ) {
    const targetItems = allItems.filter(it => finaleQ.answer.includes(it.id));
    const c1 = { who: finaleQ.who || 'she', isAnswer: true, items: [...targetItems] };

    const distractorItems1 = targetItems.map((tItem, idx) => {
      if (idx === 0) return allItems.find(it => it.slot === tItem.slot && it.id !== tItem.id) || tItem;
      return tItem;
    });
    const c2 = { who: finaleQ.who || 'she', isAnswer: false, items: distractorItems1 };

    const distractorItems2 = targetItems.map((tItem, idx) => {
      if (idx === targetItems.length - 1) {
        return allItems.find(
          it => it.slot === tItem.slot && it.id !== tItem.id && !distractorItems1.some(d => d.id === it.id)
        ) || tItem;
      }
      return tItem;
    });
    const c3 = { who: finaleQ.who === 'she' ? 'he' : 'she', isAnswer: false, items: distractorItems2 };
    return shuffle([c1, c2, c3]);
  }

  function resolveChildName() {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        const user = localStorage.currentUser || (typeof localStorage.getItem === 'function' ? localStorage.getItem('currentUser') : '');
        if (user === 'daughter') return '민서';
      }
    } catch (_) {}
    return '민수';
  }

  async function init(options) {
    const { sceneData, containerId } = options || {};
    window.currentSubject = '영어';
    _container = document.getElementById(containerId || 'listenPlaceApp');
    if (!_container) return;

    _sceneData = sceneData || window.LISTEN_PLACE_SCENE;
    if (!_sceneData) return renderError('장면 데이터를 불러오지 못했어요.');

    const sceneName = _sceneData.scene || 'dressup';
    _currentScene = SCENES[sceneName];
    if (!_currentScene) return renderError(`장면 모듈 [${escapeHtml(sceneName)}]이 등록되지 않았습니다.`);

    renderLoading('문장 데이터를 불러오고 있어요...');
    try {
      const vocaList = typeof window.fetchVocaFromNotion === 'function'
        ? await window.fetchVocaFromNotion({ subject: '영어', filterByStudent: false })
        : [];
      _vocaMap = {};
      (vocaList || []).forEach(row => {
        const pid = row && (row.pageId || row.id);
        if (pid) _vocaMap[pid] = { word: row.word || '', meaning: row.meaning || '' };
      });
    } catch (e) {
      console.warn('[EnglishListenPlace] VOCA DB 조회 중 경고:', e);
    }

    const validQuestions = [];
    (_sceneData.questions || []).forEach(q => {
      const voca = _vocaMap[q.pageId];
      if (voca && voca.word) validQuestions.push({ ...q, text: voca.word, meaning: voca.meaning });
      else console.warn('[EnglishListenPlace] VOCA에 없는 pageId 건너뜀:', q.pageId);
    });

    if (validQuestions.length < 3) return renderError('문장을 충분히 불러오지 못했어요. (3개 미만)');

    const regularQs = validQuestions.filter(q => !q.finale);
    const finaleQs = validQuestions.filter(q => q.finale);
    const twoPartQs = shuffle(regularQs.filter(q => Array.isArray(q.answer) && q.answer.length >= 2));
    const onePartQs = shuffle(regularQs.filter(q => !Array.isArray(q.answer) || q.answer.length < 2));
    const pickedRegular = twoPartQs.length > 0
      ? shuffle([twoPartQs[0], ...onePartQs.slice(0, 5), ...twoPartQs.slice(1)]).slice(0, 6)
      : onePartQs.slice(0, 6);
    const finaleQ = finaleQs.length > 0 ? finaleQs[0] : regularQs[regularQs.length - 1];

    _questions = [...pickedRegular, { ...finaleQ, finale: true }];
    _currentQIdx = 0;
    _totalCorrect = 0;
    _wrongLogs = [];
    renderStartCard();
  }

  function renderLoading(msg) {
    _container.innerHTML = `<div class="listen-place-card"><div class="lp-spinner"></div><p style="margin-top:16px;font-weight:600;color:var(--text-sub,#64748b);">${escapeHtml(msg)}</p></div>`;
  }

  function renderError(msg) {
    _container.innerHTML = `<div class="listen-place-card"><div style="font-size:2.8rem;margin-bottom:12px;">⚠️</div><h3 style="color:#ef4444;margin-bottom:8px;">준비 중인 단원이에요</h3><p style="color:var(--text-sub,#64748b);margin-bottom:20px;">${escapeHtml(msg)}</p><a href="english.html" class="lp-btn lp-btn-secondary">🚪 영어방 돌아가기</a></div>`;
  }

  function renderStartCard() {
    const badgeText = _sceneData.badge || `⭐ ${_sceneData.grade || ''} ${_sceneData.unit || ''} 특별 활동`.trim();
    const titleText = _sceneData.title || '듣고 끌어다 놓기';
    const subText = _sceneData.subtitle || '문장을 잘 듣고 알맞은 곳에 놓아 주세요!';
    const guides = Array.isArray(_sceneData.guideItems) && _sceneData.guideItems.length > 0
      ? _sceneData.guideItems
      : ['🎧 <strong>문장 듣기</strong>: 원어민 발음으로 문장을 들어요', '👕 <strong>끌어다 놓기</strong>: 그림 카드를 끌거나 <strong>눌러서</strong> 놓아요'];

    _container.innerHTML = `
      <div class="listen-place-card">
        <div class="lp-header-badge">${escapeHtml(badgeText)}</div>
        <h2 class="lp-main-title">${escapeHtml(titleText)}</h2>
        <p class="lp-subtitle">${escapeHtml(subText)}</p>
        <div class="lp-guide-box">${guides.map(g => `<div class="guide-item">${g}</div>`).join('')}</div>
        <button id="lpStartBtn" class="lp-btn lp-btn-primary lp-btn-large">🚀 시작하기</button>
      </div>
    `;

    const startBtn = _container.querySelector ? _container.querySelector('#lpStartBtn') : document.getElementById('lpStartBtn');
    if (startBtn && typeof startBtn.addEventListener === 'function') startBtn.addEventListener('click', startSession);
  }

  function startSession() {
    window.currentSubject = '영어';
    _totalCorrect = 0;
    _wrongLogs = [];
    if (typeof window.initQuizRewardSession === 'function') window.initQuizRewardSession('listen_place');
    startQuestion(0);
  }

  function startQuestion(idx) {
    _currentQIdx = idx;
    _currentQuestion = _questions[idx];
    _currentAnswerFound = [];
    _trayCards.clear();

    if (!_currentQuestion) return renderCompleted();
    if (_currentQuestion.finale) return startFinaleQuestion();

    renderQuestionFrame();
    const stageBox = _container.querySelector ? _container.querySelector('#lpStageArea') : document.getElementById('lpStageArea');
    _stageEl = _currentScene.renderStage(stageBox, _currentQuestion.who);

    const trayBox = _container.querySelector ? _container.querySelector('#lpTrayArea') : document.getElementById('lpTrayArea');
    if (trayBox) {
      trayBox.innerHTML = '';
      pickTrayItems(_sceneData.items, _currentQuestion.answer).forEach(item => {
        const cardEl = _currentScene.renderItem(item);
        _trayCards.set(item.id, { cardEl, item });
        setupItemInteraction(cardEl, item, _stageEl);
        trayBox.appendChild(cardEl);
      });
    }
    speak(_currentQuestion.text);
  }

  function renderQuestionFrame() {
    _container.innerHTML = `
      <div class="lp-game-container">
        <div class="lp-top-bar">
          <a href="english.html" class="lp-btn-icon" title="영어방으로">🚪</a>
          <div class="lp-progress-bar"><div class="lp-progress-fill" style="width:${((_currentQIdx) / _questions.length) * 100}%"></div></div>
          <span class="lp-step-badge">${_currentQIdx + 1} / ${_questions.length}</span>
        </div>
        <div class="lp-listen-bar">
          <div class="listen-action-group">
            <button id="lpReplayBtn" class="lp-action-btn" title="다시 듣기">🔊 <span>다시 듣기</span></button>
            <button id="lpMeaningBtn" class="lp-action-btn lp-btn-sub" title="뜻 보기">💬 <span>뜻 보기</span></button>
          </div>
          <div class="sentence-display-wrap">
            <div id="lpSentenceText" class="lp-sentence-text lp-sentence-hidden">🎧 문장을 잘 듣고 알맞은 그림을 골라 주세요!</div>
            <div id="lpMeaningText" class="lp-meaning-text" style="display:none;">${escapeHtml(_currentQuestion.meaning || '')}</div>
          </div>
        </div>
        <div id="lpStageArea" class="lp-stage-area"></div>
        <div class="lp-tray-wrapper">
          <div class="lp-tray-guide">👇 아래 그림을 누르거나 인물로 끌어다 놓으세요</div>
          <div id="lpTrayArea" class="lp-tray-grid"></div>
        </div>
        <div id="lpNextBar" class="lp-next-bar" style="display:none;">
          <button id="lpNextBtn" class="lp-btn lp-btn-primary lp-btn-large">다음 문제 ▶</button>
        </div>
      </div>
    `;

    const replayBtn = document.getElementById('lpReplayBtn');
    if (replayBtn) replayBtn.addEventListener('click', () => speak(_currentQuestion.text));

    const meaningBtn = document.getElementById('lpMeaningBtn');
    const meaningText = document.getElementById('lpMeaningText');
    if (meaningBtn && meaningText) {
      meaningBtn.addEventListener('click', () => {
        const hidden = meaningText.style.display === 'none';
        meaningText.style.display = hidden ? 'block' : 'none';
        meaningBtn.classList.toggle('active', hidden);
      });
    }

    const nextBtn = document.getElementById('lpNextBtn');
    if (nextBtn) nextBtn.addEventListener('click', () => startQuestion(_currentQIdx + 1));
  }

  function setupItemInteraction(cardEl, item, stageEl) {
    if (!cardEl || typeof cardEl.addEventListener !== 'function') return;

    cardEl.addEventListener('click', () => {
      if (cardEl.classList && (cardEl.classList.contains('item-used') || cardEl.classList.contains('is-dragging'))) return;
      handleItemAttempt(cardEl, item, stageEl);
    });

    let isDragging = false, startX = 0, startY = 0, moved = false;
    cardEl.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || (cardEl.classList && cardEl.classList.contains('item-used'))) return;
      startX = e.clientX; startY = e.clientY; moved = false; isDragging = true;
      try { if (typeof cardEl.setPointerCapture === 'function') cardEl.setPointerCapture(e.pointerId); } catch (_) {}
    });

    cardEl.addEventListener('pointermove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX, dy = e.clientY - startY;
      if (Math.hypot(dx, dy) > 8) {
        moved = true;
        cardEl.classList.add('is-dragging');
        cardEl.style.transform = `translate(${dx}px, ${dy}px) scale(1.08)`;
        cardEl.style.zIndex = '100';
      }
    });

    function finishDrag(e) {
      if (!isDragging) return;
      isDragging = false;
      cardEl.classList.remove('is-dragging');
      cardEl.style.transform = '';
      cardEl.style.zIndex = '';
      if (moved && stageEl && typeof stageEl.getBoundingClientRect === 'function') {
        const r = stageEl.getBoundingClientRect();
        if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
          handleItemAttempt(cardEl, item, stageEl);
        }
      }
    }
    cardEl.addEventListener('pointerup', finishDrag);
    cardEl.addEventListener('pointercancel', finishDrag);
  }

  function handleItemAttempt(cardEl, item, stageEl) {
    if (!_currentQuestion || !item) return null;
    const res = judgeAttempt(_currentQuestion, _currentAnswerFound, item);
    _currentAnswerFound = res.foundAnswers;

    if (res.correct) {
      _currentScene.applyItem(stageEl, item.slot, item);
      if (cardEl) {
        if (cardEl.classList) {
          cardEl.classList.add('item-used');
          cardEl.classList.remove('item-guide-highlight');
        }
        const labelEl = cardEl._labelEl || (cardEl.querySelector ? cardEl.querySelector('.item-card-label') : null);
        if (labelEl) labelEl.textContent = item.label || '';
      }
      if (typeof window.fairyPraise === 'function') window.fairyPraise();

      if (res.completed) {
        onQuestionComplete();
      } else {
        const sentEl = document.getElementById('lpSentenceText');
        if (sentEl) {
          sentEl.textContent = '👏 멋져요! 나머지 하나도 찾아 입혀 볼까요?';
          sentEl.classList.remove('lp-sentence-hidden');
        }
      }
    } else {
      if (res.wrongLog) _wrongLogs.push(res.wrongLog);
      if (typeof window.fairyEncourage === 'function') window.fairyEncourage();
      if (cardEl && cardEl.classList) {
        cardEl.classList.add('item-wrong-shake');
        setTimeout(() => cardEl.classList.remove('item-wrong-shake'), 450);
      }
      res.guideTargets.forEach(ansId => {
        const entry = _trayCards.get(ansId);
        const targetCard = entry ? entry.cardEl : (document.getElementById('lpTrayArea')?.querySelector(`[data-item-id="${ansId}"]`));
        if (targetCard && targetCard.classList && !targetCard.classList.contains('item-used')) {
          targetCard.classList.add('item-guide-highlight');
        }
      });
      speak(_currentQuestion.text);
    }
    return res;
  }

  function onQuestionComplete() {
    _totalCorrect++;
    if (typeof window.rewardQuizCorrect === 'function') window.rewardQuizCorrect(_currentQIdx);
    const sentEl = document.getElementById('lpSentenceText');
    if (sentEl) {
      sentEl.textContent = `🎉 ${_currentQuestion.text}`;
      sentEl.classList.remove('lp-sentence-hidden');
      sentEl.classList.add('lp-sentence-revealed');
    }
    const nextBar = document.getElementById('lpNextBar');
    if (nextBar) nextBar.style.display = 'flex';
  }

  function startFinaleQuestion() {
    _currentAnswerFound = [];
    const finaleBadge = _sceneData.finaleBadge || '👑 마지막 미션: 친구를 찾아라!';
    const finalePrompt = _sceneData.finalePrompt || '🔎 문장을 잘 듣고 설명과 똑같이 생긴 친구를 터치하세요!';

    _container.innerHTML = `
      <div class="lp-game-container">
        <div class="lp-top-bar">
          <a href="english.html" class="lp-btn-icon" title="영어방으로">🚪</a>
          <span class="lp-step-badge lp-badge-finale">${escapeHtml(finaleBadge)}</span>
        </div>
        <div class="lp-listen-bar">
          <div class="listen-action-group">
            <button id="lpFinaleReplayBtn" class="lp-action-btn" title="다시 듣기">🔊 <span>다시 듣기</span></button>
            <button id="lpFinaleMeaningBtn" class="lp-action-btn lp-btn-sub" title="뜻 보기">💬 <span>뜻 보기</span></button>
          </div>
          <div class="sentence-display-wrap">
            <div id="lpFinaleSentenceText" class="lp-sentence-text">${escapeHtml(finalePrompt)}</div>
            <div id="lpFinaleMeaningText" class="lp-meaning-text" style="display:none;">${escapeHtml(_currentQuestion.meaning || '')}</div>
          </div>
        </div>
        <div id="lpFinaleStageArea" class="lp-finale-stage-area"></div>
      </div>
    `;

    const replayBtn = document.getElementById('lpFinaleReplayBtn');
    if (replayBtn) replayBtn.addEventListener('click', () => speak(_currentQuestion.text));

    const meaningBtn = document.getElementById('lpFinaleMeaningBtn');
    const meaningText = document.getElementById('lpFinaleMeaningText');
    if (meaningBtn && meaningText) {
      meaningBtn.addEventListener('click', () => {
        const hidden = meaningText.style.display === 'none';
        meaningText.style.display = hidden ? 'block' : 'none';
        meaningBtn.classList.toggle('active', hidden);
      });
    }

    const stageBox = _container.querySelector ? _container.querySelector('#lpFinaleStageArea') : document.getElementById('lpFinaleStageArea');
    _finaleCandidates = buildFinaleCandidates(_sceneData.items, _currentQuestion);
    if (stageBox && _currentScene && typeof _currentScene.renderFinaleStage === 'function') {
      _currentScene.renderFinaleStage(stageBox, _finaleCandidates, (selectedIdx, cardEl) => {
        handleFinaleAttempt(selectedIdx, cardEl, stageBox);
      });
    }
    speak(_currentQuestion.text);
  }

  function handleFinaleAttempt(selectedIdx, cardEl, stageBox) {
    const cand = _finaleCandidates[selectedIdx];
    if (cand && cand.isAnswer) {
      if (cardEl && cardEl.classList) cardEl.classList.add('finale-card-correct');
      if (typeof window.fairyPraise === 'function') window.fairyPraise();
      const sentEl = document.getElementById('lpFinaleSentenceText');
      if (sentEl) sentEl.textContent = `🎉 정답이에요! "${_currentQuestion.text}"`;

      _totalCorrect++;
      if (typeof window.rewardQuizCorrect === 'function') window.rewardQuizCorrect(_currentQIdx);
      renderCompleted();
      return { correct: true };
    }

    const wrongDesc = (cand && cand.items && cand.items.map(i => i.label || i.id).join(', ')) || `후보 ${selectedIdx + 1}`;
    _wrongLogs.push(`${_currentQuestion.text} (오답: ${wrongDesc})`);
    if (typeof window.fairyEncourage === 'function') window.fairyEncourage();
    if (cardEl && cardEl.classList) {
      cardEl.classList.add('item-wrong-shake');
      setTimeout(() => cardEl.classList.remove('item-wrong-shake'), 450);
    }
    if (stageBox && typeof stageBox.querySelectorAll === 'function') {
      const cards = stageBox.querySelectorAll('.finale-person-card');
      _finaleCandidates.forEach((c, i) => {
        if (c.isAnswer && cards[i] && cards[i].classList) cards[i].classList.add('item-guide-highlight');
      });
    }
    speak(_currentQuestion.text);
    return { correct: false };
  }

  function renderCompleted() {
    const unitCode = (_sceneData && _sceneData.unit) || 'L8';
    const childName = resolveChildName();
    const errorReport = _wrongLogs.length > 0 ? _wrongLogs.join(' / ') : '오답 없음';

    const savedSession = window.__quizRewardSession ? { ...window.__quizRewardSession } : null;
    if (typeof window.finalizeQuizRewardSession === 'function') {
      Promise.resolve(window.finalizeQuizRewardSession({
        isFullComplete: true,
        subject: '영어(' + unitCode + ')',
        childName,
        errorReport
      })).finally(() => {
        if (savedSession && !window.__quizRewardSession) window.__quizRewardSession = savedSession;
      });
    }

    const completeTitle = (_sceneData && _sceneData.completeTitle) || `${unitCode} 활동 완주!`;
    const completeSub = (_sceneData && _sceneData.completeSubtitle) || '문장을 귀담아듣고 멋지게 완주했어요!';
    const sentenceListHtml = _questions.map((q, idx) => `
      <div class="result-sentence-item">
        <div class="res-num">${idx + 1}</div>
        <div class="res-text-box">
          <div class="res-eng">${escapeHtml(q.text)}</div>
          <div class="res-kor">${escapeHtml(q.meaning || '')}</div>
        </div>
        <button class="lp-btn-icon-small" data-speak="${escapeHtml(q.text)}">🔊</button>
      </div>
    `).join('');

    _container.innerHTML = `
      <div class="listen-place-card">
        <div style="font-size:3.2rem;margin-bottom:8px;">🏆</div>
        <h2 class="lp-main-title">${escapeHtml(completeTitle)}</h2>
        <p class="lp-subtitle">${escapeHtml(completeSub)}</p>
        <div class="result-summary-box">
          <span>총 문장: <strong>${_questions.length}개</strong></span>
          <span>성공: <strong>${_totalCorrect}회</strong></span>
        </div>
        <div class="result-sentences-container">
          <div style="font-weight:700;margin-bottom:10px;color:var(--text-main,#0f172a);">📖 오늘 마스터한 문장들</div>
          ${sentenceListHtml}
        </div>
        <div style="display:flex;gap:12px;justify-content:center;margin-top:20px;">
          <button id="lpRestartBtn" class="lp-btn lp-btn-secondary">🔄 다시 하기</button>
          <a href="english.html" class="lp-btn lp-btn-primary">🚪 영어방 돌아가기</a>
        </div>
      </div>
    `;

    if (_container.querySelectorAll) {
      _container.querySelectorAll('[data-speak]').forEach(btn => {
        btn.addEventListener('click', () => speak(btn.getAttribute('data-speak')));
      });
    }
    const restartBtn = _container.querySelector ? _container.querySelector('#lpRestartBtn') : document.getElementById('lpRestartBtn');
    if (restartBtn && typeof restartBtn.addEventListener === 'function') {
      restartBtn.addEventListener('click', () => init({
        grade: _sceneData.grade, unit: _sceneData.unit, sceneData: _sceneData, containerId: _container.id
      }));
    }
  }

  function attemptItemById(itemId) {
    const entry = _trayCards.get(itemId);
    const item = entry ? entry.item : ((_sceneData && _sceneData.items) || []).find(it => it.id === itemId);
    const cardEl = entry ? entry.cardEl : null;
    return handleItemAttempt(cardEl, item, _stageEl);
  }

  function attemptFinaleByAnswer(pickCorrect = true) {
    const idx = _finaleCandidates.findIndex(c => Boolean(c.isAnswer) === Boolean(pickCorrect));
    return handleFinaleAttempt(idx >= 0 ? idx : 0, null, null);
  }

  window.EnglishListenPlace = {
    registerScene,
    init,
    speak,
    startSession,
    startQuestion,
    attemptItemById,
    attemptFinaleByAnswer,
    getState: () => ({
      questions: _questions,
      currentQIdx: _currentQIdx,
      currentQuestion: _currentQuestion,
      currentAnswerFound: [..._currentAnswerFound],
      totalCorrect: _totalCorrect,
      wrongLogs: [..._wrongLogs],
      finaleCandidates: _finaleCandidates
    }),
    _pickTrayItems: pickTrayItems,
    _judge: judgeAttempt,
    _buildFinaleCandidates: buildFinaleCandidates
  };
})();
