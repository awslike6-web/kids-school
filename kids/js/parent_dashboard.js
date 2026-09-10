const PROXY_URL = typeof APP_CONFIG !== 'undefined' && APP_CONFIG.WORKER_PROXY_URL ? APP_CONFIG.WORKER_PROXY_URL : "https://minmin-notion.awslike6.workers.dev";
const INVENTORY_DB_ID = typeof APP_CONFIG !== 'undefined' && APP_CONFIG.INVENTORY_DB_ID ? APP_CONFIG.INVENTORY_DB_ID : "374a27115b688042bb61e6a102242e12";
const STUDY_LOG_DB_ID = typeof APP_CONFIG !== 'undefined' && APP_CONFIG.STUDY_LOG_DB_ID ? APP_CONFIG.STUDY_LOG_DB_ID : "37aa27115b688001b2ffe5e6c8f82ab2";
const VOCA_DB_ID = typeof APP_CONFIG !== 'undefined' && APP_CONFIG.VOCA_DB_ID ? APP_CONFIG.VOCA_DB_ID : "375a27115b688038b686d3994ee12919";

const SUBJECTS_5 = ['국어', '수학', '영어', '과학', '사회'];

// 로컬 동시성 통제용 임시 상태 저장소
const memoryState = {
  "민수": { pageId: null, ticketCount: 0 },
  "민서": { pageId: null, ticketCount: 0 }
};

let radarCharts = {
  minsu: null,
  minseo: null
};

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

function buildRadarScores(props, vocaList, childName) {
  const korLevel = props["국어 레벨"]?.number || 1;
  const mathLevel = props["수학 레벨"]?.number || 1;
  const engLevel = props["영어 레벨"]?.number || 1;
  const sciLevel = props["과학 레벨"]?.number || 1;
  const socLevel = props["사회 레벨"]?.number || 1;

  const sciVoca = subjectAchievement(vocaList, childName, '과학');
  const socVoca = subjectAchievement(vocaList, childName, '사회');
  const korVoca = subjectAchievement(vocaList, childName, '국어');
  const mathVoca = subjectAchievement(vocaList, childName, '수학');
  const engVoca = subjectAchievement(vocaList, childName, '영어');

  // 레벨 점수와 VOCA 달성률의 조화 평균/가중 계산
  return [
    korVoca !== null ? Math.round((levelToScore(korLevel) + korVoca) / 2) : levelToScore(korLevel),
    mathVoca !== null ? Math.round((levelToScore(mathLevel) + mathVoca) / 2) : levelToScore(mathLevel),
    engVoca !== null ? Math.round((levelToScore(engLevel) + engVoca) / 2) : levelToScore(engLevel),
    sciVoca !== null ? Math.round((levelToScore(sciLevel) + sciVoca) / 2) : (sciLevel > 1 ? levelToScore(sciLevel) : (engVoca ?? 60)),
    socVoca !== null ? Math.round((levelToScore(socLevel) + socVoca) / 2) : (socLevel > 1 ? levelToScore(socLevel) : (korVoca ?? 60)),
  ];
}

function buildTrafficLights(vocaList, childName) {
  const now = Date.now();
  const items = vocaList
    .filter(v => v.targets.length === 0 || v.targets.includes(childName))
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

function renderRadarChart(canvasId, label, scores, isPink) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

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
      labels: SUBJECTS_5,
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

    if (invData.results && invData.results.length > 0) {
      invData.results.forEach(page => {
        const props = page.properties;
        const name = props["이름"]?.title[0]?.plain_text;
        
        if (name === "민수" || name === "민서") {
          const prefix = name === "민수" ? "ms" : "ds";
          const isMinseo = name === "민서";
          
          // 로컬 상태 보존
          memoryState[name].pageId = page.id;
          memoryState[name].ticketCount = props["소원권 개수"]?.number || 0;

          // 1. 6대 과목 레벨 요소 바인딩
          const mathEl = document.getElementById(prefix + "-math");
          const engEl = document.getElementById(prefix + "-eng");
          const korEl = document.getElementById(prefix + "-kor");
          const korRealEl = document.getElementById(prefix + "-kor-real");
          const sciEl = document.getElementById(prefix + "-sci");
          const socEl = document.getElementById(prefix + "-soc");

          const diaEl = document.getElementById(prefix + "-dia");
          const slimeEl = document.getElementById(prefix + "-slime");
          const ticketEl = document.getElementById(prefix + "-ticket");

          // 레벨 주입
          const mathLv = props["수학 레벨"]?.number || 1;
          const engLv = props["영어 레벨"]?.number || 1;
          const korVocaLv = props["용어 레벨"]?.number || 1;
          const korRealLv = props["국어 레벨"]?.number || 1;
          const sciLv = props["과학 레벨"]?.number || 1;
          const socLv = props["사회 레벨"]?.number || 1;

          mathEl.textContent = "Lv." + mathLv; mathEl.classList.remove("loading-shimmer");
          engEl.textContent = "Lv." + engLv; engEl.classList.remove("loading-shimmer");
          korEl.textContent = "Lv." + korVocaLv; korEl.classList.remove("loading-shimmer");
          korRealEl.textContent = "Lv." + korRealLv; korRealEl.classList.remove("loading-shimmer");
          sciEl.textContent = "Lv." + sciLv; sciEl.classList.remove("loading-shimmer");
          socEl.textContent = "Lv." + socLv; socEl.classList.remove("loading-shimmer");

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

          // 5. 5대 과목 레이더 차트 렌더링
          const radarScores = buildRadarScores(props, vocaList, name);
          renderRadarChart(prefix + "-radar-chart", name + " 과목 밸런스", radarScores, isMinseo);

          // 6. 스크린타임 스마트 정산기 위젯 렌더링
          renderScreenTimeWidget(name);

          // 7. [민서 전용] 슬기로운 하루 습관 & 부모 칭찬 코칭 카드 렌더링
          if (isMinseo) {
            renderHaruParentCoaching(studyLogs);
          }
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
  } finally {
    // 트래커 데이터 로컬 렌더링 보장
    renderScreenTimeWidget("민수");
    renderScreenTimeWidget("민서");
    renderHaruParentCoaching();
  }
}

// 📱 스크린타임 스마트 정산기 UI 바인딩
function renderScreenTimeWidget(childName) {
  if (typeof window.ScreenTimeTracker === 'undefined') return;

  const prefix = childName === "민수" ? "ms" : "ds";
  const isMinseo = childName === "민서";
  const summary = window.ScreenTimeTracker.getScreenTimeSummary(childName);

  const studyTimeEl = document.getElementById(prefix + "-st-study-time");
  const roundedNoteEl = document.getElementById(prefix + "-st-rounded-note");
  const rewardQuestEl = document.getElementById(prefix + "-st-reward-quest");
  const rewardTicketNoteEl = document.getElementById(prefix + "-st-reward-ticket-note");
  const totalTimeEl = document.getElementById(prefix + "-st-total-time");
  const ticketSplitEl = document.getElementById(prefix + "-st-ticket-split");
  const badgeEl = document.getElementById(prefix + "-st-status-badge");
  const approveBtn = document.getElementById(prefix + "-st-approve-btn");

  if (studyTimeEl) studyTimeEl.textContent = summary.rawStudyMinutes + "분";
  if (roundedNoteEl) roundedNoteEl.textContent = `➔ 10분 올림: ${summary.studyMinutes}분`;
  if (rewardQuestEl) rewardQuestEl.textContent = `${summary.todayRewardEarned} / 50개`;
  
  if (rewardTicketNoteEl) {
    if (summary.isBonusTicketEarned || summary.todayRewardEarned >= 50) {
      rewardTicketNoteEl.textContent = "🎉 30분권 획득!";
      rewardTicketNoteEl.style.color = "#16a34a";
    } else {
      rewardTicketNoteEl.textContent = `${50 - summary.todayRewardEarned}개 더 필요`;
      rewardTicketNoteEl.style.color = "#b45309";
    }
  }

  if (totalTimeEl) {
    const hours = Math.floor(summary.totalTimeGrantMinutes / 60);
    const mins = summary.totalTimeGrantMinutes % 60;
    const hourStr = hours > 0 ? `${hours}시간 ${mins}분` : `${mins}분`;
    totalTimeEl.textContent = `${summary.totalTimeGrantMinutes}분 (${hourStr})`;
  }

  if (ticketSplitEl) {
    if (summary.tickets && summary.tickets.length > 0) {
      const parts = summary.tickets.map(t => `${t.label}(${t.minutes}분)`);
      ticketSplitEl.textContent = "발급: " + parts.join(" + ");
    } else {
      ticketSplitEl.textContent = "발급 티켓: 없음";
    }
  }

  if (summary.isParentApproved) {
    if (badgeEl) {
      badgeEl.textContent = "승인 완료 💖";
      badgeEl.style.background = "#dcfce7";
      badgeEl.style.color = "#15803d";
    }
    if (approveBtn) {
      approveBtn.textContent = "↩️ 연장 승인 취소하기";
      approveBtn.style.background = "#64748b";
    }
  } else {
    if (badgeEl) {
      badgeEl.textContent = summary.totalTimeGrantMinutes > 0 ? "승인 대기 ⏳" : "대기 중";
      badgeEl.style.background = summary.totalTimeGrantMinutes > 0 ? "#fef3c7" : "#e0f2fe";
      badgeEl.style.color = summary.totalTimeGrantMinutes > 0 ? "#b45309" : "#0369a1";
    }
    if (approveBtn) {
      approveBtn.textContent = "✅ 패밀리링크 연장 완료 승인";
      approveBtn.style.background = isMinseo
        ? "linear-gradient(135deg, #ec4899, #db2777)"
        : "linear-gradient(135deg, #10b981, #059669)";
    }
  }
}

// 📱 부모 승인 토글 핸들러 전역 노출
window.toggleParentScreenTimeApproval = function(childName) {
  if (typeof window.ScreenTimeTracker === 'undefined') {
    alert("스크린타임 트래커 모듈이 준비되지 않았습니다.");
    return;
  }
  const newState = window.ScreenTimeTracker.toggleParentApproval(childName);
  renderScreenTimeWidget(childName);
  
  if (newState) {
    alert(`💖 [${childName}] 패밀리링크 연장 승인이 완료되었습니다!\n아이의 화면에도 영수증 승인 완료 도장이 쾅 찍힙니다.`);
  } else {
    alert(`↩️ [${childName}] 패밀리링크 연장 승인이 취소되었습니다.`);
  }
};

// 🌱 [통합교과 하루] 민서의 생활 습관 & 부모 칭찬 코칭 카드 렌더링
function renderHaruParentCoaching(studyLogs = []) {
  const boxEl = document.getElementById("ds-haru-coaching-box");
  if (!boxEl) return;

  const todayStr = new Date().toISOString().slice(0, 10);
  const isDoneLocal = localStorage.getItem("haru_checkin_done_" + todayStr + "_minseo") === "true";
  let coins = parseInt(localStorage.getItem("haru_piggy_coins_minseo") || "0");
  let habitName = localStorage.getItem("haru_today_habit_minseo") || "";
  let workoutName = localStorage.getItem("haru_today_workout_minseo") || "";
  let moodName = localStorage.getItem("haru_today_mood_minseo") || "";
  let isDone = isDoneLocal;

  // 노션 학습일지 DB 데이터가 전달된 경우 원격 부모 디바이스 폴백 지원
  if (Array.isArray(studyLogs) && studyLogs.length > 0) {
    const todayHaruLog = studyLogs.find(log => {
      const child = log.properties["학생"]?.select?.name;
      const subj = log.properties["과목"]?.select?.name;
      const date = log.properties["날짜"]?.date?.start;
      const title = log.properties["제목"]?.title?.[0]?.plain_text || "";
      return child === "민서" && (subj === "하루" || title.includes("하루 체크인")) && (date === todayStr || title.includes(todayStr));
    });

    if (todayHaruLog) {
      isDone = true;
      const content = todayHaruLog.properties["학습내용"]?.rich_text?.[0]?.plain_text || "";
      const habitMatch = content.match(/착한습관:\s*([^\n\r]+)/);
      const workoutMatch = content.match(/튼튼운동:\s*([^\n\r]+)/);
      const moodMatch = content.match(/마음날씨:\s*([^\(\[\n\r]+)/);

      if (habitMatch && habitMatch[1] && !habitName) habitName = habitMatch[1].trim();
      if (workoutMatch && workoutMatch[1] && !workoutName) workoutName = workoutMatch[1].trim();
      if (moodMatch && moodMatch[1] && !moodName) moodName = moodMatch[1].trim();
    }
  }

  // 엘리먼트 참조
  const badgeEl = document.getElementById("ds-haru-today-badge");
  const habitValEl = document.getElementById("coach-habit-val");
  const workoutValEl = document.getElementById("coach-workout-val");
  const moodValEl = document.getElementById("coach-mood-val");
  const piggyTextEl = document.getElementById("coach-piggy-progress-text");
  const piggyBarEl = document.getElementById("coach-piggy-progress-bar");
  const praiseScriptEl = document.getElementById("coach-praise-script");

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

    let workoutPraise = workoutName ? `<br>💪 <b>[튼튼 운동]:</b> 오늘 <b>[${workoutName}]</b>까지 씩씩하게 실천하여 체력도 쑥쑥 자랐어요!` : "";

    let moodPraise = "";
    if (moodName.includes("기쁨") || moodName.includes("행복")) {
      moodPraise = "<br>☀️ <b>[햇살 마음 대화]:</b> \"오늘 민서 마음이 햇살처럼 환해서 기뻐! 저녁에 오늘 어떤 일이 제일 즐거웠는지 엄마·아빠한테 들려줄래?\"";
    } else if (moodName.includes("즐거움") || moodName.includes("신남")) {
      moodPraise = "<br>🌈 <b>[무지개 마음 대화]:</b> \"오늘 신나는 일이 가득했구나! 어떤 재미난 모험이 있었는지 함께 들려줘!\"";
    } else if (moodName.includes("슬픔") || moodName.includes("속상")) {
      moodPraise = "<br>🌧️ <b>[비구름 공감 대화]:</b> \"마음에 비구름이 살짝 지나갔네. 속상한 일 있었어? 엄마 아빠는 항상 민서 편이야, 꼭 안아줄게.\"";
    } else if (moodName.includes("화남") || moodName.includes("짜증")) {
      moodPraise = "<br>⚡ <b>[번개 진정 대화]:</b> \"마음속에 화나고 답답한 바람이 불었구나. 괜찮아, 그럴 때도 있어. 심호흡 한번 하고 푹 쉬자.\"";
    } else if (moodName.includes("피곤") || moodName.includes("지침")) {
      moodPraise = "<br>🌫️ <b>[안개 위로 대화]:</b> \"오늘 학교에서 열심히 배우고 활동하느라 피곤했지? 정말 고생 많았어, 오늘은 푹 쉬자!\"";
    } else if (moodName.includes("평온") || moodName.includes("보통")) {
      moodPraise = "<br>🌱 <b>[새싹 안정 대화]:</b> \"차분하고 평온하게 하루를 잘 보냈네! 오늘 하루도 무탈하게 예쁘게 자라줘서 고마워.\"";
    }

    let milestonePraise = "";
    if (coins >= 20) {
      milestonePraise = `
        <div style="margin-top: 8px; padding: 6px 10px; background: #fef9c3; border-radius: 8px; border: 1px solid #fde047; font-weight: bold; color: #854d0e;">
          🎊 <b>[20칸 저금통 완주 특급 알림]:</b> 마이룸에 <b>[🏆 황금 돼지 트로피]</b>가 수여되었습니다! 이번 주말 <b>[가족 소원권]</b>을 무엇으로 함께 즐길지 민서와 신나게 대화해 보세요!
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
      if (isAdmin) {
        praiseScriptEl.innerHTML = `
          <div style="color: #64748b; font-size: 0.88rem;">
            <span>민서가 아직 오늘 하루 체크인을 하지 않았어요.</span><br>
            <span style="color: #d97706; font-weight: bold; margin-top: 4px; display: inline-block;">
              💬 다정한 말 건네기 팁: "민서야, 오늘 학교에서 재미있는 일 있었어?" 하고 물어보며 <b>[🌱 슬기로운 하루 탐험관]</b>에 함께 들어가 30초 체크인을 시작해 보세요!
            </span>
          </div>
        `;
      } else {
        praiseScriptEl.innerHTML = `
          <div style="color: #64748b; font-size: 0.88rem;">
            <span>오늘 착한 습관과 운동을 실천하고 마음 날씨를 골라보세요!</span><br>
            <span style="color: #2563eb; font-weight: bold; margin-top: 4px; display: inline-block;">
              👉 <b>[🌱 하루 탐험관]</b>에서 30초 체크인하고 땡그랑 황금 코인과 참여 젤리를 받아보자! ✨
            </span>
          </div>
        `;
      }
    }
  }
}

// 기동 처리
window.addEventListener('DOMContentLoaded', () => {
  makeBgFloats();
  setupAuthUI();
  loadDashboardData();
});
