// 부모 진도(questSettings) 저장이 아이마다 자기 노션 줄에 자기 몫만 쓰는지 (2026-11-28 리팩토링 묶음 G)
// 예전: 「지금 프로필 아이」 줄에 두 아이 몫을 통째로 써서, 민서 프로필에서 고친 민수 진도가 민수 줄에 닿지 않았다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const CONTROLLER = 'kids/subjects/quest/parent_progress_controller.js';

const MINSU = { semester: '5-2', math: 'division', english: 'L11', science: '3. 열과 우리 생활' };
const MINSEO = { semester: '1-2', korean: '6단원 (6. 문장을 읽고 써요)', math: 'addsub', english: ['L1', 'L2'] };

// pages: 노션에서 새로 읽을 때 돌려줄 학습설정 글 { page_minsu: '{...}' }, failRead: 읽기 실패할 페이지
function setup({ minseoProfile = false, store = {}, pages = {}, failRead = [], noProp = [], failPatch = [] } = {}) {
  const kv = new Map(Object.entries({
    MINMIN_INVENTORY_PAGE_ID_민수: 'page_minsu',
    MINMIN_INVENTORY_PAGE_ID_민서: 'page_minseo',
    ...store
  }));
  const calls = [];
  const warnings = [];
  const sandbox = {
    console: { log() {}, info() {}, warn: (...a) => warnings.push(a.join(' ')), error() {} },
    setTimeout, clearTimeout, Date, Math, JSON, URLSearchParams,
    MutationObserver: class { observe() {} disconnect() {} },
    alert() {},
    localStorage: {
      getItem: (k) => (kv.has(k) ? kv.get(k) : null),
      setItem: (k, v) => { kv.set(k, String(v)); },
      removeItem: (k) => { kv.delete(k); }
    },
    location: { search: '', pathname: '/lobby.html', href: 'https://school.test/lobby.html' },
    document: {
      readyState: 'complete', addEventListener() {}, getElementById: () => null, querySelector: () => null,
      querySelectorAll: () => [],
      createElement: () => ({ style: {}, classList: { add() {}, remove() {} }, appendChild() {}, querySelector: () => null, querySelectorAll: () => [] }),
      head: { appendChild() {} }, body: { appendChild() {}, classList: { add() {}, remove() {} } }
    },
    fetch: async (url, options = {}) => {
      const method = options.method || 'GET';
      calls.push({ url, method, body: options.body ? JSON.parse(options.body) : null });
      const m = /\/v1\/pages\/([^/?]+)/.exec(url);
      if (method === 'GET' && m) {
        if (failRead.includes(m[1])) return { ok: false, status: 500, json: async () => ({}) };
        if (noProp.includes(m[1])) return { ok: true, status: 200, json: async () => ({ id: m[1], properties: {} }) };
        const text = pages[m[1]] || '';
        return { ok: true, status: 200, json: async () => ({ id: m[1], properties: { 학습설정: { rich_text: text ? [{ plain_text: text }] : [] } } }) };
      }
      if (method === 'PATCH' && m && failPatch.includes(m[1])) return { ok: false, status: 500, json: async () => ({}) };
      return { ok: true, status: 200, json: async () => ({ id: 'ok', results: [] }) };
    }
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  if (minseoProfile) sandbox.isMinseo = true;
  vm.createContext(sandbox);
  vm.runInContext(read('kids/core/fairy-settings-catalog.js'), sandbox);
  vm.runInContext(read('kids/subjects/quest/parent_unit_chips.js'), sandbox);
  vm.runInContext(read(CONTROLLER), sandbox);
  return { sandbox, calls, warnings, kv, failPatch };
}

const settle = () => new Promise((r) => setTimeout(r, 20));
const patches = (calls) => calls.filter((c) => c.method === 'PATCH');
const bodyOf = (call) => JSON.parse(call.body.properties['학습설정'].rich_text.map((p) => p.text.content).join(''));
const pageOf = (call) => /\/v1\/pages\/([^/?]+)/.exec(call.url)[1];

// 두 아이 몫이 섞인 옛 모양 캐시 (2026-11 운영 노션과 같은 꼴)
const mixed = (extra) => JSON.stringify({ questSettings: { minsu: MINSU, minseo: MINSEO }, piggyBank: { coins: 4 }, quizFlow: { 국어: 'review' }, ...extra });

test('내 프로필 저장: 내 줄 하나에 내 몫만, 다른 칸(저금통·퀴즈 흐름)은 그대로, 다른 아이 몫은 빠짐', async () => {
  const { sandbox, calls, kv } = setup({ store: { MINMIN_CLOUD_SETTINGS_민수: mixed(), MINMIN_CLOUD_SETTINGS_민서: mixed() } });
  sandbox.saveParentProgressSettings();
  await settle();
  const ps = patches(calls);
  assert.equal(ps.length, 1);
  assert.equal(pageOf(ps[0]), 'page_minsu');
  const sent = bodyOf(ps[0]);
  assert.deepEqual(Object.keys(sent.questSettings), ['minsu']);
  assert.equal(sent.questSettings.minsu.science, '3. 열과 우리 생활');
  assert.equal(sent.piggyBank.coins, 4);
  assert.equal(sent.quizFlow.국어, 'review');
  assert.equal(calls.filter((c) => c.method === 'GET').length, 0, '내 줄은 쓸 만한 캐시가 있으면 다시 읽지 않음');
  assert.deepEqual(Object.keys(JSON.parse(kv.get('MINMIN_CLOUD_SETTINGS_민수')).questSettings), ['minsu']);
});

test('민서 프로필에서 민수 진도 한 과목을 고치면: 민수 줄만, 새로 읽은 노션 값 위에 바꾼 과목만 얹음', async () => {
  const minsuRow = JSON.stringify({ questSettings: { minsu: MINSU, minseo: MINSEO }, piggyBank: { coins: 9 }, appSettings: { theme_skin: 'space' } });
  const { sandbox, calls, kv } = setup({
    minseoProfile: true,
    // 이 기기엔 민수 캐시가 없다 → 민수 진도는 기본값(영어 L9). 노션의 L11을 되돌리면 안 된다
    store: { MINMIN_CLOUD_SETTINGS_민서: mixed() },
    pages: { page_minsu: minsuRow }
  });
  sandbox.setParentUnit('minsu', 'science', '4. 자원과 에너지');
  sandbox.saveParentProgressSettings();
  await settle();
  const ps = patches(calls);
  assert.deepEqual(ps.map(pageOf), ['page_minsu'], '안 고친 민서 줄은 쓰지 않음');
  const sent = bodyOf(ps[0]);
  assert.deepEqual(Object.keys(sent.questSettings), ['minsu']);
  assert.equal(sent.questSettings.minsu.science, '4. 자원과 에너지');
  assert.equal(sent.questSettings.minsu.english, 'L11', '안 고친 과목은 노션 값 그대로');
  assert.equal(sent.piggyBank.coins, 9);
  assert.equal(sent.appSettings.theme_skin, 'space');
  const read = calls.find((c) => c.method === 'GET' && pageOf(c) === 'page_minsu');
  assert.ok(read && read.url.includes('force=true'), '다른 아이 줄은 캐시 우회로 새로 읽음');
  assert.equal(sandbox.currentParentSettings.minsu.english, 'L11', '화면 값도 노션과 맞춤');
  assert.equal(JSON.parse(kv.get('MINMIN_QUEST_SETTINGS')).minsu.english, 'L11');

  // 같은 내용으로 다시 저장하면 바뀐 아이가 없으니 지금 프로필(민서) 줄만
  calls.length = 0;
  sandbox.saveParentProgressSettings();
  await settle();
  assert.deepEqual(patches(calls).map(pageOf), ['page_minseo']);
});

test('낡은 다른 아이 캐시가 있어도 노션을 새로 읽은 값 위에 씀', async () => {
  const minsuRow = JSON.stringify({ questSettings: { minsu: MINSU }, piggyBank: { coins: 9 } });
  const { sandbox, calls } = setup({
    minseoProfile: true,
    store: { MINMIN_CLOUD_SETTINGS_민서: mixed(), MINMIN_CLOUD_SETTINGS_민수: mixed({ piggyBank: { coins: 1 } }) },
    pages: { page_minsu: minsuRow }
  });
  sandbox.setParentUnit('minsu', 'english', 'L12');
  sandbox.saveParentProgressSettings();
  await settle();
  const sent = bodyOf(patches(calls)[0]);
  assert.equal(sent.piggyBank.coins, 9);
  assert.equal(sent.questSettings.minsu.english, 'L12');
});

test('다른 아이를 안 고쳤으면 그 아이 줄은 쓰지 않음 (이 기기의 낡은 값으로 되돌리지 않게)', async () => {
  const { sandbox, calls } = setup({ minseoProfile: true, store: { MINMIN_CLOUD_SETTINGS_민서: mixed() } });
  sandbox.setParentUnit('minseo', 'math', 'shapes');
  sandbox.saveParentProgressSettings();
  await settle();
  assert.deepEqual(patches(calls).map(pageOf), ['page_minseo']);
  assert.equal(calls.filter((c) => c.method === 'GET').length, 0);
  assert.equal(bodyOf(patches(calls)[0]).questSettings.minseo.math, 'shapes');
});

test('다른 아이 줄을 못 읽거나(실패·속성 없음) 해석 못 하면 쓰지 않고 경고, 다음 저장 때 다시 보냄', async () => {
  for (const opt of [{ failRead: ['page_minsu'] }, { noProp: ['page_minsu'] }, { pages: { page_minsu: '{깨진' } }]) {
    const { sandbox, calls, warnings } = setup({ minseoProfile: true, store: { MINMIN_CLOUD_SETTINGS_민서: mixed() }, ...opt });
    sandbox.setParentUnit('minsu', 'english', 'L12');
    sandbox.saveParentProgressSettings();
    await settle();
    assert.deepEqual(patches(calls).map(pageOf), [], JSON.stringify(opt));
    assert.ok(warnings.some((w) => w.includes('저장 보류') && w.includes('민수')), warnings.join(' | '));
  }
});

test('PATCH가 실패하면 캐시를 바꾸지 않고, 다음 저장 때 다시 보냄', async () => {
  const minsuRow = JSON.stringify({ questSettings: { minsu: MINSU } });
  const { sandbox, calls, kv, failPatch } = setup({ minseoProfile: true, store: { MINMIN_CLOUD_SETTINGS_민서: mixed() }, pages: { page_minsu: minsuRow }, failPatch: ['page_minsu'] });
  sandbox.setParentUnit('minsu', 'english', 'L12');
  sandbox.saveParentProgressSettings();
  await settle();
  assert.equal(kv.get('MINMIN_CLOUD_SETTINGS_민수'), undefined, '실패한 값으로 캐시를 덮지 않음');
  failPatch.length = 0;
  calls.length = 0;
  sandbox.saveParentProgressSettings();
  await settle();
  assert.deepEqual(patches(calls).map(pageOf), ['page_minsu']);
  assert.equal(bodyOf(patches(calls)[0]).questSettings.minsu.english, 'L12');
  assert.ok(kv.get('MINMIN_CLOUD_SETTINGS_민수').includes('L12'));
});

test('내 캐시가 비었으면 노션을 먼저 읽어 다른 칸을 지우지 않음', async () => {
  const { sandbox, calls } = setup({ pages: { page_minsu: JSON.stringify({ piggyBank: { coins: 2 }, questSettings: { minsu: MINSU } }) } });
  sandbox.saveParentProgressSettings();
  await settle();
  const ps = patches(calls);
  assert.equal(ps.length, 1);
  assert.equal(bodyOf(ps[0]).piggyBank.coins, 2);
  assert.equal(bodyOf(ps[0]).questSettings.minsu.english, 'L11', '노션 진도를 기본값으로 되돌리지 않음');
});

test('지키기: 학습설정에 쓰는 코드가 두 아이 몫을 통째로 넣지 않음', () => {
  const src = read(CONTROLLER);
  assert.doesNotMatch(src, /questSettings\s*=\s*currentParentSettings\s*;/);
  assert.match(src, /questSettings = \{ \[childKey\]: nextValue \}/);
  // 스크린타임 승인은 그 아이 키로만 (quiz-flow-controller)
  const qf = read('kids/core/quiz-flow-controller.js');
  assert.match(qf, /currentSettings\.screenTime\[childKey\] =/);
  assert.doesNotMatch(qf, /screenTime\.(minsu|minseo)\s*=/);
});
