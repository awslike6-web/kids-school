// 🎨 kids/data/gallery-data.js (공부방 꿈나무 갤러리 마스터 데이터)

const DEFAULT_GALLERY_DATA = [
  {
    id: "art_ms_real_01",
    author: "민수",
    authorKey: "son",
    title: "다채로운 감정의 입체파 인물화",
    category: "그림/미술",
    categoryIcon: "🎨",
    date: "2026-09-02",
    grade: "5학년 1학기",
    imageUrl: "../assets/images/gallery/minsu_cubism_art_20260902.jpg",
    artistNote: "피카소의 입체파(큐비즘) 기법을 활용하여 얼굴의 옆모습과 앞모습을 한 화면에 담았어요. 따뜻한 노랑과 시원한 하늘색, 무지개 배경으로 다양한 마음의 색깔을 표현했습니다!",
    likes: 24,
    stickers: { heart: 12, thumb: 8, star: 6, trophy: 5 },
    comments: [
      { author: "아빠", text: "색감과 형태의 대비가 정말 수준 높은 명작이다! 루브르 박물관에 걸어도 손색없겠어 👍", date: "2026-09-02" },
      { author: "엄마", text: "표정과 색채에 민수의 창의성이 가득 담겨있네! 너무 멋지다 우리 아들 ❤️", date: "2026-09-02" }
    ]
  },
  {
    id: "art_ms_real_02",
    author: "민서",
    authorKey: "daughter",
    title: "아기자기 미니 온실 정원",
    category: "만들기/공예",
    categoryIcon: "✂️",
    date: "2026-09-02",
    grade: "1학년 1학기",
    imageUrl: "../assets/images/gallery/minseo_mini_garden_20260902.jpg",
    artistNote: "투명한 아크릴 온실 집에 알록달록 클레이로 빚은 핑크빛 지붕 꽃과 앙증맞은 선인장, 보라색 꽃 화분을 만들었어요. 미니 조루와 디딤돌도 놓아주었답니다!",
    likes: 28,
    stickers: { heart: 15, thumb: 6, star: 10, trophy: 4 },
    comments: [
      { author: "엄마", text: "손끝이 얼마나 야무진지 디테일이 살아있네! 요정들이 쉬어가는 예쁜 정원이야 🌸", date: "2026-09-02" },
      { author: "아빠", text: "조루랑 선인장 화분까지 정성이 듬뿍 들어갔네! 민서 솜씨 최고야 ❤️", date: "2026-09-02" },
      { author: "민수", text: "선인장 화분 귀엽다 ㅋㅋ", date: "2026-09-02" }
    ]
  },
  {
    id: "art_ms_03",
    author: "민수",
    authorKey: "son",
    title: "교내 과학 탐구 토론 우수상",
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
  }
];

if (typeof window !== 'undefined') {
  window.DEFAULT_GALLERY_DATA = DEFAULT_GALLERY_DATA;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DEFAULT_GALLERY_DATA };
}
