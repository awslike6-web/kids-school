// 보상 모듈 분리: 고정 원본·참조·전역 API·이벤트·부분 로드 안전성을 검사한다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { extractedReward } from './reward-grant-approved-edits.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const names = ['notion-reward.js', 'notion-reward-quiz.js', 'notion-reward-discussion.js'];
const files = names.map(name => `kids/core/${name}`);
const fixture = read('tests/fixtures/notion-reward-split/notion-reward.js');
const sources = files.map(read);
const version = '?v=20261101-reward-grant-shared';
// 수학 분리 시험과 동일: 줄바꿈·줄 끝 공백·마지막 개행만 정규화한다.
const normalize = text => text.replace(/\r\n/g, '\n').replace(/[\t ]+$/gm, '').replace(/\n+$/, '');

// 승인된 보상 재시도 변경을 고정 원본에도 적용한다. 운영 파일을 읽어 기대값을 만들지 않는다.
const rewardEdits = [
  [
    [
      "",
      "/**",
      " * 💎 전역 만능 보상 지급 엔진 (일일 상한선 노션DB 연동 & 용어방 독립)",
      " */",
      "async function grantRewardAndShowUI(earned, isSilent = false, customExpType = null) {",
      "  const userName = localStorage.getItem('currentUser') === 'son' ? '민수' : '민서';",
      "  const currentTheme = localStorage.getItem('currentTheme') || '마인크래프트';",
      "",
      "  // 💡 [핵심 방어막] 현재 로그인한 사람이 아빠나 엄마인지 실시간 체크 (우회 모드 시 보상 전송 차단)",
      "  const savedName = localStorage.getItem('currentUserName');",
      "  if (savedName === '아빠' || savedName === '엄마' || savedName === '어른') {",
      "      console.log(`🛠️ [보상 프리패스] ${savedName} 모드이므로 노션 서버 전송을 건너뛰고 프리패스합니다! (${earned}개 획득 처리)`);",
      "      return true;",
      "  }",
      "",
      "  // 💡 1. 대장님 노션 DB 칼럼명에 맞춘 완벽한 자동 라우팅",
      "  // window.currentSubject가 없으면 \"사회\"로 폴백",
      "  const subjectName = window.currentSubject || \"사회\";",
      "  let expPropName = `${subjectName} 경험치`;   // 기본: \"수학 경험치\" 등",
      "  let levelPropName = `${subjectName} 레벨`;   // 기본: \"수학 레벨\" 등",
      "  let dailyPropName = `오늘 획득_${subjectName}`; // 기본: \"오늘 획득_수학\" 등"
    ].join('\n'),
    [
      "",
      "/**",
      " * 💎 전역 만능 보상 지급 엔진 (일일 상한선 노션DB 연동 & 용어방 독립)",
      " */",
      "var grantRewardAndShowUI = (function () {",
      "  const QUEUE_KEY = 'MINMIN_REWARD_QUEUE_V1';",
      "  let flushing = null, pending = Promise.resolve();",
      "  const isAdmin = () => ['아빠', '엄마', '어른'].includes(localStorage.getItem('currentUserName'));",
      "  function readQueue() {",
      "    try {",
      "      const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '{}');",
      "      return queue && typeof queue === 'object' && !Array.isArray(queue) ? queue : {};",
      "    } catch { return {}; }",
      "  }",
      "  function saveQueue(queue) { localStorage.setItem(QUEUE_KEY, JSON.stringify(queue)); }",
      "  function enqueue(entry) {",
      "    if (!entry.subject || isAdmin()) return;",
      "    const queue = readQueue();",
      "    queue[entry.id] = entry;",
      "    saveQueue(queue);",
      "  }",
      "  function serialize(fn) {",
      "    const task = pending.catch(() => {}).then(() => window.navigator?.locks?.request",
      "      ? window.navigator.locks.request('minmin-reward-queue', fn) : fn());",
      "    pending = task;",
      "    return task;",
      "  }",
      "  async function requestReward(url, options) {",
      "    let response;",
      "    try { response = await fetch(url, options); }",
      "    catch (cause) { throw Object.assign(new Error('보상 요청 네트워크 오류', { cause }), { retryReward: true }); }",
      "    if (!response.ok) throw Object.assign(new Error(`보상 요청 실패 (${response.status})`), { retryReward: true });",
      "    return response;",
      "  }",
      "  function flushQueue() {",
      "    if (flushing) return flushing;",
      "    flushing = serialize(async () => {",
      "      if (isAdmin()) return;",
      "      const entries = Object.values(readQueue()).sort((a, b) => a.createdAt - b.createdAt).slice(0, 10);",
      "      for (const saved of entries) {",
      "        if (isAdmin()) break;",
      "        const entry = readQueue()[saved.id];",
      "        if (!entry) continue;",
      "        if (await payReward(entry, true, true)) {",
      "          const latest = readQueue(); delete latest[entry.id]; saveQueue(latest);",
      "        }",
      "      }",
      "    }).catch(error => console.warn('[보상 대기열] 다음 연결 때 재시도합니다.', error))",
      "      .finally(() => { flushing = null; });",
      "    return flushing;",
      "  }",
      "  if (window.addEventListener) window.addEventListener('load', () => flushQueue());",
      "",
      "  async function payReward(entry, isSilent, fromQueue = false) {",
      "  if (isAdmin()) return false;",
      "  const { childName: userName, currentTheme, earned, customExpType } = entry;",
      "  let patchSucceeded = false;",
      "",
      "  // 💡 1. 대장님 노션 DB 칼럼명에 맞춘 완벽한 자동 라우팅",
      "  // window.currentSubject가 없으면 \"사회\"로 폴백",
      "  const subjectName = entry.subject || \"사회\";",
      "  let expPropName = `${subjectName} 경험치`;   // 기본: \"수학 경험치\" 등",
      "  let levelPropName = `${subjectName} 레벨`;   // 기본: \"수학 레벨\" 등",
      "  let dailyPropName = `오늘 획득_${subjectName}`; // 기본: \"오늘 획득_수학\" 등"
    ].join('\n')
  ],
  [
    [
      "",
      "  const DAILY_LIMIT = boostInfo.limit || 100; // 하루 보상 획득 상한선 (복습 과목 150개 확장)",
      "",
      "  try {",
      "    const response = await fetch(`${PROXY_URL}/v1/databases/${INVENTORY_DB_ID}/query`, {",
      "      method: \"POST\", headers: { \"Content-Type\": \"application/json\" },",
      "      body: JSON.stringify({ filter: { property: \"이름\", title: { equals: userName } } })",
      "    });",
      "",
      "    if (!response.ok) {",
      "        const queryErr = await response.text();",
      "        console.error(\"인벤토리 조회 쿼리 실패:\", queryErr);",
      "        throw new Error(`인벤토리 조회 실패 (${response.status})`);",
      "    }",
      "",
      "    const data = await response.json();",
      "    if (!data.results || data.results.length === 0) throw new Error(\"학생 인벤토리 없음\");",
      "",
      "    const page = data.results[0];"
    ].join('\n'),
    [
      "",
      "  const DAILY_LIMIT = boostInfo.limit || 100; // 하루 보상 획득 상한선 (복습 과목 150개 확장)",
      "",
      "  try {",
      "    const response = await requestReward(`${PROXY_URL}/v1/databases/${INVENTORY_DB_ID}/query?force=true`, {",
      "      method: \"POST\", headers: { \"Content-Type\": \"application/json\" },",
      "      body: JSON.stringify({ filter: { property: \"이름\", title: { equals: userName } } })",
      "    });",
      "",
      "    const data = await response.json();",
      "    if (!data.results || data.results.length === 0) throw new Error(\"학생 인벤토리 없음\");",
      "",
      "    const page = data.results[0];"
    ].join('\n')
  ],
  [
    [
      "    localStorage.setItem(`MINMIN_INVENTORY_PAGE_ID_${userName}`, page.id);",
      "    if (typeof window.ScreenTimeTracker !== 'undefined' && typeof window.ScreenTimeTracker.syncFromInventoryProps === 'function') {",
      "        window.ScreenTimeTracker.syncFromInventoryProps(props, userName);",
      "    }",
      "    if (props[\"학습설정\"] && typeof syncQuizFlowFromCloud === 'function') {",
      "        syncQuizFlowFromCloud(props[\"학습설정\"]);",
      "    }",
      "",
      "    // 💡 2. 자정(12시) 초기화를 위한 스마트 날짜 체크 로직"
    ].join('\n'),
    [
      "    localStorage.setItem(`MINMIN_INVENTORY_PAGE_ID_${userName}`, page.id);",
      "    if (typeof window.ScreenTimeTracker !== 'undefined' && typeof window.ScreenTimeTracker.syncFromInventoryProps === 'function') {",
      "        window.ScreenTimeTracker.syncFromInventoryProps(props, userName);",
      "    }",
      "    const activeChild = localStorage.getItem('currentUser') === 'son' ? '민수' : '민서';",
      "    if (activeChild === userName && props[\"학습설정\"] && typeof syncQuizFlowFromCloud === 'function') {",
      "        syncQuizFlowFromCloud(props[\"학습설정\"]);",
      "    }",
      "",
      "    // 💡 2. 자정(12시) 초기화를 위한 스마트 날짜 체크 로직"
    ].join('\n')
  ],
  [
    [
      "",
      "    // 만약 접속한 날짜가 바뀌었다면? (새로운 날이면 오늘 획득량을 0으로 리셋)",
      "    if (lastPlayDate !== todayStr) {",
      "        todayEarned = 0;",
      "        localStorage.setItem(lastDateKey, todayStr);",
      "    }",
      "",
      "    // 💡 3. 일일 상한선 (부분 지급 지원)",
      "    let allowedCurrency = earned;"
    ].join('\n'),
    [
      "",
      "    // 만약 접속한 날짜가 바뀌었다면? (새로운 날이면 오늘 획득량을 0으로 리셋)",
      "    if (lastPlayDate !== todayStr) {",
      "        todayEarned = 0;",
      "    }",
      "",
      "    // 💡 3. 일일 상한선 (부분 지급 지원)",
      "    let allowedCurrency = earned;"
    ].join('\n')
  ],
  [
    [
      "",
      "    let previousWealth = currentTheme === '마인크래프트' ? diamond : slime;",
      "    let currentWealth = previousWealth + allowedCurrency;",
      "",
      "    // ⏰ [스크린타임 50개 퀘스트 연동] 오늘 획득 보상 누적",
      "    if (typeof window.ScreenTimeTracker !== 'undefined' && allowedCurrency > 0) {",
      "        window.ScreenTimeTracker.recordDailyRewardEarned(allowedCurrency, userName);",
      "    }",
      "",
      "    // 🔥 복습 과목이면 경험치 1.2배 부스트 적용",
      "    let finalEarnedExp = Math.round(earned * (boostInfo.expMultiplier || 1.0));",
      "    let newExp = currentExp + finalEarnedExp; // 메인 경험치는 깎이지 않고 순수하게 모두 오르게 처리"
    ].join('\n'),
    [
      "",
      "    let previousWealth = currentTheme === '마인크래프트' ? diamond : slime;",
      "    let currentWealth = previousWealth + allowedCurrency;",
      "",
      "    // 🔥 복습 과목이면 경험치 1.2배 부스트 적용",
      "    let finalEarnedExp = Math.round(earned * (boostInfo.expMultiplier || 1.0));",
      "    let newExp = currentExp + finalEarnedExp; // 메인 경험치는 깎이지 않고 순수하게 모두 오르게 처리"
    ].join('\n')
  ],
  [
    [
      "        cumulativeWealth = currentWealth;",
      "    }",
      "    const prevCumulative = cumulativeWealth;",
      "    cumulativeWealth += allowedCurrency;",
      "    localStorage.setItem(cumKey, String(cumulativeWealth));",
      "",
      "    let earnedTickets = Math.floor(cumulativeWealth / 150) - Math.floor(prevCumulative / 150);",
      "    earnedTickets = Math.max(0, earnedTickets);",
      "    let newTickets = tickets + earnedTickets;"
    ].join('\n'),
    [
      "        cumulativeWealth = currentWealth;",
      "    }",
      "    const prevCumulative = cumulativeWealth;",
      "    cumulativeWealth += allowedCurrency;",
      "",
      "    let earnedTickets = Math.floor(cumulativeWealth / 150) - Math.floor(prevCumulative / 150);",
      "    earnedTickets = Math.max(0, earnedTickets);",
      "    let newTickets = tickets + earnedTickets;"
    ].join('\n')
  ],
  [
    [
      "    console.log(`[노션 보상 업데이트 시도] DB_ID: ${INVENTORY_DB_ID}, PAGE_ID: ${page.id}`);",
      "    console.log(\"업데이트할 데이터:\", JSON.stringify(updateProps, null, 2));",
      "",
      "    // 노션으로 쏘기!",
      "    const patchRes = await fetch(`${PROXY_URL}/v1/pages/${page.id}`, {",
      "      method: \"PATCH\", headers: { \"Content-Type\": \"application/json\" },",
      "      body: JSON.stringify({ properties: updateProps })",
      "    });",
      "",
      "    if (!patchRes.ok) {",
      "        const errText = await patchRes.text();",
      "        console.error(\"노션 PATCH 에러 응답:\", errText);",
      "        throw new Error(`노션 업데이트 실패 (상태: ${patchRes.status}): ${errText}`);",
      "    }",
      "",
      "    // ⚡ [SWR 캐시 동기화] 로비 인벤토리 로컬 캐시 즉각 최신화 (페이지 복귀 시 0.01초 반영)",
      "    try {"
    ].join('\n'),
    [
      "    console.log(`[노션 보상 업데이트 시도] DB_ID: ${INVENTORY_DB_ID}, PAGE_ID: ${page.id}`);",
      "    console.log(\"업데이트할 데이터:\", JSON.stringify(updateProps, null, 2));",
      "",
      "    // 노션으로 쏘기!",
      "    await requestReward(`${PROXY_URL}/v1/pages/${page.id}`, {",
      "      method: \"PATCH\", headers: { \"Content-Type\": \"application/json\" },",
      "      body: JSON.stringify({ properties: updateProps })",
      "    });",
      "",
      "    patchSucceeded = true;",
      "    // 지급 확인 뒤에만 로컬 보상 누적을 반영한다. 로컬 오류 때문에 재지급하지 않는다.",
      "    for (const apply of [",
      "      () => localStorage.setItem(lastDateKey, todayStr),",
      "      () => localStorage.setItem(cumKey, String(cumulativeWealth)),",
      "      () => { if (window.ScreenTimeTracker && allowedCurrency > 0) window.ScreenTimeTracker.recordDailyRewardEarned(allowedCurrency, userName); }",
      "    ]) {",
      "      try { apply(); } catch (error) { console.warn('[보상 로컬 반영 실패]', error); }",
      "    }",
      "",
      "    // ⚡ [SWR 캐시 동기화] 로비 인벤토리 로컬 캐시 즉각 최신화 (페이지 복귀 시 0.01초 반영)",
      "    try {"
    ].join('\n')
  ],
  [
    [
      "        }",
      "    }",
      "",
      "    // 소원권 공통 알림(모달 오버레이)",
      "    if (earnedTickets > 0) {",
      "        setTimeout(() => {",
      "            const ticketDisplay = document.getElementById('wishTicketCountDisplay');",
      "            if(ticketDisplay) ticketDisplay.textContent = newTickets;",
      "            const overlay = document.getElementById('wishTicketOverlay');"
    ].join('\n'),
    [
      "        }",
      "    }",
      "",
      "    // 소원권 공통 알림(모달 오버레이)",
      "    if (!isSilent && earnedTickets > 0) {",
      "        setTimeout(() => {",
      "            const ticketDisplay = document.getElementById('wishTicketCountDisplay');",
      "            if(ticketDisplay) ticketDisplay.textContent = newTickets;",
      "            const overlay = document.getElementById('wishTicketOverlay');"
    ].join('\n')
  ],
  [
    [
      "",
      "    return true;",
      "  } catch (err) {",
      "    console.error(\"❌ 보상 저장 오류:\", err);",
      "    if (!isSilent) {",
      "        if (typeof updateRewardModal === 'function' && typeof showRewardModal === 'function') {",
      "            showRewardModal(`<div id=\"rewardModalContent\">보상 처리 중...</div>`);",
      "            updateRewardModal(`"
    ].join('\n'),
    [
      "",
      "    return true;",
      "  } catch (err) {",
      "    console.error(\"❌ 보상 저장 오류:\", err);",
      "    if (patchSucceeded) return true;",
      "    if (err.retryReward && !fromQueue) {",
      "      try { enqueue(entry); } catch (error) { console.warn('[보상 대기열 저장 실패]', error); }",
      "    }",
      "    if (!isSilent) {",
      "        if (typeof updateRewardModal === 'function' && typeof showRewardModal === 'function') {",
      "            showRewardModal(`<div id=\"rewardModalContent\">보상 처리 중...</div>`);",
      "            updateRewardModal(`"
    ].join('\n')
  ],
  [
    [
      "    return false;",
      "  }",
      "}",
      "",
      "",
      "window.__sttSession = null;"
    ].join('\n'),
    [
      "    return false;",
      "  }",
      "}",
      "",
      "  return async function grantRewardAndShowUI(earned, isSilent = false, customExpType = null) {",
      "    if (isAdmin()) return true;",
      "    const entry = {",
      "      id: window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`,",
      "      childName: localStorage.getItem('currentUser') === 'son' ? '민수' : '민서',",
      "      currentTheme: localStorage.getItem('currentTheme') || '마인크래프트',",
      "      subject: window.currentSubject || null, earned, customExpType, createdAt: Date.now()",
      "    };",
      "    try {",
      "      const paid = await serialize(() => payReward(entry, isSilent));",
      "      if (paid) await flushQueue();",
      "      return paid;",
      "    } catch (error) { console.warn('[보상 지급 실패]', error); return false; }",
      "  };",
      "})();",
      "",
      "",
      "window.__sttSession = null;"
    ].join('\n')
  ]
];
const applyRewardEdits = text => rewardEdits.reduce((result, [before, after]) => {
  assert.equal(result.split(before).length, 2, '승인 변경 대상은 정확히 한 번 존재해야 함');
  return result.replace(before, after);
}, normalize(text));
const applySharedEdits = text => extractedReward(applyRewardEdits(text));


test('세 파일은 지정 머리 주석을 가지며 각각 600줄 이하이고 원문을 보존한다', () => {
  const bodies = sources.map((source, index) => {
    assert.ok(source.split(/\r?\n/).length <= 600, `${files[index]}: 600줄 초과`);
    const firstNewline = source.indexOf('\n');
    assert.ok(firstNewline >= 0);
    const header = source.slice(0, firstNewline).replace(/\r$/, '');
    assert.ok(header.startsWith(`// kids/core/${names[index]} - notion-reward.js 분리 ${index + 1}/3: `));
    assert.ok(header.endsWith(' (순서대로 로드)'));
    return source.slice(firstNewline + 1);
  });
  assert.equal(normalize(bodies.join('')), applySharedEdits(fixture));
});

for (const [file, base] of [['quest_runner.html', './kids/core/']]) {
  test(`${file}: 세 태그를 상대 경로·같은 버전·지정 순서로 연달아 한 번씩 싣는다`, () => {
    const html = read(file);
    const expected = names.map(name => `<script src="${base}${name}${version}"></script>`);
    const loaded = [...html.matchAll(/<script\b[^>]*\bsrc=["'][^"']*notion-reward[^"']*["'][^>]*>\s*<\/script>/g)]
      .map(match => match[0]);
    assert.deepEqual(loaded, expected);
    const start = html.indexOf(expected[0]);
    const end = html.indexOf(expected[2]) + expected[2].length;
    assert.equal(html.slice(start, end).replace(/>\s+</g, '><'), expected.join(''));
    for (const name of names) assert.ok(fs.existsSync(path.resolve(root, path.dirname(file), base + name)));
  });
}

// notion-helper.js는 같은 이름을 선언하는 mission-reward-engine.js·quiz-feedback-overlay.js를 싣는다.
// 한 화면에 notion-reward*.js를 함께 실으면 const 중복 선언으로 한쪽 파일 전체가 실행되지 않는다(voca.html, 2026-10-31).
test('notion-helper.js를 싣는 화면은 notion-reward*.js를 함께 싣지 않는다', () => {
  const walk = dir => fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(entry => {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(file);
    return entry.name.endsWith('.html') ? [file] : [];
  });
  const pages = [...fs.readdirSync(root).filter(file => file.endsWith('.html')), ...walk('kids')];
  for (const file of pages) {
    const html = read(file);
    if (/<script[^>]*src=["'][^"']*notion-helper.js/.test(html)) {
      assert.doesNotMatch(html, /<script[^>]*src=["'][^"']*notion-reward/, file);
    }
  }
});

test('운영 소스에 이전 버전의 보상 스크립트 참조가 남지 않는다', () => {
  const walk = dir => fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(entry => {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(file);
    return /\.(?:html|js|mjs|cjs)$/.test(entry.name) ? [file] : [];
  });
  const rootFiles = fs.readdirSync(root).filter(file => /\.(?:html|js|mjs|cjs)$/.test(file));
  for (const file of [...rootFiles, ...walk('kids'), ...walk('scripts')]) {
    assert.doesNotMatch(read(file), /notion-reward[^\s"'<>]*\?v=20261024-1\b/, file);
  }
});

function sandbox(mode) {
  const events = [];
  const injected = [];
  const unexpected = name => () => { throw new Error(`로드 중 예상하지 않은 접근: ${name}`); };
  const source = `https://example.invalid/kids/core/notion-reward.js${version}`;
  const register = (type, callback) => {
    assert.equal(typeof callback, 'function');
    events.push(type);
  };
  const context = {
    URL,
    localStorage: { getItem: unexpected('getItem'), setItem: unexpected('setItem') },
    fetch: unexpected('fetch'),
    setTimeout: unexpected('setTimeout'),
    addEventListener: register,
    document: {
      currentScript: mode === 'current' || mode === 'preloaded' ? { src: source } : null,
      scripts: mode === 'fallback' ? [{ src: source }] : [],
      createElement: tag => {
        assert.equal(tag, 'script');
        return {};
      },
      head: { appendChild: script => { injected.push({ src: script.src, async: script.async }); } },
      getElementById: unexpected('getElementById'),
      addEventListener: unexpected('document.addEventListener')
    }
  };
  // 실제 클래식 스크립트처럼 window와 전역 객체를 같은 객체로 둔다.
  context.window = context;
  if (mode === 'preloaded') {
    context.StudyActivity = {};
    context.StudyLogStore = {};
  }
  vm.createContext(context);
  const initialNames = new Set(Object.keys(context));
  vm.runInContext(read('kids/core/reward-grant.js'), context);
  return { context, events, injected, initialNames };
}

function snapshot({ context, events, injected, initialNames }) {
  const added = Object.keys(context).filter(name => !initialNames.has(name)).sort();
  return {
    functions: added.filter(name => typeof context[name] === 'function'),
    windowNames: Object.keys(context.window).filter(name => !initialNames.has(name)).sort(),
    events,
    injected
  };
}

function expectedScripts(mode) {
  return mode === 'current' || mode === 'fallback'
    ? ['study-activity.js', 'study-log-store.js'].map(name => ({
      src: `https://example.invalid/kids/core/${name}?v=20261030-lesson`, async: false
    }))
    : [];
}

for (const mode of ['none', 'current', 'fallback', 'preloaded']) {
  test(`${mode}: 전체 로드 후 전역 함수·window 이름·이벤트·공용 로더가 원본과 같다`, () => {
    const original = sandbox(mode);
    const split = sandbox(mode);
    vm.runInContext(applySharedEdits(fixture), original.context, { filename: '원본 fixture' });
    sources.forEach((source, index) => vm.runInContext(source, split.context, { filename: files[index] }));
    const result = snapshot(split);
    assert.deepEqual(result, snapshot(original));
    assert.deepEqual(result.events, ['load', 'pagehide', 'popstate', 'beforeunload']);
    assert.deepEqual(result.injected, expectedScripts(mode));
    for (const name of ['sendStudyLogToNotion', 'grantRewardAndShowUI', 'setupDebouncedSTT',
      'rewardQuizCorrect', 'finalizeQuizRewardSession', 'processDiscussionAiReply', 'grantVocaDwellReward']) {
      assert.ok(result.functions.includes(name), `공개 함수 누락: ${name}`);
    }
    // 최상위 const는 window 속성이 아니므로 컨텍스트 안에서 별도로 비교한다.
    for (const expression of ['CONJUNCTION_GRADING_GUARDRAIL', 'Array.from(DISCUSSION_STOP_WORDS).join("|")']) {
      assert.equal(vm.runInContext(expression, split.context), vm.runInContext(expression, original.context));
    }
  });

  for (const count of [1, 2]) {
    test(`${mode}: 앞 ${count}개만 로드해도 뒤 파일 호출 없이 실행된다`, () => {
      const sb = sandbox(mode);
      for (let index = 0; index < count; index++) {
        assert.doesNotThrow(() => vm.runInContext(sources[index], sb.context, { filename: files[index] }));
      }
      assert.deepEqual(sb.events, ['load']);
      assert.deepEqual(sb.injected, expectedScripts(mode));
      assert.equal(typeof sb.context.setupDebouncedSTT, count === 1 ? 'undefined' : 'function');
      assert.equal(typeof sb.context.processDiscussionAiReply, 'undefined');
    });
  }
}
