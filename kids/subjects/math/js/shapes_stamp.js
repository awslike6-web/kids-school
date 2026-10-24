/* 입체의 평평한 면 → 평면 자국 → 조각 구성 */
(() => {
  const $ = id => document.getElementById(id), ns = 'http://www.w3.org/2000/svg';
  const faces = {box: 'square', cylinder: 'circle', prism: 'triangle'};
  const names = {square:'네모',circle:'동그라미',triangle:'세모'};
  let inked = false, selected = null, drag = null, count = 0;
  const shape = (type, x, y, color) => {
    const el = document.createElementNS(ns, 'g');
    el.dataset.x = x; el.dataset.y = y; el.dataset.angle = 0;
    el.innerHTML = type === 'square' ? '<rect x="-30" y="-30" width="60" height="60"/>' :
      type === 'circle' ? '<circle r="30"/>' : '<path d="M0 -34 L34 28 L-34 28 Z"/>';
    el.setAttribute('fill', color); el.setAttribute('aria-label', names[type]); transform(el); return el;
  };
  function transform(el) {el.setAttribute('transform', `translate(${el.dataset.x} ${el.dataset.y}) rotate(${el.dataset.angle})`);}
  function point(svg, e) {
    const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  }
  function preview() {
    inked = false;
    const solid = $('stamp-solid').value, color = $('stamp-color').value;
    const drawings = {
      box: `<path d="M45 50 L85 25 L145 25 L105 50Z" fill="#e2e8f0"/><path d="M105 50 L145 25 L145 85 L105 110Z" fill="#94a3b8"/><rect x="45" y="50" width="60" height="60" fill="${color}"/>`,
      cylinder: `<path d="M45 45V110 A45 18 0 0 0 135 110V45" fill="#cbd5e1"/><ellipse cx="90" cy="45" rx="45" ry="18" fill="${color}"/>`,
      prism: `<path d="M45 115 L80 40 L140 20 L105 95Z" fill="#e2e8f0"/><path d="M80 40 L120 115 L160 95 L140 20Z" fill="#94a3b8"/><path d="M45 115 L80 40 L120 115Z" fill="${color}"/>`
    };
    $('stamp-preview').innerHTML = drawings[solid];
    $('stamp-feedback').textContent = `색칠된 ${names[faces[solid]]} 모양의 평평한 면을 찍어요. 먼저 잉크를 묻혀 주세요.`;
  }
  function stamp(x,y) {
    if (!inked) { $('stamp-feedback').textContent = '먼저 평평한 면에 잉크를 묻혀 주세요.'; return; }
    if ($('stamp-paper').children.length >= 60) { $('stamp-feedback').textContent = '도화지가 가득 찼어요. 새 도화지에 찍어 봐요.'; return; }
    const type = faces[$('stamp-solid').value];
    const el = shape(type, Math.max(35,Math.min(565,x)),Math.max(35,Math.min(325,y)), $('stamp-color').value);
    $('stamp-paper').append(el); inked = false;
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) el.animate([{opacity:0},{opacity:1}],{duration:350});
    $('stamp-feedback').textContent = `${names[type]}가 찍혔어요! 입체 전체가 아니라 바닥에 닿은 평평한 면의 자국이에요.`;
  }
  $('stamp-solid').onchange = preview; $('stamp-color').oninput = preview;
  $('stamp-ink').onclick = () => {inked = true; $('stamp-feedback').textContent = '잉크가 묻었어요! 도화지를 콕 눌러 찍어 봐요.';};
  $('stamp-paper').onpointerdown = e => {const p = point(e.currentTarget,e); stamp(p.x,p.y);};
  $('stamp-center').onclick = () => {
    const n = $('stamp-paper').children.length;
    stamp(150 + n % 5 * 75, 90 + Math.floor(n / 5) % 3 * 90);
  };
  $('stamp-clear').onclick = () => {$('stamp-paper').replaceChildren(); preview();};
  $('stamp-read').onclick = () => window.speakFairyTTS?.($('stamp-feedback').textContent);
  function select(el) {
    selected?.classList.remove('selected'); selected = el; selected?.classList.add('selected');
    $('art-feedback').textContent = el ? `${el.getAttribute('aria-label')} 선택! 끌거나 방향키로 옮기고, 돌려 볼 수 있어요.` : '조각을 추가해서 꾸며 봐요.';
  }
  function guide() {
    const paper = $('art-paper'); paper.querySelector('.guide')?.remove();
    const el = document.createElementNS(ns,'g'); el.classList.add('guide');
    const guides = {
      house:'<path d="M170 170L300 60L430 170Z M200 170V310H400V170 M270 310V240H330V310"/>',
      train:'<path d="M70 130H220V250H70Z M240 150H380V250H240Z M400 150H540V250H400Z"/><circle cx="110" cy="270" r="25"/><circle cx="180" cy="270" r="25"/><circle cx="280" cy="270" r="25"/><circle cx="340" cy="270" r="25"/><circle cx="440" cy="270" r="25"/><circle cx="500" cy="270" r="25"/>',
      butterfly:'<circle cx="230" cy="130" r="70"/><circle cx="370" cy="130" r="70"/><circle cx="240" cy="250" r="60"/><circle cx="360" cy="250" r="60"/><path d="M285 100H315V300H285Z"/>',free:''};
    el.innerHTML = guides[$('art-guide').value]; paper.prepend(el);
  }
  document.querySelectorAll('[data-piece]').forEach(b => b.onclick = () => {
    if ($('art-paper').querySelectorAll('.piece').length >= 60) return;
    const el = shape(b.dataset.piece, 250 + count++ % 4 * 25,180,$('art-color').value);
    el.classList.add('piece'); $('art-paper').append(el); select(el); $('art-paper').focus();
  });
  const paper = $('art-paper');
  paper.onpointerdown = e => {
    const el = e.target.closest('.piece'); if (!el) {select(null); return;}
    select(el); const p = point(paper,e); drag = {id:e.pointerId,dx:p.x-Number(el.dataset.x),dy:p.y-Number(el.dataset.y)};
    paper.setPointerCapture(e.pointerId); paper.focus();
  };
  function move(x,y) {if (!selected) return; selected.dataset.x = Math.max(45,Math.min(555,x)); selected.dataset.y = Math.max(45,Math.min(315,y)); transform(selected);}
  paper.onpointermove = e => {if (!drag || e.pointerId !== drag.id) return; const p = point(paper,e); move(p.x-drag.dx,p.y-drag.dy);};
  paper.onpointerup = paper.onpointercancel = paper.onlostpointercapture = () => drag = null;
  paper.onkeydown = e => {
    const delta = {ArrowLeft:[-10,0],ArrowRight:[10,0],ArrowUp:[0,-10],ArrowDown:[0,10]}[e.key];
    if (selected && delta) {e.preventDefault(); move(Number(selected.dataset.x)+delta[0],Number(selected.dataset.y)+delta[1]);}
  };
  $('art-guide').onchange = guide;
  $('art-rotate').onclick = () => {if (selected) {selected.dataset.angle = (Number(selected.dataset.angle)+45)%360; transform(selected);}};
  $('art-delete').onclick = () => {selected?.remove(); select(null);};
  $('art-clear').onclick = () => {paper.replaceChildren(); select(null); guide();};
  preview(); guide();
})();
