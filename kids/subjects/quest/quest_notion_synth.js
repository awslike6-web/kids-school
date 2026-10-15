/**
 * 📚 [5분 퀘스트 문제 합성기 (quest_notion_synth.js)]
 * quest_engine.js에서 분리한 문제 합성부입니다. 반드시 quest_engine.js와 함께 로드합니다.
 * 1) 노션 용어사전(VOCA_DB) 캐시 기반 4지선다 합성 (getNotionCachedVocaList, buildVocaQuestionsFromNotion)
 * 2) 노션 교재·사료/실험 탐구 퀴즈 합성 (buildCurriculumQuestionsFromNotion)
 * 3) 수학 무한 랜덤 암산 생성기 (generateDynamicMentalMath)
 * 공개: window.QuestNotionSynth 네임스페이스 + 기존 전역 getNotionCachedVocaList, buildVocaQuestionsFromNotion
 */

(function() {
  // 학생 ID 정규화와 부모 설정은 quest_engine.js의 전역을 호출할 때 찾는다 (로드 순서와 무관).
  const getNormalizedChildId = (child) => window.getNormalizedChildId(child);
  const getParentQuestSettings = (child) => window.getParentQuestSettings(child);

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

  function buildVocaQuestionsFromNotion(child, subj, unitKey = '', options = {}) {
    try {
      const u = getNormalizedChildId(child);
      const childName = (u === 'minseo') ? '민서' : '민수';
      const vocaList = getNotionCachedVocaList(child);
      if (!vocaList || vocaList.length === 0) return [];

      const parentSettings = getParentQuestSettings(child) || {};
      const targetSubjNames = KOREAN_TO_SUBJ_MAP[subj] || [subj];

      // 1) 학생 및 과목 필터링
      let candidateRecords = vocaList.filter(item => {
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

      // 2) 학기/지혜반 스코프 필터링 (명시적 options.semesterScope 또는 부모 설정)
      const requestedScope = options.semesterScope || '';
      if (requestedScope && requestedScope !== 'all') {
        const scopeFiltered = candidateRecords.filter(item => {
          const gList = Array.isArray(item.grades) ? item.grades : [item.grade];
          const gStr = gList.join(' ');
          const wType = String(item.wordType || '');
          const stage = String(item.stage || '');

          if (requestedScope === 'jihye') {
            return gStr.includes('지혜') || wType.includes('지혜') || stage.includes('지혜');
          } else if (requestedScope === '5-1' || requestedScope === '1-1') {
            if (gStr.includes(requestedScope)) return true;
            const numMatch = stage.match(/\d+/);
            if (numMatch && parseInt(numMatch[0], 10) <= 6 && subj === 'english') return true;
            return false;
          } else if (requestedScope === '5-2' || requestedScope === '1-2') {
            if (gStr.includes(requestedScope)) return true;
            const numMatch = stage.match(/\d+/);
            if (numMatch && parseInt(numMatch[0], 10) >= 7 && subj === 'english') return true;
            return !gStr.includes('5-1') && !gStr.includes('1-1') && !gStr.includes('지혜');
          }
          return true;
        });
        if (scopeFiltered.length > 0) {
          candidateRecords = scopeFiltered;
        }
      }

      // 3) 단원 필터링 (일치 우선 정렬: L9, 9, 9단원 유연 매칭)
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

  window.QuestNotionSynth = {
    getNotionCachedVocaList,
    buildVocaQuestionsFromNotion,
    buildCurriculumQuestionsFromNotion,
    generateDynamicMentalMath
  };
  window.getNotionCachedVocaList = getNotionCachedVocaList;
  window.buildVocaQuestionsFromNotion = buildVocaQuestionsFromNotion;
})();
