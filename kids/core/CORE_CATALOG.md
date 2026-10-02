# 🧩 민민이네 공부방 공통 부품 & 코어 모듈 카탈로그 (Core Catalog)

> **규칙**: 신규 기능 개발 또는 화면 수정 시 본 카탈로그에 등록된 공통 엔진을 우선적으로 임포트하여 사용해야 합니다. 동일한 기능을 위해 개별 페이지 내부에 수백 줄의 자바스크립트나 파이썬 코드를 중복 작성하지 마십시오.

---

## 1. 🎙️ 오디오 & 음성 합성 (Audio & Interaction)

### 🌟 `fairy-engine.js` & `fairy-config.js`
요정 코코의 한국어 안내, 원어민 영어 발음, 학습 보상 효과음을 담당하는 통합 오디오 코어입니다.
- **파일 위치**:
  - `kids/core/fairy-config.js` (오디오 프리셋 맵 및 설정)
  - `kids/core/fairy-engine.js` (통합 오디오 엔진)
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
  | `fairyPraise()` | 정답/칭찬 효과음 | 경쾌한 팡파레 사운드 및 칭찬 음성 출력 |
  | `fairyReward()` | 보상 획득 | 보석💎/사탕🍬 획득 시 찰랑거리는 효과음 출력 |
  | `fairyEncourage()` | 오답/격려 효과음 | 부드러운 격려 멘트와 효과음 출력 |

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
  - `kids/core/quiz-feedback-overlay.js`: 오답 다시풀기/다음문제 오버레이 및 이탈 방지 가드 (`ensureQuizWrongChoiceOverlay`, `window.__quizLeaveGuard`).
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
L7, L8, L11 등 단원별 일러스트 동화 서가 도감 렌더링 및 뷰어 연결을 전담하는 독립 모듈입니다.
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
기후 대모험(5-1), 역사 시간 여행 1~3편(5-2) 등 4권의 고화질 사료 동화 서가 렌더링 및 뷰어 연동을 전담하는 독립 모듈입니다.
- **파일 위치**: `kids/js/society_storybook.js` (171줄)
- **핵심 API**:
  | 메서드 | 설명 |
  | :--- | :--- |
  | `SocietyStorybook.render(container)` | 사회 단원 동화 서가 모달 UI 렌더링 |
  | `SocietyStorybook.getList()` | 등록된 사회 동화 4권 메타데이터 조회 |

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

### 🌟 `scripts/build_storybook.py` (원클릭 스토리북 빌더)
노트북LM 지문과 삽화 이미지를 입력받아 양면 펼침면 합성, TTS MP3, JS 데이터, HTML 뷰어까지 한 번에 생성하는 올인원 빌더입니다.
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
    --img-dir "삽화폴더경로"
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


