// 초등 3학년 나눗셈 탐험관: 1~3관 + 노션 퀴즈 배틀 (2026-11-28 옛 화면을 공용 틀로 옮김, 리팩토링 묶음 F3)
// 관마다 미션 3개를 맞히면 관 완료(ctx.complete). 그 뒤에도 미션은 계속 나온다.
(function (global) {
  'use strict';

  var CORE = global.DivConceptCore;
  var MISSIONS = 3;

  function josa(word, type) {
    return global.MathExplorer && global.MathExplorer.josa ? global.MathExplorer.josa(word, type) : String(word);
  }

  function repeat(ch, n) {
    var s = '';
    for (var i = 0; i < n; i += 1) s += ch;
    return s;
  }

  // 미션 진행 줄: 맞힐 때마다 hit(), MISSIONS번째에 관 완료
  function missionTracker(ui, ctx, card) {
    var count = 0;
    var line = ui.el('p', 'dv-mission-count', '');
    function paint() {
      line.textContent = ctx.isDone()
        ? '✅ 이 관을 마쳤어요! 더 해 봐도 좋아요.'
        : '미션 ' + Math.min(count, MISSIONS) + ' / ' + MISSIONS;
    }
    paint();
    card.appendChild(line);
    return {
      hit: function () {
        count += 1;
        if (count >= MISSIONS && !ctx.isDone()) {
          ctx.complete();
          card.appendChild(ui.doneBadge('관 완료! 보석을 받았어요.'));
        }
        paint();
      }
    };
  }

  // 접시(사람) 여러 개: { el, set(i, n) }
  function plates(ui, count, label, item, cls) {
    var wrap = ui.el('div', 'dv-plates');
    var slots = [];
    for (var i = 0; i < count; i += 1) {
      var box = ui.el('div', 'dv-plate' + (cls ? ' ' + cls : ''));
      box.appendChild(ui.el('p', 'dv-plate-title', label + ' ' + (i + 1)));
      var items = ui.el('p', 'dv-plate-items', '');
      var num = ui.el('p', 'dv-plate-num', '0개');
      box.appendChild(items);
      box.appendChild(num);
      wrap.appendChild(box);
      slots.push({ items: items, num: num });
    }
    return {
      el: wrap,
      set: function (i, n) {
        slots[i].items.textContent = repeat(item, n);
        slots[i].num.textContent = n + '개';
      }
    };
  }

  // ── 1관: 똑같이 나누기 (한 바퀴씩 나눠 주기) ──
  var lab1 = {
    title: '1관 똑같이 나누기',
    icon: '🍪',
    sub: '쿠키 접시',
    render: function (container, ctx) {
      var ui = ctx.ui;
      var card = ui.card('1관 🍪 똑같이 나누기');
      card.appendChild(ui.concept('나눗셈식', '쿠키 12개를 접시 3개에 똑같이 나누면 한 접시에 4개씩이에요. 이것을 12 ÷ 3 = 4라고 쓰고, 4를 몫이라고 해요.'));
      var area = ui.el('div', 'dv-area');
      card.appendChild(area);
      var tracker = missionTracker(ui, ctx, card);
      container.appendChild(card);

      var prev = null;
      function ask() {
        var p = CORE.makeShare(Math.random, prev);
        prev = p;
        area.replaceChildren();
        area.appendChild(ui.el('p', 'dv-mission-text', '🎯 쿠키 ' + p.total + '개를 접시 ' + p.plates + '개에 똑같이 나눠 담아요.'));
        var left = p.total;
        var rounds = 0;
        var pile = ui.el('p', 'dv-pile', '');
        var board = plates(ui, p.plates, '접시', '🍪', '');
        function paintPile() { pile.textContent = left > 0 ? '남은 쿠키 ' + left + '개 ' + repeat('🍪', left) : '남은 쿠키 0개'; }
        paintPile();
        area.appendChild(pile);
        area.appendChild(board.el);
        var deal = ui.button('🍪 한 접시에 하나씩 나눠 주기', 'mx-btn primary', function () {
          if (left <= 0) return;
          rounds += 1;
          left -= p.plates;
          for (var i = 0; i < p.plates; i += 1) board.set(i, rounds);
          paintPile();
          ctx.say(rounds === p.q ? '다 나눠 줬어요! 한 접시에 몇 개씩일까요?' : String(rounds));
          if (left <= 0) {
            deal.disabled = true;
            askQuotient();
          }
        });
        area.appendChild(deal);

        function askQuotient() {
          area.appendChild(ui.choiceQuestion({
            question: p.total + ' ÷ ' + p.plates + ' = ?  한 접시에 몇 개씩일까요?',
            choices: p.choices,
            answer: p.answerIndex,
            hint: '접시 하나에 담긴 쿠키를 세어 봐요.',
            explain: '한 접시에 ' + p.q + '개씩이에요. ' + p.total + ' ÷ ' + p.plates + ' = ' + p.q + ', 곱셈으로 ' + p.q + ' × ' + p.plates + ' = ' + josa(String(p.total), 'ieyo') + '.',
            onSolved: function () {
              tracker.hit();
              area.appendChild(ui.button('다음 문제 ▶', 'mx-btn primary dv-next', ask));
            }
          }));
        }
      }
      ask();
    }
  };

  // ── 2관: 곱셈구구로 몫 찾기 ──
  var lab2 = {
    title: '2관 곱셈구구 짝꿍',
    icon: '✖️',
    sub: '곱셈으로 몫 찾기',
    render: function (container, ctx) {
      var ui = ctx.ui;
      var card = ui.card('2관 ✖️ 곱셈구구 짝꿍');
      card.appendChild(ui.concept('곱셈과 나눗셈은 짝꿍', '3 × 4 = 12이면 12 ÷ 3 = 4이고 12 ÷ 4 = 3이에요. 나누는 수의 단 곱셈구구에서 나누어지는 수를 찾으면 몫이 보여요.'));
      var area = ui.el('div', 'dv-area');
      card.appendChild(area);
      var tracker = missionTracker(ui, ctx, card);
      container.appendChild(card);

      var prev = null;
      function ask() {
        var p = CORE.makeFact(Math.random, prev);
        prev = p;
        area.replaceChildren();
        var pair = ui.el('div', 'dv-pair');
        pair.appendChild(ui.el('p', 'dv-pair-line', p.d + ' × □ = ' + p.n));
        pair.appendChild(ui.el('p', 'dv-pair-line accent', p.n + ' ÷ ' + p.d + ' = □'));
        area.appendChild(pair);
        area.appendChild(ui.choiceQuestion({
          question: '🎯 □에 알맞은 수는?',
          choices: p.choices,
          answer: p.answerIndex,
          hint: p.d + '단 곱셈구구를 외워 보며 ' + josa(String(p.n), 'eul') + ' 찾아봐요.',
          explain: p.d + ' × ' + p.q + ' = ' + p.n + ', 그래서 ' + p.n + ' ÷ ' + p.d + ' = ' + josa(String(p.q), 'ieyo') + '.',
          onSolved: function () {
            tracker.hit();
            area.appendChild(ui.button('다음 문제 ▶', 'mx-btn primary dv-next', ask));
          }
        }));
      }
      ask();
    }
  };

  // ── 3관: 나머지가 있는 나눗셈 (3-2 맛보기) ──
  var lab3 = {
    title: '3관 몫과 나머지',
    icon: '🍬',
    sub: '3-2 맛보기',
    render: function (container, ctx) {
      var ui = ctx.ui;
      var card = ui.card('3관 🍬 몫과 나머지');
      card.appendChild(ui.concept('나머지의 약속', '사탕 17개를 5명에게 똑같이 나누면 3개씩 주고 2개가 남아요. 17 ÷ 5 = 3 … 2라고 쓰고, 3은 몫, 2는 나머지예요. 나머지는 언제나 나누는 수보다 작아요.'));
      var area = ui.el('div', 'dv-area');
      card.appendChild(area);
      var tracker = missionTracker(ui, ctx, card);
      container.appendChild(card);

      var prev = null;
      function ask() {
        var p = CORE.makeRemainder(Math.random, prev);
        prev = p;
        area.replaceChildren();
        area.appendChild(ui.el('p', 'dv-expr', p.n + ' ÷ ' + p.d + ' = ?'));
        area.appendChild(ui.choiceQuestion({
          question: '🎯 사탕 ' + p.n + '개를 ' + p.d + '명에게 똑같이 나누면 몫과 나머지는?',
          choices: p.choices,
          answer: p.answerIndex,
          column: true,
          hint: function (idx) {
            return idx === 1
              ? '나머지가 나누는 수 ' + p.d + '보다 크면 한 번 더 나눠 줄 수 있어요.'
              : p.d + '단 곱셈구구에서 ' + p.n + '보다 크지 않은 가장 큰 수를 찾아요.';
          },
          explain: '검산: ' + p.check + '. 나머지 ' + josa(String(p.r), 'eun') + ' 나누는 수 ' + p.d + '보다 작아요.',
          onSolved: function () {
            var board = plates(ui, p.d, '친구', '🍬', 'pink');
            for (var i = 0; i < p.d; i += 1) board.set(i, p.q);
            area.appendChild(board.el);
            area.appendChild(ui.el('p', 'dv-left', '남은 사탕(나머지) ' + p.r + '개 ' + repeat('🍬', p.r)));
            tracker.hit();
            area.appendChild(ui.button('다음 문제 ▶', 'mx-btn primary dv-next', ask));
          }
        }));
      }
      ask();
    }
  };

  function mount() {
    global.MathExplorer.mount({
      key: 'divide3',
      rememberTab: true,
      labs: [lab1, lab2, lab3],
      quiz: global.MathExplorerQuiz.create({
        grade: '3-1',
        unit: '3. 나눗셈',
        title: '퀴즈 배틀',
        intro: '퀴즈 배틀이에요. 천천히 읽고 골라 볼까요?'
      })
    });
  }

  global.DivConceptLabs = { mount: mount };

  if (global.document && global.document.readyState === 'loading') {
    global.document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})(typeof window !== 'undefined' ? window : globalThis);
