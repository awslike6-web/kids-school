// 가족 보드게임의 안내 음성 버튼. 로비·공부방과 같은 fairy_tts_enabled 설정을 봅니다.
(() => {
  const KEY = 'fairy_tts_enabled';
  function voiceOff() {
    try { return localStorage.getItem(KEY) === 'false'; } catch { return false; }
  }

  // 로비·공부방에서 끈 음성은 버튼에도 꺼짐으로 보입니다. 게임에서 켜면 전체 음성도 켜고, 끌 때는 이 게임만 끕니다.
  function bindToggle(node, onChange) {
    let muted = false;
    const apply = value => {
      muted = value;
      node.setAttribute('aria-pressed', String(muted));
      node.textContent = muted ? '🔇 안내 음성' : '🔊 안내 음성';
      onChange(muted);
    };
    node.addEventListener('click', () => {
      const turningOn = muted || voiceOff();
      if (turningOn) { try { localStorage.setItem(KEY, 'true'); } catch { /* 저장 차단 대응 */ } }
      apply(!turningOn);
    });
    window.addEventListener('pageshow', () => { if (voiceOff()) apply(true); });
    if (voiceOff()) apply(true);
  }

  window.FamilySound = Object.freeze({ bindToggle });
})();
