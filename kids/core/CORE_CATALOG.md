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

### 🌟 `notion-helper.js` (공통 파사드)
Cloudflare Worker 캐시를 통해 노션 데이터베이스와 안전하게 통신하는 통합 라이브러리입니다.
- **파일 위치**: `kids/core/notion-helper.js`
- **도메인별 분리 모듈**:
  - `kids/core/notion-voca.js`: VOCA_DB(용어사전, 초성퀴즈, 4지선다) 연동
  - `kids/core/notion-timetable.js`: 주간/일일 시간표 및 과목 메타 연동
  - `kids/core/notion-reward.js`: 보석/사탕 재화 차감 및 적재
- **핵심 API**:
  | 메서드 | 파라미터 | 설명 |
  | :--- | :--- | :--- |
  | `fetchNotionTimetable()` | - | 주간 시간표 전체 목록 조회 (로컬 캐시 우선) |
  | `fetchNotionVocabulary(subject, grade)` | `subject, grade` | 과목/학년별 핵심 어휘 목록 조회 |
  | `fetchNotionQuizItems(options)` | `options` | 5분 퀘스트용 단원별 4지선다 문항 동적 로드 |
  | `saveStudyLog(data)` | `{subject, duration, score}` | 당일 학습 시간 및 오답 큐 적재 |

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
- **테마 색상 팔레트**:
  - 국어: `#ec4899` (핑크)
  - 수학: `#f59e0b` (오렌지/옐로우)
  - 영어: `#3b82f6` (블루)
  - 과학: `#10b981` (에메랄드/그린)
  - 사회: `#d97706` (앤틱 앰버)
  - 하루/생활: `#2ed573` (민트/새싹)
- **공통 컴포넌트 클래스**:
  - `.card`, `.btn-primary`, `.badge`, `.modal-backdrop`, `.webtoon-dialogue`

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

