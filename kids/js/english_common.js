// ==========================================================
// ⚙️ 민민이네 영어 멀티버스 코어 운영 엔진 V1.2 (단원/학년 속성 완벽 대응)
// (Voca, Phonics, Reading, Grammar 공통 사용)
// ==========================================================

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
// 📡 2. 노션 데이터베이스 고속 스캔 엔진
// ==========================================
async function fetchEnglishNotionData(dbId, subjectFilter = "영어") {
    let allResults = []; 
    let hasMore = true; 
    let nextCursor = undefined;

    try {
        while (hasMore) {
            const bodyData = { page_size: 100 };
            if (nextCursor) bodyData.start_cursor = nextCursor;
            
            // 💡 notion-helper.js의 PROXY_URL을 공통으로 사용
            const response = await fetch(`${PROXY_URL}/v1/databases/${dbId}/query`, {
                method: "POST", 
                headers: { "Content-Type": "application/json" }, 
                body: JSON.stringify(bodyData)
            }); 
            
            if (!response.ok) throw new Error(`서버 통신 붕괴 (코드: ${response.status})`);

            const data = await response.json();
            allResults = allResults.concat(data.results);
            hasMore = data.has_more; 
            nextCursor = data.next_cursor;
        }

        // 영어 과목 데이터만 예쁘게 정제해서 반환
        return allResults.map(page => {
            const p = page.properties;
            return {
                id: page.id,
                word: p["단어"]?.title[0]?.plain_text || "",
                meaning: p["뜻풀이"]?.rich_text[0]?.plain_text || p["뜻"]?.rich_text[0]?.plain_text || "",
                subject: p["과목"]?.multi_select?.map(item => item.name) || [],
                type: p["어휘유형"]?.select?.name || "",
                
                // 💡 [강력해진 필터 1] 단원이 숫자, 단일선택, 다중선택, 일반 텍스트 중 무엇이든 찾아옵니다!
                level: p["단원"]?.number || p["단원"]?.select?.name || p["단원"]?.multi_select?.[0]?.name || p["단원"]?.rich_text?.[0]?.plain_text || "기본",
                
                // 💡 [강력해진 필터 2] 학년 역시 다중선택, 단일선택, 일반 텍스트 모두 대응합니다!
                grade: p["학년"]?.multi_select?.[0]?.name || p["학년"]?.select?.name || p["학년"]?.rich_text?.[0]?.plain_text || "공통"
            };
        }).filter(w => w.word !== "" && (w.subject.includes(subjectFilter) || w.subject.includes("영단어")));

    } catch (error) {
        console.error("영어 노션 엔진 스캔 실패:", error);
        return []; 
    }
}

// ==========================================
// 🤖 3. 코코 요정 AI 두뇌 (독해방/문법방 대비용)
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
