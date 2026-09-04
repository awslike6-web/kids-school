const KOREAN_DAYS = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
const KOREAN_DAYS_SHORT = ['일', '월', '화', '수', '목', '금', '토'];
const WEEKDAYS = ['월요일', '화요일', '수요일', '목요일', '금요일'];
const DAY_CSS_CLASS = {
  '월요일': 'day-mon',
  '화요일': 'day-tue',
  '수요일': 'day-wed',
  '목요일': 'day-thu',
  '금요일': 'day-fri'
};

const DEFAULT_PERIODS = [
  { num: 1, display: '1교시(09:00~09:40)', label: '1교시', timeRange: '09:00~09:40' },
  { num: 2, display: '2교시(10:00~10:40)', label: '2교시', timeRange: '10:00~10:40' },
  { num: 3, display: '3교시(11:00~11:40)', label: '3교시', timeRange: '11:00~11:40' },
  { num: 4, display: '4교시(13:00~13:40)', label: '4교시', timeRange: '13:00~13:40' },
  { num: 5, display: '5교시(14:00~14:40)', label: '5교시', timeRange: '14:00~14:40' },
  { num: 6, display: '6교시(15:00~15:40)', label: '6교시', timeRange: '15:00~15:40' }
];

const ALL_SPECIAL_PERIODS = {
  0: { num: 0, display: '🌅 0교시(아침)', label: '0교시(아침)', timeRange: '08:20~08:50' },
  7: { num: 7, display: '🎒 방과후', label: '방과후', timeRange: '14:40~15:30' },
  8: { num: 8, display: '🚗 하교 후', label: '하교 후', timeRange: '15:30~' }
};

const SUBJECT_COLORS = {
  '국어': '#FF6B9D', '수학': '#6EC6F5', '영어': '#A78BFA', '과학': '#6BCB77',
  '사회': '#FFD93D', '기타': '#8b949e', '도덕': '#4ECDC4', '음악': '#FF9F43',
  '체육': '#44A08D', '미술': '#ff758c', '실과': '#c084fc',
  '수영장': '#00f2fe', '수영': '#00f2fe', '센터': '#f39c12', '피구': '#ff7675',
  '난타': '#ff9f43', '하루': '#2ed573'
};

// 🏛️ [기본 정적 시간표 (베이스)] - 학기 중 매주 반복되는 고정 시간표
const DEFAULT_BASE_TIMETABLE = {
  '민수': [
    // 👦 5학년 2학기 확정 시간표
    { dayOfWeek: '월요일', periodNum: 1, subject: '도덕', title: '도덕' },
    { dayOfWeek: '월요일', periodNum: 2, subject: '음악', title: '음악' },
    { dayOfWeek: '월요일', periodNum: 3, subject: '영어', title: '영어' },
    { dayOfWeek: '월요일', periodNum: 4, subject: '체육', title: '체육' },
    { dayOfWeek: '월요일', periodNum: 5, subject: '수학', title: '수학' },
    { dayOfWeek: '월요일', periodNum: 6, subject: '국어', title: '국어' },

    { dayOfWeek: '수요일', periodNum: 0, subject: '체육', title: '피구(아침활동)' },
    { dayOfWeek: '수요일', periodNum: 1, subject: '사회', title: '사회' },
    { dayOfWeek: '수요일', periodNum: 2, subject: '영어', title: '영어' },
    { dayOfWeek: '수요일', periodNum: 3, subject: '체육', title: '창체(체육)' },
    { dayOfWeek: '수요일', periodNum: 4, subject: '국어', title: '국어' },
    { dayOfWeek: '수요일', periodNum: 5, subject: '수학', title: '수학' },
    { dayOfWeek: '수요일', periodNum: 8, subject: '센터', title: '센터' },

    { dayOfWeek: '목요일', periodNum: 1, subject: '과학', title: '과학' },
    { dayOfWeek: '목요일', periodNum: 2, subject: '영어', title: '영어' },
    { dayOfWeek: '목요일', periodNum: 3, subject: '체육', title: '체육' },
    { dayOfWeek: '목요일', periodNum: 4, subject: '음악', title: '음악' },
    { dayOfWeek: '목요일', periodNum: 5, subject: '사회', title: '사회' },
    { dayOfWeek: '목요일', periodNum: 6, subject: '수학', title: '수학' },

    { dayOfWeek: '금요일', periodNum: 0, subject: '체육', title: '피구(아침활동)' },
    { dayOfWeek: '금요일', periodNum: 1, subject: '실과', title: '실과' },
    { dayOfWeek: '금요일', periodNum: 2, subject: '실과', title: '실과' },
    { dayOfWeek: '금요일', periodNum: 3, subject: '국어', title: '국어' },
    { dayOfWeek: '금요일', periodNum: 4, subject: '국어', title: '국어' },
    { dayOfWeek: '금요일', periodNum: 5, subject: '체육', title: '체육' },
    { dayOfWeek: '금요일', periodNum: 6, subject: '기타', title: '창체' },
    { dayOfWeek: '금요일', periodNum: 8, subject: '센터', title: '센터' }
  ],
  '민서': [
    // 👧 1학년 2학기 확정 시간표
    { dayOfWeek: '월요일', periodNum: 8, subject: '수영장', title: '수영장' },

    { dayOfWeek: '수요일', periodNum: 1, subject: '체육', title: '체육' },
    { dayOfWeek: '수요일', periodNum: 2, subject: '체육', title: '체육' },
    { dayOfWeek: '수요일', periodNum: 3, subject: '국어', title: '국어' },
    { dayOfWeek: '수요일', periodNum: 4, subject: '수학', title: '수학' },
    { dayOfWeek: '수요일', periodNum: 5, subject: '하루', title: '하루' },

    { dayOfWeek: '목요일', periodNum: 1, subject: '난타', title: '난타' },
    { dayOfWeek: '목요일', periodNum: 2, subject: '국어', title: '국어' },
    { dayOfWeek: '목요일', periodNum: 3, subject: '수학', title: '수학' },
    { dayOfWeek: '목요일', periodNum: 4, subject: '하루', title: '하루' },
    { dayOfWeek: '목요일', periodNum: 8, subject: '수영장', title: '수영장' },

    { dayOfWeek: '금요일', periodNum: 1, subject: '체육', title: '체육' },
    { dayOfWeek: '금요일', periodNum: 2, subject: '체육', title: '체육' },
    { dayOfWeek: '금요일', periodNum: 3, subject: '수학', title: '수학' },
    { dayOfWeek: '금요일', periodNum: 4, subject: '하루', title: '하루' }
  ]
};

let allTimetableRows = [];
let staticTimetableRows = [];
let overlayTimetableRows = [];
let activeChildFilter = 'all';
let viewerContext = { mode: 'monitor', childFilter: 'all', childName: null, lobbyUser: 'minsu' };

function getChildDisplayName(userKey) {
  if (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.CHILDREN) {
    if (userKey === 'daughter') return APP_CONFIG.CHILDREN.second?.name || '민서';
    return APP_CONFIG.CHILDREN.first?.name || '민수';
  }
  return userKey === 'daughter' ? '민서' : '민수';
}

function getTimetableViewerContext() {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('view') === 'monitor') {
    return { mode: 'monitor', childFilter: 'all', childName: null, lobbyUser: 'minsu' };
  }

  const userName = (localStorage.getItem('currentUserName') || '').trim();
  const userKey = localStorage.getItem('currentUser') || 'son';
  const isParent = userName === '아빠' || userName === '엄마' || userName === '어른';
  const isAdminProfile = userKey === 'admin';

  if (isParent || isAdminProfile) {
    return { mode: 'monitor', childFilter: 'all', childName: null, lobbyUser: 'minsu' };
  }

  if (userKey === 'daughter' || userName === '민서') {
    return { mode: 'personal', childFilter: '민서', childName: getChildDisplayName('daughter'), lobbyUser: 'minseo' };
  }

  return { mode: 'personal', childFilter: getChildDisplayName('son'), childName: getChildDisplayName('son'), lobbyUser: 'minsu' };
}

function applyViewerUi() {
  viewerContext = getTimetableViewerContext();
  activeChildFilter = viewerContext.childFilter;
  document.body.classList.toggle('mode-personal', viewerContext.mode === 'personal');

  const brandSub = document.getElementById('brandSubtitle');
  const viewerBadge = document.getElementById('viewerBadge');
  const backLink = document.getElementById('backToLobby');
  const noticeTitle = document.getElementById('noticeTitle');
  const noticeSub = document.getElementById('noticeSubtitle');
  const gridTitle = document.getElementById('gridTitle');
  const statusHint = document.getElementById('statusHint');

  if (viewerContext.mode === 'personal') {
    const icon = viewerContext.childName === '민서' ? '👧' : '👦';
    brandSub.textContent = `${icon} ${viewerContext.childName}의 주간 시간표`;
    viewerBadge.textContent = `${icon} ${viewerContext.childName}만 보는 중`;
    viewerBadge.className = `viewer-badge ${viewerContext.childName === '민서' ? 'daughter' : 'son'}`;
    backLink.href = `lobby.html?user=${viewerContext.lobbyUser}`;
    gridTitle.textContent = `${viewerContext.childName} 주간 시간표`;
    noticeTitle.textContent = `${viewerContext.childName} 공지 · 메모`;
    noticeSub.textContent = '준비물 · 행사 · 수업 메모';
    statusHint.textContent = '5분마다 자동 새로고침';
    document.title = `민민이네 공부방 · ${viewerContext.childName} 시간표`;
  } else {
    brandSub.textContent = '📺 로비 모니터 · 주간 학교 시간표';
    viewerBadge.className = 'viewer-badge';
    gridTitle.textContent = '주간 시간표';
    noticeTitle.textContent = '전체 행정 공지판';
    noticeSub.textContent = '결석계 · 행사 · 준비물 · 수업 메모';
    statusHint.textContent = '5분마다 자동 새로고침 · F11 전체화면 권장';
    document.title = '민민이네 공부방 · 주간 시간표';

    const activeBtn = document.querySelector(`.filter-btn[data-filter="${activeChildFilter}"]`)
      || document.querySelector('.filter-btn[data-filter="all"]');
    if (activeBtn) {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      activeBtn.classList.add('active');
    }
  }
}

function pad2(n) { return String(n).padStart(2, '0'); }

function formatDateLabel(date) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const day = date.getDate();
  const dow = KOREAN_DAYS[date.getDay()];
  return `${y}년 ${m}월 ${day}일 (${dow})`;
}

function formatAlertLabel(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return '';
  return `🔔 ${d.getMonth() + 1}월 ${d.getDate()}일 ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function shortDay(dayName) {
  const idx = KOREAN_DAYS.indexOf(dayName);
  return idx >= 0 ? KOREAN_DAYS_SHORT[idx] : dayName;
}

function updateClock() {
  const now = new Date();
  document.getElementById('clockTime').textContent =
    `${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`;
  document.getElementById('clockDate').textContent = formatDateLabel(now);
}

function matchesChildFilter(row) {
  if (activeChildFilter === 'all') return true;
  return row.child === activeChildFilter || row.child === '공통' || !row.child || row.child.trim() === '';
}

function isClassRow(row) {
  const num = typeof row.periodNum === 'number' ? row.periodNum : (typeof row.periodSlot?.num === 'number' ? row.periodSlot.num : null);
  return num !== null && !isNaN(num) && num >= 0;
}

function isNoticeRow(row) {
  if (isClassRow(row)) return false;
  const hasMemo = !!(row.memo && String(row.memo).trim());
  if (hasMemo) return true;
  return !!(row.title && String(row.title).trim());
}

function getDayCssClass(dayName) {
  return DAY_CSS_CLASS[dayName] || '';
}

function getClassDisplayName(row) {
  // 🎒 초등학생 시간표이므로 무조건 직관적이고 큼직한 [과목명] (국어, 수학, 체육 등)을 대표로 표시
  if (row.subject && String(row.subject).trim()) {
    return String(row.subject).trim();
  }
  return (row.title && String(row.title).trim()) || '수업';
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** 카드 본문(메모) vs 툴팁(본문 전체) 분리 */
function getNoticeBodyText(row) {
  const pageContent = (row.pageContent || row.body || '').trim();
  const memo = row.memo ? String(row.memo).trim() : '';
  if (pageContent) {
    if (memo && pageContent !== memo && !pageContent.includes(memo)) {
      return `${memo}\n\n${pageContent}`;
    }
    return pageContent;
  }
  return memo;
}

function shouldShowNoticeTooltip(row, bodyText) {
  if (!bodyText) return false;
  const memo = row.memo ? String(row.memo).trim() : '';
  const pageContent = (row.pageContent || row.body || '').trim();
  if (pageContent && pageContent !== memo) return true;
  if (!memo && pageContent) return true;
  return memo.length > 100;
}

function renderNoticeTooltipHtml(label, bodyText) {
  return `
    <div class="notice-tooltip" role="tooltip">
      <div style="font-weight: bold; margin-bottom: 6px; border-bottom: 1px dashed rgba(255,255,255,0.2); padding-bottom: 4px;">${label}</div>
      <div>${escapeHtml(bodyText)}</div>
    </div>`;
}

/** 날짜에서 요일명 추출 헬퍼 */
function getRowDayOfWeek(row) {
  if (row.targetDate) {
    const d = new Date(row.targetDate);
    if (!isNaN(d.getTime())) return KOREAN_DAYS[d.getDay()];
  }
  return row.dayOfWeek || '';
}

/**
 * 🕒 [스마트 알림장/이벤트 만료 필터]
 * 1. 종료일(또는 지정 날짜)이 적힌 항목:
 *    - 종료일(targetDateEnd || targetDate)이 오늘보다 이전이면 자동 숨김
 *    - 종료일이 아직 남아있다면 등록일이 한 달을 넘었더라도 계속 유지
 * 2. 종료일/날짜가 없는 상시 알림:
 *    - 등록일(createdAt) 기준 30일(한 달)이 지나면 자동 숨김
 */
function isNoticeRowExpired(row) {
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const effectiveEndDate = row.targetDateEnd || row.targetDate;
  if (effectiveEndDate) {
    const datePart = String(effectiveEndDate).split('T')[0];
    return datePart < todayStr;
  }

  if (row.createdAt) {
    const createdTime = new Date(row.createdAt).getTime();
    if (!isNaN(createdTime)) {
      const diffDays = (now.getTime() - createdTime) / (1000 * 60 * 60 * 24);
      return diffDays > 30;
    }
  }

  return false;
}

/** 🌟 [이벤트 오버레이 ①] 상단 배너 대상 여부 확인 */
function isTopBannerNotice(row) {
  if (!matchesChildFilter(row)) return false;
  if (isNoticeRowExpired(row)) return false;
  if (row.scope === '전체 공지') return true;
  const hasValidPeriod = typeof row.periodNum === 'number' && row.periodNum >= 0;
  // 교시 없고 요일도 없이 전체 알림/공지인 레거시 항목 호환
  if (!hasValidPeriod && !row.dayOfWeek && !row.subject && (row.title || row.memo)) {
    return true;
  }
  return false;
}

/** 🌟 [이벤트 오버레이 ②] 요일 헤더 일일 전체 일정 여부 확인 */
function isDayEventNotice(row, dayName) {
  if (!matchesChildFilter(row)) return false;
  if (isNoticeRowExpired(row)) return false;
  const dow = getRowDayOfWeek(row);
  if (row.scope === '일일 전체') {
    return dow === dayName || dow === '매일' || (!dow && !row.subject);
  }
  const hasValidPeriod = typeof row.periodNum === 'number' && row.periodNum >= 0;
  if (!hasValidPeriod && !row.subject && dow === dayName) {
    return true;
  }
  return false;
}

/** 🌟 [이벤트 오버레이 ③] 과목별 준비물/숙제 항목 수집 */
function getSubjectOverlayItems(dayName, subjectName, childName) {
  return allTimetableRows.filter(row => {
    if (!matchesChildFilter(row)) return false;
    if (isNoticeRowExpired(row)) return false;
    if (childName && row.child && row.child !== childName && row.child !== '공통') return false;

    const hasValidPeriod = typeof row.periodNum === 'number' && row.periodNum >= 0;
    const isSubjectScope = row.scope === '과목별' || (row.subject && !hasValidPeriod);
    if (!isSubjectScope) return false;

    if (row.subject !== subjectName) return false;

    const dow = getRowDayOfWeek(row);
    if (dow && dow !== dayName && dow !== '매일') return false;

    return true;
  });
}

function getPeriodDefinitions(gridMap) {
  const map = new Map(DEFAULT_PERIODS.map(p => [p.num, { ...p }]));

  const sourceRows = gridMap ? [...gridMap.values()].flat() : allTimetableRows;
  for (const row of sourceRows) {
    if (!isClassRow(row)) continue;
    const slot = row.periodSlot || {};
    const num = typeof row.periodNum === 'number' ? row.periodNum : (typeof slot.num === 'number' ? slot.num : null);
    if (num === null || isNaN(num) || num < 0) continue;
    if (!map.has(num)) {
      const spec = ALL_SPECIAL_PERIODS[num] || {};
      map.set(num, {
        num,
        label: slot.label || spec.label || `${num}교시`,
        timeRange: slot.timeRange || spec.timeRange || '',
        display: slot.display || spec.display || `${num}교시`
      });
    } else if (slot.display && slot.timeRange) {
      map.set(num, { num, label: slot.label || `${num}교시`, timeRange: slot.timeRange, display: slot.display });
    }
  }

  return [...map.values()].sort((a, b) => a.num - b.num);
}

/**
 * 🗺️ [하이브리드 격자 매핑] 기본 정적 베이스 + 노션 수업 오버라이드 + 과목별 준비물 오버레이 바인딩
 */
function buildGridMap() {
  const map = new Map();
  const childrenToInclude = activeChildFilter === 'all' ? ['민수', '민서'] : [activeChildFilter];

  // 1. 기본 정적 시간표(베이스) 탑재
  childrenToInclude.forEach(child => {
    const baseList = DEFAULT_BASE_TIMETABLE[child] || [];
    baseList.forEach(item => {
      const key = `${item.dayOfWeek}:${item.periodNum}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push({
        id: `base_${child}_${item.dayOfWeek}_${item.periodNum}`,
        child: child,
        dayOfWeek: item.dayOfWeek,
        periodNum: item.periodNum,
        subject: item.subject,
        title: item.title,
        memo: '',
        overlays: []
      });
    });
  });

  // 2. 노션 고정 시간표 DB(또는 전체 DB)에 등록된 정규 수업 반영 및 덮어쓰기
  const classCandidateRows = staticTimetableRows.length > 0 ? staticTimetableRows : allTimetableRows;
  for (const row of classCandidateRows) {
    if (!isClassRow(row) || !matchesChildFilter(row)) continue;
    if (!WEEKDAYS.includes(row.dayOfWeek)) continue;
    const periodNum = typeof row.periodNum === 'number' ? row.periodNum : (typeof row.periodSlot?.num === 'number' ? row.periodSlot.num : null);
    if (periodNum === null || isNaN(periodNum) || periodNum < 0) continue;

    const key = `${row.dayOfWeek}:${periodNum}`;
    if (!map.has(key)) map.set(key, []);
    const existingList = map.get(key);

    const existingIndex = existingList.findIndex(e => e.child === row.child);
    const rowObj = { ...row, overlays: [] };
    if (existingIndex >= 0) {
      existingList[existingIndex] = rowObj;
    } else {
      existingList.push(rowObj);
    }
  }

  // 3. 🌟 [이벤트 오버레이 ③] 과목별 준비물/숙제를 해당 요일/과목 셀에 결합
  for (const [key, rows] of map) {
    const [dayName] = key.split(':');
    rows.forEach(lesson => {
      lesson.overlays = getSubjectOverlayItems(dayName, lesson.subject, lesson.child);
    });
    rows.sort((a, b) => String(a.child).localeCompare(String(b.child), 'ko'));
  }

  return map;
}

/**
 * 📦 개별 수업 칸 렌더링 (과목명 + 🎒 준비물 인디케이터 뱃지)
 */
function renderLessonCell(rows) {
  if (!rows.length) return '<span class="cell-empty">—</span>';

  return rows.map(row => {
    const className = getClassDisplayName(row);
    const color = SUBJECT_COLORS[row.subject] || '#A78BFA';
    const showChild = activeChildFilter === 'all' && row.child;
    const childClass = row.child === '민서' ? 'minseo' : 'minsu';
    const hasMemo = row.memo && String(row.memo).trim();

    const memoHtml = hasMemo ? `
      <span class="lesson-memo-container" onclick="event.stopPropagation(); toggleLessonTooltip(event, this);">
        <span class="lesson-memo-icon">✉️</span>
        <span class="lesson-tooltip">${escapeHtml(row.memo)}</span>
      </span>
    ` : '';

    // 🌟 [이벤트 오버레이 ③] 과목 칸 내부 준비물/숙제 뱃지
    const overlaysHtml = (row.overlays || []).map(overlay => {
      const isDone = overlay.isCompleted;
      const icon = isDone ? '✅' : '🎒';
      return `
        <div class="lesson-overlay-badge ${isDone ? 'completed' : ''}" 
             onclick="event.stopPropagation(); window.openOverlayItemModal('${overlay.id}')"
             title="터치하여 상세 보기 및 완료 체크">
          <span>${icon}</span>
          <span>${escapeHtml(overlay.title)}</span>
        </div>
      `;
    }).join('');

    return `
      <div class="cell-lesson">
        <div class="lesson-name" style="color:${color}">
          ${escapeHtml(className)}${memoHtml}
        </div>
        ${showChild ? `<span class="lesson-child ${childClass}">${escapeHtml(row.child)}</span>` : ''}
        ${overlaysHtml}
      </div>`;
  }).join('');
}

/**
 * 📅 주간 시간표 전체 격자 렌더링 (요일 헤더 뱃지 포함)
 */
function renderWeeklyGrid() {
  const container = document.getElementById('gridContent');
  const subtitle = document.getElementById('gridSubtitle');
  const gridMap = buildGridMap();
  const periods = getPeriodDefinitions(gridMap);
  const todayDay = KOREAN_DAYS[new Date().getDay()];
  const isWeekdayToday = WEEKDAYS.includes(todayDay);
  const filterLabel = activeChildFilter === 'all' ? '민수 · 민서' : activeChildFilter;
  const filledCount = [...gridMap.values()].reduce((n, rows) => n + rows.length, 0);

  subtitle.textContent = `${filterLabel} · 기본 정적 베이스 + 알림장 오버레이 가동 중`;

  // 🌟 [이벤트 오버레이 ②] 요일 헤더 일일 전체 일정(🔴 단축수업/현장학습 등) 뱃지 바인딩
  const headDays = WEEKDAYS.map(day => {
    const dayClass = getDayCssClass(day);
    const isToday = isWeekdayToday && day === todayDay;

    const dayEvents = allTimetableRows.filter(r => isDayEventNotice(r, day));
    const dayEventsHtml = dayEvents.map(e => {
      const icon = e.isCompleted ? '✅' : '🚩';
      return `
        <span class="day-event-badge ${e.isCompleted ? 'completed' : ''}" 
              onclick="event.stopPropagation(); window.openOverlayItemModal('${e.id}')"
              title="${escapeHtml(e.title)} (터치하여 보기)">
          <span>${icon}</span>
          <span>${escapeHtml(e.title)}</span>
        </span>
      `;
    }).join('');

    return `
      <th class="${dayClass}${isToday ? ' today-col' : ''}">
        <div class="day-header-wrap">
          <span class="day-name-label">${shortDay(day)}</span>
          ${dayEventsHtml}
        </div>
      </th>`;
  }).join('');

  const bodyRows = periods.map(period => {
    const cells = WEEKDAYS.map(day => {
      const key = `${day}:${period.num}`;
      const dayClass = getDayCssClass(day);
      const isToday = isWeekdayToday && day === todayDay;
      return `<td class="${dayClass}${isToday ? ' today-col' : ''}">${renderLessonCell(gridMap.get(key) || [])}</td>`;
    }).join('');

    return `
      <tr class="period-row-${period.num}">
        <td class="period-col">
          <div class="period-name">${escapeHtml(period.label || `${period.num}교시`)}</div>
          ${period.timeRange ? `<div class="period-time">${period.timeRange}</div>` : ''}
        </td>
        ${cells}
      </tr>`;
  }).join('');

  container.className = '';
  container.innerHTML = `
    <div class="grid-wrap">
      <table class="weekly-grid">
        <thead>
          <tr>
            <th class="period-col">교시</th>
            ${headDays}
          </tr>
        </thead>
        <tbody>${bodyRows}</tbody>
      </table>
    </div>`;
}

/**
 * 🌟 [이벤트 오버레이 ①] 상단 긴급/전체 공지 띠배너 렌더링
 */
function renderTopNoticeBanner() {
  const bannerArea = document.getElementById('topNoticeBannerArea');
  if (!bannerArea) return;

  const topNotices = allTimetableRows.filter(isTopBannerNotice);
  if (topNotices.length === 0) {
    bannerArea.style.display = 'none';
    bannerArea.innerHTML = '';
    return;
  }

  bannerArea.style.display = 'flex';
  bannerArea.innerHTML = topNotices.slice(0, 2).map(notice => {
    const childBadge = notice.child && notice.child !== '공통' ? `[${notice.child}] ` : '';
    const dateBadge = notice.targetDate ? ` (${notice.targetDate})` : '';
    const completedClass = notice.isCompleted ? ' completed' : '';
    const tagText = notice.isCompleted ? '✅ 완료' : '📢 전체 공지';
    return `
      <div class="top-notice-banner${completedClass}" onclick="window.openOverlayItemModal('${notice.id}')" title="터치하여 공지 전문 보기">
        <div style="display:flex; align-items:center; gap:8px; overflow:hidden;">
          <span class="banner-tag">${tagText}</span>
          <span class="banner-msg">${childBadge}${escapeHtml(notice.title)}${dateBadge}</span>
        </div>
        <span class="banner-arrow">자세히 보기 ›</span>
      </div>
    `;
  }).join('');
}

/**
 * 💬 [이벤트 오버레이 모달 팝업] 열기
 */
window.openOverlayItemModal = function(itemId) {
  const item = allTimetableRows.find(r => r.id === itemId);
  if (!item) return;

  const portal = document.getElementById('overlayModalPortal');
  if (!portal) return;

  const scopeTag = item.scope === '과목별' ? '🎒 과목별 준비물' : (item.scope === '일일 전체' ? '🚩 학교 행사 · 일정' : '📢 전체 학사 공지');
  const childTag = item.child || '전체(공통)';
  const dateStr = item.targetDate ? (item.targetDateEnd ? `${item.targetDate} ~ ${item.targetDateEnd}` : item.targetDate) : (item.dayOfWeek || '상시');
  const bodyContent = (item.memo || item.pageContent || item.title || '상세 내용이 없습니다.').trim();
  const isCompleted = item.isCompleted;

  portal.innerHTML = `
    <div class="overlay-modal-backdrop" onclick="window.closeOverlayModal(event)">
      <div class="overlay-modal-card" onclick="event.stopPropagation()">
        <div class="overlay-modal-header">
          <span class="overlay-modal-badge">${scopeTag}</span>
          <button class="overlay-modal-close" onclick="window.closeOverlayModal()">✕</button>
        </div>
        <div class="overlay-modal-body">
          <div class="overlay-modal-title">${escapeHtml(item.title)}</div>
          <div class="overlay-modal-meta">
            <span>📅 ${escapeHtml(dateStr)}</span>
            <span>👤 ${escapeHtml(childTag)}</span>
            ${item.subject ? `<span>📚 ${escapeHtml(item.subject)}</span>` : ''}
          </div>
          <div class="overlay-modal-content">${escapeHtml(bodyContent)}</div>
          <button class="overlay-modal-toggle-btn ${isCompleted ? 'is-completed' : ''}" 
                  onclick="window.toggleOverlayItemComplete('${item.id}')">
            <span style="font-size:1.2rem;">${isCompleted ? '✅' : '⬜'}</span>
            <span>${isCompleted ? '챙겼어요! (준비 완료됨 · 다시 누르면 취소)' : '챙겼어요! (완료 체크하기)'}</span>
          </button>
        </div>
      </div>
    </div>
  `;
};

window.closeOverlayModal = function(e) {
  if (e && e.target && !e.target.classList.contains('overlay-modal-backdrop') && !e.target.classList.contains('overlay-modal-close')) {
    return;
  }
  const portal = document.getElementById('overlayModalPortal');
  if (portal) portal.innerHTML = '';
};

/**
 * ✅ 준비물 완료 체크박스 실시간 토글 (즉시 반응 + 노션 DB 동기화)
 */
window.toggleOverlayItemComplete = async function(itemId) {
  const item = allTimetableRows.find(r => r.id === itemId);
  if (!item) return;

  const nextState = !item.isCompleted;
  item.isCompleted = nextState;

  // 1. 화면 즉시 갱신 (0초 반응)
  renderAll();
  window.openOverlayItemModal(itemId);

  // 2. 로컬 캐시 즉시 동기화
  if (typeof saveTimetableToCache === 'function') {
    saveTimetableToCache({
      staticRows: staticTimetableRows,
      overlayRows: overlayTimetableRows,
      allRows: allTimetableRows
    });
  }

  // 3. 노션 DB 비동기 반영
  if (typeof updateTimetableItemComplete === 'function') {
    const success = await updateTimetableItemComplete(itemId, nextState);
    if (!success) console.warn("[오버레이] 노션 완료 상태 동기화 지연");
  }
};

function getTodayWeekday() {
  const today = KOREAN_DAYS[new Date().getDay()];
  return WEEKDAYS.includes(today) ? today : null;
}

function getMemoToneClass(dayName) {
  const today = getTodayWeekday();
  return today && dayName === today ? 'memo-today' : 'memo-other';
}

function getNoticeAnchorDay() {
  const today = KOREAN_DAYS[new Date().getDay()];
  return WEEKDAYS.includes(today) ? today : '월요일';
}

/** 오늘(또는 주말이면 월요일) 기준으로 월~금 순환 정렬 인덱스 */
function getRotatedDaySortIndex(dayName, anchorDay) {
  const dayIdx = WEEKDAYS.indexOf(dayName);
  if (dayIdx < 0) return 99;
  const anchorIdx = WEEKDAYS.indexOf(anchorDay);
  const base = anchorIdx >= 0 ? anchorIdx : 0;
  return (dayIdx - base + WEEKDAYS.length) % WEEKDAYS.length;
}

function buildClassMemoTitle(row) {
  const day = shortDay(row.dayOfWeek);
  const periodLabel = row.periodSlot?.label || `${row.periodNum}교시`;
  const className = getClassDisplayName(row);
  return `${day} ${periodLabel} ${className}`;
}

function collectNoticeItems() {
  const anchorDay = getNoticeAnchorDay();

  const adminNotices = allTimetableRows
    .filter(row => isNoticeRow(row) && matchesChildFilter(row) && !isNoticeRowExpired(row))
    .map(row => ({
      kind: 'admin',
      tier: 0,
      sortDay: 0,
      sortPeriod: 0,
      sortAlert: row.alertAt ? new Date(row.alertAt).getTime() : Infinity,
      row
    }));

  const classMemos = allTimetableRows
    .filter(row => isClassRow(row) && matchesChildFilter(row) && String(row.memo || '').trim())
    .map(row => ({
      kind: 'classMemo',
      tier: 1,
      sortDay: getRotatedDaySortIndex(row.dayOfWeek, anchorDay),
      sortPeriod: row.periodNum || row.periodSlot?.num || 99,
      sortAlert: 0,
      row
    }));

  return [...adminNotices, ...classMemos].sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier;
    if (a.tier === 0) {
      if (a.sortAlert !== b.sortAlert) return a.sortAlert - b.sortAlert;
      return 0;
    }
    if (a.sortDay !== b.sortDay) return a.sortDay - b.sortDay;
    if (a.sortPeriod !== b.sortPeriod) return a.sortPeriod - b.sortPeriod;
    return 0;
  });
}

function getNoticeIcon(title, memo) {
  const text = (String(title) + " " + String(memo)).toLowerCase();
  if (text.includes("준비물") || text.includes("가져가") || text.includes("가져오")) return "🎒";
  if (text.includes("숙제") || text.includes("과제") || text.includes("수행")) return "✏️";
  if (text.includes("결석") || text.includes("조퇴") || text.includes("지각")) return "🏥";
  if (text.includes("행사") || text.includes("체험") || text.includes("축제") || text.includes("소풍")) return "🎈";
  if (text.includes("안내") || text.includes("공지") || text.includes("가정통신")) return "📢";
  return "📌";
}

function renderNotices() {
  const container = document.getElementById('noticeContent');
  const items = collectNoticeItems();

  if (items.length === 0) {
    container.className = 'empty-state';
    container.innerHTML = '✨ 등록된 공지·메모가 없습니다.';
    return;
  }

  container.className = 'notice-list';
  container.innerHTML = items.map((item, index) => {
    const row = item.row;
    const tooltipBelowClass = index < 2 ? ' tooltip-below' : '';

    if (item.kind === 'classMemo') {
      const memo = String(row.memo).trim();
      const toneClass = getMemoToneClass(row.dayOfWeek);
      const title = buildClassMemoTitle(row);
      const bodyText = getNoticeBodyText(row);
      const hasTooltip = shouldShowNoticeTooltip(row, bodyText);

      return `
        <div class="notice-card memo-from-class ${toneClass}${hasTooltip ? ' has-tooltip' : ''}${hasTooltip ? tooltipBelowClass : ''}"
             ${hasTooltip ? ' tabindex="0" data-notice-tooltip' : ''}>
          <div class="notice-title">📝 ${escapeHtml(title)}</div>
          ${memo ? `<div class="notice-memo">${escapeHtml(memo)}</div>` : ''}
          ${row.child ? `<div class="notice-child">👤 ${escapeHtml(row.child)}</div>` : ''}
          ${hasTooltip ? `<div class="notice-more-hint">터치/클릭하면 전체 본문 보기</div>` : ''}
          ${hasTooltip ? renderNoticeTooltipHtml('💬 수업 메모 · 본문', bodyText) : ''}
        </div>`;
    }

    const alertHtml = row.alertAt
      ? `<div class="notice-alert">${escapeHtml(formatAlertLabel(row.alertAt))}</div>`
      : '';
    const title = row.title || (row.subject === '기타' ? '행정 안내' : row.subject);
    const memo = row.memo ? String(row.memo).trim() : '';
    const bodyText = getNoticeBodyText(row);
    const noticeIcon = getNoticeIcon(title, memo || bodyText);
    const hasTooltip = shouldShowNoticeTooltip(row, bodyText);

    return `
      <div class="notice-card admin-notice${row.isCompleted ? ' is-completed completed' : ''}${hasTooltip ? ' has-tooltip' : ''}${hasTooltip ? tooltipBelowClass : ''}"
           ${hasTooltip ? ' tabindex="0" data-notice-tooltip' : ''}>
        <div class="notice-title" style="${row.isCompleted ? 'text-decoration: line-through; opacity: 0.75;' : ''}">${row.isCompleted ? '✅' : noticeIcon} ${escapeHtml(title)}</div>
        ${alertHtml}
        ${memo ? `<div class="notice-memo">${escapeHtml(memo)}</div>` : ''}
        ${row.child ? `<div class="notice-child">👤 ${escapeHtml(row.child)}</div>` : ''}
        ${hasTooltip ? `<div class="notice-more-hint">터치/클릭하면 전체 본문 보기</div>` : ''}
        ${hasTooltip ? renderNoticeTooltipHtml('📌 공지 본문', bodyText) : ''}
      </div>`;
  }).join('');

  bindNoticeTooltipEvents(container);
}

function bindNoticeTooltipEvents(container) {
  container.querySelectorAll('[data-notice-tooltip]').forEach(card => {
    card.addEventListener('click', (event) => {
      event.stopPropagation();
      const isActive = card.classList.contains('active');
      container.querySelectorAll('.notice-card.has-tooltip.active').forEach(other => {
        if (other !== card) other.classList.remove('active');
      });
      card.classList.toggle('active', !isActive);
    });
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        card.click();
      }
    });
  });
}

function renderAll() {
  renderTopNoticeBanner();
  renderWeeklyGrid();
  renderNotices();
}

window.setChildFilter = function(childKey, btnEl) {
  activeChildFilter = childKey;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btnEl.classList.add('active');
  renderAll();
};

// 시간표 격자 내 개별 메모 툴팁 제어용
window.toggleLessonTooltip = function(event, element) {
  event.stopPropagation();
  const isActive = element.classList.contains('active');
  
  // 다른 활성화된 수업 툴팁 일시 정리
  document.querySelectorAll('.lesson-memo-container.active').forEach(container => {
    if (container !== element) container.classList.remove('active');
  });
  
  if (!isActive) {
    element.classList.add('active');
  } else {
    element.classList.remove('active');
  }
};

// 공지사항 툴팁은 bindNoticeTooltipEvents에서 처리 (레거시 onclick 호환)
window.toggleNoticeTooltip = function(event, cardEl) {
  if (event) event.stopPropagation();
  const isActive = cardEl.classList.contains('active');
  document.querySelectorAll('.notice-card.has-tooltip.active').forEach(card => {
    if (card !== cardEl) card.classList.remove('active');
  });
  cardEl.classList.toggle('active', !isActive);
};

async function loadTimetableData() {
  const statusEl = document.getElementById('syncStatus');

  // ⚡ 1. [초고속 캐시 우선 로드 (0.01초)]
  if (typeof loadTimetableFromCache === 'function') {
    const cached = loadTimetableFromCache();
    if (cached && (cached.staticRows?.length > 0 || cached.overlayRows?.length > 0)) {
      staticTimetableRows = cached.staticRows || [];
      overlayTimetableRows = cached.overlayRows || [];
      allTimetableRows = cached.allRows || [];
      renderAll();
      if (statusEl) {
        statusEl.textContent = `⚡ 캐시 로드 완료 (${staticTimetableRows.length + overlayTimetableRows.length}건) · 최신 동기화 확인 중...`;
        statusEl.className = 'sync-ok';
      }
    }
  }

  if (!staticTimetableRows.length && !overlayTimetableRows.length) {
    if (statusEl) {
      statusEl.textContent = '⏳ 노션 듀얼 DB 동기화 중...';
      statusEl.className = '';
    }
  }

  // 🔄 2. [백그라운드 최신 노션 동기화 (SWR)]
  try {
    if (typeof fetchDualTimetableFromNotion === 'function') {
      const dualResult = await fetchDualTimetableFromNotion();
      staticTimetableRows = dualResult.staticRows || [];
      overlayTimetableRows = dualResult.overlayRows || [];
      allTimetableRows = dualResult.allRows || [];
    } else if (typeof fetchTimetableFromNotion === 'function') {
      allTimetableRows = await fetchTimetableFromNotion();
      staticTimetableRows = allTimetableRows.filter(isClassRow);
      overlayTimetableRows = allTimetableRows.filter(r => !isClassRow(r));
    } else {
      throw new Error('fetchTimetableFromNotion 미로드');
    }

    renderAll();
    const now = new Date();
    const staticCount = staticTimetableRows.length;
    const overlayCount = overlayTimetableRows.length;
    if (statusEl) {
      statusEl.textContent = `✅ ${pad2(now.getHours())}:${pad2(now.getMinutes())} 최신 동기화 완료 (고정 ${staticCount}건 · 알림장 ${overlayCount}건)`;
      statusEl.className = 'sync-ok';
    }
  } catch (err) {
    console.error('[timetable]', err);
    if (!staticTimetableRows.length && !overlayTimetableRows.length) {
      document.getElementById('gridContent').className = 'empty-state';
      document.getElementById('gridContent').innerHTML = '❌ 시간표 데이터를 불러오지 못했습니다.';
      document.getElementById('noticeContent').className = 'empty-state';
      document.getElementById('noticeContent').innerHTML = '연결 실패';
      if (statusEl) {
        statusEl.textContent = '❌ 동기화 실패 — 프록시/DB ID 확인';
        statusEl.className = 'sync-err';
      }
    }
  }
}

updateClock();
setInterval(updateClock, 1000);

window.addEventListener('DOMContentLoaded', () => {
  applyViewerUi();
  loadTimetableData();
  setInterval(loadTimetableData, 5 * 60 * 1000);

  // 바깥 영역 클릭/터치 시 모든 활성화된 툴팁(수업 메모 & 공지사항) 일괄 닫기
  document.addEventListener('click', () => {
    document.querySelectorAll('.lesson-memo-container.active').forEach(container => {
      container.classList.remove('active');
    });
    document.querySelectorAll('.notice-card.has-tooltip.active').forEach(card => {
      card.classList.remove('active');
    });
  });
});
