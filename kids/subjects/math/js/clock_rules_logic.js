/* 시계와 반복 마디: 상태에서 그림과 설명을 함께 계산한다. */
(() => {
  const $ = id => document.getElementById(id);
  const mod = (n, d) => ((n % d) + d) % d;
  const timeParts = total => {
    const t = mod(total, 720);
    return {hour: Math.floor(t / 60) || 12, minute: Math.floor(t % 60),
      hourAngle: t / 2, minuteAngle: mod(t, 60) * 6};
  };
  function findRepeat(items) {
    for (let size = 1; size <= Math.floor(items.length / 2); size++) {
      if (items.every((item, i) => item === items[i % size])) {
        return {unit: items.slice(0, size), next: items[items.length % size]};
      }
    }
    return null;
  }
  window.MathPlay = {timeParts, findRepeat};
  if (!document.getElementById('clock-face')) return;
  let total = 630, quiz = false, answered = false, drag = null;
  let beads = [], family = 'fruit', numberStep = 2, numberStart = 2, numberAnswer = 10;
  let patternSolved = false, numberSolved = false;
  const palettes = {fruit: ['🍓','🍌','🍇'], color: ['🔴','🔵','🟡'], shape: ['△','□','○']};
  const say = text => window.speakFairyTTS?.(text);
  const button = (text, fn) => {
    const el = document.createElement('button'); el.textContent = text;
    el.type = 'button'; el.onclick = fn; return el;
  };
  function renderClock() {
    const t = timeParts(total), next = t.hour % 12 + 1;
    $('hand-minute').style.transform = `rotate(${total * 6}deg)`;
    $('hand-hour').style.transform = `rotate(${total / 2}deg)`;
    $('clock-face').setAttribute('aria-label', quiz ? '시계를 보고 시간을 골라요' : `${t.hour}시 ${t.minute}분`);
    const begin = (t.hour % 12) * 30;
    $('hour-zone').style.background = `conic-gradient(from ${begin}deg, #fcd34d88 0deg 30deg, transparent 30deg)`;
    $('hour-zone').hidden = quiz && !answered;
    $('clock-digital-display').textContent = quiz && !answered ? '몇 시일까요?' : `${t.hour}시 ${t.minute === 0 ? '정각' : t.minute + '분'}`;
    $('clock-rule-desc').textContent = quiz && !answered ? '짧은바늘이 지나온 숫자를 먼저 찾아봐요.' :
      t.minute === 0 ? `짧은바늘이 ${t.hour}에 도착했어요!` : `아직 ${next}시에 도착 못 했어요! 여기는 ${t.hour}시 동네!`;
  }
  function move(minutes) { if (quiz) return; total += minutes; renderClock(); }
  function angle(event) {
    const r = $('clock-face').getBoundingClientRect();
    return Math.atan2(event.clientX - r.left - r.width / 2, -(event.clientY - r.top - r.height / 2)) * 180 / Math.PI;
  }
  const face = $('clock-face');
  face.onpointerdown = event => {
    if (quiz || (event.pointerType === 'mouse' && event.button !== 0)) return;
    drag = {id: event.pointerId, angle: angle(event)}; face.setPointerCapture(event.pointerId);
  };
  face.onpointermove = event => {
    if (!drag || drag.id !== event.pointerId) return;
    const next = angle(event), delta = mod(next - drag.angle + 180, 360) - 180;
    total += delta / 6; drag.angle = next; renderClock();
  };
  function endDrag() { if (!drag) return; drag = null; total = Math.round(total); renderClock(); }
  face.onpointerup = endDrag; face.onpointercancel = endDrag; face.onlostpointercapture = endDrag;
  face.onkeydown = event => {
    if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) {
      event.preventDefault(); move(['ArrowLeft','ArrowDown'].includes(event.key) ? -1 : 1);
    }
  };
  for (let n = 1; n <= 12; n++) {
    const e = document.createElement('span'), a = n * Math.PI / 6;
    e.className = 'clock-num'; e.textContent = n;
    e.style.left = `${50 + 40 * Math.sin(a)}%`; e.style.top = `${50 - 40 * Math.cos(a)}%`; face.append(e);
  }
  [-30,-1,1,30].forEach(n => $('clock-controls').append(button(`${n > 0 ? '+' : ''}${n}분`, () => move(n))));
  $('clock-read').onclick = () => say($('clock-digital-display').textContent + '. ' + $('clock-rule-desc').textContent);
  $('clock-explore').onclick = () => {quiz = false; answered = false; $('clock-choices').replaceChildren(); $('clock-feedback').textContent = ''; renderClock();};
  $('clock-quiz').onclick = () => {
    quiz = true; answered = false; total = Math.floor(Math.random() * 24) * 30;
    const t = timeParts(total), choices = [[t.hour,t.minute], [t.hour % 12 + 1,t.minute], [t.hour,t.minute === 0 ? 30 : 0]];
    $('clock-feedback').textContent = ''; $('clock-choices').replaceChildren();
    // 공통 엔진의 셔플만 사용하고 활동별 정답 가드를 유지한다.
    window.MathQuizEngine.shuffleArray(choices).forEach(([h,m]) => $('clock-choices').append(button(`${h}시 ${m ? '30분' : '정각'}`, () => {
      if (answered) return;
      if (h === t.hour && m === t.minute) {
        answered = true; renderClock(); $('clock-feedback').textContent = '잘 읽었어요! 다음 시계에도 도전해 봐요.'; window.fairyPraise?.();
      } else {
        $('hour-zone').hidden = false;
        $('clock-feedback').textContent = `짧은바늘이 지나온 ${t.hour}부터 살펴봐요. 긴바늘이 6이면 30분이에요.`;
        window.fairyEncourage?.();
      }
    })));
    renderClock();
  };
  function renderBeads() {
    $('bead-row').replaceChildren(...beads.map((b,i) => button(b, () => {beads.splice(i,1); renderBeads();})));
    $('bead-feedback').textContent = '구슬을 누르면 빼낼 수 있어요. 같은 마디를 두 번 이상 만들어 봐요.';
    $('bead-next').disabled = true;
    arrangeBeads();
  }
  function arrangeBeads() {
    const bracelet = $('bead-layout').value === 'bracelet';
    $('bead-row').classList.toggle('bracelet', bracelet);
    [...$('bead-row').children].forEach((el,i) => {
      const a = i * 2 * Math.PI / Math.max(1, beads.length) - Math.PI / 2;
      el.style.left = bracelet ? `${50 + 39 * Math.cos(a)}%` : '';
      el.style.top = bracelet ? `${50 + 39 * Math.sin(a)}%` : '';
      el.setAttribute('aria-label', `${i + 1}번째 구슬 ${beads[i]} 빼기`);
    });
  }
  $('bead-layout').onchange = arrangeBeads;
  function renderPalette() {
    $('bead-palette').replaceChildren(...palettes[family].map(b => button(b, () => {
      if (beads.length >= 24) { $('bead-feedback').textContent = '기차가 가득 찼어요. 구슬을 빼거나 새로 만들어 봐요.'; return; }
      beads.push(b); renderBeads();
    })));
  }
  $('bead-family').onchange = e => {family = e.target.value; beads = []; renderPalette(); renderBeads();};
  $('bead-clear').onclick = () => {beads = []; renderBeads();};
  $('bead-analyze').onclick = () => {
    const result = findRepeat(beads);
    $('bead-feedback').textContent = result ? `반복 마디는 ${result.unit.join(' · ')}! 다음 구슬은 ${result.next}로 예상해요. 멋진 규칙이에요!` : '아직 반복 마디를 찾기 어려워요. 같은 순서가 두 번 이어지도록 만들어 볼까요?';
    $('bead-next').disabled = !result || beads.length >= 24;
    if (result) window.fairyPraise?.(); else window.fairyEncourage?.();
  };
  $('bead-next').onclick = () => {const r = findRepeat(beads); if (r && beads.length < 24) {beads.push(r.next); renderBeads();}};
  $('bead-read').onclick = () => say($('bead-feedback').textContent);
  function patternRound() {
    patternSolved = false;
    const palette = palettes[Object.keys(palettes)[Math.floor(Math.random()*3)]];
    const size = 2 + Math.floor(Math.random()*2);
    const unit = Array.from({length:size},(_,i)=>palette[i % palette.length]);
    if (Math.random()<.5 && size===3) unit[2]=unit[1];
    const visible = Array.from({length:size*2-1},(_,i)=>unit[i%size]);
    const correct = unit[(size*2-1)%size];
    $('pattern-display').textContent = visible.join(' · ')+' · ❓';
    $('pattern-feedback').textContent = '';
    $('pattern-choices').replaceChildren(...window.MathQuizEngine.shuffleArray([...palette,'⭐']).map(value=>button(value,()=>{
      if(patternSolved)return;
      if(value===correct){patternSolved=true;$('pattern-feedback').textContent=`맞았어요! ${unit.join(' · ')}가 반복돼요.`;window.fairyPraise?.();}
      else{$('pattern-feedback').textContent=`첫 마디 ${unit.join(' · ')}와 다음 마디를 나란히 비교해 봐요.`;window.fairyEncourage?.();}
    })));
  }
  $('pattern-next').onclick = patternRound;
  function numberRound() {
    numberSolved = false;
    numberStep = Number($('number-step').value); numberStart = numberStep;
    numberAnswer = numberStart + numberStep * 4;
    $('number-sequence').textContent = Array.from({length:4}, (_,i) => numberStart + i * numberStep).join(' → ') + ' → ?';
    $('number-feedback').textContent = `${numberStep}씩 커져요. 빛나는 칸 다음을 눌러 봐요.`;
    $('number-grid').replaceChildren();
    for (let n = 1; n <= 100; n++) {
      const b = button(n, () => {
        if (numberSolved) return;
        if (n === numberAnswer) {
          numberSolved = true;
          b.classList.add('marked'); $('number-feedback').textContent = `${numberAnswer}! ${numberStep}씩 커지는 규칙이에요.`; window.fairyPraise?.();
        } else { $('number-feedback').textContent = `${numberAnswer - numberStep}에서 ${numberStep}칸 더 가 봐요.`; window.fairyEncourage?.(); }
      });
      if (n >= numberStart && n < numberAnswer && (n - numberStart) % numberStep === 0) b.classList.add('marked');
      $('number-grid').append(b);
    }
  }
  $('number-step').onchange = numberRound;
  const profile = localStorage.getItem('currentUser') || 'daughter';
  document.body.classList.add(profile === 'son' ? 'theme--arcade' : 'theme--slime');
  $('userName').textContent = profile === 'son' ? '민수 대원' : '민서 대원';
  window.currentSubject = '수학';
  renderClock(); renderPalette(); renderBeads(); numberRound(); patternRound();
  window.initFairyAudio?.(); window.updateTtsToggleUi?.();
})();
