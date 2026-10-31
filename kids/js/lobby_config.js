/**
 * ==============================================================================
 * 🏰 [Lobby Controller] Stitch AI 듀얼 테마 로비 & 한도 도달 모달 통합 컨트롤러
 * ==============================================================================
 * 역할 및 구성:
 * 1. USER_CONFIGS & 상수: 민수(SECTOR-07 다크) / 민서(구름섬 라이트) 설정 및 하위 호환 유지.
 * 2. 동적 테마 & 뷰 스왑: html.light.theme-minseo ↔ html.dark.theme-minsu 즉시 전환.
 * 3. 노션 INVENTORY_DB & SWR 캐시: 하리보/다이아몬드, 통합 레벨, 소원권, 가디언 남은 시간 연동.
 * 4. 시간표 연동 다중 과목 버프 & 과목별 일일 한도(Daily Cap) 신호등:
 *    - 시간표 과목(2~4과목 동시 지원): 🔥 오늘 복습(1.2x, 한도 150) / ✨ 내일 예습(+2 보너스) 점등
 *    - 여유(🟢/⚡) ➔ 마감임박 70%+(🟡/CRITICAL) ➔ 한도 100% 도달 시 소등(💤 완료/냉각)
 * 5. 한도 도달 갈림길 모달(한도도달ui) & 5구역 하단바(일기·찰칵·용어사전·놀이터·프로필) 라우팅.
 * ==============================================================================
 */

// 🖼️ 민수 상단 프로필 아바타 상수 (외부 임시 URL 대체 · 추후 자작 캐릭터로 교체 용이)
const MINSU_AVATAR_SRC = './kids/assets/images/monsters/purple_monster.png';

// 📚 과목 메타데이터 사전 (라우팅 경로, 아이콘, 추천 우선순위)
const SUBJECT_META = {
  korean: {
    key: 'korean', ko: '국어', code: 'KOR', shortId: 'kor',
    emoji: '📖', icon: 'menu_book', roomLabel: '📖 국어 방',
    href: 'kids/subjects/korean/korean.html', bonusText: '남은 시간 +30분 보너스'
  },
  math: {
    key: 'math', ko: '수학', code: 'MATH', shortId: 'math',
    emoji: '🧮', icon: 'calculate', roomLabel: '🧮 수학 방',
    href: 'kids/subjects/math/math.html', bonusText: '남은 시간 +30분 보너스'
  },
  english: {
    key: 'english', ko: '영어', code: 'ENG', shortId: 'eng',
    emoji: '🔤', icon: 'translate', roomLabel: '🔤 영어 방',
    href: 'kids/subjects/english/english.html', bonusText: '남은 시간 +30분 보너스'
  },
  society: {
    key: 'society', ko: '사회', code: 'SOC', shortId: 'soc',
    emoji: '🏛️', icon: 'public', roomLabel: '🏛️ 사회 방',
    href: 'kids/subjects/society/society.html', bonusText: '남은 시간 +30분 보너스'
  },
  science: {
    key: 'science', ko: '과학', code: 'SCI', shortId: 'sci',
    emoji: '🧪', icon: 'science', roomLabel: '🧪 과학 방',
    href: 'kids/subjects/science/science.html', bonusText: '남은 시간 +30분 보너스'
  },
  haru: {
    key: 'haru', ko: '하루', code: 'HARU', shortId: 'haru',
    emoji: '🌱', icon: 'wb_sunny', roomLabel: '🌱 하루 방',
    href: 'kids/subjects/haru/haru.html', bonusText: '일일 30초 체크인 보너스'
  }
};

// 🎡 자녀별 놀이터 & 특별 탐험 목록
const PLAYGROUND_ITEMS = {
  minsu: [
    { icon: '⚔️', title: '브롤 DPS & 밸런스 연구소', desc: '5학년 수학 연계! 브롤러 스탯 분석 & 1:1 시뮬레이션', href: 'kids/playground/minsu/brawl_dps.html', badge: '인기' },
    { icon: '🎁', title: '스타 드롭 & 트로피 보관소', desc: '톡톡 탭해서 전설 스타 드롭 개봉 및 보상 획득!', href: 'kids/playground/minsu/starr_drop.html', badge: '보상' },
    { icon: '🌱', title: '30초 데일리 루틴 & 저금통', desc: '착한 습관 저금통 + 건강 운동 도장 + 마음 날씨 체크인', href: 'kids/subjects/haru/haru.html?user=minsu', badge: '매일' }
  ],
  minseo: [
    { icon: '🎨', title: '매직 컬러링 스튜디오', desc: '사진을 넣으면 밑그림으로 변신! 웹 색칠 & A4 도안 출력', href: 'kids/playground/minseo/coloring.html', badge: '미술' },
    { icon: '📐', title: '인터랙티브 종이접기', desc: '비행기, 개구리, 동서남북 3D 단계별 접기 & 도안 인쇄', href: 'kids/playground/minseo/origami.html', badge: '공예' },
    { icon: '🎁', title: '스타 드롭 & 트로피 보관소', desc: '톡톡 탭해서 신나는 스타 드롭 개봉!', href: 'kids/playground/minsu/starr_drop.html', badge: '보상' },
    { icon: '🔬', title: '3학년 과학 실험실 (미리보기)', desc: '동물, 곤충, 별자리 요정들의 비밀을 알아보는 과학방', href: 'kids/subjects/science/science.html?user=minseo', badge: '예습' },
    { icon: '🏛️', title: '3학년 사회 역사방 (미리보기)', desc: '우리 동네 지도와 옛날 위인 동화 속으로 떠나는 모험', href: 'kids/subjects/society/society.html?user=minseo', badge: '예습' }
  ]
};

// 💎 기존 모듈과의 하위 호환성을 위한 USER_CONFIGS 유지
const USER_CONFIGS = {
  minsu: {
    name: '민수', key: 'son', themeClass: 'theme--arcade',
    htmlClasses: ['dark', 'theme-minsu'],
    subjects: ['english', 'korean', 'math', 'society', 'science', 'haru'],
    defaultGuardianMins: 100,
    studyWorlds: [
      { title: '🧮 수학 월드', color: '#f59e0b', rooms: [{ name: '수학 멀티버스 대모험', href: 'kids/subjects/math/math.html', desc: '단원 동화부터 실전 연산까지!' }] },
      { title: '✍️ 국어 월드', color: '#ec4899', rooms: [{ name: '국어 문장 구성방', href: 'kids/subjects/korean/korean.html', desc: '어휘, 정밀독해, AI토론까지!' }] },
      { title: '🔤 영어 던전', color: '#0284c7', rooms: [{ name: '영단어 기억방', href: 'kids/subjects/english/english.html', desc: '사이버 알파벳 던전 탐험!' }] },
      { title: '🧪 과학 실험실', color: '#10b981', rooms: [{ name: '과학 개념 탐구방', href: 'kids/subjects/science/science.html', desc: '생태계와 과학 법칙 실험실' }] },
      { title: '🏛️ 사회 연대기', color: '#d97706', rooms: [{ name: '사회 역사 탐험방', href: 'kids/subjects/society/society.html', desc: '지리와 역사 타임머신' }] },
      { title: '🦖 탐구 사전관', color: '#8b5cf6', rooms: [{ name: '종합 용어사전방', href: 'kids/common_space/voca.html', desc: '모든 교과서 낱말 총집합!' }] }
    ],
    hideoutWorlds: []
  },
  minseo: {
    name: '민서', key: 'daughter', themeClass: 'theme--hideout',
    htmlClasses: ['light', 'theme-minseo'],
    subjects: ['korean', 'math', 'english', 'haru'],
    defaultGuardianMins: 45,
    studyWorlds: [
      { title: '🧮 수학 월드', color: '#f59e0b', rooms: [{ name: '수학 놀이터 대모험', href: 'kids/subjects/math/math.html', desc: '단원 동화부터 세로셈 연산까지!' }] },
      { title: '✍️ 국어 월드', color: '#ec4899', rooms: [{ name: '국어 문장 구성방', href: 'kids/subjects/korean/korean.html', desc: '감정 스토리북과 논리 대화방' }] },
      { title: '🌱 슬기로운 하루', color: '#2ed573', rooms: [{ name: '하루 탐험관', href: 'kids/subjects/haru/haru.html', desc: '매일 30초 착한 습관 체크인!' }] },
      { title: '🔤 영어 던전', color: '#0284c7', rooms: [{ name: '영단어 기억방', href: 'kids/subjects/english/english.html', desc: '반짝이는 마법 단어장' }] },
      { title: '🦖 탐구 사전관', color: '#8b5cf6', rooms: [{ name: '종합 용어사전방', href: 'kids/common_space/voca.html', desc: '초등 새싹 개념 백과사전' }] }
    ],
    futureWorlds: [],
    hideoutWorlds: []
  }
};

Object.values(USER_CONFIGS).forEach(cfg => {
  cfg.worlds = [...(cfg.studyWorlds || []), ...(cfg.futureWorlds || []), ...(cfg.hideoutWorlds || [])];
});
window.USER_CONFIGS = USER_CONFIGS;
