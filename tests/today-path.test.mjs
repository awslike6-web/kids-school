// 오늘의 길(docs/today_path_spec.md §10): 편성·완료 장부·시간표·연결 지점 시험 (노션 미접속)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { loadBrowserScripts } from './browser-sandbox.mjs';
import { splitLogRows } from '../scripts/study_usage_report.mjs';

const require = createRequire(import.meta.url);
const TP = require('../kids/core/today-path.js');
const QM = require('../kids/subjects/quest/quest-mastery.js');
const read = file => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const plain = value => JSON.parse(JSON.stringify(value));

const ROOMS = {
  korean: 'kids/subjects/korean/korean.html', math: 'kids/subjects/math/math.html',
  english: 'kids/subjects/english/english.html', society: 'kids/subjects/society/society.html',
  science: 'kids/subjects/science/science.html', haru: 'kids/subjects/haru/haru.html'
};
const MINSU = { child: '민수', childKey: 'minsu', eligible: ['english', 'korean', 'math', 'society', 'science', 'haru'] };
const MINSEO = { child: '민서', childKey: 'minseo', eligible: ['korean', 'math', 'english', 'haru'] };
const TT_MINSU = { '월요일': ['영어', '수학', '국어'], '화요일': ['과학', '사회', '국어'], '수요일': ['사회', '영어', '국어', '수학'], '목요일': ['과학', '영어', '사회', '수학'], '금요일': ['국어'] };
const TT_MINSEO = { '월요일': ['국어', '수학'], '수요일': ['국어', '수학'], '목요일': ['국어', '수학'], '금요일': ['수학'] };
// KST 09:00 기준 (UTC 00:00). 2026-11-23 = 월요일
const at = (date, hhmm = '00:00') => Date.parse(`${date}T${hhmm}:00Z`);
const plan = (who, now, extra = {}) => TP.plan({ ...who, now, timetable: who === MINSU ? TT_MINSU : TT_MINSEO, history: null, voca: [], rooms: ROOMS, ...extra });

// 화면 스크립트를 가짜 브라우저 전역(이벤트·crypto·location)과 함께 싣는다
function pageScripts(files, store) {
  const sb = { console: { log() {}, info() {}, warn() {}, error() {} }, setTimeout, clearTimeout, Date, Math, JSON, URLSearchParams, Promise,
    crypto: globalThis.crypto, localStorage: store, location: { search: '', pathname: '/kids/subjects/korean/korean.html' },
    addEventListener() {}, removeEventListener() {}, dispatchEvent() {}, document: { getElementById: () => null, addEventListener() {}, createElement: () => ({ style: {} }), body: { appendChild() {} } },
    fetch: async () => ({ ok: true, json: async () => ({}) }) };
  sb.window = sb; sb.globalThis = sb;
  vm.createContext(sb);
  for (const file of files) vm.runInContext(read(file), sb, { filename: file });
  return sb;
}

function storage(init = {}) {
  const map = new Map(Object.entries(init));
  return { getItem: k => (map.has(k) ? map.get(k) : null), setItem: (k, v) => map.set(k, String(v)), removeItem: k => map.delete(k), map };
}
function vocaRecord(id, word, subject, stage, extra = {}) {
  return { id, word, meaning: `${word} 뜻`, subject: [subject], stage, target: ['민수'], mastery: '', isAchieved: false, ...extra };
}
const hex = n => n.toString(16).padStart(32, '0');
// 민수 3단계 레슨은 단원 항목 5개 이상일 때만 다시 보기로 데려간다(spec §15-4) — L9를 5개로 채우는 낱말 2개
const L9_MORE = [vocaRecord(hex(50), 'tree', '영어', 'L9'), vocaRecord(hex(51), 'river', '영어', 'L9')];
const dashed = id => `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`;

test('1. KST 날짜·요일: 자정 경계, 기기 시간대와 무관', () => {
  assert.equal(TP.kstDate(at('2026-11-23', '14:59')), '2026-11-23');
  assert.equal(TP.kstDate(at('2026-11-23', '15:00')), '2026-11-24');
  assert.equal(TP.kstWeekday(at('2026-11-23', '14:59')), 1);
  assert.equal(TP.kstWeekday(at('2026-11-23', '15:00')), 2);
  const a = plan(MINSU, at('2026-11-23', '14:59')), b = plan(MINSU, at('2026-11-23', '15:00'));
  assert.equal(a.date, '2026-11-23');
  assert.equal(b.date, '2026-11-24');
  // 다른 시간대의 Date 동작에 기대지 않는다: 같은 UTC 시각이면 같은 노선
  assert.deepEqual(plain(plan(MINSU, at('2026-11-23', '14:59'))), plain(a));
  assert.equal(TP.shiftDate('2026-03-01', -1), '2026-02-28');
});

test('2. 금→월, 주말은 금요일 과목·「이번 주 배운 것」', () => {
  const fri = TP.schoolDays(at('2026-11-27'));
  assert.deepEqual(plain(fri), { todayName: '금요일', nextName: '월요일', weekend: false });
  assert.deepEqual(plain(TP.schoolDays(at('2026-11-26'))), { todayName: '목요일', nextName: '금요일', weekend: false });
  for (const day of ['2026-11-28', '2026-11-29']) {
    assert.deepEqual(plain(TP.schoolDays(at(day))), { todayName: '금요일', nextName: '월요일', weekend: true });
    const r = plan(MINSU, at(day));
    assert.equal(r.stops[0].title, '이번 주 배운 것');
    assert.equal(r.stops[0].subject, 'korean'); // 민수 금요일 = 국어
    assert.ok(['english', 'math'].includes(r.stops[1].subject)); // 월요일 과목
  }
  const fr = plan(MINSU, at('2026-11-27'));
  assert.equal(fr.stops[0].subject, 'korean');
  assert.ok(['english', 'math'].includes(fr.stops[1].subject));
});

test('3. 비교과 필터: 맵과 정확히 같은 글자만', () => {
  for (const bad of ['도덕', '영어(L9)', '국어(용어방)', '용어사전', '공부', '국어 ', '데일리 루틴', '', null, 3]) assert.equal(TP.subjectKey(bad), null, String(bad));
  assert.equal(TP.subjectKey('국어'), 'korean');
  assert.equal(TP.subjectKey('haru'), 'haru');
  const r = TP.plan({ ...MINSU, now: at('2026-11-23'), timetable: { '월요일': ['영어(L9)', '도덕', '국어 '], '화요일': ['과학'] }, history: null, voca: [], rooms: ROOMS });
  assert.notEqual(r.stops[0].subject, null);
  assert.ok(MINSU.eligible.includes(r.stops[0].subject));
  assert.equal(r.stops[1].subject, 'science');
});

test('4. 민서는 사회·과학이 어느 정거장에도 오지 않는다', () => {
  const history = { visits: { korean: ['2026-11-20', '2026-11-21'], math: ['2026-11-21'], english: ['2026-11-19'], haru: ['2026-11-22'] },
    logs: [{ date: '2026-11-22', subject: '사회', items: { ['c:' + hex(1)]: [1, 1, 0, []] } }] };
  const voca = [hex(2), hex(3), hex(4)].map((id, i) => vocaRecord(id, `w${i}`, '과학', '1단원', { target: ['민서'], mastery: '9||2026-11-01' }));
  for (let d = 0; d < 14; d++) {
    const now = at('2026-11-23') + d * 86400000;
    for (const h of [null, history]) {
      const r = plan(MINSEO, now, { history: h, voca, timetable: { ...TT_MINSEO, '화요일': ['사회', '과학'] } });
      for (const s of r.stops) assert.ok(!['society', 'science'].includes(s.subject), `${r.date} ${s.n}번 ${s.subject}`);
    }
  }
});

test('5. 1·2·4번 과목은 서로 다르고 1·2번에 하루가 없다 (요일·아이·기록 전수)', () => {
  const histories = [null, { visits: {}, logs: [] }, { visits: { english: ['2026-11-20'], korean: ['2026-11-21', '2026-11-22'], haru: ['2026-11-18'] }, logs: [] }];
  for (const who of [MINSU, MINSEO]) {
    for (let d = 0; d < 21; d++) {
      for (const history of histories) {
        const r = plan(who, at('2026-11-23') + d * 86400000, { history });
        const [a, b, , c] = r.stops.map(s => s.subject);
        assert.ok(a && b && c, `${who.child} ${r.date} 빈 정거장`);
        assert.equal(new Set([a, b, c]).size, 3, `${who.child} ${r.date} ${a}/${b}/${c}`);
        assert.ok(a !== 'haru' && b !== 'haru', `${who.child} ${r.date} 1·2번 하루`);
        for (const s of r.stops) assert.ok(who.eligible.includes(s.subject), `${who.child} ${s.subject}`);
      }
    }
  }
  // 민서 수(국·수)→목(국)만: 1번 수학·2번 국어로 짝이 맞춰진다
  const r = plan(MINSEO, at('2026-11-25'), { timetable: { '수요일': ['국어', '수학'], '목요일': ['국어'] } });
  assert.deepEqual([r.stops[0].subject, r.stops[1].subject], ['math', 'korean']);
  // 오늘·다음 날 모두 국어만 → 2번은 「골고루 한 과목 맛보기」
  const same = plan(MINSEO, at('2026-11-25'), { timetable: { '수요일': ['국어'], '목요일': ['국어'] } });
  assert.equal(same.stops[0].subject, 'korean');
  assert.notEqual(same.stops[1].subject, 'korean');
  assert.equal(same.stops[1].detail, '골고루 한 과목 맛보기');
  // 오늘 교과 없음(민서 화요일) → 어휘 과목을 순위로 고른 뒤 짝
  const tue = plan(MINSEO, at('2026-11-24'), { history: { visits: { korean: ['2026-11-20'] }, logs: [] } });
  assert.equal(tue.stops[0].subject, 'english');
  assert.ok(['korean', 'math'].includes(tue.stops[1].subject));
});

test('6. 3번 대체 순서: 최근 오답 → 녹슨 왕관·은메달(민수) → 지난 단원', () => {
  const ids = [1, 2, 3, 4].map(hex);
  const voca = [
    vocaRecord(ids[0], 'minute', '영어', 'L9|복습'), vocaRecord(ids[1], 'lunch', '영어', 'L9'), vocaRecord(ids[2], 'sleep', '영어', 'L9'),
    vocaRecord(ids[3], 'alone', '영어', 'L5'), // L5는 1개뿐 → 데려가지 않음
    ...L9_MORE
  ];
  const today = '2026-11-25';
  // 어제는 g:·r:만, 그제 v: 오답 → 그제 것을 고른다
  const history = { visits: {}, logs: [
    { date: '2026-11-24', subject: '수학', items: { 'g:vm-add-2x2': [3, 2, 0, []], 'r:p1:0': [1, 1, 0, []] } },
    { date: '2026-11-23', subject: '영어', items: { ['v:' + ids[1]]: [2, 1, 0, []], ['v:' + ids[0]]: [3, 2, 1, []], ['v:' + ids[2]]: [1, 0, 0, []],
      ['v:' + ids[3]]: [5, 5, 0, []], ['v:' + hex(99)]: [9, 9, 0, []], 's:x:1': [4, 4, 0, []] } }
  ] };
  const r1 = plan(MINSU, at(today), { history, voca });
  assert.equal(r1.stops[2].source, 'wrong');
  assert.equal(r1.stops[2].subject, 'english');
  assert.deepEqual(r1.stops[2].keys, ['v:' + ids[0], 'v:' + ids[1]]); // 틀림 순, 틀림 0·L5·캐시 없음·s: 제외
  assert.equal(r1.stops[2].detail, '최근 헷갈린 낱말: minute · lunch');
  assert.equal(r1.stops[2].href, `quest_runner.html?subject=english&user=minsu&unit=L9&focus=${ids[0]}%7C${ids[1]}&tp=3`);
  // 민수: L9가 4개뿐이면(5개 미만) 다시 보기로 데려가지 않는다
  assert.notEqual(plan(MINSU, at(today), { history, voca: voca.filter(v => v.id !== hex(51)) }).stops[2].source, 'wrong');
  // 민서는 한입 레슨, 하이픈 있는 id도 같은 문항
  const vocaMinseo = voca.map(v => ({ ...v, id: dashed(v.id), target: ['공통'] }));
  const r1b = plan(MINSEO, at(today), { history, voca: vocaMinseo });
  assert.match(r1b.stops[2].href, /lesson=bite&focus=[0-9a-f]{32}%7C[0-9a-f]{32}&tp=3$/);
  // 사회 c: (민수) → 사회방 / 과학 c:는 제외
  const hc = { visits: {}, logs: [{ date: '2026-11-24', subject: '과학', items: { ['c:' + hex(7)]: [3, 3, 0, []] } },
    { date: '2026-11-24', subject: '사회', items: { ['c:' + hex(8)]: [1, 1, 0, []] } }] };
  const rc = plan(MINSU, at(today), { history: hc });
  assert.equal(rc.stops[2].subject, 'society');
  assert.equal(rc.stops[2].detail, '어제 헷갈린 자료 1개');
  assert.equal(rc.stops[2].href, 'kids/subjects/society/society.html?user=minsu&tp=3');
  // ② 녹슨 왕관·은메달 (isAchieved는 금메달로)
  const mastery = [
    vocaRecord(ids[0], 'a', '국어', '2단원', { isAchieved: true, mastery: '' }), // 금메달, lastReviewed 없음 → 녹슨
    vocaRecord(ids[1], 'b', '국어', '2단원', { mastery: '6|2026-11-20|2026-11-24' }), // 은메달 Lv3 도전
    vocaRecord(ids[2], 'c', '국어', '2단원', { mastery: '2||' })
  ];
  const r2 = plan(MINSU, at(today), { history: { visits: {}, logs: [] }, voca: mastery });
  assert.equal(r2.stops[2].source, 'mastery');
  assert.equal(r2.stops[2].detail, '녹슨 왕관 1개 닦기 · 은메달 1개');
  assert.match(r2.stops[2].href, /subject=korean&user=minsu&unit=2%EB%8B%A8%EC%9B%90&tp=3$/);
  // 민서는 ②를 건너뛴다 (한입 레슨은 왕관을 내지 않음)
  const r2b = plan(MINSEO, at(today), { history: { visits: {}, logs: [] }, voca: mastery.map(m => ({ ...m, target: ['민서'] })) });
  assert.equal(r2b.stops[2].source, 'recent');
  // ③ 최근 간 어휘 과목, 단원 없이
  const r3 = plan(MINSU, at(today), { history: { visits: { english: ['2026-11-20'], korean: ['2026-11-23'], math: ['2026-11-24'] }, logs: [] } });
  assert.equal(r3.stops[2].source, 'recent');
  assert.equal(r3.stops[2].subject, 'korean');
  assert.equal(r3.stops[2].href, 'quest_runner.html?subject=korean&user=minsu&tp=3');
  // 기록 없음 → ① 건너뜀
  assert.notEqual(plan(MINSU, at(today), { history: null, voca }).stops[2].source, 'wrong');
});

test('6b. 어휘 캐시가 늦게 오면 3번만 한 번 다시 고른다 (1·2·4번 그대로)', () => {
  const ids = [1, 2, 3].map(hex);
  const voca = [vocaRecord(ids[0], 'minute', '영어', 'L9'), vocaRecord(ids[1], 'lunch', '영어', 'L9'), vocaRecord(ids[2], 'sleep', '영어', 'L9'), ...L9_MORE];
  const history = { visits: { english: ['2026-11-24'] }, logs: [{ date: '2026-11-24', subject: '영어', items: { ['v:' + ids[0]]: [2, 1, 0, ['x']], ['v:' + ids[1]]: [1, 0, 0, []], 'g:vm-add-1x1': [1, 1, 0, []] } }] };
  const first = plan(MINSU, at('2026-11-25'), { history, voca: [] });
  assert.equal(first.stops[2].source, 'recent');
  assert.deepEqual(plain(first.reviewPending.logs), [{ date: '2026-11-24', subject: '영어', items: { ['v:' + ids[0]]: [2, 1] } }]);
  assert.equal(TP.refreshReview(first, { childKey: 'minsu', eligible: MINSU.eligible, rooms: ROOMS, voca: [] }), null);
  const next = TP.refreshReview(first, { childKey: 'minsu', eligible: MINSU.eligible, rooms: ROOMS, voca });
  assert.equal(next.stops[2].source, 'wrong');
  assert.equal(next.stops[2].detail, '어제 헷갈린 낱말: minute');
  assert.equal(next.reviewPending, undefined);
  for (const i of [0, 1, 3]) assert.deepEqual(plain(next.stops[i]), plain(first.stops[i]));
  // 캐시가 처음부터 있으면 남기지 않는다. 민서는 v: 오답이 없으면 남기지 않고, 민수는 녹슨 왕관·은메달 때문에 남긴다
  assert.equal(plan(MINSU, at('2026-11-25'), { history, voca }).reviewPending, undefined);
  assert.equal(plan(MINSEO, at('2026-11-25'), { history: { visits: {}, logs: [] }, voca: [] }).reviewPending, undefined);
  const minsuLate = plan(MINSU, at('2026-11-25'), { history: { visits: {}, logs: [] }, voca: [] });
  assert.ok(minsuLate.reviewPending);
  const crowns = [1, 2, 3].map(i => vocaRecord(hex(10 + i), 'w' + i, '국어', '3단원', { isAchieved: true }));
  assert.equal(TP.refreshReview(minsuLate, { childKey: 'minsu', eligible: MINSU.eligible, rooms: ROOMS, voca: crowns }).stops[2].source, 'mastery');
  assert.equal(plan(MINSU, at('2026-11-25'), { history: null, voca: [] }).reviewPending, undefined);
});

test('6c. 같은 날 두 일지 행의 같은 문항은 한 번만, 지난 단원은 마지막 방문 순(동점은 순위)', () => {
  const ids = [1, 2, 3].map(hex);
  const voca = [vocaRecord(ids[0], 'minute', '영어', 'L9'), vocaRecord(ids[1], 'lunch', '영어', 'L9'), vocaRecord(ids[2], 'sleep', '영어', 'L9'), ...L9_MORE];
  const k = 'v:' + ids[0];
  const history = { visits: {}, logs: [
    { date: '2026-11-24', subject: '영어', items: { [k]: [1, 1, 0, []], ['v:' + ids[1]]: [3, 1, 0, []] } },
    { date: '2026-11-24', subject: '영어(L9)', items: { [k]: [2, 1, 0, []] } }
  ] };
  const r = plan(MINSU, at('2026-11-25'), { history, voca });
  assert.deepEqual(r.stops[2].keys, [k, 'v:' + ids[1]]); // minute 틀림 2로 합쳐 맨 앞, 중복 없음
  assert.equal(r.stops[2].detail, '어제 헷갈린 낱말: minute · lunch');
  // 국어·영어를 같은 날 다녀왔으면 순위(덜 간 과목) 쪽, 마지막 방문이 늦은 과목이 우선
  const tie = plan(MINSU, at('2026-11-25'), { history: { visits: { korean: ['2026-11-20', '2026-11-24'], english: ['2026-11-24'] }, logs: [] } });
  assert.equal(tie.stops[2].subject, 'english');
  const later = plan(MINSU, at('2026-11-25'), { history: { visits: { korean: ['2026-11-24'], english: ['2026-11-22'] }, logs: [] } });
  assert.equal(later.stops[2].subject, 'korean');
  // 빈 eligible이어도 undefined 대신 null
  const empty = TP.plan({ child: '민수', childKey: 'minsu', now: at('2026-11-25'), timetable: {}, eligible: [], history: null, voca: [], rooms: ROOMS });
  assert.equal(empty.stops[0].subject, null);
});

test('7. 숙련도 3함수는 quest-mastery.js와 같은 결과', () => {
  const today = '2026-11-23';
  const texts = [''];
  for (let c = 0; c <= 10; c++) for (const s of ['', '2026-11-22', today]) for (const r of ['', '2026-11-22', '2026-11-21', '2026-11-01']) texts.push(`${c}|${s}|${r}`);
  texts.push('abc', '6|', ' 9 | 2026-11-20 |2026-11-20 ');
  for (const text of texts) {
    const a = TP.parseMastery(text), b = QM.parseMastery(text);
    assert.deepEqual(plain(a), plain(b), text);
    assert.equal(TP.isRusty(a, today), QM.isRusty(b, today), `rusty ${text}`);
    assert.equal(TP.isLv3Eligible(a, today), QM.isLv3Eligible(b, today), `lv3 ${text}`);
  }
  assert.equal(TP.masteryOf({ mastery: '3||', isAchieved: true }).c, 9);
});

test('8. 4번 순위: 안 간 과목 → 오래전 방문 → 날짜 회전', () => {
  const history = { visits: { science: ['2026-11-20'], society: ['2026-11-18'], haru: ['2026-11-19', '2026-11-20'] }, logs: [] };
  // 월요일: 1·2번이 영어·수학·국어 / 과학·사회·국어 중에서 정해진 뒤 남은 것 중 안 간 과목
  const r = plan(MINSU, at('2026-11-23'), { history: { ...history, visits: { ...history.visits, english: ['2026-11-21'], math: ['2026-11-21'], korean: ['2026-11-21'] } } });
  const used = new Set([r.stops[0].subject, r.stops[1].subject]);
  const rest = MINSU.eligible.filter(k => !used.has(k));
  assert.equal(r.stops[3].subject, TP.rank(rest, { visits: { ...history.visits, english: ['2026-11-21'], math: ['2026-11-21'], korean: ['2026-11-21'] } })[0]);
  assert.deepEqual(TP.rank(['science', 'society', 'haru', 'english'], history), ['english', 'society', 'science', 'haru']);
  // 기록이 없으면 날짜마다 돌림 칸이 바뀐다
  const seen = new Set();
  for (let d = 0; d < 7; d++) seen.add(plan(MINSEO, at('2026-11-23') + d * 86400000).stops[3].subject);
  assert.ok(seen.size >= 2, [...seen].join(','));
});

test('9. 노선 고정·조회 실패 노선 한 번 보정·부모 저장 안 함', () => {
  const st = storage();
  const r = plan(MINSU, at('2026-11-23'));
  assert.equal(r.provisional, true);
  TP.saveRoute(st, '민수', r);
  assert.deepEqual(plain(TP.loadRoute(st, '민수', '2026-11-23')), plain(r));
  assert.equal(TP.loadRoute(st, '민수', '2026-11-24'), null);
  assert.equal(TP.shouldReplan(r, [false, false, false, false]), true);
  assert.equal(TP.shouldReplan(r, [false, true, false, false]), false);
  assert.equal(TP.shouldReplan({ ...r, retried: true }, [false, false, false, false]), false);
  assert.equal(TP.shouldReplan({ ...r, provisional: false }, []), false);
  assert.equal(TP.isParentSession(storage({ currentUserName: '엄마' })), true);
  assert.equal(TP.isParentSession(storage({ currentUserName: '민서' })), false);
  st.setItem(TP.ROUTE_PREFIX + '민수', '{깨짐');
  assert.equal(TP.loadRoute(st, '민수', '2026-11-23'), null);
});

test('10. 완료 장부: tp는 그 정거장에만, 맵 밖·부모·날짜 바뀜', () => {
  const now = at('2026-11-23');
  const route = { stops: [{ n: 1, subject: 'english' }, { n: 2, subject: 'math' }, { n: 3, subject: 'english' }, { n: 4, subject: 'haru' }] };
  const st = storage({ currentUserName: '민수', currentChild: 'minsu' });
  // 3번(tp=3)으로 들어가 푼 영어 레슨은 1번 영어를 켜지 않는다
  assert.equal(TP.markDone({ subject: 'english', kind: 'lesson' }, { storage: st, now, search: '?subject=english&tp=3' }), true);
  let ledger = TP.readLedger(st, '민수', '2026-11-23');
  assert.deepEqual(plain(TP.doneState(route, ledger, false)), [false, false, true, false]);
  assert.equal(TP.markDone({ subject: '영어', kind: 'lesson' }, { storage: st, now, search: '' }), true);
  assert.equal(TP.markDone({ subject: '수학', kind: 'story' }, { storage: st, now, search: '' }), true);
  ledger = TP.readLedger(st, '민수', '2026-11-23');
  assert.deepEqual(plain(TP.doneState(route, ledger, true)), [true, true, true, true]);
  // 1번은 lesson만
  assert.deepEqual(plain(TP.doneState(route, { s: { english: ['quiz'] }, tp: [] }, false)), [false, false, false, false]);
  // 맵 밖 과목·kind 무시
  assert.equal(TP.markDone({ subject: '국어(용어방)', kind: 'quiz' }, { storage: st, now }), false);
  assert.equal(TP.markDone({ subject: '국어', kind: 'play' }, { storage: st, now }), false);
  // 부모 시뮬레이터: child를 넘겨도 기록 안 함
  const parent = storage({ currentUserName: '아빠', currentChild: 'minseo' });
  assert.equal(TP.markDone({ child: '민서', subject: '국어', kind: 'lesson' }, { storage: parent, now }), false);
  assert.equal(parent.map.size, 2);
  // 아이 판별: 키·이름·저장값
  const kid = storage({ currentUser: 'daughter' });
  assert.equal(TP.markDone({ subject: 'korean', kind: 'reading' }, { storage: kid, now, search: '' }), true);
  assert.deepEqual(plain(TP.readLedger(kid, '민서', '2026-11-23').s), { korean: ['reading'] });
  // 날짜가 바뀐 장부는 무시
  assert.deepEqual(plain(TP.readLedger(st, '민수', '2026-11-24')), { date: '2026-11-24', s: {}, tp: [] });
});

test('11. 연결 지점: 과목방 퀴즈 완주는 괄호 과목 대신 currentSubject, 나머지는 한 줄씩', async () => {
  const st = storage({ currentUserName: '민수', currentChild: 'minsu' });
  const sandbox = pageScripts(['kids/core/today-path.js', 'kids/core/mission-reward-engine.js'], st);
  sandbox.currentSubject = '국어';
  sandbox.initQuizRewardSession('voca');
  await sandbox.finalizeQuizRewardSession({ isFullComplete: true, subject: '국어(용어방)' });
  const today = TP.kstDate(Date.now());
  assert.deepEqual(plain(TP.readLedger(st, '민수', today).s), { korean: ['quiz'] });
  // 완주가 아니면 기록 없음
  sandbox.currentSubject = '영어';
  sandbox.initQuizRewardSession('voca');
  await sandbox.finalizeQuizRewardSession({ isFullComplete: false, subject: '영어(L9)' });
  assert.deepEqual(plain(TP.readLedger(st, '민수', today).s), { korean: ['quiz'] });
  // TodayPath가 없어도 오류 없음
  const bare = pageScripts(['kids/core/mission-reward-engine.js'], storage({ currentUserName: '민수' }));
  bare.initQuizRewardSession('voca');
  await bare.finalizeQuizRewardSession({ isFullComplete: true, subject: '국어' });
  // 한 줄 연결 (원문 확인)
  const hooks = [
    ['kids/subjects/quest/quest-lesson-ui.js', /root\.TodayPath\?\.markDone\(\{ child, subject: subj, kind: 'lesson' \}\)/],
    ['kids/subjects/quest/quest-runner.js', /global\.TodayPath\?\.markDone\(\{ child: isMinseo \? 'minseo' : 'minsu', subject: currentSubj, kind: 'lesson' \}\)/],
    ['kids/js/society_common.js', /activeQuizIdx >= activeSectionData\.length\) \{\r?\n\s+window\.TodayPath\?\.markDone\(\{ subject: '사회', kind: 'quiz' \}\)/],
    ['kids/js/storybook_engine.js', /window\.TodayPath\?\.markDone\(\{ child: childName, subject, kind: 'story' \}\)/],
    ['kids/core/reading_engine.js', /window\.TodayPath\?\.markDone\(\{ subject: activeSubject, kind: 'reading' \}\)/],
    ['kids/js/korean_mini_reading.js', /finished = true;\r?\n\s+window\.TodayPath\?\.markDone\(\{ subject: '국어', kind: 'reading' \}\)/]
  ];
  for (const [file, re] of hooks) assert.match(read(file), re, file);
  assert.doesNotMatch(read('kids/core/notion-reward-quiz.js'), /TodayPath/);
});

test('12. 학습일지 조회: 정렬·쪽 넘김·실패/시간 초과는 null, 행 나누기는 리포트와 같음', async () => {
  const calls = [];
  const sandboxFor = fetchImpl => {
    const sb = { console, setTimeout, clearTimeout, Date, JSON, URLSearchParams, AbortController, Promise,
      fetch: fetchImpl, localStorage: storage(), document: { getElementById: () => null }, addEventListener() {},
      APP_CONFIG: { WORKER_PROXY_URL: 'https://w.example', STUDY_LOG_DB_ID: 'db1' } };
    sb.window = sb; sb.TodayPath = TP;
    vm.createContext(sb);
    vm.runInContext(read('kids/js/lobby_today_path.js'), sb);
    return sb;
  };
  const ok = sandboxFor(async (url, opts) => {
    const body = JSON.parse(opts.body);
    calls.push(body);
    return { ok: true, json: async () => (body.start_cursor ? { results: [{ id: 2 }], has_more: false } : { results: [{ id: 1 }], has_more: true, next_cursor: 'c2' }) };
  });
  const pages = await ok.LobbyTodayPath.queryStudyLog('민수', '2026-11-23', Date.now() + 2000);
  assert.deepEqual(plain(pages), [{ id: 1 }, { id: 2 }]);
  assert.deepEqual(plain(calls[0].sorts), [{ property: '입장', direction: 'descending' }]);
  assert.deepEqual(plain(calls[0].filter.and), [{ property: '학생', select: { equals: '민수' } }, { property: '입장', date: { on_or_after: '2026-11-15' } }]);
  assert.equal(calls[1].start_cursor, 'c2');
  const failSecond = sandboxFor(async (url, opts) => (JSON.parse(opts.body).start_cursor
    ? { ok: false, json: async () => ({}) } : { ok: true, json: async () => ({ results: [{ id: 1 }], has_more: true, next_cursor: 'x' }) }));
  assert.equal(await failSecond.LobbyTodayPath.queryStudyLog('민수', '2026-11-23', Date.now() + 2000), null);
  const slow = sandboxFor((url, opts) => new Promise((resolve, reject) => opts.signal.addEventListener('abort', () => reject(new Error('abort')))));
  assert.equal(await slow.LobbyTodayPath.queryStudyLog('민수', '2026-11-23', Date.now() + 50), null);

  // 행 나누기: 리포트(splitLogRows)와 같은 분류
  const rt = text => ({ rich_text: [{ plain_text: text }] });
  const row = (id, subject, start, extra = {}) => ({ properties: { ID: { title: [{ plain_text: id }] }, '과목': rt(subject), '입장': { date: { start } },
    '학생': { select: { name: '민수' } }, '활동측정': rt(''), '문항기록': rt(''), ...extra } });
  const enc = obj => JSON.stringify(obj);
  const sample = [
    row('학습활동_a', '영어', '2026-11-22T10:00:00+09:00'),
    row('x', '국어', '2026-11-21T23:30:00+09:00', { '활동측정': rt('{"v":3}') }),
    row('민수_2026-11-22_영어', '영어', '2026-11-22T11:00:00+09:00', { '문항기록': rt(enc({ v: 1, i: { ['v:' + hex(1)]: [1, 1, 0, ''] }, b: [] })) }),
    row('민수_2026-11-20_국어(용어_1)', '국어(용어_1)', '2026-11-20T09:00:00+09:00', { '문항기록': rt('{깨짐') }),
    row('학습활동_b', '용어사전', '2026-11-22T12:00:00+09:00'),
    row('학습활동_c', '수학', '2026-11-23T08:00:00+09:00'), // 오늘 → 제외
    row('학습활동_d', '수학', '2026-11-15T08:00:00+09:00') // 8일 전 → 제외
  ];
  const decode = text => { try { const o = JSON.parse(text); return o.v === 1 ? o : null; } catch { return null; } };
  const h = TP.historyFromPages(sample, '2026-11-23', decode);
  assert.deepEqual(plain(h.visits), { english: ['2026-11-22'], korean: ['2026-11-21'] });
  assert.equal(h.logs.length, 1);
  assert.equal(h.logs[0].date, '2026-11-22');
  const split = splitLogRows(sample, '2026-11-16', '2026-11-22');
  const ids = list => list.map(p => p.properties.ID.title[0].plain_text).sort();
  assert.deepEqual(ids(split.activity), ['x', '학습활동_a', '학습활동_b']);
  assert.ok(ids(split.daily).includes('민수_2026-11-22_영어'));
});

test('13. getSubjectsForDay: 등록 시간표 정확 일치·교시 순, 학생 행이 없을 때만 기본 시간표', () => {
  const rows = [
    { child: '민서', dayOfWeek: '월요일', subject: '수학', periodNum: 4 },
    { child: '민서', dayOfWeek: '월요일', subject: '국어', periodNum: 3 },
    { child: '민서', dayOfWeek: '월요일', subject: '약속', periodNum: 1 },
    { child: '민서', dayOfWeek: '월요일', subject: '국어(읽기)', periodNum: 5 },
    { child: '민서', dayOfWeek: '월요일', subject: '국어', periodNum: 6 },
    { child: '민서, 민수', dayOfWeek: '화요일', subject: '영어', periodNum: 1 }
  ];
  const st = storage({ MINMIN_TIMETABLE_CACHE_V11: JSON.stringify({ staticRows: rows, overlayRows: [], allRows: rows }), currentUserName: '민서' });
  const { sandbox } = loadBrowserScripts(['kids/core/timetable-boost.js'], { storage: st });
  const TB = sandbox.TimetableBoost;
  assert.deepEqual(plain(TB.getSubjectsForDay('민서', '월요일')), ['국어', '수학']);
  assert.deepEqual(plain(TB.getSubjectsForDay('민서', '화요일')), []); // 등록 시간표에 그날 교과 없음
  // 캐시에 민수 행이 없으면 기본 시간표
  assert.deepEqual(plain(TB.getSubjectsForDay('민수', '금요일')), ['국어']);
  // 캐시가 없으면 민서 확정 기본 시간표 (화 없음, 금 수학)
  const empty = loadBrowserScripts(['kids/core/timetable-boost.js'], { storage: storage() }).sandbox.TimetableBoost;
  assert.deepEqual(plain(empty.getSubjectsForDay('민서', '화요일')), []);
  assert.deepEqual(plain(empty.getSubjectsForDay('민서', '금요일')), ['수학']);
  assert.deepEqual(plain(empty.getSubjectsForDay('민서', '목요일')), ['국어', '수학']);
  // 기존 출력 계약: 주말 todaySubjects는 빈 배열, 키 모양 그대로
  const out = empty.getTimetableSubjects('민수');
  assert.deepEqual(Object.keys(out).sort(), ['isWeekend', 'todayName', 'todaySubjects', 'tomorrowName', 'tomorrowSubjects']);
  if (out.isWeekend) assert.deepEqual(plain(out.todaySubjects), []);
});

test('10b. 프로필이 하나도 없으면 null, 재귀 없음', () => {
  const now = at('2026-11-23');
  const empty = storage();
  assert.equal(TP.childNameOf(undefined, empty), null);
  assert.equal(TP.childNameOf('', empty), null);
  assert.equal(TP.childNameOf(null, empty), null);
  assert.equal(TP.childNameOf(undefined, storage({ currentUserName: '아빠' })), null);
  assert.equal(TP.markDone({ subject: 'korean', kind: 'reading' }, { storage: empty, now, search: '' }), false);
  assert.equal(empty.map.size, 0);
  // 저장값이 아이 키가 아니어도 null (한 번만 더 본다)
  assert.equal(TP.childNameOf(undefined, storage({ currentChild: 'guest' })), null);
  assert.equal(TP.childNameOf(undefined, storage({ currentUser: 'son' })), '민수');
});

test('14. 싣기: 같은 버전 문자열, 로비 세 태그 연속 유지', () => {
  const version = /today-path\.js\?v=([\w-]+)/;
  const lobby = read('lobby.html'), helper = read('kids/core/notion-helper.js'), runner = read('quest_runner.html'), story = read('kids/js/storybook_engine.js');
  const v = lobby.match(version)[1];
  for (const [name, src] of [['notion-helper', helper], ['quest_runner', runner], ['storybook_engine', story]]) assert.equal(src.match(version)[1], v, name);
  assert.ok(lobby.indexOf('today-path.js') < lobby.indexOf('lobby_config.js'));
  assert.ok(lobby.indexOf('lobby_today_path.js') < lobby.indexOf('lobby_config.js'));
  assert.ok(runner.indexOf('today-path.js') < runner.indexOf('quest-runner.js'));
  assert.match(lobby, /<div id="todayPathMinseo"[^>]*hidden><\/div>/);
  assert.match(lobby, /<div id="todayPathMinsu" hidden><\/div>/);
  for (const file of ['kids/core/today-path.js', 'kids/js/lobby_today_path.js']) assert.ok(read(file).split('\n').length < 600, file);
  // 순수 모듈에는 includes 과목 추론·toISOString 날짜가 없다
  const src = read('kids/core/today-path.js');
  assert.doesNotMatch(src, /toISOString|\.split\('T'\)/);
});
