/*
 * 김s 시스템 조감도 추가 카드: 갤러리·시간표·가족 놀이·가디언 (minmin_system_map.html 전용, 손으로 관리)
 * - system_map_data.js가 800줄에 가까워 생활 영역 카드를 이 파일로 나눴습니다. 형식은 같습니다.
 * - system_map_data.js 끝의 합치기 코드가 nodes·edges를 지도에 넣습니다.
 * - 문자열에 큰따옴표(")를 넣지 마세요 (복사 버튼 속성이 깨짐).
 */
window.SYSTEM_MAP_LIFE = {
  nodes: [
    // ───────── [1열: 입력 원천 & 스크립트] ─────────
    {
      id: "src_quick_upload", col: "source", domain: ["gallery"], badge: "Python CLI",
      title: "sync_quick_upload.py (갤러리·특별한 날 입구)", path: "scripts/sync_quick_upload.py",
      summary: "폰 업로드 큐와 작품·특별한 날 사진을 kids-archive와 노션에 등록하는 단일 입구",
      guardrails: ["등록할 때마다 일회성 스크립트를 만들지 않음. 옵션이 모자라면 이 도구를 고침",
        "맞는 사진이 없으면 공란, 회전 보정과 육안 확인 후 완료 보고"],
      agentPrompt: "kids-school-main/docs/gallery_archive_spec.md를 읽고 python -X utf8 scripts/sync_quick_upload.py로 작품을 등록해줘."
    },
    {
      id: "src_notices", col: "source", domain: ["timetable"], badge: "Python CLI",
      title: "register_notices.py & sync_paper_diaries.py", path: "scripts/register_notices.py",
      summary: "날짜별 데이터 파일로 알림장을 등록하고, 손글씨 종이일기 원본을 보존해 노션에 연결",
      guardrails: ["날짜별 사본 스크립트를 만들지 않음 (데이터 파일 + 등록 도구 하나)",
        "먼저 --dry-run으로 확인한 뒤 실제 등록"],
      agentPrompt: "kids-school-main/docs/timetable_diary_spec.md §4를 읽고 scripts/register_notices.py --dry-run으로 알림장 데이터를 확인해줘."
    },

    // ───────── [2열: 로컬 AI 스킬 & 명세] ─────────
    {
      id: "doc_gallery_spec", col: "skill", domain: ["gallery"], badge: "Spec Doc",
      title: "gallery_archive_spec.md (갤러리 명세)", path: "kids-school-main/docs/gallery_archive_spec.md",
      summary: "꿈나무 갤러리, 특별한 날 피드, 12년 성장 미디어 원천(kids-archive) 동기화 규격",
      guardrails: ["작품 원본은 kids-archive에만 두고 공부방에는 복제하지 않음",
        "등록은 명세에 적힌 공식 도구로만"],
      agentPrompt: "kids-school-main/docs/gallery_archive_spec.md와 CORE_CATALOG.md §2-0-1을 읽고 갤러리 작업 범위를 정리해줘."
    },
    {
      id: "doc_timetable_spec", col: "skill", domain: ["timetable"], badge: "Spec Doc",
      title: "timetable_diary_spec.md (시간표·일기 명세)", path: "kids-school-main/docs/timetable_diary_spec.md",
      summary: "정적 시간표 + 실시간 알림장 오버레이 2-Track 구조, 마음일기·종이일기 보존 규격",
      guardrails: ["베이스 시간표는 오프라인에서도 바로 보여야 함",
        "날짜는 KST 로컬 헬퍼로만 계산"],
      agentPrompt: "kids-school-main/docs/timetable_diary_spec.md를 읽고 시간표·알림장·일기 구조를 정리해줘."
    },
    {
      id: "doc_family_spec", col: "skill", domain: ["family"], badge: "Spec Doc",
      title: "family_room_spec.md (가족 방 명세)", path: "kids-school-main/docs/family_room_spec.md",
      summary: "여러 기기로 즐기는 야추·오목·윷놀이의 방 만들기·대기실·자동 복구 계약",
      guardrails: ["한 기기 모드는 방 모드와 독립으로 유지",
        "새 Worker 배포는 백엔드 변경이므로 ASDST와 사전 승인 필요"],
      agentPrompt: "kids-school-main/docs/family_room_spec.md와 CORE_CATALOG.md §2-0-2를 읽고 가족 방 작업 범위를 정리해줘."
    },
    {
      id: "doc_guardian", col: "skill", domain: ["guardian"], badge: "Spec Doc",
      title: "스크린 가디언 README & guardian_spec.md", path: "kids-screen-guardian/README.md",
      summary: "학습 시간에 따라 게임·유튜브 이용 시간을 제한하는 Android·Windows 앱과 전용 Worker 안내",
      guardrails: ["학습 측정 규약은 kids-screen-guardian/learning/README.md 기준",
        "완주 보상·계측 호출 시그니처는 가디언이 의존하므로 임의 변경 금지"],
      agentPrompt: "kids-screen-guardian/README.md와 docs/guardian_spec.md를 읽고 공부방 계측과 가디언의 연결을 정리해줘."
    },

    // ───────── [3열: 프론트 모듈 & 스타일] ─────────
    {
      id: "mod_gallery", col: "module", domain: ["gallery"], badge: "Gallery JS",
      title: "gallery_controller.js & gallery-data-sync.js", path: "kids-school-main/kids/common_space/gallery_controller.js",
      summary: "꿈나무 갤러리 화면, 데이터 동기화, 틀린그림찾기·캐릭터 미니 런",
      guardrails: ["이미지는 kids-archive CDN 경로로만 참조",
        "미니 런 보상 규칙은 gallery-runner-rewards.js 한 곳에서 관리"],
      agentPrompt: "gallery_controller.js와 gallery-data-sync.js의 작품 로딩 흐름을 CORE_CATALOG.md §2-0-1 기준으로 점검해줘."
    },
    {
      id: "mod_timetable", col: "module", domain: ["timetable"], badge: "Timetable JS",
      title: "timetable_controller.js & daily-diary-sync.js", path: "kids-school-main/kids/js/timetable_controller.js",
      summary: "주간 시간표·알림장 표시와 하루 마음일기 작성·저장",
      guardrails: ["파일을 나눠도 timetable.html의 DOM ID를 유지",
        "일기 저장 실패분은 기기에 보존 후 재전송"],
      agentPrompt: "timetable_controller.js와 daily-diary-sync.js의 저장 흐름을 timetable_diary_spec.md 기준으로 점검해줘."
    },
    {
      id: "mod_family_room", col: "module", domain: ["family"], badge: "Family JS",
      title: "family-room.js & family-room-ui.js", path: "kids-school-main/kids/playground/family/family-room.js",
      summary: "가족 방 통신·대기실·자동 복구와 야추·오목·윷놀이 화면 연결",
      guardrails: ["family-room.js는 DOM을 만지지 않음",
        "방 모드는 한 기기 저장값을 임의로 바꾸지 않음"],
      agentPrompt: "family-room.js와 family-room-ui.js의 재접속 흐름을 family_room_spec.md 기준으로 점검해줘."
    },

    // ───────── [4열: 파이프라인 & 캐시] ─────────
    {
      id: "pipe_kids_archive", col: "pipe", domain: ["gallery", "timetable"], badge: "Media CDN",
      title: "kids-archive (12년 성장 미디어 원천)", path: "github.com/awslike6-web/kids-archive",
      summary: "작품·상장·일기 고화질 원본의 단일 원천. 공부방은 GitHub CDN 주소로 직접 참조",
      guardrails: ["공부방 저장소로 이미지를 복제하지 않음",
        "12년 보존 대상이므로 삭제·덮어쓰기는 사전 확인"],
      agentPrompt: "kids-archive CDN 경로와 갤러리 데이터의 이미지 주소가 일치하는지 점검해줘."
    },
    {
      id: "pipe_family_worker", col: "pipe", domain: ["family"], badge: "Cloudflare DO",
      title: "family-room Worker", path: "workers/family-room/worker.js",
      summary: "여러 기기 게임 방의 WebSocket 중계와 방 상태 보관",
      guardrails: ["운영 배포는 사전 승인 후 진행",
        "접속 끊김 복구 규약은 family_room_spec.md와 함께 수정"],
      agentPrompt: "workers/family-room/README.md를 읽고 방 만들기·재접속 HTTP 계약을 점검해줘."
    },
    {
      id: "pipe_guardian_worker", col: "pipe", domain: ["guardian"], badge: "Guardian Worker",
      title: "kids-screen-guardian Worker", path: "kids-screen-guardian/worker/wrangler.jsonc",
      summary: "학습 시간 조회, 자유시간 누적 장부, 기기 연결과 부모 관리 화면을 맡는 전용 서버",
      guardrails: ["가디언 코드는 별도 worktree에서 작업",
        "운영 배포·잠금 시험은 사전 승인 후 진행"],
      agentPrompt: "kids-screen-guardian/README.md의 현재 상태를 읽고 학습 조회와 자유시간 장부 흐름을 점검해줘."
    },

    // ───────── [5열: 노션 마스터 DB] ─────────
    {
      id: "db_diary", col: "db", domain: ["gallery", "timetable"], badge: "Notion DB",
      title: "DIARY_DB (성장 갤러리 & 마음일기)", path: "ID: 3dfa27115b688010a85be385f91d64ee",
      summary: "갤러리 작품과 마음일기·종이일기 기록 저장소",
      guardrails: ["속성명은 docs/notion_schemas_school.md 기준 (추측 금지)",
        "이미지 원본은 kids-archive, 노션에는 링크만"],
      agentPrompt: "docs/notion_schemas_school.md의 DIARY_DB 스키마를 기준으로 속성값을 확인해줘."
    },
    {
      id: "db_timetable", col: "db", domain: ["timetable"], badge: "Notion DB",
      title: "TIMETABLE_DB (고정 시간표)", path: "ID: 32ba27115b68828bbda201a1bdce12fc",
      summary: "학생별 고정 시간표와 알림장 오버레이의 기준 데이터",
      guardrails: ["속성명은 docs/notion_schemas_school.md 기준 (추측 금지)",
        "화면은 정적 베이스로 먼저 그린 뒤 노션 값을 덮음"],
      agentPrompt: "docs/notion_schemas_school.md의 TIMETABLE_DB 스키마와 timetable_controller.js 읽기 경로를 확인해줘."
    }
  ],

  edges: [
    // 갤러리·성장 아카이브
    ["src_quick_upload", "doc_gallery_spec"], ["doc_gallery_spec", "mod_gallery"],
    ["mod_gallery", "pipe_kids_archive"], ["mod_gallery", "pipe_worker_cache"],
    ["src_quick_upload", "pipe_kids_archive"], ["src_quick_upload", "db_diary"], ["pipe_kids_archive", "db_diary"],

    // 시간표·알림장·일기
    ["src_notices", "doc_timetable_spec"], ["doc_timetable_spec", "mod_timetable"],
    ["mod_timetable", "pipe_worker_cache"], ["pipe_worker_cache", "db_timetable"], ["pipe_worker_cache", "db_diary"],
    ["src_notices", "db_diary"],

    // 가족 놀이
    ["doc_family_spec", "mod_family_room"], ["mod_family_room", "pipe_family_worker"],

    // 스크린 가디언
    ["doc_guardian", "mod_quest_runner"], ["doc_guardian", "pipe_guardian_worker"], ["pipe_guardian_worker", "db_studylog"]
  ]
};
