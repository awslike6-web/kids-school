// 야추와 오목의 참가자 설정·말 표시. 저장소와 게임 상태를 바꾸지 않습니다.
(() => {
  const EMOJI = ['🐰', '🐻', '🦊', '🐯', '🐸'];
  const NAMES = ['민서', '민수', '아빠', '엄마', '이모'];
  const failedSprites = new Set();
  const displayed = new WeakMap();
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
    const token = {}; displayed.set(container, token);
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
      if (displayed.get(container) !== token) return;
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


  function defaultMode(name) { return name === '민서' ? 'helper' : name === '민수' ? 'tactic' : 'classic'; }

  function createSetup({ host, count = 2, min = 2, max = 5, modes, isTaken = () => false, onChange }) {
    let drafts = [], avatars = collectAvatars();
    let ready = false;
    const copy = () => JSON.parse(JSON.stringify(drafts));
    const changed = () => { if (ready && onChange) onChange(copy()); };
    const fallback = p => {
      const preferred = fallbackFor(drafts, p), candidate = { type: 'emoji', value: preferred };
      return !isTaken(candidate, p) ? preferred : EMOJI.find(value => !isTaken({ type: 'emoji', value }, p) &&
        !drafts.some(other => other !== p && other.avatar.type === 'emoji' && other.avatar.value === value)) || preferred;
    };
    const MODES = modes;
    function setupPlayers(count) {
      if (!Number.isInteger(count) || count < min || count > max) throw Error('함께할 사람 수를 확인해 주세요.');
      drafts = Array.from({ length: count }, (_, i) => drafts[i] ||
        { id: `p${i + 1}`, name: NAMES[i], avatar: { type: 'emoji', value: EMOJI[i] }, assist: defaultMode(NAMES[i]) });
      // 인원 증가 때 이미 선택한 이모지와 겹치면 남은 말을 고릅니다.
      const used = new Set();
      drafts.forEach(p => {
        if (used.has(avatarKey(p.avatar)) || isTaken(p.avatar, p)) p.avatar = { type: 'emoji',
          value: EMOJI.find(v => !used.has(v) && !isTaken({ type: 'emoji', value: v }, p)) };
        used.add(avatarKey(p.avatar));
      });
      renderSetup(); changed();
    }

    function renderSetup() {
      host.replaceChildren();
      drafts.forEach((p, index) => {
        const card = element('fieldset', undefined, 'player-card');
        card.append(element('legend', `${index + 1}번 사람`));
        const label = element('label', '이름 (1~8자)'), input = element('input');
        input.value = p.name; input.maxLength = 16; input.autocomplete = 'off';
        input.setAttribute('aria-label', `${index + 1}번 사람 이름`);
        input.addEventListener('input', () => { p.name = input.value; changed(); });
        input.addEventListener('change', () => { p.assist = defaultMode(input.value.trim()); select.value = p.assist; changed(); });
        label.append(input); card.append(label);
        const quick = element('div', undefined, 'quick-names');
        NAMES.forEach(name => quick.append(button(name, () => {
          p.name = name; p.assist = defaultMode(name); renderSetup(); changed();
        })));
        card.append(quick);
        const options = element('div', undefined, 'avatar-options');
        options.setAttribute('role', 'group'); options.setAttribute('aria-label', `${index + 1}번 사람 말`);
        avatars.forEach(avatar => {
          const key = avatarKey(avatar), title = avatar.type === 'emoji' ? avatar.value : avatar.value.name;
          const pick = button('', () => { p.avatar = avatar; renderSetup(); changed(); }, 'avatar-option');
          pick.setAttribute('aria-label', `${title} 말`);
          pick.setAttribute('aria-pressed', String(avatarKey(p.avatar) === key));
          pick.disabled = isTaken(avatar, p) || drafts.some(other => other !== p && avatarKey(other.avatar) === key) ||
            (avatar.type === 'gallery' && failedSprites.has(avatar.value.spriteUrl));
          const image = element('span'); showAvatar(image, avatar, fallback(p), () => {
            pick.disabled = true;
            if (avatarKey(p.avatar) === key) {
              p.avatar = { type: 'emoji', value: fallback(p) };
              renderSetup(); changed();
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
        select.value = p.assist; select.addEventListener('change', () => { p.assist = select.value; changed(); });
        modeLabel.append(select); card.append(modeLabel); host.append(card);
      });
    }

    setupPlayers(count);
    ready = true;
    return Object.freeze({ setCount: setupPlayers, render: renderSetup, getPlayers: copy,
      setPlayers: players => {
        if (!Array.isArray(players) || players.length < min || players.length > max) throw Error('자리 수를 확인해 주세요.');
        drafts = JSON.parse(JSON.stringify(players)); renderSetup();
      } });
  }

  window.FamilyPlayers = Object.freeze({ avatarKey, collectAvatars, showAvatar, fallbackFor,
    playerAvatar, defaultMode, createSetup });
})();
