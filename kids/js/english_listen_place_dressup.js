// kids/js/english_listen_place_dressup.js
// 👗 [영어 8단원 장면] 친구 옷 입히기 장면 모듈 (dressup)
// - 코드로 그리는 인물 SVG (남자/여자, 머리·눈·모자·안경·상의·하의 레이어)
// - 외부 이미지 없이 독립 동작, 폰 375px 반응형 최적화
// - 네임스페이스: EnglishListenPlace.registerScene('dressup', ...)

(function() {
  'use strict';

  // SVG 네임스페이스
  const SVG_NS = 'http://www.w3.org/2000/svg';

  // 기본 슬롯 목록
  const SLOTS = ['hair', 'eyes', 'head', 'glasses', 'top', 'bottom'];

  // 인물 기본 색상 팔레트
  const SKIN_COLOR = '#ffdfba';
  const SKIN_SHADOW = '#f3c99f';
  const BODY_BASE = '#94a3b8'; // 옷 입히기 전 기본 이너웨어

  /**
   * 기본 인물 베이스 SVG 생성
   * @param {'he'|'she'} who 성별 구분
   * @returns {SVGSVGElement}
   */
  function createPersonSvg(who) {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 240 330');
    svg.setAttribute('class', 'dressup-person-svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');

    // 1. 기본 인체 구조 (정적 배경 레이어)
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
        <!-- 다리 피부 -->
        <rect x="94" y="220" width="18" height="74" rx="9" fill="${SKIN_COLOR}" stroke="${SKIN_SHADOW}" stroke-width="2"/>
        <rect x="128" y="220" width="18" height="74" rx="9" fill="${SKIN_COLOR}" stroke="${SKIN_SHADOW}" stroke-width="2"/>
        <!-- 신발 -->
        <path d="M 88 288 C 88 284 100 282 112 284 C 116 288 116 298 114 300 C 104 302 88 302 88 288 Z" fill="#475569"/>
        <path d="M 152 288 C 152 284 140 282 128 284 C 124 288 124 298 126 300 C 136 302 152 302 152 288 Z" fill="#475569"/>
      </g>

      <!-- [동적] 하의 슬롯 (치마 / 바지) -->
      <g id="slot-bottom">
        <!-- 기본 미니 반바지 -->
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
        <!-- 왼팔 -->
        <path d="M 84 128 C 70 148 64 176 68 196 C 72 200 80 198 82 192 C 80 176 84 154 92 136 Z" fill="${SKIN_COLOR}" stroke="${SKIN_SHADOW}" stroke-width="2"/>
        <circle cx="70" cy="200" r="8" fill="${SKIN_COLOR}"/>
        <!-- 오른팔 -->
        <path d="M 156 128 C 170 148 176 176 172 196 C 168 200 160 198 158 192 C 160 176 156 154 148 136 Z" fill="${SKIN_COLOR}" stroke="${SKIN_SHADOW}" stroke-width="2"/>
        <circle cx="170" cy="200" r="8" fill="${SKIN_COLOR}"/>
      </g>

      <!-- 목 -->
      <rect x="110" y="104" width="20" height="24" rx="4" fill="${SKIN_COLOR}" stroke="${SKIN_SHADOW}" stroke-width="1.5"/>

      <!-- 얼굴 본체 -->
      <g id="base-head" filter="url(#softShadow)">
        <ellipse cx="120" cy="74" rx="42" ry="46" fill="${SKIN_COLOR}" stroke="${SKIN_SHADOW}" stroke-width="2"/>
        <!-- 귀 -->
        <ellipse cx="78" cy="76" rx="6" ry="10" fill="${SKIN_COLOR}"/>
        <ellipse cx="162" cy="76" rx="6" ry="10" fill="${SKIN_COLOR}"/>
        <!-- 볼터치 -->
        <circle cx="96" cy="86" r="10" fill="url(#blushGrad)"/>
        <circle cx="144" cy="86" r="10" fill="url(#blushGrad)"/>
        <!-- 코 & 입 -->
        <path d="M 120 78 L 118 83 L 122 83" stroke="#b45309" stroke-width="2" stroke-linecap="round" fill="none"/>
        <path d="M 112 94 Q 120 102 128 94" stroke="#e11d48" stroke-width="2.5" stroke-linecap="round" fill="none"/>
      </g>

      <!-- [동적] 눈 슬롯 (eyes) -->
      <g id="slot-eyes">
        <!-- 기본 눈 (초기값: 검정) -->
        <circle cx="102" cy="72" r="5" fill="#1e293b"/>
        <circle cx="138" cy="72" r="5" fill="#1e293b"/>
        <circle cx="104" cy="70" r="1.8" fill="#ffffff"/>
        <circle cx="140" cy="70" r="1.8" fill="#ffffff"/>
        <!-- 눈썹 -->
        <path d="M 94 62 Q 102 59 110 63" stroke="#78350f" stroke-width="2.5" stroke-linecap="round" fill="none"/>
        <path d="M 130 63 Q 138 59 146 62" stroke="#78350f" stroke-width="2.5" stroke-linecap="round" fill="none"/>
      </g>

      <!-- [동적] 안경 슬롯 (glasses) -->
      <g id="slot-glasses"></g>

      <!-- [동적] 머리 슬롯 (hair) -->
      <g id="slot-hair">
        <!-- 초기 기본 머리털 (살짝 있는 기본 머리) -->
        ${who === 'she'
          ? '<path d="M 84 56 C 96 34 144 34 156 56 C 146 50 94 50 84 56 Z" fill="#a16207"/>'
          : '<path d="M 82 56 C 96 36 144 36 158 56 C 140 44 100 44 82 56 Z" fill="#78350f"/>'}
      </g>

      <!-- [동적] 모자 슬롯 (head) -->
      <g id="slot-head"></g>
    `;

    return svg;
  }

  /**
   * 아이템 ID에 따른 SVG 그래픽 정의
   */
  const ITEM_GRAPHICS = {
    // 1. 헤어
    'hair-long-straight': `
      <!-- 긴 생머리 -->
      <path d="M 76 68 C 74 34 166 34 164 68 C 168 110 172 170 166 186 C 158 190 152 178 152 140 C 152 74 148 54 120 54 C 92 54 88 74 88 140 C 88 178 82 190 74 186 C 68 170 72 110 76 68 Z" fill="#92400e"/>
      <path d="M 80 54 Q 120 40 160 54 Q 146 68 120 62 Q 94 68 80 54 Z" fill="#b45309"/>
    `,
    'hair-long-curly': `
      <!-- 긴 곱슬머리 -->
      <path d="M 72 70 C 66 30 174 30 168 70 C 178 94 172 120 176 142 C 178 160 164 178 166 196 C 158 198 152 186 154 164 C 154 84 148 56 120 56 C 92 56 86 84 86 164 C 88 186 82 198 74 196 C 76 178 62 160 64 142 C 68 120 62 94 72 70 Z" fill="#78350f"/>
      <circle cx="70" cy="116" r="12" fill="#78350f"/>
      <circle cx="170" cy="116" r="12" fill="#78350f"/>
      <circle cx="68" cy="156" r="14" fill="#78350f"/>
      <circle cx="172" cy="156" r="14" fill="#78350f"/>
      <circle cx="74" cy="188" r="11" fill="#78350f"/>
      <circle cx="166" cy="188" r="11" fill="#78350f"/>
    `,
    'hair-short-straight': `
      <!-- 짧은 생머리 -->
      <path d="M 76 68 C 74 30 166 30 164 68 C 166 84 160 96 156 100 C 154 82 148 52 120 52 C 92 52 86 82 84 100 C 80 96 74 84 76 68 Z" fill="#451a03"/>
      <path d="M 78 58 Q 120 44 162 58 Q 146 72 120 64 Q 94 72 78 58 Z" fill="#78350f"/>
    `,
    'hair-short-curly': `
      <!-- 짧은 곱슬머리 -->
      <path d="M 76 64 C 70 28 170 28 164 64 C 172 78 166 94 158 98 C 156 80 148 50 120 50 C 92 50 84 80 82 98 C 74 94 68 78 76 64 Z" fill="#581c87"/>
      <!-- 뽀글뽀글 컬 표현 -->
      <circle cx="82" cy="46" r="13" fill="#581c87"/>
      <circle cx="102" cy="34" r="14" fill="#581c87"/>
      <circle cx="120" cy="30" r="15" fill="#6b21a8"/>
      <circle cx="138" cy="34" r="14" fill="#581c87"/>
      <circle cx="158" cy="46" r="13" fill="#581c87"/>
      <circle cx="74" cy="68" r="10" fill="#581c87"/>
      <circle cx="166" cy="68" r="10" fill="#581c87"/>
    `,

    // 2. 눈 (눈 색깔 교체)
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
      <path d="M 76 56 C 76 26 164 26 164 56 Z" fill="#ef4444" stroke="#b91c1c" stroke-width="2"/>
      <path d="M 70 56 C 70 52 170 52 170 56 C 182 62 176 68 152 64 L 74 64 C 64 64 62 58 70 56 Z" fill="#dc2626"/>
      <circle cx="120" cy="27" r="4" fill="#ffffff"/>
    `,
    'cap-blue': `
      <path d="M 76 56 C 76 26 164 26 164 56 Z" fill="#3b82f6" stroke="#1d4ed8" stroke-width="2"/>
      <path d="M 70 56 C 70 52 170 52 170 56 C 182 62 176 68 152 64 L 74 64 C 64 64 62 58 70 56 Z" fill="#2563eb"/>
      <circle cx="120" cy="27" r="4" fill="#ffffff"/>
    `,
    'cap-yellow': `
      <path d="M 76 56 C 76 26 164 26 164 56 Z" fill="#eab308" stroke="#ca8a04" stroke-width="2"/>
      <path d="M 70 56 C 70 52 170 52 170 56 C 182 62 176 68 152 64 L 74 64 C 64 64 62 58 70 56 Z" fill="#ca8a04"/>
      <circle cx="120" cy="27" r="4" fill="#ffffff"/>
    `,
    'cap-green': `
      <path d="M 76 56 C 76 26 164 26 164 56 Z" fill="#22c55e" stroke="#15803d" stroke-width="2"/>
      <path d="M 70 56 C 70 52 170 52 170 56 C 182 62 176 68 152 64 L 74 64 C 64 64 62 58 70 56 Z" fill="#16a34a"/>
      <circle cx="120" cy="27" r="4" fill="#ffffff"/>
    `,

    // 4. 안경 (glasses)
    'glasses': `
      <rect x="90" y="62" width="24" height="20" rx="4" fill="rgba(255,255,255,0.3)" stroke="#334155" stroke-width="3"/>
      <rect x="126" y="62" width="24" height="20" rx="4" fill="rgba(255,255,255,0.3)" stroke="#334155" stroke-width="3"/>
      <line x1="114" y1="70" x2="126" y2="70" stroke="#334155" stroke-width="3"/>
      <line x1="78" y1="70" x2="90" y2="70" stroke="#334155" stroke-width="2.5"/>
      <line x1="150" y1="70" x2="162" y2="70" stroke="#334155" stroke-width="2.5"/>
    `,
    'sunglasses': `
      <polygon points="90,62 114,64 112,82 92,80" fill="#0f172a" stroke="#000000" stroke-width="2"/>
      <polygon points="126,64 150,62 148,80 128,82" fill="#0f172a" stroke="#000000" stroke-width="2"/>
      <line x1="114" y1="67" x2="126" y2="67" stroke="#000000" stroke-width="3"/>
      <line x1="78" y1="68" x2="90" y2="68" stroke="#000000" stroke-width="2.5"/>
      <line x1="150" y1="68" x2="162" y2="68" stroke="#000000" stroke-width="2.5"/>
    `,
    'round-glasses': `
      <circle cx="102" cy="72" r="11" fill="rgba(255,255,255,0.25)" stroke="#ea580c" stroke-width="3"/>
      <circle cx="138" cy="72" r="11" fill="rgba(255,255,255,0.25)" stroke="#ea580c" stroke-width="3"/>
      <path d="M 113 70 Q 120 67 127 70" stroke="#ea580c" stroke-width="3" fill="none"/>
    `,
    'goggles': `
      <rect x="86" y="60" width="68" height="24" rx="10" fill="rgba(2,132,199,0.35)" stroke="#0369a1" stroke-width="3.5"/>
      <line x1="74" y1="72" x2="86" y2="72" stroke="#0f172a" stroke-width="4"/>
      <line x1="154" y1="72" x2="166" y2="72" stroke="#0f172a" stroke-width="4"/>
    `,

    // 5. 상의 (top)
    'shirt-yellow': `
      <!-- 노란 티셔츠 -->
      <path d="M 82 124 C 82 116 158 116 158 124 L 154 200 L 86 200 Z" fill="#facc15" stroke="#ca8a04" stroke-width="2"/>
      <!-- 소매 -->
      <path d="M 83 126 L 68 152 L 80 156 L 91 138 Z" fill="#facc15" stroke="#ca8a04" stroke-width="1.5"/>
      <path d="M 157 126 L 172 152 L 160 156 L 149 138 Z" fill="#facc15" stroke="#ca8a04" stroke-width="1.5"/>
      <!-- 넥라인 -->
      <path d="M 108 124 C 114 134 126 134 132 124" stroke="#ca8a04" stroke-width="2" fill="none"/>
    `,
    'shirt-white': `
      <!-- 하얀 셔츠 -->
      <path d="M 82 124 C 82 116 158 116 158 124 L 154 200 L 86 200 Z" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2"/>
      <path d="M 83 126 L 68 152 L 80 156 L 91 138 Z" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5"/>
      <path d="M 157 126 L 172 152 L 160 156 L 149 138 Z" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5"/>
      <!-- 단추 & 칼라 -->
      <polygon points="120,124 108,136 120,140" fill="#e2e8f0"/>
      <polygon points="120,124 132,136 120,140" fill="#e2e8f0"/>
      <circle cx="120" cy="156" r="2" fill="#64748b"/>
      <circle cx="120" cy="174" r="2" fill="#64748b"/>
    `,
    'shirt-blue': `
      <!-- 파란 셔츠 -->
      <path d="M 82 124 C 82 116 158 116 158 124 L 154 200 L 86 200 Z" fill="#3b82f6" stroke="#1d4ed8" stroke-width="2"/>
      <path d="M 83 126 L 68 152 L 80 156 L 91 138 Z" fill="#3b82f6" stroke="#1d4ed8" stroke-width="1.5"/>
      <path d="M 157 126 L 172 152 L 160 156 L 149 138 Z" fill="#3b82f6" stroke="#1d4ed8" stroke-width="1.5"/>
      <path d="M 108 124 C 114 134 126 134 132 124" stroke="#1d4ed8" stroke-width="2" fill="none"/>
    `,
    'shirt-green': `
      <!-- 초록 티셔츠 -->
      <path d="M 82 124 C 82 116 158 116 158 124 L 154 200 L 86 200 Z" fill="#22c55e" stroke="#15803d" stroke-width="2"/>
      <path d="M 83 126 L 68 152 L 80 156 L 91 138 Z" fill="#22c55e" stroke="#15803d" stroke-width="1.5"/>
      <path d="M 157 126 L 172 152 L 160 156 L 149 138 Z" fill="#22c55e" stroke="#15803d" stroke-width="1.5"/>
      <path d="M 108 124 C 114 134 126 134 132 124" stroke="#15803d" stroke-width="2" fill="none"/>
    `,

    // 6. 하의 (bottom)
    'skirt-black': `
      <!-- 검정 치마 -->
      <path d="M 86 196 L 154 196 L 166 248 L 74 248 Z" fill="#1e293b" stroke="#0f172a" stroke-width="2"/>
      <!-- 주름 -->
      <line x1="102" y1="196" x2="96" y2="248" stroke="#334155" stroke-width="1.5"/>
      <line x1="120" y1="196" x2="120" y2="248" stroke="#334155" stroke-width="1.5"/>
      <line x1="138" y1="196" x2="144" y2="248" stroke="#334155" stroke-width="1.5"/>
    `,
    'skirt-red': `
      <!-- 빨간 치마 -->
      <path d="M 86 196 L 154 196 L 166 248 L 74 248 Z" fill="#ef4444" stroke="#b91c1c" stroke-width="2"/>
      <line x1="102" y1="196" x2="96" y2="248" stroke="#fca5a5" stroke-width="1.5"/>
      <line x1="120" y1="196" x2="120" y2="248" stroke="#fca5a5" stroke-width="1.5"/>
      <line x1="138" y1="196" x2="144" y2="248" stroke="#fca5a5" stroke-width="1.5"/>
    `,
    'pants-blue': `
      <!-- 파란 바지 -->
      <path d="M 86 196 L 154 196 L 152 284 L 126 284 L 120 220 L 114 284 L 88 284 Z" fill="#2563eb" stroke="#1d4ed8" stroke-width="2"/>
      <line x1="120" y1="196" x2="120" y2="220" stroke="#1d4ed8" stroke-width="2"/>
    `,
    'pants-black': `
      <!-- 검정 바지 -->
      <path d="M 86 196 L 154 196 L 152 284 L 126 284 L 120 220 L 114 284 L 88 284 Z" fill="#334155" stroke="#1e293b" stroke-width="2"/>
      <line x1="120" y1="196" x2="120" y2="220" stroke="#1e293b" stroke-width="2"/>
    `
  };

  /**
   * 미니 아이템 썸네일 SVG 생성 (트레이 받침대용)
   */
  function createItemThumbnail(item) {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 80 80');
    svg.setAttribute('width', '52');
    svg.setAttribute('height', '52');
    svg.setAttribute('class', 'item-thumb-svg');

    let inner = '';
    const sid = item.id;
    if (sid.startsWith('hair-')) {
      const color = sid.includes('curly') ? '#78350f' : '#92400e';
      const shape = sid.includes('short')
        ? '<path d="M 20 45 C 16 15 64 15 60 45 C 52 35 28 35 20 45 Z" fill="' + color + '"/>'
        : '<path d="M 22 55 C 18 15 62 15 58 55 C 62 65 52 68 50 55 C 50 30 30 30 30 55 C 28 68 18 65 22 55 Z" fill="' + color + '"/>';
      inner = shape;
    } else if (sid.startsWith('eyes-')) {
      const c = item.color || '#2563eb';
      inner = `
        <ellipse cx="28" cy="40" rx="14" ry="10" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
        <circle cx="28" cy="40" r="7" fill="${c}"/>
        <circle cx="28" cy="40" r="3.5" fill="#0f172a"/>
        <circle cx="30" cy="38" r="2" fill="#ffffff"/>
        <ellipse cx="52" cy="40" rx="14" ry="10" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
        <circle cx="52" cy="40" r="7" fill="${c}"/>
        <circle cx="52" cy="40" r="3.5" fill="#0f172a"/>
        <circle cx="54" cy="38" r="2" fill="#ffffff"/>
      `;
    } else if (sid.startsWith('cap-')) {
      const c = item.color || '#ef4444';
      inner = `
        <path d="M 20 50 C 20 24 60 24 60 50 Z" fill="${c}"/>
        <path d="M 16 50 C 16 46 64 46 64 50 C 72 56 68 60 52 57 L 20 57 C 12 57 10 52 16 50 Z" fill="${c}"/>
        <circle cx="40" cy="25" r="3" fill="#ffffff"/>
      `;
    } else if (sid.includes('glasses') || sid === 'goggles') {
      const c = item.color || '#334155';
      inner = `
        <circle cx="28" cy="40" r="12" fill="none" stroke="${c}" stroke-width="3"/>
        <circle cx="52" cy="40" r="12" fill="none" stroke="${c}" stroke-width="3"/>
        <line x1="40" y1="40" x2="40" y2="40" stroke="${c}" stroke-width="3"/>
        <line x1="39" y1="40" x2="41" y2="40" stroke="${c}" stroke-width="3"/>
        <path d="M 39 39 Q 40 37 41 39" stroke="${c}" stroke-width="3" fill="none"/>
      `;
    } else if (sid.startsWith('shirt-')) {
      const c = item.color || '#facc15';
      inner = `
        <path d="M 24 24 C 24 20 56 20 56 24 L 54 62 L 26 62 Z" fill="${c}" stroke="#94a3b8" stroke-width="1.5"/>
        <path d="M 24 24 L 14 38 L 22 42 L 28 32 Z" fill="${c}" stroke="#94a3b8" stroke-width="1"/>
        <path d="M 56 24 L 66 38 L 58 42 L 52 32 Z" fill="${c}" stroke="#94a3b8" stroke-width="1"/>
      `;
    } else if (sid.startsWith('skirt-')) {
      const c = item.color || '#1e293b';
      inner = `
        <path d="M 26 26 L 54 26 L 62 60 L 18 60 Z" fill="${c}" stroke="#64748b" stroke-width="1.5"/>
      `;
    } else if (sid.startsWith('pants-')) {
      const c = item.color || '#2563eb';
      inner = `
        <path d="M 24 24 L 56 24 L 54 64 L 42 64 L 40 38 L 38 64 L 26 64 Z" fill="${c}" stroke="#1d4ed8" stroke-width="1.5"/>
      `;
    }

    svg.innerHTML = inner;
    return svg;
  }

  // 장면 정의 객체
  const dressupScene = {
    name: 'dressup',
    slots: SLOTS,

    /**
     * 메인 무대에 인물 렌더링
     */
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
     */
    renderItem: function(item) {
      const card = document.createElement('div');
      card.className = 'dressup-item-card';
      card.setAttribute('data-item-id', item.id);
      card.setAttribute('data-slot', item.slot);
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-label', item.label || item.id);

      // 드래그 핸들 겸 터치 영역
      const thumb = createItemThumbnail(item);
      const label = document.createElement('div');
      label.className = 'item-card-label';
      label.textContent = item.label || item.desc || item.id;

      card.appendChild(thumb);
      card.appendChild(label);

      return card;
    },

    /**
     * 무대의 인물에 아이템 적용 (입히기)
     */
    applyItem: function(stageEl, slot, item) {
      if (!stageEl || !item) return;
      const targetSlot = stageEl.querySelector('#slot-' + (slot || item.slot));
      if (!targetSlot) return;

      const graphic = ITEM_GRAPHICS[item.id];
      if (graphic) {
        targetSlot.innerHTML = graphic;
        // 입혀질 때 부드러운 팝 애니메이션 클래스 부여
        targetSlot.classList.remove('slot-applied-pop');
        void targetSlot.offsetWidth; // reflow
        targetSlot.classList.add('slot-applied-pop');
      }
    },

    /**
     * 인물 초기화 (기본 상태로 리셋)
     */
    reset: function(stageEl, who) {
      if (!stageEl) return;
      SLOTS.forEach(slot => {
        const slotEl = stageEl.querySelector('#slot-' + slot);
        if (slotEl) {
          if (slot === 'bottom') {
            slotEl.innerHTML = `<rect x="90" y="196" width="60" height="34" rx="6" fill="${BODY_BASE}" stroke="#64748b" stroke-width="2"/>`;
          } else if (slot === 'hair') {
            slotEl.innerHTML = (who === 'she')
              ? '<path d="M 84 56 C 96 34 144 34 156 56 C 146 50 94 50 84 56 Z" fill="#a16207"/>'
              : '<path d="M 82 56 C 96 36 144 36 158 56 C 140 44 100 44 82 56 Z" fill="#78350f"/>';
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

    /**
     * 마지막 판 「친구를 찾아라!」(Catch the Impostor) 3명 후보 렌더링
     */
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
        card.setAttribute('aria-label', `친구 후보 ${idx + 1}`);

        // 미니 인물 래퍼
        const personWrap = document.createElement('div');
        personWrap.className = 'finale-person-wrap';
        const svg = createPersonSvg(cand.who || 'she');
        personWrap.appendChild(svg);

        // 후보의 착용 아이템들 즉시 입히기
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

  // 엔진에 장면 등록
  if (window.EnglishListenPlace && typeof window.EnglishListenPlace.registerScene === 'function') {
    window.EnglishListenPlace.registerScene('dressup', dressupScene);
  } else {
    // 엔진이 나중에 로드될 경우 대비
    window._PENDING_SCENES = window._PENDING_SCENES || {};
    window._PENDING_SCENES['dressup'] = dressupScene;
  }
})();
