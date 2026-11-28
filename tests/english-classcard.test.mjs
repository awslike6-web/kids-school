// tests/english-classcard.test.mjs
// 영어 「클래스카드 연습」(classcard.html · english_classcard*.js) 회귀 시험. 노션·DOM 없이 돈다.
// - 카드 묶음(노션 「클래스카드 DB」 → english_classcard_deck.js): 담임 클래스카드 글자 그대로(뜻 교정 없음), 카드번호 그대로,
//   「사용」 끈 카드·빈 구간 빠짐, 아이별 거르기, 통신 실패 시 기기 기억, 영어방 단원 목록. 등록 자료는 scripts/data/classcard/
// - 2×4 짝맞추기 판: 몇 번을 맞혀도 같은 열에 같은 카드가 없고, 맞출 수 있는 짝이 늘 2쌍 이상
// - 카드 퀴즈 문제 만들기: 6지선다 보기·철자 문제 고르기·조각 나누기
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';
import { installSeedDeck, seedPages, readSeed, DECK_FILE } from './classcard-seed.mjs';

const base = new URL('../', import.meta.url);
const read = rel => readFileSync(new URL(rel, base), 'utf8');
const exists = rel => existsSync(new URL(rel, base));

function sandbox() {
  const ctx = {
    console,
    Math,
    document: { addEventListener() {}, getElementById() { return null; }, querySelectorAll() { return []; } },
    localStorage: { getItem() { return null; }, setItem() {} },
    setTimeout, clearTimeout, setInterval, clearInterval
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  for (const f of ['kids/js/english_classcard.js', 'kids/js/english_classcard_grid.js', 'kids/js/english_classcard_cards.js']) {
    vm.runInContext(read(f), ctx, { filename: f });
  }
  installSeedDeck(ctx);  // 등록 자료 → 노션 행 모양 → 실제 Deck.buildDeck (tests/classcard-seed.mjs)
  return ctx;
}

// 결과를 다시 볼 수 있게 씨앗을 고정한 난수
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test('카드 묶음: 노션 「사용」 카드 34장을 글자 그대로, 사용 끈 4구간(새 문장)은 빠진다', () => {
  const { CLASSCARD_DECK: deck } = sandbox();
  assert.equal(deck.grade, '5-2');
  assert.equal(deck.unit, 'L11');
  assert.equal(deck.title, '5-2 Lesson 11');
  assert.equal(deck.items.length, 34);
  assert.deepEqual([...deck.items.map(i => i.id)], Array.from({ length: 34 }, (_, i) => i + 1), '카드번호(별표·문항기록 키) 그대로');
  const bySection = id => deck.items.filter(i => i.section === id).length;
  assert.deepEqual([...deck.sections.map(s => s.label)], ['1구간', '2구간', '3구간'], '카드가 없는 4구간은 숨김');
  assert.equal(deck.sections.map(s => bySection(s.id)).join(','), '10,10,14');
  const ko = en => deck.items.find(i => i.en === en).ko;
  // 선생님 카드 뜻을 고치지 않는다 (2026-11-22 사용자 지시)
  assert.equal(ko('go straight'), '성실히 살다, 갱생하다');
  assert.equal(ko('turn left'), '왼편을 향하다');
  for (const item of deck.items) {
    assert.ok(item.en && item.ko, `빈 칸: ${item.id}`);
    if (/[{}~/]/.test(item.en)) assert.ok(item.say && !/[{}~/]/.test(item.say), `읽을 글자(say) 필요: ${item.en}`);
    else assert.equal(item.say, undefined, `읽기 빈 칸은 say를 만들지 않음: ${item.en}`);
  }
});

test('카드 묶음: 노션에서 4구간을 켜면 4구간이 생기고, 1구간을 다 끄면 1구간이 숨는다', () => {
  const { Deck } = sandbox().EnglishClasscard;
  const on = Object.fromEntries(Array.from({ length: 10 }, (_, i) => [35 + i, true]));
  const withNew = Deck.buildDeck(seedPages(undefined, on), { grade: '5-2', unit: 'L11', students: ['민수'] });
  assert.deepEqual([...withNew.sections.map(s => s.id)], [1, 2, 3, 4]);
  assert.equal(withNew.items.length, 44);
  assert.equal(withNew.items.at(-1).en, 'It is next to the rocks.');
  const off = Object.fromEntries(Array.from({ length: 10 }, (_, i) => [1 + i, false]));
  const noFirst = Deck.buildDeck(seedPages(undefined, off), { grade: '5-2', unit: 'L11', students: ['민수'] });
  assert.deepEqual([...noFirst.sections.map(s => s.id)], [2, 3]);
  assert.ok(!noFirst.items.some(i => i.id <= 10));
});

test('카드 묶음: 다른 단원·다른 아이 카드는 빼고, 순번대로 놓고, 같은 카드번호 두 줄은 하나만', () => {
  const { Deck } = sandbox().EnglishClasscard;
  const pages = seedPages();
  const other = seedPages({ grade: '5-2', unit: 'L12', student: '민수', cards: [{ no: 1, section: 1, en: 'x', ko: 'y' }] });
  assert.equal(Deck.buildDeck(pages.concat(other), { grade: '5-2', unit: 'L12', students: ['민수'] }), null, '4장보다 적으면 null');
  assert.equal(Deck.buildDeck(pages, { grade: '5-2', unit: 'L11', students: ['민서', '공통'] }), null, '민서는 민수 카드를 안 봄');
  const common = seedPages({ ...readSeed(), student: '공통' });
  assert.equal(Deck.buildDeck(common, { grade: '5-2', unit: 'L11', students: ['민서', '공통'] }).items.length, 34);
  // 순번을 바꾸면 구간 안 순서가 바뀐다 (카드번호는 그대로)
  pages[0].properties.순번.number = 99;
  const moved = Deck.buildDeck(pages.concat([structuredClone(pages[1])]), { grade: '5-2', unit: 'L11', students: ['민수'] });
  const first = moved.items.filter(i => i.section === 1).map(i => i.id);
  assert.deepEqual(first.slice(0, 2), [2, 3]);
  assert.equal(first.at(-1), 1);
  assert.equal(moved.items.filter(i => i.id === 2).length, 1);
});

function deckSandbox({ store = {}, fetchImpl }) {
  const calls = [];
  const ctx = {
    console: { log() {}, warn() {}, error() {} },
    APP_CONFIG: { WORKER_PROXY_URL: 'https://proxy.test/', CLASSCARD_DB_ID: 'cc-db' },
    localStorage: {
      getItem: k => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: k => { delete store[k]; }
    },
    AbortController, setTimeout, clearTimeout,
    fetch: async (url, opt) => { calls.push({ url, body: JSON.parse(opt.body) }); return fetchImpl(url, opt); }
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(read(DECK_FILE), ctx, { filename: DECK_FILE });
  return { Deck: ctx.EnglishClasscard.Deck, calls, store };
}
const okJson = results => async () => ({ ok: true, json: async () => ({ results, has_more: false }) });
const plain = v => JSON.parse(JSON.stringify(v));

test('불러오기: 노션을 ?force=true로 새로 읽고 「사용」 카드만 거른 뒤 기기에 기억한다', async () => {
  const { Deck, calls, store } = deckSandbox({ store: { currentUser: 'son' }, fetchImpl: okJson(seedPages()) });
  const got = await Deck.load({ grade: '5-2', unit: 'L11' });
  assert.equal(got.from, 'notion');
  assert.equal(got.deck.items.length, 34);
  assert.equal(calls[0].url, 'https://proxy.test/v1/databases/cc-db/query?force=true');
  assert.deepEqual(plain(calls[0].body.filter.and), [
    { property: '학년', select: { equals: '5-2' } },
    { property: '단원', select: { equals: 'L11' } },
    { property: '사용', checkbox: { equals: true } }]);
  assert.equal(JSON.parse(store['classcard_deck_v1_son_5-2_L11']).deck.items.length, 34);
});

test('불러오기: 통신이 안 되면 기억한 묶음, 기억도 없으면 none, 노션에 카드가 없으면 기억을 지운다', async () => {
  const fail = async () => { throw new Error('offline'); };
  const store = { currentUser: 'son' };
  await deckSandbox({ store, fetchImpl: okJson(seedPages()) }).Deck.load({ grade: '5-2', unit: 'L11' });
  const cached = await deckSandbox({ store, fetchImpl: fail }).Deck.load({ grade: '5-2', unit: 'L11' });
  assert.equal(cached.from, 'cache');
  assert.equal(cached.deck.items.length, 34);
  const other = await deckSandbox({ store: { currentUser: 'daughter' }, fetchImpl: fail }).Deck.load({ grade: '5-2', unit: 'L11' });
  assert.equal(other.from, 'none', '아이마다 따로 기억');
  const empty = await deckSandbox({ store, fetchImpl: okJson([]) }).Deck.load({ grade: '5-2', unit: 'L11' });
  assert.deepEqual([empty.deck, empty.from], [null, 'notion']);
  assert.equal(store['classcard_deck_v1_son_5-2_L11'], undefined, '부모가 다 끄면 옛 기억으로 열지 않음');
  const bad = await deckSandbox({ store, fetchImpl: async () => ({ ok: false, status: 500 }) }).Deck.load({ grade: '5-2', unit: 'L11' });
  assert.equal(bad.from, 'none');
});

test('단원 목록: 아이가 볼 「사용」 카드가 4장 이상인 단원만, 민서 5학년 미리보기면 민수 단원도', async () => {
  const small = { grade: '5-2', unit: 'L12', student: '민수', cards: [1, 2, 3].map(no => ({ no, section: 1, en: 'a' + no, ko: 'b' })) };
  const pages = seedPages().concat(seedPages(small));
  const son = await deckSandbox({ store: { currentUser: 'son' }, fetchImpl: okJson(pages) }).Deck.listUnits();
  assert.deepEqual(plain(son), [{ grade: '5-2', unit: 'L11' }]);
  const t = deckSandbox({ store: { currentUser: 'daughter' }, fetchImpl: okJson(pages) });
  assert.deepEqual(plain(await t.Deck.listUnits()), []);
  assert.equal(t.calls[0].url, 'https://proxy.test/v1/databases/cc-db/query', '목록은 엣지 캐시 그대로');
  const preview = await deckSandbox({ store: { currentUser: 'daughter', english_upper_preview_daughter: '1' }, fetchImpl: okJson(pages) }).Deck.listUnits();
  assert.equal(preview.length, 1);
  const store = { currentUser: 'son' };
  await deckSandbox({ store, fetchImpl: okJson(pages) }).Deck.listUnits();
  const offline = await deckSandbox({ store, fetchImpl: async () => { throw new Error('x'); } }).Deck.listUnits();
  assert.equal(offline.length, 1, '통신이 안 되면 기억한 목록');
});

test('별표: 노션에서 끈 카드의 별표는 지우지 않고 두었다가 다시 켜면 돌아온다', () => {
  const store = {};
  const ctx = sandbox();
  ctx.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); } };
  const { state } = ctx.EnglishClasscard;
  const full = ctx.CLASSCARD_DECK;
  state.deck = full;
  state.load();
  state.toggleBookmark(1);
  state.toggleBookmark(20);
  state.deck = { ...full, items: full.items.filter(i => i.id !== 1) };  // 부모가 1번을 끔
  state.load();
  assert.deepEqual([...state.bookmarks], [20]);
  state.save();
  state.deck = full;  // 다시 켬
  state.load();
  assert.deepEqual([...state.bookmarks].sort((a, b) => a - b), [1, 20]);
});

test('진입·영어방: 등록표에 카드 묶음 파일이 없고, 영어방은 노션 단원 목록으로 🃏 칸을 띄운다', () => {
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(read('kids/subjects/english/data/english_unit_activities.js'), ctx);
  const list = ctx.window.ENGLISH_UNIT_ACTIVITIES;
  assert.ok(!list.some(a => a.deck || a.href === 'classcard.html'), '클래스카드는 노션이 원본');
  assert.equal(exists('kids/subjects/english/data/classcard_5-2_L11.js'), false, '옛 정적 묶음 삭제');
  // listen_place.html은 학기·단원이 같은 첫 항목을 쓴다 — 길 찾기는 그대로
  assert.equal(list.find(a => a.grade === '5-2' && a.unit === 'L11').href, 'listen_place.html');
  assert.match(read('kids/subjects/english/classcard.html'), /EnglishClasscard\.Deck\.load\(/);
  assert.match(read('kids/config.js'), /CLASSCARD_DB_ID: "426a27115b6880c38712d98cf367adb4"/);
  const eng = read('kids/subjects/english/english.html');
  const at = eng.indexOf('/english_classcard_deck.js');
  assert.ok(at > 0 && at < eng.indexOf('/english_unit_bar.js'), '영어방이 단원 칩 바보다 먼저 싣기');
});

// 화면(english_classcard_grid.js)과 같은 방식으로 판을 돌린다: 맞출 짝 하나를 골라 맞히고, 칸마다 짝 없이 지난 횟수를 센다
function playBoard(logic, pool, rng, steps) {
  const board = logic.initialBoard(pool, rng);
  let left = board.left.slice();
  let right = board.right.slice();
  let lAge = [0, 0, 0, 0];
  let rAge = [0, 0, 0, 0];
  const counts = [logic.countValidPairs(left, right)];
  let maxAge = 0;
  for (let step = 0; step < steps; step++) {
    const pairs = [];
    left.forEach((w, i) => { const j = right.findIndex(r => r.id === w.id); if (j >= 0) pairs.push([i, j]); });
    if (!pairs.length) return { counts, maxAge, stuck: step };
    const [li, ri] = pairs[Math.floor(rng() * pairs.length)];
    const { newLeft, newRight } = logic.refillPair(left, right, li, ri, pool, rng, { leftAge: lAge, rightAge: rAge });
    left = left.map((w, i) => (i === li ? newLeft : w));
    right = right.map((w, i) => (i === ri ? newRight : w));
    lAge = lAge.map((a, i) => (i === li ? 0 : a));
    rAge = rAge.map((a, i) => (i === ri ? 0 : a));
    const L = new Set(left.map(w => w.id));
    const R = new Set(right.map(w => w.id));
    lAge = left.map((w, i) => (i === li || R.has(w.id) ? 0 : lAge[i] + 1)); // 방금 들어온 칸은 0부터
    rAge = right.map((w, i) => (i === ri || L.has(w.id) ? 0 : rAge[i] + 1));
    if (L.size !== 4 || R.size !== 4) throw new Error(`같은 열 중복 step${step}`);
    counts.push(logic.countValidPairs(left, right));
    maxAge = Math.max(maxAge, ...lAge, ...rAge);
  }
  return { counts, maxAge, stuck: null };
}

test('짝맞추기 판: 실제 클래스카드처럼 짝은 보통 1쌍·가끔 2쌍, 0쌍 판은 없음', () => {
  const ctx = sandbox();
  const { logic } = ctx.EnglishClasscard.Grid;
  const deck = ctx.CLASSCARD_DECK.items;
  const big = [deck, deck.filter(i => i.section === 1), deck.filter(i => i.section === 2), deck.filter(i => i.section === 3)];
  let ones = 0;
  let total = 0;
  for (const [pi, pool] of big.entries()) {
    for (let seed = 1; seed <= 40; seed++) {
      const { counts, maxAge, stuck } = playBoard(logic, pool, seeded(seed * 97 + pi), 80);
      const tag = `pool${pool.length} seed${seed}`;
      assert.equal(stuck, null, `맞출 짝이 없는 판 ${tag}`);
      for (const n of counts) assert.ok(n === 1 || n === 2, `짝 ${n}쌍 ${tag}`);
      // 짝 없이 남은 카드는 STALE_AFTER 뒤 곧 짝이 들어온다 (한 카드가 판에 계속 머물지 않음)
      assert.ok(maxAge <= logic.STALE_AFTER + 7, `오래 남은 카드 ${maxAge} ${tag}`); // 재 보면 보통 7~9번 안에 짝이 나온다
      ones += counts.filter(n => n === 1).length;
      total += counts.length;
    }
  }
  const share = ones / total;
  assert.ok(share > 0.7 && share < 0.9, `1쌍 판 비율 ${share.toFixed(2)}`);
});

test('짝맞추기 판: 카드가 4~5장뿐인 작은 묶음도 막히지 않음', () => {
  const ctx = sandbox();
  const { logic } = ctx.EnglishClasscard.Grid;
  const deck = ctx.CLASSCARD_DECK.items;
  for (const pool of [deck.slice(0, 4), deck.slice(0, 5), deck.slice(0, 7)]) {
    for (let seed = 1; seed <= 30; seed++) {
      const { counts, stuck } = playBoard(logic, pool, seeded(seed), 40);
      assert.equal(stuck, null, `pool${pool.length} seed${seed}`);
      assert.ok(counts.every(n => n >= 1));
    }
  }
});

test('짝맞추기 소리: 영어 카드는 눌러도 읽지 않고, 맞혔을 때만 읽는다 (소리 카드는 눌러서 듣기)', () => {
  const src = read('kids/js/english_classcard_grid.js');
  const tap = src.slice(src.indexOf('function tap('), src.indexOf('function shake('));
  assert.match(tap, /if \(slot\.audioOnly\) EC\.sound\.speak/);
  assert.equal((tap.match(/EC\.sound\.speak/g) || []).length, 1);
  const check = src.slice(src.indexOf('function check('), src.indexOf('function checkPass('));
  const wrongPart = check.slice(check.indexOf('g.combo = 0;'));
  assert.doesNotMatch(wrongPart, /EC\.sound\.speak/, '틀렸을 때 읽지 않음');
  assert.match(check.slice(0, check.indexOf('g.combo = 0;')), /EC\.sound\.speak\(L\.item\)/, '맞혔을 때 읽음');
});

test('짝맞추기 점수: 기본 50 · 2연속 80 · 4연속 100 · 소리 카드 100', () => {
  const { logic } = sandbox().EnglishClasscard.Grid;
  assert.deepEqual([1, 2, 3, 4, 9].map(n => logic.pointsFor(n, false)), [50, 80, 80, 100, 100]);
  assert.equal(logic.pointsFor(1, true), 100);
});

test('카드 퀴즈: 10문제, 보기 6개에 정답 포함·같은 글자 없음, 철자는 글자만 있는 카드만', () => {
  const ctx = sandbox();
  const { Cards } = ctx.EnglishClasscard;
  const deck = ctx.CLASSCARD_DECK.items;
  for (let round = 0; round < 30; round++) {
    const qs = Cards.buildQuestions(deck, deck, 10);
    assert.equal(qs.length, 10);
    assert.equal(new Set(qs.map(q => q.item.id)).size, 10, '같은 카드 두 번');
    qs.forEach((q, i) => {
      if (q.type === 'spell') {
        assert.equal(i % 3, 2);
        assert.ok(Cards.isSpellable(q.item), q.item.en);
        return;
      }
      assert.equal(q.options.length, 6);
      assert.ok(q.options.includes(q.item));
      const label = o => (q.type === 'toEn' ? o.en : o.ko);
      assert.equal(new Set(q.options.map(label)).size, 6, '같은 보기 글자');
      assert.equal(q.type, i % 3 === 1 ? 'toKo' : 'toEn');
    });
  }
  // 구간 카드가 6개보다 적으면 보기는 묶음 전체에서 채운다
  const small = deck.slice(0, 4);
  const qs = Cards.buildQuestions(small, deck, 10);
  assert.equal(qs.length, 4);
  qs.filter(q => q.type !== 'spell').forEach(q => assert.equal(q.options.length, 6));
});

test('철자 조각: 이어 붙이면 원래 낱말, 기호 문장은 철자 문제로 내지 않음', () => {
  const { Cards } = sandbox().EnglishClasscard;
  const strip = s => s.replace(/\s+/g, '');
  for (const en of ['bank', 'flower shop', 'subway station', 'on your left']) {
    assert.equal(Cards.tokenize(en).join(''), strip(en));
  }
  assert.equal(Cards.tokenize('on your left').join('|'), 'on|your|left');
  assert.equal(Cards.isSpellable({ en: 'go straight {2} blocks' }), false);
  assert.equal(Cards.isSpellable({ en: "It's on your left/right." }), false);
  assert.equal(Cards.isSpellable({ en: 'between A and B' }), false, '네 낱말');
  assert.equal(Cards.isSpellable({ en: 'police station' }), true);
});

test('공부방 규칙: 보기 섞기 부품·음성 엔진만 쓰고 브라우저 음성을 직접 부르지 않는다', () => {
  const cards = read('kids/js/english_classcard_cards.js');
  assert.match(cards, /QuizChoices\.arrange/);
  for (const f of ['kids/js/english_classcard.js', 'kids/js/english_classcard_grid.js', 'kids/js/english_classcard_cards.js', DECK_FILE]) {
    assert.doesNotMatch(read(f), /speechSynthesis/, f);
  }
  const main = read('kids/js/english_classcard.js');
  for (const fn of ['speakEnglish', 'fairyPraise', 'fairyEncourage', 'fairyReward', 'finalizeQuizRewardSession', 'LearningLog']) {
    assert.match(main, new RegExp(fn), fn);
  }
  const html = read('kids/subjects/english/classcard.html');
  assert.doesNotMatch(html, /(src|href)="\/kids-school/, '상대 경로만');
  const order = ['fairy-config.js', 'fairy-tts.js', 'fairy-engine.js', 'english_classcard.js', 'english_classcard_grid.js', 'english_classcard_cards.js', 'english_classcard_deck.js']
    .map(n => html.indexOf('/' + n));
  assert.ok(order.every(p => p > 0));
  assert.deepEqual(order, [...order].sort((a, b) => a - b), '싣는 순서');
});

test('단원 목록: 뜻이 빈 행 때문에 4장이 안 되는 단원은 칸을 띄우지 않는다 (묶음과 같은 기준)', async () => {
  const pages = seedPages({
    grade: '5-2',
    unit: 'L12',
    student: '민수',
    cards: [1, 2, 3, 4].map(no => ({ no, section: 1, en: 'a' + no, ko: 'b' }))
  });
  pages[0].properties.뜻 = { rich_text: [] };
  const { Deck } = deckSandbox({ fetchImpl: okJson(pages) });
  const res = await Deck.listUnits();
  assert.deepEqual(plain(res.units ?? res), []);
});

test('기기 기억: 민서 5학년 미리보기 켬/끔은 서로 다른 키에 기억한다', async () => {
  const store = { currentUser: 'daughter', english_upper_preview_daughter: '1' };
  const { Deck } = deckSandbox({ store, fetchImpl: okJson(seedPages()) });
  await Deck.load({ grade: '5-2', unit: 'L11' });
  assert.ok(store['classcard_deck_v1_daughter_preview_5-2_L11']);

  delete store.english_upper_preview_daughter;
  const { Deck: DeckNoPreview } = deckSandbox({
    store,
    fetchImpl: async () => { throw new Error('network error'); }
  });
  const res = await DeckNoPreview.load('5-2', 'L11');
  assert.equal(res.from, 'none');
});

test('노션 조회: 쪽마다 시간제한(AbortSignal)을 따로 건다', async () => {
  const all = seedPages();
  const signals = [];
  let page = 0;
  const { Deck } = deckSandbox({
    store: { currentUser: 'son' },
    fetchImpl: async (_url, opt) => {
      signals.push(opt.signal);
      page += 1;
      if (page === 1) {
        return {
          ok: true,
          json: async () => ({ results: all.slice(0, 20), has_more: true, next_cursor: 'c2' })
        };
      }
      return {
        ok: true,
        json: async () => ({ results: all.slice(20), has_more: false })
      };
    }
  });
  const res = await Deck.load({ grade: '5-2', unit: 'L11' });
  assert.equal(signals.length, 2);
  assert.ok(signals[0]);
  assert.ok(signals[1]);
  assert.notStrictEqual(signals[0], signals[1]);
  assert.equal(res.deck.items.length, 34);
});
