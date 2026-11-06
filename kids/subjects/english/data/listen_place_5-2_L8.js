// kids/subjects/english/data/listen_place_5-2_L8.js
// 🎧 영어 5-2 8단원 (외모와 옷차림) 「듣고 끌어다 놓기」 데이터 모듈
// - 문장 글자와 뜻은 노션 VOCA_DB에서 실시간으로 읽고 매칭합니다.
// - 여기에는 VOCA 행의 pageId와 인물(who), 입힐 부위(slot)/아이템(answer) 계약만 정의합니다.

window.LISTEN_PLACE_SCENE = {
  scene: 'dressup',
  grade: '5-2',
  unit: 'L8',
  title: '친구 옷 입혀 주기',
  subtitle: '문장을 잘 듣고 어울리는 머리와 옷을 입혀 주세요!',

  // 받침대에 나올 물건 전체 목록 (부위별 정답 및 오답 후보 풀)
  items: [
    // 1. 헤어 (hair)
    { id: 'hair-long-straight',  slot: 'hair', label: 'long straight hair',  type: 'hair', desc: '긴 생머리' },
    { id: 'hair-long-curly',     slot: 'hair', label: 'long curly hair',     type: 'hair', desc: '긴 곱슬머리' },
    { id: 'hair-short-straight', slot: 'hair', label: 'short straight hair', type: 'hair', desc: '짧은 생머리' },
    { id: 'hair-short-curly',    slot: 'hair', label: 'short curly hair',    type: 'hair', desc: '짧은 곱슬머리' },

    // 2. 눈 (eyes)
    { id: 'eyes-blue',  slot: 'eyes', label: 'blue eyes',  color: '#2563eb', desc: '파란 눈' },
    { id: 'eyes-green', slot: 'eyes', label: 'green eyes', color: '#10b981', desc: '초록 눈' },
    { id: 'eyes-brown', slot: 'eyes', label: 'brown eyes', color: '#854d0e', desc: '갈색 눈' },
    { id: 'eyes-black', slot: 'eyes', label: 'black eyes', color: '#1e293b', desc: '검은 눈' }, // 오답 보충

    // 3. 모자 (head)
    { id: 'cap-red',    slot: 'head', label: 'red cap',    color: '#ef4444', desc: '빨간 모자' },
    { id: 'cap-blue',   slot: 'head', label: 'blue cap',   color: '#3b82f6', desc: '파란 모자' }, // 오답용
    { id: 'cap-yellow', slot: 'head', label: 'yellow cap', color: '#eab308', desc: '노란 모자' }, // 오답용
    { id: 'cap-green',  slot: 'head', label: 'green cap',  color: '#22c55e', desc: '초록 모자' }, // 오답용

    // 4. 안경 (glasses)
    { id: 'glasses',       slot: 'glasses', label: 'glasses',       color: '#334155', desc: '멋진 안경' },
    { id: 'sunglasses',    slot: 'glasses', label: 'sunglasses',    color: '#0f172a', desc: '선글라스' }, // 오답용
    { id: 'round-glasses', slot: 'glasses', label: 'round glasses', color: '#ea580c', desc: '동글 안경' }, // 오답용
    { id: 'goggles',       slot: 'glasses', label: 'goggles',       color: '#0284c7', desc: '고글' },     // 오답용

    // 5. 상의 (top)
    { id: 'shirt-yellow', slot: 'top', label: 'yellow T-shirt', color: '#facc15', desc: '노란 티셔츠' },
    { id: 'shirt-white',  slot: 'top', label: 'white shirt',    color: '#f8fafc', desc: '하얀 셔츠' }, // 오답용
    { id: 'shirt-blue',   slot: 'top', label: 'blue shirt',     color: '#3b82f6', desc: '파란 셔츠' }, // 오답용
    { id: 'shirt-green',  slot: 'top', label: 'green T-shirt',  color: '#22c55e', desc: '초록 티셔츠' }, // 오답용

    // 6. 하의 (bottom)
    { id: 'skirt-black', slot: 'bottom', label: 'black skirt', color: '#1e293b', desc: '검정 치마' },
    { id: 'skirt-red',   slot: 'bottom', label: 'red skirt',   color: '#ef4444', desc: '빨간 치마' },
    { id: 'pants-blue',  slot: 'bottom', label: 'blue pants',  color: '#2563eb', desc: '파란 바지' },
    { id: 'pants-black', slot: 'bottom', label: 'black pants', color: '#334155', desc: '검정 바지' }  // 오답용
  ],

  // 8단원 문제 목록: 노션 VOCA DB의 실제 pageId와 정답 아이템 ID 매핑
  questions: [
    // [착용 - 의류 & 악세서리]
    { pageId: '3e4a2711-5b68-81fe-bfd0-ed97bdf1015c', who: 'she', answer: ['skirt-black'] }, // She's wearing a black skirt.
    { pageId: '3e4a2711-5b68-810c-a95f-c3af9b7565d7', who: 'she', answer: ['pants-blue'] },  // She's wearing blue pants.
    { pageId: '3e4a2711-5b68-8139-8de2-d6ac13921b55', who: 'she', answer: ['shirt-yellow'] },// She's wearing a yellow T-shirt.
    { pageId: '3e4a2711-5b68-81af-8696-d27e8acb7ba9', who: 'he',  answer: ['cap-red'] },     // He's wearing a red cap.
    { pageId: '3e4a2711-5b68-8118-afae-dcec7fe4da54', who: 'he',  answer: ['glasses'] },     // He's wearing glasses.
    { pageId: '3d8a2711-5b68-818b-84c0-e13487b31a4d', who: 'she', answer: ['skirt-red'] },   // She is wearing a red skirt.

    // [눈 색상]
    { pageId: '3e4a2711-5b68-81be-95f6-c8422cb765dd', who: 'he',  answer: ['eyes-green'] },  // He has green eyes.
    { pageId: '3e4a2711-5b68-815b-870f-ca7f441d0141', who: 'she', answer: ['eyes-blue'] },   // She has blue eyes.
    { pageId: '3e4a2711-5b68-8113-b5aa-cd1439ca94ae', who: 'he',  answer: ['eyes-brown'] },  // He has brown eyes.

    // [머리 모양 4종]
    { pageId: '3e4a2711-5b68-81e4-b539-da590918d21c', who: 'she', answer: ['hair-long-straight'] },  // She has long straight hair.
    { pageId: '3e4a2711-5b68-819b-9558-dc70b4cdca59', who: 'she', answer: ['hair-long-curly'] },     // She has long curly hair.
    { pageId: '3e4a2711-5b68-8113-a83f-c9c17e4443fa', who: 'he',  answer: ['hair-short-straight'] }, // He has short straight hair.
    { pageId: '3e4a2711-5b68-81f8-8d3b-dc63e3b39695', who: 'he',  answer: ['hair-short-curly'] },    // He has short curly hair.

    // [두 부위 복합 문장 2종]
    { pageId: '3d8a2711-5b68-81bf-8fc8-d7de33acd759', who: 'he',  answer: ['hair-short-curly', 'eyes-green'] }, // He has short curly hair and green eyes.
    { pageId: '3d8a2711-5b68-81a9-aed9-f716ecd0a5ad', who: 'she', answer: ['hair-long-straight', 'eyes-blue'], finale: true } // She has long straight hair and blue eyes. (피날레 판)
  ]
};
