# 🧩 민민이네 공부방 공통 부품 & 코어 모듈 카탈로그 (Core Catalog)

> **규칙**: 신규 기능 개발 또는 화면 수정 시 본 카탈로그에 등록된 공통 엔진을 우선적으로 임포트하여 사용해야 합니다. 동일한 기능을 위해 개별 페이지 내부에 수백 줄의 자바스크립트나 파이썬 코드를 중복 작성하지 마십시오.

---

## 1. 🎙️ 오디오 & 음성 합성 (Audio & Interaction)

### 🌟 `fairy-tts.js` · `fairy-engine.js` · `fairy-config.js` (2026-10-28 두 파일로 분리)
요정 코코의 한국어 안내, 원어민 영어 발음, 학습 보상 효과음 및 **Gemini 3.8 Flash TTS 기반 캐릭터 페르소나(민수 깐죽이 / 민서 깍쟁이)** 음성을 전담하는 통합 오디오 코어입니다.
- **파일 위치**:
  - `kids/core/fairy-config.js` (오디오 프리셋 맵 및 설정)
  - `kids/core/fairy-tts.js` (약 730줄, 음성 합성: Worker 실시간 음성 문장 대기열·브라우저 음성 대체·`stopFairyTTS`·녹음 음성 재생·말하기 속도·아이별 설정 읽기)
  - `kids/core/fairy-engine.js` (약 370줄, 키워드 라우터·캐릭터 목소리 고르기·`fairyPraise/Encourage/Reward/Greet`·음성 ON/OFF)
  - `kids/core/fairy-settings-catalog.js` (캐릭터 목소리 목록 `VOICE_CATALOG`과 요정 코코 녹음 음성 목록 `FAIRY_AUDIO_PRESETS`. 모든 화면이 엔진보다 먼저 싣는다)
- **HTML 로드 방법** (순서 지킴: `fairy-tts.js`가 엔진보다 먼저. 새 파일 이름에 `fairy-engine.js` 글자를 넣지 않는다 — `loadCoreScripts`·자산 경로 찾기가 그 글자로 엔진을 찾음):
  ```html
  <script src="../core/fairy-config.js"></script>
  <script src="../core/fairy-tts.js?v=20261028-tts"></script>
  <script src="../core/fairy-settings-catalog.js"></script>
  <script src="../core/fairy-engine.js?v=20261028-coco"></script>
  ```
  동적 로더 `core.js`(`requiredCores`)·`lobby_controller.js`(`lobbyCores`)도 같은 순서. 시험 `tests/fairy-tts.test.mjs`가 엔진·설정창을 싣는 모든 화면을 검사한다.
- **핵심 API**:
  | 메서드 | 용도 | 설명 |
  | :--- | :--- | :--- |
  | `speakFairyTTS(text, onEnd, options)` | 한국어 안내/퀴즈 | ① 센터 고정 MP3 ② 녹음 음성(키워드 라우터) ③ Worker `/api/tts` 실시간(Edge, 막히면 Worker가 OpenAI로 대신) ④ 브라우저 음성. 옵션 `skipPreset`·`skipStatic`·`forceVoice` |
  | `speakEnglish(text, onEnd)` | 영어 원어민 발음 | Jenny Neural, 재생 배속 = `getEnglishSpeechRate()` |
  | `stopFairyTTS()` | 모든 음성 정지 | 대기열·녹음 음성·센터 MP3·브라우저 음성을 멈추고 미리 받은 음성을 해제 |
  | `getKoreanSpeechRate()` / `setKoreanSpeechRate(r)` | 한국어 말하기 속도 | 아이별 설정 `korean_speech_rate`(1.0 = Edge +6%, 0.85 = -10%, 1.15 = +22%). 실시간 음성·센터 독해 MP3에 적용, 짧은 녹음 칭찬은 원래 속도 |
  | `getEnglishSpeechRate()` / `setEnglishSpeechRate(r)` | 영어 말하기 속도 | 아이별 설정 `english_speech_rate`(기본 0.85). 영어방 속도 단추와 설정창이 같은 값을 바꾼다 |
  | `fairyPraise(onEndCallback)` | 정답/칭찬 효과음 | 캐릭터 목소리면 `correct` 파일 중 비반복 무작위, 아니면 요정 코코 칭찬 |
  | `fairyEncourage(onEndCallback)` | 오답/격려 효과음 | 캐릭터 목소리면 `wrong` 파일 중 비반복 무작위, 아니면 요정 코코 응원 |
  | `fairyHint(onEndCallback)` | 힌트 열기 | 캐릭터 목소리면 `hint` 파일 2개 중 비반복 무작위, 아니면 요정 코코 `fairy_hint_open.mp3`. 독해 단서 열기(`reading_engine.js` `toggleHint`, 열 때만)·받아쓰기 초성 힌트(`korean_dictation.js`, 초성 단계만)에서 부른다 |
  | `fairyReward(type, onEndCallback)` | 완주/보상 획득 | 직전 정답 음성을 즉시 안전 중단(`stopFairyTTS`) 후 재생. `quest`·`finish`는 캐릭터 `clear` 파일 |
  | `fairyGreet(target, onEndCallback)` | 입장 인사 | `lobby`·`minsu`·`minseo`는 캐릭터 `welcome` 파일, 과목 인사는 요정 코코 |
  | `pickPersonaVoiceFile(kind)` | 캐릭터 파일 고르기 | `welcome`·`correct`·`wrong`·`clear`·`hint` 중 하나. 쓸 수 있는 캐릭터 목소리가 없으면 `null` |
- **실시간 음성 대기열 (2026-10-28~)**: `playTtsSentenceQueue`가 문장을 나눠 지금 문장 + 다음 2문장만 미리 받는다. 첫 문장부터 실패하면 브라우저 음성으로 넘어가고, 중간 문장이 실패하면 건너뛰고 끝 콜백을 한 번 부른다. 재생이 끝난 음성은 `URL.revokeObjectURL`로 해제(60자 이하 문장은 40개까지 캐시). 수식은 말로 읽는다(`3+4=7` → "3 더하기 4는 7", `-`는 등호가 있는 식 안에서만 "빼기"). 브라우저에서 OpenAI를 직접 부르거나 키를 저장하지 않는다(예전 키는 기기에서 지움, 헌법 §5).
- **요정 코코 녹음 음성 (2026-10-28~)**: 목록 `FAIRY_AUDIO_PRESETS`(환영 8·칭찬 10·응원 8·보상 6·시작/힌트 4, 옛 이름 `aliases`)는 `fairy-settings-catalog.js`에 있다. 새 코코 음성은 mp3를 `kids/assets/sounds/fairy/`에 넣고 목록에 한 줄 추가(칭찬·응원은 배열에 추가)하면 되고 엔진은 고치지 않는다. 목록이 아직 없으면 오류 없이 소리 없이 끝 콜백만 부른다. 시험 `tests/fairy-tts.test.mjs`가 목록의 파일이 모두 있는지 확인한다.
- **캐릭터 목소리 고르기 (2026-10-28~)**: 엔진은 `fairy-settings-catalog.js`의 `VOICE_CATALOG`만 보고 `kids/assets/voices/{voiceDir}/{voiceDir}_{상황}_{01~}.wav`를 만든다. 목록을 싣지 않는 화면에서는 엔진이 같은 폴더의 목록 파일을 한 번 불러오고, 그 전에 울리는 음성은 요정 코코로 나간다. 다음 경우에는 요정 코코로 돌아간다: 기본 선택, 음성 파일(`files`)이 없는 준비중 목소리, 다른 아이 전용 목소리(`target` 불일치. 공용 설정에 다른 아이 선택이 남아 있는 경우 포함). 회귀 시험 `tests/fairy-voice-persona.test.mjs`.

---

## 2. 🗄️ 노션 연동 & 캐싱 (Notion API & Data Sync)

### 🌟 `notion-helper.js` (순수 노션 파사드 & 자동 로더)
Cloudflare Worker 캐시를 통해 노션 데이터베이스와 안전하게 통신하는 통합 라이브러리이자 하위 호환성 파사드(Facade)입니다. 골디락스 헌법(300~600줄)에 따라 전문 서브모듈을 분리하고 자동 결합 로더를 탑재했습니다.
- **파일 위치**: `kids/core/notion-helper.js` (~240줄)
- **단일 책임 분리 서브모듈 (6대 골디락스 전문 모듈)**:
  - `kids/core/notion-cache-manager.js` (253줄): LocalStorage 1일 캐시, 프리패칭(`prefetchVocaData`, `prefetchReadingData`), 전사 통합 노션 동기화(`syncAllNotionData`), 토스트 알림 전담.
  - `kids/core/notion-api-client.js` (471줄): Cloudflare Worker 프록시 통신, VOCA/독해/도서관/시간표 쿼리, 노션 블록 파서, 지수 백오프 재시도 및 Rate Limit 방어.
  - `kids/core/study-log-store.js` (338줄): `STUDY_LOG_DB` 학습일지 **일일 Upsert 쓰기 단일 원천**(`{학생}_{KST YYYY-MM-DD}_{과목}` 키, 있으면 PATCH 누적·없으면 POST) + **연속 학습 스트릭**(노션 '입장' KST 날짜 기준, 연속이 끊긴 지점까지만 페이지 조회, 전송 성공 시 로컬 캐시에 오늘 즉시 반영, 기록 없으면 배지 숨김). `notion-study-logger.js`·`notion-reward.js` 두 경로가 모두 이 모듈만 호출하며, 두 파일 모두 미로드 시 스스로 이 모듈을 불러온다. 검증: `node scripts/verify_study_log_store.js`.
  - 학습일지는 당일 페이지 ID(`MINMIN_STUDY_LOG_PAGES_V1`)를 기억하고 조회·GET의 `?force=true`로 현재 값을 다시 읽습니다. 같은 키는 Web Locks(같은 브라우저 두 탭) 또는 Map 체인(한 탭)으로 직렬화하며 오답은 정확히 같은 구분 항목만 중복 제거합니다.
  - 조회는 400ms 뒤 한 번 재시도하고, 기억한 ID도 없고 재시도도 실패하면 선택 A에 따라 중복 가능 경고 1회와 함께 신규 생성합니다. 두 기기 동시 쓰기는 노션 고유 키 제약이 없어 보장하지 않습니다.
  - `kids/core/notion-study-logger.js` (425줄): `STUDY_LOG_DB` 학습일지 전송 진입점(중복 방어막, 오답 리포트 수집 → `StudyLogStore.upsertStudyLog`), `INVENTORY_DB` 보상/레벨업 엔진, 부모 관리자 모드 격리, 상대 경로 로비 복귀.
  - `kids/core/stt-debouncer.js`: STT 음성 인식 디바운스 및 세션 관리 (`setupDebouncedSTT`).
  - `kids/core/mission-reward-engine.js`: 미션 보상 지급 및 축하 모달 렌더러 (`claimMissionRewardOnce`, `openMissionRewardModal`, `grantVocaDwellReward`).
  - `kids/core/quiz-feedback-overlay.js`: 오답 다시풀기/다음문제 오버레이, 정답·뜻풀이 카드, 보카사전 딥링크 및 이탈 방지 가드 (`promptQuizRetryOrSkip`, `getVocaCommonUrl`, `window.__quizLeaveGuard`).
  - `kids/core/quiz-flow-controller.js`: 스피드(자동)/꼼꼼탐구(수동) 2대 진행 템포 제어기 및 풀이·보카사전 딥링크 카드 (`triggerQuizAdvance`, `setQuizFlowMode`).
  - `kids/core/fairy-chat-memory.js`: AI 요정 대화 기억 및 페르소나 매트릭스 (`parseChatMemoryPage`, `buildPersonaSystemPrompt`, `fetchRecentChatMemories`).
- **핵심 API (대문 파사드를 통해 100% 하위 호환 보존)**:
  | 메서드 | 서브모듈 | 설명 |
  | :--- | :--- | :--- |
  | `syncAllNotionData()` | `notion-cache-manager` | 전 과목 노션 캐시를 무효화하고 최신 데이터 일괄 선로딩 |
  | `prefetchVocaData(student)` | `notion-cache-manager` | 당일 어휘 데이터를 백그라운드에서 사전 다운로드 (0.01초 로딩) |
  | `fetchNotionTimetable()` | `notion-api-client` | 주간 시간표 전체 목록 조회 (로컬 캐시 우선) |
  | `fetchNotionVocabulary(subject, grade)` | `notion-api-client` | 과목/학년별 핵심 어휘 목록 조회 |
  | `fetchNotionQuizItems(options)` | `notion-api-client` | 5분 퀘스트용 단원별 4지선다 문항 동적 로드 |
  | `sendStudyLogToNotion(data)` | `notion-study-logger` / `notion-reward` | 학습일지 전송 진입점. 쓰기는 `StudyLogStore.upsertStudyLog`로 위임 (당일 같은 학생·과목 1건 누적) |
  | `StudyLogStore.upsertStudyLog(entry)` | `study-log-store` | STUDY_LOG_DB 일일 Upsert 쓰기 단일 원천 (실패 시 예외) |
  | `StudyLogStore.refreshStreak(child)` | `study-log-store` | 노션 STUDY_LOG_DB 학습일로 연속 일수 재계산 후 로컬 캐시 갱신 (로비 부팅 시 호출) |
  | `StudyLogStore.renderStreakBadge(id, child, dark)` | `study-log-store` | 로비 HUD 🔥 N일 연속 배지 (기록 없으면 숨김). 구 이름 `StreakManager.*`는 하위 호환 별칭 |
  | `grantReward(earned, subject, exp)` | `notion-study-logger` | 보석/하리보 지급 및 통합 레벨업 연산 (INVENTORY_DB) |
  | `promptQuizRetryOrSkip(opts)` | `quiz-feedback-overlay` | 오답 시 다시풀기/정답뜻풀이/보카사전 딥링크 통합 모달 출력 |
  | `getVocaCommonUrl(subject, word)` | `quiz-feedback-overlay` | 실행 위치 무관 100% 정확한 보카방(voca.html) 상대 경로 URL 생성 |

---

## 2-0. 🏰 대형 로비 통합 컨트롤러 (Lobby Controller & Dual Theme Architecture)

### 🌟 `lobby_controller.js` & `lobby-themes.css` (Stitch AI 듀얼 테마 로비 & 한도 모달 엔진)
Stitch AI 신규 시안 3종(민서 구름섬 클레이 파스텔 · 민수 SECTOR-07 차원 성계도 · 시간 한도 도달 갈림길 모달)을 골디락스 응집도(800줄 미만)로 통합한 로비 제어 엔진입니다.
- **파일 위치**:
  - `lobby.html` (784줄): 민서 뷰(`#minseoLobbyView`), 민수 뷰(`#minsuLobbyView`), 과목별 팝업 카드, 중단 4칸 아지트 허브(마이룸&상점·갤러리·대시보드·시간표), 하단 5칸 고정 유틸리티 바(`📝 마음일기 · 📸 찰칵등록 · 🦖 용어사전 · 🎡 놀이터 · 👥 프로필`), 놀이터 모달(`#playgroundModalOverlay`), 시간 한도 갈림길 모달(`#dailyCapModalOverlay`), 부모 관리자 시뮬레이터 툴바(`#adminQuickToolbar`, 2026-10-21부터 `<details>` 접이식: 평소엔 검수 라벨만, 누르면 도구 버튼 펼침 · JS 변경 없음) 통합 마크업.
  - `kids/css/lobby-themes.css` (359줄): CSS RGB 채널 변수 스왑(`html.theme-minseo` vs `html.theme-minsu`)으로 Tailwind 컬러 토큰 충돌 원천 차단, `.clay-card*`, `.jelly-btn`, `.cosmic-map`, `.scanline`, `.hazard-stripe-amber`, 모달 라이트 격리 스타일.
  - `kids/js/lobby_controller.js` (643줄): 유저/테마 즉시 스왑(`switchLobbyUser`), 노션 `INVENTORY_DB` & SWR 캐시 연동, 가디언 남은/획득 시간 HUD, 실제 학교 시간표 기반 다중 과목 부스트(`TimetableBoost` 연동으로 2~4과목 동시 점등 및 한도 도달 시 소등), 과목별 실제 일일 한도 신호등(`available`/`critical`/`completed`), 갈림길 모달 동적 치환(`openDailyCapModal`), 놀이터 모달(`openPlaygroundModal`).
- **핵심 API**:
  | 함수 / 프로퍼티 | 설명 |
  | :--- | :--- |
  | `window.USER_CONFIGS` | 민수/민서 전 교과 월드 맵 및 테마 속성 SSOT 데이터 (하위 호환 유지) |
  | `switchLobbyUser(targetUser)` | `'minseo'`(Light 클레이) ↔ `'minsu'`(Dark SECTOR-07) 테마·뷰·데이터 즉시 스왑 |
  | `handleSubjectNodeClick(subjKey)` | 과목 섬/포털 진입. `completed`(`💤 완료/냉각`) 상태일 때 갈림길 모달 자동 팝업 |
  | `toggleMinseoCard(cardId)` | 민서 파스텔 구름섬 과목별(국어·수학·영어·하루) 상세 팝업 툴팁 카드 토글 |
  | `navigateToHub(hubType, user)` | 중단 4칸 아지트 허브(`myroom`, `gallery`, `dashboard`, `timetable`) 중복 없는 단일 라우팅 |
  | `handleBottomNav(navType, user, ev)` | 하단 5칸 고정바(`diary`, `upload`, `voca`, `playground`, `profile`) 통합 액션 실행 |
  | `openPlaygroundModal(user)` / `closePlaygroundModal()` | 민서(색칠·종이접기·스타드롭·3학년 예습) / 민수(브롤DPS·스타드롭·30초 루틴) 놀이터 모달 제어 |
  | `togglePortalCard(cardId)` | 민수 차원 성계도 5대 포털 홀로그램 상세 카드 토글 (`card-eng`, `card-math` 등) |
  | `openDailyCapModal(subjKey)` / `closeDailyCapModal()` | 완료 과목과 보물 남은 추천 과목을 동적 비교하는 `한도도달ui` 모달 열기/닫기 |
  | `handleCapModalGoRecommended()` / `handleCapModalReviewAnyway()` | 갈림길 모달 내 `[보물이 남은 OO방 바로 가기!]` 및 `[그냥 복습만 더 할래요]` 라우팅 |
  | `setSubjectCapOverride(user, subj, state)` | 과목별 일일 한도 신호등 상태(`available`·`critical`·`completed`) 런타임 제어 |

---

## 2-0-1. 🎨 꿈나무 갤러리 & 성장 아카이브 코어 (Gallery & Growth Archive Engines)

### AI 편집본 자동 맞춤·선택 합성 (2026-10-29)
- `scripts/spot_diff_align.py` (약 400줄): 로컬 CLI `analyze`(맞춤·후보·검수) / `compose`(선택 영역만 합성). NumPy·OpenCV·Pillow 필요, OpenCV가 없으면 설치 안내와 종료 코드 2.
- `--id`는 갤러리 데이터의 CDN 주소를 `G:/master-tower/kids-archive/assets/media/...`로 매핑해 최종 원본을 읽고, `--original`은 등록 전 원본을 직접 읽습니다. 좌표 검증은 `build_gallery.validate_diff_spots`를 importlib로 재사용합니다.
- 판정 상수는 파일 상단: SIFT 4000·비율 0.75·RANSAC 3px, 정상값 30·재투영 중앙값 1.5px·배경 차이 12, 합성 덮임 100%·변화 40% 미만. 실패한 합성은 파일을 만들거나 갱신하지 않습니다.
- 기본 출력은 무시되는 `uploads/ex/갤러리/_spotdiff_work/`. 노션·Worker·Git·네트워크는 사용하지 않으며 빌더·놀이 화면도 바꾸지 않습니다. 계약은 `docs/gallery_spot_diff_align_spec.md`, 부모 절차는 `docs/gallery_archive_spec.md` §7.

### 틀린그림찾기 (2026-10-29)
- `kids/common_space/gallery-spot-diff.js` (359줄): 갤러리 전용 IIFE. `gallery-modal-manager.js`보다 먼저 로드하며 `window.GallerySpotDiff` 하나만 노출합니다. CSS는 `open()`에서 `gsd-style`로 한 번 삽입하고 모듈 로딩 시 DOM에 접근하지 않습니다.
- API: `open(item, {viewer, onClose})`, `close()`, `isValid(spotDiff)`. 순수 함수 `fitRect(boxW, boxH, imgW, imgH)`, `toNormalized(px, py, rect)`, `hitTest(spots, nx, ny, rect, foundSet, minTouchPx=22)`.
- 원본·변형 양쪽 터치, 레터박스 제외, 짧은 변 기준 반지름, 에러리스 피드백, 공간에 따른 배치, 부모 좌표 복사·RGB 차이 검수를 담당합니다. 노션·보상·학습일지는 쓰지 않습니다.
- `scripts/build_gallery.py`: `validate_diff_spots(spots)`, `build_spot_diff(...)`가 메타의 `spotDiff.modifiedImage`를 CDN의 `modifiedImageUrl`로 변환합니다. 이미지 비율·좌표·누끼·파일 오류는 놀이 데이터만 제외합니다. 포트폴리오에는 넣지 않습니다.
- 데이터 계약·부모 제작 절차: `docs/gallery_spot_diff_spec.md`, `docs/gallery_archive_spec.md`의 「틀린그림찾기 등록」.

기존 1,517줄의 거대했던 `gallery_controller.js`를 331줄의 초경량 메인 뷰 컨트롤러로 슬림화하고, 단일 책임 원칙에 따라 전문 서브모듈 2종으로 완전 분리 구축한 갤러리 코어 엔진군입니다.
- **파일 위치**:
  - `kids/common_space/gallery_controller.js` (331줄): 유저 테마 적용(DOM null 안전 가드), 2대 뷰 모드 스위처(작품 vs 특별한 날), 필터 바 및 카드 그리드 렌더러, 빠른 좋아요.
  - `kids/common_space/gallery-data-sync.js` (477줄): 로컬 데이터 로드/저장, 카테고리 정의, 노션 실시간 양방향 동기화 및 영구 수정 이력(Audit Trail) 콜아웃 블록 적재.
  - `kids/common_space/gallery-modal-manager.js` (517줄): 상세 모달 뷰, 다중 사진 썸네일 스위처, 메타 웹 편집, 작가의 한마디 직접 수정, 스티커 및 칭찬 댓글(XSS 방어).
- **핵심 API**:
  | 함수 | 모듈 | 설명 |
  | :--- | :--- | :--- |
  | `switchViewMode(mode)` | `gallery_controller` | 'art'(성장 작품) ↔ 'special'(특별한 날 추억) 2대 뷰 모드 전환 |
  | `renderGallery()` | `gallery_controller` | 작성자/분야별 필터가 적용된 갤러리 카드 그리드 반응형 렌더링 |
  | `loadGalleryData()` | `gallery-data-sync` | 로컬 스토리지 및 마스터 데이터 병합 로드 (버전 체크 포함) |
  | `syncFromNotionGallery()` | `gallery-data-sync` | 노션 GALLERY_DB에서 최신 제목/날짜/한마디 백그라운드 동기화 |
  | `syncArtworkToNotion(art, oldState)` / `syncSpecialDayToNotion(item, oldState)` | `gallery-data-sync` | 화면 수정 내용을 노션 `제목`·`날짜`·`작가의 한마디/일기본문`에 저장 + 수정 이력. 분야·동영상은 노션 속성이 없어 보내지 않음 (회귀 시험 `tests/notion-contract.test.mjs`) |
  | `openDetailModal(id)` | `gallery-modal-manager` | 작품/추억 상세 모달 팝업 열기 (다중 썸네일, 비디오 링크 자동 마운트) |
  | `addStickerReaction(type)` | `gallery-modal-manager` | 하트/따봉/별/트로피 스티커 반응 누르기 및 노션 실시간 동기화 |
  | `submitComment()` | `gallery-modal-manager` | 가족 칭찬 댓글 등록 (textContent 안전 주입 및 노션 블록 적재) |

---

## 2-1. 🌐 교과 공통 & 인터랙션 코어 (Subject & Interaction Engines)

### 🌟 `subject_engine.js` (4대 교과 공통 미션 엔진)
국어, 과학, 사회, 영어 4대 교과의 3단계 학습 사다리 미션 뷰와 노션 데이터 수급 스피너를 표준화한 코어입니다.
- **파일 위치**: `kids/core/subject_engine.js`
- **핵심 API**:
  | 메서드 | 파라미터 | 설명 |
  | :--- | :--- | :--- |
  | `SubjectEngine.showLoadingSpinner(container, msg)` | `container, [msg]` | 노션 데이터 수급 대기 공통 스피너 렌더링 |
  | `SubjectEngine.openMissionView(options)` | `options` | 미션 전체화면 오버레이 열기 및 오디오/보상 세션 초기화 |
  | `SubjectEngine.closeMissionView(options)` | `options` | 미션 닫기 및 세션 안전 정리 |
  | `SubjectEngine.getChosung(text)` | `text` | 한글 자모 초성 분해 엔진 (단일 SSOT) |

### 🌟 `image_zoom_modal.js` (통합 이미지 돋보기 & 핀치줌 엔진)
과학 실험 관찰 사진 및 사회 역사 유물/지도 사료를 드래그, 90도 회전, 모바일 핀치줌으로 탐색하는 공통 뷰어입니다.
- **파일 위치**: `kids/core/image_zoom_modal.js`
- **핵심 API**:
  | 메서드 | 설명 |
  | :--- | :--- |
  | `updateCardZoomTransform()` | 줌/이동/회전 CSS Transform 일괄 갱신 |
  | `rotateCardImage()` | 이미지 90도 시계방향 회전 |
  | `adjustCardZoom(delta)` | 줌 배율 확대/축소 (0.6x ~ 4.5x) |
  | `resetCardZoom()` | 줌 배율 및 위치 1.0x 초기화 |
  | `openImageInNewWindow(url, title)` | 고화질 전용 팝업 창으로 사진 열기 |
  | `initCardZoomListeners()` | 마우스 드래그 및 모바일 핀치줌 리스너 일괄 활성화 |

### 🌟 `math_quiz_engine.js` (수학관 공통 퀴즈 엔진)
수학관 24개 단원 파일의 4지선다 퀴즈 루프, 보기 셔플, 분수 렌더러 및 오디오/보상을 표준화한 엔진입니다.
- **파일 위치**: `kids/subjects/math/js/math_quiz_engine.js`
- **핵심 API**:
  | 메서드 | 설명 |
  | :--- | :--- |
  | `MathQuizEngine.init(quizList, options)` | 퀴즈 리스트 및 옵션 설정 후 첫 문제 렌더링 |
  | `MathQuizEngine.checkAnswer(selected, correct)` | 정답 판정, 칭찬/격려 사운드 및 보상 지급 직결 |
  | `MathQuizEngine.next()` | 다음 퀴즈 문항으로 전환 |
  | `MathQuizEngine.shuffleArray(arr)` | Fisher-Yates 보기 무작위 셔플 |
  | `MathQuizEngine.renderFrac(num, den)` | 진분수 HTML 시각화 렌더러 |
  | `MathQuizEngine.renderMixed(w, num, den)` | 대분수 HTML 시각화 렌더러 |

### 🌟 초1-2 수학 시계·규칙·모양 공방 (2026-10-24)

- 진입: `kids/subjects/math/clock_rules.html`, `kids/subjects/math/shapes.html`.
- `kids/subjects/math/js/clock_rules_logic.js`: 연속 분침 조작·시침 1:12 연동, 시간 구간 강조, 정각/30분 퀴즈, 구슬 반복 마디·팔찌/기차, 수 배열. 순수 API `MathPlay.timeParts(totalMinutes)` → `{hour, minute, hourAngle, minuteAngle}`, `MathPlay.findRepeat(items)` → `{unit, next}` 또는 `null`. 최소 두 마디 근거가 있을 때만 반복을 제안한다. 퀴즈는 수학적 상태로 생성하며 별도 정적 문항은행을 추가하지 않는다.
- `kids/subjects/math/js/shapes_viewer.js`: 기존 Canvas 입체 관찰. `set3DShape`, `highlightFeature`, `autoSpin3D`, `render3D` 등 기존 핸들러 호환.
- `kids/subjects/math/js/shapes_physics.js`: 굴리기·탑 쌓기. `selectSlideShape`, `startSlideSimulation`, `resetSlideSimulation`, `previewStack`, `runStackChallenge`.
- `kids/subjects/math/js/shapes_logic.js`: 탭·조립·기존 분류 퀴즈·초기화. `switchLab(1..7)`, `selectWorkshopTheme`, `chooseWorkshopPart`, `resetWorkshopCurrent`, `nextWorkshopTheme`, `renderShapeQuiz`, `nextShapeQuiz`. 상태는 IIFE 내부, 기존 인라인 호출 함수는 window에 공개. 분류 정답 보상은 문항당 한 번만 실행.
- `kids/subjects/math/js/shapes_stamp.js`: 입체의 지정 평면 강조 → 잉크 → SVG 도장, 집/기차/나비 밑그림, 조각 추가·포인터 이동·방향키 이동·회전·삭제. 별도 공개 API 없이 `lab-6`, `lab-7` DOM에 연결.
- `kids/subjects/math/math_play.css`: 두 활동 화면의 반응형 조작 패널과 접근성 스타일. 모든 신규 리소스는 상대 경로로 로드.
- 오디오: 기존 `speakFairyTTS`, `fairyPraise`, `fairyEncourage` 재사용. 새로운 서버/API/DB 스키마는 추가하지 않음.
- 검증: `node scripts/verify_math_phase1.cjs` (Playwright+Chrome, 외부 요청 모의 응답, 운영 DB 쓰기 없음). 결과 및 제한은 `docs/walkthrough_math_phase1.md`.

### 🌟 `math_voca_data.js` & `math_voca.css` (수학 문장제 지시어 번역소 코어 2.0)
`math_voca.html`(1,716줄 ➔ 495줄)의 골디락스 리팩토링으로 완성된 88제 마스터 데이터셋 캐시 및 전용 스타일시트입니다. 노션 `CURRICULUM_DB`(3e8a2711..., `구역: 지시어번역`) 및 `VOCA_DB`(375a2711...)와 100% 동기화되어 Zero-Hardcoding Headless CMS를 구현합니다.
- **파일 위치**:
  - `kids/data/math_voca_data.js` (748줄): 초등 5단계 계통별 88개 문장제 지시어 마스터 캐시 및 `renderFrac`, `renderMixed` 안전 탑재.
  - `kids/css/math_voca.css` (508줄): 아케이드(arcade) 테마, 네온 하이라이트 지문 카드, 3지선다 선택지, 코코 번역 팁 및 수식 모델 전용 스타일.
  - `scripts/migrate_math_to_curriculum.py`: 교재 실물 사료 13장, 수의 범위 퀴즈 10제, 분수 곱셈 퀴즈 10제, 지시어 88제(총 121건) 자동 적재 파이프라인.
- **핵심 API**:
  | 객체 / 함수 | 설명 |
  | :--- | :--- |
  | `window.DIRECTIVE_BANKS` | 0~4단계 88개 문장제 지시어 풀 (`sentence`, `word`, `opts`, `ans`, `tip`, `formula`) |
  | `window.renderFrac(num, den)` | 가로선 세로 분수 HTML 컴포넌트 렌더러 |
  | `window.renderMixed(whole, num, den)` | 대분수 일체형 HTML 컴포넌트 렌더러 |


---

## 2-2. 🎯 5분 퀘스트 & 부모 진도 제어 코어 (Quest & Parent Progress)

### 🌟 `parent_progress_controller.js` (부모 진도 제어 및 노션 동적 단원 주입 엔진 2.0)
5분 퀘스트의 부모 진도 관리판 모달을 100% 동적 송출(Zero Hardcoding) 방식으로 구동하며, 학기/지혜반 필터링, 망각곡선 4번 누적 복습 풀 제어, 노션 VOCA 캐시 단원 동적 합성을 총괄하는 독립 컨트롤러입니다.
- **파일 위치**: `kids/subjects/quest/parent_progress_controller.js`
- **핵심 API**:
  | 메서드 | 파라미터 | 설명 |
  | :--- | :--- | :--- |
  | `openParentProgressModal()` | - | 부모 진도 관리판 모달 열기 및 최신 설정 동기화 |
  | `closeParentProgressModal()` | - | 설정창 닫기 및 메인 퀘스트 부제목 갱신 |
  | `setParentUnit(child, subject, unit)` | 단원 문자열 | 단일 단원 선택 (기존 방식) |
  | `toggleParentUnit(child, subject, unit, combinable)` | - | 다중 단원 묶음 토글 (2026-10-15) |
  | `setMainSubject(child, subj)` / `getMainQuestSubject(child)` | 과목 키 | 🚀 오늘의 큰 버튼 과목 (2026-10-16). 진도판 맨 위 칩에서 고르고 설정의 `mainSubject`로 저장, 기본 `math`. 메인 젤리 버튼(`handleStartQuest`)이 이 과목·저장된 단원으로 출격하고, 버튼 아래 글씨는 `과목 · 노션 단원명`(`updateMainQuestSubText`) |
- **다중 단원 묶음**:
  - 묶을 수 있는 칩: 수학을 제외한 과목에서, 노션 VOCA `단원`명과 정확히 일치하는 칩(예: `[센터 5-2] 14번 - …`, `L9`, `2단원 (2. 낱말을 정확하게 읽어요)`). 민수 최대 4개·민서 최대 10개(`MAX_BUNDLE_UNITS`, 2026-10-20 민서 확장)까지 누르면 묶이고, 칩 아래 요약 줄에 "N개 단원 묶음 · 어휘 합계"가 표시됩니다.
  - 번호형 기본 칩(`1`, `3` 등)을 누르면 기존처럼 단일 선택으로 돌아갑니다.
  - 저장 형식: 묶음은 **배열**, 단일은 기존 **문자열** 그대로입니다. 출격 URL(`monster_lab_controller.js`)에서는 `|`로 이어 붙입니다. 단원명에 쉼표가 있으므로 쉼표 구분은 쓰지 않습니다.
  - 단원 번호 비교와 칩 중복 제거는 단원명 **맨 앞** 번호(`getLeadingUnitNumber`)만 씁니다. 첫 숫자를 쓰면 `[센터 5-2] 14번`이 학년 숫자 5로 잡혀, 센터 칩이 1개로 합쳐지거나 단일 선택 시 전부 선택된 것처럼 보이던 문제가 있었습니다.
- **칩 DOM은 `parent_unit_chips.js`에 위임** (2026-10-15): 컨트롤러는 선택·묶음·저장 규칙만 갖고, `syncDynamicUnitChips()`가 `ParentUnitChips.renderSubjectChips`에 클릭 핸들러(`onPick`)를 넘깁니다.
- **민서 기본값** (2026-10-15): 영어 `L1`, 국어 `1`(노션 "1단원 (1. 기분을 말해요)"에 맨 앞 번호로 매칭), 수학 `100num`. 이미 저장된 설정이 있으면 그 값이 우선합니다.

### 🌟 `parent_unit_chips.js` (진도판 단원 칩 빌더, 2026-10-15 분리)
- **파일 위치**: `kids/subjects/quest/parent_unit_chips.js` (전역 `window.ParentUnitChips`, `monster_lab.html`에서 `parent_progress_controller.js` 앞에 로드)
- **역할**: 노션 VOCA 캐시(`*_VOCA_CACHE_*`)에서 학생별·과목별 실제 단원을 찾아 칩을 그립니다.
  - 학생 구분: `학생`이 비었거나 본인·`공통`인 항목만 그 학생 칩에 넣습니다. 이전에는 민서 단원(`L10`, `10회 …`)이 민수 판에 섞일 수 있었습니다.
  - 받아쓰기 회차(과목에 `받아쓰기` 포함)도 칩으로 냅니다(2026-10-16, `📝 받아쓰기 4회 그림일기를 써요 · 10개`, 1-1의 숫자뿐인 단원 `1`은 `📝 받아쓰기 1회`).
  - 민수(2026-10-16~): 영어·국어·과학·사회는 **노션 단원 칩만** 그립니다. 라벨은 노션 단원명, ⭐는 그 단원에 `시험범위` 체크 항목이 있을 때, `· N개`는 어휘 수입니다. 기본 뼈대 칩(`BASE_UNITS`)은 노션 캐시가 비었을 때만 쓰는 비상용이고, 수학은 정적 문제은행 칩을 그대로 씁니다.
  - `labelOf(child, subj, unit)`: 저장된 단원값 → 표시 이름. 칩을 아직 안 그렸으면 노션 캐시에서 찾고, 번호 키(`3`)는 `3. 온도와 열`처럼 그 번호로 바로 시작하는 단원을 `3-1.`보다 먼저 고릅니다. 진도판 배지·메인 버튼 안내문이 이 함수를 씁니다(하드코딩 라벨표 `UNIT_META_MAP`에는 민서 정적 칩·수학만 남음).
  - 민서: 영어·국어는 노션 단원 칩(`📒 L1 · 10개`)을 앞에, 정적 문제은행 칩(`파닉스 첫단어 (기본 문제)` 등)을 뒤에 둡니다. 수학은 정적 칩만 씁니다.
  - 학기 알약: 민서 학년 `기초`는 `basic,1-1,1-2`로 분류해 어느 학기 탭에서도 보입니다.
- **핵심 API**:
  | 메서드 | 설명 |
  | :--- | :--- |
  | `BASE_UNITS` | 학생·과목별 기본 뼈대 칩 (기존 `INITIAL_SUBJECT_UNITS`) |
  | `collectNotionUnits()` | `{ units: {child: {subj: [{stage, semType}]}}, counts: {child: {'subj::단원': 어휘 수}} }` |
  | `renderSubjectChips({child, subj, container, found, metaMap, onPick})` | 한 과목 칩 줄을 다시 그림. `onPick(unit, isNotion)`은 클릭 핸들러를 반환 |
  | `labelOf(child, subj, unit)` | 저장값 → 칩 라벨 (배지·메인 버튼 안내 문구용, 번호 저장값 `"1"`도 맨 앞 번호로 찾음) |
  | `prettyStage(stage)` | `"1단원 (1. 기분을 말해요)"` → `"1단원 기분을 말해요"` |

---

### 🌟 `quest_engine.js` + `quest_notion_synth.js` (기존 4+1 출제 엔진, 2026-10-15 분리: 939줄 → 약 500줄 + 약 470줄)
골디락스 절대 상한(800줄 미만)에 맞춰 문제 합성부를 동작 변경 없이 떼어 냈습니다. 두 파일은 늘 함께 로드합니다(`quest_engine.js` → `quest_notion_synth.js`). 서로의 함수를 호출할 때 전역에서 찾으므로 로드 시점 의존은 없습니다.
- **`quest_engine.js`** (전역 함수): 세로 분수 `renderFrac`·`renderMixed`·`formatFractions`, 라이트너 오답 큐 `getAdaptiveQueue`·`saveAdaptiveQueue`·`recordWrongItem`·`recordCorrectItem`, 학년 가드 `isValidQuestionForChild`, `getNormalizedChildId`, `getParentQuestSettings`, `NEXT_UNIT_MAP`, 4+1 출제 `getSubjectQuest(subj, unitScope, mode, customUser)`(내부 `buildSubjectQuest` + 보기 섞기 `withShuffledOptions`), 단원 팩 로더 `loadCustomUnitPack`.
- **`quest_notion_synth.js`** (전역 `window.QuestNotionSynth` + 기존 전역 유지):
  | 메서드 | 설명 |
  | :--- | :--- |
  | `getNotionCachedVocaList(child)` | 당일 VOCA 캐시(`_loadVocaFromCache` → localStorage `_VOCA_CACHE_`) 레코드 배열. 전역으로도 노출(`quest-mastery.js`가 사용) |
  | `buildVocaQuestionsFromNotion(child, subj, unitKey?, {semesterScope?})` | VOCA 캐시로 4지선다 최대 5문제 합성(뜻→낱말 70% / 낱말→뜻 30%). 전역으로도 노출 |
  | `buildCurriculumQuestionsFromNotion(child, subj, unitKey?)` | 사회 사료·과학 실험 탐구 퀴즈 최대 2문제 (`QuestNotionSynth`로만 노출) |
  | `generateDynamicMentalMath(child, unitKey?)` | 수학 무한 랜덤 암산 1문제 (민수 분수 곱셈·나눗셈, 민서 10 만들기·덧셈) |
- 새 출제 경로를 만들 때도 `getSubjectQuest`를 거쳐야 `withShuffledOptions`가 적용됩니다.

### 🌟 `quest-mastery.js` (3·3·3 듀오링고형 마스터리 엔진, 약 580줄)
VOCA_DB 어휘 단원(영어·국어·사회·과학)의 5분 퀘스트 두뇌. DOM 조작 없이 동적 스테이지 분할·숙련도 계산·슬롯 배치·노션 동기화를 담당합니다. 수학·사료 퀴즈·민서 정적 뱅크·노션에 없는 단원(3개 미만)은 기존 `quest_engine.js` 4+1로 자동 폴백합니다. `?engine=classic`으로 강제 폴백.
- **민서(초1)** (2026-10-15~16): 영어 L1~L10(학년 `기초`)·국어 1단원·받아쓰기 1-1(`1`~`11`)·1-2(`1회`~`10회`) 노션 단원이 3·3·3 대상입니다. 민서 판은 `ctx.maxChunks = 3`이라 문장 조립이 최대 3조각입니다(민수는 5).
  - `selectUnitItems`는 뜻풀이가 출처 표기(`1학년 2학기 받아쓰기 …`, `isSourceTag`)인 항목만 뺍니다. 정상 뜻풀이가 있는 받아쓰기는 출제됩니다.
  - 상세설명의 회차 표기(`1학년 2학기 받아쓰기 4회 3번`)는 힌트로 쓰지 않습니다(`item.detail` 비움). 뜻 고르기 문제에서 상세설명이 없으면 힌트(=정답)를 숨깁니다.
  - 민서 국어 기본값은 `1단원 (1. 기분을 말해요)` 전체 이름입니다(`1`은 1-1 받아쓰기 단원 `1`과 정확히 일치). 옛 설정 `'1'`은 `unitSchema: 2` 표시가 없으면 1단원으로 옮깁니다(`parent_progress_controller.js`·`quest_engine.js` 같은 규칙).
- **파일 위치**: `kids/subjects/quest/quest-mastery.js` (전역 `window.QuestMastery`)
- **규칙**: count 0~2 Lv.1 / 3~5 Lv.2 / 6 🥈(당일 `silverDate`, 그날은 승급 잠금) / 다음 날부터 6~8 Lv.3 / 9 👑(노션 `달성` true). 녹슨 왕관(금메달 후 2일+) 오답 시 count 5·`달성` false.
- **스테이지**: `max(1, round(n/10))`개, `시험범위` 체크 항목을 앞 스테이지에 우선 배치, 단어·문장 비례 배분. 숙련도는 노션 페이지 `id` 기준이라 스테이지 재편 시에도 유실 없음.
- **동기화**: 단원 로드 시 `fetchVocaUnitFresh` Pull → 미전송·10분 내 전송분만 Max-Merge 보호, 그 외 원격 기준. 5문제 완주 시 변경분만 `updateVocaMasteryProgress` 비동기 PATCH, 실패분은 다음 판 재전송.
- **핵심 API**:
  | 메서드 | 설명 |
  | :--- | :--- |
  | `loadUnit({child, subj, unit, budgetMs})` | 당일 캐시 + 노션 최신 Pull 병합, 단원 항목 반환 (3개 미만이면 null). `unit`은 문자열·`\|` 결합 문자열·배열 모두 가능, 반환에 `units`·`unitKey`(정렬 후 `+` 결합) 포함. `budgetMs`(러너는 3000)를 주면 노션 조회를 그 안에서 끊고 오늘 캐시로 출제하며, 남은 시간 1초 미만이면 단원 번호 재조회를 건너뜀 (없으면 기존 3초 + 4초). 바깥에서 `Promise.race`로 자르지 말 것: 캐시까지 버려 정적 퀘스트로 떨어짐 |
  | `stageLabel(stage)` / `unitTitle(items, units)` | 노션 단원명 → 표시 이름. 퀘스트 제목은 `과목방 이름 · unitTitle(불러온 항목)`(단일 = 단원명, 번호 느슨 매칭 = "가장 큰 단원 외 N개", 묶음 = "📚 N개 단원 묶음"). 기존 4+1 제목도 `quest_engine.js` `notionUnitName`으로 같은 규칙, 정적 문제은행 단원은 은행의 `unitTitles` |
  | `parseUnitList(unit)` | 단원 설정값 → 단원명 목록 (배열 / `\|` 결합 / 단일) |
  | `dedupeHeadwords(items, store)` | 띄어쓰기 무시 표제어가 같으면 숙련도 높은 항목 1개만 남김 (묶음 단원의 `칠전팔기` 등) |
  | `pickBlankToken(item, lang, rng)` | 문장 빈칸 어절 3단계 우선순위: ① 단어의 `[어절]`·상세설명 `[어절]`/`핵심: 어절` ② 한글 겹받침 → 복합모음 → 받침 어절 ③ 2글자 이상 핵심 어절 (영어는 ①→③) |
  | `koreanTier(token)` / `misspellingsOf(token)` | 한글 종성·중성 분석. 받아쓰기 빈칸 보기는 실제로 헷갈리는 철자 오답(`닭장→달장·닥장`, `있겠죠→잇겠죠`, `되고→돼고`)을 먼저 씁니다 |
  | `buildRound({child, items, subj, today?, rng?})` | 1판 5문제 + `meta {activeStage, totalStages, isTodayAllSilver}` |
  | `applyResult(child, question, [{id, firstTry}])` | 첫 시도 정답만 +1, 당일 은메달 잠금·녹슨 왕관 강등 반영 |
  | `pushChanges(child)` | 변경 단어만 노션 '숙련도'/'달성' PATCH (Non-blocking) |
  | `getProgressSummary(child, items)` | 🪨 돌 / 🟫 구리 / 🥈 은 / 💎 다이아 개수 |
- **검증**: `node --test "tests/**/*.test.mjs"` (회귀 시험 묶음, 아래 §회귀 시험) 또는 단독으로 `node scripts/verify_quest_mastery.js` / 브라우저 `scripts/verify_quest_mastery.html`. 작업 절차·함정은 스킬 `quest-engine-spec` 참고

### 🌟 `quest-ui-renderer.js` (4대 에러리스 인터랙션 렌더러, 약 350줄)
- **파일 위치**: `kids/subjects/quest/quest-ui-renderer.js` (전역 `window.QuestUIRenderer`)
- `render(container, question, {theme, speak, onPraise, onEncourage, onDone})`: `choice_audio`(Lv.1 원문+힌트 / Lv.2 영어는 🔊만, 국·사·과는 뜻→용어), `match_3x3`(터치 매칭 소거), `fill_blank`(철자 블록 / 예문·문장 빈칸 3지선다), `scramble`(알파벳·음절 / 문장 최대 5청크, 민서 3청크).
- 민서 테마 + 국어(`lang: 'ko'`)의 선택형 보기에는 🔊 읽어 주기(`.qm-opt-say`)가 붙습니다. 누르면 `hooks.speak(보기, 'ko')`만 하고 고르기로 치지 않습니다.
- 오답 시 빨간 X·경고음·하트 없음. 틀린 블록은 슬롯에 넣지 않고 정답 블록에 노란 테두리 + `shake`.
- `renderProgressHeader(container, summary, meta, theme)`: 상단 광물 진척도 바.

### 🌟 `quest_runner.html` 러너 모듈 분리 (2026-10-15, 1,474줄 → HTML 592줄 + 2개 IIFE)
골디락스 절대 상한(800줄 미만)에 맞춰 인라인 스크립트를 동작 변경 없이 분리했습니다. HTML에는 마크업·테마 CSS와 `window.addEventListener('DOMContentLoaded', QuestRunner.boot)` 연결부만 남습니다. 로드 순서: `quest_engine.js` → `quest_notion_synth.js` → `quest-mastery.js` → `quest-ui-renderer.js` → 문제 은행 → **`quest-runner-ui.js` → `quest-runner.js`**.
- **`quest-runner-ui.js`** (약 270줄, 전역 `window.QuestRunnerUI`): Web Audio 효과음 `playSound(tap|correct|wrong|fanfare)`, `applyChildTheme`, 과목 심화관 버튼 라벨 `applyDeepTrainingLabels`·경로 `deepTrainingUrl`, `setMathMemoVisible`, 모달 `showModal/hideModal` + 민서 스킨(`skinRevengeModalForMinseo`·`skinClearModalForMinseo`·`skinExitModalForMinseo`), 수학 손글씨 메모장, 사진 확대 라이트박스.
- **`quest_engine.js` `getSubjectQuest`** (2026-10-15): 4+1 결과의 보기를 매번 섞고 정답 번호를 다시 매깁니다(`withShuffledOptions`). 정적 뱅크가 정답을 첫 보기(`answer: 0`)에 적어 두어, 섞지 않으면 정답이 늘 1번이던 버그를 막습니다. 원본 뱅크 객체는 바꾸지 않습니다.
- **`quest-runner.js`** (약 570줄, 전역 `window.QuestRunner = { boot }`): URL 파싱·`getSubjectQuest` 바인딩, 가디언 학습 상태 표시, 3·3·3 마스터리 연결부(`bootQuest`·`renderMasteryQuestion`·`handleMasteryDone`), 기존 4+1 렌더링·채점·하트·리벤지, `showClearModal`(`QuestMastery.pushChanges` → `grantRewardAndShowUI(3, true)` → `sendStudyLogToNotion`), `StudyActivity.setPhase/recordCorrect` 연동.
- **HTML onclick 호환 전역**: `handleCheckAnswer`, `goToNextStep`, `playQuestionAudio`, `selectChoice`, `startRevengeRound`, `skipRevengeAndClear`, `confirmExit`, `closeExitModal`, `returnToLab`, `goToSubjectDeepTraining`(별칭 `goToMathDeepTraining`), `goToLobby`, `playSound`, `toggleMathMemoPad`, `clearMathMemoCanvas`, `openImageZoom`, `closeImageZoom`.

### 🌟 `monster_roster.js` (5분 퀘스트 파트너 몬스터 로스터 & 포즈/에러리스 대사 엔진, 2026-10-24 추가)
- **파일 위치**: `kids/subjects/quest/monster_roster.js` (전역 `window.MonsterRoster`, `monster_lab.html` 및 `quest_runner.html`에서 로드)
- **에셋 경로**: `kids/assets/monsters/cottun_bongdomdol/` (`idle.png`, `greet.png`, `walk_left.png`, `walk_right.png`, `rage.png`, `roar.png` — 800×800 투명 캔버스 바닥 기준 완벽 정렬 누끼 PNG)
- **역할**:
  - `[1호: 클레이 바이트]`(`clay_bite`)와 민수 자작 캐릭터 `[2호: 콧툰봉돔돌 (SCP-봉제괴수)]`(`cottun_bongdomdol`) 모두 100% 투명 배경 누끼 캐릭터로 사이버 연구실 마법진 발판 위에 동일한 레이어 위계로 서서 렌더링됩니다.
  - `localStorage.getItem('selectedMonster')`로 선택 상태가 영속화되며, 탭 단계별 포즈 변화(1회 인사 ➔ 2~4회 걷기 ➔ 5회 과열 쉐이크 ➔ 출격 시 포효)와 퀘스트 러너 에러리스(Errorless) 응원을 지원합니다.
- **핵심 API**:
  | 메서드 | 설명 |
  | :--- | :--- |
  | `getSelectedMonster()` / `setSelectedMonsterId(id)` | 현재 선택된 파트너 몬스터 조회 및 `localStorage('selectedMonster')` 저장 |
  | `preloadMonsterAssets(id)` / `preloadAllMonsters()` | `new Image()`로 포즈별 이미지 즉시 프리로드 (탭/채점 시 깜빡임 원천 방지) |
  | `getLabTapResponse(tapCount)` | 연구소 `pokeMonster` 탭 단계별 포즈·대사 반환 (1회 `greet` 인사 / 2~4회 `walk_left`·`walk_right` 교차 / 5회 `rage` 과열+Shake, 출격 시 `roar` 포효) |
  | `getRunnerReaction(state)` | 실전 러너 `#cheerMonster` 에러리스(Errorless) 반응 반환 (`stageStart` 투지 `rage` / `correct` 하이파이브 `greet` / `encourage` 따뜻한 격려 `walk_left` / `clear` 승리 포효 `roar`) |

---

## 2-3. 📖 국어 멀티버스 전담 엔진군 (Korean Multiverse Engines)

전사 최고 거버넌스 헌법(규칙 7조: 골디락스 적정 응집도 300~600줄, 절대 상한 800줄 미만)에 의거하여, 기존 1,807줄의 비대했던 `korean_common.js`를 1개의 초경량 대문 파사드와 4개의 전문 서브모듈로 완전 분리 구축한 엔진군입니다.

### 🌟 `korean_common.js` (국어 멀티버스 대문 파사드)
오버레이 팝업, 학년/단원 동적 필터, 퀴즈 공통 진행/채점 브리지, 보상 디스패처를 총괄하는 초경량 라우팅 파사드입니다.
- **파일 위치**: `kids/js/korean_common.js` (약 480줄)
- **핵심 API**:
  | 메서드 | 설명 |
  | :--- | :--- |
  | `initializeKoreanRoom()` | 자녀 프로필 동기화(`?user=` 우선), 테마 설정, 0.01초 어휘/독해 백그라운드 선캐싱. 관리자(`currentUserName` 아빠·엄마)는 자녀 화면(`currentUser`·`currentChild`)만 바꾸고 이름은 유지 (2026-10-21, 로비 복귀 시 아이로 로그인되던 버그 수정) |
  | `openMissionView(type)` | 5대 미션 오버레이 열기 및 라우팅 (`storybook`, `dictation`, `voca`, `reading`, `sentence`) |
  | `closeMissionView(force)` | 오버레이 닫기, 보상 정산 및 세션 안전 종료 |
  | `renderSectionUI()` | 10문제 완료 즉각 학습일지 자동 전송 및 서브모듈 렌더러 호출 |

### 🌟 `korean_storybook.js` ([1단계] 단원 동화 도서관 전담 엔진)
민수 생각마루(5-2) 및 민서 꿈자람(1-2) 도서관 도감 렌더링과 탭 전환을 전담하는 독립 모듈입니다.
- **파일 위치**: `kids/js/korean_storybook.js` (273줄)
- **핵심 API**:
  | 메서드 | 설명 |
  | :--- | :--- |
  | `KoreanStorybook.renderLibrary(container)` | 서가 도서관 전체 UI 렌더링 |
  | `KoreanStorybook.setTab(tab)` | 전체/민수/민서 서가 탭 전환 |

### 🌟 `korean_dictation.js` ([2단계] 받아쓰기 훈련소 전담 엔진)
슬라임 음절 자석판과 직접 쓰기 하이브리드 입력, 오디오 재생, 단계적 초성 힌트, 문장 검증을 전담하는 독립 모듈입니다.
- **파일 위치**: `kids/js/korean_dictation.js` (266줄)
- **핵심 API**:
  | 메서드 | 설명 |
  | :--- | :--- |
  | `KoreanDictation.renderUI(container)` | 자석판/직접입력 훈련소 UI 렌더링 |
  | `KoreanDictation.verify()` | 슬라임 자석판 및 입력 문장 정답 검증 |
  | `KoreanDictation.setInputMode(mode)` | 'magnet' ↔ 'typing' 모드 전환 |
  | `KoreanDictation.stepHint()` | 숨김 ➔ 초성 힌트 ➔ 전체 정답 단계별 힌트 제어 |

### 🌟 `korean_voca.js` ([3단계] 국어 어휘 퀴즈 훈련소 전담 엔진)
객관식(단어->뜻 3지선다) 및 주관식(뜻->단어: 긴 단어 자석 빈칸 채우기, 다단어 객관식, 직접 입력) 퀴즈와 힌트/채점을 전담하는 독립 모듈입니다.
- **파일 위치**: `kids/js/korean_voca.js` (287줄)
- **핵심 API**:
  | 메서드 | 설명 |
  | :--- | :--- |
  | `KoreanVoca.renderUI(container)` | 어휘 퀴즈 카드 렌더링 및 음성 자동 낭독 |
  | `KoreanVoca.setMode(mode)` | 'choice'(객관식) ↔ 'subjective'(주관식) 전환 |
  | `KoreanVoca.getOrderToggleHtml(type)` | 랜덤 섞기 ↔ 순서대로 토글 버튼 HTML 생성 |

### 🌟 `korean_mini_reading.js` ([4단계] 민서(초1) 미니 독해 전담 엔진)
3~4문장 초단편 지문을 성우 TTS로 읽어 준 뒤 고정 3단계 꼬리문제(① 낱말·겹받침 → ② 인물의 생각 → ③ 글쓴이의 중심 생각)를 에러리스로 푸는 민서 전용 모듈입니다. 민수용 `reading_engine.js`와 데이터·화면을 공유하지 않는 병렬 모듈이며, 국어방 카드 `#minseoMiniReadingCard`는 민서 프로필에서만 보입니다.
- **파일 위치**: `kids/js/korean_mini_reading.js` (약 350줄) · 스타일: `kids/css/korean.css` 하단 `.mr-*`
- **데이터**: 노션 `LIBRARY_DB` 중 `트랙 = 🌱 민서 미니 독해` (`fetchReadingPassagesFromNotion` 재사용). `문제데이터` JSON 문항 = `{ step, type:"choice", question, options[], answer(보기 문자열|번호), explanation, speaker?:{name, icon, line}, label?, icon? }` (`label`·`icon`은 그 문항의 단계 이름 바꾸기, 예: '일의 차례'). 보기 속 `→`는 읽을 때 '그다음'으로 바꿔 읽는다
- **지문 그림 (2026-10-23)**: LIBRARY_DB `이미지 URL`(→ `passage.imageUrl`)이 있으면 지문 화면·이야기 다시 보기에만 스토리북 장면을 띄운다. 세로 그림을 자르지 않고 `object-fit: contain`(모바일 위 180px 카드, 640px 이상은 지문 왼쪽 190px 칸), 누르면 화면 안 확대 창(`#mrLightbox`, 아무 데나 누르거나 Esc로 닫힘). 주소가 없거나 못 불러오면 그림 칸을 지운다. 문제 카드에는 그림을 넣지 않는다. 줄별 그림 확장용으로 `passage.lineImages`(`줄별 이미지` JSON 배열)를 읽어 두며 `sceneImage(passage, lineIdx)`가 줄 그림 → 대표 그림 순으로 고른다(지금 화면은 대표 그림 1장).
- **고음질 음성**: 대본(제목·지문 줄·`questionScript(q)`)마다 `kids/assets/audio/mini_reading/<SHA-1 12자리>.mp3`를 먼저 재생, 없으면 `speakFairyTTS` 폴백. 생성: `python -X utf8 scripts/build_mini_reading_audio.py [--dry-run] [--prune]` (Edge-TTS SunHi). 자동 읽기 토글 `localStorage.mini_reading_autoplay`(`on`/`off`), 화면 전환·창 닫기 시 `KoreanMiniReading.stop()`으로 항상 멈춤.
- **등록 도구**: `python -X utf8 scripts/register_minseo_korean.py --file scripts/data/minseo_korean_<학기>_<단원>.json [--apply]` (VOCA 정제 어휘 + 미니 독해 지문을 한 번에 갱신·신규 등록, 기본 미리보기)
- **핵심 API**:
  | 메서드 | 설명 |
  | :--- | :--- |
  | `KoreanMiniReading.renderLobby(container)` | 단원별 이야기 카드 서가 (트랙 `MINI_TRACK`만 조회) |
  | `KoreanMiniReading.start(passageId)` | 지문 화면 진입 + TTS 자동 읽기 (문장 터치 시 그 문장만 다시 읽기) |
  | `KoreanMiniReading.isMissionInProgress()` | 1문제 이상 풀고 완주 전이면 true (국어방 이탈 방지 가드) |
- **보상·기록**: 첫 시도 정답 `triggerAwardDispense(1)` + `fairyPraise`, 오답은 정답 보기 노란 안내 + 해설 + `fairyEncourage`, 완주 `fairyReward` + `triggerAwardDispense(3)` + `sendStudyLogToNotion({ subject: '국어(미니독해_제목)' })`

### 🌟 `korean_sentence.js` ([5단계] AI 지문 토론방 전담 엔진)
지문별 AI 심층 토론, 생각 확장 코칭, 부모 검수 뱃지, 실시간 대화 보상을 전담하며 2026 플래그십 표준(`gemini-3.8-flash`)을 탑재한 독립 모듈입니다.
- **파일 위치**: `kids/js/korean_sentence.js` (196줄)
- **핵심 API**:
  | 메서드 | 설명 |
  | :--- | :--- |
  | `KoreanSentence.renderUI(container)` | 지문 선택 목록 렌더링 |
  | `KoreanSentence.startMission(bookId)` | 지문 토론 세션 초기화 및 채팅창 렌더링 |
  | `KoreanSentence.processInput()` | 사용자 생각 입력 처리 및 Gemini API 통신·보상 판정 |

---

## 2-4. 🔤 영어 멀티버스 전담 엔진군 (English Multiverse Engines)

전사 최고 거버넌스 헌법(규칙 7조: 골디락스 적정 응집도 300~600줄, 절대 상한 800줄 미만)에 의거하여, 기존 2,154줄의 비대했던 `english_common.js`를 1개의 초경량 대문 파사드와 4개의 전문 서브모듈로 완전 분리 구축한 엔진군입니다.

### 🌟 `english_common.js` (영어 멀티버스 대문 파사드)
오버레이 팝업 라우팅, 학년/단원 동적 필터, 퀴즈 공통 진행/채점 브리지, 4선지 공책 인쇄실, 10문제 완주 즉시 학습일지 전송을 총괄하는 초경량 라우팅 파사드입니다.
- **파일 위치**: `kids/js/english_common.js` (466줄)
- **핵심 API**:
  | 메서드 | 설명 |
  | :--- | :--- |
  | `initializeEnglishRoom()` | 자녀 프로필 동기화, 테마 설정, 0.01초 어휘/독해 백그라운드 선캐싱 |
  | `openMissionView(type)` | 6대 미션 오버레이 열기 및 라우팅 (`voca_pool`, `stage1~6`) |
  | `closeMissionView(force)` | 오버레이 닫기, 보상 정산 및 세션 안전 종료 |
  | `renderSectionUI()` | 10문제 완료 즉각 학습일지 자동 전송 및 서브모듈 렌더러 호출 |
  | `renderDictionaryUI(container)` | 4선 공책 인쇄용 어휘 체크리스트 UI 렌더링 |

### 🌟 `english_storybook.js` ([1단계] 원서/단원 동화 도서관 전담 엔진)
L7, L8, L9, L11 등 단원별 일러스트 동화 서가 도감 렌더링 및 뷰어 연결을 전담하는 독립 모듈입니다.
- **파일 위치**: `kids/js/english_storybook.js` (112줄)
- **핵심 API**:
  | 메서드 | 설명 |
  | :--- | :--- |
  | `EnglishStorybook.openModal()` | 단원 동화 도서관 서가 모달 열기 및 카드 목록 렌더링 |

### 🌟 `english_phonics.js` ([1단계 알파벳 & 3단계 파닉스] 발음 디딤돌 엔진)
초등 5학년 1~11단원 핵심 1:1 파닉스 사전, Jenny Neural TTS 음성 및 4단계 배속(0.5x~1.0x) 제어, [1단계] 알파벳 터치방, [3단계] 소리 귀 뚫기(파닉스/듣기 객관식)를 전담하는 독립 모듈입니다.
- **파일 위치**: `kids/js/english_phonics.js` (372줄)
- **핵심 API**:
  | 메서드 | 설명 |
  | :--- | :--- |
  | `EnglishPhonics.speak(text)` | Jenny Neural 0.85x 원어민 음성 재생 |
  | `EnglishPhonics.renderSentencePhonicsHtml(sent)` | 영단어 하단 1:1 수직 정렬 한글 발음 디딤돌 렌더링 |
  | `EnglishPhonics.renderStage1UI(container, item, helpers)` | [1단계] 알파벳 터치방 렌더링 |
  | `EnglishPhonics.renderStage2UI(container, item, helpers)` | [3단계] 소리 귀 뚫기 퀴즈 렌더링 |

### 🌟 `english_voca.js` ([2·3·4단계] 영어 어휘·문장 훈련소 전담 엔진)
[2단계] 단어 퐁당(3지선다 콕 터치 & 소리 듣기), [3단계] 영단어/숙어방(4종 모드 + 슬라임 철자 자석판), [4단계] 문장 조각 맞추기(단어 카드 순서 배열 + 1:1 파닉스 성공 카드)를 전담하는 독립 모듈입니다.
- **파일 위치**: `kids/js/english_voca.js` (545줄)
- **핵심 API**:
  | 메서드 | 설명 |
  | :--- | :--- |
  | `EnglishVoca.renderVocaPoolUI(container, item, helpers)` | [2단계] 단어 퐁당 3지선다 퀴즈 렌더링 |
  | `EnglishVoca.renderStage3UI(container, item, helpers)` | [3단계] 4종 모드 / 슬라임 철자 자석판 퀴즈 렌더링 |
  | `EnglishVoca.renderStage4UI(container, item, helpers)` | [4단계] 문장 조각 맞추기 블록 퀴즈 렌더링 |
  | `EnglishVoca.renderStage4SuccessCard(container, sent, mean)` | 1:1 파닉스 디딤돌 및 수동 넘김 정답 성공 카드 렌더링 |

### 🌟 `english_chat.js` ([6단계] 코코와 한 줄 인사 / AI 토론 회화 전담 엔진)
Gemini 3.8 Flash (2026 플래그십 표준) 기반 실시간 영어 롤플레잉 및 생각 확장 코칭, 지문별 대화 큐, 한글 해석 토글, 부모 검수 뱃지를 전담하는 독립 모듈입니다.
- **파일 위치**: `kids/js/english_chat.js` (229줄)
- **핵심 API**:
  | 메서드 | 설명 |
  | :--- | :--- |
  | `EnglishChat.renderSentenceUI(container, books)` | 토론 지문 선택 목록 렌더링 |
  | `EnglishChat.startSentenceMission(bookId, books)` | AI 회화 토론 세션 초기화 및 채팅창 렌더링 |
  | `EnglishChat.renderSentenceChat()` | Gemini 3.8 Flash 연동 실시간 대화창 렌더링 |

---

## 2-5. 🔬 과학 탐구방 전담 엔진군 (Science Lab Engines)

전사 최고 거버넌스 헌법(규칙 7조: 골디락스 적정 응집도 300~600줄, 절대 상한 800줄 미만)에 의거하여, 기존 1,608줄의 비대했던 `science_common.js`를 1개의 초경량 대문 파사드와 5개의 전문 서브모듈로 완전 분리 구축한 엔진군입니다.

### 🌟 `science_common.js` (과학 탐구방 대문 파사드)
오버레이 팝업 라우팅, 단원 탭 필터링, 프로필 초기화, N단원 미션 오버레이 동적 라우팅(`report_unit{N}`), 퀴즈 공통 진행 브리지, 보상 디스패처를 총괄하는 초경량 라우팅 파사드입니다.
- **파일 위치**: `kids/js/science_common.js` (465줄)
- **핵심 API**:
  | 메서드 | 설명 |
  | :--- | :--- |
  | `initializeScienceRoom()` | 자녀 프로필 동기화, 마스터 카운트 로드, 교재 DB 백그라운드 프리페치 |
  | `openMissionView(type)` | 5대 미션 오버레이 열기 및 N단원 동적 라우팅 (`storybook`, `safety`, `voca`, `lab`, `report_unit1~N`) |
  | `closeMissionView(force)` | 오버레이 닫기, 보상 정산 및 세션 안전 종료 |
  | `startScienceMissionWithFilteredData(records, container, titleStr)` | 셔플 및 필터링된 데이터 기반 미션 시작 |
  | `renderSectionUI(type, container, unitObj)` | 퀴즈 화면 렌더링 및 서브모듈 디스패치 |
  | `skipToNextScienceQuiz()` | 다음 문제 전환 및 10문제 완주 보너스 정산 |

### 🌟 `science_safety.js` ([0단계] 실험실 안전 라이선스 시험장 전담 엔진)
실험실 및 야외 탐구 안전 수칙 5문항 퀴즈, 무감점 재도전 피드백, 100% 통과 시 '공인 꼬마 과학자 골드 연구원증' 발급(+10💎)을 전담하는 독립 모듈입니다.
- **파일 위치**: `kids/js/science_safety.js` (176줄)
- **핵심 API**:
  | 메서드 | 설명 |
  | :--- | :--- |
  | `ScienceSafety.renderUI(container)` | 안전 라이선스 시험장 시작 및 첫 문제 렌더링 |
  | `ScienceSafety.renderQuestion(container, qIdx)` | 안전 수칙 문항 카드 렌더링 |
  | `ScienceSafety.submitAnswer(qIdx, selectedIdx)` | 정답 검증 및 오답 시 격려/재도전 피드백 |
  | `ScienceSafety.renderGoldCard(container)` | 골드 연구원증 발급 카드 렌더링 및 10💎 보상 수여 |

### 🌟 `science_storybook.js` ([1단계] 과학 단원 동화 도서관 전담 엔진)
교과서 0~4단원 과학 동화 1~6권 메타데이터(`SCIENCE_STORYBOOK_LIBRARY`) 관리 및 모달 도서관 서가 렌더링을 전담하는 독립 모듈입니다.
- **파일 위치**: `kids/js/science_storybook.js` (198줄)
- **핵심 API**:
  | 메서드 | 설명 |
  | :--- | :--- |
  | `ScienceStorybook.renderLibrary(container)` | 과학 단원 동화 1~6권 서가 모달 UI 렌더링 |

### 🌟 `science_voca.js` ([2단계] 과학 핵심 용어방 전담 엔진)
2단계(학년/학기 ➔ 단원) 동적 선택 UI, 단원 직결 오픈(`openScienceVocaDirect`), 초성 힌트 퀴즈 렌더러(`img` / `imageUrl` 이중 호환) 및 정답 판정을 전담하는 독립 모듈입니다.
- **파일 위치**: `kids/js/science_voca.js` (352줄)
- **핵심 API**:
  | 메서드 | 설명 |
  | :--- | :--- |
  | `ScienceVoca.renderGradeUI(grades, container)` | 1단계 학년/학기 선택 화면 렌더링 |
  | `ScienceVoca.renderUnitUI(units, container, records, grade)` | 2단계 단원 선택 화면 렌더링 (단어 수 배지 포함) |
  | `ScienceVoca.openDirect(targetGrade, targetUnit)` | 특정 단원 어휘방으로 직결 진입 헬퍼 |
  | `ScienceVoca.renderVocaQuiz(container, item, ...)` | 용어 초성 퀴즈 카드 렌더링 |
  | `ScienceVoca.verifyAnswer()` | 입력된 용어 정답 판정 및 자동 진행 트리거 |

### 🌟 `science_lab.js` ([3단계] 가상 실험실 & 교재 DB 실시간 연동 엔진)
노션 교재·사료 마스터 DB(`CURRICULUM_DB`) 실시간 쿼리 및 캐싱, 1~6단원 탐구보고서 요약문 동적 주입(`window['SCIENCE_LAB_REPORT_' + u + '_DATA']` — 기존 그래프·SVG 도해·실험실 링크·안전수칙 속성 보존 병합), 실험 퀴즈 UI 렌더러, 4지선다 정답 판정을 전담하는 독립 모듈입니다.
- **파일 위치**: `kids/js/science_lab.js` (284줄)
- **핵심 API**:
  | 메서드 | 설명 |
  | :--- | :--- |
  | `ScienceLab.fetchCurriculum()` | 노션 교재 DB에서 과학 실험실/탐구보고서 데이터 실시간 쿼리 및 캐싱 |
  | `ScienceLab.applyNotionData(items)` | 노션 데이터를 안전 라이선스 및 1~6단원 보고서 전역 데이터셋에 주입 |
  | `ScienceLab.renderExperimentUI(container, item, ...)` | 실험 분석 퀴즈 및 돋보기 뷰포트 렌더링 |
  | `ScienceLab.verifyChoice(choiceIdx, correctIdx)` | 실험 객관식 퀴즈 정답 검증 및 오답노트 적재 |

### 🌟 `science_report.js` ([4단계] 『실험관찰』 실험연계 디지털 탐구 보고서 & 서술형 빌더 전담 엔진)
1~N단원 플러그앤플레이(`window['SCIENCE_LAB_REPORT_' + unitId + '_DATA']` 및 `UNIT_THEME_DEFAULTS`) 구조로 교과서 『실험관찰』 실험연계 요약 노트(`conceptTables` 비교표, `summaryDoc` 실험 상세 분석, `hasEquilibriumGraph`·`diagramHtml` SVG 도해, `specialDeepDive` 심화 탐구, 가상 실험실 바로가기)와 참여형 탐구 미션(서술형 문장 조립 빌더·채점기준 가이드, 객관식 추론, 섞인 실험 순서 직접 조립기, 인터랙티브 별점 체크리스트), 완주 보상(+5💎)을 전담하는 독립 모듈입니다.
- **파일 위치**: `kids/js/science_report.js` (743줄)
- **실험 카드 선택 필드**: `summaryDoc` 항목의 `process`·`result`·`conclusion`·`think`는 값이 있을 때만 그립니다. `points` 배열이 있으면 글머리표 목록으로 그리고, 쪽수는 `page`가 없으면 `bookRef`를 씁니다. `specialDeepDive`의 `badge`·`subtitle`은 선택이며, 본문은 `description`이 없으면 `intro`를 씁니다.
- **핵심 API**:
  | 메서드 | 설명 |
  | :--- | :--- |
  | `ScienceReport.open(unitId)` | 1~N단원 탐구 보고서 모달 열기 (`openScienceReport(1~5)`) |
  | `ScienceReport.renderUI(container, tabName, unitId)` | 보고서 메인 화면 렌더링 (탐구 노트 ↔ 서술형·탐구 미션 탭, 단원별 테마 컬러 자동 바인딩) |
  | `ScienceReport.selectBlankWordByIdx(qIdx, optIdx)` / `clearBlankSlot(id)` | 서술형 문장 조립 빌더 구절 카드 순차 삽입 및 개별 빈칸 클릭 취소 |
  | `ScienceReport.checkBlankAnswer(qIdx)` | `q.blanks` 데이터 기반 동적 서술형/빈칸 정답 검증 및 채점 힌트 피드백 |
  | `ScienceReport.pickOrderStep(stepId)` / `checkOrderQuiz(qIdx)` | 섞인 실험 과정 카드를 1~4단계로 직접 터치 배열 및 순서 정답 검증 |
  | `ScienceReport.setStarRating(itemIdx, stars)` / `fillAllStars(count)` | 배움 확인 체크리스트 항목별 ⭐ 별점(1~3점) 인터랙티브 평가 |
  | `ScienceReport.finishAllQuiz()` | 탐구 미션 완주 보너스(+5💎) 지급 및 축하 화면 렌더링 |

### 🌟 `science_u3_engine.js` & `science_lab_common.css` (3단원 가상 실험실 공통 엔진 & 스타일)
모바일 터치 충돌(touchmove)을 원천 배제한 에러리스 스팟 조작 UI, Retina DPI 캔버스 자동 보정(숨김 탭 `.sim-viewport` 너비 폴백 지원), 백그라운드 절전 및 서브 탭 전환 시 rAF 애니메이션 루프 라이프사이클 관리, 1회성 보석 트랜잭션 잠금, 검증된 초등 과학 유튜브 클립 & 3컷 요약 아코디언, Web Audio 효과음을 전담하는 공통 기반 엔진입니다.
- **파일 위치**:
  - `kids/js/science_u3_engine.js` (375줄, `window.ScienceU3Engine`, 별칭 `window.ScienceLabEngine`)
  - `kids/css/science_lab_common.css` (681줄, 16:10 캔버스 뷰포트, 다크네이비 테마)
- **3단원 5대 가상 실험실 파일군**:
  1. `kids/subjects/science/science_thermometer_lab.html` (713줄): 3초 양손 Lerp 이동 감각 착각 & 눈높이 레이저 수평 판독기
  2. `kids/subjects/science/science_conduction_lab.html` (710줄): 스팟 셀렉터 열변색 구리판(①~④ 센서 배지) & 4종 물질(구리·알루미늄·철·유리) 버터 레이스
  3. `kids/subjects/science/science_liquid_convection_lab.html` (498줄): 타원 와류 스트림라인 유체 입자(40개) 온도-색상 보간 대류 순환기
  4. `kids/subjects/science/science_gas_convection_lab.html` (646줄): 방 단면도 에어컨/난방기 4조합 배치 히트맵·상하층 온도계 & 전열기 적외선 복사열 차광판 차단기
  5. `kids/subjects/science/science_insulation_lab.html` (650줄): 4대 단열 부품(마개, 진공, 은도금, 폼) 조립기 & 단열 점수 실시간 연동 60분 초고속 냉각 곡선 꺾은선 그래프
- **4단원 5대 가상 실험실 파일군**:
  1. `kids/subjects/science/science_wind_turbine_lab.html` (437줄): 바람 세기 4단계 조절, 날개 회전 rAF 시각화, 유도 전압(0~4.5V) 및 전구 발광 시뮬레이터
  2. `kids/subjects/science/science_resource_finite_lab.html` (450줄): 4대 자원(철·석유·담수·산림), 가채연수(철 약 54년·석유 약 53년, 출처 표기) 계산기와 캐는 양 1.5배/절반 비교, 담수·산림은 순환 자원으로 대비
  3. `kids/subjects/science/science_renewable_energy_lab.html` (434줄): 6대 청정 에너지(태양광·풍력·수력·해양·지열·바이오) 탭 스위처 및 3단계 에너지 변환 파티클 스트림
  4. `kids/subjects/science/science_energy_efficiency_lab.html` (429줄): 1~5등급 가전제품 효율 비교(1등급 35% 절전), 대기전력 차단 콘센트, LED 조명, 빗물 재활용 토글 및 월간 전기요금 산출
  5. `kids/subjects/science/science_eco_house_lab.html` (542줄): 가상 1분=실제 1초 가열(20→38℃) ➔ 소등 후 1분마다 5회 측정으로 빈 기록표 채우기, 실온 20℃ 냉각 법칙 가상 값(5분 뒤 23.0℃ vs 34.1℃)
- **핵심 API**:
  | 메서드 | 설명 |
  | :--- | :--- |
  | `ScienceU3Engine.setupCanvasDPI(canvas)` | Retina DPI 배율 감지 및 숨김 탭(`display:none`) 폴백 포함 버퍼/CSS 픽셀 동기화 |
  | `ScienceU3Engine.createLoop(renderFn)` | 백그라운드 전환 및 탭 비활성화 시 자동 절전 rAF 루프 매니저 |
  | `ScienceU3Engine.initTabs(tabsSel, panesSel, onTabChange)` | 모바일 에러리스 서브 탭 전환 및 비활성 캔버스 즉시 정지 |
  | `ScienceU3Engine.initSummaryAccordion(btnSel, contentSel)` | 유튜브 영상 임베드 오류 대비 3컷 만화 요약 아코디언 토글 |
  | `ScienceU3Engine.setupQuiz(config)` | 퀴즈 보기 무작위 섞기(①~④ 번호는 화면 순서로 다시 매김, 판정은 `data-ans`), 빈칸에 정답 문장 표시, 정답 판정, 피드백 및 1회성 보석(+5💎) 트랜잭션 잠금 |
  | `ScienceU3Engine.playSuccessFanfare()` | 도-미-솔-도 4화음 팡파르 Web Audio 신시사이저 합성 재생 |

---

## 2-6. 🗺️ 사회 역사 탐험방 전담 엔진군 (Society Multiverse Engines)

전사 최고 거버넌스 헌법(규칙 7조: 골디락스 적정 응집도 300~600줄, 절대 상한 800줄 미만)에 의거하여, 기존 1,578줄의 비대했던 `society_common.js`를 1개의 초경량 대문 파사드와 5개의 전문 서브모듈로 완전 분리 구축한 엔진군입니다.

### 🌟 `society_common.js` (사회 탐험방 대문 파사드)
프로필/테마 초기화, 노션 어휘/사료 프리패치, 미션 오버레이 라우팅, 학습일지 전송, 오늘의 요약집 인쇄를 총괄하는 초경량 라우팅 파사드입니다.
- **파일 위치**: `kids/js/society_common.js` (약 470줄)
- **핵심 API**:
  | 메서드 | 설명 |
  | :--- | :--- |
  | `initializeSocietyRoom()` | 자녀 프로필 동기화, 테마 설정, 대기실 UI 활성화 |
  | `openMissionView(type)` | 5대 미션 오버레이 열기 및 라우팅 (`storybook`, `voca`, `chart`, `map`, `history`) |
  | `closeMissionView(force)` | 오버레이 닫기, 보상 정산 및 세션 안전 종료 |
  | `fetchAndBuildDynamicUI(type)` | 노션 마스터 DB 실시간 쿼리 및 1·2단계 동적 학년/단원 렌더링 |
  | `renderSectionUI(type)` | 10문제 완주 체크 및 5대 전문 서브모듈 렌더러로 디스패치 |
  | `printSocietySummary()` | 당일 단원 핵심 용어 요약집 인쇄 모달 가동 |

### 🌟 `society_storybook.js` ([1단계] 사회 단원 동화 도서관 전담 엔진)
기후 대모험(5-1), 역사 시간 여행 1~6편(5-2 선사·고조선, 삼국·남북국, 고려, 조선 외침 극복, 유교 사회, 조선 후기) 등 총 7권의 고화질 사료 동화 서가 렌더링 및 뷰어 연동을 전담하는 독립 모듈입니다.
- **파일 위치**: `kids/js/society_storybook.js` (~220줄)
- **핵심 API**:
  | 메서드 | 설명 |
  | :--- | :--- |
  | `SocietyStorybook.render(container)` | 사회 단원 동화 서가 모달 UI 렌더링 (총 7권) |
  | `SocietyStorybook.getList()` | 등록된 사회 동화 7권 메타데이터 조회 |

### 🌟 `society_voca.js` ([2단계] 사회 용어방 전담 엔진)
초성 힌트 퀴즈, 단어 길이에 따른 3종 반응형 인터랙션(긴 단어 자석 빈칸 채우기, 3단어 이상 객관식, 주관식 타이핑), 마스터 카운트(3회 정답 시 노션 [달성] 연동)를 전담하는 독립 모듈입니다.
- **파일 위치**: `kids/js/society_voca.js` (452줄)
- **핵심 API**:
  | 메서드 | 설명 |
  | :--- | :--- |
  | `SocietyVoca.render(container, item, ...)` | 용어 퀴즈 카드 렌더링 및 음성 자동 낭독 |
  | `SocietyVoca.toggleOrder()` | 랜덤 섞기 ↔ 순서대로 풀기 모드 전환 |
  | `SocietyVoca.resetMasterAndReload()` | 현재 단원 마스터 기록 초기화 및 노션 일괄 PATCH |
  | `SocietyVoca.verifyAnswer()` / `verifyChoice()` / `verifyMagnet()` | 문항 유형별 정답 검증 및 보상 연동 |

### 🌟 `society_chart.js` ([3단계] 차트 & 도표 자료실 전담 엔진)
교과서 사료/도표/통계 이미지 분석, 4지선다 퀴즈 렌더러, 돋보기 뷰어 연동 및 정답 축하 모달을 전담하는 독립 모듈입니다.
- **파일 위치**: `kids/js/society_chart.js` (210줄)
- **핵심 API**:
  | 메서드 | 설명 |
  | :--- | :--- |
  | `SocietyChart.render(container, item, ...)` | 차트 분석 퀴즈 카드 및 돋보기 뷰포트 렌더링 |
  | `SocietyChart.verifyChoice(selectedIdx, correctIdx)` | 4지선다 객관식 채점 및 오답노트 적재 |
  | `SocietyChart.showSuccessModal(item)` | 유물 쓰임새/핵심 해설 축하 모달 팝업 |

### 🌟 `society_map.js` ([4단계] 랜선 지도 탐방실 전담 엔진)
국토 지리 명소(백두산 천지, 독도, 성산일출봉 등) 고화질 사진 탐방, 요정 코코 음성 해설 및 한 줄 탐방기 입력을 전담하는 독립 모듈입니다.
- **파일 위치**: `kids/js/society_map.js` (108줄)
- **핵심 API**:
  | 메서드 | 설명 |
  | :--- | :--- |
  | `SocietyMap.render(container, item, ...)` | 랜선 지도 탐방 뷰 렌더링 |
  | `SocietyMap.submitJourney()` | 한 줄 탐방기 작성 검증 및 여정 기록 보상 |

### 🌟 `society_history.js` ([5단계] 역사 & 문화재 돋보기 전담 엔진)
국보·보물 역사 문화재 듀얼 카드 탐구, 하단 국보 역사박물관 가랜드 도크 렌더링, 유물 수집 및 로컬 스토리지 보존을 전담하는 독립 모듈입니다.
- **파일 위치**: `kids/js/society_history.js` (152줄)
- **핵심 API**:
  | 메서드 | 설명 |
  | :--- | :--- |
  | `SocietyHistory.render(container, item, ...)` | 역사 문화재 듀얼 카드 및 박물관 쇼케이스 렌더링 |
  | `SocietyHistory.renderMuseumGridDock()` | 하단 국보 박물관 소장 가랜드 도크 렌더링 |
  | `SocietyHistory.collectArtifact(artName)` | 유물 수집, 축하 알림 및 영구 소장 처리 |

---

## 2-7. 📖 모바일 핀포인트 독해 뷰어 & 데이터 파이프라인 (Reading Engine & Pipeline)

### 🌟 `reading_engine.js` (모바일 핀포인트 독해 뷰어 엔진)
노션 독해 마스터 DB(`LIBRARY_DB`)에서 지문과 문제를 실시간 수급하여, 모바일 좁은 화면에서도 스크롤 피로 없이 1문항 슬라이스 카드 및 단락 힌트 토글 방식으로 쾌적하게 학습할 수 있도록 구현된 국어·영어 공통 독립 뷰어 엔진입니다.
- **파일 위치**: `kids/core/reading_engine.js`
- **센터 음성 현황 (2026-10-27)**: `toggleTts()` → `speakFairyTTS` → `CenterReadingAudio.play` 순으로 정적 Edge MP3를 우선 재생한다. 지문 ID가 같아도 대본·설정 해시가 달라지면 옛 파일을 사용하지 않는다. 중지·문제 전환·나가기·음성 OFF·창 닫기는 공통 `stopFairyTTS`로 취소한다. 등록·완료 기준은 [국어 명세서 §8-1](../../docs/korean_spec.md#센터-독해-등록-표준)을 따른다.
- **스타일시트**: `kids/css/reading_engine.css` (독립 정규 스타일시트, `.reading-grade-bar`, `.reading-unit-section`, `.reading-passage-card` 등)
- **핵심 아키텍처 & UX**:
  1. **공부방 표준 학년 선택 바 (`reading-grade-bar`)**: `5-1`, `5-2`, `전체보기` 단일 표준 칩을 통해 학기/학년별 정밀 필터링 제공.
  2. **단원/회차별 그룹화 서가 (`reading-unit-section`)**: 지문들이 흩어지지 않고 단원명(1단원, 2단원... / 1학기 5번...) 헤더 아래에 가지런히 그룹화 배치.
  3. **1단계 편안한 지문 정독**: Jua/Nanum 폰트 기반 가독성 + 원어민/요정 코코 TTS 음성 낭독 + `[문제 풀기 시작! ➡️]`.
  4. **2단계 1문항 집중 슬라이스 카드**: 스크롤 핑퐁 없이 1문제씩 풀고 넘기는 모바일 최적화 UX.
  5. **💡 [결정적 단서 보기 (단락 힌트)] 접이식 토글**: 스스로 생각하게 숨겼다가, 막히면 톡 눌러 해당 문맥 2~3줄만 네온 박스로 확인.
  6. **📜 [지문 전문 보기] 플로팅 바텀시트**: 문제 풀이 중 언제든 화면 하단에서 스르륵 올려보는 지문 전체 오버레이.
  7. **유연한 문항 유형 지원**: 4지선다 객관식 + 자필 주관식 대비 단답형 (초성 힌트 제공) + 정답 해설.
  8. **🛡️ 내결함성 안전망**: 노션 API 일시 점검/오프라인 시 로컬 백업 캐시(`reading_passages_cache.json`)로 자동 폴백.
- **핵심 API**:
  | 메서드 | 파라미터 | 설명 |
  | :--- | :--- | :--- |
  | `ReadingEngine.renderLobby(container, options)` | `container, [opts]` | 학년 바 및 단원별 그룹화 독해 서가 로비 렌더링 |
  | `ReadingEngine.switchGrade(gradeName)` | `gradeName` | '5-1', '5-2', 'ALL' 학년/학기 필터 즉시 전환 |
  | `ReadingEngine.switchTrack(trackName)` | `trackName` | 레거시 트랙 전환 브리지 (센터 ➔ 5-1, 교과서 ➔ 5-2 자동 매핑) |
  | `ReadingEngine.startMission(passageId)` | `passageId` | 1단계 지문 정독 화면 진입 |
  | `ReadingEngine.startQuestions()` | - | 2단계 1문항 슬라이스 퀴즈 모드 시작 |
  | `ReadingEngine.toggleHint()` | - | 💡 결정적 단서(단락 힌트) 접이식 토글 개폐 |
  | `ReadingEngine.openBottomSheet()` / `closeBottomSheet()` | - | 📜 지문 전문 바텀시트 슬라이드업/다운 제어 |
  | `ReadingEngine.chooseAnswer(selectedIdx)` | `selectedIdx` | 객관식 채점, 에러리스 코칭 및 실시간 보상 지급 |
  | `ReadingEngine.submitShortAnswer()` | - | 단답형 주관식 채점 및 초성 힌트 대조 |
  | `ReadingEngine.toggleTts()` | - | 지문 음성 낭독 재생/정지 |

### 🛠️ `scripts/register_reading_passage.py` (지문 ➔ 독해DB + VOCA_DB 원소스 멀티유즈 분리 적재 도구)
아버님이 지문과 문제를 대화창이나 파일로 전달했을 때, 단 1번의 커맨드로 노션 독해 DB에 지문/문항을 등록하고 지문 속 핵심 어휘/속담/사자성어를 노션 용어사전 DB(`VOCA_DB`)에 자동 분리 적재하는 전용 CLI 파이프라인입니다.
- **파일 위치**: `master-tower/scripts/register_reading_passage.py` (공부방 저장소 바깥, master-tower 루트 기준 실행)
- **MP3 자동 생성**: 센터 지문의 노션 저장 후 `build_center_reading_audio.process_build([data])`를 호출한다. 본문·제목·진입 안내·등록 어휘/뜻풀이의 누락 파일만 생성한다. 노션 일부 실패 또는 음성 실패 시 `status=partial`, CLI 종료 코드 1. 같은 위치의 `extract_reading_from_image.py`도 이 결과를 전달한다.
- **핵심 기능**:
  - **독해 마스터 DB 적재**: 2,000자 초과 지문/JSON을 1,900자 청크로 자동 분할하여 노션 `rich_text` 제한 완전 방어.
  - **VOCA DB 자동 분리 적재 (One-Source Multi-Use)**: 지문 속 속담, 사자성어, 개념어를 발라내어 노션 용어사전 DB(`375a2711...`)에 동시 등록 (익일 5분 퀘스트 국어 파트 및 용어방에 자동 복습 큐 형성).
  - **🛡️ 2계층 오프라인 보존 큐**: 노션 API 일시 점검(500) 시에도 `kids/data/reading_passages_cache.json`에 영구 보존하여 데이터 유실 원천 차단.
  - **전체 캐시 재등록 옵션**: master-tower 루트의 `python scripts/register_reading_passage.py --sync-pending`은 현재 캐시 전체를 새 페이지로 다시 등록하므로 중복 위험이 있다. 미등록 건을 식별하기 전에는 복구용으로 무조건 실행하지 않는다.

### 🎧 `center-reading-audio.js` / `build_center_reading_audio.py` (센터 고정 음성 공통 경로)
- **브라우저 모듈**: `kids/core/center-reading-audio.js`. 국어방·`quest_runner.html`에서 Fairy 앞에 로드한다. `CenterReadingAudio.play(text, {onEnd, onError})`는 일치 자산 재생/취소 시 true, 자산이 없으면 false를 반환한다. `stop()`은 재생·목록/해시 대기 요청을 함께 취소한다. `normalize(text)`·`hash(text, settings)`는 생성기 규격과 같다.
- **서버 없는 로컬 생성기**: master-tower의 `scripts/build_center_reading_audio.py`. `--all --from-notion`은 최신 센터 지문·민수 국어 어휘를 읽어 누락만 생성한다. `--file`·`--order`·`--book-id`는 대상 제한, `--dry-run`은 읽기 전용 계획, `--check`는 누락·변경·불량·매핑 오류 시 종료 코드 1. `full_text`·`fullText` 모두 지원한다.
- **자산**: `kids/assets/audio/center_reading/manifest.json` v2의 `settings`·`clips`·`passages`, `<SHA-256 24자리>.mp3`. 선희 `ko-KR-SunHiNeural`·속도 `+0%`·피치 `+0Hz`, 대본·설정 해시. 원문은 노션에 두고 생성 대본만 자산 목록에 기록한다. OpenAI로 대체할 수 있는 Worker 응답을 생성 원본으로 사용하지 않는다.
- **시험**: `tests/center-audio.test.mjs`(공부방 회귀 묶음), `scripts/verify_center_audio.cjs`(실제 MP3·모바일/PC·실제 러너), master-tower의 `scripts/test_center_reading_audio.py`(생성·변경·실패·등록 호출). 검증 근거는 `docs/center_audio/walkthrough.md`.

---

## 2-8. 🌱 슬기로운 하루 라이프 허브 전담 엔진군 (Haru Life Hub Engines)

전사 최고 거버넌스 헌법(규칙 7조: 골디락스 적정 응집도 300~600줄, 절대 상한 800줄 미만)에 의거하여, 기존 2,720줄의 거대했던 `haru_common.js`를 1개의 초경량 대문 파사드와 4개의 전문 서브모듈로 완전 분리 구축한 라이프 & 통합교과 엔진군입니다.

### 🌟 `haru_common.js` (하루 라이프 허브 대문 파사드)
자녀 프로필 동적 전환(민수 초5 데일리 ↔ 민서 초1 슬기로운 하루), 5대 라이프 탭 스위칭, 초고음질 요정 엔진(Edge-TTS) 음성 제어, 하늘 명화/동요 자연·예술 감상실을 총괄하는 초경량 라우팅 파사드입니다.
- **파일 위치**: `kids/subjects/haru/js/haru_common.js` (402줄)
- **핵심 API**:
  | 메서드 | 설명 |
  | :--- | :--- |
  | `setupChildProfileUI()` | 민수/민서 프로필별 텍스트, 보석/젤리 심볼, 헤더 배너 동적 전환 |
  | `switchHaruTab(tabName)` | 5대 탭 전환 및 이전 낭독 음성 즉시 정지 |
  | `speakText(text, callback)` | 초고음질 요정 엔진(Edge-TTS) 음성 발화 및 플로팅 컨트롤러 동기화 |
  | `stopAllSpeech(userInitiated)` | 진행 중인 모든 TTS 음성 즉시 중단 |
  | `renderArtTab()` | 모네/고흐 하늘 명화 및 달팽이 동요 감상실 렌더링 |

### 🌟 `haru-checkin-engine.js` ([습관] 30초 원스톱 체크인 & 저금통 엔진)
저금통 황금 코인(20칸 완주 시 마이룸 황금돼지 트로피 및 주말 가족 소원권 발급), 일주일 건강 운동 달력 스탬프, 무지개 마음 날씨, 30초 원스톱 모달 및 노션 `STUDY_LOG_DB` 자동 전송을 전담하는 독립 모듈입니다.
- **파일 위치**: `kids/subjects/haru/js/haru-checkin-engine.js` (548줄)
- **핵심 API**:
  | 메서드 | 설명 |
  | :--- | :--- |
  | `renderHabitsTab()` | 저금통, 운동 달력, 마음 날씨 3대 위젯 통합 렌더링 |
  | `recordHabitAction(name)` | 착한 행동 실천 코인 적립 (+20개 완주 마일스톤 발동) |
  | `recordWorkout(icon, name)` | 요일별 운동 스탬프 날인 및 보상 지급 |
  | `openQuickCheckInModal()` | 30초 원스톱 3단계(착한습관 ➔ 운동 ➔ 마음날씨) 체크인 모달 가동 |
  | `finishQuickCheckIn()` | 3종 동시 저장, 배너 갱신 및 노션 학습일지 비동기 적재 |

### 🌟 `haru-timeline-engine.js` ([시간] 24시간 매직 시계판 & 타임머신 엔진)
24시간/12시간 모드 전환, 동적 눈금 및 시침·분침 실시간 애니메이션, 2중 동심원 지그재그 스티커 핀 배치, 고정 루틴 vs 당일 일정 분기 저장, 추천 스티커 트레이, 나만의 일과 직접 쓰기 모달, 노션 타임머신 기록을 전담하는 독립 모듈입니다.
- **파일 위치**: `kids/subjects/haru/js/haru-timeline-engine.js` (662줄)
- **핵심 API**:
  | 메서드 | 설명 |
  | :--- | :--- |
  | `renderTimelineTab()` | 24시간 원형 시계판, 타임라인 리스트, 스티커 트레이 일괄 렌더링 |
  | `setClockHourFormat(format)` | 12시간 아날로그 ↔ 24시간 매직 시계 모드 전환 |
  | `renderClockPins()` | 2중 동심원 겹침 방지 알고리즘 기반 일정 핀 렌더링 |
  | `openCustomTimelineModal()` | 나만의 일과 직접 쓰기 모달 열기 (당일/매일/특정요일 지원) |
  | `completeTodayTimeline()` | 하루 일과 완성 판정, 보상 지급 및 노션 학습일지 자동 전송 |

### 🌟 `haru-safety-quiz.js` ([안전] 119 안전 수호대 & 닥터 코코 응급처치 엔진)
학교/계단/횡단보도 위기탈출 OX 퀴즈, 무감점 다정한 피드백, 황금 안전 지킴이 면허증 발급(+5보상), 닥터 코코 365 증상별 안심 응급처치 가이드 및 노션 학습일지 연동을 전담하는 독립 모듈입니다.
- **파일 위치**: `kids/subjects/haru/js/haru-safety-quiz.js` (305줄)
- **핵심 API**:
  | 메서드 | 설명 |
  | :--- | :--- |
  | `renderSafetyQuizQuestion(shouldSpeak)` | 119 안전 퀴즈 문항 렌더링 및 음성 해설 |
  | `handleSafetyQuizAnswer(userChoice)` | OX 정답 채점, 무감점 힌트 피드백 출력 |
  | `renderSafetyLicense()` | 황금 안전 지킴이 면허증 발급 및 노션 인증 적재 |
  | `selectFirstAidSymptom(key)` | 찰과상/혹/화상/코피/벌레물림 등 닥터 코코 처치법 렌더링 |

### 🌟 `haru-special-days.js` ([추억] 특별한 날 추억 피드 & 포토 갤러리 엔진)
학교 축제, 생일, 소풍, 현장학습 등 특별한 날 추억 피드, 고화질 사진 전체보기 팝업 모달, 다중 썸네일 스위처, 4종 감정 도장 및 직접 쓰기, 제목 인라인 수정, 신규 추억 등록을 전담하는 독립 모듈입니다.
- **파일 위치**: `kids/subjects/haru/js/haru-special-days.js` (558줄)
- **원천 (2026-10-29)**: 기본 목록은 갤러리와 같은 `kids/data/special-days-data.js`(`DEFAULT_SPECIAL_DAYS_DATA`) 하나다. `haru.html`이 `../../data/special-days-data.js?v=...`를 이 모듈보다 먼저 싣는다. `haru_data.js`에는 `specialDays.title`만 남았다(예시 3건 삭제).
- **아이별 거르기**: `window.currentChild`(minseo/minsu) 기준 `author`가 그 아이(민서/민수)이거나 `공동`·`공통`·`아빠`·`엄마`인 행사만, 날짜 최신순. localStorage `haru_special_stories_{child}`의 `evt_custom_…` 이야기·`_userEditedTitle`, 갤러리 메타 `SPECIAL_DAYS_CUSTOM_META`는 그대로 덧입힌다. 시험: `tests/haru-special-days.test.mjs`.
- **핵심 API**:
  | 메서드 | 설명 |
  | :--- | :--- |
  | `getSpecialStories()` | 지금 아이의 행사 목록 (원천 + 아이 이야기 + 제목 수정 + 갤러리 메타) |
  | `renderSpecialDaysTab()` | 특별한 날 추억 피드 카드 그리드 렌더링 |
  | `openSpecialPhotoModal(id, imgId)` | 고화질 사진 전체보기 팝업 모달 열기 |
  | `stampReaction(event, id, emoji, label)` | 추억 감정 도장 쾅 찍기 (+보상 지급) |
  | `saveEditedTitle(event, id)` | 추억 제목 인라인 즉시 수정 및 로컬 동기화 |
  | `addNewSpecialStory()` | 나만의 새로운 특별한 날 사진/글/동영상 등록 |

---

## 3. 📖 스토리북 공통 뷰어 엔진 (Storybook Viewer)

### 🌟 `storybook_engine.js` & `storybook_viewer.css`
PC 책넘김(Flipbook) 모드와 모바일 웹툰(Webtoon) 모드를 모두 지원하는 초경량 뷰어 엔진입니다.
- **파일 위치**:
  - `kids/js/storybook_engine.js`
  - `kids/css/storybook_viewer.css`
- **표준 래퍼 HTML 규격 (75줄 표준)**:
  ```html
  <!DOCTYPE html>
  <html lang="ko">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>도서명 - 민민이네 공부방</title>
    <link rel="stylesheet" href="../../css/design-system.css">
    <link rel="stylesheet" href="../../css/storybook_viewer.css">
  </head>
  <body class="storybook-body">
    <div id="storybookApp"></div>
    <script src="../../core/fairy-config.js"></script>
    <script src="../../core/fairy-tts.js"></script>
    <script src="../../core/fairy-settings-catalog.js"></script>
    <script src="../../core/fairy-engine.js"></script>
    <script src="./data/story_도서ID.js"></script>
    <script src="../../js/storybook_engine.js"></script>
  </body>
  </html>
  ```
- **기능**:
  - 완독 시 자동 보상 모달 (+3💎/🍬, +10 EXP) 지급.
  - PC에서는 2200x1700 양면 펼침면 e-Book 뷰, 모바일에서는 스크롤 웹툰 뷰 자동 감지.
  - 백그라운드 오디오 BGM 및 Edge-TTS 음성 동기화.

---

## 4. 🤖 자동화 빌더 스크립트 도감 (Automation Scripts)

### 🌟 `scripts/build_storybook.py` (원클릭 스토리북 빌더 & 자동 배포기)
노트북LM/Gemini 지문과 삽화 이미지를 입력받아 양면 펼침면 합성, TTS MP3, JS 데이터, HTML 뷰어 생성부터 **무결성 검증(`ai_verify`), kids-archive & kids-school 깃 푸시, 노션 타임라인 연동까지 원스톱으로 처리하는 올인원 빌더**입니다.
- **실행 커맨드**:
  ```bash
  python scripts/build_storybook.py \
    --subject {korean|math|english|science|society|haru} \
    --child {minsu|minseo} \
    --grade {5-2|1-2} \
    --unit {단원} \
    --book-id {도서ID} \
    --title "도서명" \
    --text-file "지문경로.txt" \
    --img-dir "삽화폴더경로" \
    [--deploy (기본 활성화: 깃 푸시 + 노션 기록까지 완결)]
  ```

### 🌟 `scripts/build_gallery.py` (성장 아카이브 동기화 빌더)
아이들의 신규 그림, 상장, 사진을 영구 보존용 `kids-archive` 레포지토리로 전송하고 공부방 갤러리 메타데이터를 일괄 동기화합니다. `archive-master-data.js`를 다시 쓸 때 특별한 날 항목(`id`가 `evt_`로 시작)은 기존 파일에서 그대로 이어 붙입니다(작품 스캔으로 다시 만들 수 없음).
- **실행 커맨드**:
  ```bash
  python scripts/build_gallery.py
  ```

### 🌟 `scripts/add_activity_photo.py` (특별한 날 등록 빌더, 2026-10-29 개편)
특별한 날 등록의 파일 작업 본체입니다. 공식 입구는 관제탑 `scripts/sync_quick_upload.py --cat "특별한 날"`(노션·큐·Git)이고, 입구가 importlib로 이 모듈을 불러 씁니다. 단독 실행은 `--dry-run` 미리보기나 노션 없이 파일만 맞출 때 씁니다. 상세: [`docs/gallery_archive_spec.md` §5](../../docs/gallery_archive_spec.md).
- **하는 일**: EXIF 회전 보정·긴 변 1200px JPEG → `kids-archive/assets/media/{minseo|minsu|together}/activities/{아이}_{YYYYMMDD}_{slug}_{NN}.jpg`, 로컬 영상 복사(또는 http 주소 연결), `kids/data/special-days-data.js` id upsert(같은 id 재실행 = 덮어쓰기, `likes`·`stickers`·`comments` 보존, 신규는 날짜 순서 자리), `archive-master-data.js` 같은 id upsert, `haru.html`·`gallery.html`의 `special-days-data.js?v=` 갱신. 날짜 기본값은 KST 오늘.
- **id 계약**: `evt_{minseo|minsu|together}_{slug}_{YYYYMMDD}`. 작성자 `민서`·`민수`·`공동`·`공통`·`아빠`·`엄마`(뒤의 넷은 together 폴더). slug는 `--slug`(영문) 우선, 없으면 첫 사진 파일 이름(폰 사진 `20261030_143012.jpg` → `photo_143012`).
- **핵심 API** (입구가 사용): `build_plan(author, title, desc, date, files, category, icon, slug, event_id, video, video_btn)` → `Plan`(검증만, 쓰기 없음) · `apply_plan(plan, school_root, archive_root, dry_run=False)` → 바뀐 파일 상대경로 `{'school': [...], 'archive': [...]}` · `print_plan(plan, changed)` · `group_queue_items(items)`(같은 작성자·날짜·메모 = 한 행사) · `queue_group_plan(group)`.
- **데이터 형식**: `special-days-data.js`의 배열 본문은 JSON(따옴표 키)으로 유지한다. 빌더가 정규식 `const DEFAULT_SPECIAL_DAYS_DATA = ([...]);`로 읽고 `json.dumps(indent=2)`로 다시 쓴다.
- **실행 커맨드**:
  ```bash
  python -X utf8 scripts/add_activity_photo.py --dry-run --author 민서 --date 2026-10-22 --slug pet_trainer --category "학교행사/운동회" --icon "🐕" --title "🐕 제목" --desc "본문" --file "a.jpg" --sub-files "b.jpg,c.jpg" --video "https://..."
  ```

### 🌟 `scripts/log_dev_timeline.py` & `scripts/manage_study_board.py`
개발 및 유지보수 이력을 노션 4계층 개발 타임라인 DB와 로드맵/칸반 현황판 DB에 동기화합니다.
- **실행 커맨드**:
  ```bash
  python scripts/log_dev_timeline.py --part "공부방" --title "작업 내용" --board-card "과제명" --board-status "완료"
  python scripts/manage_study_board.py --list
  ```

---

## 5. 🎨 공통 스타일 & UI 컴포넌트 (Design System)

### 🌟 `kids/css/design-system.css`
- **폰트**: `'Jua', 'Noto Sans KR', sans-serif`
- **과목 테마 색상 팔레트**:
  - 국어: `#ec4899` (`--subj-korean`)
  - 수학: `#f59e0b` (`--subj-math`)
  - 영어: `#3b82f6` (`--subj-english`)
  - 과학: `#10b981` (`--subj-science`)
  - 사회: `#d97706` (`--subj-society`)
  - 하루/생활: `#2ed573` (`--subj-haru`)
- **표준 공통 컴포넌트 클래스**:
  - **버튼**: `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-success`, `.btn-accent`, `.btn-warning`, `.btn-danger`, `.btn-icon`, `.btn-sm`, `.btn-lg`
  - **카드**: `.card`, `.card-glass` (글래스모피즘), `.card-interactive` (호버 반응), `.card-header`, `.card-body`
  - **배지/칩**: `.badge`, `.badge-gem` (보석), `.badge-candy` (사탕), `.badge-exp` (경험치), `.chip` (필터 칩)
  - **모달/오버레이**: `.modal-backdrop`, `.modal-dialog`, `.modal-header`, `.modal-title`, `.modal-body`, `.modal-footer`, `.modal-close-btn`
  - **로딩/피드백**: `.spinner`, `.loading-spinner`, `.loading-overlay`
  - **말풍선/유틸리티**: `.webtoon-dialogue`, `.flex-center`, `.flex-between`, `.text-center`

---

## 6. ⚙️ 공부방 통합 맞춤 설정 & 3대 도감 (Settings & Catalogs)

### 🌟 `fairy-settings-catalog.js` & `fairy-settings-engine.js`
목소리 톤(페르소나), BGM 플레이리스트, 테마 스킨을 데이터 카탈로그 형태로 관리하고 글래스모피즘 모달을 동적으로 조립하는 통합 설정 코어입니다.
- **파일 위치**:
  - `kids/core/fairy-settings-catalog.js` (3대 도감 스키마)
  - `kids/core/fairy-settings-engine.js` (설정 매니저 & UI 렌더러)
  - `kids/css/fairy-settings-modal.css` (반응형 모달 디자인)
- **HTML 로드 방법**:
  ```html
  <link rel="stylesheet" href="./kids/css/fairy-settings-modal.css">
  <script src="./kids/core/fairy-tts.js?v=20261028-tts"></script> <!-- 말하기 속도 단추·미리듣기 -->
  <script src="./kids/core/fairy-settings-catalog.js"></script>
  <script src="./kids/core/fairy-settings-engine.js"></script>
  ```
- **말하기 속도 (2026-10-28~)**: 설정창 '🗣️ 말하기 속도'에 한국어(느리게 0.85·보통 1.0·빠르게 1.15)와 영어(0.5·0.75·0.85·1배) 단추. 누르면 그 속도로 한 문장 들려준다. 값은 아이별 설정(`korean_speech_rate`·`english_speech_rate`)에 저장되고 노션 인벤토리 「학습설정」 `appSettings`에도 함께 저장된다.
- **핵심 API**:
  | 메서드 | 설명 |
  | :--- | :--- |
  | `SettingsManager.openModal()` | 설정 모달 열기 및 학생 맞춤형 동적 렌더링 |
  | `SettingsManager.closeModal()` | 설정 모달 닫기 및 오디오 미리듣기 정리 |
  | `SettingsManager.get(key)` | 단일 설정값 조회 (`voice_persona`, `sfx_enabled`, `theme_skin` 등) |
  | `SettingsManager.set(key, val)` | 단일 설정값 저장 (`MINMIN_APP_SETTINGS` 로컬스토리지 싱크) |
  | `SettingsManager.playPreview(id, btn)` | 해당 목소리 페르소나의 대표 음성 0.05초 즉각 미리듣기 |
- **새 목소리 추가**: ① `scripts/generate_gemini_voices.py`(master-tower)의 `STYLES`에 목소리 이름·스타일 문구를, `VOICE_SCRIPTS`에 문장 13개(첫인사 1·정답 5·오답 4·완주 1·힌트 2)를 넣고 생성 → `kids/assets/voices/{voiceDir}/` ② `VOICE_CATALOG`에 `voiceDir`·`target`·`previewFile`·`files: { welcome: 1, correct: 5, wrong: 4, clear: 1, hint: 2 }` 항목 추가. 생성한 음성은 직접 들어 보고 확인한다(기계 검사는 받아쓰기로 대본과 같은지까지만). 엔진 코드는 고치지 않는다. `files`가 없는 항목은 설정창에서 '준비중'으로 잠긴다.

### 🌟 `scripts/generate_gemini_voices.py` (Gemini 3.8 Flash 커스텀 보이스 양산기)
Google AI Studio에서 생성한 커스텀 보이스(`깐죽이 3` 등)와 고품질 연극 디렉팅 프롬프트를 바탕으로 대사 리스트를 개별 `.wav` 오디오 파일로 일괄 양산하는 자동화 빌더입니다.
- **실행 커맨드**:
  ```bash
  python scripts/generate_gemini_voices.py
  ```

---

## 7. 🎨 성장 아카이브 & 갤러리 코어 (Gallery & Growth Archive)

### 🌟 `gallery_controller.js` & `gallery.css` (성장 아카이브 뷰어 컨트롤러)
2,600줄에 달하던 `gallery.html`을 295줄의 초경량 래퍼로 다이어트하고 분리한 단일 책임 갤러리 전용 컨트롤러 및 반응형 스타일시트입니다.
- **파일 위치**:
  - `kids/common_space/gallery_controller.js` (갤러리 렌더링/이벤트 컨트롤러, IIFE 격리)
  - `kids/common_space/gallery.css` (3D 카드, 필터 바, 라이트박스 전용 스타일)
- **HTML 로드 방법**:
  ```html
  <link rel="stylesheet" href="./gallery.css">
  <script src="./gallery_controller.js"></script>
  ```
- **핵심 API**:
  | 메서드 | 파라미터 | 설명 |
  | :--- | :--- | :--- |
  | `GalleryController.init()` | - | 갤러리 초기 렌더링, URL 파라미터 파싱 및 이벤트 리스너 바인딩 |
  | `GalleryController.filterGallery(category)` | `category` | 전체, 그림, 상장, 일기, 사진 등 카테고리별 동적 필터링 |
  | `GalleryController.openLightbox(item)` | `item` | 고화질 원본 이미지/동영상 확대 라이트박스 팝업 열기 |
  | `GalleryController.closeLightbox()` | - | 라이트박스 팝업 닫기 및 동영상 재생 정지 |

---

## 8. 🏰 관제탑 프론트엔드 모듈 (Master Tower Frontend Modules)

### 🌟 `lifelog_quick_modal.js` (관제탑 원클릭 라이프로그 모달 컨트롤러)
관제탑 메인 대시보드(`index.html`)에서 일상/사색/운동/식단 라이프로그를 원클릭으로 노션 메인 라이프로그 DB(`392a27115b6880dba5eede7ff33a22b9`)에 안전 전송하는 독립 모달 컨트롤러입니다.
- **파일 위치**: `js/lifelog_quick_modal.js` (관제탑 루트)
- **HTML 로드 방법**:
  ```html
  <script src="./js/lifelog_quick_modal.js"></script>
  ```
- **핵심 API**:
  | 메서드 | 파라미터 | 설명 |
  | :--- | :--- | :--- |
  | `LifelogQuickModal.openModal(defaultCategory)` | `[category]` | 빠른 라이프로그 입력 모달 열기 및 카테고리 기본 선택 |
  | `LifelogQuickModal.closeModal()` | - | 모달 닫기 및 폼 입력 초기화 |
  | `LifelogQuickModal.submitLog()` | - | 관제탑 백엔드 API(`/api/notion/lifelog`)로 전송 및 실시간 토스트 피드백 |

---

## 9. ⏰ 생활 루틴 & 시간표 코어 (Daily Life & Routine Engines)

### 🌟 `screentime-tracker.js` (스크린타임 트래커 & 차액 정산 엔진)
아이들의 태블릿 학습 및 자유시간 이용시간을 정밀 추적하고, 보너스 적립 및 잔여 시간을 실시간 계산하는 엔진입니다.
- **파일 위치**: `kids/core/screentime-tracker.js`
- **핵심 API**:
  | 메서드 | 파라미터 | 설명 |
  | :--- | :--- | :--- |
  | `ScreenTimeTracker.startTracking(user)` | `user` | 학생별 세션 타이머 시작 및 잔여 시간 계산 |
  | `ScreenTimeTracker.stopTracking()` | - | 학습 세션 정지 및 차액 정산 데이터 로컬/노션 기록 |
  | `ScreenTimeTracker.addBonusTime(mins, reason)` | `mins, reason` | 미션 달성 보너스 시간 추가 적립 |

### 🌟 `timetable-boost.js` & `timetable_controller.js` (시간표 부스트 엔진)
주간 시간표를 노션에서 프리패치하여 오늘 배울 과목과 숙제를 로비 헤더에 원터치 칩으로 띄워주는 부스트 엔진입니다.
- **파일 위치**:
  - `kids/core/timetable-boost.js` (시간표 프리패치 & 캐시 엔진)
  - `kids/js/timetable_controller.js` (주간/일간 시간표 뷰어 컨트롤러)
- **핵심 API**:
  | 메서드 | 설명 |
  | :--- | :--- |
  | `TimetableBoost.getTodaySchedule(user)` | 오늘 요일 기준 수업/학원 시간표 배열 반환 |
  | `TimetableBoost.renderHeaderChips(container)` | 로비 상단에 오늘 수업 칩 동적 렌더링 |

### 🌟 `daily-diary.js` & `quick-uploader.js` (하루 마음일기 & 모바일 퀵업로더 파이프라인 2.1)
아이들의 날씨/기분 선택형 마음일기 기록 및 스마트폰 현장 촬영 사진을 Cloudflare Worker 미디어 큐 및 노션 DB로 즉시 전송하는 고속 파이프라인 모듈입니다.
- **파일 위치**:
  - `kids/core/daily-diary.js` (하루 마음일기 모달 & 감정 스티커)
  - `kids/core/quick-uploader.js` (모바일 사진 촬영 & 퀵업로더 프론트엔드)
  - 관제탑 저장소 `master-tower/workers/minmin-notion/worker.js` (공용 Worker · 미디어 수신 `/api/upload-media`, 큐 조회 `/api/pending-media`)
  - `scripts/sync_quick_upload.py` (PC 원클릭 폰 사진 다운로드 ➔ 갤러리 최적화 ➔ Git/Notion 동기화 완결)
- **파이프라인 2.1 아키텍처**:
  1. **스마트폰 촬영/선택**: 캔버스 1200px 경량 고화질(JPEG 82%) 압축 ➔ Cloudflare Worker `/api/upload-media` 단 1회 전송.
  2. **워커 자동 처리**: 노션 갤러리 DB(`3dfa2711...`) `[퀵업로드]` 임시 카드 생성 ➔ 그 카드 번호(`notionPageId`, Worker v4.5~)와 함께 큐 보관(L2 Cache API 7일 보존) (GitHub Secret 가용 시 다이렉트 커밋 지원).
  3. **PC 일괄 완결**: `python scripts/sync_quick_upload.py` 실행 시 워커 대기 큐에서 폰 사진 자동 다운로드 ➔ `build_gallery.py` ➔ 작품 임시 카드의 `식별ID`를 `art_...`로 변경 ➔ `kids-archive` & `kids-school` 깃 푸시까지 한 번에 완결. 노션까지 성공한 항목만 큐에서 지운다.
- **일기장 노션 동기화 (`daily-diary.js`)**: `syncDiariesFromNotion(childName)` ➔ `fetchNotionDiaries`(구분 `마음일기`·`일기`·`종이일기`, 주인공 `{아이}`+`부모관리자`) ➔ `mergeNotionDiariesIntoLocal(remotes, childName)`. 신규 DB 전체 결과일 때는 `pruneStaleNotionEntries`가 노션에 없는 그 아이의 연동 캐시 항목을 지운다(미업로드·10분 이내 항목 보존). 상세 규칙은 `docs/timetable_diary_spec.md` DB 3. 검증: `node scripts/verify_diary_sync.js` (실제 노션 조회까지 `--live`, 다른 버전은 `--file <경로>`).
- **핵심 API**:
  | 메서드 / 스크립트 | 설명 |
  | :--- | :--- |
  | `window.openQuickUploader(options)` | 퀵업로더 모달 열기 (`defaultAuthor`, `defaultCategory` 지정 가능) |
  | `POST /api/upload-media` | Base64 이미지 바이너리 + 메타데이터 수신 및 큐/노션 원스톱 처리 |
  | `GET /api/pending-media?include_data=true` | 미처리 폰 사진 목록 및 바이너리 일괄 조회 |
  | `DELETE /api/pending-media?id=...` | PC 동기화 완료 후 워커 큐에서 삭제 |
  | `python scripts/sync_quick_upload.py` | 폰 사진 자동 수신부터 갤러리 배포까지 전 과정 원클릭 자동화 |
---

## 10. 🧭 에이전트 내비게이션 & 개발 도구 (Agent Navigation & Dev Tools)

### 🌟 에이전트 진입 파일 & 작업별 스킬 (2026-10-15)
여러 AI 도구가 같은 헌법을 읽도록 연결 파일만 두고, 본문은 한 벌만 유지합니다.
- **`AGENTS.md`** (Codex 등 공통 진입): `GEMINI.md` → 상위 `../GEMINI.md` → 본 카탈로그 순서로 읽으라는 안내와 이 PC의 실행·검증 메모(Node 없음, Worker 403·CORS 함정, 운영 DB 보호). 규칙 본문은 쓰지 않습니다.
- **`CLAUDE.md`** (Claude Code 자동 로드): `@GEMINI.md`, `@AGENTS.md` 불러오기만 합니다.
- **작업별 스킬**: 원본 `.agent/skills/<스킬>/SKILL.md`, Claude Code용 사본 `.claude/skills/`. 스킬에는 작업 절차·함정만 두고, 파일·API 사실 정보는 본 카탈로그를 가리킵니다.
  - `quest-engine-spec`: 5분 퀘스트 3·3·3 마스터리 작업 절차·검증·함정
- **`scripts/sync_agent_skills.py`**: 원본을 사본으로 복사하고, `--check` 모드에서는 두 벌이 다르면 목록과 함께 종료 코드 1을 냅니다(줄바꿈 차이는 무시).
  ```bash
  python scripts/sync_agent_skills.py          # 원본 → 사본 동기화
  python scripts/sync_agent_skills.py --check  # 커밋 전 일치 확인
  ```
- 동기화를 실행할 때마다 아래 **시스템 조감도**의 기준일과 스킬 카드 요약도 함께 갱신합니다. `--check`는 조감도 스킬 요약이 원본과 다르면 실패하고, 기준일만 다르면 안내만 합니다.

### 🌟 `minmin_system_map.html` + `scripts/data/system_map_data.js` (시스템 아키텍처 조감도, 2026-10-21)
입력 스크립트 → 스킬·명세 → 프론트 모듈 → 파이프라인·캐시 → 노션 DB 5열 배선도, 증상별 디버깅 지시문, 노션 DB 규칙 사전을 한 화면에 보여 주는 부모·에이전트용 지도입니다. 화면은 빈 그릇이고 내용은 데이터 파일 한 벌에서 읽습니다.
- **파일 위치**: `minmin_system_map.html` (저장소 루트, 렌더러), `scripts/data/system_map_data.js` (데이터)
- **데이터 구조**:
  | 전역 | 관리 방식 | 내용 |
  | :--- | :--- | :--- |
  | `window.SYSTEM_MAP_DATA` | 손으로 관리 | `domains`(필터 탭), `nodes`(`id`·`col`·`domain[]`·`badge`·`title`·`path`·`summary`·`guardrails`(최대 3줄)·`agentPrompt`, 스킬 카드는 `skill` 이름), `edges`(`[from, to]`, 왼쪽 열 → 오른쪽 열만), `troubles` |
  | `window.SYSTEM_MAP_AUTO` | `sync_agent_skills.py`가 `// <AUTO-SYNC:START>`~`END` 사이만 다시 씀 | `lastUpdated`·`catalogUpdatedAt`(본 카탈로그의 git 마지막 커밋 시각, 미커밋 수정이 있으면 파일 수정 시각), `skills`(SKILL.md frontmatter의 name·description을 150자 이내로 요약) |
- **합치기 규칙**: 데이터 파일 끝의 IIFE가 `SYSTEM_MAP_AUTO`를 `SYSTEM_MAP_DATA`에 합칩니다. `skill` 이름이 같은 카드는 요약·경로를 덮어쓰고, 지도에 없는 새 스킬은 2열에 `Skill (신규)` 카드로 자동 추가합니다(연결선은 사람이 추가).
- **주의**: 데이터 문자열에 큰따옴표(`"`)를 넣지 않습니다(복사 버튼 `onclick` 속성이 깨짐). 카드 `path`는 master-tower 루트 기준 경로입니다. 새 과목·모듈을 추가하면 `domains`·`nodes`·`edges`를 함께 갱신합니다.

### 🌟 `scripts/agent_navi.py` (에이전트 스마트 내비게이션 & 아키텍처 라우터)
본 카탈로그(`CORE_CATALOG.md`)를 실시간으로 직접 파싱하여, 에이전트가 작업 목표를 입력했을 때 최적의 부품 레시피, 권장 경로, 거버넌스 가드를 0.05초 만에 안내하는 스마트 GPS 도구입니다.
- **파일 위치**: `scripts/agent_navi.py` (관제탑 루트)
- **실행 커맨드**:
  ```bash
  python scripts/agent_navi.py "작업 목표 또는 만들고자 하는 기능"
  python scripts/agent_navi.py --list
  ```
- **특징**: `CORE_CATALOG.md`를 런타임에 동적으로 읽어 들이므로, 카탈로그가 수정/추가/삭제되는 즉시 변경사항이 100% 실시간(Zero Drift)으로 네비게이션에 반영됩니다.

### 🌟 `scripts/check_session_stats.py` (대화방 세션 건강도 & 압축 진단 초경량 도구)
모든 대화방에서 토큰 소모 없이 0.05초 만에 압축(Compaction) 횟수, 총 스텝 수, 대화 턴 수, 세션 건강도(🟢 짱짱함 등)를 4줄 요약 박스로 출력하는 전사 공통 도구입니다.
- **파일 위치**: `scripts/check_session_stats.py` (관제탑 루트)
- **실행 커맨드**:
  ```bash
  python scripts/check_session_stats.py          # 현재/최근 활성 대화방 진단
  python scripts/check_session_stats.py --all    # 전체 35개 대화방 현황 테이블
  python scripts/check_session_stats.py [ID]     # 특정 대화방 진단
  ```

### 🌟 `scripts/sync_quick_upload.py` (모바일 퀵업로드 · 갤러리 작품 원클릭 파이프라인 v2.2)
모바일 퀵업로드 대기 큐 감지 또는 PC 로컬 사진(`--file`, `--sub-files`)·동영상(`--video`)을 최적화하여 `kids-archive` CDN 배포, `gallery-data.js` 갱신, `gallery.html?v=...` 캐시 버스팅, 노션 `3dfa2711...` 작품 카드 Upsert(`식별ID` 1:1 매칭 + 당일 일상 `392a...` 연동), 양쪽 깃허브 푸시까지 1회 실행으로 끝내는 작품 등록 도구입니다. 노션 등록이 실패하면 오류 원문을 보여 주고 종료 코드 1. 특별한 날(큐 `구분: 특별한 날`, PC `--cat "특별한 날"`)도 이 입구로 받아 빌더 `kids-school-main/scripts/add_activity_photo.py`에 넘기고, 노션 카드를 `식별ID=evt_…`·`구분: 특별한 날`로 맞춥니다(`gallery_card_props(..., kind)`, `upsert_notion_gallery_card(..., kind=)`, `link_quick_upload_card(..., kind=)`, `register_special_days(...)`). `--dry-run`은 특별한 날에서만 되며 큐·파일·Git·노션을 건드리지 않습니다. 상세 규격은 [`docs/gallery_archive_spec.md`](../../docs/gallery_archive_spec.md) 참조.
- **파일 위치**: `scripts/sync_quick_upload.py` (관제탑 루트)
- **실행 커맨드**:
  ```bash
  # 1. 폰 퀵업로드 대기 큐 자동 수신 & 일괄 배포
  python -X utf8 scripts/sync_quick_upload.py

  # 2. PC 로컬 단일/다중 사진 + MP4 영상 묶음 [갤러리 작품] 등록
  python -X utf8 scripts/sync_quick_upload.py --author "민수" --cat "만들기/공예" --date "2026-10-25" --id "art_minsu_20261020_moodlight_real" --title "작품명" --file "메인사진.jpg" --sub-files "서브사진.jpg" --video "회전영상.mp4" --note "설명"

  # 3. PC 사진 [특별한 날] 등록 (먼저 --dry-run)
  python -X utf8 scripts/sync_quick_upload.py --cat "특별한 날" --dry-run --author "민서" --date "2026-10-22" --slug pet_trainer --event-cat "학교행사/운동회" --icon "🐕" --title "🐕 제목" --note "알림장 본문" --file "a.jpg" --sub-files "b.jpg"
  ```

### 🌟 `scripts/extract_reading_from_image.py` (교재 사진 기반 지문·문제·VOCA 추출 파이프라인)
대화방 크레딧(토큰) 소모 0원으로 Google AI Studio의 `gemini-3.8-flash` Vision API를 직접 호출하여, 학습지/교재 사진 속 지문 본문(단락 보존), 핀포인트 4+1 퀴즈(객관식/단답형), 핵심 어휘/속담을 완벽 추출하고 노션 독해 DB(`LIBRARY_DB`) 및 용어사전 DB(`VOCA_DB`)에 원클릭 자동 적재하는 올인원 도구입니다.
- **파일 위치**: `scripts/extract_reading_from_image.py` (관제탑 루트)
- **실행 커맨드**:
  ```bash
  # 1장 또는 여러 장의 교재 사진 지정 후 즉시 등록
  python scripts/extract_reading_from_image.py --images "사진1.jpg" "사진2.jpg"

  # 순번/과목 수동 지정
  python scripts/extract_reading_from_image.py --images "지문.jpg" --order 30 --subject "국어"

  # 노션 등록 없이 추출 내용만 미리보기
  python scripts/extract_reading_from_image.py --images "지문.jpg" --dry-run
  ```
- **연동 모듈**: `scripts/register_reading_passage.py` (노션 독해·VOCA 원소스 멀티유즈 엔진)



## 활동 시간 계측 (2026-10-10)

- `kids/core/study-activity.js`: 공통 활동 측정, 노션 배치 큐, 오프라인 복구. Guardian 저장소 `learning/study-activity.js`와 동일한 파일.
- 자동 로드: `core.js`, `notion-helper.js`, 기존 `notion-reward.js`, 동화 뷰어 `kids/js/storybook_engine.js`.
- API: `window.StudyActivity.flush()`, `setPhase('quiz'|'study'|'paused')`, `meter.getTodayMinutes('민수'|'민서')`, `measuredMinutes(pages, child, kstDate)`.
- 90초 무활동·숨김·포커스 이탈·절전·완료 화면은 중지. 수동 동화 낭독은 최대 10분. 과목 허브·놀이터·체크인·인쇄는 제외.
- 노션 `활동측정` rich_text에는 v2 UUID·study/quiz·UTC 밀리초 구간을 기록. 실제 소요시간은 이 기록에만 저장하며, 오답/완료 보고의 소요시간은 0.
- 자유시간은 공부·풀이 구간 합집합으로 1:1 자동 지급, 초를 모아 분 단위 지급. 보석/사탕 보상과 부모 추가 내역은 아이 정산 화면에 노출하지 않음.



## 민민 가디언 부모 관리 연결 (2026-10-11)

- 화면 연결 부품: `kids/js/parent_dashboard.js`의 `renderScreenTimeWidget(childName)`과 `parent_dashboard.html`의 자녀별 가디언 링크.
- 전용 관리 화면: https://kids-screen-guardian.awslike6.workers.dev/parent. 프로필은 진입 메뉴이며 실제 권한은 서버의 부모 세션으로 결정합니다.
- 구현 원천: 관제탑 `kids-screen-guardian/worker/src/parent-auth.js`(일회 로그인·14일 HttpOnly 세션·동일 쿠키 연장·역할·해제), `parent-portal.js`(HTML/CSS·브라우저 소스 제공), `parent-client.js`(브라우저 JS 문자열·로그인·미확정 요청 재시도), `index.js`(정산·명령 영수증 원자 저장).
- API: `GET /api/parent/summary`, `POST /api/parent/grant`(child/minutes/requestId), `POST /api/parent/lock`(child/isLocked/requestId). 추가·잠금은 아빠 인증 필요, 엄마는 조회만 허용합니다.
- 학습은 활동 초 구간에 따라 자동 지급되며 부모 승인·10분 올림·통화 보상으로 가디언 시간을 중복 충전하지 않습니다. 기존 인벤토리 설정 PATCH와 /api/screentime 보너스 쓰기를 사용하지 않습니다.
- 부모 로그인 코드 발급·분실 기기 로그인 해제는 관제탑 `kids-screen-guardian/worker/admin.ps1`의 browser-code/browser-revoke를 사용합니다. 부모 비밀키는 공개 공부방 JS에 전달하지 않습니다.

- 로그인 연장: POST /api/parent/renew JSON {}. 아빠·엄마 모두 자신의 유효 세션으로 실행할 수 있습니다. 화면 열기/새로고침 때 잔여 7일 이하이면 자동으로 현재부터 14일 갱신, 로그인 연장 버튼으로 수동 갱신·만료일 표시. 만료/로그아웃 후 새 코드 필요. 자녀 시간·잠금·권한 변경 없음.

## 민민 가디언 Windows 작업 지시서 (예정 기능, 2026-10-11)

- 문서 원천: 관제탑 kids-screen-guardian/docs/windows/README.md, contract.md, tasks.json, tasks/W00.md~W42.md 및 H01.md~H10.md. Windows 구현은 시작 전이며 부모 웹의 PC 로그인과 별개입니다.
- 지시 출력 도구: docs/windows/make-packet.mjs. --check는53개 카드의 구조를 검사하고 ID 인자는 해당 카드와 공통 요약·직접 선행 receipt만 출력합니다. 선행 accepted·확인 커밋·검증 증거·고정 receipt가 없으면 다음 작업을 거부합니다.
- 예정 모듈: Windows Core 정산, Service 키/권한·SID, Session 감지, MV3 확장, Native Host, Admin 등록, 설치/복구. 현재 런타임 모듈이 존재하거나 검증됐다고 해석하지 않습니다.
- 기존 /api/pair·/api/screentime·/api/usage 누적 장부를 재사용하고 자정60분·학습1:1·부모 추가 출처 숨김을 유지합니다. 엄격한 다중 기기 예약은 H단계의 Worker·Android 변경까지 별도 완료해야 합니다.

## 민민 가디언 공부방 오차단 수정 (Android v2.1.1, 2026-10-11)

- 원천: 관제탑 kids-screen-guardian/app/src/main/java/com/awslike6/screenguardian/BrowserPolicy.java와 ScreenGuardianService.java.
- BrowserPolicy.update(pkg, windowId, address, editingAddress)는 접근성 창별 유튜브 상태를 유지합니다. isRestricted는 등록된 네이티브 앱 또는 확인된 YOUTUBE만 제한하며 UNKNOWN은 제외합니다. reset은 앱/창·화면 잠금·서비스 중단의 이전 판정을 초기화합니다.
- 주소 없는 공부방/PWA·새 탭·주소 입력은 잔액 0/부모 잠금만으로 차단·차감하지 않습니다. 입력 문자열은 방문 주소로 신뢰하지 않습니다. 일반·학습 URL도 제외하며 기존 누적 장부·학습1:1·자정60분은 유지합니다.
- 확인된 유튜브는 같은 창의 숨겨진 주소에서도 유지합니다. 처음부터 읽지 못하는 유튜브·전체 화면 창 ID 변경은 DNS VPN과 실제 기기에서 별도 실증/보강해야 합니다. 수정 APK 설치와 실기기 학습/제한 확인은 별개입니다.
- APK versionCode4/versionName2.1.1, Actions artifact KidsScreenGuardian-v2.1.1. 검사 근거는 Guardian walkthrough.md를 참조합니다.

## Windows W00 환경 검토 승인 (2026-10-11)

- 원천: 관제탑 kids-screen-guardian/docs/windows/environment.md, receipts/W00.md, progress.json. 환경 결과 커밋812a351을 독립 검토하여 W00만 accepted로 기록했습니다.
- SDK10.0.401은 사용자별 경로를 프로세스의 DOTNET_ROOT/PATH에 지정합니다. 표준 Node24.18.1에서 기존 Worker43개 통과, Windows11 Pro x64/계정 종류/브라우저/운영 읽기 지연을 확인했습니다. 실제 자녀 SID 매핑·가족 PC 정책 적용은 하지 않았습니다.
- make-packet.mjs --check 결과 cards53/accepted1/implementation not-started, W01 지시 출력 성공. 다음 카드는 최소 C# Core 프로젝트이며 다른52개 카드와 Windows 제어 런타임은 미완료입니다.
- 환경 검토와 실제 보호 완료를 구분합니다. 지연/실패·강제 설치/우회·부모 계정 보존·설치 복구는 해당 후속 카드에서 별도 검증합니다.

## Windows 자가 검증·묶음 검토 도구 (2026-10-11)

- 원천: 관제탑 kids-screen-guardian/docs/windows/make-packet.mjs, make-packet.test.mjs, batch-review.md, start-batch.md, tasks.json/progress.json. 지시서가 변경됐으며 Windows 런타임은 구현 전입니다.
- --next는 실제 결과 SHA/receipt/명령·exitCode0·결과가 있는 self-verified 카드를 선행 검증으로 인정해 같은 묶음에서 자동 진행합니다. 카드 건너뛰기·실패/미실행 증거·임의 경로를 거부하고 다음 묶음은 독립 검토 accepted가 필요합니다. --check는 구현 시험을 대신하지 않습니다.
- 검토 경계는 W10/W20/W27/W34/W42/H01/H10의 7개입니다. 권한·기기 키·브라우저 위조·설치/복구·통신 규약은 묶음 독립 검토에서 확인합니다. 운영 적용 전 검토와 필수 실기기 검사는 유지합니다.
- 도구 시험8개 통과, 실제 카드 상태는 이전과 같아 W00만 accepted/자가 검증0/런타임 not-started입니다. 첫 실행은 W01~W10이며 사용자는 카드마다 결과를 복사하거나 승인할 필요가 없습니다. 가드는 기록의 형식/순서를 확인하며 거짓 시험 기록이나 검토자 신원을 인증하지는 않습니다.

## Windows B01 독립 검토 및 퀘스트 학습 지급 확인 (2026-10-11)

- Windows Core W01~W10 산출물·결과 커밋119b844~449a71d 보존. BudgetCalculator/UsageCounter/AccessStateMachine/AtomicStateStore/DeviceVault/PairingClient/GuardianApiClient/SyncCoordinator는 정산·측정·저장·기기 인증·통신을 담당합니다. 서비스/자녀 계정 제어는 미구현입니다.
- 독립 Core 시험46개 통과지만 추가 경계6개 실패(계측 누락/중복, 필수 응답 필드 누락, 다른 host 토큰 전송, 연결 오류 토큰 노출, 연속 이용 학습 GET 누락)와 ACL 실패 무시/VM 미실행으로 B01 blocked입니다. 원천은 관제탑 docs/windows/reviews/B01.md/fix-b01.md, W11은 승인 전까지 차단합니다. 보완은 같은 묶음에서 자동 진행 후 한 번 재검토합니다.
- 패킷 가드 시험8개 통과, 현재 장부 accepted1/selfVerified10/in-progress. 가드 시험 fixture는 실제 진행 상태와 분리했습니다.
- quest_runner.html은 notion-reward.js가 study-activity.js를 로드하고 문제풀이 quiz/완료 paused를 기록합니다. Worker의 measuredStudyMinutes는 quiz 활동 합집합을1:1 지급합니다. 고정5분 보상이 아니라 실제 인정 시간이며 전송/학습 캐시/앱 동기화가 필요합니다. 실제 자녀 폰의 이번 충전 성공은 미확인입니다.


## 2026-10-11 학습 적립 v3와 정답 보상

- kids/core/study-activity.js: Guardian learning/study-activity.js와 동일 미러. recordCorrect(attemptQuestionId), meter.getTodayCorrectAnswers(child), getStatus().eligible/failures 추가. 기존 flush/setPhase/getTodayMinutes 유지. v3 answers=[{id,at}], v2 구간 읽기 호환.
- quest_runner.html: 계측 직접 선행 로드, URL 학생 식별, 실제 정답 분기에서 고유 문항 ID 기록, 활동/보너스/저장·전송 상태 표시.
- notion-reward.js 및 mission-reward-engine.js: 두 공통 rewardQuizCorrect 경로에 고유 세션/문항 훅과 중복 채점 가드. notion-helper.js는 v3 캐시 버전을 로드.
- Guardian worker/src/study-measurement.js: measuredStudyRewards가 구간 합집합 분과 당일 고유 정답2개당1분을 반환. time-bank에 독립 정답 보너스 합산. 아이 API는 부모 추가 출처 없이 합계만 반환.
- 실제 모바일 UI 통합: Guardian learning/test-quest-flow.cjs. 실 터치→모의 노션→서버 합산, 두 자녀 각 1분+정답2개→2분 추가·기존60→62, 오류/가로 넘침0. 운영 DB에 시험 기록을 쓰지 않음.
- 작업 검증 규칙: Guardian learning/verification-rules.md. 전날 지연 업로드 및 실기기 확인은 별도 미완료.


## 2026-10-11 계측 전송 CORS 복구

공통 study-activity.js의 Pragma 헤더가 운영 프록시의 CORS 허용 목록에 없어 활동/정답 기록 전송만 차단됐습니다. 허용된 Content-Type만 보내도록 수정하고 계측/퀘스트/파사드 캐시 버전을20261011-4로 올립니다. 일반 과목방과 퀘스트 모두 적용합니다. 실제 활동0분이어도 정답2개당1분을 별도로 지급하며 완료 보고의 소요시간0과 구분합니다. 실제 브라우저 사전 요청·전송 및 업데이트 후 기존 큐 복구 검사(Guardian learning/test-study-cors.cjs)를 필수로 추가했습니다. 모의 API 검사만으로 전송 완료 처리하지 않습니다. 운영 프록시에서 구 헤더 차단/새 헤더200을 읽기 전용으로 확인했습니다. 실제 민서 잔액 증가 확인은 별도입니다.


## 실제 Notion 시각 정밀도와 서버 인정 복구

추가 원인: 실제 Notion 저장 응답이 입·퇴장 시각의 초/밀리초를 분 단위로 절삭했습니다. JSON의 정확한 퇴장 초가 date 경계를 넘은 것처럼 보이므로 기존 서버가 활동/정답 모두0으로 거절했습니다. 자녀와 분리된 부모관리자 진단 기록을 실제 저장해 재현했고 해당 임시 기록만 즉시 보관 처리했습니다. 자녀 지급량은 변경하지 않았습니다.

서버와 브라우저의 학습 기록 읽기에서 분 단위 퇴장값은 그 분의 끝까지를 경계로 검증합니다. 계산은 실제 JSON 구간/정답 시각으로 하며 경계 허용 때문에 시간을 올림하지 않습니다. 다음 분·미래·120초 초과·입장 전 구간과 잘못된 정답은 계속 거절합니다. 정밀 시각이 있는 날짜는 원래 경계를 그대로 유지합니다. CORS 수정과 함께 공통 모듈 캐시 버전20261011-5로 배포합니다.

검증: 로컬50개 pass/0 fail/0 skip. 실제 노션에서 반환된 같은 진단 JSON은 수정 전 활동0분/정답0, 수정 후 활동1분/정답2개/보너스1분입니다. 전날 지연 기록 문제와 실기기 도착 확인은 별도입니다. 재발 방지에 실제 교차 출처 CORS 및 실제 저장 JSON의 정밀도 검사를 추가했습니다.

## 2026-10-23 과학 실험실·하루방 활동 계측 연결

- `study-activity.js` `pageContext()`: 과목 `haru`→'하루' 추가. `haru.html`은 첫 화면이 곧 활동 화면이라 허브 제외 규칙의 예외(다른 과목 허브는 그대로 제외). 90초 유휴·포커스/보임·절전 몰아주기 금지·오락/부모 경로 제외 규칙은 변경 없음.
- `kids/subjects/science/*_lab.html` 16개: `<script src="../../core/study-activity.js?v=20261023">`를 직접 로드(실험실은 core/notion 파사드를 쓰지 않음). kind=study, 과목 '과학'으로 기록.
- 캐시 버전 `study-activity.js?v=20261023`로 통일: `core.js`, `notion-helper.js`, `notion-reward.js`, `storybook_engine.js`.
- Guardian 저장소의 사본 `learning/study-activity.js`는 이번에 고치지 않아 이 파일과 달라졌습니다(haru 판정 3줄). 서버 장부 규칙(활동1분=1분, quiz 정답2개당1분)은 그대로입니다.

## 회귀 시험 묶음 `tests/` (2026-10-27)

- `tests/gallery-spot-diff.test.mjs`: DOM 없는 모듈 로딩, contain 영역·레터박스·네 모서리 좌표, 짧은 변 반지름·22px 터치 보완·중복/겹침 판정, 입력 검증과 생성 갤러리의 CDN 계약을 검사합니다.

- **실행**: 저장소 루트에서 `node --test "tests/**/*.test.mjs"` (약 2초). 노션 운영 DB에는 접속하지 않습니다(모의 fetch). 커밋 전에 통과해야 하고, `main` 푸시·PR마다 GitHub Actions(`.github/workflows/regression.yml`, Node 24)가 같은 명령을 돌립니다.
- `tests/regression.test.mjs`: 단독 시험 6개를 하위 프로세스로 돌려 종료 코드 0인지 확인합니다. `verify_quest_mastery.js`(3·3·3 엔진), `test_quest_fallback.js`, `test_study_logger_upsert.js`, `verify_study_log_store.js`, `verify_kst_dates.js`, `verify_diary_sync.js`. 새 단독 시험을 만들면 실패 시 `process.exitCode = 1`로 끝나게 하고 이 목록에 한 줄 추가합니다.
- `tests/fairy-voice-persona.test.mjs`: 캐릭터 목소리가 목록대로 나오는지(정답·오답·완주·인사, 비반복), 다른 아이 전용·준비중·목록 미로딩이면 요정 코코로 돌아가는지, 목록에 항목만 추가한 새 목소리가 엔진 수정 없이 재생되는지, 목록의 음성 파일이 모두 있는지 확인합니다.
- `tests/fairy-tts.test.mjs`: 엔진·설정창을 싣는 모든 화면·로더가 `fairy-tts.js`를 먼저 싣는지, 두 파일의 최상위 이름이 겹치지 않고 공개 함수가 모두 있는지, 대기열(중간 실패 건너뛰기·끝 콜백 1번·미리 받기 3개·정지 시 해제), 수식 읽기, 말하기 속도·예전 영어 저장값 읽기, 기기 OpenAI 키 삭제를 확인합니다.
- `tests/notion-contract.test.mjs`: 앱이 노션에 보내는 요청 본문의 속성 이름·타입이 `docs/notion_schemas_school.md` 표와 같은지 확인합니다. VOCA_DB `숙련도`(`count|silverDate|lastReviewed` 형식·왕복)·`달성`, 관리자 모드 쓰기 생략, STUDY_LOG_DB 학습일지(`ID`=`{학생}_{YYYY-MM-DD}_{과목}`, `오답리포트`). 노션 속성을 바꾸면 스키마 도감(`sync_notion_schemas.py`)과 코드를 함께 고쳐야 통과합니다. 도감을 다시 만들어도 손으로 적은 비고는 유지되고, 노션에 아직 없는 예정 속성은 표 밖 ⚠️ 목록에 남아 이 시험이 실제 속성으로 세지 않습니다.
- `tests/quest-mastery.property.test.mjs`: 독립 브라우저 샌드박스에서 시드별 30~50개 동작으로 Q1~Q6 숙련도·병합·10분 보호·noCredit·판 구성과 await 중 채점/실패 후 push 배출을 검사하는 무작위 순서 시험입니다(각 흐름 기본 100회). 재현: `QUEST_PROP_SEED=<시드> node --test tests/quest-mastery.property.test.mjs`, 횟수: `QUEST_PROP_RUNS`. 외부 변경 병합(Q3)과 마지막 성공 push 대비 dirty 유실(Q5)은 별도 흐름으로 검사합니다.
- `tests/media-archive-paths.test.mjs`: `gallery-data.js`·`gallery-meta.json`·`special-days-data.js`·`haru_data.js` 안의 모든 kids-archive 주소를 모아 작품은 activities 밖·작가와 같은 아이 폴더, 특별한 날·하루방은 `{아이}/activities/`, 작품·특별한 날 같은 파일 중복 등록 금지를 검사합니다. 로컬에 `../kids-archive`가 있으면 파일 실존도 확인하고, CI에서는 그 항목만 건너뜁니다.
- `tests/haru-special-days.test.mjs`: 하루방이 `special-days-data.js`를 상대 경로로 먼저 싣고 `haru_data.js`에 `defaultEvents`가 없는지, 민서 방에 민수 개인 행사가 없고 민수 방에 민서 개인 행사가 없으며 공동·부모 행사는 둘 다 보이는지, 예시 3건(`evt_children` 등)이 사라졌는지, 예전 localStorage 이야기·제목 수정·갤러리 메타가 살아 있는지 검사합니다. 아직 실제 데이터에 없는 작성자(민수 개인·아빠) 행사는 시험 안에서만 덧붙입니다.
- `tests/study-log-store.property.test.mjs`: 모의 fetch의 응답 지연·실패·중복·날짜 경계로 S1~S7 스트릭·캐시·순차/동시 upsert를 검사하는 무작위 순서 시험입니다(규칙별 기본 100회). 재현: `STUDYLOG_PROP_SEED=<시드> node --test tests/study-log-store.property.test.mjs`, 횟수: `STUDYLOG_PROP_RUNS`. S4 오답 보존·S5 한 탭/두 탭 직렬화·S6 선택 A·S7 Worker isolate 캐시 우회와 ID 수명주기를 검사하고, 두 기기 동시 저장 한계만 본문이 실행되는 todo로 기록합니다. 공용 `tests/browser-sandbox.mjs`의 `loadBrowserScripts(files, { userName, fetch, storage })`는 운영 DB 접속 없이 기본 모의 fetch와 시드별 저장소를 제공합니다.
- 시험이 실제로 고장을 잡는지 확인함: 숙련도 속성명 오타, 오답리포트 속성명 변경, 금메달 기준 변경, 숙련도 구분자 변경을 일부러 넣었을 때 모두 실패.
- **화면 검증 서버 (노션 쓰기 차단)**: `python scripts/guarded_preview_server.py [포트=8767]`. 모든 HTML `<head>` 맨 앞에 쓰기 차단 스크립트를 넣어 내보내므로 페이지가 실리기 전부터 노션 페이지·블록 쓰기와 업로드가 막힌다(읽기·DB 조회·음성은 통과, 막힌 요청은 `window.__blockedWrites`). 2026-10-28 차단을 늦게 걸어 민수 「학습설정」이 덮어써진 사고 뒤 도입. 화면 검증은 `python -m http.server` 대신 이 서버로 한다.
- **자동 맞춤 시험(묶음 밖)**: `python -X utf8 scripts/verify_spot_diff_align.py`. 결정적 합성 표본으로 맞춤·선택 합성·마스크 밖 원본 바이트·워터마크 복원·품질 거부·이동 경고·결정성·CLI·의존성 누락을 검사합니다. OpenCV가 없으면 「건너뜀: opencv-python-headless 미설치」와 종료 코드 0. 임시 그림은 uploads 안에서 만들고 정리하며 Node/Actions 묶음에는 넣지 않습니다.
- **화면 시험(묶음 밖)**: `verify_math_phase1.cjs`·`verify_math_phase2.cjs`는 브라우저를 띄워 느리고(약 20초) 실행 때마다 `docs/math-phase*.png`를 다시 씁니다. playwright는 `scripts/load_playwright.cjs`가 ① 설치본 ② `PLAYWRIGHT_MODULE` ③ 이 PC의 Codex 런타임 사본 순으로 찾고, 없으면 건너뜁니다(종료 코드 0). 실행 후 바뀐 스크린샷은 커밋할 때만 남기고 아니면 `git checkout -- docs`로 되돌립니다.
