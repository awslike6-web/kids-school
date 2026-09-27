/**
 * 🚀 [5분 퀘스트 코어 엔진 SSOT (quest_engine.js)]
 * 역할:
 * 1) 세로 분수(Vertical Fraction) 정품 렌더러
 * 2) 멀티유저 적응형 라이트너 3상자 오답 큐 V2 (Spaced Repetition)
 * 3) 타 학년 침투 차단 철벽 안전 가드 (Safety Guard)
 * 4) 듀오링고형 Universal 4+1 출제 엔진 (1~3번 현재단원, 4번 오답복습, 5번 비밀맛보기)
 * 5) 동적 단원 팩 로더 어댑터 (loadCustomUnitPack)
 */

(function() {
  // ========================================================
  // 1. 📐 공부방 공식 세로 분수 (Vertical Fraction) 렌더러 헬퍼
  // ========================================================
  function renderFrac(num, den) {
    return `<span class="inline-frac"><span class="num">${num}</span><span class="bar"></span><span class="den">${den}</span></span>`;
  }

  function renderMixed(whole, num, den) {
    return `<span class="mixed-frac"><span class="whole">${whole}</span><span class="inline-frac"><span class="num">${num}</span><span class="bar"></span><span class="den">${den}</span></span></span>`;
  }

  function formatFractions(str) {
    if (typeof str !== 'string') return str;
    return str
      .replace(/(\d+)과\s+(\d+)\/(\d+)/g, (_, w, n, d) => renderMixed(w, n, d))
      .replace(/(\d+)\/(\d+)/g, (_, n, d) => renderFrac(n, d));
  }

  // ========================================================
  // 2. 🧠 [멀티유저 완전 격리 V2] 적응형 라이트너 3상자 오답 큐 엔진
  // ========================================================
  const ADAPTIVE_STORAGE_KEY_V2 = 'MINMIN_ADAPTIVE_QUEUE_V2';

  // 레거시 V1(미격리) 캐시 자동 청소
  (function cleanupLegacyV1Queue() {
    try {
      if (localStorage.getItem('MINMIN_ADAPTIVE_QUEUE_V1')) {
        localStorage.removeItem('MINMIN_ADAPTIVE_QUEUE_V1');
        console.log('[Adaptive Queue] 레거시 V1 단일 큐 정리 완료');
      }
    } catch (e) {}
  })();

  function getNormalizedChildId(child) {
    if (!child) return 'minsu';
    const c = String(child).trim().toLowerCase();
    if (c === 'minseo' || c === 'daughter' || c === '민서') return 'minseo';
    return 'minsu';
  }

  function getAdaptiveQueue(child, subj) {
    try {
      const u = getNormalizedChildId(child);
      const raw = localStorage.getItem(ADAPTIVE_STORAGE_KEY_V2);
      const data = raw ? JSON.parse(raw) : {};
      if (data && data[u] && Array.isArray(data[u][subj])) {
        return data[u][subj];
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  function saveAdaptiveQueue(child, subj, queue) {
    try {
      const u = getNormalizedChildId(child);
      const raw = localStorage.getItem(ADAPTIVE_STORAGE_KEY_V2);
      const data = raw ? JSON.parse(raw) : {};
      if (!data[u]) data[u] = {};
      data[u][subj] = queue;
      localStorage.setItem(ADAPTIVE_STORAGE_KEY_V2, JSON.stringify(data));
    } catch (e) {}
  }

  function recordWrongItem(child, subj, questionObj) {
    if (!questionObj || !subj) return;
    const u = getNormalizedChildId(child);
    const qList = getAdaptiveQueue(u, subj);
    const existing = qList.find(item => item.q === questionObj.q);
    const today = new Date().toISOString().slice(0, 10);
    if (existing) {
      existing.failCount = (existing.failCount || 1) + 1;
      existing.streak = 0;
      existing.lastReviewed = today;
    } else {
      qList.push({
        id: questionObj.id || `q_${Date.now()}`,
        q: questionObj.q,
        formula: questionObj.formula || '',
        options: questionObj.options || [],
        answer: questionObj.answer,
        hint: questionObj.hint || '',
        audioText: questionObj.audioText || '',
        failCount: 1,
        streak: 0,
        box: 1,
        lastReviewed: today
      });
    }
    saveAdaptiveQueue(u, subj, qList);
  }

  function recordCorrectItem(child, subj, questionObj) {
    if (!questionObj || !subj) return;
    const u = getNormalizedChildId(child);
    const qList = getAdaptiveQueue(u, subj);
    const idx = qList.findIndex(item => item.q === questionObj.q);
    if (idx !== -1) {
      qList[idx].streak = (qList[idx].streak || 0) + 1;
      qList[idx].box = Math.min(3, (qList[idx].box || 1) + 1);
      qList[idx].lastReviewed = new Date().toISOString().slice(0, 10);
      if (qList[idx].streak >= 3) {
        qList.splice(idx, 1);
      }
      saveAdaptiveQueue(u, subj, qList);
    }
  }

  // ========================================================
  // 3. 🛡️ [철벽 학년 가드] 타 학년/타 교과 문제 침투 차단 검증기
  // ========================================================
  function isValidQuestionForChild(child, subj, questionObj) {
    if (!questionObj || !questionObj.q) return false;
    const u = getNormalizedChildId(child);

    // 💡 [노션 어휘 출제 문항 검증] 노션 어휘 문제는 학생 타겟 및 과목 일치 여부로 안전 검증
    if (questionObj.source === 'notion_voca') {
      const targetChild = questionObj.targetChild || 'all';
      if (targetChild !== 'all' && targetChild !== u) return false;
      if (questionObj.subject && questionObj.subject !== subj) return false;
      return true;
    }

    const bank = (u === 'minseo') ? window.minseoMasterBank : window.minsuMasterBank;
    if (!bank || !bank[subj]) return true;

    const subjPool = bank[subj];
    const allQuestions = [];
    Object.keys(subjPool).forEach(key => {
      if (key !== 'title' && key !== 'icon' && Array.isArray(subjPool[key])) {
        allQuestions.push(...subjPool[key]);
      }
    });

    return allQuestions.some(item => (item.id && item.id === questionObj.id) || (item.q === questionObj.q));
  }

  // ========================================================
  // 4. 🧠 부모 진도 설정값 로더 & 단원 전진 맵핑
  // ========================================================
  function getParentQuestSettings(child) {
    try {
      const raw = localStorage.getItem('MINMIN_QUEST_SETTINGS');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed[child]) return parsed[child];
      }
    } catch (e) {}
    return child === 'minseo'
      ? { korean: 'batchim', math: '100num', english: 'phonics' }
      : { math: 'division', english: '8', korean: '1', science: '1', society: '1' };
  }

  const NEXT_UNIT_MAP = {
    minseo: {
      korean: { current: 'batchim', next: 'dictation', batchim: 'dictation', dictation: 'voca', voca: 'batchim' },
      math: { current: '100num', next: 'addsub', '100num': 'addsub', addsub: 'shapes', shapes: '100num' },
      english: { current: 'phonics', next: 'abc', phonics: 'abc', abc: 'greetings', greetings: 'phonics' }
    },
    minsu: {
      math: { current: 'division', next: 'fraction', division: 'fraction', fraction: 'division' },
      english: { current: '8', next: '7', '8': '7', '7': '8' },
      korean: { current: '1', next: '2', '1': '2', '2': '1' },
      science: { current: '1', next: '2', '1': '2', '2': '1' },
      society: { current: '1', next: '2', '1': '2', '2': '1' }
    }
  };

  // ========================================================
  // 5. 📚 [노션 어휘 연동 엔진] 노션 용어사전 캐시 기반 4지선다 자동 합성기
  // ========================================================
  const KOREAN_TO_SUBJ_MAP = {
    korean: ['국어', '받아쓰기', '어휘', '문해력'],
    math: ['수학', '연산'],
    english: ['영어', '영단어', '파닉스'],
    society: ['사회', '역사', '지리', '문화재'],
    science: ['과학', '실험', '탐구'],
    voca: ['용어', '국어', '어휘']
  };

  function getNotionCachedVocaList(child) {
    try {
      const u = getNormalizedChildId(child);
      const childName = (u === 'minseo') ? '민서' : '민수';
      const vocaDbId = (typeof window !== 'undefined' && window.VOCA_DB_ID) ? window.VOCA_DB_ID : '375a27115b688038b686d3994ee12919';

      // 1) 전역 _loadVocaFromCache 시도
      if (typeof window !== 'undefined' && typeof window._loadVocaFromCache === 'function') {
        const cached = window._loadVocaFromCache(childName, vocaDbId);
        if (cached && Array.isArray(cached) && cached.length > 0) return cached;
      }

      // 2) 직접 localStorage 캐시 탐색 (오늘 날짜)
      const todayStr = new Date().toISOString().slice(0, 10);
      const key = `MINMIN_VOCA_CACHE_V11_${vocaDbId}_${childName}_${todayStr}`;
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.records) && parsed.records.length > 0) {
          return parsed.records;
        }
      }

      // 3) 오늘 날짜 외의 최신 캐시 탐색 (날짜 갱신 과도기 대응)
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('MINMIN_VOCA_CACHE_V11_') && k.includes(`_${childName}_`)) {
          try {
            const item = JSON.parse(localStorage.getItem(k));
            if (item && Array.isArray(item.records) && item.records.length > 0) {
              return item.records;
            }
          } catch (e) {}
        }
      }
    } catch (e) {
      console.warn('[VOCA Quest Loader] 캐시 로드 알림:', e);
    }
    return [];
  }

  function buildVocaQuestionsFromNotion(child, subj, unitKey = '') {
    try {
      const u = getNormalizedChildId(child);
      const childName = (u === 'minseo') ? '민서' : '민수';
      const vocaList = getNotionCachedVocaList(child);
      if (!vocaList || vocaList.length === 0) return [];

      const targetSubjNames = KOREAN_TO_SUBJ_MAP[subj] || [subj];

      // 1) 학생 및 과목 필터링
      const candidateRecords = vocaList.filter(item => {
        if (!item.word || !item.meaning) return false;

        // 학생 타겟 필터 (타겟이 비어있으면 공통)
        if (Array.isArray(item.target) && item.target.length > 0) {
          const hasChild = item.target.some(t => String(t).trim() === childName);
          if (!hasChild) return false;
        }

        // 과목 필터
        if (Array.isArray(item.subject) && item.subject.length > 0) {
          const hasSubj = item.subject.some(s => targetSubjNames.includes(String(s).trim()));
          if (!hasSubj) return false;
        }

        return true;
      });

      if (candidateRecords.length === 0) return [];

      // 2) 단원 필터링 (일치 우선 정렬)
      let prioritized = candidateRecords;
      if (unitKey && unitKey !== 'default') {
        const uStr = String(unitKey).trim().toLowerCase();
        const matched = candidateRecords.filter(item => {
          const stage = String(item.stage || '').toLowerCase();
          const level = String(item.level || '').toLowerCase();
          return stage.includes(uStr) || level.includes(uStr);
        });
        if (matched.length >= 2) {
          prioritized = matched;
        }
      }

      // 3) 전체 어휘 풀에서 오답 후보 수집
      const allWords = Array.from(new Set(candidateRecords.map(r => r.word.trim()))).filter(Boolean);
      const allMeanings = Array.from(new Set(candidateRecords.map(r => r.meaning.trim()))).filter(Boolean);

      const generated = [];
      const shuffledRecords = [...prioritized].sort(() => Math.random() - 0.5);

      for (const rec of shuffledRecords) {
        if (generated.length >= 5) break;

        const isMeaningToWord = Math.random() > 0.3; // 70%는 뜻->단어, 30%는 단어->뜻

        if (isMeaningToWord) {
          // 유형 A: 뜻을 보고 알맞은 단어 고르기
          const questionText = `다음 뜻풀이에 알맞은 낱말은 무엇일까요?\n"${rec.meaning}"`;
          const correctAnswer = rec.word.trim();

          const wrongCandidates = allWords.filter(w => w !== correctAnswer).sort(() => Math.random() - 0.5).slice(0, 3);

          const fallbackWrongs = ['성실', '탐구', '배려', '관찰', '협동', '지혜'];
          for (const fb of fallbackWrongs) {
            if (wrongCandidates.length >= 3) break;
            if (fb !== correctAnswer && !wrongCandidates.includes(fb)) {
              wrongCandidates.push(fb);
            }
          }

          const options = [correctAnswer, ...wrongCandidates.slice(0, 3)].sort(() => Math.random() - 0.5);
          const answerIndex = options.indexOf(correctAnswer);

          generated.push({
            id: `voca_${rec.id || Math.random().toString(36).slice(2, 7)}`,
            q: questionText,
            formula: `[어휘 개념] ${rec.hint ? '힌트: ' + rec.hint : '어휘 탐험'}`,
            options: options,
            answer: answerIndex,
            hint: rec.hint ? `초성 힌트: ${rec.hint} 💡` : `의미를 찬찬히 읽어보세요!`,
            audioText: `${rec.word}. ${rec.meaning}`,
            imageUrl: rec.imageUrl || null,
            interactiveUrl: rec.interactiveUrl || null,
            source: 'notion_voca',
            targetChild: u,
            subject: subj,
            word: rec.word,
            meaning: rec.meaning
          });
        } else {
          // 유형 B: 단어를 보고 알맞은 뜻 고르기
          const questionText = `낱말 [${rec.word}]의 알맞은 뜻풀이는 무엇일까요?`;
          const correctAnswer = rec.meaning.trim();

          const wrongCandidates = allMeanings.filter(m => m !== correctAnswer).sort(() => Math.random() - 0.5).slice(0, 3);

          const fallbackWrongs = [
            '사물의 상태나 모양을 자세히 살펴보는 것',
            '여러 사람이 함께 힘을 합쳐 일을 해내는 것',
            '남의 처지나 생각을 깊이 이해하고 도와주는 마음'
          ];
          for (const fb of fallbackWrongs) {
            if (wrongCandidates.length >= 3) break;
            if (fb !== correctAnswer && !wrongCandidates.includes(fb)) {
              wrongCandidates.push(fb);
            }
          }

          const options = [correctAnswer, ...wrongCandidates.slice(0, 3)].sort(() => Math.random() - 0.5);
          const answerIndex = options.indexOf(correctAnswer);

          generated.push({
            id: `voca_${rec.id || Math.random().toString(36).slice(2, 7)}`,
            q: questionText,
            formula: `[낱말 뜻] ${rec.word}`,
            options: options,
            answer: answerIndex,
            hint: rec.hint ? `초성 힌트: ${rec.hint} 💡` : `문맥 속에서 뜻을 연상해 보세요!`,
            audioText: `${rec.word}. ${rec.meaning}`,
            imageUrl: rec.imageUrl || null,
            interactiveUrl: rec.interactiveUrl || null,
            source: 'notion_voca',
            targetChild: u,
            subject: subj,
            word: rec.word,
            meaning: rec.meaning
          });
        }
      }

      return generated;
    } catch (e) {
      console.warn('[buildVocaQuestionsFromNotion] 합성 실패:', e);
      return [];
    }
  }

  // ========================================================
  // 6. 🚀 듀오링고형 Universal 4+1 출제 엔진 (정적 + 노션 어휘 융합)
  // ========================================================
  function getSubjectQuest(subj, unitScope = '', mode = 'mixed', customUser = '') {
    const p = new URLSearchParams(window.location.search);
    const currentUser = customUser || p.get('user') || localStorage.getItem('currentChild') || localStorage.getItem('currentUser') || 'minsu';
    const activeChild = getNormalizedChildId(currentUser);
    const isMinseo = (activeChild === 'minseo');

    const queue = getAdaptiveQueue(activeChild, subj);
    const parentSettings = getParentQuestSettings(currentUser);
    const activeUnit = unitScope || (parentSettings ? parentSettings[subj] : '') || 'default';

    // 🌸 [민서 초1 3대 정예 교과 4+1 출제]
    if (isMinseo) {
      const bank = window.minseoMasterBank || {};
      const mData = bank[subj] || bank.math || { title: "캔디 수학 놀이터", icon: "🧮" };
      const currentUnitKey = (activeUnit && mData[activeUnit]) ? activeUnit : (subj === 'korean' ? 'batchim' : (subj === 'math' ? '100num' : 'phonics'));
      const nextMap = (NEXT_UNIT_MAP.minseo && NEXT_UNIT_MAP.minseo[subj]) ? NEXT_UNIT_MAP.minseo[subj] : {};
      const nextUnitKey = nextMap[currentUnitKey] || (nextMap.current === currentUnitKey ? nextMap.next : null);

      const mainPool = mData[currentUnitKey] || [];
      const nextPool = nextUnitKey ? (mData[nextUnitKey] || []) : [];

      // 💡 노션 용어사전 캐시 기반 어휘 문제 동적 합성 및 융합
      const vocaQuestions = buildVocaQuestionsFromNotion('minseo', subj, currentUnitKey);
      let combinedMain = [...mainPool];
      if (vocaQuestions.length > 0) {
        // 어휘 문제를 1~2개 융합하여 교과 개념 드릴의 다양성 부여
        combinedMain.push(...vocaQuestions.slice(0, 2));
      }

      // 1~3번: 현재 진도 문제 3개
      const shuffledMain = [...combinedMain].sort(() => Math.random() - 0.5);
      let selected = shuffledMain.slice(0, 3);

      // 4번: 최근 오답 복습 1개 (타 학년 오염 방지 가드 검증)
      let reviewQuestion = null;
      if (queue.length > 0 && mode !== 'revenge') {
        for (let i = 0; i < queue.length; i++) {
          if (isValidQuestionForChild('minseo', subj, queue[i])) {
            reviewQuestion = queue[i];
            break;
          } else {
            queue.splice(i, 1);
            i--;
            saveAdaptiveQueue('minseo', subj, queue);
          }
        }
      }
      if (reviewQuestion) {
        selected.push(reviewQuestion);
      } else {
        const remaining = shuffledMain.slice(3, 4);
        if (remaining.length > 0) selected.push(remaining[0]);
        else if (shuffledMain.length > 0) selected.push(shuffledMain[0]);
      }

      // 5번: 🎁 다음 단원 비밀 맛보기 탐험 (하트 면제!)
      if (nextPool.length > 0) {
        const nextSample = nextPool[Math.floor(Math.random() * nextPool.length)];
        selected.push({ ...nextSample, isPreview: true });
      } else if (shuffledMain.length > 4) {
        selected.push(shuffledMain[4]);
      }

      while (selected.length < 5 && combinedMain.length > 0) {
        selected.push(combinedMain[selected.length % combinedMain.length]);
      }

      return {
        title: mData.title,
        icon: mData.icon,
        questions: selected
      };
    }

    // 👦 [민수 초5 5대 교과 4+1 출제]
    const bank = window.minsuMasterBank || {};
    const sData = bank[subj] || bank.math || { title: "수학 분쇄 던전", icon: "🧮" };
    let curUnit = activeUnit;
    if (!sData[curUnit]) {
      curUnit = (subj === 'math') ? 'division' : ((subj === 'english') ? '8' : '1');
    }

    const nextMap = (NEXT_UNIT_MAP.minsu && NEXT_UNIT_MAP.minsu[subj]) ? NEXT_UNIT_MAP.minsu[subj] : {};
    const nextUnitKey = nextMap[curUnit] || (curUnit === '1' ? '2' : (curUnit === 'division' ? 'fraction' : '7'));

    const mainPool = sData[curUnit] || [];
    const nextPool = sData[nextUnitKey] || [];

    // 💡 노션 용어사전 캐시 기반 어휘 문제 동적 합성 및 융합
    const vocaQuestions = buildVocaQuestionsFromNotion('minsu', subj, curUnit);
    let combinedMain = [...mainPool];
    if (vocaQuestions.length > 0) {
      combinedMain.push(...vocaQuestions.slice(0, 2));
    }

    // 1~3번: 현재 진도 드릴 3문제
    const shuffledMain = [...combinedMain].sort(() => Math.random() - 0.5);
    let selected = shuffledMain.slice(0, 3);

    // 4번: 최근 오답 복습 1문제 (타 학년 오염 방지 가드 검증)
    let reviewQuestion = null;
    if (queue.length > 0 && mode !== 'revenge') {
      for (let i = 0; i < queue.length; i++) {
        if (isValidQuestionForChild('minsu', subj, queue[i])) {
          reviewQuestion = queue[i];
          break;
        } else {
          queue.splice(i, 1);
          i--;
          saveAdaptiveQueue('minsu', subj, queue);
        }
      }
    }
    if (reviewQuestion) {
      selected.push(reviewQuestion);
    } else {
      selected.push(shuffledMain[3] || shuffledMain[0]);
    }

    // 5번: 🎁 다음 단원 비밀 맛보기 탐험 (하트 면제!)
    if (nextPool.length > 0) {
      const nextSample = nextPool[Math.floor(Math.random() * nextPool.length)];
      selected.push({ ...nextSample, isPreview: true });
    } else {
      selected.push(shuffledMain[4] || shuffledMain[0]);
    }

    while (selected.length < 5 && combinedMain.length > 0) {
      selected.push(combinedMain[selected.length % combinedMain.length]);
    }

    let questTitle = sData.title;
    if (subj === 'math') {
      questTitle = curUnit === 'fraction' ? "수학 분쇄 던전 · 5-2 분수의 곱셈 (심화)" : "수학 분쇄 던전 · 두 자릿수 나눗셈 (기본 진도 ⭐)";
    } else if (subj === 'english') {
      questTitle = curUnit === '7' ? "스피킹 콜로세움 · 7단원 지난 주말 이야기 (복습)" : "스피킹 콜로세움 · 8단원 외모·옷차림 (현재 진도 ⭐)";
    }

    return {
      title: questTitle,
      icon: sData.icon,
      questions: selected
    };
  }

  // ========================================================
  // 7. 📦 단원 팩 단일 원천(SSOT) 동적 로더 인터페이스
  // ========================================================
  window.loadCustomUnitPack = function(unitPackJson) {
    try {
      if (!unitPackJson || !unitPackJson.subject || !unitPackJson.unit) return false;
      const s = unitPackJson.subject;
      const u = String(unitPackJson.unit);
      if (window.minsuMasterBank && window.minsuMasterBank[s]) {
        window.minsuMasterBank[s][u] = unitPackJson.questions || [];
        console.log(`[SSOT Unit Pack Loaded] 민수 ${s} ${u}단원 (${unitPackJson.questions.length}문항)`);
        return true;
      }
      if (window.minseoMasterBank && window.minseoMasterBank[s]) {
        window.minseoMasterBank[s][u] = unitPackJson.questions || [];
        console.log(`[SSOT Unit Pack Loaded] 민서 ${s} ${u}단원 (${unitPackJson.questions.length}문항)`);
        return true;
      }
      return false;
    } catch (e) {
      console.error('[SSOT Loader Error]', e);
      return false;
    }
  };

  // 전역 노출
  window.renderFrac = renderFrac;
  window.renderMixed = renderMixed;
  window.formatFractions = formatFractions;
  window.getNormalizedChildId = getNormalizedChildId;
  window.getAdaptiveQueue = getAdaptiveQueue;
  window.saveAdaptiveQueue = saveAdaptiveQueue;
  window.recordWrongItem = recordWrongItem;
  window.recordCorrectItem = recordCorrectItem;
  window.isValidQuestionForChild = isValidQuestionForChild;
  window.getParentQuestSettings = getParentQuestSettings;
  window.NEXT_UNIT_MAP = NEXT_UNIT_MAP;
  window.getSubjectQuest = getSubjectQuest;
  window.getNotionCachedVocaList = getNotionCachedVocaList;
  window.buildVocaQuestionsFromNotion = buildVocaQuestionsFromNotion;
})();
