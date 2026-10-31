// 한 기기를 돌려 쓰는 가족 야추. 게임 기록은 이 기기에만 저장합니다.
(() => {
  const E = window.YachtEngine, KEY = 'familyYachtGame';
  const EMOJI = ['🐰', '🐻', '🦊', '🐯', '🐸'];
  const NAMES = ['민서', '민수', '아빠', '엄마', '이모'];
  const MODES = { helper: '도우미', tactic: '전술', classic: '클래식' };
  const PIPS = [[4], [0, 8], [0, 4, 8], [0, 2, 6, 8], [0, 2, 4, 6, 8], [0, 2, 3, 5, 6, 8]];
  const failedSprites = new Set();
  const $ = id => document.getElementById(id);
  let state = null, saved = null, drafts = [], avatars = [], muted = false, busy = false, pending = null;
  let animationTimer = null, activeView = 'setupView';

  function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  }

  function button(text, action, className) {
    const node = element('button', text, className);
    node.type = 'button'; node.addEventListener('click', action);
    return node;
  }

  function avatarKey(avatar) {
    return avatar.type === 'emoji' ? avatar.value : JSON.stringify([avatar.value.artId, avatar.value.charKey]);
  }

  function collectAvatars() {
    const list = EMOJI.map(value => ({ type: 'emoji', value }));
    const data = typeof DEFAULT_GALLERY_DATA !== 'undefined' ? DEFAULT_GALLERY_DATA : [];
    const seen = new Set();
    if (!Array.isArray(data) || !window.MonsterRoster?.charactersOf) return list;
    for (const item of data) {
      if (!item || typeof item.id !== 'string' || !item.id.trim()) continue;
      for (const c of window.MonsterRoster.charactersOf(item)) {
        const avatar = { type: 'gallery', value: { artId: item.id, charKey: c.key, name: c.name, spriteUrl: c.spriteUrl } };
        const key = avatarKey(avatar);
        if (seen.has(key)) continue;
        seen.add(key); list.push(avatar);
      }
    }
    return list;
  }

  function showAvatar(container, avatar, fallback = '🐰', onError) {
    container.replaceChildren();
    if (avatar.type === 'emoji') {
      container.append(element('span', avatar.value, 'avatar-emoji'));
      return;
    }
    if (failedSprites.has(avatar.value.spriteUrl)) {
      container.append(element('span', fallback, 'avatar-emoji'));
      return;
    }
    const img = element('img', undefined, 'avatar-image');
    img.alt = avatar.value.name;
    let settled = false;
    const timer = setTimeout(fail, 2500);
    function fail() {
      if (settled) return;
      settled = true; clearTimeout(timer);
      failedSprites.add(avatar.value.spriteUrl);
      img.removeAttribute('src');
      container.replaceChildren(element('span', fallback, 'avatar-emoji'));
      if (onError) onError();
    }
    img.addEventListener('error', fail, { once: true });
    img.addEventListener('load', () => { if (!settled) { settled = true; clearTimeout(timer); } }, { once: true });
    img.src = avatar.value.spriteUrl;
    container.append(img);
  }

  function fallbackFor(players, player) {
    // 성공한 그림의 자리도 예약해 두어 여러 그림이 동시에 실패해도 말이 겹치지 않습니다.
    const used = new Set(players.filter(p => p.avatar.type === 'emoji').map(p => p.avatar.value));
    for (const p of players.filter(p => p.avatar.type === 'gallery')) {
      const value = EMOJI.find(v => !used.has(v));
      if (p.id === player.id) return value;
      used.add(value);
    }
    return '🐰';
  }

  function playerAvatar(container, player, players) {
    showAvatar(container, player.avatar, fallbackFor(players, player));
  }

  function setView(id) {
    activeView = id;
    ['setupView', 'resumeView', 'gameView', 'endView'].forEach(view => { $(view).hidden = view !== id; });
  }

  function say(text, after) {
    if (muted || typeof window.speakFairyTTS !== 'function') { if (after) after(); return; }
    // 정해진 차례·야추 문장을 칭찬 녹음으로 바꾸지 않고 그대로 읽습니다.
    try { Promise.resolve(window.speakFairyTTS(text, after, { skipPreset: true })).catch(() => { if (after) after(); }); }
    catch (e) { if (after) after(); }
  }

  function stopAudio() { if (typeof window.stopFairyTTS === 'function') window.stopFairyTTS(); }

  function removeSaved() {
    try { localStorage.removeItem(KEY); return true; } catch (e) { return false; }
  }

  function persist() {
    try {
      if (E.isOver(state)) localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, JSON.stringify(state));
      $('saveStatus').textContent = '';
    } catch (e) {
      $('saveStatus').textContent = '이 기기에 저장하지 못했어요. 창을 닫으면 이어서 할 수 없어요.';
    }
  }

  function readSaved() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const s = JSON.parse(raw), ids = E.CATEGORIES.map(c => c.id), b = s?.publicBoard;
      if (s.v !== 1 || s.gameType !== 'yacht' || !Number.isSafeInteger(s.stateVersion) || s.stateVersion < 0 ||
          !Number.isInteger(s.round) || s.round < 1 || s.round > 12 || !b ||
          !Array.isArray(b.kept) || b.kept.length !== 5 || b.kept.some(v => typeof v !== 'boolean') ||
          !Number.isInteger(b.rollCount) || b.rollCount < 0 || b.rollCount > 3) throw Error();
      const clean = E.createGame(s.players);
      if (!Number.isInteger(s.turnPlayer) || s.turnPlayer < 0 || s.turnPlayer >= clean.players.length ||
          (!b.rollCount && (b.kept.some(Boolean) || b.dice.some(n => n !== 1)))) throw Error();
      E.scoreOptions(b.dice);
      const possible = E.CATEGORIES.map(() => new Set());
      // 6^5 검증은 저장 읽기에서 한 번만 수행합니다. 임의 점수도 이어하기에서 거릅니다.
      for (let n = 0; n < 7776; n++) {
        let value = n;
        const dice = Array.from({ length: 5 }, () => { const d = value % 6 + 1; value = Math.floor(value / 6); return d; });
        ids.forEach((id, i) => possible[i].add(E.scoreFor(dice, id)));
      }
      let filled = 0;
      clean.players.forEach((p, index) => {
        const scores = b.scores?.[p.id];
        if (!scores || Object.keys(scores).length !== 12) throw Error();
        let count = 0;
        ids.forEach((id, i) => {
          if (!Object.hasOwn(scores, id)) throw Error();
          if (scores[id] !== null) {
            if (!possible[i].has(scores[id])) throw Error();
            count++; filled++;
          }
        });
        const expected = s.round - 1 + (index < s.turnPlayer ? 1 : 0);
        if (count !== expected) throw Error();
      });
      if (E.isOver(s)) { removeSaved(); return null; }
      if (!s.lastAction) { if (s.stateVersion !== 0 || filled || b.rollCount) throw Error(); }
      else {
        const a = s.lastAction;
        if (!['ROLL', 'TOGGLE_KEEP', 'CHOOSE'].includes(a.type) || s.stateVersion === 0 ||
            !clean.players.some(p => p.id === a.by)) throw Error();
        if (a.type === 'CHOOSE') {
          const previous = clean.players[(s.turnPlayer + clean.players.length - 1) % clean.players.length];
          if (a.by !== previous.id || !ids.includes(a.category) || b.scores[a.by][a.category] === null || b.rollCount) throw Error();
        } else if (a.by !== clean.players[s.turnPlayer].id || !b.rollCount) throw Error();
      }
      if (s.stateVersion < filled * 2 + b.rollCount) throw Error();
      return { ...s, players: clean.players };
    } catch (e) { removeSaved(); return null; }
  }

  function defaultMode(name) { return name === '민서' ? 'helper' : name === '민수' ? 'tactic' : 'classic'; }

  function setupPlayers(count) {
    drafts = Array.from({ length: count }, (_, i) => drafts[i] ||
      { id: `p${i + 1}`, name: NAMES[i], avatar: { type: 'emoji', value: EMOJI[i] }, assist: defaultMode(NAMES[i]) });
    // 인원 증가 때 이미 선택한 이모지와 겹치면 남은 말을 고릅니다.
    const used = new Set();
    drafts.forEach(p => {
      if (used.has(avatarKey(p.avatar))) p.avatar = { type: 'emoji', value: EMOJI.find(v => !used.has(v)) };
      used.add(avatarKey(p.avatar));
    });
    renderSetup();
  }

  function renderSetup() {
    const host = $('playerSetup'); host.replaceChildren();
    drafts.forEach((p, index) => {
      const card = element('fieldset', undefined, 'player-card');
      card.append(element('legend', `${index + 1}번 사람`));
      const label = element('label', '이름 (1~8자)'), input = element('input');
      input.value = p.name; input.maxLength = 16; input.autocomplete = 'off';
      input.setAttribute('aria-label', `${index + 1}번 사람 이름`);
      input.addEventListener('input', () => { p.name = input.value; });
      input.addEventListener('change', () => { p.assist = defaultMode(input.value.trim()); select.value = p.assist; });
      label.append(input); card.append(label);
      const quick = element('div', undefined, 'quick-names');
      NAMES.forEach(name => quick.append(button(name, () => {
        p.name = name; p.assist = defaultMode(name); renderSetup();
      })));
      card.append(quick);
      const options = element('div', undefined, 'avatar-options');
      options.setAttribute('role', 'group'); options.setAttribute('aria-label', `${index + 1}번 사람 말`);
      avatars.forEach(avatar => {
        const key = avatarKey(avatar), title = avatar.type === 'emoji' ? avatar.value : avatar.value.name;
        const pick = button('', () => { p.avatar = avatar; renderSetup(); }, 'avatar-option');
        pick.setAttribute('aria-label', `${title} 말`);
        pick.setAttribute('aria-pressed', String(avatarKey(p.avatar) === key));
        pick.disabled = drafts.some(other => other !== p && avatarKey(other.avatar) === key) ||
          (avatar.type === 'gallery' && failedSprites.has(avatar.value.spriteUrl));
        const image = element('span'); showAvatar(image, avatar, fallbackFor(drafts, p), () => {
          pick.disabled = true;
          if (avatarKey(p.avatar) === key) {
            p.avatar = { type: 'emoji', value: fallbackFor(drafts, p) };
            renderSetup();
          }
        });
        pick.append(image);
        if (avatar.type === 'gallery') pick.append(element('small', title));
        options.append(pick);
      });
      card.append(element('p', '말 고르기', 'avatar-note'), options);
      const modeLabel = element('label', '도움 단계'), select = element('select');
      select.setAttribute('aria-label', `${index + 1}번 사람 도움 단계`);
      Object.entries(MODES).forEach(([value, name]) => {
        const option = element('option', name); option.value = value; select.append(option);
      });
      select.value = p.assist; select.addEventListener('change', () => { p.assist = select.value; });
      modeLabel.append(select); card.append(modeLabel); host.append(card);
    });
  }

  function finish(yacht = false) {
    stopAudio(); setView('endView');
    const ranking = E.ranking(state); $('winners').replaceChildren(); $('rankings').replaceChildren();
    ranking.forEach(row => {
      if (row.rank === 1) {
        const winner = element('div'), avatar = element('span'); playerAvatar(avatar, row.player, state.players);
        winner.append(avatar, element('strong', `🏆 ${row.player.name} · ${row.total}점`)); $('winners').append(winner);
      }
      const line = element('li');
      line.append(element('span', `${row.rank}등 · ${row.player.name}`), element('strong', `${row.total}점`));
      $('rankings').append(line);
    });
    $('endTitle').focus();
    const reward = () => { if (!muted && activeView === 'endView' && typeof window.fairyReward === 'function') window.fairyReward(); };
    if (yacht) say('야추! 대단해요!', reward);
    else reward();
  }

  function renderDice() {
    $('dice').replaceChildren();
    state.publicBoard.dice.forEach((value, index) => {
      const kept = state.publicBoard.kept[index];
      const die = button('', () => {
        if (busy) return;
        const next = E.toggleKeep(state, index);
        if (next !== state) { state = next; persist(); renderGame(); }
      }, 'die');
      die.disabled = busy || !state.publicBoard.rollCount;
      die.setAttribute('aria-label', `${index + 1}번 주사위 ${value}${kept ? ', 고정' : ', 고정 안 됨'}`);
      die.setAttribute('aria-pressed', String(kept));
      const pips = element('span', undefined, 'pips'); pips.setAttribute('aria-hidden', 'true');
      PIPS[value - 1].forEach(position => {
        const pip = element('span', undefined, 'pip');
        pip.style.gridRow = Math.floor(position / 3) + 1; pip.style.gridColumn = position % 3 + 1;
        pips.append(pip);
      });
      die.append(pips, element('span', String(value), 'die-value'), element('span', kept ? '고정' : '', 'die-kept'));
      $('dice').append(die);
    });
  }

  function summaryRow(body, title, getText) {
    const row = element('tr', undefined, 'totals-row'), th = element('th', title); th.scope = 'row'; row.append(th);
    state.players.forEach(p => {
      const cell = element('td'); getText(cell, E.totals(state.publicBoard.scores[p.id])); row.append(cell);
    });
    body.append(row);
  }

  function renderTable(player) {
    const table = $('scoreTable');
    table.querySelectorAll('thead, tbody').forEach(node => node.remove());
    const head = element('thead'), row = element('tr'), corner = element('th', '점수 칸');
    corner.scope = 'col'; row.append(corner);
    state.players.forEach(p => {
      const th = element('th', undefined, p.id === player.id ? 'current-column' : ''); th.scope = 'col';
      const avatar = element('span'); playerAvatar(avatar, p, state.players);
      th.append(avatar, element('span', p.name, 'player-name')); row.append(th);
    });
    head.append(row); table.append(head);
    const body = element('tbody'), help = E.hints(state, player.assist);
    E.CATEGORIES.forEach((category, i) => {
      const tr = element('tr'), th = element('th', category.name); th.scope = 'row'; th.title = category.description; tr.append(th);
      state.players.forEach(p => {
        const score = state.publicBoard.scores[p.id][category.id], td = element('td');
        if (score !== null) td.textContent = String(score);
        else if (p.id !== player.id) td.textContent = '—';
        else {
          const preview = help.previews?.[category.id];
          const pick = button(preview === undefined ? '기록' : String(preview), () => askScore(category),
            `score-choice${preview === undefined ? '' : preview > 0 ? ' positive' : ' zero'}`);
          pick.dataset.category = category.id; pick.disabled = busy || !state.publicBoard.rollCount;
          pick.setAttribute('aria-label', `${category.name}${preview === undefined ? '' : ` ${preview}점`} 기록`);
          if (help.recommendations?.includes(category.id)) pick.append(element('small', '⚡ 추천', 'recommendation'));
          td.className = 'current-column'; td.append(pick);
        }
        tr.append(td);
      });
      body.append(tr);
      if (i === 5) {
        summaryRow(body, '1~6 소계', (cell, t) => { cell.textContent = String(t.upper); });
        summaryRow(body, '보너스', (cell, t) => {
          cell.append(element('span', `+${t.bonus}`));
          if (!t.bonus) cell.append(element('small', `${63 - t.upper}점 남음`, 'bonus-note'));
        });
      }
    });
    summaryRow(body, '합계', (cell, t) => { cell.textContent = String(t.total); }); table.append(body);
  }

  function renderGame() {
    setView('gameView');
    const player = state.players[state.turnPlayer], count = state.publicBoard.rollCount;
    $('turnBanner').textContent = `🎲 ${player.name} 차례! (굴리기 ${count}/3)`;
    $('roundBanner').textContent = `${state.round} / 12 라운드 · ${MODES[player.assist]}`;
    playerAvatar($('turnAvatar'), player, state.players);
    renderDice(); renderTable(player);
    $('rollDice').disabled = busy || count >= 3;
    $('rollDice').textContent = count >= 3 ? '빈 칸에 점수를 적어요' : `🎲 ${count ? '다시 ' : ''}굴리기`;
    $('keepHint').textContent = player.assist === 'helper' ? '주사위를 눌러 고정해요' : '남길 주사위를 눌러 고정할 수 있어요';
    $('turnHelp').textContent = !count ? '먼저 주사위를 굴려 주세요.' : count >= 3 ?
      '세 번 굴렸어요. 빈 칸 하나에 점수를 적어 주세요.' : '더 굴리거나, 빈 칸 하나에 점수를 적어 주세요.';
  }

  function askScore(category) {
    if (busy || !state.publicBoard.rollCount || pending) return;
    const score = E.scoreFor(state.publicBoard.dice, category.id);
    if (score === 0) {
      pending = { category: category.id, version: state.stateVersion };
      $('zeroCategory').textContent = `${category.name} 칸에 0점을 적어요. 다른 빈 칸도 살펴볼 수 있어요.`;
      $('zeroDialog').showModal(); $('cancelZero').focus();
    } else commitScore(category.id);
  }

  function commitScore(category) {
    const score = E.scoreFor(state.publicBoard.dice, category), next = E.choose(state, category);
    if (next === state) return;
    state = next; persist();
    if (E.isOver(state)) { finish(category === 'yacht' && score === 50); return; }
    renderGame(); $('turnBanner').focus(); stopAudio();
    const announcement = `${state.players[state.turnPlayer].name} 차례예요!`;
    say(category === 'yacht' && score === 50 ? `야추! 대단해요! ${announcement}` : announcement);
  }

  function start(players) {
    try { state = E.createGame(players); }
    catch (e) { $('setupError').textContent = e.message; return; }
    saved = null; busy = false; pending = null; stopAudio(); persist(); renderGame(); $('turnBanner').focus();
    say(`${state.players[state.turnPlayer].name} 차례예요!`);
  }

  function boot() {
    avatars = collectAvatars(); setupPlayers(2); saved = readSaved();
    if (saved) {
      setView('resumeView');
      $('resumeSummary').textContent = `${saved.players.map(p => p.name).join(' · ')} · ${saved.round}라운드`;
    }
    $('playerCount').addEventListener('change', () => setupPlayers(Number($('playerCount').value)));
    $('startGame').addEventListener('click', () => { $('setupError').textContent = ''; start(drafts); });
    $('newGame').addEventListener('click', () => { removeSaved(); saved = null; setView('setupView'); });
    $('resumeGame').addEventListener('click', () => {
      state = saved; saved = null; renderGame(); $('turnBanner').focus(); say(`${state.players[state.turnPlayer].name} 차례예요!`);
    });
    $('rollDice').addEventListener('click', () => {
      if (busy) return;
      const next = E.roll(state); if (next === state) return;
      state = next; busy = true; persist(); renderGame();
      $('dice').classList.add('rolling');
      animationTimer = setTimeout(() => {
        busy = false; animationTimer = null; $('dice').classList.remove('rolling'); renderGame();
        if (state.publicBoard.rollCount < 3) $('rollDice').focus();
        else $('scoreTable').querySelector('.score-choice:not(:disabled)')?.focus();
      }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 260);
    });
    $('zeroDialog').addEventListener('close', () => { pending = null; });
    $('cancelZero').addEventListener('click', () => { pending = null; $('zeroDialog').close(); });
    $('confirmZero').addEventListener('click', () => {
      const choice = pending; pending = null; $('zeroDialog').close();
      if (choice && choice.version === state.stateVersion) commitScore(choice.category);
    });
    $('playAgain').addEventListener('click', () => start(state.players));
    $('backToSetup').addEventListener('click', () => { stopAudio(); state = null; setView('setupView'); renderSetup(); });
    $('soundToggle').addEventListener('click', () => {
      muted = !muted; $('soundToggle').setAttribute('aria-pressed', String(muted));
      $('soundToggle').textContent = muted ? '🔇 안내 음성' : '🔊 안내 음성';
      if (muted) stopAudio();
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden) stopAudio(); });
    window.addEventListener('pagehide', () => { clearTimeout(animationTimer); stopAudio(); });
    window.addEventListener('pageshow', () => {
      if (busy && activeView === 'gameView') { busy = false; renderGame(); }
    });
  }

  window.YachtUI = Object.freeze({ boot });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
