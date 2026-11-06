// kids/js/english_listen_place_dressup.js
// 👗 [영어 8단원 장면] 친구 옷 입히기 장면 모듈 (dressup)
// - 코드로 그리는 인물 SVG (남자/여자, 머리·눈·모자·안경·상의·하의 레이어)
// - 외부 이미지 없이 독립 동작, 폰 375px 반응형 최적화
// - 네임스페이스: EnglishListenPlace.registerScene('dressup', ...)

(function() {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const SLOTS = ['hair', 'eyes', 'head', 'glasses', 'top', 'bottom'];

  const SKIN_COLOR = '#ffdfba';
  const SKIN_SHADOW = '#f3c99f';
  const BODY_BASE = '#94a3b8';

  /**
   * 기본 인물 베이스 SVG 생성
   */
  function createPersonSvg(who) {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 240 330');
    svg.setAttribute('class', 'dressup-person-svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');

    svg.innerHTML = `
      <defs>
        <filter id="softShadow" x="-10%" y="-10%" width="130%" height="130%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" flood-opacity="0.15"/>
        </filter>
        <radialGradient id="blushGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#ff7b90" stop-opacity="0.45"/>
          <stop offset="100%" stop-color="#ff7b90" stop-opacity="0"/>
        </radialGradient>
      </defs>

      <!-- 발판 / 그림자 -->
      <ellipse cx="120" cy="316" rx="68" ry="10" fill="rgba(0,0,0,0.18)" />

      <!-- 신발 & 다리 -->
      <g id="layer-legs">
        <rect x="94" y="220" width="18" height="74" rx="9" fill="${SKIN_COLOR}" stroke="${SKIN_SHADOW}" stroke-width="2"/>
        <rect x="128" y="220" width="18" height="74" rx="9" fill="${SKIN_COLOR}" stroke="${SKIN_SHADOW}" stroke-width="2"/>
        <path d="M 88 288 C 88 284 100 282 112 284 C 116 288 116 298 114 300 C 104 302 88 302 88 288 Z" fill="#475569"/>
        <path d="M 152 288 C 152 284 140 282 128 284 C 124 288 124 298 126 300 C 136 302 152 302 152 288 Z" fill="#475569"/>
      </g>

      <!-- [동적] 하의 슬롯 (치마 / 바지) -->
      <g id="slot-bottom">
        <rect x="90" y="196" width="60" height="34" rx="6" fill="${BODY_BASE}" stroke="#64748b" stroke-width="2"/>
      </g>

      <!-- 몸통 기본 이너웨어 -->
      <g id="base-torso">
        <path d="M 84 126 C 84 116 156 116 156 126 L 152 200 C 152 204 88 204 88 200 Z" fill="${BODY_BASE}" stroke="#64748b" stroke-width="2"/>
      </g>

      <!-- [동적] 상의 슬롯 (티셔츠 / 셔츠) -->
      <g id="slot-top"></g>

      <!-- 팔 & 손 -->
      <g id="base-arms">
        <path d="M 84 128 C 70 148 64 176 68 196 C 72 200 80 198 82 192 C 80 176 84 154 92 136 Z" fill="${SKIN_COLOR}" stroke="${SKIN_SHADOW}" stroke-width="2"/>
        <circle cx="70" cy="200" r="8" fill="${SKIN_COLOR}"/>
        <path d="M 156 128 C 170 148 176 176 172 196 C 168 200 160 198 158 192 C 160 176 156 154 148 136 Z" fill="${SKIN_COLOR}" stroke="${SKIN_SHADOW}" stroke-width="2"/>
        <circle cx="170" cy="200" r="8" fill="${SKIN_COLOR}"/>
      </g>

      <!-- 목 -->
      <rect x="110" y="104" width="20" height="24" rx="4" fill="${SKIN_COLOR}" stroke="${SKIN_SHADOW}" stroke-width="1.5"/>

      <!-- 얼굴 본체 -->
      <g id="base-head" filter="url(#softShadow)">
        <ellipse cx="120" cy="74" rx="42" ry="46" fill="${SKIN_COLOR}" stroke="${SKIN_SHADOW}" stroke-width="2"/>
        <ellipse cx="78" cy="76" rx="6" ry="10" fill="${SKIN_COLOR}"/>
        <ellipse cx="162" cy="76" rx="6" ry="10" fill="${SKIN_COLOR}"/>
        <circle cx="96" cy="86" r="10" fill="url(#blushGrad)"/>
        <circle cx="144" cy="86" r="10" fill="url(#blushGrad)"/>
        <path d="M 120 78 L 118 83 L 122 83" stroke="#b45309" stroke-width="2" stroke-linecap="round" fill="none"/>
        <path d="M 112 94 Q 120 102 128 94" stroke="#e11d48" stroke-width="2.5" stroke-linecap="round" fill="none"/>
      </g>

      <!-- [동적] 눈 슬롯 (eyes) -->
      <g id="slot-eyes">
        <circle cx="102" cy="72" r="5" fill="#1e293b"/>
        <circle cx="138" cy="72" r="5" fill="#1e293b"/>
        <circle cx="104" cy="70" r="1.8" fill="#ffffff"/>
        <circle cx="140" cy="70" r="1.8" fill="#ffffff"/>
        <path d="M 94 62 Q 102 59 110 63" stroke="#78350f" stroke-width="2.5" stroke-linecap="round" fill="none"/>
        <path d="M 130 63 Q 138 59 146 62" stroke="#78350f" stroke-width="2.5" stroke-linecap="round" fill="none"/>
      </g>

      <!-- [동적] 안경 슬롯 (glasses) -->
      <g id="slot-glasses"></g>

      <!-- [동적] 머리 슬롯 (hair) -->
      <g id="slot-hair">
        ${who === 'she'
          ? '<path d="M 84 54 C 96 32 144 32 156 54 C 144 48 96 48 84 54 Z" fill="#a16207"/>'
          : '<path d="M 82 54 C 96 34 144 34 158 54 C 142 44 98 44 82 54 Z" fill="#78350f"/>'}
      </g>

      <!-- [동적] 모자 슬롯 (head) -->
      <g id="slot-head"></g>
    `;

    return svg;
  }

  /**
   * 아이템 ID에 따른 본 무대 SVG 그래픽 정의
   */
  const ITEM_GRAPHICS = {
    // 1. 헤어 (4종: 좌우 대칭 cx=120 기준, 눈 cy=72·눈썹 y=62를 가리지 않게 배치)
    'hair-long-straight': `
      <path d="M 76 62 C 76 26 164 26 164 62 L 168 186 C 160 190 152 184 152 150 L 152 60 C 152 50 138 48 120 48 C 102 48 88 50 88 60 L 88 150 C 88 184 80 190 72 186 Z" fill="#92400e"/>
      <path d="M 82 52 C 94 34 146 34 158 52 L 152 54 L 146 46 L 142 54 L 128 54 L 120 44 L 112 54 L 98 54 L 94 46 L 88 54 Z" fill="#b45309"/>
      <line x1="80" y1="74" x2="78" y2="176" stroke="#b45309" stroke-width="2"/>
      <line x1="160" y1="74" x2="162" y2="176" stroke="#b45309" stroke-width="2"/>
    `,
    'hair-long-curly': `
      <path d="M 74 64 C 70 26 170 26 166 64 C 176 90 170 116 174 142 C 176 162 164 178 166 194 C 158 196 150 184 152 162 L 152 60 C 152 50 138 48 120 48 C 102 48 88 50 88 60 L 88 162 C 90 184 82 196 74 194 C 76 178 64 162 66 142 C 70 116 64 90 74 64 Z" fill="#78350f"/>
      <circle cx="70" cy="112" r="12" fill="#78350f"/>
      <circle cx="170" cy="112" r="12" fill="#78350f"/>
      <circle cx="68" cy="152" r="13" fill="#78350f"/>
      <circle cx="172" cy="152" r="13" fill="#78350f"/>
      <circle cx="74" cy="186" r="11" fill="#78350f"/>
      <circle cx="166" cy="186" r="11" fill="#78350f"/>
    `,
    'hair-short-straight': `
      <!-- 짧은 생머리: 정중앙 대칭(cx=120), 앞머리는 눈썹(y=62) 위 y=52에서 반듯하게 끝남 -->
      <path d="M 76 62 C 76 26 164 26 164 62 L 162 76 L 155 72 L 154 54 L 86 54 L 85 72 L 78 76 Z" fill="#451a03"/>
      <path d="M 82 54 C 86 34 154 34 158 54 L 146 54 L 142 46 L 138 54 L 124 54 L 120 45 L 116 54 L 102 54 L 98 46 L 94 54 Z" fill="#78350f"/>
      <line x1="96" y1="34" x2="94" y2="52" stroke="#92400e" stroke-width="2"/>
      <line x1="112" y1="30" x2="111" y2="52" stroke="#92400e" stroke-width="2"/>
      <line x1="128" y1="30" x2="129" y2="52" stroke="#92400e" stroke-width="2"/>
      <line x1="144" y1="34" x2="146" y2="52" stroke="#92400e" stroke-width="2"/>
    `,
    'hair-short-curly': `
      <!-- 짧은 곱슬머리: 풍성한 구름 컬, 눈썹(y=62) 위로 볼록볼록 대칭 배치 -->
      <circle cx="84" cy="48" r="12" fill="#581c87"/>
      <circle cx="100" cy="36" r="14" fill="#581c87"/>
      <circle cx="120" cy="32" r="15" fill="#6b21a8"/>
      <circle cx="140" cy="36" r="14" fill="#581c87"/>
      <circle cx="156" cy="48" r="12" fill="#581c87"/>
      <circle cx="77" cy="62" r="9" fill="#581c87"/>
      <circle cx="163" cy="62" r="9" fill="#581c87"/>
      <path d="M 92 44 Q 98 38 104 44" stroke="#a855f7" stroke-width="2" fill="none" stroke-linecap="round"/>
      <path d="M 114 40 Q 120 34 126 40" stroke="#a855f7" stroke-width="2" fill="none" stroke-linecap="round"/>
      <path d="M 136 44 Q 142 38 148 44" stroke="#a855f7" stroke-width="2" fill="none" stroke-linecap="round"/>
    `,

    // 2. 눈 (4종)
    'eyes-blue': `
      <circle cx="102" cy="72" r="6" fill="#2563eb"/>
      <circle cx="138" cy="72" r="6" fill="#2563eb"/>
      <circle cx="102" cy="72" r="3" fill="#0f172a"/>
      <circle cx="138" cy="72" r="3" fill="#0f172a"/>
      <circle cx="104" cy="70" r="1.8" fill="#ffffff"/>
      <circle cx="140" cy="70" r="1.8" fill="#ffffff"/>
      <path d="M 94 62 Q 102 59 110 63" stroke="#78350f" stroke-width="2.5" stroke-linecap="round" fill="none"/>
      <path d="M 130 63 Q 138 59 146 62" stroke="#78350f" stroke-width="2.5" stroke-linecap="round" fill="none"/>
    `,
    'eyes-green': `
      <circle cx="102" cy="72" r="6" fill="#10b981"/>
      <circle cx="138" cy="72" r="6" fill="#10b981"/>
      <circle cx="102" cy="72" r="3" fill="#0f172a"/>
      <circle cx="138" cy="72" r="3" fill="#0f172a"/>
      <circle cx="104" cy="70" r="1.8" fill="#ffffff"/>
      <circle cx="140" cy="70" r="1.8" fill="#ffffff"/>
      <path d="M 94 62 Q 102 59 110 63" stroke="#78350f" stroke-width="2.5" stroke-linecap="round" fill="none"/>
      <path d="M 130 63 Q 138 59 146 62" stroke="#78350f" stroke-width="2.5" stroke-linecap="round" fill="none"/>
    `,
    'eyes-brown': `
      <circle cx="102" cy="72" r="6" fill="#854d0e"/>
      <circle cx="138" cy="72" r="6" fill="#854d0e"/>
      <circle cx="102" cy="72" r="3" fill="#0f172a"/>
      <circle cx="138" cy="72" r="3" fill="#0f172a"/>
      <circle cx="104" cy="70" r="1.8" fill="#ffffff"/>
      <circle cx="140" cy="70" r="1.8" fill="#ffffff"/>
      <path d="M 94 62 Q 102 59 110 63" stroke="#78350f" stroke-width="2.5" stroke-linecap="round" fill="none"/>
      <path d="M 130 63 Q 138 59 146 62" stroke="#78350f" stroke-width="2.5" stroke-linecap="round" fill="none"/>
    `,
    'eyes-black': `
      <circle cx="102" cy="72" r="6" fill="#1e293b"/>
      <circle cx="138" cy="72" r="6" fill="#1e293b"/>
      <circle cx="102" cy="72" r="3" fill="#020617"/>
      <circle cx="138" cy="72" r="3" fill="#020617"/>
      <circle cx="104" cy="70" r="1.8" fill="#ffffff"/>
      <circle cx="140" cy="70" r="1.8" fill="#ffffff"/>
      <path d="M 94 62 Q 102 59 110 63" stroke="#78350f" stroke-width="2.5" stroke-linecap="round" fill="none"/>
      <path d="M 130 63 Q 138 59 146 62" stroke="#78350f" stroke-width="2.5" stroke-linecap="round" fill="none"/>
    `,

    // 3. 모자 (head)
    'cap-red': `
      <path d="M 76 54 C 76 24 164 24 164 54 Z" fill="#ef4444" stroke="#b91c1c" stroke-width="2"/>
      <path d="M 70 54 C 70 50 170 50 170 54 C 182 60 176 66 152 62 L 74 62 C 64 62 62 56 70 54 Z" fill="#dc2626"/>
      <circle cx="120" cy="25" r="4" fill="#ffffff"/>
    `,
    'cap-blue': `
      <path d="M 76 54 C 76 24 164 24 164 54 Z" fill="#3b82f6" stroke="#1d4ed8" stroke-width="2"/>
      <path d="M 70 54 C 70 50 170 50 170 54 C 182 60 176 66 152 62 L 74 62 C 64 62 62 56 70 54 Z" fill="#2563eb"/>
      <circle cx="120" cy="25" r="4" fill="#ffffff"/>
    `,
    'cap-yellow': `
      <path d="M 76 54 C 76 24 164 24 164 54 Z" fill="#eab308" stroke="#ca8a04" stroke-width="2"/>
      <path d="M 70 54 C 70 50 170 50 170 54 C 182 60 176 66 152 62 L 74 62 C 64 62 62 56 70 54 Z" fill="#ca8a04"/>
      <circle cx="120" cy="25" r="4" fill="#ffffff"/>
    `,
    'cap-green': `
      <path d="M 76 54 C 76 24 164 24 164 54 Z" fill="#22c55e" stroke="#15803d" stroke-width="2"/>
      <path d="M 70 54 C 70 50 170 50 170 54 C 182 60 176 66 152 62 L 74 62 C 64 62 62 56 70 54 Z" fill="#16a34a"/>
      <circle cx="120" cy="25" r="4" fill="#ffffff"/>
    `,

    // 4. 안경 (glasses)
    'glasses': `
      <rect x="90" y="62" width="24" height="20" rx="4" fill="rgba(255,255,255,0.3)" stroke="#334155" stroke-width="3"/>
      <rect x="126" y="62" width="24" height="20" rx="4" fill="rgba(255,255,255,0.3)" stroke="#334155" stroke-width="3"/>
      <line x1="114" y1="70" x2="126" y2="70" stroke="#334155" stroke-width="3"/>
      <line x1="78" y1="70" x2="90" y2="70" stroke="#334155" stroke-width="2.5"/>
      <line x1="150" y1="70" x2="162" y2="70" stroke="#334155" stroke-width="2.5"/>
    `,

    // 5. 상의 (top)
    'shirt-yellow': `
      <path d="M 82 124 C 82 116 158 116 158 124 L 154 200 L 86 200 Z" fill="#facc15" stroke="#ca8a04" stroke-width="2"/>
      <path d="M 83 126 L 68 152 L 80 156 L 91 138 Z" fill="#facc15" stroke="#ca8a04" stroke-width="1.5"/>
      <path d="M 157 126 L 172 152 L 160 156 L 149 138 Z" fill="#facc15" stroke="#ca8a04" stroke-width="1.5"/>
      <path d="M 108 124 C 114 134 126 134 132 124" stroke="#ca8a04" stroke-width="2" fill="none"/>
    `,
    'shirt-white': `
      <path d="M 82 124 C 82 116 158 116 158 124 L 154 200 L 86 200 Z" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2"/>
      <path d="M 83 126 L 68 152 L 80 156 L 91 138 Z" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5"/>
      <path d="M 157 126 L 172 152 L 160 156 L 149 138 Z" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5"/>
      <polygon points="120,124 108,136 120,140" fill="#e2e8f0"/>
      <polygon points="120,124 132,136 120,140" fill="#e2e8f0"/>
      <circle cx="120" cy="156" r="2" fill="#64748b"/>
      <circle cx="120" cy="174" r="2" fill="#64748b"/>
    `,
    'shirt-blue': `
      <path d="M 82 124 C 82 116 158 116 158 124 L 154 200 L 86 200 Z" fill="#3b82f6" stroke="#1d4ed8" stroke-width="2"/>
      <path d="M 83 126 L 68 152 L 80 156 L 91 138 Z" fill="#3b82f6" stroke="#1d4ed8" stroke-width="1.5"/>
      <path d="M 157 126 L 172 152 L 160 156 L 149 138 Z" fill="#3b82f6" stroke="#1d4ed8" stroke-width="1.5"/>
      <path d="M 108 124 C 114 134 126 134 132 124" stroke="#1d4ed8" stroke-width="2" fill="none"/>
    `,
    'shirt-green': `
      <path d="M 82 124 C 82 116 158 116 158 124 L 154 200 L 86 200 Z" fill="#22c55e" stroke="#15803d" stroke-width="2"/>
      <path d="M 83 126 L 68 152 L 80 156 L 91 138 Z" fill="#22c55e" stroke="#15803d" stroke-width="1.5"/>
      <path d="M 157 126 L 172 152 L 160 156 L 149 138 Z" fill="#22c55e" stroke="#15803d" stroke-width="1.5"/>
      <path d="M 108 124 C 114 134 126 134 132 124" stroke="#15803d" stroke-width="2" fill="none"/>
    `,

    // 6. 하의 (bottom)
    'skirt-black': `
      <path d="M 86 196 L 154 196 L 166 248 L 74 248 Z" fill="#1e293b" stroke="#0f172a" stroke-width="2"/>
      <line x1="102" y1="196" x2="96" y2="248" stroke="#334155" stroke-width="1.5"/>
      <line x1="120" y1="196" x2="120" y2="248" stroke="#334155" stroke-width="1.5"/>
      <line x1="138" y1="196" x2="144" y2="248" stroke="#334155" stroke-width="1.5"/>
    `,
    'skirt-red': `
      <path d="M 86 196 L 154 196 L 166 248 L 74 248 Z" fill="#ef4444" stroke="#b91c1c" stroke-width="2"/>
      <line x1="102" y1="196" x2="96" y2="248" stroke="#fca5a5" stroke-width="1.5"/>
      <line x1="120" y1="196" x2="120" y2="248" stroke="#fca5a5" stroke-width="1.5"/>
      <line x1="138" y1="196" x2="144" y2="248" stroke="#fca5a5" stroke-width="1.5"/>
    `,
    'pants-blue': `
      <path d="M 86 196 L 154 196 L 152 284 L 126 284 L 120 220 L 114 284 L 88 284 Z" fill="#2563eb" stroke="#1d4ed8" stroke-width="2"/>
      <line x1="120" y1="196" x2="120" y2="220" stroke="#1d4ed8" stroke-width="2"/>
    `,
    'pants-black': `
      <path d="M 86 196 L 154 196 L 152 284 L 126 284 L 120 220 L 114 284 L 88 284 Z" fill="#334155" stroke="#1e293b" stroke-width="2"/>
      <line x1="120" y1="196" x2="120" y2="220" stroke="#1e293b" stroke-width="2"/>
    `
  };

  /**
   * 미니 아이템 썸네일 SVG 생성 (트레이 받침대용)
   * - 글자 없이 그림만으로도 4종 머리(긴/짧은 × 생머리/곱슬)와 물건이 한눈에 구분되게 그림
   */
  function createItemThumbnail(item) {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 80 80');
    svg.setAttribute('width', '56');
    svg.setAttribute('height', '56');
    svg.setAttribute('class', 'item-thumb-svg');

    let inner = '';
    const sid = item.id;
    if (sid === 'hair-short-straight') {
      // 짧은 생머리: 반듯한 직선 일자 앞머리와 수직 직선 결
      inner = `
        <ellipse cx="40" cy="48" rx="16" ry="18" fill="#ffdfba" stroke="#f3c99f" stroke-width="1.5"/>
        <path d="M 21 44 C 21 20 59 20 59 44 L 58 50 L 54 46 L 54 38 L 26 38 L 26 46 L 22 50 Z" fill="#451a03"/>
        <path d="M 24 38 C 26 24 54 24 56 38 Z" fill="#78350f"/>
        <line x1="31" y1="24" x2="31" y2="38" stroke="#b45309" stroke-width="1.8"/>
        <line x1="37" y1="22" x2="37" y2="38" stroke="#b45309" stroke-width="1.8"/>
        <line x1="43" y1="22" x2="43" y2="38" stroke="#b45309" stroke-width="1.8"/>
        <line x1="49" y1="24" x2="49" y2="38" stroke="#b45309" stroke-width="1.8"/>
      `;
    } else if (sid === 'hair-short-curly') {
      // 짧은 곱슬머리: 구름처럼 볼록볼록한 방울 컬과 소용돌이 무늬
      inner = `
        <ellipse cx="40" cy="50" rx="16" ry="17" fill="#ffdfba" stroke="#f3c99f" stroke-width="1.5"/>
        <circle cx="24" cy="36" r="8" fill="#581c87"/>
        <circle cx="32" cy="27" r="9" fill="#6b21a8"/>
        <circle cx="40" cy="24" r="10" fill="#581c87"/>
        <circle cx="48" cy="27" r="9" fill="#6b21a8"/>
        <circle cx="56" cy="36" r="8" fill="#581c87"/>
        <circle cx="21" cy="44" r="6" fill="#6b21a8"/>
        <circle cx="59" cy="44" r="6" fill="#6b21a8"/>
        <path d="M 29 31 Q 33 26 37 31" stroke="#d8b4fe" stroke-width="1.8" fill="none" stroke-linecap="round"/>
        <path d="M 37 27 Q 40 22 43 27" stroke="#d8b4fe" stroke-width="1.8" fill="none" stroke-linecap="round"/>
        <path d="M 43 31 Q 47 26 51 31" stroke="#d8b4fe" stroke-width="1.8" fill="none" stroke-linecap="round"/>
      `;
    } else if (sid === 'hair-long-straight') {
      // 긴 생머리: 어깨 아래까지 일자로 곧게 뻗어 내려오는 긴 직선 생머리
      inner = `
        <ellipse cx="40" cy="40" rx="14" ry="15" fill="#ffdfba" stroke="#f3c99f" stroke-width="1.5"/>
        <path d="M 22 36 C 22 14 58 14 58 36 L 60 72 L 51 72 L 51 34 C 51 28 29 28 29 34 L 29 72 L 20 72 Z" fill="#92400e"/>
        <line x1="24" y1="36" x2="23" y2="70" stroke="#d97706" stroke-width="1.6"/>
        <line x1="56" y1="36" x2="57" y2="70" stroke="#d97706" stroke-width="1.6"/>
      `;
    } else if (sid === 'hair-long-curly') {
      // 긴 곱슬머리: 어깨 아래까지 구불구불 방울 컬이 이어지는 긴 곱슬머리
      inner = `
        <ellipse cx="40" cy="40" rx="14" ry="15" fill="#ffdfba" stroke="#f3c99f" stroke-width="1.5"/>
        <path d="M 22 36 C 20 14 60 14 58 36 L 60 70 L 50 70 L 50 34 C 50 28 30 28 30 34 L 30 70 L 20 70 Z" fill="#78350f"/>
        <circle cx="21" cy="44" r="6" fill="#78350f"/>
        <circle cx="20" cy="55" r="6.5" fill="#92400e"/>
        <circle cx="22" cy="66" r="6" fill="#78350f"/>
        <circle cx="59" cy="44" r="6" fill="#78350f"/>
        <circle cx="60" cy="55" r="6.5" fill="#92400e"/>
        <circle cx="58" cy="66" r="6" fill="#78350f"/>
      `;
    } else if (sid.startsWith('eyes-')) {
      const c = item.color || '#2563eb';
      inner = `
        <ellipse cx="26" cy="40" rx="13" ry="10" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
        <circle cx="26" cy="40" r="7" fill="${c}"/>
        <circle cx="26" cy="40" r="3.2" fill="#0f172a"/>
        <circle cx="28" cy="38" r="1.8" fill="#ffffff"/>
        <ellipse cx="54" cy="40" rx="13" ry="10" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
        <circle cx="54" cy="40" r="7" fill="${c}"/>
        <circle cx="54" cy="40" r="3.2" fill="#0f172a"/>
        <circle cx="56" cy="38" r="1.8" fill="#ffffff"/>
      `;
    } else if (sid.startsWith('cap-')) {
      const c = item.color || '#ef4444';
      inner = `
        <path d="M 18 50 C 18 22 62 22 62 50 Z" fill="${c}"/>
        <path d="M 14 50 C 14 46 66 46 66 50 C 74 56 70 60 52 57 L 18 57 C 10 57 8 52 14 50 Z" fill="${c}"/>
        <circle cx="40" cy="24" r="3.5" fill="#ffffff"/>
      `;
    } else if (sid === 'glasses') {
      const c = item.color || '#334155';
      inner = `
        <rect x="12" y="30" width="24" height="18" rx="4" fill="rgba(255,255,255,0.4)" stroke="${c}" stroke-width="3"/>
        <rect x="44" y="30" width="24" height="18" rx="4" fill="rgba(255,255,255,0.4)" stroke="${c}" stroke-width="3"/>
        <line x1="36" y1="38" x2="44" y2="38" stroke="${c}" stroke-width="3"/>
      `;
    } else if (sid.startsWith('shirt-')) {
      const c = item.color || '#facc15';
      inner = `
        <path d="M 24 22 C 24 18 56 18 56 22 L 54 64 L 26 64 Z" fill="${c}" stroke="#64748b" stroke-width="1.8"/>
        <path d="M 24 22 L 12 38 L 20 43 L 28 32 Z" fill="${c}" stroke="#64748b" stroke-width="1.5"/>
        <path d="M 56 22 L 68 38 L 60 43 L 52 32 Z" fill="${c}" stroke="#64748b" stroke-width="1.5"/>
      `;
    } else if (sid.startsWith('skirt-')) {
      const c = item.color || '#1e293b';
      inner = `
        <path d="M 26 24 L 54 24 L 64 62 L 16 62 Z" fill="${c}" stroke="#64748b" stroke-width="1.8"/>
      `;
    } else if (sid.startsWith('pants-')) {
      const c = item.color || '#2563eb';
      inner = `
        <path d="M 24 20 L 56 20 L 54 66 L 42 66 L 40 36 L 38 66 L 26 66 Z" fill="${c}" stroke="#1d4ed8" stroke-width="1.8"/>
      `;
    }

    svg.innerHTML = inner;
    return svg;
  }

  const dressupScene = {
    name: 'dressup',
    slots: SLOTS,

    renderStage: function(container, who) {
      container.innerHTML = '';
      const stageWrapper = document.createElement('div');
      stageWrapper.className = 'dressup-stage-wrapper';
      stageWrapper.setAttribute('data-who', who || 'she');

      const svgEl = createPersonSvg(who || 'she');
      stageWrapper.appendChild(svgEl);
      container.appendChild(stageWrapper);

      return stageWrapper;
    },

    /**
     * 받침대(트레이)에 렌더링할 아이템 엘리먼트 생성
     * - 정답 전에는 그림만 보이고 영어 글자는 보이지 않는다 (맞힌 뒤 엔진이 표시)
     */
    renderItem: function(item) {
      const card = document.createElement('div');
      card.className = 'dressup-item-card';
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
      const targetSlot = stageEl.querySelector('#slot-' + (slot || item.slot));
      if (!targetSlot) return;

      const graphic = ITEM_GRAPHICS[item.id];
      if (graphic) {
        targetSlot.innerHTML = graphic;
        targetSlot.classList.remove('slot-applied-pop');
        void targetSlot.offsetWidth;
        targetSlot.classList.add('slot-applied-pop');
      }
    },

    reset: function(stageEl, who) {
      if (!stageEl) return;
      SLOTS.forEach(slot => {
        const slotEl = stageEl.querySelector('#slot-' + slot);
        if (slotEl) {
          if (slot === 'bottom') {
            slotEl.innerHTML = `<rect x="90" y="196" width="60" height="34" rx="6" fill="${BODY_BASE}" stroke="#64748b" stroke-width="2"/>`;
          } else if (slot === 'hair') {
            slotEl.innerHTML = (who === 'she')
              ? '<path d="M 84 54 C 96 32 144 32 156 54 C 144 48 96 48 84 54 Z" fill="#a16207"/>'
              : '<path d="M 82 54 C 96 34 144 34 158 54 C 142 44 98 44 82 54 Z" fill="#78350f"/>';
          } else if (slot === 'eyes') {
            slotEl.innerHTML = `
              <circle cx="102" cy="72" r="5" fill="#1e293b"/>
              <circle cx="138" cy="72" r="5" fill="#1e293b"/>
              <circle cx="104" cy="70" r="1.8" fill="#ffffff"/>
              <circle cx="140" cy="70" r="1.8" fill="#ffffff"/>
              <path d="M 94 62 Q 102 59 110 63" stroke="#78350f" stroke-width="2.5" stroke-linecap="round" fill="none"/>
              <path d="M 130 63 Q 138 59 146 62" stroke="#78350f" stroke-width="2.5" stroke-linecap="round" fill="none"/>
            `;
          } else {
            slotEl.innerHTML = '';
          }
        }
      });
    },

    renderFinaleStage: function(container, candidates, onSelect) {
      container.innerHTML = '';
      const finaleGrid = document.createElement('div');
      finaleGrid.className = 'dressup-finale-grid';

      candidates.forEach((cand, idx) => {
        const card = document.createElement('div');
        card.className = 'finale-person-card';
        card.setAttribute('data-candidate-idx', idx);
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');

        const personWrap = document.createElement('div');
        personWrap.className = 'finale-person-wrap';
        const svg = createPersonSvg(cand.who || 'she');
        personWrap.appendChild(svg);

        (cand.items || []).forEach(item => {
          const slotEl = svg.querySelector('#slot-' + item.slot);
          if (slotEl && ITEM_GRAPHICS[item.id]) {
            slotEl.innerHTML = ITEM_GRAPHICS[item.id];
          }
        });

        const tag = document.createElement('div');
        tag.className = 'finale-person-tag';
        tag.textContent = `친구 ${idx + 1}`;

        card.appendChild(personWrap);
        card.appendChild(tag);

        card.addEventListener('click', () => {
          if (typeof onSelect === 'function') {
            onSelect(idx, card);
          }
        });

        finaleGrid.appendChild(card);
      });

      container.appendChild(finaleGrid);
      return finaleGrid;
    }
  };

  if (window.EnglishListenPlace && typeof window.EnglishListenPlace.registerScene === 'function') {
    window.EnglishListenPlace.registerScene('dressup', dressupScene);
  } else {
    window._PENDING_SCENES = window._PENDING_SCENES || {};
    window._PENDING_SCENES['dressup'] = dressupScene;
  }
})();
