# 🧹 800줄 대청소 4차: 보상 모듈 `notion-reward.js` 분리 명세서

> **문서 버전**: v1.0 (2026-10-31)
> **상태**: 구현·검증 완료 (2026-10-31 Claude 확인, 용어사전 로드 정리 포함)
> **근거**: GEMINI §8-0 골디락스(파일당 800줄 미만, 300~600줄 최적), §8-4 정기 리팩토링. 노션 현황판 카드 「800줄 초과 파일 정기 대청소」의 4차분. 앞선 JS 분리: `docs/daily_diary_split_spec.md`.
> **작업자 참고**: `AGENTS.md` 순서대로 `GEMINI.md`, `kids/core/CORE_CATALOG.md`를 먼저 읽는다. 퀘스트 쪽 계약은 `docs/quest_lesson_spec.md`.

---

## 0. 진행 방식
- **먼저 계획(자를 줄 번호와 그 줄이 최상위 경계인 근거, 새 파일 이름과 예상 줄 수, 고칠 참조 목록 전체, 이 문서와 다르게 하려는 점)만 보고하고 멈춘다.** 승인 메시지를 받으면 구현한다.
- 작업 폴더: `G:/master-tower/scratch/worktrees/notion-reward-split`, 브랜치 `codex/notion-reward-split`. 이 폴더 밖을 고치지 않는다. `main` 병합·푸시는 하지 않는다.
- 이 작업 환경에서 Python 실행과 git 커밋이 막혀 있을 수 있다. 막히면 시도를 반복하지 말고 "못 했다"고 보고한다(검사·커밋은 Claude가 한다).
- **완료 보고 규칙**: 실행한 시험 명령과 출력 마지막 10줄 원문, 파일별 줄 수 표, 커밋 해시 또는 "커밋 못 함", 하지 못한 것.

---

## 1. A (목표)
`kids/core/notion-reward.js`(1338줄)는 학습일지·보상 UI, 음성 입력, 퀴즈·미션 보상, 토론 보상, 이탈 확인을 한 파일에 담고 있다. **동작을 하나도 바꾸지 않고** 연속된 구간 3개로 잘라 모든 파일을 600줄 이하로 만든다.

## 2. 자르는 위치 (2026-10-31 main 기준 제안)
계획 단계에서 각 절단 줄이 최상위(어떤 함수·블록·템플릿 문자열 안도 아님)인지 확인해 보고한다.

| 파일 (`kids/core/`) | 원래 줄 | 줄 수 | 내용 |
| :--- | :--- | ---: | :--- |
| `notion-reward.js` (**이름 유지**) | 1–442 | 442 | 공용 모듈 자동 로드 IIFE, 설정값, `sendStudyLogToNotion`, 레벨 계산, `grantRewardAndShowUI`, `window.__sttSession` |
| `notion-reward-quiz.js` | 443–891 | 449 | `setupDebouncedSTT`, 접속사 채점 가드레일, 미션 보상, 퀴즈 보상 세션 |
| `notion-reward-discussion.js` | 892–1338 | 447 | 이탈 시 세션 플러시(`pagehide`), 토론 보상, 대화 기억, 오답 선택 안내, 이탈 확인, 용어 정독 보상 |

**첫 파일 이름을 바꾸지 않는 이유**: 맨 앞 IIFE가 `document.currentScript`가 없을 때 `src`에 `notion-reward.js`가 들어간 스크립트를 찾아 공용 모듈 경로를 정한다. 이름을 유지하면 이 코드와 기존 문서·참조가 그대로 맞는다.

## 3. 옮기는 규칙 (가장 중요)
1. **내용을 고치지 않는다.** 코드·주석·들여쓰기 한 글자도 바꾸지 않고 잘라 옮기기만 한다. 이름 변경·정리·버그 수정 금지(발견하면 보고만). 각 파일 맨 위에 한 줄 주석 `// kids/core/{파일} - notion-reward.js 분리 {n}/3: {내용} (순서대로 로드)`만 추가한다(첫 파일도 원래 1줄 앞에 이 한 줄).
2. **클래식 스크립트 그대로**: IIFE로 새로 감싸지 않고 `type="module"`·`defer`도 쓰지 않는다. 최상위 `var`/`const`, `window.*` 대입, `addEventListener` 등록은 원래 구간에 그대로 둔다.
3. **로드 순서**: `notion-reward.js` → `notion-reward-quiz.js` → `notion-reward-discussion.js`. 파일을 읽는 즉시 뒤 파일의 함수를 부르는 코드가 없어야 한다(계획 단계에서 최상위 실행문을 모두 나열해 확인).
4. **참조 바꾸기**: 계획 단계에서 `kids/`, 저장소 루트 HTML, `scripts/`, `tests/`를 다시 검색해 보고한다. 2026-10-31 확인된 직접 로드는 두 곳이다.
   - `quest_runner.html`의 `<script src="./kids/core/notion-reward.js?v=20261024-1">`
   - `kids/common_space/voca.html`의 `<script src="../core/notion-reward.js?v=20261024-1">`
   - 원래 태그 바로 뒤에 새 태그 2개를 순서대로 넣고, **세 태그 모두** 버전을 `?v=20261031-reward-split`로 바꾼다(옛 통짜 `notion-reward.js`가 캐시에 남은 채 새 파일이 실리면 `const` 중복 선언 오류가 나기 때문).
   - 동적 로더 목록(`requiredCores`, `lobbyCores` 등)에 `notion-reward`가 있으면 같은 순서로 넣는다.

## 4. 검증 스크립트 갱신
- `scripts/verify_study_log_store.js`의 `['study-log-store.js', 'notion-reward.js']`는 세 파일을 모두 순서대로 읽게 바꾼다. 시험 내용·판정은 그대로.

## 5. 범위 밖
- 다른 800줄 초과 파일(`my-room.html`, `gallery.css` 등)과 `quest_runner.html`의 다른 부분.
- 보상 규칙·노션 스키마 변경.

## 6. T (시험)
1. 신규 `tests/notion-reward-split.test.mjs`:
   - 구현 때 원래 파일을 `tests/fixtures/notion-reward-split/notion-reward.js`로 그대로 복사해 커밋한다.
   - 세 파일이 있고, 머리 주석 1줄을 뺀 내용을 순서대로 이어 붙인 것이 fixture와 같다(정규화는 `tests/math-pages-split.test.mjs`의 `normalize`와 같게).
   - 각 파일 600줄 이하.
   - 두 HTML이 세 파일을 같은 순서·같은 버전으로 연달아 로드하고, 옛 버전 `?v=20261024-1` 참조가 남지 않았다.
   - `vm` 컨텍스트(가짜 `window`·`document`·`localStorage`, `addEventListener` 기록)에서 세 파일을 순서대로 실행하면 오류가 없고, 원래 파일을 실행했을 때와 비교해 전역 함수 이름 목록, `window`에 생긴 이름 목록, 등록된 이벤트 종류 목록이 같다.
   - 앞 파일만(1개, 1~2개) 실행해도 오류가 나지 않는다.
2. 기존 시험 전부: `node --test "tests/**/*.test.mjs"`.
3. 바뀐 파일마다 `python -X utf8 G:/master-tower/scripts/verify_contracts.py --mode file --file <절대 경로>` → `[ALL PASS]` (막히면 못 했다고 보고). 사용자 승인에 따라 `tests/fixtures/`의 원본 사본은 계약 검사에서 제외한다. fixture는 줄이지 않으며, 검사기의 fixture 예외는 Claude가 관제탑 저장소에서 따로 처리한다.

## 7. 화면 확인 (Claude가 함)
노션 쓰기 차단 서버에서 `quest_runner.html`과 `voca.html`을 분리 전·후로 열어 스크립트 로드 목록·중복, 전역 함수, 콘솔 오류를 비교하고, 퀘스트 한 문제를 풀어 정답·오답 보상 흐름이 같은지 본다.

## 8. 문서
- `CORE_CATALOG.md`, `docs/quest_lesson_spec.md`, `docs/homeschool_spec.md`에서 파일 구성·줄 수를 설명하는 곳만 새 구성으로 고친다(함수가 "notion-reward 경로"라는 설명은 그대로 둬도 된다). 지난 분리 명세서는 기록이므로 고치지 않는다.
- 이 문서 상태를 "구현 완료"로 바꾸고 파일별 실제 줄 수 표를 적는다.

## 9. 구현 기록 (2026-10-31)

- 원본 1–442 / 443–891 / 892–1338줄을 그대로 분리하고 각 파일 맨 위에 지정 머리 주석 한 줄만 추가했다.
- 실제 줄 수(머리 주석 포함):

| 파일 | 실제 줄 수 |
| :--- | ---: |
| `kids/core/notion-reward.js` | 443 |
| `kids/core/notion-reward-quiz.js` | 450 |
| `kids/core/notion-reward-discussion.js` | 448 |

- 두 HTML의 세 태그는 같은 버전 `20261031-reward-split`로 연달아 로드한다. 동적 로더 배열에는 기존 보상 모듈 항목이 없어 변경하지 않았다.
- 원본 fixture는 1,338줄 그대로 보존한다. 사용자 승인에 따라 fixture만 계약 검사에서 제외하며 검사기는 수정하지 않았다.
- 자동 검증: `node --test tests/notion-reward-split.test.mjs` 16건 통과, `node scripts/verify_study_log_store.js` 31건 통과.
- 전체 회귀 `node --test "tests/**/*.test.mjs"`: 219건 중 통과 215·실패 2·건너뜀 1·기존 TODO 1. 실패는 기존 갤러리 Python 빌더 시험 두 건이며, Python 하위 프로세스 시작 실패로 종료 상태가 `null`이었다.
- 계약 검사는 첫 변경 파일에 지정 명령을 실행했으나 `python` 명령을 찾지 못해 실행하지 못했다. 명세서 §0대로 반복 시도하지 않았다. fixture는 승인대로 검사 대상에서 제외했다. 필수 검사 미완료로 커밋 못 함.
- 화면 비교·실제 클릭 검증은 §7대로 Claude가 수행하며 운영 노션 쓰기·main 병합·푸시는 하지 않는다.

### Claude 확인 (2026-10-31)

- `main:kids/core/notion-reward.js`와 새 파일 3개(머리 주석 제외)를 순서대로 이은 내용이 줄바꿈 형식만 빼고 같다. fixture도 같다.
- `node --test "tests/**/*.test.mjs"`: 219개 중 통과 217개, 실패 0개(건너뜀 1·todo 1). 바뀐 파일별 계약 검사 모두 `[ALL PASS]`(fixture는 관제탑 검사기에 `tests/fixtures/` 줄 수 예외를 넣은 뒤).
- 노션 쓰기 차단 서버 비교: `quest_runner.html`에서 보상 모듈의 전역 이름 43개가 분리 전후 같은 형으로 있고, 세 파일이 한 번씩 실리며 콘솔 오류가 없다. 분리본에서 퀘스트 1번(정답 → `+10 EXP / +3` 보상)과 2번(오답 → 하트 감소·해설)이 정상 동작했다.
- **용어사전(`voca.html`)에서 발견한 기존 문제와 처리**: `voca.html`은 `notion-helper.js`도 싣는데, 이 파일이 `mission-reward-engine.js`·`quiz-feedback-overlay.js`를 자동으로 싣는다. 두 파일은 `notion-reward.js`와 같은 최상위 `const`(`DISCUSSION_STOP_WORDS`, `CONJUNCTION_GRADING_GUARDRAIL`)를 선언하므로, 분리 전 main에서도 콘솔에 `Identifier ... has already been declared`가 나고 `notion-reward.js` 전체가 실행되지 않았다(실행 순서에 따라 반대쪽 파일이 죽을 수도 있는 경쟁 상태). 분리하면 첫 파일만 살아나 동작이 달라지므로, 용어사전이 쓰는 세 함수(`grantRewardAndShowUI`, `setupDebouncedSTT`, `grantVocaDwellReward`)를 모두 `notion-helper.js` 쪽 모듈이 제공함을 확인하고 `voca.html`에서 `notion-reward*.js` 태그를 뺐다. 분리본 용어사전은 보상 파일 없이 오류 0건으로 열리고 세 함수가 main과 같은 코드로 있다. 재발 방지로 시험에 「notion-helper.js를 싣는 화면은 notion-reward*.js를 함께 싣지 않는다」를 추가했다.
