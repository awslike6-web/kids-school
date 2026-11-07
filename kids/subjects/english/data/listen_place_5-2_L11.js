// kids/subjects/english/data/listen_place_5-2_L11.js
// 🧭 영어 5-2 11단원 (위치 묻고 길 안내하기) 「마을 길 찾기」 데이터 모듈
// - 문장 글자와 뜻은 노션 VOCA_DB(5-2 · L11)에서 pageIds로 이어 붙여 실시간 매칭합니다.
// - 문장을 쪼개 방향을 해석하지 않고(헌법 §7-9), 지도 좌표(spots·routes)와 정답을 데이터에 명시합니다.

window.LISTEN_PLACE_SCENE = {
  scene: 'map',
  trayGuide: '아래 그림을 누르거나 지도 위 자리로 끌어다 놓으세요',
  grade: '5-2',
  unit: 'L11',
  badge: '⭐ 5-2 11단원 특별 활동',
  title: '마을 길 찾기',
  subtitle: '길 안내 문장을 잘 듣고 장소 그림과 지도 위 위치 표지를 놓아 보세요!',
  completeTitle: '11단원 마을 길 찾기 완주!',
  completeSubtitle: '길 안내 문장을 귀담아듣고 마을의 모든 장소를 멋지게 찾았어요!',
  finaleBadge: '👑 마지막 미션: 도서관 찾아가기',
  finalePrompt: '🔎 안내 문장을 잘 듣고 그 경로대로 화살표가 그려진 지도를 터치하세요!',
  guideItems: [
    '🎧 <strong>길 안내 듣기</strong>: 어디에 있는지 묻고 답하는 문장을 이어서 들어요',
    '🏛️ <strong>장소 + 위치 놓기</strong>: 장소 그림과 지도 위 자리(A~H) 표지를 골라 놓아요',
    '🧭 <strong>경로 확인 & 마지막 판</strong>: 둘 다 맞히면 길 화살표가 나타나고, 마지막에 정답 지도를 찾아요'
  ],

  // 마을 지도 위 건물 자리 8곳 (viewBox 0 0 480 304 기준: 2블록 위 가로길 y=68, 1블록 위 가로길 y=206)
  spots: [
    { id: 'spot-A', label: 'A', x: 114, y: 28,  walkY: 56  }, // 2블록 직진 → 좌회전 → 오른쪽(북쪽)
    { id: 'spot-B', label: 'B', x: 114, y: 108, walkY: 80  }, // 2블록 직진 → 좌회전 → 왼쪽(남쪽)
    { id: 'spot-C', label: 'C', x: 366, y: 28,  walkY: 56  }, // 큰 나무(2블록) → 우회전 → 왼쪽(북쪽)
    { id: 'spot-D', label: 'D', x: 366, y: 108, walkY: 80  }, // 큰 나무(2블록) → 우회전 → 오른쪽(남쪽)
    { id: 'spot-E', label: 'E', x: 114, y: 166, walkY: 194 }, // 1블록 직진 → 좌회전 → 오른쪽(북쪽)
    { id: 'spot-F', label: 'F', x: 114, y: 246, walkY: 218 }, // 1블록 직진 → 좌회전 → 왼쪽(남쪽)
    { id: 'spot-G', label: 'G', x: 366, y: 166, walkY: 194 }, // 1블록 직진 → 우회전 → 왼쪽(북쪽)
    { id: 'spot-H', label: 'H', x: 366, y: 246, walkY: 218 }  // 1블록 직진 → 우회전 → 오른쪽(남쪽)
  ],

  // 출발점(240, 270)에서 각 자리 입구까지 도로 중심선을 따라가는 경로 화살표 좌표
  routes: {
    'spot-A': [[240, 270], [240, 68],  [114, 68],  [114, 50]],
    'spot-B': [[240, 270], [240, 68],  [114, 68],  [114, 86]],
    'spot-C': [[240, 270], [240, 68],  [366, 68],  [366, 50]],
    'spot-D': [[240, 270], [240, 68],  [366, 68],  [366, 86]],
    'spot-E': [[240, 270], [240, 206], [114, 206], [114, 188]],
    'spot-F': [[240, 270], [240, 206], [114, 206], [114, 224]],
    'spot-G': [[240, 270], [240, 206], [366, 206], [366, 188]],
    'spot-H': [[240, 270], [240, 206], [366, 206], [366, 224]]
  },

  // 받침대 물건 목록: 장소 카드 9종(그림만, 영어 글자는 맞힌 뒤) + 위치 표지 8종(좌우 반전 오답 confusable 우선)
  items: [
    { id: 'place-library',        slot: 'place', label: 'library',        desc: '도서관' },
    { id: 'place-restaurant',     slot: 'place', label: 'restaurant',     desc: '식당' },
    { id: 'place-bank',           slot: 'place', label: 'bank',           desc: '은행' },
    { id: 'place-hospital',       slot: 'place', label: 'hospital',       desc: '병원' },
    { id: 'place-flower-shop',    slot: 'place', label: 'flower shop',    desc: '꽃집' },
    { id: 'place-park',           slot: 'place', label: 'park',           desc: '공원' },
    { id: 'place-school',         slot: 'place', label: 'school',         desc: '학교' },
    { id: 'place-candy-shop',     slot: 'place', label: 'candy shop',     desc: '사탕 가게' },
    { id: 'place-ice-cream-shop', slot: 'place', label: 'ice cream shop', desc: '아이스크림 가게' },

    { id: 'spot-A', slot: 'spot', spotLetter: 'A', label: 'spot A', desc: 'A 자리', confusable: ['spot-B', 'spot-D'] },
    { id: 'spot-B', slot: 'spot', spotLetter: 'B', label: 'spot B', desc: 'B 자리', confusable: ['spot-A', 'spot-C'] },
    { id: 'spot-C', slot: 'spot', spotLetter: 'C', label: 'spot C', desc: 'C 자리', confusable: ['spot-D', 'spot-B'] },
    { id: 'spot-D', slot: 'spot', spotLetter: 'D', label: 'spot D', desc: 'D 자리', confusable: ['spot-C', 'spot-A'] },
    { id: 'spot-E', slot: 'spot', spotLetter: 'E', label: 'spot E', desc: 'E 자리', confusable: ['spot-F', 'spot-H'] },
    { id: 'spot-F', slot: 'spot', spotLetter: 'F', label: 'spot F', desc: 'F 자리', confusable: ['spot-E', 'spot-G'] },
    { id: 'spot-G', slot: 'spot', spotLetter: 'G', label: 'spot G', desc: 'G 자리', confusable: ['spot-H', 'spot-F'] },
    { id: 'spot-H', slot: 'spot', spotLetter: 'H', label: 'spot H', desc: 'H 자리', confusable: ['spot-G', 'spot-E'] }
  ],

  // 노션 VOCA_DB(5-2 · L11) 문장 행 조합 (일반 5문제 + 마지막 판 「도서관 찾아가기」 1문제)
  questions: [
    {
      // Where is the library? Go straight and turn right at the big tree. It's on your left.
      pageIds: [
        '411a2711-5b68-815b-8d68-eff417bbe33e',
        '411a2711-5b68-8158-b527-f2a773d7e008',
        '411a2711-5b68-8176-a8ab-cc6403486c43'
      ],
      answer: ['place-library', 'spot-C']
    },
    {
      // Where is the restaurant? Go straight one block and turn right. It's on your right.
      pageIds: [
        '411a2711-5b68-8193-84ed-cc6b8a50cbe1',
        '411a2711-5b68-8150-8796-e7d41af7d022',
        '411a2711-5b68-81fe-84ac-e6979bc045d4'
      ],
      answer: ['place-restaurant', 'spot-H']
    },
    {
      // Where is the bank? Go straight two blocks and turn left. It's on your right.
      pageIds: [
        '411a2711-5b68-81a0-9c5c-d2b5222e558f',
        '411a2711-5b68-8174-872c-d9b89639b38d',
        '411a2711-5b68-81fe-84ac-e6979bc045d4'
      ],
      answer: ['place-bank', 'spot-A']
    },
    {
      // Where is the hospital? Go straight one block and turn right. It's on your left.
      pageIds: [
        '411a2711-5b68-81f4-ac58-c232c502fc7c',
        '411a2711-5b68-8150-8796-e7d41af7d022',
        '411a2711-5b68-8176-a8ab-cc6403486c43'
      ],
      answer: ['place-hospital', 'spot-G']
    },
    {
      // Where is the flower shop? Go straight two blocks and turn left. It's on your left.
      pageIds: [
        '411a2711-5b68-81ef-8bb9-e68b4a44983a',
        '411a2711-5b68-8174-872c-d9b89639b38d',
        '411a2711-5b68-8176-a8ab-cc6403486c43'
      ],
      answer: ['place-flower-shop', 'spot-B']
    },
    {
      // [마지막 판 「도서관 찾아가기」] Where is the library? Go straight one block and turn right. It's on your left.
      pageIds: [
        '411a2711-5b68-815b-8d68-eff417bbe33e',
        '411a2711-5b68-8150-8796-e7d41af7d022',
        '411a2711-5b68-8176-a8ab-cc6403486c43'
      ],
      finale: true,
      placeId: 'place-library',
      answerRoute: 'spot-G',
      wrongRoutes: [
        { kind: 'wrong-turn',  routeId: 'spot-F', label: '좌우 바뀐 경로 (spot F)' },
        { kind: 'extra-block', routeId: 'spot-C', label: '한 블록 더 간 경로 (spot C)' }
      ]
    }
  ]
};
