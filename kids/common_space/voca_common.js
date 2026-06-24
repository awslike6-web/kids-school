// 📚 용어사전방(Voca) 독립 실행형 제어 엔진
const WORKER_PROXY_URL = typeof PROXY_URL !== "undefined" ? PROXY_URL : "https://minmin-notion.awslike6.workers.dev";

// 🚀 코어 관제탑(window)이 세탁해 둔 글로벌 상태를 그대로 이어받습니다!
let currentUser = window.currentProfile || 'son';
let currentUserName = window.currentUserName || '민수';
let currentTheme = window.currentTheme || '마인크래프트';

let allDictionaryWords = [];
let selectedSubjects = []; 
let selectedGrades = [];   
let MODAL_CHAT_HISTORY = [];
let isFairyVoiceOn = true; 

// 🏆 보상 시스템을 위한 진지하게 읽은 단어 카운터
let viewedWordsCount = 0; 
let wordStartTime = 0; 

function getVocaFairySystemPrompt(extraPrompt = '') {
    if (typeof buildFullAISystemPrompt === 'function') {
        return buildFullAISystemPrompt('용어방', extraPrompt);
    }
    return extraPrompt || "너는 용어사전방의 다정한 AI 도우미 코코야.";
}

// 🏰 엔진 시동 및 데이터 로딩 시작
window.addEventListener('load', async () => { 
  document.body.className = (currentTheme === '슬라임' || currentTheme === 'theme--slime') ? 'theme--slime' : 'theme--minecraft';
  document.getElementById('welcomeMsg').textContent = `${currentUserName}의 지식 도서관에 오신 것을 환영해요!`;
  
  if (typeof speechSynthesis !== 'undefined' && speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = speechSynthesis.getVoices;
  }
  if (typeof initChatMemorySession === 'function') {
    await initChatMemorySession('용어방');
  }
  fetchLibraryData(); 
});

window.addEventListener('beforeunload', () => {
  if (MODAL_CHAT_HISTORY.length > 0 && typeof saveChatMemoryFromConversation === 'function') {
    saveChatMemoryFromConversation({ roomType: '용어방', messages: MODAL_CHAT_HISTORY });
  }
});

async function fetchLibraryData() {
  try {
    const records = await fetchVocaFromNotion({
      studentName: currentUserName.trim()
    });

    allDictionaryWords = records.map(r => ({
      ...r,
      meaning: r.meaning || "뜻풀이 없음",
      subject: r.subject.length ? r.subject : ["미분류"]
    }));

    document.getElementById('loadingArea').style.display = 'none';
    buildFilterButtons();
    updateStatusAndFilter();

  } catch (error) {
    console.error("데이터 로딩 실패:", error);
    document.getElementById('loadingArea').innerHTML = `❌ 로딩 실패. 새로고침 해주세요.`;
  }
}

function buildFilterButtons() {
  const subArea = document.getElementById('subjectFilterArea');
  const gradeArea = document.getElementById('gradeFilterArea');
  const subjects = [...new Set(allDictionaryWords.flatMap(w => w.subject))];
  const grades = [...new Set(allDictionaryWords.flatMap(w => w.grades))].sort();
  subArea.innerHTML = "";
  subjects.forEach(sub => { subArea.innerHTML += `<button class="filter-btn" onclick="toggleSubject('${sub}', this)">📘 ${sub}</button>`; });
  gradeArea.innerHTML = "";
  grades.forEach(g => { gradeArea.innerHTML += `<button class="filter-btn" onclick="toggleGrade('${g}', this)">🎒 ${g}</button>`; });
}

function toggleSubject(subject, btnEl) {
  btnEl.classList.toggle('active'); 
  if (selectedSubjects.includes(subject)) {
    selectedSubjects = selectedSubjects.filter(s => s !== subject);
  } else {
    selectedSubjects.push(subject);
  }
  updateStatusAndFilter();
}

function toggleGrade(grade, btnEl) {
  btnEl.classList.toggle('active'); 
  if (selectedGrades.includes(grade)) {
    selectedGrades = selectedGrades.filter(g => g !== grade);
  } else {
    selectedGrades.push(grade);
  }
  updateStatusAndFilter();
}

function handleSearch() {
  updateStatusAndFilter();
}

function updateStatusAndFilter() {
  const searchText = document.getElementById('searchInput').value.trim();
  let msgParts = [];
  if (searchText) msgParts.push(`🔍 "${searchText}"`);
  if (selectedSubjects.length > 0) msgParts.push(`📂 [${selectedSubjects.join(', ')}]`);
  if (selectedGrades.length > 0) msgParts.push(`🎒 [${selectedGrades.join(', ')}]`);
  
  const statusMsg = document.getElementById('statusMsg');
  if (msgParts.length === 0) {
    statusMsg.textContent = "📚 카테고리를 선택하거나 단어를 검색해 주세요!";
    document.getElementById('fairyRoom').style.display = 'none';
    renderCatalogSections([]); 
    return;
  } else {
    statusMsg.textContent = msgParts.join(' + ') + " 결과";
    document.getElementById('fairyRoom').style.display = 'block';
  }

  const filtered = allDictionaryWords.filter(w => {
    const textMatch = searchText === "" || 
                      w.word.toLowerCase().includes(searchText.toLowerCase()) || 
                      w.meaning.toLowerCase().includes(searchText.toLowerCase());
    const subjectMatch = selectedSubjects.length === 0 || 
                         selectedSubjects.some(sub => w.subject.includes(sub));
    const gradeMatch = selectedGrades.length === 0 || 
                       selectedGrades.some(g => w.grades.includes(g));
    return textMatch && subjectMatch && gradeMatch;
  });
  renderCatalogSections(filtered);
}

function renderCatalogSections(wordsToRender) {
  const container = document.getElementById('librarySectionsContainer');
  const emptyMsg = document.getElementById('emptySearchMsg');
  container.innerHTML = "";
  if (wordsToRender.length === 0) {
    const searchActive = selectedSubjects.length > 0 || selectedGrades.length > 0 || document.getElementById('searchInput').value.trim() !== "";
    emptyMsg.style.display = searchActive ? 'block' : 'none'; return;
  }
  emptyMsg.style.display = 'none';
  const sectionsMap = {};
  wordsToRender.forEach(w => {
    const stageName = w.stage || "기본 단원";
    if (!sectionsMap[stageName]) sectionsMap[stageName] = [];
    sectionsMap[stageName].push(w);
  });
  Object.keys(sectionsMap).sort().forEach(stageName => {
    const sectionData = sectionsMap[stageName];
    const sectionDiv = document.createElement('div'); sectionDiv.className = 'stage-section';
    const header = document.createElement('div'); header.className = 'stage-header';
    header.textContent = isNaN(stageName) ? stageName : `${stageName}단원`;
    sectionDiv.appendChild(header);
    const grid = document.createElement('div'); grid.className = 'catalog-grid';
    sectionData.forEach(w => {
      let badgesHtml = '';
      if (w.grades.length > 0) badgesHtml += `<span class="badge grade">${w.grades[0]}</span>`;
      if (w.pos) badgesHtml += `<span class="badge pos">${w.pos}</span>`;
      const crownHtml = w.isAchieved ? `<div class="master-crown">👑</div>` : '';
      const masterClass = w.isAchieved ? 'mastered' : '';
      const card = document.createElement('div'); card.className = `word-card ${masterClass}`;
      card.innerHTML = `${crownHtml}<div class="badge-area">${badgesHtml}</div><div class="word-title">${w.word}</div>`;
      card.onclick = () => openModal(w); grid.appendChild(card);
    });
    sectionDiv.appendChild(grid); container.appendChild(sectionDiv);
  });
}

function openModal(wordData) {
  // 💡 모달 열 때 현재 과목을 전역에 설정 (보상 헬퍼가 이 값을 참조함)
  window.currentSubject = (wordData.subject && wordData.subject.length > 0) ? wordData.subject[0] : "사회";
  wordStartTime = Date.now(); // 단어 화면 진입 시간 기록

  document.getElementById('modalWordTitle').textContent = wordData.word;
  document.getElementById('modalMeaning').textContent = wordData.meaning;
  
  const imgEl = document.getElementById('modalImage');
  if (wordData.imageUrl) { 
    imgEl.src = wordData.imageUrl; 
    imgEl.style.display = 'block'; 
  } else { 
    imgEl.style.display = 'none'; 
  }
  
  const detailsGroup = document.getElementById('modalDetailsGroup');
  if (wordData.detailContext) {
    document.getElementById('modalDetailContext').innerHTML = wordData.detailContext.replace(/\n/g, '<br>');
    detailsGroup.style.display = 'block'; 
    detailsGroup.removeAttribute('open');
  } else { 
    detailsGroup.style.display = 'none'; 
  }
  
  document.getElementById('modalAudioBtn').onclick = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); 
      const utterance = new SpeechSynthesisUtterance(wordData.word);
      const isEnglish = /[a-zA-Z]/.test(wordData.word);
      utterance.lang = isEnglish ? 'en-US' : 'ko-KR';
      
      const voices = window.speechSynthesis.getVoices();
      const targetVoice = voices.find(voice => 
        isEnglish ? voice.lang.includes('en-US') : (voice.name.includes('Google') && voice.lang.includes('ko'))
      );
      if (targetVoice) utterance.voice = targetVoice;
      utterance.rate = 0.85; 
      window.speechSynthesis.speak(utterance);
    }
  };

  MODAL_CHAT_HISTORY = []; 
  document.getElementById('fairyChatArea').style.display = 'none';
  document.getElementById('fairyQuestion').value = '';
  document.getElementById('fairyAnswerBox').innerHTML = '<span style="color: #999;">궁금한 점을 적거나 마이크 버튼을 눌러 말해봐! ✨</span>';

  askFairyTeacher(wordData.word, wordData.meaning);

  const overlay = document.getElementById('wordModal'); 
  overlay.style.display = 'flex';
  setTimeout(() => overlay.classList.add('active'), 10);
}

function closeModal(event, force = false) {
  const overlay = document.getElementById('wordModal');
  if (force || event.target === overlay) { 
    if('speechSynthesis' in window) window.speechSynthesis.cancel(); 
    overlay.classList.remove('active'); 
    setTimeout(() => overlay.style.display = 'none', 300); 

    // 🏆 5초 이상 읽었을 때 보상 스택 누적 및 지급 로직
    if (wordStartTime > 0) {
        const timeSpent = (Date.now() - wordStartTime) / 1000;
        
        if (timeSpent >= 5) {
            viewedWordsCount++;
            console.log(`단어 학습 인정! 현재 스택: ${viewedWordsCount}/3`);
        } else {
            console.log("대장님, 너무 빨리 넘겼습니다! 도파민 지급 보류 ㅋㅋㅋ");
        }

        // 3스택 달성 시 노션 DB로 다이아 1개 최종 슛!
        if (viewedWordsCount >= 3) {
            if (typeof grantRewardAndShowUI === 'function') {
                grantRewardAndShowUI(1, false, 'voca'); // 1개 보상, voca 쌍끌이 모드
            }
            viewedWordsCount = 0; // 카운터 초기화
        }
        wordStartTime = 0; // 타이머 리셋
    }
  }
}

function toggleFairyVoice() {
  isFairyVoiceOn = !isFairyVoiceOn;
  const btn = document.getElementById("voiceToggleBtn");
  if (isFairyVoiceOn) {
    btn.innerHTML = "🔊 요정 소리 켜짐";
    btn.style.backgroundColor = "#4facfe";
  } else {
    btn.innerHTML = "🔇 요정 소리 꺼짐";
    btn.style.backgroundColor = "#95a5a6";
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }
}

function speakFairyText(htmlText) {
  if (!isFairyVoiceOn || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel(); 

  const cleanText = htmlText.replace(/<[^>]+>/g, '').replace(/🧚‍♀️ 코코 요정님:/g, '').trim();
  const utterance = new SpeechSynthesisUtterance(cleanText);
  const isEnglish = /[a-zA-Z]/.test(cleanText);
  utterance.lang = isEnglish ? 'en-US' : 'ko-KR';
  utterance.rate = 1.0; 

  const voices = window.speechSynthesis.getVoices();
  const targetVoice = voices.find(voice => 
    isEnglish ? voice.lang.includes('en-US') : (voice.name.includes('Google') && voice.lang.includes('ko'))
  );
  if (targetVoice) utterance.voice = targetVoice;
  window.speechSynthesis.speak(utterance);
}

function startVoiceInput() {
  const micBtn = document.getElementById('micBtn');
  const questionInput = document.getElementById('fairyQuestion');
  if (!questionInput) return;

  if (typeof setupDebouncedSTT === 'function') {
    setupDebouncedSTT({
      inputEl: questionInput,
      debounceMs: 1500,
      onStart: function() {
        micBtn.innerText = "👂 듣는중..";
        micBtn.style.transform = "scale(1.1)";
        micBtn.style.backgroundColor = "#e53e3e";
        micBtn.style.color = "white";
      },
      onEnd: function() {
        micBtn.innerText = "🎙️";
        micBtn.style.transform = "scale(1)";
        micBtn.style.backgroundColor = "#fbc2eb";
        micBtn.style.color = "var(--dark)";
      },
      onError: function(event) {
        console.error("음성 인식 오류:", event.error);
        micBtn.innerText = "🎙️";
        micBtn.style.backgroundColor = "#fbc2eb";
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
  const replyBox = document.getElementById('fairyReplyBox');
  replyBox.innerHTML = `⏳ 요정 코코가 <b>[${word}]</b>에 대해 생각하고 있어요. 조금만 기다려주세요...`;
  document.getElementById('fairyRoom').scrollIntoView({ behavior: 'smooth' });

  try {
    const response = await fetch(`${WORKER_PROXY_URL}/v1/chat/completions?type=ai`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        messages: [
          { role: "system", content: getVocaFairySystemPrompt(`주어진 단어와 뜻풀이를 아이들의 눈높이에 맞게 아주 쉽고, 흥미로운 비유를 들어서 3줄 이내로 다정하게 설명해 줘.`) },
          { role: "user", content: `단어: ${word}, 뜻풀이: ${meaning}. 이 단어에 대해 친절하게 설명해 줘!` }
        ]
      })
    });

    const data = await response.json();
    if (data.error) {
      if (data.error.code === 503) {
        throw new Error("지금 요정 나라에 질문하는 친구들이 너무 많아! 10초 뒤에 단어창을 다시 열어주렴! ✨");
      }
      throw new Error(data.error.message || "서버 응답 오류");
    }

    if (data.choices && data.choices[0]) {
      const replyHtml = data.choices[0].message.content.replace(/\n/g, '<br>');
      replyBox.innerHTML = `🧚‍♀️ <b>코코 요정님:</b><br>${replyHtml}`;
      speakFairyText(replyHtml);
    } else {
      throw new Error("요정의 응답 데이터 구조가 올바르지 않습니다.");
    }
  } catch (error) {
    console.error("요정 호출 실패:", error);
    replyBox.innerHTML = `😢 <b>코코 요정님:</b><br>${error.message}`;
  }
}

function toggleFairyBox() {
  const chatArea = document.getElementById("fairyChatArea");
  chatArea.style.display = chatArea.style.display === "none" ? "block" : "none";
}

async function askCocoFairy() {
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

  try {
    const response = await fetch(`${WORKER_PROXY_URL}/v1/chat/completions?type=ai`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemini-2.5-flash", 
        messages: [
          { role: "system", content: getVocaFairySystemPrompt() },
          ...MODAL_CHAT_HISTORY
        ]
      })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(()=>({}));
        if (response.status === 503 || errorData.error?.code === 503) {
            throw new Error("아이코! 요정 나라 우체통에 편지가 가득 찼나 봐! 5초 뒤에 [보내기] 버튼을 다시 꾹 눌러줘! ✉️✨");
        }
        throw new Error(errorData.error?.message || `통신 장애 (코드: ${response.status})`);
    }

    const data = await response.json();
    const reply = data.choices[0].message.content || data.reply || data.text;
    
    MODAL_CHAT_HISTORY.push({ role: "assistant", content: reply });

    const replyHtml = reply.replace(/\n/g, '<br>');
    answerBox.innerHTML = `🧚‍♀️ <b>코코 요정님:</b><br>${replyHtml}`;
    speakFairyText(replyHtml);

  } catch (error) {
    console.error(error);
    answerBox.innerHTML = `😢 <b>코코 요정님:</b><br>${error.message}`;
  }
}

// 엔터키 리스너 바인딩
setTimeout(() => {
  const qInput = document.getElementById("fairyQuestion");
  if(qInput) {
    qInput.addEventListener("keypress", function(event) {
      if (event.key === "Enter") {
        event.preventDefault();
        askCocoFairy();
      }
    });
  }
}, 500);
