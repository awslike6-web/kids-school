/**
 * 🚨 haru-safety-quiz.js
 * 초등 1-2 통합교과 '하루' - 119 안전 수호대 & 닥터 코코 응급처치 엔진
 * - 학교/가정/야외 생활 119 위기탈출 OX 퀴즈 및 친절한 피드백
 * - 황금 안전 지킴이 면허증 발급 & 축하 보너스 (+5)
 * - 닥터 코코 365 응급처치 증상별 가이드 및 부모 대시보드 안심 연동
 * - 노션 학습일지 DB 자동 전송
 */

(() => {
  let currentSafetyQuizIndex = 0;
  let currentActiveSymptomKey = "scrape";

  function getSafetyQuizList() {
    return window.HARU_DATA?.safetyStation?.oxQuizList || [];
  }

  // =========================================================
  // 1. 119 안전 수호대 OX 퀴즈
  // =========================================================
  function renderSafetyQuizQuestion(shouldSpeak = false) {
    const quizList = getSafetyQuizList();
    if (!quizList || quizList.length === 0) return;

    const placeTag = document.getElementById("safetyQuizPlaceTag");
    const progressTag = document.getElementById("safetyQuizProgressTag");
    const questionEl = document.getElementById("safetyQuestionText");
    const feedbackBox = document.getElementById("safetyQuizFeedbackBox");
    const licenseCard = document.getElementById("safetyLicenseCard");
    const oxGroup = document.getElementById("oxBtnGroup");

    if (licenseCard) licenseCard.style.display = "none";
    if (oxGroup) oxGroup.style.display = "grid";
    if (feedbackBox) feedbackBox.style.display = "none";

    const item = quizList[currentSafetyQuizIndex];
    if (!item) return;

    if (placeTag) placeTag.innerText = item.place;
    if (progressTag) progressTag.innerText = `문제 ${currentSafetyQuizIndex + 1} / ${quizList.length}`;
    if (questionEl) questionEl.innerText = item.question;

    if (shouldSpeak && typeof window.speakText === "function") {
      window.speakText(`${item.place} 안전 수칙이에요! ${item.question}`);
    }
  }

  function playSafetyQuizAudio() {
    const quizList = getSafetyQuizList();
    const item = quizList[currentSafetyQuizIndex];
    if (!item || typeof window.speakText !== "function") return;
    window.speakText(`${item.place} 안전 수칙이에요! ${item.question}`);
  }

  function handleSafetyQuizAnswer(userChoice) {
    const quizList = getSafetyQuizList();
    const item = quizList[currentSafetyQuizIndex];
    if (!item) return;

    const feedbackBox = document.getElementById("safetyQuizFeedbackBox");
    const feedbackTitle = document.getElementById("safetyFeedbackTitle");
    const feedbackDesc = document.getElementById("safetyFeedbackDesc");
    const nextBtn = document.getElementById("safetyQuizNextBtn");
    if (!feedbackBox || !feedbackTitle || !feedbackDesc) return;

    const isCorrect = userChoice === item.answer;

    feedbackBox.style.display = "block";
    feedbackBox.className = "quiz-feedback-box " + (isCorrect ? "correct" : "hint");

    if (isCorrect) {
      if (typeof window.playCoinSound === "function") window.playCoinSound();
      feedbackTitle.innerHTML = `<span>✨</span> <span>참 잘했어요! 완벽한 안전 수칙이에요!</span>`;
      feedbackDesc.innerText = item.explain;
      if (typeof window.speakText === "function") {
        window.speakText(`딩동댕! ${item.explain}`);
      }
    } else {
      feedbackTitle.innerHTML = `<span>💡</span> <span>코코의 안전 힌트! 이렇게 하면 더 안전해요:</span>`;
      feedbackDesc.innerText = item.explain + (item.tip ? ` (${item.tip})` : "");
      if (typeof window.speakText === "function") {
        window.speakText(`괜찮아! ${item.explain}`);
      }
    }

    const isLast = currentSafetyQuizIndex >= quizList.length - 1;
    if (nextBtn) {
      nextBtn.innerText = isLast ? "🏆 황금 안전 지킴이 면허증 받기! ➔" : "다음 안전 수칙으로 ➔";
    }
  }

  function nextSafetyQuizQuestion() {
    const quizList = getSafetyQuizList();
    if (currentSafetyQuizIndex < quizList.length - 1) {
      currentSafetyQuizIndex++;
      renderSafetyQuizQuestion(true);
    } else {
      renderSafetyLicense();
    }
  }

  function renderSafetyLicense() {
    const feedbackBox = document.getElementById("safetyQuizFeedbackBox");
    const licenseCard = document.getElementById("safetyLicenseCard");
    const oxGroup = document.getElementById("oxBtnGroup");
    const questionEl = document.getElementById("safetyQuestionText");
    const progressTag = document.getElementById("safetyQuizProgressTag");

    if (feedbackBox) feedbackBox.style.display = "none";
    if (oxGroup) oxGroup.style.display = "none";
    if (questionEl) questionEl.innerText = "🎉 축하합니다! 모든 안전 수칙을 완벽하게 마스터했어요!";
    if (progressTag) progressTag.innerText = "미션 완료 🏅";

    if (licenseCard) {
      licenseCard.style.display = "block";
      const dateEl = document.getElementById("licenseIssueDate");
      if (dateEl) {
        dateEl.innerText = new Date().toISOString().slice(0, 10);
      }
    }

    if (typeof window.playCoinSound === "function") window.playCoinSound();
    const child = window.currentChild || "minseo";
    const childTitle = child === "minsu" ? "민수" : "민서";
    const rewardName = child === "minsu" ? "다이아 5개" : "젤리 5개";

    if (typeof window.speakText === "function") {
      window.speakText(`축하합니다! ${childTitle} 어린이가 119 황금 안전 지킴이 면허증을 획득했어요! 보너스 ${rewardName}를 선물로 드립니다!`);
    }
    if (typeof window.grantReward === "function") {
      window.grantReward(5, "119 안전 수호대 면허증 취득 보너스");
    }

    sendSafetyLicenseToNotion();
  }

  function restartSafetyQuiz() {
    currentSafetyQuizIndex = 0;
    renderSafetyQuizQuestion(true);
  }

  // =========================================================
  // 2. 🩺 닥터 코코 365 응급처치 상담소
  // =========================================================
  function selectFirstAidSymptom(key) {
    currentActiveSymptomKey = key;
    document.querySelectorAll(".symptom-chip").forEach(chip => {
      chip.classList.toggle("active", chip.dataset.symptom === key);
    });
    renderFirstAidGuide(key);
  }

  function renderFirstAidGuide(key) {
    const guides = window.HARU_DATA?.safetyStation?.firstAidGuides;
    if (!guides || !guides[key]) return;

    const guide = guides[key];
    const resultCard = document.getElementById("firstAidResultCard");
    const iconEl = document.getElementById("firstAidIcon");
    const titleEl = document.getElementById("firstAidTitle");
    const badgeEl = document.getElementById("firstAidBadge");
    const cocoSpeech = document.getElementById("cocoVoiceSpeechText");
    const stepsList = document.getElementById("firstAidStepsList");
    const timeTag = document.getElementById("parentNotifiedTimeTag");

    if (iconEl) iconEl.innerText = guide.icon;
    if (titleEl) titleEl.innerText = guide.title;
    if (badgeEl) badgeEl.innerText = guide.badge;
    if (cocoSpeech) cocoSpeech.innerText = `"${guide.cocoSay}"`;

    if (stepsList && guide.steps) {
      stepsList.innerHTML = guide.steps.map(s => `
        <div class="firstaid-step-item">
          <div class="step-num-bubble">${s.step}</div>
          <div class="step-info">
            <div class="step-title">${s.title}</div>
            <div class="step-desc">${s.desc}</div>
          </div>
        </div>
      `).join("");
    }

    const nowTime = new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
    if (timeTag) timeTag.innerText = nowTime;

    if (resultCard) {
      resultCard.style.display = "block";
      resultCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    if (typeof window.speakText === "function") {
      window.speakText(guide.cocoSay);
    }

    const child = window.currentChild || "minseo";
    const todayStr = typeof window.getTodayDateStr === "function" ? window.getTodayDateStr() : new Date().toISOString().slice(0, 10);
    const consultationLog = {
      key: guide.id,
      title: guide.title,
      icon: guide.icon,
      badge: guide.badge,
      date: todayStr,
      time: nowTime,
      cocoSay: guide.cocoSay
    };
    localStorage.setItem("haru_last_safety_consultation_" + child, JSON.stringify(consultationLog));

    sendSafetyConsultationToNotion(guide);
  }

  function playCurrentFirstAidVoice() {
    const guides = window.HARU_DATA?.safetyStation?.firstAidGuides;
    if (guides && guides[currentActiveSymptomKey] && typeof window.speakText === "function") {
      window.speakText(guides[currentActiveSymptomKey].cocoSay);
    }
  }

  function consultDoctorCocoCustom() {
    const input = document.getElementById("customSymptomInput");
    if (!input) return;
    const q = input.value.trim();
    if (!q) {
      if (typeof window.speakText === "function") {
        window.speakText("어디가 어떻게 다쳤는지 적어주세요!");
      }
      return;
    }

    let matchedKey = "scrape";
    if (q.includes("부딪") || q.includes("혹") || q.includes("멍") || q.includes("이마")) {
      matchedKey = "bump";
    } else if (q.includes("데였") || q.includes("뜨거") || q.includes("화상") || q.includes("물집")) {
      matchedKey = "burn";
    } else if (q.includes("코피") || (q.includes("피가") && q.includes("코"))) {
      matchedKey = "nosebleed";
    } else if (q.includes("벌레") || q.includes("모기") || q.includes("가려") || q.includes("물렸")) {
      matchedKey = "bugbite";
    } else if (q.includes("눈") || q.includes("모래") || q.includes("먼지")) {
      matchedKey = "eye";
    }

    selectFirstAidSymptom(matchedKey);
  }

  // =========================================================
  // 3. 노션 학습일지 연동
  // =========================================================
  async function sendSafetyLicenseToNotion() {
    const proxyUrl = typeof PROXY_URL !== "undefined" ? PROXY_URL : "https://minmin-notion.awslike6.workers.dev";
    const dbId = typeof STUDY_LOG_DB_ID !== "undefined" ? STUDY_LOG_DB_ID : "37aa27115b688001b2ffe5e6c8f82ab2";
    const child = window.currentChild || "minseo";
    const childTitle = child === "minseo" ? "민서" : "민수";
    const todayStr = typeof window.getTodayDateStr === "function" ? window.getTodayDateStr() : new Date().toISOString().slice(0, 10);
    const timeStr = new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
    const nowIso = new Date().toISOString();

    const payload = {
      parent: { database_id: dbId },
      properties: {
        "ID": {
          title: [{ text: { content: `${childTitle}_${todayStr} [119 안전수호대] 황금 지킴이 면허증 취득` } }]
        },
        "학생": { select: { name: childTitle } },
        "과목": { rich_text: [{ text: { content: "하루" } }] },
        "입장": { date: { start: nowIso } },
        "퇴장": { date: { start: nowIso } },
        "오답리포트": {
          rich_text: [{
            text: {
              content: `[119 안전 수호대 완주 인증]\n• 획득: 황금 안전 지킴이 면허증 발급 🏆\n• 항목: 학교 복도, 계단, 횡단보도, 날카로운 도구, 놀이터 안전 수칙 6문항 100% 마스터\n• 시간: ${timeStr}\n• 보상: 보너스 +5개 획득`
            }
          }]
        },
        "소요시간": { number: 3 },
        "단어요정": { number: 0 }
      }
    };

    try {
      await fetch(`${proxyUrl}/v1/pages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0" },
        body: JSON.stringify(payload)
      });
    } catch(e) {}
  }

  async function sendSafetyConsultationToNotion(guide) {
    const proxyUrl = typeof PROXY_URL !== "undefined" ? PROXY_URL : "https://minmin-notion.awslike6.workers.dev";
    const dbId = typeof STUDY_LOG_DB_ID !== "undefined" ? STUDY_LOG_DB_ID : "37aa27115b688001b2ffe5e6c8f82ab2";
    const child = window.currentChild || "minseo";
    const childTitle = child === "minseo" ? "민서" : "민수";
    const todayStr = typeof window.getTodayDateStr === "function" ? window.getTodayDateStr() : new Date().toISOString().slice(0, 10);
    const timeStr = new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
    const nowIso = new Date().toISOString();

    const payload = {
      parent: { database_id: dbId },
      properties: {
        "ID": {
          title: [{ text: { content: `${childTitle}_${todayStr} [🚨 닥터 코코 상담] ${guide.title}` } }]
        },
        "학생": { select: { name: childTitle } },
        "과목": { rich_text: [{ text: { content: "하루" } }] },
        "입장": { date: { start: nowIso } },
        "퇴장": { date: { start: nowIso } },
        "오답리포트": {
          rich_text: [{
            text: {
              content: `[닥터 코코 365 안심 응급상담]\n• 증상: ${guide.icon} ${guide.title} (${guide.badge})\n• 처치안내: ${guide.cocoSay}\n• 시간: ${timeStr}\n• 부모 대시보드 실시간 알림 연동 완료`
            }
          }]
        },
        "소요시간": { number: 1 },
        "단어요정": { number: 0 }
      }
    };

    try {
      await fetch(`${proxyUrl}/v1/pages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0" },
        body: JSON.stringify(payload)
      });
    } catch(e) {}
  }

  // =========================================================
  // 전역 네임스페이스 바인딩 (100% 하위 호환성)
  // =========================================================
  window.getSafetyQuizList = getSafetyQuizList;
  window.renderSafetyQuizQuestion = renderSafetyQuizQuestion;
  window.playSafetyQuizAudio = playSafetyQuizAudio;
  window.handleSafetyQuizAnswer = handleSafetyQuizAnswer;
  window.nextSafetyQuizQuestion = nextSafetyQuizQuestion;
  window.renderSafetyLicense = renderSafetyLicense;
  window.restartSafetyQuiz = restartSafetyQuiz;
  window.selectFirstAidSymptom = selectFirstAidSymptom;
  window.renderFirstAidGuide = renderFirstAidGuide;
  window.playCurrentFirstAidVoice = playCurrentFirstAidVoice;
  window.consultDoctorCocoCustom = consultDoctorCocoCustom;
  window.sendSafetyLicenseToNotion = sendSafetyLicenseToNotion;
  window.sendSafetyConsultationToNotion = sendSafetyConsultationToNotion;

  window.HaruSafetyQuizEngine = {
    renderSafetyQuizQuestion,
    handleSafetyQuizAnswer,
    nextSafetyQuizQuestion,
    selectFirstAidSymptom,
    consultDoctorCocoCustom
  };
})();
