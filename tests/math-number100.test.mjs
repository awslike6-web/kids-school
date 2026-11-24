// 1학년 100까지의 수 탐험관 계산 모듈(HundredCore) 계약 시험 — docs/math_1_bridge_spec.md §3-1
// 계약서만 보고 초안과 따로 쓴 시험이다(2-1 때와 같은 방식). 노션 미접속.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { read } from './split-rules.mjs';

function load(files) {
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  for (const f of files) vm.runInContext(read(f), sandbox, { filename: f });
  return sandbox.window;
}

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

const JS = 'kids/subjects/math/js/';
const H = load([JS + 'number100-core.js']).HundredCore;
const plain = (x) => JSON.parse(JSON.stringify(x)); // VM 안 배열을 바깥 배열로
const inRange = (n) => Number.isInteger(n) && n >= 10 && n <= 99;
const wrongInRange = (n) => Number.isInteger(n) && n >= 1 && n <= 99; // 오답은 1~99 (한 자리 place-ignore 허용, 세 자리 없음)

test('readSino: 10~99 한자어 읽기 (십의 1은 "일" 없음, 일의 0은 읽지 않음)', () => {
  const cases = [[10, '십'], [11, '십일'], [15, '십오'], [20, '이십'], [21, '이십일'], [52, '오십이'], [60, '육십'], [99, '구십구']];
  for (const [n, s] of cases) assert.equal(H.readSino(n), s, n);
});

test('readNative: 10~99 순우리말 읽기', () => {
  const cases = [[10, '열'], [11, '열하나'], [20, '스물'], [23, '스물셋'], [30, '서른'], [44, '마흔넷'], [50, '쉰'], [52, '쉰둘'],
    [60, '예순'], [70, '일흔'], [80, '여든'], [82, '여든둘'], [90, '아흔'], [99, '아흔아홉']];
  for (const [n, s] of cases) assert.equal(H.readNative(n), s, n);
});

test('digits: 두 자리 나누기', () => {
  assert.deepEqual(JSON.parse(JSON.stringify(H.digits(63))), { t: 6, o: 3 });
  assert.deepEqual(JSON.parse(JSON.stringify(H.digits(10))), { t: 1, o: 0 });
});

test('LAB_KINDS: 관 1~5마다 명세 순서의 종류 3개', () => {
  const want = {
    1: ['tens-make', 'listen-build', 'count-picture'],
    2: ['read-sino', 'read-native', 'listen-native'],
    3: ['next-1', 'prev-1', 'between'],
    4: ['compare-diff-tens', 'compare-same-tens', 'compare-trap'],
    5: ['pair-candies', 'pair-candies-big', 'which-even']
  };
  for (const lab of [1, 2, 3, 4, 5]) assert.deepEqual([...H.LAB_KINDS[lab]], want[lab], `관 ${lab}`);
});

// 종류마다 seed 300개: 답·오답 범위, 오답 겹침 없음, 종류별 제약
test('makeProblem + wrongChoices: 종류마다 seed 300개 계약', () => {
  const kinds = Object.values(H.LAB_KINDS).flat();
  let boundaryNext = 0;
  let boundaryPrev = 0;
  let equalSeen = 0;
  let oddTarget = 0;
  for (const kind of kinds) {
    for (let s = 1; s <= 300; s++) {
      const rng = seeded(s * 31 + kind.length);
      const p = H.makeProblem(kind, rng);
      assert.equal(p.kind, kind);
      assert.equal(typeof p.answerText, 'string');
      const w = H.wrongChoices(p);
      const expectWrongs = kind === 'pair-candies' || kind === 'pair-candies-big' ? 1 : 2;
      assert.equal(w.length, expectWrongs, `${kind} 오답 수`);
      const texts = [p.answerText, ...w.map((x) => x.text)];
      assert.equal(new Set(texts).size, texts.length, `${kind} 보기 겹침 ${texts}`);
      for (const x of w) assert.equal(typeof x.mistake, 'string', `${kind} 오개념 이름`);

      if (kind === 'tens-make') {
        assert.ok(p.t >= 3 && p.t <= 6 && p.o === 0);
        assert.equal(p.answerText, String(p.t * 10));
      }
      if (kind === 'listen-build') {
        assert.ok(p.t >= 2 && p.t <= 4 && p.o >= 1 && p.o <= 3, `${p.t},${p.o}`);
        assert.ok(p.t + p.o + 1 <= 8, '누르기 8번 이내');
        assert.equal(p.reading, H.readSino(p.t * 10 + p.o));
        assert.equal(p.answerText, String(p.t * 10 + p.o));
      }
      if (kind === 'count-picture') {
        assert.ok(p.t >= 1 && p.t <= 9 && p.o >= 1 && p.o <= 9);
        assert.equal(p.answerText, String(p.t * 10 + p.o));
      }
      if (kind === 'read-sino') assert.equal(p.answerText, H.readSino(p.n));
      if (kind === 'read-native') assert.equal(p.answerText, H.readNative(p.n));
      if (kind === 'listen-native') {
        assert.equal(p.reading, H.readNative(p.n));
        assert.equal(p.answerText, String(p.n));
      }
      if (kind === 'next-1') {
        assert.ok(inRange(p.start) && p.step === 1);
        assert.equal(p.answerText, String(p.start + 1));
        if (p.start % 10 === 9) boundaryNext++;
      }
      if (kind === 'prev-1') {
        assert.ok(inRange(p.start) && p.step === -1);
        assert.equal(p.answerText, String(p.start - 1));
        if (p.start % 10 === 0) boundaryPrev++;
      }
      if (kind === 'between') {
        assert.ok(p.n >= 11 && p.n <= 98);
        assert.equal(p.a + 1, p.n);
        assert.equal(p.b - 1, p.n);
        assert.equal(p.answerText, String(p.n));
      }
      if (kind.startsWith('compare-')) {
        assert.ok(inRange(p.a) && inRange(p.b));
        if (kind !== 'compare-same-tens') assert.notEqual(p.a, p.b);
        assert.equal(p.answerText, p.a > p.b ? '>' : (p.a < p.b ? '<' : '='));
        if (p.a === p.b) equalSeen++;
        const wantMistake = kind === 'compare-diff-tens' ? 'reverse' : (kind === 'compare-same-tens' ? 'compare-ones' : 'compare-ones-first');
        for (const x of w) {
          if (p.a === p.b) assert.equal(x.mistake, 'not-equal');
          else assert.equal(x.mistake, x.text === '=' ? 'equal' : wantMistake, `${kind} ${x.text}`);
        }
        assert.deepEqual(plain(w.map((x) => x.text).sort()), ['<', '=', '>'].filter((t) => t !== p.answerText).sort());
        const ta = Math.floor(p.a / 10), tb = Math.floor(p.b / 10), oa = p.a % 10, ob = p.b % 10;
        if (kind === 'compare-diff-tens') assert.notEqual(ta, tb);
        if (kind === 'compare-same-tens') assert.equal(ta, tb);
        if (kind === 'compare-trap') assert.ok(ta !== tb && (ta < tb) === (oa > ob), `함정 쌍 ${p.a} ${p.b}`);
      }
      if (kind === 'pair-candies') assert.ok(p.count >= 6 && p.count <= 12);
      if (kind === 'pair-candies-big') assert.ok(p.count >= 13 && p.count <= 20);
      if (kind === 'pair-candies' || kind === 'pair-candies-big') {
        assert.equal(p.answerText, p.count % 2 === 0 ? '짝수' : '홀수');
        assert.equal(w[0].text, p.count % 2 === 0 ? '홀수' : '짝수');
      }
      if (kind === 'which-even') {
        assert.ok(p.target === 'even' || p.target === 'odd');
        if (p.target === 'odd') oddTarget++;
        const want = p.target === 'even' ? 0 : 1;
        assert.equal(p.n % 2, want);
        assert.equal(p.answerText, String(p.n));
        assert.ok(inRange(p.n));
        for (const x of w) {
          assert.ok(inRange(Number(x.text)));
          assert.equal(Number(x.text) % 2, 1 - want);
          assert.equal(x.mistake, 'last-digit');
        }
      }
      // 숫자 답은 10~99, 숫자 오답은 1~99 (세 자리 수를 1학년 화면에 내지 않음)
      if (/^\d+$/.test(p.answerText) && !kind.startsWith('compare-')) assert.ok(inRange(Number(p.answerText)), `${kind} 답 ${p.answerText}`);
      for (const x of w) if (/^\d+$/.test(x.text)) assert.ok(wrongInRange(Number(x.text)), `${kind} 오답 범위 밖 ${x.text}`);
    }
  }
  assert.ok(boundaryNext >= 90 && boundaryNext <= 210, `1 큰 수 경계 절반쯤: ${boundaryNext}/300`);
  assert.ok(boundaryPrev >= 90 && boundaryPrev <= 210, `1 작은 수 경계 절반쯤: ${boundaryPrev}/300`);
  assert.ok(equalSeen >= 40 && equalSeen <= 120, `같은 수 쌍 4번에 1번쯤: ${equalSeen}/300`);
  assert.ok(oddTarget >= 90 && oddTarget <= 210, `홀수 고르기 절반쯤: ${oddTarget}/300`);
});

test('wrongChoices 오개념 이름: 명세 표의 이름만', () => {
  const allowed = new Set(['place-ignore', 'swap-digits', 'off-by-one', 'off-by-ten', 'read-digits', 'read-one-prefix', 'read-zero',
    'native-digit', 'native-neighbor', 'wrong-step', 'wrong-direction', 'compare-ones-first', 'compare-ones', 'reverse', 'equal',
    'not-equal', 'even-odd-swap', 'last-digit']);
  for (const kind of Object.values(H.LAB_KINDS).flat()) {
    for (let s = 1; s <= 60; s++) {
      for (const w of H.wrongChoices(H.makeProblem(kind, seeded(s)))) assert.ok(allowed.has(w.mistake), `${kind}: ${w.mistake}`);
    }
  }
});

test('makeRound: 관마다 3문제, 종류 순서 = LAB_KINDS', () => {
  for (const lab of [1, 2, 3, 4, 5]) {
    const r = H.makeRound(lab, seeded(lab));
    assert.deepEqual(plain(r.map((p) => p.kind)), plain(H.LAB_KINDS[lab]));
  }
});

test('makeBingo: seed 300개, 9문제·답 서로 다름·10~99·문제 글 4종', () => {
  const kindsSeen = new Set();
  for (let s = 1; s <= 300; s++) {
    const b = H.makeBingo(seeded(s));
    assert.equal(b.length, 9);
    const answers = b.map((p) => p.answerText);
    assert.equal(new Set(answers).size, 9, answers.join(','));
    for (const p of b) {
      assert.ok(inRange(Number(p.answerText)), p.answerText);
      assert.equal(p.answerText, String(p.n));
      if (p.kind === 'call-next') assert.ok(p.n >= 11);
      assert.equal(typeof p.call, 'string');
      assert.ok(p.call.length > 0 && p.call.length <= 25, p.call);
      assert.ok(!p.call.includes(p.answerText), `문제 글에 답이 보임: ${p.call}`);
      kindsSeen.add(p.kind);
    }
  }
  assert.deepEqual([...kindsSeen].sort(), ['call-bundle', 'call-native', 'call-next', 'call-sino']);
});

test('스무고개: 10~99 후보 90개, 칩마다 후보를 둘로 나눌 수 있음, 비밀 수 범위', () => {
  assert.equal(H.candidates([]).length, 90);
  for (let s = 1; s <= 200; s++) assert.ok(inRange(H.makeSecret(seeded(s))));
  const all = H.candidates([]);
  const ids = H.chipList();
  assert.ok(ids.includes('even') && ids.includes('gt:55') && ids.includes('tg:5') && ids.includes('o:0'));
  assert.ok(!ids.some((id) => id.startsWith('h:') || id.startsWith('hg:')), '백의 자리 칩 없음');
  assert.ok(!ids.includes('og:0'), 'og:0은 o:0과 뜻이 겹쳐 뺌');
  assert.deepEqual(plain(ids.filter((id) => id.startsWith('gt:'))), ['gt:15', 'gt:25', 'gt:35', 'gt:45', 'gt:55', 'gt:65', 'gt:75', 'gt:85']);
  for (const id of ids) {
    const yes = all.filter((n) => H.chipAnswer(n, id)).length;
    assert.ok(yes > 0 && yes < 90, `${id}는 후보를 나눠야 함 (${yes})`);
    const text = H.chipText(id);
    assert.ok(text.endsWith('?'), text);
    assert.ok(!/십의 자리|일의 자리/.test(text), `1학년 말: ${text}`);
  }
  assert.equal(H.chipText('tg:5'), '10개씩 묶음이 5개보다 많아요?');
  assert.equal(H.chipText('t:5'), '10개씩 묶음이 5개예요?');
  assert.equal(H.chipText('o:0'), '낱개가 없어요?');
  assert.equal(H.chipText('o:3'), '낱개가 3개예요?');
  assert.equal(H.chipText('gt:35'), '35보다 커요?');
  assert.equal(H.chipText('og:4'), '낱개가 4개보다 많아요?');
  const asked = [{ id: 'gt:55', answer: true }, { id: 'even', answer: false }];
  const left = H.candidates(asked);
  assert.ok(left.every((n) => n > 55 && n % 2 === 1));
  assert.equal(left.length, 22);
});
