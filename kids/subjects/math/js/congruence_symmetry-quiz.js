// 5-2 수학 3단원 합동과 대칭: 노션 퀴즈 배틀 (CSQuiz)
// 문제·보기·정답·해설은 노션 CURRICULUM_DB에서만 읽는다. 하드코딩한 대체 문제는 두지 않는다.
// 식별: 과목=수학 · 학년=5-2 · 단원 원문 equals '3. 합동과 대칭' · 구역=탐구퀴즈
(function (global) {
  'use strict';

  var DEFAULT_PROXY = 'https://minmin-notion.awslike6.workers.dev';
  var DEFAULT_DB_ID = '3e8a27115b68806d94bfc81e9b3435fa';
  var UNIT = '3. 합동과 대칭';

  function joinPlainText(arr) {
    if (!Array.isArray(arr)) return '';
    return arr.map(function (r) { return r && typeof r.plain_text === 'string' ? r.plain_text : ''; }).join('');
  }

  function titleOf(props) {
    var keys = Object.keys(props);
    for (var i = 0; i < keys.length; i += 1) {
      var prop = props[keys[i]];
      if (prop && prop.type === 'title') return joinPlainText(prop.title).trim();
    }
    return '';
  }

  function richOf(props, name) {
    var prop = props[name];
    return prop && prop.type === 'rich_text' ? joinPlainText(prop.rich_text).trim() : '';
  }

  // 노션 페이지 목록 → 문항 배열 (DOM 없음, 시험 대상). 보기는 '보기 1~4' 칸의 줄 단위 배열 계약.
  function buildQuizFromPages(results) {
    if (!Array.isArray(results)) return [];
    var items = [];
    results.forEach(function (page) {
      var props = page && page.properties;
      if (!props) return;
      var q = richOf(props, '퀴즈 질문');
      var choices = richOf(props, '보기 1~4').split('\n')
        .map(function (line) { return line.trim(); })
        .filter(function (line) { return line.length > 0; });
      var ansProp = props['정답'];
      var ansNum = ansProp && typeof ansProp.number === 'number' ? ansProp.number : NaN;
      if (!q || choices.length < 2 || !Number.isInteger(ansNum) || ansNum < 1 || ansNum > choices.length) return;
      items.push({ id: page.id || '', title: titleOf(props), q: q, choices: choices, answerIndex: ansNum - 1, explain: richOf(props, '해설') });
    });
    items.sort(function (a, b) { return a.title.localeCompare(b.title, 'ko'); });
    return items;
  }

  function fetchQuiz() {
    var cfg = (typeof global.APP_CONFIG !== 'undefined' && global.APP_CONFIG) || {};
    var url = (cfg.WORKER_PROXY_URL || DEFAULT_PROXY) + '/v1/databases/' + (cfg.CURRICULUM_DB_ID || DEFAULT_DB_ID) + '/query';
    var body = {
      page_size: 100,
      filter: {
        and: [
          { property: '과목', select: { equals: '수학' } },
          { property: '학년', select: { equals: '5-2' } },
          { property: '단원', rich_text: { equals: UNIT } },
          { property: '구역', select: { equals: '탐구퀴즈' } }
        ]
      }
    };
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) { return buildQuizFromPages(data && data.results); });
  }

  // 페이지가 살아 있는 동안 불러온 문항·보상 기록을 유지한다 (탭을 다시 열어도 다시 받지 않음)
  var state = { questions: null, loading: false, error: false, idx: 0, rewarded: {} };

  function render(container, ctx) {
    var ui = ctx.ui;
    var el = ui.el;
    container.replaceChildren();
    var card = el('section', 'cs-card cs-quiz-card');
    card.appendChild(el('h2', 'cs-title', '🏆 합동과 대칭 퀴즈 배틀'));
    var body = el('div', 'cs-quiz-body');
    card.appendChild(body);
    container.appendChild(card);

    function load() {
      state.loading = true;
      state.error = false;
      draw();
      fetchQuiz()
        .then(function (list) {
          state.questions = list.length ? list : null;
          state.error = !list.length;
          state.idx = 0;
        })
        .catch(function () {
          state.questions = null;
          state.error = true;
        })
        .then(function () {
          state.loading = false;
          // 불러오는 사이 탭을 옮겼다 돌아왔으면 지금 보이는 화면을 그린다
          if (typeof state.redraw === 'function') state.redraw();
        });
    }

    function button(text, cls, onClick) {
      var b = el('button', cls || 'cs-btn', text);
      b.type = 'button';
      b.addEventListener('click', onClick);
      return b;
    }

    function draw() {
      body.replaceChildren();
      if (state.loading) {
        body.appendChild(el('p', 'cs-guide', '퀴즈를 불러오는 중이에요…'));
        return;
      }
      if (state.error || !state.questions) {
        body.appendChild(el('p', 'cs-guide', '퀴즈를 불러오지 못했어요. 인터넷 연결을 확인하고 다시 눌러 주세요.'));
        var row = el('div', 'cs-btn-row');
        row.appendChild(button('다시 불러오기', 'cs-btn primary', load));
        body.appendChild(row);
        return;
      }
      var list = state.questions;
      if (state.idx >= list.length) {
        var msg = list.length + '문제를 모두 풀었어요! 정말 멋져요!';
        body.appendChild(el('p', 'cs-guide', msg));
        // 탭을 다시 열 때마다 축하음이 반복되지 않게 한 바퀴에 한 번만
        if (!state.cheered) {
          state.cheered = true;
          ctx.finale();
        }
        var again = el('div', 'cs-btn-row');
        again.appendChild(button('처음부터 다시', 'cs-btn primary', function () {
          state.idx = 0;
          state.cheered = false;
          draw();
        }));
        body.appendChild(again);
        return;
      }

      var item = list[state.idx];
      body.appendChild(el('div', 'cs-quiz-counter', '문제 ' + (state.idx + 1) + ' / ' + list.length));
      body.appendChild(el('p', 'cs-guide cs-quiz-question', item.q));
      var hintEl = el('div', 'cs-hint');
      hintEl.hidden = true;
      var choiceRow = el('div', 'cs-choice-row cs-quiz-choices');
      var nextRow = el('div', 'cs-btn-row');
      nextRow.hidden = true;
      nextRow.appendChild(button('다음 문제 ▶', 'cs-btn primary', function () {
        state.idx += 1;
        draw();
      }));
      body.appendChild(choiceRow);
      body.appendChild(hintEl);
      body.appendChild(nextRow);

      var solved = false;
      var answerBtn = null;
      var choices = ui.shuffle(item.choices.map(function (text, i) { return { text: text, isAnswer: i === item.answerIndex }; }));
      choices.forEach(function (ch) {
        var btn = el('button', 'cs-btn cs-quiz-choice', ch.text);
        btn.type = 'button';
        if (ch.isAnswer) answerBtn = btn;
        btn.addEventListener('click', function () {
          if (solved || btn.disabled) return;
          if (ch.isAnswer) {
            solved = true;
            btn.classList.remove('cs-choice-glow');
            btn.classList.add('is-correct');
            ctx.praise();
            ui.hint(hintEl, item.explain ? '✨ ' + item.explain : '');
            if (!state.rewarded[item.id || item.title || state.idx]) {
              state.rewarded[item.id || item.title || state.idx] = true;
              ctx.reward();
            }
            nextRow.hidden = false;
            return;
          }
          // 에러리스: 고른 보기만 조용히 비활성, 해설 힌트와 정답 보기 반짝임
          btn.disabled = true;
          btn.classList.add('is-off');
          ctx.encourage();
          ui.hint(hintEl, '💡 힌트: ' + (item.explain || '반짝이는 보기를 다시 살펴볼까요?'));
          if (answerBtn) answerBtn.classList.add('cs-choice-glow');
        });
        choiceRow.appendChild(btn);
      });
    }

    state.redraw = function () {
      if (body.isConnected) draw();
    };
    ctx.say('합동과 대칭 퀴즈 배틀이에요. 천천히 읽고 골라 볼까요?');
    if (!state.questions && !state.loading) load();
    else draw();
  }

  global.CSQuiz = {
    UNIT: UNIT,
    buildQuizFromPages: buildQuizFromPages,
    tab: { title: '퀴즈 배틀', icon: '🏆', sub: '단원 마무리', render: render }
  };
})(typeof window !== 'undefined' ? window : globalThis);
