// ==========================================
// 🧩 민민이네 공부방 3대 통합 데이터 도감 (fairy-settings-catalog.js)
// 새 목소리, BGM, 테마 스킨, 요정 코코 녹음 음성이 생기면 이 파일의 목록에 항목 하나만 추가하면 됩니다.
// (fairy-engine.js가 이 목록을 직접 읽으므로 엔진 코드는 고치지 않습니다)
// ==========================================

/**
 * 1. 🎙️ 목소리 페르소나 도감 (Voice Personas)
 * - id: 고유 식별자
 * - name: 설정창에 표시될 이름
 * - badge: 뱃지 태그 (인기, 신규, 기본 등)
 * - desc: 캐릭터 한 줄 설명
 * - previewFile: 미리듣기용 음성 파일 (kids/ 기준 경로)
 * - target: 노출·사용 대상 ('son' | 'daughter' | 'all'). 다른 아이에게 설정이 남아 있어도 이 아이에게만 나옴
 * - voiceDir: 해당 캐릭터의 전용 음성 폴더명 (kids/assets/voices/{voiceDir}/)
 * - files: 상황별 파일 개수. 파일 이름은 {voiceDir}_{상황}_{01~}.wav
 *     welcome(첫인사·미리듣기) · correct(정답) · wrong(오답) · clear(완주) · hint(힌트 열기)
 *   files가 없으면 '준비중'으로 보고 설정창에서 고를 수 없음 (기본 요정 목소리 사용)
 *
 * ➕ 새 목소리 추가: 음성 파일 13개(welcome 1·correct 5·wrong 4·clear 1·hint 2)를 폴더에 넣고
 *    아래 목록에 files를 채운 항목을 추가 (음성 생성: master-tower scripts/generate_gemini_voices.py)
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
        voiceDir: "tease",
        files: { welcome: 1, correct: 5, wrong: 4, clear: 1, hint: 2 }
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
        voiceDir: "snarky",
        files: { welcome: 1, correct: 5, wrong: 4, clear: 1, hint: 2 }
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

/**
 * 4. 🧚 요정 코코 녹음 음성 목록 (기본·대체 목소리, assets/sounds/fairy/ 기준 파일 이름)
 * - fairy-engine.js가 이 목록만 보고 고른다: 칭찬(praises)·응원(encourages)은 무작위, 나머지는 이름으로
 * - 캐릭터 목소리가 없거나 그 상황 파일이 없으면 이 목록으로 돌아온다
 * ➕ 새 코코 음성: mp3를 assets/sounds/fairy/에 넣고 아래에 한 줄 추가 (칭찬·응원은 배열에 추가). 엔진은 고치지 않는다
 *    시험 tests/fairy-tts.test.mjs가 목록의 파일이 모두 있는지 확인한다
 */
var FAIRY_AUDIO_PRESETS = {
    // 1. 환영 인사 & 과목 입장 (8종)
    welcome_lobby: "fairy_welcome_lobby.mp3",
    welcome_minsu: "fairy_welcome_minsu.mp3",
    welcome_minseo: "fairy_welcome_minseo.mp3",
    welcome_math: "fairy_welcome_math.mp3",
    welcome_korean: "fairy_welcome_korean.mp3",
    welcome_society: "fairy_welcome_society.mp3",
    welcome_science: "fairy_welcome_science.mp3",
    welcome_english: "fairy_welcome_english.mp3",

    // 2. 정답 & 칭찬 풀 (10종)
    praises: [
        "fairy_praise_1.mp3", "fairy_praise_2.mp3", "fairy_praise_3.mp3", "fairy_praise_4.mp3", "fairy_praise_5.mp3",
        "fairy_praise_6.mp3", "fairy_praise_7.mp3", "fairy_praise_8.mp3", "fairy_praise_9.mp3", "fairy_praise_10.mp3"
    ],

    // 3. 오답 & 응원/힌트 풀 (8종)
    encourages: [
        "fairy_encourage_1.mp3", "fairy_encourage_2.mp3", "fairy_encourage_3.mp3", "fairy_encourage_4.mp3",
        "fairy_encourage_5.mp3", "fairy_encourage_6.mp3", "fairy_encourage_7.mp3", "fairy_encourage_8.mp3"
    ],

    // 4. 퀘스트 완료 & 레벨업 & 보상 (6종)
    quest_complete: "fairy_quest_complete.mp3",
    level_up: "fairy_level_up.mp3",
    reward_diamond: "fairy_reward_diamond.mp3",
    reward_star: "fairy_reward_star.mp3",
    study_finish: "fairy_study_finish.mp3",
    streak_bonus: "fairy_streak_bonus.mp3",

    // 5. 시작 & 집중 (4종)
    focus_start: "fairy_focus_start.mp3",
    ready_go: "fairy_ready_go.mp3",
    think_careful: "fairy_think_careful.mp3",
    hint_open: "fairy_hint_open.mp3",

    // 6. 예전 이름 → 위 이름 (화면 코드가 옛 이름으로 불러도 같은 파일)
    aliases: {
        welcome_math_minsu: "welcome_minsu",
        welcome_math_minseo: "welcome_minseo"
    }
};
