// 📮 가족 우체통 화면 — 전역 window.FamilyMailPage (명세: docs/family_mail_spec.md §6)
// 서버 통신·기기·알림은 kids/core/family-mail.js(window.FamilyMail)가 맡고, 이 파일은 화면만 그린다.
// 사용자·서버에서 온 글은 textContent로만 넣는다(innerHTML 금지). 초안: 안티그래비티 Hydrogen, 검토·수정: Claude.
(() => {
  'use strict';

  const FM = window.FamilyMail;
  const EMOJIS = ['😀', '😂', '🥰', '😍', '😎', '🤔', '😢', '😭', '😡', '😴', '👍', '👏', '🙏', '💪', '❤️', '💕', '🎉', '🎂', '⭐', '🌈', '🍕', '🍦', '⚽', '📚'];
  const PUSH_LABELS = { on: '켜짐', off: '꺼짐', denied: '막혀 있음(안드로이드 설정에서 켜기)', unsupported: '지원 안 됨' };
  const PUSH_RESULT = {
    on: '알림이 켜졌어요 🎉',
    denied: '알림이 꺼져 있어요. 안드로이드 설정 → 앱 → 크롬(또는 공부방) → 알림에서 켤 수 있어요',
    unsupported: '이 브라우저는 알림을 받을 수 없어요. 앱 안에서만 확인할 수 있어요'
  };

  const state = {
    screen: 'setup', tab: 'inbox', cursor: null, unreadCount: 0, unreadMore: false, unreadReady: false,
    listenersBound: false, sheetEl: null, tabCountEl: null, listEl: null, draftTimer: null, switchTab: null, loadToken: 0
  };

  // ---------- 작은 도우미 ----------
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function btn(className, text, onClick) {
    const b = el('button', className, text);
    b.type = 'button';
    if (onClick) b.addEventListener('click', onClick);
    return b;
  }

  // 이모지는 크게, 이름은 아래에 (설정·받는 사람 버튼)
  function memberButton(className, m, onClick) {
    const b = btn(className, null, onClick);
    b.setAttribute('aria-label', m.name);
    b.append(el('span', null, m.emoji), el('span', null, m.name));
    return b;
  }

  const clearNode = node => { while (node.firstChild) node.removeChild(node.firstChild); };
  const rootEl = () => document.getElementById('familyMailApp');
  const setTheme = theme => { if (document.body) document.body.dataset.theme = theme || 'parent'; };
  const errMsg = err => (err && err.code && err.message ? err.message : '잠시 뒤에 다시 해 주세요');
  const recipientsFor = memberKey => FM.MEMBERS.filter(m => m.key !== memberKey);
  const meOf = device => FM.member(device.member) || { key: device.member, name: device.member, emoji: '👤', theme: 'parent' };

  function insertAtCursor(textarea, text) {
    const start = typeof textarea.selectionStart === 'number' ? textarea.selectionStart : textarea.value.length;
    const end = typeof textarea.selectionEnd === 'number' ? textarea.selectionEnd : start;
    textarea.value = textarea.value.slice(0, start) + text + textarea.value.slice(end);
    const pos = start + text.length;
    textarea.selectionStart = pos;
    textarea.selectionEnd = pos;
    textarea.focus();
  }

  function showToast(text) {
    const old = document.querySelector('.fm-toast');
    if (old) old.remove();
    const toast = el('div', 'fm-toast', text);
    toast.setAttribute('role', 'status');
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('is-show'));
    setTimeout(() => toast.remove(), 2000);
  }

  function closeSheet() {
    if (state.draftTimer) { clearTimeout(state.draftTimer); state.draftTimer = null; }
    if (state.sheetEl) { state.sheetEl.remove(); state.sheetEl = null; }
  }

  // 덮개 창. 바깥을 눌러도 닫지 않는다(초1이 실수로 쓰던 글을 잃지 않게).
  function openSheet(title, content) {
    closeSheet();
    const overlay = el('div', 'fm-sheet');
    const panel = el('div', 'fm-sheet-panel');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    const close = btn('fm-close', '✕', closeSheet);
    close.setAttribute('aria-label', '닫기');
    panel.append(el('h2', 'fm-sheet-title', title), close, content);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    state.sheetEl = overlay;
    return panel;
  }

  function field(labelText, input) {
    const wrap = el('label', 'fm-field');
    wrap.append(el('span', 'fm-label', labelText), input);
    return wrap;
  }

  function updateUnreadBadge() {
    const node = state.tabCountEl;
    if (!node) return;
    node.hidden = !state.unreadCount;
    node.textContent = state.unreadCount ? (state.unreadMore ? '99+' : String(state.unreadCount)) : '';
  }

  // ---------- 화면 1: 처음 설정 ----------
  function renderSetup() {
    const root = rootEl();
    if (!root) return;
    state.screen = 'setup';
    state.switchTab = null;
    closeSheet();
    setTheme('parent');
    clearNode(root);

    const wrap = el('div', 'fm-setup');
    const intro = el('div', 'fm-step');
    intro.append(el('h1', 'fm-step-title', '📮 가족 우체통 처음 설정'), el('p', 'fm-msg', '부모님과 함께 해 주세요'));

    let preselect = null;
    try {
      const child = localStorage.getItem('currentChild');
      if (child === 'minsu' || child === 'minseo') preselect = child;
    } catch (_) { /* 저장소를 못 읽어도 계속 */ }
    let selected = preselect;

    const who = el('div', 'fm-step');
    who.appendChild(el('h2', 'fm-step-title', '이 폰은 누구 폰인가요?'));
    const grid = el('div', 'fm-members');
    const memberBtns = FM.MEMBERS.map(m => {
      const b = memberButton('fm-member', m, () => {
        selected = m.key;
        memberBtns.forEach(x => x.b.classList.toggle('is-selected', x.key === m.key));
        syncSubmit();
      });
      b.classList.toggle('is-selected', m.key === selected);
      grid.appendChild(b);
      return { key: m.key, b };
    });
    who.appendChild(grid);

    const codeInput = el('input', 'fm-input');
    codeInput.type = 'password';
    codeInput.autocomplete = 'off';
    codeInput.maxLength = 64;
    const labelInput = el('input', 'fm-input');
    labelInput.type = 'text';
    labelInput.maxLength = 20;
    labelInput.placeholder = '예: 민서 폰';
    const msgBox = el('p', 'fm-msg is-error');
    msgBox.hidden = true;

    const submitBtn = btn('fm-btn fm-btn-primary', '등록하기', async () => {
      if (!selected || !codeInput.value.trim()) return;
      submitBtn.disabled = true;
      msgBox.hidden = true;
      try {
        const device = await FM.register({ familyCode: codeInput.value, member: selected, label: labelInput.value.trim() });
        renderSetupPush(wrap, device);
      } catch (err) {
        msgBox.hidden = false;
        msgBox.textContent = err && err.code === 'wrong_code' && err.remaining !== undefined
          ? `가족 코드가 맞지 않아요 (남은 기회 ${err.remaining}번)` : errMsg(err);
        syncSubmit();
      }
    });
    const syncSubmit = () => { submitBtn.disabled = !selected || !codeInput.value.trim(); };
    codeInput.addEventListener('input', syncSubmit);
    syncSubmit();

    const code = el('div', 'fm-step');
    code.append(el('h2', 'fm-step-title', '🔑 부모님이 넣어 주세요'), field('가족 코드', codeInput), field('기기 이름 (안 써도 돼요)', labelInput), submitBtn, msgBox);
    wrap.append(intro, who, code);
    root.appendChild(wrap);
  }

  function renderSetupPush(wrap, device) {
    clearNode(wrap);
    setTheme(meOf(device).theme);
    const step = el('div', 'fm-step');
    step.appendChild(el('h1', 'fm-step-title', '🔔 알림 받기'));
    if (!FM.isInstalled()) {
      step.appendChild(el('p', 'fm-hint', '크롬 메뉴 ⋮ → 홈 화면에 추가 → 홈 화면의 공부방 아이콘으로 다시 열면 알림이 공부방 이름으로 와요'));
    }
    step.appendChild(el('p', 'fm-hint', '알림이 늦게 오면 안드로이드 설정 → 배터리에서 크롬(공부방)을 「제한 없음」으로 바꿔 주세요'));
    const statusMsg = el('p', 'fm-msg');
    statusMsg.hidden = true;
    const pushBtn = btn('fm-btn fm-btn-primary', '🔔 알림 받기', async () => {
      statusMsg.hidden = false;
      try {
        const result = await FM.enablePush();
        statusMsg.className = `fm-msg ${result === 'on' ? 'is-ok' : 'is-error'}`;
        statusMsg.textContent = PUSH_RESULT[result] || PUSH_RESULT.unsupported;
      } catch (err) {
        statusMsg.className = 'fm-msg is-error';
        statusMsg.textContent = errMsg(err);
      }
    });
    step.append(pushBtn, statusMsg, btn('fm-btn', '우체통으로 가기', () => renderMain(device)));
    wrap.appendChild(step);
  }

  // ---------- 화면 2: 우체통 ----------
  function renderMain(device, opts = {}) {
    const root = rootEl();
    if (!root) return;
    state.screen = 'main';
    state.tab = 'inbox';
    state.cursor = null;
    const me = meOf(device);
    setTheme(me.theme);
    clearNode(root);

    const header = el('header', 'fm-header');
    const back = el('a', 'fm-back', '←');
    back.href = me.theme === 'parent' ? '../../index.html' : '../../lobby.html';
    back.setAttribute('aria-label', '뒤로');
    const meBox = el('div', 'fm-me');
    meBox.append(document.createTextNode('나는 '), el('span', 'fm-me-emoji', me.emoji), el('span', 'fm-me-name', me.name));
    const gear = btn('fm-icon-btn', '⚙️', () => openSettings(device));
    gear.setAttribute('aria-label', '설정');
    header.append(back, meBox, gear);

    const tabs = el('div', 'fm-tabs');
    tabs.setAttribute('role', 'tablist');
    const inboxTab = btn('fm-tab is-active', '📥 받은 메시지', () => switchTab('inbox'));
    const countSpan = el('span', 'fm-tab-count');
    countSpan.hidden = true;
    inboxTab.appendChild(countSpan);
    const sentTab = btn('fm-tab', '📤 보낸 메시지', () => switchTab('sent'));
    tabs.append(inboxTab, sentTab);
    state.tabCountEl = countSpan;
    updateUnreadBadge();

    state.listEl = el('div', 'fm-list');
    const fab = btn('fm-fab', '✏️ 메시지 쓰기', () => openCompose(device));
    root.append(header, tabs, state.listEl, fab);

    function switchTab(nextTab, openId) {
      state.tab = nextTab;
      inboxTab.classList.toggle('is-active', nextTab === 'inbox');
      sentTab.classList.toggle('is-active', nextTab === 'sent');
      return loadMessages(false, openId);
    }
    state.switchTab = switchTab;

    loadMessages(false, opts.openId);
    FM.refreshUnread(); // 방금 등록한 기기는 감시 시작 때 숫자를 못 받았으므로 여기서 한 번 더
    if (opts.composeTo) openCompose(device, opts.composeTo);
  }

  async function loadMessages(append, openId) {
    const listEl = state.listEl;
    if (!listEl) return;
    const token = ++state.loadToken; // 탭을 빨리 바꿀 때 늦게 온 옛 응답을 버린다
    if (!append) {
      state.cursor = null;
      clearNode(listEl);
      listEl.appendChild(el('p', 'fm-loading', '불러오는 중…'));
    }
    const box = state.tab;
    try {
      const res = await FM.list(box, append ? state.cursor : undefined);
      if (token !== state.loadToken) return;
      if (!append) clearNode(listEl);
      const oldMore = listEl.querySelector('.fm-more');
      if (oldMore) oldMore.remove();
      const items = res.messages || [];
      if (!append && !items.length) {
        listEl.appendChild(el('p', 'fm-empty', box === 'inbox' ? '아직 받은 메시지가 없어요' : '아직 보낸 메시지가 없어요'));
        return;
      }
      for (const msg of items) {
        const item = box === 'inbox' ? buildInboxItem(msg) : buildSentItem(msg);
        listEl.appendChild(item);
        if (openId && msg.id === openId && box === 'inbox') {
          expandInboxItem(item, msg);
          item.scrollIntoView({ block: 'center' });
        }
      }
      state.cursor = res.nextCursor || null;
      if (state.cursor) listEl.appendChild(btn('fm-btn fm-more', '더 보기', () => loadMessages(true)));
    } catch (err) {
      if (token !== state.loadToken) return;
      if (!append) clearNode(listEl);
      const errBox = el('div', 'fm-error');
      errBox.append(el('p', null, errMsg(err)), btn('fm-btn', '다시 시도', () => loadMessages(append, openId)));
      listEl.appendChild(errBox);
    }
  }

  async function expandInboxItem(item, msg) {
    item.classList.add('is-open');
    if (msg.read) return;
    try {
      await FM.markRead([msg.id]);
      msg.read = true;
      item.classList.remove('is-unread');
      FM.refreshUnread();
    } catch (_) { /* 다음에 펼칠 때 다시 시도 */ }
  }

  function buildInboxItem(msg) {
    const sender = FM.member(msg.from) || { name: '가족', emoji: '👤' };
    const item = el('div', `fm-item${msg.read ? '' : ' is-unread'}`);
    item.tabIndex = 0;
    const head = el('div', 'fm-item-head');
    head.append(el('span', 'fm-avatar', sender.emoji), el('span', 'fm-who', sender.name), el('span', 'fm-time', FM.formatTime(msg.sentAt)));
    const actions = el('div', 'fm-actions');
    actions.append(
      btn('fm-btn', '🔊 읽어 주기', e => { e.stopPropagation(); FM.speak(`${sender.name}의 메시지. ${msg.text}`); }),
      btn('fm-btn', '💌 답장', e => {
        e.stopPropagation();
        const device = FM.getDevice();
        if (device) openCompose(device, msg.from);
      })
    );
    item.append(head, el('p', 'fm-text', msg.text), actions);
    const toggle = () => {
      if (item.classList.contains('is-open')) item.classList.remove('is-open');
      else expandInboxItem(item, msg);
    };
    item.addEventListener('click', toggle);
    item.addEventListener('keydown', e => { if (e.target === item && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); toggle(); } });
    return item;
  }

  function buildSentItem(msg) {
    const target = FM.member(msg.to) || { name: '가족', emoji: '👤' };
    const item = el('div', 'fm-item is-sent');
    const head = el('div', 'fm-item-head');
    head.append(el('span', 'fm-avatar', target.emoji), el('span', 'fm-who', `→ ${target.name}`), el('span', 'fm-time', FM.formatTime(msg.sentAt)));
    const status = el('p', `fm-status${msg.read ? ' is-read' : ''}`, msg.read ? (msg.readAt ? `✓ 읽었어요 (${FM.formatTime(msg.readAt)})` : '✓ 읽었어요') : '아직 안 읽었어요');
    item.append(head, el('p', 'fm-text', msg.text), status);
    return item;
  }

  // ---------- 화면 3: 메시지 쓰기 ----------
  function openCompose(device, presetTo) {
    const limit = FM.TEXT_LIMIT || 500;
    const allowed = recipientsFor(device.member);
    const valid = key => allowed.some(m => m.key === key);
    const saved = FM.draft.load();
    const compose = {
      to: valid(presetTo) ? presetTo : (saved && valid(saved.to) ? saved.to : null),
      text: (saved && saved.text) || '',
      clientId: null,
      sending: false
    };

    const body = el('div');
    body.appendChild(el('p', 'fm-label', '누구에게?'));
    const recWrap = el('div', 'fm-recipients');
    const recBtns = allowed.map(m => {
      const b = memberButton('fm-recipient', m, () => {
        if (compose.to === m.key) return;
        compose.to = m.key;
        compose.clientId = null;
        recBtns.forEach(x => x.b.classList.toggle('is-selected', x.key === m.key));
        scheduleDraft();
        syncSend();
      });
      b.classList.toggle('is-selected', m.key === compose.to);
      recWrap.appendChild(b);
      return { key: m.key, b };
    });
    body.appendChild(recWrap);

    const textarea = el('textarea', 'fm-textarea');
    textarea.placeholder = '하고 싶은 말을 써 보세요 ✏️';
    textarea.rows = 5;
    textarea.setAttribute('aria-label', '메시지');
    textarea.value = compose.text;
    const counter = el('p', 'fm-counter');
    const emojiGrid = el('div', 'fm-emoji-grid');
    emojiGrid.hidden = true;
    for (const em of EMOJIS) {
      const b = btn('fm-emoji', em, () => { insertAtCursor(textarea, em); onTextChange(); });
      b.setAttribute('aria-label', `이모지 ${em}`);
      emojiGrid.appendChild(b);
    }
    const emojiToggle = btn('fm-emoji-toggle', '😊', () => { emojiGrid.hidden = !emojiGrid.hidden; });
    emojiToggle.setAttribute('aria-label', '이모지 고르기');
    const errBox = el('p', 'fm-msg is-error');
    errBox.hidden = true;

    const sendBtn = btn('fm-btn fm-btn-primary', '보내기', async () => {
      if (compose.sending) return;
      compose.sending = true;
      errBox.hidden = true;
      sendBtn.textContent = '보내는 중…';
      sendBtn.disabled = true;
      // 실패 뒤 같은 글로 다시 누르면 같은 clientId를 써서 두 번 저장되지 않게 한다
      if (!compose.clientId) compose.clientId = FM.newClientId();
      try {
        await FM.send({ to: compose.to, text: compose.text, clientId: compose.clientId });
        compose.clientId = null;
        FM.draft.clear();
        closeSheet();
        showToast('보냈어요! 📮');
        if (state.switchTab) state.switchTab('sent');
      } catch (err) {
        errBox.hidden = false;
        errBox.textContent = errMsg(err);
        compose.sending = false;
        sendBtn.textContent = '보내기';
        syncSend();
      }
    });

    function scheduleDraft() {
      if (state.draftTimer) clearTimeout(state.draftTimer);
      state.draftTimer = setTimeout(() => FM.draft.save({ to: compose.to, text: compose.text }), 300);
    }

    function syncSend() {
      const count = FM.countChars(compose.text);
      counter.textContent = `${count}/${limit}`;
      counter.classList.toggle('is-over', count > limit);
      sendBtn.disabled = compose.sending || !compose.to || !compose.text.trim() || count > limit;
    }

    function onTextChange() {
      if (textarea.value !== compose.text) {
        compose.text = textarea.value;
        compose.clientId = null;
        scheduleDraft();
      }
      syncSend();
    }
    textarea.addEventListener('input', onTextChange);

    const sendRow = el('div', 'fm-send-row');
    sendRow.append(emojiToggle, sendBtn);
    body.append(textarea, counter, emojiGrid, errBox, sendRow);
    syncSend();
    openSheet('✏️ 메시지 쓰기', body);
    if (compose.to) textarea.focus();
  }

  // ---------- 화면 4: 설정 ----------
  function openSettings(device) {
    const me = meOf(device);
    const box = el('div', 'fm-settings');
    const whoRow = el('div', 'fm-row');
    whoRow.append(el('span', null, '이 폰'), el('strong', null, device.label ? `${me.emoji} ${me.name} (${device.label})` : `${me.emoji} ${me.name}`));
    const pushRow = el('div', 'fm-row');
    const pushText = el('strong', null, '확인 중…');
    pushRow.append(el('span', null, '알림'), pushText);
    const msg = el('p', 'fm-msg is-error');
    msg.hidden = true;

    async function refreshPushText() {
      try {
        pushText.textContent = PUSH_LABELS[await FM.pushStatus()] || PUSH_LABELS.unsupported;
      } catch (_) {
        pushText.textContent = PUSH_LABELS.unsupported;
      }
    }

    const reconnect = btn('fm-btn', '🔔 알림 다시 연결', async () => {
      msg.hidden = true;
      try {
        const result = await FM.enablePush();
        if (result !== 'on') { msg.hidden = false; msg.textContent = PUSH_RESULT[result] || PUSH_RESULT.unsupported; }
      } catch (err) {
        msg.hidden = false;
        msg.textContent = errMsg(err);
      }
      refreshPushText();
    });
    const unregister = btn('fm-btn fm-danger', '이 기기 등록 해제', async () => {
      if (!window.confirm('부모님과 함께 하세요. 등록을 해제하면 가족 코드를 다시 넣어야 해요. 해제할까요?')) return;
      await FM.unregister(); // 서버가 실패해도 이 기기에서는 지우고 'familymail:device' → 설정 화면
      renderSetup();
    });
    box.append(whoRow, pushRow, reconnect, msg, unregister);
    openSheet('⚙️ 설정', box);
    refreshPushText();
  }

  // ---------- 시작 ----------
  function bindGlobalListeners() {
    if (state.listenersBound) return;
    state.listenersBound = true;
    window.addEventListener('familymail:unread', e => {
      const detail = e.detail || { count: 0, more: false };
      const grew = state.unreadReady && (detail.count || 0) > state.unreadCount;
      state.unreadCount = detail.count || 0;
      state.unreadMore = Boolean(detail.more);
      state.unreadReady = true;
      updateUnreadBadge();
      if (grew && state.screen === 'main' && state.tab === 'inbox') loadMessages(false);
    });
    window.addEventListener('familymail:device', e => { if (!e.detail && state.screen !== 'setup') renderSetup(); });
    FM.onOpenMessage(id => {
      if (!FM.getDevice() || !state.switchTab) return;
      closeSheetIfIdle();
      state.switchTab('inbox', id);
    });
  }

  // 알림을 눌러 들어왔을 때 쓰던 글이 있으면 쓰기 창을 그대로 둔다
  function closeSheetIfIdle() {
    const textarea = state.sheetEl && state.sheetEl.querySelector('.fm-textarea');
    if (!textarea || !textarea.value.trim()) closeSheet();
  }

  function start() {
    if (!FM) return;
    bindGlobalListeners();
    const params = new URLSearchParams(window.location.search);
    const device = FM.getDevice();
    if (!device || params.get('setup') === '1') return renderSetup();
    renderMain(device, { openId: params.get('open'), composeTo: params.get('compose') });
  }

  window.FamilyMailPage = { start, recipientsFor, insertAtCursor, el };

  if (!window.__FAMILY_MAIL_NO_AUTOSTART) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
  }
})();
