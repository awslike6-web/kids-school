// kids/korean-reading-logic.js
// 🎯 정밀독해 멀티버스 전용 순수 게임 플레이 로직

function initReadingGame() {
    console.log("📚 정밀독해 데이터 인양 완료:", readingData);
    
    // 관제탑에 채워져 있는 현재 사용자 정보에 따라 맞춤 데이터 렌더링
    const targetUser = (currentProfile === 'son') ? '민수' : '민서';
    console.log(`${targetUser} 전용 독해 지문을 화면에 그립니다.`);
    
    // 국어방 제작팀이 만든 지문 배치 및 퀴즈 출제 로직 스타트구역
    // (예: document.getElementById('reading-arena').innerHTML = ... )
}

// 아이들이 문제를 풀다 틀렸을 때 호출하는 오답 수집기 개조
function handleReadingWrongAnswer(problemText) {
    // 🔒 관제탑 공용 가방(wrongNotes)에 오답 단어나 지문명을 적립합니다.
    if (!wrongNotes.includes(problemText)) {
        wrongNotes.push(problemText);
    }
    console.log(`❌ 오답 감지 블랙박스 적립 완료: ${problemText}`);
}

// 게임이 최종적으로 끝났을 때 자동으로 퇴근 정산 처리하는 트리거
function finishReadingGame() {
    alert("🎉 오늘 준비된 독해 지문을 전부 완벽하게 읽었습니다!");
    // 관제탑의 출고 시스템 가동
    exitRoom("국어(빈칸퀴즈)");
}

// 게임 기동
window.addEventListener('DOMContentLoaded', () => {
    initReadingGame();
});