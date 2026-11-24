// 초등 1학년 '100까지의 수' 탐험관 1~7관 및 전체 마운트 (HundredLabs)
// 명세: docs/math_1_bridge_spec.md §3-2
(function (global) {
  'use strict';

  var KEY = 'n100';
  var CORE = global.HundredCore;
  var NAMES = { t: '10개씩 묶음', o: '낱개' };

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

  function reducedMotion() {
    if (typeof global.matchMedia !== 'function') return false;
    return Boolean(global.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  var HINTS = {
    'place-ignore': '묶음 하나는 10이에요',
    'swap-digits': '묶음 수를 먼저 써요',
    'off-by-one': '낱개를 다시 세어 봐요',
    'off-by-ten': '묶음을 다시 세어 봐요',
    'read-digits': '묶음 숫자 뒤에 십을 붙여요',
    'read-one-prefix': "묶음 1개는 '일'을 빼요",
    'native-digit': '묶음은 다른 이름으로 읽어요',
    'native-neighbor': '묶음 수를 다시 봐요',
    'read-zero': '낱개 0은 읽지 않아요',
    'wrong-step': '1만 커져요',
    'wrong-direction': '커지는 쪽으로 세어요',
    'boundary': '낱개가 10개면 묶음이 돼요',
    'compare-ones-first': '묶음 수부터 비교해요',
    'compare-ones': '묶음이 같으면 낱개를 봐요',
    'reverse': '어느 쪽이 큰지 다시 봐요',
    'equal': '두 수가 같지 않아요',
    'not-equal': '두 수가 똑같아요',
    'even-odd-swap': '남는 사탕이 있는지 봐요',
    'last-digit': '낱개가 0·2·4·6·8이면 짝수예요'
  };

  // 3관 사이의 수(between)는 off-by-one 힌트를 '두 수 사이를 봐요'로 안내
  var BETWEEN_HINTS = {
    'off-by-one': '두 수 사이를 봐요',
    'off-by-ten': HINTS['off-by-ten'],
    'wrong-step': HINTS['wrong-step'],
    'wrong-direction': HINTS['wrong-direction'],
    'swap-digits': HINTS['swap-digits']
  };

  // 3관 1 작은 수(prev-1)는 방향 힌트를 거꾸로 (2026-11-24 화면 확인: 「커지는 쪽으로」가 나왔음)
  var PREV_HINTS = Object.assign({}, HINTS, {
    'wrong-step': '1만 작아져요',
    'wrong-direction': '작아지는 쪽으로 세어요'
  });

  var LADDER1 = {
    title: '🪜 50까지의 수',
    body: '10개씩 묶음 2개와 낱개 3개는 23이에요.',
    question: {
      question: '묶음 3개와 낱개 4개는?',
      choices: ['34', '43', '7'],
      answer: 0,
      explain: '10개씩 묶음 3개와 낱개 4개는 34예요.'
    }
  };

  var LADDER2 = {
    title: '🪜 50까지의 수 읽기',
    body: '23은 이십삼, 스물셋이라고 읽어요.',
    question: {
      question: '30을 다르게 읽으면?',
      choices: ['서른', '셋', '마흔'],
      answer: 0,
      explain: '30은 삼십, 서른이라고 읽어요.'
    }
  };

  var CMP_MAP = {
    '>': '> 왼쪽이 커요',
    '<': '< 오른쪽이 커요',
    '=': '= 같아요'
  };
  var CMP_ORDER = [CMP_MAP['>'], CMP_MAP['<'], CMP_MAP['=']];
  var PARITY_ORDER = ['짝수', '홀수'];

  // 공용 3지선다 묻기 래퍼 (질문·오답 힌트 자동 읽기 포함)
  function askWrap(box, ctx, p, extra, counter, next, opt) {
    var o = {
      question: opt.question,
      answer: opt.answer !== undefined ? opt.answer : p.answerText,
      wrongs: opt.wrongs || toTokens(CORE.wrongChoices(p)),
      hints: opt.hints || HINTS,
      hint: opt.hint || '묶음과 낱개를 다시 살펴봐요.',
      explain: opt.explain,
      prefix: KEY,
      kind: opt.kind || p.kind,
      extra: opt.extra !== undefined ? opt.extra : extra,
      counter: counter,
      ladder: opt.ladder || null,
      ladderLabel: '🪜 50까지의 수 다시 보기',
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

  // 5관 사탕 판 생성 (둘씩 묶음 span.n100-pair, 마지막 하나는 짝 없음)
  function buildCandyBoard(ui, count) {
    var board = ui.el('div', 'n100-candy-board');
    var pairs = [];
    var leftCandy = null;
    var i;
    for (i = 0; i < count; i += 2) {
      var pair = ui.el('span', 'n100-pair');
      var first = ui.el('span', 'n100-candy', '🍬');
      pair.appendChild(first);
      if (i + 1 < count) {
        pair.appendChild(ui.el('span', 'n100-candy', '🍬'));
      } else {
        leftCandy = first;
      }
      pairs.push(pair);
      board.appendChild(pair);
    }
    return { el: board, pairs: pairs, leftCandy: leftCandy };
  }

  // 1관: 묶음과 낱개
  var lab1 = makeLab(1, {
    title: '1관 묶음과 낱개',
    icon: '📦',
    sub: '10개씩 묶음',
    guide: '10개씩 묶음과 낱개로 두 자리 수를 만들어 봐요.',
    algo: ['10개씩 묶음을 먼저 세요', '남은 낱개를 뒤에 써요'],
    whyTitle: '묶음과 낱개',
    whyBody: '10개씩 묶음 4개와 낱개 2개는 42예요. 묶음 수를 먼저 쓰고 낱개를 뒤에 써요.',
    renderProblem: function (box, p, next, extra, counter, ctx) {
      var ui = ctx.ui;
      var BT = global.BaseTenDraw;
      var m;
      if (p.kind === 'tens-make') {
        box.appendChild(ui.guide('10개씩 묶음을 ' + p.t + '개 놓아요'));
        m = BT.model({ h: 0, t: 0, o: 0 });
        box.appendChild(m.el);
        box.appendChild(BT.placeControls(ui, {
          model: m,
          places: ['t'],
          target: { h: 0, t: p.t, o: 0 },
          names: NAMES,
          say: ctx.say,
          onDone: function () {
            askWrap(box, ctx, p, extra, counter, next, {
              question: '얼마예요?',
              hint: '10개씩 묶음이 몇 개인지 세어 봐요.',
              explain: '10개씩 묶음 ' + p.t + '개는 ' + J(p.answerText, 'ieyo') + '.',
              ladder: LADDER1
            });
          }
        }));
      } else if (p.kind === 'listen-build') {
        box.appendChild(ui.guide('🔊 듣고 묶음과 낱개를 놓아요'));
        box.appendChild(ui.button('🔊 다시 듣기', 'mx-btn', function () {
          ctx.say(p.reading);
        }));
        ctx.say(p.reading);
        m = BT.model({ h: 0, t: 0, o: 0 });
        box.appendChild(m.el);
        box.appendChild(BT.placeControls(ui, {
          model: m,
          places: ['t', 'o'],
          target: { h: 0, t: p.t, o: p.o },
          names: NAMES,
          say: ctx.say,
          onDone: function () {
            askWrap(box, ctx, p, extra, counter, next, {
              question: '만든 수를 숫자로 고르면?',
              speak: p.reading,
              hint: '묶음 수와 낱개 수를 차례로 써요.',
              explain: J(p.answerText, 'eun') + ' 10개씩 묶음 ' + p.t + '개와 낱개 ' + p.o + '개예요.',
              ladder: LADDER1
            });
          }
        }));
      } else {
        box.appendChild(BT.picture(p.n));
        askWrap(box, ctx, p, extra, counter, next, {
          question: '모두 얼마예요?',
          hint: '10개씩 묶음과 낱개를 차례로 세어 봐요.',
          explain: J(p.answerText, 'eun') + ' 10개씩 묶음 ' + p.t + '개와 낱개 ' + p.o + '개예요.',
          ladder: LADDER1
        });
      }
    }
  });

  // 2관: 두 가지로 읽기
  var lab2 = makeLab(2, {
    title: '2관 두 가지로 읽기',
    icon: '🗣️',
    sub: '오십이·쉰둘',
    guide: '두 자리 수를 두 가지 말로 읽고 들어 봐요.',
    algo: ['오십이처럼 읽을 수 있어요', '쉰둘처럼 하나, 둘로도 읽어요'],
    whyTitle: '두 가지로 읽기',
    whyBody: '52는 오십이라고도 읽고 쉰둘이라고도 읽어요. 물건을 셀 때는 쉰둘을 자주 써요.',
    renderProblem: function (box, p, next, extra, counter, ctx) {
      var ui = ctx.ui;
      if (p.kind === 'read-sino') {
        box.appendChild(global.MathDrill.expr(ui, String(p.n)));
        askWrap(box, ctx, p, extra, counter, next, {
          question: '이 수를 어떻게 읽어요?',
          speak: '이 수를 어떻게 읽어요?',
          column: true,
          hint: '묶음 숫자 뒤에 십을 붙여 읽어요.',
          explain: J(String(p.n), 'eun') + ' ' + J(p.answerText, 'ieyo') + '.',
          ladder: LADDER2
        });
      } else if (p.kind === 'read-native') {
        box.appendChild(global.MathDrill.expr(ui, String(p.n)));
        askWrap(box, ctx, p, extra, counter, next, {
          question: '하나, 둘로 세는 말로 읽으면?',
          speak: '하나, 둘로 세는 말로 읽으면?',
          column: true,
          hint: '스물, 서른, 마흔처럼 묶음을 읽어 봐요.',
          explain: J(String(p.n), 'eun') + ' ' + J(p.answerText, 'ieyo') + '.',
          ladder: LADDER2
        });
      } else {
        box.appendChild(ui.guide('🔊 듣고 숫자를 골라요'));
        box.appendChild(ui.button('🔊 다시 듣기', 'mx-btn', function () {
          ctx.say(p.reading);
        }));
        askWrap(box, ctx, p, extra, counter, next, {
          question: '들은 수를 숫자로 고르면?',
          speak: p.reading,
          hint: '묶음 수와 낱개 수를 다시 들어 봐요.',
          explain: J(p.reading, 'eun') + ' ' + J(p.answerText, 'ieyo') + '.',
          ladder: LADDER2
        });
      }
    }
  });

  // 3관: 수의 순서
  var lab3 = makeLab(3, {
    title: '3관 수의 순서',
    icon: '🦘',
    sub: '1 큰 수·작은 수',
    guide: '1 큰 수, 1 작은 수, 두 수 사이의 수를 찾아요.',
    algo: ['1 큰 수는 바로 다음 수예요', '1 작은 수는 바로 앞 수예요'],
    whyTitle: '수의 순서',
    whyBody: '39에서 낱개가 1 늘어나면 10개씩 묶음이 하나 더 생겨 40이 돼요.',
    renderProblem: function (box, p, next, extra, counter, ctx) {
      var ui = ctx.ui;
      if (p.kind === 'next-1') {
        askWrap(box, ctx, p, extra, counter, next, {
          question: p.start + '보다 1 큰 수는?',
          hint: '바로 다음 수를 떠올려 봐요.',
          explain: p.start + '보다 1 큰 수는 ' + J(p.answerText, 'ieyo') + '.'
        });
      } else if (p.kind === 'prev-1') {
        askWrap(box, ctx, p, extra, counter, next, {
          question: p.start + '보다 1 작은 수는?',
          hints: PREV_HINTS,
          hint: '바로 앞 수를 떠올려 봐요.',
          explain: p.start + '보다 1 작은 수는 ' + J(p.answerText, 'ieyo') + '.'
        });
      } else {
        var strip = ui.el('div', 'n100-strip');
        strip.appendChild(ui.el('span', 'tw-digit', String(p.a)));
        strip.appendChild(ui.el('span', 'tw-digit is-blank', '□'));
        strip.appendChild(ui.el('span', 'tw-digit', String(p.b)));
        box.appendChild(strip);
        askWrap(box, ctx, p, extra, counter, next, {
          question: '□에 알맞은 수는?',
          hints: BETWEEN_HINTS,
          hint: '두 수 사이를 봐요.',
          explain: J(p.a, 'gwa') + ' ' + p.b + ' 사이의 수는 ' + J(p.answerText, 'ieyo') + '.'
        });
      }
    }
  });

  // 4관: 크기 비교
  var lab4 = makeLab(4, {
    title: '4관 크기 비교',
    icon: '⚖️',
    sub: '어느 쪽이 클까',
    guide: '왼쪽과 오른쪽 수를 보고 어느 쪽이 큰지 골라요.',
    algo: ['10개씩 묶음 수부터 비교해요', '묶음이 같으면 낱개를 비교해요'],
    whyTitle: '크기 비교',
    whyBody: '10개씩 묶음이 많으면 낱개가 적어도 더 큰 수예요. 41은 38보다 커요.',
    renderProblem: function (box, p, next, extra, counter, ctx) {
      var ui = ctx.ui;
      var BT = global.BaseTenDraw;
      var cmp = ui.el('div', 'n100-cmp');
      var leftCard = ui.el('div', 'n100-cmp-card');
      leftCard.appendChild(ui.el('div', 'n100-cmp-side', '왼쪽'));
      leftCard.appendChild(ui.el('div', 'n100-cmp-num', String(p.a)));
      leftCard.appendChild(BT.picture(p.a));
      var signEl = ui.el('span', 'n100-cmp-sign', '○');
      var rightCard = ui.el('div', 'n100-cmp-card');
      rightCard.appendChild(ui.el('div', 'n100-cmp-side', '오른쪽'));
      rightCard.appendChild(ui.el('div', 'n100-cmp-num', String(p.b)));
      rightCard.appendChild(BT.picture(p.b));
      cmp.appendChild(leftCard);
      cmp.appendChild(signEl);
      cmp.appendChild(rightCard);
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
      var explain;
      if (p.a === p.b) {
        explain = J(p.a, 'gwa') + ' ' + J(p.b, 'eun') + ' 크기가 같아요.';
      } else {
        var big = p.a > p.b ? p.a : p.b;
        var small = p.a > p.b ? p.b : p.a;
        explain = J(big, 'i') + ' ' + small + '보다 커요.';
      }
      askWrap(box, ctx, p, extra, counter, next, {
        question: p.a + ' ○ ' + p.b + ' 알맞은 것은?',
        speak: J(p.a, 'gwa') + ' ' + p.b + ', 어느 쪽이 클까요?',
        answer: CMP_MAP[p.answerText],
        wrongs: cmpWrongs,
        order: CMP_ORDER,
        column: true,
        hint: '10개씩 묶음 수부터 비교해요.',
        explain: explain,
        onSolved: function () {
          signEl.textContent = p.answerText;
          next();
        }
      });
    }
  });

  // 5관: 짝수와 홀수
  var lab5 = makeLab(5, {
    title: '5관 짝수와 홀수',
    icon: '🍡',
    sub: '둘씩 짝',
    guide: '사탕을 둘씩 짝 지어 보고 짝수인지 홀수인지 찾아요.',
    algo: ['둘씩 짝 지어 남지 않으면 짝수', '하나가 남으면 홀수예요'],
    whyTitle: '짝수와 홀수',
    whyBody: '10개씩 묶음은 늘 둘씩 짝이 맞아요. 그래서 두 자리 수는 낱개만 보면 알 수 있어요.',
    renderProblem: function (box, p, next, extra, counter, ctx) {
      var ui = ctx.ui;
      if (p.kind === 'pair-candies' || p.kind === 'pair-candies-big') {
        var candy = buildCandyBoard(ui, p.count);
        box.appendChild(candy.el);
        var asked = false;
        var pairBtn = ui.button('👫 둘씩 짝 짓기', 'mx-btn', function () {
          if (pairBtn.disabled) return;
          pairBtn.disabled = true;
          var i;
          for (i = 0; i < candy.pairs.length; i += 1) {
            candy.pairs[i].classList.add('is-paired');
          }
          if (candy.leftCandy) candy.leftCandy.classList.add('is-left');

          function askParity() {
            if (asked || !box.parentNode) return;
            asked = true;
            var isEven = p.count % 2 === 0;
            askWrap(box, ctx, p, extra, counter, next, {
              question: '짝수예요, 홀수예요?',
              order: PARITY_ORDER,
              hint: '남는 사탕이 있는지 봐요.',
              explain: isEven
                ? J(p.count, 'eun') + ' 둘씩 짝이 딱 맞아서 짝수예요.'
                : J(p.count, 'eun') + ' 둘씩 짝 지으면 1개가 남아서 홀수예요.'
            });
          }

          if (reducedMotion()) askParity();
          else setTimeout(askParity, 600);
        });
        box.appendChild(pairBtn);
        return;
      }

      box.appendChild(ui.guide('10개씩 묶음은 늘 짝이 맞아요. 낱개만 봐요'));
      var wantEven = p.target === 'even';
      askWrap(box, ctx, p, extra, counter, next, {
        question: wantEven ? '짝수는 어느 것?' : '홀수는 어느 것?',
        hint: '낱개가 0·2·4·6·8이면 짝수예요.',
        explain: J(p.answerText, 'eun') + ' 낱개가 ' + (p.n % 10) + '개라 ' + (wantEven ? '짝수예요.' : '홀수예요.')
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

  // 7관: 수 스무고개 (두 자리 설정)
  function makeLab7() {
    if (!global.NumberTwenty || typeof global.NumberTwenty.makeLab !== 'function') return [];
    return [global.NumberTwenty.makeLab({
      core: CORE,
      key: KEY,
      total: 90,
      title: '7관 🔍 수 스무고개',
      guide: '내가 생각한 두 자리 수를 질문으로 맞혀 봐요!',
      algo: ['크기부터 물어봐요', '묶음과 낱개를 물어봐요'],
      whyTitle: '어떻게 좁힐까?',
      whyBody: '35보다 큰지 물으면 절반쯤이 사라져요. 그다음 10개씩 묶음과 낱개를 물어봐요.',
      categories: [
        { id: 'size', label: '📏 크기', prefix: 'gt:' },
        { id: 't', label: '📦 10개씩 묶음', name: '10개씩 묶음', unit: '개', prefix: 't:', cmp: 'tg:', div: 10 },
        { id: 'o', label: '🍬 낱개', name: '낱개', unit: '개', prefix: 'o:', cmp: 'og:', div: 1 },
        { id: 'even', label: '짝수?', prefix: 'even' }
      ]
    })];
  }

  // 1~7관 마운트 (퀴즈 탭 없음)
  function mount() {
    global.MathExplorer.mount({
      key: KEY,
      rememberTab: true,
      wishBox: true,
      labs: [lab1, lab2, lab3, lab4, lab5, lab6].concat(makeLab7())
    });
  }

  global.HundredLabs = { mount: mount };

  if (global.document && global.document.readyState === 'loading') {
    global.document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})(typeof window !== 'undefined' ? window : globalThis);
