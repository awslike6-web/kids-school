/*
 * 민민 시스템 조감도 화면 (minmin_system_map.html 전용)
 * - 데이터: scripts/data/system_map_*.js 가 만든 window.SYSTEM_MAP_DATA 를 읽기만 합니다.
 * - 화면 3개: 첫 화면(증상·기능·검색 입구) → 5단계 흐름(카드·서랍·연결선·상세) → DB·캐시 규칙.
 * - 주소 끝(#)으로 상태를 기억합니다: #flow/korean, #flow/all, #trouble/3, #schema (뒤로 가기 지원)
 * - 공개 페이지: 비공개 저장소 파일은 생성 데이터에 개수만 있으므로 이름을 그리지 않습니다.
 */
(function () {
  'use strict';

  const STAGES = [
    { key: 'source', no: '1단계', name: '입력 스크립트', sub: 'CLI · 등록 도구', color: 'var(--c-source)' },
    { key: 'skill', no: '2단계', name: '스킬 · 명세', sub: '.agent/skills · docs', color: 'var(--c-skill)' },
    { key: 'module', no: '3단계', name: '프론트 모듈', sub: 'JS · CSS · HTML', color: 'var(--c-module)' },
    { key: 'pipe', no: '4단계', name: '파이프라인 · 캐시', sub: 'Worker · 캐시 · 음성', color: 'var(--c-pipe)' },
    { key: 'db', no: '5단계', name: '노션 DB', sub: 'Notion SSOT', color: 'var(--c-db)' }
  ];
  const STAGE_OF = Object.fromEntries(STAGES.map(s => [s.key, s]));
  const WIDE = 900;     // 이 폭부터 연결선을 그림
  const SIDE = 1200;    // 이 폭부터 상세 패널이 오른쪽에 붙음

  const state = {
    view: 'home',       // home | map | schema
    domain: 'all',
    query: '',
    selected: null,     // { type: 'node', id } | { type: 'tray', index } | { type: 'trouble', index }
    openTrays: new Set(),
    trayItems: [],
    prompt: ''
  };

  const $ = id => document.getElementById(id);
  const data = () => window.SYSTEM_MAP_DATA;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const nodeById = id => data().nodes.find(n => n.id === id);
  const domainLabel = key => key === 'all' ? '🗺️ 전체 지도' : (data().domains.find(d => d.key === key)?.label || key);

  // ───────── 시작 ─────────
  function init() {
    if (!window.SYSTEM_MAP_DATA) return;
    renderBadge();
    renderStats();
    renderHomeChips();
    renderTroubles();
    bindEvents();
    applyRoute();
  }

  function bindEvents() {
    document.addEventListener('click', onClick);
    $('search-input').addEventListener('input', e => setQuery(e.target.value));
    $('hero-search').addEventListener('input', e => {
      const input = $('search-input');
      input.value = e.target.value;
      e.target.value = '';
      setQuery(input.value);
      input.focus();
    });
    window.addEventListener('hashchange', applyRoute);
    let raf = 0;
    window.addEventListener('resize', () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => { drawConnections(); syncSheet(); });
    });
    document.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); $('search-input').focus(); }
      if (e.key === 'Escape' && state.selected) resetSelection();
    });
  }

  // 모든 버튼은 data-act 로 처리 (문자열 onclick 이스케이프 문제를 피함)
  function onClick(e) {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const { act, arg } = el.dataset;
    if (act === 'home') go('');
    else if (act === 'view') go(arg === 'map' ? `flow/${state.domain}` : arg);
    else if (act === 'domain') go(`flow/${arg}`);
    else if (act === 'trouble') go(`trouble/${arg}`);
    else if (act === 'node') selectNode(arg);
    else if (act === 'tray') selectTray(Number(arg), el);
    else if (act === 'copy') copyPrompt(el);
    else if (act === 'close') resetSelection();
  }

  // ───────── 주소(#) → 화면 상태 ─────────
  function go(hash) {
    if (location.hash.slice(1) === hash) applyRoute();
    else location.hash = hash;
  }

  function applyRoute() {
    const [kind, arg] = decodeURIComponent(location.hash.slice(1)).split('/');
    const troubles = data().troubles;
    state.selected = null;
    if (kind === 'flow') {
      state.view = 'map';
      state.domain = arg === 'all' || data().domains.some(d => d.key === arg) ? arg : 'all';
      clearQuery();   // 기능 칩을 누르면 검색을 풀고 그 기능 흐름을 보여 줌
    } else if (kind === 'trouble' && troubles[Number(arg)]) {
      state.view = 'map';
      state.domain = troubles[Number(arg)].domainKey || 'all';
      state.selected = { type: 'trouble', index: Number(arg) };
      clearQuery();
    } else if (kind === 'schema') {
      state.view = 'schema';
    } else {
      state.view = 'home';
      clearQuery();
    }
    render();
  }

  function clearQuery() {
    state.query = '';
    $('search-input').value = '';
  }

  function setQuery(value) {
    state.query = value;
    state.selected = null;
    if (state.view !== 'map') {
      state.domain = 'all';
      history.replaceState(null, '', '#flow/all');
      state.view = 'map';
    }
    render();
  }

  // ───────── 그리기 ─────────
  let lastView = null;
  function render() {
    $('view-home').classList.toggle('hidden', state.view !== 'home');
    $('view-map').classList.toggle('hidden', state.view !== 'map');
    $('view-schema').classList.toggle('hidden', state.view !== 'schema');
    document.querySelectorAll('.sm-nav button').forEach(b => b.classList.toggle('on', b.dataset.arg === state.view));
    if (state.view === 'map') {
      renderFlowChips();
      renderBoard();
      applySelection();
      requestAnimationFrame(drawConnections);   // 글꼴·배치가 자리 잡은 뒤 한 번 더
    } else {
      syncSheet();
    }
    if (lastView !== state.view || state.selected?.type === 'trouble') window.scrollTo({ top: 0 });
    lastView = state.view;
  }

  function renderBadge() {
    const { lastUpdated, catalogUpdatedAt } = data();
    const badge = $('sync-badge');
    badge.textContent = `기준 ${lastUpdated || '미동기화'}`;
    badge.title = catalogUpdatedAt
      ? `CORE_CATALOG.md 변경 시각: ${catalogUpdatedAt}`
      : 'python scripts/sync_agent_skills.py를 실행하면 기준일이 채워집니다';
  }

  function renderStats() {
    const d = data();
    const auto = d.edges.length - d.manualEdgeCount;
    const tray = STAGES.reduce((sum, s) => sum + (d.tray[s.key] || []).length, 0);
    const hidden = STAGES.reduce((sum, s) => sum + (d.hidden[s.key] || 0), 0);
    $('sm-stats').innerHTML = [
      `카드 ${d.nodes.length}장`,
      `연결선 ${d.edges.length}개 (자동 ${auto})`,
      `미분류 ${tray}개 · 비공개 ${hidden}개`,
      `증상 ${d.troubles.length}개`,
      '자동 데이터: scripts/build_system_map.py'
    ].map(t => `<span>${esc(t)}</span>`).join('');
  }

  function countFor(key) {
    return key === 'all' ? data().nodes.length : data().nodes.filter(n => n.domain.includes(key)).length;
  }

  function chipsHtml(active) {
    const keys = [...data().domains.map(d => d.key), 'all'];
    return keys.map(key => `
      <button class="sm-chip${key === active ? ' on' : ''}" data-act="domain" data-arg="${esc(key)}">
        ${esc(domainLabel(key))}<span class="n">${countFor(key)}</span>
      </button>`).join('');
  }

  function renderHomeChips() {
    $('home-chips').innerHTML = chipsHtml(null);
  }

  function renderFlowChips() {
    $('domain-tabs').innerHTML = chipsHtml(state.query ? null : state.domain);
  }

  function troubleFiles(t) {
    return t.targetFiles.map(f => `<span class="sm-file-chip">${esc(f)}</span>`).join('');
  }

  function renderTroubles() {
    $('trouble-grid').innerHTML = data().troubles.map((t, i) => `
      <button class="sm-trouble" data-act="trouble" data-arg="${i}">
        <span class="sm-trouble-q">${esc(t.symptom)}</span>
        <span class="sm-trouble-meta">${esc(t.domain)}</span>
        <span class="sm-file-chips">${troubleFiles(t)}</span>
      </button>`).join('');
  }

  function matches(node) {
    const inDomain = state.query || state.domain === 'all' || node.domain.includes(state.domain);
    const q = state.query.trim().toLowerCase();
    const inQuery = !q || [node.title, node.path, node.summary, node.badge].some(s => s.toLowerCase().includes(q));
    return inDomain && inQuery;
  }

  function renderBoard() {
    const d = data();
    const q = state.query.trim();
    const shown = d.nodes.filter(matches);
    $('flow-title').innerHTML = q
      ? `🔍 「${esc(q)}」 검색 결과<span class="sm-count">카드 ${shown.length}장</span>`
      : `${esc(domainLabel(state.domain))} 흐름<span class="sm-count">카드 ${shown.length}장</span>`;
    state.trayItems = [];
    for (const stage of STAGES) {
      const col = $(`col-${stage.key}`);
      const cards = shown.filter(n => n.col === stage.key);
      const tray = trayHtml(stage.key);
      col.innerHTML = tray + (cards.length
        ? cards.map(cardHtml).join('')
        : `<p class="sm-empty">${tray ? '카드 없음 (서랍만 있음)' : '이 단계 카드 없음'}</p>`);
    }
    document.querySelectorAll('.tray-box').forEach(box => box.addEventListener('toggle', () => {
      box.open ? state.openTrays.add(box.dataset.col) : state.openTrays.delete(box.dataset.col);
      drawConnections();
    }));
  }

  function cardHtml(node) {
    return `
      <button class="node-card" id="node-${esc(node.id)}" data-node-id="${esc(node.id)}" data-act="node" data-arg="${esc(node.id)}"
        style="--stage:${STAGE_OF[node.col].color}" title="${esc(node.path)}">
        <span class="kind">${esc(node.badge)}</span>
        <span class="ttl">${esc(node.title)}</span>
      </button>`;
  }

  // 열 맨 위의 미분류 서랍: 문서에는 있지만 아직 카드가 없는 파일
  function trayHtml(col) {
    const d = data();
    const q = state.query.trim().toLowerCase();
    const items = (d.tray[col] || []).filter(t =>
      (q || state.domain === 'all' || t.domain.includes(state.domain)) &&
      (!q || t.path.toLowerCase().includes(q)));
    const hidden = state.domain === 'all' && !q ? (d.hidden[col] || 0) : 0;
    if (!items.length && !hidden) return '';
    const start = state.trayItems.length;
    state.trayItems.push(...items);
    const open = state.openTrays.has(col) || (q && items.length > 0);
    return `
      <details class="tray-box" data-col="${col}"${open ? ' open' : ''}>
        <summary>🆕 미분류 ${items.length}개${hidden ? ` <span class="priv">· 비공개 ${hidden}개</span>` : ''}</summary>
        <div class="tray-list">
          ${items.map((t, i) => `<button class="tray-item" data-act="tray" data-arg="${start + i}" title="${esc(t.path)}">${esc(t.name)}</button>`).join('')}
          ${hidden ? '<p class="tray-note">비공개 저장소 파일은 공개 페이지에 이름을 싣지 않습니다.</p>' : ''}
        </div>
      </details>`;
  }

  // ───────── 연결선 (SVG 곡선) ─────────
  function drawConnections() {
    const svg = $('svg-canvas');
    const wrap = $('canvas-wrapper');
    if (!svg || !wrap) return;
    svg.innerHTML = '';
    if (state.view !== 'map' || window.innerWidth < WIDE) return;
    svg.setAttribute('width', wrap.scrollWidth);
    svg.setAttribute('height', wrap.scrollHeight);
    svg.style.width = `${wrap.scrollWidth}px`;
    svg.style.height = `${wrap.scrollHeight}px`;
    const base = wrap.getBoundingClientRect();
    const ox = base.left + wrap.clientLeft - wrap.scrollLeft;
    const oy = base.top + wrap.clientTop - wrap.scrollTop;
    const lit = litSet();
    const d = data();
    d.edges.forEach(([from, to], i) => {
      const a = document.getElementById(`node-${from}`);
      const b = document.getElementById(`node-${to}`);
      if (!a || !b) return;
      const r1 = a.getBoundingClientRect();
      const r2 = b.getBoundingClientRect();
      const x1 = r1.right - ox, y1 = r1.top + r1.height / 2 - oy;
      const x2 = r2.left - ox, y2 = r2.top + r2.height / 2 - oy;
      const dx = Math.abs(x2 - x1) * 0.45;
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`);
      let cls = 'conn-line';
      if (i >= d.manualEdgeCount) cls += ' auto-line';
      if (lit) cls += lit.has(from) && lit.has(to) ? ' active-line' : ' dimmed';
      path.setAttribute('class', cls);
      svg.appendChild(path);
    });
  }

  // 선택한 카드와 위·아래로 이어진 카드 전부
  function getConnectedNodes(rootId) {
    const visited = new Set([rootId]);
    const edges = data().edges;
    for (const [dirFrom, dirTo] of [[1, 0], [0, 1]]) {
      const queue = [rootId];
      while (queue.length) {
        const curr = queue.shift();
        for (const edge of edges) {
          if (edge[dirFrom] === curr && !visited.has(edge[dirTo])) {
            visited.add(edge[dirTo]);
            queue.push(edge[dirTo]);
          }
        }
      }
    }
    return visited;
  }

  // 강조할 카드 집합: 카드 선택이면 이어진 흐름, 증상 선택이면 증상에 적힌 카드
  function litSet() {
    const sel = state.selected;
    if (sel?.type === 'node') return getConnectedNodes(sel.id);
    if (sel?.type === 'trouble') return new Set(data().troubles[sel.index].cards || []);
    return null;
  }

  // ───────── 선택 ─────────
  function selectNode(id) {
    if (state.selected?.type === 'node' && state.selected.id === id) return resetSelection();
    state.selected = { type: 'node', id };
    applySelection();
  }

  function selectTray(index, btn) {
    state.selected = { type: 'tray', index };
    applySelection();
    btn.classList.add('tray-active');
  }

  function resetSelection() {
    state.selected = null;
    if (/^#trouble\//.test(location.hash)) {
      history.replaceState(null, '', `#flow/${state.domain}`);
    }
    applySelection();
  }

  function applySelection() {
    const sel = state.selected;
    const lit = litSet();
    document.querySelectorAll('.tray-item').forEach(el => el.classList.remove('tray-active'));
    document.querySelectorAll('.node-card').forEach(card => {
      const id = card.dataset.nodeId;
      card.classList.remove('selected-main', 'highlighted', 'dimmed');
      if (sel?.type === 'node' && id === sel.id) card.classList.add('selected-main');
      else if (lit) card.classList.add(lit.has(id) ? (sel.type === 'trouble' ? 'selected-main' : 'highlighted') : 'dimmed');
    });
    drawConnections();
    renderInspector();
    syncSheet();
  }

  // 좁은 화면에서는 상세 패널을 아래 시트로 열고 닫음
  function syncSheet() {
    const open = state.view === 'map' && !!state.selected && window.innerWidth < SIDE;
    $('inspector').classList.toggle('open', open);
    document.body.classList.toggle('sheet-open', open);
  }

  // ───────── 상세 패널 ─────────
  function renderInspector() {
    const sel = state.selected;
    const box = $('inspector-content');
    if (!sel) {
      state.prompt = '';
      box.innerHTML = `
        <div class="ins-empty">
          <div class="big">👆</div>
          <p><b>카드를 눌러 보세요</b></p>
          <p>이 파일이 어디서 데이터를 받고 어디로 넘기는지,<br>건드리면 안 되는 규칙과 AI에게 줄 지시문이 보입니다.</p>
        </div>`;
      return;
    }
    if (sel.type === 'node') box.innerHTML = nodeDetail(nodeById(sel.id));
    else if (sel.type === 'tray') box.innerHTML = trayDetail(state.trayItems[sel.index]);
    else box.innerHTML = troubleDetail(data().troubles[sel.index]);
    $('inspector').scrollTop = 0;
  }

  function linkList(nodes, emptyText) {
    if (!nodes.length) return `<span class="ins-none">${emptyText}</span>`;
    return nodes.map(n => `<button class="ins-link" data-act="node" data-arg="${esc(n.id)}">${esc(n.title)}</button>`).join('');
  }

  function promptBlock(text, label) {
    state.prompt = text;
    return `
      <div class="ins-block">
        <div class="ins-label">🤖 AI에게 줄 지시문</div>
        <div class="ins-prompt">${esc(text)}</div>
        <button class="ins-copy" data-act="copy">📋 ${esc(label)}</button>
      </div>`;
  }

  function nodeDetail(node) {
    const edges = data().edges;
    const up = edges.filter(e => e[1] === node.id).map(e => nodeById(e[0])).filter(Boolean);
    const down = edges.filter(e => e[0] === node.id).map(e => nodeById(e[1])).filter(Boolean);
    const stage = STAGE_OF[node.col];
    return `
      <span class="ins-kind" style="--stage:${stage.color}">${esc(`${stage.no} · ${stage.name} · ${node.badge}`)}</span>
      <h3 class="ins-title">${esc(node.title)}</h3>
      <div class="ins-path">📁 ${esc(node.path)}</div>
      <div class="ins-block"><div class="ins-label">🎯 핵심 역할</div><p class="ins-text">${esc(node.summary)}</p></div>
      <div class="ins-block"><div class="ins-label">⚠️ 건드리면 안 되는 규칙</div>
        <ol class="ins-rules">${node.guardrails.map(g => `<li>${esc(g)}</li>`).join('')}</ol></div>
      <div class="ins-block"><div class="ins-label">⬅️ 이전 단계</div><div class="ins-links">${linkList(up, '시작점')}</div></div>
      <div class="ins-block"><div class="ins-label">➡️ 다음 단계</div><div class="ins-links">${linkList(down, '종착점')}</div></div>
      ${promptBlock(node.agentPrompt, '지시문 복사')}`;
  }

  function trayDetail(item) {
    const text = `${item.path}의 역할을 확인하고 kids-school-main/scripts/data/의 손 관리 파일에 조감도 카드(domain, summary, guardrails, agentPrompt, edges)를 추가한 뒤 python -X utf8 scripts/build_system_map.py를 실행해줘.`;
    return `
      <span class="ins-kind">🆕 미분류</span>
      <h3 class="ins-title">${esc(item.name)}</h3>
      <div class="ins-path">📁 ${esc(item.path)}</div>
      <div class="ins-block"><div class="ins-label">📄 적혀 있는 문서</div>
        <p class="ins-text">${esc(item.docs.length ? item.docs.join(', ') : '노션 스키마 지도')}</p></div>
      <div class="ins-block"><p class="ins-text">아직 설명과 주의사항을 쓰지 않은 파일입니다. 자주 다루는 파일이면 카드로 올리세요.</p></div>
      ${promptBlock(text, '지도에 등록하는 지시문 복사')}`;
  }

  function troubleDetail(t) {
    const cards = (t.cards || []).map(nodeById).filter(Boolean);
    return `
      <span class="ins-kind">🚨 ${esc(t.domain)}</span>
      <h3 class="ins-title">${esc(t.symptom)}</h3>
      <div class="ins-block"><div class="ins-label">🔍 먼저 볼 원인</div>
        <ul class="ins-causes">${t.causes.map(c => `<li>${esc(c)}</li>`).join('')}</ul></div>
      <div class="ins-block"><div class="ins-label">🗂️ 관련 카드 (지도에 노란 테두리)</div><div class="ins-links">${linkList(cards, '없음')}</div></div>
      <div class="ins-block"><div class="ins-label">📁 볼 파일 · DB</div><div class="sm-file-chips">${troubleFiles(t)}</div></div>
      ${promptBlock(t.prompt, '이 증상 점검 지시문 복사')}`;
  }

  function copyPrompt(btn) {
    const orig = btn.textContent;
    navigator.clipboard.writeText(state.prompt).then(() => {
      btn.textContent = '✅ 복사했습니다';
      setTimeout(() => { btn.textContent = orig; }, 1800);
    }, () => {
      btn.textContent = '⚠️ 복사 실패 (글자를 직접 선택하세요)';
      setTimeout(() => { btn.textContent = orig; }, 2400);
    });
  }

  window.SystemMapView = { init, render, drawConnections, getConnectedNodes };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
