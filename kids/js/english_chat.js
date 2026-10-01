// kids/js/english_chat.js
// 🗣️ [6단계] 코코와 한 줄 인사 / AI 영어 회화 토론 모듈 (EnglishChat)
// - Gemini 3.8 Flash (2026 플래그십 표준) 기반 실시간 영어 롤플레잉 및 생각 확장 코칭
// - 지문별 대화 큐, 한글 해석 토글, 부모 검수 뱃지 및 학습일지 동기화
// - 네임스페이스: window.EnglishChat

(function() {
    'use strict';

    let activePassage = null;
    let sentenceHistory = [];
    const PROXY_URL = (typeof window.PROXY_URL !== 'undefined') ? window.PROXY_URL : "https://minmin-notion.awslike6.workers.dev";

    // --------------------------------------------------------
    // 지문 선택 로비
    // --------------------------------------------------------
    function renderSentenceUI(container, readingFetchedBooks = []) {
        let buttonsHtml = readingFetchedBooks.map(book => 
            `<button class="quiz-choice-btn" style="margin-bottom: 10px; width: 100%; text-align: left;" onclick="window.EnglishChat.startSentenceMission('${book.id}', window.readingFetchedBooks || [])">
                🗣️ [${book.title}] Discussion Start
            </button>`
        ).join('');

        container.innerHTML = `
            <div class="quiz-card">
                <h3 style="color:var(--purple); margin-bottom:20px;">오늘의 영어 토론 지문입니다. 원하는 지문을 선택하세요!</h3>
                ${buttonsHtml}
            </div>
        `;
    }

    function startSentenceMission(bookId, readingFetchedBooks = []) {
        const books = (readingFetchedBooks && readingFetchedBooks.length > 0) 
            ? readingFetchedBooks 
            : (window.readingFetchedBooks || []);
        activePassage = books.find(b => b.id === bookId);
        sentenceHistory = [];
        window.__sentenceDiscussionMemorySaved = false;

        if (typeof window.initDiscussionRewardSession === 'function') {
            window.initDiscussionRewardSession('stage6', activePassage);
        }
        renderSentenceChat();
    }

    function renderSentenceChat() {
        const container = document.getElementById('overlayInnerBody');
        if (!container || !activePassage) return;

        const passageText = activePassage.fullText || (activePassage.paragraphs ? activePassage.paragraphs.map(p => p.text).join('\n') : "");
        
        window.processSentenceInput = async function() {
            const inputEl = document.getElementById('sentenceInput');
            if (!inputEl) return;
            const text = inputEl.value.trim();
            if (!text) return;

            if (typeof window.resetGeminiChatErrorState === 'function') {
                window.resetGeminiChatErrorState();
            }
            inputEl.value = '';
            appendSentenceMsg('user', text);
            
            const loadingId = appendSentenceMsg('ai', "⏳ 코코가 생각 중이에요...");
            
            try {
                if (typeof window.processDiscussionMessageRewards === 'function') {
                    await window.processDiscussionMessageRewards(text);
                }
                sentenceHistory.push({ role: "user", content: text });
                const systemPrompt = typeof window.buildDiscussionAISystemPrompt === 'function'
                    ? window.buildDiscussionAISystemPrompt('영어', activePassage)
                    : (typeof window.buildFullAISystemPrompt === 'function' ? window.buildFullAISystemPrompt('공부방', passageText) : passageText);
                
                // 🚀 2026 플래그십 표준 gemini-3.8-flash 적용
                const fetchFn = (typeof window.fetchWithGeminiRetry === 'function') ? window.fetchWithGeminiRetry : fetch;
                const { text: reply } = await window.fetchWithGeminiRetry(
                    `${PROXY_URL}/v1/chat/completions?type=ai`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            model: "gemini-3.8-flash",
                            messages: [
                                { role: "system", content: systemPrompt },
                                ...sentenceHistory
                            ]
                        })
                    },
                    {
                        maxRetries: 3,
                        baseDelayMs: 1000,
                        ui: { elementId: loadingId, chatBoxId: 'sentenceChatBox' }
                    }
                );
                sentenceHistory.push({ role: "assistant", content: reply });

                if (typeof window.processDiscussionAiReply === 'function') {
                    await window.processDiscussionAiReply(reply, {
                        missionType: 'stage6',
                        passageId: activePassage?.id,
                        bubbleId: loadingId,
                        chatBoxId: 'sentenceChatBox',
                        subject: '영어'
                    });
                } else {
                    if (typeof window.applyGeminiResponseToWaitUI === 'function') {
                        window.applyGeminiResponseToWaitUI(reply.replace(/\n/g, '<br>'), {
                            elementId: loadingId,
                            chatBoxId: 'sentenceChatBox'
                        });
                    }
                    if (typeof window.speakFairyTTS === 'function') {
                        window.speakFairyTTS(reply.replace(/\[SUCCESS\]/g, ''));
                    }
                    if (reply.includes("[SUCCESS]") && typeof window.dispatchDiscussionSuccessJackpot === 'function') {
                        await window.dispatchDiscussionSuccessJackpot('stage6', activePassage?.id);
                    }
                }
            } catch (e) {
                console.error('[processSentenceInput] Gemini 3.8 Flash 호출 실패:', e);
                if (typeof window.popLastPendingUserTurn === 'function') {
                    window.popLastPendingUserTurn(sentenceHistory, 'role', ['user']);
                }
                if (typeof window.showGeminiFinalFailUI === 'function') {
                    window.showGeminiFinalFailUI({ elementId: loadingId, chatBoxId: 'sentenceChatBox' });
                }
            }
        };

        window.appendSentenceMsg = appendSentenceMsg;
        window.toggleReadingTranslation = toggleReadingTranslation;

        const translationBlock = activePassage.translation ? `
            <button type="button" class="quiz-button" style="margin-top:10px; width:100%; font-size:0.85rem; padding:8px;" onclick="toggleReadingTranslation()">🇰🇷 한글 해석 보기 / 숨기기</button>
            <div id="sentenceTranslation" style="display:none; margin-top:10px; padding-top:10px; border-top:1px dashed #ccc; color:#555; line-height:1.6;">
                ${activePassage.translation.replace(/\n/g, '<br>')}
            </div>` : '';

        const isParent = (typeof window.isParentProfile === 'function' && window.isParentProfile()) || (window.isAdmin ?? false);
        let parentBadgeHtml = '';
        if (isParent && typeof window.getFairyPersonaSummary === 'function') {
            const summary = window.getFairyPersonaSummary('ENGLISH', '공부방');
            parentBadgeHtml = `
                <div style="background:linear-gradient(135deg, rgba(255, 215, 0, 0.12), rgba(59, 130, 246, 0.18)); border: 1px solid rgba(255, 215, 0, 0.4); border-radius: 10px; padding: 8px 12px; margin-bottom: 12px; font-size: 0.8rem; text-align: left;">
                    <div style="font-weight:bold; color:#d97706; margin-bottom:3px; display:flex; justify-content:space-between; align-items:center;">
                        <span>👨‍👩‍👧 [부모 검수 모드] ${summary.icon} ${summary.title}</span>
                        <span style="background:rgba(217, 119, 6, 0.15); padding:1px 6px; border-radius:6px; font-size:0.72rem;">대상: ${summary.childName}</span>
                    </div>
                    <div style="color:#4b5563; font-size:0.78rem; line-height:1.4;">
                        🎭 <strong>역할</strong>: ${summary.role}<br>
                        💡 <strong>코칭 전략</strong>: ${summary.description}
                    </div>
                </div>
            `;
        }

        container.innerHTML = `
            ${parentBadgeHtml}
            <div class="passage-box" style="font-size:0.95rem; max-height:150px; overflow-y:auto; margin-bottom:15px; border-left-color:var(--purple);">
                <strong>[${activePassage.title}]</strong><br>
                ${passageText.replace(/\n/g, '<br>')}
                ${translationBlock}
            </div>
            <div class="chat-box" id="sentenceChatBox" style="height:250px;"></div>
            <div class="interactive-input-group">
                <input type="text" class="text-input-field" id="sentenceInput" placeholder="영어로 짧게 적어봐요! (예: I think..., I like...)" onfocus="if(typeof resetGeminiChatErrorState==='function')resetGeminiChatErrorState()" onkeypress="if(event.key==='Enter') processSentenceInput()">
                <button class="quiz-button" onclick="processSentenceInput()">Send</button>
            </div>
            <div style="font-size: 0.8rem; color: #888; text-align: center; margin-top: 5px;">💡 Tip: 단어 하나만 적거나 한글로 모르는 걸 물어봐도 코코가 친절하게 알려줘요!</div>
        `;
        
        if (sentenceHistory.length === 0) {
            const initialMsgHtml = `Hello! 방금 읽은 <strong>[${activePassage.title}]</strong> 잘 읽어봤어? 첫 번째 질문! ✨<br>Did you like this story? Type 'Yes' or 'No'! (이야기가 마음에 들었어? Yes나 No로 대답해봐!)`;
            const initialMsgText = `Hello! Did you like the story [${activePassage.title}]? Type Yes or No!`;
            appendSentenceMsg('ai', initialMsgHtml);
            sentenceHistory.push({ role: "assistant", content: initialMsgText });
            if (typeof window.speakFairyTTS === 'function') {
                window.speakFairyTTS(`Did you like this story? Type Yes or No!`);
            }
        } else {
            sentenceHistory.forEach(h => appendSentenceMsg(h.role === 'user' ? 'user' : 'ai', h.content.replace(/\n/g, '<br>')));
        }
    }

    function appendSentenceMsg(sender, text) {
        const chatBox = document.getElementById('sentenceChatBox');
        if (!chatBox) return null;
        const msgId = typeof window.createChatBubbleId === 'function'
            ? window.createChatBubbleId('msg')
            : ('msg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8));
        const msgHtml = `<div id="${msgId}" class="msg ${sender}">${text}</div>`;
        chatBox.insertAdjacentHTML('beforeend', msgHtml);
        chatBox.scrollTop = chatBox.scrollHeight;
        return msgId;
    }

    function toggleReadingTranslation() {
        const el = document.getElementById('sentenceTranslation');
        if (!el) return;
        el.style.display = el.style.display === 'none' ? 'block' : 'none';
    }

    const EnglishChat = {
        renderSentenceUI,
        startSentenceMission,
        renderSentenceChat,
        appendSentenceMsg,
        toggleReadingTranslation,
        getHistory: () => sentenceHistory,
        getActivePassage: () => activePassage
    };

    window.EnglishChat = EnglishChat;
    window.startSentenceMission = startSentenceMission;
    window.renderSentenceChat = renderSentenceChat;
    window.toggleReadingTranslation = toggleReadingTranslation;

})();
