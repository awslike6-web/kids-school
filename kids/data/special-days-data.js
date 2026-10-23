// 🌟 kids/data/special-days-data.js
// 민민이네 가족 특별한 날 추억 & 체험 피드 마스터 데이터 (Single Source of Truth)
// ※ 12년 성장 아카이브(kids-archive CDN) 및 노션 DB(3dfa2711...)와 실시간 양방향 연동

const DEFAULT_SPECIAL_DAYS_DATA = [
  {
    id: "evt_minseo_pet_trainer_20261022",
    author: "민서",
    category: "학교생활/진로",
    categoryIcon: "🐕",
    title: "🐕 진로체험: 반려동물 훈련사와의 따뜻한 만남!",
    date: "2026-10-22",
    desc: "진로주간을 맞아 1-2학년 친구들이 멋진 반려동물 훈련사 선생님과 함께하는 특별한 진로체험 시간을 가졌습니다! 민서도 훈련사 선생님의 지도에 따라 크고 온순한 강아지의 보드라운 털을 다정하게 쓰다듬어 주며 활짝 웃는 얼굴로 깊은 교감을 나누었어요. 동물과 소통하고 교감하며 존중하는 법, 그리고 반려동물 훈련사의 멋진 역할을 직접 배우며 마음이 한 뼘 더 자란 뜻깊은 하루였습니다! 🐶🐾✨ (담임 조현애 선생님 알림)",
    imageUrl: "https://raw.githubusercontent.com/awslike6-web/kids-archive/main/assets/media/minseo/2026_elem_1/minseo_20261022_pet_trainer_01.jpg",
    galleryImages: [
      "https://raw.githubusercontent.com/awslike6-web/kids-archive/main/assets/media/minseo/2026_elem_1/minseo_20261022_pet_trainer_01.jpg"
    ],
    videoUrl: "",
    likes: 12,
    stickers: { heart: 8, thumb: 6, star: 5, trophy: 3 },
    comments: [
      { author: "아빠", text: "강아지를 무서워하지 않고 다정하게 쓰다듬는 민서 모습이 정말 사랑스럽다! 🐶❤️", date: "2026-10-22" }
    ]
  },
  {
    id: "evt_school_flea_market_20261021",
    author: "민서",
    category: "학교생활/행사",
    categoryIcon: "🎒",
    title: "🎒 전교생이 함께한 2026 가을 나눔 장터!",
    date: "2026-10-21",
    desc: "전체 학년 친구들과 함께 즐거운 가을 나눔 장터를 열었습니다! 민서도 체육관에 돗자리를 펴고 귀여운 인형들과 물건들을 가지런히 진열하여 판매해 보았어요. 친구들과 함께 자신의 물건을 팔기 위해 열심히 노력하고, 현명한 소비를 위해 어떤 물건을 사야 할지 많이 고민하며 물건을 구입하는 알차고 뜻깊은 경제 배움의 날이었습니다! 🧸🧺🍂 (※ 민수 사진도 추후 추가 예정)",
    imageUrl: "https://raw.githubusercontent.com/awslike6-web/kids-archive/main/assets/media/minseo/2026_elem_1/minseo_KakaoTalk_20261021_152143970_01.jpg",
    galleryImages: [
      "https://raw.githubusercontent.com/awslike6-web/kids-archive/main/assets/media/minseo/2026_elem_1/minseo_KakaoTalk_20261021_152143970_01.jpg"
    ],
    videoUrl: "",
    likes: 12,
    stickers: { heart: 8, thumb: 6, star: 5, trophy: 3 },
    comments: [
      { author: "아빠", text: "스스로 돗자리 펴고 물건도 팔아보고 경제도 배우니 정말 대견하다 민서야! 👍", date: "2026-10-21" }
    ]
  },
  {
    id: "evt_family_20261018_opening",
    author: "공동",
    category: "가족/생일파티",
    categoryIcon: "🚗",
    title: "🚗 대구 외삼촌 '퍼펙트 자동차유리' 개업식 축하 모임!",
    date: "2026-10-18",
    desc: "온 가족이 함께 대구로 내려가 외삼촌(처남네)의 새로운 출발인 '퍼펙트 자동차유리' 개업을 진심으로 축하드렸어요! 가게 앞에서 다 함께 모여 예쁜 폴라로이드 사진도 찍고 따뜻한 응원의 마음을 전했습니다. 사업이 날마다 번창하고 늘 안전과 행복이 가득하길 온 가족이 힘차게 응원합니다! 🚗🎉✨",
    imageUrl: "https://raw.githubusercontent.com/awslike6-web/kids-archive/main/assets/media/together/activities/together_20261018_opening.jpg",
    galleryImages: [
      "https://raw.githubusercontent.com/awslike6-web/kids-archive/main/assets/media/together/activities/together_20261018_opening.jpg"
    ],
    videoUrl: "",
    likes: 15,
    stickers: { heart: 9, thumb: 8, star: 7, trophy: 5 },
    comments: [
      { author: "아빠", text: "외삼촌 개업 진심으로 축하해요! 퍼펙트 자동차유리 대박나길 응원합니다! 👍", date: "2026-10-18" }
    ]
  },
  {
    id: "evt_chuseok_reunion_20260926",
    author: "공동",
    category: "가족/생일파티",
    categoryIcon: "🌕",
    title: "🌕 추석맞이 친척들과의 만남! (펜션 카페 & 대전 어린이 과학관)",
    date: "2026-09-26",
    desc: "추석을 맞이하여 온 가족과 친척들이 함께 모여 즐겁고 따뜻한 시간을 보냈습니다. 펜션 근처 예쁜 카페 테라스 흔들의자에서 시원한 가을바람을 맞으며 달콤한 휴식을 즐기고, 대전 어린이 과학관으로 이동해 신나는 음악에 맞춰 춤추는 로봇쇼도 보고 야외 놀이터에서 회전 놀이기구를 타며 온 가족이 행복한 웃음꽃을 피웠답니다! 🤖☕🎶",
    imageUrl: "https://raw.githubusercontent.com/awslike6-web/kids-archive/main/assets/media/together/activities/together_20260926_chuseok_01.jpg",
    galleryImages: [
      "https://raw.githubusercontent.com/awslike6-web/kids-archive/main/assets/media/together/activities/together_20260926_chuseok_01.jpg",
      "https://raw.githubusercontent.com/awslike6-web/kids-archive/main/assets/media/together/activities/together_20260926_chuseok_02.jpg",
      "https://raw.githubusercontent.com/awslike6-web/kids-archive/main/assets/media/together/activities/together_20260926_chuseok_03.jpg",
      "https://raw.githubusercontent.com/awslike6-web/kids-archive/main/assets/media/together/activities/together_20260926_chuseok_04.jpg"
    ],
    videoUrl: "https://raw.githubusercontent.com/awslike6-web/kids-archive/main/assets/media/together/activities/together_20260926_robotshow.mp4",
    videoBtnText: "🤖 과학관 로봇쇼 풀영상 감상하기",
    likes: 12,
    stickers: { heart: 8, thumb: 6, star: 5, trophy: 3 },
    comments: [
      { author: "아빠", text: "친척들과 다 함께 모여 맛있는 것도 먹고 과학관에서 신나게 뛰노니 정말 보람찬 추석 연휴였어! 👍", date: "2026-09-26" }
    ]
  },
  {
    id: "evt_baseball_droneshow_20260912",
    author: "공동",
    category: "가족/생일파티",
    categoryIcon: "⚾",
    title: "⚾ 밤하늘을 수놓은 영웅 야구 드론쇼",
    date: "2026-09-12",
    desc: "온 가족이 함께 밤하늘에서 반짝반짝 빛나는 환상적인 야구 드론쇼를 보았어요! 멋진 야구 모자와 펄럭이는 망토를 두른 히어로 캐릭터가 밤하늘을 가득 채울 때 온 가족이 감탄했답니다. 15분 동안 눈을 뗄 수 없었던 감동의 드론쇼였어요! ✨",
    imageUrl: "https://raw.githubusercontent.com/awslike6-web/kids-archive/main/assets/media/together/activities/together_20260912_droneshow_01.jpg",
    galleryImages: [
      "https://raw.githubusercontent.com/awslike6-web/kids-archive/main/assets/media/together/activities/together_20260912_droneshow_01.jpg"
    ],
    videoUrl: "https://photos.app.goo.gl/fgvwr6ChSVsTjfna7",
    videoBtnText: "15분 드론쇼 풀영상 감상하기",
    likes: 12,
    stickers: { heart: 8, thumb: 5, star: 6, trophy: 3 },
    comments: [
      { author: "아빠", text: "드론쇼 불빛이 아직도 생생하네! 정말 멋진 가을밤이었어 👍", date: "2026-09-12" }
    ]
  },
  {
    id: "evt_cheerleader_dance_20260912",
    author: "공동",
    category: "소중한 하루",
    categoryIcon: "💃",
    title: "💃 치어리더 음악에 맞춘 신나는 댄스 파티!",
    date: "2026-09-12",
    desc: "드론쇼가 시작하기 전, 신나는 야구 치어리더 음악에 맞춰 아이들이 온몸으로 리듬을 타며 춤을 추었어요! 엉덩이를 씰룩이며 신나게 노는 귀여운 모습에 엄마 아빠 모두 빵 터져서 웃음꽃이 활짝 피었답니다! 🎶🍬",
    imageUrl: "https://raw.githubusercontent.com/awslike6-web/kids-archive/main/assets/media/together/activities/together_20260912_droneshow_01.jpg",
    videoUrl: "https://photos.app.goo.gl/UWsCZfbhVteVu5LM7",
    videoBtnText: "아이들 치어리더 댄스 영상 보기",
    likes: 9,
    stickers: { heart: 7, thumb: 6, star: 4, trophy: 2 },
    comments: []
  },
  {
    id: "evt_minseo_peanut_20260910",
    author: "민서",
    category: "생태/텃밭/체험",
    categoryIcon: "🌱",
    title: "🥜 5학년 선배들이 선물한 가을 텃밭 땅콩 수확",
    date: "2026-09-10",
    desc: "우리 학교 5학년 선배들이 정성껏 재배한 땅콩을 수확하는 선물을 1학년이 받았어요! 땅콩 줄기를 쑥 뽑아보고 땅콩 단을 번쩍 안고 사진도 찍었답니다. 흙에서 딴 땅콩을 깨끗이 씻어 말리는 중인데, 잘 마르면 고소하게 맛볼 것이랍니다!",
    imageUrl: "https://raw.githubusercontent.com/awslike6-web/kids-archive/main/assets/media/minseo/activities/minseo_20260910_peanut_01_single.jpg",
    galleryImages: [
      "https://raw.githubusercontent.com/awslike6-web/kids-archive/main/assets/media/minseo/activities/minseo_20260910_peanut_01_single.jpg",
      "https://raw.githubusercontent.com/awslike6-web/kids-archive/main/assets/media/minseo/activities/minseo_20260910_peanut_02_friends.jpg",
      "https://raw.githubusercontent.com/awslike6-web/kids-archive/main/assets/media/minseo/activities/minseo_20260910_peanut_03_harvest.jpg"
    ],
    videoUrl: "",
    likes: 8,
    stickers: { heart: 5, thumb: 4, star: 3, trophy: 1 },
    comments: []
  },
  {
    id: "evt_minseo_birthday_20260915",
    author: "민서",
    category: "가족/생일파티",
    categoryIcon: "🎂",
    title: "🎂 사랑하는 민서의 8번째 생일 파티 (꽃다발과 슬라임 선물!)",
    date: "2026-09-15",
    desc: "민서의 8번째 생일을 축하하며 온 가족이 모여 행복한 생일 축하 파티를 열었어요! 환하게 반짝반짝 빛나는 은은한 LED 꽃다발과 알록달록 신나는 박사퍼티 슬라임 선물을 받고 민서 얼굴에 행복한 웃음꽃이 활짝 피었답니다. 가족들의 따뜻한 축하와 사랑이 가득 넘쳤던 세상에서 가장 행복하고 특별한 하루였어요! 💐🎂✨",
    imageUrl: "https://raw.githubusercontent.com/awslike6-web/kids-archive/main/assets/media/minseo/activities/minseo_20260915_birthday_01_flower.png",
    galleryImages: [
      "https://raw.githubusercontent.com/awslike6-web/kids-archive/main/assets/media/minseo/activities/minseo_20260915_birthday_01_flower.png",
      "https://raw.githubusercontent.com/awslike6-web/kids-archive/main/assets/media/minseo/activities/minseo_20260915_birthday_02_slime.jpg"
    ],
    videoUrl: "https://photos.app.goo.gl/YLZokUWW4x2uwkNZ9",
    videoBtnText: "🎂 가족 생일 축하 파티 영상 보기",
    likes: 15,
    stickers: { heart: 10, thumb: 8, star: 9, trophy: 5 },
    comments: [
      { author: "엄마", text: "우리 민서 8번째 생일 정말 축하해 사랑해 💖", date: "2026-09-15" }
    ]
  },
  {
    id: "evt_minseo_horse_20260922",
    author: "민서",
    category: "생태/텃밭/체험",
    categoryIcon: "🐴",
    title: "🐴 조랑조랑 말들과 친숙해져요",
    date: "2026-09-22",
    desc: "학교 수업이 끝나고 늘봄 시간에 조랑조랑 말들과 친숙한 시간을 보냈습니다. 말의 눈을 바라보고, 말의 등을 만져보며 말과 친해지는 시간을 가졌습니다.",
    imageUrl: "https://raw.githubusercontent.com/awslike6-web/kids-archive/main/assets/media/minseo/activities/minseo_20260922_horse_01.jpg",
    galleryImages: [
      "https://raw.githubusercontent.com/awslike6-web/kids-archive/main/assets/media/minseo/activities/minseo_20260922_horse_01.jpg",
      "https://raw.githubusercontent.com/awslike6-web/kids-archive/main/assets/media/minseo/activities/minseo_20260922_horse_02.jpg",
      "https://raw.githubusercontent.com/awslike6-web/kids-archive/main/assets/media/minseo/activities/minseo_20260922_horse_03.jpg"
    ],
    videoUrl: "",
    likes: 10,
    stickers: { heart: 6, thumb: 5, star: 4, trophy: 2 },
    comments: []
  },
  {
    id: "evt_minseo_soap_20260922",
    author: "민서",
    category: "학교행사/운동회",
    categoryIcon: "🌕",
    title: "🌕 추석맞이 클레이 비누와 복주머니 만들기",
    date: "2026-09-22",
    desc: "추석을 맞이하여 클레이 비누를 만들었습니다. 여러 모양으로 만든 비누와 복이 담기는 복주머니를 만들었습니다. 비누는 가정에서 사용할 수 있습니다. 이렇게 만들기를 하다보니 마음은 벌써 추석으로 가 있습니다.",
    imageUrl: "https://raw.githubusercontent.com/awslike6-web/kids-archive/main/assets/media/minseo/activities/minseo_20260922_soap_01.jpg",
    galleryImages: [
      "https://raw.githubusercontent.com/awslike6-web/kids-archive/main/assets/media/minseo/activities/minseo_20260922_soap_01.jpg",
      "https://raw.githubusercontent.com/awslike6-web/kids-archive/main/assets/media/minseo/activities/minseo_20260922_soap_02.jpg"
    ],
    videoUrl: "",
    likes: 8,
    stickers: { heart: 5, thumb: 4, star: 3, trophy: 1 },
    comments: []
  },
  {
    id: "evt_minseo_farm_20260904",
    author: "민서",
    category: "생태/텃밭/체험",
    categoryIcon: "🌱",
    title: "🌱 배추와 무 모종 심기",
    date: "2026-09-04",
    desc: "토마토와 고추 및 당근을 심었던 상자 텃밭에 배추와 무 모종을 심었습니다. 손바닥보다 작은 모종이 아직은 여려서 조심조심 심었습니다. \"무럭무럭 자라라\" \"잘 자라주기를 바래\" 이렇게 다정하게 인사하며 배추와 무의 모종을 심었습니다.",
    imageUrl: "https://raw.githubusercontent.com/awslike6-web/kids-archive/main/assets/media/minseo/activities/minseo_20260904_sprout_01.jpg",
    galleryImages: [
      "https://raw.githubusercontent.com/awslike6-web/kids-archive/main/assets/media/minseo/activities/minseo_20260904_sprout_01.jpg",
      "https://raw.githubusercontent.com/awslike6-web/kids-archive/main/assets/media/minseo/activities/minseo_20260904_sprout_02.jpg",
      "https://raw.githubusercontent.com/awslike6-web/kids-archive/main/assets/media/minseo/activities/minseo_20260904_sprout_03.jpg",
      "https://raw.githubusercontent.com/awslike6-web/kids-archive/main/assets/media/minseo/activities/minseo_20260904_sprout_04.jpg"
    ],
    videoUrl: "",
    likes: 11,
    stickers: { heart: 7, thumb: 6, star: 5, trophy: 3 },
    comments: []
  },
  {
    id: "evt_minseo_semester2_20260904",
    author: "민서",
    category: "학교행사/운동회",
    categoryIcon: "🎒",
    title: "🎒 2학기 시작! 친구들과 신나는 놀이터",
    date: "2026-09-04",
    desc: "2학기를 시작하며 놀이터에서 함께 사진을 찍었습니다. 우리 아이들이 방학 동안 자란 모습이 사진에도 보이네요.",
    imageUrl: "https://raw.githubusercontent.com/awslike6-web/kids-archive/main/assets/media/minseo/activities/minseo_20260904_playground_01.jpg",
    galleryImages: [
      "https://raw.githubusercontent.com/awslike6-web/kids-archive/main/assets/media/minseo/activities/minseo_20260904_playground_01.jpg",
      "https://raw.githubusercontent.com/awslike6-web/kids-archive/main/assets/media/minseo/activities/minseo_20260904_playground_02.jpg",
      "https://raw.githubusercontent.com/awslike6-web/kids-archive/main/assets/media/minseo/activities/minseo_20260904_playground_03.jpg",
      "https://raw.githubusercontent.com/awslike6-web/kids-archive/main/assets/media/minseo/activities/minseo_20260904_playground_04.jpg",
      "https://raw.githubusercontent.com/awslike6-web/kids-archive/main/assets/media/minseo/activities/minseo_20260904_playground_05.jpg"
    ],
    videoUrl: "",
    likes: 9,
    stickers: { heart: 6, thumb: 5, star: 4, trophy: 2 },
    comments: []
  }
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DEFAULT_SPECIAL_DAYS_DATA };
}
