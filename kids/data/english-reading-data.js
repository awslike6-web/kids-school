// kids/data/english-reading-data.js
// 🚛 [English Reading Database]

const ENGLISH_READING_DATABASE = [
    {
        id: "eng_read_01",
        title: "The Lion and the Mouse",
        fullText: "A lion was sleeping in the forest.\nA little mouse ran over his nose.\nThe lion woke up and caught the mouse.\n\"Please let me go!\" said the mouse.\n\"I will help you someday.\"\nThe lion laughed and let him go.",
        translation: "사자가 숲에서 자고 있었어요.\n작은 쥐 한 마리가 사자의 코 위로 달려갔어요.\n사자가 잠에서 깨어나 쥐를 잡았어요.\n\"제발 저를 놔주세요!\" 쥐가 말했어요.\n\"언젠가 당신을 도울게요.\"\n사자는 웃으며 쥐를 놓아주었어요.",
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
        title: "Exciting Summer Plans (6단원)",
        fullText: "Summer vacation is coming soon. Today, Minji and Tom are talking about their plans for this summer. \"What will you do this summer, Tom?\"\n\"I have a great plan! This weekend, I'll travel to Busan. I will go to the beach and ride a boat. I think I will feel fresh there. What about you?\"\n\"I'll visit my uncle tomorrow. I'll go hiking with him. We will go camping, too!\" \"That sounds great! Will you do anything else?\" \"Yes, I will take a piano class and learn Chinese. I worry a little bit, but I will try my best. I will also paint a picture.\"\n\"Don't worry. You will do great! By the way, I will practice soccer and play with my friends. Next month, my family will visit my grandparents and go to an amusement park. Do you want to join us?\" \"Yes, I'd love to! After the amusement park, we can try cooking dinner together.\" Both friends are very excited about this summer.",
        translation: "여름 방학이 곧 다가옵니다. 오늘, 민지와 톰은 이번 여름 계획에 대해 이야기하고 있습니다. \"톰, 이번 여름에 뭐 할 거야?\"\n\"나는 멋진 계획이 있어! 이번 주말에 부산으로 여행을 갈 거야. 해변에 가서 보트를 탈 거야. 거기서 상쾌한 기분을 느낄 수 있을 것 같아. 너는 어때?\"\n\"나는 내일 삼촌을 뵈러 갈 거야. 삼촌과 함께 등산하러 갈 거야. 우리는 캠핑도 갈 거야!\" \"그거 정말 멋지다! 다른 것도 할 거니?\" \"응, 나는 피아노 수업을 듣고 중국어를 배울 거야. 조금 걱정되지만, 최선을 다할 거야. 그림도 그릴 거야.\"\n\"걱정하지 마. 넌 잘할 거야! 그나저나, 나는 축구를 연습하고 친구들과 놀 거야. 다음 달에는 우리 가족이 조부모님 댁을 방문하고 놀이공원에 갈 거야. 너도 우리와 함께할래?\" \"응, 너무 좋아! 놀이공원에 다녀온 후에, 우리 같이 저녁 요리를 해봐도 좋겠다.\" 두 친구 모두 이번 여름에 대해 매우 들떠 있습니다.",
        paragraphs: [
            { id: "p1", label: "A", text: "Summer vacation is coming soon. Today, Minji and Tom are talking about their plans for this summer. \"What will you do this summer, Tom?\"" },
            { id: "p2", label: "B", text: "\"I have a great plan! This weekend, I'll travel to Busan. I will go to the beach and ride a boat. I think I will feel fresh there. What about you?\"" },
            { id: "p3", label: "C", text: "\"I'll visit my uncle tomorrow. I'll go hiking with him. We will go camping, too!\" \"That sounds great! Will you do anything else?\" \"Yes, I will take a piano class and learn Chinese. I worry a little bit, but I will try my best. I will also paint a picture.\"" },
            { id: "p4", label: "D", text: "\"Don't worry. You will do great! By the way, I will practice soccer and play with my friends. Next month, my family will visit my grandparents and go to an amusement park. Do you want to join us?\" \"Yes, I'd love to! After the amusement park, we can try cooking dinner together.\" Both friends are very excited about this summer." }
        ],
        correctOrder: ["p1", "p2", "p3", "p4"],
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
    },
    {
        id: "eng_read_03",
        title: "The International Student Camp (1단원)",
        fullText: "Welcome to the International Student Camp! We have students from all over the world. They come from many different countries like the U.S., Canada, Mexico, Italy, Thailand, and Korea. When they meet, they usually ask, \"Where are you from?\" and answer, \"I'm from...\"\nMaking new friends is the key to this camp. Sometimes, names are hard to write. So, friends ask, \"How do you spell your name?\" They spell their names and share a special story or a big dream. They also make a short video together.\nStudents also give each other traditional food and sweet fruit. They listen to pop music and sing a beautiful song from their country. Learning about different cultures is very fun!",
        translation: "국제 학생 캠프에 오신 것을 환영합니다! 우리 캠프에는 전 세계에서 온 학생들이 있습니다. 그들은 미국, 캐나다, 멕시코, 이탈리아, 태국, 한국 등 많은 다양한 나라에서 왔습니다. 그들은 만날 때 보통 \"어디에서 오셨어요?\"라고 묻고, \"저는 ...에서 왔어요\"라고 대답합니다.\n새로운 친구를 사귀는 것이 이 캠프의 핵심입니다. 때때로, 이름은 쓰기 어렵습니다. 그래서 친구들은 \"이름 철자가 어떻게 되나요?\"라고 묻습니다. 그들은 자신의 이름 철자를 말해주고 특별한 이야기나 큰 꿈을 공유합니다. 그들은 함께 짧은 비디오도 만듭니다.\n학생들은 또한 서로에게 전통 음식과 달콤한 과일을 줍니다. 그들은 대중음악을 듣고 그들 나라의 아름다운 노래를 부릅니다. 서로 다른 문화에 대해 배우는 것은 아주 재미있습니다!",
        conjunctions: [
            {
                sentenceBefore: "Sometimes, names are hard to write.",
                sentenceAfter: "Friends ask, \"How do you spell your name?\"",
                options: ["So", "Because", "But"],
                answer: "So",
                commentary: "이름을 쓰기 어려울 때가 있어서 '그래서(So)' 이름을 어떻게 적는지 묻는다는 흐름이 가장 자연스럽습니다."
            }
        ],
        themeQuiz: {
            question: "What is the main topic of this passage?",
            options: [
                "Making friends and sharing cultures at an international camp.",
                "How to make traditional food and fruit.",
                "Singing a pop song in a video."
            ],
            answerIndex: 0,
            commentary: "이 글은 여러 나라에서 온 학생들이 모인 국제 캠프에서 친구를 사귀고 문화를 나누는 것에 대한 내용입니다."
        },
        chatbotSystemPrompt: `
            너는 'The International Student Camp' 지문을 함께 읽고 아이와 대화하는 AI 영어 멘토 코코야.
            다음 내용들을 아이와 함께 알아가거나 설명해줘:
            1. 출신을 묻고 답하는 표현 (예: 'Where are you from?', 'I'm from...' 직접 연습해보기)
            2. 글에 등장하는 다양한 나라 이름 찾기 (Korea, the U.S., Canada, Mexico, Italy, Thailand)
            3. 글의 핵심 주제 (국제 캠프에서 새로운 친구를 사귀고 문화를 나누는 즐거움)
            
            말투는 어린이 텔레비전 진행자처럼 다정하고 유쾌하게 하고, 아이가 영어로 짧게라도 대답하도록 유도해줘.
            아이가 문법을 틀려도 자연스럽게 올바른 문장으로 다시 말해주며 폭풍 칭찬해줘.
            아이가 가고 싶은 나라나 지문에 대한 자신의 생각을 한 문장 이상 영어로 잘 표현했다면 반드시 대답 끝에 [SUCCESS]를 붙여줘.
        `
    },
    {
        id: "eng_read_04",
        title: "A Trip to the Museum and Park (2단원)",
        fullText: "Today, my family went to a museum. We got a ticket to see a lot of old things. Inside, I asked the guide, \"Can I touch this?\" He answered, \"Sorry, you can't. You must keep your hands away.\" Then I asked, \"Can I take a picture of this old present?\" He smiled and said, \"Sure, you can.\"\nAfter that, we walked over to a park near the river. We saw many green trees and a plant with a beautiful flower. I was thirsty and hungry. \"Can I have some juice?\" I asked my mom. \"Sure, you can. Use this cup,\" she said. We decided to sit here under a tree. We ate a delicious cheese sandwich and had no problem relaxing.\nLater, I wanted to draw the river. \"Can I borrow your pen?\" I asked my dad, and he let me take it. Then I asked, \"Can I bring my bike and ride it here?\" Dad said, \"Sorry, you can't. Your bike doesn't work well on this grass, and we need to get some rest.\" We just enjoyed nature together.",
        translation: "오늘, 우리 가족은 박물관에 갔습니다. 우리는 많은 옛날 물건들을 보기 위해 표를 샀습니다. 안에서 나는 안내원에게 물었습니다. \"이것을 만져도 되나요?\" 그는 대답했습니다. \"미안하지만, 안 돼요. 손을 대면 안 됩니다.\" 그런 다음 나는 물었습니다. \"이 오래된 선물의 사진을 찍어도 되나요?\" 그는 웃으며 말했습니다. \"네, 해도 돼요.\"\n그 후, 우리는 강 근처의 공원으로 걸어갔습니다. 우리는 많은 초록색 나무들과 아름다운 꽃이 있는 식물을 보았습니다. 나는 목마르고 배가 고팠습니다. \"주스 좀 마셔도 될까요?\" 나는 엄마에게 물었습니다. \"네, 마셔도 돼. 이 컵을 사용하렴,\" 그녀가 말했습니다. 우리는 여기 나무 아래에 앉기로 했습니다. 우리는 맛있는 치즈 샌드위치를 먹었고 편안하게 쉬는 데 아무런 문제가 없었습니다.\n나중에, 나는 강을 그리고 싶었습니다. \"펜 좀 빌려도 될까요?\" 나는 아빠에게 물었고, 아빠는 빌려주셨습니다. 그런 다음 나는 물었습니다. \"제 자전거를 가져와서 여기서 타도 될까요?\" 아빠가 말씀하셨습니다. \"미안하지만, 안 된단다. 네 자전거는 이 잔디밭에서 잘 움직이지 않고, 우리는 휴식이 좀 필요하거든.\" 우리는 그저 함께 자연을 즐겼습니다.",
        conjunctions: [
            {
                sentenceBefore: "I was thirsty and hungry.",
                sentenceAfter: "\"Can I have some juice?\" I asked my mom.",
                options: ["So", "But", "Because"],
                answer: "So",
                commentary: "목마르고 배가 고팠기 때문에, '그래서(So)' 엄마에게 주스를 마셔도 되는지 물어보는 흐름이 가장 자연스럽습니다."
            }
        ],
        themeQuiz: {
            question: "What did the family NOT do in the story?",
            options: [
                "They visited a museum and saw old things.",
                "They rode a bike near the river.",
                "They ate a delicious cheese sandwich."
            ],
            answerIndex: 1,
            commentary: "자전거를 타도 되냐는 질문에 아빠가 안 된다고('Sorry, you can\\'t.') 하셨기 때문에 자전거를 타지는 않았습니다."
        },
        chatbotSystemPrompt: `
            너는 'A Trip to the Museum and Park' 지문을 함께 읽고 아이와 대화하는 AI 영어 멘토 코코야.
            다음 내용들을 아이와 함께 알아가거나 설명해줘:
            1. 허락을 구하고 답하는 핵심 표현 (예: 'Can I...?'로 묻고 'Sure, you can.' 또는 'Sorry, you can't.'로 대답하는 규칙)
            2. 장소에 따른 올바른 행동 (박물관에서는 만지면 안 되고, 공원에서는 편하게 쉬며 음식을 먹은 이야기)
            3. 새롭게 배운 단어 활용 (예: borrow, thirsty, delicious 등을 넣어 짧은 문장 만들어보기)
            
            말투는 어린이 텔레비전 진행자처럼 다정하고 유쾌하게 하고, 아이가 영어로 짧게라도 대답하도록 유도해줘.
            아이가 문법을 틀려도 자연스럽게 올바른 문장으로 다시 말해주며 폭풍 칭찬해줘.
            아이가 지문의 내용에 대해 자신의 생각이나 경험(예: 박물관에 가본 경험)을 한 문장 이상 영어로 잘 표현했다면 반드시 대답 끝에 [SUCCESS]를 붙여줘.
        `
    },
    {
        id: "eng_read_05",
        title: "Finding Lost Things (3단원)",
        fullText: "Minji and her friend are packing to go home to their family. Minji sees a blue bag. \"Whose backpack is this?\" she asks. Her friend says, \"It's mine.\" Then, Minji points to a coat. \"Whose jacket is that?\" Her friend says, \"It's Junho's. Look at the star button on the back.\"\nThey look out the window and continue to clean. They find a pencil case with a cute elephant sticker. The elephant has a long nose. \"Whose pencil case is this?\" asks Minji. Inside, there is a ruler, an eraser, and a pencil. Her friend has a good idea. \"Junho loves elephants. So, of course, this is his pencil case, too!\"\nNext, Minji holds up a heavy book and a water container. \"Is that your textbook and bottle?\" Her friend checks and says, \"It's yours, Minji!\" Minji laughs. Finally, she takes out her phone to call her mom. They are happy to give everything back to their friends.",
        translation: "민지와 친구는 가족이 있는 집으로 가기 위해 짐을 싸고 있습니다. 민지는 파란색 가방을 봅니다. \"이것은 누구의 배낭인가요?\" 그녀가 묻습니다. 친구가 말합니다. \"내 것이에요.\" 그런 다음, 민지는 외투를 가리킵니다. \"저것은 누구의 재킷인가요?\" 친구가 말합니다. \"준호의 것이에요. 뒤쪽에 있는 별 단추를 봐.\"\n그들은 창밖을 내다보고 계속해서 청소를 합니다. 그들은 귀여운 코끼리 스티커가 있는 필통(연필 상자)을 발견합니다. 코끼리는 긴 코를 가지고 있습니다. \"이것은 누구의 필통인가요?\" 민지가 묻습니다. 안에는 자, 지우개, 그리고 연필이 있습니다. 친구에게 좋은 생각이 떠오릅니다. \"준호는 코끼리를 좋아해. 그러니까 물론, 이것도 그의 필통이야!\"\n다음으로, 민지는 무거운 책과 물통을 들어 올립니다. \"저게 네 교과서와 물통이니?\" 친구가 확인하고 말합니다. \"네 것이에요, 민지!\" 민지가 웃습니다. 마지막으로, 그녀는 엄마에게 전화하기 위해 휴대 전화를 꺼냅니다. 그들은 모든 것을 친구들에게 다시 돌려주게 되어 기쁩니다.",
        conjunctions: [
            {
                sentenceBefore: "Her friend has a good idea. \"Junho loves elephants.\"",
                sentenceAfter: "Of course, this is his pencil case, too!\"",
                options: ["So", "But", "Because"],
                answer: "So",
                commentary: "준호가 코끼리를 좋아하기 때문에, '그래서(So)' 당연히 코끼리 스티커가 붙은 이 필통도 준호의 것이라고 추리하는 흐름이 자연스럽습니다."
            }
        ],
        themeQuiz: {
            question: "What are Minji and her friend doing in the story?",
            options: [
                "Finding lost things in the classroom.",
                "Buying a new backpack and a jacket.",
                "Going to the zoo to see an elephant."
            ],
            answerIndex: 0,
            commentary: "이 글은 민지와 친구가 교실에서 잃어버린 배낭, 재킷, 필통 등의 주인을 찾아주는(Finding lost things) 내용입니다."
        },
        chatbotSystemPrompt: `
            너는 'Finding Lost Things' 지문을 함께 읽고 아이와 대화하는 AI 영어 멘토 코코야.
            다음 내용들을 아이와 함께 알아가거나 설명해줘:
            1. 물건의 주인을 묻고 답하는 핵심 표현 (예: 'Whose ... is this/that?', 'It's mine.', 'It's yours.', 'It's Junho's.' 연습하기)
            2. 지문에 등장한 다양한 학용품과 물건 단어 찾기 (backpack, jacket, pencil case, ruler, eraser, textbook, bottle 등)
            3. 가까운 것(this)과 멀리 있는 것(that)을 가리킬 때 질문이 어떻게 달라지는지 차이점 설명하기
            
            말투는 어린이 텔레비전 진행자처럼 다정하고 유쾌하게 하고, 아이가 영어로 짧게라도 대답하도록 유도해줘.
            아이가 문법을 틀려도 자연스럽게 올바른 문장으로 다시 말해주며 폭풍 칭찬해줘.
            아이가 지문의 내용에 대해 자신의 생각이나 경험(예: 물건을 잃어버리거나 찾아준 경험)을 한 문장 이상 영어로 잘 표현했다면 반드시 대답 끝에 [SUCCESS]를 붙여줘.
        `
    },
    {
        id: "eng_read_06",
        title: "My Favorite Day at School (4단원)",
        fullText: "Today, we had a special talk in our classroom. The teacher asked, \"What is your favorite subject?\" Many friends raised their hands. Sumin stood up second and said, \"My favorite subject is math. I really like solving hard problems.\" Then Jiho stood up. \"My favorite subject is science. I want to see a beautiful bird in nature and study it,\" he said. Everyone had different ideas.\nFor me, it is hard to choose just one. My favorite subject is art because I like drawing pictures. I also love music class. Minji smiled and said, \"My favorite subject is English. I like reading books in English, and I want to speak it well.\" Some friends also said they like P.E. class because they can run outside in the beautiful spring weather.\nIn the afternoon, we went to the school garden. We checked the vegetables we planted. We could see a small potato and a green carrot starting to grow. They really need some water. Our teacher called us to take a picture together. School is so much fun when we share the things we like!",
        translation: "오늘 우리는 교실에서 특별한 대화를 나누었습니다. 선생님께서 \"너희가 가장 좋아하는 과목은 무엇이니?\"라고 물으셨습니다. 많은 친구들이 손을 들었습니다. 수민이가 두 번째로 일어나서 \"제가 가장 좋아하는 과목은 수학이에요. 저는 어려운 문제 푸는 것을 진짜로 좋아해요\"라고 말했습니다. 그다음에는 지호가 일어났습니다. \"제가 가장 좋아하는 과목은 과학이에요. 저는 자연 속에서 아름다운 새를 보고 연구하고 싶어요\"라고 말했습니다. 모두가 서로 다른 생각을 가지고 있었습니다.\n저에게는 단지 하나만 고르는 것이 어려웠습니다. 제가 가장 좋아하는 과목은 미술인데, 왜냐하면 저는 그림 그리는 것을 좋아하기 때문입니다. 저는 또한 음악 시간도 사랑합니다. 민지가 웃으며 \"제가 가장 좋아하는 과목은 영어야. 나는 영어로 책 읽는 것을 좋아하고, 영어를 유창하게 말하고 싶어\"라고 말했습니다. 어떤 친구들은 아름다운 봄 날씨에 밖에서 달릴 수 있어서 체육 시간을 좋아한다고 말하기도 했습니다.\n오후에 우리는 학교 정원에 갔습니다. 우리는 우리가 심은 채소들을 확인했습니다. 우리는 작은 감자와 초록색 당근이 자라나기 시작하는 것을 볼 수 있었습니다. 그것들은 진짜로 물이 필요해 보였습니다. 선생님께서 함께 사진을 찍자고 우리를 부르셨습니다. 우리가 좋아하는 것들을 공유할 때 학교는 정말로 재미있습니다!",
        conjunctions: [
            {
                sentenceBefore: "We could see a small potato and a green carrot starting to grow.",
                sentenceAfter: "They really need some water.",
                options: ["So", "But", "Because"],
                answer: "So",
                commentary: "감자와 당근이 자라나기 시작하고 있어서, '그래서(So)' 물이 진짜로 필요하다는 흐름이 가장 자연스럽습니다."
            }
        ],
        themeQuiz: {
            question: "What is this passage mainly about?",
            options: [
                "Students talking about their favorite subjects and hobbies.",
                "How to plant potatoes and carrots in spring.",
                "A teacher calling students to study English and math."
            ],
            answerIndex: 0,
            commentary: "이 글은 학생들이 교실에서 자신이 가장 좋아하는 과목(math, science, art, English 등)과 취미에 대해 이야기하는 내용입니다."
        },
        chatbotSystemPrompt: `
            너는 'My Favorite Day at School' 지문을 함께 읽고 아이와 대화하는 AI 영어 멘토 코코야.
            다음 내용들을 아이와 함께 알아가거나 설명해줘:
            1. 가장 좋아하는 과목을 묻고 답하는 핵심 표현 (예: 'What is your favorite subject?', 'My favorite subject is ~'를 사용하여 아이가 직접 답하게 유도하기)
            2. 취미나 좋아하는 행동 표현하기 (예: 'I like drawing/reading.'처럼 'I like ~ing' 패턴 연습해보기)
            3. 다양한 학교 과목과 채소 이름 단어 복습 (math, science, art, English, P.E., Korean, vegetable, potato, carrot 등)
            
            말투는 어린이 텔레비전 진행자처럼 다정하고 유쾌하게 하고, 아이가 영어로 짧게라도 대답하도록 유도해줘.
            아이가 문법을 틀려도 자연스럽게 올바른 문장으로 다시 말해주며 폭풍 칭찬해줘.
            아이가 자신이 제일 좋아하는 과목이나 지문에 대한 생각을 한 문장 이상 영어로 잘 표현했다면 반드시 대답 끝에 [SUCCESS]를 붙여줘.
        `
    },
    {
        id: "eng_read_07",
        title: "A Delicious Dinner at the Restaurant (5단원)",
        fullText: "Today, my family went to a nice restaurant near the sea. A waiter came to our table and asked, \"What would you like?\" We were ready to order. I looked at the menu and said, \"I'd like a cheese pizza, please.\" My little brother smiled and said, \"I'd like sweet pancakes and chocolate ice cream!\" Mom wanted a vegetable pizza and a fresh fruit salad, and Dad chose spicy curry with noodles. We had to wait a little bit for our food.\nSoon, the food came. The cheese pizza and bread were hot, and we also got lemonade with a lot of ice. Dad looked at me and asked, \"How's your pizza?\" I tried a big piece and answered, \"It's delicious! It is not too salty.\" Then I asked my mom, \"How's your vegetable pizza?\" She said, \"It's great, but this lemonade is a bit sour.\"\nDad gave me some meat from his curry. It was very spicy, so I had to drink a lot of water. For dessert, we shared a big bowl of ice cream with sweet cream on top. Trying different kinds of food together was a great experience. We had a wonderful dinner time!",
        translation: "오늘 우리 가족은 바다 근처의 멋진 레스토랑에 갔습니다. 웨이터가 우리 테이블로 와서 \"무엇을 드시겠어요?\"라고 물었습니다. 우리는 주문할 준비가 되어 있었습니다. 나는 메뉴판을 보고 \"치즈 피자 주세요\"라고 말했습니다. 내 어린 남동생은 미소를 지으며 \"저는 달콤한 팬케이크와 초콜릿 아이스크림 주세요!\"라고 말했습니다. 엄마는 야채 피자와 신선한 과일 샐러드를 원하셨고, 아빠는 국수가 나오는 매콤한 커리를 고르셨습니다. 우리는 음식을 위해 조금 기다려야 했습니다.\n곧 음식이 나왔습니다. 치즈 피자와 빵은 따뜻했고, 우리는 얼음이 가득 찬 레모네이드도 받았습니다. 아빠는 나를 바라보며 \"피자 맛은 어떠니?\"라고 물으셨습니다. 나는 큰 조각을 먹어보고(시도해보고) \"맛있어요! 너무 짜지 않아요\"라고 대답했습니다. 그러고 나서 엄마에게 \"야채 피자는 어때요?\"라고 물었습니다. 엄마는 \"아주 좋구나, 하지만 이 레모네이드는 약간 시큼하네\"라고 말씀하셨습니다.\n아빠는 커리에 들어있는 고기를 나에게 조금 주셨습니다. 그것은 매우 매웠고, 그래서 나는 물을 많이 마셔야 했습니다. 디저트로는 위에 달콤한 크림이 올라간 큰 그릇의 아이스크림을 함께 나누어 먹었습니다. 다양한 종류의 음식을 함께 맛보는 것은 멋진 경험이었습니다. 우리는 훌륭한 저녁 식사 시간을 보냈습니다!",
        conjunctions: [
            {
                sentenceBefore: "Dad gave me some meat from his curry. It was very spicy.",
                sentenceAfter: "I had to drink a lot of water.",
                options: ["So", "But", "Because"],
                answer: "So",
                commentary: "커리의 고기가 매우 매웠기 때문에, '그래서(so)' 물을 많이 마셔야 했다는 인과관계가 가장 자연스럽습니다."
            }
        ],
        themeQuiz: {
            question: "Where did the family go and what did they do?",
            options: [
                "They went to a restaurant near the sea and ordered various foods.",
                "They went to a beach to make pancakes and fruit salad.",
                "They went to a market to buy some bread, meat, and ice."
            ],
            answerIndex: 0,
            commentary: "이 글은 가족이 바다 근처 레스토랑에 가서 피자, 커리, 레모네이드 등 다양한 음식을 주문하고 맛있게 먹은 내용입니다."
        },
        chatbotSystemPrompt: `
            너는 'A Delicious Dinner at the Restaurant' 지문을 함께 읽고 아이와 대화하는 AI 영어 멘토 코코야.
            다음 내용들을 아이와 함께 알아가거나 설명해줘:
            1. 레스토랑에서 주문할 때 쓰는 핵심 표현 (예: 'What would you like?' 질문에 'I'd like ~'를 사용하여 원하는 음식을 영어로 말하는 연습 유도하기)
            2. 음식의 맛을 묻고 답하는 표현 (예: 'How's your ~?', 'It's ~.' 패턴을 활용하여 sweet, spicy, sour, salty, delicious 등의 맛 표현 복습하기)
            3. 다양한 음식 관련 단어 확인 (cheese pizza, vegetable pizza, meat, bread, fruit salad, noodles, pancakes, lemonade, ice cream, curry 등)
            
            말투는 어린이 텔레비전 진행자처럼 다정하고 유쾌하게 하고, 아이가 영어로 짧게라도 대답하도록 유도해줘.
            아이가 문법을 틀려도 자연스럽게 올바른 문장으로 다시 말해주며 폭풍 칭찬해줘.
            아이가 자신이 가장 좋아하는 음식이나 그 맛을 한 문장 이상 영어로 잘 표현했다면 반드시 대답 끝에 [SUCCESS]를 붙여줘.
        `
    },
    {
        id: "eng_read_08",
        title: "The Global Food Festival (5단원 Adv)",
        fullText: "Today, Minji and her friends visited the Global Food Festival. There were so many delicious smells in the air. First, they went to a Vietnam food booth. A kind worker smiled and asked, \"May I take your order?\" Minji answered, \"I'd like some noodles, please.\" She got a warm bowl of bun cha. Her friend Tom took a bite and asked, \"How's your bun cha?\" Minji smiled and said, \"It's soft and juicy! The meat is also very savory and sweet.\"\nNext, they walked to a Spanish booth and looked at a large pan. \"What is that?\" Tom asked. The worker said, \"It's paella. It has rice, seafood, and vegetables.\" Tom ordered some paella. The rice at the bottom was very crunchy and crispy, but some parts were a little greasy. \"It's salty and sweet, and the shrimp is so chewy!\" Tom said. They really enjoyed trying new textures.\nFinally, they saw a Korean food booth with a bright red pancake. Tom pointed at it and asked, \"What's kimchi jeon?\" Minji proudly answered, \"It's a kimchi pancake from Korea. It's spicy noodles' best friend!\" They ordered one to share. The edge of the pancake was very crispy, but the inside was soft. It was a bit spicy and sour, not bitter at all. It was a perfect hard day of walking, but their stomachs were very happy!",
        translation: "오늘 민지와 친구들은 세계 음식 축제에 방문했습니다. 공기 중에는 맛있는 냄새가 가득했습니다. 먼저 그들은 베트남 음식 부스로 갔습니다. 친절한 직원이 미소를 지으며 \"주문하시겠어요?\"라고 물었습니다. 민지는 \"국수 좀 주세요\"라고 대답했습니다. 그녀는 따뜻한 분짜 한 그릇을 받았습니다. 그녀의 친구 톰이 한 입 먹어보고는 \"너의 분짜는 어때?\"라고 물었습니다. 민지는 미소를 지으며 \"부드럽고 즙이 많아! 고기도 아주 고소하고 달콤해\"라고 말했습니다.\n다음으로 그들은 스페인 부스로 걸어가서 큰 냄비를 보았습니다. \"저건 뭐야?\" 톰이 물었습니다. 직원은 \"파에야예요. 밥과 해산물, 채소가 들어있답니다\"라고 말했습니다. 톰은 파에야를 조금 주문했습니다. 바닥에 있는 밥은 매우 바삭바삭하고 바삭했지만, 어떤 부분은 조금 기름졌습니다. \"짭짤하면서도 달콤하고, 새우가 정말 쫀득쫀득해!\" 톰이 말했습니다. 그들은 새로운 식감을 맛보는 것을 정말 즐겼습니다.\n마지막으로 그들은 밝은 빨간색 부침개가 있는 한국 음식 부스를 보았습니다. 톰이 그것을 가리키며 \"김치전 뭐야?\"라고 물었습니다. 민지는 자랑스럽게 대답했습니다. \"그건 한국에서 온 김치 팬케이크야. 매운 국수의 단짝 친구지!\" 그들은 함께 나누어 먹을 하나를 주문했습니다. 부침개의 가장자리는 매우 바삭했지만, 안쪽은 부드러웠습니다. 그것은 약간 매콤하고 시큼했으며, 전혀 쓰지 않았습니다. 걷느라 힘든 하루였지만, 그들의 배는 아주 행복했습니다!",
        conjunctions: [
            {
                sentenceBefore: "The rice at the bottom was very crunchy and crispy.",
                sentenceAfter: "Some parts were a little greasy.",
                options: ["But", "So", "Because"],
                answer: "But",
                commentary: "밥이 바삭바삭하고 맛 좋았지만, 일부분은 '하지만(but)' 조금 느끼했다는 대조적인 흐름이 자연스럽습니다."
            }
        ],
        themeQuiz: {
            question: "Which food texture is NOT mentioned in the story?",
            options: [
                "Chewy shrimp in the paella.",
                "Bitter vegetables in the bun cha.",
                "Crunchy and crispy rice at the bottom."
            ],
            answerIndex: 1,
            commentary: "지문에서 부침개가 전혀 쓰지 않았다(not bitter at all)고 했으므로, 분짜에 쓴 채소가 있었다는 내용은 등장하지 않습니다."
        },
        chatbotSystemPrompt: `
            너는 'The Global Food Festival' 지문을 함께 읽고 아이와 대화하는 AI 영어 멘토 코코야.
            다음 내용들을 아이와 함께 알아가거나 설명해줘:
            1. 음식 주문 및 맛/식감 표현 (예: 'May I take your order?', 'I'd like some ~' 표현과 crunchy, chewy, crispy, savory, juicy 등의 풍부한 형용사 단어 복습)
            2. 세계의 다양한 음식 인지하기 (Vietnam의 bun cha, Spain의 paella, Korea의 kimchi jeon과 어떤 맛이 났는지 연결하기)
            3. 아이가 먹어본 독특한 식감의 음식 물어보기 (예: 'What is your favorite crunchy food?' 처럼 아이가 직접 영어로 표현하도록 유도하기)
            
            말투는 어린이 텔레비전 진행자처럼 다정하고 유쾌하게 하고, 아이가 영어로 짧게라도 대답하도록 유도해줘.
            아이가 문법을 틀려도 자연스럽게 올바른 문장으로 다시 말해주며 폭풍 칭찬해줘.
            아이가 좋아하는 음식이나 그 식감을 한 문장 이상 영어로 잘 표현했다면 반드시 대답 끝에 [SUCCESS]를 붙여줘.
        `
    },
    {
        id: "eng_read_09",
        title: "A New Student, Sophia (5-1 1구간)",
        fullText: "The teacher walks into the classroom. \"We have a new student today. This is Sophia,\" she says. Sophia smiles and looks at the class. \"Hi. Nice to meet you. Hello, I'm Sophia.\"\nSophia sits next to a girl. Sophia asks, \"What's your name?\" The girl smiles and answers, \"My name is Emily. Where are you from, Sophia?\" They are happy to talk to each other.\nSophia answers, \"I'm from Italy.\" Emily says, \"I'm from the U.S. Nice to meet you.\" They become good friends on the first day of school.",
        translation: "선생님이 교실로 걸어 들어오십니다. \"오늘 새로운 학생이 왔어요. 이 친구는 소피아예요\"라고 선생님이 말씀하십니다. 소피아가 미소를 지으며 반 친구들을 바라봅니다. \"안녕. 만나서 반가워요. 안녕하세요, 저는 소피아예요.\"\n소피아는 한 여자아이 옆에 앉습니다. 소피아가 묻습니다. \"이름이 뭐예요?\" 그 여자아이가 미소를 지으며 대답합니다. \"제 이름은 에밀리예요. 소피아, 어디서 왔어요?\" 그들은 서로 이야기하게 되어 기쁩니다.\n소피아가 대답합니다. \"저는 이탈리아에서 왔어요.\" 에밀리가 말합니다. \"저는 미국에서 왔어요. 만나서 반가워요.\" 그들은 학교 첫날에 좋은 친구가 됩니다.",
        conjunctions: [
            {
                sentenceBefore: "The girl smiles and answers, \"My name is Emily.",
                sentenceAfter: "Where are you from, Sophia?\"",
                options: ["And", "But", "Because"],
                answer: "And",
                commentary: "자신의 이름을 에밀리라고 소개하고, '그리고(And)' 소피아는 어디서 왔는지 자연스럽게 이어서 물어보는 흐름입니다."
            }
        ],
        themeQuiz: {
            question: "Where is Sophia from?",
            options: [
                "She is from the U.S.",
                "She is from Italy.",
                "She is from Korea."
            ],
            answerIndex: 1,
            commentary: "지문에서 소피아는 이탈리아에서 왔다고 대답했습니다. (\"I'm from Italy.\")"
        },
        chatbotSystemPrompt: `
            너는 'A New Student, Sophia' 지문을 함께 읽고 아이와 대화하는 AI 영어 멘토 코코야.
            다음 내용들을 아이와 함께 알아가거나 설명해줘:
            1. 자신을 소개하고 상대방의 이름을 묻는 표현 (예: 'I'm ~', 'My name is ~', 'What's your name?' 연습하기)
            2. 출신 국가를 묻고 답하는 핵심 표현 (예: 'Where are you from?', 'I'm from ~' 패턴 익히기)
            3. 지문에 나온 나라 이름 확인 (Italy, the U.S.)
            
            말투는 어린이 텔레비전 진행자처럼 다정하고 유쾌하게 하고, 아이가 영어로 짧게라도 대답하도록 유도해줘.
            아이가 문법을 틀려도 자연스럽게 올바른 문장으로 다시 말해주며 폭풍 칭찬해줘.
            아이가 어느 나라에 가보고 싶은지, 또는 자신을 영어로 잘 소개했다면 반드시 대답 끝에 [SUCCESS]를 붙여줘.
        `
    }
];