// kids/core/video-unit.js — 🎬 단원 영상 공용 부품 (명세 docs/video_unit_spec.md, 전역 window.VideoUnit)
// 초안: 안티그래비티 Hydrogen, 검토·수정: Claude (2026-11-16)
(function () {
  'use strict';

  var SELF_SRC = (typeof document !== 'undefined' && document.currentScript && document.currentScript.src) || '';
  var root = typeof window !== 'undefined' ? window : globalThis;
  var DEPLOY_PREFIX = 'https://awslike6-web.github.io/kids-school/';
  var WORKER_URL = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.WORKER_PROXY_URL) ||
    'https://minmin-notion.awslike6.workers.dev';
  var DB_ID = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.CURRICULUM_DB_ID) ||
    '3e8a27115b68806d94bfc81e9b3435fa';
  var CACHE_PREFIX = 'MINMIN_VIDEO_UNIT_V1:';
  var YT_ID_RE = /^[A-Za-z0-9_-]{11}$/;
  var ytApiPromise = null;
  var ytScriptAdded = false;
  var ytWaiters = [];
  var quizChoicesPromise = null;

  function pad2(n) {
    return n < 10 ? '0' + n : String(n);
  }

  function kstNow() {
    var d = new Date(Date.now() + 9 * 3600000);
    return d.getUTCFullYear() + '-' + pad2(d.getUTCMonth() + 1) + '-' + pad2(d.getUTCDate()) +
      ' ' + pad2(d.getUTCHours()) + ':' + pad2(d.getUTCMinutes());
  }

  function parseYouTubeId(url) {
    if (typeof url !== 'string' || !url.trim()) return null;
    var u;
    try {
      u = new URL(url.trim());
    } catch (e) {
      return null;
    }
    var host = u.hostname.replace(/^www\./, '').toLowerCase();
    var id = '';
    if (host === 'youtu.be') {
      id = u.pathname.split('/').filter(Boolean)[0] || '';
    } else if (host === 'youtube.com' || host === 'm.youtube.com' ||
      host === 'music.youtube.com' || host === 'youtube-nocookie.com') {
      id = u.searchParams.get('v') || '';
      if (!id) {
        var m = u.pathname.match(/^\/(?:embed|shorts)\/([^/?#]+)/);
        if (m) id = m[1];
      }
    }
    return YT_ID_RE.test(id) ? id : null;
  }

  function buildQuery(screenKey) {
    return {
      page_size: 20,
      // 구역은 rowsToUnit이 거른다: 노션은 아직 없는 선택지로 select 필터를 걸면 400을 낸다(2026-11-16 확인).
      filter: { property: '인터랙티브 URL', url: { equals: DEPLOY_PREFIX + (screenKey || '') } },
      sorts: [{ timestamp: 'created_time', direction: 'ascending' }]
    };
  }

  function readTitle(prop) {
    if (!prop || !Array.isArray(prop.title)) return '';
    return prop.title.map(function (t) { return t.plain_text || ''; }).join('');
  }

  function readRichText(prop) {
    if (!prop || !Array.isArray(prop.rich_text)) return '';
    return prop.rich_text.map(function (t) { return t.plain_text || ''; }).join('');
  }

  function rowsToUnit(results) {
    var videos = [];
    var questions = [];
    if (!Array.isArray(results)) return { videos: videos, questions: questions };

    for (var i = 0; i < results.length; i++) {
      var p = results[i] && results[i].properties;
      if (!p) continue;
      var zone = p['구역'] && p['구역'].select && p['구역'].select.name;

      if (zone === '단원영상') {
        var id = parseYouTubeId(p['미디어 URL'] && p['미디어 URL'].url);
        if (!id) continue;
        var rawSum = readRichText(p['핵심 쓰임새/설명']);
        var summary = rawSum
          ? rawSum.split('|').map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 3)
          : [];
        videos.push({
          id: id,
          title: readTitle(p['제목']).trim(),
          source: readRichText(p['해설']).trim(),
          summary: summary
        });
      } else if (zone === '영상확인') {
        var qText = readRichText(p['퀴즈 질문']).trim();
        var choices = readRichText(p['보기 1~4'])
          .split(/\r?\n/)
          .map(function (s) { return s.trim(); })
          .filter(Boolean);
        var num = p['정답'] && typeof p['정답'].number === 'number' ? p['정답'].number : NaN;
        var ans = num - 1;
        if (!qText || choices.length < 2 || !Number.isInteger(ans) || ans < 0 || ans >= choices.length) {
          continue;
        }
        questions.push({
          pageId: results[i].id || '', // 문항기록 'c:' 키 (docs/learning_record_spec.md §5 3차)
          title: readTitle(p['제목']).trim(),
          question: qText,
          choices: choices,
          answer: ans,
          explanation: readRichText(p['해설']).trim()
        });
      }
    }
    return { videos: videos, questions: questions };
  }

  function readCache(screenKey) {
    try {
      var raw = localStorage.getItem(CACHE_PREFIX + screenKey);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (!data || !Array.isArray(data.videos) || data.videos.length === 0) return null;
      return {
        videos: data.videos,
        questions: Array.isArray(data.questions) ? data.questions : []
      };
    } catch (e) {
      return null;
    }
  }

  function writeCache(screenKey, unit) {
    try {
      localStorage.setItem(CACHE_PREFIX + screenKey, JSON.stringify({
        savedAt: kstNow(),
        videos: unit.videos,
        questions: unit.questions
      }));
    } catch (e) {}
  }

  function removeCache(screenKey) {
    try {
      localStorage.removeItem(CACHE_PREFIX + screenKey);
    } catch (e) {}
  }

  function unitEqual(a, b) {
    return JSON.stringify({ videos: a.videos, questions: a.questions }) ===
      JSON.stringify({ videos: b.videos, questions: b.questions });
  }

  function loadUnit(screenKey, onData) {
    var cached = readCache(screenKey);
    if (cached && typeof onData === 'function') {
      onData(cached, 'cache');
    }
    var url = WORKER_URL + '/v1/databases/' + DB_ID + '/query';
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildQuery(screenKey))
    }).then(function (res) {
      if (!res || !res.ok) throw new Error('HTTP ' + (res ? res.status : 'ERR'));
      return res.json();
    }).then(function (json) {
      var fresh = rowsToUnit(json && json.results);
      if (fresh.videos.length === 0) {
        removeCache(screenKey);
        if (typeof onData === 'function') onData(null, 'notion');
        return 'notion';
      }
      writeCache(screenKey, fresh);
      if ((!cached || !unitEqual(cached, fresh)) && typeof onData === 'function') {
        onData(fresh, 'notion');
      }
      return 'notion';
    }).catch(function () {
      return cached ? 'cache' : 'none';
    });
  }

  function loadYouTubeApi() {
    if (root.YT && typeof root.YT.Player === 'function') {
      return Promise.resolve(root.YT);
    }
    if (ytApiPromise) return ytApiPromise;

    ytApiPromise = new Promise(function (resolve, reject) {
      var done = false;
      var timer = setTimeout(function () {
        if (done) return;
        done = true;
        ytApiPromise = null;
        reject(new Error('YouTube API timeout'));
      }, 5000);
      ytWaiters.push(function () {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve(root.YT);
      });

      // 래퍼·script는 화면당 한 번만: 5초 초과 뒤 다시 불러도 겹쳐 쌓이지 않고, 늦게 온 준비 신호는 지금 기다리는 쪽에 간다.
      if (ytScriptAdded) return;
      ytScriptAdded = true;
      var prevReady = typeof root.onYouTubeIframeAPIReady === 'function' ? root.onYouTubeIframeAPIReady : null;
      root.onYouTubeIframeAPIReady = function () {
        if (prevReady) {
          try { prevReady(); } catch (e) {}
        }
        var waiters = ytWaiters;
        ytWaiters = [];
        waiters.forEach(function (fn) { fn(); });
      };

      var script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      script.onerror = function () {
        ytScriptAdded = false; // 네트워크 실패는 다음 호출에서 script를 다시 넣어 본다
        if (done) return;
        done = true;
        clearTimeout(timer);
        ytApiPromise = null;
        reject(new Error('YouTube API load failed'));
      };
      (document.head || document.documentElement).appendChild(script);
    });
    return ytApiPromise;
  }

  function ensureQuizChoices() {
    if (root.QuizChoices && typeof root.QuizChoices.arrange === 'function') {
      return Promise.resolve(root.QuizChoices);
    }
    if (quizChoicesPromise) return quizChoicesPromise;
    if (!SELF_SRC || typeof document === 'undefined') return Promise.resolve(null);

    quizChoicesPromise = new Promise(function (resolve) {
      var src;
      try {
        src = new URL('quiz-flow-controller.js?v=20261124-flow2', SELF_SRC).href;
      } catch (e) {
        resolve(null);
        return;
      }
      var script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = function () { resolve(root.QuizChoices || null); };
      script.onerror = function () { resolve(null); };
      (document.head || document.documentElement).appendChild(script);
    }).then(function (qc) {
      if (!qc) quizChoicesPromise = null; // 실패는 기억하지 않고 다음에 다시 실어 본다 (그동안은 원래 순서)
      return qc;
    });
    return quizChoicesPromise;
  }

  function callFairy(fnName) {
    if (typeof root[fnName] === 'function') {
      try { root[fnName](); } catch (e) {}
    }
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function clearEl(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function mount(container, screenKey) {
    if (!container) return Promise.resolve({ videos: [], questions: [], source: 'none' });
    var state = {
      unit: null,
      pendingUnit: null,
      players: [],
      quizOpenFn: null
    };

    function anyPlaying() {
      for (var i = 0; i < state.players.length; i++) {
        if (state.players[i].playing) return true;
      }
      return false;
    }

    function pauseOthers(activeEntry) {
      for (var i = 0; i < state.players.length; i++) {
        var entry = state.players[i];
        if (entry !== activeEntry && entry.playing && entry.player) {
          try { entry.player.pauseVideo(); } catch (e) {}
        }
      }
    }

    function renderError() {
      clearEl(container);
      container.hidden = false;
      container.appendChild(el('div', 'vu-status', '영상을 불러오지 못했어요.'));
      var retry = el('button', 'vu-btn vu-retry', '다시 시도');
      retry.type = 'button';
      retry.addEventListener('click', function () { start(); });
      container.appendChild(retry);
    }

    function renderQuiz(quizBox, questions) {
      var idx = 0;
      var quizSession = {}; // 문항기록 회차: 퀴즈를 열 때마다 새로 센다 (questions는 캐시된 같은 배열)
      var prog = el('div', 'vu-quiz-progress');
      var qEl = el('div', 'vu-quiz-q');
      var choicesEl = el('div', 'vu-choices');
      var explEl = el('div', 'vu-quiz-expl');
      var nextBtn = el('button', 'vu-btn vu-btn-primary vu-quiz-next', '다음');
      nextBtn.type = 'button';
      var doneEl = el('div', 'vu-quiz-done', '확인 완료! ⭐');
      var opening = false;
      // 첫 문제를 그리기 전(보기 섞기 부품 싣는 중)에 '완료'·'다음'이 먼저 보이지 않게
      explEl.hidden = true;
      nextBtn.hidden = true;
      doneEl.hidden = true;

      quizBox.appendChild(prog);
      quizBox.appendChild(qEl);
      quizBox.appendChild(choicesEl);
      quizBox.appendChild(explEl);
      quizBox.appendChild(nextBtn);
      quizBox.appendChild(doneEl);

      function showQuestion() {
        var q = questions[idx];
        var answered = false;
        prog.hidden = false;
        qEl.hidden = false;
        choicesEl.hidden = false;
        doneEl.hidden = true;
        explEl.hidden = true;
        nextBtn.hidden = true;
        prog.textContent = (idx + 1) + ' / ' + questions.length;
        qEl.textContent = q.question;
        nextBtn.textContent = idx + 1 < questions.length ? '다음' : '완료';
        clearEl(choicesEl);

        var arranged = (root.QuizChoices && typeof root.QuizChoices.arrange === 'function')
          ? root.QuizChoices.arrange(q.choices)
          : q.choices.map(function (t, i) { return { text: t, index: i }; });

        var btns = [];
        arranged.forEach(function (item) {
          var btn = el('button', 'vu-choice', item.text);
          btn.type = 'button';
          btn.addEventListener('click', function () {
            if (answered) return;
            answered = true;
            for (var j = 0; j < btns.length; j++) btns[j].btn.disabled = true;
            // 📒 문항기록 (docs/learning_record_spec.md §5 3차): 한 번만 고르는 퀴즈라 고른 즉시 끝난다.
            // 부품이 과목을 모르므로 화면의 window.currentSubject가 있을 때만 기록한다.
            var LL = root.LearningLog, subj = root.currentSubject;
            var track = (LL && LL.itemTracker && typeof subj === 'string' && subj)
              ? LL.itemTracker({ prefix: 'c', subject: subj, list: questions, idx: idx, session: quizSession }) : null;
            if (track) {
              if (item.index !== q.answer) track.wrong(item.text);
              track.done();
            }
            if (item.index === q.answer) {
              btn.classList.add('is-correct');
              callFairy('fairyPraise');
            } else {
              btn.classList.add('is-wrong');
              for (var k = 0; k < btns.length; k++) {
                if (btns[k].index === q.answer) btns[k].btn.classList.add('is-hint');
              }
              callFairy('fairyEncourage');
            }
            if (q.explanation) {
              explEl.textContent = q.explanation;
              explEl.hidden = false;
            }
            nextBtn.hidden = false;
          });
          btns.push({ btn: btn, index: item.index });
          choicesEl.appendChild(btn);
        });
      }

      nextBtn.addEventListener('click', function () {
        if (idx + 1 < questions.length) {
          idx += 1;
          showQuestion();
        } else {
          prog.hidden = true;
          qEl.hidden = true;
          choicesEl.hidden = true;
          explEl.hidden = true;
          nextBtn.hidden = true;
          doneEl.hidden = false;
          callFairy('fairyReward');
        }
      });

      return function openQuiz() {
        if (opening) return; // 연타해도 한 번만
        opening = true;
        idx = 0;
        quizBox.hidden = false;
        if (quizBox.scrollIntoView) quizBox.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        ensureQuizChoices().catch(function () { return null; }).then(function () {
          opening = false;
          showQuestion();
        });
      };
    }

    function renderVideoItem(v, hasQuestions) {
      var item = el('div', 'vu-item');
      var playerBox = el('div', 'vu-player');
      var thumb = el('button', 'vu-thumb');
      thumb.type = 'button';
      var img = el('img');
      img.src = 'https://i.ytimg.com/vi/' + v.id + '/hqdefault.jpg';
      img.alt = v.title || '단원 영상';
      thumb.appendChild(img);
      thumb.appendChild(el('span', 'vu-play', '▶'));

      var overlay = el('div', 'vu-overlay');
      overlay.hidden = true;
      overlay.appendChild(el('div', 'vu-overlay-title', '다 봤어요! 🎉'));
      var replayBtn = el('button', 'vu-btn vu-btn-primary', '🔁 다시 보기');
      replayBtn.type = 'button';
      overlay.appendChild(replayBtn);

      if (hasQuestions) {
        var ovQuizBtn = el('button', 'vu-btn', '✏️ 확인 문제 풀기');
        ovQuizBtn.type = 'button';
        ovQuizBtn.addEventListener('click', function () {
          if (state.quizOpenFn) state.quizOpenFn();
        });
        overlay.appendChild(ovQuizBtn);
      }

      var entry = { player: null, playing: false };
      state.players.push(entry);

      replayBtn.addEventListener('click', function () {
        overlay.hidden = true;
        if (entry.player) {
          try {
            entry.player.seekTo(0, true);
            entry.player.playVideo();
          } catch (e) {}
        }
      });

      thumb.addEventListener('click', function () {
        thumb.hidden = true;
        var frameDiv = el('div', 'vu-frame');
        playerBox.insertBefore(frameDiv, overlay);

        loadYouTubeApi().then(function (YT) {
          entry.player = new YT.Player(frameDiv, {
            host: 'https://www.youtube-nocookie.com',
            videoId: v.id,
            playerVars: {
              rel: 0,
              playsinline: 1,
              autoplay: 1,
              origin: typeof location !== 'undefined' ? location.origin : ''
            },
            events: {
              onReady: function (e) {
                try { e.target.playVideo(); } catch (err) {}
              },
              onStateChange: function (e) {
                if (e.data === 1) {
                  entry.playing = true;
                  pauseOthers(entry);
                } else if (e.data === 2) {
                  entry.playing = false;
                } else if (e.data === 0) {
                  entry.playing = false;
                  if (state.pendingUnit) {
                    var next = state.pendingUnit;
                    state.pendingUnit = null;
                    renderUnit(next);
                  } else {
                    overlay.hidden = false;
                  }
                }
              }
            }
          });
        }).catch(function () {
          var iframe = el('iframe');
          iframe.src = 'https://www.youtube-nocookie.com/embed/' + v.id + '?rel=0&playsinline=1&autoplay=1';
          iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
          iframe.allowFullscreen = true;
          iframe.title = v.title || '단원 영상';
          frameDiv.appendChild(iframe);
        });
      });

      playerBox.appendChild(thumb);
      playerBox.appendChild(overlay);
      item.appendChild(playerBox);

      var caption = el('div', 'vu-caption');
      caption.appendChild(el('span', 'vu-title', v.title || ''));
      if (v.source) {
        caption.appendChild(el('span', 'vu-source', ' · ' + v.source));
      }
      var openLink = el('a', 'vu-open', '📺 유튜브에서 열기 ↗');
      openLink.href = 'https://youtu.be/' + v.id;
      openLink.target = '_blank';
      openLink.rel = 'noopener noreferrer';
      caption.appendChild(openLink);
      item.appendChild(caption);

      if (v.summary && v.summary.length > 0) {
        var sumBox = el('div', 'vu-summary');
        sumBox.appendChild(el('div', 'vu-summary-title', '📌 핵심 정리'));
        var ul = el('ul', 'vu-summary-list');
        for (var j = 0; j < v.summary.length; j++) {
          ul.appendChild(el('li', null, v.summary[j]));
        }
        sumBox.appendChild(ul);
        item.appendChild(sumBox);
      }
      return item;
    }

    function renderUnit(unit) {
      state.unit = unit;
      state.players = [];
      state.quizOpenFn = null;
      clearEl(container);

      if (!unit || unit.videos.length === 0) {
        container.hidden = true;
        return;
      }
      container.hidden = false;
      var hasQ = unit.questions && unit.questions.length > 0;
      for (var i = 0; i < unit.videos.length; i++) {
        container.appendChild(renderVideoItem(unit.videos[i], hasQ));
      }
      if (hasQ) {
        var quizBox = el('div', 'vu-quiz');
        quizBox.hidden = true;
        state.quizOpenFn = renderQuiz(quizBox, unit.questions);
        var openBtn = el('button', 'vu-btn vu-quiz-open', '✏️ 확인 문제 ' + unit.questions.length + '개');
        openBtn.type = 'button';
        openBtn.addEventListener('click', function () {
          state.quizOpenFn();
        });
        container.appendChild(openBtn);
        container.appendChild(quizBox);
      }
    }

    function start() {
      state.pendingUnit = null;
      clearEl(container);
      container.hidden = false;
      container.appendChild(el('div', 'vu-status', '영상을 불러오는 중...'));

      return loadUnit(screenKey, function (unit) {
        if (!unit) {
          if (anyPlaying()) {
            state.pendingUnit = null;
          } else {
            renderUnit(null);
          }
          return;
        }
        if (anyPlaying()) {
          state.pendingUnit = unit;
        } else {
          renderUnit(unit);
        }
      }).then(function (source) {
        if (source === 'none') renderError();
        return {
          videos: state.unit ? state.unit.videos : [],
          questions: state.unit ? state.unit.questions : [],
          source: source
        };
      });
    }

    return start();
  }

  function autoMount() {
    var els = document.querySelectorAll('[data-video-unit]');
    for (var i = 0; i < els.length; i++) {
      mount(els[i], els[i].getAttribute('data-video-unit'));
    }
  }

  if (typeof document !== 'undefined' && typeof document.querySelectorAll === 'function') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', autoMount);
    } else {
      autoMount();
    }
  }

  root.VideoUnit = {
    mount: mount,
    parseYouTubeId: parseYouTubeId,
    buildQuery: buildQuery,
    rowsToUnit: rowsToUnit,
    kstNow: kstNow,
    loadYouTubeApi: loadYouTubeApi,
    loadUnit: loadUnit
  };
})();
