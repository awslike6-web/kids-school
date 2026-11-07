// kids/js/english_listen_place_map.js
// 🧭 [영어 11단원 장면] 마을 길 찾기 장면 모듈 (map)
// - 위에서 내려다본 마을 지도 무대(출발점 You are here + 큰 나무 + A~H 건물 자리 8곳)
// - 장소 그림 카드 9종(영어 글자 숨김) + 위치 표지 카드 A~H 썸네일
// - 장소와 위치를 둘 다 맞히면 출발점 → 정답 자리까지 경로 화살표 표시
// - 마지막 판 「도서관 찾아가기」: 정답 경로 지도 1장 + 오답 지도 2장(좌우 반전·한 블록 더 감)
// - 네임스페이스: EnglishListenPlace.registerScene('map', ...)

(function() {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const SLOTS = ['place', 'spot'];

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }

  function shuffleArray(arr) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function getSceneData() {
    return window.LISTEN_PLACE_SCENE || {};
  }

  /**
   * 장소 카드 9종 순수 그림 SVG (80x80 viewBox 기준, 영어 글자 없음)
   */
  const PLACE_GRAPHICS = {
    // 1. 도서관 (library): 벽돌 지붕 건물 + 크게 펼쳐진 책과 책등
    'place-library': `
      <rect x="6" y="6" width="68" height="68" rx="14" fill="#e0f2fe"/>
      <polygon points="12,30 40,12 68,30" fill="#0284c7" stroke="#0369a1" stroke-width="2"/>
      <rect x="16" y="30" width="48" height="36" rx="3" fill="#fffbeb" stroke="#0284c7" stroke-width="2"/>
      <path d="M 24 38 C 30 35 36 37 40 40 C 44 37 50 35 56 38 L 56 56 C 50 53 44 55 40 58 C 36 55 30 53 24 56 Z" fill="#ffffff" stroke="#0369a1" stroke-width="2"/>
      <line x1="40" y1="40" x2="40" y2="58" stroke="#0369a1" stroke-width="1.8"/>
      <line x1="28" y1="44" x2="36" y2="45" stroke="#64748b" stroke-width="1.6" stroke-linecap="round"/>
      <line x1="44" y1="45" x2="52" y2="44" stroke="#64748b" stroke-width="1.6" stroke-linecap="round"/>
    `,
    // 2. 식당 (restaurant): 줄무늬 차양 가게 + 접시·덮개·포크·숟가락
    'place-restaurant': `
      <rect x="6" y="6" width="68" height="68" rx="14" fill="#ffedd5"/>
      <rect x="14" y="26" width="52" height="40" rx="4" fill="#ffffff" stroke="#ea580c" stroke-width="2"/>
      <path d="M 12 28 L 18 16 L 62 16 L 68 28 Z" fill="#f97316" stroke="#c2410c" stroke-width="1.8"/>
      <line x1="28" y1="16" x2="26" y2="28" stroke="#ffffff" stroke-width="3"/>
      <line x1="40" y1="16" x2="40" y2="28" stroke="#ffffff" stroke-width="3"/>
      <line x1="52" y1="16" x2="54" y2="28" stroke="#ffffff" stroke-width="3"/>
      <path d="M 27 52 A 13 11 0 0 1 53 52 Z" fill="#cbd5e1" stroke="#475569" stroke-width="1.8"/>
      <circle cx="40" cy="39" r="2.4" fill="#475569"/>
      <line x1="23" y1="55" x2="57" y2="55" stroke="#475569" stroke-width="2.4" stroke-linecap="round"/>
      <line x1="21" y1="36" x2="21" y2="52" stroke="#ea580c" stroke-width="2.2" stroke-linecap="round"/>
      <ellipse cx="59" cy="40" rx="2.6" ry="4" fill="#ea580c"/>
      <line x1="59" y1="43" x2="59" y2="52" stroke="#ea580c" stroke-width="2.2" stroke-linecap="round"/>
    `,
    // 3. 은행 (bank): 대리석 삼각 지붕 + 기둥 3개 + 쌓인 금화 (문자/기호 없음)
    'place-bank': `
      <rect x="6" y="6" width="68" height="68" rx="14" fill="#fef9c3"/>
      <polygon points="12,28 40,12 68,28" fill="#cbd5e1" stroke="#475569" stroke-width="2"/>
      <circle cx="40" cy="22" r="3.5" fill="#eab308"/>
      <rect x="15" y="28" width="50" height="5" fill="#e2e8f0" stroke="#475569" stroke-width="1.5"/>
      <rect x="20" y="33" width="6" height="24" fill="#f8fafc" stroke="#64748b" stroke-width="1.5"/>
      <rect x="37" y="33" width="6" height="24" fill="#f8fafc" stroke="#64748b" stroke-width="1.5"/>
      <rect x="54" y="33" width="6" height="24" fill="#f8fafc" stroke="#64748b" stroke-width="1.5"/>
      <rect x="13" y="57" width="54" height="7" rx="2" fill="#94a3b8" stroke="#475569" stroke-width="1.5"/>
      <ellipse cx="55" cy="56" rx="7" ry="3.2" fill="#facc15" stroke="#ca8a04" stroke-width="1.4"/>
      <ellipse cx="55" cy="52" rx="7" ry="3.2" fill="#fde047" stroke="#ca8a04" stroke-width="1.4"/>
      <ellipse cx="55" cy="48" rx="7" ry="3.2" fill="#fef08a" stroke="#ca8a04" stroke-width="1.4"/>
    `,
    // 4. 병원 (hospital): 흰 건물 + 빨간 십자가 + 창문
    'place-hospital': `
      <rect x="6" y="6" width="68" height="68" rx="14" fill="#fee2e2"/>
      <rect x="16" y="18" width="48" height="48" rx="5" fill="#ffffff" stroke="#64748b" stroke-width="2"/>
      <rect x="28" y="11" width="24" height="14" rx="4" fill="#ffffff" stroke="#ef4444" stroke-width="2"/>
      <rect x="38" y="13.5" width="4" height="9" rx="1" fill="#ef4444"/>
      <rect x="35.5" y="16" width="9" height="4" rx="1" fill="#ef4444"/>
      <rect x="22" y="31" width="10" height="9" rx="2" fill="#bae6fd"/>
      <rect x="48" y="31" width="10" height="9" rx="2" fill="#bae6fd"/>
      <rect x="36" y="32" width="8" height="20" rx="1.5" fill="#ef4444"/>
      <rect x="30" y="38" width="20" height="8" rx="1.5" fill="#ef4444"/>
      <rect x="34" y="55" width="12" height="11" rx="2" fill="#93c5fd" stroke="#3b82f6" stroke-width="1.4"/>
    `,
    // 5. 꽃집 (flower shop): 분홍 차양 가게 + 튤립과 해바라기 화분
    'place-flower-shop': `
      <rect x="6" y="6" width="68" height="68" rx="14" fill="#fce7f3"/>
      <rect x="15" y="28" width="50" height="38" rx="4" fill="#fff1f2" stroke="#db2777" stroke-width="2"/>
      <path d="M 12 29 L 18 17 L 62 17 L 68 29 Z" fill="#ec4899" stroke="#be185d" stroke-width="1.8"/>
      <line x1="28" y1="45" x2="28" y2="56" stroke="#16a34a" stroke-width="2.5"/>
      <path d="M 22 44 C 22 36 34 36 34 44 C 34 48 22 48 22 44 Z" fill="#f43f5e"/>
      <line x1="40" y1="42" x2="40" y2="56" stroke="#16a34a" stroke-width="2.5"/>
      <circle cx="40" cy="40" r="6.5" fill="#facc15" stroke="#eab308" stroke-width="1.5"/>
      <circle cx="40" cy="40" r="2.8" fill="#854d0e"/>
      <line x1="52" y1="45" x2="52" y2="56" stroke="#16a34a" stroke-width="2.5"/>
      <path d="M 46 44 C 46 36 58 36 58 44 C 58 48 46 48 46 44 Z" fill="#a855f7"/>
      <rect x="20" y="55" width="40" height="8" rx="2" fill="#d97706"/>
    `,
    // 6. 공원 (park): 푸른 나무 + 벤치 + 노란 미끄럼틀
    'place-park': `
      <rect x="6" y="6" width="68" height="68" rx="14" fill="#dcfce7"/>
      <rect x="23" y="42" width="6" height="20" rx="2" fill="#854d0e"/>
      <circle cx="26" cy="30" r="13" fill="#22c55e"/>
      <circle cx="19" cy="35" r="9" fill="#16a34a"/>
      <circle cx="33" cy="35" r="9" fill="#4ade80"/>
      <line x1="44" y1="34" x2="44" y2="60" stroke="#64748b" stroke-width="2.5"/>
      <path d="M 44 36 L 64 58" stroke="#facc15" stroke-width="5.5" stroke-linecap="round"/>
      <rect x="14" y="58" width="52" height="6" rx="3" fill="#86efac"/>
    `,
    // 7. 학교 (school): 시계탑과 깃발이 달린 2층 학교 건물
    'place-school': `
      <rect x="6" y="6" width="68" height="68" rx="14" fill="#e0e7ff"/>
      <rect x="14" y="32" width="52" height="34" rx="3" fill="#fde68a" stroke="#b45309" stroke-width="2"/>
      <polygon points="28,32 40,18 52,32" fill="#ef4444" stroke="#b91c1c" stroke-width="1.8"/>
      <line x1="40" y1="10" x2="40" y2="18" stroke="#475569" stroke-width="2"/>
      <polygon points="40,10 50,13 40,16" fill="#ef4444"/>
      <circle cx="40" cy="28" r="5" fill="#ffffff" stroke="#475569" stroke-width="1.5"/>
      <line x1="40" y1="28" x2="40" y2="25" stroke="#1e293b" stroke-width="1.4"/>
      <line x1="40" y1="28" x2="43" y2="28" stroke="#1e293b" stroke-width="1.4"/>
      <rect x="20" y="39" width="9" height="8" rx="1.5" fill="#bae6fd"/>
      <rect x="51" y="39" width="9" height="8" rx="1.5" fill="#bae6fd"/>
      <rect x="35" y="49" width="10" height="17" rx="2" fill="#92400e"/>
    `,
    // 8. 사탕 가게 (candy shop): 막대사탕과 리본 사탕 가게
    'place-candy-shop': `
      <rect x="6" y="6" width="68" height="68" rx="14" fill="#fae8ff"/>
      <line x1="34" y1="42" x2="26" y2="62" stroke="#94a3b8" stroke-width="3.5" stroke-linecap="round"/>
      <circle cx="36" cy="30" r="14" fill="#f472b6" stroke="#db2777" stroke-width="2"/>
      <circle cx="36" cy="30" r="8.5" fill="none" stroke="#ffffff" stroke-width="2.6" stroke-dasharray="6 4"/>
      <circle cx="36" cy="30" r="3.5" fill="#fde047"/>
      <polygon points="43,50 49,54 43,58" fill="#a855f7"/>
      <polygon points="65,50 59,54 65,58" fill="#a855f7"/>
      <circle cx="54" cy="54" r="6" fill="#c084fc" stroke="#7e22ce" stroke-width="1.6"/>
    `,
    // 9. 아이스크림 가게 (ice cream shop): 3단 스쿱 와플콘 아이스크림
    'place-ice-cream-shop': `
      <rect x="6" y="6" width="68" height="68" rx="14" fill="#ecfeff"/>
      <polygon points="29,42 51,42 40,66" fill="#f59e0b" stroke="#b45309" stroke-width="2"/>
      <line x1="33" y1="46" x2="45" y2="54" stroke="#d97706" stroke-width="1.4"/>
      <line x1="47" y1="46" x2="35" y2="54" stroke="#d97706" stroke-width="1.4"/>
      <circle cx="33" cy="37" r="8.5" fill="#fef08a" stroke="#eab308" stroke-width="1.5"/>
      <circle cx="47" cy="37" r="8.5" fill="#86efac" stroke="#16a34a" stroke-width="1.5"/>
      <circle cx="40" cy="25" r="9.5" fill="#f9a8d4" stroke="#ec4899" stroke-width="1.5"/>
      <circle cx="40" cy="15" r="3" fill="#ef4444"/>
    `
  };

  /**
   * 위치 표지 카드(A~H) 썸네일 그래픽 (명세 §3: A·B… 글자 표시 허용)
   */
  function buildSpotGraphic(item) {
    const letter = escapeHtml((item && item.spotLetter) || String((item && item.id) || '').replace('spot-', '') || 'A');
    return `
      <rect x="8" y="8" width="64" height="64" rx="14" fill="#eff6ff"/>
      <path d="M 14 58 L 66 58" stroke="#94a3b8" stroke-width="6" stroke-linecap="round"/>
      <path d="M 18 58 L 62 58" stroke="#ffffff" stroke-width="1.6" stroke-dasharray="5 4"/>
      <path d="M 40 14 C 29 14 21 22 21 32 C 21 44 40 58 40 58 C 40 58 59 44 59 32 C 59 22 51 14 40 14 Z" fill="#2563eb" stroke="#1e3a8a" stroke-width="2"/>
      <circle cx="40" cy="32" r="12" fill="#ffffff"/>
      <text x="40" y="37" text-anchor="middle" font-size="16" font-weight="900" fill="#1e3a8a" font-family="sans-serif">${letter}</text>
    `;
  }

  /**
   * 경로 좌표 배열([[x,y], ...])로 방향 화살표 SVG 마크업 생성
   */
  function buildRouteArrowSvg(points, strokeW) {
    if (!Array.isArray(points) || points.length < 2) return '';
    const sw = strokeW || 6.5;
    const first = points[0];
    const last = points[points.length - 1];
    const prev = points[points.length - 2];
    const dx = last[0] - prev[0];
    const dy = last[1] - prev[1];
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const px = -uy;
    const py = ux;

    const headLen = sw * 2.1;
    const headHalf = sw * 1.35;
    const trimEnd = [last[0] - ux * (headLen * 0.55), last[1] - uy * (headLen * 0.55)];
    const polyPts = [...points.slice(0, -1), trimEnd].map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');

    const bx = last[0] - ux * headLen;
    const by = last[1] - uy * headLen;
    const w1x = bx + px * headHalf;
    const w1y = by + py * headHalf;
    const w2x = bx - px * headHalf;
    const w2y = by - py * headHalf;
    const headPts = `${last[0].toFixed(1)},${last[1].toFixed(1)} ${w1x.toFixed(1)},${w1y.toFixed(1)} ${w2x.toFixed(1)},${w2y.toFixed(1)}`;

    return `
      <polyline points="${polyPts}" fill="none" stroke="#ffffff" stroke-width="${sw + 3.5}" stroke-linecap="round" stroke-linejoin="round"/>
      <polyline class="map-route-arrow" points="${polyPts}" fill="none" stroke="#ef4444" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>
      <polygon points="${headPts}" fill="#ef4444" stroke="#ffffff" stroke-width="1.6" stroke-linejoin="round"/>
      <circle cx="${first[0]}" cy="${first[1]}" r="${sw * 0.8}" fill="#ef4444" stroke="#ffffff" stroke-width="2"/>
    `;
  }

  /**
   * 마을 지도 기본 도로·큰 나무·건물 자리(A~H)·출발점 배경 SVG 마크업
   */
  function buildBaseTownSvgMarkup(spots, options) {
    const opts = options || {};
    const selectedSpotId = opts.selectedSpotId || '';
    const placedPlaceId = opts.placedPlaceId || '';
    const placedSpotId = opts.placedSpotId || '';
    const compact = Boolean(opts.compact);

    const plotsHtml = (spots || []).map(sp => {
      const isSelected = sp.id === selectedSpotId || sp.id === placedSpotId;
      const isSolvedHere = Boolean(placedPlaceId && sp.id === placedSpotId);
      const fill = isSolvedHere ? '#dcfce7' : (isSelected ? '#dbeafe' : '#ffffff');
      const stroke = isSolvedHere ? '#10b981' : (isSelected ? '#2563eb' : '#64748b');
      const sw = isSelected ? '2.8' : '1.8';
      const dash = isSelected ? '' : 'stroke-dasharray="4 3"';
      const walkTop = Math.min(sp.y, sp.walkY || sp.y);
      const walkH = Math.abs((sp.walkY || sp.y) - sp.y);

      const innerContent = isSolvedHere
        ? `<svg x="${sp.x - 19}" y="${sp.y - 19}" width="38" height="38" viewBox="0 0 80 80">${PLACE_GRAPHICS[placedPlaceId] || PLACE_GRAPHICS['place-library']}</svg>
           <circle cx="${sp.x + 28}" cy="${sp.y - 12}" r="9" fill="#10b981"/>
           <text x="${sp.x + 28}" y="${sp.y - 8.5}" text-anchor="middle" font-size="11" font-weight="900" fill="#ffffff" font-family="sans-serif">${escapeHtml(sp.label)}</text>`
        : `<circle cx="${sp.x}" cy="${sp.y}" r="${compact ? 12 : 11}" fill="${isSelected ? '#2563eb' : '#eff6ff'}" stroke="${stroke}" stroke-width="1.6"/>
           <text x="${sp.x}" y="${sp.y + 4.2}" text-anchor="middle" font-size="${compact ? 13 : 12.5}" font-weight="900" fill="${isSelected ? '#ffffff' : '#1e3a8a'}" font-family="sans-serif">${escapeHtml(sp.label)}</text>`;

      return `
        <rect x="${sp.x - 6}" y="${walkTop}" width="12" height="${walkH}" fill="#cbd5e1"/>
        <g id="map-plot-${escapeHtml(sp.id)}" data-spot-id="${escapeHtml(sp.id)}">
          <rect x="${sp.x - 36}" y="${sp.y - 17}" width="72" height="34" rx="9" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${dash}/>
          ${innerContent}
        </g>
      `;
    }).join('');

    const startLabelHtml = compact
      ? `<circle cx="240" cy="282" r="11" fill="#1d4ed8" stroke="#ffffff" stroke-width="2"/>
         <polygon points="240,256 233,266 247,266" fill="#2563eb"/>`
      : `<polygon points="240,253 233,263 247,263" fill="#2563eb"/>
         <rect x="176" y="268" width="128" height="26" rx="13" fill="#1e3a8a" stroke="#ffffff" stroke-width="2"/>
         <text x="240" y="285" text-anchor="middle" font-size="11.5" font-weight="800" fill="#ffffff" font-family="sans-serif">🧒 You are here</text>`;

    return `
      <rect x="0" y="0" width="480" height="304" rx="14" fill="#ecfdf5"/>
      <!-- 블록 잔디 구분선 -->
      <line x1="48" y1="137" x2="214" y2="137" stroke="#86efac" stroke-width="3" stroke-dasharray="6 5"/>
      <line x1="266" y1="137" x2="432" y2="137" stroke="#86efac" stroke-width="3" stroke-dasharray="6 5"/>
      <!-- 도로망 (가로 2블록길 y=68, 가로 1블록길 y=206, 중앙 세로길 x=240) -->
      <rect x="40" y="56" width="400" height="24" rx="6" fill="#94a3b8"/>
      <rect x="40" y="194" width="400" height="24" rx="6" fill="#94a3b8"/>
      <rect x="225" y="56" width="30" height="222" rx="6" fill="#94a3b8"/>
      <!-- 도로 중앙 점선 -->
      <line x1="52" y1="68" x2="428" y2="68" stroke="#f8fafc" stroke-width="1.8" stroke-dasharray="7 6"/>
      <line x1="52" y1="206" x2="428" y2="206" stroke="#f8fafc" stroke-width="1.8" stroke-dasharray="7 6"/>
      <line x1="240" y1="74" x2="240" y2="264" stroke="#f8fafc" stroke-width="1.8" stroke-dasharray="7 6"/>
      <!-- 큰 나무(big tree) 랜드마크: 2블록 위 삼거리 정면 -->
      <g id="map-landmark-big-tree">
        <ellipse cx="240" cy="49" rx="18" ry="5" fill="#bbf7d0"/>
        <rect x="236" y="34" width="8" height="16" rx="2" fill="#854d0e"/>
        <circle cx="240" cy="22" r="14" fill="#16a34a"/>
        <circle cx="229" cy="28" r="10" fill="#15803d"/>
        <circle cx="251" cy="28" r="10" fill="#22c55e"/>
        <circle cx="240" cy="17" r="7" fill="#4ade80"/>
      </g>
      <!-- 건물 자리 8곳 (A~H) -->
      ${plotsHtml}
      <!-- 출발점 -->
      ${startLabelHtml}
    `;
  }

  function createItemThumbnail(item) {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 80 80');
    svg.setAttribute('width', '58');
    svg.setAttribute('height', '58');
    svg.setAttribute('class', 'item-thumb-svg');
    svg.setAttribute('aria-hidden', 'true');

    if (item && item.slot === 'spot') {
      svg.innerHTML = buildSpotGraphic(item);
    } else {
      svg.innerHTML = PLACE_GRAPHICS[item && item.id] || PLACE_GRAPHICS['place-library'];
    }
    return svg;
  }

  function renderEmptyChipHtml(slot) {
    if (slot === 'spot') return '<span>📍 어느 자리?</span><span class="map-chip-sub">A~H 선택</span>';
    return '<span>🏛️ 어느 장소?</span><span class="map-chip-sub">그림 선택</span>';
  }

  function syncStageGraphics(stageEl) {
    if (!stageEl || !stageEl._mapState) return;
    const data = getSceneData();
    const spots = data.spots || [];
    const routes = data.routes || {};
    const { place, spot } = stageEl._mapState;
    const bothSolved = Boolean(place && spot);

    if (stageEl._baseLayer) {
      stageEl._baseLayer.innerHTML = buildBaseTownSvgMarkup(spots, {
        selectedSpotId: spot ? spot.id : '',
        placedPlaceId: bothSolved ? place.id : '',
        placedSpotId: bothSolved ? spot.id : ''
      });
    }

    if (stageEl._routeLayer) {
      stageEl._routeLayer.innerHTML = bothSolved
        ? buildRouteArrowSvg(routes[spot.id] || [], 6.5)
        : '';
    }
  }

  /**
   * 마지막 판 「도서관 찾아가기」 후보 지도 3장 생성
   * - 정답 1장(answerRoute) + 오답 2장(좌우 바뀐 경로, 한 블록 더 간 경로)
   */
  function buildFinaleCandidates(items, finaleQuestion) {
    const data = getSceneData();
    const routes = data.routes || {};
    const list = Array.isArray(items) ? items : [];
    const byId = {};
    list.forEach(it => { byId[it.id] = it; });

    const placeId = (finaleQuestion && finaleQuestion.placeId) || 'place-library';
    const answerRouteId = (finaleQuestion && finaleQuestion.answerRoute) || 'spot-G';
    const wrongSpecs = (finaleQuestion && Array.isArray(finaleQuestion.wrongRoutes) && finaleQuestion.wrongRoutes.length >= 2)
      ? finaleQuestion.wrongRoutes
      : [
          { kind: 'wrong-turn',  routeId: 'spot-F', label: '좌우 바뀐 경로 (spot F)' },
          { kind: 'extra-block', routeId: 'spot-C', label: '한 블록 더 간 경로 (spot C)' }
        ];

    return shuffleArray([
      {
        isAnswer: true,
        kind: 'answer',
        placeId,
        routeId: answerRouteId,
        route: (routes[answerRouteId] || []).map(pt => [...pt]),
        items: [byId[placeId], byId[answerRouteId]].filter(Boolean)
      },
      {
        isAnswer: false,
        kind: wrongSpecs[0].kind,
        placeId,
        routeId: wrongSpecs[0].routeId,
        route: (routes[wrongSpecs[0].routeId] || []).map(pt => [...pt]),
        items: [{ id: wrongSpecs[0].routeId, label: wrongSpecs[0].label || wrongSpecs[0].routeId }]
      },
      {
        isAnswer: false,
        kind: wrongSpecs[1].kind,
        placeId,
        routeId: wrongSpecs[1].routeId,
        route: (routes[wrongSpecs[1].routeId] || []).map(pt => [...pt]),
        items: [{ id: wrongSpecs[1].routeId, label: wrongSpecs[1].label || wrongSpecs[1].routeId }]
      }
    ]);
  }

  const mapScene = {
    name: 'map',
    slots: SLOTS,
    buildFinaleCandidates,

    renderStage: function(container) {
      container.innerHTML = '';
      const wrapper = document.createElement('div');
      wrapper.className = 'map-stage-wrapper';

      const statusBar = document.createElement('div');
      statusBar.className = 'map-status-bar';

      const slotPlace = document.createElement('div');
      slotPlace.id = 'slot-place';
      slotPlace.className = 'map-status-chip';
      slotPlace.setAttribute('data-slot', 'place');
      slotPlace.innerHTML = renderEmptyChipHtml('place');

      const slotSpot = document.createElement('div');
      slotSpot.id = 'slot-spot';
      slotSpot.className = 'map-status-chip';
      slotSpot.setAttribute('data-slot', 'spot');
      slotSpot.innerHTML = renderEmptyChipHtml('spot');

      statusBar.appendChild(slotPlace);
      statusBar.appendChild(slotSpot);

      const canvasWrap = document.createElement('div');
      canvasWrap.className = 'map-canvas-wrap';

      const svg = document.createElementNS(SVG_NS, 'svg');
      svg.setAttribute('viewBox', '0 0 480 304');
      svg.setAttribute('class', 'map-town-svg');
      svg.setAttribute('aria-hidden', 'true');

      const baseLayer = document.createElementNS(SVG_NS, 'g');
      baseLayer.setAttribute('id', 'map-base-layer');

      const routeLayer = document.createElementNS(SVG_NS, 'g');
      routeLayer.setAttribute('id', 'map-route-layer');

      svg.appendChild(baseLayer);
      svg.appendChild(routeLayer);
      canvasWrap.appendChild(svg);

      wrapper.appendChild(statusBar);
      wrapper.appendChild(canvasWrap);

      wrapper._mapState = { place: null, spot: null };
      wrapper._slotEls = { place: slotPlace, spot: slotSpot };
      wrapper._baseLayer = baseLayer;
      wrapper._routeLayer = routeLayer;

      syncStageGraphics(wrapper);
      container.appendChild(wrapper);
      return wrapper;
    },

    renderItem: function(item) {
      const card = document.createElement('div');
      card.className = 'dressup-item-card map-item-card';
      card.setAttribute('data-item-id', item.id);
      card.setAttribute('data-slot', item.slot);
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute(
        'aria-label',
        item.slot === 'spot' ? `위치 표지 ${item.spotLetter || item.id}` : '장소 그림 카드'
      );

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
      if (!stageEl._mapState) stageEl._mapState = { place: null, spot: null };
      stageEl._mapState[slotKey] = item;

      const chipEl = (stageEl._slotEls && stageEl._slotEls[slotKey])
        || (stageEl.querySelector ? stageEl.querySelector('#slot-' + slotKey) : null);

      if (chipEl) {
        if (slotKey === 'spot') {
          const letter = item.spotLetter || String(item.id || '').replace('spot-', '');
          chipEl.innerHTML = `<span>📍 위치 <strong>${escapeHtml(letter)}</strong></span><span class="map-chip-sub">${escapeHtml(item.desc || '')}</span>`;
        } else {
          chipEl.innerHTML = `<span>🏛️ <strong>${escapeHtml(item.label || '')}</strong></span><span class="map-chip-sub">${escapeHtml(item.desc || '')}</span>`;
        }
        if (chipEl.classList) {
          chipEl.classList.add('slot-filled', 'slot-applied-pop');
        }
      }

      syncStageGraphics(stageEl);
    },

    reset: function(stageEl) {
      if (!stageEl) return;
      stageEl._mapState = { place: null, spot: null };
      SLOTS.forEach(slotKey => {
        const chipEl = (stageEl._slotEls && stageEl._slotEls[slotKey])
          || (stageEl.querySelector ? stageEl.querySelector('#slot-' + slotKey) : null);
        if (chipEl) {
          chipEl.innerHTML = renderEmptyChipHtml(slotKey);
          if (chipEl.classList) chipEl.classList.remove('slot-filled', 'slot-applied-pop');
        }
      });
      syncStageGraphics(stageEl);
    },

    renderFinaleStage: function(container, candidates, onSelect) {
      container.innerHTML = '';
      const data = getSceneData();
      const spots = data.spots || [];
      const finaleGrid = document.createElement('div');
      finaleGrid.className = 'dressup-finale-grid map-finale-grid';

      (candidates || []).forEach((cand, idx) => {
        const card = document.createElement('div');
        card.className = 'finale-person-card map-finale-card';
        card.setAttribute('data-candidate-idx', idx);
        card.setAttribute('data-route-id', cand.routeId || '');
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        card.setAttribute('aria-label', `후보 지도 ${idx + 1}`);

        const baseMarkup = buildBaseTownSvgMarkup(spots, {
          selectedSpotId: cand.routeId,
          placedPlaceId: cand.placeId || 'place-library',
          placedSpotId: cand.routeId,
          compact: true
        });
        const arrowMarkup = buildRouteArrowSvg(cand.route || [], 9);

        card.innerHTML = `
          <div class="finale-person-tag">지도 ${idx + 1}</div>
          <div class="map-finale-svg-wrap">
            <svg viewBox="0 0 480 304" class="map-finale-svg" aria-hidden="true">
              ${baseMarkup}
              ${arrowMarkup}
            </svg>
          </div>
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
    window.EnglishListenPlace.registerScene('map', mapScene);
  } else {
    window._PENDING_SCENES = window._PENDING_SCENES || {};
    window._PENDING_SCENES['map'] = mapScene;
  }
})();
