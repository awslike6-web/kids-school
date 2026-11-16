// 📮 가족 우체통 공통 모듈 — 전역 window.FamilyMail (명세: docs/family_mail_spec.md, 목록: kids/core/CORE_CATALOG.md)
// 서버(family-mail Worker) 통신, 이 기기 등록, 폰 알림 구독, 안 읽은 메시지 확인, 팝업, 📮 배지를 맡는다.
// 자동 감시: <script src=".../family-mail.js" data-watch="popup|quiet"> — popup은 로비·첫 화면, quiet는 우체통 화면.
// 메시지 글은 textContent로만 그린다. window.speechSynthesis를 직접 부르지 않는다(읽어 주기는 speakFairyTTS).
(function () {
  'use strict';
  if (window.FamilyMail) return;

  const SERVER = 'https://family-mail.awslike6.workers.dev';
  const DEVICE_KEY = 'familyMailDevice';
  const DRAFT_KEY = 'familyMailDraft';
  const SYNC_KEY = 'familyMailPushSynced';
  const SEEN_KEY = 'familyMailSeen';
  const SERVER_KEY = 'familyMailServer';
  const POLL_MS = 90 * 1000;
  const TEXT_LIMIT = 500;
  const MEMBERS = Object.freeze([
    Object.freeze({ key: 'minsu', name: '민수', emoji: '👦', theme: 'minsu' }),
    Object.freeze({ key: 'minseo', name: '민서', emoji: '👧', theme: 'minseo' }),
    Object.freeze({ key: 'mom', name: '엄마', emoji: '👩', theme: 'parent' }),
    Object.freeze({ key: 'dad', name: '아빠', emoji: '👨', theme: 'parent' })
  ]);

  // 이 파일 위치(kids/core/) 기준으로 저장소 맨 위를 찾는다. 상대 경로 규칙을 지키면서 SW·우체통 주소를 만든다.
  const script = document.currentScript;
  const BASE = new URL('../../', (script && script.src) || location.href).href;
  const SW_URL = new URL('sw.js', BASE).href;
  const MAILBOX_URL = new URL('kids/common_space/family_mail.html', BASE).href;
  const WATCH_MODE = script && script.dataset ? script.dataset.watch : '';

  class FamilyMailError extends Error {
    constructor(status, code, message) {
      super(message);
      this.name = 'FamilyMailError';
      this.status = status;
      this.code = code;
    }
  }

  const store = {
    get(area, key) { try { return window[area].getItem(key); } catch { return null; } },
    set(area, key, value) { try { window[area].setItem(key, value); } catch { /* 저장 못 해도 계속 */ } },
    remove(area, key) { try { window[area].removeItem(key); } catch { /* 무시 */ } }
  };

  function readJSON(area, key) {
    try { return JSON.parse(store.get(area, key) || 'null'); } catch { return null; }
  }

  const member = key => MEMBERS.find(item => item.key === key) || null;

  // localhost·127.0.0.1에서만 ?mailServer=로 모의 서버를 쓴다. 이 탭 안에서만 기억한다(localStorage에 남기지 않음).
  function serverURL() {
    const host = location.hostname;
    if (host !== 'localhost' && host !== '127.0.0.1') return SERVER;
    const valid = value => typeof value === 'string' && /^http:\/\/(localhost|127\.0\.0\.1)(:\d{1,5})?$/.test(value);
    const fromQuery = new URLSearchParams(location.search).get('mailServer');
    if (valid(fromQuery)) store.set('sessionStorage', SERVER_KEY, fromQuery);
    const remembered = store.get('sessionStorage', SERVER_KEY);
    return valid(remembered) ? remembered : SERVER;
  }

  function readDevice() {
    const device = readJSON('localStorage', DEVICE_KEY);
    return device && typeof device.token === 'string' && member(device.member) ? device : null;
  }

  function getDevice() {
    const device = readDevice();
    return device ? { member: device.member, label: device.label || '' } : null;
  }

  function emit(name, detail) {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  }

  function clearDevice() {
    store.remove('localStorage', DEVICE_KEY);
    store.remove('localStorage', SYNC_KEY);
    lastSummary = null;
    updateChips(null);
    emit('familymail:device', null);
  }

  async function request(path, { method = 'GET', body, auth = true } = {}) {
    const headers = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (auth) {
      const device = readDevice();
      if (!device) throw new FamilyMailError(401, 'unauthorized', '이 기기를 먼저 등록해 주세요');
      headers.Authorization = `Bearer ${device.token}`;
    }
    let response;
    try {
      response = await fetch(serverURL() + path, {
        method, headers, cache: 'no-store',
        body: body === undefined ? undefined : JSON.stringify(body)
      });
    } catch {
      throw new FamilyMailError(0, 'offline', '인터넷 연결을 확인해 주세요');
    }
    let data = null;
    try { data = await response.json(); } catch { /* 빈 응답 */ }
    if (!response.ok) {
      const error = new FamilyMailError(response.status, (data && data.error) || 'server_error', (data && data.message) || '잠시 뒤에 다시 해 주세요');
      if (data && data.remaining !== undefined) error.remaining = data.remaining;
      if (data && data.retryAfter !== undefined) error.retryAfter = data.retryAfter;
      if (response.status === 401 && auth) clearDevice();
      throw error;
    }
    return data;
  }

  async function register({ familyCode, member: key, label }) {
    const previous = readDevice();
    const body = { familyCode, member: key, label: label || '' };
    if (previous) body.previousToken = previous.token;
    const result = await request('/register', { method: 'POST', body, auth: false });
    const device = { token: result.deviceToken, member: result.member, label: body.label.trim().slice(0, 20) };
    store.set('localStorage', DEVICE_KEY, JSON.stringify(device));
    store.remove('localStorage', SYNC_KEY);
    emit('familymail:device', getDevice());
    syncPush(true).catch(() => {});
    return getDevice();
  }

  async function unregister() {
    try { await request('/device', { method: 'DELETE' }); } catch { /* 서버가 실패해도 이 기기에서는 지운다 */ }
    try {
      const registration = await existingRegistration();
      const subscription = registration && await registration.pushManager.getSubscription();
      if (subscription) await subscription.unsubscribe();
    } catch { /* 무시 */ }
    clearDevice();
  }

  // ---------- 폰 알림 (웹 푸시) ----------
  const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  const isInstalled = () => {
    try { return window.matchMedia('(display-mode: standalone)').matches; } catch { return false; }
  };

  function keyBytes(base64url) {
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
    return Uint8Array.from(binary, char => char.charCodeAt(0));
  }

  function sameKey(buffer, bytes) {
    if (!buffer) return false;
    const current = new Uint8Array(buffer);
    return current.length === bytes.length && current.every((byte, index) => byte === bytes[index]);
  }

  async function existingRegistration() {
    if (!pushSupported()) return null;
    try { return await navigator.serviceWorker.getRegistration(BASE); } catch { return null; }
  }

  async function activeRegistration() {
    await navigator.serviceWorker.register(SW_URL, { scope: BASE });
    return navigator.serviceWorker.ready;
  }

  // 구독을 서버와 맞춘다. 크롬이 구독 주소를 바꾸거나 서버 공개키가 바뀌어도 앱을 열 때 다시 맞춰진다.
  async function syncPush(force) {
    const device = readDevice();
    if (!device || !pushSupported() || Notification.permission !== 'granted') return false;
    const registration = await activeRegistration();
    const { publicKey } = await request('/vapid-public-key', { auth: false });
    const serverKey = keyBytes(publicKey);
    let subscription = await registration.pushManager.getSubscription();
    if (subscription && !sameKey(subscription.options && subscription.options.applicationServerKey, serverKey)) {
      await subscription.unsubscribe();
      subscription = null;
    }
    if (!subscription) subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: serverKey });
    const json = subscription.toJSON();
    const marker = `${device.token.slice(-8)}|${json.endpoint}`;
    if (force || store.get('localStorage', SYNC_KEY) !== marker) {
      await request('/subscribe', { method: 'POST', body: { subscription: json } });
      store.set('localStorage', SYNC_KEY, marker);
    }
    return true;
  }

  async function pushStatus() {
    if (!pushSupported()) return 'unsupported';
    if (Notification.permission === 'denied') return 'denied';
    if (Notification.permission !== 'granted') return 'off';
    const registration = await existingRegistration();
    const subscription = registration && await registration.pushManager.getSubscription();
    return subscription ? 'on' : 'off';
  }

  // 반드시 버튼 click 처리기 안에서 바로 부른다(크롬은 누르지 않은 권한 요청을 막는다)
  async function enablePush() {
    if (!pushSupported()) return 'unsupported';
    const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
    if (permission !== 'granted') return 'denied';
    try {
      await syncPush(true);
      return 'on';
    } catch (error) {
      if (error instanceof FamilyMailError) throw error;
      throw new FamilyMailError(0, 'push_failed', '알림을 연결하지 못했어요. 잠시 뒤에 다시 해 주세요');
    }
  }

  // ---------- 메시지 ----------
  const countChars = text => Array.from(String(text || '')).length;

  function newClientId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
    const bytes = window.crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  const send = ({ to, text, clientId }) => request('/send', { method: 'POST', body: { to, text, clientId } }).then(data => data.message);

  function list(box, cursor) {
    const query = new URLSearchParams({ box: box === 'sent' ? 'sent' : 'inbox' });
    if (cursor) query.set('cursor', cursor);
    return request(`/messages?${query}`);
  }

  const markRead = ids => request('/read', { method: 'POST', body: { ids } });

  // KST 기준 시각 글자: 오늘이면 "오후 7:30", 올해면 "11/14", 그 전이면 "2025/11/14"
  function formatTime(iso, nowMs = Date.now()) {
    const time = Date.parse(iso);
    if (!Number.isFinite(time)) return '';
    const kst = ms => new Date(ms + 9 * 60 * 60 * 1000);
    const d = kst(time);
    const now = kst(nowMs);
    const sameDay = d.getUTCFullYear() === now.getUTCFullYear() && d.getUTCMonth() === now.getUTCMonth() && d.getUTCDate() === now.getUTCDate();
    if (sameDay) {
      const hour = d.getUTCHours();
      return `${hour < 12 ? '오전' : '오후'} ${hour % 12 || 12}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
    }
    const day = `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
    return d.getUTCFullYear() === now.getUTCFullYear() ? day : `${d.getUTCFullYear()}/${day}`;
  }

  function speak(text) {
    if (typeof window.speakFairyTTS !== 'function') return false;
    try {
      window.speakFairyTTS(String(text || ''));
      return true;
    } catch {
      return false;
    }
  }

  const draft = {
    load() {
      const value = readJSON('localStorage', DRAFT_KEY);
      return value && typeof value.text === 'string' ? { to: member(value.to) ? value.to : '', text: value.text } : null;
    },
    save({ to, text }) {
      if (!text && !to) return draft.clear();
      store.set('localStorage', DRAFT_KEY, JSON.stringify({ to: to || '', text: text || '' }));
    },
    clear() { store.remove('localStorage', DRAFT_KEY); }
  };

  function mailboxURL(params) {
    const url = new URL(MAILBOX_URL);
    for (const [key, value] of Object.entries(params || {})) url.searchParams.set(key, value);
    const mock = new URLSearchParams(location.search).get('mailServer');
    if (mock && serverURL() === mock) url.searchParams.set('mailServer', mock);
    return url.href;
  }

  // ---------- 안 읽음 감시·배지·팝업 ----------
  let lastSummary = null;
  let inFlight = null;
  let watchState = null;
  const openHandlers = [];

  function updateChips(summary) {
    const count = summary ? summary.count : 0;
    const label = summary && summary.more ? '99+' : String(count);
    document.querySelectorAll('[data-family-mail-count]').forEach(node => {
      node.textContent = label;
      node.hidden = !count;
    });
    document.querySelectorAll('[data-family-mail-chip]').forEach(node => {
      node.setAttribute('aria-label', count ? `가족 우체통, 안 읽은 메시지 ${label}개` : '가족 우체통');
    });
  }

  function bindChips() {
    document.querySelectorAll('[data-family-mail-chip]').forEach(node => {
      if (node.dataset.familyMailBound) return;
      node.dataset.familyMailBound = '1';
      node.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        location.href = mailboxURL();
      });
    });
    updateChips(lastSummary);
  }

  function refreshUnread() {
    if (!readDevice()) {
      updateChips(null);
      return Promise.resolve(null);
    }
    if (inFlight) return inFlight;
    inFlight = request('/unread')
      .then(summary => {
        lastSummary = summary;
        updateChips(summary);
        emit('familymail:unread', summary);
        if (watchState && watchState.popup) showPopup(summary);
        return summary;
      })
      .catch(() => null)
      .finally(() => { inFlight = null; });
    return inFlight;
  }

  // 읽음 처리가 실패해도 같은 팝업이 되풀이되지 않게 이번 탭에서 확인한 id를 기억한다
  const seenIds = () => new Set(readJSON('sessionStorage', SEEN_KEY) || []);
  function markSeen(id) {
    const seen = seenIds();
    seen.add(id);
    store.set('sessionStorage', SEEN_KEY, JSON.stringify([...seen].slice(-50)));
  }

  const POPUP_CSS = `
.fmp-overlay{position:fixed;inset:0;z-index:2147483000;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box}
.fmp-card{width:100%;max-width:400px;background:#fffef7;color:#1f2937;border-radius:24px;padding:22px 20px 18px;box-shadow:0 18px 50px rgba(0,0,0,.35);font-family:-apple-system,"Segoe UI","Noto Sans KR",sans-serif;box-sizing:border-box}
.fmp-head{display:flex;align-items:center;gap:12px;margin-bottom:12px}
.fmp-avatar{width:52px;height:52px;border-radius:50%;background:#e0f2fe;display:flex;align-items:center;justify-content:center;font-size:30px;flex:none}
.fmp-from{font-size:19px;font-weight:800}
.fmp-time{font-size:14px;color:#6b7280}
.fmp-text{font-size:19px;line-height:1.55;white-space:pre-wrap;overflow-wrap:anywhere;max-height:40vh;overflow:auto;background:#fff;border:2px solid #e5e7eb;border-radius:16px;padding:14px;margin:0 0 14px}
.fmp-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.fmp-btn{min-height:50px;border-radius:14px;border:2px solid #cbd5e1;background:#fff;color:#1f2937;font-size:17px;font-weight:700;cursor:pointer;font-family:inherit}
.fmp-ok{grid-column:1/-1;background:#6ec6f5;border-color:#6ec6f5;color:#0b2540}
.fmp-more{display:block;width:100%;margin-top:12px;background:none;border:0;color:#2563eb;font-size:16px;font-weight:700;cursor:pointer;font-family:inherit;min-height:44px}
@media (prefers-reduced-motion:no-preference){.fmp-card{animation:fmp-pop .25s ease-out}}
@keyframes fmp-pop{from{transform:scale(.92);opacity:0}to{transform:none;opacity:1}}`;

  function ensurePopupStyle() {
    if (document.getElementById('familyMailPopupStyle')) return;
    const style = document.createElement('style');
    style.id = 'familyMailPopupStyle';
    style.textContent = POPUP_CSS;
    document.head.appendChild(style);
  }

  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  // 오래된 안 읽은 메시지 하나를 띄운다. 바깥을 눌러도 닫히지 않고, 「확인했어요」나 「답장」을 눌러야 읽음이 된다.
  function showPopup(summary) {
    if (!summary || document.getElementById('familyMailPopup')) return;
    const seen = seenIds();
    const message = (summary.items || []).find(item => !seen.has(item.id));
    if (!message) return;
    const sender = member(message.from) || { name: '가족', emoji: '📮' };
    ensurePopupStyle();
    const overlay = node('div', 'fmp-overlay');
    overlay.id = 'familyMailPopup';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    const card = node('div', 'fmp-card');
    const head = node('div', 'fmp-head');
    head.append(node('div', 'fmp-avatar', sender.emoji));
    const who = node('div');
    who.append(node('div', 'fmp-from', `${sender.name}의 메시지 📮`), node('div', 'fmp-time', formatTime(message.sentAt)));
    head.append(who);
    const text = node('p', 'fmp-text', message.text);
    const actions = node('div', 'fmp-actions');
    const speakButton = node('button', 'fmp-btn', '🔊 읽어 주기');
    const replyButton = node('button', 'fmp-btn', '💌 답장');
    const okButton = node('button', 'fmp-btn fmp-ok', '확인했어요');
    [speakButton, replyButton, okButton].forEach(button => { button.type = 'button'; });
    actions.append(speakButton, replyButton, okButton);
    card.append(head, text, actions);
    const others = summary.count - 1;
    if (others > 0 || summary.more) {
      const more = node('button', 'fmp-more', `외 ${summary.more ? '99+' : others}개 더 → 우체통`);
      more.type = 'button';
      more.addEventListener('click', () => { location.href = mailboxURL(); });
      card.append(more);
    }
    overlay.append(card);

    const finish = () => {
      markSeen(message.id);
      overlay.remove();
      return markRead([message.id]).catch(() => null);
    };
    speakButton.addEventListener('click', () => speak(`${sender.name}의 메시지. ${message.text}`));
    okButton.addEventListener('click', () => { finish().then(() => refreshUnread()); });
    replyButton.addEventListener('click', () => {
      finish().then(() => { location.href = mailboxURL({ compose: message.from }); });
    });
    document.body.appendChild(overlay);
    okButton.focus();
  }

  function onServiceWorkerMessage(event) {
    const data = event.data || {};
    if (data.type === 'family-mail') refreshUnread();
    if (data.type === 'family-mail-open') {
      if (openHandlers.length) openHandlers.forEach(handler => handler(data.id || null));
      else location.href = mailboxURL(data.id ? { open: data.id } : {});
    }
  }

  function onOpenMessage(handler) {
    if (typeof handler === 'function') openHandlers.push(handler);
  }

  // 화면이 보일 때만 확인한다: 열 때, 다시 보일 때, 보이는 동안 90초마다, 서비스 워커가 알려 줄 때
  function watch({ popup = true } = {}) {
    if (watchState) return;
    watchState = { popup: Boolean(popup) };
    bindChips();
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') refreshUnread();
    });
    watchState.timer = setInterval(() => {
      if (document.visibilityState === 'visible') refreshUnread();
    }, POLL_MS);
    if ('serviceWorker' in navigator) navigator.serviceWorker.addEventListener('message', onServiceWorkerMessage);
    refreshUnread();
    syncPush(false).catch(() => {});
  }

  window.FamilyMail = Object.freeze({
    MEMBERS, TEXT_LIMIT, FamilyMailError, draft,
    member, getDevice, register, unregister,
    pushStatus, enablePush, isInstalled,
    send, newClientId, list, markRead, refreshUnread, onOpenMessage,
    speak, formatTime, countChars, mailboxURL, watch,
    _internal: Object.freeze({ serverURL, showPopup, syncPush, BASE, SW_URL })
  });

  if (WATCH_MODE === 'popup' || WATCH_MODE === 'quiet') {
    const start = () => watch({ popup: WATCH_MODE === 'popup' });
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
  }
})();
