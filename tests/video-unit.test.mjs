// 단원 영상 부품 계약 시험 (docs/video_unit_spec.md §8). 초안: 안티그래비티 Hydrogen, 검토·수정: Claude (2026-11-16)
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import vm from 'node:vm';

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const plain = (v) => JSON.parse(JSON.stringify(v));

function load(extra = {}) {
  const store = {};
  const sandbox = {
    console: { log() {}, info() {}, warn() {}, error: console.error },
    setTimeout, clearTimeout, Date, Math, JSON, Promise, URL,
    localStorage: {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; },
    },
    ...extra,
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(read('kids/core/video-unit.js'), sandbox, { filename: 'video-unit.js' });
  return { sb: sandbox, store };
}

const row = ({ title, zone, media, source, usage, question, choices, answer }) => ({
  id: title,
  properties: {
    '제목': { title: [{ plain_text: title }] },
    '구역': { select: { name: zone } },
    '미디어 URL': { url: media || null },
    '해설': { rich_text: source ? [{ plain_text: source }] : [] },
    '핵심 쓰임새/설명': { rich_text: usage ? [{ plain_text: usage }] : [] },
    '퀴즈 질문': { rich_text: question ? [{ plain_text: question }] : [] },
    '보기 1~4': { rich_text: choices ? [{ plain_text: choices.join('\n') }] : [] },
    '정답': { number: answer ?? null },
  },
});

test('parseYouTubeId: 유효한 URL과 무효한 입력', () => {
  const { sb } = load();
  const parse = sb.VideoUnit.parseYouTubeId;
  assert.equal(parse('https://www.youtube.com/watch?v=nigzeqE0NvY'), 'nigzeqE0NvY');
  assert.equal(parse('https://www.youtube.com/watch?v=_fRlOk-jNCE&t=30s'), '_fRlOk-jNCE');
  assert.equal(parse('https://youtu.be/I-S_3s_FUKE?si=x'), 'I-S_3s_FUKE');
  assert.equal(parse('https://www.youtube.com/embed/nigzeqE0NvY?rel=0'), 'nigzeqE0NvY');
  assert.equal(parse('https://www.youtube-nocookie.com/embed/_fRlOk-jNCE'), '_fRlOk-jNCE');
  assert.equal(parse('https://www.youtube.com/shorts/I-S_3s_FUKE'), 'I-S_3s_FUKE');
  const invalid = [
    'https://example.com/watch?v=nigzeqE0NvY',
    'https://youtu.be/nigzeqE0Nv',
    '',
    null,
    'not a url',
  ];
  for (const bad of invalid) {
    assert.equal(parse(bad), null);
  }
});

test('buildQuery: 필터와 정렬 생성', () => {
  const { sb } = load();
  const key = 'kids/subjects/science/science_cloud_lab.html';
  const q = plain(sb.VideoUnit.buildQuery(key));
  // 구역 select 필터는 넣지 않는다: 노션에 아직 없는 선택지(영상확인 등)면 조회 전체가 400 (2026-11-16 확인)
  assert.deepEqual(q.filter, {
    property: '인터랙티브 URL',
    url: { equals: `https://awslike6-web.github.io/kids-school/${key}` },
  });
  assert.equal(JSON.stringify(q).includes('select'), false);
  assert.deepEqual(q.sorts, [{ timestamp: 'created_time', direction: 'ascending' }]);
});

test('rowsToUnit: 구역별 변환과 필터링', () => {
  const { sb } = load();
  const unit = plain(sb.VideoUnit.rowsToUnit([
    row({ title: 'V1', zone: '단원영상', media: 'https://youtu.be/nigzeqE0NvY', source: 'EBS', usage: 'a | b | c | d' }),
    row({ title: 'V2', zone: '단원영상', media: 'https://example.com/x' }),
    row({ title: 'Q1', zone: '영상확인', question: '무엇?', choices: ['1', '2', '3'], answer: 2, source: '설명' }),
    row({ title: 'X1', zone: '탐구퀴즈', question: '무시', choices: ['a', 'b'], answer: 1 }),
  ]));
  assert.equal(unit.videos.length, 1);
  assert.deepEqual(unit.videos[0], { id: 'nigzeqE0NvY', title: 'V1', source: 'EBS', summary: ['a', 'b', 'c'] });
  assert.equal(unit.questions.length, 1);
  assert.equal(unit.questions[0].title, 'Q1');
  assert.equal(unit.questions[0].question, '무엇?');
  assert.deepEqual(unit.questions[0].choices, ['1', '2', '3']);
  assert.equal(unit.questions[0].answer, 1);
});

const KEY = 'kids/subjects/science/science_cloud_lab.html';
const CKEY = `MINMIN_VIDEO_UNIT_V1:${KEY}`;
const ROWS = [row({ title: 'V1', zone: '단원영상', media: 'https://youtu.be/nigzeqE0NvY', source: 'S', usage: 'u1' })];

test('loadUnit: 캐시 없음 + 노션 1영상', async () => {
  const calls = [];
  const fetch = async (url, opts) => {
    calls.push({ url, opts });
    return { ok: true, status: 200, json: async () => ({ results: ROWS }) };
  };
  const { sb, store } = load({ fetch });
  const events = [];
  const res = await sb.VideoUnit.loadUnit(KEY, (u, s) => events.push([plain(u), s]));
  assert.equal(res, 'notion');
  assert.equal(events.length, 1);
  assert.equal(events[0][1], 'notion');
  assert.equal(events[0][0].videos.length, 1);
  assert.ok(CKEY in store);
  assert.equal(calls.length, 1);
  const hdrs = Object.keys(calls[0].opts?.headers || {});
  assert.equal(hdrs.some((k) => k.toLowerCase() === 'user-agent'), false);
  assert.deepEqual(JSON.parse(calls[0].opts.body), plain(sb.VideoUnit.buildQuery(KEY)));
});

test('loadUnit: 같은 내용 캐시', async () => {
  let count = 0;
  const fetch = async () => {
    count += 1;
    return { ok: true, status: 200, json: async () => ({ results: ROWS }) };
  };
  const { sb, store } = load({ fetch });
  const unit = plain(sb.VideoUnit.rowsToUnit(ROWS));
  store[CKEY] = JSON.stringify({ savedAt: '2026-01-01 00:00', ...unit });
  const events = [];
  const res = await sb.VideoUnit.loadUnit(KEY, (u, s) => events.push([plain(u), s]));
  assert.equal(res, 'notion');
  assert.equal(count, 1);
  assert.equal(events.length, 1);
  assert.equal(events[0][1], 'cache');
});

test('loadUnit: 다른 내용 캐시', async () => {
  const fetch = async () => ({ ok: true, status: 200, json: async () => ({ results: ROWS }) });
  const { sb, store } = load({ fetch });
  store[CKEY] = JSON.stringify({
    savedAt: '2026-01-01 00:00',
    videos: [{ id: 'old12345678', title: '이전', source: '', summary: [] }],
    questions: [],
  });
  const events = [];
  await sb.VideoUnit.loadUnit(KEY, (u, s) => events.push([plain(u), s]));
  assert.deepEqual(events.map((e) => e[1]), ['cache', 'notion']);
  assert.equal(JSON.parse(store[CKEY]).videos[0].id, 'nigzeqE0NvY');
});

test('loadUnit: 캐시 있음 + 노션 0건', async () => {
  const fetch = async () => ({ ok: true, status: 200, json: async () => ({ results: [] }) });
  const { sb, store } = load({ fetch });
  store[CKEY] = JSON.stringify({ savedAt: '2026-01-01 00:00', videos: [{ id: 'nigzeqE0NvY' }], questions: [] });
  const events = [];
  await sb.VideoUnit.loadUnit(KEY, (u, s) => events.push([u === null ? null : plain(u), s]));
  assert.deepEqual(events.map((e) => e[1]), ['cache', 'notion']);
  assert.equal(events[1][0], null);
  assert.equal(CKEY in store, false);
});

test('loadUnit: 캐시 없음 + 노션 0건', async () => {
  const fetch = async () => ({ ok: true, status: 200, json: async () => ({ results: [] }) });
  const { sb, store } = load({ fetch });
  const events = [];
  await sb.VideoUnit.loadUnit(KEY, (u, s) => events.push([u, s]));
  assert.deepEqual(events, [[null, 'notion']]);
  assert.equal(CKEY in store, false);
});

test('loadUnit: 캐시 있음 + fetch 예외', async () => {
  const fetch = async () => { throw new Error('net'); };
  const { sb, store } = load({ fetch });
  store[CKEY] = JSON.stringify({ savedAt: '2026-01-01 00:00', videos: [{ id: 'nigzeqE0NvY' }], questions: [] });
  const events = [];
  const res = await sb.VideoUnit.loadUnit(KEY, (u, s) => events.push([plain(u), s]));
  assert.equal(res, 'cache');
  assert.equal(events.length, 1);
  assert.equal(events[0][1], 'cache');
});

test('loadUnit: 캐시 없음 + fetch 500', async () => {
  const fetch = async () => ({ ok: false, status: 500, json: async () => ({}) });
  const { sb } = load({ fetch });
  const events = [];
  const res = await sb.VideoUnit.loadUnit(KEY, (u, s) => events.push([u, s]));
  assert.equal(res, 'none');
  assert.equal(events.length, 0);
});

test('loadYouTubeApi: 중복 호출, 기존 콜백, YT 존재, 5초 제한', async (t) => {
  const appended = [];
  let prevCalled = false;
  const doc = { createElement: () => ({}), head: { appendChild(el) { appended.push(el); } } };
  const { sb } = load({ document: doc, onYouTubeIframeAPIReady: () => { prevCalled = true; } });
  const p1 = sb.VideoUnit.loadYouTubeApi();
  const p2 = sb.VideoUnit.loadYouTubeApi();
  assert.equal(p1, p2);
  assert.equal(appended.length, 1);
  sb.YT = { Player: function () {} };
  sb.onYouTubeIframeAPIReady();
  await p1;
  assert.equal(prevCalled, true);

  const appended2 = [];
  const doc2 = { createElement: () => ({}), head: { appendChild(el) { appended2.push(el); } } };
  const { sb: sb2 } = load({ document: doc2, YT: { Player: function () {} } });
  await sb2.VideoUnit.loadYouTubeApi();
  assert.equal(appended2.length, 0);

  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { sb: sb3 } = load({ document: { createElement: () => ({}), head: { appendChild() {} } } });
  const p3 = sb3.VideoUnit.loadYouTubeApi();
  t.mock.timers.tick(5001);
  await assert.rejects(p3);
});

test('loadYouTubeApi: 5초 초과 뒤 다시 불러도 script·래퍼는 하나, 늦은 준비 신호는 새로 기다린 쪽에 간다', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const appended = [];
  let prevCount = 0;
  const doc = { createElement: () => ({}), head: { appendChild(el) { appended.push(el); } } };
  const { sb } = load({ document: doc, onYouTubeIframeAPIReady: () => { prevCount += 1; } });
  const p1 = sb.VideoUnit.loadYouTubeApi();
  t.mock.timers.tick(5001);
  await assert.rejects(p1);
  const p2 = sb.VideoUnit.loadYouTubeApi();
  assert.notEqual(p1, p2);
  assert.equal(appended.length, 1, 'script는 다시 넣지 않는다');
  sb.YT = { Player: function () {} };
  sb.onYouTubeIframeAPIReady();
  assert.equal(await p2, sb.YT);
  assert.equal(prevCount, 1, '원래 콜백은 한 번만');
});

test('kstNow: 형식과 toISOString 미사용', () => {
  const { sb } = load();
  assert.match(sb.VideoUnit.kstNow(), /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
  assert.equal(read('kids/core/video-unit.js').includes('toISOString'), false);
});

test('소스 규칙: 금지 문자열 미포함', () => {
  const src = read('kids/core/video-unit.js');
  for (const ban of ['innerHTML', 'insertAdjacentHTML', 'speechSynthesis', 'User-Agent']) {
    assert.equal(src.includes(ban), false, ban);
  }
});

test('과학 실험실 지킴이: 14개 파일 및 kids 전체 embed 금지', () => {
  const labs = [
    'science_cloud_lab', 'science_wind_lab', 'science_dew_fog_lab',
    'science_hygrometer_lab', 'science_thermometer_lab', 'science_conduction_lab',
    'science_liquid_convection_lab', 'science_gas_convection_lab', 'science_insulation_lab',
    'science_wind_turbine_lab', 'science_resource_finite_lab', 'science_renewable_energy_lab',
    'science_energy_efficiency_lab', 'science_eco_house_lab',
  ];
  for (const name of labs) {
    const file = `${name}.html`;
    const html = read(`kids/subjects/science/${file}`);
    assert.equal(html.includes('youtube.com/embed'), false, file);
    assert.equal(html.includes('youtube-nocookie.com/embed'), false, file);
    const attr = `data-video-unit="kids/subjects/science/${file}"`;
    assert.equal(html.split(attr).length - 1, 1, file);
    assert.equal(html.includes('../../core/video-unit.js'), true, file);
    assert.equal(html.includes('../../css/video-unit.css'), true, file);
  }
  const embedRe = /youtube(?:-nocookie)?\.com\/embed\/[A-Za-z0-9_-]{11}/;
  for (const entry of readdirSync(new URL('../kids', import.meta.url), { recursive: true })) {
    const rel = String(entry).replaceAll('\\', '/');
    if (/\.(html|js)$/.test(rel)) {
      assert.equal(embedRe.test(read(`kids/${rel}`)), false, rel);
    }
  }
});
