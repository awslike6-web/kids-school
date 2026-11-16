import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import vm from 'node:vm';

// 정밀 독해 객관식 채점(ReadingEngine.resolveAnswerIndex)의 계약:
// 정답 글자가 보기와 같으면 그 보기, 숫자만 적힌 정답만 보기 번호(1부터)로 본다.
// (2026-11-16 제보: 영어 10단원 2번 정답 「3시 30분」을 맨 앞 숫자 3 때문에 3번 보기 「6시」로 채점)
function engine() {
  const sandbox = {
    console: { log() {}, info() {}, warn() {}, error: console.error },
    setTimeout, clearTimeout,
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    sessionStorage: { getItem: () => null, setItem() {} },
    addEventListener() {},
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(readFileSync(new URL('../kids/core/reading_engine.js', import.meta.url), 'utf8'), sandbox);
  return sandbox.ReadingEngine;
}

const resolve = engine().resolveAnswerIndex;

test('숫자로 시작하는 정답 글자는 같은 글자의 보기로 채점한다', () => {
  const q = { options: ['12시 30분 (at 12:30)', '3시 30분 (at 3:30)', '6시 (at 6)', '9시 (at 9)'], answer: '3시 30분 (at 3:30)' };
  assert.equal(resolve(q), 1);
  assert.equal(resolve({ options: ['2개 (2 chairs)', '3개 (3 chairs)', '4개 (4 chairs)', '5개 (5 chairs)'], answer: '4개 (4 chairs)' }), 2);
});

test('숫자만 적힌 정답은 보기 번호(1부터), 보기 글자가 숫자면 글자가 먼저다', () => {
  assert.equal(resolve({ options: ['가', '나', '다', '라'], answer: '2' }), 1);
  assert.equal(resolve({ options: ['3', '1', '2', '4'], answer: '2' }), 2);
  assert.equal(resolve({ options: ['가', '나'], answer: 1 }), 1);
  assert.equal(resolve({ choices: ['가', '나'], answerIndex: 1, answer: '가' }), 1);
  assert.equal(resolve({ options: ['  가 ', '나'], answer: '가' }), 0);
});

test('등록 자료(scripts/data/reading/*.json)의 객관식 정답은 모두 보기 글자와 같고 그 보기로 채점된다', () => {
  const dir = new URL('../scripts/data/reading/', import.meta.url);
  let checked = 0;
  for (const name of readdirSync(dir).filter(f => f.endsWith('.json'))) {
    const data = JSON.parse(readFileSync(new URL(name, dir), 'utf8'));
    const passages = data.passages || [data];
    for (const p of passages) {
      for (const [i, q] of (p.questions || []).entries()) {
        const options = q.choices || q.options;
        if (!Array.isArray(options) || !options.length) continue;
        const where = `${name} · ${p.title || p.book_id} · ${i + 1}번`;
        const expected = options.findIndex(o => String(o).trim() === String(q.answer).trim());
        assert.notEqual(expected, -1, `${where}: 정답이 보기에 없음`);
        assert.equal(resolve(q), expected, `${where}: 다른 보기로 채점됨`);
        checked++;
      }
    }
  }
  assert.ok(checked > 0);
});
