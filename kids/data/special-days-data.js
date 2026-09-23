// 🌟 kids/data/special-days-data.js
// 민민이네 가족 특별한 날 추억 & 체험 피드 마스터 데이터 (Single Source of Truth)
// ※ 12년 성장 아카이브(kids-archive CDN) 및 노션 DB(3dfa2711...)와 실시간 양방향 연동

const DEFAULT_SPECIAL_DAYS_DATA = [
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
  }
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DEFAULT_SPECIAL_DAYS_DATA };
}
