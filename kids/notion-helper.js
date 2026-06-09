// notion-helper.js

// 아버님이 구축해두신 완벽한 프리패스 프록시 주소
const PROXY_URL = "https://minmin-notion.awslike6.workers.dev";

// ⚠️ 아버님 노션에 새로 만드신 '아이들학습일지DB'의 ID를 여기에 넣어주세요!
const STUDY_LOG_DB_ID = "여기에_학습일지_DB_ID를_넣어주세요"; 

/**
 * 학습 일지를 노션으로 전송하는 범용 함수
 * @param {string} childName - 아이 이름 ('민수' 또는 '민서')
 * @param {string} subject - 과목명 ('국어', '수학' 등)
 * @param {number} durationMinutes - 방에 머문 학습 시간 (분)
 * @param {string} errorReport - 오답 내용 또는 학습 요약
 */
async function sendStudyLogToNotion(childName, subject, durationMinutes, errorReport) {
    if (!childName || !subject) {
        console.error("이름과 과목은 필수입니다!");
        return false;
    }

    console.log(`🚀 [학습일지 전송 준비] ${childName} - ${subject}`);

    try {
        const payload = {
            // 새 페이지를 생성(POST)할 때는 parent로 데이터베이스 ID를 지정합니다.
            parent: { database_id: STUDY_LOG_DB_ID },
            properties: {
                // 노션 DB 컬럼 속성에 맞춰서 매핑합니다.
                // 1. "이름" 컬럼 (유형: 제목 / Title)
                "이름": { 
                    title: [{ text: { content: childName } }] 
                },
                // 2. "과목" 컬럼 (유형: 선택 / Select)
                "과목": { 
                    select: { name: subject } 
                },
                // 3. "학습 시간" 컬럼 (유형: 숫자 / Number)
                "학습 시간": { 
                    number: durationMinutes 
                },
                // 4. "오답 리포트" 컬럼 (유형: 텍스트 / Rich Text)
                "오답 리포트": { 
                    rich_text: [{ text: { content: errorReport || "오답 없음" } }] 
                },
                // 5. "제출일시" 컬럼 (유형: 날짜 / Date) - 현재 시간 자동 기록
                "제출일시": { 
                    date: { start: new Date().toISOString() } 
                }
            }
        };

        const response = await fetch(`${PROXY_URL}/v1/pages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`통신 실패 (상태 코드: ${response.status})`);
        }

        console.log("🎉 학습일지 노션 기록 완료!");
        return true; // 성공 시 true 반환

    } catch (error) {
        console.error("학습일지 전송 중 오류 발생:", error);
        return false; // 실패 시 false 반환
    }
}