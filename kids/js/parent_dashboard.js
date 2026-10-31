// kids/js/parent_dashboard.js - parent_dashboard.js 분리 1/2: 설정·상태·권한·소원권·통계·레이더 차트 (순서대로 로드)
const PROXY_URL = typeof APP_CONFIG !== 'undefined' && APP_CONFIG.WORKER_PROXY_URL ? APP_CONFIG.WORKER_PROXY_URL : "https://minmin-notion.awslike6.workers.dev";
const INVENTORY_DB_ID = typeof APP_CONFIG !== 'undefined' && APP_CONFIG.INVENTORY_DB_ID ? APP_CONFIG.INVENTORY_DB_ID : "374a27115b688042bb61e6a102242e12";
const STUDY_LOG_DB_ID = typeof APP_CONFIG !== 'undefined' && APP_CONFIG.STUDY_LOG_DB_ID ? APP_CONFIG.STUDY_LOG_DB_ID : "37aa27115b688001b2ffe5e6c8f82ab2";
const VOCA_DB_ID = typeof APP_CONFIG !== 'undefined' && APP_CONFIG.VOCA_DB_ID ? APP_CONFIG.VOCA_DB_ID : "375a27115b688038b686d3994ee12919";
const DIARY_DB_ID = typeof APP_CONFIG !== 'undefined' && APP_CONFIG.DIARY_DB_ID ? APP_CONFIG.DIARY_DB_ID : "3dfa27115b688010a85be385f91d64ee";

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
  const userParam = (urlParams.get('user') || '').toLowerCase(); // 'minsu', 'minseo', 'admin', 'parent', 'dad', 'mom'
  const roleParam = (urlParams.get('role') || '').toLowerCase(); // 'parent', 'admin'
  const nameParam = urlParams.get('name') || '';
  const savedName = localStorage.getItem('currentUserName') || '';
  const savedUser = localStorage.getItem('currentUser') || '';
  const savedChild = localStorage.getItem('currentChild') || '';

  const isMom = (
    savedName === '엄마' || 
    userParam === 'mom' || 
    nameParam === 'mom' || 
    nameParam === '엄마'
  );

  const isDad = !isMom && (
    savedName === '아빠' || 
    userParam === 'dad' || 
    nameParam === 'dad' || 
    nameParam === '아빠' ||
    // 만약 엄마가 아닌 상태에서 관리자(admin/parent)로 진입한 경우 기본 아빠 권한 부여
    ((savedUser === 'admin' || savedUser === 'parent' || userParam === 'admin' || userParam === 'parent' || roleParam === 'admin' || roleParam === 'parent') && savedName !== '엄마')
  );

  const isAdmin = (
    isDad || 
    isMom || 
    savedUser === 'admin' || 
    savedUser === 'parent' ||
    userParam === 'admin' || 
    userParam === 'parent' ||
    roleParam === 'parent' ||
    roleParam === 'admin'
  );
  
  let targetChild = null;
  if (!isAdmin) {
    if (userParam === 'minsu' || savedChild === 'minsu' || savedName === '민수' || savedUser === 'son') {
      targetChild = 'minsu';
    } else if (userParam === 'minseo' || savedChild === 'minseo' || savedName === '민서' || savedUser === 'daughter') {
      targetChild = 'minseo';
    }
  }

  return { isAdmin, isDad, isMom, targetChild, userParam, roleParam, savedName };
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
  const { isAdmin, isDad, isMom, targetChild } = getUserAuth();
  
  const msParent = document.getElementById('ms-parent-actions');
  const msChild = document.getElementById('ms-child-actions');
  const dsParent = document.getElementById('ds-parent-actions');
  const dsChild = document.getElementById('ds-child-actions');

  if (isAdmin) {
    if (msParent) msParent.style.display = 'block';
    if (msChild) msChild.style.display = 'none';
    if (dsParent) dsParent.style.display = 'block';
    if (dsChild) dsChild.style.display = 'none';
    if (isMom) {
      document.getElementById('pageTitle').textContent = '민민이네 실시간 대시보드 👩‍👧‍👦 (엄마 모드)';
      document.getElementById('pageSubtitle').textContent = '아이들의 학습 성장과 습관을 따뜻하게 살펴보고 칭찬해 주세요.';
    } else {
      document.getElementById('pageTitle').textContent = '민민이네 실시간 대시보드 👨‍👧‍👦 (아빠 관제)';
      document.getElementById('pageSubtitle').textContent = '아이들의 학습 성장과 스크린타임, 인벤토리를 통합 관리합니다.';
    }
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
    // '입장'은 UTC 시각으로 저장되므로 현지 날짜로 바꿔야 오전 9시 전 학습이 전날로 빠지지 않음 (날짜만 있는 값은 그대로)
    .map(d => (/^\d{4}-\d{2}-\d{2}$/.test(d) ? d : localDateStr(new Date(d))));

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

// 🪙 노션 인벤토리 DB 학습설정(rich_text) JSON에서 저금통 코인 수 안전 추출 (SSOT 단일 원천)
function extractPiggyCoins(settingProp, fallbackChildKey = 'minseo') {
  try {
    let jsonText = '';
    const raw = settingProp?.rich_text || settingProp;
    if (typeof raw === 'string') jsonText = raw;
    else if (Array.isArray(raw)) jsonText = raw.map(t => t.plain_text || t.text?.content || '').join('');
    else if (raw?.rich_text && Array.isArray(raw.rich_text)) jsonText = raw.rich_text.map(t => t.plain_text || t.text?.content || '').join('');
    
    if (jsonText && jsonText.trim()) {
      const parsed = JSON.parse(jsonText);
      if (parsed && parsed.piggyBank && typeof parsed.piggyBank.coins === 'number') {
        return parsed.piggyBank.coins;
      }
      if (parsed && parsed.piggyBank && parsed.piggyBank[fallbackChildKey] && typeof parsed.piggyBank[fallbackChildKey].coins === 'number') {
        return parsed.piggyBank[fallbackChildKey].coins;
      }
    }
  } catch (_) {}
  return null;
}

function buildRadarScores(props, vocaList, childName, studyLogs = [], diaryList = []) {
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

    // 오늘 하루 체크인 여부 (1순위: 노션 STUDY_LOG_DB 실시간 일지 확인, 2순위: 로컬스토리지 폴백)
    let isTodayDone = false;
    let haruLogCount = 0;
    if (Array.isArray(studyLogs)) {
      studyLogs.forEach(log => {
        const child = log.properties["학생"]?.select?.name || log.properties["학생"]?.multi_select?.[0]?.name;
        const subj = log.properties["과목"]?.rich_text?.[0]?.plain_text || log.properties["과목"]?.select?.name || "";
        const title = log.properties["ID"]?.title?.[0]?.plain_text || log.properties["제목"]?.title?.[0]?.plain_text || "";
        const date = log.properties["입장"]?.date?.start || log.properties["날짜"]?.date?.start || "";
        if (child === "민서" && (subj.includes("하루") || subj.includes("루틴") || title.includes("하루") || title.includes("루틴"))) {
          haruLogCount++;
          if ((date && date.startsWith(todayStr)) || title.includes(todayStr)) {
            isTodayDone = true;
          }
        }
      });
    }
    if (!isTodayDone && typeof localStorage !== 'undefined') {
      isTodayDone = localStorage.getItem("haru_checkin_done_" + todayStr + "_minseo") === "true";
    }

    const haruActivity = 60 + (isTodayDone ? 20 : 0) + Math.min(haruLogCount * 5, 20);
    haruScore = Math.max(haruScore, Math.min(haruActivity, 100));

    // 4. 창의·예술 (노션 성장 갤러리 DB 3dfa2711... 기반 실시간 작품 수 카운트)
    let artCount = 0;
    if (Array.isArray(diaryList) && diaryList.length > 0) {
      artCount = diaryList.filter(item => {
        const author = item.properties?.["주인공"]?.select?.name;
        return author === '민서' || author === '공동';
      }).length;
    }
    if (artCount === 0) {
      if (typeof DEFAULT_GALLERY_DATA !== 'undefined' && Array.isArray(DEFAULT_GALLERY_DATA)) {
        artCount = DEFAULT_GALLERY_DATA.filter(item => item.author === '민서' || item.author === '공동').length;
      } else {
        try {
          const localGal = JSON.parse(localStorage.getItem('MY_STUDY_ROOM_GALLERY_DATA') || '[]');
          artCount = localGal.filter(item => item.author === '민서' || item.author === '공동').length;
        } catch (e) {}
      }
    }
    const artScore = Math.min(50 + (artCount * 5), 100);

    // 5. 착한 습관 (데일리 루틴 / 20칸 저금통 코인 - 노션 SSOT 1순위)
    let coins = extractPiggyCoins(props["학습설정"], 'minseo');
    if (coins === null) {
      coins = parseInt(localStorage.getItem("haru_piggy_coins_minseo") || "0");
    }
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

