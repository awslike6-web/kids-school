/**
 * ==============================================================================
 * ⚙️ 부모 진도 관리판 2.0 전용 독립 컨트롤러 (parent_progress_controller.js)
 * ------------------------------------------------------------------------------
 * - 단일 원천(SSOT): 노션 용어사전(VOCA DB) 및 교과 마스터 뱅크 기반 동적 단원 송출
 * - Zero Hardcoding: HTML 내 정적 칩 완전 제거 및 100% 런타임 동적 빌드
 * - 계층형 듀얼 셀렉터: 학기/과정 알약 필터(5-2/5-1/지혜반/전체, 1-2/1-1/기초/전체)
 * - 4번 망각곡선 복습 풀 확장 옵션(토글 스위치) 및 노션 클라우드 동기화
 * ==============================================================================
 */

(function(window) {
  'use strict';

  // 1. 단원 친절 메타 명칭 사전 (Zero Hardcoding 기반 표시 라벨 매핑)
  const UNIT_META_MAP = {
    minseo: {
      korean: {
        batchim: '받침 글자 (2~3단원 추천) ⭐',
        dictation: '받아쓰기 100문장',
        voca: '그림 낱말 탐험'
      },
      math: {
        '100num': '100까지의 수 ⭐',
        addsub: '한자리 덧뺄셈',
        shapes: '여러가지 모양'
      },
      english: {
        phonics: '파닉스 첫단어 ⭐',
        greetings: '기초 인사말',
        abc: '알파벳 소리'
      }
    },
    minsu: {
      math: {
        division: '두 자릿수 나눗셈 ⭐',
        fraction: '5-2 분수의 곱셈'
      },
      english: {
        'L9': '9단원 집·방 묘사 (L9) ⭐',
        'L8': '8단원 외모 묘사 (L8)',
        'L7': '7단원 길찾기 (L7)',
        'L6': '6단원 (L6)',
        'L5': '5단원 (L5)',
        'L4': '4단원 (L4)',
        'L3': '3단원 (L3)',
        'L2': '2단원 (L2)',
        'L1': '1단원 (L1)',
        '9': '9단원 집·방 묘사 ⭐',
        '8': '8단원 외모 묘사',
        '7': '7단원 길찾기',
        '6': '6단원 (L6)',
        '5': '5단원 (L5)',
        '4': '4단원 (L4)',
        '3': '3단원 (L3)',
        '2': '2단원 (L2)',
        '1': '1단원 (L1)'
      },
      korean: {
        '1': '1단원 어휘·속담 ⭐',
        '2': '2단원 문맥·독해'
      },
      science: {
        '1': '1단원 혼합물의 분리',
        '2': '2단원 상태변화·지시약',
        '3': '3단원 온도와 열 (열의 이동) ⭐'
      },
      society: {
        '1': '1단원 조선 건국·한양 ⭐',
        '2': '2단원 문화발전·이순신',
        '3': '3단원 유교문화·민족의 시련'
      }
    }
  };

  // 2. 기본값 규격 (2학기 집중 및 복습 옵션 기본값)
  const DEFAULT_PARENT_SETTINGS = {
    minseo: {
      semester: '1-2',
      korean: 'batchim',
      math: '100num',
      english: 'phonics',
      includeReviewSem1: false
    },
    minsu: {
      semester: '5-2',
      math: 'division',
      english: 'L9',
      korean: '1',
      science: '3',
      society: '1',
      includeReviewSem1: false,
      includeJihye: false
    }
  };

  // 3. 단원 번호 정규화 및 동일 단원 판별기 (L9 == 9단원 단일화)
  function getUnitNumber(unitStr) {
    if (!unitStr) return '';
    const match = String(unitStr).match(/\d+/);
    return match ? match[0] : String(unitStr).trim();
  }

  function isSameUnit(u1, u2) {
    if (u1 === u2) return true;
    if (!u1 || !u2) return false;
    const n1 = getUnitNumber(u1);
    const n2 = getUnitNumber(u2);
    if (n1 && n2 && n1 === n2) return true;
    const s1 = String(u1).trim().toLowerCase().replace(/^l/i, '').replace(/단원$/, '');
    const s2 = String(u2).trim().toLowerCase().replace(/^l/i, '').replace(/단원$/, '');
    return s1 === s2;
  }

  // 4. 부모 진도 설정값 로드 및 병합 (로컬 + 노션 클라우드 캐시)
  let currentParentSettings = (function() {
    try {
      const raw = localStorage.getItem('MINMIN_QUEST_SETTINGS');
      let parsed = raw ? JSON.parse(raw) : {};

      const cloudMinsu = localStorage.getItem('MINMIN_CLOUD_SETTINGS_민수');
      if (cloudMinsu) {
        try {
          const cObj = JSON.parse(cloudMinsu);
          if (cObj && cObj.questSettings && cObj.questSettings.minsu) {
            parsed.minsu = { ...(parsed.minsu || {}), ...cObj.questSettings.minsu };
          }
        } catch(e) {}
      }
      const cloudMinseo = localStorage.getItem('MINMIN_CLOUD_SETTINGS_민서');
      if (cloudMinseo) {
        try {
          const cObj = JSON.parse(cloudMinseo);
          if (cObj && cObj.questSettings && cObj.questSettings.minseo) {
            parsed.minseo = { ...(parsed.minseo || {}), ...cObj.questSettings.minseo };
          }
        } catch(e) {}
      }

      return {
        minseo: { ...DEFAULT_PARENT_SETTINGS.minseo, ...(parsed.minseo || {}) },
        minsu: { ...DEFAULT_PARENT_SETTINGS.minsu, ...(parsed.minsu || {}) }
      };
    } catch (e) {}
    return JSON.parse(JSON.stringify(DEFAULT_PARENT_SETTINGS));
  })();

  const isCurrentMinseo = (typeof isMinseo !== 'undefined') ? isMinseo : false;
  let currentParentTab = isCurrentMinseo ? 'minseo' : 'minsu';

  function playUiPop() {
    if (typeof pokeSound === 'function') pokeSound('pop');
  }

  // 5. 🎯 학기/과정 선택기
  function setParentSemester(child, sem) {
    if (!currentParentSettings[child]) currentParentSettings[child] = {};
    currentParentSettings[child].semester = sem;
    playUiPop();
    renderParentProgressChips();
  }

  // 6. 🔄 4번 망각곡선 복습 풀 확장 옵션 토글
  function toggleReviewOption(child, optionKey, isChecked) {
    if (!currentParentSettings[child]) currentParentSettings[child] = {};
    currentParentSettings[child][optionKey] = !!isChecked;
    playUiPop();
  }

  // 7. 단원 선택기
  function setParentUnit(child, subject, unit) {
    if (!currentParentSettings[child]) currentParentSettings[child] = {};
    currentParentSettings[child][subject] = unit;
    playUiPop();
    renderParentProgressChips();
  }

  // 8. 📦 기본 교과 단위 정적 뼈대 정의 (초기 동적 렌더링 템플릿)
  const INITIAL_SUBJECT_UNITS = {
    minseo: {
      korean: [
        { unit: 'batchim', label: '받침 글자 ⭐', sem: '1-2' },
        { unit: 'dictation', label: '받아쓰기 100', sem: '1-2' },
        { unit: 'voca', label: '그림 낱말 탐험', sem: '1-1,basic' }
      ],
      math: [
        { unit: '100num', label: '100까지 수 ⭐', sem: '1-2,basic' },
        { unit: 'addsub', label: '한자리 덧뺄셈', sem: '1-2' },
        { unit: 'shapes', label: '여러가지 모양', sem: '1-1' }
      ],
      english: [
        { unit: 'phonics', label: '파닉스 첫단어 ⭐', sem: 'basic,1-2' },
        { unit: 'greetings', label: '기초 인사말', sem: '1-2,basic' },
        { unit: 'abc', label: '알파벳 소리', sem: '1-1,basic' }
      ]
    },
    minsu: {
      science: [
        { unit: '1', label: '1단원 혼합물의 분리', sem: '5-2' },
        { unit: '2', label: '2단원 상태변화·지시약', sem: '5-2' },
        { unit: '3', label: '3단원 온도와 열 (열의 이동) ⭐', sem: '5-2' }
      ],
      math: [
        { unit: 'division', label: '두 자릿수 나눗셈 ⭐', sem: '5-2' },
        { unit: 'fraction', label: '5-2 분수의 곱셈', sem: '5-2' }
      ],
      english: [
        { unit: 'L9', label: '9단원 집·방 묘사 ⭐', sem: '5-2' },
        { unit: 'L8', label: '8단원 외모 묘사', sem: '5-2' },
        { unit: 'L7', label: '7단원 길찾기', sem: '5-2' }
      ],
      korean: [
        { unit: '1', label: '1단원 어휘·속담 ⭐', sem: '5-2' },
        { unit: '2', label: '2단원 문맥·독해', sem: '5-2' }
      ],
      society: [
        { unit: '1', label: '1단원 조선 건국·한양 ⭐', sem: '5-2' },
        { unit: '2', label: '2단원 문화발전·이순신', sem: '5-2' },
        { unit: '3', label: '3단원 유교문화·민족의 시련', sem: '5-2' }
      ]
    }
  };

  /**
   * 🔄 100% 동적 단원 칩 빌더 & 노션 캐시 자동 동기화 엔진 (Zero Hardcoding)
   * HTML의 빈 컨테이너에 노션 및 문제은행 데이터를 기반으로 버튼을 동적 생성
   */
  function syncDynamicUnitChips() {
    try {
      // 1) 👧 민서 교과 칩 동적 빌드
      Object.keys(INITIAL_SUBJECT_UNITS.minseo).forEach(subj => {
        const capitalized = subj.charAt(0).toUpperCase() + subj.slice(1);
        const container = document.getElementById(`parentMinseo${capitalized}Chips`);
        if (!container) return;

        container.innerHTML = ''; // 기존 하드코딩 완전 청소
        const unitList = INITIAL_SUBJECT_UNITS.minseo[subj] || [];
        unitList.forEach(item => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'parent-chip py-1.5 px-2 rounded-xl text-xs font-bold text-center border transition-all';
          btn.setAttribute('data-subject', subj);
          btn.setAttribute('data-unit', item.unit);
          btn.setAttribute('data-sem', item.sem);
          btn.textContent = item.label;
          btn.onclick = () => setParentUnit('minseo', subj, item.unit);
          container.appendChild(btn);
        });
      });

      // 2) 👦 민수 교과 칩 동적 빌드 및 노션 VOCA 캐시 단원 융합
      const discoveredUnits = { english: [], science: [], society: [], korean: [], math: [] };

      // 노션 VOCA 캐시에서 실제 등록된 단원 탐색
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.includes('_VOCA_CACHE_')) {
          try {
            const data = JSON.parse(localStorage.getItem(k));
            if (data && Array.isArray(data.records)) {
              data.records.forEach(r => {
                const stage = r.stage || r.level;
                if (!stage || stage === '기본 단원') return;
                const subjs = Array.isArray(r.subject) ? r.subject : [r.subject];

                let semType = '5-2';
                const gList = Array.isArray(r.grades) ? r.grades : [r.grade];
                const gStr = gList.join(' ');
                if (gStr.includes('지혜') || String(r.wordType || '').includes('지혜')) {
                  semType = 'jihye';
                } else if (gStr.includes('5-1')) {
                  semType = '5-1';
                } else {
                  const numMatch = String(stage).match(/\d+/);
                  if (numMatch) {
                    const num = parseInt(numMatch[0], 10);
                    semType = (num <= 6) ? '5-1' : '5-2';
                  }
                }

                subjs.forEach(s => {
                  const sStr = String(s).trim();
                  const item = { stage, semType };
                  if (sStr.includes('영어')) discoveredUnits.english.push(item);
                  else if (sStr.includes('과학')) discoveredUnits.science.push(item);
                  else if (sStr.includes('사회')) discoveredUnits.society.push(item);
                  else if (sStr.includes('국어')) discoveredUnits.korean.push(item);
                  else if (sStr.includes('수학')) discoveredUnits.math.push(item);
                });
              });
            }
          } catch(e) {}
        }
      }

      // 민수 5대 교과 동적 칩 주입
      const minsuSubjects = ['science', 'math', 'english', 'korean', 'society'];
      minsuSubjects.forEach(subj => {
        const capitalized = subj.charAt(0).toUpperCase() + subj.slice(1);
        const container = document.getElementById(`parentMinsu${capitalized}Chips`);
        if (!container) return;

        container.innerHTML = ''; // 기존 하드코딩 완전 청소

        // 기본 뼈대 단원
        const baseUnits = INITIAL_SUBJECT_UNITS.minsu[subj] || [];
        const seenUnitNumbers = new Set();

        baseUnits.forEach(item => {
          const uNum = getUnitNumber(item.unit);
          if (uNum) seenUnitNumbers.add(uNum);

          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'parent-chip py-1.5 px-2 rounded-xl text-xs font-bold text-center border transition-all';
          btn.setAttribute('data-subject', subj);
          btn.setAttribute('data-unit', item.unit);
          btn.setAttribute('data-sem', item.sem);
          btn.textContent = item.label;
          btn.onclick = () => setParentUnit('minsu', subj, item.unit);
          container.appendChild(btn);
        });

        // 노션에서 추가로 발견된 단원(1학기 복습 단원 등) 동적 주입 (중복 방지)
        const discovered = discoveredUnits[subj] || [];
        discovered.forEach(item => {
          const cleanKey = String(item.stage).trim();
          const uNum = getUnitNumber(cleanKey);
          if (!cleanKey || (uNum && seenUnitNumbers.has(uNum))) return;

          seenUnitNumbers.add(uNum || cleanKey);

          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'parent-chip py-1.5 px-2 rounded-xl text-xs font-bold text-center border transition-all';
          btn.setAttribute('data-subject', subj);
          btn.setAttribute('data-unit', cleanKey);
          btn.setAttribute('data-sem', item.semType || '5-2');

          const metaMap = UNIT_META_MAP.minsu[subj];
          const metaLabel = metaMap && (metaMap[cleanKey] || metaMap[uNum] || metaMap['L' + uNum]);
          btn.textContent = metaLabel || `${uNum || cleanKey}단원 (${cleanKey})`;
          btn.onclick = () => setParentUnit('minsu', subj, cleanKey);
          container.appendChild(btn);
        });
      });

      // 3) 백그라운드 노션 최신화 (논블로킹)
      if (typeof window.fetchVocaFromNotion === 'function' && !window._hasSyncedNotionUnits) {
        window._hasSyncedNotionUnits = true;
        window.fetchVocaFromNotion({ filterByStudent: false }).then(records => {
          if (records && records.length > 0) {
            syncDynamicUnitChips();
            renderParentProgressChips();
          }
        }).catch(e => console.warn('[fetchVocaFromNotion background sync]', e));
      }
    } catch (err) {
      console.warn('[syncDynamicUnitChips] 동적 단원 동기화 알림:', err);
    }
  }

  // 9. 단원 칩 가시성 및 배지 렌더링
  function renderParentProgressChips() {
    // 1) 👧 민서 렌더링
    const minseoSets = currentParentSettings.minseo || DEFAULT_PARENT_SETTINGS.minseo;
    const minseoSem = minseoSets.semester || '1-2';

    document.querySelectorAll('#minseoSemesterTabGroup button[data-sem]').forEach(btn => {
      const s = btn.getAttribute('data-sem');
      if (s === minseoSem) {
        btn.className = 'py-1.5 px-1.5 rounded-xl text-xs font-bold text-center border transition-all bg-pink-500 text-white border-pink-400 shadow-sm font-black';
      } else {
        btn.className = 'py-1.5 px-1.5 rounded-xl text-xs font-bold text-center border transition-all bg-lab-bg/80 text-gray-400 border-lab-card-border hover:text-white';
      }
    });

    const bMinseoSemDesc = document.getElementById('badgeMinseoSemesterDesc');
    if (bMinseoSemDesc) {
      const sMap = { '1-2': '1-2학기 집중 (기본 ⭐)', '1-1': '1-1학기 복습', 'basic': '기초·파닉스 집중', 'all': '전체 단원 펼침' };
      bMinseoSemDesc.textContent = sMap[minseoSem] || minseoSem;
    }

    document.querySelectorAll('#parentMinseoSettings .parent-chip').forEach(btn => {
      const subj = btn.getAttribute('data-subject');
      const unit = btn.getAttribute('data-unit');
      const btnSems = (btn.getAttribute('data-sem') || '').split(',').map(s => s.trim());

      const isVisible = (minseoSem === 'all') || btnSems.length === 0 || btnSems.includes(minseoSem);
      btn.style.display = isVisible ? '' : 'none';

      const isSelected = (minseoSets[subj] === unit);
      if (isSelected) {
        btn.className = 'parent-chip py-1.5 px-2 rounded-xl text-xs font-bold text-center border transition-all bg-[#ff85a2] text-white border-[#ff85a2] shadow-sm';
      } else {
        btn.className = 'parent-chip py-1.5 px-2 rounded-xl text-xs font-bold text-center border transition-all bg-lab-card/80 text-gray-300 border-lab-card-border hover:border-pink-300';
      }
    });

    const bMinKor = document.getElementById('badgeMinseoKorean');
    if (bMinKor) {
      bMinKor.textContent = (UNIT_META_MAP.minseo.korean && UNIT_META_MAP.minseo.korean[minseoSets.korean]) || minseoSets.korean;
    }
    const bMinMath = document.getElementById('badgeMinseoMath');
    if (bMinMath) {
      bMinMath.textContent = (UNIT_META_MAP.minseo.math && UNIT_META_MAP.minseo.math[minseoSets.math]) || minseoSets.math;
    }
    const bMinEng = document.getElementById('badgeMinseoEnglish');
    if (bMinEng) {
      bMinEng.textContent = (UNIT_META_MAP.minseo.english && UNIT_META_MAP.minseo.english[minseoSets.english]) || minseoSets.english;
    }

    const chkMinseoRev = document.getElementById('chkMinseoReviewSem1');
    if (chkMinseoRev) chkMinseoRev.checked = !!minseoSets.includeReviewSem1;

    // 2) 👦 민수 렌더링
    const minsuSets = currentParentSettings.minsu || DEFAULT_PARENT_SETTINGS.minsu;
    const minsuSem = minsuSets.semester || '5-2';

    document.querySelectorAll('#minsuSemesterTabGroup button[data-sem]').forEach(btn => {
      const s = btn.getAttribute('data-sem');
      if (s === minsuSem) {
        btn.className = 'py-1.5 px-1.5 rounded-xl text-xs font-bold text-center border transition-all bg-neon-cyan text-lab-bg border-neon-cyan shadow-sm font-black';
      } else {
        btn.className = 'py-1.5 px-1.5 rounded-xl text-xs font-bold text-center border transition-all bg-lab-bg/80 text-gray-400 border-lab-card-border hover:text-white';
      }
    });

    const bMinsuSemDesc = document.getElementById('badgeMinsuSemesterDesc');
    if (bMinsuSemDesc) {
      const sMap = { '5-2': '5-2학기 집중 (기본 ⭐)', '5-1': '5-1학기 복습', 'jihye': '지혜반(특수학급) 집중', 'all': '전체 단원 펼침' };
      bMinsuSemDesc.textContent = sMap[minsuSem] || minsuSem;
    }

    document.querySelectorAll('#parentMinsuSettings .parent-chip').forEach(btn => {
      const subj = btn.getAttribute('data-subject');
      const unit = btn.getAttribute('data-unit');
      const btnSems = (btn.getAttribute('data-sem') || '').split(',').map(s => s.trim());

      const isVisible = (minsuSem === 'all') || btnSems.length === 0 || btnSems.includes(minsuSem);
      btn.style.display = isVisible ? '' : 'none';

      const isSelected = isSameUnit(minsuSets[subj], unit);
      if (isSelected) {
        btn.className = 'parent-chip py-1.5 px-2 rounded-xl text-xs font-bold text-center border transition-all bg-neon-green text-[#023300] border-neon-green shadow-sm';
      } else {
        btn.className = 'parent-chip py-1.5 px-2 rounded-xl text-xs font-bold text-center border transition-all bg-lab-card/80 text-gray-300 border-lab-card-border hover:border-neon-green/40';
      }
    });

    const bMinuMath = document.getElementById('badgeMinsuMath');
    if (bMinuMath) {
      bMinuMath.textContent = (UNIT_META_MAP.minsu.math && UNIT_META_MAP.minsu.math[minsuSets.math]) || minsuSets.math;
    }
    const bMinuEng = document.getElementById('badgeMinsuEnglish');
    if (bMinuEng) {
      const u = minsuSets.english;
      const meta = UNIT_META_MAP.minsu.english;
      const numMatch = String(u).match(/\d+/);
      const uNum = numMatch ? numMatch[0] : u;
      const label = (meta && (meta[u] || meta[uNum] || meta['L' + uNum])) || `${uNum}단원 (${u})`;
      bMinuEng.textContent = label;
    }
    const bMinuKor = document.getElementById('badgeMinsuKorean');
    if (bMinuKor) {
      bMinuKor.textContent = (UNIT_META_MAP.minsu.korean && UNIT_META_MAP.minsu.korean[minsuSets.korean]) || `${minsuSets.korean}단원`;
    }
    const bMinuSci = document.getElementById('badgeMinsuScience');
    if (bMinuSci) {
      bMinuSci.textContent = (UNIT_META_MAP.minsu.science && UNIT_META_MAP.minsu.science[minsuSets.science]) || `${minsuSets.science}단원`;
    }
    const bMinuSoc = document.getElementById('badgeMinsuSociety');
    if (bMinuSoc) {
      bMinuSoc.textContent = (UNIT_META_MAP.minsu.society && UNIT_META_MAP.minsu.society[minsuSets.society]) || `${minsuSets.society}단원`;
    }

    const chkMinsuRev1 = document.getElementById('chkMinsuReviewSem1');
    if (chkMinsuRev1) chkMinsuRev1.checked = !!minsuSets.includeReviewSem1;
    const chkMinsuJihye = document.getElementById('chkMinsuJihye');
    if (chkMinsuJihye) chkMinsuJihye.checked = !!minsuSets.includeJihye;
  }

  // 10. 모달 열기/닫기/탭 전환
  function openParentProgressModal(initialTab = '') {
    playUiPop();
    const isCurrentMinseoLocal = (typeof window.isMinseo !== 'undefined') ? window.isMinseo : false;
    currentParentTab = initialTab || (isCurrentMinseoLocal ? 'minseo' : 'minsu');
    switchParentTab(currentParentTab);
    syncDynamicUnitChips();
    renderParentProgressChips();

    const modal = document.getElementById('parentProgressModal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  }

  function closeParentProgressModal(event) {
    if (event && event.target !== event.currentTarget) return;
    playUiPop();
    const modal = document.getElementById('parentProgressModal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  function switchParentTab(tab = 'minseo') {
    currentParentTab = tab;
    playUiPop();

    const btnMinseo = document.getElementById('parentTabMinseo');
    const btnMinsu = document.getElementById('parentTabMinsu');
    const btnGuide = document.getElementById('parentTabGuide');
    const secMinseo = document.getElementById('parentMinseoSettings');
    const secMinsu = document.getElementById('parentMinsuSettings');
    const secGuide = document.getElementById('parentGuideSettings');
    const banner = document.getElementById('parentProgressBanner');
    const btnSave = document.getElementById('btnParentSaveSettings');
    const title = document.getElementById('parentModalTitle');

    const inactiveClass = 'flex-1 py-2 text-xs font-bold rounded-xl text-gray-400 hover:text-white transition-all flex items-center justify-center gap-1';
    if (btnMinseo) btnMinseo.className = inactiveClass;
    if (btnMinsu) btnMinsu.className = inactiveClass;
    if (btnGuide) btnGuide.className = inactiveClass;

    if (secMinseo) secMinseo.classList.add('hidden');
    if (secMinsu) secMinsu.classList.add('hidden');
    if (secGuide) secGuide.classList.add('hidden');

    const isCurrentMinseoLocal = (typeof window.isMinseo !== 'undefined') ? window.isMinseo : false;

    if (tab === 'minseo') {
      if (btnMinseo) btnMinseo.className = 'flex-1 py-2 text-xs font-bold rounded-xl bg-[#ff85a2] text-white shadow transition-all flex items-center justify-center gap-1 font-black';
      if (secMinseo) secMinseo.classList.remove('hidden');
      if (banner) banner.classList.remove('hidden');
      if (btnSave) {
        btnSave.classList.remove('hidden');
        btnSave.textContent = '💾 민서 설정 저장';
      }
      if (title) title.textContent = '부모 진도 관리판 (민서)';
    } else if (tab === 'minsu') {
      if (btnMinsu) btnMinsu.className = 'flex-1 py-2 text-xs font-bold rounded-xl bg-neon-cyan text-lab-bg shadow transition-all flex items-center justify-center gap-1 font-black';
      if (secMinsu) secMinsu.classList.remove('hidden');
      if (banner) banner.classList.remove('hidden');
      if (btnSave) {
        btnSave.classList.remove('hidden');
        btnSave.textContent = '💾 민수 설정 저장';
      }
      if (title) title.textContent = '부모 진도 관리판 (민수)';
    } else if (tab === 'guide') {
      if (btnGuide) btnGuide.className = 'flex-1 py-2 text-xs font-bold rounded-xl bg-amber-400 text-amber-950 shadow transition-all flex items-center justify-center gap-1 font-black';
      if (secGuide) secGuide.classList.remove('hidden');
      if (banner) banner.classList.add('hidden');
      if (btnSave) {
        btnSave.classList.remove('hidden');
        btnSave.textContent = '🎯 진도 설정하러 가기';
        btnSave.onclick = () => switchParentTab(isCurrentMinseoLocal ? 'minseo' : 'minsu');
      }
      if (title) title.textContent = '5분 퀘스트 원리·활용 가이드';
    }

    if (tab !== 'guide' && btnSave) {
      btnSave.onclick = saveParentProgressSettings;
    }

    syncDynamicUnitChips();
    renderParentProgressChips();
  }

  // 11. 클라우드 노션 동기화
  async function syncParentProgressToCloud() {
    const isCurrentMinseoLocal = (typeof window.isMinseo !== 'undefined') ? window.isMinseo : false;
    const childName = isCurrentMinseoLocal ? '민서' : '민수';
    const proxyUrl = "https://minmin-notion.awslike6.workers.dev";
    const invDbId = "374a27115b688042bb61e6a102242e12";
    try {
      let pageId = localStorage.getItem(`MINMIN_INVENTORY_PAGE_ID_${childName}`);
      if (!pageId) {
        const qRes = await fetch(`${proxyUrl}/v1/databases/${invDbId}/query`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filter: { property: "이름", title: { equals: childName } } })
        });
        if (qRes.ok) {
          const qData = await qRes.json();
          if (qData.results && qData.results.length > 0) {
            pageId = qData.results[0].id;
            localStorage.setItem(`MINMIN_INVENTORY_PAGE_ID_${childName}`, pageId);
          }
        }
      }
      if (!pageId) return;

      let currentCloud = {};
      try {
        const cachedRaw = localStorage.getItem(`MINMIN_CLOUD_SETTINGS_${childName}`) || "{}";
        currentCloud = JSON.parse(cachedRaw);
        if (typeof currentCloud !== 'object' || currentCloud === null) currentCloud = {};
      } catch (e) {
        currentCloud = {};
      }

      currentCloud.questSettings = currentParentSettings;
      currentCloud.updatedAt = new Date().toISOString();
      const jsonStr = JSON.stringify(currentCloud);
      localStorage.setItem(`MINMIN_CLOUD_SETTINGS_${childName}`, jsonStr);

      await fetch(`${proxyUrl}/v1/pages/${pageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          properties: {
            "학습설정": {
              rich_text: [{ text: { content: jsonStr } }]
            }
          }
        })
      });
      console.log(`☁️ [5분 퀘스트 진도 노션 저장 성공] ${childName}:`, currentParentSettings);
    } catch (err) {
      console.warn("⚠️ [5분 퀘스트 진도 노션 저장 통신 에러]:", err);
    }
  }

  // 12. 설정 저장
  function saveParentProgressSettings() {
    try {
      localStorage.setItem('MINMIN_QUEST_SETTINGS', JSON.stringify(currentParentSettings));
    } catch (e) {}
    if (typeof pokeSound === 'function') pokeSound('launch');
    if (typeof triggerHaptic === 'function') triggerHaptic([40, 80, 40]);
    updateMainQuestSubText();
    closeParentProgressModal();
    syncParentProgressToCloud();
    alert('🎉 부모 진도 설정이 저장되었습니다!\n다음 퀘스트부터 4+1 듀오링고 출제에 자동 반영됩니다. ✨');
  }

  // 13. 메인 젤리 버튼 서브텍스트 갱신
  function updateMainQuestSubText() {
    const qSub = document.getElementById('mainQuestSub');
    const rec = document.getElementById('modalRecommend');
    const isCurrentMinseoLocal = (typeof window.isMinseo !== 'undefined') ? window.isMinseo : false;

    if (isCurrentMinseoLocal) {
      const sets = currentParentSettings.minseo || DEFAULT_PARENT_SETTINGS.minseo;
      const korName = (UNIT_META_MAP.minseo.korean && UNIT_META_MAP.minseo.korean[sets.korean]) || sets.korean;
      const mathName = (UNIT_META_MAP.minseo.math && UNIT_META_MAP.minseo.math[sets.math]) || sets.math;
      if (qSub) qSub.textContent = `🧮 1-2 ${mathName} · 필수 ⭐`;
      if (rec) rec.textContent = `💡 오늘의 추천 진도: ${korName} & ${mathName} (필수 ⭐)`;
    } else {
      const sets = currentParentSettings.minsu || DEFAULT_PARENT_SETTINGS.minsu;
      const mathName = (UNIT_META_MAP.minsu.math && UNIT_META_MAP.minsu.math[sets.math]) || sets.math;
      const sciName = (UNIT_META_MAP.minsu.science && UNIT_META_MAP.minsu.science[sets.science]) || `${sets.science}단원`;
      const engU = sets.english;
      const engMeta = UNIT_META_MAP.minsu.english;
      const engNumMatch = String(engU).match(/\d+/);
      const engNum = engNumMatch ? engNumMatch[0] : engU;
      const engName = (engMeta && (engMeta[engU] || engMeta[engNum] || engMeta['L' + engNum])) || `${engNum}단원 (${engU})`;
      if (qSub) qSub.textContent = `🧮 ${mathName} · 필수 ⭐`;
      if (rec) rec.textContent = `💡 오늘의 권장 진도: 🔤 ${engName} & 🔬 ${sciName}`;
    }
  }

  // 전역 인터페이스 노출
  window.UNIT_META_MAP = UNIT_META_MAP;
  window.DEFAULT_PARENT_SETTINGS = DEFAULT_PARENT_SETTINGS;
  window.getUnitNumber = getUnitNumber;
  window.isSameUnit = isSameUnit;
  window.currentParentSettings = currentParentSettings;
  window.setParentSemester = setParentSemester;
  window.toggleReviewOption = toggleReviewOption;
  window.setParentUnit = setParentUnit;
  window.syncDynamicUnitChips = syncDynamicUnitChips;
  window.renderParentProgressChips = renderParentProgressChips;
  window.openParentProgressModal = openParentProgressModal;
  window.closeParentProgressModal = closeParentProgressModal;
  window.switchParentTab = switchParentTab;
  window.saveParentProgressSettings = saveParentProgressSettings;
  window.updateMainQuestSubText = updateMainQuestSubText;

  // DOMContentLoaded 시 자동 동기화 1회 실행
  document.addEventListener('DOMContentLoaded', () => {
    syncDynamicUnitChips();
    updateMainQuestSubText();
  });

})(window);
