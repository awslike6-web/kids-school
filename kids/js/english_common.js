// ==========================================================
// ⚙️ 민민이네 영어 멀티버스 코어 운영 엔진 V1.2 (단원/학년 속성 완벽 대응)
// (Voca, Phonics, Reading, Grammar 공통 사용)
// ==========================================================

window.currentSubject = "영어"; // 전역 과목명 명시 (보상 및 학습일지 타겟용)

// 🚨 관제탑과 오답 가방(수레) 완벽 공유 (학습 일지 전송용)
window.engWrongNotes = window.engWrongNotes || []; 

// ==========================================
// 🗣️ 1. 원어민 음성 출력 엔진 (TTS)
// ==========================================
function speakEnglish(text) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel(); 
    
    const utterance = new SpeechSynthesisUtterance(text);
    // 미국 영어 원어민 발음 셋팅
    utterance.lang = 'en-US'; 
    // 아이들이 듣기 편하게 속도 조절 (기본값 1.0)
    utterance.rate = 0.85; 
    
    window.speechSynthesis.speak(utterance);
  } else {
    console.warn("이 기기에서는 음성 지원(TTS)이 되지 않습니다.");
  }
}

// ==========================================
// 🤖 2. 코코 요정 AI 두뇌 (독해방/문법방 대비용)
// ==========================================
async function askCocoFairyAI(systemPrompt, userText, history = []) {
    const conversation = [...history, { role: "user", parts: [{ text: userText }] }];
    
    try {
        const response = await fetch(`${PROXY_URL}/v1/gemini`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                system_instruction: { parts: [{ text: systemPrompt }] },
                contents: conversation,
                generationConfig: { temperature: 0.7 }
            })
        });

        if (!response.ok) throw new Error("AI 엔진 오류");
        
        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error("코코 요정 호출 실패:", error);
        return "앗! 코코 요정이 잠시 마법 지팡이를 잃어버렸어요. 다시 물어봐 줄래요?";
    }
}
