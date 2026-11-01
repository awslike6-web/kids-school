// 공용화 승인 변경·두 사본의 합집합·자동 로드 계약을 운영 접속 없이 검사한다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { sandbox, entry, seed, rewardState } from './reward-grant-sandbox.mjs';
import { beforeReward, beforeLogger, extractedReward, extractedLogger, sharedSource, normalize, version } from './reward-grant-approved-edits.mjs';
const read = file => fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8');

test('보상 본체와 두 껍데기는 고정 원문에 명시된 승인 변경만 적용하고 각각 600줄 이하', () => {
  for (const [file, expected] of [
    ['reward-grant.js', sharedSource()],
    ['notion-reward.js', extractedReward(beforeReward)],
    ['notion-study-logger.js', extractedLogger(beforeLogger)]
  ]) {
    const actual = read('kids/core/' + file);
    assert.equal(normalize(actual), normalize(expected), file);
    assert.ok(actual.split(/\r?\n/).length <= 600, file);
  }
});

test('helper 로더와 직접 로더·러너가 새 버전을 참조한다', () => {
  assert.ok(read('kids/core/notion-helper.js').includes('notion-study-logger.js?v=' + version));
  for (const name of ['notion-reward.js', 'notion-study-logger.js']) {
    assert.ok(read('kids/core/' + name).includes('reward-grant.js?v=' + version));
  }
  for (const name of ['notion-reward.js', 'notion-reward-quiz.js', 'notion-reward-discussion.js']) {
    assert.ok(read('quest_runner.html').includes(name + '?v=' + version));
  }
});

for (const route of ['reward', 'logger']) {
  test(`${route}: 기존 전역과 네임스페이스의 위임 API를 유지한다`, () => {
    const sb = sandbox({ route });
    assert.equal(typeof sb.context.grantRewardAndShowUI, 'function');
    if (route === 'logger') assert.equal(sb.context.NotionStudyLogger.grantRewardAndShowUI, sb.context.grantRewardAndShowUI);
    assert.equal(typeof sb.context.calculateLevelInfo, 'function');
    assert.equal(typeof sb.context.sendStudyLogToNotion, 'function');
  });
  test(`${route}: 두 학습설정 동기화를 현재 학생에게만 적용한다`, async () => {
    const settings = [];
    const sb = sandbox({ route, setup: ctx => { ctx.SettingsManager = { syncFromCloud: props => settings.push(JSON.stringify(props)) }; } });
    const props = [{ plain_text: '{"영어":"auto"}' }];
    sb.api.pages['민수'].properties['학습설정'] = props;
    await sb.grant(3, true);
    assert.deepEqual(settings, [JSON.stringify(props)]);
    assert.equal(sb.flow.length, 1);
    seed(sb, [entry('1')]);
    sb.store.setItem('currentUser', 'daughter');
    await sb.flush();
    assert.equal(settings.length, 1);
    assert.equal(sb.flow.length, 1);
  });

  for (const stage of ['tracker', 'global', 'storage']) {
    test(`${route}: 스크린타임 ${stage} 대체 경로는 PATCH 성공 뒤 한 번만 적용한다`, async () => {
      const globalCalls = [];
      const sb = sandbox({ route });
      sb.context.recordDailyRewardEarned = (...args) => globalCalls.push(args);
      if (stage !== 'tracker') delete sb.context.ScreenTimeTracker.recordDailyRewardEarned;
      if (stage === 'storage') delete sb.context.recordDailyRewardEarned;
      sb.api.patchFailure = 'http';
      assert.equal(await sb.grant(3, true), false);
      assert.equal(sb.earned.length, 0);
      assert.equal(globalCalls.length, 0);
      assert.equal([...sb.store.values.keys()].filter(key => key.startsWith('MINMIN_DAILY_REWARD_SUM_')).length, 0);
      sb.api.patchFailure = null;
      await sb.flush(); await sb.flush();
      assert.equal(sb.earned.length, stage === 'tracker' ? 1 : 0);
      assert.equal(globalCalls.length, stage === 'global' ? 1 : 0);
      const sums = [...sb.store.values].filter(([key]) => key.startsWith('MINMIN_DAILY_REWARD_SUM_'));
      assert.equal(sums.length, stage === 'storage' ? 2 : 0);
      assert.ok(sums.every(([, value]) => value === '3'));
    });
  }

  for (const helper of [true, false]) {
    for (const base of ['/kids-school/quest_runner.html', '/quest_runner.html']) {
      test(`${route}: 로비 주소 helper=${helper}, 경로=${base}`, async () => {
        const html = [];
        const sb = sandbox({ route });
        sb.context.location = { pathname: base };
        sb.context.showRewardModal = text => html.push(text);
        sb.context.updateRewardModal = text => html.push(text);
        if (helper) sb.context.getRelativeLobbyUrl = () => '../../../lobby.html';
        else sb.context.getRelativeLobbyUrl = undefined;
        const expected = helper ? '../../../lobby.html' : base.startsWith('/kids-school/') ? '/kids-school/lobby.html' : '/lobby.html';
        const click = () => {
          const markup = html.at(-1);
          const code = markup.match(/onclick="([^"]+)"/)[1];
          vm.runInContext(code, sb.context);
          assert.equal(sb.context.location.href, expected);
        };
        await sb.grant(3, false); click();
        sb.api.pages['민수'].properties['오늘 획득_영어'].number = 100;
        await sb.grant(3, false); click();
        sb.api.empty = true;
        await sb.grant(3, false); click();
      });
    }
  }

  for (const silent of [true, false]) {
    for (const modal of [true, false]) {
      test(`${route}: 대기열 안내 silent=${silent}, modal=${modal}`, async () => {
        const html = [];
        const sb = sandbox({ route });
        if (modal) {
          sb.context.showRewardModal = text => html.push(text);
          sb.context.updateRewardModal = text => html.push(text);
        }
        sb.api.queryFailure = 'network';
        assert.equal(await sb.grant(3, silent), false);
        assert.equal(Object.keys(sb.queue()).length, 1);
        assert.deepEqual(sb.alerts, []);
        if (!silent && modal) assert.equal(html.at(-1), '인터넷이 연결되면 보상이 자동으로 들어가요');
        else assert.deepEqual(html, []);
        assert.doesNotMatch(html.join(''), /칼럼|보상 저장 실패/);
      });
    }
  }

  test(`${route}: 대기열에 넣지 않은 실패에는 기존 실패 안내를 유지한다`, async () => {
    const sb = sandbox({ route });
    sb.api.empty = true;
    assert.equal(await sb.grant(3, false), false);
    assert.deepEqual(sb.queue(), {});
    assert.match(sb.alerts[0], /칼럼/);
  });

  test(`${route}: 대기열 저장 실패를 저장 성공으로 안내하지 않는다`, async () => {
    const sb = sandbox({ route });
    const save = sb.store.setItem.bind(sb.store);
    sb.store.setItem = (key, value) => { if (key === 'MINMIN_REWARD_QUEUE_V1') throw Error('모의 용량 초과'); save(key, value); };
    sb.api.patchFailure = 'http';
    assert.equal(await sb.grant(3, false), false);
    assert.deepEqual(sb.queue(), {});
    assert.match(sb.alerts[0], /칼럼/);
  });

  for (const daughter of [false, true]) {
    test(`${route}: ${daughter ? '민서' : '민수'} voca·부스트·소원권 성공 결과는 변경 전과 같다`, async () => {
      const options = { route, boost: () => ({ limit: 150, expMultiplier: 1.2 }) };
      const before = sandbox({ ...options, old: true }), after = sandbox(options);
      before.context.fetch = (url, opts) => before.api.fetch(opts.method === 'POST' && !url.includes('?') ? url + '?force=true' : url, opts);
      for (const sb of [before, after]) {
        if (daughter) { sb.store.setItem('currentUser', 'daughter'); sb.store.setItem('currentTheme', '슬라임'); }
        sb.store.setItem('MINMIN_CUMULATIVE_WEALTH_' + (daughter ? '민서' : '민수'), '148');
        assert.equal(await sb.grant(3, false, 'voca'), true);
      }
      assert.deepEqual(after.api.patches(), before.api.patches());
      const state = sb => rewardState(sb).map(([key, value]) => [key, key.includes('CACHE') ? { ...JSON.parse(value), updatedAt: 0 } : value]);
      assert.deepEqual(state(after), state(before));
      assert.deepEqual(after.earned, before.earned);
      assert.deepEqual(after.alerts, before.alerts);
      assert.equal(after.timers.length, before.timers.length);
    });
  }

  for (const mode of ['current', 'fallback', 'existing']) {
    test(`${route}: ${mode} 자동 로드는 중복 삽입 없이 기다리고 최초 호출 맥락을 보존한다`, async () => {
      const injected = [], listeners = {};
      const existing = { src: 'https://example.invalid/kids/core/reward-grant.js?v=' + version, addEventListener: (type, fn) => { listeners[type] = fn; } };
      const owner = { src: 'https://example.invalid/kids/core/notion-' + (route === 'reward' ? 'reward' : 'study-logger') + '.js' };
      const sb = sandbox({ route, preload: false, setup(ctx) {
        ctx.StudyLogStore = {}; ctx.StudyActivity = {};
        Object.assign(ctx.document, {
          currentScript: mode === 'current' ? owner : null,
          scripts: mode === 'existing' ? [owner, existing] : [owner],
          createElement: () => ({}),
          head: { appendChild(script) { injected.push(script); ctx.document.scripts.push(script); } }
        });
      } });
      const pending = sb.grant(3, true, 'voca');
      assert.equal(sb.api.requests.length, 0);
      assert.equal(injected.length, mode === 'existing' ? 0 : 1);
      if (injected.length) {
        assert.equal(injected[0].src, existing.src);
        assert.equal(injected[0].async, false);
      }
      sb.store.setItem('currentUser', 'daughter'); sb.context.currentSubject = '국어';
      sb.store.setItem('currentTheme', '슬라임');
      sb.loadShared();
      if (mode === 'existing') listeners.load(); else injected[0].onload();
      assert.equal(await pending, true);
      assert.ok(sb.api.patches()[0].url.endsWith('/민수'));
      assert.equal(sb.api.patches()[0].body.properties['용어 경험치_영어'].number, 3);
    });
  }

  test(`${route}: 모듈 로드 실패는 false, 다음 호출은 다시 로드한다`, async () => {
    const scripts = [];
    const sb = sandbox({ route, preload: false, setup(ctx) {
      ctx.StudyLogStore = {}; ctx.StudyActivity = {};
      ctx.document.currentScript = { src: 'https://example.invalid/kids/core/notion-' + (route === 'reward' ? 'reward' : 'study-logger') + '.js' };
      ctx.document.createElement = () => ({});
      ctx.document.head = { appendChild: script => scripts.push(script) };
    } });
    const first = sb.grant(3, true);
    scripts[0].onerror();
    assert.equal(await first, false);
    assert.equal(sb.api.requests.length, 0);
    const second = sb.grant(3, true);
    assert.equal(scripts.length, 2);
    sb.loadShared(); scripts[1].onload();
    assert.equal(await second, true);
  });
}

test('공용 모듈은 새 전역 하나만 만들며 helper의 실제 미션·오버레이와 충돌하지 않는다', () => {
  const sb = sandbox();
  for (const file of ['mission-reward-engine.js', 'quiz-feedback-overlay.js']) vm.runInContext(read('kids/core/' + file), sb.context);
  const before = new Set(Object.keys(sb.context));
  sb.context.MinminRewardGrant = undefined;
  sb.loadShared();
  assert.deepEqual(Object.keys(sb.context).filter(key => !before.has(key)), []);
  assert.deepEqual(Object.keys(sb.context.MinminRewardGrant).sort(), ['flushQueue', 'grant']);
  // IIFE 내부 이름과 같은 최상위 lexical 이름을 선언해도 충돌하지 않는다.
  assert.doesNotThrow(() => vm.runInContext('const QUEUE_KEY = 1; let flushing = 2; const pending = 3;', sb.context));
});

test('load 뒤 늦게 도착한 공용 모듈도 저장된 항목을 재지급하며 재실행은 중복하지 않는다', async () => {
  const sb = sandbox();
  seed(sb, [entry('1')]);
  sb.context.MinminRewardGrant = undefined;
  sb.context.document.readyState = 'complete';
  sb.loadShared(); sb.loadShared();
  await sb.context.MinminRewardGrant.flushQueue();
  assert.equal(sb.api.patches().length, 1);
  assert.deepEqual(sb.queue(), {});
});
