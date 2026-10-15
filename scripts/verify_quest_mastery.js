// ========================================================
// ✅ 3·3·3 마스터리 엔진 단위 검증 (DOM 없음, 노션 운영 DB 미사용)
// - 브라우저: scripts/verify_quest_mastery.html 열기 → 콘솔/화면에 PASS 표시
// - Node:     node scripts/verify_quest_mastery.js
// ========================================================
(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports && typeof window === 'undefined';
  if (isNode) {
    root.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = String(v); }, removeItem(k) { delete this._d[k]; } };
    require('../kids/subjects/quest/quest-mastery.js');
  }
  const QM = root.QuestMastery;
  const results = [];
  const check = (name, cond, extra) => results.push({ name, ok: !!cond, extra: extra === undefined ? '' : JSON.stringify(extra) });

  function seeded(seed) {
    let s = seed >>> 0;
    return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  }
  function makeItems(nWords, nSents, prefix = 'w') {
    const out = [];
    const words = ['bathroom', 'kitchen', 'bedroom', 'garden', 'mirror', 'toilet', 'piano', 'robot', 'sofa', 'table', 'chair', 'spoon', 'stove', 'sink', 'oven', 'fridge', 'lamp', 'books', 'stars', 'house', 'tree', 'dream', 'nice', 'place', 'basement', 'classroom', 'bed', 'bath', 'toothbrush', 'hairdryer'];
    for (let i = 0; i < nWords; i++) {
      const w = words[i % words.length] + (i >= words.length ? i : '');
      out.push({ id: `${prefix}${i}`, word: w, meaning: `뜻${i}`, detailContext: `설명 (예: There is a ${w} in the house.)`, wordType: '단어', stage: 'L9', subject: ['영어'], target: ['민수'], createdTime: `2026-10-01T00:00:${String(i).padStart(2, '0')}Z` });
    }
    for (let i = 0; i < nSents; i++) {
      out.push({ id: `s${prefix}${i}`, word: `There are ${i + 2} chairs in the big kitchen today.`, meaning: `문장뜻${i}`, detailContext: '', wordType: '문장', stage: 'L9', subject: ['영어'], target: ['민수'], createdTime: `2026-10-02T00:00:${String(i).padStart(2, '0')}Z` });
    }
    return QM.selectUnitItems(out, { childName: '민수', subjectKo: '영어', unit: 'L9' });
  }
  const reset = child => root.localStorage.removeItem(`MINMIN_QUEST_MASTERY_V1_${child}`);
  const setState = (child, id, c, s = '', r = '') => {
    const st = QM.loadStore(child);
    st.items[id] = { c, s, r };
    QM.saveStore(child, st);
  };

  // 1) 동적 스테이지 분할
  const i25 = makeItems(20, 5);
  const i55 = makeItems(44, 11);
  check('25개 → 3 Stage (round(2.5))', QM.buildStages(i25).length === 3, QM.buildStages(i25).length);
  check('55개 → 6 Stage', QM.buildStages(i55).length === 6, QM.buildStages(i55).length);
  check('Stage마다 문장 비례 배분', QM.buildStages(i55).every(s => s.some(it => it.kind !== 'word')), QM.buildStages(i55).map(s => s.filter(it => it.kind !== 'word').length));
  check('5개 → 최소 1 Stage', QM.buildStages(makeItems(5, 0)).length === 1);

  // 2) 당일 은메달 상한 & 익일 금메달
  const child = 'test_child';
  reset(child);
  const items = makeItems(12, 3);
  const id = items[0].id;
  setState(child, id, 5);
  let q = { noCredit: false, isRustyReview: false };
  QM.applyResult(child, q, [{ id, firstTry: true }], '2026-10-15');
  let st = QM.loadStore(child).items[id];
  check('count 6 도달 시 silverDate 기록', st.c === 6 && st.s === '2026-10-15', st);
  QM.applyResult(child, q, [{ id, firstTry: true }], '2026-10-15');
  check('같은 날 은메달 이후 승급 잠금', QM.loadStore(child).items[id].c === 6);
  check('같은 날 Lv.3 미해금', !QM.isLv3Eligible(QM.loadStore(child).items[id], '2026-10-15'));
  check('다음 날 Lv.3 해금', QM.isLv3Eligible(QM.loadStore(child).items[id], '2026-10-16'));
  ['2026-10-16', '2026-10-16', '2026-10-16'].forEach(d => QM.applyResult(child, q, [{ id, firstTry: true }], d));
  check('다음 날 3회 정답 → count 9 금메달', QM.loadStore(child).items[id].c === 9);
  QM.applyResult(child, { noCredit: false }, [{ id: items[1].id, firstTry: false }], '2026-10-16');
  check('힌트 후 정답은 카운트 유지', !QM.loadStore(child).items[items[1].id] || QM.loadStore(child).items[items[1].id].c === 0);

  // 3) 녹슨 왕관
  check('금메달 2일 경과 → 녹슨 왕관', QM.isRusty({ c: 9, s: '2026-10-15', r: '2026-10-16' }, '2026-10-18'));
  check('금메달 1일 경과 → 아님', !QM.isRusty({ c: 9, s: '2026-10-15', r: '2026-10-16' }, '2026-10-17'));
  QM.applyResult(child, { isRustyReview: true }, [{ id, firstTry: false }], '2026-10-18');
  st = QM.loadStore(child);
  check('녹슨 왕관 오답 → count 5 강등 + demote 표시', st.items[id].c === 5 && st.dirty[id] === 'demote', st.items[id]);

  // 4) Push: 달성 false 해제 / 금메달 true
  (async () => {
    const calls = [];
    const r = await QM.pushChanges(child, async (pid, text, achieved) => { calls.push({ pid, text, achieved }); return true; });
    const demoteCall = calls.find(c => c.pid === id);
    check('Push: 강등 항목 달성 false 전송', demoteCall && demoteCall.achieved === false && demoteCall.text.startsWith('5|'), calls);
    check('Push 성공 후 dirty 정리', Object.keys(QM.loadStore(child).dirty).length === 0 && r.failed === 0);

    // 5) Max-Merge
    check('dirty 로컬이 더 높으면 로컬 유지', QM.mergeRemote({ c: 4, s: '', r: 'x' }, { c: 2, s: '', r: '' }, true).c === 4);
    check('dirty 로컬보다 원격이 높으면 원격', QM.mergeRemote({ c: 4, s: '', r: '' }, { c: 7, s: '2026-10-14', r: '' }, true).c === 7);
    check('미전송 없으면 원격이 기준(타 기기 강등 반영)', QM.mergeRemote({ c: 9, s: '', r: '' }, { c: 5, s: '', r: '' }, false).c === 5);
    check('방금 전송한 값보다 낮은 원격(엣지 캐시 지연)은 무시', QM.mergeRemote({ c: 4, s: '', r: '' }, { c: 3, s: '', r: '' }, false, true).c === 4);
    check('강등 미전송은 로컬 우선', QM.mergeRemote({ c: 5, s: '', r: '' }, { c: 9, s: '', r: '' }, 'demote').c === 5);
    check('숙련도 문자열 파싱', JSON.stringify(QM.parseMastery('6|2026-10-15|2026-10-15')) === JSON.stringify({ c: 6, s: '2026-10-15', r: '2026-10-15' }));
    check('빈 숙련도 = 0', QM.parseMastery('').c === 0);

    // 6) 슬롯 배치
    reset(child);
    const round = QM.buildRound({ child, items, subj: 'english', today: '2026-10-15', rng: seeded(7) });
    check('1판 5문제', round.questions.length === 5, round.questions.map(x => x.masteryType));
    check('신규 단원 2번 슬롯 = match_3x3', round.questions[1].masteryType === 'match_3x3', round.questions[1].masteryType);
    check('3번 슬롯 = 문장', round.questions[2].item.kind !== 'word', round.questions[2].item.word);
    const allIds = round.questions.flatMap(x => x.itemIds);
    check('한 판 안 항목 중복 없음', new Set(allIds).size === allIds.length, allIds);

    // 문장 없는 단원 → 3번 단어 폴백
    reset(child);
    const wordsOnly = makeItems(12, 0);
    const r2 = QM.buildRound({ child, items: wordsOnly, subj: 'english', today: '2026-10-15', rng: seeded(3) });
    check('문장 없는 단원: 3번 단어 폴백', r2.questions[2].item.kind === 'word' && r2.questions.length === 5);

    // Lv.3 쿼터
    reset(child);
    items.forEach(it => setState(child, it.id, 7, '2026-10-10', '2026-10-14'));
    const r3 = QM.buildRound({ child, items, subj: 'english', today: '2026-10-15', rng: seeded(5) });
    check('Lv.3 최대 2개', r3.questions.filter(x => x.level === 3).length <= 2, r3.questions.map(x => x.level));
    check('Lv.3 문제는 scramble', r3.questions.filter(x => x.level === 3).every(x => x.masteryType === 'scramble'));

    // 녹슨 왕관 4번 슬롯 1순위
    reset(child);
    items.forEach(it => setState(child, it.id, 6, '2026-10-15', '2026-10-15'));
    setState(child, items[5].id, 9, '2026-10-01', '2026-10-05');
    const r4 = QM.buildRound({ child, items, subj: 'english', today: '2026-10-15', rng: seeded(9) });
    check('4번 슬롯 녹슨 왕관 소환', r4.questions[3].isRustyReview && r4.questions[3].item.id === items[5].id && r4.questions[3].level === 3);

    // 당일 올-실버 폴백
    reset(child);
    items.forEach(it => setState(child, it.id, 6, '2026-10-15', '2026-10-15'));
    const r5 = QM.buildRound({ child, items, subj: 'english', today: '2026-10-15', rng: seeded(11) });
    check('올-실버: isTodayAllSilver', r5.meta.isTodayAllSilver === true);
    check('올-실버: 5문제 모두 Lv.2 복습', r5.questions.length === 5 && r5.questions.every(x => x.level === 2 && x.noCredit));

    // Stage 자동 해금
    reset(child);
    const stages = QM.buildStages(i25);
    stages[0].forEach(it => setState(child, it.id, 6, '2026-10-15', '2026-10-15'));
    const r6 = QM.buildRound({ child, items: i25, subj: 'english', today: '2026-10-15', rng: seeded(13) });
    check('Stage 1 전원 은메달 → Stage 2 해금', r6.meta.activeStage === 1, r6.meta);
    check('해금 후 1번 슬롯은 Stage 2 항목', stages[1].some(it => it.id === r6.questions[0].item.id));

    // 7) 청크 & 조립
    const long = 'There are four big chairs and two small tables in the bright kitchen today.';
    const chunks = QM.chunkSentence(long);
    check('긴 문장 청크 ≤ 5조각', chunks.length <= 5 && chunks.join(' ') === long, chunks);
    check('짧은 문장 청크 그대로', QM.chunkSentence('This is the bedroom.').length === 4);
    const scr = QM.buildScramble({ word: 'bathroom', kind: 'word' }, 'en', seeded(1));
    check('단어 scramble 알파벳 분해', scr.seq.join('') === 'bathroom' && scr.blocks.length === 8);
    const scrKo = QM.buildScramble({ word: '강수량', kind: 'word' }, 'ko', seeded(1));
    check('한글 용어 scramble 음절 분해', scrKo.seq.join('') === '강수량' && scrKo.seq.length === 3);
    // 8) 학기 필터: 과학 '3' 단원에 5-1 '용해와 용액'이 섞이지 않음
    const sci = [];
    for (let i = 0; i < 5; i++) sci.push({ id: `t${i}`, word: `열${i}`, meaning: `온도${i}`, stage: '3. 온도와 열', grades: ['5-2', '5학년'], subject: ['과학'], target: ['민수'] });
    for (let i = 0; i < 10; i++) sci.push({ id: `y${i}`, word: `용액${i}`, meaning: `용해${i}`, stage: '3-1. 1. 물에 녹을까, 녹지 않을까?', grades: ['5-1'], subject: ['과학'], target: ['민수'] });
    const sci52 = QM.selectUnitItems(sci, { childName: '민수', subjectKo: '과학', unit: '3', semester: '5-2' });
    check('과학 3단원 5-2: 온도와 열만', sci52.length === 5 && sci52.every(it => it.stage.startsWith('3. ')), sci52.length);
    const sci51 = QM.selectUnitItems(sci, { childName: '민수', subjectKo: '과학', unit: '3', semester: '5-1' });
    check('과학 3단원 5-1: 용해와 용액만', sci51.length === 10, sci51.length);
    check('학기 일치 없으면 단원 전체 유지', QM.selectUnitItems(sci, { childName: '민수', subjectKo: '과학', unit: '3', semester: '6-1' }).length === 15);
    // 9) 다중 단원 묶음 (국어 센터 지문)
    const center = [];
    const mk = (unit, n, words) => words.forEach(([w, type], i) => center.push({ id: `${n}_${i}`, word: w, meaning: `${w} 뜻`, wordType: type, stage: unit, grades: [unit.includes('5-1') ? '5-1' : '5-2'], subject: ['국어', '센터'], target: ['민수'], createdTime: `2026-10-${String(n).padStart(2, '0')}T00:00:0${i}Z` }));
    const U14 = '[센터 5-2] 14번 - 하늘을 나는 열기구', U15 = '[센터 5-2] 15번 - 말에는 힘이 있어요', U16 = '[센터 5-2] 16번 - 축구할 때도 신호등이 있어요';
    const U25 = '[센터 5-2] 25번 - 침엽수와 활엽수의 다른 점', U31 = '[센터 5-2] 31번 - 축구 선수 손흥민', U06 = '[센터 5-1] 06번 - 프랑스의 황제, 나폴레옹 1';
    mk(U14, 14, [['실패는 성공의 어머니', '속담'], ['칠전팔기', '사자성어'], ['머리를 맞대다', '관용구'], ['최초', '단어'], ['원리', '단어'], ['열기구', '단어']]);
    mk(U15, 15, [['말 한마디로 천 냥 빚을 갚는다', '속담'], ['일언천금', '사자성어'], ['마음을 움직이다', '관용구'], ['움츠리다', '단어'], ['사과', '단어'], ['가는 말이 고와야 오는 말이 곱다', '속담']]);
    mk(U16, 16, [['돌다리도 두들겨 보고 건너라', '속담'], ['자업자득', '사자성어'], ['무릎을 치다', '관용구'], ['주의', '단어'], ['퇴장', '단어'], ['규칙', '단어']]);
    mk(U25, 25, [['원숭이도 나무에서 떨어진다', '속담'], ['각양각색', '사자성어'], ['견디다', '단어'], ['침엽수', '개념어'], ['활엽수', '개념어'], ['뿌리 깊은 나무는 바람에 흔들리지 않는다', '속담']]);
    mk(U31, 31, [['칠 전 팔기', '사자성어'], ['노력', '단어'], ['재능', '단어']]);
    mk(U06, 6, [['황제', '단어'], ['원정', '단어'], ['영웅', '단어']]);
    const korSel = unit => ({ childName: '민수', subjectKo: '국어', unit, semester: '5-2' });
    check('단원 목록 파싱: 배열·| 결합·단일', JSON.stringify(QM.parseUnitList([U14, U15])) === JSON.stringify([U14, U15]) && QM.parseUnitList(`${U14}|${U15}`).length === 2 && QM.parseUnitList('L9').length === 1);
    check('쉼표 든 단원명은 1개로 유지', QM.parseUnitList(U06).length === 1 && QM.selectUnitItems(center, korSel(U06)).length === 3);
    const b3 = QM.selectUnitItems(center, korSel(`${U14}|${U15}|${U16}`));
    check('14·15·16번 묶음 = 18개', b3.length === 18, b3.length);
    check('18개 → 2 Stage', QM.buildStages(b3).length === 2, QM.buildStages(b3).length);
    check('사자성어는 단어 슬롯, 관용구·속담은 문장 슬롯', b3.filter(it => it.wordType === '사자성어').every(it => it.kind === 'word') && b3.filter(it => ['관용구', '속담'].includes(it.wordType)).every(it => it.kind === 'sentence'));
    check('묶음은 학기 필터 없이 고른 단원 그대로 (5-1 지문 포함)', QM.selectUnitItems(center, korSel([U14, U06])).length === 9);
    reset(child);
    const b2 = QM.selectUnitItems(center, korSel([U14, U31]));
    setState(child, '31_0', 4);
    const dedup = QM.dedupeHeadwords(b2, QM.loadStore(child));
    const chil = dedup.filter(it => it.word.replace(/\s+/g, '') === '칠전팔기');
    check('14·31번 묶음: 칠전팔기 1개만 (숙련도 높은 31번 쪽)', chil.length === 1 && chil[0].id === '31_0' && dedup.length === b2.length - 1, chil.map(i => i.id));
    reset(child);
    b3.forEach(it => setState(child, it.id, it.stage === U14 ? 2 : 6, '2026-10-14', '2026-10-15'));
    const b4 = QM.selectUnitItems(center, korSel([U15, U16, U25]));
    const kept = b4.filter(it => it.stage !== U25).every(it => QM.loadStore(child).items[it.id].c === 6);
    check('조합 변경(15·16·25번)해도 15·16번 숙련도 유지', b4.length === 18 && kept);
    const r9 = QM.buildRound({ child, items: b4, subj: 'korean', today: '2026-10-15', rng: seeded(21) });
    check('묶음 판 5문제 생성', r9.questions.length === 5 && r9.meta.totalStages === 2, r9.questions.map(q => q.masteryType));
    reset(child);
    check('패턴(...)은 pattern 분류', QM.classify({ word: 'There is a ... in the ...', wordType: '숙어' }) === 'pattern');

    // 10) 민서(초1): 받아쓰기 제외 · 영어 '기초' 단원 · 문장 조립 3조각
    const ms = [];
    for (let i = 0; i < 6; i++) ms.push({ id: `k${i}`, word: `낱말${i}`, meaning: `뜻풀이${i}`, wordType: '단어', stage: '1단원 (1. 기분을 말해요)', grades: ['1-2'], subject: ['국어'], target: ['민서'] });
    ms.push({ id: 'ks0', word: '친구와 함께 즐겁게 놀이터에서 그네를 탔어요.', meaning: '문장뜻', wordType: '문장', stage: '1단원 (1. 기분을 말해요)', grades: ['1-2'], subject: ['국어'], target: ['민서'] });
    for (let i = 0; i < 10; i++) ms.push({ id: `d${i}`, word: `받아쓰기 문장 ${i}입니다.`, meaning: `1학년 2학기 받아쓰기 1회 ${i}번`, wordType: '문장', stage: '1회 (1. 기분을 말해요)', grades: ['1-2'], subject: ['국어', '받아쓰기'], target: ['민서'] });
    for (let i = 0; i < 10; i++) ms.push({ id: `d1_${i}`, word: `여우${i}`, meaning: '동물 친구', stage: '1', grades: ['1-1'], subject: ['국어', '받아쓰기'], target: ['민서'] });
    for (let i = 0; i < 10; i++) ms.push({ id: `e${i}`, word: `box${i}`, meaning: `상자${i}`, stage: 'L1', grades: ['기초'], subject: ['영어'], target: ['민서'] });
    const msSel = (subjectKo, unit) => QM.selectUnitItems(ms, { childName: '민서', subjectKo, unit, semester: '1-2' });
    const kor1 = msSel('국어', '1');
    check('민서 국어 "1": 받아쓰기 회차 빼고 1단원 어휘만', kor1.length === 7 && kor1.every(it => it.stage.startsWith('1단원')), kor1.map(i => i.id));
    check('민서 받아쓰기 회차를 직접 지정해도 받아쓰기 문장은 안 나옴', msSel('국어', '1회 (1. 기분을 말해요)').every(it => !it.id.startsWith('d')));
    check('민서 영어 L1(학년 기초)은 학기 1-2여도 단원 전체', msSel('영어', 'L1').length === 10);
    check('민수에게 민서 전용 단원 안 보임', QM.selectUnitItems(ms, { childName: '민수', subjectKo: '영어', unit: 'L1' }).length === 0);
    const c3 = QM.chunkSentence('친구와 함께 즐겁게 놀이터에서 그네를 탔어요.', 3);
    check('민서 문장 조립 ≤ 3조각', c3.length === 3 && c3.join(' ') === '친구와 함께 즐겁게 놀이터에서 그네를 탔어요.', c3);
    reset('minseo');
    kor1.forEach(it => setState('minseo', it.id, 6, '2026-10-14', '2026-10-14'));
    const rMs = QM.buildRound({ child: 'minseo', items: kor1, subj: 'korean', today: '2026-10-15', rng: seeded(5) });
    const scrMs = rMs.questions.filter(q => q.masteryType === 'scramble' && q.item.kind !== 'word');
    check('민서 판: 5문제 · 3지선다 · 문장 조립 3조각 이하', rMs.questions.length === 5
      && rMs.questions.every(q => { const o = (q.fill && q.fill.options) || q.options || []; return !o.length || o.length === 3; })
      && scrMs.every(q => q.scramble.seq.length <= 3), rMs.questions.map(q => q.masteryType));
    reset('minseo');

    const pass = results.filter(r => r.ok).length;
    const lines = results.map(r => `${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.ok ? '' : '  ' + r.extra}`);
    lines.push(`\n${pass === results.length ? 'PASS' : 'FAIL'}: ${pass}/${results.length}`);
    const out = lines.join('\n');
    console.log(out);
    root.__QUEST_MASTERY_TEST__ = { pass, total: results.length, out };
    if (typeof document !== 'undefined' && document.getElementById('out')) document.getElementById('out').textContent = out;
    if (isNode && pass !== results.length) process.exitCode = 1;
    reset(child);
  })();
})(typeof window !== 'undefined' ? window : globalThis);
