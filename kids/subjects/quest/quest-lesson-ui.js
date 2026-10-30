/** 레슨 화면과 저장 흐름. 기존 러너는 데이터·파트너 콜백만 제공한다. */
(function (root) {
  'use strict';
  const M = () => root.QuestMastery;
  const el = id => document.getElementById(id);
  function counts() {
    return root.QuestLesson.readBiteCounts(localStorage);
  }
  function resolveSubject(params, child) {
    return params.get('subject') || (params.get('lesson') === 'bite' && ['minseo', 'daughter'].includes(child)
    ? root.QuestLesson.pickBiteSubject(counts()) : 'math');
  }
  function speak(text, lang, onEnd) {
    if (lang === 'en') root.speakEnglish?.(text, onEnd);
    else root.speakFairyTTS?.(text, onEnd);
  }
  function ensureStyle() {
    if (el('ql-style')) return;
    const style = document.createElement('style');
    style.id = 'ql-style';
    style.textContent = `
      .ql-panel {
        box-sizing: border-box;
        max-width: 100%;
        padding: 18px;
        border-radius: 24px;
        background: #24113a;
        color: white;
        overflow-wrap: anywhere;
        text-align: center;
      }
      .ql-panel h2 {
        font-size: 24px;
        font-weight: 800;
        margin-bottom: 16px;
      }
      .ql-panel p {
        line-height: 1.7;
        margin-bottom: 12px;
      }
      .ql-panel button {
        box-sizing: border-box;
        min-height: 44px;
        padding: 12px 18px;
        margin: 6px;
        border: 2px solid #ffd1dc;
        border-radius: 18px;
        background: #ff7597;
        color: #fff;
        font-weight: bold;
        max-width: calc(100% - 12px);
        cursor: pointer;
      }
      .ql-panel button:disabled {
        cursor: wait;
        opacity: .6;
      }
      .ql-panel button:focus-visible {
        outline: 3px solid #facc15;
        outline-offset: 3px;
      }
      .ql-flags {
        display: flex;
        justify-content: space-between;
        gap: 4px;
        flex-wrap: wrap;
        font-size: 13px;
        padding-block: 6px;
      }
      .ql-banner {
        position: fixed;
        inset: 25% 12px auto;
        z-index: 99;
        min-height: 72px;
        box-shadow: 0 5px 30px #0008;
      }
      .ql-sticker {
        font-size: 80px;
      }
      .qm-opt-say {
        min-width: 44px;
        min-height: 44px;
      }
      .ql-panel[aria-busy=true] {
        opacity: .8;
      }
      @media (max-width: 400px) {
        .ql-panel {
          padding: 12px;
          border-radius: 18px;
        }
        .ql-panel button {
          display: block;
          width: calc(100% - 12px);
        }
        .ql-flags {
          font-size: 12px;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .ql-banner {
          transition: none;
          animation: none;
        }
      }
    `;
    document.head.append(style);
  }
  function start({
    unit, subj, mode, isMinseo, onCompanion, onExit
  }) {
    ensureStyle();
    const child = unit.child;
    let session, lesson, startedAt, lessonId, closed, logged, solved, token = 0;
    let wrongs, changes, autoTimer, transitionTimer, saveChain = Promise.resolve();
    const box = el('masteryStage');
    function signal(event, detail) {
      onCompanion?.(event, detail);
      if (event === 'combo') banner('✨ ' + detail.combo + ' 콤보!');
    }
    function banner(text, done) {
      document.querySelectorAll('.ql-banner').forEach(n => n.remove());
      clearTimeout(transitionTimer);
      const node = document.createElement('button');
      node.type = 'button';
      node.className = 'ql-panel ql-banner';
      node.textContent = text;
      let removed = false;
      const close = () => {
        if (removed) return;
        removed = true;
        node.remove();
        done?.();
      };
      node.onclick = close;
      document.body.append(node);
      transitionTimer = setTimeout(close, 1100);
    }
    function saveStep() {
      // 같은 버튼을 여러 번 눌러도 단계마다 한 번만 이 경로를 지난다.
      saveChain = saveChain.then(async () => {
        await M().pushChanges(child).catch(e => console.warn('[레슨 진도]', e));
        root.currentSubject = M().SUBJECT_KO[subj];
        await root.grantRewardAndShowUI?.(3, true);
      }).catch(e => console.warn('[레슨 보상]', e));
    }
    function log() {
      if (logged || !solved) return;
      logged = true;
      const s = session.status();
      const summary = `[${mode === 'bite' ? '한입' : '레슨'} ${M().SUBJECT_KO[subj]} ${unit.units?.join('|') || ''} · ${s.answered}문제 · 첫 시도 ${s.firstTries} · 최고 콤보 ${s.maxCombo}] `;
      const report = wrongs.length ? wrongs.join(' // ') : '오답 없음';
      Promise.resolve(root.sendStudyLogToNotion?.({
        childName: isMinseo ? '민서' : '민수', subject: M().SUBJECT_KO[subj], durationMinutes: 0, errorReport: summary + report
      }))
      .catch(e => console.warn('[레슨 일지]', e));
    }
    function begin() {
      token++;
      lesson = root.QuestLesson.buildLesson({
        child, items: unit.items, subj, mode
      });
      if (!root.QuestLesson.validateLesson(lesson)) return false;
      session = root.QuestLesson.createSession(lesson, {
        onCompanion: signal, isMinseo
      });
      startedAt = Date.now();
      lessonId = crypto.randomUUID();
      closed = false;
      logged = false;
      solved = 0;
      wrongs = [];
      changes = [];
      root.StudyActivity?.setPhase('quiz');
      ['classicQuestionCard', 'choicesList', 'feedbackSheet'].forEach(id => el(id).classList.add('hidden'));
      el('checkAnswerBtn').parentElement.classList.add('hidden');
      el('heartIcons').parentElement.classList.add('hidden');
      box.classList.remove('hidden');
      render();
      return true;
    }
    function render() {
      clearTimeout(autoTimer);
      root.stopFairyTTS?.();
      const q = session.current(), s = session.status(), currentToken = token;
      el('feedbackSheet').classList.add('hidden');
      el('stepCounter').textContent = `${session.steps[s.stepIndex].title} · ${s.answered + 1}/${s.total}`;
      el('progressBar').style.width = `${100 * s.answered / s.total}%`;
      const progress = el('masteryProgress');
      progress.classList.remove('hidden');
      progress.replaceChildren();
      const flags = document.createElement('div');
      flags.className = 'ql-flags';
      session.steps.forEach((step, i) => {
        const flag = document.createElement('span');
        flag.textContent = `${i <= s.stepIndex ? '🚩' : '⚑'} ${step.title}`;
        flags.append(flag);
      });
      progress.append(flags);
      root.QuestUIRenderer.render(box, q, {
        theme: isMinseo ? 'minseo' : 'minsu', autoRead: mode === 'bite', speak,
        onPraise: () => root.fairyPraise?.(), onEncourage: () => root.fairyEncourage?.(),
        onDone: result => {
          if (closed || currentToken !== token || !session.finish(result)) return;
          solved++;
          changes.push(...M().applyResult(child, q, result.results));
          result.results.forEach(r => {
            if (r.firstTry && !q.lessonRetry) root.StudyActivity?.recordCorrect(`${lessonId}:${s.answered}:${r.id}`);
          });
          if (!result.firstTry) wrongs.push(`${q.q} ➔ 선택: "${result.wrongPicks?.join(', ') || '힌트 보고 해결'}" / 정답: "${q.items ? q.items.map(i => i.word).join(', ') : q.item.word}"`);
          const next = document.createElement('button');
          next.type = 'button';
          next.className = 'ql-panel';
          next.textContent = '다음으로 🌟';
          next.onclick = () => {
            next.disabled = true;
            const move = session.next();
            if (move.completedStep !== undefined) saveStep();
            if (move.done) return complete();
            if (move.changed) banner(session.steps[move.completedStep].title + ' 완료! ' + session.steps[session.status().stepIndex].title + ' 시작', render);
            else render();
          };
          box.append(next);
        }
      });
    }
    function complete() {
      if (closed) return;
      closed = true;
      clearTimeout(autoTimer);
      root.stopFairyTTS?.();
      // 실제 마지막 입력 직후에 호출하며 paused 전환보다 먼저 기록한다.
      if (isMinseo && mode === 'bite' && lesson.steps[0].questions.length === 3) {
        root.StudyActivity?.recordLessonComplete?.(lessonId, startedAt);
      }
      root.StudyActivity?.setPhase('paused');
      if (isMinseo && mode === 'bite') {
        root.QuestLesson.recordBiteCompletion(localStorage, subj);
      }
      root.dispatchEvent(new CustomEvent('quest-lesson-complete', {
        detail: {
          lessonId, child, mode
        }
      }));
      saveChain.finally(log);
      root.fairyReward?.();
      const panel = document.createElement('div');
      panel.setAttribute('role', 'region');
      panel.setAttribute('aria-label', '레슨 결과');
      panel.className = 'ql-panel';
      const title = document.createElement('h2');
      title.textContent = isMinseo && mode === 'bite' ? '🌸 참 잘했어요!' : '🏆 레슨 완료!';
      panel.append(title);
      const detail = document.createElement('p');
      if (isMinseo && mode === 'bite') {
        detail.className = 'ql-sticker';
        detail.textContent = '🌟';
        panel.append(detail);
        if ((Number(counts().korean) || 0) + (Number(counts().english) || 0) <= 10) {
          const gift = document.createElement('p');
          gift.textContent = '⏰ 놀이 시간 선물!';
          panel.append(gift);
        }
      } else {
        const s = session.status();
        const { advanced, silver, gold } = root.QuestLesson.summarizeChanges(changes);
        detail.textContent = `첫 시도 ${Math.round(100 * s.firstTries / s.answered)}% · 최고 콤보 ${s.maxCombo} · 성장 ${advanced}개 · 🥈 ${silver} · 👑 ${gold} · ${Math.floor((Date.now() - startedAt) / 1000)}초`;
        panel.append(detail);
      }
      const more = document.createElement('button');
      more.type = 'button';
      more.setAttribute('aria-label', mode === 'bite' ? '다음 한입 레슨 시작' : '다음 레슨 시작');
      more.textContent = mode === 'bite' ? '🌸 한 입 더!' : '다음 레슨';
      more.onclick = () => {
        more.disabled = true;
        saveChain.finally(begin);
      };
      const exit = document.createElement('button');
      exit.type = 'button';
      exit.textContent = isMinseo && mode === 'bite' ? '🏠 그만할래' : '연구소로';
      exit.onclick = () => {
        log();
        onExit?.(isMinseo && mode === 'bite');
      };
      panel.append(more, exit);
      box.replaceChildren(panel);
      title.tabIndex = -1;
      title.focus({ preventScroll: true });
      box.scrollIntoView({ block: 'nearest' });
      el('progressBar').style.width = '100%';
    }
    root.addEventListener('pagehide', () => {
      clearTimeout(autoTimer);
      clearTimeout(transitionTimer);
      log();
    });
    return begin();
  }
  root.QuestLessonUI = {
    start, resolveSubject, counts
  };
})(window);
