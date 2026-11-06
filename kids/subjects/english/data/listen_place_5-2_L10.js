// kids/subjects/english/data/listen_place_5-2_L10.js
// 🕖 영어 5-2 10단원 (하루 일과와 시각) 「하루 시간표 채우기」 데이터 모듈
// - 문장 글자와 뜻은 노션 VOCA_DB에서 pageId로 실시간 매칭합니다.
// - 시각 카드는 시×60+분(minutes) 값을 가지며, 밤 카드는 id: 'time-night'로 minutes가 없습니다.

window.LISTEN_PLACE_SCENE = {
  scene: 'timeline',
  trayGuide: '아래 그림을 누르거나 시간표 칸으로 끌어다 놓으세요',
  grade: '5-2',
  unit: 'L10',
  badge: '⭐ 5-2 10단원 특별 활동',
  title: '하루 시간표 채우기',
  subtitle: '문장을 잘 듣고 알맞은 활동 그림과 시각을 시간표에 놓아 보세요!',
  completeTitle: '10단원 하루 시간표 완주!',
  completeSubtitle: '하루 일과와 시각 문장을 귀담아듣고 시간표를 멋지게 완성했어요!',
  finaleBadge: '👑 마지막 미션: 얼리버드는 누구?',
  finalePrompt: '🔎 들려주는 말(early bird / night owl)에 어울리는 하루 시간표 친구를 터치하세요!',
  guideItems: [
    '🎧 <strong>문장 듣기</strong>: 원어민 발음으로 하루 일과 문장을 들어요',
    '🕖 <strong>시간표 채우기</strong>: 활동 그림과 시계 카드를 끌거나 <strong>눌러서</strong> 놓아요',
    '🦉 <strong>얼리버드는 누구?</strong>: 마지막 판에서 시간표가 설명에 맞는 친구를 찾아요'
  ],

  // 받침대에 나올 물건 전체 목록 (활동 6종 + 시각 6종 + 헷갈리는 시각 오답 보충 4종)
  items: [
    // 1. 활동 (slot: 'activity') — 정답 전에는 그림만 보이고 맞힌 뒤 영어 글자(label) 표시
    { id: 'act-get-up',        slot: 'activity', label: 'get up',         desc: '일어나기' },
    { id: 'act-eat-breakfast', slot: 'activity', label: 'eat breakfast',  desc: '아침 먹기' },
    { id: 'act-exercise',      slot: 'activity', label: 'exercise',       desc: '운동하기' },
    { id: 'act-play-piano',    slot: 'activity', label: 'play the piano', desc: '피아노 치기' },
    { id: 'act-go-to-bed',     slot: 'activity', label: 'go to bed',      desc: '잠자리에 들기' },
    { id: 'act-read-books',    slot: 'activity', label: 'read books',     desc: '책 읽기' },

    // 2. 시각 (slot: 'time') — 아날로그 시계 바늘(minutes = 시×60+분) + 숫자 표시, 밤 카드는 minutes 없음
    { id: 'time-600',   slot: 'time', label: 'at 6',     desc: '6:00',   minutes: 360, confusable: ['time-630', 'time-700'] },
    { id: 'time-700',   slot: 'time', label: 'at 7',     desc: '7:00',   minutes: 420, confusable: ['time-750', 'time-600'] },
    { id: 'time-750',   slot: 'time', label: 'at 7:50',  desc: '7:50',   minutes: 470, confusable: ['time-700', 'time-800'] },
    { id: 'time-430',   slot: 'time', label: 'at 4:30',  desc: '4:30',   minutes: 270, confusable: ['time-400', 'time-630'] },
    { id: 'time-900',   slot: 'time', label: 'at 9',     desc: '9:00',   minutes: 540, confusable: ['time-800', 'time-1000'] },
    { id: 'time-night', slot: 'time', label: 'at night', desc: '밤(🌙)', confusable: ['time-900', 'time-1000'] },

    // 3. 헷갈리는 시각 오답 카드 (7:00↔7:50, 4:30↔4:00 등 듣기 변별용)
    { id: 'time-400',   slot: 'time', label: 'at 4',     desc: '4:00',   minutes: 240 },
    { id: 'time-630',   slot: 'time', label: 'at 6:30',  desc: '6:30',   minutes: 390 },
    { id: 'time-800',   slot: 'time', label: 'at 8',     desc: '8:00',   minutes: 480 },
    { id: 'time-1000',  slot: 'time', label: 'at 10',    desc: '10:00',  minutes: 600 }
  ],

  // 10단원 문제 목록: 노션 VOCA_DB의 실제 pageId 매핑 (일반 6문장 + 마지막 판 숙어 2종 중 무작위 1개)
  questions: [
    // [하루 일과 + 시각 6문장]
    { pageId: '3fea2711-5b68-81d4-b31b-d872af641716', answer: ['act-get-up', 'time-600'] },        // I get up at 6.
    { pageId: '3fea2711-5b68-81a3-aeea-f5c66d1da3fc', answer: ['act-eat-breakfast', 'time-700'] }, // I eat breakfast at 7.
    { pageId: '3fea2711-5b68-8184-af1d-cd7afa3b9bdd', answer: ['act-exercise', 'time-750'] },      // I exercise at 7:50.
    { pageId: '3fea2711-5b68-8187-b106-ce3ed53dd111', answer: ['act-play-piano', 'time-430'] },    // I play the piano at 4:30.
    { pageId: '3fea2711-5b68-81bf-9236-c4fe5515bc07', answer: ['act-go-to-bed', 'time-900'] },     // I go to bed at 9.
    { pageId: '3fea2711-5b68-81c1-b647-ee3074d35d9f', answer: ['act-read-books', 'time-night'] },  // I read books at night.

    // [마지막 판 「얼리버드는 누구?」 숙어 2종 — 매 판 무작위로 1개 출제]
    { pageId: '40ca2711-5b68-8186-8c8d-df76ecc9cf44', finale: true, finaleKind: 'early' },         // early bird
    { pageId: '40ca2711-5b68-8190-af64-ca495e76b682', finale: true, finaleKind: 'night' }          // night owl
  ]
};
