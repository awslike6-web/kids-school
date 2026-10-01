// kids/js/korean_sentence.js
// 🗣️ [5단계] 국어 AI 지문 토론방 전담 엔진 (골디락스 모듈)
// - 전사 거버넌스 헌법(규칙 7조) 준수: 단일 책임 완성형 모듈
// - AI 심층 토론, 생각 확장 코칭, 부모 검수 뱃지, 실시간 대화 보상 총괄

(function() {
    'use strict';

    let activePassage = null;
    let sentenceHistory = [];

    function renderSentenceUI(container) {
        const books = window.readingFetchedBooks || [];
        let buttonsHtml = books.map(book => 
            `<button class="quiz-choice-btn" style="margin-bottom: 10px; width: 100%; text-align: left;" onclick="startSentenceMission('${book.id}')">
                🗣️ [${book.title}] 토론 시작하기
            </button>`
        ).join('');

        container.innerHTML = `
            <div class="quiz-card">
                <h3 style="color:var(--purple); margin-bottom:20px;">아빠가 준비한 오늘의 토론 지문입니다. 원하는 지문을 선택하세요!</h3>
                ${buttonsHtml}
            </div>
        `;
    }

    function startSentenceMission(bookId) {
        const books = window.readingFetchedBooks || [];
        activePassage = books.find(b => b.id === bookId);
        window.activePassage = activePassage;
        sentenceHistory = [];
        window.sentenceHistory = sentenceHistory;
        window.__sentenceDiscussionMemorySaved = false;

        if (typeof window.initDiscussionRewardSession === 'function') {
            window.initDiscussionRewardSession('sentence', activePassage);
        }
        renderSentenceChat();
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

    async function processSentenceInput() {
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
            window.sentenceHistory = sentenceHistory;

            const passageText = activePassage ? (activePassage.fullText || (activePassage.paragraphs ? activePassage.paragraphs.map(p => p.text).join('\n') : "")) : "";
            const systemPrompt = typeof window.buildDiscussionAISystemPrompt === 'function'
                ? window.buildDiscussionAISystemPrompt('국어', activePassage)
                : (typeof window.buildFullAISystemPrompt === 'function' ? window.buildFullAISystemPrompt('공부방', passageText) : passageText);

            const proxyUrl = window.PROXY_URL || 'https://master-tower.awslike6.workers.dev';
            const { text: reply } = await (typeof window.fetchWithGeminiRetry === 'function'
                ? window.fetchWithGeminiRetry(
                    `${proxyUrl}/v1/chat/completions?type=ai`,
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
                )
                : fetch(`${proxyUrl}/v1/chat/completions?type=ai`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        model: "gemini-3.8-flash",
                        messages: [
                            { role: "system", content: systemPrompt },
                            ...sentenceHistory
                        ]
                    })
                }).then(r => r.json()).then(d => ({ text: d.choices?.[0]?.message?.content || '' }))
            );

            sentenceHistory.push({ role: "assistant", content: reply });
            window.sentenceHistory = sentenceHistory;

            if (typeof window.processDiscussionAiReply === 'function') {
                await window.processDiscussionAiReply(reply, {
                    missionType: 'sentence',
                    passageId: activePassage?.id,
                    bubbleId: loadingId,
                    chatBoxId: 'sentenceChatBox',
                    subject: '국어'
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
                    await window.dispatchDiscussionSuccessJackpot('sentence', activePassage?.id);
                }
            }
        } catch (e) {
            console.error('[processSentenceInput] Gemini 호출 실패:', e);
            if (typeof window.popLastPendingUserTurn === 'function') {
                window.popLastPendingUserTurn(sentenceHistory, 'role', ['user']);
            }
            if (typeof window.showGeminiFinalFailUI === 'function') {
                window.showGeminiFinalFailUI({ elementId: loadingId, chatBoxId: 'sentenceChatBox' });
            }
        }
    }

    function renderSentenceChat() {
        const container = document.getElementById('overlayInnerBody');
        if (!container || !activePassage) return;
        const passageText = activePassage.fullText || (activePassage.paragraphs ? activePassage.paragraphs.map(p => p.text).join('\n') : "");

        const isParent = (typeof window.isParentProfile === 'function' && window.isParentProfile()) || (window.isAdmin ?? false);
        let parentBadgeHtml = '';
        if (isParent && typeof window.getFairyPersonaSummary === 'function') {
            const summary = window.getFairyPersonaSummary('국어_토론', '공부방');
            parentBadgeHtml = `
                <div style="background:linear-gradient(135deg, rgba(255, 215, 0, 0.12), rgba(171, 71, 188, 0.18)); border: 1px solid rgba(255, 215, 0, 0.4); border-radius: 10px; padding: 8px 12px; margin-bottom: 12px; font-size: 0.8rem; text-align: left;">
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
            </div>
            <div class="chat-box" id="sentenceChatBox" style="height:250px;"></div>
            <div class="interactive-input-group">
                <input type="text" class="text-input-field" id="sentenceInput" placeholder="여기에 생각을 입력하세요!" onfocus="if(typeof resetGeminiChatErrorState==='function')resetGeminiChatErrorState()" onkeypress="if(event.key==='Enter') processSentenceInput()">
                <button class="quiz-button" onclick="processSentenceInput()">전송</button>
            </div>
        `;
        
        if (sentenceHistory.length === 0) {
            const initialMsgHtml = `안녕! 방금 읽은 <strong>[${activePassage.title}]</strong> 이야기에 대해 나랑 이야기해볼까? 어떤 생각이 들었어? ✨`;
            const initialMsgText = `안녕! 방금 읽은 [${activePassage.title}] 이야기에 대해 나랑 이야기해볼까? 어떤 생각이 들었어?`;
            appendSentenceMsg('ai', initialMsgHtml);
            sentenceHistory.push({ role: "assistant", content: initialMsgText });
            window.sentenceHistory = sentenceHistory;
            if (typeof window.speakFairyTTS === 'function') {
                window.speakFairyTTS(`안녕! 방금 읽은 ${activePassage.title} 이야기에 대해 나랑 이야기해볼까?`);
            }
        } else {
            sentenceHistory.forEach(h => appendSentenceMsg(h.role === 'user' ? 'user' : 'ai', (h.content || '').replace(/\n/g, '<br>')));
        }
    }

    // 🌐 전역 네임스페이스 및 하위 호환 브리지
    window.KoreanSentence = {
        renderUI: renderSentenceUI,
        startMission: startSentenceMission,
        renderChat: renderSentenceChat,
        processInput: processSentenceInput,
        appendMsg: appendSentenceMsg
    };

    window.renderSentenceUI = renderSentenceUI;
    window.startSentenceMission = startSentenceMission;
    window.renderSentenceChat = renderSentenceChat;
    window.processSentenceInput = processSentenceInput;
    window.appendSentenceMsg = appendSentenceMsg;

})();
