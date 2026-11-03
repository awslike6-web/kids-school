import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const base = new URL('../kids/playground/family/', import.meta.url);
const read = file => readFileSync(new URL(file, base), 'utf8');
const plain = value => JSON.parse(JSON.stringify(value));
const gallery = (id, charKey = 'main', url = `${id}.png`) => ({ type: 'gallery', value: { artId: id, charKey, name: '그림 친구', spriteUrl: url } });

// 클릭·이미지 이벤트·타이머·저장소를 제어합니다. 실제 운영 DB에는 접근하지 않습니다.
function browser({ data = [], blocked = false, saved, yacht = false } = {}) {
  const nodes = new Map(), timers = new Map(), store = new Map(), speech = [];
  let timerId = 0;
  class Node {
    constructor(tag = 'div') {
      this.tagName = tag; this.children = []; this.attributes = {}; this.listeners = {}; this.className = '';
      this.style = { setProperty: (k, v) => { this.style[k] = v; } }; this.dataset = {}; this.value = '';
      this.classList = { add: (...names) => { this.className += ` ${names.join(' ')}`; },
        remove: name => { this.className = this.className.replace(name, ''); } };
    }
    append(...children) { this.children.push(...children); }
    replaceChildren(...children) { this.children = [...children]; }
    setAttribute(k, v) { this.attributes[k] = String(v); }
    getAttribute(k) { return this.attributes[k]; }
    removeAttribute(k) { delete this.attributes[k]; }
    addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
    fire(type) { for (const fn of this.listeners[type] || []) fn({ target: this }); }
    click() { if (!this.disabled) this.fire('click'); }
    focus() { this.focused = true; }
    querySelectorAll(selector) { return this.children.filter(c => selector.split(', ').includes(c.tagName)); }
    remove() {}
  }
  if (saved) store.set(yacht ? 'familyYachtGame' : 'familyOmokGame', JSON.stringify(saved));
  const context = {
    document: { readyState: 'loading', createElement: tag => new Node(tag),
      getElementById: id => { if (!nodes.has(id)) nodes.set(id, new Node()); return nodes.get(id); }, addEventListener() {} },
    DEFAULT_GALLERY_DATA: data, MonsterRoster: { charactersOf: item => item.characters || [] },
    setTimeout: fn => { timers.set(++timerId, fn); return timerId; }, clearTimeout: id => timers.delete(id),
    localStorage: { getItem: key => { if (blocked) throw Error('저장소 차단'); return store.get(key) ?? null; },
      setItem: (key, value) => { if (blocked) throw Error('저장소 차단'); store.set(key, value); },
      removeItem: key => { if (blocked) throw Error('저장소 차단'); store.delete(key); } },
    fetch: () => { throw Error('시험에서 네트워크 금지'); },
    speakFairyTTS: (text, after) => { speech.push(text); if (after) after(); },
    fairyReward: () => speech.push('reward'), stopFairyTTS() {}, addEventListener() {},
    matchMedia: () => ({ matches: true })
  };
  context.window = context; vm.createContext(context);
  const load = file => vm.runInContext(read(file), context, { filename: file });
  load('family-players.js'); load('family-sound.js');
  const $ = id => context.document.getElementById(id);
  $('boardSize').value = '13';
  return { context, F: context.FamilyPlayers, nodes, $, timers, store, speech, Node, load };
}
const all = node => [node, ...node.children.flatMap(all)];
const modeNames = { helper: '도우미', tactic: '전술', classic: '클래식' };

test('로딩 때 DOM·저장소 접근 없이 FamilyPlayers 전역 하나만 추가한다', () => {
  const fail = () => { throw Error('로드 중 접근'); }, context = {};
  Object.defineProperties(context, { document: { get: fail }, localStorage: { get: fail } });
  context.window = context; vm.runInNewContext(read('family-players.js'), context);
  assert.deepEqual(Object.keys(context).sort(), ['FamilyPlayers', 'window']);
});

test('말 키·갤러리 캐릭터 목록은 작품+캐릭터 단위로 중복 제거한다', () => {
  const { F } = browser({ data: [null, { id: '' }, { id: 'art', characters: [
    { key: 'main', name: '첫째', spriteUrl: 'a.png' }, { key: 'second', name: '둘째', spriteUrl: 'b.png' }
  ] }, { id: 'art', characters: [{ key: 'main', name: '중복', spriteUrl: 'c.png' }] }] });
  assert.equal(F.avatarKey(gallery('a')), F.avatarKey(gallery('a')));
  assert.notEqual(F.avatarKey(gallery('a')), F.avatarKey(gallery('a', 'second')));
  assert.equal(F.collectAvatars().length, 7);
  assert.equal(new Set(F.collectAvatars().map(F.avatarKey)).size, 7);
});

test('오류·2.5초 지연은 서로 다른 이모지로 표시하고 게임 말 원본은 보존한다', () => {
  const { F, Node, timers } = browser(), players = [
    { id: 'p1', avatar: { type: 'emoji', value: '🐰' } },
    ...['p2', 'p3', 'p4', 'p5'].map(id => ({ id, avatar: gallery(id) }))
  ];
  const before = JSON.stringify(players), displays = players.map(() => new Node());
  players.forEach((p, i) => F.playerAvatar(displays[i], p, players));
  displays[1].children[0].fire('error');
  for (const fn of [...timers.values()]) fn();
  const emojis = displays.map(n => n.children[0].textContent);
  assert.equal(new Set(emojis).size, 5); assert.equal(JSON.stringify(players), before);
  const again = new Node(); F.playerAvatar(again, players[1], players);
  assert.equal(again.children[0].textContent, emojis[1]);
});

test('오래된 그림 타이머는 새 차례의 말 표시를 덮어쓰지 않는다', () => {
  const { F, Node, timers } = browser(), host = new Node();
  F.showAvatar(host, gallery('old')); F.showAvatar(host, { type: 'emoji', value: '🐻' });
  for (const fn of [...timers.values()]) fn();
  assert.equal(host.children[0].textContent, '🐻');
});

test('시작 설정은 이름 기본 도움·인원 변경·중복 말 방지·인자 도움 이름을 유지한다', () => {
  const { F, Node } = browser(), host = new Node();
  const setup = F.createSetup({ host, count: 2, min: 2, max: 5, modes: { ...modeNames, helper: '함께 찾기' } });
  assert.deepEqual(plain(setup.getPlayers().map(p => [p.name, p.assist])), [['민서', 'helper'], ['민수', 'tactic']]);
  assert.equal(host.children.length, 2);
  assert.ok(all(host).some(n => n.tagName === 'option' && n.textContent === '함께 찾기'));
  const dad = all(host.children[0]).find(n => n.tagName === 'button' && n.textContent === '아빠'); dad.click();
  assert.equal(setup.getPlayers()[0].assist, 'classic');
  const otherRabbit = all(host.children[1]).find(n => n.attributes['aria-label'] === '🐰 말');
  assert.equal(otherRabbit.disabled, true);
  setup.setCount(5); assert.equal(host.children.length, 5);
  assert.equal(new Set(setup.getPlayers().map(p => F.avatarKey(p.avatar))).size, 5);
  const copy = setup.getPlayers(); copy[0].name = '변경'; assert.equal(setup.getPlayers()[0].name, '아빠');
  setup.setCount(2); assert.throws(() => setup.setCount(6));
});

test('오목 실제 이벤트: 미리보기·두 번째 클릭·버튼 확정·자기 무르기·승부·저장 삭제·흑백 교대', () => {
  const b = browser(); b.load('omok-engine.js'); b.load('omok-ui.js'); b.context.OmokUI.boot();
  const { $, store, speech } = b; $('startGame').click();
  const getSaved = () => JSON.parse(store.get('familyOmokGame'));
  const cell = (x, y) => $('board').children[y * 13 + x];
  cell(0, 0).click(); assert.equal(getSaved().publicBoard.moves.length, 0);
  cell(1, 0).click(); assert.equal(getSaved().publicBoard.moves.length, 0);
  $('confirmPlace').click(); assert.equal(getSaved().publicBoard.moves[0].x, 1);
  assert.equal($('playersStatus').children[1].children[1].disabled, true);
  $('playersStatus').children[0].children[1].click(); assert.equal(getSaved().publicBoard.moves.length, 0);
  assert.equal(getSaved().publicBoard.undoLeft.p1, 1);
  function put(x, y) { cell(x, y).click(); cell(x, y).click(); }
  for (let x = 0; x < 4; x++) { put(x, 0); put(x * 2, 2); }
  assert.equal(speech.length, 1); put(4, 0);
  assert.equal(store.has('familyOmokGame'), false); assert.equal($('endView').hidden, false);
  assert.equal($('board').children.filter(n => n.className.includes('winning')).length, 5);
  assert.ok(speech.includes('민서, 이겼어요!')); assert.ok(speech.includes('reward'));
  $('playAgain').click(); assert.equal(getSaved().players[0].id, 'p2'); assert.equal(getSaved().players[0].stone, 'black');
});

test('오목 이어하기·잘못된 저장 폐기·차단 저장소에서도 착수', () => {
  const source = browser(); source.load('omok-engine.js');
  const players = source.F.createSetup({ host: new source.Node(), modes: modeNames }).getPlayers();
  const saved = source.context.OmokEngine.place(source.context.OmokEngine.createGame(players), 2, 2);
  const b = browser({ saved }); b.load('omok-engine.js'); b.load('omok-ui.js'); b.context.OmokUI.boot();
  assert.equal(b.$('resumeView').hidden, false); b.$('resumeGame').click();
  assert.match(b.$('turnBanner').textContent, /민수/); assert.equal(b.speech.length, 0);
  const invalid = browser({ saved: { ...plain(saved), turnPlayer: 0 } });
  invalid.load('omok-engine.js'); invalid.load('omok-ui.js'); invalid.context.OmokUI.boot();
  assert.equal(invalid.store.has('familyOmokGame'), false);
  const blocked = browser({ blocked: true }); blocked.load('omok-engine.js'); blocked.load('omok-ui.js'); blocked.context.OmokUI.boot();
  blocked.$('startGame').click(); blocked.$('board').children[0].click(); blocked.$('confirmPlace').click();
  assert.match(blocked.$('turnBanner').textContent, /민수/); assert.match(blocked.$('saveStatus').textContent, /저장하지 못했어요/);
});

test('야추도 같은 설정을 쓰며 2~5명 선택과 기존 저장 키·첫 굴림을 보존한다', () => {
  const b = browser({ yacht: true }); b.context.crypto = { getRandomValues: a => { a[0] = 1; } };
  b.load('yacht-engine.js'); b.load('yacht-ui.js'); b.context.YachtUI.boot();
  assert.equal(b.$('playerSetup').children.length, 2);
  b.$('playerCount').value = '5'; b.$('playerCount').fire('change');
  assert.equal(b.$('playerSetup').children.length, 5); b.$('startGame').click();
  assert.equal(JSON.parse(b.store.get('familyYachtGame')).players.length, 5);
  b.$('rollDice').click();
  const s = JSON.parse(b.store.get('familyYachtGame'));
  assert.equal(s.publicBoard.rollCount, 1); assert.equal(s.publicBoard.dice.length, 5);
  assert.match(b.$('turnBanner').textContent, /민서 차례/);
});

test('오목 음소거는 시작·승부 음성을 막고 도움 표시는 현재 참가자를 따른다', () => {
  const b = browser(); b.load('omok-engine.js'); b.load('omok-ui.js'); b.context.OmokUI.boot();
  b.$('soundToggle').click(); b.$('startGame').click();
  const cell = (x, y) => b.$('board').children[y * 13 + x];
  const put = (x, y) => { cell(x, y).click(); b.$('confirmPlace').click(); };
  for (let x = 0; x < 4; x++) { put(x, 0); put(x * 2, 2); }
  assert.match(cell(4, 0).getAttribute('aria-label'), /두면 이겨요/);
  put(6, 6);
  assert.match(cell(4, 0).getAttribute('aria-label'), /여기를 막아요/);
  put(8, 2); put(4, 0);
  assert.equal(b.$('endView').hidden, false); assert.deepEqual(b.speech, []);
});

test('isTaken은 외부 말·초기 말·실패 대체에 적용하고 setPlayers는 복사하며 알리지 않는다', () => {
  const { F, Node } = browser(), host = new Node(), changed = [];
  const setup = F.createSetup({ host, count: 1, min: 1, max: 5, modes: modeNames,
    isTaken: a => a.type === 'emoji' && ['🐰', '🐻'].includes(a.value), onChange: p => changed.push(p) });
  assert.equal(setup.getPlayers()[0].avatar.value, '🦊'); assert.equal(changed.length, 0);
  const rabbit = all(host).find(n => n.attributes['aria-label'] === '🐰 말'); assert.equal(rabbit.disabled, true);
  const source = [{ id: 'p1', name: '그림', avatar: gallery('broken'), assist: 'classic' }];
  setup.setPlayers(source); source[0].name = '다른 이름'; assert.equal(setup.getPlayers()[0].name, '그림');
  assert.equal(changed.length, 0);
});

test('onChange는 이름 입력·이름 기본 도움·빠른 이름·말·도움 단계·인원 변경을 알린다', () => {
  const { F, Node } = browser(), host = new Node(), changes = [];
  const setup = F.createSetup({ host, count: 1, min: 1, max: 5, modes: modeNames, onChange: p => changes.push(plain(p)) });
  const input = all(host).find(n => n.tagName === 'input'); input.value = '아빠'; input.fire('input');
  assert.equal(changes.at(-1)[0].name, '아빠'); input.fire('change'); assert.equal(changes.at(-1)[0].assist, 'classic');
  all(host).find(n => n.tagName === 'button' && n.textContent === '민수').click();
  assert.equal(changes.at(-1)[0].assist, 'tactic');
  all(host).find(n => n.attributes['aria-label'] === '🐻 말').click(); assert.equal(changes.at(-1)[0].avatar.value, '🐻');
  const select = all(host).find(n => n.tagName === 'select'); select.value = 'helper'; select.fire('change');
  assert.equal(changes.at(-1)[0].assist, 'helper'); setup.setCount(2); assert.equal(changes.at(-1).length, 2);
  assert.equal(changes.length, 6);
});

test('외부 점유를 피한 그림 실패 대체도 콜백을 한 번 알린다', () => {
  const { F, Node } = browser({ data: [{ id: 'a', characters: [{ key: 'main', name: '말', spriteUrl: 'a.png' }] }] });
  const host = new Node(), changes = [];
  const setup = F.createSetup({ host, count: 1, min: 1, max: 1, modes: modeNames,
    isTaken: a => a.type === 'emoji' && a.value === '🐰', onChange: p => changes.push(p) });
  all(host).find(n => n.attributes['aria-label'] === '말 말').click();
  all(host).find(n => n.tagName === 'img').fire('error');
  assert.equal(setup.getPlayers()[0].avatar.value, '🐻'); assert.equal(changes.length, 2);
});
