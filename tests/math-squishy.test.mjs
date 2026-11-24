// 🫧 말랑 버튼(MathSquishy) 시험: 소리 목록·아이별 설정·잠금/해금·소리 없는 환경에서 안전 (docs/math_2-1_ladder_spec.md §3-3)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { read } from './split-rules.mjs';

const FILE = 'kids/subjects/math/js/math_squishy.js';
const plain = (x) => JSON.parse(JSON.stringify(x));

function fakeStorage(init = {}) {
  const m = new Map(Object.entries(init));
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); },
    _map: m
  };
}

function load(win) {
  const sandbox = { window: win };
  vm.createContext(sandbox);
  vm.runInContext(read(FILE), sandbox, { filename: FILE });
  return sandbox.window.MathSquishy;
}

test('소리 목록: 순서·잠김 표시', () => {
  const S = load({ localStorage: fakeStorage(), currentChild: 'minseo' });
  assert.deepEqual(plain(S.SOUNDS.map((x) => x.id)), ['keycap', 'slime', 'mallang', 'jelly', 'bell', 'off']);
  assert.deepEqual(plain(S.SOUNDS.filter((x) => x.locked).map((x) => x.id)), ['jelly', 'bell']);
  for (const x of S.SOUNDS) assert.ok(typeof x.label === 'string' && x.label.length > 0);
});

test('아이 구분과 기본값: 민서는 슬라임, 민수는 소리 없음, 모르는 아이는 민수', () => {
  assert.equal(load({ localStorage: fakeStorage(), currentChild: 'minseo' }).childKey(), 'minseo');
  assert.equal(load({ localStorage: fakeStorage(), currentChild: 'someone' }).childKey(), 'minsu');
  assert.equal(load({ localStorage: fakeStorage() }).childKey(), 'minsu');
  assert.deepEqual(plain(load({ localStorage: fakeStorage(), currentChild: 'minseo' }).getPrefs()), { sound: 'slime', unlocked: [] });
  assert.deepEqual(plain(load({ localStorage: fakeStorage(), currentChild: 'minsu' }).getPrefs()), { sound: 'off', unlocked: [] });
});

test('저장이 깨졌거나 저장소가 없어도 기본값으로 돈다', () => {
  const broken = load({ localStorage: fakeStorage({ math_squishy_minseo: '{not json' }), currentChild: 'minseo' });
  assert.equal(broken.getPrefs().sound, 'slime');
  const none = load({ currentChild: 'minseo' });
  assert.doesNotThrow(() => none.getPrefs());
  assert.equal(none.getPrefs().sound, 'slime');
  const throwing = load({
    localStorage: { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } },
    currentChild: 'minseo'
  });
  assert.doesNotThrow(() => throwing.setSound('keycap'));
});

test('소리 고르기·잠금·해금, 아이별로 따로 저장', () => {
  const store = fakeStorage();
  const win = { localStorage: store, currentChild: 'minseo' };
  const S = load(win);
  assert.equal(S.setSound('keycap'), true);
  assert.equal(S.getPrefs().sound, 'keycap');
  assert.equal(S.setSound('jelly'), false, '잠긴 소리는 고를 수 없음');
  assert.equal(S.getPrefs().sound, 'keycap');
  assert.equal(S.setSound('nope'), false);
  assert.equal(S.isUnlocked('jelly'), false);
  assert.equal(S.isUnlocked('slime'), true);
  assert.equal(S.unlock('jelly'), true);
  assert.equal(S.unlock('jelly'), false, '이미 열림');
  assert.equal(S.unlock('keycap'), false, '원래 열린 소리');
  assert.equal(S.unlock('nope'), false);
  assert.equal(S.isUnlocked('jelly'), true);
  assert.equal(S.setSound('jelly'), true);
  assert.deepEqual(plain(JSON.parse(store.getItem('math_squishy_minseo'))), { sound: 'jelly', unlocked: ['jelly'] });
  win.currentChild = 'minsu';
  assert.equal(S.getPrefs().sound, 'off', '민수 설정은 따로');
  assert.equal(S.isUnlocked('jelly'), false);
});

test('소리를 낼 수 없는 환경(AudioContext 없음)에서도 play가 멈추지 않는다', () => {
  const S = load({ localStorage: fakeStorage(), currentChild: 'minseo' });
  for (const x of S.SOUNDS) assert.doesNotThrow(() => S.play(x.id));
  assert.doesNotThrow(() => S.play('nope'));
});

test('파일 규칙: innerHTML·인라인 style 속성 없음, 600줄 이하', () => {
  const src = read(FILE);
  assert.doesNotMatch(src, /innerHTML/);
  assert.doesNotMatch(src, /\.style\.[a-zA-Z]+\s*=|setAttribute\(\s*['"]style/);
  assert.ok(src.split('\n').length <= 600);
});
