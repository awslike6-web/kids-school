// 초등 2학년 1학기 '세 자리 수' 7관 수 스무고개 (NumberTwenty)
(function (global) {
  'use strict';

  var STYLE_ID = 'mx-twenty-style';
  var TOTAL_CANDS = 900;
  var MAX_CHIPS = 4;
  var MAX_LOGS = 6;
  var GUESS_CAND_LIMIT = 9;
  var GUESS_ASK_LIMIT = 20;
  var EXACT_DIGIT_LIMIT = 3; // 그 자리에 남은 숫자가 이만큼 이하일 때만 「5예요?」 칩을 보인다

  var CATEGORIES = [
    { id: 'size', label: '📏 크기', prefix: 'gt:' },
    { id: 'h', label: '백의 자리', prefix: 'h:', cmp: 'hg:', div: 100 },
    { id: 't', label: '십의 자리', prefix: 't:', cmp: 'tg:', div: 10 },
    { id: 'o', label: '일의 자리', prefix: 'o:', cmp: 'og:', div: 1 },
    { id: 'even', label: '짝수?', prefix: 'even' }
  ];

  function noop() {}

  function getCore() {
    return global.ThreeDigitCore;
  }

  function findCategory(categoryId) {
    for (var i = 0; i < CATEGORIES.length; i += 1) {
      if (CATEGORIES[i].id === categoryId) return CATEGORIES[i];
    }
    return null;
  }

  function chipNum(id) {
    var idx = id.indexOf(':');
    return idx === -1 ? 0 : Number(id.slice(idx + 1));
  }

  // 현재 후보를 둘로 나누는 칩만 골라 최대 max개 반환
  function pickChips(cands, categoryId, max) {
    var core = getCore();
    var cat = findCategory(categoryId);
    var limit = typeof max === 'number' ? max : MAX_CHIPS;
    if (!core || !cat || !Array.isArray(cands) || cands.length <= 1 || limit <= 0) {
      return [];
    }
    if (cat.cmp) return pickDigitChips(core, cat, cands, limit);
    var all = core.chipList();
    var matched = [];
    var i, j, id, yes;
    for (i = 0; i < all.length; i += 1) {
      id = all[i];
      if (cat.prefix === 'even' ? id !== 'even' : id.indexOf(cat.prefix) !== 0) continue;
      yes = 0;
      for (j = 0; j < cands.length; j += 1) {
        if (core.chipAnswer(cands[j], id)) yes += 1;
      }
      if (yes > 0 && yes < cands.length) matched.push(id);
    }
    if (categoryId === 'size') {
      var sorted = cands.slice().sort(function (a, b) { return a - b; });
      var midIdx = Math.floor(sorted.length / 2);
      var mid = sorted.length % 2 === 1
        ? sorted[midIdx]
        : (sorted[midIdx - 1] + sorted[midIdx]) / 2;
      matched.sort(function (a, b) {
        var va = chipNum(a);
        var vb = chipNum(b);
        var diff = Math.abs(va - mid) - Math.abs(vb - mid);
        return diff !== 0 ? diff : va - vb;
      });
    }
    return matched.slice(0, limit);
  }

  // 그 자리에 아직 올 수 있는 숫자들(오름차순). 크기·짝수 묶음은 []
  function digitsLeft(cands, categoryId) {
    var cat = findCategory(categoryId);
    if (!cat || !cat.cmp || !Array.isArray(cands)) return [];
    var seen = {};
    var out = [];
    for (var i = 0; i < cands.length; i += 1) {
      var d = Math.floor(cands[i] / cat.div) % 10;
      if (!seen[d]) { seen[d] = true; out.push(d); }
    }
    return out.sort(function (a, b) { return a - b; });
  }

  // 자리 숫자 묶음: 남은 숫자가 많으면 「N보다 커요?」(절반에 가까운 것부터), 3개 이하로 줄면 「N이에요?」
  function pickDigitChips(core, cat, cands, limit) {
    var seen = {};
    var kinds = 0;
    var i, j, id, yes;
    for (i = 0; i < cands.length; i += 1) {
      var d = Math.floor(cands[i] / cat.div) % 10;
      if (!seen[d]) { seen[d] = true; kinds += 1; }
    }
    var prefix = kinds > EXACT_DIGIT_LIMIT ? cat.cmp : cat.prefix;
    var all = core.chipList();
    var matched = [];
    for (i = 0; i < all.length; i += 1) {
      id = all[i];
      if (id.indexOf(prefix) !== 0) continue;
      yes = 0;
      for (j = 0; j < cands.length; j += 1) {
        if (core.chipAnswer(cands[j], id)) yes += 1;
      }
      if (yes > 0 && yes < cands.length) matched.push({ id: id, gap: Math.abs(yes * 2 - cands.length) });
    }
    if (prefix === cat.cmp) matched.sort(function (a, b) { return a.gap - b.gap || chipNum(a.id) - chipNum(b.id); });
    var out = matched.slice(0, limit).map(function (m) { return m.id; });
    return out.sort(function (a, b) { return chipNum(a) - chipNum(b); });
  }

  // 맞히기 보기 생성 (항상 answerN 포함, 오름차순)
  function guessOptions(cands, answerN, rng) {
    var rand = typeof rng === 'function' ? rng : Math.random;
    var pool = [];
    var seen = {};
    var i, n;
    if (Array.isArray(cands)) {
      for (i = 0; i < cands.length; i += 1) {
        n = cands[i];
        if (!seen[n]) {
          seen[n] = true;
          pool.push(n);
        }
      }
    }
    if (!seen[answerN]) pool.push(answerN);
    if (pool.length <= 3) {
      pool.sort(function (a, b) { return a - b; });
      return pool;
    }
    var others = [];
    for (i = 0; i < pool.length; i += 1) {
      if (pool[i] !== answerN) others.push(pool[i]);
    }
    var picked = [answerN];
    for (i = 0; i < 2 && others.length > 0; i += 1) {
      var idx = Math.floor(rand() * others.length);
      if (idx < 0) idx = 0;
      if (idx >= others.length) idx = others.length - 1;
      picked.push(others.splice(idx, 1)[0]);
    }
    picked.sort(function (a, b) { return a - b; });
    return picked;
  }

  // 스무고개 전용 스타일을 head에 한 번만 삽입
  function ensureStyle() {
    if (typeof document === 'undefined' || !document || !document.head) return;
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = [
      '.tw20-area{width:100%;max-width:360px;margin:10px auto 0;text-align:center}',
      '.tw20-area [hidden]{display:none}',
      '.tw20-status{display:flex;justify-content:space-between;align-items:center;',
      'font-weight:800;font-size:1rem;color:var(--mx-strong,#b45309);margin-bottom:6px}',
      '.tw20-meter{width:100%;height:14px;border-radius:999px;overflow:hidden;',
      'background:var(--mx-soft,#fffbeb);border:1.5px solid var(--mx-line,#fcd34d);margin-bottom:10px}',
      '.tw20-fill{height:100%;min-width:6px;border-radius:999px;',
      'background:var(--mx-accent,#f59e0b);transition:width .3s ease}',
      '.tw20-cats{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-bottom:10px}',
      '.tw20-cat{min-height:56px;flex:1 1 30%;box-sizing:border-box;font-size:.95rem;font-weight:700;',
      'border:2px solid var(--mx-line,#fcd34d);background:var(--mx-bg,#fff);color:var(--mx-strong,#b45309)}',
      '.tw20-cat.is-on{background:var(--mx-accent,#f59e0b);border-color:var(--mx-strong,#b45309);color:#fff}',
      '.tw20-digits{margin:0 0 8px;font-size:1.05rem;font-weight:800;color:var(--mx-strong,#b45309)}',
      '.tw20-chips{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-bottom:10px}',
      '.tw20-chip{min-height:56px;width:100%;box-sizing:border-box;padding:8px 6px;',
      'font-size:1rem;font-weight:700;word-break:keep-all;',
      'border:2px solid var(--mx-line,#fcd34d);background:var(--mx-soft,#fffbeb);color:var(--mx-strong,#b45309)}',
      '.tw20-empty{margin:6px 0 10px;padding:12px;border-radius:12px;font-weight:700;',
      'background:var(--mx-soft,#fffbeb);border:1.5px dashed var(--mx-line,#fcd34d);color:var(--mx-strong,#b45309)}',
      '.tw20-answer{margin:8px 0;padding:10px;border-radius:14px;font-size:1.75rem;font-weight:900;',
      'background:var(--mx-soft,#fffbeb);border:2px solid var(--mx-accent,#f59e0b);color:var(--mx-strong,#b45309)}',
      '.tw20-log{margin:8px 0;padding:8px 10px;border-radius:12px;text-align:left;',
      'background:var(--mx-soft,#fffbeb);border:1.5px solid var(--mx-line,#fcd34d)}',
      '.tw20-log-item{padding:4px 0;font-size:.95rem;font-weight:700;color:var(--mx-strong,#b45309);',
      'border-bottom:1px dashed var(--mx-line,#fcd34d)}',
      '.tw20-log-item:last-child{border-bottom:none}',
      '.tw20-guess-box{margin-top:12px;padding:12px;border-radius:14px;',
      'background:var(--mx-soft,#fffbeb);border:2px solid var(--mx-accent,#f59e0b)}',
      '.tw20-guess-title{margin:0 0 8px;font-size:1.15rem;font-weight:800;color:var(--mx-strong,#b45309)}',
      '.tw20-guess-row{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}',
      '.tw20-guess{min-height:56px;width:100%;box-sizing:border-box;font-size:1.35rem;font-weight:900;',
      'border:2px solid var(--mx-line,#fcd34d);background:var(--mx-bg,#fff);color:var(--mx-strong,#b45309)}',
      '.tw20-guess.is-shake{animation:tw20Shake .4s ease}',
      '.tw20-guess:disabled{opacity:.45}',
      '.tw20-win{margin:10px 0;font-size:2rem;font-weight:900;color:var(--mx-strong,#b45309)}',
      '.tw20-actions{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:10px}',
      '.tw20-actions .mx-btn{min-height:56px;flex:1 1 140px;box-sizing:border-box}',
      '@keyframes tw20Shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}',
      '50%{transform:translateX(6px)}75%{transform:translateX(-4px)}}',
      '@media (prefers-reduced-motion:reduce){.tw20-guess.is-shake,.tw20-fill{animation:none;transition:none}}'
    ].join('');
    document.head.appendChild(s);
  }

  function makeTracker() {
    if (global.MathDrill && typeof global.MathDrill.track === 'function') {
      return global.MathDrill.track('num3', 'twenty');
    }
    return { wrong: noop, done: noop };
  }

  function makeCounter(ui) {
    if (global.MathDrill && typeof global.MathDrill.counter === 'function') {
      return global.MathDrill.counter('num3', { perReward: 6 });
    }
    return {
      add: noop,
      view: function () { return ui.el('span', 'mx-drill-count', ''); }
    };
  }

  // 7관 수 스무고개 화면 렌더
  function render(container, ctx) {
    ensureStyle();
    var core = getCore();
    var ui = ctx.ui;
    var say = typeof ctx.say === 'function' ? ctx.say : noop;
    var praise = typeof ctx.praise === 'function' ? ctx.praise : noop;
    var encourage = typeof ctx.encourage === 'function' ? ctx.encourage : noop;
    var counter = makeCounter(ui);
    var roundToken = 0;

    var card = ui.card('7관 🔍 수 스무고개');
    card.appendChild(ui.guide('내가 생각한 세 자리 수를 질문으로 맞혀 봐요!'));
    card.appendChild(global.MathDrill.algo(ui, ['크기부터 물어봐요', '자리 숫자를 물어봐요']));
    card.appendChild(global.MathDrill.why(
      ui,
      '어떻게 좁힐까?',
      '300보다 큰지 물으면 절반쯤이 사라져요. 그다음 자리 숫자를 물어봐요.'
    ));
    var area = ui.el('div', 'tw20-area');
    card.appendChild(area);
    container.appendChild(card);

    function startRound(isExtra) {
      roundToken += 1;
      var myToken = roundToken;
      area.replaceChildren();

      var answerN = core.makeSecret(Math.random);
      var asked = [];
      var cands = core.candidates(asked);
      var selectedCat = 'size';
      var busy = false;
      var solved = false;
      var tracker = makeTracker();

      var statusBar = ui.el('div', 'tw20-status');
      var remainEl = ui.el('span', 'tw20-remain', '');
      var countEl = ui.el('span', 'tw20-count', '');
      statusBar.appendChild(remainEl);
      statusBar.appendChild(countEl);

      var meter = ui.el('div', 'tw20-meter');
      var fill = ui.el('div', 'tw20-fill');
      meter.appendChild(fill);

      var catsRow = ui.el('div', 'tw20-cats');
      var digitsEl = ui.el('p', 'tw20-digits', '');
      digitsEl.hidden = true;
      var chipsBox = ui.el('div', 'tw20-chips');
      var emptyMsg = ui.el('p', 'tw20-empty', '이 질문은 더 안 해도 돼요. 다른 묶음을 골라요');
      emptyMsg.hidden = true;

      var answerEl = ui.el('div', 'tw20-answer', '');
      answerEl.hidden = true;

      var logEl = ui.el('div', 'tw20-log');
      logEl.hidden = true;

      var guessBox = ui.el('div', 'tw20-guess-box');
      guessBox.hidden = true;
      var guessTitle = ui.el('p', 'tw20-guess-title', '🎯 맞혀 볼까요?');
      var guessRow = ui.el('div', 'tw20-guess-row');
      var hintEl = ui.el('div', 'mx-hint');
      hintEl.hidden = true;
      guessBox.appendChild(guessTitle);
      guessBox.appendChild(guessRow);
      guessBox.appendChild(hintEl);

      var endBox = ui.el('div', 'tw20-end');
      endBox.hidden = true;

      area.appendChild(statusBar);
      area.appendChild(meter);
      area.appendChild(catsRow);
      area.appendChild(digitsEl);
      area.appendChild(chipsBox);
      area.appendChild(emptyMsg);
      area.appendChild(answerEl);
      area.appendChild(logEl);
      area.appendChild(guessBox);
      area.appendChild(endBox);

      var catBtns = {};

      function updateStatus() {
        var pct = Math.round((cands.length / TOTAL_CANDS) * 100);
        remainEl.textContent = '남은 수 ' + cands.length + '개';
        countEl.textContent = '질문 ' + asked.length + '번';
        fill.style.width = pct + '%';
      }

      function updateCatButtons() {
        for (var i = 0; i < CATEGORIES.length; i += 1) {
          var id = CATEGORIES[i].id;
          catBtns[id].classList.toggle('is-on', id === selectedCat);
        }
      }

      function addLogLine(qText, yes) {
        var line = ui.el('div', 'tw20-log-item', qText + ' → ' + (yes ? '네' : '아니요'));
        logEl.insertBefore(line, logEl.firstChild);
        while (logEl.children.length > MAX_LOGS) {
          logEl.removeChild(logEl.lastChild);
        }
        logEl.hidden = false;
      }

      function showWin() {
        solved = true;
        busy = true;
        praise();
        say('정답! ' + asked.length + '번 물어보고 맞혔어요');
        tracker.done();
        var doneNow = typeof ctx.isDone === 'function' ? ctx.isDone() : false;
        if (!isExtra && !doneNow && typeof ctx.complete === 'function') {
          ctx.complete();
        } else {
          counter.add();
        }
        guessBox.hidden = true;
        endBox.replaceChildren();
        endBox.appendChild(ui.el('div', 'tw20-win', '🎉 ' + answerN));
        endBox.appendChild(ui.doneBadge('맞혔어요!'));
        endBox.appendChild(counter.view());
        var actRow = ui.el('div', 'tw20-actions');
        actRow.appendChild(ui.button('🔁 한 판 더', 'mx-btn primary', function () {
          startRound(true);
        }));
        if (typeof ctx.hasNext === 'function' && ctx.hasNext() && typeof ctx.goNext === 'function') {
          actRow.appendChild(ui.button('다음 관 ▶', 'mx-btn', function () {
            ctx.goNext();
          }));
        }
        endBox.appendChild(actRow);
        endBox.hidden = false;
      }

      function renderGuess() {
        if (solved) return;
        if (cands.length > GUESS_CAND_LIMIT && asked.length < GUESS_ASK_LIMIT) {
          guessBox.hidden = true;
          return;
        }
        guessRow.replaceChildren();
        ui.hint(hintEl, '');
        var opts = guessOptions(cands, answerN, Math.random);
        for (var i = 0; i < opts.length; i += 1) {
          (function (val) {
            var btn = ui.button(String(val), 'mx-btn tw20-guess', function () {
              if (solved || btn.disabled) return;
              if (val === answerN) {
                showWin();
                return;
              }
              btn.classList.add('is-shake');
              btn.disabled = true;
              setTimeout(function () { btn.classList.remove('is-shake'); }, 400);
              encourage();
              say('아니에요, 다른 수예요');
              tracker.wrong(val);
              ui.hint(hintEl, '💡 아니에요, 다른 수예요. 다른 수를 골라 봐요!');
            });
            guessRow.appendChild(btn);
          })(opts[i]);
        }
        guessBox.hidden = false;
      }

      function handleChipClick(chipId) {
        if (busy || solved) return;
        busy = true;
        var qText = core.chipText(chipId);
        say(qText);
        setTimeout(function () {
          if (myToken !== roundToken || solved) return;
          var yes = core.chipAnswer(answerN, chipId);
          var ansText = yes ? '네!' : '아니요!';
          answerEl.textContent = ansText;
          answerEl.hidden = false;
          say(ansText);
          addLogLine(qText, yes);
          asked.push({ id: chipId, answer: yes });
          cands = core.candidates(asked);
          updateStatus();
          renderChips();
          renderGuess();
          busy = false;
        }, 500);
      }

      function renderChips() {
        chipsBox.replaceChildren();
        var left = digitsLeft(cands, selectedCat);
        var cat = findCategory(selectedCat);
        digitsEl.hidden = left.length === 0;
        if (left.length) {
          digitsEl.textContent = left.length === 1
            ? cat.label + '는 ' + left[0] + '!'
            : cat.label + '는 ' + left.join(' · ') + ' 중 하나';
        }
        var list = pickChips(cands, selectedCat, MAX_CHIPS);
        if (list.length === 0) {
          chipsBox.hidden = true;
          emptyMsg.hidden = false;
          return;
        }
        emptyMsg.hidden = true;
        chipsBox.hidden = false;
        for (var i = 0; i < list.length; i += 1) {
          (function (chipId) {
            var btn = ui.button(core.chipText(chipId), 'mx-btn tw20-chip', function () {
              handleChipClick(chipId);
            });
            chipsBox.appendChild(btn);
          })(list[i]);
        }
      }

      for (var c = 0; c < CATEGORIES.length; c += 1) {
        (function (cat) {
          var btn = ui.button(cat.label, 'mx-btn tw20-cat', function () {
            if (solved) return;
            selectedCat = cat.id;
            updateCatButtons();
            renderChips();
          });
          catBtns[cat.id] = btn;
          catsRow.appendChild(btn);
        })(CATEGORIES[c]);
      }

      updateStatus();
      updateCatButtons();
      renderChips();
      renderGuess();
    }

    var firstExtra = typeof ctx.isDone === 'function' ? Boolean(ctx.isDone()) : false;
    startRound(firstExtra);
  }

  var lab = {
    title: '7관 🔍 수 스무고개',
    icon: '🔍',
    sub: '수 맞히기',
    render: render
  };

  global.NumberTwenty = {
    CATEGORIES: CATEGORIES,
    pickChips: pickChips,
    digitsLeft: digitsLeft,
    guessOptions: guessOptions,
    lab: lab
  };
})(typeof window !== 'undefined' ? window : globalThis);
