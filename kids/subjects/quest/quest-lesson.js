/** 레슨 구성과 진행 상태. 출제·숙련도 판정은 QuestMastery에 위임한다. */
(function (root) {
  'use strict';
  const COMPANION_EVENTS = Object.freeze(['correct', 'encourage', 'combo', 'step', 'boss', 'clear']);
  const titles = {
    warmup: '🌱 워밍업', build: '🔨 빌드업', boss: '👑 보스', bite: '🌸 한입 레슨'
  };
  const stateOf = (store, item) => store.items[item.id] || {
    c: 0, s: '', r: ''
  };
  function shuffled(list, rng) {
    const out = [...list];
    for (let i = out.length - 1;
    i > 0;
    i--) {
      const j = Math.floor(rng() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }
  // 단계별 문제 배열은 입력 항목을 변경하지 않고 새로 만든다.
  function buildLesson(opts) {
    const M = root.QuestMastery;
    const {
      child, items, subj
    } = opts;
    const rng = opts.rng || Math.random;
    const today = opts.today || M.todayStr();
    const store = opts.store || M.loadStore(child);
    const bite = opts.mode === 'bite';
    if (items.length < 3) return null;
    const st = it => stateOf(store, it);
    const stages = M.buildStages(items);
    let active = stages.findIndex(stage => stage.some(it => st(it).c < M.SILVER));
    if (active < 0) active = stages.length - 1;
    const current = stages[active];
    const eligible = items.filter(it => !M.isRusty(st(it), today));
    // 전부 왕관인 단원도 보스 복습 항목 하나는 앞 단계에서 소비하지 않는다.
    const reserved = items.filter(it => M.isRusty(st(it), today))
      .sort((a, b) => st(a).r.localeCompare(st(b).r))[0];
    const pool = eligible.length ? eligible : (bite ? items : items.filter(it => it.id !== reserved?.id));
    if (!pool.length) return null;
    const ctx = {
      rng, subj, lang: subj === 'english' ? 'en' : 'ko', maxChunks: child === 'minseo' ? 3 : 5
    };
    const seen = new Set();
    const uses = new Map();
    const credit = q => {
      // 매칭은 구성 항목 중 하나라도 재등장하면 전체를 복습으로 처리한다.
      q.noCredit = q.noCredit || q.itemIds.some(id => seen.has(id));
      q.itemIds.forEach(id => {
        seen.add(id);
        uses.set(id, (uses.get(id) || 0) + 1);
      });
      return q;
    };
    const question = (it, level, flags = {
    }) => credit(M.buildQuestion(it, level, items, ctx, {
      ...flags,
      noCredit: flags.noCredit || (st(it).c >= M.SILVER && !M.isLv3Eligible(st(it), today) && !flags.isRustyReview)
      || (level < 3 && st(it).c >= M.SILVER)
    }));
    const pick = list => shuffled(list.length ? list : pool, rng)
    .sort((a, b) => (uses.get(a.id) || 0) - (uses.get(b.id) || 0) || st(a).c - st(b).c)[0];
    const low = list => list.filter(it => !M.isRusty(st(it), today));
    const words = low(current.filter(it => it.kind === 'word'));
    const sentences = low(current.filter(it => it.kind !== 'word'));
    const step = (key, questions) => ({
      key, title: titles[key], questions
    });
    if (bite) {
      const questions = Array.from({
        length: 3
      }, () => {
        const it = pick(pool);
        return question(it, Math.min(2, M.levelOf(st(it))));
      });
      return {
        steps: [step('bite', questions)], meta: {
          mode: 'bite', activeStage: active, totalStages: stages.length
        }
      };
    }
    const count = items.length >= 9 ? [4, 5, 4] : items.length >= 5 ? [3, 3, 3] : [1, 2, 2];
    if (count.reduce((a, b) => a + b) < 6) {
      const round = M.buildRound(opts);
      return {
          steps: [step('warmup', round.questions.map(credit))], meta: {
          ...round.meta, mode: 'round5', fallback: true
        }
      };
    }
    const warm = [];
    const matching = shuffled(words.filter(it => st(it).c < 3), rng)
    .filter((it, i, arr) => arr.findIndex(x => x.meaning === it.meaning || x.word === it.word) === i).slice(0, 3);
    for (let i = 0;
    i < count[0];
    i++) {
      if (i === 1 && matching.length === 3) warm.push(credit(M.buildMatch(matching, ctx)));
      else {
        const it = pick(words);
        warm.push(question(it, Math.min(2, M.levelOf(st(it)))));
      }
    }
    const build = Array.from({
      length: count[1]
    }, (_, i) => question(pick(i < 2 && sentences.length ? sentences : low(current)), 2));
    const boss = [];
    const rusty = items.filter(it => M.isRusty(st(it), today)).sort((a, b) => st(a).r.localeCompare(st(b).r))[0];
    if (rusty) boss.push(question(rusty, 3, {
      isRustyReview: true
    }));
    const previous = stages.slice(0, active).flat().filter(it => M.isLv3Eligible(st(it), today));
    const challenges = [...previous, ...items.filter(it => M.isLv3Eligible(st(it), today))];
    while (boss.length < count[2]) {
      const it = pick(challenges.length ? challenges : pool);
      const level = boss.filter(q => q.level === 3).length < 3 && M.isLv3Eligible(st(it), today) ? 3 : Math.min(2, M.levelOf(st(it)));
      boss.push(question(it, level));
    }
    const steps = [step('warmup', warm), step('build', build), step('boss', boss)];
    return {
      steps, meta: {
        mode: 'full', activeStage: active, totalStages: stages.length, isTodayAllSilver: steps.every(s => s.questions.every(q => q.noCredit))
      }
    };
  }
  function pickBiteSubject(counts = {
  }) {
    return (Number(counts.english) || 0) < (Number(counts.korean) || 0) ? 'english' : 'korean';
  }
  // 결과 처리와 다음 문제 이동은 서로 다른 사용자 동작이다.
  function createSession(lesson, hooks = {
  }) {
    // 레슨 구성 원본은 변경하지 않고, 재출제 큐를 세션별로 격리한다.
    const steps = lesson.steps.map(s => ({
      ...s, questions: [...s.questions]
    }));
    let stepIndex = 0, index = 0, combo = 0, maxCombo = 0, firstTries = 0, answered = 0;
    let retryCount = 0, settled = false;
    const credited = new Set();
    function signal(event) {
      hooks.onCompanion?.(event, {
        combo, stepIndex, stepTotal: steps.length, isMinseo: !!hooks.isMinseo
      });
    }
    function current() {
      return steps[stepIndex]?.questions[index] || null;
    }
    function finish(result) {
      if (settled || !current()) return false;
      settled = true;
      const q = current();
      answered++;
      if (result.firstTry) {
        firstTries++;
        combo++;
      } else combo = 0;
      maxCombo = Math.max(combo, maxCombo);
      signal(result.firstTry ? 'correct' : 'encourage');
      if ([3, 5, 8].includes(combo)) signal('combo');
      // 한입 레슨은 「딱 3문제」 약속을 지키려고 다시 내지 않는다(오답은 에러리스 안내로 끝).
      if (!result.firstTry && !q.lessonRetry && retryCount < 2 && lesson.meta?.mode !== 'bite') {
        steps[stepIndex].questions.push({
          ...q, noCredit: true, lessonRetry: true
        });
        retryCount++;
      }
      return true;
    }
    function next() {
      if (!settled) return {
        changed: false
      };
      index++;
      settled = false;
      if (index < steps[stepIndex].questions.length) return {
        changed: false
      };
      const completedStep = stepIndex;
      stepIndex++;
      index = 0;
      retryCount = 0;
      if (stepIndex === steps.length) {
        signal('clear');
        return {
          completedStep, done: true
        };
      }
      signal('step');
      if (steps[stepIndex].key === 'boss') signal('boss');
      return {
        completedStep, changed: true
      };
    }
    function creditResults(q, results) {
      return results.map(r => {
        const allowed = !q.noCredit && !credited.has(r.id);
        credited.add(r.id);
        return {
          ...r, firstTry: r.firstTry && allowed
        };
      });
    }
    return {
      steps, current, finish, next, creditResults,
      status: () => ({
        stepIndex, index, combo, maxCombo, firstTries, answered, total: steps.reduce((n, s) => n + s.questions.length, 0)
      })
    };
  }
  /** 저장소 실패는 학습 시작을 막지 않으며, 날짜가 바뀌면 별도 키를 쓴다. */
  function biteCountKey(today = root.QuestMastery.todayStr()) {
    return 'questBiteCount_daughter_' + today;
  }
  function normalizeBiteCounts(value) {
    const count = key => {
      const number = Number(value?.[key]);
      return Number.isSafeInteger(number) && number >= 0 ? number : 0;
    };
    return {
      korean: count('korean'),
      english: count('english')
    };
  }
  function readBiteCounts(storage, today) {
    try {
      return normalizeBiteCounts(JSON.parse(storage.getItem(biteCountKey(today)) || '{}'));
    } catch {
      return normalizeBiteCounts(null);
    }
  }
  function recordBiteCompletion(storage, subject, today) {
    const counts = readBiteCounts(storage, today);
    if (!['korean', 'english'].includes(subject)) return counts;
    counts[subject]++;
    try {
      storage.setItem(biteCountKey(today), JSON.stringify(counts));
    } catch {
      // 서버 보상 계산은 로컬 횟수와 독립적이다.
    }
    return counts;
  }
  /** 결과 화면은 변경 항목을 ID로 합쳐 같은 항목을 여러 번 세지 않는다. */
  function summarizeChanges(changes) {
    const advanced = new Set();
    const silver = new Set();
    const gold = new Set();
    for (const change of changes) {
      if (change.after.c > change.before.c) advanced.add(change.id);
      if (change.before.c < root.QuestMastery.SILVER && change.after.c === root.QuestMastery.SILVER) {
        silver.add(change.id);
      }
      if (change.before.c < root.QuestMastery.GOLD && change.after.c === root.QuestMastery.GOLD) {
        gold.add(change.id);
      }
    }
    return {
      advanced: advanced.size,
      silver: silver.size,
      gold: gold.size
    };
  }
  /**
   * 구성을 받은 쪽에서 계약을 검사한다. 이전 5문제 폴백에는 이전 규칙을 적용한다.
   * 실패한 레슨을 일부만 렌더링하면 보상·단계 저장 경계가 달라지므로 시작 전에 거부한다.
   */
  function validateLesson(lesson) {
    if (!lesson || !Array.isArray(lesson.steps) || !lesson.steps.length) return false;
    const bite = lesson.meta.mode === 'bite';
    const classic = lesson.meta.fallback === true;
    const credited = new Set();
    let levelThree = 0;
    if (bite && lesson.steps.length !== 1) return false;
    for (const step of lesson.steps) {
      if (!Array.isArray(step.questions) || !step.questions.length) return false;
      for (const question of step.questions) {
        if (!Array.isArray(question.itemIds) || !question.itemIds.length) return false;
        if (!classic && question.level === 3) {
          levelThree++;
          if (bite || step.key !== 'boss' || levelThree > 3) return false;
        }
        if (bite && question.isRustyReview) return false;
        if (!classic && !question.noCredit) {
          for (const id of question.itemIds) {
            if (credited.has(id)) return false;
            credited.add(id);
          }
        }
      }
    }
    return !bite || lesson.steps[0].questions.length === 3;
  }
  root.QuestLesson = {
    COMPANION_EVENTS,
    buildLesson,
    pickBiteSubject,
    createSession,
    biteCountKey,
    normalizeBiteCounts,
    readBiteCounts,
    recordBiteCompletion,
    summarizeChanges,
    validateLesson
  };
})(typeof window !== 'undefined' ? window : globalThis);
