// ==========================================
// 🔤 영어 독해 데이터 스켈레톤 (english-reading-data.js)
// ==========================================
// 💡 [클린 아키텍처 Headless CMS 원칙]
// 전체 영어 리딩 콘텐츠는 노션 VOCA_DB 및 CURRICULUM_DB에서 실시간 동적 송출됩니다.
// 원본 대용량 데이터는 kids/data/legacy_backup/english-reading-data.js에 영구 보존되어 있습니다.

const ENGLISH_READING_DATABASE = [
  {
    "id": "eng_l7_01",
    "grade": "5학년",
    "lesson": "Lesson 7",
    "title": "Where is the Museum?",
    "sentence": "Go straight and turn left at the corner.",
    "meaning": "직진해서 모퉁이에서 왼쪽으로 도세요.",
    "words": [
      { "en": "straight", "ko": "곧장, 직진" },
      { "en": "turn", "ko": "돌다, 방향을 바꾸다" }
    ]
  }
];

if (typeof window !== 'undefined') {
  window.ENGLISH_READING_DATABASE = ENGLISH_READING_DATABASE;
}
