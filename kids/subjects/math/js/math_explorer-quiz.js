// 수학 단원 탐험관 공용 노션 퀴즈 배틀 (MathExplorerQuiz)
// 문제·보기·정답·해설은 노션 CURRICULUM_DB에서만 읽는다. 하드코딩한 대체 문제는 두지 않는다.
// 식별: 과목=수학 · 학년 · 단원 원문 equals · 구역=탐구퀴즈 (자연어 파싱 없음)
// 보기는 MathExplorer 틀의 choiceQuestion이 window.QuizChoices.arrange로 섞고 원래 번호로 채점한다.
(function (global) {
  'use strict';

  var DEFAULT_PROXY = 'https://minmin-notion.awslike6.workers.dev';
  var DEFAULT_DB_ID = '3e8a27115b68806d94bfc81e9b3435fa';

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
      var lines = richOf(props, '보기 1~4').split('\n')
        .map(function (line) { return line.trim(); })
        .filter(function (line) { return line.length > 0; });
      var ansProp = props['정답'];
      var ansNum = ansProp && typeof ansProp.number === 'number' ? ansProp.number : NaN;
      if (!q || lines.length < 2 || !Number.isInteger(ansNum) || ansNum < 1 || ansNum > lines.length) return;
      items.push({ id: page.id || '', title: titleOf(props), q: q, choices: lines, answerIndex: ansNum - 1, explain: richOf(props, '해설') });
    });
    items.sort(function (a, b) { return a.title.localeCompare(b.title, 'ko'); });
    return items;
  }

  function buildQueryBody(grade, unit) {
    return {
      page_size: 100,
      filter: {
        and: [
          { property: '과목', select: { equals: '수학' } },
          { property: '학년', select: { equals: grade } },
          { property: '단원', rich_text: { equals: unit } },
          { property: '구역', select: { equals: '탐구퀴즈' } }
        ]
      }
    };
  }

  function fetchQuiz(grade, unit) {
    var cfg = (typeof global.APP_CONFIG !== 'undefined' && global.APP_CONFIG) || {};
    var url = (cfg.WORKER_PROXY_URL || DEFAULT_PROXY) + '/v1/databases/' + (cfg.CURRICULUM_DB_ID || DEFAULT_DB_ID) + '/query';
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(buildQueryBody(grade, unit)) })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) { return buildQuizFromPages(data && data.results); });
  }

  // opts: { grade: '5-2', unit: '4. 소수의 곱셈', title: '🏆 소수의 곱셈 퀴즈 배틀', intro: '...' }
  function create(opts) {
    var o = opts || {};
    var grade = o.grade || '5-2';
    var unit = o.unit || '';
    // 페이지가 살아 있는 동안 불러온 문항·보상 기록을 유지한다 (탭을 다시 열어도 다시 받지 않음)
    var state = { questions: null, loading: false, error: false, idx: 0, rewarded: {}, cheered: false, redraw: null };

    function render(container, ctx) {
      var ui = ctx.ui;
      var el = ui.el;
      container.replaceChildren();
      var card = ui.card(o.title || '🏆 퀴즈 배틀');
      var body = el('div', 'mx-quiz-body');
      card.appendChild(body);
      container.appendChild(card);

      function load() {
        state.loading = true;
        state.error = false;
        draw();
        fetchQuiz(grade, unit)
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

      function draw() {
        body.replaceChildren();
        if (state.loading) {
          body.appendChild(ui.guide('퀴즈를 불러오는 중이에요…'));
          return;
        }
        if (state.error || !state.questions) {
          body.appendChild(ui.guide('퀴즈를 불러오지 못했어요. 인터넷 연결을 확인하고 다시 눌러 주세요.'));
          var row = el('div', 'mx-btn-row');
          row.appendChild(ui.button('다시 불러오기', 'mx-btn primary', load));
          body.appendChild(row);
          return;
        }
        var list = state.questions;
        if (state.idx >= list.length) {
          body.appendChild(ui.guide(list.length + '문제를 모두 풀었어요! 정말 멋져요!'));
          // 탭을 다시 열 때마다 축하음이 반복되지 않게 한 바퀴에 한 번만
          if (!state.cheered) {
            state.cheered = true;
            ctx.finale();
          }
          var again = el('div', 'mx-btn-row');
          again.appendChild(ui.button('처음부터 다시', 'mx-btn primary', function () {
            state.idx = 0;
            state.cheered = false;
            draw();
          }));
          body.appendChild(again);
          return;
        }

        var item = list[state.idx];
        var key = item.id || item.title || String(state.idx);
        body.appendChild(el('div', 'mx-quiz-counter', '문제 ' + (state.idx + 1) + ' / ' + list.length));
        var nextRow = el('div', 'mx-btn-row');
        nextRow.hidden = true;
        nextRow.appendChild(ui.button('다음 문제 ▶', 'mx-btn primary', function () {
          state.idx += 1;
          draw();
        }));
        body.appendChild(ui.choiceQuestion({
          question: item.q,
          choices: item.choices,
          answer: item.answerIndex,
          column: true,
          hint: item.explain ? '힌트: ' + item.explain : '',
          explain: item.explain,
          onSolved: function () {
            if (!state.rewarded[key]) {
              state.rewarded[key] = true;
              ctx.reward();
            }
            nextRow.hidden = false;
          }
        }));
        body.appendChild(nextRow);
      }

      state.redraw = function () {
        if (body.isConnected) draw();
      };
      ctx.say(o.intro || '퀴즈 배틀이에요. 천천히 읽고 골라 볼까요?');
      if (!state.questions && !state.loading) load();
      else draw();
    }

    return { title: '퀴즈 배틀', icon: '🏆', sub: '단원 마무리', unit: unit, render: render };
  }

  global.MathExplorerQuiz = {
    create: create,
    buildQuizFromPages: buildQuizFromPages,
    buildQueryBody: buildQueryBody
  };
})(typeof window !== 'undefined' ? window : globalThis);
