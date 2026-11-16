// 가족 우체통 시험 전용 모의 브라우저와 모의 서버 (시험 파일이 아님). 실제 네트워크·노션을 쓰지 않는다.
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';

export const root = new URL('../', import.meta.url);
export const read = file => readFileSync(new URL(file, root), 'utf8');
export const tick = () => new Promise(resolve => setImmediate(resolve));
export async function settle(times = 6) { for (let i = 0; i < times; i++) await tick(); }

class Node {
  constructor(document, tag) {
    this.ownerDocument = document;
    this.tagName = String(tag).toUpperCase();
    this.children = [];
    this.parent = null;
    this.listeners = {};
    this.attributes = {};
    this.dataset = {};
    this.style = {};
    this.className = '';
    this.text = '';
    this.hidden = false;
    this.disabled = false;
    this.value = '';
    const node = this;
    this.classList = {
      add: (...names) => names.forEach(name => { if (!node.classList.contains(name)) node.className = `${node.className} ${name}`.trim(); }),
      remove: (...names) => { node.className = node.className.split(/\s+/).filter(n => n && !names.includes(n)).join(' '); },
      contains: name => node.className.split(/\s+/).includes(name),
      toggle: (name, force) => {
        const on = force === undefined ? !node.classList.contains(name) : Boolean(force);
        if (on) node.classList.add(name); else node.classList.remove(name);
        return on;
      }
    };
  }
  get firstChild() { return this.children[0] || null; }
  set textContent(value) { this.children.forEach(child => { child.parent = null; }); this.children = []; this.text = String(value ?? ''); }
  get textContent() { return this.text + this.children.map(child => child.textContent).join(''); }
  set innerHTML(_) { throw new Error('innerHTML 사용 금지'); }
  append(...nodes) {
    for (const item of nodes) {
      const child = typeof item === 'string' ? this.ownerDocument.createTextNode(item) : item;
      if (child.parent) child.remove();
      child.parent = this;
      this.children.push(child);
    }
  }
  appendChild(child) { this.append(child); return child; }
  removeChild(child) { child.remove(); return child; }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter(c => c !== this); this.parent = null; }
  setAttribute(key, value) { this.attributes[key] = String(value); if (key === 'id') this.id = String(value); }
  getAttribute(key) { return this.attributes[key] ?? null; }
  addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
  dispatch(type, extra = {}) {
    let stopped = false;
    const event = { type, target: this, preventDefault() {}, stopPropagation() { stopped = true; }, ...extra };
    for (let node = this; node && !stopped; node = node.parent) for (const fn of node.listeners[type] || []) fn(event);
  }
  click() { if (!this.disabled) this.dispatch('click'); }
  focus() { this.ownerDocument.activeElement = this; }
  scrollIntoView() {}
  get isConnected() { let node = this; while (node.parent) node = node.parent; return node === this.ownerDocument.documentElement; }
  matches(selector) {
    return selector.split(/,\s*/).some(part => {
      const attr = /^\[([\w-]+)\]$/.exec(part);
      if (attr) return Object.hasOwn(this.attributes, attr[1]);
      if (part.startsWith('.')) return part.slice(1).split('.').every(name => this.classList.contains(name));
      if (part.startsWith('#')) return this.id === part.slice(1);
      return this.tagName === part.toUpperCase();
    });
  }
  all() { return this.children.flatMap(child => [child, ...child.all()]); }
  querySelectorAll(selector) { return this.all().filter(node => node.matches(selector)); }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
}

// 화면 HTML에서 id 요소와 data-family-mail-* 속성 요소만 뽑아 몸통에 붙인다
function mount(document, html) {
  for (const match of html.matchAll(/<(\w+)\b([^>]*?)>/g)) {
    const attrs = match[2];
    const id = /\bid="([^"]+)"/.exec(attrs);
    const chip = /\bdata-family-mail-(chip|count)\b/.exec(attrs);
    if (!id && !chip) continue;
    const node = document.createElement(match[1]);
    if (id) node.setAttribute('id', id[1]);
    if (chip) node.setAttribute(`data-family-mail-${chip[1]}`, '');
    node.hidden = /\shidden(\s|$|>)/.test(attrs);
    document.body.appendChild(node);
  }
}

export function createBrowser({ url = 'https://awslike6-web.github.io/kids-school/lobby.html', html = '', storage = {}, fetch, watch = '', scriptPath = 'kids/core/family-mail.js', confirm = () => true } = {}) {
  const href = new URL(url);
  const intervals = [];
  const navigations = [];
  const winListeners = {};
  const localData = new Map(Object.entries(storage));
  const sessionData = new Map();
  const makeStorage = map => ({
    getItem: key => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => { map.set(key, String(value)); },
    removeItem: key => { map.delete(key); }
  });
  const document = {
    readyState: 'complete', visibilityState: 'visible', activeElement: null, listeners: {},
    createElement: tag => new Node(document, tag),
    createTextNode: text => { const node = new Node(document, '#text'); node.text = String(text); return node; },
    getElementById: id => document.documentElement.all().find(node => node.id === id) || null,
    querySelectorAll: selector => document.documentElement.querySelectorAll(selector),
    querySelector: selector => document.documentElement.querySelector(selector),
    addEventListener: (type, fn) => { (document.listeners[type] ||= []).push(fn); },
    currentScript: { src: new URL(scriptPath, href).href, dataset: watch ? { watch } : {} }
  };
  document.documentElement = new Node(document, 'html');
  document.head = new Node(document, 'head');
  document.body = new Node(document, 'body');
  document.documentElement.append(document.head, document.body);
  mount(document, html);

  const location = {
    hostname: href.hostname, search: href.search, pathname: href.pathname,
    get href() { return href.href; },
    set href(value) { navigations.push(String(value)); }
  };
  const window = {
    document, location, console, URL, URLSearchParams, JSON, Math, Date, Promise, Array, Object, String, Number, Set, Map, Error, Uint8Array,
    atob, btoa, crypto: webcrypto, setTimeout, clearTimeout,
    setInterval: fn => { intervals.push(fn); return intervals.length; }, clearInterval() {},
    requestAnimationFrame: fn => setTimeout(fn, 0),
    localStorage: makeStorage(localData), sessionStorage: makeStorage(sessionData),
    navigator: {}, matchMedia: () => ({ matches: false }), confirm,
    CustomEvent: class { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } },
    addEventListener: (type, fn) => { (winListeners[type] ||= []).push(fn); },
    dispatchEvent: event => { (winListeners[event.type] || []).forEach(fn => fn(event)); return true; },
    fetch: (...args) => fetch(...args)
  };
  window.window = window;
  window.self = window;
  const context = vm.createContext(window);
  return {
    window, document, localData, sessionData, navigations, intervals,
    load(file) { vm.runInContext(read(file), context, { filename: file }); },
    run(code) { return vm.runInContext(code, context); }
  };
}

// 모의 family-mail 서버: 1단계 Worker와 같은 경로·응답 모양만 흉내 낸다
export function fakeServer({ members = { tokenMinseo: 'minseo', tokenMom: 'mom' } } = {}) {
  const calls = [];
  const messages = [];
  const state = { failRead: false, failSend: 0, code: 'family-code', nextToken: 'token_' };
  let counter = 0;
  const reply = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
  async function fetch(url, init = {}) {
    const target = new URL(url);
    const body = init.body ? JSON.parse(init.body) : undefined;
    const auth = (init.headers && init.headers.Authorization) || '';
    calls.push({ path: target.pathname, search: target.search, method: init.method || 'GET', body, auth, origin: target.origin });
    const who = members[auth.replace('Bearer ', '')];
    if (target.pathname === '/register') {
      if (body.familyCode !== state.code) return reply(403, { error: 'wrong_code', message: '가족 코드가 맞지 않아요', remaining: 4 });
      const token = `${state.nextToken}${++counter}`.padEnd(43, 'x');
      members[token] = body.member;
      return reply(200, { deviceToken: token, member: body.member });
    }
    if (target.pathname === '/vapid-public-key') return reply(200, { publicKey: 'BPub' });
    if (!who) return reply(401, { error: 'unauthorized', message: '이 기기를 다시 등록해 주세요' });
    if (target.pathname === '/unread') {
      const unread = messages.filter(m => m.to === who && !m.read);
      return reply(200, { count: unread.length, more: unread.length > 99, items: unread.slice(0, 3) });
    }
    if (target.pathname === '/messages') {
      const box = target.searchParams.get('box');
      const list = messages.filter(m => (box === 'sent' ? m.from === who : m.to === who)).slice().reverse();
      return reply(200, { messages: list, nextCursor: null });
    }
    if (target.pathname === '/read') {
      if (state.failRead) return reply(503, { error: 'notion_unavailable', message: '잠시 뒤에 다시 해 주세요' });
      const read = body.ids.filter(id => messages.some(m => m.id === id && m.to === who));
      read.forEach(id => { const m = messages.find(x => x.id === id); m.read = true; m.readAt = '2026-11-16T20:00:00+09:00'; });
      return reply(200, { read, rejected: body.ids.filter(id => !read.includes(id)) });
    }
    if (target.pathname === '/send') {
      if (state.failSend > 0) { state.failSend -= 1; return reply(503, { error: 'notion_unavailable', message: '잠시 뒤에 다시 해 주세요' }); }
      const message = { id: `m${messages.length + 1}`, from: who, to: body.to, text: body.text, sentAt: '2026-11-16T19:00:00+09:00', read: false, readAt: null };
      messages.push(message);
      return reply(200, { message });
    }
    if (target.pathname === '/device' && init.method === 'DELETE') return reply(200, { ok: true });
    return reply(404, { error: 'not_found', message: '없는 주소예요' });
  }
  const add = (from, to, text, extra = {}) => {
    const message = { id: `m${messages.length + 1}`, from, to, text, sentAt: '2026-11-16T19:00:00+09:00', read: false, readAt: null, ...extra };
    messages.push(message);
    return message;
  };
  return { fetch, calls, messages, state, add, members };
}

export const deviceStorage = (member = 'minseo', token = 'tokenMinseo') => ({ familyMailDevice: JSON.stringify({ token, member, label: '' }) });
