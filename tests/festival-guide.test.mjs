// 2026 원신초 학예발표회 안내 화면 계약 및 로직 회귀 시험
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(new URL('..', import.meta.url).pathname.replace(/^\/([A-Z]:)/i, '$1'));
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const lineCount = text => text.split(/\r?\n/).length;

function loadFestivalRuntime() {
  const ctx = { window: {} };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(read('kids/data/festival_2026_data.js'), ctx, { filename: 'festival_2026_data.js' });
  vm.runInContext(read('kids/js/festival_controller.js'), ctx, { filename: 'festival_controller.js' });
  return { data: ctx.FESTIVAL_2026_DATA, guide: ctx.FestivalGuide };
}

test('학예회 파일 4종은 600줄 이하이고 상대 경로·시간표 진입 링크를 지킨다', () => {
  const files = [
    'festival.html',
    'kids/data/festival_2026_data.js',
    'kids/css/festival.css',
    'kids/js/festival_controller.js'
  ];
  for (const rel of files) {
    const src = read(rel);
    assert.ok(lineCount(src) <= 600, `${rel}: 600줄 초과`);
    assert.doesNotMatch(src, /\/kids-school\//, `${rel}: 루트 절대 경로 금지`);
  }
  const timetableHtml = read('timetable.html');
  assert.match(timetableHtml, /href="festival\.html"/, 'timetable.html에 festival.html 링크 없음');
  const festHtml = read('festival.html');
  assert.match(festHtml, /href="kids\/css\/festival\.css\?v=/, 'festival.css 상대 경로·버전 누락');
  assert.match(festHtml, /src="kids\/data\/festival_2026_data\.js\?v=/, 'festival_2026_data.js 누락');
  assert.match(festHtml, /src="kids\/js\/festival_controller\.js\?v=/, 'festival_controller.js 누락');
  assert.doesNotMatch(festHtml, /<summary[^>]*>[\s\S]*?<h[1-6]\b/i, 'summary 안에 헤딩 금지');
});

test('프로그램 17개·중간 휴식 1개와 민서·민수·10번 확인 필요 배정이 정확하다', () => {
  const { data } = loadFestivalRuntime();
  const stages = data.programs.filter(p => p.order > 0);
  const breaks = data.programs.filter(p => p.part === 'break');
  assert.equal(stages.length, 17);
  assert.equal(breaks.length, 1);
  assert.deepEqual(Array.from(stages.filter(p => p.child === 'minseo'), p => p.order), [1, 6, 11, 13]);
  assert.deepEqual(Array.from(stages.filter(p => p.child === 'minsu'), p => p.order), [5, 12]);
  assert.deepEqual(Array.from(stages.filter(p => p.child === 'check'), p => p.order), [10]);
});

test('민수·민서 중심 그룹핑과 다음 우리 아이 무대·D-day 계산이 정확하다', () => {
  const { data, guide } = loadFestivalRuntime();
  const blocks = guide.groupForFocusView(data.programs);
  const betweenRanges = Array.from(
    blocks.filter(b => b.type === 'between'),
    b => `${b.items[0].order}-${b.items.at(-1).order}`
  );
  assert.deepEqual(betweenRanges, ['2-4', '7-9', '14-17']);

  const first = guide.findNextFamilyStage(data.programs, new Set());
  assert.equal(first.next.order, 1);
  assert.equal(first.waitingCount, 0);

  const afterOne = guide.findNextFamilyStage(data.programs, new Set([1, 2]));
  assert.equal(afterOne.next.order, 5);
  assert.equal(afterOne.waitingCount, 2); // 3, 4번 남음

  const allFamilyDone = guide.findNextFamilyStage(data.programs, new Set([1, 5, 6, 10, 11, 12, 13]));
  assert.equal(allFamilyDone.next, null);

  assert.equal(guide.computeDdayLabel('2026-11-26', new Date(2026, 10, 20, 10, 0)), 'D-6');
  assert.equal(guide.computeDdayLabel('2026-11-26', new Date(2026, 10, 26, 8, 0)), '🎉 오늘 학예회!');
});
