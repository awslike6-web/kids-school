// kids/js/english_listen_place.js
// 🎧 [영어 공통 엔진] 듣고 끌어다 놓기 (Listen & Place) 엔진
// - 문장을 듣고 물건을 끌어다 놓거나 눌러서 채점하는 단원 확장형 공통 엔진
// - 에러리스 학습 피드백, 폰(375px) 무스크롤, VOCA_DB 실시간 연동
// - 전역 네임스페이스: window.EnglishListenPlace

(function() {
  'use strict';

  // 등록된 장면 저장소 (dressup, room, map 등)
  const SCENES = {};

  // 대기 중이던 장면이 있으면 자동 병합
  if (window._PENDING_SCENES) {
    Object.assign(SCENES, window._PENDING_SCENES);
  }

  // 엔진 상태
  let _currentScene = null;
  let _sceneData = null;
  let _questions = [];
  let _currentQIdx = 0;
  let _currentQuestion = null;
  let _vocaMap = {}; // pageId -> { word, meaning }
  let _currentAnswerFound = [];
  let _totalCorrect = 0;
  let _container = null;
  let _speechRate = 0.85;

  /**
   * 장면 등록 API
   */
  function registerScene(name, sceneObj) {
    SCENES[name] = sceneObj;
  }

  /**
   * 영어 음성 출력 헬퍼
   */
  function speak(text) {
    if (!text) return;
    if (typeof window.speakEnglish === 'function') {
      window.speakEnglish(text);
    } else if (typeof window.fairySpeak === 'function') {
      window.fairySpeak(text, 'en');
    }
  }

  /**
   * 배열 셔플 (Fisher-Yates)
   */
  function shuffle(arr) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  /**
   * 트레이(받침대) 아이템 4개 선정
   * - 정답 부위(들)의 아이템 + 같은 부위의 오답 아이템 = 총 4개
   */
  function pickTrayItems(allItems, answers) {
    const answerItems = allItems.filter(item => answers.includes(item.id));
    const answerSlots = [...new Set(answerItems.map(it => it.slot))];
    const picked = [...answerItems];

    // 필요한 오답 개수 = 4 - answerItems.length
    const neededDistractors = Math.max(0, 4 - picked.length);

    // 같은 slot의 오답 후보들 추출
    const sameSlotDistractors = allItems.filter(
      item => answerSlots.includes(item.slot) && !answers.includes(item.id)
    );

    const shuffledSameSlot = shuffle(sameSlotDistractors);
    for (let i = 0; i < neededDistractors && i < shuffledSameSlot.length; i++) {
      picked.push(shuffledSameSlot[i]);
    }

    // 그래도 4개가 안 채워졌다면 다른 slot에서 보충
    if (picked.length < 4) {
      const remaining = allItems.filter(item => !picked.some(p => p.id === item.id));
      const shuffledRem = shuffle(remaining);
      while (picked.length < 4 && shuffledRem.length > 0) {
        picked.push(shuffledRem.pop());
      }
    }

    return shuffle(picked);
  }

  /**
   * 피날레 판(친구를 찾아라) 3명 후보 생성
   */
  function buildFinaleCandidates(allItems, finaleQ) {
    const targetItems = allItems.filter(it => finaleQ.answer.includes(it.id));
    const targetSlots = targetItems.map(it => it.slot);

    // 1번 후보: 정답 친구 (타겟 아이템 모두 착용)
    const c1 = {
      who: finaleQ.who || 'she',
      isAnswer: true,
      items: [...targetItems]
    };

    // 2번 후보: 1개만 다름
    const distractorItems1 = [];
    targetItems.forEach((tItem, idx) => {
      if (idx === 0) {
        // 첫 번째 슬롯 아이템을 다른 것으로 교체
        const alt = allItems.find(it => it.slot === tItem.slot && it.id !== tItem.id);
        distractorItems1.push(alt || tItem);
      } else {
        distractorItems1.push(tItem);
      }
    });
    const c2 = {
      who: finaleQ.who || 'she',
      isAnswer: false,
      items: distractorItems1
    };

    // 3번 후보: 두 번째 슬롯 아이템 또는 성별이 다름
    const distractorItems2 = [];
    targetItems.forEach((tItem, idx) => {
      if (idx === targetItems.length - 1) {
        const alt = allItems.find(it => it.slot === tItem.slot && it.id !== tItem.id && !distractorItems1.some(d => d.id === it.id));
        distractorItems2.push(alt || tItem);
      } else {
        distractorItems2.push(tItem);
      }
    });
    const c3 = {
      who: (finaleQ.who === 'she') ? 'he' : 'she',
      isAnswer: false,
      items: distractorItems2
    };

    return shuffle([c1, c2, c3]);
  }

  /**
   * 엔진 초기화
   */
  async function init(options) {
    const { grade, unit, sceneData, containerId } = options || {};
    _container = document.getElementById(containerId || 'listenPlaceApp');
    if (!_container) {
      console.error('[EnglishListenPlace] 컨테이너 엘리먼트를 찾을 수 없습니다.');
      return;
    }

    _sceneData = sceneData || window.LISTEN_PLACE_SCENE;
    if (!_sceneData) {
      renderError('장면 데이터를 불러오지 못했어요.');
      return;
    }

    const sceneName = _sceneData.scene || 'dressup';
    _currentScene = SCENES[sceneName];
    if (!_currentScene) {
      renderError(`장면 모듈 [${sceneName}]이 등록되지 않았습니다.`);
      return;
    }

    if (typeof window.getEnglishSpeechRate === 'function') {
      _speechRate = window.getEnglishSpeechRate();
    }

    // 1. 노션 VOCA_DB 조회 (실시간 문장 매핑)
    renderLoading('문장 데이터를 불러오고 있어요...');
    try {
      let vocaList = [];
      if (typeof window.fetchVocaFromNotion === 'function') {
        vocaList = await window.fetchVocaFromNotion({ subject: '영어', filterByStudent: false });
      }

      _vocaMap = {};
      (vocaList || []).forEach(row => {
        if (row && row.pageId) {
          _vocaMap[row.pageId] = {
            word: row.word || '',
            meaning: row.meaning || ''
          };
        }
      });
    } catch (e) {
      console.warn('[EnglishListenPlace] VOCA DB 조회 중 경고:', e);
    }

    // 2. 유효 문제 필터링 (VOCA에 매칭되는 문제만)
    const validQuestions = [];
    (_sceneData.questions || []).forEach(q => {
      const voca = _vocaMap[q.pageId];
      if (voca && voca.word) {
        validQuestions.push({
          ...q,
          text: voca.word,
          meaning: voca.meaning
        });
      } else {
        console.warn('[EnglishListenPlace] VOCA에 없는 pageId 건너뜀:', q.pageId);
      }
    });

    if (validQuestions.length < 3) {
      renderError('문장을 충분히 불러오지 못했어요. (3개 미만)');
      return;
    }

    // 3. 문제 목록 구성 (일반 문제 6개 + 피날레 1개)
    const regularQs = validQuestions.filter(q => !q.finale);
    const finaleQs = validQuestions.filter(q => q.finale);

    const pickedRegular = shuffle(regularQs).slice(0, 6);
    const finaleQ = (finaleQs.length > 0) ? finaleQs[0] : regularQs[regularQs.length - 1];

    _questions = [...pickedRegular, { ...finaleQ, finale: true }];
    _currentQIdx = 0;
    _totalCorrect = 0;

    // 시작 화면 렌더링
    renderStartCard();
  }

  /**
   * 로딩 화면
   */
  function renderLoading(msg) {
    _container.innerHTML = `
      <div class="listen-place-card">
        <div class="listen-place-spinner"></div>
        <p style="margin-top:16px; font-weight:600; color:var(--text-sub, #64748b);">${msg}</p>
      </div>
    `;
  }

  /**
   * 에러 화면
   */
  function renderError(msg) {
    _container.innerHTML = `
      <div class="listen-place-card">
        <div style="font-size:2.8rem; margin-bottom:12px;">⚠️</div>
        <h3 style="color:#ef4444; margin-bottom:8px;">준비 중인 단원이에요</h3>
        <p style="color:var(--text-sub, #64748b); margin-bottom:20px;">${msg}</p>
        <a href="english.html" class="lp-btn lp-btn-secondary">🚪 영어방 돌아가기</a>
      </div>
    `;
  }

  /**
   * 시작 안내 카드
   */
  function renderStartCard() {
    _container.innerHTML = `
      <div class="listen-place-card">
        <div class="lp-header-badge">⭐ 5-2 8단원 특별 활동</div>
        <h2 class="lp-main-title">${_sceneData.title || '친구 옷 입혀 주기'}</h2>
        <p class="lp-subtitle">${_sceneData.subtitle || '문장을 잘 듣고 어울리는 머리와 옷을 입혀 주세요!'}</p>
        
        <div class="lp-guide-box">
          <div class="guide-item">🎧 <strong>문장 듣기</strong>: 원어민 발음으로 문장을 들어요</div>
          <div class="guide-item">👕 <strong>옷 입히기</strong>: 카드를 끌거나 <strong>눌러서</strong> 입혀요</div>
          <div class="guide-item">🌟 <strong>친구 찾기</strong>: 마지막 판에서 설명에 맞는 친구를 찾아요</div>
        </div>

        <button id="lpStartBtn" class="lp-btn lp-btn-primary lp-btn-large">
          🚀 시작하기
        </button>
      </div>
    `;

    const startBtn = _container.querySelector ? _container.querySelector('#lpStartBtn') : document.getElementById('lpStartBtn');
    if (startBtn && typeof startBtn.addEventListener === 'function') {
      startBtn.addEventListener('click', () => {
        // 보상 세션 초기화
        if (typeof window.initQuizRewardSession === 'function') {
          window.initQuizRewardSession('영어', _questions.length);
        }
        startQuestion(0);
      });
    }
  }

  /**
   * 개별 문제 시작
   */
  function startQuestion(idx) {
    _currentQIdx = idx;
    _currentQuestion = _questions[idx];
    _currentAnswerFound = [];

    if (!_currentQuestion) {
      renderCompleted();
      return;
    }

    if (_currentQuestion.finale) {
      startFinaleQuestion();
      return;
    }

    // 문제 화면 뼈대 렌더링
    renderQuestionFrame();

    // 무대 인물 렌더링
    const stageBox = _container.querySelector('#lpStageArea');
    const stageEl = _currentScene.renderStage(stageBox, _currentQuestion.who);

    // 받침대(트레이) 아이템 4개 렌더링
    const trayBox = _container.querySelector('#lpTrayArea');
    trayBox.innerHTML = '';
    const trayItems = pickTrayItems(_sceneData.items, _currentQuestion.answer);

    trayItems.forEach(item => {
      const cardEl = _currentScene.renderItem(item);
      setupItemInteraction(cardEl, item, stageEl);
      trayBox.appendChild(cardEl);
    });

    // 자동 음성 1회 재생
    setTimeout(() => {
      speak(_currentQuestion.text);
    }, 350);
  }

  /**
   * 문제 화면 뼈대 렌더링
   */
  function renderQuestionFrame() {
    _container.innerHTML = `
      <div class="lp-game-container">
        <!-- 상단 헤더 -->
        <div class="lp-top-bar">
          <a href="english.html" class="lp-btn-icon" title="영어방으로">🚪</a>
          <div class="lp-progress-bar">
            <div class="lp-progress-fill" style="width:${((_currentQIdx) / _questions.length) * 100}%"></div>
          </div>
          <span class="lp-step-badge">${_currentQIdx + 1} / ${_questions.length}</span>
        </div>

        <!-- 듣기 & 문장 바 -->
        <div class="lp-listen-bar">
          <div class="listen-action-group">
            <button id="lpReplayBtn" class="lp-action-btn" title="다시 듣기">
              🔊 <span>다시 듣기</span>
            </button>
            <button id="lpMeaningBtn" class="lp-action-btn lp-btn-sub" title="뜻 보기">
              💬 <span>뜻 보기</span>
            </button>
          </div>
          
          <div class="sentence-display-wrap">
            <div id="lpSentenceText" class="lp-sentence-text lp-sentence-hidden">
              🎧 문장을 잘 듣고 알맞은 물건을 골라 주세요!
            </div>
            <div id="lpMeaningText" class="lp-meaning-text" style="display:none;">
              ${_currentQuestion.meaning || ''}
            </div>
          </div>
        </div>

        <!-- 중앙 무대 영역 (인물 SVG) -->
        <div id="lpStageArea" class="lp-stage-area"></div>

        <!-- 하단 받침대 (트레이) -->
        <div class="lp-tray-wrapper">
          <div class="lp-tray-guide">👇 아래 물건을 누르거나 인물로 끌어다 놓으세요</div>
          <div id="lpTrayArea" class="lp-tray-grid"></div>
        </div>

        <!-- 다음 문제 버튼 바 (정답 완료 시 노출) -->
        <div id="lpNextBar" class="lp-next-bar" style="display:none;">
          <button id="lpNextBtn" class="lp-btn lp-btn-primary lp-btn-large">
            다음 문제 ▶
          </button>
        </div>
      </div>
    `;

    // 음성 다시 듣기 이벤트
    document.getElementById('lpReplayBtn').addEventListener('click', () => {
      speak(_currentQuestion.text);
    });

    // 뜻 보기 토글
    const meaningBtn = document.getElementById('lpMeaningBtn');
    const meaningText = document.getElementById('lpMeaningText');
    meaningBtn.addEventListener('click', () => {
      if (meaningText.style.display === 'none') {
        meaningText.style.display = 'block';
        meaningBtn.classList.add('active');
      } else {
        meaningText.style.display = 'none';
        meaningBtn.classList.remove('active');
      }
    });

    // 다음 문제 버튼
    document.getElementById('lpNextBtn').addEventListener('click', () => {
      startQuestion(_currentQIdx + 1);
    });
  }

  /**
   * 아이템 드래그 앤 드롭 및 클릭/탭 인터랙션 바인딩
   */
  function setupItemInteraction(cardEl, item, stageEl) {
    // 1. 단순 클릭/탭 인터랙션 (모바일 & 저학년용 누르기 지원)
    cardEl.addEventListener('click', (e) => {
      if (cardEl.classList.contains('item-used') || cardEl.classList.contains('is-dragging')) return;
      handleItemAttempt(cardEl, item, stageEl);
    });

    // 2. 포인터 기반 드래그 앤 드롭 (Modern Web Guidance 준수)
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let moved = false;

    cardEl.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || cardEl.classList.contains('item-used')) return;
      startX = e.clientX;
      startY = e.clientY;
      moved = false;
      isDragging = true;
      cardEl.setPointerCapture(e.pointerId);
    });

    cardEl.addEventListener('pointermove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
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

      if (moved) {
        // 드롭 위치가 인물 무대 영역 내부인지 판정
        const stageRect = stageEl.getBoundingClientRect();
        const droppedOnStage = (
          e.clientX >= stageRect.left &&
          e.clientX <= stageRect.right &&
          e.clientY >= stageRect.top &&
          e.clientY <= stageRect.bottom
        );

        if (droppedOnStage) {
          handleItemAttempt(cardEl, item, stageEl);
        }
      }
    }

    cardEl.addEventListener('pointerup', finishDrag);
    cardEl.addEventListener('pointercancel', finishDrag);
  }

  /**
   * 아이템 선택/드롭 시 정답 판정 (에러리스 피드백)
   */
  function handleItemAttempt(cardEl, item, stageEl) {
    const isCorrect = _currentQuestion.answer.includes(item.id);

    if (isCorrect) {
      // 🌟 정답!
      if (!_currentAnswerFound.includes(item.id)) {
        _currentAnswerFound.push(item.id);
      }

      // 인물에 옷/머리 입히기
      _currentScene.applyItem(stageEl, item.slot, item);

      // 카드 상태 변경
      cardEl.classList.add('item-used');
      cardEl.classList.remove('item-guide-highlight');

      if (typeof window.fairyPraise === 'function') {
        window.fairyPraise();
      }

      // 모든 정답 슬롯을 다 채웠는지 확인
      const allDone = _currentQuestion.answer.every(ansId => _currentAnswerFound.includes(ansId));
      if (allDone) {
        onQuestionComplete();
      } else {
        // 두 부위 문장: 하나 더 남음
        const sentEl = document.getElementById('lpSentenceText');
        if (sentEl) {
          sentEl.textContent = '👏 멋져요! 나머지 하나도 찾아 입혀 볼까요?';
          sentEl.classList.remove('lp-sentence-hidden');
        }
      }
    } else {
      // ❌ 오답: 에러리스 피드백 (감점/하트 감소 없음!)
      if (typeof window.fairyEncourage === 'function') {
        window.fairyEncourage();
      }

      // 흔들림 애니메이션
      cardEl.classList.add('item-wrong-shake');
      setTimeout(() => cardEl.classList.remove('item-wrong-shake'), 450);

      // 정답 아이템에 노란 테두리 안내 가이드 켜기
      const trayBox = document.getElementById('lpTrayArea');
      if (trayBox) {
        _currentQuestion.answer.forEach(ansId => {
          const ansCard = trayBox.querySelector(`[data-item-id="${ansId}"]`);
          if (ansCard && !ansCard.classList.contains('item-used')) {
            ansCard.classList.add('item-guide-highlight');
          }
        });
      }

      // 문장 한 번 더 들려주기
      speak(_currentQuestion.text);
    }
  }

  /**
   * 한 문제 완료 처리
   */
  function onQuestionComplete() {
    _totalCorrect++;
    if (typeof window.rewardQuizCorrect === 'function') {
      window.rewardQuizCorrect();
    }

    // 문장 전체 공개
    const sentEl = document.getElementById('lpSentenceText');
    if (sentEl) {
      sentEl.textContent = `🎉 ${_currentQuestion.text}`;
      sentEl.classList.remove('lp-sentence-hidden');
      sentEl.classList.add('lp-sentence-revealed');
    }

    // 다음 문제 버튼 노출
    const nextBar = document.getElementById('lpNextBar');
    if (nextBar) {
      nextBar.style.display = 'flex';
      nextBar.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  /**
   * 마지막 판 「친구를 찾아라!」(Catch the Impostor 피날레)
   */
  function startFinaleQuestion() {
    _currentAnswerFound = [];

    _container.innerHTML = `
      <div class="lp-game-container">
        <!-- 상단 헤더 -->
        <div class="lp-top-bar">
          <a href="english.html" class="lp-btn-icon" title="영어방으로">🚪</a>
          <span class="lp-step-badge lp-badge-finale">👑 마지막 미션: 친구를 찾아라!</span>
        </div>

        <!-- 듣기 & 문장 바 -->
        <div class="lp-listen-bar">
          <div class="listen-action-group">
            <button id="lpFinaleReplayBtn" class="lp-action-btn" title="다시 듣기">
              🔊 <span>다시 듣기</span>
            </button>
            <button id="lpFinaleMeaningBtn" class="lp-action-btn lp-btn-sub" title="뜻 보기">
              💬 <span>뜻 보기</span>
            </button>
          </div>
          
          <div class="sentence-display-wrap">
            <div id="lpFinaleSentenceText" class="lp-sentence-text">
              🔎 문장을 잘 듣고 설명과 똑같이 생긴 친구를 터치하세요!
            </div>
            <div id="lpFinaleMeaningText" class="lp-meaning-text" style="display:none;">
              ${_currentQuestion.meaning || ''}
            </div>
          </div>
        </div>

        <!-- 3명 후보 무대 그리드 -->
        <div id="lpFinaleStageArea" class="lp-finale-stage-area"></div>
      </div>
    `;

    document.getElementById('lpFinaleReplayBtn').addEventListener('click', () => {
      speak(_currentQuestion.text);
    });

    const meaningBtn = document.getElementById('lpFinaleMeaningBtn');
    const meaningText = document.getElementById('lpFinaleMeaningText');
    meaningBtn.addEventListener('click', () => {
      if (meaningText.style.display === 'none') {
        meaningText.style.display = 'block';
        meaningBtn.classList.add('active');
      } else {
        meaningText.style.display = 'none';
        meaningBtn.classList.remove('active');
      }
    });

    const stageBox = document.getElementById('lpFinaleStageArea');
    const candidates = buildFinaleCandidates(_sceneData.items, _currentQuestion);

    _currentScene.renderFinaleStage(stageBox, candidates, (selectedIdx, cardEl) => {
      const cand = candidates[selectedIdx];
      if (cand && cand.isAnswer) {
        // 정답 친구 선택!
        cardEl.classList.add('finale-card-correct');
        if (typeof window.fairyPraise === 'function') {
          window.fairyPraise();
        }
        document.getElementById('lpFinaleSentenceText').textContent = `🎉 정답이에요! "${_currentQuestion.text}"`;

        setTimeout(() => {
          _totalCorrect++;
          if (typeof window.rewardQuizCorrect === 'function') {
            window.rewardQuizCorrect();
          }
          renderCompleted();
        }, 1400);
      } else {
        // 오답 친구 (에러리스)
        if (typeof window.fairyEncourage === 'function') {
          window.fairyEncourage();
        }
        cardEl.classList.add('item-wrong-shake');
        setTimeout(() => cardEl.classList.remove('item-wrong-shake'), 450);

        // 정답 후보 카드에 가이드 하이라이트
        const cards = stageBox.querySelectorAll('.finale-person-card');
        candidates.forEach((c, i) => {
          if (c.isAnswer && cards[i]) {
            cards[i].classList.add('item-guide-highlight');
          }
        });

        speak(_currentQuestion.text);
      }
    });

    // 자동 음성 1회 재생
    setTimeout(() => {
      speak(_currentQuestion.text);
    }, 400);
  }

  /**
   * 완주 결과 카드
   */
  function renderCompleted() {
    if (typeof window.fairyReward === 'function') {
      window.fairyReward();
    }
    if (typeof window.finalizeQuizRewardSession === 'function') {
      window.finalizeQuizRewardSession();
    }

    // 학습일지 저장 (과목명: 영어(L8))
    saveStudyLog();

    const sentenceListHtml = _questions.map((q, idx) => `
      <div class="result-sentence-item">
        <div class="res-num">${idx + 1}</div>
        <div class="res-text-box">
          <div class="res-eng">${q.text}</div>
          <div class="res-kor">${q.meaning || ''}</div>
        </div>
        <button class="lp-btn-icon-small" onclick="EnglishListenPlace.speak('${q.text.replace(/'/g, "\\'")}')">🔊</button>
      </div>
    `).join('');

    _container.innerHTML = `
      <div class="listen-place-card">
        <div style="font-size:3.2rem; margin-bottom:8px;">🏆</div>
        <h2 class="lp-main-title">8단원 옷 입히기 완주!</h2>
        <p class="lp-subtitle">문장을 귀담아듣고 멋지게 친구를 꾸며 주었어요!</p>

        <div class="result-summary-box">
          <span>총 문장: <strong>${_questions.length}개</strong></span>
          <span>성공: <strong>${_totalCorrect}회</strong></span>
        </div>

        <div class="result-sentences-container">
          <div style="font-weight:700; margin-bottom:10px; color:var(--text-main, #0f172a);">📖 오늘 마스터한 문장들</div>
          ${sentenceListHtml}
        </div>

        <div style="display:flex; gap:12px; justify-content:center; margin-top:20px;">
          <button id="lpRestartBtn" class="lp-btn lp-btn-secondary">🔄 다시 하기</button>
          <a href="english.html" class="lp-btn lp-btn-primary">🚪 영어방 돌아가기</a>
        </div>
      </div>
    `;

    document.getElementById('lpRestartBtn').addEventListener('click', () => {
      init({
        grade: _sceneData.grade,
        unit: _sceneData.unit,
        sceneData: _sceneData,
        containerId: _container.id
      });
    });
  }

  /**
   * KST 로컬 날짜 문자열(YYYY-MM-DD) 생성 헬퍼 (헌법 §7-9 준수)
   */
  function getKSTDateString(d = new Date()) {
    const kst = new Date(d.getTime() + (d.getTimezoneOffset() + 9 * 60) * 60000);
    const y = kst.getFullYear();
    const m = String(kst.getMonth() + 1).padStart(2, '0');
    const day = String(kst.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  /**
   * 학습일지 기록 헬퍼
   */
  function saveStudyLog() {
    try {
      const child = (typeof window.getCurrentStudent === 'function')
        ? window.getCurrentStudent()
        : (localStorage.getItem('current_student') || '민수');

      const todayStr = getKSTDateString();
      const logData = {
        student: child,
        subject: '영어(L8)',
        activity: '듣고 끌어다 놓기 (옷 입히기)',
        correctCount: _totalCorrect,
        totalCount: _questions.length,
        timestamp: todayStr
      };

      if (typeof window.saveStudyLogDirect === 'function') {
        window.saveStudyLogDirect(logData);
      } else {
        const key = `study_log_${child}_${todayStr}`;
        const logs = JSON.parse(localStorage.getItem(key) || '[]');
        logs.push(logData);
        localStorage.setItem(key, JSON.stringify(logs));
      }
    } catch (e) {
      console.warn('[EnglishListenPlace] 학습일지 저장 중 경고:', e);
    }
  }

  // 외부에 공개할 API (window.EnglishListenPlace)
  window.EnglishListenPlace = {
    registerScene,
    init,
    speak,
    // 단위 시험 및 디버깅용 헬퍼 노출
    _pickTrayItems: pickTrayItems,
    _buildFinaleCandidates: buildFinaleCandidates
  };

})();
