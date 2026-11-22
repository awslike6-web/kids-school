// kids/subjects/english/data/classcard_5-2_L11.js
// 🃏 영어 5-2 11단원 「클래스카드 연습」 카드 묶음 (엔진: kids/js/english_classcard*.js)
// - 담임 선생님 클래스카드 세트를 글자 그대로 옮긴다. 아이가 실제 시험에서 보는 글자와 같아야 헷갈리지 않는다.
//   VOCA_DB 11단원(60행, 교과·클래스카드 뜻 병기)과 일부러 따로 둔다 (2026-11-22 사용자 결정: 클래스카드 단어만 온전히).
// - 뜻(ko)은 클래스카드 원문. 예: go straight = 「성실히 살다, 갱생하다」(선생님이 고치기 전까지 그대로, 2026-11-22 사용자 지시).
// - say: 화면 글자와 읽을 글자가 다를 때만 쓴다 ({2}·/·~ 같은 클래스카드 표기). 없으면 en을 그대로 읽는다.
// - 선생님이 카드를 고치면 이 파일의 글자만 고친다. id는 바꾸지 않는다 (별표·문항기록 키 s:cc-5-2-L11:<id>).
// - 새 단원은 이 파일을 본떠 classcard_<학년>_L<단원>.js를 만들고 english_unit_activities.js에 한 줄 추가한다.

window.CLASSCARD_DECK = {
  grade: '5-2',
  unit: 'L11',
  title: '5-2 Lesson 11',
  source: '담임 클래스카드 · 미래엔 강정진 (2022 개정)',
  sections: [
    { id: 1, label: '1구간' },
    { id: 2, label: '2구간' },
    { id: 3, label: '3구간' }
  ],
  items: [
    { id: 1,  section: 1, en: 'bank', ko: '은행' },
    { id: 2,  section: 1, en: 'flower shop', ko: '꽃 가게' },
    { id: 3,  section: 1, en: 'hospital', ko: '병원' },
    { id: 4,  section: 1, en: 'library', ko: '도서관' },
    { id: 5,  section: 1, en: 'park', ko: '공원' },
    { id: 6,  section: 1, en: 'restaurant', ko: '식당' },
    { id: 7,  section: 1, en: 'museum', ko: '박물관' },
    { id: 8,  section: 1, en: 'candy shop', ko: '사탕가게' },
    { id: 9,  section: 1, en: 'market', ko: '[명] 시장' },
    { id: 10, section: 1, en: 'bookstore', ko: '[명] 서점' },

    { id: 11, section: 2, en: 'post office', ko: '우체국' },
    { id: 12, section: 2, en: 'police station', ko: '경찰서' },
    { id: 13, section: 2, en: 'school', ko: '[명] 학교' },
    { id: 14, section: 2, en: 'bus stop', ko: '버스 정류장' },
    { id: 15, section: 2, en: 'subway station', ko: '지하철역' },
    { id: 16, section: 2, en: 'place', ko: '[명] 장소' },
    { id: 17, section: 2, en: 'block', ko: '[명] 블록' },
    { id: 18, section: 2, en: 'go straight', ko: '성실히 살다, 갱생하다' },
    { id: 19, section: 2, en: 'turn left', ko: '왼편을 향하다' },
    { id: 20, section: 2, en: 'turn right', ko: '오른쪽으로 방향을 바꾸다' },

    { id: 21, section: 3, en: 'on your right', ko: '너의 오른쪽에' },
    { id: 22, section: 3, en: 'on your left', ko: '너의 왼쪽에' },
    { id: 23, section: 3, en: 'in front of', ko: '~앞에' },
    { id: 24, section: 3, en: 'next to', ko: '~옆에' },
    { id: 25, section: 3, en: 'behind', ko: '[전] ~의 뒤에, ~보다 늦은' },
    { id: 26, section: 3, en: 'corner', ko: '[명] 모서리, 길모퉁이, 구석' },
    { id: 27, section: 3, en: 'eight', ko: '[명] 여덟 / [형] 여덟의' },
    { id: 28, section: 3, en: 'tonight', ko: '[부] 오늘 밤에 / [명] 오늘 밤' },
    { id: 29, section: 3, en: 'festival', ko: '[명] 축제' },
    { id: 30, section: 3, en: 'between A and B', ko: 'A와 B 사이에' },
    { id: 31, section: 3, en: 'Where is the~?', say: 'Where is the?', ko: '[장소]은 어디에 있어요?' },
    { id: 32, section: 3, en: 'go straight {2} blocks', say: 'go straight two blocks', ko: '곧장 두 블록 가요' },
    { id: 33, section: 3, en: "It's on your left/right.", say: "It's on your left or right.", ko: '왼/오른편에 있어요' },
    { id: 34, section: 3, en: "It's next to the ~", say: "It's next to the", ko: '~ 옆에 있어요.' }
  ]
};
