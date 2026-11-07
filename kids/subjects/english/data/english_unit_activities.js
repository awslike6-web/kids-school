// kids/subjects/english/data/english_unit_activities.js
// kids/subjects/english/data/english_unit_activities.js 「이번 단원 특별 활동」 등록표
// - 영어방은 6단계 사다리(활동 순서)가 뼈대이고, 위의 단원 칩으로 단원을 고른다.
// - 그 단원에만 맞는 특별 활동이 있을 때만 여기에 한 줄을 추가한다. 없는 단원은 칸이 보이지 않는다.
// - 학기·단원 값은 노션 VOCA_DB의 「학년」·「단원」 원문과 똑같이 쓴다 (예: grade '5-2', unit 'L8').
// - href는 english.html 기준 상대 경로이고 주소값 없이 쓴다. 단원 칩 바가 ?grade=&unit= 을 붙여 연다.
// - 등록 기준: ① 그 단원 클래스 카드의 핵심 문장을 그대로 연습한다 ② 데이터만 바꿔 두 단원 이상에 쓸 수 있는 엔진이다.
// - 활동 화면이 더 필요한 값(예: Listen & Place의 scene 파일 경로)은 같은 항목에 덧붙인다. 단원 칩 바는 모르는 칸을 무시한다.

window.ENGLISH_UNIT_ACTIVITIES = [
  {
    grade: '5-2',
    unit: 'L8',
    title: '친구 옷 입혀 주기',
    desc: '문장을 듣고 머리와 옷을 입혀요',
    icon: '👗',
    href: 'listen_place.html',
    scene: 'data/listen_place_5-2_L8.js'
  },
  {
    grade: '5-2',
    unit: 'L10',
    title: '하루 시간표 채우기',
    desc: '문장을 듣고 활동과 시각을 놓아요',
    icon: '🕖',
    href: 'listen_place.html',
    scene: 'data/listen_place_5-2_L10.js'
  },
  {
    grade: '5-2',
    unit: 'L11',
    title: '마을 길 찾기',
    desc: '길 안내를 듣고 장소와 위치를 찾아요',
    icon: '🧭',
    href: 'listen_place.html',
    scene: 'data/listen_place_5-2_L11.js'
  }
];
