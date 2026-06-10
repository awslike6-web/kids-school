// notion-helper.js (완벽 교정본)

const PROXY_URL = "https://minmin-notion.awslike6.workers.dev";
const STUDY_LOG_DB_ID = "37aa27115b688001b2ffe5e6c8f82ab2"; 

/**
 * 아버님의 새로운 노션 DB 구조에 맞춰 학습 일지를 생성하는 함수
 */
async function sendStudyLogToNotion({ childName, subject, startTime, endTime, durationMinutes, errorReport, wordFairyCount = 0 }) {
    console.log(`🚀 [학습일지 배달 시작] 학생: ${childName} | 과목: ${subject}`);

    try {
        const payload = {
            parent: { database_id: STUDY_LOG_DB_ID },
            properties: {
                // 1. ID (유형: 제목)
                "ID": { 
                    title: [{ text: { content: `${childName}_${new Date().toLocaleDateString()}` } }] 
                },
                // 2. 학생 (유형: 선택)
                "학생": { 
                    select: { name: childName } 
                },
                // 3. 과목 (유형: 선택)
                "과목": { 
                    select: { name: subject } 
                },
                // 4. 입장 (유형: 날짜)
                "입장": { 
                    date: { start: startTime } 
                },
                // 5. 퇴장 (유형: 날짜)
                "퇴장": { 
                    date: { start: endTime } 
                },
                // 6. 소요시간 (유형: 숫자)
                "소요시간": { 
                    number: durationMinutes 
                },
                // 7. 오답리포트 (유형: 텍스트)
                "오답리포트": { 
                    rich_text: [{ text: { content: errorReport || "오답 없음" } }] 
                },
                // 8. 단어요정 (유형: 숫자)
                "단어요정": { 
                    number: wordFairyCount 
                }
            }
        };

        // 🌟 keepalive 옵션과 중괄호 구조를 깔끔하게 정돈했습니다!
        const response = await fetch(`${PROXY_URL}/v1/pages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            keepalive: true 
        });

        if (!response.ok) throw new Error(`노션 통신 오류 (상태: ${response.status})`);

        console.log("🎉 노션에 학습 일지가 완벽하게 기록되었습니다!");
        return true;
    } catch (error) {
        console.error("학습일지 전송 실패:", error);
        return false;
    }
}
