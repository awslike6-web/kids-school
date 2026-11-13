// 5-2 수학 3단원 합동과 대칭: 탭·보상·공용 화면 도우미 (CSMain)
// 싣는 순서: geo → views → fold → grid → quiz → main. 각 관은 render(container, ctx)로 그린다.
(function (global) {
  'use strict';

  var TABS_TOTAL = 6;
  var SVG_NS = 'http://www.w3.org/2000/svg';
  var BOARD_VIEWBOX = '-0.6 -0.6 9.2 9.2';

  function pad2(n) {
    return n < 10 ? '0' + n : String(n);
  }

  // 로컬(KST) 날짜 YYYY-MM-DD. toISOString은 UTC라 쓰지 않는다.
  function localDateKey(d) {
    var date = d instanceof Date ? d : new Date();
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

  function shuffle(arr, rng) {
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

  // 관 화면이 함께 쓰는 그리기 도우미. say는 개념 카드의 🔊 버튼에 쓴다.
  function makeUi(say) {
    return {
      el: el,
      shuffle: shuffle,
      pts: function (poly, dx, dy) {
        var ox = dx || 0;
        var oy = dy || 0;
        return poly.map(function (p) { return (p[0] + ox) + ',' + (p[1] + oy); }).join(' ');
      },
      board: function (viewBox) {
        var wrap = el('div', 'cs-board');
        var svg = svgEl('svg', { viewBox: viewBox || BOARD_VIEWBOX });
        wrap.appendChild(svg);
        return { wrap: wrap, svg: svg };
      },
      grid: function (svg, opts) {
        var o = opts || {};
        var size = o.size || 8;
        var ox = o.ox || 0;
        for (var i = 0; i <= size; i += 1) {
          svg.appendChild(svgEl('line', { x1: ox + i, y1: 0, x2: ox + i, y2: size, class: 'cs-grid-line' }));
          svg.appendChild(svgEl('line', { x1: ox, y1: i, x2: ox + size, y2: i, class: 'cs-grid-line' }));
        }
        if (o.dots) {
          for (var x = 0; x <= size; x += 1) {
            for (var y = 0; y <= size; y += 1) {
              svg.appendChild(svgEl('circle', { cx: ox + x, cy: y, r: 0.055, class: 'cs-grid-dot' }));
            }
          }
        }
      },
      label: function (svg, x, y, text, cls) {
        var t = svgEl('text', { x: x, y: y, class: cls || 'cs-label', 'text-anchor': 'middle', 'dominant-baseline': 'central' });
        t.textContent = text;
        svg.appendChild(t);
        return t;
      },
      concept: function (title, body) {
        var card = el('div', 'cs-card cs-concept');
        var head = el('div', 'cs-concept-head');
        head.appendChild(el('div', 'cs-title', title));
        var btn = el('button', 'cs-btn', '🔊 들어 보기');
        btn.type = 'button';
        btn.addEventListener('click', function () { say(body); });
        head.appendChild(btn);
        card.appendChild(head);
        card.appendChild(el('p', 'cs-concept-body', body));
        return card;
      },
      hint: function (hintEl, text) {
        hintEl.textContent = text || '';
        hintEl.hidden = !text;
      },
      // 포인터 위치 → 가장 가까운 모눈 교차점. 0.45칸 넘게 떨어지면 null.
      gridPoint: function (svg, evt, max) {
        var ctm = svg.getScreenCTM();
        if (!ctm) return null;
        var pt = svg.createSVGPoint();
        pt.x = evt.clientX;
        pt.y = evt.clientY;
        var loc = pt.matrixTransform(ctm.inverse());
        var gx = Math.round(loc.x);
        var gy = Math.round(loc.y);
        var lim = typeof max === 'number' ? max : 8;
        if (gx < 0 || gx > lim || gy < 0 || gy > lim) return null;
        if (Math.hypot(loc.x - gx, loc.y - gy) > 0.45) return null;
        return [gx, gy];
      }
    };
  }

  function init() {
    var tabsNav = document.getElementById('csTabs');
    var container = document.getElementById('csContainer');
    if (!tabsNav || !container) return;

    var doneCountEl = document.getElementById('csDoneCount');
    var progressFillEl = document.getElementById('csProgressFill');
    var modalEl = document.getElementById('csCompleteModal');
    var modalRewardEl = document.getElementById('csCompleteReward');
    var views = global.CSViews || {};
    var fold = global.CSFold || {};
    var grid = global.CSGrid || {};
    var quiz = global.CSQuiz || null;
    var doneMap = [false, false, false, false, false, false];
    var tabButtons = [];

    var tabs = [views.tab1, views.tab2, fold.tab3, grid.tab4, fold.tab5, grid.tab6];
    tabs.push(quiz ? quiz.tab : null);

    function countDone() {
      return doneMap.filter(Boolean).length;
    }

    function updateProgressUI() {
      var done = countDone();
      if (doneCountEl) doneCountEl.textContent = String(done);
      if (progressFillEl) progressFillEl.style.width = Math.round((done / TABS_TOTAL) * 100) + '%';
      for (var i = 0; i < TABS_TOTAL; i += 1) {
        var btn = tabButtons[i];
        if (btn && doneMap[i]) {
          btn.classList.add('done');
          var badge = btn.querySelector('.cs-tab-badge');
          if (badge) badge.textContent = '✅';
        }
      }
    }

    // 6개 관을 모두 마치면 하루 한 번 +5 보너스 (학생·로컬 날짜별 키)
    function openCompleteModal() {
      if (!modalEl) return;
      var child = global.currentChild || 'minsu';
      var key = 'math_cs_allclear_' + child + '_' + localDateKey();
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
        modalRewardEl.textContent = already
          ? '오늘 보너스는 이미 받았어요. 내일 또 도전해요!'
          : '보석 +5💎 보너스를 받았어요!';
      }
      modalEl.hidden = false;
    }

    // 관 완주: 이번 페이지에서 처음일 때만 보석 1개
    function markDone(idx) {
      if (idx < 0 || idx >= TABS_TOTAL || doneMap[idx]) return;
      doneMap[idx] = true;
      updateProgressUI();
      safeGrantReward(1);
      if (countDone() === TABS_TOTAL) {
        safeCall('fairyReward');
        openCompleteModal();
      }
    }

    function makeCtx(tabIdx) {
      var say = function (text) { safeCall('speakFairyTTS', text); };
      return {
        geo: global.CongruenceGeo,
        ui: makeUi(say),
        say: say,
        praise: function () { safeCall('fairyPraise'); },
        encourage: function () { safeCall('fairyEncourage'); },
        reward: function () { safeGrantReward(1); },
        finale: function () { safeCall('fairyReward'); },
        svg: svgEl,
        complete: function () { markDone(tabIdx); }
      };
    }

    // scroll: 아이가 탭을 눌렀을 때만 내용 위치로 내려간다 (첫 화면은 제목·진도부터 보이게)
    function selectTab(idx, scroll) {
      tabButtons.forEach(function (b, i) {
        b.classList.toggle('active', i === idx);
        b.setAttribute('aria-selected', i === idx ? 'true' : 'false');
      });
      container.replaceChildren();
      var tab = tabs[idx];
      if (tab && typeof tab.render === 'function') {
        tab.render(container, makeCtx(idx));
      } else {
        container.appendChild(el('div', 'cs-card', '이 관은 아직 준비 중이에요.'));
      }
      if (scroll) container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    tabs.forEach(function (tab, idx) {
      var meta = tab || { title: (idx + 1) + '관', icon: '⏳', sub: '' };
      var btn = el('button', 'cs-tab-btn');
      btn.type = 'button';
      btn.setAttribute('role', 'tab');
      var top = el('span', 'cs-tab-top');
      top.appendChild(el('span', 'cs-tab-icon', meta.icon));
      top.appendChild(el('span', 'cs-tab-badge', ''));
      btn.appendChild(top);
      btn.appendChild(el('span', 'cs-tab-title', meta.title));
      btn.appendChild(el('span', 'cs-tab-sub', meta.sub));
      btn.addEventListener('click', function () { selectTab(idx, true); });
      tabsNav.appendChild(btn);
      tabButtons.push(btn);
    });

    var closeBtn = document.getElementById('csCompleteClose');
    var goQuizBtn = document.getElementById('csGoQuiz');
    if (closeBtn && modalEl) closeBtn.addEventListener('click', function () { modalEl.hidden = true; });
    if (goQuizBtn && modalEl) {
      goQuizBtn.addEventListener('click', function () {
        modalEl.hidden = true;
        selectTab(TABS_TOTAL, true);
      });
    }

    updateProgressUI();
    selectTab(0, false);
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
  }

  global.CSMain = { TABS_TOTAL: TABS_TOTAL, localDateKey: localDateKey, makeUi: makeUi };
})(typeof window !== 'undefined' ? window : globalThis);
