// kids/subjects/english/data/english_unit_activities.js
// ⭐ 영어방 「이번 단원 특별 활동」 등록표
// - 영어방은 6단계 사다리(활동 순서)가 뼈대이고, 위의 단원 칩으로 단원을 고른다.
// - 그 단원에만 맞는 특별 활동이 있을 때만 여기에 한 줄을 추가한다. 없는 단원은 칸이 보이지 않는다.
// - 학기·단원 값은 노션 VOCA_DB의 「학년」·「단원」 원문과 똑같이 쓴다 (예: grade '5-2', unit 'L8').
// - href는 english.html 기준 상대 경로. 단원 값은 화면이 ?grade=&unit= 으로 붙여 넘긴다.
// - 등록 기준: ① 그 단원 클래스 카드의 핵심 문장을 그대로 연습한다 ② 데이터만 바꿔 두 단원 이상에 쓸 수 있는 엔진이다.
//
// - 활동 화면이 더 필요한 값(예: Listen & Place의 scene 파일 경로)은 같은 줄에 덧붙인다. 단원 칩 바는 모르는 칸을 무시한다.
//
// 항목 형식:
//   { grade: '5-2', unit: 'L8', icon: '👕', title: '친구 옷 입혀 주기', desc: '문장을 듣고 옷과 머리를 끌어다 입혀요',
//     href: 'listen_place.html', scene: 'data/listen_place_5-2_L8.js' }

window.ENGLISH_UNIT_ACTIVITIES = [
  { grade: '5-2', unit: 'L8', icon: '👕', title: '친구 옷 입혀 주기', desc: '문장을 듣고 옷과 머리를 끌어다 입혀요', href: 'listen_place.html', scene: 'data/listen_place_5-2_L8.js' }
];
