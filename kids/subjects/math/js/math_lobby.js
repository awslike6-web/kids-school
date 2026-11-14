
  window.currentSubject = "수학"; // 🚨 핵심: 전역 과목명 명시 (학습일지 및 보상 관제탑 연동)

  // 🚪 수학 섹션 뷰 열기/닫기 (대문 <-> 개념관 <-> 트레이닝 센터)
  function openMathSection(section) {
    const vGateway = document.getElementById('viewGateway');
    const vConcepts = document.getElementById('viewConcepts');
    const vWorkout = document.getElementById('viewWorkout');

    vGateway.classList.remove('active');
    vConcepts.classList.remove('active');
    vWorkout.classList.remove('active');

    if (section === 'concepts') {
      vConcepts.classList.add('active');
      window.location.hash = 'concepts';
    } else if (section === 'workout') {
      vWorkout.classList.add('active');
      window.location.hash = 'workout';
    } else {
      vGateway.classList.add('active');
      window.location.hash = '';
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // 🔄 개념관 듀얼 뷰 스위치 (학년별 vs 영역별)
  function switchConceptMode(mode) {
    const btnG = document.getElementById('btnModeGrade');
    const btnT = document.getElementById('btnModeTopic');
    const viewG = document.getElementById('conceptModeGrade');
    const viewT = document.getElementById('conceptModeTopic');

    if (mode === 'grade') {
      btnG.classList.add('active');
      btnT.classList.remove('active');
      viewG.style.display = 'block';
      viewT.style.display = 'none';
    } else {
      btnG.classList.remove('active');
      btnT.classList.add('active');
      viewG.style.display = 'none';
      viewT.style.display = 'block';
    }
  }

  // 🎯 학년 서브 필터링
  function filterGradeSector(grade, btn) {
    document.querySelectorAll('#conceptModeGrade .filter-pill-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');

    document.querySelectorAll('#conceptModeGrade .grade-sector-block').forEach(block => {
      const show = grade === 'all' || block.id === `sector-block-${grade}`;
      block.style.display = show ? 'block' : 'none';
    });
  }

  // 🔢 학년별 카드 개수 자동 채우기
  function updateGradePillCounts() {
    document.querySelectorAll('#conceptModeGrade .pill-count[data-grade]').forEach(span => {
      const grade = span.dataset.grade;
      const block = document.getElementById(`sector-block-${grade}`);
      const count = block ? block.querySelectorAll('a.mission-card').length : 0;
      span.textContent = `(${count})`;
    });
  }

  // 🎯 영역 서브 필터링
  function filterTopicSector(topic, btn) {
    document.querySelectorAll('#conceptModeTopic .filter-pill-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');

    // 영역 블록 id는 topic-block-{영역} (nat · frac · shape · measure · data)
    document.querySelectorAll('#conceptModeTopic .topic-sector-block').forEach(block => {
      block.style.display = (topic === 'all' || block.id === 'topic-block-' + topic) ? 'block' : 'none';
    });
  }

  // 대문 이동 로직
  document.getElementById('goLobbyBtn').addEventListener('click', () => {
      const activeChild = localStorage.getItem('currentChild') || (localStorage.getItem('currentUser') === 'daughter' ? 'minseo' : 'minsu');
      location.href = `../../../lobby.html?user=${activeChild}`;
  });

  // 초기 로드 시 해시 상태 또는 기본 대문 렌더링
  document.addEventListener("DOMContentLoaded", () => {
    let currentProfile = localStorage.getItem('currentUser') || 'son';
    let currentChild = localStorage.getItem('currentChild') || (currentProfile === 'daughter' ? 'minseo' : 'minsu');
    const isDaughter = currentProfile === 'daughter' || currentChild === 'minseo';
    const name = isDaughter ? '민서' : (currentProfile === 'son' ? '민수' : '어른');
    const icon = isDaughter ? '👧' : (currentProfile === 'son' ? '👦' : '👨‍💻');
    
    const savedTheme = localStorage.getItem('currentTheme') || (isDaughter ? '슬라임' : '마인크래프트');
    const themeClass = savedTheme === '슬라임' ? 'theme--slime' : 'theme--arcade';
    document.body.className = themeClass;

    document.getElementById('userName').textContent = `${name} 대원`;
    document.getElementById('userIcon').textContent = icon;

    // URL 해시 확인
    function checkHashAndSwitch() {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'concepts') {
        openMathSection('concepts');
      } else if (hash === 'workout') {
        openMathSection('workout');
      } else {
        openMathSection('gateway');
      }
    }
    updateGradePillCounts();
    checkHashAndSwitch();
    window.addEventListener('hashchange', checkHashAndSwitch);

    if (typeof initFairyAudio === 'function') initFairyAudio();
    if (typeof initFairyChat === 'function') initFairyChat("MATH", "수학관제탑");
    if (typeof updateTtsToggleUi === 'function') updateTtsToggleUi();
  });
