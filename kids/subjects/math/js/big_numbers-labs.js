// 초등 4학년 1학기 큰 수 탐험관: 1~3관 + 노션 퀴즈 배틀 (2026-11-28 옛 화면을 공용 틀로 옮김, 리팩토링 묶음 F2)
// 관마다 미션 3개를 맞히면 관 완료(ctx.complete). 그 뒤에도 미션은 계속 나온다.
(function (global) {
  'use strict';

  var CORE = global.BigNumCore;
  var MISSIONS = 3;
  var GROUP_ICONS = ['👑', '🌟', '🚀', '🟢'];

  function josa(word, type) {
    return global.MathExplorer && global.MathExplorer.josa ? global.MathExplorer.josa(word, type) : String(word);
  }

  // 미션 진행 줄: 맞힐 때마다 hit(), MISSIONS번째에 관 완료
  function missionTracker(ui, ctx, card) {
    var count = 0;
    var line = ui.el('p', 'bn-mission-count', '');
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

  function buttonRow(ui, items, onPick) {
    var row = ui.el('div', 'bn-btn-row');
    var buttons = items.map(function (it) {
      var b = ui.button(it.text, 'mx-btn bn-pick', function () { onPick(it.value); });
      b.dataset.value = String(it.value);
      row.appendChild(b);
      return b;
    });
    return {
      el: row,
      active: function (value) {
        buttons.forEach(function (b) { b.classList.toggle('active', b.dataset.value === String(value)); });
      }
    };
  }

  // ── 1관: 자릿값 계수기 (조·억·만·일 네 묶음) ──
  var lab1 = {
    title: '1관 자릿값 계수기',
    icon: '🌌',
    sub: '만·억·조',
    render: function (container, ctx) {
      var ui = ctx.ui;
      var P = CORE.PLACES;
      var card = ui.card('1관 🌌 자릿값 계수기');
      card.appendChild(ui.concept('4자리씩 끊어 읽기', '1000이 10개면 1만, 1000만이 10개면 1억, 1000억이 10개면 1조예요. 큰 수는 오른쪽부터 4자리씩 끊어 일, 만, 억, 조로 읽어요.'));

      var show = ui.el('div', 'bn-scale');
      var showSub = ui.el('p', 'bn-scale-sub');
      var showNum = ui.el('p', 'bn-scale-num');
      var showName = ui.el('p', 'bn-scale-name');
      var showDesc = ui.el('p', 'bn-scale-desc');
      show.appendChild(showSub);
      show.appendChild(showNum);
      show.appendChild(showName);
      show.appendChild(showDesc);
      card.appendChild(show);

      card.appendChild(ui.guide('👇 자리 이름을 누르면 그 자리에 1이 놓여요.'));
      var table = ui.el('div', 'bn-place-groups');
      var cells = [];
      CORE.GROUP_NAMES.forEach(function (g, gi) {
        var group = ui.el('div', 'bn-group bn-group-' + gi);
        group.appendChild(ui.el('p', 'bn-group-title', GROUP_ICONS[gi] + ' ' + g + ' 묶음'));
        var row = ui.el('div', 'bn-group-row');
        for (var k = 0; k < 4; k += 1) {
          (function (idx) {
            var cell = ui.el('button', 'bn-cell');
            cell.type = 'button';
            var nm = ui.el('span', 'bn-cell-name', P[idx].name);
            var dg = ui.el('span', 'bn-cell-digit', '');
            cell.appendChild(nm);
            cell.appendChild(dg);
            cell.addEventListener('click', function () { pickPlace(idx, true); });
            row.appendChild(cell);
            cells.push({ btn: cell, digit: dg });
          })(gi * 4 + k);
        }
        group.appendChild(row);
        table.appendChild(group);
      });
      card.appendChild(table);

      var mission = ui.el('div', 'bn-mission');
      var missionText = ui.el('p', 'bn-mission-text');
      var missionHint = ui.el('div', 'mx-hint');
      missionHint.hidden = true;
      mission.appendChild(missionText);
      mission.appendChild(missionHint);
      card.appendChild(mission);
      var tracker = missionTracker(ui, ctx, card);
      container.appendChild(card);

      var cur = CORE.placeIndex('man');
      var target = null;
      var solved = false;

      function pickPlace(idx, speak) {
        cur = idx;
        var u = P[idx];
        var value = CORE.pow10(u.exp);
        var row = CORE.digitRow(idx);
        cells.forEach(function (c, i) {
          c.digit.textContent = row[i] || '·';
          c.btn.classList.toggle('active', i === idx);
          c.btn.classList.toggle('is-zero', row[i] === '0');
        });
        showSub.textContent = u.sub;
        showNum.textContent = CORE.comma(value);
        showName.textContent = u.name + ' (0이 ' + u.exp + '개)';
        showDesc.textContent = u.desc;
        if (speak) ctx.say(josa(u.name, 'eun') + ' 0이 ' + u.exp + '개예요. ' + josa(u.sub, 'ieyo') + '.');
        if (!speak || target === null || solved) return;
        if (idx === target) {
          solved = true;
          ctx.praise();
          ui.hint(missionHint, '✨ 맞아요! ' + josa(u.name, 'eun') + ' ' + CORE.comma(value) + ', 0이 ' + u.exp + '개예요.');
          tracker.hit();
          missionHint.appendChild(ui.button('다음 미션 ▶', 'mx-btn primary bn-next', newMission));
        } else {
          ui.hint(missionHint, '💡 ' + josa(P[target].name, 'eun') + ' ' + CORE.GROUP_NAMES[Math.floor(target / 4)] + ' 묶음 안에 있어요.');
        }
      }

      function newMission() {
        var guard = 0;
        do {
          target = CORE.placeTarget(Math.random, target);
          guard += 1;
        } while (target === cur && guard < 20);
        solved = false;
        missionText.textContent = '🎯 미션: ' + P[target].name + ' 자리를 찾아 눌러 봐요';
        ui.hint(missionHint, '');
      }

      pickPlace(cur, false);
      newMission();
    }
  };

  // ── 2관: 뛰어 세기 ──
  var STEP_LABEL = { 1000: '1000씩', 10000: '1만씩', 1000000: '100만씩', 100000000: '1억씩' };

  var lab2 = {
    title: '2관 뛰어 세기',
    icon: '📈',
    sub: '바뀌는 자리',
    render: function (container, ctx) {
      var ui = ctx.ui;
      var card = ui.card('2관 📈 뛰어 세기');
      card.appendChild(ui.concept('뛰어 세기의 비밀', '1000씩 뛰어 세면 천의 자리 숫자가 1씩 커져요. 1만씩 뛰어 세면 만의 자리, 1억씩 뛰어 세면 억의 자리 숫자가 1씩 커지고, 다른 자리는 그대로예요.'));
      var step = 1000;
      var steps = buttonRow(ui, CORE.STEPS.map(function (s) { return { text: STEP_LABEL[s] + ' 뛰기', value: s }; }), function (s) {
        step = s;
        ask();
      });
      card.appendChild(steps.el);
      var title = ui.el('p', 'bn-skip-title');
      card.appendChild(title);
      var strip = ui.el('div', 'bn-skip-strip');
      card.appendChild(strip);
      var area = ui.el('div', 'bn-area');
      card.appendChild(area);
      var tracker = missionTracker(ui, ctx, card);
      container.appendChild(card);

      function ask() {
        steps.active(step);
        var p = CORE.makeSkip(Math.random, step);
        title.textContent = CORE.comma(p.start) + '부터 ' + STEP_LABEL[p.step] + ' 뛰어 세기';
        strip.replaceChildren();
        var blankEl = null;
        p.values.forEach(function (v, i) {
          var c = ui.el('div', i === p.blank ? 'bn-skip-card blank' : 'bn-skip-card', i === p.blank ? '?' : CORE.comma(v));
          if (i === p.blank) blankEl = c;
          strip.appendChild(c);
        });
        area.replaceChildren();
        area.appendChild(ui.choiceQuestion({
          question: '🎯 ?에 알맞은 수는 얼마일까요?',
          choices: p.choices,
          answer: p.answerIndex,
          hint: STEP_LABEL[p.step] + ' 뛰어 세면 ' + p.place + ' 숫자만 1씩 커져요.',
          explain: STEP_LABEL[p.step] + ' 뛰어 세면 ' + p.place + ' 숫자가 1씩 커져요. ' + CORE.comma(p.values[p.blank - 1]) + ' 다음은 ' + josa(CORE.comma(p.answer), 'ieyo') + '.',
          onSolved: function () {
            blankEl.textContent = CORE.comma(p.answer);
            blankEl.classList.remove('blank');
            blankEl.classList.add('filled');
            tracker.hit();
            area.appendChild(ui.button('다음 문제 ▶', 'mx-btn primary bn-next', ask));
          }
        }));
      }
      ask();
    }
  };

  // ── 3관: 크기 비교 ──
  var lab3 = {
    title: '3관 크기 비교',
    icon: '⚖️',
    sub: '자릿수 → 높은 자리',
    render: function (container, ctx) {
      var ui = ctx.ui;
      var card = ui.card('3관 ⚖️ 큰 수의 크기 비교');
      card.appendChild(ui.concept('비교하는 순서', '먼저 자릿수를 세요. 자릿수가 많은 수가 더 커요. 85,000(5자리)은 120,000(6자리)보다 작아요. 자릿수가 같으면 가장 높은 자리부터 차례로 비교해요. 5억 4000만은 5억 2000만보다 커요.'));
      var duel = ui.el('div', 'bn-duel');
      var boxA = ui.el('div', 'bn-duel-box a');
      var boxB = ui.el('div', 'bn-duel-box b');
      var sign = ui.el('div', 'bn-duel-sign', '?');
      duel.appendChild(boxA);
      duel.appendChild(sign);
      duel.appendChild(boxB);
      card.appendChild(duel);
      var area = ui.el('div', 'bn-area');
      card.appendChild(area);
      var tracker = missionTracker(ui, ctx, card);
      container.appendChild(card);

      function fillBox(box, label, n) {
        box.replaceChildren();
        box.appendChild(ui.el('span', 'bn-duel-label', label));
        box.appendChild(ui.el('span', 'bn-duel-num', CORE.comma(n)));
        box.appendChild(ui.el('span', 'bn-duel-kor', CORE.korean(n) + ' · ' + String(n).length + '자리'));
      }

      function ask() {
        var p = CORE.makeCompare(Math.random);
        fillBox(boxA, '가', p.a);
        fillBox(boxB, '나', p.b);
        sign.textContent = '?';
        area.replaceChildren();
        var a = CORE.comma(p.a);
        var b = CORE.comma(p.b);
        area.appendChild(ui.choiceQuestion({
          question: '🎯 가 ○ 나, ○에 알맞은 기호는?',
          choices: p.choices,
          answer: p.answerIndex,
          fixed: true,
          hint: p.kind === 'digits'
            ? '먼저 두 수의 자릿수를 세어 봐요.'
            : '자릿수가 같아요. 가장 높은 자리부터 같은지 다른지 살펴봐요.',
          explain: p.kind === 'digits'
            ? '가는 ' + p.digitsA + '자리, 나는 ' + p.digitsB + '자리예요. 자릿수가 많은 수가 더 커요.'
            : '둘 다 ' + p.digitsA + '자리이고 가장 높은 자리 숫자가 같아요. 그다음 ' + p.diffPlace + ' 숫자가 더 큰 ' + (p.a > p.b ? '가' : '나') + '가 더 커요.',
          onSolved: function () {
            sign.textContent = p.sign;
            tracker.hit();
            area.appendChild(ui.el('p', 'bn-duel-result', a + ' ' + p.sign + ' ' + b));
            area.appendChild(ui.button('다음 문제 ▶', 'mx-btn primary bn-next', ask));
          }
        }));
      }
      ask();
    }
  };

  function mount() {
    global.MathExplorer.mount({
      key: 'bignum4',
      rememberTab: true,
      labs: [lab1, lab2, lab3],
      quiz: global.MathExplorerQuiz.create({
        grade: '4-1',
        unit: '1. 큰 수',
        title: '퀴즈 배틀',
        intro: '퀴즈 배틀이에요. 천천히 읽고 골라 볼까요?'
      })
    });
  }

  global.BigNumLabs = { mount: mount };

  if (global.document && global.document.readyState === 'loading') {
    global.document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})(typeof window !== 'undefined' ? window : globalThis);
