// tests/english-qwerty.test.mjs
// 폰용 영문 자판 + 글자 칸 입력기(kids/js/english_qwerty.js)와 클래스카드 타이핑 비중 회귀 시험. 노션·브라우저 없이 돈다.
// - 글자 칸 규칙: 자동 건너뜀({…}·/·~·.·?), 끝쪽·기호 뒤 띄어쓰기 다듬기, 대소문자 무시
// - 입력기: 틀린 키는 칸에 안 들어감(에러리스), 완료 콜백 한 번, 지우기, 위치 안내(항상·막히면·끄기), 정리
// - 카드 퀴즈: 블럭 전체·마무리 타이핑·전체 타이핑 자리 계산과 카드 배치
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const base = new URL('../', import.meta.url);
const read = rel => readFileSync(new URL(rel, base), 'utf8');

// ---- 아주 작은 가짜 DOM (입력기가 쓰는 만큼만) ----
function fakeDocument() {
  const listeners = {};
  function el(tag) {
    const classes = new Set();
    const attrs = {};
    const evs = {};
    const node = {
      tagName: tag.toUpperCase(), children: [], parent: null, _text: '', isConnected: true, offsetParent: {},
      get className() { return [...classes].join(' '); },
      set className(v) { classes.clear(); String(v).split(/\s+/).filter(Boolean).forEach(c => classes.add(c)); },
      get textContent() { return this._text + this.children.map(c => c.textContent).join(''); },
      set textContent(v) { this._text = String(v); this.children = []; },
      get offsetWidth() { return 10; },
      classList: {
        add: (...c) => c.forEach(x => classes.add(x)),
        remove: (...c) => c.forEach(x => classes.delete(x)),
        contains: c => classes.has(c),
        toggle: (c, f) => ((f ?? !classes.has(c)) ? classes.add(c) : classes.delete(c))
      },
      setAttribute(k, v) { attrs[k] = String(v); },
      getAttribute(k) { return attrs[k] ?? null; },
      appendChild(ch) { ch.parent = node; node.children.push(ch); return ch; },
      contains(x) { for (let n = x; n; n = n.parent) if (n === node) return true; return false; },
      closest(sel) { const cls = sel.replace('.', ''); for (let n = node; n; n = n.parent) if (n.classList.contains(cls)) return n; return null; },
      addEventListener(t, fn) { (evs[t] = evs[t] || []).push(fn); },
      removeEventListener(t, fn) { evs[t] = (evs[t] || []).filter(f => f !== fn); },
      fire(t, e) { (evs[t] || []).forEach(fn => fn(e)); },
      all() { return [node, ...node.children.flatMap(c => c.all())]; }
    };
    return node;
  }
  return {
    createElement: el,
    addEventListener(t, fn) { (listeners[t] = listeners[t] || []).push(fn); },
    removeEventListener(t, fn) { listeners[t] = (listeners[t] || []).filter(f => f !== fn); },
    keydown(key, extra = {}) { (listeners.keydown || []).forEach(fn => fn({ key, preventDefault() {}, ...extra })); },
    count(t) { return (listeners[t] || []).length; },
    el
  };
}

function load({ withDom = false, files = ['kids/js/english_qwerty.js'] } = {}) {
  const ctx = { console, Math, setTimeout, clearTimeout, setInterval, clearInterval };
  if (withDom) ctx.document = fakeDocument();
  ctx.window = ctx;
  vm.createContext(ctx);
  for (const f of files) vm.runInContext(read(f), ctx, { filename: f });
  return ctx;
}

const kinds = (Q, s) => Q.buildSlots(s).map(x => x.kind[0] === 's' ? (x.kind === 'skip' ? '-' : '_') : 'k').join('');

test('글자 칸: 불러올 때 document 없이 동작하고, 건너뜀 규칙은 맨 위 상수 한 줄', () => {
  const { EnglishQwerty: Q } = load(); // document 없음
  assert.equal(String(Q.AUTO_SKIP_REGEX), String(/\{[^}]*\}|[\/~.?]/g));
  assert.match(read('kids/js/english_qwerty.js'), /var AUTO_SKIP_REGEX = /);
});

test('글자 칸: 클래스카드 기호 처리와 띄어쓰기 다듬기', () => {
  const { EnglishQwerty: Q } = load();
  assert.equal(kinds(Q, 'bank'), 'kkkk');
  assert.equal(kinds(Q, 'bus stop'), 'kkk_kkkk');
  assert.equal(kinds(Q, 'Where is the~?'), 'kkkkk_kk_kkk--');
  assert.equal(kinds(Q, "It's on your left/right."), "kkkk_kk_kkkk_kkkk-kkkkk-");
  // {2}는 통째로 건너뛰고, 그 뒤 띄어쓰기도 건너뜀 → 아이는 공백 한 번만 친다
  assert.equal(kinds(Q, 'go straight {2} blocks'), 'kk_kkkkkkkk_----kkkkkk');
  // 끝쪽 띄어쓰기는 건너뜀
  assert.equal(kinds(Q, "It's next to the ~"), 'kkkk_kkkk_kk_kkk--');
  // 기호로 시작하면 그 뒤 첫 띄어쓰기도 건너뜀 (Space부터 치지 않게, 검토 지적 2026-11-23)
  assert.equal(kinds(Q, '~ apple'), '--kkkkk');
  // 대소문자 무시 + 원래 글자 보존
  const s = Q.buildSlots("It's");
  assert.equal(s.map(x => x.expect).join(''), "it's");
  assert.equal(s.map(x => x.ch).join(''), "It's");
  assert.equal(Q.keyOf(Q.buildSlots(' a')[1]), 'a');
  assert.equal(Q.keyOf({ kind: 'space', expect: ' ' }), 'space');
  assert.equal(Q.keyOf({ kind: 'skip', expect: null }), null);
});

test('입력기: 틀린 키는 칸에 안 들어가고, 다 맞히면 완료 콜백 한 번 + 지우기', () => {
  const ctx = load({ withDom: true });
  const host = ctx.document.el('div');
  const log = { done: 0, wrong: [], hint: 0 };
  const qw = ctx.EnglishQwerty.mount(host, {
    answer: "It's on", guide: 'off',
    onComplete: () => { log.done += 1; }, onWrong: (k, e) => log.wrong.push(`${k}>${e}`), onHint: () => { log.hint += 1; }
  });
  const slots = () => host.all().filter(n => n.classList.contains('qw-slot'));
  assert.equal(slots().length, 7);
  assert.equal(host.all().filter(n => n.classList.contains('qw-key')).length, 30, '자판 키 30개 (26 + ⌫ + \' + Space + 힌트)');
  qw.input('x');
  assert.deepEqual([...log.wrong], ['x>i']);
  assert.equal(slots()[0].textContent, '', '틀린 글자는 들어가지 않음');
  'it'.split('').forEach(k => qw.input(k));
  qw.input('back');
  assert.equal(slots()[1].textContent, '');
  "t's".split('').forEach(k => qw.input(k));
  qw.input('space');
  qw.input('o');
  assert.equal(qw.isDone(), false);
  qw.input('N'); // 대문자로 눌러도 소문자로 처리
  assert.equal(qw.isDone(), true);
  qw.input('x');
  assert.equal(log.done, 1);
  assert.equal(slots().map(s => s.textContent).join(''), "It's on"); // 띄어쓰기 칸에도 공백이 채워짐
  qw.hint();
  assert.equal(log.hint, 0, '끝난 뒤 힌트 무시');
});

test('입력기: 칠 칸이 하나도 없는 문제는 바로 끝난 것으로 한 번 알린다', async () => {
  const ctx = load({ withDom: true });
  let done = 0;
  const qw = ctx.EnglishQwerty.mount(ctx.document.el('div'), { answer: '{2}?', guide: 'off', onComplete: () => { done += 1; } });
  assert.equal(qw.isDone(), true);
  await new Promise(r => setTimeout(r, 5));
  qw.input('a');
  assert.equal(done, 1);
  qw.destroy();
});

test('입력기: 물리 키보드도 같은 처리, destroy 뒤에는 듣지 않음', () => {
  const ctx = load({ withDom: true });
  const host = ctx.document.el('div');
  let done = 0;
  const qw = ctx.EnglishQwerty.mount(host, { answer: 'ab', guide: 'off', onComplete: () => { done += 1; } });
  assert.equal(ctx.document.count('keydown'), 1);
  ctx.document.keydown('a', { ctrlKey: true }); // 조합키 무시
  ctx.document.keydown('A');
  ctx.document.keydown('b');
  assert.equal(done, 1);
  qw.destroy();
  qw.destroy();
  assert.equal(ctx.document.count('keydown'), 0);
});

test('입력기: 위치 안내 — 항상 켜기는 다음 키 표시, 막히면 반짝이기는 오타 때 정답 키 점등, 끄기는 표시 없음', () => {
  for (const [guide, expect] of [['always', { first: 'guide', afterWrong: 'guide' }], ['stuck', { first: '', afterWrong: 'blink' }], ['off', { first: '', afterWrong: '' }]]) {
    const ctx = load({ withDom: true });
    const host = ctx.document.el('div');
    const qw = ctx.EnglishQwerty.mount(host, { answer: 'go', guide, idleMs: 999999 });
    const key = k => host.all().find(n => n.getAttribute && n.getAttribute('data-key') === k);
    const mark = k => ['guide', 'blink'].filter(c => key(k).classList.contains(c)).join('');
    assert.equal(mark('g'), expect.first, `${guide} 처음`);
    qw.input('x');
    assert.equal(mark('g'), expect.afterWrong, `${guide} 오타 뒤`);
    qw.input('g');
    assert.equal(key('g').classList.contains('blink'), false, `${guide} 맞힌 뒤 반짝임 꺼짐`);
    qw.destroy();
  }
});

test('타이핑 비중: 블럭 전체 0자리 · 마무리 마지막 1~2자리 · 전체 타이핑은 철자 자리 전부', () => {
  const ctx = load({ files: ['kids/subjects/english/data/classcard_5-2_L11.js', 'kids/js/english_classcard.js', 'kids/js/english_qwerty.js', 'kids/js/english_classcard_cards.js'] });
  const { Cards } = ctx.EnglishClasscard;
  const pos = (n, m) => [...Cards.typingPositions(n, m)].join(',');
  assert.equal(pos(10, 'tiles'), '');
  assert.equal(pos(10, 'finish'), '5,8');
  assert.equal(pos(5, 'finish'), '2');
  assert.equal(pos(10, 'typing'), '2,5,8');
  const deck = ctx.CLASSCARD_DECK.items;
  for (let r = 0; r < 40; r++) {
    const all = Cards.buildQuestions(deck, deck, 10, 'typing').map(q => q.type);
    assert.equal([2, 5, 8].map(i => all[i]).join(','), 'typing,typing,typing');
    const fin = Cards.buildQuestions(deck, deck, 10, 'finish').map(q => q.type);
    assert.equal([2, 5, 8].map(i => fin[i]).join(','), 'spell,typing,typing');
    const tiles = Cards.buildQuestions(deck, deck, 10, 'tiles');
    assert.ok(tiles.every(q => q.type !== 'typing'));
    tiles.filter(q => q.type === 'spell').forEach(q => assert.ok(Cards.isSpellable(q.item), q.item.en));
  }
  // 기호가 든 문장도 타이핑으로는 낼 수 있다 (블럭으로는 못 냄)
  const sentence = deck.find(i => i.en === "It's on your left/right.");
  assert.equal(Cards.isSpellable(sentence), false);
  assert.equal(Cards.isTypable(sentence), true);
});

test('클래스카드 화면: 자판 CSS·모듈을 싣고, 로비에 타이핑 비중·자판 안내 단추가 있다', () => {
  const html = read('kids/subjects/english/classcard.html');
  assert.match(html, /english_qwerty\.css\?v=/);
  const order = ['/english_classcard.js', '/english_qwerty.js', '/english_classcard_cards.js'].map(n => html.indexOf(n));
  assert.ok(order.every(p => p > 0));
  assert.deepEqual(order, [...order].sort((a, b) => a - b));
  for (const v of ['data-typing="tiles"', 'data-typing="finish"', 'data-typing="typing"', 'data-guide="always"', 'data-guide="stuck"', 'data-guide="off"']) {
    assert.ok(html.includes(v), v);
  }
  const src = read('kids/js/english_qwerty.js');
  // 폰 OS 키보드가 뜨지 않게 입력창을 만들지 않는다 (머리 설명의 글자는 상관없음)
  assert.doesNotMatch(src, /speechSynthesis|createElement\(['"](?:input|textarea)|localStorage/);
});
