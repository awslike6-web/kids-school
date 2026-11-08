/*
 * 김s 시스템 조감도 증상 카드 (minmin_system_map.html 전용, 손으로 관리)
 * - 부모가 말한 증상 → 원인 → 볼 파일 → 에이전트 지시문을 묶습니다.
 * - domainKey는 조감도 탭 key, cards는 증상을 눌렀을 때 강조할 카드 id입니다 (문장을 해석해 찾지 않음).
 * - 문자열에 큰따옴표(")를 값으로 쓸 때는 복사 버튼 속성이 깨지지 않게 prompt에는 넣지 마세요.
 */
window.SYSTEM_MAP_TROUBLES = [
  {
    symptom: "💬 \"어제 분명히 다 풀었는데 오늘 보니까 진도나 은메달/금메달이 안 올라가 있어!\"",
    domain: "🎯 5분 퀘스트 / 노션 동기화",
    domainKey: "quest", cards: ["mod_quest_mastery", "mod_quest_runner", "pipe_worker_cache", "db_voca"],
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
    domainKey: "korean", cards: ["src_reg_korean", "skill_korean", "db_voca"],
    causes: ["노션 VOCA_DB의 학교 받아쓰기 문장 행에 실수로 '국어' 과목 태그가 함께 들어간 경우",
      "반대로 정제 어휘에 '받아쓰기' 태그를 넣으면 받아쓰기 훈련소에 낱말이 섞여 나옴"],
    targetFiles: ["VOCA_DB (과목 속성)", "register_minseo_korean.py"],
    prompt: "minseo-korean-unit 스킬의 §1 데이터 구조 규칙을 확인해줘. 노션 VOCA_DB에서 받아쓰기 회차 문장에 '국어' 태그가 섞여 있거나 정제 어휘에 '받아쓰기' 태그가 잘못 들어간 행이 있는지 조회해서 찾아줘."
  },
  {
    symptom: "💬 \"민서 미니 독해에서 문장을 눌렀는데 소리가 안 나거나 옛날 문장으로 읽어줘!\"",
    domain: "🌱 민서 미니 독해 / Edge-TTS 오디오",
    domainKey: "korean", cards: ["src_audio_korean", "mod_korean_mini", "pipe_audio_cdn"],
    causes: ["노션 LIBRARY_DB에서 지문 텍스트를 수정한 뒤 build_mini_reading_audio.py를 다시 돌리지 않아 SHA-1 해시 mp3가 없는 상태",
      "korean_mini_reading.js의 문장 분리 규칙과 파이썬 오디오 생성 스크립트의 텍스트 처리가 어긋난 경우"],
    targetFiles: ["build_mini_reading_audio.py", "korean_mini_reading.js"],
    prompt: "minseo-korean-unit 스킬 절차에 따라 python -X utf8 scripts/build_mini_reading_audio.py --dry-run 을 실행해서 노션 LIBRARY_DB 지문과 매칭되지 않는 누락된 SHA-1 mp3가 있는지 확인하고 생성해줘."
  },
  {
    symptom: "💬 \"과학 가상 실험실 탭을 열었는데 화면(캔버스)이 까맣거나 찌그러져서 안 보여!\"",
    domain: "🔬 과학 가상 실험실 / 캔버스 DPI",
    domainKey: "science", cards: ["skill_science", "mod_sci_engine"],
    causes: ["숨김 탭(display:none) 상태에서 캔버스 크기를 초기화해 폭이 0px로 붕괴된 현상",
      "science.html 하단 스크립트 ?v= 캐시 버전이 옛날 버전이라 구버전 JS가 로드됨"],
    targetFiles: ["science_u3_engine.js", "science.html"],
    prompt: "science-unit-builder 스킬의 5대 기술 가드레일을 확인해줘. 해당 실험실 캔버스가 ScienceU3Engine.setupHiDPICanvas(canvas)를 사용해 숨김 탭 폴백 측정을 하고 있는지, science.html의 ?v= 쿼리가 최신인지 점검해줘."
  },
  {
    symptom: "💬 \"부모 진도판에 새로 넣은 민서 단원 칩이 민수 화면에 뜨거나 아예 안 보여!\"",
    domain: "🛡️ 부모 진도판 / 단원 칩 필터",
    domainKey: "quest", cards: ["skill_quest", "mod_parent_chips", "db_voca"],
    causes: ["노션 VOCA_DB에 단원을 등록할 때 '학생'(민수/민서) 속성을 비워두면 양쪽 진도판에 모두 노출됨",
      "Worker 5분 캐시 때문에 방금 노션에 등록한 단원이 아직 브라우저에 내려오지 않음 (공부방 ⚙️ 설정 -> 노션 동기화 필요)"],
    targetFiles: ["parent_unit_chips.js", "VOCA_DB (학생·학년 속성)"],
    prompt: "quest-engine-spec 스킬의 함정 목록을 참고해 parent_unit_chips.js와 노션 VOCA_DB의 해당 단원 레코드에 '학생'과 '학년' 속성이 정확히 들어가 있는지 확인해줘."
  },
  {
    symptom: "💬 \"가디언 앱/제어기에서 아이가 문제를 풀었는데도 정답 카운트가 0으로 나와!\"",
    domain: "🛡️ 가디언 계측 / StudyActivity",
    domainKey: "guardian", cards: ["skill_quest", "mod_quest_runner", "pipe_guardian_reward"],
    causes: ["자동화 테스트나 스크립트로 .click()을 호출한 경우 event.isTrusted가 false라 계측에서 제외됨 (실제 손가락/마우스 클릭만 인정)",
      "커스텀 퀴즈 UI를 만들면서 StudyActivity.recordCorrect 호출을 누락한 경우"],
    targetFiles: ["quest-runner.js", "StudyActivity"],
    prompt: "quest-engine-spec의 보존 호출 규칙을 확인해 해당 퀴즈 완료 시 StudyActivity.setPhase 및 recordCorrect가 정상 호출되고 있는지 점검해줘."
  },
  {
    symptom: "💬 \"민수 독해방에 새로 넣은 지문이 안 보이거나 예전 지문만 나와!\"",
    domain: "📖 핀포인트 독해 / LIBRARY_DB",
    domainKey: "korean", cards: ["src_reg_reading", "mod_reading_engine", "pipe_reading_cache", "db_library"],
    causes: ["등록 당시 노션 장애로 reading_passages_cache.json 대기 큐에만 남아 있는 경우",
      "학년(5-1, 5-2) 또는 트랙 속성이 비어 학년 바 필터에서 빠진 경우"],
    targetFiles: ["register_reading_passage.py", "reading_engine.js", "LIBRARY_DB (학년·트랙)"],
    prompt: "scripts/register_reading_passage.py --sync-pending으로 대기 중인 지문을 반영하고, LIBRARY_DB의 해당 지문 학년·트랙 속성이 reading_engine.js 필터와 맞는지 확인해줘."
  },
  {
    symptom: "💬 \"영어방 코코랑 대화(AI 회화)를 눌렀는데 대답이 안 와!\"",
    domain: "🔤 영어 AI 회화 / Gemini 키",
    domainKey: "english", cards: ["mod_ai_chat", "pipe_gemini"],
    causes: ["Worker 프록시(/v1/chat/completions, /v1/gemini) 응답 실패 또는 Secret 만료",
      "표준이 아닌 구형 모델명으로 호출해 거부된 경우"],
    targetFiles: ["english_chat.js", "korean_sentence.js", "workers/minmin-notion/worker.js"],
    prompt: "english_chat.js의 Gemini 호출 경로와 모델명(gemini-3.8-flash)을 확인하고 Worker 프록시 응답 상태를 점검해줘. 키 값은 출력하지 말고 하드코딩도 하지 마."
  },
  {
    symptom: "💬 \"관제탑에서 아침 약 칩을 눌렀는데 노션 일상 기록에 안 남아!\"",
    domain: "🏰 관제탑 라이프로그 / 일상 DB",
    domainKey: "tower", cards: ["doc_lifelog_spec", "mod_lifelog", "db_daily_hub"],
    causes: ["당일 일상 기록 DB 페이지가 아직 없거나 날짜 계산이 UTC로 어긋난 경우",
      "웹 수정 후 커밋·푸시를 안 해 Cloudflare 배포본이 옛날 코드인 경우"],
    targetFiles: ["js/lifelog.js", "AI 대화록 및 일상 기록 DB"],
    prompt: "docs/lifelog_spec.md를 읽고 js/lifelog.js 복약 칩의 날짜 계산과 일상 기록 DB PATCH 경로를 점검해줘. 배포본이 최신 커밋인지도 확인해줘."
  },
  {
    symptom: "💬 \"보육비서에서 메모를 적었는데 다른 기기에서 열면 예전 내용이야!\"",
    domain: "🧸 보육비서 / 원시 메모 동기화",
    domainKey: "daycare", cards: ["doc_daycare_spec", "mod_daycare_front", "pipe_daycare_worker", "db_daycare"],
    causes: ["두 기기에서 동시에 고쳐 오래된 버전이 409로 거부된 뒤 선택을 안 한 경우",
      "오프라인 상태라 암호화 대기본에만 남아 노션 전송이 미뤄진 경우"],
    targetFiles: ["memo-sync.js", "daycare-helper/worker.js", "DAYCARE_LOG_DB"],
    prompt: "daycare-helper/docs/CORE_CATALOG.md의 DaycareMemo와 /api/memo 절을 읽고 메모 버전 충돌(409)과 대기본 전송 흐름을 점검해줘. 운영 자료로 쓰기 시험은 하지 마."
  }
];
