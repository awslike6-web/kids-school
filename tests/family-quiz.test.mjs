// 🧩 가족 출제 퀴즈 (docs/family_quiz_spec.md §8): 저장소 변환·검사·새 문제·고치기·우체통 묶음·로비 카드·화면 금지 규칙
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { read } from './split-rules.mjs';

function page(id, props) {
  const t = v => [{ plain_text: v }];
  return {
    id,
    properties: {
      '문제': { title: t(props.q || '질문') },
      '정답': { rich_text: t(props.a || '정답') },
      '오답1': { rich_text: t('가') }, '오답2': { rich_text: t('나') }, '오답3': { rich_text: t('다') },
      '힌트': { rich_text: props.hint ? t(props.hint) : [] },
      '출제자': { select: { name: '민수' } },
      '푸는사람': { select: { name: props.solver || '민서' } },
      '상태': { select: { name: props.status || '공개' } },
      '버전': { number: props.v ?? 1 },
      '고친날': { date: props.day ? { start: props.day } : null },
      '푼버전': { number: props.solved ?? null },
      '결과': { select: props.result ? { name: props.result } : null },
      '신고': { select: props.report ? { name: props.report } : null }
    }
  };
}

function load({ pages = [], device = null, sendFails = false } = {}) {
  const calls = [];
  const sent = [];
  const storage = new Map();
  const elements = [];
  const makeEl = tag => {
    const el = {
      tag, children: [], hidden: true, className: '', textContent: '', href: '',
      append(...kids) { this.children.push(...kids); },
      appendChild(kid) { this.children.push(kid); return kid; },
      replaceChildren() { this.children = []; },
      set innerHTML(v) { throw new Error('innerHTML 금지'); }
    };
    elements.push(el);
    return el;
  };
  const win = {
    APP_CONFIG: { FAMILY_QUIZ_DB_ID: 'db1', WORKER_PROXY_URL: 'https://proxy.test/' },
    localStorage: { getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, String(v)), removeItem: k => storage.delete(k) },
    fetch: async (url, opts) => {
      const body = opts.body ? JSON.parse(opts.body) : null;
      calls.push({ url, method: opts.method, body });
      if (url.includes('/query')) return { ok: true, json: async () => ({ results: pages, has_more: false }) };
      return { ok: true, json: async () => page('new', {}) };
    },
    FamilyMail: device === 'none' ? undefined : {
      getDevice: () => device,
      newClientId: () => 'cid',
      send: async msg => { if (sendFails) throw new Error('x'); sent.push(msg); return {}; }
    }
  };
  const ctx = {
    window: win, location: { href: 'https://site.test/kids-school/lobby.html' },
    document: { currentScript: { src: 'https://site.test/kids-school/kids/core/family-quiz-store.js' }, createElement: makeEl },
    URL, Date, JSON, Map, Promise, Array, String, Number, Object, Error, console
  };
  vm.createContext(ctx);
  vm.runInContext(read('kids/core/family-quiz-store.js'), ctx);
  return { FQ: win.FamilyQuiz, calls, sent, storage, makeEl };
}

test('노션 행을 문제로 바꾸고, 빈 힌트·빈 푼버전도 다룬다', () => {
  const { FQ } = load();
  const q = FQ.fromPage(page('p1', { q: '사과는 무슨 색?', a: '빨강', v: 2, day: '2026-11-19' }));
  assert.equal(q.question, '사과는 무슨 색?');
  assert.equal(q.answer, '빨강');
  assert.deepEqual([...q.wrongs], ['가', '나', '다']);
  assert.equal(q.hint, '');
  assert.equal(q.version, 2);
  assert.equal(q.solvedVersion, null);
  assert.equal(q.editedOn, '2026-11-19');
  assert.deepEqual([...FQ.choicesOf(q)], ['빨강', '가', '나', '다']);
});

test('입력 검사: 빈 칸·겹치는 보기·정답과 같은 오답·글자 수 초과는 막고, 긴 문제는 경고만', () => {
  const { FQ } = load();
  const good = { question: '사과는 무슨 색일까요?', answer: '빨강', wrongs: ['파랑', '초록', '보라'] };
  assert.equal(FQ.validate(good).ok, true);
  assert.equal(FQ.validate({ ...good, answer: '' }).ok, false);
  const same = FQ.validate({ ...good, wrongs: ['빨강', '초록', '보라'] });
  assert.equal(same.ok, false);
  assert.match(same.errors[0].message, /정답과 같은/);
  assert.match(FQ.validate({ ...good, wrongs: ['파랑', '파랑', '보라'] }).errors[0].message, /두 번/);
  assert.equal(FQ.validate({ ...good, answer: '가'.repeat(21) }).ok, false);
  assert.equal(FQ.validate({ ...good, hint: '나'.repeat(61) }).ok, false);
  const long = FQ.validate({ ...good, question: '아'.repeat(45) });
  assert.equal(long.ok, true);
  assert.equal(long.warnings.length, 1);
  assert.equal(FQ.validate({ ...good, question: '  공백   정리  ' }).draft.question, '공백 정리');
});

test('새 문제: 푼버전이 없거나 작으면 새 문제, 같거나 숨김이면 아님, 오래된 순 최대 3개', () => {
  const { FQ } = load();
  const list = [
    page('a', { day: '2026-11-19' }), page('b', { day: '2026-11-17', v: 2, solved: 1 }),
    page('c', { day: '2026-11-18', v: 1, solved: 1 }), page('d', { day: '2026-11-16', status: '숨김' }),
    page('e', { day: '2026-11-15' }), page('f', { day: '2026-11-14', solver: '민수' })
  ].map(FQ.fromPage);
  const picked = FQ.pickNew(list, '민서');
  assert.deepEqual(picked.map(q => q.id), ['e', 'b', 'a']);
  assert.equal(FQ.isNew(list[2]), false);
});

test('출시·고치기·풀이 기록 노션 값', async () => {
  const { FQ, calls } = load();
  const draft = { question: '하늘은?', answer: '파랑', wrongs: ['빨강', '노랑', '검정'], hint: '' };
  const created = FQ.createProperties(draft, '민수', '민서', '2026-11-19');
  assert.equal(created['상태'].select.name, '공개');
  assert.equal(created['버전'].number, 1);
  assert.equal(created['고친날'].date.start, '2026-11-19');
  assert.equal(created["힌트"].rich_text.length, 0);
  const revised = FQ.reviseProperties({ version: 2 }, draft, '2026-11-20');
  assert.equal(revised['버전'].number, 3);
  assert.equal(revised['푼버전'].number, null);
  assert.equal(revised['신고'].select, null);
  assert.equal(revised['결과'].select, null);
  const result = FQ.resultProperties({ version: 3 }, '두번째에', '글자가 틀렸어요');
  assert.equal(result['푼버전'].number, 3);
  assert.equal(result['결과'].select.name, '두번째에');
  assert.equal(result['신고'].select.name, '글자가 틀렸어요');
  assert.equal(FQ.resultProperties({ version: 1 }, '엉뚱', '아무말')['신고'], undefined);

  await FQ.create(draft, '민수', '민서');
  assert.equal(calls[0].url, 'https://proxy.test/v1/pages');
  assert.equal(calls[0].body.parent.database_id, 'db1');
  await assert.rejects(FQ.create({ ...draft, answer: '' }, '민수', '민서'));
  assert.equal(calls.length, 1);
});

test('목록 질의는 엣지 캐시를 건너뛰고 공개 행만 묻는다', async () => {
  const { FQ, calls } = load({ pages: [page('a', {})] });
  await FQ.listForSolver('민서');
  assert.match(calls[0].url, /\/v1\/databases\/db1\/query\?force=true$/);
  const rules = calls[0].body.filter.and;
  assert.equal(rules[0].select.equals, '공개');
  assert.equal(rules[1].property, '푸는사람');
});

test('우체통 알림: 기기 주인이 같을 때만, 30분에 한 번, 실패는 조용히', async () => {
  const mine = load({ device: { member: 'minsu' } });
  assert.equal(await mine.FQ.notify('minsu', 'minseo', '새 문제!', 10_000_000), true);
  assert.equal(await mine.FQ.notify('minsu', 'minseo', '또!', 10_000_000 + 10 * 60 * 1000), false);
  assert.equal(await mine.FQ.notify('minsu', 'minseo', '30분 뒤', 10_000_000 + 31 * 60 * 1000), true);
  assert.equal(mine.sent.length, 2);
  assert.equal(mine.sent[0].to, 'minseo');
  const other = load({ device: { member: 'minseo' } });
  assert.equal(await other.FQ.notify('minsu', 'minseo', 'x'), false);
  assert.equal((await load({ device: 'none' }).FQ.notify('minsu', 'minseo', 'x')), false);
  const fail = load({ device: { member: 'minsu' }, sendFails: true });
  assert.equal(await fail.FQ.notify('minsu', 'minseo', 'x'), false);
});

test('로비 카드: 민서는 새 문제가 있을 때만, 민수는 늘 버튼 + 신고 배지', async () => {
  const fresh = load({ pages: [page('a', {}), page('b', { v: 1, solved: 1 })] });
  const el = fresh.makeEl('div');
  assert.equal(await fresh.FQ.mountLobbyCard(el, 'minseo'), 1);
  assert.equal(el.hidden, false);
  assert.equal(el.children[0].href, 'https://site.test/kids-school/kids/common_space/family_quiz.html?user=minseo');
  assert.equal(el.children[0].children[1].textContent, '오빠가 낸 문제 1개!');

  const none = load({ pages: [page('b', { v: 1, solved: 1 })] });
  const el2 = none.makeEl('div');
  assert.equal(await none.FQ.mountLobbyCard(el2, 'minseo'), 0);
  assert.equal(el2.hidden, true);

  const author = load({ pages: [page('a', { report: '답이 이상해요' }), page('b', {})] });
  const el3 = author.makeEl('div');
  assert.equal(await author.FQ.mountLobbyCard(el3, 'minsu'), 1);
  assert.equal(el3.hidden, false);
  assert.equal(el3.children[0].children[2].textContent, '🚩 1');
});
