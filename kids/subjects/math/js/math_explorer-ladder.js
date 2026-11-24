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
  // opts(선택, 2026-11-24): { label: 버튼 글자(기본 '🪜 3학년 계단 다시 보기'), say: 음성 함수 — 주면 판이 열릴 때 본문을 읽어 줌 }
  function attachLadder(hostEl, card, ui, opts) {
    if (!hostEl || !card || hostEl.querySelector('.mx-ladder-btn')) return;
    ensureStyle();
    var op = opts || {};
    var panel = null;
    var btn = ui.button(op.label || '🪜 3학년 계단 다시 보기', 'mx-btn mx-ladder-btn', function () {
      if (panel) {
        panel.classList.toggle('mx-ladder-hidden');
        return;
      }
      if (typeof op.say === 'function') op.say(card.body);
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
  // 저학년 옵션(2026-11-24, 모두 선택): say(음성 함수) — 주면 질문을 바로 읽어 줌(speak가 있으면 그 글자를 대신 읽음: 수 읽기 문제처럼
  //   질문에 정답 소리가 섞이면 안 될 때), sayHint — 오답 힌트도 읽어 줌, column — 보기 세로 1열, ladderLabel — 계단 버튼 글자
  function ask(ui, o) {
    var tracker = track(o.prefix, o.kind);
    var choices = [o.answer];
    var i;
    for (i = 0; i < o.wrongs.length; i += 1) choices.push(o.wrongs[i].token);
    // o.order: 순서가 뜻을 가지는 보기(> < =)는 이 순서로 고정해 보여 준다
    var fixed = Array.isArray(o.order);
    if (fixed) choices = o.order.slice();
    var answerIdx = fixed ? choices.indexOf(o.answer) : 0;
    function wrongOf(idx) {
      var text = choices[idx];
      for (var j = 0; j < o.wrongs.length; j += 1) if (o.wrongs[j].token === text) return o.wrongs[j];
      return null;
    }
    var box = ui.choiceQuestion({
      question: o.question,
      choices: choices,
      answer: answerIdx,
      fixed: fixed,
      column: Boolean(o.column),
      hint: function (wrongIdx) {
        var w = wrongOf(wrongIdx);
        var h = (w && o.hints && o.hints[w.mistake]) || o.hint || '반짝이는 보기를 다시 살펴볼까요?';
        if (o.sayHint && typeof o.say === 'function') o.say(h);
        return h;
      },
      explain: o.explain,
      onWrong: function (text) {
        tracker.wrong(text);
        if (o.ladder) attachLadder(box, o.ladder, ui, { label: o.ladderLabel, say: o.sayHint ? o.say : null });
      },
      onSolved: function () {
        tracker.done();
        if (o.extra && o.counter) o.counter.add();
        if (o.onSolved) o.onSolved();
      }
    });
    if (typeof o.say === 'function') o.say(o.speak !== undefined ? o.speak : o.question);
    return box;
  }

  // 보상 글자: 민서는 사탕, 민수는 보석 (지급 엔진은 이미 아이별로 처리, 여기는 보이는 글자만)
  function rewardIcon() {
    return global.currentChild === 'minseo' ? '🍬' : '💎';
  }

  // 로컬 날짜 키(YYYY-MM-DD)를 구한다
  function localDateKey() {
    if (global.MathExplorer && global.MathExplorer.localDateKey) return global.MathExplorer.localDateKey();
    var d = new Date();
    var m = d.getMonth() + 1;
    var day = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' + m : m) + '-' + (day < 10 ? '0' + day : day);
  }

  // 오늘 더 푼 문제 수와 perReward문제(기본 10)마다 주는 보상(최대 3개)을 localStorage로 관리한다
  // opts.perReward: 2학년(민서)은 6 — 3문제 한 판 두 번마다 (2026-11-24)
  function counter(key, opts) {
    var per = (opts && opts.perReward) || 10;
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
      return '오늘 더 푼 문제 ' + data.solved + '개 · ' + rewardIcon() + ' ' + data.gems + '/3';
    }

    function add() {
      data.solved += 1;
      if (data.solved % per === 0 && data.gems < 3) {
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
  // o.perReward(보상 간격), o.nextButton(true면 [다음 관 ▶] — 틀의 ctx.goNext가 있을 때) — 2026-11-24 저학년 옵션
  function rounds(container, ctx, o) {
    var cnt = counter(o.counterKey, { perReward: o.perReward });
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
        var row = ctx.ui.el('div', 'mx-btn-row');
        row.appendChild(ctx.ui.button('🔁 한 판 더', 'mx-btn primary', function () {
          runRound(true);
        }));
        if (o.nextButton && typeof ctx.goNext === 'function' && ctx.hasNext && ctx.hasNext()) {
          row.appendChild(ctx.ui.button('다음 관 ▶', 'mx-btn', function () { ctx.goNext(); }));
        }
        roundEl.appendChild(row);
      });
    }

    runRound(ctx.isDone() ? true : false);
  }

  // 1-2-3 계산 순서 카드 (번호 동그라미는 CSS가 그림)
  function algo(ui, steps) {
    var box = ui.el('div', 'mx-algo');
    var i;
    for (i = 0; i < steps.length; i++) {
      var row = ui.el('div', 'mx-algo-row');
      var txt = ui.el('span', 'mx-algo-txt');
      ui.fill(txt, steps[i]);
      row.appendChild(txt);
      box.appendChild(row);
    }
    return box;
  }

  // 접힌 [왜 그럴까?] 토글 카드
  function why(ui, title, body) {
    var wrap = ui.el('div', 'mx-why');
    var card = ui.concept(title, body);
    var opened = false;
    var btn = ui.button('💡 왜 그럴까?', 'mx-btn mx-why-btn', function () {
      opened = !opened;
      if (opened) {
        wrap.appendChild(card);
      } else if (card.parentNode === wrap) {
        wrap.removeChild(card);
      }
    });
    wrap.appendChild(btn);
    return wrap;
  }

  // 식 한 줄 표시
  function expr(ui, text) {
    var node = ui.el('div', 'mx-expr');
    ui.fill(node, text);
    return node;
  }

  global.MathLadder = { attach: attachLadder };
  global.MathDrill = { track: track, ask: ask, counter: counter, rounds: rounds, algo: algo, why: why, expr: expr, rewardIcon: rewardIcon };
})(typeof window !== 'undefined' ? window : globalThis);
