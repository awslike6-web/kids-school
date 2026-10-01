/**
 * ==============================================================================
 * 🏰 [Lobby Controller] 대형 로비 통합 컨트롤러 모듈 (lobby_controller.js)
 * ==============================================================================
 * 역할 및 구성:
 * 1. USER_CONFIGS: 민수(아케이드) & 민서(동화 아지트) 월드 맵 및 테마 데이터 단일 원천.
 * 2. 동적 코어 결합: loadCoreScripts를 통한 공통 엔진(core, notion-helper, fairy 등) 비동기 마운트.
 * 3. 사용자 및 권한 판별: 부모 관리자 시뮬레이터 모드(노션 오염 방지막) vs 자녀 실전 모드 분기.
 * 4. 상황별 인터랙티브 배너: KST 시간대 및 요일 기반 요정 코코 반응형 말풍선 & TTS 안내.
 * 5. 2대 메인 탭 렌더러: 공부방 월드 vs 나만의 아지트 탭 스위칭 & 3학년 미래 교과 보관소.
 * 6. 클라우드 동기화: 인벤토리(SWR 0.01초 캐시), 스크린타임, 1일 단어/독해 프리패칭, 딥링크.
 * ==============================================================================
 */

// =========================================================
// 💎 1. 데이터 구조 정의 (공부방 월드 vs 나만의 아지트 탭 분리)
// =========================================================
const USER_CONFIGS = {
  minsu: {
    name: '민수', key: 'son', themeClass: 'theme--arcade',
    bgSymbols: ['🛸', '🚀', '👾', '🕹️', '⚡', '+', '✖️', '=', '🤖', '🔋'],
    studyWorlds: [
      {
        title: '🧮 수학 월드',
        color: '#f59e0b',
        rooms: [
          { name: '수학 멀티버스 대모험', href: 'kids/subjects/math/math.html', desc: '단원 동화 도서관부터 시각적 개념 탐험관, 세로셈 무한 실전 연산 트레이닝까지!' }
        ]
      },
      {
        title: '✍️ 국어 월드',
        color: '#ec4899',
        rooms: [
          { name: '국어 문장 구성방', href: 'kids/subjects/korean/korean.html', desc: '단원 동화부터 받아쓰기, 어휘, 정밀독해, AI토론까지!' }
        ]
      },
      {
        title: '🔤 영어 던전',
        color: '#0284c7',
        rooms: [
          { name: '영단어 기억방', href: 'kids/subjects/english/english.html', desc: '스토리북 도서관부터 사이버 알파벳 던전 탐험! 단어 매핑 퀴즈 및 타자' }
        ]
      },
      {
        title: '🧪 과학 실험실',
        color: '#10b981',
        rooms: [
          { name: '과학 개념 탐구방', href: 'kids/subjects/science/science.html', desc: '자연과 우주 생태계의 비밀 법칙을 파헤치는 코어 실험실' }
        ]
      },
      {
        title: '🏛️ 사회 연대기',
        color: '#d97706',
        rooms: [
          { name: '사회 역사 탐험방', href: 'kids/subjects/society/society.html', desc: '지리 공간과 옛날 인물 이야기 역사를 추적하는 타임머신' }
        ]
      },
      {
        title: '🦖 탐구 사전관',
        color: '#8b5cf6',
        rooms: [
          { name: '종합 용어사전방', href: 'kids/common_space/voca.html', desc: '모든 교과서 낱말 총집합! 마스터 데이터베이스 지식 열람' }
        ]
      }
    ],
    hideoutWorlds: [
      {
        title: '🏠 나만의 비밀 아지트',
        color: '#0ea5e9',
        rooms: [
          { name: '🌱 30초 데일리 루틴 & 저금통', href: 'kids/subjects/haru/haru.html?user=minsu', desc: '⚡ [매일 30초 체크인] 착한 습관 저금통 + 건강 운동 도장 + 마음 날씨 & 20칸 트로피 도전!' },
          { name: '👦 마이룸 & 상점', href: 'kids/common_space/my-room.html', desc: '다이아몬드로 멋진 가구를 사고 나만의 비밀 기지를 꾸며보자!' },
          { name: '🖼️ 꿈나무 작품 갤러리', href: 'kids/common_space/gallery.html', desc: '학교에서 만들고 그려온 멋진 미술·공예 작품을 전시하고 자랑해보자!' },
          { name: '📊 나의 성장 대시보드', href: 'parent_dashboard.html?user=minsu', desc: '5대 교과 학습 밸런스 방사형 차트와 실시간 퀘스트 달성도 점검!' },
          { name: '📅 상세 시간표 & 수업 안내', href: 'timetable.html', desc: '오늘·내일 학교 수업과 준비물, 행정 안내를 한눈에 확인!' }
        ]
      },
      {
        title: '🎡 창의 & 게이밍 놀이터',
        color: '#f97316',
        rooms: [
          { name: '⚔️ 브롤 DPS & 밸런스 연구소', href: 'kids/playground/minsu/brawl_dps.html', desc: '5학년 수학 연계! 브롤러 스탯 분석 & 1:1 대전 시뮬레이션' },
          { name: '🎁 스타 드롭 & 트로피 보관소', href: 'kids/playground/minsu/starr_drop.html', desc: '톡톡 탭해서 전설 스타 드롭 개봉 및 보상 획득!' }
        ]
      }
    ]
  },
  minseo: {
    name: '민서', key: 'daughter', themeClass: 'theme--hideout',
    bgSymbols: ['🎈', '🧸', '🏰', '✨', '🍭', '🌸', '🧚', '🦄', '🎀', '🍓'],
    studyWorlds: [
      {
        title: '🧮 수학 월드',
        color: '#f59e0b',
        rooms: [
          { name: '수학 놀이터 대모험', href: 'kids/subjects/math/math.html', desc: '단원 동화 도서관부터 아기자기 개념 탐험관, 세로셈 실전 연산 트레이닝까지!' }
        ]
      },
      {
        title: '✍️ 국어 월드',
        color: '#ec4899',
        rooms: [
          { name: '국어 문장 구성방', href: 'kids/subjects/korean/korean.html', desc: '1-2 1단원 감정 스토리북과 비밀 요정들과 나누는 상상력 가득 논리 대화방' }
        ]
      },
      {
        title: '🌱 슬기로운 하루 (통합)',
        color: '#2ed573',
        rooms: [
          { name: '하루 탐험관 (1학년 2학기)', href: 'kids/subjects/haru/haru.html', desc: '⚡ [매일 30초 체크인] 착한 습관 저금통 + 튼튼 운동 도장 + 마음 날씨 원스톱 기록 & 명화·추억 갤러리!' }
        ]
      },
      {
        title: '🔤 영어 던전',
        color: '#0284c7',
        rooms: [
          { name: '영단어 기억방', href: 'kids/subjects/english/english.html', desc: '반짝이는 요정 카드와 함께 타이핑하며 배우는 마법 단어장' }
        ]
      },
      {
        title: '🦖 탐구 사전관',
        color: '#8b5cf6',
        rooms: [
          { name: '종합 용어사전방', href: 'kids/common_space/voca.html', desc: '초등 새싹 받아쓰기 마스터 교육과 아기자기 개념 백과사전' }
        ]
      }
    ],
    // 🔮 3학년 이후 개방되는 미래 교과 보관소 (평소에는 가려짐)
    futureWorlds: [
      {
        title: '🧪 과학 실험실',
        color: '#10b981',
        rooms: [
          { name: '과학 개념 탐구방', href: 'kids/subjects/science/science.html', desc: '동물, 곤충, 별자리 요정들의 비밀을 알아보는 신기한 과학방' }
        ]
      },
      {
        title: '🏛️ 사회 연대기',
        color: '#d97706',
        rooms: [
          { name: '사회 역사 탐험방', href: 'kids/subjects/society/society.html', desc: '우리 동네 지도와 옛날 위인 동화 속으로 떠나는 신나는 모험' }
        ]
      }
    ],
    hideoutWorlds: [
      {
        title: '🏠 나만의 비밀 아지트',
        color: '#ec4899',
        rooms: [
          { name: '👧 마이룸 & 상점', href: 'kids/common_space/my-room.html', desc: '하리보 젤리로 예쁜 가구를 사고 나만의 핑꾸 하우스를 꾸며보자!' },
          { name: '🖼️ 꿈나무 작품 갤러리', href: 'kids/common_space/gallery.html', desc: '예쁘게 그린 그림과 정성껏 만든 공예품을 전시하는 아틀리에!' },
          { name: '📊 나의 성장 대시보드', href: 'parent_dashboard.html?user=minseo', desc: '5대 교과 학습 밸런스 방사형 차트와 실시간 퀘스트 달성도 점검!' },
          { name: '📅 상세 시간표 & 수업 안내', href: 'timetable.html', desc: '오늘·내일 학교 수업과 준비물, 행정 안내를 한눈에 확인!' }
        ]
      },
      {
        title: '🎡 창의 & 게이밍 놀이터',
        color: '#a855f7',
        rooms: [
          { name: '🎨 매직 컬러링 스튜디오', href: 'kids/playground/minseo/coloring.html', desc: '사진을 넣으면 밑그림으로 변신! 웹 색칠 & A4 도안 출력' },
          { name: '📐 인터랙티브 종이접기', href: 'kids/playground/minseo/origami.html', desc: '비행기, 개구리, 동서남북 3D 단계별 접기 & 전용 도안 인쇄' },
          { name: '🎁 스타 드롭 & 트로피 보관소', href: 'kids/playground/minsu/starr_drop.html', desc: '톡톡 탭해서 전설 스타 드롭 개봉 및 보상 획득!' }
        ]
      }
    ]
  }
};

// 기존 worlds 참조 코드와의 완벽한 하위 호환성 유지
Object.values(USER_CONFIGS).forEach(cfg => {
  cfg.worlds = [...(cfg.studyWorlds || []), ...(cfg.futureWorlds || []), ...(cfg.hideoutWorlds || [])];
});
window.USER_CONFIGS = USER_CONFIGS;

// =========================================================
// 🚀 2. 대형 로비 통합 엔진 구동 및 렌더러
// =========================================================
(function() {
  const lobbyCores = [
    "core.js",
    "notion-helper.js",
    "fairy-config.js",
    "fairy-engine.js",
    "fairy-settings-catalog.js",
    "fairy-settings-engine.js",
    "fairy-chatbot.js",
    "daily-diary.js",
    "quiz-flow-controller.js",
    "timetable-boost.js",
    "screentime-tracker.js"
  ];

  loadCoreScripts("kids/core/", lobbyCores, () => {
    console.log("🏰 대형 로비 메인 하이브리드 엔진 결합 완료!");

    // 유저 확인 파서
    const urlParams = new URLSearchParams(window.location.search);
    let userKey = urlParams.get('user');
    
    // 💡 [추가] 로컬 스토리지에 아빠/엄마 이름이 남아있는지 실시간 확인
    const savedName = localStorage.getItem('currentUserName');
    const isAdmin = (savedName === '아빠' || savedName === '엄마');

    if (!userKey || !USER_CONFIGS[userKey]) {
      const savedChild = localStorage.getItem('currentChild');
      const savedUser = localStorage.getItem('currentUser');
      if (savedChild && USER_CONFIGS[savedChild]) {
        userKey = savedChild;
      } else if (savedUser === 'daughter') {
        userKey = 'minseo';
      } else if (savedUser === 'son') {
        userKey = 'minsu';
      } else if (savedName === '민서') {
        userKey = 'minseo';
      } else if (savedName === '민수') {
        userKey = 'minsu';
      } else {
        userKey = 'minsu';
      }
    }
    const currentConfig = USER_CONFIGS[userKey];

    // 💡 활성 자녀 상태 영구 보존 (관리자/아이 공통: 어떤 방을 다녀와도 테마 유지)
    localStorage.setItem('currentChild', userKey);
    localStorage.setItem('currentUser', currentConfig.key);

    // 일기장 버튼 상태 실시간 반영
    if (typeof updateLobbyDiaryButton === 'function') {
      updateLobbyDiaryButton(currentConfig.name);
    }

    // 테마 실시간 동적 치환 
    document.body.className = currentConfig.themeClass;
    
    // APP_CONFIG 기반 동적 자녀 명칭 연동
    const finalRealName = currentConfig.key === 'son' ? APP_CONFIG.CHILDREN.first.name : APP_CONFIG.CHILDREN.second.name;
    
    // 💡 [수정] 아빠, 엄마가 입장했을 때 UI 타이틀 및 웰컴 문구 완전 고도화
    if (isAdmin) {
      document.getElementById('mainLobbyTitle').innerHTML = `<span class="accent2">🛠️ 관리자</span><br><span class="accent">시뮬레이터</span>`;
      document.getElementById('welcomeMessage').innerHTML = `🚀 <b>[${savedName} 모드]</b> 데이터 오염 방지막 가동 중! (${finalRealName} 환경 검수)`;
      document.getElementById('lobbySubtitle').textContent = "🔧 디자인 확인 및 구동 테스트를 진행할 월드를 골라주세요.";
      document.getElementById('timetableLink').textContent = '📺 전체 시간표 모니터';
      document.getElementById('timetableLink').href = 'timetable.html?view=monitor';

      // 🛠️ 관리자용 자녀 공부방 퀵 스위처 렌더링
      const switcher = document.getElementById('adminChildSwitcher');
      if (switcher) {
        switcher.style.display = 'flex';
        switcher.innerHTML = `
          <button type="button" class="admin-child-btn minsu ${userKey === 'minsu' ? 'active' : ''}" onclick="switchAdminLobbyChild('minsu')">👦 민수 공부방 검수</button>
          <button type="button" class="admin-child-btn minseo ${userKey === 'minseo' ? 'active' : ''}" onclick="switchAdminLobbyChild('minseo')">👧 민서 공부방 검수</button>
        `;
      }

      const quickToolbar = document.getElementById('quickToolbar');
      if (quickToolbar) quickToolbar.style.display = 'flex';
      
      const dashboardLink = document.getElementById('dashboardLink');
      if (dashboardLink) {
        dashboardLink.textContent = '📊 실시간 통합 성장 대시보드';
        dashboardLink.href = 'parent_dashboard.html?role=parent';
      }

      const imgChangerLink = document.getElementById('imageChangerLink');
      if (imgChangerLink) {
        imgChangerLink.style.display = 'inline-flex';
      }

      if (savedName === '아빠' && typeof APP_CONFIG !== 'undefined' && APP_CONFIG.MASTER_TOWER_URL) {
        const towerLink = document.getElementById('towerLink');
        if (towerLink) {
          towerLink.href = APP_CONFIG.MASTER_TOWER_URL;
          towerLink.style.display = 'flex';
        }
      }
    } else {
      const switcher = document.getElementById('adminChildSwitcher');
      if (switcher) switcher.style.display = 'none';

      const quickToolbar = document.getElementById('quickToolbar');
      if (quickToolbar) quickToolbar.style.display = 'none';

      const finalWelcomeText = currentConfig.key === 'son' 
        ? `🎮 아케이드 가동! 미션 스테이지를 클리어해라, ${finalRealName}!`
        : `🎠 반짝반짝 동화 속 비밀 아지트에 온 걸 환영해, ${finalRealName}!`;
      document.getElementById('welcomeMessage').innerHTML = finalWelcomeText;
      
      // 아이들일 때만 로컬스토리지 동기화 수행
      localStorage.setItem('currentUser', currentConfig.key); 
      localStorage.setItem('currentUserName', finalRealName);
      document.getElementById('timetableLink').textContent = `📅 ${finalRealName}의 시간표 보기`;
    }

    // 👾 5분 퀘스트 퀵 칩 및 배너 링크 & 테마 동적 업데이트
    const labBtn = document.getElementById('lobbyMonsterLabBtn');
    const questBanner = document.getElementById('questQuickBanner');
    if (labBtn) {
      labBtn.href = `monster_lab.html?user=${userKey}`;
      if (userKey === 'minseo') {
        labBtn.innerHTML = `🧸 5분 퀘스트`;
        labBtn.title = '말랑 젤리 토끼와 5분 일일 퀘스트 출발!';
      } else {
        labBtn.innerHTML = `👾 5분 퀘스트`;
        labBtn.title = '3D 몬스터 바이트와 5분 일일 퀘스트 출격!';
      }
    }
    if (questBanner) {
      questBanner.href = `monster_lab.html?user=${userKey}`;
      if (userKey === 'minseo') {
        const iconEl = questBanner.querySelector('.quest-quick-icon');
        const titleEl = questBanner.querySelector('.quest-quick-title');
        const descEl = questBanner.querySelector('.quest-quick-desc');
        if (iconEl) iconEl.textContent = '🧸';
        if (titleEl) titleEl.innerHTML = `오늘의 5분 달콤 퀘스트 시작! <span class="quest-quick-tag">💖 사랑 충전</span>`;
        if (descEl) descEl.textContent = '말랑 젤리 토끼와 함께 수학·국어·영어 5문제 풀고 반짝 가루✨ 챙기기!';
      } else {
        const iconEl = questBanner.querySelector('.quest-quick-icon');
        const titleEl = questBanner.querySelector('.quest-quick-title');
        const descEl = questBanner.querySelector('.quest-quick-desc');
        if (iconEl) iconEl.textContent = '👾';
        if (titleEl) titleEl.innerHTML = `오늘의 5분 퀘스트 출격하기! <span class="quest-quick-tag">🔥 불꽃 스트릭</span>`;
        if (descEl) descEl.textContent = '3D 클레이 몬스터와 함께 나눗셈·영어 5문제 풀고 보상 다이아💎 챙기기!';
      }
    }

    // 🧚 상황별 요정 코코 반응형 인터랙티브 말풍선 배너 갱신 엔진
    let currentFairySpeechText = "";
    let currentFairyTargetUrl = null;

    function updateLobbyFairyBubble(childName, childKey, isParentAdmin) {
      const bubbleEl = document.getElementById("lobbySpeechBubble");
      const badgeEl = document.getElementById("bubbleBadge");
      const textEl = document.getElementById("bubbleText");
      const avatarEl = document.getElementById("bubbleAvatar");
      if (!bubbleEl || !badgeEl || !textEl) return;

      const now = new Date();
      const kst = new Date(now.getTime() + (9 * 60 + now.getTimezoneOffset()) * 60000);
      const hour = kst.getHours();
      const dayIdx = kst.getDay(); // 0: 일, 1: 월, 2: 화, 3: 수, 4: 목, 5: 금, 6: 토
      const todayStr = `${kst.getFullYear()}-${String(kst.getMonth() + 1).padStart(2, '0')}-${String(kst.getDate()).padStart(2, '0')}`;

      let badge = "☀️ 활기찬 하루 시작";
      let textHtml = "반가워요! 오늘의 신나는 공부방 모험을 시작해볼까요?";
      let rawText = "반가워요! 오늘의 신나는 공부방 모험을 시작해볼까요?";
      let targetUrl = null;

      if (isParentAdmin) {
        if (avatarEl) avatarEl.textContent = "👨‍👩‍👧‍👦";
        badge = "🔧 부모 관제 모드 가이드";
        textHtml = `우리 아이들의 시간표 및 하루 습관 체크인 현황이 실시간 동기화 중입니다. <b>[실시간 통합 성장 대시보드]</b>에서 코칭 카드를 확인해 보세요.`;
        rawText = "우리 아이들의 시간표 및 하루 습관 체크인 현황이 실시간 동기화 중입니다. 성장 대시보드에서 코칭 카드를 확인해 보세요.";
        targetUrl = "parent_dashboard.html?role=parent";
      } else if (childName === "민서" || childKey === "daughter") {
        if (avatarEl) avatarEl.textContent = "🧚";
        const isHaruDone = localStorage.getItem("haru_checkin_done_" + todayStr + "_minseo") === "true";
        const hasHaruToday = (dayIdx === 1 || dayIdx === 3 || dayIdx === 4 || dayIdx === 5); // 월,수,목,금

        if (hour >= 5 && hour < 12) {
          if (!isHaruDone) {
            badge = "☀️ 상쾌한 아침 등교 전";
            textHtml = "민서야 좋은 아침! 등교 전에 <b>[30초 하루 체크인]</b>하고 저금통에 황금 코인을 쏙 넣어볼까? 🐷";
            rawText = "민서야 좋은 아침! 등교 전에 30초 하루 체크인하고 저금통에 황금 코인을 쏙 넣어볼까?";
            targetUrl = "kids/subjects/haru/haru.html";
          } else {
            badge = "☀️ 아침 착한 습관 완료";
            textHtml = "아침부터 착한 습관을 스스로 실천한 민서 최고야! 오늘 학교에서도 반짝반짝 빛나는 하루 보내고 와! 🌸";
            rawText = "아침부터 착한 습관을 스스로 실천한 민서 최고야! 오늘 학교에서도 반짝반짝 빛나는 하루 보내고 와!";
            targetUrl = "kids/subjects/haru/haru.html";
          }
        } else if (hour >= 12 && hour < 18) {
          if (hasHaruToday && !isHaruDone) {
            badge = "🌱 방과 후 [하루] 30초 체크인";
            textHtml = "학교 잘 다녀왔어, 민서야! 오늘 시간표에 배운 <b>[슬기로운 하루]</b> 30초 체크인하고 달콤한 젤리를 챙겨봐! 🍬";
            rawText = "학교 잘 다녀왔어, 민서야! 오늘 시간표에 배운 슬기로운 하루 30초 체크인하고 달콤한 젤리를 챙겨봐!";
            targetUrl = "kids/subjects/haru/haru.html";
          } else if (!isHaruDone) {
            badge = "🍰 방과 후 데일리 체크인";
            textHtml = "학교 다녀오느라 수고했어, 민서야! 오늘 실천한 착한 일과 운동을 <b>[30초 체크인]</b>으로 쏙 기록해볼까? ✨";
            rawText = "학교 다녀오느라 수고했어, 민서야! 오늘 실천한 착한 일과 운동을 30초 체크인으로 쏙 기록해볼까?";
            targetUrl = "kids/subjects/haru/haru.html";
          } else {
            badge = "🌸 체크인 완료 & 도서관 탐험";
            textHtml = "오늘 하루 체크인을 멋지게 완료했네! 이제 재미난 수학·국어 <b>단원 동화 도서관</b>을 신나게 둘러볼까? 📚";
            rawText = "오늘 하루 체크인을 멋지게 완료했네! 이제 재미난 수학 국어 단원 동화 도서관을 신나게 둘러볼까?";
            targetUrl = "kids/subjects/korean/korean.html";
          }
        } else {
          if (!isHaruDone) {
            badge = "🌙 자기 전 30초 체크인";
            textHtml = "오늘 하루도 정말 고생 많았어! 잠들기 전에 <b>[30초 하루 체크인]</b>으로 저금통 코인 채우는 거 잊지 않았지? 🧸";
            rawText = "오늘 하루도 정말 고생 많았어! 잠들기 전에 30초 하루 체크인으로 저금통 코인 채우는 거 잊지 않았지?";
            targetUrl = "kids/subjects/haru/haru.html";
          } else {
            badge = "💖 포근한 저녁 마무리";
            textHtml = "오늘 착한 습관과 운동까지 알차게 해낸 민서! 푹 쉬고 예쁜 꿈꿔, 내일 또 신나게 놀자! 🌙";
            rawText = "오늘 착한 습관과 운동까지 알차게 해낸 민서! 푹 쉬고 예쁜 꿈꿔, 내일 또 신나게 놀자!";
            targetUrl = "kids/subjects/haru/haru.html";
          }
        }
      } else {
        // 민수
        if (avatarEl) avatarEl.textContent = "🚀";
        const isHaruDone = localStorage.getItem("haru_checkin_done_" + todayStr + "_minsu") === "true";
        let timetableInfo = null;
        if (typeof window.TimetableBoost !== 'undefined') {
          timetableInfo = window.TimetableBoost.getTimetableSubjects('민수');
        }
        const todaySubjs = (timetableInfo && timetableInfo.todaySubjects) || [];
        const subjStr = todaySubjs.length > 0 ? todaySubjs.join('·') : '수학·국어';

        if (hour >= 5 && hour < 12) {
          if (!isHaruDone) {
            badge = "⚡ 등교 전 30초 데일리 루틴";
            textHtml = "민수야 좋은 아침! 등교 전에 <b>[30초 데일리 루틴]</b> 체크인하고 저금통 황금 코인 & 다이아 챙겨볼까? 💎";
            rawText = "민수야 좋은 아침! 등교 전에 30초 데일리 루틴 체크인하고 저금통 황금 코인과 다이아 챙겨볼까?";
            targetUrl = "kids/subjects/haru/haru.html?user=minsu";
          } else {
            badge = "⚡ 활기찬 아침 출격";
            textHtml = "에너지 100% 충전 완료! 오늘의 5대 과목 퀘스트를 향해 힘차게 출격해볼까, 민수야! 🚀";
            rawText = "에너지 백 퍼센트 충전 완료! 오늘의 5대 과목 퀘스트를 향해 힘차게 출격해볼까, 민수야!";
            targetUrl = "kids/subjects/math/math.html";
          }
        } else if (hour >= 12 && hour < 18) {
          if (!isHaruDone) {
            badge = "🌱 방과 후 30초 데일리 루틴";
            textHtml = `학교 잘 다녀왔어! 오늘 실천한 착한 습관과 운동을 <b>[30초 루틴 체크인]</b>으로 기록하고 다이아 챙겨봐! 💎`;
            rawText = "학교 잘 다녀왔어! 오늘 실천한 착한 습관과 운동을 30초 루틴 체크인으로 기록하고 다이아 챙겨봐!";
            targetUrl = "kids/subjects/haru/haru.html?user=minsu";
          } else {
            badge = "🔥 오늘 시간표 복습 1.2배 부스트";
            textHtml = `스테이지 복귀 완료! 오늘 학교에서 배운 <b>[${subjStr}]</b>을 복습하면 경험치(EXP) 1.2배 부스트 보너스! 🕹️`;
            rawText = `스테이지 복귀 완료! 오늘 학교에서 배운 ${subjStr}을 복습하면 경험치 1.2배 부스트 보너스를 받아!`;
            targetUrl = todaySubjs.includes('수학') ? 'kids/subjects/math/math.html' : 'kids/subjects/korean/korean.html';
          }
        } else {
          if (!isHaruDone) {
            badge = "🌙 자기 전 30초 데일리 체크인";
            textHtml = "오늘 하루도 수고 많았어! 잠들기 전 <b>[30초 데일리 루틴]</b>으로 저금통 코인 채우고 다이아몬드 받자! 💎";
            rawText = "오늘 하루도 수고 많았어! 잠들기 전 30초 데일리 루틴으로 저금통 코인 채우고 다이아몬드 받자!";
            targetUrl = "kids/subjects/haru/haru.html?user=minsu";
          } else {
            badge = "🌙 오늘 퀘스트 & 폰시간 결산";
            textHtml = "오늘의 스테이지 정리 시간! 오늘 모은 보상 다이아와 <b>[오늘 폰시간 정산]</b> 영수증을 확인해봐! 🔋";
            rawText = "오늘의 스테이지 정리 시간! 오늘 모은 보상 다이아와 오늘 폰시간 정산 영수증을 확인해봐!";
            targetUrl = "#screentime";
          }
        }
      }

      badgeEl.textContent = badge;
      textEl.innerHTML = textHtml;
      currentFairySpeechText = rawText;
      currentFairyTargetUrl = targetUrl;
    }

    window.handleFairyBubbleClick = function() {
      if (currentFairyTargetUrl) {
        if (currentFairyTargetUrl === '#screentime') {
          if (typeof openScreenTimeReceiptModal === 'function') openScreenTimeReceiptModal();
        } else {
          location.href = currentFairyTargetUrl;
        }
      } else if (currentFairySpeechText) {
        speakFairyCocoBubble();
      }
    };

    window.speakBubbleMessage = function(event) {
      if (event) event.stopPropagation();
      speakFairyCocoBubble();
    };

    function speakFairyCocoBubble() {
      if (!currentFairySpeechText) return;
      if (typeof speakFairyTTS === 'function') {
        speakFairyTTS(currentFairySpeechText);
      } else if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(currentFairySpeechText);
        u.lang = 'ko-KR';
        window.speechSynthesis.speak(u);
      }
    }

    // 상황별 요정 말풍선 즉시 최초 갱신
    updateLobbyFairyBubble(finalRealName, currentConfig.key, isAdmin);

    window.switchAdminLobbyChild = function(targetChild) {
      const targetKey = targetChild === 'minseo' ? 'daughter' : 'son';
      localStorage.setItem('currentChild', targetChild);
      localStorage.setItem('currentUser', targetKey);
      location.href = `lobby.html?user=${targetChild}`;
    };

    // 🛠️ 2대 메인 탭 전환 및 월드 그리드 렌더러
    let currentLobbyTab = 'study';
    const initialTabParam = urlParams.get('tab');
    if (initialTabParam === 'hideout' || window.location.hash === '#hideout') {
      currentLobbyTab = 'hideout';
    }

    function createWorldCard(world) {
      const card = document.createElement('div');
      card.className = 'world-card';
      if (world.color) {
        card.style.borderTop = `4px solid ${world.color}`;
      }

      const title = document.createElement('div');
      title.className = 'world-title';
      title.textContent = world.title;
      card.appendChild(title);

      const roomList = document.createElement('div');
      roomList.className = 'sub-room-list';

      world.rooms.forEach(room => {
        let detectedSubj = null;
        if (room.href.includes('math.html')) detectedSubj = '수학';
        else if (room.href.includes('korean.html')) detectedSubj = '국어';
        else if (room.href.includes('english.html')) detectedSubj = '영어';
        else if (room.href.includes('science.html')) detectedSubj = '과학';
        else if (room.href.includes('society.html')) detectedSubj = '사회';

        let boostHtml = '';
        if (detectedSubj && typeof window.TimetableBoost !== 'undefined') {
          const boost = window.TimetableBoost.getSubjectBoostInfo(detectedSubj, finalRealName);
          if (boost && boost.badge) {
            boostHtml = `
              <div class="timetable-boost-chip" style="display:inline-flex; align-items:center; gap:5px; font-size:0.75rem; padding:3px 10px; border-radius:12px; background:${boost.badge.bgGradient}; border:1.5px solid ${boost.badge.borderColor}; color:${boost.badge.color}; font-weight:bold; margin-bottom:6px; box-shadow:0 2px 6px rgba(0,0,0,0.06);">
                <span>${boost.badge.text}</span>
                <span style="font-size:0.72rem; font-weight:normal; opacity:0.92;">${boost.badge.subText}</span>
              </div>
            `;
          }
        }

        const a = document.createElement('a');
        a.href = room.href;
        a.className = 'sub-room-btn';
        a.innerHTML = `
          ${boostHtml}
          <div class="sub-room-name">${room.name}</div>
          <div class="sub-room-desc">${room.desc}</div>
        `;
        roomList.appendChild(a);
      });

      card.appendChild(roomList);
      return card;
    }

    function renderWorldGrid(tab) {
      const grid = document.getElementById('worldGrid');
      if (!grid) return;
      grid.innerHTML = '';

      // 기존 미래 교과 보관소가 DOM에 있으면 먼저 정리
      const existingFutureWrap = document.getElementById('futureWorldsWrap');
      if (existingFutureWrap) existingFutureWrap.remove();

      const worlds = tab === 'hideout' ? currentConfig.hideoutWorlds : currentConfig.studyWorlds;
      (worlds || []).forEach(world => {
        grid.appendChild(createWorldCard(world));
      });

      // 🔮 3학년 미래 교과 보관소 (사회·과학) 렌더링 (공부방 탭 & futureWorlds 데이터가 있을 때만)
      if (tab === 'study' && currentConfig.futureWorlds && currentConfig.futureWorlds.length > 0) {
        const futureWrap = document.createElement('div');
        futureWrap.id = 'futureWorldsWrap';
        futureWrap.className = 'future-worlds-wrap';
        futureWrap.innerHTML = `
          <button type="button" class="future-toggle-btn" id="futureToggleBtn" onclick="toggleFutureWorlds()">
            <span>🔮 3학년 미래 교과 보관소 <span class="future-notice-badge">(사회·과학 미리보기)</span></span>
            <span class="toggle-icon">▼</span>
          </button>
          <div class="future-content-box" id="futureContentBox">
            <div class="future-guide-banner">
              <span>🎒</span>
              <div>초등 3학년부터 시작되는 새로운 탐구 과목이에요! 지금은 먼저 둘러보며 구경하거나 오빠 공부를 엿볼 수 있어요. 민서가 3학년이 되면 정규 공부방으로 올라옵니다 ✨</div>
            </div>
            <div class="future-grid" id="futureGrid"></div>
          </div>
        `;
        grid.insertAdjacentElement('afterend', futureWrap);

        const futureGrid = futureWrap.querySelector('#futureGrid');
        if (futureGrid) {
          currentConfig.futureWorlds.forEach(world => {
            futureGrid.appendChild(createWorldCard(world));
          });
        }
      }
    }

    window.toggleFutureWorlds = function() {
      const btn = document.getElementById('futureToggleBtn');
      const box = document.getElementById('futureContentBox');
      if (!btn || !box) return;
      const isOpen = box.classList.contains('open');
      if (isOpen) {
        box.classList.remove('open');
        btn.classList.remove('open');
      } else {
        box.classList.add('open');
        btn.classList.add('open');
      }
    };

    window.switchLobbyTab = function(tab) {
      currentLobbyTab = tab;
      const tabStudy = document.getElementById('tabStudy');
      const tabHideout = document.getElementById('tabHideout');
      const subtitle = document.getElementById('lobbySubtitle');

      if (tab === 'study') {
        if (tabStudy) tabStudy.classList.add('active');
        if (tabHideout) tabHideout.classList.remove('active');
        if (subtitle) subtitle.textContent = "오늘 탐험하고 싶은 공부방 월드를 선택해봐!";
      } else {
        if (tabStudy) tabStudy.classList.remove('active');
        if (tabHideout) tabHideout.classList.add('active');
        if (subtitle) subtitle.textContent = "나만의 아지트에서 방을 꾸미고 놀이터에서 놀아보자!";
      }
      renderWorldGrid(tab);
    };

    // 초기 탭 활성화 실행
    switchLobbyTab(currentLobbyTab);

    // 배경 부유물 애니메이션 모듈
    (function createFloatingParticles() {
      const wrap = document.getElementById('bgFloats');
      if (!wrap) return;
      wrap.innerHTML = '';
      const symbols = currentConfig.bgSymbols;
      for (let i = 0; i < 18; i++) {
        const el = document.createElement('div');
        el.className = 'float-item';
        el.textContent = symbols[Math.floor(Math.random() * symbols.length)];
        el.style.left = (Math.random() * 92) + '%';
        el.style.animationDuration = (11 + Math.random() * 13) + 's';
        el.style.animationDelay = (-Math.random() * 15) + 's';
        wrap.appendChild(el);
      }
    })();

    // 노션 백엔드 인벤토리 동기화 통신 모듈
    async function fetchInventory() {
      const container = document.getElementById('inventoryDisplay');
      if (!container) return;
      const childName = finalRealName;
      
      // 💡 [핵심 차단막] 아빠/엄마 관리자 모드일 때는 노션 데이터 조회를 완전히 패스하고 모킹데이터 주입!
      if (isAdmin) {
        const defaultTheme = currentConfig.key === 'son' ? '마인크래프트' : '슬라임';
        localStorage.setItem('currentTheme', defaultTheme);
        
        container.innerHTML = `
          <div class="reward-badge">🎟️ <span style="color:var(--mint);">무한 패스</span></div>
          <div class="math-level" style="background:var(--purple); color:#fff;">🛠️ Lv. 999</div>
        `;
        container.className = "inventory-card " + (defaultTheme === '마인크래프트' ? 'theme--minecraft' : 'theme--slime');
        return; // 🔥 노션 통신망 차단완료!
      }

      function renderInventoryCard(diamond, slime, level, theme) {
        localStorage.setItem('currentTheme', theme);
        container.classList.remove('theme--minecraft', 'theme--slime');
        if (theme === '마인크래프트') {
          container.innerHTML = `<div class="reward-badge">💎 <span style="color:#0288D1;">x${diamond}</span></div><div class="math-level">통합 Lv. ${level}</div>`;
          container.classList.add('theme--minecraft');
        } else {
          const hariboHtml = typeof getRewardWealthHtml === 'function'
            ? getRewardWealthHtml(theme, slime, '')
            : `🍬 <span style="color:#E84393;">x${slime}</span>`;
          container.innerHTML = `<div class="reward-badge">${hariboHtml}</div><div class="math-level">통합 Lv. ${level}</div>`;
          container.classList.add('theme--slime');
        }
      }

      // ⚡ 1. SWR 캐시 즉각 로딩 (0.01초 렌더링)
      const invCacheKey = `MINMIN_INVENTORY_CACHE_${childName}`;
      let hasCachedData = false;
      try {
        const cachedRaw = localStorage.getItem(invCacheKey);
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw);
          if (cached && typeof cached.level !== 'undefined') {
            renderInventoryCard(cached.diamond || 0, cached.slime || 0, cached.level || 1, cached.theme || (childName === APP_CONFIG.CHILDREN.first.name ? '마인크래프트' : '슬라임'));
            hasCachedData = true;
          }
        }
      } catch (e) {
        console.warn("[Inventory Cache] 캐시 로드 실패:", e);
      }
      
      // 🌐 2. 백그라운드 최신화 (워커 엣지 캐시 또는 노션 연동)
      try {
        const proxyUrl = typeof PROXY_URL !== 'undefined' ? PROXY_URL : ((typeof APP_CONFIG !== 'undefined' && APP_CONFIG.WORKER_PROXY_URL) ? APP_CONFIG.WORKER_PROXY_URL : "https://minmin-notion.awslike6.workers.dev");
        const invDbId = typeof INVENTORY_DB_ID !== 'undefined' ? INVENTORY_DB_ID : ((typeof APP_CONFIG !== 'undefined' && APP_CONFIG.INVENTORY_DB_ID) ? APP_CONFIG.INVENTORY_DB_ID : "374a27115b688042bb61e6a102242e12");
        const response = await fetch(`${proxyUrl}/v1/databases/${invDbId}/query`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          cache: "no-store",
          body: JSON.stringify({ filter: { property: "이름", title: { equals: childName } } })
        });
        const data = await response.json();
        if (!data.results || data.results.length === 0) throw new Error("데이터 없음");
        
        const page = data.results[0];
        const pageId = page.id;
        localStorage.setItem(`MINMIN_INVENTORY_PAGE_ID_${childName}`, pageId);

        const props = page.properties;
        if (typeof window.ScreenTimeTracker !== 'undefined' && typeof window.ScreenTimeTracker.syncFromInventoryProps === 'function') {
          window.ScreenTimeTracker.syncFromInventoryProps(props, childName);
          updateLobbyScreenTimeBtn(childName);
          if (document.getElementById('screenTimeReceiptModal') && typeof window.openScreenTimeReceiptModal === 'function') {
            window.openScreenTimeReceiptModal(childName);
          }
        }
        if (props["학습설정"]) {
          if (typeof syncQuizFlowFromCloud === 'function') {
            syncQuizFlowFromCloud(props["학습설정"]);
          }
          if (typeof SettingsManager !== 'undefined' && typeof SettingsManager.syncFromCloud === 'function') {
            SettingsManager.syncFromCloud(props["학습설정"]);
          }
        }

        const theme = props["현재 테마"]?.select?.name || (childName === APP_CONFIG.CHILDREN.first.name ? '마인크래프트' : '슬라임');
        const diamond = props["다이아몬드 개수"]?.number || 0;
        const slime = typeof getDaughterRewardCount === 'function'
          ? getDaughterRewardCount(props)
          : (props["슬라임 파츠 개수"]?.number || 0);
        const level = props["통합 레벨"]?.formula?.number || props["수학 레벨"]?.number || 1;
        
        renderInventoryCard(diamond, slime, level, theme);

        // 로컬 캐시 갱신
        localStorage.setItem(invCacheKey, JSON.stringify({
          diamond,
          slime,
          level,
          theme,
          updatedAt: Date.now()
        }));
      } catch (error) {
        console.error("인벤토리 로드 에러:", error);
        if (!hasCachedData) {
          const defaultTheme = childName === APP_CONFIG.CHILDREN.first.name ? '마인크래프트' : '슬라임';
          localStorage.setItem('currentTheme', defaultTheme);
          const failHtml = defaultTheme === '마인크래프트'
            ? '💎'
            : (typeof getRewardWealthHtml === 'function'
              ? getRewardWealthHtml(defaultTheme, 0, '')
              : '🍬');
          container.innerHTML = `<div class="reward-badge">${failHtml} <span>x0 (연결 필요)</span></div>`;
        }
      }
    }

    fetchInventory();

    if (typeof updateTtsToggleUi === 'function') updateTtsToggleUi();

    // 🧚‍♀️ 안전하게 단어요정 시동 (관리자 계정일 때는 세션 분리가 완료되어 자동 안전 구동)
    if (typeof initFairyChat === 'function') {
      initFairyChat('KOREAN', '로비'); 
    }

    // 🚀 [고속 캐싱] 백그라운드에서 조용히 오늘 공부할 단어 및 독해 지문 데이터를 사전 다운로드 (0.01초 로딩)
    if (typeof prefetchVocaData === 'function') {
      prefetchVocaData(finalRealName);
    }
    if (typeof prefetchReadingData === 'function') {
      prefetchReadingData({ student: finalRealName });
    }

    // ⏰ [스크린타임 클라우드 동기화] 노션에 기록된 오늘 공부 시간을 트래커에 즉시 반영
    if (typeof window.ScreenTimeTracker !== 'undefined' && typeof window.ScreenTimeTracker.syncFromStudyLogs === 'function') {
      const proxyUrl = typeof PROXY_URL !== 'undefined' ? PROXY_URL : ((typeof APP_CONFIG !== 'undefined' && APP_CONFIG.WORKER_PROXY_URL) ? APP_CONFIG.WORKER_PROXY_URL : "https://minmin-notion.awslike6.workers.dev");
      const studyDbId = typeof STUDY_LOG_DB_ID !== 'undefined' ? STUDY_LOG_DB_ID : ((typeof APP_CONFIG !== 'undefined' && APP_CONFIG.STUDY_LOG_DB_ID) ? APP_CONFIG.STUDY_LOG_DB_ID : "37aa27115b688042bb61e6a102242e12");
      fetch(`${proxyUrl}/v1/databases/${studyDbId}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ page_size: 30, sorts: [{ property: "입장", direction: "descending" }] })
      }).then(r => r.json()).then(data => {
        if (data && data.results) {
          window.ScreenTimeTracker.syncFromStudyLogs(data.results, finalRealName);
          updateLobbyScreenTimeBtn(finalRealName);
        }
      }).catch(e => console.warn("[ScreenTime] 일지 동기화 실패:", e));
    }

    // ⏰ 로비 상단 스크린타임 버튼 실시간 상태 반영 함수
    function updateLobbyScreenTimeBtn(childName) {
      const btn = document.getElementById('lobbyScreenTimeBtn');
      if (!btn || typeof window.ScreenTimeTracker === 'undefined') return;
      const s = window.ScreenTimeTracker.getScreenTimeSummary(childName);
      if (s.pendingMinutes > 0) {
        btn.innerHTML = `⏰ 폰시간 <b>+${s.pendingMinutes}분</b> 신청 대기`;
        btn.style.background = "linear-gradient(135deg, #f59e0b, #d97706)";
        btn.style.boxShadow = "0 4px 12px rgba(245, 158, 11, 0.35)";
      } else if (s.totalMinutes > 0) {
        btn.innerHTML = `💖 폰시간 <b>${s.totalMinutes}분</b> 연장 완료 (대기 0분)`;
        btn.style.background = "linear-gradient(135deg, #10b981, #059669)";
        btn.style.boxShadow = "0 4px 12px rgba(16, 185, 129, 0.25)";
      } else {
        btn.innerHTML = `⏰ 오늘 폰시간 정산`;
        btn.style.background = "linear-gradient(135deg, #10b981, #059669)";
        btn.style.boxShadow = "0 4px 12px rgba(16, 185, 129, 0.25)";
      }
    }
    updateLobbyScreenTimeBtn(finalRealName);

    // 🚀 PWA 바로가기 및 딥링크 라우터 (마음일기/시간표 등)
    const actionParam = urlParams.get('action');
    if (actionParam === 'diary') {
      setTimeout(() => {
        if (typeof openDailyDiaryModal === 'function') {
          openDailyDiaryModal();
        }
      }, 350);
    }
  });
})();
