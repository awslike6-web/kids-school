// 보상 모듈 분리 규칙: 머리 주석·줄 상한·HTML 로드·helper 동시 로드 금지·옛 참조·공개 API·이벤트·부분 로드.
// 2026-11-14: 얼린 원본(tests/fixtures/notion-reward-split)에 승인 변경을 덧입혀 원문·실행 결과를 대조하던
// 시험은 정상 수정마다 원본도 고쳐야 해 뺐다. 보상 지급 동작은 reward-grant-shared.test.mjs가 계속 본다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { root, read, lineCount, assertLoadsInOrder, assertPublicApi } from './split-rules.mjs';

const names = ['notion-reward.js', 'notion-reward-quiz.js', 'notion-reward-discussion.js'];
const files = names.map(name => `kids/core/${name}`);
const sources = files.map(read);
// 화면·다른 코어가 부르는 공개 함수(추가는 자유, 이름 변경·삭제만 실패)
const PUBLIC_API = ['sendStudyLogToNotion', 'grantRewardAndShowUI', 'setupDebouncedSTT',
  'rewardQuizCorrect', 'finalizeQuizRewardSession', 'processDiscussionAiReply', 'grantVocaDwellReward'];

test('세 파일은 지정 머리 주석을 가지며 각각 600줄 이하이다', () => {
  sources.forEach((source, index) => {
    assert.ok(lineCount(source) <= 600, `${files[index]}: 600줄 초과`);
    const firstNewline = source.indexOf('\n');
    assert.ok(firstNewline >= 0);
    const header = source.slice(0, firstNewline).replace(/\r$/, '');
    assert.ok(header.startsWith(`// kids/core/${names[index]} - notion-reward.js 분리 ${index + 1}/3: `));
    assert.ok(header.endsWith(' (순서대로 로드)'));
  });
});

for (const [file, base] of [['quest_runner.html', './kids/core/']]) {
  test(`${file}: 세 태그를 상대 경로·같은 버전·지정 순서로 연달아 한 번씩 싣는다`, () => {
    const html = read(file);
    assertLoadsInOrder(html, 'script', names.map(name => base + name), file);
    for (const name of names) assert.ok(fs.existsSync(path.resolve(root, path.dirname(file), base + name)));
  });
}

// notion-helper.js는 같은 이름을 선언하는 mission-reward-engine.js·quiz-feedback-overlay.js를 싣는다.
// 한 화면에 notion-reward*.js를 함께 실으면 const 중복 선언으로 한쪽 파일 전체가 실행되지 않는다(voca.html, 2026-10-31).
test('notion-helper.js를 싣는 화면은 notion-reward*.js를 함께 싣지 않는다', () => {
  const walk = dir => fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(entry => {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(file);
    return entry.name.endsWith('.html') ? [file] : [];
  });
  const pages = [...fs.readdirSync(root).filter(file => file.endsWith('.html')), ...walk('kids')];
  for (const file of pages) {
    const html = read(file);
    if (/<script[^>]*src=["'][^"']*notion-helper.js/.test(html)) {
      assert.doesNotMatch(html, /<script[^>]*src=["'][^"']*notion-reward/, file);
    }
  }
});

test('운영 소스에 이전 버전의 보상 스크립트 참조가 남지 않는다', () => {
  const walk = dir => fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(entry => {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(file);
    return /\.(?:html|js|mjs|cjs)$/.test(entry.name) ? [file] : [];
  });
  const rootFiles = fs.readdirSync(root).filter(file => /\.(?:html|js|mjs|cjs)$/.test(file));
  for (const file of [...rootFiles, ...walk('kids'), ...walk('scripts')]) {
    assert.doesNotMatch(read(file), /notion-reward[^\s"'<>]*\?v=20261024-1\b/, file);
  }
});

function sandbox(mode) {
  const events = [];
  const injected = [];
  const unexpected = name => () => { throw new Error(`로드 중 예상하지 않은 접근: ${name}`); };
  const source = 'https://example.invalid/kids/core/notion-reward.js?v=test';
  const register = (type, callback) => {
    assert.equal(typeof callback, 'function');
    events.push(type);
  };
  const context = {
    URL,
    localStorage: { getItem: unexpected('getItem'), setItem: unexpected('setItem') },
    fetch: unexpected('fetch'),
    setTimeout: unexpected('setTimeout'),
    addEventListener: register,
    document: {
      currentScript: mode === 'current' || mode === 'preloaded' ? { src: source } : null,
      scripts: mode === 'fallback' ? [{ src: source }] : [],
      createElement: tag => {
        assert.equal(tag, 'script');
        return {};
      },
      head: { appendChild: script => { injected.push({ src: script.src, async: script.async }); } },
      getElementById: unexpected('getElementById'),
      addEventListener: unexpected('document.addEventListener')
    }
  };
  // 실제 클래식 스크립트처럼 window와 전역 객체를 같은 객체로 둔다.
  context.window = context;
  if (mode === 'preloaded') {
    context.StudyActivity = {};
    context.StudyLogStore = {};
  }
  vm.createContext(context);
  vm.runInContext(read('kids/core/reward-grant.js'), context);
  return { context, events, injected };
}

// 공용 로더가 같은 폴더의 학습일지 모듈 두 개를 버전 붙여 순서대로 싣는다(버전 값 자체는 자유).
function assertInjected(injected, mode) {
  if (mode === 'none' || mode === 'preloaded') return assert.deepEqual(injected, []);
  assert.deepEqual(injected.map(item => [item.src.split('?')[0], item.async]),
    ['study-activity.js', 'study-log-store.js'].map(name => [`https://example.invalid/kids/core/${name}`, false]));
  for (const item of injected) assert.match(item.src, /\?v=[^&]+$/, `버전 없는 동적 로드: ${item.src}`);
}

for (const mode of ['none', 'current', 'fallback', 'preloaded']) {
  test(`${mode}: 전체 로드 후 공개 함수·이벤트·공용 로더·상수가 갖춰진다`, () => {
    const split = sandbox(mode);
    sources.forEach((source, index) => vm.runInContext(source, split.context, { filename: files[index] }));
    assertPublicApi(split.context, PUBLIC_API, mode);
    assert.deepEqual(split.events, ['load', 'pagehide', 'popstate', 'beforeunload']);
    assertInjected(split.injected, mode);
    // 최상위 const는 window 속성이 아니므로 컨텍스트 안에서 읽는다.
    assert.equal(typeof vm.runInContext('CONJUNCTION_GRADING_GUARDRAIL', split.context), 'string');
    assert.ok(vm.runInContext('DISCUSSION_STOP_WORDS.size', split.context) > 0);
  });

  for (const count of [1, 2]) {
    test(`${mode}: 앞 ${count}개만 로드해도 뒤 파일 호출 없이 실행된다`, () => {
      const sb = sandbox(mode);
      for (let index = 0; index < count; index++) {
        assert.doesNotThrow(() => vm.runInContext(sources[index], sb.context, { filename: files[index] }));
      }
      assert.deepEqual(sb.events, ['load']);
      assertInjected(sb.injected, mode);
      assert.equal(typeof sb.context.setupDebouncedSTT, count === 1 ? 'undefined' : 'function');
      assert.equal(typeof sb.context.processDiscussionAiReply, 'undefined');
    });
  }
}
