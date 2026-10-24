/**
 * 🚀 [5분 퀘스트 코어 엔진 SSOT (quest_engine.js)]
 * 역할:
 * 1) 세로 분수(Vertical Fraction) 정품 렌더러
 * 2) 멀티유저 적응형 라이트너 3상자 오답 큐 V2 (Spaced Repetition)
 * 3) 타 학년 침투 차단 철벽 안전 가드 (Safety Guard)
 * 4) 듀오링고형 Universal 4+1 출제 엔진 (1~3번 현재단원, 4번 오답복습, 5번 비밀맛보기)
 * 5) 동적 단원 팩 로더 어댑터 (loadCustomUnitPack)
 * ※ 노션 어휘·교재 문제 합성과 수학 무한 암산은 quest_notion_synth.js (함께 로드 필수)
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

  // 🕒 KST 로컬 날짜 단일 헬퍼 (계약 헌법 준수: toISOString 금지)
  function getKstDateString() {
    const now = new Date();
    const kst = new Date(now.getTime() + (9 * 60 + now.getTimezoneOffset()) * 60000);
    return `${kst.getFullYear()}-${String(kst.getMonth() + 1).padStart(2, '0')}-${String(kst.getDate()).padStart(2, '0')}`;
  }

  function recordWrongItem(child, subj, questionObj) {
    if (!questionObj || !subj) return;
    const u = getNormalizedChildId(child);
    const qList = getAdaptiveQueue(u, subj);
    const existing = qList.find(item => item.q === questionObj.q);
    const today = getKstDateString();
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
        if (parsed && parsed[child]) {
          const sets = parsed[child];
          // 옛 설정의 민서 국어 '1' = "1단원" (받아쓰기 1-1 단원 "1"과 구분, parent_progress_controller.js와 같은 규칙)
          if (child === 'minseo' && sets.unitSchema !== 2 && sets.korean === '1') return { ...sets, korean: '1단원 (1. 기분을 말해요)' };
          return sets;
        }
      }
    } catch (e) {}
    return child === 'minseo'
      ? { semester: '1-2', korean: '1단원 (1. 기분을 말해요)', math: '100num', english: 'L1', includeReviewSem1: false, unitSchema: 2 }
      : { semester: '5-2', math: 'division', english: 'L9', korean: '1', science: '3', society: '1', includeReviewSem1: false, includeJihye: false };
  }

  const NEXT_UNIT_MAP = {
    minseo: {
      korean: { current: 'dictation', next: 'voca', dictation: 'voca', voca: 'dictation' },
      math: { current: '100num', next: 'addsub', '100num': 'addsub', addsub: 'shapes', shapes: '100num' },
      english: { current: 'phonics', next: 'abc', phonics: 'abc', abc: 'greetings', greetings: 'phonics' }
    },
    minsu: {
      math: { current: 'division', next: 'fraction', division: 'fraction', fraction: 'division' },
      english: { current: 'L9', next: 'L7', 'L7': 'L8', 'L8': 'L9', 'L9': 'L7', '7': '8', '8': '9', '9': '7' },
      korean: { current: '1', next: '2', '1': '2', '2': '1' },
      science: { current: '1', next: '2', '1': '2', '2': '3', '3': '1' },
      society: { current: '1', next: '2', '1': '2', '2': '3', '3': '1' }
    }
  };

  /**
   * 🔄 유연한 다음 단원 계산기 (정적 맵핑 + 2학기 7~9단원 자동 순환)
   */
  function getNextUnitKey(child, subj, currentUnit) {
    const childMap = NEXT_UNIT_MAP[child] && NEXT_UNIT_MAP[child][subj];
    if (childMap && childMap[currentUnit]) {
      return childMap[currentUnit];
    }
    // L1, L2, L3... 또는 1, 2, 3... 패턴 자동 순환 계산
    if (typeof currentUnit === 'string') {
      const matchL = currentUnit.match(/^L?(\d+)$/i);
      if (matchL) {
        const num = parseInt(matchL[1], 10);
        const prefix = currentUnit.toUpperCase().startsWith('L') ? 'L' : '';
        let nextNum;
        if (subj === 'english' && num >= 7 && num <= 9) {
          nextNum = (num >= 9) ? 7 : num + 1; // 2학기는 7, 8, 9단원 내에서 안전 순환
        } else if (subj === 'english' && num <= 6) {
          nextNum = (num >= 6) ? 1 : num + 1;
        } else {
          nextNum = (num >= 10) ? 1 : num + 1;
        }
        return `${prefix}${nextNum}`;
      }
    }
    return childMap ? (childMap.next || childMap.current) : null;
  }

  // ========================================================
  // 5. 📚 노션 어휘·교재 문제 합성 & 수학 무한 암산 → quest_notion_synth.js (window.QuestNotionSynth)
  //    호출할 때 찾으므로 두 파일의 로드 순서와 상관없다. (미로드 시 빈 배열/null 안전 폴백)
  // ========================================================
  const synth = () => window.QuestNotionSynth || null;
  const buildVocaQuestionsFromNotion = (...args) => (synth() && typeof synth().buildVocaQuestionsFromNotion === 'function') ? synth().buildVocaQuestionsFromNotion(...args) : [];
  const buildCurriculumQuestionsFromNotion = (...args) => (synth() && typeof synth().buildCurriculumQuestionsFromNotion === 'function') ? synth().buildCurriculumQuestionsFromNotion(...args) : [];
  const generateDynamicMentalMath = (...args) => (synth() && typeof synth().generateDynamicMentalMath === 'function') ? synth().generateDynamicMentalMath(...args) : null;

  // 🛡️ [원천 오프라인/빈 캐시 폴백 은행] 노션/캐시 완전 부재 시 무중단 5문항 즉시 공급
  function getStaticFallbackQuestions(child, subj) {
    const isMin = (child === 'minseo');
    if (isMin) {
      const bank = window.minseoMasterBank && window.minseoMasterBank[subj];
      if (bank) {
        for (const k of Object.keys(bank)) {
          if (Array.isArray(bank[k]) && bank[k].length >= 3) {
            return bank[k].slice(0, 5);
          }
        }
      }
      return [
        { q: "다음 중 올바른 것은 무엇일까요?", options: ["정답 🌸", "오답 1", "오답 2", "오답 3"], answer: 0, hint: "첫 번째를 골라보세요!" },
        { q: "1 + 1은 얼마일까요?", options: ["2", "3", "4", "5"], answer: 0, hint: "손가락 하나에 하나를 더해요" },
        { q: "사과의 영어 낱말은?", options: ["Apple", "Banana", "Cat", "Dog"], answer: 0, hint: "A로 시작해요" },
        { q: "우리나라의 봄에 피는 꽃은?", options: ["개나리", "코스모스", "동백꽃", "국화"], answer: 0, hint: "노란 봄꽃이에요" },
        { q: "다음 낱말을 소리 내어 읽어보세요: [친구]", options: ["친구", "학교", "가족", "선생님"], answer: 0, hint: "다정한 벗을 뜻해요", isPreview: true }
      ];
    }
    const bank = window.minsuMasterBank && window.minsuMasterBank[subj];
    if (bank) {
      for (const k of Object.keys(bank)) {
        if (Array.isArray(bank[k]) && bank[k].length >= 3) {
          return bank[k].slice(0, 5);
        }
      }
    }
    return [
      { q: "다음 중 올바른 계산 결과는?", options: ["12 × 5 = 60", "12 × 5 = 55", "12 × 5 = 65", "12 × 5 = 70"], answer: 0, hint: "10에 5를 곱하고 2에 5를 곱해요" },
      { q: "조선 시대 한글을 창제하신 임금님은?", options: ["세종대왕", "태조 이성계", "영조", "정조"], answer: 0, hint: "집현전 학자들과 함께 만드셨어요" },
      { q: "지구의 자전으로 인해 일어나는 현상은?", options: ["낮과 밤의 반복", "계절의 변화", "조석 현상", "일식과 월식"], answer: 0, hint: "하루에 한 바퀴씩 스스로 돌아요" },
      { q: "다음 영단어의 뜻으로 올바른 것은? [Environment]", options: ["환경", "경제", "과학", "우주"], answer: 0, hint: "자연과 우리 주변을 뜻해요" },
      { q: "다음 분수 중 가장 큰 것은?", options: ["3/4", "1/2", "2/5", "1/4"], answer: 0, hint: "통분하여 분자를 비교해 보세요", isPreview: true }
    ];
  }

  // ========================================================
  // 6. 🚀 듀오링고형 Universal 4+1 출제 엔진 (정적 + 노션 마스터 융합)
  // ========================================================
  function buildSubjectQuest(subj, unitScope = '', mode = 'mixed', customUser = '') {
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
      const currentUnitKey = (activeUnit && mData[activeUnit]) ? activeUnit : (subj === 'korean' ? 'dictation' : (subj === 'math' ? '100num' : 'phonics'));
      const nextMap = (NEXT_UNIT_MAP.minseo && NEXT_UNIT_MAP.minseo[subj]) ? NEXT_UNIT_MAP.minseo[subj] : {};
      const nextUnitKey = nextMap[currentUnitKey] || (nextMap.current === currentUnitKey ? nextMap.next : null);

      const mainPool = mData[currentUnitKey] || [];
      const nextPool = nextUnitKey ? (mData[nextUnitKey] || []) : [];

      // 💡 노션 용어사전 캐시 기반 어휘 문제 동적 합성 및 융합
      const vocaQuestions = buildVocaQuestionsFromNotion('minseo', subj, currentUnitKey);
      let combinedMain = [...mainPool];

      // 🎲 수학 과목: 답 외우기 원천 차단 무한 랜덤 암산 1문제 우선 융합
      if (subj === 'math') {
        const mm = generateDynamicMentalMath('minseo', currentUnitKey);
        if (mm) combinedMain.unshift(mm);
      }

      // 🏛️ 사회/과학 과목: 노션 교재·사료/실험 탐구 퀴즈 1문제 우선 융합
      if (subj === 'society' || subj === 'science') {
        const currQuestions = buildCurriculumQuestionsFromNotion('minseo', subj, currentUnitKey);
        if (currQuestions.length > 0) combinedMain.unshift(...currQuestions.slice(0, 1));
      }

      if (vocaQuestions.length > 0) {
        // 어휘 문제를 1개 융합하여 교과 개념 드릴의 다양성 부여
        combinedMain.push(...vocaQuestions.slice(0, 1));
      }

      // 1~3번: 현재 진도 문제 3개 (우선 융합 문제 보장 + 셔플)
      const topPriority = combinedMain.slice(0, 2);
      const restShuffled = combinedMain.slice(2).sort(() => Math.random() - 0.5);
      let selected = [...topPriority, ...restShuffled].slice(0, 3);

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

      // 오답 큐가 비어있을 때, 부모 복습 풀 확장 옵션(1-1 복습 풀) 연동
      if (!reviewQuestion && parentSettings.includeReviewSem1) {
        const revVoca = buildVocaQuestionsFromNotion('minseo', subj, '', { semesterScope: '1-1' });
        if (revVoca.length > 0) {
          const sample = revVoca[Math.floor(Math.random() * revVoca.length)];
          sample.formula = `[1-1 누적 복습 🔄] ${sample.formula || ''}`;
          reviewQuestion = sample;
        }
      }

      if (reviewQuestion) {
        selected.push(reviewQuestion);
      } else {
        const remaining = restShuffled.slice(1, 2);
        if (remaining.length > 0) selected.push(remaining[0]);
        else if (combinedMain.length > 3) selected.push(combinedMain[3]);
        else selected.push(combinedMain[0]);
      }

      // 5번: 🎁 다음 단원 비밀 맛보기 탐험 (하트 면제!)
      if (nextPool.length > 0) {
        const nextSample = nextPool[Math.floor(Math.random() * nextPool.length)];
        selected.push({ ...nextSample, isPreview: true });
      } else if (combinedMain.length > 4) {
        selected.push(combinedMain[4]);
      }

      selected = (selected || []).filter(Boolean);
      while (selected.length < 5 && combinedMain.length > 0) {
        selected.push(combinedMain[selected.length % combinedMain.length]);
      }

      // 🛡️ 빈 캐시/오프라인 방어막: 유효 문제가 5개 미만이면 정적 폴백 뱅크에서 무조건 채움
      if (selected.length < 5) {
        console.warn(`[Quest Fallback Guard] 민서 ${subj} 데이터 부족(${selected.length}/5) -> 정적 폴백 뱅크 가동`);
        const fallbacks = getStaticFallbackQuestions('minseo', subj);
        for (const fb of fallbacks) {
          if (selected.length >= 5) break;
          selected.push(fb);
        }
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

    // 💡 노션 동적 단원 우선 탐색: activeUnit이 노션 VOCA DB에 실제로 존재하는지 확인!
    const testVoca = (activeUnit && activeUnit !== 'default') ? buildVocaQuestionsFromNotion('minsu', subj, activeUnit) : [];

    if (!sData[curUnit] && testVoca.length === 0) {
      curUnit = (subj === 'math') ? 'division' : ((subj === 'english') ? 'L9' : '1');
    }

    const nextUnitKey = getNextUnitKey('minsu', subj, curUnit);

    const mainPool = sData[curUnit] || [];
    const nextPool = (nextUnitKey && sData[nextUnitKey]) 
      ? sData[nextUnitKey] 
      : (nextUnitKey ? buildVocaQuestionsFromNotion('minsu', subj, nextUnitKey) : []);

    // 💡 노션 용어사전 캐시 기반 어휘 문제 동적 합성 및 융합
    const vocaQuestions = testVoca.length > 0 ? testVoca : buildVocaQuestionsFromNotion('minsu', subj, curUnit);
    let combinedMain = [...mainPool];

    // 🎲 수학 과목: 답 외우기 원천 차단 무한 랜덤 암산 1문제 우선 융합
    if (subj === 'math') {
      const mm = generateDynamicMentalMath('minsu', curUnit);
      if (mm) combinedMain.unshift(mm);
    }

    // 🏛️ 사회/과학 과목: 노션 교재·사료/실험 탐구 퀴즈 1~2문제 우선 융합
    if (subj === 'society' || subj === 'science') {
      const currQuestions = buildCurriculumQuestionsFromNotion('minsu', subj, curUnit);
      if (currQuestions.length > 0) combinedMain.unshift(...currQuestions.slice(0, 2));
    }

    // 노션 기반 단원(L1~L10, 9단원 등)이고 mainPool이 비어있는 경우 노션 문제를 100% 메인 풀로 사용!
    if (combinedMain.length === 0 && vocaQuestions.length > 0) {
      combinedMain.push(...vocaQuestions);
    } else if (vocaQuestions.length > 0) {
      combinedMain.push(...vocaQuestions.slice(0, 2));
    }

    // 1~3번: 현재 진도 드릴 3문제 (우선 융합 문제 보장 + 셔플)
    const topPriority = combinedMain.slice(0, 2);
    const restShuffled = combinedMain.slice(2).sort(() => Math.random() - 0.5);
    let selected = [...topPriority, ...restShuffled].slice(0, 3);

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

    // 오답 큐가 비어있을 때, 부모 복습 풀 확장 옵션(5-1 복습 또는 지혜반 어휘) 연동
    if (!reviewQuestion) {
      if (parentSettings.includeReviewSem1) {
        const sem1Voca = buildVocaQuestionsFromNotion('minsu', subj, '', { semesterScope: '5-1' });
        if (sem1Voca.length > 0) {
          const sample = sem1Voca[Math.floor(Math.random() * sem1Voca.length)];
          sample.formula = `[5-1 누적 복습 🔄] ${sample.formula || ''}`;
          reviewQuestion = sample;
        }
      } else if (parentSettings.includeJihye) {
        const jihyeVoca = buildVocaQuestionsFromNotion('minsu', subj, '', { semesterScope: 'jihye' });
        if (jihyeVoca.length > 0) {
          const sample = jihyeVoca[Math.floor(Math.random() * jihyeVoca.length)];
          sample.formula = `[지혜반 복습 🌱] ${sample.formula || ''}`;
          reviewQuestion = sample;
        }
      }
    }

    if (reviewQuestion) {
      selected.push(reviewQuestion);
    } else {
      selected.push(restShuffled[1] || combinedMain[0]);
    }

    // 5번: 🎁 다음 단원 비밀 맛보기 탐험 (하트 면제!)
    if (nextPool.length > 0) {
      const nextSample = nextPool[Math.floor(Math.random() * nextPool.length)];
      selected.push({ ...nextSample, isPreview: true });
    } else {
      selected.push(combinedMain[4] || combinedMain[0]);
    }

    selected = (selected || []).filter(Boolean);
    while (selected.length < 5 && combinedMain.length > 0) {
      selected.push(combinedMain[selected.length % combinedMain.length]);
    }

    // 🛡️ 빈 캐시/오프라인 방어막: 유효 문제가 5개 미만이면 정적 폴백 뱅크에서 무조건 채움
    if (selected.length < 5) {
      console.warn(`[Quest Fallback Guard] 민수 ${subj} 데이터 부족(${selected.length}/5) -> 정적 폴백 뱅크 가동`);
      const fallbacks = getStaticFallbackQuestions('minsu', subj);
      for (const fb of fallbacks) {
        if (selected.length >= 5) break;
        selected.push(fb);
      }
    }

    // 제목 = 과목방 이름 + 단원 이름 (정적 문제은행 단원은 은행의 unitTitles, 그 외는 노션 캐시의 실제 단원명)
    const unitName = (sData.unitTitles && sData.unitTitles[curUnit]) || notionUnitName('minsu', subj, curUnit);
    const questTitle = unitName ? `${String(sData.title).split(' · ')[0]} · ${unitName}` : sData.title;

    return {
      title: questTitle,
      icon: sData.icon,
      questions: selected
    };
  }

  // 보기 순서 섞기: 정적 뱅크는 정답을 첫 보기(answer: 0)에 적어 두므로, 섞지 않으면 정답이 항상 1번이 된다.
  // 원본 뱅크 객체는 건드리지 않고 사본의 보기와 정답 번호만 함께 바꾼다.
  function withShuffledOptions(q) {
    if (!q || !Array.isArray(q.options) || q.options.length < 2) return q;
    if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.options.length) return q;
    const order = q.options.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    return { ...q, options: order.map(i => q.options[i]), answer: order.indexOf(q.answer) };
  }

  // 노션 VOCA 캐시에서 단원 키에 해당하는 실제 단원명 (quest-mastery.js가 없거나 못 찾으면 '')
  function notionUnitName(child, subj, unitKey) {
    const QM = window.QuestMastery;
    if (!QM || !QM.SUBJECT_KO[subj] || !unitKey) return '';
    const childName = child === 'minseo' ? '민서' : '민수';
    const settings = getParentQuestSettings(child) || {};
    const cached = synth() ? synth().getNotionCachedVocaList(child) : [];
    const items = QM.selectUnitItems(cached, { childName, subjectKo: QM.SUBJECT_KO[subj], unit: unitKey, semester: settings.semester || '' });
    return QM.unitTitle(items, QM.parseUnitList(unitKey));
  }

  function getSubjectQuest(subj, unitScope = '', mode = 'mixed', customUser = '') {
    const quest = buildSubjectQuest(subj, unitScope, mode, customUser);
    if (quest && Array.isArray(quest.questions)) quest.questions = quest.questions.map(withShuffledOptions);
    return quest;
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
})();
