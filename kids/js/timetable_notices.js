// kids/js/timetable_notices.js - timetable_controller.js 분리 3/3: 공지·자녀 필터·툴팁·데이터 로드·초기화 (순서대로 로드)
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

  // 📱 모바일 화면 회전 및 리사이즈 시 컬럼 너비 재조정
  window.addEventListener('resize', () => {
    adjustMobileColumnWidths();
  });

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
