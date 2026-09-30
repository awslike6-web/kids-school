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
      science: { current: '1', next: '2', '1': '2', '2': '3', '3': '1' },
      society: { current: '1', next: '2', '1': '2', '2': '3', '3': '1' }
    }
  };

  /**
   * 🔄 유연한 다음 단원 계산기 (정적 맵핑 + L1~L10/1~10단원 무한 자동 순환)
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
        const nextNum = num >= 10 ? 1 : num + 1;
        return `${prefix}${nextNum}`;
      }
    }
    return childMap ? (childMap.next || childMap.current) : null;
  }

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
        const cachedAll = window._loadVocaFromCache('ALL', vocaDbId);
        if (cachedAll && Array.isArray(cachedAll) && cachedAll.length > 0) return cachedAll;
      }

      // 2) 직접 localStorage 캐시 탐색 (V11, V12 등 모든 VOCA 캐시 접두사 통합 지원)
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.includes('_VOCA_CACHE_') && (k.includes(`_${childName}_`) || k.includes('_ALL_'))) {
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

      // 2) 단원 필터링 (일치 우선 정렬: L9, 9, 9단원 유연 매칭)
      let prioritized = candidateRecords;
      if (unitKey && unitKey !== 'default') {
        const uStr = String(unitKey).trim().toLowerCase();
        const numMatch = uStr.match(/\d+/);
        const uNum = numMatch ? numMatch[0] : '';

        const matched = candidateRecords.filter(item => {
          const stage = String(item.stage || '').trim().toLowerCase();
          const level = String(item.level || '').trim().toLowerCase();
          if (stage === uStr || level === uStr) return true;
          if (stage.includes(uStr) || level.includes(uStr)) return true;
          if (uNum) {
            const sNum = (stage.match(/\d+/) || [])[0];
            if (sNum && sNum === uNum) return true;
            const lNum = (level.match(/\d+/) || [])[0];
            if (lNum && lNum === uNum) return true;
          }
          return false;
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
            audioText: (subj === 'english') ? rec.word : `${rec.word}. ${rec.meaning}`,
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
            audioText: (subj === 'english') ? rec.word : `${rec.word}. ${rec.meaning}`,
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
  // 5-2. 🏛️ 노션 교재·사료 마스터 DB 및 실전 탐구 퀴즈 융합 엔진
  // ========================================================
  function buildCurriculumQuestionsFromNotion(child, subj, unitKey = '') {
    try {
      const u = getNormalizedChildId(child);
      const generated = [];

      // 1) 사회(사료/지도/차트) 탐구 퀴즈 생성
      if (subj === 'society') {
        let historyPool = [];
        if (typeof SOCIETY_CURRICULUM_DATA !== 'undefined') {
          const gradeKey = (u === 'minseo') ? '1학년 2학기' : '5학년 2학기';
          const gradeData = SOCIETY_CURRICULUM_DATA[gradeKey] || {};
          for (const unitName in gradeData) {
            const uData = gradeData[unitName];
            if (uData && Array.isArray(uData.history) && uData.history.length > 0) {
              historyPool.push(...uData.history);
            }
            if (uData && Array.isArray(uData.voca) && uData.voca.length > 0) {
              const withImages = uData.voca.filter(v => v.image || v.img);
              if (withImages.length > 0) historyPool.push(...withImages);
            }
          }
        }

        // 전역 노션 사료 데이터가 있으면 병합
        if (typeof window !== 'undefined' && Array.isArray(window.allFetchedRecords)) {
          const notionHist = window.allFetchedRecords.filter(r => r.quiz || r.artifactName || r.img || r.imageUrl);
          if (notionHist.length > 0) historyPool.push(...notionHist);
        }

        if (historyPool.length > 0) {
          const shuffled = [...historyPool].sort(() => Math.random() - 0.5);
          for (const item of shuffled) {
            if (generated.length >= 2) break;
            const name = item.name || item.title || item.artifactName || item.word || '역사 문화유산';
            const desc = item.desc || item.detailContext || item.artifactUsage || item.meaning || '';
            const img = item.img || item.image || item.imageUrl || null;
            if (!desc) continue;

            const allDescs = historyPool.map(h => h.desc || h.detailContext || h.meaning || '').filter(d => d && d !== desc);
            const wrongOptions = Array.from(new Set(allDescs)).sort(() => Math.random() - 0.5).slice(0, 3);
            const fallbackWrongs = [
              '조선 후기에 백성들의 농사를 돕기 위해 만든 천문 기구입니다.',
              '고려 시대에 외적의 침략을 막기 위해 쌓은 산성입니다.',
              '삼국 시대에 왕과 귀족들이 착용하던 화려한 금관입니다.'
            ];
            for (const fb of fallbackWrongs) {
              if (wrongOptions.length >= 3) break;
              if (fb !== desc && !wrongOptions.includes(fb)) wrongOptions.push(fb);
            }

            const options = [desc, ...wrongOptions.slice(0, 3)].sort(() => Math.random() - 0.5);
            const answerIdx = options.indexOf(desc);

            generated.push({
              id: `curr_soc_${Math.random().toString(36).slice(2, 7)}`,
              q: item.quiz || `[역사 사료 돋보기] 다음 유물 사진에 대한 올바른 설명은 무엇일까요?`,
              formula: `🏛️ ${name}`,
              options: options,
              answer: answerIdx,
              hint: `유물의 쓰임새: ${desc.slice(0, 40)}... 💡`,
              audioText: name,
              imageUrl: img,
              source: 'notion_curriculum',
              targetChild: u,
              subject: subj
            });
          }
        }
      }

      // 2) 과학(실험/가상실험) 탐구 퀴즈 생성
      if (subj === 'science') {
        let sciencePool = [];
        if (typeof window !== 'undefined' && Array.isArray(window.cachedScienceCurriculum)) {
          sciencePool.push(...window.cachedScienceCurriculum);
        }
        if (typeof SCIENCE_CURRICULUM_DATA !== 'undefined') {
          for (const gradeKey in SCIENCE_CURRICULUM_DATA) {
            const uData = SCIENCE_CURRICULUM_DATA[gradeKey];
            if (Array.isArray(uData)) sciencePool.push(...uData);
          }
        }

        if (sciencePool.length > 0) {
          const shuffled = [...sciencePool].sort(() => Math.random() - 0.5);
          for (const item of shuffled) {
            if (generated.length >= 2) break;
            if (item.quiz && Array.isArray(item.choices) && item.choices.length >= 2) {
              generated.push({
                id: `curr_sci_${item.id || Math.random().toString(36).slice(2, 7)}`,
                q: item.quiz,
                formula: `🔬 ${item.title || '실험 관찰'}`,
                options: item.choices,
                answer: item.correctIdx ?? (item.ans ? item.ans - 1 : 0),
                hint: item.explanation || item.desc || '실험의 원리와 관찰 결과를 떠올려보세요! 💡',
                audioText: item.title || '',
                imageUrl: item.mediaUrl || null,
                source: 'notion_curriculum',
                targetChild: u,
                subject: subj
              });
            }
          }
        }
      }

      return generated;
    } catch (e) {
      console.warn('[buildCurriculumQuestionsFromNotion] 합성 알림:', e);
      return [];
    }
  }

  // ========================================================
  // 5-3. 🎲 [수학 특화] 무한 랜덤 암산 생성기 (답 외우기 원천 방지)
  // ========================================================
  function generateDynamicMentalMath(child, unitKey = '') {
    const u = getNormalizedChildId(child);

    // 👦 [초5 민수 맞춤 10초 컷 무한 암산]
    if (u === 'minsu') {
      const isFractionMode = (unitKey === 'fraction' || unitKey === '2' || Math.random() > 0.5);

      if (isFractionMode) {
        // [유형 1: 분수의 곱셈 (진분수 × 자연수)]
        const dens = [3, 5, 7];
        const d = dens[Math.floor(Math.random() * dens.length)];
        const n = Math.floor(Math.random() * (d - 1)) + 1;
        const k = Math.floor(Math.random() * 3) + 2;

        const correctNum = n * k;
        const correctFraction = `${correctNum}/${d}`;

        const wrongCandidates = [
          `${correctNum}/${d * k}`,
          `${n + k}/${d}`,
          `${n}/${d * k}`
        ].filter(w => w !== correctFraction);

        const options = [correctFraction, ...wrongCandidates.slice(0, 3)].sort(() => Math.random() - 0.5);
        const answerIdx = options.indexOf(correctFraction);

        return {
          id: `math_dyn_frac_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          q: `다음 분수의 곱셈을 계산한 값은 얼마일까요?`,
          formula: `${n}/${d} × ${k} = [ ? ]`,
          options: options,
          answer: answerIdx,
          hint: `분수의 곱셈에서 분모는 그대로 두고, 분자에만 자연수를 쏙 곱해요! 🍕`,
          source: 'dynamic_mental_math',
          subject: 'math'
        };
      } else {
        // [유형 2: 두 자릿수 ÷ 한 자릿수 실전 나눗셈 (나머지 0 보장)]
        const divisors = [2, 3, 4, 5, 6];
        const b = divisors[Math.floor(Math.random() * divisors.length)];
        const q = Math.floor(Math.random() * 14) + 11;
        const a = b * q;

        const correctAns = String(q);
        const wrongCandidates = [
          String(q - 1),
          String(q + 1),
          String(q + 10),
          String(q - 2)
        ].filter(w => w !== correctAns);

        const options = [correctAns, ...wrongCandidates.slice(0, 3)].sort(() => Math.random() - 0.5);
        const answerIdx = options.indexOf(correctAns);

        return {
          id: `math_dyn_div_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          q: `${a} ÷ ${b} 를 계산한 몫은 얼마일까요?`,
          formula: `${a} ÷ ${b} = [ ? ]`,
          options: options,
          answer: answerIdx,
          hint: `십의 자리와 일의 자리를 각각 ${b}로 나누어보세요! 💡`,
          source: 'dynamic_mental_math',
          subject: 'math'
        };
      }
    }

    // 👧 [초1 민서 맞춤 10초 컷 무한 암산]
    const isMakeTen = Math.random() > 0.5;
    if (isMakeTen) {
      const n1 = Math.floor(Math.random() * 8) + 1;
      const n2 = 10 - n1;
      const correctAns = String(n2);
      const wrongCandidates = [String(n2 + 1), String(Math.max(1, n2 - 1)), String(n1)].filter(w => w !== correctAns);
      const options = [correctAns, ...wrongCandidates.slice(0, 3)].sort(() => Math.random() - 0.5);
      const answerIdx = options.indexOf(correctAns);

      return {
        id: `math_dyn_m10_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        q: `${n1}에 얼마를 더해야 10이 될까요?`,
        formula: `${n1} + [ ? ] = 10`,
        options: options,
        answer: answerIdx,
        hint: `10 묶음을 채우려면 몇 개가 더 필요할까요? 🍬`,
        source: 'dynamic_mental_math',
        subject: 'math'
      };
    } else {
      const n1 = Math.floor(Math.random() * 5) + 1;
      const n2 = Math.floor(Math.random() * 4) + 1;
      const sum = n1 + n2;
      const correctAns = String(sum);
      const wrongCandidates = [String(sum + 1), String(sum - 1), String(sum + 2)].filter(w => w !== correctAns);
      const options = [correctAns, ...wrongCandidates.slice(0, 3)].sort(() => Math.random() - 0.5);
      const answerIdx = options.indexOf(correctAns);

      return {
        id: `math_dyn_add_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        q: `${n1} + ${n2} 를 더하면 얼마일까요?`,
        formula: `${n1} + ${n2} = [ ? ]`,
        options: options,
        answer: answerIdx,
        hint: `사탕 ${n1}개와 ${n2}개를 쏙 모아보세요! 🍬`,
        source: 'dynamic_mental_math',
        subject: 'math'
      };
    }
  }

  // ========================================================
  // 6. 🚀 듀오링고형 Universal 4+1 출제 엔진 (정적 + 노션 마스터 융합)
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

      // 🎲 수학 과목: 답 외우기 원천 차단 무한 랜덤 암산 1문제 우선 융합
      if (subj === 'math') {
        combinedMain.unshift(generateDynamicMentalMath('minseo', currentUnitKey));
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
      combinedMain.unshift(generateDynamicMentalMath('minsu', curUnit));
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

    while (selected.length < 5 && combinedMain.length > 0) {
      selected.push(combinedMain[selected.length % combinedMain.length]);
    }

    let questTitle = sData.title;
    if (subj === 'math') {
      questTitle = curUnit === 'fraction' ? "수학 분쇄 던전 · 5-2 분수의 곱셈 (심화)" : "수학 분쇄 던전 · 두 자릿수 나눗셈 (기본 진도 ⭐)";
    } else if (subj === 'english') {
      const matchL = String(curUnit).match(/^L?(\d+)$/i);
      const uNum = matchL ? matchL[1] : curUnit;
      questTitle = `스피킹 콜로세움 · ${uNum}단원 (${curUnit}) 실전 퀘스트 ⭐`;
    } else if (subj === 'science') {
      questTitle = curUnit === '3' ? "볼케이노 코어 · 3단원 온도와 열 (열의 이동 ⭐)" : (curUnit === '2' ? "볼케이노 코어 · 2단원 상태변화·지시약" : "볼케이노 코어 · 1단원 혼합물의 분리");
    } else if (subj === 'society') {
      questTitle = curUnit === '2' ? "고대 유물 지도 · 2단원 문화발전·이순신 ⭐" : "고대 유물 지도 · 1단원 조선 건국·한양 도성";
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
