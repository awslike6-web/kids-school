/* kids/js/festival_controller.js - 2026 원신초 학예발표회 안내 화면 제어 (필터 · 접이식 · 현장 진행 체크) */
(function (global) {
  'use strict';

  const STORAGE_KEY = 'minmin_festival_2026_done_v1';

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // KST 로컬 날짜 헬퍼 (UTC 슬라이싱 금지)
  function getLocalYmd(now) {
    const d = now || new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function computeDdayLabel(targetYmd, now) {
    const todayYmd = getLocalYmd(now);
    const [ty, tm, td] = targetYmd.split('-').map(Number);
    const [cy, cm, cd] = todayYmd.split('-').map(Number);
    const targetUtc = Date.UTC(ty, tm - 1, td);
    const todayUtc = Date.UTC(cy, cm - 1, cd);
    const diff = Math.round((targetUtc - todayUtc) / 86400000);
    if (diff > 0) return `D-${diff}`;
    if (diff === 0) return '🎉 오늘 학예회!';
    return `종료 (D+${Math.abs(diff)})`;
  }

  function loadDoneOrders(storage) {
    try {
      const store = storage || global.localStorage;
      const raw = store && store.getItem(STORAGE_KEY);
      if (!raw) return new Set();
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return new Set();
      return new Set(parsed.filter(n => Number.isInteger(n) && n > 0));
    } catch {
      return new Set();
    }
  }

  function saveDoneOrders(doneSet, storage) {
    try {
      const store = storage || global.localStorage;
      if (store) {
        store.setItem(STORAGE_KEY, JSON.stringify([...doneSet].sort((a, b) => a - b)));
      }
    } catch {
      // 스토리지 비활성 환경에서는 메모리 상태만 유지
    }
  }

  function isHighlighted(item) {
    return item.child === 'minseo' || item.child === 'minsu' || item.child === 'check';
  }

  function findNextFamilyStage(programs, doneSet) {
    const stages = programs.filter(p => p.order > 0);
    const remaining = stages.filter(p => !doneSet.has(p.order));
    const nextFamily = remaining.find(isHighlighted) || null;
    if (!nextFamily) {
      return {
        next: null,
        waitingCount: 0,
        completedCount: stages.filter(p => doneSet.has(p.order)).length,
        totalCount: stages.length
      };
    }
    const waitingCount = remaining.filter(p => p.order < nextFamily.order).length;
    return {
      next: nextFamily,
      waitingCount,
      completedCount: stages.filter(p => doneSet.has(p.order)).length,
      totalCount: stages.length
    };
  }

  function groupForFocusView(programs) {
    const blocks = [];
    let buffer = [];

    function flushBuffer() {
      if (!buffer.length) return;
      blocks.push({ type: 'between', items: buffer });
      buffer = [];
    }

    for (const item of programs) {
      if (item.part === 'break') {
        flushBuffer();
        blocks.push({ type: 'break', item });
      } else if (isHighlighted(item)) {
        flushBuffer();
        blocks.push({ type: 'stage', item });
      } else {
        buffer.push(item);
      }
    }
    flushBuffer();
    return blocks;
  }

  function formatChildBadge(item) {
    if (item.child === 'minseo') return '<span class="badge badge-minseo">👧 민서</span>';
    if (item.child === 'minsu') return '<span class="badge badge-minsu">👦 민수</span>';
    if (item.child === 'check') return '<span class="badge badge-check">❓ 민서? 확인 필요</span>';
    return '';
  }

  function renderStageCard(item, doneSet, nextOrder) {
    const isDone = doneSet.has(item.order);
    const isNext = nextOrder === item.order;
    const roleClass = item.child ? `is-${item.child}` : '';
    const stateClasses = [roleClass, isDone ? 'is-done' : '', isNext ? 'is-next' : ''].filter(Boolean).join(' ');
    const whoText = item.child === 'minseo' ? '민서' : item.child === 'minsu' ? '민수' : item.group;
    const toggleLabel = `${item.order}번 ${whoText} ${item.genre} 무대 완료 체크`;

    const moreDetailHtml = item.note
      ? `<details class="stage-more" data-more-order="${item.order}">
           <summary>순서 포인트 · 자세히 보기</summary>
           <div class="stage-more-body">${escapeHtml(item.note)}</div>
         </details>`
      : '';

    return `
      <article class="stage-card ${stateClasses}" data-order="${item.order}">
        <div class="stage-top">
          <div class="stage-main">
            <span class="stage-num" aria-hidden="true">${item.order}</span>
            <div class="stage-info">
              <div class="stage-badges">
                ${formatChildBadge(item)}
                ${isNext ? '<span class="badge badge-next">다음 차례</span>' : ''}
                <span class="badge badge-genre">${escapeHtml(item.genre)}</span>
                <span class="badge badge-group">${escapeHtml(item.group)}</span>
              </div>
              <div class="stage-title">${escapeHtml(item.title)}</div>
            </div>
          </div>
          <button type="button"
                  class="done-toggle"
                  data-toggle-order="${item.order}"
                  aria-pressed="${isDone ? 'true' : 'false'}"
                  aria-label="${escapeHtml(toggleLabel)}">
            ${isDone ? '✅ 완료' : '체크'}
          </button>
        </div>
        ${moreDetailHtml}
      </article>`;
  }

  function renderBetweenGroup(items, doneSet, nextOrder) {
    const first = items[0].order;
    const last = items[items.length - 1].order;
    const doneInGroup = items.filter(i => doneSet.has(i.order)).length;
    const rangeLabel = first === last ? `${first}번` : `${first}~${last}번`;
    const progressText = doneInGroup > 0 ? ` · ${doneInGroup}/${items.length} 완료` : '';
    const innerHtml = items.map(i => renderStageCard(i, doneSet, nextOrder)).join('');

    return `
      <details class="between-group" data-group-range="${first}-${last}">
        <summary>앞·사이 무대 ${items.length}팀 보기 (${rangeLabel}${progressText})</summary>
        <div class="between-list">${innerHtml}</div>
      </details>`;
  }

  function initFestivalPage() {
    const data = global.FESTIVAL_2026_DATA;
    if (!data || typeof document === 'undefined') return;

    const ddayEl = document.getElementById('festivalDday');
    const warnEl = document.getElementById('warningStrip');
    const kidsEl = document.getElementById('kidsOverview');
    const originEl = document.getElementById('originBody');
    const timelineEl = document.getElementById('programTimeline');
    const filterBar = document.getElementById('festivalFilterBar');
    const nextTextEl = document.getElementById('nextStageText');
    const progressPill = document.getElementById('progressPill');
    const progressFill = document.getElementById('progressBarFill');
    const resetBtn = document.getElementById('resetProgressBtn');

    if (!timelineEl) return;

    let activeFilter = 'focus';
    let doneSet = loadDoneOrders();

    if (ddayEl) ddayEl.textContent = computeDdayLabel(data.date);

    if (warnEl) {
      warnEl.innerHTML = data.warnings.map(w =>
        `<span class="warning-chip">${escapeHtml(w.icon)} ${escapeHtml(w.label)}</span>`
      ).join('');
    }

    if (kidsEl) {
      kidsEl.innerHTML = data.childrenSummary.map(c =>
        `<span class="kid-chip is-${escapeHtml(c.key)}">${escapeHtml(c.icon)} ${escapeHtml(c.name)} ${c.confirmedCount}무대 (${escapeHtml(c.gradeLabel)})</span>`
      ).join('');
    }

    if (originEl) {
      const greetingHtml = data.greeting.map(p => `<p>${escapeHtml(p)}</p>`).join('');
      const warningListHtml = data.warnings.map(w =>
        `<div>• <strong>${escapeHtml(w.label)}</strong>: ${escapeHtml(w.detail)}</div>`
      ).join('');
      originEl.innerHTML = `
        <div class="origin-greeting">${greetingHtml}</div>
        <div class="origin-meta">
          <div><strong>문서</strong>: ${escapeHtml(data.docNo)} · ${escapeHtml(data.officialTitle)} (${escapeHtml(data.issuedDate)}, ${escapeHtml(data.issuer)})</div>
          <div><strong>일시</strong>: ${escapeHtml(data.dateLabel)} ${escapeHtml(data.timeRange)}</div>
          <div><strong>장소</strong>: ${escapeHtml(data.venue)}</div>
          <div><strong>주소</strong>: ${escapeHtml(data.address)}</div>
          ${warningListHtml}
        </div>
        <a class="phone-link" href="tel:${escapeHtml(data.phone)}">📞 담당자 전화 ${escapeHtml(data.phoneDisplay)}</a>`;
    }

    function renderTracker() {
      const status = findNextFamilyStage(data.programs, doneSet);
      if (progressPill) progressPill.textContent = `${status.completedCount} / ${status.totalCount} 완료`;
      if (progressFill) {
        const pct = status.totalCount ? Math.round((status.completedCount / status.totalCount) * 100) : 0;
        progressFill.style.width = `${pct}%`;
      }
      if (resetBtn) resetBtn.hidden = status.completedCount === 0;
      if (nextTextEl) {
        if (!status.next) {
          nextTextEl.innerHTML = '🎉 <strong>우리 아이 무대가 모두 끝났습니다!</strong> 수고한 민수·민서에게 큰 박수를 보내주세요.';
        } else {
          const who = status.next.child === 'minseo' ? '👧 민서'
            : status.next.child === 'minsu' ? '👦 민수'
            : '❓ 확인 필요(K-POP댄스부)';
          const waitText = status.waitingCount === 0
            ? '바로 다음 순서입니다!'
            : `앞으로 ${status.waitingCount}팀 뒤입니다.`;
          nextTextEl.innerHTML = `다음 우리 아이 무대: <strong>${status.next.order}번 ${who} · ${escapeHtml(status.next.genre)}</strong> — ${waitText}`;
        }
      }
      return status.next ? status.next.order : null;
    }

    function renderTimeline() {
      const openGroups = new Set(
        [...timelineEl.querySelectorAll('details.between-group[open]')].map(el => el.dataset.groupRange)
      );
      const openDetails = new Set(
        [...timelineEl.querySelectorAll('details.stage-more[open]')].map(el => el.dataset.moreOrder)
      );
      const nextOrder = renderTracker();
      const partsHtml = [];

      if (activeFilter === 'focus') {
        const blocks = groupForFocusView(data.programs);
        partsHtml.push('<div class="part-banner">1부 (1 ~ 10번)</div>');
        for (const block of blocks) {
          if (block.type === 'break') {
            partsHtml.push(`
              <div class="break-card">
                <div class="break-title">☕ ${escapeHtml(block.item.title)}</div>
                <p class="break-note">${escapeHtml(block.item.note)}</p>
              </div>
              <div class="part-banner">2부 (11 ~ 17번)</div>`);
          } else if (block.type === 'stage') {
            partsHtml.push(renderStageCard(block.item, doneSet, nextOrder));
          } else {
            partsHtml.push(renderBetweenGroup(block.items, doneSet, nextOrder));
          }
        }
      } else {
        const filtered = data.programs.filter(item => {
          if (item.part === 'break') return activeFilter === 'all' || activeFilter === 'minseo' || activeFilter === 'minsu';
          if (activeFilter === 'all') return true;
          if (activeFilter === 'minseo') return item.child === 'minseo' || item.child === 'check';
          if (activeFilter === 'minsu') return item.child === 'minsu';
          return true;
        });
        partsHtml.push('<div class="part-banner">1부 (1 ~ 10번)</div>');
        for (const item of filtered) {
          if (item.part === 'break') {
            partsHtml.push(`
              <div class="break-card">
                <div class="break-title">☕ ${escapeHtml(item.title)}</div>
                <p class="break-note">${escapeHtml(item.note)}</p>
              </div>
              <div class="part-banner">2부 (11 ~ 17번)</div>`);
          } else {
            partsHtml.push(renderStageCard(item, doneSet, nextOrder));
          }
        }
      }

      timelineEl.innerHTML = partsHtml.join('');
      for (const el of timelineEl.querySelectorAll('details.between-group')) {
        if (openGroups.has(el.dataset.groupRange)) el.open = true;
      }
      for (const el of timelineEl.querySelectorAll('details.stage-more')) {
        if (openDetails.has(el.dataset.moreOrder)) el.open = true;
      }
    }

    if (filterBar) {
      filterBar.addEventListener('click', event => {
        const btn = event.target.closest('button[data-filter]');
        if (!btn) return;
        activeFilter = btn.dataset.filter || 'focus';
        for (const chip of filterBar.querySelectorAll('button[data-filter]')) {
          const isActive = chip === btn;
          chip.classList.toggle('active', isActive);
          chip.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        }
        renderTimeline();
      });
    }

    timelineEl.addEventListener('click', event => {
      const btn = event.target.closest('button[data-toggle-order]');
      if (!btn) return;
      const order = Number(btn.dataset.toggleOrder);
      if (!Number.isInteger(order) || order <= 0) return;
      if (doneSet.has(order)) {
        doneSet.delete(order);
      } else {
        doneSet.add(order);
      }
      saveDoneOrders(doneSet);
      renderTimeline();
    });

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        doneSet = new Set();
        saveDoneOrders(doneSet);
        renderTimeline();
      });
    }

    renderTimeline();
  }

  global.FestivalGuide = Object.freeze({
    STORAGE_KEY,
    getLocalYmd,
    computeDdayLabel,
    findNextFamilyStage,
    groupForFocusView,
    initFestivalPage
  });

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', initFestivalPage);
  }
})(typeof window !== 'undefined' ? window : globalThis);
