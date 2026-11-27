// 🎯 받침 빙고(BatchimBingo) 시험: 함정 글자 규칙·판 만들기 seed 300·화면 파일 계약 (docs/korean_spec.md §5-4-1)
// 낱말 자료는 민서 국어 시드(scripts/data/minseo_korean_1-2_u2~u8.json, 노션 VOCA_DB와 같은 내용)를 쓴다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { read } from './split-rules.mjs';

const FILE = 'kids/js/korean_batchim_bingo.js';
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(read('kids/subjects/quest/quest-questions.js'), sandbox, { filename: 'quest-questions.js' }); // 문제 만들기 먼저 (묶음 D2)
vm.runInContext(read('kids/subjects/quest/quest-mastery.js'), sandbox, { filename: 'quest-mastery.js' });
vm.runInContext(read(FILE), sandbox, { filename: FILE });
const B = sandbox.window.BatchimBingo;
const plain = (x) => JSON.parse(JSON.stringify(x));

function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const UNITS = {};
const RECORDS = [];
for (const u of [2, 3, 4, 5, 6, 7, 8]) {
  const d = JSON.parse(readFileSync(`scripts/data/minseo_korean_1-2_u${u}.json`, 'utf8'));
  UNITS[u] = d.voca.map((v, i) => ({ word: v.word, detail: v.detail, pageId: `p${u}x${i}`, level: d.unit, grade: '1-2', type: '단어' }));
  RECORDS.push(...UNITS[u]);
}
const HEADS = RECORDS.map((r) => r.word);
const ALL_WORDS = B.eligibleWords(RECORDS);
const syllableCount = (w) => Array.from(w).length;

test('쓸 수 있는 낱말: 한글 1~4글자·받침 있음·어휘유형 단어·표제어 하나만', () => {
  const list = plain(B.eligibleWords([
    ...UNITS[2],
    { word: '맑다', detail: '중복', type: '단어' },
    { word: '하늘이 맑다', type: '단어' },
    { word: '잃어버리다', type: '단어' },
    { word: '나무', type: '단어' },
    { word: '닭', type: '문장' },
    { word: 'cat', type: '단어' }
  ]));
  const words = list.map((w) => w.word);
  assert.equal(words.filter((w) => w === '맑다').length, 1, '표제어 하나만');
  assert.equal(list.find((w) => w.word === '맑다').detail, '하늘이 [맑다].', '먼저 나온 행');
  for (const w of ['하늘이 맑다', '잃어버리다', '나무', 'cat', '무시무시하다']) assert.ok(!words.includes(w), w);
  for (const w of words) {
    assert.ok(syllableCount(w) >= 1 && syllableCount(w) <= B.MAX_LEN, w);
    assert.match(w, /^[가-힣]+$/);
  }
  assert.ok(ALL_WORDS.length >= 80, `시드 낱말 ${ALL_WORDS.length}개`);
});

test('함정 글자 대표 표: 소리 나는 대로 → 대표 받침 → 그 밖, 모음 바꾸기·표제어는 쓰지 않음', () => {
  const table = {
    닳다: '달타', 않다: '안타', 옳다: '올타', 뚫다: '뚤타', 괜찮다: '괜찬타', 넣다: '너타', 어떻게: '어떠케', 끓이다: '끄리다', 일어나다: '이러나다',
    맑다: '막다', 밝다: '박다', 닭: '닥', 흙: '흑', 넓다: '널다', 짧다: '짤다', 여덟: '여덜', 없다: '업다', 앉다: '안다', 가라앉다: '가라안다',
    숫자: '숟자', 맷돌: '맫돌', 잘못: '잘몯', 끝: '끗', 앞: '압', 낮잠: '낫잠', 재미있다: '재미잇다',
    읽다: null, // 익다는 3단원 표제어라 빼고, 일다는 소리가 달라([일다]≠[익따]) 함정이 아님
    켤레: null, 댁: null, 늑대: null, 간신히: null, 날씨: null
  };
  for (const [word, want] of Object.entries(table)) assert.equal(B.soundTrap(word, HEADS), want, word);
  assert.equal(B.soundTrap('읽다', []), '익다', '표제어 목록이 없으면 대표 받침');
  assert.equal(B.soundTrap('밟다', []), '밥다', '밟다는 ㅂ 소리 예외');
});

test('함정 순위 함수: 모음이 바뀌면 -1', () => {
  assert.equal(B.trapRank('켤레', '켤래'), -1);
  assert.equal(B.trapRank('닳다', '달타'), 0);
  assert.equal(B.trapRank('맑다', '막다'), 1);
  assert.equal(B.trapRank('맑다', '말다'), 2);
  assert.equal(B.trapRank('숫자', '숬자'), 2);
  assert.equal(B.trapRank('닳다', '닳다'), -1);
  assert.equal(B.trapRank('깍두기', '깍뚜기'), -1, '받침 그대로 첫소리만 바뀜');
  assert.equal(B.trapRank('일어나다', '이러나다'), 0, '연음');
});

test('소리가 같은 표제어는 한 판에 같이 내지 않음 (읽다·익다)', () => {
  assert.equal(B.soundsAlike('읽다', '익다'), true);
  assert.equal(B.soundsAlike('익다', '읽다'), true);
  assert.equal(B.soundsAlike('맑다', '닳다'), false);
  const words = B.eligibleWords([...UNITS[2], ...UNITS[3]]);
  for (let s = 1; s <= 300; s++) {
    for (const traps of [false, true]) {
      const w = B.makeBoard(words, { traps, rng: seeded(s), allWords: HEADS }).problems.map((p) => p.word);
      assert.ok(!(w.includes('읽다') && w.includes('익다')), `seed ${s}`);
    }
  }
});

test('보이는 글은 정답을 숨기고, 읽는 말은 낱말 + 예문', () => {
  assert.equal(B.callText({ word: '닳다', detail: '연필심이 [닳았다].' }), '연필심이 (　　　).');
  assert.equal(B.speakText({ word: '닳다', detail: '연필심이 [닳았다].' }), '닳다. 연필심이 닳았다.');
  assert.equal(B.callText({ word: '닭', detail: '' }), '🔊 잘 듣고 찾아요');
  assert.equal(B.speakText({ word: '닭', detail: '' }), '닭');
  assert.equal(B.callText({ word: '흙', detail: '흙이 [많다] 흙' }), '🔊 잘 듣고 찾아요', '빈칸 밖에 정답이 보이면 숨김');
  for (const w of ALL_WORDS) assert.ok(!B.callText(w).includes(w.word), w.word);
});

function checkBoard(board, words, traps, label) {
  assert.ok(board, label);
  const { problems, decoys } = board;
  const chips = problems.map((p) => p.answerText).concat(decoys.map((d) => d.text));
  assert.equal(chips.length, 9, `${label} 칩 9개`);
  assert.equal(new Set(chips).size, 9, `${label} 칩 서로 다름`);
  const pool = new Set(words.map((w) => w.word));
  for (const p of problems) {
    assert.ok(pool.has(p.answerText), `${label} 고른 단원 낱말`);
    assert.equal(p.answerText, p.word);
    assert.ok(syllableCount(p.word) <= B.MAX_LEN);
    assert.ok(!p.call.includes(p.word), `${label} 보이는 글에 정답 없음`);
    assert.ok(p.speak.startsWith(p.word), `${label} 읽는 말`);
  }
  if (!traps) assert.equal(decoys.length, 0, `${label} 첫 판 함정 없음`);
  for (const d of decoys) {
    assert.ok(!HEADS.includes(d.text), `${label} 함정 ${d.text}은 표제어가 아님`);
    const owner = problems.find((p) => p.word === d.of);
    assert.ok(owner, `${label} 함정의 낱말을 부름`);
    assert.equal(owner.trap, d.text);
    assert.notEqual(d.text, owner.answerText);
    assert.ok(B.trapRank(owner.word, d.text) >= 0, `${label} 받침 함정`);
  }
  assert.equal(problems.filter((p) => p.trap).length, decoys.length);
  return decoys.length;
}

test('판 만들기 seed 300: 단원 하나·여러 단원, 첫 판·둘째 판', () => {
  const pools = [
    ['2단원', B.eligibleWords(UNITS[2])],
    ['5단원', B.eligibleWords(UNITS[5])],
    ['2+6+8단원', B.eligibleWords([...UNITS[2], ...UNITS[6], ...UNITS[8]])],
    ['전체', ALL_WORDS]
  ];
  for (const [name, words] of pools) {
    assert.ok(words.length >= 9, `${name} 낱말 ${words.length}개`);
    let trapTotal = 0;
    for (let s = 1; s <= 300; s++) {
      checkBoard(B.makeBoard(words, { traps: false, rng: seeded(s), allWords: HEADS }), words, false, `${name} 첫 판 seed ${s}`);
      trapTotal += checkBoard(B.makeBoard(words, { traps: true, rng: seeded(s), allWords: HEADS }), words, true, `${name} 둘째 판 seed ${s}`);
    }
    const capable = words.filter((w) => B.soundTrap(w.word, HEADS)).length;
    if (capable >= 2) assert.equal(trapTotal, 600, `${name} 둘째 판은 늘 함정 2칸`);
  }
});

test('함정이 모자라면 줄이고, 낱말이 9개 미만이면 null', () => {
  const plainWords = ['날씨', '느낌', '거울', '미역', '골고루', '임금님', '진짜', '운동장', '모습', '빨판'].map((w) => ({ word: w, detail: '' }));
  const b0 = B.makeBoard(plainWords, { traps: true, rng: seeded(3), allWords: HEADS });
  assert.equal(b0.decoys.length, 0);
  assert.equal(b0.problems.length, 9);
  const one = plainWords.slice(0, 9).concat([{ word: '닳다', detail: '' }]);
  const b1 = B.makeBoard(one, { traps: true, rng: seeded(4), allWords: HEADS });
  assert.equal(b1.decoys.length, 1);
  assert.equal(b1.problems.length, 8);
  assert.equal(B.makeBoard(plainWords.slice(0, 8), { traps: false }), null);
});

test('오답 안내: 부른 낱말의 함정이면 받침 안내, 아니면 다시 듣기', () => {
  const p = { word: '닳다', answerText: '닳다', trap: '달타' };
  assert.equal(B.wrongHint(p, '달타'), B.HINT_TRAP);
  assert.equal(B.wrongHint(p, '안타'), B.HINT_OTHER);
  assert.equal(B.wrongHint({ word: '날씨', trap: null }, '느낌'), B.HINT_OTHER);
  assert.ok(B.HINT_TRAP.length <= 30);
});

test('단원 묶기: 단원 원문 숫자 순서, 쓸 수 있는 낱말 수', () => {
  const units = plain(B.groupUnits([...UNITS[8], ...UNITS[2], ...UNITS[5]]));
  assert.deepEqual(units.map((u) => u.label.slice(0, 7)), ['1-2 · 2', '1-2 · 5', '1-2 · 8']);
  assert.equal(units[0].count, B.eligibleWords(UNITS[2]).length);
});

test('화면 파일 계약: 싣는 순서·공용 CSS 먼저·국어방 카드는 민서만·innerHTML 없음', () => {
  const html = read('kids/subjects/korean/batchim_bingo.html');
  const order = ['fairy-tts.js', 'fairy-engine.js', 'quest-questions.js', 'quest-mastery.js', 'math_explorer-shell.js', 'math_squishy.js', 'math_explorer-ladder.js', 'math_bingo.js', 'korean_batchim_bingo.js'];
  let at = -1;
  for (const f of order) {
    const i = html.indexOf(f);
    assert.ok(i > at, `${f} 순서`);
    at = i;
  }
  assert.ok(html.indexOf('math_explorer.css') < html.indexOf('korean_batchim_bingo.css'), '공용 CSS 먼저');
  assert.doesNotMatch(html, /(src|href)="\/kids-school/, '상대 경로');
  const src = read(FILE);
  assert.doesNotMatch(src, /innerHTML/);
  assert.doesNotMatch(src, /speechSynthesis/);
  assert.ok(src.split('\n').length <= 600);
  assert.match(src, /MathBingo\.render/);
  assert.match(src, /MathBingo\.makeCtx/);
  const room = read('kids/subjects/korean/korean.html');
  assert.match(room, /id="minseoBatchimBingoCard"[^>]*display:none/);
  assert.match(read('kids/js/korean_common.js'), /minseoBatchimBingoCard/);
});
