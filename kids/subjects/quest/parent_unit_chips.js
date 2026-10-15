/**
 * ==============================================================================
 * 🧩 부모 진도 관리판 단원 칩 빌더 (parent_unit_chips.js · window.ParentUnitChips)
 * ------------------------------------------------------------------------------
 * - 노션 VOCA 캐시(localStorage `*_VOCA_CACHE_*`)에서 학생별·과목별 실제 단원을 찾아 칩으로 그린다.
 * - 학생 구분: `학생`이 비었거나 본인·`공통`인 항목만 그 학생 칩에 넣는다 (민서 단원이 민수 판에 새지 않게).
 * - 받아쓰기 회차(과목 `받아쓰기` 포함)도 칩으로 낸다 (정상 뜻풀이가 있으면 3·3·3 출제, 라벨 `📝 받아쓰기 N회`).
 * - 민수: 영어·국어·과학·사회는 노션 단원 칩만 (라벨 = 노션 단원명, ⭐ = 그 단원에 `시험범위` 체크 항목이 있음).
 *   노션 캐시가 비었을 때만 기본 뼈대 칩(BASE_UNITS)을 비상용으로 그린다. 수학은 정적 문제은행 칩.
 * - 민서: 노션 단원 칩을 앞에, 정적 문제은행 칩(phonics 등)을 뒤에 둔다.
 * - 선택·저장·묶음 규칙은 parent_progress_controller.js가 맡고, 여기서는 칩 DOM만 만든다.
 * ==============================================================================
 */

(function(window) {
  'use strict';

  const CHILD_NAME = { minsu: '민수', minseo: '민서' };
  const SUBJECT_KEYS = [['영어', 'english'], ['과학', 'science'], ['사회', 'society'], ['국어', 'korean'], ['수학', 'math']];
  const CHIP_CLASS = 'parent-chip py-1.5 px-2 rounded-xl text-xs font-bold text-center border transition-all';

  // 기본 교과 뼈대 칩: 민서·수학은 정적 문제은행(quest_data_*.js)과 짝, 민수 노션 과목은 노션 캐시가 빌 때만 쓰는 비상용
  const BASE_UNITS = {
    minseo: {
      korean: [
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
    const units = {}, idSets = {}, stars = {};
    Object.keys(CHILD_NAME).forEach(child => {
      units[child] = { english: [], science: [], society: [], korean: [], math: [] };
      idSets[child] = {};
      stars[child] = {};
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
        const isDictation = subjs.some(s => String(s).includes('받아쓰기'));
        Object.keys(CHILD_NAME).forEach(child => {
          if (!isForChild(r, child)) return;
          subjs.forEach(s => {
            const subjKey = subjectKeyOf(s);
            if (!subjKey) return;
            const dupKey = `${child}::${subjKey}::${stage}::${r.id || r.word}`;
            if (seenRecord.has(dupKey)) return;
            seenRecord.add(dupKey);
            units[child][subjKey].push({ stage, semType: semTypeOf(child, r, stage), isDictation });
            const key = `${subjKey}::${stage}`;
            if (r.id) (idSets[child][key] = idSets[child][key] || new Set()).add(r.id);
            if (r.examScope) stars[child][key] = true; // 노션 `시험범위` 체크 → 칩 ⭐
          });
        });
      });
    }
    const counts = {};
    Object.keys(idSets).forEach(child => {
      counts[child] = Object.fromEntries(Object.entries(idSets[child]).map(([key, ids]) => [key, ids.size]));
    });
    return { units, counts, stars };
  }

  // "1단원 (1. 기분을 말해요)" → "1단원 기분을 말해요", "[센터 5-2] 14번 - …" → "14번 - …" (quest-mastery.js stageLabel과 같은 규칙)
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
        const pretty = prettyStage(item.stage);
        // 1-1 받아쓰기 단원명은 숫자뿐("1")이라 "받아쓰기 1회"로 풀어 쓴다
        const name = item.isDictation ? `받아쓰기 ${/^\d+$/.test(pretty) ? `${pretty}회` : pretty}` : pretty;
        const label = `${item.isDictation ? '📝' : '📒'} ${name}${n ? ` · ${n}개` : ''}`;
        container.appendChild(makeChip(child, subj, item.stage, item.semType, label, o.onPick(item.stage, true)));
      });
      baseUnits.forEach(item => {
        if (seen.has(item.unit)) return;
        container.appendChild(makeChip(child, subj, item.unit, item.sem, item.label, o.onPick(item.unit, isNotion(item.unit))));
      });
      return;
    }

    // 민수 노션 과목: 노션 단원 칩만 (라벨·⭐·어휘 수 모두 노션에서). 캐시가 비면 아래 비상용 뼈대 칩으로
    const stars = (found && found.stars && found.stars[child]) || {};
    if (subj !== 'math' && discovered.length > 0) {
      const seen = new Set();
      discovered.forEach(item => {
        if (seen.has(item.stage)) return;
        seen.add(item.stage);
        const key = `${subj}::${item.stage}`;
        const label = `${prettyStage(item.stage)}${stars[key] ? ' ⭐' : ''}${counts[key] ? ` · ${counts[key]}개` : ''}`;
        container.appendChild(makeChip(child, subj, item.stage, item.semType || '5-2', label, o.onPick(item.stage, true)));
      });
      return;
    }

    // 민수 수학(정적 문제은행) 또는 노션 캐시가 빈 경우: 기본 뼈대 → 노션에서 추가로 발견된 단원 (맨 앞 번호 기준 중복 제거)
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

  // 저장된 단원값 → 표시 이름 ('📒 ' 머리표·'· N개' 꼬리 제거).
  // 칩을 아직 안 그렸으면 노션 캐시에서 단원명을 찾는다. 번호로 저장된 값("3", "L9")은 맨 앞 번호가 같은 단원 중 어휘가 가장 많은 단원.
  function labelOf(child, subj, unit) {
    const book = labelBook[child] || {};
    const clean = label => label.replace(/^(📒|📝)\s*/, '').replace(/\s·\s\d+개$/, '');
    const num = leadingNumber(unit);
    const isBare = num && /^\s*L?\d+\s*(단원)?\s*$/i.test(String(unit));
    // 번호 키 "3"은 "3. 온도와 열"처럼 그 번호로 바로 시작하는 단원을 "3-1. …"(하위 차시)보다 먼저 고른다
    const rank = st => {
      const s = String(st).trim().replace(/^L/i, '');
      return (s === num || [`${num}.`, `${num} `, `${num}단원`].some(p => s.startsWith(p))) ? 0 : 1;
    };
    let label = book[`${subj}::${unit}`];
    if (!label && isBare) {
      const hit = Object.keys(book).filter(k => k.startsWith(`${subj}::`) && leadingNumber(k.slice(subj.length + 2)) === num)
        .sort((a, b) => rank(a.slice(subj.length + 2)) - rank(b.slice(subj.length + 2)))[0];
      label = hit && book[hit];
    }
    if (label) return clean(label);
    const found = collectNotionUnits();
    const counts = found.counts[child] || {};
    const stages = [...new Set(((found.units[child] || {})[subj] || []).map(it => it.stage))];
    const match = stages.includes(String(unit)) ? String(unit)
      : (isBare ? stages.filter(st => leadingNumber(st) === num)
        .sort((a, b) => (rank(a) - rank(b)) || ((counts[`${subj}::${b}`] || 0) - (counts[`${subj}::${a}`] || 0)))[0] : null);
    if (!match) return null;
    return `${prettyStage(match)}${(found.stars[child] || {})[`${subj}::${match}`] ? ' ⭐' : ''}`;
  }

  window.ParentUnitChips = { BASE_UNITS, collectNotionUnits, renderSubjectChips, labelOf, prettyStage };
})(window);
