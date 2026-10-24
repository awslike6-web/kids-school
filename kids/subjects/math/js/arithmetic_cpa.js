/* 덧셈·뺄셈 CPA 공통 모델, 텐프레임, 이동, 기차·짝꿍·퀴즈 활동 */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const integer = (n, min, max) => Number.isInteger(n) && n >= min && n <= max;
  function additionPlan(a, b, target = 'left') {
    if (!integer(a, 1, 9) || !integer(b, 1, 9) || a + b <= 10 || !['left', 'right'].includes(target)) return null;
    const base = target === 'left' ? a : b, donor = target === 'left' ? b : a;
    return {a, b, target, need: 10 - base, rest: donor - (10 - base), sum: a + b};
  }
  function subtractionPlan(a, b, strategy = 'ones') {
    if (!integer(a, 11, 18) || !integer(b, 2, 9) || b <= a - 10 || !['ones', 'ten'].includes(strategy)) return null;
    const ones = a - 10;
    return {a, b, ones, strategy, firstRemoved: strategy === 'ones' ? ones : b,
      secondRemoved: strategy === 'ones' ? b - ones : 0,
      tenRemainder: 10 - b, answer: a - b};
  }
  function threePlan(values, subtract) {
    if (!Array.isArray(values) || values.length !== 3 || !values.every(n => integer(n, 1, 9))) return null;
    const [a, b, c] = values, middle = subtract ? a - b : a + b;
    const answer = subtract ? middle - c : middle + c;
    return answer >= 0 && answer <= 20 ? {a, b, c, middle, answer, sign: subtract ? '−' : '+'} : null;
  }
  const random = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
  const button = (text, action, className = '') => {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = text;
    b.className = className; b.addEventListener('click', action); return b;
  };
  const chips = (count, color, prefix) => Array.from({length: count}, (_, i) => ({id: `${prefix}-${i}`, color}));
  function chipElement(token) {
    const el = document.createElement('span'); el.className = `cpa-chip ${token.color}`;
    el.dataset.chip = token.id; el.setAttribute('aria-hidden', 'true'); return el;
  }
  function frame(id, tokens, capacity = 10) {
    const host = $(id); host.replaceChildren();
    host.setAttribute('aria-label', `구슬 ${tokens.length}개, 전체 ${capacity}칸`);
    for (let i = 0; i < capacity; i++) {
      const slot = document.createElement('span'); slot.className = 'cpa-slot'; slot.dataset.slot = i;
      if (tokens[i]) slot.append(chipElement(tokens[i])); host.append(slot);
    }
  }
  function say(text) { window.speakFairyTTS?.(text); }
  function praise() { window.fairyPraise?.(); }
  function hint() { window.fairyEncourage?.(); }
  function busy(scope, value) {
    scope.setAttribute('aria-busy', String(value));
    [...scope.querySelectorAll('button,select,input'), ...document.querySelectorAll('[data-panel]')].forEach(el => {
      if (value) {el.dataset.wasDisabled = String(el.disabled); el.disabled = true;}
      else {el.disabled = el.dataset.wasDisabled === 'true'; delete el.dataset.wasDisabled;}
    });
  }
  // 출발 구슬의 실제 화면 좌표에서 도착 칸까지 이동하고, 호출자가 최종 상태를 그린다.
  async function fly(moves) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const tasks = moves.map(({from, to}, i) => {
      if (!from || !to) return Promise.resolve();
      const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
      if (!a.width || !b.width) return Promise.resolve();
      const ghost = from.cloneNode(true); ghost.removeAttribute('data-chip'); ghost.classList.add('cpa-flight');
      Object.assign(ghost.style, {left: `${a.left}px`, top: `${a.top}px`, width: `${a.width}px`, height: `${a.height}px`});
      document.body.append(ghost); from.style.visibility = 'hidden';
      const dx = b.left + b.width / 2 - a.left - a.width / 2;
      const dy = b.top + b.height / 2 - a.top - a.height / 2;
      const animation = ghost.animate([
        {transform: 'translate(0, 0)'},
        {transform: `translate(${dx / 2}px, ${dy / 2 - 45}px)`, offset: .5},
        {transform: `translate(${dx}px, ${dy}px)`}
      ], {duration: 550, delay: i * 65, easing: 'ease-in-out', fill: 'both'});
      return animation.finished.catch(() => {}).finally(() => {ghost.remove(); from.style.visibility = '';});
    });
    await Promise.all(tasks);
  }
  function moveTo(token, targetId, index) {
    return {from: document.querySelector(`[data-chip="${token.id}"]`), to: $(targetId).children[index]};
  }
  function initTen(subtract) {
    const frameId = subtract ? 'sub-ten-frame' : 'add-ten-frame';
    const formulaId = subtract ? 'sub-frame-formula' : 'add-frame-formula';
    const descId = subtract ? 'sub-frame-sub-formula' : 'add-frame-sub-formula';
    let current = 1;
    function render(n) {
      current = n;
      frame(frameId, subtract ? chips(10 - n, 'blue', 'ten') : [...chips(n, 'red', 'ten-a'), ...chips(10 - n, 'blue', 'ten-b')]);
      $(formulaId).textContent = subtract ? `10 − ${n} = ${10 - n}` : `${n} + ${10 - n} = 10`;
      $(descId).textContent = subtract ? `10개에서 ${n}개를 덜어 내면 ${10 - n}개가 남아요.` : `${n}개와 ${10 - n}개를 모으면 10개예요.`;
      [...$('ten-options').children].forEach((b, i) => b.setAttribute('aria-pressed', String(i + 1 === n)));
    }
    for (let n = 1; n <= 9; n++) $('ten-options').append(button(String(n), () => render(n)));
    $('ten-read').onclick = () => say($(descId).textContent);
    render(current);
    if (subtract) window.setSubTenFrame = render; else window.setAddTenFrame = render;
  }
  function initTrain(subtract) {
    const scope = $('panel-train'); let plan = threePlan(subtract ? [9, 2, 3] : [4, 3, 1], subtract), step = 0;
    function wagon(n, label, color) {
      const car = document.createElement('div'); car.className = 'cpa-wagon';
      const title = document.createElement('strong'); title.textContent = `${label} ${n}`;
      const cargo = document.createElement('div'); cargo.className = 'cpa-cargo';
      for (let i = 0; i < n; i++) cargo.append(chipElement({id: `cargo-${label}-${i}`, color}));
      car.append(title, cargo); return car;
    }
    function render() {
      const {a, b, c, middle, answer, sign} = plan;
      $('train-equation').textContent = `${a} ${sign} ${b} ${sign} ${c} = ${step === 2 ? answer : '□'}`;
      const cars = step === 0 ? [wagon(a, '처음', 'red'), wagon(b, subtract ? '내릴 수' : '더 탈 수', 'blue'), wagon(c, subtract ? '다음에 내릴 수' : '다음에 탈 수', 'gold')] :
        step === 1 ? [wagon(middle, '먼저 계산한 수', 'red'), wagon(c, subtract ? '다음에 내릴 수' : '다음에 탈 수', 'gold')] : [wagon(answer, '마지막 수', 'blue')];
      $('train-cars').replaceChildren(...cars);
      $('train-guide').textContent = step === 0 ? `먼저 앞의 두 수 ${a} ${sign} ${b}부터 계산해요.` :
        step === 1 ? `${a} ${sign} ${b} = ${middle}. 이제 ${middle} ${sign} ${c}를 계산해요.` : `${middle} ${sign} ${c} = ${answer}. 앞에서부터 차례로 계산했어요!`;
      $('train-step').disabled = step === 2;
      $('train-step').textContent = step === 0 ? '1단계 · 앞의 두 수 계산' : step === 1 ? '2단계 · 남은 수 계산' : '계산 완료';
    }
    $('train-step').onclick = async () => {
      if (step >= 2 || scope.getAttribute('aria-busy') === 'true') return;
      busy(scope, true);
      const cars = [...$('train-cars').children];
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
        await Promise.all(cars.map((car, i) => car.animate(subtract ? [{transform:'translateY(0)',opacity:1},{transform:`translateY(${i ? 45 : 0}px)`,opacity:i ? .15 : 1}] :
          [{transform:'translateX(0)'},{transform:`translateX(${i ? -24 : 24}px)`}], {duration:600}).finished.catch(() => {})));
      }
      step++; busy(scope, false); render(); if (step === 2) praise();
    };
    $('train-reset').onclick = () => {step = 0; render();};
    $('train-new').onclick = () => {
      const a = subtract ? random(5, 9) : random(1, 7), b = random(1, subtract ? a - 1 : 6);
      const c = random(1, subtract ? a - b : Math.min(6, 20 - a - b));
      plan = threePlan([a, b, c], subtract); step = 0; render();
    };
    $('train-read').onclick = () => say($('train-guide').textContent); render();
  }
  function initPartner() {
    let n = 4, solved = false, rounds = 0;
    function render() {
      solved = false;
      $('partner-dice').textContent = String(n);
      $('partner-dice').setAttribute('aria-label', `주사위에서 나온 수 ${n}`);
      frame('partner-frame', chips(n, 'red', 'partner'));
      $('partner-formula').textContent = `${n} + □ = 10`;
      $('partner-feedback').textContent = '빈칸을 세어 보고, 짝꿍 숫자 풍선을 터뜨려 봐요.';
      $('partner-choices').replaceChildren();
      for (let v = 1; v <= 9; v++) $('partner-choices').append(button(String(v), () => {
        if (solved) return;
        if (v === 10 - n) {
          solved = true; rounds++;
          frame('partner-frame', [...chips(n,'red','partner'), ...chips(v,'blue','friend')]);
          $('partner-formula').textContent = `${n} + ${v} = 10`;
          $('partner-feedback').textContent = `팡! ${n}의 짝꿍은 ${v}! ${rounds}번 찾아냈어요.`;
          [...$('partner-choices').children].forEach(b => {b.disabled = true; if (Number(b.textContent) === v) b.classList.add('popped');});
          praise();
        } else { $('partner-feedback').textContent = `빈칸 ${10 - n}개를 파란 구슬로 채워 볼까요?`; hint(); }
      }, 'cpa-balloon'));
    }
    $('partner-roll').onclick = () => {n = random(1, 9); render();};
    $('partner-read').onclick = () => say($('partner-feedback').textContent); render();
  }
  function initQuiz(subtract) {
    let correct = 0, solved = false, questionNumber = 0;
    function render() {
      solved = false; const a = random(2,9), b = random(1,9), type = questionNumber++ % 2;
      if (subtract) {
        const start = type === 0 ? 10 : 10 + random(1, b - 1 || 1);
        correct = start - b; $('quiz-question').textContent = `${start} − ${b} = □`;
      } else if (type === 0) {correct = 10 - a; $('quiz-question').textContent = `${a} + □ = 10`;}
      else {correct = a + b; $('quiz-question').textContent = `${a} + ${b} = □`;}
      const values = new Set([correct]); while (values.size < 4) values.add(random(Math.max(0, correct - 3), correct + 3));
      $('quiz-feedback').textContent = '';
      $('quiz-choices').replaceChildren(...window.MathQuizEngine.shuffleArray([...values]).map(v => button(String(v), () => {
        if (solved) return;
        if (v === correct) {solved = true; $('quiz-feedback').textContent = '맞았어요! 구슬과 식을 잘 연결했어요.'; praise(); window.grantRewardAndShowUI?.(1, false, 'math');}
        else {$('quiz-feedback').textContent = '구슬판에서 10을 먼저 살펴보고 다시 골라 봐요.'; hint();}
      })));
    }
    $('quiz-next').onclick = render; window.nextQuiz = render; render();
  }
  function initPage(subtract) {
    window.currentSubject = '수학';
    const son = localStorage.getItem('currentUser') === 'son';
    document.body.classList.add(son ? 'theme--arcade' : 'theme--slime');
    $('userName').textContent = son ? '민수 대원' : '민서 대원'; $('userIcon').textContent = son ? '👦' : '👧';
    document.querySelectorAll('[data-panel]').forEach(b => b.onclick = () => {
      document.querySelectorAll('.cpa-panel').forEach(p => p.hidden = p.id !== b.dataset.panel);
      document.querySelectorAll('[data-panel]').forEach(tab => tab.setAttribute('aria-pressed', String(tab === b)));
      window.stopFairyTTS?.();
    });
    initTen(subtract); initTrain(subtract); initPartner(); initQuiz(subtract);
    window.initFairyAudio?.(); window.updateTtsToggleUi?.(); window.initFairyChat?.('MATH', subtract ? '뺄셈개념' : '덧셈개념');
  }
  window.ArithmeticCPA = {additionPlan, subtractionPlan, threePlan, random, button, chips, frame, fly, moveTo, busy, say, praise, hint, initPage};
})();
