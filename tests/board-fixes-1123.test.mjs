// 현황판 할 일 카드 정리 (2026-11-23): 학습설정 캐시 아이 섞임 · 하루 부모 체크인 · 로비 학습일지 모듈 버전 (노션 미접속)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = file => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const quiet = { log() {}, info() {}, warn() {}, error() {} };
function storage(init = {}) {
  const map = new Map(Object.entries(init));
  return { getItem: k => (map.has(k) ? map.get(k) : null), setItem: (k, v) => map.set(k, String(v)), removeItem: k => map.delete(k), map,
    get length() { return map.size; }, key: i => [...map.keys()][i] ?? null };
}
function sandbox(st, files, extra = {}) {
  const doc = { readyState: 'loading', addEventListener() {}, getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
    body: { appendChild() {} }, head: { appendChild() {} }, createElement: () => ({ style: {}, classList: { add() {}, remove() {} }, setAttribute() {} }),
    documentElement: { setAttribute() {}, classList: { add() {}, remove() {} } } };
  const sb = { console: quiet, JSON, Date, Math, URLSearchParams, Promise, setTimeout, clearTimeout, localStorage: st, addEventListener() {}, removeEventListener() {}, location: { search: '', pathname: '/lobby.html' },
    document: doc, MutationObserver: class { observe() {} }, fetch: async () => ({ ok: false }), ...extra };
  sb.window = sb; sb.globalThis = sb;
  vm.createContext(sb);
  for (const file of files) vm.runInContext(read(file), sb, { filename: file });
  return sb;
}
const cloud = JSON.stringify({ quizFlow: { 국어: 'review' }, appSettings: { sfx_enabled: false, vacation_mode: true }, questSettings: { minseo: { korean: '2단원' } } });

test('퀴즈 흐름: 응답이 다른 아이 것이면 그 아이 캐시에만, 기기 공용 템포 키는 그대로', () => {
  const st = storage({ currentUser: 'son', currentUserName: '민수', kids_quiz_flow_mode_국어: 'speed' });
  const sb = sandbox(st, ['kids/core/quiz-flow-controller.js']);
  sb.syncQuizFlowFromCloud(cloud, '민서');
  assert.equal(st.getItem('MINMIN_CLOUD_SETTINGS_민서'), cloud);
  assert.equal(st.getItem('MINMIN_CLOUD_SETTINGS_민수'), null);       // 예전에는 '민수'로 저장될 수 있었음
  assert.equal(st.getItem('kids_quiz_flow_mode_국어'), 'speed');
  sb.syncQuizFlowFromCloud(cloud, '민수');
  assert.equal(st.getItem('MINMIN_CLOUD_SETTINGS_민수'), cloud);
  assert.equal(st.getItem('kids_quiz_flow_mode_국어'), 'review');
  // 아이를 안 넘기면 gemini-chat.js(getActiveChildName)가 늦게 실려도 저장값으로 판단
  const seo = storage({ currentUser: 'daughter', currentUserName: '민서' });
  sandbox(seo, ['kids/core/quiz-flow-controller.js']).syncQuizFlowFromCloud(cloud);
  assert.equal(seo.getItem('MINMIN_CLOUD_SETTINGS_민서'), cloud);
  assert.equal(seo.getItem('MINMIN_CLOUD_SETTINGS_민수'), null);
});

test('설정 동기화: 다른 아이 응답은 그 아이 키에만, 지금 아이 설정·공용 옛 키는 그대로', () => {
  const st = storage({ currentUser: 'son', currentUserName: '민수', MINMIN_APP_SETTINGS_son: JSON.stringify({ sfx_enabled: true }),
    MINMIN_APP_SETTINGS: JSON.stringify({ sfx_enabled: true }) });
  const sb = sandbox(st, ['kids/core/fairy-settings-catalog.js', 'kids/core/fairy-settings-engine.js']);
  sb.SettingsManager.syncFromCloud(cloud, '민서');
  assert.equal(JSON.parse(st.getItem('MINMIN_APP_SETTINGS_daughter')).vacation_mode, true);
  assert.equal(JSON.parse(st.getItem('MINMIN_APP_SETTINGS_son')).sfx_enabled, true);
  assert.equal(JSON.parse(st.getItem('MINMIN_APP_SETTINGS')).sfx_enabled, true);
  sb.SettingsManager.syncFromCloud(cloud, '민수');
  assert.equal(JSON.parse(st.getItem('MINMIN_APP_SETTINGS_son')).sfx_enabled, false);
  // 호출하는 곳이 아이를 넘긴다
  assert.match(read('kids/js/lobby_subject_hud.js'), /syncQuizFlowFromCloud\(props\['학습설정'\], childName\)/);
  assert.match(read('kids/js/lobby_subject_hud.js'), /SettingsManager\.syncFromCloud\(props\['학습설정'\], childName\)/);
  // reward-grant.js(원문 고정 시험 대상)는 응답 아이가 지금 아이일 때만 동기화하므로 그대로
  assert.match(read('kids/core/reward-grant.js'), /if \(activeChild === userName && props\["학습설정"\] && typeof syncQuizFlowFromCloud === 'function'\)/);
});

test('하루 체크인: 부모 검수는 미리보기만 — 아이 기록·저금통·노션 학습일지 없음', async () => {
  for (const parent of ['아빠', '엄마', '어른']) {
    const st = storage({ currentUserName: parent, currentUser: 'daughter' });
    const calls = [];
    let rewards = 0;
    const sb = sandbox(st, ['kids/subjects/haru/js/haru-checkin-engine.js'], {
      currentChild: 'minseo', grantReward: () => { rewards++; }, fetch: async (url, opts = {}) => { calls.push([opts.method || 'GET', url]); return { ok: true, json: async () => ({}) }; } });
    sb.HaruCheckInEngine.openQuickCheckInModal?.();
    // 체크인 상태를 채운 뒤 완료 (화면 없이)
    sb.selectCheckInHabit?.({ name: '양치', icon: '🪥' });
    await sb.finishQuickCheckIn();
    await new Promise(r => setTimeout(r, 10));
    const keys = [...st.map.keys()].filter(k => k.startsWith('haru_'));
    assert.deepEqual(keys, [], parent);
    assert.equal(rewards, 0, parent);
    assert.equal(calls.filter(([m]) => m !== 'GET').length, 0, parent);
  }
  assert.match(read('kids/subjects/haru/haru.html'), /haru-checkin-engine\.js\?v=20261123-cards/);
});

test('로비 학습일지 모듈: notion-helper 자동 로더와 같은 버전 문자열 (두 번 실리지 않게)', () => {
  const lobby = read('lobby.html');
  const helper = read('kids/core/notion-helper.js');
  const inLobby = lobby.match(/study-log-store\.js\?v=([\w.-]+)/)[1];
  const inHelper = helper.match(/'study-log-store\.js\?v=([\w.-]+)'/)[1];
  assert.equal(inLobby, inHelper);
  // notion-helper의 중복 검사는 「파일명+버전」 문자열을 src에 포함하는지로 본다
  assert.ok(`./kids/core/study-log-store.js?v=${inLobby}`.includes(`study-log-store.js?v=${inHelper}`));
});

// ---------- 교차 검토(아르곤) 반영 ----------
test('퀴즈 흐름: 로비가 아이를 바꿔도(window.currentUserName은 부팅 값 그대로) 저장값으로 지금 아이를 판단', () => {
  const st = storage({ currentUser: 'daughter', currentChild: 'minseo', currentUserName: '민서', kids_quiz_flow_mode_국어: 'speed' });
  const sb = sandbox(st, ['kids/core/quiz-flow-controller.js'], { currentUserName: '민수', getActiveChildName: () => '민수' });
  sb.syncQuizFlowFromCloud(cloud, '민서');      // 지금 아이(민서) 응답 → 템포 반영
  assert.equal(st.getItem('kids_quiz_flow_mode_국어'), 'review');
  st.setItem('kids_quiz_flow_mode_국어', 'speed');
  sb.syncQuizFlowFromCloud(cloud, '민수');      // 늦게 온 민수 응답 → 민수 캐시에만
  assert.equal(st.getItem('kids_quiz_flow_mode_국어'), 'speed');
  assert.equal(st.getItem('MINMIN_CLOUD_SETTINGS_민수'), cloud);
});

test('설정 동기화(같은 아이): 바탕은 그 아이 전용 키 — 공용 옛 키의 다른 아이 목소리가 섞이지 않음', () => {
  const st = storage({ currentUser: 'daughter', currentUserName: '민서', MINMIN_APP_SETTINGS: JSON.stringify({ voice_persona: 'tease_minsu', bgm_track: 'lofi' }) });
  const sb = sandbox(st, ['kids/core/fairy-settings-catalog.js', 'kids/core/fairy-settings-engine.js']);
  sb.SettingsManager.syncFromCloud(JSON.stringify({ appSettings: { sfx_enabled: false } }), '민서');
  const own = JSON.parse(st.getItem('MINMIN_APP_SETTINGS_daughter'));
  assert.equal(own.voice_persona, 'default');
  assert.equal(own.bgm_track, 'off');
  assert.equal(own.sfx_enabled, false);
});

test('로비 인벤토리: 아이를 바꾼 뒤 늦게 온 응답은 공용 테마(보상 재화 칸)를 건드리지 않음', () => {
  const src = read('kids/js/lobby_subject_hud.js');
  assert.match(src, /const stale = userKey !== ctx\.getActiveUserKey\(\);/);
  assert.match(src, /if \(!stale\) localStorage\.setItem\('currentTheme', theme\);/);
});

test('하루방: 부모 검수 때 개별 습관·운동·마음 날씨 기록도 저장하지 않고, 완료 화면은 미리보기 문구', async () => {
  const st = storage({ currentUserName: '엄마', currentUser: 'son' });
  let html = '';
  const body = { set innerHTML(v) { html = v; }, get innerHTML() { return html; } };
  const spoken = [];
  const sb = sandbox(st, ['kids/subjects/haru/js/haru-checkin-engine.js'], { currentChild: 'minsu', speakText: text => spoken.push(text) });
  sb.document.getElementById = id => (id === 'checkInModalInnerBody' ? body : null);
  sb.recordHabitAction?.('양치');
  sb.recordWorkout?.('🏃', '달리기');
  sb.selectMoodColor?.('맑음', '#fff', '좋아요');
  assert.deepEqual([...st.map.keys()].filter(k => k.startsWith('haru_')), []);
  // 실제 흐름: 모달에서 습관 → 운동 → 마음 날씨를 고르면 완료
  sb.selectCheckInHabit('양치', '🪥');
  sb.selectCheckInWorkout('달리기', '🏃');
  sb.selectCheckInMood('맑음', '#fff', '☀️', '좋아요');
  await new Promise(r => setTimeout(r, 10));
  assert.deepEqual([...st.map.keys()].filter(k => k.startsWith('haru_')), []);
  assert.match(html, /부모님 미리보기예요/);
  assert.doesNotMatch(html, /받았어요/);
  assert.ok(!spoken.some(t => /선물받았습니다/.test(t)), spoken.join(' / ')); // 보상 받았다고 말하지 않음
});

// ---------- 예습 완주 보너스 +7 · 시간표 부스트를 과목방·퀘스트 러너에도 (2026-11-23 사용자 결정) ----------
test('과목방 10문제 완주 보너스: 내일 예습 과목이면 +7, 아니면 +5 (괄호 과목명이어도 currentSubject로 판정)', async () => {
  const amounts = [];
  const run = async (tomorrow, currentSubject, subject) => {
    const st = storage({ currentUserName: '민수', currentUser: 'son', currentChild: 'minsu' });
    const sb = sandbox(st, ['kids/core/mission-reward-engine.js'], {
      crypto: globalThis.crypto, currentSubject,
      TimetableBoost: { getSubjectBoostInfo: subj => ({ completionBonus: tomorrow.includes(subj) ? 7 : 5 }) },
      grantRewardAndShowUI: async amount => { amounts.push(amount); return true; } });
    sb.initQuizRewardSession('voca');
    await sb.finalizeQuizRewardSession({ isFullComplete: true, subject });
    return amounts.pop();
  };
  assert.equal(await run(['국어'], '국어', '국어(용어_3)'), 7);
  assert.equal(await run(['영어'], '국어', '국어(용어방)'), 5);
  assert.equal(await run(['사회'], undefined, '사회'), 7);
});

test('시간표 부스트: 과목방(자동 로더)·퀘스트 러너·용어사전방에 실리고, 여러 번 실려도 한 번만 정의', () => {
  assert.match(read('kids/core/notion-helper.js'), /'timetable-boost\.js\?v=20261123-boost'/);
  assert.match(read('quest_runner.html'), /timetable-boost\.js\?v=20261123-boost/);
  assert.match(read('kids/common_space/voca.html'), /timetable-boost\.js\?v=20261123-boost/);
  const st = storage();
  const sb = sandbox(st, ['kids/core/timetable-boost.js']);
  const first = sb.TimetableBoost;
  vm.runInContext(read('kids/core/timetable-boost.js'), sb);
  assert.equal(sb.TimetableBoost, first);
  assert.match(read('kids/core/mission-reward-engine.js'), /amount: bonusAmount,/);
});

test('부스트를 켜면서 드러난 것: 수학 탐험관은 과목을 수학으로, 국어·영어방 자체 한도는 부스트 한도, 완주 문구에 고정 +5 없음', () => {
  for (const file of ['kids/subjects/math/js/math_explorer-shell.js', 'kids/subjects/math/js/congruence_symmetry-main.js']) {
    const st = storage();
    const sb = sandbox(st, [file]);
    assert.equal(sb.currentSubject, '수학', file);
  }
  const keep = sandbox(storage(), ['kids/subjects/math/js/math_explorer-shell.js'], { currentSubject: '국어' });
  assert.equal(keep.currentSubject, '국어'); // 이미 정한 과목은 덮지 않음
  for (const [file, subj] of [['kids/js/korean_common.js', '국어'], ['kids/js/english_common.js', '영어']]) {
    const src = read(file);
    assert.ok(src.includes(`const cap = window.TimetableBoost?.getSubjectBoostInfo?.('${subj}', currentUserName)?.limit || 100;`), file);
    assert.doesNotMatch(src, /currentCount >= 100/);
  }
  for (const file of ['kids/js/english_common.js', 'kids/js/society_common.js']) assert.doesNotMatch(read(file), /완주 보너스\(\+5💎\)와 학습일지/);
});
