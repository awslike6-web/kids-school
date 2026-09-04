// ==========================================
// 🧚‍♀️ 아나운서 코코 요정 AI 대화 기억 및 Gemini 직접 통신 모듈 (fairy-chat-memory.js)
// ==========================================

var PROXY_URL = typeof APP_CONFIG !== 'undefined' && APP_CONFIG.WORKER_PROXY_URL ? APP_CONFIG.WORKER_PROXY_URL : "https://minmin-notion.awslike6.workers.dev";
var NOTION_CHAT_MEMORY_DB_ID = typeof APP_CONFIG !== 'undefined' && APP_CONFIG.NOTION_CHAT_MEMORY_DB_ID ? APP_CONFIG.NOTION_CHAT_MEMORY_DB_ID : "373a27115b6880ba82cdfeaa1c825547";

const IMPORTANT_MEMORY_TRIGGERS = [
    '꼭 기억해', '꼭 기억해줘', '꼭 기억해 줘', '기억해줘', '기억해 줘',
    '중요한 얘기', '중요한 이야기', '내 비밀이야', '내 비밀', '잊지마', '잊지 마'
];

function getActiveChildName() {
    let loginName = (window.currentUserName || localStorage.getItem('currentUserName') || '민수').trim();
    if (loginName === '아빠' || loginName === '엄마' || loginName === '어른') {
        const profile = window.currentProfile || localStorage.getItem('currentUser') || 'son';
        loginName = profile === 'daughter' ? '민서' : '민수';
    }
    return loginName;
}

function _isChatMemoryAdminMode() {
    const savedName = localStorage.getItem('currentUserName');
    return savedName === '아빠' || savedName === '엄마' || savedName === '어른';
}

function parseChatMemoryPage(page) {
    const p = page.properties;
    return {
        pageId: page.id,
        sessionId: (p["세션 ID"] || p["세션ID"])?.title?.[0]?.plain_text || "",
        childName: p["아이 이름"]?.select?.name || "",
        roomType: p["소속 방"]?.select?.name || "",
        conversationSummary: p["대화 요약"]?.rich_text?.map(t => t.plain_text).join("") || "",
        isImportant: (p["장기 기억"] || p["장기 기억 여부"])?.checkbox === true,
        createdTime: page.created_time,
        lastEditedTime: page.last_edited_time
    };
}

function buildPersonaSystemPrompt(childName, roomType) {
    const name = childName || getActiveChildName();

    if (roomType === '로비') {
        if (name === '민서') {
            return `너는 민서(둘째)의 로비에서 함께 수다 떨어주는 '귀여운 동생' AI 코코야.
민서를 무조건 '언니' 또는 '누나'라고 부르며, 일상 고민과 수다를 편하게 나누는 동생처럼 행동해.
"언니, 오늘 학교 어땠어?", "언니한테 얘기 들려줘!"처럼 애교와 존경을 섞어 대화를 이끌어.
선생님처럼 가르치려 들지 말고, 동생이 언니 이야기를 재밌게 듣고 공감해줘.`;
        }
        return `너는 초등학생과 일상 고민과 수다를 편하게 나누는 다정한 '형/단짝 친구' AI 코코야.
말투는 밝고 유창한 아나운서 톤이지만, 선생님처럼 가르치려 들지 말고 친구처럼 공감해줘.
아이의 감정을 먼저 받아주고, 짧게 묻기보다 대화를 자연스럽게 이어가줘.`;
    }

    if (roomType === '마이룸') {
        if (name === '민서') {
            return `너는 아기자기한 과일가게(수박·딸기·포도·하리보 젤리)의 파트너야. 민서가 '내가 사장님 할래!'라고 하면 너는 친절한 손님이 되어 과일을 사고, 민서가 '내가 손님 할래!' 하면 너는 가게 주인이 되어 과일과 하리보 젤리를 팔아라. 절대 딱딱하게 말하지 말고 진짜 역할 놀이하듯 귀엽게 티키타카를 해줘.`;
        }
        return `너는 마인크래프트 숲속 비밀기지의 무기 상인이자 작전 참모야. 민수가 구매한 총기나 장비의 능력을 과장해서 멋지게 설명해 주고, 다음 전투를 위해 어떤 장비를 사면 좋을지 추천해 줘. 남자아이들이 좋아하는 게임 대기실 NPC처럼 든든하고 유쾌하게 말해라.`;
    }

    if (roomType === '용어방') {
        if (name === '민수') {
            return `너는 용어사전방의 '사고 확장 도우미' AI 코코야. 대상은 민수(첫째).
정답을 바로 알려주지 말고, 질문을 던져 민수가 스스로 생각을 넓히게 유도해.
"만약 ~라면?", "왜 그럴까?", "비슷한 경험이 있어?" 같은 질문으로 사고를 확장하고, 민수의 아이디어를 구체적으로 칭찬해.`;
        }
        return `너는 용어사전방의 '동화 스토리텔링 도우미' AI 코코야. 대상은 민서(둘째).
어려운 단어와 개념을 동화·비유·짧은 이야기로 쉽게 풀어줘.
민서를 '언니/누나'라고 부르며, 설명이 재미있게 느껴지도록 리액션을 크게 해줘.`;
    }

    if (name === '민수') {
        return `너는 민수(첫째)와 함께 공부하는 '전략적 탐험가' AI 게임 파트너 코코야.
절대 선생님처럼 가르치려 들지 말고, 함께 작전을 짜는 게임 파트너로 행동해.
낯선 문제나 틀린 문제는 "강한 보스 몬스터 등장!" 또는 "함정 카드를 밟았다"로 치환해 멘탈을 보호해.
정답을 바로 주지 말고, 민수가 가진 지식 무기로 작전을 짜서 공략하도록 유도하고, 결과보다 '작전을 짜는 과정'을 게임 칭찬처럼 구체적으로 격려해.`;
    }

    return `너는 민서(둘째)와 함께 공부하는 '성장형 리더십' AI 동생 요정 코코야.
민서를 무조건 '언니' 또는 '누나'라고 부르며, 배움을 갈구하는 귀여운 동생 AI로 행동해.
"언니, 나 이거 진짜 모르겠는데 나한테 설명해 줄 수 있어?"라며 도움을 요청하고,
민서가 크리에이터(유튜버)처럼 신나서 설명할 수 있도록 리액션을 극대화해. (설명하며 스스로 깨닫는 메타인지 유도)`;
}

function formatChatMemoryForPrompt(memoryBundle) {
    if (!memoryBundle) return '';
    const { important = [], recent = [] } = memoryBundle;
    let text = '';

    if (important.length > 0) {
        text += '[장기 기억 - 최우선 반영]\n';
        important.forEach(m => { text += `- ${m.conversationSummary}\n`; });
    }
    if (recent.length > 0) {
        text += '\n[최근 대화 요약]\n';
        recent.forEach(m => { text += `- ${m.conversationSummary}\n`; });
    }
    return text.trim();
}

async function fetchChatMemoryFromNotion(options = {}) {
    const childName = options.childName || getActiveChildName();
    const dbId = options.dbId || NOTION_CHAT_MEMORY_DB_ID;

    try {
        let allResults = [];
        let hasMore = true;
        let nextCursor = undefined;

        while (hasMore) {
            const bodyData = {
                page_size: 100,
                filter: {
                    property: "아이 이름",
                    select: { equals: childName }
                }
            };
            if (nextCursor) bodyData.start_cursor = nextCursor;

            const response = await fetch(`${PROXY_URL}/v1/databases/${dbId}/query`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(bodyData)
            });

            if (!response.ok) throw new Error(`노션 AI 기억 DB 통신 오류 (상태: ${response.status})`);

            const data = await response.json();
            allResults = allResults.concat(data.results || []);
            hasMore = data.has_more;
            nextCursor = data.next_cursor;
        }

        const parsed = allResults.map(parseChatMemoryPage).filter(r => r.conversationSummary);
        const important = parsed.filter(r => r.isImportant);
        const normal = parsed
            .filter(r => !r.isImportant)
            .sort((a, b) => new Date(b.lastEditedTime || b.createdTime) - new Date(a.lastEditedTime || a.createdTime))
            .slice(0, 3);

        return { important, recent: normal, allForPrompt: [...important, ...normal] };
    } catch (error) {
        console.error("[fetchChatMemoryFromNotion] 로딩 실패:", error);
        return { important: [], recent: [], allForPrompt: [] };
    }
}

function buildFullAISystemPrompt(roomType, extraPrompt = '') {
    const childName = getActiveChildName();
    const persona = buildPersonaSystemPrompt(childName, roomType);
    const memoryContext = window.chatSessionState?.memoryContext
        || window.cachedChatMemoryContext
        || '';

    let full = persona;

    // ⚡ [대화 길이 및 티키타카 절대 규칙 - 필수]
    full += `\n\n[대화 길이 및 티키타카 절대 규칙]
1. 답변은 무조건 1~2문장 (최대 2~3줄, 100자 미만)으로 짧고 경쾌하게 말해라.
2. 절대 한 번에 긴 설명이나 긴 문단을 혼자 늘어놓지 마라.
3. 아이가 바로 대답하기 쉽도록 다정한 리액션과 짧은 한마디 질문으로 자연스러운 핑퐁(티키타카) 대화를 이어가라.
4. 음성(TTS)으로 읽었을 때 5~8초 내에 깔끔하게 끝나는 호흡을 유지해라.`;

    if (memoryContext) {
        full += `\n\n[과거 기억 맥락]\n${memoryContext}\n위 기억을 자연스럽게 대화에 반영하되, "내가 다 기억하고 있어!"라고 과하게 말하지 마.`;
    }
    if (extraPrompt) {
        full += `\n\n[추가 지침]\n${extraPrompt}`;
    }
    if (roomType === '공부방') {
        full += `\n\n${CONJUNCTION_GRADING_GUARDRAIL}`;
    }
    full += `\n\n[장기 기억 트리거] 아이가 "꼭 기억해줘", "중요한 얘기야", "내 비밀이야" 등을 말하면, 그 내용을 특별히 기억하겠다고 다정하게 확인해줘.`;
    return full;
}

/**
 * 🗣️ 국어 및 영어 지문 토론방 전용 지능형 시스템 프롬프트 빌더
 * - 안티-반복(Anti-Repetition) 절대 규칙 탑재
 * - 아이 발화 키워드 구체적 호응 및 공감
 * - 역질문 성실 응답 & 지문 기반 생각 확장
 * - 단계별 대화 심화 (1턴: 감상/경청 -> 2턴: 인물 심리/원인 파헤치기 -> 3턴+: 상상/일상 연결)
 */
function buildDiscussionAISystemPrompt(subject, passage, extraPrompt = '') {
    const childName = getActiveChildName();
    const passageTitle = passage?.title || '오늘의 지문';
    const passageText = passage?.fullText || (passage?.paragraphs ? passage.paragraphs.map(p => p.text).join('\n') : '');
    const isEnglish = (subject === '영어' || subject === 'ENGLISH' || subject === 'stage6');

    let prompt = "";
    if (isEnglish) {
        prompt = `You are "Coco (코코 요정)", a friendly, cheerful, and encouraging AI English mentor having a natural conversation with ${childName} about the English story "${passageTitle}".

[Conversation Flow & Anti-Repetition Rules - CRITICAL]
1. 🚫 NEVER repeat the exact same greeting, question, or phrasing from previous turns.
2. 🎯 Directly acknowledge what ${childName} just said by echoing or praising key words/ideas from their message.
3. 🙋 If ${childName} asks you a question (e.g. "Why did they do that?", "What do you think?"), FIRST answer kindly based on the story, THEN ask a fresh thought-provoking question to keep the conversation flowing.
4. 🚀 Deepen the discussion step by step:
   - Turn 1: Celebrate their first reaction and praise their effort.
   - Turn 2: Explore the characters' feelings, reasons behind actions, or surprising plot points.
   - Turn 3+: Ask "What would you do if you were the main character?" or relate the theme to ${childName}'s own life and interests.
5. ⚡ Length & Tone: Keep your reply concise (1-2 clear English sentences, optionally accompanied by a warm, short Korean cheer). Total under 50-80 words so it sounds natural in TTS.
6. 💎 Reward Rule: If ${childName} expresses their own thought or answer well in English for the first time, append [SUCCESS] at the very end. In subsequent turns, do NOT keep repeating [SUCCESS]; focus on engaging story conversation.`;
    } else {
        prompt = `너는 ${childName}와 함께 읽은 지문 [${passageTitle}]에 대해 신나고 깊이 있는 대화를 나누는 다정하고 지혜로운 AI 요정 코코야.

[지문 토론 진행 및 안티-반복 절대 규칙 - 필독]
1. 🚫 이전 대화에서 이미 했던 말, 인사, 질문을 절대로 반복하지 마라.
2. 🎯 아이가 방금 한 말의 핵심 단어나 생각을 반드시 구체적으로 짚어주며 맞장구치고 공감해줘.
3. 🙋 아이가 요정에게 질문을 던졌을 때("~는 왜 그런 거야?", "너는 어떻게 생각해?"):
   - 지문 속 사건과 인물의 심리를 바탕으로 요정의 생각과 이유를 친절하게 먼저 설명해 준 뒤, 다음 생각거리 질문을 던져라.
4. 🚀 대화를 단계적으로 확장하며 깊이를 더해라:
   - (1턴) 지문에 대한 아이의 첫 느낌과 생각 경청 & 구체적 칭찬
   - (2턴) 지문 속 인물의 숨은 마음, 행동의 이유, 갈등의 원인을 함께 파헤치기
   - (3턴 이상) "만약 네가 주인공이었다면?", "너에게도 이런 비슷한 경험이 있었어?"처럼 상상력과 일상 경험으로 연결
5. ⚡ 답변 호흡: 1~2문장 (최대 100자 내외)으로 산뜻하고 리듬감 있게 말해라. 한 번에 혼자 긴 설명을 늘어놓지 말고 아이가 편하게 말할 수 있도록 티키타카를 해라.
6. 💎 보상 규칙: 아이가 지문에 대해 자신의 생각이나 느낌을 처음으로 1문장 이상 잘 표현했을 때 답변 끝에 [SUCCESS]를 붙여라. 이미 칭찬을 마친 이후 턴에서는 불필요하게 칭찬만 맴돌지 말고 실제 지문 이야기 몰입에 집중해라.`;
    }

    if (passage?.chatbotSystemPrompt) {
        prompt += `\n\n[지문 맞춤 가이드]\n${passage.chatbotSystemPrompt}`;
    }
    if (extraPrompt) {
        prompt += `\n\n[추가 가이드]\n${extraPrompt}`;
    }
    prompt += `\n\n[지문 원문: ${passageTitle}]\n${passageText}`;

    return prompt;
}

/**
 * 👨‍👩‍👧 부모(관리자) 프로필 여부 판별 헬퍼
 */
function isParentProfile() {
    const savedName = (window.currentUserName || localStorage.getItem('currentUserName') || '').trim();
    return savedName === '아빠' || savedName === '엄마' || savedName === '어른' || savedName === 'admin';
}

/**
 * 🎭 구역 및 자녀별 요정 페르소나 요약 정보 추출기 (부모 검수 모드용)
 */
function getFairyPersonaSummary(subject = '', roomType = '공부방', targetChild = null) {
    const childName = targetChild || getActiveChildName();
    let title = "";
    let role = "";
    let description = "";
    let icon = "🧚";

    const subj = String(subject || '').toUpperCase();

    if (subj === 'ENGLISH' || subj === '영어' || subj === 'STAGE6') {
        icon = "🗣️";
        title = "영어 회화 & 독해 멘토 코코";
        role = `스토리 기반 영어 티키타카 멘토 (${childName} 맞춤)`;
        description = "쉬운 영어 표현과 친절한 한글 해설을 병행하며 스토리 몰입 및 영어 발화 유도";
    } else if (subj === 'KOREAN_DISCUSSION' || subj === 'SENTENCE' || subj === '국어_토론') {
        icon = "📖";
        title = "국어 독서 토론 멘토 코코";
        role = `깊이 있는 독서 탐구 멘토 (${childName} 맞춤)`;
        description = "안티-반복 엔진 탑재, 지문 속 인물 심리와 사건 원인 탐구 및 일상 경험 연결";
    } else if (roomType === '로비') {
        icon = "🏡";
        if (childName === '민서') {
            title = "애교 만점 여동생 코코";
            role = "귀여운 여동생 페르소나 (민서를 '언니'로 호칭)";
            description = "선생님처럼 굴지 않고 언니의 하루 일상과 학교 이야기를 신나게 경청하고 공감";
        } else {
            title = "단짝 친구 / 형 코코";
            role = "다정한 친구 페르소나 (민수 눈높이 맞춤)";
            description = "일상 고민과 관심사 수다를 편하게 나누며 든든하게 공감해 주는 친구";
        }
    } else if (roomType === '마이룸') {
        icon = "🎁";
        if (childName === '민서') {
            title = "과일가게 & 젤리 상점 파트너";
            role = "역할놀이(소꿉놀이) 파트너 페르소나";
            description = "수박·딸기·포도·하리보 젤리를 손님/사장님 번갈아가며 거래하는 귀여운 역할놀이";
        } else {
            title = "비밀기지 무기 상인 & 작전 참모";
            role = "마인크래프트 게임 참모 NPC 페르소나";
            description = "구매한 무기/장비 성능을 멋지게 설명하고 다음 전투를 위한 무기를 추천하는 게임 참모";
        }
    } else if (roomType === '용어방') {
        icon = "📚";
        if (childName === '민수') {
            title = "사고 확장 질문 도우미";
            role = "메타인지 유도형 탐험 파트너";
            description = "정답 대신 '만약 ~라면?', '왜 그럴까?' 질문으로 민수가 스스로 생각을 넓히게 유도";
        } else {
            title = "동화 스토리텔링 도우미";
            role = "쉬운 비유 & 큰 리액션 요정";
            description = "어려운 단어와 개념을 귀여운 동화와 일상 비유로 쉽게 풀어서 설명";
        }
    } else if (subj === 'KOREAN' || subj === '국어') {
        icon = "🔤";
        title = "단어요정 🧚‍♀️";
        role = "4단계 글쓰기 수호신";
        description = "상황 감정 이끌어내기 ➔ 감정 단어 추천 ➔ 마법 맞춤법 교정 ➔ 인과관계 완성";
    } else if (subj === 'MATH' || subj === '수학') {
        icon = "🔢";
        title = "수학요정 코코 🧙‍♂️";
        role = childName === '민서' ? "1학년 숫자요정 (묶음과 낱개, 10 만들기 비유)" : "5학년 수학 탐험요정 (약수/배수/나눗셈 원리 지도)";
        description = "정답을 직접 주지 않고 단계별 힌트와 일상 속 직관적 비유로 수학적 사고력 자극";
    } else {
        icon = "🎮";
        if (childName === '민수') {
            title = "전략적 탐험가 (게임 파트너)";
            role = "게임 NPC 작전 참모 페르소나";
            description = "틀린 문제는 '보스 몬스터/함정'으로 치환하여 멘탈을 보호하고 작전 공략을 격려";
        } else {
            title = "성장형 리더십 AI 동생";
            role = "배움을 갈구하는 동생 페르소나";
            description = "'언니 나한테 설명해줘!'를 통해 민서가 크리에이터처럼 신나서 설명하며 메타인지 발휘";
        }
    }

    return { title, role, description, childName, icon };
}

function generateChatSessionId() {
    return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function initChatMemorySession(roomType) {
    const childName = getActiveChildName();
    window.chatSessionState = {
        sessionId: generateChatSessionId(),
        roomType,
        childName,
        userMessages: [],
        assistantMessages: [],
        memoryContext: '',
        saved: false
    };

    const memoryBundle = await fetchChatMemoryFromNotion({ childName });
    const memoryContext = formatChatMemoryForPrompt(memoryBundle);
    window.chatSessionState.memoryContext = memoryContext;
    window.cachedChatMemoryContext = memoryContext;
    return window.chatSessionState;
}

function detectImportantMemoryTrigger(text) {
    if (!text) return false;
    const normalized = String(text).replace(/\s/g, '');
    return IMPORTANT_MEMORY_TRIGGERS.some(trigger =>
        normalized.includes(trigger.replace(/\s/g, ''))
    );
}

function trackChatMemoryUserMessage(text) {
    if (!window.chatSessionState || !text) return;
    window.chatSessionState.userMessages.push(text);
}

function trackChatMemoryAssistantMessage(text) {
    if (!window.chatSessionState || !text) return;
    window.chatSessionState.assistantMessages.push(text);
}

function _sleepMs(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function _isAiErrorResponse(text) {
    if (!text) return true;
    const normalized = String(text).trim();
    return normalized.startsWith('[기지국 에러]')
        || normalized.includes('"status":"UNAVAILABLE"')
        || normalized.includes('"code":503')
        || normalized.includes('"code":429')
        || normalized.includes('experiencing high demand')
        || normalized.includes('rate limit')
        || normalized.includes('RESOURCE_EXHAUSTED');
}

const GEMINI_RETRY_WAIT_MESSAGE = '잠시만~ 코코가 생각 주머니 정리하고 다시 말해줄게! 잠시만 기다려줘~🧚‍♂️';

function isGeminiRetryableResponse(response, data) {
    if (!response) return false;
    if (response.status === 503 || response.status === 429) return true;
    const code = data?.error?.code;
    if (code === 503 || code === 429) return true;
    const statusStr = String(data?.error?.status || '');
    return statusStr === 'UNAVAILABLE' || statusStr === 'RESOURCE_EXHAUSTED';
}

function extractGeminiResponseText(data) {
    if (!data || typeof data !== 'object') return '';
    if (data.choices?.[0]?.message?.content) return String(data.choices[0].message.content).trim();
    if (data.reply) return String(data.reply).trim();
    if (data.text) return String(data.text).trim();
    if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
        return String(data.candidates[0].content.parts[0].text).trim();
    }
    return '';
}

function _resolveChatBubbleElement(elementId, chatBoxId) {
    if (!elementId) return null;
    const el = document.getElementById(elementId);
    if (!el) return null;
    const tag = (el.tagName || '').toUpperCase();
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON') {
        return null;
    }
    if (chatBoxId) {
        const box = document.getElementById(chatBoxId);
        if (!box || !box.contains(el)) return null;
    }
    return el;
}

function createChatBubbleId(prefix = 'msg') {
    window.__chatBubbleSeq = (window.__chatBubbleSeq || 0) + 1;
    return `${prefix}_${Date.now()}_${window.__chatBubbleSeq}`;
}

function setChatBubbleContent(elementId, content, options = {}) {
    const chatBoxId = options.chatBoxId || null;
    const asHtml = options.asHtml !== false;
    const el = _resolveChatBubbleElement(elementId, chatBoxId);
    if (!el) {
        console.warn('[setChatBubbleContent] invalid bubble target:', elementId, chatBoxId);
        return false;
    }
    if (asHtml) el.innerHTML = content;
    else el.textContent = content;
    if (chatBoxId) {
        const box = document.getElementById(chatBoxId);
        if (box) box.scrollTop = box.scrollHeight;
    }
    return true;
}

function showGeminiRetryWaitUI(uiOptions = {}) {
    const message = GEMINI_RETRY_WAIT_MESSAGE;
    window.__geminiRetryWaitRef = null;
    const chatBoxId = uiOptions.chatBoxId || null;

    if (uiOptions.elementId) {
        if (setChatBubbleContent(uiOptions.elementId, message, { chatBoxId, asHtml: false })) {
            window.__geminiRetryWaitRef = {
                type: 'element',
                id: uiOptions.elementId,
                chatBoxId,
                asHtml: false
            };
        }
    } else if (uiOptions.appendFairyMessage) {
        const msgDiv = document.createElement('div');
        msgDiv.id = 'gemini-retry-wait-msg';
        msgDiv.style.padding = '8px';
        msgDiv.style.borderRadius = '8px';
        msgDiv.style.fontSize = '0.85rem';
        msgDiv.style.maxWidth = '85%';
        msgDiv.style.lineHeight = '1.4';
        msgDiv.style.wordBreak = 'break-all';
        msgDiv.style.background = '#21262d';
        msgDiv.style.borderLeft = '4px solid #ffb347';
        msgDiv.style.color = '#ffd580';
        msgDiv.style.alignSelf = 'flex-start';
        msgDiv.innerText = message;
        const box = document.getElementById('fairy-messages');
        if (box) {
            box.appendChild(msgDiv);
            box.scrollTop = box.scrollHeight;
            window.__geminiRetryWaitRef = { type: 'fairy', id: 'gemini-retry-wait-msg' };
        }
    } else if (typeof uiOptions.onShow === 'function') {
        uiOptions.onShow(message);
        window.__geminiRetryWaitRef = { type: 'callback', onApply: uiOptions.onApply };
    }

    if (uiOptions.speak === false) return;
    if (typeof uiOptions.speakFn === 'function') {
        uiOptions.speakFn(message);
    } else if (typeof speakFairyTTS === 'function') {
        speakFairyTTS(message);
    } else if (typeof window.speakFairyTTS === 'function') {
        window.speakFairyTTS(message);
    }
}

function applyGeminiResponseToWaitUI(content, options = {}) {
    const asHtml = options.asHtml !== false;
    const formatted = asHtml ? String(content).replace(/\n/g, '<br>') : String(content);
    const ref = window.__geminiRetryWaitRef;
    const chatBoxId = options.chatBoxId || ref?.chatBoxId || null;

    if (ref?.type === 'element' && ref.id) {
        setChatBubbleContent(ref.id, formatted, {
            chatBoxId: ref.chatBoxId || chatBoxId,
            asHtml: ref.asHtml !== false
        });
    } else if (ref?.type === 'fairy' && ref.id) {
        const el = document.getElementById(ref.id);
        if (el) {
            el.innerText = String(content);
            el.style.borderLeft = '4px solid #ab47bc';
            el.style.color = '#c9d1d9';
            el.removeAttribute('id');
        }
    } else if (ref?.type === 'callback' && typeof ref.onApply === 'function') {
        ref.onApply(formatted, content);
    } else if (options.elementId) {
        setChatBubbleContent(options.elementId, formatted, { chatBoxId, asHtml });
    }

    window.__geminiRetryWaitRef = null;
}

const GEMINI_FINAL_FAIL_MESSAGE = '미안해~ 코코가 방금 귀가 살짝 멍멍해서 잘 못 들었어! 다시 한 번만 얘기해줄래? 🧚‍♂️';
window.GEMINI_FINAL_FAIL_MESSAGE = GEMINI_FINAL_FAIL_MESSAGE;

function clearGeminiRetryUI() {
    window.__geminiRetryWaitRef = null;
    document.getElementById('gemini-retry-wait-msg')?.remove();
    document.getElementById('gemini-final-fail-msg')?.remove();
}

function resetGeminiChatErrorState() {
    clearGeminiRetryUI();
    window.__geminiChatErrorActive = false;
}

function _speakGeminiMessage(message, uiOptions = {}) {
    if (uiOptions.speak === false) return;
    if (typeof uiOptions.speakFn === 'function') {
        uiOptions.speakFn(message);
    } else if (typeof speakFairyTTS === 'function') {
        speakFairyTTS(message);
    } else if (typeof window.speakFairyTTS === 'function') {
        window.speakFairyTTS(message);
    } else if (typeof speakFairyText === 'function') {
        speakFairyText(message);
    }
}

function showGeminiFinalFailUI(uiOptions = {}) {
    clearGeminiRetryUI();
    window.__geminiChatErrorActive = true;
    const message = GEMINI_FINAL_FAIL_MESSAGE;

    if (uiOptions.elementId) {
        if (setChatBubbleContent(uiOptions.elementId, message, {
            chatBoxId: uiOptions.chatBoxId || null,
            asHtml: false
        })) {
            window.__geminiRetryWaitRef = {
                type: 'element',
                id: uiOptions.elementId,
                chatBoxId: uiOptions.chatBoxId || null,
                asHtml: false
            };
        }
    } else if (uiOptions.appendFairyMessage) {
        const msgDiv = document.createElement('div');
        msgDiv.id = 'gemini-final-fail-msg';
        msgDiv.style.padding = '8px';
        msgDiv.style.borderRadius = '8px';
        msgDiv.style.fontSize = '0.85rem';
        msgDiv.style.maxWidth = '85%';
        msgDiv.style.lineHeight = '1.4';
        msgDiv.style.wordBreak = 'break-all';
        msgDiv.style.background = '#21262d';
        msgDiv.style.borderLeft = '4px solid #ab47bc';
        msgDiv.style.color = '#c9d1d9';
        msgDiv.style.alignSelf = 'flex-start';
        msgDiv.innerText = message;
        const box = document.getElementById('fairy-messages');
        if (box) {
            box.appendChild(msgDiv);
            box.scrollTop = box.scrollHeight;
        }
    } else if (typeof uiOptions.onShow === 'function') {
        uiOptions.onShow(message);
    }

    _speakGeminiMessage(message, uiOptions);
}

function popLastPendingUserTurn(history, roleKey = 'role', userValues = ['user']) {
    if (!Array.isArray(history) || history.length === 0) return;
    const last = history[history.length - 1];
    const role = last?.[roleKey];
    if (userValues.includes(role)) history.pop();
}

async function callDirectGoogleGemini(payload) {
    const apiKey = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.GEMINI_API_KEY)
        ? APP_CONFIG.GEMINI_API_KEY
        : (localStorage.getItem('gemini_api_key') || (typeof atob !== 'undefined' ? atob("QVEuQWI4Uk42THNkaHRLRWFqZk0xU2w0UGpmQ19hUTdJTzR0RXdsWWdtbXJvakpKZFdtcHc=") : ""));

    let geminiPayload = payload || {};
    if (payload && Array.isArray(payload.messages)) {
        const contents = [];
        let systemText = "";
        for (const m of payload.messages) {
            if (m.role === 'system') {
                systemText += (systemText ? "\n" : "") + (m.content || "");
            } else {
                contents.push({
                    role: m.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: String(m.content || "") }]
                });
            }
        }
        geminiPayload = {
            contents: contents.length > 0 ? contents : [{ role: 'user', parts: [{ text: '안녕' }] }]
        };
        if (systemText) {
            geminiPayload.systemInstruction = { parts: [{ text: systemText }] };
        }
    }

    // 🚀 구글 최신 플래그십 모델 (gemini-2.5-flash ➔ gemini-2.5-pro ➔ gemini-1.5-flash) 및 503 자동 재시도
    const modelCandidates = ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-1.5-flash"];
    let lastErr = null;

    for (const modelName of modelCandidates) {
        for (let retry = 0; retry < 3; retry++) {
            try {
                if (retry > 0) {
                    await new Promise(r => setTimeout(r, 800 * retry));
                }
                const directUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
                const directRes = await fetch(directUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(geminiPayload)
                });

                if (!directRes.ok) {
                    const errText = await directRes.text().catch(() => "");
                    console.warn(`[Direct Gemini] ${modelName} (시도 ${retry + 1}) 응답 (${directRes.status}): ${errText}`);
                    lastErr = new Error(`Google Gemini (${modelName}) 직접 호출 실패 (${directRes.status}): ${errText}`);
                    // 503 일시 과부하 시 잠시 후 같은 모델 재시도, 404/400 등은 다음 모델로 넘김
                    if (directRes.status === 503 && retry < 2) {
                        continue;
                    }
                    break; // 다음 모델 후보로 이동
                }

                const data = await directRes.json();
                const textContent = extractGeminiResponseText(data);
                if (!textContent) {
                    lastErr = new Error(`Google Gemini (${modelName}) 응답 비어있음`);
                    continue;
                }
                return { response: directRes, data, text: textContent };
            } catch (e) {
                lastErr = e;
            }
        }
    }

    throw lastErr || new Error("Google Gemini 모든 모델 호출 실패");
}

async function fetchWithGeminiRetry(url, fetchOptions = {}, retryOptions = {}) {
    const maxRetries = retryOptions.maxRetries ?? 3;
    const baseDelayMs = retryOptions.baseDelayMs ?? 1000;
    const uiOptions = retryOptions.ui || null;
    let lastError = null;

    // 1. 요청 페이로드 추출 (다이렉트 폴백용)
    let parsedBody = null;
    try {
        if (fetchOptions.body) parsedBody = JSON.parse(fetchOptions.body);
    } catch (e) {}

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch(url, fetchOptions);
            const data = await response.json().catch(() => ({}));

            if (!response.ok || data.error) {
                const errMsg = String(data.error?.message || data.error || '');
                // 워커 프록시 지역 차단(400 User location is not supported / 403 Forbidden) 시 즉시 다이렉트 Gemini API로 폴백!
                if (errMsg.includes('location is not supported') || response.status === 403 || (response.status === 400 && parsedBody)) {
                    console.log('🔄 [Gemini 워커 위치 제한 감지] Google Gemini 다이렉트 API로 즉시 전환합니다...');
                    return await callDirectGoogleGemini(parsedBody);
                }

                if (isGeminiRetryableResponse(response, data) && attempt < maxRetries) {
                    if (attempt === 1 && uiOptions) showGeminiRetryWaitUI(uiOptions);
                    await _sleepMs(baseDelayMs * attempt);
                    continue;
                }
                throw new Error(data.error?.message || `API 오류 (${response.status})`);
            }

            const textContent = extractGeminiResponseText(data);
            if (_isAiErrorResponse(textContent)) {
                if (textContent.includes('location is not supported') && parsedBody) {
                    console.log('🔄 [Gemini 워커 위치 에러 텍스트 감지] 다이렉트 API로 전환!');
                    return await callDirectGoogleGemini(parsedBody);
                }
                if (attempt < maxRetries) {
                    if (attempt === 1 && uiOptions) showGeminiRetryWaitUI(uiOptions);
                    await _sleepMs(baseDelayMs * attempt);
                    continue;
                }
                throw new Error(textContent || 'AI 응답 오류');
            }

            if (url.includes('/v1/gemini') && !textContent) {
                if (attempt < maxRetries) {
                    if (attempt === 1 && uiOptions) showGeminiRetryWaitUI(uiOptions);
                    await _sleepMs(baseDelayMs * attempt);
                    continue;
                }
                throw new Error('API 응답 구조 파싱 실패');
            }

            return { response, data, text: textContent };
        } catch (error) {
            lastError = error;
            const msg = String(error.message || '');
            
            // 네트워크 오류 또는 워커 오류 시 다이렉트 API 시도
            if (parsedBody && (msg.includes('location') || msg.includes('403') || msg.includes('Failed to fetch'))) {
                try {
                    console.log('🔄 [Gemini 워커 장애] 다이렉트 Google Gemini로 복구 시도...');
                    return await callDirectGoogleGemini(parsedBody);
                } catch (directErr) {
                    console.error('다이렉트 Gemini 호출도 실패:', directErr);
                }
            }

            const retryableNetwork = error.name === 'TypeError' || msg.includes('Failed to fetch');
            if (attempt < maxRetries && retryableNetwork) {
                if (attempt === 1 && uiOptions) showGeminiRetryWaitUI(uiOptions);
                await _sleepMs(baseDelayMs * attempt);
                continue;
            }
            throw error;
        }
    }

    // 최종 재시도 실패 시 마지막으로 다이렉트 API 시도
    if (parsedBody) {
        try {
            console.log('🔄 [Gemini 최종 복구] 다이렉트 Google Gemini 호출...');
            return await callDirectGoogleGemini(parsedBody);
        } catch (e) {}
    }

    throw lastError || new Error('Gemini API 호출 실패');
}

function _buildFallbackChatSummary(transcript, childName) {
    const userLines = String(transcript || '')
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.startsWith('아이:'))
        .map(line => line.replace(/^아이:\s*/, ''))
        .filter(Boolean);

    if (userLines.length === 0) {
        return `${childName}와 코코가 대화를 나눔.`;
    }

    const snippet = userLines.slice(-3).join(' / ').slice(0, 180);
    return `${childName}와의 대화: ${snippet}`;
}

async function summarizeChatSessionWithGemini(transcript, options = {}) {
    const childName = options.childName || getActiveChildName();
    const fallbackSummary = _buildFallbackChatSummary(transcript, childName);

    try {
        const { text: content } = await fetchWithGeminiRetry(
            `${PROXY_URL}/v1/chat/completions?type=ai`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: "gemini-2.0-flash",
                    messages: [
                        {
                            role: "system",
                            content: `너는 대화 요약 전문가야. ${childName}와 나눈 대화를 2~3줄로 핵심만 한국어로 요약해. 요약문만 출력하고 다른 설명은 하지 마.`
                        },
                        { role: "user", content: transcript }
                    ]
                })
            },
            { maxRetries: 3, baseDelayMs: 1000 }
        );

        if (_isAiErrorResponse(content)) {
            console.warn("[summarizeChatSessionWithGemini] AI 오류 응답 → 로컬 폴백 요약 사용");
            return fallbackSummary;
        }

        return content || fallbackSummary;
    } catch (error) {
        console.error("[summarizeChatSessionWithGemini] 실패:", error);
        return fallbackSummary;
    }
}

async function saveChatMemoryToNotion({ sessionId, childName, roomType, conversationSummary, isImportant }) {
    if (_isChatMemoryAdminMode()) {
        console.log(`🛠️ [기억 프리패스] 관리자 모드 - AI 기억 저장 생략 (isImportant: ${isImportant})`);
        return true;
    }

    try {
        const payload = {
            parent: { database_id: NOTION_CHAT_MEMORY_DB_ID },
            properties: {
                "세션 ID": {
                    title: [{ text: { content: sessionId || generateChatSessionId() } }]
                },
                "아이 이름": {
                    select: { name: childName }
                },
                "소속 방": {
                    select: { name: roomType }
                },
                "대화 요약": {
                    rich_text: [{ text: { content: (conversationSummary || '').slice(0, 1900) } }]
                },
                "장기 기억": {
                    checkbox: isImportant === true
                }
            }
        };

        const response = await fetch(`${PROXY_URL}/v1/pages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error(`노션 AI 기억 저장 오류 (상태: ${response.status})`);
        console.log(`🧠 [AI 기억 저장 완료] ${childName} / ${roomType} / important=${isImportant}`);
        return true;
    } catch (error) {
        console.error("[saveChatMemoryToNotion] 저장 실패:", error);
        return false;
    }
}

function _buildTranscriptFromMessages(messages) {
    return messages.map(m => {
        const role = m.role === 'model' ? 'assistant' : m.role;
        const speaker = role === 'user' ? '아이' : '코코';
        const content = m.content || m.parts?.[0]?.text || '';
        return `${speaker}: ${content}`;
    }).join('\n');
}

async function saveChatMemoryFromConversation({ roomType, messages, childName, isImportant }) {
    if (!messages || messages.length === 0) return false;

    const normalized = messages.map(m => ({
        role: m.role === 'model' ? 'assistant' : m.role,
        content: m.content || ''
    }));
    const userMessages = normalized.filter(m => m.role === 'user').map(m => m.content);
    if (userMessages.length === 0) return false;

    const name = childName || getActiveChildName();
    const room = roomType || '공부방';
    const markImportant = isImportant === true || userMessages.some(detectImportantMemoryTrigger);
    const transcript = _buildTranscriptFromMessages(normalized);
    const summary = await summarizeChatSessionWithGemini(transcript, { childName: name });

    return saveChatMemoryToNotion({
        sessionId: generateChatSessionId(),
        childName: name,
        roomType: room,
        conversationSummary: summary,
        isImportant: markImportant
    });
}

async function finalizeChatMemorySession(options = {}) {
    const state = options.state || window.chatSessionState;
    if (!state || state.saved) return false;

    const userMessages = options.userMessages || state.userMessages || [];
    if (userMessages.length === 0) return false;

    const messages = [];
    const maxLen = Math.max(userMessages.length, (state.assistantMessages || []).length);
    for (let i = 0; i < maxLen; i++) {
        if (userMessages[i]) messages.push({ role: 'user', content: userMessages[i] });
        if (state.assistantMessages && state.assistantMessages[i]) {
            messages.push({ role: 'assistant', content: state.assistantMessages[i] });
        }
    }

    const saved = await saveChatMemoryFromConversation({
        roomType: options.roomType || state.roomType,
        messages,
        childName: options.childName || state.childName,
        isImportant: options.isImportant
    });

    if (saved) state.saved = true;
    return saved;
}

window.addEventListener('beforeunload', () => {
    if (window.chatSessionState && !window.chatSessionState.saved && window.chatSessionState.userMessages?.length > 0) {
        finalizeChatMemorySession();
    }
});

// ========================================================
// 💥 퀴즈 오답 — 다시 풀기 / 다음 문제로 (전 과목 공통)
