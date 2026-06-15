// ==========================================
// 🇺🇸 원어민 음성 출력 엔진 (파닉스, 퀴즈 공통)
// ==========================================
function speakEnglish(text) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel(); // 기존에 읽고 있던 소리 끊기
    
    const utterance = new SpeechSynthesisUtterance(text);
    // 한국어(ko-KR) 대신 미국 영어(en-US)로 설정
    utterance.lang = 'en-US'; 
    
    // 아이들이 듣기 편하게 속도를 살짝 늦춰줍니다 (기본값 1.0)
    utterance.rate = 0.85; 
    
    window.speechSynthesis.speak(utterance);
  } else {
    console.warn("이 브라우저에서는 음성 지원이 안 됩니다.");
  }
}