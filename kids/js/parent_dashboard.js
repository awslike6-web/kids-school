const PROXY_URL = typeof APP_CONFIG !== 'undefined' && APP_CONFIG.WORKER_PROXY_URL ? APP_CONFIG.WORKER_PROXY_URL : "https://minmin-notion.awslike6.workers.dev";
const INVENTORY_DB_ID = typeof APP_CONFIG !== 'undefined' && APP_CONFIG.INVENTORY_DB_ID ? APP_CONFIG.INVENTORY_DB_ID : "374a27115b688042bb61e6a102242e12";
const STUDY_LOG_DB_ID = typeof APP_CONFIG !== 'undefined' && APP_CONFIG.STUDY_LOG_DB_ID ? APP_CONFIG.STUDY_LOG_DB_ID : "37aa27115b688001b2ffe5e6c8f82ab2";
const VOCA_DB_ID = typeof APP_CONFIG !== 'undefined' && APP_CONFIG.VOCA_DB_ID ? APP_CONFIG.VOCA_DB_ID : "375a27115b688038b686d3994ee12919";

const SUBJECTS_MINSU = ['국어', '수학', '사회', '과학', '영어'];
const SUBJECTS_MINSEO = ['국어', '수학', '하루(통합)', '창의·예술', '착한 습관'];
const SUBJECTS_5 = SUBJECTS_MINSU;

// 로컬 동시성 통제용 임시 상태 저장소
const memoryState = {
  "민수": { pageId: null, ticketCount: 0 },
  "민서": { pageId: null, ticketCount: 0 }
};

let radarCharts = {
  minsu: null,
  minseo: null
};

// 📅 로컬 타임존(한국 KST) 기준 날짜 생성 헬퍼 (YYYY-MM-DD)
function getTodayDateStr() {
  const d = new Date();
  const kst = new Date(d.getTime() + (9 * 60 + d.getTimezoneOffset()) * 60000);
  return `${kst.getFullYear()}-${String(kst.getMonth() + 1).padStart(2, '0')}-${String(kst.getDate()).padStart(2, '0')}`;
}

// 배경 버블 생성기
function makeBgFloats() {
  const container = document.getElementById('bgFloats');
  if (!container) return;
  const count = 15;
  for(let i=0; i<count; i++){
    const item = document.createElement('div');
    item.className = 'float-item';
    const size = Math.random() * 60 + 20;
    item.style.width = size + 'px';
    item.style.height = size + 'px';
    item.style.left = Math.random() * 100 + 'vw';
    item.style.animationDelay = Math.random() * 8 + 's';
    item.style.animationDuration = Math.random() * 6 + 10 + 's';
    container.appendChild(item);
  }
}

// 사용자 권한 확인 및 뷰 설정
function getUserAuth() {
  const urlParams = new URLSearchParams(window.location.search);
  const userParam = urlParams.get('user'); // 'minsu', 'minseo', 'admin'
  const savedName = localStorage.getItem('currentUserName') || '';
  const savedUser = localStorage.getItem('currentUser') || '';
  const savedChild = localStorage.getItem('currentChild') || '';

  const isAdmin = (savedName === '아빠' || savedName === '엄마' || savedUser === 'admin' || userParam === 'admin');
  
  let targetChild = null;
  if (userParam === 'minsu' || savedChild === 'minsu' || savedName === '민수' || savedUser === 'son') {
    targetChild = 'minsu';
  } else if (userParam === 'minseo' || savedChild === 'minseo' || savedName === '민서' || savedUser === 'daughter') {
    targetChild = 'minseo';
  }

  return { isAdmin, targetChild, userParam };
}

// 뷰 스위칭 (전체 / 민수 / 민서)
function switchView(viewName) {
  const cardMinsu = document.getElementById('card-minsu');
  const cardMinseo = document.getElementById('card-minseo');
  const tabAll = document.getElementById('tab-all');
  const tabMinsu = document.getElementById('tab-minsu');
  const tabMinseo = document.getElementById('tab-minseo');
  const lobbyBtn = document.getElementById('btnBackLobby');

  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));

  if (viewName === 'minsu') {
    cardMinsu.style.display = 'flex';
    cardMinseo.style.display = 'none';
    if (tabMinsu) tabMinsu.classList.add('active');
    document.getElementById('cardsGrid').style.gridTemplateColumns = '1fr';
    if (lobbyBtn) lobbyBtn.href = "lobby.html?user=minsu";
    localStorage.setItem('currentChild', 'minsu');
    localStorage.setItem('currentUser', 'son');
  } else if (viewName === 'minseo') {
    cardMinsu.style.display = 'none';
    cardMinseo.style.display = 'flex';
    if (tabMinseo) tabMinseo.classList.add('active');
    document.getElementById('cardsGrid').style.gridTemplateColumns = '1fr';
    if (lobbyBtn) lobbyBtn.href = "lobby.html?user=minseo";
    localStorage.setItem('currentChild', 'minseo');
    localStorage.setItem('currentUser', 'daughter');
  } else {
    cardMinsu.style.display = 'flex';
    cardMinseo.style.display = 'flex';
    if (tabAll) tabAll.classList.add('active');
    document.getElementById('cardsGrid').style.gridTemplateColumns = '';
    const activeChild = localStorage.getItem('currentChild') || (localStorage.getItem('currentUser') === 'daughter' ? 'minseo' : 'minsu');
    if (lobbyBtn) lobbyBtn.href = "lobby.html?user=" + activeChild;
  }
}

// 권한에 따른 소원권 버튼 노출 처리
function setupAuthUI() {
  const { isAdmin, targetChild } = getUserAuth();
  
  const msParent = document.getElementById('ms-parent-actions');
  const msChild = document.getElementById('ms-child-actions');
  const dsParent = document.getElementById('ds-parent-actions');
  const dsChild = document.getElementById('ds-child-actions');

  if (isAdmin) {
    if (msParent) msParent.style.display = 'block';
    if (msChild) msChild.style.display = 'none';
    if (dsParent) dsParent.style.display = 'block';
    if (dsChild) dsChild.style.display = 'none';
    document.getElementById('pageTitle').textContent = '민민이네 실시간 대시보드 👨‍👩‍👧‍👦 (부모 관제)';
    document.getElementById('pageSubtitle').textContent = '우리 아이들의 성장과 인벤토리를 실시간으로 모니터링하고 정비합니다.';
    switchView('all');
  } else {
    // 아이 접속 시: 소원권 결제 버튼 숨김 & 아이 뷰에 최적화
    if (msParent) msParent.style.display = 'none';
    if (msChild) msChild.style.display = 'flex';
    if (dsParent) dsParent.style.display = 'none';
    if (dsChild) dsChild.style.display = 'flex';

    if (targetChild === 'minsu') {
      document.getElementById('pageTitle').textContent = '👦 민수의 성장 퀘스트 대시보드 ✨';
      document.getElementById('pageSubtitle').textContent = '오늘의 퀘스트와 과목 능력치 밸런스를 확인하고 레벨업하자!';
      switchView('minsu');
    } else if (targetChild === 'minseo') {
      document.getElementById('pageTitle').textContent = '👧 민서의 성장 퀘스트 대시보드 🌸';
      document.getElementById('pageSubtitle').textContent = '오늘의 퀘스트와 과목 능력치 밸런스를 확인하고 레벨업하자!';
      switchView('minseo');
    } else {
      switchView('all');
    }
  }

  // 로비 이동 링크 파라미터 세팅
  const lobbyBtn = document.getElementById('btnBackLobby');
  if (lobbyBtn) {
    const activeChild = targetChild || localStorage.getItem('currentChild') || (localStorage.getItem('currentUser') === 'daughter' ? 'minseo' : 'minsu');
    lobbyBtn.href = "lobby.html?user=" + activeChild;
  }
}

// 소원권 차감 자동화 엔진 (동시성 보호 프록시 전사)
async function consumeWishTicket(childName) {
  const { isAdmin } = getUserAuth();
  if (!isAdmin) {
    alert("🔒 소원권 사용 승인은 부모님만 처리할 수 있습니다.");
    return;
  }

  const targetBtn = childName === '민수' ? document.getElementById('btn-pay-minsu') : document.getElementById('btn-pay-minseo');
  const displayEl = childName === '민수' ? document.getElementById('ms-ticket') : document.getElementById('ds-ticket');
  const childData = memoryState[childName];

  if (!childData.pageId) {
    alert("❌ 아직 노션 백엔드 인프라가 로드되지 않았습니다. 잠시 후 다시 시도해 주세요.");
    return;
  }

  const originalTicketCount = childData.ticketCount;
  if (originalTicketCount <= 0) {
    alert("❌ 보유한 소원권이 없습니다! 미션을 완료하여 소원권을 획득하세요.");
    return;
  }

  if (!confirm("🔥 정말로 " + childName + "의 소원권 1장을 사용 승인하시겠습니까?\n(노션 DB 값이 즉시 -1 차감됩니다.)")) {
    return;
  }

  // 낙관적 UI 업데이트 적용
  const newCount = originalTicketCount - 1;
  childData.ticketCount = newCount;
  displayEl.textContent = newCount + "장";

  const originalHtml = targetBtn.innerHTML;
  targetBtn.disabled = true;
  targetBtn.innerHTML = "<span>⏳ 노션 인프라 동기화 중...</span>";

  try {
    const response = await fetch(PROXY_URL + "/v1/pages/" + childData.pageId, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        properties: {
          "소원권 개수": { number: newCount }
        }
      })
    });

    if (!response.ok) throw new Error("노션 서버 통신 에러 발생");
    
    setTimeout(() => {
      alert("🎉 [" + childName + "] 소원권 결제가 정상 처리되었습니다! 아이와 행복한 시간 보내세요! ❤️");
    }, 50);

  } catch (error) {
    console.error(error);
    alert("❌ 소원권 결제 통신 중 에러가 발생했습니다.\n데이터 동시성 보호를 위해 이전 상태로 롤백합니다.");
    childData.ticketCount = originalTicketCount;
    displayEl.textContent = originalTicketCount + "장";
  } finally {
    targetBtn.innerHTML = originalHtml;
    targetBtn.disabled = false;
  }
}

// ── 통계 계산 헬퍼 함수들 (관제탑 엔진 연동) ──

function localDateStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return y + "-" + m + "-" + day;
}

function calcStreak(logPages, childName) {
  const dates = logPages
    .filter(p => p.properties['학생']?.select?.name === childName || p.properties['학생']?.multi_select?.some(s => s.name === childName))
    .map(p => p.properties['입장']?.date?.start || p.properties['날짜']?.date?.start || p.created_time)
    .filter(Boolean)
    .map(d => d.split('T')[0]);

  const unique = [...new Set(dates)].sort().reverse();
  if (!unique.length) return 0;

  const today = localDateStr();
  const yesterday = localDateStr(new Date(Date.now() - 86400000));
  if (unique[0] !== today && unique[0] !== yesterday) return 0;

  let streak = 1;
  let cursor = new Date(unique[0] + 'T12:00:00');
  for (let i = 1; i < unique.length; i++) {
    cursor.setDate(cursor.getDate() - 1);
    if (unique[i] === localDateStr(cursor)) streak++;
    else break;
  }
  return streak;
}

function parseVocaPage(page) {
  const p = page.properties;
  const subjects = p['과목']?.multi_select?.map(s => s.name) || (p['과목']?.select?.name ? [p['과목'].select.name] : []);
  const targets = p['학생']?.multi_select?.map(s => s.name) || (p['학생']?.select?.name ? [p['학생'].select.name] : []);
  const word = p['단어']?.title?.[0]?.plain_text || p['이름']?.title?.[0]?.plain_text || '어휘';
  const unit = p['단원']?.rich_text?.[0]?.plain_text || p['단원']?.select?.name || '';
  
  return {
    word,
    unit,
    subjects,
    targets,
    achieved: p['달성']?.checkbox || false,
    examScope: p['시험범위']?.checkbox || false,
    lastEdited: page.last_edited_time,
  };
}

function calcCompletion(vocaList, childName) {
  const items = vocaList.filter(v => v.targets.length === 0 || v.targets.includes(childName));
  if (!items.length) return 0;
  const achievedCount = items.filter(v => v.achieved).length;
  return Math.round((achievedCount / items.length) * 100);
}

function subjectAchievement(vocaList, childName, subjectKeyword) {
  const items = vocaList.filter(v =>
    (v.targets.length === 0 || v.targets.includes(childName)) &&
    v.subjects.some(s => s.includes(subjectKeyword))
  );
  if (!items.length) return null;
  const achieved = items.filter(v => v.achieved).length;
  return Math.round((achieved / items.length) * 100);
}

function levelToScore(level) {
  return Math.min(Math.round((level || 1) * 10), 100);
}

function buildRadarScores(props, vocaList, childName, studyLogs = []) {
  if (childName === '민서') {
    // 👧 [민서 - 초등학교 1학년] 5각 맞춤 밸런스: ['국어', '수학', '하루(통합)', '창의·예술', '착한 습관']

    // 1. 국어 (기초 문해력 / 받아쓰기)
    const korLevel = props["국어 레벨"]?.number || 1;
    const korVoca = subjectAchievement(vocaList, '민서', '국어');
    const korScore = korVoca !== null ? Math.round((levelToScore(korLevel) + korVoca) / 2) : levelToScore(korLevel);

    // 2. 수학 (기초 연산 / 가르기·모으기)
    const mathLevel = props["수학 레벨"]?.number || 1;
    const mathVoca = subjectAchievement(vocaList, '민서', '수학');
    const mathScore = mathVoca !== null ? Math.round((levelToScore(mathLevel) + mathVoca) / 2) : levelToScore(mathLevel);

    // 3. 하루(통합) (계절 탐험 / 슬기로운·바른 생활)
    const haruLevel = props["하루 레벨"]?.number || props["통합 레벨"]?.number || 1;
    let haruScore = levelToScore(haruLevel);
    const todayStr = getTodayDateStr();
    const isTodayDone = localStorage.getItem("haru_checkin_done_" + todayStr + "_minseo") === "true";
    let haruLogCount = 0;
    if (Array.isArray(studyLogs)) {
      haruLogCount = studyLogs.filter(log => {
        const child = log.properties["학생"]?.select?.name;
        const subj = log.properties["과목"]?.rich_text?.[0]?.plain_text || log.properties["과목"]?.select?.name || "";
        const title = log.properties["ID"]?.title?.[0]?.plain_text || log.properties["제목"]?.title?.[0]?.plain_text || "";
        return child === "민서" && (subj.includes("하루") || subj.includes("루틴") || title.includes("하루") || title.includes("루틴"));
      }).length;
    }
    const haruActivity = 60 + (isTodayDone ? 20 : 0) + Math.min(haruLogCount * 5, 20);
    haruScore = Math.max(haruScore, Math.min(haruActivity, 100));

    // 4. 창의·예술 (미술 갤러리 작품 / 난타 / 공예)
    let artCount = 0;
    if (typeof DEFAULT_GALLERY_DATA !== 'undefined' && Array.isArray(DEFAULT_GALLERY_DATA)) {
      artCount = DEFAULT_GALLERY_DATA.filter(item => item.author === '민서' || item.author === '공동').length;
    } else {
      try {
        const localGal = JSON.parse(localStorage.getItem('MY_STUDY_ROOM_GALLERY_DATA') || '[]');
        artCount = localGal.filter(item => item.author === '민서' || item.author === '공동').length;
      } catch (e) {}
    }
    const artScore = Math.min(50 + (artCount * 5), 100);

    // 5. 착한 습관 (데일리 루틴 / 20칸 저금통 코인)
    const coins = parseInt(localStorage.getItem("haru_piggy_coins_minseo") || "0");
    const habitScore = Math.min(50 + Math.round((coins / 20) * 50), 100);

    return [korScore, mathScore, haruScore, artScore, habitScore];
  }

  // 👦 [민수 - 초등학교 5학년] 5대 정규 교과: ['국어', '수학', '사회', '과학', '영어']
  const korLevel = props["국어 레벨"]?.number || 1;
  const mathLevel = props["수학 레벨"]?.number || 1;
  const socLevel = props["사회 레벨"]?.number || 1;
  const sciLevel = props["과학 레벨"]?.number || 1;
  const engLevel = props["영어 레벨"]?.number || 1;

  const korVoca = subjectAchievement(vocaList, childName, '국어');
  const mathVoca = subjectAchievement(vocaList, childName, '수학');
  const socVoca = subjectAchievement(vocaList, childName, '사회');
  const sciVoca = subjectAchievement(vocaList, childName, '과학');
  const engVoca = subjectAchievement(vocaList, childName, '영어');

  return [
    korVoca !== null ? Math.round((levelToScore(korLevel) + korVoca) / 2) : levelToScore(korLevel),
    mathVoca !== null ? Math.round((levelToScore(mathLevel) + mathVoca) / 2) : levelToScore(mathLevel),
    socVoca !== null ? Math.round((levelToScore(socLevel) + socVoca) / 2) : (socLevel > 1 ? levelToScore(socLevel) : (korVoca ?? 60)),
    sciVoca !== null ? Math.round((levelToScore(sciLevel) + sciVoca) / 2) : (sciLevel > 1 ? levelToScore(sciLevel) : (engVoca ?? 60)),
    engVoca !== null ? Math.round((levelToScore(engLevel) + engVoca) / 2) : levelToScore(engLevel),
  ];
}

function buildTrafficLights(vocaList, childName) {
  const now = Date.now();
  const items = vocaList
    .filter(v => {
      // 👧 민서(초1)에게는 아직 편성되지 않은 3~6학년 전용 과목(사회, 과학, 영어) 어휘를 신호등에서 제외
      if (childName === '민서') {
        const subj = v.subjects[0] || '';
        if (['사회', '과학', '영어'].includes(subj)) return false;
      }
      return v.targets.length === 0 || v.targets.includes(childName);
    })
    .map(v => {
      const days = v.lastEdited
        ? Math.floor((now - new Date(v.lastEdited).getTime()) / 86400000)
        : 99;
      let status, daysLabel;
      if (!v.achieved) {
        status = 'red';
        daysLabel = '미달성 · 학습 필요';
      } else if (days <= 3) {
        status = 'green';
        daysLabel = 'D+' + days + ' 복습 완료';
      } else if (days <= 7) {
        status = 'yellow';
        daysLabel = 'D+' + days + ' 복습 필요';
      } else {
        status = 'red';
        daysLabel = 'D+' + days + ' 긴급 복습!';
      }
      const subject = v.subjects[0] || '어휘';
      const label = v.unit ? subject + " [" + v.unit + "] " + v.word : subject + " " + v.word;
      return { subject: label, status, days: daysLabel, priority: status === 'red' ? 0 : status === 'yellow' ? 1 : 2, daysNum: days };
    })
    .sort((a, b) => a.priority - b.priority || b.daysNum - a.daysNum)
    .slice(0, 5);

  return items.length ? items : [{ subject: '복습 항목 없음', status: 'green', days: '오늘 퀘스트 완료!' }];
}

function renderTrafficUI(listElId, trafficItems) {
  const el = document.getElementById(listElId);
  if (!el) return;
  el.innerHTML = '';
  trafficItems.forEach(item => {
    const div = document.createElement('div');
    div.className = 'traffic-item';
    div.innerHTML = '<div class="traffic-left"><div class="traffic-dot ' + item.status + '"></div><span class="traffic-name" title="' + item.subject + '">' + item.subject + '</span></div><span class="traffic-badge ' + item.status + '">' + item.days + '</span>';
    el.appendChild(div);
  });
}

function renderRadarChart(canvasId, label, scores, isPink, customLabels) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  const labels = customLabels || (isPink ? SUBJECTS_MINSEO : SUBJECTS_MINSU);
  const colorPrimary = isPink ? 'rgba(255, 107, 157, 0.85)' : 'rgba(110, 198, 245, 0.85)';
  const colorBg = isPink ? 'rgba(255, 107, 157, 0.22)' : 'rgba(110, 198, 245, 0.22)';
  const colorBorder = isPink ? '#FF6B9D' : '#6EC6F5';

  const chartKey = isPink ? 'minseo' : 'minsu';
  if (radarCharts[chartKey]) {
    radarCharts[chartKey].destroy();
  }

  radarCharts[chartKey] = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: labels,
      datasets: [{
        label: label,
        data: scores,
        backgroundColor: colorBg,
        borderColor: colorBorder,
        borderWidth: 2.5,
        pointBackgroundColor: colorPrimary,
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: colorPrimary,
        pointRadius: 4,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          min: 0,
          max: 100,
          ticks: { stepSize: 25, display: false },
          pointLabels: {
            font: { family: "'Jua', sans-serif", size: 12 },
            color: '#4A4A77'
          },
          grid: { color: 'rgba(0, 0, 0, 0.06)' },
          angleLines: { color: 'rgba(0, 0, 0, 0.08)' }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => context.label + ": " + context.raw + "점"
          }
        }
      }
    }
  });
}

// 노션에서 실시간 통합 인벤토리 & 학습일지 & VOCA 데이터 로드
async function loadDashboardData() {
  try {
    // 3대 노션 DB 병렬 쿼리
    const [invRes, logsRes, vocaRes] = await Promise.all([
      fetch(PROXY_URL + "/v1/databases/" + INVENTORY_DB_ID + "/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page_size: 10 })
      }),
      fetch(PROXY_URL + "/v1/databases/" + STUDY_LOG_DB_ID + "/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page_size: 50, sorts: [{ property: "입장", direction: "descending" }] })
      }).catch(() => null),
      fetch(PROXY_URL + "/v1/databases/" + VOCA_DB_ID + "/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page_size: 100 })
      }).catch(() => null)
    ]);

    if (!invRes.ok) throw new Error("인벤토리 DB 네트워크 응답 오류");
    const invData = await invRes.json();
    const logsData = logsRes && logsRes.ok ? await logsRes.json() : { results: [] };
    const vocaData = vocaRes && vocaRes.ok ? await vocaRes.json() : { results: [] };

    const studyLogs = logsData.results || [];
    const vocaList = (vocaData.results || []).map(parseVocaPage);

    // ⏰ [스크린타임 클라우드 동기화] 노션에 저장된 오늘 학습일지 소요시간을 트래커에 즉시 반영
    if (typeof window.ScreenTimeTracker !== 'undefined' && typeof window.ScreenTimeTracker.syncFromStudyLogs === 'function') {
        window.ScreenTimeTracker.syncFromStudyLogs(studyLogs, '민수');
        window.ScreenTimeTracker.syncFromStudyLogs(studyLogs, '민서');
    }

    if (invData.results && invData.results.length > 0) {
      invData.results.forEach(page => {
        const props = page.properties;
        const name = props["이름"]?.title[0]?.plain_text;
        
        if (name === "민수" || name === "민서") {
          const prefix = name === "민수" ? "ms" : "ds";
          const isMinseo = name === "민서";
          
          // ⏰ [스크린타임 보상 & 승인 클라우드 동기화] 노션 인벤토리 DB 데이터 트래커 반영
          if (typeof window.ScreenTimeTracker !== 'undefined' && typeof window.ScreenTimeTracker.syncFromInventoryProps === 'function') {
            window.ScreenTimeTracker.syncFromInventoryProps(props, name);
          }

          // 로컬 상태 보존
          memoryState[name].pageId = page.id;
          memoryState[name].ticketCount = props["소원권 개수"]?.number || 0;

          // 1. 과목별 성장 마스터 바인딩 (민수 vs 민서 이원화)
          if (isMinseo) {
            // 👧 민서: 초1 맞춤 3대 교과 (국어, 수학, 하루) + 3대 활동 (창의, 습관, 어휘)
            const korRealEl = document.getElementById("ds-kor-real");
            const mathEl = document.getElementById("ds-math");
            const haruEl = document.getElementById("ds-haru");
            const artEl = document.getElementById("ds-art");
            const habitEl = document.getElementById("ds-habit");
            const korVocaEl = document.getElementById("ds-kor");

            const korRealLv = props["국어 레벨"]?.number || 1;
            const mathLv = props["수학 레벨"]?.number || 1;
            const haruLv = props["하루 레벨"]?.number || props["사회 레벨"]?.number || 1;
            const korVocaLv = props["용어 레벨"]?.number || 1;

            if (korRealEl) { korRealEl.textContent = "Lv." + korRealLv; korRealEl.classList.remove("loading-shimmer"); }
            if (mathEl) { mathEl.textContent = "Lv." + mathLv; mathEl.classList.remove("loading-shimmer"); }
            if (haruEl) { haruEl.textContent = "Lv." + haruLv; haruEl.classList.remove("loading-shimmer"); }
            if (korVocaEl) { korVocaEl.textContent = "Lv." + korVocaLv; korVocaEl.classList.remove("loading-shimmer"); }

            // 창의·예술: 갤러리 등록 작품 수 실시간 카운트
            let minseoArtCount = 0;
            if (typeof DEFAULT_GALLERY_DATA !== 'undefined' && Array.isArray(DEFAULT_GALLERY_DATA)) {
              minseoArtCount = DEFAULT_GALLERY_DATA.filter(item => item.author === '민서' || item.author === '공동').length;
            } else {
              try {
                const localGal = JSON.parse(localStorage.getItem('MY_STUDY_ROOM_GALLERY_DATA') || '[]');
                minseoArtCount = localGal.filter(item => item.author === '민서' || item.author === '공동').length;
              } catch (e) {}
            }
            if (artEl) { artEl.textContent = minseoArtCount + "작품"; artEl.classList.remove("loading-shimmer"); }

            // 착한 습관: 저금통 코인 수 실시간 연동
            const minseoCoins = parseInt(localStorage.getItem("haru_piggy_coins_minseo") || "0");
            if (habitEl) { habitEl.textContent = minseoCoins + "/20코인"; habitEl.classList.remove("loading-shimmer"); }
          } else {
            // 👦 민수: 5대 정규 교과 + 용어사전
            const mathEl = document.getElementById("ms-math");
            const engEl = document.getElementById("ms-eng");
            const korEl = document.getElementById("ms-kor");
            const korRealEl = document.getElementById("ms-kor-real");
            const sciEl = document.getElementById("ms-sci");
            const socEl = document.getElementById("ms-soc");

            const mathLv = props["수학 레벨"]?.number || 1;
            const engLv = props["영어 레벨"]?.number || 1;
            const korVocaLv = props["용어 레벨"]?.number || 1;
            const korRealLv = props["국어 레벨"]?.number || 1;
            const sciLv = props["과학 레벨"]?.number || 1;
            const socLv = props["사회 레벨"]?.number || 1;

            if (mathEl) { mathEl.textContent = "Lv." + mathLv; mathEl.classList.remove("loading-shimmer"); }
            if (engEl) { engEl.textContent = "Lv." + engLv; engEl.classList.remove("loading-shimmer"); }
            if (korEl) { korEl.textContent = "Lv." + korVocaLv; korEl.classList.remove("loading-shimmer"); }
            if (korRealEl) { korRealEl.textContent = "Lv." + korRealLv; korRealEl.classList.remove("loading-shimmer"); }
            if (sciEl) { sciEl.textContent = "Lv." + sciLv; sciEl.classList.remove("loading-shimmer"); }
            if (socEl) { socEl.textContent = "Lv." + socLv; socEl.classList.remove("loading-shimmer"); }
          }

          // 인벤토리 주입
          diaEl.textContent = (props["다이아몬드 개수"]?.number || 0) + "개";
          diaEl.classList.remove("loading-shimmer");

          slimeEl.textContent = (typeof getDaughterRewardCount === 'function'
            ? getDaughterRewardCount(props)
            : (props["하리보 젤리 개수"]?.number || props["슬라임 파츠 개수"]?.number || 0)) + "개";
          slimeEl.classList.remove("loading-shimmer");

          ticketEl.textContent = memoryState[name].ticketCount + "장";
          ticketEl.classList.remove("loading-shimmer");

          // 2. 연속 학습 Streak 계산 & UI 주입
          const streak = calcStreak(studyLogs, name);
          const streakValEl = document.getElementById(prefix + "-streak-val");
          if (streakValEl) streakValEl.textContent = streak;
          
          const streakProgEl = document.getElementById(prefix + "-streak-progress-num");
          if (streakProgEl) streakProgEl.textContent = streak + " / 7일";
          const streakFillEl = document.getElementById(prefix + "-streak-fill");
          if (streakFillEl) streakFillEl.style.width = Math.min(Math.round((streak / 7) * 100), 100) + "%";

          // 3. 완공률 계산 & UI 주입
          const completion = calcCompletion(vocaList, name);
          const compNumEl = document.getElementById(prefix + "-completion-num");
          if (compNumEl) compNumEl.textContent = completion + "%";
          const compFillEl = document.getElementById(prefix + "-completion-fill");
          if (compFillEl) compFillEl.style.width = completion + "%";

          // 4. 망각곡선 신호등 렌더링
          const trafficItems = buildTrafficLights(vocaList, name);
          renderTrafficUI(prefix + "-traffic-list", trafficItems);

          // 5. 과목/성장 레이더 차트 렌더링 (민수: 5대 교과 / 민서: 초1 맞춤 5각 밸런스)
          const radarScores = buildRadarScores(props, vocaList, name, studyLogs);
          const radarLabels = isMinseo ? SUBJECTS_MINSEO : SUBJECTS_MINSU;
          const radarTitle = isMinseo ? "민서 맞춤 성장 밸런스" : "민수 과목 밸런스";
          renderRadarChart(prefix + "-radar-chart", radarTitle, radarScores, isMinseo, radarLabels);

          // 6. 스크린타임 스마트 정산기 위젯 렌더링
          renderScreenTimeWidget(name);

          // 7. 데일리 습관 & 부모 칭찬 코칭 카드 렌더링 (민수 / 민서 공통 지원)
          renderHaruParentCoaching(studyLogs, name);

          // 8. 닥터 코코 실시간 안심 알림 위젯 렌더링 (민수 / 민서 공통 지원)
          renderSafetyAlertWidget(studyLogs, name);
        }
      });
    }
  } catch (error) {
    console.error("데이터 로드 에러:", error);
    document.querySelectorAll(".loading-shimmer").forEach(el => {
      el.textContent = "연결실패";
      el.style.color = "#ff6b6b";
      el.classList.remove("loading-shimmer");
    });
    // 네트워크 실패 시 로컬 캐시 데이터 폴백 렌더링
    renderHaruParentCoaching([], "민수");
    renderHaruParentCoaching([], "민서");
    renderSafetyAlertWidget([], "민수");
    renderSafetyAlertWidget([], "민서");
  } finally {
    // 트래커 데이터 로컬 렌더링 보장 (화면 타이머 위젯)
    renderScreenTimeWidget("민수");
    renderScreenTimeWidget("민서");
  }
}

// 📱 스크린타임 스마트 정산기 UI 바인딩 (차액 정산: 대기시간 0분 초기화 및 기기간 동기화)
function renderScreenTimeWidget(childName) {
  if (typeof window.ScreenTimeTracker === 'undefined') return;

  const prefix = childName === "민수" ? "ms" : "ds";
  const isMinseo = childName === "민서";
  const summary = window.ScreenTimeTracker.getScreenTimeSummary(childName);

  const studyTimeEl = document.getElementById(prefix + "-st-study-time");
  const roundedNoteEl = document.getElementById(prefix + "-st-rounded-note");
  const rewardQuestEl = document.getElementById(prefix + "-st-reward-quest");
  const rewardTicketNoteEl = document.getElementById(prefix + "-st-reward-ticket-note");
  const totalLabelEl = document.getElementById(prefix + "-st-total-label");
  const totalTimeEl = document.getElementById(prefix + "-st-total-time");
  const ticketSplitEl = document.getElementById(prefix + "-st-ticket-split");
  const badgeEl = document.getElementById(prefix + "-st-status-badge");
  const approveBtn = document.getElementById(prefix + "-st-approve-btn");
  const resetWrapEl = document.getElementById(prefix + "-st-reset-wrap");

  const rawMinutes = summary.rawMinutes ?? 0;
  const studyMinutes = summary.adjustedStudyMinutes ?? 0;
  const rewardEarned = summary.earnedCurrency ?? 0;
  const is50Reached = summary.is50QuestReached ?? false;
  const totalMinutes = summary.totalMinutes ?? 0;
  const approvedMinutes = summary.approvedMinutes ?? 0;
  const pendingMinutes = summary.pendingMinutes ?? 0;
  const isFullyApproved = summary.isFullyApproved ?? false;

  if (studyTimeEl) studyTimeEl.textContent = rawMinutes + "분";
  if (roundedNoteEl) roundedNoteEl.textContent = `➔ 10분 올림: ${studyMinutes}분`;
  if (rewardQuestEl) rewardQuestEl.textContent = `${rewardEarned} / 50개`;
  
  if (rewardTicketNoteEl) {
    if (is50Reached) {
      rewardTicketNoteEl.textContent = "🎉 30분권 획득 (+30분)!";
      rewardTicketNoteEl.style.color = "#16a34a";
    } else {
      rewardTicketNoteEl.textContent = `${Math.max(0, 50 - rewardEarned)}개 더 모으면 +30분`;
      rewardTicketNoteEl.style.color = "#b45309";
    }
  }

  // 1. 라벨 영역 동적 반영
  if (totalLabelEl) {
    if (pendingMinutes > 0) {
      totalLabelEl.innerHTML = `👉 지금 패밀리링크 <span style="text-decoration:underline;">추가 연장</span>할 시간`;
      totalLabelEl.style.color = isMinseo ? "#9d174d" : "#065f46";
    } else if (totalMinutes > 0) {
      totalLabelEl.innerHTML = `🎉 오늘 달성 시간 모두 연장 완료`;
      totalLabelEl.style.color = "#15803d";
    } else {
      totalLabelEl.innerHTML = `패밀리링크 총 연장 권장 시간`;
      totalLabelEl.style.color = isMinseo ? "#9d174d" : "#065f46";
    }
  }

  // 2. 대기 시간 vs 누적 인정 시간 3단 직관 박스 (대기 시간 0분 초기화 지원)
  if (totalTimeEl) {
    if (pendingMinutes > 0) {
      const hours = Math.floor(pendingMinutes / 60);
      const mins = pendingMinutes % 60;
      const hourStr = hours > 0 ? `${hours}시간 ${mins}분` : `${mins}분`;
      totalTimeEl.innerHTML = `
        <div style="font-size: 1.55rem; font-weight: 900; color: ${isMinseo ? '#db2777' : '#059669'};">
          +${pendingMinutes}분 <span style="font-size: 0.85rem; font-weight: bold; color: #b45309; background: #fef3c7; padding: 2px 7px; border-radius: 8px; vertical-align: middle;">⏳ 연장 대기</span>
        </div>
        <div style="font-size: 0.75rem; color: #64748b; margin-top: 3px; font-weight: normal;">
          오늘 총 인정: <b>${totalMinutes}분</b> ${approvedMinutes > 0 ? `| 이미 연장: <b style="color:#16a34a;">${approvedMinutes}분</b>` : `(아직 연장 전)`}
        </div>
      `;
    } else if (totalMinutes > 0) {
      totalTimeEl.innerHTML = `
        <div style="font-size: 1.45rem; font-weight: 900; color: #16a34a;">
          0분 <span style="font-size: 0.85rem; font-weight: bold; color: #15803d; background: #dcfce7; padding: 2px 7px; border-radius: 8px; vertical-align: middle;">💖 대기 없음</span>
        </div>
        <div style="font-size: 0.75rem; color: #15803d; margin-top: 3px; font-weight: normal;">
          오늘 달성한 <b>${totalMinutes}분</b> 모두 패밀리링크 연장 완료!
        </div>
      `;
    } else {
      totalTimeEl.innerHTML = `
        <div style="font-size: 1.35rem; font-weight: 900; color: #94a3b8;">
          0분 (0시간 0분)
        </div>
        <div style="font-size: 0.75rem; color: #94a3b8; margin-top: 3px; font-weight: normal;">
          아이의 오늘 공부를 기다리고 있어요
        </div>
      `;
    }
  }

  // 3. 발급 티켓 내역 (지금 연장 대기 vs 승인 완료 구분)
  if (ticketSplitEl) {
    if (summary.tickets && summary.tickets.length > 0) {
      const pendingParts = summary.tickets.filter(t => t.status === 'pending').map(t => `${t.label} x${t.count}장`);
      const approvedParts = summary.tickets.filter(t => t.status === 'approved').map(t => `${t.label} x${t.count}장`);
      let html = '';
      if (pendingParts.length > 0) {
        html += `<span style="color:#b45309; font-weight:bold;">⏳ 지금 연장: ${pendingParts.join(' + ')}</span>`;
      }
      if (approvedParts.length > 0) {
        if (html) html += ' <span style="color:#cbd5e1;">|</span> ';
        html += `<span style="color:#15803d; font-weight:bold;">✅ 연장 완료: ${approvedParts.join(' + ')}</span>`;
      }
      ticketSplitEl.innerHTML = html;
    } else {
      ticketSplitEl.textContent = "발급 티켓: 없음";
    }
  }

  // 4. 상태 배지
  if (badgeEl) {
    if (pendingMinutes > 0) {
      badgeEl.textContent = `연장 대기: ${pendingMinutes}분 ⏳`;
      badgeEl.style.background = "#fef3c7";
      badgeEl.style.color = "#b45309";
    } else if (totalMinutes > 0) {
      badgeEl.textContent = "연장 완료 💖 (대기 0분)";
      badgeEl.style.background = "#dcfce7";
      badgeEl.style.color = "#15803d";
    } else {
      badgeEl.textContent = "대기 중";
      badgeEl.style.background = isMinseo ? "#fce7f3" : "#e0f2fe";
      badgeEl.style.color = isMinseo ? "#be185d" : "#0369a1";
    }
  }

  // 5. 원클릭 승인 버튼
  if (approveBtn) {
    if (pendingMinutes > 0) {
      approveBtn.textContent = `✅ 지금 ${pendingMinutes}분 패밀리링크 연장 완료 승인`;
      approveBtn.disabled = false;
      approveBtn.style.opacity = "1";
      approveBtn.style.cursor = "pointer";
      approveBtn.style.background = isMinseo
        ? "linear-gradient(135deg, #ec4899, #db2777)"
        : "linear-gradient(135deg, #10b981, #059669)";
    } else if (totalMinutes > 0) {
      approveBtn.textContent = `🎉 오늘 ${totalMinutes}분 연장 완료 (대기 0분)`;
      approveBtn.disabled = true;
      approveBtn.style.opacity = "0.85";
      approveBtn.style.cursor = "default";
      approveBtn.style.background = "#64748b";
    } else {
      approveBtn.textContent = "⏳ 공부 시간 대기 중 (0분)";
      approveBtn.disabled = true;
      approveBtn.style.opacity = "0.6";
      approveBtn.style.cursor = "not-allowed";
      approveBtn.style.background = "#94a3b8";
    }
  }

  // 6. 승인 재설정/초기화 링크
  if (resetWrapEl) {
    resetWrapEl.style.display = approvedMinutes > 0 ? "block" : "none";
  }
}

// 📱 부모 승인 실행 핸들러 (차액 승인: 대기시간 0분 초기화 + 노션 클라우드 영구 저장)
window.toggleParentScreenTimeApproval = async function(childName) {
  if (typeof window.ScreenTimeTracker === 'undefined') {
    alert("스크린타임 트래커 모듈이 준비되지 않았습니다.");
    return;
  }
  const summaryBefore = window.ScreenTimeTracker.getScreenTimeSummary(childName);
  if (summaryBefore.pendingMinutes <= 0) {
    alert(`[${childName}] 이미 오늘 달성한 모든 시간(${summaryBefore.totalMinutes}분)이 패밀리링크 연장 완료되었습니다.`);
    return;
  }

  const approveResult = window.ScreenTimeTracker.approvePendingTime(childName);
  const newlyApproved = approveResult.newlyApprovedMinutes;
  renderScreenTimeWidget(childName);
  
  // ☁️ [클라우드 영구 동기화] 노션 인벤토리 DB의 '학습설정' 속성에 비동기 저장
  await saveScreenTimeApprovalToCloud(childName, true, approveResult.totalMinutes);

  alert(`💖 [${childName}] ${newlyApproved}분 패밀리링크 연장 확인이 완료되었습니다!\n\n👉 지금 연장할 대기 시간이 0분으로 초기화되었습니다.\n☁️ 노션 클라우드에 영구 저장되어 엄마/아빠 모든 기기에서 즉시 '연장 완료'로 공유됩니다.`);
};

// 📱 부모 승인 초기화 핸들러 (취소 시 대기 시간으로 복원)
window.resetParentScreenTimeApproval = async function(childName) {
  if (typeof window.ScreenTimeTracker === 'undefined') return;
  if (!confirm(`[${childName}] 오늘 연장 승인을 초기화하고 대기 시간으로 다시 복원하시겠습니까?\n(엄마/아빠 기기 모두 대기 시간으로 복원됩니다.)`)) {
    return;
  }

  window.ScreenTimeTracker.resetApproval(childName);
  renderScreenTimeWidget(childName);

  // ☁️ [클라우드 영구 동기화] 노션 인벤토리 DB의 '학습설정' 속성에 초기화 저장
  await saveScreenTimeApprovalToCloud(childName, false, 0);

  alert(`↩️ [${childName}] 오늘 연장 승인이 초기화되었습니다.\n오늘 달성한 시간이 다시 승인 대기 상태로 복원되었습니다.`);
};

// ☁️ 스크린타임 승인 데이터 노션 클라우드 PATCH 헬퍼
async function saveScreenTimeApprovalToCloud(childName, isApproved, approvedMinutes) {
  const childData = memoryState[childName];
  if (!childData || !childData.pageId) return;

  const todayStr = getTodayDateStr();
  const childKey = childName === "민수" ? "minsu" : "minseo";
  try {
    let existingSettings = {};
    try {
      const cachedRaw = localStorage.getItem("MINMIN_LAST_CLOUD_SETTINGS_" + childKey);
      if (cachedRaw) existingSettings = JSON.parse(cachedRaw);
    } catch (_) {}

    existingSettings.screentimeApproval = {
      date: todayStr,
      approved: isApproved,
      approvedMinutes: approvedMinutes,
      lastApprovedAt: new Date().toISOString(),
      approvedBy: "부모"
    };

    const updatedJson = JSON.stringify(existingSettings);
    localStorage.setItem("MINMIN_LAST_CLOUD_SETTINGS_" + childKey, updatedJson);

    const proxyUrl = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.WORKER_PROXY_URL) ? APP_CONFIG.WORKER_PROXY_URL : PROXY_URL;
    const res = await fetch(proxyUrl + "/v1/pages/" + childData.pageId, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0"
      },
      body: JSON.stringify({
        properties: {
          "학습설정": {
            rich_text: [{ type: "text", text: { content: updatedJson } }]
          }
        }
      })
    });
    if (res.ok) {
      console.log(`☁️ [스크린타임 승인 클라우드 저장 완료] ${childName}:`, isApproved, `누적승인: ${approvedMinutes}분`);
    } else {
      console.warn(`⚠️ [스크린타임 승인 클라우드 전송 실패]: 응답 코드`, res.status);
    }
  } catch (e) {
    console.warn("⚠️ [스크린타임 클라우드 패치 에러]:", e);
  }
}

// 🌱 [데일리 루틴 & 하루] 생활 습관 & 부모 칭찬 코칭 카드 렌더링 (민수/민서 공통)
function renderHaruParentCoaching(studyLogs = [], childName = "민서") {
  const isMinsu = childName === "민수";
  const childKey = isMinsu ? "minsu" : "minseo";
  const prefix = isMinsu ? "ms" : "ds";

  const boxEl = document.getElementById(prefix + "-haru-coaching-box");
  if (!boxEl) return;

  const todayStr = getTodayDateStr();
  const isDoneLocal = localStorage.getItem("haru_checkin_done_" + todayStr + "_" + childKey) === "true";
  let coins = parseInt(localStorage.getItem("haru_piggy_coins_" + childKey) || "0");
  let habitName = localStorage.getItem("haru_today_habit_" + childKey) || "";
  let workoutName = localStorage.getItem("haru_today_workout_" + childKey) || "";
  let moodName = localStorage.getItem("haru_today_mood_" + childKey) || "";
  let isDone = isDoneLocal;

  // 노션 학습일지 DB 데이터가 전달된 경우 원격 부모 디바이스 폴백 지원
  if (Array.isArray(studyLogs) && studyLogs.length > 0) {
    const todayHaruLog = studyLogs.find(log => {
      const child = log.properties["학생"]?.select?.name;
      const subj = log.properties["과목"]?.rich_text?.[0]?.plain_text || log.properties["과목"]?.select?.name || "";
      const date = log.properties["입장"]?.date?.start || log.properties["날짜"]?.date?.start || "";
      const title = log.properties["ID"]?.title?.[0]?.plain_text || log.properties["제목"]?.title?.[0]?.plain_text || "";
      const matchesChild = child === childName;
      const matchesSubj = subj.includes("하루") || subj.includes("루틴") || title.includes("하루") || title.includes("루틴");
      const matchesDate = (date && date.startsWith(todayStr)) || title.includes(todayStr);
      return matchesChild && matchesSubj && matchesDate;
    });

    if (todayHaruLog) {
      isDone = true;
      const content = todayHaruLog.properties["오답리포트"]?.rich_text?.[0]?.plain_text || todayHaruLog.properties["학습내용"]?.rich_text?.[0]?.plain_text || "";
      const habitMatch = content.match(/착한\s*습관:\s*([^\n\r]+)/);
      const workoutMatch = content.match(/(?:튼튼운동|건강운동):\s*([^\n\r]+)/);
      const moodMatch = content.match(/마음\s*날씨:\s*([^\(\[\n\r]+)/);

      if (habitMatch && habitMatch[1] && !habitName) habitName = habitMatch[1].trim();
      if (workoutMatch && workoutMatch[1] && !workoutName) workoutName = workoutMatch[1].trim();
      if (moodMatch && moodMatch[1] && !moodName) moodName = moodMatch[1].trim();

      if (!moodName) {
        const moodProp = todayHaruLog.properties["감정날씨"]?.rich_text?.[0]?.plain_text;
        if (moodProp) moodName = moodProp.trim();
      }

      // 로컬 스토리지에 동기화 캐시 (부모 디바이스 새로고침 및 로컬 보존)
      try {
        localStorage.setItem("haru_checkin_done_" + todayStr + "_" + childKey, "true");
        if (habitName) localStorage.setItem("haru_today_habit_" + childKey, habitName);
        if (workoutName) localStorage.setItem("haru_today_workout_" + childKey, workoutName);
        if (moodName) localStorage.setItem("haru_today_mood_" + childKey, moodName);
      } catch(_) {}
    }
  }

  // 이미 화면이 완료 상태로 렌더링되어 있다면 빈 배열 호출 시 다운그레이드 방지
  if (!isDone && (!studyLogs || studyLogs.length === 0)) {
    const currentBadge = document.getElementById(prefix + "-haru-today-badge");
    if (currentBadge && currentBadge.textContent.includes("완료")) {
      return;
    }
  }

  // 엘리먼트 참조
  const badgeEl = document.getElementById(prefix + "-haru-today-badge");
  const habitValEl = document.getElementById(isMinsu ? "ms-coach-habit-val" : "coach-habit-val");
  const workoutValEl = document.getElementById(isMinsu ? "ms-coach-workout-val" : "coach-workout-val");
  const moodValEl = document.getElementById(isMinsu ? "ms-coach-mood-val" : "coach-mood-val");
  const piggyTextEl = document.getElementById(isMinsu ? "ms-coach-piggy-progress-text" : "coach-piggy-progress-text");
  const piggyBarEl = document.getElementById(isMinsu ? "ms-coach-piggy-progress-bar" : "coach-piggy-progress-bar");
  const praiseScriptEl = document.getElementById(isMinsu ? "ms-coach-praise-script" : "coach-praise-script");

  // 20칸 저금통 진행률
  const pct = Math.min(Math.round((coins / 20) * 100), 100);
  if (piggyTextEl) piggyTextEl.textContent = `${coins} / 20개 (${pct}%)`;
  if (piggyBarEl) piggyBarEl.style.width = `${pct}%`;

  const { isAdmin } = getUserAuth();

  if (isDone) {
    if (badgeEl) {
      badgeEl.textContent = "체크인 완료 🎉";
      badgeEl.style.background = "#dcfce7";
      badgeEl.style.color = "#15803d";
    }
    if (habitValEl) habitValEl.textContent = habitName || "실천 완료 ✨";
    if (workoutValEl) workoutValEl.textContent = workoutName || "실천 완료 ✨";
    if (moodValEl) moodValEl.textContent = moodName || "기록 완료 ✨";

    // 💡 맞춤형 칭찬 큐시트 생성
    let habitPraise = "";
    if (isMinsu) {
      // 👦 민수 전용: 의젓한 5학년 자기주도성 & 배려심 강화 칭찬
      if (habitName.includes("신발")) {
        habitPraise = "👟 <b>[현관 신발 정리]:</b> \"현관 신발을 가지런히 정돈해 둔 민수의 멋진 배려심을 칭찬해 주세요! 든든한 5학년 형아의 품격이 느껴져요.\"";
      } else if (habitName.includes("가방") || habitName.includes("알림장") || habitName.includes("준비물") || habitName.includes("책")) {
        habitPraise = "🎒 <b>[수업 준비물 스스로 챙기기]:</b> \"5학년 수업 준비물과 책가방을 스스로 꼼꼼히 챙기다니 정말 자기주도적인 멋진 모습입니다!\"";
      } else if (habitName.includes("손") || habitName.includes("양치")) {
        habitPraise = "🫧 <b>[청결 & 위생 관리]:</b> \"위생 습관을 잊지 않고 스스로 깔끔하게 실천하는 민수의 관리 태도가 아주 훌륭해요!\"";
      } else if (habitName.includes("정리") || habitName.includes("방") || habitName.includes("책상")) {
        habitPraise = "📚 <b>[책상 & 방 정리정돈]:</b> \"자신의 공부방과 책상을 스스로 단정하게 정리한 민수의 책임감을 크게 인정해 주세요!\"";
      } else if (habitName.includes("인사")) {
        habitPraise = "🌸 <b>[의젓한 예절 인사]:</b> \"가족과 이웃에게 먼저 의젓하고 정중하게 인사하는 민수의 태도가 정말 멋져요!\"";
      } else if (habitName.includes("도움") || habitName.includes("돕기")) {
        habitPraise = "💖 <b>[가족 배려와 도움]:</b> \"가족을 위해 먼저 손을 내밀고 도와준 민수의 듬직하고 따뜻한 마음씨가 큰 힘이 됩니다!\"";
      } else {
        habitPraise = `✨ <b>[자기주도 실천]:</b> \"오늘 스스로 <b>[${habitName || '착한 습관'}]</b>을(를) 멋지게 실천한 민수의 노력을 인정하고 하이파이브를 나눠주세요!\"`;
      }
    } else {
      // 👧 민서 전용: 아기자기 1학년 자신감 & 사랑 듬뿍 칭찬
      if (habitName.includes("신발")) {
        habitPraise = "👟 <b>[신발 정리]:</b> \"현관에 신발을 예쁘게 정리해 줘서 집이 훨씬 밝아졌네! 민서의 배려 덕분에 엄마·아빠 기분이 참 좋다!\"";
      } else if (habitName.includes("가방") || habitName.includes("알림장")) {
        habitPraise = "🎒 <b>[스스로 챙기기]:</b> \"학교 가방과 알림장을 똑소리 나게 스스로 챙기다니 정말 의젓한 1학년 언니가 다 됐네!\"";
      } else if (habitName.includes("손") || habitName.includes("양치")) {
        habitPraise = "🫧 <b>[청결 습관]:</b> \"스스로 깨끗하게 손 씻고 양치질하는 민서 모습이 반짝반짝 빛나고 정말 멋져!\"";
      } else if (habitName.includes("장난감") || habitName.includes("방") || habitName.includes("정리")) {
        habitPraise = "🧸 <b>[제자리 정리]:</b> \"놀던 물건을 스스로 쏙쏙 제자리에 정리해 줘서 방이 깨끗해졌어! 민서는 정리 마법사야!\"";
      } else if (habitName.includes("인사")) {
        habitPraise = "🌸 <b>[밝은 인사]:</b> \"예쁜 목소리로 먼저 밝게 인사해 줘서 온 가족의 마음이 사르르 녹아내려!\"";
      } else if (habitName.includes("도움") || habitName.includes("돕기")) {
        habitPraise = "💖 <b>[가족 돕기]:</b> \"엄마·아빠를 먼저 도와주려고 나선 민서의 착하고 따뜻한 마음씨가 정말 큰 힘이 돼!\"";
      } else {
        habitPraise = `✨ <b>[착한 실천]:</b> \"오늘 스스로 <b>[${habitName || '착한 습관'}]</b>을(를) 멋지게 실천한 민서의 노력을 꼭 안아주며 칭찬해 주세요!\"`;
      }
    }

    let workoutPraise = workoutName ? `<br>💪 <b>[건강 운동]:</b> 오늘 <b>[${workoutName}]</b>까지 씩씩하게 실천하여 체력도 쑥쑥 길렀어요!` : "";

    let moodPraise = "";
    if (moodName.includes("기쁨") || moodName.includes("행복")) {
      moodPraise = `<br>☀️ <b>[햇살 마음 대화]:</b> \"오늘 ${childName} 마음이 햇살처럼 환해서 기뻐! 오늘 있었던 제일 즐거운 일이나 성취감을 엄마·아빠한테 들려줄래?\"`;
    } else if (moodName.includes("즐거움") || moodName.includes("신남")) {
      moodPraise = `<br>🌈 <b>[무지개 마음 대화]:</b> \"오늘 신나는 일이 가득했구나! 어떤 재미난 모험이 있었는지 함께 들려줘!\"`;
    } else if (moodName.includes("슬픔") || moodName.includes("속상")) {
      moodPraise = `<br>🌧️ <b>[비구름 공감 대화]:</b> \"마음에 비구름이 살짝 지나갔네. 속상한 일 있었어? 엄마 아빠는 항상 ${childName} 편이야, 든든하게 응원해 줄게.\"`;
    } else if (moodName.includes("화남") || moodName.includes("짜증")) {
      moodPraise = `<br>⚡ <b>[번개 진정 대화]:</b> \"마음속에 화나고 답답한 바람이 불었구나. 괜찮아, 그럴 때도 있어. 심호흡 한번 하고 편안히 쉬자.\"`;
    } else if (moodName.includes("피곤") || moodName.includes("지침")) {
      moodPraise = `<br>🌫️ <b>[안개 위로 대화]:</b> \"오늘 학교에서 열심히 배우고 활동하느라 피곤했지? 정말 고생 많았어, 오늘은 푹 쉬자!\"`;
    } else if (moodName.includes("평온") || moodName.includes("보통")) {
      moodPraise = `<br>🌱 <b>[새싹 안정 대화]:</b> \"차분하고 평온하게 하루를 잘 보냈네! 오늘 하루도 무탈하게 잘 자라줘서 고마워.\"`;
    }

    let milestonePraise = "";
    if (coins >= 20) {
      milestonePraise = `
        <div style="margin-top: 8px; padding: 6px 10px; background: #fef9c3; border-radius: 8px; border: 1px solid #fde047; font-weight: bold; color: #854d0e;">
          🎊 <b>[20칸 저금통 완주 특급 알림]:</b> 마이룸에 <b>[🏆 황금 돼지 트로피]</b>가 수여되었습니다! 이번 주말 <b>[가족 소원권]</b>을 무엇으로 함께 즐길지 ${childName}와 신나게 대화해 보세요!
        </div>
      `;
    }

    if (praiseScriptEl) {
      praiseScriptEl.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <div>${habitPraise}</div>
          ${workoutPraise ? `<div>${workoutPraise}</div>` : ""}
          ${moodPraise ? `<div>${moodPraise}</div>` : ""}
          ${milestonePraise}
        </div>
      `;
    }
  } else {
    // 오늘 미체크인 상태
    if (badgeEl) {
      badgeEl.textContent = "오늘 미완료 ⏳";
      badgeEl.style.background = "#fef3c7";
      badgeEl.style.color = "#b45309";
    }
    if (habitValEl) habitValEl.textContent = "미실천";
    if (workoutValEl) workoutValEl.textContent = "미실천";
    if (moodValEl) moodValEl.textContent = "미실천";

    if (praiseScriptEl) {
      const roomLink = isMinsu ? "[🌱 데일리 루틴 & 저금통]" : "[🌱 슬기로운 하루 탐험관]";
      const curIcon = isMinsu ? "다이아 💎" : "젤리 🍬";
      if (isAdmin) {
        praiseScriptEl.innerHTML = `
          <div style="color: #64748b; font-size: 0.88rem;">
            <span>${childName}가 아직 오늘 하루 체크인을 하지 않았어요.</span><br>
            <span style="color: #d97706; font-weight: bold; margin-top: 4px; display: inline-block;">
              💬 다정한 말 건네기 팁: "${childName}야, 오늘 학교 잘 다녀왔어? 오늘 실천한 착한 습관 저금통에 넣고 ${curIcon} 챙겨볼까?" 하고 <b>${roomLink}</b> 30초 체크인을 가볍게 권유해 보세요!
            </span>
          </div>
        `;
      } else {
        praiseScriptEl.innerHTML = `
          <div style="color: #64748b; font-size: 0.88rem;">
            <span>오늘 착한 습관과 운동을 실천하고 마음 날씨를 골라보세요!</span><br>
            <span style="color: #2563eb; font-weight: bold; margin-top: 4px; display: inline-block;">
              👉 <b>${roomLink}</b>에서 30초 체크인하고 땡그랑 황금 코인과 ${curIcon}을 받아보자! ✨
            </span>
          </div>
        `;
      }
    }
  }
}

// 🚨 [닥터 코코 안심 알림] 실시간 안전/응급처치 위젯 렌더링
function renderSafetyAlertWidget(studyLogs = [], childName = "민서") {
  const isMinsu = childName === "민수";
  const childKey = isMinsu ? "minsu" : "minseo";
  const prefix = isMinsu ? "ms" : "ds";

  const alertBox = document.getElementById(prefix + "-safety-alert-box");
  const timeBadge = document.getElementById(prefix + "-safety-time-badge");
  const contentEl = document.getElementById(prefix + "-safety-alert-content");
  if (!alertBox || !contentEl) return;

  const todayStr = getTodayDateStr();
  let latestLog = null;

  // 1. 로컬스토리지 최신 기록 확인
  const localSaved = localStorage.getItem("haru_last_safety_consultation_" + childKey);
  if (localSaved) {
    try {
      const parsed = JSON.parse(localSaved);
      if (parsed.date === todayStr) {
        latestLog = parsed;
      }
    } catch(e) {}
  }

  // 2. 노션 학습일지 DB 데이터에서 오늘 발생한 닥터 코코 상담 확인 (원격 폴백)
  if (!latestLog && Array.isArray(studyLogs) && studyLogs.length > 0) {
    const remoteLog = studyLogs.find(log => {
      const child = log.properties["학생"]?.select?.name;
      const date = log.properties["입장"]?.date?.start || log.properties["날짜"]?.date?.start || "";
      const title = log.properties["ID"]?.title?.[0]?.plain_text || log.properties["제목"]?.title?.[0]?.plain_text || "";
      const content = log.properties["오답리포트"]?.rich_text?.[0]?.plain_text || log.properties["학습내용"]?.rich_text?.[0]?.plain_text || "";
      const matchesChild = child === childName;
      const isSafety = title.includes("닥터 코코") || content.includes("닥터 코코") || content.includes("응급상담");
      const matchesDate = (date && date.startsWith(todayStr)) || title.includes(todayStr);
      return matchesChild && isSafety && matchesDate;
    });

    if (remoteLog) {
      const titleText = remoteLog.properties["ID"]?.title?.[0]?.plain_text || remoteLog.properties["제목"]?.title?.[0]?.plain_text || "";
      const contentText = remoteLog.properties["오답리포트"]?.rich_text?.[0]?.plain_text || remoteLog.properties["학습내용"]?.rich_text?.[0]?.plain_text || "";
      const symptomMatch = titleText.match(/\[🚨 닥터 코코 상담\]\s*(.+)/) || contentText.match(/증상:\s*([^\n\r]+)/);
      const sayMatch = contentText.match(/처치안내:\s*([^\n\r]+)/);
      const timeMatch = contentText.match(/시간:\s*([^\n\r]+)/);

      latestLog = {
        title: symptomMatch ? (symptomMatch[1] || symptomMatch[0]).trim() : "응급 상담",
        icon: "🩺",
        time: timeMatch ? timeMatch[1].trim() : "오늘",
        cocoSay: sayMatch ? sayMatch[1].trim() : "단계별 응급처치 안내를 확인했습니다."
      };
    }
  }

  // 3. UI 렌더링
  if (latestLog) {
    alertBox.style.display = "block";
    alertBox.style.borderColor = "#ff4757";
    alertBox.style.background = "linear-gradient(135deg, rgba(255, 71, 87, 0.08), rgba(255, 107, 129, 0.12))";

    if (timeBadge) {
      timeBadge.innerText = `${latestLog.time || '오늘'} 상담 발생 🚨`;
      timeBadge.style.background = "#ffeaa7";
      timeBadge.style.color = "#d63031";
    }

    contentEl.style.borderColor = "#ffccd2";
    contentEl.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
        <span style="font-size:1.4rem;">${latestLog.icon || '🩹'}</span>
        <span style="font-weight:bold; color:#d63031; font-size:0.98rem;">${latestLog.title}</span>
      </div>
      <div style="font-size:0.88rem; color:#4b5563; line-height:1.45; background:#f9fafb; padding:8px 10px; border-radius:10px; margin-bottom:8px; border-left:3px solid #0984e3;">
        <b>닥터 코코 안내:</b> "${latestLog.cocoSay || '깨끗이 소독하고 치료를 완료하세요.'}"
      </div>
      <div style="font-size:0.8rem; color:#15803d; font-weight:bold; display:flex; align-items:center; gap:4px;">
        <span>💡</span> <span><b>부모 안심 코칭:</b> 귀가 후 상처 부위가 덧나지 않았는지 다정하게 한 번 더 살펴봐 주세요.</span>
      </div>
    `;
  } else {
    // 오늘 상담 내역이 없는 경우: 정상 안심 상태
    alertBox.style.display = "block";
    alertBox.style.borderColor = "#86efac";
    alertBox.style.background = "linear-gradient(135deg, rgba(240, 253, 244, 0.6), rgba(220, 252, 231, 0.6))";
    
    if (timeBadge) {
      timeBadge.innerText = "안전 상태 양호 🛡️";
      timeBadge.style.background = "#dcfce7";
      timeBadge.style.color = "#15803d";
    }

    contentEl.style.borderColor = "#bbf7d0";
    contentEl.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px; color:#166534; font-size:0.88rem;">
        <span style="font-size:1.2rem;">🛡️</span>
        <span>오늘 다치거나 응급처치를 상담한 내역이 없이 건강하고 안전하게 하루를 보내고 있어요!</span>
      </div>
    `;
  }
}

// 기동 처리
window.addEventListener('DOMContentLoaded', () => {
  makeBgFloats();
  setupAuthUI();
  loadDashboardData();
});
