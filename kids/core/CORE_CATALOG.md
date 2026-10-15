# 🧩 민민이네 공부방 공통 부품 & 코어 모듈 카탈로그 (Core Catalog)

> **규칙**: 신규 기능 개발 또는 화면 수정 시 본 카탈로그에 등록된 공통 엔진을 우선적으로 임포트하여 사용해야 합니다. 동일한 기능을 위해 개별 페이지 내부에 수백 줄의 자바스크립트나 파이썬 코드를 중복 작성하지 마십시오.

---

## 1. 🎙️ 오디오 & 음성 합성 (Audio & Interaction)

### 🌟 `fairy-engine.js` & `fairy-config.js`
요정 코코의 한국어 안내, 원어민 영어 발음, 학습 보상 효과음 및 **Gemini 3.8 Flash TTS 기반 캐릭터 페르소나(민수 깐죽이 / 민서 깍쟁이)** 음성을 전담하는 통합 오디오 코어입니다.
- **파일 위치**:
  - `kids/core/fairy-config.js` (오디오 프리셋 맵 및 설정)
  - `kids/core/fairy-engine.js` (통합 오디오 엔진, 페르소나 비반복 셔플러 및 완주 가드 탑재)
- **HTML 로드 방법**:
  ```html
  <script src="../core/fairy-config.js"></script>
  <script src="../core/fairy-engine.js"></script>
  ```
- **핵심 API**:
  | 메서드 | 용도 | 설명 |
  | :--- | :--- | :--- |
  | `speakFairyTTS(text, options)` | 한국어 안내/퀴즈 | Cloudflare Worker 스트리밍 ➔ Edge-TTS(`SunHiNeural`) 직결 |
  | `speakEnglish(text, options)` | 영어 원어민 발음 | Jenny Neural 0.85x 감속 배속 재생 + 한글 발음 디딤돌 |
  | `fairyPraise(onEndCallback)` | 정답/칭찬 효과음 | 페르소나 활성화 시 Gemini 3.8 Flash TTS 5종 대사 비반복 무작위 셔플 재생 |
  | `fairyEncourage(onEndCallback)` | 오답/격려 효과음 | 페르소나 활성화 시 Gemini 3.8 Flash TTS 4종 대사 비반복 무작위 셔플 재생 |
  | `fairyReward(type, onEndCallback)` | 완주/보상 획득 | 직전 정답 음성을 즉시 안전 중단(`stopFairyTTS`) 후 완주 축하 음성 100% 보장 재생 |

---

## 2. 🗄️ 노션 연동 & 캐싱 (Notion API & Data Sync)

### 🌟 `notion-helper.js` (순수 노션 파사드 & 자동 로더)
Cloudflare Worker 캐시를 통해 노션 데이터베이스와 안전하게 통신하는 통합 라이브러리이자 하위 호환성 파사드(Facade)입니다. 골디락스 헌법(300~600줄)에 따라 전문 서브모듈을 분리하고 자동 결합 로더를 탑재했습니다.
- **파일 위치**: `kids/core/notion-helper.js` (~240줄)
- **단일 책임 분리 서브모듈 (6대 골디락스 전문 모듈)**:
  - `kids/core/notion-cache-manager.js` (253줄): LocalStorage 1일 캐시, 프리패칭(`prefetchVocaData`, `prefetchReadingData`), 전사 통합 노션 동기화(`syncAllNotionData`), 토스트 알림 전담.
  - `kids/core/notion-api-client.js` (471줄): Cloudflare Worker 프록시 통신, VOCA/독해/도서관/시간표 쿼리, 노션 블록 파서, 지수 백오프 재시도 및 Rate Limit 방어.
  - `kids/core/notion-study-logger.js` (471줄): `STUDY_LOG_DB` 학습일지 기록(중복 방어막), 오답 큐 적재, `INVENTORY_DB` 보상/레벨업 엔진, 부모 관리자 모드 격리, 상대 경로 로비 복귀.
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
  | `sendStudyLogToNotion(data)` | `notion-study-logger` | 당일 학습 시간 및 오답 큐 적재 (STUDY_LOG_DB) |
  | `grantReward(earned, subject, exp)` | `notion-study-logger` | 보석/하리보 지급 및 통합 레벨업 연산 (INVENTORY_DB) |
  | `promptQuizRetryOrSkip(opts)` | `quiz-feedback-overlay` | 오답 시 다시풀기/정답뜻풀이/보카사전 딥링크 통합 모달 출력 |
  | `getVocaCommonUrl(subject, word)` | `quiz-feedback-overlay` | 실행 위치 무관 100% 정확한 보카방(voca.html) 상대 경로 URL 생성 |

---

## 2-0. 🏰 대형 로비 통합 컨트롤러 (Lobby Controller & Architecture)

### 🌟 `lobby_controller.js` & `lobby.css` (대형 로비 전담 제어 엔진)
기존 1,381줄의 거대했던 `lobby.html`을 119줄의 초경량 순수 시맨틱 마크업으로 다이어트하고, 로비 데이터 및 비즈니스 로직을 완벽히 분리한 완성형 제어 엔진입니다.
- **파일 위치**:
  - `kids/js/lobby_controller.js` (463줄): 유저 테마 데이터(`USER_CONFIGS`), 코어 로더, 부모 시뮬레이터 모드 분기, 요정 코코 반응형 말풍선 배너 & TTS, 2대 탭 및 월드 카드 렌더러, 인벤토리/스크린타임 동기화.
  - `kids/css/lobby.css` (444줄): 민수 아케이드(arcade) vs 민서 비밀 아지트(hideout) 2대 반응형 테마, 히어로 바, 5분 퀘스트 배너, 모바일 그리드 스타일.
- **핵심 API**:
  | 함수 / 프로퍼티 | 설명 |
  | :--- | :--- |
  | `window.USER_CONFIGS` | 민수/민서 전 교과 월드 맵 및 테마 속성 SSOT 데이터 |
  | `switchLobbyTab(tab)` | 'study'(공부방 월드) ↔ 'hideout'(나만의 아지트) 2대 메인 탭 전환 |
  | `toggleFutureWorlds()` | 민서 3학년 미래 교과 보관소(사회·과학 미리보기) 아코디언 토글 |
  | `switchAdminLobbyChild(child)` | 부모 관리자 모드 전용 자녀 공부방 실시간 퀵 스위처 |
  | `handleFairyBubbleClick()` | 요정 코코 추천 액션(하루 체크인, 폰시간 정산, 도서관) 즉시 라우팅 |
  | `speakBubbleMessage(event)` | 시간대/요일별 요정 코코 응원 메시지 실시간 음성 발화 |

---

## 2-0-1. 🎨 꿈나무 갤러리 & 성장 아카이브 코어 (Gallery & Growth Archive Engines)

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
  | `syncFromNotionGallery()` | `gallery-data-sync` | 노션 GALLERY_DB에서 최신 제목/분야/한마디 백그라운드 동기화 |
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

---

### 🌟 `quest-mastery.js` (3·3·3 듀오링고형 마스터리 엔진, 약 580줄)
VOCA_DB 어휘 단원(영어·국어·사회·과학)의 5분 퀘스트 두뇌. DOM 조작 없이 동적 스테이지 분할·숙련도 계산·슬롯 배치·노션 동기화를 담당합니다. 수학·사료 퀴즈·민서 정적 뱅크·노션에 없는 단원(3개 미만)은 기존 `quest_engine.js` 4+1로 자동 폴백합니다. `?engine=classic`으로 강제 폴백.
- **파일 위치**: `kids/subjects/quest/quest-mastery.js` (전역 `window.QuestMastery`)
- **규칙**: count 0~2 Lv.1 / 3~5 Lv.2 / 6 🥈(당일 `silverDate`, 그날은 승급 잠금) / 다음 날부터 6~8 Lv.3 / 9 👑(노션 `달성` true). 녹슨 왕관(금메달 후 2일+) 오답 시 count 5·`달성` false.
- **스테이지**: `max(1, round(n/10))`개, `시험범위` 체크 항목을 앞 스테이지에 우선 배치, 단어·문장 비례 배분. 숙련도는 노션 페이지 `id` 기준이라 스테이지 재편 시에도 유실 없음.
- **동기화**: 단원 로드 시 `fetchVocaUnitFresh` Pull → 미전송·10분 내 전송분만 Max-Merge 보호, 그 외 원격 기준. 5문제 완주 시 변경분만 `updateVocaMasteryProgress` 비동기 PATCH, 실패분은 다음 판 재전송.
- **핵심 API**:
  | 메서드 | 설명 |
  | :--- | :--- |
  | `loadUnit({child, subj, unit})` | 당일 캐시 + 노션 최신 Pull 병합, 단원 항목 반환 (3개 미만이면 null) |
  | `buildRound({child, items, subj, today?, rng?})` | 1판 5문제 + `meta {activeStage, totalStages, isTodayAllSilver}` |
  | `applyResult(child, question, [{id, firstTry}])` | 첫 시도 정답만 +1, 당일 은메달 잠금·녹슨 왕관 강등 반영 |
  | `pushChanges(child)` | 변경 단어만 노션 '숙련도'/'달성' PATCH (Non-blocking) |
  | `getProgressSummary(child, items)` | 🪨 돌 / 🟫 구리 / 🥈 은 / 💎 다이아 개수 |
- **검증**: `scripts/verify_quest_mastery.html` (브라우저) 또는 `node scripts/verify_quest_mastery.js`

### 🌟 `quest-ui-renderer.js` (4대 에러리스 인터랙션 렌더러, 약 350줄)
- **파일 위치**: `kids/subjects/quest/quest-ui-renderer.js` (전역 `window.QuestUIRenderer`)
- `render(container, question, {theme, speak, onPraise, onEncourage, onDone})`: `choice_audio`(Lv.1 원문+힌트 / Lv.2 영어는 🔊만, 국·사·과는 뜻→용어), `match_3x3`(터치 매칭 소거), `fill_blank`(철자 블록 / 예문·문장 빈칸 3지선다), `scramble`(알파벳·음절 / 문장 최대 5청크).
- 오답 시 빨간 X·경고음·하트 없음. 틀린 블록은 슬롯에 넣지 않고 정답 블록에 노란 테두리 + `shake`.
- `renderProgressHeader(container, summary, meta, theme)`: 상단 광물 진척도 바.

### 🌟 `quest_runner.html` 러너 모듈 분리 (2026-10-15, 1,474줄 → HTML 592줄 + 2개 IIFE)
골디락스 절대 상한(800줄 미만)에 맞춰 인라인 스크립트를 동작 변경 없이 분리했습니다. HTML에는 마크업·테마 CSS와 `window.addEventListener('DOMContentLoaded', QuestRunner.boot)` 연결부만 남습니다. 로드 순서: `quest_engine.js` → `quest-mastery.js` → `quest-ui-renderer.js` → 문제 은행 → **`quest-runner-ui.js` → `quest-runner.js`**.
- **`quest-runner-ui.js`** (약 270줄, 전역 `window.QuestRunnerUI`): Web Audio 효과음 `playSound(tap|correct|wrong|fanfare)`, `applyChildTheme`, 과목 심화관 버튼 라벨 `applyDeepTrainingLabels`·경로 `deepTrainingUrl`, `setMathMemoVisible`, 모달 `showModal/hideModal` + 민서 스킨(`skinRevengeModalForMinseo`·`skinClearModalForMinseo`·`skinExitModalForMinseo`), 수학 손글씨 메모장, 사진 확대 라이트박스.
- **`quest-runner.js`** (약 570줄, 전역 `window.QuestRunner = { boot }`): URL 파싱·`getSubjectQuest` 바인딩, 가디언 학습 상태 표시, 3·3·3 마스터리 연결부(`bootQuest`·`renderMasteryQuestion`·`handleMasteryDone`), 기존 4+1 렌더링·채점·하트·리벤지, `showClearModal`(`QuestMastery.pushChanges` → `grantRewardAndShowUI(3, true)` → `sendStudyLogToNotion`), `StudyActivity.setPhase/recordCorrect` 연동.
- **HTML onclick 호환 전역**: `handleCheckAnswer`, `goToNextStep`, `playQuestionAudio`, `selectChoice`, `startRevengeRound`, `skipRevengeAndClear`, `confirmExit`, `closeExitModal`, `returnToLab`, `goToSubjectDeepTraining`(별칭 `goToMathDeepTraining`), `goToLobby`, `playSound`, `toggleMathMemoPad`, `clearMathMemoCanvas`, `openImageZoom`, `closeImageZoom`.

---

## 2-3. 📖 국어 멀티버스 전담 엔진군 (Korean Multiverse Engines)

전사 최고 거버넌스 헌법(규칙 7조: 골디락스 적정 응집도 300~600줄, 절대 상한 800줄 미만)에 의거하여, 기존 1,807줄의 비대했던 `korean_common.js`를 1개의 초경량 대문 파사드와 4개의 전문 서브모듈로 완전 분리 구축한 엔진군입니다.

### 🌟 `korean_common.js` (국어 멀티버스 대문 파사드)
오버레이 팝업, 학년/단원 동적 필터, 퀴즈 공통 진행/채점 브리지, 보상 디스패처를 총괄하는 초경량 라우팅 파사드입니다.
- **파일 위치**: `kids/js/korean_common.js` (약 480줄)
- **핵심 API**:
  | 메서드 | 설명 |
  | :--- | :--- |
  | `initializeKoreanRoom()` | 자녀 프로필 동기화, 테마 설정, 0.01초 어휘/독해 백그라운드 선캐싱 |
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
오버레이 팝업 라우팅, 단원 탭 필터링, 프로필 초기화, 미션 오버레이 라우팅, 퀴즈 공통 진행 브리지, 보상 디스패처를 총괄하는 초경량 라우팅 파사드입니다.
- **파일 위치**: `kids/js/science_common.js` (454줄)
- **핵심 API**:
  | 메서드 | 설명 |
  | :--- | :--- |
  | `initializeScienceRoom()` | 자녀 프로필 동기화, 마스터 카운트 로드, 교재 DB 백그라운드 프리페치 |
  | `openMissionView(type)` | 5대 미션 오버레이 열기 및 라우팅 (`storybook`, `safety`, `voca`, `lab`, `report`) |
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
교과서 0~3단원 과학 동화 1~5권 메타데이터(`SCIENCE_STORYBOOK_LIBRARY`) 관리 및 모달 도서관 서가 렌더링을 전담하는 독립 모듈입니다.
- **파일 위치**: `kids/js/science_storybook.js` (182줄)
- **핵심 API**:
  | 메서드 | 설명 |
  | :--- | :--- |
  | `ScienceStorybook.renderLibrary(container)` | 과학 단원 동화 1~5권 서가 모달 UI 렌더링 |

### 🌟 `science_voca.js` ([2단계] 과학 핵심 용어방 전담 엔진)
2단계(학년/학기 ➔ 단원) 동적 선택 UI, 단원 직결 오픈(`openScienceVocaDirect`), 초성 힌트 퀴즈 렌더러 및 정답 판정을 전담하는 독립 모듈입니다.
- **파일 위치**: `kids/js/science_voca.js` (334줄)
- **핵심 API**:
  | 메서드 | 설명 |
  | :--- | :--- |
  | `ScienceVoca.renderGradeUI(grades, container)` | 1단계 학년/학기 선택 화면 렌더링 |
  | `ScienceVoca.renderUnitUI(units, container, records, grade)` | 2단계 단원 선택 화면 렌더링 (단어 수 배지 포함) |
  | `ScienceVoca.openDirect(targetGrade, targetUnit)` | 특정 단원 어휘방으로 직결 진입 헬퍼 |
  | `ScienceVoca.renderVocaQuiz(container, item, ...)` | 용어 초성 퀴즈 카드 렌더링 |
  | `ScienceVoca.verifyAnswer()` | 입력된 용어 정답 판정 및 자동 진행 트리거 |

### 🌟 `science_lab.js` ([3단계] 가상 실험실 & 교재 DB 실시간 연동 엔진)
노션 교재·사료 마스터 DB(`CURRICULUM_DB`) 실시간 쿼리 및 캐싱, 실험 퀴즈 UI 렌더러, 4지선다 정답 판정을 전담하는 독립 모듈입니다.
- **파일 위치**: `kids/js/science_lab.js` (293줄)
- **핵심 API**:
  | 메서드 | 설명 |
  | :--- | :--- |
  | `ScienceLab.fetchCurriculum()` | 노션 교재 DB에서 과학 실험실/탐구보고서 데이터 실시간 쿼리 및 캐싱 |
  | `ScienceLab.applyNotionData(items)` | 노션 데이터를 안전 라이선스 및 보고서 전역 데이터셋에 주입 |
  | `ScienceLab.renderExperimentUI(container, item, ...)` | 실험 분석 퀴즈 및 돋보기 뷰포트 렌더링 |
  | `ScienceLab.verifyChoice(choiceIdx, correctIdx)` | 실험 객관식 퀴즈 정답 검증 및 오답노트 적재 |

### 🌟 `science_report.js` ([4단계] 『실험관찰』 디지털 탐구 보고서 & 퀴즈 전담 엔진)
1단원(혼합물) 및 2단원(날씨) 교과서 『실험관찰』 요약 노트(읽기/복습)와 5종 실전 퀴즈(빈칸, 객관식, 순서, 자기평가), 완주 보상(+5💎)을 전담하는 독립 모듈입니다.
- **파일 위치**: `kids/js/science_report.js` (450줄)
- **핵심 API**:
  | 메서드 | 설명 |
  | :--- | :--- |
  | `ScienceReport.open(unitId)` | 1단원 또는 2단원 탐구 보고서 모달 열기 |
  | `ScienceReport.renderUI(container, tabName, unitId)` | 보고서 메인 화면 렌더링 (요약 노트 ↔ 실전 퀴즈 탭) |
  | `ScienceReport.selectBlankWord(word)` | 빈칸 퀴즈 단어 카드 순차 조립 |
  | `ScienceReport.checkBlankAnswer(qIdx)` | 빈칸 조립 정답 검증 및 힌트 피드백 |
  | `ScienceReport.submitChoiceQuiz(qIdx, selectedIdx)` | 객관식 문항 판정 |
  | `ScienceReport.finishAllQuiz()` | 5종 퀴즈 완주 보너스(+5💎) 지급 및 축하 화면 렌더링 |

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
기후 대모험(5-1), 역사 시간 여행 1~5편(5-2 선사·고조선, 삼국·남북국, 고려, 조선 외침 극복, 유교 사회) 등 총 6권의 고화질 사료 동화 서가 렌더링 및 뷰어 연동을 전담하는 독립 모듈입니다.
- **파일 위치**: `kids/js/society_storybook.js` (~200줄)
- **핵심 API**:
  | 메서드 | 설명 |
  | :--- | :--- |
  | `SocietyStorybook.render(container)` | 사회 단원 동화 서가 모달 UI 렌더링 (총 6권) |
  | `SocietyStorybook.getList()` | 등록된 사회 동화 6권 메타데이터 조회 |

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
- **파일 위치**: `scripts/register_reading_passage.py`
- **핵심 기능**:
  - **독해 마스터 DB 적재**: 2,000자 초과 지문/JSON을 1,900자 청크로 자동 분할하여 노션 `rich_text` 제한 완전 방어.
  - **VOCA DB 자동 분리 적재 (One-Source Multi-Use)**: 지문 속 속담, 사자성어, 개념어를 발라내어 노션 용어사전 DB(`375a2711...`)에 동시 등록 (익일 5분 퀘스트 국어 파트 및 용어방에 자동 복습 큐 형성).
  - **🛡️ 2계층 오프라인 보존 큐**: 노션 API 일시 점검(500) 시에도 `kids/data/reading_passages_cache.json`에 영구 보존하여 데이터 유실 원천 차단.
  - **원클릭 일괄 동기화**: `python scripts/register_reading_passage.py --sync-pending`으로 노션 복구 시 큐에 쌓인 지문 즉시 클라우드 반영.

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
- **파일 위치**: `kids/subjects/haru/js/haru-special-days.js` (473줄)
- **핵심 API**:
  | 메서드 | 설명 |
  | :--- | :--- |
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
아이들의 신규 그림, 상장, 사진을 영구 보존용 `kids-archive` 레포지토리로 전송하고 공부방 갤러리 메타데이터를 일괄 동기화합니다.
- **실행 커맨드**:
  ```bash
  python scripts/build_gallery.py
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
  <script src="./kids/core/fairy-settings-catalog.js"></script>
  <script src="./kids/core/fairy-settings-engine.js"></script>
  ```
- **핵심 API**:
  | 메서드 | 설명 |
  | :--- | :--- |
  | `SettingsManager.openModal()` | 설정 모달 열기 및 학생 맞춤형 동적 렌더링 |
  | `SettingsManager.closeModal()` | 설정 모달 닫기 및 오디오 미리듣기 정리 |
  | `SettingsManager.get(key)` | 단일 설정값 조회 (`voice_persona`, `sfx_enabled`, `theme_skin` 등) |
  | `SettingsManager.set(key, val)` | 단일 설정값 저장 (`MINMIN_APP_SETTINGS` 로컬스토리지 싱크) |
  | `SettingsManager.playPreview(id, btn)` | 해당 목소리 페르소나의 대표 음성 0.05초 즉각 미리듣기 |

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

### 🌟 `daily-diary.js` & `quick-uploader.js` (하루 마음일기 & 모바일 퀵업로더)
아이들의 날씨/기분 선택형 마음일기 기록 및 스마트폰 현장 촬영 사진을 노션 임시 보관함으로 전송하는 경량 모듈입니다.
- **파일 위치**:
  - `kids/core/daily-diary.js` (하루 마음일기 모달 & 감정 스티커)
  - `kids/core/quick-uploader.js` (모바일 사진 촬영 & 퀵업로더 프론트엔드)
- **핵심 API**:
  | 메서드 | 설명 |
  | :--- | :--- |
  | `DailyDiary.openDiaryModal(user)` | 마음일기 작성 모달 열기 (기분/날씨/한줄일기) |
  | `QuickUploader.uploadPhoto(file, child, memo)` | Cloudflare Worker를 통해 노션 성장 DB로 1초 만에 즉시 전송 |

---

## 10. 🧭 에이전트 내비게이션 & 개발 도구 (Agent Navigation & Dev Tools)

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

### 🌟 `scripts/sync_quick_upload.py` (모바일 퀵업로드 & 미디어 갤러리 원클릭 파이프라인)
모바일 퀵업로드 감지 또는 로컬 신규 사진을 최적화하여 `kids-archive` CDN 배포, `gallery-data.js` 갱신, 양쪽 깃허브 푸시, 노션 연동까지 15~30초 만에 일괄 완결하는 올인원 파이프라인입니다.
- **파일 위치**: `scripts/sync_quick_upload.py` (관제탑 루트)
- **실행 커맨드**:
  ```bash
  python scripts/sync_quick_upload.py            # 신규 미디어 자동 감지 & 원클릭 일괄 배포
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
