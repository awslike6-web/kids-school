# 🧩 김s 공부방 공통 부품 & 코어 모듈 카탈로그 (Core Catalog)

> **규칙**: 신규 기능 개발 또는 화면 수정 시 본 카탈로그에 등록된 공통 엔진을 우선적으로 임포트하여 사용해야 합니다. 동일한 기능을 위해 개별 페이지 내부에 수백 줄의 자바스크립트나 파이썬 코드를 중복 작성하지 마십시오.

---

## 1. 🎙️ 오디오 & 음성 합성 (Audio & Interaction)

### 🌟 `fairy-tts.js` · `fairy-engine.js` · `fairy-config.js` (2026-10-28 두 파일로 분리)
요정 코코의 한국어 안내, 원어민 영어 발음, 학습 보상 효과음 및 **Gemini 3.8 Flash TTS 기반 캐릭터 페르소나(민수 깐죽이 / 민서 깍쟁이)** 음성을 전담하는 통합 오디오 코어입니다.
- **파일 위치**:
  - `kids/core/fairy-config.js` (오디오 프리셋 맵 및 설정)
  - `kids/core/fairy-tts.js` (약 730줄, 음성 합성: Worker 실시간 음성 문장 대기열·브라우저 음성 대체·`stopFairyTTS`·녹음 음성 재생·말하기 속도·아이별 설정 읽기)
  - `kids/core/fairy-engine.js` (약 370줄, 키워드 라우터·캐릭터 목소리 고르기·`fairyPraise/Encourage/Reward/Greet`·음성 ON/OFF)
  - `kids/core/fairy-settings-catalog.js` (캐릭터 목소리 목록 `VOICE_CATALOG`, 요정 코코 녹음 음성 목록 `FAIRY_AUDIO_PRESETS`, 그리고 노션 `INVENTORY_DB` `학습설정` 저장용 1,900자 나눔 함수 `chunkLearningSettingsRichText(text)` — 쓰는 곳 4곳: `fairy-settings-engine.js`, `quiz-flow-controller.js`, `haru-checkin-engine.js`, `parent_progress_controller.js`. 모든 화면이 `fairy-engine.js` 및 쓰는 모듈보다 먼저 싣는다; 단 `gugudan.html`은 인라인 `loadCoreScripts`로 화면 초기화 전에 싣고, `QuizChoices`만 쓰는 `science_season_airmass_lab.html`·`video-unit.js` 단독 로드 실험실은 저장을 호출하지 않는다)
- **HTML 로드 방법** (순서 지킴: `fairy-tts.js`가 엔진보다 먼저. 새 파일 이름에 `fairy-engine.js` 글자를 넣지 않는다 — `loadCoreScripts`·자산 경로 찾기가 그 글자로 엔진을 찾음):
  ```html
  <script src="../core/fairy-config.js"></script>
  <script src="../core/fairy-tts.js?v=20261116-mixvoice"></script>
  <script src="../core/fairy-settings-catalog.js"></script>
  <script src="../core/fairy-engine.js?v=20261028-coco"></script>
  ```
  동적 로더 `core.js`(`requiredCores`)·`lobby_controller.js`(`lobbyCores`)도 같은 순서. 시험 `tests/fairy-tts.test.mjs`가 엔진·설정창을 싣는 모든 화면을 검사한다.
- **핵심 API**:
  | 메서드 | 용도 | 설명 |
  | :--- | :--- | :--- |
  | `speakFairyTTS(text, onEnd, options)` | 한국어 안내/퀴즈 | ① 센터 고정 MP3 ② 녹음 음성(키워드 라우터) ③ Worker `/api/tts` 실시간(Edge, 막히면 Worker가 OpenAI로 대신) ④ 브라우저 음성. 옵션 `skipPreset`·`skipStatic`·`forceVoice`·`mixedVoices`. **영어방(`currentSubject === '영어'`)에서 한영이 섞인 글은 ③에서 한글은 선희·영어는 영어 목소리(영어 배속)로 나눠 읽는다**(2026-11-16, `splitKoreanEnglishSegments`: 한글 없는 문장은 통째로 영어, 문장 안에서는 영어 두 낱말 이상 이어진 구간·따옴표 속 영어 낱말만 영어. `mixedVoices: false`로 끔, `true`로 다른 방에서도 켬) |
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
  - `kids/core/notion-cache-manager.js` (253줄): LocalStorage 1일 캐시, 프리패칭(`prefetchVocaData`, `prefetchReadingData`), 전사 통합 노션 동기화(`syncAllNotionData`), 토스트 알림 전담. **어휘 캐시는 하루 한 벌(ALL)**: 로비·과목방의 `prefetchVocaData`는 전체를 받아 `ALL` 키에 두고, 아이별 조회(`fetchVocaFromNotion` 기본)는 아이 캐시가 없으면 `ALL`을 그 아이(학생 칸에 이름이 있는 행)로 걸러 쓴다. 용어사전방(전체)도 같은 캐시를 써서 첫 방문 약 15초 → 0.4초(2026-11-19, 시험 `tests/voca-all-cache.test.mjs`).
  - `kids/core/notion-api-client.js` (471줄): Cloudflare Worker 프록시 통신, VOCA/독해/도서관/시간표 쿼리, 노션 블록 파서, 지수 백오프 재시도 및 Rate Limit 방어. 여러 쪽 DB 조회 본문에는 `STABLE_SORTS`(만든 시각 오름차순)를 꼭 넣는다: 정렬 없으면 쪽 경계에서 행이 빠진다(2026-11-17, 시험 `tests/notion-stable-sort.test.mjs`).
  - `kids/core/study-log-store.js` (402줄): `STUDY_LOG_DB` 학습일지 **일일 Upsert 쓰기 단일 원천**(`{학생}_{KST YYYY-MM-DD}_{과목}` 키, 있으면 PATCH 누적·없으면 POST) + **연속 학습 스트릭**(노션 '입장' KST 날짜 기준, 연속이 끊긴 지점까지만 페이지 조회, 전송 성공 시 로컬 캐시에 오늘 즉시 반영, 기록 없으면 배지 숨김). `notion-study-logger.js`·`notion-reward.js` 두 경로가 모두 이 모듈만 호출하며, 두 파일 모두 미로드 시 스스로 이 모듈을 불러온다. 검증: `node scripts/verify_study_log_store.js`. 2026-11-21부터 `serialize(key, fn)`·`locateDailyPage(key)`·`createDailyPage(entry, key, {keepalive})`·`notionConfig()`도 내보내 문항기록이 같은 잠금·같은 행을 쓴다(기존 쓰기 동작 같음).
  - `kids/core/learning-log.js` (2026-11-21, `window.LearningLog`): **문항 단위 학습 기록**. `attempt({child, subject, key, firstTry, hinted, picks})`로 기기 대기열(`MINMIN_LEARNING_LOG_V1`, `pending`/`inflight`)에 모으고, `flush()`가 그날 학습일지 행의 `문항기록` 칸 하나만 PATCH(JSON v1 `{"v":1,"i":{키:[시도,틀림,힌트,"오답|…"]},"b":[배치ID…]}`, 1,900 코드 포인트 조각, 같은 배치 재전송은 한 번만 합산). 노션에 칸이 없으면 행도 만들지 않고 보관, 해석 실패한 행은 덮지 않음, 5번 연속 실패하면 그 열람에서 멈춤, 페이지 숨김 때는 보내지 않음(로드 직후·레슨 완료·시도 20개마다). 부모 시뮬레이터(아빠·엄마·어른)는 기록하지 않음. 문항키: `v:`VOCA page_id 32자(1차 5분 퀘스트 레슨), `r:`지문ID:문항번호·`c:`교재 page_id(2차 2026-11-22: 정밀 독해·민서 미니 독해·사회 자료분석·과학 실험 퀴즈), `g:`는 3차. 화면용 도우미(2차): `keyFor(prefix, id, part)`(page_id는 하이픈 뺀 소문자, 그 밖은 안전한 글자만), `currentChild()`(부모 시뮬레이터는 null), `question({subject, key})` → `{wrong(고른글자), hint(), done()}`(문항이 끝날 때 done 한 번 = attempt 한 번, 같은 문항을 다시 그려도 이어 쓰기). 3차(2026-11-22): `skip()`·`isDone()`, `itemTracker({prefix, subject, list, idx, key?, session?})`(같은 회차·번호면 같은 도우미, 정적 자료는 session으로 회차 구분, 노션 ID는 pageId 또는 page_id 모양 id), `itemSkip(listOrSession, idx)`. 연결: 과목방 어휘(영어·국어·받아쓰기·사회·과학), 과학 안전수칙·탐구 보고서(`s:`)·단원 영상, 세로셈(`g:vm-…`)·구구단(`g:gugu-…`)·수학 탐험관(`choiceQuestion` `onWrong`). 노션 칸은 2026-11-21 사용자 승인 뒤 추가(실제 1회 쓰기 확인). 로드: `notion-helper.js`·`notion-reward.js` 공용 로더가 `study-log-store.js` 다음에. 명세 `docs/learning_record_spec.md`, 시험 `tests/learning-log.test.mjs`(21개)·`tests/learning-log-rooms.test.mjs`(11개)·`tests/quest-lesson.test.mjs` 레슨 연결 1개·`tests/learning-log-screens.test.mjs`(4개)·`tests/quiz-choices.test.mjs` 화면 4곳 문항기록 검증(가짜 DOM·문항기록 도우미는 `tests/quiz-test-fakes.mjs`).
  - 학습일지는 당일 페이지 ID(`MINMIN_STUDY_LOG_PAGES_V1`)를 기억하고 조회·GET의 `?force=true`로 현재 값을 다시 읽습니다. 같은 키는 Web Locks(같은 브라우저 두 탭) 또는 Map 체인(한 탭)으로 직렬화하며 오답은 정확히 같은 구분 항목만 중복 제거합니다.
  - 조회는 400ms 뒤 한 번 재시도하고, 기억한 ID도 없고 재시도도 실패하면 선택 A에 따라 중복 가능 경고 1회와 함께 신규 생성합니다. 두 기기 동시 쓰기는 노션 고유 키 제약이 없어 보장하지 않습니다.
  - 보상 직접 로드 경로는 클래식 스크립트 `notion-reward.js` → `notion-reward-quiz.js` → `notion-reward-discussion.js` 순서입니다. `quest_runner.html`에서 세 파일을 `?v=20261101-reward-grant-shared`로 연달아 싣습니다. `notion-helper.js`를 싣는 화면(예: `voca.html`)은 같은 이름을 선언하는 `mission-reward-engine.js`·`quiz-feedback-overlay.js`를 받으므로 `notion-reward*.js`를 함께 싣지 않습니다(`tests/notion-reward-split.test.mjs`가 검사).
  - `kids/core/notion-reward.js` (170줄): 공용 모듈 자동 로드, `sendStudyLogToNotion`, 레벨 계산, 음성 세션 상태. 보상 함수는 껍데기 → `reward-grant.js`로 위임합니다. 호출 시점의 학생·테마·과목을 모듈 대기 전에 보존합니다.
  - `kids/core/reward-grant.js` (452줄): 두 지급 경로의 보상 본체·UI·오프라인 대기열 단일 원천. 클래식 스크립트 IIFE이며 새 전역은 `window.MinminRewardGrant` 하나입니다. 공개 API: `grant(earned, isSilent=false, customExpType=null, context=null)` → `Promise<boolean>`, `flushQueue()` → 진행 중 동일 Promise, `toast(text, {tone, duration})` → 보상 말풍선. 복습 부스트 경험치(1.2배)는 반올림하지 않고 소수점 몫을 `MINMIN_EXP_CARRY_<아이>_<과목>`에 모아 다음 지급에 더한다(노션 지급 성공 뒤에만 저장, 2026-11-24 승인 변경 — `tests/reward-grant-approved-edits.mjs` `expCarryEdit`).
  - **보상 말풍선 (2026-11-06~)**: 보상 모달(`showRewardModal`)이나 `#r-detail`이 없는 화면의 보상 알림은 예전 `alert` 창(매번 눌러 닫아야 함) 대신 화면 위쪽 작은 말풍선으로 2.4초(레벨 업 3.6초) 떴다가 저절로 사라진다. 누를 필요가 없고(`pointer-events: none`) 연달아 오면 한 개를 새 글자로 바꿔 보여 준다. 일일 상한 도달 알림도 말풍선이다. 노션 저장 실패(칼럼 부족) 알림은 그대로 `alert`. 두 껍데기는 같은 폴더의 모듈을 `?v=20261101-reward-grant-shared`로 중복 없이 자동 로드하고 기다립니다. `notion-helper.js`는 새 버전 logger를 로드합니다.
  - 조회·PATCH의 네트워크 오류/실패 응답만 `MINMIN_REWARD_QUEUE_V1`에 호출 당시 학생·테마·과목·금액·경험치 유형·id·시각으로 보존합니다. 관리자·상한 0개·인벤토리 없음·과목 없음은 새 항목을 만들지 않습니다. 날짜·스크린타임 보상 누적·소원권 누적 자산은 PATCH 성공 뒤 한 번 반영합니다. 학습설정은 현재 학생에게만 두 동기화를 적용하고, 스크린타임은 tracker → 전역 함수 → 로컬 저장 순으로 대체합니다. 대기열 저장 성공 시 일반 호출은 모달로 짧게 안내하고 조용한 호출은 알리지 않습니다.
  - 보상 대기열은 페이지 `load`와 일반 지급 성공 직후, 같은 Promise를 재사용하여 FIFO 최대 10건을 조용히 재지급합니다. 모듈이 `load` 뒤 도착해도 초기 재시도를 합니다. 최신 인벤토리 조회(`?force=true`)와 지급 시점 부스트·일일 상한을 사용하므로 전날 실패분도 오늘 몫입니다. 상한 0개는 남겨 다음 날 재시도하고 부분 지급 성공은 삭제합니다. 학생 전환 후에도 항목의 학생에게 지급합니다. 검증: `tests/quest-reward-retry.test.mjs`(두 경로 각각 22개)·`tests/reward-grant-shared.test.mjs`, 계약: `docs/reward_grant_shared_spec.md`·`docs/quest_reward_retry_spec.md`.
  - 같은 탭의 지급은 순차 실행하며, Web Locks가 있으면 `minmin-reward-queue` 잠금으로 탭 사이도 직렬화합니다. **사용자 승인 선택**: Web Locks가 없어도 잠금 없이 자동 flush하며, 보상 보존을 우선해 두 탭의 드문 중복 지급 가능성을 수용합니다. PATCH 응답 유실 또는 성공 뒤 큐 삭제 전 종료 시에도 서버의 보상 id 중복 방지가 없어 정확히 한 번 지급을 보장할 수 없습니다.
  - `kids/core/notion-reward-quiz.js` (450줄): `setupDebouncedSTT`, 접속사 채점, 미션 보상, 퀴즈 보상 세션.
  - `kids/core/notion-reward-discussion.js` (448줄): 이탈 시 세션 플러시, 토론 보상·대화 기억 연결, 오답 선택 안내, 이탈 확인, 용어 정독 보상. 원문 보존·부분 로드·전역 API·이벤트 검증은 `tests/notion-reward-split.test.mjs`, 분리 계약은 `docs/notion_reward_split_spec.md`입니다.
  - `kids/core/notion-study-logger.js` (194줄): `STUDY_LOG_DB` 학습일지 전송 진입점(중복 방어막, 오답 리포트 수집 → `StudyLogStore.upsertStudyLog`), 보상 껍데기 → `reward-grant.js`, 부모 관리자 모드 격리, 상대 경로 로비 복귀. 기존 네임스페이스·전역 API를 유지합니다.
  - `kids/core/stt-debouncer.js`: STT 음성 인식 디바운스 및 세션 관리 (`setupDebouncedSTT`).
  - `kids/core/mission-reward-engine.js`: 미션 보상 지급 및 축하 모달 렌더러 (`claimMissionRewardOnce`, `openMissionRewardModal`, `grantVocaDwellReward`).
  - `kids/core/quiz-feedback-overlay.js`: 오답 다시풀기/다음문제 오버레이, 정답·뜻풀이 카드, 보카사전 딥링크 및 이탈 방지 가드 (`promptQuizRetryOrSkip`, `getVocaCommonUrl`, `window.__quizLeaveGuard`).
  - `kids/core/quiz-flow-controller.js`: 스피드(자동)/꼼꼼탐구(수동) 2대 진행 템포 제어기 및 풀이·보카사전 딥링크 카드 (`triggerQuizAdvance`, `setQuizFlowMode`). **템포는 아이별 키** `kids_quiz_flow_mode_<민수|민서>_<과목>`(2026-11-24, 예전 공용 키는 읽지 않음 — 아이별 값은 로비가 노션 학습설정 `quizFlow`에서 받아 옴). `getQuizFlowMode(과목, 아이?)`·`getAllQuizFlowModes(아이?)`, 지금 아이는 기기 저장값(`currentUserName`→`currentUser`)으로 판단, `syncQuizFlowFromCloud(학습설정, 아이)`는 그 아이 캐시·키에만. 아이별 키가 없으면 그 아이의 받아 둔 노션 학습설정(`MINMIN_CLOUD_SETTINGS_<아이>`.quizFlow) 값을 먼저 읽고, 저장할 때 이 기기에 값이 없는 과목은 노션 값을 보존한다. 쓸 만한 학습설정 캐시가 없으면 노션 페이지를 먼저 읽어 바탕으로(읽기 실패면 보내지 않음). 부모 검수 중 템포 변경은 그 화면에서만(저장·노션 없음). 파일 맨 앞 순수 블록에 **객관식 보기 섞기 `window.QuizChoices`** (2026-11-14, 아래 절).

### 🔀 `window.QuizChoices` (객관식 보기 화면 섞기, 2026-11-14)
- **위치**: `kids/core/quiz-flow-controller.js` 맨 앞 IIFE (DOM·localStorage 없음). `core.js`가 자동으로 싣고, `core.js`를 안 싣는 화면(`gugudan.html`, `science_season_airmass_lab.html`)은 `<script src="../../core/quiz-flow-controller.js?v=20261114-shuffle">`를 직접 싣는다.
- **API**: `arrange(choices, {fixed, rng}) → [{text, index}]` 화면 순서(`index` = 원래 번호, 0부터) / `shuffle(list, rng)` Fisher–Yates, 원본 불변 / `isFixedOrder(choices)`.
- **고정 순서(섞지 않음)**: 2지선다 O/X·○/×·예/아니요·맞다/틀리다, 보기 글자에 「모두 맞다」「정답 없음」「위의 내용」·①~⑤·「ㄱ, ㄴ」·「가와 나」 같은 조합형, `opts.fixed: true`. 보기 글자만 본다(일반 문장 속 「모두」「위의」는 섞음).
- **쓰는 법**: 문제를 새로 열 때 한 번 `arrange`하고, 틀려서 다시 고를 때는 같은 순서를 쓴다. 번호 표시·TTS는 보이는 순서(`pos + 1`), 채점은 `index`(또는 보기 글자). `window.QuizChoices`가 아직 없으면 원래 순서로 그린다. `sort(() => Math.random() - 0.5)`는 고르게 섞지 못하므로 새 코드에서 쓰지 않는다.
- **적용 화면**: 사회 자료분석(`society_chart.js`), 과학 실험실 퀴즈(`science_lab.js`)·탐구 보고서(`science_report.js`, 객관식·빈칸 카드)·안전 라이선스(`science_safety.js`)·기단 실험실, 독해 엔진(`reading_engine.js`), 민서 미니 독해(`korean_mini_reading.js`, 문제 읽기도 보이는 순서), 수학 평면도형·도형 이동·도형 공방(글자 채점), 구구단·나눗셈 개념·분수와 소수·길이와 시간(`shuffle`). 5분 퀘스트는 원래부터 `withShuffledOptions`로 섞는다.
- **민서 미니 독해 음성**: 문제 읽기를 `[말풍선+질문, "1번, 보기.", …]` 조각으로 나눠 재생한다. `scripts/build_mini_reading_audio.py`가 보기마다 가능한 모든 번호의 조각 mp3를 만들므로 어떤 순서로 섞여도 미리 만든 Edge 음성이 나온다(2026-11-14 대본 209개).
- **지킴이**: `tests/quiz-choices-guard.test.mjs` — 보기를 그리는 코드(`choices.map(`·`options.forEach(` 등)가 있는 `kids/`·루트 HTML 파일은 `QuizChoices`를 쓰거나 시험 안 허용 목록에 사유가 있어야 통과. `scripts/register_curriculum.py`는 해설·쓰임새에 보기 번호 표현(「1번은」·③·「보기 2」)이 있으면 경고한다.
- **시험**: `tests/quiz-choices.test.mjs`(부품 고름·고정 규칙·화면별 채점·재시도 순서·미니 독해 mp3 실존), `tests/quiz-choices-guard.test.mjs`. 작업 기록: `docs/quiz_choice_shuffle_spec.md`.
  - ~~`kids/core/fairy-chat-memory.js`~~ (2026-11-01 삭제): AI 요정 대화 기억·페르소나·Gemini 직접 호출 모듈. 2026-09-04 분리 때부터 어느 화면·로더에도 연결되지 않았고 쓰임도 적어 지웠다. 대화 기억 저장은 2026-11-16 아래 `chat-memory.js`로 새로 만들었다(옛 파일은 되살리지 않음: 브라우저 키 직접 호출).
  - `kids/core/chat-memory.js` (`notion-helper.js`가 로드, 2026-11-16): AI 대화 기억 보관소(`NOTION_CHAT_MEMORY_DB_ID`) 저장 IIFE. **언제 남나**: 아이가 한 마디라도 한 대화를 창을 닫을 때 1줄 — 영어 6단계·국어 지문 토론(`finalizeSentenceDiscussionSession` → `saveChatMemoryFromConversation`), 코코 요정 창(`fairy-chatbot.js`의 `initChatMemorySession`·`trackChatMemory*Message`·`finalizeChatMemorySession`), 용어방 단어 창(`voca_modal.js` `closeModal`). 창을 닫지 않고 페이지를 떠나면 `pagehide`에서 요약 없이 대화 전문만 `keepalive`로(`registerChatMemorySource(이름, () => ({roomType, subject, messages, passage}))`). 같은 대화는 한 번만, 부모 로그인(아빠·엄마·어른)은 남기지 않는다. **칸**: 세션 ID·아이 이름·소속 방(공부방·로비·용어방·마이룸, 수학 놀이방 같은 세부 방 이름은 단원 칸 앞에)·과목(`window.currentSubject`, 없으면 코코 과목)·단원(토론 지문 「회차/단원 · 제목」)·대화 요약(Worker `/v1/chat/completions?type=ai` 2~3줄, 물어본 영어 표현 포함, 실패 시 아이가 한 말)·장기 기억(「꼭 기억해」 등). 페이지 본문에 「대화 전문」. 시험 `tests/chat-memory.test.mjs`.
  - `kids/core/gemini-chat.js` (`notion-helper.js`가 로드): AI 요정 대화 공용 IIFE. 위 파일에서 재시도와 안내 문구, 아이별 말투만 옮겼다. `fetchWithGeminiRetry(url, options, {maxRetries, baseDelayMs, ui})` → `{response, data, text}`, `buildFullAISystemPrompt(roomType, extra)`, `buildDiscussionAISystemPrompt(subject, passage, extra)`, `applyGeminiResponseToWaitUI`, `showGeminiFinalFailUI`, `resetGeminiChatErrorState`, `popLastPendingUserTurn`, `createChatBubbleId`, `setChatBubbleContent`, `getActiveChildName`, `isParentProfile`를 `window`에 둔다. Worker 프록시(`/v1/gemini`, `/v1/chat/completions?type=ai`)로만 호출하고 키를 받지 않는다. 대화 저장은 `chat-memory.js`가 맡는다.
- **핵심 API (대문 파사드를 통해 100% 하위 호환 보존)**:
  | 메서드 | 서브모듈 | 설명 |
  | :--- | :--- | :--- |
  | `syncAllNotionData()` | `notion-cache-manager` | 전 과목 노션 캐시를 무효화하고 최신 데이터 일괄 선로딩 |
  | `prefetchVocaData(student)` | `notion-cache-manager` | 당일 어휘 **전체(ALL)**를 백그라운드에서 사전 다운로드. 아이별 화면·용어사전방이 같은 캐시를 씀 |
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
  - `kids/js/lobby_tailwind_config.js` (48줄, 2026-11-01): 로비 Tailwind CDN 설정(`tailwind.config` — 테마 RGB 변수 색상 47개·간격·글꼴·글자 크기). Tailwind CDN 태그 바로 다음에 클래식 스크립트로 싣는다(`?v=20261101-lobby-tw`). 시험 `tests/lobby-tailwind-config.test.mjs`.
  - `lobby.html` (751줄): 민서 뷰(`#minseoLobbyView`), 민수 뷰(`#minsuLobbyView`), 과목별 팝업 카드, 중단 4칸 아지트 허브(마이룸&상점·갤러리·대시보드·시간표), 하단 5칸 고정 유틸리티 바(`📝 마음일기 · 📸 찰칵등록 · 🦖 용어사전 · 🎡 놀이터 · 👥 프로필`), 놀이터 모달(`#playgroundModalOverlay`), 시간 한도 갈림길 모달(`#dailyCapModalOverlay`), 부모 관리자 시뮬레이터 툴바(`#adminQuickToolbar`, 2026-10-21부터 `<details>` 접이식: 평소엔 검수 라벨만, 누르면 도구 버튼 펼침 · JS 변경 없음) 통합 마크업.
  - `kids/css/lobby-themes.css` (359줄): CSS RGB 채널 변수 스왑(`html.theme-minseo` vs `html.theme-minsu`)으로 Tailwind 컬러 토큰 충돌 원천 차단, `.clay-card*`, `.jelly-btn`, `.cosmic-map`, `.scanline`, `.hazard-stripe-amber`, 모달 라이트 격리 스타일.
  - `kids/js/lobby_config.js` (106줄): 아바타·과목·놀이터·사용자 설정 상수, 월드 목록 구성과 `window.USER_CONFIGS`.
  - `kids/js/lobby_subject_hud.js` (459줄): `LobbySubjectHud.create(ctx)` 공장 함수, 시간표 부스트·과목별 일일 한도·추천 과목·가디언 HUD·노션 인벤토리 동기화.
  - `kids/js/lobby_controller.js` (566줄): 공통 코어 로더·클로저 상태·유저/테마 전환·과목 팝업·갈림길/놀이터 모달·클릭 핸들러·초기화. HTML에서 config → subject_hud → controller 순서로 같은 버전 `20261031-lobby-split`을 로드한다.
- **핵심 API**:
  | 함수 / 프로퍼티 | 설명 |
  | :--- | :--- |
  | `window.USER_CONFIGS` | 민수/민서 전 교과 월드 맵 및 테마 속성 SSOT 데이터 (하위 호환 유지) |
  | `window.LobbySubjectHud.create(ctx)` | 최신 학생·관리자 상태를 읽는 함수, 공유 `runtimeDailyEarned`, 이름·날짜 헬퍼를 받아 과목 상태·추천·HUD·인벤토리 함수 6개를 반환 |
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

### 🛤️ 오늘의 길 `today-path.js` · `lobby_today_path.js` (2026-11-23, 1차)
아이가 고르지 않아도 매일 네 정거장(🎒 오늘 배운 것 → 🔭 내일 맛보기 → 🔁 다시 보기 → 🎡 돌림 칸)을 공부방 월드 맨 위 카드로 놓는 루틴 라인. 명세 `docs/today_path_spec.md`.
- **파일**: `kids/core/today-path.js`(약 400줄, 전역 `TodayPath`, `module.exports`) — 순수 편성·완료 장부·노선 저장. `kids/js/lobby_today_path.js`(약 250줄, 전역 `LobbyTodayPath`) — 학습일지 하루 한 번 읽기(노션 쓰기 없음)·어휘 캐시·카드 그리기. `lobby.html`의 `#todayPathMinseo`·`#todayPathMinsu`.
- **편성**: `TodayPath.plan({ child, childKey, now, timetable, eligible, history, voca, rooms })` → `{ v:1, date, provisional, stops[4], reviewPending? }`. 과목은 `SUBJECTS` 맵과 **정확히 같은 글자만**(괄호 단원명·통합교과 버림). 1·2·4번 과목은 서로 다르고 1·2번에 하루 없음. 순위 = 최근 7일 방문 일수 → 마지막 방문 → 시간표 순서/날짜 회전. 3번 다시 보기 = 최근 `v:`·사회 `c:` 오답(어휘 캐시 단원 3개 이상) → 녹슨 왕관·은메달(민수만) → 지난 단원. KST 날짜·요일은 `now+9h`로 직접 계산.
- **완료 장부**: `TodayPath.markDone({ child?, subject, kind })` (`kind` = `lesson`·`quiz`·`story`·`reading`) → 기기 `MINMIN_TODAY_PATH_DONE_V1_<이름>`. URL에 `tp=1~4`가 있으면 그 정거장에만, 없으면 과목에만. 부모 시뮬레이터는 기록 안 함. 연결: 레슨 완주(`quest-lesson-ui.js`)·4+1 완주(`quest-runner.js`)·과목방 퀴즈 10문제 완주(`mission-reward-engine.js` `finalizeQuizRewardSession`, `window.currentSubject` 우선)·사회 자료분석 완주(`society_common.js`)·동화 완독(`storybook_engine.js`, 자가 삽입)·정밀 독해·민서 미니 독해. 하루는 기존 `haru_checkin_done_<날짜>_<아이 키>`를 읽음.
- **노선 고정**: `MINMIN_TODAY_PATH_V1_<이름>`(KST 날짜). 학습일지 조회가 실패한 노선은 그날 한 번, 아무것도 안 했을 때만 다시 편성. 매일 첫 진입에 어휘 캐시가 늦으면 3번만 캐시가 채워진 뒤 한 번 다시 고름(`refreshReview`). 부모 시뮬레이터는 노선을 저장하지 않음.
- **싣기**: `lobby.html`(`lobby_config.js` 앞)·`quest_runner.html`·`notion-helper.js` 자동 로더·`storybook_engine.js` 자가 삽입이 같은 `today-path.js?v=20261123-path2` 문자열. 시험 `tests/today-path.test.mjs`(16개)·`tests/today-path-v2.test.mjs`(22개).
- **2차 (2026-11-23)**: ① 4번 체류 — `today-path.js`가 실린 화면에서 오늘 4번 과목 화면이면(`tp=1~3` 화면 제외) 「보이는 화면 + 최근 90초(`StudyActivity.IDLE_MS`) 안 실제 입력」일 때 1초씩 장부 `dwell`에 쌓고 30초면 `kind: 'visit'`(4번 판정에만). ② 완주 보너스 +3 — 로비가 네 칸 완료를 보면 `MinminRewardGrant.grant(3, false, null, { childName, currentTheme, subject: 1번 과목 })` 하루 한 번(장부 `bonus`). ③ 방학 모드 — 설정 모달 `appSettings.vacation_mode`(아이 전용 키), 켜면 시간표 대신 순위로 「방학 공부」·「맛보기」, 바뀌면 그날도 재편성(옛 `tp` 지움). `SettingsManager.saveToCloud`는 쓸 만한 학습설정 캐시가 없으면 노션 것을 먼저 읽어 바탕으로, 저장은 차례로. ④ 다시 보기 `v:` 오답은 `focus=<id|…>`(같은 단원, 민수는 단원 5개 이상) → `QuestLesson.buildLesson({ focus })`가 첫 레슨 앞자리에. ⑤ 로비가 고정 시간표를 하루 한 번 `MINMIN_TIMETABLE_STATIC_V1`에 받아 둠(시간표 화면 캐시와 더 최근 것 먼저), 받으면 `window.__lobbyRefreshBoosts()`로 버프 배지 다시 그림.

---

### 마이룸 인라인 CSS·JS 분리 (2026-10-31)
- `kids/common_space/my-room.html`(50줄)은 같은 폴더의 `my-room.css`(203줄), `my-room-core.js`(542줄) → `my-room-main.js`(490줄)를 원래 위치에서 상대 경로·`?v=20261031-room-split`로 로드합니다. 기존 `../config.js`가 먼저이며 클래식 스크립트·전역 상태·DOM·동작을 보존합니다.
- **🧸 마이룸 인형 (2026-11-20, 내 친구 월드 P4b)**: `my-room.html`이 main 뒤에 갤러리 데이터·몬스터 로스터·월드 부품(`world-save`·`world-sprites`·`world-sfx`·`hub-logic`·`garden-logic`)과 `my-room-dolls.js`(`MyRoomDolls`: `TAGS`·`galId`·`parseGalId`·`nearTag`·`trimAlbum`·`renderDock`·`renderRoom`)·`my-room-dolls.css`를 싣는다. 「🧸 내 친구」 탭(`switchTab('friends')`)에서 찾은 갤러리 친구를 공짜로 배치(`gal:{artId}#{charKey}`, 기존 `배치 정보`에 저장), 방에서 성격대로 걷고 태그 가구(`MARKET_ITEMS` 선택 필드 `tag`: sleep·eat·bounce·music)에 반응, 톡 말풍선·실로폰, 🚶 산책 켜기/끄기(`myroom_doll_roam_{profile}`), 📸 사진첩(IndexedDB `kids_world_album`, 아이별 6장). main 연결 3줄(`switchTab`·`renderDock`·`renderRoomFurniture`). 마이룸 상태는 `let` 전역이라 이름으로 직접 읽는다. 시험 `tests/world-myroom.test.mjs`.
- core는 상태·목록·저장/동기화 함수, main은 `initRoom`·`switchTab`·`buyItem`·`selectRoomMap`·가구 렌더링/드래그·`clearRoom`과 기존 `DOMContentLoaded` 등록을 담당합니다. 검증: `tests/my-room-split.test.mjs`(고정 fixture 원문·마크업·600줄 제한·core 단독 로드·전역 함수 보존), 분리 계약: `docs/my_room_split_spec.md`.

### 교재 이미지 체인저 인라인 CSS·JS 분리 (2026-10-31)
- 루트 `admin-image-changer.html`(247줄)은 원래 인라인 위치에서 `kids/css/admin_image_changer.css`(233줄), `kids/js/admin_image_changer-core.js`(459줄) → `kids/js/admin_image_changer-main.js`(412줄)를 상대 경로·`?v=20261031-admin-split`로 로드합니다. 기존 `kids/config.js`가 먼저이며 클래식 스크립트·전역 상태·DOM·원문·동작을 보존합니다.
- core는 설정·상태, `switchMode`·`refreshCurrentModeData`·교재/어휘 조회·파싱·필터·`renderQuestions`, `DOMContentLoaded`·전역 드래그 이벤트 등록을 담당합니다. main은 `toggleDrawer`·항목 편집·이미지 처리·토큰 모달·GitHub 업로드·노션 갱신·신규 등록·`showToast`를 담당하며 통신 방식은 바꾸지 않습니다.
- 검증: `tests/admin-image-changer-split.test.mjs`(고정 fixture 원문·마크업·600줄 제한·core 단독 로드·전역 함수 31개·이벤트 3개 보존, 모의 fetch만 사용). 분리 계약: `docs/admin_image_changer_split_spec.md`. 전후 화면 비교는 해당 명세서 §6에 따라 Claude가 담당합니다.

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
- `scripts/build_gallery.py`: `validate_diff_spots(spots)`, `build_spot_diff(...)`가 메타의 `spotDiff.modifiedImage`를 CDN의 `modifiedImageUrl`로 변환합니다. 일반 작품(`.jpg`) 및 누끼 작품(원본 알파를 입힌 투명 `.png`)을 지원하며, 이미지 비율·좌표·파일 오류는 놀이 데이터만 제외합니다. 포트폴리오에는 넣지 않습니다.
- 데이터 계약·부모 제작 절차: `docs/gallery_spot_diff_spec.md`, `docs/gallery_archive_spec.md`의 「틀린그림찾기 등록」.

### 🏃 `gallery-mini-runner.js` (갤러리 캐릭터 장착·60초 미니 런, 2026-10-29)
- 위치: `kids/common_space/gallery-mini-runner.js`. IIFE·전역 `GalleryMiniRunner`만 추가합니다. 로딩 시 DOM에 접근하지 않고 `gmr-style`은 화면을 열 때 한 번 삽입합니다. 로드 순서는 `monster_roster.js` → 이 모듈 → 모달 매니저입니다. 3호 `unknown_beast`(모름): 투명 PNG 6포즈(인사 그림을 roar에도 사용), 수수께끼 대사·에러리스 격려. 상세: `docs/monster_moreum_spec.md`. 4호 `rotek`(로텤스펲펲): 투명 PNG 6포즈(인사 그림을 roar에도 사용), 우당탕 뒤집기·늘리기 대사·에러리스 격려. 상세: `docs/monster_rotek_spec.md`.
- 화면 API: `bindModal(item, {available, viewer})`, `start(item, {viewer, onClose})`, `close()`. 모달 매니저는 작품 여부와 호출만 연결합니다. 아이는 자기 장착/해제, 부모는 자녀별 버튼을 사용합니다. 부모 게임은 민수 테마지만 자녀 최고 기록에는 쓰지 않습니다.
- 순수 API: `createWorld(seed, profile)`(문자열 또는 `{child,aspect,spriteAspect}`), `step(world, {jump}, dtMs)`, `hitboxOf(sprite,x,y,w,h)`, `resizeWorld(world, aspect)`. 높이 단위 물리·2단 점프·높이 70%/가로 최대 `.08` 판정·800ms 무적·최대 dt 50ms. 충돌해도 중단하지 않고 60초 후 항상 완주합니다.
- 세로 통과 보완: 중력 `.95`·점프 `.62`·장애물 폭 `.05`. 민서는 `clamp(aspect×.25,.15,.38)`, 민수는 `clamp(aspect×.40,.18,.58)`(30초 이후 ×1.12) 높이/초입니다. `resizeWorld`는 진행 거리와 장애물/별의 상대 거리를 보존해 이미 지나간 객체를 되돌리지 않습니다. `MonsterRoster.withJosa(name,pair)`로 장착 안내·제목의 조사를 공통 처리합니다.
- 소리: 획득/충돌 Web Audio는 `isSafeSfxEnabled()`를 따르고, 완주·새 선물은 `speakFairyTTS`의 상황 문장 한 번으로 안내합니다. 보석·사탕·학습 보상에는 연결하지 않습니다. 별 저금통만 아래 모듈을 통해 노션 INVENTORY_DB 「런너기록」에 씁니다.
- 정리: 일시정지·숨김·완주 시 rAF 중지, `close()`는 프레임·리스너·ResizeObserver·이미지·AudioContext를 해제하고 포커스·스크롤을 복구합니다. Esc·포커스 순환·44px 버튼을 지원합니다.
- 빌더: `scripts/build_gallery.py`의 `validate_character_name`, `load_character_sprite`, `build_character`. 메타 `character:{sprite,name}`를 검증·정리해 `{spriteUrl,name}`으로 내보냅니다. 실패는 선택 필드만 제외합니다. 자세한 계약은 `docs/gallery_character_runner_spec.md`입니다.
- 등록: 관제탑 `scripts/sync_quick_upload.py --character-sprite <PNG> --character-name <이름>` → `scripts/gallery_registration_options.py`의 `prepare_character`/`apply_character_plan`. PNG·이름은 공부방 빌더의 검증 함수를 재사용하며 `--title` 없이 character만 부분 병합합니다. 보조 모듈에는 기존 `AUTHOR_MAP`·`strip_author_prefix`·`find_built_gallery_item`·`prepare_spot_diff`·`set_meta_spot_diff`도 모았고 입구에서 재노출합니다.
- 등록 시험: 관제탑 `scripts/test_gallery_registration_options.py`(임시 구조·모의 큐·API·Git·제목 없는 `--no-push`). worktree에서는 `GALLERY_SCHOOL_SOURCE`로 공부방 빌더 위치를 지정합니다. 실제 콘텐츠·운영 노션에는 쓰지 않습니다.

### ⭐ `gallery-runner-rewards.js` (미니 런 별 저금통·꾸미기·별 자석·친밀도, 2026-10-31)
- 위치: `kids/common_space/gallery-runner-rewards.js`(377줄). IIFE, 전역 `GalleryRunnerRewards` 한 개. 로딩 시 DOM 접근 없음. `gallery.html`은 로스터 → 이 모듈 → 런너 순서, `quest_runner.html`은 `quest-runner.js` 앞, `monster_lab.html`은 로스터 앞에서 로드합니다. 상세: `docs/gallery_runner_star_bank_spec.md`, `docs/runner_friendship_spec.md`.
- 순수 계산: 읽기 전용 `LADDERS`, `unlockedOf(child,total)`, `nextGoal(child,total)`, `newlyUnlocked(child,before,after)`. 아이별 기본 4종·선물 9종. 저장된 해금 목록 없이 누적 별로 계산합니다.
- 로컬 API: `readBank(child)`, `addStars(child,n)`, `setLoadout(child,kind,id)`. 키 `galleryRunnerBank_son`/`galleryRunnerBank_daughter`, JSON `{v,total,pending,loadout,boostDate,updatedAt}`. 잘못된 장착은 기본값, 저장 실패는 false, 별은 0 이상 안전 정수만 허용합니다. 기존 로스터의 최고 기록 키는 유지합니다.
- 친밀도 API: 읽기 전용 `FRIEND_LEVELS`, `addRun(child,key)`, `friendshipOf(child,key)` → `{runs,level,name,next:{level,remaining}|null}`. 키는 `{artId}#{charKey}`, 완주 경계는 0/3/8/15/25판. 로컬 JSON에 `friends`·`friendsPending`을 더하고 노션에는 `friends`만 보냅니다. 옛 v1은 빈 친밀도, 잘못된 숫자는 0으로 읽습니다.
- 친밀도 동기화: GET의 키별 누적에 이 기기의 `friendsPending`만 더하고 성공한 스냅샷만 차감합니다. 같은 실행 구간의 `addStars`·`addRun`은 PATCH 한 번으로 묶으며 전송 중 새 적립은 보존합니다. 부모는 적립하지 않고 연구소는 로컬 조회만 하며 pull·flush하지 않습니다.
- rich_text 길이: 전체 JSON이 1900자를 넘으면 pending 없는 친밀도 항목을 완주 수 오름차순(동률은 키 순서)으로 제거합니다. pending만으로도 넘으면 PATCH를 보류하고 로컬·pending을 보존합니다. 잘라낸 기록은 저장 성공 후 로컬에도 반영합니다.
- 동기화: `pull(child)`·`flush(child)`는 예외를 밖으로 던지지 않습니다. GET `?force=true`로 읽은 클라우드 `total`에 로컬 `pending`만 합산하고 PATCH 본문은 「런너기록」 한 속성뿐입니다. 「학습설정」은 읽거나 쓰지 않습니다. 속성이 없거나 `type !== 'rich_text'`이면 PATCH하지 않습니다.
- 같은 아이의 요청은 직렬화하고 겹친 flush는 끝난 뒤 재처리합니다. PATCH 도중 생긴 pending·꾸미기 변경도 보존합니다. 다른 두 기기의 동시 GET/PATCH 경합은 허용하며 서버 원자적 합산은 제공하지 않습니다.
- 자석: `markQuestBoost(child)`는 로컬 오늘 날짜를 저장하고 비동기 flush합니다. `hasBoostToday(child)`로 확인합니다. 기존 `showClearModal` 또는 최신 full·한입 레슨의 `quest-lesson-complete` 이벤트가 완주마다 한 번 호출하고 기존 보상·학습일지 경로는 유지합니다. 런 시작은 그림 로딩과 pull을 병행하며 동기화는 최대 1.5초만 기다립니다. 별 판정만 사방 `.05` 확장하고 장애물은 유지합니다.
- 부모: 저금통 읽기·쓰기·fetch 없음, 자석 꺼짐. 모든 선물 미리보기는 세션에만 둡니다.
- 화면 API: `drawStage(ctx,world,id)`, `drawTrail(ctx,points,id)`, `drawHat(ctx,player,id)`, `drawStar(ctx,star,x,id)`는 저장소·DOM·rAF 접근 없이 그립니다. 모자는 플레이어 중심으로 이동·회전한 좌표계에서 호출합니다. 꼬리 10개 위치는 세션에만 두며 동작 감소 시 수집·그리기를 생략합니다.
- 패널: `openWardrobe(session,{child,viewer,onBack})`, `appendBankSummary(session,child,total,gifts)`는 기존 `.gmr-message` 안에만 표시합니다. `session.redraw`로 정지 화면을 갱신합니다. 44px 버튼·`aria-pressed`·progress·잠김 안내를 제공합니다.
- 회귀 시험: `tests/gallery-runner-rewards.test.mjs`의 모의 노션 두 기기·오프라인·속성 유형·중첩 요청·로컬 자정·부모 격리, `tests/gallery-character-runner.test.mjs`의 자석·장애물·줄 수 검사를 사용합니다.

기존 1,517줄의 거대했던 `gallery_controller.js`를 331줄의 초경량 메인 뷰 컨트롤러로 슬림화하고, 단일 책임 원칙에 따라 전문 서브모듈 2종으로 완전 분리 구축한 갤러리 코어 엔진군입니다.
- **파일 위치**:
  - `kids/common_space/gallery_controller.js` (331줄): 유저 테마 적용(DOM null 안전 가드), 2대 뷰 모드 스위처(작품 vs 특별한 날), 필터 바 및 카드 그리드 렌더러, 빠른 좋아요.
  - `kids/common_space/gallery-data-sync.js` (573줄): 로컬 데이터 로드/저장, 카테고리 정의(`ART_CATEGORIES` 5대 분류 + `캐릭터`(🧸 캐릭터 친구들, 2026-11-20 내 친구 월드 P0) · `SPECIAL_CATEGORIES`), 노션 실시간 양방향 동기화 및 영구 수정 이력(Audit Trail) 콜아웃 블록 적재. 작품 분류는 `gallery.html` 선택 목록 2곳·빌더 `build_gallery.py` `normalize_category`·관제탑 `sync_quick_upload.py` `ICON_MAP`과 같아야 한다(시험 `tests/gallery-character-category.test.mjs`).
  - `kids/common_space/gallery-modal-manager.js` (644줄): 상세 모달 뷰, 다중 사진 썸네일 스위처(창 안 `🎬 3D 회전영상` 칸은 `.mp4/.webm/.mov/.m4v` 파일 주소일 때만; 구글 포토 등 공유 주소는 새 창 버튼만), 메타 웹 편집, 작가의 한마디 직접 수정, 스티커 및 칭찬 댓글(XSS 방어).
  - `kids/common_space/gallery-3d-layout.js` (393줄, `window.Gallery3DLayout`, DOM 없음): 3D 전시관 계산. `buildLayout(items)`(10점씩 전시실, 좌우 벽 번갈아, 간격 3.2m)·`fitFrame`·`viewpointFor`·`clampPosition`·`planTextures`(가까운 순 예산·여유 4)·`stepIndex`·`roomLabel`.
  - `kids/common_space/gallery-3d-scene.js` (240줄, `window.Gallery3DScene`): CFG·THEMES(`neon`·`pastel`), 벽·바닥·간판·액자·이름표 CanvasTexture, `buildHall(state)`·`buildFrames(state)`·`applyFrameDimensions`.
  - `kids/common_space/gallery-3d-hall.js` (745줄, `window.Gallery3DHall`): `open({items, theme, heading, isBlocked, onSelect, onBackWhileBlocked, onClose})`·`close()`·`isOpen()`·`debugInfo()`. Three.js r169를 열 때만 jsdelivr에서 불러옴, 그림자 없음, DPR 1.75 상한, 움직일 때만 그림, 폰 14장/PC 24장 사진 예산, 액자 클릭 시 앞에 선 뒤 `🔍 크게 보기` 버튼(`.g3d-view`)으로 `onSelect` 호출, 안드로이드 뒤로가기 처리, 닫으면 dispose·`forceContextLoss`. 컨트롤러 `open3DHall()`·`getFilteredGalleryItems()`가 부름. 명세 `docs/gallery_3d_hall_spec.md`.
- **핵심 API**:
  | 함수 | 모듈 | 설명 |
  | :--- | :--- | :--- |
  | `switchViewMode(mode)` | `gallery_controller` | 'art'(성장 작품) ↔ 'special'(특별한 날 추억) 2대 뷰 모드 전환 |
  | `renderGallery()` | `gallery_controller` | 작성자/분야별 필터가 적용된 갤러리 카드 그리드 반응형 렌더링 |
  | `loadGalleryData()` | `gallery-data-sync` | 로컬 스토리지 및 마스터 데이터 병합 로드 (버전 체크 포함) |
  | `syncFromNotionGallery()` | `gallery-data-sync` | 노션 GALLERY_DB에서 최신 제목/날짜/한마디 백그라운드 동기화 |
  | `syncArtworkToNotion(art, oldState)` / `syncSpecialDayToNotion(item, oldState)` | `gallery-data-sync` | 화면 수정 내용을 노션 `제목`·`날짜`·`작가의 한마디/일기본문`에 저장 + 수정 이력. 분야·동영상은 노션 속성이 없어 보내지 않음 (회귀 시험 `tests/notion-contract.test.mjs`) |
  | `openDetailModal(id)` | `gallery-modal-manager` | 작품/추억 상세 모달 팝업 열기 (다중 썸네일, 비디오 링크 자동 마운트). 영상 버튼: `videoUrl` 1개 + `videos` 중 그 주소와 다른 것들. 버튼 문구 맨 앞 이모지는 `splitLeadingEmoji`가 아이콘으로 떼어 내 두 번 붙지 않음 |
  | `addStickerReaction(type)` | `gallery-modal-manager` | 하트/따봉/별/트로피 스티커 반응 누르기 및 노션 실시간 동기화 |
  | `submitComment()` | `gallery-modal-manager` | 가족 칭찬 댓글 등록 (textContent 안전 주입 및 노션 블록 적재) |

---

## 2-0-2. 🎲 가족 보드게임 · 야추 (2026-10-31)

- 진입: `kids/playground/index.html`의 가족 보드게임 카드 → `kids/playground/family/yacht.html`. 2~5명이 한 기기를 돌려 쓰는 12칸·12라운드 놀이이며 보석·사탕·EXP·학습 계측·노션 저장에 연결하지 않습니다. 계약: `docs/family_yacht_spec.md`.
- `kids/playground/family/yacht-engine.js`: DOM·저장소 없는 IIFE, 전역 `YachtEngine` 하나. `CATEGORIES`, `createGame(players,rng)`, `roll(state,rng)`, `toggleKeep(state,index)`, `scoreFor(dice,category)`, `scoreOptions(dice)`, `choose(state,category)`, `totals(scores)`, `isOver(state)`, `ranking(state)`, `hints(state,mode)`. 기본 난수는 `crypto.getRandomValues`, 시험은 RNG 주입.
- 상태: `{v:1,gameType:'yacht',stateVersion,round,turnPlayer,players,publicBoard:{dice,kept,rollCount,scores},lastAction}`. 참가자 `{id,name,avatar,assist}`, 점수는 참가자 ID별 12칸(`null`=미기록). 초기 `lastAction:null`, 기록 행동에는 `category` 포함. 유효 행동만 새 상태·버전 +1, 무효 행동은 원본 반환. 동점은 1·1·3등.
- 도움: `hints`는 `{previews,recommendations}`, 클래식·굴리기 전·완료 뒤는 `{}`. 전술은 빈 칸 중 점수 상위 2개, 동점이면 뒤쪽 칸 우선. 풀하우스는 같은 눈 5개도 인정합니다.
- `kids/playground/family/yacht-ui.js`: IIFE·전역 `YachtUI.boot()`, 설정·굴리기·0점 확인·순위·이어하기. `yacht.html`은 얇은 래퍼, `yacht.css`는 가로/세로 배치·64px 주사위·동작 감소 스타일입니다.
- 말: `gallery-data.js`의 `DEFAULT_GALLERY_DATA`와 `MonsterRoster.charactersOf(item)` 재사용. `{type:'gallery',value:{artId,charKey,name,spriteUrl}}` 또는 `{type:'emoji',value}`. 작품 ID+캐릭터 키로 중복 방지, 그림 오류·2.5초 로딩 지연 시 참가자별 서로 다른 이모지로 표시합니다. 기존 파트너 장착값은 바꾸지 않습니다.
- 이어하기 키 `familyYachtGame`은 기기 로컬에만 저장합니다. 읽을 때 버전·참가자·12칸 점수·차례/라운드·행동을 검사하고 잘못된 값은 새 게임으로 처리합니다. 종료 시 삭제하고 저장 실패도 게임은 계속합니다.
- 소리: `fairy-config` → `fairy-tts` → `fairy-settings-catalog` → `fairy-engine` 로드. `speakFairyTTS(text,onEnd,{skipPreset:true})`로 차례·야추를 읽고 `fairyReward()`는 종료 효과음만 냅니다. 안내 음소거는 이 화면 세션에만 적용합니다. 갤러리 CDN·공통 TTS는 허용하며 CSP는 추가하지 않습니다.
- 검증: `tests/yacht-engine.test.mjs`가 VM에서 브라우저 IIFE를 직접 로드해 규칙·불변 상태·도움·완주·입력·리소스 계약을 검사합니다. 화면 검증은 guarded preview 서버와 외부 요청 중단 환경에서 수행하며 실제 CDN·TTS 성공과 구분합니다.

---

### ⚫ 가족 오목 · 공용 참가자 설정 (2026-11-01)
- 진입: 로비 두 아이의 놀이터 목록 → `kids/playground/family/omok.html`, 놀이터 대문의 `family/omok.html`. 한 기기 2인, 기본 13줄(9·15줄 선택), 5개 이상 연결 승리·금수 없음. 계약: `docs/family_omok_spec.md`.
- `kids/playground/family/omok-engine.js`: DOM·저장소·통신 없는 IIFE, 전역 `OmokEngine` 하나. 공개 API `SIZES`, `createGame(players,size=13)`, `boardOf(state)`, `place(state,x,y)`, `undo(state)`, `hints(state,mode)`, `rematch(state)`, `isValidSaved(state)`.
- 상태: `{v:1,gameType:'omok',stateVersion,turnPlayer,players,publicBoard:{size,moves,undoLeft},result,lastAction}`. 참가자는 `{id,name,avatar,assist,stone}`, 수순은 `{x,y,by}`. 결과는 null/win(winner·line)/draw. 유효 행동만 불변 새 상태·버전 +1, 무효는 원본 반환.
- `undo`는 직전 PLACE의 착수자만 2회까지, 승부 전 허용. UNDO 뒤 연속 무르기는 불가. `rematch`는 참가자 순서를 뒤집어 흑백을 교대하고 버전 +1·`lastAction:{type:'REMATCH'}`. helper는 win·block, tactic은 block만, classic·승부 뒤는 빈 객체.
- `omok-ui.js`/전역 `OmokUI.boot()`: 두 번 누르기 또는 확인 버튼으로 착수, 도움·마지막 돌·승리선, 사람별 무르기, 승부·음소거·이어하기. `omok.html`은 얇은 래퍼, `omok.css`는 CSS 격자·돌과 가로/세로 배치. 시작 설정 스타일은 기존 `yacht.css`를 함께 로드해 재사용.
- 저장 키 `familyOmokGame`은 기기 로컬 전용. 수순 재생으로 차례·결과·승리선을 검증하고 버전·무르기·마지막 행동도 확인. 형식 오류는 폐기, 종료 시 삭제, 저장소 차단에도 플레이 지속. 게임 기록 전송·보상·학습 계측 없음.
- `kids/playground/family/family-players.js`: 야추·오목 공용 IIFE, 전역 `FamilyPlayers` 하나. `avatarKey`, `collectAvatars`, `showAvatar`, `fallbackFor`, `playerAvatar`, `defaultMode`, `createSetup({host,count,min,max,modes})`; 설정 인스턴스는 `setCount(count)`, `render()`, `getPlayers()` 제공. 갤러리 목록·작품+캐릭터 중복 제거·그림 오류/2.5초 지연·서로 다른 이모지 대체를 한 벌로 유지. 이전 그림 타이머가 새 표시를 덮어쓰지 않음.
- `kids/playground/family/family-sound.js`: 윷놀이·오목·야추의 안내 음성 버튼 공용 IIFE, 전역 `FamilySound` 하나. `bindToggle(button, onChange(muted))`는 `fairy_tts_enabled`가 `false`면 꺼짐으로 표시하고, 게임에서 켜면 이 값을 `true`로 바꿔 전체 음성도 켭니다. 끌 때는 그 게임 화면만 끕니다.
- 야추 HTML은 엔진 → family-players → UI 순서로 로드. 야추의 `familyYachtGame` 키·말 저장 형식·설정 문구·CSS는 보존. 오목 음성은 시작·승부 때만 공통 TTS와 종료 효과음을 사용.
- 시험: `tests/omok-engine.test.mjs`(순수 규칙·수순 재생·리소스), `tests/family-players.test.mjs`(말 목록·대체·설정·모의 DOM 클릭·야추 공용화). 실제 화면 검수는 Claude가 쓰기 차단 서버에서 별도로 수행.

### 📱 가족 방 · 여러 기기 야추·오목·윷놀이
- 계약: `docs/family_room_spec.md` §13·§14·§15·§16. 운영 Worker 소스는 관제탑 `workers/family-room/`이며 배포 상태는 해당 명세서 첫머리·§12를 참조합니다. 한 기기 모드는 독립입니다. 새 게임은 `mount` 연결과 `validSnapshot`만 쓰면 Worker를 고치지 않습니다.
- `kids/playground/family/family-room.js`: DOM 없는 IIFE·전역 `FamilyRoom`. `create({gameType,maxSeats,onSnapshot,onStatus,onRejected})` → `createRoom/join/setSeats/start/submit/claim/kick/lobby/leave/reconnect/stop/getSnapshot/getStatus`. `onSnapshot(snapshot,previous,{initial})`, `onStatus({state,reason,locked,offlineSince})`. 보조 API `getClientId/readSession/serverURL/codeValid/ownSeats/permissionsFor/canClaim/seatDrafts/acknowledged/clearSession`.
- `kids/playground/family/family-room-ui.js`: 전역 `FamilyRoomUI.mount({gameType,maxSeats,title,modes,createGame,hostOptions,onRoom,onGame,onLobby,onLocal,onView,onLock,validate})` → `boot/back/invalid/continueLocal/getRoom`. 입구·자동 복구·대기실·소유권·한 기기 전환. `hostOptions()`는 방장에게만 보이는 시작 옵션 요소(오목 판 크기)를 돌려줍니다. 순수 판단 API `initialSeat/usableAvatar/validDrafts/validRoom/startReason`. `#resumeMultipleDevices`가 있으면 이어하기 화면에서도 여러 기기 입구로 갑니다. 다른 게임의 코드는 입구로 돌려보냅니다.
- 대기실은 이 기기의 `FamilyPlayers.createSetup` 하나를 사용합니다. 추가 인자 `isTaken(avatar,player)`·`onChange(players)`, 인스턴스 `setPlayers(players)`는 조용한 복사·복원입니다. 기본 인자가 없으면 기존 한 기기 설정을 유지합니다. 이름은 400ms 지연, 잠금 중에는 최신 초안 하나만 보존합니다.
- 로드: 기존 오디오·갤러리 → yacht-engine → family-players → family-room → family-room-ui → yacht-ui. 오목은 family-players → omok-engine → family-room → family-room-ui → omok-ui. 추가 CSS `family-room.css`는 방 선택자만 꾸밉니다. 모든 로드 경로는 상대 경로입니다.
- `YachtUI` 추가 순수 API `validSnapshot/inputFor/effectsFor`. 방 스냅샷 모양·버전·자리 ID를 확인하고 개인 도움·입력·효과를 분리합니다. 다시 하기는 현재 서버 rev를 쓰는 act입니다. 구경 기기는 다시 하기·reward 대상이 아닙니다.
- `OmokUI` 추가 순수 API `validSnapshot/inputFor/effectsFor`. 판 검사는 엔진 `isValidSaved` 수순 재생과 자리 ID 집합으로 합니다(다시 하기가 흑백을 바꿔 사람 순서가 자리 순서와 다를 수 있음). 미리보기는 이 기기에만 있고 판이 바뀔 때 지웁니다. 무르기는 마지막 착수자의 기기에서만 켜집니다.
- 서버 상수 `https://family-room.awslike6.workers.dev`, localhost·127.0.0.1만 `?roomServer=` 재정의. JSON의 `type`, 25초 문자열 ping/pong, 5초 응답·첫 판·pong 시한. 이전 소켓 이벤트는 무시하고 현재 4409만 자동 복구를 정지합니다.
- 방 모드 저장은 `familyRoomClientId`, `familyRoomSession={code,gameType,clientId}`뿐입니다. 기존 `familyYachtGame`·`familyOmokGame`은 읽기 복귀·명시적 한 기기 전환 외에 방 모드에서 변경하지 않습니다. 상태·이름을 노션·로그로 보내지 않습니다.
- 시험: `tests/family-room.test.mjs`(통신), `tests/family-room-ui.test.mjs`(대기실·복구), `tests/family-yacht.test.mjs`·`tests/family-omok.test.mjs`(입력·효과·안전·한 기기 회귀). 공용 모의 브라우저는 `tests/family-browser.mjs`(`game` 인자로 게임 선택)이며 실제 네트워크를 사용하지 않습니다.
- 파일 크기(끝 공백 제외): family-room.js 210줄(상한 300), family-room-ui.js 310줄(400), family-room.css 19줄(200), family-players.js 172줄(기존 대비 +13), yacht-ui.js 416줄(600), yacht.html 91줄(150), omok-ui.js 321줄(600), omok.html 83줄(150).

### 🎲 가족 윷놀이 규칙 엔진 & 화면 (2026-11-02)
- 계약: 규칙 엔진 `docs/family_yut_engine_spec.md`, 화면 `docs/family_yut_ui_spec.md`.
- `kids/playground/family/yut-engine.js` (272줄, 상한 300): DOM·저장소·통신 없는 IIFE, 전역 `window.YutEngine` 하나(`Object.freeze`). 공개 API `THROWS`, `STEPS`, `WAITING`, `DONE`, `routeOf(from,steps)`, `rollSticks(rng=Math.random)`, `createGame(players,pieceCount=4)`, `legalMoves(state)`, `applyThrow(state,result)`, `applyMove(state,pieceId,throwIndex)`, `rematch(state)`, `isValidSaved(state)`.
- 상태: `{v:1,gameType:'yut',stateVersion,turnPlayer,players,publicBoard:{pieceCount,phase,pending,log,pieces},result,lastAction}`. 참가자는 `{id,name,avatar,assist}`(2~4명), 말은 `{id,owner,pos,trail}`(인당 2~4개, `-1` 대기·`1~29` 판·`30` 완주), `phase`는 `throw`/`move`/`over`. 유효 행동만 불변 새 상태·버전 +1을 반환하고 무효 행동은 원본을 그대로 반환합니다.
- 화면: 진입 놀이터 대문의 `family/yut.html`, 로비 놀이터 목록. `yut.html`(121줄, 상한 150), `yut-ui.js`(577줄, 상한 600, IIFE 전역 `YutUI`), `yut.css`(131줄, 상한 300). 저장 키 `familyYutGame`(로컬 전용).
- 가족 방(2026-11-03, 병합·운영 왕복 확인, 실기기 한 판 대기): `FamilyRoomUI.mount({gameType:'yut',maxSeats:4,...})`와 방장 `hostOptions`의 말 개수 2~4개 선택. `YutUI` 공개 API는 `boot/validSnapshot/inputFor/effectsFor`. 로드: family-players → yut-engine → family-room → family-room-ui → yut-ui, CSS는 기존 스타일 뒤 family-room.css. Worker·공용 방 모듈·엔진은 변경하지 않습니다.
- 방 상태는 엔진 상태 + 최상위 `lastSticks:null|boolean[4]`. 던진 기기의 결과·가락 순서를 확정 스냅샷으로 공유하고 수신 기기에서 재추첨하지 않습니다. 가락 필드를 뺀 판의 수순 재생·자리 ID 집합·말 허용 범위·최근 THROW와 가락의 일치를 검사합니다. 이동은 가락 배열 보존, 다시 하기는 배열 초기화·참가 순서 회전입니다.
- 입력·도움은 차례 자리의 소유 기기만, 칩·말 미리보기는 기기 로컬입니다. 재접속·넘겨받기·대기실·이탈은 공용 방 경로를 사용하며 효과는 새 판 변화에만 냅니다. 방에서는 `familyYutGame`을 변경하지 않고 명시적 한 기기 전환 때만 `lastSticks`를 빼고 로컬 저장합니다.
- 시험: `tests/yut-engine.test.mjs`(순수 규칙 엔진), `tests/family-yut.test.mjs`(화면·조작·소리·이어하기 모의 브라우저), `tests/family-yut-room.test.mjs`(여러 기기 가락·결과·입력·복구·자리·다시 하기·저장 분리). 가족 방은 병합·운영 왕복 확인, 실기기 한 판 대기입니다. 운영 Worker의 Node 네 기기 한 판(말 2개·156수)과 쓰기 차단 화면 한 기기·Node 한 기기의 한 판·새로고침 복귀를 확인했습니다. 실기기 두 대, 실제 음성, 폰 잠금 복귀는 미확인입니다.

## 2-0-3. 📮 가족 우체통 (가족 메시지 + 안드로이드 폰 알림, 2026-11-16)
- 계약: `docs/family_mail_spec.md`. 서버는 관제탑 `workers/family-mail/`(Worker `family-mail`, 메시지는 노션 「가족 메시지 DB」에만 저장, 기기·구독은 D1). 4명 고정: `minsu`·`minseo`·`mom`·`dad`.
- `kids/core/family-mail.js` (약 460줄, IIFE·전역 `FamilyMail`): 서버 통신(localhost·127.0.0.1에서만 `?mailServer=http://로컬주소`, sessionStorage에만 기억), 기기 등록 `register/unregister/getDevice`(토큰은 localStorage `familyMailDevice`, 밖으로 내주지 않음, 401이면 지우고 `familymail:device` null), 폰 알림 `pushStatus/enablePush`(버튼 click 안에서만)·앱을 열 때 구독을 서버와 맞춤(공개키가 바뀌면 다시 구독), 메시지 `send/list/markRead/refreshUnread`, `draft`(쓰다 만 글 `familyMailDraft`), `formatTime`(KST: 오늘 "오후 7:30", 올해 "11/14"), `countChars`(이모지 1글자), `speak`(`speakFairyTTS`가 있을 때만), `mailboxURL`, `onOpenMessage`, `watch`. 오류는 `FamilyMail.FamilyMailError {status, code, message(아이용 한국어)}`.
  - 자동 감시: `<script src=".../family-mail.js?v=..." data-watch="popup|quiet">`. `popup`은 `lobby.html`·`index.html`(안 읽은 메시지 팝업 + 📮 배지), `quiet`는 우체통 화면(배지·목록 갱신만). 문제 풀이·퀘스트·게임 화면은 이 파일을 싣지 않는다(공부 흐름을 끊지 않음, 폰 알림은 그대로 옴).
  - 확인 시점: 화면을 열 때·다시 보일 때·보이는 동안 90초마다·서비스 워커가 `postMessage`로 알릴 때. 팝업은 오래된 안 읽은 메시지 1개, 바깥을 눌러도 닫히지 않고 「확인했어요」·「답장」을 눌러야 읽음. 읽음 처리가 실패해도 이번 탭에서 다시 띄우지 않는다(sessionStorage `familyMailSeen`). 팝업 CSS는 이 파일 안(`#familyMailPopupStyle`, `.fmp-*`)이라 로비가 따로 싣지 않는다. 소리는 내지 않는다(폰 알림 소리로 충분, 캐릭터 대사가 맞지 않음).
  - 📮 배지: `[data-family-mail-chip]`(누르면 우체통) 안의 `[data-family-mail-count]`에 숫자(100개 넘으면 "99+", 0이면 숨김). 로비는 민서 헤더 둘째 줄(하리보 옆)·민수 헤더 오른쪽 버튼 줄, 첫 화면은 「📮 가족 우체통」 버튼.
- `sw.js` (저장소 맨 위, 약 55줄): 서비스 워커. `push` → 알림(같은 보낸 사람은 `tag`로 묶고 `renotify`로 다시 울림, 상태 표시줄 아이콘 `kids/assets/images/family-mail-badge.png` 흰색 96px) + 열린 창에 `postMessage`. `notificationclick` → 우체통이 열려 있으면 이동하지 않고 그 메시지만 열게 함(쓰던 글 보존), 없으면 새 창. **`fetch` 처리기·캐시 없음**(배포 뒤 옛 화면이 남는 사고 방지). 주소는 모두 `registration.scope` 기준 상대.
- `kids/common_space/family_mail.html` + `family-mail-page.js`(약 520줄, 전역 `FamilyMailPage {start, recipientsFor, insertAtCursor, el}`) + `family-mail.css`(약 150줄): 처음 설정(누구 폰 4명·가족 코드·기기 이름 → 알림 받기·홈 화면 추가·배터리 안내), 받은/보낸 탭, 펼치면 읽음·🔊 읽어 주기·💌 답장, 보낸 것에 읽음 시각, 쓰기(나를 뺀 3명, 이모지 24개 커서 자리 삽입, 실패하면 글 보존·같은 clientId 재전송), 설정(알림 다시 연결, 등록 해제는 확인 창). 쿼리 `?open=<id>`·`?compose=<멤버>`·`?setup=1`. 테마 `body[data-theme=parent|minseo|minsu]`. 로드: `../config.js` → `../core/fairy-config.js` → `../core/fairy-tts.js` → `../core/family-mail.js`(quiet) → `./family-mail-page.js`. 화면 JS·CSS 초안은 안티그래비티 Hydrogen, 검토·수정은 Claude.
- `manifest.json` 바로가기 「📮 가족 우체통」(`./kids/common_space/family_mail.html`).
- 시험: `tests/family-mail.test.mjs`(13개: 서버 주소 재정의 제한, 상대 경로, 등록·토큰 비공개, 401, 팝업 글자 그대로·안 닫힘·확인·실패 시 되풀이 없음·답장, quiet, 배지, 보일 때만 확인, KST 시각, 금지 규칙·서비스 워커 fetch 없음, 화면 연결), `tests/family-mail-page.test.mjs`(7개: 설정·받은/보낸·쓰기 재전송·임시 글·등록 해제·도우미). 공용 모의 브라우저·모의 서버 `tests/family-mail-browser.mjs`(실제 네트워크 없음, `innerHTML`을 쓰면 오류).


## 2-0-4. 🧩 가족 출제 퀴즈 「오빠가 낸 문제」 (2026-11-19)
- 계약: `docs/family_quiz_spec.md`. 노션 「가족 출제 DB」(`APP_CONFIG.FAMILY_QUIZ_DB_ID`, 표: `docs/notion_schemas_school.md`). 민수가 출제하고 민서가 푼다. 보석·학습일지·5분 퀘스트와 섞지 않는다.
- `kids/core/family-quiz-store.js` (IIFE·전역 `FamilyQuiz`): `fromPage`(행 → `{id, question, answer, wrongs[3], hint, author, solver, status, version, editedOn, solvedVersion, result, report}`), `validate(draft)` → `{ok, errors, warnings, draft}`(빈 칸·겹치는 보기·정답=오답·글자 수(문제 80·보기 20·힌트 60) 막음, 문제 40자 넘으면 경고만), `isNew`/`pickNew(list, 푸는사람, max)`(공개이고 `푼버전` 없음·`< 버전`, 고친날 오래된 순), `choicesOf`(0번 = 정답), `listForSolver`/`listByAuthor`(늘 `?force=true`, 공개 행만), `create`/`revise`(버전+1, 풀이 기록·신고 비움)/`hide`(상태=숨김, 지우지 않음)/`recordResult`(실패 시 1번 다시), `notify(from, to, 글)`(이 기기가 우체통에 from으로 등록됐을 때만, 30분에 1번 `familyQuizMailAt_{아이}`), `draft`(쓰다 만 문제 `familyQuizDraft_minsu`), `mountLobbyCard(el, 'minseo'|'minsu')`, `localDate`.
  - 로비: `lobby.html`이 `lobby_config.js` 앞에서 싣고, `lobby_controller.js` `applyLobbyThemeAndView`가 `#familyQuizCardMinseo`(새 문제 있을 때만 「🎁 오빠가 낸 문제 N개!」) / `#familyQuizCardMinsu`(늘 「🧩 동생 문제 만들기」, 신고 수 🚩 배지)를 채운다.
- `kids/common_space/family_quiz.html` (`?user=minsu` 출제실 / `?user=minseo` 풀이방 / 그 밖은 로비로) + `family-quiz-play.js`(전역 `FamilyQuizPlay {playRound(stage, quizzes, {record, onDone}), runSolverPage, mailText, speakThen}`: `QuizChoices.arrange`로 섞고 원래 번호 채점, 0.3초 뒤 자동 읽기, 보기 읽고 채점, 첫 오답 격려·두 번째 오답 정답 노란 안내+힌트 읽기, 🚩 이상해요 3가지 이유, 결과 `한번에`/`두번째에`/`도움받음`) + `family-quiz-author.js`(전역 `FamilyQuizAuthor {mount}`: 쓰기 칸·글자 수·🔊 들어보기·👀 민서처럼 풀어 보기(`playRound` record:false)·🚀 출시·🛠️ 고쳐서 다시 내기·내리기·내 문제 목록 칩) + `kids/css/family-quiz.css`(로비 카드 모양 포함). 아이 글은 `textContent`·`value`로만 넣는다.
- 시험: `tests/family-quiz.test.mjs`(7개: 행 변환, 입력 검사, 새 문제 고르기, 출시·고치기·기록 값, 질의 캐시 건너뛰기, 우체통 묶음, 로비 카드).

## 2-0-5. 🌍 내 친구 월드 공용 부품 (P1, 2026-11-20)
- 명세: `docs/world_module_spec.md`(§11이 함수 계약). 광장·아레나·정원 화면은 아직 없음(P2~P4). 모두 `kids/playground/world/` 아래, IIFE·전역 하나·불러올 때 DOM 접근 없음. 초안: 안티그래비티 Hydrogen, 검토·노션 동기화: Claude.
- `core/world-save.js` (362줄, `WorldSave`): 기기 저장 `kids_world_v1_{son|daughter}` + 노션 인벤토리 「월드기록」 한 칸. `fnv1a`·`shortId`(6자, 겹치면 `'#'+id` 해시로 7자)·`assignIds`·`emptyState`·`clean`·`merge`(교환·멱등·흡수, 합집합·짧은 기록·`cfg._t`·`at`)·`pack`(1,800자, best → 없는 그림 cfg 순으로 버림, seen·found는 보존)·`parseCfg`/`formatCfg`·`childOf`/`isParent`·`load`/`save`/`update`(1.5초 뒤 `flush`, 부모는 노션 안 씀, 설정 바뀌면 `cfg._t`)·`setSyncHook`·`setLiveIds`·`inventoryProps`(인벤토리 속성 읽기 전용)·`pull`/`flush`(「런너기록」과 같은 조회, 그 칸 하나만 PATCH, 칸 없음·유형 다름·JSON 깨짐이면 안 씀, 같으면 안 씀). 페이지 id 캐시는 런너와 같은 `MINMIN_INVENTORY_PAGE_ID_{이름}`.
- `core/world-sprites.js` (233줄, `WorldSprites`): `collect`(갤러리 `charactersOf` + 몬스터 로스터, 작성자 필터·놀러 오기·중복 제거, 몬스터 포즈 경로 `resolvePath`로 상대 경로화), `authorsFor`, `hueTrait`·`dominantColor`(그림 대표색 → 무기 효과 f·i·l·w·x·r), `newFriends`, `liveOnly`, `load(item, size)`(`crossOrigin='anonymous'`, 4초, 줄인 화면 밖 캔버스·대표색, 캐시). kids-archive CDN 그림의 색 읽기 확인(2026-11-20).
- `core/world-view.js` (144줄, `WorldView`): `fitView`(짧은 변 600 미만 360·이상 540, 균일 확대), `dprFor`(1~2), `clampDt`(최대 0.05초), `follow`(카메라·월드 경계·작은 축 가운데), `toScreen`/`toWorld`, `mount(canvas)`(부모 크기·DPR·ResizeObserver), `createLoop`(rAF·숨으면 멈춤).
- `core/world-input.js` (206줄, `WorldInput`): `stickVector`, `keyboardVector`, `pickTarget`(자동 조준), `attach(el)`(왼쪽 절반 플로팅 조이스틱 `.world-stick`, `[data-action]` 버튼, Space·Shift·Q, `read()`).
- `core/world-fx.js` (240줄, `WorldFX`): `createFx`(입자 풀 40·9종, 흔들림, 히트스톱, 화면 번쩍임), `body`(숨쉬기·착지 스쿼시·맞음 번쩍임), `shadow`, `silhouette`.
- `core/world-sfx.js` (137줄, `WorldSFX`): Web Audio 합성 효과음 9종(5음계 실로폰 포함), `unlock`, 음소거 키 `kids_world_sfx`.
- `world.css` (343줄): `theme--arcade`·`theme--slime` 변수, `.world-stage`(100dvh·안전 영역·터치 제스처 차단), HUD·조작 구역(아래 28%)·버튼 56/64px·조이스틱·선택 판·칩·가로 폰 배치.
- 시험: `tests/world-core.test.mjs`(23개: 공통 규칙, 해시 기준값·충돌 쌍, clean, merge 성질 무작위 500회, pack, cfg, 기기 저장, 모의 노션 동기화 3, 그림 목록·대표색, 화면·카메라, 입력, 연출, 소리). 375×812·812×375·1280×800에서 조이스틱·공격·그림 불러오기 확인(임시 확인 화면, 커밋 안 함).
- **⚔️ 아레나 (P2, 2026-11-20)** — `kids/playground/world/arena.html`(65줄, Claude) + 계산 엔진 3개(DOM 없음, 사건 배열을 돌려줌) + 그리기·화면 연결. 계약 명세 §12. 아직 로비 입구 없음(P3 광장에서 연결).
  - `arena-weapons.js` (306줄, `ArenaWeapons`): 계열 3(`blade` 3연타·`rifle` 연사·`shotgun` 5발, 시제품 수치) × 효과 6(`TRAITS` r f i l w x, `traitTotal` 0.9~1.0), `dps`, `fromShop`·`fromCfg`, `startAttack`·`stepAttack`·`fire`·`meleeHits`·`stepProjectiles`·`applyTrait`.
  - `arena-fighter.js` (242줄, `ArenaFighter`): `LEVELS`(kid·normal·ace), `COVERS`(pillars4·cross·open), `create`·`move`(원-사각형 충돌)·`dash`(무적 0.35초)·`damage`(내 캐릭터만 보호막 부활, 라이벌은 `down`)·`lineOfSight`·`think`(라이벌 거리 유지·옆걸음·재장전 틈)·`stepStatus`.
  - `arena-boss.js` (297줄, `ArenaBoss`): 돌진(기둥 충돌 기절, 피해 1.5배)·장판·링·내려찍기, 2페이즈, kid(2패턴·준비 1.4배·피해 0.6배), `step`·`damage`·`stepHazards`.
  - `arena-render.js` (558줄, `ArenaRender`): `drawArena`(arcade/slime 색, 예고선, 상태 표시)·`drawOffscreen`·`drawCheer`·`TRAIT_COLORS`.
  - `arena-ui.js` (624줄, `ArenaUI.boot`): 고르기(나·상대·무기·효과·난이도, NEW, 지난 선택 복원, 친구 설정 w·e 저장), 루프·사건 처리, 라이벌 피해 난이도 배수(0.5·0.75·1), 필살기(「오늘 공부함」이면 1.5배 빨리), 탄생 이야기 자막, 승리·기록(`arena.best`). `arena.css`(234줄).
  - 시험: `tests/world-arena.test.mjs`(22개: 수치·효과 균형·연타·연사·근접·탄·효과, 이동 충돌·대시·패배 없음 1,000회·라이벌 쓰러짐·재장전·시야·생각, 보스 패턴 순서·예고 뒤 피해·기절·2페이즈·위험 판정·kid 피해, 화면 연결 규칙).
  - 상점 무기(P4c, 2026-11-21): `arena.html`이 `my-room-core.js`를 실어 `MARKET_ITEMS[아이]`의 `arena: {class, trait}` 상품 중 산 것(기기 `{아이}_owned_items` ∪ `WorldSave.inventoryProps`의 「보유 아이템 (텍스트)」)을 무기 칩으로, 그림은 `arena-render` `drawWeaponBar`가 `f.weaponImg`로 그린다. `arena-ui.js` 656줄(600 목표 초과, 800 상한 안).
- **🌍 광장 (P3, 2026-11-20)** — 로비 🎡 놀이터 목록(`kids/js/lobby_config.js` 두 아이 맨 위, `lobby.html` 캐시 `?v=20261120-world`) → `kids/playground/world/hub.html`(Claude). 아레나 나가기·결과 「나가기」는 광장으로. 월드 화면 스크립트는 `?v=` 꼬리표로 캐시를 넘긴다(고칠 때 함께 올림).
  - `hub-logic.js` (`HubLogic`, DOM 없음): `WORLD`(1080×1600), `PORTALS`(아레나·마이룸 열림, 정원 「곧 열려요」, 남매 보물문 숨김 예약 — 반지름 88), `portalStep`(0.45초 머물면 `enter: id` 한 번), `PERSONALITY`(활발·느긋·흥부자·수줍), `createFriend`·`stepFriend`, `hitFriend`, `todayLocal`, `birthText`, `isAnniversary`, `mapFit`.
  - `hub.js` (`HubUI.boot`): 나(아레나 지난 선택 또는 첫 캐릭터)·친구 산책(같은 이름 몬스터 중복 제거), 톡 → 말풍선·탄생 이야기·성격 판(cfg `p` 저장), 🗺️ 지도·남매 초대 토글(`guest`), 생일 폭죽, 포털 진입. `hub.css`.
  - 공용 `core/world-input.js` 수정: 버튼·`a`·`.world-sheet`·`.world-hud-top`·`[data-no-stick]` 위를 누르면 조이스틱이 가로채지 않음.
  - 시험: `tests/world-hub.test.mjs`(7개: 규칙, 포털 목록·파일, 포털 진입(지나가며 들어감 포함), 친구 산책·성격, 수줍, 톡·날짜·지도, 로비 입구·아레나 나가기·뼈대·중복 제거·포털 주소 연결).
- **🌿 비밀 정원 (P4a, 2026-11-20)** — 광장 정원 포털 → `kids/playground/world/garden.html`(Claude). 명세 §14.
  - `garden-logic.js` (`GardenLogic`, DOM 없음): `SPOTS`(덤불 3·꽃봉오리 3·웅덩이 2), `baseline`(처음엔 최근 3명만 숨기고 나머지 `found`), `visibleIds`(광장·마이룸에 보일 친구: `found` 비면 전부), `plan`, `tap`·`water`·`unlock`, `nearest`. `idMap`은 Map(`sidOf`로 객체도 받음).
  - `garden.js` (`GardenUI.boot`): 덤불 톡톡·물뿌리개 끌기·열쇠(`keys` 저장), 친구 발견 카드(`found` 저장, 마이룸으로), 찾은 친구 산책(`HubLogic` 재사용). `garden.css`.
  - 광장 `hub.js`는 `GardenLogic.visibleIds`로 찾은 친구만(정원 미방문이면 전부). 시험 `tests/world-garden.test.mjs`(7개).
- **🥚 알·🎙️ 내 목소리 (P5, 2026-11-21)** — 명세 §17.
  - `core/world-eggs.js` (`WorldEggs`, Claude): `artIdFor`(등록 도구 `gallery_registration_options.py` 폴더 규칙과 같음), `pick`(대기열 중 그 아이의 `캐릭터` 최근 3), `fetchPending`(`GET /api/pending-media` 사진 없는 요약, 읽기 전용), `remember`/`known`(기기 `kids_world_eggs_{child}`). 광장 가운데 「🥚 품는 중」 둥지, 정원은 기억한 알의 친구를 알 자리로 숨기고 톡톡 3번에 「🐣 알에서 깨어났어!」(`GardenLogic.plan(hidden, rng, eggArtIds)`·`tap`).
  - `core/world-voice.js` (`WorldVoice`, Hydrogen): `supported`, `record(child, shortId, ms)`(MediaRecorder → IndexedDB `kids_world_voice`/`clips`, 아이별 30개, 녹음 뒤 마이크 끔), `has`·`play`·`remove`, `keyOf`·`trimPlan`. 밖으로 보내지 않음. 광장 성격 판 「🎙️ 내 목소리·▶ 듣기·🗑️」, 광장 친구·마이룸 인형 톡·아레나 필살기에서 재생(없으면 실로폰).
  - 찰칵등록(`kids/core/quick-uploader.js`) 「🧸 내 캐릭터 (월드 알)」 칩, 메모 칸 = 캐릭터 이름. 로비 `quick-uploader.js?v=20261121-wpn`. 시험 `tests/world-p5.test.mjs`.
- **🗡️ 내가 그린 무기 (2026-11-21)** — 명세 §18. 갤러리 분류 「무기」(🗡️, 빌더·등록 도구·`ART_CATEGORIES`) 작품의 누끼 그림을 `WorldSprites.collectWeapons`가 모아 아레나 무기 줄 칩으로(모양만, 쓰는 법은 기본 3종 칩으로 고름, 효과는 대표색). `collect`는 무기 작품을 친구에서 뺀다. `arena-render` `drawWeaponBar`는 비율 유지·세로 그림 눕히기. 찰칵등록 「🗡️ 내 무기 (아레나)」 칩. 시험 `tests/world-weapons.test.mjs`.

## 2-1. 🌐 교과 공통 & 인터랙션 코어 (Subject & Interaction Engines)

### 용어사전 공용 공간 JS 분리 (2026-11-01)
- `kids/common_space/voca_common.js` (597줄, 상한 600): 전역 상태·데이터 수신·필터·카드 목록·서식·딥링크·아이별 보기 범위. 주요 전역 함수는 `fetchLibraryData`, `manualSyncVocaData`, `handleDeepLinkParams`, `resolveVocaViewer`입니다.
- **아이별 보기 범위 (2026-11-17)**: 로비가 붙여 주는 `?user=son|daughter`(없으면 저장된 프로필)로 연다. 표 `VOCA_STUDENT_SCOPE`가 `'own'`이면 그 아이·공통 낱말만 불러오고 「학생별 보기」를 숨기며, `'mine'`이면 그 아이로 열되 「🌟 전체 학생」으로 바꿀 수 있다. 지금 민수 `mine`, 민서 `own`(보건 「성과 건강」 등 형 낱말 가림). 민서가 자라면 `daughter: 'mine'`으로 바꾼다. 부모 로그인은 늘 전체. 시험 `tests/voca-viewer-scope.test.mjs`(5개).
- **기타 과목 단원 5분 퀘스트 (2026-11-17)**: 단원 드롭다운에서 도덕·미술·보건 단원(한 과목·3개 이상)을 고르면 `buildUnitQuestLink`/`updateUnitQuestButton`이 「⚔️ 이 단원 5분 퀘스트」 버튼(`#unitQuestBtn`)을 띄워 `quest_runner.html?subject=moral|art|health&user=minsu&unit=…&from=voca`로 보낸다. 민서에게는 안 띄운다. 퀘스트 쪽: `quest-mastery.js` `SUBJECT_KO`·`quest-runner.js` `KOREAN_SUBJ_MAP`·`minsuMasterBank`(제목·아이콘만)에 세 과목, 나가기·심화 훈련·로드 실패는 용어사전방으로 복귀(`vocaReturnUrl`, 수학 폴백 없음). 명세 `docs/other_subjects_spec.md` §5. 시험 `tests/voca-unit-quest.test.mjs`(7)·`tests/other-subjects-quest-keys.test.mjs`(3).
- **기타 과목 단원 영상 (2026-11-17)**: 같은 조건의 단원이면 `#unitFilterArea` 뒤에 `div.video-unit#unitVideoArea`를 두고 `VideoUnit.mount(div, vocaUnitVideoKey(과목, 단원))`. 열쇠 = `kids/common_space/voca.html?subject=…&unit=…`(URLSearchParams 표준형, 등록기 `unit_screen_url`과 글자까지 같음). 노션 행이 없으면 부품이 숨긴다. 자료 `scripts/data/curriculum/*_video.json`, 명세 `docs/other_subjects_spec.md` §6, 시험 `tests/voca-unit-video.test.mjs`(3).
- `kids/common_space/voca_modal.js` (448줄): 단어 모달·TTS·음성 입력·요정 코코. 주요 전역 함수는 `openModal`, `closeModal`, `playWordViaTTS`, `askCocoFairy`입니다.
- `kids/common_space/voca.html`에서 클래식 스크립트 `./voca_common.js` → `./voca_modal.js`를 같은 `?v=20261117-video`로 연속 로드합니다. 두 파일의 최상위 상태와 HTML 이벤트 전역 함수를 유지합니다.
- 원문 보존·600줄 상한·HTML 배선·첫 파일 단독 실행·전역 함수/상태/이벤트/타이머 비교는 `tests/voca-common-split.test.mjs`, 분리 계약은 `docs/voca_common_split_spec.md`입니다.

### 🌟 `unit_chip_bar.js` (과목방 공통 학기·단원 칩 바, 2026-11-06~)
과목방 대기실에서 학기·단원을 먼저 고르면 각 활동이 단원 선택 화면 없이 그 단원으로 바로 시작하게 하는 공통 부품입니다. 새 과목방에 단원 칩이 필요하면 이 부품에 설정만 넘기고, 칩 바를 새로 짜지 않습니다.
- **파일 위치**: `kids/core/unit_chip_bar.js` (`window.UnitChipBar`) · 스타일 `kids/css/unit_chip_bar.css` (`.unit-chip-bar`, `.unit-chip`)
- **쓰는 곳**: 영어방 `kids/js/english_unit_bar.js`, 사회방 `kids/js/society_unit_bar.js`
- **계약**: 학기·단원은 과목방이 넘긴 노션 기록의 원문(정렬만 숫자 순). 표시 이름만 `gradeLabel`·`unitLabel`로 바꾼다. 고른 값은 이 기기에만 아이별로 기억(`{storagePrefix}_{son|daughter}`). 노션에서 사라진 값을 기억하고 있으면 전체 보기로 돌아간다.
- **핵심 API**:
  | 메서드 | 설명 |
  | :--- | :--- |
  | `UnitChipBar.create({globalName, boxId, storagePrefix, loadRecords, gradesOf, unitOf, gradeLabel?, unitLabel?, extraHtml?, onChange?, hints?})` | 칩 바 한 벌 만들기. `globalName`은 onclick에서 부를 전역 이름 |
  | `bar.init()` / `bar.render()` | 기록 불러오기 후 그리기 / 다시 그리기 |
  | `bar.applyToMission(records, {gradeUnit, grade})` | 활동을 열 때 호출. 고른 단원 자료가 있으면 `gradeUnit(g,u)`, 학기 자료만 있으면 `grade(g)`를 부르고 true. 전체 보기거나 자료가 없으면 false |
  | `bar.countFor(records)` | 고른 학기·단원에 맞는 기록 수 (사다리 카드 배지용) |
  | `bar.getPick()` | 현재 `{grade, unit}` |
- **검증**: `tests/english-unit-bar.test.mjs`, `tests/society-unit-bar.test.mjs`

### 🌟 `grouped_list.js` (공통 「묶음 목록」: 접고 펴는 묶음 + 한 줄 목록, 2026-11-16~)
국어 용어방 단원 목차, 정밀 독해 지문 목록, 국어·영어 AI 지문 토론방 지문 목록이 같이 쓰는 그리기 부품입니다. 목록이 길어지는 화면에서 큰 카드·격자 버튼 대신 이 부품을 씁니다.
- **파일 위치**: `kids/core/grouped_list.js` (`window.GroupedList`) · 스타일 `kids/css/grouped_list.css` (`.grouped-list`, `.gl-group`, `.gl-row`). 오버레이가 어두운 테마여도 읽히게 묶음·줄 색을 직접 정한다.
- **모양**: 묶음(대분류) → 하위 묶음(소분류)을 `<details>`로 접고 편다. 줄은 한 줄에 하나(폭 100%, 최소 높이 48px, 제목 최대 2줄). `item.section`이 바뀌면 작은 소제목을 한 번 넣는다.
- **두 가지 동작**: `expandable:false`(용어방)는 줄을 누르면 바로 `onPick`. `expandable:true`(독해·토론)는 줄을 누르면 그 아래로 요약 + [시작] 버튼이 펼쳐지고(한 번에 하나), 버튼이 `onPick`. 마우스 올림 말풍선은 쓰지 않는다(터치와 겹침, Argon 검토).
- **기억**: `memoryKey`를 주면 마지막으로 고른 줄을 sessionStorage(`grouped_list_last_{key}`)에 두고, 목록으로 돌아오면 그 줄이 든 묶음을 펴고 그 줄로 스크롤한다.
- **계약**: 글자·정렬·완료 판단은 부르는 쪽이 정해 넘긴다(부품은 그리기와 이스케이프만). 줄이 하나도 없는 묶음은 감춘다(안내 `note`가 있으면 보인다).
- **핵심 API**:
  | 메서드 | 설명 |
  | :--- | :--- |
  | `GroupedList.render(container, groups, {expandable?, memoryKey?, actionLabel?, emptyText?, onPick(item)})` | 그리기 + 누르기 처리 |
  | `GroupedList.buildHtml(groups, opts)` | HTML과 줄 목록만 만들기(시험용) |
  | groups | `[{id, title, icon?, open?, highlight?, note?, items:[{id, num?, title, meta?, summary?, section?, status?('done'|'in_progress'), actionLabel?}], children:[같은 모양]}]` |
- **쓰는 곳**: `kids/js/korean_voca.js`(`KoreanVoca.renderUnitDirectory`), `kids/core/reading_engine.js`(`buildPassageGroups`), `kids/js/korean_sentence.js`, `kids/js/english_chat.js`
- **검증**: `tests/grouped-list.test.mjs`

### 🎬 `video-unit.js` (단원 영상 공용 부품: 노션 등록 유튜브 영상 + 핵심 3줄 + 확인 문제, 2026-11-16~)
스토리북 대신 단원 1단계 워밍업을 유튜브 영상으로 채울 때 쓰는 부품입니다. **영상 주소를 화면 HTML에 직접 쓰지 않고** 노션 CURRICULUM_DB 행으로 등록합니다. 명세 `docs/video_unit_spec.md`.
- **파일 위치**: `kids/core/video-unit.js` (전역 `window.VideoUnit`) · 스타일 `kids/css/video-unit.css` (모든 클래스 `vu-` 접두어). 화면 쪽은 3줄: css 링크, `<div class="video-unit" data-video-unit="{저장소 상대 경로}"></div>`, js 스크립트. `config.js`·`core.js`가 없어도 동작.
- **노션 계약**: `구역=단원영상` 행(제목·`미디어 URL`=유튜브·`해설`=출처·`핵심 쓰임새/설명`=핵심 문장 ` | ` 구분, 최대 3) + 선택 `구역=영상확인` 문항 행. 화면 ↔ 행 연결 열쇠는 `인터랙티브 URL` = `https://awslike6-web.github.io/kids-school/{화면 경로}` 글자 그대로. 조회는 이 주소 equals 하나만 쓰고 구역은 화면에서 거른다(아직 없는 select 선택지로 거르면 노션이 400).
- **동작**: 마지막 성공 결과(`localStorage` `MINMIN_VIDEO_UNIT_V1:{화면}`)로 먼저 그리고 매번 노션을 다시 읽어 다를 때만 다시 그림(재생 중이면 끝난 뒤). 0건이면 캐시 지우고 숨김, 실패+캐시 없음이면 [다시 시도]. 썸네일 먼저 → ▶ 누르면 IFrame API가 `youtube-nocookie` 플레이어를 만듦(5초 안에 API 못 실으면 iframe 직접) → 끝나면 덮개 [다시 보기]/[확인 문제 풀기]. [유튜브에서 열기] 링크는 늘 보임. 확인 문제는 `QuizChoices`로 섞고(없으면 자기 위치 기준으로 `quiz-flow-controller.js`를 실음) 에러리스 채점(`fairyPraise`/`fairyEncourage`/`fairyReward`, 함수가 있을 때만). 보석·학습일지는 아직 없음(명세 §7).
- **색**: 캡션·상태줄은 화면 글자색을 따르고(어두운 과학실험실에서도 읽힘), 핵심 정리·확인 문제는 자기 색을 가진 밝은 카드. OS 다크 모드로 바꾸지 않는다.
- **공개 API**: `mount(el, screenKey)` → `Promise<{videos, questions, source}>`, 시험용 `parseYouTubeId`, `buildQuery`, `rowsToUnit`, `loadUnit(screenKey, onData)`, `loadYouTubeApi`, `kstNow`.
- **등록·점검 도구**: `scripts/register_curriculum.py`(단원영상·영상확인 행 검사: 유튜브 ID 11자, 화면 주소가 배포 접두어 + 저장소 실존 파일(`?`는 `QUERY_SCREENS`인 용어사전방만, `subject`·`unit` 표준형 — `unit_screen_url()`), 새 과목 첫 등록 400은 기존 행 0개, 영상 행에 문제 금지, 미디어 URL은 `watch?v=` 표준형으로 저장) · `scripts/check_video_links.py`(읽기 전용, 유튜브 oEmbed로 정상/퍼가기 막힘/삭제·비공개 확인, 문제 있으면 종료코드 1; ID·주소 규칙은 등록기 함수를 그대로 씀).
- **쓰는 곳**: 과학 실험실 14개(`kids/subjects/science/science_*_lab.html`, 2·3·4단원, 영상 행 자료 `scripts/data/curriculum/science_5-2_{2,3,4}.json`). 화면의 옛 `.video-frame-wrap`·`.yt-fallback-bar` 마크업·CSS는 지웠다.
- **검증**: `tests/video-unit.test.mjs`(15개, 과학 실험실 HTML에 유튜브 embed 주소가 다시 박히면 실패하는 지킴이 포함)

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

### 수학 페이지 인라인 CSS·JS 분리 (2026-10-31)

- 대상 HTML: `kids/subjects/math/`의 `fractions_multiplication.html`, `fractions_training.html`, `math_operator_studio.html`, `ranges_estimation.html`, `length_time.html`. 마크업·기존 외부 스크립트 순서·전역 함수는 그대로 유지합니다.
- 스타일: `kids/css/math_fractions_multiplication.css`, `math_fractions_training.css`, `math_operator_studio.css`, `math_ranges_estimation.css`, `math_length_time.css`. 각 HTML의 원래 style 위치에서 상대 경로로 로드합니다.
- 스크립트: `kids/subjects/math/js/`의 `fractions_multiplication-core.js` → `fractions_multiplication-main.js`, `fractions_training-core.js` → `fractions_training-main.js`, `math_operator_studio-plans.js` → `-core.js` → `-blocks.js` → `-numberline.js` → `-main.js`(아래 연산 스튜디오 절), `ranges_estimation-core.js` → `ranges_estimation-main.js`. `length_time.js`는 단일 파일입니다.
- 전역 API: 분수 탐험 `switchTab`·`initPlayground`, 분수 훈련 `renderFrac`·`renderMixed`·`switchTrainMode`, 연산 스튜디오 `startStudioCalculation`·`switchViewTab`, 수의 범위 `selectRangePreset`·`setRoundingScope`, 길이·시간 `selectRulerItem`·`startStopwatchChallenge`. 호출부·동작은 변경하지 않습니다.
- 모든 신규 참조의 캐시 버전은 `20261031-split`. 클래식 스크립트로 원래 위치에서 core → main을 연달아 로드하며, 초기화는 마지막 파일의 기존 `DOMContentLoaded`에 남습니다. IIFE·module·defer를 추가하지 않습니다.
- 검증: `tests/math-pages-split.test.mjs`가 고정 main fixture와 원문·마크업 보존, 상대 경로 실존, 파일 크기, 인라인 블록 제거, 뒤 파일 로드 전 실행 안전성을 검사합니다. 상세 경계·줄 수는 `docs/math_pages_split_spec.md`를 따릅니다.

### 연산 스튜디오 4대 연산 풀이·블록·수직선 (2026-11-04)

클래식 스크립트로 `math_operator_studio-plans.js` → `-core.js` → `-blocks.js` → `-numberline.js` → `-main.js` 순서로 싣습니다. 초기화는 마지막 파일의 `DOMContentLoaded`에 있습니다.

- `math_operator_studio-plans.js` (`window.OperatorStudioPlans`, DOM 없음):
  - `buildDivisionPlan(a, b)`, `buildAdditionPlan(a, b)`, `buildSubtractionPlan(a, b)`, `buildMultiplicationPlan(a, b)`: 단계 배열을 돌려줍니다. 각 단계는 `{ step, title, desc, speech, val, board }`이고 나눗셈은 `focus`가 더 있습니다. 뺄셈에서 앞 수가 작으면 `isNegative: true`인 한 단계만 돌려줍니다.
  - `buildAreaModel(op, a, b)`: 면적 탭의 칸을 만듭니다. 수를 자리별로 나누고 0인 자리는 뺍니다. 나눗셈은 `{ quotient, remainder, parts }`, 곱셈은 `{ columns, cells, total }`입니다.
  - `clampStudioValue(value, min, max)`, `clampDivisionValue(value, max)`, `numberJosa(n, 받침있음, 받침없음)`, `divisionResultText(몫, 나머지)`, `DIVIDEND_MAX`, `DIVISOR_MAX`.
- `math_operator_studio-core.js`: 상태, `OPERATION_PRESETS`·`OPERATION_TAB_LABELS`·`OPERATION_INPUT_CONFIG`, `switchOperation`·`switchViewTab`·`loadPreset`·`startStudioCalculation`, `renderSubtractionGuide(container)`, `studioSpeak`(`speakFairyTTS`만 호출).
- `math_operator_studio-blocks.js`:
  - `window.OperatorStudioBlocks`: `buildAdditionBlockSteps(a, b)`, `buildSubtractionBlockSteps(a, b)`, `buildMultiplicationBlockSteps(a, b)`, `countsValue(counts)`. 단계마다 블록 묶음 `{ role, label, counts: { th, h, t, o }, active }`을 만듭니다(DOM 없음).
  - 화면: `renderBlocksView(container)`, `changeBlockStep(delta)`. 나눗셈 분배관은 `renderDivisionBlocksView`입니다.
- `math_operator_studio-numberline.js`:
  - `window.OperatorStudioLines`: `buildNumberLineModel(dividend, divisor, maxJumps = 12)`, `buildOpNumberLineModel(op, a, b)`. 점프 목록과 눈금 위치(%)를 돌려줍니다. 점프가 12번을 넘으면 앞뒤만 남기고 `gap`으로 줄입니다. 뺄셈에서 앞 수가 작으면 `{ blocked: true }`입니다.
  - 화면: `renderNumberLineView(container)`, `changeNumberLineStep(delta)`.
- `math_operator_studio-main.js`: 세로셈 `renderDivisionBoard`·`renderAdditionBoard`·`renderSubtractionBoard`·`renderMultiplicationBoard`는 `board`만 그립니다. `renderAreaModelView`(나눗셈·곱셈), `applyTheme`.
- 검증: `tests/operator-studio-division.test.mjs`, `tests/operator-studio-plans.test.mjs`, `tests/operator-studio-views.test.mjs`, `tests/math-pages-split.test.mjs`. 스크립트·스타일을 바꾸면 `tests/fixtures/math-split/math_operator_studio.json`의 `scripts`·`styles`도 맞춰야 분리 시험이 통과합니다. 레이아웃은 시험으로 잡지 못하므로 쓰기 차단 서버에서 확인합니다.

### 🪞 합동과 대칭 탐험관 (5-2 3단원, 2026-11-14)

`kids/subjects/math/congruence_symmetry.html`(66줄) + `kids/css/math_congruence_symmetry.css`. 공통 코어(`config`·`core`·`notion-helper`·`fairy-config`·`fairy-tts`·`fairy-settings-catalog`·`fairy-engine`) 뒤에 클래식 스크립트를 `geo` → `views` → `fold` → `grid` → `quiz` → `main` 순서로 싣습니다(모두 `kids/subjects/math/js/congruence_symmetry-*.js`, `?v=20261114-cs`). 각 파일은 IIFE이고 전역 이름 하나만 내보냅니다. 화면 내용·관별 활동은 `docs/math_spec.md` §3-7.

- 파일: `kids/subjects/math/js/congruence_symmetry-geo.js`(457줄), `kids/subjects/math/js/congruence_symmetry-views.js`(445줄), `kids/subjects/math/js/congruence_symmetry-fold.js`(299줄), `kids/subjects/math/js/congruence_symmetry-grid.js`(348줄), `kids/subjects/math/js/congruence_symmetry-quiz.js`(207줄), `kids/subjects/math/js/congruence_symmetry-main.js`(285줄), `kids/css/math_congruence_symmetry.css`(558줄), 퀴즈 자료 `scripts/data/curriculum/math_5-2_3.json`.
- `-geo.js` (`window.CongruenceGeo`, DOM 없음): 좌표는 모눈 교차점 `[x, y]`(y 아래로 증가), 다각형은 꼭짓점 배열.
  - 합동: `normalize`, `transform(poly, rot 0..3 시계 90°, flip)`, `findCongruence(a, b)` → `{ rot, flip, map }`(map[i] = a의 i번 꼭짓점의 대응 꼭짓점), `isCongruent`, `samePointSet`.
  - 대칭: `reflectPoint(p, axis)`, `rotatePoint(p, center, deg)`, `rotateHalf`, `candidateAxes`, `symmetryAxes`, `isPointSymmetric`, `bboxCenter`, `angleAt`(오목 각 포함 내각), `sideLength`.
  - 문제: `SHAPES`(비대칭·선대칭·점대칭·둘 다 프리셋 14종), `makeRng(seed)`(mulberry32), `makeLinePuzzle(rng, 'v'|'h')`, `makePointPuzzle(rng)` → `{ given, answer, full, axis|center }`. 자기 교차 없는 다각형만 만듭니다.
- `-views.js` (`window.CSViews`): `tab1` 합동 포개기, `tab2` 대응점·대응변·대응각.
- `-fold.js` (`window.CSFold`): `tab3` 선대칭 접기(직사각형은 대각선 오답 후보 추가), `tab5` 점대칭 돌리기.
- `-grid.js` (`window.CSGrid`): `tab4` 선대칭 완성, `tab6` 점대칭 완성(교차점 찍기 + 성질 보조선), 4·6관 뒤 픽토그램 공방.
- `-quiz.js` (`window.CSQuiz`): `buildQuizFromPages(results)`(DOM 없음, 노션 행 → `{ title, q, choices, answerIndex, explain }`, 제목순), `UNIT`, `tab`. CURRICULUM_DB를 `과목·학년·단원(equals)·구역=탐구퀴즈`로만 읽고 대체 문제를 두지 않습니다.
- `-main.js` (`window.CSMain`): 탭·진도·보상(`grantRewardAndShowUI`)·완주 모달, `localDateKey()`(로컬 날짜), `makeUi(say)`(관 화면 공용 그리기 도우미: `el`·`pts`·`board`·`grid`·`label`·`concept`·`hint`·`shuffle`·`gridPoint`).
- 관 화면 계약: `render(container, ctx)`, `ctx = { geo, ui, say, praise, encourage, reward, finale, svg, complete }`. `complete()`는 여러 번 불러도 main이 페이지당 1회만 처리합니다.
- 검증: `tests/math-congruence-symmetry.test.mjs`(프리셋 분류, 8가지 합동 변환과 대응, 문제 생성 seed 300개 대칭·자기 교차 없음, 노션 행 변환, 스크립트 순서·상대 경로·800줄 미만). 화면은 쓰기 차단 서버에서 375px·데스크톱으로 확인합니다.
- 이 탐험관은 아래 공용 틀(`MathExplorer`)보다 먼저 만들어 자체 `CSMain`·`CSQuiz`를 씁니다. 다음 대청소 때 공용 틀로 옮길 후보입니다(같은 동작: 탭·진도·보상·완주 창·노션 퀴즈).

### 🧭 수학 단원 탐험관 공용 틀 `MathExplorer` (2026-11-14)

새 단원 탐험관(관 6개 + 노션 퀴즈 배틀)은 틀을 복사하지 않고 이 부품을 씁니다. 5-2 4·5·6단원이 사용합니다.

- 파일: `kids/subjects/math/js/math_explorer-shell.js`(386줄), `kids/subjects/math/js/math_explorer-quiz.js`(187줄), `kids/css/math_explorer.css`(298줄). 화면은 공통 코어(`config`·`core`·`notion-helper`·`fairy-config`·`fairy-tts`·`fairy-settings-catalog`·`fairy-engine`) 뒤에 `shell` → `quiz` → 단원 파일 순서로 싣습니다(`?v=20261114-mx`). 단원 색은 `body` 클래스 `mx-theme-decimal`·`mx-theme-cuboid`·`mx-theme-average`가 `--mx-*` 변수로 바꿉니다.
- HTML 아이디 계약: `mxTabs`, `mxContainer`, `mxDoneCount`, `mxTotal`, `mxProgressFill`, `mxCompleteModal`, `mxCompleteReward`, `mxCompleteClose`, `mxGoQuiz`.
- `-shell.js` (`window.MathExplorer`): `mount({ key, labs: [관…], quiz })` — 관 = `{ title, icon, sub, render(container, ctx) }`. 관 첫 완주 💎1(페이지당 1회), 모두 완주 하루 1회 +5(`localStorage` 키 `math_{key}_allclear_{학생}_{로컬 YYYY-MM-DD}`), 지급은 `grantRewardAndShowUI(n, false, 'math')`만 씁니다. `localDateKey`, `josa(낱말, 'eul'|'eun'|'gwa'|'i'|'ieyo'|'ro')`(숫자·단위·자음 기호 뒤 조사: 8을·0.4를·면 ㄴㅂㅅㄷ과·16.8 L예요), `shuffle`, `randInt`, `makeUi`.
  - `ctx = { ui, say, praise, encourage, reward, finale, complete, isDone, redraw }`. 음성은 `speakFairyTTS`·`fairyPraise`·`fairyEncourage`·`fairyReward`로만 냅니다.
  - `ui`: `el`·`svg`·`board(viewBox, cls)`·`text(svg, x, y, 글자, cls, anchor)`·`card`·`guide`·`concept(제목, 본문)`(🔊 버튼)·`hint`·`button`·`doneBadge`·`arrange`·`josa`, **`choiceQuestion({ question, choices, answer(원래 번호 0부터), hint, explain, onSolved, column, fixed })`** — 에러리스 3지선다. 보기는 `window.QuizChoices.arrange`로 섞고(뜻 있는 순서는 `fixed: true`) 원래 번호로 채점, 틀리면 고른 보기만 꺼지고 노란 힌트 + 정답 보기 반짝임. **`sequence(container, [function(box, next)], onDone)`** — 단계를 차례로 아래에 붙입니다.
- `-quiz.js` (`window.MathExplorerQuiz`): `create({ grade, unit, title, intro, sayQuestion? })` → 퀴즈 탭(`sayQuestion: true`면 문제가 뜰 때 질문을 읽어 줌, 2-1 민서 화면). CURRICULUM_DB를 `과목=수학 · 학년 · 단원 equals · 구역=탐구퀴즈`로만 읽고(`buildQueryBody`), 하드코딩 대체 문제 없이 실패 시 "다시 불러오기". `buildQuizFromPages(results)`는 `CSQuiz`와 같은 계약(보기 1~4 줄 배열, 제목순). 문항 첫 정답마다 💎1.

### 🔢📦📊 5-2 4·5·6단원 탐험관 (2026-11-14)

공용 틀 위에 단원 파일 3개씩. 화면 내용·관별 활동·교과서 쪽수는 `docs/math_spec.md` §3-8~10.

- **4단원 소수의 곱셈** `kids/subjects/math/decimal_multiplication.html` + `kids/css/math_decimal_multiplication.css`(113줄).
  - `decimal_multiplication-core.js`(201줄, `window.DecimalCore`, DOM 없음): 소수를 `{ int, places }`로 다뤄 부동소수 오차가 없습니다. `parse`, `format`(끝자리 0 지움)·`formatRaw`(3.60 유지), `mul`, `compare`, `pointSlots(곱)` → `{ digits, padded, slot, trailingZeros }`(0.04×0.7 → `'0028'`, 앞에 0 2개, 소수점 칸 1), `areaParts(a, b)`(넓이 4조각), `pointChoices(곱)`(정답·×10·÷10 서로 다른 보기 3개), 문제 `makeLab1~4`, `makeDrillSet(5)`(끝자리 0·앞자리 0 채우기 문제를 한 판에 하나씩).
  - `decimal_multiplication-labs-a.js`(341줄, `window.DecimalLabsA`): 1·2관 막대 모델(0.1배·1배 칠하기), 3관 모눈 넓이, `twoProblems`(교과서 문제 → 새 문제). `kids/subjects/math/js/decimal_multiplication-labs-b.js`(427줄, `window.DecimalLabsB`): 4관 넓이 4조각, 5관 숫자 띠 소수점 이동, 6관 소수점 찍기 훈련, `mount`.
- **5단원 직육면체와 정육면체** `kids/subjects/math/cuboid_cube.html` + `kids/css/math_cuboid_cube.css`(120줄).
  - `cuboid_cube-geo.js`(281줄, `window.CuboidGeo`, DOM 없음): 꼭짓점 기호 윗면 ㄱㄴㄷㄹ·아랫면 ㅁㅂㅅㅇ, `FACES`(면 6개·바깥 방향·짝)·`FACE_NAMES`(앞면 `ㄴㅂㅅㄷ`)·`EDGES`, `cuboid(w,h,d)`·`triangularPrism`·`squarePyramid`, `view(입체, yaw, pitch, scale, ox, oy)` → 화면 좌표·보이는 면·모서리 실선/점선·꼭짓점 보임, `parallelFace`·`perpendicularFaces`. 전개도: `foldNet(칸[[열,행]…])`(첫 칸을 바닥에 두고 이웃 칸을 경첩으로 90° 접어 칸마다 3D 모서리 좌표·`isCube`), `oppositeCells`, `meetingPoints(칸, 점)`, `CUBE_NETS`(정육면체 전개도 11종 전부)·`NOT_NETS`.
  - `cuboid_cube-labs-a.js`(586줄, `window.CuboidLabsA`): `drawSolid(svg, ui, 입체, opts)`(면 색·모서리·꼭짓점 누르기), 1관 바구니 분류, 2관 돌려 가며 세기, 3관 평행·수직, 4관 겨냥도. `cuboid_cube-net.js`(494줄, `window.CuboidNet`): `foldView(el, 칸, 칸 내용)`(CSS 3D 접기, `fold`·`unfold`·`isFolded`), 5관 전개도, 6관 주사위·만나는 점, `mount`.
- **6단원 평균과 가능성** `kids/subjects/math/average_probability.html` + `kids/css/math_average_probability.css`(66줄).
  - `average_probability-core.js`(153줄, `window.AverageCore`, DOM 없음): `mean`(나누어떨어질 때만), `makeLevelData`(평균 자연수), `move`·`isLevel`, `missingValue`, `SPINNERS`(가·나·다, 한 색이 절반), `simulate(회전판, 횟수)`(기대 횟수 ± 6% 안, 절반인 색이 언제나 가장 많음 — 모의 실험이 오개념을 만들지 않게), `sequenceOf`, `LEVEL_WORDS`·`SITUATIONS`·`DICE_CARDS`.
  - `average_probability-labs-a.js`(431줄, `window.AverageLabsA`): 1관 ○ 고르게 하기, 2관 종이띠 → 공식, 3관 모둠 비교·지워진 기록. `kids/subjects/math/js/average_probability-labs-b.js`(379줄, `window.AverageLabsB`): `drawSpinner`, 4관 가능성 말, 5관 수직선·주사위 카드 순서, 6관 회전판 모의 실험, `mount`.
- 퀴즈 자료: `scripts/data/curriculum/math_5-2_4.json`·`_5.json`·`_6.json`(단원마다 12제, 초안 agy Hydrogen → 계산·쪽수 검토). 등록은 공식 도구 `scripts/register_curriculum.py`.
- 검증: `tests/math-explorer-units.test.mjs`(16개: 조사, 노션 행 변환·필터, 소수 표기·0 처리·문제 생성 seed 200, 겨냥도 보임 판정, 면 관계, 헥소미노 35종 중 정육면체 전개도 11종 = 목록, 마주 보는 칸·만나는 점 대칭, 평균 자료, 모의 실험 seed 300, 퀴즈 JSON, 화면 실림 순서·상대 경로·600줄, 보상·음성 계약). 화면은 쓰기 차단 서버에서 375px·데스크톱으로 확인합니다.

### 🪜 4-2 분수·소수 사다리 탐험관 (2026-11-24)

4학년 2학기 「분수의 덧셈과 뺄셈」(`fraction_add.html`, 관 7개 + 퀴즈)·「소수의 덧셈과 뺄셈」(`decimal_add.html`, 관 7개 + 퀴즈) 탐험관. 아래 두 계산 모듈은 순수 모듈(DOM 없음). 설계: [`docs/math_4-2_ladder_spec.md`](../../docs/math_4-2_ladder_spec.md). 화면 없이도 5분 퀘스트 등에서 무한 문제 공급원으로 쓸 수 있다.

- `kids/subjects/math/js/fraction_add-core.js` (`window.FractionCore`): 분수 `{ w, n, d }`(약분 없음). `toImproper`·`toMixed`·`equals`·`add`·`sub`(분모 다르거나 0 이하면 throw)·`needsCarry`·`needsBorrow`·`split`(자연수 1을 분모 조각으로)·`label`("2와 5분의 1", "1과 4분의 3", 자연수 "2", 진분수·가분수 "5분의 9")·`LAB_KINDS`(관 1~6 → 문제 종류 3개)·`KIND_ORDER`(13종, 쉬운 것 먼저)·`makeProblem(kind, rng)`·`wrongChoices(problem)`(오답 2개 `{ value, text, mistake }`, 오개념 이름: add-denominators·keep-improper·no-carry-normalize·whole-only·no-whole-decrement·reverse-subtract·borrow-ten·add-instead·off-by-one)·`makeRound(lab, rng)`(3문제 한 판)·`makeMixedRound(rng, n=10)`(섞어 풀기)·`randInt`.
- `kids/subjects/math/js/decimal_add-core.js` (`window.DecimalAddCore`): `decimal_multiplication-core.js`의 `DecimalCore`를 **먼저 싣고** 그 `{ int, places }`를 불러 쓴다(곱셈 파일은 고치지 않음). `add`·`sub`(끝자리 0 유지, 음수면 throw)·`align`(자리 맞춤 + 0 채운 칸 수)·`readAloud`("영 점 삼칠", "십이 점 삼사")·`digitValue(d, place)`·`shift(d, k)`(×10^k, 끝자리 0 정리)·`LAB_KINDS`·`KIND_ORDER`(16종)·`makeProblem`·`wrongChoices`(오개념 이름: read-as-whole·drop-point·drop-zero·place-up·place-down·longer-is-larger·shorter-is-larger·equal·wrong-direction·carry-as-place·reverse-subtract·right-align·no-pad·ignore-point-add·ignore-point·off-by-one, 끝자리 0 붙은 오답은 버림)·`makeRound`·`makeMixedRound`(`shift-chain` 제외)·`randInt`.
- **공용 틀 세로 분수 옵션** (`math_explorer-shell.js`): `mount({ …, fractions: true })`면 `ui`의 질문·보기·힌트·해설·개념 카드·안내(`guide`)와 퀴즈 배틀이 글자 표기 `3/5`·`2와 3/5`를 세로 분수 요소(`.mx-frac`, DOM으로 만듦)로 그리고, `say`는 "5분의 3"으로 바꿔 읽는다. 끈 화면(5-2)은 그대로. `ui.fill(node, 글자)`, `MathExplorer.fracParts`·`fracSpeech`·`josaFrac(글자, 조사)`(분수 뒤 조사는 분자 기준: `2/5를`, `3/5을`).
- **`kids/subjects/math/js/math_explorer-ladder.js`** (두 탐험관 공용): `MathLadder.attach(상자, 카드, ui)` — 첫 오답 때 `🪜 3학년 계단 다시 보기` 버튼(관 안에서 펼침, 보상·기록 없음, 스타일은 스스로 넣음). `MathDrill.track(접두, 종류)`(학습일지 `g:<접두>-<종류>`, 없으면 조용히 넘어감) · `ask(ui, o)`(오개념별 힌트 3지선다, 오답 `wrong(보기 글자)`·정답 `done()`) · `counter(key)`(더 풀기 셈: 맞힌 10문제마다 💎1, 하루 3개, `math_{key}_drill_{학생}_{날짜}`) · `rounds(영역, ctx, { counterKey, makeRound, renderProblem })`(한 판 → 첫 판이면 `ctx.complete()` → `🔁 한 판 더`) · `algo(ui, 줄들)`(1-2-3 카드 `.mx-algo`) · `why(ui, 제목, 본문)`(접힌 💡 왜 그럴까) · `expr(ui, 식)`(`.mx-expr`). `ask`의 `order`(보기 순서 고정, `> < =`). 공용 모양 CSS(`.mx-algo`·`.mx-why`·`.mx-expr`·`.mx-ladder-links`)는 `math_explorer.css`.
- **분수 탐험관 화면**: `fraction_add-labs-a.js`(그리기 도우미 `FracAddDraw`: bar·wholes·stepper(목표에서 잠김, 받아올림 carry)·algo·why·expr + 1~3관, `FracAddLabs`), `fraction_add-labs-b.js`(4~7관 + `mount`), `kids/css/math_fraction_add.css`(`mx-theme-fracadd`, 지운 칸 빗금). 학습일지 키 `g:frac4-<종류>`.
- **소수 탐험관 화면**: `decimal_add-draw.js`(그리기 도우미 `DecAddDraw`: grid(10×10 모눈)·gridStepper(＋0.1·＋0.01, 목표에서 잠김)·strip(숫자 띠)·numberLine(구간 고르며 두 번 확대)·pointMover(10배·1/10, 반대 방향은 노란 안내만)·column(세로셈 칸판: 0 채우기→소수점 내려 찍기→오른쪽 자리부터 3지선다, 받아올림·받아내림 표시)), `decimal_add-labs-a.js`(1~3관, `DecAddLabs`), `decimal_add-labs-b.js`(4~7관 + `mount`), `kids/css/math_decimal_add.css`(`mx-theme-decadd`). `decimal_multiplication-core.js` → `decimal_add-core.js` → draw → labs 순서로 싣는다. 학습일지 키 `g:dec4-<종류>`.
- 퀴즈 자료: `scripts/data/curriculum/math_4-2_1.json`·`math_4-2_3.json`(각 12제, 분수는 글자 표기 계약).
- 화면 시험: `tests/math-ladder-pages.test.mjs`(실림 순서·상대 경로·600줄·대문 카드 2곳·세로 분수 옵션·글자 분수 금지·조사·학습일지 키).
- 공통: `rng`는 `() => [0,1)` 함수(시험은 seed 고정). 조건에 맞는 수를 200번 안에 못 뽑으면 종류별 고정 예시로 돌아가 무한 루프가 없다. 덧셈·뺄셈 연습 문제의 소수 답은 끝자리 0이 없다.
- 검증: `tests/math-fraction-add.test.mjs`·`tests/math-decimal-add.test.mjs`(계약 예시값, 종류마다 seed 300개 범위·결과 모양·오답 보기 규칙, 한 판 중복 없음·정렬). 시험은 계약서만 보고 따로 쓴 것(agy Hydrogen 초안 두 벌을 서로 모르게 작성).

### 🫧 수학 탐험관 공용 놀이·저학년 부품 (2026-11-24, 2-1 사다리 2단계)

- `kids/subjects/math/js/math_squishy.js` (`window.MathSquishy`): **말랑 버튼**. 모든 `.mx-btn`을 누르면 말랑하게 눌렸다 튀어 오르고(CSS, 움직임 줄이기 설정이면 끔) 고른 소리를 Web Audio로 합성해 낸다(파일 없음). 소리 `SOUNDS`: 키캡 도각·슬라임 뽁·말랑 꾹·🔒젤리 퐁·🔒방울 딸랑·소리 없음. 아이별 저장 `math_squishy_{민수|민서}` = `{ sound, unlocked }`, 기본값 민서 슬라임·민수 소리 없음. `getPrefs`·`setSound`·`isUnlocked`·`unlock(id)`(🎁 고르는 해금용)·`play`·`attach`·`chooserButton`·`mount(host)`. 틀이 머리(`.mx-header`)에 `[🫧 내 버튼]`을 자동으로 붙인다 — 화면은 `math_explorer-shell.js` 바로 뒤에 이 파일만 실으면 된다(4-2·5-2 탐험관 다섯 화면에 실림). 검증 `tests/math-squishy.test.mjs`. 초안은 네온 medium(하이드로젠 high와 같은 일을 맡겨 비교한 뒤 고름).
- `kids/subjects/math/js/math_column-draw.js` (`window.ColumnDraw.column(ui, o)`): **세로셈 칸판** 공용(4-2 소수·2-1 덧셈뺄셈). `o = { a, b, op, onDone, big?, onWrong? }`, a·b는 소수 `{int, places}` 또는 정수. 정수면 0 채우기·소수점 단계 없이 바로 자리 계산, `big`이면 큰 칸(`mx-col-big`, 52px), `onWrong`으로 틀린 자리 숫자를 학습일지에. DecimalAddCore에 기대지 않음. 칸판 모양 CSS(`.da-col-*`)는 `math_explorer.css`로 옮김. `decimal_add-draw.js`의 `column`은 이 함수로 넘긴다.
- `kids/subjects/math/js/math_bingo.js` (`window.MathBingo`): **🎯 수 빙고 3×3** 공용(2-1 두 탐험관의 연습 마당 자리). `render(영역, ctx, { makeBingo, prefix, counterKey, perReward })` — ① 답 칩 9개를 아이가 골라 판에 놓기(`[✨ 알아서 놓기]`) ② 문제를 읽어 주면 답 칸 터뜨리기(틀리면 흔들림·노란 안내, 두 번째 틀리면 정답 칸 반짝, 학습일지 `g:<prefix>-<종류>`) ③ 3줄 또는 9칸이면 끝 → 첫 판 `ctx.complete()`, 🎁 잠긴 말랑 버튼 소리 하나 골라 열기(`MathSquishy.unlock`), `[🔁 한 판 더]`·`[다음 관 ▶]`. 순수 함수 `LINES`·`completedLines`·`autoPlace`·`isRoundOver`. 덧셈·뺄셈 문제는 `TwoDigitCore.speakText`로 말로 읽음. 스타일은 `<style id="mx-bingo-style">`을 스스로 넣음. 검증 `tests/math-bingo.test.mjs` + 화면 자동 조작. 초안은 네온 medium(하이드로젠 medium과 같은 일로 비교해 고름).
- **공용 틀 옵션** (`math_explorer-shell.js`): `mount({ rememberTab: true })` 아이·화면별 마지막 관을 기억해 다시 열 때 그 관부터(`math_{key}_tab_{아이}`), `ctx.hasNext()`·`ctx.goNext()`(다음 관 열기), 완주 창 보상 글자가 아이별(민서 🍬, 민수 💎).
- **`MathDrill` 저학년 옵션** (`math_explorer-ladder.js`, 모두 선택이라 4-2 화면은 그대로): `ask`에 `say`(음성 함수 → 질문 자동 읽기), `speak`(질문 대신 읽을 글자: 수 읽기 문제처럼 정답 소리가 섞이면 안 될 때), `sayHint`(오답 힌트도 읽기), `column`(보기 세로 1열), `ladderLabel`(계단 버튼 글자). `counter(key, { perReward })`(2학년은 6), 보상 글자 아이별(`MathDrill.rewardIcon()`). `rounds`에 `perReward`·`nextButton`(`[다음 관 ▶]`). `MathLadder.attach(…, { label, say })`.

### 🪜 2-1 세 자리 수·덧셈과 뺄셈 탐험관 (2026-11-24, 민서)

민서 2학년 1학기 예습용 탐험관 「세 자리 수」(`number_three.html`)·「덧셈과 뺄셈」(`add_sub_two.html`), 각 관 5개 + 🎯 수 빙고 + 퀴즈 배틀. 질문·힌트 자동 읽기(수 읽기 문제는 수를 소리 내지 않음), 지난번 관 기억, 다음 관, 6문제마다 🍬. 화면 `body`에 `mx-grade2`를 달면 공용 CSS가 큰 글자·56px 버튼·숫자 띠(`tw-*`)를 준다. 아래는 순수 계산 모듈(DOM 없음).
- `kids/subjects/math/js/base_ten-draw.js` (`window.BaseTenDraw`): **수 모형**. 두 줄(백 48px 판 / 십 막대 + 일 낱개), `model(init)`(`bundle`·`unbundleTen`·`erase`·`busy`), `placeControls`(＋백·＋십·＋일, 다 놓은 자리·0인 자리는 노란 안내, `autoBundle`이면 10개 모이면 2박자 묶기, 목표 합에 닿으면 잠금), `minusControls`(－일·십 모형 1개 풀기, 모자라면 안내+반짝), `picture(n)`. 순수 함수 `planPress`·`isReached`·`carryPlan`. 시험 `tests/math-base-ten.test.mjs`. 초안 네온 medium(하이드로젠 medium·high는 99+1 묶기에서 계약 모순을 그대로 따라 멈춤).
- `kids/subjects/math/js/number_three-twenty.js` (`window.NumberTwenty`): **🔍 수 스무고개**(세 자리 수 7관). 앱이 정한 세 자리 수를 질문 칩(묶음 📏 크기·백·십·일·짝수, 한 번에 4개, 후보를 나누는 질문만)으로 좁혀 맞힘. 자리 숫자 묶음은 남은 숫자가 4개 이상이면 크기 칩(`hg:`·`tg:`·`og:` 「십의 자리가 4보다 커요?」, 절반에 가까운 것부터), 3개 이하면 숫자 칩(`t:5`), 칩 위에 남은 숫자 줄(`digitsLeft`). 답 '네!/아니요!'를 읽어 주고, 남은 수 막대·질문 수·기록 줄, 후보 9개 이하(또는 질문 20번)면 맞히기 보기 3개(틀리면 흔들림·지움). 학습일지 `g:num3-twenty`. 순수 함수 `CATEGORIES`·`pickChips`·`digitsLeft`·`guessOptions`. 시험 `tests/math-twenty.test.mjs`. 네온 medium 초안.
- **📮 요정 건의함** (공용 틀 `mount({ wishBox: true, wishLabel? })`): 머리에 `[📮 바라는 것]` → 쓰던 글이 없을 때만 가족 우체통 임시 글(`familyMailDraft`)에 `{ to: 'dad', text: '[수학방에 바라는 것] ' }`을 넣고 `../../common_space/family_mail.html?compose=dad`로 감(우체통 코드는 그대로).
- 화면: `number_three-labs.js`·`add_sub_two-labs.js`(네온 medium 초안, 실제 부품 파일을 읽고 씀), 테마 `math_number_three.css`·`math_add_sub_two.css`. 화면 시험 `tests/math-two-ladder-pages.test.mjs`. 설계: [`docs/math_2-1_ladder_spec.md`](../../docs/math_2-1_ladder_spec.md). 4-2 모듈과 같은 모양(`LAB_KINDS`·`KIND_ORDER`·`makeProblem`·`wrongChoices`·`makeRound`·`makeMixedRound`·`randInt`).

- `kids/subjects/math/js/number_three-core.js` (`window.ThreeDigitCore`): `readKo(n)`(1~1000, 백·십의 1은 "일" 생략·0 자리 읽지 않음: 110 백십, 305 삼백오, 1000 천), `readKoWrong(n, 실수)`·`wrongReadings(n)`(몇백은 삼십·삼천), `digits`·`placeValue`, 문제 13종(듣고 만들기·듣고 쓰기·보고 읽기·자릿값·경계 뛰어 세기·비교), `makeMixedRound(rng, 6)`, `makeBingo(rng)`(답이 서로 다른 9문제 + `call` 글자), 스무고개 `makeSecret`·`chipList`(38개: gt·h·t·o·even)·`chipText`·`chipAnswer`·`candidates(asked)`.
- `kids/subjects/math/js/add_sub_two-core.js` (`window.TwoDigitCore`): `add`·`sub`·`needsCarry`·`needsBorrow`, 문제 12종(받아올림·받아내림 한 번, 합 ≤ 99, 차의 십의 자리 ≥ 1, 세 수는 뺄셈이 앞·두 번이면 b > c, 관계식, 덧셈식 □), `exprText`·`speakText`(더하기·빼기 말로)·`bingoCall`, `makeBingo(rng)`. 빼기 기호는 `−`(U+2212).
- 오개념 이름: 세 자리 수 `read-one-prefix`·`read-zero`·`read-as-tens`·`write-each-place`(3005)·`write-drop-zero`(35)·`place-ignore`·`place-shift`·`jump-boundary`(1100)·`compare-ones-first`, 덧셈과 뺄셈 `no-carry`·`write-sum`(212)·`over-carry`·`reverse-subtract`·`no-borrow-tens`·`zero-passthrough`(40−6=46)·`over-borrow`·`right-to-left`·`box-add`·`mix-terms`·`wrong-op`.
- 검증: `tests/math-number-three.test.mjs`·`tests/math-add-sub-two.test.mjs`(계약서만 보고 따로 쓴 시험 + Claude 보정: 일의 자리 자릿값 오답, 몇백 읽기 오답, 세 수 b > c).

### 🌉 1학년 → 2-1 다리: 100까지의 수 탐험관·10 빙고 (2026-11-24, 민서)

겨울방학 1학년 화면을 2-1 탐험관과 같은 틀·부품으로 다듬어, 3월에 2-1을 만나면 "아는 놀이에서 자리만 늘어난" 느낌이 들게 한다. 설계: [`docs/math_1_bridge_spec.md`](../../docs/math_1_bridge_spec.md). 1학년 말은 「10개씩 묶음」·「낱개」(「십의 자리」 안 씀).
- **100까지의 수** `kids/subjects/math/number100.html`(인라인 스크립트 없앰) = 공용 틀 `MathExplorer.mount({ key: 'n100', rememberTab, wishBox })` + 관 7개(퀴즈 탭 없음), `body.mx-theme-n100.mx-grade1`, 테마 `kids/css/math_number100.css`(1학년은 백 모형 줄을 늘 숨김, 4관 좌우 비교 카드 `.n100-cmp`(작은 모형 `zoom: .5`), 5관 사탕 짝짓기 `.n100-candy-board`·`.n100-pair.is-paired`·`.n100-candy.is-left`, 3관 수 띠 `.n100-strip`).
  - `kids/subjects/math/js/number100-core.js` (`window.HundredCore`, DOM 없음): `readSino`(10~99, 15 십오·60 육십)·`readNative`(52 쉰둘·60 예순), `digits`, `LAB_KINDS`(1관 tens-make·listen-build·count-picture / 2관 read-sino·read-native·listen-native / 3관 next-1·prev-1·between / 4관 compare-diff-tens·compare-same-tens(4번에 1번 같은 수)·compare-trap / 5관 pair-candies·pair-candies-big·which-even), `makeProblem`·`wrongChoices`(문제 수 10~99, 숫자 오답 1~99, 겹침·범위 대체 규칙)·`makeRound`·`makeBingo`(답 서로 다른 9문제, `call` 4종: 묶음·한자어·순우리말·1 큰 수), 스무고개 계약(`makeSecret` 10~99·`chipList`(gt:15~85·t·tg·o·og:1~8·even)·`chipText`(「10개씩 묶음이 5개보다 많아요?」)·`chipAnswer`·`candidates`). 초안 하이드로젠 medium(시험 9/9 첫 판).
  - `kids/subjects/math/js/number100-labs.js` (`window.HundredLabs`): 1~5관(`MathDrill.rounds`·`ask`, 6문제마다 🍬, `[다음 관 ▶]`, 계단 `🪜 50까지의 수 다시 보기`), 6관 `MathBingo`, 7관 `NumberTwenty.makeLab`(두 자리 설정). 학습일지 `g:n100-<종류>` — 4관이 예전 화면 키 `g:n100-compare-diff-tens`·`same-tens`를 잇는다. 초안 네온 medium.
- **공용 부품 옵션(2-1 화면은 그대로)**: `BaseTenDraw.placeControls(ui, { names: { t: '10개씩 묶음', o: '낱개' } })`·`planPress(…, names)`(버튼 `＋ 10개씩 묶음`, 안내 「10개씩 묶음은 다 놓았어요」·「낱개는 0개라 놓지 않아요」), `NumberTwenty.makeLab(cfg)`(`core`·`key`·`total`·`categories`(묶음별 `name`·`unit` → 「10개씩 묶음은 5 · 6개 중 하나」)·`title`·`guide`·`algo`·`whyTitle`·`whyBody`, 기본값 = 2-1 7관, `NumberTwenty.lab = makeLab()`), `MathBingo`는 문제에 `speak`가 있으면 그 말을 읽음, 공용 CSS 저학년 규칙에 `body.mx-grade1`.
- **덧셈·뺄셈 개념** (`addition_concept.html`·`subtraction_concept.html`, 구슬판 화면 그대로): 탭 `🎲 10 빙고` — `kids/subjects/math/js/arithmetic_bingo.js` (`window.ArithmeticBingo`): `makeBingo(op, rng)`(덧셈 make10 4~5개 + 받아올림 덧셈, 뺄셈 답 1~9 한 번씩·sub10 4~5개·답 1은 10 − 9, 문제 `{ kind, op, a, b, answerText, call, speak }`), `makeCtx(op)`(탐험관 틀 없는 화면용 작은 ctx: `MathExplorer.makeUi`, 첫 판 보상 키 `math_cpa-bingo-{add|sub}_first_{아이}_{날짜}`), `mount(panel, op)`. 학습일지 `g:cpa-bingo-<종류>`, 더 풀기 셈 `cpa-bingo-{add|sub}`. 초안 하이드로젠 medium. 개념 퀴즈(`arithmetic_cpa.js` `initQuiz`)는 보기 3개(정답 + 오개념 2개, 1 이상)·질문 읽기(퀴즈 탭이 보일 때만, 탭을 열면 `sayQuiz()`)·틀린 보기 끄기 + 힌트 읽기 + 정답 반짝·10 만들기/10에서 빼기 문제에 구슬판(`#quiz-frame`)·6문제마다 🍬(`MathDrill.counter('cpa-quiz-{add|sub}')`), 학습일지 키는 예전 그대로(`g:cpa-make10` 등).
  - 이 두 화면은 `math_explorer.css`를 **페이지 CSS보다 먼저** 싣는다(복제하지 않음, 바뀌는 건 줄 간격뿐이라 `arithmetic_cpa.css`가 `body { line-height: normal; }`로 되돌림). `arithmetic_cpa.css`의 버튼 규칙은 `button:not(.mx-btn)`으로 좁혀 빙고 버튼 모양을 덮지 않는다. 싣는 순서 `math_quiz_engine` → `math_explorer-shell` → `math_squishy` → `math_explorer-ladder` → `math_bingo` → `arithmetic_bingo` → `arithmetic_cpa` → `arithmetic_lessons`.
- **C 묶음 🎯 받침 빙고 (국어, 같은 날)**: `kids/subjects/korean/batchim_bingo.html`(국어방 카드 `minseoBatchimBingoCard`, 민서만) + `kids/js/korean_batchim_bingo.js` (`window.BatchimBingo`, node `module.exports`) + `kids/css/korean_batchim_bingo.css`(`mx-theme-kbingo`, 공용 `math_explorer.css` 다음). 노션 VOCA_DB 민서 국어 `어휘유형=단어`를 읽기만 해 단원 칩(여러 개)으로 고르고 `MathBingo.render`로 논다. 순수 함수 `eligibleWords`(한글 1~4글자·받침 있음·표제어 하나, 예문 있는 행 우선)·`trapRank`(0 연음·거센소리, 1 대표 받침·ㅅ, 2 그 밖 — 함정은 0·1만)·`soundTrap(낱말, 표제어들)`(`QuestMastery.misspellingsOf` 후보, 표제어와 겹치면 뺌)·`soundsAlike`(읽다·익다 한 판 금지)·`makeBoard(낱말들, { traps, rng, allWords })` → `{ problems, decoys }`(첫 판 9낱말, 둘째 판부터 7낱말 + 함정 2칸)·`callText`(예문 `[활용형]` → `(　　　)`)·`speakText`(「닳다. 연필심이 닳았다.」)·`wrongHint`·`groupUnits`. 첫 판 키 `kbingo_first_{아이}_{날짜}`, 더 풀기 `MathDrill.counter('kbingo', { perReward: 6, expType: 'korean' })`, 문항기록 `v:<VOCA page_id>`(국어). 명세 [`docs/korean_spec.md` §5-4-1](../../docs/korean_spec.md), 시험 `tests/korean-batchim-bingo.test.mjs`.
- **`MathBingo` 공용 옵션 (C 묶음, 모두 선택이라 수학 화면 그대로)**: `makeBingo({ extra })`가 `{ problems, decoys: [{ text, of }] }`를 돌려줘도 됨(함정 칩, 부르지 않음, `of` 낱말을 터뜨리면 함께 닫혀 줄에 셈·판 끝에 목록), `labels: { place, pickFirst }`, `wrongHint(문제, 누른 글자)`(보이고 읽음), `track(문제)`(문항기록 도우미), `expType`(→ `MathDrill.counter(key, { perReward, expType })`, 기본 `'math'`). **`MathBingo.makeCtx({ keyPrefix, expType })`** — 탐험관 틀 없는 화면용 작은 ctx(`ArithmeticBingo.makeCtx(op)`는 이것을 부름, 키 그대로).
- **B 묶음 (같은 날, 구조는 그대로 다듬기)**: `number50.html`(입력칸 → 3지선다 `renderPickChoices`·`pickWrongs`, 기차 빈칸 고르기, 버저 → `fairyEncourage`, 숨은 단계는 읽지 않음), `shapes.html`(보기 상자·둥근기둥·공 셋, 질문 읽기, 고른 모양 특징 힌트, 6문제마다 🍬 `MathDrill.counter('shape-quiz')`), `clock_rules.html`(시계·구슬 맞히기 질문 읽기·에러리스·56px). 상세는 명세 §9.
- **D 묶음 (같은 날)**: 국어방 머리 줄 폰 줄바꿈·받아쓰기 자석 56px(`korean.css`), 50까지의 수 선 잇기에 「카드 누르고 옆 줄 카드 누르기」, 시계·규칙 화면 탭 4개(`.play-tabs`, 지난번 탭 기억 `math_clock_tab_{아이}`). 상세는 명세 §10.
- 검증: `tests/math-number100.test.mjs`(읽기 표, 종류마다 seed 300 범위·겹침·오개념 이름·경계 절반·같은 수 쌍·홀수 고르기, 빙고, 스무고개 90개·칩), `tests/math-arithmetic-bingo.test.mjs`(두 연산 seed 300, 화면 싣는 순서·공용 CSS 먼저), `tests/learning-log-math.test.mjs`(CPA 퀴즈 키 그대로, 100까지의 수는 키 연결만), `tests/math-twenty.test.mjs`(2-1 기본값). 화면은 쓰기 차단 서버 375px로 7관·10 빙고·개념 퀴즈를 오답 먼저 골라 완주.

### 수학 대문·각도 페이지 인라인 CSS·JS 분리 (2026-10-31)

- `kids/subjects/math/math.html`(466줄, 2026-11-14 3단원 카드 2장 추가)은 `kids/css/math_lobby.css`(267줄)와 `kids/subjects/math/js/math_lobby.js`(130줄)를 원래 인라인 블록 위치에서 로드합니다. 전역 함수 `openMathSection`·`switchConceptMode`·`filterGradeSector`·`filterTopicSector`, 즉시 실행되는 `goLobbyBtn` 클릭 등록과 기존 `DOMContentLoaded` 초기화를 보존합니다.
- `kids/subjects/math/angles_concept.html`(214줄)은 `kids/css/math_angles_concept.css`(123줄)와 `kids/subjects/math/js/angles_concept.js`(533줄)를 같은 방식으로 로드합니다. `setAngleValue`·`onSliderAngleChange`·`selectAngleType`·`switchPolygonSum`·`setQuadMethod`·`setTriCutState`·`setQuadCutState`·`setQuadSplit`·`generateMissingAngleProblem`·`nextQuiz` 등 기존 전역 핸들러와 초기화를 유지합니다.
- 상대 경로와 캐시 버전 `20261031-math-split2`를 사용하며 클래식 스크립트·기존 외부 스크립트 순서·원문·마크업은 변경하지 않습니다. 두 페이지 모두 뒤에 오는 스크립트가 없고 JS는 한 파일씩입니다.
- 검증: `tests/math-pages-split2.test.mjs`(고정 main fixture·600줄 제한·원문·마크업·상대 경로·단독 VM 로드). 대문 VM은 기존 `goLobbyBtn` 조회와 클릭 등록만 허용합니다. 분리 계약과 화면 확인 담당은 `docs/math_pages_split2_spec.md`를 따릅니다.

### 수학 세로셈 JS 분리 (2026-11-01)

- `kids/js/vertical_math_logic.js` (434줄): 전역 상태·초기화·계산 메모장·숫자패드·화면 전환·난이도·문제 생성·시작. 기존 `startGame`·`showDifficultyModal`·`pressNum`·`exitRoom` 등의 전역 API를 유지합니다.
- `kids/js/vertical_math_grid.js` (446줄): `simulateDivision`·`renderDynamicGrid`·`nextQuestion`·`submitAnswer`·`showResult`·`printWorksheet`. 채점·완주의 `fairyPraise`·`fairyEncourage`·`fairyReward` 호출을 보존합니다.
- `kids/subjects/math/vertical_math.html`에서 상대 경로 `../../js/vertical_math_logic.js` → `../../js/vertical_math_grid.js`를 같은 `?v=20261101-vertical-split`로 연속 로드합니다. 클래식 스크립트·기존 전역 상태·HTML 이벤트 함수를 유지합니다.
- 원문 재결합·600줄 상한·HTML 배선·첫 파일 단독 실행·전역 함수/상태/이벤트/타이머 비교는 `tests/vertical-math-split.test.mjs`, 분리 계약과 화면 확인 담당은 `docs/vertical_math_split_spec.md`를 따릅니다.

### 수학 50까지 수 JS·CSS 분리 (2026-11-01)

- `kids/subjects/math/number50.html`은 `kids/js/math_number50.js`(424줄: 사운드·보상·폭죽·탭·STAGE 1·2) → `kids/js/math_number50_stages.js`(496줄: STAGE 3·4·나가기·초기화)를 클래식 스크립트로 연속 로드합니다. 기존 전역 `switchTab`·`addStar`·`getNumberNames`·`generateNewRandomMatching`·`exitRoom` 등의 이름과 동작을 보존합니다.
- CSS는 `kids/css/math_number50.css`(524줄: 공통·레이아웃·STAGE 1) → `kids/css/math_number50_stages.css`(388줄: STAGE 2·3·4·애니메이션) 순서입니다. 네 태그는 상대 경로와 동일한 `?v=20261101-number50-split`을 사용합니다.
- `tests/number50-split.test.mjs`가 고정 fixture 원문 재결합·600줄 상한·CSS 경계·HTML 로드 계약·첫 JS 단독 실행·원본 대비 전역 API/상태/이벤트 보존을 검사합니다. 상세 계약과 화면 확인 담당은 `docs/math_number50_split_spec.md`를 따릅니다.

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

### 레슨 구성·화면 (2026-10-30, 격리 브랜치 검증 중)

- `kids/subjects/quest/quest-lesson.js`: 전역 `QuestLesson`. `buildLesson({child,items,subj,store,today,rng,mode})`가 단계 배열을 만든다. `createSession`이 재출제·콤보·중복 완료를 관리한다. `validateLesson`은 시작 전 계약을 검사한다. `QuestMastery.buildQuestion/buildMatch`를 재사용한다.
- `kids/subjects/quest/quest-lesson-ui.js`: 전역 `QuestLessonUI`. `start({unit,subj,mode,isMinseo,onCompanion,onExit})`가 단계 저장·완주 일지·다음 레슨을 연결하고, `resolveSubject(params,child)`가 민서 과목을 선택한다. 두 스크립트를 러너 앞에 로드한다.
- 기본 3·3·3은 full 레슨, `lesson=bite`는 3문제, `lesson=round5`는 이전 판, `engine=classic`은 4+1이다. `from=storybook`은 선택 필드 `STORY_BOOK.questLink={subject,unit}`로 들어온다.
- `COMPANION_EVENTS`: `start`, `correct`, `encourage`, `combo`, `step`, `boss`, `clear`. 세션 신호 detail은 `{combo,stepIndex,stepTotal,isMinseo}`이다. 화면에서 `correct`·`encourage`는 `QuestLessonUI`가 보기를 고른 순간(`onPraise`·`onEncourage`)에 보내고 세션의 0.65초 뒤 신호는 넘기지 않는다. `start`는 [다음 레슨]·[한 입 더]에서 보낸다. 러너는 `syncCheerMonsterReaction`으로 파트너 리액션(`monster_roster.js`)에 연결한다.
- 저장 키 `questBiteCount_daughter_{YYYY-MM-DD}`는 `{korean,english}` 완주 횟수다. `readBiteCounts/recordBiteCompletion/biteCountKey`로 다룬다. `quest-lesson-complete` 이벤트 detail은 `{lessonId,child,mode}`다.
- `StudyActivity.recordLessonComplete(id,startedAt)`는 실제 입력 직후 보이는 quiz에서만 v3 `lessons:[{id,startedAt,at}]`를 남긴다. 기존 시간 인정 규칙은 같다.
- `study-log-store.js`: `MINMIN_STUDY_LOG_QUEUE_V1`에 조회/전송 실패를 보존한다. `flushQueue`는 페이지 load와 다음 upsert에서 재시도한다. `reportParts`는 1900자×40조각, 초과하면 오래된 판부터 생략한다. 운영 노션 중복 행을 정리하지 않는다.
- 검증 경계: 자동 시험은 운영 쓰기 없이 수행한다. 모바일·PC 육안 검증과 실기기 보상 확인은 별도 결과를 명세에 기록한다.


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
  - 다중 회차(`|`) 단원 지원(2026-11-04): 한 단어 행의 `단원`에 여러 회차가 `|`로 들어 있으면(`"[센터 5-1] 06번 - … | [센터 5-2] 25번 - …"`), 각 회차 단원 칩에 모두 집계하고 단원 문자열의 `5-1`/`5-2`로 학기를 구분합니다. `quest-mastery.js`(`selectUnitItems`)와 `notion-voca.js`(`fetchVocaUnitFresh` `rich_text.contains`)도 `|` 단위로 매칭합니다.
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
- **`quest-runner.js`** (약 694줄, 전역 `window.QuestRunner = { boot }`): URL 파싱·`getSubjectQuest` 바인딩, 가디언 학습 상태 표시, 3·3·3 마스터리 연결부(`bootQuest`·`renderMasteryQuestion`·`handleMasteryDone`), 기존 4+1 렌더링·채점·하트·리벤지, `showClearModal`(`QuestMastery.pushChanges` → `grantRewardAndShowUI(3, true)` → `sendStudyLogToNotion`), `StudyActivity.setPhase/recordCorrect` 연동. 기존 완주 모달 또는 full·한입 완료 이벤트에서 `GalleryRunnerRewards.markQuestBoost(child)`를 기다리지 않고 한 번 호출해 당일 미니 런 별 자석을 켭니다.
- **HTML onclick 호환 전역**: `handleCheckAnswer`, `goToNextStep`, `playQuestionAudio`, `selectChoice`, `startRevengeRound`, `skipRevengeAndClear`, `confirmExit`, `closeExitModal`, `returnToLab`, `goToSubjectDeepTraining`(별칭 `goToMathDeepTraining`), `goToLobby`, `playSound`, `toggleMathMemoPad`, `clearMathMemoCanvas`, `openImageZoom`, `closeImageZoom`.

### 🌟 `monster_roster.js` (5분 퀘스트 파트너 몬스터 로스터 & 포즈/에러리스 대사 엔진, 2026-10-24 추가)
- 친밀도 대사: `refreshGalleryMonster`는 선택 파트너 조회 시 로컬 친밀도를 반영하고 단계별 walk·correct 대사를 기존 배열에 누적합니다. 갤러리 walk는 탭 주기가 넘어가도 순환하여 추가 대사까지 도달하며 격려 대사는 유지합니다. 모듈이 없으면 기존 대사·배지 그대로입니다.
- **갤러리 파트너 (2026-10-29)**: `equipGalleryPartner(child, {artId,name,spriteUrl})`, `getGalleryPartner(child)`, `clearGalleryPartner(child)`, `isValidCharacter(character)`. child는 `son`/`daughter`만 받습니다. 민수는 동적 `gallery_partner`(동일 그림 포즈 6종·공용 에러리스 대사)를 로스터 끝에 추가하고 `selectedMonster`로 선택합니다. 해제하면 선택 중인 갤러리 파트너만 `clay_bite`로 복구합니다. 민서는 별도 저장만 하며 민수 선택을 바꾸지 않습니다.
- **이름 조사**: `withJosa(name, '이/가'|'와/과'|'을/를'|'은/는')`는 한글 종성으로 조사를 선택하고 비한글은 `이(가)`처럼 병기합니다. 갤러리 파트너의 연구소·러너 대사와 미니 런 안내·제목이 이 함수 한 벌을 사용합니다.
- **저장 원천**: `galleryPartner_son`/`galleryPartner_daughter`의 `{artId,name,spriteUrl,equippedAt}`와 `galleryRunnerBest_son`/`galleryRunnerBest_daughter`는 이 파일만 정의합니다. 최고 기록은 `getRunnerBest(child)`/`setRunnerBest(child, score)`로 읽고 갱신합니다. 모두 기기 로컬이며 기기 간·노션 동기화는 없습니다. 저장소 접근 실패는 null/false/0으로 돌려줍니다.
- **주소**: HTTPS 또는 같은 출처 상대 주소만 허용합니다. 상대 주소는 장착 시 출처 기준 경로로 고정해 갤러리·연구소의 디렉터리 차이를 없앱니다. 실제 생성 데이터는 아카이브 CDN만 씁니다. 민서 연구소는 이미지 실패 시 기본 삼총사 그림·이름으로 돌아갑니다. 러너는 일반 문제의 첫 화면부터 파트너 반영 함수를 호출합니다.
- **파일 위치**: `kids/subjects/quest/monster_roster.js` (전역 `window.MonsterRoster`, `monster_lab.html` 및 `quest_runner.html`에서 로드)
- **에셋 경로**: `kids/assets/monsters/cottun_bongdomdol/` (`idle.png`, `greet.png`, `walk_left.png`, `walk_right.png`, `rage.png`, `roar.png` — 800×800 투명 캔버스 바닥 기준 완벽 정렬 누끼 PNG)
- **역할**:
  - `[1호: 뿌쀳히탈탈]`(`clay_bite`)와 민수 자작 캐릭터 `[2호: 콧툰봉돔돌 (SCP-봉제괴수)]`(`cottun_bongdomdol`) 모두 100% 투명 배경 누끼 캐릭터로 사이버 연구실 마법진 발판 위에 동일한 레이어 위계로 서서 렌더링됩니다.
  - `localStorage.getItem('selectedMonster')`로 선택 상태가 영속화되며, 탭 단계별 포즈 변화(1회 인사 ➔ 2~4회 걷기 ➔ 5회 과열 쉐이크 ➔ 출격 시 포효)와 퀘스트 러너 에러리스(Errorless) 응원을 지원합니다.
- **핵심 API**:
  | 메서드 | 설명 |
  | :--- | :--- |
  | `getSelectedMonster()` / `setSelectedMonsterId(id)` | 현재 선택된 파트너 몬스터 조회 및 `localStorage('selectedMonster')` 저장 |
  | `preloadMonsterAssets(id)` / `preloadAllMonsters()` | `new Image()`로 포즈별 이미지 즉시 프리로드 (탭/채점 시 깜빡임 원천 방지) |
  | `getLabTapResponse(tapCount)` | 연구소 `pokeMonster` 탭 단계별 포즈·대사 반환 (1회 `greet` 인사 / 2~4회 `walk_left`·`walk_right` 교차 / 5회 `rage` 과열+Shake, 출격 시 `roar` 포효) |
  | `getRunnerReaction(state, id)` | 실전 러너 `#cheerMonster` 에러리스 반응 반환 `{poseKey,poseSrc,speech,reaction}`. `stageStart`=손인사 `wave`, `correct`·`clear`=만세 `cheer`, `encourage`=✕ 격려 `cross`, `idle`=`null` |
  | `playReaction(el, kind, {onEnd})` | `wave`·`cheer`·`cross` 움직임과 표시(👋·🙌·✕→💡)를 1.6초 재생하고 `onEnd`를 부른다. `kind`가 `null`이면 재생만 멈춘다. 스타일 `#mr-style`은 첫 재생 때 한 번 넣고 `prefers-reduced-motion`이면 움직임을 끈다 |
  | `setPoseImage(img, src, child)` | 포즈 그림을 넣고 실패하면 대체한다. 민수 `son`은 선택 파트너 `idle` → 1호, 민서 `daughter`는 코코 → `minseo-char1.png` 순서이고, 실패한 주소는 다시 부르지 않는다 |
  | `mountCheerPartner(container, src, alt)` | 기존 4+1 완주 창처럼 파트너가 가려지는 곳에 만세하는 파트너를 넣는다. 그림이 실패하면 원래 아이콘으로 돌아간다 |
- **리액션 포즈 (2026-11-02)**: 기본은 손인사 `greet`, 만세 `greet`, 격려 `idle`이고 파트너별로 `reactionPoses`로 바꾼다(2호 만세 `rage`, 3호 만세 `walk_left`). 그림이 없는 포즈는 `idle`로 내려가며, ✕·만세 전용 그림이 생기면 이 값만 바꾼다. 그림이 1장인 1호·자작 파트너와 민서 코코는 움직임과 표시로만 구분한다. 연구소는 입장·파트너 교체 때 손인사만 하고, ✕·만세는 채점이 있는 러너에서만 나온다.

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

### 🌟 `korean_dictation.js` ([2단계] 받아쓰기 훈련소 화면)
어절 블록 → 글자 자석 → 직접 쓰기(타자·공책) 화면, 오디오 재생, 단계적 초성 힌트, 틀린 문장 재출제를 담당합니다. 규격: `docs/korean_spec.md` §5-3-2.
- **파일 위치**: `kids/js/korean_dictation.js` (약 545줄)
- **핵심 API**:
  | 메서드 | 설명 |
  | :--- | :--- |
  | `KoreanDictation.beginSession({records, unit, child, container, onQueue})` | 노션 진도를 읽어 병합하고 이번 단계의 문장 대기열을 `onQueue`로 넘김 |
  | `KoreanDictation.renderUI(container)` | 현재 문장의 입력 화면 렌더링 |
  | `KoreanDictation.verify()` | 블록·자석·타자 입력 채점 |
  | `KoreanDictation.requeueCurrent()` | 틀린 문장을 대기열 맨 뒤로 보내고 다음 문장으로 이동 |
  | `KoreanDictation.renderRoundDone(container)` | 판 완료 화면, 다음 단계·회차 완성 안내 |
  | `KoreanDictation.endSession()` | 진도 전송 후 회차 상태 닫기 (`closeMissionView`에서 호출) |
  | `KoreanDictation.unitBadge(records, child)` | 회차 카드의 진도 글자 |

### 🌟 `dictation_ladder.js` (받아쓰기 사다리 계산 엔진, DOM 없음)
- **파일 위치**: `kids/js/dictation_ladder.js` (약 270줄, 전역 `window.DictationLadder`). `quest-mastery.js`보다 뒤에 로드합니다.
- **핵심 API**:
  | 메서드 | 설명 |
  | :--- | :--- |
  | `eligibleRounds(sentence)` · `currentRound(items, stateOf)` · `queueFor(items, round, stateOf)` | 문장별로 풀 수 있는 단계, 회차의 현재 단계, 이번 판 대기열 |
  | `inputModeFor(round, wrongCount, sentence)` · `shouldShowHint(wrongCount)` | 2번 틀리면 초성, 3번 틀리면 쉬운 입력 방식 |
  | `pickTrap(sentence)` · `buildBlocks(sentence)` · `buildLetters(sentence)` | 철자 함정과 블록·자석 재료 (`QuestMastery.misspellingsOf` 사용) |
  | `judge(target, submission)` · `diffTokens(target, submission)` | 채점(`punct`·`space`·`letters` 구분), 틀린 어절 표시 |
  | `mergeFromRecords(child, records, isFresh)` · `markPassed(child, id, round)` · `pushDirty(child, patchFn)` | 기기 저장(`MINMIN_DICTATION_LADDER_V1_{학생}`)과 노션 `숙련도` 동기화. `달성`은 보내지 않음 |

`notion-api-client.js`도 `fetchVocaUnitFresh`·`updateVocaMasteryProgress`를 제공합니다(퀘스트 러너 전용 `notion-voca.js`와 같은 계약, 받아쓰기 사다리 사용).

### 🌟 `korean_voca.js` ([3단계] 국어 어휘 퀴즈 훈련소 전담 엔진)
객관식(단어->뜻 3지선다) 및 주관식(뜻->단어: 긴 단어 자석 빈칸 채우기, 다단어 객관식, 직접 입력) 퀴즈와 힌트/채점을 전담하는 독립 모듈입니다.
- **파일 위치**: `kids/js/korean_voca.js` (약 435줄)
- **단원 목차 (2026-11-16)**: 학년 고르기 없이 `[🏫 교과 단원]` `[🏥 센터 회차]` → 학기 묶음(공통 `GroupedList`)으로 보여 준다. 「단원」의 ` | ` 결합(낱말 1개가 여러 센터 지문에 나옴, [국어 명세서 §5-1](../../docs/korean_spec.md))은 `QuestMastery.parseUnitList`로 나눠 낱말이 회차마다 들어간다(전에는 결합 문자열이 버튼 1개로 생기고 5-2 목록에 5-1 회차가 섞였다). 센터 판별은 등록 도구가 쓰는 고정 머리(`[센터 ` / `[🏥 센터`) 하나만 본다. 센터 회차는 머리를 뗀 이름의 번호 순, 교과 단원은 독해 DB에서 「회차/단원」이 글자까지 같은 지문의 「순번」 순(독해 지문이 없는 단원은 앞에 글자순). 단원의 학기는 그 단원 하나만 가진 행들의 학년 중 가장 많은 것.
- **핵심 API**:
  | 메서드 | 설명 |
  | :--- | :--- |
  | `KoreanVoca.renderUnitDirectory(container, records, {headerHtml, newestFirst, memoryKey, onPick(unit)})` | 단원 목차 그리기 (국어방 `renderKoreanVocaDirectory`가 부름) |
  | `KoreanVoca.buildUnitGroups(records, {textbookOrder, newestFirst})` | 단원 목차 묶음 만들기 (시험용으로도 씀) |
  | `KoreanVoca.recordHasUnit(record, unit)` | 결합 행까지 포함해 그 단원 낱말인지 (퀴즈 거르기) |
  | `KoreanVoca.renderUI(container)` | 어휘 퀴즈 카드 렌더링 및 음성 자동 낭독 |
  | `KoreanVoca.setMode(mode)` | 'choice'(객관식) ↔ 'subjective'(주관식) 전환 |
  | `KoreanVoca.getOrderToggleHtml(type)` | 랜덤 섞기 ↔ 순서대로 토글 버튼 HTML 생성 |

### 🌟 `korean_mini_reading.js` ([4단계] 민서(초1) 미니 독해 전담 엔진)
3~4문장 초단편 지문을 성우 TTS로 읽어 준 뒤 고정 3단계 꼬리문제(① 낱말·겹받침 → ② 인물의 생각 → ③ 글쓴이의 중심 생각)를 에러리스로 푸는 민서 전용 모듈입니다. 민수용 `reading_engine.js`와 데이터·화면을 공유하지 않는 병렬 모듈이며, 국어방 카드 `#minseoMiniReadingCard`는 민서 프로필에서만 보입니다.
- **파일 위치**: `kids/js/korean_mini_reading.js` (약 350줄) · 스타일: `kids/css/korean.css` 하단 `.mr-*`
- **데이터**: 노션 `LIBRARY_DB` 중 `트랙 = 🌱 민서 미니 독해` (`fetchReadingPassagesFromNotion` 재사용). `문제데이터` JSON 문항 = `{ step, type:"choice", question, options[], answer(보기 문자열|번호), explanation, speaker?:{name, icon, line}, label?, icon? }` (`label`·`icon`은 그 문항의 단계 이름 바꾸기, 예: '일의 차례'). 보기 속 `→`는 읽을 때 '그다음'으로 바꿔 읽는다
- **지문 그림 (2026-10-23)**: LIBRARY_DB `이미지 URL`(→ `passage.imageUrl`)이 있으면 지문 화면·이야기 다시 보기에만 스토리북 장면을 띄운다. 세로 그림을 자르지 않고 `object-fit: contain`(모바일 위 180px 카드, 640px 이상은 지문 왼쪽 190px 칸), 누르면 화면 안 확대 창(`#mrLightbox`, 아무 데나 누르거나 Esc로 닫힘). 주소가 없거나 못 불러오면 그림 칸을 지운다. 문제 카드에는 그림을 넣지 않는다. 줄별 그림 확장용으로 `passage.lineImages`(`줄별 이미지` JSON 배열)를 읽어 두며 `sceneImage(passage, lineIdx)`가 줄 그림 → 대표 그림 순으로 고른다(지금 화면은 대표 그림 1장).
- **고음질 음성**: 대본(제목·지문 줄·`questionScript(q)`)마다 `kids/assets/audio/mini_reading/<SHA-1 12자리>.mp3`를 먼저 재생, 없으면 `speakFairyTTS` 폴백. 생성: `python -X utf8 scripts/build_mini_reading_audio.py [--dry-run] [--prune]` (Edge-TTS SunHi). 자동 읽기 토글 `localStorage.mini_reading_autoplay`(`on`/`off`), 화면 전환·창 닫기 시 `KoreanMiniReading.stop()`으로 항상 멈춤.
- **등록 도구**: `python -X utf8 scripts/register_minseo_korean.py --file scripts/data/minseo_korean_<학기>_<단원>.json [--apply]` (VOCA 정제 어휘 + 미니 독해 지문을 한 번에 갱신·신규 등록, 기본 미리보기). 노션 통신 함수(`call`·`query_all`·`rich`·`plain_title`)는 `scripts/register_voca.py`에서 불러 쓴다(2026-11-08).
- **핵심 API**:
  | 메서드 | 설명 |
  | :--- | :--- |
  | `KoreanMiniReading.renderLobby(container)` | 단원별 이야기 카드 서가 (트랙 `MINI_TRACK`만 조회) |
  | `KoreanMiniReading.start(passageId)` | 지문 화면 진입 + TTS 자동 읽기 (문장 터치 시 그 문장만 다시 읽기) |
  | `KoreanMiniReading.isMissionInProgress()` | 1문제 이상 풀고 완주 전이면 true (국어방 이탈 방지 가드) |
- **보상·기록**: 첫 시도 정답 `triggerAwardDispense(1)` + `fairyPraise`, 오답은 정답 보기 노란 안내 + 해설 + `fairyEncourage`, 완주 `fairyReward` + `triggerAwardDispense(3)` + `sendStudyLogToNotion({ subject: '국어(미니독해_제목)' })`

### 🌟 `korean_sentence.js` ([5단계] AI 지문 토론방 전담 엔진)
지문별 AI 심층 토론, 생각 확장 코칭, 부모 검수 뱃지, 실시간 대화 보상을 전담하며 2026 플래그십 표준(`gemini-3.8-flash`)을 탑재한 독립 모듈입니다.
- **파일 위치**: `kids/js/korean_sentence.js` (약 250줄)
- **지문 목록 (2026-11-16)**: 정밀 독해와 같은 노션 독해 DB 국어 지문(`ReadingEngine.loadPassages('국어')`)을 같은 묶음 목록(`ReadingEngine.buildPassageGroups`)으로 보여 준다. 전에는 「추천 여부」 10건(과목 구분 없음)을 옛 로컬 파일 `korean-reading-data.js`와 도서 키로 맞춰 보느라, 국어 키는 하나도 맞지 않고 그 파일 앞쪽의 영어 지문 8편만 나왔다.
- **독해 → 토론 연결**: `window.openDiscussionForPassage(id)`를 두면 정밀 독해 완료 화면에 「🗣️ 이 지문으로 코코와 토론하기」가 생기고, 누르면 토론방이 그 지문으로 바로 열린다.
- **핵심 API**:
  | 메서드 | 설명 |
  | :--- | :--- |
  | `KoreanSentence.renderUI(container)` | 지문 선택 목록 렌더링 (async) |
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
- **문제 번호 공유 (2026-11-16)**: 문제 번호 `activeQuizIdx`와 문제 묶음 `activeSectionData`는 최상위 `let`이라 그대로는 `window`에 붙지 않습니다. `english_voca.js`(4단계 「다음 문제 풀기」·3단계 방식 다시 고르기)와 `quiz-flow-controller.js`·`quiz-feedback-overlay.js`가 `window` 경로로 읽고 쓰므로, `Object.defineProperty`로 같은 변수를 가리키게 이어 둡니다. 이음이 없으면 4단계가 첫 문장만 되풀이합니다(2026-10-02 분리 때부터, 11-16 제보). 정답 뒤 넘김 화면(`triggerQuizAdvance`)에는 번호가 이미 다음 문항이므로 방금 푼 낱말을 `word`로 넘깁니다. 시험: `tests/english-stage4-advance.test.mjs`(4개).

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
- **파일 위치**: `kids/js/english_chat.js` (약 250줄)
- **지문 목록 (2026-11-16)**: 노션 독해 DB 영어 지문만(`ReadingEngine.loadPassages('영어')`) 정밀 독해와 같은 묶음 목록으로. 전에는 로컬 `english-reading-data.js`(9월에 손으로 넣은 7·8·11단원·예시 지문)를 먼저 보여 줘서 독해에는 없는 단원이 토론에만 있었다. 로컬 파일은 노션이 비거나 끊길 때 예비로만 쓴다. 로비 단원 칩에서 고른 단원은 맨 위 「⭐ 고른 단원」에 펼친다(거르지 않음).
- **핵심 API**:
  | 메서드 | 설명 |
  | :--- | :--- |
  | `EnglishChat.renderSentenceUI(container, {highlight})` | 토론 지문 선택 목록 렌더링 (async) |
  | `EnglishChat.startSentenceMission(bookId, books)` | AI 회화 토론 세션 초기화 및 채팅창 렌더링 |
  | `EnglishChat.renderSentenceChat()` | Gemini 3.8 Flash 연동 실시간 대화창 렌더링 |

### 🌟 `english_unit_bar.js` (대기실 단원 칩 바 & 「이번 단원 특별 활동」 칸, 2026-11-06~)
영어방은 6단계 사다리(활동 순서)가 뼈대이고, 이 바에서 학기·단원을 먼저 고르면 2~4단계가 단원 선택 화면 없이 그 단원으로 바로 시작합니다. 과학방처럼 단원별 구역으로 나누지 않는 이유: 영어 단원은 활동 종류가 같고 내용(클래스 카드 단어·문장)만 바뀌기 때문입니다.
- **파일 위치**: `kids/js/english_unit_bar.js` (칩 바 자체는 공통 `kids/core/unit_chip_bar.js`) · 등록표 `kids/subjects/english/data/english_unit_activities.js` (`window.ENGLISH_UNIT_ACTIVITIES`)
- **데이터**: 학기·단원 칩은 `fetchVocaFromNotion({subject:'영어'})`의 `grades`·`level` 원문으로 만든다(표시만 `L8`→`8단원`). 고른 값은 이 기기에만 아이별로 기억한다(`english_unit_pick_{son|daughter}`).
- **특별 활동 등록**: 그 단원에만 맞는 활동이 있을 때만 등록표에 `{grade, unit, icon, title, desc, href}` 한 줄을 넣는다. 화면이 `href?grade=&unit=`으로 붙여 연다. 등록 기준은 ① 그 단원 클래스 카드 핵심 문장을 그대로 연습 ② 데이터만 바꿔 두 단원 이상에 쓰는 엔진.
- **핵심 API**:
  | 메서드 | 설명 |
  | :--- | :--- |
  | `EnglishUnitBar.init()` | VOCA 조회 후 칩 바 렌더링 (english.html `DOMContentLoaded`) |
  | `EnglishUnitBar.applyToMission(records)` | `english_common.js`가 2~4단계를 열 때 호출. 고른 단원 문제가 있으면 `selectDynamicGradeUnit(grade, unit)`, 단원 문제가 없으면 `selectDynamicGrade(grade)`로 넘기고 true. 전체 보기면 false(원래 선택 화면) |
  | `EnglishUnitBar.getPick()` | 현재 `{grade, unit}` |
- **검증**: `tests/english-unit-bar.test.mjs`

### 🌟 `english_listen_place.js` (영어 듣고 끌어다 놓기 공통 엔진, 2026-11-06~)
영어 문장을 듣고, 그 문장대로 물건을 알맞은 곳에 끌어다 놓거나 눌러서 맞히는 단원 확장형 공통 엔진입니다. VOCA DB의 클래스 카드 문장을 실시간으로 읽어와 출제하며, 에러리스 피드백(감점 없음, 틀리면 정답 카드 노란 펄스 안내 및 음성 재재생)과 모바일 375px 무스크롤 인터랙션을 지원합니다.
- **파일 위치**: `kids/js/english_listen_place.js` · 래퍼 `kids/subjects/english/listen_place.html`
- **핵심 API**:
  | 메서드 | 설명 |
  | :--- | :--- |
  | `EnglishListenPlace.registerScene(name, sceneObj)` | 새 단원 장면(dressup, room, map 등) 등록 |
  | `EnglishListenPlace.init({ grade, unit, sceneData, containerId })` | VOCA 매핑, 유효 문제 검증, 세션 시작 및 렌더링 |
  | `EnglishListenPlace.speak(text)` | 원어민 영어 음성 출력 브리지 |
- **검증**: `tests/english-listen-place.test.mjs`
- **계약 (2026-11-06 Claude 검증·병합)**: 문장은 `fetchVocaFromNotion({subject:'영어', filterByStudent:true})`(영어방이 받아 둔 아이별 캐시)에서 `pageId || id`로 찾는다. 질문과 길 안내처럼 여러 행이 나뉘어 있으면 `pageIds` 배열로 이어 붙인다. 정답마다 `rewardQuizCorrect(문제번호)`, 완주 때 `finalizeQuizRewardSession({isFullComplete:true, subject:'영어(단원)', childName, errorReport})` 한 번. 완주 뒤 보상 세션을 되살리지 않는다(되살리면 페이지를 나갈 때 학습일지가 한 번 더 나감).

### 👗 `english_listen_place_dressup.js` (8단원 외모·옷차림 장면 모듈, 2026-11-06~)
코드로 그리는 인물 SVG(남자/여자)와 헤어, 눈, 모자, 안경, 상의, 하의 슬롯 레이어를 렌더링하고, 트레이 아이템 썸네일 생성 및 인물 착용을 처리합니다. 마지막 판 「Catch the Impostor」 3명 후보 렌더링을 제공합니다.
- **파일 위치**: `kids/js/english_listen_place_dressup.js` · 데이터 `kids/subjects/english/data/listen_place_5-2_L8.js`
- **핵심 API**:
  | 메서드 | 설명 |
  | :--- | :--- |
  | `dressup.renderStage(container, who)` | 기본 인물 SVG 무대 생성 |
  | `dressup.renderItem(item)` | 받침대 아이템 카드/미니 그래픽 생성 |
  | `dressup.applyItem(stageEl, slot, item)` | 인물에 해당 아이템 SVG 레이어 적용 |
| `dressup.renderFinaleStage(container, candidates, onSelect)` | 3명 후보 비교 렌더링 및 선택 콜백 |
- **검증**: `tests/english-listen-place.test.mjs`

### 🕖 `english_listen_place_timeline.js` (10단원 하루 일과·시간표 장면 모듈, 2026-11-06~)
하루 시간표 무대(활동 칸 + 시각 칸), 활동 그림 6종 SVG, 아날로그 시계 바늘 각도 계산(`minutes` 기반 분침·시침 회전) 및 숫자 배지 썸네일, 마지막 판 「얼리버드는 누구?」(`early bird` / `night owl`) 후보 3명 미니 시간표를 생성·렌더링합니다.
- **파일 위치**: `kids/js/english_listen_place_timeline.js` · 데이터 `kids/subjects/english/data/listen_place_5-2_L10.js`
- **핵심 API**:
  | 메서드 | 설명 |
  | :--- | :--- |
  | `timeline.renderStage(container)` | 하루 시간표(활동 칸·시각 칸) 무대 생성 |
  | `timeline.renderItem(item)` | 활동 그림(글자 숨김) 및 아날로그 시계+숫자 받침대 카드 생성 |
  | `timeline.applyItem(stageEl, slot, item)` | 맞힌 활동·시각 카드를 시간표 칸에 적용 |
  | `timeline.buildFinaleCandidates(items, finaleQ)` | `early` / `night` 조건에 맞는 후보 3명 미니 시간표 생성 |
  | `timeline.renderFinaleStage(container, candidates, onSelect)` | 후보 3명 미니 시간표 카드 렌더링 및 선택 콜백 |
- **검증**: `tests/english-listen-place.test.mjs`


### 🧭 `english_listen_place_map.js` (11단원 마을 길 찾기 장면 모듈, 2026-11-07~)
위에서 내려다본 마을 지도 무대(출발점 You are here, 큰 나무 랜드마크, A~H 건물 자리 8곳), 장소 그림 카드 9종(영어 글자 숨김)과 위치 표지 카드(A~H) 썸네일, 장소·위치 둘 다 맞혔을 때 출발점→정답 자리 경로 화살표 표시, 마지막 판 「도서관 찾아가기」 후보 지도 3장(정답 경로 1장 + 좌우 반전·한 블록 더 간 오답 2장)을 생성·렌더링합니다.
- **파일 위치**: `kids/js/english_listen_place_map.js` · 데이터 `kids/subjects/english/data/listen_place_5-2_L11.js`
- **핵심 API**:
  | 메서드 | 설명 |
  | :--- | :--- |
  | `map.renderStage(container)` | 마을 지도 무대 및 장소·위치 상태 칩 생성 |
  | `map.renderItem(item)` | 장소 그림(글자 숨김) 및 위치 표지(A~H) 받침대 카드 생성 |
  | `map.applyItem(stageEl, slot, item)` | 맞힌 장소·위치 반영 및 두 개 완료 시 경로 화살표 렌더링 |
  | `map.buildFinaleCandidates(items, finaleQ)` | 정답 경로 1장 + 오답 경로 2장 후보 생성 |
  | `map.renderFinaleStage(container, candidates, onSelect)` | 후보 지도 3장 카드 렌더링 및 선택 콜백 |
- **검증**: `tests/english-listen-place.test.mjs`

### 🃏 `english_classcard*.js` (영어 클래스카드 연습: 매칭 2×4 짝맞추기 → 1,500점 → 카드 넘기기 테스트, 2026-11-22~)
담임 클래스카드 시험 구조를 그대로 연습하는 특별 활동. 시간제한(없음·천천히·기본)과 안심 모드만 다르다. 카드 묶음은 클래스카드 글자 그대로의 정적 자료(VOCA_DB 아님). 명세 `docs/english_spec.md` §2-3.
- **파일 위치**: 화면 `kids/subjects/english/classcard.html?grade=&unit=` · CSS `kids/css/english_classcard.css` · 카드 묶음 `kids/subjects/english/data/classcard_<학년>_L<단원>.js`(첫 묶음 `kids/subjects/english/data/classcard_5-2_L11.js`)(`window.CLASSCARD_DECK`, `english_unit_activities.js`의 `deck` 칸으로 연결)
  - `kids/js/english_classcard.js` (약 390줄, `window.EnglishClasscard`): 저장 상태(`state`, 아이·단원별 기기 저장), 소리(`sound`: `speakEnglish`·`fairyPraise/Encourage/Reward`·짧은 효과음), 보상 연결(`reward`: `claimMissionRewardOnce`·퀴즈 보상 세션·`LearningLog.question`), 로비·결과·안내창
  - `kids/js/english_classcard_grid.js` (약 320줄, `EnglishClasscard.Grid`): 1단계 매칭(짝맞추기) 화면 + 판 계산 `Grid.logic`(`initialBoard`·`refillPair(…, {leftAge, rightAge})`·`countValidPairs`·`pointsFor`, DOM 없음). 판의 짝은 실제 앱처럼 보통 1쌍·가끔 2쌍, 짝 없이 오래 남은 카드는 짝을 넣어 줌. 영어 발음은 맞혔을 때만
  - `kids/js/english_classcard_cards.js` (약 410줄, `EnglishClasscard.Cards`): 2단계 테스트(카드 퀴즈, `buildQuestions`·`tokenize`·`isSpellable`), 6지선다는 `QuizChoices.arrange`, 철자 글자 조각/직접 입력, 밀기
  - 2단계 철자 타이핑 비중(블럭 전체·마무리 타이핑·전체 타이핑)과 자판 위치 안내(항상·막히면 반짝·끄기)는 로비 설정(`state.spellTyping`·`state.keyGuide`). 타이핑 문항은 아래 `english_qwerty.js`를 부른다(`Cards.typingPositions`·`isTypable`).
- **새 단원**: 카드 묶음 파일 하나 + 등록표 한 줄. 엔진은 고치지 않는다.
- **검증**: `tests/english-classcard.test.mjs`

### ⌨️ `english_qwerty.js` (폰용 영문 자판 + 글자 칸 입력기, 2026-11-23~)
폰 OS 키보드 없이 화면 자판으로 영어 철자를 치게 하는 부품. 클래스카드 연습 2단계 타이핑 문항이 첫 사용처이고, 다른 화면에서도 그대로 쓸 수 있다. 초안 hydrogen, 검수·조립 Claude.
- **파일 위치**: `kids/js/english_qwerty.js` (약 410줄, `window.EnglishQwerty`) · `kids/css/english_qwerty.css` (약 190줄, 선택자는 모두 `.qw-`)
- **핵심 API**:
  | 이름 | 설명 |
  | :--- | :--- |
  | `AUTO_SKIP_REGEX` | 자동 건너뜀 규칙 한 줄 (`{…}`·`/`·`~`·`.`·`?`). 실제 앱 기준이 바뀌면 이 줄만 고친다 |
  | `buildSlots(answer)` | 순수 함수 → `[{ch, kind: 'key'|'space'|'skip', expect}]` (끝쪽·기호 뒤 띄어쓰기는 skip) |
  | `keyOf(slot)` | 그 칸에 누를 키 `'a'~'z'`·`'space'`·`"'"`·`null` |
  | `mount(host, {answer, guide, idleMs, onComplete, onWrong(key, expectKey), onHint})` | 글자 칸 + 10-9-7 자판을 그림 → `{input, hint, isDone, destroy}`. guide `'always'|'stuck'|'off'` |
- **규칙**: `<input>` 없음(폰 키보드·자동완성 차단), PC `keydown`도 같은 처리(조합키·반복 무시, 숨겨진 화면 무시), 틀린 키는 칸에 안 들어가고 흔들림만(에러리스), 완료 콜백 한 번, `destroy()`가 키보드 이벤트·타이머를 정리(카드를 넘길 때 꼭 부름). 불러올 때 `document`를 건드리지 않는다.
- **검증**: `tests/english-qwerty.test.mjs`
---

## 2-5. 🔬 과학 탐구방 전담 엔진군 (Science Lab Engines)

### 과학방 대문 CSS 분리 (2026-11-01)
- `kids/subjects/science/science.html`은 `../../css/science.css`(400줄: 기본·레이아웃·모달·퀴즈·애니메이션·인쇄) → `../../css/science-units.css`(401줄: 지문 요약·사진 뷰어·반응형·안전 게이트·단원 탭·실험실 칩)를 같은 `?v=20261101-science-css-split`로 연속 로드합니다.
- 원본 1–400줄 / 401–800줄과 마지막 개행 없음을 보존하고, 둘째 파일에만 지정 머리 주석 한 줄을 추가합니다. `tests/science-css-split.test.mjs`가 고정 CSS·HTML fixture의 바이트 보존·절단 경계·600줄 제한·독립 CSS 블록·HTML 로드 계약을 검사합니다. 분리 계약과 Claude의 화면 비교는 `docs/science_css_split_spec.md`를 따릅니다.

### 2단원 실험실 3개 인라인 CSS·JS 분리 (2026-10-31)
- `kids/subjects/science/science_season_airmass_lab.html`(420줄)·`science_cloud_lab.html`(241줄)·`science_wind_lab.html`(230줄)은 같은 이름의 CSS를 `../../css/`에서, 클래식 JS를 `./js/`에서 원래 인라인 위치·`?v=20261031-science-split`으로 로드합니다. CSS는 각각 339·250·289줄, JS는 각각 418·344·304줄입니다.
- 원문·DOM·전역 함수를 보존합니다. 주요 API는 계절·기단 `switchMode`·`selectAirmass`·`setSeason`·`highlightMatrix`, 구름 `setSmokeMode`·`pressPump`·`openCap`·`startSqueeze`·`endSqueeze`, 바람 `switchLabMode`·`toggleLamp`·`setWindTime`입니다. 기존 `design-system.css`가 개별 CSS보다 먼저, `study-activity.js?v=20261023`은 개별 JS보다 뒤에 있습니다.
- 세 JS는 저장된 보석 수 읽기·`gemCount` 쓰기를 즉시 실행하며, 구름만 `cloudCanvas.getContext('2d')`를 추가 실행합니다. 계절·기단의 `DOMContentLoaded` 등록 1회와 나머지 0회를 포함해 `tests/science-labs-split.test.mjs`가 고정 fixture·허용 목록으로 검증합니다. 분리 계약: `docs/science_labs_split_spec.md`. 화면 비교는 해당 명세서 §6의 별도 확인입니다.

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
  | `selectSocietyGradeUnit(grade, unit)` | 대기실 단원 칩이 학기·단원을 한 번에 넘길 때 쓰는 진입점 (2026-11-06~) |
  | `buildSocietyInteractiveLinkHtml(url, asButton)` | 교과서 QR 영상(`qr.i-scream.co.kr`)·박물관·참고 자료 링크 버튼 HTML 공용 생성기 (2026-11-13~) |

### 🌟 `society_unit_bar.js` (대기실 학기·단원 칩 & 3단계 사다리 카드, 2026-11-06~)
사회방 대기실은 GEMINI.md §1의 3단계 사다리로 나뉜다: **1단계 워밍업**(동화 도서관) → **2단계 빌드업**(용어방·역사 & 문화재 돋보기·지도 탐방실) → **3단계 딥다이브**(차트 & 도표 분석실·5분 퀘스트). 위의 학기·단원 칩(공통 `unit_chip_bar.js`)으로 단원을 고르면 카드마다 그 단원 자료 수가 뜨고, 자료가 없는 카드는 흐려진다. 활동을 열면 선택 화면 없이 그 단원으로 시작한다.
- **파일 위치**: `kids/js/society_unit_bar.js` (`window.SocietyUnitBar`)
- **데이터**: VOCA_DB 용어방 + 교재·사료 DB(자료분석·지도탐방·역사사료)의 「학년」(정규화 `normalizeSocietyGrade`)·「단원」 원문. 두 DB의 단원 이름은 같아야 한다(2026-11-06 노션 정리: 「1단원 (옛사람들의 삶과 문화)」→「1. 옛사람들의 삶과 문화」, 「3단원 1장/2장」→「3-1./3-2. …」).
- **동화 연결**: `society_storybook.js`의 각 책 `units` 배열이 노션 단원 원문과 같아야 단원 칩에 걸린다. 단원을 고른 채 도서관을 열면 그 단원 동화만 보이고 「전체 서가 보기」 단추가 생긴다.
- **5분 퀘스트 카드**: 루트 `quest_runner.html?subject=society&user=…&unit=<단원 원문>`. 단원을 안 골랐으면 부모 설정 단원으로 출발.
- **검증**: `tests/society-unit-bar.test.mjs`

### 🌟 `society_storybook.js` ([1단계] 사회 단원 동화 도서관 전담 엔진)
기후 대모험(5-1), 역사 시간 여행 1~8편(5-2 선사·고조선, 삼국·남북국, 고려, 조선 외침 극복, 유교 사회, 조선 후기, 일제 식민 통치와 저항, 8·15 광복과 6·25 전쟁) 등 총 9권의 고화질 사료 동화 서가 렌더링 및 뷰어 연동을 전담하는 독립 모듈입니다.
- **파일 위치**: `kids/js/society_storybook.js`
- **핵심 API**:
  | 메서드 | 설명 |
  | :--- | :--- |
  | `SocietyStorybook.render(container, {pick}?)` | 사회 단원 동화 서가 모달 UI 렌더링 (총 9권). `pick`을 넘기면 그 학기·단원 동화만 |
  | `SocietyStorybook.getList()` | 등록된 사회 동화 9권 메타데이터 조회 |

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
교과서 사료/도표/통계 이미지 분석, 4지선다 퀴즈 렌더러, 돋보기 뷰어·교과서 QR 영상(`buildSocietyInteractiveLinkHtml`) 연동 및 정답 축하 모달을 전담하는 독립 모듈입니다.
- **파일 위치**: `kids/js/society_chart.js` (210줄)
- **핵심 API**:
  | 메서드 | 설명 |
  | :--- | :--- |
  | `SocietyChart.render(container, item, ...)` | 차트 분석 퀴즈 카드 및 돋보기 뷰포트 렌더링 |
  | `SocietyChart.verifyChoice(selectedIdx, correctIdx)` | 4지선다 객관식 채점 및 오답노트 적재 |
  | `SocietyChart.showSuccessModal(item)` | 유물 쓰임새/핵심 해설 축하 모달 팝업 |

### 🌟 `society_map.js` ([4단계] 랜선 지도 탐방실 전담 엔진)
국토 지리 명소 및 역사 지도 고화질 사진 탐방, 요정 코코 음성 해설, 교과서 QR 영상(`buildSocietyInteractiveLinkHtml`) 연동 및 한 줄 탐방기 입력을 전담하는 독립 모듈입니다.
- **파일 위치**: `kids/js/society_map.js` (108줄)
- **핵심 API**:
  | 메서드 | 설명 |
  | :--- | :--- |
  | `SocietyMap.render(container, item, ...)` | 랜선 지도 탐방 뷰 렌더링 |
  | `SocietyMap.submitJourney()` | 한 줄 탐방기 작성 검증 및 여정 기록 보상 |

### 🌟 `society_history.js` ([5단계] 역사 & 문화재 돋보기 전담 엔진)
국보·보물 역사 문화재 및 근현대 사료 듀얼 카드 탐구, 하단 국보 역사박물관 가랜드 도크 렌더링, 교과서 QR·박물관 링크(`buildSocietyInteractiveLinkHtml`) 및 유물 수집·로컬 스토리지 보존을 전담하는 독립 모듈입니다.
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
- **지문 조회 (2026-11-15)**: `kids/core/notion-api-client.js` `fetchReadingPassagesFromNotion`이 `LIBRARY_DB`를 `순번` 오름차순으로 한 쪽 100편씩 `next_cursor`로 끝까지 이어 읽는다(최대 20쪽). 전에는 50편에서 잘려 뒤 순번 지문(국어 교과서 독해 101~172)이 화면에 나오지 않았다.
- **스타일시트**: `kids/css/reading_engine.css` (지문·문제 화면) + 로비 목록은 공통 `kids/css/grouped_list.css`
- **핵심 아키텍처 & UX**:
  1. **로비 = 묶음 목록 (2026-11-16)**: 학기 탭을 없애고 대분류 트랙(🏫 교과서 → 🏥 센터 → 🌱 미니 독해) → 소분류 학기로 접고 편다. 지금 학기 묶음만 펼친다(민수는 최신 학기, 민서는 자기 학년 미니 독해를 펴고 5학년 지문은 접힌 「🔭 5학년 미리보기」). 전에는 처음 열 때 5-1 탭이 열렸다(학기 기본값 판단 오류).
  2. **한 줄 목록 + 누르면 펼침**: 「번호 · 제목 · 문항 수」 한 줄. 센터는 「순번」이 곧 회차 번호, 교과서·미니 독해는 「회차/단원」을 소제목으로. 줄을 누르면 요약과 [도전하기]가 펼쳐진다. 다녀오면 그 줄로 돌아온다. 영어방 로비 단원 칩에서 고른 단원은 맨 위 「⭐ 고른 단원」에 모으고, 지문이 없으면 "준비 중" 안내만 띄운다.
  3. **1단계 편안한 지문 정독**: Jua/Nanum 폰트 기반 가독성 + 원어민/요정 코코 TTS 음성 낭독 + `[문제 풀기 시작! ➡️]`.
  4. **2단계 1문항 집중 슬라이스 카드**: 스크롤 핑퐁 없이 1문제씩 풀고 넘기는 모바일 최적화 UX.
  5. **💡 [결정적 단서 보기 (단락 힌트)] 접이식 토글**: 스스로 생각하게 숨겼다가, 막히면 톡 눌러 해당 문맥 2~3줄만 네온 박스로 확인.
  6. **📜 [지문 전문 보기] 플로팅 바텀시트**: 문제 풀이 중 언제든 화면 하단에서 스르륵 올려보는 지문 전체 오버레이.
  7. **유연한 문항 유형 지원**: 4지선다 객관식 + 자필 주관식 대비 단답형 (초성 힌트 제공) + 정답 해설.
  8. **🛡️ 내결함성 안전망**: 노션 API 일시 점검/오프라인 시 로컬 백업 캐시(`reading_passages_cache.json`)로 자동 폴백.
- **핵심 API**:
  | 메서드 | 파라미터 | 설명 |
  | :--- | :--- | :--- |
  | `ReadingEngine.renderLobby(container, options)` | `container, {subject, highlight?}` | 트랙 → 학기 묶음 목록 로비 (`highlight` = `{grade, unit}`, 영어 로비 단원 칩) |
  | `ReadingEngine.loadPassages(subject)` | `subject` | 노션 독해 DB 과목 지문 전체(노션이 비면 로컬 예비 파일, 과목으로 거름). 토론방도 씀 |
  | `ReadingEngine.buildPassageGroups(passages, {student, highlight, actionLabel, showQuestionCount})` | | 묶음 목록 입력 만들기. 토론방도 씀 |
  | `ReadingEngine.getActivePassageId()` | - | 지금 지문 id (완료 화면 「토론하기」) |
  | `ReadingEngine.switchGrade()` / `switchTrack()` | - | 예전 호출 호환. 이제 목록만 다시 그린다 |
  | `ReadingEngine.startMission(passageId)` | `passageId` | 1단계 지문 정독 화면 진입 |
  | `ReadingEngine.startQuestions()` | - | 2단계 1문항 슬라이스 퀴즈 모드 시작 |
  | `ReadingEngine.toggleHint()` | - | 💡 결정적 단서(단락 힌트) 접이식 토글 개폐 |
  | `ReadingEngine.openBottomSheet()` / `closeBottomSheet()` | - | 📜 지문 전문 바텀시트 슬라이드업/다운 제어 |
  | `ReadingEngine.chooseAnswer(selectedIdx)` | `selectedIdx` | 객관식 채점, 에러리스 코칭 및 실시간 보상 지급 |
  | `ReadingEngine.resolveAnswerIndex(q)` | 문항 | 객관식 정답의 원래 보기 번호(0부터). `answerIndex`·숫자 `answer` → 보기 글자와 같은 `answer` → 숫자만 적힌 `answer`("2", 1부터) 순서. 「3시 30분」처럼 숫자로 시작하는 정답 글자를 보기 번호로 읽지 않는다(2026-11-16 영어 9·10단원 오채점 수정) |
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
  - **전체 캐시 재등록 옵션**: master-tower 루트의 `python scripts/register_reading_passage.py --sync-pending`은 현재 캐시 전체를 다시 등록한다. 도서 키가 노션과 같은 지문은 갱신되지만, 도서 키 없이 등록된 옛 센터 지문은 새 페이지가 생겨 중복 위험이 있다. 미등록 건을 식별하기 전에는 복구용으로 무조건 실행하지 않는다.
- **미리보기·중복 방지 (2026-11-15)**:
  - `--dry-run`: 노션·로컬 캐시에 쓰지 않고 신규/갱신 여부, 순번, 문항과 정답만 보여 준다.
  - 같은 `도서 키(ID)`(`book_id`)가 노션에 있으면 새 페이지를 만들지 않고 그 페이지의 속성을 갱신한다(페이지 본문 블록은 처음 만들 때만 쓴다).
  - 자료의 `source_type`(`자체 창작`·`교과서 재구성`·`교과서 원문`)·`source_note`를 `출처구분`·`원작 출처`에 쓴다. 적지 않으면 그 칸을 건드리지 않는다.
  - 등록 전에 문항을 검사한다(질문 비어 있음, 보기 2개 미만·중복, 정답이 보기에 없음). 걸리면 아무것도 쓰지 않고 멈춘다.
- **지문 보관 (2026-11-16)**: `--archive <도서 키>`는 그 지문 1개를 찾아 보여 주기만 하고, `--apply`를 붙이면 속성 원문·본문 블록을 `kids-school-main/scripts/data/archive/library_{도서 키}_{날짜}.json`에 남긴 뒤 노션 휴지통으로 보낸다(30일 안에 노션에서 되살릴 수 있음). 같은 도서 키가 0개·2개 이상이면 멈춘다.
  - **단원 묶음 파일**: `{공통 칸(subject·track·unit·grade·student·difficulty), "passages": [지문…]}` 형식이면 지문을 차례로 등록한다. 교과서 독해 자료는 `kids-school-main/scripts/data/reading/{과목}_{학년}_{단원}.json`에 둔다(민수 국어 5-2: `scripts/data/reading/korean_5-2_dokseo.json`·`korean_5-2_u1.json`~`korean_5-2_u6.json`·`korean_5-2_media.json`). 규격은 [국어 명세서 §5-5](../../docs/korean_spec.md).
  - 시험: master-tower `python -X utf8 scripts/test_center_reading_audio.py` (`RegistrationPreviewTests` 5건: 묶음 펴기, 미리보기 무쓰기, 신규 등록·출처 칸, 같은 도서 키 갱신, 문항 검사).

### 🎧 `center-reading-audio.js` / `build_center_reading_audio.py` (센터 고정 음성 공통 경로)
- **브라우저 모듈**: `kids/core/center-reading-audio.js`. 국어방·`quest_runner.html`에서 Fairy 앞에 로드한다. `CenterReadingAudio.play(text, {onEnd, onError})`는 일치 자산 재생/취소 시 true, 자산이 없으면 false를 반환한다. `stop()`은 재생·목록/해시 대기 요청을 함께 취소한다. `normalize(text)`·`hash(text, settings)`는 생성기 규격과 같다.
- **서버 없는 로컬 생성기**: master-tower의 `scripts/build_center_reading_audio.py`. `--all --from-notion`은 최신 센터·교과서 독해 **국어** 지문(`AUDIO_TRACKS`, 2026-11-15 교과서 추가)과 민수 국어 어휘를 읽어 누락만 생성한다. `--track center|textbook|all`(기본 all)로 트랙을 고르고, 교과서 트랙의 영어 지문과 캐시·파일의 `subject≠국어` 지문은 뺀다. `register_reading_passage.py`도 같은 상수로 센터·교과서 국어 지문 등록 직후 생성한다. `--file`·`--order`·`--book-id`는 대상 제한, `--dry-run`은 읽기 전용 계획, `--check`는 누락·변경·불량·매핑 오류 시 종료 코드 1. `full_text`·`fullText` 모두 지원한다.
- **자산**: `kids/assets/audio/center_reading/manifest.json` v2의 `settings`·`clips`·`passages`, `<SHA-256 24자리>.mp3`. 선희 `ko-KR-SunHiNeural`·속도 `+0%`·피치 `+0Hz`, 대본·설정 해시. 원문은 노션에 두고 생성 대본만 자산 목록에 기록한다. OpenAI로 대체할 수 있는 Worker 응답을 생성 원본으로 사용하지 않는다.
- **시험**: `tests/center-audio.test.mjs`(공부방 회귀 묶음), `scripts/verify_center_audio.cjs`(실제 MP3·모바일/PC·실제 러너), master-tower의 `scripts/test_center_reading_audio.py`(생성·변경·실패·등록 호출). 검증 근거는 `docs/center_audio/walkthrough.md`.

---

## 2-8. 🌱 슬기로운 하루 라이프 허브 전담 엔진군 (Haru Life Hub Engines)

전사 최고 거버넌스 헌법(규칙 7조: 골디락스 적정 응집도 300~600줄, 절대 상한 800줄 미만)에 의거하여, 기존 2,720줄의 거대했던 `haru_common.js`를 1개의 초경량 대문 파사드와 4개의 전문 서브모듈로 완전 분리 구축한 라이프 & 통합교과 엔진군입니다.

### 하루방 영역별 CSS (2026-10-31)

기존 단일 스타일 2,756줄을 원문·캐스케이드 순서를 보존하여 다음 6개로 분리했습니다. 줄 수는 새 머리 주석 1줄을 포함한 실제 줄 수입니다.

- `kids/css/haru-base.css` (431줄): 변수·공통·상단·습관·감상실.
- `kids/css/haru-special-days.css` (507줄): 특별한 날 추억 게시판.
- `kids/css/haru-checkin.css` (340줄): 30초 체크인·사진 팝업.
- `kids/css/haru-safety.css` (507줄): 119 안전 수호대·닥터 코코.
- `kids/css/haru-timeline-clock.css` (518줄): 타임머신 헤더·시계판·필터.
- `kids/css/haru-timeline-list.css` (459줄): 타임라인 목록·스티커·모달·반응형.
- **로드 계약**: `kids/subjects/haru/haru.html`의 기존 스타일 링크 자리에서 위 순서대로 `../../css/{파일명}?v=20261031-haru-split`을 직접 로드합니다. `@import`는 쓰지 않습니다. JS·공개 API는 그대로입니다.
- **회귀 시험**: `tests/haru-css-split.test.mjs`가 링크 순서·같은 버전·머리 주석·파일 크기·블록 경계·기존 파일 제거를 검사합니다(2026-11-14 고정 원본 대조 제거). 계약: `docs/haru_css_split_spec.md`.

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
- **파일 위치**: `kids/subjects/haru/js/haru-special-days.js` (567줄)
- **영상 버튼**: `videos` 배열(없으면 `videoUrl` 1개)마다 새 창 버튼. 문구 맨 앞 이모지는 `splitLeadingEmoji`로 아이콘 자리에 옮긴다(갤러리 모달과 같은 규칙).
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
    <title>도서명 - 김s 공부방</title>
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

### 📊 `scripts/study_usage_report.mjs` (실사용 리포트, 읽기 전용, 2026-11-23)
노션을 **읽기만** 해서 아이별 공부 시간·빈도, 문항기록 요약(첫 시도 정답률·힌트 비율), 막힌 문항 Top N(어휘 이름·최근 오답), 수학 유형별 정답률, 3·3·3 정착(은·금·녹슨 왕관, `공통`은 따로), 저장 칸 점유율(`학습설정`·`월드기록`·`런너기록`, 60% 이상 ⚠️)을 마크다운 한 장으로 낸다.
- **실행**: `node scripts/study_usage_report.mjs [--days 30] [--since YYYY-MM-DD] [--until YYYY-MM-DD] [--child 민수|민서] [--fast] [--save] [--top 10]` (이 PC 전체 약 23초, `--fast`는 어휘 이름·정착 생략 약 9초). `--save`는 공개 저장소 밖 관제탑 `scratch/reports/`(git 추적 밖)에 저장.
- **같은 계산 재사용**: 공부 시간은 화면 시간 보상과 같은 `study-activity.js` `measuredMinutes`, 숙련도는 `quest-mastery.js` `parseMastery`·`levelOf`·`isRusty`. 문항기록 `decodeItems`는 시험이 앱 `LearningLog.decode`와 대조.
- **구성**: 집계·노션 읽기·`main` `study_usage_report.mjs`, 마크다운 출력부 `study_usage_report_render.mjs`(800줄 상한으로 나눔). 노션 요청은 `/query`(POST)와 `GET /v1/pages`뿐.
- 명세 `docs/study_usage_report_spec.md`, 시험 `tests/study-usage-report.test.mjs`(11개, 노션 미접속).

### 🌟 `scripts/build_storybook.py` (원클릭 스토리북 빌더 & 자동 배포기)
노트북LM/Gemini 지문과 삽화 이미지를 입력받아 양면 펼침면 합성, TTS MP3, JS 데이터, HTML 뷰어 생성부터 **무결성 검증(`ai_verify`), kids-archive & kids-school 깃 푸시, 노션 타임라인 연동까지 원스톱으로 처리하는 올인원 빌더**입니다.
- **출력 위치**: 펼침면(`{id}_story_p{N}.png`)·삽화(`{id}_ill_p{N}.jpg`)는 kids-archive `assets/storybook/{과목}/{학생}/{학년}/{단원}/`(데이터 `imgBase` CDN과 같은 경로)에 저장합니다. 공부방에는 음성 `kids/assets/audio/storybook/{id}/`, 데이터 `kids/subjects/{과목}/data/story_{id}.js`, 뷰어 `{id}_storybook.html`만 씁니다.
- **배포**: `commit_named_files()`가 저장소마다 빌더가 이번에 쓴 파일만 이름으로 add·commit 한 뒤 푸시합니다(`git add .` 안 씀). 공유 폴더의 다른 변경은 섞이지 않습니다.
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
- **핵심 API** (입구가 사용): `build_plan(author, title, desc, date, files, category, icon, slug, event_id, video, video_btn, videos=None)` → `Plan`(검증만, 쓰기 없음) · `check_videos(videos)`(`--videos-json` 문자열/목록 → `[{url, text?, icon?}]`, http(s) url 없거나 JSON이 틀리면 `ValueError`로 등록 전에 멈춤) · `apply_plan(plan, school_root, archive_root, dry_run=False)` → 바뀐 파일 상대경로 `{'school': [...], 'archive': [...]}` · `print_plan(plan, changed)` · `group_queue_items(items)`(같은 작성자·날짜·메모 = 한 행사) · `queue_group_plan(group)`.
- **작성자 저장값**: `AUTHORS` = 민서·민수·공동·아빠·엄마. `normalize_author(author)`가 `AUTHOR_ALIASES`(공통·가족·온가족·온 가족·함께 → 공동)를 바꾼다. `build_plan`이 맨 먼저 부르고, 점검표도 같은 규칙을 불러 쓴다(규칙은 이 파일 한 곳).
- **데이터 형식**: `special-days-data.js`의 배열 본문은 JSON(따옴표 키)으로 유지한다. 빌더가 정규식 `const DEFAULT_SPECIAL_DAYS_DATA = ([...]);`로 읽고 `json.dumps(indent=2)`로 다시 쓴다.
- **실행 커맨드**:
  ```bash
  python -X utf8 scripts/add_activity_photo.py --dry-run --author 민서 --date 2026-10-22 --slug pet_trainer --category "학교행사/운동회" --icon "🐕" --title "🐕 제목" --desc "본문" --file "a.jpg" --sub-files "b.jpg,c.jpg" --video "https://..."
  ```

### 🌟 `scripts/verify_gallery_entry.py` (갤러리·특별한 날 등록 후 점검표, 2026-11-06)
누가 등록하든 같은 항목을 확인하는 읽기 전용 점검 도구입니다. 관제탑 입구 `sync_quick_upload.py`가 등록·푸시 뒤 등록한 id로 자동 실행하고, 단독으로도 씁니다. 상세: [`docs/gallery_archive_spec.md` §9](../../docs/gallery_archive_spec.md), 절차: 스킬 `gallery-special-day-register`.
- **점검 항목**: 데이터 1건 · 작성자 저장값 · 아카이브 마스터 같은 id·작성자 · 사진 파일 실존·폴더·EXIF·크기 · CDN 열림 · 영상 링크 열림 · 노션 카드 1장(구분·주인공·날짜·제목). 끝에 육안 확인할 사진 경로(`👀`)를 출력합니다. ❌가 하나라도 있으면 종료 코드 1.
- **옵션**: `--id`(여러 번), `--no-network`(파일·데이터만), `--no-cdn`(`--no-push` 등록), `--cdn-wait 초`(푸시 직후 10초 간격 재시도).
- **실행 커맨드**:
  ```bash
  python -X utf8 scripts/verify_gallery_entry.py --id evt_minseo_lotteworld_20261105 --id art_minseo_20261028_cat_dog_crossbag
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
  <script src="./kids/core/fairy-tts.js?v=20261116-mixvoice"></script> <!-- 말하기 속도 단추·미리듣기 -->
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

### 🌟 `gallery_controller.js` · `gallery.css` · `gallery-modal.css` (성장 아카이브 뷰어 컨트롤러)
2,600줄에 달하던 `gallery.html`을 295줄의 초경량 래퍼로 다이어트하고 분리한 단일 책임 갤러리 전용 컨트롤러 및 반응형 스타일시트입니다.
- **파일 위치**:
  - `kids/common_space/gallery_controller.js` (갤러리 렌더링/이벤트 컨트롤러, IIFE 격리)
  - `kids/common_space/gallery.css` (406줄, 변수·테마·내비·히어로·통계·필터·3D 카드)
  - `kids/common_space/gallery-modal.css` (455줄, 라이트박스·스티커·방명록·등록 모달·빈 상태·뷰 스위처. gallery.css 다음에 로드)
  - `tests/gallery-css-split.test.mjs`: 고정 원본 fixture와 재결합·600줄 제한·블록 경계·상대 경로·로드 순서·캐시 버전을 검사
- **HTML 로드 방법**:
  ```html
  <link rel="stylesheet" href="./gallery.css?v=20261031-gallery-split">
  <link rel="stylesheet" href="./gallery-modal.css?v=20261031-gallery-split">
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

### 🌟 `timetable-boost.js` & `timetable_controller.js`·`timetable_grid.js`·`timetable_notices.js` (시간표 부스트 엔진)
주간 시간표를 노션에서 프리패치하여 오늘 배울 과목과 숙제를 로비 헤더에 원터치 칩으로 띄워주는 부스트 엔진입니다.
- **파일 위치**:
  - `kids/core/timetable-boost.js` (약 200줄): 오늘·다음 등교일 교과와 보상 버프(🔥 오늘 복습 1.2배·한도 150 / ✨ 내일 예습 +7). **2026-11-23부터** 노션 고정 시간표 캐시 `MINMIN_TIMETABLE_CACHE_V11`의 `staticRows`(시간표 화면이 채움)를 학생·요일·과목 **정확히 같은 글자**로 읽고, 그 학생 행이 캐시에 하나도 없을 때만 코드 안 기본 시간표(민서는 「1학년 2학기 확정」 교과: 월·수·목 국·수, 금 수, 화 없음). 그전에는 아무도 채우지 않는 옛 키를 읽어 늘 기본 시간표로 돌았다. 약속·상상 같은 통합교과는 버린다. **2026-11-23부터 과목방(`notion-helper.js` 자동 로더)·퀘스트 러너·용어사전방에도 실린다**(그전에는 로비·용어사전방에만 실려 과목방 보상에 「오늘 복습 1.2배·한도 150」·「내일 예습 완주 +7」이 적용되지 않았음). 여러 경로로 실려도 `window.TimetableBoost`가 있으면 다시 정의하지 않는다. 과목방 10문제 완주 보너스(`mission-reward-engine.js`)도 이 값(`completionBonus`, 예습 +7·기본 +5)을 쓰며 과목은 `window.currentSubject`(괄호 없는 교과명) 우선.
  - `kids/js/timetable_controller.js` (504줄): 요일·교시·과목 색·`DEFAULT_BASE_TIMETABLE`, 공유 상태, 보기 설정·날짜·공지 판정 헬퍼, `buildGridMap`·`renderLessonCell`.
  - `kids/js/timetable_grid.js` (424줄): `renderWeeklyGrid`, 모바일 열 너비·스크롤, `renderTopNoticeBanner`, `openOverlayItemModal`·`closeOverlayModal`·`openNoticeGuideModal`·`toggleOverlayItemComplete`.
  - `kids/js/timetable_notices.js` (281줄): 공지 정렬·`renderNotices`·`renderAll`, `setChildFilter`·툴팁, `loadTimetableData`, 시계 즉시 갱신·타이머·`DOMContentLoaded` 등록.
  - `kids/css/timetable.css` (458줄): 변수·네온 칠판 테마, 로비 모니터, 주간 격자·공지판.
  - `kids/css/timetable-overlay.css` (553줄): 이벤트 띠배너·요일 뱃지·과목 인디케이터, 모달·툴팁·모바일·가로모드·데스크톱 퀵탭 숨김.
- **CSS 로드 순서**: `timetable.html`의 기존 Google Fonts 링크 다음에서 `kids/css/timetable.css` → `kids/css/timetable-overlay.css`를 상대 경로·동일 버전 `?v=20261031-timetable-css-split`으로 바로 다음 줄에 연속 로드합니다. 원문·규칙 순서를 보존하며 `@import`는 쓰지 않습니다.
- **CSS 검증**: `tests/timetable-css-split.test.mjs`가 고정 fixture 재결합·600줄 상한·독립 블록 경계·상대 경로·로드 순서·캐시 버전을 검사합니다. 분리 계약은 `docs/timetable_css_split_spec.md`입니다.
- **로드 순서 (2026-10-31 분리)**: `timetable.html`에서 기존 `kids/config.js` → `kids/core/notion-timetable.js` 뒤에 controller → grid → notices를 상대 경로·동일 버전 `?v=20261031-timetable-split`의 클래식 스크립트로 연달아 싣습니다. 원문·전역 함수·상태·DOM·통신 방식은 유지합니다.
- **검증**: `tests/timetable-split.test.mjs`가 고정 fixture 원문 재결합·본문 바이트 보존·600줄 상한·참조·부분 로드·전역 함수/상태·시계·이벤트/타이머 등록 일치를 검사합니다(모의 환경, 운영 노션 미접속). 분리 계약은 `docs/timetable_controller_split_spec.md`입니다.
- **핵심 API**:
  | 메서드 | 설명 |
  | :--- | :--- |
  | `TimetableBoost.getSubjectsForDay(childName, dayName)` | 그 요일 5대 교과 한글 배열(교시 순, 중복 없음). 등록 시간표 → 기본 시간표 (2026-11-23, 오늘의 길·버프 공용) |
  | `TimetableBoost.getTimetableSubjects(childName)` | `{ todaySubjects, tomorrowSubjects, todayName, tomorrowName, isWeekend }` (주말 `todaySubjects` 빈 배열) |
  | `TimetableBoost.getSubjectBoostInfo(subject, childName)` | 과목 버프 `{ type: review·preview·normal, limit, expMultiplier, completionBonus, badge }` |

### 🌟 `daily-diary-{base,forms,sync,submit}.js` & `quick-uploader.js` (하루 마음일기 & 모바일 퀵업로더 파이프라인 2.1)
아이들의 날씨/기분 선택형 마음일기 기록 및 스마트폰 현장 촬영 사진을 Cloudflare Worker 미디어 큐 및 노션 DB로 즉시 전송하는 고속 파이프라인 모듈입니다.
- **파일 위치**:
  - `kids/core/daily-diary-base.js` (488줄): KST 날짜·로컬 저장·삭제·음성 입력·모달·탭
  - `kids/core/daily-diary-forms.js` (456줄): 민서·민수 폼·선택 카드·AI 일상 로그·노션 전송·보상
  - `kids/core/daily-diary-sync.js` (385줄): 노션 파서·조회·캐시 정리·병합·실시간 동기화
  - `kids/core/daily-diary-submit.js` (306줄): 일기 제출·성공 모달·목록·전역 바인딩
  - 위 네 파일은 클래식 스크립트로 base → forms → sync → submit 순서로 로드합니다. `core.js`·`lobby_controller.js`와 하루방·국어방·부모 일기장에서 같은 구성을 사용하며 HTML 세 곳은 태그 네 개를 한 줄에서 공백 하나로 연결합니다. HTML 버전은 `20261031-diary-split`입니다.
  - `kids/core/quick-uploader.js` (모바일 사진 촬영 & 퀵업로더 프론트엔드)
  - 관제탑 저장소 `master-tower/workers/minmin-notion/worker.js` (공용 Worker · 미디어 수신 `/api/upload-media`, 큐 조회 `/api/pending-media`)
  - `scripts/sync_quick_upload.py` (PC 원클릭 폰 사진 다운로드 ➔ 갤러리 최적화 ➔ Git/Notion 동기화 완결)
- **파이프라인 2.1 아키텍처**:
  1. **스마트폰 촬영/선택**: 캔버스 1200px 경량 고화질(JPEG 82%) 압축 ➔ Cloudflare Worker `/api/upload-media` 단 1회 전송.
  2. **워커 자동 처리**: 노션 갤러리 DB(`3dfa2711...`) `[퀵업로드]` 임시 카드 생성 ➔ 그 카드 번호(`notionPageId`, Worker v4.5~)와 함께 큐 보관(L2 Cache API 7일 보존) (GitHub Secret 가용 시 다이렉트 커밋 지원).
  3. **PC 일괄 완결**: `python scripts/sync_quick_upload.py` 실행 시 워커 대기 큐에서 폰 사진 자동 다운로드 ➔ `build_gallery.py` ➔ 작품 임시 카드의 `식별ID`를 `art_...`로 변경 ➔ `kids-archive` & `kids-school` 깃 푸시까지 한 번에 완결. 노션까지 성공한 항목만 큐에서 지운다.
- **일기장 노션 동기화 (`daily-diary-sync.js`)**: `syncDiariesFromNotion(childName)` ➔ `fetchNotionDiaries`(구분 `마음일기`·`일기`·`종이일기`, 주인공 `{아이}`+`부모관리자`) ➔ `mergeNotionDiariesIntoLocal(remotes, childName)`. 신규 DB 전체 결과일 때는 `pruneStaleNotionEntries`가 노션에 없는 그 아이의 연동 캐시 항목을 지운다(미업로드·10분 이내 항목 보존). 상세 규칙은 `docs/timetable_diary_spec.md` DB 3. 검증: `node scripts/verify_diary_sync.js` (실제 노션 조회까지 `--live`, 다른 버전은 `--core-dir <네 파일이 있는 폴더>`).
- **분리 회귀 시험**: `tests/daily-diary-split.test.mjs`가 고정 원본 fixture·600줄 상한·참조 다섯 곳·HTML 한 줄 배치·전역 함수·앞 파일만 로드하는 경우를 검사합니다. 상세 계약은 `docs/daily_diary_split_spec.md`입니다.
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
- 동기화를 실행할 때마다 아래 **시스템 조감도**의 기준일·스킬 카드 요약과 자동 데이터(`build_system_map.py`)도 함께 갱신합니다. `--check`는 조감도 스킬 요약이 원본과 다르면 실패하고, 기준일만 다르면 안내만 합니다. 파일 목록·연결선 검사는 관제탑 `verify_contracts.py`가 맡습니다.

### 🌟 `minmin_system_map.html` + `scripts/data/system_map_*.js` (시스템 아키텍처 조감도, 2026-10-21, 자동 생성·화면 개편 2026-11-06)
입력 스크립트 → 스킬·명세 → 프론트 모듈 → 파이프라인·캐시 → 노션 DB 5단계 배선도, 증상별 디버깅 지시문, 노션 DB 규칙 사전을 보여 주는 부모·에이전트용 지도입니다. 화면은 빈 그릇이고 내용은 데이터 파일 한 벌에서 읽습니다.
- **파일 위치**: `minmin_system_map.html` (저장소 루트, 뼈대 HTML과 DB 규칙 표), `kids/js/system_map_view.js` (화면 코드, `window.SystemMapView`), `kids/css/system_map.css` (화면 스타일, Stitch 시안 색 토큰을 CSS 변수로 옮김), `scripts/data/system_map_data.js`·`system_map_nodes_life.js`·`system_map_troubles.js` (손 관리 데이터), `scripts/data/system_map_generated.js` (자동 생성), `scripts/build_system_map.py` (생성·검사 도구)
- **데이터 구조**:
  | 전역 | 관리 방식 | 내용 |
  | :--- | :--- | :--- |
  | `window.SYSTEM_MAP_DATA` | 손으로 관리 | `domains`(필터 탭), `nodes`(`id`·`col`·`domain[]`·`badge`·`title`·`path`·`summary`·`guardrails`(최대 3줄)·`agentPrompt`, 스킬 카드는 `skill` 이름), `edges`(`[from, to]`, 왼쪽 열 → 오른쪽 열만), `autoRules`(자동 생성 규칙: `pipeMarks`·`dbKeys`·`domainRules`·`edgeIgnore`) |
  | `window.SYSTEM_MAP_LIFE` | 손으로 관리 | 갤러리·시간표·가족 놀이·가디언 카드와 연결선. 형식은 위와 같습니다. |
  | `window.SYSTEM_MAP_TROUBLES` | 손으로 관리 | 증상별 `symptom`·`domain`(표시 문구)·`domainKey`(열 탭 key)·`cards`(강조할 카드 id)·`causes`·`targetFiles`·`prompt` |
  | `window.SYSTEM_MAP_GENERATED` | `build_system_map.py`가 파일 전체를 다시 씀 | `edges`(자동으로 찾은 연결선, 화면에 점선), `tray`(열별 미분류 서랍: `name`·`path`·`domain`·`docs`), `hidden`(비공개 저장소 파일 개수) |
  | `window.SYSTEM_MAP_AUTO` | `sync_agent_skills.py`가 `// <AUTO-SYNC:START>`~`END` 사이만 다시 씀 | `lastUpdated`·`catalogUpdatedAt`(본 카탈로그의 git 마지막 커밋 시각, 미커밋 수정이 있으면 파일 수정 시각), `skills`(SKILL.md frontmatter의 name·description을 150자 이내로 요약) |
- **화면 구조** (`system_map_view.js`, 바닐라 JS, 프레임워크 없음):
  - 주소 끝으로 상태를 정합니다: 없음 = 첫 화면(기능 칩·증상 카드·검색), `#flow/{탭 key|all}` = 5단계 흐름, `#trouble/{번호}` = 증상의 탭을 열고 `cards`를 노란 테두리로 강조, `#schema` = DB·캐시 규칙. 브라우저 뒤로 가기가 됩니다.
  - 카드는 종류와 제목만 보이고, 누르면 상세 패널(경로·역할·규칙·이전/다음 단계·지시문 복사)이 열립니다. 폭 1200px 미만은 아래에서 올라오는 시트, 900px 미만은 5단계를 세로 목록으로 바꾸고 연결선은 그리지 않습니다.
  - 버튼은 `data-act`·`data-arg` 속성으로 처리하고(문자열 `onclick` 없음), 데이터 글자는 모두 이스케이프해서 그립니다.
  - 필수 DOM ID: `search-input`·`hero-search`·`view-home`·`view-map`·`view-schema`·`domain-tabs`·`home-chips`·`trouble-grid`·`flow-title`·`canvas-wrapper`·`svg-canvas`·`pipeline-grid`·`col-source`~`col-db`·`inspector`·`inspector-content`·`sync-badge`·`sm-stats`
- **합치기 규칙**: 화면이 troubles → nodes_life → generated → data → `system_map_view.js` 순서로 싣고, 데이터 파일 끝의 IIFE가 나머지를 `SYSTEM_MAP_DATA`에 합칩니다. `skill` 이름이 같은 카드는 요약·경로를 덮어쓰고, 지도에 없는 새 스킬은 2열에 `Skill (신규)` 카드로 자동 추가합니다(연결선은 사람이 추가).
- **주의**: 카드 데이터 문자열에는 큰따옴표(`"`)를 넣지 않습니다(시험이 검사하는 기존 계약). 증상 `cards`의 카드는 `domainKey` 탭에 속해야 합니다(시험이 검사). 카드 `path`는 master-tower 루트 기준 경로입니다. 새 과목·모듈을 추가하면 `domains`·`nodes`·`edges`를 함께 갱신합니다.
- **`scripts/build_system_map.py`** (master-tower 안에서만 생성, 밖에서는 건너뜀):
  ```bash
  python -X utf8 scripts/build_system_map.py           # 자동 데이터 다시 쓰기 (같은 입력이면 같은 결과)
  python -X utf8 scripts/build_system_map.py --check   # 어긋남 검사, 파일은 바꾸지 않음
  python -X utf8 scripts/build_system_map.py --report  # 문서에 없는 파일 이름까지 이 PC 화면에만 출력
  python -X utf8 scripts/build_system_map.py --json    # repo_health.py용 숫자
  ```
  - **서랍 규칙**: 카드에 없고 명세·카탈로그에 적힌 스크립트·명세·모듈만 서랍에 넣습니다. 문서에 없는 파일은 화면에 올리지 않습니다.
  - **공개 규칙**: kids-school은 공개 저장소이므로 비공개 저장소(master-tower 등) 파일은 이름 없이 개수만 씁니다.
  - **연결선 규칙**: 명세가 파일을 언급하면 스크립트 → 명세 → 모듈, 코드에 `pipeMarks` 식별자가 있으면 모듈 → 파이프라인, 스크립트에 `dbKeys` 식별자가 있으면 스크립트 → DB로 잇습니다. 같은 탭을 공유하는 카드만 잇고, 실제 관계가 아니면 `edgeIgnore`에 적습니다. 파이프라인 → DB 연결선은 손으로 관리합니다.
  - **`--check` 판정**: 없는 파일을 가리키는 카드, 끊기거나 거꾸로 된 연결선, 스키마 지도에 없는 DB ID, 낡은 파일 목록, 공개 파일의 비공개 이름은 실패입니다. 연결선만 달라졌거나 설명 속 파일명을 못 찾거나 새 파일이 문서에 없으면 경고입니다. 카드 설명이 옳은지는 검사하지 못하므로 분기 대청소 때 사람이 봅니다.
  - **어디서 도나**: 관제탑 `verify_contracts.py --mode git-diff`(커밋 전), `repo_health.py`(주간 점검), `sync_agent_skills.py`(생성). 공부방만 받는 GitHub Actions에서는 `tests/system-map.test.mjs`가 공부방 파일만 검사합니다.

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



## 김s 가디언 부모 관리 연결 (2026-10-11)

- 화면 연결 부품: `kids/js/parent_dashboard_render.js`의 `renderScreenTimeWidget(childName)`과 `parent_dashboard.html`의 자녀별 가디언 링크.
- 부모 대시보드 JS 분리(2026-10-31): `kids/js/parent_dashboard.js`(547줄, 설정·상태·권한·소원권·통계·레이더 차트) → `kids/js/parent_dashboard_render.js`(575줄, `loadDashboardData`·스크린타임·하루 코칭·안전 알림 위젯·이벤트 등록). HTML에서 두 클래식 스크립트를 `?v=20261031-dash-split`로 연달아 로드합니다. 기존 전역 함수·최상위 상태·DOM·동작은 유지하며 `localDateStr`·`calcStreak`는 첫 파일에 남습니다.
- 분리 계약: `docs/parent_dashboard_split_spec.md`. `tests/parent-dashboard-split.test.mjs`가 고정 원본 재결합·600줄 제한·참조·부분 로드·전역 함수와 이벤트 등록 일치를 검사합니다.
- 전용 관리 화면: https://kids-screen-guardian.awslike6.workers.dev/parent. 프로필은 진입 메뉴이며 실제 권한은 서버의 부모 세션으로 결정합니다.
- 구현 원천: 관제탑 `kids-screen-guardian/worker/src/parent-auth.js`(일회 로그인·14일 HttpOnly 세션·동일 쿠키 연장·역할·해제), `parent-portal.js`(HTML/CSS·브라우저 소스 제공), `parent-client.js`(브라우저 JS 문자열·로그인·미확정 요청 재시도), `index.js`(정산·명령 영수증 원자 저장).
- API: `GET /api/parent/summary`, `POST /api/parent/grant`(child/minutes/requestId), `POST /api/parent/lock`(child/isLocked/requestId). 추가·잠금은 아빠 인증 필요, 엄마는 조회만 허용합니다.
- 학습은 활동 초 구간에 따라 자동 지급되며 부모 승인·10분 올림·통화 보상으로 가디언 시간을 중복 충전하지 않습니다. 기존 인벤토리 설정 PATCH와 /api/screentime 보너스 쓰기를 사용하지 않습니다.
- 부모 로그인 코드 발급·분실 기기 로그인 해제는 관제탑 `kids-screen-guardian/worker/admin.ps1`의 browser-code/browser-revoke를 사용합니다. 부모 비밀키는 공개 공부방 JS에 전달하지 않습니다.

- 로그인 연장: POST /api/parent/renew JSON {}. 아빠·엄마 모두 자신의 유효 세션으로 실행할 수 있습니다. 화면 열기/새로고침 때 잔여 7일 이하이면 자동으로 현재부터 14일 갱신, 로그인 연장 버튼으로 수동 갱신·만료일 표시. 만료/로그아웃 후 새 코드 필요. 자녀 시간·잠금·권한 변경 없음.

## 김s 가디언 Windows 작업 지시서 (예정 기능, 2026-10-11)

- 문서 원천: 관제탑 kids-screen-guardian/docs/windows/README.md, contract.md, tasks.json, tasks/W00.md~W42.md 및 H01.md~H10.md. Windows 구현은 시작 전이며 부모 웹의 PC 로그인과 별개입니다.
- 지시 출력 도구: docs/windows/make-packet.mjs. --check는53개 카드의 구조를 검사하고 ID 인자는 해당 카드와 공통 요약·직접 선행 receipt만 출력합니다. 선행 accepted·확인 커밋·검증 증거·고정 receipt가 없으면 다음 작업을 거부합니다.
- 예정 모듈: Windows Core 정산, Service 키/권한·SID, Session 감지, MV3 확장, Native Host, Admin 등록, 설치/복구. 현재 런타임 모듈이 존재하거나 검증됐다고 해석하지 않습니다.
- 기존 /api/pair·/api/screentime·/api/usage 누적 장부를 재사용하고 자정60분·학습1:1·부모 추가 출처 숨김을 유지합니다. 엄격한 다중 기기 예약은 H단계의 Worker·Android 변경까지 별도 완료해야 합니다.

## 김s 가디언 공부방 오차단 수정 (Android v2.1.1, 2026-10-11)

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

## 과목 공용 어휘 등록기 `scripts/register_voca.py` (2026-11-08)

- **목적**: 단원 자료 JSON 1개를 노션 VOCA_DB에 맞춘다. 단원마다 `insert_*_voca.py`를 새로 만들던 방식을 대체한다(관제탑 `scripts/archive/2026-11/`로 보관).
- **자료**: `scripts/data/voca/{과목}_{학년}_{단원}.json` = `{subject, grade(문자열|배열: 1년짜리 책은 ["5-1","5-2"]), student(문자열|배열), unit, test_scope?, area?, voca:[{word, meaning, detail?, pos?, type?, area?}]}`. 지금 영어 5-2 L8~L11, 국어·사회, 과학 5-2 3·4단원 보강, 보건 5(1·2·4·5단원)·도덕 5(5~8단원)·미술 5(8~13단원·톡톡), 기타 과목 규칙은 `docs/other_subjects_spec.md`. `query_all`은 만든 시각 정렬로 쪽을 넘긴다.
- **실행**: `python -X utf8 scripts/register_voca.py --file <자료> [--apply | --update]`. 기본 미리보기, `--apply` 새 행만, `--update` 기존 행의 바뀐 칸도 덮어씀.
- **계약**: 같은 행 = 과목·학년(첫 번째)·학생(첫 번째)·단원 + 단어. 새 과목 첫 등록 때 노션이 없는 선택지 필터에 400을 내면 기존 행 0개로 본다. 숙련도·달성은 쓰지 않는다(`NEVER_WRITE`). 노션에 없는 칸 이름이면 멈추고, 선택지에 없는 값은 경고한다(`check_schema`). 노션에만 있는 행은 알려 주기만 하고 지우지 않는다.
- **핵심 API**: `sync_voca(seed, apply, update) → 건수`, `desired_props(seed, item)`, `diff_props(page, props)`, `check_schema(seed)`, 통신 `call`·`query_all`·`rich`·`plain_title`(민서 국어 도구도 사용).
- **시험**: `python -X utf8 -m unittest scripts/test_register_voca.py` (가짜 통신 14건: 미리보기 무쓰기, 학년 목록, 새 선택지 400, 새 행만 만들기, --update 바뀐 칸만, 진도 칸 미기록, 중복·노션 전용 행, 자료 형식, 스키마 도감 대조). `regression.yml`에서도 돈다.

## 교재·사료 문항 등록기 `scripts/register_curriculum.py` (2026-11-13)

- **목적**: 단원 자료 JSON 1개를 노션 교재·사료 마스터 DB(CURRICULUM_DB `3e8a2711…`)에 맞춘다. 사회 2-1·2-2 때 단원마다 만들던 `register_society_5_2_*_data.py`·`update_society_curriculum_media.py`(관제탑 `scripts/archive/2026-11/`)를 대체한다.
- **자료**: `scripts/data/curriculum/{과목영문}_{학년}_{단원키}.json` = `{subject, grade, unit, items:[{title, zone, question?, choices?, answer?, explanation?, usage?, media_url?, interactive_url?}]}`. `question·choices·answer`는 셋 다 쓰거나 셋 다 비운다(보기 2~4개·줄바꿈 금지, 정답은 1부터 센 번호). 셋을 빈 값(`"", [], null`)으로 적으면 노션 질문·보기·정답 칸을 비우고, 셋 다 빼면 건드리지 않는다.
- **실행**: `python -X utf8 scripts/register_curriculum.py --file <자료> [--apply | --update]`. 기본 미리보기, `--apply` 새 행만, `--update` 기존 행의 바뀐 칸도 덮어씀.
- **계약**: 같은 행 = 과목·학년·단원 + 제목. 자료에 적은 칸만 쓴다(`media_url`을 빼면 퀵체인지로 바꾼 사진을 건드리지 않고, `""`이면 공란으로 맞춤). 칸 형식은 화면 읽기(`society_common.js` `fetchCurriculumFromNotion`, `science_lab.js`)와 같다: `보기 1~4` = 줄바꿈으로 이은 글, `정답` = 1~4. 노션에 없는 칸이면 멈추고, 선택지에 없는 값·사회방이 안 읽는 구역(역사사료·지도탐방·자료분석 외)은 경고한다. 사회 구역별 행이 100개를 넘으면 경고한다(사회방 화면이 100행까지만 읽음). 노션에만 있는 행은 알려 주기만 한다.
- **핵심 API**: `sync_curriculum(seed, apply, update) → 건수`, `desired_props(seed, item)`, `diff_props(page, props)`, `check_schema(seed)`, `check_screen_limit(seed, new_by_zone)`. 통신·칸 비교는 `register_voca.py`(`call`·`query_all`·`rich`·`plain_title`·`value_of`)를 불러 쓴다.
- **시험**: `python -X utf8 -m unittest scripts/test_register_curriculum.py` (가짜 통신 12건: 미리보기 무쓰기, 조회 키, 새 행만 만들기와 화면 형식, --update 바뀐 칸만, 사진 공란·미기재 구분, 중복·노션 전용 행, 자료 형식 11종, 문제 없는 행, 스키마 도감 대조, 화면 밖 구역, 100행 경고, 저장소 자료 JSON). `regression.yml`에서도 돈다.

## 회귀 시험 묶음 `tests/` (2026-10-27)

- **객관식 보기 섞기 (2026-11-14)**: `tests/quiz-choices.test.mjs`(11개)·`tests/quiz-choices-guard.test.mjs`(2개, 새 객관식 화면이 `QuizChoices`를 빠뜨리면 실패). 위 「`window.QuizChoices`」 절.
- **갤러리 3D 전시관 (2026-11-16)**: `tests/gallery-3d-hall.test.mjs`(34개, 계산 모듈 + 엔진·장면 정적 규칙 + `gallery.html` 로드 순서). 이 파일까지 전체 790개.
- **수학 5-2 4·5·6단원 탐험관 (2026-11-14)**: `tests/math-explorer-units.test.mjs`(16개). 위 「수학 단원 탐험관 공용 틀」·「5-2 4·5·6단원 탐험관」 절. 이 파일까지 60개 파일·731개(이 PC 약 10초).

- **영어방 문제 번호 공유 (2026-11-16)**: `tests/english-stage4-advance.test.mjs`(4개). 위 「`english_common.js`」 절. 이 파일까지 전체 745개.
- **독해 객관식 채점 (2026-11-16)**: `tests/reading-answer-index.test.mjs`(3개, 등록 자료 `scripts/data/reading/*.json` 객관식 정답이 보기 글자와 같고 그 보기로 채점되는지 포함). 위 「`reading_engine.js`」 절. 이 파일까지 전체 748개.
- **AI 대화 기억 저장 (2026-11-16)**: `tests/chat-memory.test.mjs`(6개). 위 「`chat-memory.js`」. `voca-common-split`의 이벤트 기대값에서 옛 `beforeunload` 저장을 뺐다. 이 파일까지 전체 754개.
- **가족 우체통 (2026-11-16)**: `tests/family-mail.test.mjs`(13개)·`tests/family-mail-page.test.mjs`(7개). 위 「📮 가족 우체통」 절.
- **단원 영상 부품 (2026-11-16)**: `tests/video-unit.test.mjs`(15개). 위 「🎬 `video-unit.js`」 절.
- **문항 단위 학습 기록 (2026-11-21, 2차 2026-11-22, 4차 2026-11-23)**: `tests/learning-log.test.mjs`(21개, 합치기·조각·대기열·보내기·재전송 중복 없음·칸 없음·해석 실패), `tests/learning-log-math.test.mjs`(10개, CPA 덧셈·뺄셈·시계·규칙·100까지 수·입체도형 퀴즈/공방·힌트/넘기기/두 바퀴째/지연 로드/실제 `keyFor`), `tests/quest-lesson.test.mjs` 레슨→`LearningLog` 연결 1개, `tests/notion-reward-split.test.mjs` 공용 로더가 세 모듈(측정·학습일지·문항기록)을 순서대로 싣는지.
- **어휘 캐시 한 벌 공유 (2026-11-19)**: `tests/voca-all-cache.test.mjs`(4개). ALL 캐시를 아이별로 거르기(학생 칸 빈 행 제외), 캐시 없으면 노션 1회, 미리 불러오기가 ALL을 받는지.
- **노션 여러 쪽 조회 정렬 (2026-11-17)**: `tests/notion-stable-sort.test.mjs`(2개). `notion-api-client.js`의 `page_size` 조회 본문마다 `sorts: STABLE_SORTS`가 있는지 본다.
- **2026 원신초 학예발표회 안내 (2026-11-20)**: `festival.html` · `kids/data/festival_2026_data.js` · `kids/css/festival.css` · `kids/js/festival_controller.js` (`window.FestivalGuide`). `timetable.html` 상단 `#festivalGuideBtn`에서 진입하며, 민서(1·6·11·13)·민수(5·12)·10번 확인 필요 중심 1단계 요약 + 사이 무대/학교 원문 `<details>` 2단계 펼침 + 현장 진행 체크(`minmin_festival_2026_done_v1`). 시험 `tests/festival-guide.test.mjs`(3개).
- **캐시 버전 표시 자동화 (2026-11-24)**: `scripts/stamp_versions.mjs`가 저장소 맨 위·`kids/`의 `*.html`·`*.js`에 있는 `파일명.js|css?v=값` 자리를 그 파일 내용 해시 8자리(BOM·줄바꿈 차이만 제외, **안에 적힌 `?v=` 값은 포함**)로 맞추고, 값이 더 안 바뀔 때까지 반복해 하위 모듈 → 로더 → 화면 버전이 줄줄이 갱신된다(서로를 가리키는 고리는 실패). 로더 배열 모양 `'파일명.js', '?v=값'`(notion-reward.js)도 찍는다. 가리키는 파일은 적힌 경로(대소문자 정확히, 없으면 「못 찾음」) → 경로 없는 이름은 같은 폴더 → 저장소에 하나뿐인 이름 순으로 찾고, http·// 주소는 건드리지 않는다. `tests/version-stamps.test.mjs`(4개)가 낡은 자리·못 찾는 자리를 막는다. `notion-helper.js` 자동 로더와 `config.js` `loadCoreScripts`의 중복 검사는 쿼리를 뺀 「이 폴더의 그 파일」 주소로 보고, `loadCoreScripts`는 버전이 이미 붙은 이름에는 시각 버전을 더 붙이지 않는다(2026-11-24). 「묶음은 같은 버전」 규칙(`split-rules.mjs` `assertLoadsInOrder` 등)은 「모두 버전 있음」으로 바뀌었고, 버전 값을 고정하던 시험은 `stampOfFile(경로)`로 기대값을 만든다(보상 엔진 승인 변경 목록 `version` 포함).
- **오늘의 길 (2026-11-23)**: `tests/today-path-v2.test.mjs`(22개: 체류·보너스·방학·설정 저장 바탕 읽기·focus·시간표 하루 한 번), `tests/today-path.test.mjs`(16개: KST 자정·금→월·주말, 비교과 필터, 민서 사회·과학 제외, 1·2·4번 중복 회피 전수, 3번 대체 순서·늦은 어휘 캐시, 숙련도 3함수 `quest-mastery.js` 대조, 노선 고정·보정, 완료 장부 `tp`·부모, 연결 지점, 학습일지 조회 정렬·실패·리포트 행 나누기 대조, `getSubjectsForDay`, 싣기 버전).
- **학습설정 저장 나눔 (2026-11-23)**: `tests/learning-settings-chunk.test.mjs`(6개: 1,900자 경계·이모지 서로게이트 쌍·100조각 상한·쓰는 곳 4곳 통합·한 조각 고정 배열 금지 및 `fairy-settings-catalog.js` 선행 로드 순서 지키기).

- **정리 (2026-11-14)**: 59개 파일·702개(통과 700·건너뜀 2·실패 0), 12코어 PC 로컬 약 10초(이전 716개·약 29초).
  - **분리 시험 규칙**: `tests/*split*.test.mjs` 17개와 `lobby-tailwind-config`는 더 이상 얼린 원본(`tests/fixtures/*`)과 원문·마크업·실행 결과를 통째 대조하지 않습니다(정상 수정마다 fixture도 고쳐야 했음). 공용 도우미 `tests/split-rules.mjs`로 원본 없이 지킬 규칙만 봅니다: 파일 실존·상대 경로, 600/800줄 상한, 인라인 style·script 금지, CSS 독립 블록·`@import` 없음, 태그가 지정 순서로 한 번씩 연속·같은 `?v=`(값 자체는 자유, `assertLoadsInOrder`), HTML `on*` 속성이 부르는 함수 선언 여부(`assertInlineHandlersDeclared`, 화면이 싣는 스크립트·인라인 script·`kids/core` 기준), 공개 전역 함수 목록 유지(`assertPublicApi`, 추가 자유·이름 변경/삭제만 실패), 앞 N개 파일만 실어도 부수 효과 없음, 이벤트·타이머 등록 순서. 로비 동작 시험은 분리본 단독 + 명시 기댓값으로 남았습니다.
  - **fixture**: 남은 것은 `tests/fixtures/reward-grant-shared/` 하나(보상 공용화 전 원문 3벌, `reward-grant-shared.test.mjs`·`reward-grant-sandbox.mjs`가 "변경 전과 같다" 비교에 사용). 새 분리 작업도 원본을 얼려 두지 말고 위 규칙 도우미를 씁니다.
  - **연산 스튜디오 범위 시험**: 1~999 × 1~999 쌍은 로컬 기본이 결정적 표본(약 23만 쌍, `tests/operator-range.mjs`)이고, 표본이 전수와 같은 구조 클래스(자릿수·자리별 올림/받아내림·결과 자릿수, 덧셈 40종·뺄셈 43종)를 모두 덮는지 시험이 먼저 확인합니다. `KIDS_TEST_FULL=1`이면 약 100만 쌍 전수이며 `regression.yml`이 이 값으로 매 푸시 전수를 돕니다.
  - **알려진 한계 시험**: `study-log-store.property`의 두 기기 동시 저장은 예전 `todo`라 매 실행 "✖ failing tests" 아래 `actual: 2, expected: 1` 스택이 찍혀(요약은 fail 0) 간헐 실패로 오인됐습니다. 지금은 "같은 키 페이지 1~2건 허용, 합계 무손실"을 명시 단언하므로 이 출력이 나오면 진짜 실패입니다.
  - **느린 시험 정리**: 미니 런 전수 시험의 2단 점프 탐색 루프 순서를 바꿔 25초→약 3초(탐색 공간 동일), 몬스터 리액션 1.7초 대기 2번은 `node:test` 가짜 타이머로 바꿨습니다.

- `tests/monster-reactions.test.mjs`: 파트너별 리액션 포즈, 그림 1장·포즈 누락 대체, 표시 1개 유지와 끝처리 취소, 격려 표시의 빨간색 금지·동작 감소 규칙, 그림 실패 대체, 완주 창 아이콘 복귀, 기존 채점·음성 호출 보존을 검사합니다. 실제 표시는 화면에서 확인합니다.
- `tests/gallery-character-runner.test.mjs`: DOM 없는 로드, 장착·재로드·포즈·해제·남매 분리·잘못된 저장·주소·최고 기록, 결정적 월드·입력 없는 60초 완주·충돌/무적·별·2단 점프·dt 상한·민서 장애물과 실제 데이터 CDN 계약을 검사합니다. Python/Pillow로 임시 공부방·아카이브를 만들고 빌더의 투명 PNG·크롭·512px·오류 격리·단독 카드 제외·포트폴리오 미포함·EXIF도 확인합니다. `GALLERY_TEST_PYTHON`으로 시험 Python 경로를 지정할 수 있습니다.
- 미니 런 보완 시험은 세로 .45~가로 2.2의 6비율·그림 3비율·3시드·민수 가속 전후 162개 월드의 장애물 4,248개를 실제 `step`으로 전수 통과 검사합니다. 민수 2단 필수 장애물·판정 상자 기준 반응 시간·가속 이동량·리사이즈 거리/상태 보존·조사 4쌍도 확인합니다. 세로 .55는 기존 무입력 완주 시험에도 포함합니다.
- `.github/workflows/regression.yml`은 빌더 시험을 위해 Python 3.14·Pillow 12.3.0을 준비합니다. checkout/setup-node/setup-python은 Node 20 폐기 경고를 피하는 v7을 사용합니다. CI에서 Pillow 준비 누락으로 발생한 첫 실패를 보완했으며 시험을 건너뛰지 않습니다.
- **커밋 메시지 검사 (2026-11-08)**: `regression.yml` 마지막 단계가 `scripts/check_commit_msg.py --range`로 푸시·PR 범위의 `Agent:`·`교정:`·`반려:` 줄 형식을 검사합니다(규칙 시행 시각 이후 커밋만, 범위 계산에 checkout `fetch-depth: 0`). `scripts/check_commit_msg.py`와 `scripts/agent_commit_rules.json`은 **관제탑 원본의 사본**이라 직접 고치지 않습니다. 관제탑 `python scripts/sync_agent_skills.py`가 맞추고 `--check`로 일치를 검사합니다. 규칙 설명은 관제탑 `docs/AGENT_COMMIT_PROTOCOL.md`.
- **scripts 허용 목록 (2026-11-08)**: `regression.yml` 마지막 단계 `scripts/check_scripts_allowlist.py --all`이 `scripts/allowed_scripts.txt`에 없는 `scripts/*.py`·맨 위 `*.py`를 실패로 처리합니다. 새 공용 도구는 목록 `[도구]`에 목적과 함께 한 줄 추가합니다. 검사기는 관제탑 원본의 사본입니다 (관제탑 `docs/AGENT_COMMIT_PROTOCOL.md` §8).

- `tests/gallery-data-contract.test.mjs`: 갤러리·특별한 날 데이터 규칙. 특별한 날 작성자(민서·민수·공동·아빠·엄마, 온 가족=공동)·id·날짜·분류 6종·사진 폴더·영상 주소, 작품 작성자·id·날짜, 로컬 `../kids-archive`가 있으면 아카이브 마스터 작성자와 특별한 날 짝을 검사합니다(CI에서는 그 시험만 건너뜀).
- `tests/special-day-video-buttons.test.mjs`: 갤러리 모달의 창 안 영상 칸은 영상 파일 주소일 때만 만들고(구글 포토 공유 주소 제외), 버튼 문구 맨 앞 이모지가 아이콘과 두 번 붙지 않는지(갤러리·하루방 `splitLeadingEmoji`, 실제 데이터 전체) 검사합니다.
- `tests/gallery-spot-diff.test.mjs`: DOM 없는 모듈 로딩, contain 영역·레터박스·네 모서리 좌표, 짧은 변 반지름·22px 터치 보완·중복/겹침 판정, 입력 검증과 생성 갤러리의 CDN 계약을 검사합니다.
- `tests/dictation-ladder.test.mjs`: 받아쓰기 사다리의 단계 건너뛰기·이어 하기·쉬운 방식 전환, 철자 함정, 채점 구분, 숙련도 전송·실패 재전송·병합, 학생 분리, 스크립트 순서, 보상 오디오 호출을 검사합니다. 실제 표시는 화면에서 확인합니다.
- `tests/operator-studio-division.test.mjs`: 연산 스튜디오 나눗셈의 1~999 ÷ 1~99 전 범위에서 풀이 단계(몫·곱·뺄셈·내려쓰기·나머지)를 다시 계산해 대조하고, 수직선 점프·눈금, 0으로 나누기·범위 초과 입력을 검사합니다. 실제 표시는 화면에서 확인합니다.
- `tests/operator-studio-plans.test.mjs`: 덧셈·뺄셈 1~999 두 수(로컬 표본·`KIDS_TEST_FULL=1` 전수, 표본의 구조 클래스 전수 포함 검사), 곱셈 1~999 × 1~99 전 범위에서 단계별 칠판(올림·칸 위 값·부분곱·진행 중 결과 칸)을 독립 계산과 대조하고, 경계 사례와 추천 문제 이름을 검사합니다.
- `tests/operator-studio-views.test.mjs`: 가짜 DOM에서 네 연산의 모든 탭을 끝까지 눌러 만들어진 HTML을 검사합니다(잘못된 글자, 수직선 축과 점프 수, 블록 그림 변화, 앞 수가 작은 뺄셈 안내). 블록 값 보존(덧셈·뺄셈은 `operator-range.mjs` 표본·전수)과 면적 칸의 합은 전 범위로, 네 연산 모든 탭의 숫자 뒤 조사는 대표 문제로 검사합니다. 레이아웃은 검사하지 않습니다.
- `tests/system-map.test.mjs`: 시스템 조감도 데이터·화면 파일 로드 순서와 Tailwind CDN 미사용, 증상 카드의 탭·카드 id 연결, 카드 id·탭·큰따옴표 계약, 연결선 방향, 공부방 카드·서랍 경로 실존, 공개 파일의 비공개 이름 금지, 생성 파일의 시각 없음·정렬을 검사합니다.
- `tests/coco-avatar.test.mjs`: 요정 코코 아바타 `kids/assets/images/coco_fairy.webp` 한 벌만 쓰는지 확인합니다. 사라진 외부 주소가 남지 않고, 각 페이지의 상대 경로가 실제 파일을 가리키는지 검사합니다. 그림은 민서 수학 동화 삽화(`kids-archive/assets/storybook/math/minseo/1-2/1/math_100_ill_p4.jpg`)의 코코를 원형으로 자른 192×192 이미지입니다. 그림을 바꿀 때는 이 파일만 교체합니다.

- **실행**: 저장소 루트에서 `node --test "tests/**/*.test.mjs"` (12코어 PC 로컬 약 10초, 가장 느린 파일은 `operator-studio-plans` 약 8초). 노션 운영 DB에는 접속하지 않습니다(모의 fetch). `main` 푸시·PR마다 GitHub Actions(`.github/workflows/regression.yml`, Node 24)가 `KIDS_TEST_FULL=1`(연산 스튜디오 전수)로 같은 명령을 돌립니다.
- **로컬 CI `scripts/ci_local.py` (2026-11-21)**: 원격 시험과 같은 단계(node 회귀 시험 → 파이썬 등록기 시험 `PY_UNITTESTS` → scripts 허용 목록)를 한 명령으로 돌립니다. `python -X utf8 scripts/ci_local.py` (이 PC 동시 4개 약 13초, `--concurrency 1`이면 약 42초, `-v`는 출력 전부). 관제탑 `.githooks/pre-push`가 이 파일이 있는 저장소에서 푸시 전에 자동 실행하고 실패하면 푸시를 막습니다(지우기만 하는 푸시는 건너뜀, 작업 폴더에 커밋 안 한 변경이 있으면 경고). 원격과 다른 점: 연산 스튜디오는 로컬 표본, 커밋 메시지는 commit-msg 훅 몫. node는 `CI_LOCAL_NODE` → PATH → 기본 설치 위치(`Program Files\nodejs`·nvm은 숫자 버전 높은 순) 순으로 찾고, 끝내 없으면 찾아본 곳과 해결법을 보여 주고 종료 코드 3(안티그래비티 앱처럼 PATH가 다른 환경 대비). 훅 실행 기록은 관제탑 `scratch/hook-log/pre_push_log.tsv`(git 추적 밖, 관제탑 `docs/AGENT_COMMIT_PROTOCOL.md` §6·§6-1). `scripts/test_ci_local.py`(7개)가 `regression.yml`의 unittest 목록·node 글롭·허용 목록 단계와 같은지 대조하므로, 원격에 단계를 더하면 `ci_local.py`도 고쳐야 통과합니다. 도입 이유: 2026-11-17~20 main 19연속 빨간불의 첫 원인(`078e5ed`)이 로컬에서 돌리지 않던 파이썬 등록기 시험이었습니다(훅으로 재현해 막히는 것 확인).
- `tests/regression.test.mjs`: 단독 시험 6개를 하위 프로세스로 돌려 종료 코드 0인지 확인합니다. `verify_quest_mastery.js`(3·3·3 엔진), `test_quest_fallback.js`, `test_study_logger_upsert.js`, `verify_study_log_store.js`, `verify_kst_dates.js`, `verify_diary_sync.js`. 새 단독 시험을 만들면 실패 시 `process.exitCode = 1`로 끝나게 하고 이 목록에 한 줄 추가합니다.
- `tests/fairy-voice-persona.test.mjs`: 캐릭터 목소리가 목록대로 나오는지(정답·오답·완주·인사, 비반복), 다른 아이 전용·준비중·목록 미로딩이면 요정 코코로 돌아가는지, 목록에 항목만 추가한 새 목소리가 엔진 수정 없이 재생되는지, 목록의 음성 파일이 모두 있는지 확인합니다.
- `tests/fairy-tts.test.mjs`: 엔진·설정창을 싣는 모든 화면·로더가 `fairy-tts.js`를 먼저 싣는지, 두 파일의 최상위 이름이 겹치지 않고 공개 함수가 모두 있는지, 대기열(중간 실패 건너뛰기·끝 콜백 1번·미리 받기 3개·정지 시 해제), 수식 읽기, 말하기 속도·예전 영어 저장값 읽기, 기기 OpenAI 키 삭제를 확인합니다.
- `tests/notion-contract.test.mjs`: 앱이 노션에 보내는 요청 본문의 속성 이름·타입이 `docs/notion_schemas_school.md` 표와 같은지 확인합니다. VOCA_DB `숙련도`(`count|silverDate|lastReviewed` 형식·왕복)·`달성`, 관리자 모드 쓰기 생략, STUDY_LOG_DB 학습일지(`ID`=`{학생}_{YYYY-MM-DD}_{과목}`, `오답리포트`). 노션 속성을 바꾸면 스키마 도감(`sync_notion_schemas.py`)과 코드를 함께 고쳐야 통과합니다. 도감을 다시 만들어도 손으로 적은 비고는 유지되고, 노션에 아직 없는 예정 속성은 표 밖 ⚠️ 목록에 남아 이 시험이 실제 속성으로 세지 않습니다.
- `tests/quest-mastery.property.test.mjs`: 독립 브라우저 샌드박스에서 시드별 30~50개 동작으로 Q1~Q6 숙련도·병합·10분 보호·noCredit·판 구성과 await 중 채점/실패 후 push 배출을 검사하는 무작위 순서 시험입니다(각 흐름 기본 100회). 재현: `QUEST_PROP_SEED=<시드> node --test tests/quest-mastery.property.test.mjs`, 횟수: `QUEST_PROP_RUNS`. 외부 변경 병합(Q3)과 마지막 성공 push 대비 dirty 유실(Q5)은 별도 흐름으로 검사합니다.
- `tests/media-archive-paths.test.mjs`: `gallery-data.js`·`gallery-meta.json`·`special-days-data.js`·`haru_data.js` 안의 모든 kids-archive 주소를 모아 작품은 activities 밖·작가와 같은 아이 폴더, 특별한 날·하루방은 `{아이}/activities/`, 작품·특별한 날 같은 파일 중복 등록 금지를 검사합니다. 로컬에 `../kids-archive`가 있으면 파일 실존도 확인하고, CI에서는 그 항목만 건너뜁니다.
- `tests/haru-special-days.test.mjs`: 하루방이 `special-days-data.js`를 상대 경로로 먼저 싣고 `haru_data.js`에 `defaultEvents`가 없는지, 민서 방에 민수 개인 행사가 없고 민수 방에 민서 개인 행사가 없으며 공동·부모 행사는 둘 다 보이는지, 예시 3건(`evt_children` 등)이 사라졌는지, 예전 localStorage 이야기·제목 수정·갤러리 메타가 살아 있는지 검사합니다. 아직 실제 데이터에 없는 작성자(민수 개인·아빠) 행사는 시험 안에서만 덧붙입니다.
- `tests/study-log-store.property.test.mjs`: 모의 fetch의 응답 지연·실패·중복·날짜 경계로 S1~S7 스트릭·캐시·순차/동시 upsert를 검사하는 무작위 순서 시험입니다(규칙별 기본 100회). 재현: `STUDYLOG_PROP_SEED=<시드> node --test tests/study-log-store.property.test.mjs`, 횟수: `STUDYLOG_PROP_RUNS`. S4 오답 보존·S5 한 탭/두 탭 직렬화·S6 선택 A·S7 Worker isolate 캐시 우회와 ID 수명주기를 검사하고, 두 기기 동시 저장 한계는 "페이지 1~2건 허용·합계 무손실"로 명시 단언합니다(2026-11-14, 예전 todo의 실패 스택 출력 오인 해소). 공용 `tests/browser-sandbox.mjs`의 `loadBrowserScripts(files, { userName, fetch, storage })`는 운영 DB 접속 없이 기본 모의 fetch와 시드별 저장소를 제공합니다.
- 시험이 실제로 고장을 잡는지 확인함: 숙련도 속성명 오타, 오답리포트 속성명 변경, 금메달 기준 변경, 숙련도 구분자 변경을 일부러 넣었을 때 모두 실패.
- **화면 검증 서버 (노션 쓰기 차단)**: `python scripts/guarded_preview_server.py [포트=8767]`. 모든 HTML `<head>` 맨 앞에 쓰기 차단 스크립트를 넣어 내보내므로 페이지가 실리기 전부터 노션 페이지·블록 쓰기와 업로드가 막힌다(읽기·DB 조회·음성은 통과, 막힌 요청은 `window.__blockedWrites`). 2026-10-28 차단을 늦게 걸어 민수 「학습설정」이 덮어써진 사고 뒤 도입. 화면 검증은 `python -m http.server` 대신 이 서버로 한다.
- **자동 맞춤 시험(묶음 밖)**: `python -X utf8 scripts/verify_spot_diff_align.py`. 결정적 합성 표본으로 맞춤·선택 합성·마스크 밖 원본 바이트·워터마크 복원·품질 거부·이동 경고·결정성·CLI·의존성 누락을 검사합니다. OpenCV가 없으면 「건너뜀: opencv-python-headless 미설치」와 종료 코드 0. 임시 그림은 uploads 안에서 만들고 정리하며 Node/Actions 묶음에는 넣지 않습니다.
- **화면 시험(묶음 밖)**: `verify_math_phase1.cjs`·`verify_math_phase2.cjs`는 브라우저를 띄워 느리고(약 20초) 실행 때마다 `docs/math-phase*.png`를 다시 씁니다. playwright는 `scripts/load_playwright.cjs`가 ① 설치본 ② `PLAYWRIGHT_MODULE` ③ 이 PC의 Codex 런타임 사본 순으로 찾고, 없으면 건너뜁니다(종료 코드 0). 실행 후 바뀐 스크린샷은 커밋할 때만 남기고 아니면 `git checkout -- docs`로 되돌립니다.

## 갤러리 다중 캐릭터 (2026-10-30)
- `monster_roster.js`: `charactersOf(item)`가 최대 6개 목록을 정규화합니다. 배열 우선, 단일 character는 main 호환입니다. 파트너 JSON에 charKey를 저장하고 옛 값은 main으로 읽습니다. 장착 판정은 artId+charKey입니다.
- `gallery-mini-runner.js`: `bindModal`의 공유 선택 줄과 `start(item,{character,viewer,onClose})`로 선택 캐릭터를 사용합니다. 게임 물리는 그대로입니다.
- `build_gallery.py`: `character_entries`·`validate_character_key`·`build_characters`. 출력 characters만 생성하고 오류는 항목별 제외합니다. 예약 sprite PNG를 일반 카드에서 제외합니다.
- 관제탑 등록: --character-key로 대상 지정, --character-remove로 메타에서 삭제합니다. 마지막 삭제는 characters 키를 제거하며 PNG는 보존합니다. 상세 계약은 docs/gallery_multi_character_spec.md를 따릅니다.
- `tests/gallery-multi-character.test.mjs`: 목록·옛 저장값·실제 모달 교체·빌더 오류 격리. 기존 캐릭터 시험의 저장·출력·CDN 계약도 갱신했습니다.
