// 📄 kids/config.js (민민이네 공부방 가문별 환경변수 및 코어 엔진 통제소)

const APP_CONFIG = {
    // 🔄 [핵심] 순정/개조 하이브리드 제어 스위치
    // true: 아빠 PM의 최신 코어 엔진을 실시간으로 다운로드하여 구동합니다. (자동 업데이트 모드 - 코딩 초보자 권장)
    // false: 내 깃허브(로컬)에 있는 core 폴더의 파일을 직접 참조하여 구동합니다. (독립 커스텀 모드 - 얼리어답터 권장)
    useRemoteCore: false, 

    // 🌐 아빠 PM의 마스터 깃허브 주소 (useRemoteCore가 true일 때 여기서 코어를 가져옵니다)
    // 🚨 (아버님의 실제 깃허브 페이지 루트 주소로 변경해 주세요!)
    MASTER_REPO_URL: "https://minmin-papa.github.io/kids-school", 

    // 📡 노션 API 프록시 주소 (각 가정에서 구축한 클라우드플레어 워커 주소 입력)
    WORKER_PROXY_URL: "https://minmin-notion.awslike6.workers.dev",

    // 🗄️ 노션 데이터베이스 ID 세팅
    INVENTORY_DB_ID: "374a27115b688042bb61e6a102242e12", // 인벤토리(보상/경험치) 창고 ID
    VOCA_DB_ID: "375a27115b688038b686d3994ee12919",      // 용어사전/받아쓰기 데이터베이스 ID

    // 👦👧 자녀 프로필 세팅 (조카들에게 분양 시 아이 이름과 나이에 맞게 수정하세요!)
    CHILDREN: {
        first: { 
            name: '민수', 
            id: 'son', 
            age: 10,                 // 나이 추가 (향후 난이도 분배 등에 활용)
            defaultTheme: '마인크래프트' // 기본 화면 테마
        },
        second: { 
            name: '민서', 
            id: 'daughter', 
            age: 8, 
            defaultTheme: '슬라임' 
        }
    }
};

// ============================================================================
// 🚀 [시스템 로직] 코어 엔진 동적 로더 (수정 금지!)
// HTML 파일들이 이 함수를 호출하여 스위치(useRemoteCore) 상태에 따라 부품을 조립합니다.
// ============================================================================
function loadCoreScripts(localBasePath, scripts, onComplete) {
    let loadedCount = 0;
    
    // 스위치 판별: true면 마스터 레포에서, false면 현재 내 폴더(localBasePath)에서 가져옴
    const basePath = APP_CONFIG.useRemoteCore
        ? APP_CONFIG.MASTER_REPO_URL + "/kids/core/"
        : localBasePath;

    if (scripts.length === 0 && onComplete) {
        onComplete();
        return;
    }

    scripts.forEach(scriptName => {
        const script = document.createElement('script');
        script.src = basePath + scriptName;
        script.async = false; // 부품이 순서대로 조립되도록 강제 보장 (매우 중요)
        
        script.onload = () => {
            loadedCount++;
            if (loadedCount === scripts.length && onComplete) {
                onComplete(); // 부품 조립이 다 끝나면 실행할 함수
            }
        };
        script.onerror = () => console.error(`[엔진 오류] ${scriptName} 로드 실패. 경로를 확인하세요: ${script.src}`);
        
        document.head.appendChild(script);
    });
}