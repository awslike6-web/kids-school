/* 두 수의 10 만들기/가르기와 그림 문장제의 화면 제어 */
(() => {
  'use strict';
  const C = window.ArithmeticCPA, $ = id => document.getElementById(id);
  const subtract = document.body.dataset.operation === 'subtract';
  const prefix = subtract ? 'sub10' : 'make10';
  const scope = $('panel-strategy');
  let a = subtract ? 14 : 8, b = subtract ? 9 : 5;
  let strategy = subtract ? 'ones' : 'left', stage = 0, running = false;
  let left = [], right = [], removed = [];
  const plan = () => subtract ? C.subtractionPlan(a, b, strategy) : C.additionPlan(a, b, strategy);
  function fillSelect(id, min, max, value) {
    const select = $(id); select.replaceChildren();
    for (let n = min; n <= max; n++) {const o = document.createElement('option'); o.value = String(n); o.textContent = String(n); select.append(o);}
    select.value = String(value);
  }
  function reset() {
    stage = 0; removed = [];
    left = C.chips(subtract ? 10 : a, 'red', 'lesson-left');
    right = C.chips(subtract ? a - 10 : b, 'blue', 'lesson-right');
    render();
  }
  function render() {
    const p = plan();
    C.frame(prefix+'-left', left); C.frame(prefix+'-right', right);
    if (subtract) C.frame('sub10-removed', removed.map(t => ({...t, color:'removed'})), 9);
    $(prefix+'-equation-view').textContent = a+' '+(subtract ? '−' : '+')+' '+b+' = '+(stage === 2 ? (subtract ? p.answer : p.sum) : '□');
    $('left-count').textContent = left.length+'개'; $('right-count').textContent = right.length+'개';
    $('strategy-step').disabled = stage === 2;
    $('strategy-step').textContent = stage === 0 ? '1단계 · 구슬 옮기기' : stage === 1 ? '2단계 · 마무리하기' : '계산 완료';
    document.querySelectorAll('[data-strategy]').forEach(el => el.setAttribute('aria-pressed', String(el.dataset.strategy === strategy)));
    let text;
    if (!subtract) {
      const donor = strategy === 'left' ? b : a, base = strategy === 'left' ? a : b;
      const target = strategy === 'left' ? '왼쪽' : '오른쪽';
      text = stage === 0 ? donor+'를 '+p.need+'와 '+p.rest+'로 갈라요. '+target+'의 '+base+'에 '+p.need+'개를 옮겨 10을 만들어 봐요.' :
        stage === 1 ? base+' + '+p.need+' = 10. 구슬이 '+target+' 빈칸에 도착했어요. 남은 '+p.rest+'개를 더해 볼까요?' :
        '10 + '+p.rest+' = '+p.sum+'. 앞의 수를 갈라도 뒤의 수를 갈라도 전체 '+p.sum+'개는 같아요!';
      $('strategy-comparison').textContent = '뒤의 수 가르기: '+a+' + ('+(10-a)+' + '+(a+b-10)+') = 10 + '+(a+b-10)+'\n앞의 수 가르기: ('+(a+b-10)+' + '+(10-b)+') + '+b+' = '+(a+b-10)+' + 10';
    } else if (strategy === 'ones') {
      text = stage === 0 ? b+'를 '+p.ones+'와 '+(b-p.ones)+'로 갈라요. 먼저 낱개 '+p.ones+'개를 덜어 내요.' :
        stage === 1 ? a+' − '+p.ones+' = 10. 이제 10에서 '+(b-p.ones)+'개를 더 빼요.' :
        a+' − '+p.ones+' − '+(b-p.ones)+' = '+p.answer+'. 모두 '+b+'개를 빼서 '+p.answer+'개가 남았어요.';
    } else {
      text = stage === 0 ? a+'는 10과 낱개 '+p.ones+'예요. 낱개는 두고 10에서 '+b+'개를 먼저 빼요.' :
        stage === 1 ? '10 − '+b+' = '+p.tenRemainder+'. 남은 '+p.tenRemainder+'개에 낱개 '+p.ones+'개를 모아요.' :
        '(10 − '+b+') + '+p.ones+' = '+p.answer+'. 모두 '+b+'개를 빼서 '+p.answer+'개가 남았어요.';
    }
    if (subtract) {
      $('removed-count').textContent = '덜어 낸 구슬 '+removed.length+'개';
      $('strategy-comparison').textContent = '낱개 먼저: '+a+' − '+p.ones+' − '+(b-p.ones)+' = '+p.answer+'\n10묶음 먼저: (10 − '+b+') + '+p.ones+' = '+p.answer;
    }
    $(prefix+'-step-guide').textContent = text;
  }
  async function advance() {
    if (running || stage >= 2) return;
    running = true; C.busy(scope, true);
    const p = plan();
    let moving = [];
    if (!subtract && stage === 0) {
      const donor = strategy === 'left' ? right : left;
      const receiver = strategy === 'left' ? left : right;
      moving = donor.slice(-p.need);
      await C.fly(moving.map((token, i) => C.moveTo(token, prefix+'-'+strategy, receiver.length + i)));
      donor.splice(donor.length - p.need, p.need); receiver.push(...moving);
    } else if (subtract) {
      if (strategy === 'ones') {
        const donor = stage === 0 ? right : left;
        const count = stage === 0 ? p.firstRemoved : p.secondRemoved;
        moving = donor.slice(-count);
        await C.fly(moving.map((token,i) => C.moveTo(token, 'sub10-removed', removed.length+i)));
        donor.splice(donor.length-count,count); removed.push(...moving);
      } else if (stage === 0) {
        moving = left.slice(-b);
        await C.fly(moving.map((token,i) => C.moveTo(token,'sub10-removed',i)));
        left.splice(left.length-b,b); removed.push(...moving);
      } else {
        moving = [...right];
        await C.fly(moving.map((token,i) => C.moveTo(token,prefix+'-left',left.length+i)));
        left.push(...moving); right = [];
      }
    }
    stage++; running = false; C.busy(scope, false); render(); if (stage === 2) C.praise();
  }
  function selectProblem(nextA, nextB) {
    if (running) return;
    const next = subtract ? C.subtractionPlan(nextA,nextB,strategy) : C.additionPlan(nextA,nextB,strategy);
    if (!next) return;
    a = nextA; b = nextB;
    fillSelect('lesson-a',subtract ? 11 : 2,subtract ? 18 : 9,a);
    fillSelect('lesson-b',subtract ? a-9 : 11-a,9,b); reset();
  }
  $('lesson-a').onchange = e => {
    const nextA = Number(e.target.value), minB = subtract ? nextA-9 : 11-nextA;
    selectProblem(nextA,Math.max(minB,b));
  };
  $('lesson-b').onchange = e => selectProblem(a,Number(e.target.value));
  $('strategy-step').onclick = advance;
  $('strategy-reset').onclick = () => {if (!running) reset();};
  $('strategy-new').onclick = () => {
    const nextA = C.random(subtract ? 11 : 2,subtract ? 18 : 9);
    selectProblem(nextA,C.random(subtract ? nextA-9 : 11-nextA,9));
  };
  document.querySelectorAll('[data-strategy]').forEach(el => el.onclick = () => {
    if (running) return; strategy = el.dataset.strategy; reset();
  });
  $('strategy-read').onclick = () => C.say($(prefix+'-step-guide').textContent);
  if (subtract) {
    window.selectSub10 = selectProblem; window.randomSub10 = () => $('strategy-new').click();
    window.speakCurrentSub10 = () => $('strategy-read').click();
  } else {
    window.selectMake10 = selectProblem; window.randomMake10 = () => $('strategy-new').click();
    window.speakCurrentMake10 = () => $('strategy-read').click();
  }
  function initStory() {
    if (!$('panel-story')) return;
    let first = 8, second = 5, solved = false;
    for (const id of ['story-a','story-b','story-result']) {
      const blank = document.createElement('option'); blank.value = ''; blank.textContent = '?'; $(id).append(blank);
      for (let n=0;n<=20;n++) {const o=document.createElement('option');o.value=String(n);o.textContent=String(n);$(id).append(o);}
    }
    function picture(id,n) {
      const host=$(id);host.replaceChildren();host.setAttribute('aria-label','사과 '+n+'개');
      for(let i=0;i<n;i++){const fruit=document.createElement('span');fruit.textContent='🍎';fruit.setAttribute('aria-hidden','true');host.append(fruit);}
    }
    function renderStory() {
      solved=false; picture('story-picture-a',first);picture('story-picture-b',second);
      $('story-text').textContent='바구니에 사과가 '+first+'개 있어요. 사과 '+second+'개를 더 넣었어요. 이제 사과는 모두 몇 개일까요?';
      $('story-count-a').textContent='처음 '+first+'개';$('story-count-b').textContent='더 넣은 '+second+'개';
      ['story-a','story-op','story-b','story-result'].forEach(id=>$(id).value='');
      $('story-feedback').textContent='그림을 세어 보고 수와 기호를 골라 식을 만들어 봐요.';
      $('story-check').disabled=false;
    }
    $('story-check').onclick=()=>{
      if(solved)return;
      const ids=['story-a','story-op','story-b','story-result'];
      if(ids.some(id=>$(id).value==='')){$('story-feedback').textContent='물음표 칸을 모두 골라 볼까요?';return;}
      const x=Number($('story-a').value),y=Number($('story-b').value),answer=Number($('story-result').value);
      if($('story-op').value==='+'&&((x===first&&y===second)||(x===second&&y===first))&&answer===first+second){
        solved=true;$('story-check').disabled=true;$('story-feedback').textContent=x+' + '+y+' = '+answer+'. 사과는 모두 '+answer+'개예요!';C.praise();
      }else{
        $('story-feedback').textContent=$('story-op').value!=='+' ? '사과를 더 넣었어요. 모으는 기호를 골라 볼까요?' : '처음 '+first+'개와 더 넣은 '+second+'개를 모아 세어 봐요.';C.hint();
      }
    };
    $('story-new').onclick=()=>{first=C.random(2,9);second=C.random(1,9);renderStory();};
    $('story-read').onclick=()=>C.say($('story-text').textContent);renderStory();
  }
  selectProblem(a,b); C.initPage(subtract); initStory();
})();
