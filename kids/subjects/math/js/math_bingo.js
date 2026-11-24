// 초1·2 수학 3×3 빙고 공용 모듈 (MathBingo)
(function (global) {
  'use strict';

  var STYLE_ID = 'mx-bingo-style';
  var LINES = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6]
  ];

  function noop() {}

  // 다 찬 줄의 LINES 번호 배열 반환
  function completedLines(marked) {
    var out = [];
    if (!marked || marked.length < 9) return out;
    for (var i = 0; i < LINES.length; i += 1) {
      var line = LINES[i];
      if (marked[line[0]] && marked[line[1]] && marked[line[2]]) out.push(i);
    }
    return out;
  }

  // 답 글자 배열을 원본 변경 없이 섞어 반환
  function autoPlace(answers, rng) {
    var list = Array.isArray(answers) ? answers.slice() : [];
    var rand = typeof rng === 'function' ? rng : Math.random;
    var i, j, tmp;
    for (i = list.length - 1; i > 0; i -= 1) {
      j = Math.floor(rand() * (i + 1));
      if (j < 0) j = 0;
      if (j > i) j = i;
      tmp = list[i];
      list[i] = list[j];
      list[j] = tmp;
    }
    return list;
  }

  // 3줄 이상 완성이거나 9칸 모두 찼으면 true
  function isRoundOver(marked) {
    if (!marked || marked.length < 9) return false;
    if (completedLines(marked).length >= 3) return true;
    for (var i = 0; i < 9; i += 1) {
      if (!marked[i]) return false;
    }
    return true;
  }

  // 빙고 전용 스타일을 head에 한 번만 삽입
  function ensureStyle() {
    if (typeof document === 'undefined' || !document || !document.head) return;
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = [
      '.mx-bingo-wrap{width:100%;max-width:340px;margin:0 auto;text-align:center}',
      '.mx-bingo-wrap [hidden]{display:none}',
      '.mx-bingo-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;',
      'width:100%;max-width:330px;margin:10px auto}',
      '.mx-bingo-cell{min-height:88px;aspect-ratio:1/1;width:100%;box-sizing:border-box;',
      'padding:4px;border-radius:14px;border:2px dashed var(--mx-line,#fcd34d);',
      'background:#fff;color:var(--mx-strong,#b45309);font-size:1.4rem;font-weight:800;',
      'display:flex;align-items:center;justify-content:center;position:relative;cursor:pointer}',
      '.mx-bingo-cell.is-filled{border-style:solid;background:var(--mx-soft,#fffbeb)}',
      '.mx-bingo-cell.is-popped{border:2.5px solid var(--mx-accent,#f59e0b);',
      'background:var(--mx-soft,#fffbeb);color:var(--mx-strong,#b45309);',
      'animation:mxBingoPop .3s ease}',
      '.mx-bingo-cell.is-popped::after{content:"⭐";position:absolute;top:4px;right:6px;',
      'font-size:.95rem;line-height:1}',
      '.mx-bingo-cell.is-line{border-color:var(--mx-strong,#b45309);',
      'box-shadow:0 0 0 3px var(--mx-accent,#f59e0b);animation:mxBingoLine .6s ease}',
      '.mx-bingo-cell.is-shake{animation:mxBingoShake .4s ease}',
      '.mx-bingo-cell.mx-glow{border-color:var(--mx-accent,#f59e0b);',
      'box-shadow:0 0 0 3px var(--mx-accent,#f59e0b);animation:mxBingoGlow .9s ease infinite}',
      '.mx-bingo-chips{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;',
      'width:100%;max-width:330px;margin:10px auto}',
      '.mx-bingo-chip{min-height:56px;width:100%;box-sizing:border-box;border-radius:12px;',
      'border:2px solid var(--mx-line,#fcd34d);background:#fff;font-size:1.2rem;font-weight:700;',
      'color:var(--mx-strong,#b45309)}',
      '.mx-bingo-chip.is-picked{border:2.5px solid var(--mx-strong,#b45309);',
      'background:var(--mx-soft,#fffbeb);box-shadow:0 0 0 2px var(--mx-accent,#f59e0b)}',
      '.mx-bingo-auto,.mx-bingo-hear,.mx-bingo-unlock-btn{min-height:56px;box-sizing:border-box}',
      '.mx-bingo-auto{width:100%;max-width:330px;margin:6px auto 0}',
      '.mx-bingo-call-bar{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;',
      'gap:8px;margin:8px 0;padding:10px;border-radius:14px;',
      'background:var(--mx-soft,#fffbeb);border:1.5px solid var(--mx-line,#fcd34d)}',
      '.mx-bingo-call{font-size:1.35rem;font-weight:800;color:var(--mx-strong,#b45309);',
      'flex:1 1 180px;word-break:keep-all}',
      '.mx-bingo-banner{margin:8px auto;padding:8px 14px;border-radius:999px;font-weight:800;',
      'font-size:1.1rem;background:var(--mx-accent,#f59e0b);color:#fff;display:inline-block}',
      '.mx-bingo-unlock{margin:10px auto;padding:12px;border-radius:14px;',
      'background:var(--mx-soft,#fffbeb);border:1.5px solid var(--mx-line,#fcd34d)}',
      '.mx-bingo-unlock-msg{margin:0 0 8px;font-weight:700;color:var(--mx-strong,#b45309)}',
      '.mx-bingo-unlock-row{display:flex;flex-wrap:wrap;gap:8px;justify-content:center}',
      '.mx-bingo-actions{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:10px}',
      '.mx-bingo-actions .mx-btn{min-height:56px;flex:1 1 140px;box-sizing:border-box}',
      '@keyframes mxBingoShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}',
      '50%{transform:translateX(6px)}75%{transform:translateX(-4px)}}',
      '@keyframes mxBingoPop{0%{transform:scale(.9)}60%{transform:scale(1.06)}100%{transform:scale(1)}}',
      '@keyframes mxBingoLine{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}',
      '@keyframes mxBingoGlow{0%,100%{box-shadow:0 0 0 2px var(--mx-accent,#f59e0b)}',
      '50%{box-shadow:0 0 0 5px var(--mx-accent,#f59e0b)}}',
      '@media (prefers-reduced-motion:reduce){',
      '.mx-bingo-cell.is-shake,.mx-bingo-cell.is-line,.mx-bingo-cell.is-popped,',
      '.mx-bingo-cell.mx-glow{animation:none;transition:none}}'
    ].join('');
    document.head.appendChild(s);
  }

  function speakProblem(p) {
    if (!p) return '';
    // 문제가 읽는 말을 따로 가지면 그것을 읽는다 (1학년 10 빙고 「8 더하기 몇은 10?」, 2026-11-24)
    if (typeof p.speak === 'string' && p.speak) return p.speak;
    if (global.TwoDigitCore && typeof global.TwoDigitCore.speakText === 'function' &&
        (p.op || p.ops || p.kind === 'box-add')) {
      return global.TwoDigitCore.speakText(p);
    }
    return p.call || '';
  }

  function trackProblem(prefix, kind) {
    if (global.MathDrill && typeof global.MathDrill.track === 'function') {
      return global.MathDrill.track(prefix, kind);
    }
    return { wrong: noop, done: noop };
  }

  function makeCounter(ui, key, perReward) {
    if (global.MathDrill && typeof global.MathDrill.counter === 'function') {
      return global.MathDrill.counter(key, { perReward: perReward });
    }
    return {
      add: noop,
      view: function () { return ui.el('span', 'mx-drill-count', ''); }
    };
  }

  function getLockedSounds() {
    var sq = global.MathSquishy;
    var out = [];
    if (!sq || !Array.isArray(sq.SOUNDS) || typeof sq.isUnlocked !== 'function') return out;
    if (typeof sq.unlock !== 'function') return out;
    for (var i = 0; i < sq.SOUNDS.length; i += 1) {
      var item = sq.SOUNDS[i];
      if (item && item.locked && !sq.isUnlocked(item.id)) out.push(item);
    }
    return out;
  }

  // 빙고 한 판을 area 안에 그린다
  function render(area, ctx, o) {
    ensureStyle();
    var ui = ctx.ui;
    var say = typeof ctx.say === 'function' ? ctx.say : noop;
    var praise = typeof ctx.praise === 'function' ? ctx.praise : noop;
    var encourage = typeof ctx.encourage === 'function' ? ctx.encourage : noop;
    var cnt = makeCounter(ui, o.counterKey, o.perReward || 6);
    var roundToken = 0;

    function startRound(extra) {
      roundToken += 1;
      var myToken = roundToken;
      area.replaceChildren();

      var card = ui.card(o.title || '🎯 수 빙고');
      var wrap = ui.el('div', 'mx-bingo-wrap');
      card.appendChild(wrap);
      area.appendChild(card);

      var problems = o.makeBingo();
      var answers = [];
      for (var i = 0; i < problems.length; i += 1) answers.push(problems[i].answerText);

      var phase = 'place';
      var board = [null, null, null, null, null, null, null, null, null];
      var marked = [false, false, false, false, false, false, false, false, false];
      var filledCount = 0;
      var poppedCount = 0;
      var pickedChip = null;
      var chipItems = [];
      var cellBtns = [];
      var queue = [];
      var qIdx = 0;
      var wrongCount = 0;
      var tracker = { wrong: noop, done: noop };
      var prevLines = [];
      var locked = false;

      var guideEl = ui.guide('숫자를 골라 내 판에 놓아요');
      var bannerEl = ui.el('div', 'mx-bingo-banner', '');
      bannerEl.hidden = true;
      var callBar = ui.el('div', 'mx-bingo-call-bar');
      var callEl = ui.el('div', 'mx-bingo-call');
      var hearBtn = ui.button('🔊 다시 듣기', 'mx-btn mx-bingo-hear', function () {
        if (phase === 'play' && queue[qIdx]) say(speakProblem(queue[qIdx]));
      });
      callBar.appendChild(callEl);
      callBar.appendChild(hearBtn);
      callBar.hidden = true;

      var grid = ui.el('div', 'mx-bingo-grid');
      var hintEl = ui.el('div', 'mx-hint');
      hintEl.hidden = true;
      var chipsBox = ui.el('div', 'mx-bingo-chips');
      var autoBtn = ui.button('✨ 알아서 놓기', 'mx-btn primary mx-bingo-auto', handleAutoPlace);
      var endBox = ui.el('div', 'mx-bingo-end');
      endBox.hidden = true;

      wrap.appendChild(guideEl);
      wrap.appendChild(bannerEl);
      wrap.appendChild(callBar);
      wrap.appendChild(grid);
      wrap.appendChild(hintEl);
      wrap.appendChild(chipsBox);
      wrap.appendChild(autoBtn);
      wrap.appendChild(endBox);

      function clearGlow() {
        for (var k = 0; k < cellBtns.length; k += 1) cellBtns[k].classList.remove('mx-glow');
      }

      function showCurrentProblem() {
        var p = queue[qIdx];
        wrongCount = 0;
        clearGlow();
        ui.hint(hintEl, '');
        tracker = trackProblem(o.prefix, p.kind);
        ui.fill(callEl, p.call);
        say(speakProblem(p));
      }

      function enterPlayPhase() {
        phase = 'play';
        guideEl.hidden = true;
        chipsBox.hidden = true;
        autoBtn.hidden = true;
        ui.hint(hintEl, '');
        callBar.hidden = false;
        queue = autoPlace(problems);
        qIdx = 0;
        locked = false;
        showCurrentProblem();
      }

      function buildUnlockBox() {
        var lockedList = getLockedSounds();
        if (!lockedList.length) return null;
        var box = ui.el('div', 'mx-bingo-unlock');
        var msg = ui.el('p', 'mx-bingo-unlock-msg', '🎁 새 버튼 소리 하나를 골라 열어요!');
        var row = ui.el('div', 'mx-bingo-unlock-row');
        for (var j = 0; j < lockedList.length; j += 1) {
          (function (item) {
            var b = ui.button(item.label, 'mx-btn mx-bingo-unlock-btn', function () {
              global.MathSquishy.unlock(item.id);
              if (typeof global.MathSquishy.play === 'function') global.MathSquishy.play(item.id);
              msg.textContent = '열렸어요! 🫧 내 버튼에서 골라 써요';
              if (row.parentNode === box) box.removeChild(row);
            });
            row.appendChild(b);
          })(lockedList[j]);
        }
        box.appendChild(msg);
        box.appendChild(row);
        return box;
      }

      function finishRound() {
        phase = 'done';
        locked = true;
        clearGlow();
        callBar.hidden = true;
        ui.hint(hintEl, '');
        var doneNow = typeof ctx.isDone === 'function' ? ctx.isDone() : false;
        if (!extra && !doneNow && typeof ctx.complete === 'function') ctx.complete();
        endBox.replaceChildren();
        endBox.appendChild(ui.doneBadge('빙고 완성! (' + poppedCount + '칸)'));
        endBox.appendChild(cnt.view());
        var unlockBox = buildUnlockBox();
        if (unlockBox) endBox.appendChild(unlockBox);
        var actRow = ui.el('div', 'mx-bingo-actions');
        actRow.appendChild(ui.button('🔁 한 판 더', 'mx-btn primary', function () {
          startRound(true);
        }));
        if (typeof ctx.hasNext === 'function' && ctx.hasNext() && typeof ctx.goNext === 'function') {
          actRow.appendChild(ui.button('다음 관 ▶', 'mx-btn', function () { ctx.goNext(); }));
        }
        endBox.appendChild(actRow);
        endBox.hidden = false;
      }

      function placeInCell(idx, text) {
        board[idx] = text;
        filledCount += 1;
        cellBtns[idx].textContent = text;
        cellBtns[idx].classList.add('is-filled');
      }

      function handleAutoPlace() {
        if (phase !== 'place') return;
        var remTexts = [];
        var remCells = [];
        var k;
        for (k = 0; k < chipItems.length; k += 1) {
          if (!chipItems[k].used) {
            remTexts.push(chipItems[k].text);
            chipItems[k].used = true;
            if (chipItems[k].btn.parentNode) chipItems[k].btn.parentNode.removeChild(chipItems[k].btn);
          }
        }
        for (k = 0; k < 9; k += 1) {
          if (board[k] === null) remCells.push(k);
        }
        var mixed = autoPlace(remTexts);
        for (k = 0; k < remCells.length && k < mixed.length; k += 1) {
          placeInCell(remCells[k], mixed[k]);
        }
        pickedChip = null;
        if (filledCount >= 9) enterPlayPhase();
      }

      function handleCellClick(idx) {
        if (phase === 'place') {
          if (board[idx] !== null) return;
          if (!pickedChip) {
            ui.hint(hintEl, '먼저 아래 숫자를 골라요');
            return;
          }
          placeInCell(idx, pickedChip.text);
          pickedChip.used = true;
          if (pickedChip.btn.parentNode) pickedChip.btn.parentNode.removeChild(pickedChip.btn);
          pickedChip = null;
          ui.hint(hintEl, '');
          if (filledCount >= 9) enterPlayPhase();
          return;
        }
        if (phase !== 'play' || locked || marked[idx]) return;

        var cur = queue[qIdx];
        var cell = cellBtns[idx];
        if (board[idx] === cur.answerText) {
          marked[idx] = true;
          poppedCount += 1;
          cell.classList.remove('mx-glow');
          cell.classList.remove('is-shake');
          cell.classList.add('is-popped');
          cell.disabled = true;
          ui.hint(hintEl, '');
          praise();
          tracker.done();
          if (extra) cnt.add();

          var lines = completedLines(marked);
          if (lines.length > prevLines.length) {
            for (var li = 0; li < lines.length; li += 1) {
              var lineIdx = lines[li];
              if (prevLines.indexOf(lineIdx) === -1) {
                var cells = LINES[lineIdx];
                for (var ci = 0; ci < cells.length; ci += 1) {
                  cellBtns[cells[ci]].classList.add('is-line');
                }
              }
            }
            prevLines = lines;
            var msg = '빙고 ' + lines.length + '줄!';
            bannerEl.textContent = msg;
            bannerEl.hidden = false;
            say(msg);
          }

          locked = true;
          setTimeout(function () {
            if (myToken !== roundToken) return;
            if (isRoundOver(marked) || qIdx + 1 >= queue.length) {
              finishRound();
            } else {
              qIdx += 1;
              locked = false;
              showCurrentProblem();
            }
          }, 600);
          return;
        }

        // 오답: 에러리스(흔들림 + 노란 안내, 두 번째 오답에 정답 칸 반짝임)
        cell.classList.remove('is-shake');
        cell.classList.add('is-shake');
        if (cell._mxShakeTimer) clearTimeout(cell._mxShakeTimer);
        cell._mxShakeTimer = setTimeout(function () {
          cell.classList.remove('is-shake');
        }, 400);
        encourage();
        tracker.wrong(board[idx]);
        ui.hint(hintEl, '다시 계산해 볼까요? 🔊로 다시 들을 수 있어요');
        wrongCount += 1;
        if (wrongCount >= 2) {
          for (var c = 0; c < 9; c += 1) {
            if (board[c] === cur.answerText && !marked[c]) {
              cellBtns[c].classList.add('mx-glow');
              break;
            }
          }
        }
      }

      // 3×3 판 칸 생성
      for (var cIdx = 0; cIdx < 9; cIdx += 1) {
        (function (index) {
          var cell = ui.button('', 'mx-btn mx-bingo-cell', function () {
            handleCellClick(index);
          });
          cellBtns.push(cell);
          grid.appendChild(cell);
        })(cIdx);
      }

      // 섞은 답 칩 9개 생성
      var shuffledAnswers = autoPlace(answers);
      for (var aIdx = 0; aIdx < shuffledAnswers.length; aIdx += 1) {
        (function (text) {
          var item = { text: text, used: false, btn: null };
          item.btn = ui.button(text, 'mx-btn mx-bingo-chip', function () {
            if (phase !== 'place' || item.used) return;
            for (var m = 0; m < chipItems.length; m += 1) {
              chipItems[m].btn.classList.remove('is-picked');
            }
            item.btn.classList.add('is-picked');
            pickedChip = item;
            ui.hint(hintEl, '');
          });
          chipItems.push(item);
          chipsBox.appendChild(item.btn);
        })(shuffledAnswers[aIdx]);
      }
    }

    var firstExtra = typeof ctx.isDone === 'function' ? Boolean(ctx.isDone()) : false;
    startRound(firstExtra);
  }

  global.MathBingo = {
    LINES: LINES,
    completedLines: completedLines,
    autoPlace: autoPlace,
    isRoundOver: isRoundOver,
    render: render
  };
})(typeof window !== 'undefined' ? window : globalThis);
