// 🧩 가족 출제 퀴즈 풀이방 — 전역 window.FamilyQuizPlay (명세: docs/family_quiz_spec.md §5-2)
// 민서가 오빠 문제를 푸는 화면. 출제실의 「민서처럼 풀어 보기」도 같은 playRound를 record:false로 쓴다.
// 에러리스: 하트·감점 없음. 보기는 window.QuizChoices.arrange로 섞고 원래 번호(0 = 정답)로 채점한다.
// 아이가 쓴 글은 textContent로만 넣는다. 음성은 speakFairyTTS·fairyPraise·fairyEncourage·fairyReward만 쓴다.
(function () {
  'use strict';
  if (window.FamilyQuizPlay) return;

  const REASON_ICONS = { '답이 이상해요': '🤔', '무슨 말인지 모르겠어요': '❓', '글자가 틀렸어요': '✏️' };
  const SPEAK_FALLBACK_MS = 2500;

  function h(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text != null) el.textContent = text;
    return el;
  }

  function button(className, text, onClick) {
    const el = h('button', className, text);
    el.type = 'button';
    if (onClick) el.addEventListener('click', onClick);
    return el;
  }

  const call = (name, ...args) => {
    try { if (typeof window[name] === 'function') return window[name](...args); } catch (e) { /* 소리는 없어도 계속 */ }
    return undefined;
  };
  const stop = () => call('stopFairyTTS');

  // 읽어 주고 끝나면 then. 음성이 끝 신호를 안 주는 기기를 위해 2.5초 뒤에도 한 번만 넘어간다.
  function speakThen(text, then) {
    let done = false;
    const finish = () => { if (!done) { done = true; if (then) then(); } };
    stop();
    if (typeof window.speakFairyTTS === 'function') {
      try { window.speakFairyTTS(String(text || ''), finish); } catch (e) { finish(); return; }
      setTimeout(finish, SPEAK_FALLBACK_MS);
    } else {
      finish();
    }
  }

  function arrange(choices) {
    if (window.QuizChoices && typeof window.QuizChoices.arrange === 'function') return window.QuizChoices.arrange(choices);
    return choices.map((text, index) => ({ text, index }));
  }

  const josaIya = word => {
    const last = String(word || '').trim().slice(-1);
    const code = last.charCodeAt(0) - 0xac00;
    return code >= 0 && code <= 11171 && code % 28 !== 0 ? '이야' : '야';
  };

  // 한 문제. onFinish({ result, report })
  function renderQuestion(stage, quiz, position, total, onFinish) {
    stage.replaceChildren();
    const choices = window.FamilyQuiz.choicesOf(quiz);
    const order = arrange(choices);
    let wrongCount = 0;
    let finished = false;
    let report = '';

    const card = h('section', 'fq-card');
    const top = h('div', 'fq-card__top');
    top.append(h('span', 'fq-card__count', `🧩 오빠가 낸 문제 ${position}/${total}`));
    const replay = button('fq-icon-btn', '🔊', () => speakThen(quiz.question));
    replay.setAttribute('aria-label', '문제 다시 듣기');
    const flag = button('fq-icon-btn fq-flag', '🚩 이상해요', () => openReport());
    top.append(replay, flag);
    const question = h('p', 'fq-question', quiz.question);
    const list = h('div', 'fq-choices');
    const help = h('p', 'fq-help');
    help.hidden = true;
    const footer = h('div', 'fq-footer');
    card.append(top, question, list, help, footer);
    stage.appendChild(card);

    const buttons = order.map((item, pos) => {
      const b = button('fq-choice', '', () => choose(item, b));
      b.append(h('span', 'fq-choice__num', String(pos + 1)), h('span', 'fq-choice__text', item.text));
      list.appendChild(b);
      return b;
    });
    const correctButton = buttons[order.findIndex(item => item.index === 0)];

    function showAnswer(withHint) {
      buttons.forEach(b => { if (b !== correctButton) b.disabled = true; });
      correctButton.classList.add('is-guide');
      const line = quiz.hint || `정답은 ${quiz.answer}${josaIya(quiz.answer)}!`;
      help.textContent = `💡 ${line}`;
      help.hidden = false;
      if (withHint) speakThen(line);
    }

    function finish(result) {
      if (finished) return;
      finished = true;
      buttons.forEach(b => { b.disabled = true; });
      flag.disabled = true;
      correctButton.classList.add('is-correct');
      footer.replaceChildren(button('fq-next', position < total ? '다음 문제 ➡️' : '끝! 🎉', () => { stop(); onFinish({ result, report }); }));
    }

    function choose(item, b) {
      if (finished || b.disabled) return;
      if (item.index === 0) {
        const result = report ? '도움받음' : wrongCount === 0 ? '한번에' : wrongCount === 1 ? '두번째에' : '도움받음';
        b.classList.add('is-correct');
        speakThen(item.text, () => call('fairyPraise'));
        finish(result);
        return;
      }
      wrongCount += 1;
      b.disabled = true;
      b.classList.add('is-wrong');
      if (wrongCount >= 2) speakThen(item.text, () => showAnswer(true));
      else speakThen(item.text, () => call('fairyEncourage'));
    }

    function openReport() {
      if (finished) return;
      stop();
      const sheet = h('div', 'fq-sheet');
      sheet.append(h('p', 'fq-sheet__title', '어디가 이상해?'));
      window.FamilyQuiz.REPORT_REASONS.forEach(reason => {
        sheet.appendChild(button('fq-reason', `${REASON_ICONS[reason] || '🚩'} ${reason}`, () => {
          report = reason;
          sheet.remove();
          flag.classList.add('is-sent');
          flag.textContent = '🚩 알려 줬어요';
          speakThen('오빠한테 알려 줄게!');
          showAnswer(false);
          finish('도움받음');
        }));
      });
      sheet.appendChild(button('fq-reason fq-reason--cancel', '괜찮아, 계속 풀래', () => sheet.remove()));
      card.appendChild(sheet);
    }

    setTimeout(() => { if (!finished && card.isConnected) speakThen(quiz.question); }, 300);
  }

  // 여러 문제를 차례로. record가 참이면 문제마다 노션에 기록한다.
  // onDone({ total, firstTry, reported, results })
  function playRound(stage, quizzes, { record = false, onDone } = {}) {
    const list = (quizzes || []).slice();
    const results = [];
    const pending = [];
    let i = 0;
    const next = () => {
      if (i >= list.length) {
        const summary = {
          total: results.length,
          firstTry: results.filter(r => r.result === '한번에').length,
          reported: results.filter(r => r.report).length,
          results,
          saved: Promise.allSettled(pending)
        };
        if (onDone) onDone(summary);
        return;
      }
      const quiz = list[i];
      renderQuestion(stage, quiz, i + 1, list.length, outcome => {
        results.push({ quiz, result: outcome.result, report: outcome.report });
        if (record) pending.push(window.FamilyQuiz.recordResult(quiz, outcome.result, outcome.report).catch(() => null));
        i += 1;
        next();
      });
    };
    next();
  }

  function mailText(summary) {
    const parts = [`🧩 민서가 오빠 문제 ${summary.total}개를 풀었어!`];
    if (summary.firstTry) parts.push(`한 번에 맞힌 문제 ${summary.firstTry}개`);
    if (summary.reported) parts.push(`🚩 이상해요 ${summary.reported}개`);
    return parts.join(' ');
  }

  function showEnd(stage, summary, hasMore, onMore, lobbyHref) {
    stage.replaceChildren();
    const box = h('section', 'fq-end');
    box.append(h('div', 'fq-end__sticker', '🏅'), h('p', 'fq-end__title', '오빠 문제 다 풀었어!'));
    if (summary.reported) box.appendChild(h('p', 'fq-end__note', '🚩 이상한 문제는 오빠한테 알려 줬어요'));
    const row = h('div', 'fq-end__buttons');
    if (hasMore) row.appendChild(button('fq-next', '🎁 하나 더!', onMore));
    const home = h('a', 'fq-next fq-next--home', '🏠 로비로');
    home.href = lobbyHref;
    row.appendChild(home);
    box.appendChild(row);
    stage.appendChild(box);
    call('fairyReward');
  }

  function showMessage(stage, text, lobbyHref, retry) {
    stage.replaceChildren();
    const box = h('section', 'fq-end');
    box.append(h('p', 'fq-end__title', text));
    const row = h('div', 'fq-end__buttons');
    if (retry) row.appendChild(button('fq-next', '🔄 다시 해 보기', retry));
    const home = h('a', 'fq-next fq-next--home', '🏠 로비로');
    home.href = lobbyHref;
    row.appendChild(home);
    box.appendChild(row);
    stage.appendChild(box);
  }

  // 민서 풀이방 시작. 「하나 더」는 처음 받은 목록의 남은 문제를 이어서 낸다(방금 쓴 기록을 다시 읽지 않음).
  async function runSolverPage(stage, { lobbyHref }) {
    const FQ = window.FamilyQuiz;
    const solver = FQ.CHILD.minseo.name;
    stage.replaceChildren(h('p', 'fq-loading', '오빠 문제를 가져오는 중…'));
    let fresh;
    try {
      fresh = FQ.pickNew(await FQ.listForSolver(solver), solver, 99);
    } catch (e) {
      showMessage(stage, '문제를 못 가져왔어요. 잠시 뒤에 다시 해 봐요', lobbyHref, () => runSolverPage(stage, { lobbyHref }));
      return;
    }
    if (!fresh.length) {
      showMessage(stage, '오빠 문제를 다 풀었어! 🎉', lobbyHref);
      return;
    }
    const playFrom = start => {
      const round = fresh.slice(start, start + FQ.MAX_ROUND);
      const rest = start + round.length;
      playRound(stage, round, {
        record: true,
        onDone: summary => {
          summary.saved.then(() => FQ.notify('minseo', 'minsu', mailText(summary)));
          showEnd(stage, summary, rest < fresh.length, () => playFrom(rest), lobbyHref);
        }
      });
    };
    playFrom(0);
  }

  window.FamilyQuizPlay = Object.freeze({ playRound, runSolverPage, mailText, speakThen });
})();
