// ==========================================
// 🔬 과학 교과 데이터 스켈레톤 (science-data.js)
// ==========================================
// 💡 [클린 아키텍처 Headless CMS 원칙]
// 전체 교육 콘텐츠는 노션 VOCA_DB 및 CURRICULUM_DB에서 실시간 동적 송출됩니다.
// 본 파일은 네트워크 오프라인 시 UI 깨짐을 방어하기 위한 최소 스켈레톤 템플릿입니다.
// 원본 대용량 데이터는 kids/data/legacy_backup/science-data.js에 영구 보존되어 있습니다.

const SCIENCE_CURRICULUM_DATA = [
  {
    "grade": "5학년 1학기",
    "unit": "1단원",
    "title": "1. 과학 탐구와 물질의 성질",
    "voca": [
      {
        "word": "혼합물",
        "hint": "ㅎㅎㅁ",
        "meaning": "두 가지 이상의 순수한 물질이 성질을 잃지 않고 섞여 있는 물질입니다.",
        "desc": "콩과 팥, 소금물처럼 서로 다른 물질이 섞여 있는 것을 말해요.",
        "img": "https://raw.githubusercontent.com/awslike6-web/kids-archive/main/assets/storybook/science/minsu/5-1/1/science_mix_ill_p1.png"
      },
      {
        "word": "분리",
        "hint": "ㅂㄹ",
        "meaning": "섞여 있는 여러 물질을 각 물질의 성질 차이를 이용해 따로따로 나누는 것입니다.",
        "desc": "물질마다 알갱이의 크기나 성질이 다르기 때문에 이를 이용해 분리할 수 있어요.",
        "img": "https://raw.githubusercontent.com/awslike6-web/kids-archive/main/assets/storybook/science/minsu/5-1/1/science_mix_ill_p3.png"
      }
    ]
  },
  {
    "grade": "5학년 2학기",
    "unit": "3단원",
    "title": "3. 날씨와 계절의 변화",
    "voca": [
      {
        "word": "습도",
        "hint": "ㅅㄷ",
        "meaning": "공기 중에 수증기가 얼마나 포함되어 있는지를 나타내는 정도입니다.",
        "desc": "건습구 습도계를 이용해 공기 중의 습도를 측정할 수 있어요.",
        "img": "https://raw.githubusercontent.com/awslike6-web/kids-archive/main/assets/storybook/science/minsu/5-2/3/storybook/p1.png"
      }
    ]
  }
];

if (typeof window !== 'undefined') {
  window.SCIENCE_CURRICULUM_DATA = SCIENCE_CURRICULUM_DATA;
}
