// 수학 탐험관 공용 계단 힌트·반복 풀이 도우미
(function (global) {
  'use strict';

  function noop() {}

  // 계단 패널·카운터 전용 스타일을 head에 한 번만 넣는다
  function ensureStyle() {
    if (document.getElementById('mx-ladder-style')) return;
    var s = document.createElement('style');
    s.id = 'mx-ladder-style';
    s.textContent = [
      '.mx-ladder-btn{margin-top:8px}',
      '.mx-ladder-panel{margin-top:8px;padding:12px;border-radius:12px;',
      'background:var(--mx-soft,#fffbeb);border:1.5px solid var(--mx-line,#fcd34d)}',
      '.mx-ladder-panel.mx-ladder-hidden{display:none}',
      '.mx-ladder-done{margin-top:8px;font-weight:700;color:var(--mx-strong,#b45309)}',
      '.mx-drill-count{display:inline-block;margin:6px 0;font-size:14px;font-weight:700}',
      '.mx-drill-round{width:100%}'
    ].join('');
    document.head.appendChild(s);
  }

  // hostEl 안에 3학년 계단 다시 보기 버튼과 접이식 패널을 한 번만 붙인다
  function attachLadder(hostEl, card, ui) {
    if (!hostEl || !card || hostEl.querySelector('.mx-ladder-btn')) return;
    ensureStyle();
    var panel = null;
    var btn = ui.button('🪜 3학년 계단 다시 보기', 'mx-btn mx-ladder-btn', function () {
      if (panel) {
        panel.classList.toggle('mx-ladder-hidden');
        return;
      }
      panel = ui.el('div', 'mx-ladder-panel');
      hostEl.insertBefore(panel, btn.nextSibling);
      panel.appendChild(ui.concept(card.title, card.body));
      var q = card.question;
      panel.appendChild(ui.choiceQuestion({
        question: q.question,
        choices: q.choices,
        answer: q.answer,
        hint: q.hint,
        explain: q.explain,
        onSolved: function () {
          if (q.onSolved) q.onSolved();
          if (panel.querySelector('.mx-ladder-done')) return;
          panel.appendChild(ui.el('p', 'mx-ladder-done', '좋아요! 이제 위 문제로 돌아가요 ⬆'));
          panel.appendChild(ui.button('접기', 'mx-btn', function () {
            panel.classList.add('mx-ladder-hidden');
          }));
        }
      }));
    });
    hostEl.appendChild(btn);
  }

  // LearningLog가 있으면 문제 기록기를 반환하고 없으면 빈 객체를 반환한다
  function track(prefix, kind) {
    var log = global.LearningLog;
    var key = log && log.keyFor ? log.keyFor('g', prefix + '-' + kind) : null;
    if (!log || !key || !log.question) return { wrong: noop, done: noop };
    return log.question({ subject: '수학', key: key });
  }

  // 오답 유형별 힌트·계단 연결·더 풀기 카운터를 묶은 에러리스 3지선다
  function ask(ui, o) {
    var tracker = track(o.prefix, o.kind);
    var choices = [o.answer];
    var i;
    for (i = 0; i < o.wrongs.length; i += 1) choices.push(o.wrongs[i].token);
    var box = ui.choiceQuestion({
      question: o.question,
      choices: choices,
      answer: 0,
      hint: function (wrongIdx) {
        var w = o.wrongs[wrongIdx - 1];
        return (w && o.hints && o.hints[w.mistake]) || o.hint || '반짝이는 보기를 다시 살펴볼까요?';
      },
      explain: o.explain,
      onWrong: function (text) {
        tracker.wrong(text);
        if (o.ladder) attachLadder(box, o.ladder, ui);
      },
      onSolved: function () {
        tracker.done();
        if (o.extra && o.counter) o.counter.add();
        if (o.onSolved) o.onSolved();
      }
    });
    return box;
  }

  // 로컬 날짜 키(YYYY-MM-DD)를 구한다
  function localDateKey() {
    if (global.MathExplorer && global.MathExplorer.localDateKey) return global.MathExplorer.localDateKey();
    var d = new Date();
    var m = d.getMonth() + 1;
    var day = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' + m : m) + '-' + (day < 10 ? '0' + day : day);
  }

  // 오늘 더 푼 문제 수와 10문제마다 주는 보석(최대 3개)을 localStorage로 관리한다
  function counter(key) {
    var child = global.currentChild || 'minsu';
    var storeKey = 'math_' + key + '_drill_' + child + '_' + localDateKey();
    var data = { solved: 0, gems: 0 };
    var spans = [];
    try {
      var raw = global.localStorage.getItem(storeKey);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed.solved === 'number') data.solved = parsed.solved;
        if (parsed && typeof parsed.gems === 'number') data.gems = parsed.gems;
      }
    } catch (e) {}

    function label() {
      return '오늘 더 푼 문제 ' + data.solved + '개 · 💎 ' + data.gems + '/3';
    }

    function add() {
      data.solved += 1;
      if (data.solved % 10 === 0 && data.gems < 3) {
        data.gems += 1;
        try {
          if (typeof global.grantRewardAndShowUI === 'function') global.grantRewardAndShowUI(1, false, 'math');
        } catch (e) {}
      }
      try {
        global.localStorage.setItem(storeKey, JSON.stringify(data));
      } catch (e) {}
      for (var i = 0; i < spans.length; i += 1) spans[i].textContent = label();
    }

    function view() {
      var sp = document.createElement('span');
      sp.className = 'mx-drill-count';
      sp.textContent = label();
      spans.push(sp);
      return sp;
    }

    return { add: add, view: view };
  }

  // 한 판씩 문제를 순서대로 풀고 끝나면 [한 판 더]로 새 판을 여는 진행기
  function rounds(container, ctx, o) {
    var cnt = counter(o.counterKey);
    var roundEl = ctx.ui.el('div', 'mx-drill-round');
    container.appendChild(roundEl);

    function makeStep(p, extra) {
      return function (box, next) {
        o.renderProblem(box, p, next, extra, cnt);
      };
    }

    function runRound(extra) {
      roundEl.replaceChildren();
      var list = o.makeRound();
      var steps = [];
      for (var i = 0; i < list.length; i += 1) steps.push(makeStep(list[i], extra));
      ctx.ui.sequence(roundEl, steps, function () {
        if (!extra) ctx.complete();
        roundEl.appendChild(ctx.ui.doneBadge('한 판 끝!'));
        roundEl.appendChild(cnt.view());
        roundEl.appendChild(ctx.ui.button('🔁 한 판 더', 'mx-btn primary', function () {
          runRound(true);
        }));
      });
    }

    runRound(ctx.isDone() ? true : false);
  }

  global.MathLadder = { attach: attachLadder };
  global.MathDrill = { track: track, ask: ask, counter: counter, rounds: rounds };
})(typeof window !== 'undefined' ? window : globalThis);
