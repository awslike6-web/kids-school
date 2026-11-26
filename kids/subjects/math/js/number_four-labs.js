// 초등 2학년 2학기 '1. 네 자리 수' 탐험관 1~7관 및 마운트 (FourDigitLabs, docs/math_2-2_four_digit_spec.md)
(function (global) {
  'use strict';

  var KEY = 'num4';
  var CORE = global.FourDigitCore;
  var PLACE_LABEL = { th: '천의 자리', h: '백의 자리', t: '십의 자리', o: '일의 자리' };

  function J(text, type) {
    var me = global.MathExplorer;
    return me && me.josa ? me.josa(String(text), type) : String(text);
  }

  function toTokens(list) {
    var out = [], i;
    for (i = 0; i < list.length; i += 1) out.push({ token: list[i].text, mistake: list[i].mistake });
    return out;
  }

  var HINTS = {
    'read-one-prefix': '천·백·십 앞의 1은 읽지 않아요',
    'read-zero': '0인 자리는 읽지 않아요',
    'read-skip-place': '천의 자리부터 읽어요',
    'write-each-place': '자리마다 숫자 하나씩 써요',
    'write-drop-zero': '빈자리에는 0을 써요',
    'count-only': '모형 하나가 1000이에요',
    'count-off': '천 모형을 다시 세어 봐요',
    'write-shift-zero': '0이 어느 자리인지 들어 봐요',
    'read-shift-zero': '0인 자리를 건너뛰어 읽어요',
    'read-drop-ones-one': '일의 자리 1은 일로 읽어요',
    'whole-number': '그 숫자 하나만 봐요',
    'place-ignore': '어느 자리 숫자인지 봐요',
    'place-shift': '자리를 다시 세어 봐요',
    'expand-drop-zero': '빈자리에는 0을 써요',
    'expand-shift': '0이 어느 자리인지 봐요',
    'jump-boundary': '10이 되면 윗자리로 올라가요',
    'wrong-step': '얼마씩 뛰는지 다시 봐요',
    'wrong-direction': '커지는 쪽으로 뛰어요',
    'compare-ones-first': '천의 자리부터 비교해요',
    'reverse': '어느 쪽이 큰지 다시 봐요',
    'equal': '두 수가 같지 않아요',
    'swap-digits': '십과 일 자리를 다시 봐요',
    'off-by-one': '하나씩 다시 세어 봐요'
  };

  var LADDER1 = {
    title: '🪜 세 자리 수',
    body: '백 모형 3개, 십 모형 2개, 일 모형 4개는 324예요.',
    question: {
      question: '100이 5개, 10이 2개, 1이 7개인 수는?',
      choices: ['527', '5207', '572'],
      answer: 0,
      explain: '백·십·일 자리에 차례로 5, 2, 7을 써요.'
    }
  };

  var LADDER3 = {
    title: '🪜 세 자리 수 읽기',
    body: '305는 삼백오, 410은 사백십이라고 읽어요.',
    question: {
      question: '708을 바르게 읽으면?',
      choices: ['칠백팔', '칠백영팔', '칠십팔'],
      answer: 0,
      explain: '0인 십의 자리는 읽지 않아요.'
    }
  };

  var CMP_MAP = { '>': '> 왼쪽이 커요', '<': '< 오른쪽이 커요', '=': '= 같아요' };
  var CMP_ORDER = [CMP_MAP['>'], CMP_MAP['<'], CMP_MAP['=']];

  // 공용 3지선다 묻기 (질문·오답 힌트 자동 읽기)
  function askWrap(box, ctx, p, extra, counter, next, opt) {
    var o = {
      question: opt.question,
      answer: opt.answer !== undefined ? opt.answer : p.answerText,
      wrongs: opt.wrongs || toTokens(CORE.wrongChoices(p)),
      hints: HINTS,
      hint: opt.hint || '모형과 숫자를 다시 살펴봐요.',
      explain: opt.explain,
      prefix: KEY,
      kind: opt.kind || p.kind,
      extra: opt.extra !== undefined ? opt.extra : extra,
      counter: counter,
      ladder: opt.ladder || null,
      ladderLabel: '🪜 2-1 계단 다시 보기',
      say: ctx.say,
      sayHint: true,
      column: Boolean(opt.column),
      onSolved: opt.onSolved || next
    };
    if (opt.speak !== undefined) o.speak = opt.speak;
    if (opt.order) o.order = opt.order;
    box.appendChild(global.MathDrill.ask(ctx.ui, o));
  }

  // 1~5관 공통 틀
  function makeLab(num, spec) {
    return {
      title: spec.title,
      icon: spec.icon,
      sub: spec.sub,
      render: function (container, ctx) {
        var ui = ctx.ui;
        var card = ui.card(spec.title);
        card.appendChild(ui.guide(spec.guide));
        card.appendChild(global.MathDrill.algo(ui, spec.algo));
        card.appendChild(global.MathDrill.why(ui, spec.whyTitle, spec.whyBody));
        var area = ui.el('div', 'tw-area');
        card.appendChild(area);
        container.appendChild(card);
        global.MathDrill.rounds(area, ctx, {
          counterKey: KEY,
          perReward: 6,
          nextButton: true,
          makeRound: function () { return CORE.makeRound(num, Math.random); },
          renderProblem: function (box, p, next, extra, counter) {
            spec.renderProblem(box, p, next, extra, counter, ctx);
          }
        });
      }
    };
  }

  // 1관: 천이 뭐예요?
  var lab1 = makeLab(1, {
    title: '1관 천이 뭐예요?',
    icon: '🧊',
    sub: '100이 10개',
    guide: '모형을 더 놓아 1000을 만들어 봐요.',
    algo: ['백 모형 10개는 천 모형 1개', '999보다 1 큰 수는 1000'],
    whyTitle: '천 모형',
    whyBody: '백 모형을 10개 모으면 천 모형 하나가 돼요. 그래서 100이 10개면 1000이에요.',
    renderProblem: function (box, p, next, extra, counter, ctx) {
      var ui = ctx.ui;
      var BT = global.BaseTenDraw;
      var m;
      if (p.kind === 'hundred-tens') {
        box.appendChild(ui.guide('백 모형을 더 놓아 10개를 만들어요'));
        m = BT.model({ th: 0, h: p.start, t: 0, o: 0 });
        box.appendChild(m.el);
        box.appendChild(BT.placeControls(ui, {
          model: m,
          places: ['h'],
          target: { th: 1, h: 0, t: 0, o: 0 },
          autoBundle: true,
          say: ctx.say,
          onDone: function () {
            askWrap(box, ctx, p, extra, counter, next, {
              question: '100이 10개면?',
              hint: '백 모형 10개가 천 모형 1개가 되었어요.',
              explain: '100이 10개 모이면 1000이에요.',
              ladder: LADDER1
            });
          }
        }));
      } else if (p.kind === 'nine99-plus-one') {
        // 999 + 1 · 990 + 10 · 900 + 100: 한 번 눌러 천이 되는 세 길
        var NAME = { o: '일', t: '십', h: '백' };
        box.appendChild(ui.guide(NAME[p.place] + ' 모형을 1개 더 놓아 봐요'));
        var d0 = CORE.digits(p.n);
        m = BT.model({ th: 0, h: d0.h, t: d0.t, o: d0.o });
        box.appendChild(m.el);
        box.appendChild(BT.placeControls(ui, {
          model: m,
          places: [p.place],
          target: { th: 1, h: 0, t: 0, o: 0 },
          autoBundle: true,
          say: ctx.say,
          onDone: function () {
            askWrap(box, ctx, p, extra, counter, next, {
              question: p.n + '보다 ' + p.step + ' 큰 수는?',
              hint: '모형이 차례로 묶여 천 모형이 되었어요.',
              explain: p.n + '보다 ' + p.step + ' 큰 수는 1000이에요. 천이라고 읽어요.',
              ladder: LADDER1
            });
          }
        }));
      } else {
        box.appendChild(BT.picture(1000));
        askWrap(box, ctx, p, extra, counter, next, {
          question: '1000은 100이 몇 개?',
          hint: '천 모형 안에 백 모형이 몇 개 들어 있는지 떠올려 봐요.',
          explain: '1000은 100이 10개 모인 수예요.',
          ladder: LADDER1
        });
      }
    }
  });

  // 2관: 몇천
  var lab2 = makeLab(2, {
    title: '2관 몇천',
    icon: '🧱',
    sub: '1000이 몇 개',
    guide: '천 모형을 놓고 얼마인지 읽고 써 봐요.',
    algo: ['천 모형을 세요', '3개면 3000, 삼천'],
    whyTitle: '몇천',
    whyBody: '1000이 3개면 3000이에요. 삼천이라고 읽어요.',
    renderProblem: function (box, p, next, extra, counter, ctx) {
      var ui = ctx.ui;
      var BT = global.BaseTenDraw;
      // 6~9개는 몇 개를 미리 놓아 누르는 횟수를 4번 이하로
      var pre = p.th > 4 ? p.th - 4 : 0;
      box.appendChild(ui.guide(pre ? '천 모형이 ' + p.th + '개가 되게 놓아요' : '천 모형을 ' + p.th + '개 놓아요'));
      var m = BT.model({ th: pre, h: 0, t: 0, o: 0 });
      box.appendChild(m.el);
      box.appendChild(BT.placeControls(ui, {
        model: m,
        places: ['th'],
        target: { th: p.th, h: 0, t: 0, o: 0 },
        say: ctx.say,
        onDone: function () {
          askWrap(box, ctx, p, false, counter, next, {
            question: '얼마예요?',
            kind: 'thousands',
            hint: '천 모형이 몇 개인지 세어 봐요.',
            explain: '1000이 ' + p.th + '개면 ' + J(p.answerText, 'ieyo') + '.',
            onSolved: function () {
              askWrap(box, ctx, p, extra, counter, next, {
                question: '이 수를 어떻게 읽어요?',
                speak: '이 수를 어떻게 읽어요?',
                answer: p.reading,
                wrongs: toTokens(CORE.wrongReadings(p.n)),
                column: true,
                kind: 'thousands-read',
                hint: '천의 자리 숫자를 읽고 뒤에 천을 붙여요.',
                explain: J(p.answerText, 'eun') + ' ' + J(p.reading, 'ieyo') + '.'
              });
            }
          });
        }
      }));
    }
  });

  // 3관: 네 자리 수 쓰고 읽기
  var lab3 = makeLab(3, {
    title: '3관 네 자리 수 쓰고 읽기',
    icon: '👂',
    sub: '듣고·보고',
    guide: '소리를 듣고 모형을 만들거나 수를 읽어 봐요.',
    algo: ['천·백·십·일 자리를 차례로', '0인 자리는 읽지 않아요'],
    whyTitle: '네 자리 수',
    whyBody: '2312는 천이 2개, 백이 3개, 십이 1개, 일이 2개예요. 이천삼백십이라고 읽어요.',
    renderProblem: function (box, p, next, extra, counter, ctx) {
      var ui = ctx.ui;
      var BT = global.BaseTenDraw;
      if (p.kind === 'listen-build') {
        box.appendChild(ui.guide('🔊 듣고 모형을 만들어요'));
        box.appendChild(ui.button('🔊 다시 듣기', 'mx-btn', function () { ctx.say(p.reading); }));
        ctx.say(p.reading);
        var target = CORE.digits(p.n);
        var m = BT.model({ th: 0, h: 0, t: 0, o: 0 });
        box.appendChild(m.el);
        box.appendChild(BT.placeControls(ui, {
          model: m,
          places: ['th', 'h', 't', 'o'],
          target: target,
          say: ctx.say,
          onDone: function () {
            askWrap(box, ctx, p, extra, counter, next, {
              question: '만든 수를 숫자로 고르면?',
              speak: p.reading,
              column: true,
              hint: '천·백·십·일 모형 개수를 차례로 써요.',
              explain: J(p.reading, 'eun') + ' ' + J(p.answerText, 'ieyo') + '.',
              ladder: LADDER3
            });
          }
        }));
      } else if (p.kind === 'listen-write') {
        box.appendChild(ui.guide('🔊 듣고 숫자를 골라요'));
        box.appendChild(ui.button('🔊 다시 듣기', 'mx-btn', function () { ctx.say(p.reading); }));
        askWrap(box, ctx, p, extra, counter, next, {
          question: '들은 수를 숫자로 고르면?',
          speak: p.reading,
          column: true,
          hint: '빈자리에는 0을 써요.',
          explain: J(p.reading, 'eun') + ' ' + J(p.answerText, 'ieyo') + '.',
          ladder: LADDER3
        });
      } else {
        box.appendChild(global.MathDrill.expr(ui, String(p.n)));
        askWrap(box, ctx, p, extra, counter, next, {
          question: '이 수를 어떻게 읽어요?',
          speak: '이 수를 어떻게 읽어요?',
          column: true,
          hint: '천의 자리부터 차례로 읽고 0은 읽지 않아요.',
          explain: J(String(p.n), 'eun') + ' ' + J(p.answerText, 'ieyo') + '.',
          ladder: LADDER3
        });
      }
    }
  });

  // 숫자 띠 4칸 (강조할 자리 하나)
  function digitStrip(ui, n, place) {
    var d = CORE.digits(n), strip = ui.el('div', 'tw-digits n4-strip'), keys = ['th', 'h', 't', 'o'], i;
    for (i = 0; i < keys.length; i += 1) {
      strip.appendChild(ui.el('span', keys[i] === place ? 'tw-digit is-hl' : 'tw-digit', String(d[keys[i]])));
    }
    return strip;
  }

  // 4관: 자릿값
  var lab4 = makeLab(4, {
    title: '4관 자릿값',
    icon: '🔢',
    sub: '숫자가 나타내는 수',
    guide: '숫자가 얼마를 나타내는지 찾고, 덧셈식으로 모아 봐요.',
    algo: ['어느 자리인지 봐요', '천의 자리 5는 5000'],
    whyTitle: '자릿값',
    whyBody: '5376은 5000 + 300 + 70 + 6이에요. 같은 숫자라도 자리에 따라 나타내는 수가 달라요.',
    renderProblem: function (box, p, next, extra, counter, ctx) {
      var ui = ctx.ui;
      if (p.kind === 'expand') {
        box.appendChild(global.MathDrill.expr(ui, p.terms.join(' + ')));
        askWrap(box, ctx, p, extra, counter, next, {
          question: '모두 더하면 얼마예요?',
          speak: p.terms.join(' 더하기 ') + ', 모두 얼마예요?',
          hint: '없는 자리에는 0을 써요.',
          explain: p.terms.join(' + ') + ' = ' + J(p.answerText, 'ieyo') + '.'
        });
        return;
      }
      box.appendChild(digitStrip(ui, p.n, p.place));
      askWrap(box, ctx, p, extra, counter, next, {
        question: J(p.digit, 'i') + ' 나타내는 수는 얼마예요?',
        hint: '천·백·십·일 중 어느 자리인지 확인해 봐요.',
        explain: PLACE_LABEL[p.place] + ' ' + J(p.digit, 'eun') + ' ' + J(p.answerText, 'ieyo') + '.'
      });
    }
  });

  // 자릿값 표: 천·백·십·일 칸에 두 수를 위아래로
  function placeTable(ui, a, b) {
    var table = ui.el('div', 'n4-table');
    var keys = ['th', 'h', 't', 'o'], names = ['천', '백', '십', '일'], rows = [null, a, b], r, i, d;
    for (r = 0; r < rows.length; r += 1) {
      var row = ui.el('div', r === 0 ? 'n4-row is-head' : 'n4-row');
      d = rows[r] === null ? null : CORE.digits(rows[r]);
      for (i = 0; i < keys.length; i += 1) {
        row.appendChild(ui.el('span', 'n4-cell', d ? String(d[keys[i]]) : names[i]));
      }
      table.appendChild(row);
    }
    return table;
  }

  // 5관: 뛰어 세기와 크기 비교
  var lab5 = makeLab(5, {
    title: '5관 뛰어 세기와 크기 비교',
    icon: '🦘',
    sub: '1000·100·10·1씩',
    guide: '얼마씩 뛰는지 보거나 두 수의 크기를 비교해요.',
    algo: ['얼마씩 뛰는지 봐요', '천의 자리부터 비교해요'],
    whyTitle: '뛰어 세기',
    whyBody: '100씩 뛰다가 백의 자리가 10이 되면 천의 자리가 1 커져요.',
    renderProblem: function (box, p, next, extra, counter, ctx) {
      var ui = ctx.ui;
      if (p.kind === 'jump-1000' || p.kind === 'jump-small') {
        var hop = ui.el('div', 'tw-hop');
        hop.appendChild(global.MathDrill.expr(ui, p.start + ' → ' + p.step + '씩 → ?'));
        box.appendChild(hop);
        askWrap(box, ctx, p, extra, counter, next, {
          question: p.start + '보다 ' + p.step + ' 큰 수는?',
          hint: '얼마씩 뛰는지 보고 커지는 쪽으로 세어 봐요.',
          explain: p.start + '보다 ' + p.step + ' 큰 수는 ' + J(p.answerText, 'ieyo') + '.'
        });
        return;
      }
      box.appendChild(placeTable(ui, p.a, p.b));
      var raw = CORE.wrongChoices(p), wrongs = [], i;
      for (i = 0; i < raw.length; i += 1) wrongs.push({ token: CMP_MAP[raw[i].text] || raw[i].text, mistake: raw[i].mistake });
      var big = p.a > p.b ? p.a : p.b;
      var small = p.a > p.b ? p.b : p.a;
      askWrap(box, ctx, p, extra, counter, next, {
        question: p.a + ' ○ ' + p.b + ' 알맞은 것은?',
        speak: J(p.a, 'gwa') + ' ' + p.b + ', 어느 쪽이 클까요?',
        answer: CMP_MAP[p.answerText],
        wrongs: wrongs,
        order: CMP_ORDER,
        column: true,
        hint: '천의 자리부터 차례로 비교해요.',
        explain: J(big, 'i') + ' ' + small + '보다 커요.'
      });
    }
  });

  // 6관: 수 빙고
  var lab6 = {
    title: '6관 🎯 수 빙고',
    icon: '🎯',
    sub: '9칸 빙고',
    render: function (container, ctx) {
      var ui = ctx.ui;
      var card = ui.card('6관 🎯 수 빙고');
      card.appendChild(ui.guide('숫자를 판에 놓고, 들리는 문제의 답을 터뜨려요!'));
      var area = ui.el('div', 'tw-area');
      card.appendChild(area);
      container.appendChild(card);
      global.MathBingo.render(area, ctx, {
        makeBingo: function () { return CORE.makeBingo(Math.random); },
        prefix: KEY,
        counterKey: KEY,
        perReward: 6
      });
    }
  };

  // 7관: 수 스무고개 (네 자리 설정)
  function makeLab7() {
    if (!global.NumberTwenty || typeof global.NumberTwenty.makeLab !== 'function') return [];
    return [global.NumberTwenty.makeLab({
      core: CORE,
      key: KEY,
      total: 9000,
      title: '7관 🔍 수 스무고개',
      guide: '내가 생각한 네 자리 수를 질문으로 맞혀 봐요!',
      algo: ['크기부터 물어봐요', '천의 자리부터 물어봐요'],
      whyTitle: '어떻게 좁힐까?',
      whyBody: '5000보다 큰지 물으면 절반쯤이 사라져요. 그다음 천·백·십·일의 자리를 차례로 물어봐요.',
      categories: [
        { id: 'size', label: '📏 크기', prefix: 'gt:' },
        { id: 'th', label: '천의 자리', prefix: 'th:', cmp: 'thg:', div: 1000 },
        { id: 'h', label: '백의 자리', prefix: 'h:', cmp: 'hg:', div: 100 },
        { id: 't', label: '십의 자리', prefix: 't:', cmp: 'tg:', div: 10 },
        { id: 'o', label: '일의 자리', prefix: 'o:', cmp: 'og:', div: 1 },
        { id: 'even', label: '짝수?', prefix: 'even' }
      ]
    })];
  }

  function mount() {
    global.MathExplorer.mount({
      key: KEY,
      rememberTab: true,
      wishBox: true,
      labs: [lab1, lab2, lab3, lab4, lab5, lab6].concat(makeLab7()),
      quiz: global.MathExplorerQuiz.create({
        grade: '2-2',
        unit: '1. 네 자리 수',
        title: '퀴즈 배틀',
        intro: '퀴즈 배틀이에요. 천천히 들어 보고 골라 볼까요?',
        sayQuestion: true
      })
    });
  }

  global.FourDigitLabs = { mount: mount };

  if (global.document && global.document.readyState === 'loading') {
    global.document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})(typeof window !== 'undefined' ? window : globalThis);
