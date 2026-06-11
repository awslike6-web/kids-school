// kids/korean-reading-data.js
// 🚛 [대형 화물 보관소] 무거운 지문 데이터들은 전부 여기에 보관합니다.

const KOREAN_READING_DATABASE = [
    {
        id: "book_01", // 👈 노션의 [도서 키(ID)] 바코드와 완벽 매칭!
        title: "토끼와 거북이",
        paragraphs: [
            { id: "p1", label: "A", text: "옛날 옛적에 숲속 마을에 발이 아주 빠른 토끼와 느릿느릿 걷는 거북이가 살고 있었어요." },
            { id: "p2", label: "B", text: "토끼는 거북이를 놀리며 달리기 경주를 제안했고, 깡충깡충 뛰어가다 나무 그늘에서 잠이 들고 말았죠." },
            { id: "p3", label: "C", text: "하지만 거북이는 쉬지 않고 끝까지 엉금엉금 기어가 결국 경주에서 승리했답니다." }
        ],
        correctOrder: ["p1", "p2", "p3"],
        conjunction: {
            sentenceBefore: "토끼는 중간에 쿨쿨 잠을 잤습니다.",
            sentenceAfter: "거북이는 끝까지 포기하지 않고 걸어갔습니다.",
            options: ["그래서", "하지만", "그리고"],
            answer: "하지만",
            commentary: "앞의 행동과 뒤의 행동이 반대되므로 '하지만'이 맞아요!"
        },
        themeQuiz: {
            question: "이 글이 우리에게 알려주려는 진짜 교훈(주제)은 무엇일까요?",
            options: [
                "낮잠을 자면 키가 쑥쑥 큰다.",
                "조금 느려도 포기하지 않고 꾸준히 하는 것이 중요하다.",
                "달리기를 잘하려면 다리가 길어야 한다."
            ],
            answerIndex: 1,
            commentary: "거북이처럼 느려도 성실하게 끝까지 해내는 것이 승리의 비결이에요."
        },
        lessonCards: [
            "성실함의 힘을 믿어요",
            "남과 비교하지 않고 나의 속도대로 갈래요",
            "내가 잘한다고 자만하지 않을래요"
        ],
        chatbotSystemPrompt: "너는 토끼와 거북이 동화의 숨겨진 의미를 아이가 스스로 깨닫게 도와주는 친절한 멘토 AI야."
    },
    {
        id: "book_02", // 두 번째 바코드
        title: "흥부와 놀부",
        paragraphs: [ /* 흥부전 지문 데이터... */ ],
        // ... (생략) ...
    }
];