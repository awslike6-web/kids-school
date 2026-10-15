/**
 * ==============================================================================
 * 🧩 부모 진도 관리판 단원 칩 빌더 (parent_unit_chips.js · window.ParentUnitChips)
 * ------------------------------------------------------------------------------
 * - 노션 VOCA 캐시(localStorage `*_VOCA_CACHE_*`)에서 학생별·과목별 실제 단원을 찾아 칩으로 그린다.
 * - 학생 구분: `학생`이 비었거나 본인·`공통`인 항목만 그 학생 칩에 넣는다 (민서 단원이 민수 판에 새지 않게).
 * - 받아쓰기 회차(과목 `받아쓰기` 포함)는 5분 퀘스트 칩에서 뺀다 → 국어방 받아쓰기 화면 전용.
 * - 민수: 기본 뼈대 칩 뒤에 노션 단원 (맨 앞 번호로 중복 제거, 기존 동작 유지)
 * - 민서: 노션 단원 칩을 앞에, 정적 문제은행 칩(phonics 등)을 뒤에 둔다.
 * - 선택·저장·묶음 규칙은 parent_progress_controller.js가 맡고, 여기서는 칩 DOM만 만든다.
 * ==============================================================================
 */

(function(window) {
  'use strict';

  const CHILD_NAME = { minsu: '민수', minseo: '민서' };
  const SUBJECT_KEYS = [['영어', 'english'], ['과학', 'science'], ['사회', 'society'], ['국어', 'korean'], ['수학', 'math']];
  const CHIP_CLASS = 'parent-chip py-1.5 px-2 rounded-xl text-xs font-bold text-center border transition-all';

  // 기본 교과 뼈대 칩 (노션 조회 전에도 보이는 칩, 민서는 정적 문제은행 quest_data_minseo.js와 짝)
  const BASE_UNITS = {
    minseo: {
      korean: [
        { unit: 'batchim', label: '받침 글자 (기본 문제)', sem: '1-2' },
        { unit: 'dictation', label: '받아쓰기 100 (기본 문제)', sem: '1-2' },
        { unit: 'voca', label: '그림 낱말 탐험 (기본 문제)', sem: '1-1,basic' }
      ],
      math: [
        { unit: '100num', label: '100까지 수 ⭐', sem: '1-2,basic' },
        { unit: 'addsub', label: '한자리 덧뺄셈', sem: '1-2' },
        { unit: 'shapes', label: '여러가지 모양', sem: '1-1' }
      ],
      english: [
        { unit: 'phonics', label: '파닉스 첫단어 (기본 문제)', sem: 'basic,1-2' },
        { unit: 'greetings', label: '기초 인사말 (기본 문제)', sem: '1-2,basic' },
        { unit: 'abc', label: '알파벳 소리 (기본 문제)', sem: '1-1,basic' }
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

  // 칩 라벨 기억 (배지·메인 버튼 안내 문구에서 재사용)
  const labelBook = { minsu: {}, minseo: {} };

  function leadingNumber(unitStr) {
    const match = String(unitStr || '').trim().match(/^L?(\d+)/i);
    return match ? match[1] : '';
  }

  function subjectKeyOf(subjectKo) {
    const s = String(subjectKo).trim();
    const hit = SUBJECT_KEYS.find(([ko]) => s.includes(ko));
    return hit ? hit[1] : '';
  }

  // 학기 알약 필터용 분류 (민수: 5-2/5-1/jihye, 민서: 1-2/1-1/basic)
  function semTypeOf(child, r, stage) {
    const gList = (Array.isArray(r.grades) ? r.grades : [r.grade])
      .map(g => String(g || '').trim()).filter(g => g && g !== '공통');
    const gStr = gList.join(' ');
    if (child === 'minseo') {
      if (gStr.includes('기초')) return 'basic,1-1,1-2'; // 기초(파닉스)는 학기와 무관하게 늘 보이게
      if (gStr.includes('1-1')) return '1-1';
      return '1-2';
    }
    if (gStr.includes('지혜') || String(r.wordType || '').includes('지혜')) return 'jihye';
    if (gStr.includes('5-1')) return '5-1';
    if (gStr.includes('5-2')) return '5-2'; // 학년이 명시돼 있으면 단원명 숫자("[센터 5-2] 14번"의 5)로 추정하지 않음
    const otherGrade = gList.find(g => /^\d-\d$/.test(g));
    if (otherGrade) return otherGrade; // 다른 학년(4-1 등)은 그 학년 그대로 → '전체' 탭에서만 보임
    const numMatch = String(stage).match(/\d+/);
    return numMatch && parseInt(numMatch[0], 10) <= 6 ? '5-1' : '5-2';
  }

  function isForChild(r, child) {
    const targets = Array.isArray(r.target) ? r.target : (r.target ? [r.target] : []);
    return targets.length === 0 || targets.includes(CHILD_NAME[child]) || targets.includes('공통');
  }

  /**
   * 노션 VOCA 캐시 전수 탐색 → { units: {child: {subj: [{stage, semType}]}}, counts: {child: {'subj::단원': 어휘 수}} }
   */
  function collectNotionUnits() {
    const units = {}, idSets = {};
    Object.keys(CHILD_NAME).forEach(child => {
      units[child] = { english: [], science: [], society: [], korean: [], math: [] };
      idSets[child] = {};
    });
    const seenRecord = new Set();
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.includes('_VOCA_CACHE_')) continue;
      let data = null;
      try { data = JSON.parse(localStorage.getItem(k)); } catch (e) {}
      if (!data || !Array.isArray(data.records)) continue;
      data.records.forEach(r => {
        const stage = String(r.stage || r.level || '').trim();
        if (!stage || stage === '기본 단원') return;
        const subjs = Array.isArray(r.subject) ? r.subject : [r.subject];
        if (subjs.some(s => String(s).includes('받아쓰기'))) return;
        Object.keys(CHILD_NAME).forEach(child => {
          if (!isForChild(r, child)) return;
          subjs.forEach(s => {
            const subjKey = subjectKeyOf(s);
            if (!subjKey) return;
            const dupKey = `${child}::${subjKey}::${stage}::${r.id || r.word}`;
            if (seenRecord.has(dupKey)) return;
            seenRecord.add(dupKey);
            units[child][subjKey].push({ stage, semType: semTypeOf(child, r, stage) });
            if (r.id) {
              const key = `${subjKey}::${stage}`;
              (idSets[child][key] = idSets[child][key] || new Set()).add(r.id);
            }
          });
        });
      });
    }
    const counts = {};
    Object.keys(idSets).forEach(child => {
      counts[child] = Object.fromEntries(Object.entries(idSets[child]).map(([key, ids]) => [key, ids.size]));
    });
    return { units, counts };
  }

  // "1단원 (1. 기분을 말해요)" → "1단원 기분을 말해요", "[센터 5-2] 14번 - …" → "14번 - …"
  function prettyStage(stage) {
    return String(stage).replace(/^\[[^\]]*\]\s*/, '').replace(/\s*\(\d+\.\s*([^)]*)\)\s*$/, ' $1').trim();
  }

  function makeChip(child, subj, unit, sem, label, onClick) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = CHIP_CLASS;
    btn.setAttribute('data-subject', subj);
    btn.setAttribute('data-unit', unit);
    btn.setAttribute('data-sem', sem);
    btn.textContent = label;
    btn.onclick = onClick;
    labelBook[child][`${subj}::${unit}`] = label;
    return btn;
  }

  /**
   * 한 과목 칩 줄을 다시 그린다.
   * @param {object} o { child, subj, container, found(collectNotionUnits 결과), metaMap, onPick(unit, isNotion) → 클릭 핸들러 }
   */
  function renderSubjectChips(o) {
    const { child, subj, container, found } = o;
    const baseUnits = (BASE_UNITS[child] && BASE_UNITS[child][subj]) || [];
    const counts = (found && found.counts[child]) || {};
    const isNotion = unit => counts[`${subj}::${unit}`] !== undefined;
    const discovered = [...((found && found.units[child][subj]) || [])]
      .sort((a, b) => a.stage.localeCompare(b.stage, 'ko', { numeric: true }));
    container.innerHTML = '';

    if (child === 'minseo') {
      // 노션 단원 먼저 (정확한 단원명으로 중복 제거), 정적 문제은행 칩은 뒤에
      // 수학은 3·3·3 대상이 아니라 정적 문제은행 + 무한 암산만 쓴다 (노션 수학 개념 카드는 칩으로 내지 않음)
      const seen = new Set();
      (subj === 'math' ? [] : discovered).forEach(item => {
        if (seen.has(item.stage)) return;
        seen.add(item.stage);
        const n = counts[`${subj}::${item.stage}`];
        const label = `📒 ${prettyStage(item.stage)}${n ? ` · ${n}개` : ''}`;
        container.appendChild(makeChip(child, subj, item.stage, item.semType, label, o.onPick(item.stage, true)));
      });
      baseUnits.forEach(item => {
        if (seen.has(item.unit)) return;
        container.appendChild(makeChip(child, subj, item.unit, item.sem, item.label, o.onPick(item.unit, isNotion(item.unit))));
      });
      return;
    }

    // 민수: 기본 뼈대 → 노션에서 추가로 발견된 단원 (맨 앞 번호 기준 중복 제거)
    const seenUnitNumbers = new Set();
    baseUnits.forEach(item => {
      const uNum = leadingNumber(item.unit) || String(item.unit).trim();
      seenUnitNumbers.add(uNum);
      container.appendChild(makeChip(child, subj, item.unit, item.sem, item.label, o.onPick(item.unit, isNotion(item.unit))));
    });
    discovered.forEach(item => {
      const cleanKey = item.stage;
      const uNum = leadingNumber(cleanKey);
      if (seenUnitNumbers.has(uNum || cleanKey)) return;
      seenUnitNumbers.add(uNum || cleanKey);
      const metaMap = o.metaMap;
      const metaLabel = metaMap && (metaMap[cleanKey] || metaMap[uNum] || metaMap['L' + uNum]);
      const label = metaLabel || (uNum ? `${uNum}단원 (${cleanKey})` : prettyStage(cleanKey));
      container.appendChild(makeChip(child, subj, cleanKey, item.semType || '5-2', label, o.onPick(cleanKey, isNotion(cleanKey))));
    });
  }

  // 저장된 단원값 → 칩 라벨 ('📒 ' 머리표 제거). 번호로 저장된 값("1")은 맨 앞 번호가 같은 칩 라벨을 쓴다. 칩이 없으면 null
  function labelOf(child, subj, unit) {
    const book = labelBook[child] || {};
    let label = book[`${subj}::${unit}`];
    const num = leadingNumber(unit);
    if (!label && num && String(unit).trim() === num) {
      const hit = Object.keys(book).find(k => k.startsWith(`${subj}::`) && leadingNumber(k.slice(subj.length + 2)) === num);
      label = hit && book[hit];
    }
    return label ? label.replace(/^📒\s*/, '') : null;
  }

  window.ParentUnitChips = { BASE_UNITS, collectNotionUnits, renderSubjectChips, labelOf, prettyStage };
})(window);
