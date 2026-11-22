import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { renderMarkdown } from './study_usage_report_render.mjs';
export { renderMarkdown };

const require = createRequire(import.meta.url);
const { measuredMinutes } = require('../kids/core/study-activity.js');
const QM = require('../kids/subjects/quest/quest-mastery.js');

export const CHILDREN = ['민수', '민서'];
export const SUBJECTS_BY_CHILD = {
  민수: ['국어', '수학', '영어', '사회', '과학', '하루', '용어사전'],
  민서: ['국어', '수학', '영어', '하루', '용어사전'],
};

const WORKER = 'https://minmin-notion.awslike6.workers.dev';
const HEADERS = {
  'Content-Type': 'application/json',
  'User-Agent': 'Mozilla/5.0 (kids-school report)',
  'Notion-Version': '2022-06-28',
};
const DB_IDS = {
  log: '37aa27115b688001b2ffe5e6c8f82ab2',
  voca: '375a27115b688038b686d3994ee12919',
  book: '3e8a27115b68806d94bfc81e9b3435fa',
  inventory: '374a27115b688042bb61e6a102242e12',
};
const KST_OFFSET_MS = 9 * 3600 * 1000;
const FIELD_LIMITS = { 학습설정: 2000, 월드기록: 1800, 런너기록: 2000 };
const PREFIXES = ['v', 'c', 'r', 's', 'g'];

// 2자리 숫자 패딩
function pad2(n) {
  return String(n).padStart(2, '0');
}

// 밀리초를 KST YYYY-MM-DD로 변환 (toISOString 금지)
export function kstDate(ms) {
  const num = typeof ms === 'number' ? ms : Date.parse(String(ms));
  if (!Number.isFinite(num)) return '';
  const d = new Date(num + KST_OFFSET_MS);
  const y = d.getUTCFullYear();
  const m = pad2(d.getUTCMonth() + 1);
  const day = pad2(d.getUTCDate());
  return `${y}-${m}-${day}`;
}

// YYYY-MM-DD 형식과 달력 유효성 검증
function isValidYmd(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

// YYYY-MM-DD에 일수 더하기
function shiftYmd(ymd, deltaDays) {
  const [y, m, d] = ymd.split('-').map(Number);
  const ms = Date.UTC(y, m - 1, d + deltaDays) - KST_OFFSET_MS;
  return kstDate(ms);
}

// since~until 구간 날짜 배열 생성
function buildDateList(since, until) {
  const out = [];
  let cur = since;
  while (cur <= until) {
    out.push(cur);
    cur = shiftYmd(cur, 1);
  }
  return out;
}

// YYYY-MM-DD의 요일 인덱스(0=일..6=토)
function weekdayOf(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

// 양의 정수 파싱
function parsePositiveInt(val, flag) {
  if (val === undefined || !/^\d+$/.test(val)) {
    throw new Error(`${flag} 값이 올바른 양의 정수가 아닙니다: ${val}`);
  }
  const n = Number(val);
  if (!Number.isInteger(n) || n < 1) {
    throw new Error(`${flag} 값은 1 이상이어야 합니다: ${val}`);
  }
  return n;
}

// CLI 인자 파싱
export function parseArgs(argv, today = kstDate(Date.now())) {
  if (!isValidYmd(today)) {
    throw new Error(`기준 날짜(today)가 올바르지 않습니다: ${today}`);
  }
  let days = 30;
  let since = null;
  let until = null;
  let child = null;
  let fast = false;
  let save = false;
  let top = 10;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--fast') {
      fast = true;
    } else if (arg === '--save') {
      save = true;
    } else if (arg === '--days') {
      days = parsePositiveInt(argv[++i], '--days');
    } else if (arg === '--top') {
      top = parsePositiveInt(argv[++i], '--top');
    } else if (arg === '--since') {
      since = argv[++i];
      if (!isValidYmd(since)) {
        throw new Error(`--since 날짜가 올바르지 않습니다: ${since}`);
      }
    } else if (arg === '--until') {
      until = argv[++i];
      if (!isValidYmd(until)) {
        throw new Error(`--until 날짜가 올바르지 않습니다: ${until}`);
      }
    } else if (arg === '--child') {
      child = argv[++i];
      if (!CHILDREN.includes(child)) {
        throw new Error(`--child는 ${CHILDREN.join('|')} 중 하나여야 합니다: ${child}`);
      }
    } else {
      throw new Error(`알 수 없는 인자입니다: ${arg}`);
    }
  }

  const resolvedUntil = until ?? today;
  const resolvedSince = since ?? shiftYmd(resolvedUntil, -(days - 1));
  if (resolvedSince > resolvedUntil) {
    throw new Error(`시작일(${resolvedSince})이 종료일(${resolvedUntil})보다 늦습니다.`);
  }
  return {
    since: resolvedSince,
    until: resolvedUntil,
    days,
    child,
    children: child ? [child] : CHILDREN.slice(),
    fast,
    save,
    top,
  };
}

// 노션 속성 읽기 도우미
function readTitle(prop) {
  const arr = prop?.title;
  if (!Array.isArray(arr)) return '';
  return arr.map((x) => x?.plain_text ?? '').join('');
}

function readRichText(prop) {
  const arr = prop?.rich_text;
  if (!Array.isArray(arr)) return { text: '', chunks: 0 };
  const text = arr.map((x) => x?.plain_text ?? '').join('');
  return { text, chunks: arr.length };
}

function readSelect(prop) {
  return prop?.select?.name ?? '';
}

function readMultiSelect(prop) {
  const arr = prop?.multi_select;
  if (!Array.isArray(arr)) return [];
  return arr.map((x) => x?.name ?? '').filter(Boolean);
}

function readDateStart(prop) {
  return prop?.date?.start ?? '';
}

// 과목명에서 괄호 앞까지만 잘라 묶음 이름 반환
export function subjectGroup(raw) {
  const str = String(raw ?? '').trim();
  const idx = str.indexOf('(');
  const head = idx >= 0 ? str.slice(0, idx) : str;
  return head.trim();
}

// 학습일지 행을 측정 행 / 일지 행으로 분류하고 범위 외·관리자 제외
export function splitLogRows(pages, since, until) {
  const activity = [];
  const daily = [];
  let adminSkipped = 0;
  let outOfRange = 0;

  for (const page of pages ?? []) {
    const props = page?.properties ?? {};
    const student = readSelect(props['학생']);
    if (student === '부모관리자') {
      adminSkipped++;
      continue;
    }
    const startStr = readDateStart(props['입장']);
    const kstDay = startStr ? kstDate(Date.parse(startStr)) : '';
    if (!kstDay || (since && kstDay < since) || (until && kstDay > until)) {
      outOfRange++;
      continue;
    }
    const idText = readTitle(props['ID']);
    const actText = readRichText(props['활동측정']).text;
    if (idText.startsWith('학습활동_') || actText.trim() !== '') {
      activity.push(page);
    } else {
      daily.push(page);
    }
  }
  return { activity, daily, adminSkipped, outOfRange };
}

// 아이별 사용 시간·빈도 및 과목별 참고 시간 집계
export function usageSummary(activityPages, children, dates, measuredFn) {
  const result = {};
  for (const child of children) {
    const perDay = {};
    const weekday = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    let totalMin = 0;
    let days = 0;

    for (const date of dates) {
      const m = measuredFn(activityPages, child, date);
      perDay[date] = m;
      totalMin += m;
      if (m >= 1) days++;
      weekday[weekdayOf(date)] += m;
    }

    const bySubject = new Map();
    for (const page of activityPages ?? []) {
      const props = page?.properties ?? {};
      if (readSelect(props['학생']) !== child) continue;
      const subj = subjectGroup(readRichText(props['과목']).text) || '미분류';
      if (!bySubject.has(subj)) bySubject.set(subj, []);
      bySubject.get(subj).push(page);
    }

    const subjects = {};
    for (const [subj, rows] of bySubject.entries()) {
      let subMin = 0;
      for (const date of dates) {
        subMin += measuredFn(rows, child, date);
      }
      subjects[subj] = { min: subMin, rows: rows.length };
    }

    const expected = SUBJECTS_BY_CHILD[child] ?? [];
    const zeroSubjects = expected.filter((s) => (subjects[s]?.min ?? 0) === 0);
    result[child] = { days, totalMin, perDay, weekday, subjects, zeroSubjects };
  }
  return result;
}

// 문항기록 JSON v1 해석 (앱 LearningLog.decode와 동일 규칙)
export function decodeItems(text) {
  if (typeof text !== 'string' || !text.trim()) {
    return { v: 1, i: {}, b: [] };
  }
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return null;
  }
  if (parsed.v !== 1) return null;
  if (!parsed.i || typeof parsed.i !== 'object' || Array.isArray(parsed.i)) {
    return null;
  }
  return {
    v: 1,
    i: parsed.i,
    b: Array.isArray(parsed.b) ? parsed.b : [],
  };
}

// 일지 행들의 문항기록을 아이·과목·문항키별로 합산
export function mergeItemRecords(dailyPages, decodeFn = decodeItems) {
  const merged = {};
  const latestTime = {};
  let broken = 0;

  for (const page of dailyPages ?? []) {
    const props = page?.properties ?? {};
    const child = readSelect(props['학생']);
    if (!child) continue;
    const rawLog = readRichText(props['문항기록']).text;
    const decoded = decodeFn(rawLog);
    if (!decoded) {
      broken++;
      continue;
    }
    const subj = subjectGroup(readRichText(props['과목']).text) || '미분류';
    const startMs = Date.parse(readDateStart(props['입장'])) || 0;

    if (!merged[child]) merged[child] = {};
    if (!merged[child][subj]) merged[child][subj] = {};
    if (!latestTime[child]) latestTime[child] = {};
    if (!latestTime[child][subj]) latestTime[child][subj] = {};

    for (const [key, val] of Object.entries(decoded.i)) {
      if (!Array.isArray(val)) continue;
      const t = Number(val[0]) || 0;
      const w = Number(val[1]) || 0;
      const h = Number(val[2]) || 0;
      const rawPicks = typeof val[3] === 'string' ? val[3] : '';
      const picks = rawPicks ? rawPicks.split('|').filter(Boolean) : [];

      if (!merged[child][subj][key]) {
        merged[child][subj][key] = [0, 0, 0, []];
        latestTime[child][subj][key] = -Infinity;
      }
      const entry = merged[child][subj][key];
      entry[0] += t;
      entry[1] += w;
      entry[2] += h;
      if (picks.length > 0 && startMs >= latestTime[child][subj][key]) {
        latestTime[child][subj][key] = startMs;
        entry[3] = picks.slice(-3);
      }
    }
  }
  return { merged, broken };
}

// 아이·과목별 문항 기록 요약 통계
export function itemSummary(merged) {
  const out = {};
  for (const [child, subjMap] of Object.entries(merged ?? {})) {
    out[child] = {};
    for (const [subj, keyMap] of Object.entries(subjMap)) {
      let items = 0;
      let tries = 0;
      let wrong = 0;
      let hints = 0;
      const prefixes = { v: 0, c: 0, r: 0, s: 0, g: 0 };

      for (const [key, [t, w, h]] of Object.entries(keyMap)) {
        items++;
        tries += t;
        wrong += w;
        hints += h;
        if (key.length >= 2 && key[1] === ':' && PREFIXES.includes(key[0])) {
          prefixes[key[0]]++;
        }
      }
      out[child][subj] = {
        items,
        tries,
        wrong,
        hints,
        firstTryRate: tries > 0 ? 1 - wrong / tries : 0,
        hintRate: tries > 0 ? hints / tries : 0,
        prefixes,
      };
    }
  }
  return out;
}

// 막힌 문항 Top N 추출 (시도>=2 또는 틀림>=1)
export function stuckItems(merged, top = 10) {
  const out = {};
  for (const [child, subjMap] of Object.entries(merged ?? {})) {
    out[child] = {};
    for (const [subj, keyMap] of Object.entries(subjMap)) {
      const list = [];
      for (const [key, [t, w, h, picks]] of Object.entries(keyMap)) {
        if (w >= 1) { // 한 번이라도 첫 선택에서 틀린 문항만 (두 번 다 맞힌 문항은 막힌 게 아님)
          list.push({ key, t, w, h, picks: picks ?? [] });
        }
      }
      list.sort((a, b) => {
        if (b.w !== a.w) return b.w - a.w;
        const rateA = a.t > 0 ? a.w / a.t : 0;
        const rateB = b.t > 0 ? b.w / b.t : 0;
        if (rateB !== rateA) return rateB - rateA;
        return b.t - a.t;
      });
      out[child][subj] = list.slice(0, top);
    }
  }
  return out;
}

// 수학 g: 유형별 첫 시도 정답률 표 생성
export function mathTypeTable(merged) {
  const out = {};
  for (const [child, subjMap] of Object.entries(merged ?? {})) {
    const byType = new Map();
    for (const keyMap of Object.values(subjMap)) {
      for (const [key, [t, w]] of Object.entries(keyMap)) {
        if (!key.startsWith('g:')) continue;
        const type = key.slice(2);
        if (!byType.has(type)) byType.set(type, { tries: 0, wrong: 0 });
        const acc = byType.get(type);
        acc.tries += t;
        acc.wrong += w;
      }
    }
    const rows = [];
    for (const [type, { tries, wrong }] of byType.entries()) {
      rows.push({
        type,
        tries,
        wrong,
        rate: tries > 0 ? 1 - wrong / tries : 0,
      });
    }
    rows.sort((a, b) => b.tries - a.tries || a.type.localeCompare(b.type));
    out[child] = rows;
  }
  return out;
}

// 어휘 숙련도 3·3·3 정착 집계 (공통/복수 학생은 '공통' 묶음으로 분리)
export function masterySummary(vocaPages, since, until, today, qm = QM) {
  const out = {};
  for (const page of vocaPages ?? []) {
    const props = page?.properties ?? {};
    const masteryText = readRichText(props['숙련도']).text;
    const st = qm.parseMastery(masteryText);
    if (!st || !st.r || st.r < since || st.r > until) continue;

    const students = readMultiSelect(props['학생']);
    const matched = CHILDREN.filter((c) => students.includes(c));
    const bucket =
      students.includes('공통') || matched.length !== 1 ? '공통' : matched[0];

    const subjects = readMultiSelect(props['과목']);
    const subjList = subjects.length > 0 ? subjects : ['미분류'];
    const lv = qm.levelOf(st);
    const isSilver = st.c >= qm.SILVER;
    const isGold = st.c >= qm.GOLD;
    const rusty = qm.isRusty(st, today);

    if (!out[bucket]) out[bucket] = {};
    for (const subj of subjList) {
      if (!out[bucket][subj]) {
        out[bucket][subj] = {
          n: 0,
          lv: { 1: 0, 2: 0, 3: 0 },
          silver: 0,
          gold: 0,
          rusty: 0,
        };
      }
      const stat = out[bucket][subj];
      stat.n++;
      stat.lv[lv] = (stat.lv[lv] ?? 0) + 1;
      if (isSilver) stat.silver++;
      if (isGold) stat.gold++;
      if (rusty) stat.rusty++;
    }
  }
  return out;
}

// 인벤토리 및 학습일지 문항기록 저장 칸 점유율 계산
export function fieldUsage(inventoryPages, dailyPages) {
  const inventory = {};
  for (const page of inventoryPages ?? []) {
    const props = page?.properties ?? {};
    const name = readTitle(props['이름']);
    if (!CHILDREN.includes(name)) continue;
    inventory[name] = {};
    for (const [field, limit] of Object.entries(FIELD_LIMITS)) {
      const { text, chunks } = readRichText(props[field]);
      const len = text.length;
      const pct = Math.round((len / limit) * 1000) / 10;
      inventory[name][field] = {
        len,
        chunks,
        limit,
        pct,
        warn: pct >= 60,
      };
    }
  }

  let longestItemLog = { id: '', len: 0, chunks: 0 };
  for (const page of dailyPages ?? []) {
    const props = page?.properties ?? {};
    const { text, chunks } = readRichText(props['문항기록']);
    if (text.length > longestItemLog.len) {
      longestItemLog = {
        id: readTitle(props['ID']) || page.id || '',
        len: text.length,
        chunks,
      };
    }
  }
  return { inventory, longestItemLog };
}

// 노션 DB 전체 페이지네이션 조회 (읽기 전용)
async function queryDatabase(dbId, filter) {
  const results = [];
  let startCursor;
  while (true) {
    const body = { page_size: 100 };
    if (filter) body.filter = filter;
    if (startCursor) body.start_cursor = startCursor;

    const res = await fetch(`${WORKER}/v1/databases/${dbId}/query`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(`DB 조회 실패(${dbId}): HTTP ${res.status}`);
    }
    const data = await res.json();
    if (Array.isArray(data?.results)) {
      results.push(...data.results);
    }
    if (!data?.has_more || !data?.next_cursor) break;
    startCursor = data.next_cursor;
  }
  return results;
}

// 노션 단일 페이지 조회 (읽기 전용)
async function getPage(pageId) {
  const res = await fetch(`${WORKER}/v1/pages/${pageId}`, {
    method: 'GET',
    headers: HEADERS,
  });
  if (!res.ok) {
    throw new Error(`페이지 조회 실패(${pageId}): HTTP ${res.status}`);
  }
  return res.json();
}

// 막힌 문항의 키 -> 사람이 읽을 이름 맵 생성
// 노션 page_id를 문항키 모양(하이픈 뺀 소문자)으로 — 키는 'v:3fea2711…', page.id는 '3fea2711-5b68-…'
export function normalizePageId(id) {
  return String(id || '').replace(/-/g, '').toLowerCase();
}

export async function resolveKeyNames(stuck, vocaPages, fast, getPageFn = getPage) {
  const keyNames = {};
  const vocaById = new Map();
  for (const page of vocaPages ?? []) {
    if (page?.id) {
      const word = readTitle(page.properties?.['단어']);
      if (word) vocaById.set(normalizePageId(page.id), word);
    }
  }

  const cIds = new Map();
  for (const subjMap of Object.values(stuck ?? {})) {
    for (const list of Object.values(subjMap)) {
      for (const row of list) {
        const key = row.key;
        if (key.startsWith('v:') && !fast) {
          const id = normalizePageId(key.slice(2));
          if (vocaById.has(id)) keyNames[key] = vocaById.get(id);
        } else if (key.startsWith('c:')) {
          const id = key.slice(2);
          if (!cIds.has(id)) cIds.set(id, key);
        }
      }
    }
  }

  for (const [id, key] of cIds.entries()) {
    try {
      const page = await getPageFn(id);
      const title = readTitle(page?.properties?.['제목']);
      if (title) keyNames[key] = title;
    } catch {
      // 실패하면 키 그대로 표시
    }
  }
  return keyNames;
}

// --save 저장 경로 결정 및 파일 쓰기
function saveReport(markdown, since, until) {
  // 공개 저장소(kids-school) 밖, 바로 위 관제탑의 scratch(git 추적 밖)에 둔다. 관제탑이 없으면 OS 임시 폴더.
  const towerScratch = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../scratch');
  let dir = os.tmpdir();
  if (fs.existsSync(towerScratch)) {
    dir = path.join(towerScratch, 'reports');
    fs.mkdirSync(dir, { recursive: true });
  }
  const filePath = path.join(dir, `study_usage_${since}_${until}.md`);
  fs.writeFileSync(filePath, markdown, 'utf8');
  return filePath;
}

// CLI 실행 진입점
async function main() {
  const today = kstDate(Date.now());
  const opts = parseArgs(process.argv.slice(2), today);
  const children = opts.child ? [opts.child] : CHILDREN;
  const dates = buildDateList(opts.since, opts.until);

  const logFilter = {
    and: [
      { property: '입장', date: { on_or_after: shiftYmd(opts.since, -1) } },
      { property: '입장', date: { on_or_before: shiftYmd(opts.until, 1) } },
    ],
  };

  const errors = {};
  let logPages = [];
  let vocaPages = [];
  let inventoryPages = [];

  try {
    logPages = await queryDatabase(DB_IDS.log, logFilter);
  } catch (e) {
    errors.log = e.message;
  }

  if (!opts.fast) {
    try {
      vocaPages = await queryDatabase(DB_IDS.voca);
    } catch (e) {
      errors.voca = e.message;
    }
  }

  try {
    inventoryPages = await queryDatabase(DB_IDS.inventory);
  } catch (e) {
    errors.inventory = e.message;
  }

  const split = splitLogRows(logPages, opts.since, opts.until);
  const usage = errors.log ? {} : usageSummary(split.activity, children, dates, measuredMinutes);
  const { merged, broken } = errors.log ? { merged: {}, broken: 0 } : mergeItemRecords(split.daily);
  const items = itemSummary(merged);
  const stuck = stuckItems(merged, opts.top);
  const mathTypes = mathTypeTable(merged);
  const mastery = opts.fast || errors.voca
    ? {}
    : masterySummary(vocaPages, opts.since, opts.until, today, QM);
  const fu = fieldUsage(inventoryPages, split.daily);
  const keyNames = await resolveKeyNames(stuck, vocaPages, opts.fast);

  const markdown = renderMarkdown({
    meta: {
      since: opts.since,
      until: opts.until,
      child: opts.child,
      fast: opts.fast,
      activityCount: split.activity.length,
      dailyCount: split.daily.length,
      adminSkipped: split.adminSkipped,
      outOfRange: split.outOfRange,
      brokenLogs: broken,
    },
    errors,
    usage,
    items,
    stuck,
    mathTypes,
    mastery,
    fieldUsage: fu,
    keyNames,
  });

  process.stdout.write(markdown);
  if (opts.save) {
    const savedPath = saveReport(markdown, opts.since, opts.until);
    process.stderr.write(`저장 완료: ${savedPath}\n`);
  }

  if (Object.keys(errors).length > 0) {
    process.exitCode = 2;
  }
}

const isMain =
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMain) {
  main().catch((err) => {
    process.stderr.write(`${err.message}\n`);
    process.exitCode = 2;
  });
}
