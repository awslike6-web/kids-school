// ========================================================
// ✅ 노션 전송 계약 시험 (node --test)
// - 실행: node --test "tests/**/*.test.mjs"
// - 앱이 노션에 실제로 보내는 요청 본문(속성 이름·타입·값 형식)이
//   스키마 도감 docs/notion_schemas_school.md와 맞는지 확인한다.
//   속성 이름을 바꾸거나 오타가 나면 노션은 400을 돌려주고 진도가 조용히 사라지므로,
//   도감과 코드가 어긋나는 순간 여기서 실패하게 한다.
// - fetch는 모의 함수로 가로채므로 노션 운영 DB에는 접속하지 않는다.
// ========================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(path.join(ROOT, rel), 'utf8');

// 스키마 도감의 '### ... {DB 이름}' 절 표에서 {속성명: 타입}을 읽는다
function schemaOf(dbName) {
  const doc = read('docs/notion_schemas_school.md');
  const start = doc.search(new RegExp(`^###[^\\n]*\\b${dbName}\\b`, 'm'));
  assert.ok(start >= 0, `스키마 도감에 ${dbName} 절이 없습니다`);
  const next = doc.slice(start + 4).search(/^###? /m);
  const section = next < 0 ? doc.slice(start) : doc.slice(start, start + 4 + next);
  const props = {};
  for (const m of section.matchAll(/^\| \*\*(.+?)\*\* \| `([a-z_]+)`/gm)) props[m[1]] = m[2];
  assert.ok(Object.keys(props).length > 0, `${dbName} 속성 표를 읽지 못했습니다`);
  return props;
}

// 요청 본문의 properties가 도감의 이름·타입과 맞는지 확인한다
function assertMatchesSchema(properties, schema, label) {
  for (const [name, value] of Object.entries(properties)) {
    assert.ok(name in schema, `${label}: '${name}' 속성이 스키마 도감에 없습니다`);
    const sentType = Object.keys(value)[0];
    assert.equal(sentType, schema[name], `${label}: '${name}'은 ${schema[name]} 타입인데 ${sentType}로 보냅니다`);
  }
}

// 브라우저 전역 스크립트를 모의 fetch·localStorage와 함께 불러온다
function loadBrowserScripts(files, { userName = '민수' } = {}) {
  const calls = [];
  const fetch = async (url, options = {}) => {
    const body = options.body ? JSON.parse(options.body) : {};
    calls.push({ url, method: options.method || 'GET', body });
    if (url.includes('/query')) return { ok: true, status: 200, json: async () => ({ results: [] }) };
    return { ok: true, status: 200, json: async () => ({ id: `mock_${calls.length}` }), text: async () => '' };
  };
  const store = { currentUserName: userName, currentChild: 'minsu' };
  const sandbox = {
    console: { log() {}, info() {}, warn() {}, error: console.error },
    setTimeout, clearTimeout, Date, Math, JSON, fetch,
    localStorage: {
      getItem: (k) => store[k] ?? null,
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; },
    },
    location: { pathname: '/kids/subjects/quest/quest_runner.html' },
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  for (const f of files) vm.runInContext(read(f), sandbox, { filename: f });
  return { sandbox, calls };
}

const MASTERY_FORMAT = /^\d+\|(\d{4}-\d{2}-\d{2})?\|(\d{4}-\d{2}-\d{2})?$/;

test('숙련도 문자열: 저장했다 다시 읽어도 같은 값 (count|silverDate|lastReviewed)', () => {
  const require = createRequire(import.meta.url);
  globalThis.localStorage ??= { getItem: () => null, setItem() {}, removeItem() {} };
  const QM = require(path.join(ROOT, 'kids/subjects/quest/quest-mastery.js'));
  const states = [
    { c: 0, s: '', r: '' },
    { c: 3, s: '', r: '2026-10-14' },
    { c: 6, s: '2026-10-15', r: '2026-10-15' },
    { c: 9, s: '2026-10-15', r: '2026-10-20' },
  ];
  for (const st of states) {
    const text = QM.formatMastery(st);
    assert.match(text, MASTERY_FORMAT, `형식 위반: ${text}`);
    assert.deepEqual(QM.parseMastery(text), st, `왕복 불일치: ${text}`);
  }
  // 깨진 값은 0으로, 최댓값(금메달 9)을 넘는 값은 9로 맞춘다
  assert.equal(QM.parseMastery('abc').c, 0);
  assert.equal(QM.parseMastery(null).c, 0);
  assert.equal(QM.parseMastery('42|2026-10-15|').c, 9);
});

test('VOCA_DB 숙련도·달성 전송이 스키마 도감과 일치', async () => {
  const schema = schemaOf('VOCA_DB');
  const { sandbox, calls } = loadBrowserScripts(['kids/core/notion-voca.js']);

  assert.equal(await sandbox.updateVocaMasteryProgress('page1', '9|2026-10-15|2026-10-20', true), true);
  assert.equal(await sandbox.updateVocaMasteryProgress('page2', '5|2026-10-15|2026-10-16', false), true);
  assert.equal(await sandbox.updateVocaMasteryProgress('page3', '2||2026-10-16'), true);
  assert.equal(await sandbox.updateVocaMasteryStatus('page4', true), true);
  assert.equal(calls.length, 4);

  for (const c of calls) {
    assert.equal(c.method, 'PATCH');
    assert.match(c.url, /\/v1\/pages\/page\d$/);
    assertMatchesSchema(c.body.properties, schema, c.url);
  }
  const mastery = calls.slice(0, 3).map(c => c.body.properties['숙련도'].rich_text[0].text.content);
  mastery.forEach(t => assert.match(t, MASTERY_FORMAT));
  assert.equal(calls[0].body.properties['달성'].checkbox, true);
  assert.equal(calls[1].body.properties['달성'].checkbox, false);
  assert.ok(!('달성' in calls[2].body.properties), '달성 값이 없으면 달성 속성을 보내지 않아야 합니다');
});

test('관리자(엄마·아빠) 모드에서는 숙련도를 노션에 쓰지 않음', async () => {
  const { sandbox, calls } = loadBrowserScripts(['kids/core/notion-voca.js'], { userName: '엄마' });
  assert.equal(await sandbox.updateVocaMasteryProgress('page1', '3||2026-10-16', null), true);
  assert.equal(calls.length, 0);
});

test('STUDY_LOG_DB 학습일지·오답리포트 전송이 스키마 도감과 일치', async () => {
  const schema = schemaOf('STUDY_LOG_DB');
  const { sandbox, calls } = loadBrowserScripts(['kids/core/study-log-store.js', 'kids/core/notion-study-logger.js']);

  const ok = await sandbox.sendStudyLogToNotion({
    childName: '민수', subject: '수학', errorReport: '12x5 연산 실수', wordFairyCount: 3,
  });
  assert.equal(ok, true);
  const writes = calls.filter(c => c.method === 'POST' && c.url.endsWith('/v1/pages') || c.method === 'PATCH');
  const logWrites = writes.filter(c => c.body.parent?.database_id?.replace(/-/g, '') === '37aa27115b688001b2ffe5e6c8f82ab2'
    || 'ID' in (c.body.properties || {}));
  assert.ok(logWrites.length >= 1, `학습일지 쓰기 요청이 없습니다: ${JSON.stringify(calls.map(c => c.method + ' ' + c.url))}`);

  for (const c of logWrites) assertMatchesSchema(c.body.properties, schema, `${c.method} ${c.url}`);
  const props = logWrites[0].body.properties;
  assert.match(props['ID'].title[0].text.content, /^민수_\d{4}-\d{2}-\d{2}_수학$/, 'ID는 {학생}_{YYYY-MM-DD}_{과목}');
  assert.equal(props['학생'].select.name, '민수');
  assert.ok(props['오답리포트'].rich_text[0].text.content.includes('12x5 연산 실수'), '오답 내용이 오답리포트에 들어가야 합니다');
});
