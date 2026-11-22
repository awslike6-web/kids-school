import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

import {
  kstDate,
  parseArgs,
  subjectGroup,
  splitLogRows,
  usageSummary,
  decodeItems,
  mergeItemRecords,
  itemSummary,
  stuckItems,
  mathTypeTable,
  masterySummary,
  fieldUsage,
  renderMarkdown,
  resolveKeyNames,
} from '../scripts/study_usage_report.mjs';

const require = createRequire(import.meta.url);
const { measuredMinutes } = require('../kids/core/study-activity.js');
const QM = require('../kids/subjects/quest/quest-mastery.js');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHILDREN = ['민수', '민서'];
const SUBJECTS = {
  [CHILDREN[0]]: ['국어', '수학', '영어', '사회', '과학', '하루', '용어사전'],
  [CHILDREN[1]]: ['국어', '수학', '영어', '하루', '용어사전'],
};

// KST 시각 문자열을 epoch ms로 변환
const kstMs = (isoKst) => new Date(`${isoKst}+09:00`).getTime();

// 리치 텍스트 조각 배열 생성
const rt = (...parts) => ({
  rich_text: parts.map((text) => ({ plain_text: text })),
});

const titleProp = (text) => ({ title: [{ plain_text: text }] });

// 가짜 학습일지 페이지 생성
function makeLogPage({ id = 'p1', logId, student, subject, enter, exit, act = '', items = '' }) {
  return {
    id,
    properties: {
      ID: titleProp(logId),
      학생: { select: student ? { name: student } : null },
      과목: rt(subject),
      입장: { date: enter ? { start: `${enter}+09:00` } : null },
      퇴장: { date: exit ? { start: `${exit}+09:00` } : null },
      활동측정: act ? rt(act) : { rich_text: [] },
      문항기록: Array.isArray(items) ? rt(...items) : (items ? rt(items) : { rich_text: [] }),
    },
  };
}

// 가짜 어휘 페이지 생성
function makeVocaPage({ id, word, subjects, students, mastery }) {
  return {
    id,
    properties: {
      단어: titleProp(word),
      과목: { multi_select: subjects.map((name) => ({ name })) },
      학생: { multi_select: students.map((name) => ({ name })) },
      숙련도: rt(mastery),
    },
  };
}

// 가짜 인벤토리 페이지 생성
function makeInvPage(child, fields) {
  return {
    id: `inv-${child}`,
    properties: {
      이름: titleProp(child),
      학습설정: rt(...fields.학습설정),
      월드기록: rt(...fields.월드기록),
      런너기록: rt(...fields.런너기록),
    },
  };
}

// 실제 앱 learning-log.js를 vm 샌드박스에 적재
function loadAppDecode() {
  const filePath = path.resolve(__dirname, '../kids/core/learning-log.js');
  const code = fs.readFileSync(filePath, 'utf8');
  const sandbox = {
    window: null,
    localStorage: { getItem: () => null, setItem: () => {} },
    console,
    setTimeout,
    Date,
    Math,
    JSON,
  };
  sandbox.window = sandbox;
  vm.runInNewContext(code, sandbox, { filename: filePath });
  return sandbox.LearningLog.decode;
}

test('1. parseArgs: 기본값, 옵션 파싱, 잘못된 입력 오류', () => {
  const def = parseArgs([], '2026-11-22');
  assert.equal(def.until, '2026-11-22');
  assert.equal(def.days, 30);
  assert.match(def.since, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(def.fast, false);
  assert.equal(def.save, false);
  assert.equal(def.top, 10);

  const opts = parseArgs(
    ['--since', '2026-11-01', '--until', '2026-11-20', '--child', CHILDREN[0], '--fast', '--save', '--top', '5'],
    '2026-11-22',
  );
  assert.equal(opts.since, '2026-11-01');
  assert.equal(opts.until, '2026-11-20');
  assert.deepEqual(opts.children, [CHILDREN[0]]);
  assert.equal(opts.fast, true);
  assert.equal(opts.save, true);
  assert.equal(opts.top, 5);

  assert.throws(() => parseArgs(['--since', '2026-13-40'], '2026-11-22'));
  assert.throws(() => parseArgs(['--child', '없는아이'], '2026-11-22'));
});

test('2. splitLogRows: 측정/일지 분류, 관리자 제외, KST 기간 필터', () => {
  const actJson = JSON.stringify({ v: 3, id: 'u1', kind: 'quiz', ranges: [[1000, 61000]] });
  const pages = [
    // ID가 학습활동_이면 활동측정이 비어도 측정 행
    makeLogPage({ id: 'a1', logId: '학습활동_1', student: CHILDREN[0], subject: '국어', enter: '2026-11-20T00:10:00' }),
    // 활동측정 칸이 채워진 측정 행
    makeLogPage({ id: 'a2', logId: '국어_1', student: CHILDREN[0], subject: '국어', enter: '2026-11-20T10:00:00', act: actJson }),
    // 일지 행
    makeLogPage({ id: 'd1', logId: '수학_1', student: CHILDREN[1], subject: '수학(연산)', enter: '2026-11-20T23:50:00' }),
    // 관리자 행 제외
    makeLogPage({ id: 'adm', logId: '국어_adm', student: '부모관리자', subject: '국어', enter: '2026-11-20T12:00:00' }),
    // KST 기준 기간 밖 행 제외 (하루 앞뒤 여유분)
    makeLogPage({ id: 'out1', logId: '학습활동_0', student: CHILDREN[0], subject: '국어', enter: '2026-11-18T23:59:00' }),
    makeLogPage({ id: 'out2', logId: '국어_2', student: CHILDREN[0], subject: '국어', enter: '2026-11-22T00:01:00' }),
  ];

  assert.equal(kstDate(kstMs('2026-11-20T00:30:00')), '2026-11-20');
  assert.equal(subjectGroup('국어(미니독해_01)'), '국어');

  const res = splitLogRows(pages, '2026-11-19', '2026-11-21');
  assert.equal(res.activity.length, 2);
  assert.equal(res.daily.length, 1);
  assert.equal(res.daily[0].id, 'd1');
});

test('3. usageSummary: 전체·과목별 측정 시간, 공부한 날, 0분 과목', () => {
  const t0 = kstMs('2026-11-20T10:00:00');
  const t1 = kstMs('2026-11-21T10:00:00');
  const actKor = JSON.stringify({
    v: 3,
    id: 'k1',
    kind: 'quiz',
    ranges: [[t0, t0 + 90000], [t0 + 90000, t0 + 180000]],
  });
  // 국어와 일부 겹치는 수학 구간
  const actMath = JSON.stringify({
    v: 3,
    id: 'm1',
    kind: 'quiz',
    ranges: [[t0 + 60000, t0 + 150000], [t1, t1 + 60000]],
  });

  const activityPages = [
    makeLogPage({
      id: 'p1',
      logId: '학습활동_k',
      student: CHILDREN[0],
      subject: '국어(독해)',
      enter: '2026-11-20T09:59:00',
      exit: '2026-11-20T10:10:00',
      act: actKor,
    }),
    makeLogPage({
      id: 'p2',
      logId: '학습활동_m',
      student: CHILDREN[0],
      subject: '수학(연산)',
      enter: '2026-11-20T09:59:00',
      exit: '2026-11-21T10:05:00',
      act: actMath,
    }),
  ];

  const dates = ['2026-11-20', '2026-11-21'];
  const summary = usageSummary(activityPages, CHILDREN, dates, measuredMinutes);
  const c1 = summary[CHILDREN[0]];
  const c2 = summary[CHILDREN[1]];

  assert.equal(c1.days, 2);
  assert.equal(c1.totalMin, 4);
  assert.equal(c1.subjects['국어'].min, 3);
  assert.equal(c1.subjects['수학'].min, 2); // 날짜마다 분 단위로 버림: 20일 90초 → 1분, 21일 60초 → 1분
  assert.equal(c1.subjects['국어'].rows, 1);
  assert.ok(c1.zeroSubjects.includes('사회'));
  assert.ok(c1.zeroSubjects.includes('과학'));
  // 민서는 사회·과학을 보관함에 두므로 0분 과목에서 제외
  assert.equal(c2.days, 0);
  assert.deepEqual(c2.zeroSubjects, SUBJECTS[CHILDREN[1]]);
});

test('4. decodeItems·mergeItemRecords·itemSummary: 앱 대조 및 합산', () => {
  const appDecode = loadAppDecode();
  const samples = [
    '',
    '   ',
    '{broken',
    '[]',
    '{"v":2,"i":{}}',
    '{"v":1,"i":"bad"}',
    '{"v":1,"i":{"v:w1":[2,1,1,"오답"]},"b":[1]}',
  ];
  for (const s of samples) {
    // 앱 decode는 vm 샌드박스 객체라 원형이 달라 JSON 왕복으로 비교한다
    assert.deepEqual(JSON.parse(JSON.stringify(decodeItems(s))), JSON.parse(JSON.stringify(appDecode(s))));
  }

  const dailyPages = [
    makeLogPage({
      id: 'd1',
      logId: '국어_1',
      student: CHILDREN[0],
      subject: '국어(어휘)',
      enter: '2026-11-19T15:00:00',
      items: JSON.stringify({ v: 1, i: { 'v:w1': [2, 1, 1, '오답A'], 'c:p1': [1, 0, 0] } }),
    }),
    makeLogPage({
      id: 'd2',
      logId: '국어_2',
      student: CHILDREN[0],
      subject: '국어(독해)',
      enter: '2026-11-20T15:00:00',
      items: JSON.stringify({ v: 1, i: { 'v:w1': [1, 1, 0, '오답B|오답C'], 'r:u1 #1': [1, 0, 1] } }),
    }),
    makeLogPage({
      id: 'd3',
      logId: '국어_3',
      student: CHILDREN[0],
      subject: '국어',
      enter: '2026-11-20T16:00:00',
      items: '{broken_json',
    }),
  ];

  const { merged, broken } = mergeItemRecords(dailyPages, decodeItems);
  assert.equal(broken, 1);
  assert.deepEqual(merged[CHILDREN[0]]['국어']['v:w1'], [3, 2, 1, ['오답B', '오답C']]);

  const sum = itemSummary(merged);
  const kor = sum[CHILDREN[0]]['국어'];
  assert.equal(kor.items, 3);
  assert.equal(kor.tries, 5);
  assert.equal(kor.wrong, 2);
  assert.equal(kor.hints, 2);
  assert.ok(Math.abs(kor.firstTryRate - 0.6) < 1e-9);
  assert.ok(Math.abs(kor.hintRate - 0.4) < 1e-9);
  assert.equal(kor.prefixes.v, 1);
  assert.equal(kor.prefixes.c, 1);
  assert.equal(kor.prefixes.r, 1);
});

test('5. stuckItems·mathTypeTable: 정렬, Top N, g: 유형별 정답률', () => {
  const merged = {
    [CHILDREN[0]]: {
      수학: {
        'g:add-2x2': [4, 1, 0, ['12']],
        'g:mul-3x1': [3, 2, 1, ['99']],
        's:book-1': [5, 2, 0, ['A']],
        's:easy-1': [1, 0, 0, []],
      },
    },
  };

  const stuck = stuckItems(merged, 2);
  const list = stuck[CHILDREN[0]]['수학'];
  assert.equal(list.length, 2);
  // 틀림 수 2 동률이면 틀림 비율(2/3 > 2/5) 우선
  assert.equal(list[0].key, 'g:mul-3x1');
  assert.equal(list[1].key, 's:book-1');
  assert.ok(!list.some((x) => x.key === 's:easy-1'));

  const table = mathTypeTable(merged)[CHILDREN[0]];
  assert.equal(table.length, 2);
  const mul = table.find((r) => r.type === 'mul-3x1');
  assert.equal(mul.tries, 3);
  assert.equal(mul.wrong, 2);
  assert.ok(Math.abs(mul.rate - 1 / 3) < 1e-9);
});

test('6. masterySummary: 은·금·녹슨 왕관, 기간 필터, 공통 묶음', () => {
  const today = '2026-11-22';
  const vocaPages = [
    // 민수 단독: 은메달(6), 최근 학습
    makeVocaPage({ id: 'v1', word: '단어1', subjects: ['국어'], students: [CHILDREN[0]], mastery: '6|2026-11-10|2026-11-20' }),
    // 민수 단독: 금메달(9) + 오래돼 녹슨 왕관
    makeVocaPage({ id: 'v2', word: '단어2', subjects: ['국어'], students: [CHILDREN[0]], mastery: '9|2026-10-01|2026-11-05' }),
    // 공통 행: 공통 묶음으로만 집계
    makeVocaPage({ id: 'v3', word: '단어3', subjects: ['영어'], students: ['공통'], mastery: '6|2026-11-15|2026-11-19' }),
    // 두 아이 모두 지정: 공통 묶음으로만 집계
    makeVocaPage({ id: 'v4', word: '단어4', subjects: ['영어'], students: CHILDREN, mastery: '3||2026-11-18' }),
    // 기간 밖 lastReviewed 제외
    makeVocaPage({ id: 'v5', word: '단어5', subjects: ['국어'], students: [CHILDREN[1]], mastery: '9|2026-09-01|2026-10-01' }),
  ];

  const res = masterySummary(vocaPages, '2026-11-01', '2026-11-22', today, QM);
  assert.equal(res[CHILDREN[0]]['국어'].n, 2);
  assert.equal(res[CHILDREN[0]]['국어'].silver, 2);
  assert.equal(res[CHILDREN[0]]['국어'].gold, 1);
  assert.equal(res[CHILDREN[0]]['국어'].rusty, 1);
  assert.equal(res['공통']['영어'].n, 2);
  assert.equal(res[CHILDREN[0]]['영어'], undefined);
  assert.equal(res[CHILDREN[1]]?.['국어'], undefined); // 기간 밖 행뿐이라 민서 묶음 자체가 없다
});

test('7. fieldUsage: UTF-16 길이·조각 수, 60% 경고, 최장 문항기록', () => {
  const invPages = [
    makeInvPage(CHILDREN[0], {
      학습설정: ['a'.repeat(800), 'b'.repeat(500)],
      월드기록: ['w'.repeat(900)],
      런너기록: ['r'.repeat(1200)],
    }),
  ];
  const dailyPages = [
    makeLogPage({ id: 'd1', logId: '국어_1', student: CHILDREN[0], subject: '국어', enter: '2026-11-20T10:00:00', items: ['x'.repeat(1900), 'y'.repeat(100)] }),
    makeLogPage({ id: 'd2', logId: '수학_1', student: CHILDREN[0], subject: '수학', enter: '2026-11-20T11:00:00', items: 'z'.repeat(300) }),
  ];

  const fu = fieldUsage(invPages, dailyPages);
  const c1 = fu.inventory[CHILDREN[0]];
  assert.equal(c1.학습설정.len, 1300);
  assert.equal(c1.학습설정.chunks, 2);
  assert.equal(c1.학습설정.limit, 2000);
  assert.equal(c1.학습설정.warn, true);
  assert.equal(c1.월드기록.limit, 1800);
  assert.equal(c1.월드기록.warn, false);
  assert.equal(c1.런너기록.warn, true);
  assert.equal(fu.longestItemLog.len, 2000);
  assert.equal(fu.longestItemLog.chunks, 2);
});

test('8. renderMarkdown: 섹션 머리 포함 및 원문 미노출 확인', () => {
  const md = renderMarkdown({
    since: '2026-11-01',
    until: '2026-11-22',
    children: CHILDREN,
    adminSkipped: 1,
    usage: {
      [CHILDREN[0]]: { days: 1, totalMin: 10, perDay: 10, weekday: {}, subjects: { 국어: { min: 10, rows: 1 } }, zeroSubjects: ['수학'] },
      [CHILDREN[1]]: { days: 0, totalMin: 0, perDay: 0, weekday: {}, subjects: {}, zeroSubjects: SUBJECTS[CHILDREN[1]] },
    },
    items: {},
    stuck: {},
    mathTypes: {},
    mastery: null,
    fields: { inventory: {}, longestItemLog: { len: 0, chunks: 0 } },
    errors: [],
  });

  for (const heading of ['사용 시간', '문항 기록', '막힌 문항', '저장 칸 점유율']) {
    assert.ok(md.includes(heading), `누락된 섹션: ${heading}`);
  }
  assert.ok(!md.includes('문항 본문'));
  assert.ok(!md.includes('오답리포트'));
});

test('9. 출력부(study_usage_report_render.mjs)의 아이 목록이 본 파일과 같다', async () => {
  const render = await import('../scripts/study_usage_report_render.mjs');
  assert.deepEqual(render.CHILDREN, CHILDREN);
});

test('10. 실제 실행에서 고친 것: 한 번도 안 틀린 문항은 막힌 문항이 아니고, 오답은 「」로 묶고, 문항 없는 과목은 표에서 뺀다', () => {
  const merged = { [CHILDREN[0]]: { 영어: { 'v:a': [2, 0, 0, []], 'v:b': [1, 1, 0, ['일찍, 이른', '내일']] }, 사회: {} } };
  const stuck = stuckItems(merged, 10);
  assert.deepEqual(stuck[CHILDREN[0]]['영어'].map((x) => x.key), ['v:b']);
  const md = renderMarkdown({
    meta: { since: '2026-11-01', until: '2026-11-23' }, items: itemSummary(merged), stuck, usage: {}, math: {}, mastery: {}, fields: {}, errors: {},
  });
  assert.match(md, /「일찍, 이른」 「내일」/);
  assert.doesNotMatch(md, /\| 사회 \| 0 \|/);
});

test('11. 막힌 문항 이름: 하이픈 있는 노션 page.id와 하이픈 없는 문항키를 맞추고, c: 키는 받아 온 제목, 실패하면 키 그대로', async () => {
  const stuck = { [CHILDREN[0]]: { 영어: [{ key: 'v:3fea27115b68817f8f6dd9a9d65fe042' }], 과학: [{ key: 'c:aaaa' }, { key: 'c:bbbb' }] } };
  const voca = [{ id: '3fea2711-5b68-817f-8f6d-d9a9d65fe042', properties: { 단어: { title: [{ plain_text: 'kitchen' }] } } }];
  const getPage = async (id) => {
    if (id === 'aaaa') return { properties: { 제목: { title: [{ plain_text: '[실험] 증발' }] } } };
    throw new Error('없음');
  };
  const names = await resolveKeyNames(stuck, voca, false, getPage);
  assert.equal(names['v:3fea27115b68817f8f6dd9a9d65fe042'], 'kitchen');
  assert.equal(names['c:aaaa'], '[실험] 증발');
  assert.equal(names['c:bbbb'], undefined);
  const fastNames = await resolveKeyNames(stuck, voca, true, getPage);
  assert.equal(fastNames['v:3fea27115b68817f8f6dd9a9d65fe042'], undefined, '--fast면 어휘 이름 없이 키 그대로');
});
