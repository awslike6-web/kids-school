// 초등 2학년 1학기 '1. 세 자리 수' 탐험관 1~6관 및 전체 마운트 (ThreeDigitLabs)
(function (global) {
  'use strict';

  var KEY = 'num3';
  var CORE = global.ThreeDigitCore;

  // 숫자·단어 뒤 조사(받침에 맞춤)
  function J(text, type) {
    var me = global.MathExplorer;
    return me && me.josa ? me.josa(String(text), type) : String(text);
  }

  // 오답 목록({ text, mistake })을 MathDrill.ask용 { token, mistake } 배열로 변환
  function toTokens(list) {
    var out = [];
    var i;
    for (i = 0; i < list.length; i += 1) {
      out.push({ token: list[i].text, mistake: list[i].mistake });
    }
    return out;
  }

  var HINTS = {
    'read-one-prefix': '백·십 앞의 1은 읽지 않아요',
    'read-zero': '0인 자리는 읽지 않아요',
    'read-as-tens': '백의 자리부터 읽어요',
    'write-each-place': '자리마다 숫자 하나씩 써요',
    'write-drop-zero': '빈자리에는 0을 써요',
    'place-ignore': '어느 자리 숫자인지 봐요',
    'place-shift': '자리를 다시 세어 봐요',
    'jump-boundary': '10이 되면 윗자리로 올라가요',
    'wrong-step': '얼마씩 뛰는지 다시 봐요',
    'wrong-direction': '커지는 쪽으로 뛰어요',
    'compare-ones-first': '백의 자리부터 비교해요',
    'reverse': '어느 쪽이 큰지 다시 봐요',
    'equal': '두 수가 같지 않아요',
    'swap-digits': '십과 일 자리를 다시 봐요',
    'off-by-one': '하나씩 다시 세어 봐요'
  };

  var LADDER1 = {
    title: '🪜 10개씩 묶음',
    body: '10개씩 묶음 3개와 낱개 4개는 34예요.',
    question: {
      question: '10개씩 묶음 5개와 낱개 2개는?',
      choices: ['52', '25', '502'],
      answer: 0,
      explain: '묶음은 십의 자리, 낱개는 일의 자리예요.'
    }
  };

  var LADDER3 = {
    title: '🪜 100까지의 수 읽기',
    body: '52는 오십이, 70은 칠십이라고 읽어요.',
    question: {
      question: '68을 바르게 읽으면?',
      choices: ['육십팔', '육팔', '육십여덟'],
      answer: 0,
      explain: '십의 자리 6은 육십, 일의 자리 8은 팔이에요.'
    }
  };

  var CMP_MAP = {
    '>': '> 왼쪽이 커요',
    '<': '< 오른쪽이 커요',
    '=': '= 같아요'
  };
  var CMP_ORDER = [CMP_MAP['>'], CMP_MAP['<'], CMP_MAP['=']];

  // 공용 3지선다 묻기 래퍼 (질문·오답 힌트 자동 읽기 포함)
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
      ladderLabel: '🪜 1학년 계단 다시 보기',
      say: ctx.say,
      sayHint: true,
      column: Boolean(opt.column),
      onSolved: opt.onSolved || next
    };
    if (opt.speak !== undefined) o.speak = opt.speak;
    if (opt.order) o.order = opt.order;
    box.appendChild(global.MathDrill.ask(ctx.ui, o));
  }

  // 1~5관 공통 틀 생성
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

  // 1관: 백이 뭐예요?
  var lab1 = makeLab(1, {
    title: '1관 백이 뭐예요?',
    icon: '💯',
    sub: '10이 10개',
    guide: '모형을 더 놓아 100을 만들어 봐요.',
    algo: ['십 모형 10개는 백 모형 1개', '99보다 1 큰 수는 100'],
    whyTitle: '백 모형',
    whyBody: '십 모형을 10개 모으면 백 모형 하나가 돼요. 그래서 10이 10개면 100이에요.',
    renderProblem: function (box, p, next, extra, counter, ctx) {
      var ui = ctx.ui;
      var BT = global.BaseTenDraw;
      var m;
      if (p.kind === 'ten-tens') {
        box.appendChild(ui.guide('십 모형을 더 놓아 10개를 만들어요'));
        m = BT.model({ h: 0, t: p.start, o: 0 });
        box.appendChild(m.el);
        box.appendChild(BT.placeControls(ui, {
          model: m,
          places: ['t'],
          target: { h: 1, t: 0, o: 0 },
          autoBundle: true,
          say: ctx.say,
          onDone: function () {
            askWrap(box, ctx, p, extra, counter, next, {
              question: '10이 10개면?',
              hint: '십 모형 10개가 백 모형 1개가 되었어요.',
              explain: '10이 10개 모이면 100이에요.',
              ladder: LADDER1
            });
          }
        }));
      } else if (p.kind === 'ninety-nine-plus-one') {
        box.appendChild(ui.guide('일 모형을 1개 더 놓아 봐요'));
        m = BT.model({ h: 0, t: 9, o: 9 });
        box.appendChild(m.el);
        box.appendChild(BT.placeControls(ui, {
          model: m,
          places: ['o'],
          target: { h: 1, t: 0, o: 0 },
          autoBundle: true,
          say: ctx.say,
          onDone: function () {
            askWrap(box, ctx, p, extra, counter, next, {
              question: '99보다 1 큰 수는?',
              hint: '일 모형이 10개, 십 모형이 10개 모여 백 모형이 되었어요.',
              explain: '99보다 1 큰 수는 100이에요.',
              ladder: LADDER1
            });
          }
        }));
      } else {
        box.appendChild(BT.picture(100));
        askWrap(box, ctx, p, extra, counter, next, {
          question: '100은 10이 몇 개?',
          hint: '백 모형 안에 십 모형이 몇 개 들어 있는지 떠올려 봐요.',
          explain: '100은 10이 10개 모인 수예요.',
          ladder: LADDER1
        });
      }
    }
  });

  // 2관: 몇백
  var lab2 = makeLab(2, {
    title: '2관 몇백',
    icon: '🧱',
    sub: '100이 몇 개',
    guide: '백 모형을 놓고 얼마인지 읽고 써 봐요.',
    algo: ['백 모형을 세요', '3개면 300, 삼백'],
    whyTitle: '몇백',
    whyBody: '100이 3개면 300이에요. 삼백이라고 읽어요.',
    renderProblem: function (box, p, next, extra, counter, ctx) {
      var ui = ctx.ui;
      var BT = global.BaseTenDraw;
      box.appendChild(ui.guide('백 모형을 ' + p.h + '개 놓아요'));
      var m = BT.model({ h: 0, t: 0, o: 0 });
      box.appendChild(m.el);
      box.appendChild(BT.placeControls(ui, {
        model: m,
        places: ['h'],
        target: { h: p.h, t: 0, o: 0 },
        say: ctx.say,
        onDone: function () {
          askWrap(box, ctx, p, false, counter, next, {
            question: '얼마예요?',
            kind: 'hundreds',
            hint: '백 모형이 몇 개인지 세어 봐요.',
            explain: '100이 ' + p.h + '개면 ' + J(p.answerText, 'ieyo') + '.',
            onSolved: function () {
              askWrap(box, ctx, p, extra, counter, next, {
                question: '이 수를 어떻게 읽어요?',
                speak: '이 수를 어떻게 읽어요?',
                answer: p.reading,
                wrongs: toTokens(CORE.wrongReadings(p.n)),
                column: true,
                kind: 'hundreds-read',
                hint: '백의 자리 숫자를 읽고 뒤에 백을 붙여요.',
                explain: J(p.answerText, 'eun') + ' ' + J(p.reading, 'ieyo') + '.'
              });
            }
          });
        }
      }));
    }
  });

  // 3관: 세 자리 수 쓰고 읽기
  var lab3 = makeLab(3, {
    title: '3관 세 자리 수 쓰고 읽기',
    icon: '👂',
    sub: '듣고·보고',
    guide: '소리를 듣고 모형을 만들거나 수를 읽어 봐요.',
    algo: ['백·십·일 자리를 차례로', '0인 자리는 읽지 않아요'],
    whyTitle: '세 자리 수',
    whyBody: '352는 백이 3개, 십이 5개, 일이 2개예요. 삼백오십이라고 읽어요.',
    renderProblem: function (box, p, next, extra, counter, ctx) {
      var ui = ctx.ui;
      var BT = global.BaseTenDraw;
      if (p.kind === 'listen-build') {
        box.appendChild(ui.guide('🔊 듣고 모형을 만들어요'));
        box.appendChild(ui.button('🔊 다시 듣기', 'mx-btn', function () {
          ctx.say(p.reading);
        }));
        ctx.say(p.reading);
        var m = BT.model({ h: 0, t: 0, o: 0 });
        box.appendChild(m.el);
        box.appendChild(BT.placeControls(ui, {
          model: m,
          places: ['h', 't', 'o'],
          target: CORE.digits(p.n),
          say: ctx.say,
          onDone: function () {
            askWrap(box, ctx, p, extra, counter, next, {
              question: '만든 수를 숫자로 고르면?',
              speak: p.reading,
              hint: '백·십·일 모형 개수를 차례로 써요.',
              explain: J(p.reading, 'eun') + ' ' + J(p.answerText, 'ieyo') + '.',
              ladder: LADDER3
            });
          }
        }));
      } else if (p.kind === 'listen-write') {
        box.appendChild(ui.guide('🔊 듣고 숫자를 골라요'));
        box.appendChild(ui.button('🔊 다시 듣기', 'mx-btn', function () {
          ctx.say(p.reading);
        }));
        askWrap(box, ctx, p, extra, counter, next, {
          question: '들은 수를 숫자로 고르면?',
          speak: p.reading,
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
          hint: '백의 자리부터 차례로 읽고 0은 읽지 않아요.',
          explain: J(String(p.n), 'eun') + ' ' + J(p.answerText, 'ieyo') + '.',
          ladder: LADDER3
        });
      }
    }
  });

  // 4관: 자릿값
  var lab4 = makeLab(4, {
    title: '4관 자릿값',
    icon: '🔢',
    sub: '숫자가 나타내는 수',
    guide: '강조된 숫자가 얼마를 나타내는지 찾아봐요.',
    algo: ['어느 자리인지 봐요', '백의 자리 3은 300'],
    whyTitle: '자릿값',
    whyBody: '같은 숫자라도 자리에 따라 나타내는 수가 달라요.',
    renderProblem: function (box, p, next, extra, counter, ctx) {
      var ui = ctx.ui;
      var d = CORE.digits(p.n);
      var strip = ui.el('div', 'tw-digits');
      var cells = [
        { key: 'h', val: d.h },
        { key: 't', val: d.t },
        { key: 'o', val: d.o }
      ];
      var i;
      for (i = 0; i < cells.length; i += 1) {
        var cls = cells[i].key === p.place ? 'tw-digit is-hl' : 'tw-digit';
        strip.appendChild(ui.el('span', cls, String(cells[i].val)));
      }
      box.appendChild(strip);
      var placeName = p.place === 'h' ? '백의 자리' : (p.place === 't' ? '십의 자리' : '일의 자리');
      askWrap(box, ctx, p, extra, counter, next, {
        question: J(p.digit, 'eun') + ' 얼마를 나타낼까요?',
        hint: '백·십·일 중 어느 자리인지 확인해 봐요.',
        explain: placeName + ' ' + J(p.digit, 'eun') + ' ' + J(p.answerText, 'ieyo') + '.'
      });
    }
  });

  // 5관: 뛰어 세기와 크기 비교
  var lab5 = makeLab(5, {
    title: '5관 뛰어 세기와 크기 비교',
    icon: '🦘',
    sub: '100·10·1씩',
    guide: '얼마씩 뛰는지 보거나 두 수의 크기를 비교해요.',
    algo: ['얼마씩 뛰는지 봐요', '백의 자리부터 비교해요'],
    whyTitle: '뛰어 세기',
    whyBody: '10씩 뛰다가 일의 자리를 넘기면 십의 자리가 1 커져요.',
    renderProblem: function (box, p, next, extra, counter, ctx) {
      var ui = ctx.ui;
      var BT = global.BaseTenDraw;
      if (p.kind === 'jump-100' || p.kind === 'jump-10-or-1') {
        var stepText = p.step === 100 ? '100' : (p.step === 10 ? '10' : '1');
        var hop = ui.el('div', 'tw-hop');
        hop.appendChild(global.MathDrill.expr(ui, p.start + ' → ' + stepText + '씩 → ?'));
        box.appendChild(hop);
        askWrap(box, ctx, p, extra, counter, next, {
          question: p.start + '보다 ' + p.step + ' 큰 수는?',
          hint: '얼마씩 뛰는지 보고 커지는 쪽으로 세어 봐요.',
          explain: p.start + '보다 ' + p.step + ' 큰 수는 ' + J(p.answerText, 'ieyo') + '.'
        });
        return;
      }
      var cmp = ui.el('div', 'tw-compare');
      var topBox = ui.el('div', 'tw-cmp-item');
      topBox.appendChild(ui.el('div', 'tw-cmp-num', String(p.a)));
      topBox.appendChild(BT.picture(p.a));
      var botBox = ui.el('div', 'tw-cmp-item');
      botBox.appendChild(ui.el('div', 'tw-cmp-num', String(p.b)));
      botBox.appendChild(BT.picture(p.b));
      cmp.appendChild(topBox);
      cmp.appendChild(botBox);
      box.appendChild(cmp);
      var rawWrongs = CORE.wrongChoices(p);
      var cmpWrongs = [];
      var i;
      for (i = 0; i < rawWrongs.length; i += 1) {
        cmpWrongs.push({
          token: CMP_MAP[rawWrongs[i].text] || rawWrongs[i].text,
          mistake: rawWrongs[i].mistake
        });
      }
      var big = p.a > p.b ? p.a : p.b;
      var small = p.a > p.b ? p.b : p.a;
      askWrap(box, ctx, p, extra, counter, next, {
        question: p.a + ' ○ ' + p.b + ' 알맞은 것은?',
        speak: J(p.a, 'gwa') + ' ' + p.b + ', 어느 쪽이 클까요?',
        answer: CMP_MAP[p.answerText],
        wrongs: cmpWrongs,
        order: CMP_ORDER,
        column: true,
        hint: '백의 자리부터 차례로 비교해요.',
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

  // 1~6관과 퀴즈 배틀 마운트
  function mount() {
    global.MathExplorer.mount({
      key: KEY,
      rememberTab: true,
      wishBox: true,
      // 7관 🔍 수 스무고개는 number_three-twenty.js(NumberTwenty)가 있으면 붙인다 (2026-11-24)
      labs: [lab1, lab2, lab3, lab4, lab5, lab6].concat(global.NumberTwenty ? [global.NumberTwenty.lab] : []),
      quiz: global.MathExplorerQuiz.create({
        grade: '2-1',
        unit: '1. 세 자리 수',
        title: '퀴즈 배틀',
        intro: '퀴즈 배틀이에요. 천천히 들어 보고 골라 볼까요?',
        sayQuestion: true
      })
    });
  }

  if (global.document && global.document.readyState === 'loading') {
    global.document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})(typeof window !== 'undefined' ? window : globalThis);
