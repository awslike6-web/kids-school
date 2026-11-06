// kids/js/english_listen_place_timeline.js
// 🕖 [영어 10단원 장면] 하루 시간표 채우기 장면 모듈 (timeline)
// - 하루 시간표 무대(시각 칸 + 활동 칸), 활동 그림 6종 SVG, 아날로그 시계 + 숫자 SVG
// - 마지막 판 「얼리버드는 누구?」(early bird / night owl) 후보 3명 미니 시간표 생성·렌더링
// - 네임스페이스: EnglishListenPlace.registerScene('timeline', ...)

(function() {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const SLOTS = ['activity', 'time'];

  /**
   * 시계 바늘 각도 계산
   * - 수학방 window.MathPlay.timeParts(totalMinutes)가 있으면 그대로 사용
   * - 없으면 동일 공식 두 줄(분침 = 분×6°, 시침 = (시%12)×30° + 분×0.5°)로 계산
   */
  function computeClockAngles(totalMinutes) {
    if (window.MathPlay && typeof window.MathPlay.timeParts === 'function') {
      return window.MathPlay.timeParts(totalMinutes);
    }
    const total = Math.max(0, Number(totalMinutes) || 0);
    const hour = Math.floor(total / 60) % 12 || 12;
    const minute = total % 60;
    const minuteAngle = minute * 6;
    const hourAngle = (hour % 12) * 30 + minute * 0.5;
    return { hour, minute, hourAngle, minuteAngle };
  }

  function formatMinutesText(totalMinutes) {
    const total = Math.max(0, Number(totalMinutes) || 0);
    const hour = Math.floor(total / 60) % 12 || 12;
    const minute = total % 60;
    return `${hour}:${minute < 10 ? '0' + minute : minute}`;
  }

  /**
   * 활동 아이템 6종 SVG 내부 그래픽 (영어 글자 없음 — 그림만으로 행동 구분)
   */
  const ACTIVITY_GRAPHICS = {
    // 1. 일어나기 (get up): 창밖 아침 해 + 기지개 켜며 일어나는 모습
    'act-get-up': `
      <rect x="8" y="8" width="64" height="64" rx="14" fill="#fef3c7"/>
      <circle cx="56" cy="22" r="10" fill="#f59e0b"/>
      <line x1="56" y1="8" x2="56" y2="11" stroke="#f59e0b" stroke-width="2.2" stroke-linecap="round"/>
      <line x1="68" y1="22" x2="71" y2="22" stroke="#f59e0b" stroke-width="2.2" stroke-linecap="round"/>
      <line x1="65" y1="13" x2="67" y2="11" stroke="#f59e0b" stroke-width="2.2" stroke-linecap="round"/>
      <rect x="12" y="52" width="56" height="14" rx="4" fill="#93c5fd" stroke="#3b82f6" stroke-width="1.8"/>
      <rect x="15" y="46" width="16" height="8" rx="4" fill="#ffffff" stroke="#94a3b8" stroke-width="1.5"/>
      <circle cx="36" cy="34" r="9" fill="#ffdfba" stroke="#d97706" stroke-width="1.6"/>
      <path d="M 33 33 Q 36 36 39 33" stroke="#78350f" stroke-width="1.8" fill="none" stroke-linecap="round"/>
      <path d="M 26 44 C 28 39 44 39 46 44 L 46 52 L 26 52 Z" fill="#38bdf8"/>
      <path d="M 27 42 L 18 26" stroke="#ffdfba" stroke-width="4.5" stroke-linecap="round"/>
      <path d="M 45 42 L 54 26" stroke="#ffdfba" stroke-width="4.5" stroke-linecap="round"/>
    `,
    // 2. 아침 먹기 (eat breakfast): 식탁 위 따뜻한 밥/식빵 + 계란후라이 + 우유컵 + 수저
    'act-eat-breakfast': `
      <rect x="8" y="8" width="64" height="64" rx="14" fill="#ffedd5"/>
      <ellipse cx="36" cy="46" rx="22" ry="16" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
      <path d="M 22 44 C 22 35 44 35 44 44 C 44 52 22 52 22 44 Z" fill="#fef08a" stroke="#f59e0b" stroke-width="1.5"/>
      <circle cx="33" cy="44" r="5.5" fill="#f97316"/>
      <circle cx="31" cy="42" r="1.6" fill="#ffffff"/>
      <rect x="52" y="20" width="13" height="20" rx="3" fill="#e0f2fe" stroke="#38bdf8" stroke-width="1.8"/>
      <rect x="54" y="25" width="9" height="13" rx="1.5" fill="#ffffff"/>
      <line x1="14" y1="30" x2="14" y2="56" stroke="#64748b" stroke-width="2.5" stroke-linecap="round"/>
      <ellipse cx="14" cy="27" rx="3.5" ry="5" fill="#94a3b8"/>
    `,
    // 3. 운동하기 (exercise): 아령 들고 힘차게 달리기·체조하는 모습
    'act-exercise': `
      <rect x="8" y="8" width="64" height="64" rx="14" fill="#dcfce7"/>
      <circle cx="40" cy="24" r="8.5" fill="#ffdfba" stroke="#15803d" stroke-width="1.6"/>
      <path d="M 32 20 C 35 17 45 17 48 20" stroke="#ef4444" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M 33 34 L 47 34 L 45 50 L 35 50 Z" fill="#22c55e" stroke="#15803d" stroke-width="1.5"/>
      <line x1="33" y1="36" x2="20" y2="28" stroke="#15803d" stroke-width="4" stroke-linecap="round"/>
      <line x1="47" y1="36" x2="60" y2="28" stroke="#15803d" stroke-width="4" stroke-linecap="round"/>
      <rect x="15" y="22" width="4" height="12" rx="1.5" fill="#334155"/>
      <rect x="21" y="22" width="4" height="12" rx="1.5" fill="#334155"/>
      <line x1="17" y1="28" x2="23" y2="28" stroke="#334155" stroke-width="2.5"/>
      <rect x="55" y="22" width="4" height="12" rx="1.5" fill="#334155"/>
      <rect x="61" y="22" width="4" height="12" rx="1.5" fill="#334155"/>
      <line x1="57" y1="28" x2="63" y2="28" stroke="#334155" stroke-width="2.5"/>
      <line x1="36" y1="50" x2="28" y2="64" stroke="#1e293b" stroke-width="4" stroke-linecap="round"/>
      <line x1="44" y1="50" x2="52" y2="64" stroke="#1e293b" stroke-width="4" stroke-linecap="round"/>
    `,
    // 4. 피아노 치기 (play the piano): 피아노 건반(흰 건반·검은 건반)과 음표
    'act-play-piano': `
      <rect x="8" y="8" width="64" height="64" rx="14" fill="#fae8ff"/>
      <rect x="14" y="34" width="52" height="30" rx="5" fill="#ffffff" stroke="#334155" stroke-width="2.2"/>
      <line x1="24.4" y1="34" x2="24.4" y2="64" stroke="#475569" stroke-width="1.5"/>
      <line x1="34.8" y1="34" x2="34.8" y2="64" stroke="#475569" stroke-width="1.5"/>
      <line x1="45.2" y1="34" x2="45.2" y2="64" stroke="#475569" stroke-width="1.5"/>
      <line x1="55.6" y1="34" x2="55.6" y2="64" stroke="#475569" stroke-width="1.5"/>
      <rect x="21" y="34" width="6.5" height="17" rx="1.5" fill="#1e293b"/>
      <rect x="31.5" y="34" width="6.5" height="17" rx="1.5" fill="#1e293b"/>
      <rect x="42" y="34" width="6.5" height="17" rx="1.5" fill="#1e293b"/>
      <rect x="52.5" y="34" width="6.5" height="17" rx="1.5" fill="#1e293b"/>
      <circle cx="24" cy="24" r="3.5" fill="#a855f7"/>
      <line x1="27" y1="24" x2="27" y2="14" stroke="#a855f7" stroke-width="2.2"/>
      <line x1="27" y1="14" x2="33" y2="16" stroke="#a855f7" stroke-width="2.2"/>
      <circle cx="50" cy="22" r="3.5" fill="#ec4899"/>
      <line x1="53" y1="22" x2="53" y2="13" stroke="#ec4899" stroke-width="2.2"/>
    `,
    // 5. 잠자리에 들기 (go to bed): 이불 덮고 눈 감고 자는 침대 + 작은 별빛
    'act-go-to-bed': `
      <rect x="8" y="8" width="64" height="64" rx="14" fill="#e0e7ff"/>
      <path d="M 14 34 L 14 60 M 66 42 L 66 60 M 14 54 L 66 54" stroke="#78350f" stroke-width="3.5" stroke-linecap="round"/>
      <rect x="17" y="38" width="16" height="10" rx="4" fill="#ffffff" stroke="#94a3b8" stroke-width="1.5"/>
      <circle cx="26" cy="42" r="7.5" fill="#ffdfba" stroke="#d97706" stroke-width="1.4"/>
      <path d="M 23 41 Q 25 43 27 41" stroke="#475569" stroke-width="1.6" fill="none" stroke-linecap="round"/>
      <path d="M 32 40 C 42 38 56 40 63 45 L 63 54 L 32 54 Z" fill="#6366f1" stroke="#4338ca" stroke-width="1.6"/>
      <circle cx="48" cy="22" r="2.5" fill="#facc15"/>
      <circle cx="58" cy="18" r="3.2" fill="#facc15"/>
      <circle cx="38" cy="18" r="2" fill="#facc15"/>
    `,
    // 6. 책 읽기 (read books): 펼쳐진 책과 책갈피 + 독서 스탠드 불빛
    'act-read-books': `
      <rect x="8" y="8" width="64" height="64" rx="14" fill="#fef9c3"/>
      <path d="M 16 26 C 24 23 34 25 40 29 C 46 25 56 23 64 26 L 64 56 C 56 53 46 55 40 59 C 34 55 24 53 16 56 Z" fill="#ffffff" stroke="#0284c7" stroke-width="2.2"/>
      <line x1="40" y1="29" x2="40" y2="59" stroke="#0284c7" stroke-width="2"/>
      <line x1="21" y1="34" x2="35" y2="35" stroke="#94a3b8" stroke-width="2" stroke-linecap="round"/>
      <line x1="21" y1="41" x2="35" y2="42" stroke="#94a3b8" stroke-width="2" stroke-linecap="round"/>
      <line x1="21" y1="48" x2="33" y2="49" stroke="#94a3b8" stroke-width="2" stroke-linecap="round"/>
      <line x1="45" y1="35" x2="59" y2="34" stroke="#94a3b8" stroke-width="2" stroke-linecap="round"/>
      <line x1="45" y1="42" x2="59" y2="41" stroke="#94a3b8" stroke-width="2" stroke-linecap="round"/>
      <line x1="45" y1="49" x2="57" y2="48" stroke="#94a3b8" stroke-width="2" stroke-linecap="round"/>
      <path d="M 40 52 L 40 65 L 44 62 L 48 65 L 48 53 Z" fill="#ef4444"/>
    `
  };

  /**
   * 시각 카드(아날로그 시계 + 숫자 / 밤 초승달) SVG 내부 그래픽 생성
   * - 명세 §2: 시각 카드는 아날로그 시계 그림 + 숫자(6:00)를 함께 보여도 된다
   */
  function buildTimeGraphic(item) {
    if (!item || item.id === 'time-night' || typeof item.minutes !== 'number') {
      return `
        <rect x="8" y="8" width="64" height="64" rx="14" fill="#1e1b4b"/>
        <path d="M 46 20 A 16 16 0 1 0 58 46 A 13 13 0 1 1 46 20 Z" fill="#fde047"/>
        <circle cx="24" cy="24" r="2.2" fill="#fef08a"/>
        <circle cx="58" cy="24" r="1.8" fill="#fef08a"/>
        <circle cx="22" cy="48" r="1.8" fill="#fef08a"/>
      `;
    }

    const { hourAngle, minuteAngle } = computeClockAngles(item.minutes);
    const timeText = formatMinutesText(item.minutes);

    return `
      <circle cx="40" cy="32" r="24" fill="#ffffff" stroke="#2563eb" stroke-width="2.6"/>
      <line x1="40" y1="10" x2="40" y2="14" stroke="#64748b" stroke-width="2" stroke-linecap="round"/>
      <line x1="62" y1="32" x2="58" y2="32" stroke="#64748b" stroke-width="2" stroke-linecap="round"/>
      <line x1="40" y1="54" x2="40" y2="50" stroke="#64748b" stroke-width="2" stroke-linecap="round"/>
      <line x1="18" y1="32" x2="22" y2="32" stroke="#64748b" stroke-width="2" stroke-linecap="round"/>
      <!-- 분침 (길고 파란 바늘) -->
      <line x1="40" y1="32" x2="40" y2="15" stroke="#2563eb" stroke-width="2.4" stroke-linecap="round" transform="rotate(${minuteAngle} 40 32)"/>
      <!-- 시침 (짧고 굵은 빨간 바늘) -->
      <line x1="40" y1="32" x2="40" y2="20" stroke="#ef4444" stroke-width="3.2" stroke-linecap="round" transform="rotate(${hourAngle} 40 32)"/>
      <circle cx="40" cy="32" r="2.8" fill="#0f172a"/>
      <!-- 숫자 표시 배지 (영어 글자 아님) -->
      <rect x="18" y="58" width="44" height="16" rx="6" fill="#eff6ff" stroke="#93c5fd" stroke-width="1.2"/>
      <text x="40" y="69.5" text-anchor="middle" font-size="10.5" font-weight="800" fill="#1e3a8a" font-family="sans-serif">${timeText}</text>
    `;
  }

  function createItemThumbnail(item) {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 80 80');
    svg.setAttribute('width', '58');
    svg.setAttribute('height', '58');
    svg.setAttribute('class', 'item-thumb-svg');

    if (item && item.slot === 'time') {
      svg.innerHTML = buildTimeGraphic(item);
    } else {
      svg.innerHTML = ACTIVITY_GRAPHICS[item && item.id] || ACTIVITY_GRAPHICS['act-get-up'];
    }
    return svg;
  }

  function renderEmptySlotHtml(slot) {
    if (slot === 'time') {
      return `
        <div class="timeline-slot-placeholder">
          <div class="timeline-slot-icon">🕖</div>
          <div class="timeline-slot-title">언제 하나요?</div>
          <div class="timeline-slot-hint">시각 카드를 놓으세요</div>
        </div>
      `;
    }
    return `
      <div class="timeline-slot-placeholder">
        <div class="timeline-slot-icon">🏃</div>
        <div class="timeline-slot-title">무슨 일과인가요?</div>
        <div class="timeline-slot-hint">활동 그림을 놓으세요</div>
      </div>
    `;
  }

  function shuffleArray(arr) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  /**
   * 마지막 판 「얼리버드는 누구?」 후보 3명 생성
   * - early: 정답 후보 1명만 6시 기상(getUpMinutes === 360), 오답 2명은 늦잠(8:00, 8:30)
   * - night: 정답 후보 1명만 밤늦게 독서(lateNightActivity === true), 오답 2명은 일찍 취침
   */
  function buildFinaleCandidates(items, finaleQuestion) {
    const list = Array.isArray(items) ? items : [];
    const byId = {};
    list.forEach(it => { byId[it.id] = it; });

    const kind = (finaleQuestion && finaleQuestion.finaleKind === 'night') ? 'night' : 'early';

    if (kind === 'early') {
      return shuffleArray([
        {
          isAnswer: true,
          finaleKind: 'early',
          getUpMinutes: 360,
          lateNightActivity: false,
          items: [byId['act-get-up'], byId['time-600']].filter(Boolean),
          schedule: [
            { time: '6:00', minutes: 360, activityId: 'act-get-up', desc: '6:00 일어나기' },
            { time: '7:00', minutes: 420, activityId: 'act-eat-breakfast', desc: '7:00 아침 먹기' },
            { time: '9:00', minutes: 540, activityId: 'act-go-to-bed', desc: '9:00 잠자리에 들기' }
          ]
        },
        {
          isAnswer: false,
          finaleKind: 'early',
          getUpMinutes: 480,
          lateNightActivity: false,
          items: [byId['act-play-piano'], byId['time-800']].filter(Boolean),
          schedule: [
            { time: '8:00', minutes: 480, activityId: 'act-get-up', desc: '8:00 일어나기' },
            { time: '4:30', minutes: 270, activityId: 'act-play-piano', desc: '4:30 피아노 치기' },
            { time: '9:00', minutes: 540, activityId: 'act-go-to-bed', desc: '9:00 잠자리에 들기' }
          ]
        },
        {
          isAnswer: false,
          finaleKind: 'early',
          getUpMinutes: 510,
          lateNightActivity: false,
          items: [byId['act-exercise'], byId['time-750']].filter(Boolean),
          schedule: [
            { time: '8:30', minutes: 510, activityId: 'act-get-up', desc: '8:30 일어나기' },
            { time: '7:50', minutes: 470, activityId: 'act-exercise', desc: '7:50 운동하기' },
            { time: '9:00', minutes: 540, activityId: 'act-go-to-bed', desc: '9:00 잠자리에 들기' }
          ]
        }
      ]);
    }

    return shuffleArray([
      {
        isAnswer: true,
        finaleKind: 'night',
        getUpMinutes: 510,
        lateNightActivity: true,
        items: [byId['act-read-books'], byId['time-night']].filter(Boolean),
        schedule: [
          { time: '8:30', minutes: 510, activityId: 'act-get-up', desc: '8:30 일어나기' },
          { time: '10:00', minutes: 600, activityId: 'act-read-books', desc: '10:00 책 읽기' },
          { time: '밤(🌙)', minutes: null, activityId: 'act-read-books', desc: '밤늦게 책 읽기' }
        ]
      },
      {
        isAnswer: false,
        finaleKind: 'night',
        getUpMinutes: 360,
        lateNightActivity: false,
        items: [byId['act-get-up'], byId['time-600']].filter(Boolean),
        schedule: [
          { time: '6:00', minutes: 360, activityId: 'act-get-up', desc: '6:00 일어나기' },
          { time: '7:00', minutes: 420, activityId: 'act-eat-breakfast', desc: '7:00 아침 먹기' },
          { time: '8:30', minutes: 510, activityId: 'act-go-to-bed', desc: '8:30 일찍 잠자리' }
        ]
      },
      {
        isAnswer: false,
        finaleKind: 'night',
        getUpMinutes: 420,
        lateNightActivity: false,
        items: [byId['act-go-to-bed'], byId['time-900']].filter(Boolean),
        schedule: [
          { time: '7:00', minutes: 420, activityId: 'act-eat-breakfast', desc: '7:00 아침 먹기' },
          { time: '4:30', minutes: 270, activityId: 'act-play-piano', desc: '4:30 피아노 치기' },
          { time: '9:00', minutes: 540, activityId: 'act-go-to-bed', desc: '9:00 잠자리에 들기' }
        ]
      }
    ]);
  }

  const timelineScene = {
    name: 'timeline',
    slots: SLOTS,
    computeClockAngles,
    buildFinaleCandidates,

    renderStage: function(container) {
      container.innerHTML = '';
      const wrapper = document.createElement('div');
      wrapper.className = 'timeline-stage-wrapper';
      wrapper.innerHTML = `
        <div class="timeline-board-header">📅 오늘의 하루 시간표</div>
        <div class="timeline-slots-grid">
          <div id="slot-activity" class="timeline-slot-box" data-slot="activity">
            ${renderEmptySlotHtml('activity')}
          </div>
          <div id="slot-time" class="timeline-slot-box" data-slot="time">
            ${renderEmptySlotHtml('time')}
          </div>
        </div>
      `;
      container.appendChild(wrapper);
      return wrapper;
    },

    renderItem: function(item) {
      const card = document.createElement('div');
      card.className = 'dressup-item-card timeline-item-card';
      card.setAttribute('data-item-id', item.id);
      card.setAttribute('data-slot', item.slot);
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');

      const thumb = createItemThumbnail(item);
      const label = document.createElement('div');
      label.className = 'item-card-label';
      label.textContent = '';

      card.appendChild(thumb);
      card.appendChild(label);
      card._labelEl = label;

      return card;
    },

    applyItem: function(stageEl, slot, item) {
      if (!stageEl || !item) return;
      const slotKey = slot || item.slot;
      const targetSlot = stageEl.querySelector ? stageEl.querySelector('#slot-' + slotKey) : null;
      if (!targetSlot) return;

      const svgInner = slotKey === 'time'
        ? buildTimeGraphic(item)
        : (ACTIVITY_GRAPHICS[item.id] || ACTIVITY_GRAPHICS['act-get-up']);

      targetSlot.innerHTML = `
        <div class="timeline-filled-card">
          <svg viewBox="0 0 80 80" width="76" height="76" class="timeline-stage-svg">${svgInner}</svg>
          <div class="timeline-filled-label">${item.label || ''}</div>
          <div class="timeline-filled-desc">${item.desc || ''}</div>
        </div>
      `;
      if (targetSlot.classList) {
        targetSlot.classList.add('slot-filled');
        targetSlot.classList.remove('slot-applied-pop');
        void targetSlot.offsetWidth;
        targetSlot.classList.add('slot-applied-pop');
      }
    },

    reset: function(stageEl) {
      if (!stageEl || !stageEl.querySelector) return;
      SLOTS.forEach(slot => {
        const slotEl = stageEl.querySelector('#slot-' + slot);
        if (slotEl) {
          slotEl.innerHTML = renderEmptySlotHtml(slot);
          if (slotEl.classList) slotEl.classList.remove('slot-filled', 'slot-applied-pop');
        }
      });
    },

    renderFinaleStage: function(container, candidates, onSelect) {
      container.innerHTML = '';
      const finaleGrid = document.createElement('div');
      finaleGrid.className = 'dressup-finale-grid timeline-finale-grid';

      (candidates || []).forEach((cand, idx) => {
        const card = document.createElement('div');
        card.className = 'finale-person-card timeline-finale-card';
        card.setAttribute('data-candidate-idx', idx);
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');

        const rowsHtml = (cand.schedule || []).map(row => `
          <div class="mini-schedule-row">
            <span class="mini-time-chip">${row.time}</span>
            <span class="mini-act-text">${row.desc}</span>
          </div>
        `).join('');

        card.innerHTML = `
          <div class="finale-person-tag">친구 ${idx + 1}의 시간표</div>
          <div class="mini-schedule-list">${rowsHtml}</div>
        `;

        card.addEventListener('click', () => {
          if (typeof onSelect === 'function') onSelect(idx, card);
        });

        finaleGrid.appendChild(card);
      });

      container.appendChild(finaleGrid);
      return finaleGrid;
    }
  };

  if (window.EnglishListenPlace && typeof window.EnglishListenPlace.registerScene === 'function') {
    window.EnglishListenPlace.registerScene('timeline', timelineScene);
  } else {
    window._PENDING_SCENES = window._PENDING_SCENES || {};
    window._PENDING_SCENES['timeline'] = timelineScene;
  }
})();
