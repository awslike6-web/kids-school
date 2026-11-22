// tests/english-classcard.test.mjs
// 영어 「클래스카드 연습」(classcard.html · english_classcard*.js) 회귀 시험. 노션·DOM 없이 돈다.
// - 카드 묶음: 담임 클래스카드 글자 그대로(뜻 교정 없음), id 중복 없음, 기호가 든 카드는 읽을 글자(say)가 있음
// - 2×4 짝맞추기 판: 몇 번을 맞혀도 같은 열에 같은 카드가 없고, 맞출 수 있는 짝이 늘 2쌍 이상
// - 카드 퀴즈 문제 만들기: 6지선다 보기·철자 문제 고르기·조각 나누기
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';

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
  for (const f of ['kids/subjects/english/data/classcard_5-2_L11.js', 'kids/js/english_classcard.js',
    'kids/js/english_classcard_grid.js', 'kids/js/english_classcard_cards.js']) {
    vm.runInContext(read(f), ctx, { filename: f });
  }
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

test('카드 묶음: 클래스카드 34개를 글자 그대로 담는다', () => {
  const { CLASSCARD_DECK: deck } = sandbox();
  assert.equal(deck.grade, '5-2');
  assert.equal(deck.unit, 'L11');
  assert.equal(deck.items.length, 34);
  assert.equal(new Set(deck.items.map(i => i.id)).size, 34, 'id 중복');
  const bySection = id => deck.items.filter(i => i.section === id).length;
  assert.equal(deck.sections.map(s => bySection(s.id)).join(','), '10,10,14');
  const ko = en => deck.items.find(i => i.en === en).ko;
  // 선생님 카드 뜻을 고치지 않는다 (2026-11-22 사용자 지시)
  assert.equal(ko('go straight'), '성실히 살다, 갱생하다');
  assert.equal(ko('turn left'), '왼편을 향하다');
  for (const item of deck.items) {
    assert.ok(item.en && item.ko, `빈 칸: ${item.id}`);
    if (/[{}~/]/.test(item.en)) assert.ok(item.say && !/[{}~/]/.test(item.say), `읽을 글자(say) 필요: ${item.en}`);
  }
});

test('단원 특별 활동 등록표: L11 클래스카드가 카드 묶음 파일을 가리키고, 길 찾기 활동은 그대로', () => {
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(read('kids/subjects/english/data/english_unit_activities.js'), ctx);
  const list = ctx.window.ENGLISH_UNIT_ACTIVITIES;
  const cc = list.find(a => a.grade === '5-2' && a.unit === 'L11' && a.deck);
  assert.ok(cc, '클래스카드 등록');
  assert.equal(cc.href, 'classcard.html');
  assert.ok(exists(`kids/subjects/english/${cc.deck}`), cc.deck);
  assert.ok(exists('kids/subjects/english/classcard.html'));
  // listen_place.html은 학기·단원이 같은 첫 항목을 쓰므로 길 찾기 항목이 먼저 와야 한다
  const first = list.find(a => a.grade === '5-2' && a.unit === 'L11');
  assert.equal(first.href, 'listen_place.html');
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
  for (const f of ['kids/js/english_classcard.js', 'kids/js/english_classcard_grid.js', 'kids/js/english_classcard_cards.js']) {
    assert.doesNotMatch(read(f), /speechSynthesis/, f);
  }
  const main = read('kids/js/english_classcard.js');
  for (const fn of ['speakEnglish', 'fairyPraise', 'fairyEncourage', 'fairyReward', 'finalizeQuizRewardSession', 'LearningLog']) {
    assert.match(main, new RegExp(fn), fn);
  }
  const html = read('kids/subjects/english/classcard.html');
  assert.doesNotMatch(html, /(src|href)="\/kids-school/, '상대 경로만');
  const order = ['fairy-config.js', 'fairy-tts.js', 'fairy-engine.js', 'english_classcard.js', 'english_classcard_grid.js', 'english_classcard_cards.js']
    .map(n => html.indexOf('/' + n));
  assert.ok(order.every(p => p > 0));
  assert.deepEqual(order, [...order].sort((a, b) => a - b), '싣는 순서');
});
