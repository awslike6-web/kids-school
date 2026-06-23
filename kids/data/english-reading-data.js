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
    },
    {
    id: "eng_read_02",
    title: "Exciting Summer Plans",
    fullText: "Summer vacation is coming soon.\nToday, Minji and Tom are talking about their plans for this summer.\n\"What will you do this summer, Tom?\"\n\"I have a great plan! This weekend, I'll travel to Busan.\nI will go to the beach and ride a boat. I think I will feel fresh there. What about you?\"\n\"I'll visit my uncle tomorrow. I'll go hiking with him. We will go camping, too!\"\n\"That sounds great! Will you do anything else?\"\n\"Yes, I will take a piano class and learn Chinese.\nI worry a little bit, but I will try my best. I will also paint a picture.\"\n\"Don't worry. You will do great!\nBy the way, I will practice soccer and play with my friends.\nNext month, my family will visit my grandparents and go to an amusement park. Do you want to join us?\"\n\"Yes, I'd love to! After the amusement park, we can try cooking dinner together.\"\nBoth friends are very excited about this summer.",
    conjunctions: [
        {
            sentenceBefore: "I'll visit my uncle tomorrow. I'll go hiking with him.",
            sentenceAfter: "We will go camping, too!",
            options: ["And then", "However", "Because"],
            answer: "And then",
            commentary: "삼촌과 등산을 가고, '그리고 나서' 캠핑도 간다는 자연스러운 흐름이므로 'And then'이 가장 잘 어울려요."
        }
    ],
    themeQuiz: {
        question: "What is the main topic of this passage?",
        options: [
            "Minji and Tom's summer vacation plans.", 
            "How to ride a boat in Busan.", 
            "Why Minji worries about learning Chinese."
        ],
        answerIndex: 0,
        commentary: "이 글은 민지와 톰이 다가오는 여름 방학에 무엇을 할지 서로의 '계획(plans)'에 대해 묻고 답하는 내용이에요."
    },
    chatbotSystemPrompt: `
        너는 'Exciting Summer Plans' 지문을 함께 읽고 아이와 대화하는 AI 영어 멘토 코코야.
        다음 내용들을 아이와 함께 알아가거나 설명해줘:
        1. 미래 시제 'will'의 쓰임 (예: 'I will go to the beach'에서 'will'의 역할과 줄임말 'I'll' 찾기)
        2. 글의 핵심 주제 (민지와 톰의 신나는 여름 방학 계획)
        3. 어휘와 지칭 이해 (예: 'Do you want to join us?'에서 'join'의 뜻과 'us'가 누구인지)
        
        말투는 어린이 텔레비전 진행자처럼 다정하고 유쾌하게 하고, 아이가 영어로 짧게라도 대답하도록 유도해줘.
        아이가 문법을 틀려도 자연스럽게 올바른 문장으로 다시 말해주며 폭풍 칭찬해줘.
        아이가 자신의 이번 여름 방학 계획(또는 지문에 대한 생각)을 한 문장 이상 영어로 잘 표현했다면 반드시 대답 끝에 [SUCCESS]를 붙여줘.
    `
}


];
