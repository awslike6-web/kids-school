// AI 요정 대화 공용 모듈. Worker 프록시로만 호출하고 키를 받지 않습니다. 대화 기억은 Notion에 저장하지 않습니다.
(() => {
  const WAIT_MESSAGE = '잠시만~ 코코가 생각 주머니 정리하고 다시 말해줄게! 잠시만 기다려줘~🧚‍♂️';
  const FAIL_MESSAGE = '미안해~ 코코가 방금 귀가 살짝 멍멍해서 잘 못 들었어! 다시 한 번만 얘기해줄래? 🧚‍♂️';
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  function getActiveChildName() {
    let name = (window.currentUserName || localStorage.getItem('currentUserName') || '민수').trim();
    if (['아빠', '엄마', '어른'].includes(name)) {
      name = (window.currentProfile || localStorage.getItem('currentUser') || 'son') === 'daughter' ? '민서' : '민수';
    }
    return name;
  }

  function isParentProfile() {
    const saved = (window.currentUserName || localStorage.getItem('currentUserName') || '').trim();
    return ['아빠', '엄마', '어른', 'admin'].includes(saved);
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

  function buildFullAISystemPrompt(roomType, extraPrompt = '') {
    let full = buildPersonaSystemPrompt(getActiveChildName(), roomType);
    full += `\n\n[대화 길이 및 티키타카 절대 규칙]
1. 답변은 무조건 1~2문장 (최대 2~3줄, 100자 미만)으로 짧고 경쾌하게 말해라.
2. 절대 한 번에 긴 설명이나 긴 문단을 혼자 늘어놓지 마라.
3. 아이가 바로 대답하기 쉽도록 다정한 리액션과 짧은 한마디 질문으로 자연스러운 핑퐁(티키타카) 대화를 이어가라.
4. 음성(TTS)으로 읽었을 때 5~8초 내에 깔끔하게 끝나는 호흡을 유지해라.`;
    if (extraPrompt) full += `\n\n[추가 지침]\n${extraPrompt}`;
    if (roomType === '공부방' && typeof CONJUNCTION_GRADING_GUARDRAIL !== 'undefined') {
      full += `\n\n${CONJUNCTION_GRADING_GUARDRAIL}`;
    }
    return full;
  }

  function buildDiscussionAISystemPrompt(subject, passage, extraPrompt = '') {
    const childName = getActiveChildName();
    const title = passage?.title || '오늘의 지문';
    const text = passage?.fullText || (passage?.paragraphs ? passage.paragraphs.map(p => p.text).join('\n') : '');
    let prompt;
    if (subject === '영어' || subject === 'ENGLISH' || subject === 'stage6') {
      prompt = `You are "Coco (코코 요정)", a friendly, cheerful, and encouraging AI English mentor having a natural conversation with ${childName} about the English story "${title}".

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
      prompt = `너는 ${childName}와 함께 읽은 지문 [${title}]에 대해 신나고 깊이 있는 대화를 나누는 다정하고 지혜로운 AI 요정 코코야.

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
    if (passage?.chatbotSystemPrompt) prompt += `\n\n[지문 맞춤 가이드]\n${passage.chatbotSystemPrompt}`;
    if (extraPrompt) prompt += `\n\n[추가 가이드]\n${extraPrompt}`;
    return `${prompt}\n\n[지문 원문: ${title}]\n${text}`;
  }

  function extractText(data) {
    if (!data || typeof data !== 'object') return '';
    const chat = data.choices?.[0]?.message?.content;
    if (chat) return String(chat).trim();
    const parts = data.candidates?.[0]?.content?.parts || [];
    return parts.filter(p => p?.text && !p.thought).map(p => p.text).join('').trim();
  }

  function isRetryable(response, data) {
    if (response.status === 503 || response.status === 429) return true;
    const status = String(data?.error?.status || '');
    return status === 'UNAVAILABLE' || status === 'RESOURCE_EXHAUSTED';
  }

  function createChatBubbleId(prefix = 'msg') {
    window.__chatBubbleSeq = (window.__chatBubbleSeq || 0) + 1;
    return `${prefix}_${Date.now()}_${window.__chatBubbleSeq}`;
  }

  function setChatBubbleContent(elementId, content, options = {}) {
    const el = elementId ? document.getElementById(elementId) : null;
    if (!el || ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes((el.tagName || '').toUpperCase())) return false;
    const box = options.chatBoxId ? document.getElementById(options.chatBoxId) : null;
    if (options.chatBoxId && (!box || !box.contains(el))) return false;
    if (options.asHtml !== false) el.innerHTML = content;
    else el.textContent = content;
    if (box) box.scrollTop = box.scrollHeight;
    return true;
  }

  function appendFairyNotice(id, message, border, color) {
    const box = document.getElementById('fairy-messages');
    if (!box) return false;
    const div = document.createElement('div');
    div.id = id;
    div.style.cssText = `padding:8px;border-radius:8px;font-size:.85rem;max-width:85%;line-height:1.4;word-break:break-all;background:#21262d;border-left:4px solid ${border};color:${color};align-self:flex-start`;
    div.innerText = message;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
    return true;
  }

  function speak(message, ui = {}) {
    if (ui.speak === false) return;
    if (typeof ui.speakFn === 'function') ui.speakFn(message);
    else if (typeof window.speakFairyTTS === 'function') window.speakFairyTTS(message, null, { skipPreset: true });
  }

  function showWait(ui = {}) {
    window.__geminiRetryWaitRef = null;
    const chatBoxId = ui.chatBoxId || null;
    if (ui.elementId) {
      if (setChatBubbleContent(ui.elementId, WAIT_MESSAGE, { chatBoxId, asHtml: false })) {
        window.__geminiRetryWaitRef = { type: 'element', id: ui.elementId, chatBoxId, asHtml: false };
      }
    } else if (ui.appendFairyMessage) {
      if (appendFairyNotice('gemini-retry-wait-msg', WAIT_MESSAGE, '#ffb347', '#ffd580')) {
        window.__geminiRetryWaitRef = { type: 'fairy', id: 'gemini-retry-wait-msg' };
      }
    } else if (typeof ui.onShow === 'function') {
      ui.onShow(WAIT_MESSAGE);
      window.__geminiRetryWaitRef = { type: 'callback', onApply: ui.onApply };
    }
    speak(WAIT_MESSAGE, ui);
  }

  function applyGeminiResponseToWaitUI(content, options = {}) {
    const asHtml = options.asHtml !== false;
    const formatted = asHtml ? String(content).replace(/\n/g, '<br>') : String(content);
    const ref = window.__geminiRetryWaitRef;
    const chatBoxId = options.chatBoxId || ref?.chatBoxId || null;
    if (ref?.type === 'element' && ref.id) {
      setChatBubbleContent(ref.id, formatted, { chatBoxId: ref.chatBoxId || chatBoxId, asHtml: ref.asHtml !== false });
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

  function clearRetryUI() {
    window.__geminiRetryWaitRef = null;
    document.getElementById('gemini-retry-wait-msg')?.remove();
    document.getElementById('gemini-final-fail-msg')?.remove();
  }

  function resetGeminiChatErrorState() {
    clearRetryUI();
    window.__geminiChatErrorActive = false;
  }

  function showGeminiFinalFailUI(ui = {}) {
    clearRetryUI();
    window.__geminiChatErrorActive = true;
    if (ui.elementId) {
      const chatBoxId = ui.chatBoxId || null;
      if (setChatBubbleContent(ui.elementId, FAIL_MESSAGE, { chatBoxId, asHtml: false })) {
        window.__geminiRetryWaitRef = { type: 'element', id: ui.elementId, chatBoxId, asHtml: false };
      }
    } else if (ui.appendFairyMessage) {
      appendFairyNotice('gemini-final-fail-msg', FAIL_MESSAGE, '#ab47bc', '#c9d1d9');
    } else if (typeof ui.onShow === 'function') {
      ui.onShow(FAIL_MESSAGE);
    }
    speak(FAIL_MESSAGE, ui);
  }

  function popLastPendingUserTurn(history, roleKey = 'role', userValues = ['user']) {
    if (Array.isArray(history) && history.length && userValues.includes(history[history.length - 1]?.[roleKey])) history.pop();
  }

  async function fetchWithGeminiRetry(url, fetchOptions = {}, retryOptions = {}) {
    const maxRetries = retryOptions.maxRetries ?? 3;
    const baseDelayMs = retryOptions.baseDelayMs ?? 1000;
    const ui = retryOptions.ui || null;
    const wait = async attempt => {
      if (attempt === 1 && ui) showWait(ui);
      await sleep(baseDelayMs * attempt);
    };
    for (let attempt = 1; ; attempt++) {
      let response;
      try {
        response = await fetch(url, fetchOptions);
      } catch (error) {
        if (attempt >= maxRetries) throw error;
        await wait(attempt);
        continue;
      }
      const data = await response.json().catch(() => ({}));
      const text = extractText(data);
      if (response.ok && !data.error && text) return { response, data, text };
      if (attempt < maxRetries && (isRetryable(response, data) || (response.ok && !text))) {
        await wait(attempt);
        continue;
      }
      throw new Error(data.error?.message || data.error || `API 오류 (${response.status})`);
    }
  }

  Object.assign(window, { GEMINI_FINAL_FAIL_MESSAGE: FAIL_MESSAGE, getActiveChildName, isParentProfile,
    buildFullAISystemPrompt, buildDiscussionAISystemPrompt, createChatBubbleId, setChatBubbleContent,
    applyGeminiResponseToWaitUI, resetGeminiChatErrorState, showGeminiFinalFailUI, popLastPendingUserTurn,
    fetchWithGeminiRetry });
})();
