// 🎁 스타 드롭 & 트로피 로드 공통 보상 엔진 (starr_drop_engine.js)

(function (window) {
  'use strict';

  // -------------------------------------------------------------
  // 1. 사운드 이펙트 엔진 (Web Audio API 기반 무설치 효과음)
  // -------------------------------------------------------------
  const AudioEngine = {
    ctx: null,
    init() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    },
    playTap(pitchMultiplier = 1.0) {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      const now = this.ctx.currentTime;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320 * pitchMultiplier, now);
      osc.frequency.exponentialRampToValueAtTime(540 * pitchMultiplier, now + 0.08);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
    },
    playUpgrade(tierIndex) {
      this.init();
      if (!this.ctx) return;
      const baseFreqs = [440, 554, 659, 880, 1108]; // A4, C#5, E5, A5, C#6
      const freq = baseFreqs[Math.min(tierIndex, baseFreqs.length - 1)];

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq * 0.8, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 0.2);

      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    },
    playFanfare(tierIndex) {
      this.init();
      if (!this.ctx) return;
      const chords = [
        [523.25, 659.25, 783.99], // C Major (Rare)
        [587.33, 739.99, 880.00], // D Major (Super Rare)
        [659.25, 830.61, 987.77], // E Major (Epic)
        [783.99, 987.77, 1174.66], // G Major (Mythic)
        [1046.50, 1318.51, 1567.98, 2093.00] // C Hi Major (Legendary!)
      ];
      const targetChord = chords[Math.min(tierIndex, chords.length - 1)];
      const now = this.ctx.currentTime;

      targetChord.forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = tierIndex >= 3 ? 'sawtooth' : 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.08);

        gain.gain.setValueAtTime(0.25, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.7);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.7);
      });
    }
  };

  // -------------------------------------------------------------
  // 2. 등급(Tier) 및 보상 풀 정의
  // -------------------------------------------------------------
  const TIERS = [
    {
      id: 'RARE',
      name: '희귀 (Rare)',
      color: '#38bdf8',
      glow: 'rgba(56, 189, 248, 0.6)',
      icon: '🔵',
      upgradeChance: 0.55,
      rewards: [
        { type: 'trophy', name: '트로피 +20개', value: 20, icon: '🏆' },
        { type: 'coin', name: '골드 코인 +100', value: 100, icon: '🪙' },
        { type: 'credit', name: '다이아/하리보 1개', value: 1, icon: '🍬' }
      ]
    },
    {
      id: 'SUPER_RARE',
      name: '초희귀 (Super Rare)',
      color: '#4ade80',
      glow: 'rgba(74, 222, 128, 0.7)',
      icon: '🟢',
      upgradeChance: 0.45,
      rewards: [
        { type: 'trophy', name: '트로피 +40개', value: 40, icon: '🏆' },
        { type: 'coin', name: '골드 코인 +250', value: 250, icon: '🪙' },
        { type: 'badge', name: '초희귀 모험가 뱃지', value: 'badge_super_rare', icon: '🎖️' }
      ]
    },
    {
      id: 'EPIC',
      name: '영웅 (Epic)',
      color: '#c084fc',
      glow: 'rgba(192, 132, 252, 0.8)',
      icon: '🟣',
      upgradeChance: 0.35,
      rewards: [
        { type: 'trophy', name: '트로피 +80개', value: 80, icon: '🏆' },
        { type: 'coin', name: '골드 코인 +500', value: 500, icon: '🪙' },
        { type: 'item', name: '마이룸 전용 네온 조명', value: 'furniture_neon', icon: '💡' },
        { type: 'coupon', name: '🎮 주말 게임 보너스 15분', value: 'coupon_game_15', icon: '🎟️' }
      ]
    },
    {
      id: 'MYTHIC',
      name: '신화 (Mythic)',
      color: '#fb7185',
      glow: 'rgba(251, 113, 133, 0.85)',
      icon: '🔴',
      upgradeChance: 0.25,
      rewards: [
        { type: 'trophy', name: '트로피 +150개', value: 150, icon: '🏆' },
        { type: 'credit', name: '다이아/하리보 5개', value: 5, icon: '💎' },
        { type: 'coupon', name: '🥤 원하는 음료수/간식 뽑기권', value: 'coupon_snack', icon: '🧃' },
        { type: 'skin', name: '신화 프로필 홀로그램 테두리', value: 'skin_mythic_frame', icon: '✨' }
      ]
    },
    {
      id: 'LEGENDARY',
      name: '전설 (Legendary)',
      color: '#fbbf24',
      glow: 'rgba(251, 191, 36, 1.0)',
      icon: '🟡',
      upgradeChance: 0.0,
      rewards: [
        { type: 'trophy', name: '트로피 +300개 대폭발!', value: 300, icon: '🏆' },
        { type: 'credit', name: '다이아/하리보 10개 잭팟!', value: 10, icon: '💎' },
        { type: 'coupon', name: '👑 주말 자유 게임 시간 40분권!', value: 'coupon_game_40', icon: '👑' },
        { type: 'coupon', name: '🍕 아빠와 야식 파티권', value: 'coupon_party', icon: '🍕' }
      ]
    }
  ];

  // -------------------------------------------------------------
  // 3. 로컬 스토리지 데이터 관리
  // -------------------------------------------------------------
  const STORAGE_KEYS = {
    TROPHIES: 'pg_trophies',
    DROPS: 'pg_starr_drops',
    INVENTORY: 'pg_inventory',
    HISTORY: 'pg_drop_history'
  };

  const StarrDropEngine = {
    TIERS,
    AudioEngine,

    getTrophies() {
      const v = localStorage.getItem(STORAGE_KEYS.TROPHIES);
      return v ? parseInt(v, 10) : 120; // 기본 스타트 트로피 120
    },
    addTrophies(amount) {
      const cur = this.getTrophies();
      const updated = Math.max(0, cur + amount);
      localStorage.setItem(STORAGE_KEYS.TROPHIES, updated.toString());
      this.dispatchUpdateEvent();
      return updated;
    },
    getDropCount() {
      const v = localStorage.getItem(STORAGE_KEYS.DROPS);
      return v ? parseInt(v, 10) : 3; // 첫 진입 시 보너스 3개 지급
    },
    addDrop(count = 1) {
      const cur = this.getDropCount();
      const updated = cur + count;
      localStorage.setItem(STORAGE_KEYS.DROPS, updated.toString());
      this.dispatchUpdateEvent();
      return updated;
    },
    useDrop() {
      const cur = this.getDropCount();
      if (cur <= 0) return false;
      localStorage.setItem(STORAGE_KEYS.DROPS, (cur - 1).toString());
      this.dispatchUpdateEvent();
      return true;
    },
    addInventoryItem(item) {
      let inv = [];
      try {
        inv = JSON.parse(localStorage.getItem(STORAGE_KEYS.INVENTORY) || '[]');
      } catch (e) { inv = []; }
      inv.push({
        ...item,
        obtainedAt: new Date().toISOString()
      });
      localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(inv));
    },
    getInventory() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.INVENTORY) || '[]');
      } catch (e) { return []; }
    },
    dispatchUpdateEvent() {
      window.dispatchEvent(new CustomEvent('starr-drop-updated', {
        detail: {
          trophies: this.getTrophies(),
          drops: this.getDropCount()
        }
      }));
    },

    // -----------------------------------------------------------
    // 4. 드롭 시뮬레이션 세션 생성
    // -----------------------------------------------------------
    createDropSession() {
      if (!this.useDrop()) return null;

      let currentTierIndex = 0; // 0 = RARE
      let tapsRemaining = 4;
      let isOpened = false;

      return {
        getTier() {
          return TIERS[currentTierIndex];
        },
        getTierIndex() {
          return currentTierIndex;
        },
        getTapsRemaining() {
          return tapsRemaining;
        },
        isOpened() {
          return isOpened;
        },
        tap() {
          if (isOpened) return { isOpened: true, reward: null };

          tapsRemaining--;
          const tier = TIERS[currentTierIndex];
          const upgraded = (currentTierIndex < TIERS.length - 1) && (Math.random() < tier.upgradeChance);

          if (upgraded) {
            currentTierIndex++;
            AudioEngine.playUpgrade(currentTierIndex);
          } else {
            AudioEngine.playTap(1.0 + (currentTierIndex * 0.15));
          }

          if (tapsRemaining <= 0 || currentTierIndex === TIERS.length - 1) {
            // 마지막 탭 또는 전설 도달 시 개봉!
            isOpened = true;
            const finalTier = TIERS[currentTierIndex];
            const rewardPool = finalTier.rewards;
            const chosenReward = rewardPool[Math.floor(Math.random() * rewardPool.length)];

            AudioEngine.playFanfare(currentTierIndex);

            // 보상 적용
            if (chosenReward.type === 'trophy') {
              StarrDropEngine.addTrophies(chosenReward.value);
            } else if (chosenReward.type === 'credit') {
              if (typeof window.triggerAwardDispense === 'function') {
                window.triggerAwardDispense(chosenReward.value);
              }
            }
            StarrDropEngine.addInventoryItem(chosenReward);

            return {
              isUpgraded: upgraded,
              tier: finalTier,
              tierIndex: currentTierIndex,
              isOpened: true,
              reward: chosenReward
            };
          }

          return {
            isUpgraded: upgraded,
            tier: TIERS[currentTierIndex],
            tierIndex: currentTierIndex,
            isOpened: false,
            reward: null
          };
        }
      };
    }
  };

  window.StarrDropEngine = StarrDropEngine;

})(window);
