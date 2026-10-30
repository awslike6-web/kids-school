// ========================================================
// 🎨 5분 퀘스트 4대 인터랙션 UI 렌더러 (quest-ui-renderer.js)
// - 역할: quest-mastery.js가 만든 문제 객체를 받아 choice_audio / match_3x3 /
//         fill_blank / scramble 화면을 그리고 에러리스(Errorless) 힌트를 처리
// - 오답 시 빨간 X·감점·경고음 없음: 정답 블록 노란 테두리 + 흔들림으로 스스로 누르게 유도
// - 결과: hooks.onDone({ results: [{ id, firstTry }], firstTry })
// ========================================================
(function (root) {
  'use strict';

  const STYLE_ID = 'quest-ui-renderer-style';
  const CSS = `
  .qm-wrap{--qm-card:#1e1338;--qm-border:#2d1f4e;--qm-text:#fff;--qm-sub:#b9b2d0;--qm-accent:#7df4ff;--qm-ok:#39ff14;--qm-btn:#120924;
    color:var(--qm-text);display:flex;flex-direction:column;gap:12px;width:100%}
  .qm-wrap.qm-theme-minseo{--qm-card:#fff;--qm-border:#ffd1dc;--qm-text:#4a2e2b;--qm-sub:#a03a57;--qm-accent:#ff6584;--qm-ok:#2fbf71;--qm-btn:#fff5f8}
  .qm-badges{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
  .qm-badge{font-size:11px;font-weight:700;padding:3px 10px;border-radius:999px;border:1px solid var(--qm-border);color:var(--qm-accent);background:var(--qm-card)}
  .qm-badge.qm-rusty{color:#f5b041;border-color:#f5b041}
  .qm-prompt{background:var(--qm-card);border:2px solid var(--qm-border);border-radius:24px;padding:18px 16px;text-align:center;display:flex;flex-direction:column;gap:10px;align-items:center}
  .qm-word{font-size:30px;font-weight:800;letter-spacing:.5px;word-break:break-word;line-height:1.25}
  .qm-meaning{font-size:16px;font-weight:700;color:var(--qm-sub);line-height:1.5;word-break:keep-all}
  .qm-sentence{font-size:20px;font-weight:700;line-height:1.5;word-break:break-word}
  .qm-speaker{border:none;cursor:pointer;border-radius:18px;background:#facc15;color:#120924;font-weight:800;font-size:14px;padding:8px 14px;box-shadow:0 4px 0 0 #997300}
  .qm-speaker.qm-big{font-size:44px;width:120px;height:120px;border-radius:50%;padding:0}
  .qm-opt:has(.qm-opt-say){display:flex;align-items:center}
  .qm-opt-say{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;margin-right:8px;border-radius:50%;background:#facc15;font-size:16px;vertical-align:middle;flex-shrink:0}
  .qm-speaker:active{transform:translateY(3px);box-shadow:0 1px 0 0 #997300}
  .qm-hint{font-size:13px;line-height:1.5;color:var(--qm-sub);background:rgba(250,204,21,.12);border:1px dashed #facc15;border-radius:14px;padding:8px 12px;width:100%;box-sizing:border-box;word-break:keep-all}
  .qm-hidden{display:none!important}
  .qm-options{display:flex;flex-direction:column;gap:10px}
  .qm-opt{width:100%;text-align:left;font-size:16px;font-weight:700;padding:14px 16px;border-radius:18px;border:2px solid var(--qm-border);background:var(--qm-card);color:var(--qm-text);cursor:pointer;word-break:keep-all;transition:transform .1s,opacity .2s}
  .qm-opt:active{transform:scale(.98)}
  .qm-opt.qm-long{font-size:14px;line-height:1.45;padding:12px 14px}
  .qm-cell.qm-long{font-size:12.5px;line-height:1.4}
  .qm-opt.qm-dim{opacity:.35;pointer-events:none}
  .qm-opt.qm-correct,.qm-cell.qm-correct{border-color:var(--qm-ok);box-shadow:0 0 0 3px rgba(57,255,20,.25)}
  .qm-guide{border-color:#facc15!important;box-shadow:0 0 0 3px rgba(250,204,21,.45)!important;animation:qm-shake .45s ease-in-out 2}
  @keyframes qm-shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}
  .qm-match{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .qm-col{display:flex;flex-direction:column;gap:10px}
  .qm-cell{min-height:56px;padding:10px;border-radius:16px;border:2px solid var(--qm-border);background:var(--qm-card);color:var(--qm-text);font-size:15px;font-weight:700;cursor:pointer;word-break:keep-all;transition:opacity .3s,transform .1s}
  .qm-cell.qm-selected{border-color:var(--qm-accent);box-shadow:0 0 0 3px rgba(125,244,255,.3)}
  .qm-cell.qm-matched{opacity:0;pointer-events:none;transform:scale(.9)}
  .qm-slots{display:flex;flex-wrap:wrap;justify-content:center;gap:6px;min-height:52px;align-items:center}
  .qm-slot{min-width:30px;padding:6px 8px;border-bottom:3px solid var(--qm-accent);font-size:24px;font-weight:800;text-align:center;line-height:1.2}
  .qm-slot.qm-fixed{border-bottom-color:transparent}
  .qm-slot.qm-space{min-width:14px;border-bottom-color:transparent}
  .qm-slot.qm-empty{color:transparent}
  .qm-slot.qm-chunk{font-size:18px}
  .qm-blocks{display:flex;flex-wrap:wrap;justify-content:center;gap:8px}
  .qm-block{min-width:48px;padding:12px 14px;border-radius:14px;border:2px solid var(--qm-border);background:var(--qm-btn);color:var(--qm-text);font-size:20px;font-weight:800;cursor:pointer;box-shadow:0 4px 0 0 var(--qm-border)}
  .qm-block:active{transform:translateY(3px);box-shadow:0 1px 0 0 var(--qm-border)}
  .qm-block.qm-used{visibility:hidden}
  .qm-block.qm-chunk{font-size:16px}
  .qm-progress{display:flex;flex-direction:column;gap:6px;background:var(--qm-card);border:1px solid var(--qm-border);border-radius:16px;padding:8px 12px}
  .qm-bar{display:flex;height:10px;border-radius:999px;overflow:hidden;background:rgba(127,127,127,.25)}
  .qm-bar span{display:block;height:100%;transition:width .3s}
  .qm-seg-stone{background:#8d8d99}.qm-seg-copper{background:#c87533}.qm-seg-silver{background:#d9dde6}.qm-seg-diamond{background:#5ee7ff}
  .qm-legend{display:flex;justify-content:space-between;gap:6px;font-size:11px;font-weight:700;color:var(--qm-sub);flex-wrap:wrap}
  `;

  const LEVEL_LABEL = { 1: 'Lv.1 눈·귀 트기', 2: 'Lv.2 형태 익히기', 3: 'Lv.3 완전 인출' };

  function ensureStyle() {
    if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
    const el = document.createElement('style');
    el.id = STYLE_ID;
    el.textContent = CSS;
    document.head.appendChild(el);
  }
  // 보기·짝맞추기 칸에 쓰는 뜻풀이: "(예: …)" 부연은 숨긴다 (정답 비교는 인덱스·id라 표시만 바뀜)
  function shortMeaning(text) {
    return String(text ?? '').replace(/\s*\(예:[^)]*\)/g, '').trim() || String(text ?? '');
  }
  const LONG_TEXT = 26; // 이보다 긴 보기는 글씨를 줄여 폰 한 화면에 3개가 들어가게

  function esc(text) {
    return String(text ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }
  function h(tag, cls, html) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (html !== undefined) el.innerHTML = html;
    return el;
  }
  function guide(el) {
    if (!el) return;
    el.classList.remove('qm-guide');
    void el.offsetWidth;
    el.classList.add('qm-guide');
  }

  // ---------- 공통 골격 ----------
  function frame(container, q, hooks) {
    ensureStyle();
    container.innerHTML = '';
    const wrap = h('div', `qm-wrap qm-theme-${hooks.theme === 'minseo' ? 'minseo' : 'minsu'}`);
    const badges = h('div', 'qm-badges');
    badges.appendChild(h('span', 'qm-badge', esc(LEVEL_LABEL[q.level] || '')));
    if (q.isRustyReview) badges.appendChild(h('span', 'qm-badge qm-rusty', '👑 녹슨 왕관 복습'));
    if (q.noCredit) badges.appendChild(h('span', 'qm-badge', '🔁 복습'));
    wrap.appendChild(badges);
    const prompt = h('div', 'qm-prompt');
    wrap.appendChild(prompt);
    const hint = h('div', 'qm-hint qm-hidden', `💡 ${esc(q.hint)}`);
    const body = h('div', '');
    wrap.appendChild(body);
    container.appendChild(wrap);

    const state = { firstTry: true, errors: 0, finished: false, wrongPicks: [] };
    if (hooks.autoRead) setTimeout(() => {
      if (!state.finished && wrap.isConnected) hooks.speak?.(q.q, 'ko', () => {
        if (!state.finished && wrap.isConnected && q.lang === 'en') hooks.speak?.(q.audioText, 'en');
      });
    }, 300);
    const speak = () => hooks.speak && hooks.speak(q.audioText, q.lang);
    const speakerBtn = big => {
      const btn = h('button', `qm-speaker${big ? ' qm-big' : ''}`, big ? '🔊' : '🔊 듣기');
      btn.type = 'button';
      btn.onclick = speak;
      return btn;
    };
    const showHint = () => { if (q.hint) hint.classList.remove('qm-hidden'); }; // 힌트가 비면(정답 노출 방지) 보이지 않음
    const onWrong = chosen => {
      if (chosen != null) state.wrongPicks.push(String(chosen));
      hooks.onWrong?.(chosen);
      state.errors++;
      if (state.firstTry) hooks.onEncourage && hooks.onEncourage();
      state.firstTry = false;
      if (q.hintPolicy === 'on_error' || (q.hintPolicy === 'minimal' && state.errors >= 2)) showHint();
    };
    const finish = results => {
      if (state.finished) return;
      state.finished = true;
      hooks.onPraise && hooks.onPraise();
      const list = results || q.itemIds.map(id => ({ id, firstTry: state.firstTry }));
      setTimeout(() => hooks.onDone && hooks.onDone({ results: list, firstTry: list.every(r => r.firstTry), wrongPicks: state.wrongPicks.slice() }), 650);
    };
    if (q.hintPolicy === 'always') showHint();
    return { wrap, prompt, body, hint, state, hooks, speak, speakerBtn, onWrong, finish, showHint };
  }

  // ---------- 1. choice_audio (fill_blank 선택형도 공용) ----------
  function renderOptions(ui, q, options, answer) {
    const list = h('div', 'qm-options');
    // 민서(초1) 국어: 긴 뜻풀이 보기를 혼자 읽기 어려우니 보기마다 🔊 읽어 주기 (누르면 듣기만, 고르기는 아님)
    const readAloud = ui.hooks.theme === 'minseo' && q.lang === 'ko' && typeof ui.hooks.speak === 'function';
    options.forEach((opt, idx) => {
      const shown = shortMeaning(opt);
      const btn = h('button', `qm-opt${shown.length > LONG_TEXT ? ' qm-long' : ''}`, esc(shown));
      btn.type = 'button';
      if (readAloud) {
        const say = h('span', 'qm-opt-say', '🔊');
        say.setAttribute('role', 'button');
        say.setAttribute('aria-label', '보기 읽어 주기');
        say.onclick = e => { e.stopPropagation(); ui.hooks.speak(opt, 'ko'); };
        btn.prepend(say);
      }
      btn.onclick = () => {
        if (ui.state.finished) return;
        if (ui.hooks.autoRead) ui.hooks.speak?.(opt, q.reverse ? q.lang : 'ko');
        if (idx === answer) {
          btn.classList.add('qm-correct');
          list.querySelectorAll('.qm-opt').forEach(b => { if (b !== btn) b.classList.add('qm-dim'); });
          ui.finish();
        } else {
          btn.classList.add('qm-dim');
          ui.onWrong(opt);
        }
      };
      list.appendChild(btn);
    });
    ui.body.appendChild(list);
  }

  function renderChoice(container, q, hooks) {
    const ui = frame(container, q, hooks);
    if (q.audioOnly) {
      ui.prompt.appendChild(ui.speakerBtn(true));
      ui.prompt.appendChild(h('div', 'qm-meaning', '소리를 듣고 알맞은 뜻을 골라요'));
      if (!hooks.autoRead) setTimeout(ui.speak, 250);
    } else if (q.reverse) {
      ui.prompt.appendChild(h('div', 'qm-meaning', esc(q.prompt || q.item.meaning)));
      ui.prompt.appendChild(h('div', 'qm-meaning', '👆 알맞은 말을 골라요'));
    } else {
      ui.prompt.appendChild(h('div', isSentence(q) ? 'qm-sentence' : 'qm-word', esc(q.item.word)));
      ui.prompt.appendChild(ui.speakerBtn(false));
      if (q.lang === 'en' && !hooks.autoRead) setTimeout(ui.speak, 250);
    }
    ui.prompt.appendChild(ui.hint);
    renderOptions(ui, q, q.options, q.answer);
    return ui;
  }
  function isSentence(q) { return q.item && q.item.kind !== 'word'; }

  // ---------- 2. match_3x3 (터치 매칭 소거) ----------
  function renderMatch(container, q, hooks) {
    const ui = frame(container, q, hooks);
    ui.prompt.appendChild(h('div', 'qm-meaning', '🔗 같은 뜻끼리 차례로 눌러 짝을 지어요'));
    ui.prompt.appendChild(ui.hint);
    const grid = h('div', 'qm-match');
    const leftCol = h('div', 'qm-col');
    const rightCol = h('div', 'qm-col');
    grid.appendChild(leftCol);
    grid.appendChild(rightCol);
    ui.body.appendChild(grid);
    const firstTry = {};
    q.itemIds.forEach(id => { firstTry[id] = true; });
    let selected = null;
    let matched = 0;
    const cells = { left: {}, right: {} };

    const tap = (side, cellData, el) => {
      if (ui.state.finished || el.classList.contains('qm-matched')) return;
      if (q.lang === 'en' && side === 'left') hooks.speak && hooks.speak(cellData.text, 'en');
      if (!selected || selected.side === side) {
        if (selected) selected.el.classList.remove('qm-selected');
        selected = { side, id: cellData.id, el };
        el.classList.add('qm-selected');
        return;
      }
      if (selected.id === cellData.id) {
        selected.el.classList.remove('qm-selected');
        selected.el.classList.add('qm-correct', 'qm-matched');
        el.classList.add('qm-correct', 'qm-matched');
        matched++;
        selected = null;
        if (matched === q.itemIds.length) ui.finish(q.itemIds.map(id => ({ id, firstTry: firstTry[id] })));
      } else {
        const left = selected.side === 'left' ? selected.id : cellData.id;
        const right = selected.side === 'right' ? selected.id : cellData.id;
        firstTry[left] = false;
        ui.onWrong(q.left.find(x => x.id === left).text + '→' + q.right.find(x => x.id === right).text);
        const otherSide = selected.side === 'left' ? 'right' : 'left';
        guide(cells[otherSide][selected.id]);
      }
    };
    q.left.forEach(c => {
      const el = h('button', 'qm-cell', esc(c.text));
      el.type = 'button';
      el.onclick = () => tap('left', c, el);
      cells.left[c.id] = el;
      leftCol.appendChild(el);
    });
    q.right.forEach(c => {
      const shown = shortMeaning(c.text);
      const el = h('button', `qm-cell${shown.length > LONG_TEXT ? ' qm-long' : ''}`, esc(shown));
      el.type = 'button';
      el.onclick = () => tap('right', c, el);
      cells.right[c.id] = el;
      rightCol.appendChild(el);
    });
    return ui;
  }

  // ---------- 순서 블록 공용 (fill 철자 / scramble) ----------
  function renderSequence(ui, q, seq, blocks, slotEls, onComplete, isChunk) {
    let pos = 0;
    const area = h('div', 'qm-blocks');
    const blockEls = blocks.map(b => {
      const el = h('button', `qm-block${isChunk ? ' qm-chunk' : ''}`, esc(b.text));
      el.type = 'button';
      el.onclick = () => {
        if (ui.state.finished || el.classList.contains('qm-used')) return;
        if (b.text === seq[pos]) {
          el.classList.add('qm-used');
          slotEls[pos].textContent = b.text;
          slotEls[pos].classList.remove('qm-empty');
          pos++;
          if (pos === seq.length) onComplete();
        } else {
          ui.onWrong(b.text);
          const target = blockEls.find(x => !x.el.classList.contains('qm-used') && x.text === seq[pos]);
          guide(target && target.el);
        }
      };
      return { el, text: b.text };
    });
    blockEls.forEach(x => area.appendChild(x.el));
    ui.body.appendChild(area);
  }

  // ---------- 3. fill_blank ----------
  function renderFill(container, q, hooks) {
    const ui = frame(container, q, hooks);
    const fill = q.fill;
    if (fill.mode === 'choice') {
      ui.prompt.appendChild(h('div', 'qm-sentence', esc(fill.display)));
      ui.prompt.appendChild(h('div', 'qm-meaning', esc(q.item.meaning)));
      ui.prompt.appendChild(ui.speakerBtn(false));
      ui.prompt.appendChild(ui.hint);
      renderOptions(ui, q, fill.options, fill.answer);
      return ui;
    }
    ui.prompt.appendChild(h('div', 'qm-meaning', esc(q.item.meaning)));
    const slots = h('div', 'qm-slots');
    const slotEls = [];
    fill.units.forEach((u, i) => {
      if (fill.blanks.includes(i)) {
        const el = h('span', 'qm-slot qm-empty', '_');
        slotEls.push(el);
        slots.appendChild(el);
      } else {
        slots.appendChild(h('span', `qm-slot qm-fixed${u === ' ' ? ' qm-space' : ''}`, esc(u)));
      }
    });
    ui.prompt.appendChild(slots);
    ui.prompt.appendChild(ui.speakerBtn(false));
    ui.prompt.appendChild(ui.hint);
    renderSequence(ui, q, fill.seq, fill.blocks, slotEls, () => { ui.speak(); ui.finish(); }, false);
    return ui;
  }

  // ---------- 4. scramble (Lv.3 조립 + 청크) ----------
  function renderScramble(container, q, hooks) {
    const ui = frame(container, q, hooks);
    const sc = q.scramble;
    const isChunk = sc.joiner === ' ';
    ui.prompt.appendChild(h('div', 'qm-meaning', esc(q.item.meaning)));
    const slots = h('div', 'qm-slots');
    const slotEls = [];
    if (isChunk) {
      sc.seq.forEach(() => {
        const el = h('span', 'qm-slot qm-chunk qm-empty', '____');
        slotEls.push(el);
        slots.appendChild(el);
      });
    } else {
      Array.from(sc.template).forEach(ch => {
        if (ch === ' ') { slots.appendChild(h('span', 'qm-slot qm-space', '&nbsp;')); return; }
        const el = h('span', 'qm-slot qm-empty', '_');
        slotEls.push(el);
        slots.appendChild(el);
      });
    }
    ui.prompt.appendChild(slots);
    const speaker = ui.speakerBtn(false);
    if (q.hintPolicy === 'minimal') speaker.classList.add('qm-hidden');
    ui.prompt.appendChild(speaker);
    ui.prompt.appendChild(ui.hint);
    const baseWrong = ui.onWrong;
    ui.onWrong = chosen => { baseWrong(chosen); speaker.classList.remove('qm-hidden'); };
    renderSequence(ui, q, sc.seq, sc.blocks, slotEls, () => { ui.speak(); ui.finish(); }, isChunk);
    return ui;
  }

  // ---------- 5. 상단 광물 진척도 ----------
  function renderProgressHeader(container, summary, meta, theme) {
    if (!container) return;
    ensureStyle();
    const total = Math.max(1, summary.total);
    const pct = n => `${(n / total) * 100}%`;
    const stageText = meta ? `Stage ${Math.min(meta.activeStage + 1, meta.totalStages)}/${meta.totalStages}` : '';
    const allSilver = meta && meta.isTodayAllSilver ? ' · 오늘은 복습 모드 🥈' : '';
    container.innerHTML = `
      <div class="qm-wrap qm-theme-${theme === 'minseo' ? 'minseo' : 'minsu'}">
        <div class="qm-progress">
          <div class="qm-bar">
            <span class="qm-seg-diamond" style="width:${pct(summary.diamond)}"></span>
            <span class="qm-seg-silver" style="width:${pct(summary.silver)}"></span>
            <span class="qm-seg-copper" style="width:${pct(summary.copper)}"></span>
            <span class="qm-seg-stone" style="width:${pct(summary.stone)}"></span>
          </div>
          <div class="qm-legend">
            <span>💎 ${summary.diamond}</span><span>🥈 ${summary.silver}</span><span>🟫 ${summary.copper}</span><span>🪨 ${summary.stone}</span>
            <span>${esc(stageText)}${esc(allSilver)} · 총 ${summary.total}개</span>
          </div>
        </div>
      </div>`;
  }

  function render(container, q, hooks = {}) {
    switch (q.masteryType) {
      case 'match_3x3': return renderMatch(container, q, hooks);
      case 'fill_blank': return renderFill(container, q, hooks);
      case 'scramble': return renderScramble(container, q, hooks);
      default: return renderChoice(container, q, hooks);
    }
  }

  root.QuestUIRenderer = { render, renderProgressHeader };
})(typeof window !== 'undefined' ? window : globalThis);
