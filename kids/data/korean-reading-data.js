// ==========================================
// 📖 국어 독해 교과 데이터 스켈레톤 (korean-reading-data.js)
// ==========================================
// 💡 [클린 아키텍처 Headless CMS 원칙]
// 전체 국어 독해 지문과 퀘스트는 노션 CURRICULUM_DB에서 실시간 동적 송출됩니다.
// 원본 대용량 데이터는 kids/data/legacy_backup/korean-reading-data.js에 영구 보존되어 있습니다.

const KOREAN_READING_DATABASE = [
  {
    "id": "book_5_2_01",
    "grade": "5-2",
    "unit": "1단원",
    "unitTitle": "1. 마음을 나누며 가꾸어요",
    "title": "민수의 따뜻한 말 한마디 (공감의 힘)",
    "fullText": "미술 시간에 짝꿍 준우가 실수로 도화지에 물을 쏟고 말았습니다.\n정성껏 그리던 그림이 번지자 준우는 속상해서 울음을 터뜨릴 것 같았습니다.\n민수는 당황하지 않고 다가가 '많이 속상하지? 내가 깨끗한 휴지를 가져올게.'라며 준우의 등을 토닥여 주었습니다.\n준우는 민수의 따뜻한 말 덕분에 용기를 내어 다시 멋진 그림을 완성할 수 있었습니다.",
    "paragraphs": [
      { "id": "p1", "label": "A", "text": "미술 시간에 짝꿍 준우가 실수로 도화지에 물을 쏟고 말았습니다." },
      { "id": "p2", "label": "B", "text": "정성껏 그리던 그림이 번지자 준우는 속상해서 울음을 터뜨릴 것 같았습니다." },
      { "id": "p3", "label": "C", "text": "민수는 다가가 '많이 속상하지? 내가 깨끗한 휴지를 가져올게.'라며 등을 토닥여 주었습니다." },
      { "id": "p4", "label": "D", "text": "준우는 민수의 따뜻한 말 덕분에 용기를 내어 다시 멋진 그림을 완성할 수 있었습니다." }
    ],
    "correctOrder": ["p1", "p2", "p3", "p4"],
    "conjunctions": [
      {
        "sentenceBefore": "준우는 실수로 도화지에 물을 쏟고 말았습니다.",
        "sentenceAfter": "정성껏 그리던 그림이 번져서 너무 속상했습니다.",
        "options": ["그래서", "하지만", "왜냐하면"],
        "answer": "그래서",
        "commentary": "물을 쏟은 일(원인) 때문에 속상해졌으니 원인과 결과를 이어주는 '그래서'가 알맞아요!"
      }
    ]
  }
];

if (typeof window !== 'undefined') {
  window.KOREAN_READING_DATABASE = KOREAN_READING_DATABASE;
}
