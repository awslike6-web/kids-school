/*
 * 민민 시스템 조감도 데이터 (minmin_system_map.html 전용)
 *
 * - 손으로 관리하는 구간: window.SYSTEM_MAP_DATA (도메인 · 카드 · 연결선 · 증상 카드)
 * - 자동 갱신 구간: AUTO-SYNC 표식 사이의 window.SYSTEM_MAP_AUTO
 *   `python scripts/sync_agent_skills.py`가 CORE_CATALOG.md 변경 시각과 스킬 frontmatter로 다시 씁니다. 직접 고치지 마세요.
 * - 카드 path는 master-tower 루트 기준 경로입니다. (공부방 파일은 kids-school-main/ 으로 시작)
 * - 카드 설명·가드레일은 핵심만 3줄 이내로 유지합니다. 문자열에 큰따옴표(")를 넣지 마세요 (복사 버튼 속성이 깨짐).
 */
window.SYSTEM_MAP_DATA = {
  lastUpdated: "",
  domains: [
    { key: "quest", label: "🎯 5분 퀘스트" },
    { key: "korean", label: "📖 국어 & 독해" },
    { key: "math", label: "🧮 수학" },
    { key: "english", label: "🔤 영어" },
    { key: "science", label: "🔬 과학" },
    { key: "society", label: "🗺️ 사회" },
    { key: "haru", label: "🎒 하루" },
    { key: "guardian", label: "🛡️ 진도판 · 보상 · 가디언" },
    { key: "tower", label: "🏰 관제탑 라이프로그" },
    { key: "daycare", label: "🧸 보육비서" }
  ],
  nodes: [
    // ───────── [1열: 입력 원천 & 스크립트] ─────────
    {
      id: "src_reg_korean", col: "source", domain: ["korean", "quest"], badge: "Python CLI",
      title: "register_minseo_korean.py", path: "kids-school-main/scripts/register_minseo_korean.py",
      summary: "학교 받아쓰기 문장 조회(--show-dictation) 및 정제 어휘·미니독해 시드 JSON을 노션에 일괄 등록",
      guardrails: [
        "미리보기 실행 후 이상 없을 때만 --apply 플래그로 실제 반영",
        "기존 학생·단원·단어가 있으면 숙련도·달성은 건드리지 않고 내용만 갱신",
        "Python에서 Worker 호출 시 User-Agent 필수 (없으면 403), 콘솔은 python -X utf8 사용"
      ],
      agentPrompt: "minseo-korean-unit 스킬 절차를 따라서 kids-school-main/scripts/register_minseo_korean.py로 새 단원 시드 JSON을 미리보기 검증해줘."
    },
    {
      id: "src_audio_korean", col: "source", domain: ["korean"], badge: "Audio Builder",
      title: "build_mini_reading_audio.py", path: "kids-school-main/scripts/build_mini_reading_audio.py",
      summary: "미니 독해 지문과 발문을 Edge-TTS로 합성하여 SHA-1 해시 파일명 mp3 생성",
      guardrails: ["노션에서 미니 독해 지문을 고친 뒤에도 반드시 다시 실행해야 함",
        "화면 읽기 규칙(korean_mini_reading.js)과 스크립트의 clip_texts 규칙을 반드시 함께 수정"],
      agentPrompt: "노션 LIBRARY_DB에서 수정된 민서 미니 독해 지문에 맞춰 build_mini_reading_audio.py를 돌려 누락된 mp3를 생성해줘."
    },
    {
      id: "src_reg_reading", col: "source", domain: ["korean", "english"], badge: "Python CLI",
      title: "register_reading_passage.py", path: "scripts/register_reading_passage.py",
      summary: "지문·문제를 LIBRARY_DB에 등록하고 지문 속 속담·사자성어·개념어를 VOCA_DB에 자동 분리 적재",
      guardrails: ["2,000자 초과 지문은 1,900자 청크로 자동 분할 (노션 rich_text 한도)",
        "노션 장애 시 reading_passages_cache.json에 보존 후 --sync-pending으로 재전송"],
      agentPrompt: "scripts/register_reading_passage.py로 새 독해 지문을 등록하고, 실패해 대기 중인 지문이 있으면 --sync-pending으로 반영해줘."
    },
    {
      id: "src_math_migrate", col: "source", domain: ["math"], badge: "Python CLI",
      title: "migrate_math_to_curriculum.py", path: "scripts/migrate_math_to_curriculum.py",
      summary: "수학 교재 사료·단원 퀴즈·문장제 지시어 88제를 CURRICULUM_DB(구역: 지시어번역)에 일괄 적재",
      guardrails: ["math_voca_data.js 캐시와 노션 CURRICULUM_DB 내용이 어긋나지 않게 함께 갱신",
        "교재 사진은 EXIF 회전 보정과 육안 검수 후에만 등록 (없으면 공란)"],
      agentPrompt: "math_spec.md를 읽고 scripts/migrate_math_to_curriculum.py로 수학 지시어·퀴즈가 CURRICULUM_DB와 일치하는지 점검해줘."
    },
    {
      id: "src_eng_voca", col: "source", domain: ["english", "quest"], badge: "Python CLI",
      title: "insert_eng_l*_voca.py (단원별)", path: "scripts/insert_eng_l10_voca.py",
      summary: "영어 단원별 핵심 어휘·클래스카드 문장을 VOCA_DB(과목=영어, 학년 5-2)에 등록",
      guardrails: ["단원마다 스크립트를 복사하지 말고 기존 스크립트 구조를 재사용",
        "학년·학생·단원 속성이 빠지면 진도판 칩과 5분방 출제에서 누락됨"],
      agentPrompt: "english_spec.md와 notion_schemas_school.md의 VOCA_DB 스키마를 확인한 뒤 영어 새 단원 어휘 등록 스크립트를 미리보기로 점검해줘."
    },
    {
      id: "src_society_quiz", col: "source", domain: ["society"], badge: "Python CLI",
      title: "society_quiz_generator.py", path: "kids-school-main/scripts/society_quiz_generator.py",
      summary: "사회 사료·도표·문화재 4지선다 퀴즈를 생성해 CURRICULUM_DB(구역: 역사사료·자료분석)에 적재",
      guardrails: ["교과서에 맞는 독립 사료 사진이 없으면 이미지 칸은 반드시 공란",
        "크롭 이미지는 EXIF 회전 보정 후 방향·객체·문제 일치를 육안 검수"],
      agentPrompt: "society_spec.md 기준으로 society_quiz_generator.py가 만든 사료 퀴즈의 이미지와 정답이 일치하는지 점검해줘."
    },
    {
      id: "src_build_storybook", col: "source", domain: ["korean", "math", "english", "science", "society"], badge: "Builder CLI",
      title: "build_storybook.py", path: "scripts/build_storybook.py",
      summary: "지문·삽화로 2200x1700 양면 펼침면 합성, Edge-TTS 오디오, 75줄 표준 뷰어 HTML을 한 번에 생성",
      guardrails: ["(이미지: …)·[컷 연출: …] 같은 지문 찌꺼기는 화면과 TTS에서 모두 제거",
        "삽화 장면·화면 글·오디오 대본은 한 글자도 어긋나면 안 됨"],
      agentPrompt: "kids-school-main/GEMINI.md §3 스토리북 프로토콜대로 scripts/build_storybook.py로 새 동화책을 빌드해줘."
    },
    {
      id: "src_verify_quest", col: "source", domain: ["quest", "korean"], badge: "Node Test",
      title: "verify_quest_mastery.js", path: "kids-school-main/scripts/verify_quest_mastery.js",
      summary: "3·3·3 마스터리 엔진 스테이지 분할, 은/금메달 승급, 빈칸 보기 생성 단위 검증",
      guardrails: ["엔진 로직 수정 후 반드시 node scripts/verify_quest_mastery.js 전부 PASS 확인"],
      agentPrompt: "node kids-school-main/scripts/verify_quest_mastery.js를 실행해서 3·3·3 마스터리 엔진 테스트가 모두 PASS하는지 확인해줘."
    },
    {
      id: "src_verify_sci", col: "source", domain: ["science"], badge: "Python Test",
      title: "verify_science_unit.py", path: "scripts/verify_science_unit.py",
      summary: "과학 단원 800줄 상한, 탐구 보고서 필수 스키마, 서술형 빌더 빈칸 매칭 무결성 검증",
      guardrails: ["단원 제작/수정 완료 후 python -X utf8 scripts/verify_science_unit.py --unit N 실행 필수"],
      agentPrompt: "master-tower 루트에서 python -X utf8 scripts/verify_science_unit.py --unit 3 을 실행해 과학 단원 스키마와 줄 수 제한을 검증해줘."
    },
    {
      id: "src_sync_skills", col: "source", domain: ["quest", "korean", "science", "guardian"], badge: "Master CLI",
      title: "sync_agent_skills.py", path: "kids-school-main/scripts/sync_agent_skills.py",
      summary: ".agent/skills 원본을 .claude/skills 사본에 복사하고, 이 조감도의 기준일·스킬 카드 요약을 자동 갱신 (루트 스크립트가 먼저 호출)",
      guardrails: [".claude/skills/는 사본이므로 직접 수정 금지. 반드시 .agent/skills 원본 수정 후 동기화 실행",
        "커밋 전 --check 통과 필수 (스킬 요약이 원본과 다르면 실패)"],
      agentPrompt: "python scripts/sync_agent_skills.py --check 를 실행해 스킬 원본·사본과 시스템 조감도 요약이 일치하는지 점검해줘."
    },
    {
      id: "src_dev_log", col: "source", domain: ["tower", "guardian"], badge: "Notion CLI",
      title: "log_dev_timeline.py & manage_study_board.py", path: "scripts/log_dev_timeline.py",
      summary: "작업 완료 후 개발 타임라인·당일 일상 DB·통합 개발 현황판 칸반을 한 번에 갱신",
      guardrails: ["커밋·푸시 후 --board-card 과제명 --board-status 완료 지정",
        "같은 날 같은 주제는 새 카드 대신 기존 카드에 누적, 장애는 [장애분석/개선] 카드 필수"],
      agentPrompt: "작업 완료 후 python -X utf8 scripts/log_dev_timeline.py로 개발 타임라인과 현황판 카드를 갱신해줘."
    },
    {
      id: "src_lifelog_cli", col: "source", domain: ["tower"], badge: "Python CLI",
      title: "라이프로그 3대 CLI (운동·병원·차량)", path: "scripts/log_workout.py",
      summary: "log_workout.py · sync_medical_upload.py · sync_car_upload.py로 운동·진료 서류·정비 사진을 노션과 family-data에 등록",
      guardrails: ["모든 기록은 당일 일상 기록 DB(392a…)와 양방향 relation 연결 필수",
        "의료·차량 원본은 비공개 family-data 저장소에만 보관 (공개 저장소 금지)"],
      agentPrompt: "docs/lifelog_spec.md를 읽고 alluploads에 올린 서류를 scripts/sync_medical_upload.py로 등록하고 당일 일상 DB 연결을 확인해줘."
    },
    {
      id: "src_daycare_tools", col: "source", domain: ["daycare"], badge: "Node Tools",
      title: "verify_connections.mjs & 운영 도구", path: "daycare-helper/scripts/verify_connections.mjs",
      summary: "가상 원아로 노션 메모 저장·조회·원아 연결을 검증하고, 관리자 초대·AI 연결 점검 도구 제공",
      guardrails: ["옵션 없이 실행하면 실제 AI 호출까지 하므로 --notion-only 등 범위 옵션 우선",
        "초대 링크·키·해시는 문서·Git·채팅에 남기지 않음"],
      agentPrompt: "daycare-helper/docs/daycare_spec.md를 읽고 node scripts/verify_connections.mjs --memo-only로 메모 저장 경로를 검증해줘."
    },

    // ───────── [2열: 로컬 AI 스킬 & 명세] ─────────
    {
      id: "skill_quest", col: "skill", skill: "quest-engine-spec", domain: ["quest", "guardian", "english", "society"], badge: "Skill",
      title: "quest-engine-spec", path: ".agent/skills/quest-engine-spec/SKILL.md",
      summary: "(자동 갱신) 5분 퀘스트 3·3·3 마스터리 엔진 규격",
      guardrails: [
        "엔진(quest-mastery.js)은 절대 DOM을 직접 만지지 않음",
        "당일 count 6 도달 시 은메달 고정, 익일 Lv.3(6~8) 거쳐 9 도달 시 금메달(달성=true)",
        "오답 시 경고음/하트 차감 없이 fairyEncourage 격려 음성만 출력"
      ],
      agentPrompt: "quest-engine-spec 스킬과 CORE_CATALOG.md §2-2를 먼저 읽고 5분 퀘스트 3·3·3 규칙에 맞춰 점검해줘."
    },
    {
      id: "skill_korean", col: "skill", skill: "minseo-korean-unit", domain: ["korean", "quest"], badge: "Skill",
      title: "minseo-korean-unit", path: ".agent/skills/minseo-korean-unit/SKILL.md",
      summary: "(자동 갱신) 민서 국어 단원 추가 절차",
      guardrails: [
        "받아쓰기 행은 절대 수정 금지, 정제 어휘에 받아쓰기 태그 혼용 금지",
        "상세설명 예문 내 [활용형]은 표제어와 첫 글자가 같아야 Lv.2 빈칸으로 작동",
        "미니 독해 문제는 반드시 step 1(낱말) -> 2(인물 마음/말풍선) -> 3(중심생각) 3문항 구성"
      ],
      agentPrompt: "minseo-korean-unit 스킬을 읽고 민서 국어 단원 어휘 및 미니 독해 지문 추가 절차를 준비해줘."
    },
    {
      id: "skill_science", col: "skill", skill: "science-unit-builder", domain: ["science"], badge: "Skill",
      title: "science-unit-builder", path: ".agent/skills/science-unit-builder/SKILL.md",
      summary: "(자동 갱신) 과학 단원 가상 실험실 & 탐구 보고서 제작 규격",
      guardrails: [
        "단순 어휘 빈칸 끼워넣기(용어방 복제) 절대 금지 -> rubric + 서술형 문장 조립 빌더 필수",
        "모바일 스크롤과 충돌하는 touchmove 드래그 금지 -> 스팟 버튼/토글/슬라이더 클릭 방식 사용",
        "모든 파일 절대 상한 800줄 미만 유지 및 science.html 스크립트 ?v= 버전 갱신"
      ],
      agentPrompt: "science-unit-builder 스킬과 science_lab_data.js의 3단원 골드 스탠다드를 참고해서 과학 단원 작업을 진행해줘."
    },
    {
      id: "doc_catalog", col: "skill", domain: ["quest", "korean", "math", "english", "science", "society", "haru", "guardian"], badge: "SSOT Doc",
      title: "CORE_CATALOG.md (공통 부품 도감)", path: "kids-school-main/kids/core/CORE_CATALOG.md",
      summary: "전 과목 JS 모듈의 전역 API, 메서드 시그니처, 파일 역할을 정의한 단일 원천 도감",
      guardrails: ["스킬 설명과 실제 코드가 다를 경우 항상 CORE_CATALOG.md와 실제 코드가 우선함",
        "모듈 수정 시 CORE_CATALOG.md와 해당 과목 spec 문서를 반드시 함께 최신화"],
      agentPrompt: "kids-school-main/kids/core/CORE_CATALOG.md 에서 관련 모듈의 전역 API 시그니처를 먼저 확인해줘."
    },
    {
      id: "doc_korean_spec", col: "skill", domain: ["korean"], badge: "Spec Doc",
      title: "korean_spec.md (국어방 명세)", path: "kids-school-main/docs/korean_spec.md",
      summary: "국어 멀티버스 5단계(동화·받아쓰기·어휘·미니독해·AI 토론)와 민수 핀포인트 독해 규격",
      guardrails: ["민서 미니 독해와 민수 reading_engine.js는 데이터·화면을 공유하지 않는 병렬 모듈",
        "받아쓰기(과목=받아쓰기)와 국어 어휘(과목=국어) 태그 혼합 금지"],
      agentPrompt: "kids-school-main/docs/korean_spec.md와 CORE_CATALOG.md §2-3, §2-7을 읽고 국어방 작업 범위를 정리해줘."
    },
    {
      id: "doc_math_spec", col: "skill", domain: ["math"], badge: "Spec Doc",
      title: "math_spec.md (수학방 명세)", path: "kids-school-main/docs/math_spec.md",
      summary: "수학방 3대 관문, 단원 개념 탐험관, 무한 난수 암산(generateDynamicMentalMath)·계산 메모장 규격",
      guardrails: ["연산 문제는 정적 4지선다 대신 무한 난수로 출제 (나눗셈은 나누어떨어짐 보장)",
        "분수는 정품 세로분수 렌더러(renderFrac·renderMixed)만 사용"],
      agentPrompt: "kids-school-main/docs/math_spec.md §6과 CORE_CATALOG.md §2-1을 읽고 수학 퀘스트 출제 규칙을 점검해줘."
    },
    {
      id: "doc_english_spec", col: "skill", domain: ["english"], badge: "Spec Doc",
      title: "english_spec.md (영어방 명세)", path: "kids-school-main/docs/english_spec.md",
      summary: "영어 멀티버스 6단계(동화·단어 퐁당·파닉스·문장 조립·독해·AI 회화)와 Jenny 0.85x 음성 규격",
      guardrails: ["영어 음성은 speakEnglish(en-US-JennyNeural, 0.85x)만 사용, speechSynthesis 직접 호출 금지",
        "파닉스 한글 발음 디딤돌은 단어 아래 1:1 수직 정렬 유지"],
      agentPrompt: "kids-school-main/docs/english_spec.md와 CORE_CATALOG.md §2-4를 읽고 영어방 단계별 모듈을 점검해줘."
    },
    {
      id: "doc_society_spec", col: "skill", domain: ["society"], badge: "Spec Doc",
      title: "society_spec.md (사회방 명세)", path: "kids-school-main/docs/society_spec.md",
      summary: "사회 탐험방 5단계(동화·용어·도표·지도·문화재)와 사료 이미지 무결성 규격",
      guardrails: ["사료·유물 사진은 없으면 공란, 있으면 EXIF 보정과 육안 검수 필수",
        "용어 3회 정답 시 노션 [달성] 연동 규칙 유지"],
      agentPrompt: "kids-school-main/docs/society_spec.md와 CORE_CATALOG.md §2-6을 읽고 사회방 작업 범위를 정리해줘."
    },
    {
      id: "doc_haru_spec", col: "skill", domain: ["haru"], badge: "Spec Doc",
      title: "haru_spec.md (하루방 명세)", path: "kids-school-main/docs/haru_spec.md",
      summary: "슬기로운 하루 5대 탭(습관 체크인·시계판·안전·추억·감상실)과 민수/민서 프로필 분기 규격",
      guardrails: ["탭 전환 시 이전 낭독 음성은 stopAllSpeech로 즉시 정지",
        "체크인·일과 완성 기록은 STUDY_LOG_DB로 비동기 전송"],
      agentPrompt: "kids-school-main/docs/haru_spec.md와 CORE_CATALOG.md §2-8을 읽고 하루방 모듈 구조를 점검해줘."
    },
    {
      id: "doc_lifelog_spec", col: "skill", domain: ["tower"], badge: "Spec Doc",
      title: "lifelog_spec.md (라이프로그 명세)", path: "docs/lifelog_spec.md",
      summary: "운동·병원·차량 3대 라이프로그, 일상 기록 DB 중심 6중 relation, Bio·Lifelog 대시보드 규격",
      guardrails: ["웹 프론트(index.html, js/, css/) 수정 후 즉시 커밋·푸시해야 Cloudflare 배포에 반영",
        "공부방·금융 봇 코드는 이 도메인에서 수정 금지"],
      agentPrompt: "docs/lifelog_spec.md를 읽고 라이프로그 대시보드와 노션 6중 relation 구조를 점검해줘."
    },
    {
      id: "doc_daycare_spec", col: "skill", domain: ["daycare"], badge: "Spec Doc",
      title: "daycare_spec.md & 보육 CORE_CATALOG", path: "daycare-helper/docs/daycare_spec.md",
      summary: "어린이집 교사용 7종 서식 생성, 원시 메모 자동 저장, 원아 연결, 기기·PIN 인증 규격",
      guardrails: ["원아 실명은 가명화 후에만 AI로 전달, 사진은 노션에 보관하지 않음",
        "브라우저는 AI 키를 받지 않음 (/api/gemini-key는 410)"],
      agentPrompt: "daycare-helper/docs/daycare_spec.md와 docs/CORE_CATALOG.md를 읽고 보육비서 작업 범위를 정리해줘."
    },

    // ───────── [3열: 프론트 모듈 & 스타일] ─────────
    {
      id: "mod_quest_mastery", col: "module", domain: ["quest", "korean", "english"], badge: "Core JS",
      title: "quest-mastery.js", path: "kids-school-main/kids/subjects/quest/quest-mastery.js",
      summary: "3·3·3 스테이지 분할, 슬롯 1~5번 문제 편성, 은/금메달/녹슨왕관 판정, 빈칸 보기 생성 순수 엔진",
      guardrails: ["순수 로직 모듈로 유지 (DOM 조작 금지, 800줄 미만 엄수)",
        "한글 낱말 상세설명에 [활용형]이 있으면 usageInDetail로 Lv.2 빈칸 출제"],
      agentPrompt: "kids/subjects/quest/quest-mastery.js의 출제 슬롯 배분과 빈칸 생성 로직을 확인해줘."
    },
    {
      id: "mod_quest_runner", col: "module", domain: ["quest", "guardian"], badge: "Runner JS & UI",
      title: "quest-runner.js & ui-renderer.js", path: "kids-school-main/kids/subjects/quest/quest-runner.js",
      summary: "quest_runner.html의 화면 흐름 제어, 에러리스 4대 UI(choice_audio, match_3x3, fill_blank, scramble) 렌더링",
      guardrails: ["완주 시 grantRewardAndShowUI(3, true), sendStudyLogToNotion, StudyActivity 호출 시그니처 절대 변경 금지",
        "URL에 ?engine=classic을 붙이면 기존 4+1 엔진으로 폴백 작동"],
      agentPrompt: "quest-runner.js와 quest-ui-renderer.js에서 화면 렌더링 및 완주 보상 호출 흐름을 점검해줘."
    },
    {
      id: "mod_quest_classic", col: "module", domain: ["quest", "math"], badge: "Quest JS",
      title: "quest_engine.js & quest_notion_synth.js", path: "kids-school-main/kids/subjects/quest/quest_engine.js",
      summary: "수학·사료/실험 퀴즈용 4+1 출제 엔진과 노션 4지선다 합성기, 무한 난수 암산 generateDynamicMentalMath",
      guardrails: ["1~3번 학교 진도, 4번 망각곡선 복습, 5번 비밀 맛보기(하트 차감 없음) 슬롯 규칙 유지",
        "VOCA 어휘 단원은 3·3·3 엔진이 우선, 이 엔진은 수학·사료·민서 정적 뱅크 전용"],
      agentPrompt: "quest_engine.js의 4+1 슬롯 편성과 generateDynamicMentalMath 난수 생성 범위를 math_spec.md 기준으로 점검해줘."
    },
    {
      id: "mod_parent_chips", col: "module", domain: ["quest", "korean", "guardian"], badge: "Parent UI",
      title: "parent_unit_chips.js", path: "kids-school-main/kids/subjects/quest/parent_unit_chips.js",
      summary: "부모 진도 관리판에서 학생별(민수 최대 4개, 민서 최대 10개) 다중 단원 칩 선택 및 묶음 출제 제어",
      guardrails: ["VOCA 캐시의 '학생' 속성으로 민수/민서 칩을 분리하므로 신규 단원 등록 시 학생 속성 누락 주의",
        "단원명에 쉼표가 있을 수 있으므로 URL 전달 시 쉼표가 아닌 '|' 구분자 사용"],
      agentPrompt: "parent_unit_chips.js에서 학생별 단원 칩 필터링과 다중 단원 묶음 규칙을 확인해줘."
    },
    {
      id: "mod_korean_common", col: "module", domain: ["korean"], badge: "Korean Facade",
      title: "korean_common.js & 4대 서브모듈", path: "kids-school-main/kids/js/korean_common.js",
      summary: "국어방 대문 파사드: 동화·받아쓰기(korean_dictation)·어휘(korean_voca)·미니독해·AI 토론(korean_sentence) 라우팅",
      guardrails: ["openMissionView(type) 라우팅 키(storybook, dictation, voca, reading, sentence) 보존",
        "10문제 완주 시 학습일지 자동 전송 흐름 유지"],
      agentPrompt: "korean_common.js의 openMissionView 라우팅과 서브모듈 호출 관계를 CORE_CATALOG.md §2-3 기준으로 점검해줘."
    },
    {
      id: "mod_korean_mini", col: "module", domain: ["korean"], badge: "Korean JS",
      title: "korean_mini_reading.js", path: "kids-school-main/kids/js/korean_mini_reading.js",
      summary: "국어방 [4단계] 🌱 민서 미니 독해 서가 렌더링, 문장별 SHA-1 mp3 오디오 재생 및 3단계 퀴즈 진행",
      guardrails: ["linesOf 및 questionScript 텍스트 규칙은 build_mini_reading_audio.py와 100% 동일해야 mp3 해시가 일치함"],
      agentPrompt: "korean_mini_reading.js의 문장 분리 및 SHA-1 오디오 매칭 로직을 확인해줘."
    },
    {
      id: "mod_reading_engine", col: "module", domain: ["korean", "english"], badge: "Reading Core",
      title: "reading_engine.js (핀포인트 독해)", path: "kids-school-main/kids/core/reading_engine.js",
      summary: "LIBRARY_DB 지문을 학년 바·단원 서가로 묶고, 1문항 슬라이스 카드·단락 힌트·지문 바텀시트로 출제",
      guardrails: ["민수(5학년) 국어·영어 공용, 민서 미니 독해 트랙은 다루지 않음",
        "노션 장애 시 reading_passages_cache.json 로컬 캐시로 자동 폴백"],
      agentPrompt: "reading_engine.js의 학년 필터와 오프라인 캐시 폴백 경로를 CORE_CATALOG.md §2-7 기준으로 점검해줘."
    },
    {
      id: "mod_math_quiz", col: "module", domain: ["math"], badge: "Math JS",
      title: "math_quiz_engine.js & math_voca_data.js", path: "kids-school-main/kids/subjects/math/js/math_quiz_engine.js",
      summary: "수학관 24개 단원의 4지선다 루프·보기 셔플·분수 렌더러와 문장제 지시어 88제 번역소 데이터",
      guardrails: ["checkAnswer가 칭찬/격려 음성과 보상 지급을 직결하므로 단원 파일에서 중복 구현 금지",
        "math_voca_data.js 748줄 상한 근접, 추가 시 분리 검토"],
      agentPrompt: "math_quiz_engine.js와 math_voca_data.js의 정답 판정·보상 연결과 CURRICULUM_DB 동기화 상태를 점검해줘."
    },
    {
      id: "mod_english_common", col: "module", domain: ["english"], badge: "English Facade",
      title: "english_common.js & voca·phonics", path: "kids-school-main/kids/js/english_common.js",
      summary: "영어방 대문 파사드와 단어 퐁당·영단어방·문장 조각 맞추기(english_voca), 파닉스 디딤돌(english_phonics)",
      guardrails: ["openMissionView(voca_pool, stage1~6) 라우팅 키 보존",
        "4선 공책 인쇄실(renderDictionaryUI) 출력 레이아웃 유지"],
      agentPrompt: "english_common.js와 english_voca.js의 단계별 렌더러 호출을 CORE_CATALOG.md §2-4 기준으로 점검해줘."
    },
    {
      id: "mod_ai_chat", col: "module", domain: ["english", "korean"], badge: "AI Chat JS",
      title: "english_chat.js & korean_sentence.js", path: "kids-school-main/kids/js/english_chat.js",
      summary: "Gemini 3.8 Flash 기반 영어 롤플레잉·국어 지문 토론, 생각 확장 코칭과 부모 검수 뱃지",
      guardrails: ["API 키를 코드에 넣지 않고 Worker 키 디스펜서로만 수급 (공개 저장소)",
        "모델은 gemini-3.8-flash → 3.6-flash 순서만 사용"],
      agentPrompt: "english_chat.js와 korean_sentence.js의 Gemini 호출이 키 디스펜서 경로와 표준 모델을 쓰는지 점검해줘."
    },
    {
      id: "mod_sci_report", col: "module", domain: ["science"], badge: "Science JS",
      title: "science_report.js & lab_data.js", path: "kids-school-main/kids/js/science_report.js",
      summary: "N단원 플러그앤플레이 실험연계 탐구 보고서 렌더러 (개념 비교표, 실험 분석, SVG 그래프, 서술형 빌더)",
      guardrails: ["window.SCIENCE_LAB_REPORT_{N}_DATA 스키마 준수 (q1, q5 서술형 빌더, q3 실험 순서 섞기 필수)",
        "단원 수정 시 science.html 하단 스크립트 ?v=YYYYMMDD_u{N} 캐시 버전 갱신 필수"],
      agentPrompt: "science_report.js와 science_lab_data.js를 확인해 탐구 보고서 렌더링 상태를 점검해줘."
    },
    {
      id: "mod_sci_engine", col: "module", domain: ["science", "guardian"], badge: "Lab Engine & CSS",
      title: "science_u3_engine.js & common.css", path: "kids-school-main/kids/js/science_u3_engine.js",
      summary: "5대 가상 실험실 공통 엔진 (숨김 탭 Retina DPI 보정, rAF 절전 루프, 1회성 보석 잠금) 및 공통 스타일",
      guardrails: ["setupHiDPICanvas로 display:none 상태 폭 0px 붕괴 방지",
        "createLoop(drawFn)로 백그라운드 탭 CPU 점유율 0% 유지"],
      agentPrompt: "science_u3_engine.js와 science_lab_common.css에서 가상 실험실 캔버스 DPI 및 절전 루프를 확인해줘."
    },
    {
      id: "mod_society_common", col: "module", domain: ["society"], badge: "Society Facade",
      title: "society_common.js & voca·chart", path: "kids-school-main/kids/js/society_common.js",
      summary: "사회방 대문 파사드: 노션 어휘·사료 프리패치, 용어방(society_voca), 도표 자료실(society_chart), 요약집 인쇄",
      guardrails: ["openMissionView(storybook, voca, chart, map, history) 라우팅 키 보존",
        "용어 마스터 초기화(resetMasterAndReload)는 노션 일괄 PATCH이므로 신중히 사용"],
      agentPrompt: "society_common.js의 노션 프리패치와 서브모듈 디스패치를 CORE_CATALOG.md §2-6 기준으로 점검해줘."
    },
    {
      id: "mod_society_history", col: "module", domain: ["society"], badge: "Society JS",
      title: "society_history.js & map·zoom", path: "kids-school-main/kids/js/society_history.js",
      summary: "국보·보물 문화재 듀얼 카드와 박물관 도크, 랜선 지도 탐방(society_map), 사료 돋보기(image_zoom_modal)",
      guardrails: ["수집한 유물은 localStorage에 보존되므로 키 이름 변경 금지",
        "사료 사진 확대는 공통 image_zoom_modal.js만 사용 (중복 구현 금지)"],
      agentPrompt: "society_history.js의 유물 수집 저장과 image_zoom_modal.js 연동을 점검해줘."
    },
    {
      id: "mod_haru_common", col: "module", domain: ["haru"], badge: "Haru Facade",
      title: "haru_common.js (하루 대문)", path: "kids-school-main/kids/subjects/haru/js/haru_common.js",
      summary: "민수 데일리 ↔ 민서 슬기로운 하루 프로필 전환, 5대 탭 스위칭, Edge-TTS 낭독 제어, 명화·동요 감상실",
      guardrails: ["speakText는 요정 엔진 경유, 탭 전환 시 stopAllSpeech 호출 유지",
        "보석/젤리 심볼은 프로필별로 분기 (민수 💎, 민서 🍬)"],
      agentPrompt: "haru_common.js의 프로필 전환과 탭 스위칭 시 음성 정지 흐름을 점검해줘."
    },
    {
      id: "mod_haru_engines", col: "module", domain: ["haru", "guardian"], badge: "Haru Engines",
      title: "haru 체크인·시계판·안전 엔진", path: "kids-school-main/kids/subjects/haru/js/haru-checkin-engine.js",
      summary: "30초 체크인·저금통(haru-checkin-engine), 24시간 시계판(haru-timeline-engine), 119 안전 퀴즈(haru-safety-quiz)",
      guardrails: ["체크인 완료(finishQuickCheckIn)와 일과 완성 시 STUDY_LOG_DB 전송 유지",
        "안전 퀴즈 오답은 무감점 다정한 피드백만"],
      agentPrompt: "haru-checkin-engine.js와 haru-timeline-engine.js의 노션 학습일지 전송 시점을 점검해줘."
    },
    {
      id: "mod_storybook", col: "module", domain: ["korean", "math", "english", "science", "society"], badge: "Viewer Core",
      title: "storybook_engine.js & viewer.css", path: "kids-school-main/kids/js/storybook_engine.js",
      summary: "전 과목 단원 동화 도서관 공통 뷰어: 양면 펼침면 넘김, 페이지별 TTS, 75줄 래퍼 HTML이 로드",
      guardrails: ["새 책은 600줄 통짜 HTML 대신 build_storybook.py가 만든 75줄 래퍼만 추가",
        "PC는 반드시 양면 양장본 이미지로 노출 (단일 삽화 단독 노출 금지)"],
      agentPrompt: "storybook_engine.js와 해당 책 래퍼 HTML의 페이지·오디오 매칭을 점검해줘."
    },
    {
      id: "mod_lifelog", col: "module", domain: ["tower"], badge: "Tower JS",
      title: "lifelog.js & lifelog_quick_modal.js", path: "js/lifelog.js",
      summary: "관제탑 Bio·Lifelog 대시보드(생체 브리핑·복약 칩·12주 잔디)와 원클릭 라이프로그 입력 모달",
      guardrails: ["복약 칩은 당일 일상 기록 DB에 즉시 PATCH하므로 날짜는 로컬 기준 계산",
        "야간 모드는 정오, 주간 모드는 자정 리셋 규칙 유지"],
      agentPrompt: "js/lifelog.js의 노션 조회와 lifelog_quick_modal.js 전송 흐름을 docs/lifelog_spec.md 기준으로 점검해줘."
    },
    {
      id: "mod_daycare_front", col: "module", domain: ["daycare"], badge: "Daycare Facade",
      title: "DaycareAuth · DaycareRecords · DaycareNotion", path: "daycare-helper/public/js/records-flow.js",
      summary: "보육비서 브라우저 3대 파사드: PIN 인증·기기 초대, 검수·암호화 초안·근거 선택, 원아·보관함 노션 저장",
      guardrails: ["잠금·교사 전환 뒤 늦은 응답은 표시하지 않음 (cancelSave·pause 격리 유지)",
        "requestJson은 쓰기를 자동 재전송하지 않음"],
      agentPrompt: "daycare-helper/docs/CORE_CATALOG.md의 브라우저 3대 파사드 절을 읽고 저장 흐름을 점검해줘."
    },

    // ───────── [4열: 파이프라인 & 캐시] ─────────
    {
      id: "pipe_worker_cache", col: "pipe", domain: ["quest", "korean", "math", "english", "science", "society", "guardian", "tower"], badge: "Cloudflare + Cache",
      title: "Notion Worker & 10분 로컬 보호 큐", path: "minmin-notion.awslike6.workers.dev + localStorage",
      summary: "노션 API 프록시(5분 엣지 캐시) 및 5문제 완주 시 최대 10건 비동기 PATCH + 실패분 재전송 대기열",
      guardrails: [
        "Pragma: no-cache 헤더나 ?force=true 사용 금지 (CORS 및 노션 400 에러 유발)",
        "silverDate와 lastReviewed는 UTC(toISOString)가 아닌 로컬 YYYY-MM-DD 기준 사용",
        "Worker는 GitHub 자동 배포가 아님: 대시보드에 붙여 넣고 /health version 확인"
      ],
      agentPrompt: "노션 Worker 동기화 Pull/Push 병합 로직과 localStorage 10분 보호 규칙을 점검해줘."
    },
    {
      id: "pipe_audio_cdn", col: "pipe", domain: ["korean", "quest"], badge: "Edge-TTS MP3",
      title: "SHA-1 오디오 자산 (mini_reading/*.mp3)", path: "kids-school-main/kids/assets/audio/mini_reading/",
      summary: "대본 문자열의 SHA-1 해시를 파일명으로 사용하는 정적 mp3 음성 파일 및 🔊 선택지 읽어주기",
      guardrails: ["개발자 도구 Network 탭에서 mini_reading/*.mp3 가 200 OK로 로드되는지 확인"],
      agentPrompt: "국어방 미니 독해에서 mp3 파일 경로와 SHA-1 해시가 일치하는지 확인해줘."
    },
    {
      id: "pipe_fairy_tts", col: "pipe", domain: ["korean", "math", "english", "science", "society", "haru"], badge: "Audio Core",
      title: "fairy-engine.js (요정 TTS 파이프라인)", path: "kids-school-main/kids/core/fairy-engine.js",
      summary: "speakFairyTTS(SunHi)·speakEnglish(Jenny 0.85x)·fairyPraise/Encourage/Reward 단일 재생 경로와 자가 치유",
      guardrails: ["window.speechSynthesis 직접 호출 금지, 반드시 이 엔진 경유",
        "설정은 학생별(_son, _daughter) 키 분리, 실제 채점 화면까지 E2E 확인"],
      agentPrompt: "fairy-engine.js의 resolveFairyPresetAudio 라우팅과 실제 채점 화면의 fairyPraise·fairyEncourage 호출을 점검해줘."
    },
    {
      id: "pipe_reading_cache", col: "pipe", domain: ["korean", "english"], badge: "Offline Cache",
      title: "reading_passages_cache.json", path: "kids-school-main/kids/data/reading_passages_cache.json",
      summary: "독해 지문 로컬 백업 캐시이자 노션 장애 시 등록 대기 큐 (reading_engine 폴백 원천)",
      guardrails: ["노션 복구 후 register_reading_passage.py --sync-pending으로 반영",
        "캐시와 노션 지문이 다르면 노션이 원본"],
      agentPrompt: "reading_passages_cache.json에 노션 미반영 지문이 남아 있는지 확인하고 --sync-pending으로 반영해줘."
    },
    {
      id: "pipe_gemini", col: "pipe", domain: ["english", "korean"], badge: "AI Key Dispenser",
      title: "Gemini 키 디스펜서 (/api/gemini-key)", path: "Cloudflare Worker Secret → 브라우저 메모리",
      summary: "공부방 AI 회화·토론이 쓰는 Gemini 키를 Worker Secret에서 런타임 수급 (코드·저장소에 키 없음)",
      guardrails: ["키를 config.js·HTML에 하드코딩하거나 atob로 숨기는 행위 절대 금지",
        "키 수급 실패 시 하드코딩 대신 Worker Secret 상태를 점검"],
      agentPrompt: "AI 회화가 실패할 때 /api/gemini-key 응답과 Worker Secret 설정을 점검해줘. 키 값은 출력하지 마."
    },
    {
      id: "pipe_guardian_reward", col: "pipe", domain: ["quest", "math", "science", "society", "haru", "guardian"], badge: "Guardian & Reward",
      title: "StudyActivity & 보석·학습일지 연동", path: "StudyActivity / grantRewardAndShowUI / sendStudyLogToNotion",
      summary: "실제 터치(event.isTrusted) 기반 정답 계측, 1회성 보석 지급, 노션 학습일지 자동 기록",
      guardrails: ["StudyActivity.recordCorrect는 5초 내 실제 클릭(isTrusted===true)만 인정 (JS .click() 테스트 시 0점 정상)",
        "관리자 모드(아빠/엄마)에서는 노션 DB에 실제 쓰기를 수행하지 않음"],
      agentPrompt: "완주 보상 함수와 StudyActivity 가디언 계측 연동이 정상 작동하는지 확인해줘."
    },
    {
      id: "pipe_family_data", col: "pipe", domain: ["tower"], badge: "Private Repo",
      title: "family-data (비공개 원본 보존소)", path: "github.com/awslike6-web/family-data",
      summary: "의료 서류·차량 정비 사진 원본을 표준 파일명으로 보존하고, 노션에는 파일명·금액·비공개 링크만 기록",
      guardrails: ["alluploads/는 .gitignore 버퍼, 원본은 family-data에만 커밋",
        "노션 인라인 이미지 삽입 금지 (비공개라 엑박), 본문에 GitHub 뷰어 링크만"],
      agentPrompt: "family-data 저장소의 표준 파일명 규칙과 노션 증빙파일명 속성이 일치하는지 점검해줘."
    },
    {
      id: "pipe_daycare_worker", col: "pipe", domain: ["daycare"], badge: "Daycare Worker",
      title: "보육 worker.js & Durable Object", path: "daycare-helper/worker.js",
      summary: "동일 출처 API·서버 세션·담당반 검증·원아 가명화, AuthStore/MemoStore 큐, 서버 키 Gemini 서식 생성",
      guardrails: ["보육 DB 접근은 notion-proxy-guard가 캐시 전에 검사, 서버 인증 요청은 캐시 우회",
        "오래된 메모 버전은 409로 거부 (덮어쓰기 금지)"],
      agentPrompt: "daycare-helper/worker.js의 /api/memo 버전 비교와 노션 저장 경로를 점검해줘."
    },

    // ───────── [5열: 노션 마스터 DB] ─────────
    {
      id: "db_voca", col: "db", domain: ["quest", "korean", "math", "english", "science", "society"], badge: "Notion DB",
      title: "VOCA_DB (어휘·받아쓰기·숙련도)", path: "ID: 375a27115b688038b686d3994ee12919",
      summary: "전 과목 단어·문장·받아쓰기 회차 및 3·3·3 숙련도(count/silverDate), 달성(금메달), 시험범위(⭐) 저장소",
      guardrails: ["받아쓰기 행(과목=받아쓰기)과 국어 정제 어휘(과목=국어) 태그 절대 혼합 금지",
        "신규 단원 등록 시 '학년'(예: 5-2, 1-2) 및 '학생'(민수/민서) 속성 필수 입력"],
      agentPrompt: "docs/notion_schemas_school.md의 VOCA_DB 스키마를 기준으로 속성값을 확인해줘."
    },
    {
      id: "db_library", col: "db", domain: ["korean", "english"], badge: "Notion DB",
      title: "LIBRARY_DB (독해 지문 마스터)", path: "ID: 37ca27115b688023a7d2cc5b3ff51fee",
      summary: "센터·교과서 독해와 🌱 민서 미니 독해 지문, Step 문제데이터 JSON, 출처구분 저장소",
      guardrails: ["교과서 사진을 받지 않은 경우 내용을 지어내지 말고 반드시 출처구분='자체 창작'으로 명시",
        "트랙(센터·교과서·민서 미니)으로 화면이 갈리므로 트랙 값 누락 금지"],
      agentPrompt: "LIBRARY_DB의 트랙별 스키마와 문제데이터 JSON 구조를 notion_schemas_school.md 기준으로 확인해줘."
    },
    {
      id: "db_curriculum", col: "db", domain: ["math", "science", "society"], badge: "Notion DB",
      title: "CURRICULUM_DB (교재·사료·실험)", path: "ID: 3e8a27115b68806d94bfc81e9b3435fa",
      summary: "과학 실험실·탐구보고서, 사회 사료·문화재·지도, 수학 지시어·단원 퀴즈를 구역별로 저장",
      guardrails: ["과학 신규 단원 배포 시 VOCA_DB 및 CURRICULUM_DB 양쪽 모두 레코드 동기화 필수",
        "미디어 URL은 검수된 정품 사료만, 없으면 공란"],
      agentPrompt: "CURRICULUM_DB에서 해당 과목·구역·단원 레코드가 화면과 동기화되어 있는지 확인해줘."
    },
    {
      id: "db_studylog", col: "db", domain: ["quest", "math", "science", "society", "haru", "guardian"], badge: "Notion DB",
      title: "STUDY_LOG_DB (학습일지·오답노트)", path: "ID: 37aa27115b688001b2ffe5e6c8f82ab2",
      summary: "아이들 과목별 학습시간·입장/퇴장·오답리포트·활동측정과 하루방 체크인 기록, 일상 DB와 relation",
      guardrails: ["학생 값은 민서·민수·부모관리자 중 하나 (관리자 모드 기록 구분)",
        "오답리포트는 망각곡선 복습 큐의 원천이므로 형식 변경 금지"],
      agentPrompt: "STUDY_LOG_DB에 오늘 학습 기록이 학생·과목별로 정상 적재되었는지 확인해줘."
    },
    {
      id: "db_inventory", col: "db", domain: ["guardian", "haru", "quest"], badge: "Notion DB",
      title: "INVENTORY_DB (보상·인벤토리)", path: "ID: 374a27115b688042bb61e6a102242e12",
      summary: "보석·사탕 잔액, 학생별 오디오·학습 설정, 자유 시간 추가권 등 보상 창고",
      guardrails: ["설정 저장은 학생별 키 분리 후 비동기 저장",
        "보석 지급은 1회성 잠금 키로 중복 적립 차단"],
      agentPrompt: "INVENTORY_DB의 학생별 보상 잔액과 설정 저장값을 notion_schemas_school.md 기준으로 확인해줘."
    },
    {
      id: "db_daily_hub", col: "db", domain: ["tower", "haru", "guardian"], badge: "Notion Hub",
      title: "AI 대화록 및 일상 기록 DB (중앙 허브)", path: "ID: 392a27115b6880dba5eede7ff33a22b9",
      summary: "가족 일상의 중심축: 수면·복약·현장 모드와 운동·병원·차량·학습일지가 모두 relation으로 집결",
      guardrails: ["날짜별 1페이지 원칙: 없으면 만들고 있으면 재사용",
        "새 라이프로그 DB는 반드시 이 허브와 양방향 relation 체결"],
      agentPrompt: "오늘 날짜의 일상 기록 DB 페이지에 운동·병원·학습일지 relation이 연결되었는지 확인해줘."
    },
    {
      id: "db_lifelog_family", col: "db", domain: ["tower"], badge: "Notion DB",
      title: "운동·병원·차량 DB (라이프로그 6중)", path: "운동 3b1a…60da / 병원 3a0a…d963 / 차량 3b3a…5c26",
      summary: "운동 메인일지·종목·세부세트, 건강/병원 기록(+개인정보), 셀토스 차량 정비 기록",
      guardrails: ["속성명은 docs/notion_schemas_tower.md를 기준으로만 사용 (추측 금지)",
        "보험 청구 상태·정비 구분 등 select 옵션은 기존 값만 사용"],
      agentPrompt: "docs/notion_schemas_tower.md 기준으로 운동·병원·차량 DB 속성과 일상 DB relation을 확인해줘."
    },
    {
      id: "db_devlog", col: "db", domain: ["tower", "guardian", "daycare"], badge: "Notion DB",
      title: "개발 타임라인 & 통합 개발 현황판", path: "타임라인 398a…8772 / 현황판 37ca…74b6",
      summary: "전사 개발 로그(타임라인)와 백로그·진행 상태 칸반(현황판), 상위 개발 파트 DB와 연결",
      guardrails: ["자잘한 패스트트랙 수정은 당일 메인 작업에 묶어서 1회 기록",
        "장애 복구는 원인·조치·재발 방지 3단 구성"],
      agentPrompt: "python scripts/manage_study_board.py --list로 현황판 진행 상태를 확인해줘."
    },
    {
      id: "db_daycare", col: "db", domain: ["daycare"], badge: "Notion DB",
      title: "보육 TEACHER·CHILD·DAYCARE_LOG DB", path: "교사 3e0a…7006 / 원아 3e0a…4e3a / 일지 3e0a…625c",
      summary: "교사·담당반, 원아 마스터, 일지·알림장·원시 메모·원아별 발췌 연결 저장소",
      guardrails: ["새 DB 속성을 추가하지 않고 기존 속성만 사용 (원시 메모·발췌 연결 포함)",
        "속성명은 daycare-helper/docs/notion_schemas_daycare.md 기준"],
      agentPrompt: "daycare-helper/docs/notion_schemas_daycare.md 기준으로 DAYCARE_LOG_DB 원시 메모 행 구조를 확인해줘."
    }
  ],

  // 노드 간 연결선 (from -> to). 같은 열끼리는 잇지 않습니다.
  edges: [
    // 국어 (민서 미니 독해 · 받아쓰기 · 민수 독해)
    ["src_reg_korean", "skill_korean"], ["src_audio_korean", "skill_korean"],
    ["skill_korean", "mod_korean_mini"], ["skill_korean", "mod_quest_mastery"],
    ["mod_korean_mini", "pipe_audio_cdn"], ["mod_korean_mini", "pipe_worker_cache"],
    ["pipe_audio_cdn", "db_library"], ["src_reg_korean", "db_voca"], ["src_reg_korean", "db_library"],
    ["src_reg_reading", "doc_korean_spec"], ["doc_korean_spec", "mod_korean_common"], ["doc_korean_spec", "mod_reading_engine"],
    ["mod_korean_common", "pipe_worker_cache"], ["mod_reading_engine", "pipe_reading_cache"], ["mod_reading_engine", "pipe_fairy_tts"],
    ["pipe_reading_cache", "db_library"], ["src_reg_reading", "db_library"], ["src_reg_reading", "db_voca"],

    // 5분 퀘스트 3·3·3
    ["src_verify_quest", "skill_quest"],
    ["skill_quest", "mod_quest_mastery"], ["skill_quest", "mod_quest_runner"], ["skill_quest", "mod_parent_chips"], ["skill_quest", "mod_quest_classic"],
    ["mod_quest_runner", "pipe_worker_cache"], ["mod_quest_runner", "pipe_guardian_reward"],
    ["pipe_worker_cache", "db_voca"], ["pipe_worker_cache", "db_library"],
    ["pipe_guardian_reward", "db_studylog"], ["pipe_guardian_reward", "db_inventory"],

    // 수학
    ["src_math_migrate", "doc_math_spec"], ["doc_math_spec", "mod_math_quiz"], ["doc_math_spec", "mod_quest_classic"],
    ["mod_math_quiz", "pipe_guardian_reward"], ["mod_math_quiz", "pipe_fairy_tts"], ["mod_quest_classic", "pipe_worker_cache"],
    ["src_math_migrate", "db_curriculum"], ["src_math_migrate", "db_voca"],

    // 영어 & AI 회화
    ["src_eng_voca", "doc_english_spec"], ["doc_english_spec", "mod_english_common"], ["doc_english_spec", "mod_ai_chat"], ["doc_english_spec", "mod_reading_engine"],
    ["mod_english_common", "pipe_fairy_tts"], ["mod_english_common", "pipe_worker_cache"],
    ["mod_ai_chat", "pipe_gemini"], ["doc_korean_spec", "mod_ai_chat"], ["src_eng_voca", "db_voca"],

    // 과학
    ["src_verify_sci", "skill_science"], ["skill_science", "mod_sci_report"], ["skill_science", "mod_sci_engine"],
    ["mod_sci_report", "pipe_worker_cache"], ["mod_sci_engine", "pipe_guardian_reward"], ["pipe_worker_cache", "db_curriculum"],

    // 사회
    ["src_society_quiz", "doc_society_spec"], ["doc_society_spec", "mod_society_common"], ["doc_society_spec", "mod_society_history"],
    ["mod_society_common", "pipe_worker_cache"], ["mod_society_common", "pipe_guardian_reward"], ["mod_society_history", "pipe_fairy_tts"],
    ["src_society_quiz", "db_curriculum"],

    // 하루
    ["doc_haru_spec", "mod_haru_common"], ["doc_haru_spec", "mod_haru_engines"],
    ["mod_haru_common", "pipe_fairy_tts"], ["mod_haru_engines", "pipe_guardian_reward"],

    // 스토리북 공통
    ["src_build_storybook", "doc_catalog"], ["doc_catalog", "mod_storybook"], ["mod_storybook", "pipe_fairy_tts"],

    // 공통 카탈로그 & 스킬 동기화
    ["src_sync_skills", "skill_quest"], ["src_sync_skills", "skill_korean"], ["src_sync_skills", "skill_science"], ["src_sync_skills", "doc_catalog"],
    ["doc_catalog", "mod_quest_mastery"], ["doc_catalog", "mod_korean_mini"], ["doc_catalog", "mod_sci_report"],
    ["doc_catalog", "mod_math_quiz"], ["doc_catalog", "mod_english_common"], ["doc_catalog", "mod_society_common"], ["doc_catalog", "mod_haru_common"],

    // 관제탑 라이프로그 & 개발 기록
    ["src_lifelog_cli", "doc_lifelog_spec"], ["doc_lifelog_spec", "mod_lifelog"],
    ["mod_lifelog", "pipe_worker_cache"], ["src_lifelog_cli", "pipe_family_data"],
    ["pipe_family_data", "db_lifelog_family"], ["pipe_worker_cache", "db_daily_hub"], ["pipe_worker_cache", "db_lifelog_family"],
    ["src_lifelog_cli", "db_daily_hub"], ["src_dev_log", "db_devlog"], ["src_dev_log", "db_daily_hub"],
    ["pipe_guardian_reward", "db_daily_hub"],

    // 보육비서
    ["src_daycare_tools", "doc_daycare_spec"], ["doc_daycare_spec", "mod_daycare_front"],
    ["mod_daycare_front", "pipe_daycare_worker"], ["pipe_daycare_worker", "db_daycare"], ["src_daycare_tools", "db_daycare"]
  ],

  // 피드백 & 버그 라우터 시나리오
  troubles: [
    {
      symptom: "💬 \"어제 분명히 다 풀었는데 오늘 보니까 진도나 은메달/금메달이 안 올라가 있어!\"",
      domain: "🎯 5분 퀘스트 / 노션 동기화",
      causes: [
        "부모님(아빠/엄마) 프로필로 로그인된 상태에서 풀었을 경우 노션 PATCH를 건너뜀",
        "당일 이미 은메달(count 6)을 딴 단어는 그날 더 풀어도 당일 상한 규칙에 의해 오르지 않음",
        "힌트를 보고 맞힌 문제는 첫 시도 정답이 아니므로 count가 +1 되지 않음"
      ],
      targetFiles: ["quest-mastery.js", "quest-runner.js", "localStorage.currentUserName"],
      prompt: "quest-engine-spec 스킬을 참고해서 5분 퀘스트 숙련도 동기화를 점검해줘. localStorage 대기열에 실패한 PATCH가 남아있는지, silverDate 로컬 날짜 계산이나 currentUserName 관리자 예외 처리 때문인지 확인해줘."
    },
    {
      symptom: "💬 \"민서 5분 퀘스트(국어)를 켰는데 단어가 아니라 갑자기 긴 받아쓰기 통문장이 튀어나와!\"",
      domain: "🌱 민서 국어 / VOCA_DB 태그 오염",
      causes: ["노션 VOCA_DB의 학교 받아쓰기 문장 행에 실수로 '국어' 과목 태그가 함께 들어간 경우",
        "반대로 정제 어휘에 '받아쓰기' 태그를 넣으면 받아쓰기 훈련소에 낱말이 섞여 나옴"],
      targetFiles: ["VOCA_DB (과목 속성)", "register_minseo_korean.py"],
      prompt: "minseo-korean-unit 스킬의 §1 데이터 구조 규칙을 확인해줘. 노션 VOCA_DB에서 받아쓰기 회차 문장에 '국어' 태그가 섞여 있거나 정제 어휘에 '받아쓰기' 태그가 잘못 들어간 행이 있는지 조회해서 찾아줘."
    },
    {
      symptom: "💬 \"민서 미니 독해에서 문장을 눌렀는데 소리가 안 나거나 옛날 문장으로 읽어줘!\"",
      domain: "🌱 민서 미니 독해 / Edge-TTS 오디오",
      causes: ["노션 LIBRARY_DB에서 지문 텍스트를 수정한 뒤 build_mini_reading_audio.py를 다시 돌리지 않아 SHA-1 해시 mp3가 없는 상태",
        "korean_mini_reading.js의 문장 분리 규칙과 파이썬 오디오 생성 스크립트의 텍스트 처리가 어긋난 경우"],
      targetFiles: ["build_mini_reading_audio.py", "korean_mini_reading.js"],
      prompt: "minseo-korean-unit 스킬 절차에 따라 python -X utf8 scripts/build_mini_reading_audio.py --dry-run 을 실행해서 노션 LIBRARY_DB 지문과 매칭되지 않는 누락된 SHA-1 mp3가 있는지 확인하고 생성해줘."
    },
    {
      symptom: "💬 \"과학 가상 실험실 탭을 열었는데 화면(캔버스)이 까맣거나 찌그러져서 안 보여!\"",
      domain: "🔬 과학 가상 실험실 / 캔버스 DPI",
      causes: ["숨김 탭(display:none) 상태에서 캔버스 크기를 초기화해 폭이 0px로 붕괴된 현상",
        "science.html 하단 스크립트 ?v= 캐시 버전이 옛날 버전이라 구버전 JS가 로드됨"],
      targetFiles: ["science_u3_engine.js", "science.html"],
      prompt: "science-unit-builder 스킬의 5대 기술 가드레일을 확인해줘. 해당 실험실 캔버스가 ScienceU3Engine.setupHiDPICanvas(canvas)를 사용해 숨김 탭 폴백 측정을 하고 있는지, science.html의 ?v= 쿼리가 최신인지 점검해줘."
    },
    {
      symptom: "💬 \"부모 진도판에 새로 넣은 민서 단원 칩이 민수 화면에 뜨거나 아예 안 보여!\"",
      domain: "🛡️ 부모 진도판 / 단원 칩 필터",
      causes: ["노션 VOCA_DB에 단원을 등록할 때 '학생'(민수/민서) 속성을 비워두면 양쪽 진도판에 모두 노출됨",
        "Worker 5분 캐시 때문에 방금 노션에 등록한 단원이 아직 브라우저에 내려오지 않음 (공부방 ⚙️ 설정 -> 노션 동기화 필요)"],
      targetFiles: ["parent_unit_chips.js", "VOCA_DB (학생·학년 속성)"],
      prompt: "quest-engine-spec 스킬의 함정 목록을 참고해 parent_unit_chips.js와 노션 VOCA_DB의 해당 단원 레코드에 '학생'과 '학년' 속성이 정확히 들어가 있는지 확인해줘."
    },
    {
      symptom: "💬 \"가디언 앱/제어기에서 아이가 문제를 풀었는데도 정답 카운트가 0으로 나와!\"",
      domain: "🛡️ 가디언 계측 / StudyActivity",
      causes: ["자동화 테스트나 스크립트로 .click()을 호출한 경우 event.isTrusted가 false라 계측에서 제외됨 (실제 손가락/마우스 클릭만 인정)",
        "커스텀 퀴즈 UI를 만들면서 StudyActivity.recordCorrect 호출을 누락한 경우"],
      targetFiles: ["quest-runner.js", "StudyActivity"],
      prompt: "quest-engine-spec의 보존 호출 규칙을 확인해 해당 퀴즈 완료 시 StudyActivity.setPhase 및 recordCorrect가 정상 호출되고 있는지 점검해줘."
    },
    {
      symptom: "💬 \"민수 독해방에 새로 넣은 지문이 안 보이거나 예전 지문만 나와!\"",
      domain: "📖 핀포인트 독해 / LIBRARY_DB",
      causes: ["등록 당시 노션 장애로 reading_passages_cache.json 대기 큐에만 남아 있는 경우",
        "학년(5-1, 5-2) 또는 트랙 속성이 비어 학년 바 필터에서 빠진 경우"],
      targetFiles: ["register_reading_passage.py", "reading_engine.js", "LIBRARY_DB (학년·트랙)"],
      prompt: "scripts/register_reading_passage.py --sync-pending으로 대기 중인 지문을 반영하고, LIBRARY_DB의 해당 지문 학년·트랙 속성이 reading_engine.js 필터와 맞는지 확인해줘."
    },
    {
      symptom: "💬 \"영어방 코코랑 대화(AI 회화)를 눌렀는데 대답이 안 와!\"",
      domain: "🔤 영어 AI 회화 / Gemini 키",
      causes: ["Worker 키 디스펜서(/api/gemini-key) 응답 실패 또는 Secret 만료",
        "표준이 아닌 구형 모델명으로 호출해 거부된 경우"],
      targetFiles: ["english_chat.js", "korean_sentence.js", "/api/gemini-key"],
      prompt: "english_chat.js의 Gemini 호출 경로와 모델명(gemini-3.8-flash)을 확인하고 /api/gemini-key 응답 상태를 점검해줘. 키 값은 출력하지 말고 하드코딩도 하지 마."
    },
    {
      symptom: "💬 \"관제탑에서 아침 약 칩을 눌렀는데 노션 일상 기록에 안 남아!\"",
      domain: "🏰 관제탑 라이프로그 / 일상 DB",
      causes: ["당일 일상 기록 DB 페이지가 아직 없거나 날짜 계산이 UTC로 어긋난 경우",
        "웹 수정 후 커밋·푸시를 안 해 Cloudflare 배포본이 옛날 코드인 경우"],
      targetFiles: ["js/lifelog.js", "AI 대화록 및 일상 기록 DB"],
      prompt: "docs/lifelog_spec.md를 읽고 js/lifelog.js 복약 칩의 날짜 계산과 일상 기록 DB PATCH 경로를 점검해줘. 배포본이 최신 커밋인지도 확인해줘."
    },
    {
      symptom: "💬 \"보육비서에서 메모를 적었는데 다른 기기에서 열면 예전 내용이야!\"",
      domain: "🧸 보육비서 / 원시 메모 동기화",
      causes: ["두 기기에서 동시에 고쳐 오래된 버전이 409로 거부된 뒤 선택을 안 한 경우",
        "오프라인 상태라 암호화 대기본에만 남아 노션 전송이 미뤄진 경우"],
      targetFiles: ["memo-sync.js", "daycare-helper/worker.js", "DAYCARE_LOG_DB"],
      prompt: "daycare-helper/docs/CORE_CATALOG.md의 DaycareMemo와 /api/memo 절을 읽고 메모 버전 충돌(409)과 대기본 전송 흐름을 점검해줘. 운영 자료로 쓰기 시험은 하지 마."
    }
  ]
};

// <AUTO-SYNC:START> scripts/sync_agent_skills.py가 자동으로 다시 씁니다. 직접 고치지 마세요.
window.SYSTEM_MAP_AUTO = {
  "lastUpdated": "2026-10-21",
  "catalogUpdatedAt": "2026-10-21 11:39",
  "skills": [
    {
      "name": "minseo-korean-unit",
      "path": "kids-school-main/.agent/skills/minseo-korean-unit/SKILL.md",
      "summary": "민서 국어 단원 추가·수정 시 사용. 학교 받아쓰기 회차 문장에서 겹받침·맞춤법 낱말을 뽑아 5분방용 VOCA_DB 정제 어휘로 등록하고, 국어방 '🌱 민서 미니 독해' 지문과 Edge-TTS mp3를 만드는 표준 절차."
    },
    {
      "name": "quest-engine-spec",
      "path": "kids-school-main/.agent/skills/quest-engine-spec/SKILL.md",
      "summary": "5분 퀘스트 작업 시 사용. 3·3·3 마스터리 엔진, 동적 스테이지, 에러리스 4대 UI, 노션 VOCA_DB 숙련도/달성 동기화, 영어·국어·사회·과학 단원 연동, 퀘스트 보상·학습일지·가디언 계측 흐름을 수정·점검·확장하거나 검증할 때 호출."
    },
    {
      "name": "science-unit-builder",
      "path": "kids-school-main/.agent/skills/science-unit-builder/SKILL.md",
      "summary": "초등 과학 단원 신규 제작·개선·검증 시 사용. 5대 가상 실험실과 실험연계 탐구 보고서 표준 규격을 강제 적용할 때 호출."
    }
  ]
};
// <AUTO-SYNC:END>

// 자동 갱신 값을 화면 데이터에 합칩니다: 기준일, 스킬 카드 요약, 지도에 없는 새 스킬 카드.
(() => {
  const data = window.SYSTEM_MAP_DATA;
  const auto = window.SYSTEM_MAP_AUTO || {};
  if (auto.lastUpdated) data.lastUpdated = auto.lastUpdated;
  data.catalogUpdatedAt = auto.catalogUpdatedAt || "";
  const allDomains = data.domains.map(d => d.key);
  (auto.skills || []).forEach(s => {
    const node = data.nodes.find(n => n.skill === s.name);
    if (node) {
      node.summary = s.summary;
      node.path = s.path;
      return;
    }
    const lastSkillIdx = data.nodes.map(n => n.col).lastIndexOf("skill");
    data.nodes.splice(lastSkillIdx + 1, 0, {
      id: `skill_auto_${s.name}`, col: "skill", skill: s.name, domain: allDomains, badge: "Skill (신규)",
      title: s.name, path: s.path, summary: s.summary,
      guardrails: ["조감도에 아직 연결선이 없는 새 스킬입니다. scripts/data/system_map_data.js에 domain과 edges를 추가하세요."],
      agentPrompt: `${s.name} 스킬(${s.path})을 먼저 읽고 작업 범위를 정리해줘.`
    });
  });
})();
