# 🦉 5분 퀘스트 「3단계 레슨 · 민서 한입 레슨 · 학습일지 보완」 작업 명세서 (Quest Lesson Spec)

> **문서 버전**: v1.1 (2026-10-29 작성, 2026-10-30 민서 보상 A안 확정 반영)
> **상태**: 격리 브랜치 구현·자동 검증 완료, 실제 화면 검증 대기. 운영 노션 쓰기·main 병합/푸시·배포는 수행하지 않음.
> **상위 규칙**: `kids-school-main/GEMINI.md`(§4 5분 퀘스트, §6 오디오, §8 클린 코드·계약), `g:/master-tower/GEMINI.md`
> **연계 문서**: `.agent/skills/quest-engine-spec/SKILL.md`(3·3·3 규칙·함정), `kids/core/CORE_CATALOG.md` §2-2, [`docs/gallery_character_runner_spec.md`](gallery_character_runner_spec.md)(파트너 캐릭터 장착 — 이미 구현됨), `docs/notion_schemas_school.md`
> **작업자 참고**: 코드를 쓰기 전에 `AGENTS.md` 순서대로 `GEMINI.md`, `CORE_CATALOG.md`, `quest-engine-spec` 스킬을 읽는다.

---

## 0. 실행 계획부터 보고하고 승인 대기

- 코드를 고치기 전에 이 문서의 §3 범위·§5 규칙을 어떻게 나눠 구현할지 ASDST 계획으로 보고하고, 사용자 승인 뒤에 시작한다.
- 작업은 worktree(`G:/master-tower/scratch/worktrees/` 아래, 브랜치 `codex/quest-lesson`)에서 한다. main 병합·푸시는 사용자 지시가 있을 때만 한다.
- 변경 파일은 관제탑 `scripts/verify_contracts.py --mode file --file <절대 경로>`로 하나씩 검사한다(worktree에서는 `--mode git-diff`를 쓰지 않는다).
- **노션 쓰기 금지**: 화면 시험은 `scripts/guarded_preview_server.py`(쓰기 차단)로만 한다. 노션 스키마·노션 Worker(`minmin-notion`)는 바꾸지 않는다.
- **가디언(`kids-screen-guardian`)은 §6 A안 범위만** 바꾼다. 같은 이름의 브랜치 `codex/quest-lesson`을 가디언 저장소 worktree에도 만든다. 가디언 서버 배포(`worker/deploy.ps1`)는 사용자 승인 뒤에만 한다.
- `walkthrough.md`, 시험 데이터, 화면 캡처는 커밋하지 않는다.

---

## 1. A (Action · 목표)

1. **민수 — 3단계 레슨**: 지금 5문제짜리 판(약 20초)을 듀오링고처럼 「워밍업 → 빌드업 → 보스」 3단계, 12~13문제(3~5분)의 레슨 한 판으로 바꾼다. 판 사이 대기·재진입으로 버려지던 시간을 줄이고, 단계 축하·콤보·결과 화면으로 몰입감을 높인다.
2. **민서 — 한입 레슨과 원터치 진입**: 민서는 문제 난이도보다 **들어가는 길이 복잡해서** 공부방을 피하고 동화만 본다(2026-10-29 부모 관찰). 로비 버튼 한 번으로 3문제 「한입 레슨」이 바로 시작되게 하고, 문제를 자동으로 읽어 준다.
3. **동화 → 레슨 연결**: 동화를 다 읽으면 「방금 읽은 이야기로 3문제」 버튼으로 이어지게 한다(연결 정보가 있는 책만).
4. **캐릭터 신호 자리**: 레슨 엔진이 반응 신호(정답·격려·콤보·단계·보스·완주)를 내보내고, 화면 옆 파트너(기존 응원 몬스터·갤러리 파트너)가 받아서 반응한다. 캐릭터 그림·연출 고도화는 **다음 작업**이며 이번에는 신호 계약과 기존 반응 연결까지만 한다.
5. **학습일지 보완 ①~④** (§5-6).
6. **민서 한입 레슨 완주 보상 (A안, 2026-10-30 사용자 확정)**: 한입 레슨을 끝까지 하면 정답 여부와 상관없이 고정 3분을 준다 (§6).

---

## 2. 도입 전 구조 (2026-10-29 확인한 사실)

- **판 구성**: `quest-mastery.js`(791줄, 상한 800 직전)의 `buildRound`가 5슬롯(1~2 단어, 3 문장, 4 녹슨 왕관/은메달 복습, 5 승급 도전, Lv.3 최대 2개)을 만든다. `buildQuestion`·`buildMatch`는 **공개 API에 없다**(`api` 객체에 미포함).
- **흐름**: `quest-runner.js`(674줄)가 `loadUnit` → `buildRound` → 문항마다 `QuestUIRenderer.render` → `handleMasteryDone`(`applyResult`, `StudyActivity.recordCorrect`) → `showClearModal`(`pushChanges`, `grantRewardAndShowUI(3, true)`, `sendStudyLogToNotion`).
- **화면**: `quest-ui-renderer.js`(372줄). 오답 콜백 `onWrong()`은 **아이가 고른 값을 받지 않는다**. 그래서 학습일지 오답이 모두 `선택: "힌트 보고 해결"`로만 남는다(`quest-runner.js:227`).
- **파트너 반응**: `quest-runner.js`의 `syncCheerMonsterReaction('correct'|'encourage'|'clear')`. 민수는 `MonsterRoster`(갤러리 파트너 포함), 민서는 갤러리 파트너 또는 「요정 코코」.
- **민서 진입 경로**: 로비 `goToFiveMinQuest`(`kids/js/lobby_controller.js:770`, 파일 1,099줄 — 기존 상한 초과 파일) → `monster_lab.html` → 과목·단원 선택 → `quest_runner.html`. 단원 기본값은 `quest-runner.js:29`(부모 진도판 설정 `configuredUnit` 우선).
- **동화**: `kids/js/storybook_engine.js`(637줄)의 완독 카드(`webtoon-finish-card`)와 `showCompletionModal`. 책 데이터 `kids/subjects/{과목}/data/story_*.js`의 `window.STORY_BOOK`에는 VOCA 단원 연결 필드가 없다.
- **시간 측정** (`kids/core/study-activity.js`): 실제 터치 후 90초까지만 시간이 쌓인다. 단, `#mainAudio`(동화 낭독)가 재생 중이면 10분까지 연장된다. → **동화가 가장 쉽게 시간이 쌓이는 곳**이라 민서가 동화로 몰린다. 5분방은 터치 시간 + 첫 시도 정답 2개당 1분.
- **2026-10-29 민수 실제 기록**: 영어 판 약 45회, 판당 15~25초, 판 사이 4~10초 측정 공백(축하 화면·재진입·첫 터치 전). 서버 계산 활동 35분 + 정답 보너스 40분. 측정 자체의 버그는 없음.
- **학습일지** (`kids/core/study-log-store.js` 338줄, `notion-reward.js`의 `sendStudyLogToNotion`): 학생·과목·날짜별 1줄에 오답을 ` | `로 누적. 확인된 문제는 §5-6.

---

## 3. S (Scope · 범위)

| 파일 | 내용 | 한도 |
| :--- | :--- | :--- |
| 신규 `kids/subjects/quest/quest-lesson.js` | 레슨 구성(순수 함수, DOM 없음)·단계 진행·콤보·반응 신호. IIFE, 전역 `QuestLesson` 하나 | 300~600줄 |
| 신규 `kids/subjects/quest/quest-lesson-ui.js` | 단계 전환 장면·콤보 배너·결과 화면·민서 한입 화면. 스타일은 `<style id="ql-style">` 1회 삽입 | 300~600줄 |
| 신규 `tests/quest-lesson.test.mjs` | §7 시험 | 제한 없음 |
| `kids/subjects/quest/quest-mastery.js` | `buildQuestion`, `buildMatch`를 `api` 객체에 추가만 (**새 줄 추가 0~2줄**, 800 미만 유지) | |
| `kids/subjects/quest/quest-runner.js` | 레슨 모드 분기·결과 연결. 로직은 새 모듈에 두고 연결만 | 추가 60줄 이내, 800 미만 |
| `kids/subjects/quest/quest-ui-renderer.js` | `onWrong(chosen)`과 결과의 `wrongPicks` (§5-6 ②), 민서 자동 읽기 옵션 | 추가 30줄 이내 |
| `quest_runner.html` | 새 스크립트 2개 로드·버전 쿼리 | 추가 5줄 이내 |
| `kids/js/lobby_controller.js` | 민서 원터치 진입 (§5-3). **기존 상한 초과 파일이므로 순증 5줄 이내** | |
| `kids/js/storybook_engine.js` | 완독 카드에 레슨 연결 버튼 (§5-4) | 추가 20줄 이내 |
| `kids/core/study-log-store.js` | 오답 분할 저장·조회 실패 대기열 (§5-6 ①③) | 600줄 미만 |
| `kids/core/notion-reward.js` → `notion-reward-quiz.js` → `notion-reward-discussion.js` | 보상 경로는 클래식 스크립트로 순서대로 로드. 오답만 있는 퀴즈 세션의 일지 기록 (§5-6 ④)은 `notion-reward-quiz.js` 담당 | 각각 443·450·448줄 (머리 주석 포함) |
| `kids/core/study-activity.js` | 레슨 완주 기록 `recordLessonComplete` (§6) | 추가 25줄 이내 |
| 가디언 `learning/study-activity.js` | 위와 같은 변경. 두 사본이 지금도 다르므로 차이를 먼저 보고한다 (§6) | |
| 가디언 `worker/src/study-measurement.js`, `index.js`, `time-bank.js`, `parent-client.js`, `worker/test/activity.test.js` | 레슨 완주 보너스 계산·적립·부모 화면 표시·시험 (§6) | |
| `kids/core/CORE_CATALOG.md`, `.agent/skills/quest-engine-spec/SKILL.md`(+ `python scripts/sync_agent_skills.py`), 가디언 `docs/guardian_spec.md`·`README.md`, 이 문서 | §8 | |

### 손대지 않는 것
- 3·3·3 숙련도 규칙 자체(count 단계, 은메달 당일 상한, 금메달·녹슨 왕관, 첫 시도만 +1), 노션 VOCA_DB 동기화 형식(`count|silverDate|lastReviewed`)
- 기존 4+1 경로(수학·정적 뱅크·`?engine=classic`)
- `study-activity.js`의 시간 측정 규칙(90초 입력 유예, 낭독 10분 연장, 구간 봉인) — §6의 완주 기록 추가만 허용
- 가디언의 기존 보상 규칙(활동 분, 정답 2개당 1분), 노션 Worker, 노션 스키마
- 기존 호출 시그니처: `grantRewardAndShowUI(3, true)`, `sendStudyLogToNotion({...})`, `StudyActivity.setPhase`/`recordCorrect`
- `monster_roster.js`의 저장 키·장착 로직(갤러리 파트너 명세 그대로 사용)

---

## 4. D (Data · 데이터 계약)

### 4-1. URL
| 주소 | 동작 |
| :--- | :--- |
| `quest_runner.html?subject=english&user=minsu&unit=L9` | 3·3·3 대상이면 **기본이 3단계 레슨** |
| `…&lesson=round5` | 기존 5문제 판(비교·회귀 확인용으로 유지) |
| `…&engine=classic` | 기존 4+1 (지금과 같음) |
| `quest_runner.html?user=minseo&lesson=bite` | 민서 한입 레슨. `subject`·`unit`이 없으면 §5-3 규칙으로 고름 |
| `…&lesson=bite&subject=korean&unit=<노션 단원명>&from=storybook` | 동화에서 넘어온 한입 레슨 |

- 여러 단원 묶음은 지금처럼 `|`로 잇는다. 쉼표로 쪼개지 않는다.

### 4-2. 동화 연결 필드 (선택)
```js
window.STORY_BOOK = {
  // ...기존 필드
  questLink: { subject: 'korean', unit: '1단원 (1. 기분을 말해요)' }
};
```
- `unit`은 노션 VOCA_DB `단원` 값과 **정확히 같아야** 한다(자연어 추론·부분 일치 금지).
- 실제 책에 값을 넣는 것은 **읽기 전용 노션 조회로 정확히 일치하는 단원이 확인된 책만** 한다. 확인되지 않으면 비워 두고, 완료 보고에 「연결 후보 / 비워 둔 책」 표로 정직하게 적는다(GEMINI §5 공란 원칙).

### 4-3. 반응 신호 (캐릭터 연결 계약)
`QuestLesson.COMPANION_EVENTS = ['correct', 'encourage', 'combo', 'step', 'boss', 'clear']`
- 레슨 엔진은 `hooks.onCompanion(event, detail)`만 부른다. `detail`: `{ combo, stepIndex, stepTotal, isMinseo }`.
- 러너는 이 신호를 `syncCheerMonsterReaction`으로 넘긴다. 기존 반응이 없는 `combo`·`step`·`boss`는 각각 `correct`·`correct`·`clear` 연출로 대신하고 대사만 바꾼다(아이를 탓하는 말 금지).
- 다음 작업(캐릭터 이식)은 이 신호 목록만 보고 표정·동작을 붙인다. 신호 이름을 바꾸면 이 문서와 카탈로그를 같이 고친다.

---

## 5. S (Spec · 동작 규칙)

### 5-1. 민수 3단계 레슨 (`QuestLesson.buildLesson`)
```js
QuestLesson.buildLesson({ child, items, subj, store, today, rng, mode: 'full' | 'bite' })
// → { steps: [{ key: 'warmup'|'build'|'boss', title, questions: [...] }], meta }
```
| 단계 | 문항 수 | 구성 |
| :--- | :--- | :--- |
| 🌱 워밍업 | 4 | 현재 스테이지 단어 위주 Lv.1~2. 듣고 고르기(`choice_audio`) 우선, Lv.1 단어가 3개 이상이면 짝 맞추기(`match_3x3`) 1개 |
| 🔨 빌드업 | 5 | 빈칸(`fill_blank`)·뜻 고르기 위주 Lv.2, 문장·숙어 최소 2개(없으면 단어) |
| 👑 보스 | 3~4 | 녹슨 왕관 복습(있으면 맨 앞), 이전 스테이지 은메달 Lv.3, 승급 도전, 문장 조립(`scramble`). Lv.3는 **보스 단계에서만, 최대 3개** |

규칙:
1. **크레딧은 항목당 레슨 1회**: 같은 항목이 레슨에 두 번 나오면 두 번째부터는 `noCredit`. 한 레슨에서 count가 +2 이상 오르지 않는다. 은메달 당일 상한·`isTodayAllSilver` 규칙은 그대로.
2. **다시 한 번(듀오링고식 재출제)**: 첫 시도에 못 맞힌 항목은 같은 단계 끝에 한 번 더 낸다(`noCredit`, 에러리스 그대로). 단계당 재출제 최대 2개.
3. 항목이 부족하면(단원 항목 3~8개) 단계 문항 수를 줄이되, 총 6문제 미만이면 기존 5문제 판(`buildRound`)으로 대신한다.
4. 문항 생성은 `QuestMastery.buildQuestion`/`buildMatch`를 그대로 쓴다. 출제 규칙을 새 모듈에 복사하지 않는다.
5. 결정적 난수(`rng`)를 받으면 같은 입력에 같은 레슨이 나와야 한다(시험용).

### 5-2. 진행·연출 (`quest-lesson-ui.js`)
- 위쪽 진행 막대는 레슨 전체 기준. 단계 경계에 작은 깃발 3개.
- **단계 전환 장면**(1.2초 이내, 탭하면 바로 넘김): 「워밍업 완료! 🔨 빌드업 시작」, 파트너 `step` 신호. 보스 단계 진입 때는 `boss` 신호.
- **콤보**: 첫 시도 정답이 연속 3·5·8개일 때 배너와 `combo` 신호. 힌트 뒤 정답이면 콤보만 0으로 돌아간다(감점·경고음 없음).
- **단계 끝마다 저장**: 단계를 마칠 때 `pushChanges`(숙련도)를 보내고 `grantRewardAndShowUI(3, true)`를 부른다. 레슨 중간에 나가도 끝낸 단계의 진도·보상은 남는다. (보석 비율: 지금 5문제당 3개 ≒ 레슨 13문제당 9개. 일일 상한은 기존 엔진이 그대로 적용)
- **결과 화면**: 첫 시도 정답률, 최고 콤보, 오른 항목 수, 새 은메달·금메달, 걸린 시간(화면 표시용 — 측정기와 무관). 버튼 `[다음 레슨]`(페이지 새로고침 없이 다음 레슨 구성), `[연구소로]`.
- `[다음 레슨]`은 같은 페이지에서 이어 가므로 재진입 공백이 생기지 않는다. 단, 결과 화면이 떠 있는 동안은 지금처럼 `StudyActivity.setPhase('paused')`, 다음 레슨 첫 문제에서 `'quiz'`.
- 학습일지는 **레슨이 끝날 때 1번**, 끝내지 못하고 나가면 `pagehide`에서 1번(지금 4+1 경로 방식과 같게) 보낸다.
- 화면 폭 360px에서 버튼 최소 44px, 가로 스크롤 없음.

### 5-3. 민서 한입 레슨과 원터치 진입
- `mode: 'bite'`: 1단계 3문제. Lv.1~2만, 문장 조립은 최대 3조각(지금 민서 규칙). Lv.3·녹슨 왕관은 한입 레슨에서 내지 않는다.
- **자동 읽기**: 문제가 뜨면 0.3초 뒤 지시문·문제를 자동으로 읽는다(`speakFairyTTS`/`speakEnglish`, `speechSynthesis` 직접 호출 금지). 보기를 누르면 그 보기를 읽어 준다(지금 국어 🔊 규칙 확장).
- 결과 화면은 큰 스티커 연출 + 버튼 두 개 `[🌸 한 입 더!]`(바로 다음 한입 레슨), `[🏠 그만할래]`(로비). 결과 화면에 숫자·정답률은 보이지 않는다.
- 단계가 하나뿐이므로 끝날 때 `pushChanges` → `grantRewardAndShowUI(3, true)` → 학습일지 순서는 같다.
- **원터치 진입**: 로비에서 민서의 5분 퀘스트 버튼(`goToFiveMinQuest`)은 `quest_runner.html?user=minseo&lesson=bite`로 바로 간다. 민수는 지금처럼 연구소로 간다. 연구소는 러너의 나가기 메뉴에서 계속 갈 수 있다.
- **과목 자동 선택** (`subject` 없을 때, `QuestLesson.pickBiteSubject`): 민서 3·3·3 대상 과목(`korean`, `english`) 중 오늘(로컬 `YYYY-MM-DD`) 한입 레슨을 덜 한 과목, 같으면 국어. 횟수는 `localStorage` `questBiteCount_daughter_{YYYY-MM-DD}`(JSON `{korean, english}`)에만 둔다. 단원은 지금 러너 기본값 규칙(부모 진도판 설정 우선)을 그대로 쓴다.

### 5-4. 동화 → 한입 레슨
- `STORY_BOOK.questLink`가 있으면 완독 카드에 `[🌟 이 이야기로 3문제!]` 버튼을 추가한다. 주소는 §4-1 `from=storybook` 형식, 학생은 지금 보는 아이.
- 민수가 눌러도 같은 한입 레슨(3문제)이다.
- 기존 완독 보상 버튼·`showCompletionModal`은 그대로 둔다. `questLink`가 없으면 화면은 지금과 똑같다.
- 해당 단원 항목이 3개 미만이거나 노션 조회가 실패하면 「이 이야기 문제는 준비 중이에요」 안내 후 일반 한입 레슨으로 진행한다.

### 5-5. 캐릭터 신호 연결
- §4-3 계약대로 연결한다. 이번 작업에서 새 그림·포즈·애니메이션 파일은 추가하지 않는다.
- 민서 한입 레슨에서도 파트너(갤러리 파트너 또는 요정 코코)가 보이고 같은 신호에 반응해야 한다.

### 5-6. 학습일지 보완 (2026-10-29 노션 읽기 점검 결과)
| | 확인된 문제 | 고치는 방법 |
| :--- | :--- | :--- |
| ① | `오답리포트`를 1,900자에서 자르고(`ERROR_REPORT_LIMIT`), 넘친 뒤의 새 오답은 버린다. 10-27 영어 1,688자, 10-29 1,301자 | rich_text를 1,900자 조각 여러 개로 나눠 저장한다(최대 40조각). 그래도 넘치면 **오래된 판부터** ` \| ` 단위로 빼고 맨 앞에 `…(앞 기록 생략) \| `를 붙인다. 읽을 때는 지금처럼 조각을 이어 붙인다 |
| ② | 3·3·3 오답이 모두 `선택: "힌트 보고 해결"` | 렌더러가 오답 때 고른 값을 `onWrong(chosen)`으로 넘기고, `onDone` 결과에 `wrongPicks: [문자열]`(항목별)을 담는다. 러너는 `선택: "<고른 값들>"`로 적고, 값이 없을 때만 「힌트 보고 해결」. 짝 맞추기는 `단어→고른 뜻`, 조립은 처음 잘못 넣은 조각 |
| ③ | `민수_2026-10-28_영어` 줄이 2개. 조회 실패 시 「신규 생성(중복 가능)」으로 POST하는 경로(`writeStudyLog`) | 조회가 실패하면 POST하지 않고 `localStorage` `MINMIN_STUDY_LOG_QUEUE_V1`에 쌓는다(같은 키는 오답·단어요정 병합). 다음 `upsertStudyLog` 호출과 페이지 로드 때 먼저 비운다. 기존 중복 줄은 **운영 노션을 고치지 않고** 완료 보고에 남긴다(부모 수동 정리) |
| ④ | 10-29 18:51~19:04 민수 수학 13분 측정 기록은 있는데 정답 0개, 학습일지 줄 없음. 퀴즈 세션은 `solvedCount > 0`일 때만 일지를 보내서 **틀리기만 한 기록이 통째로 사라진다**(`finalizeQuizRewardSession`, `pagehide`) | 일지 전송 조건에 `window.wrongNotes`가 비어 있지 않은 경우를 더한다. 어느 화면이었는지는 측정 기록에 남지 않아 확인하지 못했다(세로셈 추정) — 화면 특정은 부모가 아이에게 확인 |

- 레슨 학습일지 오답 앞에는 요약을 붙인다: `[레슨 영어 L9 · 13문제 · 첫 시도 11 · 최고 콤보 6] ` (한입 레슨은 `[한입 국어 …]`).
- `소요시간`은 지금처럼 0을 보낸다(시간은 활동 측정 기록이 원천).

---

## 6. 민서 보상: 한입 레슨 완주 고정 시간 (A안, 2026-10-30 사용자 확정)

**배경**: 동화는 낭독 재생 중 시간이 10분까지 쌓이지만, 5분방은 터치 시간과 첫 시도 정답 보너스뿐이라 민서에게 불리하다. 사용자가 세 안(A 완주 고정 시간, B 음성 재생 중 연장, C 유지) 가운데 **A**를 골랐다.

### 6-1. 규칙

| 항목 | 값 |
| :--- | :--- |
| 대상 | 민서(`minseo`)의 한입 레슨(`lesson=bite`)만. 민수 3단계 레슨·동화→3문제(`from=storybook`, 민수일 때)는 대상 아님 |
| 지급 | 완주 1회당 **3분**, 하루 **최대 10회(30분)** |
| 완주 조건 | 3문제를 모두 끝냄(에러리스라 오답 후 정답도 완주로 인정). 중간에 `[🏠 그만할래]`·페이지 이탈은 지급 없음 |
| 기존 보상과 관계 | 더한다. 레슨 동안의 활동 분과 첫 시도 정답 보너스는 지금 규칙대로 따로 쌓인다 |
| 값 위치 | 가디언 서버 상수 한 곳(`LESSON_BONUS = { minseo: { minutes: 3, daily: 10 } }`). 부모가 바꾸고 싶으면 이 값만 고친다 |

### 6-2. 기록 형식 (공부방 → 가디언)

- `StudyActivity`에 `recordLessonComplete(lessonId, startedAt)`를 추가한다(`kids/core/study-activity.js`, 가디언 `learning/study-activity.js` 두 사본 모두).
  - 받아들이는 조건은 `recordCorrect`와 같다: `kind === 'quiz'`, 화면이 보임, 마지막 실제 입력이 5초 안. 같은 `lessonId`는 한 번만.
  - v3 기록에 `lessons: [{ id, startedAt, at }]`를 더하고, 노션 `활동측정` JSON에도 그대로 싣는다(지금 `answers`를 싣는 방식과 같음). 저장 대기열·재전송 경로도 `answers`와 똑같이 다룬다.
  - `lessonId`는 `crypto.randomUUID()`. `startedAt`은 한입 레슨 첫 문제가 화면에 나온 시각.
- 레슨 UI는 민서 한입 레슨이 3문제를 모두 마친 순간(결과 스티커 표시 직전)에만 부른다. 한 입 더 하면 새 `lessonId`를 쓴다.
- 기존 `quest-lesson-complete` 이벤트는 그대로 내보낸다(캐릭터 연출 등 다른 쓰임용).

### 6-3. 가디언 서버 계산 (`measuredStudyRewards`)

- `measuredStudyRewards(pages, date, now, { lessonBonus })`처럼 선택 인자를 받는다. `readStudyRewards`가 `LESSON_BONUS[childKey]`를 넘긴다. 인자가 없으면 레슨 보너스 0(기존 호출·시험 그대로 통과).
- 레슨 항목 검증 (하나라도 어긋나면 **그 기록 전체를 버리는 기존 방식** 대신, 레슨 항목만 버린다 — 활동 분·정답 보너스는 지키기 위함):
  - `id`가 UUID 형식, `kind === 'quiz'`, `at`이 그 기록의 `입장`~`퇴장` 범위 안이고 `now` 이전
  - `startedAt`은 같은 날(KST) 안이고 `at - startedAt`이 20초 이상 30분 이하
  - **그날 합친 활동 구간 중 `[startedAt, at]`에 겹치는 시간이 15초 이상** (터치 없이 기록만 만든 경우 거름)
  - 같은 `id`는 하루에 한 번만 센다(재전송 중복 지급 방지)
- 결과에 `lessonCompletions`, `lessonBonusMinutes = min(완주 수, daily) × minutes`를 더한다.
- `index.js`의 `updateStudy` 키 목록, `time-bank.js`의 `dailyGrant`, 아이·부모 화면 응답(`todayLessonBonusMinutes`)과 `parent-client.js` 표시 문구에 같은 값을 더한다. 일별 최댓값 보존 방식은 기존 키와 같다.
- 옛 서버는 모르는 JSON 필드를 무시하므로, 공부방을 먼저 배포해도 안전하다. 순서: 공부방 → 가디언 서버(승인 후).

### 6-4. 화면 표시

- 민서 한입 결과 화면에는 숫자를 보여 주지 않는다(§5-3 유지). 대신 스티커 아래에 「⏰ 놀이 시간 선물!」 한 줄만. 하루 10회를 넘긴 뒤에는 이 줄을 숨긴다(`questBiteCount_daughter_{YYYY-MM-DD}`로 판단, 서버 판정과 다를 수 있어도 문구만의 차이).
- 부모 화면: 「레슨 완주 보너스 N분 (M회)」를 정답 보너스 옆에 표시.

--- | :--- | :--- |
| A | 한입 레슨 완주마다 고정 시간(예: 3분) | 가디언 서버 보상 규칙·측정 기록 형식 |
| B | 레슨에서 문제 읽기 음성이 재생되는 동안 동화처럼 시간 연장 | `study-activity.js`(가디언 사본과 함께) |
| C | 지금 유지(터치 시간 + 정답 2개당 1분) | 없음 |

---

## 7. 시험과 확인

- `node --test "tests/**/*.test.mjs"` 전체 통과(기존 TODO 1건은 실패 아님). `node scripts/verify_quest_mastery.js` 통과.
- `tests/quest-lesson.test.mjs` (DOM 없이):
  - 단계별 문항 수·유형 구성, Lv.3는 보스에만·최대 3개, 녹슨 왕관이 보스 맨 앞
  - 항목당 크레딧 1회(두 번째 등장 `noCredit`), 은메달 당일 상한 유지, 재출제는 `noCredit`·단계당 최대 2개
  - 항목 3~8개 단원의 축소·`buildRound` 대체, 결정적 `rng`
  - 한입 레슨: 3문제, Lv.3·녹슨 왕관 없음, 조립 3조각 이하
  - `pickBiteSubject` 날짜·횟수 규칙(로컬 날짜 헬퍼 사용, `toISOString` 금지)
  - 오답 조각 저장: 1,900자 경계, 40조각 초과 시 오래된 판부터 생략, 조각 이어 읽기 왕복
  - 조회 실패 시 POST 0회·대기열 적재·다음 호출 때 1회 기록(같은 키 병합)
  - `wrongPicks`가 학습일지 문자열에 들어감, 오답만 있는 퀴즈 세션도 일지 1회
  - 규칙을 일부러 깨뜨리면(크레딧 2회 허용, 재출제에 크레딧 부여 등) 시험이 실패하는지 확인한 뒤 원복
- **화면 시험** (`guarded_preview_server.py`, 375×812·1280×800):
  - `?subject=english&user=minsu&unit=L9`, `?subject=korean&user=minsu`: 레슨 3단계 완주, 단계 전환·콤보·결과·`[다음 레슨]` 이어 하기
  - 단계마다 숙련도 PATCH·보상 PATCH가 `window.__blockedWrites`에 잡히고 레슨 끝에 학습일지 1건
  - 로비(민서) → 한입 레슨 바로 시작, 자동 읽기 호출, `[한 입 더!]`
  - `questLink`가 있는 동화 완독 카드 → 한입 레슨
  - `?lesson=round5`, `?engine=classic`, `?subject=math&user=minsu`가 지금과 같음
  - 실제 클릭으로 풀었을 때 `StudyActivity` 정답 기록이 늘어나는지(스크립트 `.click()`은 0이 정상)
  - 콘솔 오류 0, 노션 실제 쓰기 0
- 가디언 `worker`에서 `npm test`(= `node --test`) 전체 통과. `activity.test.js`에 추가:
  - 완주 1회 3분, 11회는 30분(상한), 같은 `id` 재전송은 1회
  - `lessonBonus` 인자 없음(민수) → 0분, 기존 시험 결과 불변
  - 활동 겹침 15초 미만, `at - startedAt` 20초 미만, 미래 시각, `kind: 'study'` → 그 레슨만 0, 같은 기록의 활동 분·정답 보너스는 그대로
  - 두 기록(60초 봉인)에 걸친 레슨: `startedAt`이 앞 기록 시간이어도 인정
- 공부방 `study-activity` 시험: `recordLessonComplete`가 입력 5초 초과·화면 숨김·`study` 단계에서 거부되고, 기록 JSON에 `lessons`가 실린다
- 실제 노션 쓰기 시험은 하지 않는다. 가디언 서버 배포 후 실제 확인은 사용자와 함께 민서 기기 1회로 한다.

---

## 8. 문서 동기화

- `kids/core/CORE_CATALOG.md` §2-2: `quest-lesson.js`·`quest-lesson-ui.js` 역할과 API, `COMPANION_EVENTS`, URL 표, `questBiteCount_daughter_*`·`MINMIN_STUDY_LOG_QUEUE_V1` 저장 키, `quest-lesson-complete` 이벤트
- `.agent/skills/quest-engine-spec/SKILL.md`: 레슨 구성 규칙·크레딧 1회 규칙·함정 추가 → `python scripts/sync_agent_skills.py` → `--check` 통과
- 가디언 `docs/guardian_spec.md` 확정 정책 절과 `README.md` 보상 설명에 「민서 한입 레슨 완주 1회 3분, 하루 최대 30분」 추가
- `GEMINI.md` §4 0번 항목에 「한 판 = 3단계 레슨(민서는 한입 레슨)」 한 줄 추가
- 이 문서의 상태·시험 결과 갱신

---

## 9. 하지 말 것

- `quest-mastery.js`에 레슨 로직 넣기(800줄 초과), 출제 함수 복사
- 레슨 한 판에서 같은 항목 count를 2 이상 올리기
- 하트·감점 소리·빨간 X·「실패」 문구 (에러리스)
- 노션 단원명을 부분 일치·정규식으로 추론해 `questLink` 채우기
- B안(음성 재생 중 시간 연장) 구현, `study-activity.js`의 시간 측정 규칙 변경
- 레슨 완주 보너스를 민수·동화·수학으로 넓히기, 서버 승인 없이 가디언 배포
- 노션 Worker·노션 스키마 변경
- 운영 노션의 중복 학습일지 줄 삭제
- 상한 초과 파일(`lobby_controller.js`)에 로직 덧붙이기 (연결 몇 줄만)


## 10. 격리 브랜치 구현 기록 (2026-10-30)

- 공부방: `scratch/worktrees/quest-lesson-school`, 관제탑·가디언: `scratch/worktrees/quest-lesson-tower`, 각 `codex/quest-lesson`. 실제 가디언은 관제탑 저장소의 하위 폴더다. 관제탑 worktree의 `kids-school-main`은 공부방 worktree에 대한 로컬 junction이며 Git 산출물이 아니다.
- 공부방·가디언 측정기는 줄바꿈 정규화 후 처음부터 동일했다. 레슨 기록 추가 뒤에도 동일하게 유지했다.
- 기본 full/bite·round5/classic 분기, 단계 저장·재출제·신호·결과, 오답 분할/대기열, 오류 선택값, 오답만 있는 세션, 완주 보너스와 부모 표시를 구현했다. 새 파일은 각각 300~600줄 범위다.
- 캐시 갱신을 위해 §3 파일에 더해 `kids/core/core.js`, `kids/core/notion-helper.js`, `kids/subjects/common/storybook_viewer.html`의 버전 문자열을 갱신했다. 스킬 동기화가 `scripts/data/system_map_data.js` 기준일도 자동 갱신한다.
- 실제 노션 읽기 조회로 민서 `1단원 (1. 기분을 말해요)` 항목 10건 이상이 정확히 일치함을 확인했다. `kids/subjects/korean/data/story_1_2_1_b1.js`(마음 똑똑! 감정 라디오 교실)에만 questLink를 넣었다. 다른 책은 개별 연결 검증을 하지 않아 비워 두었다.
- 공부방 전체 회귀: 89건 중 통과87·실패0·건너뜀1·기존 TODO1. 새 레슨 시험8건 통과. `verify_quest_mastery.js`도 통과했다. 크레딧 중복을 허용하도록 메모리 속 소스를 바꾼 경우 시작 전 계약 검증이 거부하는 것도 확인했다.
- 가디언 전체 시험56건 통과·실패0·건너뜀0. 잠금파일 기준 pnpm 설치 후 실제 Wrangler 부모 번들 시험까지 통과했다. 운영 배포는 하지 않았다.
- 학습일지 기존 S6 시험은 과거의 조회 실패 시 신규 생성 기대를 대기열 보존·재시도 기대로 바꿨다. 두 기기 동시 최초 작성의 노션 고유 키 부재 한계(TODO)는 그대로다.
- 실제 브라우저 화면을 열려고 했으나 Work에서 로컬 브라우저 사용이 비활성화되어 열리지 않았다. 375×812·1280×800 실제 완주/음성/파트너/쓰기 차단 확인, 360px 가로 넘침 검사는 아직 하지 않았다. 모의 DOM 시험 결과를 육안 검증으로 대체하지 않는다.
- 운영 중복 일지 `민수_2026-10-28_영어`는 삭제하지 않았다. 민서 기기 실제 잔액 확인과 공부방→가디언 배포는 후속 사용자 지시 뒤 진행한다.

### 10-1. Claude 검수와 보완 (2026-10-30)

- 쓰기 차단 서버에서 화면 시험: 민서 한입 레슨(375×812) 완주 2회, 가로 넘침 없음, 완주 기록 `lessons`가 활동측정 JSON에 실림. 그 기록을 가디언 `measuredStudyRewards`에 넣으면 민서 3분·민수 0분, 재전송은 1회로 셈. 학습일지 요약 `[한입 국어 …]` 확인. 민수 레슨 첫 화면(워밍업 1/13) 확인.
- 보완 1: 동화 기본 보기(책 넘김)는 완독 카드가 아니라 `showCompletionModal`로 끝나서 버튼이 보이지 않았다. `createQuestLinkButton()`으로 묶어 완독 카드와 완독 창 모두에 붙였다(`storybook_engine.js` 순증 20줄). 완독 창 → 한입 레슨 이동까지 확인.
- 보완 2: 한입 레슨은 오답을 다시 내지 않는다(`createSession`에서 `mode === 'bite'` 제외). 「딱 3문제」 약속 유지. 시험 1건 추가, 화면 흐름 시험은 3문항으로 수정. 화면에서 오답 후 `2/3` 유지 확인.
- 아직 직접 보지 못한 것: 민수 레슨 단계 전환·콤보 배너·단계별 저장의 실제 클릭, 자동 읽기 음성 청취, 민서 기기 실제 적립(가디언 배포 후).
