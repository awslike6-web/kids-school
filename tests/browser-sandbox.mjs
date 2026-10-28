import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// 브라우저 전역 스크립트를 모의 fetch·독립 localStorage와 함께 불러옵니다.
export function loadBrowserScripts(files, { userName = '민수', fetch: mockFetch, storage } = {}) {
  const calls = [];
  const fetch = async (url, options = {}) => {
    const body = options.body ? JSON.parse(options.body) : {};
    calls.push({ url, method: options.method || 'GET', body });
    if (mockFetch) return mockFetch(url, options);
    if (url.includes('/query')) return { ok: true, status: 200, json: async () => ({ results: [] }) };
    return { ok: true, status: 200, json: async () => ({ id: `mock_${calls.length}` }), text: async () => '' };
  };
  const store = { currentUserName: userName, currentChild: 'minsu' };
  const sandbox = {
    console: { log() {}, info() {}, warn() {}, error: console.error },
    setTimeout, clearTimeout, Date, Math, JSON, fetch,
    localStorage: storage || {
      getItem: (k) => store[k] ?? null,
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; },
    },
    location: { pathname: '/kids/subjects/quest/quest_runner.html' },
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  for (const file of files) {
    vm.runInContext(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), sandbox, { filename: file });
  }
  return { sandbox, calls };
}
