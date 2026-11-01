// kids/common_space/voca_modal.js - voca_common.js 분리 2/2: 단어 모달·TTS·음성 입력·요정 코코 (voca_common.js 다음에 로드)
let currentActiveWord = null;

function openModal(wordData) {
  currentActiveWord = wordData;
  const isMathSubject = (wordData.subject || []).includes("수학");

  // 💡 모달 열 때 현재 과목을 전역에 설정 (보상 헬퍼가 이 값을 참조함)
  window.currentSubject = (wordData.subject && wordData.subject.length > 0) ? wordData.subject[0] : "사회";
  wordStartTime = Date.now(); // 단어 화면 진입 시간 기록

  document.getElementById('modalWordTitle').textContent = wordData.word;
  // 🧮 뜻풀이에 세로 분수 포맷터 적용
  document.getElementById('modalMeaning').innerHTML = formatMathExpressions(wordData.meaning);
  
  const imgEl = document.getElementById('modalImage');
  if (wordData.imageUrl) { 
    imgEl.src = wordData.imageUrl; 
    imgEl.style.display = 'block'; 
  } else { 
    imgEl.style.display = 'none'; 
  }

  const interContainer = document.getElementById('modalInteractiveContainer');
  const interFrame = document.getElementById('modalInteractiveFrame');
  const interLink = document.getElementById('modalInteractiveExternalLink');

  if (wordData.interactiveUrl) {
    if (interFrame) interFrame.src = wordData.interactiveUrl;
    if (interLink) interLink.href = wordData.interactiveUrl;
    if (interContainer) interContainer.style.display = 'block';
  } else {
    if (interFrame) interFrame.src = 'about:blank';
    if (interContainer) interContainer.style.display = 'none';
  }
  
  const detailsGroup = document.getElementById('modalDetailsGroup');
  if (wordData.detailContext) {
    // 📐 상세설명에 세로 분수 및 공식 하이라이트 카드 박스 적용
    document.getElementById('modalDetailContext').innerHTML = formatDetailContext(wordData.detailContext, isMathSubject);
    detailsGroup.style.display = 'block'; 
    // 수학 과목은 아이들이 교과서 공식과 원리를 즉시 확인할 수 있도록 자동 펼침
    if (isMathSubject) {
      detailsGroup.setAttribute('open', 'true');
    } else {
      detailsGroup.removeAttribute('open');
    }
  } else { 
    detailsGroup.style.display = 'none'; 
  }
  
  document.getElementById('modalAudioBtn').onclick = () => {
    // [1] 노션에 사전 등록된 고음질 MP3 음성 파일이 있는 경우 최우선 재생
    if (wordData.audioUrl) {
      if (typeof stopFairyTTS === 'function') stopFairyTTS();
      const directAudio = new Audio(wordData.audioUrl);
      directAudio.play().catch(() => playWordViaTTS(wordData.word));
      return;
    }
    // [2] 고화질 Neural TTS (영단어는 Jenny Neural, 한국어는 SunHi Neural 실시간 스트리밍)
    playWordViaTTS(wordData.word);
  };

  MODAL_CHAT_HISTORY = []; 
  document.getElementById('fairyChatArea').style.display = 'none';
  document.getElementById('fairyQuestion').value = '';
  document.getElementById('fairyAnswerBox').innerHTML = '<span style="color: #999;">궁금한 점을 적거나 마이크 버튼을 눌러 말해봐! ✨</span>';

  const overlay = document.getElementById('wordModal'); 
  overlay.style.display = 'flex';
  setTimeout(() => overlay.classList.add('active'), 10);
}

// 🔊 단어 맞춤형 Neural TTS 발화 헬퍼
function playWordViaTTS(targetWord) {
  if (!targetWord) return;
  if (typeof stopFairyTTS === 'function') stopFairyTTS();

  const isEnglish = (typeof isEnglishText === 'function') ? isEnglishText(targetWord) : /[a-zA-Z]/.test(targetWord);

  if (isEnglish && typeof speakEnglish === 'function') {
    speakEnglish(targetWord);
  } else if (typeof speakFairyTTS === 'function') {
    speakFairyTTS(targetWord);
  } else if ('speechSynthesis' in window) {
    // 브라우저 네이티브 안전 폴백
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(targetWord);
    utterance.lang = isEnglish ? 'en-US' : 'ko-KR';
    utterance.rate = 0.85;
    window.speechSynthesis.speak(utterance);
  }
}

function closeModal(event, force = false) {
  const overlay = document.getElementById('wordModal');
  if (force || event.target === overlay) { 
    if (typeof stopFairyTTS === 'function') {
      stopFairyTTS();
    } else if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    const interFrame = document.getElementById('modalInteractiveFrame');
    if (interFrame) interFrame.src = 'about:blank';
    overlay.classList.remove('active'); 
    setTimeout(() => overlay.style.display = 'none', 300); 

    // 🏆 체류형 정독 보상 (20초 이상 깊은 정독 시 즉시 지급, 또는 5초 이상 3단어 탐색 달성 시 지급)
    if (wordStartTime > 0) {
        const timeSpent = (Date.now() - wordStartTime) / 1000;
        const currentWordTitle = currentActiveWord?.word || '어휘';
        const currentSubj = window.currentSubject || '사회';

        if (timeSpent >= 20) {
            // 💡 [20초 마스터 정독 혜택] 깊이 있게 정독한 경우 즉시 보상 지급!
            console.log(`📖 [20초 깊은 정독 완료] "${currentWordTitle}" (${timeSpent.toFixed(1)}초 체류)`);
            if (typeof window.grantVocaDwellReward === 'function') {
                window.grantVocaDwellReward(currentWordTitle, currentSubj);
            } else if (typeof grantRewardAndShowUI === 'function') {
                grantRewardAndShowUI(1, false, 'voca');
            }
        } else if (timeSpent >= 5) {
            viewedWordsCount++;
            console.log(`단어 학습 인정! 현재 스택: ${viewedWordsCount}/3 ("${currentWordTitle}")`);

            // 3단어 누적 탐색 시 1보상 & 용어 경험치 지급
            if (viewedWordsCount >= 3) {
                if (typeof window.grantVocaDwellReward === 'function') {
                    window.grantVocaDwellReward(currentWordTitle, currentSubj);
                } else if (typeof grantRewardAndShowUI === 'function') {
                    grantRewardAndShowUI(1, false, 'voca');
                }
                viewedWordsCount = 0;
            }
        } else {
            console.log(`[탐색 건너뜀] ${timeSpent.toFixed(1)}초 체류 (최소 5초 이상 정독 필요)`);
        }
        wordStartTime = 0; // 타이머 리셋
    }
  }
}

function syncVoiceToggleBtnUi() {
  const btn = document.getElementById("voiceToggleBtn");
  if (!btn) return;
  const isTtsEnabled = localStorage.getItem('fairy_tts_enabled') !== 'false';
  isFairyVoiceOn = isTtsEnabled;
  if (isTtsEnabled) {
    btn.innerHTML = "🔊 요정 소리 켜짐";
    btn.style.backgroundColor = "#4facfe";
  } else {
    btn.innerHTML = "🔇 요정 소리 꺼짐";
    btn.style.backgroundColor = "#95a5a6";
  }
}

function toggleFairyVoice() {
  if (typeof toggleFairyTtsSetting === 'function') {
    toggleFairyTtsSetting();
    syncVoiceToggleBtnUi();
  } else {
    isFairyVoiceOn = !isFairyVoiceOn;
    localStorage.setItem('fairy_tts_enabled', isFairyVoiceOn ? 'true' : 'false');
    syncVoiceToggleBtnUi();
  }
  if (!isFairyVoiceOn) {
    if (typeof stopFairyTTS === 'function') stopFairyTTS();
    else if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }
}

function speakFairyText(htmlText) {
  const isTtsEnabled = localStorage.getItem('fairy_tts_enabled') !== 'false';
  if (!isTtsEnabled || !isFairyVoiceOn) return;

  const cleanText = htmlText.replace(/<[^>]+>/g, '').replace(/🧚‍♀️ 코코 요정님:/g, '').trim();
  if (!cleanText) return;

  // 🌟 고음질 Neural Edge-TTS 실시간 스트리밍 및 프리셋 MP3 자동 매칭
  if (typeof speakFairyTTS === 'function') {
    speakFairyTTS(cleanText);
  } else if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel(); 
    const utterance = new SpeechSynthesisUtterance(cleanText);
    const isEnglish = (typeof isEnglishText === 'function') ? isEnglishText(cleanText) : /[a-zA-Z]/.test(cleanText);
    utterance.lang = isEnglish ? 'en-US' : 'ko-KR';
    utterance.rate = 1.0; 
    window.speechSynthesis.speak(utterance);
  }
}

function startVoiceInput() {
  const wasError = window.__geminiChatErrorActive;
  if (typeof resetGeminiChatErrorState === 'function') resetGeminiChatErrorState();
  if (wasError) {
    const answerBox = document.getElementById('fairyAnswerBox');
    if (answerBox) answerBox.innerHTML = '';
  }
  const micBtn = document.getElementById('micBtn');
  const questionInput = document.getElementById('fairyQuestion');
  const answerBox = document.getElementById('fairyAnswerBox');
  if (!questionInput) return;

  if (typeof setupDebouncedSTT === 'function') {
    setupDebouncedSTT({
      inputEl: questionInput,
      debounceMs: 2500,
      onStart: function() {
        micBtn.innerText = "⏹️ 전송";
        micBtn.style.transform = "scale(1.05)";
        micBtn.style.backgroundColor = "#e53e3e";
        micBtn.style.color = "white";
        questionInput.placeholder = "듣고 있어요... 편하게 말씀해 보세요!";
        if (answerBox) {
          answerBox.innerHTML = '<span style="color: #4facfe;">🎙️ <b>요정이 귀 기울여 듣고 있어요...</b><br>말씀을 마치시면 자동으로 전송되며, [전송] 버튼을 눌러 바로 보낼 수도 있어요! ✨</span>';
        }
      },
      onEnd: function() {
        micBtn.innerText = "🎙️";
        micBtn.style.transform = "scale(1)";
        micBtn.style.backgroundColor = "#fbc2eb";
        micBtn.style.color = "var(--dark)";
        questionInput.placeholder = "글로 적거나, 마이크를 눌러 말해봐!";
      },
      onError: function(event) {
        console.error("음성 인식 오류:", event.error);
        micBtn.innerText = "🎙️";
        micBtn.style.backgroundColor = "#fbc2eb";
        micBtn.style.color = "var(--dark)";
        questionInput.placeholder = "글로 적거나, 마이크를 눌러 말해봐!";

        const micName = window.__activeMicDeviceLabel || '기본 마이크';
        const isVirtual = /droidcam|virtual|stereo mix|스테레오 믹스/i.test(micName);
        let errMsg = `마이크 소리가 감지되지 않았어요. (현재 감지 장치: <b>${micName}</b>)<br>마이크 가까이에서 다시 말씀해 주세요!`;
        if (isVirtual) {
          errMsg = `⚠️ <b>가상 마이크("${micName}")가 선택되어 있습니다.</b><br>실제 마이크(Realtek 등)로 소리를 전달하려면 브라우저 주소창 좌측 🔒 자물쇠(사이트 설정) ➔ <b>[마이크]</b>를 실제 마이크로 변경해 주세요!`;
        } else if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          errMsg = "⚠️ <b>마이크 사용 권한이 차단되어 있습니다.</b><br>브라우저 주소창 좌측의 🔒 자물쇠(또는 사이트 설정) 아이콘을 눌러 <b>[마이크 허용]</b>으로 변경해 주세요!";
        } else if (event.error === 'network') {
          errMsg = "⚠️ 음성 인식 네트워크 연결이 원활하지 않습니다. 글자로 질문을 입력해 보세요!";
        }
        if (answerBox) answerBox.innerHTML = `<span style="color: #e53e3e;">${errMsg}</span>`;
      },
      onSend: function(text) {
        questionInput.value = text;
        askCocoFairy();
      }
    });
    return;
  }

  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) {
    alert("현재 브라우저에서는 마이크 기능이 지원되지 않아요. (크롬 브라우저를 사용해주세요!)");
    return;
  }

  const recognition = new Recognition();
  recognition.lang = 'ko-KR';
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onstart = function() {
    micBtn.innerText = "👂 듣는중..";
    micBtn.style.transform = "scale(1.1)";
    micBtn.style.backgroundColor = "#e53e3e";
    micBtn.style.color = "white";
  };
  recognition.onresult = function(event) {
    const rawText = event.results[0][0].transcript;
    document.getElementById('fairyQuestion').value = rawText;
    askCocoFairy();
  };
  recognition.onend = function() {
    micBtn.innerText = "🎙️";
    micBtn.style.transform = "scale(1)";
    micBtn.style.backgroundColor = "#fbc2eb";
    micBtn.style.color = "var(--dark)";
  };
  recognition.onerror = function(event) {
    console.error("음성 인식 오류:", event.error);
    micBtn.innerText = "🎙️";
    micBtn.style.backgroundColor = "#fbc2eb";
  };
  recognition.start();
}

async function askFairyTeacher(word, meaning) {
  if (typeof resetGeminiChatErrorState === 'function') resetGeminiChatErrorState();
  const replyBox = document.getElementById('fairyReplyBox');
  replyBox.innerHTML = `⏳ 요정 코코가 <b>[${word}]</b>에 대해 생각하고 있어요. 조금만 기다려주세요...`;
  // 단어 카드 위치 유지: fairyRoom으로 스크롤하면 목록이 맨 위로 튀어 올라감

  try {
    const { text: reply } = await fetchWithGeminiRetry(
      `${WORKER_PROXY_URL}/v1/chat/completions?type=ai`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gemini-2.5-flash",
          messages: [
            { role: "system", content: getVocaFairySystemPrompt(`주어진 단어와 뜻풀이를 아이들의 눈높이에 맞게 아주 쉽고, 흥미로운 비유를 들어서 3줄 이내로 다정하게 설명해 줘.`) },
            { role: "user", content: `단어: ${word}, 뜻풀이: ${meaning}. 이 단어에 대해 친절하게 설명해 줘!` }
          ]
        })
      },
      {
        maxRetries: 3,
        baseDelayMs: 1000,
        ui: {
          onShow: (msg) => {
            replyBox.innerHTML = `🧚‍♀️ <b>코코 요정님:</b><br>${msg}`;
          },
          onApply: (replyHtml) => {
            replyBox.innerHTML = `🧚‍♀️ <b>코코 요정님:</b><br>${replyHtml}`;
          },
          speakFn: speakFairyText
        }
      }
    );

    const replyHtml = reply.replace(/\n/g, '<br>');
    if (window.__geminiRetryWaitRef) {
      applyGeminiResponseToWaitUI(replyHtml);
    } else {
      replyBox.innerHTML = `🧚‍♀️ <b>코코 요정님:</b><br>${replyHtml}`;
    }
    speakFairyText(replyHtml);
  } catch (error) {
    console.error("요정 호출 실패:", error);
    if (typeof showGeminiFinalFailUI === 'function') {
      showGeminiFinalFailUI({
        onShow: (msg) => {
          replyBox.innerHTML = `🧚‍♀️ <b>코코 요정님:</b><br>${msg}`;
        },
        speakFn: speakFairyText
      });
    } else {
      replyBox.innerHTML = `🧚‍♀️ <b>코코 요정님:</b><br>${window.GEMINI_FINAL_FAIL_MESSAGE || '다시 한 번만 얘기해줄래?'}`;
    }
  }
}

function toggleFairyBox() {
  const chatArea = document.getElementById("fairyChatArea");
  chatArea.style.display = chatArea.style.display === "none" ? "block" : "none";
}

async function askCocoFairy() {
  if (typeof resetGeminiChatErrorState === 'function') resetGeminiChatErrorState();
  const questionInput = document.getElementById("fairyQuestion");
  const answerBox = document.getElementById("fairyAnswerBox");
  const questionText = questionInput.value.trim();

  if (!questionText) {
    alert("요정님에게 물어볼 질문을 적어주세요!");
    return;
  }

  answerBox.innerHTML = "<b>🧚‍♀️ 코코 요정:</b><br><span style='color: #ff9a9e;'>열심히 생각하고 있어요! 조금만 기다려주세요... ✨</span>";
  questionInput.value = ""; 

  MODAL_CHAT_HISTORY.push({ role: "user", content: questionText });

  let mathGuide = '';
  if (currentActiveWord && (currentActiveWord.subject || []).includes('수학')) {
    mathGuide = ' 이 단어는 [수학] 개념이야. 학생은 초등학교 5학년 민수야. 어려운 한자어는 쉬운 말로 바꾸고 짧은 문장으로 말해줘. 기계적인 공식 나열 대신 피자, 사탕, 초콜릿 나누기나 색종이 접기 같은 친근한 실생활 비유를 들어서 다정하고 쉽게 설명해줘. 핵심 공식은 눈에 띄게 콕 짚어주고 따뜻하게 격려해줘.';
  }

  const wordContext = currentActiveWord ? `현재 아이가 공부 중인 단어: [${currentActiveWord.word}], 뜻풀이: [${currentActiveWord.meaning}].${mathGuide}` : '';
  const fairyPrompt = getVocaFairySystemPrompt(wordContext ? `${wordContext} 아이의 질문에 아주 친절하고 알기 쉽게 3줄 이내로 다정하게 설명해줘.` : '');

  try {
    const { text: reply } = await fetchWithGeminiRetry(
      `${WORKER_PROXY_URL}/v1/chat/completions?type=ai`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gemini-2.5-flash", 
          messages: [
            { role: "system", content: fairyPrompt },
            ...MODAL_CHAT_HISTORY
          ]
        })
      },
      {
        maxRetries: 3,
        baseDelayMs: 1000,
        ui: {
          onShow: (msg) => {
            answerBox.innerHTML = `🧚‍♀️ <b>코코 요정님:</b><br>${msg}`;
          },
          onApply: (replyHtml) => {
            answerBox.innerHTML = `🧚‍♀️ <b>코코 요정님:</b><br>${replyHtml}`;
          },
          speakFn: speakFairyText
        }
      }
    );
    
    MODAL_CHAT_HISTORY.push({ role: "assistant", content: reply });

    const replyHtml = reply.replace(/\n/g, '<br>');
    if (window.__geminiRetryWaitRef) {
      applyGeminiResponseToWaitUI(replyHtml);
    } else {
      answerBox.innerHTML = `🧚‍♀️ <b>코코 요정님:</b><br>${replyHtml}`;
    }
    speakFairyText(replyHtml);

  } catch (error) {
    console.error(error);
    popLastPendingUserTurn(MODAL_CHAT_HISTORY, 'role', ['user']);
    if (typeof showGeminiFinalFailUI === 'function') {
      showGeminiFinalFailUI({
        onShow: (msg) => {
          answerBox.innerHTML = `🧚‍♀️ <b>코코 요정님:</b><br>${msg}`;
        },
        speakFn: speakFairyText
      });
    } else {
      answerBox.innerHTML = `🧚‍♀️ <b>코코 요정님:</b><br>${window.GEMINI_FINAL_FAIL_MESSAGE || '다시 한 번만 얘기해줄래?'}`;
    }
  }
}

// 엔터키 리스너 바인딩
setTimeout(() => {
  const qInput = document.getElementById("fairyQuestion");
  if(qInput) {
    qInput.addEventListener('focus', function() {
      const wasError = window.__geminiChatErrorActive;
      if (typeof resetGeminiChatErrorState === 'function') resetGeminiChatErrorState();
      if (wasError) {
        const answerBox = document.getElementById('fairyAnswerBox');
        if (answerBox) answerBox.innerHTML = '';
      }
    });
    qInput.addEventListener("keypress", function(event) {
      if (event.key === "Enter") {
        event.preventDefault();
        askCocoFairy();
      }
    });
  }
}, 500);
