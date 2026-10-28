import test from 'node:test';
import assert from 'node:assert/strict';
import { loadBrowserScripts } from './browser-sandbox.mjs';

const SOURCE = 'kids/subjects/quest/quest-mastery.js', FIRST_SEED = 20261028, RUNS = 100;
const MINUTE = 60000, START = Date.parse('2026-10-28T12:00:00+09:00');
const plain = value => JSON.parse(JSON.stringify(value));
function random(seed) {
  return () => {
    let n = seed += 0x6D2B79F5;
    n = Math.imul(n ^ n >>> 15, n | 1);
    n ^= n + Math.imul(n ^ n >>> 7, n | 61);
    return ((n ^ n >>> 14) >>> 0) / 4294967296;
  };
}
const integer = (rng, max) => Math.floor(rng() * (max + 1));
const choose = (rng, list) => list[integer(rng, list.length - 1)];
function shift(date, days) {
  const [y, m, d] = date.split('-').map(Number), value = new Date(Date.UTC(y, m - 1, d + days));
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}-${String(value.getUTCDate()).padStart(2, '0')}`;
}
function equal(rule, actual, expected, detail) {
  assert.deepEqual(plain(actual), plain(expected), `${rule}: ${detail}; 기대=${JSON.stringify(expected)}, 실제=${JSON.stringify(actual)}`);
}
const zero = () => ({ c: 0, s: '', r: '' });
const textOf = state => `${state.c}|${state.s}|${state.r}`;

function fixture(rng) {
  const { sandbox } = loadBrowserScripts([SOURCE]);
  equal('준비', sandbox.Date === Date, true, '샌드박스와 호스트의 Date 객체 공유');
  const api = sandbox.QuestMastery, child = choose(rng, ['minsu', 'minseo']);
  const childName = child === 'minsu' ? '민수' : '민서';
  const raw = Array.from({ length: 6 + integer(rng, 9) }, (_, i) => ({
    id: `item_${i}`, word: i % 4 === 3 ? `We learn new word number ${i} today.` : `word${i}tail`,
    meaning: `시험 뜻 ${i}`, wordType: i % 4 === 3 ? '문장' : '단어', stage: 'L1', subject: ['영어'], target: [childName]
  }));
  const items = api.selectUnitItems(raw, { childName, subjectKo: '영어', unit: 'L1' });
  const store = { items: {}, dirty: {}, pushedAt: {} }, notion = new Map();
  for (const [index, item] of items.entries()) {
    const c = index === 0 ? 5 : choose(rng, [0, 1, 3, 5, 6, 7, 8, 9]);
    const state = { c, s: c >= 6 ? '2026-10-27' : '', r: c >= 9 ? '2026-10-25' : '2026-10-28' };
    store.items[item.id] = state; notion.set(item.id, textOf(state));
  }
  api.saveStore(child, store);
  return { api, child, items, notion, today: '2026-10-28' };
}
function checkRange(env) {
  for (const [id, state] of Object.entries(env.api.loadStore(env.child).items)) {
    equal('Q1', Number.isInteger(state.c) && state.c >= 0 && state.c <= 9, true, `${id} 범위`);
    equal('Q1', env.api.parseMastery(env.api.formatMastery(state)), state, `${id} 문자열 왕복`);
  }
}
function grade(env, question, results, history) {
  const { api, child, today } = env, before = plain(api.loadStore(child));
  history.push({ kind: 'applyResult', today, question: plain(question), results });
  api.applyResult(child, question, results, today);
  const after = plain(api.loadStore(child));
  if (question.noCredit) { equal('Q4', after, before, 'noCredit 저장 전체 불변'); return; }
  for (const { id, firstTry } of results) {
    const previous = before.items[id] || zero(), expected = { ...previous };
    if (question.isRustyReview) {
      if (!firstTry) expected.c = 5;
      expected.r = today;
    } else if (firstTry) {
      if (previous.c < 6) { expected.c++; if (expected.c === 6) expected.s = today; }
      else if (previous.c < 9 && previous.s < today) expected.c++;
      expected.r = today;
    }
    const actual = after.items[id] || zero();
    if (actual.c > previous.c && actual.c > 6) equal('Q2', actual.s < actual.r, true, `${id} 은메달 당일 승급 금지`);
    equal('Q2', actual, expected, `${id} 채점 상태 전이`);
    if (actual.c < previous.c) {
      equal('Q3', question.isRustyReview && !firstTry && actual.c === 5, true, `${id} 허용된 강등`);
      equal('Q3', after.dirty[id], 'demote', '강등 미전송 표시');
    }
  }
  checkRange(env);
}
function round(env, rng, history, override) {
  const store = override || plain(env.api.loadStore(env.child));
  const result = env.api.buildRound({ child: env.child, items: env.items, subj: 'english', today: env.today, rng, store });
  history.push({ kind: 'buildRound', today: env.today, store, questions: plain(result.questions) });
  equal('Q6', result.questions.length, 5, '한 판 문제 수');
  equal('Q6', result.questions.filter(q => q.level === 3).length <= 2, true, 'Lv.3 쿼터');
  result.questions.forEach((q, i) => { if (q.isRustyReview) equal('Q6', i, 3, '녹슨 왕관 슬롯'); });
  const rusty = env.items.filter(item => {
    const state = store.items[item.id] || zero();
    return state.c >= 9 && (!state.r || shift(state.r, 2) <= env.today);
  });
  if (rusty.length) {
    equal('Q6', result.questions[3].isRustyReview, true, '녹슨 왕관 예약');
    equal('Q6', rusty.some(item => result.questions[3].itemIds.includes(item.id)), true, '녹슨 항목 출제');
  }
  return result.questions;
}
function sync(env, records, history) {
  const { api, child } = env, before = plain(api.loadStore(child));
  history.push({ kind: 'syncFromRecords', at: Date.now(), records });
  api.syncFromRecords(child, records, true);
  const after = plain(api.loadStore(child));
  for (const record of records) {
    const previous = before.items[record.id] || zero();
    const remote = plain(api.parseMastery(record.mastery)); if (record.isAchieved) remote.c = 9;
    const dirty = before.dirty[record.id], recent = Date.now() - (before.pushedAt[record.id] || 0) < 10 * MINUTE;
    const actual = after.items[record.id];
    if (!dirty && !(recent && remote.c < previous.c)) equal('Q3', actual, remote, '보호 밖 원격 기준');
    else if (dirty === 'demote') equal('Q3', actual, previous, '미전송 강등 유지');
    else {
      equal('Q3', actual.c, Math.max(previous.c, remote.c), 'dirty·10분 보호 창 Max-Merge');
      if (remote.c < previous.c) equal('Q3', actual, previous, '낮은 원격으로 진도 회수 금지');
    }
  }
  checkRange(env);
}
function checkPending(env) {
  const store = env.api.loadStore(env.child);
  for (const item of env.items) {
    const local = textOf(store.items[item.id] || zero());
    if (local !== env.notion.get(item.id)) equal('Q5', !!store.dirty[item.id], true, `${item.id} 미전송 진도 유실 금지`);
  }
}
async function push(env, rng, history, { interleave = false, always = false, pendingRule = false } = {}) {
  let intervened = false;
  history.push({ kind: 'pushChanges', interleave, always });
  await env.api.pushChanges(env.child, async (id, text, achieved) => {
    const ok = always || rng() < 0.75;
    for (let n = integer(rng, 3); n > 0; n--) await Promise.resolve();
    if (interleave && !intervened) {
      intervened = true; env.today = shift(env.today, 1);
      grade(env, { noCredit: false, isRustyReview: false }, [{ id, firstTry: true }], history);
      if (pendingRule) checkPending(env);
    }
    history.push({ kind: 'patch', id, text, achieved, ok });
    if (ok) env.notion.set(id, text);
    return ok;
  });
  if (pendingRule) checkPending(env);
  checkRange(env);
}
function property(name, fn) {
  test(name, async t => {
    const explicit = process.env.QUEST_PROP_SEED;
    const seed = explicit === undefined ? FIRST_SEED : Number(explicit);
    const runs = explicit === undefined ? Number(process.env.QUEST_PROP_RUNS || RUNS) : 1;
    assert.ok(Number.isSafeInteger(seed) && seed >= 0 && seed <= 0xFFFFFFFF, '시드는 uint32 정수여야 합니다');
    assert.ok(Number.isSafeInteger(runs) && runs > 0, '횟수는 양의 정수여야 합니다');
    const clock = { now: START }; t.mock.method(Date, 'now', () => clock.now);
    for (let index = 0; index < runs; index++) {
      const current = (seed + index) >>> 0, rng = random(current), history = [];
      try { clock.now = START; await fn(fixture(rng), rng, history, clock); }
      catch (cause) {
        throw new Error(`무작위 순서 시험 실패: 시드=${current}, 실행=${index + 1}/${runs}\n첫 실패=${cause.message}\n동작 목록(JSON)=${JSON.stringify(history)}`, { cause });
      }
    }
    t.diagnostic(`시작 시드=${seed}, 실행 횟수=${runs}, 실행당 무작위 동작=30~50개`);
  });
}

property('Q1·Q2·Q3·Q4·Q6 숙련도 무작위 순서 시험: 채점·원격·보호 창·판 구성', async (env, rng, history, clock) => {
  const id = env.items[0].id, q = { noCredit: false, isRustyReview: false }, correct = [{ id, firstTry: true }];
  grade(env, q, correct, history); grade(env, q, correct, history);
  grade(env, { ...q, noCredit: true }, correct, history);
  await push(env, rng, history, { always: true });
  clock.now += 9 * MINUTE;
  history.push({ kind: 'clock', at: clock.now });
  sync(env, [{ id, mastery: '0||', isAchieved: false }], history);
  clock.now += 2 * MINUTE;
  history.push({ kind: 'clock', at: clock.now });
  sync(env, [{ id, mastery: '0||', isAchieved: false }], history);
  const crowded = plain(env.api.loadStore(env.child));
  for (const item of env.items) crowded.items[item.id] = { c: 7, s: shift(env.today, -1), r: env.today };
  crowded.items[id] = { c: 9, s: shift(env.today, -4), r: shift(env.today, -3) };
  round(env, rng, history, crowded);
  for (let step = 9, count = 30 + integer(rng, 20); step < count; step++) {
    switch (integer(rng, 4)) {
      case 0: {
        const question = choose(rng, round(env, rng, history));
        grade(env, { ...question, noCredit: question.noCredit || rng() < 0.15 },
          Array.from(question.itemIds, itemId => ({ id: itemId, firstTry: rng() < 0.7 })), history); break;
      }
      case 1: {
        const item = choose(rng, env.items), last = env.notion.get(item.id) || '0||';
        const old = env.api.parseMastery(last); old.c = Math.max(0, old.c - 1 - integer(rng, 3));
        const kind = integer(rng, 3);
        sync(env, [{ id: item.id, mastery: kind === 0 ? last : kind === 1 ? textOf(old) : '0||', isAchieved: kind === 3 }], history); break;
      }
      case 2: await push(env, rng, history, { interleave: rng() < 0.6 }); break;
      case 3:
        env.today = shift(env.today, integer(rng, 4)); clock.now += choose(rng, [9, 11]) * MINUTE;
        history.push({ kind: 'clock', today: env.today, at: clock.now }); break;
      default: round(env, rng, history);
    }
    checkRange(env);
  }
});

property('Q5 push 무작위 순서 시험: await 사이 채점·실패·재전송 후 완전 배출', async (env, rng, history) => {
  // 외부 부모 수정·타 기기 Pull은 Q3에서 검사합니다. 이 흐름의 모의 노션은
  // push가 마지막으로 성공시킨 값만 바뀌어, 비동기 전송 중 로컬 진도 유실을 따로 판정합니다.
  const id = env.items[0].id;
  grade(env, { noCredit: false }, [{ id, firstTry: true }], history);
  await push(env, rng, history, { interleave: true, always: true, pendingRule: true });
  for (let step = 2, count = 30 + integer(rng, 20); step < count; step++) {
    if (rng() < 0.55) {
      const question = choose(rng, round(env, rng, history));
      grade(env, question, Array.from(question.itemIds, itemId => ({ id: itemId, firstTry: rng() < 0.8 })), history);
    } else await push(env, rng, history, { interleave: rng() < 0.5, pendingRule: true });
    checkPending(env);
  }
  let attempts = 0;
  while (Object.keys(env.api.loadStore(env.child).dirty).length && attempts++ < env.items.length + 1)
    await push(env, rng, history, { always: true, pendingRule: true });
  equal('Q5', Object.keys(env.api.loadStore(env.child).dirty).length, 0, '실패 없는 push로 대기열 배출');
  for (const item of env.items) equal('Q5', textOf(env.api.loadStore(env.child).items[item.id] || zero()), env.notion.get(item.id), `${item.id} 최종 일치`);
});
