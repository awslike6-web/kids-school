/**
 * 🌅 민민이네 공부방 - 통합교과 '하루' (1-2) 라이프 & 이벤트 허브 데이터
 * - [매일의 습관 & 루틴]: 저금통 코인, 건강 운동 체크, 마음 날씨 색칠
 * - [자연 & 예술 감상]: 하늘의 하루(모네/고흐 명화 감상평), 달팽이의 하루(동요 & 생태)
 * - [특별한 날 추억 게시판]: 가장 좋아하는 하루 & 가족 이벤트 이야기 피드
 */

window.HARU_DATA = {
  subject: "하루",
  grade: "1-2",
  themeColor: "#2ed573",

  // ==========================================
  // 1. 매일의 습관 & 루틴 (Daily Habits)
  // ==========================================
  dailyHabits: {
    // 🐷 하루 저금통 (30~31쪽)
    piggyBank: {
      title: "하루 저금통 (착한 습관)",
      song: {
        title: "저금통 (동요)",
        lyrics: "딸랑딸랑 은동전 땡그랑땡 금동전\n예쁜 돼지 저금통 배가 불러 꿀꿀꿀\n착한 일을 할 때마다 동전 하나 쏙쏙\n내 마음도 동전처럼 반짝반짝 빛나요 ✨"
      },
      habits: [
        { id: "read", name: "재미있는 책 1권 읽기", icon: "📖", category: "배움" },
        { id: "tidy", name: "내 방과 장난감 스스로 정리하기", icon: "🧹", category: "습관" },
        { id: "shoes", name: "현관 신발 가지런히 놓기", icon: "👟", category: "배려" },
        { id: "vege", name: "야채와 반찬 골고루 냠냠 먹기", icon: "🥦", category: "건강" },
        { id: "rope", name: "튼튼 줄넘기나 달리기 30회", icon: "🏃", category: "운동" },
        { id: "greeting", name: "가족에게 '고마워요' 다정한 인사하기", icon: "💬", category: "마음" }
      ],
      maxCoins: 20
    },

    // 💪 건강한 하루 (26~27쪽) - 매일 운동 습관 기록
    workout: {
      title: "건강한 하루 (운동 습관)",
      exercises: [
        { id: "stretch", name: "아침 기지개 & 1분 스트레칭", icon: "🧘" },
        { id: "walk", name: "씩씩하게 걷기와 달리기", icon: "🏃" },
        { id: "jump", name: "신나는 줄넘기나 점핑 놀이", icon: "🪢" },
        { id: "dance", name: "신나는 노래에 맞춰 댄스댄스", icon: "💃" },
        { id: "bike", name: "자전거/킥보드 신나게 타기", icon: "🛴" }
      ]
    },

    // 🌈 마음의 하루 (28~29쪽) - 감정 무지개
    mind: {
      title: "마음의 하루 (감정 무지개)",
      poem: "내 마음속에는 알록달록 무지개가 살아요.\n기쁠 때는 샛노란 햇살처럼 활짝,\n편안할 때는 부드러운 초록 잔디처럼 살랑살랑,\n속상할 때는 파란 비구름이 똑똑 떨어지지만,\n사랑하는 가족과 함께하면 다시 예쁜 무지개가 떠올라요 🌈",
      moodColors: [
        { mood: "기쁨/행복", color: "#feca57", desc: "환한 햇살처럼 웃음이 가득해요", icon: "😊" },
        { mood: "신남/설렘", color: "#ff9f43", desc: "심장이 콩닥콩닥 재미있는 일이 가득해요", icon: "🥳" },
        { mood: "편안함/차분함", color: "#2ed573", desc: "마음이 풀밭처럼 조용하고 편안해요", icon: "🌿" },
        { mood: "슬픔/속상함", color: "#54a0ff", desc: "눈물이 퐁퐁 비구름이 스쳐가요", icon: "😢" },
        { mood: "화남/답답함", color: "#ff6b81", desc: "불꽃처럼 화끈화끈 바람을 쐬고 싶어요", icon: "😤" }
      ]
    }
  },

  // ==========================================
  // 2. 자연 & 예술 감상실 (Nature & Art)
  // ==========================================
  natureAndArt: {
    // 🌤️ 하늘의 하루 (22~23쪽) - 모네 & 고흐
    skyArt: {
      title: "하늘의 하루 (명화 감상과 하늘 관찰)",
      day: {
        artist: "클로드 모네 (Claude Monet)",
        title: "포플러 나무가 있는 풀밭",
        period: "낮의 하늘 ☀️",
        image: "images/minseo/1-2/1/page_22_sky_monet.jpg",
        desc: "맑고 파란 대낮의 하늘과 부드러운 하얀 솜사탕 구름, 따스한 햇빛이 가득한 풀밭 풍경이에요.",
        colors: ["#70a1ff", "#f1f2f6", "#ffeaa7", "#a8e6cf"],
        voiceMsg: "모네 할아버지가 그린 낮의 하늘이에요! 햇살이 참 따스하고 평화롭지요?"
      },
      night: {
        artist: "빈센트 반 고흐 (Vincent van Gogh)",
        title: "별이 빛나는 밤",
        period: "밤의 하늘 🌙",
        image: "images/minseo/1-2/1/page_23_sky_gogh.jpg",
        desc: "소용돌이치는 샛노란 별과 달빛, 깊고 신비로운 밤하늘이 춤을 추는 마법 같은 밤 풍경이에요.",
        colors: ["#1e3799", "#fbc531", "#f6b93b", "#0c2461"],
        voiceMsg: "고흐 할아버지가 그린 밤의 하늘이에요! 빙글빙글 소용돌이치는 별빛이 살아 움직이는 것 같아요!"
      }
    },

    // 🐌 달팽이의 하루 (24~25쪽) - 동요 & 비 오는 날 자연
    snail: {
      title: "달팽이의 하루 (비 오는 날과 동요)",
      song: {
        title: "달팽이 (동요)",
        lyrics: "비가 오면 촉촉하게 풀잎 위로 나와요\n느릿느릿 동글동글 집을 등에 업고서\n미끄럼틀 타듯 조심조심 기어가요\n달팽이야 어디 가니? 친구 만나러 간단다 🐌"
      },
      natureObservation: [
        "비 오는 날 풀잎 위에 맺힌 맑은 빗방울",
        "조심조심 더듬이를 쫑긋 세우는 아기 달팽이",
        "물기를 머금고 싱싱해진 초록 나뭇잎"
      ]
    }
  },

  // ==========================================
  // 3. 특별한 날 추억 피드 & 게시판 (Special Days)
  // ==========================================
  specialDays: {
    title: "가장 좋아하는 하루 & 특별한 날 이야기 (20~21쪽)",
    defaultEvents: [
      {
        id: "evt_baseball_droneshow_20260912",
        category: "가족기념일",
        categoryIcon: "⚾",
        title: "⚾ 밤하늘을 수놓은 야구 드론쇼 & 온 가족 나들이",
        date: "2026-09-12 (초가을 밤)",
        desc: "온 가족이 함께 밤하늘에서 반짝반짝 빛나는 환상적인 야구 드론쇼를 보았어요! 야구공과 글러브, 시원한 홈런 배트 모양으로 수많은 드론들이 밤하늘을 수놓았답니다. 15분 동안 눈을 뗄 수 없을 만큼 신기하고 가슴 벅찬 하루였어요!",
        icon: "⚾",
        imageUrl: null,
        videoUrl: "",
        fallbackIcon: "⚾"
      },
      {
        id: "evt_minseo_peanut_20260910",
        category: "생태/텃밭",
        categoryIcon: "🌱",
        title: "🥜 5학년 선배들이 선물한 가을 텃밭 땅콩 수확",
        date: "2026-09-10 (가을 텃밭)",
        desc: "우리 학교 5학년 선배들이 정성껏 재배한 땅콩을 수확하는 선물을 1학년이 받았어요! 땅콩 줄기를 쑥 뽑아보고 땅콩 단을 번쩍 안고 사진도 찍었답니다. 흙에서 딴 땅콩을 깨끗이 씻어 말리는 중인데, 잘 마르면 고소하게 맛볼 것이랍니다!",
        icon: "🌱",
        imageUrl: "https://raw.githubusercontent.com/awslike6-web/kids-archive/main/assets/media/minseo/activities/minseo_20260910_peanut_01_single.jpg",
        galleryImages: [
          "https://raw.githubusercontent.com/awslike6-web/kids-archive/main/assets/media/minseo/activities/minseo_20260910_peanut_01_single.jpg",
          "https://raw.githubusercontent.com/awslike6-web/kids-archive/main/assets/media/minseo/activities/minseo_20260910_peanut_02_friends.jpg",
          "https://raw.githubusercontent.com/awslike6-web/kids-archive/main/assets/media/minseo/activities/minseo_20260910_peanut_03_harvest.jpg"
        ],
        fallbackIcon: "🥜"
      },
      {
        id: "evt_birthday",
        category: "생일",
        categoryIcon: "🎂",
        title: "🎂 달콤한 케이크와 생일 파티",
        date: "기억에 남는 하루",
        desc: "온 가족이 모여 촛불을 끄고 생일 노래를 불렀던 세상에서 제일 특별한 날!",
        icon: "🎂",
        imageUrl: null
      },
      {
        id: "evt_children",
        category: "어린이날",
        categoryIcon: "🎈",
        title: "🎈 놀이동산과 선물 가득 어린이날",
        date: "신나는 5월의 하루",
        desc: "엄마 아빠와 함께 신나는 놀이기구도 타고 맛있는 것도 먹었던 하루!",
        icon: "🎈",
        imageUrl: null
      },
      {
        id: "evt_picnic",
        category: "가을소풍",
        categoryIcon: "🍁",
        title: "🍁 알록달록 단풍잎과 김밥 소풍",
        date: "바람이 살랑이는 하루",
        desc: "노란 은행잎, 빨간 단풍잎을 주우며 돗자리 펴고 도시락 먹은 날!",
        icon: "🍁",
        imageUrl: null
      },
      {
        id: "evt_christmas",
        category: "크리스마스",
        categoryIcon: "🎄",
        title: "🎄 반짝이는 트리와 산타 선물",
        date: "눈 내리는 겨울 하루",
        desc: "예쁜 트리 전구를 켜고 캐럴을 부르며 산타 할아버지를 기다린 하루!",
        icon: "🎄",
        imageUrl: null
      }
    ]
  },

  // ==========================================
  // 4. 출동! 119 안전 수호대 & 닥터 코코 (74~83쪽 위험/안전 & 응급처치)
  // ==========================================
  safetyStation: {
    title: "출동! 119 안전 수호대 & 닥터 코코 응급처치 상담소",
    subtitle: "학교와 집에서 안전하게 생활하고, 다쳤을 때는 침착하게 처치해요!",
    // 위기탈출 OX 안전 퀴즈 6문항
    oxQuizList: [
      {
        id: "ox_1",
        place: "학교 복도와 계단",
        icon: "🏫",
        question: "복도나 계단에서는 앞을 잘 보고 천천히 오른쪽으로 사뿐사뿐 걸어가요.",
        answer: true,
        explain: "맞아요! 계단이나 복도에서 뛰어가면 친구와 세게 부딪혀 크게 다칠 수 있어요. 사뿐사뿐 걸어요!",
        tip: "오른쪽 통행과 사뿐사뿐 걷기가 안전의 기본!"
      },
      {
        id: "ox_2",
        place: "횡단보도 건널 때",
        icon: "🚦",
        question: "초록불이 켜지자마자 앞만 보고 쌩~ 달려가서 건너요.",
        answer: false,
        explain: "아니에요! 초록불이 켜져도 먼저 차가 완전히 멈췄는지 멈춰 서서 왼쪽, 오른쪽을 살펴보고 건너야 해요.",
        tip: "멈춘다 ➔ 살핀다 ➔ 손을 들고 천천히 건넌다!"
      },
      {
        id: "ox_3",
        place: "교실과 책상 주변",
        icon: "✂️",
        question: "가위나 칼 같은 날카로운 도구를 사용할 때는 장난치지 않고 바르게 앉아서 써요.",
        answer: true,
        explain: "정답이에요! 뾰족한 가위를 들고 흔들거나 장난치면 손가락이나 친구를 다치게 할 수 있어요.",
        tip: "뾰족한 도구는 쓸 때만 집중해서 바르게 쓰기!"
      },
      {
        id: "ox_4",
        place: "미끄럼틀과 놀이터",
        icon: "🛝",
        question: "미끄럼틀을 탈 때 거꾸로 기어 올라가서 타면 더 스릴 있고 안전해요.",
        answer: false,
        explain: "위험해요! 미끄럼틀을 거꾸로 올라가면 위에서 내려오는 친구와 쿵 부딪혀 떨어질 수 있어요. 계단으로 올라가요!",
        tip: "계단으로 올라가서, 엉덩이로 슝 내려오기!"
      },
      {
        id: "ox_5",
        place: "비 오는 날 길 걷기",
        icon: "☔",
        question: "비 오는 날에는 우산을 눈앞까지 푹 눌러쓰고 걸어가요.",
        answer: false,
        explain: "위험해요! 우산을 푹 눌러쓰면 앞이나 옆에서 오는 차와 자전거가 보이지 않아요. 우산을 바르게 세우고 시야를 확보해요.",
        tip: "투명 우산이나 밝은 색 우산을 쓰고 앞을 똑바로 보기!"
      },
      {
        id: "ox_6",
        place: "선생님/어른께 알리기",
        icon: "🗣️",
        question: "나나 친구가 다치거나 위험한 상황을 보면 즉시 어른이나 선생님께 알려요.",
        answer: true,
        explain: "아주 훌륭해요! 다쳤을 때는 혼자 참지 말고 선생님이나 엄마, 아빠께 바로 말씀드려야 빠른 치료를 받을 수 있어요.",
        tip: "다쳤을 땐 망설이지 말고 큰 소리로 어른 부르기!"
      }
    ],

    // 닥터 코코 6대 응급처치 가이드
    firstAidGuides: {
      scrape: {
        id: "scrape",
        title: "무릎이나 손이 까졌을 때 (찰과상)",
        icon: "🩹",
        badge: "피가 나거나 껍질이 벗겨짐",
        steps: [
          { step: 1, title: "흐르는 깨끗한 물에 씻기", desc: "흙이나 먼지가 상처에 남지 않도록 흐르는 찬물에 살살 씻어내요." },
          { step: 2, title: "깨끗한 거즈/수건으로 톡톡", desc: "비비지 말고 깨끗한 거즈나 수건으로 톡톡 두드려 물기를 말려요." },
          { step: 3, title: "소독 & 연고 바르고 밴드 붙이기", desc: "소독약을 바르고 상처 연고를 얇게 바른 뒤 밴드를 덮어 세균을 막아요." },
          { step: 4, title: "보건실 선생님이나 부모님께 알리기", desc: "상처가 깊거나 흙이 안 빠지면 꼭 어른께 보여드려요!" }
        ],
        cocoSay: "아팠겠다! 괜찮아, 많이 놀랐지? 먼저 흐르는 물에 깨끗이 씻고 밴드를 톡 붙이자. 그리고 선생님이나 부모님께 꼭 보여드려야 해!"
      },
      bump: {
        id: "bump",
        title: "이마나 몸을 쿵 부딪혔을 때 (혹/멍)",
        icon: "🤕",
        badge: "부어오르거나 파랗게 멍듦",
        steps: [
          { step: 1, title: "찬 얼음수건으로 냉찜질하기", desc: "수건에 싼 얼음이나 차가운 캔을 부딪힌 곳에 10분 정도 대주어 붓기를 가라앉혀요." },
          { step: 2, title: "세게 누르거나 비비지 않기", desc: "멍든 자리를 문지르면 모세혈관이 더 터질 수 있으니 살며시 대고만 있어요." },
          { step: 3, title: "어지럽거나 토할 것 같으면 즉시 알리기", desc: "머리를 세게 부딪혀서 졸리거나 어지러우면 지체 없이 큰 병원에 가야 해요." }
        ],
        cocoSay: "쿵 소리가 났구나! 혹이 난 자리는 문지르면 안 돼. 차가운 수건으로 시원하게 대고 쉬자. 머리가 어지럽거나 아프면 바로 어른께 말씀드려!"
      },
      burn: {
        id: "burn",
        title: "뜨거운 물이나 냄비에 데였을 때 (화상)",
        icon: "🔥",
        badge: "피부가 붉어지거나 따가움",
        steps: [
          { step: 1, title: "흐르는 미지근한 찬물에 10~15분 식히기", desc: "가장 중요해요! 너무 차가운 얼음 대신 흐르는 수돗물에 열기를 충분히 빼줘요." },
          { step: 2, title: "물집 절대 터뜨리지 않기", desc: "물집은 피부를 보호하는 방패예요. 손으로 만지거나 터뜨리면 안 돼요." },
          { step: 3, title: "된장, 치약 절대 금지! 즉시 병원/보건실 가기", desc: "민간요법은 세균 감염 위험이 높아요. 깨끗한 손수건으로 살짝 덮고 병원에 가요." }
        ],
        cocoSay: "앗 뜨거워라! 얼른 흐르는 찬물에 데인 곳을 15분 동안 식혀야 해! 얼음은 너무 차가우니 수돗물로 식히고, 된장이나 치약 바르면 절대 안 돼!"
      },
      nosebleed: {
        id: "nosebleed",
        title: "코피가 주르륵 날 때",
        icon: "🩸",
        badge: "코피가 멈추지 않음",
        steps: [
          { step: 1, title: "고개를 앞으로 살짝 숙이기", desc: "고개를 뒤로 젖히면 피가 목으로 넘어가 숨쉬기 힘들어요! 앞으로 살짝 숙여요." },
          { step: 2, title: "콧망울 부드러운 곳을 손가락으로 5분 꾹 누르기", desc: "콧등 아래 말랑말랑한 콧망울을 엄지와 검지로 5~10분간 떼지 말고 지그시 눌러요." },
          { step: 3, title: "입으로 숨쉬며 차분하게 기다리기", desc: "목으로 넘어온 피는 삼키지 말고 뱉어요. 이마나 콧등에 찬물 찜질을 해도 좋아요." }
        ],
        cocoSay: "코피가 났을 때 고개를 뒤로 젖히면 피가 목으로 넘어가 위험해! 고개를 살짝 앞으로 숙이고 콧망울을 꾹 5분간 눌러주자. 삼키지 말고 입으로 숨쉬어!"
      },
      bugbite: {
        id: "bugbite",
        title: "벌레나 모기에 물렸을 때",
        icon: "🐝",
        badge: "가렵고 빨갛게 부음",
        steps: [
          { step: 1, title: "비누와 깨끗한 물로 씻기", desc: "벌레 독과 세균을 씻어내기 위해 비누로 거품을 내어 부드럽게 씻어요." },
          { step: 2, title: "긁지 않고 찬 얼음찜질하기", desc: "손톱으로 긁으면 흉터가 남고 염증이 생겨요. 차가운 찜질로 가려움을 달래요." },
          { step: 3, title: "벌레 물린 연고 바르기", desc: "벌에 쏘여 숨쉬기 힘들거나 심하게 부으면 즉시 119나 병원으로 가야 해요." }
        ],
        cocoSay: "간질간질해도 손톱으로 긁으면 세균이 들어가 덧나요! 비누로 깨끗이 씻고 시원한 찜질을 해준 뒤 연고를 톡톡 발라주자!"
      },
      eye: {
        id: "eye",
        title: "눈에 모래나 먼지가 들어갔을 때",
        icon: "👀",
        badge: "눈이 따갑고 눈물이 남",
        steps: [
          { step: 1, title: "절대 눈 비비지 않기", desc: "손으로 비비면 모래가 눈동자를 긁어 상처가 날 수 있어요. 절대로 손대지 마세요." },
          { step: 2, title: "인공눈물이나 흐르는 물로 깜빡거리기", desc: "깨끗한 식염수나 흐르는 수돗물에 눈을 대고 깜빡깜빡해서 이물질을 흘려보내요." },
          { step: 3, title: "눈물이 멈추지 않으면 안과 가기", desc: "눈에 낀 것이 계속 아프다면 어른께 말씀드리고 안과 병원에 방문해요." }
        ],
        cocoSay: "눈 비비면 절대 안 돼! 각막이 긁힐 수 있거든. 인공눈물이나 흐르는 물에 눈을 깜빡깜빡해서 모래를 스르륵 흘려보내자!"
      }
    }
  },

  // ==========================================
  // 5. 24시간 매직 타임머신 시계판 (하루 일과 & 시간 표현, 32~57쪽)
  // ==========================================
  timelineClock: {
    title: "24시간 매직 타임머신 시계판",
    desc: "아침, 점심, 저녁, 밤! 언제 무엇을 했는지 스티커를 붙이고 시간 여행을 떠나요 ✨",
    periods: {
      morning: { id: "morning", name: "상쾌한 아침", icon: "🌅", timeRange: "06:00 ~ 11:59", color: "#ff7675", bg: "rgba(255, 118, 117, 0.12)", badge: "해가 방긋 ☀️" },
      lunch: { id: "lunch", name: "활기찬 점심", icon: "☀️", timeRange: "12:00 ~ 16:59", color: "#0984e3", bg: "rgba(9, 132, 227, 0.12)", badge: "배가 꼬르륵 🍱" },
      evening: { id: "evening", name: "노을빛 저녁", icon: "🌇", timeRange: "17:00 ~ 20:59", color: "#e17055", bg: "rgba(225, 112, 85, 0.12)", badge: "노을이 물들 때 🌆" },
      night: { id: "night", name: "포근한 밤", icon: "🌙", timeRange: "21:00 ~ 05:59", color: "#6c5ce7", bg: "rgba(108, 92, 231, 0.12)", badge: "별이 반짝 🌟" }
    },
    // 추천 일과 스티커 팩 (20종)
    stickers: [
      // 🌅 아침 (06~11시)
      { id: "st_wake", period: "morning", time: "07:00", title: "상쾌한 기상", icon: "⏰", tag: "아침", speech: "째깍째깍 아침 7시! 기분 좋게 눈을 뜨고 기지개를 켜요! ☀️" },
      { id: "st_breakfast", period: "morning", time: "07:30", title: "맛있는 아침밥", icon: "🍳", tag: "식사", speech: "아침 7시 30분! 든든하게 아침밥을 냠냠 먹어요!" },
      { id: "st_brush", period: "morning", time: "08:00", title: "치카치카 양치", icon: "🫧", tag: "위생", speech: "아침 8시! 이빨을 치카치카 깨끗하게 닦아요!" },
      { id: "st_bag", period: "morning", time: "08:20", title: "책가방 챙기기", icon: "🎒", tag: "준비", speech: "오전 8시 20분! 알림장과 준비물을 스스로 챙겨요!" },
      { id: "st_school", period: "morning", time: "08:40", title: "신나는 등교길", icon: "🏫", tag: "학교", speech: "오전 8시 40분! 씩씩하게 학교로 출발해요!" },

      // ☀️ 점심 (12~16시)
      { id: "st_class", period: "lunch", time: "09:00", title: "두근두근 수업시간", icon: "📖", tag: "공부", speech: "오전 9시! 선생님 말씀을 귀 기울여 재미있게 배워요!" },
      { id: "st_recess", period: "lunch", time: "10:40", title: "중간놀이 시간", icon: "🏃", tag: "놀이", speech: "오전 10시 40분! 친구들과 운동장에서 신나게 뛰어놀아요!" },
      { id: "st_lunch", period: "lunch", time: "12:10", title: "맛있는 학교급식", icon: "🍱", tag: "식사", speech: "배에서 꼬르륵! 낮 12시 10분, 맛있는 급식을 냠냠 먹어요!" },
      { id: "st_library", period: "lunch", time: "13:00", title: "도서관 책읽기", icon: "📚", tag: "독서", speech: "오후 1시! 조용한 도서관에서 동화책을 읽어요!" },
      { id: "st_home", period: "lunch", time: "13:30", title: "룰루랄라 하교길", icon: "🏡", tag: "귀가", speech: "오후 1시 30분! 친구들에게 손 흔들며 집으로 돌아와요!" },

      // 🌇 저녁 (17~20시)
      { id: "st_playground", period: "evening", time: "14:30", title: "놀이터 모험", icon: "🛝", tag: "놀이", speech: "오후 2시 30분! 그네와 미끄럼틀을 타며 놀아요!" },
      { id: "st_academy", period: "evening", time: "15:30", title: "예술·운동 학원", icon: "🎨", tag: "배움", speech: "오후 3시 30분! 피아노, 미술, 태권도에서 솜씨를 뽐내요!" },
      { id: "st_homework", period: "evening", time: "17:00", title: "스스로 숙제하기", icon: "✏️", tag: "자립", speech: "오후 5시! 오늘 배운 내용을 공부방에서 복습해요!" },
      { id: "st_dinner", period: "evening", time: "18:30", title: "가족 저녁식사", icon: "🍲", tag: "식사", speech: "저녁 6시 30분! 온 가족이 모여 즐겁게 저녁을 먹고 대화해요!" },
      { id: "st_family", period: "evening", time: "19:30", title: "가족 자유놀이", icon: "🧩", tag: "휴식", speech: "저녁 7시 30분! 보드게임이나 장난감으로 즐겁게 놀아요!" },

      // 🌙 밤 (21~05시)
      { id: "st_bath", period: "night", time: "20:30", title: "따뜻한 목욕", icon: "🛁", tag: "위생", speech: "밤 8시 30분! 따뜻한 물로 깨끗이 씻고 피로를 풀어요!" },
      { id: "st_tomorrow", period: "night", time: "21:00", title: "내일 옷·가방 준비", icon: "👕", tag: "자립", speech: "밤 9시! 내일 입을 예쁜 옷과 가방을 미리 챙겨요!" },
      { id: "st_story", period: "night", time: "21:20", title: "베드타임 동화책", icon: "🌙", tag: "마음", speech: "밤 9시 20분! 엄마 아빠의 다정한 동화책 이야기를 들어요!" },
      { id: "st_sleep", period: "night", time: "21:40", title: "포근한 꿈나라", icon: "😴", tag: "수면", speech: "밤 9시 40분! 포근한 이불 속에서 좋은 꿈을 꿔요. 잘 자요!" }
    ],
    // 기본 샘플 일과 (처음 진입 시 보여줄 따뜻한 하루 가이드)
    defaultPlan: [
      { id: "def_1", time: "07:30", title: "기상 및 아침밥", icon: "🍳", period: "morning", memo: "맛있는 아침밥 냠냠 먹기" },
      { id: "def_2", time: "08:40", title: "즐거운 학교 등교", icon: "🏫", period: "morning", memo: "친구들과 반갑게 인사하기" },
      { id: "def_3", time: "12:10", title: "맛있는 학교 급식", icon: "🍱", period: "lunch", memo: "골고루 냠냠 남기지 않기" },
      { id: "def_4", time: "15:00", title: "놀이터에서 신나게 놀기", icon: "🛝", period: "evening", memo: "미끄럼틀이랑 그네 타기" },
      { id: "def_5", time: "18:30", title: "온 가족 저녁식사", icon: "🍲", period: "evening", memo: "오늘 있었던 일 이야기하기" },
      { id: "def_6", time: "21:30", title: "포근한 꿈나라", icon: "😴", period: "night", memo: "동화책 읽고 꿀잠 자기" }
    ]
  }
};
