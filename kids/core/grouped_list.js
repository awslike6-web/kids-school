// kids/core/grouped_list.js
// 📂 공통 「묶음 목록」 부품 (window.GroupedList)
// - 국어 용어방 단원 목차, 정밀 독해 지문 목록, AI 지문 토론방 지문 목록이 같이 쓴다.
// - 묶음(대분류) → 하위 묶음(소분류)을 접고 펴는 <details>로 그리고, 줄은 한 줄에 하나(가로로 길게)씩 놓는다.
// - 펼침형(expandable)이면 줄을 누를 때 그 아래로 요약 + [시작] 버튼이 펼쳐지고(한 번에 하나), 아니면 누르면 바로 시작한다.
// - 마지막으로 고른 줄을 sessionStorage에 기억했다가 목록으로 돌아오면 그 묶음을 펴고 그 줄로 스크롤한다.
// - 화면 글자·정렬·완료 판단은 부르는 쪽이 정해서 넘긴다(이 부품은 그리기만 한다).
(function () {
    'use strict';

    function esc(v) {
        return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    function readMemory(key) {
        if (!key) return '';
        try { return sessionStorage.getItem(`grouped_list_last_${key}`) || ''; } catch (e) { return ''; }
    }
    function writeMemory(key, itemId) {
        if (!key) return;
        try { sessionStorage.setItem(`grouped_list_last_${key}`, String(itemId)); } catch (e) { /* 저장 불가 시 무시 */ }
    }

    function countItems(group) {
        return (group.items || []).length + (group.children || []).reduce((n, c) => n + countItems(c), 0);
    }
    function containsItem(group, itemId) {
        if (!itemId) return false;
        return (group.items || []).some(it => String(it.id) === String(itemId))
            || (group.children || []).some(c => containsItem(c, itemId));
    }

    const STATUS_BADGE = { done: '✅', in_progress: '⏳' };

    function itemHtml(item, idx, opts, expandedId) {
        const status = STATUS_BADGE[item.status] ? `<span class="gl-status">${STATUS_BADGE[item.status]}</span>` : '';
        const num = item.num ? `<span class="gl-num">${esc(item.num)}</span>` : '';
        const meta = item.meta ? `<span class="gl-meta">${esc(item.meta)}</span>` : '';
        const isOpen = opts.expandable && String(item.id) === String(expandedId);
        const detail = opts.expandable ? `
            <div class="gl-detail"${isOpen ? '' : ' hidden'}>
                ${item.summary ? `<p class="gl-summary">${esc(item.summary)}</p>` : ''}
                <button type="button" class="gl-action" data-gl-act="${idx}">${esc(item.actionLabel || opts.actionLabel || '시작하기 ▶')}</button>
            </div>` : '';
        return `<li class="gl-item${isOpen ? ' gl-open' : ''}" data-gl-id="${esc(item.id)}">
            <button type="button" class="gl-row" data-gl-row="${idx}" aria-expanded="${isOpen ? 'true' : 'false'}">
                ${num}<span class="gl-title">${esc(item.title)}</span>${meta}${status}
            </button>${detail}
        </li>`;
    }

    // groups: [{ id, title, icon, open, highlight, note, items:[...], children:[같은 모양] }]
    // item: { id, num, title, meta, summary, section, status('done'|'in_progress'), actionLabel }
    function buildHtml(groups, options = {}) {
        const opts = { expandable: false, ...options };
        const flat = [];
        const lastId = opts.lastItemId || '';
        const expandedId = opts.expandable ? lastId : '';

        function listHtml(items) {
            let prevSection = null;
            const rows = (items || []).map(item => {
                const idx = flat.push(item) - 1;
                let head = '';
                if (item.section && item.section !== prevSection) {
                    head = `<li class="gl-section">${esc(item.section)}</li>`;
                }
                prevSection = item.section || null;
                return head + itemHtml(item, idx, opts, expandedId);
            }).join('');
            return rows ? `<ul class="gl-list">${rows}</ul>` : '';
        }

        function groupHtml(group, depth) {
            const total = countItems(group);
            const open = group.open || containsItem(group, lastId) || group.highlight;
            const cls = `gl-group gl-depth-${depth}${group.highlight ? ' gl-highlight' : ''}`;
            const note = group.note ? `<p class="gl-note">${esc(group.note)}</p>` : '';
            const body = (group.children || []).map(c => groupHtml(c, depth + 1)).join('') + listHtml(group.items);
            return `<details class="${cls}" data-gl-group="${esc(group.id || '')}"${open ? ' open' : ''}>
                <summary><span class="gl-group-title">${group.icon ? esc(group.icon) + ' ' : ''}${esc(group.title)}</span><span class="gl-count">${total}</span></summary>
                ${note}${body || (note ? '' : `<p class="gl-empty">${esc(opts.emptyText || '아직 없어요.')}</p>`)}
            </details>`;
        }

        const visible = (groups || []).filter(g => countItems(g) > 0 || g.note);
        const html = visible.length
            ? visible.map(g => groupHtml(g, 0)).join('')
            : `<p class="gl-empty">${esc(opts.emptyText || '아직 없어요.')}</p>`;
        return { html: `<div class="grouped-list">${html}</div>`, items: flat };
    }

    function render(container, groups, options = {}) {
        if (!container) return;
        const lastItemId = options.lastItemId ?? readMemory(options.memoryKey);
        const { html, items } = buildHtml(groups, { ...options, lastItemId });
        container.innerHTML = html;
        const state = { items, options };

        const pick = (item) => {
            writeMemory(options.memoryKey, item.id);
            if (typeof options.onPick === 'function') options.onPick(item);
        };
        const root = container.querySelector('.grouped-list');
        if (!root) return;
        root.addEventListener('click', (ev) => {
            const act = ev.target.closest('[data-gl-act]');
            if (act) { pick(state.items[Number(act.dataset.glAct)]); return; }
            const row = ev.target.closest('[data-gl-row]');
            if (!row) return;
            const item = state.items[Number(row.dataset.glRow)];
            if (!options.expandable) { pick(item); return; }
            const li = row.closest('.gl-item');
            const willOpen = !li.classList.contains('gl-open');
            root.querySelectorAll('.gl-item.gl-open').forEach(other => {
                other.classList.remove('gl-open');
                other.querySelector('.gl-detail')?.setAttribute('hidden', '');
                other.querySelector('.gl-row')?.setAttribute('aria-expanded', 'false');
            });
            if (willOpen) {
                li.classList.add('gl-open');
                li.querySelector('.gl-detail')?.removeAttribute('hidden');
                row.setAttribute('aria-expanded', 'true');
                writeMemory(options.memoryKey, item.id);
                if (typeof li.scrollIntoView === 'function') li.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
        });

        // 돌아왔을 때 마지막으로 고른 줄을 화면 안으로
        if (lastItemId) {
            const target = [...root.querySelectorAll('.gl-item')].find(el => el.dataset.glId === String(lastItemId));
            if (target && typeof target.scrollIntoView === 'function') {
                setTimeout(() => target.scrollIntoView({ block: 'center' }), 0);
            }
        }
    }

    window.GroupedList = { buildHtml, render, escapeHtml: esc };
})();
