/**
 * 🌸 [민서 초등 1학년 2학기 맞춤형 5분 퀘스트 문제 은행 SSOT]
 * 과목: 수학(100까지의 수, 덧뺄셈, 모양) · 국어(그림낱말, 받아쓰기, 받침글자, 문장부호) · 영어(파닉스, 알파벳소리, 기초인사)
 */

(function() {
  const minseoMasterBank = {
    math: {
      title: "캔디 수학 놀이터 · 1-2 수학",
      icon: "🧮",
      '100num': [
        { id: "m_num_1", q: "59보다 1 큰 수는 얼마일까요?", formula: "59 + 1 = [ ? ]", options: ["60", "58", "69", "50"], answer: 0, hint: "59 바로 다음 수는 60이에요! 🎈" },
        { id: "m_num_2", q: "10개씩 7묶음과 낱개 5개는 얼마일까요?", formula: "10 × 7 + 5 = [ ? ]", options: ["75", "57", "70", "85"], answer: 0, hint: "7묶음은 70, 낱개 5개니까 75예요! 🍬" },
        { id: "m_num_3", q: "80보다 1 작은 수는 무엇일까요?", formula: "80 - 1 = [ ? ]", options: ["79", "81", "70", "69"], answer: 0, hint: "80 바로 앞의 수는 79예요! 💡" },
        { id: "m_num_4", q: "42의 십의 자리 숫자는 무엇일까요?", formula: "42의 십의 자리", options: ["4", "2", "40", "6"], answer: 0, hint: "앞에 있는 숫자가 십의 자리 4예요!" },
        { id: "m_num_5", q: "10개씩 9묶음은 얼마일까요?", formula: "10개씩 9묶음 = [ ? ]", options: ["90", "9", "99", "100"], answer: 0, hint: "10이 9개 모이면 90(아흔)이 돼요! 👑" },
        { id: "m_num_6", q: "64 바로 다음의 수는 무엇일까요?", formula: "64 다음 수", options: ["65", "63", "74", "54"], answer: 0, hint: "64에 1을 더하면 65예요! ✨" }
      ],
      addsub: [
        { id: "m_as_1", q: "5 + 4 는 얼마일까요?", formula: "5 + 4 = [ ? ]", options: ["9", "8", "7", "10"], answer: 0, hint: "손가락 5개에 4개를 더 펴면 9예요! 🖐️" },
        { id: "m_as_2", q: "9 - 3 은 얼마일까요?", formula: "9 - 3 = [ ? ]", options: ["6", "5", "7", "4"], answer: 0, hint: "9에서 3을 거꾸로 세면 8, 7, 6! 🍭" },
        { id: "m_as_3", q: "3 + 6 은 얼마일까요?", formula: "3 + 6 = [ ? ]", options: ["9", "8", "7", "10"], answer: 0, hint: "큰 수 6에 3을 더하면 9예요! 🍬" },
        { id: "m_as_4", q: "8 - 5 는 얼마일까요?", formula: "8 - 5 = [ ? ]", options: ["3", "2", "4", "5"], answer: 0, hint: "8에서 5를 빼면 3이 남아요! 🎈" },
        { id: "m_as_5", q: "7 + 2 는 얼마일까요?", formula: "7 + 2 = [ ? ]", options: ["9", "8", "10", "6"], answer: 0, hint: "7 다음에 8, 9! 🎯" }
      ],
      shapes: [
        { id: "m_sh_1", q: "어디로든 데굴데굴 잘 굴러가는 동그라미(원) 모양은?", formula: "◯ 동그라미 모양", options: ["축구공", "선물 상자", "삼각김밥", "주사위"], answer: 0, hint: "어디로든 매끄럽게 잘 굴러가는 축구공 모양이에요! ⚽" },
        { id: "m_sh_2", q: "뾰족한 꼭짓점이 3개 있는 세모 모양 물건은?", formula: "△ 세모 모양", options: ["샌드위치 조각", "책", "동전", "벽시계"], answer: 0, hint: "세 모서리가 있는 샌드위치 조각이에요! 🥪" },
        { id: "m_sh_3", q: "반듯하고 평평한 네모(사각형) 모양 물건은?", formula: "□ 네모 모양", options: ["동화책", "구슬", "고깔모자", "풍선"], answer: 0, hint: "네 모서리가 반듯한 동화책이에요! 📖" },
        { id: "m_sh_4", q: "네모난 면으로 둘러싸여 쌓기 좋은 상자 모양 물건은?", formula: "상자 모양", options: ["주사위", "테니스공", "원뿔", "달걀"], answer: 0, hint: "차곡차곡 쌓을 수 있는 주사위 모양이에요! 🎲" }
      ]
    },
    korean: {
      title: "낱말 베이커리 · 초1 국어",
      icon: "📖",
      voca: [
        { id: "v_1", q: "둘을 하나로 합칠 때 쓰는 '+' 기호의 이름은 무엇일까요?", formula: "'+' 기호의 이름 = [ ? ]", audioText: "더하기", audioLang: "ko", options: ["더하기 (덧셈)", "빼기 (뺄셈)", "곱하기", "나누기"], answer: 0, hint: "수를 보태고 합치는 것은 '더하기'예요! ➕" },
        { id: "v_2", q: "사탕이 10개씩 묶여 있지 않고, 하나씩 따로따로 있는 것을 무엇이라고 부를까요?", formula: "하나씩 따로 있는 것 = [ ? ]", audioText: "낱개", audioLang: "ko", options: ["낱개", "묶음", "상자", "바구니"], answer: 0, hint: "묶이지 않고 하나씩 따로따로 있는 것을 '낱개'라고 해요! 🍬" },
        { id: "v_3", q: "친구와 다정하게 생각을 주고받는 이야기를 무엇이라고 할까요?", formula: "다정하게 나누는 이야기 = [ ? ]", audioText: "대화", audioLang: "ko", options: ["대화 (이야기)", "싸움", "침묵", "도망"], answer: 0, hint: "다정하게 이야기를 나누는 것은 '대화'예요! 🗣️" },
        { id: "v_4", q: "사람들이 길을 안전하게 건너도록 하얀 줄을 그어놓은 곳은?", formula: "하얀 줄이 그어진 건널목 = [ ? ]", audioText: "횡단보도", audioLang: "ko", options: ["횡단보도", "차도", "골목길", "철길"], answer: 0, hint: "초록불에 손을 들고 건너는 곳은 '횡단보도'예요! 🦓" },
        { id: "v_5", q: "신호등에서 '길을 건너도 좋아요'를 알리는 안전한 불빛은?", formula: "안전하게 건너는 불빛 = [ ? ]", audioText: "초록불", audioLang: "ko", options: ["초록불 (녹색)", "빨간불 (적색)", "노란불", "깜빡이"], answer: 0, hint: "건너도 되는 안전 신호는 '초록불'이에요! 🟢" }
      ],
      dictation: [
        { id: "k_dic_1", q: "🎧 소리를 잘 듣고, 띄어쓰기가 바르게 된 문장을 골라보세요!", formula: "🎧 '마음을 나누어요'", audioText: "마음을 나누어요", audioLang: "ko", options: ["마음을 나누어요", "마음을나누어요", "마 음 을 나누어요", "마음을나 누어요"], answer: 0, hint: "'마음을'과 '나누어요' 사이에 띄어쓰기를 쏙 넣어요! ✍️" },
        { id: "k_dic_2", q: "🎧 소리를 잘 듣고, 친구에게 감사한 마음을 전하는 바른 말을 골라보세요!", formula: "🎧 '친구야 도와줘서 고마워'", audioText: "친구야 도와줘서 고마워", audioLang: "ko", options: ["친구야 도와줘서 고마워", "친구야 저리 가", "친구야 몰라", "친구야 상관없어"], answer: 0, hint: "도와준 친구에게 '고마워'라고 예쁘게 말해요! 🌸" },
        { id: "k_dic_3", q: "🎧 소리를 잘 듣고, 아침에 선생님을 뵈었을 때 바른 인사말을 골라보세요!", formula: "🎧 '선생님, 안녕하세요!'", audioText: "선생님 안녕하세요", audioLang: "ko", options: ["선생님, 안녕하세요!", "안녕!", "잘 가!", "누구세요?"], answer: 0, hint: "선생님께 공손하게 '안녕하세요!' 하고 인사해요! 🎒" },
        { id: "k_dic_4", q: "🎧 소리를 잘 듣고, 배움터의 이름이 바르게 쓰인 글자를 찾아보세요!", formula: "🎧 '즐거운 [ ? ]'", audioText: "즐거운 학교", audioLang: "ko", options: ["학교", "학꾜", "핰교", "하꾜"], answer: 0, hint: "선생님과 친구들이 모여 공부하는 곳은 '학교'예요! 🏫" },
        { id: "k_dic_5", q: "🎧 소리를 잘 듣고, 친구의 기분을 북돋아 주는 칭찬의 말을 골라보세요!", formula: "🎧 '너 정말 멋지다!'", audioText: "너 정말 멋지다", audioLang: "ko", options: ["너 정말 멋지다!", "너 왜 그래?", "저리 비켜!", "나빠!"], answer: 0, hint: "친구를 칭찬하고 응원할 때는 '정말 멋지다!'예요! 💖" }
      ],
      batchim: [
        { id: "k_bat_1", q: "🎧 소리를 잘 듣고, '꼬꼬댁 [ ? ]'에 들어갈 바른 글자를 찾아보세요!", formula: "🐔 꼬꼬댁 [ ? ]", audioText: "꼬꼬댁 닭", audioLang: "ko", options: ["닭", "닥", "달", "답"], answer: 0, hint: "소리는 [닥]으로 나지만, 꼬꼬댁 암탉과 수탉은 '닭'으로 써요! 🐔" },
        { id: "k_bat_2", q: "🎧 소리를 잘 듣고, '알록달록 [ ? ]'의 바른 글자를 골라보세요!", formula: "🌺 알록달록 [ ? ]", audioText: "알록달록 꽃", audioLang: "ko", options: ["꽃", "꼳", "꼮", "꼧"], answer: 0, hint: "소리는 [꼳]으로 나지만, 예쁜 꽃은 ㅊ 받침 '꽃'으로 써요! 🌺" },
        { id: "k_bat_3", q: "🎧 소리를 잘 듣고, 시원하고 달콤한 여름 과일의 바른 이름을 찾아보세요!", formula: "🍉 시원한 [ ? ]", audioText: "시원한 수박", audioLang: "ko", options: ["수박", "수밖", "수방", "수발"], answer: 0, hint: "초록 바탕에 검은 줄이 있는 시원한 과일은 '수박'이에요! 🍉" },
        { id: "k_bat_4", q: "🎧 소리를 잘 듣고, '밤하늘의 [ ? ]'에 들어갈 알맞은 글자를 골라보세요!", formula: "🌙 밤하늘의 [ ? ]", audioText: "밤하늘의 달", audioLang: "ko", options: ["달", "탈", "딸", "돌"], answer: 0, hint: "밤하늘을 환하게 비추는 둥근 친구는 '달'이에요! 🌙" },
        { id: "k_bat_5", q: "🎧 소리를 잘 듣고, '하늘에서 내리는 [ ? ]'의 바른 글자를 골라보세요!", formula: "❄️ 하늘에서 내리는 [ ? ]", audioText: "하늘에서 내리는 눈", audioLang: "ko", options: ["눈", "문", "손", "돈"], answer: 0, hint: "펄펄 하늘에서 내려와 눈사람을 만드는 것은 '눈'이에요! ❄️" },
        { id: "k_bat_6", q: "🎧 소리를 잘 듣고, '숲속의 귀여운 [ ? ]'에 들어갈 바른 글자를 찾아보세요!", formula: "🐻 숲속의 귀여운 [ ? ]", audioText: "숲속의 곰", audioLang: "ko", options: ["곰", "공", "골", "곱"], answer: 0, hint: "꿀을 좋아하는 엉금엉금 동물은 '곰'이에요! 🐻" }
      ],
      sentence: [
        { id: "k_sen_1", q: "궁금한 것을 물어볼 때 문장 끝에 붙이는 부호는?", formula: "물어보는 문장 부호", options: ["물음표(?)", "마침표(.)", "느낌표(!)", "쉼표(,)"], answer: 0, hint: "궁금할 때는 갸우뚱 물음표(?)를 붙여요! ❓" },
        { id: "k_sen_2", q: "깜짝 놀라거나 외칠 때 문장 끝에 붙이는 부호는?", formula: "감탄하는 문장 부호", options: ["느낌표(!)", "마침표(.)", "물음표(?)", "따옴표(\"\")"], answer: 0, hint: "깜짝 놀라거나 외칠 때는 느낌표(!)를 붙여요! ❗" },
        { id: "k_sen_3", q: "생각을 전하는 문장을 마칠 때 끝에 찍는 것은?", formula: "문장을 마칠 때", options: ["마침표(.)", "물음표(?)", "느낌표(!)", "줄표(-)"], answer: 0, hint: "문장이 끝나면 얌전하게 마침표(.)를 찍어요!" }
      ]
    },
    english: {
      title: "파닉스 스피킹 · 초1 영어",
      icon: "🔤",
      phonics: [
        { id: "e_pho_1", q: "알파벳 'A'로 시작하는 맛있는 빨간 과일은?", formula: "🍎 A a /æ/", audioText: "Apple", options: ["Apple", "Banana", "Cat", "Dog"], answer: 0, hint: "A is for Apple! /애, 애, 애플/! 🍎" },
        { id: "e_pho_2", q: "알파벳 'B'로 시작하는 귀여운 곰 인형은?", formula: "🐻 B b /b/", audioText: "Bear", options: ["Bear", "Ant", "Duck", "Fish"], answer: 0, hint: "B is for Bear! /ㅂ, ㅂ, 베어/! 🐻" },
        { id: "e_pho_3", q: "알파벳 'C'로 시작하는 야옹이 고양이는?", formula: "🐱 C c /k/", audioText: "Cat", options: ["Cat", "Elephant", "Frog", "Gorilla"], answer: 0, hint: "C is for Cat! /ㅋ, ㅋ, 캣/! 🐱" },
        { id: "e_pho_4", q: "알파벳 'D'로 시작하는 멍멍이 강아지는?", formula: "🐶 D d /d/", audioText: "Dog", options: ["Dog", "Hippo", "Lion", "Monkey"], answer: 0, hint: "D is for Dog! /ㄷ, ㄷ, 독/! 🐶" },
        { id: "e_pho_5", q: "알파벳 'E'로 시작하는 맛있는 달걀(알)은?", formula: "🥚 E e /e/", audioText: "Egg", options: ["Egg", "Pencil", "Sun", "Tree"], answer: 0, hint: "E is for Egg! /에, 에, 에그/! 🥚" }
      ],
      abc: [
        { id: "e_abc_1", q: "대문자 'A'의 짝꿍 소문자는 무엇일까요?", formula: "A 짝꿍 소문자", audioText: "letter a", options: ["a", "b", "d", "e"], answer: 0, hint: "A의 소문자는 둥글고 귀여운 a예요!" },
        { id: "e_abc_2", q: "대문자 'B'의 짝꿍 소문자는 무엇일까요?", formula: "B 짝꿍 소문자", audioText: "letter b", options: ["b", "d", "p", "q"], answer: 0, hint: "오른쪽으로 배가 볼록 나온 b예요!" },
        { id: "e_abc_3", q: "/s/ 소리가 나며 하늘에 빛나는 해(태양)는?", formula: "☀️ S s /s/", audioText: "Sun", options: ["Sun", "Moon", "Star", "Cloud"], answer: 0, hint: "S is for Sun! /스, 스, 썬/! ☀️" }
      ],
      greetings: [
        { id: "e_grt_1", q: "아침에 '좋은 아침!' 하고 인사할 때 영어로는?", formula: "아침 인사", audioText: "Good morning", options: ["Good morning!", "Good night!", "Bye bye!", "Thank you!"], answer: 0, hint: "상쾌한 아침 인사는 'Good morning!'이에요! ☀️" },
        { id: "e_grt_2", q: "친구에게 고마운 마음을 전할 때 하는 영어는?", formula: "고마워", audioText: "Thank you", options: ["Thank you!", "Sorry!", "Hello!", "Good!"], answer: 0, hint: "고마울 때는 'Thank you!'라고 말해요! 💖" },
        { id: "e_grt_3", q: "헤어질 때 손을 흔들며 '잘 가!' 하는 인사는?", formula: "작별 인사", audioText: "Good bye", options: ["Good bye!", "Good morning!", "Yes!", "No!"], answer: 0, hint: "헤어질 때는 'Good bye!'해요! 👋" }
      ]
    }
  };

  // 전역 노출
  window.minseoMasterBank = minseoMasterBank;
})();
