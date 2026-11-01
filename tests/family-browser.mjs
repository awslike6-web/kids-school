// 가족 방 시험 전용 모의 브라우저. 네트워크는 호출하지 않습니다.
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
export const base = new URL('../kids/playground/family/', import.meta.url);
export const read = name => readFileSync(new URL(name, base), 'utf8');
export const plain = value => JSON.parse(JSON.stringify(value));
export const CLIENT = '11111111-1111-1111-1111-111111111111';
export const OTHER = '22222222-2222-2222-2222-222222222222';
export function browser({ search = '', blocked = false, storage = {}, fetch: fetcher, hostname = 'localhost', game = 'yacht' } = {}) {
  let now = 0, timerId = 0;
  const timers = new Map(), store = new Map(Object.entries(storage)), nodes = new Map(), sockets = [], requests = [], speech = [];
  const listeners = new Map();
  const document = { readyState: 'loading', hidden: false, activeElement: null,
    createElement: tag => new Node(tag), getElementById: id => nodes.get(id) || null,
    addEventListener: (type, fn) => { const key = `document:${type}`; listeners.set(key, [...listeners.get(key) || [], fn]); } };
  function matches(node, selector) {
    if (selector === '*') return true;
    if (selector.includes(':not(:disabled)') && node.disabled) return false;
    let sel = selector.replace(':not(:disabled)', '');
    const attrMatch = sel.match(/\[([a-zA-Z0-9_-]+)(?:="([^"]*)")?\]/);
    if (attrMatch) {
      const [, attr, val] = attrMatch;
      sel = sel.replace(attrMatch[0], '');
      const hasAttr = attr.startsWith('data-') ? node.dataset[attr.slice(5)] === val : node.getAttribute(attr) === val;
      if (!hasAttr) return false;
      if (!sel) return true;
    }
    const parts = sel.split('.').filter(Boolean);
    const tag = sel.startsWith('.') ? null : parts.shift();
    if (tag && node.tagName !== tag.toUpperCase()) return false;
    const classes = node.className ? node.className.split(/\s+/) : [];
    return parts.every(c => classes.includes(c));
  }
  class Node {
    constructor(tag = 'div') {
      this.tagName = tag.toUpperCase(); this.children = []; this.attributes = {}; this.listeners = {}; this.className = '';
      this.dataset = {}; this.style = {}; this.value = ''; this.disabled = false; this.hidden = false; this.open = false;
      this.style.setProperty = (k, v) => { this.style[k] = v; };
      this.classList = { add: name => { if (!this.className.split(' ').includes(name)) this.className += ` ${name}`; },
        remove: name => { this.className = this.className.split(' ').filter(n => n !== name).join(' '); } };
    }
    set textContent(value) { this.text = String(value); this.children = []; }
    get textContent() { return (this.text || '') + this.children.map(n => n.textContent).join(''); }
    append(...children) { children.forEach(n => { n.remove(); n.parent = this; this.children.push(n); }); }
    replaceChildren(...children) { this.children.forEach(n => { n.parent = null; }); this.children = []; this.text = ''; this.append(...children); }
    remove() { if (this.parent) this.parent.children = this.parent.children.filter(n => n !== this); this.parent = null; }
    setAttribute(k, v) { this.attributes[k] = String(v); }
    getAttribute(k) { return this.attributes[k]; }
    removeAttribute(k) { delete this.attributes[k]; }
    contains(n) { return n === this || this.children.some(c => c.contains(n)); }
    addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
    fire(type, options = {}) {
      const event = { type, target: this, ...options }; let node = this;
      do { for (const fn of node.listeners[type] || []) fn(event); node = node.parent; } while (node);
    }
    click() { if (!this.disabled) { this.focus(); this.fire('click'); } }
    focus() {
      const old = document.activeElement; document.activeElement = this;
      if (old && old !== this) old.fire('focusout');
      this.focusCount = (this.focusCount || 0) + 1;
    }
    querySelectorAll(selector) { return this.children.flatMap(n => [n, ...n.querySelectorAll('*')])
      .filter(n => selector === '*' || selector.split(/,\s*/).some(s => matches(n, s))); }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    showModal() { this.open = true; }
    close() { this.open = false; this.fire('close'); }
  }
  const body = new Node('body'); document.body = body;
  for (const match of read(`${game}.html`).matchAll(/<(\w+)[^>]*\bid="([^"]+)"[^>]*>/g)) {
    const n = new Node(match[1]); n.id = match[2]; n.hidden = /\bhidden\b/.test(match[0]); nodes.set(n.id, n); body.append(n);
  }
  const nest = (parent, ids) => ids.forEach(id => nodes.get(parent).append(nodes.get(id)));
  if (game === 'yacht') {
    nest('setupView', ['playerSetup', 'playerCount', 'startGame', 'singleDevice', 'multipleDevices']);
    nest('gameView', ['dice', 'rollDice', 'scoreTable', 'keepHint', 'turnHelp', 'turnBanner', 'turnAvatar', 'roundBanner']);
    nest('endView', ['playAgain', 'backToSetup', 'winners', 'rankings', 'endTitle']);
  } else if (game === 'yut') {
    nest('setupView', ['playerCount', 'pieceCount', 'playerSetup', 'setupError', 'startGame']);
    nest('resumeView', ['resumeSummary', 'resumeGame', 'newGame']);
    nest('endView', ['endTitle', 'winners', 'playAgain', 'backToSetup']);
    nest('gameView', ['board', 'finishCell', 'waitingTray', 'turnHeading', 'turnBanner', 'turnAvatar', 'assistLabel', 'playersStatus', 'sticks', 'throwResult', 'throwButton', 'pendingList', 'helpText', 'moveText', 'confirmMove', 'actionMessage', 'endView']);
  } else {
    nest('setupView', ['playerSetup', 'boardSize', 'startGame', 'singleDevice', 'multipleDevices']);
    nest('endView', ['playAgain', 'backToSetup', 'winners', 'endTitle']);
    nest('gameView', ['board', 'turnHeading', 'turnBanner', 'turnAvatar', 'assistLabel', 'playersStatus', 'helpText', 'selectionText', 'confirmPlace', 'endView']);
  }
  const tick = ms => {
    const target = now + ms; let loops = 0;
    while (true) {
      const due = [...timers].filter(([, t]) => t.at <= target).sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0];
      if (!due) break;
      if (++loops > 10000) throw Error('타이머 반복');
      now = due[1].at; timers.delete(due[0]); due[1].fn();
    }
    now = target;
  };
  class Socket {
    constructor(url) { this.url = url; this.readyState = 0; this.sent = []; sockets.push(this); }
    open() { this.readyState = 1; this.onopen?.({}); }
    send(value) { if (this.readyState !== 1) throw Error('닫힌 소켓'); this.sent.push(value); }
    message(value) { this.onmessage?.({ data: typeof value === 'string' ? value : JSON.stringify(value) }); }
    close() { this.readyState = 3; this.onclose?.({ code: 1000 }); }
    end(code = 1006) { this.readyState = 3; this.onclose?.({ code }); }
    actions() { return this.sent.filter(s => s !== 'ping').map(JSON.parse); }
  }
  const context = { document, Math, URL, URLSearchParams, TextEncoder, AbortController, console,
    Date: class extends Date { static now() { return now; } }, WebSocket: Socket,
    crypto: { randomUUID: () => CLIENT, getRandomValues: a => webcrypto.getRandomValues(a) },
    location: { hostname, search, href: `http://${hostname}/kids/playground/family/${game}.html${search}` },
    setTimeout: (fn, ms = 0) => { timers.set(++timerId, { fn, at: now + ms }); return timerId; },
    clearTimeout: id => timers.delete(id),
    localStorage: {
      getItem: key => { if (blocked) throw Error('저장 차단'); return store.get(key) ?? null; },
      setItem: (key, value) => { if (blocked) throw Error('저장 차단'); store.set(key, String(value)); },
      removeItem: key => { if (blocked) throw Error('저장 차단'); store.delete(key); }
    },
    fetch: async (...args) => { requests.push(args); if (fetcher) return fetcher(...args); throw Error('가짜 네트워크 실패'); },
    navigator: { clipboard: { writeText: async text => { context.copied = text; } } },
    speakFairyTTS: (text, after) => { speech.push({ text, after }); }, fairyReward: () => speech.push({ text: 'reward' }),
    stopFairyTTS: () => {}, matchMedia: () => ({ matches: false }),
    DEFAULT_GALLERY_DATA: [], MonsterRoster: { charactersOf: () => [] },
    addEventListener: (type, fn) => { listeners.set(type, [...listeners.get(type) || [], fn]); }
  };
  context.window = context; vm.createContext(context);
  const load = name => vm.runInContext(read(name), context, { filename: name });
  const files = game === 'yut'
    ? ['family-players.js', `${game}-engine.js`, `${game}-ui.js`]
    : ['family-players.js', 'family-room.js', 'family-room-ui.js', `${game}-engine.js`, `${game}-ui.js`];
  files.forEach(load);
  const fire = (key, event = {}) => { for (const fn of listeners.get(key) || []) fn(event); };
  const $ = id => document.getElementById(id);
  const find = (text, host = body) => host.querySelectorAll('button').find(n => n.textContent === text);
  const connect = (s = snapshot()) => { const ws = sockets.at(-1); ws.open(); ws.message(s); return ws; };
  const boot = () => (game === 'yacht' ? context.YachtUI : game === 'yut' ? context.YutUI : context.OmokUI).boot();
  return { context, $, find, connect, boot, load, fire, tick, timers, store, nodes, sockets, requests, speech, Node, body };
}
export function players() {
  return [{ id: 'p1', name: '민서', avatar: { type: 'emoji', value: '🐰' }, assist: 'helper' },
    { id: 'p2', name: '민수', avatar: { type: 'emoji', value: '🐻' }, assist: 'tactic' }];
}
export function snapshot({ phase = 'lobby', rev = 0, state = null, hostId = CLIENT, seats, you = CLIENT, gameType = 'yacht', maxSeats = 5 } = {}) {
  return { type: 'snapshot', room: { code: '4821', gameType, maxSeats, phase, hostId, rev },
    members: [{ id: CLIENT, online: true }, { id: OTHER, online: true }],
    seats: seats || players().map((p, i) => ({ ...p, owner: i ? OTHER : CLIENT })), state, you };
}
export const turns = async () => { for (let n = 0; n < 8; n++) await Promise.resolve(); };
