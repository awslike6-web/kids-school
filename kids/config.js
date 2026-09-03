// 📄 kids/config.js (민민이네 공부방 가문별 환경변수 및 코어 엔진 통제소)

var APP_CONFIG = {
    // 🔄 [핵심] 순정/개조 하이브리드 제어 스위치
    // true: 아빠 PM의 최신 코어 엔진을 실시간으로 다운로드하여 구동합니다. (자동 업데이트 모드 - 코딩 초보자 권장)
    // false: 내 깃허브(로컬)에 있는 core 폴더의 파일을 직접 참조하여 구동합니다. (독립 커스텀 모드 - 얼리어답터 권장)
    useRemoteCore: false, 

    // 🌐 아빠 PM의 마스터 깃허브 주소 (useRemoteCore가 true일 때 여기서 코어를 가져옵니다)
    // 🚨 (아버님의 실제 깃허브 페이지 루트 주소로 변경해 주세요!)
    MASTER_REPO_URL: "https://minmin-papa.github.io/kids-school", 

    // 📡 노션 API 프록시 주소 (각 가정에서 구축한 클라우드플레어 워커 주소 입력)
    WORKER_PROXY_URL: "https://minmin-notion.awslike6.workers.dev",

    // 🤖 Gemini AI 직접 연결 키 (워커 프록시 지역 차단 시 초고속 다이렉트 폴백)
    GEMINI_API_KEY: (typeof atob !== 'undefined' ? atob("QVEuQWI4Uk42THNkaHRLRWFqZk0xU2w0UGpmQ19hUTdJTzR0RXdsWWdtbXJvakpKZFdtcHc=") : ""),

    // 🎙️ [초고음질 요정 보이스] OpenAI TTS 세팅 (스튜디오 성우급 더빙)
    OPENAI_API_KEY: (typeof localStorage !== 'undefined' && localStorage.getItem('OPENAI_API_KEY')) || "",
    OPENAI_TTS_VOICE: (typeof localStorage !== 'undefined' && localStorage.getItem('OPENAI_TTS_VOICE')) || "nova", // nova(발랄함) | shimmer(맑고 다정함) | alloy | echo | fable | onyx
    OPENAI_TTS_MODEL: "tts-1", // 실시간 초저지연 모델 (tts-1)
    OPENAI_TTS_SPEED: 1.06,    // 아이들이 듣기 편안한 요정 낭독 속도

    // 🗄️ 노션 데이터베이스 ID 세팅
    INVENTORY_DB_ID: "374a27115b688042bb61e6a102242e12", // 인벤토리(보상/경험치) 창고 ID
    STUDY_LOG_DB_ID: "37aa27115b688001b2ffe5e6c8f82ab2", // 학습현황(일지) DB ID
    VOCA_DB_ID: "375a27115b688038b686d3994ee12919",      // 용어사전/받아쓰기 데이터베이스 ID
    NOTION_CHAT_MEMORY_DB_ID: "373a27115b6880ba82cdfeaa1c825547", // AI 대화 기억 보관소 DB ID
    STATIC_TIMETABLE_DB_ID: "32ba27115b68828bbda201a1bdce12fc", // 🏛️ 아이들 고정 시간표 DB (학기 1회 입력)
    EVENT_OVERLAY_DB_ID: "e3f9b3917c2b48bfa3d47db4bd0545fd",    // 📢 학사일정 및 알림장 DB (동적 이벤트 오버레이)
    TIMETABLE_DB_ID: "e3f9b3917c2b48bfa3d47db4bd0545fd",        // 레거시 호환 ID

    // 🏰 Master Tower 종합 관제탑 (아빠 프로필 전용)
    MASTER_TOWER_URL: "https://awslike6-web.github.io/master-tower/",

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
    },

    // 💎🍬 보상 재화 설정 (민수=다이아, 민서=하리보 젤리)
    REWARD: {
        son: {
            notionProperty: '다이아몬드 개수',
            label: '다이아몬드',
            icon: '💎',
            theme: '마인크래프트'
        },
        daughter: {
            // 노션 컬럼명: 새 이름으로 바꿔도 되고, 기존 '슬라임 파츠 개수' 그대로 둬도 동작함
            notionProperties: ['하리보 젤리 개수', '슬라임 파츠 개수'],
            label: '하리보 젤리',
            icon: '🍬',
            image: 'assets/images/haribo-pink.jpeg',
            theme: '슬라임'
        }
    }
};

function getRewardConfigByTheme(theme) {
    return theme === APP_CONFIG.REWARD.son.theme ? APP_CONFIG.REWARD.son : APP_CONFIG.REWARD.daughter;
}

function getRewardConfigByProfile(profileKey) {
    return profileKey === 'son' || profileKey === APP_CONFIG.CHILDREN.first.id
        ? APP_CONFIG.REWARD.son
        : APP_CONFIG.REWARD.daughter;
}

function getDaughterRewardCount(props) {
    const propsList = APP_CONFIG.REWARD.daughter.notionProperties;
    for (let i = 0; i < propsList.length; i++) {
        const val = props[propsList[i]]?.number;
        if (val != null) return val;
    }
    return 0;
}

function getDaughterRewardPropertyName(props) {
    const propsList = APP_CONFIG.REWARD.daughter.notionProperties;
    if (props) {
        for (let i = 0; i < propsList.length; i++) {
            if (props[propsList[i]] !== undefined) return propsList[i];
        }
    }
    return propsList[propsList.length - 1];
}

function getRewardCount(props, theme) {
    if (theme === APP_CONFIG.REWARD.son.theme) {
        return props[APP_CONFIG.REWARD.son.notionProperty]?.number || 0;
    }
    return getDaughterRewardCount(props);
}

function getRewardPropertyForUpdate(props, theme) {
    if (theme === APP_CONFIG.REWARD.son.theme) return APP_CONFIG.REWARD.son.notionProperty;
    return getDaughterRewardPropertyName(props);
}

function getRewardDisplayLabel(theme) {
    const cfg = getRewardConfigByTheme(theme);
    return cfg.icon + ' ' + cfg.label;
}

function getRewardWealthHtml(theme, count, imageBasePath) {
    imageBasePath = imageBasePath || '';
    if (theme === APP_CONFIG.REWARD.son.theme) {
        return APP_CONFIG.REWARD.son.icon + ' <span>x' + count + '</span>';
    }
    const imgPath = imageBasePath + APP_CONFIG.REWARD.daughter.image;
    return '<img src="' + imgPath + '" alt="' + APP_CONFIG.REWARD.daughter.label + '" class="reward-currency-img"> <span style="color:#E84393;">x' + count + '</span>';
}

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
        // 이미 로드된 스크립트 중복 추가 방지
        const alreadyLoaded = Array.from(document.scripts).some(s => s.src.includes(scriptName));
        if (alreadyLoaded) {
            console.log(`[엔진 최적화] ${scriptName} 은(는) 이미 로드되어 건너뜁니다.`);
            loadedCount++;
            if (loadedCount === scripts.length && onComplete) onComplete();
            return;
        }

        const script = document.createElement('script');
        const cacheBuster = `?v=20260828_${Date.now()}`;
        script.src = basePath + scriptName + cacheBuster;
        script.async = false; // 부품이 순서대로 조립되도록 강제 보장 (매우 중요)
        
        script.onload = () => {
            loadedCount++;
            if (loadedCount === scripts.length && onComplete) {
                onComplete(); // 부품 조립이 다 끝나면 실행할 함수
            }
        };
        script.onerror = () => {
            console.error(`[엔진 오류] ${scriptName} 로드 실패. 경로를 확인하세요: ${script.src}`);
            // 오류가 나도 다음 스크립트 로드나 완료 콜백이 막히지 않도록 처리
            loadedCount++;
            if (loadedCount === scripts.length && onComplete) onComplete();
        };
        
        document.head.appendChild(script);
    });
}
