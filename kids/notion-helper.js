// notion-helper.js

const PROXY_URL = "https://minmin-notion.awslike6.workers.dev";
const STUDY_LOG_DB_ID = "여기에_학습일지_DB_ID를_넣어주세요"; 

/**
 * 아버님의 새로운 노션 DB 구조에 맞춰 학습 일지를 생성하는 함수
 * @param {string} childName - '민수' 또는 '민서'
 * @param {string} subject - '수학(덧셈)', '국어(문장)' 등 아버님이 정하신 과목명
 * @param {string} startTime - 입장 시간 (ISO String 문자열)
 * @param {string} endTime - 퇴장 시간 (ISO String 문자열)
 * @param {number} durationMinutes - 소요시간 (분)
 * @param {string} errorReport - 오답리포트 내용
 * @param {number} wordFairyCount - 단어요정 개수 (기본값 0)
 */
async function sendStudyLogToNotion({ childName, subject, startTime, endTime, durationMinutes, errorReport, wordFairyCount = 0 }) {
    console.log(`🚀 [학습일지 배달 시작] 학생: ${childName} | 과목: ${subject}`);

    try {
        const payload = {
            parent: { database_id: STUDY_LOG_DB_ID },
            properties: {
                // 1. ID (유형: 제목 / Title) - 노션의 필수 기본 컬럼입니다.
                "ID": { 
                    title: [{ text: { content: `${childName}_${new Date().toLocaleDateString()}` } }] 
                },
                // 2. 학생 (유형: 선택 / Select) - '민수' 또는 '민서'
                "학생": { 
                    select: { name: childName } 
                },
                // 3. 과목 (유형: 선택 / Select) - 예: '수학(덧셈)'
                "과목": { 
                    select: { name: subject } 
                },
                // 4. 입장 (유형: 날짜 / Date)
                "입장": { 
                    date: { start: startTime } 
                },
                // 5. 퇴장 (유형: 날짜 / Date)
                "퇴장": { 
                    date: { start: endTime } 
                },
                // 6. 소요시간 (유형: 숫자 / Number)
                "소요시간": { 
                    number: durationMinutes 
                },
                // 7. 오답리포트 (유형: 텍스트 / Rich Text)
                "오답리포트": { 
                    rich_text: [{ text: { content: errorReport || "오답 없음" } }] 
                },
                // 8. 단어요정 (유형: 숫자 / Number)
                "단어요정": { 
                    number: wordFairyCount 
                }
            }
        };

        const response = await fetch(`${PROXY_URL}/v1/pages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
keepalive: true // 👈 창이 닫혀도 끝까지 노션 서버에 데이터를 도달하게 만드는 마법의 옵션!
});
        });

        if (!response.ok) throw new Error(`노션 통신 오류 (상태: ${response.status})`);

        console.log("🎉 노션에 학습 일지가 완벽하게 기록되었습니다!");
        return true;
    } catch (error) {
        console.error("학습일지 전송 실패:", error);
        return false;
    }
}
