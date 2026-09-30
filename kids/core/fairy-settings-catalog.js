// ==========================================
// 🧩 민민이네 공부방 3대 통합 데이터 도감 (fairy-settings-catalog.js)
// 새 목소리, BGM, 테마 스킨이 생기면 이 파일의 목록에 1줄만 추가하면 됩니다.
// ==========================================

/**
 * 1. 🎙️ 목소리 페르소나 도감 (Voice Personas)
 * - id: 고유 식별자
 * - name: 설정창에 표시될 이름
 * - badge: 뱃지 태그 (인기, 신규, 기본 등)
 * - desc: 캐릭터 한 줄 설명
 * - previewFile: 미리듣기용 음성 파일 (assets/voices/ 경로 기준)
 * - target: 노출 대상 ('son' | 'daughter' | 'all')
 * - voiceDir: 해당 캐릭터의 전용 음성 폴더명
 */
var VOICE_CATALOG = [
    // 🧚 기본 공통 목소리
    {
        id: "default",
        name: "🧚 표준 요정 코코",
        badge: "기본",
        desc: "차분하고 다정한 표준 AI 안내 목소리",
        previewFile: "assets/sounds/fairy/fairy_welcome_lobby.mp3",
        target: "all",
        voiceDir: null // 기본 fairy-engine 프리셋 사용
    },
    // 😜 민수 전용: 깐죽이 친구 (Gemini 3.8 Flash 커스텀 보이스)
    {
        id: "tease_minsu",
        name: "😜 깐죽이 친구",
        badge: "인기",
        desc: "푸헤헤~ 또 틀렸대요! 장난기 넘치고 얄미운 친구 톤",
        previewFile: "assets/voices/tease/tease_welcome_01.wav",
        target: "son",
        voiceDir: "tease"
    },
    // 😭 민수 전용: 엄살쟁이 슬라임 (추후 음원 추가용)
    {
        id: "whine_minsu",
        name: "😭 엄살쟁이 슬라임",
        badge: "준비중",
        desc: "흑흑... 이 어려운 걸 어떻게 풀어어... 세상 억울한 톤",
        previewFile: null,
        target: "son",
        voiceDir: "whine"
    },
    // 😼 민서 전용: 깍쟁이 마법고양이
    {
        id: "snarky_minseo",
        name: "😼 깍쟁이 마법고양이",
        badge: "새침",
        desc: "흥! 내가 모르는 건 아니지만 언니가 먼저 풀어봐~",
        previewFile: "assets/voices/snarky/snarky_welcome_01.wav",
        target: "daughter",
        voiceDir: "snarky"
    },
    // 🐣 민서 전용: 껌딱지 아기새
    {
        id: "clingy_minseo",
        name: "🐣 껌딱지 아기새",
        badge: "애교",
        desc: "언니 최고! 나 언니만 믿을게~ 도와줘!",
        previewFile: null,
        target: "daughter",
        voiceDir: "clingy"
    },
    // 👨 가족 공통: 다정한 아빠 목소리
    {
        id: "dad_voice",
        name: "👨 다정한 아빠",
        badge: "스페셜",
        desc: "민수야 민서야, 틀려도 괜찮아! 아빠가 항상 응원해!",
        previewFile: null,
        target: "all",
        voiceDir: "dad"
    }
];

/**
 * 2. 🎵 BGM 플레이리스트 도감 (BGM Tracks)
 * - id: 고유 식별자
 * - name: 설정창에 표시될 이름
 * - desc: 분위기 설명
 * - file: 오디오 파일명 (assets/sounds/bgm/ 기준)
 */
var BGM_CATALOG = [
    {
        id: "off",
        name: "🔇 배경음악 끄기",
        desc: "조용하게 집중해서 문제 풀기",
        file: null
    },
    {
        id: "lofi_study",
        name: "🎧 따뜻한 로파이 공부방",
        desc: "차분하고 포근한 어쿠스틱 비트",
        file: "assets/sounds/bgm/lofi_study.mp3",
        badge: "추천"
    },
    {
        id: "pixel_adventure",
        name: "👾 8비트 모험 테마",
        desc: "게임하듯 신나는 레트로 사운드",
        file: "assets/sounds/bgm/pixel_adventure.mp3"
    },
    {
        id: "mozart_focus",
        name: "🎻 집중 쑥쑥 모차르트",
        desc: "두뇌가 맑아지는 클래식 소품곡",
        file: "assets/sounds/bgm/mozart_focus.mp3"
    }
];

/**
 * 3. 🎨 테마 스킨 도감 (Theme Skins)
 * - id: 고유 식별자
 * - name: 테마 이름
 * - icon: 대표 아이콘
 * - bodyClass: <body> 태그에 적용될 CSS 클래스명
 */
var THEME_CATALOG = [
    {
        id: "default",
        name: "🌿 기본 초록숲",
        icon: "🌿",
        bodyClass: "theme-default"
    },
    {
        id: "minecraft",
        name: "🟩 마인크래프트",
        icon: "🟩",
        bodyClass: "theme-minecraft"
    },
    {
        id: "pokemon",
        name: "⚡ 찌릿찌릿 포켓몬",
        icon: "⚡",
        bodyClass: "theme-pokemon"
    },
    {
        id: "pastel",
        name: "🌸 달콤 파스텔",
        icon: "🌸",
        bodyClass: "theme-pastel"
    },
    {
        id: "dark",
        name: "🌙 편안한 다크",
        icon: "🌙",
        bodyClass: "theme-dark"
    }
];
