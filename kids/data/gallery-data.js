// 🎨 kids/data/gallery-data.js (공부방 꿈나무 갤러리 마스터 데이터)
// ※ 미디어 원본은 kids-archive (Single Source of Truth)의 CDN URL을 참조합니다.

const DEFAULT_GALLERY_DATA = [
  {
    "id": "art_minseo_20261028_cat_dog_crossbag",
    "author": "민서",
    "authorKey": "daughter",
    "title": "알록달록 냥이와 댕댕이 크로스백 (앞면 & 별빛 뒷면) 🐱🐶👜",
    "category": "만들기/공예",
    "categoryIcon": "✂️",
    "date": "2026-10-28",
    "grade": "1학년",
    "imageUrl": "https://raw.githubusercontent.com/awslike6-web/kids-archive/main/assets/media/minseo/2026_elem_1/minseo_20261028_cat_dog_crossbag.jpg",
    "galleryImages": [
      "https://raw.githubusercontent.com/awslike6-web/kids-archive/main/assets/media/minseo/2026_elem_1/minseo_20261028_cat_dog_crossbag.jpg",
      "https://raw.githubusercontent.com/awslike6-web/kids-archive/main/assets/media/minseo/2026_elem_1/minseo_20261028_cat_dog_crossbag_back.jpg"
    ],
    "hasCutout": false,
    "artistNote": "학교에서 캔버스 크로스백에 귀여운 고양이와 강아지 얼굴을 그리고 알록달록 색칠했어요! 뒷면에는 반짝반짝 별들을 가득 찍어 나만의 특별하고 예쁜 가방을 완성했답니다! ✨",
    "likes": 0,
    "stickers": {
      "heart": 0,
      "thumb": 0,
      "star": 0,
      "trophy": 0
    },
    "comments": []
  }
];

if (typeof window !== 'undefined') {
  window.DEFAULT_GALLERY_DATA = DEFAULT_GALLERY_DATA;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DEFAULT_GALLERY_DATA };
}
