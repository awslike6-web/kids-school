// kids/js/timetable_grid.js - timetable_controller.js 분리 2/3: 주간 격자·모바일 스크롤·배너·모달 (순서대로 로드)
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

  // 🌟 [모바일 2일 뷰포트] 오늘 요일 페어 판별 (0=일, 1=월, 2=화, 3=수, 4=목, 5=금, 6=토)
  const dayNum = new Date().getDay();
  let defaultPair = 'mon-tue';
  if (dayNum === 2) {
    defaultPair = 'tue-wed';
  } else if (dayNum === 3) {
    defaultPair = 'wed-thu';
  } else if (dayNum === 4 || dayNum === 5) {
    defaultPair = 'thu-fri';
  } else {
    defaultPair = 'mon-tue';
  }

  // 모바일 전용 요일 페어 퀵 네비게이션 탭 바 (월화 / 화수 / 수목 / 목금)
  const mobilePairNavHtml = `
    <div class="mobile-day-pair-nav" id="mobileDayPairNav">
      <button type="button" class="day-pair-btn ${defaultPair === 'mon-tue' ? 'active' : ''}" data-pair="mon-tue" onclick="scrollToDayPair('mon-tue')">
        ${dayNum === 1 ? '<span class="today-dot"></span>' : ''}월 · 화
      </button>
      <button type="button" class="day-pair-btn ${defaultPair === 'tue-wed' ? 'active' : ''}" data-pair="tue-wed" onclick="scrollToDayPair('tue-wed')">
        ${dayNum === 2 ? '<span class="today-dot"></span>' : ''}화 · 수
      </button>
      <button type="button" class="day-pair-btn ${defaultPair === 'wed-thu' ? 'active' : ''}" data-pair="wed-thu" onclick="scrollToDayPair('wed-thu')">
        ${dayNum === 3 ? '<span class="today-dot"></span>' : ''}수 · 목
      </button>
      <button type="button" class="day-pair-btn ${defaultPair === 'thu-fri' ? 'active' : ''}" data-pair="thu-fri" onclick="scrollToDayPair('thu-fri')">
        ${(dayNum === 4 || dayNum === 5) ? '<span class="today-dot"></span>' : ''}목 · 금
      </button>
    </div>
  `;

  container.className = '';
  container.innerHTML = `
    ${mobilePairNavHtml}
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

  // 🌟 [모바일 2일 뷰포트] 기기 화면 폭에 맞춘 동적 너비 계산 및 오늘 요일 자동 스크롤
  adjustMobileColumnWidths();
  autoScrollToTodayPair(defaultPair);
  initMobileScrollSync();
}

/**
 * 🌟 [모바일 2일 뷰포트] 스마트폰 화면 폭에 맞춰 요일 2개 열이 100% 꽉 차도록 동적 너비 계산
 */
function adjustMobileColumnWidths() {
  if (window.innerWidth > 900) return;
  const gridWrap = document.querySelector('.grid-wrap');
  if (!gridWrap) return;

  const periodTh = gridWrap.querySelector('th.period-col');
  const periodWidth = periodTh ? periodTh.offsetWidth : 78;
  const visibleWidth = gridWrap.clientWidth;

  if (visibleWidth > periodWidth) {
    const dayColWidth = Math.floor((visibleWidth - periodWidth) / 2);
    document.documentElement.style.setProperty('--mobile-day-w', `${dayColWidth}px`);
  }
}

/**
 * 🌟 [모바일 2일 뷰포트] 페어 키와 인덱스 매핑 상수
 */
const MOBILE_PAIR_INDICES = {
  'mon-tue': 0,
  'tue-wed': 1,
  'wed-thu': 2,
  'thu-fri': 3
};
const MOBILE_PAIR_KEYS = ['mon-tue', 'tue-wed', 'wed-thu', 'thu-fri'];

/**
 * 🌟 [모바일 2일 뷰포트] 지정한 요일 페어('mon-tue', 'tue-wed', 'wed-thu', 'thu-fri')로 스크롤 이동
 */
window.scrollToDayPair = function(pairKey, isSmooth = true) {
  const gridWrap = document.querySelector('.grid-wrap');
  if (!gridWrap || window.innerWidth > 900) return;

  const targetIndex = MOBILE_PAIR_INDICES[pairKey] ?? 0;
  const dayCol = gridWrap.querySelector('th:not(.period-col)');
  const dayWidth = dayCol ? dayCol.offsetWidth : (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--mobile-day-w')) || 140);

  let targetLeft = Math.round(targetIndex * dayWidth);
  const maxScroll = Math.max(0, gridWrap.scrollWidth - gridWrap.clientWidth);
  if (targetLeft > maxScroll) {
    targetLeft = maxScroll;
  }

  gridWrap.scrollTo({
    left: targetLeft,
    behavior: isSmooth ? 'smooth' : 'auto'
  });

  // 버튼 active 클래스 갱신
  document.querySelectorAll('.day-pair-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.pair === pairKey);
  });
};

/**
 * 🌟 [모바일 2일 뷰포트] 오늘 요일에 맞춰 최적 요일 쌍으로 자동 스크롤
 */
function autoScrollToTodayPair(targetPair) {
  if (window.innerWidth > 900) return;
  setTimeout(() => {
    adjustMobileColumnWidths();
    scrollToDayPair(targetPair, false);
  }, 60);
}

/**
 * 🌟 [모바일 2일 뷰포트] 스크롤 시 현재 화면에 보이는 요일 페어 버튼 활성화 동기화
 */
function initMobileScrollSync() {
  const gridWrap = document.querySelector('.grid-wrap');
  if (!gridWrap || gridWrap._scrollSyncBound) return;
  gridWrap._scrollSyncBound = true;

  let scrollTimeout = null;
  gridWrap.addEventListener('scroll', () => {
    if (window.innerWidth > 900) return;
    if (scrollTimeout) clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      const dayCol = gridWrap.querySelector('th:not(.period-col)');
      const dayWidth = dayCol ? dayCol.offsetWidth : (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--mobile-day-w')) || 140);
      const currentScroll = gridWrap.scrollLeft;

      const detectedIdx = Math.min(3, Math.max(0, Math.round(currentScroll / dayWidth)));
      const activePair = MOBILE_PAIR_KEYS[detectedIdx] || 'mon-tue';

      document.querySelectorAll('.day-pair-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.pair === activePair);
      });
    }, 60);
  }, { passive: true });
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
 * 💡 [아빠/부모 전용] 알림장 등록 표준 가이드 모달 열기
 */
window.openNoticeGuideModal = function() {
  const portal = document.getElementById('overlayModalPortal');
  if (!portal) return;

  portal.innerHTML = `
    <div class="overlay-modal-backdrop" onclick="window.closeOverlayModal(event)">
      <div class="overlay-modal-card guide-modal-card" onclick="event.stopPropagation()" 
           style="max-width: 600px; width: 92%; max-height: 85vh; overflow-y: auto; box-sizing: border-box; border: 1.5px solid rgba(255, 217, 61, 0.4); box-shadow: 0 16px 50px rgba(0,0,0,0.6), 0 0 30px rgba(255, 217, 61, 0.2);">
        
        <div class="overlay-modal-header" style="border-bottom: 2px dashed rgba(255,217,61,0.3); padding-bottom: 12px;">
          <span class="overlay-modal-badge" style="background: linear-gradient(135deg, #ffd93d, #ff9f43); color: #1a102f; font-weight: 800; padding: 4px 12px; border-radius: 999px; font-size: 0.85rem;">
            💡 알림장 등록 표준 가이드
          </span>
          <button class="overlay-modal-close" onclick="window.closeOverlayModal()">✕</button>
        </div>

        <div class="overlay-modal-body" style="font-size: 0.95rem; line-height: 1.65; color: #e2e8f0; padding-top: 14px;">
          <!-- 1. 핵심 대원칙 -->
          <div style="background: rgba(255,217,61,0.1); border-left: 4px solid #ffd93d; padding: 12px 14px; border-radius: 8px; margin-bottom: 16px;">
            <div style="font-weight: bold; color: #ffd93d; font-size: 1.02rem; margin-bottom: 4px;">🎒 핵심 대원칙</div>
            <div style="color: #ffffff; font-weight: 700; font-size: 0.96rem; word-break: keep-all;">
              "알림장은 받은 날이 아니라, 아이가 가방 메고 학교에 가는 날(내일 등교일) 시간표에 꽂아둡니다!"
            </div>
          </div>

          <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px;">
            <!-- 2. 일일 전체 공지 -->
            <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 12px 14px;">
              <div style="font-weight: bold; color: #ff6b81; font-size: 0.98rem; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
                <span>🚩</span> <span>1. 내일 하루 전체 공지 (단축수업, 행사, 복장, 급식)</span>
              </div>
              <ul style="margin: 0; padding-left: 18px; color: #cbd5e1; font-size: 0.9rem;">
                <li><b>날짜 / 요일</b>: <span style="color:#00f2fe; font-weight:bold;">내일 날짜</span> (예: 수요일 오후에 받았으면 ➔ <b>목요일</b>로 지정)</li>
                <li><b>적용 범위</b>: <code style="background:rgba(255,255,255,0.1); padding:2px 5px; border-radius:4px; color:#ffd93d;">일일 전체</code> 선택</li>
                <li><b>표시 위치</b>: 목요일 시간표 <b>열 맨 위 헤더</b>에 🚩 뱃지와 메모로 노출</li>
              </ul>
            </div>

            <!-- 3. 과목별 준비물 -->
            <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 12px 14px;">
              <div style="font-weight: bold; color: #6EC6F5; font-size: 0.98rem; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
                <span>🎒</span> <span>2. 특정 과목 준비물 및 숙제 (수학 익힘책, 미술 도구 등)</span>
              </div>
              <ul style="margin: 0; padding-left: 18px; color: #cbd5e1; font-size: 0.9rem;">
                <li><b>날짜 / 요일</b>: <span style="color:#00f2fe; font-weight:bold;">내일(또는 해당 과목 요일)</span></li>
                <li><b>과목</b>: <code style="background:rgba(255,255,255,0.1); padding:2px 5px; border-radius:4px; color:#ffd93d;">해당 과목</code> (수학, 미술, 국어 등)</li>
                <li><b>적용 범위</b>: <code style="background:rgba(255,255,255,0.1); padding:2px 5px; border-radius:4px; color:#ffd93d;">과목별</code> 선택</li>
                <li><b>표시 위치</b>: 시간표 <b>해당 과목 칸에 🎒 빨간 배지</b> 부착 (터치 시 팝업 및 <b>[챙겼어요! ✅]</b> 완료 체크 지원)</li>
              </ul>
            </div>

            <!-- 🌟 [실전 꿀팁 ①] 주간 과제(글쓰기/독서록 등) 등록 팁 -->
            <div style="background: rgba(167, 139, 250, 0.08); border: 1px solid rgba(167, 139, 250, 0.3); border-radius: 12px; padding: 12px 14px;">
              <div style="font-weight: bold; color: #a78bfa; font-size: 0.98rem; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
                <span>✍️</span> <span>3. 주간 과제 (1주일에 1편 글쓰기 · 독서록 등)</span>
              </div>
              <ul style="margin: 0; padding-left: 18px; color: #cbd5e1; font-size: 0.9rem; line-height: 1.55;">
                <li><b>날짜 설정</b>: <span style="color:#00f2fe; font-weight:bold;">기간형(월요일 ~ 금요일)</span>으로 등록</li>
                <li><b>유지 & 체크</b>: 한 주 내내 시간표 상단에 상시 표시되며, 아이가 과제를 마쳤을 때 <b>[챙겼어요! ✅]</b>를 누르면 완료(취소선) 처리됩니다.</li>
              </ul>
            </div>

            <!-- 🌟 [실전 꿀팁 ②] 아이 맞춤 정제 팁 (불필요한 혼선 방지) -->
            <div style="background: rgba(46, 213, 115, 0.08); border: 1px solid rgba(46, 213, 115, 0.3); border-radius: 12px; padding: 12px 14px;">
              <div style="font-weight: bold; color: #2ed573; font-size: 0.98rem; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
                <span>🎯</span> <span>4. 해당 없는 내용은 과감히 빼고 등록하기!</span>
              </div>
              <div style="color: #cbd5e1; font-size: 0.88rem; line-height: 1.55;">
                전체 알림장 중 우리 아이가 제외되거나 해당하지 않는 안내(예: 민수 제외 학습지 등)는 공지에서 <b>과감히 제외</b>하고, 아이가 직접 해야 할 핵심 미션만 남겨서 등록하면 인지 부담과 불필요한 혼선을 완벽히 방지할 수 있습니다.
              </div>
            </div>

            <!-- 5. 실행일 기준의 장점 -->
            <div style="background: rgba(0,242,254,0.05); border: 1px solid rgba(0,242,254,0.22); border-radius: 12px; padding: 12px 14px;">
              <div style="font-weight: bold; color: #00f2fe; font-size: 0.92rem; margin-bottom: 5px;">
                ✨ 왜 실행일(내일)로 등록하면 좋을까요?
              </div>
              <div style="font-size: 0.86rem; color: #94a3b8; line-height: 1.55;">
                • <b>오늘 저녁 가방 쌀 때</b>: '내일' 세로 한 줄만 위에서 아래로 훑어보면 준비 완료!<br>
                • <b>내일 아침 등교 직전</b>: 당일 시간표 헤더에 공지가 그대로 살아있어 빼먹지 않음!<br>
                • <b>수신 시간 보존</b>: 노션 DB에 생성 시각(초 단위)이 자동 기록되니 안심하세요.
              </div>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.08); flex-wrap: wrap;">
            <a href="https://app.notion.com/p/e3f9b3917c2b48bfa3d47db4bd0545fd" target="_blank" rel="noopener noreferrer" 
               style="display: inline-flex; align-items: center; gap: 6px; color: #ffd93d; text-decoration: none; font-size: 0.88rem; font-weight: bold; padding: 6px 10px; border-radius: 8px; background: rgba(255,217,61,0.1);">
              🔗 노션 알림장 DB 원본 열기 ↗
            </a>
            <button onclick="window.closeOverlayModal()" 
                    style="background: #2e244d; border: 1px solid rgba(255,255,255,0.18); color: #ffffff; padding: 8px 18px; border-radius: 10px; cursor: pointer; font-weight: bold; font-size: 0.9rem;">
              확인 완료 👍
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
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

