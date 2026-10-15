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

  // 1. 정적 문제은행 단원 표시명 (민서 정적 칩·수학만. 노션 단원은 노션 단원명을 그대로 쓴다)
  const UNIT_META_MAP = {
    minseo: {
      korean: {
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
      }
      // 영어·국어·과학·사회 단원 이름은 노션 단원명에서 가져온다 (ParentUnitChips.labelOf)
    }
  };

  // 2. 기본값 규격 (2학기 집중 및 복습 옵션 기본값)
  const DEFAULT_PARENT_SETTINGS = {
    minseo: {
      semester: '1-2',
      korean: '1단원 (1. 기분을 말해요)', // 노션 단원명 그대로 ('1'은 1-1 받아쓰기 단원 "1"과 겹친다)
      unitSchema: 2,
      math: '100num',
      english: 'L1',      // 노션 VOCA 영어 L1~L10 (학년 '기초')
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

  // 단원명 맨 앞 번호만 추출 ("3. 온도와 열"·"L9" → "3"·"9", "[센터 5-2] 14번" → '')
  // 첫 숫자를 쓰면 센터 지문이 전부 "5"(학년)로 묶여 칩이 1개만 남던 문제를 막는다.
  function getLeadingUnitNumber(unitStr) {
    const match = String(unitStr || '').trim().match(/^L?(\d+)/i);
    return match ? match[1] : '';
  }

  // 단원 설정값 → 목록 (배열 = 다중 단원 묶음, 문자열 = 기존 단일 단원)
  function toUnitList(value) {
    if (Array.isArray(value)) return value.filter(Boolean);
    return value ? [value] : [];
  }

  function isUnitSelected(setting, unit) {
    return Array.isArray(setting) ? setting.includes(unit) : isSameUnit(setting, unit);
  }

  function isSameUnit(u1, u2) {
    if (u1 === u2) return true;
    if (!u1 || !u2) return false;
    // 번호 비교는 짧은 단원 키("1"·"L9"·"9단원")가 한쪽에 있을 때만 ("L9" == "9" == "9단원").
    // 노션 전체 단원명끼리("1단원 (1. 기분을 말해요)" vs "1회 (1. 기분을 말해요)")는 정확히 같아야 같은 단원
    const isBareKey = u => /^\s*L?\d+\s*(단원)?\s*$/i.test(String(u));
    const n1 = getLeadingUnitNumber(u1);
    const n2 = getLeadingUnitNumber(u2);
    if ((isBareKey(u1) || isBareKey(u2)) && n1 && n2 && n1 === n2) return true;
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

      // 1회 이전: 민서 국어 '1'은 "1단원"을 뜻했다. 받아쓰기 1-1 단원 "1"과 겹치므로 정확한 단원명으로 옮긴다
      if (parsed.minseo && parsed.minseo.unitSchema !== 2) {
        if (parsed.minseo.korean === '1') parsed.minseo.korean = '1단원 (1. 기분을 말해요)';
        parsed.minseo.unitSchema = 2;
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

  // 7-1. 다중 단원 묶음 토글 (노션 단원명과 정확히 일치하는 칩만, 최대 4개)
  // 묶을 수 없는 칩(번호형 기본 단원)이 선택돼 있으면 새 칩 하나로 바꾸고, 1개만 남으면 기존처럼 문자열로 저장한다.
  const MAX_BUNDLE_UNITS = 4;
  let unitWordCounts = {};

  function toggleParentUnit(child, subject, unit, combinable) {
    if (!currentParentSettings[child]) currentParentSettings[child] = {};
    const current = currentParentSettings[child][subject];
    const currentList = toUnitList(current);
    const currentCombinable = currentList.length > 0 && currentList.every(u => combinableUnits.has(`${subject}::${u}`));
    if (!combinable || !currentCombinable) return setParentUnit(child, subject, unit);

    let next = currentList.includes(unit) ? currentList.filter(u => u !== unit) : [...currentList, unit];
    if (next.length === 0) next = [unit];
    if (next.length > MAX_BUNDLE_UNITS) {
      alert(`단원은 최대 ${MAX_BUNDLE_UNITS}개까지 묶을 수 있어요.`);
      return;
    }
    currentParentSettings[child][subject] = next.length === 1 ? next[0] : next;
    playUiPop();
    renderParentProgressChips();
  }
  const combinableUnits = new Set();

  // 8. 🔄 단원 칩 빌드 (칩 DOM·노션 캐시 탐색은 parent_unit_chips.js, 여기서는 선택 규칙만 연결)
  function syncDynamicUnitChips() {
    try {
      const Chips = window.ParentUnitChips;
      if (!Chips) return;
      const found = Chips.collectNotionUnits();
      unitWordCounts = found.counts.minsu || {};
      ['minseo', 'minsu'].forEach(child => {
        const prefix = child === 'minsu' ? 'parentMinsu' : 'parentMinseo';
        Object.keys(Chips.BASE_UNITS[child]).forEach(subj => {
          const container = document.getElementById(`${prefix}${subj.charAt(0).toUpperCase() + subj.slice(1)}Chips`);
          if (!container) return;
          Chips.renderSubjectChips({
            child, subj, container, found,
            metaMap: UNIT_META_MAP[child] && UNIT_META_MAP[child][subj],
            onPick: (unit, isNotion) => {
              // 민서는 한 단원만 고른다. 민수는 노션 단원끼리 최대 4개 묶음 (수학 제외)
              if (child === 'minseo') return () => setParentUnit('minseo', subj, unit);
              const combinable = subj !== 'math' && isNotion;
              if (combinable) combinableUnits.add(`${subj}::${unit}`);
              return () => toggleParentUnit('minsu', subj, unit, combinable);
            }
          });
        });
      });

      // 백그라운드 노션 최신화 (논블로킹)
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

  // 단원 표시명: 노션 단원명(칩 라벨·캐시) → 정적 문제은행 이름 → 저장값 정리
  function unitDisplayName(child, subj, unit) {
    const Chips = window.ParentUnitChips;
    return (Chips && Chips.labelOf(child, subj, unit))
      || (UNIT_META_MAP[child][subj] && UNIT_META_MAP[child][subj][unit])
      || (Chips ? Chips.prettyStage(unit) : String(unit));
  }
  const minseoUnitName = (subj, unit) => unitDisplayName('minseo', subj, unit);
  const minsuUnitName = (subj, unit) => unitDisplayName('minsu', subj, Array.isArray(unit) ? unit[0] : unit);

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

      // 민서 설정값은 노션 단원명·정적 키 그대로라 정확히 일치할 때만 선택 (1-1 받아쓰기 "4"와 1-2 "4회 (…)" 구분)
      const isSelected = toUnitList(minseoSets[subj]).includes(unit);
      if (isSelected) {
        btn.className = 'parent-chip py-1.5 px-2 rounded-xl text-xs font-bold text-center border transition-all bg-[#ff85a2] text-white border-[#ff85a2] shadow-sm';
      } else {
        btn.className = 'parent-chip py-1.5 px-2 rounded-xl text-xs font-bold text-center border transition-all bg-lab-card/80 text-gray-300 border-lab-card-border hover:border-pink-300';
      }
    });

    [['badgeMinseoKorean', 'korean'], ['badgeMinseoMath', 'math'], ['badgeMinseoEnglish', 'english']].forEach(([id, subj]) => {
      const badge = document.getElementById(id);
      if (badge) badge.textContent = minseoUnitName(subj, minseoSets[subj]);
    });

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

      const isSelected = isUnitSelected(minsuSets[subj], unit);
      if (isSelected) {
        btn.className = 'parent-chip py-1.5 px-2 rounded-xl text-xs font-bold text-center border transition-all bg-neon-green text-[#023300] border-neon-green shadow-sm';
      } else {
        btn.className = 'parent-chip py-1.5 px-2 rounded-xl text-xs font-bold text-center border transition-all bg-lab-card/80 text-gray-300 border-lab-card-border hover:border-neon-green/40';
      }
    });

    // 과목별 묶음 요약 줄: 선택 단원 수 · 어휘 합계 · 묶음 안내
    ['english', 'korean', 'science', 'society'].forEach(subj => {
      const container = document.getElementById(`parentMinsu${subj.charAt(0).toUpperCase() + subj.slice(1)}Chips`);
      if (!container) return;
      let summary = document.getElementById(`${container.id}Summary`);
      if (!summary) {
        summary = document.createElement('p');
        summary.id = `${container.id}Summary`;
        summary.className = 'text-[11px] text-gray-400 mt-1.5 leading-snug';
        container.insertAdjacentElement('afterend', summary);
      }
      const list = toUnitList(minsuSets[subj]);
      const words = list.reduce((sum, u) => sum + (unitWordCounts[`${subj}::${u}`] || 0), 0);
      const hasBundleChips = [...combinableUnits].some(k => k.startsWith(`${subj}::`));
      const head = list.length > 1 ? `📚 ${list.length}개 단원 묶음` : '선택 1개 단원';
      const count = words ? ` · 어휘 ${words}개` : '';
      const hint = hasBundleChips ? ` · 노션 단원은 최대 ${MAX_BUNDLE_UNITS}개까지 눌러서 묶을 수 있어요` : '';
      summary.textContent = head + count + hint;
    });

    const bundleBadge = (value, fallback) => {
      const list = toUnitList(value);
      if (list.length <= 1) return fallback;
      return `📚 ${list.length}개 묶음: ${list.map(u => u.replace(/^\[[^\]]*\]\s*/, '').split(' - ')[0]).join('·')}`;
    };

    [['Math', 'math'], ['English', 'english'], ['Korean', 'korean'], ['Science', 'science'], ['Society', 'society']].forEach(([cap, subj]) => {
      const badge = document.getElementById(`badgeMinsu${cap}`);
      if (badge) badge.textContent = bundleBadge(minsuSets[subj], minsuUnitName(subj, minsuSets[subj]));
    });

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
      const korName = minseoUnitName('korean', sets.korean);
      const mathName = minseoUnitName('math', sets.math);
      if (qSub) qSub.textContent = `🧮 1-2 ${mathName} · 필수 ⭐`;
      if (rec) rec.textContent = `💡 오늘의 추천 진도: ${korName} & ${mathName} (필수 ⭐)`;
    } else {
      const sets = currentParentSettings.minsu || DEFAULT_PARENT_SETTINGS.minsu;
      const mathName = minsuUnitName('math', sets.math);
      const sciName = minsuUnitName('science', sets.science);
      const engName = minsuUnitName('english', sets.english);
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
  window.toggleParentUnit = toggleParentUnit;
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
