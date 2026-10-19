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
    "title": "3. 열과 우리 생활",
    "voca": [
      {
        "word": "온도",
        "hint": "ㅇㄷ",
        "meaning": "물체의 따뜻하거나 차가운 정도를 숫자로 정확하게 나타낸 것이에요 (단위: ℃, 섭씨도)",
        "desc": "물체의 따뜻하거나 차가운 정도를 나타내는 물리량입니다.",
        "img": "https://raw.githubusercontent.com/awslike6-web/kids-archive/main/assets/storybook/science/minsu/5-2/3/science_temp_ill_p2.jpg"
      },
      {
        "word": "전도",
        "hint": "ㅈㄷ",
        "meaning": "고체 물질에서 온도가 높은 부분에서 온도가 낮은 부분으로 열이 차례대로 옮겨가는 이동 방식이에요",
        "desc": "고체에서 열이 전달되는 주된 방식입니다.",
        "img": "https://raw.githubusercontent.com/awslike6-web/kids-archive/main/assets/storybook/science/minsu/5-2/3/science_temp_ill_p5.jpg"
      },
      {
        "word": "대류",
        "hint": "ㄷㄹ",
        "meaning": "물이나 공기 같은 액체·기체에서 따뜻해진 물질은 위로 올라가고 차가운 물질은 아래로 내려오며 열이 순환하는 방식이에요",
        "desc": "액체와 기체에서 열이 순환하며 이동하는 방식입니다.",
        "img": "https://raw.githubusercontent.com/awslike6-web/kids-archive/main/assets/storybook/science/minsu/5-2/3/science_temp_ill_p6.jpg"
      },
      {
        "word": "복사",
        "hint": "ㅂㅅ",
        "meaning": "다른 물질을 거치지 않고 햇빛이나 난로처럼 빛을 통해 열이 직접 전달되는 방식이에요",
        "desc": "물질을 통하지 않고 열이 전자기파 형태로 직접 전달되는 방식입니다.",
        "img": "https://raw.githubusercontent.com/awslike6-web/kids-archive/main/assets/storybook/science/minsu/5-2/3/science_temp_ill_p7.jpg"
      },
      {
        "word": "단열",
        "hint": "ㄷㅇ",
        "meaning": "보온병이나 아이스박스처럼 두 물체 사이에서 열이 빠져나가거나 들어오지 못하게 막는 것이에요",
        "desc": "열의 이동을 줄이거나 차단하는 성질입니다.",
        "img": "https://raw.githubusercontent.com/awslike6-web/kids-archive/main/assets/storybook/science/minsu/5-2/3/science_temp_ill_p8.jpg"
      }
    ]
  },
  {
    "grade": "5학년 2학기",
    "unit": "4단원",
    "title": "4. 자원과 에너지",
    "voca": [
      {
        "word": "자원",
        "hint": "ㅈㅇ",
        "meaning": "우리가 생활하거나 물건을 만들 때 사용하는 물, 나무, 철 등의 원료를 말해요.",
        "desc": "물 자원, 산림 자원, 광물 자원 등이 있으며 한정되어 있어 아껴 써야 하는 유한성을 가지고 있어요."
      },
      {
        "word": "재생 에너지",
        "hint": "ㅈㅅ ㅇㄴㅈ",
        "meaning": "태양, 바람, 물처럼 자연에서 얻을 수 있고, 사용해도 다 없어지지 않으며 계속 이용할 수 있는 고마운 에너지예요.",
        "desc": "태양광, 풍력, 수력, 해양, 지열, 바이오 에너지 등이 있으며 환경오염과 기후변화를 줄여 줍니다."
      },
      {
        "word": "단열",
        "hint": "ㄷㅇ",
        "meaning": "집 안과 밖 사이에서 열이 빠져나가거나 들어오지 못하게 막아서 집 안의 온도를 일정하게 유지해 주는 원리예요.",
        "desc": "창문 뽁뽁이(이중창), 우드록, 색점토 등을 이용해 열의 이동을 막아 냉난방 에너지를 크게 절약해요."
      },
      {
        "word": "에너지 소비 효율 등급",
        "hint": "ㅇㄴㅈ ㅅㅂ ㅎㅇ ㄷㄱ",
        "meaning": "가전제품이 에너지를 얼마나 알뜰하게 사용하는지 1~5등급으로 나타낸 것으로, 1등급에 가까울수록 에너지를 많이 절약할 수 있어요.",
        "desc": "냉장고, 세탁기, 에어컨 등에 부착되며 1등급 제품을 쓰면 전기 에너지를 크게 절약할 수 있습니다."
      },
      {
        "word": "에너지 하베스팅",
        "hint": "ㅇㄴㅈ ㅎㅂㅅㅌ",
        "meaning": "우리가 걸을 때 생기는 힘이나 체온, 진동처럼 일상에서 그냥 버려지는 작은 에너지를 모아서 전기로 다시 쓰는 똑똑한 기술이에요.",
        "desc": "일상생활 속에서 버려지는 에너지를 수확하여 미세 전력을 생산하는 미래 친환경 지속가능 기술이에요."
      }
    ]
  }
];

if (typeof window !== 'undefined') {
  window.SCIENCE_CURRICULUM_DATA = SCIENCE_CURRICULUM_DATA;
}
