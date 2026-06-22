// kids/data/english-reading-data.js
// 🚛 [English Reading Database]

const ENGLISH_READING_DATABASE = [
    {
        id: "eng_read_01",
        title: "The Lion and the Mouse",
        fullText: "A lion was sleeping in the forest.\nA little mouse ran over his nose.\nThe lion woke up and caught the mouse.\n\"Please let me go!\" said the mouse.\n\"I will help you someday.\"\nThe lion laughed and let him go.",
        conjunctions: [
            {
                sentenceBefore: "The lion woke up and caught the mouse.",
                sentenceAfter: "\"Please let me go!\" said the mouse.",
                options: ["And then", "However", "Because"],
                answer: "And then",
                commentary: "사자가 쥐를 잡았고, '그리고 나서' 쥐가 말했죠."
            }
        ],
        themeQuiz: {
            question: "What is the main lesson of this story?",
            options: ["Even small friends can be a big help.", "Lions like to eat mice.", "You should be quiet in the forest."],
            answerIndex: 0,
            commentary: "작은 친구도 큰 도움을 줄 수 있다는 교훈을 줍니다."
        },
        chatbotSystemPrompt: `
            너는 'The Lion and the Mouse' 이야기를 함께 읽고 아이와 대화하는 AI 영어 멘토 코코야. 
            다음 내용들을 아이와 함께 알아가거나 설명해줘:
            1. 문장의 구성 (예: 'The lion woke up'에서 주어와 동사 찾기)
            2. 글의 주제 (작은 쥐의 보은)
            3. 지칭 대명사 (예: 'let him go'에서 'him'이 누구인지)
            
            말투는 어린이 진행자처럼 다정하고 유창하게 하고, 아이가 영어로 대답하도록 유도해줘. 
            문법이 틀려도 다정하게 교정해주며 칭찬해줘. 
            아이가 자신의 생각을 한 문장 이상 잘 표현했다면 반드시 대답 끝에 [SUCCESS]를 붙여줘.
        `
    }
];
