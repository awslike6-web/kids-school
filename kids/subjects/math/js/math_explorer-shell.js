// 수학 단원 탐험관 공용 틀 (MathExplorer): 탭·진도막대·보상·완주 창·그리기 도우미·에러리스 3지선다
// 5-2 4단원(소수의 곱셈)·5단원(직육면체)·6단원(평균과 가능성) 탐험관이 함께 쓴다.
// 화면 쪽 HTML 아이디 계약: mxTabs, mxContainer, mxDoneCount, mxTotal, mxProgressFill,
//   mxCompleteModal, mxCompleteReward, mxCompleteClose, mxGoQuiz
// 쓰는 법: MathExplorer.mount({ key: 'dm', labs: [관 6개], quiz: 퀴즈 탭 })
//   관 = { title, icon, sub, render(container, ctx) } — 활동을 마치면 ctx.complete()
(function (global) {
  'use strict';
  // 보상 엔진은 과목이 없으면 기본 '사회' 칸에 적립한다 → 수학으로 명시 (시간표 부스트도 수학 기준, 2026-11-23)
  if (!global.currentSubject) global.currentSubject = '수학';

  var SVG_NS = 'http://www.w3.org/2000/svg';

  function pad2(n) {
    return n < 10 ? '0' + n : String(n);
  }

  // 로컬(KST) 날짜 YYYY-MM-DD. toISOString은 UTC라 쓰지 않는다.
  function localDateKey(d) {
    var date = d && typeof d.getFullYear === 'function' ? d : new Date();
    return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate());
  }

  function safeCall(fnName, arg) {
    var fn = global[fnName];
    if (typeof fn !== 'function') return;
    try {
      fn(arg);
    } catch (e) {
      // 음성·효과음 오류는 학습을 멈추지 않는다
    }
  }

  function safeGrantReward(amount) {
    if (typeof global.grantRewardAndShowUI !== 'function') return;
    try {
      var res = global.grantRewardAndShowUI(amount, false, 'math');
      if (res && typeof res.catch === 'function') res.catch(function () {});
    } catch (e) {
      // 보상 저장 실패는 화면 진행을 막지 않는다 (notion-reward가 재시도·안내)
    }
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function svgEl(tag, attrs) {
    var node = document.createElementNS(SVG_NS, tag);
    if (attrs && typeof attrs === 'object') {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v !== null && v !== undefined && v !== '') node.setAttribute(k, String(v));
      });
    }
    return node;
  }

  // Fisher–Yates (원본 불변). 공용 QuizChoices가 있으면 그쪽을 쓴다.
  function shuffle(arr, rng) {
    if (global.QuizChoices && typeof global.QuizChoices.shuffle === 'function') {
      return global.QuizChoices.shuffle(arr, rng);
    }
    var rand = typeof rng === 'function' ? rng : Math.random;
    var out = arr.slice();
    for (var i = out.length - 1; i > 0; i -= 1) {
      var j = Math.floor(rand() * (i + 1));
      var tmp = out[i];
      out[i] = out[j];
      out[j] = tmp;
    }
    return out;
  }

  // 보기 화면 순서: [{text, index}] (index = 원래 번호). QuizChoices가 없으면 원래 순서.
  function arrangeChoices(choices, opts) {
    if (global.QuizChoices && typeof global.QuizChoices.arrange === 'function') {
      return global.QuizChoices.arrange(choices, opts || {});
    }
    return choices.map(function (text, index) { return { text: text, index: index }; });
  }

  function randInt(min, max, rng) {
    var rand = typeof rng === 'function' ? rng : Math.random;
    return min + Math.floor(rand() * (max - min + 1));
  }

  // 숫자·단위 뒤 조사: 마지막 글자를 읽은 소리의 받침으로 고른다 (8을, 4를, 7과, 9와, 3.2 kg이에요, 1.8 L예요)
  var DIGIT_BATCHIM = { 0: true, 1: true, 2: false, 3: true, 4: false, 5: false, 6: true, 7: true, 8: true, 9: false };
  var UNIT_BATCHIM = { kg: true, g: false, L: false, mL: false, m: false, cm: false, 'm²': false, 'cm²': false, '배': false, '칸': true, '개': false, '분': true, '점': true, '쪽': true };
  var JOSA = { eul: ['을', '를'], gwa: ['과', '와'], i: ['이', '가'], eun: ['은', '는'], ieyo: ['이에요', '예요'], ro: ['으로', '로'] };

  function hasBatchim(word) {
    var s = String(word).trim();
    var parts = s.split(/\s+/);
    var last = parts[parts.length - 1];
    if (Object.prototype.hasOwnProperty.call(UNIT_BATCHIM, last)) return UNIT_BATCHIM[last];
    var ch = s.charAt(s.length - 1);
    if (/[0-9]/.test(ch)) return DIGIT_BATCHIM[ch];
    var code = ch.charCodeAt(0);
    if (code >= 0xac00 && code <= 0xd7a3) return (code - 0xac00) % 28 !== 0;
    // 자음 글자(ㄱ~ㅎ)는 이름(기역·니은…)으로 읽으면 모두 받침이 있다: 면 ㄴㅂㅅㄷ과
    if (code >= 0x3131 && code <= 0x314e) return true;
    return false;
  }

  // ro: 받침 ㄹ(1·7·8)은 '로'
  function josa(word, type) {
    var pair = JOSA[type] || JOSA.eul;
    var b = hasBatchim(word);
    if (type === 'ro' && /[178]$/.test(String(word).trim())) b = false;
    return String(word) + (b ? pair[0] : pair[1]);
  }

  // 세로 분수 글자 표기 계약 (5분 퀘스트 formatFractions와 같은 꼴): 대분수 "2와 3/5"·"1과 3/4", 진분수·가분수 "3/5"
  var FRAC_RE = /(\d+)([와과]) (\d+)\/(\d+)|(\d+)\/(\d+)/g;

  // 글자 → [{ type: 'text', s } | { type: 'frac', w, n, d }] (w는 대분수일 때만)
  function fracParts(text) {
    var s = String(text === undefined || text === null ? '' : text);
    var out = [];
    var last = 0;
    var m;
    FRAC_RE.lastIndex = 0;
    while ((m = FRAC_RE.exec(s)) !== null) {
      if (m.index > last) out.push({ type: 'text', s: s.slice(last, m.index) });
      if (m[1] !== undefined) out.push({ type: 'frac', w: m[1], j: m[2], n: m[3], d: m[4] });
      else out.push({ type: 'frac', w: '', n: m[5], d: m[6] });
      last = FRAC_RE.lastIndex;
    }
    if (last < s.length) out.push({ type: 'text', s: s.slice(last) });
    return out;
  }

  // 분수 표기 뒤 조사: 분수는 분자를 마지막에 읽으므로("5분의 3") 분자에 맞춘다. "3/5"+을 → "3/5을", "2/5"+을 → "2/5를"
  function josaFrac(text, type) {
    var s = String(text);
    var m = /(\d+)\/\d+\s*$/.exec(s);
    var spoken = m ? m[1] : s;
    return s + josa(spoken, type).slice(String(spoken).length);
  }

  // 음성용: "2와 3/5" → "2와 5분의 3", "3/5" → "5분의 3"
  function fracSpeech(text) {
    return String(text === undefined || text === null ? '' : text).replace(FRAC_RE, function (all, w, j, n1, d1, n2, d2) {
      return w !== undefined ? w + j + ' ' + d1 + '분의 ' + n1 : d2 + '분의 ' + n2;
    });
  }

  // 세로 분수 요소 (분자 위·가로선·분모 아래, 대분수는 자연수와 붙임). innerHTML 없이 DOM으로 만든다.
  function fracNode(p) {
    var wrap = el('span', p.w ? 'mx-frac mx-frac-mixed' : 'mx-frac');
    wrap.setAttribute('aria-label', fracSpeech(p.w ? p.w + (p.j || '와') + ' ' + p.n + '/' + p.d : p.n + '/' + p.d));
    if (p.w) wrap.appendChild(el('span', 'mx-frac-whole', p.w));
    var stack = el('span', 'mx-frac-stack');
    stack.appendChild(el('span', 'mx-frac-num', p.n));
    stack.appendChild(el('span', 'mx-frac-den', p.d));
    wrap.appendChild(stack);
    return wrap;
  }

  // 노드 글자 채우기: 세로 분수가 켜져 있으면 분수 표기만 세로 분수 요소로, 나머지는 글자 그대로
  function fillText(node, text, fractions) {
    if (!fractions) {
      node.textContent = text === undefined || text === null ? '' : String(text);
      return node;
    }
    node.replaceChildren();
    fracParts(text).forEach(function (p) {
      node.appendChild(p.type === 'frac' ? fracNode(p) : document.createTextNode(p.s));
    });
    return node;
  }

  // opts.fractions: true면 질문·보기·힌트·해설·개념 카드·안내의 분수 표기를 세로 분수로 그린다
  function makeUi(say, praise, encourage, opts) {
    var fractions = Boolean(opts && opts.fractions);
    function textEl(tag, cls, text) {
      return fillText(el(tag, cls), text, fractions);
    }

    function button(text, cls, onClick) {
      var b = textEl('button', cls || 'mx-btn', text);
      b.type = 'button';
      if (typeof onClick === 'function') b.addEventListener('click', onClick);
      return b;
    }

    function hint(hintEl, text) {
      fillText(hintEl, text || '', fractions);
      hintEl.hidden = !text;
    }

    // 에러리스 3지선다. 틀리면 고른 보기만 조용히 꺼지고 노란 힌트 + 정답 보기 반짝임.
    // opts: { question, choices:[글자], answer: 원래 번호(0부터), hint: 글자|함수(틀린 번호),
    //         explain, onSolved, column, sayQuestion, onWrong(고른 글자) — 문항기록용, 선택 }
    function choiceQuestion(opts) {
      var box = el('div', 'mx-choice-box');
      if (opts.question) box.appendChild(textEl('p', 'mx-question', opts.question));
      var row = el('div', opts.column ? 'mx-choice-row mx-choice-col' : 'mx-choice-row');
      var hintEl = el('div', 'mx-hint');
      hintEl.hidden = true;
      box.appendChild(row);
      box.appendChild(hintEl);
      var solved = false;
      var answerBtn = null;
      arrangeChoices(opts.choices, { fixed: Boolean(opts.fixed) }).forEach(function (ch) {
        var btn = button(ch.text, opts.column ? 'mx-btn mx-choice mx-choice-wide' : 'mx-btn mx-choice');
        if (ch.index === opts.answer) answerBtn = btn;
        btn.addEventListener('click', function () {
          if (solved || btn.disabled) return;
          if (ch.index === opts.answer) {
            solved = true;
            btn.classList.remove('mx-glow');
            btn.classList.add('is-correct');
            praise();
            hint(hintEl, opts.explain ? '✨ ' + opts.explain : '');
            if (typeof opts.onSolved === 'function') opts.onSolved();
            return;
          }
          btn.disabled = true;
          btn.classList.add('is-off');
          if (typeof opts.onWrong === 'function') opts.onWrong(ch.text);
          encourage();
          var h = typeof opts.hint === 'function' ? opts.hint(ch.index) : opts.hint;
          hint(hintEl, '💡 ' + (h || '반짝이는 보기를 다시 살펴볼까요?'));
          if (answerBtn) answerBtn.classList.add('mx-glow');
        });
        row.appendChild(btn);
      });
      if (opts.sayQuestion && opts.question) say(opts.question);
      return box;
    }

    // 단계 진행: steps = [function(box, next)] 를 차례로 아래에 붙인다. 끝나면 onDone().
    function sequence(container, steps, onDone) {
      var i = 0;
      function runNext() {
        if (i >= steps.length) {
          if (typeof onDone === 'function') onDone();
          return;
        }
        var box = el('div', 'mx-step-box');
        container.appendChild(box);
        var step = steps[i];
        i += 1;
        var called = false;
        step(box, function () {
          if (called) return;
          called = true;
          runNext();
        });
      }
      runNext();
    }

    return {
      el: el,
      svg: svgEl,
      shuffle: shuffle,
      arrange: arrangeChoices,
      randInt: randInt,
      josa: josa,
      button: button,
      hint: hint,
      choiceQuestion: choiceQuestion,
      sequence: sequence,
      card: function (title) {
        var card = el('section', 'mx-card');
        if (title) card.appendChild(el('h2', 'mx-title', title));
        return card;
      },
      guide: function (text) {
        return textEl('p', 'mx-guide', text);
      },
      concept: function (title, body) {
        var card = el('div', 'mx-card mx-concept');
        var head = el('div', 'mx-concept-head');
        head.appendChild(textEl('div', 'mx-title', title));
        head.appendChild(button('🔊 들어 보기', 'mx-btn', function () { say(body); }));
        card.appendChild(head);
        card.appendChild(textEl('p', 'mx-concept-body', body));
        return card;
      },
      // 아무 노드에나 분수 표기를 세로 분수로 채운다 (단원 화면용)
      fill: function (node, text) { return fillText(node, text, fractions); },
      fracNode: function (text) { return fillText(el('span', 'mx-frac-line'), text, true); },
      fractions: fractions,
      doneBadge: function (text) {
        return el('div', 'mx-done', '✅ ' + (text || '이 관을 마쳤어요!'));
      },
      board: function (viewBox, cls) {
        var wrap = el('div', cls ? 'mx-board ' + cls : 'mx-board');
        var s = svgEl('svg', { viewBox: viewBox });
        wrap.appendChild(s);
        return { wrap: wrap, svg: s };
      },
      text: function (s, x, y, str, cls, anchor) {
        var t = svgEl('text', { x: x, y: y, class: cls || 'mx-label', 'text-anchor': anchor || 'middle', 'dominant-baseline': 'central' });
        t.textContent = str;
        s.appendChild(t);
        return t;
      }
    };
  }

  function mount(config) {
    var cfg = config || {};
    var tabsNav = document.getElementById('mxTabs');
    var container = document.getElementById('mxContainer');
    if (!tabsNav || !container) return null;

    var labs = Array.isArray(cfg.labs) ? cfg.labs : [];
    var total = labs.length;
    var tabs = labs.slice();
    if (cfg.quiz) tabs.push(cfg.quiz);
    var doneMap = labs.map(function () { return false; });
    var tabButtons = [];
    var doneCountEl = document.getElementById('mxDoneCount');
    var totalEl = document.getElementById('mxTotal');
    var progressFillEl = document.getElementById('mxProgressFill');
    var modalEl = document.getElementById('mxCompleteModal');
    var modalRewardEl = document.getElementById('mxCompleteReward');
    if (totalEl) totalEl.textContent = String(total);

    function countDone() {
      return doneMap.filter(Boolean).length;
    }

    function updateProgressUI() {
      var done = countDone();
      if (doneCountEl) doneCountEl.textContent = String(done);
      if (progressFillEl) progressFillEl.style.width = (total ? Math.round((done / total) * 100) : 0) + '%';
      for (var i = 0; i < total; i += 1) {
        var btn = tabButtons[i];
        if (btn && doneMap[i]) {
          btn.classList.add('done');
          var badge = btn.querySelector('.mx-tab-badge');
          if (badge) badge.textContent = '✅';
        }
      }
    }

    // 모든 관을 마치면 하루 한 번 +5 보너스 (단원·학생·로컬 날짜별 키)
    function openCompleteModal() {
      if (!modalEl) return;
      var child = global.currentChild || 'minsu';
      var key = 'math_' + (cfg.key || 'explorer') + '_allclear_' + child + '_' + localDateKey();
      var already = false;
      try {
        already = Boolean(global.localStorage.getItem(key));
      } catch (e) {
        already = false;
      }
      if (!already) {
        safeGrantReward(5);
        try {
          global.localStorage.setItem(key, '1');
        } catch (e) {
          // 저장 실패 시 다음에 한 번 더 받을 수 있을 뿐이다
        }
      }
      if (modalRewardEl) {
        // 민서는 사탕, 민수는 보석 (지급 엔진은 아이별로 처리, 여기는 보이는 글자만, 2026-11-24)
        var minseo = global.currentChild === 'minseo';
        modalRewardEl.textContent = already
          ? '오늘 보너스는 이미 받았어요. 내일 또 도전해요!'
          : (minseo ? '사탕 +5🍬 보너스를 받았어요!' : '보석 +5💎 보너스를 받았어요!');
      }
      modalEl.hidden = false;
    }

    // 관 완주: 이번 페이지에서 처음일 때만 보석 1개
    function markDone(idx) {
      if (idx < 0 || idx >= total || doneMap[idx]) return;
      doneMap[idx] = true;
      updateProgressUI();
      safeGrantReward(1);
      if (countDone() === total) {
        safeCall('fairyReward');
        openCompleteModal();
      }
    }

    function makeCtx(tabIdx) {
      var fractions = Boolean(cfg.fractions);
      // 세로 분수를 켠 화면은 "3/5"를 "5분의 3"으로 바꿔 읽는다
      var say = function (text) { safeCall('speakFairyTTS', fractions ? fracSpeech(text) : text); };
      var praise = function () { safeCall('fairyPraise'); };
      var encourage = function () { safeCall('fairyEncourage'); };
      return {
        ui: makeUi(say, praise, encourage, { fractions: fractions }),
        say: say,
        praise: praise,
        encourage: encourage,
        reward: function () { safeGrantReward(1); },
        finale: function () { safeCall('fairyReward'); },
        complete: function () { markDone(tabIdx); },
        isDone: function () { return Boolean(doneMap[tabIdx]); },
        redraw: function () { selectTab(tabIdx, false); },
        // 다음 관 열기 (저학년 [다음 관 ▶], 2026-11-24). 마지막 관 다음은 퀴즈 탭
        hasNext: function () { return tabIdx + 1 < tabs.length; },
        goNext: function () { if (tabIdx + 1 < tabs.length) selectTab(tabIdx + 1, true); }
      };
    }

    // scroll: 아이가 탭을 눌렀을 때만 내용 위치로 내려간다 (첫 화면은 제목·진도부터 보이게)
    // cfg.rememberTab: 아이·화면별 마지막 관을 기억했다가 다시 열 때 그 관부터 (2026-11-24, 민서 "들어가는 길이 길면 피함")
    var tabMemoryKey = 'math_' + (cfg.key || 'explorer') + '_tab_' + (global.currentChild || 'minsu');
    function rememberTab(idx) {
      if (!cfg.rememberTab) return;
      try { global.localStorage.setItem(tabMemoryKey, String(idx)); } catch (e) { /* 기억 못 해도 진행 */ }
    }
    function savedTab() {
      if (!cfg.rememberTab) return 0;
      var n = 0;
      try { n = parseInt(global.localStorage.getItem(tabMemoryKey), 10); } catch (e) { n = 0; }
      return n >= 0 && n < tabs.length ? n : 0;
    }

    function selectTab(idx, scroll) {
      rememberTab(idx);
      tabButtons.forEach(function (b, i) {
        b.classList.toggle('active', i === idx);
        b.setAttribute('aria-selected', i === idx ? 'true' : 'false');
      });
      container.replaceChildren();
      var tab = tabs[idx];
      if (tab && typeof tab.render === 'function') {
        tab.render(container, makeCtx(idx));
      } else {
        container.appendChild(el('div', 'mx-card', '이 관은 아직 준비 중이에요.'));
      }
      if (scroll) container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    tabs.forEach(function (tab, idx) {
      var btn = el('button', 'mx-tab-btn');
      btn.type = 'button';
      btn.setAttribute('role', 'tab');
      var top = el('span', 'mx-tab-top');
      top.appendChild(el('span', 'mx-tab-icon', tab.icon || '⭐'));
      top.appendChild(el('span', 'mx-tab-badge', ''));
      btn.appendChild(top);
      btn.appendChild(el('span', 'mx-tab-title', tab.title || (idx + 1) + '관'));
      btn.appendChild(el('span', 'mx-tab-sub', tab.sub || ''));
      btn.addEventListener('click', function () { selectTab(idx, true); });
      tabsNav.appendChild(btn);
      tabButtons.push(btn);
    });

    var closeBtn = document.getElementById('mxCompleteClose');
    var goQuizBtn = document.getElementById('mxGoQuiz');
    if (closeBtn && modalEl) closeBtn.addEventListener('click', function () { modalEl.hidden = true; });
    if (goQuizBtn && modalEl) {
      goQuizBtn.hidden = !cfg.quiz;
      goQuizBtn.addEventListener('click', function () {
        modalEl.hidden = true;
        selectTab(total, true);
      });
    }

    updateProgressUI();
    // 🫧 말랑 버튼: 화면이 math_squishy.js를 실었으면 머리에 [🫧 내 버튼]을 붙이고 모든 버튼에 감촉·소리 (2026-11-24)
    if (global.MathSquishy && typeof global.MathSquishy.mount === 'function') {
      try { global.MathSquishy.mount(document.querySelector('.mx-header')); } catch (e) { /* 꾸미기 실패는 학습을 막지 않음 */ }
    }
    selectTab(savedTab(), false);
    return { selectTab: selectTab, markDone: markDone };
  }

  global.MathExplorer = {
    mount: mount,
    makeUi: makeUi,
    localDateKey: localDateKey,
    shuffle: shuffle,
    randInt: randInt,
    josa: josa,
    hasBatchim: hasBatchim,
    fracParts: fracParts,
    fracSpeech: fracSpeech,
    josaFrac: josaFrac
  };
})(typeof window !== 'undefined' ? window : globalThis);
