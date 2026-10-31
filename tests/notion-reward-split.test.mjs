// 보상 모듈 분리: 고정 원본·참조·전역 API·이벤트·부분 로드 안전성을 검사한다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const names = ['notion-reward.js', 'notion-reward-quiz.js', 'notion-reward-discussion.js'];
const files = names.map(name => `kids/core/${name}`);
const fixture = read('tests/fixtures/notion-reward-split/notion-reward.js');
const sources = files.map(read);
const version = '?v=20261031-reward-split';
// 수학 분리 시험과 동일: 줄바꿈·줄 끝 공백·마지막 개행만 정규화한다.
const normalize = text => text.replace(/\r\n/g, '\n').replace(/[\t ]+$/gm, '').replace(/\n+$/, '');

test('세 파일은 지정 머리 주석을 가지며 각각 600줄 이하이고 원문을 보존한다', () => {
  const bodies = sources.map((source, index) => {
    assert.ok(source.split(/\r?\n/).length <= 600, `${files[index]}: 600줄 초과`);
    const firstNewline = source.indexOf('\n');
    assert.ok(firstNewline >= 0);
    const header = source.slice(0, firstNewline).replace(/\r$/, '');
    assert.ok(header.startsWith(`// kids/core/${names[index]} - notion-reward.js 분리 ${index + 1}/3: `));
    assert.ok(header.endsWith(' (순서대로 로드)'));
    return source.slice(firstNewline + 1);
  });
  assert.equal(normalize(bodies.join('')), normalize(fixture));
});

for (const [file, base] of [['quest_runner.html', './kids/core/']]) {
  test(`${file}: 세 태그를 상대 경로·같은 버전·지정 순서로 연달아 한 번씩 싣는다`, () => {
    const html = read(file);
    const expected = names.map(name => `<script src="${base}${name}${version}"></script>`);
    const loaded = [...html.matchAll(/<script\b[^>]*\bsrc=["'][^"']*notion-reward[^"']*["'][^>]*>\s*<\/script>/g)]
      .map(match => match[0]);
    assert.deepEqual(loaded, expected);
    const start = html.indexOf(expected[0]);
    const end = html.indexOf(expected[2]) + expected[2].length;
    assert.equal(html.slice(start, end).replace(/>\s+</g, '><'), expected.join(''));
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
    if (/<script[^>]*src=["'][^"']*notion-helper.js/.test(html)) {
      assert.doesNotMatch(html, /<script[^>]*src=["'][^"']*notion-reward/, file);
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
  const source = `https://example.invalid/kids/core/notion-reward.js${version}`;
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
  const initialNames = new Set(Object.keys(context));
  return { context, events, injected, initialNames };
}

function snapshot({ context, events, injected, initialNames }) {
  const added = Object.keys(context).filter(name => !initialNames.has(name)).sort();
  return {
    functions: added.filter(name => typeof context[name] === 'function'),
    windowNames: Object.keys(context.window).filter(name => !initialNames.has(name)).sort(),
    events,
    injected
  };
}

function expectedScripts(mode) {
  return mode === 'current' || mode === 'fallback'
    ? ['study-activity.js', 'study-log-store.js'].map(name => ({
      src: `https://example.invalid/kids/core/${name}?v=20261030-lesson`, async: false
    }))
    : [];
}

for (const mode of ['none', 'current', 'fallback', 'preloaded']) {
  test(`${mode}: 전체 로드 후 전역 함수·window 이름·이벤트·공용 로더가 원본과 같다`, () => {
    const original = sandbox(mode);
    const split = sandbox(mode);
    vm.runInContext(fixture, original.context, { filename: '원본 fixture' });
    sources.forEach((source, index) => vm.runInContext(source, split.context, { filename: files[index] }));
    const result = snapshot(split);
    assert.deepEqual(result, snapshot(original));
    assert.deepEqual(result.events, ['pagehide', 'popstate', 'beforeunload']);
    assert.deepEqual(result.injected, expectedScripts(mode));
    for (const name of ['sendStudyLogToNotion', 'grantRewardAndShowUI', 'setupDebouncedSTT',
      'rewardQuizCorrect', 'finalizeQuizRewardSession', 'processDiscussionAiReply', 'grantVocaDwellReward']) {
      assert.ok(result.functions.includes(name), `공개 함수 누락: ${name}`);
    }
    // 최상위 const는 window 속성이 아니므로 컨텍스트 안에서 별도로 비교한다.
    for (const expression of ['CONJUNCTION_GRADING_GUARDRAIL', 'Array.from(DISCUSSION_STOP_WORDS).join("|")']) {
      assert.equal(vm.runInContext(expression, split.context), vm.runInContext(expression, original.context));
    }
  });

  for (const count of [1, 2]) {
    test(`${mode}: 앞 ${count}개만 로드해도 뒤 파일 호출 없이 실행된다`, () => {
      const sb = sandbox(mode);
      for (let index = 0; index < count; index++) {
        assert.doesNotThrow(() => vm.runInContext(sources[index], sb.context, { filename: files[index] }));
      }
      assert.deepEqual(sb.events, []);
      assert.deepEqual(sb.injected, expectedScripts(mode));
      assert.equal(typeof sb.context.setupDebouncedSTT, count === 1 ? 'undefined' : 'function');
      assert.equal(typeof sb.context.processDiscussionAiReply, 'undefined');
    });
  }
}
