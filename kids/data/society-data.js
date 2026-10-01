// ==========================================
// 🗺️ 사회 교과 데이터 스켈레톤 (society-data.js)
// ==========================================
// 💡 [클린 아키텍처 Headless CMS 원칙]
// 전체 사회 교과 콘텐츠는 노션 CURRICULUM_DB에서 실시간 동적 송출됩니다.
// 본 파일은 네트워크 오프라인 시 UI 깨짐을 방어하기 위한 최소 스켈레톤 템플릿입니다.
// 원본 대용량 데이터는 kids/data/legacy_backup/society-data.js에 영구 보존되어 있습니다.

const SOCIETY_CURRICULUM_DATA = {
  "5학년 1학기": {
    "1-1. 우리나라의 지형": {
      "unitTitle": "1-1. 우리나라의 지형",
      "summaryPassage": "우리나라는 동쪽이 높고 서쪽이 낮은 동고서저 지형을 이루고 있습니다. 아름다운 산과 강, 평야가 조화를 이루며 독도와 소중한 영토를 함께 배웁니다.",
      "voca": [
        {
          "word": "지형",
          "hint": "ㅈㅎ",
          "desc": "산, 평야, 하천, 해안 등 땅의 생김새를 통틀어 지형이라고 합니다.",
          "meaning": "땅의 높낮이나 겉모양의 특징"
        },
        {
          "word": "동고서저",
          "hint": "ㄷㄱㅅㅈ",
          "desc": "우리나라 지형의 가장 큰 특징으로, 동쪽은 높고 서쪽은 낮음을 의미합니다.",
          "meaning": "동쪽은 높은 산지, 서쪽은 낮은 평야가 많은 지형"
        }
      ],
      "chart": [],
      "map": [],
      "history": []
    }
  }
};

if (typeof window !== 'undefined') {
  window.SOCIETY_CURRICULUM_DATA = SOCIETY_CURRICULUM_DATA;
}
