---
name: quest-engine-spec
description: 5분 퀘스트(quest_runner.html) 듀오링고형 3·3·3 마스터리 엔진, 동적 스테이지 분할, 당일 은메달 및 익일 금메달 승급 규칙, 에러리스 4대 UI, 노션 VOCA_DB 숙련도 연동 작업 시 호출.
---

# 🎯 5분 퀘스트 3·3·3 마스터리 엔진 & 러너 명세서 (quest-engine-spec)

5분 퀘스트(`quest_runner.html`)의 듀오링고형 3·3·3 반복 학습 엔진, 4종 에러리스 인터랙티브 UI, 노션 VOCA_DB 기반 멀티 기기 숙련도 동기화 및 파일 모듈화 규격을 정의한다.

## When to Use
- 5분 퀘스트(`quest_runner.html`)의 출제 로직, 슬롯 배정, 난이도 조절, UI 렌더링을 수정하거나 점검할 때
- 영어, 국어, 사회, 과학 단원의 노션 VOCA_DB 어휘/문장 데이터를 5분 퀘스트와 연동할 때
- 가디언 앱 및 윈도우 제어기와 연동되는 퀘스트 완주 보상(`INVENTORY_DB`, `STUDY_LOG_DB`, `StudyActivity`) 흐름을 다룰 때
- 과목별 특수 문제(사회/과학 사진 사료, 수학 연산, 국어 독해 등)를 5분 퀘스트 슬롯에 확장 이식할 때

---

## 1. 골디락스 모듈화 파일 구조 (Architecture)

5분 퀘스트는 단일 파일 비대화를 막기 위해 `kids/subjects/quest/` 산하 모듈과 코어 노션 헬퍼로 역할을 엄격히 분리한다.

- **`quest_runner.html` (약 590줄)**: 퀘스트 실행 진입점 및 레이아웃 마크업 Shell.
- **`kids/subjects/quest/quest-runner.js` (약 560줄)**: 퀘스트 부트스트랩(`QuestRunner.boot`), 라운드 진행 제어, 보상(`INVENTORY_DB`), 학습일지(`STUDY_LOG_DB`), 가디언 계측(`StudyActivity.recordCorrect`) 연동 컨트롤러.
- **`kids/subjects/quest/quest-runner-ui.js` (약 270줄)**: 클리어 모달, 나가기 모달, 클래식 모드 UI 보조 함수.
- **`kids/subjects/quest/quest-mastery.js` (약 580줄, `window.QuestMastery`)**: DOM 조작 없는 순수 상태 관리 및 출제 엔진. 동적 스테이지 분할, 3·3·3 레벨 판정, 슬롯 배정, 로컬스토리지 및 노션 동기화 담당.
- **`kids/subjects/quest/quest-ui-renderer.js` (약 350줄, `window.QuestUIRenderer`)**: 4대 에러리스 UI(`choice_audio`, `match_3x3`, `fill_blank`, `scramble`) 및 상단 광물 진척도 바(`renderProgressHeader`) 렌더링 전담.
- **`kids/core/notion-voca.js` (약 500줄)**: VOCA_DB 파싱(`mastery`, `examScope` 포함), 단원 최신 조회(`fetchVocaUnitFresh`), 숙련도 및 달성 체크박스 비동기 업데이트(`updateVocaMasteryProgress`) 제공.

---

## 2. 3·3·3 마스터리 & 동적 스테이지 핵심 규칙

### 1) 동적 스테이지 분할 (Dynamic Stage Chunking)
- 단원별 항목 수(20~55개 이상)와 단어/문장 비율이 유동적이므로 스테이지 수를 고정하지 않는다.
- `Math.max(1, Math.round(n / 10))` 공식으로 1개 스테이지당 약 8~12개 항목이 들어가도록 스테이지를 자동 생성한다.
- 시험범위(`examScope === true`)가 체크된 항목을 앞쪽 스테이지에 우선 배정하고, 각 스테이지에 단어와 문장이 고르게 섞이도록 비례 배분한다.

### 2) 3·3·3 계단식 난이도 & [당일 은메달 ➔ 익일 금메달] 규칙
각 항목(`id`)은 첫 시도 정답 누적 횟수(`count`: 0~9)를 추적한다:

- **Lv.1 (count 0~2, 입문)**: 눈과 귀 트기 (`hintPolicy: 'always'`)
- **Lv.2 (count 3~5 ➔ count 6 도달 시 은메달)**: 형태 및 맥락 익히기 (`hintPolicy: 'on_error'`)
- **Lv.3 (count 6~8 ➔ count 9 도달 시 금메달 마스터)**: 완전 인출 조립 (`hintPolicy: 'minimal'`)
- **당일 상한선 규칙**: `count === 6`(은메달) 도달 시 로컬 날짜(`YYYY-MM-DD`)를 `silverDate`에 기록한다. 오늘 날짜가 `silverDate`와 같으면 당일에는 더 이상 카운트가 오르지 않으며(Lv.3 잠금), 현재 스테이지 항목들이 모두 `count >= 6`이 되면 즉시 다음 스테이지를 자동 해금한다.
- **익일 최종 승급 규칙**: 오늘 날짜가 `silverDate`보다 미래(다음 날 이상)일 때만 Lv.3(`count 6~8` 구간) 출제가 해금된다. `count === 9` 도달 시 금메달 마스터로 졸업하며 노션 VOCA_DB의 `달성` 체크박스를 `true`로 갱신한다.
- **당일 올-실버 폴백**: 단원 내 모든 항목이 오늘치 은메달 상한선에 도달하면 `isTodayAllSilver: true` 상태로 전체 항목을 Lv.2 복습 모드로 순환 출제한다.

### 3) 1판(5문제) 슬롯 배치 & 쿼터제
- **1~2번 슬롯**: 현재 활성 스테이지의 단어/용어 (Lv.1일 때 2번 슬롯은 단어 3개를 묶은 `match_3x3` 짝맞추기 우선 배정).
- **3번 슬롯**: 현재 활성 스테이지의 문장/숙어 (문장이 없는 단원이나 스테이지면 단어로 자동 대체).
- **4번 슬롯 (망각곡선 녹슨 왕관 복습석)**: 금메달 달성 후 `lastReviewed`로부터 2일 이상 지난 항목을 1순위로 소환(`level: 3`, `isRustyReview: true`). 없으면 이전 스테이지 은메달 항목, 그것도 없으면 현재 스테이지 항목 출제.
- **5번 슬롯**: 현재 출제 가능한 가장 높은 레벨의 승급 도전 항목.
- **피로도 방어 쿼터제**: 한 판(5문제) 내 `level === 3`(`scramble`) 문제는 최대 2개까지만 배치한다.

---

## 3. 에러리스(Errorless) 4대 UI 규격

오답 시 경고음, 하트 차감, 빨간 X 표시를 일체 배제한다 (`fairyEncourage` 격려 음성만 유지).
첫 시도에 맞혔을 때만 `isFirstTrySuccess: true`(`count + 1`), 오답 후 맞히면 `count`를 유지한다. 단, 4번 슬롯 녹슨 왕관 복습 문제를 틀리면 `count: 5`(은메달 직전)로 강등하고 `달성: false`로 되돌린다.

1. **`choice_audio`**: Lv.1은 음성(0.85x) + 원문 + 힌트 노출 후 뜻 3지선다. Lv.2는 소리만 듣고(또는 뜻풀이만 보고) 고르기.
2. **`match_3x3`**: 좌측 3칸(단어)과 우측 3칸(뜻풀이) 터치 매칭 소거 방식.
3. **`fill_blank`**: 단어 가운데 1~2글자 빈칸 블록 채우기 또는 예문/문장 내 핵심 어절 빈칸 채우기.
4. **`scramble`**: 단어는 알파벳/음절 단위로, 문장은 작업 기억 과부하 방지를 위해 **최대 4~5조각의 의미 단위 청크(Chunk)**로 자동 묶어 순서대로 터치 조립. 오답 블록 터치 시 슬롯에 넣지 않고 실제 눌러야 할 정답 블록에 노란 테두리와 흔들림(shake) 힌트를 즉시 제공한다 (`There is a ...` 등 줄임표 포함 숙어는 뜻 보고 표현 고르기로 자동 우회).

---

## 4. 멀티 기기 동기화 (Notion VOCA_DB 연동)

- **저장 포맷**: 노션 VOCA_DB(`375a27115b688038b686d3994ee12919`)의 `숙련도` 텍스트 속성에 `"count|silverDate|lastReviewed"` (예: `"6|2026-10-15|2026-10-15"`) 형식으로 저장한다.
- **병합 규칙 (Pull)**: 아직 노션에 전송되지 않은 로컬 대기열(Pending) 진도와 최근 10분 이내에 전송한 로컬 진도는 높은 값을 보호(Worker 엣지 캐시 지연 방어)하고, 그 외에는 노션 원격 값을 기준으로 삼아 다른 기기에서의 녹슨 왕관 강등 결과가 정상 반영되도록 한다.
- **비동기 전송 (Push)**: 5문제 완주 시점에 상태가 변경된 단어 페이지(최대 5개)만 백그라운드로 PATCH하며, 네트워크 실패 시 localStorage 대기열에 보관 후 다음 판에 재전송한다.

---

## 5. Gotchas & 주의사항

- **가디언 계측 (`StudyActivity.recordCorrect`)**: 실제 사용자의 물리적 터치/클릭(`event.isTrusted === true`)만 정답 카운트로 인정되므로, 자동화 테스트 시 유의한다.
- **교과 학기 분리**: 과학 등 동일 번호 단원(예: 5-1 3-1 용해와 용액 vs 5-2 3. 온도와 열)이 섞이지 않도록 학년(5-2) 필터 및 단원 키 매칭을 엄격히 유지한다.
- **비어휘 단원 폴백**: 수학 무한 암산 엔진이나 노션 VOCA_DB에 데이터가 없는 단원(민서 파닉스 정적 뱅크 등), 또는 URL에 `?engine=classic`이 붙은 경우 기존 4+1 클래식 러너로 안전하게 분기한다.
