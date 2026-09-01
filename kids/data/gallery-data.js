// 🎨 kids/data/gallery-data.js (공부방 꿈나무 갤러리 마스터 데이터)

const DEFAULT_GALLERY_DATA = [
  {
    id: "art_ms_01",
    author: "민수",
    authorKey: "son",
    title: "우주를 누비는 사이버 드래곤",
    category: "그림/미술",
    categoryIcon: "🎨",
    date: "2026-05-18",
    grade: "5학년 1학기",
    imageUrl: "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=800&auto=format&fit=crop&q=80",
    artistNote: "학교 미술 시간에 상상 속의 미래 우주 생물을 그렸어요. 네온 날개로 어두운 우주를 밝히며 날아가는 드래곤입니다!",
    likes: 12,
    stickers: { heart: 5, thumb: 4, star: 3, trophy: 2 },
    comments: [
      { author: "아빠", text: "색감이 정말 웅장하고 멋지다! 우주선 조종석에 걸어두고 싶네 👍", date: "2026-05-18" },
      { author: "엄마", text: "드래곤의 눈빛이 살아있어! 우리 민수 상상력 최고 ❤️", date: "2026-05-19" }
    ]
  },
  {
    id: "art_ms_02",
    author: "민서",
    authorKey: "daughter",
    title: "무지개 숲속의 요정 하우스",
    category: "만들기/공예",
    categoryIcon: "✂️",
    date: "2026-06-02",
    grade: "1학년 1학기",
    imageUrl: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=800&auto=format&fit=crop&q=80",
    artistNote: "점토와 반짝이 가루, 재활용 상자로 요정들이 사는 분홍빛 성을 만들었어요. 지붕에는 꽃잎도 붙였답니다!",
    likes: 15,
    stickers: { heart: 8, thumb: 3, star: 6, trophy: 1 },
    comments: [
      { author: "엄마", text: "디테일이 정말 사랑스럽다! 요정 코코가 당장 이사 오겠는걸? 🧚‍♀️", date: "2026-06-02" },
      { author: "민수", text: "지붕 색깔 예쁘네 인정!", date: "2026-06-03" }
    ]
  },
  {
    id: "art_ms_03",
    author: "민수",
    authorKey: "son",
    title: "과학 탐구 토론 우수상",
    category: "상장/기념",
    categoryIcon: "🏆",
    date: "2026-06-25",
    grade: "5학년 1학기",
    imageUrl: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&auto=format&fit=crop&q=80",
    artistNote: "교내 과학의 날 탐구 토론 대회에서 기후 변화와 친환경 에너지 발표로 우수상을 받았어요!",
    likes: 20,
    stickers: { heart: 7, thumb: 8, star: 5, trophy: 9 },
    comments: [
      { author: "아빠", text: "열심히 준비하더니 값진 결실을 맺었구나! 자랑스럽다 민수야 🏆", date: "2026-06-25" }
    ]
  },
  {
    id: "art_ms_04",
    author: "민서",
    authorKey: "daughter",
    title: "알록달록 하트 품은 백조",
    category: "종이접기/컬러링",
    categoryIcon: "📐",
    date: "2026-07-10",
    grade: "1학년 1학기",
    imageUrl: "https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=800&auto=format&fit=crop&q=80",
    artistNote: "공부방 인터랙티브 종이접기로 배운 하트 접기를 응용해서 엄마, 아빠에게 줄 예쁜 편지 카드를 꾸몄어요.",
    likes: 14,
    stickers: { heart: 9, thumb: 2, star: 4, trophy: 2 },
    comments: [
      { author: "아빠", text: "민서의 따뜻한 마음이 담겨 있어서 볼 때마다 힘이 나요 ❤️", date: "2026-07-10" }
    ]
  },
  {
    id: "art_ms_05",
    author: "민수",
    authorKey: "son",
    title: "우리 고장 역사 신문 프로젝트",
    category: "학교 과제",
    categoryIcon: "🏫",
    date: "2026-07-18",
    grade: "5학년 1학기",
    imageUrl: "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=800&auto=format&fit=crop&q=80",
    artistNote: "사회 시간에 모둠 친구들과 함께 만든 역사 신문이에요. 문익점의 목화 이야기와 옛 도자기 문화를 기사로 썼습니다.",
    likes: 10,
    stickers: { heart: 4, thumb: 5, star: 3, trophy: 1 },
    comments: [
      { author: "엄마", text: "헤드라인도 멋지고 진짜 기자처럼 잘 썼네!", date: "2026-07-19" }
    ]
  },
  {
    id: "art_ms_06",
    author: "민서",
    authorKey: "daughter",
    title: "봄날의 나비 가족 소풍",
    category: "그림/미술",
    categoryIcon: "🎨",
    date: "2026-04-15",
    grade: "1학년 1학기",
    imageUrl: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&auto=format&fit=crop&q=80",
    artistNote: "크레파스와 물감으로 꽃밭에 놀러 온 나비 가족을 그렸어요. 아빠 나비, 엄마 나비, 아기 나비예요!",
    likes: 18,
    stickers: { heart: 11, thumb: 4, star: 7, trophy: 0 },
    comments: [
      { author: "엄마", text: "봄 향기가 물씬 풍기는 따뜻한 그림이야 🌸", date: "2026-04-15" }
    ]
  }
];

if (typeof window !== 'undefined') {
  window.DEFAULT_GALLERY_DATA = DEFAULT_GALLERY_DATA;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DEFAULT_GALLERY_DATA };
}
